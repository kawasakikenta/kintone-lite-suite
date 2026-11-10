'use strict';

import { buildExportFilename, buildAppFilenameLabel, extractAppNameFromBundle, deepClone } from '../utils.js';
import { apiGet, apiPost, apiPut, buildApiPrefix, decorateRevisionConflict, fetchAppDeployStatus, fetchBundle, pickRevision, isRevisionConflictError, uploadKintoneFile } from '../api.js';
import { captureReflectBaseline, assertReflectBaselineMatches, assertCompleteReflectBackup, isCompleteReflectSection, type ReflectBaseline } from '../reflect/standalonePreflight.js';
import { embedCustomizeFileContents, resolveCustomizeFiles, type CustomizeFileDownloader, type CustomizeFileResolution } from '../reflect/customizeFiles.js';
import { findLookupMapCandidates, hasLookupCandidates, type LookupMapCandidates } from '../reflect/lookupCandidates.js';
import { reflectFieldLabels } from '../reflect/changeSummary.js';
import { buildReflectSectionPlan, reflectInspectionScopes, reflectSelectionBlockers, listReflectFieldCodes, listReflectSystemFieldCodes, type ReflectSectionPlan } from '../reflect/standalonePlan.js';
import { pickSettingsBundle } from '../settingsBundleImport.js';
import { REFLECT_SECTION_KEYS } from '../reflect/sections.js';
import { inspectTargetPendingChanges, type ReflectTargetPending } from '../reflect/targetPending.js';
import { pushReflectErrorLog as pushErrorLog, type ApplySectionOutcome } from '../reflect/applyOutcome.js';
import { RUN_CANCELLED_MESSAGE, isRunCancelledError } from '../runControl.js';
import type { ComposedReflectSelection, ComposedSection, SectionSelectionState } from '../reflect/selectionTypes.js';
import { buildPlanFromComposedAfter, buildSectionSelectionModel, composeSectionSelection, defaultSelectionState } from '../reflect/selection.js';
import { SYSTEM_FIELD_TYPES } from '../constants.js';
import { isPluginConfigOmittedMarker } from '../pluginConfigMarker.js';

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
  /** フィールドコード → 表示名（反映先と反映元から。差分の選択・修正の表示に使う） */
  fieldLabels?: Record<string, string>;
  /** 反映先の反映状況（kintone が前回の反映を処理中か）。checkTargetDeployStatus を指定した抽出だけが返す。取得に失敗しても抽出は止めない */
  targetDeployStatus?: ReflectTargetDeployStatus;
  /**
   * 参照先変換の候補。反映元と反映先の同じコードのルックアップ・関連レコード一覧（と同じ名前のアクション）の参照先アプリが食い違っていて、
   * 入力済みの参照先変換に旧IDが無いものを、反映先の現在の設定だけを根拠に示す。候補も食い違いも無ければ含めない
   */
  lookupCandidates?: LookupMapCandidates;
}
/** 反映先のアプリの更新（deploy）の状況。processing のとき、kintone が処理を終えるまで反映先へ書き込めない。 */
export interface ReflectTargetDeployStatus { state: 'processing' | 'idle' | 'unknown'; message: string }
/** 反映の進捗通知。項目ごとに running → ok / ng / skip、中断で残った項目は pending。 */
export interface ReflectSectionUpdate { sectionKey: string; label: string; status: 'running' | 'ok' | 'ng' | 'skip' | 'pending'; message?: string; /** 利用者の「中止」で途中で止まった項目（status は ng） */ stopped?: boolean }
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
  const resolve = async (role: '反映元' | '反映先', appId: string, guestId = ''): Promise<ReflectAppIdentity> => {
    let info: any;
    // どちらのアプリで失敗したかが分かるよう、API のエラーの先頭に「反映元 #N」「反映先 #N」を付ける（2 行目以降の通信情報はそのまま）。
    try { info = await apiGet(buildApiPrefix(guestId, false), '/app.json', { id: appId }); }
    catch (error: any) {
      if (isRunCancelledError(error)) throw error;
      const prefixed = new Error(`${role} #${appId}: ${error?.message != null ? String(error.message) : String(error)}`) as Error & { original?: unknown; code?: string };
      prefixed.original = error; if (error?.code) prefixed.code = error.code;
      throw prefixed;
    }
    if (String(info?.appId) !== appId || typeof info?.name !== 'string' || !info.name) throw new Error(`${role} #${appId} の名前とIDを確認できません。入力と閲覧権限を確認してください。`);
    return { appId, guestId, name: info.name, code: String(info.code || '') };
  };
  const target = await resolve('反映先', opts.targetAppId, opts.targetGuestId);
  const jsonAppName = opts.sourceBundle ? extractAppNameFromBundle(opts.sourceBundle) : '';
  const source = opts.sourceBundle
    ? { appId: opts.sourceAppId, guestId: '', name: jsonAppName ? `設定JSON（${jsonAppName}）` : '設定JSON', code: '' }
    : await resolve('反映元', opts.sourceAppId, opts.sourceGuestId);
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

