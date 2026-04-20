'use strict';

import { META_KEYS, EXTERNAL_LIBRARIES, TOOL_ID } from './constants.js';

/** ツールの UI が載っているウィンドウ（ポップアウト先があればそちら、無ければ現在の window） */
export function getToolWindowSafe() {
  try {
    const popWin = window.__KUS_TOOL_WINDOW__;
    if (popWin && !popWin.closed && popWin.document) return popWin;
  } catch (e) { /* ignore */ }
  return window;
}

function getToolDocumentSafe() {
  try { return getToolWindowSafe().document || document; } catch (e) { return document; }
}

function getToolRootSafe() {
  try {
    const doc = getToolDocumentSafe();
    return doc.getElementById(TOOL_ID) || null;
  } catch (e) { return null; }
}

/** alert をツールウィンドウ（ポップアウト）で実行する */
export function kusAlert(message) {
  try { return getToolWindowSafe().alert(message); }
  catch (e) { return window.alert(message); }
}

/** confirm をツールウィンドウ（ポップアウト）で実行する */
export function kusConfirm(message) {
  try { return getToolWindowSafe().confirm(message); }
  catch (e) { return window.confirm(message); }
}

/** prompt をツールウィンドウ（ポップアウト）で実行する */
export function kusPrompt(message, defaultValue = '') {
  try { return getToolWindowSafe().prompt(message, defaultValue); }
  catch (e) { return window.prompt(message, defaultValue); }
}

