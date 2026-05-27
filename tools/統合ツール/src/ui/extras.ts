'use strict';

/**
 * UI 拡張機能の集約モジュール。
 *
 * 既存ファイルへ大規模に手を入れず、boot 完了後に呼ばれる initExtras() から
 * 段階的に各機能をフックします。
 *
 * 含まれる機能:
 * - 31 タブ間のスクロール位置記憶（メモリ内のみ）
 * - 32 タブバー自動格納モード（kus-tabs-auto-collapse）
 * - 35 トーストスタック表示
 * - 37 危険操作の 3 秒確認スライダー（data-confirm-slider="..."）
 * - 39 実行中タスク一覧（ヘッダーピル）
 * - 41 差分上部固定サマリ（kus-diff-fixed-summary）
 * - 44 重要度しきい値スライダー
 * - 46 行コピー時のフォーマット選択（簡易）
 * - 47 検索ハイライト色選択
 * - 49 ワンタップ追加プリセット（権限変更だけ等）
 * - 51 行の承認 / 却下キーバインド (J/K/A/R)
 * - 52 差分フィルタを URL ハッシュに同期
 * - 53 差分結果 JSON エクスポート/インポート
 * - 55 反映前チェックリストの動的調整（差分件数で項目変化）
 * - 60 フィールド種別アイコン
 * - 65 反映プランの Markdown 出力
 * - 70 ER 図フィルタ（参照系のみ等）— 簡易トグル
 * - 78 SVG/PNG 出力ボタン（ER/プロセス図）
 * - 80 ZIP 分割サイズ入力（添付 DL 用）
 * - 84 レスポンス JSON のツリー/テーブル切替（API テスター）
 * - 85 環境変数置換（API テスター）
 * - 86 cURL コマンドコピー
 *
 * いずれもブラウザストレージは使用せず、セッション内のみ。
 */

import { state, ui } from '../state.js';
import { setStatus } from './components.js';
import { getToolDocument } from './dialog.js';
import { localizeKintoneEnumsInText as kusEnumsLocalize } from '../kintone-enums.js';
import { renderReflectApplyChecklistStatus } from '../handlers/checklist.js';
import { runExportDiffXlsx } from '../diff/xlsx-export.js';

interface ExtrasGlobal {
  toastStack?: HTMLDivElement;
  taskList?: HTMLDivElement;
  scrollMap?: Map<string, number>;
  highlightColor?: string;
  severityThreshold?: 'all' | 'low' | 'mid' | 'high';
  taskTimer?: any;
  boundDocEvents?: WeakMap<Document, Set<string>>;
}

const G: ExtrasGlobal = {};

function getRoot(): HTMLElement | null {
  return getToolDocument().getElementById('kintone-unified-suite-v2');
}

function getDoc(): Document {
  return getRoot()?.ownerDocument || getToolDocument();
}

function getWin(): Window {
  return getDoc().defaultView || window;
}

function bindToolDocumentEvent(key: string, type: string, handler: EventListener, options?: AddEventListenerOptions): void {
  const doc = getDoc();
  const marker = `${key}:${type}`;
  if (!G.boundDocEvents) G.boundDocEvents = new WeakMap();
  let docEvents = G.boundDocEvents.get(doc);
  if (!docEvents) {
    docEvents = new Set();
    G.boundDocEvents.set(doc, docEvents);
  }
  if (docEvents.has(marker)) return;
  doc.addEventListener(type, handler, options);
  docEvents.add(marker);
}

/* ============================================================
 * 35: トーストスタック
 * ============================================================ */
export function pushToast(message: string, options: { tone?: 'info' | 'ok' | 'warn' | 'error'; ttl?: number } = {}): void {
  const root = getRoot();
  if (!root) return;
  if (!G.toastStack || !G.toastStack.isConnected || G.toastStack.ownerDocument !== root.ownerDocument) {
    const stack = root.ownerDocument.createElement('div');
    stack.id = 'u_toastStack';
    stack.className = 'kus-toast-stack';
    stack.setAttribute('role', 'log');
    stack.setAttribute('aria-live', 'polite');
    root.appendChild(stack);
    G.toastStack = stack;
  }
  const ttl = options.ttl ?? 3500;
  const el = root.ownerDocument.createElement('div');
  el.className = `kus-toast kus-toast--${options.tone || 'info'}`;
  el.textContent = message;
  el.addEventListener('click', () => el.remove());
  G.toastStack.appendChild(el);
  // limit to 6
  while (G.toastStack.children.length > 6) {
    G.toastStack.removeChild(G.toastStack.firstChild as Node);
  }
  getWin().setTimeout(() => {
    el.classList.add('is-leaving');
    getWin().setTimeout(() => el.remove(), 220);
  }, ttl);
}

/* ============================================================
 * 39: 実行中タスク一覧（ヘッダーピル）
 * ============================================================ */
export function initActiveTaskPanel(): void {
  const root = getRoot();
  const host = root?.querySelector('#u_envBadge') as HTMLElement | null;
  if (!host) return;
  if (G.taskList?.isConnected) return;
  const existing = host.parentElement?.querySelector('.kus-active-task-pill') as HTMLButtonElement | null;
  if (existing) {
    G.taskList = existing as any;
    return;
  }
  const doc = host.ownerDocument;
  const win = doc.defaultView || window;
  if (G.taskTimer) {
    win.clearInterval(G.taskTimer);
    G.taskTimer = null;
  }
  const pill = doc.createElement('button');
  pill.type = 'button';
  pill.className = 'kus-active-task-pill';
  pill.setAttribute('aria-label', '実行中タスク');
  pill.textContent = '⏱ 待機中';
  pill.addEventListener('click', () => {
    const label = state.runningTaskLabel || '実行中タスクはありません';
    pushToast(label, { tone: state.running ? 'info' : 'ok' });
  });
  host.parentElement?.insertBefore(pill, host);
  G.taskList = pill as any;
  // observer-like polling (cheap, every 600ms)
  G.taskTimer = win.setInterval(() => {
    if (!pill.isConnected) {
      win.clearInterval(G.taskTimer);
      G.taskTimer = null;
      return;
    }
    if (state.running) {
      pill.classList.add('is-busy');
      pill.textContent = `⏳ ${state.runningTaskLabel || '実行中…'}`;
    } else {
      pill.classList.remove('is-busy');
      pill.textContent = '✓ 待機中';
    }
  }, 600);
}

/* ============================================================
 * 31: スクロール位置記憶
 * ============================================================ */
export function initScrollMemory(): void {
  G.scrollMap = new Map();
  const root = getRoot();
  if (!root) return;
  const body = root.querySelector('.body') as HTMLElement | null;
  if (!body) return;
  const getKey = () => `${state.activeFeatureKey || 'launcher'}::${state.activeTab || 'home'}`;
  body.addEventListener('scroll', () => {
    G.scrollMap?.set(getKey(), body.scrollTop);
  }, { passive: true });
  // restore on tab change via mutation
  const restore = () => {
    const k = getKey();
    const saved = G.scrollMap?.get(k) ?? 0;
    requestAnimationFrame(() => { body.scrollTop = saved; });
  };
  // hook into tab buttons
  root.querySelectorAll<HTMLElement>('.tab[data-tab]').forEach((btn) => {
    btn.addEventListener('click', () => setTimeout(restore, 30));
  });
  root.querySelectorAll<HTMLElement>('[data-act="backToLauncher"], [data-act="breadcrumbHome"]').forEach((btn) => {
    btn.addEventListener('click', () => setTimeout(restore, 30));
  });
}

/* ============================================================
 * 37: 3 秒確認スライダー
 *
 * 任意のボタンに data-confirm-slider="メッセージ" を付けると、
 * クリック時にスライダーオーバーレイを表示する。
 * ============================================================ */
export function initConfirmSlider(): void {
  const root = getRoot();
  if (!root) return;
  root.addEventListener('click', (e) => {
    const target = (e.target as HTMLElement)?.closest?.('[data-confirm-slider]') as HTMLElement | null;
    if (!target) return;
    if (target.dataset.confirmSliderConfirmed === '1') {
      target.dataset.confirmSliderConfirmed = '';
      return;
    }
    e.preventDefault();
    e.stopImmediatePropagation();
    showConfirmSlider(target.dataset.confirmSlider || 'この操作は取り消せません', () => {
      target.dataset.confirmSliderConfirmed = '1';
      target.click();
    });
  }, true);
}

function showConfirmSlider(message: string, onConfirm: () => void): void {
  const overlay = document.createElement('div');
  overlay.className = 'kus-confirm-overlay';
  overlay.innerHTML = `
    <div class="kus-confirm-card" role="alertdialog" aria-label="確認">
      <div class="kus-confirm-card__title">⚠ 危険な操作</div>
      <div class="kus-confirm-card__msg"></div>
      <div class="kus-confirm-card__slider">
        <input type="range" min="0" max="100" value="0" class="kus-confirm-card__range" aria-label="右にスライドして確定">
        <span class="kus-confirm-card__hint">右端まで 3 秒スライドで確定</span>
      </div>
      <div class="kus-confirm-card__btns">
        <button type="button" class="btn sub kus-confirm-card__cancel">キャンセル</button>
      </div>
    </div>`;
  (overlay.querySelector('.kus-confirm-card__msg') as HTMLElement).textContent = message;
  document.body.appendChild(overlay);
  let startedAt = 0;
  const range = overlay.querySelector('.kus-confirm-card__range') as HTMLInputElement;
  range.addEventListener('input', () => {
    if (!startedAt) startedAt = Date.now();
  });
  range.addEventListener('change', () => {
    const v = Number(range.value || 0);
    const elapsed = Date.now() - startedAt;
    if (v >= 100 && elapsed >= 800) {
      overlay.remove();
      onConfirm();
    } else {
      range.value = '0';
      startedAt = 0;
      pushToast('スライダーは右端までゆっくり動かしてください', { tone: 'warn' });
    }
  });
  overlay.querySelector('.kus-confirm-card__cancel')?.addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
}

/* ============================================================
 * 32: タブバー自動格納モード
 * ============================================================ */
export function initTabBarAutoCollapse(): void {
  const root = getRoot();
  if (!root) return;
  // shortcut button in display prefs panel will toggle root.classList: kus-tabs-auto-collapse
  // Add toggle button into タブ bar (top-right)
  const tabBar = root.querySelector('.kus-tab-bar') as HTMLElement | null;
  if (!tabBar) return;
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'kus-tabbar-collapse-toggle btn sub';
  btn.title = 'タブバーをスクロール時に自動格納';
  btn.textContent = '↕ 自動格納';
  btn.addEventListener('click', () => {
    root.classList.toggle('kus-tabs-auto-collapse');
    btn.classList.toggle('is-active', root.classList.contains('kus-tabs-auto-collapse'));
    pushToast(root.classList.contains('kus-tabs-auto-collapse') ? 'タブバー自動格納: ON' : 'タブバー自動格納: OFF', { tone: 'info' });
  });
  tabBar.appendChild(btn);
  // on body scroll, if class is present, toggle compact
  const body = root.querySelector('.body') as HTMLElement | null;
  if (body) {
    let lastY = 0;
    body.addEventListener('scroll', () => {
      if (!root.classList.contains('kus-tabs-auto-collapse')) return;
      const y = body.scrollTop;
      const goingDown = y > lastY + 8;
      const goingUp = y < lastY - 8;
      if (goingDown) tabBar.classList.add('is-collapsed');
      else if (goingUp) tabBar.classList.remove('is-collapsed');
      lastY = y;
    }, { passive: true });
  }
}

/* ============================================================
 * 41: 差分上部固定サマリ
 *
 * #u_result の親に差分件数サマリを差し込む。
 * ============================================================ */
export function renderDiffFixedSummary(): void {
  const root = getRoot();
  if (!root) return;
  const host = root.querySelector('#u_result')?.parentElement as HTMLElement | null;
  if (!host) return;
  let bar = root.querySelector('#u_diffFixedSummary') as HTMLElement | null;
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'u_diffFixedSummary';
    bar.className = 'kus-diff-fixed-summary';
    host.insertBefore(bar, host.firstChild);
  }
  const rows = state.lastDiffRows || [];
  let added = 0, removed = 0, changed = 0, same = 0;
  rows.forEach((r: any) => {
    const t = String(r?.type || '').toLowerCase();
    if (t === 'added') added++;
    else if (t === 'removed') removed++;
    else if (t === 'changed') changed++;
    else if (t === 'same') same++;
  });
  if (!rows.length) {
    bar.innerHTML = '<span class="muted">差分未取得</span>';
    return;
  }
  bar.innerHTML = `
    <span class="kus-diff-fixed-summary__pill kus-diff-fixed-summary__pill--add">+ ${added}</span>
    <span class="kus-diff-fixed-summary__pill kus-diff-fixed-summary__pill--remove">- ${removed}</span>
    <span class="kus-diff-fixed-summary__pill kus-diff-fixed-summary__pill--change">~ ${changed}</span>
    <span class="kus-diff-fixed-summary__pill kus-diff-fixed-summary__pill--same">= ${same}</span>
    <span class="kus-diff-fixed-summary__total muted">合計 ${rows.length} 件</span>
  `;
}

/* ============================================================
 * 47: 検索ハイライト色選択
 * ============================================================ */
export function initHighlightColorPicker(): void {
  const root = getRoot();
  if (!root) return;
  const search = root.querySelector('#u_diffSearch') as HTMLInputElement | null;
  if (!search) return;
  const wrap = search.parentElement;
  if (!wrap) return;
  if (wrap.querySelector('.kus-highlight-picker')) return;
  const picker = document.createElement('select');
  picker.className = 'kus-highlight-picker';
  picker.title = 'ハイライト色';
  picker.innerHTML = `
    <option value="#fde68a">黄</option>
    <option value="#fbcfe8">桃</option>
    <option value="#a7f3d0">緑</option>
    <option value="#bfdbfe">青</option>
    <option value="#fcd34d">橙</option>
  `;
  picker.addEventListener('change', () => {
    G.highlightColor = picker.value;
    document.documentElement.style.setProperty('--kus-highlight', picker.value);
    pushToast(`ハイライト色を変更しました`, { tone: 'info' });
  });
  G.highlightColor = '#fde68a';
  document.documentElement.style.setProperty('--kus-highlight', '#fde68a');
  wrap.appendChild(picker);
}

/* ============================================================
 * 44: 重要度しきい値スライダー
 * ============================================================ */
export function initSeverityThreshold(): void {
  const root = getRoot();
  if (!root) return;
  const filterBlock = root.querySelector('#u_diffActiveFilters')?.parentElement as HTMLElement | null;
  if (!filterBlock) return;
  if (filterBlock.querySelector('.kus-sev-threshold')) return;
  const wrap = document.createElement('div');
  wrap.className = 'kus-sev-threshold';
  wrap.innerHTML = `
    <label class="kus-sev-threshold__lbl">重要度しきい値:</label>
    <select class="kus-sev-threshold__sel" aria-label="重要度しきい値">
      <option value="all">すべて</option>
      <option value="low">低以上</option>
      <option value="mid">中以上</option>
      <option value="high">高のみ</option>
    </select>
  `;
  filterBlock.appendChild(wrap);
  const sel = wrap.querySelector('select') as HTMLSelectElement;
  sel.addEventListener('change', () => {
    G.severityThreshold = sel.value as any;
    state.diffSeverityThreshold = sel.value;
    // delegate to filter pipeline
    const filterSev = ui.diffFilterSeverity as HTMLSelectElement | null;
    if (filterSev) {
      if (sel.value === 'high') filterSev.value = 'HIGH';
      else if (sel.value === 'mid') filterSev.value = '';
      else filterSev.value = '';
      filterSev.dispatchEvent(new Event('change', { bubbles: true }));
    }
    pushToast(`重要度しきい値: ${sel.options[sel.selectedIndex]?.text || ''}`, { tone: 'info' });
  });
}

/* ============================================================
 * 49: ワンタップ追加プリセット
 * ============================================================ */
export function initOneTapFilterPresets(): void {
  const root = getRoot();
  if (!root) return;
  const quick = root.querySelector('.diff-review-toolbar__quick') as HTMLElement | null;
  if (!quick) return;
  if (quick.querySelector('[data-onetap="acl"]')) return;
  const presets: Array<{ key: string; label: string; act: string; preset: string; tip: string }> = [
    { key: 'acl', label: '🔒 権限のみ', act: 'diffUiPreset', preset: 'sec_acl' as any, tip: '権限変更だけ表示' },
    { key: 'noAcl', label: '🚫 権限を隠す', act: 'diffUiPreset', preset: 'no_acl', tip: 'アプリ/フィールド/レコード権限を除外' },
    { key: 'fields', label: '📐 フィールドのみ', act: 'diffUiPreset', preset: 'sec_field', tip: 'フィールド設定だけ' },
    { key: 'view', label: '🪟 ビューのみ', act: 'diffUiPreset', preset: 'sec_view', tip: 'ビュー設定だけ' }
  ];
  presets.forEach((p) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn sub';
    btn.dataset.onetap = p.key;
    btn.dataset.act = p.act;
    btn.dataset.preset = p.preset;
    btn.title = p.tip;
    btn.textContent = p.label;
    quick.appendChild(btn);
  });
}