/** 取得の失敗に、どのアプリかを示す接頭辞（反映元 #N / 反映先 #N）を付ける。中止はそのまま伝える。 */
async function withAppPrefix<T>(role: '反映元' | '反映先', appId: string, run: () => Promise<T>): Promise<T> {
  try { return await run(); }
  catch (error: any) {
    if (isRunCancelledError(error)) throw error;
    const prefixed = new Error(`${role} #${appId}: ${error?.message != null ? String(error.message) : String(error)}`) as Error & { original?: unknown; code?: string };
    prefixed.original = error; if (error?.code) prefixed.code = error.code;
    throw prefixed;
  }
}

/**
 * 反映元の取得結果。複数の反映先を続けて確認するとき（一括事前確認）に、反映元を 1 回だけ取得して使い回すためのもの。
 * 反映先ごとに複製して使うため、確認の途中で内容が書き換わっても次の反映先に影響しない。
 */
export interface PreparedReflectSource {
  /** 取得した反映元の設定（rawSettings）。reflectInspectionScopes(scopes) の範囲 */
  bundle: any;
  /** 取得した範囲。これを満たさない項目の確認には使えない */
  scopes: string[];
  /** JS/CSS のファイル本体の取得（反映元のファイルを反映先ごとに取得し直さないよう、直近の本体を保持する） */
  download?: CustomizeFileDownloader;
}

async function fetchReflectSourceBundle(opts: ReflectOptions, scopes: string[], setStatus: (message: string) => void) {
  setStatus(opts.sourceBundle ? '反映元の設定JSONを読み込み中...' : '反映元の設定を取得中...');
  return opts.sourceBundle ? importedReflectSource(opts) : await withAppPrefix('反映元', opts.sourceAppId, () => fetchBundle({
    rawSettings: true,
    // フィールド設定を選んでいなくても、参照するフィールドの有無と表示名を示せるよう反映先と同じ範囲を取得する。
    appId: opts.sourceAppId, guestId: opts.sourceGuestId || '', preview: !!opts.sourcePreview, sections: reflectInspectionScopes(scopes),
    onProgress: (p, label) => setStatus(`反映元取得 ${Math.round(p * 100)}% (${label})`)
  }));
}

/**
 * 反映元の設定を 1 回だけ取得する（書き込みなし）。previewReflectStandalone の options.source に渡すと、反映先ごとの確認で反映元を取得し直さない。
 * 反映先のIDは使わない（opts.targetAppId は空でもよい）。
 */
