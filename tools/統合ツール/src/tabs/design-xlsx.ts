'use strict';

import { TOOL_ID, EXTERNAL_LIBRARIES } from '../constants.js';
import { getToolDocument } from '../ui/dialog.js';
import { showToast } from '../utils.js';

const SHEETLIB_PRIMARY_URL = 'https://cdn.jsdelivr.net/npm/xlsx-js-style@1.2.0/dist/xlsx.min.js';
const SHEETLIB_FALLBACK_URL = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
const DESIGN_EXPORT_VERSION = '2.2';
const DESIGN_EXPORT_PREF_KEY = 'kus.designExport.selectedSheets.v1';

const EXPORT_SHEET_DEFS: Array<{ key: string; label: string; default: boolean; required?: boolean }> = [
  { key: 'summary', label: 'サマリー', default: true },
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
  { key: 'genNotif', label: '通知(一般)', default: true },
  { key: 'recNotif', label: '通知(レコード)', default: true },
  { key: 'remNotif', label: '通知(リマインダー)', default: true },
  { key: 'webhook', label: 'Webhook', default: true },
  { key: 'adminNotes', label: '管理者メモ', default: true },
  { key: 'dependencies', label: 'フィールド依存関係', default: true }
];

function getExporterOverlayZIndex(): string {
  const main = getToolDocument().getElementById(TOOL_ID);
  const raw = main ? Number(window.getComputedStyle(main).zIndex) : NaN;
  const base = Number.isFinite(raw) ? raw : 2147483646;
  return String(Math.min(2147483647, Math.max(2000000000, base + 1)));
}

async function loadSheetLibOnce(): Promise<{ styled: boolean }> {
  if (typeof (window as any).XLSX !== 'undefined') return { styled: true };
  // XLSX は本コードと同じ realm（main window）に読み込む必要があるため
  // getToolDocument() ではなく main の document を使う（popout 時に XLSX が
  // popout window 側へ登録され「XLSX is not defined」となるのを防ぐ）。
  const loadScriptLocal = (src: string, timeout = 15000) =>
    new Promise<boolean>((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src;
      s.async = true;
      let done = false;
      const timer = setTimeout(() => {
        if (!done) { done = true; reject(new Error(`Timeout: ${src}`)); }
      }, timeout);
      s.onload = () => { if (!done) { done = true; clearTimeout(timer); resolve(true); } };
      s.onerror = () => { if (!done) { done = true; clearTimeout(timer); reject(new Error(`Failed: ${src}`)); } };
      document.head.appendChild(s);
    });
  try { await loadScriptLocal(SHEETLIB_PRIMARY_URL); return { styled: true }; }
  catch { await loadScriptLocal(SHEETLIB_FALLBACK_URL); return { styled: false }; }
}

async function loadJSZipOnce(): Promise<any> {
  if (typeof (window as any).JSZip !== 'undefined') return (window as any).JSZip;
  const url = EXTERNAL_LIBRARIES.jszip?.cdnUrl;
  if (!url) throw new Error('JSZip の CDN URL が設定されていません');
  await new Promise<void>((resolve, reject) => {
    const s = document.createElement('script');
    s.src = url;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('JSZip の読み込みに失敗しました'));
    document.head.appendChild(s);
  });
  if (typeof (window as any).JSZip === 'undefined') {
    throw new Error('JSZip のロード後もグローバル変数が見つかりません');
  }
  return (window as any).JSZip;
}


function loadPersistedSheetSelection(): Set<string> | null {
  try {
    const raw = window.localStorage.getItem(DESIGN_EXPORT_PREF_KEY);
    if (!raw) return null;
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return null;
    return new Set(arr.map((v) => String(v)));
  } catch {
    return null;
  }
}

function persistSheetSelection(selected: Set<string>): void {
  try {
    window.localStorage.setItem(DESIGN_EXPORT_PREF_KEY, JSON.stringify(Array.from(selected)));
  } catch {
    // ignore
  }
}

function resolveExportSheetDefs(): Array<{ key: string; label: string; default: boolean; required?: boolean }> {
  return EXPORT_SHEET_DEFS;
}

function showSheetSelectionDialog(defs: Array<{ key: string; label: string; default: boolean; required?: boolean }>, title = '📊 エクスポート設定'): Promise<Set<string> | null> {
  return new Promise((resolve) => {
    const overlay = getToolDocument().createElement('div');
    Object.assign(overlay.style, {
      position: 'fixed', top: '0', left: '0', width: '100%', height: '100%',
      backgroundColor: 'rgba(0,0,0,0.6)', zIndex: getExporterOverlayZIndex(),
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      fontFamily: '"Meiryo", sans-serif'
    });
    const remembered = loadPersistedSheetSelection();
    const checkboxes = defs.map((d) => {
      const checked = remembered ? remembered.has(d.key) : d.default;
      return `<label style="display:block;margin:3px 0;font-size:13px;cursor:${d.required ? 'default' : 'pointer'};"><input type="checkbox" value="${d.key}" ${checked ? 'checked' : ''} ${d.required ? 'disabled' : ''} style="margin-right:6px;">${d.label}${d.required ? ' (必須)' : ''}</label>`;
    }).join('');
    overlay.innerHTML = `<div style="background:#fff;border-radius:12px;padding:28px;min-width:360px;max-width:460px;max-height:80vh;overflow-y:auto;box-shadow:0 4px 24px rgba(0,0,0,0.3);"><div style="font-size:18px;font-weight:bold;color:#2E5C8A;margin-bottom:16px;">${title}</div><div style="font-size:12px;color:#666;margin-bottom:12px;">出力するシートを選択してください（前回設定を自動反映）</div><div style="display:flex;gap:8px;margin-bottom:12px;"><button id="kex-select-all" style="font-size:11px;padding:4px 10px;border:1px solid #ccc;border-radius:4px;background:#f5f5f5;cursor:pointer;">全選択</button><button id="kex-select-none" style="font-size:11px;padding:4px 10px;border:1px solid #ccc;border-radius:4px;background:#f5f5f5;cursor:pointer;">全解除</button></div><div id="kex-sheet-options" style="max-height:340px;overflow-y:auto;padding:8px;background:#fafafa;border-radius:6px;border:1px solid #eee;">${checkboxes}</div><div style="display:flex;gap:10px;justify-content:flex-end;margin-top:18px;"><button id="kex-cancel" style="padding:8px 20px;border:1px solid #ccc;border-radius:6px;background:#fff;cursor:pointer;font-size:13px;">キャンセル</button><button id="kex-export" style="padding:8px 20px;border:none;border-radius:6px;background:#4A90E2;color:#fff;cursor:pointer;font-size:13px;font-weight:bold;">エクスポート</button></div></div>`;
    getToolDocument().body.appendChild(overlay);
    (overlay.querySelector('#kex-select-all') as HTMLElement).onclick = () => {
      overlay.querySelectorAll<HTMLInputElement>('#kex-sheet-options input[type="checkbox"]').forEach((cb) => { cb.checked = true; });
    };
    (overlay.querySelector('#kex-select-none') as HTMLElement).onclick = () => {
      overlay.querySelectorAll<HTMLInputElement>('#kex-sheet-options input[type="checkbox"]:not([disabled])').forEach((cb) => { cb.checked = false; });
    };
    (overlay.querySelector('#kex-cancel') as HTMLElement).onclick = () => {
      getToolDocument().body.removeChild(overlay);
      resolve(null);
    };
    (overlay.querySelector('#kex-export') as HTMLElement).onclick = () => {
      const selected = new Set<string>();
      overlay.querySelectorAll<HTMLInputElement>('#kex-sheet-options input[type="checkbox"]:checked').forEach((cb) => selected.add(cb.value));
      persistSheetSelection(selected);
      getToolDocument().body.removeChild(overlay);
      resolve(selected);
    };
  });
}

/** シート選択ダイアログ。キャンセル時は null。 */
export function showDesignExportOptionsDialog(): Promise<Set<string> | null> {
  return showSheetSelectionDialog(resolveExportSheetDefs());
}

/**
 * バッチ用エクスポーター UI。複数アプリの進捗を1つのオーバーレイで表示する。
 */
function createBatchExporterUI() {
  const id = 'kintone-exporter-overlay';
  let totalSteps = 1;
  let currentStep = 0;
  const failedAPIs: Array<{ app: string; name: string; error: string }> = [];
  return {
    show(msg: string, total: number) {
      totalSteps = Math.max(1, total);
      currentStep = 0;
      const doc = getToolDocument();
      let el = doc.getElementById(id);
      if (!el) {
        el = doc.createElement('div');
        el.id = id;
        Object.assign(el.style, {
          position: 'fixed', top: '0', left: '0', width: '100%', height: '100%',
          backgroundColor: 'rgba(0,0,0,0.7)', zIndex: getExporterOverlayZIndex(),
          display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
          color: '#fff', fontSize: '16px', fontFamily: '"Meiryo", sans-serif'
        });
        doc.body.appendChild(el);
      }
      el.style.zIndex = getExporterOverlayZIndex();
      el.innerHTML = `<div style="background:rgba(255,255,255,0.1);border-radius:12px;padding:32px 48px;text-align:center;min-width:440px;"><div style="font-size:20px;font-weight:bold;margin-bottom:16px;">📦 設計書一括エクスポーター (ZIP)</div><div id="kex-status" style="margin-bottom:12px;font-size:14px;color:#ccc;">${msg}</div><div style="background:rgba(255,255,255,0.2);border-radius:8px;height:24px;overflow:hidden;margin-bottom:8px;"><div id="kex-progress-bar" style="height:100%;width:0%;background:linear-gradient(90deg,#4A90E2,#7B68EE);border-radius:8px;transition:width 0.3s ease;"></div></div><div id="kex-percent" style="font-size:12px;color:#aaa;">0%</div><div id="kex-errors" style="font-size:11px;color:#f99;margin-top:8px;max-height:60px;overflow-y:auto;"></div><div style="margin-top:10px;text-align:right;"><button id="kex-cancel-batch" style="font-size:12px;padding:6px 12px;border:1px solid #bbb;border-radius:6px;background:#fff;cursor:pointer;">中断</button></div></div>`;
    },
    update(msg: string, step?: number) {
      if (step != null) currentStep = step; else currentStep++;
      const pct = Math.min(100, Math.round((currentStep / totalSteps) * 100));
      const doc = getToolDocument();
      const statusEl = doc.getElementById('kex-status');
      const barEl = doc.getElementById('kex-progress-bar');
      const pctEl = doc.getElementById('kex-percent');
      if (statusEl) statusEl.textContent = msg;
      if (barEl) (barEl as HTMLElement).style.width = `${pct}%`;
      if (pctEl) pctEl.textContent = `${pct}%`;
      const cancelBtn = doc.getElementById('kex-cancel-batch');
      if (cancelBtn) (cancelBtn as HTMLButtonElement).onclick = () => { (window as any).__kusBatchCancel = true; };
    },
    addFailedAPIs(app: string, list: Array<{ name: string; error: string }>) {
      list.forEach((f) => failedAPIs.push({ app, name: f.name, error: f.error }));
      const doc = getToolDocument();
      const errEl = doc.getElementById('kex-errors');
      if (errEl && failedAPIs.length) errEl.textContent = `⚠ API取得失敗 ${failedAPIs.length}件（出力は継続）`; 
    },
    getFailedAPIs() { return failedAPIs; },
    hide() {
      const doc = getToolDocument();
      const el = doc.getElementById(id);
      if (el && el.parentNode) el.parentNode.removeChild(el);
    }
  };
}

