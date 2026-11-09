'use strict';

/**
 * 本番反映ツールの表示用の純粋関数（DOM・API 非依存）。
 * 状態の表示名・件数の集計・ステータス文・確認入力の条件を、画面（deploy-lite-ui.ts）と記録（report.ts）で共有する。
 */

import type {
  DeployAppInspection,
  DeployAppRef,
  DeployAppStatus,
  DeployBatchMode,
  DeployInspectState,
  DeployMode,
  DeployRemovedField,
  DeployRunResult
} from './types.js';

/** 対象アプリの上限（画面の入力表・差分確認の上限）。 */
export const DEPLOY_TARGET_LIMIT = 1000;
/** まとめて反映（1 回の依頼）に含められる上限。 */
export const DEPLOY_ATOMIC_LIMIT = 300;
/** 実行結果の一覧を全件描画する上限。超えると要約と問題のある行を優先して表示する。 */
export const DEPLOY_RESULT_FULL_LIMIT = 200;

// =============================================================================
// アプリの識別・表示名
// =============================================================================

export interface DeployAppIdentity { appId: string; guestId: string; name?: string }

/** 同じアプリを指す一意のキー（ゲストスペース + アプリID）。 */
export function deployAppKey(app: Pick<DeployAppRef, 'appId' | 'guestId'>): string {
  return `${String(app.guestId || '').trim()}/${String(app.appId || '').trim()}`;
}

/** 「顧客管理（#12 / ゲストスペース 3）」。名前が分からなければ「App 12（ゲストスペース 3）」。 */
export function formatDeployApp(app: DeployAppIdentity): string {
  const guest = String(app.guestId || '').trim();
  const name = String(app.name || '').trim();
  if (name) return `${name}（#${app.appId}${guest ? ` / ゲストスペース ${guest}` : ''}）`;
  return `App ${app.appId}${guest ? `（ゲストスペース ${guest}）` : ''}`;
}

/** 失敗理由などに添える短い呼び名（App 303）。 */
export function shortDeployApp(app: DeployAppIdentity): string {
  return `App ${app.appId}`;
}

// =============================================================================
// 操作（本番へ反映 / 変更を中止）
// =============================================================================

export interface DeployModeText {
  /** ラジオ・見出しに使う名前 */
  label: string;
  /** 1 行の説明（ラジオの下） */
  description: string;
  /** 動詞（「反映」「中止」） */
  verb: '反映' | '中止';
  /** 方向（最終確認・記録の見出し） */
  direction: string;
  /** 差分の見出し（変更の要約の節） */
  changesHeading: string;
}

const MODE_TEXT: Record<DeployMode, DeployModeText> = {
  deploy: {
    label: '本番へ反映（アプリを更新）',
    description: 'プレビューの設定を、本番へ公開します。',
    verb: '反映',
    direction: 'プレビュー → 本番',
    changesHeading: '変更の要約'
  },
  revert: {
    label: '変更を中止（プレビューを本番に戻す）',
    description: 'プレビューの未公開の変更を破棄します。',
    verb: '中止',
    direction: 'プレビューの変更を破棄して本番の設定に戻す',
    changesHeading: '破棄される変更'
  }
};

export function deployModeText(mode: DeployMode): DeployModeText {
  return MODE_TEXT[mode] || MODE_TEXT.deploy;
}

/** 実行ボタン名。 */
export function deployRunLabel(mode: DeployMode, count: number): string {
  return mode === 'revert' ? `確認した ${count} アプリの変更を中止` : `確認した ${count} アプリを本番へ反映`;
}

/** 反映の方法・失敗時の動作の表示名。 */
export function describeBatchMode(batchMode: DeployBatchMode): string {
  return batchMode === 'atomic'
    ? 'まとめて反映（すべて成功したときだけ本番へ反映）'
    : '1アプリずつ反映';
}

export function describeStopPolicy(batchMode: DeployBatchMode, stopOnError: boolean): string {
  if (batchMode === 'atomic') return '1件でも失敗するとすべて取り消されます';
  return stopOnError ? '失敗したら残りを実行しない' : '失敗しても残りを続ける';
}

/** 表面に出す詳細設定の現在値（1 行）。warn は既定から外れた設定（残りも続ける、まとめて反映）。 */
export function describeDeployOptions(batchMode: DeployBatchMode, stopOnError: boolean): { text: string; warn: boolean } {
  const text = batchMode === 'atomic'
    ? `詳細設定: まとめて反映（すべて成功したときだけ。最大 ${DEPLOY_ATOMIC_LIMIT} 件・同じゲストスペース）`
    : `詳細設定: 1アプリずつ反映 / ${stopOnError ? '失敗したら残りを実行しない' : '失敗しても残りを続ける'}`;
  return { text, warn: batchMode === 'atomic' || !stopOnError };
}

