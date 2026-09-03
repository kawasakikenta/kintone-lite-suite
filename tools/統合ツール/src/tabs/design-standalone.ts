'use strict';

import { SECTION_DEFS } from '../constants.js';
import { state } from '../state.js';
import { nowStamp, downloadText, buildExportFilename, appLabelFromBundle } from '../utils.js';
import { fetchBundle } from '../api.js';
import { pickSettingsBundle } from '../settingsBundleImport.js';
import { bundleToMarkdown } from '../diff/export.js';
import { runAdvancedDesignExporter, runBatchDesignExportXlsxZip } from './design-xlsx.js';

interface DesignSourceInput {
  appId?: string;
  guestId?: string;
  preview?: boolean;
  importedBundle?: any;
}

/**
 * 設定JSON（importedBundle）があればそれを、無ければ API から全セクションを取得して bundle を返す。
 * 設計書出力・Markdownコピー・差分レポートで共通。取得できなかったセクション数を status に出す。
 */
async function resolveDesignBundle(
  source: DesignSourceInput,
  side: 'source' | 'target',
  setStatus: (msg: string, err?: boolean) => void,
  labelPrefix = ''
) {
  const appId = String(source?.appId || '').trim();
  const importedBundle = source?.importedBundle;
  if (!appId && !importedBundle) throw new Error(`${labelPrefix || ''}アプリIDまたは設定JSONを指定してください`.trim());
  const scopes = SECTION_DEFS.map((s) => s.key);
  setStatus(importedBundle ? `${labelPrefix}設定JSONから設計情報を読み込み中...` : `${labelPrefix}設計情報を取得中...`);
  const bundle = importedBundle
    ? pickSettingsBundle(importedBundle, { side, appId })
    : await fetchBundle({
      appId,
      guestId: String(source?.guestId || '').trim(),
      preview: !!source?.preview,
      sections: scopes,
      onProgress: (p, l) => setStatus(`${labelPrefix}取得中 ${Math.round(p * 100)}% (${l})`)
    });
  const failed = scopes.filter((key) => bundle?.sections?.[key]?._fetchError);
  if (failed.length) {
    const labels = failed.map((key) => SECTION_DEFS.find((s) => s.key === key)?.label || key);
    setStatus(`${labelPrefix}取得できなかったセクション ${failed.length}件（${labels.join(', ')}）は設計書に「取得失敗」として載ります`, true);
  }
  return bundle;
}

/**
 * @param {'md'|'json'} kind
 * @param {{ appId: string, guestId: string, preview: boolean }} source
 * @param {(msg: string, err?: boolean) => void} setStatus
 */
export async function runDesignExportStandalone(kind, source, setStatus) {
  if (kind !== 'md' && kind !== 'json') throw new Error('設計書の出力形式は md または json を指定してください');
  const bundle = await resolveDesignBundle(source, 'source', setStatus);
  state.lastSourceBundle = bundle;

  const appLabel = appLabelFromBundle(bundle);
  if (kind === 'json') {
    downloadText(buildExportFilename('設計書', 'json', { appLabel }), JSON.stringify(bundle, null, 2), 'application/json');
  } else {
    downloadText(buildExportFilename('設計書', 'md', { appLabel }), bundleToMarkdown(bundle), 'text/markdown');
  }
  setStatus(`設計書出力完了（App ${bundle.appId}）`);
}

/**
 * @param {{ appId: string, guestId: string, preview: boolean }} source
 * @param {(msg: string, err?: boolean) => void} setStatus
 */
export async function runDesignCopyMdStandalone(source, setStatus) {
  const bundle = await resolveDesignBundle(source, 'source', setStatus);
  state.lastSourceBundle = bundle;

  const md = bundleToMarkdown(bundle);
  try {
    await navigator.clipboard.writeText(md);
    setStatus('設計書Markdownをクリップボードにコピーしました');
  } catch (e) {
    throw new Error(`クリップボードへのコピーに失敗しました: ${e.message}`);
  }
}

/**
 * @param {{ appId: string, guestId: string, importedBundle?: any, appNameLookup?: Record<string, string> }} source
 * @param {(msg: string, err?: boolean) => void} setStatus
 */
export async function runDesignExportXlsxStandalone(source, setStatus) {
  const appId = String(source.appId || '').trim();
  const importedBundle = (source as any).importedBundle;
  if (!appId && !importedBundle) throw new Error('アプリIDまたは設定JSONを指定してください');
  const guestId = String(source.guestId || '').trim();
  setStatus(importedBundle ? '設計書Excel出力を開始（設定JSONから生成）...' : '設計書Excel出力を開始...');
  const done = await runAdvancedDesignExporter({
    appId,
    guestId,
    bundle: importedBundle || null,
    appNameLookup: (source as any).appNameLookup || {}
  });
  if (done === false) {
    setStatus('設計書Excel出力をキャンセルしました');
    return;
  }
  setStatus('設計書Excel出力完了');
}

