'use strict';

import { crawl, buildHTML, assertErAnalysed, progressUi, ER_DEFAULTS, describeReverseScan, summarizeErStartIds } from './er.js';
import { fetchAppsInSpace } from '../api.js';
import { isCancelStop } from './run-cancel-summary.js';
import { downloadText, buildExportFilename, buildAppFilenameLabel, normalizeIdInputText } from '../utils.js';
import { analyzeErDependencies } from './er-analysis.js';
import {
  buildErMermaidSource,
  buildErMarkdownSpec,
  buildErRelationsCsv,
  buildErAppModelFromBundle
} from './er-model.js';
import { describeOfflineFetchedAt, listOfflineSpaceApps, type ErOfflineSource } from './er-offline.js';

export {
  buildErMermaidSource,
  buildErMarkdownSpec,
  buildErRelationsCsv,
  buildErAppModelFromBundle
};

/**
 * スペースID指定時、スペース内アプリを起点に追加し、
 * options.spaceId / options.spaceAppIds をセットする（ER 描画のスペース表現用）。
 * - opts.spaceApps: UI 側で読み込み済みのアプリ一覧（渡されると再取得しない = APIリクエスト節約）
 * - opts.spaceSelectedAppIds: 配列を渡すと選択したアプリだけを起点に追加する（null/未指定なら全アプリ）
 */
