'use strict';

/**
 * 本番反映ツールのエンジン。取り決めは deploy/types.ts を参照。
 * - inspectDeployTargetsStandalone: 本番とプレビューの差分を確認する（書き込みなし）
 * - runDeployStandalone: 直前の再確認 → バックアップ → 反映の依頼（アプリの更新 / 変更の中止）→ 完了の確認
 * kintone への書き込みは api.ts の requestAppDeploy だけで行う。ブラウザの永続ストレージは使わない。
 */

import {
  DEPLOY_APPS_PER_REQUEST,
  type Bundle,
  apiGet,
  buildApiPrefix,
  fetchAppDeployStatus,
  fetchBundle,
  isRetriableApiError,
  isRevisionConflictError,
  pickRevision,
  requestAppDeploy,
  resolveHttpStatus
} from '../api.js';
import { buildDeployBackup, downloadBackupFile } from '../deploy/backup.js';
import { buildDeployWarnings, compareDeploySection, findRemovedFields } from '../deploy/inspect.js';
import { waitForDeploy, type DeployWaitResult } from '../deploy/poll.js';
import { DEPLOY_COMPARE_SECTION_KEYS } from '../deploy/sections.js';
import type {
  DeployAppInspection,
  DeployAppOutcome,
  DeployAppRef,
  DeployAppStatus,
  DeployBackupInfo,
  DeployBatchMode,
  DeployInspectOptions,
  DeployInspectResult,
  DeployRunOptions,
  DeployRunResult
} from '../deploy/types.js';
import { reflectFieldLabels } from '../reflect/changeSummary.js';
import { isRunCancelledError, throwIfCancelled } from '../runControl.js';
import { buildAppFilenameLabel, buildExportFilename, withoutApiContextLines } from '../utils.js';

/** 一度に確認できるアプリの上限。 */
export const DEPLOY_MAX_TARGETS = 1000;
/** 差分確認の並列数（アプリ単位）。 */
const INSPECT_CONCURRENCY = 2;
/** 反映前後の revision 確認の並列数（アプリ単位）。 */
const REVISION_CHECK_CONCURRENCY = 3;
const POSITIVE_INTEGER = /^[1-9]\d*$/;

// ---------------------------------------------------------------------------
// 共通
// ---------------------------------------------------------------------------

const clean = (value: unknown): string => String(value ?? '').trim();

/** 利用者に見せる失敗理由（内部の通信情報の行を除き、1 行にまとめる）。 */
function reasonOf(error: unknown): string {
  const text = withoutApiContextLines(error instanceof Error ? error.message : String(error)).replace(/\s*\n\s*/g, ' ').trim();
  return (text || '不明なエラー').slice(0, 300);
}

const appTitle = (appId: string, name?: string) => `App ${appId}${name ? `（${name}）` : ''}`;

/** 先頭の数件だけを並べ、残りは件数にする。 */
function listApps(titles: string[], limit = 5): string {
  return titles.length > limit ? `${titles.slice(0, limit).join('、')}ほか ${titles.length - limit} 件` : titles.join('、');
}

/** 1 つでも失敗したら新しい作業を始めず、最初の例外を投げる。 */
async function runPool<T>(items: T[], limit: number, worker: (item: T, index: number) => Promise<void>): Promise<void> {
  let next = 0, failed = false, failure: unknown;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (!failed && next < items.length) {
      const index = next++;
      try { await worker(items[index], index); } catch (error) {
        if (!failed) { failed = true; failure = error; }
        return;
      }
    }
  }));
  if (failed) throw failure;
}

interface SettingsSnapshot { revision: string; name: string }

/** アプリの一般設定から revision とアプリ名を取る（本番・プレビューとも GET /app/settings.json）。 */
async function fetchSettingsSnapshot(guestId: string, appId: string, preview: boolean): Promise<SettingsSnapshot> {
  const res = await apiGet(buildApiPrefix(guestId, preview), '/app/settings.json', { app: appId });
  const revision = pickRevision(res);
  if (!/^\d+$/.test(revision)) throw new Error('応答に revision がありません');
  return { revision, name: typeof res?.name === 'string' ? res.name : '' };
}

/** 取得できたら snapshot、できなければ reason（strictNullChecks 無しでも絞り込めるよう判別共用体にしない）。 */
interface SnapshotResult { snapshot?: SettingsSnapshot; reason: string }