/* ============================================================
 * 51: J/K で行移動、A 承認 / R 却下
 * ============================================================ */
export function initApproveRejectKeys(): void {
  const root = getRoot();
  if (!root) return;
  root.addEventListener('keydown', (e) => {
    const editable = e.target && (
      (e.target as Element).tagName === 'INPUT'
      || (e.target as Element).tagName === 'TEXTAREA'
      || (e.target as Element).tagName === 'SELECT'
      || (e.target as HTMLElement).isContentEditable
    );
    if (editable) return;
    if (state.activeTab !== 'diff') return;
    const rows = [...root.querySelectorAll<HTMLElement>('#u_result .row[data-row-id]')];
    if (!rows.length) return;
    const focused = rows.findIndex((r) => r.classList.contains('kus-row-focused'));
    const setFocus = (idx: number) => {
      rows.forEach((r) => r.classList.remove('kus-row-focused'));
      const i = Math.max(0, Math.min(rows.length - 1, idx));
      rows[i]?.classList.add('kus-row-focused');
      rows[i]?.scrollIntoView({ block: 'nearest' });
    };
    if (e.key === 'j' || e.key === 'J') {
      e.preventDefault();
      setFocus((focused < 0 ? -1 : focused) + 1);
      return;
    }
    if (e.key === 'k' || e.key === 'K') {
      e.preventDefault();
      setFocus((focused < 0 ? rows.length : focused) - 1);
      return;
    }
    if (e.key === 'a' || e.key === 'A') {
      e.preventDefault();
      const cur = rows[focused] || null;
      const id = cur?.dataset.rowId;
      if (id) {
        state.diffViewedKeys = state.diffViewedKeys || new Set();
        state.diffViewedKeys.add(id);
        cur?.classList.add('kus-row-approved');
        cur?.classList.remove('kus-row-rejected');
        pushToast('行を承認 (✓) としました', { tone: 'ok' });
      }
      return;
    }
    if (e.key === 'r' || e.key === 'R') {
      e.preventDefault();
      const cur = rows[focused] || null;
      const id = cur?.dataset.rowId;
      if (id) {
        cur?.classList.add('kus-row-rejected');
        cur?.classList.remove('kus-row-approved');
        pushToast('行を却下 (✗) としました', { tone: 'warn' });
      }
      return;
    }
  });
}

/* ============================================================
 * 52: 差分フィルタを URL ハッシュに同期
 * ============================================================ */
export function initUrlSync(): void {
  const root = getRoot();
  if (!root) return;
  const targets = ['u_diffSearch', 'u_diffFilterSection', 'u_diffFilterType', 'u_diffFilterSeverity'];
  const writeHash = () => {
    const params = new URLSearchParams();
    targets.forEach((id) => {
      const el = root.querySelector(`#${id}`) as HTMLInputElement | HTMLSelectElement | null;
      const v = el?.value || '';
      if (v) params.set(id.replace('u_diff', '').toLowerCase(), v);
    });
    const hash = params.toString();
    try {
      const url = new URL(window.location.href);
      url.hash = hash ? `#kus-diff:${hash}` : '';
      history.replaceState(null, '', url.toString());
    } catch (e) { /* ignore */ }
  };
  targets.forEach((id) => {
    const el = root.querySelector(`#${id}`) as HTMLInputElement | HTMLSelectElement | null;
    if (!el) return;
    el.addEventListener('change', writeHash);
    el.addEventListener('input', writeHash);
  });
  // 初回読み込み
  try {
    const url = new URL(window.location.href);
    if (url.hash.startsWith('#kus-diff:')) {
      const params = new URLSearchParams(url.hash.replace('#kus-diff:', ''));
      params.forEach((v, k) => {
        const id = `u_diff${k.charAt(0).toUpperCase()}${k.slice(1)}`;
        const el = root.querySelector(`#${id}`) as HTMLInputElement | HTMLSelectElement | null;
        if (el) {
          el.value = v;
          el.dispatchEvent(new Event('change', { bubbles: true }));
        }
      });
    }
  } catch (e) { /* ignore */ }
}

/* ============================================================
 * 53: 差分結果 JSON エクスポート / インポート
 * ============================================================ */
export function exportDiffStateToJson(): void {
  const payload = {
    tool: 'kintone-unified-suite',
    type: 'diff-snapshot',
    savedAt: new Date().toISOString(),
    rows: state.lastDiffRows || [],
    fetchIssues: state.lastFetchIssues || [],
    filters: {
      section: state.diffFilterSection,
      type: state.diffFilterType,
      severity: state.diffFilterSeverity
    }
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `kus-diff-snapshot_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 200);
  pushToast('差分結果 JSON をダウンロードしました', { tone: 'ok' });
}
export function importDiffStateFromJson(file: File): Promise<void> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result || '{}'));
        if (Array.isArray(data?.rows)) {
          state.lastDiffRows = data.rows;
          state.lastFetchIssues = Array.isArray(data.fetchIssues) ? data.fetchIssues : [];
          renderDiffFixedSummary();
          pushToast(`差分スナップショットを読み込みました (${data.rows.length} 件)`, { tone: 'ok' });
          resolve();
        } else {
          reject(new Error('rows 配列が見つかりません'));
        }
      } catch (e) {
        reject(e);
      }
    };
    reader.readAsText(file);
  });
}

/* ============================================================
 * 55: 反映前チェックリストの動的調整
 * ============================================================ */
export function adaptReflectChecklist(): void {
  const root = getRoot();
  if (!root) return;
  const checklist = root.querySelector('#u_reflectApplyChecklist .reflect-apply-checklist__items') as HTMLElement | null;
  if (!checklist) return;
  // 差分が大量なら "件数を確認した" を追加。差分が無ければ "差分なしで実行することを承認"。
  const total = (state.lastDiffRows || []).length;
  const hasMany = total >= 30;
  const hasNone = total === 0;
  // 既存追加項目を一旦掃除
  checklist.querySelectorAll('[data-reflect-apply-check="bigVolume"], [data-reflect-apply-check="emptyDiff"]').forEach((el) => (el.parentElement || el).remove());
  if (hasMany) {
    const lab = document.createElement('label');
    lab.className = 'reflect-apply-check';
    lab.innerHTML = `<input type="checkbox" data-reflect-apply-check="bigVolume"> ${total} 件の差分量を確認した`;
    checklist.appendChild(lab);
  } else if (hasNone) {
    const lab = document.createElement('label');
    lab.className = 'reflect-apply-check';
    lab.innerHTML = `<input type="checkbox" data-reflect-apply-check="emptyDiff"> 差分なしの状態で反映することを承認`;
    checklist.appendChild(lab);
  }
  renderReflectApplyChecklistStatus();
}

/* ============================================================
 * 60: フィールド種別アイコン
 * ============================================================ */
const FIELD_TYPE_ICONS: Record<string, string> = {
  SINGLE_LINE_TEXT: '🅰',
  MULTI_LINE_TEXT: '¶',
  RICH_TEXT: '📝',
  NUMBER: '#',
  CALC: 'ƒ',
  RADIO_BUTTON: '◉',
  CHECK_BOX: '☑',
  MULTI_SELECT: '▤',
  DROP_DOWN: '▾',
  DATE: '📅',
  TIME: '⏰',
  DATETIME: '🕒',
  LINK: '🔗',
  FILE: '📎',
  USER_SELECT: '👤',
  ORGANIZATION_SELECT: '🏢',
  GROUP_SELECT: '👥',
  REFERENCE_TABLE: '🔄',
  LOOKUP: '🔍',
  SUBTABLE: '⊞',
  STATUS: '🚦',
  CATEGORY: '🏷',
  RECORD_NUMBER: '#'
};
export function decorateFieldTypeIcons(): void {
  const root = getRoot();
  if (!root) return;
  const cells = root.querySelectorAll<HTMLElement>('[data-field-type]');
  cells.forEach((el) => {
    if (el.querySelector('.kus-field-type-icon')) return;
    const t = String(el.dataset.fieldType || '').toUpperCase();
    const icon = FIELD_TYPE_ICONS[t];
    if (!icon) return;
    const span = document.createElement('span');
    span.className = 'kus-field-type-icon';
    span.title = t;
    span.textContent = icon;
    el.prepend(span);
  });
}

/* ============================================================
 * 65: 反映プランの Markdown 出力
 * ============================================================ */
export function exportPlanMarkdown(): void {
  const plan = state.lastApplyPlan;
  if (!plan) {
    pushToast('反映プランが未生成です。先に「実行前プラン確認」を実行してください', { tone: 'warn' });
    return;
  }
  const lines: string[] = [];
  lines.push(`# kintone 反映プラン (${new Date().toISOString()})`);
  lines.push('');
  lines.push(`- 反映先 App: \`${plan.targetAppId || '-'}\``);
  lines.push(`- セクション数: ${plan.sections?.length || 0}`);
  lines.push('');
  (plan.sections || []).forEach((s: any) => {
    lines.push(`## ${s.label || s.key}`);
    lines.push(`- endpoint: \`${s.endpoint || ''}\``);
    lines.push(`- method: \`${s.method || 'PUT'}\``);
    if (s.summary) lines.push(`- summary: ${s.summary}`);
    lines.push('');
  });
  const blob = new Blob([lines.join('\n')], { type: 'text/markdown' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `kus-apply-plan_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.md`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 200);
  pushToast('反映プラン Markdown をダウンロードしました', { tone: 'ok' });
}

/* ============================================================
 * 70: ER 図フィルタ
 * ============================================================ */
export function initErFilters(): void {
  const root = getRoot();
  if (!root) return;
  const erHost = root.querySelector('[data-pane="er"]') as HTMLElement | null;
  if (!erHost) return;
  if (erHost.querySelector('.kus-er-filter-bar')) return;
  const bar = document.createElement('div');
  bar.className = 'kus-er-filter-bar';
  bar.innerHTML = `
    <label class="chip"><input type="checkbox" data-er-filter="lookupOnly"> ルックアップのみ</label>
    <label class="chip"><input type="checkbox" data-er-filter="referenceOnly"> 関連レコードのみ</label>
    <label class="chip"><input type="checkbox" data-er-filter="hideOrphan"> 関係のないアプリを隠す</label>
  `;
  erHost.insertBefore(bar, erHost.firstChild);
  bar.addEventListener('change', () => {
    const flags = [...bar.querySelectorAll<HTMLInputElement>('[data-er-filter]')]
      .filter((el) => el.checked).map((el) => el.dataset.erFilter || '');
    erHost.dataset.erFilters = flags.join(',');
    erHost.classList.toggle('kus-er-lookup-only', flags.includes('lookupOnly'));
    erHost.classList.toggle('kus-er-ref-only', flags.includes('referenceOnly'));
    erHost.classList.toggle('kus-er-hide-orphan', flags.includes('hideOrphan'));
    pushToast(`ER 図フィルタを更新しました (${flags.length} 項目)`, { tone: 'info' });
  });
}

/* ============================================================
 * 78: SVG/PNG 出力ボタン
 * ============================================================ */
export function downloadDiagram(svg: SVGSVGElement, baseName: string, format: 'svg' | 'png'): void {
  if (format === 'svg') {
    const xml = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([xml], { type: 'image/svg+xml' });
    triggerDownload(blob, `${baseName}.svg`);
    return;
  }
  // PNG via canvas
  const xml = new XMLSerializer().serializeToString(svg);
  const img = new Image();
  const blob = new Blob([xml], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  img.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = svg.viewBox?.baseVal?.width || svg.clientWidth || 1024;
    canvas.height = svg.viewBox?.baseVal?.height || svg.clientHeight || 768;
    const ctx = canvas.getContext('2d');
    ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
    URL.revokeObjectURL(url);
    canvas.toBlob((b) => {
      if (b) triggerDownload(b, `${baseName}.png`);
    });
  };
  img.src = url;
}
function triggerDownload(blob: Blob, filename: string): void {
  const doc = getDoc();
  const a = doc.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  doc.body.appendChild(a);
  a.click();
  getWin().setTimeout(() => {
    a.remove();
    URL.revokeObjectURL(a.href);
  }, 200);
}
export function initDiagramExportButtons(): void {
  const root = getRoot();
  if (!root) return;
  ['er', 'processFlow'].forEach((paneKey) => {
    const pane = root.querySelector(`[data-pane="${paneKey}"]`) as HTMLElement | null;
    if (!pane) return;
    if (pane.querySelector('.kus-diagram-export')) return;
    const bar = document.createElement('div');
    bar.className = 'kus-diagram-export btns';
    bar.innerHTML = `
      <button type="button" class="btn sub" data-act="exportDiagramSvg" data-pane-key="${paneKey}">SVG 保存</button>
      <button type="button" class="btn sub" data-act="exportDiagramPng" data-pane-key="${paneKey}">PNG 保存</button>
    `;
    pane.insertBefore(bar, pane.firstChild);
  });
  root.addEventListener('click', (e) => {
    const target = (e.target as HTMLElement)?.closest?.('[data-act="exportDiagramSvg"], [data-act="exportDiagramPng"]') as HTMLElement | null;
    if (!target) return;
    const paneKey = target.dataset.paneKey || 'er';
    const pane = root.querySelector(`[data-pane="${paneKey}"]`);
    const svg = pane?.querySelector('svg') as SVGSVGElement | null;
    if (!svg) {
      pushToast('SVG が見つかりません。先に図を描画してください', { tone: 'warn' });
      return;
    }
    const fmt = target.dataset.act === 'exportDiagramSvg' ? 'svg' : 'png';
    downloadDiagram(svg, `kus-${paneKey}_${new Date().toISOString().slice(0, 10)}`, fmt as any);
    pushToast(`${fmt.toUpperCase()} を保存しました`, { tone: 'ok' });
  });
}

/* ============================================================
 * 80: ZIP 分割サイズ入力
 * ============================================================ */
export function initZipSplitSize(): void {
  const root = getRoot();
  if (!root) return;
  const recordPane = root.querySelector('[data-pane="recordMgr"]') as HTMLElement | null;
  if (!recordPane) return;
  if (recordPane.querySelector('.kus-zip-split')) return;
  const wrap = document.createElement('div');
  wrap.className = 'kus-zip-split';
  wrap.innerHTML = `
    <label class="kus-zip-split__lbl">添付 ZIP 分割サイズ:</label>
    <input type="number" class="kus-zip-split__input" min="0" step="50" placeholder="0=分割なし" value="0">
    <span class="muted">MB ごとに分割（0 で 1 ファイル）</span>
  `;
  recordPane.insertBefore(wrap, recordPane.firstChild);
  const input = wrap.querySelector('input') as HTMLInputElement;
  input.addEventListener('change', () => {
    state.zipSplitMb = Number(input.value || 0);
    pushToast(`ZIP 分割サイズ: ${state.zipSplitMb} MB`, { tone: 'info' });
  });
}

/* ============================================================
 * 84: レスポンス JSON のツリー / テーブル切替（簡易）
 * ============================================================ */
export function initApiResponseViewToggle(): void {
  const root = getRoot();
  if (!root) return;
  const apiPane = root.querySelector('[data-pane="apiTester"]') as HTMLElement | null;
  if (!apiPane) return;
  if (apiPane.querySelector('.kus-api-view-toggle')) return;
  const bar = document.createElement('div');
  bar.className = 'kus-api-view-toggle btns';
  bar.innerHTML = `
    <span class="muted">表示形式:</span>
    <button type="button" class="btn sub is-active" data-act="apiViewMode" data-mode="raw">Raw</button>
    <button type="button" class="btn sub" data-act="apiViewMode" data-mode="tree">Tree</button>
    <button type="button" class="btn sub" data-act="apiViewMode" data-mode="table">Table</button>
  `;
  const target = apiPane.querySelector('#u_apiTesterResponse') as HTMLElement | null
    || apiPane.querySelector('.result') as HTMLElement | null;
  if (target) target.parentElement?.insertBefore(bar, target);
  bar.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement)?.closest?.('button[data-mode]') as HTMLElement | null;
    if (!btn) return;
    bar.querySelectorAll('button').forEach((b) => b.classList.remove('is-active'));
    btn.classList.add('is-active');
    const mode = btn.dataset.mode as 'raw' | 'tree' | 'table';
    if (target) renderApiResponseAs(target, mode);
  });
}
function renderApiResponseAs(host: HTMLElement, mode: 'raw' | 'tree' | 'table'): void {
  const raw = host.dataset.kusRawJson || host.textContent || '';
  if (!host.dataset.kusRawJson && raw) host.dataset.kusRawJson = raw;
  let parsed: any;
  try { parsed = JSON.parse(raw); } catch { host.textContent = raw; return; }
  if (mode === 'raw') {
    host.innerHTML = `<pre class="kus-api-raw">${escapeHtml(JSON.stringify(parsed, null, 2))}</pre>`;
    return;
  }
  if (mode === 'tree') {
    host.innerHTML = `<div class="kus-api-tree">${renderTree(parsed)}</div>`;
    return;
  }
  if (mode === 'table') {
    host.innerHTML = `<div class="kus-api-table">${renderTable(parsed)}</div>`;
    return;
  }
}
function escapeHtml(s: string): string {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function diffLeftValue(row: any): any {
  return row?.left ?? row?.oldValue ?? null;
}

function diffRightValue(row: any): any {
  return row?.right ?? row?.newValue ?? null;
}

function diffSectionLabel(row: any): string {
  return String(row?.section || row?.sectionKey || '');
}

function renderTree(value: any, key?: string): string {
  if (value === null || typeof value !== 'object') {
    return `<div class="kus-api-tree__leaf">${key ? `<span class="kus-api-tree__key">${escapeHtml(key)}:</span>` : ''}<span class="kus-api-tree__val">${escapeHtml(JSON.stringify(value))}</span></div>`;
  }
  if (Array.isArray(value)) {
    return `<details open class="kus-api-tree__node"><summary>${escapeHtml(key || '')} <span class="muted">[${value.length}]</span></summary>${value.map((v, i) => renderTree(v, `[${i}]`)).join('')}</details>`;
  }
  const entries = Object.entries(value);
  return `<details open class="kus-api-tree__node"><summary>${escapeHtml(key || '')} <span class="muted">{${entries.length}}</span></summary>${entries.map(([k, v]) => renderTree(v, k)).join('')}</details>`;
}
function renderTable(value: any): string {
  if (Array.isArray(value) && value.length && typeof value[0] === 'object') {
    const cols = [...new Set(value.flatMap((row: any) => Object.keys(row || {})))];
    const head = `<tr>${cols.map((c) => `<th>${escapeHtml(c)}</th>`).join('')}</tr>`;
    const body = value.slice(0, 200).map((row: any) => `<tr>${cols.map((c) => `<td>${escapeHtml(JSON.stringify(row?.[c]))}</td>`).join('')}</tr>`).join('');
    return `<table class="kus-api-table__t"><thead>${head}</thead><tbody>${body}</tbody></table><div class="muted">表示は先頭 200 行まで</div>`;
  }
  return `<div class="muted">配列形式の JSON でない場合はテーブル表示できません</div>`;
}

/* ============================================================
 * 85: API テスター 環境変数置換
 * ============================================================ */
export function initApiEnvVars(): void {
  const root = getRoot();
  if (!root) return;
  const apiPane = root.querySelector('[data-pane="apiTester"]') as HTMLElement | null;
  if (!apiPane) return;
  if (apiPane.querySelector('.kus-api-envvars')) return;
  const wrap = document.createElement('details');
  wrap.className = 'kus-api-envvars';
  wrap.innerHTML = `
    <summary>環境変数（{{key}} 置換）</summary>
    <div class="kus-api-envvars__body">
      <textarea rows="3" placeholder="appId=123\nguestId=99\ntoken=xxxx" class="kus-api-envvars__ta"></textarea>
      <div class="muted">URL / ボディ内の <code>{{appId}}</code> 等を実行時に置換します（メモリ内のみ）</div>
    </div>
  `;
  apiPane.insertBefore(wrap, apiPane.firstChild);
  const ta = wrap.querySelector('textarea') as HTMLTextAreaElement;
  ta.addEventListener('input', () => {
    const map: Record<string, string> = {};
    ta.value.split('\n').forEach((line) => {
      const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*?)\s*$/);
      if (m) map[m[1]] = m[2];
    });
    state.apiEnvVars = map;
  });
}