export function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function safeJsonForScript(v) {
  return JSON.stringify(v)
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

export function deepClone(v) {
  return v == null ? v : JSON.parse(JSON.stringify(v));
}

export function normalize(v) {
  if (Array.isArray(v)) return v.map(normalize);
  if (v && typeof v === 'object') {
    const o = {};
    Object.keys(v).sort().forEach((k) => {
      if (META_KEYS.has(k)) return;
      o[k] = normalize(v[k]);
    });
    return o;
  }
  return v;
}

export function stableStringify(v) {
  return JSON.stringify(normalize(v));
}

/** diff/reflect 共通: 行パスからセクション接頭辞を除いた相対パス */
export function relativePathFromRow(path, secKey) {
  if (!path) return '';
  if (path === secKey) return '';
  if (path.startsWith(`${secKey}.`)) return path.slice(secKey.length + 1);
  if (path.startsWith(`${secKey}[`)) return path.slice(secKey.length);
  return null;
}

export function tokenizePath(path) {
  if (!path) return [];
  const out = [];
  const re = /([^[.\]]+)|\[(\d+)\]/g;
  let m;
  while ((m = re.exec(path)) !== null) {
    if (m[1] != null) out.push(m[1]);
    else out.push(Number(m[2]));
  }
  return out;
}

export function compactForLog(value, max = 220) {
  try {
    const raw = typeof value === 'string' ? value : JSON.stringify(value);
    if (!raw) return '';
    return raw.length > max ? `${raw.slice(0, max)}...` : raw;
  } catch (e) {
    const raw = String(value ?? '');
    return raw.length > max ? `${raw.slice(0, max)}...` : raw;
  }
}

export function apiErrorWithContext(err, meta) {
  if (err && err.__apiDiag) return err;
  const method = meta?.method || 'GET';
  const prefix = meta?.prefix || '';
  const path = meta?.path || '';
  const bodyOrParams = meta?.payload;
  const app = bodyOrParams?.app ?? bodyOrParams?.id ?? bodyOrParams?.apps?.[0] ?? '';
  const bodySummary = compactForLog(bodyOrParams);
  const endpoint = `${prefix}${path}`;
  const contextLine = `[API] ${method} ${endpoint}${app ? ` app=${app}` : ''}${bodySummary ? ` payload=${bodySummary}` : ''}`;
  const baseMessage = err?.message || String(err);
  const wrapped = new Error(`${baseMessage}\n${contextLine}`);
  wrapped.__apiDiag = true;
  wrapped.original = err;
  if (err?.code) wrapped.code = err.code;
  if (err?.id) wrapped.id = err.id;
  if (err?.stack) wrapped.stack = err.stack;
  return wrapped;
}

export function nowStamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}`;
}

export function sanitizeFilenamePart(value, fallback = '不明') {
  const text = String(value || '').trim();
  const cleaned = text
    .replace(/[\\/:*?"<>|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned || fallback;
}

export function extractAppNameFromBundle(bundle) {
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

export function buildAppFilenameLabel(appId, appName) {
  const id = String(appId || '').trim();
  const name = String(appName || '').trim();
  if (name && id) return `${sanitizeFilenamePart(name)}(app${sanitizeFilenamePart(id)})`;
  if (name) return sanitizeFilenamePart(name);
  if (id) return `app${sanitizeFilenamePart(id)}`;
  return '';
}

export function buildExportFilename(baseLabel, ext, options = {}) {
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

export function getIssueSideLabel(side) {
  if (side === 'source') return '比較元';
  if (side === 'target') return '比較先';
  if (side === 'both') return '両方';
  return String(side || '-');
}

export function getPreviewStateLabel(preview) {
  return preview ? 'プレビュー' : '本番';
}

export function getOnOffDisplayLabel(value) {
  return value ? 'ON' : 'OFF';
}

export function getThemeDisplayLabel(theme) {
  return theme === 'dark' ? 'ダーク' : 'ライト';
}

export function getDiffTypeDisplayLabel(type, options = {}) {
  const map = {
    added: '追加',
    removed: '削除',
    changed: '変更',
    moved: '移動',
    same: '同一'
  };
  const base = map[type] || String(type || '-');
  return options.moved && type !== 'moved' ? `${base}(移動)` : base;
}

export function getSeverityDisplayLabel(severity) {
  if (severity === 'high') return '高';
  if (severity === 'medium') return '中';
  if (severity === 'low') return '低';
  return String(severity || '-');
}

export function downloadText(filename, text, type) {
  const blob = new Blob([text], { type: type || 'text/plain' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

export function downloadBlob(filename, blob) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

export function selectedScopeKeys(container) {
  return [...container.querySelectorAll('input[type="checkbox"]:checked')].map((x) => x.value);
}

export function readTextFile(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result || ''));
    r.onerror = () => reject(r.error || new Error('ファイル読み込みに失敗しました'));
    r.readAsText(file, 'utf-8');
  });
}




const loadedScripts = new Set();
const loadedStyles = new Set();
const loadingScripts = new Map();
const loadingStyles = new Map();

function waitForScriptLoad(existingScript, url) {
  if (existingScript.dataset.kusLoaded === 'true') {
    loadedScripts.add(url);
    return Promise.resolve();
  }
  if (existingScript.readyState === 'loaded' || existingScript.readyState === 'complete') {
    loadedScripts.add(url);
    existingScript.dataset.kusLoaded = 'true';
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    const onLoad = () => {
      cleanup();
      loadedScripts.add(url);
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

function waitForStyleLoad(existingLink, url) {
  if (existingLink.dataset.kusLoaded === 'true') {
    loadedStyles.add(url);
    return Promise.resolve();
  }
  if (existingLink.sheet) {
    loadedStyles.add(url);
    existingLink.dataset.kusLoaded = 'true';
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    const onLoad = () => {
      cleanup();
      loadedStyles.add(url);
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

export function loadExternalScript(url) {
  if (!url) return Promise.resolve();
  if (loadedScripts.has(url)) return Promise.resolve();
  if (loadingScripts.has(url)) return loadingScripts.get(url);

  const existingScript = document.querySelector(`script[src="${url}"]`);
  if (existingScript) {
    const promise = waitForScriptLoad(existingScript, url).finally(() => {
      loadingScripts.delete(url);
    });
    loadingScripts.set(url, promise);
    return promise;
  }

  const promise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = url;
    script.onload = () => {
      loadedScripts.add(url);
      script.dataset.kusLoaded = 'true';
      resolve();
    };
    script.onerror = () => reject(new Error(`Failed to load script: ${url}`));
    document.head.appendChild(script);
  }).finally(() => {
    loadingScripts.delete(url);
  });
  loadingScripts.set(url, promise);
  return promise;
}

export function loadExternalStyle(url) {
  if (!url) return Promise.resolve();
  if (loadedStyles.has(url)) return Promise.resolve();
  if (loadingStyles.has(url)) return loadingStyles.get(url);

  const existingLink = document.querySelector(`link[href="${url}"]`);
  if (existingLink) {
    const promise = waitForStyleLoad(existingLink, url).finally(() => {
      loadingStyles.delete(url);
    });
    loadingStyles.set(url, promise);
    return promise;
  }

  const promise = new Promise((resolve, reject) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = url;
    link.onload = () => {
      loadedStyles.add(url);
      link.dataset.kusLoaded = 'true';
      resolve();
    };
    link.onerror = () => reject(new Error(`Failed to load style: ${url}`));
    document.head.appendChild(link);
  }).finally(() => {
    loadingStyles.delete(url);
  });
  loadingStyles.set(url, promise);
  return promise;
}

export async function loadExternalLibrary(name) {
  const lib = EXTERNAL_LIBRARIES[name];
  if (!lib) throw new Error(`Unknown external library: ${name}`);
  const stylePromise = lib.cssUrl ? loadExternalStyle(lib.cssUrl) : Promise.resolve();
  let scriptPromise = Promise.resolve();
  if (lib.cdnUrl) {
    scriptPromise = loadExternalScript(lib.cdnUrl).catch((err) => {
      if (lib.altCdnUrl) return loadExternalScript(lib.altCdnUrl);
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
export async function showToast(message, type = 'info') {
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