// =============================================================================
// 差分確認の状態
// =============================================================================

export const INSPECT_STATE_LABEL: Record<DeployInspectState, string> = {
  changes: '変更あり',
  clean: '未公開の変更なし',
  error: '取得失敗',
  processing: '反映処理中'
};

export function inspectStateLabel(state: DeployInspectState): string {
  return INSPECT_STATE_LABEL[state] || state;
}

/** 状態の並び順（問題のあるアプリを先に出す）。 */
const STATE_ORDER: Record<DeployInspectState, number> = { error: 0, processing: 1, changes: 2, clean: 3 };

export function sortInspectionsForReview<T extends Pick<DeployAppInspection, 'state'>>(apps: readonly T[]): T[] {
  return apps
    .map((app, index) => ({ app, index }))
    .sort((a, b) => (STATE_ORDER[a.app.state] - STATE_ORDER[b.app.state]) || (a.index - b.index))
    .map((entry) => entry.app);
}

/** 「未公開の変更なし」は反映の対象にできない。 */
export function isSelectableInspection(app: Pick<DeployAppInspection, 'state'>): boolean {
  return app.state !== 'clean';
}

/** 既定の選択: 変更あり・取得失敗・反映処理中（取得失敗を自動で除外しない）。 */
export function defaultSelectedKeys(apps: readonly DeployAppInspection[]): string[] {
  return apps.filter(isSelectableInspection).map(deployAppKey);
}

export interface InspectCounts { changes: number; clean: number; error: number; processing: number }

export function countInspectStates(apps: readonly Pick<DeployAppInspection, 'state'>[]): InspectCounts {
  const counts: InspectCounts = { changes: 0, clean: 0, error: 0, processing: 0 };
  for (const app of apps) counts[app.state] += 1;
  return counts;
}

/** 差分確認の結果を 1 文で。 */
export function describeInspectSummary(counts: InspectCounts): string {
  const parts = [`未公開の変更なし ${counts.clean}`];
  if (counts.error) parts.push(`取得失敗 ${counts.error}`);
  if (counts.processing) parts.push(`反映処理中 ${counts.processing}`);
  return `${counts.changes} アプリに未公開の変更があります（${parts.join('、')}）。`;
}

export interface SelectionSummary {
  /** 実行する対象（変更あり）の数 */
  runnable: number;
  error: number;
  processing: number;
}

export function summarizeSelection(apps: readonly DeployAppInspection[], selected: ReadonlySet<string>): SelectionSummary {
  const summary: SelectionSummary = { runnable: 0, error: 0, processing: 0 };
  for (const app of apps) {
    if (!selected.has(deployAppKey(app))) continue;
    if (app.state === 'changes') summary.runnable += 1;
    else if (app.state === 'error') summary.error += 1;
    else if (app.state === 'processing') summary.processing += 1;
  }
  return summary;
}

/** 最終確認に進めない理由。空なら進める。 */
export function selectionBlockers(apps: readonly DeployAppInspection[], selected: ReadonlySet<string>, mode: DeployMode): string[] {
  const summary = summarizeSelection(apps, selected);
  const reasons: string[] = [];
  if (summary.error) reasons.push(`取得失敗のアプリが ${summary.error} 件選択されています。確認し直すか、対象から外してください。`);
  if (summary.processing) reasons.push(`反映処理中のアプリが ${summary.processing} 件選択されています。kintone の処理が終わってから確認し直すか、対象から外してください。`);
  if (!reasons.length && !summary.runnable) reasons.push(`${mode === 'revert' ? '変更を中止' : '反映'}するアプリ（変更あり）を選んでください。`);
  return reasons;
}

// =============================================================================
// 変更・削除の集計
// =============================================================================

export interface DeploySectionTotal {
  sectionKey: string;
  label: string;
  apps: number;
  added: number;
  changed: number;
  removed: number;
}

export interface DeployChangeTotals {
  /** 変更のある項目を 1 つ以上持つアプリの数 */
  apps: number;
  sections: DeploySectionTotal[];
  added: number;
  changed: number;
  removed: number;
}