/* ============================================================
 * 86: cURL コマンドコピー
 * ============================================================ */
export function initCurlCopy(): void {
  const root = getRoot();
  if (!root) return;
  const apiPane = root.querySelector('[data-pane="apiTester"]') as HTMLElement | null;
  if (!apiPane) return;
  if (apiPane.querySelector('[data-act="copyAsCurl"]')) return;
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'btn sub kus-curl-copy';
  btn.dataset.act = 'copyAsCurl';
  btn.textContent = '📋 cURL でコピー';
  apiPane.insertBefore(btn, apiPane.firstChild);
  btn.addEventListener('click', () => {
    const method = (apiPane.querySelector('#u_apiTesterMethod') as HTMLSelectElement | null)?.value || 'GET';
    const url = (apiPane.querySelector('#u_apiTesterUrl') as HTMLInputElement | null)?.value || '';
    const body = (apiPane.querySelector('#u_apiTesterBody') as HTMLTextAreaElement | null)?.value || '';
    const fullUrl = url.startsWith('http') ? url : `${window.location.origin}${url}`;
    const lines = [
      `curl -X ${method} '${fullUrl}'`,
      `  -H 'Content-Type: application/json'`,
      `  -H 'X-Cybozu-API-Token: <YOUR_TOKEN>'`,
    ];
    if (method !== 'GET' && body.trim()) {
      lines.push(`  --data-raw '${body.replace(/'/g, `'\\''`)}'`);
    }
    const cmd = lines.join(' \\\n');
    navigator.clipboard?.writeText(cmd).then(
      () => pushToast('cURL コマンドをクリップボードへコピーしました', { tone: 'ok' }),
      () => pushToast('クリップボードへの書き込みに失敗しました', { tone: 'error' })
    );
  });
}

/* ============================================================
 * 46: 行コピー時のフォーマット選択（簡易）
 * ============================================================ */
export function initRowCopyFormat(): void {
  const root = getRoot();
  if (!root) return;
  const toolbar = root.querySelector('.diff-review-actions') as HTMLElement | null;
  if (!toolbar) return;
  if (toolbar.querySelector('.kus-row-copy-format')) return;
  const wrap = document.createElement('div');
  wrap.className = 'kus-row-copy-format';
  wrap.innerHTML = `
    <select class="kus-row-copy-format__sel" title="クリップボードへの整形形式">
      <option value="text">テキスト</option>
      <option value="md">Markdown</option>
      <option value="csv">CSV</option>
      <option value="tsv">TSV</option>
    </select>
    <button type="button" class="btn sub" data-act="kusCopyRows">📋 行をコピー</button>
  `;
  toolbar.appendChild(wrap);
  const sel = wrap.querySelector('select') as HTMLSelectElement;
  wrap.querySelector('button')?.addEventListener('click', () => {
    const fmt = sel.value;
    const rows = state.lastDiffRows || [];
    if (!rows.length) {
      pushToast('差分が未取得です', { tone: 'warn' });
      return;
    }
    let text = '';
    const localizedRows = rows.map((r: any) => ({
      type: DIFF_TYPE_LABEL[r.type] || r.type,
      section: diffSectionLabel(r),
      path: r.path,
      oldStr: localizeKintoneEnumsInText(JSON.stringify(diffLeftValue(r))),
      newStr: localizeKintoneEnumsInText(JSON.stringify(diffRightValue(r))),
      severity: DIFF_SEVERITY_LABEL[r.severity] || r.severity
    }));
    if (fmt === 'csv' || fmt === 'tsv') {
      const sep = fmt === 'csv' ? ',' : '\t';
      const head = ['種別', 'セクション', 'パス', '旧値', '新値', '重要度'].join(sep);
      const body = localizedRows.map((r) => [r.type, r.section, r.path, r.oldStr, r.newStr, r.severity].map((c) => String(c ?? '').replace(/[\r\n]/g, ' ')).join(sep)).join('\n');
      text = `${head}\n${body}`;
    } else if (fmt === 'md') {
      text = '| 種別 | セクション | パス | 旧 | 新 | 重要度 |\n|---|---|---|---|---|---|\n' + localizedRows.map((r) => `| ${r.type} | ${r.section} | \`${r.path}\` | ${r.oldStr} | ${r.newStr} | ${r.severity} |`).join('\n');
    } else {
      text = localizedRows.map((r) => `[${r.type}] ${r.section} :: ${r.path}\n  - ${r.oldStr} → ${r.newStr}`).join('\n');
    }
    navigator.clipboard?.writeText(text).then(
      () => pushToast(`行を ${fmt.toUpperCase()} 形式でコピーしました (${rows.length} 件)`, { tone: 'ok' }),
      () => pushToast('クリップボード書き込みに失敗', { tone: 'error' })
    );
  });
}

/* ============================================================
 * 34 / 38: 共通アクション履歴 + ステータスバー Undo
 * ============================================================ */
interface UndoEntry {
  label: string;
  undo: () => void;
  ts: number;
}
const undoStack: UndoEntry[] = [];
const redoStack: UndoEntry[] = [];
const MAX_UNDO = 30;

export function pushUndoEntry(label: string, undo: () => void): void {
  undoStack.push({ label, undo, ts: Date.now() });
  if (undoStack.length > MAX_UNDO) undoStack.shift();
  // clear redo on new action
  redoStack.length = 0;
  refreshUndoUi();
}

function refreshUndoUi(): void {
  const root = getRoot();
  if (!root) return;
  const btn = root.querySelector('#u_kusUndoBtn') as HTMLButtonElement | null;
  if (btn) {
    btn.disabled = undoStack.length === 0;
    const last = undoStack[undoStack.length - 1];
    btn.title = last ? `直前の操作を取り消し: ${last.label}` : 'Undo (なし)';
    btn.textContent = `↶ 取り消し${undoStack.length ? ` (${undoStack.length})` : ''}`;
  }
  const r = root.querySelector('#u_kusRedoBtn') as HTMLButtonElement | null;
  if (r) {
    r.disabled = redoStack.length === 0;
    r.textContent = `↷ やり直し${redoStack.length ? ` (${redoStack.length})` : ''}`;
  }
}

export function performUndo(): void {
  const e = undoStack.pop();
  if (!e) {
    pushToast('取り消せる操作がありません', { tone: 'warn' });
    return;
  }
  try {
    e.undo();
    redoStack.push(e);
    if (redoStack.length > MAX_UNDO) redoStack.shift();
    pushToast(`取り消しました: ${e.label}`, { tone: 'ok' });
  } catch (err) {
    pushToast(`取り消し失敗: ${(err as any)?.message || err}`, { tone: 'error' });
  }
  refreshUndoUi();
}

export function initStatusUndo(): void {
  const root = getRoot();
  if (!root) return;
  const status = root.querySelector('.status-bar') as HTMLElement | null
    || ui.status?.parentElement as HTMLElement | null;
  if (!status) return;
  if (status.querySelector('#u_kusUndoBtn')) return;
  const btn = document.createElement('button');
  btn.id = 'u_kusUndoBtn';
  btn.type = 'button';
  btn.className = 'btn sub kus-status-undo';
  btn.textContent = '↶ 取り消し';
  btn.disabled = true;
  btn.title = 'Undo (なし)';
  btn.addEventListener('click', performUndo);
  const redoBtn = document.createElement('button');
  redoBtn.id = 'u_kusRedoBtn';
  redoBtn.type = 'button';
  redoBtn.className = 'btn sub kus-status-undo';
  redoBtn.textContent = '↷ やり直し';
  redoBtn.disabled = true;
  redoBtn.title = 'Redo (なし)';
  redoBtn.addEventListener('click', () => {
    const e = redoStack.pop();
    if (!e) return;
    try { e.undo(); undoStack.push(e); pushToast(`やり直し: ${e.label}`, { tone: 'ok' }); }
    catch (err) { pushToast(`やり直し失敗: ${(err as any)?.message || err}`, { tone: 'error' }); }
    refreshUndoUi();
  });
  status.appendChild(btn);
  status.appendChild(redoBtn);
  // Ctrl+Z / Ctrl+Shift+Z
  root.addEventListener('keydown', (e) => {
    const editable = e.target && (
      (e.target as Element).tagName === 'INPUT'
      || (e.target as Element).tagName === 'TEXTAREA'
      || (e.target as HTMLElement).isContentEditable
    );
    if (editable) return;
    if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) {
      e.preventDefault();
      if (e.shiftKey) redoBtn.click();
      else performUndo();
    }
  });
  // Auto-record: filter / select changes
  const recordOn: Array<{ sel: string; label: string }> = [
    { sel: '#u_diffFilterSection', label: 'セクションフィルタ変更' },
    { sel: '#u_diffFilterType', label: '種別フィルタ変更' },
    { sel: '#u_diffFilterSeverity', label: '重要度フィルタ変更' },
    { sel: '#u_diffSearch', label: '検索ワード変更' },
    { sel: '#u_sourceApp', label: '比較元 App ID 変更' },
    { sel: '#u_targetApp', label: '比較先 App ID 変更' }
  ];
  recordOn.forEach((r) => {
    const el = root.querySelector(r.sel) as HTMLInputElement | HTMLSelectElement | null;
    if (!el) return;
    let prev = el.value;
    el.addEventListener('change', () => {
      const before = prev;
      const after = el.value;
      if (before === after) return;
      pushUndoEntry(`${r.label} (${before || '(空)'} → ${after || '(空)'})`, () => {
        el.value = before;
        el.dispatchEvent(new Event('change', { bubbles: true }));
      });
      prev = after;
    });
  });
  // Auto-record: scope checkbox changes
  root.querySelectorAll<HTMLInputElement>('input[type="checkbox"][data-scope-key]').forEach((cb) => {
    let prev = cb.checked;
    cb.addEventListener('change', () => {
      const before = prev;
      const after = cb.checked;
      pushUndoEntry(`スコープ ${cb.dataset.scopeKey} を ${after ? '選択' : '解除'}`, () => {
        cb.checked = before;
        cb.dispatchEvent(new Event('change', { bubbles: true }));
      });
      prev = after;
    });
  });
}

/* ============================================================
 * 40: オフライン自動リトライ（指数バックオフ + 最大 5 回）
 * ============================================================ */
export function initOfflineRetry(): void {
  const win = getWin() as any;
  if (win.__kus_offline_hook__) return;
  win.__kus_offline_hook__ = true;
  const pending: Array<() => void> = [];
  win.addEventListener('online', () => {
    pushToast(`オンライン復帰: 待機中 ${pending.length} 件を再送します`, { tone: 'ok' });
    while (pending.length) {
      const fn = pending.shift();
      try { fn?.(); } catch (e) { /* ignore */ }
    }
  });
  win.addEventListener('offline', () => {
    pushToast('オフラインです。通信は復帰後に自動再送します。', { tone: 'warn', ttl: 6000 });
  });
  if (win.__kus_fetch_wrapped__) return;
  win.__kus_fetch_wrapped__ = true;
  const origFetch = win.fetch.bind(win);
  const RETRYABLE = (err: any) => !!err && (err.name === 'TypeError' || /network|failed to fetch/i.test(String(err?.message || '')));
  win.fetch = async function (input: any, init?: any) {
    let lastErr: any;
    const url = typeof input === 'string' ? input : (input?.url || '');
    const isInternal = !url || url.startsWith('/') || url.startsWith(win.location.origin);
    const maxAttempts = isInternal ? 5 : 2;
    for (let i = 0; i < maxAttempts; i++) {
      try {
        if (!win.navigator.onLine) {
          await new Promise<void>((resolve) => pending.push(resolve));
        }
        const res = await origFetch(input, init);
        if (res.status >= 500 && i < maxAttempts - 1) {
          await sleep(Math.min(8000, 200 * Math.pow(2, i)));
          continue;
        }
        return res;
      } catch (err) {
        lastErr = err;
        if (i >= maxAttempts - 1 || !RETRYABLE(err)) throw err;
        const backoff = Math.min(8000, 200 * Math.pow(2, i)) + Math.floor(Math.random() * 200);
        pushToast(`通信失敗。${Math.round(backoff)}ms 後に再試行 (${i + 2}/${maxAttempts})`, { tone: 'warn', ttl: 2000 });
        await sleep(backoff);
      }
    }
    throw lastErr;
  };
}
function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/* ============================================================
 * 42: 右ペイン JSON 差分（差分行クリックで開く）
 * ============================================================ */