async function applySpaceToErOptions(opts: any, options: any, setStatus: (msg: string, err?: ErStatusTone) => void): Promise<void> {
  const spaceId = normalizeIdInputText(opts.spaceId).trim();
  if (!/^\d+$/.test(spaceId)) return;
  let apps = Array.isArray(opts.spaceApps) ? opts.spaceApps : null;
  if (!apps) {
    setStatus(`スペース ${spaceId} のアプリ一覧を取得中...`);
    apps = await fetchAppsInSpace(spaceId, options.source?.guestId || '');
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

function splitErAppIds(value: unknown): string[] {
  // 全角数字・全角カンマ（１０１，１０２）も受け付ける
  return normalizeIdInputText(value || '')
    .split(/[\s,、，]+/)
    .map((v) => v.trim())
    .filter(Boolean);
}

function erAppIdValues(opts: any, key: 'appIds' | 'extraAppIds', fallback = ''): string[] {
  const value = opts?.[key];
  if (Array.isArray(value)) {
    if (!value.length && fallback) return splitErAppIds(fallback);
    return value.flatMap((v) => splitErAppIds(v));
  }
  return splitErAppIds(value ?? fallback);
}

/** Number へ変換しても同じ ID を指せる正の整数だけを起点アプリ ID として受け付ける。 */
function isUsableErAppId(value: string): boolean {
  return /^\d+$/.test(value) && Number.isSafeInteger(Number(value)) && Number(value) > 0;
}

/** ER図の取得前に、入力の誤りを対象欄ごとに明示する。 */
export function validateErOptions(opts: any): string {
  const appId = normalizeIdInputText(opts?.appId || '').trim();
  const primaryIds = erAppIdValues(opts, 'appIds', appId);
  const extraIds = erAppIdValues(opts, 'extraAppIds');
  const invalidAppId = [...primaryIds, ...extraIds].find((v) => !/^\d+$/.test(v));
  if (invalidAppId) return `アプリIDは数値で入力してください: ${invalidAppId}`;
  const unusableAppId = [...primaryIds, ...extraIds].find((v) => !isUsableErAppId(v));
  if (unusableAppId) return `アプリIDは1以上${Number.MAX_SAFE_INTEGER}以下の整数で入力してください: ${unusableAppId}`;

  const guestId = normalizeIdInputText(opts?.guestId || '').trim();
  if (guestId && !/^\d+$/.test(guestId)) return `ゲストスペースIDは半角数字で入力してください: ${guestId}`;
  const spaceId = normalizeIdInputText(opts?.spaceId || '').trim();
  if (spaceId && !/^\d+$/.test(spaceId)) return `スペースIDは数値で入力してください: ${spaceId}`;

  const depthText = String(opts?.maxDepth ?? '').trim();
  if (depthText) {
    const depth = Number(depthText);
    if (!Number.isFinite(depth) || depth < 0 || !Number.isInteger(depth)) return '探索深さは0以上の整数で入力してください';
  }
  if (!primaryIds.length && !spaceId) return 'アプリID または スペースID を入力してください';
  // スペース指定で選択アプリが0件でも、起点アプリID（appId / appIds / extraAppIds）があれば起点は作れる
  if (spaceId && !primaryIds.length && !extraIds.length && Array.isArray(opts?.spaceSelectedAppIds) && !opts.spaceSelectedAppIds.length) {
    return '起点にするスペース内アプリを1件以上選択するか、起点アプリIDを入力してください。';
  }
  return '';
}

/**
 * 入力値から crawl/buildHTML 用のオプションを組み立てる（生成・HTML保存で共通）。
 * 起点アプリ ID は数値のみ残し、重複を除いて順序を保つ。
 */
export function buildErCrawlOptions(opts: any) {
  const appId = normalizeIdInputText(opts?.appId || '').trim();
  const primaryAppIds = erAppIdValues(opts, 'appIds', appId);
  const startAppIds = [...primaryAppIds, ...erAppIdValues(opts, 'extraAppIds')]
    .map((v) => String(v || '').trim())
    .filter(isUsableErAppId)
    // "007" と "7" は同じアプリ。図内の起点判定（アプリID文字列との一致）が崩れないよう正規化する
    .map((v) => String(Number(v)))
    .filter((v, i, a) => a.indexOf(v) === i);
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
    source: { guestId: normalizeIdInputText(opts?.guestId || '').trim(), preview: !!opts?.preview }
  };
}

async function resolveErOptions(opts: any, setStatus: (msg: string, err?: ErStatusTone) => void) {
  const validationError = validateErOptions(opts);
  if (validationError) throw new Error(validationError);
  const appId = normalizeIdInputText(opts.appId || '').trim();
  const spaceId = normalizeIdInputText(opts.spaceId || '').trim();
  const options: any = buildErCrawlOptions(opts);
  const offline: ErOfflineSource | null = opts?.offlineSource || null;
  if (offline) {
    // 設定JSONから作る: 接続先・環境は読み込んだ設定のとおりにし、スペースのアプリも読み込んだ設定（アプリ情報のスペースID）から探す
    options.offlineSource = offline;
    options.source = { guestId: offline.guestId, preview: offline.preview };
    await applySpaceToErOptions(spaceId ? { ...opts, spaceApps: listOfflineSpaceApps(offline, spaceId) } : opts, options, setStatus);
  } else {
    await applySpaceToErOptions(opts, options, setStatus);
  }
  if (!options.startAppIds.length) throw new Error(offline ? '起点にするアプリがありません。起点アプリIDか、読み込んだ設定にあるスペースIDを入れてください' : '対象アプリが見つかりませんでした');
  if (offline) {
    const missing = options.startAppIds.filter((id: string) => !offline.bundles.has(Number(id)));
    if (missing.length) {
      throw new Error(`起点アプリ ${missing.slice(0, 5).join(', ')}${missing.length > 5 ? ` ほか ${missing.length - 5} 件` : ''} は、読み込んだ設定JSONにありません。起点アプリIDを確かめるか、そのアプリを含む設定JSONを読み込んでください`);
    }
  }
  return options;
}

/** 保存するファイル名の末尾（ゲストスペースID・取得環境）。ゲストスペースIDは半角に直した値（options.source）を使う。 */
function erFilenameSuffix(opts: any, options: any): string {
  const guestId = options?.source?.guestId || '';
  // 設定JSONから作るときは、取得環境も読み込んだ設定のとおりにする
  const preview = options?.offlineSource ? !!options.source?.preview : !!opts?.preview;
  return `${guestId ? `guest${guestId}_` : ''}${preview ? 'プレビュー' : '本番'}`;
}

/** 完了の表示に添える取得元（設定JSONから作ったときだけ）。 */
function offlineNote(options: any): string {
  const offline: ErOfflineSource | null = options?.offlineSource || null;
  return offline ? `。設定JSON${offline.fileName ? `「${offline.fileName}」` : ''}から作成（kintone には問い合わせていません）` : '';
}

/** 状態表示の種類。true は取得失敗あり、'warn' は部分成功（図は生成済み）。 */
export type ErStatusTone = boolean | 'warn';

const isFailedErApp = (app: any): boolean => app?.status === 'failed' || app?.ok === false;

export function summarizeCrawl(apps: any[], options?: any) {
  const partialCount = apps.filter((app: any) => app?.status === 'partial').length;
  const failedCount = apps.filter(isFailedErApp).length;
  // 1 アプリも解析できていなければ図として成立しない（呼び出し側が保存・表示せず失敗にする）
  const analyzedCount = apps.length - failedCount;
  const reverseNote = describeReverseScan(options);
  const appNote = partialCount || failedCount ? `（一部取得 ${partialCount} / 取得失敗 ${failedCount}）` : '';
  // 一部のアプリだけ失敗した場合は、図は出せているので警告として知らせる
  const tone: ErStatusTone = !analyzedCount && failedCount ? true : (failedCount || partialCount || reverseNote ? 'warn' : false);
  return { partialCount, failedCount, analyzedCount, note: `${appNote}${reverseNote ? `。${reverseNote}` : ''}`, tone };
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
 * @param {(msg: string, err?: boolean | 'warn') => void} setStatus
 */
export async function runGenerateERDiagramStandalone(opts, setStatus) {
  const validationError = validateErOptions(opts);
  if (validationError) throw new Error(validationError);

  // ポップアップは利用者の操作直後でないとブロックされるため、スペース内アプリ取得などの通信を待つ前に開く
  const popup = window.open('', '_blank');
  if (!popup) throw new Error('別タブを開けませんでした。ポップアップブロックを確認してください');
  try { popup.opener = null; } catch (_) { /* noop */ }
  popup.document.write('<title>ER図</title><body style="font-family:sans-serif;padding:24px">ER図を生成中...</body>');

  let options;
  try {
    options = await resolveErOptions(opts, setStatus);
  } catch (e) {
    try { popup.close(); } catch (_) { /* noop */ }
    throw e;
  }

  // 全アプリを起点にしたときに状態表示へ数千の ID が並ばないよう、先頭の数件と件数で示す
  setStatus(`ER図を生成中... 起点 ${summarizeErStartIds(options.startAppIds)}`);
  progressUi.init();
  progressUi.update(4, `開始: 起点 ${summarizeErStartIds(options.startAppIds)}`);

  try {
    const apps = await crawl(options.startAppIds, options);
    assertErAnalysed(apps, options);
    progressUi.update(94, 'HTML生成中...');
    const html = buildHTML(apps, options);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    popup.location.href = url;
    progressUi.close();
    const summary = summarizeCrawl(apps, options);
    setStatus(summary.note
      ? `ER図を生成しました: ${apps.length}アプリ${summary.note}${offlineNote(options)}`
      : `ER図の生成完了: ${apps.length}アプリを別タブ表示しました${offlineNote(options)}`, summary.tone);
    setTimeout(() => URL.revokeObjectURL(url), 60 * 1000);
  } catch (e) {
    try { popup.close(); } catch (_) { /* noop */ }
    // 中止はエラー表示にせず、進捗表示を閉じる（件数つきの説明はパネルのステータスとログに出る）
    if (isCancelStop(e)) progressUi.dismiss(); else progressUi.error(e.message || String(e));
    throw e;
  }
}

export async function runExportERDiagramHtmlStandalone(opts, setStatus) {
  const appId = normalizeIdInputText(opts.appId || '').trim();
  const spaceId = normalizeIdInputText(opts.spaceId || '').trim();
  const options = await resolveErOptions(opts, setStatus);

  setStatus(`ER図HTMLを生成中... 起点 ${summarizeErStartIds(options.startAppIds)}`);
  progressUi.init();
  progressUi.update(4, `開始: 起点 ${summarizeErStartIds(options.startAppIds)}`);

  try {
    const apps = await crawl(options.startAppIds, options);
    assertErAnalysed(apps, options);
    progressUi.update(94, 'HTML保存データ生成中...');
    const html = buildHTML(apps, options);
    const baseName = options.startAppIds[0] || appId || `space${spaceId}`;
    const suffix = erFilenameSuffix(opts, options);
    if (opts?.download !== false) downloadText(
      buildExportFilename('ER図', 'html', { appLabel: buildAppFilenameLabel(baseName, ''), suffix }),
      html,
      'text/html'
    );
    progressUi.close();
    const summary = summarizeCrawl(apps, options);
    setStatus(summary.note
      ? `ER図HTMLを保存しました: ${apps.length}アプリ${summary.note}${offlineNote(options)}`
      : `ER図HTMLを保存しました (${apps.length}アプリ)${offlineNote(options)}`, summary.tone);
  } catch (e) {
    // 中止はエラー表示にせず、進捗表示を閉じる（件数つきの説明はパネルのステータスとログに出る）
    if (isCancelStop(e)) progressUi.dismiss(); else progressUi.error(e.message || String(e));
    throw e;
  }
}


function extractImportedBundlesList(raw: any): any[] | null {
  if (!raw) return null;
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'object') {
    if (Array.isArray(raw.apps)) return raw.apps;
    if (Array.isArray(raw.bundles)) return raw.bundles;
    if (raw.sections || raw.appId != null || raw.id != null) return [raw];
  }
  return null;
}

async function resolveErAppsForExport(
  opts: any,
  setStatus: (msg: string, err?: ErStatusTone) => void,
  label: string
): Promise<{ apps: any[]; options: any; fromBundles: boolean }> {
  const bundleList = extractImportedBundlesList(opts?.importedBundles ?? opts?.bundles);
  if (bundleList && bundleList.length > 0) {
    setStatus(`設定JSONから${label}を生成中...`);
    const apps = bundleList.map((b) => buildErAppModelFromBundle(b));
    const options: any = buildErCrawlOptions(opts || {});
    if (!options.startAppIds.length) {
      options.startAppIds = apps.map((a) => String(a.id));
      options.startAppId = options.startAppIds[0] || '';
    }
    assertErAnalysed(apps, options);
    return { apps, options, fromBundles: true };
  }

  const options = await resolveErOptions(opts, setStatus);
  setStatus(`${label}を生成中... 起点 ${summarizeErStartIds(options.startAppIds)}`);
  progressUi.init();
  progressUi.update(4, `開始: 起点 ${summarizeErStartIds(options.startAppIds)}`);
  const apps = await crawl(options.startAppIds, options);
  assertErAnalysed(apps, options);
  return { apps, options, fromBundles: false };
}

export async function runExportERMarkdownStandalone(
  opts: any,
  setStatus: (msg: string, err?: ErStatusTone) => void = () => {}
) {
  const appId = normalizeIdInputText(opts?.appId || '').trim();
  const spaceId = normalizeIdInputText(opts?.spaceId || '').trim();
  let usedProgress = false;
  try {
    const { apps, options, fromBundles } = await resolveErAppsForExport(opts, setStatus, 'ER図仕様書');
    usedProgress = !fromBundles;
    if (usedProgress) progressUi.update(94, 'Markdown仕様書データ生成中...');
    const analysis = analyzeErDependencies(apps);
    const offline: ErOfflineSource | null = options.offlineSource || null;
    const markdown = buildErMarkdownSpec(apps, analysis, {
      generatedAt: opts?.generatedAt,
      ...(offline ? { sourceNote: `設定JSON${offline.fileName ? `「${offline.fileName}」` : ''}から作成（${describeOfflineFetchedAt(offline, (d) => d.toLocaleString('ja-JP'))} 取得。kintone には問い合わせていません）` } : {})
    });
    const baseName = options.startAppIds[0] || appId || (spaceId ? `space${spaceId}` : String(apps[0]?.id || 'er'));
    const suffix = erFilenameSuffix(opts, options);
    if (opts?.download !== false) downloadText(
      buildExportFilename('ER図仕様書', 'md', { appLabel: buildAppFilenameLabel(baseName, ''), suffix }),
      markdown,
      'text/markdown;charset=utf-8'
    );
    if (usedProgress) progressUi.close();
    const summary = summarizeCrawl(apps, options);
    setStatus(summary.note
      ? `ER図仕様書を保存しました: ${apps.length}アプリ${summary.note}${offlineNote(options)}`
      : `ER図仕様書を保存しました (${apps.length}アプリ)${offlineNote(options)}`, summary.tone);
    return { apps, analysis, markdown };
  } catch (e: any) {
    if (usedProgress) {
      if (isCancelStop(e)) progressUi.dismiss(); else progressUi.error(e?.message || String(e));
    }
    throw e;
  }
}

export async function runExportERMermaidStandalone(
  opts: any,
  setStatus: (msg: string, err?: ErStatusTone) => void = () => {}
) {
  const appId = normalizeIdInputText(opts?.appId || '').trim();
  const spaceId = normalizeIdInputText(opts?.spaceId || '').trim();
  let usedProgress = false;
  try {
    const { apps, options, fromBundles } = await resolveErAppsForExport(opts, setStatus, 'ER図Mermaid');
    usedProgress = !fromBundles;
    if (usedProgress) progressUi.update(94, 'Mermaidデータ生成中...');
    const mermaid = buildErMermaidSource(apps, { showAllFields: opts?.showAllFields });
    const baseName = options.startAppIds[0] || appId || (spaceId ? `space${spaceId}` : String(apps[0]?.id || 'er'));
    const suffix = erFilenameSuffix(opts, options);
    if (opts?.download !== false) downloadText(
      buildExportFilename('ER図', 'mmd', { appLabel: buildAppFilenameLabel(baseName, ''), suffix }),
      mermaid,
      'text/plain;charset=utf-8'
    );
    if (usedProgress) progressUi.close();
    const summary = summarizeCrawl(apps, options);
    setStatus(summary.note
      ? `ER図Mermaidを保存しました: ${apps.length}アプリ${summary.note}${offlineNote(options)}`
      : `ER図Mermaidを保存しました (${apps.length}アプリ)${offlineNote(options)}`, summary.tone);
    return { apps, mermaid };
  } catch (e: any) {
    if (usedProgress) {
      if (isCancelStop(e)) progressUi.dismiss(); else progressUi.error(e?.message || String(e));
    }
    throw e;
  }
}

export async function runExportERRelationsCsvStandalone(
  opts: any,
  setStatus: (msg: string, err?: ErStatusTone) => void = () => {}
) {
  const appId = normalizeIdInputText(opts?.appId || '').trim();
  const spaceId = normalizeIdInputText(opts?.spaceId || '').trim();
  let usedProgress = false;
  try {
    const { apps, options, fromBundles } = await resolveErAppsForExport(opts, setStatus, 'ER図リレーション一覧CSV');
    usedProgress = !fromBundles;
    if (usedProgress) progressUi.update(94, 'CSVデータ生成中...');
    const csv = buildErRelationsCsv(apps);
    const baseName = options.startAppIds[0] || appId || (spaceId ? `space${spaceId}` : String(apps[0]?.id || 'er'));
    const suffix = erFilenameSuffix(opts, options);
    if (opts?.download !== false) downloadText(
      buildExportFilename('ER図_リレーション一覧', 'csv', { appLabel: buildAppFilenameLabel(baseName, ''), suffix }),
      csv,
      'text/csv;charset=utf-8'
    );
    if (usedProgress) progressUi.close();
    const summary = summarizeCrawl(apps, options);
    setStatus(summary.note
      ? `ER図リレーション一覧CSVを保存しました: ${apps.length}アプリ${summary.note}${offlineNote(options)}`
      : `ER図リレーション一覧CSVを保存しました (${apps.length}アプリ)${offlineNote(options)}`, summary.tone);
    return { apps, csv };
  } catch (e: any) {
    if (usedProgress) {
      if (isCancelStop(e)) progressUi.dismiss(); else progressUi.error(e?.message || String(e));
    }
    throw e;
  }
}
