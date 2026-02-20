(async () => {
  'use strict';

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
   * [改善] バグ修正（未使用関数削除、重複ACLシート統合、No.採番修正）
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
          backgroundColor: 'rgba(0,0,0,0.7)', zIndex: '10000',
          display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
          color: '#fff', fontSize: '16px', fontFamily: '"Meiryo", sans-serif'
        });
        document.body.appendChild(el);
      }
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
        backgroundColor: 'rgba(0,0,0,0.6)', zIndex: '10001',
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
        { key: 'appAcl', label: 'アプリACL', default: true },
        { key: 'recordAcl', label: 'レコードACL', default: true },
        { key: 'fieldAcl', label: 'フィールドACL', default: true },
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
      'No.', 'フィールド名', 'フィールドコード', 'フィールドタイプ',
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
    const aoa = [['フォームレイアウト'], ['No.', '区分', '階層', '表示', 'フィールドコード', 'タイプ', '必須', '備考']];
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
    const aoa = [['一覧'], ['No.', '一覧名', 'タイプ', '表示フィールド', '表示フィールド（ラベル）', '抽出条件', 'ソート', '表示順', 'ページ件数']];
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
    const aoa = [['レポート'], ['No.', 'レポート名', 'グラフ種別', 'グループ対象', '集計関数', '集計対象フィールド', '抽出条件', '表示順']];

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
    aoa.push(['No.', 'ステータス名', '表示順', '担当者']); headerInfoRows.push(aoa.length - 1);

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
    aoa.push(['No.', 'アクション名', '遷移元', '遷移先', '実行者']); headerInfoRows.push(aoa.length - 1);

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
    const aoa = [['アプリACL'], ['No.', '対象種別', '対象名', 'レコード閲覧', 'レコード追加', 'レコード編集', 'レコード削除', 'ファイル読み込み', 'アプリ管理']];
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
    const aoa = [['レコードACL'], ['No.', '対象', '条件', '閲覧', '編集', '削除']];
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
    const aoa = [['フィールドACL'], ['No.', '対象', 'フィールドコード', '閲覧', '編集']];
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
    const aoa = [['JS/CSSカスタマイズ'], ['No.', '対象', '種別', 'タイプ', 'URL/ファイル名']];
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
    const aoa = [['アクション'], ['No.', 'アクション名', '遷移先アプリ', '遷移先アプリ名', 'フィールドマッピング', '実行条件']];
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
    const aoa = [['プラグイン'], ['No.', 'プラグインID', '名称', '有効']];
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
      ? ['No.', extraCol.label, '宛先', '条件', '件名/タイトル']
      : ['No.', '宛先', '条件', '件名/タイトル'];
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
    const aoa = [['Webhook'], ['No.', 'URL', 'イベント', '有効']];
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
    const aoa = [['フィールド依存関係マップ'], ['No.', 'フィールド名', 'フィールドコード', '依存種別', '参照先', '詳細']];
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
    // アプリID入力
    const appIdInput = prompt('アプリIDを入力してください (未入力で現在のアプリ):', kintone.app.getId() || '');
    const APP_ID = Number(appIdInput);
    if (!APP_ID) return alert('有効なアプリIDが指定されませんでした。');

    // エクスポートオプション選択
    const selectedSheets = await showExportOptionsDialog();
    if (!selectedSheets) return; // キャンセル

    UI.show('ライブラリ読み込み中...', 12);
    const { styled } = await loadSheetLib();

    const api = kintone.api;
    const apiUrl = (path) => kintone.api.url(path, true);

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
      fetchJob('AppACL', () => api(apiUrl('/k/v1/app/acl.json'), 'GET', { app: APP_ID })),
      fetchJob('RecACL', () => api(apiUrl('/k/v1/record/acl.json'), 'GET', { app: APP_ID })),
      fetchJob('FldACL', () => api(apiUrl('/k/v1/field/acl.json'), 'GET', { app: APP_ID })),
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
      appAcl: () => ({ name: 'アプリACL', data: buildAppAclAOA(appAcl || {}) }),
      recordAcl: () => ({ name: 'レコードACL', data: buildRecordAclAOA(recordAcl || {}) }),
      fieldAcl: () => ({ name: 'フィールドACL', data: buildFieldAclAOA(fieldAcl || {}) }),
      customize: () => ({ name: 'JS CSSカスタマイズ', data: buildCustomizeAOA(customize || {}) }),
      actions: () => ({ name: 'アクション', data: buildActionsAOA(actions, appNames) }),
      plugins: () => ({ name: 'プラグイン', data: buildPluginsAOA(pluginsResp || {}) }),
      genNotif: () => ({ name: '通知（一般）', data: buildNotificationsAOA('通知（一般）', genNotif || {}) }),
      recNotif: () => ({ name: '通知（レコード）', data: buildNotificationsAOA('通知（レコード）', recNotif || {}, { label: 'イベント', getter: n => n?.event || n?.timing || '-' }) }),
      remNotif: () => ({ name: '通知（リマインダー）', data: buildNotificationsAOA('通知（リマインダー）', remNotif || {}, { label: 'タイミング', getter: n => n?.timing ? Utils.safeJSONStringify(n.timing) : '-' }) }),
      webhook: () => ({ name: 'Webhook', data: buildWebhookAOA(webhooksResp || {}) }),
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

  } catch (e) {
    UI.hide();
    console.error('kintone設計書エクスポートエラー:', e);
    alert(`❌ エラーが発生しました: ${e.message}\n\n詳細はブラウザのコンソールを確認してください。`);
  }
})();
