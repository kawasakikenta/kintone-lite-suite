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
    { key: 'appAcl', label: 'アプリ権限', endpoint: '/app/acl.json', put: true, putBuilder: (d) => ({ rights: d.rights || d }) },
    { key: 'fieldAcl', label: 'フィールド権限', endpoint: '/field/acl.json', put: true, putBuilder: (d) => ({ rights: d.rights || d }) },
    { key: 'recordPermissions', label: 'レコード権限', endpoint: '/record/acl.json', put: true, putBuilder: (d) => ({ rights: d.rights || d }) },
    { key: 'notifications', label: '通知設定', endpoint: '/app/notifications/general.json', put: true, putBuilder: (d) => ({ notifications: d.notifications || d }) },
    { key: 'perRecordNotifications', label: 'レコード条件通知', endpoint: '/app/notifications/perRecord.json', put: true, putBuilder: (d) => ({ notifications: d.notifications || d }) },
    { key: 'reminderNotifications', label: 'リマインダー通知', endpoint: '/app/notifications/reminder.json', put: true, putBuilder: (d) => ({ notifications: d.notifications || d }) },
    { key: 'categories', label: 'カテゴリ設定', endpoint: '/app/categories.json', put: true, putBuilder: (d) => ({ categories: d.categories || d }) }
  ];
  const SETTINGS_EXPORT_SCOPE_DEFS = SECTION_DEFS.filter((s) => s.key !== 'customizeSettings');

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
    lastDiffSignature: '',
    lastApplyPlan: null,
    diffViewTheme: 'light',
    diffCollapsedSections: new Set(),
    diffSectionVisibleCounts: {},
    reflectRows: [],
    reflectSelectedIds: new Set(),
    reflectNodeModes: {},
    reflectUndoStack: [],
    reflectRedoStack: [],
    reflectActiveSidebarSection: null,
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

  function safeJsonForScript(v) {
    return JSON.stringify(v)
      .replace(/</g, '\\u003c')
      .replace(/\u2028/g, '\\u2028')
      .replace(/\u2029/g, '\\u2029');
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

  function compactForLog(value, max = 220) {
    try {
      const raw = typeof value === 'string' ? value : JSON.stringify(value);
      if (!raw) return '';
      return raw.length > max ? `${raw.slice(0, max)}...` : raw;
    } catch {
      const raw = String(value ?? '');
      return raw.length > max ? `${raw.slice(0, max)}...` : raw;
    }
  }

  function apiErrorWithContext(err, meta) {
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

  function downloadBlob(filename, blob) {
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
    throw apiErrorWithContext(err, { method: 'GET', prefix, path, payload: params });
  }

  async function apiPut(prefix, path, body) {
    try {
      return await kintone.api(`${prefix}${path}`, 'PUT', body);
    } catch (e) {
      throw apiErrorWithContext(e, { method: 'PUT', prefix, path, payload: body });
    }
  }

  async function apiPost(prefix, path, body) {
    try {
      return await kintone.api(`${prefix}${path}`, 'POST', body);
    } catch (e) {
      throw apiErrorWithContext(e, { method: 'POST', prefix, path, payload: body });
    }
  }

  async function apiDelete(prefix, path, body) {
    try {
      return await kintone.api(`${prefix}${path}`, 'DELETE', body);
    } catch (e) {
      throw apiErrorWithContext(e, { method: 'DELETE', prefix, path, payload: body });
    }
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
    throw apiErrorWithContext(err, { method, prefix, path, payload: body });
  }

  const HIGH_IMPACT_SECTIONS = new Set([
    'fieldSettings',
    'processSettings',
    'actionSettings',
    'appAcl',
    'fieldAcl',
    'recordPermissions'
  ]);
  const MEDIUM_IMPACT_SECTIONS = new Set([
    'layoutSettings',
    'viewSettings',
    'reportSettings',
    'customizeSettings',
    'notifications',
    'perRecordNotifications',
    'reminderNotifications',
    'categories'
  ]);

  function detectRowSeverity(row) {
    const sec = row?.sectionKey || '';
    const path = String(row?.path || '').toLowerCase();
    if (row?.type === 'removed') return 'high';
    if (HIGH_IMPACT_SECTIONS.has(sec)) return 'high';
    if (path.includes('lookup') || path.includes('relatedapp') || path.includes('condition')) return 'high';
    if (MEDIUM_IMPACT_SECTIONS.has(sec)) return 'medium';
    return 'low';
  }

  function summarizeSeverity(rows) {
    const out = { high: 0, medium: 0, low: 0 };
    (rows || []).forEach((r) => {
      const sev = r?.severity || 'low';
      if (sev === 'high') out.high += 1;
      else if (sev === 'medium') out.medium += 1;
      else out.low += 1;
    });
    return out;
  }

  const IGNORE_PRESET_KEYS = {
    fieldOrder: ['index', 'no', 'order'],
    meta: ['revision', 'createdAt', 'creator', 'modifiedAt', 'modifier', 'updatedAt', 'updatedBy'],
    labelName: ['name', 'label']
  };

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

  function bundleMatchesParams(bundle, params) {
    if (!bundle || !params) return false;
    return (
      String(bundle.appId || '') === String(params.appId || '').trim()
      && String(bundle.guestId || '') === String(params.guestId || '').trim()
      && !!bundle.preview === !!params.preview
    );
  }

  function bundleHasSections(bundle, sections) {
    if (!bundle || !bundle.sections) return false;
    return (sections || []).every((sec) => Object.prototype.hasOwnProperty.call(bundle.sections, sec));
  }

  async function resolveBundle(side, params, sections, onProgress) {
    if (side === 'source' && state.importedSourceBundle) return pickBundleSections(state.importedSourceBundle, sections);
    if (side === 'target' && state.importedTargetBundle) return pickBundleSections(state.importedTargetBundle, sections);
    const cached = side === 'source' ? state.lastSourceBundle : state.lastTargetBundle;
    if (bundleMatchesParams(cached, params) && bundleHasSections(cached, sections)) {
      if (onProgress) onProgress(1, 'cache');
      return pickBundleSections(cached, sections);
    }
    return fetchBundle({ ...params, sections, onProgress });
  }

  const ARRAY_DIFF_LIMIT = 1000;
  const ARRAY_LCS_MAX_CELLS = 60000;
  const LINE_DIFF_MAX_CELLS = 90000;
  const CHAR_DIFF_MAX_CELLS = 20000;
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
  const DEFAULT_IGNORE_KEYS = new Set([
    'id',
    'appid',
    'revision',
    'createdat',
    'creator',
    'modifiedat',
    'modifier'
  ]);

  function isPlainObject(v) {
    return !!v && typeof v === 'object' && !Array.isArray(v);
  }

  function getPathLeafKey(path) {
    const m = String(path || '').match(/([^[.\]]+)(?:\[\d+\])?$/);
    return m ? m[1] : '';
  }

  function normalizeIgnoreToken(token) {
    return String(token || '')
      .replace(/[\u200b\u200c\u200d\ufeff]/g, '')
      .replace(/^[\s\u3000]+|[\s\u3000]+$/g, '')
      .toLowerCase();
  }

  function parseIgnoreRules(text) {
    const keySet = new Set(DEFAULT_IGNORE_KEYS);
    const pathSet = new Set();
    String(text || '')
      .split(/[\n\r,、，;；\s\u3000]+/)
      .map(normalizeIgnoreToken)
      .filter(Boolean)
      .forEach((token) => {
        if (token.includes('.') || token.includes('[')) pathSet.add(token.replace(/\s+/g, ''));
        else keySet.add(token);
      });
    return { keySet, pathSet };
  }

  function isIgnoredKey(ignoreRules, key) {
    const normalized = normalizeIgnoreToken(key);
    return !!normalized && ignoreRules.keySet.has(normalized);
  }

  function isIgnoredPath(ignoreRules, path) {
    const normalizedPath = normalizeIgnoreToken(path).replace(/\s+/g, '');
    if (!normalizedPath) return false;
    if (ignoreRules.pathSet.has(normalizedPath)) return true;
    const leaf = getPathLeafKey(normalizedPath);
    return !!leaf && ignoreRules.keySet.has(leaf);
  }

  function pushDiffRow(out, row, ignoreRules) {
    if (!row || out.length >= ARRAY_DIFF_LIMIT) return false;
    if (isIgnoredPath(ignoreRules, row.path)) return false;
    out.push(row);
    return true;
  }

  function normalizeForCompare(v, ignoreRules) {
    if (Array.isArray(v)) return v.map((x) => normalizeForCompare(x, ignoreRules));
    if (v && typeof v === 'object') {
      const o = {};
      Object.keys(v).sort().forEach((k) => {
        if (META_KEYS.has(k) || isIgnoredKey(ignoreRules, k)) return;
        o[k] = normalizeForCompare(v[k], ignoreRules);
      });
      return o;
    }
    return v;
  }

  function makeArrayItemSignature(v, ignoreRules) {
    return JSON.stringify(normalizeForCompare(v, ignoreRules));
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

  function detectArrayObjectKey(a, b, ignoreRules) {
    if (!a.length || !b.length) return null;
    if (!a.every(isPlainObject) || !b.every(isPlainObject)) return null;
    const firstA = a.find(isPlainObject) || {};
    const firstB = b.find(isPlainObject) || {};
    const fallback = Object.keys(firstA).filter((k) => Object.prototype.hasOwnProperty.call(firstB, k));
    const candidates = [...ARRAY_KEY_CANDIDATES, ...fallback.filter((k) => !ARRAY_KEY_CANDIDATES.includes(k))];
    for (const key of candidates) {
      if (isIgnoredKey(ignoreRules, key)) continue;
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

  function collectArrayDiffsByObjectKey(a, b, path, out, ignoreRules) {
    const key = detectArrayObjectKey(a, b, ignoreRules);
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
        pushDiffRow(out, {
          type: 'added',
          path: `${path}[${right.idx}]`,
          left: undefined,
          right: right.item,
          arrayKey: key,
          arrayKeyValue: right.item?.[key]
        }, ignoreRules);
        continue;
      }
      if (left && !right) {
        pushDiffRow(out, {
          type: 'removed',
          path: `${path}[${left.idx}]`,
          left: left.item,
          right: undefined,
          arrayKey: key,
          arrayKeyValue: left.item?.[key]
        }, ignoreRules);
        continue;
      }
      if (!left || !right) continue;

      const leftSig = makeArrayItemSignature(left.item, ignoreRules);
      const rightSig = makeArrayItemSignature(right.item, ignoreRules);
      if (leftSig === rightSig) {
        if (left.idx !== right.idx) {
          pushDiffRow(out, {
            type: 'changed',
            path: `${path}[${right.idx}]`,
            left: left.item,
            right: right.item,
            moved: true,
            movedFrom: left.idx,
            movedTo: right.idx,
            arrayKey: key,
            arrayKeyValue: right.item?.[key]
          }, ignoreRules);
        }
        continue;
      }
      const start = out.length;
      collectDeepDiffs(left.item, right.item, `${path}[${right.idx}]`, out, ignoreRules);
      const keyVal = right.item?.[key] != null ? right.item[key] : left.item?.[key];
      for (let oi = start; oi < out.length; oi++) {
        if (!out[oi].arrayKey) out[oi].arrayKey = key;
        if (out[oi].arrayKeyValue === undefined) out[oi].arrayKeyValue = keyVal;
      }
      if (out.length >= ARRAY_DIFF_LIMIT) return true;
    }
    return true;
  }

  function collectArrayDiffsByLcs(a, b, path, out, ignoreRules) {
    const n = a.length;
    const m = b.length;
    if (!n && !m) return true;
    if (!n) {
      for (let j = 0; j < m; j++) {
        if (out.length >= ARRAY_DIFF_LIMIT) return true;
        pushDiffRow(out, { type: 'added', path: `${path}[${j}]`, left: undefined, right: b[j] }, ignoreRules);
      }
      return true;
    }
    if (!m) {
      for (let i = 0; i < n; i++) {
        if (out.length >= ARRAY_DIFF_LIMIT) return true;
        pushDiffRow(out, { type: 'removed', path: `${path}[${i}]`, left: a[i], right: undefined }, ignoreRules);
      }
      return true;
    }

    if (n * m > ARRAY_LCS_MAX_CELLS) return false;
    const sigA = a.map((x) => makeArrayItemSignature(x, ignoreRules));
    const sigB = b.map((x) => makeArrayItemSignature(x, ignoreRules));

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
          collectDeepDiffs(a[i], b[j], `${path}[${j}]`, out, ignoreRules);
          i += 1;
          j += 1;
          continue;
        }
      }
      const down = i < n ? dp[i + 1][j] : -1;
      const right = j < m ? dp[i][j + 1] : -1;
      if (j < m && (i >= n || right >= down)) {
        pushDiffRow(out, { type: 'added', path: `${path}[${j}]`, left: undefined, right: b[j] }, ignoreRules);
        j += 1;
      } else if (i < n) {
        pushDiffRow(out, { type: 'removed', path: `${path}[${i}]`, left: a[i], right: undefined }, ignoreRules);
        i += 1;
      } else {
        break;
      }
    }
    return true;
  }

  function collectArrayDiffs(a, b, path, out, ignoreRules) {
    if (collectArrayDiffsByObjectKey(a, b, path, out, ignoreRules)) return;
    if (collectArrayDiffsByLcs(a, b, path, out, ignoreRules)) return;
    const max = Math.max(a.length, b.length);
    for (let i = 0; i < max; i++) {
      if (out.length >= ARRAY_DIFF_LIMIT) return;
      const p = `${path}[${i}]`;
      if (i >= a.length) pushDiffRow(out, { type: 'added', path: p, left: undefined, right: b[i] }, ignoreRules);
      else if (i >= b.length) pushDiffRow(out, { type: 'removed', path: p, left: a[i], right: undefined }, ignoreRules);
      else collectDeepDiffs(a[i], b[i], p, out, ignoreRules);
    }
  }

  function collectDeepDiffs(a, b, path, out, ignoreRules) {
    if (out.length >= ARRAY_DIFF_LIMIT) return;
    if (isIgnoredPath(ignoreRules, path)) return;

    if (a === b) return;
    const ta = Object.prototype.toString.call(a);
    const tb = Object.prototype.toString.call(b);
    if (ta !== tb) {
      pushDiffRow(out, { type: 'changed', path, left: a, right: b }, ignoreRules);
      return;
    }

    if (a == null || b == null) {
      pushDiffRow(out, { type: 'changed', path, left: a, right: b }, ignoreRules);
      return;
    }

    if (Array.isArray(a)) {
      collectArrayDiffs(a, b, path, out, ignoreRules);
      return;
    }

    if (typeof a === 'object') {
      const keys = [...new Set([...Object.keys(a), ...Object.keys(b)])].sort();
      for (const k of keys) {
        if (META_KEYS.has(k) || isIgnoredKey(ignoreRules, k)) continue;
        const p = path ? `${path}.${k}` : k;
        if (!Object.prototype.hasOwnProperty.call(b, k)) pushDiffRow(out, { type: 'removed', path: p, left: a[k], right: undefined }, ignoreRules);
        else if (!Object.prototype.hasOwnProperty.call(a, k)) pushDiffRow(out, { type: 'added', path: p, left: undefined, right: b[k] }, ignoreRules);
        else collectDeepDiffs(a[k], b[k], p, out, ignoreRules);
        if (out.length >= ARRAY_DIFF_LIMIT) return;
      }
      return;
    }

    pushDiffRow(out, { type: 'changed', path, left: a, right: b }, ignoreRules);
  }

  function computeDiffRows(sourceBundle, targetBundle, sections, ignoreKeysText) {
    const ignoreRules = parseIgnoreRules(ignoreKeysText);
    const rows = [];
    for (const sec of sections) {
      const label = (SECTION_DEFS.find((x) => x.key === sec) || {}).label || sec;
      const s = sourceBundle.sections[sec];
      const t = targetBundle.sections[sec];

      if (!s && t) {
        pushDiffRow(rows, { sectionKey: sec, section: label, type: 'added', path: sec, left: undefined, right: t }, ignoreRules);
        continue;
      }
      if (s && !t) {
        pushDiffRow(rows, { sectionKey: sec, section: label, type: 'removed', path: sec, left: s, right: undefined }, ignoreRules);
        continue;
      }
      if (!s && !t) continue;

      if (stableStringify(s) === stableStringify(t)) continue;
      const start = rows.length;
      collectDeepDiffs(s, t, sec, rows, ignoreRules);
      for (let i = start; i < rows.length; i++) {
        if (!rows[i].section) rows[i].section = label;
        if (!rows[i].sectionKey) rows[i].sectionKey = sec;
        if (!rows[i].severity) rows[i].severity = detectRowSeverity(rows[i]);
      }
    }
    for (const row of rows) {
      if (!row.severity) row.severity = detectRowSeverity(row);
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
    lines.push(`- アプリID: ${bundle.appId}`);
    lines.push(`- ゲストスペースID: ${bundle.guestId || '(通常空間)'}`);
    lines.push(`- プレビュー取得: ${bundle.preview ? 'はい' : 'いいえ'}`);
    lines.push(`- 取得日時: ${bundle.fetchedAt}`);
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
    const summary = summarizeRows(rows || []);
    const sectionText = (scopes || []).map((k) => (SECTION_DEFS.find((d) => d.key === k)?.label || k)).join(', ');
    const sectionLabelMap = Object.fromEntries(SECTION_DEFS.map((d) => [d.key, d.label]));
    const MAX_EXPORT_ROWS = 2000;
    const exportRows = (rows || []).slice(0, MAX_EXPORT_ROWS);
    const reportMeta = {
      generatedAt: new Date().toISOString(),
      ignoreKeys: String(ignoreKeys || ''),
      scopes: scopes || [],
      sectionText,
      source: {
        appId: sourceBundle?.appId || '',
        guestId: sourceBundle?.guestId || '',
        preview: !!sourceBundle?.preview
      },
      target: {
        appId: targetBundle?.appId || '',
        guestId: targetBundle?.guestId || '',
        preview: !!targetBundle?.preview
      },
      summary,
      totalRows: (rows || []).length,
      renderedRows: exportRows.length,
      truncated: (rows || []).length > exportRows.length
    };

    const logicScript = `
(() => {
  const REPORT_ROWS = ${safeJsonForScript(exportRows)};
  const SECTION_LABEL_MAP = ${safeJsonForScript(sectionLabelMap)};
  const REPORT_META = ${safeJsonForScript(reportMeta)};
  const THEME_KEY = '${TOOL_ID}:diffReportTheme';
  const LINE_DIFF_MAX_CELLS = ${LINE_DIFF_MAX_CELLS};
  const CHAR_DIFF_MAX_CELLS = ${CHAR_DIFF_MAX_CELLS};
  const collapsed = new Set();

  function escHtml(v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function safeText(v) {
    if (v === undefined) return 'undefined';
    const out = JSON.stringify(v, null, 2);
    return out == null ? String(v) : out;
  }

  function rowMatches(row, keyword) {
    if (!keyword) return true;
    const text = [
      row.section || '',
      row.sectionKey || '',
      row.path || '',
      safeText(row.left),
      safeText(row.right)
    ].join('\\n').toLowerCase();
    return text.includes(keyword);
  }

  function buildLineDiffOps(leftLines, rightLines) {
    const n = leftLines.length;
    const m = rightLines.length;
    if (n * m > LINE_DIFF_MAX_CELLS) return null;
    const dp = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
    for (let i = n - 1; i >= 0; i--) {
      for (let j = m - 1; j >= 0; j--) {
        dp[i][j] = leftLines[i] === rightLines[j]
          ? dp[i + 1][j + 1] + 1
          : Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
    }
    const ops = [];
    let i = 0;
    let j = 0;
    while (i < n || j < m) {
      if (i < n && j < m && leftLines[i] === rightLines[j]) {
        ops.push({ type: 'same', left: leftLines[i], right: rightLines[j] });
        i += 1;
        j += 1;
        continue;
      }
      const down = i < n ? dp[i + 1][j] : -1;
      const right = j < m ? dp[i][j + 1] : -1;
      const diag = (i < n && j < m) ? dp[i + 1][j + 1] : -1;
      if (i < n && j < m && diag >= down && diag >= right) {
        ops.push({ type: 'replace', left: leftLines[i], right: rightLines[j] });
        i += 1;
        j += 1;
        continue;
      }
      if (j < m && (i >= n || right >= down)) {
        ops.push({ type: 'add', right: rightLines[j] });
        j += 1;
      } else if (i < n) {
        ops.push({ type: 'del', left: leftLines[i] });
        i += 1;
      } else {
        break;
      }
    }
    return ops;
  }

  function buildCharDiff(leftText, rightText) {
    const a = [...String(leftText || '')];
    const b = [...String(rightText || '')];
    if (!a.length || !b.length) return null;
    if (a.length * b.length > CHAR_DIFF_MAX_CELLS) return null;
    const dp = Array.from({ length: a.length + 1 }, () => new Uint16Array(b.length + 1));
    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        dp[i][j] = a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1] + 1
          : Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
    const ops = [];
    let i = a.length;
    let j = b.length;
    while (i > 0 || j > 0) {
      if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
        ops.push({ t: 'same', c: a[i - 1] });
        i -= 1;
        j -= 1;
      } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
        ops.push({ t: 'add', c: b[j - 1] });
        j -= 1;
      } else if (i > 0) {
        ops.push({ t: 'del', c: a[i - 1] });
        i -= 1;
      } else {
        break;
      }
    }
    ops.reverse();
    let left = '';
    let right = '';
    for (const op of ops) {
      if (op.t === 'same') {
        const c = escHtml(op.c);
        left += c;
        right += c;
      } else if (op.t === 'del') {
        left += '<mark class="cdel">' + escHtml(op.c) + '</mark>';
      } else {
        right += '<mark class="cadd">' + escHtml(op.c) + '</mark>';
      }
    }
    return { left, right };
  }

  function renderChangedCells(row, useCharDiff) {
    const leftText = safeText(row.left);
    const rightText = safeText(row.right);
    const leftLines = leftText.split('\\n');
    const rightLines = rightText.split('\\n');
    const ops = buildLineDiffOps(leftLines, rightLines);
    if (!ops) {
      return {
        left: '<pre class="blk del">' + escHtml(leftText) + '</pre>',
        right: '<pre class="blk add">' + escHtml(rightText) + '</pre>'
      };
    }

    let leftHtml = '';
    let rightHtml = '';
    let leftNo = 0;
    let rightNo = 0;
    for (const op of ops) {
      if (op.type === 'same') {
        leftNo += 1;
        rightNo += 1;
        leftHtml += '<div class="line"><span class="ln">' + leftNo + '</span>' + escHtml(op.left || '') + '</div>';
        rightHtml += '<div class="line"><span class="ln">' + rightNo + '</span>' + escHtml(op.right || '') + '</div>';
      } else if (op.type === 'replace') {
        leftNo += 1;
        rightNo += 1;
        const cd = useCharDiff ? buildCharDiff(op.left, op.right) : null;
        leftHtml += '<div class="line del"><span class="ln">' + leftNo + '</span>' + (cd ? cd.left : escHtml(op.left || '')) + '</div>';
        rightHtml += '<div class="line add"><span class="ln">' + rightNo + '</span>' + (cd ? cd.right : escHtml(op.right || '')) + '</div>';
      } else if (op.type === 'del') {
        leftNo += 1;
        leftHtml += '<div class="line del"><span class="ln">' + leftNo + '</span>' + escHtml(op.left || '') + '</div>';
        rightHtml += '<div class="line pad"><span class="ln"></span></div>';
      } else {
        rightNo += 1;
        leftHtml += '<div class="line pad"><span class="ln"></span></div>';
        rightHtml += '<div class="line add"><span class="ln">' + rightNo + '</span>' + escHtml(op.right || '') + '</div>';
      }
    }
    return {
      left: '<div class="scroll">' + leftHtml + '</div>',
      right: '<div class="scroll">' + rightHtml + '</div>'
    };
  }

  function renderRowCells(row, useCharDiff) {
    if (row.type === 'added') {
      return {
        left: '<pre class="blk empty">（なし）</pre>',
        right: '<pre class="blk add">' + escHtml(safeText(row.right)) + '</pre>'
      };
    }
    if (row.type === 'removed') {
      return {
        left: '<pre class="blk del">' + escHtml(safeText(row.left)) + '</pre>',
        right: '<pre class="blk empty">（なし）</pre>'
      };
    }
    return renderChangedCells(row, useCharDiff);
  }

  function groupBySection(rows) {
    const order = {};
    const defs = ${safeJsonForScript(SECTION_DEFS.map((d, i) => ({ key: d.key, label: d.label, order: i })))};
    defs.forEach((d) => { order[d.key] = d.order; });
    const map = new Map();
    for (const row of rows) {
      const key = row.sectionKey || row.section || 'Unknown';
      const label = SECTION_LABEL_MAP[key] || row.section || key;
      if (!map.has(key)) map.set(key, { key, label, rows: [] });
      map.get(key).rows.push(row);
    }
    return [...map.values()].sort((a, b) => {
      const oa = Object.prototype.hasOwnProperty.call(order, a.key) ? order[a.key] : 9999;
      const ob = Object.prototype.hasOwnProperty.call(order, b.key) ? order[b.key] : 9999;
      if (oa !== ob) return oa - ob;
      return String(a.label).localeCompare(String(b.label));
    });
  }

  function updateStats(rows) {
    let added = 0;
    let removed = 0;
    let changed = 0;
    let moved = 0;
    for (const row of rows) {
      if (row.type === 'added') added += 1;
      else if (row.type === 'removed') removed += 1;
      else {
        changed += 1;
        if (row.moved) moved += 1;
      }
    }
    document.getElementById('stat-total').textContent = String(rows.length);
    document.getElementById('stat-added').textContent = String(added);
    document.getElementById('stat-removed').textContent = String(removed);
    document.getElementById('stat-changed').textContent = String(changed);
    document.getElementById('stat-moved').textContent = String(moved);
  }

  function render() {
    const hideSame = !!document.getElementById('hideSame').checked;
    const useCharDiff = !!document.getElementById('charDiff').checked;
    const keyword = String(document.getElementById('search').value || '').trim().toLowerCase();
    const nav = document.getElementById('nav');
    const main = document.getElementById('main');
    nav.innerHTML = '';
    main.innerHTML = '';

    const filtered = REPORT_ROWS.filter((row) => {
      if (hideSame && row.type === 'same') return false;
      return rowMatches(row, keyword);
    });
    updateStats(filtered);

    if (!filtered.length) {
      main.innerHTML = '<div class="no-diff">表示対象の差分がありません。</div>';
      return;
    }

    const groups = groupBySection(filtered);
    groups.forEach((g, idx) => {
      const secId = 'sec_' + idx;
      const collapsedNow = collapsed.has(g.key);
      const navItem = document.createElement('div');
      navItem.className = 'nav-item';
      navItem.innerHTML = '<span>' + escHtml(g.label) + '</span><span class="badge">' + g.rows.length + '</span>';
      navItem.onclick = () => {
        collapsed.delete(g.key);
        render();
        setTimeout(() => {
          const el = document.getElementById(secId);
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 20);
      };
      nav.appendChild(navItem);

      const sec = document.createElement('section');
      sec.id = secId;
      sec.className = 'sec';
      const head = document.createElement('div');
      head.className = 'sec-head';
      head.innerHTML = '<span>' + (collapsedNow ? '▶' : '▼') + ' ' + escHtml(g.label) + '</span><span class="sec-meta">' + g.rows.length + ' 件</span>';
      head.onclick = () => {
        if (collapsed.has(g.key)) collapsed.delete(g.key);
        else collapsed.add(g.key);
        render();
      };
      sec.appendChild(head);

      if (!collapsedNow) {
        const table = document.createElement('table');
        table.className = 'diff-table';
        table.innerHTML = '<thead><tr><th style="width:110px">Type</th><th style="width:260px">Path</th><th>Source</th><th>Target</th></tr></thead>';
        const tbody = document.createElement('tbody');
        g.rows.forEach((row) => {
          const tr = document.createElement('tr');
          const typeLabel = row.moved ? (row.type + '(moved)') : (row.type || '-');
          const cells = renderRowCells(row, useCharDiff);
          const typeClass = row.type === 'added' ? 'added' : (row.type === 'removed' ? 'removed' : 'changed');
          tr.innerHTML =
            '<td class="type ' + typeClass + '">' + escHtml(typeLabel) + '</td>' +
            '<td class="path" title="' + escHtml(row.path || '-') + '">' + escHtml(row.path || '-') + '</td>' +
            '<td class="cell">' + cells.left + '</td>' +
            '<td class="cell">' + cells.right + '</td>';
          tbody.appendChild(tr);
        });
        table.appendChild(tbody);
        sec.appendChild(table);
      }
      main.appendChild(sec);
    });
  }

  function toggleTheme() {
    document.body.classList.toggle('dark');
    localStorage.setItem(THEME_KEY, document.body.classList.contains('dark') ? 'dark' : 'light');
  }

  function collapseAll() {
    for (const row of REPORT_ROWS) collapsed.add(row.sectionKey || row.section || 'Unknown');
    render();
  }

  function expandAll() {
    collapsed.clear();
    render();
  }

  function copyDiffs() {
    const lines = [];
    lines.push('kintone差分レポート');
    lines.push('Source App: ' + REPORT_META.source.appId + ' / Target App: ' + REPORT_META.target.appId);
    lines.push('Generated: ' + REPORT_META.generatedAt);
    lines.push('');
    const groups = groupBySection(REPORT_ROWS);
    groups.forEach((g) => {
      lines.push('[' + g.label + ']');
      g.rows.forEach((row) => {
        const typeLabel = row.moved ? (row.type + '(moved)') : row.type;
        lines.push(' - ' + typeLabel + ' : ' + (row.path || '-'));
      });
      lines.push('');
    });
    navigator.clipboard.writeText(lines.join('\\n'))
      .then(() => alert('差分をクリップボードへコピーしました'))
      .catch((e) => alert('コピーに失敗しました: ' + (e.message || e)));
  }

  function exportPatch() {
    const grouped = {};
    REPORT_ROWS.forEach((row) => {
      const key = row.sectionKey || row.section || 'Unknown';
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push({
        type: row.type,
        path: row.path,
        sourceValue: row.left,
        targetValue: row.right,
        moved: !!row.moved,
        movedFrom: row.movedFrom,
        movedTo: row.movedTo,
        arrayKey: row.arrayKey,
        arrayKeyValue: row.arrayKeyValue
      });
    });
    const payload = {
      generatedAt: new Date().toISOString(),
      source: REPORT_META.source,
      target: REPORT_META.target,
      sections: grouped
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'patch_' + REPORT_META.source.appId + '_vs_' + REPORT_META.target.appId + '.json';
    a.click();
    URL.revokeObjectURL(a.href);
  }

  window.__diffReport = { render, toggleTheme, collapseAll, expandAll, copyDiffs, exportPatch };

  document.getElementById('hideSame').onchange = render;
  document.getElementById('charDiff').onchange = render;
  document.getElementById('search').oninput = render;
  document.getElementById('themeBtn').onclick = toggleTheme;
  document.getElementById('collapseBtn').onclick = collapseAll;
  document.getElementById('expandBtn').onclick = expandAll;
  document.getElementById('copyBtn').onclick = copyDiffs;
  document.getElementById('patchBtn').onclick = exportPatch;

  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
      e.preventDefault();
      document.getElementById('search').focus();
    }
    if (e.key === 'Escape') {
      document.getElementById('search').value = '';
      render();
    }
  });

  if (localStorage.getItem(THEME_KEY) === 'dark') document.body.classList.add('dark');
  render();
})();
`;

    return `<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>kintone差分レポート</title>
  <style>
    :root{
      --bg:#f4f7fb;--fg:#0f172a;--card:#fff;--border:#d7dfeb;--sidebar:#1f2937;--sidebar-fg:#e2e8f0;
      --add:#e8f5e9;--add-fg:#166534;--del:#fee2e2;--del-fg:#991b1b;--pad:#f1f5f9;
      --mark-add:#bbf7d0;--mark-del:#fecaca;
    }
    body.dark{
      --bg:#0f172a;--fg:#e2e8f0;--card:#111827;--border:#334155;--sidebar:#020617;--sidebar-fg:#cbd5e1;
      --add:#083344;--add-fg:#5eead4;--del:#450a0a;--del-fg:#fca5a5;--pad:#1e293b;
      --mark-add:#134e4a;--mark-del:#7f1d1d;
    }
    *{box-sizing:border-box}
    body{margin:0;font-family:"Noto Sans JP","Hiragino Kaku Gothic ProN",Meiryo,sans-serif;background:var(--bg);color:var(--fg);display:flex;height:100vh}
    aside{width:300px;background:var(--sidebar);color:var(--sidebar-fg);display:flex;flex-direction:column;border-right:1px solid var(--border)}
    main{flex:1;overflow:auto;padding:18px}
    .sb-head{padding:14px 16px;border-bottom:1px solid #334155;font-weight:700}
    .sb-meta{font-size:11px;opacity:.8;margin-top:4px;line-height:1.6}
    .sb-stats{padding:10px 14px;border-bottom:1px solid #334155;font-size:12px;line-height:1.8}
    .sb-stats b{font-weight:700}
    .sb-ctrl{padding:10px 14px;border-bottom:1px solid #334155}
    .sb-ctrl label{display:block;font-size:12px;margin-bottom:6px}
    .sb-ctrl input[type="text"]{width:100%;padding:6px 8px;border:1px solid #475569;border-radius:6px;background:#0f172a;color:#e2e8f0}
    .sb-btns{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px;margin-top:8px}
    .btn{border:1px solid #475569;background:#334155;color:#fff;border-radius:6px;padding:6px 8px;font-size:11px;cursor:pointer}
    .btn:hover{opacity:.9}
    #nav{flex:1;overflow:auto;padding:8px 0}
    .nav-item{display:flex;justify-content:space-between;align-items:center;padding:8px 14px;font-size:12px;cursor:pointer}
    .nav-item:hover{background:#334155}
    .badge{display:inline-block;min-width:24px;text-align:center;padding:2px 6px;border-radius:999px;background:#475569;font-size:10px}
    .header{background:linear-gradient(135deg,#0f4c81,#2563eb);color:#fff;border-radius:10px;padding:14px 16px;display:flex;justify-content:space-between;gap:16px;align-items:center}
    .header .app{font-size:13px;line-height:1.6}
    .header .title{font-size:17px;font-weight:700}
    .meta{margin:10px 0 14px;font-size:12px;color:#64748b}
    body.dark .meta{color:#94a3b8}
    .summary{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px}
    .pill{border:1px solid var(--border);border-radius:999px;padding:4px 9px;font-size:11px;background:var(--card)}
    .warn{font-size:11px;color:#b45309}
    .sec{border:1px solid var(--border);border-radius:9px;overflow:hidden;background:var(--card);margin-bottom:12px}
    .sec-head{display:flex;justify-content:space-between;align-items:center;padding:9px 10px;background:var(--pad);font-size:12px;font-weight:700;cursor:pointer}
    .sec-meta{font-size:10px;color:#64748b}
    body.dark .sec-meta{color:#94a3b8}
    .diff-table{width:100%;border-collapse:collapse;table-layout:fixed;font-size:11px}
    .diff-table th,.diff-table td{border-bottom:1px solid var(--border);padding:6px 8px;vertical-align:top;text-align:left}
    .diff-table th{position:sticky;top:0;background:var(--card);z-index:1}
    .type{font-weight:700}
    .type.added{color:#166534}
    .type.removed{color:#b91c1c}
    .type.changed{color:#92400e}
    .path{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;word-break:break-all;color:#64748b}
    body.dark .path{color:#94a3b8}
    .cell{padding:0;overflow:hidden}
    .scroll{max-height:330px;overflow:auto}
    .line{display:flex;min-height:1.5em;line-height:1.5;padding:0 6px;white-space:pre-wrap;word-break:break-word}
    .line.add{background:var(--add);color:var(--add-fg)}
    .line.del{background:var(--del);color:var(--del-fg)}
    .line.pad{background:var(--pad);opacity:.72}
    .ln{min-width:34px;display:inline-block;text-align:right;margin-right:8px;padding-right:4px;border-right:1px solid var(--border);font-size:10px;color:#64748b;user-select:none;flex-shrink:0}
    body.dark .ln{color:#94a3b8}
    .blk{margin:0;padding:8px;white-space:pre-wrap;word-break:break-word;font-size:11px}
    .blk.add{background:var(--add);color:var(--add-fg)}
    .blk.del{background:var(--del);color:var(--del-fg)}
    .blk.empty{font-style:italic;color:#64748b}
    body.dark .blk.empty{color:#94a3b8}
    mark.cadd{background:var(--mark-add);color:var(--add-fg);border-radius:2px;padding:0 1px}
    mark.cdel{background:var(--mark-del);color:var(--del-fg);border-radius:2px;padding:0 1px}
    .no-diff{text-align:center;font-size:14px;padding:30px;color:#15803d;background:var(--card);border:1px solid var(--border);border-radius:10px}
    @media print{
      aside{display:none!important}
      body{display:block}
      main{padding:8px}
      .btn{display:none!important}
    }
  </style>
</head>
<body>
  <aside>
    <div class="sb-head">
      差分レポート
      <div class="sb-meta">
        Generated: ${esc(reportMeta.generatedAt)}<br>
        Scopes: ${esc(sectionText || '-')}
      </div>
    </div>
    <div class="sb-stats">
      <div>Total: <b id="stat-total">${summary.total}</b></div>
      <div>Added: <b id="stat-added">${summary.added}</b></div>
      <div>Removed: <b id="stat-removed">${summary.removed}</b></div>
      <div>Changed: <b id="stat-changed">${summary.changed}</b></div>
      <div>Moved: <b id="stat-moved">${summary.moved}</b></div>
    </div>
    <div class="sb-ctrl">
      <label><input type="checkbox" id="hideSame"> 同一項目を隠す</label>
      <label><input type="checkbox" id="charDiff" checked> 文字単位ハイライト</label>
      <input type="text" id="search" placeholder="Path / 値を検索">
      <div class="sb-btns">
        <button class="btn" id="collapseBtn">全折畳</button>
        <button class="btn" id="expandBtn">全展開</button>
        <button class="btn" id="themeBtn">テーマ切替</button>
        <button class="btn" id="copyBtn">差分コピー</button>
        <button class="btn" id="patchBtn" style="grid-column:span 2">パッチJSON出力</button>
      </div>
    </div>
    <div id="nav"></div>
  </aside>
  <main>
    <div class="header">
      <div class="app">
        <div class="title">Source App ${esc(reportMeta.source.appId || '-')}</div>
        Guest: ${esc(reportMeta.source.guestId || '(通常空間)')} / Preview: ${reportMeta.source.preview ? 'Yes' : 'No'}
      </div>
      <div style="font-size:28px;opacity:.85">⇄</div>
      <div class="app" style="text-align:right">
        <div class="title">Target App ${esc(reportMeta.target.appId || '-')}</div>
        Guest: ${esc(reportMeta.target.guestId || '(通常空間)')} / Preview: ${reportMeta.target.preview ? 'Yes' : 'No'}
      </div>
    </div>
    <div class="meta">
      Ignore Keys: ${esc(reportMeta.ignoreKeys || '-')}
    </div>
    <div class="summary">
      <span class="pill">Total ${summary.total}</span>
      <span class="pill">Added ${summary.added}</span>
      <span class="pill">Removed ${summary.removed}</span>
      <span class="pill">Changed ${summary.changed}</span>
      <span class="pill">Moved ${summary.moved}</span>
    </div>
    ${reportMeta.truncated ? `<div class="warn">※ 出力負荷を抑えるため、先頭 ${reportMeta.renderedRows} 件のみをレポートに含めています（元件数 ${reportMeta.totalRows} 件）。</div>` : ''}
    <div id="main"></div>
  </main>
  <script>${logicScript}</script>
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
        #${TOOL_ID} .plan-confirm-panel{border:2px solid #3b82f6;border-radius:8px;background:#eff6ff;padding:12px;margin-top:8px}
        #${TOOL_ID} .plan-confirm-panel .plan-summary{max-height:300px;overflow:auto;background:#fff;border:1px solid #bfdbfe;border-radius:6px;padding:10px;font-size:12px;white-space:pre-wrap;font-family:monospace}
        #${TOOL_ID} .plan-confirm-panel .plan-actions{display:flex;align-items:center;gap:10px;margin-top:10px;padding-top:10px;border-top:1px solid #bfdbfe}
        #${TOOL_ID} .plan-confirm-panel .plan-meta{font-size:11px;color:#3b82f6;flex:1}
        #${TOOL_ID} .muted{font-size:11px;color:#64748b}
        #${TOOL_ID} .step{font-size:11px;font-weight:700;color:#1e293b;background:#eef2ff;border:1px solid #c7d2fe;border-radius:6px;padding:6px 8px;margin-top:8px}
        #${TOOL_ID} .kv{font-size:11px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:8px 10px;margin-top:8px;line-height:1.7}
        #${TOOL_ID} .warnbox{font-size:11px;background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:8px 10px;margin-top:8px;color:#9a3412}
        #${TOOL_ID} .chips{display:flex;gap:6px;flex-wrap:wrap}
        #${TOOL_ID} .chip{display:inline-flex;align-items:center;gap:4px;padding:4px 7px;border:1px solid #d6dee8;border-radius:999px;font-size:11px;background:#fff}
        #${TOOL_ID} .status{font-size:12px;padding:8px 10px;border-radius:8px;background:#e2e8f0;color:#0f172a}
        #${TOOL_ID} .result{max-height:420px;overflow:auto;border:1px solid #dbe3ed;border-radius:8px;background:#fff}
        #${TOOL_ID} table{width:100%;border-collapse:collapse;font-size:11px}
        #${TOOL_ID} th,#${TOOL_ID} td{border-bottom:1px solid #e5eaf0;padding:6px 8px;vertical-align:top;text-align:left}
        #${TOOL_ID} th{position:sticky;top:0;background:#f8fafc;z-index:1}
        #${TOOL_ID} .added{color:#166534}
        #${TOOL_ID} .removed{color:#b91c1c}
        #${TOOL_ID} .changed{color:#92400e}
        #${TOOL_ID} .diff-view{--dv-bg:#f8fafc;--dv-card:#fff;--dv-border:#dbe3ed;--dv-text:#0f172a;--dv-sub:#64748b;--dv-add:#e8f5e9;--dv-add-txt:#166534;--dv-del:#fee2e2;--dv-del-txt:#991b1b;--dv-pad:#f1f5f9;--dv-mark-add:#bbf7d0;--dv-mark-del:#fecaca;background:var(--dv-bg);color:var(--dv-text)}
        #${TOOL_ID} .diff-view.dark{--dv-bg:#0f172a;--dv-card:#111827;--dv-border:#334155;--dv-text:#e2e8f0;--dv-sub:#94a3b8;--dv-add:#083344;--dv-add-txt:#5eead4;--dv-del:#450a0a;--dv-del-txt:#fca5a5;--dv-pad:#1e293b;--dv-mark-add:#134e4a;--dv-mark-del:#7f1d1d}
        #${TOOL_ID} .diff-view .diff-summary{padding:8px 10px;border-bottom:1px solid var(--dv-border);font-size:11px;background:var(--dv-card);display:flex;gap:8px;flex-wrap:wrap}
        #${TOOL_ID} .diff-view .diff-pill{border:1px solid var(--dv-border);border-radius:999px;padding:3px 8px}
        #${TOOL_ID} .diff-view .diff-info{color:var(--dv-sub)}
        #${TOOL_ID} .diff-view .diff-empty{padding:12px;font-size:12px;color:var(--dv-sub)}
        #${TOOL_ID} .diff-view .diff-sec{border-bottom:1px solid var(--dv-border);background:var(--dv-card)}
        #${TOOL_ID} .diff-view .diff-sec-head{display:flex;justify-content:space-between;gap:8px;align-items:center;padding:8px 10px;font-size:12px;font-weight:700;cursor:pointer;background:var(--dv-pad)}
        #${TOOL_ID} .diff-view .diff-sec-head:hover{opacity:.92}
        #${TOOL_ID} .diff-view .diff-sec-meta{font-size:10px;color:var(--dv-sub);font-weight:600}
        #${TOOL_ID} .diff-view .diff-table{width:100%;border-collapse:collapse;font-size:11px;table-layout:fixed}
        #${TOOL_ID} .diff-view .diff-table th,#${TOOL_ID} .diff-view .diff-table td{border-bottom:1px solid var(--dv-border);padding:6px 8px;vertical-align:top;text-align:left}
        #${TOOL_ID} .diff-view .diff-table th{position:sticky;top:0;background:var(--dv-card);z-index:1}
        #${TOOL_ID} .diff-view .diff-type{font-weight:700}
        #${TOOL_ID} .diff-view .sev-badge{display:inline-block;padding:2px 8px;border-radius:999px;font-size:10px;font-weight:700;letter-spacing:.02em}
        #${TOOL_ID} .diff-view .sev-high{background:#fee2e2;color:#991b1b}
        #${TOOL_ID} .diff-view .sev-medium{background:#fef3c7;color:#92400e}
        #${TOOL_ID} .diff-view .sev-low{background:#dbeafe;color:#1d4ed8}
        #${TOOL_ID} .diff-view .diff-path{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;word-break:break-all;color:var(--dv-sub)}
        #${TOOL_ID} .diff-view .diff-cell{padding:0;overflow:hidden}
        #${TOOL_ID} .diff-view .diff-scroll{max-height:300px;overflow:auto}
        #${TOOL_ID} .diff-view .diff-more{padding:8px 10px;text-align:center;border-top:1px dashed var(--dv-border)}
        #${TOOL_ID} .diff-view .diff-more .btn{padding:5px 10px;font-size:11px}
        #${TOOL_ID} .diff-view .diff-line{display:flex;min-height:1.5em;line-height:1.5;padding:0 6px;white-space:pre-wrap;word-break:break-word}
        #${TOOL_ID} .diff-view .diff-line.add{background:var(--dv-add);color:var(--dv-add-txt)}
        #${TOOL_ID} .diff-view .diff-line.del{background:var(--dv-del);color:var(--dv-del-txt)}
        #${TOOL_ID} .diff-view .diff-line.pad{background:var(--dv-pad);opacity:.7}
        #${TOOL_ID} .diff-view .diff-ln{min-width:34px;display:inline-block;text-align:right;margin-right:8px;padding-right:4px;border-right:1px solid var(--dv-border);font-size:10px;color:var(--dv-sub);user-select:none;flex-shrink:0}
        #${TOOL_ID} .diff-view .diff-pre{margin:0;padding:8px;white-space:pre-wrap;word-break:break-word;font-size:11px}
        #${TOOL_ID} .diff-view .diff-pre.add{background:var(--dv-add);color:var(--dv-add-txt)}
        #${TOOL_ID} .diff-view .diff-pre.del{background:var(--dv-del);color:var(--dv-del-txt)}
        #${TOOL_ID} .diff-view .diff-pre.empty{color:var(--dv-sub);font-style:italic}
        #${TOOL_ID} .diff-view mark.diff-char-add{background:var(--dv-mark-add);color:var(--dv-add-txt);padding:0 1px;border-radius:2px}
        #${TOOL_ID} .diff-view mark.diff-char-del{background:var(--dv-mark-del);color:var(--dv-del-txt);padding:0 1px;border-radius:2px}
        #${TOOL_ID}.busy .btn,#${TOOL_ID}.busy .tab,#${TOOL_ID}.busy .x{pointer-events:none;opacity:.62}
        #${TOOL_ID} .busy-overlay{position:absolute;inset:0;z-index:40;background:rgba(15,23,42,.2);display:none;align-items:center;justify-content:center}
        #${TOOL_ID}.busy .busy-overlay{display:flex}
        #${TOOL_ID} .busy-chip{display:flex;align-items:center;gap:10px;background:#0f172a;color:#fff;border-radius:999px;padding:10px 14px;font-size:12px;font-weight:700;box-shadow:0 8px 22px rgba(15,23,42,.32)}
        #${TOOL_ID} .busy-spinner{width:14px;height:14px;border:2px solid rgba(255,255,255,.35);border-top-color:#fff;border-radius:999px;animation:${TOOL_ID}-spin .8s linear infinite}
        @keyframes ${TOOL_ID}-spin{to{transform:rotate(360deg)}}
        #${TOOL_ID} .reflect-layout{display:flex;gap:0;height:520px;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;margin-top:10px;background:#fff;resize:vertical;min-height:320px}
        #${TOOL_ID} .reflect-sidebar{width:220px;min-width:220px;background:#f8fafc;border-right:1px solid #e2e8f0;display:flex;flex-direction:column;overflow:hidden}
        #${TOOL_ID} .reflect-sidebar .sidebar-head{padding:10px 12px;border-bottom:1px solid #e2e8f0;font-size:12px;font-weight:700;background:#eef2ff;color:#1e293b;display:flex;justify-content:space-between;align-items:center}
        #${TOOL_ID} .reflect-sidebar .sidebar-sections{flex:1;overflow:auto;padding:4px 0}
        #${TOOL_ID} .reflect-sidebar .sidebar-item{display:flex;align-items:center;gap:6px;padding:7px 12px;font-size:11px;cursor:pointer;border-left:3px solid transparent;transition:background .15s,border-color .15s}
        #${TOOL_ID} .reflect-sidebar .sidebar-item:hover{background:#eef2ff}
        #${TOOL_ID} .reflect-sidebar .sidebar-item.active{background:#dbeafe;border-left-color:#2563eb;font-weight:700}
        #${TOOL_ID} .reflect-sidebar .sidebar-item.disabled{opacity:.5;cursor:default}
        #${TOOL_ID} .reflect-sidebar .sidebar-item .sec-check{margin:0;flex-shrink:0}
        #${TOOL_ID} .reflect-sidebar .sidebar-item .sec-label{flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        #${TOOL_ID} .reflect-sidebar .sidebar-item .sec-badge{font-size:9px;padding:2px 6px;border-radius:999px;background:#e2e8f0;color:#475569;flex-shrink:0}
        #${TOOL_ID} .reflect-sidebar .sidebar-item .sec-badge.has-diff{background:#fef3c7;color:#92400e}
        #${TOOL_ID} .reflect-sidebar .sidebar-item .sec-badge.no-put{background:#f1f5f9;color:#94a3b8}
        #${TOOL_ID} .reflect-sidebar .sidebar-footer{padding:8px 10px;border-top:1px solid #e2e8f0;display:flex;gap:4px;flex-wrap:wrap}
        #${TOOL_ID} .reflect-sidebar .sidebar-footer .btn{padding:4px 8px;font-size:10px}
        #${TOOL_ID} .reflect-main{flex:1;display:flex;flex-direction:column;overflow:hidden}
        #${TOOL_ID} .reflect-main .main-header{padding:10px 14px;border-bottom:1px solid #e2e8f0;background:#fff}
        #${TOOL_ID} .reflect-main .main-header .main-title{font-size:13px;font-weight:700;color:#0f172a}
        #${TOOL_ID} .reflect-main .main-header .main-meta{font-size:11px;color:#64748b;margin-top:4px}
        #${TOOL_ID} .reflect-main .main-body{flex:1;overflow:auto;padding:14px}
        #${TOOL_ID} .reflect-main .main-footer{padding:10px 14px;border-top:1px solid #e2e8f0;background:#f8fafc;display:flex;gap:8px;flex-wrap:wrap;align-items:center}
        #${TOOL_ID} .reflect-main .main-footer .btn{padding:7px 12px}
        #${TOOL_ID} .opt-card{border:1px solid #e2e8f0;border-radius:8px;padding:10px 12px;margin-bottom:10px;background:#fff}
        #${TOOL_ID} .opt-card .opt-title{font-size:11px;font-weight:700;color:#334155;margin-bottom:6px;display:flex;align-items:center;gap:6px}
        #${TOOL_ID} .opt-card .opt-title .opt-icon{font-size:14px}
        #${TOOL_ID} .sec-preview{border:1px solid #dbeafe;border-radius:8px;background:#eff6ff;padding:12px;margin-bottom:10px}
        #${TOOL_ID} .sec-preview .sec-preview-title{font-size:12px;font-weight:700;color:#1d4ed8;margin-bottom:6px}
        #${TOOL_ID} .sec-preview .sec-diff-summary{display:flex;gap:6px;flex-wrap:wrap;margin-top:6px}
        #${TOOL_ID} .sec-preview .sec-diff-pill{font-size:10px;padding:2px 8px;border-radius:999px;border:1px solid #bfdbfe;background:#fff}
        #${TOOL_ID} .sec-overview-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:8px;margin-bottom:12px}
        #${TOOL_ID} .sec-overview-card{border:1px solid #e2e8f0;border-radius:8px;padding:10px;background:#fff;cursor:pointer;transition:border-color .15s,box-shadow .15s}
        #${TOOL_ID} .sec-overview-card:hover{border-color:#93c5fd;box-shadow:0 2px 8px rgba(59,130,246,.1)}
        #${TOOL_ID} .sec-overview-card .soc-label{font-size:11px;font-weight:700;color:#1e293b;margin-bottom:4px}
        #${TOOL_ID} .sec-overview-card .soc-stats{font-size:10px;color:#64748b}
        #${TOOL_ID} .sec-overview-card .soc-bar{height:3px;background:#e2e8f0;border-radius:2px;margin-top:6px;overflow:hidden}
        #${TOOL_ID} .sec-overview-card .soc-bar .fill{height:100%;border-radius:2px}
        #${TOOL_ID} .sec-overview-card .soc-bar .fill.added{background:#22c55e}
        #${TOOL_ID} .sec-overview-card .soc-bar .fill.removed{background:#ef4444}
        #${TOOL_ID} .sec-overview-card .soc-bar .fill.changed{background:#f59e0b}
      </style>
      <div class="h">
        <div>
          <div class="ht">kintone 統合変更ツール</div>
          <div class="hs">差分比較 / プレビュー反映 / フィールド追加 / JS/CSS設定 / 設計書 / 設定一括取得 / レコード管理 / プロセス図 / ER図 / SQL実行</div>
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
          <div class="btns" style="margin-top:8px">
            <button class="btn sub" data-act="setSourceCurrent">Source=現在アプリ</button>
            <button class="btn sub" data-act="copySourceToTarget">Target←Source</button>
            <button class="btn sub" data-act="swapSourceTarget">Source/Target入替</button>
          </div>
          <div style="margin-top:8px">
            <label>Lookup参照先AppID変換（任意）</label>
            <div class="muted" style="margin-bottom:4px">Lookupフィールドを反映する際、参照先アプリIDを自動変換します。開発→本番など環境間でAppIDが異なる場合に設定してください。</div>
            <div id="u_lookupMapRows"></div>
            <div class="btns" style="margin-top:4px">
              <button class="btn sub" data-act="addLookupMapRow">+ 変換ルールを追加</button>
            </div>
            <input type="hidden" id="u_lookupMap">
          </div>
          <div class="step" style="margin-top:8px">共通データ取得 / クイック実行（全タブ共通）</div>
          <div class="muted" style="margin-top:6px">Source/Target設定を元に共通データを先読みできます。差分→プランの順番もワンクリック実行できます。</div>
          <div class="btns" style="margin-top:6px">
            <button class="btn sub" data-act="prefetchCommonData">共通データ取得（Source+Target）</button>
            <button class="btn" data-act="runDiffAndPlan">差分比較 → 反映プラン確認</button>
          </div>
          <div class="kv" id="u_commonDataState">共通データ未取得</div>
          <div class="muted" style="margin-top:6px">共通設定は全タブで使います。推奨順番: 差分比較 → 反映プラン確認 → プレビュー反映。</div>
        </div>

        <div class="card">
          <div class="tabs">
            <div class="tab-group">
              <div class="tab-group-lbl">変更・反映</div>
              <button class="tab active" data-tab="diff">差分比較</button>
              <button class="tab" data-tab="reflect">プレビュー反映</button>
              <button class="tab" data-tab="field">フィールド追加</button>
              <button class="tab" data-tab="jsconfig">JS/CSS設定</button>
            </div>
            
            <div class="tab-group">
              <div class="tab-group-lbl">可視化・出力</div>
              <button class="tab" data-tab="er">ER図</button>
              <button class="tab" data-tab="processFlow">プロセス図</button>
              <button class="tab" data-tab="design">設計書</button>
              <button class="tab" data-tab="settingsExport">設定一括取得</button>
            </div>
            
            <div class="tab-group">
              <div class="tab-group-lbl">データ運用</div>
              <button class="tab" data-tab="recordMgr">レコード管理</button>
              <button class="tab" data-tab="sql">SQL実行</button>
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
              <label>無視キー（比較時にスキップしたい項目）</label>
              <div style="font-size:11px;color:#64748b;margin-top:2px">比較時に値が違っても無視するJSONキー名を指定します。以下のキーは常に自動で除外されます。</div>
              <div class="chips" style="min-height:28px;padding:4px 6px;margin-top:4px">
                <span style="font-size:11px;color:#94a3b8;margin-right:4px;line-height:22px">常時除外:</span>
                <span class="chip" style="background:#f1f5f9;color:#64748b;user-select:none">id</span>
                <span class="chip" style="background:#f1f5f9;color:#64748b;user-select:none">appid</span>
                <span class="chip" style="background:#f1f5f9;color:#64748b;user-select:none">revision</span>
                <span class="chip" style="background:#f1f5f9;color:#64748b;user-select:none">createdat</span>
                <span class="chip" style="background:#f1f5f9;color:#64748b;user-select:none">creator</span>
                <span class="chip" style="background:#f1f5f9;color:#64748b;user-select:none">modifiedat</span>
                <span class="chip" style="background:#f1f5f9;color:#64748b;user-select:none">modifier</span>
              </div>
              <div style="font-size:11px;color:#64748b;margin-top:6px">追加で無視したいキー名（よく使うプリセット）:</div>
              <div class="btns" style="margin-top:2px;flex-wrap:wrap">
                <button class="btn sub" data-act="addPresetKey" data-key="code" style="font-size:11px;padding:2px 8px">＋code</button>
                <button class="btn sub" data-act="addPresetKey" data-key="index" style="font-size:11px;padding:2px 8px">＋index</button>
                <button class="btn sub" data-act="addPresetKey" data-key="enabled" style="font-size:11px;padding:2px 8px">＋enabled</button>
                <button class="btn sub" data-act="addPresetKey" data-key="name" style="font-size:11px;padding:2px 8px">＋name</button>
                <button class="btn sub" data-act="addPresetKey" data-key="label" style="font-size:11px;padding:2px 8px">＋label</button>
              </div>
              <div style="font-size:11px;color:#64748b;margin-top:6px">よく使う無視プリセット:</div>
              <div class="chips" style="margin-top:4px">
                <label class="chip"><input type="checkbox" id="u_ignorePresetFieldOrder"> フィールド順序(index/no)無視</label>
                <label class="chip"><input type="checkbox" id="u_ignorePresetMeta"> 日時/更新者/revision無視</label>
                <label class="chip"><input type="checkbox" id="u_ignorePresetLabelName"> name/label差分を無視</label>
              </div>
              <div style="font-size:11px;color:#64748b;margin-top:6px">追加した無視キー（×で削除）:</div>
              <input type="hidden" id="u_ignoreKeys">
              <div id="u_ignoreKeysTags" class="chips" style="min-height:32px;border:1px solid #d6dee8;border-radius:6px;padding:4px 6px;background:#fff;margin-top:4px;align-items:center"></div>
              <div class="btns" style="margin-top:4px">
                <input type="text" id="u_ignoreKeyInput" placeholder="キー名を入力してEnterまたは追加" style="flex:1;min-width:0">
                <button class="btn sub" data-act="addIgnoreKey">追加</button>
              </div>
            </div>
            <div style="margin-top:8px">
              <label>プロファイル（無視キーのセットを保存・読込）</label>
              <div class="btns" style="margin-top:4px">
                <select id="u_ignoreProfileSelect" style="flex:1;min-width:0"></select>
                <input type="text" id="u_ignoreProfileName" placeholder="保存名" style="flex:1;min-width:0">
                <button class="btn sub" data-act="saveIgnoreProfile">保存</button>
                <button class="btn sub" data-act="deleteIgnoreProfile">削除</button>
              </div>
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
            <div class="grid2" style="margin-top:8px">
              <div>
                <label>比較ビュー検索（Path / 値）</label>
                <input type="text" id="u_diffSearch" placeholder="例: fieldSettings.properties.customer_code">
              </div>
              <div>
                <label>比較ビュー表示</label>
                <div class="btns" style="margin-top:0">
                  <label class="chip"><input type="checkbox" id="u_charDiff" checked> 文字単位ハイライト</label>
                  <button class="btn sub" data-act="toggleDiffTheme" id="u_diffThemeBtn">比較テーマ: Light</button>
                  <button class="btn sub" data-act="collapseDiffSections">全折畳</button>
                  <button class="btn sub" data-act="expandDiffSections">全展開</button>
                </div>
              </div>
            </div>
            <input type="file" id="u_sourceBundleFile" accept=".json" style="display:none">
            <input type="file" id="u_targetBundleFile" accept=".json" style="display:none">
          </div>

          <div class="pane" data-pane="reflect">
            <input type="checkbox" id="u_nodeMode" style="display:none">
            <div class="muted" style="margin-top:4px">差分比較が未実行または条件変更時は、反映前に自動で差分比較を実行します。</div>
            <div id="u_applyScopeBlock" style="display:none"><div class="chips" id="u_applyScopes"></div></div>
            <div class="reflect-layout">
              <div class="reflect-sidebar">
                <div class="sidebar-head">
                  <span>反映セクション</span>
                  <span style="font-size:10px;font-weight:400;color:#64748b" id="u_sidebarCount">0 / 0</span>
                </div>
                <div class="sidebar-sections" id="u_reflectSidebarSections"></div>
                <div class="sidebar-footer">
                  <button class="btn sub" data-act="applyScopeAll">全選択</button>
                  <button class="btn sub" data-act="applyScopeNone">全解除</button>
                  <button class="btn sub" data-act="applyScopeDiffOnly" id="u_applyScopeDiffOnlyBtn">差分のみ</button>
                </div>
              </div>
              <div class="reflect-main">
                <div class="main-header">
                  <div>
                    <div class="main-title" id="u_reflectMainTitle">反映概要</div>
                    <div class="main-meta" id="u_reflectMode">Source: API / Target: Preview API</div>
                  </div>
                  <div style="display:flex;gap:4px">
                    <button class="btn ok" id="u_modeSectionBtn" data-act="reflectModeSection" style="padding:5px 10px;font-size:11px">セクション</button>
                    <button class="btn sub" id="u_modeNodeBtn" data-act="reflectModeNode" style="padding:5px 10px;font-size:11px">ノード選択</button>
                  </div>
                </div>
                <div class="main-body" id="u_reflectMainBody">
                  <div id="u_reflectOverview"></div>
                  <div id="u_reflectHint" class="kv" style="display:none"></div>
                  <div id="u_sectionOptionsBlock" style="display:none">
                    <label class="chip"><input type="checkbox" id="u_applyDiffOnly"> 前回差分のあるセクションのみ反映</label>
                  </div>
                  <div class="warnbox" id="u_nodeWarn" style="display:none">注: ノードモードは「前回差分」から選択して反映します。まず差分比較を実行してください。</div>
                  <div id="u_nodeControls" style="display:none">
                    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px">
                      <button class="btn sub" data-act="loadReflectNodes" style="padding:4px 8px;font-size:10px">差分ノード読込</button>
                      <button class="btn sub" data-act="selectReflectNodesAll" style="padding:4px 8px;font-size:10px">全選択</button>
                      <button class="btn sub" data-act="clearReflectNodes" style="padding:4px 8px;font-size:10px">全解除</button>
                      <button class="btn ok" data-act="reflectModeAllSrc" style="padding:4px 8px;font-size:10px">一括Src</button>
                      <button class="btn ok" data-act="reflectModeAllTgt" style="padding:4px 8px;font-size:10px">一括Tgt</button>
                      <button class="btn sub" data-act="reflectUndo" style="padding:4px 8px;font-size:10px">Undo</button>
                      <button class="btn sub" data-act="reflectRedo" style="padding:4px 8px;font-size:10px">Redo</button>
                    </div>
                  </div>
                  <div id="u_nodeFilterBlock" style="display:none;margin-bottom:8px">
                    <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center">
                      <input type="text" id="u_nodeSearch" placeholder="パス / セクション で絞り込み" style="flex:1;min-width:140px;padding:4px 8px;border:1px solid #d6dee8;border-radius:6px;font-size:11px">
                      <select id="u_nodeFilterSection" style="padding:4px 6px;border:1px solid #d6dee8;border-radius:6px;font-size:11px"><option value="">全セクション</option></select>
                      <select id="u_nodeFilterType" style="padding:4px 6px;border:1px solid #d6dee8;border-radius:6px;font-size:11px">
                        <option value="">全タイプ</option><option value="added">added</option><option value="removed">removed</option><option value="changed">changed</option>
                      </select>
                      <select id="u_nodeFilterSeverity" style="padding:4px 6px;border:1px solid #d6dee8;border-radius:6px;font-size:11px">
                        <option value="">全Severity</option><option value="HIGH">HIGH</option><option value="MEDIUM">MEDIUM</option><option value="LOW">LOW</option>
                      </select>
                    </div>
                  </div>
                  <div class="result" id="u_reflectNodeList" style="max-height:none;display:none;border:1px solid #dbe3ed;border-radius:8px;overflow:auto;flex:1"></div>
                  <div class="opt-card" id="u_reflectOptionsCard">
                    <div class="opt-title">反映オプション</div>
                    <div style="display:flex;gap:8px;flex-wrap:wrap">
                      <label class="chip"><input type="checkbox" id="u_autoBackupPreview" checked> バックアップ自動保存</label>
                      <label class="chip"><input type="checkbox" id="u_stopOnError" checked> エラー時中断</label>
                      <label class="chip"><input type="checkbox" id="u_doDeploy"> 反映後デプロイ</label>
                    </div>
                    <div id="u_backupStatus" style="display:none;margin-top:6px;padding:6px 10px;border-radius:6px;font-size:11px;background:#ecfdf5;border:1px solid #a7f3d0;color:#065f46"></div>
                  </div>
                </div>
                <div class="main-footer">
                  <button class="btn sub" data-act="previewApplyPlan">反映プラン確認</button>
                  <button class="btn sub" data-act="backupTargetPreview">バックアップ</button>
                  <button class="btn ok" data-act="applyPreview">Source → Target(Preview) 反映</button>
                  <button class="btn dark" data-act="deployOnly">デプロイのみ</button>
                </div>
              </div>
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
            <div class="step">JS/CSS設定の取得・表示・反映</div>
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
            <div class="step">全アプリのJS/CSS一括ダウンロード（Target）</div>
            <div style="margin-top:10px" class="muted">現在アクセスしているスペース（またはゲストスペース）内の全アプリをスキャンし、JS/CSSファイルの添付を一括でZIP化します。</div>
            <div class="btns" style="margin-top:10px">
              <button class="btn ok" data-act="runBatchJsConfigDownload">全アプリのJS/CSSを一括ダウンロード（ZIP）</button>
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
            <div class="step">Kintone SQL 実行 (Source App ベース)</div>
            <div style="margin-top:10px" class="muted">Alasqlを用いて、Kintone上でSQLライクにデータアクセス・集計を行います。</div>
            <div class="btns" style="margin-top:10px">
              <button class="btn ok" data-act="launchKintoneSql">SQLエディタを開く</button>
            </div>
          </div>

          <div class="pane" data-pane="processFlow">
            <div class="step">プロセス管理の可視化（Source App）</div>
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
                <label>フロー図プレビュー</label>
                <div id="u_mermaidView" style="min-height:200px;border:1px solid #cbd5e1;border-radius:7px;background:#fff;padding:10px;overflow:auto"></div>
              </div>
            </div>
          </div>

          <div class="pane" data-pane="settingsExport">
            <div class="step">設定の一括取得（複数アプリ）</div>
            <div style="margin-top:10px" class="muted">複数アプリの設定をまとめて取得し、JSONまたはZIPで出力します（JS/CSS設定は「JS/CSS設定」タブで取得）。</div>
            <div class="grid2" style="margin-top:8px">
              <div>
                <label>対象App ID（カンマ/改行区切り）</label>
                <textarea id="u_settingsExportAppIds" style="min-height:88px" placeholder="74, 120, 305"></textarea>
                <div class="inline" style="margin-top:8px">
                  <input type="text" id="u_settingsExportSearchKeyword" placeholder="アプリ名で検索" style="flex:1">
                  <button class="btn sub" data-act="settingsExportSearchApps">検索</button>
                </div>
                <div class="result" id="u_settingsExportSearchResult" style="max-height:140px;margin-top:6px"></div>
              </div>
              <div>
                <label>Guest ID（任意 / 全App共通）</label>
                <input type="text" id="u_settingsExportGuest" placeholder="空で通常空間">
                <label class="chip" style="margin-top:8px"><input type="checkbox" id="u_settingsExportPreview"> プレビュー設定を取得</label>
                <div class="btns" style="margin-top:8px">
                  <button class="btn sub" data-act="settingsExportUseCurrent">現在Appを追加</button>
                  <button class="btn sub" data-act="settingsExportUseSource">Sourceを追加</button>
                  <button class="btn sub" data-act="settingsExportUseTarget">Targetを追加</button>
                </div>
              </div>
            </div>
            <div style="margin-top:10px">
              <label>取得対象セクション</label>
              <div class="btns" style="margin-top:4px">
                <button class="btn sub" data-act="settingsExportScopeAll">全選択</button>
                <button class="btn sub" data-act="settingsExportScopeNone">全解除</button>
              </div>
              <div class="chips" id="u_settingsExportScopes"></div>
            </div>
            <div class="btns">
              <button class="btn" data-act="runSettingsExportJson">JSON出力</button>
              <button class="btn dark" data-act="runSettingsExportZip">ZIP出力</button>
            </div>
            <div class="result" id="u_settingsExportResult" style="max-height:220px;margin-top:8px"></div>
          </div>
        </div>

        <div class="status" id="u_status">待機中</div>

        <div class="card">
          <div style="font-size:12px;font-weight:700;margin-bottom:6px">結果</div>
          <div class="result" id="u_result"></div>
        </div>
      </div>
      <div class="busy-overlay" id="u_busyOverlay">
        <div class="busy-chip">
          <span class="busy-spinner"></span>
          <span id="u_busyText">処理中...</span>
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
    ignorePresetFieldOrder: $('#u_ignorePresetFieldOrder'),
    ignorePresetMeta: $('#u_ignorePresetMeta'),
    ignorePresetLabelName: $('#u_ignorePresetLabelName'),
    ignoreProfileSelect: $('#u_ignoreProfileSelect'),
    ignoreProfileName: $('#u_ignoreProfileName'),
    diffSearch: $('#u_diffSearch'),
    commonDataState: $('#u_commonDataState'),
    charDiff: $('#u_charDiff'),
    diffThemeBtn: $('#u_diffThemeBtn'),
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
    autoBackupPreview: $('#u_autoBackupPreview'),
    backupStatus: $('#u_backupStatus'),
    stopOnError: $('#u_stopOnError'),
    nodeMode: $('#u_nodeMode'),
    modeSectionBtn: $('#u_modeSectionBtn'),
    modeNodeBtn: $('#u_modeNodeBtn'),
    nodeFilterBlock: $('#u_nodeFilterBlock'),
    nodeSearch: $('#u_nodeSearch'),
    nodeFilterSection: $('#u_nodeFilterSection'),
    nodeFilterType: $('#u_nodeFilterType'),
    nodeFilterSeverity: $('#u_nodeFilterSeverity'),
    nodeWarn: $('#u_nodeWarn'),
    nodeControls: $('#u_nodeControls'),
    reflectNodeList: $('#u_reflectNodeList'),
    reflectOverview: $('#u_reflectOverview'),
    reflectMainTitle: $('#u_reflectMainTitle'),
    reflectOptionsCard: $('#u_reflectOptionsCard'),
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
    settingsExportAppIds: $('#u_settingsExportAppIds'),
    settingsExportSearchKeyword: $('#u_settingsExportSearchKeyword'),
    settingsExportSearchResult: $('#u_settingsExportSearchResult'),
    settingsExportGuest: $('#u_settingsExportGuest'),
    settingsExportPreview: $('#u_settingsExportPreview'),
    settingsExportScopes: $('#u_settingsExportScopes'),
    settingsExportResult: $('#u_settingsExportResult'),
    genCount: $('#u_genCount'),
    recordMgrResult: $('#u_recordMgrResult'),
    mermaidText: $('#u_mermaidText'),
    mermaidView: $('#u_mermaidView'),
    busyOverlay: $('#u_busyOverlay'),
    busyText: $('#u_busyText')
  };

  function setStatus(msg, isError) {
    ui.status.textContent = msg;
    ui.status.style.background = isError ? '#fee2e2' : '#e2e8f0';
    ui.status.style.color = isError ? '#7f1d1d' : '#0f172a';
  }

  function setBusy(isBusy, message) {
    if (message) ui.busyText.textContent = message;
    root.classList.toggle('busy', !!isBusy);
  }

  function syncDiffThemeButton() {
    if (!ui.diffThemeBtn) return;
    ui.diffThemeBtn.textContent = `比較テーマ: ${state.diffViewTheme === 'dark' ? 'Dark' : 'Light'}`;
  }

  function stringifyForDiff(value) {
    if (value === undefined) return 'undefined';
    const out = JSON.stringify(value, null, 2);
    return out == null ? String(value) : out;
  }

  function diffRowMatchesKeyword(row, keyword) {
    if (!keyword) return true;
    const safe = (v) => {
      try { return v === undefined ? 'undefined' : JSON.stringify(v); }
      catch { return String(v); }
    };
    const text = [
      row.section || '',
      row.sectionKey || '',
      row.severity || '',
      row.path || '',
      safe(row.left),
      safe(row.right)
    ].join('\n').toLowerCase();
    return text.includes(keyword);
  }

  function buildLineDiffOps(leftLines, rightLines) {
    const n = leftLines.length;
    const m = rightLines.length;
    if (n * m > LINE_DIFF_MAX_CELLS) return null;

    const dp = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
    for (let i = n - 1; i >= 0; i--) {
      for (let j = m - 1; j >= 0; j--) {
        dp[i][j] = leftLines[i] === rightLines[j]
          ? dp[i + 1][j + 1] + 1
          : Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
    }

    const ops = [];
    let i = 0;
    let j = 0;
    while (i < n || j < m) {
      if (i < n && j < m && leftLines[i] === rightLines[j]) {
        ops.push({ type: 'same', left: leftLines[i], right: rightLines[j] });
        i += 1;
        j += 1;
        continue;
      }

      const down = i < n ? dp[i + 1][j] : -1;
      const right = j < m ? dp[i][j + 1] : -1;
      const diag = (i < n && j < m) ? dp[i + 1][j + 1] : -1;
      if (i < n && j < m && diag >= down && diag >= right) {
        ops.push({ type: 'replace', left: leftLines[i], right: rightLines[j] });
        i += 1;
        j += 1;
        continue;
      }

      if (j < m && (i >= n || right >= down)) {
        ops.push({ type: 'add', right: rightLines[j] });
        j += 1;
      } else if (i < n) {
        ops.push({ type: 'del', left: leftLines[i] });
        i += 1;
      } else {
        break;
      }
    }
    return ops;
  }

  function buildCharDiffHtml(leftText, rightText) {
    const a = [...String(leftText || '')];
    const b = [...String(rightText || '')];
    if (!a.length || !b.length) return null;
    if (a.length * b.length > CHAR_DIFF_MAX_CELLS) return null;

    const dp = Array.from({ length: a.length + 1 }, () => new Uint16Array(b.length + 1));
    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        dp[i][j] = a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1] + 1
          : Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }

    const ops = [];
    let i = a.length;
    let j = b.length;
    while (i > 0 || j > 0) {
      if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
        ops.push({ type: 'same', ch: a[i - 1] });
        i -= 1;
        j -= 1;
      } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
        ops.push({ type: 'add', ch: b[j - 1] });
        j -= 1;
      } else if (i > 0) {
        ops.push({ type: 'del', ch: a[i - 1] });
        i -= 1;
      } else {
        break;
      }
    }
    ops.reverse();

    let left = '';
    let right = '';
    for (const op of ops) {
      if (op.type === 'same') {
        const ch = esc(op.ch);
        left += ch;
        right += ch;
      } else if (op.type === 'del') {
        left += `<mark class="diff-char-del">${esc(op.ch)}</mark>`;
      } else {
        right += `<mark class="diff-char-add">${esc(op.ch)}</mark>`;
      }
    }
    return { left, right };
  }

  function renderChangedColumns(row, useCharDiff) {
    const leftText = stringifyForDiff(row.left);
    const rightText = stringifyForDiff(row.right);
    const leftLines = leftText.split('\n');
    const rightLines = rightText.split('\n');
    const ops = buildLineDiffOps(leftLines, rightLines);
    if (!ops) {
      return {
        left: `<pre class="diff-pre del">${esc(leftText)}</pre>`,
        right: `<pre class="diff-pre add">${esc(rightText)}</pre>`
      };
    }

    let leftHtml = '';
    let rightHtml = '';
    let leftNo = 0;
    let rightNo = 0;
    for (const op of ops) {
      if (op.type === 'same') {
        leftNo += 1;
        rightNo += 1;
        leftHtml += `<div class="diff-line"><span class="diff-ln">${leftNo}</span>${esc(op.left || '')}</div>`;
        rightHtml += `<div class="diff-line"><span class="diff-ln">${rightNo}</span>${esc(op.right || '')}</div>`;
        continue;
      }
      if (op.type === 'replace') {
        leftNo += 1;
        rightNo += 1;
        const charDiff = useCharDiff ? buildCharDiffHtml(op.left, op.right) : null;
        leftHtml += `<div class="diff-line del"><span class="diff-ln">${leftNo}</span>${charDiff ? charDiff.left : esc(op.left || '')}</div>`;
        rightHtml += `<div class="diff-line add"><span class="diff-ln">${rightNo}</span>${charDiff ? charDiff.right : esc(op.right || '')}</div>`;
        continue;
      }
      if (op.type === 'del') {
        leftNo += 1;
        leftHtml += `<div class="diff-line del"><span class="diff-ln">${leftNo}</span>${esc(op.left || '')}</div>`;
        rightHtml += '<div class="diff-line pad"><span class="diff-ln"></span></div>';
        continue;
      }
      rightNo += 1;
      leftHtml += '<div class="diff-line pad"><span class="diff-ln"></span></div>';
      rightHtml += `<div class="diff-line add"><span class="diff-ln">${rightNo}</span>${esc(op.right || '')}</div>`;
    }

    return {
      left: `<div class="diff-scroll">${leftHtml}</div>`,
      right: `<div class="diff-scroll">${rightHtml}</div>`
    };
  }

  function renderRowColumns(row, useCharDiff) {
    if (row.type === 'added') {
      return {
        left: '<pre class="diff-pre empty">（なし）</pre>',
        right: `<pre class="diff-pre add">${esc(stringifyForDiff(row.right))}</pre>`
      };
    }
    if (row.type === 'removed') {
      return {
        left: `<pre class="diff-pre del">${esc(stringifyForDiff(row.left))}</pre>`,
        right: '<pre class="diff-pre empty">（なし）</pre>'
      };
    }
    return renderChangedColumns(row, useCharDiff);
  }

  function groupDiffRowsBySection(rows) {
    const labelByKey = new Map(SECTION_DEFS.map((d) => [d.key, d.label]));
    const orderByKey = new Map(SECTION_DEFS.map((d, i) => [d.key, i]));
    const grouped = new Map();

    for (const row of rows) {
      const key = row.sectionKey || row.section || 'Unknown';
      if (!grouped.has(key)) {
        grouped.set(key, {
          key,
          label: labelByKey.get(key) || row.section || key,
          rows: []
        });
      }
      grouped.get(key).rows.push(row);
    }

    return [...grouped.values()].sort((a, b) => {
      const oa = orderByKey.has(a.key) ? orderByKey.get(a.key) : 9999;
      const ob = orderByKey.has(b.key) ? orderByKey.get(b.key) : 9999;
      if (oa !== ob) return oa - ob;
      return String(a.label).localeCompare(String(b.label));
    });
  }

  function renderResultRows(rows) {
    const summary = summarizeRows(rows);
    const severitySummary = summarizeSeverity(rows);
    syncDiffThemeButton();

    const rawKeyword = String(ui.diffSearch?.value || '').trim();
    const keyword = rawKeyword.toLowerCase();
    const useCharDiff = !!ui.charDiff?.checked;
    const filteredRows = keyword ? rows.filter((r) => diffRowMatchesKeyword(r, keyword)) : rows;
    const grouped = groupDiffRowsBySection(filteredRows);
    const filteredSeverity = summarizeSeverity(filteredRows);

    const summaryHtml = `
      <div class="diff-summary">
        <span class="diff-pill">Total ${summary.total}</span>
        <span class="diff-pill">Added ${summary.added}</span>
        <span class="diff-pill">Removed ${summary.removed}</span>
        <span class="diff-pill">Changed ${summary.changed}</span>
        <span class="diff-pill">Moved ${summary.moved}</span>
        <span class="diff-pill">High ${severitySummary.high}</span>
        <span class="diff-pill">Medium ${severitySummary.medium}</span>
        <span class="diff-pill">Low ${severitySummary.low}</span>
        <span class="diff-info">表示 ${filteredRows.length}/${rows.length}</span>
        ${filteredRows.length !== rows.length ? `<span class="diff-info">Filter Severity H:${filteredSeverity.high} / M:${filteredSeverity.medium} / L:${filteredSeverity.low}</span>` : ''}
        ${rawKeyword ? `<span class="diff-info">Filter: ${esc(rawKeyword)}</span>` : ''}
      </div>
    `;

    if (!rows.length) {
      ui.result.innerHTML = `<div class="diff-view ${state.diffViewTheme === 'dark' ? 'dark' : ''}">
        ${summaryHtml}
        <div class="diff-empty">差分はありません。</div>
      </div>`;
      return;
    }

    if (!filteredRows.length) {
      ui.result.innerHTML = `<div class="diff-view ${state.diffViewTheme === 'dark' ? 'dark' : ''}">
        ${summaryHtml}
        <div class="diff-empty">検索条件に一致する差分はありません。</div>
      </div>`;
      return;
    }

    const sectionHtml = grouped.map((g) => {
      const collapsed = state.diffCollapsedSections.has(g.key);
      const head = `<div class="diff-sec-head" data-diff-sec-toggle="${esc(g.key)}">
        <span>${collapsed ? '▶' : '▼'} ${esc(g.label)}</span>
        <span class="diff-sec-meta">${g.rows.length} 件</span>
      </div>`;
      if (collapsed) return `<section class="diff-sec">${head}</section>`;

      const visible = Math.max(40, state.diffSectionVisibleCounts[g.key] || 80);
      const renderRows = g.rows.slice(0, visible);
      const rowsHtml = renderRows.map((r) => {
        const typeLabel = r.moved ? `${r.type}(moved)` : r.type;
        const typeClass = r.type === 'added' ? 'added' : (r.type === 'removed' ? 'removed' : 'changed');
        const sev = r.severity || 'low';
        const sevClass = sev === 'high' ? 'sev-high' : (sev === 'medium' ? 'sev-medium' : 'sev-low');
        const cols = renderRowColumns(r, useCharDiff);
        return `<tr>
          <td><span class="sev-badge ${sevClass}">${esc(sev.toUpperCase())}</span></td>
          <td class="diff-type ${typeClass}">${esc(typeLabel || '-')}</td>
          <td class="diff-path" title="${esc(r.path || '-')}">${esc(r.path || '-')}</td>
          <td class="diff-cell">${cols.left}</td>
          <td class="diff-cell">${cols.right}</td>
        </tr>`;
      }).join('');
      const remain = g.rows.length - renderRows.length;
      const moreHtml = remain > 0
        ? `<div class="diff-more"><button class="btn sub" data-act="moreDiffRows" data-sec="${esc(g.key)}">さらに表示 (${remain}件)</button></div>`
        : '';

      return `<section class="diff-sec">
        ${head}
        <table class="diff-table">
          <thead><tr><th style="width:90px">Severity</th><th style="width:120px">Type</th><th style="width:260px">Path</th><th>Source</th><th>Target</th></tr></thead>
          <tbody>${rowsHtml}</tbody>
        </table>
        ${moreHtml}
      </section>`;
    }).join('');

    ui.result.innerHTML = `<div class="diff-view ${state.diffViewTheme === 'dark' ? 'dark' : ''}">
      ${summaryHtml}
      ${sectionHtml}
    </div>`;
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
    ui.settingsExportScopes.innerHTML = SETTINGS_EXPORT_SCOPE_DEFS.map((s) => `<label class="chip"><input type="checkbox" value="${s.key}" checked>${s.label}</label>`).join('');
  }

  function setSettingsExportScopeSelection(checked) {
    [...ui.settingsExportScopes.querySelectorAll('input[type="checkbox"]')].forEach((c) => {
      c.checked = !!checked;
    });
    saveCurrentDialogState();
  }

  function renderIgnoreProfileOptions(selectedName) {
    const profiles = loadIgnoreProfiles();
    const keep = selectedName != null ? String(selectedName) : String(ui.ignoreProfileSelect?.value || '');
    const opts = ['<option value="">-- プロファイルを選択 --</option>']
      .concat(Object.keys(profiles).sort().map((n) => `<option value="${esc(n)}">${esc(n)}</option>`));
    ui.ignoreProfileSelect.innerHTML = opts.join('');
    if (keep && Object.prototype.hasOwnProperty.call(profiles, keep)) ui.ignoreProfileSelect.value = keep;
    else ui.ignoreProfileSelect.value = '';
  }

  function renderIgnoreKeyChips() {
    const tags = document.getElementById('u_ignoreKeysTags');
    if (!tags) return;
    const val = ui.ignoreKeys.value || '';
    const keys = val.split(',').map((k) => k.trim()).filter(Boolean);
    if (keys.length === 0) {
      tags.innerHTML = '<span style="color:#94a3b8;font-size:11px;padding:2px 0">追加の無視キーなし（上のデフォルトキーは常に除外）</span>';
      return;
    }
    tags.innerHTML = keys.map((k) =>
      `<span class="chip" style="user-select:none">${esc(k)}<button type="button" style="border:none;background:none;cursor:pointer;padding:0 0 0 4px;font-size:12px;color:#64748b;line-height:1" data-act="removeIgnoreKey" data-key="${esc(k)}">×</button></span>`
    ).join('');
  }

  function getIgnorePresetState() {
    return {
      fieldOrder: !!ui.ignorePresetFieldOrder?.checked,
      meta: !!ui.ignorePresetMeta?.checked,
      labelName: !!ui.ignorePresetLabelName?.checked
    };
  }

  function applyIgnorePresetKeysToInput(options = {}) {
    const current = new Set((ui.ignoreKeys.value || '').split(',').map((k) => k.trim()).filter(Boolean));
    const preset = getIgnorePresetState();
    const removeDisabled = !!options.removeDisabled;
    Object.entries(IGNORE_PRESET_KEYS).forEach(([name, keys]) => {
      const enabled = !!preset[name];
      keys.forEach((key) => {
        if (enabled) current.add(key);
        else if (removeDisabled) current.delete(key);
      });
    });
    ui.ignoreKeys.value = [...current].join(', ');
    renderIgnoreKeyChips();
  }

  function addIgnoreKeyFromInput() {
    const input = document.getElementById('u_ignoreKeyInput');
    if (!input) return;
    const key = input.value.trim();
    if (!key) return;
    const current = (ui.ignoreKeys.value || '').split(',').map((k) => k.trim()).filter(Boolean);
    if (!current.includes(key)) {
      current.push(key);
      ui.ignoreKeys.value = current.join(', ');
      renderIgnoreKeyChips();
      saveCurrentDialogState();
    }
    input.value = '';
    input.focus();
  }

  function renderLookupMapRows() {
    const container = document.getElementById('u_lookupMapRows');
    if (!container) return;
    let map = {};
    try { map = parseLookupMapInput(ui.lookupMap.value); } catch { map = {}; }
    const entries = Object.entries(map);
    if (entries.length === 0) {
      container.innerHTML = '<div class="muted" style="padding:2px 0">変換ルールなし</div>';
      return;
    }
    container.innerHTML = entries.map(([from, to], i) =>
      `<div class="btns" style="margin-top:4px" data-lookup-row="${i}">` +
      `<span style="align-self:center;font-size:11px;color:#64748b;white-space:nowrap">変換元</span>` +
      `<input type="text" class="lookup-from" value="${esc(from)}" placeholder="変換元 AppID" style="flex:1;min-width:0">` +
      `<span style="align-self:center;padding:0 4px;color:#64748b">→</span>` +
      `<span style="align-self:center;font-size:11px;color:#64748b;white-space:nowrap">変換先</span>` +
      `<input type="text" class="lookup-to" value="${esc(to)}" placeholder="変換先 AppID" style="flex:1;min-width:0">` +
      `<button type="button" class="btn sub" data-act="removeLookupMapRow" data-row="${i}" style="padding:4px 8px">×</button>` +
      `</div>`
    ).join('');
  }

  function syncLookupMapFromRows() {
    const container = document.getElementById('u_lookupMapRows');
    if (!container) return;
    const rows = container.querySelectorAll('[data-lookup-row]');
    const map = {};
    rows.forEach((row) => {
      const from = (row.querySelector('.lookup-from')?.value || '').trim();
      const to = (row.querySelector('.lookup-to')?.value || '').trim();
      if (from && to) map[from] = to;
    });
    ui.lookupMap.value = Object.keys(map).length ? JSON.stringify(map) : '';
  }

  function renderBundleState() {
    const fmtFetchTime = (v) => {
      if (!v) return '-';
      try { return new Date(v).toLocaleString(); } catch { return String(v); }
    };
    const sourceText = state.importedSourceBundle
      ? `Source: 読込済み(${state.importedSourceName || state.importedSourceBundle.appId || '-'})`
      : (state.lastSourceBundle ? `Source: API取得済み(App ${state.lastSourceBundle.appId || '-'} / ${fmtFetchTime(state.lastSourceBundle.fetchedAt)})` : 'Source: API取得');
    const targetText = state.importedTargetBundle
      ? `Target: 読込済み(${state.importedTargetName || state.importedTargetBundle.appId || '-'})`
      : (state.lastTargetBundle ? `Target: API取得済み(App ${state.lastTargetBundle.appId || '-'} / ${fmtFetchTime(state.lastTargetBundle.fetchedAt)})` : 'Target: API取得');
    ui.bundleState.textContent = `${sourceText} / ${targetText}`;
    const rangeMode = ui.nodeMode?.checked
      ? `選択ノード(${state.reflectSelectedIds.size})`
      : (ui.applyDiffOnly?.checked ? '前回差分セクションのみ' : '選択セクション');
    ui.reflectMode.textContent = `${sourceText} / Target: Preview API / 反映範囲: ${rangeMode}`;
    if (ui.commonDataState) {
      const diffInfo = state.lastDiffAt ? `差分: ${fmtFetchTime(state.lastDiffAt)} (${state.lastDiffRows.length}件)` : '差分: 未実行';
      ui.commonDataState.textContent = `${sourceText} / ${targetText} / ${diffInfo}`;
    }
  }

  function renderReflectModeUi() {
    const node = !!ui.nodeMode.checked;
    const scopeChecks = [...ui.applyScopes.querySelectorAll('input[type="checkbox"]')];
    scopeChecks.forEach((c) => { c.disabled = node; });
    if (ui.applyDiffOnly) ui.applyDiffOnly.disabled = node;
    ui.nodeWarn.style.display = node ? 'block' : 'none';
    ui.nodeControls.style.display = node ? 'block' : 'none';
    ui.reflectNodeList.style.display = node ? 'block' : 'none';
    if (ui.nodeFilterBlock) ui.nodeFilterBlock.style.display = node ? 'block' : 'none';
    if (ui.sectionOptionsBlock) ui.sectionOptionsBlock.style.display = node ? 'none' : 'none';
    if (ui.reflectHint) {
      ui.reflectHint.style.display = node ? 'block' : 'none';
      ui.reflectHint.textContent = node
        ? `ノード反映モード: 差分ノードを選択して部分反映します（選択: ${state.reflectSelectedIds.size}件 / Undo: ${state.reflectUndoStack.length}）`
        : '';
    }
    if (ui.modeSectionBtn && ui.modeNodeBtn) {
      ui.modeSectionBtn.className = node ? 'btn sub' : 'btn ok';
      ui.modeSectionBtn.style.cssText = 'padding:5px 10px;font-size:11px';
      ui.modeNodeBtn.className = node ? 'btn ok' : 'btn sub';
      ui.modeNodeBtn.style.cssText = 'padding:5px 10px;font-size:11px';
    }
    if (ui.reflectOverview) ui.reflectOverview.style.display = node ? 'none' : 'block';
    if (ui.reflectOptionsCard) ui.reflectOptionsCard.style.display = node ? 'none' : 'block';
    renderReflectSidebar();
  }

  function getDiffCountsBySection() {
    const counts = {};
    for (const row of (state.lastDiffRows || [])) {
      const key = row.sectionKey || '';
      if (!key) continue;
      if (!counts[key]) counts[key] = { total: 0, added: 0, removed: 0, changed: 0 };
      counts[key].total++;
      if (row.type === 'added') counts[key].added++;
      else if (row.type === 'removed') counts[key].removed++;
      else if (row.type === 'changed') counts[key].changed++;
    }
    return counts;
  }

  function renderReflectSidebar() {
    const container = document.getElementById('u_reflectSidebarSections');
    if (!container) return;
    const diffCounts = getDiffCountsBySection();
    const selectedScopes = new Set(selectedScopeKeys(ui.applyScopes));
    const isNode = !!ui.nodeMode?.checked;
    const activeSec = state.reflectActiveSidebarSection;
    let checkedCount = 0;
    const putSections = SECTION_DEFS.filter((d) => d.put);

    const items = putSections.map((def) => {
      const count = diffCounts[def.key] || null;
      const checked = selectedScopes.has(def.key);
      if (checked) checkedCount++;
      const isActive = activeSec === def.key;
      const badgeText = count ? `${count.total}` : '-';
      const badgeCls = count && count.total > 0 ? 'sec-badge has-diff' : 'sec-badge';
      const disabledAttr = isNode ? 'disabled' : '';
      return `<div class="sidebar-item${isActive ? ' active' : ''}" data-sidebar-sec="${def.key}">
        <input type="checkbox" class="sec-check" value="${def.key}" ${checked ? 'checked' : ''} ${disabledAttr} data-apply-scope>
        <span class="sec-label">${esc(def.label)}</span>
        <span class="${badgeCls}">${badgeText}</span>
      </div>`;
    }).join('');

    container.innerHTML = items;
    const sidebarCount = document.getElementById('u_sidebarCount');
    if (sidebarCount) sidebarCount.textContent = `${checkedCount} / ${putSections.length}`;

    syncApplyScopesFromSidebar();
  }

  function syncApplyScopesFromSidebar() {
    const sidebarChecks = document.querySelectorAll('#u_reflectSidebarSections [data-apply-scope]');
    const selected = new Set();
    sidebarChecks.forEach((c) => { if (c.checked) selected.add(c.value); });
    const scopeChecks = [...ui.applyScopes.querySelectorAll('input[type="checkbox"]')];
    scopeChecks.forEach((c) => { c.checked = selected.has(c.value); });
  }

  function syncSidebarFromApplyScopes() {
    const selectedScopes = new Set(selectedScopeKeys(ui.applyScopes));
    const sidebarChecks = document.querySelectorAll('#u_reflectSidebarSections [data-apply-scope]');
    sidebarChecks.forEach((c) => { c.checked = selectedScopes.has(c.value); });
    const putSections = SECTION_DEFS.filter((d) => d.put);
    const sidebarCount = document.getElementById('u_sidebarCount');
    if (sidebarCount) sidebarCount.textContent = `${selectedScopes.size} / ${putSections.length}`;
  }

  function renderReflectMainPanel() {
    const overview = document.getElementById('u_reflectOverview');
    if (!overview) return;
    const isNode = !!ui.nodeMode?.checked;
    if (isNode) {
      overview.style.display = 'none';
      return;
    }
    overview.style.display = 'block';
    const activeSec = state.reflectActiveSidebarSection;
    const diffCounts = getDiffCountsBySection();
    const selectedScopes = new Set(selectedScopeKeys(ui.applyScopes));

    if (activeSec) {
      const def = SECTION_DEFS.find((d) => d.key === activeSec);
      if (!def) { overview.innerHTML = ''; return; }
      const count = diffCounts[activeSec] || { total: 0, added: 0, removed: 0, changed: 0 };
      const rows = (state.lastDiffRows || []).filter((r) => r.sectionKey === activeSec);
      const topPaths = rows.slice(0, 12).map((r) => {
        const cls = r.type === 'added' ? '#166534' : (r.type === 'removed' ? '#b91c1c' : '#92400e');
        const typeLabel = r.moved ? `${r.type}(moved)` : (r.type || '-');
        return `<tr><td style="color:${cls};font-weight:700;width:80px">${esc(typeLabel)}</td><td style="font-family:monospace;font-size:10px;color:#64748b;word-break:break-all">${esc(r.path || '-')}</td></tr>`;
      }).join('');
      const moreCount = rows.length > 12 ? rows.length - 12 : 0;

      overview.innerHTML = `
        <div class="sec-preview">
          <div class="sec-preview-title">${esc(def.label)}</div>
          <div class="sec-diff-summary">
            <span class="sec-diff-pill">差分 ${count.total}件</span>
            <span class="sec-diff-pill" style="color:#166534">追加 ${count.added}</span>
            <span class="sec-diff-pill" style="color:#b91c1c">削除 ${count.removed}</span>
            <span class="sec-diff-pill" style="color:#92400e">変更 ${count.changed}</span>
          </div>
          ${count.total > 0 ? `<div style="margin-top:10px;max-height:200px;overflow:auto">
            <table><thead><tr><th style="width:80px">Type</th><th>Path</th></tr></thead><tbody>${topPaths}</tbody></table>
            ${moreCount > 0 ? `<div class="muted" style="padding:6px 8px;text-align:center">他 ${moreCount}件...</div>` : ''}
          </div>` : '<div class="muted" style="margin-top:8px">差分なし（または差分比較未実行）</div>'}
        </div>`;
      if (ui.reflectMainTitle) ui.reflectMainTitle.textContent = def.label;
    } else {
      const putSections = SECTION_DEFS.filter((d) => d.put);
      const cards = putSections.filter((def) => selectedScopes.has(def.key)).map((def) => {
        const count = diffCounts[def.key] || { total: 0, added: 0, removed: 0, changed: 0 };
        const barTotal = Math.max(count.total, 1);
        return `<div class="sec-overview-card" data-sidebar-nav="${def.key}">
          <div class="soc-label">${esc(def.label)}</div>
          <div class="soc-stats">${count.total > 0 ? `差分 ${count.total}件 (A:${count.added} R:${count.removed} C:${count.changed})` : '差分なし'}</div>
          ${count.total > 0 ? `<div class="soc-bar">
            ${count.added > 0 ? `<div class="fill added" style="width:${(count.added / barTotal) * 100}%;display:inline-block"></div>` : ''}
            ${count.removed > 0 ? `<div class="fill removed" style="width:${(count.removed / barTotal) * 100}%;display:inline-block"></div>` : ''}
            ${count.changed > 0 ? `<div class="fill changed" style="width:${(count.changed / barTotal) * 100}%;display:inline-block"></div>` : ''}
          </div>` : ''}
        </div>`;
      }).join('');

      const totalDiff = Object.values(diffCounts).reduce((s, c) => s + c.total, 0);
      overview.innerHTML = `
        <div class="sec-preview" style="border-color:#c7d2fe;background:#eef2ff">
          <div class="sec-preview-title" style="color:#4338ca">反映概要</div>
          <div class="sec-diff-summary">
            <span class="sec-diff-pill" style="border-color:#c7d2fe">選択セクション ${selectedScopes.size}件</span>
            <span class="sec-diff-pill" style="border-color:#c7d2fe">総差分 ${totalDiff}件</span>
          </div>
        </div>
        ${selectedScopes.size > 0 ? `<div class="sec-overview-grid">${cards}</div>` : '<div class="muted" style="text-align:center;padding:20px">反映セクションを左のサイドバーから選択してください</div>'}`;
      if (ui.reflectMainTitle) ui.reflectMainTitle.textContent = '反映概要';
    }
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

  function makeApplyPlanSignature(mode, payload) {
    return stableStringify({
      mode,
      targetApp: payload?.targetApp || '',
      targetGuest: payload?.targetGuest || '',
      sourceApp: payload?.sourceApp || '',
      sourceGuest: payload?.sourceGuest || '',
      scopes: payload?.scopes || [],
      nodes: payload?.nodes || [],
      lookupMap: payload?.lookupMap || ''
    });
  }

  function markApplyPlan(signature, mode, totalReq, lines) {
    state.lastApplyPlan = {
      signature,
      mode,
      totalReq: Number(totalReq || 0),
      createdAt: Date.now(),
      summary: (lines || []).slice(0, 16).join('\n'),
      logs: lines || []
    };
  }

  async function ensureApplyPlanApproved(signature, mode, planRunner) {
    const plan = state.lastApplyPlan;
    const valid = !!plan && plan.signature === signature && plan.mode === mode;
    if (!valid) {
      await planRunner();
    }
    const currentPlan = state.lastApplyPlan;
    if (!currentPlan) return false;
    return showInlineConfirmation(currentPlan);
  }

  function showInlineConfirmation(plan) {
    return new Promise((resolve) => {
      const stamp = new Date(plan.createdAt).toLocaleString();
      const planText = (plan.logs || []).join('\n') || '(プラン詳細なし)';
      ui.result.innerHTML = `<div class="plan-confirm-panel">
        <div style="font-weight:700;font-size:13px;margin-bottom:8px">反映プラン確認</div>
        <div class="plan-summary">${esc(planText)}</div>
        <div class="plan-actions">
          <span class="plan-meta">予定リクエスト: ${plan.totalReq || 0}件 | 作成: ${esc(stamp)}</span>
          <button class="btn sub" id="u_planCancel">キャンセル</button>
          <button class="btn ok" id="u_planExecute">このまま実行</button>
        </div>
      </div>`;
      ui.result.scrollTop = 0;
      const cleanup = () => {
        const execBtn = document.getElementById('u_planExecute');
        const cancelBtn = document.getElementById('u_planCancel');
        if (execBtn) execBtn.removeEventListener('click', onExec);
        if (cancelBtn) cancelBtn.removeEventListener('click', onCancel);
      };
      const onExec = () => { cleanup(); resolve(true); };
      const onCancel = () => { cleanup(); ui.result.innerHTML = ''; resolve(false); };
      document.getElementById('u_planExecute')?.addEventListener('click', onExec);
      document.getElementById('u_planCancel')?.addEventListener('click', onCancel);
    });
  }

  function resolveBackupScopes(c) {
    if (ui.nodeMode.checked) {
      if (!state.reflectRows.length) loadReflectRowsFromLastDiff();
      const rows = getSelectedReflectRows();
      if (!rows.length) throw new Error('バックアップ対象ノードが未選択です');
      const scopes = [...new Set(rows.map((r) => r.sectionKey).filter(Boolean))];
      if (!scopes.length) throw new Error('バックアップ対象セクションを判定できません');
      return scopes;
    }
    const baseScopes = selectedScopeKeys(ui.applyScopes);
    if (!baseScopes.length) throw new Error('反映セクションを選択してください');
    return resolveApplyScopes(baseScopes);
  }

  async function backupTargetPreviewSettings(c, scopes, options = {}) {
    if (!c.target.appId) throw new Error('Target App ID を入力してください');
    const actualScopes = Array.isArray(scopes) && scopes.length ? scopes : resolveBackupScopes(c);
    const target = { ...c.target, preview: true };
    setStatus(`バックアップ取得中... (${actualScopes.length}セクション)`);
    const bundle = await fetchBundle({
      ...target,
      sections: actualScopes,
      onProgress: (p, l) => setStatus(`バックアップ取得中 ${Math.round(p * 100)}% (${l})`)
    });
    const payload = {
      generatedAt: new Date().toISOString(),
      mode: 'target-preview-backup',
      scopes: actualScopes,
      target: {
        appId: target.appId,
        guestId: target.guestId || '',
        preview: true
      },
      bundle
    };
    const filename = `target_preview_backup_app${target.appId}_${nowStamp()}.json`;
    downloadText(filename, JSON.stringify(payload, null, 2), 'application/json');
    if (!options?.silentStatus) setStatus(`Target(Preview)バックアップ保存: ${filename}`);
    if (ui.backupStatus) {
      ui.backupStatus.textContent = `\u2705 バックアップ保存済: ${filename} (${actualScopes.length}セクション, ${new Date().toLocaleTimeString()})`;
      ui.backupStatus.style.display = 'block';
    }
    return { filename, payload };
  }

  function saveCurrentDialogState() {
    saveDialogState({
      activeTab: state.activeTab,
      sourceAppId: ui.sourceApp.value.trim(),
      sourceGuestId: ui.sourceGuest.value.trim(),
      sourcePreview: ui.sourcePreview.checked,
      targetAppId: ui.targetApp.value.trim(),
      targetGuestId: ui.targetGuest.value.trim(),
      targetPreview: ui.targetPreview.checked,
      lookupMap: ui.lookupMap.value.trim(),
      ignoreKeys: ui.ignoreKeys.value.trim(),
      ignorePresetFieldOrder: !!ui.ignorePresetFieldOrder?.checked,
      ignorePresetMeta: !!ui.ignorePresetMeta?.checked,
      ignorePresetLabelName: !!ui.ignorePresetLabelName?.checked,
      diffSearch: ui.diffSearch.value.trim(),
      charDiff: ui.charDiff.checked,
      diffTheme: state.diffViewTheme,
      diffScopes: selectedScopeKeys(ui.diffScopes),
      applyScopes: selectedScopeKeys(ui.applyScopes),
      applyDiffOnly: ui.applyDiffOnly.checked,
      autoBackupPreview: ui.autoBackupPreview.checked,
      stopOnError: ui.stopOnError.checked,
      nodeMode: ui.nodeMode.checked,
      doDeploy: ui.doDeploy.checked,
      overwriteField: ui.overwriteField.checked,
      deployField: ui.deployField.checked,
      settingsExportAppIds: ui.settingsExportAppIds.value.trim(),
      settingsExportSearchKeyword: ui.settingsExportSearchKeyword.value.trim(),
      settingsExportGuest: ui.settingsExportGuest.value.trim(),
      settingsExportPreview: ui.settingsExportPreview.checked,
      settingsExportScopes: selectedScopeKeys(ui.settingsExportScopes)
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
    if (saved.ignorePresetFieldOrder != null && ui.ignorePresetFieldOrder) ui.ignorePresetFieldOrder.checked = !!saved.ignorePresetFieldOrder;
    if (saved.ignorePresetMeta != null && ui.ignorePresetMeta) ui.ignorePresetMeta.checked = !!saved.ignorePresetMeta;
    if (saved.ignorePresetLabelName != null && ui.ignorePresetLabelName) ui.ignorePresetLabelName.checked = !!saved.ignorePresetLabelName;
    if (saved.diffSearch != null) ui.diffSearch.value = String(saved.diffSearch);
    if (saved.charDiff != null) ui.charDiff.checked = !!saved.charDiff;
    if (saved.diffTheme === 'dark' || saved.diffTheme === 'light') state.diffViewTheme = saved.diffTheme;
    if (saved.applyDiffOnly != null) ui.applyDiffOnly.checked = !!saved.applyDiffOnly;
    if (saved.autoBackupPreview != null) ui.autoBackupPreview.checked = !!saved.autoBackupPreview;
    if (saved.stopOnError != null) ui.stopOnError.checked = !!saved.stopOnError;
    if (saved.nodeMode != null) ui.nodeMode.checked = !!saved.nodeMode;
    if (saved.doDeploy != null) ui.doDeploy.checked = !!saved.doDeploy;
    if (saved.overwriteField != null) ui.overwriteField.checked = !!saved.overwriteField;
    if (saved.deployField != null) ui.deployField.checked = !!saved.deployField;
    if (saved.settingsExportAppIds != null) ui.settingsExportAppIds.value = String(saved.settingsExportAppIds);
    if (saved.settingsExportSearchKeyword != null) ui.settingsExportSearchKeyword.value = String(saved.settingsExportSearchKeyword);
    if (saved.settingsExportGuest != null) ui.settingsExportGuest.value = String(saved.settingsExportGuest);
    if (saved.settingsExportPreview != null) ui.settingsExportPreview.checked = !!saved.settingsExportPreview;

    const markChecks = (container, selected) => {
      if (!Array.isArray(selected)) return;
      const set = new Set(selected);
      [...container.querySelectorAll('input[type="checkbox"]')].forEach((c) => {
        c.checked = set.has(c.value);
      });
    };
    markChecks(ui.diffScopes, saved.diffScopes);
    markChecks(ui.applyScopes, saved.applyScopes);
    markChecks(ui.settingsExportScopes, saved.settingsExportScopes);
    if (saved.activeTab && ui.tabs.some((t) => t.dataset.tab === saved.activeTab)) {
      switchTab(saved.activeTab, { persist: false });
    }
    applyIgnorePresetKeysToInput();
    renderIgnoreKeyChips();
    renderLookupMapRows();
  }

  function parseBundleLikeObject(raw, side) {
    let obj = raw;
    if (obj && typeof obj === 'object' && obj.source && obj.target) {
      obj = side === 'source' ? obj.source : obj.target;
    }
    return ensureBundleShape(obj);
  }

  function currentDiffSignature() {
    const c = commonParams();
    return stableStringify({
      source: c.source,
      target: c.target,
      scopes: selectedScopeKeys(ui.diffScopes),
      ignoreKeys: ui.ignoreKeys.value.trim(),
      importedSource: !!state.importedSourceBundle,
      importedTarget: !!state.importedTargetBundle
    });
  }

  async function ensureDiffPreparedForReflect() {
    const sig = currentDiffSignature();
    if (state.lastDiffAt && state.lastDiffSignature === sig) return;
    setStatus('差分が未作成または条件変更のため、自動で差分比較を実行します...');
    await runDiff();
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
    state.lastDiffAt = null;
    state.lastDiffRows = [];
    state.lastDiffSignature = '';
    state.lastApplyPlan = null;
    state.reflectRows = [];
    state.reflectSelectedIds = new Set();
    state.reflectNodeModes = {};
    state.reflectUndoStack = [];
    state.reflectRedoStack = [];
    renderResultRows([]);
    renderReflectNodeList();
    renderBundleState();
    renderReflectSidebar();
    renderReflectMainPanel();
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
    state.lastDiffSignature = currentDiffSignature();
    state.lastApplyPlan = null;
    state.diffSectionVisibleCounts = {};
    renderResultRows(rows);
    if (ui.nodeMode.checked || state.reflectRows.length) {
      try {
        loadReflectRowsFromLastDiff();
      } catch (e) {
        console.warn(e);
      }
    }
    const s = summarizeRows(rows);
    const sev = summarizeSeverity(rows);
    renderReflectSidebar();
    renderReflectMainPanel();
    setStatus(`差分比較完了: ${s.total}件 (A:${s.added} R:${s.removed} C:${s.changed} Mv:${s.moved} / H:${sev.high} Med:${sev.medium} L:${sev.low})`);
  }

  async function runPrefetchCommonData() {
    const c = commonParams();
    if (!c.source.appId) throw new Error('Source App ID を入力してください');
    if (!c.target.appId) throw new Error('Target App ID を入力してください');
    const sections = SECTION_DEFS.map((d) => d.key);

    setStatus('共通データ取得: Source...');
    const source = await fetchBundle({
      ...c.source,
      sections,
      onProgress: (p, l) => setStatus(`共通データ取得 Source ${Math.round(p * 100)}% (${l})`)
    });
    setStatus('共通データ取得: Target...');
    const target = await fetchBundle({
      ...c.target,
      sections,
      onProgress: (p, l) => setStatus(`共通データ取得 Target ${Math.round(p * 100)}% (${l})`)
    });

    state.lastSourceBundle = source;
    state.lastTargetBundle = target;
    state.lastDiffAt = null;
    state.lastDiffRows = [];
    state.lastDiffSignature = '';
    state.lastApplyPlan = null;
    state.reflectRows = [];
    state.reflectSelectedIds = new Set();
    state.reflectNodeModes = {};
    state.reflectUndoStack = [];
    state.reflectRedoStack = [];
    renderResultRows([]);
    renderReflectNodeList();
    renderBundleState();
    renderReflectSidebar();
    renderReflectMainPanel();

    const sourceErr = Object.values(source.sections || {}).filter((x) => x && x._fetchError).length;
    const targetErr = Object.values(target.sections || {}).filter((x) => x && x._fetchError).length;
    setStatus(`共通データ取得完了: Source ${sections.length - sourceErr}/${sections.length}, Target ${sections.length - targetErr}/${sections.length}`);
  }

  async function runDiffAndPreviewPlan() {
    await runDiff();
    switchTab('reflect');
    await runPreviewApplyPlan();
    setStatus('差分比較→反映プラン確認 完了');
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
    if (!state.lastSourceBundle || !state.lastTargetBundle) throw new Error('先に差分比較を実行してください');
    const scopes = selectedScopeKeys(ui.diffScopes);
    const html = buildDiffHtml(state.lastSourceBundle, state.lastTargetBundle, state.lastDiffRows || [], scopes, ui.ignoreKeys.value);
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

  function addAppIdToSettingsExport(appId, appName) {
    if (!/^\d+$/.test(String(appId || '').trim())) return;
    const set = new Set(parseAppIdList(ui.settingsExportAppIds.value));
    set.add(String(appId).trim());
    ui.settingsExportAppIds.value = [...set].join(', ');
    saveCurrentDialogState();
    setStatus(`App ${appId}${appName ? ` (${appName})` : ''} を追加しました`);
  }

  function renderSettingsExportSearchResults(apps) {
    const list = Array.isArray(apps) ? apps : [];
    if (!list.length) {
      ui.settingsExportSearchResult.innerHTML = '<div style="padding:10px;font-size:12px;color:#64748b">検索結果なし</div>';
      return;
    }
    const rows = list.map((app) => `<tr>
      <td>${esc(String(app.appId || ''))}</td>
      <td title="${esc(String(app.name || ''))}">${esc(String(app.name || ''))}</td>
      <td style="text-align:right"><button class="btn sub" style="padding:4px 8px;font-size:10px" data-add-settings-app="${esc(String(app.appId || ''))}" data-add-settings-name="${esc(String(app.name || ''))}">追加</button></td>
    </tr>`).join('');
    ui.settingsExportSearchResult.innerHTML = `<table>
      <thead><tr><th style="width:90px">App ID</th><th>アプリ名</th><th style="width:70px"></th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
  }

  async function runSettingsExportSearchApps() {
    const keyword = ui.settingsExportSearchKeyword.value.trim();
    const guestId = ui.settingsExportGuest.value.trim();
    const prefix = buildApiPrefix(guestId, false);
    const params = { limit: 100 };
    if (keyword) params.name = keyword;
    setStatus('アプリ検索中...');
    const res = await apiGet(prefix, '/apps.json', params);
    const apps = (res.apps || [])
      .map((a) => ({ appId: String(a.appId || ''), name: String(a.name || '') }))
      .filter((a) => /^\d+$/.test(a.appId))
      .sort((a, b) => Number(a.appId) - Number(b.appId));
    renderSettingsExportSearchResults(apps);
    setStatus(`アプリ検索完了: ${apps.length}件`);
  }

  function renderSettingsExportSummary(rows, scopes) {
    const labels = scopes.map((k) => SECTION_DEFS.find((s) => s.key === k)?.label || k).join(', ');
    const body = rows.map((r) => `<tr>
      <td>${esc(r.appId)}</td>
      <td>${esc(String(r.okCount))}</td>
      <td>${esc(String(r.ngCount))}</td>
      <td>${esc(r.note || '-')}</td>
    </tr>`).join('');
    return `
      <div style="padding:8px 10px;border-bottom:1px solid #e2e8f0;font-size:11px;background:#f8fafc">Scopes: ${esc(labels || '-')}</div>
      <table>
        <thead><tr><th>App ID</th><th>取得OK</th><th>取得NG</th><th>メモ</th></tr></thead>
        <tbody>${body || '<tr><td colspan="4">結果なし</td></tr>'}</tbody>
      </table>
    `;
  }

  async function runSettingsExport(mode) {
    const appIds = parseAppIdList(ui.settingsExportAppIds.value);
    if (!appIds.length) throw new Error('対象App IDを1件以上入力してください');
    const scopes = selectedScopeKeys(ui.settingsExportScopes);
    if (!scopes.length) throw new Error('取得対象セクションを選択してください');

    const guestId = ui.settingsExportGuest.value.trim();
    const preview = !!ui.settingsExportPreview.checked;
    saveCurrentDialogState();

    const bundles = [];
    const rows = [];
    for (let i = 0; i < appIds.length; i++) {
      const appId = appIds[i];
      setStatus(`設定取得中 ${i + 1}/${appIds.length}: App ${appId}`);
      const bundle = await fetchBundle({
        appId,
        guestId,
        preview,
        sections: scopes,
        onProgress: (p, l) => setStatus(`設定取得中 ${i + 1}/${appIds.length}: App ${appId} ${Math.round(p * 100)}% (${l})`)
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

    ui.settingsExportResult.innerHTML = renderSettingsExportSummary(rows, scopes);

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
      await loadJSZip();
      const zip = new JSZip();
      zip.file('manifest.json', JSON.stringify({
        generatedAt: payload.generatedAt,
        guestId: payload.guestId,
        preview: payload.preview,
        scopes: payload.scopes,
        appCount: bundles.length
      }, null, 2));
      for (const bundle of bundles) {
        const suffix = `${guestId ? `_guest_${guestId}` : ''}${preview ? '_preview' : '_live'}`;
        const name = `app_${bundle.appId}${suffix}.json`;
        zip.file(name, JSON.stringify(bundle, null, 2));
      }
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      downloadBlob(`settings_export_${bundles.length}apps_${nowStamp()}.zip`, zipBlob);
      setStatus(`設定一括取得ZIPを保存しました（${bundles.length} apps）`);
      return;
    }

    downloadText(`settings_export_${bundles.length}apps_${nowStamp()}.json`, JSON.stringify(payload, null, 2), 'application/json');
    setStatus(`設定一括取得JSONを保存しました（${bundles.length} apps）`);
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
    if (ui.nodeFilterSection) {
      const sections = [...new Set(rows.map((r) => r.sectionKey).filter(Boolean))];
      ui.nodeFilterSection.innerHTML = '<option value="">全セクション</option>' +
        sections.map((k) => {
          const label = SECTION_DEFS.find((d) => d.key === k)?.label || k;
          return `<option value="${esc(k)}">${esc(label)}</option>`;
        }).join('');
    }
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
    const keyword = (ui.nodeSearch?.value || '').toLowerCase();
    const filterSec = ui.nodeFilterSection?.value || '';
    const filterType = ui.nodeFilterType?.value || '';
    const filterSev = ui.nodeFilterSeverity?.value || '';
    const filtered = rows.filter((r) => {
      if (keyword && !(r.path || '').toLowerCase().includes(keyword)
          && !(r.section || '').toLowerCase().includes(keyword)
          && !(r.sectionKey || '').toLowerCase().includes(keyword)) return false;
      if (filterSec && r.sectionKey !== filterSec) return false;
      if (filterType && r.type !== filterType) return false;
      if (filterSev && (r.severity || 'low').toUpperCase() !== filterSev) return false;
      return true;
    });
    const selected = state.reflectSelectedIds || new Set();
    const selectedCount = rows.filter((r) => selected.has(r._id)).length;
    const selectedRows = rows.filter((r) => selected.has(r._id));
    const srcCount = selectedRows.filter((r) => reflectRowModeById(r._id) === 'src').length;
    const tgtCount = selectedRows.length - srcCount;
    const sev = summarizeSeverity(selectedRows);
    const header = `<div style="padding:8px 10px;border-bottom:1px solid #e2e8f0;font-size:11px;background:#f8fafc">候補 ${rows.length}件 / 表示 ${filtered.length}件 / 選択 ${selectedCount}件 / Src ${srcCount} / Tgt ${tgtCount} / H:${sev.high} M:${sev.medium} L:${sev.low}</div>`;
    const body = filtered.slice(0, 1200).map((r) => {
      const cls = r.type === 'added' ? '#166534' : (r.type === 'removed' ? '#b91c1c' : '#92400e');
      const checked = selected.has(r._id) ? 'checked' : '';
      const mode = reflectRowModeById(r._id);
      const typeLabel = r.moved ? `${r.type}(moved)` : (r.type || '-');
      const severity = String(r.severity || 'low').toUpperCase();
      const sevBg = severity === 'HIGH' ? '#fee2e2' : (severity === 'MEDIUM' ? '#fef3c7' : '#dbeafe');
      const sevColor = severity === 'HIGH' ? '#991b1b' : (severity === 'MEDIUM' ? '#92400e' : '#1d4ed8');
      return `<tr>
        <td><input type="checkbox" data-node-id="${esc(r._id)}" ${checked}></td>
        <td><button type="button" data-node-mode="${esc(r._id)}" style="border:1px solid #cbd5e1;border-radius:6px;padding:2px 6px;font-size:10px;background:${mode === 'src' ? '#dbeafe' : '#dcfce7'};color:${mode === 'src' ? '#1d4ed8' : '#166534'};font-weight:700;cursor:pointer">${mode === 'src' ? 'Src' : 'Tgt'}</button></td>
        <td><span style="display:inline-block;padding:1px 6px;border-radius:999px;background:${sevBg};color:${sevColor};font-size:10px;font-weight:700">${severity}</span></td>
        <td>${esc(r.section || '-')}</td>
        <td style="color:${cls};font-weight:700">${esc(typeLabel)}</td>
        <td title="${esc(r.path || '-')}">${esc(r.path || '-')}</td>
      </tr>`;
    }).join('');
    ui.reflectNodeList.innerHTML = `${header}<table>
      <thead><tr><th style="width:52px">Use</th><th style="width:66px">Mode</th><th style="width:82px">Severity</th><th>Section</th><th>Type</th><th>Path</th></tr></thead>
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
    await ensureDiffPreparedForReflect();
    const c = commonParams();
    if (!c.target.appId) throw new Error('Target App ID を入力してください');
    if (!state.reflectRows.length) loadReflectRowsFromLastDiff();
    const rows = getSelectedReflectRows();
    if (!rows.length) throw new Error('反映ノードを選択してください');
    const lookupMap = parseLookupMapInput(ui.lookupMap.value);
    const prefix = buildApiPrefix(c.target.guestId, true);
    const app = c.target.appId;
    const nodeSigRows = rows
      .map((r) => ({ id: r._id, sectionKey: r.sectionKey, mode: reflectRowModeById(r._id), type: r.type, path: r.path }))
      .sort((a, b) => String(a.id).localeCompare(String(b.id)));
    const planSignature = makeApplyPlanSignature('nodes', {
      targetApp: c.target.appId,
      targetGuest: c.target.guestId,
      sourceApp: c.source.appId,
      sourceGuest: c.source.guestId,
      nodes: nodeSigRows,
      lookupMap: ui.lookupMap.value.trim()
    });

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
    markApplyPlan(planSignature, 'nodes', totalReq, lines);

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
    await ensureDiffPreparedForReflect();
    const c = commonParams();
    if (!c.target.appId) throw new Error('Target App ID を入力してください');
    if (!state.reflectRows.length) loadReflectRowsFromLastDiff();
    const rows = getSelectedReflectRows();
    if (!rows.length) throw new Error('反映ノードを選択してください');
    const lookupMap = parseLookupMapInput(ui.lookupMap.value);
    const stopOnError = !!ui.stopOnError.checked;
    saveCurrentDialogState();
    const nodeSigRows = rows
      .map((r) => ({ id: r._id, sectionKey: r.sectionKey, mode: reflectRowModeById(r._id), type: r.type, path: r.path }))
      .sort((a, b) => String(a.id).localeCompare(String(b.id)));
    const planSignature = makeApplyPlanSignature('nodes', {
      targetApp: c.target.appId,
      targetGuest: c.target.guestId,
      sourceApp: c.source.appId,
      sourceGuest: c.source.guestId,
      nodes: nodeSigRows,
      lookupMap: ui.lookupMap.value.trim()
    });
    const approved = await ensureApplyPlanApproved(planSignature, 'nodes', runPreviewApplyPlanNodes);
    if (!approved) {
      setStatus('反映をキャンセルしました');
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
    if (ui.autoBackupPreview?.checked) {
      const backupScopes = [...new Set(rows.map((r) => r.sectionKey).filter(Boolean))];
      const backup = await backupTargetPreviewSettings(c, backupScopes, { silentStatus: true });
      logs.push(`バックアップ保存: ${backup.filename}`);
    }
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
        renderProgressLog(logs, { phase: 'ノード反映実行中', current: i, total: sectionKeys.length });
        continue;
      }

      setStatus(`ノード反映中 ${i + 1}/${sectionKeys.length}: ${def.label}`);
      renderProgressLog(logs, { phase: 'ノード反映実行中', current: i, total: sectionKeys.length });
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

    appendProgressSummary(logs);
    renderProgressLog(logs, { phase: 'ノード反映完了' });
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
    if (!diffSet.size) throw new Error('「前回差分のあるセクションのみ反映」がONのため先に差分比較が必要です。差分なしで反映する場合はこのチェックをOFFにしてください');
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

  function renderProgressLog(logs, options = {}) {
    const { phase, current, total } = options;
    const progressBar = (typeof current === 'number' && total > 0)
      ? `<div style="height:6px;background:#e2e8f0;border-radius:3px;margin:8px 10px 0"><div style="width:${Math.round(((current + 1) / total) * 100)}%;height:100%;background:#3b82f6;border-radius:3px;transition:width .3s"></div></div>`
      : '';
    const phaseLabel = phase
      ? `<div style="font-weight:700;padding:8px 10px;border-bottom:1px solid #e2e8f0;font-size:13px">${esc(phase)}</div>`
      : '';
    const colored = logs.map((line) => {
      if (line.startsWith('OK ')) return `<span style="color:#166534">${esc(line)}</span>`;
      if (line.startsWith('NG ')) return `<span style="color:#b91c1c">${esc(line)}</span>`;
      if (line.startsWith('SKIP ')) return `<span style="color:#92400e">${esc(line)}</span>`;
      if (line.startsWith('START ')) return `<span style="color:#1d4ed8">${esc(line)}</span>`;
      if (line.startsWith('PLAN ')) return `<span style="color:#1d4ed8">${esc(line)}</span>`;
      return esc(line);
    }).join('\n');
    ui.result.innerHTML = `${phaseLabel}${progressBar}<pre style="margin:0;padding:10px;font-size:12px;white-space:pre-wrap">${colored}</pre>`;
    ui.result.scrollTop = ui.result.scrollHeight;
  }

  function appendProgressSummary(logs) {
    const ok = logs.filter((l) => l.startsWith('OK ')).length;
    const ng = logs.filter((l) => l.startsWith('NG ')).length;
    const skip = logs.filter((l) => l.startsWith('SKIP ')).length;
    logs.push('');
    logs.push(`=== 完了: OK ${ok} / NG ${ng} / SKIP ${skip} ===`);
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
    await ensureDiffPreparedForReflect();
    const c = commonParams();
    if (!c.target.appId) throw new Error('Target App ID を入力してください');
    const lookupMap = parseLookupMapInput(ui.lookupMap.value);
    const baseScopes = selectedScopeKeys(ui.applyScopes);
    if (!baseScopes.length) throw new Error('反映セクションを選択してください');
    const scopes = resolveApplyScopes(baseScopes);
    saveCurrentDialogState();
    const planSignature = makeApplyPlanSignature('section', {
      targetApp: c.target.appId,
      targetGuest: c.target.guestId,
      sourceApp: c.source.appId,
      sourceGuest: c.source.guestId,
      scopes,
      lookupMap: ui.lookupMap.value.trim()
    });

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
    markApplyPlan(planSignature, 'section', totalReq, logs);
    ui.result.innerHTML = `<pre style="margin:0;padding:10px;font-size:12px;white-space:pre-wrap">${esc(logs.join('\n'))}</pre>`;
    setStatus('反映プラン確認完了');
  }

  async function runBackupTargetPreview() {
    const c = commonParams();
    const scopes = resolveBackupScopes(c);
    await backupTargetPreviewSettings(c, scopes);
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
    await ensureDiffPreparedForReflect();
    const c = commonParams();
    if (!c.target.appId) throw new Error('Target App ID を入力してください');
    const lookupMap = parseLookupMapInput(ui.lookupMap.value);
    const baseScopes = selectedScopeKeys(ui.applyScopes);
    if (!baseScopes.length) throw new Error('反映セクションを選択してください');
    const scopes = resolveApplyScopes(baseScopes);
    const planSignature = makeApplyPlanSignature('section', {
      targetApp: c.target.appId,
      targetGuest: c.target.guestId,
      sourceApp: c.source.appId,
      sourceGuest: c.source.guestId,
      scopes,
      lookupMap: ui.lookupMap.value.trim()
    });
    const approved = await ensureApplyPlanApproved(planSignature, 'section', runPreviewApplyPlan);
    if (!approved) {
      setStatus('反映をキャンセルしました');
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
    if (ui.autoBackupPreview?.checked) {
      const backup = await backupTargetPreviewSettings(c, scopes, { silentStatus: true });
      logs.push(`バックアップ保存: ${backup.filename}`);
    }
    logs.push('');

    for (let i = 0; i < scopes.length; i++) {
      const secKey = scopes[i];
      const def = SECTION_DEFS.find((x) => x.key === secKey);
      if (!def || !def.put) continue;
      const sourceSec = deepClone(sourceBundle.sections[secKey]);
      if (!sourceSec || sourceSec._fetchError) {
        logs.push(`SKIP ${def.label}: source未取得`);
        renderProgressLog(logs, { phase: 'プレビュー反映実行中', current: i, total: scopes.length });
        continue;
      }

      setStatus(`反映中 ${i + 1}/${scopes.length}: ${def.label}`);
      renderProgressLog(logs, { phase: 'プレビュー反映実行中', current: i, total: scopes.length });
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

    appendProgressSummary(logs);
    renderProgressLog(logs, { phase: 'プレビュー反映完了' });
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
    const done = await runAdvancedDesignExporter({
      appId: c.source.appId,
      guestId: c.source.guestId
    });
    if (done === false) {
      setStatus('設計書Excel出力をキャンセルしました');
      return;
    }
    setStatus('設計書Excel出力完了');
  }

  async function runAdvancedDesignExporter(params = {}) {
    const sourceAppId = Number(params.appId);
    if (!sourceAppId) throw new Error('有効なSource App IDが指定されませんでした。');
    const sourceGuestId = String(params.guestId || '').trim();

      /**
       * @file kintone アプリ設計書エクスポーター v2.0
       * 
       * === v2.0 改善・追加点 ===
       * [改善] UIプログレスバー（視覚的な進捗表示）
       * [改善] API同時実行制御（セマフォによる並列数制限）
       * [改善] エクスポートオプションダイアログ（出力シート選択UI）
       * [改善] 項目定義の大幅強化（ルックアップ/関連レコード/計算式の詳細）
       * [改善] ビュー詳細の強化（フィールドコード→ラベル名解決）
       * [改善] プロセス管理の遷移マトリクス（状態遷移を表形式で可視化）
       * [改善] エラーレポート（失敗API一覧をサマリーに表示）
       * [改善] バグ修正（未使用関数削除、重複権限シート統合、番号採番修正）
       * [改善] 条件付きハイライト強化（必須フィールド・警告のセル色分け）
       * [追加] フィールド依存関係マップシート
       * [追加] レコード件数のサマリー表示
       * [追加] Webhook設定シート
       * [追加] アプリグラフ設定の詳細出力
       * [追加] シート名の安全性チェック強化
       */
    
      // ═══════════════════ 設定 ═══════════════════
      const CONFIG = {
        SHEETLIB_PRIMARY_URL: 'https://cdn.jsdelivr.net/npm/xlsx-js-style@1.2.0/dist/xlsx.min.js',
        SHEETLIB_FALLBACK_URL: 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js',
        MAX_RETRIES: 3,
        RETRY_DELAY: 1000,
        API_CONCURRENCY: 4,       // 同時APIリクエスト数上限
        FONT_NAME: 'Meiryo',
        STYLES: {
          ENABLE_BORDER: true,
          ENABLE_HEADER_FILL: true,
          ENABLE_ZEBRA: true,
          ENABLE_AUTOFILTER: true,
          FREEZE_HEADER: true,
          ENABLE_TITLE_STYLING: true,
          ENABLE_CONDITIONAL_FORMAT: true,
          ENABLE_OUTLINE: true
        },
        DEFAULT_COL_WIDTH: 12,
        MAX_COL_WIDTH: 80,
        MIN_COL_WIDTH: 8,
        COLORS: {
          HEADER_BG: 'FF4A90E2',
          HEADER_TEXT: 'FFFFFFFF',
          TITLE_BG: 'FF2E5C8A',
          TITLE_TEXT: 'FFFFFFFF',
          ZEBRA_EVEN: 'FFF8F9FA',
          ZEBRA_ODD: 'FFFFFFFF',
          BORDER: 'FF666666',
          SECTION_BG: 'FFECF0F1',
          REQUIRED_BG: 'FFFFF2CC',
          WARNING_BG: 'FFFFC000',
          SUCCESS_BG: 'FFC6EFCE',
          DANGER_BG: 'FFF8CBAD',
          INFO_BG: 'FFD9E1F2',
          SUBTABLE_BG: 'FFE8EAF6',
          DEPENDENCY_BG: 'FFFCE4EC'
        },
        SANITIZE_LABEL_HTML_IN_LAYOUT: true
      };
    
      const FIELD_TYPE = {
        'LABEL': 'ラベル', 'HR': '罫線', 'SPACER': 'スペース', 'GROUP': 'グループ',
        'FILE': '添付ファイル', 'LINK': 'リンク', 'REFERENCE_TABLE': '関連レコード一覧',
        'SINGLE_LINE_TEXT': '文字列(1行)', 'MULTI_LINE_TEXT': '文字列(複数行)', 'RICH_TEXT': 'リッチエディター',
        'NUMBER': '数値', 'CALC': '計算', 'RADIO_BUTTON': 'ラジオボタン', 'CHECK_BOX': 'チェックボックス',
        'DROP_DOWN': 'ドロップダウン', 'MULTI_SELECT': '複数選択', 'DATE': '日付', 'DATETIME': '日時', 'TIME': '時刻',
        'USER_SELECT': 'ユーザー選択', 'ORGANIZATION_SELECT': '組織選択', 'GROUP_SELECT': 'グループ選択',
        'LOOKUP': 'ルックアップ', 'SUBTABLE': 'テーブル',
        'RECORD_NUMBER': 'レコード番号', 'CREATOR': '作成者', 'CREATED_TIME': '作成日時',
        'MODIFIER': '更新者', 'UPDATED_TIME': '更新日時', 'STATUS': 'ステータス', 'CATEGORY': 'カテゴリー',
        'STATUS_ASSIGNEE': '作業者'
      };
    
      const SYSTEM_FIELDS = new Set(['$id', '$revision', 'status', 'category', 'assignee']);
    
      // ═══════════════════ セマフォ（API同時実行制御） ═══════════════════
      class Semaphore {
        constructor(max) {
          this.max = max;
          this.current = 0;
          this.queue = [];
        }
        acquire() {
          return new Promise(resolve => {
            if (this.current < this.max) { this.current++; resolve(); }
            else this.queue.push(resolve);
          });
        }
        release() {
          this.current--;
          if (this.queue.length > 0) { this.current++; this.queue.shift()(); }
        }
        async run(fn) {
          await this.acquire();
          try { return await fn(); } finally { this.release(); }
        }
      }
    
      const apiSemaphore = new Semaphore(CONFIG.API_CONCURRENCY);

      function getExporterOverlayZIndex() {
        const main = document.getElementById(TOOL_ID);
        const raw = main ? Number(window.getComputedStyle(main).zIndex) : NaN;
        const base = Number.isFinite(raw) ? raw : 2147483646;
        return String(Math.min(2147483647, Math.max(2000000000, base + 1)));
      }
    
      // ═══════════════════ UI（プログレスバー付きオーバーレイ） ═══════════════════
      const UI = {
        id: 'kintone-exporter-overlay',
        totalSteps: 0,
        currentStep: 0,
        failedAPIs: [],
    
        show(msg, totalSteps = 10) {
          UI.totalSteps = totalSteps;
          UI.currentStep = 0;
          UI.failedAPIs = [];
          let el = document.getElementById(UI.id);
          if (!el) {
            el = document.createElement('div');
            el.id = UI.id;
            Object.assign(el.style, {
              position: 'fixed', top: '0', left: '0', width: '100%', height: '100%',
              backgroundColor: 'rgba(0,0,0,0.7)', zIndex: getExporterOverlayZIndex(),
              display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
              color: '#fff', fontSize: '16px', fontFamily: '"Meiryo", sans-serif'
            });
            document.body.appendChild(el);
          }
          el.style.zIndex = getExporterOverlayZIndex();
          el.innerHTML = `
            <div style="background:rgba(255,255,255,0.1);border-radius:12px;padding:32px 48px;text-align:center;min-width:400px;">
              <div style="font-size:20px;font-weight:bold;margin-bottom:16px;">📊 kintone 設計書エクスポーター v2.0</div>
              <div id="kex-status" style="margin-bottom:12px;font-size:14px;color:#ccc;">${msg}</div>
              <div style="background:rgba(255,255,255,0.2);border-radius:8px;height:24px;overflow:hidden;margin-bottom:8px;">
                <div id="kex-progress-bar" style="height:100%;width:0%;background:linear-gradient(90deg,#4A90E2,#7B68EE);border-radius:8px;transition:width 0.3s ease;"></div>
              </div>
              <div id="kex-percent" style="font-size:12px;color:#aaa;">0%</div>
              <div id="kex-errors" style="font-size:11px;color:#f99;margin-top:8px;max-height:60px;overflow-y:auto;"></div>
            </div>`;
        },
    
        update(msg, step) {
          if (step !== undefined) UI.currentStep = step;
          else UI.currentStep++;
          const pct = Math.min(100, Math.round((UI.currentStep / UI.totalSteps) * 100));
          const statusEl = document.getElementById('kex-status');
          const barEl = document.getElementById('kex-progress-bar');
          const pctEl = document.getElementById('kex-percent');
          if (statusEl) statusEl.textContent = msg;
          if (barEl) barEl.style.width = `${pct}%`;
          if (pctEl) pctEl.textContent = `${pct}%`;
        },
    
        logError(apiName, error) {
          UI.failedAPIs.push({ name: apiName, error: error?.message || String(error) });
          const errEl = document.getElementById('kex-errors');
          if (errEl) errEl.textContent = `⚠ ${UI.failedAPIs.length}件のAPI取得に失敗`;
        },
    
        hide() {
          const el = document.getElementById(UI.id);
          if (el) document.body.removeChild(el);
        }
      };
    
      // ═══════════════════ ユーティリティ ═══════════════════
      const Utils = {
        pad: n => n.toString().padStart(2, '0'),
        dt: (d = new Date()) => {
          const p = Utils.pad;
          return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
        },
        toJST: (isoString) => {
          if (!isoString) return '-';
          try { return new Date(isoString).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }); }
          catch { return isoString; }
        },
        safeGet: (obj, path, def = '') => {
          try {
            if (!obj || typeof obj !== 'object') return def;
            const v = path.split('.').reduce((o, k) => (o && o[k] !== undefined ? o[k] : undefined), obj);
            return v === undefined ? def : v;
          } catch { return def; }
        },
        ensureArray: v => Array.isArray(v) ? v : [],
        safeJoin: (arr, sep = '、') => Array.isArray(arr) ? arr.filter(v => v !== '' && v != null).join(sep) : '',
        sleep: ms => new Promise(r => setTimeout(r, ms)),
        
        calculateCellWidth: text => {
          if (!text) return CONFIG.MIN_COL_WIDTH;
          const str = String(text);
          let width = 0;
          for (const line of str.split('\n')) {
            let lw = 0;
            for (const ch of line) lw += /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\uFF00-\uFFEF]/.test(ch) ? 2 : 1;
            if (lw > width) width = lw;
          }
          return Math.max(CONFIG.MIN_COL_WIDTH, Math.min(CONFIG.MAX_COL_WIDTH, width + 2));
        },
    
        colToA1: (n) => { let s = ''; while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = (n - 1) / 26 | 0; } return s; },
        a1: (r, c) => `${Utils.colToA1(c)}${r}`,
        escapeRegExp: (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
        stripHtml: (html) => String(html || '').replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&'),
        formatBoolean: (val) => (val ? '○' : '-'),
    
        formatEntity: (entity) => {
          if (!entity) return '-';
          if (Array.isArray(entity)) return entity.map(e => Utils.formatEntity(e)).join('\n');
          const e = entity.entity || entity;
          const t = (e.type || '').toString().toUpperCase();
          const typeMap = {
            USER: 'ユーザー', GROUP: 'グループ', ORGANIZATION: '組織',
            FIELD_ENTITY: 'フィールド値', CREATOR: '作成者', MODIFIER: '更新者',
            LOGIN_USER: 'ログインユーザー', ALL: '全員'
          };
          const typeJP = typeMap[t] || e.type || '不明';
          if (e.name) return `${typeJP}:${e.name}`;
          if (e.code) return `${typeJP}:${e.code}`;
          return typeJP;
        },
    
        formatEntityDetailed: (entity) => {
          if (!entity) return '-';
          if (Array.isArray(entity)) return entity.map(e => Utils.formatEntityDetailed(e)).join('\n');
          const e = entity.entity || entity;
          const t = (e.type || '').toString().toUpperCase();
          const typeMap = {
            USER: 'ユーザー', GROUP: 'グループ', ORGANIZATION: '組織',
            FIELD_ENTITY: 'フィールド値', CREATOR: '作成者', MODIFIER: '更新者',
            LOGIN_USER: 'ログインユーザー', ALL: '全員'
          };
          const typeJP = typeMap[t] || e.type || '不明';
          const parts = [typeJP];
          if (e.name) parts.push(e.name);
          else if (e.code) parts.push(`コード:${e.code}`);
          if (entity.includeSubs) parts.push('(サブ組織含)');
          return parts.join(': ');
        },
    
        formatSort: (sortStr) => {
          if (!sortStr) return '-';
          return String(sortStr).replace(/\basc\b/gi, '昇順').replace(/\bdesc\b/gi, '降順');
        },
    
        formatFilterCond: (condStr) => {
          if (!condStr) return '-';
          let r = String(condStr);
          r = r.replace(/\s*,\s*/g, ', ');
          const funcMap = {
            'TODAY()': '今日', 'TOMORROW()': '明日', 'YESTERDAY()': '昨日',
            'THIS_WEEK()': '今週', 'LAST_WEEK()': '先週', 'NEXT_WEEK()': '来週',
            'THIS_MONTH()': '今月', 'LAST_MONTH()': '先月', 'NEXT_MONTH()': '来月',
            'THIS_YEAR()': '今年', 'LAST_YEAR()': '昨年', 'NEXT_YEAR()': '来年'
          };
          for (const [eng, jpn] of Object.entries(funcMap)) {
            r = r.replace(new RegExp(Utils.escapeRegExp(eng), 'g'), jpn);
          }
          r = r.replace(
            /\bFROM_TODAY\(\s*([-+]?\d+)\s*,\s*(DAYS|WEEKS|MONTHS|YEARS)\s*\)/g,
            (_, numStr, unit) => {
              const n = parseInt(numStr, 10);
              const unitMap = { DAYS: '日', WEEKS: '週間', MONTHS: 'か月', YEARS: '年' };
              const u = unitMap[unit] || unit;
              if (n === 0) return '今日';
              return `今日から${Math.abs(n)}${u}${n > 0 ? '後' : '前'}`;
            }
          );
          r = r
            .replace(/\bNOT\s+LIKE\b/gi, '不一致')
            .replace(/\bNOT\s+IN\b/gi, 'に含まない')
            .replace(/\bLIKE\b/gi, '部分一致')
            .replace(/\bIN\b/gi, 'に含む')
            .replace(/\bAND\b/gi, 'かつ')
            .replace(/\bOR\b/gi, 'または')
            .replace(/!=/g, '≠').replace(/>=/g, '≥').replace(/<=/g, '≤').replace(/=/g, '＝');
          return r;
        },
    
        formatFieldFormat: (f) => {
          if (!f || typeof f !== 'object') return '';
          const labelMap = {
            NUMBER: '数値', NUMBER_DIGIT: '数値（桁区切り）', PERCENT: 'パーセント',
            CURRENCY: '通貨', DATE: '日付', TIME: '時刻', DATETIME: '日時',
            HOUR_MINUTE: '時:分', HOUR_MINUTE_SECOND: '時:分:秒'
          };
          const parts = [];
          if (f.format && labelMap[f.format]) parts.push(labelMap[f.format]);
          if (f.digit !== undefined) parts.push(`桁区切り: ${f.digit ? 'あり' : 'なし'}`);
          if (f.displayScale !== undefined) parts.push(`小数点: ${f.displayScale}桁`);
          if (f.unit) {
            const pos = f.unitPosition === 'BEFORE' ? '前置' : (f.unitPosition === 'AFTER' ? '後置' : '');
            parts.push(`単位: ${f.unit}${pos ? `(${pos})` : ''}`);
          }
          return parts.join('、');
        },
    
        formatDefaultValue: (dv) => {
          if (dv == null) return '';
          if (Array.isArray(dv)) {
            if (dv.length > 0 && typeof dv[0] === 'object') return dv.map(i => i.name || i.code || JSON.stringify(i)).join('、');
            return dv.join('、');
          }
          if (typeof dv === 'object') {
            if (dv.type === 'NUMBER') return String(dv.value || '');
            return dv.name || dv.code || JSON.stringify(dv);
          }
          return String(dv);
        },
    
        safeJSONStringify: (obj) => { try { return JSON.stringify(obj, null, 2); } catch { return String(obj); } }
      };
    
      // ═══════════════════ ローダー & ネットワーク ═══════════════════
      async function loadSheetLib() {
        if (typeof window.XLSX !== 'undefined') return { styled: true };
    
        const loadScript = (src, timeout = 15000) => new Promise((resolve, reject) => {
          const s = document.createElement('script');
          s.src = src; s.async = true;
          let done = false;
          const timer = setTimeout(() => { if (!done) { done = true; reject(new Error(`Timeout: ${src}`)); } }, timeout);
          s.onload = () => { if (!done) { done = true; clearTimeout(timer); resolve(true); } };
          s.onerror = () => { if (!done) { done = true; clearTimeout(timer); reject(new Error(`Failed: ${src}`)); } };
          document.head.appendChild(s);
        });
    
        try { await loadScript(CONFIG.SHEETLIB_PRIMARY_URL); return { styled: true }; }
        catch { await loadScript(CONFIG.SHEETLIB_FALLBACK_URL); return { styled: false }; }
      }
    
      async function retry(fn, max = CONFIG.MAX_RETRIES) {
        for (let i = 0; i < max; i++) {
          try { return await fn(); }
          catch (e) { if (i === max - 1) throw e; await Utils.sleep(CONFIG.RETRY_DELAY * (i + 1)); }
        }
      }
    
      async function fetchJob(name, promiseFn) {
        try {
          return await apiSemaphore.run(() => retry(promiseFn));
        } catch (e) {
          console.warn(`[${name}] Failed:`, e);
          UI.logError(name, e);
          return null;
        }
      }
    
      // ═══════════════════ エクスポートオプションダイアログ ═══════════════════
      function showExportOptionsDialog() {
        return new Promise((resolve) => {
          const overlay = document.createElement('div');
          Object.assign(overlay.style, {
            position: 'fixed', top: '0', left: '0', width: '100%', height: '100%',
            backgroundColor: 'rgba(0,0,0,0.6)', zIndex: getExporterOverlayZIndex(),
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            fontFamily: '"Meiryo", sans-serif'
          });
    
          const sheets = [
            { key: 'summary', label: 'サマリー', default: true, required: true },
            { key: 'fields', label: '項目定義', default: true },
            { key: 'layout', label: 'フォームレイアウト', default: true },
            { key: 'views', label: '一覧', default: true },
            { key: 'reports', label: 'レポート', default: true },
            { key: 'status', label: 'プロセス管理', default: true },
            { key: 'statusMatrix', label: '遷移マトリクス', default: true },
            { key: 'appAcl', label: 'アプリ権限', default: true },
            { key: 'recordAcl', label: 'レコード権限', default: true },
            { key: 'fieldAcl', label: 'フィールド権限', default: true },
            { key: 'customize', label: 'JS/CSSカスタマイズ', default: true },
            { key: 'actions', label: 'アクション', default: true },
            { key: 'plugins', label: 'プラグイン', default: true },
            { key: 'genNotif', label: '通知（一般）', default: true },
            { key: 'recNotif', label: '通知（レコード）', default: true },
            { key: 'remNotif', label: '通知（リマインダー）', default: true },
            { key: 'webhook', label: 'Webhook', default: true },
            { key: 'adminNotes', label: '管理者メモ', default: true },
            { key: 'dependencies', label: 'フィールド依存関係', default: true }
          ];
    
          const checkboxes = sheets.map(s =>
            `<label style="display:block;margin:3px 0;font-size:13px;cursor:${s.required ? 'default' : 'pointer'};">
              <input type="checkbox" value="${s.key}" ${s.default ? 'checked' : ''} ${s.required ? 'disabled' : ''} 
                style="margin-right:6px;">
              ${s.label}${s.required ? ' (必須)' : ''}
            </label>`
          ).join('');
    
          overlay.innerHTML = `
            <div style="background:#fff;border-radius:12px;padding:28px;min-width:360px;max-width:460px;max-height:80vh;overflow-y:auto;box-shadow:0 4px 24px rgba(0,0,0,0.3);">
              <div style="font-size:18px;font-weight:bold;color:#2E5C8A;margin-bottom:16px;">📊 エクスポート設定</div>
              <div style="font-size:12px;color:#666;margin-bottom:12px;">出力するシートを選択してください</div>
              <div style="display:flex;gap:8px;margin-bottom:12px;">
                <button id="kex-select-all" style="font-size:11px;padding:4px 10px;border:1px solid #ccc;border-radius:4px;background:#f5f5f5;cursor:pointer;">全選択</button>
                <button id="kex-select-none" style="font-size:11px;padding:4px 10px;border:1px solid #ccc;border-radius:4px;background:#f5f5f5;cursor:pointer;">全解除</button>
              </div>
              <div id="kex-sheet-options" style="max-height:340px;overflow-y:auto;padding:8px;background:#fafafa;border-radius:6px;border:1px solid #eee;">
                ${checkboxes}
              </div>
              <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:18px;">
                <button id="kex-cancel" style="padding:8px 20px;border:1px solid #ccc;border-radius:6px;background:#fff;cursor:pointer;font-size:13px;">キャンセル</button>
                <button id="kex-export" style="padding:8px 20px;border:none;border-radius:6px;background:#4A90E2;color:#fff;cursor:pointer;font-size:13px;font-weight:bold;">エクスポート</button>
              </div>
            </div>`;
    
          document.body.appendChild(overlay);
    
          overlay.querySelector('#kex-select-all').onclick = () => {
            overlay.querySelectorAll('#kex-sheet-options input[type="checkbox"]').forEach(cb => cb.checked = true);
          };
          overlay.querySelector('#kex-select-none').onclick = () => {
            overlay.querySelectorAll('#kex-sheet-options input[type="checkbox"]:not([disabled])').forEach(cb => cb.checked = false);
          };
          overlay.querySelector('#kex-cancel').onclick = () => {
            document.body.removeChild(overlay);
            resolve(null);
          };
          overlay.querySelector('#kex-export').onclick = () => {
            const selected = new Set();
            overlay.querySelectorAll('#kex-sheet-options input[type="checkbox"]:checked').forEach(cb => selected.add(cb.value));
            document.body.removeChild(overlay);
            resolve(selected);
          };
        });
      }
    
      // ═══════════════════ レイアウト走査 ═══════════════════
      function traverseRows(rows, visitor, depth = 0) {
        const safeRows = Array.isArray(rows) ? rows : [];
        for (const row of safeRows) {
          const items = Array.isArray(row?.fields) ? row.fields : [];
          if (row?.type === 'GROUP') {
            visitor({ kind: 'GROUP', item: row, depth });
            if (Array.isArray(row.layout)) traverseRows(row.layout, visitor, depth + 1);
            continue;
          }
          if (row?.type === 'SUBTABLE') {
            visitor({ kind: 'SUBTABLE_ROW', row, depth });
            continue;
          }
          for (const item of items) {
            if (!item) continue;
            if (item.type === 'GROUP') {
              visitor({ kind: 'GROUP', item, depth });
              if (Array.isArray(item.layout)) traverseRows(item.layout, visitor, depth + 1);
              continue;
            }
            if (item.type === 'SUBTABLE') { visitor({ kind: 'SUBTABLE', item, depth }); continue; }
            if (item.type === 'LABEL') { visitor({ kind: 'LABEL', item, depth }); continue; }
            if (item.type === 'HR') { visitor({ kind: 'HR', item, depth }); continue; }
            if (item.type === 'SPACER') { visitor({ kind: 'SPACER', item, depth }); continue; }
            visitor({ kind: 'FIELD', item, depth });
          }
        }
      }
    
      // ═══════════════════ スタイル ═══════════════════
      const Sty = {
        baseFont: (opts = {}) => ({ name: CONFIG.FONT_NAME, sz: 10, ...opts }),
        borderThin: () => {
          const b = { style: 'thin', color: { rgb: CONFIG.COLORS.BORDER } };
          return { border: { top: b, bottom: b, left: b, right: b } };
        },
        title: () => ({
          font: { ...Sty.baseFont({ bold: true, sz: 12 }), color: { rgb: CONFIG.COLORS.TITLE_TEXT } },
          alignment: { vertical: 'center', horizontal: 'left', wrapText: true },
          fill: { patternType: 'solid', fgColor: { rgb: CONFIG.COLORS.TITLE_BG } },
          ...Sty.borderThin()
        }),
        header: () => ({
          font: { ...Sty.baseFont({ bold: true }), color: { rgb: CONFIG.COLORS.HEADER_TEXT } },
          alignment: { vertical: 'center', horizontal: 'center', wrapText: true },
          fill: { patternType: 'solid', fgColor: { rgb: CONFIG.COLORS.HEADER_BG } },
          ...Sty.borderThin()
        }),
        cell: (align = 'left') => ({
          alignment: { vertical: 'center', horizontal: align, wrapText: true },
          font: { ...Sty.baseFont() },
          ...Sty.borderThin()
        }),
        sectionCell: (align = 'left') => ({
          alignment: { vertical: 'center', horizontal: align, wrapText: true },
          font: { ...Sty.baseFont({ bold: true }) },
          fill: { patternType: 'solid', fgColor: { rgb: CONFIG.COLORS.SECTION_BG } },
          ...Sty.borderThin()
        }),
        zebraEven: () => ({ fill: { patternType: 'solid', fgColor: { rgb: CONFIG.COLORS.ZEBRA_EVEN } } }),
        zebraOdd: () => ({ fill: { patternType: 'solid', fgColor: { rgb: CONFIG.COLORS.ZEBRA_ODD } } })
      };
    
      function autosizeCols(ws, aoa) {
        const widths = [];
        for (const row of aoa) (row || []).forEach((v, i) => {
          const w = Utils.calculateCellWidth(v);
          widths[i] = Math.max(widths[i] || CONFIG.MIN_COL_WIDTH, w);
        });
        ws['!cols'] = widths.map(w => ({ wch: w || CONFIG.DEFAULT_COL_WIDTH }));
      }
    
      function applyStyles(ws, aoa, styled, options = {}) {
        if (!styled) return;
        const {
          headerRowIndex = null, titleRows = [], sectionRows = [],
          headerInfoRows = [], emptyRows = [], specialCells = {},
          freezeRows = 1, freezeCols = 0, centerCols = []
        } = options;
    
        const rows = aoa.length;
        let maxCols = 0;
        for (const r of aoa) maxCols = Math.max(maxCols, (Array.isArray(r) ? r.length : 0));
        if (!rows || !maxCols) return;
    
        const dataStart = (headerRowIndex != null) ? headerRowIndex + 1 : null;
    
        for (let r = 0; r < rows; r++) {
          const isTitle = titleRows.includes(r);
          const isHeader = (headerRowIndex != null && r === headerRowIndex);
          const isSection = sectionRows.includes(r);
          const isHeaderInfo = headerInfoRows.includes(r);
          const isEmpty = emptyRows.includes(r);
          const isDataRow = dataStart != null && r >= dataStart && !isSection && !isEmpty;
          const zebraIndex = isDataRow ? (r - dataStart) : null;
    
          for (let c = 0; c < maxCols; c++) {
            const addr = Utils.a1(r + 1, c + 1);
            const cellVal = aoa[r] && aoa[r][c] != null ? String(aoa[r][c]) : '';
            const cell = ws[addr] || (ws[addr] = { t: 's', v: cellVal });
            cell.s = cell.s || {};
    
            if (specialCells[`${r},${c}`]) {
              Object.assign(cell.s, specialCells[`${r},${c}`]);
              continue;
            }
            const align = (c === 0) ? 'center' : 'left';
    
            if (isTitle) Object.assign(cell.s, Sty.title());
            else if (isHeader || isHeaderInfo) Object.assign(cell.s, Sty.header());
            else if (isSection) Object.assign(cell.s, Sty.sectionCell(align));
            else if (isEmpty) Object.assign(cell.s, { font: Sty.baseFont() });
            else {
              Object.assign(cell.s, Sty.cell(align));
              if (isDataRow && Array.isArray(centerCols) && centerCols.includes(c)) {
                cell.s.alignment = { ...cell.s.alignment, horizontal: 'center' };
              }
              if (CONFIG.STYLES.ENABLE_ZEBRA && zebraIndex != null) {
                Object.assign(cell.s, zebraIndex % 2 === 0 ? Sty.zebraEven() : Sty.zebraOdd());
              }
            }
          }
        }
        if (CONFIG.STYLES.FREEZE_HEADER && (freezeRows > 0 || freezeCols > 0)) {
          ws['!freeze'] = { xSplit: freezeCols, ySplit: freezeRows };
        }
      }
    
      function setSheetFeatures(ws, aoa, options = {}) {
        const { headerRowIndex = null, enableAutoFilter = true } = options;
        const rows = aoa.length;
        let maxCols = 0;
        for (const r of aoa) maxCols = Math.max(maxCols, (Array.isArray(r) ? r.length : 0));
        if (!rows || !maxCols) return;
        if (CONFIG.STYLES.ENABLE_AUTOFILTER && enableAutoFilter && headerRowIndex != null) {
          ws['!autofilter'] = { ref: `${Utils.a1(headerRowIndex + 1, 1)}:${Utils.a1(rows, maxCols)}` };
        }
        ws['!margins'] = { left: 0.7, right: 0.7, top: 0.75, bottom: 0.75, header: 0.3, footer: 0.3 };
      }
    
      function applyCellMerges(ws, mergeRanges) {
        if (!mergeRanges?.length) return;
        ws['!merges'] = ws['!merges'] || [];
        for (const range of mergeRanges) {
          ws['!merges'].push({ s: { r: range.startRow, c: range.col }, e: { r: range.endRow, c: range.col } });
          const firstCellAddr = Utils.a1(range.startRow + 1, range.col + 1);
          const firstCell = ws[firstCellAddr];
          if (firstCell?.s) firstCell.s.alignment = { ...firstCell.s.alignment, vertical: 'center' };
        }
      }
    
      // ═══════════════════ データ構築ヘルパー ═══════════════════
    
      function filterUserFields(fields) {
        const filtered = {};
        for (const [code, field] of Object.entries(fields)) {
          if (SYSTEM_FIELDS.has(code) || SYSTEM_FIELDS.has(field.code)) continue;
          if (['STATUS', 'CATEGORY', 'STATUS_ASSIGNEE'].includes(field.type)) continue;
          filtered[code] = field;
        }
        return filtered;
      }
    
      function collectLayoutInfo(layout) {
        const fieldOrder = [];
        const subtableFieldOrder = new Map();
        const addedFields = new Set();
        const addedGroups = new Set();
    
        traverseRows(Array.isArray(layout?.layout) ? layout.layout : [], ({ kind, item, row }) => {
          if (kind === 'GROUP') {
            if (item.code && !addedGroups.has(item.code)) {
              fieldOrder.push({ code: item.code, isGroup: true, groupInfo: item });
              addedGroups.add(item.code);
            }
          } else if (kind === 'SUBTABLE' || kind === 'SUBTABLE_ROW') {
            const target = kind === 'SUBTABLE' ? item : row;
            if (target?.code && !addedFields.has(target.code)) {
              fieldOrder.push({ code: target.code, isGroup: false });
              addedFields.add(target.code);
            }
            const codes = Utils.ensureArray(target?.fields).map(f => f?.code).filter(Boolean);
            if (target?.code) subtableFieldOrder.set(target.code, [...(subtableFieldOrder.get(target.code) || []), ...codes]);
          } else if (kind === 'FIELD' && item.code && !addedFields.has(item.code)) {
            fieldOrder.push({ code: item.code, isGroup: false });
            addedFields.add(item.code);
          }
        });
        return { fieldOrder, subtableFieldOrder };
      }
    
      /** フィールドコード→ラベル名マップ生成 */
      function buildFieldLabelMap(fields) {
        const map = {};
        for (const [code, f] of Object.entries(fields)) {
          map[code] = f.label || code;
          if (f.type === 'SUBTABLE' && f.fields) {
            for (const [sc, sf] of Object.entries(f.fields)) {
              map[sc] = sf.label || sc;
            }
          }
        }
        return map;
      }
    
      // ═══════════════════ AOA ビルダー群 ═══════════════════
    
      function buildSummaryAOA(appSettings, generalSettings, fields, views, reports, status, actions, APP_ID, recordCount, failedAPIs) {
        const aoa = [];
        const sectionRows = [];
        const headerInfoRows = [];
    
        aoa.push(['kintone アプリ設計書']); // 0
        aoa.push([]); // 1
    
        // 基本情報
        aoa.push(['基本情報']); sectionRows.push(aoa.length - 1);
        aoa.push(['項目', '値']); headerInfoRows.push(aoa.length - 1);
        aoa.push(['アプリID', APP_ID]);
        aoa.push(['アプリ名', appSettings?.name || '']);
        aoa.push(['説明', Utils.stripHtml(appSettings?.description || '-')]);
        aoa.push(['作成者', appSettings?.creator?.name || '-']);
        aoa.push(['作成日時', Utils.toJST(appSettings?.createdAt)]);
        aoa.push(['更新者', appSettings?.modifier?.name || '-']);
        aoa.push(['更新日時', Utils.toJST(appSettings?.modifiedAt)]);
        if (generalSettings) {
          aoa.push(['テーマ', generalSettings.theme || '-']);
          aoa.push(['アイコン種類', generalSettings.icon?.type || '-']);
          aoa.push(['リビジョン', generalSettings.revision || '-']);
        }
        aoa.push([]);
    
        // 設定統計
        aoa.push(['設定統計']); sectionRows.push(aoa.length - 1);
        aoa.push(['項目', '件数']); headerInfoRows.push(aoa.length - 1);
        aoa.push(['総レコード数', recordCount ?? '(取得不可)']);
        aoa.push(['フィールド数', Object.keys(fields || {}).length]);
        aoa.push(['ビュー数', Object.keys(views?.views || {}).length]);
        aoa.push(['レポート数', Object.keys(reports?.reports || {}).length]);
        aoa.push(['プロセス管理', (status?.enable ? '有効' : '無効')]);
        aoa.push(['ステータス数', Object.keys(status?.states || {}).length]);
        aoa.push(['アクション数', Object.keys(actions || {}).length]);
        aoa.push([]);
    
        // 出力情報
        aoa.push(['出力情報']); sectionRows.push(aoa.length - 1);
        aoa.push(['項目', '値']); headerInfoRows.push(aoa.length - 1);
        aoa.push(['出力日時', Utils.dt()]);
        aoa.push(['出力者', kintone.getLoginUser()?.name || '-']);
        aoa.push(['エクスポーターVer', 'v2.0']);
    
        // エラーレポート
        if (failedAPIs && failedAPIs.length > 0) {
          aoa.push([]);
          aoa.push(['⚠ API取得失敗レポート']); sectionRows.push(aoa.length - 1);
          aoa.push(['API名', 'エラー内容']); headerInfoRows.push(aoa.length - 1);
          for (const { name, error } of failedAPIs) {
            aoa.push([name, error]);
          }
        }
    
        return {
          aoa,
          options: {
            headerRowIndex: headerInfoRows[0] ?? 3,
            titleRows: [0],
            sectionRows,
            headerInfoRows,
            freezeRows: 1
          }
        };
      }
    
      function buildFieldDefinitionAOA(fields, layout, appNames) {
        const headers = [
          '番号', 'フィールド名', 'フィールドコード', 'フィールドタイプ',
          '必須', '重複禁止', '初期値', '最小値', '最大値',
          '選択肢', '入力制約', 'ラベル非表示', '書式設定',
          'ルックアップ設定', '関連レコード設定', '計算式', '依存/参照'
        ];
        const aoa = [['項目定義'], headers];
        const specialCells = {};
        const { fieldOrder, subtableFieldOrder } = collectLayoutInfo(layout);
    
        // レイアウト順ソート
        const sortedEntries = [];
        const added = new Set();
        for (const item of fieldOrder) {
          if (item.isGroup) { added.add(item.code); continue; }
          if (fields[item.code]) { sortedEntries.push([item.code, fields[item.code]]); added.add(item.code); }
        }
        Object.entries(fields).forEach(([c, f]) => { if (!added.has(c) && f.type !== 'GROUP') sortedEntries.push([c, f]); });
    
        let no = 1;
        const pushRow = (label, code, f, parentLabel, isSubtableField) => {
          const typeJ = f?.lookup ? `ルックアップ(${FIELD_TYPE[f?.type] || f?.type})` : (FIELD_TYPE[f?.type] || f?.type);
    
          // 選択肢（順序保持）
          let optionsStr = '-';
          if (f.options) {
            const optEntries = Object.entries(f.options);
            optEntries.sort((a, b) => (a[1].index ?? 999) - (b[1].index ?? 999));
            optionsStr = optEntries.map(([k]) => k).join('\n') || '-';
          }
    
          // 入力制約
          const constraints = [];
          if (f.minLength) constraints.push(`最小文字数: ${f.minLength}`);
          if (f.maxLength) constraints.push(`最大文字数: ${f.maxLength}`);
          if (f.regex) constraints.push(`正規表現: ${f.regex}`);
          if (f.protocol) constraints.push(`プロトコル: ${f.protocol}`);
    
          // ルックアップ設定詳細
          let lookupStr = '-';
          if (f.lookup) {
            const lu = f.lookup;
            const refAppName = appNames[lu.relatedApp?.app] || `(ID:${lu.relatedApp?.app})`;
            const parts = [`参照アプリ: ${refAppName}`, `キーフィールド: ${lu.relatedKeyField || '-'}`];
            if (lu.fieldMappings?.length) {
              parts.push('コピー先:');
              lu.fieldMappings.forEach(m => parts.push(`  ${m.field} ← ${m.relatedField}`));
            }
            if (lu.lookupPickerFields?.length) parts.push(`絞り込み表示: ${lu.lookupPickerFields.join(', ')}`);
            if (lu.filterCond) parts.push(`絞り込み条件: ${Utils.formatFilterCond(lu.filterCond)}`);
            if (lu.sort) parts.push(`ソート: ${Utils.formatSort(lu.sort)}`);
            lookupStr = parts.join('\n');
          }
    
          // 関連レコード設定詳細
          let refTableStr = '-';
          if (f.referenceTable) {
            const rt = f.referenceTable;
            const refAppName = appNames[rt.relatedApp?.app] || `(ID:${rt.relatedApp?.app})`;
            const parts = [`参照アプリ: ${refAppName}`];
            if (rt.condition) parts.push(`条件: ${Utils.formatFilterCond(rt.condition?.field + ' = ' + rt.condition?.relatedField)}`);
            if (rt.displayFields?.length) parts.push(`表示フィールド: ${rt.displayFields.join(', ')}`);
            if (rt.filterCond) parts.push(`絞り込み: ${Utils.formatFilterCond(rt.filterCond)}`);
            if (rt.sort) parts.push(`ソート: ${Utils.formatSort(rt.sort)}`);
            if (rt.size != null) parts.push(`表示件数: ${rt.size}`);
            refTableStr = parts.join('\n');
          }
    
          // 計算式
          const calcStr = f.expression || '-';
    
          // その他依存
          const deps = [];
          if (f.type === 'SUBTABLE') deps.push('[テーブル]');
          if (f.fields) deps.push(`サブフィールド数: ${Object.keys(f.fields).length}`);
    
          const rowData = [
            no++,
            parentLabel ? `  ${parentLabel} > ${label}` : label,
            code,
            typeJ,
            Utils.formatBoolean(f.required),
            Utils.formatBoolean(f.unique),
            Utils.formatDefaultValue(f.defaultValue),
            Utils.safeGet(f, 'minValue', Utils.safeGet(f, 'min', '')),
            Utils.safeGet(f, 'maxValue', Utils.safeGet(f, 'max', '')),
            optionsStr,
            constraints.join('\n') || '-',
            f.noLabel ? 'はい' : '-',
            Utils.formatFieldFormat(f),
            lookupStr,
            refTableStr,
            calcStr,
            deps.join('\n') || '-'
          ];
          const rowIdx = aoa.length;
          aoa.push(rowData);
    
          // 必須フィールドのハイライト
          if (f.required) {
            specialCells[`${rowIdx},4`] = {
              ...Sty.cell('center'),
              fill: { patternType: 'solid', fgColor: { rgb: CONFIG.COLORS.REQUIRED_BG } }
            };
          }
          // テーブル行のハイライト
          if (isSubtableField) {
            for (let c = 1; c <= 3; c++) {
              specialCells[`${rowIdx},${c}`] = {
                ...Sty.cell('left'),
                fill: { patternType: 'solid', fgColor: { rgb: CONFIG.COLORS.SUBTABLE_BG } }
              };
            }
          }
        };
    
        for (const [code, f] of sortedEntries) {
          if (f.type === 'GROUP') continue;
          pushRow(f.label || '', code, f, null, false);
          if (f.type === 'SUBTABLE' && f.fields) {
            const subCodes = subtableFieldOrder.get(code) || Object.keys(f.fields);
            for (const sc of subCodes) {
              if (f.fields[sc]) pushRow(f.fields[sc].label || '', sc, f.fields[sc], f.label || code, true);
            }
          }
        }
    
        return {
          aoa,
          options: {
            headerRowIndex: 1, titleRows: [0], freezeRows: 2, freezeCols: 2,
            centerCols: [0, 4, 5, 11], specialCells
          }
        };
      }
    
      function buildLayoutAOA(layout, fields) {
        const aoa = [['フォームレイアウト'], ['番号', '区分', '階層', '表示', 'フィールドコード', 'タイプ', '必須', '備考']];
        let no = 1;
    
        traverseRows(Array.isArray(layout?.layout) ? layout.layout : [], ({ kind, item, row, depth }) => {
          const indent = '  '.repeat(depth);
          if (kind === 'GROUP') {
            const label = CONFIG.SANITIZE_LABEL_HTML_IN_LAYOUT ? Utils.stripHtml(item.label) : (item.label || '');
            aoa.push([no++, 'グループ', depth, `${indent}${label || '-'}`, item.code || '-', 'GROUP', '-', item.open === false ? '初期非表示' : '-']);
          } else if (kind === 'SUBTABLE') {
            aoa.push([no++, 'テーブル', depth, `${indent}${item.code || '-'}`, item.code || '-', 'テーブル', '-', '-']);
            for (const c of Utils.ensureArray(item.fields)) {
              const cf = fields?.[item.code]?.fields?.[c.code] || fields?.[c.code];
              const label = CONFIG.SANITIZE_LABEL_HTML_IN_LAYOUT ? Utils.stripHtml(c.label) : (c.label || '');
              aoa.push([no++, 'テーブル列', depth + 1, `${indent}  ${label || '-'}`, c.code || '-', FIELD_TYPE[c.type] || c.type || '-', Utils.formatBoolean(!!cf?.required), `親:${item.code}`]);
            }
          } else if (kind === 'SUBTABLE_ROW') {
            aoa.push([no++, 'テーブル行', depth, `${indent}-`, row?.code || '-', 'SUBTABLE_ROW', '-', '-']);
          } else if (kind === 'LABEL') {
            const label = CONFIG.SANITIZE_LABEL_HTML_IN_LAYOUT ? Utils.stripHtml(item.label) : (item.label || '');
            aoa.push([no++, 'ラベル', depth, `${indent}${label || '-'}`, '-', 'LABEL', '-', '-']);
          } else if (kind === 'HR') {
            aoa.push([no++, '罫線', depth, `${indent}───`, '-', 'HR', '-', '-']);
          } else if (kind === 'SPACER') {
            aoa.push([no++, 'スペース', depth, `${indent}(空白)`, item.elementId || '-', 'SPACER', '-', '-']);
          } else if (kind === 'FIELD') {
            const f = fields?.[item.code];
            const label = f?.label || item.label || item.code || '-';
            const type = FIELD_TYPE[f?.type] || FIELD_TYPE[item.type] || f?.type || item.type || '-';
            aoa.push([no++, 'フィールド', depth, `${indent}${label}`, item.code || '-', type, Utils.formatBoolean(!!f?.required), '-']);
          }
        });
    
        return { aoa, options: { headerRowIndex: 1, titleRows: [0], freezeRows: 2, centerCols: [0, 2, 6] } };
      }
    
      function buildViewsAOA(viewsResp, fields) {
        const aoa = [['一覧'], ['番号', '一覧名', 'タイプ', '表示フィールド', '表示フィールド（ラベル）', '抽出条件', 'ソート', '表示順', 'ページ件数']];
        const fieldLabelMap = buildFieldLabelMap(fields);
        const views = viewsResp?.views || {};
        const entries = Object.entries(views).sort((a, b) => (a[1].index ?? 999999) - (b[1].index ?? 999999));
    
        const typeMap = { 'LIST': '一覧', 'CALENDAR': 'カレンダー', 'CUSTOM': 'カスタマイズ' };
        let no = 1;
        for (const [name, v] of entries) {
          const fieldCodes = Utils.ensureArray(v.fields);
          const fieldLabels = fieldCodes.map(c => fieldLabelMap[c] || c);
          aoa.push([
            no++, name,
            typeMap[v.type] || v.type || '-',
            fieldCodes.join('\n') || '-',
            fieldLabels.join('\n') || '-',
            Utils.formatFilterCond(v.filterCond),
            Utils.formatSort(v.sort),
            v.index ?? '',
            v.pagination !== false ? (v.paginationLimit || '既定') : '無効'
          ]);
        }
        if (!entries.length) aoa.push(['', '一覧なし', '-', '-', '-', '-', '-', '', '-']);
        return { aoa, options: { headerRowIndex: 1, titleRows: [0], freezeRows: 2, centerCols: [0, 7] } };
      }
    
      function buildReportsAOA(reportsResp) {
        const typeMap = { 'BAR': '棒グラフ', 'LINE': '折れ線グラフ', 'PIE': '円グラフ', 'TABLE': 'テーブル', 'PIVOT_TABLE': 'クロス集計表' };
        const aggMap = { 'COUNT': '件数', 'SUM': '合計', 'AVERAGE': '平均', 'MAX': '最大値', 'MIN': '最小値' };
        const aoa = [['レポート'], ['番号', 'レポート名', 'グラフ種別', 'グループ対象', '集計関数', '集計対象フィールド', '抽出条件', '表示順']];
    
        const reports = reportsResp?.reports || {};
        const entries = Object.entries(reports).sort((a, b) => (a[1].index ?? 999999) - (b[1].index ?? 999999));
    
        let no = 1;
        for (const [name, r] of entries) {
          const groups = Utils.ensureArray(r.groups).map(g => g.code || JSON.stringify(g)).join('\n') || '-';
          const aggFunc = aggMap[r.aggregationType] || r.aggregationType || '-';
          const aggField = r.aggregationField || '-';
          aoa.push([
            no++, name,
            typeMap[r.chartType] || r.chartType || typeMap[r.type] || r.type || '-',
            groups, aggFunc, aggField,
            Utils.formatFilterCond(r.filterCond),
            r.index ?? ''
          ]);
        }
        if (!entries.length) aoa.push(['', 'レポートなし', '-', '-', '-', '-', '-', '']);
        return { aoa, options: { headerRowIndex: 1, titleRows: [0], freezeRows: 2, centerCols: [0, 7] } };
      }
    
      function buildStatusAOA(statusResp) {
        const aoa = [];
        const sectionRows = [];
        const headerInfoRows = [];
    
        aoa.push(['プロセス管理']);
        aoa.push(['有効', statusResp?.enable ? 'はい' : 'いいえ']);
        aoa.push([]);
    
        // ステータス
        aoa.push(['ステータス一覧']); sectionRows.push(aoa.length - 1);
        aoa.push(['番号', 'ステータス名', '表示順', '担当者']); headerInfoRows.push(aoa.length - 1);
    
        const states = statusResp?.states || {};
        const stateEntries = Object.entries(states).sort((a, b) => (a[1].index ?? 999) - (b[1].index ?? 999));
    
        if (!stateEntries.length || !statusResp?.enable) {
          aoa.push(['', '-', '-', '-']);
        } else {
          let no = 1;
          for (const [, s] of stateEntries) {
            const assignees = Utils.ensureArray(s?.assignee?.entities).map(a => Utils.formatEntityDetailed(a)).join('\n') || '-';
            aoa.push([no++, s?.name || '-', s?.index ?? '-', assignees]);
          }
        }
        aoa.push([]);
    
        // アクション（遷移）
        aoa.push(['遷移アクション']); sectionRows.push(aoa.length - 1);
        aoa.push(['番号', 'アクション名', '遷移元', '遷移先', '実行者']); headerInfoRows.push(aoa.length - 1);
    
        const actions = Utils.ensureArray(statusResp?.actions);
        if (!actions.length) {
          aoa.push(['', '-', '-', '-', '-']);
        } else {
          let no = 1;
          for (const a of actions) {
            const filterCond = a.filterCond ? `\n条件: ${Utils.formatFilterCond(a.filterCond)}` : '';
            aoa.push([no++, a?.name || '-', a?.from || '-', a?.to || '-',
              (Utils.ensureArray(a?.filterCond ? undefined : undefined).length ? '' : '-') + filterCond || '-']);
          }
        }
    
        return {
          aoa,
          options: { headerRowIndex: 4, titleRows: [0], sectionRows, headerInfoRows, freezeRows: 1, centerCols: [0] }
        };
      }
    
      /** 遷移マトリクス：状態×アクション→次状態 */
      function buildStatusMatrixAOA(statusResp) {
        if (!statusResp?.enable) return null;
    
        const states = statusResp?.states || {};
        const stateNames = Object.entries(states)
          .sort((a, b) => (a[1].index ?? 999) - (b[1].index ?? 999))
          .map(([, s]) => s.name);
    
        if (stateNames.length === 0) return null;
    
        const aoa = [['遷移マトリクス'], ['遷移元 \\ 遷移先', ...stateNames]];
        const actions = Utils.ensureArray(statusResp?.actions);
    
        for (const fromState of stateNames) {
          const row = [fromState];
          for (const toState of stateNames) {
            const matching = actions.filter(a => a.from === fromState && a.to === toState);
            row.push(matching.length > 0 ? matching.map(a => a.name).join('\n') : '');
          }
          aoa.push(row);
        }
    
        const specialCells = {};
        // 対角線のハイライト
        for (let i = 0; i < stateNames.length; i++) {
          specialCells[`${i + 2},${i + 1}`] = {
            ...Sty.cell('center'),
            fill: { patternType: 'solid', fgColor: { rgb: 'FFD5D5D5' } }
          };
        }
        // 遷移ありのセルをハイライト
        for (let r = 2; r < aoa.length; r++) {
          for (let c = 1; c < aoa[r].length; c++) {
            if (aoa[r][c] && !specialCells[`${r},${c}`]) {
              specialCells[`${r},${c}`] = {
                ...Sty.cell('center'),
                fill: { patternType: 'solid', fgColor: { rgb: CONFIG.COLORS.SUCCESS_BG } }
              };
            }
          }
        }
    
        return {
          aoa,
          options: { headerRowIndex: 1, titleRows: [0], freezeRows: 2, freezeCols: 1, specialCells, centerCols: [] }
        };
      }
    
      function buildAppAclAOA(aclResp) {
        const aoa = [['アプリ権限'], ['番号', '対象種別', '対象名', 'レコード閲覧', 'レコード追加', 'レコード編集', 'レコード削除', 'ファイル読み込み', 'アプリ管理']];
        const rights = Utils.ensureArray(aclResp?.rights);
        if (!rights.length) {
          aoa.push(['', '-', '-', '-', '-', '-', '-', '-', '-']);
        } else {
          let no = 1;
          for (const r of rights) {
            const e = r?.entity || {};
            const typeMap = { USER: 'ユーザー', GROUP: 'グループ', ORGANIZATION: '組織', CREATOR: '作成者' };
            const entityType = typeMap[(e.type || '').toUpperCase()] || e.type || '-';
            const entityName = e.name || e.code || '(全員)';
            aoa.push([
              no++, entityType, entityName,
              Utils.formatBoolean(r.record?.viewable ?? r.viewable),
              Utils.formatBoolean(r.record?.addable ?? r.addable),
              Utils.formatBoolean(r.record?.editable ?? r.editable),
              Utils.formatBoolean(r.record?.deletable ?? r.deletable),
              Utils.formatBoolean(r.record?.importable ?? r.importable),
              Utils.formatBoolean(r.appEditable ?? r.manageable)
            ]);
          }
        }
        return { aoa, options: { headerRowIndex: 1, titleRows: [0], freezeRows: 2, centerCols: [0, 3, 4, 5, 6, 7, 8] } };
      }
    
      function buildRecordAclAOA(aclResp) {
        const aoa = [['レコード権限'], ['番号', '対象', '条件', '閲覧', '編集', '削除']];
        const rights = Utils.ensureArray(aclResp?.rights);
        if (!rights.length) {
          aoa.push(['', '-', '-', '-', '-', '-']);
        } else {
          let no = 1;
          for (const r of rights) {
            const entities = Utils.ensureArray(r.entities).map(e => Utils.formatEntityDetailed(e)).join('\n') || '-';
            aoa.push([
              no++, entities,
              Utils.formatFilterCond(r.filterCond),
              Utils.formatBoolean(r.viewable),
              Utils.formatBoolean(r.editable),
              Utils.formatBoolean(r.deletable)
            ]);
          }
        }
        return { aoa, options: { headerRowIndex: 1, titleRows: [0], freezeRows: 2, centerCols: [0, 3, 4, 5] } };
      }
    
      function buildFieldAclAOA(aclResp) {
        const aoa = [['フィールド権限'], ['番号', '対象', 'フィールドコード', '閲覧', '編集']];
        const rights = Utils.ensureArray(aclResp?.rights);
        const mergeRanges = [];
        let no = 1;
    
        if (!rights.length) {
          aoa.push(['', '設定なし', '-', '-', '-']);
        } else {
          for (const r of rights) {
            const entities = Utils.ensureArray(r.entities).map(e => Utils.formatEntityDetailed(e)).join('\n') || Utils.formatEntityDetailed(r.entity);
            const perms = Utils.ensureArray(r.fields || r.permissions || r.fieldPermissions);
            if (!perms.length) {
              aoa.push([no++, entities, '-', '-', '-']);
            } else {
              const startRow = aoa.length;
              for (const p of perms) {
                aoa.push([no++, entities, p.code || p.field || '-', Utils.formatBoolean(!!p.viewable), Utils.formatBoolean(!!p.editable)]);
              }
              if (perms.length > 1) mergeRanges.push({ startRow, endRow: aoa.length - 1, col: 1 });
            }
          }
        }
        return { aoa, mergeRanges, options: { headerRowIndex: 1, titleRows: [0], freezeRows: 2, centerCols: [0, 3, 4] } };
      }
    
      function buildCustomizeAOA(resp) {
        const aoa = [['JS/CSSカスタマイズ'], ['番号', '対象', '種別', 'タイプ', 'URL/ファイル名']];
        let no = 1;
        const add = (target, kind, list) => {
          for (const item of Utils.ensureArray(list)) {
            const type = item.type || (item.url ? 'URL' : 'FILE');
            aoa.push([no++, target, kind, type, item.url || item.file?.name || '-']);
          }
        };
        add('デスクトップ', 'JS', resp?.desktop?.js);
        add('デスクトップ', 'CSS', resp?.desktop?.css);
        add('モバイル', 'JS', resp?.mobile?.js);
        add('モバイル', 'CSS', resp?.mobile?.css);
        if (aoa.length === 2) aoa.push(['', '設定なし', '-', '-', '-']);
        return { aoa, options: { headerRowIndex: 1, titleRows: [0], freezeRows: 2, centerCols: [0] } };
      }
    
      function buildActionsAOA(actions, appNames) {
        const aoa = [['アクション'], ['番号', 'アクション名', '遷移先アプリ', '遷移先アプリ名', 'フィールドマッピング', '実行条件']];
        const entries = Object.entries(actions || {});
        let no = 1;
        for (const [name, a] of entries) {
          const destAppId = a?.destApp?.app || '-';
          const destAppName = destAppId !== '-' ? (appNames[destAppId] || `(ID:${destAppId})`) : '-';
          const mappings = Utils.ensureArray(a?.mappings).map(m => `${m.srcField} → ${m.destField}`).join('\n') || '-';
          const cond = Utils.formatFilterCond(a?.filterCond) || '-';
          aoa.push([no++, name, destAppId, destAppName, mappings, cond]);
        }
        if (!entries.length) aoa.push(['', '設定なし', '-', '-', '-', '-']);
        return { aoa, options: { headerRowIndex: 1, titleRows: [0], freezeRows: 2, centerCols: [0] } };
      }
    
      function buildPluginsAOA(resp) {
        const aoa = [['プラグイン'], ['番号', 'プラグインID', '名称', '有効']];
        const plugins = Utils.ensureArray(resp?.plugins);
        if (!plugins.length) {
          aoa.push(['', '設定なし', '-', '-']);
        } else {
          let no = 1;
          for (const p of plugins) aoa.push([no++, p.id || '-', p.name || '-', Utils.formatBoolean(p.enabled !== false)]);
        }
        return { aoa, options: { headerRowIndex: 1, titleRows: [0], freezeRows: 2, centerCols: [0, 3] } };
      }
    
      function buildNotificationsAOA(title, resp, extraCol) {
        const hasExtra = !!extraCol;
        const headers = hasExtra
          ? ['番号', extraCol.label, '宛先', '条件', '件名/タイトル']
          : ['番号', '宛先', '条件', '件名/タイトル'];
        const aoa = [[title], headers];
        const notifs = Utils.ensureArray(resp?.notifications);
        if (!notifs.length) {
          aoa.push(hasExtra ? ['', '-', '-', '-', '-'] : ['', '-', '-', '-']);
        } else {
          let no = 1;
          for (const n of notifs) {
            const targets = Utils.ensureArray(n?.targets || n?.entities || n?.recipients).map(e => Utils.formatEntityDetailed(e)).join('\n') || '-';
            const cond = Utils.formatFilterCond(n?.filterCond || n?.condition);
            const subj = n?.title || n?.subject || '-';
            if (hasExtra) {
              const extraVal = extraCol.getter(n);
              aoa.push([no++, extraVal, targets, cond, subj]);
            } else {
              aoa.push([no++, targets, cond, subj]);
            }
          }
        }
        return { aoa, options: { headerRowIndex: 1, titleRows: [0], freezeRows: 2, centerCols: [0] } };
      }
    
      function buildWebhookAOA(resp) {
        const aoa = [['Webhook設定'], ['番号', 'URL', 'イベント', '有効']];
        const hooks = Utils.ensureArray(resp?.webhooks);
        if (!hooks.length) {
          aoa.push(['', '設定なし', '-', '-']);
        } else {
          let no = 1;
          for (const h of hooks) {
            const events = Utils.ensureArray(h.events).join('\n') || '-';
            aoa.push([no++, h.url || '-', events, Utils.formatBoolean(h.enabled !== false)]);
          }
        }
        return { aoa, options: { headerRowIndex: 1, titleRows: [0], freezeRows: 2, centerCols: [0, 3] } };
      }
    
      function buildAdminNotesAOA(resp) {
        const aoa = [['管理者メモ'], ['項目', '値']];
        aoa.push(['メモ', resp?.notes || '-']);
        aoa.push(['リビジョン', resp?.revision ?? '-']);
        return { aoa, options: { headerRowIndex: 1, titleRows: [0], freezeRows: 2 } };
      }
    
      /** フィールド依存関係マップ */
      function buildDependencyMapAOA(fields, appNames) {
        const aoa = [['フィールド依存関係マップ'], ['番号', 'フィールド名', 'フィールドコード', '依存種別', '参照先', '詳細']];
        let no = 1;
        const specialCells = {};
    
        const addDep = (label, code, depType, target, detail, color) => {
          const rowIdx = aoa.length;
          aoa.push([no++, label, code, depType, target, detail]);
          if (color) {
            specialCells[`${rowIdx},3`] = {
              ...Sty.cell('left'),
              fill: { patternType: 'solid', fgColor: { rgb: color } }
            };
          }
        };
    
        const processField = (code, f, parent) => {
          const label = parent ? `${parent} > ${f.label || code}` : (f.label || code);
    
          if (f.lookup) {
            const appId = f.lookup.relatedApp?.app;
            const appName = appNames[appId] || `(ID:${appId})`;
            addDep(label, code, 'ルックアップ', appName, `キー: ${f.lookup.relatedKeyField}`, CONFIG.COLORS.INFO_BG);
            for (const m of Utils.ensureArray(f.lookup.fieldMappings)) {
              addDep(label, code, 'ルックアップコピー', `${m.field} ← ${m.relatedField}`, `コピー元アプリ: ${appName}`, CONFIG.COLORS.INFO_BG);
            }
          }
          if (f.referenceTable) {
            const appId = f.referenceTable.relatedApp?.app;
            const appName = appNames[appId] || `(ID:${appId})`;
            addDep(label, code, '関連レコード', appName, `表示: ${Utils.ensureArray(f.referenceTable.displayFields).join(',')}`, CONFIG.COLORS.DEPENDENCY_BG);
          }
          if (f.expression) {
            // 計算式から参照フィールドを抽出
            const refs = [];
            const re = /[A-Za-z_]\w*/g;
            let m;
            while ((m = re.exec(f.expression)) !== null) {
              if (fields[m[0]] || Object.values(fields).some(ff => ff.fields?.[m[0]])) {
                refs.push(m[0]);
              }
            }
            const uniqueRefs = [...new Set(refs)];
            if (uniqueRefs.length) {
              addDep(label, code, '計算参照', uniqueRefs.join(', '), `式: ${f.expression}`, CONFIG.COLORS.WARNING_BG);
            }
          }
        };
    
        for (const [code, f] of Object.entries(fields)) {
          if (f.type === 'GROUP') continue;
          processField(code, f, null);
          if (f.type === 'SUBTABLE' && f.fields) {
            for (const [sc, sf] of Object.entries(f.fields)) {
              processField(sc, sf, f.label || code);
            }
          }
        }
    
        if (aoa.length === 2) aoa.push(['', '依存関係なし', '-', '-', '-', '-']);
    
        return { aoa, options: { headerRowIndex: 1, titleRows: [0], freezeRows: 2, centerCols: [0], specialCells } };
      }
    
      // ═══════════════════ Excel出力 ═══════════════════
    
      function makeSafeSheetName(raw, existingNames) {
        let name = String(raw ?? '').trim() || 'Sheet';
        name = name.replace(/[:\\/\?\*\[\]]/g, '_').replace(/[\u0000-\u001F]/g, '').replace(/^'+|'+$/g, '');
        if (!name) name = 'Sheet';
        if (name.length > 31) name = name.slice(0, 31);
        const existing = existingNames || new Set();
        if (!existing.has(name)) return name;
        let i = 2;
        while (true) {
          const suffix = `(${i})`;
          const base = name.length > 31 - suffix.length ? name.slice(0, 31 - suffix.length) : name;
          const candidate = base + suffix;
          if (!existing.has(candidate)) return candidate;
          i++;
        }
      }
    
      function downloadExcel(wb, filename) {
        const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array', cellStyles: true });
        const blob = new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const a = document.createElement('a');
        const url = URL.createObjectURL(blob);
        a.href = url; a.download = filename;
        document.body.appendChild(a); a.click();
        document.body.removeChild(a); URL.revokeObjectURL(url);
      }
    
      // ═══════════════════ メイン実行部 ═══════════════════
      try {
        // アプリID（統合ツールのSource設定を使用）
        const APP_ID = Number(sourceAppId);
        if (!APP_ID) throw new Error('有効なSource App IDが指定されませんでした。');
    
        // エクスポートオプション選択
        const selectedSheets = await showExportOptionsDialog();
        if (!selectedSheets) return false; // キャンセル
    
        UI.show('ライブラリ読み込み中...', 12);
        const { styled } = await loadSheetLib();
    
        const api = kintone.api;
        const apiUrl = (path) => {
          let p = String(path || '');
          if (sourceGuestId) {
            p = p
              .replace('/k/v1/preview/', `/k/guest/${sourceGuestId}/v1/preview/`)
              .replace('/k/v1/', `/k/guest/${sourceGuestId}/v1/`);
          }
          return kintone.api.url(p, true);
        };
    
        // ステップ1: 基本情報
        UI.update('基本情報を取得中...');
        const appSettings = await fetchJob('App', () => api(apiUrl('/k/v1/app.json'), 'GET', { id: APP_ID }));
        const generalSettings = await fetchJob('Settings', () => api(apiUrl('/k/v1/app/settings.json'), 'GET', { app: APP_ID }));
    
        // ステップ2: フィールド・レイアウト
        UI.update('フィールド・レイアウトを取得中...');
        let fieldResp = await fetchJob('FieldsPrev', () => api(apiUrl('/k/v1/preview/app/form/fields.json'), 'GET', { app: APP_ID }));
        if (!fieldResp) fieldResp = await fetchJob('FieldsProd', () => api(apiUrl('/k/v1/app/form/fields.json'), 'GET', { app: APP_ID }));
        let layout = await fetchJob('LayoutPrev', () => api(apiUrl('/k/v1/preview/app/form/layout.json'), 'GET', { app: APP_ID }));
        if (!layout) layout = await fetchJob('LayoutProd', () => api(apiUrl('/k/v1/app/form/layout.json'), 'GET', { app: APP_ID }));
        const fields = filterUserFields(fieldResp?.properties || {});
    
        // ステップ3: レコード件数
        UI.update('レコード件数を取得中...');
        let recordCount = null;
        try {
          const countResp = await fetchJob('RecordCount', () => api(apiUrl('/k/v1/records.json'), 'GET', { app: APP_ID, query: 'limit 1', totalCount: true }));
          recordCount = countResp?.totalCount ?? null;
        } catch { /* ignore */ }
    
        // ステップ4: 各種設定を並列取得
        UI.update('一覧・権限・通知設定を取得中...');
        const [views, reports, status, appAcl, recordAcl, fieldAcl, customize, actionsResp, pluginsResp, adminNotes, webhooksResp, genNotif, recNotif, remNotif] = await Promise.all([
          fetchJob('Views', () => api(apiUrl('/k/v1/app/views.json'), 'GET', { app: APP_ID })),
          fetchJob('Reports', () => api(apiUrl('/k/v1/app/reports.json'), 'GET', { app: APP_ID })),
          fetchJob('Status', () => api(apiUrl('/k/v1/app/status.json'), 'GET', { app: APP_ID })),
          fetchJob('アプリ権限', () => api(apiUrl('/k/v1/app/acl.json'), 'GET', { app: APP_ID })),
          fetchJob('レコード権限', () => api(apiUrl('/k/v1/record/acl.json'), 'GET', { app: APP_ID })),
          fetchJob('フィールド権限', () => api(apiUrl('/k/v1/field/acl.json'), 'GET', { app: APP_ID })),
          fetchJob('Customize', () => api(apiUrl('/k/v1/app/customize.json'), 'GET', { app: APP_ID })),
          fetchJob('Actions', () => api(apiUrl('/k/v1/preview/app/actions.json'), 'GET', { app: APP_ID })),
          fetchJob('Plugins', () => api(apiUrl('/k/v1/app/plugins.json'), 'GET', { app: APP_ID })),
          fetchJob('AdminNotes', () => api(apiUrl('/k/v1/app/adminNotes.json'), 'GET', { app: APP_ID })),
          fetchJob('Webhooks', () => api(apiUrl('/k/v1/app/webhook.json'), 'GET', { app: APP_ID })),
          fetchJob('GenNotif', () => api(apiUrl('/k/v1/app/notifications/general.json'), 'GET', { app: APP_ID })),
          fetchJob('RecNotif', () => api(apiUrl('/k/v1/app/notifications/perRecord.json'), 'GET', { app: APP_ID })),
          fetchJob('RemNotif', () => api(apiUrl('/k/v1/app/notifications/reminder.json'), 'GET', { app: APP_ID }))
        ]);
    
        const actions = Utils.safeGet(actionsResp, 'actions', {});
    
        // ステップ5: 参照アプリ名の解決
        UI.update('関連アプリ名を解決中...');
        const referencedAppIds = new Set();
        const scanField = (f) => {
          if (f.lookup?.relatedApp?.app) referencedAppIds.add(f.lookup.relatedApp.app);
          if (f.referenceTable?.relatedApp?.app) referencedAppIds.add(f.referenceTable.relatedApp.app);
        };
        Object.values(fields).forEach(f => {
          scanField(f);
          if (f.type === 'SUBTABLE' && f.fields) Object.values(f.fields).forEach(scanField);
        });
        Object.values(actions).forEach(a => { if (a.destApp?.app) referencedAppIds.add(a.destApp.app); });
    
        const appNames = {};
        const refPromises = [...referencedAppIds].map(id =>
          fetchJob(`RefApp_${id}`, () => api(apiUrl('/k/v1/app.json'), 'GET', { id })).then(info => { appNames[id] = info?.name || `(ID:${id})`; })
        );
        await Promise.all(refPromises);
    
        // ステップ6: Excel生成
        UI.update('Excelファイルを生成中...', 10);
        const wb = XLSX.utils.book_new();
    
        const appendSheet = (name, data) => {
          if (!data || !Array.isArray(data.aoa) || data.aoa.length === 0) return;
          const ws = XLSX.utils.aoa_to_sheet(data.aoa);
          autosizeCols(ws, data.aoa);
          applyStyles(ws, data.aoa, styled, data.options);
          setSheetFeatures(ws, data.aoa, data.options);
          if (data.mergeRanges) applyCellMerges(ws, data.mergeRanges);
          const safeName = makeSafeSheetName(name, new Set(wb.SheetNames));
          XLSX.utils.book_append_sheet(wb, ws, safeName);
        };
    
        // 各シートの生成とアペンド（選択されたもののみ）
        const sheetBuilders = {
          summary: () => ({ name: 'サマリー', data: buildSummaryAOA(appSettings, generalSettings, fields, views || {}, reports || {}, status || {}, actions, APP_ID, recordCount, UI.failedAPIs) }),
          fields: () => ({ name: '項目定義', data: buildFieldDefinitionAOA(fields, layout || {}, appNames) }),
          layout: () => ({ name: 'フォームレイアウト', data: buildLayoutAOA(layout, fields) }),
          views: () => ({ name: '一覧', data: buildViewsAOA(views || {}, fields) }),
          reports: () => ({ name: 'レポート', data: buildReportsAOA(reports || {}) }),
          status: () => ({ name: 'プロセス管理', data: buildStatusAOA(status || {}) }),
          statusMatrix: () => ({ name: '遷移マトリクス', data: buildStatusMatrixAOA(status || {}) }),
          appAcl: () => ({ name: 'アプリ権限', data: buildAppAclAOA(appAcl || {}) }),
          recordAcl: () => ({ name: 'レコード権限', data: buildRecordAclAOA(recordAcl || {}) }),
          fieldAcl: () => ({ name: 'フィールド権限', data: buildFieldAclAOA(fieldAcl || {}) }),
          customize: () => ({ name: 'JS/CSSカスタマイズ', data: buildCustomizeAOA(customize || {}) }),
          actions: () => ({ name: 'アクション', data: buildActionsAOA(actions, appNames) }),
          plugins: () => ({ name: 'プラグイン', data: buildPluginsAOA(pluginsResp || {}) }),
          genNotif: () => ({ name: '通知（一般）', data: buildNotificationsAOA('通知（一般）', genNotif || {}) }),
          recNotif: () => ({ name: '通知（レコード）', data: buildNotificationsAOA('通知（レコード）', recNotif || {}, { label: 'イベント', getter: n => n?.event || n?.timing || '-' }) }),
          remNotif: () => ({ name: '通知（リマインダー）', data: buildNotificationsAOA('通知（リマインダー）', remNotif || {}, { label: 'タイミング', getter: n => n?.timing ? Utils.safeJSONStringify(n.timing) : '-' }) }),
          webhook: () => ({ name: 'Webhook設定', data: buildWebhookAOA(webhooksResp || {}) }),
          adminNotes: () => ({ name: '管理者メモ', data: buildAdminNotesAOA(adminNotes || {}) }),
          dependencies: () => ({ name: 'フィールド依存関係', data: buildDependencyMapAOA(fields, appNames) })
        };
    
        // 定義順に追加（選択されたもののみ）
        const orderedKeys = [
          'summary', 'fields', 'layout', 'views', 'reports', 'status', 'statusMatrix',
          'appAcl', 'recordAcl', 'fieldAcl', 'customize', 'actions', 'plugins',
          'genNotif', 'recNotif', 'remNotif', 'webhook', 'adminNotes', 'dependencies'
        ];
    
        for (const key of orderedKeys) {
          if (selectedSheets.has(key) && sheetBuilders[key]) {
            const { name, data } = sheetBuilders[key]();
            if (data) appendSheet(name, data);
          }
        }
    
        UI.update('ダウンロード中...', 12);
        const safeAppName = String(appSettings?.name || `App${APP_ID}`).replace(/[\\/:*?"<>|]/g, '_');
        downloadExcel(wb, `${safeAppName}_設計書_v2.xlsx`);
    
        UI.hide();
    
        // 完了通知
        const errorMsg = UI.failedAPIs.length > 0 ? `\n⚠ ${UI.failedAPIs.length}件のAPI取得に失敗しました（サマリーシートで確認できます）` : '';
        alert(`✅ エクスポート完了${errorMsg}`);
        console.log('kintone設計書エクスポート完了（v2.0）', { failedAPIs: UI.failedAPIs });
        return true;
    
      } catch (e) {
        UI.hide();
        console.error('kintone設計書エクスポートエラー:', e);
        alert(`❌ エラーが発生しました: ${e.message}\n\n詳細はブラウザのコンソールを確認してください。`);
        throw e;
      }
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

  function switchTab(tabKey, options) {
    const key = ui.tabs.some((t) => t.dataset.tab === tabKey) ? tabKey : 'diff';
    state.activeTab = key;
    ui.tabs.forEach((t) => t.classList.toggle('active', t.dataset.tab === key));
    ui.panes.forEach((p) => p.classList.toggle('active', p.dataset.pane === key));
    if (!options || options.persist !== false) saveCurrentDialogState();
  }

  function applyIgnoreProfile() {
    const name = ui.ignoreProfileSelect.value;
    const profiles = loadIgnoreProfiles();
    if (!name || !Object.prototype.hasOwnProperty.call(profiles, name)) return;
    ui.ignoreKeys.value = String(profiles[name] ?? '');
    ui.ignoreProfileName.value = name;
    applyIgnorePresetKeysToInput();
    renderIgnoreKeyChips();
    saveCurrentDialogState();
    setStatus(`無視プロファイルを読込: ${name}`);
  }

  function saveIgnoreProfileFromInput() {
    const name = ui.ignoreProfileName.value.trim();
    if (!name) {
      window.alert('保存名を入力してください');
      return;
    }
    const profiles = loadIgnoreProfiles();
    profiles[name] = String(ui.ignoreKeys.value ?? '');
    saveIgnoreProfiles(profiles);
    renderIgnoreProfileOptions(name);
    saveCurrentDialogState();
    setStatus(`無視プロファイルを保存: ${name}`);
  }

  function deleteIgnoreProfileFromSelect() {
    const name = ui.ignoreProfileSelect.value;
    if (!name) return;
    const profiles = loadIgnoreProfiles();
    if (!Object.prototype.hasOwnProperty.call(profiles, name)) return;
    delete profiles[name];
    saveIgnoreProfiles(profiles);
    renderIgnoreProfileOptions('');
    ui.ignoreKeys.value = '';
    ui.ignoreProfileName.value = '';
    renderIgnoreKeyChips();
    saveCurrentDialogState();
    setStatus(`無視プロファイルを削除: ${name}`);
  }

  async function withGuard(fn, busyText) {
    if (state.running) {
      setStatus('別の処理を実行中です。完了までお待ちください。');
      return;
    }
    state.running = true;
    setBusy(true, busyText || '処理中...');
    try {
      await fn();
    } catch (e) {
      console.error(e);
      setStatus(`エラー: ${e.message || String(e)}`, true);
    } finally {
      state.running = false;
      setBusy(false);
    }
  }

  renderScopeChips();
  restoreDialogState();
  syncDiffThemeButton();
  renderIgnoreProfileOptions();
  renderIgnoreKeyChips();
  renderLookupMapRows();
  renderBundleState();
  renderReflectSidebar();
  renderReflectMainPanel();
  renderReflectNodeList();
  if (!ui.settingsExportSearchResult.innerHTML) {
    ui.settingsExportSearchResult.innerHTML = '<div style="padding:10px;font-size:12px;color:#64748b">検索結果なし</div>';
  }

  ui.applyDiffOnly.addEventListener('change', () => {
    saveCurrentDialogState();
    renderBundleState();
    renderReflectModeUi();
  });
  [ui.ignorePresetFieldOrder, ui.ignorePresetMeta, ui.ignorePresetLabelName].forEach((el) => {
    if (!el) return;
    el.addEventListener('change', () => {
      applyIgnorePresetKeysToInput({ removeDisabled: true });
      saveCurrentDialogState();
    });
  });
  ui.stopOnError.addEventListener('change', saveCurrentDialogState);
  ui.nodeMode.addEventListener('change', () => {
    saveCurrentDialogState();
    renderBundleState();
    renderReflectNodeList();
  });
  let nodeSearchTimer = null;
  if (ui.nodeSearch) {
    ui.nodeSearch.addEventListener('input', () => {
      clearTimeout(nodeSearchTimer);
      nodeSearchTimer = setTimeout(() => renderReflectNodeList(), 200);
    });
  }
  if (ui.nodeFilterSection) ui.nodeFilterSection.addEventListener('change', () => renderReflectNodeList());
  if (ui.nodeFilterType) ui.nodeFilterType.addEventListener('change', () => renderReflectNodeList());
  if (ui.nodeFilterSeverity) ui.nodeFilterSeverity.addEventListener('change', () => renderReflectNodeList());
  [
    ui.sourceApp,
    ui.sourceGuest,
    ui.sourcePreview,
    ui.targetApp,
    ui.targetGuest,
    ui.targetPreview,
    ui.ignoreKeys,
    ui.ignoreProfileName,
    ui.autoBackupPreview,
    ui.overwriteField,
    ui.deployField,
    ui.jsconfigPreview,
    ui.jsconfigDeployAfter,
    ui.settingsExportAppIds,
    ui.settingsExportSearchKeyword,
    ui.settingsExportGuest,
    ui.settingsExportPreview
  ].forEach((el) => {
    if (!el) return;
    el.addEventListener('change', saveCurrentDialogState);
  });
  if (ui.charDiff) {
    ui.charDiff.addEventListener('change', () => {
      saveCurrentDialogState();
      if (state.lastDiffRows.length) renderResultRows(state.lastDiffRows);
    });
  }
  if (ui.diffSearch) {
    ui.diffSearch.addEventListener('input', () => {
      saveCurrentDialogState();
      if (state.lastDiffRows.length) renderResultRows(state.lastDiffRows);
    });
  }
  ui.doDeploy.addEventListener('change', saveCurrentDialogState);
  ui.ignoreProfileSelect.addEventListener('change', () => {
    applyIgnoreProfile();
  });

  root.addEventListener('keydown', (e) => {
    if (e.target.id === 'u_ignoreKeyInput' && e.key === 'Enter') {
      e.preventDefault();
      addIgnoreKeyFromInput();
    }
  });

  root.addEventListener('input', (e) => {
    if (e.target.closest('#u_lookupMapRows')) {
      syncLookupMapFromRows();
      saveCurrentDialogState();
    }
  });

  ui.settingsExportSearchKeyword.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    withGuard(runSettingsExportSearchApps);
  });

  root.addEventListener('change', (e) => {
    const id = e.target?.dataset?.nodeId;
    if (id) {
      pushReflectUndo();
      if (e.target.checked) state.reflectSelectedIds.add(id);
      else state.reflectSelectedIds.delete(id);
      renderReflectNodeList();
      return;
    }

    if (e.target?.closest('#u_diffScopes') || e.target?.closest('#u_applyScopes') || e.target?.closest('#u_settingsExportScopes')) {
      saveCurrentDialogState();
      renderBundleState();
    }
    if (e.target?.closest('[data-apply-scope]')) {
      syncApplyScopesFromSidebar();
      saveCurrentDialogState();
      renderBundleState();
      renderReflectMainPanel();
      const putSections = SECTION_DEFS.filter((d) => d.put);
      const sidebarCount = document.getElementById('u_sidebarCount');
      const checkedCount = [...document.querySelectorAll('#u_reflectSidebarSections [data-apply-scope]:checked')].length;
      if (sidebarCount) sidebarCount.textContent = `${checkedCount} / ${putSections.length}`;
    }
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
    const sidebarItem = e.target.closest('[data-sidebar-sec]');
    if (sidebarItem && !e.target.closest('.sec-check')) {
      const secKey = sidebarItem.dataset.sidebarSec || '';
      state.reflectActiveSidebarSection = (state.reflectActiveSidebarSection === secKey) ? null : secKey;
      renderReflectSidebar();
      renderReflectMainPanel();
      return;
    }

    const overviewNav = e.target.closest('[data-sidebar-nav]');
    if (overviewNav) {
      const secKey = overviewNav.dataset.sidebarNav || '';
      if (secKey) {
        state.reflectActiveSidebarSection = secKey;
        renderReflectSidebar();
        renderReflectMainPanel();
      }
      return;
    }

    const secToggle = e.target.closest('[data-diff-sec-toggle]');
    if (secToggle) {
      const secKey = secToggle.dataset.diffSecToggle || '';
      if (secKey) {
        if (state.diffCollapsedSections.has(secKey)) state.diffCollapsedSections.delete(secKey);
        else state.diffCollapsedSections.add(secKey);
        if (state.lastDiffRows.length) renderResultRows(state.lastDiffRows);
      }
      return;
    }

    const moreRowsBtn = e.target.closest('[data-act="moreDiffRows"]');
    if (moreRowsBtn) {
      const secKey = moreRowsBtn.dataset.sec || '';
      if (!secKey) return;
      const current = Number(state.diffSectionVisibleCounts[secKey] || 80);
      state.diffSectionVisibleCounts[secKey] = current + 80;
      if (state.lastDiffRows.length) renderResultRows(state.lastDiffRows);
      return;
    }

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

    const addSettingsAppBtn = e.target.closest('[data-add-settings-app]');
    if (addSettingsAppBtn) {
      const appId = addSettingsAppBtn.dataset.addSettingsApp || '';
      const appName = addSettingsAppBtn.dataset.addSettingsName || '';
      addAppIdToSettingsExport(appId, appName);
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

    if (act === 'setSourceCurrent') {
      ui.sourceApp.value = DEFAULT_APP_ID;
      saveCurrentDialogState();
      setStatus(`Source App IDを現在アプリ(${DEFAULT_APP_ID})に設定しました`);
      return;
    }
    if (act === 'copySourceToTarget') {
      ui.targetApp.value = ui.sourceApp.value.trim();
      ui.targetGuest.value = ui.sourceGuest.value.trim();
      ui.targetPreview.checked = !!ui.sourcePreview.checked;
      saveCurrentDialogState();
      renderBundleState();
      setStatus('Source設定をTargetへコピーしました');
      return;
    }
    if (act === 'swapSourceTarget') {
      const src = {
        app: ui.sourceApp.value,
        guest: ui.sourceGuest.value,
        preview: ui.sourcePreview.checked
      };
      ui.sourceApp.value = ui.targetApp.value;
      ui.sourceGuest.value = ui.targetGuest.value;
      ui.sourcePreview.checked = ui.targetPreview.checked;
      ui.targetApp.value = src.app;
      ui.targetGuest.value = src.guest;
      ui.targetPreview.checked = src.preview;
      saveCurrentDialogState();
      renderBundleState();
      setStatus('Source/Target設定を入れ替えました');
      return;
    }
    if (act === 'settingsExportUseCurrent') {
      const cur = String(kintone.app.getId() || '').trim();
      if (!cur) {
        setStatus('現在App IDを取得できませんでした', true);
        return;
      }
      const curList = ui.settingsExportAppIds.value.trim();
      const set = new Set(parseAppIdList(curList));
      set.add(cur);
      ui.settingsExportAppIds.value = [...set].join(', ');
      saveCurrentDialogState();
      setStatus(`現在App(${cur})を追加しました`);
      return;
    }
    if (act === 'settingsExportUseSource') {
      const srcId = ui.sourceApp.value.trim();
      if (!srcId) {
        setStatus('Source App IDが空です', true);
        return;
      }
      const set = new Set(parseAppIdList(ui.settingsExportAppIds.value));
      set.add(srcId);
      ui.settingsExportAppIds.value = [...set].join(', ');
      ui.settingsExportGuest.value = ui.sourceGuest.value.trim();
      ui.settingsExportPreview.checked = !!ui.sourcePreview.checked;
      saveCurrentDialogState();
      setStatus(`Source App(${srcId})を追加しました`);
      return;
    }
    if (act === 'settingsExportUseTarget') {
      const tgtId = ui.targetApp.value.trim();
      if (!tgtId) {
        setStatus('Target App IDが空です', true);
        return;
      }
      const set = new Set(parseAppIdList(ui.settingsExportAppIds.value));
      set.add(tgtId);
      ui.settingsExportAppIds.value = [...set].join(', ');
      ui.settingsExportGuest.value = ui.targetGuest.value.trim();
      ui.settingsExportPreview.checked = !!ui.targetPreview.checked;
      saveCurrentDialogState();
      setStatus(`Target App(${tgtId})を追加しました`);
      return;
    }
    if (act === 'settingsExportScopeAll') {
      setSettingsExportScopeSelection(true);
      setStatus('設定取得セクションを全選択しました');
      return;
    }
    if (act === 'settingsExportScopeNone') {
      setSettingsExportScopeSelection(false);
      setStatus('設定取得セクションを全解除しました');
      return;
    }
    if (act === 'runSettingsExportJson') return withGuard(async () => runSettingsExport('json'));
    if (act === 'runSettingsExportZip') return withGuard(async () => runSettingsExport('zip'));
    if (act === 'settingsExportSearchApps') return withGuard(runSettingsExportSearchApps);
    if (act === 'prefetchCommonData') return withGuard(runPrefetchCommonData);
    if (act === 'runDiffAndPlan') return withGuard(runDiffAndPreviewPlan);

    if (act === 'runDiff') return withGuard(runDiff);
    if (act === 'exportDiffJson') return withGuard(exportDiffJson);
    if (act === 'exportDiffHtml') return withGuard(exportDiffHtml);
    if (act === 'exportPatchJson') return withGuard(exportPatchJson);
    if (act === 'exportBundleJson') return withGuard(exportBundleJson);
    if (act === 'toggleDiffTheme') {
      state.diffViewTheme = state.diffViewTheme === 'dark' ? 'light' : 'dark';
      syncDiffThemeButton();
      saveCurrentDialogState();
      if (state.lastDiffRows.length) renderResultRows(state.lastDiffRows);
      setStatus(`比較ビューを${state.diffViewTheme === 'dark' ? 'Dark' : 'Light'}テーマに切り替えました`);
      return;
    }
    if (act === 'collapseDiffSections') {
      state.diffCollapsedSections = new Set((state.lastDiffRows || []).map((r) => r.sectionKey || r.section || 'Unknown'));
      if (state.lastDiffRows.length) renderResultRows(state.lastDiffRows);
      setStatus('比較ビューのセクションを全て折り畳みました');
      return;
    }
    if (act === 'expandDiffSections') {
      state.diffCollapsedSections = new Set();
      if (state.lastDiffRows.length) renderResultRows(state.lastDiffRows);
      setStatus('比較ビューのセクションを全て展開しました');
      return;
    }
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
      state.lastDiffAt = null;
      state.lastDiffRows = [];
      state.lastDiffSignature = '';
      state.lastApplyPlan = null;
      state.reflectRows = [];
      state.reflectSelectedIds = new Set();
      state.reflectNodeModes = {};
      state.reflectUndoStack = [];
      state.reflectRedoStack = [];
      renderResultRows([]);
      renderReflectNodeList();
      renderBundleState();
      setStatus('バンドル読込を解除しました');
      return;
    }

    if (act === 'loadIgnoreProfile') return withGuard(async () => applyIgnoreProfile());
    if (act === 'saveIgnoreProfile') return withGuard(async () => saveIgnoreProfileFromInput());
    if (act === 'deleteIgnoreProfile') return withGuard(async () => deleteIgnoreProfileFromSelect());

    if (act === 'addPresetKey') {
      const key = e.target.dataset.key;
      if (!key) return;
      const current = (ui.ignoreKeys.value || '').split(',').map((k) => k.trim()).filter(Boolean);
      if (!current.includes(key)) {
        current.push(key);
        ui.ignoreKeys.value = current.join(', ');
        renderIgnoreKeyChips();
        saveCurrentDialogState();
      }
      return;
    }
    if (act === 'addIgnoreKey') { addIgnoreKeyFromInput(); return; }
    if (act === 'removeIgnoreKey') {
      const key = e.target.dataset.key;
      if (!key) return;
      const current = (ui.ignoreKeys.value || '').split(',').map((k) => k.trim()).filter(Boolean).filter((k) => k !== key);
      ui.ignoreKeys.value = current.join(', ');
      renderIgnoreKeyChips();
      saveCurrentDialogState();
      return;
    }

    if (act === 'addLookupMapRow') {
      const container = document.getElementById('u_lookupMapRows');
      if (!container) return;
      if (container.querySelector('.muted')) container.innerHTML = '';
      const i = container.querySelectorAll('[data-lookup-row]').length;
      const row = document.createElement('div');
      row.className = 'btns';
      row.style.marginTop = '4px';
      row.dataset.lookupRow = String(i);
      row.innerHTML =
        `<span style="align-self:center;font-size:11px;color:#64748b;white-space:nowrap">変換元</span>` +
        `<input type="text" class="lookup-from" value="" placeholder="AppID" style="flex:1;min-width:0">` +
        `<span style="align-self:center;padding:0 4px;color:#64748b">→</span>` +
        `<span style="align-self:center;font-size:11px;color:#64748b;white-space:nowrap">変換先</span>` +
        `<input type="text" class="lookup-to" value="" placeholder="AppID" style="flex:1;min-width:0">` +
        `<button type="button" class="btn sub" data-act="removeLookupMapRow" data-row="${i}" style="padding:4px 8px">×</button>`;
      container.appendChild(row);
      row.querySelector('.lookup-from').focus();
      return;
    }
    if (act === 'removeLookupMapRow') {
      const row = e.target.closest('[data-lookup-row]');
      if (row) {
        row.remove();
        syncLookupMapFromRows();
        renderLookupMapRows();
        saveCurrentDialogState();
      }
      return;
    }

    if (act === 'applyScopeAll') {
      setScopeSelection(ui.applyScopes, true);
      renderReflectSidebar();
      renderReflectMainPanel();
      setStatus('反映セクションを全選択しました');
      return;
    }
    if (act === 'applyScopeNone') {
      setScopeSelection(ui.applyScopes, false);
      renderReflectSidebar();
      renderReflectMainPanel();
      setStatus('反映セクションを全解除しました');
      return;
    }
    if (act === 'applyScopeDiffOnly') {
      const diffCounts = getDiffCountsBySection();
      const putSections = SECTION_DEFS.filter((d) => d.put);
      [...ui.applyScopes.querySelectorAll('input[type="checkbox"]')].forEach((c) => {
        const dc = diffCounts[c.value];
        c.checked = !!(dc && dc.total > 0);
      });
      saveCurrentDialogState();
      renderReflectSidebar();
      renderReflectMainPanel();
      setStatus('差分のあるセクションのみ選択しました');
      return;
    }
    if (act === 'reflectModeSection') {
      ui.nodeMode.checked = false;
      state.reflectActiveSidebarSection = null;
      renderReflectModeUi();
      renderReflectMainPanel();
      setStatus('セクション反映モードに切り替えました');
      return;
    }
    if (act === 'reflectModeNode') {
      ui.nodeMode.checked = true;
      state.reflectActiveSidebarSection = null;
      renderReflectModeUi();
      if (state.lastDiffRows && state.lastDiffRows.length > 0 && !state.reflectRows.length) {
        loadReflectRowsFromLastDiff();
      }
      setStatus('ノード反映モードに切り替えました');
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
    if (act === 'backupTargetPreview') return withGuard(runBackupTargetPreview);
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
    if (act === 'loadViewsForProc') return withGuard(async () => loadViewsForSelect('u_batchProcViewSelect', 'u_batchProcView'));
    if (act === 'loadViewsForDl') return withGuard(async () => loadViewsForSelect('u_batchDlViewSelect', 'u_batchDlView'));

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

      hashSql: (sql) => {
        const str = String(sql || '');
        let h = 0x811c9dc5;
        for (let i = 0; i < str.length; i++) {
          h ^= str.charCodeAt(i);
          h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24);
        }
        return `sql_${(h >>> 0).toString(16).padStart(8, '0')}`;
      },

      analyzeSqlSafety: (sql) => {
        const raw = String(sql || '');
        const withoutBlockComments = raw.replace(/\/\*[\s\S]*?\*\//g, ' ');
        const clean = withoutBlockComments.replace(/--.*$/gm, ' ').replace(/\s+/g, ' ').trim();
        const up = clean.toUpperCase();
        const issues = [];
        const upd = up.match(/\bUPDATE\b[\s\S]*?(?=;|$)/g) || [];
        upd.forEach((stmt) => {
          if (!/\bWHERE\b/.test(stmt)) issues.push('UPDATEにWHERE句がありません');
        });
        const del = up.match(/\bDELETE\s+FROM\b[\s\S]*?(?=;|$)/g) || [];
        del.forEach((stmt) => {
          if (!/\bWHERE\b/.test(stmt)) issues.push('DELETEにWHERE句がありません');
        });
        return {
          cleaned: clean,
          issues,
          hash: Utils.hashSql(clean)
        };
      },

      // History management
      getHistory: () => {
        try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
      },
      addHistory: (sql, meta = {}) => {
        const h = Utils.getHistory().filter(item => item.sql !== sql);
        h.unshift({ sql, time: Date.now(), hash: meta.hash || '', safety: meta.safety || '' });
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
        const src = commonParams().source;
        const prefix = buildApiPrefix(src.guestId, false);
        while (true) {
          const body = { app: appId, query: `limit ${limit} offset ${offset}` };
          const resp = await apiGet(prefix, '/records.json', body);
          records = records.concat(resp.records);
          if (onProgress) onProgress(records.length);
          if (resp.records.length < limit) break;
          offset += limit;
        }
        return records;
      },

      async fetchFields(appId) {
        try {
          const src = commonParams().source;
          const prefix = buildApiPrefix(src.guestId, false);
          const resp = await apiGet(prefix, '/app/form/fields.json', { app: appId });
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
        const safety = Utils.analyzeSqlSafety(sql);
        if (safety.issues.length) {
          const ok1 = window.confirm(
            `⚠ 危険な更新系SQLの可能性があります。\n` +
            `${safety.issues.map((x, i) => `${i + 1}. ${x}`).join('\n')}\n\n` +
            `SQL Hash: ${safety.hash}\n` +
            `続行する場合は次の確認に進みます。`
          );
          if (!ok1) {
            setStatus(`Canceled by safety guard (${safety.hash})`);
            return;
          }
          const typed = window.prompt(`安全確認: SQL Hash を入力してください\n${safety.hash}`, '');
          if ((typed || '').trim() !== safety.hash) {
            setStatus('Safety hash mismatch. Query canceled.');
            return;
          }
        }

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
          setStatus(`${lastResult.length} rows — ${elapsed}s [${safety.hash}]`);

          // Update sidebar with fields
          renderFields(primary.fields, primary.flat);

          // Save to history
          Utils.addHistory(sql, { hash: safety.hash, safety: safety.issues.length ? 'double-confirm' : 'normal' });
          console.info(`[KintoneSQL] hash=${safety.hash} safety=${safety.issues.length ? 'double-confirm' : 'normal'}`);
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
            Utils.el('span', { className: 'history-time', textContent: `${Utils.formatTime(item.time)}${item.hash ? ` • ${item.hash}` : ''}` })
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
  overflow-x:auto;white-space:nowrap;scrollbar-width:none;
}
#topbar::-webkit-scrollbar{display:none;}
#topbar h1{font-size:14px;font-weight:700;margin-right:6px;white-space:nowrap;
  background:linear-gradient(135deg,var(--accent),var(--accent2));-webkit-background-clip:text;-webkit-text-fill-color:transparent;}
.tb{padding:5px 12px;border:1px solid var(--border);border-radius:var(--radius);background:var(--surface);color:var(--text);font-size:11px;cursor:pointer;transition:.15s;font-family:inherit;white-space:nowrap;}
.tb:hover{border-color:var(--accent);color:var(--accent);}
.tb.active{background:var(--accent);color:#000;border-color:var(--accent);font-weight:600;}
#topbar select.tb-select{padding:5px 8px;border:1px solid var(--border);border-radius:var(--radius);background:var(--surface2);color:var(--text);font-size:11px;font-family:inherit;outline:none;}
#topbar select.tb-select:focus{border-color:var(--accent);}
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
#legend .legend-toggle{cursor:pointer;padding:2px 6px;border:1px solid transparent;border-radius:8px;transition:.12s;}
#legend .legend-toggle:hover{background:var(--surface2);border-color:var(--border);}
#legend .legend-toggle.off{opacity:0.35;text-decoration:line-through;}

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
  <button class="tb active" id="focus-toggle-btn" onclick="toggleFocusMode()">🎯 関連強調 ON</button>
  <select id="focus-depth" class="tb-select" onchange="updateFocusOptions()">
    <option value="1">深さ1</option>
    <option value="2">深さ2</option>
    <option value="3">深さ3</option>
  </select>
  <select id="focus-direction" class="tb-select" onchange="updateFocusOptions()">
    <option value="both">双方向</option>
    <option value="out">出方向</option>
    <option value="in">入方向</option>
  </select>
  <button class="tb" onclick="clearFocus()">強調解除</button>
  <button class="tb active" id="rel-lookup-btn" onclick="toggleRelationKind('LOOKUP')">Lookup線</button>
  <button class="tb active" id="rel-ref-btn" onclick="toggleRelationKind('REF')">Related線</button>
  <button class="tb" id="pin-btn" onclick="togglePinFromSelection()">📌 Pin</button>
  <button class="tb" onclick="clearPins()">📍 Unpin</button>
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
  <span class="legend-toggle" id="legend-lookup-edge" onclick="toggleRelationKind('LOOKUP')"><i style="border:2px solid var(--lookup)"></i>Lookup線</span>
  <span class="legend-toggle" id="legend-ref-edge" onclick="toggleRelationKind('REF')"><i style="border:2px dashed var(--ref)"></i>関連線</span>
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
const THEME_KEY = "kintone-erd-theme";
let isDark = localStorage.getItem(THEME_KEY) !== "light";
function applyTheme(){
  document.documentElement.setAttribute("data-theme",isDark?"":"light");
  document.getElementById("theme-btn").textContent=isDark?"🌙":"☀️";
}
function toggleTheme(){
  isDark=!isDark;
  applyTheme();
  localStorage.setItem(THEME_KEY, isDark ? "dark" : "light");
  toast(isDark?"ダークモード":"ライトモード");
}
applyTheme();

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
    {selector:"node.focus-root",style:{"border-color":"#5eead4","border-width":4,"background-color":"#042525","z-index":999}},
    {selector:"node.focus-neighbor",style:{"border-color":"#67e8f9","border-width":3,"background-color":"#061d2a"}},
    {selector:"node.pinned-node",style:{"border-color":"#fbbf24","border-width":4,"background-color":"#2a1f05"}},
    {selector:"node.isolated-by-filter",style:{"opacity":0.35}},
    {selector:"node.focus-dim",style:{"opacity":0.09}},
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
    {selector:"edge.focus-edge",style:{"width":4,"line-color":"#5eead4","target-arrow-color":"#5eead4","source-arrow-color":"#5eead4","z-index":998}},
    {selector:"edge.rel-hidden",style:{"display":"none"}},
    {selector:"edge.focus-dim",style:{"opacity":0.04}},
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

const relationKindState = { LOOKUP: true, REF: true };
let focusMode = true;
let focusDepth = 1;
let focusDirection = "both";
let currentFocusNodeId = "";
let lastTappedNodeId = "";
const pinnedNodeIds = new Set();

function syncLegendState(){
  const lookup = document.getElementById("legend-lookup-edge");
  const ref = document.getElementById("legend-ref-edge");
  if(lookup) lookup.classList.toggle("off", !relationKindState.LOOKUP);
  if(ref) ref.classList.toggle("off", !relationKindState.REF);
}

function applyRelationFilter(){
  const partialFilter = !relationKindState.LOOKUP || !relationKindState.REF;
  cy.edges().forEach(e=>{
    const visible = !!relationKindState[e.data("kind")];
    e.toggleClass("rel-hidden", !visible);
  });
  cy.nodes().forEach(n=>{
    const visibleEdgeCount = n.connectedEdges().filter(e=>!e.hasClass("rel-hidden")).length;
    n.toggleClass("isolated-by-filter", partialFilter && visibleEdgeCount === 0);
  });
  syncLegendState();
}

function collectFocusSet(rootNode, depth, direction){
  let nodes = cy.collection(rootNode);
  let edges = cy.collection();
  let frontier = cy.collection(rootNode);
  const visited = new Set([rootNode.id()]);

  for(let i=0;i<depth;i++){
    let next = cy.collection();
    frontier.forEach(n=>{
      let candidateEdges = n.connectedEdges().filter(e=>!e.hasClass("rel-hidden"));
      if(direction==="out") candidateEdges = candidateEdges.filter(e=>e.source().id()===n.id());
      if(direction==="in") candidateEdges = candidateEdges.filter(e=>e.target().id()===n.id());

      candidateEdges.forEach(e=>{
        edges = edges.union(e);
        let linked = cy.collection();
        if(direction==="out") linked = linked.union(e.target());
        else if(direction==="in") linked = linked.union(e.source());
        else linked = linked.union(e.connectedNodes().difference(n));

        linked.forEach(nn=>{
          if(visited.has(nn.id())) return;
          visited.add(nn.id());
          nodes = nodes.union(nn);
          next = next.union(nn);
        });
      });
    });
    frontier = next;
    if(frontier.length===0) break;
  }

  return { nodes, edges };
}

function applyFocusToNode(node, silent){
  cy.elements().removeClass("focus-root focus-neighbor focus-edge focus-dim");
  if(!focusMode || !node || !node.length) return;

  const depth = Math.max(1, Number(focusDepth) || 1);
  const result = collectFocusSet(node, depth, focusDirection);
  cy.elements().addClass("focus-dim");
  result.nodes.removeClass("focus-dim").addClass("focus-neighbor");
  result.edges.removeClass("focus-dim").addClass("focus-edge");
  node.removeClass("focus-neighbor").addClass("focus-root");
  currentFocusNodeId = node.id();

  if(!silent){
    const relatedCount = Math.max(0, result.nodes.length - 1);
    toast("関連強調: "+relatedCount+"アプリ");
  }
}

function clearFocus(silent){
  currentFocusNodeId = "";
  cy.elements().removeClass("focus-root focus-neighbor focus-edge focus-dim");
  if(!silent) toast("関連強調を解除");
}

function toggleFocusMode(){
  focusMode = !focusMode;
  const btn = document.getElementById("focus-toggle-btn");
  if(btn){
    btn.classList.toggle("active", focusMode);
    btn.textContent = focusMode ? "🎯 関連強調 ON" : "🎯 関連強調 OFF";
  }
  if(!focusMode) clearFocus(true);
  else if(currentFocusNodeId) applyFocusToNode(cy.getElementById(currentFocusNodeId), true);
  toast(focusMode ? "関連強調 ON" : "関連強調 OFF");
}

function updateFocusOptions(){
  focusDepth = Number(document.getElementById("focus-depth")?.value || 1);
  focusDirection = document.getElementById("focus-direction")?.value || "both";
  if(focusMode && currentFocusNodeId) applyFocusToNode(cy.getElementById(currentFocusNodeId), true);
}

function toggleRelationKind(kind){
  relationKindState[kind] = !relationKindState[kind];
  const btn = document.getElementById(kind==="LOOKUP" ? "rel-lookup-btn" : "rel-ref-btn");
  if(btn) btn.classList.toggle("active", !!relationKindState[kind]);
  applyRelationFilter();
  if(focusMode && currentFocusNodeId) applyFocusToNode(cy.getElementById(currentFocusNodeId), true);
  toast(kind + " 線: " + (relationKindState[kind] ? "表示" : "非表示"));
}

function pinNode(node,silent){
  if(!node || !node.length) return;
  node.lock();
  node.addClass("pinned-node");
  pinnedNodeIds.add(node.id());
  if(!silent) toast("Pin: "+(appMap.get(node.data("appId"))?.name || node.id()));
}

function unpinNode(node,silent){
  if(!node || !node.length) return;
  node.unlock();
  node.removeClass("pinned-node");
  pinnedNodeIds.delete(node.id());
  if(!silent) toast("Unpin: "+(appMap.get(node.data("appId"))?.name || node.id()));
}

function togglePinFromSelection(){
  let nodes = cy.nodes(":selected");
  if(!nodes.length && lastTappedNodeId){
    const n = cy.getElementById(lastTappedNodeId);
    if(n.length) nodes = nodes.union(n);
  }
  if(!nodes.length){toast("Pin対象ノードを選択してください");return;}
  const allPinned = nodes.every(n=>pinnedNodeIds.has(n.id()));
  nodes.forEach(n=>{if(allPinned) unpinNode(n,true); else pinNode(n,true);});
  toast(allPinned ? "選択ノードをUnpin" : "選択ノードをPin");
}

function clearPins(){
  [...pinnedNodeIds].forEach(id=>{
    const n = cy.getElementById(id);
    if(n.length) n.unlock().removeClass("pinned-node");
  });
  pinnedNodeIds.clear();
  toast("Pinを全解除");
}

applyRelationFilter();
updateFocusOptions();

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
    const visibleEdges = matched.connectedEdges().filter(e=>!e.hasClass("rel-hidden"));
    cy.elements().not(matched).not(visibleEdges).addClass("dimmed");
  }
}

// ─── Click Detail ───
cy.on("tap","node",e=>{
  lastTappedNodeId = e.target.id();
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
  if(focusMode) applyFocusToNode(e.target);
});
cy.on("cxttap","node",e=>{
  const n = e.target;
  if(pinnedNodeIds.has(n.id())) unpinNode(n);
  else pinNode(n);
});
cy.on("tap",e=>{if(e.target===cy){closeDetail();cy.elements().removeClass("highlighted dimmed path-node path-edge");clearFocus(true);}});

function closeDetail(){document.getElementById("detail").classList.remove("open");}

function focusApp(id){
  const n=cy.getElementById("a"+id);
  if(n.length){
    cy.animate({center:{eles:n},zoom:1.5},{ duration:400 });
    n.select();
    if(focusMode) applyFocusToNode(n, true);
  }
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
  const visibleEdges = matched.connectedEdges().filter(e=>!e.hasClass("rel-hidden"));
  cy.elements().not(matched).not(visibleEdges).addClass("dimmed");
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
  const dijkstra=cy.elements().not(".rel-hidden").dijkstra({root:"#"+from,directed:false});
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
    cy.edges().filter(e=>!e.hasClass("rel-hidden")).forEach(e=>{
      const sp=e.sourceEndpoint(),tp=e.targetEndpoint();
      ctx.strokeStyle=e.data("kind")==="LOOKUP"?"#60a5fa":"#34d399";
      ctx.lineWidth=0.5;ctx.beginPath();
      ctx.moveTo((sp.x-bb.x1)*s+ox,(sp.y-bb.y1)*s+oy);
      ctx.lineTo((tp.x-bb.x1)*s+ox,(tp.y-bb.y1)*s+oy);
      ctx.stroke();
    });
    cy.nodes().forEach(n=>{
      const p=n.position();
      if(n.hasClass("pinned-node")) ctx.fillStyle="#fbbf24";
      else if(n.hasClass("focus-root")) ctx.fillStyle="#5eead4";
      else if(n.hasClass("focus-neighbor")) ctx.fillStyle="#67e8f9";
      else if(n.hasClass("path-node")) ctx.fillStyle="#f472b6";
      else if(n.hasClass("highlighted")) ctx.fillStyle="#fbbf24";
      else ctx.fillStyle="#5eead4";
      ctx.globalAlpha=(n.hasClass("dimmed")||n.hasClass("focus-dim"))?0.12:0.8;
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
  {label:"関連強調 ON/OFF",icon:"🎯",action:toggleFocusMode,keys:"Shift+F"},
  {label:"関連強調解除",icon:"🧹",action:()=>clearFocus()},
  {label:"Lookup線 ON/OFF",icon:"🔗",action:()=>toggleRelationKind("LOOKUP")},
  {label:"Related線 ON/OFF",icon:"📋",action:()=>toggleRelationKind("REF")},
  {label:"選択ノード Pin/Unpin",icon:"📌",action:togglePinFromSelection,keys:"Shift+P"},
  {label:"Pin 全解除",icon:"📍",action:clearPins},
  {label:"ミニマップ",icon:"🗺",action:toggleMinimap},
  {label:"テーマ切替",icon:"🌓",action:toggleTheme},
  {label:"PNG エクスポート",icon:"🖼",action:exportPNG},
  {label:"SVG エクスポート",icon:"📄",action:exportSVG},
  {label:"Mermaid エクスポート",icon:"🧜",action:showMermaid},
  {label:"draw.io エクスポート",icon:"📊",action:showDrawio},
  {label:"SQL DDL エクスポート",icon:"🗄",action:showSQL},
  {label:"PlantUML エクスポート",icon:"🌱",action:showPlantUML},
  {label:"JSON Schema エクスポート",icon:"{}",action:showJSON},
  {label:"ハイライト解除",icon:"✨",action:()=>{cy.elements().removeClass("highlighted dimmed path-node path-edge");document.getElementById("search-box").value="";clearFocus(true);}},
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
  if(e.key==="F"&&e.shiftKey){e.preventDefault();toggleFocusMode();}
  if(e.key==="P"&&e.shiftKey){e.preventDefault();togglePinFromSelection();}
  if(e.key==="0"&&(e.ctrlKey||e.metaKey)){e.preventDefault();fit();}
  if(e.key==="Escape"){closeCmd();closeDetail();closeModal();clearFocus(true);}
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

  function getSideApiPrefix(isSource, preview) {
    const c = commonParams();
    const side = isSource ? c.source : c.target;
    return buildApiPrefix(side.guestId, !!preview);
  }

  async function loadViewsForSelect(selectId, inputId) {
    const tApp = document.getElementById('u_targetApp').value.trim();
    if (!tApp) throw new Error('Target App IDを設定してください。');
    const prefix = getSideApiPrefix(false, false);
    const resp = await apiGet(prefix, '/app/views.json', { app: tApp });
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
    const prefix = getSideApiPrefix(isSource, false);
    const ids = [];
    let offset = 0;
    while (true) {
      let q = query ? `${query} ` : '';
      q += `order by $id asc limit 500 offset ${offset}`;
      const resp = await apiGet(prefix, '/records.json', { app, query: q, fields: ['$id'] });
      const records = resp.records || [];
      if (records.length === 0) break;
      records.forEach(r => ids.push(Number(r.$id.value)));
      if (records.length < 500) break;
      offset += 500;
    }
    return ids;
  }

  async function getFullRecordsByQuery(app, query, isSource) {
    const prefix = getSideApiPrefix(isSource, false);
    let allRecords = [];
    let offset = 0;
    while (true) {
      let q = query ? `${query} ` : '';
      q += `limit 500 offset ${offset}`;
      const resp = await apiGet(prefix, '/records.json', { app, query: q });
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
    const prefix = getSideApiPrefix(false, false);
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
      await apiPut(prefix, '/records/status.json', body);
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
    const prefix = getSideApiPrefix(false, false);
    const url = prefix + '/file.json?fileKey=' + encodeURIComponent(fileKey);
    const headers = { 'X-Requested-With': 'XMLHttpRequest' };

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
    setStatus(`添付ファイル一括DL完了 (${fileCount}ファイル)`);
  }

  async function getAllAppsInSpace(isSource) {
    const prefix = getSideApiPrefix(isSource, false);
    let allApps = [];
    let offset = 0;
    while (true) {
      const resp = await apiGet(prefix, '/apps.json', { limit: 100, offset });
      const apps = resp.apps || [];
      allApps = allApps.concat(apps);
      if (apps.length < 100) break;
      offset += 100;
      await new Promise(r => setTimeout(r, 200));
    }
    return allApps;
  }

  async function downloadBlobWithRetry(fileKey, isSource, guestSpaceId) {
    let prefix = getSideApiPrefix(isSource, false);
    if (guestSpaceId) {
      prefix = `/k/guest/${guestSpaceId}/v1`;
    }
    const url = prefix + '/file.json?fileKey=' + encodeURIComponent(fileKey);
    const headers = { 'X-Requested-With': 'XMLHttpRequest' };

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
    const a = document.createElement("a");
    const u = URL.createObjectURL(zipBlob);
    a.href = u;
    a.download = "customize_scripts.zip";
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(u); }, 100);

    setStatus(`JS/CSS一括DL完了 (403スキップ: ${failedCount}件)`);
  }

  setStatus('起動完了');
})();
