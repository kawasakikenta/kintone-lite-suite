(() => {
  'use strict';
  if (!window.kintone?.api || !window.kintone?.app) {
    alert('kintone画面で実行してください');
    return;
  }

  const TOOL_ID = 'kintone-unified-suite-v2';
  const DEFAULT_APP_ID = String(kintone.app.getId() || '');
  const DIALOG_STATE_KEY = `${TOOL_ID}:dialogState`;
  const IGNORE_PROFILE_STATE_KEY = `${TOOL_ID}:ignoreProfiles`;

  const SECTION_DEFS = [
    { key: 'appSettings', label: 'アプリ設定', endpoint: '/app/settings.json', put: false },
    { key: 'fieldSettings', label: 'フィールド設定', endpoint: '/app/form/fields.json', put: true, putBuilder: (d) => ({ properties: d.properties || d }) },
    { key: 'layoutSettings', label: 'レイアウト設定', endpoint: '/app/form/layout.json', put: true, putBuilder: (d) => ({ layout: d.layout || d }) },
    { key: 'formSettings', label: 'フォーム設定', endpoint: '/form.json', put: false },
    { key: 'viewSettings', label: 'ビュー設定', endpoint: '/app/views.json', put: true, putBuilder: (d) => ({ views: d.views || d }) },
    { key: 'reportSettings', label: 'レポート設定', endpoint: '/app/reports.json', put: true, putBuilder: (d) => ({ reports: d.reports || d }) },
    { key: 'processSettings', label: 'プロセス管理', endpoint: '/app/status.json', put: true, putBuilder: (d) => ({ enable: !!d.enable, states: d.states || {}, actions: d.actions || [] }) },
    { key: 'pluginSettings', label: 'プラグイン設定', endpoint: '/app/plugins.json', put: false },
    { key: 'customizeSettings', label: 'JS/CSS設定', endpoint: '/app/customize.json', put: true, putBuilder: (d) => ({ desktop: d.desktop || {}, mobile: d.mobile || {} }) },
    { key: 'actionSettings', label: 'アクション設定', endpoint: '/app/actions.json', put: true, putBuilder: (d) => ({ actions: d.actions || d }) },
    { key: 'appAcl', label: 'アプリACL', endpoint: '/app/acl.json', put: true, putBuilder: (d) => ({ rights: d.rights || d }) },
    { key: 'fieldAcl', label: 'フィールドACL', endpoint: '/field/acl.json', put: true, putBuilder: (d) => ({ rights: d.rights || d }) },
    { key: 'recordPermissions', label: 'レコード権限', endpoint: '/record/acl.json', put: true, putBuilder: (d) => ({ rights: d.rights || d }) },
    { key: 'notifications', label: '通知設定', endpoint: '/app/notifications/general.json', put: true, putBuilder: (d) => ({ notifications: d.notifications || d }) },
    { key: 'perRecordNotifications', label: 'レコード条件通知', endpoint: '/app/notifications/perRecord.json', put: true, putBuilder: (d) => ({ notifications: d.notifications || d }) },
    { key: 'reminderNotifications', label: 'リマインダー通知', endpoint: '/app/notifications/reminder.json', put: true, putBuilder: (d) => ({ notifications: d.notifications || d }) },
    { key: 'categories', label: 'カテゴリ設定', endpoint: '/app/categories.json', put: true, putBuilder: (d) => ({ categories: d.categories || d }) }
  ];

  const META_KEYS = new Set(['revision', 'creator', 'createdAt', 'modifier', 'modifiedAt']);
  const SYSTEM_FIELD_TYPES = new Set([
    'STATUS',
    'STATUS_ASSIGNEE',
    'CREATED_TIME',
    'UPDATED_TIME',
    'CREATOR',
    'MODIFIER',
    'RECORD_NUMBER',
    'CATEGORY'
  ]);

  const state = {
    activeTab: 'diff',
    lastSourceBundle: null,
    lastTargetBundle: null,
    lastDiffRows: [],
    lastDiffAt: null,
    reflectRows: [],
    reflectSelectedIds: new Set(),
    reflectNodeModes: {},
    reflectUndoStack: [],
    reflectRedoStack: [],
    importedSourceBundle: null,
    importedTargetBundle: null,
    importedSourceName: '',
    importedTargetName: '',
    running: false
  };

  const old = document.getElementById(TOOL_ID);
  if (old) old.remove();

  function esc(s) {
    return String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function deepClone(v) {
    return v == null ? v : JSON.parse(JSON.stringify(v));
  }

  function normalize(v) {
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

  function stableStringify(v) {
    return JSON.stringify(normalize(v));
  }

  function nowStamp() {
    const d = new Date();
    const p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}`;
  }

  function downloadText(filename, text, type) {
    const blob = new Blob([text], { type: type || 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function readTextFile(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result || ''));
      r.onerror = () => reject(r.error || new Error('ファイル読み込みに失敗しました'));
      r.readAsText(file, 'utf-8');
    });
  }

  function loadDialogState() {
    try { return JSON.parse(localStorage.getItem(DIALOG_STATE_KEY) || '{}'); }
    catch { return {}; }
  }

  function saveDialogState(dialogState) {
    try { localStorage.setItem(DIALOG_STATE_KEY, JSON.stringify(dialogState || {})); }
    catch { /* noop */ }
  }

  function loadIgnoreProfiles() {
    try { return JSON.parse(localStorage.getItem(IGNORE_PROFILE_STATE_KEY) || '{}') || {}; }
    catch { return {}; }
  }

  function saveIgnoreProfiles(profiles) {
    try { localStorage.setItem(IGNORE_PROFILE_STATE_KEY, JSON.stringify(profiles || {})); }
    catch { /* noop */ }
  }

  function buildApiPrefix(guestId, preview) {
    const g = String(guestId || '').trim();
    if (g) return `/k/guest/${g}/v1${preview ? '/preview' : ''}`;
    return `/k/v1${preview ? '/preview' : ''}`;
  }

  async function apiGet(prefix, path, params, retries = 3) {
    let err;
    for (let i = 0; i < retries; i++) {
      try {
        return await kintone.api(`${prefix}${path}`, 'GET', params);
      } catch (e) {
        err = e;
        if (i < retries - 1) await new Promise((r) => setTimeout(r, (i + 1) * 700));
      }
    }
    throw err;
  }

  async function apiPut(prefix, path, body) {
    return kintone.api(`${prefix}${path}`, 'PUT', body);
  }

  async function apiPost(prefix, path, body) {
    return kintone.api(`${prefix}${path}`, 'POST', body);
  }

  async function apiDelete(prefix, path, body) {
    return kintone.api(`${prefix}${path}`, 'DELETE', body);
  }

  async function apiCallWithRetry(prefix, path, method, body, retries = 2) {
    let err;
    for (let i = 0; i <= retries; i++) {
      try {
        return await kintone.api(`${prefix}${path}`, method, body);
      } catch (e) {
        err = e;
        if (i < retries) await new Promise((r) => setTimeout(r, 700 * (i + 1)));
      }
    }
    throw err;
  }

  function ensureBundleShape(bundle) {
    if (!bundle || typeof bundle !== 'object') throw new Error('バンドル形式が不正です');
    if (!bundle.sections || typeof bundle.sections !== 'object') throw new Error('sections がありません');
    return {
      appId: String(bundle.appId || ''),
      guestId: String(bundle.guestId || ''),
      preview: !!bundle.preview,
      fetchedAt: bundle.fetchedAt || new Date().toISOString(),
      sections: normalize(bundle.sections)
    };
  }

  function pickBundleSections(bundle, sections) {
    const picked = {
      appId: String(bundle.appId || ''),
      guestId: String(bundle.guestId || ''),
      preview: !!bundle.preview,
      fetchedAt: bundle.fetchedAt || new Date().toISOString(),
      sections: {}
    };
    for (const sec of sections) {
      if (Object.prototype.hasOwnProperty.call(bundle.sections || {}, sec)) {
        picked.sections[sec] = deepClone(bundle.sections[sec]);
      } else {
        picked.sections[sec] = { _fetchError: 'bundleに該当セクションなし' };
      }
    }
    return picked;
  }

  async function fetchBundle({ appId, guestId, preview, sections, onProgress }) {
    const prefix = buildApiPrefix(guestId, preview);
    const app = String(appId || '').trim();
    if (!app) throw new Error('App ID が必要です');

    const bundle = {
      appId: app,
      guestId: String(guestId || '').trim(),
      preview: !!preview,
      fetchedAt: new Date().toISOString(),
      sections: {}
    };

    for (let i = 0; i < sections.length; i++) {
      const sec = sections[i];
      const def = SECTION_DEFS.find((x) => x.key === sec);
      if (!def) continue;
      try {
        const res = await apiGet(prefix, def.endpoint, { app });
        bundle.sections[sec] = normalize(res);
      } catch (e) {
        bundle.sections[sec] = { _fetchError: e.message || String(e) };
      }
      if (onProgress) onProgress((i + 1) / sections.length, def.label);
    }
    return bundle;
  }

  async function resolveBundle(side, params, sections, onProgress) {
    if (side === 'source' && state.importedSourceBundle) return pickBundleSections(state.importedSourceBundle, sections);
    if (side === 'target' && state.importedTargetBundle) return pickBundleSections(state.importedTargetBundle, sections);
    return fetchBundle({ ...params, sections, onProgress });
  }

  const ARRAY_DIFF_LIMIT = 1000;
  const ARRAY_LCS_MAX_CELLS = 60000;
  const ARRAY_KEY_CANDIDATES = [
    'code',
    'id',
    'name',
    'entity',
    'field',
    'status',
    'state',
    'app',
    'from',
    'to',
    'key'
  ];

  function isPlainObject(v) {
    return !!v && typeof v === 'object' && !Array.isArray(v);
  }

  function getPathLeafKey(path) {
    const m = String(path || '').match(/([^[.\]]+)(?:\[\d+\])?$/);
    return m ? m[1] : '';
  }

  function normalizeForCompare(v, ignoreSet) {
    if (Array.isArray(v)) return v.map((x) => normalizeForCompare(x, ignoreSet));
    if (v && typeof v === 'object') {
      const o = {};
      Object.keys(v).sort().forEach((k) => {
        if (META_KEYS.has(k) || ignoreSet.has(k)) return;
        o[k] = normalizeForCompare(v[k], ignoreSet);
      });
      return o;
    }
    return v;
  }

  function makeArrayItemSignature(v, ignoreSet) {
    return JSON.stringify(normalizeForCompare(v, ignoreSet));
  }

  function hasUniquePrimitiveKey(arr, key) {
    const seen = new Set();
    for (const obj of arr) {
      if (!isPlainObject(obj) || !Object.prototype.hasOwnProperty.call(obj, key)) return false;
      const val = obj[key];
      if (val == null || typeof val === 'object') return false;
      const sig = `${typeof val}:${String(val)}`;
      if (seen.has(sig)) return false;
      seen.add(sig);
    }
    return true;
  }

  function detectArrayObjectKey(a, b, ignoreSet) {
    if (!a.length || !b.length) return null;
    if (!a.every(isPlainObject) || !b.every(isPlainObject)) return null;
    const firstA = a.find(isPlainObject) || {};
    const firstB = b.find(isPlainObject) || {};
    const fallback = Object.keys(firstA).filter((k) => Object.prototype.hasOwnProperty.call(firstB, k));
    const candidates = [...ARRAY_KEY_CANDIDATES, ...fallback.filter((k) => !ARRAY_KEY_CANDIDATES.includes(k))];
    for (const key of candidates) {
      if (ignoreSet.has(key)) continue;
      if (hasUniquePrimitiveKey(a, key) && hasUniquePrimitiveKey(b, key)) return key;
    }
    return null;
  }

  function buildArrayKeyMap(arr, key) {
    const map = new Map();
    for (let i = 0; i < arr.length; i++) {
      const item = arr[i];
      const val = item?.[key];
      const sig = `${typeof val}:${String(val)}`;
      map.set(sig, { idx: i, item });
    }
    return map;
  }

  function collectArrayDiffsByObjectKey(a, b, path, out, ignoreSet) {
    const key = detectArrayObjectKey(a, b, ignoreSet);
    if (!key) return false;

    const mapA = buildArrayKeyMap(a, key);
    const mapB = buildArrayKeyMap(b, key);
    const ordered = [];
    const seen = new Set();
    for (const item of a) {
      const sig = `${typeof item[key]}:${String(item[key])}`;
      if (seen.has(sig)) continue;
      seen.add(sig);
      ordered.push(sig);
    }
    for (const item of b) {
      const sig = `${typeof item[key]}:${String(item[key])}`;
      if (seen.has(sig)) continue;
      seen.add(sig);
      ordered.push(sig);
    }

    for (const sig of ordered) {
      if (out.length >= ARRAY_DIFF_LIMIT) return true;
      const left = mapA.get(sig);
      const right = mapB.get(sig);
      if (!left && right) {
        out.push({
          type: 'added',
          path: `${path}[${right.idx}]`,
          left: undefined,
          right: right.item,
          arrayKey: key,
          arrayKeyValue: right.item?.[key]
        });
        continue;
      }
      if (left && !right) {
        out.push({
          type: 'removed',
          path: `${path}[${left.idx}]`,
          left: left.item,
          right: undefined,
          arrayKey: key,
          arrayKeyValue: left.item?.[key]
        });
        continue;
      }
      if (!left || !right) continue;

      const leftSig = makeArrayItemSignature(left.item, ignoreSet);
      const rightSig = makeArrayItemSignature(right.item, ignoreSet);
      if (leftSig === rightSig) {
        if (left.idx !== right.idx) {
          out.push({
            type: 'changed',
            path: `${path}[${right.idx}]`,
            left: left.item,
            right: right.item,
            moved: true,
            movedFrom: left.idx,
            movedTo: right.idx,
            arrayKey: key,
            arrayKeyValue: right.item?.[key]
          });
        }
        continue;
      }
      const start = out.length;
      collectDeepDiffs(left.item, right.item, `${path}[${right.idx}]`, out, ignoreSet);
      const keyVal = right.item?.[key] != null ? right.item[key] : left.item?.[key];
      for (let oi = start; oi < out.length; oi++) {
        if (!out[oi].arrayKey) out[oi].arrayKey = key;
        if (out[oi].arrayKeyValue === undefined) out[oi].arrayKeyValue = keyVal;
      }
      if (out.length >= ARRAY_DIFF_LIMIT) return true;
    }
    return true;
  }

  function collectArrayDiffsByLcs(a, b, path, out, ignoreSet) {
    const n = a.length;
    const m = b.length;
    if (!n && !m) return true;
    if (!n) {
      for (let j = 0; j < m; j++) {
        if (out.length >= ARRAY_DIFF_LIMIT) return true;
        out.push({ type: 'added', path: `${path}[${j}]`, left: undefined, right: b[j] });
      }
      return true;
    }
    if (!m) {
      for (let i = 0; i < n; i++) {
        if (out.length >= ARRAY_DIFF_LIMIT) return true;
        out.push({ type: 'removed', path: `${path}[${i}]`, left: a[i], right: undefined });
      }
      return true;
    }

    if (n * m > ARRAY_LCS_MAX_CELLS) return false;
    const sigA = a.map((x) => makeArrayItemSignature(x, ignoreSet));
    const sigB = b.map((x) => makeArrayItemSignature(x, ignoreSet));

    const dp = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
    for (let i = n - 1; i >= 0; i--) {
      for (let j = m - 1; j >= 0; j--) {
        dp[i][j] = sigA[i] === sigB[j]
          ? dp[i + 1][j + 1] + 1
          : Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
    }

    let i = 0;
    let j = 0;
    while (i < n || j < m) {
      if (out.length >= ARRAY_DIFF_LIMIT) return true;
      if (i < n && j < m && sigA[i] === sigB[j]) {
        i += 1;
        j += 1;
        continue;
      }
      if (i < n && j < m) {
        const sameType = Object.prototype.toString.call(a[i]) === Object.prototype.toString.call(b[j]);
        if (sameType && dp[i + 1][j + 1] >= dp[i + 1][j] && dp[i + 1][j + 1] >= dp[i][j + 1]) {
          collectDeepDiffs(a[i], b[j], `${path}[${j}]`, out, ignoreSet);
          i += 1;
          j += 1;
          continue;
        }
      }
      const down = i < n ? dp[i + 1][j] : -1;
      const right = j < m ? dp[i][j + 1] : -1;
      if (j < m && (i >= n || right >= down)) {
        out.push({ type: 'added', path: `${path}[${j}]`, left: undefined, right: b[j] });
        j += 1;
      } else if (i < n) {
        out.push({ type: 'removed', path: `${path}[${i}]`, left: a[i], right: undefined });
        i += 1;
      } else {
        break;
      }
    }
    return true;
  }

  function collectArrayDiffs(a, b, path, out, ignoreSet) {
    if (collectArrayDiffsByObjectKey(a, b, path, out, ignoreSet)) return;
    if (collectArrayDiffsByLcs(a, b, path, out, ignoreSet)) return;
    const max = Math.max(a.length, b.length);
    for (let i = 0; i < max; i++) {
      if (out.length >= ARRAY_DIFF_LIMIT) return;
      const p = `${path}[${i}]`;
      if (i >= a.length) out.push({ type: 'added', path: p, left: undefined, right: b[i] });
      else if (i >= b.length) out.push({ type: 'removed', path: p, left: a[i], right: undefined });
      else collectDeepDiffs(a[i], b[i], p, out, ignoreSet);
    }
  }

  function collectDeepDiffs(a, b, path, out, ignoreSet) {
    if (out.length >= ARRAY_DIFF_LIMIT) return;
    const leaf = getPathLeafKey(path);
    if (leaf && ignoreSet.has(leaf)) return;

    if (a === b) return;
    const ta = Object.prototype.toString.call(a);
    const tb = Object.prototype.toString.call(b);
    if (ta !== tb) {
      out.push({ type: 'changed', path, left: a, right: b });
      return;
    }

    if (a == null || b == null) {
      out.push({ type: 'changed', path, left: a, right: b });
      return;
    }

    if (Array.isArray(a)) {
      collectArrayDiffs(a, b, path, out, ignoreSet);
      return;
    }

    if (typeof a === 'object') {
      const keys = [...new Set([...Object.keys(a), ...Object.keys(b)])].sort();
      for (const k of keys) {
        if (ignoreSet.has(k)) continue;
        const p = path ? `${path}.${k}` : k;
        if (!Object.prototype.hasOwnProperty.call(b, k)) out.push({ type: 'removed', path: p, left: a[k], right: undefined });
        else if (!Object.prototype.hasOwnProperty.call(a, k)) out.push({ type: 'added', path: p, left: undefined, right: b[k] });
        else collectDeepDiffs(a[k], b[k], p, out, ignoreSet);
        if (out.length >= ARRAY_DIFF_LIMIT) return;
      }
      return;
    }

    out.push({ type: 'changed', path, left: a, right: b });
  }

  function computeDiffRows(sourceBundle, targetBundle, sections, ignoreKeysText) {
    const ignoreSet = new Set(
      String(ignoreKeysText || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    );
    const rows = [];
    for (const sec of sections) {
      const label = (SECTION_DEFS.find((x) => x.key === sec) || {}).label || sec;
      const s = sourceBundle.sections[sec];
      const t = targetBundle.sections[sec];

      if (!s && t) {
        rows.push({ sectionKey: sec, section: label, type: 'added', path: sec, left: undefined, right: t });
        continue;
      }
      if (s && !t) {
        rows.push({ sectionKey: sec, section: label, type: 'removed', path: sec, left: s, right: undefined });
        continue;
      }
      if (!s && !t) continue;

      if (stableStringify(s) === stableStringify(t)) continue;
      collectDeepDiffs(s, t, sec, rows, ignoreSet);
      rows.forEach((r) => {
        if (!r.section) r.section = label;
        if (!r.sectionKey) r.sectionKey = sec;
      });
    }
    return rows;
  }

  function summarizeRows(rows) {
    const s = { total: rows.length, added: 0, removed: 0, changed: 0, moved: 0 };
    for (const r of rows) {
      if (r.type === 'added') s.added += 1;
      else if (r.type === 'removed') s.removed += 1;
      else {
        s.changed += 1;
        if (r.moved) s.moved += 1;
      }
    }
    return s;
  }

  function flattenToRows(value, path, rows, limit = 30000) {
    if (rows.length >= limit) return;
    if (value == null || typeof value !== 'object') {
      rows.push([path || '$', typeof value === 'string' ? value : JSON.stringify(value)]);
      return;
    }
    if (Array.isArray(value)) {
      if (!value.length) {
        rows.push([path || '$', '[]']);
        return;
      }
      for (let i = 0; i < value.length; i++) {
        flattenToRows(value[i], `${path || '$'}[${i}]`, rows, limit);
        if (rows.length >= limit) return;
      }
      return;
    }
    const keys = Object.keys(value).sort();
    if (!keys.length) {
      rows.push([path || '$', '{}']);
      return;
    }
    for (const k of keys) {
      flattenToRows(value[k], path ? `${path}.${k}` : k, rows, limit);
      if (rows.length >= limit) return;
    }
  }

  function safeSheetName(raw, existingSet) {
    let name = String(raw || 'Sheet').replace(/[:\\/?*\[\]]/g, '_').trim();
    if (!name) name = 'Sheet';
    if (name.length > 31) name = name.slice(0, 31);
    if (!existingSet.has(name)) return name;
    let n = 2;
    while (true) {
      const suffix = `(${n})`;
      const base = name.length > 31 - suffix.length ? name.slice(0, 31 - suffix.length) : name;
      const candidate = `${base}${suffix}`;
      if (!existingSet.has(candidate)) return candidate;
      n += 1;
    }
  }

  function bundleToMarkdown(bundle) {
    const lines = [];
    lines.push('# kintone 設計書');
    lines.push('');
    lines.push(`- App ID: ${bundle.appId}`);
    lines.push(`- Guest ID: ${bundle.guestId || '(通常空間)'}`);
    lines.push(`- Preview: ${bundle.preview ? 'Yes' : 'No'}`);
    lines.push(`- Exported At: ${bundle.fetchedAt}`);
    lines.push('');
    for (const def of SECTION_DEFS) {
      const sec = bundle.sections[def.key];
      if (!sec) continue;
      lines.push(`## ${def.label}`);
      lines.push('');
      lines.push('```json');
      lines.push(JSON.stringify(sec, null, 2));
      lines.push('```');
      lines.push('');
    }
    return lines.join('\n');
  }

  function buildDiffHtml(sourceBundle, targetBundle, rows, scopes, ignoreKeys) {
    const summary = summarizeRows(rows);
    const sectionText = scopes.map((k) => (SECTION_DEFS.find((d) => d.key === k)?.label || k)).join(', ');
    const bodyRows = rows.slice(0, 1200).map((r) => `
      <tr>
        <td>${esc(r.section || '-')}</td>
        <td>${esc(r.moved ? `${r.type}(moved)` : (r.type || '-'))}</td>
        <td><code>${esc(r.path || '-')}</code></td>
        <td><pre>${esc(JSON.stringify(r.left, null, 2))}</pre></td>
        <td><pre>${esc(JSON.stringify(r.right, null, 2))}</pre></td>
      </tr>
    `).join('');
    return `<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>kintone差分レポート</title>
  <style>
    body{font-family:"Noto Sans JP",Meiryo,sans-serif;margin:24px;color:#1f2937}
    h1{margin:0 0 10px}
    .meta{font-size:12px;color:#475569;margin-bottom:14px}
    .sum{display:flex;gap:10px;margin-bottom:14px;flex-wrap:wrap}
    .pill{border:1px solid #cbd5e1;border-radius:999px;padding:4px 10px;font-size:12px}
    table{width:100%;border-collapse:collapse;font-size:12px}
    th,td{border:1px solid #e2e8f0;padding:6px;vertical-align:top;text-align:left}
    th{background:#f8fafc;position:sticky;top:0}
    pre{margin:0;white-space:pre-wrap;word-break:break-word;font-size:11px;max-height:220px;overflow:auto}
    @media print {.meta{color:#000}}
  </style>
</head>
<body>
  <h1>kintone差分レポート</h1>
  <div class="meta">
    <div>Generated At: ${esc(new Date().toISOString())}</div>
    <div>Source: App ${esc(sourceBundle.appId)} / Target: App ${esc(targetBundle.appId)}</div>
    <div>Scopes: ${esc(sectionText || '-')}</div>
    <div>Ignore Keys: ${esc(ignoreKeys || '-')}</div>
  </div>
  <div class="sum">
    <span class="pill">Total: ${summary.total}</span>
    <span class="pill">Added: ${summary.added}</span>
    <span class="pill">Removed: ${summary.removed}</span>
    <span class="pill">Changed: ${summary.changed}</span>
    <span class="pill">Moved: ${summary.moved}</span>
  </div>
  <table>
    <thead><tr><th>Section</th><th>Type</th><th>Path</th><th>Source</th><th>Target</th></tr></thead>
    <tbody>${bodyRows || '<tr><td colspan="5">差分なし</td></tr>'}</tbody>
  </table>
</body>
</html>`;
  }

  function buildPatchPayload(rows, sourceBundle, targetBundle) {
    const grouped = {};
    for (const r of rows) {
      const section = r.section || 'Unknown';
      if (!grouped[section]) grouped[section] = [];
      grouped[section].push({
        type: r.type,
        path: r.path,
        sourceValue: r.left,
        targetValue: r.right,
        moved: !!r.moved,
        movedFrom: r.movedFrom,
        movedTo: r.movedTo,
        arrayKey: r.arrayKey,
        arrayKeyValue: r.arrayKeyValue
      });
    }
    return {
      generatedAt: new Date().toISOString(),
      source: { appId: sourceBundle?.appId || '', guestId: sourceBundle?.guestId || '', preview: !!sourceBundle?.preview },
      target: { appId: targetBundle?.appId || '', guestId: targetBundle?.guestId || '', preview: !!targetBundle?.preview },
      sections: grouped
    };
  }

  function buildRoot() {
    const root = document.createElement('div');
    root.id = TOOL_ID;
    root.innerHTML = `
      <style>
        #${TOOL_ID}{position:fixed;top:16px;right:16px;z-index:2147483647;width:min(980px,97vw);max-height:95vh;background:#f6f8fb;border:1px solid #d9e2ec;border-radius:14px;box-shadow:0 18px 40px rgba(15,23,42,.28);font-family:"Noto Sans JP","Hiragino Kaku Gothic ProN",Meiryo,sans-serif;color:#1f2937;display:flex;flex-direction:column;overflow:hidden}
        #${TOOL_ID} .h{padding:12px 16px;background:linear-gradient(135deg,#0f4c81,#2563eb);color:#fff;display:flex;justify-content:space-between;align-items:center}
        #${TOOL_ID} .ht{font-size:15px;font-weight:700}
        #${TOOL_ID} .hs{font-size:11px;opacity:.92}
        #${TOOL_ID} .x{border:0;background:rgba(255,255,255,.22);color:#fff;border-radius:6px;padding:6px 10px;cursor:pointer}
        #${TOOL_ID} .body{padding:12px;display:grid;gap:10px;overflow:auto}
        #${TOOL_ID} .card{background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:10px}
        #${TOOL_ID} .grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}
        #${TOOL_ID} .grid2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
        #${TOOL_ID} .inline{display:flex;gap:6px;align-items:center;flex-wrap:wrap}
        #${TOOL_ID} label{font-size:11px;font-weight:700;color:#334155;display:block;margin-bottom:4px}
        #${TOOL_ID} input[type="text"],#${TOOL_ID} textarea,#${TOOL_ID} select{width:100%;box-sizing:border-box;padding:7px 8px;border:1px solid #cbd5e1;border-radius:7px;background:#fff;font-size:12px;color:#0f172a}
        #${TOOL_ID} textarea{min-height:84px;resize:vertical;font-family:ui-monospace,SFMono-Regular,Menlo,monospace}
        #${TOOL_ID} .tabs{display:flex;gap:12px;flex-wrap:wrap}
        #${TOOL_ID} .tab{border:1px solid #cbd5e1;background:#fff;border-radius:7px;padding:7px 10px;font-size:12px;font-weight:700;cursor:pointer}
        #${TOOL_ID} .tab.active{background:#2563eb;border-color:#2563eb;color:#fff}\n
        #${TOOL_ID} .tab-group{display:flex;gap:4px;padding:4px;background:#e2e8f0;border-radius:9px;align-items:center}
        #${TOOL_ID} .tab-group-lbl{font-size:10px;font-weight:700;color:#475569;padding:0 6px;letter-spacing:0.5px}

        #${TOOL_ID} .pane{display:none}
        #${TOOL_ID} .pane.active{display:block}
        #${TOOL_ID} .btns{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}
        #${TOOL_ID} .btn{border:0;background:#2563eb;color:#fff;border-radius:8px;padding:8px 12px;font-size:12px;font-weight:700;cursor:pointer}
        #${TOOL_ID} .btn.sub{background:#475569}
        #${TOOL_ID} .btn.warn{background:#b45309}
        #${TOOL_ID} .btn.ok{background:#15803d}
        #${TOOL_ID} .btn.pink{background:#be185d}
        #${TOOL_ID} .btn.dark{background:#1e293b}
        #${TOOL_ID} .muted{font-size:11px;color:#64748b}
        #${TOOL_ID} .step{font-size:11px;font-weight:700;color:#1e293b;background:#eef2ff;border:1px solid #c7d2fe;border-radius:6px;padding:6px 8px;margin-top:8px}
        #${TOOL_ID} .kv{font-size:11px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:8px 10px;margin-top:8px;line-height:1.7}
        #${TOOL_ID} .warnbox{font-size:11px;background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:8px 10px;margin-top:8px;color:#9a3412}
        #${TOOL_ID} .chips{display:flex;gap:6px;flex-wrap:wrap}
        #${TOOL_ID} .chip{display:inline-flex;align-items:center;gap:4px;padding:4px 7px;border:1px solid #d6dee8;border-radius:999px;font-size:11px;background:#fff}
        #${TOOL_ID} .status{font-size:12px;padding:8px 10px;border-radius:8px;background:#e2e8f0;color:#0f172a}
        #${TOOL_ID} .result{max-height:300px;overflow:auto;border:1px solid #dbe3ed;border-radius:8px;background:#fff}
        #${TOOL_ID} table{width:100%;border-collapse:collapse;font-size:11px}
        #${TOOL_ID} th,#${TOOL_ID} td{border-bottom:1px solid #e5eaf0;padding:6px 8px;vertical-align:top;text-align:left}
        #${TOOL_ID} th{position:sticky;top:0;background:#f8fafc;z-index:1}
        #${TOOL_ID} .added{color:#166534}
        #${TOOL_ID} .removed{color:#b91c1c}
        #${TOOL_ID} .changed{color:#92400e}
      </style>
      <div class="h">
        <div>
          <div class="ht">kintone 統合変更ツール</div>
          <div class="hs">差分比較 / プレビュー反映 / フィールド追加 / 設計書出力 / 設定取得JS / レコード管理 / プロセス図解 / ER図解</div>
        </div>
        <button class="x" data-act="close">閉じる</button>
      </div>
      <div class="body">
        <div class="card">
          <div class="grid">
            <div>
              <label>Source App ID</label>
              <input type="text" id="u_sourceApp" value="${esc(DEFAULT_APP_ID)}">
            </div>
            <div>
              <label>Source Guest ID</label>
              <input type="text" id="u_sourceGuest" placeholder="空で通常空間">
            </div>
            <div>
              <label>Target App ID</label>
              <input type="text" id="u_targetApp" value="${esc(DEFAULT_APP_ID)}">
            </div>
            <div>
              <label>Target Guest ID</label>
              <input type="text" id="u_targetGuest" placeholder="空で通常空間">
            </div>
          </div>
          <div class="grid2" style="margin-top:8px">
            <label class="chip"><input type="checkbox" id="u_sourcePreview"> Sourceはプレビュー</label>
            <label class="chip"><input type="checkbox" id="u_targetPreview" checked> Targetはプレビュー</label>
          </div>
          <div style="margin-top:8px">
            <label>Lookup AppID変換（任意 / JSON）</label>
            <input type="text" id="u_lookupMap" placeholder='{"77":"177","85":"185"}'>
          </div>
          <div class="muted" style="margin-top:6px">共通設定は全タブで使います。必要な順番: 差分比較 → 反映プラン確認 → プレビュー反映。</div>
        </div>

        <div class="card">
          <div class="tabs">
            <div class="tab-group">
              <div class="tab-group-lbl">設計・反映</div>
              <button class="tab active" data-tab="diff">差分比較</button>
              <button class="tab" data-tab="reflect">プレビュー反映</button>
              <button class="tab" data-tab="field">フィールド追加</button>
              <button class="tab" data-tab="jsconfig">設定取得JS</button>
            </div>
            
            <div class="tab-group">
              <div class="tab-group-lbl">分析・可視化</div>
              <button class="tab" data-tab="er">ER図解</button>
              <button class="tab" data-tab="processFlow">プロセス図解</button>
              <button class="tab" data-tab="design">設計書出力</button>
            </div>
            
            <div class="tab-group">
              <div class="tab-group-lbl">データ運用</div>
              <button class="tab" data-tab="recordMgr">レコード管理</button>
              <button class="tab" data-tab="sql">SQLランナー</button>
            </div>
          </div>

          <div class="pane active" data-pane="diff">
            <div class="step">Step 1: 比較条件を決めて差分を取得</div>
            <div style="margin-top:10px">
              <label>比較対象セクション</label>
              <div class="btns" style="margin-top:4px">
                <button class="btn sub" data-act="diffScopeAll">比較セクション全選択</button>
                <button class="btn sub" data-act="diffScopeNone">比較セクション全解除</button>
              </div>
              <div class="chips" id="u_diffScopes"></div>
            </div>
            <div style="margin-top:8px">
              <label>無視キー（カンマ区切り）</label>
              <input type="text" id="u_ignoreKeys" placeholder="id, revision, createdAt, modifiedAt">
            </div>
            <div class="grid2" style="margin-top:8px">
              <div>
                <label>無視プロファイル</label>
                <select id="u_ignoreProfileSelect"></select>
              </div>
              <div>
                <label>保存名</label>
                <input type="text" id="u_ignoreProfileName" placeholder="例: 標準無視キー">
              </div>
            </div>
            <div class="btns">
              <button class="btn sub" data-act="loadIgnoreProfile">プロファイル読込</button>
              <button class="btn sub" data-act="saveIgnoreProfile">プロファイル保存</button>
              <button class="btn sub" data-act="deleteIgnoreProfile">プロファイル削除</button>
            </div>
            <div class="kv" id="u_bundleState">Source: API取得 / Target: API取得</div>
            <div class="btns">
              <button class="btn sub" data-act="importSourceBundle">Sourceバンドル読込</button>
              <button class="btn sub" data-act="importTargetBundle">Targetバンドル読込</button>
              <button class="btn sub" data-act="clearBundle">バンドル読込解除</button>
              <button class="btn sub" data-act="exportBundleJson">バンドル保存</button>
            </div>
            <div class="btns">
              <button class="btn" data-act="runDiff">差分比較を実行</button>
              <button class="btn sub" data-act="exportDiffJson">差分JSON保存</button>
              <button class="btn sub" data-act="exportDiffHtml">差分HTML保存</button>
              <button class="btn sub" data-act="exportPatchJson">パッチJSON保存</button>
            </div>
            <input type="file" id="u_sourceBundleFile" accept=".json" style="display:none">
            <input type="file" id="u_targetBundleFile" accept=".json" style="display:none">
          </div>

          <div class="pane" data-pane="reflect">
            <div class="step">Step 2: 反映範囲を確認してプレビューへ反映</div>
            <div id="u_applyScopeBlock" style="margin-top:10px">
              <label>反映対象セクション（PUT対応のみ）</label>
              <div class="btns" style="margin-top:4px">
                <button class="btn sub" data-act="applyScopeAll">反映セクション全選択</button>
                <button class="btn sub" data-act="applyScopeNone">反映セクション全解除</button>
              </div>
              <div class="chips" id="u_applyScopes"></div>
            </div>
            <div class="kv" id="u_reflectMode">Source: API / Target: Preview API</div>
            <div class="kv" id="u_reflectHint" style="margin-top:8px"></div>
            <div class="grid2" id="u_sectionOptionsBlock" style="margin-top:8px">
              <label class="chip"><input type="checkbox" id="u_applyDiffOnly"> 前回差分のあるセクションのみ反映</label>
              <label class="chip"><input type="checkbox" id="u_stopOnError" checked> エラー時に中断</label>
            </div>
            <label class="chip" style="margin-top:8px"><input type="checkbox" id="u_nodeMode"> 選択ノードのみ反映（上級）</label>
            <label class="chip" style="margin-top:8px"><input type="checkbox" id="u_doDeploy"> 反映後にデプロイ実行（状態確認あり）</label>
            <div class="warnbox" id="u_nodeWarn">注: ノードモードは「前回差分」から選択して反映します。まず差分比較を実行してください。</div>
            <div class="btns" id="u_nodeControls">
              <button class="btn sub" data-act="loadReflectNodes">差分ノード読込</button>
              <button class="btn sub" data-act="selectReflectNodesAll">ノード全選択</button>
              <button class="btn sub" data-act="clearReflectNodes">ノード全解除</button>
              <button class="btn ok" data-act="reflectModeAllSrc" style="margin-left:8px;padding:4px 8px;font-size:10px">一括 Src</button>
              <button class="btn ok" data-act="reflectModeAllTgt" style="margin-left:4px;padding:4px 8px;font-size:10px">一括 Tgt</button>
              <button class="btn sub" data-act="reflectUndo" style="margin-left:8px">Undo</button>
              <button class="btn sub" data-act="reflectRedo">Redo</button>
            </div>
            <div class="result" id="u_reflectNodeList" style="max-height:230px;margin-top:8px;display:none"></div>
            <div class="btns">
              <button class="btn sub" data-act="previewApplyPlan">反映プラン確認（ドライラン）</button>
              <button class="btn ok" data-act="applyPreview">Source → Target(Preview) 反映</button>
              <button class="btn dark" data-act="deployOnly">デプロイのみ実行</button>
            </div>
          </div>

          <div class="pane" data-pane="field">
            <div style="margin-top:10px">
              <label>追加フィールドJSON（properties形式）</label>
              <textarea id="u_fieldJson" placeholder='{"text_1":{"type":"SINGLE_LINE_TEXT","code":"text_1","label":"テキスト"}}'></textarea>
            </div>
            <div class="grid2" style="margin-top:8px">
              <label class="chip"><input type="checkbox" id="u_overwriteField"> 同一コードは上書き</label>
              <label class="chip"><input type="checkbox" id="u_deployField"> 更新後にデプロイ</label>
            </div>
            <div class="btns">
              <button class="btn warn" data-act="applyField">Target(Preview)へフィールド適用</button>
              <button class="btn sub" data-act="loadTargetFields">Target現在値を読込</button>
              <button class="btn sub" data-act="formatFieldJson" style="margin-left:8px">JSON整形</button>
              <button class="btn sub" data-act="importFieldJson">JSONファイル読込</button>
              <button class="btn sub" data-act="exportFieldJson">JSON保存</button>
            </div>
            
            <div style="margin-top:16px;border-top:1px solid #e2e8f0;padding-top:10px">
              <div class="step" style="font-size:12px;margin-bottom:6px">Source App から選択して追加</div>
              <div class="btns">
                <button class="btn sub" data-act="loadSourceFieldsList">Sourceフィールド一覧を取得</button>
              </div>
              <div id="u_sourceFieldListContainer" style="display:none;margin-top:8px">
                <div style="max-height:220px;overflow:auto;border:1px solid #cbd5e1;background:#fff;border-radius:6px;padding:4px">
                  <table style="border:none;margin:0" id="u_sourceFieldTable">
                    <thead style="position:sticky;top:-4px;background:#f8fafc;z-index:1;box-shadow:0 1px 0 #e2e8f0">
                      <tr>
                        <th style="width:30px;text-align:center"><input type="checkbox" id="u_sourceFieldCheckAll"></th>
                        <th>コード / ラベル</th>
                        <th style="width:120px">タイプ</th>
                      </tr>
                    </thead>
                    <tbody id="u_sourceFieldTbody"></tbody>
                  </table>
                </div>
                <div class="btns" style="margin-top:8px">
                  <button class="btn ok" data-act="insertSelectedSourceFields">選択したフィールドをJSONに挿入（マージ）</button>
                  <button class="btn sub" data-act="closeSourceFieldsList">閉じる</button>
                </div>
              </div>
            </div>

            <input type="file" id="u_fieldJsonFile" accept=".json" style="display:none">
          </div>

          <div class="pane" data-pane="design">
            <div style="margin-top:10px" class="muted">Source設定を設計書として出力します（JSON / Markdown / Excel）。</div>
            <div class="btns">
              <button class="btn" data-act="exportDesignJson">設計書JSON出力</button>
              <button class="btn sub" data-act="exportDesignMd">設計書Markdown出力</button>
              <button class="btn sub" data-act="copyDesignMd" style="margin-left:4px">Markdownコピー</button>
              <button class="btn dark" data-act="exportDesignXlsx" style="margin-left:8px">設計書Excel出力</button>
            </div>
          </div>

          <div class="pane" data-pane="jsconfig">
            <div class="step">JS/CSSカスタマイズ設定の取得・表示・反映</div>
            <div style="margin-top:10px" class="muted">Source App IDのJS/CSSカスタマイズ設定（<code>/app/customize.json</code>）を取得・表示します。編集後にTarget(Preview)へ反映も可能です。</div>
            <div class="grid2" style="margin-top:8px">
              <label class="chip"><input type="checkbox" id="u_jsconfigPreview"> プレビュー版を取得</label>
              <label class="chip"><input type="checkbox" id="u_jsconfigDeployAfter"> 反映後にデプロイ</label>
            </div>
            <div class="btns">
              <button class="btn" data-act="fetchJsConfig">JS/CSS設定を取得</button>
              <button class="btn sub" data-act="exportJsConfigJson">JSON出力</button>
              <button class="btn sub" data-act="importJsConfigJson">JSONファイル読込</button>
              <button class="btn warn" data-act="applyJsConfig">Target(Preview)へ反映</button>
            </div>
            <div style="margin-top:8px">
              <label>JS/CSS設定JSON（編集可能）</label>
              <textarea id="u_jsconfigJson" style="min-height:140px" placeholder='{"desktop":{"js":[...],"css":[...]},"mobile":{"js":[...],"css":[...]}}'></textarea>
            </div>
            <div class="result" id="u_jsconfigResult" style="max-height:300px;margin-top:8px"></div>
            <input type="file" id="u_jsconfigFile" accept=".json" style="display:none">

            <hr style="margin:20px 0;border:none;border-top:1px dashed #ccc"/>
            <div class="step">全アプリのカスタマイズJS一括DL (Target Space)</div>
            <div style="margin-top:10px" class="muted">現在アクセスしているスペース（またはゲストスペース）内の全アプリをスキャンし、JS/CSSファイルの添付を一括でZIP化します。</div>
            <div class="btns" style="margin-top:10px">
              <button class="btn ok" data-act="runBatchJsConfigDownload">全アプリのJSを一括DL (ZIP)</button>
            </div>
          </div>

          <div class="pane" data-pane="recordMgr">
            <div class="step">レコード一括処理（Target App）</div>
            <div style="margin-top:10px" class="muted">Target Appに対して、テストデータの自動生成や全レコードの一括削除を行います。</div>
            <div class="grid2" style="margin-top:8px">
              <div>
                <label>生成件数（テストデータ自動生成用）</label>
                <input type="number" id="u_genCount" value="10" min="1" max="100">
              </div>
            </div>
            <div class="btns">
              <button class="btn ok" data-act="generateDummyRecords">テストデータ自動生成</button>
              <button class="btn warn" data-act="deleteAllRecords">全レコード一括削除</button>
            </div>
            <div class="result" id="u_recordMgrResult" style="max-height:200px;margin-top:8px"></div>

            <hr style="margin:20px 0;border:none;border-top:1px dashed #ccc"/>
            <div class="step">ステータス一括更新 (Target App)</div>
            <div style="margin-top:10px" class="muted">一覧条件に合致する全レコードのプロセス管理ステータスを一括で進めます。</div>
            <div class="grid2" style="margin-top:8px">
              <div>
                <label>対象一覧 (View ID / Query)</label>
                <div style="display:flex;gap:4px">
                  <input type="text" id="u_batchProcView" placeholder="一覧を選択 (APIから取得)" style="flex:1">
                  <button class="btn sm" data-act="loadViewsForProc">一覧取得</button>
                </div>
                <select id="u_batchProcViewSelect" style="display:none;margin-top:4px"></select>
              </div>
              <div>
                <label>アクション名</label>
                <input type="text" id="u_batchProcAction" placeholder="例: 承認, 差し戻し">
              </div>
              <div>
                <label>次の処理者 (オプション)</label>
                <input type="text" id="u_batchProcAssignee" placeholder="ログイン名">
              </div>
            </div>
            <div class="btns" style="margin-top:10px">
              <button class="btn ok" data-act="runBatchProcess">一括更新を実行</button>
            </div>

            <hr style="margin:20px 0;border:none;border-top:1px dashed #ccc"/>
            <div class="step">添付ファイル一括DL (Target App)</div>
            <div style="margin-top:10px" class="muted">一覧条件に合致する全レコードの添付ファイルをZIP形式で一括ダウンロードします。</div>
            <div class="grid2" style="margin-top:8px">
              <div>
                <label>対象一覧 (View ID / Query)</label>
                <div style="display:flex;gap:4px">
                  <input type="text" id="u_batchDlView" placeholder="一覧を選択 (APIから取得)" style="flex:1">
                  <button class="btn sm" data-act="loadViewsForDl">一覧取得</button>
                </div>
                <select id="u_batchDlViewSelect" style="display:none;margin-top:4px"></select>
              </div>
              <div>
                <label>ファイルフィールドコード</label>
                <input type="text" id="u_batchDlFileCode" value="添付ファイル">
              </div>
              <div>
                <label>フォルダ名フィールド</label>
                <input type="text" id="u_batchDlFolderCode" placeholder="空ならレコード番号">
              </div>
              <div>
                <label>ZIPファイル名</label>
                <input type="text" id="u_batchDlZipName" value="download_files.zip">
              </div>
            </div>
            <div class="btns" style="margin-top:10px">
              <button class="btn ok" data-act="runBatchFileDownload">一括ダウンロードを実行</button>
            </div>
          </div>

          
          <div class="pane" data-pane="er">
            <div class="step">ER図自動生成（Source App 起点）</div>
            <div style="margin-top:10px" class="muted">Source Appからルックアップと関連レコードを辿って、関連するアプリのスキーマ（ER図）を自動取得・描画します。</div>
            <div class="btns" style="margin-top:10px">
              <button class="btn" data-act="generateERDiagram">ER図を生成 (別タブ表示)</button>
            </div>
          </div>

          
          <div class="pane" data-pane="sql">
            <div class="step">Kintone SQL ランナー (Source App ベース)</div>
            <div style="margin-top:10px" class="muted">Alasqlを用いて、Kintone上でSQLライクにデータアクセス・集計を行います。</div>
            <div class="btns" style="margin-top:10px">
              <button class="btn ok" data-act="launchKintoneSql">SQLランナーエディタを開く</button>
            </div>
          </div>

          <div class="pane" data-pane="processFlow">
            <div class="step">プロセス管理の図解可視化（Source App）</div>
            <div style="margin-top:10px" class="muted">Source Appのプロセス管理設定からフロー図（Mermaid）を生成し表示します。</div>
            <div class="btns">
              <button class="btn" data-act="renderProcessFlow">フロー図を取得・描画</button>
            </div>
            <div class="grid2" style="margin-top:8px">
              <div>
                <label>Mermaid構文</label>
                <textarea id="u_mermaidText" style="min-height:200px" readonly></textarea>
              </div>
              <div>
                <label>フロー図解プレビュー</label>
                <div id="u_mermaidView" style="min-height:200px;border:1px solid #cbd5e1;border-radius:7px;background:#fff;padding:10px;overflow:auto"></div>
              </div>
            </div>
          </div>
        </div>

        <div class="status" id="u_status">待機中</div>

        <div class="card">
          <div style="font-size:12px;font-weight:700;margin-bottom:6px">結果</div>
          <div class="result" id="u_result"></div>
        </div>
      </div>
    `;
    return root;
  }

  const root = buildRoot();
  document.body.appendChild(root);
  const $ = (id) => root.querySelector(id);

  const ui = {
    tabs: [...root.querySelectorAll('.tab')],
    panes: [...root.querySelectorAll('.pane')],
    status: $('#u_status'),
    result: $('#u_result'),
    sourceApp: $('#u_sourceApp'),
    sourceGuest: $('#u_sourceGuest'),
    sourcePreview: $('#u_sourcePreview'),
    targetApp: $('#u_targetApp'),
    targetGuest: $('#u_targetGuest'),
    targetPreview: $('#u_targetPreview'),
    lookupMap: $('#u_lookupMap'),
    ignoreKeys: $('#u_ignoreKeys'),
    ignoreProfileSelect: $('#u_ignoreProfileSelect'),
    ignoreProfileName: $('#u_ignoreProfileName'),
    bundleState: $('#u_bundleState'),
    sourceBundleFile: $('#u_sourceBundleFile'),
    targetBundleFile: $('#u_targetBundleFile'),
    diffScopes: $('#u_diffScopes'),
    applyScopes: $('#u_applyScopes'),
    applyScopeBlock: $('#u_applyScopeBlock'),
    sectionOptionsBlock: $('#u_sectionOptionsBlock'),
    reflectMode: $('#u_reflectMode'),
    reflectHint: $('#u_reflectHint'),
    applyDiffOnly: $('#u_applyDiffOnly'),
    stopOnError: $('#u_stopOnError'),
    nodeMode: $('#u_nodeMode'),
    nodeWarn: $('#u_nodeWarn'),
    nodeControls: $('#u_nodeControls'),
    reflectNodeList: $('#u_reflectNodeList'),
    doDeploy: $('#u_doDeploy'),
    fieldJson: $('#u_fieldJson'),
    overwriteField: $('#u_overwriteField'),
    deployField: $('#u_deployField'),
    fieldJsonFile: $('#u_fieldJsonFile'),
    sourceFieldListContainer: $('#u_sourceFieldListContainer'),
    sourceFieldTbody: $('#u_sourceFieldTbody'),
    sourceFieldCheckAll: $('#u_sourceFieldCheckAll'),
    jsconfigJson: $('#u_jsconfigJson'),
    jsconfigFile: $('#u_jsconfigFile'),
    jsconfigResult: $('#u_jsconfigResult'),
    jsconfigPreview: $('#u_jsconfigPreview'),
    jsconfigDeployAfter: $('#u_jsconfigDeployAfter'),
    genCount: $('#u_genCount'),
    recordMgrResult: $('#u_recordMgrResult'),
    mermaidText: $('#u_mermaidText'),
    mermaidView: $('#u_mermaidView')
  };

  function setStatus(msg, isError) {
    ui.status.textContent = msg;
    ui.status.style.background = isError ? '#fee2e2' : '#e2e8f0';
    ui.status.style.color = isError ? '#7f1d1d' : '#0f172a';
  }

  function renderResultRows(rows) {
    const summary = summarizeRows(rows);
    if (!rows.length) {
      ui.result.innerHTML = '<div style="padding:10px;font-size:12px;color:#15803d">差分はありません。</div>';
      return;
    }
    const top = `<div style="padding:8px 10px;border-bottom:1px solid #e2e8f0;font-size:11px;background:#f8fafc">件数: Total ${summary.total} / Added ${summary.added} / Removed ${summary.removed} / Changed ${summary.changed} / Moved ${summary.moved}</div>`;
    const html = rows.slice(0, 700).map((r) => {
      const cls = r.type === 'added' ? 'added' : (r.type === 'removed' ? 'removed' : 'changed');
      const typeLabel = r.moved ? `${r.type}(moved)` : r.type;
      const srcJson = esc(JSON.stringify(r.left, null, 2));
      const tgtJson = esc(JSON.stringify(r.right, null, 2));
      const btnRawSrc = r.left !== undefined ? `<button class="btn sub" style="padding:2px 4px;font-size:10px;margin-bottom:4px" data-copy-val="${esc(JSON.stringify(r.left))}">コピー</button>` : '';
      const btnRawTgt = r.right !== undefined ? `<button class="btn sub" style="padding:2px 4px;font-size:10px;margin-bottom:4px" data-copy-val="${esc(JSON.stringify(r.right))}">コピー</button>` : '';

      return `<tr>
        <td>${esc(r.section || '-')}</td>
        <td class="${cls}">${esc(typeLabel)}</td>
        <td title="${esc(r.path || '-')}">${esc(r.path || '-')}</td>
        <td style="vertical-align:top">${btnRawSrc}<pre style="margin:0;white-space:pre-wrap">${srcJson}</pre></td>
        <td style="vertical-align:top">${btnRawTgt}<pre style="margin:0;white-space:pre-wrap">${tgtJson}</pre></td>
      </tr>`;
    }).join('');
    ui.result.innerHTML = `${top}<table>
      <thead><tr><th>Section</th><th>Type</th><th>Path</th><th>Source</th><th>Target</th></tr></thead>
      <tbody>${html}</tbody>
    </table>`;
  }

  function selectedScopeKeys(container) {
    return [...container.querySelectorAll('input[type="checkbox"]:checked')].map((x) => x.value);
  }

  function snapshotReflectState() {
    return {
      selectedIds: [...state.reflectSelectedIds],
      modes: { ...state.reflectNodeModes }
    };
  }

  function restoreReflectState(snapshot) {
    state.reflectSelectedIds = new Set(snapshot?.selectedIds || []);
    state.reflectNodeModes = { ...(snapshot?.modes || {}) };
  }

  function pushReflectUndo() {
    state.reflectUndoStack.push(snapshotReflectState());
    if (state.reflectUndoStack.length > 50) state.reflectUndoStack.shift();
    state.reflectRedoStack = [];
  }

  function undoReflectState() {
    if (!state.reflectUndoStack.length) return false;
    state.reflectRedoStack.push(snapshotReflectState());
    restoreReflectState(state.reflectUndoStack.pop());
    return true;
  }

  function redoReflectState() {
    if (!state.reflectRedoStack.length) return false;
    state.reflectUndoStack.push(snapshotReflectState());
    restoreReflectState(state.reflectRedoStack.pop());
    return true;
  }

  function reflectRowModeById(rowId) {
    return state.reflectNodeModes[rowId] === 'tgt' ? 'tgt' : 'src';
  }

  function reflectRowDesiredValue(row) {
    return reflectRowModeById(row._id) === 'tgt' ? row.right : row.left;
  }

  function renderScopeChips() {
    ui.diffScopes.innerHTML = SECTION_DEFS.map((s) => `<label class="chip"><input type="checkbox" value="${s.key}" checked>${s.label}</label>`).join('');
    ui.applyScopes.innerHTML = SECTION_DEFS.filter((s) => s.put).map((s) => `<label class="chip"><input type="checkbox" value="${s.key}" checked>${s.label}</label>`).join('');
  }

  function renderIgnoreProfileOptions() {
    const profiles = loadIgnoreProfiles();
    const opts = ['<option value="">-- プロファイル選択 --</option>']
      .concat(Object.keys(profiles).sort().map((n) => `<option value="${esc(n)}">${esc(n)}</option>`));
    ui.ignoreProfileSelect.innerHTML = opts.join('');
  }

  function renderBundleState() {
    const sourceText = state.importedSourceBundle ? `Source: 読込済み(${state.importedSourceName || state.importedSourceBundle.appId || '-'})` : 'Source: API取得';
    const targetText = state.importedTargetBundle ? `Target: 読込済み(${state.importedTargetName || state.importedTargetBundle.appId || '-'})` : 'Target: API取得';
    ui.bundleState.textContent = `${sourceText} / ${targetText}`;
    const rangeMode = ui.nodeMode?.checked
      ? `選択ノード(${state.reflectSelectedIds.size})`
      : (ui.applyDiffOnly?.checked ? '前回差分セクションのみ' : '選択セクション');
    ui.reflectMode.textContent = `${sourceText} / Target: Preview API / 反映範囲: ${rangeMode}`;
  }

  function renderReflectModeUi() {
    const node = !!ui.nodeMode.checked;
    const scopeChecks = [...ui.applyScopes.querySelectorAll('input[type="checkbox"]')];
    scopeChecks.forEach((c) => { c.disabled = node; });
    ui.applyDiffOnly.disabled = node;
    ui.applyScopeBlock.style.opacity = node ? '0.55' : '1';
    ui.sectionOptionsBlock.style.opacity = node ? '0.55' : '1';
    ui.nodeWarn.style.display = node ? 'block' : 'none';
    ui.nodeControls.style.display = node ? 'flex' : 'none';
    ui.reflectNodeList.style.display = node ? 'block' : 'none';
    ui.reflectHint.textContent = node
      ? `ノード反映モード: 差分ノードを選択して部分反映します（選択: ${state.reflectSelectedIds.size}件 / Undo: ${state.reflectUndoStack.length}）`
      : 'セクション反映モード: 選択したセクション単位でSourceをTarget(Preview)へ反映します';
  }

  function commonParams() {
    return {
      source: {
        appId: ui.sourceApp.value.trim(),
        guestId: ui.sourceGuest.value.trim(),
        preview: ui.sourcePreview.checked
      },
      target: {
        appId: ui.targetApp.value.trim(),
        guestId: ui.targetGuest.value.trim(),
        preview: ui.targetPreview.checked
      }
    };
  }

  function saveCurrentDialogState() {
    saveDialogState({
      sourceAppId: ui.sourceApp.value.trim(),
      sourceGuestId: ui.sourceGuest.value.trim(),
      sourcePreview: ui.sourcePreview.checked,
      targetAppId: ui.targetApp.value.trim(),
      targetGuestId: ui.targetGuest.value.trim(),
      targetPreview: ui.targetPreview.checked,
      lookupMap: ui.lookupMap.value.trim(),
      ignoreKeys: ui.ignoreKeys.value.trim(),
      diffScopes: selectedScopeKeys(ui.diffScopes),
      applyScopes: selectedScopeKeys(ui.applyScopes),
      applyDiffOnly: ui.applyDiffOnly.checked,
      stopOnError: ui.stopOnError.checked,
      nodeMode: ui.nodeMode.checked,
      doDeploy: ui.doDeploy.checked,
      overwriteField: ui.overwriteField.checked,
      deployField: ui.deployField.checked
    });
  }

  function restoreDialogState() {
    const saved = loadDialogState();
    if (!saved || typeof saved !== 'object') return;
    if (saved.sourceAppId != null) ui.sourceApp.value = String(saved.sourceAppId);
    if (saved.sourceGuestId != null) ui.sourceGuest.value = String(saved.sourceGuestId);
    if (saved.sourcePreview != null) ui.sourcePreview.checked = !!saved.sourcePreview;
    if (saved.targetAppId != null) ui.targetApp.value = String(saved.targetAppId);
    if (saved.targetGuestId != null) ui.targetGuest.value = String(saved.targetGuestId);
    if (saved.targetPreview != null) ui.targetPreview.checked = !!saved.targetPreview;
    if (saved.lookupMap != null) ui.lookupMap.value = String(saved.lookupMap);
    if (saved.ignoreKeys != null) ui.ignoreKeys.value = String(saved.ignoreKeys);
    if (saved.applyDiffOnly != null) ui.applyDiffOnly.checked = !!saved.applyDiffOnly;
    if (saved.stopOnError != null) ui.stopOnError.checked = !!saved.stopOnError;
    if (saved.nodeMode != null) ui.nodeMode.checked = !!saved.nodeMode;
    if (saved.doDeploy != null) ui.doDeploy.checked = !!saved.doDeploy;
    if (saved.overwriteField != null) ui.overwriteField.checked = !!saved.overwriteField;
    if (saved.deployField != null) ui.deployField.checked = !!saved.deployField;

    const markChecks = (container, selected) => {
      if (!Array.isArray(selected) || !selected.length) return;
      const set = new Set(selected);
      [...container.querySelectorAll('input[type="checkbox"]')].forEach((c) => {
        c.checked = set.has(c.value);
      });
    };
    markChecks(ui.diffScopes, saved.diffScopes);
    markChecks(ui.applyScopes, saved.applyScopes);
  }

  function parseBundleLikeObject(raw, side) {
    let obj = raw;
    if (obj && typeof obj === 'object' && obj.source && obj.target) {
      obj = side === 'source' ? obj.source : obj.target;
    }
    return ensureBundleShape(obj);
  }

  async function importBundleFromFile(side, file) {
    const text = await readTextFile(file);
    const raw = JSON.parse(text);
    const bundle = parseBundleLikeObject(raw, side);
    if (side === 'source') {
      state.importedSourceBundle = bundle;
      state.importedSourceName = file.name || '';
      state.lastSourceBundle = bundle;
    } else {
      state.importedTargetBundle = bundle;
      state.importedTargetName = file.name || '';
      state.lastTargetBundle = bundle;
    }
    renderBundleState();
  }

  async function runDiff() {
    const c = commonParams();
    const scopes = selectedScopeKeys(ui.diffScopes);
    if (!scopes.length) throw new Error('比較セクションを選択してください');
    if (!state.importedSourceBundle && !c.source.appId) throw new Error('Source App ID を入力してください');
    if (!state.importedTargetBundle && !c.target.appId) throw new Error('Target App ID を入力してください');
    saveCurrentDialogState();

    setStatus('Source取得中...');
    const source = await resolveBundle('source', c.source, scopes, (p, l) => setStatus(`Source取得中 ${Math.round(p * 100)}% (${l})`));
    setStatus('Target取得中...');
    const target = await resolveBundle('target', c.target, scopes, (p, l) => setStatus(`Target取得中 ${Math.round(p * 100)}% (${l})`));

    setStatus('差分計算中...');
    const rows = computeDiffRows(source, target, scopes, ui.ignoreKeys.value);
    state.lastSourceBundle = source;
    state.lastTargetBundle = target;
    state.lastDiffRows = rows;
    state.lastDiffAt = new Date().toISOString();
    renderResultRows(rows);
    if (ui.nodeMode.checked || state.reflectRows.length) {
      try {
        loadReflectRowsFromLastDiff();
      } catch (e) {
        console.warn(e);
      }
    }
    const s = summarizeRows(rows);
    setStatus(`差分比較完了: ${s.total}件 (A:${s.added} R:${s.removed} C:${s.changed} M:${s.moved})`);
  }

  async function exportBundleJson() {
    if (!state.lastSourceBundle || !state.lastTargetBundle) throw new Error('先に差分比較を実行してください');
    const payload = {
      generatedAt: new Date().toISOString(),
      source: state.lastSourceBundle,
      target: state.lastTargetBundle
    };
    downloadText(`bundle_${nowStamp()}.json`, JSON.stringify(payload, null, 2), 'application/json');
    setStatus('バンドルJSONを保存しました');
  }

  async function exportDiffJson() {
    if (!state.lastDiffRows.length) throw new Error('先に差分比較を実行してください');
    const payload = {
      generatedAt: new Date().toISOString(),
      source: state.lastSourceBundle,
      target: state.lastTargetBundle,
      diffCount: state.lastDiffRows.length,
      rows: state.lastDiffRows
    };
    downloadText(`diff_${nowStamp()}.json`, JSON.stringify(payload, null, 2), 'application/json');
    setStatus('差分JSONを保存しました');
  }

  async function exportDiffHtml() {
    if (!state.lastDiffRows.length) throw new Error('先に差分比較を実行してください');
    const scopes = selectedScopeKeys(ui.diffScopes);
    const html = buildDiffHtml(state.lastSourceBundle, state.lastTargetBundle, state.lastDiffRows, scopes, ui.ignoreKeys.value);
    downloadText(`diff_${nowStamp()}.html`, html, 'text/html');
    setStatus('差分HTMLを保存しました');
  }

  async function exportPatchJson() {
    if (!state.lastDiffRows.length) throw new Error('先に差分比較を実行してください');
    const payload = buildPatchPayload(state.lastDiffRows, state.lastSourceBundle, state.lastTargetBundle);
    downloadText(`patch_${nowStamp()}.json`, JSON.stringify(payload, null, 2), 'application/json');
    setStatus('パッチJSONを保存しました');
  }

  function parseFieldInput(text) {
    const obj = JSON.parse(text);
    if (!obj || typeof obj !== 'object') throw new Error('JSONはオブジェクト形式で入力してください');
    if (obj.properties && typeof obj.properties === 'object') return obj.properties;
    return obj;
  }

  function parseLookupMapInput(text) {
    const raw = String(text || '').trim();
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('Lookup AppID変換はJSONオブジェクトで入力してください');
    }
    const map = {};
    for (const [k, v] of Object.entries(parsed)) {
      const from = String(k).trim();
      const to = String(v).trim();
      if (!from || !to) continue;
      map[from] = to;
    }
    return map;
  }

  function convertLookupAppIds(fieldDef, map) {
    const def = deepClone(fieldDef || {});
    const lookupMap = map || {};
    if (!Object.keys(lookupMap).length) return { def, changed: false };
    let changed = false;
    const walk = (node) => {
      if (!node || typeof node !== 'object') return;
      const relatedApp = node.lookup && node.lookup.relatedApp;
      if (relatedApp && relatedApp.app != null) {
        const before = String(relatedApp.app);
        const after = lookupMap[before];
        if (after && String(after) !== before) {
          node.lookup.relatedApp.app = String(after);
          changed = true;
        }
      }
      if (node.type === 'SUBTABLE' && node.fields && typeof node.fields === 'object') {
        Object.values(node.fields).forEach(walk);
      }
    };
    walk(def);
    return { def, changed };
  }

  function splitUpsertMap(currentMap, incomingMap, options) {
    const overwrite = !!(options && options.overwrite);
    const renameOnConflict = !!(options && options.renameOnConflict);
    const codeField = (options && options.codeField) || 'code';
    const add = {};
    const update = {};
    const logs = [];
    const used = new Set(Object.keys(currentMap || {}));

    for (const [rawKey, rawDef] of Object.entries(incomingMap || {})) {
      const key = String(rawKey);
      const def = deepClone(rawDef || {});
      if (!def[codeField]) def[codeField] = key;

      if (!used.has(key)) {
        add[key] = def;
        used.add(key);
        logs.push(`ADD ${key}`);
        continue;
      }

      if (overwrite) {
        update[key] = def;
        logs.push(`UPDATE ${key}`);
        continue;
      }

      if (renameOnConflict) {
        let n = 2;
        let next = `${key}_${n}`;
        while (used.has(next)) {
          n += 1;
          next = `${key}_${n}`;
        }
        def[codeField] = next;
        add[next] = def;
        used.add(next);
        logs.push(`RENAME ${key} -> ${next}`);
      } else {
        logs.push(`SKIP ${key} (already exists)`);
      }
    }
    return { add, update, logs };
  }

  function filterWritableFieldProps(props, skipSystem) {
    if (!skipSystem) return deepClone(props || {});
    const out = {};
    for (const [k, def] of Object.entries(props || {})) {
      if (!def || typeof def !== 'object') continue;
      if (SYSTEM_FIELD_TYPES.has(def.type)) continue;
      out[k] = deepClone(def);
    }
    return out;
  }

  async function upsertFields(prefix, app, incomingProps, options) {
    const writableIncoming = filterWritableFieldProps(incomingProps, options && options.skipSystem);
    const lookupMap = (options && options.lookupMap) || {};
    const convertedIncoming = {};
    for (const [code, def] of Object.entries(writableIncoming || {})) {
      const converted = convertLookupAppIds(def, lookupMap);
      convertedIncoming[code] = converted.def;
    }
    const current = await apiGet(prefix, '/app/form/fields.json', { app });
    const split = splitUpsertMap(current.properties || {}, convertedIncoming || {}, {
      overwrite: options && options.overwrite,
      renameOnConflict: options && options.renameOnConflict,
      codeField: 'code'
    });

    if (Object.keys(split.add).length) await apiPost(prefix, '/app/form/fields.json', { app, properties: split.add });
    if (Object.keys(split.update).length) await apiPut(prefix, '/app/form/fields.json', { app, properties: split.update });
    return split.logs;
  }

  async function runFieldApply() {
    const c = commonParams();
    if (!c.target.appId) throw new Error('Target App ID を入力してください');
    const input = ui.fieldJson.value.trim();
    if (!input) throw new Error('フィールドJSONを入力してください');

    const incoming = parseFieldInput(input);
    const lookupMap = parseLookupMapInput(ui.lookupMap.value);
    const prefix = buildApiPrefix(c.target.guestId, true);
    const app = c.target.appId;

    setStatus('フィールド追加/更新中...');
    const logs = await upsertFields(prefix, app, incoming, {
      overwrite: ui.overwriteField.checked,
      renameOnConflict: !ui.overwriteField.checked,
      lookupMap
    });
    logs.push('OK フィールド反映');

    if (ui.deployField.checked) {
      setStatus('デプロイ実行中...');
      await apiPost(prefix, '/app/deploy.json', { apps: [{ app, revision: -1 }] });
      logs.push('OK デプロイ実行');
    }
    ui.result.innerHTML = `<pre style="margin:0;padding:10px;font-size:12px;white-space:pre-wrap">${esc(logs.join('\n'))}</pre>`;
    setStatus('フィールド追加処理完了');
  }

  async function runLoadTargetFields() {
    const c = commonParams();
    if (!c.target.appId) throw new Error('Target App ID を入力してください');
    const prefix = buildApiPrefix(c.target.guestId, true);
    setStatus('Targetフィールド取得中...');
    const res = await apiGet(prefix, '/app/form/fields.json', { app: c.target.appId });
    ui.fieldJson.value = JSON.stringify({ properties: res.properties || {} }, null, 2);
    setStatus('Targetフィールドを読み込みました');
  }

  function loadReflectRowsFromLastDiff() {
    if (!state.lastDiffRows.length) throw new Error('先に差分比較を実行してください');
    const putKeys = new Set(SECTION_DEFS.filter((d) => d.put).map((d) => d.key));
    const rows = state.lastDiffRows
      .filter((r) => putKeys.has(r.sectionKey))
      .map((r, idx) => ({ ...r, _id: `n${idx}` }));
    state.reflectRows = rows;
    state.reflectSelectedIds = new Set(rows.map((r) => r._id));
    state.reflectNodeModes = {};
    rows.forEach((r) => { state.reflectNodeModes[r._id] = 'src'; });
    state.reflectUndoStack = [];
    state.reflectRedoStack = [];
    renderReflectNodeList();
    setStatus(`差分ノードを読込: ${rows.length}件`);
  }

  function renderReflectNodeList() {
    const rows = state.reflectRows || [];
    if (!rows.length) {
      ui.reflectNodeList.innerHTML = '<div style="padding:10px;font-size:12px;color:#64748b">差分ノード未読込（差分比較後に「差分ノード読込」）</div>';
      renderBundleState();
      renderReflectModeUi();
      return;
    }
    const selected = state.reflectSelectedIds || new Set();
    const selectedCount = rows.filter((r) => selected.has(r._id)).length;
    const selectedRows = rows.filter((r) => selected.has(r._id));
    const srcCount = selectedRows.filter((r) => reflectRowModeById(r._id) === 'src').length;
    const tgtCount = selectedRows.length - srcCount;
    const header = `<div style="padding:8px 10px;border-bottom:1px solid #e2e8f0;font-size:11px;background:#f8fafc">候補 ${rows.length}件 / 選択 ${selectedCount}件 / Src ${srcCount} / Tgt ${tgtCount}</div>`;
    const body = rows.slice(0, 1200).map((r) => {
      const cls = r.type === 'added' ? '#166534' : (r.type === 'removed' ? '#b91c1c' : '#92400e');
      const checked = selected.has(r._id) ? 'checked' : '';
      const mode = reflectRowModeById(r._id);
      const typeLabel = r.moved ? `${r.type}(moved)` : (r.type || '-');
      return `<tr>
        <td><input type="checkbox" data-node-id="${esc(r._id)}" ${checked}></td>
        <td><button type="button" data-node-mode="${esc(r._id)}" style="border:1px solid #cbd5e1;border-radius:6px;padding:2px 6px;font-size:10px;background:${mode === 'src' ? '#dbeafe' : '#dcfce7'};color:${mode === 'src' ? '#1d4ed8' : '#166534'};font-weight:700;cursor:pointer">${mode === 'src' ? 'Src' : 'Tgt'}</button></td>
        <td>${esc(r.section || '-')}</td>
        <td style="color:${cls};font-weight:700">${esc(typeLabel)}</td>
        <td title="${esc(r.path || '-')}">${esc(r.path || '-')}</td>
      </tr>`;
    }).join('');
    ui.reflectNodeList.innerHTML = `${header}<table>
      <thead><tr><th style="width:52px">Use</th><th style="width:66px">Mode</th><th>Section</th><th>Type</th><th>Path</th></tr></thead>
      <tbody>${body}</tbody>
    </table>`;
    renderBundleState();
    renderReflectModeUi();
  }

  function getSelectedReflectRows() {
    const selected = state.reflectSelectedIds || new Set();
    return (state.reflectRows || []).filter((r) => selected.has(r._id));
  }

  function relativePathFromRow(path, secKey) {
    if (!path) return '';
    if (path === secKey) return '';
    if (path.startsWith(`${secKey}.`)) return path.slice(secKey.length + 1);
    if (path.startsWith(`${secKey}[`)) return path.slice(secKey.length);
    return null;
  }

  function tokenizePath(path) {
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

  function getByTokens(root, tokens) {
    let cur = root;
    for (const tk of tokens) {
      if (typeof tk === 'number') {
        if (!Array.isArray(cur) || tk < 0 || tk >= cur.length) return undefined;
        cur = cur[tk];
      } else {
        if (!cur || typeof cur !== 'object' || !Object.prototype.hasOwnProperty.call(cur, tk)) return undefined;
        cur = cur[tk];
      }
    }
    return cur;
  }

  function itemKeySignature(v) {
    return `${typeof v}:${String(v)}`;
  }

  function resolveArrayKeyValue(row, desired) {
    const key = row.arrayKey;
    if (!key) return { key: null, value: undefined };
    if (row.arrayKeyValue !== undefined) return { key, value: row.arrayKeyValue };
    const candidates = [desired, row.left, row.right];
    for (const obj of candidates) {
      if (obj && typeof obj === 'object' && Object.prototype.hasOwnProperty.call(obj, key)) {
        return { key, value: obj[key] };
      }
    }
    return { key, value: undefined };
  }

  function findArrayIndexByKey(arr, key, value) {
    if (!Array.isArray(arr) || !key) return -1;
    const sig = itemKeySignature(value);
    for (let i = 0; i < arr.length; i++) {
      const obj = arr[i];
      if (!obj || typeof obj !== 'object') continue;
      if (!Object.prototype.hasOwnProperty.call(obj, key)) continue;
      if (itemKeySignature(obj[key]) === sig) return i;
    }
    return -1;
  }

  function applyArrayRowByKey(sectionObj, row, tokens, desired) {
    if (!row.arrayKey) return null;
    if (!tokens.length) return null;
    const last = tokens[tokens.length - 1];
    if (typeof last !== 'number') return null;
    const arr = getByTokens(sectionObj, tokens.slice(0, -1));
    if (!Array.isArray(arr)) return null;

    const mode = reflectRowModeById(row._id);
    const { key, value } = resolveArrayKeyValue(row, desired);
    if (!key || value === undefined) return null;
    const curIndex = findArrayIndexByKey(arr, key, value);

    if (desired === undefined) {
      if (curIndex < 0) return { section: sectionObj, applied: false, op: 'delete', reason: 'array item not found' };
      arr.splice(curIndex, 1);
      return { section: sectionObj, applied: true, op: 'delete' };
    }

    const preferredIndex = row.moved
      ? (mode === 'src' && Number.isInteger(row.movedFrom)
        ? row.movedFrom
        : (Number.isInteger(row.movedTo) ? row.movedTo : last))
      : last;
    const bounded = (n, max) => Math.max(0, Math.min(max, Number.isInteger(n) ? n : max));
    const insertItem = deepClone(desired);

    if (curIndex >= 0) {
      arr.splice(curIndex, 1);
      const ins = bounded(preferredIndex, arr.length);
      arr.splice(ins, 0, insertItem);
    } else {
      const ins = bounded(preferredIndex, arr.length);
      arr.splice(ins, 0, insertItem);
    }
    return { section: sectionObj, applied: true, op: row.moved ? 'move' : 'set' };
  }

  function setByTokens(root, tokens, value) {
    if (!tokens.length) return deepClone(value);
    if (root == null || typeof root !== 'object') root = {};
    let cur = root;
    for (let i = 0; i < tokens.length - 1; i++) {
      const tk = tokens[i];
      const next = tokens[i + 1];
      if (typeof tk === 'number') {
        if (!Array.isArray(cur)) return root;
        if (cur[tk] == null || typeof cur[tk] !== 'object') cur[tk] = typeof next === 'number' ? [] : {};
        cur = cur[tk];
      } else {
        if (cur[tk] == null || typeof cur[tk] !== 'object') cur[tk] = typeof next === 'number' ? [] : {};
        cur = cur[tk];
      }
    }
    const last = tokens[tokens.length - 1];
    if (typeof last === 'number') {
      if (!Array.isArray(cur)) return root;
      cur[last] = deepClone(value);
    } else {
      cur[last] = deepClone(value);
    }
    return root;
  }

  function deleteByTokens(root, tokens) {
    if (!tokens.length) return { root, deleted: false };
    let cur = root;
    for (let i = 0; i < tokens.length - 1; i++) {
      const tk = tokens[i];
      if (typeof tk === 'number') {
        if (!Array.isArray(cur) || cur[tk] == null) return { root, deleted: false };
        cur = cur[tk];
      } else {
        if (!cur || typeof cur !== 'object' || !Object.prototype.hasOwnProperty.call(cur, tk)) return { root, deleted: false };
        cur = cur[tk];
      }
    }
    const last = tokens[tokens.length - 1];
    if (typeof last === 'number') {
      if (!Array.isArray(cur) || last < 0 || last >= cur.length) return { root, deleted: false };
      cur.splice(last, 1);
      return { root, deleted: true };
    }
    if (!cur || typeof cur !== 'object' || !Object.prototype.hasOwnProperty.call(cur, last)) return { root, deleted: false };
    delete cur[last];
    return { root, deleted: true };
  }

  function applyDiffRowToSection(sectionObj, row, secKey) {
    const rel = relativePathFromRow(row.path, secKey);
    if (rel == null) return { section: sectionObj, applied: false, op: 'skip', reason: 'path mismatch' };
    const desired = reflectRowDesiredValue(row);
    if (desired === undefined) {
      if (!rel) return { section: sectionObj, applied: false, op: 'skip', reason: 'root delete unsupported' };
      const tokens = tokenizePath(rel);
      const keyDel = applyArrayRowByKey(sectionObj, row, tokens, desired);
      if (keyDel) return keyDel;
      const out = deleteByTokens(sectionObj, tokens);
      return { section: out.root, applied: out.deleted, op: 'delete', reason: out.deleted ? '' : 'target path not found' };
    }
    if (!rel) {
      return { section: deepClone(desired), applied: true, op: 'set' };
    }
    const tokens = tokenizePath(rel);
    const keySet = applyArrayRowByKey(sectionObj, row, tokens, desired);
    if (keySet) return keySet;
    return { section: setByTokens(sectionObj, tokens, desired), applied: true, op: 'set' };
  }

  function compareTokensForDelete(aTokens, bTokens) {
    const n = Math.min(aTokens.length, bTokens.length);
    for (let i = 0; i < n; i++) {
      const a = aTokens[i];
      const b = bTokens[i];
      if (a === b) continue;
      const aNum = typeof a === 'number';
      const bNum = typeof b === 'number';
      if (aNum && bNum) return b - a;
      if (aNum && !bNum) return -1;
      if (!aNum && bNum) return 1;
      return String(a).localeCompare(String(b));
    }
    return bTokens.length - aTokens.length;
  }

  function sortRowsForPatch(rows, secKey) {
    return [...rows].sort((a, b) => {
      const aDel = reflectRowDesiredValue(a) === undefined;
      const bDel = reflectRowDesiredValue(b) === undefined;
      if (aDel && !bDel) return -1;
      if (!aDel && bDel) return 1;

      const aRel = relativePathFromRow(a.path, secKey) || '';
      const bRel = relativePathFromRow(b.path, secKey) || '';
      const aTokens = tokenizePath(aRel);
      const bTokens = tokenizePath(bRel);
      if (aDel && bDel) return compareTokensForDelete(aTokens, bTokens);
      if (aTokens.length !== bTokens.length) return aTokens.length - bTokens.length;
      return aRel.localeCompare(bRel);
    });
  }

  function extractFieldCodeFromRowPath(row) {
    const rel = relativePathFromRow(row.path, 'fieldSettings');
    if (!rel) return null;
    const tokens = tokenizePath(rel);
    if (tokens[0] !== 'properties' || typeof tokens[1] !== 'string') return null;
    return tokens[1];
  }

  function planFieldSectionDiffRequests(app, beforeProps, afterProps, lookupMap, sourceModeCodes) {
    const beforeMap = filterWritableFieldProps(beforeProps, true);
    const afterMap = filterWritableFieldProps(afterProps, true);
    const add = {};
    const update = {};
    const del = [];
    let lookupChanged = 0;

    for (const [code, def] of Object.entries(afterMap || {})) {
      const shouldConvert = !sourceModeCodes || sourceModeCodes.has(code);
      const converted = shouldConvert ? convertLookupAppIds(def, lookupMap) : { def: deepClone(def), changed: false };
      if (converted.changed) lookupChanged += 1;
      const outDef = converted.def;
      if (!beforeMap || !beforeMap[code]) {
        add[code] = outDef;
      } else if (stableStringify(beforeMap[code]) !== stableStringify(outDef)) {
        update[code] = outDef;
      }
    }
    for (const code of Object.keys(beforeMap || {})) {
      if (!Object.prototype.hasOwnProperty.call(afterMap || {}, code)) del.push(code);
    }

    const requests = [];
    if (Object.keys(add).length) requests.push({ method: 'POST', path: '/app/form/fields.json', body: { app, properties: add }, note: `fields add:${Object.keys(add).length}` });
    if (Object.keys(update).length) requests.push({ method: 'PUT', path: '/app/form/fields.json', body: { app, properties: update }, note: `fields update:${Object.keys(update).length}` });
    if (del.length) requests.push({ method: 'DELETE', path: '/app/form/fields.json', body: { app, fields: del }, note: `fields delete:${del.length}` });
    return { requests, addCount: Object.keys(add).length, updateCount: Object.keys(update).length, deleteCount: del.length, lookupChanged };
  }

  function splitMapSectionDiff(beforeMap, afterMap) {
    const before = (beforeMap && typeof beforeMap === 'object' && !Array.isArray(beforeMap)) ? beforeMap : {};
    const after = (afterMap && typeof afterMap === 'object' && !Array.isArray(afterMap)) ? afterMap : {};
    const add = {};
    const update = {};
    const del = [];
    for (const [k, v] of Object.entries(after)) {
      if (!Object.prototype.hasOwnProperty.call(before, k)) {
        add[k] = deepClone(v);
      } else if (stableStringify(before[k]) !== stableStringify(v)) {
        update[k] = deepClone(v);
      }
    }
    for (const k of Object.keys(before)) {
      if (!Object.prototype.hasOwnProperty.call(after, k)) del.push(k);
    }
    return { add, update, del };
  }

  function planViewsSectionDiffRequests(app, beforeViews, afterViews) {
    const split = splitMapSectionDiff(beforeViews, afterViews);
    const up = { ...split.add, ...split.update };
    const requests = [];
    if (Object.keys(up).length) requests.push({ method: 'PUT', path: '/app/views.json', body: { app, views: up }, note: `views upsert:${Object.keys(up).length}` });
    return { requests, upsertCount: Object.keys(up).length, deleteSkipCount: split.del.length };
  }

  function planReportsSectionDiffRequests(app, beforeReports, afterReports) {
    const split = splitMapSectionDiff(beforeReports, afterReports);
    const up = { ...split.add, ...split.update };
    const requests = [];
    if (Object.keys(up).length) requests.push({ method: 'PUT', path: '/app/reports.json', body: { app, reports: up }, note: `reports upsert:${Object.keys(up).length}` });
    if (split.del.length) requests.push({ method: 'DELETE', path: '/app/reports.json', body: { app, reports: split.del }, note: `reports delete:${split.del.length}` });
    return { requests, upsertCount: Object.keys(up).length, deleteCount: split.del.length };
  }

  function planActionsSectionDiffRequests(app, beforeActions, afterActions) {
    const split = splitMapSectionDiff(beforeActions, afterActions);
    const up = { ...split.add, ...split.update };
    const requests = [];
    if (Object.keys(up).length) requests.push({ method: 'PUT', path: '/app/actions.json', body: { app, actions: up }, note: `actions upsert:${Object.keys(up).length}` });
    return { requests, upsertCount: Object.keys(up).length, deleteSkipCount: split.del.length };
  }

  function appendRequestPlanLogs(logs, plan) {
    const reqs = plan?.requests || [];
    for (const req of reqs) {
      logs.push(`  - PLAN ${req.method} ${req.path}${req.note ? ` (${req.note})` : ''}`);
    }
  }

  async function executeRequestPlan(prefix, requests, logs, stopOnError) {
    const list = Array.isArray(requests) ? requests : [];
    for (let i = 0; i < list.length; i++) {
      const req = list[i];
      try {
        await apiCallWithRetry(prefix, req.path, req.method, req.body, 2);
        if (logs) logs.push(`  - OK ${req.method} ${req.path}${req.note ? ` (${req.note})` : ''}`);
      } catch (e) {
        if (logs) logs.push(`  - NG ${req.method} ${req.path}: ${e.message || String(e)}`);
        if (stopOnError) throw e;
      }
    }
  }

  async function applyFieldSectionDiff(prefix, app, beforeProps, afterProps, logs, lookupMap, sourceModeCodes, stopOnError) {
    const plan = planFieldSectionDiffRequests(app, beforeProps, afterProps, lookupMap, sourceModeCodes);
    appendRequestPlanLogs(logs, plan);
    await executeRequestPlan(prefix, plan.requests, logs, stopOnError);
    if (plan.lookupChanged) logs.push(`  - lookup appId 変換: ${plan.lookupChanged}`);
  }

  async function applyViewsSectionDiff(prefix, app, beforeViews, afterViews, logs, stopOnError) {
    const plan = planViewsSectionDiffRequests(app, beforeViews, afterViews);
    appendRequestPlanLogs(logs, plan);
    await executeRequestPlan(prefix, plan.requests, logs, stopOnError);
    if (plan.deleteSkipCount) logs.push(`  - views delete(skip): ${plan.deleteSkipCount} (互換モード: 削除は行いません)`);
  }

  async function applyReportsSectionDiff(prefix, app, beforeReports, afterReports, logs, stopOnError) {
    const plan = planReportsSectionDiffRequests(app, beforeReports, afterReports);
    appendRequestPlanLogs(logs, plan);
    await executeRequestPlan(prefix, plan.requests, logs, stopOnError);
  }

  async function applyActionsSectionDiff(prefix, app, beforeActions, afterActions, logs, stopOnError) {
    const plan = planActionsSectionDiffRequests(app, beforeActions, afterActions);
    appendRequestPlanLogs(logs, plan);
    await executeRequestPlan(prefix, plan.requests, logs, stopOnError);
    if (plan.deleteSkipCount) logs.push(`  - actions delete(skip): ${plan.deleteSkipCount} (互換モード: 削除は行いません)`);
  }

  async function runPreviewApplyPlanNodes() {
    const c = commonParams();
    if (!c.target.appId) throw new Error('Target App ID を入力してください');
    if (!state.reflectRows.length) loadReflectRowsFromLastDiff();
    const rows = getSelectedReflectRows();
    if (!rows.length) throw new Error('反映ノードを選択してください');
    const lookupMap = parseLookupMapInput(ui.lookupMap.value);
    const prefix = buildApiPrefix(c.target.guestId, true);
    const app = c.target.appId;

    const sectionMap = {};
    let srcCount = 0;
    let tgtCount = 0;
    for (const r of rows) {
      const key = r.sectionKey;
      if (!key) continue;
      if (!sectionMap[key]) sectionMap[key] = { total: 0, added: 0, removed: 0, changed: 0 };
      sectionMap[key].total += 1;
      if (reflectRowModeById(r._id) === 'src') srcCount += 1;
      else tgtCount += 1;
      if (r.type === 'added') sectionMap[key].added += 1;
      else if (r.type === 'removed') sectionMap[key].removed += 1;
      else sectionMap[key].changed += 1;
    }

    const lines = [];
    lines.push('=== 反映プラン（ノードモード）===');
    lines.push(`Target App: ${c.target.appId}`);
    lines.push(`選択ノード数: ${rows.length}`);
    lines.push(`モード内訳: Src ${srcCount} / Tgt ${tgtCount}`);
    lines.push('');
    for (const [k, stat] of Object.entries(sectionMap)) {
      const label = SECTION_DEFS.find((d) => d.key === k)?.label || k;
      lines.push(`${label}: ${stat.total}件 (A:${stat.added} R:${stat.removed} C:${stat.changed})`);
    }
    lines.push('');

    const bySection = {};
    for (const row of rows) {
      if (!row.sectionKey) continue;
      if (!bySection[row.sectionKey]) bySection[row.sectionKey] = [];
      bySection[row.sectionKey].push(row);
    }

    let totalReq = 0;
    const sectionKeys = Object.keys(bySection);
    for (let i = 0; i < sectionKeys.length; i++) {
      const secKey = sectionKeys[i];
      const def = SECTION_DEFS.find((d) => d.key === secKey);
      if (!def || !def.put) continue;
      try {
        setStatus(`ノード反映プラン計算中 ${i + 1}/${sectionKeys.length}: ${def.label}`);
        const current = normalize(await apiGet(prefix, def.endpoint, { app }));
        const before = deepClone(current);
        let patched = deepClone(current);
        const rowsInSection = sortRowsForPatch(bySection[secKey], secKey);
        for (const row of rowsInSection) {
          const r = applyDiffRowToSection(patched, row, secKey);
          patched = r.section;
        }

        let plan;
        if (secKey === 'fieldSettings') {
          const sourceModeCodes = new Set(
            rowsInSection
              .filter((row) => reflectRowModeById(row._id) === 'src')
              .map(extractFieldCodeFromRowPath)
              .filter(Boolean)
          );
          plan = planFieldSectionDiffRequests(app, before.properties || before || {}, patched.properties || patched || {}, lookupMap, sourceModeCodes);
        } else if (secKey === 'viewSettings') {
          plan = planViewsSectionDiffRequests(app, before.views || before || {}, patched.views || patched || {});
        } else if (secKey === 'reportSettings') {
          plan = planReportsSectionDiffRequests(app, before.reports || before || {}, patched.reports || patched || {});
        } else if (secKey === 'actionSettings') {
          plan = planActionsSectionDiffRequests(app, before.actions || before || {}, patched.actions || patched || {});
        } else {
          plan = { requests: [{ method: 'PUT', path: def.endpoint, body: { app, ...def.putBuilder(patched) }, note: `${def.label} put` }] };
        }

        totalReq += (plan.requests || []).length;
        lines.push(`PLAN ${def.label}: ${plan.requests.length} request(s)`);
        appendRequestPlanLogs(lines, plan);
      } catch (e) {
        lines.push(`PLAN NG ${def?.label || secKey}: ${e.message || String(e)}`);
      }
    }

    lines.push('');
    lines.push(`合計予定リクエスト数: ${totalReq}`);
    lines.push('※ ノードモードは差分パスをもとにTargetプレビューへ反映します。');

    ui.result.innerHTML = `<pre style="margin:0;padding:10px;font-size:12px;white-space:pre-wrap">${esc(lines.join('\n'))}</pre>`;
    setStatus('ノード反映プラン確認完了');
  }

  async function runLoadSourceFieldsList() {
    const c = commonParams();
    if (!c.source.appId) throw new Error('Source App ID を入力してください');
    const prefix = buildApiPrefix(c.source.guestId, c.source.preview);
    setStatus('Sourceフィールド一覧を取得中...');

    try {
      const res = await apiGet(prefix, '/app/form/fields.json', { app: c.source.appId });
      const props = res.properties || {};
      const writable = filterWritableFieldProps(props, true);
      const fields = Object.values(writable).sort((a, b) => String(a.code).localeCompare(String(b.code)));

      if (!fields.length) {
        setStatus('表示できるフィールドがありません（システムフィールドのみ等）');
        return;
      }

      const rows = fields.map(f => {
        const titleAttr = typeof f.label === 'string' ? f.label.replace(/"/g, '&quot;') : '';
        const displayLabel = f.label ? `<span style="font-size:10px;color:#64748b;margin-left:4px">${esc(f.label)}</span>` : '';
        return `
          <tr>
            <td style="text-align:center"><input type="checkbox" class="src-field-sel" value="${esc(f.code)}" data-json="${esc(JSON.stringify(f))}"></td>
            <td title="${titleAttr}"><strong>${esc(f.code)}</strong>${displayLabel}</td>
            <td style="font-size:10px">${esc(f.type)}</td>
          </tr>
        `;
      });

      ui.sourceFieldTbody.innerHTML = rows.join('');
      ui.sourceFieldListContainer.style.display = 'block';
      ui.sourceFieldCheckAll.checked = false;
      setStatus(`Sourceフィールド ${fields.length} 件を取得しました`);
    } catch (e) {
      ui.sourceFieldListContainer.style.display = 'none';
      throw e;
    }
  }

  function runInsertSelectedSourceFields() {
    const checks = [...ui.sourceFieldTbody.querySelectorAll('.src-field-sel:checked')];
    if (!checks.length) {
      setStatus('追加するフィールドを選択してください');
      return;
    }

    let currentObj = { properties: {} };
    try {
      const text = ui.fieldJson.value.trim();
      if (text) {
        currentObj = JSON.parse(text);
        if (!currentObj.properties) currentObj = { properties: currentObj };
      }
    } catch (e) {
      if (!window.confirm('現在のJSONテキストが不正です。上書きして良いですか？')) return;
    }

    let mergedCount = 0;
    for (const c of checks) {
      try {
        const def = JSON.parse(c.dataset.json);
        currentObj.properties[def.code] = def;
        mergedCount++;
      } catch (e) { }
    }

    ui.fieldJson.value = JSON.stringify(currentObj, null, 2);
    ui.sourceFieldListContainer.style.display = 'none';
    setStatus(`${mergedCount} 件のフィールド定義を挿入しました`);
  }

  function runReflectModeAll(mode) {
    if (!state.reflectRows.length) {
      setStatus('反映ノードが読込されていません');
      return;
    }
    const selected = getSelectedReflectRows();
    if (!selected.length) {
      setStatus('ノードが選択されていません');
      return;
    }
    pushReflectUndo();
    let count = 0;
    for (const r of selected) {
      if (state.reflectNodeModes[r._id] !== mode) {
        state.reflectNodeModes[r._id] = mode;
        count++;
      }
    }
    renderReflectNodeList();
    setStatus(`選択中ノード(${selected.length}件)のうち、${count}件を ${mode === 'src' ? 'Source' : 'Target'} に一括変更しました`);
  }

  async function runApplyPreviewByNodes() {
    const c = commonParams();
    if (!c.target.appId) throw new Error('Target App ID を入力してください');
    if (!state.reflectRows.length) loadReflectRowsFromLastDiff();
    const rows = getSelectedReflectRows();
    if (!rows.length) throw new Error('反映ノードを選択してください');
    const lookupMap = parseLookupMapInput(ui.lookupMap.value);
    const stopOnError = !!ui.stopOnError.checked;
    saveCurrentDialogState();
    if (!window.confirm(`ノード反映を実行しますか？\nTarget App: ${c.target.appId}\n選択ノード: ${rows.length}件`)) {
      setStatus('ノード反映をキャンセルしました');
      return;
    }

    const prefix = buildApiPrefix(c.target.guestId, true);
    const app = c.target.appId;
    const logs = [];
    let hadError = false;
    const srcModeCount = rows.filter((r) => reflectRowModeById(r._id) === 'src').length;
    const tgtModeCount = rows.length - srcModeCount;
    logs.push(`Target App: ${app}`);
    logs.push(`ノードモード選択数: ${rows.length}`);
    logs.push(`モード内訳: Src ${srcModeCount} / Tgt ${tgtModeCount}`);
    logs.push(`エラー時動作: ${stopOnError ? '中断' : '継続'}`);
    logs.push('');

    const bySection = {};
    for (const row of rows) {
      if (!row.sectionKey) continue;
      if (!bySection[row.sectionKey]) bySection[row.sectionKey] = [];
      bySection[row.sectionKey].push(row);
    }

    const sectionKeys = Object.keys(bySection);
    for (let i = 0; i < sectionKeys.length; i++) {
      const secKey = sectionKeys[i];
      const def = SECTION_DEFS.find((d) => d.key === secKey);
      if (!def || !def.put) {
        logs.push(`SKIP ${def?.label || secKey}: PUT非対応`);
        continue;
      }

      setStatus(`ノード反映中 ${i + 1}/${sectionKeys.length}: ${def.label}`);
      try {
        const current = normalize(await apiGet(prefix, def.endpoint, { app }));
        const before = deepClone(current);
        let patched = deepClone(current);
        const rowsInSection = sortRowsForPatch(bySection[secKey], secKey);
        let appliedCount = 0;

        for (const row of rowsInSection) {
          const r = applyDiffRowToSection(patched, row, secKey);
          patched = r.section;
          if (r.applied) appliedCount += 1;
        }

        if (secKey === 'fieldSettings') {
          const beforeProps = before.properties || before || {};
          const afterProps = patched.properties || patched || {};
          const sourceModeCodes = new Set(
            rowsInSection
              .filter((row) => reflectRowModeById(row._id) === 'src')
              .map(extractFieldCodeFromRowPath)
              .filter(Boolean)
          );
          await applyFieldSectionDiff(prefix, app, beforeProps, afterProps, logs, lookupMap, sourceModeCodes, stopOnError);
          logs.push(`OK ${def.label}: node ${appliedCount}/${rowsInSection.length}`);
        } else if (secKey === 'viewSettings') {
          const beforeViews = before.views || before || {};
          const afterViews = patched.views || patched || {};
          await applyViewsSectionDiff(prefix, app, beforeViews, afterViews, logs, stopOnError);
          logs.push(`OK ${def.label}: node ${appliedCount}/${rowsInSection.length}`);
        } else if (secKey === 'reportSettings') {
          const beforeReports = before.reports || before || {};
          const afterReports = patched.reports || patched || {};
          await applyReportsSectionDiff(prefix, app, beforeReports, afterReports, logs, stopOnError);
          logs.push(`OK ${def.label}: node ${appliedCount}/${rowsInSection.length}`);
        } else if (secKey === 'actionSettings') {
          const beforeActions = before.actions || before || {};
          const afterActions = patched.actions || patched || {};
          await applyActionsSectionDiff(prefix, app, beforeActions, afterActions, logs, stopOnError);
          logs.push(`OK ${def.label}: node ${appliedCount}/${rowsInSection.length}`);
        } else {
          const reqs = [{ method: 'PUT', path: def.endpoint, body: { app, ...def.putBuilder(patched) }, note: `${def.label} put` }];
          appendRequestPlanLogs(logs, { requests: reqs });
          await executeRequestPlan(prefix, reqs, logs, stopOnError);
          logs.push(`OK ${def.label}: node ${appliedCount}/${rowsInSection.length}`);
        }
      } catch (e) {
        hadError = true;
        logs.push(`NG ${def.label}: ${e.message || String(e)}`);
        if (stopOnError) {
          logs.push('中断: エラーが発生したため処理を停止しました');
          break;
        }
      }
    }

    if (ui.doDeploy.checked) {
      if (hadError) {
        logs.push('SKIP デプロイ: 反映エラーがあるため実行しません');
      } else {
        setStatus('デプロイ実行中...');
        try {
          const st = await deployAndPoll(prefix, app, logs);
          logs.push(st === 'SUCCESS' ? 'OK デプロイ完了' : `NG デプロイ終了ステータス: ${st}`);
        } catch (e) {
          logs.push(`NG デプロイ: ${e.message || String(e)}`);
        }
      }
    }

    ui.result.innerHTML = `<pre style="margin:0;padding:10px;font-size:12px;white-space:pre-wrap">${esc(logs.join('\n'))}</pre>`;
    setStatus('ノード反映処理完了');
  }

  function setScopeSelection(container, checked) {
    [...container.querySelectorAll('input[type="checkbox"]')].forEach((c) => { c.checked = !!checked; });
    saveCurrentDialogState();
  }

  function diffSectionKeySet() {
    const set = new Set();
    for (const row of state.lastDiffRows || []) {
      let key = row.sectionKey;
      if (!key && row.section) {
        const def = SECTION_DEFS.find((d) => d.label === row.section || d.key === row.section);
        if (def) key = def.key;
      }
      if (key) set.add(key);
    }
    return set;
  }

  function resolveApplyScopes(baseScopes) {
    let scopes = [...baseScopes];
    if (!ui.applyDiffOnly.checked) return scopes;
    const diffSet = diffSectionKeySet();
    if (!diffSet.size) throw new Error('「差分のあるセクションのみ反映」を使うには先に差分比較が必要です');
    scopes = scopes.filter((k) => diffSet.has(k));
    if (!scopes.length) throw new Error('選択中の反映セクションに差分がありません');
    return scopes;
  }

  async function getSourceBundleForApply(c, scopes) {
    let sourceBundle = state.lastSourceBundle || state.importedSourceBundle;
    if (!sourceBundle) {
      if (!c.source.appId) throw new Error('Source App ID を入力してください');
      setStatus('Source設定を取得中...');
      sourceBundle = await fetchBundle({
        ...c.source,
        sections: scopes,
        onProgress: (p, l) => setStatus(`Source取得中 ${Math.round(p * 100)}% (${l})`)
      });
      state.lastSourceBundle = sourceBundle;
    } else {
      sourceBundle = pickBundleSections(sourceBundle, scopes);
    }
    return sourceBundle;
  }

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
        logs.push(`  - Deploy Status: ${st}`);
        if (st === 'SUCCESS' || st === 'FAIL' || st === 'CANCEL') break;
      } catch (e) {
        logs.push(`  - Deploy Status取得失敗: ${e.message || String(e)}`);
      }
    }
    return last;
  }

  async function runPreviewApplyPlan() {
    if (ui.nodeMode.checked) return runPreviewApplyPlanNodes();
    const c = commonParams();
    if (!c.target.appId) throw new Error('Target App ID を入力してください');
    const lookupMap = parseLookupMapInput(ui.lookupMap.value);
    const baseScopes = selectedScopeKeys(ui.applyScopes);
    if (!baseScopes.length) throw new Error('反映セクションを選択してください');
    const scopes = resolveApplyScopes(baseScopes);
    saveCurrentDialogState();

    const sourceBundle = await getSourceBundleForApply(c, scopes);
    const prefix = buildApiPrefix(c.target.guestId, true);
    const app = c.target.appId;
    const logs = [];
    logs.push('=== 反映プラン（ドライラン）===');
    logs.push(`Target App: ${app}`);
    logs.push(`Scopes: ${scopes.map((k) => SECTION_DEFS.find((d) => d.key === k)?.label || k).join(', ')}`);
    logs.push('');
    let totalReq = 0;

    for (let i = 0; i < scopes.length; i++) {
      const secKey = scopes[i];
      const def = SECTION_DEFS.find((x) => x.key === secKey);
      if (!def || !def.put) {
        logs.push(`SKIP ${def?.label || secKey}: PUT非対応`);
        continue;
      }
      const sourceSec = deepClone(sourceBundle.sections[secKey]);
      if (!sourceSec || sourceSec._fetchError) {
        logs.push(`SKIP ${def.label}: source未取得`);
        continue;
      }

      if (secKey === 'fieldSettings') {
        const current = await apiGet(prefix, '/app/form/fields.json', { app });
        const plan = planFieldSectionDiffRequests(app, current.properties || {}, sourceSec.properties || sourceSec || {}, lookupMap);
        logs.push(`PLAN ${def.label}: ${plan.requests.length} request(s)`);
        appendRequestPlanLogs(logs, plan);
        if (plan.lookupChanged) logs.push(`  - lookup appId 変換: ${plan.lookupChanged}`);
        totalReq += plan.requests.length;
        continue;
      }
      if (secKey === 'viewSettings') {
        const current = await apiGet(prefix, '/app/views.json', { app });
        const plan = planViewsSectionDiffRequests(app, current.views || {}, sourceSec.views || sourceSec || {});
        logs.push(`PLAN ${def.label}: ${plan.requests.length} request(s)`);
        appendRequestPlanLogs(logs, plan);
        if (plan.deleteSkipCount) logs.push(`  - views delete(skip): ${plan.deleteSkipCount} (互換モード: 削除は行いません)`);
        totalReq += plan.requests.length;
        continue;
      }
      if (secKey === 'reportSettings') {
        const current = await apiGet(prefix, '/app/reports.json', { app });
        const plan = planReportsSectionDiffRequests(app, current.reports || {}, sourceSec.reports || sourceSec || {});
        logs.push(`PLAN ${def.label}: ${plan.requests.length} request(s)`);
        appendRequestPlanLogs(logs, plan);
        totalReq += plan.requests.length;
        continue;
      }
      if (secKey === 'actionSettings') {
        const current = await apiGet(prefix, '/app/actions.json', { app });
        const plan = planActionsSectionDiffRequests(app, current.actions || {}, sourceSec.actions || sourceSec || {});
        logs.push(`PLAN ${def.label}: ${plan.requests.length} request(s)`);
        appendRequestPlanLogs(logs, plan);
        if (plan.deleteSkipCount) logs.push(`  - actions delete(skip): ${plan.deleteSkipCount} (互換モード: 削除は行いません)`);
        totalReq += plan.requests.length;
        continue;
      }
      const plan = { requests: [{ method: 'PUT', path: def.endpoint, body: { app, ...def.putBuilder(sourceSec) }, note: `${def.label} put` }] };
      logs.push(`PLAN ${def.label}: ${plan.requests.length} request(s)`);
      appendRequestPlanLogs(logs, plan);
      totalReq += plan.requests.length;
    }
    logs.push('');
    logs.push(`合計予定リクエスト数: ${totalReq}`);
    ui.result.innerHTML = `<pre style="margin:0;padding:10px;font-size:12px;white-space:pre-wrap">${esc(logs.join('\n'))}</pre>`;
    setStatus('反映プラン確認完了');
  }

  async function runDeployOnly() {
    const c = commonParams();
    if (!c.target.appId) throw new Error('Target App ID を入力してください');
    if (!window.confirm(`デプロイのみ実行しますか？\nTarget App: ${c.target.appId}`)) {
      setStatus('デプロイをキャンセルしました');
      return;
    }
    const prefix = buildApiPrefix(c.target.guestId, true);
    const app = c.target.appId;
    setStatus('デプロイ実行中...');
    const logs = [];
    const st = await deployAndPoll(prefix, app, logs);
    if (st === 'SUCCESS') logs.push('OK デプロイ完了');
    else logs.push(`NG デプロイ終了ステータス: ${st}`);
    ui.result.innerHTML = `<pre style="margin:0;padding:10px;font-size:12px;white-space:pre-wrap">${esc(logs.join('\n'))}</pre>`;
    setStatus(`デプロイ処理完了: ${st === 'SUCCESS' ? 'SUCCESS' : st}`, st !== 'SUCCESS');
  }

  async function runApplyPreview() {
    if (ui.nodeMode.checked) return runApplyPreviewByNodes();
    const c = commonParams();
    if (!c.target.appId) throw new Error('Target App ID を入力してください');
    const lookupMap = parseLookupMapInput(ui.lookupMap.value);
    const baseScopes = selectedScopeKeys(ui.applyScopes);
    if (!baseScopes.length) throw new Error('反映セクションを選択してください');
    const scopes = resolveApplyScopes(baseScopes);
    if (!window.confirm(`プレビュー反映を実行しますか？\nTarget App: ${c.target.appId}\n反映セクション: ${scopes.length}件`)) {
      setStatus('プレビュー反映をキャンセルしました');
      return;
    }
    saveCurrentDialogState();
    const sourceBundle = await getSourceBundleForApply(c, scopes);

    const prefix = buildApiPrefix(c.target.guestId, true);
    const app = c.target.appId;
    const stopOnError = !!ui.stopOnError.checked;
    const logs = [];
    let hadError = false;
    logs.push(`Target App: ${app}`);
    logs.push(`適用セクション: ${scopes.map((k) => SECTION_DEFS.find((d) => d.key === k)?.label || k).join(', ')}`);
    logs.push(`エラー時動作: ${stopOnError ? '中断' : '継続'}`);
    logs.push('');

    for (let i = 0; i < scopes.length; i++) {
      const secKey = scopes[i];
      const def = SECTION_DEFS.find((x) => x.key === secKey);
      if (!def || !def.put) continue;
      const sourceSec = deepClone(sourceBundle.sections[secKey]);
      if (!sourceSec || sourceSec._fetchError) {
        logs.push(`SKIP ${def.label}: source未取得`);
        continue;
      }

      setStatus(`反映中 ${i + 1}/${scopes.length}: ${def.label}`);
      try {
        if (secKey === 'fieldSettings') {
          const current = await apiGet(prefix, '/app/form/fields.json', { app });
          const beforeProps = current.properties || {};
          const afterProps = filterWritableFieldProps(sourceSec.properties || sourceSec, true);
          await applyFieldSectionDiff(prefix, app, beforeProps, afterProps, logs, lookupMap, null, stopOnError);
          logs.push(`OK ${def.label}`);
          continue;
        }
        if (secKey === 'viewSettings') {
          const current = await apiGet(prefix, '/app/views.json', { app });
          await applyViewsSectionDiff(prefix, app, current.views || {}, sourceSec.views || sourceSec || {}, logs, stopOnError);
          logs.push(`OK ${def.label}`);
          continue;
        }
        if (secKey === 'reportSettings') {
          const current = await apiGet(prefix, '/app/reports.json', { app });
          await applyReportsSectionDiff(prefix, app, current.reports || {}, sourceSec.reports || sourceSec || {}, logs, stopOnError);
          logs.push(`OK ${def.label}`);
          continue;
        }
        if (secKey === 'actionSettings') {
          const current = await apiGet(prefix, '/app/actions.json', { app });
          await applyActionsSectionDiff(prefix, app, current.actions || {}, sourceSec.actions || sourceSec || {}, logs, stopOnError);
          logs.push(`OK ${def.label}`);
          continue;
        }
        const reqs = [{ method: 'PUT', path: def.endpoint, body: { app, ...def.putBuilder(sourceSec) }, note: `${def.label} put` }];
        appendRequestPlanLogs(logs, { requests: reqs });
        await executeRequestPlan(prefix, reqs, logs, stopOnError);
        logs.push(`OK ${def.label}`);
      } catch (e) {
        hadError = true;
        logs.push(`NG ${def.label}: ${e.message || String(e)}`);
        if (stopOnError) {
          logs.push('中断: エラーが発生したため処理を停止しました');
          break;
        }
      }
    }

    if (ui.doDeploy.checked) {
      if (hadError) {
        logs.push('SKIP デプロイ: 反映エラーがあるため実行しません');
      } else {
        setStatus('デプロイ実行中...');
        try {
          const st = await deployAndPoll(prefix, app, logs);
          logs.push(st === 'SUCCESS' ? 'OK デプロイ完了' : `NG デプロイ終了ステータス: ${st}`);
        } catch (e) {
          logs.push(`NG デプロイ: ${e.message || String(e)}`);
        }
      }
    }

    ui.result.innerHTML = `<pre style="margin:0;padding:10px;font-size:12px;white-space:pre-wrap">${esc(logs.join('\n'))}</pre>`;
    setStatus('プレビュー反映処理完了');
  }

  async function runDesignExport(kind) {
    const c = commonParams();
    if (!c.source.appId) throw new Error('Source App ID を入力してください');
    const scopes = SECTION_DEFS.map((s) => s.key);
    setStatus('設計情報を取得中...');
    const bundle = await fetchBundle({ ...c.source, sections: scopes, onProgress: (p, l) => setStatus(`取得中 ${Math.round(p * 100)}% (${l})`) });
    state.lastSourceBundle = bundle;

    if (kind === 'json') {
      downloadText(`design_${bundle.appId}_${nowStamp()}.json`, JSON.stringify(bundle, null, 2), 'application/json');
    } else {
      downloadText(`design_${bundle.appId}_${nowStamp()}.md`, bundleToMarkdown(bundle), 'text/markdown');
    }
    ui.result.innerHTML = `<pre style="margin:0;padding:10px;font-size:12px;white-space:pre-wrap">${esc(JSON.stringify({
      appId: bundle.appId,
      fetchedAt: bundle.fetchedAt,
      sections: Object.keys(bundle.sections)
    }, null, 2))}</pre>`;
    setStatus('設計書出力完了');
  }

  async function runDesignCopyMd() {
    const c = commonParams();
    if (!c.source.appId) throw new Error('Source App ID を入力してください');
    const scopes = SECTION_DEFS.map((s) => s.key);
    setStatus('設計情報を取得中...');
    const bundle = await fetchBundle({ ...c.source, sections: scopes, onProgress: (p, l) => setStatus(`取得中 ${Math.round(p * 100)}% (${l})`) });
    state.lastSourceBundle = bundle;

    const md = bundleToMarkdown(bundle);
    try {
      await navigator.clipboard.writeText(md);
      setStatus('設計書Markdownをクリップボードにコピーしました');
    } catch (e) {
      throw new Error(`クリップボードへのコピーに失敗しました: ${e.message}`);
    }
  }

  function loadScript(url) {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = url;
      s.async = true;
      s.onload = resolve;
      s.onerror = () => reject(new Error(`スクリプト読み込み失敗: ${url}`));
      document.head.appendChild(s);
    });
  }

  async function ensureXlsx() {
    if (window.XLSX) return window.XLSX;
    const urls = [
      'https://cdn.jsdelivr.net/npm/xlsx-js-style@1.2.0/dist/xlsx.min.js',
      'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js'
    ];
    let lastErr;
    for (const url of urls) {
      try {
        await loadScript(url);
        if (window.XLSX) return window.XLSX;
      } catch (e) {
        lastErr = e;
      }
    }
    throw lastErr || new Error('XLSXの読み込みに失敗しました');
  }

  async function runDesignExportXlsx() {
    const c = commonParams();
    if (!c.source.appId) throw new Error('Source App ID を入力してください');
    const scopes = SECTION_DEFS.map((s) => s.key);
    setStatus('設計情報を取得中...');
    const bundle = await fetchBundle({ ...c.source, sections: scopes, onProgress: (p, l) => setStatus(`取得中 ${Math.round(p * 100)}% (${l})`) });
    state.lastSourceBundle = bundle;
    setStatus('Excelライブラリ読み込み中...');
    const XLSX = await ensureXlsx();
    setStatus('Excel生成中...');

    const wb = XLSX.utils.book_new();
    const names = new Set();
    const summaryRows = [
      ['kintone 設計書'],
      ['App ID', bundle.appId],
      ['Guest ID', bundle.guestId || '(通常空間)'],
      ['Preview', bundle.preview ? 'Yes' : 'No'],
      ['Exported At', bundle.fetchedAt],
      ['Sections', Object.keys(bundle.sections).length]
    ];
    const summaryWs = XLSX.utils.aoa_to_sheet(summaryRows);
    summaryWs['!cols'] = [{ wch: 22 }, { wch: 80 }];
    const summaryName = safeSheetName('サマリー', names);
    names.add(summaryName);
    XLSX.utils.book_append_sheet(wb, summaryWs, summaryName);

    for (const def of SECTION_DEFS) {
      const sec = bundle.sections[def.key];
      if (!sec) continue;
      const rows = [['Path', 'Value']];
      flattenToRows(sec, '', rows);
      const ws = XLSX.utils.aoa_to_sheet(rows);
      ws['!cols'] = [{ wch: 45 }, { wch: 110 }];
      const name = safeSheetName(def.label, names);
      names.add(name);
      XLSX.utils.book_append_sheet(wb, ws, name);
    }

    const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array', cellStyles: true });
    const blob = new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `design_${bundle.appId}_${nowStamp()}.xlsx`;
    a.click();
    URL.revokeObjectURL(a.href);
    setStatus('設計書Excel出力完了');
  }

  function renderCustomizeResult(data) {
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

  async function runFetchJsConfig() {
    const c = commonParams();
    if (!c.source.appId) throw new Error('Source App ID を入力してください');
    const isPreview = !!ui.jsconfigPreview.checked;
    const prefix = buildApiPrefix(c.source.guestId, isPreview);
    setStatus('JS/CSS設定を取得中...');
    const res = await apiGet(prefix, '/app/customize.json', { app: c.source.appId });
    const data = normalize(res);
    ui.jsconfigJson.value = JSON.stringify(data, null, 2);
    renderCustomizeResult(data);
    setStatus(`JS/CSS設定を取得しました (App: ${c.source.appId}${isPreview ? ' / Preview' : ''})`);
  }

  async function runExportJsConfig() {
    const text = ui.jsconfigJson.value.trim();
    if (!text) throw new Error('先にJS/CSS設定を取得してください');
    const parsed = JSON.parse(text);
    const c = commonParams();
    const appId = c.source.appId || 'unknown';
    downloadText(`customize_${appId}_${nowStamp()}.json`, JSON.stringify(parsed, null, 2), 'application/json');
    setStatus('JS/CSS設定JSONを保存しました');
  }

  async function runApplyJsConfig() {
    const c = commonParams();
    if (!c.target.appId) throw new Error('Target App ID を入力してください');
    const text = ui.jsconfigJson.value.trim();
    if (!text) throw new Error('JS/CSS設定JSONを入力してください');
    const parsed = JSON.parse(text);
    if (!parsed || typeof parsed !== 'object') throw new Error('JSONはオブジェクト形式で入力してください');
    const body = {
      app: c.target.appId,
      desktop: parsed.desktop || {},
      mobile: parsed.mobile || {}
    };
    if (!window.confirm(`JS/CSS設定をTarget(Preview)へ反映しますか？\nTarget App: ${c.target.appId}`)) {
      setStatus('JS/CSS設定反映をキャンセルしました');
      return;
    }
    const prefix = buildApiPrefix(c.target.guestId, true);
    setStatus('JS/CSS設定を反映中...');
    await apiPut(prefix, '/app/customize.json', body);
    const logs = [`OK JS/CSS設定反映 (App: ${c.target.appId})`];

    if (ui.jsconfigDeployAfter.checked) {
      setStatus('デプロイ実行中...');
      const st = await deployAndPoll(prefix, c.target.appId, logs);
      logs.push(st === 'SUCCESS' ? 'OK デプロイ完了' : `NG デプロイ終了ステータス: ${st}`);
    }
    ui.result.innerHTML = `<pre style="margin:0;padding:10px;font-size:12px;white-space:pre-wrap">${esc(logs.join('\n'))}</pre>`;
    setStatus('JS/CSS設定反映完了');
  }

  async function runDeleteAllRecords() {
    const c = commonParams();
    const app = c.target.appId;
    if (!app) throw new Error('Target App ID を入力してください');
    if (!window.confirm(`Target App (${app}) の全レコードを一括削除しますか？\n※この操作は元に戻せません。`)) return;

    const prefix = buildApiPrefix(c.target.guestId, false);
    setStatus('レコード削除中...');
    const logs = [`Target App: ${app} レコード全件削除開始`];

    try {
      let totalDeleted = 0;
      while (true) {
        const query = 'order by $id asc limit 500';
        const res = await apiGet(prefix, '/records.json', { app, fields: ['$id'], query });
        const ids = res.records.map(r => r.$id.value);
        if (!ids.length) break;
        await apiDelete(prefix, '/records.json', { app, ids });
        totalDeleted += ids.length;
        logs.push(` - ${ids.length}件削除 (計: ${totalDeleted}件)`);
        setStatus(`レコード削除中... (計: ${totalDeleted}件)`);
      }
      logs.push(totalDeleted > 0 ? `完了：合計 ${totalDeleted} 件のレコードを削除しました。` : '削除対象のレコードがありませんでした。');
    } catch (e) {
      logs.push(`エラー: ${e.message || String(e)}`);
      throw e;
    } finally {
      ui.recordMgrResult.innerHTML = `<pre style="margin:0;padding:10px;font-size:12px;white-space:pre-wrap">${esc(logs.join('\n'))}</pre>`;
      setStatus('レコード全件削除 完了');
    }
  }

  function generateDummyValue(type, code) {
    switch (type) {
      case 'SINGLE_LINE_TEXT': return `テスト文字列_${Math.floor(Math.random() * 1000)}`;
      case 'MULTI_LINE_TEXT': return `テスト行1_${Math.floor(Math.random() * 1000)}\nテスト行2_${Math.floor(Math.random() * 1000)}`;
      case 'RICH_TEXT': return `<div><strong>テストリッチテキスト</strong>_${Math.floor(Math.random() * 1000)}</div>`;
      case 'NUMBER': return String(Math.floor(Math.random() * 10000));
      case 'DATE': {
        const d = new Date(Date.now() - Math.floor(Math.random() * 30) * 86400000);
        return d.toISOString().split('T')[0];
      }
      case 'TIME': return `${String(Math.floor(Math.random() * 24)).padStart(2, '0')}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}`;
      case 'DATETIME': {
        const d = new Date(Date.now() - Math.floor(Math.random() * 30) * 86400000);
        return d.toISOString();
      }
      case 'DROP_DOWN':
      case 'RADIO_BUTTON': return undefined; // Cannot easily predict options without more field data logic, skip or leave empty mapping
      case 'CHECK_BOX':
      case 'MULTI_SELECT': return [];
      case 'LINK': return 'https://cybozu.co.jp';
      default: return undefined;
    }
  }

  async function runGenerateDummyRecords() {
    const c = commonParams();
    const app = c.target.appId;
    if (!app) throw new Error('Target App ID を入力してください');
    const genCount = parseInt(ui.genCount.value, 10);
    if (!genCount || genCount < 1 || genCount > 100) throw new Error('生成件数は1から100の間で指定してください');

    const prefix = buildApiPrefix(c.target.guestId, false);
    setStatus('フィールド情報取得中...');
    const logs = [`Target App: ${app} テストデータ生成開始 (${genCount}件)`];

    try {
      const fieldRes = await apiGet(prefix, '/app/form/fields.json', { app });
      const props = fieldRes.properties || {};

      const records = [];
      for (let i = 0; i < genCount; i++) {
        const rec = {};
        for (const [code, def] of Object.entries(props)) {
          if (SYSTEM_FIELD_TYPES.has(def.type)) continue;
          if (['CALC', 'FILE', 'REFERENCE_TABLE', 'GROUP', 'SUBTABLE', 'USER_SELECT', 'ORGANIZATION_SELECT', 'GROUP_SELECT'].includes(def.type)) continue;

          let val = generateDummyValue(def.type, code);

          if (['DROP_DOWN', 'RADIO_BUTTON', 'CHECK_BOX', 'MULTI_SELECT'].includes(def.type) && def.options) {
            const opts = Object.values(def.options).sort((a, b) => Number(a.index) - Number(b.index));
            if (opts.length > 0) {
              if (['DROP_DOWN', 'RADIO_BUTTON'].includes(def.type)) {
                val = opts[Math.floor(Math.random() * opts.length)].label;
              } else {
                val = [opts[Math.floor(Math.random() * opts.length)].label];
              }
            }
          }

          if (val !== undefined) {
            rec[code] = { value: val };
          }
        }
        records.push(rec);
      }

      setStatus('レコード登録中...');
      const res = await apiPost(prefix, '/records.json', { app, records });
      logs.push(`完了：${res.ids?.length || 0} 件のレコードを生成しました。`);
    } catch (e) {
      logs.push(`エラー: ${e.message || String(e)}`);
      throw e;
    } finally {
      ui.recordMgrResult.innerHTML = `<pre style="margin:0;padding:10px;font-size:12px;white-space:pre-wrap">${esc(logs.join('\n'))}</pre>`;
      setStatus('ダミーレコード生成 完了');
    }
  }

  async function ensureMermaid() {
    if (window.mermaid) return window.mermaid;
    setStatus('Mermaid.js を読み込み中...');
    await loadScript('https://cdn.jsdelivr.net/npm/mermaid@10.6.1/dist/mermaid.min.js');
    if (window.mermaid) {
      window.mermaid.initialize({ startOnLoad: false, theme: 'default' });
      return window.mermaid;
    }
    throw new Error('Mermaid.js の読み込みに失敗しました');
  }

  async function runRenderProcessFlow() {
    const c = commonParams();
    const app = c.source.appId;
    if (!app) throw new Error('Source App ID を入力してください');

    const prefix = buildApiPrefix(c.source.guestId, false);
    setStatus('プロセス管理を取得中...');

    try {
      const res = await apiGet(prefix, '/app/status.json', { app });
      if (!res.enable) {
        ui.mermaidText.value = 'プロセス管理は無効です。';
        ui.mermaidView.innerHTML = '<div style="color:#64748b">プロセス管理は無効です</div>';
        setStatus('プロセス管理は無効です');
        return;
      }

      const mermaidObj = await ensureMermaid();
      setStatus('フロー図 生成中...');

      const states = res.states || {};
      const actions = res.actions || [];

      let md = 'stateDiagram-v2\n';

      const safeStateName = (n) => n.replace(/[*_~\[\]()]/g, '');

      const startStates = new Set(Object.keys(states));
      for (const a of actions) {
        if (a.to) startStates.delete(a.to);
      }

      for (const st of startStates) {
        if (st && states[st]) {
          md += `    [*] --> ${safeStateName(st)}\n`;
        }
      }

      for (const a of actions) {
        const from = safeStateName(a.from);
        const to = safeStateName(a.to);
        const actionName = a.name.replace(/[*_~\[\]()"]/g, '');
        md += `    ${from} --> ${to} : ${actionName}\n`;
      }

      ui.mermaidText.value = md;

      const { svg } = await mermaidObj.render('mermaid-svg-generated', md);
      ui.mermaidView.innerHTML = svg;

      setStatus('フロー図 生成完了');
    } catch (e) {
      ui.mermaidView.innerHTML = `<div style="color:#b91c1c">エラー: ${esc(e.message || String(e))}</div>`;
      throw e;
    }
  }

  function switchTab(tabKey) {
    state.activeTab = tabKey;
    ui.tabs.forEach((t) => t.classList.toggle('active', t.dataset.tab === tabKey));
    ui.panes.forEach((p) => p.classList.toggle('active', p.dataset.pane === tabKey));
  }

  function applyIgnoreProfile() {
    const name = ui.ignoreProfileSelect.value;
    const profiles = loadIgnoreProfiles();
    if (!name || !profiles[name]) throw new Error('読込するプロファイルを選択してください');
    ui.ignoreKeys.value = profiles[name];
    ui.ignoreProfileName.value = name;
    saveCurrentDialogState();
    setStatus(`無視プロファイルを読込: ${name}`);
  }

  function saveIgnoreProfileFromInput() {
    const name = ui.ignoreProfileName.value.trim();
    if (!name) throw new Error('保存名を入力してください');
    const profiles = loadIgnoreProfiles();
    profiles[name] = ui.ignoreKeys.value.trim();
    saveIgnoreProfiles(profiles);
    renderIgnoreProfileOptions();
    ui.ignoreProfileSelect.value = name;
    setStatus(`無視プロファイルを保存: ${name}`);
  }

  function deleteIgnoreProfileFromSelect() {
    const name = ui.ignoreProfileSelect.value;
    if (!name) throw new Error('削除するプロファイルを選択してください');
    const profiles = loadIgnoreProfiles();
    delete profiles[name];
    saveIgnoreProfiles(profiles);
    renderIgnoreProfileOptions();
    ui.ignoreProfileName.value = '';
    setStatus(`無視プロファイルを削除: ${name}`);
  }

  async function withGuard(fn) {
    if (state.running) return;
    state.running = true;
    try {
      await fn();
    } catch (e) {
      console.error(e);
      setStatus(`エラー: ${e.message || String(e)}`, true);
    } finally {
      state.running = false;
    }
  }

  renderScopeChips();
  restoreDialogState();
  renderIgnoreProfileOptions();
  renderBundleState();
  renderReflectNodeList();

  ui.applyDiffOnly.addEventListener('change', () => {
    saveCurrentDialogState();
    renderBundleState();
    renderReflectModeUi();
  });
  ui.stopOnError.addEventListener('change', saveCurrentDialogState);
  ui.nodeMode.addEventListener('change', () => {
    saveCurrentDialogState();
    renderBundleState();
    renderReflectNodeList();
  });
  ui.doDeploy.addEventListener('change', saveCurrentDialogState);
  ui.lookupMap.addEventListener('change', () => {
    try {
      parseLookupMapInput(ui.lookupMap.value);
      saveCurrentDialogState();
      if (ui.lookupMap.value.trim()) setStatus('Lookup AppID変換を更新しました');
    } catch (e) {
      setStatus(`Lookup AppID変換エラー: ${e.message || String(e)}`, true);
    }
  });

  root.addEventListener('change', (e) => {
    const id = e.target?.dataset?.nodeId;
    if (!id) return;
    pushReflectUndo();
    if (e.target.checked) state.reflectSelectedIds.add(id);
    else state.reflectSelectedIds.delete(id);
    renderReflectNodeList();
  });

  ui.sourceBundleFile.addEventListener('change', () => {
    const f = ui.sourceBundleFile.files && ui.sourceBundleFile.files[0];
    ui.sourceBundleFile.value = '';
    if (!f) return;
    withGuard(async () => {
      await importBundleFromFile('source', f);
      setStatus(`Sourceバンドル読込完了: ${f.name}`);
    });
  });

  ui.targetBundleFile.addEventListener('change', () => {
    const f = ui.targetBundleFile.files && ui.targetBundleFile.files[0];
    ui.targetBundleFile.value = '';
    if (!f) return;
    withGuard(async () => {
      await importBundleFromFile('target', f);
      setStatus(`Targetバンドル読込完了: ${f.name}`);
    });
  });

  ui.fieldJsonFile.addEventListener('change', () => {
    const f = ui.fieldJsonFile.files && ui.fieldJsonFile.files[0];
    ui.fieldJsonFile.value = '';
    if (!f) return;
    withGuard(async () => {
      const text = await readTextFile(f);
      const parsed = JSON.parse(text);
      ui.fieldJson.value = JSON.stringify(parsed, null, 2);
      setStatus(`フィールドJSON読込完了: ${f.name}`);
    });
  });

  ui.jsconfigFile.addEventListener('change', () => {
    const f = ui.jsconfigFile.files && ui.jsconfigFile.files[0];
    ui.jsconfigFile.value = '';
    if (!f) return;
    withGuard(async () => {
      const text = await readTextFile(f);
      const parsed = JSON.parse(text);
      ui.jsconfigJson.value = JSON.stringify(parsed, null, 2);
      renderCustomizeResult(parsed);
      setStatus(`JS/CSS設定JSON読込完了: ${f.name}`);
    });
  });

  root.addEventListener('click', (e) => {
    const modeBtn = e.target.closest('[data-node-mode]');
    if (modeBtn) {
      const nodeId = modeBtn.dataset.nodeMode;
      if (nodeId) {
        pushReflectUndo();
        state.reflectNodeModes[nodeId] = reflectRowModeById(nodeId) === 'src' ? 'tgt' : 'src';
        renderReflectNodeList();
        setStatus(`ノードモード切替: ${state.reflectNodeModes[nodeId] === 'src' ? 'Source' : 'Target'}`);
      }
      return;
    }

    const copyBtn = e.target.closest('[data-copy-val]');
    if (copyBtn) {
      const val = copyBtn.dataset.copyVal || '';
      try {
        navigator.clipboard.writeText(val);
        const originalText = copyBtn.textContent;
        copyBtn.textContent = 'コピー済';
        setTimeout(() => { copyBtn.textContent = originalText; }, 1500);
      } catch (err) {
        setStatus(`コピー失敗: ${err.message}`, true);
      }
      return;
    }

    if (e.target.id === 'u_sourceFieldCheckAll') {
      const checked = e.target.checked;
      [...ui.sourceFieldTbody.querySelectorAll('.src-field-sel')].forEach(c => c.checked = checked);
      return;
    }

    const tab = e.target.closest('.tab');
    if (tab) {
      switchTab(tab.dataset.tab);
      return;
    }
    const act = e.target.dataset.act;
    if (!act) return;

    if (act === 'close') {
      root.remove();
      return;
    }

    if (act === 'runDiff') return withGuard(runDiff);
    if (act === 'exportDiffJson') return withGuard(exportDiffJson);
    if (act === 'exportDiffHtml') return withGuard(exportDiffHtml);
    if (act === 'exportPatchJson') return withGuard(exportPatchJson);
    if (act === 'exportBundleJson') return withGuard(exportBundleJson);
    if (act === 'diffScopeAll') {
      setScopeSelection(ui.diffScopes, true);
      setStatus('比較セクションを全選択しました');
      return;
    }
    if (act === 'diffScopeNone') {
      setScopeSelection(ui.diffScopes, false);
      setStatus('比較セクションを全解除しました');
      return;
    }

    if (act === 'importSourceBundle') return ui.sourceBundleFile.click();
    if (act === 'importTargetBundle') return ui.targetBundleFile.click();
    if (act === 'clearBundle') {
      state.importedSourceBundle = null;
      state.importedTargetBundle = null;
      state.importedSourceName = '';
      state.importedTargetName = '';
      renderBundleState();
      setStatus('バンドル読込を解除しました');
      return;
    }

    if (act === 'loadIgnoreProfile') return withGuard(async () => applyIgnoreProfile());
    if (act === 'saveIgnoreProfile') return withGuard(async () => saveIgnoreProfileFromInput());
    if (act === 'deleteIgnoreProfile') return withGuard(async () => deleteIgnoreProfileFromSelect());

    if (act === 'applyScopeAll') {
      setScopeSelection(ui.applyScopes, true);
      setStatus('反映セクションを全選択しました');
      return;
    }
    if (act === 'applyScopeNone') {
      setScopeSelection(ui.applyScopes, false);
      setStatus('反映セクションを全解除しました');
      return;
    }
    if (act === 'loadReflectNodes') {
      return withGuard(async () => {
        loadReflectRowsFromLastDiff();
      });
    }
    if (act === 'selectReflectNodesAll') {
      pushReflectUndo();
      state.reflectSelectedIds = new Set((state.reflectRows || []).map((r) => r._id));
      renderReflectNodeList();
      setStatus('反映ノードを全選択しました');
      return;
    }
    if (act === 'clearReflectNodes') {
      pushReflectUndo();
      state.reflectSelectedIds = new Set();
      renderReflectNodeList();
      setStatus('反映ノードを全解除しました');
      return;
    }
    if (act === 'reflectUndo') {
      if (!undoReflectState()) {
        setStatus('Undoできる操作がありません');
        return;
      }
      renderReflectNodeList();
      setStatus('ノード操作をUndoしました');
      return;
    }
    if (act === 'reflectRedo') {
      if (!redoReflectState()) {
        setStatus('Redoできる操作がありません');
        return;
      }
      renderReflectNodeList();
      setStatus('ノード操作をRedoしました');
      return;
    }
    if (act === 'reflectModeAllSrc') return runReflectModeAll('src');
    if (act === 'reflectModeAllTgt') return runReflectModeAll('tgt');

    if (act === 'previewApplyPlan') return withGuard(runPreviewApplyPlan);
    if (act === 'applyPreview') return withGuard(runApplyPreview);
    if (act === 'deployOnly') return withGuard(runDeployOnly);
    if (act === 'applyField') return withGuard(runFieldApply);
    if (act === 'loadTargetFields') return withGuard(runLoadTargetFields);
    if (act === 'formatFieldJson') {
      try {
        const text = ui.fieldJson.value.trim();
        if (!text) throw new Error('フォーマットするJSONがありません');
        const parsed = JSON.parse(text);
        ui.fieldJson.value = JSON.stringify(parsed, null, 2);
        setStatus('フィールドJSONをフォーマットしました');
      } catch (e) {
        setStatus(`フォーマットエラー: ${e.message || String(e)}`, true);
      }
      return;
    }
    if (act === 'importFieldJson') return ui.fieldJsonFile.click();
    if (act === 'exportFieldJson') {
      return withGuard(async () => {
        if (!ui.fieldJson.value.trim()) throw new Error('フィールドJSONが空です');
        const parsed = JSON.parse(ui.fieldJson.value);
        downloadText(`fields_${nowStamp()}.json`, JSON.stringify(parsed, null, 2), 'application/json');
        setStatus('フィールドJSONを保存しました');
      });
    }

    if (act === 'loadSourceFieldsList') return withGuard(runLoadSourceFieldsList);
    if (act === 'insertSelectedSourceFields') return runInsertSelectedSourceFields();
    if (act === 'closeSourceFieldsList') {
      ui.sourceFieldListContainer.style.display = 'none';
      return;
    }

    if (act === 'exportDesignJson') return withGuard(() => runDesignExport('json'));
    if (act === 'exportDesignMd') return withGuard(() => runDesignExport('md'));
    if (act === 'copyDesignMd') return withGuard(runDesignCopyMd);
    if (act === 'exportDesignXlsx') return withGuard(runDesignExportXlsx);

    if (act === 'fetchJsConfig') return withGuard(runFetchJsConfig);
    if (act === 'exportJsConfigJson') return withGuard(runExportJsConfig);
    if (act === 'importJsConfigJson') return ui.jsconfigFile.click();
    if (act === 'applyJsConfig') return withGuard(runApplyJsConfig);

    if (act === 'generateDummyRecords') return withGuard(runGenerateDummyRecords);
    if (act === 'deleteAllRecords') return withGuard(runDeleteAllRecords);
    if (act === 'renderProcessFlow') return withGuard(runRenderProcessFlow);
    if (act === 'launchKintoneSql') return withGuard(launchKintoneSql);
    if (act === 'generateERDiagram') return withGuard(runGenerateERDiagram);
    if (act === 'runBatchProcess') return withGuard(runBatchProcess);
    if (act === 'runBatchFileDownload') return withGuard(runBatchFileDownload);
    if (act === 'runBatchJsConfigDownload') return withGuard(runBatchJsConfigDownload);
    if (act === 'loadViewsForBatchProc') return withGuard(async () => loadViewsForSelect('u_batchProcView', 'u_batchProcAction'));
    if (act === 'loadViewsForBatchDl') return withGuard(async () => loadViewsForSelect('u_batchDlView', 'u_batchDlFileCode'));

  });
  // ==========================================
  // Injected Logic
  // ==========================================

  async function launchKintoneSql() {
    const sApp = document.getElementById('u_sourceApp').value.trim();
    if (!sApp) {
      setStatus('エラー: Source App IDを設定してください', true);
      return;
    }
    const existing = document.getElementById('kintone-sql-runner');
    if (existing) existing.remove();

    if (!window.kintone?.api) { setStatus('エラー: kintoneアプリ画面で実行してください', true); return; }

    const ROOT_ID = 'kintone-sql-runner';
    const ALASQL_CDN = 'https://cdn.jsdelivr.net/npm/alasql@4';
    const STORAGE_KEY = 'kintone-sql-runner-history';
    const THEME_KEY = 'kintone-sql-runner-theme';
    const PAGE_SIZE = 200;

    // =================================================================
    //  Theme definitions
    // =================================================================
    const Themes = {
      light: {
        bg: '#fff', panelBg: '#fff', headBg: '#f5f5f5', headBorder: '#ddd',
        editorBg: '#282c34', editorColor: '#abb2bf',
        tableBg: '#fff', thBg: '#eee', tdBorder: '#ddd', altRow: '#f9f9f9',
        text: '#333', subText: '#666', error: '#e74c3c',
        accent: '#3498db', accentHover: '#2980b9',
        sidebarBg: '#f8f9fa', sidebarBorder: '#e0e0e0',
        overlay: 'rgba(0,0,0,0.5)',
      },
      dark: {
        bg: '#1e1e1e', panelBg: '#252526', headBg: '#2d2d2d', headBorder: '#404040',
        editorBg: '#1e1e1e', editorColor: '#d4d4d4',
        tableBg: '#252526', thBg: '#333', tdBorder: '#404040', altRow: '#2a2a2a',
        text: '#d4d4d4', subText: '#888', error: '#f44747',
        accent: '#569cd6', accentHover: '#4a8abf',
        sidebarBg: '#2d2d2d', sidebarBorder: '#404040',
        overlay: 'rgba(0,0,0,0.7)',
      }
    };

    // =================================================================
    //  Utils
    // =================================================================
    const Utils = {
      el: (tag, attrs = {}, children = []) => {
        const e = document.createElement(tag);
        Object.entries(attrs).forEach(([k, v]) => {
          if (k === 'style' && typeof v === 'object') Object.assign(e.style, v);
          else if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2).toLowerCase(), v);
          else if (k === 'className') e.className = v;
          else if (k === 'value') e.value = v;
          else if (k === 'textContent') e.textContent = v;
          else if (k === 'innerHTML') e.innerHTML = v;
          else if (k === 'disabled') e.disabled = v;
          else if (k === 'title') e.title = v;
          else e.setAttribute(k, v);
        });
        (Array.isArray(children) ? children : [children]).forEach(c => {
          if (c != null) e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
        });
        return e;
      },

      css: (t) => `
      #${ROOT_ID} { display:flex; flex-direction:column; width:100%; height:75vh; min-height:500px; padding-top:10px; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; }
      #${ROOT_ID} * { box-sizing:border-box; margin:0; padding:0; }
      #${ROOT_ID} .panel { width:100%; height:100%; background:${t.panelBg}; border-radius:6px; display:flex; flex-direction:column; overflow:hidden; border:1px solid ${t.headBorder}; box-shadow:0 2px 8px rgba(0,0,0,0.05); }

      /* Header */
      #${ROOT_ID} .head { padding:8px 12px; background:${t.headBg}; border-bottom:1px solid ${t.headBorder}; display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
      #${ROOT_ID} .head b { color:${t.text}; font-size:14px; white-space:nowrap; }

      /* Body */
      #${ROOT_ID} .body { flex:1; display:flex; min-height:0; }
      #${ROOT_ID} .main-area { flex:1; display:flex; flex-direction:column; min-width:0; }

      /* Sidebar */
      #${ROOT_ID} .sidebar { width:240px; background:${t.sidebarBg}; border-left:1px solid ${t.sidebarBorder}; display:flex; flex-direction:column; overflow:hidden; transition:width .2s; }
      #${ROOT_ID} .sidebar.collapsed { width:0; border-left:none; }
      #${ROOT_ID} .sidebar-head { padding:8px 10px; font-weight:bold; font-size:12px; color:${t.text}; background:${t.headBg}; border-bottom:1px solid ${t.headBorder}; display:flex; justify-content:space-between; align-items:center; }
      #${ROOT_ID} .sidebar-body { flex:1; overflow-y:auto; padding:4px 0; }
      #${ROOT_ID} .field-item { padding:4px 10px; font-size:11px; cursor:pointer; color:${t.text}; display:flex; justify-content:space-between; align-items:center; }
      #${ROOT_ID} .field-item:hover { background:${t.accent}22; }
      #${ROOT_ID} .field-type { font-size:10px; color:${t.subText}; background:${t.headBg}; padding:1px 5px; border-radius:3px; }

      /* Editor area */
      #${ROOT_ID} .editor-wrap { position:relative; border-bottom:1px solid ${t.headBorder}; }
      #${ROOT_ID} .editor { width:100%; height:160px; padding:12px; background:${t.editorBg}; color:${t.editorColor}; font-family:'Fira Code','Cascadia Code','Consolas',monospace; font-size:13px; resize:vertical; border:none; outline:none; line-height:1.5; tab-size:2; min-height:60px; max-height:50vh; }

      /* Toolbar under editor */
      #${ROOT_ID} .toolbar { padding:6px 10px; background:${t.headBg}; border-bottom:1px solid ${t.headBorder}; display:flex; align-items:center; gap:6px; flex-wrap:wrap; }
      #${ROOT_ID} .toolbar select { font-size:11px; padding:3px 6px; border:1px solid ${t.headBorder}; border-radius:4px; background:${t.panelBg}; color:${t.text}; cursor:pointer; }

      /* Result */
      #${ROOT_ID} .result-wrap { flex:1; display:flex; flex-direction:column; min-height:0; }
      #${ROOT_ID} .result { flex:1; overflow:auto; position:relative; background:${t.tableBg}; }
      #${ROOT_ID} table { width:100%; border-collapse:collapse; font-size:12px; }
      #${ROOT_ID} th { position:sticky; top:0; background:${t.thBg}; z-index:1; border:1px solid ${t.tdBorder}; padding:6px 8px; text-align:left; color:${t.text}; font-size:11px; white-space:nowrap; cursor:pointer; user-select:none; }
      #${ROOT_ID} th:hover { background:${t.accent}33; }
      #${ROOT_ID} th .sort-arrow { margin-left:4px; font-size:10px; }
      #${ROOT_ID} td { border:1px solid ${t.tdBorder}; padding:5px 8px; white-space:pre-wrap; max-width:350px; color:${t.text}; font-size:12px; }
      #${ROOT_ID} tr:nth-child(even) { background:${t.altRow}; }
      #${ROOT_ID} .row-num { color:${t.subText}; text-align:right; font-size:10px; min-width:35px; background:${t.thBg}; }

      /* Pagination */
      #${ROOT_ID} .pager { padding:6px 10px; background:${t.headBg}; border-top:1px solid ${t.headBorder}; display:flex; align-items:center; gap:8px; font-size:12px; color:${t.text}; }
      #${ROOT_ID} .pager button { font-size:11px; }

      /* Buttons */
      #${ROOT_ID} .btn { padding:5px 10px; border:1px solid ${t.headBorder}; background:${t.panelBg}; border-radius:4px; cursor:pointer; font-size:11px; color:${t.text}; white-space:nowrap; transition:background .15s; }
      #${ROOT_ID} .btn:hover { background:${t.accent}22; }
      #${ROOT_ID} .btn:active { transform:scale(0.97); }
      #${ROOT_ID} .btn.primary { background:${t.accent}; color:#fff; border-color:${t.accentHover}; }
      #${ROOT_ID} .btn.primary:hover { background:${t.accentHover}; }
      #${ROOT_ID} .btn.sm { padding:3px 7px; font-size:10px; }
      #${ROOT_ID} .btn.icon { padding:4px 7px; font-size:14px; line-height:1; }

      /* Status */
      #${ROOT_ID} .status { font-size:11px; color:${t.subText}; margin-left:auto; white-space:nowrap; }

      /* Error */
      #${ROOT_ID} .error { color:${t.error}; padding:15px; font-family:monospace; font-size:13px; line-height:1.6; }

      /* History dropdown */
      #${ROOT_ID} .history-dropdown { position:absolute; top:100%; left:0; right:0; background:${t.panelBg}; border:1px solid ${t.headBorder}; border-radius:0 0 6px 6px; max-height:250px; overflow-y:auto; z-index:10; box-shadow:0 4px 12px rgba(0,0,0,0.2); }
      #${ROOT_ID} .history-item { padding:6px 10px; font-size:11px; font-family:monospace; cursor:pointer; color:${t.text}; border-bottom:1px solid ${t.headBorder}; display:flex; justify-content:space-between; align-items:center; }
      #${ROOT_ID} .history-item:hover { background:${t.accent}22; }
      #${ROOT_ID} .history-time { font-size:10px; color:${t.subText}; font-family:sans-serif; }

      /* App selector */
      #${ROOT_ID} .app-input { width:70px; font-size:11px; padding:3px 6px; border:1px solid ${t.headBorder}; border-radius:4px; background:${t.panelBg}; color:${t.text}; text-align:center; }

      /* Tooltip */
      #${ROOT_ID} [data-tooltip]:hover::after { content:attr(data-tooltip); position:absolute; bottom:110%; left:50%; transform:translateX(-50%); background:#333; color:#fff; padding:3px 8px; border-radius:4px; font-size:10px; white-space:nowrap; z-index:100; pointer-events:none; }
      #${ROOT_ID} [data-tooltip] { position:relative; }

      /* No-result */
      #${ROOT_ID} .no-result { padding:30px; text-align:center; color:${t.subText}; font-size:14px; }
    `,

      loadScript: (src) => new Promise((resolve, reject) => {
        if (window.alasql) return resolve();
        const s = document.createElement('script');
        s.src = src;
        s.onload = resolve;
        s.onerror = reject;
        document.head.appendChild(s);
      }),

      downloadCsv: (data, filename) => {
        if (!data?.length) return;
        const keys = Object.keys(data[0]);
        const bom = '\uFEFF';
        const csv = [
          keys.map(k => `"${k}"`).join(','),
          ...data.map(row => keys.map(k => {
            const v = row[k] == null ? '' : String(row[k]);
            return `"${v.replace(/"/g, '""')}"`;
          }).join(','))
        ].join('\r\n');
        const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        Object.assign(document.createElement('a'), { href: url, download: filename }).click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      },

      copyToClipboard: (data) => {
        if (!data?.length) return false;
        const keys = Object.keys(data[0]);
        const tsv = [keys.join('\t'), ...data.map(r => keys.map(k => r[k] ?? '').join('\t'))].join('\n');
        navigator.clipboard.writeText(tsv);
        return true;
      },

      // History management
      getHistory: () => {
        try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
      },
      addHistory: (sql) => {
        const h = Utils.getHistory().filter(item => item.sql !== sql);
        h.unshift({ sql, time: Date.now() });
        if (h.length > 50) h.length = 50;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(h));
      },
      clearHistory: () => localStorage.removeItem(STORAGE_KEY),

      getTheme: () => localStorage.getItem(THEME_KEY) || 'light',
      setTheme: (t) => localStorage.setItem(THEME_KEY, t),

      formatTime: (ts) => {
        const d = new Date(ts);
        return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
      }
    };

    // =================================================================
    //  SQL Templates
    // =================================================================
    const TEMPLATES = [
      { label: '-- テンプレート選択 --', sql: '' },
      { label: '全件取得 (100件)', sql: 'SELECT * FROM ? LIMIT 100' },
      { label: '件数カウント', sql: 'SELECT COUNT(*) AS total FROM ?' },
      { label: 'グループ集計', sql: 'SELECT [フィールド名], COUNT(*) AS cnt\nFROM ?\nGROUP BY [フィールド名]\nORDER BY cnt DESC' },
      { label: '条件フィルタ', sql: "SELECT * FROM ?\nWHERE [フィールド名] = '値'\nLIMIT 100" },
      { label: '重複チェック', sql: 'SELECT [フィールド名], COUNT(*) AS cnt\nFROM ?\nGROUP BY [フィールド名]\nHAVING cnt > 1' },
      { label: 'NULL検出', sql: "SELECT * FROM ?\nWHERE [フィールド名] IS NULL\n   OR [フィールド名] = ''" },
      { label: '日付範囲', sql: "SELECT * FROM ?\nWHERE [日付フィールド] BETWEEN '2024-01-01' AND '2024-12-31'" },
      { label: 'LIKE検索', sql: "SELECT * FROM ?\nWHERE [フィールド名] LIKE '%キーワード%'" },
      { label: '数値集計', sql: 'SELECT\n  COUNT(*) AS cnt,\n  SUM(CAST([数値フィールド] AS NUMBER)) AS total,\n  AVG(CAST([数値フィールド] AS NUMBER)) AS avg_val,\n  MIN(CAST([数値フィールド] AS NUMBER)) AS min_val,\n  MAX(CAST([数値フィールド] AS NUMBER)) AS max_val\nFROM ?' },
      { label: '複数アプリJOIN', sql: '-- app2にアプリIDをセットしてLoad\nSELECT a.*, b.*\nFROM ? AS a\nJOIN ?1 AS b ON a.[キー] = b.[キー]\nLIMIT 100' },
    ];

    // =================================================================
    //  Logic
    // =================================================================
    const Logic = {
      appCaches: {},  // { appId: { raw, flat, fields } }

      async fetchAllRecords(appId, onProgress) {
        const limit = 500;
        let records = [];
        let offset = 0;
        while (true) {
          const body = { app: appId, query: `limit ${limit} offset ${offset}` };
          const resp = await apiGet(buildApiPrefix(true) + '/records.json', body, getEnvConfig(true));
          records = records.concat(resp.records);
          if (onProgress) onProgress(records.length);
          if (resp.records.length < limit) break;
          offset += limit;
        }
        return records;
      },

      async fetchFields(appId) {
        try {
          const resp = await apiGet(buildApiPrefix(true) + '/app/form/fields.json', { app: appId }, getEnvConfig(true));
          return resp.properties || {};
        } catch {
          return {};
        }
      },

      flattenRecords(records, expandSubtables = false) {
        if (!expandSubtables) {
          return records.map(r => {
            const row = {};
            Object.keys(r).forEach(k => {
              const v = r[k];
              if (v.type === 'SUBTABLE') {
                row[k] = JSON.stringify(v.value.map(sub => {
                  const sRow = {};
                  Object.keys(sub.value).forEach(sk => sRow[sk] = sub.value[sk].value);
                  return sRow;
                }));
              } else if (['USER_SELECT', 'ORGANIZATION_SELECT', 'GROUP_SELECT'].includes(v.type)) {
                row[k] = v.value.map(u => u.name || u.code).join(', ');
              } else if (v.type === 'CREATOR' || v.type === 'MODIFIER') {
                row[k] = v.value?.name || v.value?.code || '';
              } else if (v.type === 'CHECK_BOX' || v.type === 'MULTI_SELECT') {
                row[k] = Array.isArray(v.value) ? v.value.join(', ') : v.value;
              } else if (v.type === 'FILE') {
                row[k] = Array.isArray(v.value) ? v.value.map(f => f.name).join(', ') : '';
              } else {
                row[k] = v.value;
              }
            });
            return row;
          });
        }

        // Expand subtables: each subtable row becomes its own record
        const result = [];
        records.forEach(r => {
          const base = {};
          let subtableKeys = [];
          Object.keys(r).forEach(k => {
            const v = r[k];
            if (v.type === 'SUBTABLE') {
              subtableKeys.push(k);
            } else if (['USER_SELECT', 'ORGANIZATION_SELECT', 'GROUP_SELECT'].includes(v.type)) {
              base[k] = v.value.map(u => u.name || u.code).join(', ');
            } else if (v.type === 'CREATOR' || v.type === 'MODIFIER') {
              base[k] = v.value?.name || v.value?.code || '';
            } else if (v.type === 'CHECK_BOX' || v.type === 'MULTI_SELECT') {
              base[k] = Array.isArray(v.value) ? v.value.join(', ') : v.value;
            } else if (v.type === 'FILE') {
              base[k] = Array.isArray(v.value) ? v.value.map(f => f.name).join(', ') : '';
            } else {
              base[k] = v.value;
            }
          });

          if (subtableKeys.length === 0) {
            result.push(base);
          } else {
            // Expand first subtable found
            const stKey = subtableKeys[0];
            const stRows = r[stKey].value;
            if (stRows.length === 0) {
              result.push({ ...base });
            } else {
              stRows.forEach(sub => {
                const row = { ...base };
                Object.keys(sub.value).forEach(sk => {
                  row[`${stKey}.${sk}`] = sub.value[sk].value;
                });
                result.push(row);
              });
            }
          }
        });
        return result;
      },

      async loadApp(appId, expandSubtables, onProgress) {
        const cacheKey = `${appId}_${expandSubtables}`;
        if (this.appCaches[cacheKey]) return this.appCaches[cacheKey];

        const raw = await this.fetchAllRecords(appId, onProgress);
        const fields = await this.fetchFields(appId);
        const flat = this.flattenRecords(raw, expandSubtables);
        this.appCaches[cacheKey] = { raw, flat, fields };
        return this.appCaches[cacheKey];
      },

      clearCache(appId) {
        if (appId) {
          Object.keys(this.appCaches).forEach(k => { if (k.startsWith(appId + '_')) delete this.appCaches[k]; });
        } else {
          this.appCaches = {};
        }
      },

      async runSql(query, ...datasets) {
        await Utils.loadScript(ALASQL_CDN);
        return window.alasql(query, datasets);
      }
    };

    // =================================================================
    //  UI
    // =================================================================
    const UI = (() => {
      let root, styleEl, statusEl, resultEl, editorEl, sidebarBody, pagerEl;
      let currentTheme = Utils.getTheme();
      let lastResult = null;
      let currentPage = 0;
      let sortCol = null;
      let sortAsc = true;
      let expandSubtables = false;
      let extraAppId = '';

      const setStatus = (msg) => { if (statusEl) statusEl.textContent = msg; };

      const applyTheme = () => {
        if (styleEl) styleEl.textContent = Utils.css(Themes[currentTheme]);
      };

      // ---- Sidebar (field list) ----
      const renderFields = (fields, flatData) => {
        if (!sidebarBody) return;
        sidebarBody.innerHTML = '';

        if (flatData?.length) {
          // Derive from actual data keys
          const keys = Object.keys(flatData[0]);
          keys.forEach(k => {
            const fType = fields[k]?.type || '?';
            const item = Utils.el('div', { className: 'field-item', onclick: () => insertField(k) }, [
              Utils.el('span', { textContent: k, title: k, style: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '150px' } }),
              Utils.el('span', { className: 'field-type', textContent: fType })
            ]);
            sidebarBody.appendChild(item);
          });
        } else {
          sidebarBody.appendChild(Utils.el('div', { style: { padding: '10px', fontSize: '11px', color: Themes[currentTheme].subText } }, 'Run a query first to see fields'));
        }
      };

      const insertField = (name) => {
        if (!editorEl) return;
        const start = editorEl.selectionStart;
        const end = editorEl.selectionEnd;
        const text = editorEl.value;
        const insert = `[${name}]`;
        editorEl.value = text.slice(0, start) + insert + text.slice(end);
        editorEl.selectionStart = editorEl.selectionEnd = start + insert.length;
        editorEl.focus();
      };

      // ---- Table rendering with pagination & sorting ----
      const getSortedData = () => {
        if (!lastResult) return [];
        if (sortCol === null) return lastResult;
        return [...lastResult].sort((a, b) => {
          let va = a[sortCol], vb = b[sortCol];
          if (va == null) va = '';
          if (vb == null) vb = '';
          // Try numeric
          const na = Number(va), nb = Number(vb);
          if (!isNaN(na) && !isNaN(nb)) return sortAsc ? na - nb : nb - na;
          return sortAsc ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
        });
      };

      const renderTable = () => {
        resultEl.innerHTML = '';
        pagerEl.innerHTML = '';

        if (!lastResult?.length) {
          resultEl.appendChild(Utils.el('div', { className: 'no-result' }, 'No results.'));
          return;
        }

        const sorted = getSortedData();
        const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
        if (currentPage >= totalPages) currentPage = totalPages - 1;
        const pageData = sorted.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);
        const keys = Object.keys(lastResult[0]);

        const thead = Utils.el('thead', {}, Utils.el('tr', {}, [
          Utils.el('th', { className: 'row-num', textContent: '#' }),
          ...keys.map(k => {
            const arrow = sortCol === k ? (sortAsc ? ' ▲' : ' ▼') : '';
            return Utils.el('th', {
              onclick: () => {
                if (sortCol === k) sortAsc = !sortAsc;
                else { sortCol = k; sortAsc = true; }
                renderTable();
              }
            }, [
              document.createTextNode(k),
              Utils.el('span', { className: 'sort-arrow', textContent: arrow })
            ]);
          })
        ]));

        const startIdx = currentPage * PAGE_SIZE;
        const tbody = Utils.el('tbody', {}, pageData.map((row, i) =>
          Utils.el('tr', {}, [
            Utils.el('td', { className: 'row-num', textContent: String(startIdx + i + 1) }),
            ...keys.map(k => Utils.el('td', {}, String(row[k] ?? '')))
          ])
        ));

        resultEl.appendChild(Utils.el('table', {}, [thead, tbody]));

        // Pagination
        if (totalPages > 1) {
          const info = Utils.el('span', {}, `Page ${currentPage + 1} / ${totalPages}  (${lastResult.length} rows)`);
          const btnPrev = Utils.el('button', {
            className: 'btn sm', disabled: currentPage === 0,
            onclick: () => { currentPage--; renderTable(); }
          }, '◀ Prev');
          const btnNext = Utils.el('button', {
            className: 'btn sm', disabled: currentPage >= totalPages - 1,
            onclick: () => { currentPage++; renderTable(); }
          }, 'Next ▶');
          const btnFirst = Utils.el('button', {
            className: 'btn sm', disabled: currentPage === 0,
            onclick: () => { currentPage = 0; renderTable(); }
          }, '|◀');
          const btnLast = Utils.el('button', {
            className: 'btn sm', disabled: currentPage >= totalPages - 1,
            onclick: () => { currentPage = totalPages - 1; renderTable(); }
          }, '▶|');
          pagerEl.append(btnFirst, btnPrev, info, btnNext, btnLast);
        } else {
          pagerEl.appendChild(Utils.el('span', {}, `${lastResult.length} rows`));
        }
      };

      // ---- Error ----
      const handleError = (e) => {
        console.error(e);
        resultEl.innerHTML = '';
        const msg = e.message || String(e);
        const detail = e.stack ? `\n\nStack:\n${e.stack.split('\n').slice(0, 3).join('\n')}` : '';
        resultEl.appendChild(Utils.el('div', { className: 'error' }, `❌ ${msg}${detail}`));
        setStatus('Error occurred.');
      };

      // ---- Execute ----
      const execute = async () => {
        const sql = editorEl.value.trim();
        if (!sql) return;

        const t0 = performance.now();
        try {
          const appId = document.getElementById('u_sourceApp').value.trim();

          // Load primary app
          setStatus('Fetching records...');
          const primary = await Logic.loadApp(appId, expandSubtables, (n) => setStatus(`App ${appId}: ${n} records...`));

          // Build datasets
          const datasets = [primary.flat];

          // Load extra app if referenced as ?1
          if (extraAppId && sql.includes('?1')) {
            setStatus(`Fetching App ${extraAppId}...`);
            const secondary = await Logic.loadApp(Number(extraAppId), expandSubtables, (n) => setStatus(`App ${extraAppId}: ${n} records...`));
            datasets.push(secondary.flat);
          }

          setStatus('Executing SQL...');
          await new Promise(r => setTimeout(r, 10)); // yield for UI

          const res = await Logic.runSql(sql, ...datasets);
          const elapsed = ((performance.now() - t0) / 1000).toFixed(2);

          lastResult = Array.isArray(res) ? res : [{ result: res }];
          currentPage = 0;
          sortCol = null;
          sortAsc = true;
          renderTable();
          setStatus(`${lastResult.length} rows — ${elapsed}s`);

          // Update sidebar with fields
          renderFields(primary.fields, primary.flat);

          // Save to history
          Utils.addHistory(sql);
        } catch (e) {
          handleError(e);
        }
      };

      // ---- History dropdown ----
      let historyDropdown = null;
      const toggleHistory = (anchor) => {
        if (historyDropdown) { historyDropdown.remove(); historyDropdown = null; return; }
        const items = Utils.getHistory();
        if (!items.length) return;

        historyDropdown = Utils.el('div', { className: 'history-dropdown' });
        items.forEach(item => {
          const row = Utils.el('div', {
            className: 'history-item', onclick: () => {
              editorEl.value = item.sql;
              historyDropdown.remove();
              historyDropdown = null;
              editorEl.focus();
            }
          }, [
            Utils.el('span', { textContent: item.sql.replace(/\n/g, ' ').slice(0, 80), style: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: '1' } }),
            Utils.el('span', { className: 'history-time', textContent: Utils.formatTime(item.time) })
          ]);
          historyDropdown.appendChild(row);
        });

        // Clear history button
        historyDropdown.appendChild(Utils.el('div', {
          className: 'history-item',
          style: { justifyContent: 'center', color: Themes[currentTheme].error, fontFamily: 'sans-serif' },
          onclick: () => { Utils.clearHistory(); historyDropdown.remove(); historyDropdown = null; }
        }, '🗑 Clear History'));

        anchor.style.position = 'relative';
        anchor.appendChild(historyDropdown);
      };

      // Close history on outside click
      const closeHistory = (e) => {
        if (historyDropdown && !historyDropdown.contains(e.target)) {
          historyDropdown.remove();
          historyDropdown = null;
        }
      };

      // ---- Init ----
      const init = () => {
        const old = document.getElementById(ROOT_ID);
        if (old) old.remove();
        const oldStyle = document.getElementById(ROOT_ID + '-style');
        if (oldStyle) oldStyle.remove();

        styleEl = Utils.el('style', { id: ROOT_ID + '-style' });
        applyTheme();

        // Editor
        editorEl = Utils.el('textarea', {
          className: 'editor',
          value: 'SELECT * FROM ? LIMIT 100',
          spellcheck: 'false',
          placeholder: 'Enter SQL... (use ? for current app, ?1 for extra app)'
        });

        // Tab support + shortcuts
        editorEl.addEventListener('keydown', (e) => {
          if (e.key === 'Tab') {
            e.preventDefault();
            const s = editorEl.selectionStart, end = editorEl.selectionEnd;
            editorEl.value = editorEl.value.slice(0, s) + '  ' + editorEl.value.slice(end);
            editorEl.selectionStart = editorEl.selectionEnd = s + 2;
          }
          if (e.ctrlKey && e.key === 'Enter') { e.preventDefault(); execute(); }
          if (e.ctrlKey && e.key === 's') { e.preventDefault(); Utils.addHistory(editorEl.value.trim()); setStatus('Saved to history.'); }
        });

        statusEl = Utils.el('div', { className: 'status' }, 'Ready');
        resultEl = Utils.el('div', { className: 'result' });
        pagerEl = Utils.el('div', { className: 'pager' });

        // ---- Header buttons ----
        const btnRun = Utils.el('button', { className: 'btn primary', onclick: execute, title: 'Ctrl+Enter' }, '▶ Run');

        const btnCsv = Utils.el('button', {
          className: 'btn', onclick: () => {
            if (!lastResult?.length) { setStatus('No data to export.'); return; }
            Utils.downloadCsv(lastResult, `query_${Date.now()}.csv`);
            setStatus('CSV exported.');
          }, title: 'Export as CSV'
        }, '📥 CSV');

        const btnCopy = Utils.el('button', {
          className: 'btn', onclick: () => {
            if (Utils.copyToClipboard(lastResult)) setStatus('Copied to clipboard!');
            else setStatus('No data to copy.');
          }, title: 'Copy as TSV'
        }, '📋 Copy');

        const btnReload = Utils.el('button', {
          className: 'btn', onclick: () => {
            Logic.clearCache();
            setStatus('Cache cleared.');
          }, title: 'Clear data cache'
        }, '🔄 Reload');

        const historyWrap = Utils.el('div', { style: { position: 'relative', display: 'inline-block' } });
        const btnHistory = Utils.el('button', { className: 'btn', onclick: () => toggleHistory(historyWrap), title: 'Query history (Ctrl+S to save)' }, '📜 History');
        historyWrap.appendChild(btnHistory);

        const btnTheme = Utils.el('button', {
          className: 'btn icon', onclick: () => {
            currentTheme = currentTheme === 'light' ? 'dark' : 'light';
            Utils.setTheme(currentTheme);
            applyTheme();
          }, title: 'Toggle theme'
        }, currentTheme === 'light' ? '🌙' : '☀️');

        const btnClose = Utils.el('button', {
          className: 'btn', onclick: () => {
            root.remove(); styleEl.remove(); document.removeEventListener('click', closeHistory);
            const sqlPane = document.querySelector('.pane[data-pane="sql"]');
            const btnWrap = sqlPane ? sqlPane.querySelector('.btns') : null;
            if (btnWrap) btnWrap.style.display = '';
          }
        }, '✕ Close');

        const head = Utils.el('div', { className: 'head' }, [
          Utils.el('b', {}, '⚡ Kintone SQL Runner'),
          btnRun, btnCsv, btnCopy, btnReload, historyWrap,
          btnTheme, statusEl, btnClose
        ]);

        // ---- Toolbar (templates, options) ----
        const templateSelect = Utils.el('select', {
          onchange: (e) => {
            if (e.target.value) { editorEl.value = e.target.value; editorEl.focus(); }
            e.target.selectedIndex = 0;
          }
        });
        TEMPLATES.forEach(t => templateSelect.appendChild(Utils.el('option', { value: t.sql }, t.label)));

        const subtableCheck = Utils.el('input', {
          type: 'checkbox', id: ROOT_ID + '-st', onchange: (e) => {
            expandSubtables = e.target.checked;
            Logic.clearCache();
            setStatus(expandSubtables ? 'Subtable expand: ON' : 'Subtable expand: OFF');
          }
        });
        const subtableLabel = Utils.el('label', { for: ROOT_ID + '-st', style: { fontSize: '11px', color: Themes[currentTheme].text, cursor: 'pointer', userSelect: 'none' } }, [
          subtableCheck, document.createTextNode(' サブテーブル展開')
        ]);

        const appInput = Utils.el('input', {
          className: 'app-input', type: 'number', placeholder: 'App ID',
          title: 'Extra app ID for JOIN (?1)',
          onchange: (e) => { extraAppId = e.target.value; }
        });
        const appLabel = Utils.el('span', { style: { fontSize: '11px', color: Themes[currentTheme].text } }, '?1 =');

        const toolbar = Utils.el('div', { className: 'toolbar' }, [
          templateSelect,
          Utils.el('span', { style: { width: '1px', height: '16px', background: '#ccc', margin: '0 4px' } }),
          subtableLabel,
          Utils.el('span', { style: { width: '1px', height: '16px', background: '#ccc', margin: '0 4px' } }),
          appLabel, appInput,
        ]);

        // ---- Sidebar ----
        let sidebarCollapsed = false;
        sidebarBody = Utils.el('div', { className: 'sidebar-body' });
        const btnToggleSidebar = Utils.el('button', {
          className: 'btn sm', onclick: () => {
            sidebarCollapsed = !sidebarCollapsed;
            sidebar.classList.toggle('collapsed', sidebarCollapsed);
            btnToggleSidebar.textContent = sidebarCollapsed ? '◀' : '▶';
          }
        }, '▶');
        const sidebarHead = Utils.el('div', { className: 'sidebar-head' }, [
          Utils.el('span', {}, 'Fields'),
          btnToggleSidebar
        ]);
        const sidebar = Utils.el('div', { className: 'sidebar' }, [sidebarHead, sidebarBody]);
        renderFields({}, null);

        // ---- Layout ----
        const editorWrap = Utils.el('div', { className: 'editor-wrap' }, editorEl);
        const resultWrap = Utils.el('div', { className: 'result-wrap' }, [resultEl, pagerEl]);
        const mainArea = Utils.el('div', { className: 'main-area' }, [editorWrap, toolbar, resultWrap]);
        const body = Utils.el('div', { className: 'body' }, [mainArea, sidebar]);
        const panel = Utils.el('div', { className: 'panel' }, [head, body]);

        root = Utils.el('div', { id: ROOT_ID }, panel);
        document.addEventListener('click', closeHistory);

        document.head.appendChild(styleEl);

        const sqlPane = document.querySelector('.pane[data-pane="sql"]');
        const btnWrap = sqlPane ? sqlPane.querySelector('.btns') : null;
        if (btnWrap) btnWrap.style.display = 'none';

        if (sqlPane) sqlPane.appendChild(root);
        else document.body.appendChild(root);

        editorEl.focus();
      };

      return { init };
    })();

    UI.init();

  }

  let runGenerateERDiagram;
  (() => {
    const CONFIG = {
      startAppId: document.getElementById('u_sourceApp').value.trim() || 74,
      maxFields: 120,
      sleepMs: 100,
    };

    // ─── Progress UI ───
    const ui = (() => {
      let el, bar, msg;
      return {
        init() {
          if (el) el.remove();
          el = document.createElement("div");
          Object.assign(el.style, {
            position: "fixed", top: "20px", right: "20px", width: "320px",
            padding: "16px", background: "rgba(10,10,18,0.94)", color: "#fff",
            borderRadius: "12px", zIndex: "999999", fontFamily: "sans-serif",
            boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
          });
          el.innerHTML = `
          <div style="font-weight:700;margin-bottom:10px;font-size:14px;">📊 ER図を生成中...</div>
          <div style="background:#333;height:8px;border-radius:4px;overflow:hidden;">
            <div id="_eb" style="width:0%;height:100%;background:linear-gradient(90deg,#00d4ff,#7b61ff);transition:width .3s;border-radius:4px;"></div>
          </div>
          <div id="_em" style="font-size:12px;margin-top:8px;color:#aaa;">準備中...</div>`;
          document.body.appendChild(el);
          bar = el.querySelector("#_eb"); msg = el.querySelector("#_em");
        },
        update(p, t) { if (bar) bar.style.width = p + "%"; if (msg) msg.textContent = t; },
        close() { this.update(100, "完了！"); setTimeout(() => { el.style.opacity = "0"; setTimeout(() => el.remove(), 600); }, 2e3); },
        error(e) { this.update(100, "Error: " + e); if (bar) bar.style.background = "#f44"; },
      };
    })();

    // ─── Fetch schemas (BFS) ───
    const cache = new Map(), visited = new Set();
    const sleep = ms => new Promise(r => setTimeout(r, ms));

    const getSchema = async (appId) => {
      if (cache.has(appId)) return cache.get(appId);
      try {
        const [fR, aR] = await Promise.all([
          kintone.api("/k/v1/app/form/fields.json", "GET", { app: appId }),
          kintone.api("/k/v1/app.json", "GET", { id: appId }),
        ]);
        const fields = [], relations = [];
        const walk = (props, sub) => {
          for (const [c, f] of Object.entries(props)) {
            if (["GROUP", "SPACER", "HR", "LABEL"].includes(f.type)) continue;
            if (f.type === "SUBTABLE") { fields.push({ code: c, label: f.label, type: "SUBTABLE", sub: true }); walk(f.fields, c); continue; }
            const isL = f.type === "LOOKUP", isR = f.type === "REFERENCE_TABLE";
            const isPK = /^(\$id|record_number|レコード番号)$/i.test(c);
            fields.push({ code: c, label: f.label || c, type: f.type, required: !!f.required, isPK, isLookup: isL, isRef: isR, inSubtable: !!sub });
            if (isL && f.lookup?.relatedApp?.app) relations.push({ from: c, fromLabel: f.label, toApp: Number(f.lookup.relatedApp.app), toField: f.lookup.relatedKeyField, kind: "LOOKUP" });
            if (isR && f.referenceTable?.relatedApp?.app) relations.push({ from: c, fromLabel: f.label, toApp: Number(f.referenceTable.relatedApp.app), toField: f.referenceTable.condition?.field, kind: "REF" });
          }
        };
        walk(fR.properties, null);
        const r = { id: appId, name: aR.name, spaceId: aR.spaceId || null, threadId: aR.threadId || null, fields: fields.slice(0, CONFIG.maxFields), relations, ok: true, createdAt: aR.createdAt, modifiedAt: aR.modifiedAt };
        cache.set(appId, r); return r;
      } catch (e) { console.error(`App ${appId}:`, e); const r = { id: appId, name: `App ${appId} (Error)`, fields: [], relations: [], ok: false }; cache.set(appId, r); return r; }
    };

    const crawl = async (startId) => {
      const q = [startId], apps = [];
      while (q.length) {
        const id = q.shift(); if (visited.has(id)) continue; visited.add(id);
        const a = await getSchema(id); apps.push(a);
        ui.update(Math.min(90, (apps.length / (apps.length + q.length)) * 100 | 0), `解析: ${a.name}`);
        for (const r of a.relations) if (!visited.has(r.toApp) && !q.includes(r.toApp)) q.push(r.toApp);
        await sleep(CONFIG.sleepMs);
      }
      return apps;
    };

    // ─── Build full HTML ───
    const buildHTML = (apps) => {
      const data = JSON.stringify(apps);
      return /*html*/`<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Kintone ER Diagram v2</title>
<script src="https://cdnjs.cloudflare.com/ajax/libs/cytoscape/3.28.1/cytoscape.min.js"><\/script>
<style>
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,600;0,9..40,700;1,9..40,400&family=DM+Mono:wght@400;500&display=swap');

*{margin:0;padding:0;box-sizing:border-box;}

:root{
  --bg:#08090d;--surface:#11131a;--surface2:#181c27;--border:#262d3d;
  --text:#d8dee9;--dim:#636e83;--accent:#5eead4;--accent2:#818cf8;
  --lookup:#60a5fa;--ref:#34d399;--pk:#fbbf24;--req:#f87171;
  --radius:10px;
}
[data-theme="light"]{
  --bg:#f0f2f5;--surface:#ffffff;--surface2:#f7f8fa;--border:#d8dce6;
  --text:#1a1c23;--dim:#6b7280;--accent:#0d9488;--accent2:#6366f1;
  --lookup:#2563eb;--ref:#059669;--pk:#d97706;--req:#dc2626;
}

body{font-family:'DM Sans',sans-serif;background:var(--bg);color:var(--text);overflow:hidden;height:100vh;}

/* ── Command Palette ── */
#cmd-overlay{display:none;position:fixed;inset:0;z-index:500;background:rgba(0,0,0,0.55);backdrop-filter:blur(6px);justify-content:center;align-items:flex-start;padding-top:15vh;}
#cmd-overlay.open{display:flex;}
#cmd-box{width:520px;background:var(--surface);border:1px solid var(--border);border-radius:14px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,0.5);}
#cmd-input{width:100%;padding:16px 20px;border:none;background:transparent;color:var(--text);font-size:15px;font-family:inherit;outline:none;border-bottom:1px solid var(--border);}
#cmd-input::placeholder{color:var(--dim);}
#cmd-results{max-height:340px;overflow-y:auto;}
.cmd-item{padding:10px 20px;cursor:pointer;display:flex;align-items:center;gap:10px;font-size:13px;border-bottom:1px solid var(--border);}
.cmd-item:hover,.cmd-item.active{background:var(--surface2);}
.cmd-item .kbd{margin-left:auto;font-size:10px;padding:2px 7px;background:var(--surface2);border:1px solid var(--border);border-radius:4px;font-family:'DM Mono',monospace;color:var(--dim);}

/* ── Top Bar ── */
#topbar{
  position:fixed;top:0;left:0;right:0;z-index:100;
  display:flex;align-items:center;gap:6px;padding:8px 14px;
  background:linear-gradient(180deg,var(--bg) 70%,transparent);
}
#topbar h1{font-size:14px;font-weight:700;margin-right:6px;white-space:nowrap;
  background:linear-gradient(135deg,var(--accent),var(--accent2));-webkit-background-clip:text;-webkit-text-fill-color:transparent;}
.tb{padding:5px 12px;border:1px solid var(--border);border-radius:var(--radius);background:var(--surface);color:var(--text);font-size:11px;cursor:pointer;transition:.15s;font-family:inherit;white-space:nowrap;}
.tb:hover{border-color:var(--accent);color:var(--accent);}
.tb.active{background:var(--accent);color:#000;border-color:var(--accent);font-weight:600;}
.sep{width:1px;height:20px;background:var(--border);margin:0 4px;}
#search-box{padding:5px 10px;border:1px solid var(--border);border-radius:var(--radius);background:var(--surface2);color:var(--text);font-size:11px;width:180px;font-family:inherit;outline:none;}
#search-box:focus{border-color:var(--accent);}
#search-box::placeholder{color:var(--dim);}
.spacer{flex:1;}

/* ── Sidebar ── */
#sidebar{
  position:fixed;top:48px;left:0;bottom:0;width:280px;z-index:90;
  background:var(--surface);border-right:1px solid var(--border);
  transform:translateX(-100%);transition:transform .25s;overflow-y:auto;
  padding:14px;font-size:12px;
}
#sidebar.open{transform:translateX(0);}
#sidebar h3{font-size:13px;margin:14px 0 8px;color:var(--accent);font-weight:600;}
#sidebar h3:first-child{margin-top:0;}
.stat-row{display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid var(--border);}
.stat-val{font-weight:600;font-family:'DM Mono',monospace;color:var(--accent2);}
.app-list-item{padding:6px 8px;cursor:pointer;border-radius:6px;margin:2px 0;transition:.1s;}
.app-list-item:hover{background:var(--surface2);}
.app-list-item.highlighted{background:rgba(94,234,212,0.12);border:1px solid var(--accent);}
.filter-chip{display:inline-block;padding:3px 8px;margin:2px;border:1px solid var(--border);border-radius:20px;font-size:10px;cursor:pointer;transition:.1s;}
.filter-chip:hover,.filter-chip.active{background:var(--accent);color:#000;border-color:var(--accent);}

/* ── Detail Panel ── */
#detail{
  position:fixed;top:48px;right:0;width:360px;max-height:calc(100vh - 56px);
  overflow-y:auto;z-index:90;background:var(--surface);border-left:1px solid var(--border);
  padding:20px;display:none;
}
#detail.open{display:block;}
#detail h2{font-size:15px;margin-bottom:4px;color:var(--accent);}
#detail .app-meta{font-size:11px;color:var(--dim);margin-bottom:12px;}
.close-btn{position:absolute;top:12px;right:14px;background:none;border:none;color:var(--dim);font-size:16px;cursor:pointer;}
.field-group-title{font-size:11px;font-weight:600;color:var(--dim);margin:12px 0 6px;text-transform:uppercase;letter-spacing:.05em;}
.field-row{display:flex;align-items:center;gap:6px;padding:5px 8px;border-radius:6px;font-size:11px;font-family:'DM Mono',monospace;border-bottom:1px solid var(--border);}
.field-row:hover{background:var(--surface2);}
.field-icon{width:18px;text-align:center;flex-shrink:0;}
.field-name{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.field-type{color:var(--dim);font-size:10px;flex-shrink:0;}
.tag{display:inline-block;padding:1px 5px;border-radius:3px;font-size:9px;font-weight:600;margin-left:4px;}
.tag-pk{background:rgba(251,191,36,0.15);color:var(--pk);}
.tag-fk{background:rgba(96,165,250,0.15);color:var(--lookup);}
.tag-ref{background:rgba(52,211,153,0.15);color:var(--ref);}
.tag-req{background:rgba(248,113,113,0.12);color:var(--req);}
.tag-sub{background:rgba(99,110,131,0.15);color:var(--dim);}

/* ── Path Finder ── */
#pathfinder{
  position:fixed;bottom:16px;left:50%;transform:translateX(-50%);z-index:100;
  background:var(--surface);border:1px solid var(--border);border-radius:12px;
  padding:10px 16px;display:none;align-items:center;gap:8px;font-size:12px;
  box-shadow:0 8px 30px rgba(0,0,0,0.4);
}
#pathfinder.open{display:flex;}
#pathfinder select{padding:4px 8px;border:1px solid var(--border);border-radius:6px;background:var(--surface2);color:var(--text);font-size:11px;font-family:inherit;}
#pathfinder button{padding:4px 12px;border-radius:6px;}
#path-result{font-size:11px;color:var(--accent);max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}

/* ── Legend ── */
#legend{
  position:fixed;bottom:16px;right:16px;z-index:100;
  display:flex;gap:14px;padding:8px 14px;
  background:var(--surface);border:1px solid var(--border);
  border-radius:var(--radius);font-size:10px;
}
#legend span{display:flex;align-items:center;gap:4px;}
#legend i{display:inline-block;width:9px;height:9px;border-radius:2px;}

/* ── Minimap ── */
#minimap{
  position:fixed;bottom:52px;right:16px;z-index:100;
  width:180px;height:130px;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);
  overflow:hidden;display:none;
}
#minimap.open{display:block;}
#minimap canvas{width:100%;height:100%;}

/* ── Cy ── */
#cy{width:100vw;height:100vh;}

/* ── Modal ── */
#modal-overlay{display:none;position:fixed;inset:0;z-index:300;background:rgba(0,0,0,0.6);backdrop-filter:blur(4px);justify-content:center;align-items:center;}
#modal-overlay.open{display:flex;}
#modal{background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:24px;width:600px;max-height:80vh;overflow-y:auto;}
#modal h2{margin-bottom:10px;font-size:15px;}
#modal pre{background:var(--bg);padding:12px;border-radius:8px;font-size:11px;overflow-x:auto;white-space:pre-wrap;font-family:'DM Mono',monospace;color:var(--dim);max-height:400px;overflow-y:auto;border:1px solid var(--border);}
#modal .actions{margin-top:12px;display:flex;gap:8px;}
#modal .actions button{padding:7px 14px;border:1px solid var(--border);border-radius:8px;background:var(--surface);color:var(--text);cursor:pointer;font-family:inherit;font-size:12px;}
#modal .actions button.primary{background:var(--accent);color:#000;border-color:var(--accent);font-weight:600;}

/* ── Toast ── */
#toast{position:fixed;bottom:60px;left:50%;transform:translateX(-50%) translateY(20px);z-index:600;padding:8px 20px;background:var(--accent);color:#000;border-radius:8px;font-size:12px;font-weight:600;opacity:0;transition:.3s;pointer-events:none;}
#toast.show{opacity:1;transform:translateX(-50%) translateY(0);}

/* scrollbar */
::-webkit-scrollbar{width:5px;}::-webkit-scrollbar-track{background:transparent;}::-webkit-scrollbar-thumb{background:var(--border);border-radius:3px;}
</style>
</head>
<body>

<!-- Command Palette -->
<div id="cmd-overlay" onclick="if(event.target===this)closeCmd()">
  <div id="cmd-box">
    <input id="cmd-input" placeholder="コマンドを入力... (アプリ検索、エクスポート、レイアウト変更...)" oninput="filterCmd(this.value)">
    <div id="cmd-results"></div>
  </div>
</div>

<!-- Top Bar -->
<div id="topbar">
  <h1>⬡ Kintone ER Diagram</h1>
  <div class="sep"></div>
  <button class="tb" onclick="toggleSidebar()" title="Ctrl+B">📊 統計</button>
  <button class="tb" onclick="togglePathFinder()">🔍 経路探索</button>
  <div class="sep"></div>
  <button class="tb" onclick="setLayout('cose')">自動配置</button>
  <button class="tb" onclick="setLayout('grid')">Grid</button>
  <button class="tb" onclick="setLayout('circle')">Circle</button>
  <button class="tb" onclick="setLayout('breadthfirst')">Tree</button>
  <button class="tb" onclick="setLayout('concentric')">Concentric</button>
  <div class="sep"></div>
  <input id="search-box" placeholder="🔎 アプリ・フィールド検索 (Ctrl+F)" oninput="searchGraph(this.value)">
  <div class="spacer"></div>
  <button class="tb" onclick="toggleMinimap()">🗺</button>
  <button class="tb" id="theme-btn" onclick="toggleTheme()">🌙</button>
  <button class="tb" onclick="openCmd()" title="Ctrl+K">⌘K</button>
  <div class="sep"></div>
  <button class="tb" onclick="fit()">📐 Fit</button>
  <button class="tb" onclick="exportPNG()">PNG</button>
  <button class="tb" onclick="exportSVG()">SVG</button>
  <button class="tb" onclick="showMermaid()">Mermaid</button>
  <button class="tb" onclick="showDrawio()">draw.io</button>
  <button class="tb" onclick="showSQL()">SQL</button>
  <button class="tb" onclick="showPlantUML()">PlantUML</button>
  <button class="tb" onclick="showJSON()">JSON</button>
</div>

<!-- Sidebar -->
<div id="sidebar">
  <h3>📊 統計サマリー</h3>
  <div id="stats-summary"></div>
  <h3>🏷 フィールドタイプフィルター</h3>
  <div id="type-filters"></div>
  <h3>📱 アプリ一覧</h3>
  <div id="app-list"></div>
</div>

<!-- Cytoscape -->
<div id="cy"></div>

<!-- Detail Panel -->
<div id="detail">
  <button class="close-btn" onclick="closeDetail()">✕</button>
  <h2 id="detail-title"></h2>
  <div class="app-meta" id="detail-meta"></div>
  <div id="detail-relations"></div>
  <div id="detail-fields"></div>
</div>

<!-- Path Finder -->
<div id="pathfinder">
  <span>経路:</span>
  <select id="pf-from"></select>
  <span>→</span>
  <select id="pf-to"></select>
  <button class="tb active" onclick="findPath()">検索</button>
  <button class="tb" onclick="clearPath()">クリア</button>
  <span id="path-result"></span>
</div>

<!-- Legend -->
<div id="legend">
  <span><i style="background:var(--pk)"></i>PK</span>
  <span><i style="background:var(--lookup)"></i>Lookup</span>
  <span><i style="background:var(--ref)"></i>Related</span>
  <span><i style="background:var(--req)"></i>Required</span>
  <span><i style="border:2px solid var(--lookup)"></i>Lookup線</span>
  <span><i style="border:2px dashed var(--ref)"></i>関連線</span>
</div>

<!-- Minimap -->
<div id="minimap"><canvas id="minimap-canvas"></canvas></div>

<!-- Modal -->
<div id="modal-overlay" onclick="if(event.target===this)closeModal()">
  <div id="modal"><h2 id="modal-title"></h2><pre id="modal-content"></pre>
    <div class="actions">
      <button class="primary" onclick="copyModal()">📋 コピー</button>
      <button onclick="downloadModal()">💾 ダウンロード</button>
      <button onclick="closeModal()">閉じる</button>
    </div>
  </div>
</div>

<div id="toast"></div>

<script>
const APPS = ${data};
const appMap = new Map(APPS.map(a=>[a.id,a]));

// ─── Toast ───
function toast(msg){const t=document.getElementById("toast");t.textContent=msg;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),2000);}

// ─── Theme ───
let isDark=true;
function toggleTheme(){
  isDark=!isDark;
  document.documentElement.setAttribute("data-theme",isDark?"":"light");
  document.getElementById("theme-btn").textContent=isDark?"🌙":"☀️";
  toast(isDark?"ダークモード":"ライトモード");
}

// ─── Cytoscape Init ───
const elements=[];
APPS.forEach(app=>{
  const fl=app.fields.map(f=>{
    let ic="";
    if(f.isPK) ic="🔑"; else if(f.isLookup) ic="🔗"; else if(f.isRef) ic="📋";
    else if(f.type==="SUBTABLE") ic="📦"; else if(f.required) ic="•"; else if(f.inSubtable) ic="↳";
    return ic+" "+(f.label||f.code);
  }).slice(0,18);
  if(app.fields.length>18) fl.push("... +"+(app.fields.length-18)+" more");
  elements.push({data:{id:"a"+app.id,label:app.name+"\\n(ID:"+app.id+")\\n─────────\\n"+fl.join("\\n"),appId:app.id,isError:!app.ok,fieldCount:app.fields.length,relCount:app.relations.length}});
});
let ei=0;
APPS.forEach(app=>{
  app.relations.forEach(r=>{
    if(appMap.has(r.toApp)){
      elements.push({data:{id:"e"+(ei++),source:"a"+app.id,target:"a"+r.toApp,kind:r.kind,label:r.kind==="LOOKUP"?"Lookup":"Related",fromLabel:r.fromLabel}});
    }
  });
});

const cy=cytoscape({
  container:document.getElementById("cy"),
  elements,
  style:[
    {selector:"node",style:{
      "shape":"round-rectangle","label":"data(label)","text-valign":"center","text-halign":"center",
      "text-wrap":"wrap","text-max-width":"240px","font-size":"9.5px",
      "font-family":"'DM Mono',monospace","color":"#d8dee9","text-outline-color":"#11131a","text-outline-width":"1px",
      "background-color":"#11131a","border-width":2,"border-color":"#262d3d","padding":"14px","width":"label","height":"label",
    }},
    {selector:"node[?isError]",style:{"border-color":"#f87171","background-color":"#1a0505"}},
    {selector:"node:selected",style:{"border-color":"var(--accent, #5eead4)","border-width":3}},
    {selector:"node.highlighted",style:{"border-color":"#fbbf24","border-width":3,"background-color":"#1a1805"}},
    {selector:"node.path-node",style:{"border-color":"#f472b6","border-width":4,"background-color":"#1a0a12"}},
    {selector:"node.dimmed",style:{"opacity":0.15}},
    {selector:'edge[kind="LOOKUP"]',style:{
      "width":2.5,"line-color":"#60a5fa","target-arrow-color":"#60a5fa","target-arrow-shape":"triangle",
      "source-arrow-shape":"circle","source-arrow-color":"#60a5fa","curve-style":"bezier",
      "label":"data(label)","font-size":"9px","color":"#60a5fa",
      "text-outline-color":"#08090d","text-outline-width":"2px",
      "text-background-color":"#08090d","text-background-opacity":0.7,"text-background-padding":"3px",
    }},
    {selector:'edge[kind="REF"]',style:{
      "width":2,"line-color":"#34d399","line-style":"dashed","target-arrow-color":"#34d399",
      "target-arrow-shape":"triangle","source-arrow-shape":"diamond","source-arrow-color":"#34d399","curve-style":"bezier",
      "label":"data(label)","font-size":"9px","color":"#34d399",
      "text-outline-color":"#08090d","text-outline-width":"2px",
      "text-background-color":"#08090d","text-background-opacity":0.7,"text-background-padding":"3px",
    }},
    {selector:"edge.path-edge",style:{"width":4,"line-color":"#f472b6","target-arrow-color":"#f472b6","source-arrow-color":"#f472b6","z-index":999}},
    {selector:"edge.dimmed",style:{"opacity":0.08}},
  ],
  layout:{name:"cose",animate:true,animationDuration:600,nodeRepulsion:800000,idealEdgeLength:260,gravity:0.25,numIter:1200,padding:80},
  minZoom:0.05,maxZoom:4,wheelSensitivity:0.25,
});

function fit(){cy.fit(undefined,60);}
cy.one("layoutstop",()=>setTimeout(fit,200));

// ─── Layout Switching ───
function setLayout(name){
  const opts={padding:60,animate:true,animationDuration:500};
  if(name==="cose") Object.assign(opts,{name:"cose",nodeRepulsion:800000,idealEdgeLength:260,gravity:0.25,numIter:1200});
  else if(name==="grid") Object.assign(opts,{name:"grid",rows:Math.ceil(Math.sqrt(APPS.length))});
  else if(name==="circle") Object.assign(opts,{name:"circle"});
  else if(name==="breadthfirst") Object.assign(opts,{name:"breadthfirst",directed:true,spacingFactor:1.5});
  else if(name==="concentric") Object.assign(opts,{name:"concentric",concentric:n=>n.connectedEdges().length,levelWidth:()=>2});
  cy.layout(opts).run();
  toast("レイアウト: "+name);
}

// ─── Search & Highlight ───
function searchGraph(q){
  cy.elements().removeClass("highlighted dimmed");
  if(!q.trim()) return;
  const low=q.toLowerCase();
  const matched=cy.nodes().filter(n=>{
    const app=appMap.get(n.data("appId"));
    if(!app) return false;
    if(app.name.toLowerCase().includes(low)) return true;
    return app.fields.some(f=>(f.label||"").toLowerCase().includes(low)||(f.code||"").toLowerCase().includes(low));
  });
  if(matched.length){
    matched.addClass("highlighted");
    cy.elements().not(matched).not(matched.connectedEdges()).addClass("dimmed");
  }
}

// ─── Click Detail ───
cy.on("tap","node",e=>{
  const app=appMap.get(e.target.data("appId"));
  if(!app) return;
  const p=document.getElementById("detail");
  document.getElementById("detail-title").textContent=app.name;
  document.getElementById("detail-meta").innerHTML="ID: "+app.id
    +(app.createdAt?" | 作成: "+new Date(app.createdAt).toLocaleDateString():"")
    +(app.modifiedAt?" | 更新: "+new Date(app.modifiedAt).toLocaleDateString():"")
    +"<br>フィールド数: "+app.fields.length+" | リレーション: "+app.relations.length;

  // Relations
  let relHtml="";
  if(app.relations.length){
    relHtml='<div class="field-group-title">リレーション</div>';
    app.relations.forEach(r=>{
      const tgt=appMap.get(r.toApp);
      const tName=tgt?tgt.name:"App "+r.toApp;
      const icon=r.kind==="LOOKUP"?"🔗":"📋";
      relHtml+='<div class="field-row" style="cursor:pointer" onclick="focusApp('+r.toApp+')"><span class="field-icon">'+icon+'</span><span class="field-name">'+r.fromLabel+' → '+tName+'</span><span class="field-type">'+r.kind+'</span></div>';
    });
  }
  document.getElementById("detail-relations").innerHTML=relHtml;

  // Fields grouped
  const groups={pk:[],lookup:[],ref:[],required:[],subtable:[],normal:[]};
  app.fields.forEach(f=>{
    if(f.isPK) groups.pk.push(f);
    else if(f.isLookup) groups.lookup.push(f);
    else if(f.isRef) groups.ref.push(f);
    else if(f.type==="SUBTABLE") groups.subtable.push(f);
    else if(f.required) groups.required.push(f);
    else groups.normal.push(f);
  });

  let fHtml="";
  const renderGroup=(title,fields,tagClass,tagLabel)=>{
    if(!fields.length) return;
    fHtml+='<div class="field-group-title">'+title+" ("+fields.length+")</div>";
    fields.forEach(f=>{
      let icon="·";
      if(f.isPK) icon="🔑"; else if(f.isLookup) icon="🔗"; else if(f.isRef) icon="📋"; else if(f.type==="SUBTABLE") icon="📦"; else if(f.inSubtable) icon="↳";
      let tags="";
      if(tagLabel) tags='<span class="tag '+tagClass+'">'+tagLabel+"</span>";
      if(f.required&&tagLabel!=="必須") tags+='<span class="tag tag-req">必須</span>';
      if(f.inSubtable) tags+='<span class="tag tag-sub">Sub</span>';
      fHtml+='<div class="field-row"><span class="field-icon">'+icon+'</span><span class="field-name">'+(f.label||f.code)+tags+'</span><span class="field-type">'+f.type+"</span></div>";
    });
  };
  renderGroup("Primary Key",groups.pk,"tag-pk","PK");
  renderGroup("Lookup (FK)",groups.lookup,"tag-fk","FK");
  renderGroup("関連レコード",groups.ref,"tag-ref","REF");
  renderGroup("必須フィールド",groups.required,"tag-req","必須");
  renderGroup("サブテーブル",groups.subtable,"tag-sub","Table");
  renderGroup("その他フィールド",groups.normal,"","");
  document.getElementById("detail-fields").innerHTML=fHtml;

  p.classList.add("open");
});
cy.on("tap",e=>{if(e.target===cy){closeDetail();cy.elements().removeClass("highlighted dimmed path-node path-edge");}});

function closeDetail(){document.getElementById("detail").classList.remove("open");}

function focusApp(id){
  const n=cy.getElementById("a"+id);
  if(n.length){cy.animate({center:{eles:n},zoom:1.5},{ duration:400 });n.select();}
}

// ─── Sidebar ───
function toggleSidebar(){document.getElementById("sidebar").classList.toggle("open");}

// Build stats
(function buildSidebar(){
  const totalFields=APPS.reduce((s,a)=>s+a.fields.length,0);
  const totalRels=APPS.reduce((s,a)=>s+a.relations.length,0);
  const lookups=APPS.reduce((s,a)=>s+a.relations.filter(r=>r.kind==="LOOKUP").length,0);
  const refs=totalRels-lookups;
  const typeCount={};
  APPS.forEach(a=>a.fields.forEach(f=>{typeCount[f.type]=(typeCount[f.type]||0)+1;}));

  let html='<div class="stat-row"><span>アプリ数</span><span class="stat-val">'+APPS.length+'</span></div>';
  html+='<div class="stat-row"><span>総フィールド数</span><span class="stat-val">'+totalFields+'</span></div>';
  html+='<div class="stat-row"><span>Lookup数</span><span class="stat-val">'+lookups+'</span></div>';
  html+='<div class="stat-row"><span>関連レコード数</span><span class="stat-val">'+refs+'</span></div>';
  html+='<div class="stat-row"><span>総リレーション</span><span class="stat-val">'+totalRels+'</span></div>';
  html+='<div class="stat-row"><span>エラーアプリ</span><span class="stat-val">'+APPS.filter(a=>!a.ok).length+'</span></div>';
  document.getElementById("stats-summary").innerHTML=html;

  // type filters
  let fHtml="";
  Object.entries(typeCount).sort((a,b)=>b[1]-a[1]).forEach(([t,c])=>{
    fHtml+='<span class="filter-chip" onclick="filterByType(this,\\''+t+'\\')" data-type="'+t+'">'+t+' ('+c+')</span>';
  });
  document.getElementById("type-filters").innerHTML=fHtml;

  // app list
  let aHtml="";
  APPS.forEach(a=>{
    aHtml+='<div class="app-list-item" onclick="focusApp('+a.id+')">'+a.name+' <span style="color:var(--dim);font-size:10px">('+a.fields.length+' fields)</span></div>';
  });
  document.getElementById("app-list").innerHTML=aHtml;
})();

function filterByType(el,type){
  el.classList.toggle("active");
  const active=[...document.querySelectorAll(".filter-chip.active")].map(e=>e.dataset.type);
  cy.elements().removeClass("highlighted dimmed");
  if(!active.length) return;
  const matched=cy.nodes().filter(n=>{
    const app=appMap.get(n.data("appId"));
    return app&&app.fields.some(f=>active.includes(f.type));
  });
  matched.addClass("highlighted");
  cy.elements().not(matched).not(matched.connectedEdges()).addClass("dimmed");
}

// ─── Path Finder ───
function togglePathFinder(){
  const pf=document.getElementById("pathfinder");
  pf.classList.toggle("open");
  if(pf.classList.contains("open")){
    const opts=APPS.map(a=>'<option value="a'+a.id+'">'+a.name+"</option>").join("");
    document.getElementById("pf-from").innerHTML=opts;
    document.getElementById("pf-to").innerHTML=opts;
  }
}

function findPath(){
  clearPath();
  const from=document.getElementById("pf-from").value;
  const to=document.getElementById("pf-to").value;
  if(from===to){toast("同じアプリです");return;}
  const dijkstra=cy.elements().dijkstra({root:"#"+from,directed:false});
  const path=dijkstra.pathTo(cy.getElementById(to));
  if(!path||path.length===0){document.getElementById("path-result").textContent="経路なし";return;}
  path.addClass("path-node path-edge");
  cy.elements().not(path).addClass("dimmed");
  const names=path.nodes().map(n=>appMap.get(n.data("appId"))?.name||"?").join(" → ");
  document.getElementById("path-result").textContent=names;
  toast("経路: "+path.nodes().length+"アプリ");
}

function clearPath(){
  cy.elements().removeClass("path-node path-edge dimmed highlighted");
  document.getElementById("path-result").textContent="";
}

// ─── Minimap ───
let minimapOpen=false,minimapTimer;
function toggleMinimap(){
  minimapOpen=!minimapOpen;
  document.getElementById("minimap").classList.toggle("open",minimapOpen);
  if(minimapOpen) startMinimap(); else clearInterval(minimapTimer);
}
function startMinimap(){
  const canvas=document.getElementById("minimap-canvas");
  const ctx=canvas.getContext("2d");
  const render=()=>{
    canvas.width=180;canvas.height=130;
    ctx.fillStyle=getComputedStyle(document.documentElement).getPropertyValue("--surface").trim()||"#11131a";
    ctx.fillRect(0,0,180,130);
    const bb=cy.elements().boundingBox();
    if(bb.w===0) return;
    const sx=170/bb.w,sy=120/bb.h,s=Math.min(sx,sy);
    const ox=(180-bb.w*s)/2,oy=(130-bb.h*s)/2;
    cy.edges().forEach(e=>{
      const sp=e.sourceEndpoint(),tp=e.targetEndpoint();
      ctx.strokeStyle=e.data("kind")==="LOOKUP"?"#60a5fa":"#34d399";
      ctx.lineWidth=0.5;ctx.beginPath();
      ctx.moveTo((sp.x-bb.x1)*s+ox,(sp.y-bb.y1)*s+oy);
      ctx.lineTo((tp.x-bb.x1)*s+ox,(tp.y-bb.y1)*s+oy);
      ctx.stroke();
    });
    cy.nodes().forEach(n=>{
      const p=n.position();
      ctx.fillStyle=n.hasClass("path-node")?"#f472b6":n.hasClass("highlighted")?"#fbbf24":"#5eead4";
      ctx.globalAlpha=n.hasClass("dimmed")?0.15:0.8;
      ctx.fillRect((p.x-bb.x1)*s+ox-2,(p.y-bb.y1)*s+oy-2,4,4);
      ctx.globalAlpha=1;
    });
    // viewport rect
    const ext=cy.extent();
    ctx.strokeStyle="#fff";ctx.lineWidth=1;ctx.globalAlpha=0.5;
    ctx.strokeRect((ext.x1-bb.x1)*s+ox,(ext.y1-bb.y1)*s+oy,(ext.x2-ext.x1)*s,(ext.y2-ext.y1)*s);
    ctx.globalAlpha=1;
  };
  minimapTimer=setInterval(render,500);
  render();
}

// ─── Command Palette ───
const commands=[
  {label:"全体表示 (Fit)",icon:"📐",action:fit,keys:"Ctrl+0"},
  {label:"自動配置 (Cose)",icon:"🔄",action:()=>setLayout("cose")},
  {label:"Grid レイアウト",icon:"⊞",action:()=>setLayout("grid")},
  {label:"Circle レイアウト",icon:"◯",action:()=>setLayout("circle")},
  {label:"Tree レイアウト",icon:"🌳",action:()=>setLayout("breadthfirst")},
  {label:"Concentric レイアウト",icon:"◎",action:()=>setLayout("concentric")},
  {label:"統計パネル",icon:"📊",action:toggleSidebar,keys:"Ctrl+B"},
  {label:"経路探索",icon:"🔍",action:togglePathFinder},
  {label:"ミニマップ",icon:"🗺",action:toggleMinimap},
  {label:"テーマ切替",icon:"🌓",action:toggleTheme},
  {label:"PNG エクスポート",icon:"🖼",action:exportPNG},
  {label:"SVG エクスポート",icon:"📄",action:exportSVG},
  {label:"Mermaid エクスポート",icon:"🧜",action:showMermaid},
  {label:"draw.io エクスポート",icon:"📊",action:showDrawio},
  {label:"SQL DDL エクスポート",icon:"🗄",action:showSQL},
  {label:"PlantUML エクスポート",icon:"🌱",action:showPlantUML},
  {label:"JSON Schema エクスポート",icon:"{}",action:showJSON},
  {label:"ハイライト解除",icon:"✨",action:()=>{cy.elements().removeClass("highlighted dimmed path-node path-edge");document.getElementById("search-box").value="";}},
];

// Add app-focus commands
APPS.forEach(a=>{
  commands.push({label:"アプリ: "+a.name+" (ID:"+a.id+")",icon:"📱",action:()=>focusApp(a.id)});
});

function openCmd(){
  document.getElementById("cmd-overlay").classList.add("open");
  const inp=document.getElementById("cmd-input");inp.value="";inp.focus();
  filterCmd("");
}
function closeCmd(){document.getElementById("cmd-overlay").classList.remove("open");}

function filterCmd(q){
  const low=q.toLowerCase();
  const filtered=q?commands.filter(c=>c.label.toLowerCase().includes(low)):commands.slice(0,12);
  const box=document.getElementById("cmd-results");
  box.innerHTML=filtered.map((c,i)=>
    '<div class="cmd-item'+(i===0?" active":"")+'" onclick="runCmd('+commands.indexOf(c)+')"><span>'+c.icon+'</span><span>'+c.label+'</span>'+(c.keys?'<span class="kbd">'+c.keys+'</span>':'')+'</div>'
  ).join("");
}

function runCmd(idx){commands[idx].action();closeCmd();}

// ─── Keyboard Shortcuts ───
document.addEventListener("keydown",e=>{
  if(e.key==="k"&&(e.ctrlKey||e.metaKey)){e.preventDefault();openCmd();}
  if(e.key==="b"&&(e.ctrlKey||e.metaKey)){e.preventDefault();toggleSidebar();}
  if(e.key==="f"&&(e.ctrlKey||e.metaKey)){e.preventDefault();document.getElementById("search-box").focus();}
  if(e.key==="0"&&(e.ctrlKey||e.metaKey)){e.preventDefault();fit();}
  if(e.key==="Escape"){closeCmd();closeDetail();closeModal();}
  // cmd palette navigation
  if(document.getElementById("cmd-overlay").classList.contains("open")){
    const items=[...document.querySelectorAll(".cmd-item")];
    const ai=items.findIndex(i=>i.classList.contains("active"));
    if(e.key==="ArrowDown"){e.preventDefault();items[ai]?.classList.remove("active");items[Math.min(ai+1,items.length-1)]?.classList.add("active");}
    if(e.key==="ArrowUp"){e.preventDefault();items[ai]?.classList.remove("active");items[Math.max(ai-1,0)]?.classList.add("active");}
    if(e.key==="Enter"){e.preventDefault();items[ai]?.click();}
  }
});

// ─── Exports ───
function exportPNG(){
  const a=document.createElement("a");
  a.href=cy.png({bg:isDark?"#08090d":"#f0f2f5",full:true,scale:2});
  a.download="kintone_erd.png";a.click();toast("PNG ダウンロード");
}
function exportSVG(){
  const blob=new Blob([cy.svg({full:true,bg:isDark?"#08090d":"#f0f2f5"})],{type:"image/svg+xml"});
  const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="kintone_erd.svg";a.click();toast("SVG ダウンロード");
}

let _md={text:"",filename:""};
function openModal(t,text,fn){_md={text,filename:fn};document.getElementById("modal-title").textContent=t;document.getElementById("modal-content").textContent=text;document.getElementById("modal-overlay").classList.add("open");}
function closeModal(){document.getElementById("modal-overlay").classList.remove("open");}
function copyModal(){navigator.clipboard.writeText(_md.text).then(()=>toast("コピーしました！"));}
function downloadModal(){const b=new Blob([_md.text],{type:"text/plain"});const a=document.createElement("a");a.href=URL.createObjectURL(b);a.download=_md.filename;a.click();toast("ダウンロード: "+_md.filename);}

// safe name helper
const sn=s=>s.replace(/[^a-zA-Z0-9_\\u3000-\\u9FFF\\uF900-\\uFAFF]/g,"_").replace(/^_+|_+$/g,"")||"unnamed";

function showMermaid(){
  let m="erDiagram\\n";
  APPS.forEach(a=>{
    const n=sn(a.name);
    m+="  "+n+" {\\n";
    a.fields.forEach(f=>{
      if(f.type==="SUBTABLE") return;
      let com=""; if(f.isPK) com=" PK"; else if(f.isLookup) com=" FK";
      m+="    "+f.type.replace(/[^a-zA-Z0-9_]/g,"")+" "+sn(f.code)+com+"\\n";
    });
    m+="  }\\n";
  });
  APPS.forEach(a=>{
    a.relations.forEach(r=>{
      const t=appMap.get(r.toApp); if(!t) return;
      m+="  "+sn(a.name)+(r.kind==="LOOKUP"?" }o--|| ":" ||--o{ ")+sn(t.name)+' : "'+r.fromLabel+'"\\n';
    });
  });
  openModal("Mermaid ER Diagram",m,"kintone_erd.mmd");
}

function showDrawio(){
  const esc=s=>s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
  let x='<mxfile host="app.diagrams.net"><diagram name="ER"><mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/>';
  APPS.forEach((a,i)=>{
    const nid="A"+a.id,col=4,px=i%col*600,py=Math.floor(i/col)*400,h=30+a.fields.length*26;
    x+='<mxCell id="'+nid+'" value="'+esc(a.name)+'" style="shape=table;startSize=30;container=1;childLayout=tableLayout;fillColor=#DDA0DD;rounded=1;" vertex="1" parent="1"><mxGeometry x="'+px+'" y="'+py+'" width="280" height="'+h+'" as="geometry"/></mxCell>';
    a.fields.forEach((f,fi)=>{
      let c="#FFF";if(f.isPK)c="#FFD700";else if(f.isLookup)c="#87CEFA";else if(f.isRef)c="#98FB98";else if(f.inSubtable)c="#F5F5F5";else if(f.required)c="#FFF0F5";
      let l=(f.isPK?"🔑 ":f.isLookup?"🔗 ":f.isRef?"📋 ":"")+(f.label||f.code)+" ["+f.code+"]";
      x+='<mxCell id="'+nid+"_F"+fi+'" value="'+esc(l)+'" style="shape=partialRectangle;fillColor='+c+';align=left;spacingLeft=6;strokeColor=#d0d0d0;" vertex="1" parent="'+nid+'"><mxGeometry width="280" height="26" as="geometry"/></mxCell>';
    });
  });
  let ec=0;
  APPS.forEach(a=>a.relations.forEach(r=>{
    if(!appMap.has(r.toApp)) return;
    const st=r.kind==="LOOKUP"?"edgeStyle=orthogonalEdgeStyle;rounded=1;endArrow=classic;startArrow=oval;strokeColor=#0066CC;strokeWidth=2;":"edgeStyle=orthogonalEdgeStyle;rounded=1;endArrow=classic;startArrow=diamond;dashed=1;strokeColor=#2E8B57;strokeWidth=2;";
    x+='<mxCell id="E'+(ec++)+'" value="'+(r.kind==="LOOKUP"?"Lookup":"Related")+'" style="'+st+'" edge="1" parent="1" source="A'+a.id+'" target="A'+r.toApp+'"><mxGeometry relative="1" as="geometry"/></mxCell>';
  }));
  x+="</root></mxGraphModel></diagram></mxfile>";
  openModal("draw.io XML",x,"kintone_erd.drawio");
}

function showSQL(){
  let sql="-- Kintone ER Diagram → SQL DDL\\n-- Generated: "+new Date().toISOString()+"\\n\\n";
  const typeMap={SINGLE_LINE_TEXT:"VARCHAR(256)",MULTI_LINE_TEXT:"TEXT",NUMBER:"DECIMAL(18,4)",CALC:"DECIMAL(18,4)",
    RICH_TEXT:"TEXT",CHECK_BOX:"TEXT",RADIO_BUTTON:"VARCHAR(128)",DROP_DOWN:"VARCHAR(128)",MULTI_SELECT:"TEXT",
    DATE:"DATE",TIME:"TIME",DATETIME:"DATETIME",LINK:"VARCHAR(512)",FILE:"TEXT",
    USER_SELECT:"TEXT",ORGANIZATION_SELECT:"TEXT",GROUP_SELECT:"TEXT",
    RECORD_NUMBER:"INT AUTO_INCREMENT",CREATOR:"VARCHAR(128)",MODIFIER:"VARCHAR(128)",
    CREATED_TIME:"DATETIME",UPDATED_TIME:"DATETIME",STATUS:"VARCHAR(64)",
    STATUS_ASSIGNEE:"TEXT",CATEGORY:"TEXT",LOOKUP:"VARCHAR(256)",REFERENCE_TABLE:"-- ref"};

  APPS.forEach(a=>{
    const tbl=sn(a.name);
    sql+="CREATE TABLE "+tbl+" (\\n";
    const cols=[];
    a.fields.forEach(f=>{
      if(f.type==="SUBTABLE"||f.type==="REFERENCE_TABLE") return;
      const col=sn(f.code);
      const dt=typeMap[f.type]||"TEXT";
      if(dt.startsWith("--")) return;
      let line="  "+col+" "+dt;
      if(f.isPK) line+=" PRIMARY KEY";
      else if(f.required) line+=" NOT NULL";
      cols.push(line);
    });
    sql+=cols.join(",\\n")+"\\n);\\n\\n";
  });

  // Foreign keys
  APPS.forEach(a=>{
    a.relations.filter(r=>r.kind==="LOOKUP"&&appMap.has(r.toApp)).forEach(r=>{
      const t=appMap.get(r.toApp);
      sql+="ALTER TABLE "+sn(a.name)+" ADD CONSTRAINT fk_"+sn(a.name)+"_"+sn(r.from)+" FOREIGN KEY ("+sn(r.from)+") REFERENCES "+sn(t.name)+"("+sn(r.toField)+");\\n";
    });
  });
  openModal("SQL DDL",sql,"kintone_erd.sql");
}

function showPlantUML(){
  let p="@startuml\\n!theme cerulean\\nskinparam linetype ortho\\n\\n";
  APPS.forEach(a=>{
    const n=sn(a.name);
    p+="entity "+n+" {\\n";
    a.fields.forEach(f=>{
      if(f.type==="SUBTABLE"||f.type==="REFERENCE_TABLE") return;
      let prefix="  ";
      if(f.isPK) prefix="  * ";
      else if(f.isLookup) prefix="  # ";
      p+=prefix+sn(f.code)+" : "+f.type+(f.required?" <<required>>":"")+"\\n";
      if(f.isPK) p+="  --\\n";
    });
    p+="}\\n\\n";
  });
  APPS.forEach(a=>{
    a.relations.forEach(r=>{
      const t=appMap.get(r.toApp); if(!t) return;
      if(r.kind==="LOOKUP") p+=sn(a.name)+' }o--|| '+sn(t.name)+' : "'+r.fromLabel+'"\\n';
      else p+=sn(a.name)+' ||--o{ '+sn(t.name)+' : "'+r.fromLabel+'"\\n';
    });
  });
  p+="@enduml";
  openModal("PlantUML",p,"kintone_erd.puml");
}

function showJSON(){
  const schema={
    $schema:"https://json-schema.org/draft/2020-12/schema",
    title:"Kintone ER Schema",
    generated:new Date().toISOString(),
    apps:APPS.map(a=>({
      id:a.id,name:a.name,
      fields:a.fields.map(f=>({code:f.code,label:f.label,type:f.type,required:f.required||false,isPrimaryKey:f.isPK||false,isLookup:f.isLookup||false,isRelatedRecord:f.isRef||false,inSubtable:f.inSubtable||false})),
      relations:a.relations.map(r=>({fromField:r.from,toApp:r.toApp,toField:r.toField,type:r.kind})),
    })),
  };
  openModal("JSON Schema",JSON.stringify(schema,null,2),"kintone_erd_schema.json");
}

// ─── Double-click to isolate ───
cy.on("dbltap","node",e=>{
  const n=e.target;
  const neighborhood=n.closedNeighborhood();
  cy.elements().addClass("dimmed");
  neighborhood.removeClass("dimmed").addClass("highlighted");
  toast("ダブルクリック: 接続アプリのみ表示（背景クリックで解除）");
});

// ─── Hover tooltip ───
let tipEl;
cy.on("mouseover","node",e=>{
  const app=appMap.get(e.target.data("appId"));
  if(!app) return;
  if(!tipEl){tipEl=document.createElement("div");Object.assign(tipEl.style,{position:"fixed",zIndex:"999",background:"var(--surface)",border:"1px solid var(--border)",borderRadius:"8px",padding:"8px 12px",fontSize:"11px",fontFamily:"'DM Mono',monospace",pointerEvents:"none",boxShadow:"0 4px 16px rgba(0,0,0,0.3)",maxWidth:"260px"});document.body.appendChild(tipEl);}
  tipEl.innerHTML="<b>"+app.name+"</b> (ID:"+app.id+")<br>Fields: "+app.fields.length+" | Relations: "+app.relations.length;
  tipEl.style.display="block";
});
cy.on("mouseout","node",()=>{if(tipEl) tipEl.style.display="none";});
cy.on("mousemove",e=>{if(tipEl&&tipEl.style.display==="block"){tipEl.style.left=(e.originalEvent.clientX+14)+"px";tipEl.style.top=(e.originalEvent.clientY+14)+"px";}});
<\/script>
</body>
</html>`;
    };


    runGenerateERDiagram = async function () {
      const app = document.getElementById('u_sourceApp').value.trim();
      if (!app) throw new Error('Source App ID を入力してください');
      setStatus('ER図の解析を開始します...');

      try {
        const apps = await crawl(Number(app));
        setStatus('HTML生成中...');
        const html = buildHTML(apps);
        const blob = new Blob([html], { type: "text/html" });
        window.open(URL.createObjectURL(blob), "_blank");
        setStatus('ER図の生成完了（別タブで開きました）');
      } catch (e) {
        throw e;
      }
    }

  })();

  async function loadViewsForSelect(selectId, inputId) {
    const tApp = document.getElementById('u_targetApp').value.trim();
    if (!tApp) throw new Error('Target App IDを設定してください。');
    const uConfig = getEnvConfig(false);
    const url = buildApiPrefix(false) + '/app/views.json';
    const resp = await apiGet(url, { app: tApp }, uConfig);
    const views = Object.entries(resp.views)
      .map(([name, v]) => ({ name, ...v }))
      .filter(v => v.type === 'LIST')
      .sort((a, b) => Number(a.index) - Number(b.index));

    const sel = document.getElementById(selectId);
    if (!sel) return;
    sel.innerHTML = '<option value="">-- 一覧を選択 --</option>';
    for (const v of views) {
      const opt = document.createElement('option');
      opt.value = v.id;
      opt.dataset.q = encodeURIComponent(v.filterCond || '');
      opt.textContent = v.name;
      sel.appendChild(opt);
    }
    sel.style.display = 'block';
    sel.onchange = () => {
      const o = sel.options[sel.selectedIndex];
      if (o && o.value) {
        document.getElementById(inputId).value = decodeURIComponent(o.dataset.q || '');
      }
    };
    setStatus('Target Appの一覧リストを取得しました');
  }

  async function getRecordIdsByQuery(app, query, isSource) {
    const uConfig = getEnvConfig(isSource);
    const prefix = buildApiPrefix(isSource);
    const ids = [];
    let offset = 0;
    while (true) {
      let q = query ? `${query} ` : '';
      q += `order by $id asc limit 500 offset ${offset}`;
      const url = prefix + '/records.json';
      const resp = await apiGet(url, { app, query: q, fields: ['$id'] }, uConfig);
      const records = resp.records || [];
      if (records.length === 0) break;
      records.forEach(r => ids.push(Number(r.$id.value)));
      if (records.length < 500) break;
      offset += 500;
    }
    return ids;
  }

  async function getFullRecordsByQuery(app, query, isSource) {
    const uConfig = getEnvConfig(isSource);
    const prefix = buildApiPrefix(isSource);
    let allRecords = [];
    let offset = 0;
    while (true) {
      let q = query ? `${query} ` : '';
      q += `limit 500 offset ${offset}`;
      const url = prefix + '/records.json';
      const resp = await apiGet(url, { app, query: q }, uConfig);
      const records = resp.records || [];
      if (records.length === 0) break;
      allRecords = allRecords.concat(records);
      if (records.length < 500) break;
      offset += 500;
    }
    return allRecords;
  }

  const chunkArray = (arr, size) => {
    const out = [];
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out;
  };

  async function runBatchProcess() {
    const tApp = document.getElementById('u_targetApp').value.trim();
    if (!tApp) throw new Error('Target App IDを設定してください。');
    const query = document.getElementById('u_batchProcView').value;
    const action = document.getElementById('u_batchProcAction').value.trim();
    const assignee = document.getElementById('u_batchProcAssignee').value.trim() || null;
    if (!action) throw new Error('アクション名を入力してください。');

    setStatus('対象レコードを取得中...');
    const ids = await getRecordIdsByQuery(tApp, query, false);
    if (ids.length === 0) throw new Error('処理対象のレコードが0件です。');

    if (!confirm(`${ids.length}件のレコードにアクション「${action}」を実行します。よろしいですか？`)) return;

    setStatus('ステータス一括更新を開始...');
    const uConfig = getEnvConfig(false);
    const url = buildApiPrefix(false) + '/records/status.json';
    const batches = chunkArray(ids, 100);

    let okCount = 0;
    for (let i = 0; i < batches.length; i++) {
      const batchIds = batches[i];
      const body = {
        app: tApp,
        records: batchIds.map(id => {
          let r = { id, action };
          if (assignee) r.assignee = assignee;
          return r;
        })
      };
      await apiPut(url, body, uConfig);
      okCount += batchIds.length;
      setStatus(`進捗: ${okCount}/${ids.length}件 完了...`);
      await new Promise(r => setTimeout(r, 150));
    }
    setStatus(`ステータス一括更新が完了しました（全${okCount}件）`, false);
  }

  // --- JSZip ---
  async function loadJSZip() {
    if (typeof JSZip !== 'undefined') return;
    setStatus('JSZipを動的ロード中...');
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js";
      script.onload = () => { setStatus('JSZipのロード完了'); resolve(); };
      script.onerror = () => { reject(new Error('JSZipの読み込みに失敗しました')); };
      document.head.appendChild(script);
    });
  }

  async function downloadTargetFile(fileKey) {
    const uConfig = getEnvConfig(false);
    const prefix = buildApiPrefix(false);
    const url = prefix + '/file.json?fileKey=' + fileKey;
    let headers = { 'X-Requested-With': 'XMLHttpRequest' };
    if (uConfig.headers) headers = { ...headers, ...uConfig.headers };

    const resp = await fetch(url, { method: 'GET', headers });
    if (resp.status === 403) return null;
    return await resp.blob();
  }

  async function runBatchFileDownload() {
    const tApp = document.getElementById('u_targetApp').value.trim();
    if (!tApp) throw new Error('Target App IDを設定してください。');
    const query = document.getElementById('u_batchDlView').value;
    const fileCode = document.getElementById('u_batchDlFileCode').value.trim();
    const folderCode = document.getElementById('u_batchDlFolderCode').value.trim();
    const zipName = document.getElementById('u_batchDlZipName').value.trim() || 'download.zip';

    if (!fileCode) throw new Error('ファイルフィールドコードを入力してください。');

    setStatus('対象レコードを取得中...');
    const records = await getFullRecordsByQuery(tApp, query, false);
    if (records.length === 0) throw new Error('処理対象のレコードが0件です。');

    await loadJSZip();

    const zip = new JSZip();
    let fileCount = 0;

    for (let i = 0; i < records.length; i++) {
      const rec = records[i];
      setStatus(`ファイルダウンロード中 (レコード ${i + 1}/${records.length})...`);

      const fileList = rec[fileCode]?.value || [];
      if (fileList.length > 0) {
        let folderName = folderCode && rec[folderCode] ? rec[folderCode].value : '';
        if (!folderName) folderName = `Record_${rec.$id.value}`;

        const recordFolder = zip.folder(folderName);
        for (const f of fileList) {
          const blob = await downloadTargetFile(f.fileKey);
          if (blob) {
            recordFolder.file(f.name, blob);
            fileCount++;
          }
        }
      }
    }

    if (fileCount === 0) {
      setStatus('ダウンロード対象が見つかりませんでした。', true);
      return;
    }

    setStatus(`ZIP圧縮中 (計${fileCount}ファイル)...`);
    const zipBlob = await zip.generateAsync({ type: "blob" });
    const a = document.createElement("a");
    const u = URL.createObjectURL(zipBlob);
    a.href = u;
    a.download = zipName;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(u); }, 100);
    setStatus(`添付ファイル一括DL完了 (${fileCount}ファイル)`, true);
  }

  async function getAllAppsInSpace(isSource) {
    const uConfig = getEnvConfig(isSource);
    const prefix = buildApiPrefix(isSource);
    let allApps = [];
    let offset = 0;
    while (true) {
      const url = prefix + '/apps.json';
      const resp = await apiGet(url, { limit: 100, offset }, uConfig);
      const apps = resp.apps || [];
      allApps = allApps.concat(apps);
      if (apps.length < 100) break;
      offset += 100;
      await new Promise(r => setTimeout(r, 200));
    }
    return allApps;
  }

  async function downloadBlobWithRetry(fileKey, isSource, guestSpaceId) {
    let prefix = buildApiPrefix(isSource);
    if (guestSpaceId) {
      prefix = `/k/guest/${guestSpaceId}/v1`;
    }
    const url = prefix + '/file.json?fileKey=' + fileKey;
    const uConfig = getEnvConfig(isSource);
    let headers = { 'X-Requested-With': 'XMLHttpRequest' };
    if (uConfig.headers) headers = { ...headers, ...uConfig.headers };

    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const resp = await fetch(url, { method: 'GET', headers });
        if (resp.status === 403) return null;
        if (!resp.ok) throw new Error('Download failed: ' + resp.status);
        return await resp.blob();
      } catch (e) {
        console.warn('File download failed, retrying...', e);
        await new Promise(r => setTimeout(r, 500));
      }
    }
    return null;
  }

  async function runBatchJsConfigDownload() {
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
    await loadJSZip();
    const zip = new JSZip();
    let hasFiles = false;
    let failedCount = 0;

    const uConfig = getEnvConfig(false);

    for (let i = 0; i < uniqueApps.length; i++) {
      const app = uniqueApps[i];
      const { appId, name, spaceId } = app;
      const safeName = name.replace(/[\\/:*?"<>|]/g, '_');
      const guestSpaceId = spaceId ? parseInt(spaceId, 10) : null;

      setStatus(`[${i + 1}/${uniqueApps.length}] アプリ "${safeName}" (${appId}) をチェック...`);

      let customize = null;
      try {
        let prefix = buildApiPrefix(false);
        if (guestSpaceId && uConfig.domain && uConfig.domain.includes('/k/guest/')) {
        } else if (guestSpaceId) {
          prefix = `/k/guest/${guestSpaceId}/v1`;
        }
        const url = prefix + '/app/customize.json';
        customize = await apiGet(url, { app: appId }, uConfig);
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
    const a = document.createElement("a");
    const u = URL.createObjectURL(zipBlob);
    a.href = u;
    a.download = "customize_scripts.zip";
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(u); }, 100);

    setStatus(`カスタマイズJS一括DL完了 (403スキップ: ${failedCount}件)`, true);
  }

  setStatus('起動完了');
})();
