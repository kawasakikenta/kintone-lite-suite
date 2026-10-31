'use strict';

import { META_KEYS, TOOL_ID } from './constants.js';

/** ツールの UI が載っているウィンドウ（ポップアウト先があればそちら、無ければ現在の window） */
export function getToolWindowSafe(): Window {
  try {
    const popWin = window.__KUS_TOOL_WINDOW__;
    if (popWin && !popWin.closed && popWin.document) return popWin;
  } catch (e) { /* ignore */ }
  return window;
}

function getToolDocumentSafe(): Document {
  try { return getToolWindowSafe().document || document; } catch (e) { return document; }
}

function getToolRootSafe(): HTMLElement | null {
  try {
    const doc = getToolDocumentSafe();
    return doc.getElementById(TOOL_ID) || null;
  } catch (e) { return null; }
}

/** confirm をツールウィンドウ（ポップアウト）で実行する */
export function kusConfirm(message: string): boolean {
  try { return getToolWindowSafe().confirm(message); }
  catch (e) { return window.confirm(message); }
}

export function esc(s: unknown): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const HTML_ENTITY_NAMES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' '
};

export function decodeHtmlEntities(value: unknown): string {
  let text = String(value ?? '');
  if (!text.includes('&')) return text;

  for (let i = 0; i < 3; i += 1) {
    const next = text.replace(/&(#(\d+)|#x([0-9a-f]+)|[a-z][a-z0-9]+);/gi, (match, token, dec, hex) => {
      if (dec) {
        const codePoint = Number(dec);
        return Number.isFinite(codePoint) && codePoint >= 0 && codePoint <= 0x10ffff
          ? String.fromCodePoint(codePoint)
          : match;
      }
      if (hex) {
        const codePoint = Number.parseInt(hex, 16);
        return Number.isFinite(codePoint) && codePoint >= 0 && codePoint <= 0x10ffff
          ? String.fromCodePoint(codePoint)
          : match;
      }
      const named = HTML_ENTITY_NAMES[String(token).toLowerCase()];
      return named ?? match;
    });
    if (next === text) break;
    text = next;
  }
  return text;
}

export function stripHtmlToText(value: unknown): string {
  let text = decodeHtmlEntities(value);
  if (!/[<>]/.test(text)) return text;
  text = text
    .replace(/<\s*br\s*\/?\s*>/gi, '\n')
    .replace(/<\s*\/\s*(p|div|li|tr|h[1-6])\s*>/gi, '\n')
    .replace(/<\s*\/?\s*[a-z][^>]*>/gi, '');
  return decodeHtmlEntities(text).replace(/\n{3,}/g, '\n\n').trim();
}

export function safeJsonForScript(v: unknown): string {
  return JSON.stringify(v)
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

/** 確認画面・確認ダイアログの一覧に載せる件数の既定値。全アプリを対象にしても一覧が長くなりすぎないようにする。 */
export const SUMMARY_LIST_LIMIT = 20;

/**
 * 対象の一覧を 1 つの文字列にする。limit 件を超える分は「…ほか N 件（合計 M 件）」にまとめる
 * （件数は隠さず示す）。
 */
export function summarizeList(lines: string[], limit = SUMMARY_LIST_LIMIT): string {
  const items = lines.filter(Boolean);
  if (items.length <= limit) return items.join('\n');
  return [...items.slice(0, limit), `…ほか ${items.length - limit} 件（合計 ${items.length} 件）`].join('\n');
}

export function deepClone<T>(v: T): T {
  return v == null ? v : JSON.parse(JSON.stringify(v));
}

export function normalize(v: any): any {
  if (Array.isArray(v)) return v.map(normalize);
  if (v && typeof v === 'object') {
    const o: Record<string, any> = {};
    Object.keys(v).sort().forEach((k) => {
      if (META_KEYS.has(k)) return;
      o[k] = normalize(v[k]);
    });
    return o;
  }
  return v;
}

/**
 * 設定APIの応答メタ情報だけを除去する。内部のキーはフィールドコード・状態名・
 * プラグイン設定などの利用者データなので、メタ情報と同名でも保持する。
 * normalize()/stableStringify() の共有契約とは分けて、セクション単位で呼ぶ。
 */
export function normalizeSettingsSection(value: any): any {
  const sortValue = (current: any, responseRoot = false): any => {
    if (Array.isArray(current)) return current.map((item) => sortValue(item));
    if (current && typeof current === 'object') {
      return Object.fromEntries(Object.keys(current).sort()
        .filter((key) => !responseRoot || !META_KEYS.has(key))
        .map((key) => [key, sortValue(current[key])]));
    }
    return current;
  };
  return sortValue(value, true);
}

export function stableStringify(v: unknown): string {
  return JSON.stringify(normalize(v));
}

/**
 * normalize を介した値同士の同値性比較。
 * 配列・オブジェクトのキー順序差・META_KEYS は無視する。
 * セクションエディタ等で個別に書かれていた deepEqual の置き換え用。
 */
export function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a == null || b == null) return a === b;
  if (typeof a !== 'object' || typeof b !== 'object') return false;
  return stableStringify(a) === stableStringify(b);
}