export async function prepareReflectSourceStandalone(opts: ReflectOptions, setStatus: (message: string) => void, download?: CustomizeFileDownloader): Promise<PreparedReflectSource> {
  // 反映元の入力だけを確認する（反映先とは比べない。反映元と反映先が同じプレビューかどうかは、反映先ごとの確認で判定する）。
  if (!opts.sourceBundle && !/^[1-9]\d*$/.test(String(opts.sourceAppId || ''))) throw new Error('反映元アプリIDには正の整数を入力してください。');
  if (opts.sourceGuestId && !/^[1-9]\d*$/.test(String(opts.sourceGuestId))) throw new Error('反映元ゲストスペースIDには正の整数を入力してください。');
  const scopes = orderedScopes(opts.scopes);
  const bundle = await fetchReflectSourceBundle(opts, scopes, setStatus);
  return { bundle, scopes: reflectInspectionScopes(scopes), ...(download ? { download } : {}) };
}

/** 反映先の ID と名前を確認する（本番側の app.json。書き込みなし）。反映元は確認しない。一括事前確認で、反映先ごとの名前を示すために使う。 */
export async function resolveReflectTargetStandalone(opts: Pick<ReflectOptions, 'targetAppId' | 'targetGuestId'>): Promise<ReflectAppIdentity> {
  const appId = String(opts.targetAppId || ''), guestId = opts.targetGuestId || '';
  if (!/^[1-9]\d*$/.test(appId) || (guestId && !/^[1-9]\d*$/.test(guestId))) throw new Error('反映先アプリIDには正の整数を入力してください。');
  const info: any = await withAppPrefix('反映先', appId, () => apiGet(buildApiPrefix(guestId, false), '/app.json', { id: appId }));
  if (String(info?.appId) !== appId || typeof info?.name !== 'string' || !info.name) throw new Error(`反映先 #${appId} の名前とIDを確認できません。入力と閲覧権限を確認してください。`);
  return { appId, guestId, name: info.name, code: String(info.code || '') };
}

async function getReflectBundles(opts: ReflectOptions, scopes: string[], setStatus: (message: string) => void, prepared?: PreparedReflectSource) {
  // 準備済みの反映元は、必要な範囲を取得済みのときだけ使う（反映先ごとに複製して、確認の途中の変更が次の反映先に及ばないようにする）。
  const needed = reflectInspectionScopes(scopes);
  const source = prepared && needed.every(key => prepared.scopes.includes(key)) ? deepClone(prepared.bundle) : await fetchReflectSourceBundle(opts, scopes, setStatus);
  setStatus('反映先プレビューの設定を確認中...');
  const target = await withAppPrefix('反映先', opts.targetAppId, () => fetchBundle({
    rawSettings: true,
    appId: opts.targetAppId, guestId: opts.targetGuestId || '', preview: true, sections: reflectInspectionScopes(scopes),
    onProgress: (p, label) => setStatus(`反映先取得 ${Math.round(p * 100)}% (${label})`)
  }));
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
  // 設定一括取得で「プラグインの設定値を含めない」を選んだ設定JSON。反映はプラグインの ID だけを使い、固有の設定値はコピーしないため、不完全の印にしない。
  const plugins = bundle.sections?.pluginSettings;
  if (plugins && typeof plugins === 'object' && isPluginConfigOmittedMarker(plugins._partial) && !plugins._fetchError) delete plugins._partial;
  return bundle;
}

/** JS/CSS の FILE 項目を反映先へ渡せるか解決する（両側のセクションが完全なときだけ）。 */
async function resolveReflectCustomizeFiles(opts: ReflectOptions, scopes: string[], source: any, target: any, setStatus: (message: string) => void, download?: CustomizeFileDownloader): Promise<CustomizeFileResolution | undefined> {
  if (!scopes.includes('customizeSettings')) return undefined;
  const sourceSection = source.sections?.customizeSettings, targetSection = target.sections?.customizeSettings;
  if (!isCompleteReflectSection(sourceSection) || !isCompleteReflectSection(targetSection)) return undefined;
  setStatus('JS/CSSファイルを確認中…');
  const sourceGuestId = opts.sourceBundle ? String((opts.sourceBundle as any)?.guestId || '') : opts.sourceGuestId || '';
  return resolveCustomizeFiles(sourceSection, targetSection, { sourceGuestId, targetGuestId: opts.targetGuestId || '', ...(download ? { download } : {}) });
}