async function trySnapshot(guestId: string, appId: string, preview: boolean): Promise<SnapshotResult> {
  try { return { snapshot: await fetchSettingsSnapshot(guestId, appId, preview), reason: '' }; } catch (error) {
    if (isRunCancelledError(error)) throw error;
    return { reason: reasonOf(error) };
  }
}

// ---------------------------------------------------------------------------
// 入力の検査
// ---------------------------------------------------------------------------

/** 入力された対象アプリの問題（未入力・重複・形式・まとめて反映の条件）を利用者向けの 1 文で返す。問題が無ければ空文字。 */
export function validateDeployTargets(targets: DeployAppRef[], batchMode: DeployBatchMode): string {
  if (!Array.isArray(targets) || !targets.length) return 'アプリを入力してください。';
  for (const target of targets) {
    const appId = clean(target?.appId), guestId = clean(target?.guestId);
    if (!appId) return 'アプリIDが空の行があります。';
    if (!POSITIVE_INTEGER.test(appId)) return `アプリIDは正の整数で入力してください（${appId}）。`;
    if (guestId && !POSITIVE_INTEGER.test(guestId)) return `ゲストスペースIDは正の整数で入力してください（App ${appId}: ${guestId}）。`;
  }
  if (targets.length > DEPLOY_MAX_TARGETS) return `一度に処理できるのは ${DEPLOY_MAX_TARGETS} アプリまでです（現在 ${targets.length} 件）。対象を分けて実行してください。`;
  const seen = new Set<string>(), duplicates: string[] = [];
  for (const target of targets) {
    const key = `${clean(target.guestId)}:${clean(target.appId)}`;
    if (seen.has(key)) duplicates.push(appTitle(clean(target.appId)) + (clean(target.guestId) ? `（ゲストスペース ${clean(target.guestId)}）` : ''));
    seen.add(key);
  }
  if (duplicates.length) return `同じアプリが重複しています（${listApps([...new Set(duplicates)])}）。`;
  if (batchMode === 'atomic') {
    if (targets.length > DEPLOY_APPS_PER_REQUEST) return `まとめて反映できるのは ${DEPLOY_APPS_PER_REQUEST} アプリまでです（現在 ${targets.length} 件）。1 件ずつ反映に切り替えるか、対象を分けてください。`;
    if (new Set(targets.map(target => clean(target.guestId))).size > 1) return 'まとめて反映できるのは同じスペースのアプリだけです。通常スペースとゲストスペース、または異なるゲストスペースのアプリは、1 件ずつ反映に切り替えるか、分けて実行してください。';
  }
  return '';
}

// ---------------------------------------------------------------------------
// 差分の確認（書き込みなし）
// ---------------------------------------------------------------------------

const PROCESSING_MESSAGE = '前回の反映を kintone が処理中です。完了してから確認し直してください。';
const CHANGED_DURING_FETCH_MESSAGE = '取得中に設定が更新されました。確認し直してください。';

