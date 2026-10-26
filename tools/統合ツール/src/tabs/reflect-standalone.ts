'use strict';

import { buildExportFilename, buildAppFilenameLabel, extractAppNameFromBundle, deepClone } from '../utils.js';
import { apiGet, apiPost, apiPut, buildApiPrefix, decorateRevisionConflict, fetchBundle, pickRevision, isRevisionConflictError, uploadKintoneFile } from '../api.js';
import { captureReflectBaseline, assertReflectBaselineMatches, assertCompleteReflectBackup, isCompleteReflectSection, type ReflectBaseline } from '../reflect/standalonePreflight.js';
import { embedCustomizeFileContents, resolveCustomizeFiles, type CustomizeFileResolution } from '../reflect/customizeFiles.js';
import { reflectFieldLabels } from '../reflect/changeSummary.js';
import { buildReflectSectionPlan, reflectInspectionScopes, reflectSelectionBlockers, listReflectFieldCodes, listReflectSystemFieldCodes, type ReflectSectionPlan } from '../reflect/standalonePlan.js';
import { pickSettingsBundle } from '../settingsBundleImport.js';
import { REFLECT_SECTION_KEYS } from '../reflect/sections.js';
import { inspectTargetPendingChanges, type ReflectTargetPending } from '../reflect/targetPending.js';
import { pushReflectErrorLog as pushErrorLog, type ApplySectionOutcome } from '../reflect/applyOutcome.js';
import { RUN_CANCELLED_MESSAGE, isRunCancelledError } from '../runControl.js';

export interface ReflectOptions {
  sourceAppId: string; sourceGuestId?: string; sourcePreview?: boolean; sourceBundle?: unknown;
  targetAppId: string; targetGuestId?: string; scopes: string[];
  lookupMap?: Record<string, string>; preserveTargetOnly?: boolean;
}
export type PreviewSectionEntry = ReflectSectionPlan;
/** 反映前にダウンロードしたバックアップ JSON と同じ内容（「バックアップから戻す」用）。 */
export interface ReflectBackup { generatedAt: string; scopes: string[]; bundle: any }
export interface PreviewReflectResult {
  totalSections: number; changedSections: number; sameSections: number; errorSections: number;
  entries: PreviewSectionEntry[]; baseline: ReflectBaseline; sourceFieldCodes: string[]; targetFieldCodes: string[];
  /** 反映元のシステムフィールド（フィールド設定の反映では追加されない）のコード。参照不足の案内に使う */
  sourceSystemFieldCodes: string[];
  targetPending?: ReflectTargetPending;
}
/** 反映の進捗通知。項目ごとに running → ok / ng / skip、中断で残った項目は pending。 */
export interface ReflectSectionUpdate { sectionKey: string; label: string; status: 'running' | 'ok' | 'ng' | 'skip' | 'pending'; message?: string }
export interface ReflectAppIdentity { appId: string; name: string; code: string; guestId: string }
export interface ReflectIdentities { source: ReflectAppIdentity; target: ReflectAppIdentity }

/**
 * 実行結果カードを現在の入力へ再利用できるか判定する。
 * 対象・環境・選択項目・参照先変換が変わった結果を「直近結果」として
 * 再確認しないため、UI の stale 状態判定とテストで共有する。
 */