/** 選んだアプリ全体の変更の件数を、項目別と合計で数える。 */
export function aggregateChanges(apps: readonly DeployAppInspection[]): DeployChangeTotals {
  const totals: DeployChangeTotals = { apps: 0, sections: [], added: 0, changed: 0, removed: 0 };
  const bySection = new Map<string, DeploySectionTotal>();
  for (const app of apps) {
    let any = false;
    for (const section of app.sections || []) {
      if (section.status !== 'change') continue;
      any = true;
      let total = bySection.get(section.sectionKey);
      if (!total) {
        total = { sectionKey: section.sectionKey, label: section.label, apps: 0, added: 0, changed: 0, removed: 0 };
        bySection.set(section.sectionKey, total);
        totals.sections.push(total);
      }
      total.apps += 1;
      total.added += section.counts?.added || 0;
      total.changed += section.counts?.changed || 0;
      total.removed += section.counts?.removed || 0;
    }
    if (any) totals.apps += 1;
  }
  for (const total of totals.sections) {
    totals.added += total.added;
    totals.changed += total.changed;
    totals.removed += total.removed;
  }
  return totals;
}

/** 変更のある項目名（表の列）。 */
export function changedSectionLabels(app: Pick<DeployAppInspection, 'sections'>): string[] {
  return (app.sections || []).filter((section) => section.status === 'change').map((section) => section.label);
}

/** アプリ 1 件の削除される設定の件数。 */
export function removedSettingCount(app: Pick<DeployAppInspection, 'sections'>): number {
  return (app.sections || []).reduce((sum, section) => sum + (section.status === 'change' ? section.counts?.removed || 0 : 0), 0);
}

/** 「削除される設定: フィールド設定 3 件、ビュー設定 1 件（合計 4 件）」。無ければ空文字。 */
export function describeRemovedSettings(totals: DeployChangeTotals): string {
  const parts = totals.sections.filter((section) => section.removed > 0).map((section) => `${section.label} ${section.removed} 件`);
  if (!parts.length) return '';
  return `${parts.join('、')}（合計 ${totals.removed} 件）`;
}

export interface DeployRemovedFieldEntry { app: DeployAppInspection; field: DeployRemovedField }

/** 選んだアプリのうち、本番にあってプレビューに無いフィールド（本番へ反映すると値も削除される）。 */
export function collectRemovedFields(apps: readonly DeployAppInspection[]): DeployRemovedFieldEntry[] {
  const out: DeployRemovedFieldEntry[] = [];
  for (const app of apps) for (const field of app.removedFields || []) out.push({ app, field });
  return out;
}

/** 「顧客名（customer）」。テーブル内なら「明細 > 顧客名（customer）」の形でテーブルのコードも示す。 */
export function describeRemovedField(field: DeployRemovedField): string {
  const label = String(field.label || '').trim();
  const base = label && label !== field.code ? `${label}（${field.code}）` : field.code;
  return field.table ? `${base}（テーブル ${field.table} 内）` : base;
}

export function formatRevisionPair(app: Pick<DeployAppInspection, 'productionRevision' | 'previewRevision'>): string {
  return `本番 ${app.productionRevision || '－'} → プレビュー ${app.previewRevision || '－'}`;
}

// =============================================================================
// 最終確認の入力
// =============================================================================

export interface ConfirmRequirement {
  /** 入力させる値 */
  value: string;
  label: string;
  placeholder: string;
}

/** 1 件なら対象アプリのID、複数なら対象のアプリ数を入力させる。 */
export function confirmRequirement(apps: readonly Pick<DeployAppRef, 'appId'>[]): ConfirmRequirement {
  if (apps.length === 1) {
    return { value: String(apps[0].appId), label: '対象アプリのIDを入力', placeholder: '対象アプリのID' };
  }
  return { value: String(apps.length), label: '対象のアプリ数を入力', placeholder: `${apps.length} と入力` };
}

// =============================================================================
// 実行中・実行後の状態
// =============================================================================

export type DeployStatusTone = 'wait' | 'run' | 'ok' | 'ng' | 'warn' | 'pending';

export interface DeployStatusDisplay { icon: string; text: string; tone: DeployStatusTone }

/** 状態は色だけに頼らず、記号と文字でも示す。 */
export function describeDeployStatus(status: DeployAppStatus, mode: DeployMode = 'deploy'): DeployStatusDisplay {
  switch (status) {
    case 'checking': return { icon: '…', text: '確認中…', tone: 'run' };
    case 'deploying': return { icon: '…', text: mode === 'revert' ? '中止を依頼中…' : '反映中…', tone: 'run' };
    case 'success': return { icon: '✓', text: '成功', tone: 'ok' };
    case 'failed': return { icon: '✕', text: '失敗', tone: 'ng' };
    case 'cancelled': return { icon: '✕', text: '取り消し（ほかのアプリの失敗）', tone: 'ng' };
    case 'conflict': return { icon: '!', text: '確認後に更新', tone: 'warn' };
    case 'unknown': return { icon: '?', text: '完了を確認できない', tone: 'warn' };
    case 'pending': return { icon: '○', text: '未実行', tone: 'pending' };
    default: return { icon: '○', text: '待機中', tone: 'wait' };
  }
}

