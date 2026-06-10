'use strict';

import { SECTION_DEFS, SYSTEM_FIELD_TYPES } from '../constants.js';
import { deepClone, stableStringify, buildExportFilename, buildAppFilenameLabel } from '../utils.js';
import { apiGet, apiPost, apiPut, buildApiPrefix, fetchBundle } from '../api.js';
import { pickSettingsBundle } from '../settingsBundleImport.js';
import { buildReflectErrorHint, type ApplySectionOutcome } from '../reflect/applyOutcome.js';

function pushErrorLog(logs: string[], line: string, errorMessage: string) {
  logs.push(line);
  const hint = buildReflectErrorHint(errorMessage);
  if (!hint) return;
  const hintLine = `   ヒント: ${hint}`;
  // 直前に同じヒントを出していたら重複して出さない（fieldSettings のサブ手順と本体など）
  if (logs.slice(-3).includes(hintLine)) return;
  logs.push(hintLine);
}

function filterWritable(props: any) {
  const out: Record<string, any> = {};
  for (const [k, def] of Object.entries(props || {}) as Array<[string, any]>) {
    if (!def || typeof def !== 'object') continue;
    if (SYSTEM_FIELD_TYPES.has(def.type)) continue;
    out[k] = deepClone(def);
  }
  return out;
}

function convertLookup(fieldDef: any, map: Record<string, any>) {
  const def: any = deepClone(fieldDef || ({} as any));
  if (!Object.keys(map).length) return def;
  const walk = (node: any) => {
    if (!node || typeof node !== 'object') return;
    const rel = node.lookup?.relatedApp;
    if (rel?.app != null) {
      const after = map[String(rel.app)];
      if (after && String(after) !== String(rel.app)) node.lookup.relatedApp.app = String(after);
    }
    if (node.type === 'SUBTABLE' && node.fields) Object.values(node.fields).forEach(walk);
  };
  walk(def);
  return def;
}

/** @returns 失敗した手順数（0 なら全手順成功） */
async function applyFieldSection(prefix, app, sourceProps, logs, lookupMap, stopOnError): Promise<number> {
  const current = await apiGet(prefix, '/app/form/fields.json', { app });
  const currentMap = current.properties || ({} as any);
  const srcWritable = filterWritable(sourceProps);

  const adds = {};
  const updates = {};
  for (const [code, def] of Object.entries(srcWritable) as Array<[string, any]>) {
    const converted = convertLookup(def, lookupMap);
    if (currentMap[code]) {
      updates[code] = converted;
    } else {
      adds[code] = converted;
    }
  }

  let failedSteps = 0;
  if (Object.keys(adds).length) {
    try {
      await apiPost(prefix, '/app/form/fields.json', { app, properties: adds });
      logs.push(`  OK フィールド追加: ${Object.keys(adds).length}件`);
    } catch (e) {
      failedSteps += 1;
      pushErrorLog(logs, `  NG フィールド追加: ${e.message}`, e.message);
      if (stopOnError) throw e;
    }
  }
  if (Object.keys(updates).length) {
    try {
      await apiPut(prefix, '/app/form/fields.json', { app, properties: updates });
      logs.push(`  OK フィールド更新: ${Object.keys(updates).length}件`);
    } catch (e) {
      failedSteps += 1;
      pushErrorLog(logs, `  NG フィールド更新: ${e.message}`, e.message);
      if (stopOnError) throw e;
    }
  }
  return failedSteps;
}

async function applyViewsSection(prefix, app, sourceViews) {
  await apiPut(prefix, '/app/views.json', { app, views: sourceViews.views || sourceViews });
}

/**
 * @param {{
 *   sourceAppId: string,
 *   sourceGuestId?: string,
 *   sourcePreview?: boolean,
 *   sourceBundle?: unknown,
 *   targetAppId: string,
 *   targetGuestId?: string,
 *   scopes: string[],
 *   lookupMap?: Record<string,string>,
 *   stopOnError?: boolean,
 *   doBackup?: boolean
 * }} opts
 * @param {(msg: string, err?: boolean) => void} setStatus
 * @param {(logs: string[]) => void} onProgress
 * @returns 実行ログと、セクション単位の実行結果（再実行準備に使う）
 */
