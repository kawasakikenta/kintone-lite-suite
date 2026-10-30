'use strict';

import { buildCustomizeSettingsPutPayload } from '../constants.js';
import { normalize, nowStamp, downloadText, downloadBlob, esc, kusConfirm, buildExportFilename, summarizeList } from '../utils.js';
import { FILE_DOWNLOAD_TIMEOUT_MS, apiGet, apiPut, buildApiPrefix, decorateRevisionConflict, pickRevision } from '../api.js';
import { loadJSZipLite } from '../jszipLoader.js';
import { RunCancelledError, createRequestSignal, isRunCancelledError, sleepUnlessCancelled, throwIfCancelled } from '../runControl.js';
import { uniqueZipEntryName } from './record-query.js';
import { createCancelReport, formatCancelledHeadline, isCancelStop } from './run-cancel-summary.js';

export function formatFileSize(bytes: any): string {
  const n = Number(bytes);
  if (!Number.isFinite(n) || n <= 0) return '';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

/** ファイル取得結果。403 は権限、それ以外は HTTP/通信エラーとして理由を残す。 */
async function downloadFileBlobForJsConfig(prefix: string, fileKey: string): Promise<{ ok: true; blob: Blob } | { ok: false; reason: string }> {
  if (!fileKey) return { ok: false, reason: 'fileKey がありません' };
  const url = prefix + '/file.json?fileKey=' + encodeURIComponent(fileKey);
  const headers = { 'X-Requested-With': 'XMLHttpRequest' };
  let lastReason = '';
  let request: ReturnType<typeof createRequestSignal> | null = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    // 中止は取得失敗として記録せず、呼び出し側のループを止める。
    throwIfCancelled();
    try {
      // 中止と応答待ちの上限（FILE_DOWNLOAD_TIMEOUT_MS）のどちらでも打ち切る
      request = createRequestSignal(FILE_DOWNLOAD_TIMEOUT_MS);
      const resp = await fetch(url, { method: 'GET', headers, signal: request.signal });
      if (resp.status === 403) return { ok: false, reason: '閲覧権限なし (HTTP 403)' };
      if (resp.ok) return { ok: true, blob: await resp.blob() };
      lastReason = `HTTP ${resp.status}`;
    } catch (e: any) {
      if (isRunCancelledError(e) || isRunCancelledError((request?.signal as any)?.reason)) throw e instanceof RunCancelledError ? e : new RunCancelledError();
      lastReason = request?.timedOut() ? `応答待ちが ${Math.round(FILE_DOWNLOAD_TIMEOUT_MS / 1000)} 秒を超えました（timeout）` : (e?.message || String(e));
    } finally {
      request?.release();
    }
    if (attempt === 0) await sleepUnlessCancelled(500);
  }
  return { ok: false, reason: lastReason || '取得失敗' };
}

const WINDOWS_RESERVED_NAME = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\..*)?$/i;

/**
 * ZIP のフォルダ名・ファイル名に使えない文字と制御文字を除く。
 * 空文字を返すことがあるため、呼び出し側で代替名を用意する。
 */
export function sanitizeFolderName(name: string): string {
  const safe = String(name || '')
    .replace(/[\\/:*?"<>|]/g, '_')
    // 制御文字、双方向制御・ゼロ幅文字（表示上の名前偽装）を除く
    .replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2066-\u2069\ufeff]/g, '')
    .trim()
    // Windows は末尾のドット・空白を落とす。".." のみの名前もここで空になり、上位ディレクトリ指定にならない。
    .replace(/[. ]+$/, '');
  return WINDOWS_RESERVED_NAME.test(safe) ? '_' + safe : safe;
}

