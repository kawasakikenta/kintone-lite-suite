'use strict';

import { ui } from '../state.js';
import {
  esc,
  normalize,
  downloadText,
  kusConfirm,
  buildAppFilenameLabel,
  buildExportFilename
} from '../utils.js';
import { apiGet, apiPut, buildApiPrefix } from '../api.js';
import { setStatus, setBusy } from '../ui/components.js';
import { getToolDocument } from '../ui/dialog.js';
import { commonParams } from './diff.js';
import {
  getSideApiPrefix,
  getAllAppsInSpace,
  downloadBlobWithRetry,
  loadJSZip
} from './record.js';

export function renderCustomizeResult(data) {
  if (!data) {
    ui.jsconfigResult.innerHTML = '<div style="padding:10px;font-size:12px;color:#64748b">データがありません</div>';
    return;
  }
  const categories = [
    { label: 'デスクトップ JS', items: data.desktop?.js || [] },
    { label: 'デスクトップ CSS', items: data.desktop?.css || [] },
    { label: 'モバイル JS', items: data.mobile?.js || [] },
    { label: 'モバイル CSS', items: data.mobile?.css || [] }
  ];
  const totalCount = categories.reduce((s, c) => s + c.items.length, 0);
  const header = `<div style="padding:8px 10px;border-bottom:1px solid #e2e8f0;font-size:11px;background:#f8fafc">合計: ${totalCount}件 (Desktop JS:${categories[0].items.length} CSS:${categories[1].items.length} / Mobile JS:${categories[2].items.length} CSS:${categories[3].items.length})</div>`;
  const rows = [];
  for (const cat of categories) {
    if (!cat.items.length) continue;
    for (const item of cat.items) {
      const fileType = item.type || '-';
      const src = item.type === 'URL' ? (item.url || '-') : (item.file?.name || item.file?.fileKey || '(アップロードファイル)');
      rows.push(`<tr>
        <td>${esc(cat.label)}</td>
        <td><span style="display:inline-block;padding:2px 6px;border-radius:4px;font-size:10px;font-weight:700;background:${fileType === 'URL' ? '#dbeafe' : '#dcfce7'};color:${fileType === 'URL' ? '#1d4ed8' : '#166534'}">${esc(fileType)}</span></td>
        <td style="word-break:break-all">${esc(src)}</td>
      </tr>`);
    }
  }
  if (!rows.length) {
    ui.jsconfigResult.innerHTML = '<div style="padding:10px;font-size:12px;color:#15803d">JS/CSS設定は空です。</div>';
    return;
  }
  ui.jsconfigResult.innerHTML = `${header}<table>
    <thead><tr><th>カテゴリ</th><th>タイプ</th><th>ソース</th></tr></thead>
    <tbody>${rows.join('')}</tbody>
  </table>`;
}

let lastFetchedSourceAppName = '';

export async function runFetchJsConfig() {
  const c = commonParams();
  if (!c.source.appId) throw new Error('比較元アプリIDを入力してください');
  const isPreview = !!ui.jsconfigPreview.checked;
  const prefix = buildApiPrefix(c.source.guestId, isPreview);
  const appInfoPrefix = buildApiPrefix(c.source.guestId, false);
  setStatus('JS/CSS設定を取得中...');
  const res = await apiGet(prefix, '/app/customize.json', { app: c.source.appId });
  const data = normalize(res);
  try {
    const appInfo = await apiGet(appInfoPrefix, '/app.json', { id: c.source.appId });
    lastFetchedSourceAppName = String(appInfo?.name || '').trim();
  } catch (_e) {
    lastFetchedSourceAppName = '';
  }
  ui.jsconfigJson.value = JSON.stringify(data, null, 2);
  renderCustomizeResult(data);
  setStatus(`JS/CSS設定を取得しました（アプリ: ${c.source.appId}${lastFetchedSourceAppName ? ` / ${lastFetchedSourceAppName}` : ''}${isPreview ? ' / プレビュー' : ''}）`);
}

export async function runExportJsConfig() {
  const text = ui.jsconfigJson.value.trim();
  if (!text) throw new Error('先にJS/CSS設定を取得してください');
  const parsed = JSON.parse(text);
  const c = commonParams();
  const appLabel = buildAppFilenameLabel(c.source.appId || 'unknown', lastFetchedSourceAppName);
  downloadText(buildExportFilename('JS_CSS設定', 'json', { appLabel }), JSON.stringify(parsed, null, 2), 'application/json');
  setStatus('JS/CSS設定JSONを保存しました');
}