/** 反映元・反映先のどちらかに実在するフィールドコード（システムフィールドを含む）。計算式・クエリが参照するフィールドの判定に使う。 */
function knownFieldCodesOf(source: any, target: any): string[] {
  return [...new Set([...listReflectFieldCodes(source), ...listReflectFieldCodes(target)])];
}

/**
 * 反映先が、kintone で前回の反映（アプリの更新）を処理中か確認する。処理中のアプリは設定を変更できない。
 * 取得に失敗しても例外にしない（unknown を返す。抽出は止めない）。
 */
export async function inspectTargetDeployStatus(opts: { targetAppId: string; targetGuestId?: string }): Promise<ReflectTargetDeployStatus> {
  try {
    const rows = await fetchAppDeployStatus(opts.targetGuestId || '', [opts.targetAppId]);
    const row = rows.find(item => item.app === String(opts.targetAppId));
    if (!row) return { state: 'unknown', message: '反映先が反映処理中か確認できませんでした（反映状況に反映先がありません）。' };
    if (row.status === 'PROCESSING') return { state: 'processing', message: '反映先は前回の反映を kintone が処理中です。完了してから抽出し直してください。' };
    return { state: 'idle', message: '反映先は反映処理中ではありません。' };
  } catch (error: any) {
    if (isRunCancelledError(error)) throw error;
    return { state: 'unknown', message: `反映先が反映処理中か確認できませんでした（${error?.message != null ? String(error.message).split('\n')[0] : String(error)}）。` };
  }
}

export async function previewReflectStandalone(opts: ReflectOptions, setStatus: (message: string) => void, options: {
  /** 反映先の反映状況（処理中か）も確認する。本番へ反映する流れで使う */ checkTargetDeployStatus?: boolean;
  /** 取得済みの反映元（prepareReflectSourceStandalone）。指定すると反映元を取得し直さない。一括事前確認で使う */ source?: PreparedReflectSource;
} = {}): Promise<PreviewReflectResult> {
  const invalid = reflectConnectionError(opts);
  if (invalid) throw new Error(invalid);
  const scopes = orderedScopes(opts.scopes);
  const { source, target } = await getReflectBundles(opts, scopes, setStatus, options.source);
  setStatus('反映先の未公開の変更を確認中…');
  const targetPending = await inspectTargetPendingChanges({ targetAppId: opts.targetAppId, targetGuestId: opts.targetGuestId, scopes: reflectInspectionScopes(scopes) }, target);
  const customizeFiles = await resolveReflectCustomizeFiles(opts, scopes, source, target, setStatus, options.source?.download);
  let targetDeployStatus: ReflectTargetDeployStatus | undefined;
  if (options.checkTargetDeployStatus) {
    setStatus('反映先の反映状況を確認中…');
    targetDeployStatus = await inspectTargetDeployStatus(opts);
  }
  const fieldLabels = reflectFieldLabels(target, source);
  const knownFieldCodes = knownFieldCodesOf(source, target);
  const entries = scopes.map(key => buildReflectSectionPlan(key, source.sections?.[key], target.sections?.[key], { ...opts, customizeFiles, fieldLabels, knownFieldCodes }));
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
  // 参照先変換の入れ忘れに気づけるよう、反映先の現在の設定から候補を求める（フィールド設定・アクションを反映するときだけ）。
  const lookupCandidates = scopes.some(key => key === 'fieldSettings' || key === 'actionSettings')
    ? findLookupMapCandidates({
      ...(scopes.includes('fieldSettings') && isCompleteReflectSection(source.sections?.fieldSettings) && isCompleteReflectSection(target.sections?.fieldSettings) ? { sourceFields: source.sections.fieldSettings, targetFields: target.sections.fieldSettings } : {}),
      ...(scopes.includes('actionSettings') && isCompleteReflectSection(source.sections?.actionSettings) && isCompleteReflectSection(target.sections?.actionSettings) ? { sourceActions: source.sections.actionSettings, targetActions: target.sections.actionSettings } : {}),
      lookupMap: opts.lookupMap, fieldLabels
    })
    : undefined;
  return {
    totalSections: entries.length, changedSections: entries.filter(entry => entry.status === 'change').length,
    sameSections: entries.filter(entry => entry.status === 'same').length,
    errorSections: entries.filter(entry => !['change', 'same'].includes(entry.status)).length,
    entries, sourceFieldCodes: listReflectFieldCodes(source, true), targetFieldCodes: listReflectFieldCodes(target), sourceSystemFieldCodes: listReflectSystemFieldCodes(source), baseline, targetPending, fieldLabels,
    ...(targetDeployStatus ? { targetDeployStatus } : {}),
    ...(hasLookupCandidates(lookupCandidates) ? { lookupCandidates } : {})
  };
}