/** diff/reflect 共通: 行パスからセクション接頭辞を除いた相対パス */
export function relativePathFromRow(path: string, secKey: string): string | null {
  if (!path) return '';
  if (path === secKey) return '';
  if (path.startsWith(`${secKey}.`)) return path.slice(secKey.length + 1);
  if (path.startsWith(`${secKey}[`)) return path.slice(secKey.length);
  return null;
}

export function tokenizePath(path: string): Array<string | number> {
  if (!path) return [];
  const out: Array<string | number> = [];
  const re = /([^[.\]]+)|\[(\d+)\]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(path)) !== null) {
    if (m[1] != null) out.push(m[1]);
    else out.push(Number(m[2]));
  }
  return out;
}

export function compactForLog(value: unknown, max: number = 220): string {
  try {
    const raw = typeof value === 'string' ? value : JSON.stringify(value);
    if (!raw) return '';
    return raw.length > max ? `${raw.slice(0, max)}...` : raw;
  } catch (e) {
    const raw = String(value ?? '');
    return raw.length > max ? `${raw.slice(0, max)}...` : raw;
  }
}

export interface ApiErrorMeta {
  method?: string;
  prefix?: string;
  path?: string;
  payload?: any;
}

export interface ApiDiagError extends Error {
  __apiDiag: true;
  original?: unknown;
  code?: string;
  id?: string;
}

const MAX_API_FIELD_ERRORS = 5;

/** kintone が項目ごとに返す拒否理由（errors）を、利用者が読める行にする。 */
function formatApiFieldErrors(errors: unknown): string[] {
  if (!errors || typeof errors !== 'object') return [];
  const lines = Object.entries(errors as Record<string, any>).flatMap(([key, value]) =>
    (Array.isArray(value?.messages) ? value.messages : []).map((message: unknown) => `${key}: ${String(message)}`));
  const shown = lines.slice(0, MAX_API_FIELD_ERRORS);
  if (lines.length > shown.length) shown.push(`ほか ${lines.length - shown.length} 件`);
  return shown;
}

export function apiErrorWithContext(err: any, meta: ApiErrorMeta): ApiDiagError {
  if (err && err.__apiDiag) return err as ApiDiagError;
  const method = meta?.method || 'GET';
  const prefix = meta?.prefix || '';
  const path = meta?.path || '';
  const bodyOrParams = meta?.payload;
  const app = bodyOrParams?.app ?? bodyOrParams?.id ?? bodyOrParams?.apps?.[0] ?? '';
  const bodySummary = compactForLog(bodyOrParams);
  const endpoint = `${prefix}${path}`;
  const contextLine = `[API] ${method} ${endpoint}${app ? ` app=${app}` : ''}${bodySummary ? ` payload=${bodySummary}` : ''}`;
  const baseMessage = err?.message || String(err);
  const wrapped = new Error([baseMessage, ...formatApiFieldErrors(err?.errors), contextLine].join('\n')) as ApiDiagError;
  wrapped.__apiDiag = true;
  wrapped.original = err;
  if (err?.code) wrapped.code = err.code;
  if (err?.id) wrapped.id = err.id;
  if (err?.stack) wrapped.stack = err.stack;
  return wrapped;
}

export interface FlatCategory { name: string; path: string; index: string }

/**
 * カテゴリーの階層を表示順に平坦化する。
 * kintone の応答は名前をキーにしたオブジェクトで、階層は children に入る。以前の設定JSON向けに配列も受け付ける。
 */
export function flattenCategories(categories: unknown): FlatCategory[] {
  const out: FlatCategory[] = [];
  const walk = (value: unknown, parent: string) => {
    const isList = Array.isArray(value);
    const entries: Array<[string, any]> = isList
      ? (value as any[]).map((item) => ['', item])
      : value && typeof value === 'object' ? Object.entries(value as Record<string, any>) : [];
    if (!isList) entries.sort((a, b) => Number(a[1]?.index ?? 0) - Number(b[1]?.index ?? 0));
    for (const [key, item] of entries) {
      const name = typeof item === 'string' ? item : String(item?.name || item?.label || item?.code || key || '').trim();
      if (!name) continue;
      const path = parent ? `${parent} > ${name}` : name;
      out.push({ name, path, index: String(item?.index ?? '') });
      if (item && typeof item === 'object') walk(item.children, path);
    }
  };
  walk(categories, '');
  return out;
}

