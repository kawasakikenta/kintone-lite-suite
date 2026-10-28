'use strict';

import { SECTION_DEFS } from '../constants.js';
import { esc, downloadText, downloadBlob, selectedScopeKeys, buildExportFilename, buildAppFilenameLabel, extractAppNameFromBundle } from '../utils.js';
import { fetchBundle, buildApiPrefix, apiGet, fetchAppsInSpace } from '../api.js';
import { extractAppIdFromInput, extractGuestIdFromInput } from '../handlers/diffFocus.js';
import { loadJSZipLite } from '../jszipLoader.js';
import { RUN_CANCELLED_MESSAGE, isRunCancelledError } from '../runControl.js';
import { createCancelReport, formatCancelledHeadline, isCancelStop } from './run-cancel-summary.js';

/** apps.json の 1 回あたり取得上限。検索結果がこの件数に達したら絞り込みを促す。 */
const APP_SEARCH_LIMIT = 100;

/** 設定一括取得のファイル名ラベル。1アプリならアプリ名(appID)、複数なら「N件」。 */
function settingsExportLabel(bundles: any[]): string {
  if (bundles.length === 1) return buildAppFilenameLabel(bundles[0].appId, bundleAppName(bundles[0]));
  return `${bundles.length}件`;
}

/** アプリ設定を取得しない（または失敗した）場合は、アプリ情報セクションのアプリ名で補う。 */
function bundleAppName(bundle: any): string {
  return extractAppNameFromBundle(bundle) || String(bundle?.sections?.appInfo?.name || '').trim();
}

function sectionLabel(key: string): string {
  return SECTION_DEFS.find((s) => s.key === key)?.label || key;
}

/** 失敗理由の先頭行（API コンテキスト行を除く）を、結果表に収まる長さで返す。 */
function firstErrorLine(error: unknown): string {
  const text = String((error as any)?.message || error || '');
  const line = text.split('\n').map((s) => s.trim()).find(Boolean) || '理由不明';
  return line.length > 80 ? `${line.slice(0, 80)}…` : line;
}

/** JS/CSS 設定で、本文を取得せず fileKey のみ記録したファイル数（サイズ上限・非テキスト等）。 */
function omittedCustomizeBodyCount(bundle: any): number {
  const files = bundle?.sections?.customizeSettings?._partial?.files;
  return Array.isArray(files) ? files.length : 0;
}

