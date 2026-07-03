'use strict';

import { SECTION_DEFS } from '../constants.js';
import { state, ui } from '../state.js';
import {
  nowStamp,
  downloadText,
  safeJsonForScript,
  buildAppFilenameLabel,
  buildExportFilename,
  extractAppNameFromBundle
} from '../utils.js';
import { apiGet, buildApiPrefix, fetchBundle, pickBundleSections } from '../api.js';
import { setStatus, setBusy } from '../ui/components.js';
import { commonParams } from './diff.js';
import { getToolDocument } from '../ui/dialog.js';
import { bundleToMarkdown } from '../diff/export.js';
import { bumpSessionMetric } from '../ui/psychology.js';

function resolveDesignBundle(side, params, scopes, onProgress) {
  const imported = side === 'source' ? state.importedSourceBundle : state.importedTargetBundle;
  if (imported) return Promise.resolve(pickBundleSections(imported, scopes));
  return fetchBundle({ ...params, sections: scopes, onProgress });
}


export async function runDesignExport(kind) {
  bumpSessionMetric('designExport');
  const c = commonParams();
  if (!c.source.appId && !state.importedSourceBundle) throw new Error('比較元アプリIDまたは設定JSONを指定してください');
  const scopes = SECTION_DEFS.map((s) => s.key);
  setStatus(state.importedSourceBundle ? '設定JSONから設計情報を読み込み中...' : '設計情報を取得中...');
  const bundle = await resolveDesignBundle('source', c.source, scopes, (p, l) => setStatus(`取得中 ${Math.round(p * 100)}% (${l})`));
  state.lastSourceBundle = bundle;
  const appLabel = buildAppFilenameLabel(bundle.appId, extractAppNameFromBundle(bundle));

  if (kind === 'json') {
    downloadText(buildExportFilename('設計書', 'json', { appLabel }), JSON.stringify(bundle, null, 2), 'application/json');
  } else {
    downloadText(buildExportFilename('設計書', 'md', { appLabel }), bundleToMarkdown(bundle), 'text/markdown');
  }
  setStatus(`設計書出力完了（App ${bundle.appId}）`);
}


export async function runDesignCopyMd() {
  const c = commonParams();
  if (!c.source.appId && !state.importedSourceBundle) throw new Error('比較元アプリIDまたは設定JSONを指定してください');
  const scopes = SECTION_DEFS.map((s) => s.key);
  setStatus(state.importedSourceBundle ? '設定JSONから設計情報を読み込み中...' : '設計情報を取得中...');
  const bundle = await resolveDesignBundle('source', c.source, scopes, (p, l) => setStatus(`取得中 ${Math.round(p * 100)}% (${l})`));
  state.lastSourceBundle = bundle;

  const md = bundleToMarkdown(bundle);
  try {
    await navigator.clipboard.writeText(md);
    setStatus('設計書Markdownをクリップボードにコピーしました');
  } catch (e) {
    throw new Error(`クリップボードへのコピーに失敗しました: ${e.message}`);
  }
}

export function simpleLineDiff(oStr, nStr) {
  const oLines = oStr.split('\n');
  const nLines = nStr.split('\n');
  const result = [];
  let i = 0, j = 0;
  while (i < oLines.length || j < nLines.length) {
    if (i < oLines.length && j < nLines.length && oLines[i] === nLines[j]) {
      result.push('  ' + oLines[i]);
      i++; j++;
    } else {
      let rsI = -1, rsJ = -1;
      for (let k = 1; k < 60; k++) {
        if (i + k < oLines.length && oLines[i + k] === nLines[j]) { rsI = i + k; rsJ = j; break; }
        if (j + k < nLines.length && oLines[i] === nLines[j + k]) { rsI = i; rsJ = j + k; break; }
      }
      if (rsI !== -1) {
        if (rsI > i) {
          for (let scan = i; scan < rsI; scan++) result.push('- ' + oLines[scan]);
          i = rsI;
        } else {
          for (let scan = j; scan < rsJ; scan++) result.push('+ ' + nLines[scan]);
          j = rsJ;
        }
      } else {
        if (i < oLines.length) result.push('- ' + oLines[i++]);
        if (j < nLines.length) result.push('+ ' + nLines[j++]);
      }
    }
  }
  return result.join('\n');
}

export async function runDesignDiffMd() {
  const c = commonParams();
  if ((!c.source.appId && !state.importedSourceBundle) || (!c.target.appId && !state.importedTargetBundle)) throw new Error('比較元と比較先の両方にアプリIDまたは設定JSONを指定してください。');
  const scopes = SECTION_DEFS.map((s) => s.key);

  setStatus(state.importedSourceBundle ? '比較元の設計情報を設定JSONから読み込み中...' : '比較元の設計情報を取得中...');
  const srcBundle = await resolveDesignBundle('source', c.source, scopes, (p, l) => setStatus(`比較元取得中 ${Math.round(p * 100)}% (${l})`));

  setStatus(state.importedTargetBundle ? '比較先の設計情報を設定JSONから読み込み中...' : '比較先の設計情報を取得中...');
  const tgtBundle = await resolveDesignBundle('target', c.target, scopes, (p, l) => setStatus(`比較先取得中 ${Math.round(p * 100)}% (${l})`));

  setStatus('差分レポート生成中...');
  const srcMd = bundleToMarkdown(srcBundle);
  const tgtMd = bundleToMarkdown(tgtBundle);

  const diffMd = simpleLineDiff(tgtMd, srcMd);

  const finalMd = `# 設計書差分レポート
- 生成日時: ${nowStamp()}
- 比較元App: ${c.source.appId} (追加/更新後)
- 比較先App: ${c.target.appId} (現在の設定)

\`\`\`diff
${diffMd}
\`\`\`
`;
  const sourceLabel = buildAppFilenameLabel(srcBundle.appId, extractAppNameFromBundle(srcBundle));
  const targetLabel = buildAppFilenameLabel(tgtBundle.appId, extractAppNameFromBundle(tgtBundle));
  downloadText(
    buildExportFilename('設計書差分レポート', 'md', {
      appLabel: sourceLabel && targetLabel ? `${sourceLabel}_vs_${targetLabel}` : `${sourceLabel || targetLabel || ''}`
    }),
    finalMd,
    'text/markdown'
  );
  setStatus('設計書差分レポートを出力しました');
}