export function initRightPaneJsonDiff(): void {
  const root = getRoot();
  if (!root) return;
  // Insert side panel
  const result = root.querySelector('#u_result') as HTMLElement | null;
  if (!result) return;
  const wrap = result.parentElement;
  if (!wrap || wrap.classList.contains('kus-diff-with-side')) {
    /* already wrapped */ return;
  }
  wrap.classList.add('kus-diff-with-side');
  const side = root.ownerDocument.createElement('aside');
  side.id = 'u_diffJsonSidePanel';
  side.className = 'kus-diff-side';
  side.innerHTML = `
    <header class="kus-diff-side__head">
      <span class="kus-diff-side__title">JSON 差分プレビュー</span>
      <button type="button" class="btn sub kus-diff-side__close" aria-label="閉じる">×</button>
    </header>
    <div class="kus-diff-side__body">
      <div class="kus-diff-side__hint muted">差分行をクリックすると、ここに旧/新の JSON が並びます。</div>
    </div>
  `;
  wrap.appendChild(side);
  side.querySelector('.kus-diff-side__close')?.addEventListener('click', () => side.classList.remove('is-open'));
  result.addEventListener('click', (e) => {
    const row = (e.target as HTMLElement)?.closest?.('[data-diff-row-tr], .row[data-row-id]') as HTMLElement | null;
    if (!row) return;
    const id = row.getAttribute('data-diff-row-tr') || row.dataset.rowId || '';
    const r = (state.lastDiffRows || []).find((x: any) => String(x._id || x.id) === String(id) || String(x.path) === String(id));
    if (!r) return;
    renderJsonDiffSide(r);
    side.classList.add('is-open');
  });
}
function renderJsonDiffSide(row: any): void {
  const body = getDoc().querySelector('#u_diffJsonSidePanel .kus-diff-side__body') as HTMLElement | null;
  if (!body) return;
  const old = JSON.stringify(diffLeftValue(row), null, 2);
  const nu = JSON.stringify(diffRightValue(row), null, 2);
  body.innerHTML = `
    <div class="kus-diff-side__meta">
      <span class="muted">${escapeHtml(diffSectionLabel(row))} :: ${escapeHtml(String(row?.path || ''))}</span>
      <span class="muted">type=${escapeHtml(String(row?.type || ''))} severity=${escapeHtml(String(row?.severity || ''))}</span>
    </div>
    <div class="kus-diff-side__cols">
      <div class="kus-diff-side__col">
        <div class="kus-diff-side__col-h">旧（比較元）</div>
        <pre>${escapeHtml(old)}</pre>
      </div>
      <div class="kus-diff-side__col">
        <div class="kus-diff-side__col-h">新（比較先）</div>
        <pre>${escapeHtml(nu)}</pre>
      </div>
    </div>
  `;
}

/* ============================================================
 * 43: インラインメモ（メモリ内）
 * ============================================================ */
const inlineNotes: Record<string, string> = {};
export function initInlineMemo(): void {
  const root = getRoot();
  if (!root) return;
  if (root.dataset.kusInlineMemoBound === '1') return;
  root.dataset.kusInlineMemoBound = '1';
  // Add a small note button per diff row via delegation
  root.addEventListener('click', (e) => {
    const target = (e.target as HTMLElement)?.closest?.('.kus-row-memo-btn') as HTMLElement | null;
    if (!target) return;
    e.stopPropagation();
    const row = target.closest('[data-diff-row-tr], .row[data-row-id]') as HTMLElement | null;
    if (!row) return;
    const id = row.getAttribute('data-diff-row-tr') || row.dataset.rowId || '';
    const cur = inlineNotes[id] || '';
    const next = getWin().prompt(`メモを追加（${id}）`, cur);
    if (next === null) return;
    if (next.trim()) {
      inlineNotes[id] = next;
      target.dataset.hasNote = '1';
      target.title = `メモ: ${next}`;
      pushToast('メモを保存しました（メモリ内のみ）', { tone: 'ok' });
    } else {
      delete inlineNotes[id];
      target.dataset.hasNote = '';
      target.title = 'メモを追加';
      pushToast('メモを削除しました', { tone: 'info' });
    }
  });
  // Decorate rows on render
  bindToolDocumentEvent('inlineMemo', 'kus:diffRendered', () => {
    const currentRoot = getRoot();
    if (!currentRoot) return;
    const rows = currentRoot.querySelectorAll<HTMLElement>('#u_result [data-diff-row-tr], #u_result .row[data-row-id]');
    rows.forEach((r) => {
      if (r.querySelector('.kus-row-memo-btn')) return;
      const btn = r.ownerDocument.createElement('button');
      btn.type = 'button';
      btn.className = 'kus-row-memo-btn';
      btn.title = 'メモを追加';
      btn.textContent = '🗒';
      const id = r.getAttribute('data-diff-row-tr') || r.dataset.rowId || '';
      btn.dataset.hasNote = inlineNotes[id] ? '1' : '';
      r.appendChild(btn);
    });
  });
}
export function getInlineNotes(): Record<string, string> { return { ...inlineNotes }; }

/* ============================================================
 * 63: 失敗箇所のみ再送（差し込み口）
 * ============================================================ */
export function initRetryFailedSectionsButton(): void {
  const root = getRoot();
  if (!root) return;
  const reportHost = root.querySelector('#u_reflectApplyReport')?.parentElement as HTMLElement | null;
  if (!reportHost) return;
  if (reportHost.querySelector('.kus-retry-failed')) return;
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'btn sub kus-retry-failed';
  btn.textContent = '↻ 失敗セクションのみ再送';
  btn.title = '直近の反映で失敗したセクションのみを再実行します';
  btn.addEventListener('click', () => {
    const report = state.lastApplyReport;
    if (!report || !Array.isArray(report.sections)) {
      pushToast('再送対象が見つかりません（直近の反映結果が必要）', { tone: 'warn' });
      return;
    }
    const failed = report.sections.filter((s: any) => s.error || s.status === 'error');
    if (!failed.length) {
      pushToast('失敗したセクションはありません', { tone: 'info' });
      return;
    }
    state.kusRetryFailedKeys = failed.map((s: any) => s.key);
    pushToast(`${failed.length} セクションを再送候補にマークしました。「プレビューへ反映」を再実行してください`, { tone: 'info', ttl: 5000 });
    // Trigger an existing retry handler if available
    const reapply = root.querySelector('[data-act="retryFailedSections"]') as HTMLElement | null;
    if (reapply) reapply.click();
  });
  reportHost.appendChild(btn);
}

/* ============================================================
 * 64: 世代付きファイルバックアップ（自動連番付き DL）
 * ============================================================ */
const generationCounters: Record<string, number> = {};
export function downloadWithGeneration(blob: Blob, baseName: string): void {
  const slot = baseName;
  const cur = (generationCounters[slot] || 0) + 1;
  generationCounters[slot] = cur;
  const ts = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
  const filename = `${baseName}_gen${String(cur).padStart(3, '0')}_${ts}.json`;
  triggerDownload(blob, filename);
  pushToast(`バックアップを保存しました: ${filename}`, { tone: 'ok' });
}
export function initGenerationalBackupHook(): void {
  // Override existing backup buttons to use generation
  const root = getRoot();
  if (!root) return;
  root.addEventListener('click', (e) => {
    const t = (e.target as HTMLElement)?.closest?.('[data-act="kusGenBackupTarget"]') as HTMLElement | null;
    if (!t) return;
    const payload = state.lastTargetBundle || state.lastPreviewBackupPayload;
    if (!payload) {
      pushToast('バックアップ対象がありません（先に比較先を取得してください）', { tone: 'warn' });
      return;
    }
    downloadWithGeneration(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }), 'kus-target-backup');
  });
}

/* ============================================================
 * 71: ER レイアウト切替（簡易：force / tree / grid を CSS クラスで切替）
 * ============================================================ */
export function initErLayoutSwitch(): void {
  const root = getRoot();
  if (!root) return;
  const erHost = root.querySelector('[data-pane="er"]') as HTMLElement | null;
  if (!erHost) return;
  if (erHost.querySelector('.kus-er-layout-switch')) return;
  const sw = document.createElement('div');
  sw.className = 'kus-er-layout-switch btns';
  sw.innerHTML = `
    <span class="muted">レイアウト:</span>
    <button type="button" class="btn sub is-active" data-layout="force">Force</button>
    <button type="button" class="btn sub" data-layout="tree">Tree</button>
    <button type="button" class="btn sub" data-layout="grid">Grid</button>
  `;
  erHost.insertBefore(sw, erHost.firstChild);
  sw.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement)?.closest?.('button[data-layout]') as HTMLElement | null;
    if (!btn) return;
    sw.querySelectorAll('button').forEach((b) => b.classList.remove('is-active'));
    btn.classList.add('is-active');
    const layout = btn.dataset.layout || 'force';
    erHost.classList.remove('kus-er-layout-force', 'kus-er-layout-tree', 'kus-er-layout-grid');
    erHost.classList.add(`kus-er-layout-${layout}`);
    pushToast(`ER レイアウト: ${layout}`, { tone: 'info' });
  });
}

/* ============================================================
 * 72: ER ノード ダブルクリック → kintone 設定画面
 * ============================================================ */
export function initErDoubleClickNav(): void {
  const root = getRoot();
  if (!root) return;
  const erHost = root.querySelector('[data-pane="er"]') as HTMLElement | null;
  if (!erHost) return;
  erHost.addEventListener('dblclick', (e) => {
    const node = (e.target as HTMLElement)?.closest?.('[data-app-id]') as HTMLElement | null;
    if (!node) return;
    const appId = node.dataset.appId;
    if (!appId) return;
    const url = `${window.location.origin}/k/admin/app/flow?app=${encodeURIComponent(appId)}`;
    pushToast(`App ${appId} の設定画面を開きます`, { tone: 'info' });
    window.open(url, '_blank', 'noopener');
  });
}

/* ============================================================
 * 73: プロセス図注釈
 * ============================================================ */
const processAnnotations: Record<string, string> = {};
export function initProcessAnnotations(): void {
  const root = getRoot();
  if (!root) return;
  const pPane = root.querySelector('[data-pane="processFlow"]') as HTMLElement | null;
  if (!pPane) return;
  pPane.addEventListener('click', (e) => {
    const node = (e.target as HTMLElement)?.closest?.('[data-process-state]') as HTMLElement | null;
    if (!node) return;
    if (!(e.altKey || e.metaKey)) return;
    const id = node.dataset.processState || '';
    const cur = processAnnotations[id] || '';
    const next = window.prompt(`状態 ${id} の注釈`, cur);
    if (next === null) return;
    if (next.trim()) processAnnotations[id] = next;
    else delete processAnnotations[id];
    node.dataset.kusAnnotation = next || '';
    pushToast('注釈を更新しました（出力に反映）', { tone: 'ok' });
  });
}
export function getProcessAnnotations(): Record<string, string> { return { ...processAnnotations }; }

/* ============================================================
 * 81: 更新前後の件数差分
 * ============================================================ */
export function initRecordUpdateCountDelta(): void {
  const root = getRoot();
  if (!root) return;
  const recordPane = root.querySelector('[data-pane="recordMgr"]') as HTMLElement | null;
  if (!recordPane) return;
  if (recordPane.querySelector('.kus-record-delta')) return;
  const bar = document.createElement('div');
  bar.className = 'kus-record-delta';
  bar.innerHTML = `
    <span class="kus-record-delta__lbl">更新前後の件数差:</span>
    <input type="number" class="kus-record-delta__before" placeholder="更新前 件数" style="width:90px">
    <span>→</span>
    <input type="number" class="kus-record-delta__after" placeholder="更新後 件数" style="width:90px">
    <span class="kus-record-delta__result muted">差分: -</span>
  `;
  recordPane.insertBefore(bar, recordPane.firstChild);
  const before = bar.querySelector('.kus-record-delta__before') as HTMLInputElement;
  const after = bar.querySelector('.kus-record-delta__after') as HTMLInputElement;
  const result = bar.querySelector('.kus-record-delta__result') as HTMLElement;
  const update = () => {
    const a = Number(before.value || 0);
    const b = Number(after.value || 0);
    const d = b - a;
    const sign = d > 0 ? '+' : '';
    result.textContent = `差分: ${sign}${d} 件 (${a} → ${b})`;
    result.classList.toggle('is-positive', d > 0);
    result.classList.toggle('is-negative', d < 0);
  };
  before.addEventListener('input', update);
  after.addEventListener('input', update);
}

/* ============================================================
 * 83: API テスター コレクション JSON
 * ============================================================ */
const apiCollection: Array<{ name: string; method: string; url: string; body?: string }> = [];
export function initApiCollection(): void {
  const root = getRoot();
  if (!root) return;
  const apiPane = root.querySelector('[data-pane="apiTester"]') as HTMLElement | null;
  if (!apiPane) return;
  if (apiPane.querySelector('.kus-api-collection')) return;
  const wrap = document.createElement('div');
  wrap.className = 'kus-api-collection btns';
  wrap.innerHTML = `
    <input type="text" class="kus-api-collection__name" placeholder="名前を付けて保存" style="max-width:200px">
    <button type="button" class="btn sub" data-act="kusApiCollSave">＋ コレクションへ追加</button>
    <button type="button" class="btn sub" data-act="kusApiCollExport">📤 JSON エクスポート</button>
    <button type="button" class="btn sub" data-act="kusApiCollImport">📂 JSON インポート</button>
    <select class="kus-api-collection__sel"><option value="">— 保存済み（メモリ内）—</option></select>
  `;
  apiPane.insertBefore(wrap, apiPane.firstChild);
  const nameInput = wrap.querySelector('.kus-api-collection__name') as HTMLInputElement;
  const sel = wrap.querySelector('.kus-api-collection__sel') as HTMLSelectElement;
  const refreshSel = () => {
    sel.innerHTML = '<option value="">— 保存済み（メモリ内）—</option>'
      + apiCollection.map((c, i) => `<option value="${i}">${c.method} ${c.name}</option>`).join('');
  };
  refreshSel();
  wrap.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement)?.closest?.('button[data-act]') as HTMLElement | null;
    if (!btn) return;
    const act = btn.dataset.act;
    const method = (apiPane.querySelector('#u_apiTesterMethod') as HTMLSelectElement | null)?.value || 'GET';
    const url = (apiPane.querySelector('#u_apiTesterUrl') as HTMLInputElement | null)?.value || '';
    const body = (apiPane.querySelector('#u_apiTesterBody') as HTMLTextAreaElement | null)?.value || '';
    if (act === 'kusApiCollSave') {
      const name = nameInput.value.trim() || `${method} ${url}`.slice(0, 60);
      apiCollection.push({ name, method, url, body });
      refreshSel();
      pushToast(`コレクションへ追加: ${name}`, { tone: 'ok' });
    } else if (act === 'kusApiCollExport') {
      const blob = new Blob([JSON.stringify(apiCollection, null, 2)], { type: 'application/json' });
      triggerDownload(blob, `kus-api-collection_${new Date().toISOString().slice(0, 10)}.json`);
      pushToast('コレクション JSON を保存しました', { tone: 'ok' });
    } else if (act === 'kusApiCollImport') {
      const inp = document.createElement('input');
      inp.type = 'file';
      inp.accept = 'application/json';
      inp.onchange = () => {
        const f = inp.files?.[0];
        if (!f) return;
        f.text().then((txt) => {
          try {
            const arr = JSON.parse(txt);
            if (Array.isArray(arr)) {
              apiCollection.length = 0;
              arr.forEach((it) => apiCollection.push(it));
              refreshSel();
              pushToast(`コレクションを読込しました (${arr.length} 件)`, { tone: 'ok' });
            }
          } catch (err) {
            pushToast(`読込失敗: ${(err as any)?.message || err}`, { tone: 'error' });
          }
        });
      };
      inp.click();
    }
  });
  sel.addEventListener('change', () => {
    const idx = Number(sel.value || -1);
    if (idx < 0 || !apiCollection[idx]) return;
    const it = apiCollection[idx];
    const m = (apiPane.querySelector('#u_apiTesterMethod') as HTMLSelectElement | null);
    const u = (apiPane.querySelector('#u_apiTesterUrl') as HTMLInputElement | null);
    const b = (apiPane.querySelector('#u_apiTesterBody') as HTMLTextAreaElement | null);
    if (m) m.value = it.method;
    if (u) u.value = it.url;
    if (b) b.value = it.body || '';
    pushToast(`コレクションを反映: ${it.name}`, { tone: 'ok' });
  });
}

/* ============================================================
 * 91: i18n（EN/JA）— 200 語以上をカバー
 * ============================================================ */
