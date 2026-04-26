'use strict';

import { crawl, buildHTML, progressUi, ER_DEFAULTS, formatErLayoutLabel } from './er.js';
import { nowStamp, downloadText } from '../utils.js';

/**
 * @param {object} opts
 * @param {string} opts.appId
 * @param {string} [opts.guestId]
 * @param {boolean} [opts.preview]
 * @param {string} [opts.layoutName]
 * @param {string} [opts.fieldDensity]
 * @param {number} [opts.maxDepth]
 * @param {boolean} [opts.includeSubtableFields]
 * @param {boolean} [opts.includeReverseLookup]
 * @param {string[]} [opts.extraAppIds]
 * @param {(msg: string, err?: boolean) => void} setStatus
 */
export async function runGenerateERDiagramStandalone(opts, setStatus) {
  const appId = String(opts.appId || '').trim();
  if (!appId) throw new Error('アプリIDを入力してください');

  const startAppIds = [appId, ...(opts.extraAppIds || [])].filter((v, i, a) => /^\d+$/.test(v) && a.indexOf(v) === i);
  const options = {
    startAppId: appId,
    startAppIds,
    layoutName: opts.layoutName || ER_DEFAULTS.layoutName,
    fieldDensity: opts.fieldDensity || ER_DEFAULTS.fieldDensity,
    maxDepth: Number(opts.maxDepth) || 0,
    includeSubtableFields: opts.includeSubtableFields !== false,
    includeReverseLookup: !!opts.includeReverseLookup,
    maxFields: ER_DEFAULTS.maxFields,
    sleepMs: ER_DEFAULTS.sleepMs,
    source: { guestId: opts.guestId || '', preview: !!opts.preview }
  };

  const popup = window.open('', '_blank');
  if (!popup) throw new Error('別タブを開けませんでした。ポップアップブロックを確認してください');
  popup.document.write('<title>ER図</title><body style="font-family:sans-serif;padding:24px">ER図を生成中...</body>');

  setStatus(`ER図を生成中... 起点 ${startAppIds.join(',')}`);
  progressUi.init();
  progressUi.update(4, `開始: 起点 ${startAppIds.join(',')}`);

  try {
    const apps = await crawl(startAppIds, options);
    progressUi.update(94, 'HTML生成中...');
    const html = buildHTML(apps, options);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    popup.location.href = url;
    progressUi.close();
    setStatus(`ER図の生成完了: ${apps.length}アプリを別タブ表示しました`);
    setTimeout(() => URL.revokeObjectURL(url), 60 * 1000);
  } catch (e) {
    try { popup.close(); } catch (_) { /* noop */ }
    progressUi.error(e.message || String(e));
    throw e;
  }
}

export async function runExportERDiagramHtmlStandalone(opts, setStatus) {
  const appId = String(opts.appId || '').trim();
  if (!appId) throw new Error('アプリIDを入力してください');

  const startAppIds = [appId, ...(opts.extraAppIds || [])].filter((v, i, a) => /^\d+$/.test(v) && a.indexOf(v) === i);
  const options = {
    startAppId: appId,
    startAppIds,
    layoutName: opts.layoutName || ER_DEFAULTS.layoutName,
    fieldDensity: opts.fieldDensity || ER_DEFAULTS.fieldDensity,
    maxDepth: Number(opts.maxDepth) || 0,
    includeSubtableFields: opts.includeSubtableFields !== false,
    includeReverseLookup: !!opts.includeReverseLookup,
    maxFields: ER_DEFAULTS.maxFields,
    sleepMs: ER_DEFAULTS.sleepMs,
    source: { guestId: opts.guestId || '', preview: !!opts.preview }
  };

  setStatus(`ER図HTMLを生成中... 起点 ${startAppIds.join(',')}`);
  progressUi.init();
  progressUi.update(4, `開始: 起点 ${startAppIds.join(',')}`);

  try {
    const apps = await crawl(startAppIds, options);
    progressUi.update(94, 'HTML保存データ生成中...');
    const html = buildHTML(apps, options);
    const guestSuffix = opts.guestId ? `_guest${opts.guestId}` : '';
    const previewSuffix = opts.preview ? '_preview' : '_prod';
    downloadText(
      `kintone_erd_app${appId}${guestSuffix}${previewSuffix}_${nowStamp()}.html`,
      html,
      'text/html'
    );
    progressUi.close();
    setStatus(`ER図HTMLを保存しました (${apps.length}アプリ)`);
  } catch (e) {
    progressUi.error(e.message || String(e));
    throw e;
  }
}