async function inspectOne(target: DeployAppRef, sections: string[]): Promise<DeployAppInspection> {
  const appId = clean(target?.appId), guestId = clean(target?.guestId);
  const result: DeployAppInspection = {
    appId, guestId, name: clean(target?.name), state: 'error', productionRevision: '', previewRevision: '',
    sections: [], removedFields: [], warnings: [], inspectedAt: new Date().toISOString()
  };
  const fail = (error: string): DeployAppInspection => ({ ...result, state: 'error', error, inspectedAt: new Date().toISOString() });
  if (!POSITIVE_INTEGER.test(appId) || (guestId && !POSITIVE_INTEGER.test(guestId))) return fail('アプリIDまたはゲストスペースIDが正しくありません。正の整数で入力してください。');

  // 1. revision とアプリ名
  const [production, preview] = await Promise.all([trySnapshot(guestId, appId, false), trySnapshot(guestId, appId, true)]);
  if (!production.snapshot || !preview.snapshot) {
    const side = !production.snapshot ? '本番' : 'プレビュー';
    const reason = !production.snapshot ? production.reason : preview.reason;
    return fail(`${side}の設定を取得できません（${reason}）。アプリID・ゲストスペース・アプリ管理の権限を確認してください。`);
  }
  result.name = production.snapshot.name || preview.snapshot.name || result.name;
  result.productionRevision = production.snapshot.revision;
  result.previewRevision = preview.snapshot.revision;

  // 2. 一致なら未公開の変更なし（設定の本体は取得しない）
  if (result.productionRevision === result.previewRevision) return { ...result, state: 'clean', inspectedAt: new Date().toISOString() };

  // 3. 異なるなら設定を取得して項目ごとに比べる
  let productionBundle: Bundle, previewBundle: Bundle;
  try {
    [productionBundle, previewBundle] = await Promise.all([
      fetchBundle({ appId, guestId, preview: false, sections, rawSettings: true }),
      fetchBundle({ appId, guestId, preview: true, sections, rawSettings: true })
    ]);
  } catch (error) {
    if (isRunCancelledError(error)) throw error;
    return fail(`設定を取得できません（${reasonOf(error)}）。もう一度確認し直してください。`);
  }
  const updated = (revisions: Record<string, string>, expected: string) => Object.values(revisions).some(revision => revision !== expected);
  if (updated(productionBundle.meta.sectionRevisions, result.productionRevision) || updated(previewBundle.meta.sectionRevisions, result.previewRevision)) return fail(CHANGED_DURING_FETCH_MESSAGE);

  const fieldLabels = reflectFieldLabels(previewBundle, productionBundle);
  const diffs = sections.map(key => compareDeploySection(key, productionBundle.sections[key], previewBundle.sections[key], fieldLabels));
  const failedSections = diffs.filter(diff => diff.status === 'error');
  if (failedSections.length) {
    return { ...fail(`設定の一部を取得できません（${failedSections.map(diff => diff.label).join('、')}）。もう一度確認し直してください。`), sections: diffs };
  }
  const contentSame = diffs.every(diff => diff.status === 'same');
  return {
    ...result,
    state: 'changes',
    contentSame,
    sections: diffs,
    removedFields: findRemovedFields(productionBundle.sections.fieldSettings, previewBundle.sections.fieldSettings),
    warnings: buildDeployWarnings({ sections: diffs, contentSame, production: productionBundle.sections, preview: previewBundle.sections }),
    inspectedAt: new Date().toISOString(),
    productionBundle,
    previewBundle
  };
}

/** 変更のあるアプリについて、前回の反映が kintone で処理中でないかをスペースごとにまとめて確認する。 */
async function markProcessingApps(apps: DeployAppInspection[]): Promise<void> {
  const groups = new Map<string, number[]>();
  apps.forEach((app, index) => {
    if (app.state !== 'changes') return;
    const list = groups.get(app.guestId);
    if (list) list.push(index); else groups.set(app.guestId, [index]);
  });
  for (const [guestId, indexes] of groups) {
    for (let start = 0; start < indexes.length; start += DEPLOY_APPS_PER_REQUEST) {
      const chunk = indexes.slice(start, start + DEPLOY_APPS_PER_REQUEST);
      throwIfCancelled();
      try {
        const statuses = new Map((await fetchAppDeployStatus(guestId, chunk.map(index => apps[index].appId))).map(row => [row.app, row.status]));
        for (const index of chunk) {
          if (statuses.get(apps[index].appId) !== 'PROCESSING') continue;
          const { productionBundle: _production, previewBundle: _preview, ...rest } = apps[index];
          apps[index] = { ...rest, state: 'processing', contentSame: undefined, sections: [], removedFields: [], warnings: [], error: PROCESSING_MESSAGE };
        }
      } catch (error) {
        if (isRunCancelledError(error)) throw error;
        for (const index of chunk) apps[index].warnings.push(`前回の反映の処理状況を確認できませんでした（${reasonOf(error)}）。処理中でないか、アプリの設定画面で確認してください。`);
      }
    }
  }
}