function parseAppIdList(text) {
  const tokens = String(text || '')
    .split(/[\s,、]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const out = [];
  const seen = new Set();
  for (const tk of tokens) {
    if (!/^\d+$/.test(tk)) throw new Error(`アプリIDは半角数字で入力してください: ${tk}`);
    if (seen.has(tk)) continue;
    seen.add(tk);
    out.push(tk);
  }
  return out;
}

export interface SettingsExportRowSummary {
  appId: string;
  appName?: string;
  guestId?: string;
  okCount: number;
  ngCount: number;
  note?: string;
}

export function renderSettingsExportSummaryHtml(rows: SettingsExportRowSummary[], scopes: string[]) {
  const labels = scopes.map((k) => SECTION_DEFS.find((s) => s.key === k)?.label || k).join(', ');
  const body = rows
    .map(
      (r) => `<tr>
    <td>${esc(r.appId)}</td>
    <td>${esc(r.appName || '-')}</td>
    <td>${esc(r.guestId ? `guest:${r.guestId}` : '通常')}</td>
    <td>${esc(String(r.okCount))}</td>
    <td>${esc(String(r.ngCount))}</td>
    <td style="overflow-wrap:anywhere">${esc(r.note || '-')}</td>
  </tr>`
    )
    .join('');
  return `
    <div style="padding:8px 10px;border-bottom:1px solid #e2e8f0;font-size:11px;background:#f8fafc">対象セクション: ${esc(labels || '-')}</div>
    <table style="width:100%;font-size:11px;border-collapse:collapse">
      <thead><tr><th scope="col" style="text-align:left;padding:4px">アプリID</th><th scope="col">アプリ名</th><th scope="col">ゲスト</th><th scope="col">取得OK</th><th scope="col">取得NG</th><th scope="col">メモ</th></tr></thead>
      <tbody>${body || '<tr><td colspan="6">結果なし</td></tr>'}</tbody>
    </table>
  `;
}

export function renderSettingsExportSearchResultsHtml(apps) {
  const list = Array.isArray(apps) ? apps : [];
  if (!list.length) {
    return '<div style="padding:10px;font-size:12px;color:#64748b">検索結果なし</div>';
  }
  const rows = list
    .map(
      (app) => `<tr>
    <td>${esc(String(app.appId || ''))}</td>
    <td title="${esc(String(app.name || ''))}">${esc(String(app.name || ''))}</td>
    <td style="text-align:right"><button type="button" class="kus-se-add" data-app="${esc(String(app.appId || ''))}" data-name="${esc(String(app.name || ''))}" style="padding:4px 8px;font-size:10px;border:1px solid #e2e8f0;border-radius:4px;background:#f8fafc;cursor:pointer">追加</button></td>
  </tr>`
    )
    .join('');
  return `<table style="width:100%;font-size:11px;border-collapse:collapse">
    <thead><tr><th style="width:90px">アプリID</th><th>アプリ名</th><th style="width:70px"></th></tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

export async function runSettingsExportSearchStandalone(keyword: any, guestId: any, setStatus: (msg: string, isError?: boolean) => void) {
  const kw = String(keyword || '').trim();
  const guest = String(guestId || '').trim() || extractGuestIdFromInput(kw);
  const prefix = buildApiPrefix(guest, false);
  const directAppId = extractAppIdFromInput(kw);
  if (directAppId) {
    setStatus('アプリIDを確認中...');
    let name = '';
    try {
      const info = await apiGet(prefix, '/app.json', { id: directAppId });
      name = String(info?.name || '').trim();
    } catch {
      name = 'ID指定（名称未取得）';
    }
    setStatus(`アプリID ${directAppId}${guest ? ` / ゲスト ${guest}` : ''} を候補に表示しました`);
    return [{ appId: directAppId, name: name || 'ID指定' }];
  }
  const params: Record<string, any> = { limit: APP_SEARCH_LIMIT };
  if (kw) params.name = kw;
  setStatus('アプリ検索中...');
  const res = await apiGet(prefix, '/apps.json', params);
  const rawCount = Array.isArray(res.apps) ? res.apps.length : 0;
  const apps = (res.apps || [])
    .map((a: any) => ({ appId: String(a.appId || ''), name: String(a.name || '') }))
    .filter((a: { appId: string }) => /^\d+$/.test(a.appId))
    .sort((a: { appId: string }, b: { appId: string }) => Number(a.appId) - Number(b.appId));
  if (rawCount >= APP_SEARCH_LIMIT) {
    setStatus(`アプリ検索完了: 先頭 ${apps.length}件のみ表示（上限 ${APP_SEARCH_LIMIT}件）。目的のアプリが無い場合はキーワードで絞り込むかアプリIDを直接入力してください`, true);
    return apps;
  }
  setStatus(`アプリ検索完了: ${apps.length}件`);
  return apps;
}

/**
 * スペース内の全アプリを、表形式 UI に行として追加できる形で返す。
 */
export async function runSettingsExportListSpaceAppsStandalone(
  spaceId: any,
  guestId: any,
  setStatus: (msg: string, isError?: boolean) => void
): Promise<Array<{ appId: string; name: string }>> {
  const sid = String(spaceId || '').trim();
  if (!/^\d+$/.test(sid)) throw new Error('スペースIDは半角数字で入力してください');
  const guest = String(guestId || '').trim();
  if (guest && !/^\d+$/.test(guest)) throw new Error(`ゲストスペースIDは半角数字で入力してください: ${guest}`);
  setStatus(`スペース ${sid} のアプリ一覧を取得中...`);
  const apps = await fetchAppsInSpace(sid, guestId);
  if (!apps.length) {
    setStatus(`スペース ${sid} に取得対象アプリがありませんでした`, true);
    return [];
  }
  setStatus(`スペース ${sid} のアプリ ${apps.length}件を取得しました`);
  return apps.map((a) => ({ appId: a.appId, name: a.name || '' }));
}

/**
 * 対象アプリ（appId + アプリごとのゲストスペース）のリストを正規化する。
 * - opts.apps（[{appId, guestId}]）があればそれを優先（アプリごとに別ゲスト対応）
 * - 旧来の opts.appIdsText + opts.guestId（全アプリ共通ゲスト）も受け付ける
 */
function resolveExportTargets(opts: any): Array<{ appId: string; guestId: string }> {
  const out: Array<{ appId: string; guestId: string }> = [];
  const seen = new Set<string>();
  const push = (appId: string, guestId: string) => {
    const id = String(appId || '').trim();
    if (!id) return;
    if (!/^\d+$/.test(id)) throw new Error(`アプリIDは半角数字で入力してください: ${id}`);
    const g = String(guestId || '').trim();
    if (g && !/^\d+$/.test(g)) throw new Error(`ゲストスペースIDは半角数字で入力してください: ${g}`);
    const key = `${id}::${g}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ appId: id, guestId: g });
  };
  if (Array.isArray(opts.apps)) {
    for (const a of opts.apps) push(a?.appId, a?.guestId);
  } else {
    const guestId = String(opts.guestId || '').trim();
    for (const id of parseAppIdList(opts.appIdsText)) push(id, guestId);
  }
  return out;
}

