'use strict';

import { META_KEYS, EXTERNAL_LIBRARIES, TOOL_ID } from './constants.js';

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

/** alert をツールウィンドウ（ポップアウト）で実行する */
export function kusAlert(message: string): void {
  try { return getToolWindowSafe().alert(message); }
  catch (e) { return window.alert(message); }
}

/** confirm をツールウィンドウ（ポップアウト）で実行する */
export function kusConfirm(message: string): boolean {
  try { return getToolWindowSafe().confirm(message); }
  catch (e) { return window.confirm(message); }
}

/** prompt をツールウィンドウ（ポップアウト）で実行する */
export function kusPrompt(message: string, defaultValue: string = ''): string | null {
  try { return getToolWindowSafe().prompt(message, defaultValue); }
  catch (e) { return window.prompt(message, defaultValue); }
}

export function esc(s: unknown): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function safeJsonForScript(v: unknown): string {
  return JSON.stringify(v)
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
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

export function stableStringify(v: unknown): string {
  return JSON.stringify(normalize(v));
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
  const wrapped = new Error(`${baseMessage}\n${contextLine}`) as ApiDiagError;
  wrapped.__apiDiag = true;
  wrapped.original = err;
  if (err?.code) wrapped.code = err.code;
  if (err?.id) wrapped.id = err.id;
  if (err?.stack) wrapped.stack = err.stack;
  return wrapped;
}

export function nowStamp(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}`;
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

export function getOnOffDisplayLabel(value: unknown): string {
  return value ? 'ON' : 'OFF';
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

export function getSeverityDisplayLabel(severity: string): string {
  if (severity === 'high') return '高';
  if (severity === 'medium') return '中';
  if (severity === 'low') return '低';
  return String(severity || '-');
}

function triggerDownload(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  window.setTimeout(() => {
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




const loadedScripts: WeakMap<Document, Set<string>> = new WeakMap();
const loadedStyles: WeakMap<Document, Set<string>> = new WeakMap();
const loadingScripts: WeakMap<Document, Map<string, Promise<void>>> = new WeakMap();
const loadingStyles: WeakMap<Document, Map<string, Promise<void>>> = new WeakMap();

function normalizeResourceDocument(doc: Document | null | undefined): Document {
  return doc && typeof doc.createElement === 'function' ? doc : document;
}

function getWeakSet(map: WeakMap<Document, Set<string>>, doc: Document): Set<string> {
  let set = map.get(doc);
  if (!set) {
    set = new Set();
    map.set(doc, set);
  }
  return set;
}

function getWeakMap(map: WeakMap<Document, Map<string, Promise<void>>>, doc: Document): Map<string, Promise<void>> {
  let inner = map.get(doc);
  if (!inner) {
    inner = new Map();
    map.set(doc, inner);
  }
  return inner;
}

function waitForScriptLoad(existingScript: HTMLScriptElement, url: string): Promise<void> {
  const doc = normalizeResourceDocument(existingScript?.ownerDocument);
  const docLoadedScripts = getWeakSet(loadedScripts, doc);
  if (existingScript.dataset.kusLoaded === 'true') {
    docLoadedScripts.add(url);
    return Promise.resolve();
  }
  const rs = (existingScript as any).readyState;
  if (rs === 'loaded' || rs === 'complete') {
    docLoadedScripts.add(url);
    existingScript.dataset.kusLoaded = 'true';
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    const onLoad = () => {
      cleanup();
      docLoadedScripts.add(url);
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error(`Failed to load script: ${url}`));
    };
    const cleanup = () => {
      existingScript.removeEventListener('load', onLoad);
      existingScript.removeEventListener('error', onError);
    };
    existingScript.addEventListener('load', onLoad, { once: true });
    existingScript.addEventListener('error', onError, { once: true });
  });
}

function waitForStyleLoad(existingLink: HTMLLinkElement, url: string): Promise<void> {
  const doc = normalizeResourceDocument(existingLink?.ownerDocument);
  const docLoadedStyles = getWeakSet(loadedStyles, doc);
  if (existingLink.dataset.kusLoaded === 'true') {
    docLoadedStyles.add(url);
    return Promise.resolve();
  }
  if (existingLink.sheet) {
    docLoadedStyles.add(url);
    existingLink.dataset.kusLoaded = 'true';
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    const onLoad = () => {
      cleanup();
      docLoadedStyles.add(url);
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error(`Failed to load style: ${url}`));
    };
    const cleanup = () => {
      existingLink.removeEventListener('load', onLoad);
      existingLink.removeEventListener('error', onError);
    };
    existingLink.addEventListener('load', onLoad, { once: true });
    existingLink.addEventListener('error', onError, { once: true });
  });
}

export interface LoadResourceOptions {
  document?: Document;
  doc?: Document;
}

export function loadExternalScript(url: string, options: LoadResourceOptions = {}): Promise<void> {
  if (!url) return Promise.resolve();
  const doc = normalizeResourceDocument(options.document || options.doc);
  const docLoadedScripts = getWeakSet(loadedScripts, doc);
  const docLoadingScripts = getWeakMap(loadingScripts, doc);
  if (docLoadedScripts.has(url)) return Promise.resolve();
  const inflight = docLoadingScripts.get(url);
  if (inflight) return inflight;

  const existingScript = doc.querySelector<HTMLScriptElement>(`script[src="${url}"]`);
  if (existingScript) {
    const promise = waitForScriptLoad(existingScript, url).finally(() => {
      docLoadingScripts.delete(url);
    });
    docLoadingScripts.set(url, promise);
    return promise;
  }

  const promise = new Promise<void>((resolve, reject) => {
    const script = doc.createElement('script');
    script.src = url;
    script.onload = () => {
      docLoadedScripts.add(url);
      script.dataset.kusLoaded = 'true';
      resolve();
    };
    script.onerror = () => reject(new Error(`Failed to load script: ${url}`));
    doc.head.appendChild(script);
  }).finally(() => {
    docLoadingScripts.delete(url);
  });
  docLoadingScripts.set(url, promise);
  return promise;
}

export function loadExternalStyle(url: string, options: LoadResourceOptions = {}): Promise<void> {
  if (!url) return Promise.resolve();
  const doc = normalizeResourceDocument(options.document || options.doc);
  const docLoadedStyles = getWeakSet(loadedStyles, doc);
  const docLoadingStyles = getWeakMap(loadingStyles, doc);
  if (docLoadedStyles.has(url)) return Promise.resolve();
  const inflight = docLoadingStyles.get(url);
  if (inflight) return inflight;

  const existingLink = doc.querySelector<HTMLLinkElement>(`link[href="${url}"]`);
  if (existingLink) {
    const promise = waitForStyleLoad(existingLink, url).finally(() => {
      docLoadingStyles.delete(url);
    });
    docLoadingStyles.set(url, promise);
    return promise;
  }

  const promise = new Promise<void>((resolve, reject) => {
    const link = doc.createElement('link');
    link.rel = 'stylesheet';
    link.href = url;
    link.onload = () => {
      docLoadedStyles.add(url);
      link.dataset.kusLoaded = 'true';
      resolve();
    };
    link.onerror = () => reject(new Error(`Failed to load style: ${url}`));
    doc.head.appendChild(link);
  }).finally(() => {
    docLoadingStyles.delete(url);
  });
  docLoadingStyles.set(url, promise);
  return promise;
}

export async function loadExternalLibrary(name: string, options: LoadResourceOptions = {}): Promise<void> {
  const lib = (EXTERNAL_LIBRARIES as Record<string, any>)[name];
  if (!lib) throw new Error(`Unknown external library: ${name}`);
  const doc = normalizeResourceDocument(options.document || options.doc);
  const stylePromise = lib.cssUrl ? loadExternalStyle(lib.cssUrl, { document: doc }) : Promise.resolve();
  let scriptPromise: Promise<void> = Promise.resolve();
  if (lib.cdnUrl) {
    scriptPromise = loadExternalScript(lib.cdnUrl, { document: doc }).catch((err) => {
      if (lib.altCdnUrl) return loadExternalScript(lib.altCdnUrl, { document: doc });
      throw err;
    });
  }
  await Promise.all([stylePromise, scriptPromise]);
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
