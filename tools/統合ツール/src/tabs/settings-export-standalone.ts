'use strict';

import { SECTION_DEFS } from '../constants.js';
import { esc, nowStamp, downloadText, downloadBlob, selectedScopeKeys } from '../utils.js';
import { fetchBundle, buildApiPrefix, apiGet, fetchAppsInSpace } from '../api.js';
import { loadJSZip } from './record.js';

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
    <td>${esc(String(r.okCount))}</td>
    <td>${esc(String(r.ngCount))}</td>
    <td>${esc(r.note || '-')}</td>
  </tr>`
    )
    .join('');
  return `
    <div style="padding:8px 10px;border-bottom:1px solid #e2e8f0;font-size:11px;background:#f8fafc">対象セクション: ${esc(labels || '-')}</div>
    <table style="width:100%;font-size:11px;border-collapse:collapse">
      <thead><tr><th style="text-align:left;padding:4px">アプリID</th><th>取得OK</th><th>取得NG</th><th>メモ</th></tr></thead>
      <tbody>${body || '<tr><td colspan="4">結果なし</td></tr>'}</tbody>
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
  const guest = String(guestId || '').trim();
  const prefix = buildApiPrefix(guest, false);
  const params: Record<string, any> = { limit: 100 };
  if (kw) params.name = kw;
  setStatus('アプリ検索中...');
  const res = await apiGet(prefix, '/apps.json', params);
  const apps = (res.apps || [])
    .map((a: any) => ({ appId: String(a.appId || ''), name: String(a.name || '') }))
    .filter((a: { appId: string }) => /^\d+$/.test(a.appId))
    .sort((a: { appId: string }, b: { appId: string }) => Number(a.appId) - Number(b.appId));
  setStatus(`アプリ検索完了: ${apps.length}件`);
  return apps;
}

/**
 * スペース内全アプリIDを既存の対象テキストにマージして返す。
 */
export async function runSettingsExportAddSpaceStandalone(
  spaceId: any,
  guestId: any,
  currentText: any,
  setStatus: (msg: string, isError?: boolean) => void
): Promise<string> {
  const sid = String(spaceId || '').trim();
  if (!/^\d+$/.test(sid)) throw new Error('スペースIDを数値で入力してください');
  setStatus(`スペース ${sid} のアプリ一覧を取得中...`);
  const apps = await fetchAppsInSpace(sid, guestId);
  if (!apps.length) {
    setStatus(`スペース ${sid} に取得対象アプリがありませんでした`, true);
    return String(currentText || '');
  }
  const set = new Set(parseAppIdList(currentText));
  const before = set.size;
  apps.forEach((a) => set.add(a.appId));
  const ordered = [...set].sort((a, b) => Number(a) - Number(b));
  const added = set.size - before;
  setStatus(`スペース ${sid} のアプリ ${apps.length}件を読み込みました（新規追加 ${added}件 / 合計 ${set.size}件）`);
  return ordered.join('\n');
}

export async function runSettingsExportStandalone(mode: string, opts: any, setStatus: (msg: string, isError?: boolean) => void) {
  const appIds = parseAppIdList(opts.appIdsText);
  if (!appIds.length) throw new Error('対象アプリIDを1件以上入力してください');
  const scopes = selectedScopeKeys(opts.scopeRoot);
  if (!scopes.length) throw new Error('取得対象セクションを選択してください');

  const guestId = String(opts.guestId || '').trim();
  const preview = !!opts.preview;

  const bundles = [];
  const rows = [];
  for (let i = 0; i < appIds.length; i++) {
    const appId = appIds[i];
    setStatus(`設定取得中 ${i + 1}/${appIds.length}: アプリ ${appId}`);
    const bundle = await fetchBundle({
      appId,
      guestId,
      preview,
      sections: scopes,
      onProgress: (p, l) =>
        setStatus(`設定取得中 ${i + 1}/${appIds.length}: アプリ ${appId} ${Math.round(p * 100)}% (${l})`)
    });
    bundles.push(bundle);

    let okCount = 0;
    let ngCount = 0;
    for (const key of scopes) {
      const sec = bundle.sections[key];
      if (sec && sec._fetchError) ngCount += 1;
      else okCount += 1;
    }
    rows.push({ appId, okCount, ngCount, note: ngCount ? '一部セクション取得失敗あり' : 'OK' });
  }

  const scopeLabels = scopes.map((k) => SECTION_DEFS.find((s) => s.key === k)?.label || k);
  const payload = {
    generatedAt: new Date().toISOString(),
    guestId: guestId || '',
    preview,
    scopes,
    scopeLabels,
    apps: bundles
  };

  if (mode === 'zip') {
    const JSZipCtor = await loadJSZip();
    const zip = new JSZipCtor();
    zip.file(
      'manifest.json',
      JSON.stringify(
        {
          generatedAt: payload.generatedAt,
          guestId: payload.guestId,
          preview: payload.preview,
          scopes: payload.scopes,
          appCount: bundles.length
        },
        null,
        2
      )
    );
    for (const bundle of bundles) {
      const suffix = `${guestId ? `_guest_${guestId}` : ''}${preview ? '_preview' : '_live'}`;
      const name = `app_${bundle.appId}${suffix}.json`;
      zip.file(name, JSON.stringify(bundle, null, 2));
    }
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    downloadBlob(`settings_export_${bundles.length}apps_${nowStamp()}.zip`, zipBlob);
    setStatus(`設定一括取得ZIPを保存しました（${bundles.length} apps）`);
    return { summaryHtml: renderSettingsExportSummaryHtml(rows, scopes) };
  }

  downloadText(`settings_export_${bundles.length}apps_${nowStamp()}.json`, JSON.stringify(payload, null, 2), 'application/json');
  setStatus(`設定一括取得JSONを保存しました（${bundles.length}アプリ）`);
  return { summaryHtml: renderSettingsExportSummaryHtml(rows, scopes) };
}