export function nowStamp(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  // 日付＋時刻＋秒（YYYYMMDD_HHMMSS）。同一分内に複数回出力してもファイル名が衝突しないよう秒まで含める。
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

export function sanitizeFilenamePart(value: unknown, fallback: string = '不明'): string {
  const text = String(value || '').trim();
  const cleaned = text
    .replace(/[\\/:*?"<>|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned || fallback;
}

export function extractAppNameFromBundle(bundle: any): string {
  const appSettings = bundle?.sections?.appSettings;
  const candidates = [
    appSettings?.name,
    appSettings?.app?.name,
    appSettings?.general?.name,
    bundle?.meta?.appName,
    bundle?.appName
  ];
  const found = candidates.find((item) => String(item || '').trim());
  return found ? String(found).trim() : '';
}

export function buildAppFilenameLabel(appId: unknown, appName: unknown): string {
  const id = String(appId || '').trim();
  const name = String(appName || '').trim();
  if (name && id) return `${sanitizeFilenamePart(name)}(app${sanitizeFilenamePart(id)})`;
  if (name) return sanitizeFilenamePart(name);
  if (id) return `app${sanitizeFilenamePart(id)}`;
  return '';
}

/** バンドルからファイル名用ラベル（アプリ名(appID)）を組み立てる。 */
export function appLabelFromBundle(bundle: any): string {
  return buildAppFilenameLabel(bundle?.appId, extractAppNameFromBundle(bundle));
}

export interface BuildExportFilenameOptions {
  timestamp?: string;
  appLabel?: string;
  suffix?: string;
}

export function buildExportFilename(baseLabel: unknown, ext: string, options: BuildExportFilenameOptions = {}): string {
  const normalizedExt = String(ext || '').replace(/^\./, '').trim() || 'txt';
  const base = sanitizeFilenamePart(baseLabel, '出力');
  const stamp = options.timestamp || nowStamp();
  const appLabel = String(options.appLabel || '').trim();
  const suffix = String(options.suffix || '').trim();
  const parts = [base];
  if (appLabel) parts.push(sanitizeFilenamePart(appLabel));
  if (suffix) parts.push(sanitizeFilenamePart(suffix));
  parts.push(sanitizeFilenamePart(stamp, nowStamp()));
  return `${parts.join('_')}.${normalizedExt}`;
}

export function getIssueSideLabel(side: string): string {
  if (side === 'source') return '比較元';
  if (side === 'target') return '比較先';
  if (side === 'both') return '両方';
  return String(side || '-');
}

export function getPreviewStateLabel(preview: unknown): string {
  return preview ? 'プレビュー' : '本番';
}

export function getThemeDisplayLabel(theme: string): string {
  return theme === 'dark' ? 'ダーク' : 'ライト';
}

export function getDiffTypeDisplayLabel(type: string, options: { moved?: boolean } = {}): string {
  const map: Record<string, string> = {
    added: '追加',
    removed: '削除',
    changed: '変更',
    moved: '移動',
    same: '同一'
  };
  const base = map[type] || String(type || '-');
  return options.moved && type !== 'moved' ? `${base}(移動)` : base;
}

// === Section icon system (S10) ===
const SECTION_ICONS: Record<string, string> = {
  fieldSettings: '▦',
  layoutSettings: '☰',
  formSettings: '▤',
  viewSettings: '⌗',
  reportSettings: '📊',
  processSettings: '⇄',
  actionSettings: '⇒',
  pluginSettings: '◆',
  customizeSettings: '</>',
  appAcl: '🔒',
  fieldAcl: '🔒',
  recordPermissions: '🔒',
  notifications: '🔔',
  perRecordNotifications: '🔔',
  reminderNotifications: '⏰',
  categories: '☷',
  appSettings: '⚙',
  appInfo: 'ⓘ'
};

export function getSectionIconChar(sectionKey: string): string {
  return SECTION_ICONS[String(sectionKey || '')] || '·';
}

export function renderSectionIconHtml(sectionKey: string, options: { withTooltip?: string } = {}): string {
  const ch = getSectionIconChar(sectionKey);
  const tip = options.withTooltip ? ` title="${esc(options.withTooltip)}"` : '';
  return `<span class="sec-icon" data-section="${esc(sectionKey || '')}"${tip} aria-hidden="true">${esc(ch)}</span>`;
}

export function getSeverityDisplayLabel(severity: string): string {
  if (severity === 'high') return '高';
  if (severity === 'medium') return '中';
  if (severity === 'low') return '低';
  return String(severity || '-');
}

function triggerDownload(filename: string, blob: Blob): void {
  const doc = getToolDocumentSafe();
  const win = getToolWindowSafe();
  const url = URL.createObjectURL(blob);
  const a = doc.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  doc.body.appendChild(a);
  a.click();
  win.setTimeout(() => {
    try { URL.revokeObjectURL(url); } catch (e) { /* ignore */ }
    try { a.remove(); } catch (e) { /* ignore */ }
  }, 0);
}

export function downloadText(filename: string, text: string, type?: string): void {
  triggerDownload(filename, new Blob([text], { type: type || 'text/plain' }));
}

export function downloadBlob(filename: string, blob: Blob): void {
  triggerDownload(filename, blob);
}

export function selectedScopeKeys(container: ParentNode): string[] {
  return [...container.querySelectorAll<HTMLInputElement>('input[type="checkbox"]:checked')].map((x) => x.value);
}

export function readTextFile(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result || ''));
    r.onerror = () => reject(r.error || new Error('ファイル読み込みに失敗しました'));
    r.readAsText(file, 'utf-8');
  });
}