export { runAdvancedDesignExporter } from './design-xlsx.js';

/**
 * 指定アプリIDに対応する取得済み設定バンドルを探す（あればAPI取得の代わりに使う）。
 * 「設定一括取得」タブで取得済みのバンドル、または（diffタブ経由で）読み込み済みの設定JSONの
 * どちらかが該当すれば、それを返す。appId 未指定時は読み込み済みJSONをそのまま返す。
 */
function resolveKnownDesignBundle(appId: string): any {
  const id = String(appId || '').trim();
  if (!id) return state.importedSourceBundle || null;
  const stash = Array.isArray(state.lastSettingsExportBundles) ? state.lastSettingsExportBundles : [];
  const fromStash = stash.find((b: any) => String(b?.appId || '') === id);
  if (fromStash) return fromStash;
  if (state.importedSourceBundle && String((state.importedSourceBundle as any).appId || '') === id) return state.importedSourceBundle;
  return null;
}

/** 参照アプリ名解決用: 取得済み設定バンドル群からアプリ名を引けるようにする */
function buildKnownAppNameLookup(): Record<string, string> {
  const map: Record<string, string> = {};
  const stash = Array.isArray(state.lastSettingsExportBundles) ? state.lastSettingsExportBundles : [];
  for (const b of stash) {
    const id = String(b?.appId || '');
    const name = id ? extractAppNameFromBundle(b) : '';
    if (id && name) map[id] = name;
  }
  if (state.importedSourceBundle) {
    const id = String((state.importedSourceBundle as any).appId || '');
    const name = extractAppNameFromBundle(state.importedSourceBundle);
    if (id && name) map[id] = name;
  }
  return map;
}

export async function runDesignExportXlsx() {
  const { runAdvancedDesignExporter: runXlsx } = await import('./design-xlsx.js');
  const c = commonParams();
  const bundle = resolveKnownDesignBundle(c.source.appId);
  if (!c.source.appId && !bundle) throw new Error('比較元アプリIDまたは設定JSONを指定してください');
  const done = await runXlsx({
    appId: c.source.appId,
    guestId: c.source.guestId,
    bundle,
    appNameLookup: buildKnownAppNameLookup()
  });
  if (done === false) {
    setStatus('設計書Excel出力をキャンセルしました');
    return;
  }
  setStatus(bundle ? '設計書Excel出力完了（設定JSONから生成）' : '設計書Excel出力完了');
}

/**
 * 設計書タブ内の「複数アプリの設計書ZIP出力」UIから呼び出す。
 * 入力欄 #u_designBatchAppIds（改行/カンマ/スペース区切り）を読み、guestId は比較元と同じ値を使用する。
 * 「設定一括取得」で取得済み、または読み込み済みの設定JSONに該当するアプリはAPI取得せずそちらを使う。
 */
export async function runDesignExportXlsxBatchZip() {
  const { runBatchDesignExportXlsxZip } = await import('./design-xlsx.js');
  const { getAppTargetTable } = await import('../ui/appTargetTable.js');
  const c = commonParams();
  const sourceGuest = c.source.guestId || '';

  // 表（appTargetTable）があればアプリごとのゲストスペースを使う。
  // ゲスト未入力の行は比較元のゲストIDで補完する（従来挙動の踏襲）。
  let apps: Array<{ appId: string; guestId: string }> = [];
  const table = getAppTargetTable('designBatch');
  if (table) {
    apps = table.getTargets().map((t) => ({ appId: t.appId, guestId: t.guestId || sourceGuest }));
  }
  if (!apps.length) {
    const ta = getToolDocument().getElementById('u_designBatchAppIds') as HTMLTextAreaElement | null;
    const raw = ta?.value || '';
    apps = raw.split(/[\s,]+/).map((s) => s.trim()).filter((s) => /^\d+$/.test(s)).map((appId) => ({ appId, guestId: sourceGuest }));
  }
  if (apps.length === 0) {
    throw new Error('対象アプリIDを1件以上入力してください（数値のみ、改行/カンマ/スペース区切り）');
  }
  const appsWithBundles = apps.map((a) => ({ ...a, bundle: resolveKnownDesignBundle(a.appId) }));
  const knownCount = appsWithBundles.filter((a) => a.bundle).length;
  setStatus(`設計書ZIP出力を開始（${apps.length}件${knownCount ? ` / うち設定JSON ${knownCount}件` : ''}）...`);
  const done = await runBatchDesignExportXlsxZip({ apps: appsWithBundles });
  if (done === false) {
    setStatus('設計書ZIP出力をキャンセルしました');
    return;
  }
  setStatus(`設計書ZIP出力完了（${apps.length}件）`);
}