const i18nMap: Record<string, Record<string, string>> = {
  en: {
    // Core nav
    'kintone 統合変更ツール': 'kintone Unified Suite',
    '比較元アプリID': 'Source App ID', '比較先アプリID': 'Target App ID',
    '比較元 ゲストID': 'Source Guest ID', '比較先 ゲストID': 'Target Guest ID',
    '差分比較': 'Compare Diff', 'プレビュー反映': 'Apply to Preview',
    'フィールド追加': 'Add Field', 'JS/CSS設定': 'JS/CSS Settings',
    'ER図': 'ER Diagram', '設計書': 'Design Doc',
    '設定一括取得': 'Bulk Settings Export', 'プロセス図': 'Process Flow',
    'レコード管理': 'Record Manager', 'APIテスター': 'API Tester', '分析': 'Analyze',
    'ホーム': 'Home', '機能': 'Feature', '操作ガイド': 'Guide',
    '表示': 'Display', '標準': 'Default', '大': 'Large', 'ワイド': 'Wide', '最大': 'Max',
    '閉じる': 'Close', '戻る': 'Back', '開く': 'Open',
    // Connection
    '接続設定': 'Connection', '未入力': 'Not set',
    '比較元=現在アプリ': 'Source = Current', '両方=現在アプリ': 'Both = Current',
    '比較先←比較元': 'Target ← Source', '比較元/比較先入替': 'Swap Source/Target',
    '必須': 'Required', '差分比較時': 'For Diff', '動作対象': 'Operation target',
    'プリセット': 'Preset', '読み込み': 'Load',
    'プリセット名（任意）': 'Preset name (optional)', '現在の接続を保存': 'Save current connection',
    'アプリID検索・入力支援': 'App ID search', 'ルックアップ参照先アプリID変換（任意）': 'Lookup target app ID mapping (optional)',
    // Tabs
    '変更・反映': 'Change & Apply', '可視化・出力': 'Visualize & Export', 'データ・保守': 'Data & Maintenance',
    '履歴・復元': 'History & Restore', 'その他': 'More',
    // Diff
    '差分': 'Diff', '差分一覧': 'Diff list', '差分なし': 'No diff', '取得失敗': 'Fetch failed',
    '追加': 'Added', '削除': 'Delete / Removed', '変更': 'Changed', '同一': 'Same',
    '重要度': 'Severity', '高': 'High', '中': 'Medium', '低': 'Low',
    '高のみ': 'High only', '高以上': 'High+', '中以上': 'Medium+', '低以上': 'Low+', 'すべて': 'All',
    'クリア': 'Clear', 'フィルタ': 'Filter', '検索': 'Search', '絞り込み': 'Refine',
    '全展開': 'Expand all', '全折りたたみ': 'Collapse all',
    '結果をコピー': 'Copy result', '行をコピー': 'Copy rows', 'テキスト': 'Text',
    // Reflect
    '反映': 'Apply', '反映先': 'Target', '状態': 'Status', '安全設定': 'Safety',
    'バックアップ自動保存': 'Auto-backup', 'エラー時中断': 'Stop on error',
    '反映前チェック': 'Pre-apply check', '差分比較済み': 'Diff compared',
    '実行前プラン確認済み': 'Plan reviewed', '反映先は比較先プレビュー': 'Target = Preview',
    '反映する内容を決める': 'Choose what to apply', '標準ルート': 'Standard route',
    '詳細ルート': 'Detail route', '実行前プラン確認': 'Review plan',
    'プレビューへ反映': 'Apply to preview', '本番反映': 'Production deploy',
    '直近の反映結果': 'Last apply result', '反映履歴': 'Apply history',
    'バックアップ・復元・ドライラン': 'Backup / Restore / Dry-run',
    // Display prefs
    'テーマ': 'Theme', 'ライト': 'Light', 'ダーク': 'Dark', '高コントラスト': 'High contrast',
    'フォントサイズ': 'Font size', '小': 'Small',
    '差分カラーパレット': 'Diff palette', '色覚対応': 'Color-blind safe',
    'フォーカスリング': 'Focus ring', '強調': 'Strong',
    'ダイアログ位置': 'Dialog position', '左': 'Left', '中央': 'Center', '右': 'Right',
    '説明文の詳細度': 'Description verbosity', '簡潔': 'Brief',
    '言語': 'Language', '日本語': '日本語', 'English': 'English',
    '既定に戻す': 'Reset to default',
    '設定はセッション内のみ（タブを閉じるとリセット）': 'Settings are session-only (lost on tab close)',
    // Toolbar
    '実行': 'Run', '取得': 'Fetch', '読込': 'Load',
    'JSON': 'JSON', 'HTML': 'HTML', 'パッチ': 'Patch',
    '出力': 'Export', '詳細': 'Details', '読込解除': 'Unload',
    // Status
    '待機中': 'Idle', '実行中…': 'Running...', '実行中': 'Running', '取り消し': 'Undo',
    'メモを追加': 'Add memo', 'メモを保存しました（メモリ内のみ）': 'Memo saved (in memory only)',
    'メモを削除しました': 'Memo deleted',
    // Wizard / overlays / breadcrumbs
    '変更作業ウィザード': 'Change & Apply Wizard',
    '可視化作業ウィザード': 'Visualize & Export Wizard',
    'データ作業ウィザード': 'Data & Maintenance Wizard',
    '履歴作業ウィザード': 'History & Restore Wizard',
    '作業ウィザード': 'Wizard',
    '接続確認': 'Connection check', '設定差分を取得': 'Fetch settings diff', 'プラン確認': 'Plan review',
    '記録出力': 'Save records', 'レコード差分': 'Record diff',
    '初回推奨': 'Recommended first', '要確認': 'Review required', '要注意': 'Caution',
    'おすすめ': 'Recommended',
    // Onboarding / hints
    '使う機能のカードを押してください。進め方は右上の操作ガイドから。': 'Pick a feature card to start. See top-right Guide for steps.',
    'ホーム / 機能': 'Home / Feature',
    '機能を検索 (例: 差分 / レコード / 設計書)': 'Search features (e.g. diff / record / design)',
    '🔍 機能を検索  (例: 差分 / レコード / 設計書)': '🔍 Search features  (e.g. diff / record / design)',
    '機能を検索': 'Search features',
    // Common placeholders
    '空欄で通常スペース': 'Leave blank for normal space',
    '空で通常空間': 'Empty = normal space',
    'アプリ名 / アプリID / URL': 'App name / App ID / URL',
    '検索用ゲストID（任意）': 'Search guest ID (optional)',
    'キー名 / *At / a.b.c のパス': 'Key name / *At / a.b.c path',
    'パス/値で検索（Ctrl+F）': 'Search by path/value (Ctrl+F)',
    'テーブル名 / コードで絞り込み': 'Filter by table name / code',
    'パス / セクション名 / 理由 / 影響 で絞り込み': 'Filter by path / section / reason / impact',
    'コード/ラベルで検索...': 'Search by code/label...',
    'アプリ名で検索': 'Search by app name',
    '🔍 セクション名で絞り込み': '🔍 Filter by section name',
    '名前を付けて保存': 'Save as',
    '表紙タイトル': 'Cover title', '作成者': 'Author',
    '更新前 件数': 'Pre-update count', '更新後 件数': 'Post-update count',
    '0=分割なし': '0 = no split', '0で無制限': '0 = unlimited', '0でOFF': '0 = OFF',
    '一覧を選択 (APIから取得)': 'Pick from list (loaded via API)',
    '空ならレコード番号': 'Empty = record number',
    'ログイン名': 'Login name',
    '(ここに生成された where 句が表示されます)': '(Generated WHERE clause will appear here)',
    // Connection wizard hints
    '入力済み': 'Filled', '未設定': 'Not configured', '接続OK': 'Connection OK',
    'アプリのIDをテストID': 'Test App ID for app',
    '設定差分を確認': 'Confirm settings diff',
    '反映内容を確認': 'Review apply content',
    '差分付き保存': 'Save with diff',
    '設計書 / 差分資料': 'Design doc / diff document',
    // Feature card descriptions (full sentences from launcher)
    '2アプリの設定差分を確認します。': 'Compare settings between 2 apps.',
    '差分を見ながら比較先プレビューへ反映します。': 'Apply to target preview while reviewing diff.',
    'フィールド定義の追加・編集とコード変換用JSONの作成を行います。': 'Add / edit field definitions and build JSON for code conversion.',
    '単一アプリの customize.json 編集と JS/CSS 実ファイル取得を行います。': 'Edit a single app\'s customize.json and download JS / CSS files.',
    '設計書や差分レポートを出力します。': 'Export design docs and diff reports.',
    '複数アプリの設定JSONをまとめて保存します（データ・添付は除く）。': 'Save settings JSON for multiple apps at once (excludes records / attachments).',
    '関連アプリの構造を ER 図で確認します。': 'Inspect related-app structure via an ER diagram.',
    '影響分析、依存グラフ、通知/権限、レイアウト確認を集約しています。': 'Aggregates impact analysis, dependency graph, notifications/permissions, and layout review.',
    'プロセス管理をフロー図で確認します。': 'Review process management as a flow diagram.',
    'レコードデータのCSV・添付・コメント・状態更新を扱います。': 'Handle records: CSV, attachments, comments, status updates.',
    'REST APIを直接試します。': 'Try the REST API directly.',
    // Diff result toolbar
    '表示中を選択': 'Select displayed', '全選択': 'Select all', '全解除': 'Deselect all',
    '差分結果': 'Diff result', '差分セクション': 'Diff sections',
    '反映プラン': 'Apply plan', '反映プラン MD 保存': 'Save Apply Plan MD',
    'スナップショット': 'Snapshot', 'API差分プレビュー': 'API diff preview',
    'ドライラン重ね差分': 'Dry-run overlay diff', '状態スナップショット': 'State snapshot',
    '差分スナップショット保存': 'Save diff snapshot', 'スナップショット読込': 'Load snapshot',
    '差分 MD': 'Diff MD', '差分 CSV': 'Diff CSV', '差分 PDF': 'Diff PDF',
    '差分 PDF（表紙付き）': 'Diff PDF (with cover)',
    'ヘッダーを開く': 'Expand header', 'ヘッダーを折りたたむ': 'Collapse header',
    // Patch JSON modal
    '本番に入れる差分だけをJSONで受け渡し': 'Hand off only the diffs you want to deploy as JSON',
    'JSON ルート（部分反映）': 'JSON route (partial apply)',
    'JSONエクスポート': 'Export JSON', 'JSONファイル読込': 'Load JSON file',
    '差分比較結果を全件取込': 'Import all diff results',
    '選択中の差分だけ取込': 'Import only selected diffs',
    'コピー': 'Copy', '取込': 'Import', '出す': 'Output', '選ぶ': 'Pick',
    'この内容で反映': 'Apply this content',
    // Reflect statuses & severity
    '危険': 'Danger', '安全': 'Safe', '注意': 'Caution', '成功': 'Success', '失敗': 'Failed',
    '完了': 'Completed', '中断': 'Aborted', 'スキップ': 'Skipped',
    // Misc text fragments seen in UI
    '今のアプリ': 'Current app', '同一接続': 'Same connection',
    'ヘッダーの表示メニュー': 'Header display menu',
    '比較元': 'Source', '比較先': 'Target',
    '接続checkから記録Exportまで順番に進めます。': 'Step through from Connection check to Save records.',
    '接続確認から記録出力まで順番に進めます。': 'Step through from Connection check to Save records.',
    '接続check': 'Connection check', '記録Export': 'Save records'
  }
};
let currentLang: 'ja' | 'en' = 'ja';
export function initI18nSwitch(): void {
  const root = getRoot();
  if (!root) return;
  const prefsPanel = root.querySelector('.kus-display-prefs__panel') as HTMLElement | null;
  if (!prefsPanel) return;
  if (prefsPanel.querySelector('[data-i18n-group]')) return;
  const group = document.createElement('div');
  group.className = 'kus-display-prefs__group';
  group.dataset.i18nGroup = '1';
  group.innerHTML = `
    <div class="kus-display-prefs__title">言語</div>
    <div class="kus-display-prefs__row">
      <button type="button" class="btn sub" data-act="setI18n" data-lang="ja">日本語</button>
      <button type="button" class="btn sub" data-act="setI18n" data-lang="en">English</button>
    </div>
  `;
  prefsPanel.appendChild(group);
  group.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement)?.closest?.('button[data-lang]') as HTMLElement | null;
    if (!btn) return;
    applyI18n(btn.dataset.lang || 'ja');
  });
}
function applyI18n(lang: string): void {
  const root = getRoot();
  if (!root) return;
  const map = i18nMap[lang] || {};
  if (!(root as any).__kus_i18n_orig__) {
    (root as any).__kus_i18n_orig__ = { textNodes: new Map<Node, string>(), attrs: new Map<Element, Map<string, string>>() };
  }
  const orig = (root as any).__kus_i18n_orig__;
  // 1) Text nodes
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) => {
      const p = n.parentElement;
      if (!p) return NodeFilter.FILTER_REJECT;
      if (['SCRIPT', 'STYLE', 'CODE', 'PRE'].includes(p.tagName)) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    }
  });
  let node: Node | null;
  // Sort keys longest first to avoid partial replacement collisions
  const keys = Object.keys(map).sort((a, b) => b.length - a.length);
  while ((node = walker.nextNode())) {
    if (!orig.textNodes.has(node)) orig.textNodes.set(node, node.nodeValue || '');
    const src = orig.textNodes.get(node) || '';
    if (lang === 'ja') {
      node.nodeValue = src;
    } else {
      let t = src;
      keys.forEach((k) => { if (t.indexOf(k) >= 0) t = t.split(k).join(map[k]); });
      node.nodeValue = t;
    }
  }
  // 2) Translatable attributes
  const ATTRS = ['title', 'placeholder', 'aria-label', 'value'];
  root.querySelectorAll<HTMLElement>('*').forEach((el) => {
    let bag = orig.attrs.get(el);
    if (!bag) { bag = new Map<string, string>(); orig.attrs.set(el, bag); }
    ATTRS.forEach((a) => {
      // Only translate value on buttons/labels-like inputs to avoid breaking text inputs
      if (a === 'value' && !(el.tagName === 'BUTTON' || (el as HTMLInputElement).type === 'submit' || (el as HTMLInputElement).type === 'button')) return;
      const cur = el.getAttribute(a);
      if (cur == null) return;
      if (!bag!.has(a)) bag!.set(a, cur);
      const src = bag!.get(a) || '';
      if (lang === 'ja') {
        el.setAttribute(a, src);
      } else {
        let t = src;
        keys.forEach((k) => { if (t.indexOf(k) >= 0) t = t.split(k).join(map[k]); });
        el.setAttribute(a, t);
      }
    });
  });
  currentLang = lang as any;
  state.kusLang = lang;
  pushToast(`Language: ${lang.toUpperCase()}`, { tone: 'info' });
}

/* ============================================================
 * 45: 差分結果の Excel/MD/PDF 出力（PDF はブラウザ印刷ダイアログ経由）
 * ============================================================ */
// 差分行の type / severity を日本語化するための補助マップ。
// kintone API ENUM 値（CREATOR / BAR / STACKED 等）の置換は ../kintone-enums.ts に集約。
const DIFF_TYPE_LABEL: Record<string, string> = { added: '追加', removed: '削除', changed: '変更', moved: '移動', same: '同一' };
const DIFF_SEVERITY_LABEL: Record<string, string> = { high: '高', mid: '中', low: '低', info: '情報' };

const localizeKintoneEnumsInText = kusEnumsLocalize;

function escapeMarkdownTableCell(value: string): string {
  return String(value ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/\|/g, '\\|')
    .replace(/\r?\n/g, '<br>');
}