/**
 * ツールダイアログ内に表示される軽量トースト。
 * Toastify を使わず、ポップアウト先のウィンドウに追従するよう自前で描画する。
 * （以前の実装では Toastify が元ウィンドウの document.body に追加され、元画面側に通知が出てしまっていた）
 */
export async function showToast(message: unknown, type: string = 'info'): Promise<void> {
  try {
    const doc = getToolDocumentSafe();
    const win = getToolWindowSafe();
    const root = getToolRootSafe() || doc.body;
    if (!root) {
      console.log(`[Toast ${type}] ${message}`);
      return;
    }
    let container = doc.getElementById('u_toastContainer');
    if (!container) {
      container = doc.createElement('div');
      container.id = 'u_toastContainer';
      container.className = 'kus-toast-container';
      root.appendChild(container);
    }

    const toast = doc.createElement('div');
    toast.className = `kus-toast kus-toast--${type}`;
    toast.setAttribute('role', type === 'error' || type === 'warn' ? 'alert' : 'status');

    const msg = doc.createElement('span');
    msg.className = 'kus-toast-msg';
    msg.textContent = String(message ?? '');
    toast.appendChild(msg);

    const closeBtn = doc.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'kus-toast-close';
    closeBtn.setAttribute('aria-label', '閉じる');
    closeBtn.textContent = '×';
    toast.appendChild(closeBtn);

    container.appendChild(toast);

    const duration = type === 'error' ? 5000 : 3000;
    let dismissTimer = 0;
    const dismiss = () => {
      if (dismissTimer) { try { win.clearTimeout(dismissTimer); } catch (e) { /* ignore */ } dismissTimer = 0; }
      toast.classList.add('kus-toast--leaving');
      try {
        win.setTimeout(() => { try { toast.remove(); } catch (e) { /* ignore */ } }, 220);
      } catch (e) {
        try { toast.remove(); } catch (e2) { /* ignore */ }
      }
    };
    closeBtn.addEventListener('click', dismiss);
    try { dismissTimer = win.setTimeout(dismiss, duration); } catch (e) { /* ignore */ }
  } catch (err) {
    console.log(`[Toast ${type}] ${message}`);
  }
}

// ===== Clipboard =====

function legacyCopy(text: string): boolean {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.setAttribute('readonly', '');
  ta.setAttribute('aria-hidden', 'true');
  ta.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;pointer-events:none';
  document.body.appendChild(ta);
  ta.select();
  let ok = false;
  try { ok = document.execCommand('copy'); } catch { ok = false; }
  ta.remove();
  return ok;
}

/**
 * テキストをクリップボードへ書き込む。Clipboard API が使えない環境（権限なし・非セキュアコンテキスト）では
 * 選択＋execCommand へフォールバックし、成否を返す。
 */
export async function copyTextToClipboard(text: string): Promise<boolean> {
  if (!text) return false;
  const clip = typeof navigator !== 'undefined' ? navigator.clipboard : undefined;
  if (clip && typeof clip.writeText === 'function') {
    try {
      await clip.writeText(text);
      return true;
    } catch { /* フォールバックへ */ }
  }
  return legacyCopy(text);
}
