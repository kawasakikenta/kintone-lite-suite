'use strict';

import { SECTION_DEFS } from '../constants.js';
import { state } from '../state.js';
import { nowStamp, downloadText } from '../utils.js';
import { fetchBundle } from '../api.js';
import { bundleToMarkdown } from '../diff/export.js';
import { runAdvancedDesignExporter } from './design-xlsx.js';

/**
 * @param {'md'|'json'} kind
 * @param {{ appId: string, guestId: string, preview: boolean }} source
 * @param {(msg: string, err?: boolean) => void} setStatus
 */
export async function runDesignExportStandalone(kind, source, setStatus) {
  const appId = String(source.appId || '').trim();
  if (!appId) throw new Error('アプリIDを入力してください');
  const guestId = String(source.guestId || '').trim();
  const preview = !!source.preview;
  const scopes = SECTION_DEFS.map((s) => s.key);
  setStatus('設計情報を取得中...');
  const bundle = await fetchBundle({
    appId,
    guestId,
    preview,
    sections: scopes,
    onProgress: (p, l) => setStatus(`取得中 ${Math.round(p * 100)}% (${l})`)
  });
  state.lastSourceBundle = bundle;

  if (kind === 'json') {
    downloadText(`design_${bundle.appId}_${nowStamp()}.json`, JSON.stringify(bundle, null, 2), 'application/json');
  } else {
    downloadText(`design_${bundle.appId}_${nowStamp()}.md`, bundleToMarkdown(bundle), 'text/markdown');
  }
  setStatus(`設計書出力完了（App ${bundle.appId}）`);
}

/**
 * @param {{ appId: string, guestId: string, preview: boolean }} source
 * @param {(msg: string, err?: boolean) => void} setStatus
 */
export async function runDesignCopyMdStandalone(source, setStatus) {
  const appId = String(source.appId || '').trim();
  if (!appId) throw new Error('アプリIDを入力してください');
  const guestId = String(source.guestId || '').trim();
  const preview = !!source.preview;
  const scopes = SECTION_DEFS.map((s) => s.key);
  setStatus('設計情報を取得中...');
  const bundle = await fetchBundle({
    appId,
    guestId,
    preview,
    sections: scopes,
    onProgress: (p, l) => setStatus(`取得中 ${Math.round(p * 100)}% (${l})`)
  });
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
 * @param {{ appId: string, guestId: string }} source
 * @param {(msg: string, err?: boolean) => void} setStatus
 */
export async function runDesignExportXlsxStandalone(source, setStatus) {
  const appId = String(source.appId || '').trim();
  if (!appId) throw new Error('アプリIDを入力してください');
  const guestId = String(source.guestId || '').trim();
  setStatus('設計書Excel出力を開始...');
  const done = await runAdvancedDesignExporter({ appId, guestId });
  if (done === false) {
    setStatus('設計書Excel出力をキャンセルしました');
    return;
  }
  setStatus('設計書Excel出力完了');
}
