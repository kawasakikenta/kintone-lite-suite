'use strict';

import { SECTION_DEFS } from '../constants.js';
import { buildExportFilename, buildAppFilenameLabel } from '../utils.js';
import { apiGet, apiPost, apiPut, buildApiPrefix, decorateRevisionConflict, fetchBundle, pickRevision, isRevisionConflictError } from '../api.js';
import { captureReflectBaseline, assertReflectBaselineMatches, assertCompleteReflectBackup, type ReflectBaseline } from '../reflect/standalonePreflight.js';
import { buildReflectSectionPlan, reflectInspectionScopes, reflectSelectionBlockers, listReflectFieldCodes, type ReflectSectionPlan } from '../reflect/standalonePlan.js';
import { pickSettingsBundle } from '../settingsBundleImport.js';
import { pushReflectErrorLog as pushErrorLog, type ApplySectionOutcome } from '../reflect/applyOutcome.js';

export interface ReflectOptions {
  sourceAppId: string; sourceGuestId?: string; sourcePreview?: boolean; sourceBundle?: unknown;
  targetAppId: string; targetGuestId?: string; scopes: string[];
  lookupMap?: Record<string, string>; preserveTargetOnly?: boolean;
}
export type PreviewSectionEntry = ReflectSectionPlan;
export interface PreviewReflectResult {
  totalSections: number; changedSections: number; sameSections: number; errorSections: number;
  entries: PreviewSectionEntry[]; baseline: ReflectBaseline; sourceFieldCodes: string[]; targetFieldCodes: string[];
}
export interface ReflectAppIdentity { appId: string; name: string; code: string; guestId: string }
export interface ReflectIdentities { source: ReflectAppIdentity; target: ReflectAppIdentity }

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
  const source = opts.sourceBundle ? { appId: opts.sourceAppId, guestId: '', name: '設定JSON', code: '' } : await resolve(opts.sourceAppId, opts.sourceGuestId);
  return { source, target };
}

function orderedScopes(scopes: string[]): string[] {
  if (!scopes?.length) throw new Error('反映する項目を選択してください。');
  const supported = SECTION_DEFS.filter(def => def.put);
  if (scopes.some(key => !supported.some(def => def.key === key))) throw new Error('反映に対応していない項目が含まれています。');
  return supported.filter(def => scopes.includes(def.key)).map(def => def.key);
}