function buildDiffMarkdownText(): string {
  const rows = state.lastDiffRows || [];
  const typeCounts: Record<string, number> = { added: 0, removed: 0, changed: 0, moved: 0, same: 0 };
  const severityCounts: Record<string, number> = { high: 0, mid: 0, low: 0, info: 0 };
  for (const r of rows) {
    const t = String((r as any)?.type || '');
    const s = String((r as any)?.severity || '');
    if (typeCounts[t] != null) typeCounts[t] += 1;
    if (severityCounts[s] != null) severityCounts[s] += 1;
  }
  const actualDiffCount = typeCounts.added + typeCounts.removed + typeCounts.changed + typeCounts.moved;
  const sourceBundle = (state as any).lastSourceBundle;
  const targetBundle = (state as any).lastTargetBundle;
  const contextLines: string[] = [];
  if (sourceBundle?.appId) {
    const srcLabel = `App ${sourceBundle.appId}${sourceBundle.guestId ? ` / Guest ${sourceBundle.guestId}` : ''}${sourceBundle.preview ? ' / preview' : ''}`;
    contextLines.push(`- 比較元: ${srcLabel}`);
  }
  if (targetBundle?.appId) {
    const tgtLabel = `App ${targetBundle.appId}${targetBundle.guestId ? ` / Guest ${targetBundle.guestId}` : ''}${targetBundle.preview ? ' / preview' : ''}`;
    contextLines.push(`- 比較先: ${tgtLabel}`);
  }
  const summaryLines = [
    ...contextLines,
    `- 件数: 差分 ${actualDiffCount} 件 / 同一 ${typeCounts.same} 件`,
    `- 種別: 追加 ${typeCounts.added} / 削除 ${typeCounts.removed} / 変更 ${typeCounts.changed} / 移動 ${typeCounts.moved}`,
    `- 重要度: 高 ${severityCounts.high} / 中 ${severityCounts.mid} / 低 ${severityCounts.low} / 情報 ${severityCounts.info}`
  ];
  return '# 差分レポート\n\n生成: ' + new Date().toISOString() + '\n\n'
    + summaryLines.join('\n') + '\n\n'
    + '| 種別 | セクション | パス | 旧 | 新 | 重要度 |\n'
    + '|---|---|---|---|---|---|\n'
    + rows.map((r: any) => {
      const typeLabel = DIFF_TYPE_LABEL[r.type] || r.type;
      const severityLabel = DIFF_SEVERITY_LABEL[r.severity] || r.severity;
      const oldStr = escapeMarkdownTableCell(localizeKintoneEnumsInText(JSON.stringify(diffLeftValue(r))));
      const newStr = escapeMarkdownTableCell(localizeKintoneEnumsInText(JSON.stringify(diffRightValue(r))));
      const path = escapeMarkdownTableCell(String(r.path ?? ''));
      const section = escapeMarkdownTableCell(diffSectionLabel(r));
      return `| ${typeLabel} | ${section} | \`${path}\` | ${oldStr} | ${newStr} | ${severityLabel} |`;
    }).join('\n');
}

export function exportDiffAsMarkdown(): void {
  const rows = state.lastDiffRows || [];
  if (!rows.length) { pushToast('差分が未取得です', { tone: 'warn' }); return; }
  const md = buildDiffMarkdownText();
  triggerDownload(new Blob([md], { type: 'text/markdown' }), `kus-diff_${new Date().toISOString().slice(0, 10)}.md`);
  pushToast('Markdown を保存しました', { tone: 'ok' });
}

export async function copyDiffAsMarkdown(): Promise<void> {
  const rows = state.lastDiffRows || [];
  if (!rows.length) { pushToast('差分が未取得です', { tone: 'warn' }); return; }
  const md = buildDiffMarkdownText();
  try {
    await navigator.clipboard.writeText(md);
    pushToast('Markdown をクリップボードへコピーしました', { tone: 'ok' });
  } catch (_e) {
    pushToast('クリップボードへコピーできませんでした', { tone: 'error' });
  }
}
export function exportDiffAsXlsx(): void {
  const rows = state.lastDiffRows || [];
  if (!rows.length) { pushToast('差分が未取得です', { tone: 'warn' }); return; }
  try {
    runExportDiffXlsx({
      rows,
      fetchIssues: state.lastFetchIssues || [],
      sourceBundle: state.lastSourceBundle,
      targetBundle: state.lastTargetBundle,
      ignoreKeys: ui.ignoreKeys?.value || '',
      exportContentMode: 'diffOnly',
      filename: `kus-diff_${new Date().toISOString().slice(0, 10)}.xlsx`
    });
    pushToast('差分 Excel (.xlsx) を保存しました', { tone: 'ok' });
  } catch (e: any) {
    pushToast(`Excel 出力に失敗しました: ${e?.message || String(e)}`, { tone: 'error' });
  }
}
export function exportDiffAsPrintablePdf(): void {
  const rows = state.lastDiffRows || [];
  if (!rows.length) { pushToast('差分が未取得です', { tone: 'warn' }); return; }
  const win = window.open('', '_blank');
  if (!win) { pushToast('ポップアップがブロックされました', { tone: 'error' }); return; }
  const css = `
    body{font-family:-apple-system,Segoe UI,sans-serif;font-size:10px;color:#0f172a;padding:18px}
    h1{font-size:16px;margin:0 0 8px}
    .meta{font-size:10px;color:#64748b;margin-bottom:12px}
    table{border-collapse:collapse;width:100%}
    th,td{border:1px solid #cbd5e1;padding:4px 6px;vertical-align:top}
    th{background:#f1f5f9;text-align:left}
    .added{background:#ecfdf5}.removed{background:#fef2f2}.changed{background:#fff7ed}
  `;
  const tbody = rows.map((r: any) => {
    const typeLabel = DIFF_TYPE_LABEL[r.type] || r.type;
    const severityLabel = DIFF_SEVERITY_LABEL[r.severity] || r.severity;
    const oldStr = localizeKintoneEnumsInText(JSON.stringify(diffLeftValue(r)));
    const newStr = localizeKintoneEnumsInText(JSON.stringify(diffRightValue(r)));
    return `<tr class="${r.type}"><td>${escapeHtml(typeLabel)}</td><td>${escapeHtml(diffSectionLabel(r))}</td><td>${escapeHtml(r.path)}</td><td><pre>${escapeHtml(oldStr)}</pre></td><td><pre>${escapeHtml(newStr)}</pre></td><td>${escapeHtml(severityLabel)}</td></tr>`;
  }).join('');
  win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>kintone 差分レポート</title><style>${css}</style></head><body><h1>kintone 差分レポート</h1><div class="meta">生成: ${new Date().toISOString()} / 件数: ${rows.length}</div><table><thead><tr><th>種別</th><th>セクション</th><th>パス</th><th>旧</th><th>新</th><th>重要度</th></tr></thead><tbody>${tbody}</tbody></table><script>window.onload=()=>{setTimeout(()=>window.print(),200)}</script></body></html>`);
  win.document.close();
  pushToast('印刷ダイアログを開きました（PDF として保存可）', { tone: 'info' });
}

/* ============================================================
 * 48: プロパティパネル左固定切替
 * ============================================================ */
export function initLeftDockProperties(): void {
  const root = getRoot();
  if (!root) return;
  const propPanel = root.querySelector('#u_nodePropertyPanel') as HTMLElement | null;
  if (!propPanel) return;
  const head = propPanel.parentElement;
  if (!head || head.querySelector('.kus-prop-dock-toggle')) return;
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'btn sub kus-prop-dock-toggle';
  btn.textContent = '⫷ 左固定';
  btn.title = 'プロパティパネルを左サイドに固定';
  btn.addEventListener('click', () => {
    root.classList.toggle('kus-prop-dock-left');
    btn.classList.toggle('is-active', root.classList.contains('kus-prop-dock-left'));
    pushToast(root.classList.contains('kus-prop-dock-left') ? 'プロパティパネルを左固定' : '左固定を解除', { tone: 'info' });
  });
  head.insertBefore(btn, head.firstChild);
}

/* ============================================================
 * 50: 仮想スクロール（実ウィンドウイング: IntersectionObserver + spacer）
 * ============================================================ */
export function initVirtualScrollLite(): void {
  const root = getRoot();
  if (!root) return;
  if (root.dataset.kusVirtualScrollBound === '1') return;
  root.dataset.kusVirtualScrollBound = '1';
  const result = root.querySelector('#u_result') as HTMLElement | null;
  if (!result) return;
  let observer: IntersectionObserver | null = null;
  let measureH = 36;
  const apply = () => {
    const currentRoot = getRoot();
    const currentResult = currentRoot?.querySelector('#u_result') as HTMLElement | null;
    if (!currentRoot || !currentResult) return;
    const rows = [...currentResult.querySelectorAll<HTMLElement>('[data-diff-row-tr], .row[data-row-id]')];
    if (rows.length <= 200) {
      // 少件数では何もしない
      rows.forEach((r) => {
        r.style.contentVisibility = '';
        r.style.containIntrinsicSize = '';
      });
      observer?.disconnect();
      observer = null;
      return;
    }
    // 計測サンプル
    measureH = rows[0]?.offsetHeight || 36;
    if (observer) observer.disconnect();
    const win = currentRoot.ownerDocument.defaultView || window;
    observer = new win.IntersectionObserver((entries) => {
      entries.forEach((ent) => {
        const r = ent.target as HTMLElement;
        if (ent.isIntersecting) {
          r.style.contentVisibility = 'visible';
          r.style.containIntrinsicSize = '';
        } else {
          r.style.contentVisibility = 'auto';
          r.style.containIntrinsicSize = `${measureH}px`;
        }
      });
    }, {
      root: currentRoot.querySelector('.body') as Element,
      rootMargin: '600px 0px 600px 0px',
      threshold: 0
    });
    rows.forEach((r) => observer!.observe(r));
    pushToast(`仮想スクロール有効化: ${rows.length} 行`, { tone: 'info', ttl: 1800 });
  };
  bindToolDocumentEvent('virtualScroll', 'kus:diffRendered', () => getWin().requestAnimationFrame(apply));
}

/* ============================================================
 * 56: 反映プラン Mermaid（CDN ロード + ツール内描画 + テキスト出力）
 * ============================================================ */
let mermaidLoading: Promise<any> | null = null;
function loadMermaid(): Promise<any> {
  const doc = getDoc();
  const win = doc.defaultView || window;
  if ((win as any).mermaid) return Promise.resolve((win as any).mermaid);
  if (mermaidLoading) return mermaidLoading;
  mermaidLoading = new Promise((resolve, reject) => {
    const sc = doc.createElement('script');
    sc.src = 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js';
    sc.onload = () => {
      const m = (win as any).mermaid;
      try { m.initialize({ startOnLoad: false, securityLevel: 'loose', theme: 'default' }); } catch (e) { /* ignore */ }
      resolve(m);
    };
    sc.onerror = () => reject(new Error('mermaid のロードに失敗しました'));
    doc.head.appendChild(sc);
  });
  return mermaidLoading;
}
function buildPlanMermaid(plan: any): string {
  const lines: string[] = ['flowchart LR'];
  lines.push(`Start([反映開始])-->Bk[/バックアップ/]`);
  let prev = 'Bk';
  (plan?.sections || []).forEach((s: any, i: number) => {
    const id = `S${i}`;
    const label = String(s.label || s.key || `step${i}`).replace(/"/g, "'");
    const status = s.error ? '❌' : (s.changed ? '✏' : '·');
    lines.push(`${prev}-->${id}["${status} ${label}"]`);
    prev = id;
  });
  lines.push(`${prev}-->Done([完了])`);
  return lines.join('\n');
}
export async function showPlanMermaidInTool(): Promise<void> {
  const plan = state.lastApplyPlan;
  if (!plan) { pushToast('反映プランが未生成です', { tone: 'warn' }); return; }
  pushToast('Mermaid 図を生成中…', { tone: 'info', ttl: 1500 });
  try {
    const mermaid = await loadMermaid();
    const code = buildPlanMermaid(plan);
    const overlay = document.createElement('div');
    overlay.className = 'kus-confirm-overlay';
    overlay.innerHTML = `
      <div class="kus-confirm-card" style="width:min(960px,95vw);max-height:90vh;overflow:auto">
        <div class="kus-confirm-card__title">📊 反映プラン Mermaid</div>
        <div id="kus-plan-mermaid-host" style="background:#fff;padding:12px;border:1px solid #e2e8f0;border-radius:8px"></div>
        <details style="margin-top:8px"><summary class="muted">Mermaid ソース</summary><pre style="font-size:10px;background:#f8fafc;padding:8px;border-radius:6px;white-space:pre-wrap">${escapeHtml(code)}</pre></details>
        <div class="kus-confirm-card__btns">
          <button type="button" class="btn sub" data-act="kusPlanMermaidDl">📥 Markdown 保存</button>
          <button type="button" class="btn sub kus-confirm-card__cancel">閉じる</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    const host = overlay.querySelector('#kus-plan-mermaid-host') as HTMLElement;
    const id = `mer-${Date.now()}`;
    const result = await mermaid.render(id, code);
    host.innerHTML = result.svg || '';
    overlay.querySelector('.kus-confirm-card__cancel')?.addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
    overlay.querySelector('[data-act="kusPlanMermaidDl"]')?.addEventListener('click', () => {
      const md = '```mermaid\n' + code + '\n```\n';
      triggerDownload(new Blob([md], { type: 'text/markdown' }), `kus-plan-mermaid_${new Date().toISOString().slice(0, 10)}.md`);
      pushToast('Mermaid Markdown を保存しました', { tone: 'ok' });
    });
  } catch (e) {
    pushToast(`Mermaid 描画失敗: ${(e as any)?.message || e}（Markdown のみ保存します）`, { tone: 'warn' });
    exportPlanAsMermaid();
  }
}
export function exportPlanAsMermaid(): void {
  const plan = state.lastApplyPlan;
  if (!plan) { pushToast('反映プランが未生成です', { tone: 'warn' }); return; }
  const md = '```mermaid\n' + buildPlanMermaid(plan) + '\n```\n';
  triggerDownload(new Blob([md], { type: 'text/markdown' }), `kus-plan-mermaid_${new Date().toISOString().slice(0, 10)}.md`);
  pushToast('Mermaid 形式で保存しました', { tone: 'ok' });
}

/* ============================================================
 * 57: API リクエスト差分プレビュー
 * ============================================================ */
export function showApiRequestDiffPreview(): void {
  const plan = state.lastApplyPlan;
  if (!plan || !plan.sections?.length) { pushToast('反映プランが未生成です', { tone: 'warn' }); return; }
  const overlay = document.createElement('div');
  overlay.className = 'kus-confirm-overlay';
  const items = plan.sections.map((s: any) => {
    const before = JSON.stringify(s.before ?? null, null, 2);
    const after = JSON.stringify(s.after ?? s.payload ?? null, null, 2);
    return `<div class="kus-api-diff__item">
      <div class="kus-api-diff__head">${escapeHtml(s.label || s.key)} <span class="muted">${escapeHtml(s.method || 'PUT')} ${escapeHtml(s.endpoint || '')}</span></div>
      <div class="kus-api-diff__cols">
        <div><div class="kus-api-diff__col-h">送信前 (現在)</div><pre>${escapeHtml(before)}</pre></div>
        <div><div class="kus-api-diff__col-h">送信後 (予定)</div><pre>${escapeHtml(after)}</pre></div>
      </div>
    </div>`;
  }).join('');
  overlay.innerHTML = `
    <div class="kus-confirm-card kus-api-diff" style="width:min(880px,95vw);max-height:85vh;overflow:auto">
      <div class="kus-confirm-card__title">送信予定 API リクエスト差分</div>
      ${items}
      <div class="kus-confirm-card__btns"><button type="button" class="btn sub kus-confirm-card__cancel">閉じる</button></div>
    </div>`;
  document.body.appendChild(overlay);
  overlay.querySelector('.kus-confirm-card__cancel')?.addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
}

/* ============================================================
 * 58: 反映後スクリーンショット（html2canvas で PNG / フォールバックは HTML）
 * ============================================================ */
let html2canvasLoading: Promise<any> | null = null;
function loadHtml2Canvas(): Promise<any> {
  if ((window as any).html2canvas) return Promise.resolve((window as any).html2canvas);
  if (html2canvasLoading) return html2canvasLoading;
  html2canvasLoading = new Promise((resolve, reject) => {
    const sc = document.createElement('script');
    sc.src = 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';
    sc.onload = () => resolve((window as any).html2canvas);
    sc.onerror = () => reject(new Error('html2canvas のロードに失敗しました'));
    document.head.appendChild(sc);
  });
  return html2canvasLoading;
}
export async function captureReflectScreenshot(): Promise<void> {
  const root = getRoot();
  if (!root) return;
  pushToast('スクリーンショット取得中…', { tone: 'info', ttl: 1500 });
  try {
    const h2c = await loadHtml2Canvas();
    const canvas: HTMLCanvasElement = await h2c(root, { backgroundColor: '#fff', scale: window.devicePixelRatio || 1, logging: false });
    canvas.toBlob((blob) => {
      if (!blob) { pushToast('PNG 生成に失敗', { tone: 'error' }); return; }
      triggerDownload(blob, `kus-snapshot_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.png`);
      pushToast('PNG スクリーンショットを保存しました', { tone: 'ok' });
    }, 'image/png');
  } catch (e) {
    // fallback to HTML snapshot
    const html = root.outerHTML;
    const css = [...document.styleSheets].map((s) => {
      try { return [...s.cssRules].map((r) => r.cssText).join('\n'); } catch { return ''; }
    }).join('\n');
    const doc = `<!doctype html><html><head><meta charset="utf-8"><title>kus-snapshot</title><style>${css}</style></head><body>${html}</body></html>`;
    triggerDownload(new Blob([doc], { type: 'text/html' }), `kus-snapshot_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.html`);
    pushToast(`PNG 失敗。HTML で保存しました (${(e as any)?.message || e})`, { tone: 'warn' });
  }
}