/** 選択・修正後のフィールド設定（PUT 形）で、実際に追加・存在する通常フィールドのコード（テーブル内を含む）。 */
function composedFieldCodes(after: any): string[] {
  const properties = after?.properties;
  if (!properties || typeof properties !== 'object') return [];
  return Object.entries<any>(properties).filter(([, definition]) => !SYSTEM_FIELD_TYPES.has(definition?.type)).flatMap(([code, definition]) => [code, ...Object.keys(definition?.type === 'SUBTABLE' && definition.fields && typeof definition.fields === 'object' ? definition.fields : {})]);
}

/** 既定の計画（反映元に合わせた設定）で追加されるフィールドのコード。選択・修正で外した追加フィールドを参照する項目の案内に使う（書き込めるフィールド設定のときだけ）。 */
function addableFieldCodes(plans: ReflectSectionPlan[]): string[] {
  const fieldSettings = plans.find(plan => plan.sectionKey === 'fieldSettings');
  return fieldSettings && !fieldSettings.blockers.length && fieldSettings.values ? composedFieldCodes(fieldSettings.values.after) : [];
}

/**
 * 差分の選択・修正の状態から、項目ごとの送る設定と計画を作り直す（純粋。通信しない）。
 * states に無い項目は既定の選択（すべて選択・修正なし）とする。
 * 計画を作れない項目（取得失敗・種類の違いなど、status が change / same 以外）は sections に含めず、その blockers を引き継ぐ。
 */
export function composeReflectSelectionStandalone(preview: PreviewReflectResult, states: Record<string, SectionSelectionState>): ComposedReflectSelection {
  const fieldLabels = preview.fieldLabels || {};
  const knownFieldCodes = [...new Set([...(preview.sourceFieldCodes || []), ...(preview.sourceSystemFieldCodes || []), ...(preview.targetFieldCodes || [])])];
  const sections: ComposedSection[] = [];
  const plans: ReflectSectionPlan[] = [];
  const issues: string[] = [];
  for (const entry of preview.entries) {
    const model = entry.status === 'change' || entry.status === 'same' ? buildSectionSelectionModel(entry, fieldLabels) : null;
    if (!model) {
      if (entry.status === 'change' || entry.status === 'same') issues.push(`${entry.label}: 設定値を取得できていないため、選択・修正できません。`);
      plans.push(entry);
      continue;
    }
    const state = states && Object.prototype.hasOwnProperty.call(states, entry.sectionKey) && states[entry.sectionKey] ? states[entry.sectionKey] : defaultSelectionState(model);
    const composed = composeSectionSelection(model, state, entry, fieldLabels, knownFieldCodes);
    sections.push(composed);
    plans.push(composed.plan);
    for (const error of composed.errors) issues.push(`${composed.label}: ${error}`);
  }
  const scopes = preview.entries.map(entry => entry.sectionKey);
  // 「反映元のフィールドが追加される」前提は、選択・修正後のフィールド設定で実際に追加・存在するフィールドだけにする。
  const fieldSettings = sections.find(section => section.sectionKey === 'fieldSettings');
  const sourceFields = fieldSettings ? composedFieldCodes(fieldSettings.after) : [];
  issues.push(...reflectSelectionBlockers(plans, scopes, sourceFields, preview.targetFieldCodes, preview.sourceSystemFieldCodes, addableFieldCodes(preview.entries)));
  return { sections, blockers: [...new Set(issues)] };
}