export function reflectResultMatchesOptions(report: {
  source?: { appId?: string; guestId?: string; environment?: string };
  target?: { appId?: string; guestId?: string; environment?: string };
  preserveTargetOnly?: boolean;
  scopes?: string[];
  lookupMap?: Record<string, string>;
}, options: Pick<ReflectOptions, 'sourceAppId' | 'sourceGuestId' | 'sourcePreview' | 'sourceBundle' | 'targetAppId' | 'targetGuestId' | 'preserveTargetOnly' | 'scopes' | 'lookupMap'>): boolean {
  if (!report?.source || !report.target) return false;
  const sourceBundleAppId = String((options.sourceBundle as any)?.appId || '');
  const sourceAppId = sourceBundleAppId || String(options.sourceAppId || '');
  const sourceEnvironment = options.sourceBundle ? 'json' : options.sourcePreview ? 'preview' : 'production';
  const sortScopes = (values: string[] | undefined) => [...(values || [])].map(String).sort();
  const mapSignature = (map: Record<string, string> | undefined) => Object.entries(map || {})
    .map(([from, to]) => [String(from), String(to)] as const)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([from, to]) => `${from}\u0000${to}`).join('\u0001');
  return String(report.source.appId || '') === sourceAppId
    && String(report.source.guestId || '') === String(options.sourceBundle ? '' : (options.sourceGuestId || ''))
    && String(report.source.environment || '') === sourceEnvironment
    && String(report.target.appId || '') === String(options.targetAppId || '')
    && String(report.target.guestId || '') === String(options.targetGuestId || '')
    && String(report.target.environment || '') === 'preview'
    && report.preserveTargetOnly === (options.preserveTargetOnly !== false)
    && JSON.stringify(sortScopes(report.scopes)) === JSON.stringify(sortScopes(options.scopes))
    && mapSignature(report.lookupMap) === mapSignature(options.lookupMap);
}

export function reflectConnectionError(opts: Pick<ReflectOptions, 'sourceAppId' | 'sourceGuestId' | 'sourcePreview' | 'sourceBundle' | 'targetAppId' | 'targetGuestId'>): string {
  for (const [label, value, optional] of [
    ['反映元アプリID', opts.sourceAppId, !!opts.sourceBundle], ['反映先アプリID', opts.targetAppId, false],
    ['反映元ゲストスペースID', opts.sourceGuestId, true], ['反映先ゲストスペースID', opts.targetGuestId, true]
  ] as const) {
    if (optional && !value) continue;
    if (!/^[1-9]\d*$/.test(String(value || ''))) return `${label}には正の整数を入力してください。`;
  }
  if (!opts.sourceBundle && opts.sourcePreview && opts.sourceAppId === opts.targetAppId && (opts.sourceGuestId || '') === (opts.targetGuestId || '')) return '反映元と反映先が同じプレビューです。別のアプリ、または反映元の本番設定を選んでください。';
  return '';
}

/** Resolve IDs through the non-preview app-info endpoint, so confirmation uses verified names. */
export async function resolveReflectAppsStandalone(opts: ReflectOptions): Promise<ReflectIdentities> {
  const invalid = reflectConnectionError(opts);
  if (invalid) throw new Error(invalid);
  const resolve = async (appId: string, guestId = ''): Promise<ReflectAppIdentity> => {
    const info = await apiGet(buildApiPrefix(guestId, false), '/app.json', { id: appId });
    if (String(info?.appId) !== appId || typeof info?.name !== 'string' || !info.name) throw new Error(`App ${appId} の名前とIDを確認できません。入力と閲覧権限を確認してください。`);
    return { appId, guestId, name: info.name, code: String(info.code || '') };
  };
  const target = await resolve(opts.targetAppId, opts.targetGuestId);
  const jsonAppName = opts.sourceBundle ? extractAppNameFromBundle(opts.sourceBundle) : '';
  const source = opts.sourceBundle
    ? { appId: opts.sourceAppId, guestId: '', name: jsonAppName ? `設定JSON（${jsonAppName}）` : '設定JSON', code: '' }
    : await resolve(opts.sourceAppId, opts.sourceGuestId);
  return { source, target };
}

/** 参照先変換はルックアップ・関連レコード一覧（フィールド設定）とアクションのコピー先にだけ使う。 */
function usesLookupMap(opts: ReflectOptions, scopes: string[]): boolean {
  return Object.keys(opts.lookupMap || {}).length > 0 && scopes.some(key => key === 'fieldSettings' || key === 'actionSettings');
}