/** 実行が終わった（結果が確定した）状態。 */
export function isSettledStatus(status: DeployAppStatus): boolean {
  return status === 'success' || status === 'failed' || status === 'cancelled' || status === 'conflict' || status === 'unknown' || status === 'pending';
}

/** 利用者の対応が要る状態（一覧で優先して出す）。 */
export function isProblemStatus(status: DeployAppStatus): boolean {
  return status === 'failed' || status === 'cancelled' || status === 'conflict' || status === 'unknown';
}

export interface DeployOutcomeCounts {
  total: number;
  success: number;
  failed: number;
  cancelled: number;
  conflict: number;
  unknown: number;
  pending: number;
  /** 実行中（待機中・確認中・反映中） */
  active: number;
  /** 成功したが、反映後の revision が本番とプレビューで一致しなかった */
  unverified: number;
}

export function countOutcomes(apps: ReadonlyArray<{ status: DeployAppStatus; verified?: boolean }>): DeployOutcomeCounts {
  const counts: DeployOutcomeCounts = { total: apps.length, success: 0, failed: 0, cancelled: 0, conflict: 0, unknown: 0, pending: 0, active: 0, unverified: 0 };
  for (const app of apps) {
    if (app.status === 'success') {
      counts.success += 1;
      if (app.verified === false) counts.unverified += 1;
    } else if (app.status === 'failed') counts.failed += 1;
    else if (app.status === 'cancelled') counts.cancelled += 1;
    else if (app.status === 'conflict') counts.conflict += 1;
    else if (app.status === 'unknown') counts.unknown += 1;
    else if (app.status === 'pending') counts.pending += 1;
    else counts.active += 1;
  }
  return counts;
}

/** 実行中の進み具合（「3/10 アプリが完了」）。 */
export function describeRunProgress(counts: DeployOutcomeCounts): string {
  const settled = counts.total - counts.active;
  const parts: string[] = [];
  if (counts.success) parts.push(`成功 ${counts.success}`);
  if (counts.failed) parts.push(`失敗 ${counts.failed}`);
  if (counts.cancelled) parts.push(`取り消し ${counts.cancelled}`);
  if (counts.conflict) parts.push(`確認後に更新 ${counts.conflict}`);
  if (counts.unknown) parts.push(`完了を確認できない ${counts.unknown}`);
  if (counts.pending) parts.push(`未実行 ${counts.pending}`);
  return `${settled}/${counts.total} アプリが完了${parts.length ? `（${parts.join('・')}）` : ''}`;
}

/** 画面・記録に出す理由。内部の通信情報（`[API] POST …` の行）は実行ログにだけ残す。 */
export function describeDeployMessage(message: string | undefined): string {
  return String(message || '').split(/\r?\n/).map((line) => line.trim()).filter((line) => line && !/^\[API\]/.test(line)).join('\n');
}

function firstLine(message: string | undefined, limit = 120): string {
  const line = describeDeployMessage(message).split('\n')[0] || '';
  return line.length > limit ? `${line.slice(0, limit)}…` : line;
}

/** 失敗理由の例（「App 303: 権限がありません」）。先頭 2 件＋残りの件数。 */
export function describeFailureReasons(apps: ReadonlyArray<{ appId: string; guestId: string; name?: string; status: DeployAppStatus; message?: string }>, limit = 2): string {
  const problems = apps.filter((app) => app.status === 'failed' || app.status === 'cancelled' || app.status === 'conflict' || app.status === 'unknown');
  const failed = problems.filter((app) => app.status === 'failed');
  const list = failed.length ? failed : problems;
  const shown = list.slice(0, limit).map((app) => {
    const reason = firstLine(app.message);
    return reason ? `${shortDeployApp(app)}: ${reason}` : shortDeployApp(app);
  });
  const rest = list.length - shown.length;
  return `${shown.join('、')}${rest > 0 ? `、ほか ${rest} アプリ` : ''}`;
}

export interface DeployRunMessage { text: string; tone: 'ok' | 'warn' | 'err' }