/* ============================================================
 * 59: 反映スコープ選択ツリー（フィルタ付き）
 * ============================================================ */
export function initFilteredScopeTree(): void {
  const root = getRoot();
  if (!root) return;
  const modal = root.querySelector('#u_scopePickerModal') as HTMLElement | null;
  if (!modal) return;
  if (modal.querySelector('.kus-scope-tree-filter')) return;
  const filter = document.createElement('div');
  filter.className = 'kus-scope-tree-filter';
  filter.innerHTML = `
    <input type="search" class="kus-scope-tree-filter__q" placeholder="🔍 セクション名で絞り込み">
    <button type="button" class="btn sub" data-act="kusScopeAll">全選択</button>
    <button type="button" class="btn sub" data-act="kusScopeNone">全解除</button>
  `;
  const body = modal.querySelector('.scope-picker-body, .scope-modal-body');
  if (body) body.prepend(filter);
  else modal.prepend(filter);
  const q = filter.querySelector('input') as HTMLInputElement;
  q.addEventListener('input', () => {
    const v = q.value.trim().toLowerCase();
    modal.querySelectorAll<HTMLElement>('label, .scope-item').forEach((row) => {
      const txt = (row.textContent || '').toLowerCase();
      row.style.display = (!v || txt.includes(v)) ? '' : 'none';
    });
  });
  filter.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement)?.closest?.('button[data-act]') as HTMLElement | null;
    if (!btn) return;
    const act = btn.dataset.act;
    const activePanel = modal.querySelector<HTMLElement>('.scope-picker-panel.active') || modal.querySelector<HTMLElement>('.scope-picker-panel');
    if (!activePanel) return;
    const selector = [
      '.scope-picker-chips input[type="checkbox"]',
      '#u_reflectSidebarSections [data-apply-scope]'
    ].join(',');
    activePanel.querySelectorAll<HTMLInputElement>(selector).forEach((cb) => {
      const row = cb.closest<HTMLElement>('label, .scope-item, .sidebar-item');
      if (row?.style?.display === 'none') return;
      cb.checked = act === 'kusScopeAll';
      cb.dispatchEvent(new Event('change', { bubbles: true }));
    });
  });
}

/* ============================================================
 * 61: JSON スキーマ検証（フィールド/ビュー/レイアウト/プロセス/権限/通知）
 * ============================================================ */
const VALID_FIELD_TYPES = new Set([
  'SINGLE_LINE_TEXT','MULTI_LINE_TEXT','RICH_TEXT','NUMBER','CALC',
  'RADIO_BUTTON','CHECK_BOX','MULTI_SELECT','DROP_DOWN',
  'DATE','TIME','DATETIME','LINK','FILE',
  'USER_SELECT','ORGANIZATION_SELECT','GROUP_SELECT',
  'REFERENCE_TABLE','LOOKUP','SUBTABLE',
  'STATUS','STATUS_ASSIGNEE','CATEGORY','RECORD_NUMBER',
  'CREATED_TIME','UPDATED_TIME','CREATOR','MODIFIER',
  'GROUP','SPACER','HR','LABEL'
]);
const SCHEMAS: Record<string, (data: any) => string[]> = {
  fields: (data) => {
    const errors: string[] = [];
    if (!data || typeof data !== 'object') return ['オブジェクトが必要'];
    const props = data.properties || data;
    if (!props || typeof props !== 'object') return ['properties オブジェクトが必要'];
    Object.entries(props).forEach(([k, v]: [string, any]) => {
      if (!v?.type) errors.push(`${k}: type が未定義`);
      else if (!VALID_FIELD_TYPES.has(v.type)) errors.push(`${k}: 不明なフィールド種別 "${v.type}"`);
      if (v?.code && v.code !== k) errors.push(`${k}: code がキーと一致しない (${v.code})`);
      if (v?.type === 'CALC' && !v.expression) errors.push(`${k}: CALC に expression がありません`);
      if (v?.type === 'LOOKUP' && !v.lookup) errors.push(`${k}: LOOKUP に lookup 設定がありません`);
      if (v?.type === 'SUBTABLE' && !v.fields) errors.push(`${k}: SUBTABLE に fields がありません`);
      if (v?.required && v?.type === 'CALC') errors.push(`${k}: CALC は required にできません`);
    });
    return errors;
  },
  views: (data) => {
    const errors: string[] = [];
    const views = data?.views || data;
    if (!views || typeof views !== 'object') return ['views オブジェクトが必要'];
    Object.entries(views).forEach(([k, v]: [string, any]) => {
      if (!v?.type) errors.push(`${k}: ビュー type が未定義`);
      if (v?.type === 'LIST' && !Array.isArray(v.fields)) errors.push(`${k}: LIST ビューに fields 配列が必要`);
      if (v?.type === 'CALENDAR' && !v.date) errors.push(`${k}: CALENDAR に date 設定が必要`);
    });
    return errors;
  },
  layout: (data) => {
    const errors: string[] = [];
    const layout = data?.layout || data;
    if (!Array.isArray(layout)) return ['layout は配列である必要があります'];
    layout.forEach((row: any, i: number) => {
      if (!row?.type) errors.push(`row[${i}]: type 未定義`);
      if (row?.type === 'ROW' && !Array.isArray(row.fields)) errors.push(`row[${i}]: ROW に fields 配列が必要`);
    });
    return errors;
  },
  process: (data) => {
    const errors: string[] = [];
    if (!data) return ['プロセス管理オブジェクトが必要'];
    if (data.enable && !data.states) errors.push('enable=true ですが states が未定義');
    if (data.actions && !Array.isArray(data.actions)) errors.push('actions は配列である必要があります');
    return errors;
  },
  acl: (data) => {
    const errors: string[] = [];
    const rights = data?.rights || data;
    if (!Array.isArray(rights)) return ['rights は配列である必要があります'];
    rights.forEach((r: any, i: number) => {
      if (!r?.entity) errors.push(`rights[${i}]: entity 未定義`);
    });
    return errors;
  },
  notifications: (data) => {
    const errors: string[] = [];
    const list = data?.notifications || data;
    if (!Array.isArray(list)) return ['notifications は配列である必要があります'];
    list.forEach((n: any, i: number) => {
      if (!n?.entity && !n?.entities) errors.push(`notifications[${i}]: 宛先(entity/entities) 未定義`);
    });
    return errors;
  }
};
function detectSchema(data: any): keyof typeof SCHEMAS | null {
  if (!data) return null;
  if (data.properties || (typeof data === 'object' && Object.values(data).some((v: any) => v?.type && VALID_FIELD_TYPES.has(v.type)))) return 'fields';
  if (data.views) return 'views';
  if (Array.isArray(data.layout)) return 'layout';
  if (data.states || data.actions || typeof data.enable === 'boolean') return 'process';
  if (Array.isArray(data.rights)) return 'acl';
  if (Array.isArray(data.notifications)) return 'notifications';
  return null;
}
export function initJsonSchemaValidate(): void {
  const root = getRoot();
  if (!root) return;
  const editors = root.querySelectorAll<HTMLElement>('[id$="JsonEditor"], textarea[data-json-editor], textarea[id$="Json"]');
  editors.forEach((ed) => {
    if (ed.parentElement?.querySelector('.kus-validate-btn')) return;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn sub kus-validate-btn';
    btn.textContent = '✓ 検証';
    btn.title = 'JSON 構造を検証（フィールド/ビュー/レイアウト/プロセス/権限/通知 を自動判別）';
    btn.addEventListener('click', () => {
      const text = (ed as HTMLTextAreaElement).value || ed.textContent || '';
      try {
        const data = JSON.parse(text);
        const kind = detectSchema(data) as string | null;
        if (!kind) { pushToast('スキーマ判別不能（生 JSON）', { tone: 'info' }); return; }
        const errors = SCHEMAS[kind](data);
        if (errors.length) {
          const more = errors.length > 5 ? ` ...他 ${errors.length - 5} 件` : '';
          pushToast(`[${kind}] エラー ${errors.length} 件: ${errors.slice(0, 5).join(' / ')}${more}`, { tone: 'warn', ttl: 8000 });
        } else {
          pushToast(`[${kind}] 検証 OK`, { tone: 'ok' });
        }
      } catch (e) {
        pushToast(`JSON パース失敗: ${(e as any)?.message || e}`, { tone: 'error' });
      }
    });
    ed.parentElement?.appendChild(btn);
  });
}

/* ============================================================
 * 62: ドライラン重ね差分（JSON ダウンロード）
 * ============================================================ */
export function exportDryRunOverlay(): void {
  const plan = state.lastApplyPlan;
  if (!plan) { pushToast('プランがありません', { tone: 'warn' }); return; }
  const overlay: any[] = (plan.sections || []).map((s: any) => ({
    section: s.label || s.key,
    method: s.method || 'PUT',
    endpoint: s.endpoint,
    before: s.before ?? null,
    after: s.after ?? s.payload ?? null
  }));
  triggerDownload(new Blob([JSON.stringify({ generatedAt: new Date().toISOString(), overlay }, null, 2)], { type: 'application/json' }), `kus-dryrun-overlay_${new Date().toISOString().slice(0, 10)}.json`);
  pushToast('ドライラン重ね差分 JSON を保存しました', { tone: 'ok' });
}

/* ============================================================
 * 68/69: 設計書テンプレート切替 + TOC パネル
 * ============================================================ */
const DESIGN_TEMPLATES = [
  { key: 'a4-portrait', label: 'A4 縦' },
  { key: 'a4-landscape', label: 'A4 横' },
  { key: 'presentation', label: 'プレゼン' },
  { key: 'compact', label: 'コンパクト' }
];
export function initDesignTemplates(): void {
  const root = getRoot();
  if (!root) return;
  const designPane = root.querySelector('[data-pane="design"]') as HTMLElement | null;
  if (!designPane) return;
  if (designPane.querySelector('.kus-design-templates')) return;
  const wrap = document.createElement('div');
  wrap.className = 'kus-design-templates btns';
  wrap.innerHTML = '<span class="muted">テンプレート:</span>'
    + DESIGN_TEMPLATES.map((t, i) => `<button type="button" class="btn sub${i === 0 ? ' is-active' : ''}" data-template="${t.key}">${t.label}</button>`).join('');
  designPane.insertBefore(wrap, designPane.firstChild);
  wrap.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement)?.closest?.('button[data-template]') as HTMLElement | null;
    if (!btn) return;
    wrap.querySelectorAll('button').forEach((b) => b.classList.remove('is-active'));
    btn.classList.add('is-active');
    const t = btn.dataset.template || '';
    designPane.dataset.kusTemplate = t;
    DESIGN_TEMPLATES.forEach((x) => designPane.classList.remove(`kus-design-${x.key}`));
    designPane.classList.add(`kus-design-${t}`);
    state.kusDesignTemplate = t;
    pushToast(`テンプレート: ${btn.textContent}`, { tone: 'info' });
  });
}
export function initDesignToc(): void {
  const root = getRoot();
  if (!root) return;
  const designPane = root.querySelector('[data-pane="design"]') as HTMLElement | null;
  if (!designPane) return;
  if (designPane.querySelector('.kus-design-toc')) return;
  const toc = document.createElement('aside');
  toc.className = 'kus-design-toc';
  toc.innerHTML = '<div class="kus-design-toc__title">📑 目次</div><div class="kus-design-toc__body muted">設計書を生成すると、ここに目次が表示されます</div>';
  designPane.appendChild(toc);
  // Build TOC after design generation (observer-based)
  const obs = new MutationObserver(() => {
    const body = toc.querySelector('.kus-design-toc__body') as HTMLElement;
    const headings = [...designPane.querySelectorAll<HTMLElement>('.result h1, .result h2, .result h3')];
    if (!headings.length) return;
    body.innerHTML = headings.map((h, i) => {
      h.id = h.id || `kus-toc-${i}`;
      const lvl = h.tagName === 'H1' ? 0 : h.tagName === 'H2' ? 1 : 2;
      return `<a class="kus-design-toc__lnk" data-lvl="${lvl}" href="#${h.id}">${h.textContent}</a>`;
    }).join('');
  });
  const result = designPane.querySelector('.result');
  if (result) obs.observe(result, { childList: true, subtree: true });
}

/* ============================================================
 * 74: プロセス図スクショ差分（ファイル比較）
 * ============================================================ */
