'use strict';

import { crawl, buildHTML, progressUi, ER_DEFAULTS, formatErLayoutLabel } from './er.js';
import { fetchAppsInSpace } from '../api.js';
import { downloadText, buildExportFilename, buildAppFilenameLabel } from '../utils.js';

/**
 * スペースID指定時、スペース内全アプリを起点に追加し、
 * options.spaceId / options.spaceAppIds をセットする（ER 描画のスペース表現用）。
 */
async function applySpaceToErOptions(opts: any, options: any, setStatus: (msg: string, err?: boolean) => void): Promise<void> {
  const spaceId = String(opts.spaceId || '').trim();
  if (!/^\d+$/.test(spaceId)) return;
  setStatus(`スペース ${spaceId} のアプリ一覧を取得中...`);
  const apps = await fetchAppsInSpace(spaceId, opts.guestId);
  const spaceIds = apps.map((a) => String(a.appId));
  options.spaceId = spaceId;
  options.spaceAppIds = spaceIds;
  options.startAppIds = [...options.startAppIds, ...spaceIds].filter(
    (v: string, i: number, a: string[]) => /^\d+$/.test(String(v)) && a.indexOf(v) === i
  );
}

/**
 * @param {object} opts
 * @param {string} opts.appId
 * @param {string[]} [opts.appIds]
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
  const spaceId = String(opts.spaceId || '').trim();
  if (!appId && !spaceId) throw new Error('アプリID または スペースID を入力してください');

  const primaryAppIds = Array.isArray(opts.appIds) && opts.appIds.length ? opts.appIds : [appId];
  const startAppIds = [...primaryAppIds, ...(opts.extraAppIds || [])].map((v) => String(v || '').trim()).filter((v, i, a) => /^\d+$/.test(v) && a.indexOf(v) === i);
  const options = {
    startAppId: startAppIds[0] || appId,
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
  await applySpaceToErOptions(opts, options, setStatus);
  if (!options.startAppIds.length) throw new Error('対象アプリが見つかりませんでした');

  const popup = window.open('', '_blank');
  if (!popup) throw new Error('別タブを開けませんでした。ポップアップブロックを確認してください');
  popup.document.write('<title>ER図</title><body style="font-family:sans-serif;padding:24px">ER図を生成中...</body>');

  setStatus(`ER図を生成中... 起点 ${options.startAppIds.join(',')}`);
  progressUi.init();
  progressUi.update(4, `開始: 起点 ${options.startAppIds.join(',')}`);

  try {
    const apps = await crawl(options.startAppIds, options);
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
  const spaceId = String(opts.spaceId || '').trim();
  if (!appId && !spaceId) throw new Error('アプリID または スペースID を入力してください');

  const primaryAppIds = Array.isArray(opts.appIds) && opts.appIds.length ? opts.appIds : [appId];
  const startAppIds = [...primaryAppIds, ...(opts.extraAppIds || [])].map((v) => String(v || '').trim()).filter((v, i, a) => /^\d+$/.test(v) && a.indexOf(v) === i);
  const options = {
    startAppId: startAppIds[0] || appId,
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
  await applySpaceToErOptions(opts, options, setStatus);
  if (!options.startAppIds.length) throw new Error('対象アプリが見つかりませんでした');

  setStatus(`ER図HTMLを生成中... 起点 ${options.startAppIds.join(',')}`);
  progressUi.init();
  progressUi.update(4, `開始: 起点 ${options.startAppIds.join(',')}`);

  try {
    const apps = await crawl(options.startAppIds, options);
    progressUi.update(94, 'HTML保存データ生成中...');
    const html = buildHTML(apps, options);
    const baseName = startAppIds[0] || appId || `space${spaceId}`;
    const suffix = `${opts.guestId ? `guest${opts.guestId}_` : ''}${opts.preview ? 'プレビュー' : '本番'}`;
    downloadText(
      buildExportFilename('ER図', 'html', { appLabel: buildAppFilenameLabel(baseName, ''), suffix }),
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