export async function runApplyJsConfig() {
  const c = commonParams();
  if (!c.target.appId) throw new Error('比較先アプリIDを入力してください');
  const text = ui.jsconfigJson.value.trim();
  if (!text) throw new Error('JS/CSS設定JSONを入力してください');
  const parsed = JSON.parse(text);
  if (!parsed || typeof parsed !== 'object') throw new Error('JSONはオブジェクト形式で入力してください');
  const body = {
    app: c.target.appId,
    desktop: parsed.desktop || {},
    mobile: parsed.mobile || {}
  };
  if (!kusConfirm(`JS/CSS設定を比較先(プレビュー)へ反映しますか？\n比較先アプリ: ${c.target.appId}`)) {
    setStatus('JS/CSS設定反映をキャンセルしました');
    return;
  }
  const prefix = buildApiPrefix(c.target.guestId, true);
  setStatus('JS/CSS設定を反映中...');
  await apiPut(prefix, '/app/customize.json', body);
  const logs = [`OK JS/CSS設定反映（アプリ: ${c.target.appId}）`];

  ui.result.innerHTML = `<pre style="margin:0;padding:10px;font-size:12px;white-space:pre-wrap">${esc(logs.join('\n'))}</pre>`;
  setStatus('JS/CSS設定反映完了');
}

export async function runBatchJsConfigDownload() {
  setStatus('対象スペースの全アプリを取得中...');
  const apps = await getAllAppsInSpace(false);
  if (apps.length === 0) throw new Error('アプリが見つかりませんでした。');

  const seen = new Set();
  const uniqueApps = apps.filter(app => {
    const key = `${app.appId}_${app.spaceId || 'null'}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  setStatus(`${uniqueApps.length}個のアプリ設定を解析中...`);
  const JSZipCtor = await loadJSZip();
  const zip = new JSZipCtor();
  let hasFiles = false;
  let failedCount = 0;

  for (let i = 0; i < uniqueApps.length; i++) {
    const app = uniqueApps[i];
    const { appId, name, spaceId } = app;
    const safeName = name.replace(/[\\/:*?"<>|]/g, '_');
    const guestSpaceId = spaceId ? parseInt(spaceId, 10) : null;

    setStatus(`[${i + 1}/${uniqueApps.length}] アプリ "${safeName}" (${appId}) をチェック...`);

    let customize = null;
    try {
      let prefix = getSideApiPrefix(false, false);
      if (guestSpaceId) {
        prefix = `/k/guest/${guestSpaceId}/v1`;
      }
      customize = await apiGet(prefix, '/app/customize.json', { app: appId });
    } catch (e) {
      console.warn(`アプリ ${appId} (${name}) のカスタマイズ取得失敗`);
      failedCount++;
      continue;
    }

    const files = [...(customize?.desktop?.js || []), ...(customize?.mobile?.js || [])];
    const fileTargets = files.filter(f => f.type === 'FILE');

    if (fileTargets.length === 0) continue;

    const folderName = guestSpaceId ? `guest${guestSpaceId}_${appId}_${safeName}` : `${appId}_${safeName}`;
    const appFolder = zip.folder(folderName);

    for (const file of fileTargets) {
      const blob = await downloadBlobWithRetry(file.file.fileKey, false, guestSpaceId);
      if (blob) {
        appFolder.file(file.file.name, blob);
        hasFiles = true;
      }
    }
    await new Promise(r => setTimeout(r, 100));
  }

  if (!hasFiles) {
    setStatus(`対象ファイルがありません。(403エラー: ${failedCount}件スキップ)`, true);
    return;
  }

  setStatus('ZIPファイル作成中...');
  const zipBlob = await zip.generateAsync({ type: "blob" });
  const doc = getToolDocument();
  const a = doc.createElement("a");
  const u = URL.createObjectURL(zipBlob);
  a.href = u;
  a.download = "customize_scripts.zip";
  doc.body.appendChild(a);
  a.click();
  setTimeout(() => { doc.body.removeChild(a); URL.revokeObjectURL(u); }, 100);

  setStatus(`JS/CSS一括DL完了 (403スキップ: ${failedCount}件)`);
}
