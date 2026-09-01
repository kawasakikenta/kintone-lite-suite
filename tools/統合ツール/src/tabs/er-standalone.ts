'use strict';

import { crawl, buildHTML, progressUi, ER_DEFAULTS, formatErLayoutLabel } from './er.js';
import { fetchAppsInSpace } from '../api.js';
import { downloadText, buildExportFilename, buildAppFilenameLabel } from '../utils.js';

/**
 * スペースID指定時、スペース内アプリを起点に追加し、
 * options.spaceId / options.spaceAppIds をセットする（ER 描画のスペース表現用）。
 * - opts.spaceApps: UI 側で読み込み済みのアプリ一覧（渡されると再取得しない = APIリクエスト節約）
 * - opts.spaceSelectedAppIds: 配列を渡すと選択したアプリだけを起点に追加する（null/未指定なら全アプリ）
 */
async function applySpaceToErOptions(opts: any, options: any, setStatus: (msg: string, err?: boolean) => void): Promise<void> {
  const spaceId = String(opts.spaceId || '').trim();
  if (!/^\d+$/.test(spaceId)) return;
  let apps = Array.isArray(opts.spaceApps) ? opts.spaceApps : null;
  if (!apps) {
    setStatus(`スペース ${spaceId} のアプリ一覧を取得中...`);
    apps = await fetchAppsInSpace(spaceId, opts.guestId);
  }
  const spaceIds = apps.map((a: any) => String(a.appId));
  options.spaceId = spaceId;
  options.spaceAppIds = spaceIds;
  const spaceIdSet = new Set(spaceIds);
  const selected = Array.isArray(opts.spaceSelectedAppIds)
    ? opts.spaceSelectedAppIds.map((v: any) => String(v)).filter((v: string) => spaceIdSet.has(v))
    : null;
  const additions = selected ?? spaceIds;
  options.startAppIds = [...options.startAppIds, ...additions].filter(
    (v: string, i: number, a: string[]) => /^\d+$/.test(String(v)) && a.indexOf(v) === i
  );
}

/**
 * 入力値から crawl/buildHTML 用のオプションを組み立てる（生成・HTML保存で共通）。
 * 起点アプリ ID は数値のみ残し、重複を除いて順序を保つ。
 */
export function buildErCrawlOptions(opts: any) {
  const appId = String(opts?.appId || '').trim();
  const primaryAppIds = Array.isArray(opts?.appIds) && opts.appIds.length ? opts.appIds : [appId];
  const startAppIds = [...primaryAppIds, ...(opts?.extraAppIds || [])]
    .map((v) => String(v || '').trim())
    .filter((v, i, a) => /^\d+$/.test(v) && a.indexOf(v) === i);
  const maxDepthRaw = Number(opts?.maxDepth);
  return {
    startAppId: startAppIds[0] || appId,
    startAppIds,
    layoutName: opts?.layoutName || ER_DEFAULTS.layoutName,
    fieldDensity: opts?.fieldDensity || ER_DEFAULTS.fieldDensity,
    maxDepth: Number.isFinite(maxDepthRaw) && maxDepthRaw >= 0 ? Math.floor(maxDepthRaw) : 0,
    includeSubtableFields: opts?.includeSubtableFields !== false,
    includeReverseLookup: !!opts?.includeReverseLookup,
    maxFields: ER_DEFAULTS.maxFields,
    sleepMs: ER_DEFAULTS.sleepMs,
    source: { guestId: opts?.guestId || '', preview: !!opts?.preview }
  };
}

async function resolveErOptions(opts: any, setStatus: (msg: string, err?: boolean) => void) {
  const appId = String(opts.appId || '').trim();
  const spaceId = String(opts.spaceId || '').trim();
  if (!appId && !spaceId) throw new Error('アプリID または スペースID を入力してください');
  const options: any = buildErCrawlOptions(opts);
  await applySpaceToErOptions(opts, options, setStatus);
  if (!options.startAppIds.length) throw new Error('対象アプリが見つかりませんでした');
  return options;
}

function summarizeCrawl(apps: any[]) {
  const partialCount = apps.filter((app: any) => app?.status === 'partial').length;
  const failedCount = apps.filter((app: any) => app?.status === 'failed' || app?.ok === false).length;
  return { partialCount, failedCount, note: partialCount || failedCount ? `（一部取得 ${partialCount} / 取得失敗 ${failedCount}）` : '' };
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
  const options = await resolveErOptions(opts, setStatus);

  const popup = window.open('', '_blank');
  if (!popup) throw new Error('別タブを開けませんでした。ポップアップブロックを確認してください');
  try { popup.opener = null; } catch (_) { /* noop */ }
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
    const summary = summarizeCrawl(apps);
    setStatus(summary.note
      ? `ER図を生成しました: ${apps.length}アプリ${summary.note}`
      : `ER図の生成完了: ${apps.length}アプリを別タブ表示しました`, !!summary.failedCount);
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
  const options = await resolveErOptions(opts, setStatus);

  setStatus(`ER図HTMLを生成中... 起点 ${options.startAppIds.join(',')}`);
  progressUi.init();
  progressUi.update(4, `開始: 起点 ${options.startAppIds.join(',')}`);

  try {
    const apps = await crawl(options.startAppIds, options);
    progressUi.update(94, 'HTML保存データ生成中...');
    const html = buildHTML(apps, options);
    const baseName = options.startAppIds[0] || appId || `space${spaceId}`;
    const suffix = `${opts.guestId ? `guest${opts.guestId}_` : ''}${opts.preview ? 'プレビュー' : '本番'}`;
    downloadText(
      buildExportFilename('ER図', 'html', { appLabel: buildAppFilenameLabel(baseName, ''), suffix }),
      html,
      'text/html'
    );
    progressUi.close();
    const summary = summarizeCrawl(apps);
    setStatus(summary.note
      ? `ER図HTMLを保存しました: ${apps.length}アプリ${summary.note}`
      : `ER図HTMLを保存しました (${apps.length}アプリ)`, !!summary.failedCount);
  } catch (e) {
    progressUi.error(e.message || String(e));
    throw e;
  }
}