/** 本番とプレビューの差分を確認する（書き込みなし）。 */
export async function inspectDeployTargetsStandalone(opts: DeployInspectOptions): Promise<DeployInspectResult> {
  const targets = Array.isArray(opts.targets) ? opts.targets : [];
  const sections = opts.sections?.length ? [...new Set(opts.sections)] : [...DEPLOY_COMPARE_SECTION_KEYS];
  const apps = new Array<DeployAppInspection>(targets.length);
  let done = 0;
  await runPool(targets, INSPECT_CONCURRENCY, async (target, index) => {
    throwIfCancelled();
    apps[index] = await inspectOne(target, sections);
    done += 1;
    opts.onProgress?.(done, targets.length, appTitle(apps[index].appId, apps[index].name));
  });
  await markProcessingApps(apps);
  const counts = { changes: 0, clean: 0, error: 0, processing: 0 };
  for (const app of apps) counts[app.state] += 1;
  return { apps, inspectedAt: new Date().toISOString(), counts };
}

// ---------------------------------------------------------------------------
// 反映（アプリの更新 / 変更の中止）
// ---------------------------------------------------------------------------

const PENDING_CANCELLED = '未実行（中止）';
const PENDING_AFTER_PROBLEM = '前のアプリで問題があったため未実行';
const PENDING_BLOCKED = '反映を始める前の確認で問題があったため、まだ何も反映していません（未実行）';
const CANCELLED_AFTER_REQUEST = '反映を依頼しましたが、完了を確認する前に中止しました。kintone 側で処理が続いている可能性があります。アプリの設定画面で状態を確認してください。';
const TIMEOUT_MESSAGE = '反映の完了を確認できませんでした。kintone 側で処理が続いている可能性があります。アプリの設定画面で確認してください。';
const PROBLEM_STATUSES: ReadonlySet<DeployAppStatus> = new Set<DeployAppStatus>(['failed', 'conflict', 'unknown']);
const UNFINISHED_STATUSES: ReadonlySet<DeployAppStatus> = new Set<DeployAppStatus>(['waiting', 'checking', 'deploying']);

interface RevisionPair { production: string; preview: string }

/** 確認時の revision と現在の revision が食い違うときの説明。同じなら空文字。 */
function revisionMismatch(target: DeployAppInspection, current: RevisionPair): string {
  const parts: string[] = [];
  if (current.production !== target.productionRevision) parts.push(`本番（revision ${target.productionRevision} → ${current.production}）`);
  if (current.preview !== target.previewRevision) parts.push(`プレビュー（revision ${target.previewRevision} → ${current.preview}）`);
  return parts.length ? `確認した後に${parts.join('と')}の設定が更新されました。差分を確認し直してください。` : '';
}

/** 依頼の失敗が「受け付けられなかった」と言い切れるか。通信の途絶や 5xx は、サーバーで確定したか分からない。 */
function classifyRequestError(error: any): 'conflict' | 'unknown' | 'failed' {
  if (isRevisionConflictError(error)) return 'conflict';
  const status = resolveHttpStatus(error) || resolveHttpStatus(error?.original);
  if (status >= 500 || (status === 0 && (isRetriableApiError(error) || isRetriableApiError(error?.original)))) return 'unknown';
  return 'failed';
}