export async function runApplyPreviewStandalone(
  opts,
  setStatus,
  onProgress
): Promise<{ logs: string[]; sections: ApplySectionOutcome[] }> {
  const { sourceAppId, sourceGuestId, sourcePreview, targetAppId, targetGuestId } = opts;
  if (!sourceAppId && !opts.sourceBundle) throw new Error('比較元アプリIDまたは設定JSONを指定してください');
  if (!targetAppId) throw new Error('比較先アプリIDを入力してください');

  const scopes = (opts.scopes || []).filter(Boolean);
  if (!scopes.length) throw new Error('反映するセクションを選択してください');

  const lookupMap = opts.lookupMap || ({} as any);
  const stopOnError = !!opts.stopOnError;
  const logs = [];

  setStatus(opts.sourceBundle ? '比較元設定を設定JSONから読み込み中...' : '比較元設定を取得中...');
  const sourceBundle = opts.sourceBundle
    ? pickSettingsBundle(opts.sourceBundle, { side: 'source', appId: String(sourceAppId || '').trim() })
    : await fetchBundle({
      appId: sourceAppId,
      guestId: sourceGuestId || '',
      preview: !!sourcePreview,
      sections: scopes,
      onProgress: (p, l) => setStatus(`比較元取得中 ${Math.round(p * 100)}% (${l})`)
    });

  if (opts.doBackup) {
    setStatus('比較先プレビューのバックアップ取得中...');
    const backup = await fetchBundle({
      appId: targetAppId,
      guestId: targetGuestId || '',
      preview: true,
      sections: scopes,
      onProgress: (p, l) => setStatus(`バックアップ取得 ${Math.round(p * 100)}% (${l})`)
    });
    const payload = JSON.stringify({ generatedAt: new Date().toISOString(), scopes, bundle: backup }, null, 2);
    const blob = new Blob([payload], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = buildExportFilename('反映前バックアップ', 'json', { appLabel: buildAppFilenameLabel(targetAppId, '') });
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    logs.push('バックアップ保存完了');
  }

  const prefix = buildApiPrefix(targetGuestId || '', true);
  const app = targetAppId;

  logs.push(`比較元: ${opts.sourceBundle ? `設定JSON${sourceAppId ? ` (App ${sourceAppId})` : ''}` : sourceAppId} → 比較先(プレビュー): ${targetAppId}`);
  logs.push(`セクション: ${scopes.length}件`);
  logs.push('');

  let hadError = false;
  const sections: ApplySectionOutcome[] = [];

  for (let i = 0; i < scopes.length; i++) {
    const secKey = scopes[i];
    const def = SECTION_DEFS.find((d) => d.key === secKey);
    if (!def || !def.put) {
      logs.push(`SKIP ${def?.label || secKey}`);
      sections.push({ sectionKey: secKey, label: def?.label || secKey, status: 'skip', message: '反映非対応セクション' });
      continue;
    }

    const sourceSec = deepClone(sourceBundle.sections?.[secKey]);
    if (!sourceSec || sourceSec._fetchError) {
      logs.push(`SKIP ${def.label}: source未取得`);
      sections.push({ sectionKey: secKey, label: def.label, status: 'skip', message: '比較元未取得' });
      onProgress(logs);
      continue;
    }

    setStatus(`反映中 ${i + 1}/${scopes.length}: ${def.label}`);
    try {
      if (secKey === 'fieldSettings') {
        const failedSteps = await applyFieldSection(prefix, app, sourceSec.properties || sourceSec, logs, lookupMap, stopOnError);
        if (failedSteps > 0) {
          hadError = true;
          logs.push(`NG ${def.label}: 一部の手順が失敗しました（詳細は上の行）`);
          sections.push({ sectionKey: secKey, label: def.label, status: 'ng', message: '一部の手順が失敗' });
        } else {
          logs.push(`OK ${def.label}`);
          sections.push({ sectionKey: secKey, label: def.label, status: 'ok' });
        }
      } else if (secKey === 'viewSettings') {
        await applyViewsSection(prefix, app, sourceSec);
        logs.push(`OK ${def.label}`);
        sections.push({ sectionKey: secKey, label: def.label, status: 'ok' });
      } else {
        const body = { app, ...def.putBuilder(sourceSec) };
        await apiPut(prefix, def.endpoint, body);
        logs.push(`OK ${def.label}`);
        sections.push({ sectionKey: secKey, label: def.label, status: 'ok' });
      }
    } catch (e) {
      hadError = true;
      const msg = e.message || String(e);
      pushErrorLog(logs, `NG ${def.label}: ${msg}`, msg);
      sections.push({ sectionKey: secKey, label: def.label, status: 'ng', message: msg });
      if (stopOnError) {
        // 残りのセクションは未実行として記録し、再実行の対象にできるようにする
        for (let j = i + 1; j < scopes.length; j++) {
          const restKey = scopes[j];
          const restDef = SECTION_DEFS.find((d) => d.key === restKey);
          sections.push({ sectionKey: restKey, label: restDef?.label || restKey, status: 'pending', message: '中断のため未実行' });
        }
        logs.push(`中断（未実行 ${scopes.length - i - 1} 件）`);
        break;
      }
    }
    onProgress(logs);
  }

  const ok = sections.filter((s) => s.status === 'ok').length;
  const ng = sections.filter((s) => s.status === 'ng').length;
  const pending = sections.filter((s) => s.status === 'pending').length;
  logs.push('');
  logs.push(`=== 完了: OK ${ok} / NG ${ng}${pending ? ` / 未実行 ${pending}` : ''} ===`);
  onProgress(logs);
  setStatus(hadError ? '反映完了（一部エラーあり）' : '反映完了');
  return { logs, sections };
}

// =============================================================================
// Lite 版向け追加ヘルパー（フル版の安全機能と同等の最小実装）
// =============================================================================

export interface LookupPreflightOptions {
  /** ゲストID（API prefix 解決に使用） */
  targetGuestId?: string;
}

export interface LookupPreflightIssue {
  from: string;
  to: string;
  reason: string;
}

export interface LookupPreflightResult {
  ok: boolean;
  missing: LookupPreflightIssue[];
}

/**
 * Lookup AppID マッピングの変換先アプリが実在するかをチェックする。
 * フル版の preflightLookupMap の lite 版相当（TTL キャッシュなし）。
 */
export async function preflightLookupMapStandalone(
  lookupMap: Record<string, string>,
  opts: LookupPreflightOptions = {}
): Promise<LookupPreflightResult> {
  const entries = Object.entries(lookupMap || {});
  if (!entries.length) return { ok: true, missing: [] };
  const prefix = buildApiPrefix(opts.targetGuestId || '', true);
  const missing: LookupPreflightIssue[] = [];
  for (const [from, to] of entries) {
    const target = String(to || '').trim();
    if (!target || !/^\d+$/.test(target)) {
      missing.push({ from, to: target, reason: 'AppID形式が不正' });
      continue;
    }
    try {
      await apiGet(prefix, '/app.json', { id: target });
    } catch (e: any) {
      missing.push({ from, to: target, reason: `取得失敗: ${e?.message || String(e)}` });
    }
  }
  return { ok: missing.length === 0, missing };
}

export interface PreviewSectionEntry {
  sectionKey: string;
  label: string;
  status: 'change' | 'same' | 'src-missing' | 'tgt-missing' | 'error';
  message: string;
  /** フィールド設定の場合のみ、追加/更新/削除候補件数を返す */
  fieldStats?: { add: number; update: number; tgtOnly: number };
}

export interface PreviewReflectResult {
  totalSections: number;
  changedSections: number;
  sameSections: number;
  errorSections: number;
  entries: PreviewSectionEntry[];
}

/**
 * 反映実行前に「比較元と比較先プレビューでどのセクションが変わるか」を比較する。
 * フル版の差分エンジン相当のフル機能はないが、セクション単位の一致/不一致と、
 * フィールド設定のみ追加/更新/比較先のみ件数を返す。
 */
export async function previewReflectStandalone(
  opts: {
    sourceAppId: string;
    sourceGuestId?: string;
    sourcePreview?: boolean;
    sourceBundle?: unknown;
    targetAppId: string;
    targetGuestId?: string;
    scopes: string[];
    lookupMap?: Record<string, string>;
  },
  setStatus: (msg: string) => void
): Promise<PreviewReflectResult> {
  const scopes = (opts.scopes || []).filter(Boolean);
  const lookupMap = opts.lookupMap || ({} as any);
  if (!scopes.length) throw new Error('プレビュー対象セクションが空です');
  if (!opts.sourceAppId && !opts.sourceBundle) throw new Error('比較元アプリIDまたは設定JSONを指定してください');
  if (!opts.targetAppId) throw new Error('比較先アプリIDを入力してください');

  setStatus(opts.sourceBundle ? '比較元設定を設定JSONから読み込み中...' : '比較元設定を取得中...');
  const source = opts.sourceBundle
    ? pickSettingsBundle(opts.sourceBundle, { side: 'source', appId: String(opts.sourceAppId || '').trim() })
    : await fetchBundle({
      appId: opts.sourceAppId,
      guestId: opts.sourceGuestId || '',
      preview: !!opts.sourcePreview,
      sections: scopes,
      onProgress: (p, l) => setStatus(`比較元取得 ${Math.round(p * 100)}% (${l})`)
    });
  setStatus('比較先プレビューを取得中...');
  const target = await fetchBundle({
    appId: opts.targetAppId,
    guestId: opts.targetGuestId || '',
    preview: true,
    sections: scopes,
    onProgress: (p, l) => setStatus(`比較先取得 ${Math.round(p * 100)}% (${l})`)
  });

  const entries: PreviewSectionEntry[] = [];
  for (const secKey of scopes) {
    const def = SECTION_DEFS.find((d) => d.key === secKey);
    const label = def?.label || secKey;
    const srcSec = source.sections?.[secKey];
    const tgtSec = target.sections?.[secKey];

    if (!srcSec || (srcSec as any)._fetchError) {
      entries.push({ sectionKey: secKey, label, status: 'src-missing', message: `比較元未取得: ${(srcSec as any)?._fetchError || '不明'}` });
      continue;
    }
    if (!tgtSec || (tgtSec as any)._fetchError) {
      entries.push({ sectionKey: secKey, label, status: 'tgt-missing', message: `比較先未取得: ${(tgtSec as any)?._fetchError || '不明'}` });
      continue;
    }

    // フィールド設定のみ詳細件数を出す
    if (secKey === 'fieldSettings') {
      const srcPropsRaw = filterWritable((srcSec as any).properties || srcSec);
      const srcProps: Record<string, any> = {};
      for (const [code, def] of Object.entries(srcPropsRaw) as Array<[string, any]>) {
        srcProps[code] = convertLookup(def, lookupMap);
      }
      const tgtProps = filterWritable((tgtSec as any).properties || tgtSec || {});
      if (stableStringify(srcProps) === stableStringify(tgtProps)) {
        entries.push({ sectionKey: secKey, label, status: 'same', message: '差分なし' });
        continue;
      }
      let add = 0;
      let update = 0;
      let tgtOnly = 0;
      for (const code of Object.keys(srcProps)) {
        if (!tgtProps[code]) { add += 1; continue; }
        if (stableStringify(srcProps[code]) !== stableStringify(tgtProps[code])) update += 1;
      }
      for (const code of Object.keys(tgtProps)) {
        if (!srcProps[code]) tgtOnly += 1;
      }
      const detail = `追加 ${add} / 更新 ${update} / 比較先のみ ${tgtOnly}`;
      entries.push({
        sectionKey: secKey,
        label,
        status: 'change',
        message: detail,
        fieldStats: { add, update, tgtOnly }
      });
    } else {
      if (stableStringify(srcSec) === stableStringify(tgtSec)) {
        entries.push({ sectionKey: secKey, label, status: 'same', message: '差分なし' });
        continue;
      }
      entries.push({ sectionKey: secKey, label, status: 'change', message: '差分あり（セクション単位）' });
    }
  }

  return {
    totalSections: entries.length,
    changedSections: entries.filter((e) => e.status === 'change').length,
    sameSections: entries.filter((e) => e.status === 'same').length,
    errorSections: entries.filter((e) => e.status === 'src-missing' || e.status === 'tgt-missing' || e.status === 'error').length,
    entries
  };
}