function orderedScopes(scopes: string[]): string[] {
  if (!scopes?.length) throw new Error('反映する項目を選択してください。');
  if (scopes.some(key => !REFLECT_SECTION_KEYS.includes(key))) throw new Error('反映に対応していない項目が含まれています。');
  return REFLECT_SECTION_KEYS.filter(key => scopes.includes(key));
}

async function getReflectBundles(opts: ReflectOptions, scopes: string[], setStatus: (message: string) => void) {
  setStatus(opts.sourceBundle ? '反映元の設定JSONを読み込み中...' : '反映元の設定を取得中...');
  const source = opts.sourceBundle ? importedReflectSource(opts) : await fetchBundle({
    rawSettings: true,
    // フィールド設定を選んでいなくても、参照するフィールドの有無と表示名を示せるよう反映先と同じ範囲を取得する。
    appId: opts.sourceAppId, guestId: opts.sourceGuestId || '', preview: !!opts.sourcePreview, sections: reflectInspectionScopes(scopes),
    onProgress: (p, label) => setStatus(`反映元取得 ${Math.round(p * 100)}% (${label})`)
  });
  setStatus('反映先プレビューの設定を確認中...');
  const target = await fetchBundle({
    rawSettings: true,
    appId: opts.targetAppId, guestId: opts.targetGuestId || '', preview: true, sections: reflectInspectionScopes(scopes),
    onProgress: (p, label) => setStatus(`反映先取得 ${Math.round(p * 100)}% (${label})`)
  });
  return { source, target };
}

/**
 * 設定JSONを反映元として読み込む。差分比較用の補助情報（JS/CSS本文の省略を示す _partial など）は
 * 反映では本体を fileKey から取得し直すため、不完全の印にしない。
 */
function importedReflectSource(opts: ReflectOptions) {
  const bundle = pickSettingsBundle(opts.sourceBundle, { side: 'source', appId: String(opts.sourceAppId || '').trim(), rawSettings: true });
  const customize = bundle.sections?.customizeSettings;
  if (customize && typeof customize === 'object' && customize._partial?.kind === 'customizeBody' && !customize._fetchError) delete customize._partial;
  return bundle;
}

/** JS/CSS の FILE 項目を反映先へ渡せるか解決する（両側のセクションが完全なときだけ）。 */
async function resolveReflectCustomizeFiles(opts: ReflectOptions, scopes: string[], source: any, target: any, setStatus: (message: string) => void): Promise<CustomizeFileResolution | undefined> {
  if (!scopes.includes('customizeSettings')) return undefined;
  const sourceSection = source.sections?.customizeSettings, targetSection = target.sections?.customizeSettings;
  if (!isCompleteReflectSection(sourceSection) || !isCompleteReflectSection(targetSection)) return undefined;
  setStatus('JS/CSSファイルを確認中…');
  const sourceGuestId = opts.sourceBundle ? String((opts.sourceBundle as any)?.guestId || '') : opts.sourceGuestId || '';
  return resolveCustomizeFiles(sourceSection, targetSection, { sourceGuestId, targetGuestId: opts.targetGuestId || '' });
}