/** 実行後のステータス文（成功数・失敗数・理由の順。中止は未実行の数と、依頼済みの処理が続く場合がある旨）。 */
export function describeRunResult(result: Pick<DeployRunResult, 'mode' | 'apps' | 'cancelled' | 'blocked'>): DeployRunMessage {
  const revert = result.mode === 'revert';
  const counts = countOutcomes(result.apps);
  if (result.blocked) {
    const head = revert
      ? '中止前の確認で止めました。まだプレビューの変更は破棄していません。'
      : '反映前の確認で止めました。まだ本番へは反映していません。';
    return { text: `${head}${result.blocked}`, tone: 'warn' };
  }
  const extras: string[] = [];
  if (counts.failed) extras.push(`失敗 ${counts.failed} アプリ`);
  if (counts.cancelled) extras.push(`取り消し ${counts.cancelled} アプリ`);
  if (counts.conflict) extras.push(`確認後に更新 ${counts.conflict} アプリ`);
  if (counts.unknown) extras.push(`完了を確認できない ${counts.unknown} アプリ`);
  const done = revert ? '中止' : '反映';
  if (result.cancelled) {
    const text = `中止しました（${counts.success}/${counts.total} アプリを${done}${extras.length ? `、${extras.join('、')}` : ''}、残り ${counts.pending} アプリは未実行）。`
      + (counts.success ? `${done}済みの分は${revert ? 'プレビュー' : '本番'}に残っています。` : '')
      + (counts.unknown ? '依頼済みのアプリは kintone 側で処理が続く場合があります。' : '')
      + '「失敗・未実行だけ選び直す」から確認し直してください。';
    return { text, tone: 'warn' };
  }
  if (counts.success === counts.total && counts.total > 0) {
    if (counts.unverified) {
      return {
        text: `${counts.total} アプリで${done}の依頼が成功しましたが、${counts.unverified} アプリは${done}後の状態（revision）が本番とプレビューで一致しませんでした。アプリの設定画面で確認してください。`,
        tone: 'warn'
      };
    }
    return { text: revert ? `${counts.total} アプリのプレビューの変更を中止しました。` : `${counts.total} アプリを本番へ反映しました。`, tone: 'ok' };
  }
  const reasons = describeFailureReasons(result.apps);
  if (counts.pending) extras.push(`未実行 ${counts.pending} アプリ`);
  const head = counts.success
    ? `${counts.total} アプリ中 ${counts.success} アプリ${revert ? 'の変更を中止' : 'を反映'}しました。`
    : `${counts.total} アプリ中、${revert ? '変更を中止' : '反映'}できたアプリはありません。`;
  const unknownNote = counts.unknown ? '完了を確認できないアプリは、kintone 側で処理が続く場合があります。' : '';
  const text = `${head}${extras.join('、')}${reasons ? `（${reasons}）` : ''}。${unknownNote}「失敗・未実行だけ選び直す」から確認し直してください。`;
  return { text, tone: counts.success === 0 ? 'err' : 'warn' };
}

/** 「失敗・未実行だけ選び直す」の対象（成功以外）。 */
export function retryableOutcomes<T extends { status: DeployAppStatus }>(apps: readonly T[]): T[] {
  return apps.filter((app) => app.status !== 'success');
}

/** 取り消し方の案内（最終確認と結果で共通）。 */
export function undoGuidance(mode: DeployMode): string {
  return mode === 'revert'
    ? '破棄した変更は、バックアップJSONをプレビュー反映で読み込むと戻せます。'
    : '本番への反映は取り消せません。戻すときは、バックアップJSONをプレビュー反映の反映元（設定JSON）に読み込んでプレビューへ戻し、このツールで本番へ反映します。削除したフィールドの値は戻りません。';
}

/** バックアップの説明（最終確認）。 */
export function backupDescription(mode: DeployMode, appCount: number): string {
  return mode === 'revert'
    ? `中止前のプレビューの設定（${appCount} アプリ分）をJSONで保存してから、変更を中止します。`
    : `反映前の本番設定（${appCount} アプリ分。変更のあるJS/CSSはファイル本体も含む）をJSONで保存してから反映します。`;
}

/** 「アプリの設定画面」の URL（本番反映後に確認する場所）。 */
export function appSettingsPath(app: Pick<DeployAppRef, 'appId' | 'guestId'>): string {
  const base = app.guestId ? `/k/guest/${encodeURIComponent(app.guestId)}` : '/k';
  return `${base}/admin/app/flow?app=${encodeURIComponent(app.appId)}`;
}
