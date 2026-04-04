'use strict';

import { normalize, nowStamp, downloadText, esc } from '../utils.js';
import { apiGet, apiPut, apiPost, buildApiPrefix } from '../api.js';

async function deployAndPoll(prefix, app, logs) {
  logs.push('START デプロイ実行');
  await apiPost(prefix, '/app/deploy.json', { apps: [{ app, revision: -1 }] });
  let last = 'PROCESSING';
  for (let i = 0; i < 25; i++) {
    await new Promise((r) => setTimeout(r, 1500));
    try {
      const statusRes = await apiGet(prefix, '/app/deploy.json', { apps: [app] }, 1);
      const st = statusRes?.apps?.[0]?.status || 'UNKNOWN';
      last = st;
      logs.push(`  - デプロイ状態: ${st}`);
      if (st === 'SUCCESS' || st === 'FAIL' || st === 'CANCEL') break;
    } catch (e) {
      logs.push(`  - Deploy Status取得失敗: ${e.message || String(e)}`);
    }
  }
  return last;
}

export function renderCustomizeResultHtml(data) {
  if (!data) {
    return '<div style="padding:10px;font-size:12px;color:#64748b">データがありません</div>';
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
      const src =
        item.type === 'URL' ? (item.url || '-') : (item.file?.name || item.file?.fileKey || '(アップロードファイル)');
      rows.push(`<tr>
        <td>${esc(cat.label)}</td>
        <td><span style="display:inline-block;padding:2px 6px;border-radius:4px;font-size:10px;font-weight:700;background:${fileType === 'URL' ? '#dbeafe' : '#dcfce7'};color:${fileType === 'URL' ? '#1d4ed8' : '#166534'}">${esc(fileType)}</span></td>
        <td style="word-break:break-all">${esc(src)}</td>
      </tr>`);
    }
  }
  if (!rows.length) {
    return '<div style="padding:10px;font-size:12px;color:#15803d">JS/CSS設定は空です。</div>';
  }
  return `${header}<table style="width:100%;font-size:11px;border-collapse:collapse">
    <thead><tr><th style="text-align:left;padding:4px">カテゴリ</th><th>タイプ</th><th>ソース</th></tr></thead>
    <tbody>${rows.join('')}</tbody>
  </table>`;
}

export async function runFetchJsConfigStandalone(p, setStatus, ui) {
  const appId = String(p.sourceAppId || '').trim();
  if (!appId) throw new Error('アプリIDを入力してください');
  const guestId = String(p.sourceGuestId || '').trim();
  const isPreview = !!p.preview;
  const prefix = buildApiPrefix(guestId, isPreview);
  setStatus('JS/CSS設定を取得中...');
  const res = await apiGet(prefix, '/app/customize.json', { app: appId });
  const data = normalize(res);
  ui.setJson(JSON.stringify(data, null, 2));
  ui.setCustomizeHtml(renderCustomizeResultHtml(data));
  setStatus(`JS/CSS設定を取得しました（アプリ: ${appId}${isPreview ? ' / プレビュー' : ''}）`);
}

export function runExportJsConfigStandalone(jsonText, sourceAppId, setStatus) {
  const text = String(jsonText || '').trim();
  if (!text) throw new Error('先にJS/CSS設定を取得してください');
  const parsed = JSON.parse(text);
  const appId = String(sourceAppId || '').trim() || 'unknown';
  downloadText(`customize_${appId}_${nowStamp()}.json`, JSON.stringify(parsed, null, 2), 'application/json');
  setStatus('JS/CSS設定JSONを保存しました');
}

export async function runApplyJsConfigStandalone(p, setStatus, setLogHtml) {
  const targetAppId = String(p.targetAppId || '').trim();
  if (!targetAppId) throw new Error('反映先アプリIDを入力してください');
  const text = String(p.jsonText || '').trim();
  if (!text) throw new Error('JS/CSS設定JSONを入力してください');
  const parsed = JSON.parse(text);
  if (!parsed || typeof parsed !== 'object') throw new Error('JSONはオブジェクト形式で入力してください');
  const body = {
    app: targetAppId,
    desktop: parsed.desktop || {},
    mobile: parsed.mobile || {}
  };
  if (!window.confirm(`JS/CSS設定を比較先(プレビュー)へ反映しますか？\n比較先アプリ: ${targetAppId}`)) {
    setStatus('JS/CSS設定反映をキャンセルしました');
    return;
  }
  const guestId = String(p.targetGuestId || '').trim();
  const prefix = buildApiPrefix(guestId, true);
  setStatus('JS/CSS設定を反映中...');
  await apiPut(prefix, '/app/customize.json', body);
  const logs = [`OK JS/CSS設定反映（アプリ: ${targetAppId}）`];

  if (p.deployAfter) {
    setStatus('デプロイ実行中...');
    const st = await deployAndPoll(prefix, targetAppId, logs);
    logs.push(st === 'SUCCESS' ? 'OK デプロイ完了' : `NG デプロイ終了ステータス: ${st}`);
  }
  setLogHtml(`<pre style="margin:0;padding:10px;font-size:12px;white-space:pre-wrap">${esc(logs.join('\n'))}</pre>`);
  setStatus('JS/CSS設定反映完了');
}