export async function previewReflectStandalone(opts: ReflectOptions, setStatus: (message: string) => void): Promise<PreviewReflectResult> {
  const invalid = reflectConnectionError(opts);
  if (invalid) throw new Error(invalid);
  const scopes = orderedScopes(opts.scopes);
  const { source, target } = await getReflectBundles(opts, scopes, setStatus);
  setStatus('反映先の未公開の変更を確認中…');
  const targetPending = await inspectTargetPendingChanges({ targetAppId: opts.targetAppId, targetGuestId: opts.targetGuestId, scopes: reflectInspectionScopes(scopes) }, target);
  const customizeFiles = await resolveReflectCustomizeFiles(opts, scopes, source, target, setStatus);
  const fieldLabels = reflectFieldLabels(target, source);
  const entries = scopes.map(key => buildReflectSectionPlan(key, source.sections?.[key], target.sections?.[key], { ...opts, customizeFiles, fieldLabels }));
  const baseline = captureReflectBaseline({ ...opts, scopes: reflectInspectionScopes(scopes) }, source, target);
  for (const entry of entries.filter(entry => !entry.blockers.length)) {
    try {
      assertReflectBaselineMatches(baseline, { ...opts, scopes: [entry.sectionKey], targetDependencies: entry.requiredFields?.length ? ['fieldSettings'] : [] }, source, target);
    } catch (error: any) { if (isRunCancelledError(error)) throw error; entry.status = 'error'; entry.blockers.push(error.message); entry.message = error.message; }
  }
  if (usesLookupMap(opts, scopes)) {
    const lookup = await preflightLookupMapStandalone(opts.lookupMap!, { targetGuestId: opts.targetGuestId });
    if (!lookup.ok) {
      const lookupErr = `ルックアップ変換先を確認できません: ${lookup.missing.map(item => `${item.from} → ${item.to}: ${item.reason}`).join(' / ')}`;
      const affected = entries.filter(entry => entry.sectionKey === 'fieldSettings' || entry.sectionKey === 'actionSettings');
      for (const entry of (affected.length ? affected : entries.slice(0, 1))) {
        entry.status = 'error';
        entry.blockers.push(lookupErr);
        entry.message = entry.blockers.join('\n');
      }
    }
  }
  return {
    totalSections: entries.length, changedSections: entries.filter(entry => entry.status === 'change').length,
    sameSections: entries.filter(entry => entry.status === 'same').length,
    errorSections: entries.filter(entry => !['change', 'same'].includes(entry.status)).length,
    entries, sourceFieldCodes: listReflectFieldCodes(source, true), targetFieldCodes: listReflectFieldCodes(target), sourceSystemFieldCodes: listReflectSystemFieldCodes(source), baseline, targetPending
  };
}

