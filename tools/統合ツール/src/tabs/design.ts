'use strict';

import { SECTION_DEFS, TOOL_ID, ARRAY_KEY_CANDIDATES } from '../constants.js';
import { state, ui } from '../state.js';
import {
  esc,
  stableStringify,
  deepClone,
  nowStamp,
  downloadText,
  safeJsonForScript,
  buildAppFilenameLabel,
  buildExportFilename,
  extractAppNameFromBundle
} from '../utils.js';
import { apiGet, buildApiPrefix, fetchBundle } from '../api.js';
import { setStatus, setBusy } from '../ui/components.js';
import { commonParams } from './diff.js';
import { getToolDocument } from '../ui/dialog.js';
import { getDiffNormalizationPresetState } from '../diff/engine.js';
import { bundleToMarkdown } from '../diff/export.js';

let jsondiffpatchLibPromise = null;

const JSONDIFFPATCH_ESM_URL = 'https://esm.sh/jsondiffpatch@0.6.0';
const JSONDIFFPATCH_HTML_FORMATTER_URL = 'https://esm.sh/jsondiffpatch@0.6.0/formatters/html';
const JSONDIFFPATCH_HTML_CSS_URL = 'https://esm.sh/jsondiffpatch@0.6.0/formatters/styles/html.css';

function formatExternalLoadError(name, err, urls) {
  const urlInfo = urls ? `\nURLs: ${urls.join(', ')}` : '';
  return new Error(`${name}に失敗しました: ${err?.message || String(err)}${urlInfo}`);
}

export async function runDesignExport(kind) {
  const c = commonParams();
  if (!c.source.appId) throw new Error('比較元アプリIDを入力してください');
  const scopes = SECTION_DEFS.map((s) => s.key);
  setStatus('設計情報を取得中...');
  const bundle = await fetchBundle({ ...c.source, sections: scopes, onProgress: (p, l) => setStatus(`取得中 ${Math.round(p * 100)}% (${l})`) });
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
  if (!c.source.appId) throw new Error('比較元アプリIDを入力してください');
  const scopes = SECTION_DEFS.map((s) => s.key);
  setStatus('設計情報を取得中...');
  const bundle = await fetchBundle({ ...c.source, sections: scopes, onProgress: (p, l) => setStatus(`取得中 ${Math.round(p * 100)}% (${l})`) });
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
  if (!c.source.appId || !c.target.appId) throw new Error('比較元と比較先の両方のアプリIDを指定してください。');
  const scopes = SECTION_DEFS.map((s) => s.key);

  setStatus('比較元の設計情報を取得中...');
  const srcBundle = await fetchBundle({ ...c.source, sections: scopes, onProgress: (p, l) => setStatus(`比較元取得中 ${Math.round(p * 100)}% (${l})`) });

  setStatus('比較先の設計情報を取得中...');
  const tgtBundle = await fetchBundle({ ...c.target, sections: scopes, onProgress: (p, l) => setStatus(`比較先取得中 ${Math.round(p * 100)}% (${l})`) });

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

export function loadScript(url) {
  return new Promise((resolve, reject) => {
    const doc = getToolDocument();
    const s = doc.createElement('script');
    s.src = url;
    s.async = true;
    s.onload = resolve;
    s.onerror = () => reject(new Error(`スクリプト読み込み失敗: ${url}`));
    doc.head.appendChild(s);
  });
}

export function ensureStylesheet(id, href) {
  if (!href) return;
  const doc = getToolDocument();
  if (doc.getElementById(id)) return;
  const link = doc.createElement('link');
  link.id = id;
  link.rel = 'stylesheet';
  link.href = href;
  doc.head.appendChild(link);
}

function buildJsonTreeObjectHash(item) {
  if (!item || typeof item !== 'object') return String(item);
  const candidates = [...ARRAY_KEY_CANDIDATES, 'label'];
  for (const key of candidates) {
    const value = item[key];
    if (value == null || typeof value === 'object') continue;
    return `${key}:${String(value)}`;
  }
  const raw = stableStringify(item);
  return raw.length > 240 ? raw.slice(0, 240) : raw;
}

async function ensureJsondiffpatchLib() {
  if (jsondiffpatchLibPromise) return jsondiffpatchLibPromise;
  jsondiffpatchLibPromise = (async () => {
    ensureStylesheet(`${TOOL_ID}-jsondiffpatch-html-css`, JSONDIFFPATCH_HTML_CSS_URL);
    let lastErr;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        if (attempt > 0) await new Promise((r) => setTimeout(r, 350 * attempt));
        const [jsondiffpatch, htmlFormatter] = await Promise.all([
          import(JSONDIFFPATCH_ESM_URL),
          import(JSONDIFFPATCH_HTML_FORMATTER_URL)
        ]);
        return { jsondiffpatch, htmlFormatter };
      } catch (e) {
        lastErr = e;
      }
    }
    throw formatExternalLoadError('jsondiffpatch の読込', lastErr, [
      JSONDIFFPATCH_ESM_URL,
      JSONDIFFPATCH_HTML_FORMATTER_URL
    ]);
  })().catch((e) => {
    jsondiffpatchLibPromise = null;
    throw e;
  });
  return jsondiffpatchLibPromise;
}

function buildJsonTreeComparePair(sectionKey, sourceBundle, targetBundle, options) {
  const src = sourceBundle?.sections?.[sectionKey];
  const tgt = targetBundle?.sections?.[sectionKey];
  return { left: tgt, right: src };
}

export async function renderJsonTreeDiffHost(sectionKey, host, options: any = {}) {
  if (!host) return;
  const lastDiffConfig = state.lastDiffConfig || {
    ignoreKeysText: ui.ignoreKeys?.value || '',
    normalizationState: getDiffNormalizationPresetState()
  };
  const comparePair = options.comparePair || buildJsonTreeComparePair(sectionKey, state.lastSourceBundle, state.lastTargetBundle, {
    ignoreKeysText: lastDiffConfig.ignoreKeysText || '',
    normalizationState: lastDiffConfig.normalizationState || ({} as any)
  });
  const leftValue = comparePair.left === undefined ? null : comparePair.left;
  const rightValue = comparePair.right === undefined ? null : comparePair.right;
  host.innerHTML = '<div class="json-tree-loading">JSONツリー差分を読み込み中...</div>';
  const { jsondiffpatch, htmlFormatter } = await ensureJsondiffpatchLib();
  const engine = jsondiffpatch.create({
    arrays: {
      detectMove: true,
      includeValueOnMove: false,
      objectHash: buildJsonTreeObjectHash
    }
  });
  const leftClone = deepClone(leftValue);
  const rightClone = deepClone(rightValue);
  const delta = engine.diff(leftClone, rightClone);
  if (!delta) {
    host.innerHTML = '<div class="json-tree-placeholder">差分はありません（無視キー・正規化適用後）。</div>';
    return;
  }
  host.innerHTML = `<div class="json-tree-surface">${htmlFormatter.format(delta, leftClone)}</div>`;
}

export { runAdvancedDesignExporter } from './design-xlsx.js';

export async function runDesignExportXlsx() {
  const { runAdvancedDesignExporter: runXlsx } = await import('./design-xlsx.js');
  const c = commonParams();
  if (!c.source.appId) throw new Error('比較元アプリIDを入力してください');
  const done = await runXlsx({
    appId: c.source.appId,
    guestId: c.source.guestId
  });
  if (done === false) {
    setStatus('設計書Excel出力をキャンセルしました');
    return;
  }
  setStatus('設計書Excel出力完了');
}