export function initProcessScreenshotDiff(): void {
  const root = getRoot();
  if (!root) return;
  const pPane = root.querySelector('[data-pane="processFlow"]') as HTMLElement | null;
  if (!pPane) return;
  if (pPane.querySelector('.kus-proc-screenshot')) return;
  const wrap = document.createElement('div');
  wrap.className = 'kus-proc-screenshot btns';
  wrap.innerHTML = `
    <button type="button" class="btn sub" data-act="kusProcSnap">📸 現在の図を保存（HTML）</button>
    <input type="file" accept=".html" class="kus-proc-screenshot__inp" hidden>
    <button type="button" class="btn sub" data-act="kusProcCompare">⇄ 過去のスナップと比較</button>
  `;
  pPane.insertBefore(wrap, pPane.firstChild);
  const fileInput = wrap.querySelector('.kus-proc-screenshot__inp') as HTMLInputElement;
  wrap.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement)?.closest?.('button[data-act]') as HTMLElement | null;
    if (!btn) return;
    if (btn.dataset.act === 'kusProcSnap') captureReflectScreenshot();
    else if (btn.dataset.act === 'kusProcCompare') fileInput.click();
  });
  fileInput.addEventListener('change', () => {
    const f = fileInput.files?.[0];
    if (!f) return;
    pushToast(`比較ファイル: ${f.name} (差分は新規ウィンドウに表示)`, { tone: 'info' });
    f.text().then((txt) => {
      const w = window.open('', '_blank');
      if (!w) return;
      w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>過去のスナップショット</title></head><body><h1>過去のスナップショット</h1><pre style="white-space:pre-wrap">${escapeHtml(txt)}</pre></body></html>`);
      w.document.close();
    });
  });
}

/* ============================================================
 * 75: 出力に会社ロゴ・タイトルページ
 * ============================================================ */
let designLogoDataUrl: string | null = null;
let designCoverTitle: string = '';
let designCoverAuthor: string = '';
export function initDesignCoverInputs(): void {
  const root = getRoot();
  if (!root) return;
  const designPane = root.querySelector('[data-pane="design"]') as HTMLElement | null;
  if (!designPane) return;
  if (designPane.querySelector('.kus-design-cover')) return;
  const wrap = document.createElement('details');
  wrap.className = 'kus-design-cover';
  wrap.innerHTML = `
    <summary>表紙・ロゴ設定</summary>
    <div class="kus-design-cover__body">
      <input type="text" class="kus-design-cover__title" placeholder="表紙タイトル">
      <input type="text" class="kus-design-cover__author" placeholder="作成者">
      <input type="file" accept="image/*" class="kus-design-cover__logo">
      <div class="kus-design-cover__preview"></div>
    </div>
  `;
  designPane.insertBefore(wrap, designPane.firstChild);
  const titleInput = wrap.querySelector('.kus-design-cover__title') as HTMLInputElement;
  const authorInput = wrap.querySelector('.kus-design-cover__author') as HTMLInputElement;
  const logoInput = wrap.querySelector('.kus-design-cover__logo') as HTMLInputElement;
  const preview = wrap.querySelector('.kus-design-cover__preview') as HTMLElement;
  titleInput.addEventListener('input', () => { designCoverTitle = titleInput.value; state.kusDesignCoverTitle = titleInput.value; });
  authorInput.addEventListener('input', () => { designCoverAuthor = authorInput.value; state.kusDesignCoverAuthor = authorInput.value; });
  logoInput.addEventListener('change', () => {
    const f = logoInput.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      designLogoDataUrl = String(reader.result || '');
      state.kusDesignLogoDataUrl = designLogoDataUrl;
      preview.innerHTML = `<img src="${designLogoDataUrl}" alt="logo" style="max-height:48px"> 読み込み済み`;
    };
    reader.readAsDataURL(f);
  });
}
export function getDesignCover() {
  return { logo: designLogoDataUrl, title: designCoverTitle, author: designCoverAuthor };
}

/* ============================================================
 * 76: Excel シート分割選択
 * ============================================================ */
export function initExcelSheetSplit(): void {
  const root = getRoot();
  if (!root) return;
  const designPane = root.querySelector('[data-pane="design"]') as HTMLElement | null;
  if (!designPane) return;
  if (designPane.querySelector('.kus-excel-split')) return;
  const wrap = document.createElement('details');
  wrap.className = 'kus-excel-split';
  wrap.innerHTML = `
    <summary>Excel 出力時のシート分割</summary>
    <div class="kus-excel-split__body">
      <label><input type="checkbox" data-sheet="fields" checked> フィールド</label>
      <label><input type="checkbox" data-sheet="views" checked> ビュー</label>
      <label><input type="checkbox" data-sheet="acl" checked> 権限</label>
      <label><input type="checkbox" data-sheet="process" checked> プロセス管理</label>
      <label><input type="checkbox" data-sheet="notifications"> 通知</label>
      <label><input type="checkbox" data-sheet="layout"> レイアウト</label>
    </div>
  `;
  designPane.insertBefore(wrap, designPane.firstChild);
  const update = () => {
    const sheets = [...wrap.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')]
      .filter((c) => c.checked).map((c) => c.dataset.sheet || '');
    state.kusExcelSheets = sheets;
  };
  wrap.addEventListener('change', update);
  update();
}

/* ============================================================
 * 77: PDF 表紙
 * ============================================================ */
export function exportDiffPdfWithCover(): void {
  const rows = state.lastDiffRows || [];
  const cover = getDesignCover();
  const win = window.open('', '_blank');
  if (!win) { pushToast('ポップアップがブロックされました', { tone: 'error' }); return; }
  const css = `
    body{font-family:-apple-system,Segoe UI,sans-serif;color:#0f172a;padding:0;margin:0}
    .cover{height:90vh;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;padding:40px;border-bottom:2px solid #e2e8f0}
    .cover img{max-height:120px;margin-bottom:20px}
    .cover h1{font-size:28px;margin:8px 0}
    .cover .meta{font-size:12px;color:#64748b}
    .body{padding:24px}
    table{border-collapse:collapse;width:100%;font-size:10px}
    th,td{border:1px solid #cbd5e1;padding:4px 6px}
    @page{size:A4;margin:18mm}
  `;
  const tbody = rows.map((r: any) => {
    const typeLabel = DIFF_TYPE_LABEL[r.type] || r.type;
    const severityLabel = DIFF_SEVERITY_LABEL[r.severity] || r.severity;
    const oldStr = localizeKintoneEnumsInText(JSON.stringify(diffLeftValue(r)));
    const newStr = localizeKintoneEnumsInText(JSON.stringify(diffRightValue(r)));
    return `<tr><td>${escapeHtml(typeLabel)}</td><td>${escapeHtml(diffSectionLabel(r))}</td><td>${escapeHtml(r.path)}</td><td><pre>${escapeHtml(oldStr)}</pre></td><td><pre>${escapeHtml(newStr)}</pre></td><td>${escapeHtml(severityLabel)}</td></tr>`;
  }).join('');
  win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(cover.title || '差分レポート')}</title><style>${css}</style></head><body>
    <div class="cover">
      ${cover.logo ? `<img src="${cover.logo}" alt="logo">` : ''}
      <h1>${escapeHtml(cover.title || 'kintone 差分レポート')}</h1>
      <div class="meta">作成: ${escapeHtml(cover.author || '-')} / ${new Date().toISOString().slice(0, 10)}</div>
    </div>
    <div class="body">
      <h2>差分一覧 (${rows.length} 件)</h2>
      <table><thead><tr><th>種別</th><th>セクション</th><th>パス</th><th>旧</th><th>新</th><th>重要度</th></tr></thead><tbody>${tbody}</tbody></table>
    </div>
    <script>window.onload=()=>setTimeout(()=>window.print(),300)</script>
    </body></html>`);
  win.document.close();
  pushToast('表紙付き PDF（印刷ダイアログ）を開きました', { tone: 'info' });
}

/* ============================================================
 * 79: CSV インポート マッピング画面
 * ============================================================ */
export function initCsvImportMapping(): void {
  const root = getRoot();
  if (!root) return;
  const recordPane = root.querySelector('[data-pane="recordMgr"]') as HTMLElement | null;
  if (!recordPane) return;
  if (recordPane.querySelector('.kus-csv-mapping')) return;
  const wrap = document.createElement('details');
  wrap.className = 'kus-csv-mapping';
  wrap.innerHTML = `
    <summary>CSV インポート マッピング</summary>
    <div class="kus-csv-mapping__body">
      <input type="file" accept=".csv,.tsv,.txt" class="kus-csv-mapping__file">
      <div class="kus-csv-mapping__panel"></div>
    </div>
  `;
  recordPane.insertBefore(wrap, recordPane.firstChild);
  const file = wrap.querySelector('input[type="file"]') as HTMLInputElement;
  const panel = wrap.querySelector('.kus-csv-mapping__panel') as HTMLElement;
  file.addEventListener('change', async () => {
    const f = file.files?.[0];
    if (!f) return;
    const text = await f.text();
    const sep = f.name.endsWith('.tsv') ? '\t' : ',';
    const firstLine = text.split('\n')[0] || '';
    const cols = firstLine.split(sep).map((c) => c.replace(/^"|"$/g, ''));
    const targets: string[] = ['(無視)', '$id', 'recordId', 'title', 'status', 'category', '... カスタム ...'];
    panel.innerHTML = `<table class="kus-csv-mapping__t">
      <thead><tr><th>CSV 列</th><th>→</th><th>kintone フィールド</th></tr></thead>
      <tbody>${cols.map((c, i) => `<tr><td>${escapeHtml(c)}</td><td>→</td><td><select data-csv-col="${i}">${targets.map((t) => `<option>${escapeHtml(t)}</option>`).join('')}</select></td></tr>`).join('')}</tbody>
    </table>
    <div class="muted">マッピングは取り込み実行時に <code>state.kusCsvMapping</code> として参照されます</div>`;
    panel.querySelectorAll('select').forEach((sel: HTMLSelectElement) => {
      sel.addEventListener('change', () => {
        const map: Record<string, string> = {};
        panel.querySelectorAll<HTMLSelectElement>('select[data-csv-col]').forEach((s) => {
          const i = Number(s.dataset.csvCol || -1);
          if (i >= 0 && s.value !== '(無視)') map[cols[i]] = s.value;
        });
        state.kusCsvMapping = map;
      });
    });
    pushToast(`${cols.length} 列を読込しました。マッピングを設定してください`, { tone: 'info' });
  });
}

/* ============================================================
 * 82: クエリビルダ UI（簡易）
 * ============================================================ */
const queryRows: Array<{ field: string; op: string; value: string }> = [];
export function initQueryBuilder(): void {
  const root = getRoot();
  if (!root) return;
  const recordPane = root.querySelector('[data-pane="recordMgr"]') as HTMLElement | null;
  if (!recordPane) return;
  if (recordPane.querySelector('.kus-query-builder')) return;
  const wrap = document.createElement('details');
  wrap.className = 'kus-query-builder';
  wrap.innerHTML = `
    <summary>クエリビルダ（GUI で where 句を組立）</summary>
    <div class="kus-query-builder__body">
      <table class="kus-query-builder__t"><thead><tr><th>フィールド</th><th>演算子</th><th>値</th><th></th></tr></thead><tbody></tbody></table>
      <div class="btns">
        <button type="button" class="btn sub" data-act="kusQueryAdd">＋ 条件追加</button>
        <button type="button" class="btn sub" data-act="kusQueryGen">⚙ クエリ生成</button>
        <input type="text" class="kus-query-builder__out" readonly placeholder="(ここに生成された where 句が表示されます)" style="flex:1;min-width:240px">
      </div>
    </div>
  `;
  recordPane.insertBefore(wrap, recordPane.firstChild);
  const tbody = wrap.querySelector('tbody') as HTMLElement;
  const out = wrap.querySelector('.kus-query-builder__out') as HTMLInputElement;
  const renderRows = () => {
    tbody.innerHTML = queryRows.map((r, i) => `
      <tr>
        <td><input type="text" data-q-i="${i}" data-q-k="field" value="${escapeHtml(r.field)}" placeholder="フィールドコード"></td>
        <td><select data-q-i="${i}" data-q-k="op"><option>=</option><option>!=</option><option>like</option><option>in</option><option>></option><option><</option></select></td>
        <td><input type="text" data-q-i="${i}" data-q-k="value" value="${escapeHtml(r.value)}" placeholder="値"></td>
        <td><button type="button" class="btn sub" data-q-del="${i}">×</button></td>
      </tr>`).join('');
    tbody.querySelectorAll<HTMLSelectElement>('select[data-q-i]').forEach((s) => { s.value = queryRows[Number(s.dataset.qI)].op; });
  };
  wrap.addEventListener('click', (e) => {
    const t = e.target as HTMLElement;
    if (t.dataset.act === 'kusQueryAdd') {
      queryRows.push({ field: '', op: '=', value: '' });
      renderRows();
    } else if (t.dataset.act === 'kusQueryGen') {
      const where = queryRows.filter((r) => r.field).map((r) => {
        if (r.op === 'in') return `${r.field} in (${r.value})`;
        if (r.op === 'like') return `${r.field} like "${r.value}"`;
        return `${r.field} ${r.op} "${r.value}"`;
      }).join(' and ');
      out.value = where;
      state.kusQueryWhere = where;
      pushToast('クエリ where 句を生成しました', { tone: 'ok' });
    } else if (t.dataset.qDel) {
      queryRows.splice(Number(t.dataset.qDel), 1);
      renderRows();
    }
  });
  wrap.addEventListener('input', (e) => {
    const t = e.target as HTMLInputElement;
    if (!t.dataset.qI) return;
    const i = Number(t.dataset.qI);
    const k = t.dataset.qK as 'field' | 'op' | 'value';
    if (queryRows[i]) (queryRows[i] as any)[k] = t.value;
  });
  wrap.addEventListener('change', (e) => {
    const t = e.target as HTMLSelectElement;
    if (!t.dataset.qI || t.dataset.qK !== 'op') return;
    queryRows[Number(t.dataset.qI)].op = t.value;
  });
}

/* ============================================================
 * エントリ
 * ============================================================ */
export function initExtras(): void {
  try { initScrollMemory(); } catch (e) { console.warn('extras: scrollMemory', e); }
  try { initActiveTaskPanel(); } catch (e) { console.warn('extras: taskPanel', e); }
  try { initConfirmSlider(); } catch (e) { console.warn('extras: confirmSlider', e); }
  try { initTabBarAutoCollapse(); } catch (e) { console.warn('extras: tabBarAutoCollapse', e); }
  try { initHighlightColorPicker(); } catch (e) { console.warn('extras: highlightColor', e); }
  try { initSeverityThreshold(); } catch (e) { console.warn('extras: severityThreshold', e); }
  try { initOneTapFilterPresets(); } catch (e) { console.warn('extras: oneTapPresets', e); }
  try { initApproveRejectKeys(); } catch (e) { console.warn('extras: approveReject', e); }
  try { initUrlSync(); } catch (e) { console.warn('extras: urlSync', e); }
  try { initErFilters(); } catch (e) { console.warn('extras: erFilters', e); }
  try { initDiagramExportButtons(); } catch (e) { console.warn('extras: diagramExport', e); }
  try { initZipSplitSize(); } catch (e) { console.warn('extras: zipSplit', e); }
  try { initApiResponseViewToggle(); } catch (e) { console.warn('extras: apiViewToggle', e); }
  try { initApiEnvVars(); } catch (e) { console.warn('extras: apiEnvVars', e); }
  try { initCurlCopy(); } catch (e) { console.warn('extras: curlCopy', e); }
  try { initRowCopyFormat(); } catch (e) { console.warn('extras: rowCopyFormat', e); }
  try { initStatusUndo(); } catch (e) { console.warn('extras: statusUndo', e); }
  try { initOfflineRetry(); } catch (e) { console.warn('extras: offlineRetry', e); }
  try { initRightPaneJsonDiff(); } catch (e) { console.warn('extras: rightPaneJsonDiff', e); }
  try { initInlineMemo(); } catch (e) { console.warn('extras: inlineMemo', e); }
  try { initRetryFailedSectionsButton(); } catch (e) { console.warn('extras: retryFailed', e); }
  try { initGenerationalBackupHook(); } catch (e) { console.warn('extras: genBackup', e); }
  try { initErLayoutSwitch(); } catch (e) { console.warn('extras: erLayout', e); }
  try { initErDoubleClickNav(); } catch (e) { console.warn('extras: erDblClick', e); }
  try {
    // ER タブの事前見積もり + ルートメタ更新リスナー。
    // 動的 import を使うのは boot 順序の依存ループ回避のため。
    import('../tabs/er.js').then((m) => m.bindErPreflightListeners?.()).catch(() => { /* noop */ });
  } catch (e) { console.warn('extras: erPreflight', e); }
  try { initProcessAnnotations(); } catch (e) { console.warn('extras: processNote', e); }
  try { initRecordUpdateCountDelta(); } catch (e) { console.warn('extras: recordDelta', e); }
  try { initApiCollection(); } catch (e) { console.warn('extras: apiCollection', e); }
  try { initI18nSwitch(); } catch (e) { console.warn('extras: i18n', e); }
  try { initLeftDockProperties(); } catch (e) { console.warn('extras: leftDock', e); }
  try { initVirtualScrollLite(); } catch (e) { console.warn('extras: virtualScroll', e); }
  try { initFilteredScopeTree(); } catch (e) { console.warn('extras: filteredScope', e); }
  try { initJsonSchemaValidate(); } catch (e) { console.warn('extras: jsonSchema', e); }
  try { initDesignTemplates(); } catch (e) { console.warn('extras: designTemplates', e); }
  try { initDesignToc(); } catch (e) { console.warn('extras: designToc', e); }
  try { initProcessScreenshotDiff(); } catch (e) { console.warn('extras: procSnapshot', e); }
  try { initDesignCoverInputs(); } catch (e) { console.warn('extras: designCover', e); }
  try { initExcelSheetSplit(); } catch (e) { console.warn('extras: excelSplit', e); }
  try { initCsvImportMapping(); } catch (e) { console.warn('extras: csvMapping', e); }
  try { initQueryBuilder(); } catch (e) { console.warn('extras: queryBuilder', e); }
  // Initial render
  try { renderDiffFixedSummary(); } catch (e) { /* ignore */ }
  try { adaptReflectChecklist(); } catch (e) { /* ignore */ }
  // hook to status changes
  bindToolDocumentEvent('extrasDiffRendered', 'kus:diffRendered', () => {
    try { renderDiffFixedSummary(); } catch (e) { /* ignore */ }
    try { decorateFieldTypeIcons(); } catch (e) { /* ignore */ }
    try { adaptReflectChecklist(); } catch (e) { /* ignore */ }
  });
  bindToolDocumentEvent('storageErrorToast', 'kus:storageError', ((e: CustomEvent) => {
    const detail = e.detail || {};
    pushToast(`ブラウザ保存に失敗しました: ${detail.key || ''}`, { tone: 'warn', ttl: 6000 });
  }) as EventListener);
  // wire export/import buttons via delegation
  bindToolDocumentEvent('extrasActionDelegation', 'click', (e) => {
    const t = (e.target as HTMLElement)?.closest?.('[data-act]') as HTMLElement | null;
    if (!t) return;
    const act = t.dataset.act;
    if (act === 'kusExportDiffJson') {
      e.preventDefault();
      exportDiffStateToJson();
    } else if (act === 'kusImportDiffJson') {
      e.preventDefault();
      const inp = getDoc().createElement('input');
      inp.type = 'file';
      inp.accept = 'application/json';
      inp.onchange = () => {
        const f = inp.files?.[0];
        if (f) importDiffStateFromJson(f).catch((err) => pushToast(`読み込み失敗: ${err.message || err}`, { tone: 'error' }));
      };
      inp.click();
    } else if (act === 'kusExportPlanMd') {
      e.preventDefault();
      exportPlanMarkdown();
    } else if (act === 'kusExportPlanMermaid') {
      e.preventDefault();
      showPlanMermaidInTool();
    } else if (act === 'kusExportDiffMd') {
      e.preventDefault();
      exportDiffAsMarkdown();
    } else if (act === 'kusCopyDiffMd') {
      e.preventDefault();
      copyDiffAsMarkdown();
    } else if (act === 'kusExportDiffXlsx') {
      e.preventDefault();
      exportDiffAsXlsx();
    } else if (act === 'kusExportDiffPdf') {
      e.preventDefault();
      exportDiffAsPrintablePdf();
    } else if (act === 'kusExportDiffPdfCover') {
      e.preventDefault();
      exportDiffPdfWithCover();
    } else if (act === 'kusShowApiDiff') {
      e.preventDefault();
      showApiRequestDiffPreview();
    } else if (act === 'kusCaptureSnapshot') {
      e.preventDefault();
      captureReflectScreenshot();
    } else if (act === 'kusExportDryrunOverlay') {
      e.preventDefault();
      exportDryRunOverlay();
    }
  });
  setStatus('UI 拡張機能を有効化しました');
}
