'use strict';

import { SECTION_DEFS } from '../constants.js';
import { esc, downloadText, downloadBlob, selectedScopeKeys, buildExportFilename, buildAppFilenameLabel, appLabelFromBundle, extractAppNameFromBundle } from '../utils.js';
import { fetchBundle, buildApiPrefix, apiGet, fetchAppsInSpace } from '../api.js';
import { extractAppIdFromInput, extractGuestIdFromInput } from '../handlers/diffFocus.js';
import { loadJSZipLite } from '../jszipLoader.js';

/** apps.json の 1 回あたり取得上限。検索結果がこの件数に達したら絞り込みを促す。 */
const APP_SEARCH_LIMIT = 100;

/** 設定一括取得のファイル名ラベル。1アプリならアプリ名(appID)、複数なら「N件」。 */
function settingsExportLabel(bundles: any[]): string {
  if (bundles.length === 1) return appLabelFromBundle(bundles[0]);
  return `${bundles.length}件`;
}

function parseAppIdList(text) {
  const tokens = String(text || '')
    .split(/[\s,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const out = [];
  const seen = new Set();
  for (const tk of tokens) {
    if (!/^\d+$/.test(tk)) continue;
    if (seen.has(tk)) continue;
    seen.add(tk);
    out.push(tk);
  }
  return out;
}

export function renderSettingsExportSummaryHtml(rows, scopes) {
  const labels = scopes.map((k) => SECTION_DEFS.find((s) => s.key === k)?.label || k).join(', ');
  const body = rows
    .map(
      (r) => `<tr>
    <td>${esc(r.appId)}</td>
    <td>${esc(r.guestId ? `guest:${r.guestId}` : '通常')}</td>
    <td>${esc(String(r.okCount))}</td>
    <td>${esc(String(r.ngCount))}</td>
    <td>${esc(r.note || '-')}</td>
  </tr>`
    )
    .join('');
  return `
    <div style="padding:8px 10px;border-bottom:1px solid #e2e8f0;font-size:11px;background:#f8fafc">対象セクション: ${esc(labels || '-')}</div>
    <table style="width:100%;font-size:11px;border-collapse:collapse">
      <thead><tr><th style="text-align:left;padding:4px">アプリID</th><th>ゲスト</th><th>取得OK</th><th>取得NG</th><th>メモ</th></tr></thead>
      <tbody>${body || '<tr><td colspan="5">結果なし</td></tr>'}</tbody>
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
  if (!/^\d+$/.test(sid)) throw new Error('スペースIDを数値で入力してください');
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
    if (!/^\d+$/.test(id)) return;
    const g = String(guestId || '').trim();
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

export async function runSettingsExportStandalone(mode: string, opts: any, setStatus: (msg: string, isError?: boolean) => void) {
  const targets = resolveExportTargets(opts);
  if (!targets.length) throw new Error('対象アプリIDを1件以上入力してください');
  const scopes = selectedScopeKeys(opts.scopeRoot);
  if (!scopes.length) throw new Error('取得対象セクションを選択してください');

  const preview = !!opts.preview;

  const bundles = [];
  const rows = [];
  for (let i = 0; i < targets.length; i++) {
    const { appId, guestId } = targets[i];
    const guestNote = guestId ? ` (guest:${guestId})` : '';
    setStatus(`設定取得中 ${i + 1}/${targets.length}: アプリ ${appId}${guestNote}`);
    const bundle = await fetchBundle({
      appId,
      guestId,
      preview,
      sections: scopes,
      onProgress: (p, l) =>
        setStatus(`設定取得中 ${i + 1}/${targets.length}: アプリ ${appId}${guestNote} ${Math.round(p * 100)}% (${l})`)
    });
    // ゲストスペース情報を bundle にも残しておく（ファイル名・突合用）
    if (guestId && !(bundle as any).guestId) (bundle as any).guestId = guestId;
    bundles.push(bundle);

    let okCount = 0;
    let ngCount = 0;
    for (const key of scopes) {
      const sec = bundle.sections[key];
      if (sec && sec._fetchError) ngCount += 1;
      else okCount += 1;
    }
    rows.push({ appId, guestId, okCount, ngCount, note: ngCount ? '一部セクション取得失敗あり' : 'OK' });
  }

  const guestIds = [...new Set(targets.map((t) => t.guestId).filter(Boolean))];
  const scopeLabels = scopes.map((k) => SECTION_DEFS.find((s) => s.key === k)?.label || k);
  const payload = {
    generatedAt: new Date().toISOString(),
    guestIds,
    targets,
    preview,
    scopes,
    scopeLabels,
    apps: bundles
  };

  if (mode === 'zip') {
    const JSZipCtor = await loadJSZipLite();
    const zip = new JSZipCtor();
    zip.file(
      'manifest.json',
      JSON.stringify(
        {
          generatedAt: payload.generatedAt,
          guestIds,
          targets,
          preview: payload.preview,
          scopes: payload.scopes,
          appCount: bundles.length
        },
        null,
        2
      )
    );
    for (let i = 0; i < bundles.length; i++) {
      const bundle = bundles[i];
      const guestId = targets[i].guestId;
      const suffix = `${guestId ? `_ゲスト${guestId}` : ''}${preview ? '_プレビュー' : '_本番'}`;
      const name = `${buildAppFilenameLabel(bundle.appId, extractAppNameFromBundle(bundle))}${suffix}.json`;
      zip.file(name, JSON.stringify(bundle, null, 2));
    }
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    downloadBlob(buildExportFilename('設定一括取得', 'zip', { appLabel: settingsExportLabel(bundles) }), zipBlob);
    setStatus(`設定一括取得ZIPを保存しました（${bundles.length} apps）`);
    return { summaryHtml: renderSettingsExportSummaryHtml(rows, scopes) };
  }

  downloadText(buildExportFilename('設定一括取得', 'json', { appLabel: settingsExportLabel(bundles) }), JSON.stringify(payload, null, 2), 'application/json');
  setStatus(`設定一括取得JSONを保存しました（${bundles.length}アプリ）`);
  return { summaryHtml: renderSettingsExportSummaryHtml(rows, scopes) };
}
