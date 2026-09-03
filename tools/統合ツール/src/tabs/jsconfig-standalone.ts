'use strict';

import { buildCustomizeSettingsPutPayload } from '../constants.js';
import { normalize, nowStamp, downloadText, downloadBlob, esc, kusConfirm } from '../utils.js';
import { apiGet, apiPut, buildApiPrefix, decorateRevisionConflict, pickRevision } from '../api.js';
import { loadJSZipLite } from '../jszipLoader.js';
import { uniqueZipEntryName } from './record-query.js';

/** ファイル取得結果。403 は権限、それ以外は HTTP/通信エラーとして理由を残す。 */
async function downloadFileBlobForJsConfig(prefix: string, fileKey: string): Promise<{ ok: true; blob: Blob } | { ok: false; reason: string }> {
  if (!fileKey) return { ok: false, reason: 'fileKey がありません' };
  const url = prefix + '/file.json?fileKey=' + encodeURIComponent(fileKey);
  const headers = { 'X-Requested-With': 'XMLHttpRequest' };
  let lastReason = '';
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const resp = await fetch(url, { method: 'GET', headers });
      if (resp.status === 403) return { ok: false, reason: '閲覧権限なし (HTTP 403)' };
      if (resp.ok) return { ok: true, blob: await resp.blob() };
      lastReason = `HTTP ${resp.status}`;
    } catch (e: any) {
      lastReason = e?.message || String(e);
    }
    if (attempt === 0) await new Promise((r) => setTimeout(r, 500));
  }
  return { ok: false, reason: lastReason || '取得失敗' };
}