async function getReflectBundles(opts: ReflectOptions, scopes: string[], setStatus: (message: string) => void) {
  setStatus(opts.sourceBundle ? '反映元の設定JSONを読み込み中...' : '反映元の設定を取得中...');
  const source = opts.sourceBundle ? pickSettingsBundle(opts.sourceBundle, { side: 'source', appId: String(opts.sourceAppId || '').trim(), rawSettings: true }) : await fetchBundle({
    rawSettings: true,
    appId: opts.sourceAppId, guestId: opts.sourceGuestId || '', preview: !!opts.sourcePreview, sections: scopes,
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

export async function previewReflectStandalone(opts: ReflectOptions, setStatus: (message: string) => void): Promise<PreviewReflectResult> {
  const invalid = reflectConnectionError(opts);
  if (invalid) throw new Error(invalid);
  const scopes = orderedScopes(opts.scopes);
  const { source, target } = await getReflectBundles(opts, scopes, setStatus);
  const entries = scopes.map(key => buildReflectSectionPlan(key, source.sections?.[key], target.sections?.[key], opts));
  const baseline = captureReflectBaseline({ ...opts, scopes: reflectInspectionScopes(scopes) }, source, target);
  for (const entry of entries.filter(entry => !entry.blockers.length)) {
    try {
      assertReflectBaselineMatches(baseline, { ...opts, scopes: [entry.sectionKey], targetDependencies: entry.requiredFields?.length ? ['fieldSettings'] : [] }, source, target);
    } catch (error: any) { entry.status = 'error'; entry.blockers.push(error.message); entry.message = error.message; }
  }
  return {
    totalSections: entries.length, changedSections: entries.filter(entry => entry.status === 'change').length,
    sameSections: entries.filter(entry => entry.status === 'same').length,
    errorSections: entries.filter(entry => !['change', 'same'].includes(entry.status)).length,
    entries, sourceFieldCodes: listReflectFieldCodes(source, true), targetFieldCodes: listReflectFieldCodes(target), baseline
  };
}

export async function runApplyPreviewStandalone(
  opts: ReflectOptions & { stopOnError?: boolean; doBackup?: boolean; doDeploy?: boolean; reviewBaseline: ReflectBaseline },
  setStatus: (message: string, error?: boolean) => void, onProgress: (logs: string[]) => void
): Promise<{ logs: string[]; sections: ApplySectionOutcome[] }> {
  if (!opts.reviewBaseline) throw new Error('反映前に差分を取得して確認してください。');
  if (opts.doDeploy) throw new Error('この機能はプレビューへの反映専用です。本番公開には対応していません。');
  const invalid = reflectConnectionError(opts);
  if (invalid) throw new Error(invalid);
  const scopes = orderedScopes(opts.scopes);
  const { source, target } = await getReflectBundles(opts, scopes, setStatus);
  if (opts.doBackup) assertCompleteReflectBackup(target, scopes);
  let revision = assertReflectBaselineMatches(opts.reviewBaseline, { ...opts, scopes }, source, target);
  const plans = scopes.map(key => buildReflectSectionPlan(key, source.sections?.[key], target.sections?.[key], opts));
  const issues = reflectSelectionBlockers(plans, scopes, listReflectFieldCodes(source, true), listReflectFieldCodes(target));
  if (issues.length) throw new Error(`反映前の検査で停止しました。まだ書き込んでいません。\n${issues.join('\n')}`);
  if (plans.some(plan => plan.requiredFields?.length)) revision = assertReflectBaselineMatches(opts.reviewBaseline, { ...opts, scopes, targetDependencies: ['fieldSettings'] }, source, target);
  if (Object.keys(opts.lookupMap || {}).length) {
    const lookup = await preflightLookupMapStandalone(opts.lookupMap!, { targetGuestId: opts.targetGuestId });
    if (!lookup.ok) throw new Error(`ルックアップ変換先を確認できないため反映を中止しました。\n${lookup.missing.map(item => `${item.from} → ${item.to}: ${item.reason}`).join('\n')}`);
  }
  const logs: string[] = [];
  if (opts.doBackup && plans.some(plan => plan.operations.length)) {
    const blob = new Blob([JSON.stringify({ generatedAt: new Date().toISOString(), scopes, bundle: target }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = buildExportFilename('反映前バックアップ', 'json', { appLabel: buildAppFilenameLabel(opts.targetAppId, '') });
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    logs.push('バックアップ取得完了（保存を開始しました）');
  }
  const prefix = buildApiPrefix(opts.targetGuestId || '', true);
  const write = async (operation: ReflectSectionPlan['operations'][number]) => {
    try {
      const response = await (operation.method === 'POST' ? apiPost : apiPut)(prefix, operation.endpoint, { ...operation.body, app: opts.targetAppId, revision });
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
  for (const [index, plan] of plans.entries()) {
    const outcome = { sectionKey: plan.sectionKey, label: plan.label };
    if (!plan.operations.length) {
      sections.push({ ...outcome, status: 'skip', message: '変更なし（書き込み不要）' });
      logs.push(`SKIP ${plan.label}: 書き込み不要`); onProgress(logs); continue;
    }
    setStatus(`反映中 ${index + 1}/${plans.length}: ${plan.label}`);
    try {
      for (const operation of plan.operations) { await write(operation); logs.push(`  OK ${operation.label}`); }
      sections.push({ ...outcome, status: 'ok' }); logs.push(`OK ${plan.label}`);
    } catch (error: any) {
      const message = error.message || String(error);
      sections.push({ ...outcome, status: 'ng', message }); pushErrorLog(logs, `NG ${plan.label}: ${message}`, message);
      if (opts.stopOnError !== false || error.stopReflection || isRevisionConflictError(error)) {
        for (const pending of plans.slice(index + 1)) sections.push({ sectionKey: pending.sectionKey, label: pending.label, status: 'pending', message: '中断のため未実行' });
        logs.push(`中断（未実行 ${plans.length - index - 1} 件）`); break;
      }
    }
    onProgress(logs);
  }
  const count = (status: ApplySectionOutcome['status']) => sections.filter(section => section.status === status).length;
  logs.push(`=== 完了: OK ${count('ok')} / NG ${count('ng')} / 未実行 ${count('pending')} / 変更なし ${count('skip')} ===`);
  onProgress(logs); setStatus(count('ng') ? '反映完了（一部エラーあり）' : '反映完了');
  return { logs, sections };
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
    } catch (error: any) { missing.push({ from, to, reason: `取得失敗: ${error.message || String(error)}` }); }
  }
  return { ok: !missing.length, missing };
}
