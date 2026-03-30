'use strict';

import { ui } from '../state.js';
import { esc } from '../utils.js';
import { apiGet, buildApiPrefix } from '../api.js';
import { setStatus } from '../ui/components.js';
import { commonParams } from './diff.js';
import { getToolDocument } from '../ui/dialog.js';

export async function launchKintoneSql() {
  const sourceAppEl = getToolDocument().getElementById('u_sourceApp');
  if (!sourceAppEl) {
    setStatus('エラー: 比較元アプリID入力欄が見つかりません。画面を再読み込みしてください。', true);
    return;
  }
  const sApp = sourceAppEl.value.trim();
  if (!sApp) {
    setStatus('エラー: 比較元アプリIDを設定してください', true);
    return;
  }
  const existing = getToolDocument().getElementById('kintone-sql-runner');
  if (existing) existing.remove();

  if (!window.kintone?.api) { setStatus('エラー: kintoneアプリ画面で実行してください', true); return; }

  const ROOT_ID = 'kintone-sql-runner';
  const ALASQL_CDN = 'https://cdn.jsdelivr.net/npm/alasql@4';
  const STORAGE_KEY = 'kintone-sql-runner-history';
  const THEME_KEY = 'kintone-sql-runner-theme';
  const PAGE_SIZE = 200;
  const toolD = getToolDocument();

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

  const Utils = {
    el: (tag, attrs = {}, children = []) => {
      const e = toolD.createElement(tag);
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
        if (c != null) e.appendChild(typeof c === 'string' ? toolD.createTextNode(c) : c);
      });
      return e;
    },

    css: (t) => `
    #${ROOT_ID} { display:flex; flex-direction:column; width:100%; height:75vh; min-height:500px; padding-top:10px; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; }
    #${ROOT_ID} * { box-sizing:border-box; margin:0; padding:0; }
    #${ROOT_ID} .panel { width:100%; height:100%; background:${t.panelBg}; border-radius:6px; display:flex; flex-direction:column; overflow:hidden; border:1px solid ${t.headBorder}; box-shadow:0 2px 8px rgba(0,0,0,0.05); }
    #${ROOT_ID} .head { padding:8px 12px; background:${t.headBg}; border-bottom:1px solid ${t.headBorder}; display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
    #${ROOT_ID} .head b { color:${t.text}; font-size:14px; white-space:nowrap; }
    #${ROOT_ID} .body { flex:1; display:flex; min-height:0; }
    #${ROOT_ID} .main-area { flex:1; display:flex; flex-direction:column; min-width:0; }
    #${ROOT_ID} .sidebar { width:240px; background:${t.sidebarBg}; border-left:1px solid ${t.sidebarBorder}; display:flex; flex-direction:column; overflow:hidden; transition:width .2s; }
    #${ROOT_ID} .sidebar.collapsed { width:0; border-left:none; }
    #${ROOT_ID} .sidebar-head { padding:8px 10px; font-weight:bold; font-size:12px; color:${t.text}; background:${t.headBg}; border-bottom:1px solid ${t.headBorder}; display:flex; justify-content:space-between; align-items:center; }
    #${ROOT_ID} .sidebar-body { flex:1; overflow-y:auto; padding:4px 0; }
    #${ROOT_ID} .field-item { padding:4px 10px; font-size:11px; cursor:pointer; color:${t.text}; display:flex; justify-content:space-between; align-items:center; }
    #${ROOT_ID} .field-item:hover { background:${t.accent}22; }
    #${ROOT_ID} .field-type { font-size:10px; color:${t.subText}; background:${t.headBg}; padding:1px 5px; border-radius:3px; }
    #${ROOT_ID} .editor-wrap { position:relative; border-bottom:1px solid ${t.headBorder}; }
    #${ROOT_ID} .editor { width:100%; height:160px; padding:12px; background:${t.editorBg}; color:${t.editorColor}; font-family:'Fira Code','Cascadia Code','Consolas',monospace; font-size:13px; resize:vertical; border:none; outline:none; line-height:1.5; tab-size:2; min-height:60px; max-height:50vh; }
    #${ROOT_ID} .toolbar { padding:6px 10px; background:${t.headBg}; border-bottom:1px solid ${t.headBorder}; display:flex; align-items:center; gap:6px; flex-wrap:wrap; }
    #${ROOT_ID} .toolbar select { font-size:11px; padding:3px 6px; border:1px solid ${t.headBorder}; border-radius:4px; background:${t.panelBg}; color:${t.text}; cursor:pointer; }
    #${ROOT_ID} .result-wrap { flex:1; display:flex; flex-direction:column; min-height:0; }
    #${ROOT_ID} .result { flex:1; overflow:auto; position:relative; background:${t.tableBg}; }
    #${ROOT_ID} table { width:100%; border-collapse:collapse; font-size:12px; }
    #${ROOT_ID} th { position:sticky; top:0; background:${t.thBg}; z-index:1; border:1px solid ${t.tdBorder}; padding:6px 8px; text-align:left; color:${t.text}; font-size:11px; white-space:nowrap; cursor:pointer; user-select:none; }
    #${ROOT_ID} th:hover { background:${t.accent}33; }
    #${ROOT_ID} th .sort-arrow { margin-left:4px; font-size:10px; }
    #${ROOT_ID} td { border:1px solid ${t.tdBorder}; padding:5px 8px; white-space:pre-wrap; max-width:350px; color:${t.text}; font-size:12px; }
    #${ROOT_ID} tr:nth-child(even) { background:${t.altRow}; }
    #${ROOT_ID} .row-num { color:${t.subText}; text-align:right; font-size:10px; min-width:35px; background:${t.thBg}; }
    #${ROOT_ID} .pager { padding:6px 10px; background:${t.headBg}; border-top:1px solid ${t.headBorder}; display:flex; align-items:center; gap:8px; font-size:12px; color:${t.text}; }
    #${ROOT_ID} .pager button { font-size:11px; }
    #${ROOT_ID} .btn { padding:5px 10px; border:1px solid ${t.headBorder}; background:${t.panelBg}; border-radius:4px; cursor:pointer; font-size:11px; color:${t.text}; white-space:nowrap; transition:background .15s; }
    #${ROOT_ID} .btn:hover { background:${t.accent}22; }
    #${ROOT_ID} .btn:active { transform:scale(0.97); }
    #${ROOT_ID} .btn.primary { background:${t.accent}; color:#fff; border-color:${t.accentHover}; }
    #${ROOT_ID} .btn.primary:hover { background:${t.accentHover}; }
    #${ROOT_ID} .btn.sm { padding:3px 7px; font-size:10px; }
    #${ROOT_ID} .btn.icon { padding:4px 7px; font-size:14px; line-height:1; }
    #${ROOT_ID} .status { font-size:11px; color:${t.subText}; margin-left:auto; white-space:nowrap; }
    #${ROOT_ID} .error { color:${t.error}; padding:15px; font-family:monospace; font-size:13px; line-height:1.6; }
    #${ROOT_ID} .history-dropdown { position:absolute; top:100%; left:0; right:0; background:${t.panelBg}; border:1px solid ${t.headBorder}; border-radius:0 0 6px 6px; max-height:250px; overflow-y:auto; z-index:10; box-shadow:0 4px 12px rgba(0,0,0,0.2); }
    #${ROOT_ID} .history-item { padding:6px 10px; font-size:11px; font-family:monospace; cursor:pointer; color:${t.text}; border-bottom:1px solid ${t.headBorder}; display:flex; justify-content:space-between; align-items:center; }
    #${ROOT_ID} .history-item:hover { background:${t.accent}22; }
    #${ROOT_ID} .history-time { font-size:10px; color:${t.subText}; font-family:sans-serif; }
    #${ROOT_ID} .app-input { width:70px; font-size:11px; padding:3px 6px; border:1px solid ${t.headBorder}; border-radius:4px; background:${t.panelBg}; color:${t.text}; text-align:center; }
    #${ROOT_ID} [data-tooltip]:hover::after { content:attr(data-tooltip); position:absolute; bottom:110%; left:50%; transform:translateX(-50%); background:#333; color:#fff; padding:3px 8px; border-radius:4px; font-size:10px; white-space:nowrap; z-index:100; pointer-events:none; }
    #${ROOT_ID} [data-tooltip] { position:relative; }
    #${ROOT_ID} .no-result { padding:30px; text-align:center; color:${t.subText}; font-size:14px; }
  `,

    loadScript: (src) => new Promise((resolve, reject) => {
      if (window.alasql) return resolve();
      const s = toolD.createElement('script');
      s.src = src;
      s.onload = resolve;
      s.onerror = reject;
      toolD.head.appendChild(s);
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
      Object.assign(toolD.createElement('a'), { href: url, download: filename }).click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    },

    copyToClipboard: async (data) => {
      if (!data?.length) return false;
      const keys = Object.keys(data[0]);
      const tsv = [keys.join('\t'), ...data.map(r => keys.map(k => r[k] ?? '').join('\t'))].join('\n');
      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(tsv);
          return true;
        }
      } catch (e) {
        console.warn('Clipboard API failed, fallback to execCommand', e);
      }
      const ta = toolD.createElement('textarea');
      ta.value = tsv;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      toolD.body.appendChild(ta);
      ta.select();
      const ok = toolD.execCommand('copy');
      ta.remove();
      return ok;
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
      return { cleaned: clean, issues, hash: Utils.hashSql(clean) };
    },

    getHistory: () => {
      try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch (e) { return []; }
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

  const Logic = {
    appCaches: {},

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
      } catch (e) {
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

    const renderFields = (fields, flatData) => {
      if (!sidebarBody) return;
      sidebarBody.innerHTML = '';

      if (flatData?.length) {
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
        sidebarBody.appendChild(Utils.el('div', { style: { padding: '10px', fontSize: '11px', color: Themes[currentTheme].subText } }, '先にクエリを実行すると項目一覧を表示します'));
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

    const getSortedData = () => {
      if (!lastResult) return [];
      if (sortCol === null) return lastResult;
      return [...lastResult].sort((a, b) => {
        let va = a[sortCol], vb = b[sortCol];
        if (va == null) va = '';
        if (vb == null) vb = '';
        const na = Number(va), nb = Number(vb);
        if (!isNaN(na) && !isNaN(nb)) return sortAsc ? na - nb : nb - na;
        return sortAsc ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
      });
    };

    const renderTable = () => {
      resultEl.innerHTML = '';
      pagerEl.innerHTML = '';

      if (!lastResult?.length) {
        resultEl.appendChild(Utils.el('div', { className: 'no-result' }, '結果はありません。'));
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
            toolD.createTextNode(k),
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

      if (totalPages > 1) {
        const info = Utils.el('span', {}, `${currentPage + 1} / ${totalPages} ページ (${lastResult.length}件)`);
        const btnPrev = Utils.el('button', {
          className: 'btn sm', disabled: currentPage === 0,
          onclick: () => { currentPage--; renderTable(); }
        }, '◀ 前へ');
        const btnNext = Utils.el('button', {
          className: 'btn sm', disabled: currentPage >= totalPages - 1,
          onclick: () => { currentPage++; renderTable(); }
        }, '次へ ▶');
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
        pagerEl.appendChild(Utils.el('span', {}, `${lastResult.length}件`));
      }
    };

    const handleError = (e) => {
      console.error(e);
      resultEl.innerHTML = '';
      const msg = e.message || String(e);
      const detail = e.stack ? `\n\nStack:\n${e.stack.split('\n').slice(0, 3).join('\n')}` : '';
      resultEl.appendChild(Utils.el('div', { className: 'error' }, `❌ ${msg}${detail}`));
      setStatus('エラーが発生しました。');
    };

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
          setStatus('安全性チェックに失敗したため、クエリを中止しました。');
          return;
        }
      }

      const t0 = performance.now();
      try {
        const appId = getToolDocument().getElementById('u_sourceApp').value.trim();

        setStatus('レコードを取得中...');
        const primary = await Logic.loadApp(appId, expandSubtables, (n) => setStatus(`アプリ ${appId}: ${n}件取得...`));

        const datasets = [primary.flat];

        if (extraAppId && sql.includes('?1')) {
          setStatus(`追加アプリ ${extraAppId} を取得中...`);
          const secondary = await Logic.loadApp(Number(extraAppId), expandSubtables, (n) => setStatus(`アプリ ${extraAppId}: ${n}件取得...`));
          datasets.push(secondary.flat);
        }

        setStatus('SQL を実行中...');
        await new Promise(r => setTimeout(r, 10));

        const res = await Logic.runSql(sql, ...datasets);
        const elapsed = ((performance.now() - t0) / 1000).toFixed(2);

        lastResult = Array.isArray(res) ? res : [{ result: res }];
        currentPage = 0;
        sortCol = null;
        sortAsc = true;
        renderTable();
        setStatus(`${lastResult.length}件 / ${elapsed}s [${safety.hash}]`);

        renderFields(primary.fields, primary.flat);

        Utils.addHistory(sql, { hash: safety.hash, safety: safety.issues.length ? 'double-confirm' : 'normal' });
        console.info(`[KintoneSQL] hash=${safety.hash} safety=${safety.issues.length ? 'double-confirm' : 'normal'}`);
      } catch (e) {
        handleError(e);
      }
    };

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

      historyDropdown.appendChild(Utils.el('div', {
        className: 'history-item',
        style: { justifyContent: 'center', color: Themes[currentTheme].error, fontFamily: 'sans-serif' },
        onclick: () => { Utils.clearHistory(); historyDropdown.remove(); historyDropdown = null; }
      }, '🗑 履歴を削除'));

      anchor.style.position = 'relative';
      anchor.appendChild(historyDropdown);
    };

    const closeHistory = (e) => {
      if (historyDropdown && !historyDropdown.contains(e.target)) {
        historyDropdown.remove();
        historyDropdown = null;
      }
    };

    const init = () => {
      const old = getToolDocument().getElementById(ROOT_ID);
      if (old) old.remove();
      const oldStyle = getToolDocument().getElementById(ROOT_ID + '-style');
      if (oldStyle) oldStyle.remove();

      styleEl = Utils.el('style', { id: ROOT_ID + '-style' });
      applyTheme();

      editorEl = Utils.el('textarea', {
        className: 'editor',
        value: 'SELECT * FROM ? LIMIT 100',
        spellcheck: 'false',
        placeholder: 'SQLを入力...（現在アプリは ?、追加アプリは ?1）'
      });

      editorEl.addEventListener('keydown', (e) => {
        if (e.key === 'Tab') {
          e.preventDefault();
          const s = editorEl.selectionStart, end = editorEl.selectionEnd;
          editorEl.value = editorEl.value.slice(0, s) + '  ' + editorEl.value.slice(end);
          editorEl.selectionStart = editorEl.selectionEnd = s + 2;
        }
        if (e.ctrlKey && e.key === 'Enter') { e.preventDefault(); execute(); }
        if (e.ctrlKey && e.key === 's') { e.preventDefault(); Utils.addHistory(editorEl.value.trim()); setStatus('履歴に保存しました。'); }
      });

      statusEl = Utils.el('div', { className: 'status' }, '待機中');
      resultEl = Utils.el('div', { className: 'result' });
      pagerEl = Utils.el('div', { className: 'pager' });

      const btnRun = Utils.el('button', { className: 'btn primary', onclick: execute, title: 'Ctrl+Enter' }, '▶ 実行');

      const btnCsv = Utils.el('button', {
        className: 'btn', onclick: () => {
          if (!lastResult?.length) { setStatus('出力対象データがありません。'); return; }
          Utils.downloadCsv(lastResult, `query_${Date.now()}.csv`);
          setStatus('CSV を出力しました。');
        }, title: 'CSVとして出力'
      }, '📥 CSV');

      const btnCopy = Utils.el('button', {
        className: 'btn', onclick: async () => {
          if (await Utils.copyToClipboard(lastResult)) setStatus('クリップボードへコピーしました。');
          else setStatus('コピー対象データがありません。');
        }, title: 'TSVとしてコピー'
      }, '📋 コピー');

      const btnReload = Utils.el('button', {
        className: 'btn', onclick: () => {
          Logic.clearCache();
          setStatus('キャッシュをクリアしました。');
        }, title: 'データキャッシュをクリア'
      }, '🔄 再読込');

      const historyWrap = Utils.el('div', { style: { position: 'relative', display: 'inline-block' } });
      const btnHistory = Utils.el('button', { className: 'btn', onclick: () => toggleHistory(historyWrap), title: 'クエリ履歴 (Ctrl+S で保存)' }, '📜 履歴');
      historyWrap.appendChild(btnHistory);

      const btnTheme = Utils.el('button', {
        className: 'btn icon', onclick: () => {
          currentTheme = currentTheme === 'light' ? 'dark' : 'light';
          Utils.setTheme(currentTheme);
          applyTheme();
        }, title: 'テーマ切替'
      }, currentTheme === 'light' ? '🌙' : '☀️');

      const btnClose = Utils.el('button', {
        className: 'btn', onclick: () => {
          root.remove(); styleEl.remove(); toolD.removeEventListener('click', closeHistory);
          const sqlPane = toolD.querySelector('.pane[data-pane="sql"]');
          const btnWrap = sqlPane ? sqlPane.querySelector('.btns') : null;
          if (btnWrap) btnWrap.style.display = '';
        }
      }, '✕ 閉じる');

      const head = Utils.el('div', { className: 'head' }, [
        Utils.el('b', {}, '⚡ kintone SQL 実行'),
        btnRun, btnCsv, btnCopy, btnReload, historyWrap,
        btnTheme, statusEl, btnClose
      ]);

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
          setStatus(expandSubtables ? 'サブテーブル展開: ON' : 'サブテーブル展開: OFF');
        }
      });
      const subtableLabel = Utils.el('label', { for: ROOT_ID + '-st', style: { fontSize: '11px', color: Themes[currentTheme].text, cursor: 'pointer', userSelect: 'none' } }, [
        subtableCheck, toolD.createTextNode(' サブテーブル展開')
      ]);

      const appInput = Utils.el('input', {
        className: 'app-input', type: 'number', placeholder: 'アプリID',
        title: 'JOIN 用の追加アプリID (?1)',
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
        Utils.el('span', {}, '項目一覧'),
        btnToggleSidebar
      ]);
      const sidebar = Utils.el('div', { className: 'sidebar' }, [sidebarHead, sidebarBody]);
      renderFields({}, null);

      const editorWrap = Utils.el('div', { className: 'editor-wrap' }, editorEl);
      const resultWrap = Utils.el('div', { className: 'result-wrap' }, [resultEl, pagerEl]);
      const mainArea = Utils.el('div', { className: 'main-area' }, [editorWrap, toolbar, resultWrap]);
      const body = Utils.el('div', { className: 'body' }, [mainArea, sidebar]);
      const panel = Utils.el('div', { className: 'panel' }, [head, body]);

      root = Utils.el('div', { id: ROOT_ID }, panel);
      toolD.addEventListener('click', closeHistory);

      toolD.head.appendChild(styleEl);

      const sqlPane = toolD.querySelector('.pane[data-pane="sql"]');
      const btnWrap = sqlPane ? sqlPane.querySelector('.btns') : null;
      if (btnWrap) btnWrap.style.display = 'none';

      if (sqlPane) sqlPane.appendChild(root);
      else toolD.body.appendChild(root);

      editorEl.focus();
    };

    return { init };
  })();

  UI.init();
}