/** ZIP フォルダ名に使えない文字と制御文字を除く。 */
export function sanitizeFolderName(name: string): string {
  return String(name || '')
    .replace(/[\\/:*?"<>|]/g, '_')
    .replace(/[\u0000-\u001f]/g, '')
    .trim();
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
  const scope = data.scope ? ` / 適用範囲: ${esc(String(data.scope))}` : '';
  const header = `<div style="padding:8px 10px;border-bottom:1px solid #e2e8f0;font-size:11px;background:#f8fafc">合計: ${totalCount}件 (Desktop JS:${categories[0].items.length} CSS:${categories[1].items.length} / Mobile JS:${categories[2].items.length} CSS:${categories[3].items.length})${scope}</div>`;
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

const CUSTOMIZE_SCOPES = new Set(['ALL', 'ADMIN', 'NONE']);

export interface JsConfigApplyPlan {
  /** app/customize PUT に送る desktop/mobile（GET 専用の name/size 等は除去済み） */
  payload: Record<string, unknown>;
  /** 入力に有効な scope があればそのまま送る（無ければ比較先の現状維持） */
  scope: string | null;
  counts: { desktopJs: number; desktopCss: number; mobileJs: number; mobileCss: number; file: number; url: number };
  /** type/url/fileKey 不備で送信対象から外れた件数 */
  dropped: number;
}

/**
 * テキストエリアの JSON から PUT 計画を作る（API には触れない）。
 */
export function buildJsConfigApplyPlan(parsed: any): JsConfigApplyPlan {
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('JSONは { "desktop": {...}, "mobile": {...} } 形式のオブジェクトで入力してください');
  }
  const payload = buildCustomizeSettingsPutPayload(parsed);
  const count = (platform: 'desktop' | 'mobile', kind: 'js' | 'css') => ((payload as any)[platform]?.[kind] || []) as any[];
  const all = [...count('desktop', 'js'), ...count('desktop', 'css'), ...count('mobile', 'js'), ...count('mobile', 'css')];
  const inputTotal = ['desktop', 'mobile'].reduce((sum, platform) => {
    return sum + ['js', 'css'].reduce((s, kind) => s + (Array.isArray(parsed?.[platform]?.[kind]) ? parsed[platform][kind].length : 0), 0);
  }, 0);
  const scopeRaw = String(parsed.scope || '').trim().toUpperCase();
  if (inputTotal > 0 && all.length === 0) {
    throw new Error('JS/CSS設定の全項目で type/url/fileKey が不足しています。現在設定の全削除を防ぐため反映を中止しました');
  }
  return {
    payload,
    scope: CUSTOMIZE_SCOPES.has(scopeRaw) ? scopeRaw : null,
    counts: {
      desktopJs: count('desktop', 'js').length,
      desktopCss: count('desktop', 'css').length,
      mobileJs: count('mobile', 'js').length,
      mobileCss: count('mobile', 'css').length,
      file: all.filter((r) => r.type === 'FILE').length,
      url: all.filter((r) => r.type === 'URL').length
    },
    dropped: Math.max(0, inputTotal - all.length)
  };
}

export function buildJsConfigApplyConfirmText(targetAppId: string, targetGuestId: string, plan: JsConfigApplyPlan): string {
  const c = plan.counts;
  return [
    `比較先 App ${targetAppId}${targetGuestId ? `（ゲスト ${targetGuestId}）` : ''} のプレビュー環境へ JS/CSS 設定を反映します。`,
    `Desktop JS ${c.desktopJs} / CSS ${c.desktopCss}、Mobile JS ${c.mobileJs} / CSS ${c.mobileCss}（URL ${c.url}件 / FILE ${c.file}件）${plan.scope ? ` / 適用範囲 ${plan.scope}` : ''}`,
    '比較先の JS/CSS 一覧はこの内容で全置換され、比較先のみにあるファイルは外れます。',
    plan.dropped ? `type/url/fileKey が不足している ${plan.dropped}件は送信しません。` : '',
    c.file
      ? 'FILE タイプは反映先で有効なアップロード済み fileKey が必要です。他アプリの取得結果にある fileKey（ダウンロード用）をそのまま流用すると kintone に拒否されます。'
      : '',
    '本番には反映されません（管理画面から手動デプロイ）。実行しますか？'
  ].filter(Boolean).join('\n');
}

export async function runApplyJsConfigStandalone(p, setStatus, setLogHtml) {
  const targetAppId = String(p.targetAppId || '').trim();
  if (!targetAppId) throw new Error('反映先アプリIDを入力してください');
  const text = String(p.jsonText || '').trim();
  if (!text) throw new Error('JS/CSS設定JSONを入力してください');
  let parsed: any;
  try {
    parsed = JSON.parse(text);
  } catch (e: any) {
    throw new Error(`JS/CSS設定JSONを解析できません（「整形」ボタンで位置を確認してください）: ${e?.message || String(e)}`);
  }
  const plan = buildJsConfigApplyPlan(parsed);
  const guestId = String(p.targetGuestId || '').trim();
  const prefix = buildApiPrefix(guestId, true);

  setStatus('反映先の現在設定を確認中...');
  const current = await apiGet(prefix, '/app/customize.json', { app: targetAppId });
  const revision = pickRevision(current);

  if (!p.skipConfirm && !kusConfirm(buildJsConfigApplyConfirmText(targetAppId, guestId, plan))) {
    setStatus('JS/CSS設定反映をキャンセルしました');
    return;
  }

  const body: Record<string, unknown> = { app: targetAppId, ...plan.payload };
  if (plan.scope) body.scope = plan.scope;
  if (revision) body.revision = revision;
  setStatus('JS/CSS設定を反映中...');
  let res: any;
  try {
    res = await apiPut(prefix, '/app/customize.json', body);
  } catch (e) {
    throw decorateRevisionConflict(e, 'JS/CSS設定の反映');
  }
  const c = plan.counts;
  const logs = [
    `OK JS/CSS設定反映（アプリ: ${targetAppId}${guestId ? ` / ゲスト ${guestId}` : ''}）${pickRevision(res) ? ` revision ${pickRevision(res)}` : ''}`,
    `Desktop JS ${c.desktopJs} / CSS ${c.desktopCss}、Mobile JS ${c.mobileJs} / CSS ${c.mobileCss}${plan.scope ? ` / 適用範囲 ${plan.scope}` : ''}`,
    plan.dropped ? `送信対象外 ${plan.dropped}件（type/url/fileKey 不足）` : ''
  ].filter(Boolean);

  setLogHtml(`<pre style="margin:0;padding:10px;font-size:12px;white-space:pre-wrap">${esc(logs.join('\n'))}</pre>`);
  setStatus('JS/CSS設定反映完了');
}

export interface BatchJsConfigDownloadResult {
  apps: number;
  files: number;
  failed: number;
  /** customize.json 自体を取得できなかったアプリ */
  failedApps: Array<{ appId: string; name: string; reason: string }>;
  /** 個別ファイルを取得できなかったもの */
  failedFiles: Array<{ appId: string; fileName: string; reason: string }>;
}

/**
 * スペース内アプリの customize.json をすべて取得し、`FILE` タイプの JS/CSS を
 * 1 つの ZIP にまとめてダウンロードする。取得できなかったアプリ・ファイルは
 * ZIP 内の download_errors.txt と戻り値に残す。
 * @param p { guestId?: string }
 */
export async function runBatchJsConfigDownloadStandalone(
  p: { guestId?: string },
  setStatus: (msg: string, err?: boolean) => void
): Promise<BatchJsConfigDownloadResult> {
  const guestId = String(p.guestId || '').trim();
  const baseListPrefix = buildApiPrefix(guestId, false);

  setStatus('対象スペースの全アプリを取得中...');
  let apps: Array<{ appId: string; name: string; spaceId: any }> = [];
  let offset = 0;
  while (true) {
    const resp = await apiGet(baseListPrefix, '/apps.json', { limit: 100, offset });
    const batch = (resp?.apps || []).map((a: any) => ({
      appId: String(a.appId),
      name: String(a.name || ''),
      spaceId: a.spaceId
    }));
    apps = apps.concat(batch);
    if (batch.length < 100) break;
    offset += 100;
    await new Promise((r) => setTimeout(r, 150));
  }
  if (!apps.length) throw new Error('アプリが見つかりませんでした。');

  const seen = new Set<string>();
  apps = apps.filter((app) => {
    const key = `${app.appId}_${app.spaceId || 'null'}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  setStatus(`${apps.length}個のアプリ設定を解析中...`);
  const JSZipCtor = await loadJSZipLite();
  const zip = new JSZipCtor();
  const failedApps: BatchJsConfigDownloadResult['failedApps'] = [];
  const failedFiles: BatchJsConfigDownloadResult['failedFiles'] = [];
  let fileCount = 0;

  for (let i = 0; i < apps.length; i++) {
    const app = apps[i];
    const safeName = sanitizeFolderName(app.name || `app${app.appId}`);
    // apps.json に spaceId が付くのはゲストスペース所属アプリではなく通常スペースのアプリなので、
    // ゲスト prefix は利用者が指定した guestId からのみ決める。
    setStatus(`[${i + 1}/${apps.length}] アプリ "${safeName}" (${app.appId}) をチェック...`);

    let customize: any = null;
    try {
      customize = await apiGet(baseListPrefix, '/app/customize.json', { app: app.appId });
    } catch (e: any) {
      failedApps.push({ appId: app.appId, name: app.name, reason: e?.message || String(e) });
      continue;
    }

    const files = [
      ...(customize?.desktop?.js || []),
      ...(customize?.desktop?.css || []),
      ...(customize?.mobile?.js || []),
      ...(customize?.mobile?.css || [])
    ];
    const fileTargets = files.filter((f: any) => f?.type === 'FILE' && f?.file?.fileKey);
    if (!fileTargets.length) continue;

    const folderName = guestId ? `guest${guestId}_${app.appId}_${safeName}` : `${app.appId}_${safeName}`;
    const appFolder = zip.folder(folderName);
    const used = new Set<string>();

    for (const file of fileTargets) {
      const fileName = String(file.file.name || `${file.file.fileKey}.bin`);
      const result = await downloadFileBlobForJsConfig(baseListPrefix, file.file.fileKey);
      if (result.ok === true) {
        // desktop/mobile で同名ファイルがあっても上書きしない
        appFolder.file(uniqueZipEntryName(used, sanitizeFolderName(fileName) || 'file.bin'), result.blob);
        fileCount++;
      } else {
        failedFiles.push({ appId: app.appId, fileName, reason: result.reason });
      }
    }
    await new Promise((r) => setTimeout(r, 80));
  }

  const failed = failedApps.length + failedFiles.length;
  if (!fileCount) {
    setStatus(`対象ファイルがありません。（取得失敗: アプリ ${failedApps.length} / ファイル ${failedFiles.length}）`, true);
    return { apps: apps.length, files: 0, failed, failedApps, failedFiles };
  }

  if (failed) {
    const lines = [
      `取得できなかった項目 ${failed}件`,
      ...failedApps.map((a) => `app ${a.appId}\t${a.name}\tcustomize.json 取得失敗: ${a.reason}`),
      ...failedFiles.map((f) => `app ${f.appId}\t${f.fileName}\t${f.reason}`)
    ];
    zip.file('download_errors.txt', lines.join('\n') + '\n');
  }

  setStatus('ZIPファイル作成中...');
  const zipBlob = await zip.generateAsync({ type: 'blob' });
  downloadBlob(`customize_scripts_${nowStamp()}.zip`, zipBlob);

  setStatus(
    `JS/CSS一括DL完了（${apps.length}アプリ / ${fileCount}ファイル / 取得失敗 ${failed}件${failed ? '、詳細は download_errors.txt' : ''}）`,
    failed > 0
  );
  return { apps: apps.length, files: fileCount, failed, failedApps, failedFiles };
}