/**
 * アプリ単位の取得が開始できなかった場合も、選択したセクションを
 * すべて取得失敗として記録して一括出力を継続する。
 * fetchBundle は通常セクション単位で失敗を返すが、通信層や拡張実装が
 * アプリ単位で reject する場合に成功した他アプリまで巻き込まないための形。
 */
function makeFailedBundle(
  appId: string,
  guestId: string,
  preview: boolean,
  scopes: string[],
  error: unknown
) {
  const message = error instanceof Error ? error.message : String(error || '設定取得に失敗しました');
  return {
    appId,
    guestId,
    preview,
    fetchedAt: new Date().toISOString(),
    meta: { sectionRevisions: {} },
    sections: Object.fromEntries(scopes.map((key) => [key, { _fetchError: message }]))
  };
}

/** セクションの取得エラーが、利用者の中止によるものか（fetchBundle が中止をセクション単位のエラーとして返す場合）。 */
function isCancelledSectionError(value: unknown): boolean {
  if (!value) return false;
  if (typeof value === 'string') return value.includes(RUN_CANCELLED_MESSAGE);
  return isRunCancelledError(value) || String((value as any).message || '').includes(RUN_CANCELLED_MESSAGE);
}

export async function runSettingsExportStandalone(mode: string, opts: any, setStatus: (msg: string, isError?: boolean) => void) {
  if (!['json', 'zip'].includes(mode)) throw new Error('保存形式は json または zip を指定してください');
  const targets = resolveExportTargets(opts);
  if (!targets.length) throw new Error('対象アプリIDを1件以上入力してください');
  const scopes = selectedScopeKeys(opts.scopeRoot);
  if (!scopes.length) throw new Error('取得対象セクションを選択してください');

  const preview = !!opts.preview;

  // ZIP は全アプリの取得後に生成する。JSZip を読み込めない環境（CSP・ネットワーク制限）では、
  // 時間のかかる取得を始める前に中止して、取得結果を無駄にしない。
  const JSZipCtor = mode === 'zip' ? await loadJSZipLite() : null;

  const bundles = [];
  const rows = [];
  /** 中止で止めたアプリの位置。-1 は最後まで実行した。 */
  let stoppedAt = -1;
  for (let i = 0; i < targets.length; i++) {
    const { appId, guestId } = targets[i];
    const guestNote = guestId ? ` (guest:${guestId})` : '';
    setStatus(`設定取得中 ${i + 1}/${targets.length}: アプリ ${appId}${guestNote}`);
    let bundle;
    try {
      bundle = await fetchBundle({
        appId,
        guestId,
        preview,
        sections: scopes,
        onProgress: (p, l) =>
          setStatus(`設定取得中 ${i + 1}/${targets.length}: アプリ ${appId}${guestNote} ${Math.round(p * 100)}% (${l})`)
      });
    } catch (error) {
      // 中止を「このアプリの取得失敗」にして残りのアプリを取り続けない。
      if (isCancelStop(error)) { stoppedAt = i; break; }
      bundle = makeFailedBundle(appId, guestId, preview, scopes, error);
      const message = error instanceof Error ? error.message : String(error || '設定取得に失敗しました');
      setStatus(`アプリ ${appId}${guestNote} の設定取得に失敗しました。選択したセクションを取得失敗として出力します: ${message}`, true);
    }
    // 取得途中で中止された bundle は、取得失敗のセクションが混じった完全でない結果なので保存しない。
    if (scopes.some((key) => isCancelledSectionError(bundle?.sections?.[key]?._fetchError))) { stoppedAt = i; break; }
    // ゲストスペース情報を bundle にも残しておく（ファイル名・突合用）
    if (guestId && !(bundle as any).guestId) (bundle as any).guestId = guestId;
    bundles.push(bundle);

    let okCount = 0;
    let ngCount = 0;
    const failedKeys: string[] = [];
    for (const key of scopes) {
      const sec = bundle.sections[key];
      if (sec && sec._fetchError) { ngCount += 1; failedKeys.push(key); }
      else okCount += 1;
    }
    const omittedBodies = omittedCustomizeBodyCount(bundle);
    const noteParts: string[] = [];
    if (ngCount === scopes.length) {
      noteParts.push(`アプリ取得失敗: ${firstErrorLine(bundle.sections[failedKeys[0]]._fetchError)}`);
    } else if (ngCount) {
      noteParts.push(`一部セクション取得失敗あり: ${failedKeys.map(sectionLabel).join('、')}`);
    }
    if (omittedBodies) noteParts.push(`JS/CSS本文を省略したファイル ${omittedBodies}件`);
    rows.push({
      appId,
      appName: extractAppNameFromBundle(bundle) || '',
      guestId,
      okCount,
      ngCount,
      omittedBodies,
      note: noteParts.join(' / ') || 'OK'
    });
  }

  const notRun = stoppedAt >= 0 ? targets.slice(stoppedAt) : [];
  const notRunLabels = notRun.map((t) => `アプリ ${t.appId}${t.guestId ? ` (guest:${t.guestId})` : ''}`);
  if (stoppedAt >= 0 && !bundles.length) {
    throw createCancelReport(0, targets.length, [`未実行（中止）: ${notRunLabels.join(', ')}`, '何も保存していません']);
  }
  for (const t of notRun) {
    rows.push({ appId: t.appId, appName: '', guestId: t.guestId, okCount: 0, ngCount: 0, omittedBodies: 0, note: '未実行（中止）' });
  }
  const cancelNote = notRun.length ? `${formatCancelledHeadline(stoppedAt, targets.length)}。取得済みの ${bundles.length}アプリだけを保存しました。` : '';
  const guestIds = [...new Set(targets.map((t) => t.guestId).filter(Boolean))];
  const scopeLabels = scopes.map((k) => SECTION_DEFS.find((s) => s.key === k)?.label || k);
  const failedAppCount = rows.filter((row) => row.ngCount > 0).length;
  const payload = {
    generatedAt: new Date().toISOString(),
    guestIds,
    targets,
    preview,
    scopes,
    scopeLabels,
    appCount: bundles.length,
    failedAppCount,
    ...(notRun.length ? { cancelled: true, notExecuted: notRun } : {}),
    apps: bundles
  };

  const failedSections = rows.reduce((sum, row) => sum + row.ngCount, 0);
  const failureNote = failedSections ? `。${failedAppCount}アプリ・${failedSections}セクションの取得に失敗しています。結果表を確認して再取得してください` : '';
  const omittedBodies = rows.reduce((sum, row) => sum + row.omittedBodies, 0);
  const omittedNote = omittedBodies ? `。JS/CSSファイル ${omittedBodies}件は本文を取得できず fileKey のみ記録しています（結果表を確認してください）` : '';
  const hasWarning = failedSections > 0 || omittedBodies > 0 || notRun.length > 0;

  if (mode === 'zip') {
    const zip = new JSZipCtor();
    const entries = bundles.map((bundle, i) => {
      const guestId = targets[i].guestId;
      const suffix = `${guestId ? `_ゲスト${guestId}` : ''}${preview ? '_プレビュー' : '_本番'}`;
      const file = `${buildAppFilenameLabel(bundle.appId, bundleAppName(bundle))}${suffix}.json`;
      const failedSections = scopes.filter((key) => bundle.sections?.[key]?._fetchError);
      return {
        appId: String(bundle.appId),
        appName: bundleAppName(bundle),
        guestId,
        file,
        fetchedAt: bundle.fetchedAt || '',
        sections: { ok: rows[i].okCount, ng: rows[i].ngCount },
        failedSections: failedSections.map((key) => ({
          key,
          label: SECTION_DEFS.find((s) => s.key === key)?.label || key,
          error: String(bundle.sections[key]._fetchError?.message || bundle.sections[key]._fetchError || '')
        }))
      };
    });
    zip.file(
      'manifest.json',
      JSON.stringify(
        {
          generatedAt: payload.generatedAt,
          environment: preview ? 'preview' : 'production',
          guestIds,
          targets,
          preview: payload.preview,
          scopes: payload.scopes,
          scopeLabels,
          appCount: bundles.length,
          failedAppCount: entries.filter((entry) => entry.sections.ng > 0).length,
          ...(notRun.length ? { cancelled: true, notExecuted: notRun } : {}),
          apps: entries
        },
        null,
        2
      )
    );
    for (let i = 0; i < bundles.length; i++) {
      zip.file(entries[i].file, JSON.stringify(bundles[i], null, 2));
    }
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    downloadBlob(buildExportFilename('設定一括取得', 'zip', { appLabel: settingsExportLabel(bundles) }), zipBlob);
    setStatus(`${cancelNote}設定一括取得ZIPを保存しました（${bundles.length}アプリ）${failureNote}${omittedNote}`, hasWarning);
    return { summaryHtml: renderSettingsExportSummaryHtml(rows, scopes) };
  }

  downloadText(buildExportFilename('設定一括取得', 'json', { appLabel: settingsExportLabel(bundles) }), JSON.stringify(payload, null, 2), 'application/json');
  setStatus(`${cancelNote}設定一括取得JSONを保存しました（${bundles.length}アプリ）${failureNote}${omittedNote}`, hasWarning);
  return { summaryHtml: renderSettingsExportSummaryHtml(rows, scopes) };
}