export async function runApplyPreviewStandalone(
  opts: ReflectOptions & { stopOnError?: boolean; doBackup?: boolean; doDeploy?: boolean; reviewBaseline: ReflectBaseline; onSectionUpdate?: (update: ReflectSectionUpdate) => void; /** 項目ごとの送る設定（差分の選択・修正の結果）。無い項目は既定の計画どおり */ composed?: Record<string, any> },
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
  const knownFieldCodes = knownFieldCodesOf(source, target);
  const defaultPlans = scopes.map(key => buildReflectSectionPlan(key, source.sections?.[key], target.sections?.[key], { ...opts, customizeFiles, fieldLabels, knownFieldCodes }));
  // 差分の選択・修正がある項目は、確認済みの送る設定から計画を作り直す（再取得した既定の計画を土台に、baseline の照合は済んでいる）。
  const composed = opts.composed;
  const plans = composed ? defaultPlans.map(plan => Object.prototype.hasOwnProperty.call(composed, plan.sectionKey) ? buildPlanFromComposedAfter(plan, composed[plan.sectionKey], fieldLabels, knownFieldCodes) : plan) : defaultPlans;
  const sourceFields = composed && Object.prototype.hasOwnProperty.call(composed, 'fieldSettings') ? composedFieldCodes(composed.fieldSettings) : listReflectFieldCodes(source, true);
  const issues = reflectSelectionBlockers(plans, scopes, sourceFields, listReflectFieldCodes(target), listReflectSystemFieldCodes(source), addableFieldCodes(defaultPlans));
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
  const notify = (plan: ReflectSectionPlan, status: ReflectSectionUpdate['status'], message?: string, stopped = false) => {
    try { opts.onSectionUpdate?.({ sectionKey: plan.sectionKey, label: plan.label, status, ...(message ? { message } : {}), ...(stopped ? { stopped: true } : {}) }); } catch { /* 表示側の例外は無視する */ }
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
          sections.push({ ...outcome, status: 'ng', message, stopped: true }); notify(plan, 'ng', message, true); logs.push(`中止 ${plan.label}: ${written.join('・')} まで書き込み済み（途中で停止）`);
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
      sections.push({ ...outcome, status: 'ng', message, ...(written.length ? { partiallyWritten: true } : {}) }); notify(plan, 'ng', message); pushErrorLog(logs, `NG ${plan.label}: ${message}`, message);
      if (opts.stopOnError !== false || error.stopReflection || isRevisionConflictError(error)) {
        for (const pending of plans.slice(index + 1)) { sections.push({ sectionKey: pending.sectionKey, label: pending.label, status: 'pending', message: '中断のため未実行' }); notify(pending, 'pending', '中断のため未実行'); }
        logs.push(`中断（未実行 ${plans.length - index - 1} 件）`); break;
      }
    }
    onProgress(logs);
  }
  const count = (status: ApplySectionOutcome['status']) => sections.filter(section => section.status === status).length;
  const stoppedCount = sections.filter(section => section.status === 'ng' && section.stopped).length, failedCount = count('ng') - stoppedCount;
  logs.push(`=== 完了: OK ${count('ok')} / NG ${failedCount}${stoppedCount ? ` / 途中で停止 ${stoppedCount}` : ''} / 未実行 ${count('pending')} / 変更なし ${count('skip')} ===`);
  onProgress(logs);
  if (cancelled) setStatus(`反映を中止しました（反映済み ${count('ok')} / 途中で停止 ${stoppedCount} / 未実行 ${count('pending')}）。反映先プレビューは一部だけ更新されている可能性があります。`, true);
  else setStatus(failedCount ? '反映完了（一部エラーあり）' : '反映完了');
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