/** 本番反映の実行。 */
export async function runDeployStandalone(opts: DeployRunOptions): Promise<DeployRunResult> {
  const { mode, batchMode } = opts;
  const targets = Array.isArray(opts.targets) ? opts.targets : [];
  const revert = mode === 'revert';
  const stopOnError = opts.stopOnError !== false;

  // 入力の検査（画面の不具合の防止）
  if (!targets.length) throw new Error('反映するアプリがありません。');
  for (const target of targets) {
    if (target.state !== 'changes') throw new Error(`App ${target.appId} は反映できる状態ではありません。差分を確認し直してください。`);
    if (!target.productionBundle || !target.previewBundle) throw new Error(`App ${target.appId} の確認結果に設定の取得値がありません。差分を確認し直してください。`);
  }
  const problem = validateDeployTargets(targets.map(target => ({ appId: target.appId, guestId: target.guestId, name: target.name })), batchMode);
  if (problem) throw new Error(problem);

  const startedAt = new Date().toISOString();
  const logs: string[] = [];
  const log = (message: string) => { logs.push(message); };
  const setStatus = (message: string) => { opts.setStatus?.(message); };
  const subject = revert ? '変更の中止' : '本番への反映';
  const outcomes: DeployAppOutcome[] = targets.map(target => ({
    appId: target.appId, guestId: target.guestId, name: target.name, status: 'waiting',
    productionRevisionBefore: target.productionRevision, previewRevision: target.previewRevision
  }));
  const requested = new Set<number>();
  let backup: DeployBackupInfo | undefined;
  let blocked: string | undefined;
  let cancelled = false;

  const emit = (index: number, status: DeployAppStatus, message?: string) => {
    const outcome = outcomes[index];
    outcome.status = status;
    if (message) outcome.message = message; else delete outcome.message;
    opts.onUpdate?.({ appId: outcome.appId, guestId: outcome.guestId, status, ...(message ? { message } : {}) });
  };
  const titleOf = (index: number) => appTitle(outcomes[index].appId, outcomes[index].name);

  /** 本番・プレビューの現在の revision。取得できなければ理由を返す。 */
  const readRevisions = async (index: number): Promise<{ pair?: RevisionPair; reason: string }> => {
    const { appId, guestId } = outcomes[index];
    const [production, preview] = await Promise.all([trySnapshot(guestId, appId, false), trySnapshot(guestId, appId, true)]);
    if (!production.snapshot) return { reason: `本番の設定を取得できません（${production.reason}）` };
    if (!preview.snapshot) return { reason: `プレビューの設定を取得できません（${preview.reason}）` };
    return { pair: { production: production.snapshot.revision, preview: preview.snapshot.revision }, reason: '' };
  };

  /** まだ終わっていないアプリを中止・予期しない中断の結果にする。依頼済みのものは完了を確認できていないので unknown。 */
  const settleInterrupted = (pendingMessage: string, requestedMessage: string) => {
    outcomes.forEach((outcome, index) => {
      if (!UNFINISHED_STATUSES.has(outcome.status)) return;
      if (requested.has(index)) emit(index, 'unknown', requestedMessage); else emit(index, 'pending', pendingMessage);
    });
  };

  /** 事前検査・バックアップの失敗: 1 件も依頼せずに止める。 */
  const block = (reason: string, conflicts: Map<number, string> = new Map(), pendingReasons: Map<number, string> = new Map()) => {
    blocked = reason;
    log(`中止: ${reason}`);
    outcomes.forEach((_outcome, index) => {
      if (conflicts.has(index)) emit(index, 'conflict', conflicts.get(index));
      else emit(index, 'pending', pendingReasons.get(index) || PENDING_BLOCKED);
    });
  };

  /** 完了を確認できたアプリの反映後の revision を確かめる。確認の失敗は成功を取り消さない。 */
  const verify = async (index: number): Promise<void> => {
    try {
      const after = await readRevisions(index);
      if (!after.pair) { log(`${titleOf(index)}: 反映後の確認ができませんでした（${after.reason}）`); return; }
      outcomes[index].productionRevisionAfter = after.pair.production;
      outcomes[index].verified = after.pair.production === after.pair.preview;
      log(`${titleOf(index)}: 反映後の revision は 本番 ${after.pair.production} / プレビュー ${after.pair.preview}`);
    } catch (error) {
      if (!isRunCancelledError(error)) throw error;
      log(`${titleOf(index)}: 反映後の確認の前に中止されました`);
    }
  };

  /** kintone の処理結果を各アプリの結果にする。 */
  const settle = async (index: number, wait: DeployWaitResult): Promise<void> => {
    const status = wait.statuses.get(outcomes[index].appId);
    if (status === 'SUCCESS') {
      await verify(index);
      const verified = outcomes[index].verified;
      const done = revert ? 'プレビューの未公開の変更を中止しました。' : '本番へ反映しました。';
      emit(index, 'success', verified === false
        ? `${done}ただし、反映後の本番とプレビューの設定の更新番号（revision）が一致していません。アプリの設定画面で状態を確認してください。`
        : verified === undefined ? `${done}反映後の状態は確認できませんでした。` : done);
    } else if (status === 'FAIL') {
      emit(index, 'failed', revert
        ? 'kintone が変更の中止に失敗しました。アプリの設定画面で状態を確認してください。'
        : 'kintone が反映に失敗しました。アプリの設定画面で「アプリを更新」を押すと理由を確認できます。');
    } else if (status === 'CANCEL') {
      emit(index, 'cancelled', batchMode === 'atomic'
        ? `ほかのアプリの${revert ? '変更の中止' : '反映'}が失敗したため、kintone が取り消しました。このアプリは${revert ? '変更の中止' : '本番への反映'}が行われていません。`
        : `kintone が${revert ? '変更の中止' : '反映'}を取り消しました。`);
    } else if (wait.kind === 'error') {
      emit(index, 'unknown', `${revert ? '変更の中止' : '反映'}の状況を確認できませんでした（${reasonOf(wait.reason)}）。kintone 側で処理が続いている可能性があります。アプリの設定画面で確認してください。`);
    } else emit(index, 'unknown', TIMEOUT_MESSAGE);
  };

  /** 依頼の例外を各アプリの結果にする。中止は呼び出し元へ伝える。 */
  const rejectRequest = (indexes: number[], error: unknown): void => {
    if (isRunCancelledError(error)) throw error;
    log(`${subject}の依頼に失敗: ${error instanceof Error ? error.message : String(error)}`);
    const kind = classifyRequestError(error);
    for (const index of indexes) {
      if (kind === 'conflict') emit(index, 'conflict', '依頼の時点で、プレビューの設定がすでに更新されていました。差分を確認し直してください。');
      else if (kind === 'unknown') emit(index, 'unknown', `${revert ? '変更の中止' : '反映'}の依頼が kintone に届いたか確認できませんでした（${reasonOf(error)}）。二重に実行しないよう、アプリの設定画面で状態を確認してください。`);
      else emit(index, 'failed', `kintone が${revert ? '変更の中止' : '反映'}の依頼を受け付けませんでした（${reasonOf(error)}）。`);
    }
  };

  const request = async (guestId: string, indexes: number[]): Promise<void> => {
    const apps = indexes.map(index => ({ app: outcomes[index].appId, revision: outcomes[index].previewRevision }));
    log(`[API] POST ${buildApiPrefix(guestId, true)}/app/deploy.json apps=${apps.map(app => `${app.app}@${app.revision}`).join(',')}${revert ? ' revert=true' : ''}`);
    await requestAppDeploy(guestId, apps, revert);
    indexes.forEach(index => requested.add(index));
  };

  try {
    const indexes = outcomes.map((_outcome, index) => index);

    // 1. 開始時の再確認: 差分確認時と食い違うアプリが 1 件でもあれば、何も依頼しない
    setStatus('反映の前に、本番とプレビューの最新の状態を確認しています…');
    const checks = new Array<{ pair?: RevisionPair; reason: string }>(outcomes.length);
    await runPool(indexes, REVISION_CHECK_CONCURRENCY, async (index) => { checks[index] = await readRevisions(index); });
    const conflicts = new Map<number, string>(), unreadable = new Map<number, string>();
    indexes.forEach((index) => {
      const check = checks[index];
      if (!check.pair) { unreadable.set(index, `最新の状態を確認できなかったため未実行です（${check.reason}）`); return; }
      const mismatch = revisionMismatch(targets[index], check.pair);
      if (mismatch) conflicts.set(index, mismatch);
    });
    if (conflicts.size || unreadable.size) {
      const titles = (map: Map<number, string>) => listApps([...map.keys()].map(titleOf));
      const reasons = [
        conflicts.size ? `確認した後に設定が更新されたアプリがあります（${titles(conflicts)}）` : '',
        unreadable.size ? `最新の状態を確認できないアプリがあります（${titles(unreadable)}）` : ''
      ].filter(Boolean).join('。');
      block(`${reasons}。何も反映していません。差分を確認し直してください。`, conflicts, unreadable);
      return finish();
    }

    // 2. バックアップ: 保存できなければ反映しない
    setStatus('バックアップを作成しています…');
    const built = await buildDeployBackup({ mode, targets, onProgress: (done, total) => setStatus(`バックアップを作成しています…（${done}/${total} アプリ）`) });
    if (built.lostFiles.length) {
      block(`反映で設定から外れる JS/CSS ファイルの本体をバックアップに保存できないため、反映を依頼していません（${listApps(built.lostFiles.map(file => `${appTitle(file.appId)}「${file.name}」: ${file.reason}`), 3)}）。時間をおいて差分を確認し直すか、対象から外してください。`);
      return finish();
    }
    for (const file of built.unavailableFiles) log(`警告: ${appTitle(file.appId)} の JS/CSS ファイル「${file.name}」の本体をバックアップに保存できませんでした（${file.reason}）。この反映では設定から外れないため、そのまま残ります`);
    const fileName = buildExportFilename(revert ? '変更中止前バックアップ' : '本番反映前バックアップ', 'json', {
      appLabel: targets.length === 1 ? buildAppFilenameLabel(targets[0].appId, targets[0].name) : `${targets.length}アプリ`
    });
    try { (opts.saveBackup || downloadBackupFile)(fileName, JSON.stringify(built.file, null, 2)); } catch (error) {
      block(`バックアップを保存できなかったため、反映を依頼していません（${reasonOf(error)}）。`);
      return finish();
    }
    backup = { fileName, appCount: targets.length, generatedAt: built.file.generatedAt, environment: built.file.environment, unavailableFiles: built.unavailableFiles };
    log(`バックアップを保存しました（${fileName}、${targets.length} アプリ、${revert ? '中止前のプレビュー' : '反映前の本番'}）`);

    // 3. 反映
    if (batchMode === 'atomic') {
      const guestId = outcomes[0].guestId;
      throwIfCancelled();
      indexes.forEach(index => emit(index, 'deploying', 'kintone に依頼しています。'));
      setStatus(`${outcomes.length} アプリをまとめて${revert ? '変更の中止' : '反映'}の依頼をしています…`);
      try { await request(guestId, indexes); } catch (error) { rejectRequest(indexes, error); return finish(); }
      indexes.forEach(index => emit(index, 'deploying', 'kintone の処理を待っています。'));
      setStatus('kintone の処理を待っています…');
      const wait = await waitForDeploy(guestId, indexes.map(index => outcomes[index].appId), opts.poll);
      for (const index of indexes) await settle(index, wait);
    } else {
      for (const index of indexes) {
        throwIfCancelled();
        const { guestId, appId } = outcomes[index];
        setStatus(`${titleOf(index)} を${revert ? '変更の中止' : '反映'}しています…（${index + 1}/${outcomes.length}）`);
        emit(index, 'checking', '直前の状態を確認しています。');
        const check = await readRevisions(index);
        const mismatch = check.pair ? revisionMismatch(targets[index], check.pair) : '';
        if (!check.pair) emit(index, 'failed', `直前の確認で設定を取得できなかったため、依頼していません（${check.reason}）。`);
        else if (mismatch) emit(index, 'conflict', mismatch);
        else {
          emit(index, 'deploying', 'kintone に依頼しています。');
          let accepted = false;
          try { await request(guestId, [index]); accepted = true; } catch (error) { rejectRequest([index], error); }
          if (accepted) {
            emit(index, 'deploying', 'kintone の処理を待っています。');
            await settle(index, await waitForDeploy(guestId, [appId], opts.poll));
          }
        }
        if (stopOnError && PROBLEM_STATUSES.has(outcomes[index].status)) {
          outcomes.forEach((outcome, rest) => { if (rest > index && outcome.status === 'waiting') emit(rest, 'pending', PENDING_AFTER_PROBLEM); });
          break;
        }
      }
    }
  } catch (error) {
    if (isRunCancelledError(error)) {
      cancelled = true;
      log('利用者の操作で中止しました');
      settleInterrupted(PENDING_CANCELLED, CANCELLED_AFTER_REQUEST);
    } else {
      // 想定外の例外でも、依頼済みのアプリの結果を失わないよう結果として返す。
      const detail = error instanceof Error ? error.message : String(error);
      log(`予期しないエラーで中断しました: ${detail}`);
      if (!requested.size && !blocked) blocked = `予期しないエラーで中断したため、反映を依頼していません（${reasonOf(error)}）。`;
      settleInterrupted(`予期しないエラーで中断したため未実行です（${reasonOf(error)}）`, `予期しないエラーで中断しました（${reasonOf(error)}）。kintone 側で処理が続いている可能性があります。アプリの設定画面で状態を確認してください。`);
    }
  }
  return finish();

  function finish(): DeployRunResult {
    return {
      mode, batchMode, startedAt, finishedAt: new Date().toISOString(), apps: outcomes,
      ...(backup ? { backup } : {}), logs, ...(cancelled ? { cancelled: true } : {}), ...(blocked ? { blocked } : {})
    };
  }
}