/**
 * 複数アプリの設計書を1つの ZIP にまとめて出力する（Lite パネル用）。
 * - source.apps: [{appId, guestId, bundle}]（アプリごとに別ゲストスペース・設定JSON対応）を優先
 * - 旧来の source.appIdsText + source.guestId（全アプリ共通ゲスト）も受け付ける
 * @param setStatus 進捗メッセージ
 */
export async function runBatchDesignExportXlsxZipStandalone(
  source: { apps?: Array<{ appId: string; guestId?: string; bundle?: any }>; appIdsText?: string; guestId?: string },
  setStatus: (msg: string, err?: boolean) => void
) {
  let apps: Array<{ appId: string; guestId: string; bundle?: any }>;
  if (Array.isArray(source.apps)) {
    apps = source.apps
      .map((a) => ({ appId: String(a.appId || '').trim(), guestId: String(a.guestId || '').trim(), bundle: a.bundle || null }))
      .filter((a) => /^\d+$/.test(a.appId));
  } else {
    const guestId = String(source.guestId || '').trim();
    apps = String(source.appIdsText || '')
      .split(/[\s,]+/)
      .map((s) => s.trim())
      .filter((s) => /^\d+$/.test(s))
      .map((appId) => ({ appId, guestId, bundle: null }));
  }
  if (apps.length === 0) throw new Error('アプリIDを1件以上入力してください（数値のみ）');
  const importedCount = apps.filter((a) => a.bundle).length;
  setStatus(`設計書ZIP出力を開始（${apps.length}件${importedCount ? ` / うち設定JSON ${importedCount}件` : ''}）...`);
  const done = await runBatchDesignExportXlsxZip({ apps });
  if (done === false) {
    setStatus('設計書ZIP出力をキャンセルしました');
    return;
  }
  setStatus(`設計書ZIP出力完了（${apps.length}件）`);
}

function simpleLineDiffLite(oStr: string, nStr: string): string {
  const oLines = oStr.split('\n');
  const nLines = nStr.split('\n');
  const result: string[] = [];
  let i = 0, j = 0;
  while (i < oLines.length || j < nLines.length) {
    if (i < oLines.length && j < nLines.length && oLines[i] === nLines[j]) {
      result.push('  ' + oLines[i]); i++; j++;
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

/**
 * 比較元と比較先の設計書 Markdown を生成し、行差分レポートを Markdown 出力する。
 */
export async function runDesignDiffMdStandalone(
  opts: {
    source: { appId: string; guestId?: string; preview?: boolean; importedBundle?: any };
    target: { appId: string; guestId?: string; preview?: boolean; importedBundle?: any };
  },
  setStatus: (msg: string, err?: boolean) => void
) {
  const srcAppId = String(opts.source?.appId || '').trim();
  const tgtAppId = String(opts.target?.appId || '').trim();
  const importedSource = (opts.source as any)?.importedBundle;
  const importedTarget = (opts.target as any)?.importedBundle;
  if ((!srcAppId && !importedSource) || (!tgtAppId && !importedTarget)) throw new Error('比較元と比較先の両方にアプリIDまたは設定JSONを指定してください。');

  const srcBundle = await resolveDesignBundle(opts.source, 'source', setStatus, '比較元: ');
  const tgtBundle = await resolveDesignBundle(opts.target, 'target', setStatus, '比較先: ');

  setStatus('差分レポート生成中...');
  const srcMd = bundleToMarkdown(srcBundle);
  const tgtMd = bundleToMarkdown(tgtBundle);
  const diffMd = simpleLineDiffLite(tgtMd, srcMd);

  const finalMd = `# 設計書差分レポート
- 生成日時: ${nowStamp()}
- 比較元App: ${srcAppId} (追加/更新後)
- 比較先App: ${tgtAppId} (現在の設定)

\`\`\`diff
${diffMd}
\`\`\`
`;
  const diffLabel = `${appLabelFromBundle(srcBundle)}_vs_${appLabelFromBundle(tgtBundle)}`;
  downloadText(buildExportFilename('設計書差分', 'md', { appLabel: diffLabel }), finalMd, 'text/markdown');
  setStatus(`設計書差分レポートを出力しました（${srcAppId} ⇔ ${tgtAppId}）`);
}
