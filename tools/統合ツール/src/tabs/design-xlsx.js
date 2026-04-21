'use strict';

import { TOOL_ID } from '../constants.js';
import { getToolDocument } from '../ui/dialog.js';
import { showToast } from '../utils.js';

export async function runAdvancedDesignExporter(params = {}) {
  const sourceAppId = Number(params.appId);
  if (!sourceAppId) throw new Error('有効な比較元アプリIDが指定されませんでした。');
  const sourceGuestId = String(params.guestId || '').trim();

  const CONFIG = {
    SHEETLIB_PRIMARY_URL: 'https://cdn.jsdelivr.net/npm/xlsx-js-style@1.2.0/dist/xlsx.min.js',
    SHEETLIB_FALLBACK_URL: 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js',
    MAX_RETRIES: 3,
    RETRY_DELAY: 1000,
    API_CONCURRENCY: 4,
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
      HEADER_BG: 'FF4A90E2', HEADER_TEXT: 'FFFFFFFF',
      TITLE_BG: 'FF2E5C8A', TITLE_TEXT: 'FFFFFFFF',
      ZEBRA_EVEN: 'FFF8F9FA', ZEBRA_ODD: 'FFFFFFFF',
      BORDER: 'FF666666', SECTION_BG: 'FFECF0F1',
      REQUIRED_BG: 'FFFFF2CC', WARNING_BG: 'FFFFC000',
      SUCCESS_BG: 'FFC6EFCE', DANGER_BG: 'FFF8CBAD',
      INFO_BG: 'FFD9E1F2', SUBTABLE_BG: 'FFE8EAF6',
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

  class Semaphore {
    constructor(max) { this.max = max; this.current = 0; this.queue = []; }
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
    const main = getToolDocument().getElementById(TOOL_ID);
    const raw = main ? Number(window.getComputedStyle(main).zIndex) : NaN;
    const base = Number.isFinite(raw) ? raw : 2147483646;
    return String(Math.min(2147483647, Math.max(2000000000, base + 1)));
  }

  const UI = {
    id: 'kintone-exporter-overlay', totalSteps: 0, currentStep: 0, failedAPIs: [],
    show(msg, totalSteps = 10) {
      UI.totalSteps = totalSteps; UI.currentStep = 0; UI.failedAPIs = [];
      const doc = getToolDocument();
      let el = doc.getElementById(UI.id);
      if (!el) { el = doc.createElement('div'); el.id = UI.id; Object.assign(el.style, { position: 'fixed', top: '0', left: '0', width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.7)', zIndex: getExporterOverlayZIndex(), display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: '#fff', fontSize: '16px', fontFamily: '"Meiryo", sans-serif' }); doc.body.appendChild(el); }
      el.style.zIndex = getExporterOverlayZIndex();
      el.innerHTML = `<div style="background:rgba(255,255,255,0.1);border-radius:12px;padding:32px 48px;text-align:center;min-width:400px;"><div style="font-size:20px;font-weight:bold;margin-bottom:16px;">📊 kintone 設計書エクスポーター v2.0</div><div id="kex-status" style="margin-bottom:12px;font-size:14px;color:#ccc;">${msg}</div><div style="background:rgba(255,255,255,0.2);border-radius:8px;height:24px;overflow:hidden;margin-bottom:8px;"><div id="kex-progress-bar" style="height:100%;width:0%;background:linear-gradient(90deg,#4A90E2,#7B68EE);border-radius:8px;transition:width 0.3s ease;"></div></div><div id="kex-percent" style="font-size:12px;color:#aaa;">0%</div><div id="kex-errors" style="font-size:11px;color:#f99;margin-top:8px;max-height:60px;overflow-y:auto;"></div></div>`;
    },
    update(msg, step) {
      if (step !== undefined) UI.currentStep = step; else UI.currentStep++;
      const pct = Math.min(100, Math.round((UI.currentStep / UI.totalSteps) * 100));
      const doc = getToolDocument();
      const statusEl = doc.getElementById('kex-status');
      const barEl = doc.getElementById('kex-progress-bar');
      const pctEl = doc.getElementById('kex-percent');
      if (statusEl) statusEl.textContent = msg;
      if (barEl) barEl.style.width = `${pct}%`;
      if (pctEl) pctEl.textContent = `${pct}%`;
    },
    logError(apiName, error) {
      UI.failedAPIs.push({ name: apiName, error: error?.message || String(error) });
      const errEl = getToolDocument().getElementById('kex-errors');
      if (errEl) errEl.textContent = `⚠ ${UI.failedAPIs.length}件のAPI取得に失敗`;
    },
    hide() { const doc = getToolDocument(); const el = doc.getElementById(UI.id); if (el) doc.body.removeChild(el); }
  };

  const UtilsX = {
    pad: n => n.toString().padStart(2, '0'),
    dt: (d = new Date()) => { const p = UtilsX.pad; return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`; },
    toJST: (isoString) => { if (!isoString) return '-'; try { return new Date(isoString).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }); } catch { return isoString; } },
    safeGet: (obj, path, def = '') => { try { if (!obj || typeof obj !== 'object') return def; const v = path.split('.').reduce((o, k) => (o && o[k] !== undefined ? o[k] : undefined), obj); return v === undefined ? def : v; } catch (e) { return def; } },
    ensureArray: v => Array.isArray(v) ? v : [],
    safeJoin: (arr, sep = '、') => Array.isArray(arr) ? arr.filter(v => v !== '' && v != null).join(sep) : '',
    sleep: ms => new Promise(r => setTimeout(r, ms)),
    calculateCellWidth: text => { if (!text) return CONFIG.MIN_COL_WIDTH; const str = String(text); let width = 0; for (const line of str.split('\n')) { let lw = 0; for (const ch of line) lw += /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\uFF00-\uFFEF]/.test(ch) ? 2 : 1; if (lw > width) width = lw; } return Math.max(CONFIG.MIN_COL_WIDTH, Math.min(CONFIG.MAX_COL_WIDTH, width + 2)); },
    colToA1: (n) => { let s = ''; while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = (n - 1) / 26 | 0; } return s; },
    a1: (r, c) => `${UtilsX.colToA1(c)}${r}`,
    escapeRegExp: (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
    stripHtml: (html) => String(html || '').replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&'),
    formatBoolean: (val) => (val ? '○' : '-'),
    formatEntity: (entity) => { if (!entity) return '-'; if (Array.isArray(entity)) return entity.map(e => UtilsX.formatEntity(e)).join('\n'); const e = entity.entity || entity; const t = (e.type || '').toString().toUpperCase(); const typeMap = { USER: 'ユーザー', GROUP: 'グループ', ORGANIZATION: '組織', FIELD_ENTITY: 'フィールド値', CREATOR: '作成者', MODIFIER: '更新者', LOGIN_USER: 'ログインユーザー', ALL: '全員' }; const typeJP = typeMap[t] || e.type || '不明'; if (e.name) return `${typeJP}:${e.name}`; if (e.code) return `${typeJP}:${e.code}`; return typeJP; },
    formatEntityDetailed: (entity) => { if (!entity) return '-'; if (Array.isArray(entity)) return entity.map(e => UtilsX.formatEntityDetailed(e)).join('\n'); const e = entity.entity || entity; const t = (e.type || '').toString().toUpperCase(); const typeMap = { USER: 'ユーザー', GROUP: 'グループ', ORGANIZATION: '組織', FIELD_ENTITY: 'フィールド値', CREATOR: '作成者', MODIFIER: '更新者', LOGIN_USER: 'ログインユーザー', ALL: '全員' }; const typeJP = typeMap[t] || e.type || '不明'; const parts = [typeJP]; if (e.name) parts.push(e.name); else if (e.code) parts.push(`コード:${e.code}`); if (entity.includeSubs) parts.push('(サブ組織含)'); return parts.join(': '); },
    formatSort: (sortStr) => { if (!sortStr) return '-'; return String(sortStr).replace(/\basc\b/gi, '昇順').replace(/\bdesc\b/gi, '降順'); },
    formatFilterCond: (condStr) => { if (!condStr) return '-'; let r = String(condStr); r = r.replace(/\s*,\s*/g, ', '); return r; },
    formatFieldFormat: (f) => { if (!f || typeof f !== 'object') return ''; const parts = []; if (f.digit !== undefined) parts.push(`桁区切り: ${f.digit ? 'あり' : 'なし'}`); if (f.displayScale !== undefined) parts.push(`小数点: ${f.displayScale}桁`); if (f.unit) parts.push(`単位: ${f.unit}`); return parts.join('、'); },
    formatDefaultValue: (dv) => { if (dv == null) return ''; if (Array.isArray(dv)) { if (dv.length > 0 && typeof dv[0] === 'object') return dv.map(i => i.name || i.code || JSON.stringify(i)).join('、'); return dv.join('、'); } if (typeof dv === 'object') { if (dv.type === 'NUMBER') return String(dv.value || ''); return dv.name || dv.code || JSON.stringify(dv); } return String(dv); },
    safeJSONStringify: (obj) => { try { return JSON.stringify(obj, null, 2); } catch (e) { return String(obj); } }
  };

  async function loadSheetLib() {
    if (typeof window.XLSX !== 'undefined') return { styled: true };
    // XLSX は本コードと同じ realm（main window）に読み込む必要があるため
    // getToolDocument() ではなく main の document を使う（popout 時に XLSX が
    // popout window 側へ登録され「XLSX is not defined」となるのを防ぐ）。
    const loadScriptLocal = (src, timeout = 15000) => new Promise((resolve, reject) => { const s = document.createElement('script'); s.src = src; s.async = true; let done = false; const timer = setTimeout(() => { if (!done) { done = true; reject(new Error(`Timeout: ${src}`)); } }, timeout); s.onload = () => { if (!done) { done = true; clearTimeout(timer); resolve(true); } }; s.onerror = () => { if (!done) { done = true; clearTimeout(timer); reject(new Error(`Failed: ${src}`)); } }; document.head.appendChild(s); });
    try { await loadScriptLocal(CONFIG.SHEETLIB_PRIMARY_URL); return { styled: true }; }
    catch { await loadScriptLocal(CONFIG.SHEETLIB_FALLBACK_URL); return { styled: false }; }
  }

  async function retry(fn, max = CONFIG.MAX_RETRIES) {
    for (let i = 0; i < max; i++) {
      try { return await fn(); }
      catch (e) { if (i === max - 1) throw e; await UtilsX.sleep(CONFIG.RETRY_DELAY * (i + 1)); }
    }
  }

  async function fetchJob(name, promiseFn) {
    try { return await apiSemaphore.run(() => retry(promiseFn)); }
    catch (e) { console.warn(`[${name}] Failed:`, e); UI.logError(name, e); return null; }
  }

  function showExportOptionsDialog() {
    return new Promise((resolve) => {
      const overlay = getToolDocument().createElement('div');
      Object.assign(overlay.style, { position: 'fixed', top: '0', left: '0', width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.6)', zIndex: getExporterOverlayZIndex(), display: 'flex', justifyContent: 'center', alignItems: 'center', fontFamily: '"Meiryo", sans-serif' });
      const sheets = [
        { key: 'summary', label: 'サマリー', default: true, required: true },
        { key: 'fields', label: '項目定義', default: true },
        { key: 'layout', label: 'フォームレイアウト', default: true },
        { key: 'views', label: '一覧', default: true },
        { key: 'reports', label: 'グラフ', default: true },
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
      const checkboxes = sheets.map(s => `<label style="display:block;margin:3px 0;font-size:13px;cursor:${s.required ? 'default' : 'pointer'};"><input type="checkbox" value="${s.key}" ${s.default ? 'checked' : ''} ${s.required ? 'disabled' : ''} style="margin-right:6px;">${s.label}${s.required ? ' (必須)' : ''}</label>`).join('');
      overlay.innerHTML = `<div style="background:#fff;border-radius:12px;padding:28px;min-width:360px;max-width:460px;max-height:80vh;overflow-y:auto;box-shadow:0 4px 24px rgba(0,0,0,0.3);"><div style="font-size:18px;font-weight:bold;color:#2E5C8A;margin-bottom:16px;">📊 エクスポート設定</div><div style="font-size:12px;color:#666;margin-bottom:12px;">出力するシートを選択してください</div><div style="display:flex;gap:8px;margin-bottom:12px;"><button id="kex-select-all" style="font-size:11px;padding:4px 10px;border:1px solid #ccc;border-radius:4px;background:#f5f5f5;cursor:pointer;">全選択</button><button id="kex-select-none" style="font-size:11px;padding:4px 10px;border:1px solid #ccc;border-radius:4px;background:#f5f5f5;cursor:pointer;">全解除</button></div><div id="kex-sheet-options" style="max-height:340px;overflow-y:auto;padding:8px;background:#fafafa;border-radius:6px;border:1px solid #eee;">${checkboxes}</div><div style="display:flex;gap:10px;justify-content:flex-end;margin-top:18px;"><button id="kex-cancel" style="padding:8px 20px;border:1px solid #ccc;border-radius:6px;background:#fff;cursor:pointer;font-size:13px;">キャンセル</button><button id="kex-export" style="padding:8px 20px;border:none;border-radius:6px;background:#4A90E2;color:#fff;cursor:pointer;font-size:13px;font-weight:bold;">エクスポート</button></div></div>`;
      getToolDocument().body.appendChild(overlay);
      overlay.querySelector('#kex-select-all').onclick = () => { overlay.querySelectorAll('#kex-sheet-options input[type="checkbox"]').forEach(cb => cb.checked = true); };
      overlay.querySelector('#kex-select-none').onclick = () => { overlay.querySelectorAll('#kex-sheet-options input[type="checkbox"]:not([disabled])').forEach(cb => cb.checked = false); };
      overlay.querySelector('#kex-cancel').onclick = () => { getToolDocument().body.removeChild(overlay); resolve(null); };
      overlay.querySelector('#kex-export').onclick = () => { const selected = new Set(); overlay.querySelectorAll('#kex-sheet-options input[type="checkbox"]:checked').forEach(cb => selected.add(cb.value)); getToolDocument().body.removeChild(overlay); resolve(selected); };
    });
  }

  try {
    const APP_ID = Number(sourceAppId);
    if (!APP_ID) throw new Error('有効な比較元アプリIDが指定されませんでした。');

    const selectedSheets = await showExportOptionsDialog();
    if (!selectedSheets) return false;

    UI.show('ライブラリ読み込み中...', 12);
    const { styled } = await loadSheetLib();

    const api = kintone.api;
    const apiUrl = (path) => {
      let p = String(path || '');
      if (sourceGuestId) {
        p = p.replace('/k/v1/preview/', `/k/guest/${sourceGuestId}/v1/preview/`).replace('/k/v1/', `/k/guest/${sourceGuestId}/v1/`);
      }
      return kintone.api.url(p, true);
    };

    UI.update('基本情報を取得中...');
    const appSettings = await fetchJob('App', () => api(apiUrl('/k/v1/app.json'), 'GET', { id: APP_ID }));
    const generalSettings = await fetchJob('Settings', () => api(apiUrl('/k/v1/app/settings.json'), 'GET', { app: APP_ID }));

    UI.update('フィールド・レイアウトを取得中...');
    let fieldResp = await fetchJob('FieldsPrev', () => api(apiUrl('/k/v1/preview/app/form/fields.json'), 'GET', { app: APP_ID }));
    if (!fieldResp) fieldResp = await fetchJob('FieldsProd', () => api(apiUrl('/k/v1/app/form/fields.json'), 'GET', { app: APP_ID }));
    let layout = await fetchJob('LayoutPrev', () => api(apiUrl('/k/v1/preview/app/form/layout.json'), 'GET', { app: APP_ID }));
    if (!layout) layout = await fetchJob('LayoutProd', () => api(apiUrl('/k/v1/app/form/layout.json'), 'GET', { app: APP_ID }));

    const filterUserFields = (fields) => {
      const filtered = {};
      for (const [code, field] of Object.entries(fields)) {
        if (SYSTEM_FIELDS.has(code) || SYSTEM_FIELDS.has(field.code)) continue;
        if (['STATUS', 'CATEGORY', 'STATUS_ASSIGNEE'].includes(field.type)) continue;
        filtered[code] = field;
      }
      return filtered;
    };
    const fields = filterUserFields(fieldResp?.properties || {});

    UI.update('レコード件数を取得中...');
    let recordCount = null;
    try {
      const countResp = await fetchJob('RecordCount', () => api(apiUrl('/k/v1/records.json'), 'GET', { app: APP_ID, query: 'limit 1', totalCount: true }));
      recordCount = countResp?.totalCount ?? null;
    } catch (e) { /* ignore */ }

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

    const actions = UtilsX.safeGet(actionsResp, 'actions', {});

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

    UI.update('Excelファイルを生成中...', 10);
    const wb = XLSX.utils.book_new();

    const makeSafeSheetName = (raw, existingNames) => {
      let name = String(raw ?? '').trim() || 'Sheet';
      name = name.replace(/[:\\/\?\*\[\]]/g, '_').replace(/[\u0000-\u001F]/g, '').replace(/^'+|'+$/g, '');
      if (!name) name = 'Sheet';
      if (name.length > 31) name = name.slice(0, 31);
      const existing = existingNames || new Set();
      if (!existing.has(name)) return name;
      let i = 2;
      while (true) { const suffix = `(${i})`; const base = name.length > 31 - suffix.length ? name.slice(0, 31 - suffix.length) : name; const candidate = base + suffix; if (!existing.has(candidate)) return candidate; i++; }
    };

    const appendSheet = (name, data) => {
      if (!data || !Array.isArray(data.aoa) || data.aoa.length === 0) return;
      const ws = XLSX.utils.aoa_to_sheet(data.aoa);
      const safeName = makeSafeSheetName(name, new Set(wb.SheetNames));
      XLSX.utils.book_append_sheet(wb, ws, safeName);
    };

    const buildSimpleAOA = (title, headers, rows) => ({
      aoa: [title ? [title] : [], headers, ...rows],
      options: { headerRowIndex: title ? 1 : 0, titleRows: title ? [0] : [] }
    });

    if (selectedSheets.has('summary')) {
      const summaryRows = [
        ['アプリID', APP_ID],
        ['アプリ名', appSettings?.name || ''],
        ['説明', UtilsX.stripHtml(appSettings?.description || generalSettings?.description || '')],
        ['アイコン', appSettings?.icon?.key || appSettings?.icon?.type || ''],
        ['テーマ', generalSettings?.theme || ''],
        ['スペースID', appSettings?.spaceId || ''],
        ['スレッドID', appSettings?.threadId || ''],
        ['作成日時', UtilsX.toJST(appSettings?.createdAt)],
        ['作成者', appSettings?.creator?.name || ''],
        ['更新日時', UtilsX.toJST(appSettings?.modifiedAt)],
        ['更新者', appSettings?.modifier?.name || ''],
        ['出力日時', UtilsX.dt()],
        ['フィールド数', Object.keys(fields).length],
        ['ビュー数', Object.keys(views?.views || {}).length],
        ['グラフ数', Object.keys(reports?.reports || {}).length],
        ['プロセス管理', status?.enable ? '有効' : '無効'],
        ['プラグイン数', (pluginsResp?.plugins || []).length],
        ['レコード件数', recordCount != null ? recordCount : '-']
      ];
      appendSheet('サマリー', buildSimpleAOA('kintone アプリ設計書', ['項目', '値'], summaryRows));
    }

    const resolveAppName = (appRef) => {
      if (!appRef) return '';
      const id = appRef.app || appRef;
      const nm = appNames[id] || appRef.name;
      return nm ? `${nm}(ID:${id})` : `(ID:${id})`;
    };

    const describeFieldOptions = (f) => {
      if (!f?.options || typeof f.options !== 'object') return '';
      return Object.values(f.options)
        .sort((a, b) => (Number(a.index) || 0) - (Number(b.index) || 0))
        .map((opt) => opt.label || opt.name || '')
        .filter(Boolean)
        .join('、');
    };

    const describeLookup = (f) => {
      if (!f?.lookup) return '';
      const lk = f.lookup;
      const parts = [];
      parts.push(`参照元: ${resolveAppName(lk.relatedApp)}`);
      if (lk.relatedKeyField) parts.push(`キー: ${lk.relatedKeyField}`);
      if (Array.isArray(lk.fieldMappings) && lk.fieldMappings.length) {
        const maps = lk.fieldMappings.map((m) => `${m.relatedField || '-'}→${m.field || '-'}`).join(', ');
        parts.push(`マッピング: ${maps}`);
      }
      return parts.join(' / ');
    };

    const describeReference = (f) => {
      if (!f?.referenceTable) return '';
      const ref = f.referenceTable;
      const parts = [];
      parts.push(`参照先: ${resolveAppName(ref.relatedApp)}`);
      if (ref.condition) parts.push(`条件: ${ref.condition.relatedField || '-'}=${ref.condition.field || '-'}`);
      if (ref.displayFields?.length) parts.push(`表示: ${ref.displayFields.join(', ')}`);
      if (ref.sort) parts.push(`並べ替え: ${UtilsX.formatSort(ref.sort)}`);
      return parts.join(' / ');
    };

    const buildFieldRow = (f, parentTable) => [
      parentTable || '',
      f.label || '',
      f.code || '',
      FIELD_TYPE[f.type] || f.type || '',
      UtilsX.formatBoolean(f.required),
      UtilsX.formatBoolean(f.unique),
      UtilsX.formatBoolean(f.noLabel),
      UtilsX.formatDefaultValue(f.defaultValue),
      UtilsX.formatFieldFormat(f),
      describeFieldOptions(f),
      f.expression || f.formula || '',
      describeLookup(f),
      describeReference(f),
      UtilsX.stripHtml(f.description || '')
    ];

    if (selectedSheets.has('fields')) {
      const fieldHeaders = ['テーブル', 'フィールド名', 'コード', 'タイプ', '必須', '重複禁止', 'ラベル非表示', '初期値', '書式', '選択肢', '計算式', 'ルックアップ', '関連レコード', '説明'];
      const fieldRows = [];
      Object.values(fields).forEach((f) => {
        fieldRows.push(buildFieldRow(f, ''));
        if (f.type === 'SUBTABLE' && f.fields) {
          Object.values(f.fields).forEach((sub) => fieldRows.push(buildFieldRow(sub, f.code || f.label || '')));
        }
      });
      appendSheet('項目定義', buildSimpleAOA('項目定義', fieldHeaders, fieldRows));
    }

    if (selectedSheets.has('layout') && Array.isArray(layout?.layout)) {
      const layoutRows = [];
      const pushLayoutRow = (section, idx, type, code, label, extra) => {
        layoutRows.push([section, idx, type, code || '', label || '', extra || '']);
      };
      const describeLayoutField = (item) => {
        if (!item) return { code: '', label: '', extra: '' };
        const code = item.code || '';
        const def = code ? (fields[code] || null) : null;
        const label = def?.label || item.label || (item.elementId || '');
        const extras = [];
        if (item.size?.width) extras.push(`幅:${item.size.width}`);
        if (item.size?.height) extras.push(`高:${item.size.height}`);
        if (item.elementId) extras.push(`elementId:${item.elementId}`);
        return { code, label, extra: extras.join(', ') };
      };
      layout.layout.forEach((section, i) => {
        const sectionName = section.type === 'GROUP'
          ? `GROUP:${section.code || ''}`
          : (section.type || 'ROW') + (section.code ? `:${section.code}` : '');
        if (section.type === 'GROUP') {
          pushLayoutRow(sectionName, i + 1, 'GROUP', section.code || '', fields[section.code]?.label || '', '');
          const gLayout = Array.isArray(section.layout) ? section.layout : [];
          gLayout.forEach((row, ri) => {
            (row.fields || []).forEach((fld, fi) => {
              const info = describeLayoutField(fld);
              pushLayoutRow(sectionName, `${i + 1}-${ri + 1}-${fi + 1}`, fld.type || '', info.code, info.label, info.extra);
            });
          });
        } else {
          const rowFields = Array.isArray(section.fields) ? section.fields : [];
          if (rowFields.length === 0) {
            pushLayoutRow(sectionName, i + 1, section.type || 'ROW', '', '', '');
          } else {
            rowFields.forEach((fld, fi) => {
              const info = describeLayoutField(fld);
              pushLayoutRow(sectionName, `${i + 1}-${fi + 1}`, fld.type || '', info.code, info.label, info.extra);
            });
          }
        }
      });
      appendSheet('フォームレイアウト', buildSimpleAOA('フォームレイアウト', ['セクション', '位置', 'タイプ', 'コード', 'ラベル', '補足'], layoutRows));
    }

    if (selectedSheets.has('views') && views?.views) {
      const headers = ['ビュー名', '種別', 'インデックス', 'フィルター条件', 'ソート', '表示フィールド', 'ページング', 'メモ'];
      const rows = Object.entries(views.views)
        .sort(([, a], [, b]) => (Number(a.index) || 0) - (Number(b.index) || 0))
        .map(([name, v]) => [
          name,
          v.type || '',
          v.index || '',
          UtilsX.formatFilterCond(v.filterCond),
          UtilsX.formatSort(v.sort),
          Array.isArray(v.fields) ? v.fields.join(', ') : '',
          v.paginationType || '',
          UtilsX.stripHtml(v.customView || v.html || v.builtinType || '')
        ]);
      appendSheet('一覧', buildSimpleAOA('一覧(ビュー)', headers, rows));
    }

    if (selectedSheets.has('reports') && reports?.reports) {
      const headers = ['グラフ名', '種別', '集計対象', '集計方法', 'グループ化', 'ソート', 'フィルター'];
      const rows = Object.entries(reports.reports)
        .sort(([, a], [, b]) => (Number(a.index) || 0) - (Number(b.index) || 0))
        .map(([name, r]) => [
          name,
          r.chartType || r.type || '',
          Array.isArray(r.aggregations) ? r.aggregations.map((a) => `${a.type || ''}:${a.code || ''}`).join('\n') : '',
          r.chartMode || '',
          Array.isArray(r.groups) ? r.groups.map((g) => `${g.code || ''}${g.per ? `(${g.per})` : ''}`).join('、') : '',
          UtilsX.formatSort(Array.isArray(r.sorts) ? r.sorts.map((s) => `${s.by || ''} ${s.order || ''}`).join(', ') : ''),
          UtilsX.formatFilterCond(r.filterCond)
        ]);
      appendSheet('グラフ', buildSimpleAOA('グラフ', headers, rows));
    }

    if (selectedSheets.has('status') && status) {
      const headers = ['種別', '名前', '番号/From', 'To', '作業者', '条件'];
      const rows = [];
      rows.push(['有効/無効', status.enable ? '有効' : '無効', '', '', '', '']);
      Object.entries(status.states || {}).forEach(([name, st]) => {
        const asgn = st.assignee
          ? `${st.assignee.type || ''}${Array.isArray(st.assignee.entities) ? ':' + st.assignee.entities.map(UtilsX.formatEntityDetailed).join(' / ') : ''}`
          : '';
        rows.push(['ステータス', name, st.index || '', '', asgn, '']);
      });
      (status.actions || []).forEach((a) => {
        rows.push(['アクション', a.name || '', a.from || '', a.to || '', '', a.filterCond || '']);
      });
      appendSheet('プロセス管理', buildSimpleAOA('プロセス管理', headers, rows));
    }

    if (selectedSheets.has('statusMatrix') && status?.states && Array.isArray(status?.actions)) {
      const stateNames = Object.entries(status.states || {})
        .sort(([, a], [, b]) => (Number(a.index) || 0) - (Number(b.index) || 0))
        .map(([n]) => n);
      const headers = ['From \\ To', ...stateNames];
      const rows = stateNames.map((from) => {
        const cells = stateNames.map((to) => {
          const found = status.actions.filter((a) => a.from === from && a.to === to).map((a) => a.name || '●');
          return found.join(' / ');
        });
        return [from, ...cells];
      });
      appendSheet('遷移マトリクス', buildSimpleAOA('遷移マトリクス', headers, rows));
    }

    const renderAclRights = (title, name, rights) => {
      const list = Array.isArray(rights) ? rights : [];
      if (!list.length) return null;
      const headers = ['対象', '閲覧', '追加', '編集', '削除', 'インポート', 'エクスポート', 'フィルター条件'];
      const rows = list.map((r) => [
        UtilsX.formatEntityDetailed(r.entity || r),
        UtilsX.formatBoolean(r.viewable),
        UtilsX.formatBoolean(r.addable ?? r.creatable),
        UtilsX.formatBoolean(r.editable),
        UtilsX.formatBoolean(r.deletable),
        UtilsX.formatBoolean(r.importable),
        UtilsX.formatBoolean(r.exportable),
        UtilsX.formatFilterCond(r.filterCond)
      ]);
      return buildSimpleAOA(title, headers, rows);
    };

    if (selectedSheets.has('appAcl')) {
      const data = renderAclRights('アプリ権限', '', appAcl?.rights);
      if (data) appendSheet('アプリ権限', data);
    }
    if (selectedSheets.has('recordAcl')) {
      const list = Array.isArray(recordAcl?.rights) ? recordAcl.rights : [];
      const rows = [];
      list.forEach((group) => {
        const cond = UtilsX.formatFilterCond(group.filterCond);
        (group.entities || []).forEach((ent) => {
          rows.push([
            cond,
            UtilsX.formatEntityDetailed(ent.entity || ent),
            UtilsX.formatBoolean(ent.viewable),
            UtilsX.formatBoolean(ent.editable),
            UtilsX.formatBoolean(ent.deletable),
            UtilsX.formatBoolean(ent.includeSubs)
          ]);
        });
      });
      if (rows.length) {
        appendSheet('レコード権限', buildSimpleAOA('レコード権限', ['フィルター条件', '対象', '閲覧', '編集', '削除', 'サブ組織含'], rows));
      }
    }
    if (selectedSheets.has('fieldAcl')) {
      const list = Array.isArray(fieldAcl?.rights) ? fieldAcl.rights : [];
      const rows = [];
      list.forEach((r) => {
        const code = r.code || r.field || '';
        (r.entities || []).forEach((ent) => {
          rows.push([
            code,
            fields[code]?.label || '',
            UtilsX.formatEntityDetailed(ent.entity || ent),
            UtilsX.formatBoolean(ent.viewable),
            UtilsX.formatBoolean(ent.editable)
          ]);
        });
      });
      if (rows.length) {
        appendSheet('フィールド権限', buildSimpleAOA('フィールド権限', ['フィールドコード', 'フィールド名', '対象', '閲覧', '編集'], rows));
      }
    }

    if (selectedSheets.has('customize') && customize) {
      const renderScope = (scope, obj) => {
        const list = [];
        ['js', 'css'].forEach((kind) => {
          (obj?.[kind] || []).forEach((entry, i) => {
            list.push([scope, kind.toUpperCase(), i + 1, entry.type || '', entry.file?.name || entry.url || '', entry.file?.fileKey || '']);
          });
        });
        return list;
      };
      const rows = [
        ...renderScope('PC', customize.desktop),
        ...renderScope('モバイル', customize.mobile)
      ];
      if (rows.length) {
        appendSheet('JS/CSSカスタマイズ', buildSimpleAOA('JS/CSSカスタマイズ', ['スコープ', '種別', 'No', '参照方法', '名前/URL', 'fileKey'], rows));
      }
    }

    if (selectedSheets.has('actions') && actions) {
      const entries = Array.isArray(actions) ? actions : Object.values(actions);
      const headers = ['アクション名', '実行先アプリ', 'フィルター条件', 'ソート', 'フィールドマッピング'];
      const rows = entries.map((a) => [
        a.name || '',
        resolveAppName(a.destApp),
        UtilsX.formatFilterCond(a.filterCond),
        UtilsX.formatSort(a.sort),
        Array.isArray(a.mappings) ? a.mappings.map((m) => `${m.srcField || m.sourceField || '-'}→${m.destField || '-'}`).join('\n') : ''
      ]);
      if (rows.length) appendSheet('アクション', buildSimpleAOA('アクション', headers, rows));
    }

    if (selectedSheets.has('plugins') && pluginsResp?.plugins) {
      const headers = ['プラグインID', '名前', '状態'];
      const rows = pluginsResp.plugins.map((p) => [p.id || '', p.name || '', p.enabled === false ? '無効' : '有効']);
      if (rows.length) appendSheet('プラグイン', buildSimpleAOA('プラグイン', headers, rows));
    }

    const renderNotifSheet = (title, payload) => {
      const list = Array.isArray(payload?.notifications) ? payload.notifications : [];
      if (!list.length) return;
      const headers = ['対象', '条件/タイミング', 'レコード作成', '編集', 'コメント', 'ステータス', '本文/備考'];
      const rows = list.map((n) => [
        UtilsX.formatEntityDetailed(n.entity || n),
        UtilsX.formatFilterCond(n.filterCond || n.timing || ''),
        UtilsX.formatBoolean(n.recordAdded ?? n.notifyOnCreate),
        UtilsX.formatBoolean(n.recordEdited ?? n.notifyOnEdit),
        UtilsX.formatBoolean(n.commentAdded ?? n.notifyOnComment),
        UtilsX.formatBoolean(n.statusChanged ?? n.notifyOnStatusChange),
        UtilsX.stripHtml(n.title || n.body || '')
      ]);
      appendSheet(title, buildSimpleAOA(title, headers, rows));
    };

    if (selectedSheets.has('genNotif')) renderNotifSheet('通知(一般)', genNotif);
    if (selectedSheets.has('recNotif')) renderNotifSheet('通知(レコード)', recNotif);
    if (selectedSheets.has('remNotif')) renderNotifSheet('通知(リマインダー)', remNotif);

    if (selectedSheets.has('webhook')) {
      const list = Array.isArray(webhooksResp?.webhooks) ? webhooksResp.webhooks : [];
      if (list.length) {
        const headers = ['ID', 'URL', 'イベント', '説明', '有効'];
        const rows = list.map((w) => [
          w.id || '',
          w.url || w.notifyUrl || '',
          Array.isArray(w.notificationEvents || w.events) ? (w.notificationEvents || w.events).join(', ') : '',
          UtilsX.stripHtml(w.description || ''),
          UtilsX.formatBoolean(w.enabled !== false)
        ]);
        appendSheet('Webhook', buildSimpleAOA('Webhook', headers, rows));
      }
    }

    if (selectedSheets.has('adminNotes') && adminNotes) {
      const content = UtilsX.stripHtml(adminNotes.content || adminNotes.note || '');
      if (content) {
        const rows = content.split('\n').map((line, i) => [i + 1, line]);
        appendSheet('管理者メモ', buildSimpleAOA('管理者メモ', ['行', '内容'], rows));
      }
    }

    if (selectedSheets.has('dependencies')) {
      const headers = ['フィールドコード', 'フィールド名', '種別', '参照先アプリ', '詳細'];
      const rows = [];
      const pushDeps = (f, parent) => {
        const label = `${parent ? parent + ' > ' : ''}${f.label || ''}`;
        if (f.lookup?.relatedApp?.app) {
          rows.push([f.code || '', label, 'ルックアップ', resolveAppName(f.lookup.relatedApp), describeLookup(f)]);
        }
        if (f.referenceTable?.relatedApp?.app) {
          rows.push([f.code || '', label, '関連レコード一覧', resolveAppName(f.referenceTable.relatedApp), describeReference(f)]);
        }
      };
      Object.values(fields).forEach((f) => {
        pushDeps(f, '');
        if (f.type === 'SUBTABLE' && f.fields) {
          Object.values(f.fields).forEach((sub) => pushDeps(sub, f.code || f.label || ''));
        }
      });
      Object.values(actions || {}).forEach((a) => {
        if (a?.destApp?.app) {
          rows.push(['(アクション)', a.name || '', 'アクション', resolveAppName(a.destApp), '']);
        }
      });
      if (rows.length) {
        appendSheet('フィールド依存関係', buildSimpleAOA('フィールド依存関係', headers, rows));
      }
    }

    UI.update('ダウンロード中...', 12);
    const safeAppName = String(appSettings?.name || `App${APP_ID}`).replace(/[\\/:*?"<>|]/g, '_');
    const downloadExcel = (wb2, filename) => {
      const out = XLSX.write(wb2, { bookType: 'xlsx', type: 'array', cellStyles: true });
      const blob = new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const a = getToolDocument().createElement('a');
      const url = URL.createObjectURL(blob);
      a.href = url; a.download = filename;
      getToolDocument().body.appendChild(a); a.click();
      getToolDocument().body.removeChild(a); URL.revokeObjectURL(url);
    };
    downloadExcel(wb, `${safeAppName}_設計書_v2.xlsx`);

    UI.hide();
    const errorMsg = UI.failedAPIs.length > 0 ? `\n⚠ ${UI.failedAPIs.length}件のAPI取得に失敗しました` : '';
    showToast(`✅ エクスポート完了${errorMsg}`, UI.failedAPIs.length > 0 ? 'warn' : 'success');
    return true;

  } catch (e) {
    UI.hide();
    console.error('kintone設計書エクスポートエラー:', e);
    showToast(`❌ エラーが発生しました: ${e.message}`, 'error');
    throw e;
  }
}
