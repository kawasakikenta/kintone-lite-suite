'use strict';

import { META_KEYS } from './constants.js';

export function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
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