export async function runAdvancedDesignExporter(params: any = {}) {
  const sourceAppId = Number(params.appId);
  if (!sourceAppId) throw new Error('有効な比較元アプリIDが指定されませんでした。');
  const sourceGuestId = String(params.guestId || '').trim();
  const preselectedSheets: Set<string> | null = params.preselectedSheets instanceof Set ? params.preselectedSheets : null;
  const returnWorkbook: boolean = !!params.returnWorkbook;
  const lightweightMode: boolean = !!params.lightweightMode;
  const progressLabel: string = params.progressLabel ? String(params.progressLabel) : '';
  const suppressToast: boolean = !!params.suppressToast;

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
      ENABLE_OUTLINE: true,
      LIGHTWEIGHT_MODE: false
    },
    DEFAULT_COL_WIDTH: 12,
    MAX_COL_WIDTH: 48,
    MIN_COL_WIDTH: 8,
    COLORS: {
      HEADER_BG: 'FF0F766E', HEADER_TEXT: 'FFFFFFFF',
      TITLE_BG: 'FF0F172A', TITLE_TEXT: 'FFFFFFFF',
      ZEBRA_EVEN: 'FFF8FAFC', ZEBRA_ODD: 'FFFFFFFF',
      BORDER: 'FFCBD5E1', SECTION_BG: 'FFE0F2FE',
      REQUIRED_BG: 'FFFFF2CC', WARNING_BG: 'FFFFC000',
      SUCCESS_BG: 'FFC6EFCE', DANGER_BG: 'FFF8CBAD',
      INFO_BG: 'FFD9E1F2', SUBTABLE_BG: 'FFE8EAF6',
      DEPENDENCY_BG: 'FFFCE4EC'
    },
    SANITIZE_LABEL_HTML_IN_LAYOUT: true
  };

  // ヘッダー名 → その列の最大幅（半角換算）。
  // autosizeCols が見出し行を見て一致したらこの値で個別クランプする。
  // ここに無い列は CONFIG.MAX_COL_WIDTH (48) が上限。
  if (lightweightMode) {
    CONFIG.STYLES.ENABLE_CONDITIONAL_FORMAT = false;
    CONFIG.STYLES.ENABLE_OUTLINE = false;
    CONFIG.STYLES.ENABLE_ZEBRA = false;
  }

  const MAX_COL_WIDTH_BY_HEADER: Record<string, number> = {
    // 共通の長文系
    '説明': 60, 'description': 60,
    '計算式': 80, 'expression': 80,
    '選択肢/式': 50,
    'ルックアップ設定': 90, '関連レコード設定': 90, '関連レコード一覧設定': 90,
    '依存/参照': 70,
    '備考': 60, 'メモ': 60, '内容': 80,
    '値': 80, '初期値': 30, '入力制約': 30,
    // ビュー
    '表示フィールド': 60, '表示フィールド（ラベル）': 60,
    '絞り込み条件': 70, 'フィルター条件': 70, 'ソート': 50,
    // グラフ
    '集計対象': 60, 'グループ化': 50, 'モード': 18, 'チャート': 22,
    // プロセス管理
    'アクション名': 30, '遷移元（From）': 40, '遷移先（To）': 40,
    '作業者候補': 60, '作業者の選び方': 26,
    // 通知
    '本文/備考': 70, 'タイミング/条件': 60, '宛先': 50, '通知タイミング': 32, '通知先': 50,
    // 権限
    '対象': 40, '範囲': 14, '許可': 24,
    // JS/CSS
    '名前/URL': 80, 'fileKey': 50, '参照方法': 14,
    // 依存関係
    '詳細': 80, '依存種別': 22, '参照先': 60,
    // フィールド名／コード
    'フィールド名': 28, 'フィールドコード': 28, 'コード': 24,
    'CSV 列': 24, 'kintone フィールド': 28,
    // タイプ系
    'タイプ': 20, '種別': 18, 'ビュー種別': 18, '表示形式': 18,
    'プラグインID': 20, 'バージョン': 14, 'ID': 12,
    // 短いフラグ系
    '必須': 8, '重複禁止': 10,
    '閲覧': 8, '編集': 8, '削除': 8, '管理': 10, '追加': 10,
    '読込': 10, '書出': 10, '読込/書出': 14,
    'サブ組織含': 12, 'サブ組織含む': 12, 'グループ': 16,
    // インデックス系
    'No.': 6, 'No': 6, '#': 4, '行': 6, '列': 6, '区分': 12,
    '階層': 8, '表示': 8, '幅': 8, '表示順': 10,
    // サマリー系
    '項目': 32, '件数': 14,
    // フォームレイアウト
    'タイトル': 30, 'シート名': 26
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

  // kintone API のレスポンス値（ENUM）を日本語ラベルへ変換するための辞書群。
  // Excel 出力で「CREATOR」のような英語の生値が混在しないようにするため。
  const CHART_TYPE_LABEL = {
    BAR: '横棒グラフ', COLUMN: '縦棒グラフ', LINE: '折れ線グラフ',
    PIE: '円グラフ', PIVOT_TABLE: 'クロス集計表', TABLE: '表',
    AREA: '面グラフ', SPLINE: 'スプライン', SPLINE_AREA: 'スプライン面', SCATTER: '散布図'
  };
  const CHART_MODE_LABEL = { NORMAL: '通常', STACKED: '積み上げ', PERCENTAGE: '100%積み上げ' };
  const AGGREGATION_TYPE_LABEL = { COUNT: '件数', SUM: '合計', AVG: '平均', MAX: '最大値', MIN: '最小値' };
  const GROUP_PER_LABEL = {
    YEAR: '年', QUARTER: '四半期', MONTH: '月', WEEK: '週', DAY: '日',
    HOUR: '時', MINUTE: '分'
  };
  const ASSIGNEE_TYPE_LABEL = {
    ONE: '1人選出（候補から1人）', ANYONE: '候補の誰でも（先着）', ALL: '全員（全員の処理が必要）'
  };
  const NOTIFICATION_TIMING_LABEL = {
    CREATION: 'レコード作成時', DAYS_OF_WEEK: '曜日指定', TIME: '時刻指定',
    WEEKLY: '毎週', MONTHLY: '毎月'
  };
  const RESOURCE_TYPE_LABEL = { URL: 'URL指定', FILE: 'ファイル指定' };
  const PAGINATION_LABEL = { ROW: '行ページャ', PAGE: 'ページ番号' };
  const WEBHOOK_EVENT_LABEL = {
    ADD_RECORD: 'レコード追加', UPDATE_RECORD: 'レコード編集', DELETE_RECORD: 'レコード削除',
    UPDATE_STATUS: 'ステータス変更', ADD_COMMENT: 'コメント追加',
    DELETE_COMMENT: 'コメント削除'
  };
  const ENUM_LOOKUP = (map: Record<string, string>, value: any) => {
    if (value == null || value === '') return '';
    const key = String(value).trim().toUpperCase();
    return map[key] || String(value);
  };

  const SYSTEM_FIELDS = new Set(['$id', '$revision', 'status', 'category', 'assignee']);

  class Semaphore {
    max: number;
    current: number;
    queue: Array<() => void>;
    constructor(max: number) { this.max = max; this.current = 0; this.queue = []; }
    acquire(): Promise<void> {
      return new Promise<void>((resolve) => {
        if (this.current < this.max) { this.current++; resolve(); }
        else this.queue.push(resolve);
      });
    }
    release(): void {
      this.current--;
      if (this.queue.length > 0) { this.current++; (this.queue.shift() as () => void)(); }
    }
    async run<T>(fn: () => T | Promise<T>): Promise<T> {
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
      el.innerHTML = `<div style="background:rgba(255,255,255,0.1);border-radius:12px;padding:32px 48px;text-align:center;min-width:400px;"><div style="font-size:20px;font-weight:bold;margin-bottom:16px;">📊 kintone 設計書エクスポーター v2.1</div><div id="kex-status" style="margin-bottom:12px;font-size:14px;color:#ccc;">${msg}</div><div style="background:rgba(255,255,255,0.2);border-radius:8px;height:24px;overflow:hidden;margin-bottom:8px;"><div id="kex-progress-bar" style="height:100%;width:0%;background:linear-gradient(90deg,#4A90E2,#7B68EE);border-radius:8px;transition:width 0.3s ease;"></div></div><div id="kex-percent" style="font-size:12px;color:#aaa;">0%</div><div id="kex-errors" style="font-size:11px;color:#f99;margin-top:8px;max-height:60px;overflow-y:auto;"></div><div style="margin-top:10px;text-align:right;"><button id="kex-cancel-batch" style="font-size:12px;padding:6px 12px;border:1px solid #bbb;border-radius:6px;background:#fff;cursor:pointer;">中断</button></div></div>`;
    },
    update(msg: string, step?: number) {
      if (step !== undefined) UI.currentStep = step; else UI.currentStep++;
      const pct = Math.min(100, Math.round((UI.currentStep / UI.totalSteps) * 100));
      const doc = getToolDocument();
      const statusEl = doc.getElementById('kex-status');
      const barEl = doc.getElementById('kex-progress-bar');
      const pctEl = doc.getElementById('kex-percent');
      if (statusEl) statusEl.textContent = msg;
      if (barEl) barEl.style.width = `${pct}%`;
      if (pctEl) pctEl.textContent = `${pct}%`;
      const cancelBtn = doc.getElementById('kex-cancel-batch');
      if (cancelBtn) (cancelBtn as HTMLButtonElement).onclick = () => { (window as any).__kusBatchCancel = true; };
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
    safeGet: (obj: any, path: string, def: any = ''): any => { try { if (!obj || typeof obj !== 'object') return def; const v = path.split('.').reduce((o: any, k: string) => (o && o[k] !== undefined ? o[k] : undefined), obj); return v === undefined ? def : v; } catch (e) { return def; } },
    ensureArray: v => Array.isArray(v) ? v : [],
    safeJoin: (arr, sep = '、') => Array.isArray(arr) ? arr.filter(v => v !== '' && v != null).join(sep) : '',
    sleep: ms => new Promise(r => setTimeout(r, ms)),
    clampColumnWidth: width => Math.max(CONFIG.MIN_COL_WIDTH, Math.min(CONFIG.MAX_COL_WIDTH, Number.isFinite(Number(width)) ? Number(width) : CONFIG.DEFAULT_COL_WIDTH)),
    calculateCellWidth: text => { if (!text) return CONFIG.MIN_COL_WIDTH; const str = String(text); let width = 0; for (const line of str.split('\n')) { let lw = 0; for (const ch of line) lw += /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\uFF00-\uFFEF]/.test(ch) ? 2 : 1; if (lw > width) width = lw; } return UtilsX.clampColumnWidth(width + 2); },
    colToA1: (n) => { let s = ''; while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = (n - 1) / 26 | 0; } return s; },
    a1: (r, c) => `${UtilsX.colToA1(c)}${r}`,
    escapeRegExp: (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
    stripHtml: (html) => String(html || '').replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&'),
    formatBoolean: (val) => (val ? '○' : '-'),
    formatEntity: (entity) => { if (!entity) return '-'; if (Array.isArray(entity)) return entity.map(e => UtilsX.formatEntity(e)).join('\n'); const e = entity.entity || entity; const t = (e.type || '').toString().toUpperCase(); const typeMap = { USER: 'ユーザー', GROUP: 'グループ', ORGANIZATION: '組織', FIELD_ENTITY: 'フィールド値', CREATOR: '作成者', MODIFIER: '更新者', LOGIN_USER: 'ログインユーザー', ALL: '全員' }; const typeJP = typeMap[t] || e.type || '不明'; if (e.name) return `${typeJP}:${e.name}`; if (e.code) return `${typeJP}:${e.code}`; return typeJP; },
    formatEntityDetailed: (entity) => { if (!entity) return '-'; if (Array.isArray(entity)) return entity.map(e => UtilsX.formatEntityDetailed(e)).join('\n'); const e = entity.entity || entity; const t = (e.type || '').toString().toUpperCase(); const typeMap = { USER: 'ユーザー', GROUP: 'グループ', ORGANIZATION: '組織', FIELD_ENTITY: 'フィールド値', CREATOR: '作成者', MODIFIER: '更新者', LOGIN_USER: 'ログインユーザー', ALL: '全員' }; const typeJP = typeMap[t] || e.type || '不明'; const parts = [typeJP]; if (e.name) parts.push(e.name); else if (e.code) parts.push(`コード:${e.code}`); if (entity.includeSubs) parts.push('(サブ組織含)'); return parts.join(': '); },
    formatSort: (sortStr) => { if (!sortStr) return '-'; return String(sortStr).replace(/\basc\b/gi, '昇順').replace(/\bdesc\b/gi, '降順'); },
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
      for (const [eng, jpn] of Object.entries(funcMap) as Array<[string, any]>) {
        r = r.replace(new RegExp(UtilsX.escapeRegExp(eng), 'g'), jpn);
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
    formatDefaultValue: (dv) => { if (dv == null) return ''; if (Array.isArray(dv)) { if (dv.length > 0 && typeof dv[0] === 'object') return dv.map(i => i.name || i.code || JSON.stringify(i)).join('、'); return dv.join('、'); } if (typeof dv === 'object') { if (dv.type === 'NUMBER') return String(dv.value || ''); return dv.name || dv.code || JSON.stringify(dv); } return String(dv); },
    safeJSONStringify: (obj) => { try { return JSON.stringify(obj, null, 2); } catch (e) { return String(obj); } }
  };

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
        const codes = UtilsX.ensureArray(target?.fields).map((f) => f?.code).filter(Boolean);
        if (target?.code) {
          subtableFieldOrder.set(target.code, [...(subtableFieldOrder.get(target.code) || []), ...codes]);
        }
      } else if (kind === 'FIELD' && item.code && !addedFields.has(item.code)) {
        fieldOrder.push({ code: item.code, isGroup: false });
        addedFields.add(item.code);
      }
    });
    return { fieldOrder, subtableFieldOrder };
  }

  function buildFieldLabelMap(fields: any) {
    const map: Record<string, string> = {};
    for (const [code, f] of Object.entries(fields || {}) as Array<[string, any]>) {
      map[code] = f.label || code;
      if (f.type === 'SUBTABLE' && f.fields) {
        for (const [sc, sf] of Object.entries(f.fields) as Array<[string, any]>) {
          map[sc] = sf.label || sc;
        }
      }
    }
    return map;
  }

  function buildFieldGroupMap(layout) {
    const groupByCode = new Map();
    const walk = (rows, currentGroup) => {
      const safeRows = Array.isArray(rows) ? rows : [];
      for (const row of safeRows) {
        if (row?.type === 'GROUP') {
          walk(Array.isArray(row.layout) ? row.layout : [], row.label || row.code || currentGroup);
          continue;
        }
        const items = Array.isArray(row?.fields) ? row.fields : [];
        for (const item of items) {
          if (!item) continue;
          if (item.type === 'GROUP') {
            walk(Array.isArray(item.layout) ? item.layout : [], item.label || item.code || currentGroup);
            continue;
          }
          if (item.code && currentGroup) groupByCode.set(item.code, currentGroup);
        }
      }
    };
    walk(Array.isArray(layout?.layout) ? layout.layout : [], '');
    return groupByCode;
  }

  function extractCodesFromExpr(expr: any, fields: Record<string, any>): string[] {
    if (!expr) return [];
    const re = /[A-Za-z_぀-ゟ゠-ヿ一-龯][\w぀-ゟ゠-ヿ一-龯]*/g;
    const found = new Set<string>();
    let m: RegExpExecArray | null;
    while ((m = re.exec(String(expr))) !== null) {
      const code = m[0];
      if (fields[code]) { found.add(code); continue; }
      for (const parent of Object.values(fields) as any[]) {
        if (parent.type === 'SUBTABLE' && parent.fields?.[code]) { found.add(code); break; }
      }
    }
    return [...found];
  }

  function buildFieldUsageMap(ctx: any) {
    const { fields, views, reports, status, genNotif, recNotif, remNotif, recordAcl, fieldAcl, actions } = ctx;
    const usage = new Map<string, Set<string>>();
    const add = (code: string | undefined | null, where: string) => {
      if (!code) return;
      if (!usage.has(code)) usage.set(code, new Set<string>());
      usage.get(code)!.add(where);
    };
    const scanFilterCond = (cond: any, tag: string) => {
      if (!cond) return;
      for (const code of Object.keys(fields)) {
        const re = new RegExp(`(^|[^A-Za-z0-9_])${UtilsX.escapeRegExp(code)}([^A-Za-z0-9_]|$)`);
        if (re.test(String(cond))) add(code, tag);
      }
    };

    (Object.entries(fields) as Array<[string, any]>).forEach(([code, f]) => {
      const expr = f.expression || f.formula;
      if (expr) extractCodesFromExpr(expr, fields).forEach((c: string) => { if (c !== code) add(c, `計算式「${f.label || code}」`); });
      if (f.lookup?.fieldMappings) {
        for (const m of f.lookup.fieldMappings) add(m.field, `ルックアップ「${f.label || code}」`);
      }
      if (f.type === 'SUBTABLE' && f.fields) {
        for (const [sc, sf] of Object.entries(f.fields) as Array<[string, any]>) {
          const se = sf.expression || sf.formula;
          if (se) extractCodesFromExpr(se, fields).forEach((c: string) => { if (c !== sc) add(c, `計算式「${sf.label || sc}」`); });
        }
      }
    });

    (Object.entries(views?.views || {}) as Array<[string, any]>).forEach(([name, v]) => {
      UtilsX.ensureArray(v.fields).forEach((c: any) => add(c, `一覧「${name}」表示`));
      scanFilterCond(v.filterCond, `一覧「${name}」絞込`);
      if (v.sort) extractCodesFromExpr(v.sort, fields).forEach((c: string) => add(c, `一覧「${name}」ソート`));
    });

    (Object.entries(reports?.reports || {}) as Array<[string, any]>).forEach(([name, r]) => {
      UtilsX.ensureArray(r.groups).forEach((g: any) => add(g?.code, `グラフ「${name}」グループ化`));
      UtilsX.ensureArray(r.aggregations).forEach((a: any) => add(a?.code, `グラフ「${name}」集計`));
      scanFilterCond(r.filterCond, `グラフ「${name}」絞込`);
    });

    (status?.actions || []).forEach((a: any) => scanFilterCond(a.filterCond, `プロセス遷移「${a.name || ''}」条件`));

    const scanNotif = (payload: any, label: string) => {
      UtilsX.ensureArray(payload?.notifications).forEach((n: any, i: number) => {
        scanFilterCond(n.filterCond, `${label}#${i + 1}条件`);
        if (n.targetField) add(n.targetField, `${label}#${i + 1}対象`);
      });
    };
    scanNotif(genNotif, '通知(一般)');
    scanNotif(recNotif, '通知(レコード)');
    scanNotif(remNotif, '通知(リマインダー)');

    UtilsX.ensureArray(recordAcl?.rights).forEach((g: any, i: number) => scanFilterCond(g.filterCond, `レコード権限#${i + 1}`));
    UtilsX.ensureArray(fieldAcl?.rights).forEach((r: any) => add(r.code || r.field, 'フィールド権限'));
    UtilsX.ensureArray(Array.isArray(actions) ? actions : Object.values(actions || {})).forEach((a: any) => {
      scanFilterCond(a.filterCond, `アクション「${a.name || ''}」条件`);
      UtilsX.ensureArray(a.mappings).forEach((m: any) => add(m.srcField || m.sourceField, `アクション「${a.name || ''}」マッピング`));
    });

    return usage;
  }

  const filterUserFields = (fields: any) => {
    const filtered: Record<string, any> = {};
    for (const [code, field] of Object.entries(fields || {}) as Array<[string, any]>) {
      if (SYSTEM_FIELDS.has(code) || SYSTEM_FIELDS.has(field.code)) continue;
      if (['STATUS', 'CATEGORY', 'STATUS_ASSIGNEE'].includes(field.type)) continue;
      filtered[code] = field;
    }
    return filtered;
  };

  const loadSheetLib = loadSheetLibOnce;

  async function retry<T>(fn: () => Promise<T>, max = CONFIG.MAX_RETRIES): Promise<T> {
    let lastErr: any;
    for (let i = 0; i < max; i++) {
      try { return await fn(); }
      catch (e) { lastErr = e; if (i === max - 1) throw e; await UtilsX.sleep(CONFIG.RETRY_DELAY * (i + 1)); }
    }
    throw lastErr;
  }

  async function fetchJob<T = any>(name: string, promiseFn: () => Promise<T>): Promise<T | null> {
    try { return await apiSemaphore.run(() => retry(promiseFn)); }
    catch (e) { console.warn(`[${name}] Failed:`, e); UI.logError(name, e); return null; }
  }

  try {
    const APP_ID = Number(sourceAppId);
    if (!APP_ID) throw new Error('有効な比較元アプリIDが指定されませんでした。');

    const selectedSheets = preselectedSheets || await showExportOptionsDialog();
    if (!selectedSheets) return false;

    if (progressLabel) {
      const prefix = `${progressLabel} `;
      const origShow = UI.show.bind(UI) as typeof UI.show;
      const origUpdate = UI.update.bind(UI) as typeof UI.update;
      UI.show = ((msg: string, totalSteps?: number) => origShow(`${prefix}${msg}`, totalSteps as number)) as typeof UI.show;
      UI.update = ((msg: string, step?: number) => origUpdate(`${prefix}${msg}`, step)) as typeof UI.update;
    }

    UI.show('ライブラリ読み込み中...', 12);
    const { styled } = await loadSheetLib();

    const api = (kintone.api as any);
    const apiUrl = (path: any): string => {
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

    const fields = filterUserFields(fieldResp?.properties || ({} as any));

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
    const referencedAppIds = new Set<any>();
    const scanField = (f: any) => {
      if (f.lookup?.relatedApp?.app) referencedAppIds.add(f.lookup.relatedApp.app);
      if (f.referenceTable?.relatedApp?.app) referencedAppIds.add(f.referenceTable.relatedApp.app);
    };
    (Object.values(fields) as any[]).forEach((f: any) => {
      scanField(f);
      if (f.type === 'SUBTABLE' && f.fields) (Object.values(f.fields) as any[]).forEach(scanField);
    });
    (Object.values(actions) as any[]).forEach((a: any) => { if (a.destApp?.app) referencedAppIds.add(a.destApp.app); });

    const appNames: Record<string, string> = {};
    const refPromises = [...referencedAppIds].map((id: any) =>
      fetchJob(`RefApp_${id}`, () => api(apiUrl('/k/v1/app.json'), 'GET', { id })).then((info: any) => { appNames[id] = info?.name || `(ID:${id})`; })
    );
    await Promise.all(refPromises);

    UI.update('Excelファイルを生成中...', 10);

    const fieldCount = Object.keys(fields).length;
    const viewCount = Object.keys(views?.views || ({} as any)).length;
    const reportCount = Object.keys(reports?.reports || ({} as any)).length;
    const processStateCount = Object.keys(status?.states || ({} as any)).length;
    const processActionCount = (status?.actions || []).length;
    const pluginCount = (pluginsResp?.plugins || []).length;
    const webhookCount = (webhooksResp?.webhooks || []).length;
    const appAclCount = (appAcl?.rights || []).length;
    const recordAclCount = (recordAcl?.rights || []).length;
    const fieldAclCount = (fieldAcl?.rights || []).length;
    const customizeCount = (customize?.desktop?.js || []).length
      + (customize?.desktop?.css || []).length
      + (customize?.mobile?.js || []).length
      + (customize?.mobile?.css || []).length;

    const fieldGroupMap = buildFieldGroupMap(layout || ({} as any));
    const fieldUsageMap = buildFieldUsageMap({
      fields, views, reports, status, genNotif, recNotif, remNotif, recordAcl, fieldAcl, actions
    });

    const wb = XLSX.utils.book_new();

    const sheetMetadata = [];
    const printTitleConfigs = [];

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

    const Sty = {
      baseFont: (opts: any = {}) => ({ name: CONFIG.FONT_NAME, sz: 10, ...opts }),
      borderThin: () => {
        const b = { style: 'thin', color: { rgb: CONFIG.COLORS.BORDER } };
        return { border: { top: b, bottom: b, left: b, right: b } };
      },
      title: () => ({
        font: { ...Sty.baseFont({ bold: true, sz: 12 }), color: { rgb: CONFIG.COLORS.TITLE_TEXT } },
        alignment: { vertical: 'center', horizontal: 'left', wrapText: false },
        fill: { patternType: 'solid', fgColor: { rgb: CONFIG.COLORS.TITLE_BG } }
      }),
      header: () => ({
        font: { ...Sty.baseFont({ bold: true }), color: { rgb: CONFIG.COLORS.HEADER_TEXT } },
        alignment: { vertical: 'center', horizontal: 'center', wrapText: false },
        fill: { patternType: 'solid', fgColor: { rgb: CONFIG.COLORS.HEADER_BG } },
        ...Sty.borderThin()
      }),
      cell: (align = 'left') => ({
        font: { ...Sty.baseFont() },
        alignment: { vertical: 'center', horizontal: align, wrapText: true },
        ...Sty.borderThin()
      }),
      sectionCell: (align = 'left') => ({
        font: { ...Sty.baseFont({ bold: true }) },
        alignment: { vertical: 'center', horizontal: align, wrapText: true },
        fill: { patternType: 'solid', fgColor: { rgb: CONFIG.COLORS.SECTION_BG } },
        ...Sty.borderThin()
      }),
      zebraEven: () => ({ fill: { patternType: 'solid', fgColor: { rgb: CONFIG.COLORS.ZEBRA_EVEN } } }),
      zebraOdd: () => ({ fill: { patternType: 'solid', fgColor: { rgb: CONFIG.COLORS.ZEBRA_ODD } } })
    };

    const autosizeCols = (ws, aoa, options: any = {}) => {
      const headerRowIdx = options.headerRowIndex;
      const headerInfoRows = Array.isArray(options.headerInfoRows) ? options.headerInfoRows : [];
      const headerCandidates: number[] = [];
      if (typeof headerRowIdx === 'number' && headerRowIdx >= 0) headerCandidates.push(headerRowIdx);
      headerInfoRows.forEach((idx: number) => {
        if (typeof idx === 'number' && idx >= 0 && !headerCandidates.includes(idx)) headerCandidates.push(idx);
      });
      const perColMax: number[] = [];
      for (const idx of headerCandidates) {
        const headerRow = aoa[idx] || [];
        headerRow.forEach((h: any, i: number) => {
          const text = String(h ?? '').trim();
          if (!text) return;
          const max = MAX_COL_WIDTH_BY_HEADER[text];
          if (max != null && (perColMax[i] == null || max > perColMax[i])) perColMax[i] = max;
        });
      }
      if (Array.isArray(options.colMax)) {
        options.colMax.forEach((m: any, i: number) => {
          if (typeof m === 'number' && m > 0) perColMax[i] = m;
        });
      }
      const widths: number[] = [];
      const headerWidths: number[] = [];
      for (let r = 0; r < aoa.length; r++) {
        const row = aoa[r] || [];
        const isHeaderOrInfo = (headerRowIdx != null && r === headerRowIdx) || headerInfoRows.includes(r);
        row.forEach((v: any, i: number) => {
          let w = UtilsX.calculateCellWidth(v);
          if (isHeaderOrInfo) {
            w = Math.max(w, UtilsX.calculateCellWidth(v) + 3);
            headerWidths[i] = Math.max(headerWidths[i] || 0, w);
          }
          widths[i] = Math.max(widths[i] || CONFIG.MIN_COL_WIDTH, w);
        });
      }
      ws['!cols'] = widths.map((w, i) => {
        let colMax = perColMax[i] != null ? perColMax[i] : CONFIG.MAX_COL_WIDTH;
        if (headerWidths[i] != null && colMax < headerWidths[i]) {
          colMax = headerWidths[i];
        }
        const base = w || CONFIG.DEFAULT_COL_WIDTH;
        const clamped = Math.max(CONFIG.MIN_COL_WIDTH, Math.min(colMax, base));
        return { wch: clamped };
      });
    };

    const applyStyles = (ws, aoa, options: any = {}) => {
      if (!styled) return;
      const {
        headerRowIndex = null,
        titleRows = [],
        sectionRows = [],
        headerInfoRows = [],
        emptyRows = [],
        specialCells = {},
        freezeRows = 1,
        freezeCols = 0,
        centerCols = []
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
        const isDataRow = dataStart != null && r >= dataStart && !isSection && !isEmpty && !isHeaderInfo;
        const zebraIndex = isDataRow ? (r - dataStart) : null;

        for (let c = 0; c < maxCols; c++) {
          const addr = UtilsX.a1(r + 1, c + 1);
          const cellVal = aoa[r] && aoa[r][c] != null ? String(aoa[r][c]) : '';
          const cell = ws[addr] || (ws[addr] = { t: 's', v: cellVal });
          cell.s = cell.s || ({} as any);

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
      if (CONFIG.STYLES.ENABLE_AUTOFILTER && headerRowIndex != null && options.enableAutoFilter !== false) {
        ws['!autofilter'] = { ref: `${UtilsX.a1(headerRowIndex + 1, 1)}:${UtilsX.a1(rows, maxCols)}` };
      }
      ws['!margins'] = { left: 0.7, right: 0.7, top: 0.75, bottom: 0.75, header: 0.3, footer: 0.3 };
    };

    const applyCellMerges = (ws, mergeRanges) => {
      if (!mergeRanges?.length) return;
      ws['!merges'] = ws['!merges'] || [];
      for (const range of mergeRanges) {
        const startCol = range.startCol ?? range.col ?? 0;
        const endCol = range.endCol ?? range.col ?? startCol;
        ws['!merges'].push({ s: { r: range.startRow, c: startCol }, e: { r: range.endRow, c: endCol } });
        const firstCellAddr = UtilsX.a1(range.startRow + 1, startCol + 1);
        const firstCell = ws[firstCellAddr];
        if (firstCell?.s) firstCell.s.alignment = { ...firstCell.s.alignment, vertical: 'center' };
      }
    };

    const applyRowHeights = (ws, aoa, options: any = {}) => {
      const rowHeights = [];
      const baseLine = 18;
      const skipRows = new Set([...(options.titleRows || []), ...(options.emptyRows || [])]);
      for (let r = 0; r < aoa.length; r++) {
        if (skipRows.has(r)) { rowHeights[r] = { hpt: 22 }; continue; }
        const row = aoa[r] || [];
        let maxLines = 1;
        for (const v of row) {
          if (v == null) continue;
          const lines = String(v).split('\n').length;
          if (lines > maxLines) maxLines = lines;
        }
        if (maxLines > 1) rowHeights[r] = { hpt: Math.min(baseLine * maxLines + 4, 400) };
      }
      const existing = ws['!rows'] || [];
      ws['!rows'] = rowHeights.map((r, i) => r || existing[i] || undefined);
    };

    const applyPageSetup = (ws, pageSetup: any = {}) => {
      ws['!pageSetup'] = {
        orientation: pageSetup.orientation || 'landscape',
        fitToWidth: pageSetup.fitToWidth != null ? pageSetup.fitToWidth : 1,
        fitToHeight: pageSetup.fitToHeight != null ? pageSetup.fitToHeight : 0,
        paperSize: pageSetup.paperSize || 9,
        scale: pageSetup.scale || undefined
      };
      if (!ws['!margins']) {
        ws['!margins'] = { left: 0.5, right: 0.5, top: 0.6, bottom: 0.6, header: 0.3, footer: 0.3 };
      }
    };

    const appendSheet = (name, data, meta: any = {}) => {
      if (!data || !Array.isArray(data.aoa) || data.aoa.length === 0) return null;
      const ws = XLSX.utils.aoa_to_sheet(data.aoa);
      autosizeCols(ws, data.aoa, data.options || ({} as any));
      applyStyles(ws, data.aoa, data.options || ({} as any));
      if (data.mergeRanges) applyCellMerges(ws, data.mergeRanges);
      applyRowHeights(ws, data.aoa, data.options || ({} as any));
      applyPageSetup(ws, data.pageSetup || ({} as any));
      const safeName = makeSafeSheetName(name, new Set(wb.SheetNames));
      XLSX.utils.book_append_sheet(wb, ws, safeName);

      const titleRepeat = data.pageSetup?.printTitleRows != null
        ? data.pageSetup.printTitleRows
        : ((data.options?.headerRowIndex ?? -1) + 1);
      if (titleRepeat > 0) printTitleConfigs.push({ sheetName: safeName, rows: titleRepeat });

      sheetMetadata.push({
        name: safeName,
        description: meta.description || '',
        recordCount: meta.recordCount != null
          ? meta.recordCount
          : Math.max(0, data.aoa.length - ((data.options?.headerRowIndex ?? -1) + 1))
      });
      return safeName;
    };

    const buildSimpleAOA = (title, headers, rows) => ({
      aoa: [title ? [title] : [], headers, ...rows],
      options: { headerRowIndex: title ? 1 : 0, titleRows: title ? [0] : [], freezeRows: 2 }
    });

    if (selectedSheets.has('summary')) {
      const sAoa = [];
      const sectionRows = [];
      const headerInfoRows = [];

      sAoa.push(['kintone アプリ設計書']);
      sAoa.push([appSettings?.name || `App ${APP_ID}`]);
      sAoa.push([`App ID: ${APP_ID} / 出力日時: ${UtilsX.dt()} / ゲストスペース: ${sourceGuestId || '通常空間'}`]);
      sAoa.push([]);

      sAoa.push(['基本情報']); sectionRows.push(sAoa.length - 1);
      sAoa.push(['項目', '値']); headerInfoRows.push(sAoa.length - 1);
      sAoa.push(['アプリID', APP_ID]);
      sAoa.push(['アプリ名', appSettings?.name || '']);
      sAoa.push(['説明', UtilsX.stripHtml(appSettings?.description || generalSettings?.description || '-')]);
      sAoa.push(['作成者', appSettings?.creator?.name || '-']);
      sAoa.push(['作成日時', UtilsX.toJST(appSettings?.createdAt)]);
      sAoa.push(['更新者', appSettings?.modifier?.name || '-']);
      sAoa.push(['更新日時', UtilsX.toJST(appSettings?.modifiedAt)]);
      if (generalSettings) {
        sAoa.push(['テーマ', generalSettings.theme || '-']);
        sAoa.push(['アイコン種類', generalSettings.icon?.type || '-']);
        sAoa.push(['リビジョン', generalSettings.revision || '-']);
      }
      if (appSettings?.spaceId) sAoa.push(['スペースID', appSettings.spaceId]);
      if (appSettings?.threadId) sAoa.push(['スレッドID', appSettings.threadId]);
      sAoa.push([]);

      sAoa.push(['設定統計']); sectionRows.push(sAoa.length - 1);
      sAoa.push(['項目', '件数']); headerInfoRows.push(sAoa.length - 1);
      sAoa.push(['総レコード数', recordCount != null ? recordCount : '(取得不可)']);
      sAoa.push(['フィールド数', fieldCount]);
      let subFieldTotal = 0;
      Object.values(fields).forEach((f) => {
        if (f.type === 'SUBTABLE' && f.fields) subFieldTotal += Object.keys(f.fields).length;
      });
      sAoa.push(['サブテーブル内フィールド数', subFieldTotal]);
      sAoa.push(['ビュー数', viewCount]);
      sAoa.push(['グラフ数', reportCount]);
      sAoa.push(['プロセス管理', status?.enable ? '有効' : '無効']);
      sAoa.push(['ステータス数', processStateCount]);
      sAoa.push(['アクション数(プロセス)', processActionCount]);
      sAoa.push(['アクション数(レコード)', Object.keys(actions || ({} as any)).length]);
      sAoa.push(['プラグイン数', pluginCount]);
      sAoa.push(['Webhook数', webhookCount]);
      sAoa.push(['通知(一般)件数', (genNotif?.notifications || []).length]);
      sAoa.push(['通知(レコード)件数', (recNotif?.notifications || []).length]);
      sAoa.push(['通知(リマインダー)件数', (remNotif?.notifications || []).length]);
      sAoa.push(['アプリ権限エントリ数', appAclCount]);
      sAoa.push(['レコード権限エントリ数', recordAclCount]);
      sAoa.push(['フィールド権限エントリ数', fieldAclCount]);
      sAoa.push(['JSカスタマイズ(PC)件数', (customize?.desktop?.js || []).length]);
      sAoa.push(['CSSカスタマイズ(PC)件数', (customize?.desktop?.css || []).length]);
      sAoa.push(['JSカスタマイズ(モバイル)件数', (customize?.mobile?.js || []).length]);
      sAoa.push(['CSSカスタマイズ(モバイル)件数', (customize?.mobile?.css || []).length]);
      sAoa.push([]);

      sAoa.push(['フィールドタイプ別集計']); sectionRows.push(sAoa.length - 1);
      sAoa.push(['タイプ', '件数']); headerInfoRows.push(sAoa.length - 1);
      const typeCounts = new Map();
      Object.values(fields).forEach((f) => {
        const key = FIELD_TYPE[f.type] || f.type || '(不明)';
        typeCounts.set(key, (typeCounts.get(key) || 0) + 1);
      });
      [...typeCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .forEach(([type, count]) => sAoa.push([type, count]));
      sAoa.push([]);

      sAoa.push(['項目属性サマリー']); sectionRows.push(sAoa.length - 1);
      sAoa.push(['属性', '件数']); headerInfoRows.push(sAoa.length - 1);
      const attrCounts = { required: 0, unique: 0, lookup: 0, calc: 0, reference: 0, subtable: 0, noLabel: 0, hasDefault: 0 };
      Object.values(fields).forEach((f) => {
        if (f.required) attrCounts.required++;
        if (f.unique) attrCounts.unique++;
        if (f.lookup) attrCounts.lookup++;
        if (f.expression || f.formula) attrCounts.calc++;
        if (f.referenceTable) attrCounts.reference++;
        if (f.type === 'SUBTABLE') attrCounts.subtable++;
        if (f.noLabel) attrCounts.noLabel++;
        if (f.defaultValue != null && f.defaultValue !== '' && !(Array.isArray(f.defaultValue) && f.defaultValue.length === 0)) attrCounts.hasDefault++;
      });
      sAoa.push(['必須', attrCounts.required]);
      sAoa.push(['重複禁止', attrCounts.unique]);
      sAoa.push(['ルックアップ', attrCounts.lookup]);
      sAoa.push(['計算式あり', attrCounts.calc]);
      sAoa.push(['関連レコード一覧', attrCounts.reference]);
      sAoa.push(['サブテーブル', attrCounts.subtable]);
      sAoa.push(['ラベル非表示', attrCounts.noLabel]);
      sAoa.push(['初期値設定あり', attrCounts.hasDefault]);
      sAoa.push([]);

      sAoa.push(['レビュー観点']); sectionRows.push(sAoa.length - 1);
      sAoa.push(['観点', '確認内容']); headerInfoRows.push(sAoa.length - 1);
      sAoa.push(['参照関係', `ルックアップ ${attrCounts.lookup}件 / 関連レコード ${attrCounts.reference}件 / 計算式 ${attrCounts.calc}件`]);
      sAoa.push(['権限', `アプリ ${appAclCount}件 / レコード ${recordAclCount}件 / フィールド ${fieldAclCount}件`]);
      sAoa.push(['カスタマイズ', `JS/CSS ${customizeCount}件 / プラグイン ${pluginCount}件 / Webhook ${webhookCount}件`]);
      sAoa.push(['プロセス', status?.enable ? `有効: ステータス ${processStateCount}件 / アクション ${processActionCount}件` : '無効']);
      sAoa.push([]);

      sAoa.push(['出力情報']); sectionRows.push(sAoa.length - 1);
      sAoa.push(['項目', '値']); headerInfoRows.push(sAoa.length - 1);
      sAoa.push(['出力日時', UtilsX.dt()]);
      try { sAoa.push(['出力者', (typeof kintone !== 'undefined' && kintone.getLoginUser && kintone.getLoginUser()?.name) || '-']); }
      catch { sAoa.push(['出力者', '-']); }
      sAoa.push(['エクスポーターVer', 'v2.1']);

      if (UI.failedAPIs && UI.failedAPIs.length > 0) {
        sAoa.push([]);
        sAoa.push(['⚠ API取得失敗レポート']); sectionRows.push(sAoa.length - 1);
        sAoa.push(['API名', 'エラー内容']); headerInfoRows.push(sAoa.length - 1);
        for (const { name, error } of UI.failedAPIs) sAoa.push([name, error]);
      }

      appendSheet('サマリー', {
        aoa: sAoa,
        options: {
          headerRowIndex: headerInfoRows[0] ?? 3,
          titleRows: [0, 1],
          sectionRows: [2, ...sectionRows],
          headerInfoRows,
          emptyRows: [3],
          freezeRows: 1,
          enableAutoFilter: false
        },
        mergeRanges: [
          { startRow: 0, endRow: 0, startCol: 0, endCol: 3 },
          { startRow: 1, endRow: 1, startCol: 0, endCol: 3 },
          { startRow: 2, endRow: 2, startCol: 0, endCol: 3 }
        ],
        pageSetup: { orientation: 'portrait', printTitleRows: 1 }
      }, { description: 'アプリ基本情報・統計・項目属性サマリー' });
    }

    const resolveAppName = (appRef) => {
      if (!appRef) return '';
      const id = appRef.app || appRef;
      const nm = appNames[id] || appRef.name;
      return nm ? `${nm}(ID:${id})` : `(ID:${id})`;
    };

    const describeFieldOptions = (f: any) => {
      if (!f?.options || typeof f.options !== 'object') return '';
      return (Object.values(f.options) as any[])
        .sort((a: any, b: any) => (Number(a.index) || 0) - (Number(b.index) || 0))
        .map((opt: any) => opt.label || opt.name || '')
        .filter(Boolean)
        .join('、');
    };

    const describeLookup = (f: any) => {
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
      const fieldHeaders = [
        'No.', '所属グループ', 'フィールド名', 'フィールドコード', 'タイプ',
        '必須', '重複禁止', '初期値', '最小値', '最大値',
        '選択肢', '入力制約', 'ラベル非表示', '書式設定',
        'ルックアップ設定', '関連レコード設定', '計算式', '依存/参照'
      ];
      const COL_COUNT = fieldHeaders.length;
      const fAoa = [['項目定義'], fieldHeaders];
      const specialCells = {};
      const { subtableFieldOrder } = collectLayoutInfo(layout || ({} as any));

      const orderedItems = [];
      const seenFieldCodes = new Set();
      const walkForFields = (rows, groupLabel) => {
        const safeRows = Array.isArray(rows) ? rows : [];
        for (const row of safeRows) {
          if (row?.type === 'GROUP') {
            orderedItems.push({ kind: 'GROUP', item: row, groupLabel });
            walkForFields(Array.isArray(row.layout) ? row.layout : [], row.label || row.code || groupLabel || '');
            continue;
          }
          if (row?.type === 'SUBTABLE') {
            if (row.code) { orderedItems.push({ kind: 'FIELD', code: row.code, groupLabel }); seenFieldCodes.add(row.code); }
            continue;
          }
          const items = Array.isArray(row?.fields) ? row.fields : [];
          for (const item of items) {
            if (!item) continue;
            if (item.type === 'GROUP') {
              orderedItems.push({ kind: 'GROUP', item, groupLabel });
              walkForFields(Array.isArray(item.layout) ? item.layout : [], item.label || item.code || groupLabel || '');
              continue;
            }
            if (item.type === 'SUBTABLE') {
              if (item.code) { orderedItems.push({ kind: 'FIELD', code: item.code, groupLabel }); seenFieldCodes.add(item.code); }
              continue;
            }
            if (item.type === 'LABEL' || item.type === 'HR' || item.type === 'SPACER') {
              orderedItems.push({ kind: item.type, item, groupLabel });
              continue;
            }
            if (item.code) { orderedItems.push({ kind: 'FIELD', code: item.code, groupLabel }); seenFieldCodes.add(item.code); }
          }
        }
      };
      walkForFields(Array.isArray(layout?.layout) ? layout.layout : [], '');
      Object.entries(fields).forEach(([c, f]) => {
        if (!seenFieldCodes.has(c) && f.type !== 'GROUP') orderedItems.push({ kind: 'FIELD', code: c, groupLabel: '' });
      });

      let no = 1;
      const padRow = (arr) => { const r = arr.slice(); while (r.length < COL_COUNT) r.push(''); return r; };
      const pushRow = (label: string, code: string, f: any, parentLabel: string, isSubtableField: boolean, groupLabelOverride?: string) => {
        const typeJ = f?.lookup ? `ルックアップ(${FIELD_TYPE[f?.type] || f?.type})` : (FIELD_TYPE[f?.type] || f?.type || '');

        let optionsStr = '-';
        if (f.options) {
          const optEntries = Object.entries(f.options) as Array<[string, any]>;
          optEntries.sort((a, b) => (a[1].index ?? 999) - (b[1].index ?? 999));
          optionsStr = optEntries.map(([k, v]) => v.label || v.name || k).join('\n') || '-';
        }

        const constraints = [];
        if (f.minLength) constraints.push(`最小文字数: ${f.minLength}`);
        if (f.maxLength) constraints.push(`最大文字数: ${f.maxLength}`);
        if (f.regex) constraints.push(`正規表現: ${f.regex}`);
        if (f.protocol) constraints.push(`プロトコル: ${f.protocol}`);

        let lookupStr = '-';
        if (f.lookup) {
          const lu = f.lookup;
          const refAppName = appNames[lu.relatedApp?.app] || `(ID:${lu.relatedApp?.app})`;
          const parts = [`参照アプリ: ${refAppName}`, `キーフィールド: ${lu.relatedKeyField || '-'}`];
          if (Array.isArray(lu.fieldMappings) && lu.fieldMappings.length) {
            parts.push('コピー先:');
            lu.fieldMappings.forEach((m) => parts.push(`  ${m.field} ← ${m.relatedField}`));
          }
          if (Array.isArray(lu.lookupPickerFields) && lu.lookupPickerFields.length) parts.push(`絞り込み表示: ${lu.lookupPickerFields.join(', ')}`);
          if (lu.filterCond) parts.push(`絞り込み条件: ${UtilsX.formatFilterCond(lu.filterCond)}`);
          if (lu.sort) parts.push(`ソート: ${UtilsX.formatSort(lu.sort)}`);
          lookupStr = parts.join('\n');
        }

        let refTableStr = '-';
        if (f.referenceTable) {
          const rt = f.referenceTable;
          const refAppName = appNames[rt.relatedApp?.app] || `(ID:${rt.relatedApp?.app})`;
          const parts = [`参照アプリ: ${refAppName}`];
          if (rt.condition) parts.push(`条件: ${rt.condition?.field || '-'} = ${rt.condition?.relatedField || '-'}`);
          if (Array.isArray(rt.displayFields) && rt.displayFields.length) parts.push(`表示フィールド: ${rt.displayFields.join(', ')}`);
          if (rt.filterCond) parts.push(`絞り込み: ${UtilsX.formatFilterCond(rt.filterCond)}`);
          if (rt.sort) parts.push(`ソート: ${UtilsX.formatSort(rt.sort)}`);
          if (rt.size != null) parts.push(`表示件数: ${rt.size}`);
          refTableStr = parts.join('\n');
        }

        const calcStr = f.expression || f.formula || '-';

        const deps = [];
        if (f.type === 'SUBTABLE') deps.push('[テーブル]');
        if (f.fields) deps.push(`サブフィールド数: ${Object.keys(f.fields).length}`);

        const groupLabel = isSubtableField
          ? `(${parentLabel || '親'})`
          : (groupLabelOverride || fieldGroupMap.get(code) || '-');

        const rowData = [
          no++,
          groupLabel,
          parentLabel ? `  ${parentLabel} > ${label}` : label,
          code,
          typeJ,
          UtilsX.formatBoolean(f.required),
          UtilsX.formatBoolean(f.unique),
          UtilsX.formatDefaultValue(f.defaultValue),
          UtilsX.safeGet(f, 'minValue', UtilsX.safeGet(f, 'min', '')),
          UtilsX.safeGet(f, 'maxValue', UtilsX.safeGet(f, 'max', '')),
          optionsStr,
          constraints.join('\n') || '-',
          f.noLabel ? 'はい' : '-',
          UtilsX.formatFieldFormat(f) || '-',
          lookupStr,
          refTableStr,
          calcStr,
          deps.join('\n') || '-'
        ];
        const rowIdx = fAoa.length;
        fAoa.push(rowData);

        if (f.required) {
          specialCells[`${rowIdx},5`] = {
            ...Sty.cell('center'),
            fill: { patternType: 'solid', fgColor: { rgb: CONFIG.COLORS.REQUIRED_BG } }
          };
        }
        if (isSubtableField) {
          for (let c = 1; c <= 4; c++) {
            specialCells[`${rowIdx},${c}`] = {
              ...Sty.cell('left'),
              fill: { patternType: 'solid', fgColor: { rgb: CONFIG.COLORS.SUBTABLE_BG } }
            };
          }
        }
      };

      const pushGroupRow = (item, groupLabel) => {
        const rowIdx = fAoa.length;
        fAoa.push(padRow([
          no++,
          groupLabel || '-',
          item.label || item.code || '',
          item.code || '-',
          FIELD_TYPE['GROUP'] || 'グループ'
        ]));
        for (let c = 1; c <= 4; c++) {
          specialCells[`${rowIdx},${c}`] = {
            ...Sty.cell('left'),
            fill: { patternType: 'solid', fgColor: { rgb: CONFIG.COLORS.SECTION_BG } }
          };
        }
      };

      const pushDecorationRow = (kind, item, groupLabel) => {
        const typeJ = FIELD_TYPE[kind] || kind;
        const labelText = kind === 'LABEL' ? UtilsX.stripHtml(item.label || '').trim() : '-';
        const code = kind === 'SPACER' ? (item.elementId || '-') : '-';
        fAoa.push(padRow([
          no++,
          groupLabel || '-',
          labelText || '-',
          code,
          typeJ
        ]));
      };

      const sectionRowsFields = [];
      for (const entry of orderedItems) {
        if (entry.kind === 'GROUP') {
          pushGroupRow(entry.item, entry.groupLabel);
          continue;
        }
        if (entry.kind === 'LABEL' || entry.kind === 'HR' || entry.kind === 'SPACER') {
          pushDecorationRow(entry.kind, entry.item, entry.groupLabel);
          continue;
        }
        const code = entry.code;
        const f = fields[code];
        if (!f || f.type === 'GROUP') continue;
        pushRow(f.label || '', code, f, null, false, entry.groupLabel);
        if (f.type === 'SUBTABLE' && f.fields) {
          const subCodes = subtableFieldOrder.get(code) || Object.keys(f.fields);
          const subHeaderRow = fAoa.length;
          const subCount = subCodes.filter((sc) => f.fields[sc]).length;
          fAoa.push(padRow([`▼ テーブル「${f.label || code}」(${subCount}列)`]));
          sectionRowsFields.push(subHeaderRow);
          for (const sc of subCodes) {
            if (f.fields[sc]) pushRow(f.fields[sc].label || '', sc, f.fields[sc], f.label || code, true);
          }
        }
      }

      appendSheet('項目定義', {
        aoa: fAoa,
        options: {
          headerRowIndex: 1, titleRows: [0], freezeRows: 2, freezeCols: 3,
          centerCols: [0, 5, 6, 12], sectionRows: sectionRowsFields, specialCells
        },
        pageSetup: { orientation: 'landscape', printTitleRows: 2 }
      }, { description: 'フィールド別詳細定義・制約・依存関係', recordCount: no - 1 });
    }

    if (selectedSheets.has('layout') && Array.isArray(layout?.layout)) {
      const lAoa = [['フォームレイアウト'], ['No.', '行', '列', '区分', '階層', '表示', 'フィールドコード', 'タイプ', '必須', '幅', '備考']];
      let lno = 1;
      const sanitize = (label) => CONFIG.SANITIZE_LABEL_HTML_IN_LAYOUT ? UtilsX.stripHtml(label) : (label || '');
      const outlineRows = [];
      const getWidth = (item) => {
        const sz = item?.size?.width;
        return sz ? String(sz) : '-';
      };

      const walkRows = (rows, depth, rowOffset) => {
        let rowNo = rowOffset;
        const safeRows = Array.isArray(rows) ? rows : [];
        for (const row of safeRows) {
          rowNo++;
          const indent = '  '.repeat(depth);
          if (row?.type === 'GROUP') {
            const label = sanitize(row.label || fields[row.code]?.label);
            const rowIdx = lAoa.length;
            lAoa.push([lno++, rowNo, '-', 'グループ', depth, `${indent}${label || '-'}`, row.code || '-', 'GROUP', '-', '-', row.open === false ? '初期非表示' : '-']);
            outlineRows.push({ idx: rowIdx, level: depth });
            walkRows(Array.isArray(row.layout) ? row.layout : [], depth + 1, 0);
            continue;
          }
          if (row?.type === 'SUBTABLE') {
            const rowIdx = lAoa.length;
            lAoa.push([lno++, rowNo, '-', 'テーブル', depth, `${indent}${fields[row.code]?.label || row.code || '-'}`, row.code || '-', 'テーブル', '-', '-', '-']);
            outlineRows.push({ idx: rowIdx, level: depth });
            UtilsX.ensureArray(row.fields).forEach((c, ci) => {
              const cf = fields?.[row.code]?.fields?.[c.code] || fields?.[c.code];
              const label = sanitize(c.label || cf?.label);
              const ridx = lAoa.length;
              lAoa.push([lno++, rowNo, ci + 1, 'テーブル列', depth + 1, `${indent}  ${label || '-'}`, c.code || '-', FIELD_TYPE[c.type] || c.type || '-', UtilsX.formatBoolean(!!cf?.required), getWidth(c), `親:${row.code}`]);
              outlineRows.push({ idx: ridx, level: depth + 1 });
            });
            continue;
          }
          const items = Array.isArray(row?.fields) ? row.fields : [];
          items.forEach((item, ci) => {
            if (!item) return;
            const rowIdx = lAoa.length;
            if (item.type === 'GROUP') {
              const label = sanitize(item.label || fields[item.code]?.label);
              lAoa.push([lno++, rowNo, ci + 1, 'グループ', depth, `${indent}${label || '-'}`, item.code || '-', 'GROUP', '-', getWidth(item), item.open === false ? '初期非表示' : '-']);
              outlineRows.push({ idx: rowIdx, level: depth });
              walkRows(Array.isArray(item.layout) ? item.layout : [], depth + 1, 0);
              return;
            }
            if (item.type === 'SUBTABLE') {
              lAoa.push([lno++, rowNo, ci + 1, 'テーブル', depth, `${indent}${fields[item.code]?.label || item.code || '-'}`, item.code || '-', 'テーブル', '-', getWidth(item), '-']);
              outlineRows.push({ idx: rowIdx, level: depth });
              return;
            }
            if (item.type === 'LABEL') {
              const label = sanitize(item.label);
              lAoa.push([lno++, rowNo, ci + 1, 'ラベル', depth, `${indent}${label || '-'}`, '-', 'LABEL', '-', getWidth(item), '-']);
              outlineRows.push({ idx: rowIdx, level: depth });
              return;
            }
            if (item.type === 'HR') {
              lAoa.push([lno++, rowNo, ci + 1, '罫線', depth, `${indent}───`, '-', 'HR', '-', getWidth(item), '-']);
              outlineRows.push({ idx: rowIdx, level: depth });
              return;
            }
            if (item.type === 'SPACER') {
              lAoa.push([lno++, rowNo, ci + 1, 'スペース', depth, `${indent}(空白)`, item.elementId || '-', 'SPACER', '-', getWidth(item), '-']);
              outlineRows.push({ idx: rowIdx, level: depth });
              return;
            }
            const f = fields?.[item.code];
            const label = f?.label || sanitize(item.label) || item.code || '-';
            const type = FIELD_TYPE[f?.type] || FIELD_TYPE[item.type] || f?.type || item.type || '-';
            lAoa.push([lno++, rowNo, ci + 1, 'フィールド', depth, `${indent}${label}`, item.code || '-', type, UtilsX.formatBoolean(!!f?.required), getWidth(item), '-']);
            outlineRows.push({ idx: rowIdx, level: depth });
          });
        }
      };
      walkRows(layout.layout, 0, 0);

      const sheetName = appendSheet('フォームレイアウト', {
        aoa: lAoa,
        options: { headerRowIndex: 1, titleRows: [0], freezeRows: 2, centerCols: [0, 1, 2, 4, 8] },
        pageSetup: { orientation: 'landscape', printTitleRows: 2 }
      }, { description: 'フォーム配置順・行列位置・階層構造' });

      if (sheetName && CONFIG.STYLES.ENABLE_OUTLINE && styled) {
        const ws = wb.Sheets[sheetName];
        const existingRows = ws['!rows'] || [];
        outlineRows.forEach(({ idx, level }) => {
          if (level > 0) {
            existingRows[idx] = { ...(existingRows[idx] || ({} as any)), level: Math.min(level, 7) };
          }
        });
        ws['!rows'] = existingRows;
      }
    }

    if (selectedSheets.has('views') && views?.views) {
      const fieldLabelMap = buildFieldLabelMap(fields);
      const typeMap = { 'LIST': '一覧', 'CALENDAR': 'カレンダー', 'CUSTOM': 'カスタマイズ' };
      const headers = ['ビュー名', '種別', '表示順', '表示フィールド', '表示フィールド（ラベル）', 'フィルター条件', 'ソート', 'ページング', 'メモ'];
      const rows = (Object.entries(views.views) as Array<[string, any]>)
        .sort(([, a], [, b]) => (Number(a.index) || 0) - (Number(b.index) || 0))
        .map(([name, v]: [string, any]) => {
          const fieldCodes = UtilsX.ensureArray(v.fields);
          const fieldLabels = fieldCodes.map((c: any) => fieldLabelMap[c] || c);
          return [
            name,
            (typeMap as any)[v.type] || v.type || '',
            v.index || '',
            fieldCodes.join('\n') || '-',
            fieldLabels.join('\n') || '-',
            UtilsX.formatFilterCond(v.filterCond),
            UtilsX.formatSort(v.sort),
            (v.paginationType ? (PAGINATION_LABEL[String(v.paginationType).toUpperCase()] || v.paginationType) : (v.pagination === false ? '無効' : '既定')),
            UtilsX.stripHtml(v.customView || v.html || v.builtinType || '')
          ];
        });
      appendSheet('一覧', { ...buildSimpleAOA('一覧(ビュー)', headers, rows), pageSetup: { orientation: 'landscape', printTitleRows: 2 } }, { description: 'ビュー(一覧/カレンダー/カスタム)の設定' });
    }

    if (selectedSheets.has('reports') && reports?.reports) {
      const headers = ['グラフ名', '種別', '集計対象', '集計方法', 'グループ化', 'ソート', 'フィルター'];
      const rows = (Object.entries(reports.reports) as Array<[string, any]>)
        .sort(([, a], [, b]) => (Number(a.index) || 0) - (Number(b.index) || 0))
        .map(([name, r]: [string, any]) => [
          name,
          ENUM_LOOKUP(CHART_TYPE_LABEL, r.chartType || r.type) || r.chartType || r.type || '',
          Array.isArray(r.aggregations) ? r.aggregations.map((a: any) => `${ENUM_LOOKUP(AGGREGATION_TYPE_LABEL, a.type) || a.type || ''}（${a.code || ''}）`).join('\n') : '',
          ENUM_LOOKUP(CHART_MODE_LABEL, r.chartMode) || r.chartMode || '',
          Array.isArray(r.groups) ? r.groups.map((g: any) => `${g.code || ''}${g.per ? `(${ENUM_LOOKUP(GROUP_PER_LABEL, g.per) || g.per})` : ''}`).join('、') : '',
          UtilsX.formatSort(Array.isArray(r.sorts) ? r.sorts.map((s: any) => `${s.by || ''} ${s.order || ''}`).join(', ') : ''),
          UtilsX.formatFilterCond(r.filterCond)
        ]);
      appendSheet('グラフ', { ...buildSimpleAOA('グラフ', headers, rows), pageSetup: { orientation: 'landscape', printTitleRows: 2 } }, { description: 'グラフ/集計レポートの定義' });
    }

    if (selectedSheets.has('status') && status) {
      const pAoa = [['プロセス管理']];
      const pSectionRows = [];
      const pHeaderInfoRows = [];
      const pEmptyRows = [];

      pAoa.push([]); pEmptyRows.push(pAoa.length - 1);
      pAoa.push(['■ 基本情報']); pSectionRows.push(pAoa.length - 1);
      pAoa.push(['項目', '値']); pHeaderInfoRows.push(pAoa.length - 1);
      pAoa.push(['プロセス管理', status.enable ? '有効' : '無効']);
      pAoa.push(['ステータス数', String(Object.keys(status.states || ({} as any)).length)]);
      pAoa.push(['アクション(遷移)数', String((status.actions || []).length)]);
      pAoa.push([]); pEmptyRows.push(pAoa.length - 1);

      pAoa.push(['■ ステータス一覧']); pSectionRows.push(pAoa.length - 1);
      pAoa.push(['順序', 'ステータス名', '作業者の選び方', '作業者候補', '入ってくる遷移数', '出て行く遷移数']); pHeaderInfoRows.push(pAoa.length - 1);
      const stateEntries = (Object.entries(status.states || ({} as any)) as Array<[string, any]>)
        .sort(([, a], [, b]) => (Number(a.index) || 0) - (Number(b.index) || 0));
      stateEntries.forEach(([name, st]: [string, any]) => {
        const asgnType = st.assignee?.type ? (ENUM_LOOKUP(ASSIGNEE_TYPE_LABEL, st.assignee.type) || st.assignee.type) : '-';
        const asgnList = Array.isArray(st.assignee?.entities)
          ? st.assignee.entities.map(UtilsX.formatEntityDetailed).join('\n')
          : '-';
        const inCount = (status.actions || []).filter((a: any) => a.to === name).length;
        const outCount = (status.actions || []).filter((a: any) => a.from === name).length;
        pAoa.push([String(st.index || '-'), name, asgnType, asgnList, String(inCount), String(outCount)]);
      });
      pAoa.push([]); pEmptyRows.push(pAoa.length - 1);

      pAoa.push(['■ アクション(遷移)一覧']); pSectionRows.push(pAoa.length - 1);
      pAoa.push(['No.', 'アクション名', '遷移元', '遷移先', '遷移条件']); pHeaderInfoRows.push(pAoa.length - 1);
      (status.actions || []).forEach((a: any, i: number) => {
        pAoa.push([String(i + 1), a.name || '-', a.from || '-', a.to || '-', UtilsX.formatFilterCond(a.filterCond)]);
      });

      appendSheet('プロセス管理', {
        aoa: pAoa,
        options: {
          headerRowIndex: pHeaderInfoRows[0] ?? 3,
          titleRows: [0],
          sectionRows: pSectionRows,
          headerInfoRows: pHeaderInfoRows,
          emptyRows: pEmptyRows,
          freezeRows: 1,
          enableAutoFilter: false
        },
        pageSetup: { orientation: 'landscape', printTitleRows: 1 }
      }, { description: 'ワークフロー設定・ステータス・遷移アクション' });
    }

    if (selectedSheets.has('statusMatrix') && status?.enable && status?.states && Array.isArray(status?.actions)) {
      const stateNames = (Object.entries(status.states || ({} as any)) as Array<[string, any]>)
        .sort(([, a], [, b]) => (Number(a.index) || 0) - (Number(b.index) || 0))
        .map(([, s]: [string, any]) => s.name || '');
      if (stateNames.length) {
        const mAoa = [['遷移マトリクス'], ['遷移元 \\ 遷移先', ...stateNames]];
        for (const from of stateNames) {
          const row = [from];
          for (const to of stateNames) {
            const matched = status.actions.filter((a: any) => a.from === from && a.to === to).map((a: any) => a.name || '●');
            row.push(matched.join('\n'));
          }
          mAoa.push(row);
        }
        const specialCells = {};
        // 対角線（自遷移）
        for (let i = 0; i < stateNames.length; i++) {
          specialCells[`${i + 2},${i + 1}`] = {
            ...Sty.cell('center'),
            fill: { patternType: 'solid', fgColor: { rgb: 'FFD5D5D5' } }
          };
        }
        // 遷移ありセル
        for (let r = 2; r < mAoa.length; r++) {
          for (let c = 1; c < mAoa[r].length; c++) {
            if (mAoa[r][c] && !specialCells[`${r},${c}`]) {
              specialCells[`${r},${c}`] = {
                ...Sty.cell('center'),
                fill: { patternType: 'solid', fgColor: { rgb: CONFIG.COLORS.SUCCESS_BG } }
              };
            }
          }
        }
        appendSheet('遷移マトリクス', {
          aoa: mAoa,
          options: { headerRowIndex: 1, titleRows: [0], freezeRows: 2, freezeCols: 1, specialCells, enableAutoFilter: false },
          pageSetup: { orientation: 'landscape', printTitleRows: 2 }
        }, { description: '遷移元×遷移先のアクション対応マトリクス' });
      }
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
      if (data) appendSheet('アプリ権限', { ...data, pageSetup: { orientation: 'landscape', printTitleRows: 2 } }, { description: 'アプリ全体の閲覧/編集/削除等の権限' });
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
        appendSheet('レコード権限', { ...buildSimpleAOA('レコード権限', ['フィルター条件', '対象', '閲覧', '編集', '削除', 'サブ組織含'], rows), pageSetup: { orientation: 'landscape', printTitleRows: 2 } }, { description: '条件付きレコード単位権限' });
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
        appendSheet('フィールド権限', { ...buildSimpleAOA('フィールド権限', ['フィールドコード', 'フィールド名', '対象', '閲覧', '編集'], rows), pageSetup: { orientation: 'landscape', printTitleRows: 2 } }, { description: 'フィールド単位の閲覧/編集制限' });
      }
    }

    if (selectedSheets.has('customize') && customize) {
      const renderScope = (scope, obj) => {
        const list = [];
        ['js', 'css'].forEach((kind) => {
          (obj?.[kind] || []).forEach((entry, i) => {
            const refType = entry.type ? (ENUM_LOOKUP(RESOURCE_TYPE_LABEL, entry.type) || entry.type) : '';
            list.push([scope, kind.toUpperCase(), i + 1, refType, entry.file?.name || entry.url || '', entry.file?.fileKey || '']);
          });
        });
        return list;
      };
      const rows = [
        ...renderScope('PC', customize.desktop),
        ...renderScope('モバイル', customize.mobile)
      ];
      if (rows.length) {
        appendSheet('JS/CSSカスタマイズ', { ...buildSimpleAOA('JS/CSSカスタマイズ', ['スコープ', '種別', 'No', '参照方法', '名前/URL', 'fileKey'], rows), pageSetup: { orientation: 'landscape', printTitleRows: 2 } }, { description: 'JS/CSSファイル適用設定' });
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
      if (rows.length) appendSheet('アクション', { ...buildSimpleAOA('アクション', headers, rows), pageSetup: { orientation: 'landscape', printTitleRows: 2 } }, { description: 'レコード再利用アクションの定義' });
    }

    if (selectedSheets.has('plugins') && pluginsResp?.plugins) {
      const headers = ['プラグインID', '名前', '状態'];
      const rows = pluginsResp.plugins.map((p) => [p.id || '', p.name || '', p.enabled === false ? '無効' : '有効']);
      if (rows.length) appendSheet('プラグイン', { ...buildSimpleAOA('プラグイン', headers, rows), pageSetup: { orientation: 'portrait', printTitleRows: 2 } }, { description: 'アプリに追加されたプラグイン一覧' });
    }

    const renderNotifSheet = (title, payload, kind) => {
      const list = Array.isArray(payload?.notifications) ? payload.notifications : [];
      if (!list.length) return;
      const fieldLabelMap = buildFieldLabelMap(fields);
      if (kind === 'reminder') {
        const headers = ['No.', '対象', 'タイミング', '基準日フィールド', '基準日時フィールド', '曜日', '時刻', '絞込条件', '件名/本文'];
        const rows = list.map((n, i) => {
          const base = n.targetField || n.dateField || '';
          const baseLabel = base ? (fieldLabelMap[base] || base) : '-';
          return [
            i + 1,
            UtilsX.formatEntityDetailed(n.entity || n),
            n.timing ? (typeof n.timing === 'object' ? (ENUM_LOOKUP(NOTIFICATION_TIMING_LABEL, n.timing.code) || n.timing.code || '-') : (ENUM_LOOKUP(NOTIFICATION_TIMING_LABEL, n.timing) || n.timing)) : '-',
            baseLabel,
            n.daysLater != null || n.daysBefore != null ? `${n.daysLater != null ? `+${n.daysLater}` : ''}${n.daysBefore != null ? `-${n.daysBefore}` : ''}日` : '-',
            Array.isArray(n.weekdays) ? n.weekdays.join('、') : '-',
            n.time || '-',
            UtilsX.formatFilterCond(n.filterCond || ''),
            UtilsX.stripHtml(n.title || n.body || n.content || '-')
          ];
        });
        appendSheet(title, { ...buildSimpleAOA(title, headers, rows), pageSetup: { orientation: 'landscape', printTitleRows: 2 } },
          { description: 'リマインダー通知の設定一覧' });
        return;
      }
      if (kind === 'perRecord') {
        const headers = ['No.', '対象', 'フィルター条件', 'レコード作成', '編集', 'コメント', 'ステータス', 'ファイル添付', '本文/備考'];
        const rows = list.map((n, i) => [
          i + 1,
          UtilsX.formatEntityDetailed(n.entity || n),
          UtilsX.formatFilterCond(n.filterCond || ''),
          UtilsX.formatBoolean(n.recordAdded ?? n.notifyOnCreate),
          UtilsX.formatBoolean(n.recordEdited ?? n.notifyOnEdit),
          UtilsX.formatBoolean(n.commentAdded ?? n.notifyOnComment),
          UtilsX.formatBoolean(n.statusChanged ?? n.notifyOnStatusChange),
          UtilsX.formatBoolean(n.fileImported),
          UtilsX.stripHtml(n.title || n.body || '-')
        ]);
        appendSheet(title, { ...buildSimpleAOA(title, headers, rows), pageSetup: { orientation: 'landscape', printTitleRows: 2 } },
          { description: 'レコード単位で指定された通知' });
        return;
      }
      const headers = ['No.', '対象', 'レコード追加', '編集', 'コメント', 'ステータス', 'ファイル添付', 'タイミング/条件', '本文/備考'];
      const rows = list.map((n, i) => [
        i + 1,
        UtilsX.formatEntityDetailed(n.entity || n),
        UtilsX.formatBoolean(n.recordAdded ?? n.notifyOnCreate),
        UtilsX.formatBoolean(n.recordEdited ?? n.notifyOnEdit),
        UtilsX.formatBoolean(n.commentAdded ?? n.notifyOnComment),
        UtilsX.formatBoolean(n.statusChanged ?? n.notifyOnStatusChange),
        UtilsX.formatBoolean(n.fileImported),
        n.filterCond ? UtilsX.formatFilterCond(n.filterCond) : (n.timing ? (typeof n.timing === 'object' ? (ENUM_LOOKUP(NOTIFICATION_TIMING_LABEL, n.timing.code) || n.timing.code || '-') : (ENUM_LOOKUP(NOTIFICATION_TIMING_LABEL, n.timing) || n.timing)) : '-'),
        UtilsX.stripHtml(n.title || n.body || '-')
      ]);
      appendSheet(title, { ...buildSimpleAOA(title, headers, rows), pageSetup: { orientation: 'landscape', printTitleRows: 2 } },
        { description: 'アプリ共通の通知設定' });
    };

    if (selectedSheets.has('genNotif')) renderNotifSheet('通知(一般)', genNotif, 'general');
    if (selectedSheets.has('recNotif')) renderNotifSheet('通知(レコード)', recNotif, 'perRecord');
    if (selectedSheets.has('remNotif')) renderNotifSheet('通知(リマインダー)', remNotif, 'reminder');

    if (selectedSheets.has('webhook')) {
      const list = Array.isArray(webhooksResp?.webhooks) ? webhooksResp.webhooks : [];
      if (list.length) {
        const headers = ['ID', 'URL', 'イベント', '説明', '有効'];
        const rows = list.map((w) => [
          w.id || '',
          w.url || w.notifyUrl || '',
          Array.isArray(w.notificationEvents || w.events) ? (w.notificationEvents || w.events).map((ev) => ENUM_LOOKUP(WEBHOOK_EVENT_LABEL, ev) || ev).join(', ') : '',
          UtilsX.stripHtml(w.description || ''),
          UtilsX.formatBoolean(w.enabled !== false)
        ]);
        appendSheet('Webhook', { ...buildSimpleAOA('Webhook', headers, rows), pageSetup: { orientation: 'landscape', printTitleRows: 2 } }, { description: '外部システム連携用 Webhook' });
      }
    }

    if (selectedSheets.has('adminNotes') && adminNotes) {
      const content = UtilsX.stripHtml(adminNotes.content || adminNotes.note || '');
      if (content) {
        const rows = content.split('\n').map((line, i) => [i + 1, line]);
        appendSheet('管理者メモ', { ...buildSimpleAOA('管理者メモ', ['行', '内容'], rows), pageSetup: { orientation: 'portrait', printTitleRows: 2 } }, { description: '管理者用メモ/申し送り事項' });
      }
    }

    if (selectedSheets.has('dependencies')) {
      const dAoa = [['フィールド依存関係マップ'], ['No.', 'フィールド名', 'フィールドコード', '依存種別', '参照先', '詳細']];
      const specialCells = {};
      let dno = 1;

      const addDep = (label, code, depType, target, detail, color) => {
        const rowIdx = dAoa.length;
        dAoa.push([dno++, label, code, depType, target, detail]);
        if (color) {
          specialCells[`${rowIdx},3`] = {
            ...Sty.cell('left'),
            fill: { patternType: 'solid', fgColor: { rgb: color } }
          };
        }
      };

      const processField = (code, f, parent) => {
        const label = parent ? `${parent} > ${f.label || code}` : (f.label || code);
        if (f.lookup?.relatedApp?.app) {
          const appId = f.lookup.relatedApp.app;
          const appName = appNames[appId] || `(ID:${appId})`;
          addDep(label, code, 'ルックアップ', appName, `キー: ${f.lookup.relatedKeyField || '-'}`, CONFIG.COLORS.INFO_BG);
          for (const m of UtilsX.ensureArray(f.lookup.fieldMappings)) {
            addDep(label, code, 'ルックアップコピー', `${m.field} ← ${m.relatedField}`, `コピー元アプリ: ${appName}`, CONFIG.COLORS.INFO_BG);
          }
        }
        if (f.referenceTable?.relatedApp?.app) {
          const appId = f.referenceTable.relatedApp.app;
          const appName = appNames[appId] || `(ID:${appId})`;
          addDep(label, code, '関連レコード', appName, `表示: ${UtilsX.ensureArray(f.referenceTable.displayFields).join(',')}`, CONFIG.COLORS.DEPENDENCY_BG);
        }
        const expr = f.expression || f.formula;
        if (expr) {
          const uniqueRefs = extractCodesFromExpr(expr, fields).filter((r) => r !== code);
          if (uniqueRefs.length) {
            addDep(label, code, '計算参照', uniqueRefs.join(', '), `式: ${expr}`, CONFIG.COLORS.WARNING_BG);
          }
        }
        const usedBy = fieldUsageMap.get(code);
        if (usedBy && usedBy.size) {
          addDep(label, code, '被参照', `${usedBy.size}箇所`, [...usedBy].join('\n'), CONFIG.COLORS.SUCCESS_BG);
        }
      };

      for (const [code, f] of Object.entries(fields) as Array<[string, any]>) {
        if (f.type === 'GROUP') continue;
        processField(code, f, null);
        if (f.type === 'SUBTABLE' && f.fields) {
          for (const [sc, sf] of Object.entries(f.fields) as Array<[string, any]>) {
            processField(sc, sf, f.label || code);
          }
        }
      }

      (Object.values(actions || ({} as any)) as any[]).forEach((a: any) => {
        if (a?.destApp?.app) {
          const appId = a.destApp.app;
          const appName = appNames[appId] || `(ID:${appId})`;
          addDep('(アクション)', a.name || '', 'アクション', appName, UtilsX.formatFilterCond(a.filterCond), CONFIG.COLORS.DANGER_BG);
        }
      });

      (Object.entries(views?.views || ({} as any)) as Array<[string, any]>).forEach(([name, v]: [string, any]) => {
        if (v.filterCond) {
          const refs = Object.keys(fields).filter((c) => {
            const re = new RegExp(`(^|[^A-Za-z0-9_])${UtilsX.escapeRegExp(c)}([^A-Za-z0-9_]|$)`);
            return re.test(String(v.filterCond));
          });
          if (refs.length) addDep('(一覧)', name, '一覧絞込', refs.join(', '), UtilsX.formatFilterCond(v.filterCond), CONFIG.COLORS.INFO_BG);
        }
      });

      (status?.actions || []).forEach((a: any) => {
        if (a.filterCond) {
          const refs = Object.keys(fields).filter((c) => {
            const re = new RegExp(`(^|[^A-Za-z0-9_])${UtilsX.escapeRegExp(c)}([^A-Za-z0-9_]|$)`);
            return re.test(String(a.filterCond));
          });
          if (refs.length) addDep('(プロセス遷移)', a.name || '', 'プロセス条件', refs.join(', '), UtilsX.formatFilterCond(a.filterCond), CONFIG.COLORS.DEPENDENCY_BG);
        }
      });

      const scanNotifRefs = (payload, tag) => {
        UtilsX.ensureArray(payload?.notifications).forEach((n, i) => {
          if (n.filterCond) {
            const refs = Object.keys(fields).filter((c) => {
              const re = new RegExp(`(^|[^A-Za-z0-9_])${UtilsX.escapeRegExp(c)}([^A-Za-z0-9_]|$)`);
              return re.test(String(n.filterCond));
            });
            if (refs.length) addDep(`(${tag}#${i + 1})`, '', `${tag}条件`, refs.join(', '), UtilsX.formatFilterCond(n.filterCond), CONFIG.COLORS.SUBTABLE_BG);
          }
        });
      };
      scanNotifRefs(genNotif, '通知一般');
      scanNotifRefs(recNotif, '通知レコード');
      scanNotifRefs(remNotif, '通知リマインダー');

      if (dAoa.length === 2) dAoa.push(['', '依存関係なし', '-', '-', '-', '-']);

      appendSheet('フィールド依存関係', {
        aoa: dAoa,
        options: { headerRowIndex: 1, titleRows: [0], freezeRows: 2, centerCols: [0], specialCells },
        pageSetup: { orientation: 'landscape', printTitleRows: 2 }
      }, { description: 'ルックアップ・計算・一覧・通知・プロセスの参照関係' });
    }

    // 目次シートを最後に構築し、先頭に挿入する
    {
      const tocAoa = [['目次 / Table of Contents']];
      tocAoa.push([appSettings?.name || `App ${APP_ID}`]);
      tocAoa.push([`App ID: ${APP_ID} / 出力: ${UtilsX.dt()} / 取得失敗: ${UI.failedAPIs.length}件`]);
      tocAoa.push([]);
      tocAoa.push(['キーメトリクス', '件数', 'キーメトリクス', '件数']);
      tocAoa.push(['フィールド', String(fieldCount), 'ビュー', String(viewCount)]);
      tocAoa.push(['プロセスステータス', String(processStateCount), 'プロセスアクション', String(processActionCount)]);
      tocAoa.push(['権限エントリ', String(appAclCount + recordAclCount + fieldAclCount), 'JS/CSSカスタマイズ', String(customizeCount)]);
      tocAoa.push([]);
      tocAoa.push(['No.', 'シート名', '内容', '件数']);
      sheetMetadata.forEach((m: any, i: number) => {
        tocAoa.push([String(i + 1), m.name, m.description || '-', String(m.recordCount)]);
      });
      const tocWs = XLSX.utils.aoa_to_sheet(tocAoa);
      const tocStyleOptions = {
        headerRowIndex: 9,
        titleRows: [0, 1],
        sectionRows: [2],
        headerInfoRows: [4, 9],
        emptyRows: [3, 8],
        freezeRows: 10,
        centerCols: [0, 3],
        enableAutoFilter: false
      };
      autosizeCols(tocWs, tocAoa, tocStyleOptions);
      applyStyles(tocWs, tocAoa, tocStyleOptions);
      applyCellMerges(tocWs, [
        { startRow: 0, endRow: 0, startCol: 0, endCol: 3 },
        { startRow: 1, endRow: 1, startCol: 0, endCol: 3 },
        { startRow: 2, endRow: 2, startCol: 0, endCol: 3 }
      ]);
      applyRowHeights(tocWs, tocAoa, { titleRows: [0, 1], emptyRows: [3, 8] });
      applyPageSetup(tocWs, { orientation: 'portrait', printTitleRows: 10 });
      sheetMetadata.forEach((m, i) => {
        const row = i + 11;
        const nameAddr = UtilsX.a1(row, 2);
        if (tocWs[nameAddr]) {
          tocWs[nameAddr].l = { Target: `#'${m.name.replace(/'/g, "''")}'!A1`, Tooltip: `${m.name}へ移動` };
          if (tocWs[nameAddr].s) {
            tocWs[nameAddr].s = {
              ...tocWs[nameAddr].s,
              font: { ...(tocWs[nameAddr].s.font || Sty.baseFont()), color: { rgb: 'FF0563C1' }, underline: true }
            };
          }
        }
      });
      const tocName = makeSafeSheetName('目次', new Set(wb.SheetNames));
      wb.Sheets[tocName] = tocWs;
      wb.SheetNames.unshift(tocName);
      printTitleConfigs.push({ sheetName: tocName, rows: 10 });
    }

    // 全シートの印刷タイトル(繰り返し行)を定義済み名前として登録
    if (printTitleConfigs.length) {
      wb.Workbook = wb.Workbook || ({} as any);
      wb.Workbook.Names = wb.Workbook.Names || [];
      for (const cfg of printTitleConfigs) {
        const idx = wb.SheetNames.indexOf(cfg.sheetName);
        if (idx < 0) continue;
        wb.Workbook.Names.push({
          Name: '_xlnm.Print_Titles',
          Ref: `'${cfg.sheetName.replace(/'/g, "''")}'!$1:$${cfg.rows}`,
          Sheet: idx
        });
      }
    }

    UI.update(returnWorkbook ? '生成完了' : 'ダウンロード中...', 12);
    const safeAppName = String(appSettings?.name || `App${APP_ID}`).replace(/[\\/:*?"<>|]/g, '_');
    const filename = `${safeAppName}_設計書_v${DESIGN_EXPORT_VERSION}.xlsx`;

    if (returnWorkbook) {
      // バッチ用: ダウンロードせず、ワークブックと付帯情報を返す。UI の表示制御は呼び出し元に委ねる。
      return {
        wb,
        filename,
        appId: APP_ID,
        appName: appSettings?.name || `App${APP_ID}`,
        failedAPIs: UI.failedAPIs.slice()
      };
    }

    const downloadExcel = (wb2, fname) => {
      const out = XLSX.write(wb2, { bookType: 'xlsx', type: 'array', cellStyles: true });
      const blob = new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const a = getToolDocument().createElement('a');
      const url = URL.createObjectURL(blob);
      a.href = url; a.download = fname;
      getToolDocument().body.appendChild(a); a.click();
      getToolDocument().body.removeChild(a); URL.revokeObjectURL(url);
    };
    downloadExcel(wb, filename);

    UI.hide();
    if (!suppressToast) {
      const errorMsg = UI.failedAPIs.length > 0 ? `\n⚠ ${UI.failedAPIs.length}件のAPI取得に失敗しました` : '';
      showToast(`✅ エクスポート完了${errorMsg}`, UI.failedAPIs.length > 0 ? 'warn' : 'success');
    }
    return true;

  } catch (e) {
    UI.hide();
    console.error('kintone設計書エクスポートエラー:', e);
    if (!suppressToast) showToast(`❌ エラーが発生しました: ${e.message}`, 'error');
    throw e;
  }
}

function pad2(n: number): string { return n.toString().padStart(2, '0'); }
function nowStampZip(d = new Date()): string {
  return `${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}_${pad2(d.getHours())}${pad2(d.getMinutes())}${pad2(d.getSeconds())}`;
}
function sanitizeFilename(name: string): string {
  return String(name || '').replace(/[\\/:*?"<>|]/g, '_').replace(/[\u0000-\u001f]/g, '').trim() || 'untitled';
}

/**
 * 複数アプリの設計書 Excel を一括生成し、1つの ZIP にまとめてダウンロードする。
 *
 * 仕様:
 * - シート選択ダイアログは最初に1回だけ表示し、全アプリに同じ選択を適用する。
 * - 1アプリでもエラーが発生しても残りのアプリは処理を継続し、エラーは結果サマリーに含める。
 * - 何も生成できなかった場合（全アプリ失敗 or キャンセル）は ZIP を作らず false を返す。
 *
 * @param params.appIds 出力対象のアプリID配列（文字列/数値の混在可、空・重複は除去）
 * @param params.guestId ゲストスペースID（任意）
 * @returns 生成・ダウンロードまで完了したら true、キャンセル時 false。
 */
export async function runBatchDesignExportXlsxZip(params: { appIds: Array<string | number>; guestId?: string }): Promise<boolean> {
  const seen = new Set<string>();
  const appIds: string[] = [];
  for (const v of (params.appIds || [])) {
    const id = String(v ?? '').trim();
    if (!id || !/^\d+$/.test(id) || seen.has(id)) continue;
    seen.add(id);
    appIds.push(id);
  }
  if (appIds.length === 0) throw new Error('有効なアプリIDが1件もありません。');
  const guestId = String(params.guestId || '').trim();

  // 1. シート選択を最初に1回だけ取得
  const selectedSheets = await showSheetSelectionDialog(resolveExportSheetDefs(), "📦 一括エクスポート設定");
  if (!selectedSheets) return false;

  // 2. 依存ライブラリを先にロード
  const batchUi = createBatchExporterUI();
  batchUi.show('ライブラリ読み込み中...', appIds.length + 2);
  let JSZipCtor: any;
  try {
    await loadSheetLibOnce();
    JSZipCtor = await loadJSZipOnce();
  } catch (e: any) {
    batchUi.hide();
    showToast(`❌ ライブラリの読み込みに失敗しました: ${e?.message || e}`, 'error');
    throw e;
  }
  batchUi.update('アプリの設計書を順次生成します...', 1);

  // 3. アプリごとにワークブックを生成（バッチ UI は維持しつつ、内部 UI は使わず批次状態を保持）
  type AppResult = { appId: string; appName: string; filename: string; ok: boolean; error?: string };
  const results: AppResult[] = [];
  const zip = new JSZipCtor();
  const usedFilenames = new Set<string>();
  let cancelled = false;

  (window as any).__kusBatchCancel = false;
  for (let i = 0; i < appIds.length; i++) {
    cancelled = !!(window as any).__kusBatchCancel;
    if (cancelled) break;
    const appId = appIds[i];
    const label = `(${i + 1}/${appIds.length}) アプリ ${appId}:`;
    batchUi.update(`${label} 設計書を生成中...`, i + 2);
    try {
      const ret = await runAdvancedDesignExporter({
        appId,
        guestId,
        preselectedSheets: selectedSheets,
        returnWorkbook: true,
        progressLabel: label,
        suppressToast: true
      });
      if (!ret || ret === true) {
        // 想定外（returnWorkbook=true の場合は必ずオブジェクトが返る）
        throw new Error('ワークブックが生成できませんでした');
      }
      const { wb, filename, appName, failedAPIs } = ret as any;
      // 内部 UI の overlay を閉じてバッチ UI を前面に戻す
      const doc = getToolDocument();
      const innerOverlay = doc.getElementById('kintone-exporter-overlay');
      if (innerOverlay && innerOverlay !== doc.getElementById('kintone-exporter-overlay')) {
        // 念のため: 同 ID なら維持される
      }

      // 内部 UI と batch UI は同じ ID を共有しているため、上書きされている。
      // バッチ UI を再表示して進捗を継続する。
      batchUi.show(`${label} ZIP に追加中...`, appIds.length + 2);
      batchUi.update(`${label} ZIP に追加中...`, i + 2);

      const baseName = sanitizeFilename(filename);
      let uniqueName = baseName;
      let n = 2;
      while (usedFilenames.has(uniqueName)) {
        const dot = baseName.lastIndexOf('.');
        const stem = dot > 0 ? baseName.slice(0, dot) : baseName;
        const ext = dot > 0 ? baseName.slice(dot) : '';
        uniqueName = `${stem}(${n})${ext}`;
        n++;
      }
      usedFilenames.add(uniqueName);

      const buf = (window as any).XLSX.write(wb, { bookType: 'xlsx', type: 'array', cellStyles: true });
      zip.file(uniqueName, buf);
      if (failedAPIs && failedAPIs.length) batchUi.addFailedAPIs(`App ${appId}`, failedAPIs);
      results.push({ appId, appName, filename: uniqueName, ok: true });
    } catch (e: any) {
      console.error(`[batch design xlsx] app ${appId} failed:`, e);
      results.push({ appId, appName: '', filename: '', ok: false, error: e?.message || String(e) });
      // バッチ UI を再表示（内部 UI が catch で hide していても良い／無くても良い）
      batchUi.show(`(${i + 1}/${appIds.length}) アプリ ${appId} の生成に失敗`, appIds.length + 2);
      batchUi.update(`(${i + 1}/${appIds.length}) アプリ ${appId} の生成に失敗: ${e?.message || e}`, i + 2);
    }
  }

  if (cancelled) {
    results.push({ appId: '-', appName: '', filename: '', ok: false, error: 'ユーザーにより中断されました' });
  }
  const successCount = results.filter((r) => r.ok).length;
  if (successCount === 0) {
    batchUi.hide();
    const detail = results.map((r) => `- App ${r.appId}: ${r.error || '(原因不明)'}`).join('\n');
    showToast(`❌ すべてのアプリで生成に失敗しました`, 'error');
    throw new Error(`設計書ZIPの生成に失敗しました\n${detail}`);
  }

  // 4. マニフェスト（処理結果サマリー）を ZIP に同梱
  const manifestLines: string[] = [];
  manifestLines.push('kintone 設計書 一括出力マニフェスト');
  manifestLines.push(`出力日時: ${new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}`);
  manifestLines.push(`対象アプリ数: ${appIds.length}（成功 ${successCount} / 失敗 ${appIds.length - successCount}）`);
  if (guestId) manifestLines.push(`ゲストスペース: ${guestId}`);
  manifestLines.push('');
  manifestLines.push('## 出力ファイル');
  for (const r of results) {
    if (r.ok) manifestLines.push(`- [OK] App ${r.appId} (${r.appName}) → ${r.filename}`);
    else manifestLines.push(`- [NG] App ${r.appId}: ${r.error}`);
  }
  const failedAPIs = batchUi.getFailedAPIs();
  if (failedAPIs.length) {
    manifestLines.push('');
    manifestLines.push('## API 取得失敗');
    for (const f of failedAPIs) manifestLines.push(`- ${f.app}: ${f.name} - ${f.error}`);
  }
  zip.file('_manifest.txt', manifestLines.join('\n') + '\n');
  zip.file('_manifest.json', JSON.stringify({
    generatedAt: new Date().toISOString(),
    appCount: appIds.length,
    successCount,
    failedCount: appIds.length - successCount,
    guestId: guestId || null,
    results,
    failedApis: failedAPIs
  }, null, 2));

  // 5. ZIP 生成 & ダウンロード
  batchUi.update('ZIPファイルを生成中...', appIds.length + 2);
  const blob = await zip.generateAsync({ type: 'blob' });
  const zipName = `kintone設計書_${appIds.length}件_${nowStampZip()}.zip`;
  const doc = getToolDocument();
  const a = doc.createElement('a');
  const url = URL.createObjectURL(blob);
  a.href = url; a.download = zipName;
  doc.body.appendChild(a); a.click();
  doc.body.removeChild(a);
  URL.revokeObjectURL(url);

  batchUi.hide();
  const ngCount = appIds.length - successCount;
  const tone = ngCount > 0 ? 'warn' : 'success';
  const suffix = ngCount > 0 ? `（成功 ${successCount} / 失敗 ${ngCount}）` : '';
  showToast(`✅ 設計書ZIPを保存しました${suffix}`, tone);
  return true;
}