export async function runApplyPreviewStandalone(
  opts: ReflectOptions & { stopOnError?: boolean; doBackup?: boolean; doDeploy?: boolean; reviewBaseline: ReflectBaseline; onSectionUpdate?: (update: ReflectSectionUpdate) => void },
  setStatus: (message: string, error?: boolean) => void, onProgress: (logs: string[]) => void
): Promise<{ logs: string[]; sections: ApplySectionOutcome[]; backup?: ReflectBackup; /** 最後の書き込み後の反映先プレビューの revision（書き込みが無ければ確認時のまま） */ finalRevision: string; /** 利用者の中止で途中停止した（未実行の項目は pending、途中まで書いた項目は ng で示す） */ cancelled?: boolean }> {
  if (!opts.reviewBaseline) throw new Error('反映前に差分を取得して確認してください。');
  if (opts.doDeploy) throw new Error('この機能はプレビューへの反映専用です。本番公開には対応していません。');
  const invalid = reflectConnectionError(opts);
  if (invalid) throw new Error(invalid);
  const scopes = orderedScopes(opts.scopes);
  const { source, target } = await getReflectBundles(opts, scopes, setStatus);
  if (opts.doBackup) assertCompleteReflectBackup(target, scopes);
  let revision = assertReflectBaselineMatches(opts.reviewBaseline, { ...opts, scopes }, source, target);
  const customizeFiles = await resolveReflectCustomizeFiles(opts, scopes, source, target, setStatus);
  const fieldLabels = reflectFieldLabels(target, source);
  const plans = scopes.map(key => buildReflectSectionPlan(key, source.sections?.[key], target.sections?.[key], { ...opts, customizeFiles, fieldLabels }));
  const issues = reflectSelectionBlockers(plans, scopes, listReflectFieldCodes(source, true), listReflectFieldCodes(target), listReflectSystemFieldCodes(source));
  if (issues.length) throw new Error(`反映前の検査で停止しました。まだ書き込んでいません。\n${issues.join('\n')}`);
  if (plans.some(plan => plan.requiredFields?.length)) revision = assertReflectBaselineMatches(opts.reviewBaseline, { ...opts, scopes, targetDependencies: ['fieldSettings'] }, source, target);
  // 参照先変換が使われる項目（フィールド・アクション）を書くときだけ変換先を確認する（差分確認と同じ条件）。
  if (usesLookupMap(opts, scopes)) {
    const lookup = await preflightLookupMapStandalone(opts.lookupMap!, { targetGuestId: opts.targetGuestId });
    if (!lookup.ok) throw new Error(`ルックアップ変換先を確認できないため反映を中止しました。\n${lookup.missing.map(item => `${item.from} → ${item.to}: ${item.reason}`).join('\n')}`);
  }
  const logs: string[] = [];
  let backup: ReflectBackup | undefined;
  if (opts.doBackup && plans.some(plan => plan.operations.length)) {
    let bundle = target;
    // JS/CSS に書き込みがあるときは、元に戻せるようファイル本体も埋め込む。照合済みの target 自体は変更しない。
    if (plans.some(plan => plan.sectionKey === 'customizeSettings' && plan.operations.length)) {
      setStatus('バックアップ用にJS/CSSファイルを取得中…');
      const embedded = await embedCustomizeFileContents(target.sections.customizeSettings, { guestId: opts.targetGuestId || '', cached: customizeFiles?.targetBlobs });
      bundle = { ...target, sections: { ...target.sections, customizeSettings: embedded.section } };
      // 書き込み後に設定から外れる（差し替わる）ファイルは、本体を保存できないと元に戻せない。書き込む前に止める。
      const keptKeys = new Set(plans.filter(plan => plan.sectionKey === 'customizeSettings').flatMap(plan => plan.operations).flatMap(operation => ['desktop', 'mobile'].flatMap(platform => ['js', 'css'].flatMap(kind => (operation.body?.[platform]?.[kind] || []).map((item: any) => item?.file?.fileKey).filter(Boolean)))));
      const lost = embedded.unavailable.filter(item => !keptKeys.has(item.fileKey));
      if (lost.length) throw new Error(`反映先のJS/CSSファイルの本体をバックアップに保存できないため、反映を中止しました。まだ書き込んでいません。\n${lost.map(item => `「${item.name}」: ${item.reason}`).join('\n')}\n時間をおいて差分を取得し直すか、JS/CSS設定を反映対象から外してください。`);
      for (const item of embedded.unavailable) logs.push(`警告: JS/CSSファイル「${item.name}」の本体をバックアップに保存できませんでした（${item.reason}）。この反映では外さないため、設定には残ります`);
    }
    backup = { generatedAt: new Date().toISOString(), scopes, bundle };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = buildExportFilename('反映前バックアップ', 'json', { appLabel: buildAppFilenameLabel(opts.targetAppId, extractAppNameFromBundle(target)) });
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    logs.push('バックアップ取得完了（保存を開始しました）');
  }
  const prefix = buildApiPrefix(opts.targetGuestId || '', true);
  /**
   * 別アプリのファイルは反映先へアップロードし、新しい fileKey に置き換えた body を返す。
   * アップロードした fileKey は1回しか使えないため、同じファイルを PC とモバイルで使う場合も枠ごとにアップロードする。
   */
  const bodyWithUploads = async (operation: ReflectSectionPlan['operations'][number]) => {
    if (!operation.uploads?.length) return operation.body;
    const body = deepClone(operation.body);
    for (const upload of operation.uploads) {
      const blob = customizeFiles?.blobs.get(upload.sourceFileKey);
      if (!blob) throw new Error(`「${upload.name}」のファイル本体がないためアップロードできません。`);
      let fileKey: string;
      try { fileKey = await uploadKintoneFile(opts.targetGuestId || '', blob, upload.name); }
      catch (error: any) { if (isRunCancelledError(error)) throw error; throw new Error(`「${upload.name}」のアップロードに失敗しました（${error.message || String(error)}）。${operation.label}は書き込んでいません。`); }
      logs.push(`  OK ファイルアップロード: ${upload.name}（${upload.platform === 'desktop' ? 'PC' : 'モバイル'} ${upload.kind.toUpperCase()}）`);
      const item = body[upload.platform]?.[upload.kind]?.[upload.index];
      if (item?.file?.fileKey !== upload.sourceFileKey) throw new Error(`「${upload.name}」の反映位置を特定できません。${operation.label}は書き込んでいません。`);
      item.file.fileKey = fileKey;
    }
    return body;
  };
  // アップロードは最初の書き込みより前にまとめて行い、失敗したら何も書き込まずに止める（使わなかった一時ファイルは残るだけで無害）。
  const bodies = new Map<ReflectSectionPlan['operations'][number], Record<string, any>>();
  if (plans.some(plan => plan.operations.some(operation => operation.uploads?.length))) setStatus('JS/CSSファイルを反映先へアップロード中…');
  for (const plan of plans) for (const operation of plan.operations) {
    try { bodies.set(operation, await bodyWithUploads(operation)); }
    catch (error: any) { if (isRunCancelledError(error)) throw error; throw new Error(`${error.message || String(error)}\nまだ何も書き込んでいません。`); }
  }
  const write = async (operation: ReflectSectionPlan['operations'][number], body: Record<string, any>) => {
    try {
      const response = await (operation.method === 'POST' ? apiPost : apiPut)(prefix, operation.endpoint, { ...body, app: opts.targetAppId, revision });
      const next = pickRevision(response);
      if (!/^\d+$/.test(next)) {
        const error = new Error(`${operation.label}の書き込みは完了しましたが、更新後のrevisionを確認できません。以降の反映を中止します。差分を取得し直して状態を確認してください。`) as Error & { stopReflection: boolean };
        error.stopReflection = true; throw error;
      }
      revision = next;
    } catch (error) { throw decorateRevisionConflict(error, operation.label); }
  };
  logs.push(`反映元: ${opts.sourceBundle ? '設定JSON' : opts.sourceAppId} → 反映先(プレビュー): ${opts.targetAppId}`);
  const sections: ApplySectionOutcome[] = [];
  let cancelled = false;
  // 画面の進捗表示が失敗しても、書き込みの処理には影響させない。
  const notify = (plan: ReflectSectionPlan, status: ReflectSectionUpdate['status'], message?: string) => {
    try { opts.onSectionUpdate?.({ sectionKey: plan.sectionKey, label: plan.label, status, ...(message ? { message } : {}) }); } catch { /* 表示側の例外は無視する */ }
  };
  for (const [index, plan] of plans.entries()) {
    const outcome = { sectionKey: plan.sectionKey, label: plan.label };
    if (!plan.operations.length) {
      sections.push({ ...outcome, status: 'skip', message: '変更なし（書き込み不要）' });
      notify(plan, 'skip', '変更なし（書き込み不要）');
      logs.push(`SKIP ${plan.label}: 書き込み不要`); onProgress(logs); continue;
    }
    setStatus(`反映中 ${index + 1}/${plans.length}: ${plan.label}`);
    notify(plan, 'running');
    const written: string[] = [];
    try {
      for (const operation of plan.operations) { await write(operation, bodies.get(operation) || operation.body); written.push(operation.label); logs.push(`  OK ${operation.label}`); }
      sections.push({ ...outcome, status: 'ok' }); notify(plan, 'ok'); logs.push(`OK ${plan.label}`);
    } catch (error: any) {
      if (isRunCancelledError(error)) {
        // 中止。書き込みの途中では打ち切らず、次の書き込みの前で止まっている。書き込み済みの分は反映先に残る。
        cancelled = true;
        if (written.length) {
          const message = `${RUN_CANCELLED_MESSAGE}（この項目では ${written.join('・')} まで書き込み済みで、残りは送信していません。差分を取得し直して現在の状態を確認してください）`;
          sections.push({ ...outcome, status: 'ng', message }); notify(plan, 'ng', message); logs.push(`中止 ${plan.label}: ${written.join('・')} まで書き込み済み`);
        } else {
          sections.push({ ...outcome, status: 'pending', message: '中止のため未実行' }); notify(plan, 'pending', '中止のため未実行'); logs.push(`中止 ${plan.label}: 書き込み前に停止（未実行）`);
        }
        for (const rest of plans.slice(index + 1)) {
          if (!rest.operations.length) { sections.push({ sectionKey: rest.sectionKey, label: rest.label, status: 'skip', message: '変更なし（書き込み不要）' }); notify(rest, 'skip', '変更なし（書き込み不要）'); continue; }
          sections.push({ sectionKey: rest.sectionKey, label: rest.label, status: 'pending', message: '中止のため未実行' }); notify(rest, 'pending', '中止のため未実行');
        }
        logs.push(`${RUN_CANCELLED_MESSAGE}（反映済み ${sections.filter(item => item.status === 'ok').length} 件 / 未実行 ${sections.filter(item => item.status === 'pending').length} 件）`);
        break;
      }
      // 項目内の途中で止まった場合、先に完了した書き込みは反映先に残る。失敗の内容と一緒に必ず示す。
      const message = `${error.message || String(error)}${written.length ? `\n（この項目では ${written.join('・')} まで書き込み済みです。差分を取得し直して現在の状態を確認してください）` : ''}`;
      sections.push({ ...outcome, status: 'ng', message }); notify(plan, 'ng', message); pushErrorLog(logs, `NG ${plan.label}: ${message}`, message);
      if (opts.stopOnError !== false || error.stopReflection || isRevisionConflictError(error)) {
        for (const pending of plans.slice(index + 1)) { sections.push({ sectionKey: pending.sectionKey, label: pending.label, status: 'pending', message: '中断のため未実行' }); notify(pending, 'pending', '中断のため未実行'); }
        logs.push(`中断（未実行 ${plans.length - index - 1} 件）`); break;
      }
    }
    onProgress(logs);
  }
  const count = (status: ApplySectionOutcome['status']) => sections.filter(section => section.status === status).length;
  logs.push(`=== 完了: OK ${count('ok')} / NG ${count('ng')} / 未実行 ${count('pending')} / 変更なし ${count('skip')} ===`);
  onProgress(logs);
  if (cancelled) setStatus(`反映を中止しました（反映済み ${count('ok')} / 途中で停止 ${count('ng')} / 未実行 ${count('pending')}）。反映先プレビューは一部だけ更新されている可能性があります。`, true);
  else setStatus(count('ng') ? '反映完了（一部エラーあり）' : '反映完了');
  return { logs, sections, backup, finalRevision: revision, ...(cancelled ? { cancelled: true } : {}) };
}

export interface LookupPreflightOptions { targetGuestId?: string }
export interface LookupPreflightIssue { from: string; to: string; reason: string }
export interface LookupPreflightResult { ok: boolean; missing: LookupPreflightIssue[] }
export async function preflightLookupMapStandalone(lookupMap: Record<string, string>, opts: LookupPreflightOptions = {}): Promise<LookupPreflightResult> {
  const missing: LookupPreflightIssue[] = [];
  for (const [from, to] of Object.entries(lookupMap || {})) {
    if (!/^[1-9]\d*$/.test(from) || !/^[1-9]\d*$/.test(String(to))) { missing.push({ from, to, reason: 'AppID形式が不正' }); continue; }
    try {
      const info = await apiGet(buildApiPrefix(opts.targetGuestId || '', false), '/app.json', { id: to });
      if (String(info?.appId) !== to) throw new Error('応答のアプリIDが一致しません');
    } catch (error: any) { if (isRunCancelledError(error)) throw error; missing.push({ from, to, reason: `取得失敗: ${error.message || String(error)}` }); }
  }
  return { ok: !missing.length, missing };
}