/** 大文字小文字だけが異なる名前も重複として扱う（Windows / macOS で展開時に上書きされるため）。 */
class CaseInsensitiveNameSet extends Set<string> {
  has(value: string) { return super.has(value.toLowerCase()); }
  add(value: string) { return super.add(value.toLowerCase()); }
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
  let urlTotal = 0;
  let fileTotal = 0;
  for (const cat of categories) {
    for (const item of cat.items) {
      if (item?.type === 'URL') urlTotal += 1;
      else fileTotal += 1;
    }
  }
  const scope = data.scope ? ` / 適用範囲: ${esc(String(data.scope))}` : '';
  const header = `<div style="padding:8px 10px;border-bottom:1px solid #e2e8f0;font-size:11px;background:#f8fafc">合計: ${totalCount}件 (Desktop JS:${categories[0].items.length} CSS:${categories[1].items.length} / Mobile JS:${categories[2].items.length} CSS:${categories[3].items.length} / URL:${urlTotal} / FILE:${fileTotal})${scope}</div>`;
  const rows = [];
  for (const cat of categories) {
    if (!cat.items.length) continue;
    for (const item of cat.items) {
      const fileType = item.type || '-';
      const src =
        item.type === 'URL' ? (item.url || '-') : (item.file?.name || item.file?.fileKey || '(アップロードファイル)');
      const sizeLabel = item.type !== 'URL' ? formatFileSize(item?.file?.size) : '';
      const srcCell = sizeLabel
        ? `${esc(src)} <span style="margin-left:6px;color:#64748b;font-size:10px;">(${esc(sizeLabel)})</span>`
        : esc(src);
      rows.push(`<tr>
        <td>${esc(cat.label)}</td>
        <td><span style="display:inline-block;padding:2px 6px;border-radius:4px;font-size:10px;font-weight:700;background:${fileType === 'URL' ? '#dbeafe' : '#dcfce7'};color:${fileType === 'URL' ? '#1d4ed8' : '#166534'}">${esc(fileType)}</span></td>
        <td style="word-break:break-all">${srcCell}</td>
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

/** アプリID・ゲストIDは API の URL / クエリに入るため、数字だけを受け付ける。 */
export function assertNumericAppAndGuestId(appId: string, guestId: string, appLabel = 'アプリID'): void {
  if (!/^\d+$/.test(appId)) throw new Error(`${appLabel}は数値（半角数字）で入力してください`);
  if (guestId && !/^\d+$/.test(guestId)) throw new Error('ゲストスペースIDは半角数字で入力してください');
}

export async function runFetchJsConfigStandalone(p, setStatus, ui) {
  const appId = String(p.sourceAppId || '').trim();
  if (!appId) throw new Error('アプリIDを入力してください');
  const guestId = String(p.sourceGuestId || '').trim();
  assertNumericAppAndGuestId(appId, guestId);
  const isPreview = !!p.preview;
  const prefix = buildApiPrefix(guestId, isPreview);
  setStatus('JS/CSS設定を取得中...');
  const res = await apiGet(prefix, '/app/customize.json', { app: appId });
  const data = normalize(res);
  ui.setJson(JSON.stringify(data, null, 2));
  // 編集後の反映で、取得後の別更新を検出する基準にする
  ui.setRevision?.(pickRevision(res));
  ui.setCustomizeHtml(renderCustomizeResultHtml(data));
  setStatus(`JS/CSS設定を取得しました（アプリ: ${appId}${isPreview ? ' / プレビュー' : ''}）`);
}

export function runExportJsConfigStandalone(jsonText, sourceAppId, setStatus) {
  const text = String(jsonText || '').trim();
  if (!text) throw new Error('先にJS/CSS設定を取得してください');
  const parsed = JSON.parse(text);
  const appId = String(sourceAppId || '').trim();
  const filename = buildExportFilename('JS_CSS設定', 'json', { appLabel: appId ? `app${appId}` : undefined });
  downloadText(filename, JSON.stringify(parsed, null, 2), 'application/json');
  setStatus('JS/CSS設定JSONを保存しました');
}

const CUSTOMIZE_SCOPES = new Set(['ALL', 'ADMIN', 'NONE']);

export interface JsConfigApplyPlan {
  /** app/customize PUT に送る desktop/mobile（GET 専用の name/size 等は除去済み） */
  payload: Record<string, unknown>;
  /** 入力に有効な scope があればそのまま送る（無ければ反映先の現状維持） */
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
  const hasCustomizeKey = ['desktop', 'mobile', 'scope'].some((k) =>
    Object.prototype.hasOwnProperty.call(parsed, k)
  );
  if (!hasCustomizeKey) {
    throw new Error('JSONに desktop / mobile / scope キーが含まれていません。JS/CSS設定JSON（{ "desktop": {...}, "mobile": {...} }）を指定してください');
  }
  // 配列でない一覧は 0 件として扱われ、反映先の設定を黙って空にしてしまうため先に止める。
  for (const platform of ['desktop', 'mobile'] as const) {
    const section = parsed[platform];
    if (section == null) continue;
    if (typeof section !== 'object' || Array.isArray(section)) {
      throw new Error(`${platform} は { "js": [...], "css": [...] } 形式のオブジェクトで指定してください`);
    }
    for (const kind of ['js', 'css'] as const) {
      if (section[kind] != null && !Array.isArray(section[kind])) {
        throw new Error(`${platform}.${kind} は配列で指定してください`);
      }
    }
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

export interface JsConfigCurrentSummary {
  desktopJs: number;
  desktopCss: number;
  mobileJs: number;
  mobileCss: number;
  /** 反映後の一覧に含まれず、全置換で外れる現在のエントリ数（FILE は fileKey、URL は url で照合） */
  removed: number;
}

/** 反映先の現在設定（GET 応答）と反映計画から、現在の件数と外れる件数を数える。 */
export function summarizeJsConfigCurrent(current: any, plan: JsConfigApplyPlan): JsConfigCurrentSummary {
  const now = buildCustomizeSettingsPutPayload(current) as any;
  const keyOf = (r: any) => (r.type === 'FILE' ? `F:${r.file?.fileKey}` : `U:${r.url}`);
  let removed = 0;
  for (const platform of ['desktop', 'mobile'] as const) {
    for (const kind of ['js', 'css'] as const) {
      const next = new Set(((plan.payload as any)[platform]?.[kind] || []).map(keyOf));
      removed += ((now[platform]?.[kind] || []) as any[]).filter((r) => !next.has(keyOf(r))).length;
    }
  }
  return {
    desktopJs: now.desktop.js.length,
    desktopCss: now.desktop.css.length,
    mobileJs: now.mobile.js.length,
    mobileCss: now.mobile.css.length,
    removed
  };
}

export function buildJsConfigApplyConfirmText(targetAppId: string, targetGuestId: string, plan: JsConfigApplyPlan, current?: JsConfigCurrentSummary): string {
  const c = plan.counts;
  const nextTotal = c.desktopJs + c.desktopCss + c.mobileJs + c.mobileCss;
  const nowTotal = current ? current.desktopJs + current.desktopCss + current.mobileJs + current.mobileCss : 0;
  return [
    `反映先 App ${targetAppId}${targetGuestId ? `（ゲストスペース ${targetGuestId}）` : ''} のプレビューへ JS/CSS 設定を反映します。`,
    `Desktop JS ${c.desktopJs} / CSS ${c.desktopCss}、Mobile JS ${c.mobileJs} / CSS ${c.mobileCss}（URL ${c.url}件 / FILE ${c.file}件）${plan.scope ? ` / 適用範囲 ${plan.scope}` : ''}`,
    current ? `反映先の現在の設定: Desktop JS ${current.desktopJs} / CSS ${current.desktopCss}、Mobile JS ${current.mobileJs} / CSS ${current.mobileCss}` : '',
    nextTotal === 0 ? '⚠ 有効な JS/CSS 設定が 0 件のため、反映先の JS/CSS 設定はすべて外れます（0 件になります）。' : '',
    '反映先の JS/CSS 一覧はこの内容にすべて置き換わり、反映先だけにあるファイルは外れます。',
    current ? `この反映で外れる現在の設定: ${current.removed}件${current.removed && nowTotal && !nextTotal ? '（すべて外れます）' : ''}` : '',
    plan.dropped ? `type/url/fileKey が不足している ${plan.dropped}件は送信しません。` : '',
    c.file
      ? 'FILE タイプは反映先で有効なアップロード済み fileKey が必要です。他アプリの取得結果にある fileKey（ダウンロード用）をそのまま流用すると kintone に拒否されます。'
      : '',
    '本番には反映されません（管理画面から手動デプロイ）。実行しますか？'
  ].filter(Boolean).join('\n');
}

/** テキストエリアの文字列を解析して反映計画を作る（単一・複数の反映先で共通。API には触れない）。 */
export function parseJsConfigApplyText(jsonText: unknown): JsConfigApplyPlan {
  const text = String(jsonText || '').trim();
  if (!text) throw new Error('JS/CSS設定JSONを入力してください');
  let parsed: any;
  try {
    parsed = JSON.parse(text);
  } catch (e: any) {
    throw new Error(`JS/CSS設定JSONを解析できません（「整形」ボタンで位置を確認してください）: ${e?.message || String(e)}`);
  }
  return buildJsConfigApplyPlan(parsed);
}

export async function runApplyJsConfigStandalone(p, setStatus, setLogHtml) {
  const targetAppId = String(p.targetAppId || '').trim();
  if (!targetAppId) throw new Error('反映先アプリIDを入力してください');
  const guestId = String(p.targetGuestId || '').trim();
  assertNumericAppAndGuestId(targetAppId, guestId, '反映先アプリID');
  const plan = parseJsConfigApplyText(p.jsonText);
  const prefix = buildApiPrefix(guestId, true);

  setStatus('反映先の現在設定を確認中...');
  const current = await apiGet(prefix, '/app/customize.json', { app: targetAppId });
  const revision = pickRevision(current);
  if (!/^\d+$/.test(revision)) {
    throw new Error('反映先の JS/CSS 設定の revision を確認できないため反映を中止しました。最新の設定を取得し直してください');
  }

  const currentSummary = summarizeJsConfigCurrent(current, plan);
  // 反映先のプレビューを取得した JSON を編集して戻す場合は、取得時の revision を基準にする。
  // 反映直前に取り直した revision だけを使うと、取得後〜反映前の別更新を黙って上書きしてしまう。
  const baseRevision = String(p.baseRevision || '').trim();
  if (baseRevision && baseRevision !== revision) {
    const stale = new Error(`取得時の revision ${baseRevision} と現在の revision ${revision} が異なります`) as any;
    stale.code = 'GAIA_CO02';
    throw decorateRevisionConflict(stale, 'JS/CSS設定の反映');
  }

  if (!p.skipConfirm && !kusConfirm(buildJsConfigApplyConfirmText(targetAppId, guestId, plan, currentSummary))) {
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
    `置き換えにより外れた現在の設定 ${currentSummary.removed}件`,
    plan.dropped ? `送信対象外 ${plan.dropped}件（type/url/fileKey 不足）` : ''
  ].filter(Boolean);

  setLogHtml(`<pre style="margin:0;padding:10px;font-size:12px;white-space:pre-wrap">${esc(logs.join('\n'))}</pre>`);
  setStatus('JS/CSS設定反映完了');
  return { revision: pickRevision(res) };
}

// ===== 複数の反映先プレビューへまとめて反映 =====

export interface JsConfigMultiTarget { appId: string; guestId?: string; appName?: string }

export type JsConfigMultiStatus = 'success' | 'failed' | 'conflict' | 'notExecuted';

export interface JsConfigMultiTargetResult {
  appId: string;
  guestId: string;
  appName: string;
  status: JsConfigMultiStatus;
  /** 事前確認（現在の設定の取得）で止まった場合 true。この反映先には何も書き込んでいない */
  precheck?: boolean;
  /** 反映後の revision（成功時） */
  revision?: string;
  /** 失敗・競合の理由 */
  message?: string;
  /** この反映で外れた現在の設定の件数（成功時） */
  removed?: number;
}

export interface JsConfigMultiApplyResult {
  /** 最終確認で「いいえ」を選んだ。何も書き込んでいない */
  declined: boolean;
  /** 中止された（残りは notExecuted） */
  cancelled: boolean;
  results: JsConfigMultiTargetResult[];
  counts: { total: number; success: number; failed: number; conflict: number; notExecuted: number };
  /** 完了時のステータス行と色。declined の場合は空 */
  headline: string;
  tone: 'ok' | 'warn' | 'err' | 'info';
}

export const JS_CONFIG_MULTI_STATUS_LABEL: Record<JsConfigMultiStatus, string> = {
  success: '成功',
  failed: '失敗',
  conflict: '競合',
  notExecuted: '未実行（中止）'
};

/**
 * 複数の反映先へ同じ JSON を反映できない理由。FILE タイプの fileKey は取得元アプリの中でしか使えず、
 * 別アプリへ流用すると kintone に拒否される。空文字なら反映できる。
 */
export function jsConfigMultiTargetProblem(plan: JsConfigApplyPlan): string {
  if (!plan.counts.file) return '';
  return `JSON にアップロード済みファイル（FILE タイプ）の JS / CSS が ${plan.counts.file}件含まれているため、複数の反映先へはまとめて反映できません。` +
    'FILE タイプの fileKey は取得元のアプリでしか使えず、別のアプリへ反映すると kintone に拒否されます。' +
    'URL で指定した JS / CSS だけの JSON にするか、ファイルは「プレビュー反映」の別アプリの JS/CSS 転送で反映してください。';
}

function multiTargetLabel(t: { appId: string; guestId: string; appName?: string }): string {
  return `App ${t.appId}${t.appName ? `（${t.appName}）` : ''}${t.guestId ? ` / ゲストスペース ${t.guestId}` : ''}`;
}

function firstLine(message: unknown): string {
  return String((message as any)?.message ?? message ?? '不明なエラー').split('\n').map((l) => l.trim()).find(Boolean) || '不明なエラー';
}

export function renderJsConfigMultiResultHtml(res: JsConfigMultiApplyResult): string {
  const color: Record<JsConfigMultiStatus, string> = { success: '#15803d', failed: '#b91c1c', conflict: '#b45309', notExecuted: '#64748b' };
  const rows = res.results.map((r) => {
    const detail = r.status === 'success'
      ? `revision ${r.revision || '-'} / 外れた現在の設定 ${r.removed ?? 0}件`
      : (r.precheck && r.status === 'failed' ? '事前確認で失敗（書き込みなし）: ' : '') + (r.message || '');
    return `<tr><td style="padding:4px 6px;white-space:nowrap">${esc(multiTargetLabel(r))}</td>`
      + `<td style="padding:4px 6px;white-space:nowrap;font-weight:700;color:${color[r.status]}">${esc(JS_CONFIG_MULTI_STATUS_LABEL[r.status])}</td>`
      + `<td style="padding:4px 6px;word-break:break-all">${esc(detail)}</td></tr>`;
  }).join('');
  return `<div style="padding:8px 10px;font-size:12px;font-weight:700">${esc(res.headline)}</div>`
    + `<table style="width:100%;font-size:11px;border-collapse:collapse"><thead><tr><th style="text-align:left;padding:4px 6px">反映先</th><th style="text-align:left;padding:4px 6px">結果</th><th style="text-align:left;padding:4px 6px">内容</th></tr></thead><tbody>${rows}</tbody></table>`;
}

/**
 * 同じ JS/CSS 設定を、複数の反映先アプリのプレビューへ順に反映する（本番には反映しない）。
 *
 * 1. すべての反映先の現在の設定と revision を取得する（失敗した反映先は理由を残し、反映しない）。
 * 2. 件数・置き換わる内容・事前確認の失敗をまとめて 1 回だけ確認する。「いいえ」なら何も書き込まない。
 * 3. 事前確認で得た revision を送って 1 件ずつ反映する。競合・失敗は記録して次へ進み、中止されたら残りを「未実行（中止）」にする。
 *
 * @param p { targets: [{ appId, guestId?, appName? }], jsonText, skipConfirm? }
 */
export async function runApplyJsConfigMultiStandalone(
  p: { targets: JsConfigMultiTarget[]; jsonText: string; skipConfirm?: boolean },
  setStatus: (msg: string, err?: boolean) => void,
  setLogHtml: (html: string) => void
): Promise<JsConfigMultiApplyResult> {
  // 入力の検証（API を呼ぶ前に、すべての行を調べる）
  const seen = new Set<string>();
  const targets: Array<{ appId: string; guestId: string; appName: string }> = [];
  for (const raw of p.targets || []) {
    const appId = String(raw?.appId || '').trim();
    const guestId = String(raw?.guestId || '').trim();
    if (!appId && !guestId) continue;
    assertNumericAppAndGuestId(appId, guestId, `反映先アプリID（${appId || '未入力'}）`);
    const key = `${appId}::${guestId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    targets.push({ appId, guestId, appName: String(raw?.appName || '') });
  }
  if (!targets.length) throw new Error('まとめて反映する反映先を1件以上指定してください');
  const plan = parseJsConfigApplyText(p.jsonText);
  const problem = jsConfigMultiTargetProblem(plan);
  if (problem) throw new Error(problem);

  const total = targets.length;
  const results: JsConfigMultiTargetResult[] = [];
  const prechecked: Array<{ target: (typeof targets)[number]; revision: string; removed: number; nowTotal: number }> = [];

  // 1. 事前確認: 現在の設定と revision（書き込みは行わない。中止はそのまま呼び出し元へ）
  for (let i = 0; i < total; i++) {
    const target = targets[i];
    setStatus(`[${i + 1}/${total}] 反映先の現在設定を確認中: ${multiTargetLabel(target)}`);
    try {
      const current = await apiGet(buildApiPrefix(target.guestId, true), '/app/customize.json', { app: target.appId });
      const revision = pickRevision(current);
      if (!/^\d+$/.test(revision)) throw new Error('JS/CSS 設定の revision を確認できません');
      const summary = summarizeJsConfigCurrent(current, plan);
      prechecked.push({ target, revision, removed: summary.removed, nowTotal: summary.desktopJs + summary.desktopCss + summary.mobileJs + summary.mobileCss });
    } catch (e: any) {
      if (isCancelStop(e)) throw e;
      results.push({ ...target, status: 'failed', precheck: true, message: firstLine(e) });
    }
  }
  const precheckFailures = results.filter((r) => r.precheck);

  // 結果は入力順に並べる（全アプリを対象にしても並べ替えで全件を走査し直さない）
  const position = new Map(targets.map((t, i) => [`${t.appId}::${t.guestId}`, i]));
  const order = (r: { appId: string; guestId: string }) => position.get(`${r.appId}::${r.guestId}`) ?? -1;
  const finish = (declined: boolean, cancelled: boolean): JsConfigMultiApplyResult => {
    const counts = {
      total,
      success: results.filter((r) => r.status === 'success').length,
      failed: results.filter((r) => r.status === 'failed').length,
      conflict: results.filter((r) => r.status === 'conflict').length,
      notExecuted: results.filter((r) => r.status === 'notExecuted').length
    };
    const detail = `失敗 ${counts.failed}件 / 競合 ${counts.conflict}件${counts.notExecuted ? ` / 未実行（中止） ${counts.notExecuted}件` : ''}`;
    let headline = '';
    let tone: JsConfigMultiApplyResult['tone'] = 'ok';
    if (declined) {
      tone = 'info';
    } else if (cancelled) {
      const done = total - counts.notExecuted;
      headline = `${formatCancelledHeadline(done, total)}。` + (counts.success
        ? `反映済みの ${counts.success}件は取り消していません（${detail}）`
        : `何も反映していません（${detail}）`);
      tone = 'warn';
    } else if (counts.success === total) {
      headline = `${total}件の反映先プレビューへ JS/CSS 設定を反映しました（本番には反映していません）`;
    } else if (counts.success > 0) {
      headline = `${total}件中 ${counts.success}件を反映しました。${detail}（詳細は下のログ）`;
      tone = 'warn';
    } else {
      headline = `反映できた反映先がありません。${detail}（詳細は下のログ）`;
      tone = 'err';
    }
    results.sort((x, y) => order(x) - order(y));
    return { declined, cancelled, results, counts, headline, tone };
  };

  if (!prechecked.length) {
    // 反映できる反映先が 1 件もない: 確認も書き込みもせず、失敗の内訳を示す
    const res = finish(false, false);
    setLogHtml(renderJsConfigMultiResultHtml(res));
    return res;
  }

  // 2. 最終確認（1 回だけ）
  if (!p.skipConfirm) {
    const c = plan.counts;
    const removedTotal = prechecked.reduce((sum, t) => sum + t.removed, 0);
    const none = c.desktopJs + c.desktopCss + c.mobileJs + c.mobileCss === 0;
    const text = [
      `${prechecked.length}件の反映先プレビューへ、同じ JS/CSS 設定を反映します。`,
      `反映する内容: Desktop JS ${c.desktopJs} / CSS ${c.desktopCss}、Mobile JS ${c.mobileJs} / CSS ${c.mobileCss}（URL ${c.url}件）${plan.scope ? ` / 適用範囲 ${plan.scope}` : ' / 適用範囲は各反映先の現状維持'}`,
      none ? '⚠ 有効な JS/CSS 設定が 0 件のため、各反映先の JS/CSS 設定はすべて外れます（0 件になります）。' : null,
      '各反映先の JS/CSS 一覧はこの内容にすべて置き換わり、反映先だけにあるファイルは外れます。',
      `この反映で外れる現在の設定: 合計 ${removedTotal}件`,
      plan.dropped ? `type/url/fileKey が不足している ${plan.dropped}件は送信しません。` : null,
      '',
      `反映先（${prechecked.length}件）:`,
      summarizeList(prechecked.map((t) => `・${multiTargetLabel(t.target)}（現在 ${t.nowTotal}件 → 外れる ${t.removed}件）`)),
      precheckFailures.length ? '' : null,
      precheckFailures.length ? `現在の設定を確認できなかった ${precheckFailures.length}件は反映しません:` : null,
      precheckFailures.length ? summarizeList(precheckFailures.map((r) => `・${multiTargetLabel(r)}: ${r.message}`)) : null,
      '',
      '本番には反映されません（管理画面から手動デプロイ）。1件ずつ順に反映し、途中の失敗・競合では残りを続けます。実行しますか？'
    ].filter((line): line is string => line !== null).join('\n');
    if (!kusConfirm(text)) {
      setStatus('JS/CSS設定の複数反映をキャンセルしました（何も書き込んでいません）');
      return { declined: true, cancelled: false, results: [], counts: { total, success: 0, failed: 0, conflict: 0, notExecuted: 0 }, headline: '', tone: 'info' };
    }
  }

  // 3. 1 件ずつ反映（プレビューのみ。事前確認の revision を送り、外部の更新を上書きしない）
  let cancelled = false;
  for (let i = 0; i < prechecked.length; i++) {
    const { target, revision, removed } = prechecked[i];
    if (cancelled) {
      results.push({ ...target, status: 'notExecuted' });
      continue;
    }
    setStatus(`[${i + 1}/${prechecked.length}] 反映中: ${multiTargetLabel(target)}`);
    const body: Record<string, unknown> = { app: target.appId, ...plan.payload, revision };
    if (plan.scope) body.scope = plan.scope;
    try {
      throwIfCancelled();
      const res = await apiPut(buildApiPrefix(target.guestId, true), '/app/customize.json', body);
      results.push({ ...target, status: 'success', revision: pickRevision(res), removed });
    } catch (e: any) {
      if (isCancelStop(e)) {
        cancelled = true;
        results.push({ ...target, status: 'notExecuted' });
        continue;
      }
      const decorated = decorateRevisionConflict(e, 'JS/CSS設定の反映');
      results.push({ ...target, status: decorated?.revisionConflict ? 'conflict' : 'failed', message: firstLine(decorated) });
    }
  }

  const res = finish(false, cancelled);
  setLogHtml(renderJsConfigMultiResultHtml(res));
  setStatus(res.headline, res.tone === 'err' || res.tone === 'warn');
  return res;
}

export interface BatchJsConfigDownloadResult {
  apps: number;
  files: number;
  failed: number;
  /** customize.json 自体を取得できなかったアプリ */
  failedApps: Array<{ appId: string; name: string; reason: string }>;
  /** 個別ファイルを取得できなかったもの */
  failedFiles: Array<{ appId: string; fileName: string; reason: string }>;
  /** 利用者が中止した場合のみ。取得しなかった（中断した 1 件を含む）アプリ。失敗には数えない */
  notExecuted?: Array<{ appId: string; name: string }>;
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
  if (guestId && !/^\d+$/.test(guestId)) throw new Error('ゲストスペースIDは半角数字で入力してください');
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
    await sleepUnlessCancelled(150);
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
  const manifestApps: Array<{ appId: string; name: string; folder: string; scope: string; files: Array<{ entry: string; area: string; kind: string; name: string; fileKey: string; size: string }> }> = [];
  let fileCount = 0;
  /** 中止で止めたアプリの位置。-1 は最後まで実行した。 */
  let stoppedAt = -1;

  for (let i = 0; i < apps.length; i++) {
    const app = apps[i];
    const safeName = sanitizeFolderName(app.name) || `app${app.appId}`;
    // apps.json に spaceId が付くのはゲストスペース所属アプリではなく通常スペースのアプリなので、
    // ゲスト prefix は利用者が指定した guestId からのみ決める。
    setStatus(`[${i + 1}/${apps.length}] アプリ "${safeName}" (${app.appId}) をチェック...`);

    let customize: any = null;
    try {
      customize = await apiGet(baseListPrefix, '/app/customize.json', { app: app.appId });
    } catch (e: any) {
      if (isCancelStop(e)) { stoppedAt = i; break; }
      failedApps.push({ appId: app.appId, name: app.name, reason: e?.message || String(e) });
      continue;
    }

    const files = (['desktop', 'mobile'] as const).flatMap((area) =>
      (['js', 'css'] as const).flatMap((kind) => ((customize?.[area]?.[kind] || []) as any[]).map((f: any) => ({ ...f, area, kind })))
    );
    const fileTargets = files.filter((f: any) => f?.type === 'FILE' && f?.file?.fileKey);
    if (!fileTargets.length) continue;

    const folderName = guestId ? `guest${guestId}_${app.appId}_${safeName}` : `${app.appId}_${safeName}`;
    const used = new CaseInsensitiveNameSet();
    const manifestFiles: (typeof manifestApps)[number]['files'] = [];
    const fetched: Array<{ entry: string; blob: Blob }> = [];
    const appFailures: BatchJsConfigDownloadResult['failedFiles'] = [];
    let interrupted = false;

    for (const file of fileTargets) {
      const fileName = String(file.file.name || `${file.file.fileKey}.bin`);
      let result: Awaited<ReturnType<typeof downloadFileBlobForJsConfig>>;
      try {
        result = await downloadFileBlobForJsConfig(baseListPrefix, file.file.fileKey);
      } catch (e) {
        if (!isCancelStop(e)) throw e;
        interrupted = true;
        break;
      }
      if (result.ok === true) {
        // desktop/mobile で同名ファイルがあっても上書きしない
        const entry = uniqueZipEntryName(used, sanitizeFolderName(fileName) || 'file.bin');
        fetched.push({ entry, blob: result.blob });
        manifestFiles.push({ entry: `${folderName}/${entry}`, area: file.area, kind: file.kind, name: fileName, fileKey: String(file.file.fileKey), size: String(file.file.size ?? '') });
      } else {
        appFailures.push({ appId: app.appId, fileName, reason: result.reason });
      }
    }
    // 途中で中止したアプリは一部のファイルだけが入った状態になるため、ZIP にも manifest にも入れない。
    if (interrupted) { stoppedAt = i; break; }
    const appFolder = zip.folder(folderName);
    for (const item of fetched) appFolder.file(item.entry, item.blob);
    fileCount += fetched.length;
    failedFiles.push(...appFailures);
    manifestApps.push({ appId: String(app.appId), name: String(app.name || ''), folder: folderName, scope: String(customize?.scope || ''), files: manifestFiles });
    await sleepUnlessCancelled(80);
  }

  const failed = failedApps.length + failedFiles.length;
  const notExecuted = stoppedAt >= 0 ? apps.slice(stoppedAt).map((a) => ({ appId: a.appId, name: a.name })) : [];
  const notExecutedLabels = notExecuted.map((a) => `app ${a.appId}${a.name ? ` ${a.name}` : ''}`);
  if (stoppedAt >= 0 && !fileCount) {
    // 保存できる JS/CSS が 1 件も無いので ZIP は作らない。失敗の内訳はログへ出す
    throw createCancelReport(stoppedAt, apps.length, [
      ...failedApps.map((a) => `app ${a.appId} ${a.name}: customize.json 取得失敗: ${a.reason}`),
      ...failedFiles.map((f) => `app ${f.appId} ${f.fileName}: ${f.reason}`),
      `未実行（中止）: ${notExecutedLabels.join(', ')}`,
      'ZIP は保存していません'
    ]);
  }
  if (!fileCount) {
    if (!failed) {
      setStatus(`対象ファイルがありません。（${apps.length}アプリを確認 / FILE 形式の JS/CSS はありませんでした）`);
      return { apps: apps.length, files: 0, failed, failedApps, failedFiles };
    }
    // ZIP を作らないため、失敗の内訳はエラー詳細としてログへ出す
    const detail = [
      ...failedApps.map((a) => `app ${a.appId} ${a.name}: customize.json 取得失敗: ${a.reason}`),
      ...failedFiles.map((f) => `app ${f.appId} ${f.fileName}: ${f.reason}`)
    ];
    throw new Error([`ZIP を作成できませんでした。取得できた JS/CSS ファイルがありません（取得失敗: アプリ ${failedApps.length} / ファイル ${failedFiles.length}）`, ...detail].join('\n'));
  }

  if (failed || notExecuted.length) {
    const lines = [
      `取得できなかった項目 ${failed}件`,
      ...failedApps.map((a) => `app ${a.appId}\t${a.name}\tcustomize.json 取得失敗: ${a.reason}`),
      ...failedFiles.map((f) => `app ${f.appId}\t${f.fileName}\t${f.reason}`),
      ...(notExecuted.length ? [`未実行（中止） ${notExecuted.length}アプリ（利用者の操作で中止）`, ...notExecuted.map((a) => `app ${a.appId}\t${a.name}\t未実行（中止）`)] : [])
    ];
    zip.file('download_errors.txt', lines.join('\n') + '\n');
  }

  // どのアプリのどの読み込み枠（PC/モバイル × JS/CSS）から取ったファイルかを ZIP 内に残す
  zip.file('manifest.json', JSON.stringify({
    generatedAt: new Date().toISOString(),
    guestId: guestId || '',
    appCount: apps.length,
    fileCount,
    apps: manifestApps,
    failedApps,
    failedFiles,
    ...(notExecuted.length ? { cancelled: true, notExecuted } : {}),
    note: 'URL 形式の JS/CSS は含みません。entry は ZIP 内のパス、area は desktop/mobile、kind は js/css です。'
  }, null, 2));

  setStatus('ZIPファイル作成中...');
  const zipBlob = await zip.generateAsync({ type: 'blob' });
  downloadBlob(`customize_scripts_${nowStamp()}.zip`, zipBlob);

  if (notExecuted.length) {
    setStatus(
      `${formatCancelledHeadline(stoppedAt, apps.length)}。取得済みの ${fileCount}ファイルだけを保存しました（取得失敗 ${failed}件、未実行（中止） ${notExecuted.length}アプリ、詳細は download_errors.txt）`,
      true
    );
    return { apps: apps.length, files: fileCount, failed, failedApps, failedFiles, notExecuted };
  }
  setStatus(
    `JS/CSS一括DL完了（${apps.length}アプリ / ${fileCount}ファイル / 取得失敗 ${failed}件${failed ? '、詳細は download_errors.txt' : ''}）`,
    failed > 0
  );
  return { apps: apps.length, files: fileCount, failed, failedApps, failedFiles };
}
