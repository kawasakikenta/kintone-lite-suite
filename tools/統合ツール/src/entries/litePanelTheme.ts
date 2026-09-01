'use strict';

/**
 * 全 lite パネル（差分／反映／フィールド／JS設定／設定取得／設計書／ER／プロセス／レコード）が
 * 共有する統一テーマ＆コンポーネントファクトリ。
 *
 * - スタイルは 1 回だけ <style> 注入（id=`kus-lp-theme-styles`）
 * - 機能ごとのアクセント色は `createLitePanel({ accent })` で切替
 * - 旧 `liteMount.ts` / `litePanelHelpers.ts` の API はこのファイル経由で再エクスポート
 */

import { setComponentUi } from '../ui/components.js';
import { setRootElement } from '../ui/dialog.js';

const STYLE_ID = 'kus-lp-theme-styles';

const ACCENTS: Record<string, { from: string; via: string; to: string; chip: string; ring: string }> = {
  diff:    { from: '#1d4ed8', via: '#2563eb', to: '#0ea5e9', chip: '#dbeafe', ring: 'rgba(37,99,235,.16)' },
  reflect: { from: '#b91c1c', via: '#dc2626', to: '#f97316', chip: '#fee2e2', ring: 'rgba(220,38,38,.18)' },
  field:   { from: '#6d28d9', via: '#7c3aed', to: '#a855f7', chip: '#ede9fe', ring: 'rgba(124,58,237,.18)' },
  jsconfig:{ from: '#0f766e', via: '#0d9488', to: '#22d3ee', chip: '#ccfbf1', ring: 'rgba(13,148,136,.18)' },
  settings:{ from: '#0369a1', via: '#0284c7', to: '#22d3ee', chip: '#e0f2fe', ring: 'rgba(2,132,199,.18)' },
  design:  { from: '#854d0e', via: '#a16207', to: '#facc15', chip: '#fef9c3', ring: 'rgba(161,98,7,.18)' },
  er:      { from: '#0f766e', via: '#15803d', to: '#84cc16', chip: '#dcfce7', ring: 'rgba(21,128,61,.18)' },
  process: { from: '#9a3412', via: '#ea580c', to: '#f59e0b', chip: '#ffedd5', ring: 'rgba(234,88,12,.18)' },
  record:  { from: '#1e293b', via: '#334155', to: '#64748b', chip: '#e2e8f0', ring: 'rgba(51,65,85,.18)' }
};

export type AccentKey = keyof typeof ACCENTS;

const THEME_CSS = `
@keyframes kus-lp-spin { to { transform: rotate(360deg); } }
@keyframes kus-lp-fade-in { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }

.kus-lp{
  --c-bg:#ffffff;
  --c-surface:#f8fafc;
  --c-surface-2:#f1f5f9;
  --c-border:#e2e8f0;
  --c-border-strong:#cbd5e1;
  --c-text:#0f172a;
  --c-text-2:#334155;
  --c-muted:#64748b;
  --c-link:#2563eb;
  --c-ok-bg:#ecfdf5;
  --c-ok-fg:#065f46;
  --c-ok-bd:#a7f3d0;
  --c-err-bg:#fef2f2;
  --c-err-fg:#991b1b;
  --c-err-bd:#fecaca;
  --c-warn-bg:#fffbeb;
  --c-warn-fg:#92400e;
  --c-warn-bd:#fde68a;
  --c-info-bg:#eff6ff;
  --c-info-fg:#1e3a8a;
  --c-info-bd:#bfdbfe;
  --c-accent-from:#1d4ed8;
  --c-accent-via:#2563eb;
  --c-accent-to:#0ea5e9;
  --c-accent-chip:#dbeafe;
  --c-accent-ring:rgba(37,99,235,.16);

  position:fixed;
  z-index:999999;
  top:max(16px,2vh);
  right:max(16px,2vw);
  width:min(520px,96vw);
  max-height:min(92vh,920px);
  overflow:hidden;
  display:flex;
  flex-direction:column;
  background:var(--c-bg);
  border:1px solid var(--c-border);
  border-radius:18px;
  box-shadow:0 4px 6px -1px rgba(15,23,42,.08),0 28px 60px -12px rgba(15,23,42,.30);
  font:13px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI","Hiragino Sans","Noto Sans JP",sans-serif;
  color:var(--c-text);
  animation:kus-lp-fade-in .18s ease-out;
}

.kus-lp__hero{
  flex-shrink:0;
  position:relative;
  padding:16px 18px 18px;
  color:#fff;
  background:linear-gradient(125deg,var(--c-accent-from) 0%,var(--c-accent-via) 45%,var(--c-accent-to) 100%);
  display:flex;
  align-items:flex-start;
  justify-content:space-between;
  gap:12px;
}
.kus-lp__hero-main{min-width:0;flex:1}
.kus-lp__title{margin:0;font-size:17px;font-weight:700;line-height:1.25;letter-spacing:.01em;display:flex;align-items:center;gap:8px}
.kus-lp__title-icon{display:inline-flex;width:22px;height:22px;align-items:center;justify-content:center;background:rgba(255,255,255,.22);border-radius:7px}
.kus-lp__subtitle{margin:4px 0 0;font-size:12px;color:rgba(255,255,255,.85);line-height:1.45}
.kus-lp__badge-row{margin-top:8px;display:flex;flex-wrap:wrap;gap:5px}
.kus-lp__badge{
  display:inline-flex;align-items:center;gap:4px;
  font-size:10.5px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;
  background:rgba(255,255,255,.22);padding:3px 9px;border-radius:999px;color:#fff;
}
.kus-lp__close{
  flex-shrink:0;border:1px solid rgba(255,255,255,.45);background:rgba(255,255,255,.12);
  color:#fff;border-radius:10px;padding:6px 12px;font-size:12px;font-weight:600;cursor:pointer;
  transition:background .12s ease;
}
.kus-lp__close:hover{background:rgba(255,255,255,.24)}

.kus-lp__body{padding:16px 18px 18px;overflow-y:auto;flex:1;min-height:0}
.kus-lp__body::-webkit-scrollbar{width:10px;height:10px}
.kus-lp__body::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:8px;border:2px solid transparent;background-clip:padding-box}
.kus-lp__body::-webkit-scrollbar-thumb:hover{background:#94a3b8;background-clip:padding-box;border:2px solid transparent}

.kus-lp__hint{
  font-size:12px;color:var(--c-muted);line-height:1.55;margin:0 0 14px;
  padding:10px 12px;background:var(--c-surface);border-radius:10px;border:1px solid var(--c-border);
}
.kus-lp__hint strong{color:var(--c-text-2)}

/* ===== Tab bar (lite 内タブ) ===== */
.kus-lp__tabs{
  display:flex;flex-wrap:wrap;gap:4px;border-bottom:1px solid var(--c-border);
  margin:0 0 14px;padding:0;
}
.kus-lp__tab{
  position:relative;background:transparent;border:none;cursor:pointer;
  padding:8px 12px 9px;font-size:12px;font-weight:600;color:var(--c-muted);
  border-radius:8px 8px 0 0;
}
.kus-lp__tab:hover{color:var(--c-text-2);background:var(--c-surface)}
.kus-lp__tab[aria-selected="true"]{color:var(--c-accent-via);background:transparent}
.kus-lp__tab[aria-selected="true"]::after{
  content:'';position:absolute;left:8px;right:8px;bottom:-1px;height:2px;border-radius:2px;
  background:linear-gradient(90deg,var(--c-accent-via),var(--c-accent-to));
}
.kus-lp__tab-panel[hidden]{display:none}

/* ===== Card ===== */
.kus-lp__card{
  background:var(--c-bg);
  border:1px solid var(--c-border);
  border-radius:12px;
  padding:14px 16px;
  margin-bottom:12px;
}
.kus-lp__card--soft{background:var(--c-surface)}
.kus-lp__card-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:-2px 0 10px;padding-bottom:8px;border-bottom:1px solid var(--c-border)}
.kus-lp__card-title{font-size:11.5px;font-weight:700;color:var(--c-text-2);text-transform:uppercase;letter-spacing:.06em;margin:0;display:flex;align-items:center;gap:6px}
.kus-lp__card-num{
  display:inline-flex;width:18px;height:18px;align-items:center;justify-content:center;
  background:var(--c-accent-chip);color:var(--c-accent-via);font-size:11px;font-weight:700;border-radius:999px;
}
.kus-lp__card-actions{display:flex;gap:6px}

/* ===== Row (label + control) ===== */
.kus-lp__row{display:flex;flex-wrap:wrap;align-items:center;gap:8px 10px;margin-bottom:10px}
.kus-lp__row:last-child{margin-bottom:0}
.kus-lp__row--block{display:block}
.kus-lp__row--block > .kus-lp__label{display:block;margin-bottom:5px}
.kus-lp__label{font-size:12px;font-weight:600;color:var(--c-text-2);min-width:5em}

/* ===== Inputs ===== */
.kus-lp__input,.kus-lp__textarea,.kus-lp__select{
  appearance:none;
  border:1px solid var(--c-border);
  border-radius:8px;padding:7px 10px;font-size:12.5px;
  background:var(--c-bg);color:var(--c-text);
  outline:none;transition:border-color .15s,box-shadow .15s;
  font-family:inherit;
}
.kus-lp__input:focus,.kus-lp__textarea:focus,.kus-lp__select:focus{
  border-color:var(--c-accent-via);box-shadow:0 0 0 3px var(--c-accent-ring);
}
.kus-lp__input--id{width:min(120px,36vw)}
.kus-lp__input--guest{width:min(110px,32vw)}
.kus-lp__input--narrow{width:min(120px,40vw)}
.kus-lp__input--medium{width:min(180px,52vw)}
.kus-lp__input--wide{flex:1;min-width:160px}
.kus-lp__input--full{width:100%;box-sizing:border-box}
.kus-lp__textarea{width:100%;box-sizing:border-box;min-height:60px;resize:vertical}
.kus-lp__textarea--code{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:11.5px;background:var(--c-surface)}
.kus-lp__file{font-size:12px;padding:5px 0}

/* ===== Checkbox / chip ===== */
.kus-lp__check{font-size:12px;color:var(--c-text-2);display:inline-flex;align-items:center;gap:6px;cursor:pointer;user-select:none}
.kus-lp__check input{width:14px;height:14px;accent-color:var(--c-accent-via);margin:0}
.kus-lp__check-grid{display:flex;flex-wrap:wrap;gap:8px 12px;margin-bottom:10px}

.kus-lp__chips{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px}
.kus-lp__chip{
  display:inline-flex;align-items:center;gap:6px;
  font-size:11.5px;color:var(--c-text-2);
  background:var(--c-bg);border:1px solid var(--c-border-strong);
  border-radius:999px;padding:4px 10px 4px 7px;cursor:pointer;user-select:none;
  transition:background .12s,border-color .12s;
}
.kus-lp__chip:hover{background:var(--c-surface);border-color:#94a3b8}
.kus-lp__chip input{accent-color:var(--c-accent-via);width:13px;height:13px;margin:0}
.kus-lp__chip:has(input:checked){background:var(--c-accent-chip);border-color:var(--c-accent-via);color:var(--c-accent-from);font-weight:600}

/* ===== Buttons ===== */
.kus-lp__btn{
  appearance:none;border:1px solid transparent;border-radius:10px;
  font-family:inherit;font-size:12.5px;font-weight:600;cursor:pointer;
  padding:8px 14px;display:inline-flex;align-items:center;justify-content:center;gap:6px;
  transition:filter .12s,transform .04s,background .12s,border-color .12s;
}
.kus-lp__btn:active{transform:scale(.98)}
.kus-lp__btn[disabled],.kus-lp__btn:disabled{opacity:.55;cursor:not-allowed}

.kus-lp__btn--primary{background:linear-gradient(180deg,var(--c-accent-via),var(--c-accent-from));color:#fff;box-shadow:0 2px 4px var(--c-accent-ring)}
.kus-lp__btn--primary:hover:not(:disabled){filter:brightness(1.06)}

.kus-lp__btn--run{width:100%;padding:11px 16px;font-size:13px;font-weight:700;background:linear-gradient(180deg,var(--c-accent-via),var(--c-accent-from));color:#fff;box-shadow:0 2px 6px var(--c-accent-ring)}
.kus-lp__btn--run:hover:not(:disabled){filter:brightness(1.07)}

.kus-lp__btn--ghost{background:var(--c-surface);color:var(--c-text-2);border-color:var(--c-border-strong)}
.kus-lp__btn--ghost:hover:not(:disabled){background:#fff;border-color:#94a3b8}

.kus-lp__btn--sub{background:linear-gradient(180deg,#fff,var(--c-surface-2));color:var(--c-text-2);border-color:var(--c-border-strong);font-size:11.5px;padding:7px 10px}
.kus-lp__btn--sub:hover:not(:disabled){background:#fff;border-color:#94a3b8}

.kus-lp__btn--danger{background:linear-gradient(180deg,#ef4444,#b91c1c);color:#fff;box-shadow:0 2px 4px rgba(220,38,38,.25)}
.kus-lp__btn--danger:hover:not(:disabled){filter:brightness(1.05)}

.kus-lp__btn-row{display:flex;flex-wrap:wrap;gap:8px;margin-top:4px}
.kus-lp__btn-row--stack{flex-direction:column}
.kus-lp__btn-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
@media(max-width:380px){.kus-lp__btn-grid{grid-template-columns:1fr}}

/* ===== Status ===== */
.kus-lp__status{
  margin-top:12px;padding:10px 12px;border-radius:10px;font-size:12px;line-height:1.5;
  border:1px solid var(--c-border);background:var(--c-surface-2);color:var(--c-text-2);
  min-height:2.6em;display:flex;align-items:flex-start;gap:8px;
}
.kus-lp__status--ok{background:var(--c-ok-bg);color:var(--c-ok-fg);border-color:var(--c-ok-bd)}
.kus-lp__status--err{background:var(--c-err-bg);color:var(--c-err-fg);border-color:var(--c-err-bd)}
.kus-lp__status--warn{background:var(--c-warn-bg);color:var(--c-warn-fg);border-color:var(--c-warn-bd)}
.kus-lp__status--info{background:var(--c-info-bg);color:var(--c-info-fg);border-color:var(--c-info-bd)}
.kus-lp__status--busy{background:#eff6ff;color:#1e40af;border-color:#bfdbfe}
.kus-lp__status-icon{font-size:14px;line-height:1.2;flex:0 0 auto}
/* 部分成功や API コンテキストなど複数行のメッセージを改行のまま表示する */
.kus-lp__status-text{min-width:0;white-space:pre-wrap;word-break:break-word}
.kus-lp__status-busy::before{
  content:'';display:inline-block;width:10px;height:10px;border-radius:50%;
  border:2px solid var(--c-muted);border-top-color:transparent;animation:kus-lp-spin .8s linear infinite;
}

/* ===== Result / Log ===== */
.kus-lp__result{
  margin-top:10px;padding:11px 13px;background:#0f172a;color:#e2e8f0;border-radius:10px;
  font:11.5px/1.5 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
  white-space:pre-wrap;word-break:break-word;max-height:240px;overflow:auto;
  border:1px solid #1e293b;
}
.kus-lp__result--empty{display:none}
.kus-lp__panel-html{
  margin-top:10px;border:1px solid var(--c-border);border-radius:10px;
  background:var(--c-surface);max-height:240px;overflow:auto;font-size:11.5px;
}
.kus-lp__panel-html--empty{display:none}
.kus-lp__panel-html table{border-collapse:collapse;width:100%}
.kus-lp__panel-html th,.kus-lp__panel-html td{padding:6px 8px;border-bottom:1px solid var(--c-border);text-align:left}
.kus-lp__panel-html th{background:var(--c-surface-2);font-weight:600;font-size:11px;color:var(--c-text-2)}

/* ===== Misc ===== */
.kus-lp__note{font-size:11.5px;color:var(--c-muted);line-height:1.5;margin:-4px 0 10px}
.kus-lp__note--warn{color:var(--c-warn-fg);padding:7px 10px;background:var(--c-warn-bg);border:1px solid var(--c-warn-bd);border-radius:8px;margin:6px 0}
.kus-lp__divider{margin:12px 0;border:none;border-top:1px solid var(--c-border)}
.kus-lp__small{font-size:11px;color:var(--c-muted)}
.kus-lp__kbd{display:inline-block;padding:1px 6px;border:1px solid var(--c-border-strong);border-radius:4px;background:var(--c-surface);font:11px ui-monospace,monospace;color:var(--c-text-2)}

/* セクション折りたたみ (details) */
.kus-lp__details{
  border:1px solid var(--c-border);border-radius:10px;background:var(--c-bg);
  margin-bottom:10px;overflow:hidden;
}
.kus-lp__details > summary{
  list-style:none;cursor:pointer;padding:10px 14px;
  font-size:12.5px;font-weight:600;color:var(--c-text-2);
  display:flex;align-items:center;gap:8px;
}
.kus-lp__details > summary::-webkit-details-marker{display:none}
.kus-lp__details > summary::before{
  content:'';width:8px;height:8px;border-right:2px solid var(--c-muted);border-bottom:2px solid var(--c-muted);
  transform:rotate(-45deg);transition:transform .15s;display:inline-block;
}
.kus-lp__details[open] > summary::before{transform:rotate(45deg)}
.kus-lp__details > summary:hover{background:var(--c-surface)}
.kus-lp__details-body{padding:0 14px 12px}

/* Wide variant (一部 lite 用に幅広にしたい場合) */
.kus-lp--wide{width:min(640px,96vw)}

/* ===== App table (複数アプリ × per-app ゲストスペース入力) ===== */
.kus-lp__apptable{border:1px solid var(--c-border);border-radius:10px;overflow:hidden;background:var(--c-bg)}
.kus-lp__apptable-scroll{max-height:220px;overflow:auto}
.kus-lp__apptable table{width:100%;border-collapse:collapse;table-layout:fixed}
.kus-lp__apptable th{background:var(--c-surface-2);font-size:11px;font-weight:600;color:var(--c-text-2);text-align:left;padding:6px 8px;border-bottom:1px solid var(--c-border)}
.kus-lp__apptable-scroll th{position:sticky;top:0;z-index:1}
.kus-lp__apptable td{padding:5px 8px;border-bottom:1px solid var(--c-border);vertical-align:middle}
.kus-lp__apptable tbody tr:last-child td{border-bottom:none}
.kus-lp__apptable .kus-lp__input{width:100%;box-sizing:border-box}
.kus-lp__apptable-name{min-height:1.35em;margin-top:3px;color:var(--c-muted);font-size:10.5px;line-height:1.35;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.kus-lp__apptable-name:not(.kus-lp__apptable-name--empty)::before{content:'アプリ名: ';color:var(--c-text-2);font-weight:600}
.kus-lp__apptable-no{width:30px;text-align:center;color:var(--c-muted);font-size:11px;font-variant-numeric:tabular-nums}
.kus-lp__apptable-acts-h{width:128px}
.kus-lp__apptable-acts{white-space:nowrap}
.kus-lp__apptable-acts .kus-lp__btn{padding:4px 7px;font-size:11px;border-radius:7px}
.kus-lp__apptable-acts .kus-lp__btn + .kus-lp__btn{margin-left:4px}
.kus-lp__apptable-foot{display:flex;flex-wrap:wrap;align-items:center;gap:8px;padding:8px;background:var(--c-surface);border-top:1px solid var(--c-border)}
.kus-lp__apptable-count{font-size:11px;color:var(--c-muted);margin-left:auto;font-weight:600}
.kus-lp__apptable-hint{font-size:11px;line-height:1.5;color:var(--c-muted);padding:6px 10px;border-top:1px solid var(--c-border);background:var(--c-surface)}
@media(max-width:420px){
  .kus-lp__apptable table,.kus-lp__apptable thead,.kus-lp__apptable tbody,.kus-lp__apptable th,.kus-lp__apptable td,.kus-lp__apptable tr{display:block}
  .kus-lp__apptable thead{display:none}
  .kus-lp__apptable tbody tr{border-bottom:1px solid var(--c-border);padding:6px 4px}
  .kus-lp__apptable td{border:none;padding:3px 6px}
  .kus-lp__apptable-no{text-align:left;font-weight:600}
}
`;

function ensureThemeStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const s = document.createElement('style');
  s.id = STYLE_ID;
  s.textContent = THEME_CSS;
  document.head.appendChild(s);
}

function applyAccentVars(root: HTMLElement, accentKey: AccentKey) {
  const a = ACCENTS[accentKey] || ACCENTS.diff;
  root.style.setProperty('--c-accent-from', a.from);
  root.style.setProperty('--c-accent-via', a.via);
  root.style.setProperty('--c-accent-to', a.to);
  root.style.setProperty('--c-accent-chip', a.chip);
  root.style.setProperty('--c-accent-ring', a.ring);
}

// ===== Public types =====

export type StatusTone = 'neutral' | 'ok' | 'err' | 'warn' | 'info' | 'busy';

export interface LitePanelOptions {
  id: string;
  title: string;
  subtitle?: string;
  accent: AccentKey;
  badges?: Array<{ label: string; tone?: 'primary' | 'neutral' }>;
  hint?: string;
  wide?: boolean;
}

export interface LitePanelHandle {
  root: HTMLElement;
  body: HTMLElement;
  status: HTMLElement;
  result: HTMLElement;
  setStatus: (msg: string, tone?: StatusTone) => void;
  setResult: (text: string) => void;
  setResultHtml: (html: string) => void;
  setBusy: (busy: boolean) => void;
  close: () => void;
  /**
   * パネルの主アクション（実行ボタン）を登録する。
   * 登録すると、入力欄で Enter（テキストエリアは Ctrl/Cmd+Enter）を押したときに
   * このボタンが押される。IME 変換確定の Enter は無視する。
   */
  setPrimaryAction: (btn: HTMLButtonElement) => void;
}

// ===== Panel factory =====

export function createLitePanel(opts: LitePanelOptions): LitePanelHandle {
  ensureThemeStyles();
  const old = document.getElementById(opts.id);
  if (old) old.remove();

  const root = document.createElement('div');
  root.id = opts.id;
  root.className = `kus-lp${opts.wide ? ' kus-lp--wide' : ''}`;
  // ダイアログ的なフローティングパネルとして読み上げ環境に伝える（ページ操作は妨げないので非モーダル）
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-modal', 'false');
  applyAccentVars(root, opts.accent);

  const hero = document.createElement('div');
  hero.className = 'kus-lp__hero';
  const heroMain = document.createElement('div');
  heroMain.className = 'kus-lp__hero-main';

  const titleId = `${opts.id}-title`;
  const titleEl = document.createElement('h1');
  titleEl.className = 'kus-lp__title';
  titleEl.id = titleId;
  titleEl.textContent = opts.title;
  root.setAttribute('aria-labelledby', titleId);
  heroMain.appendChild(titleEl);

  if (opts.subtitle) {
    const subEl = document.createElement('p');
    subEl.className = 'kus-lp__subtitle';
    subEl.textContent = opts.subtitle;
    heroMain.appendChild(subEl);
  }

  const badgesEl = document.createElement('div');
  badgesEl.className = 'kus-lp__badge-row';
  const badges = opts.badges || [{ label: 'Lite' }];
  for (const b of badges) {
    const span = document.createElement('span');
    span.className = 'kus-lp__badge';
    span.textContent = b.label;
    badgesEl.appendChild(span);
  }
  heroMain.appendChild(badgesEl);

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'kus-lp__close';
  closeBtn.textContent = '閉じる';

  hero.appendChild(heroMain);
  hero.appendChild(closeBtn);
  root.appendChild(hero);

  const body = document.createElement('div');
  body.className = 'kus-lp__body';

  if (opts.hint) {
    const hint = document.createElement('div');
    hint.className = 'kus-lp__hint';
    hint.innerHTML = opts.hint;
    body.appendChild(hint);
  }

  const status = document.createElement('div');
  status.className = 'kus-lp__status';
  status.dataset.tone = 'neutral';
  status.innerHTML = '<span class="kus-lp__status-icon">·</span><span class="kus-lp__status-text">準備完了</span>';

  const result = document.createElement('pre');
  result.className = 'kus-lp__result kus-lp__result--empty';

  root.appendChild(body);
  document.body.appendChild(root);

  // status & result はパネル下部に「常にあとから」追加されるが、各 lite-ui の
  // body に直接 append する形でも良い。 ここでは body の末尾に追加せず、利用側で
  // 任意位置に挿入できるよう参照のみ返す。デフォルトは body 末尾に置きたい場合に
  // appendStatusAndResult() を呼ぶ。
  body.appendChild(status);
  body.appendChild(result);

  function setStatus(msg: string, tone: StatusTone = 'neutral') {
    status.dataset.tone = tone;
    status.className = 'kus-lp__status' + (tone !== 'neutral' ? ` kus-lp__status--${tone}` : '');
    const icon = tone === 'ok' ? '✓' :
                 tone === 'err' ? '⚠' :
                 tone === 'warn' ? '!' :
                 tone === 'info' ? 'i' :
                 tone === 'busy' ? '' : '·';
    const iconCls = tone === 'busy' ? 'kus-lp__status-icon kus-lp__status-busy' : 'kus-lp__status-icon';
    status.innerHTML = `<span class="${iconCls}">${icon}</span><span class="kus-lp__status-text"></span>`;
    (status.querySelector('.kus-lp__status-text') as HTMLElement).textContent = msg || '';
  }

  function setResult(text: string) {
    if (!text) {
      result.textContent = '';
      result.classList.add('kus-lp__result--empty');
      return;
    }
    result.textContent = text;
    result.classList.remove('kus-lp__result--empty');
  }

  function setResultHtml(html: string) {
    if (!html) {
      result.innerHTML = '';
      result.classList.add('kus-lp__result--empty');
      return;
    }
    result.innerHTML = html;
    result.classList.remove('kus-lp__result--empty');
  }

  function setBusy(busy: boolean) {
    closeBtn.disabled = busy;
    root.style.cursor = busy ? 'progress' : '';
  }

  function close() {
    document.removeEventListener('keydown', onDocKeydown, true);
    root.remove();
    setRootElement(null);
  }

  closeBtn.addEventListener('click', close);

  // ===== 主アクション（実行ボタン）と Enter 送信 =====
  let primaryBtn: HTMLButtonElement | null = null;
  function setPrimaryAction(btn: HTMLButtonElement) {
    primaryBtn = btn;
  }
  function triggerPrimary() {
    if (primaryBtn && !primaryBtn.disabled) primaryBtn.click();
  }
  body.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key !== 'Enter' || e.isComposing || (e as any).keyCode === 229) return;
    const t = e.target as HTMLElement | null;
    if (!t) return;
    const tag = t.tagName;
    if (tag === 'TEXTAREA') {
      // 複数行入力中の誤送信を防ぐため、テキストエリアは Ctrl/Cmd+Enter のみ実行
      if (e.ctrlKey || e.metaKey) { e.preventDefault(); triggerPrimary(); }
      return;
    }
    if (tag === 'INPUT') {
      const type = (t as HTMLInputElement).type;
      if (type === 'checkbox' || type === 'radio' || type === 'file' || type === 'button') return;
      // フィルタ／検索など、独自の Enter 挙動を持つ入力は data-lp-no-submit で除外できる
      if (t.hasAttribute('data-lp-no-submit') || type === 'search') return;
      e.preventDefault();
      triggerPrimary();
    }
  });

  // ===== Esc で閉じる（実行中は閉じない）=====
  function onDocKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape' && !closeBtn.disabled && document.body.contains(root)) {
      e.preventDefault();
      e.stopPropagation();
      close();
    }
  }
  document.addEventListener('keydown', onDocKeydown, true);

  setRootElement(root);

  // 既存 components.ts の setStatus() を lite から流用できるように
  setComponentUi({ status, result, busyText: document.createElement('span') });

  // 開いた直後に最初の入力欄へフォーカスし、キーボードだけで操作を始められるようにする
  requestAnimationFrame(() => {
    const first = body.querySelector<HTMLElement>(
      'input:not([type=hidden]):not([disabled]),select:not([disabled]),textarea:not([disabled])'
    );
    try { first?.focus({ preventScroll: true } as any); } catch { /* noop */ }
  });

  return { root, body, status, result, setStatus, setResult, setResultHtml, setBusy, close, setPrimaryAction };
}

// ===== Element factories =====

export interface RowOptions { label?: string; block?: boolean; help?: string }

export function makeRow(child: HTMLElement | HTMLElement[], opts: RowOptions = {}): HTMLElement {
  const wrap = document.createElement('div');
  wrap.className = 'kus-lp__row' + (opts.block ? ' kus-lp__row--block' : '');
  if (opts.label) {
    const lab = document.createElement('span');
    lab.className = 'kus-lp__label';
    lab.textContent = opts.label;
    wrap.appendChild(lab);
  }
  if (Array.isArray(child)) child.forEach((c) => wrap.appendChild(c));
  else wrap.appendChild(child);
  if (opts.help) {
    const h = document.createElement('div');
    h.className = 'kus-lp__small';
    h.style.width = '100%';
    h.textContent = opts.help;
    wrap.appendChild(h);
  }
  return wrap;
}

export interface InputOptions {
  value?: string;
  width?: 'id' | 'guest' | 'narrow' | 'medium' | 'wide' | 'full';
  type?: string;
  placeholder?: string;
  ariaLabel?: string;
  /** Enter で主アクションを実行させたくない入力（検索・フィルタ等）に true */
  noSubmit?: boolean;
}

export function makeInput(opts: InputOptions = {}): HTMLInputElement {
  const inp = document.createElement('input');
  inp.type = opts.type || 'text';
  if (opts.placeholder) inp.placeholder = opts.placeholder;
  if (opts.value) inp.value = opts.value;
  if (opts.ariaLabel) inp.setAttribute('aria-label', opts.ariaLabel);
  if (opts.noSubmit) inp.setAttribute('data-lp-no-submit', '');
  inp.className = 'kus-lp__input' + (opts.width ? ` kus-lp__input--${opts.width}` : '');
  return inp;
}

export function makeTextarea(opts: { rows?: number; placeholder?: string; value?: string; code?: boolean } = {}): HTMLTextAreaElement {
  const t = document.createElement('textarea');
  t.className = 'kus-lp__textarea' + (opts.code ? ' kus-lp__textarea--code' : '');
  if (opts.rows) t.rows = opts.rows;
  if (opts.placeholder) t.placeholder = opts.placeholder;
  if (opts.value) t.value = opts.value;
  return t;
}

export function makeSelect(options: Array<[string, string]>, defaultValue?: string): HTMLSelectElement {
  const sel = document.createElement('select');
  sel.className = 'kus-lp__select';
  for (const [v, t] of options) {
    const o = document.createElement('option');
    o.value = v;
    o.textContent = t;
    if (defaultValue !== undefined && v === defaultValue) o.selected = true;
    sel.appendChild(o);
  }
  return sel;
}

export type ButtonVariant = 'primary' | 'run' | 'ghost' | 'sub' | 'danger';

export function makeButton(label: string, variant: ButtonVariant = 'primary', opts: { icon?: string } = {}): HTMLButtonElement {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = `kus-lp__btn kus-lp__btn--${variant}`;
  if (opts.icon) {
    const i = document.createElement('span');
    i.textContent = opts.icon;
    i.style.cssText = 'font-size:14px;line-height:1';
    b.appendChild(i);
  }
  const t = document.createElement('span');
  t.textContent = label;
  b.appendChild(t);
  return b;
}

export interface CheckOptions { label: string; checked?: boolean; help?: string; value?: string }

export function makeCheck(opts: CheckOptions): { label: HTMLLabelElement; checkbox: HTMLInputElement } {
  const lab = document.createElement('label');
  lab.className = 'kus-lp__check';
  const cb = document.createElement('input');
  cb.type = 'checkbox';
  if (opts.checked) cb.checked = true;
  if (opts.value !== undefined) cb.value = opts.value;
  lab.appendChild(cb);
  lab.appendChild(document.createTextNode(opts.label));
  if (opts.help) lab.title = opts.help;
  return { label: lab, checkbox: cb };
}

export function makeChip(opts: CheckOptions): { label: HTMLLabelElement; checkbox: HTMLInputElement } {
  const lab = document.createElement('label');
  lab.className = 'kus-lp__chip';
  const cb = document.createElement('input');
  cb.type = 'checkbox';
  if (opts.checked) cb.checked = true;
  if (opts.value !== undefined) cb.value = opts.value;
  lab.appendChild(cb);
  lab.appendChild(document.createTextNode(opts.label));
  if (opts.help) lab.title = opts.help;
  return { label: lab, checkbox: cb };
}

export interface CardOptions { title?: string; number?: number; subtitle?: string; soft?: boolean }

export function makeCard(opts: CardOptions = {}): { card: HTMLElement; body: HTMLElement; actions: HTMLElement } {
  const card = document.createElement('div');
  card.className = 'kus-lp__card' + (opts.soft ? ' kus-lp__card--soft' : '');
  const head = document.createElement('div');
  head.className = 'kus-lp__card-head';
  if (opts.title || opts.number) {
    const t = document.createElement('div');
    t.className = 'kus-lp__card-title';
    if (opts.number) {
      const n = document.createElement('span');
      n.className = 'kus-lp__card-num';
      n.textContent = String(opts.number);
      t.appendChild(n);
    }
    if (opts.title) t.appendChild(document.createTextNode(opts.title));
    head.appendChild(t);
  }
  const actions = document.createElement('div');
  actions.className = 'kus-lp__card-actions';
  head.appendChild(actions);
  card.appendChild(head);

  const body = document.createElement('div');
  card.appendChild(body);

  if (opts.subtitle) {
    const s = document.createElement('div');
    s.className = 'kus-lp__small';
    s.style.cssText = 'margin:-4px 0 8px';
    s.textContent = opts.subtitle;
    body.appendChild(s);
  }
  return { card, body, actions };
}

export function makeNote(text: string, kind: 'plain' | 'warn' = 'plain'): HTMLElement {
  const n = document.createElement('div');
  n.className = kind === 'warn' ? 'kus-lp__note--warn' : 'kus-lp__note';
  n.textContent = text;
  return n;
}

export function makeDetails(title: string, opts: { open?: boolean } = {}): { details: HTMLDetailsElement; body: HTMLElement } {
  const d = document.createElement('details');
  d.className = 'kus-lp__details';
  if (opts.open) d.open = true;
  const s = document.createElement('summary');
  s.textContent = title;
  const b = document.createElement('div');
  b.className = 'kus-lp__details-body';
  d.appendChild(s);
  d.appendChild(b);
  return { details: d, body: b };
}

// ===== App table（複数アプリ × アプリごとのゲストスペース入力） =====

export interface AppTableRow { appId: string; guestId: string; appName?: string }
export interface AppTablePutResult { action: 'added' | 'filled' | 'existing' | 'ignored'; index: number }

export interface AppTableOptions {
  /** 初期行。未指定なら空の 1 行を表示する */
  initial?: AppTableRow[];
  /** 「現在のアプリ」ボタンに入れる既定アプリ ID（指定時のみボタン表示） */
  currentAppId?: string;
  appPlaceholder?: string;
  guestPlaceholder?: string;
  /** 常に表示しておく最小行数（既定 1）。これ以下は削除せずクリアする */
  minRows?: number;
  /** 行の追加・削除・編集が起きたら呼ばれる */
  onChange?: (rows: AppTableRow[]) => void;
}

export interface AppTableHandle {
  element: HTMLElement;
  /** appId が入力済みの行のみ（appId+guestId の重複は除去） */
  getApps(): AppTableRow[];
  /** 空行を含む全行 */
  getAllRows(): AppTableRow[];
  /** 先頭行（単一アプリ用途）。空でも空文字で返す */
  first(): AppTableRow;
  /** 末尾に 1 行追加して返す */
  addRow(appId?: string, guestId?: string, opts?: { focus?: boolean; appName?: string }): void;
  /** 空行を優先してセットし、同じ appId+guestId が既にあれば行を増やさない */
  putApp(appId?: string, guestId?: string, opts?: { focus?: boolean; appName?: string }): AppTablePutResult;
  /** 既存行をすべて置き換える（rows が空なら空 1 行） */
  setApps(rows: AppTableRow[]): void;
  /** 全行を空にする（最小行数は残す） */
  clear(): void;
  /** appId が入力済みの行数 */
  count(): number;
}

interface AppTableRowEntry {
  tr: HTMLTableRowElement;
  app: HTMLInputElement;
  guest: HTMLInputElement;
  name: HTMLElement;
  appName: string;
  copyBtn: HTMLButtonElement;
}

/**
 * 「アプリID + ゲストスペース」を表形式で 1〜N 件入力するコンポーネント。
 * - 1 行だけ使えば単一アプリ指定、複数行で一括処理に使える（単一/複数を分けない）
 * - アプリごとに異なるゲストスペースを指定できる
 * - 各行に「↑コピー」（上の行の内容をコピー）「複製」「×（削除）」を備える
 */
export function makeAppTable(opts: AppTableOptions = {}): AppTableHandle {
  const minRows = Math.max(1, opts.minRows ?? 1);
  const wrap = document.createElement('div');
  wrap.className = 'kus-lp__apptable';

  const tableScroll = document.createElement('div');
  tableScroll.className = 'kus-lp__apptable-scroll';
  const table = document.createElement('table');
  const thead = document.createElement('thead');
  thead.innerHTML =
    '<tr><th class="kus-lp__apptable-no" scope="col">#</th>' +
    '<th scope="col">アプリID</th>' +
    '<th scope="col">ゲストID</th>' +
    '<th class="kus-lp__apptable-acts-h" scope="col">操作</th></tr>';
  table.appendChild(thead);
  const tbody = document.createElement('tbody');
  table.appendChild(tbody);
  tableScroll.appendChild(table);
  wrap.appendChild(tableScroll);

  const foot = document.createElement('div');
  foot.className = 'kus-lp__apptable-foot';
  const addBtn = makeButton('＋ 行を追加', 'sub');
  foot.appendChild(addBtn);
  if (opts.currentAppId && /^\d+$/.test(String(opts.currentAppId).trim())) {
    const curBtn = makeButton('現在のアプリ', 'sub');
    curBtn.title = '今開いているアプリのIDを空き行に入れます';
    curBtn.addEventListener('click', () => {
      const id = String(opts.currentAppId).trim();
      if (rows.some((r) => r.app.value.trim() === id)) return;
      const empty = rows.find((r) => !r.app.value.trim());
      if (empty) { empty.app.value = id; setAppName(empty, ''); empty.app.focus(); }
      else insertRow(rows.length, id, '', true);
      emitChange();
    });
    foot.appendChild(curBtn);
  }
  const count = document.createElement('span');
  count.className = 'kus-lp__apptable-count';
  foot.appendChild(count);
  wrap.appendChild(foot);

  const hint = document.createElement('div');
  hint.className = 'kus-lp__apptable-hint';
  hint.textContent = 'アプリIDは「100, 120, 130」のようにカンマ区切りでまとめて入力・貼り付けすると自動で行に分割されます。';
  wrap.appendChild(hint);

  const rows: AppTableRowEntry[] = [];

  function getApps(): AppTableRow[] {
    const seen = new Set<string>();
    const out: AppTableRow[] = [];
    for (const r of rows) {
      const appId = r.app.value.trim();
      if (!appId) continue;
      const guestId = r.guest.value.trim();
      const key = `${appId}::${guestId}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const row: AppTableRow = { appId, guestId };
      if (r.appName) row.appName = r.appName;
      out.push(row);
    }
    return out;
  }
  function getAllRows(): AppTableRow[] {
    return rows.map((r) => {
      const row: AppTableRow = { appId: r.app.value.trim(), guestId: r.guest.value.trim() };
      if (r.appName) row.appName = r.appName;
      return row;
    });
  }
  function setAppName(entry: AppTableRowEntry, appName: string) {
    entry.appName = String(appName || '').trim();
    entry.name.textContent = entry.appName;
    entry.name.title = entry.appName ? `アプリ名: ${entry.appName}` : '';
    entry.name.classList.toggle('kus-lp__apptable-name--empty', !entry.appName);
  }
  function setRowValues(entry: AppTableRowEntry, appId: string, guestId: string, appName: string) {
    entry.app.value = appId;
    entry.guest.value = guestId;
    setAppName(entry, appName);
  }
  function refresh() {
    rows.forEach((r, i) => {
      const no = r.tr.querySelector('.kus-lp__apptable-no') as HTMLElement | null;
      if (no) no.textContent = String(i + 1);
      r.copyBtn.disabled = i === 0;
    });
    const n = getApps().length;
    count.textContent = n ? `${n} アプリ` : '未入力';
  }
  function emitChange() {
    refresh();
    opts.onChange?.(getApps());
  }
  /**
   * 1 つのアプリID入力欄に「100, 120, 130」のようにカンマ区切りで入力された値を、
   * 先頭をその行に残し、残りを直後の行へ分割展開する。
   * @returns 分割が発生したら true
   */
  function distributeAppTokens(entry: AppTableRowEntry): boolean {
    const raw = entry.app.value;
    if (!/[,、\s]/.test(raw)) return false;
    const tokens = raw.split(/[,、\s]+/).map((t) => t.trim()).filter(Boolean);
    if (tokens.length <= 1) {
      // 区切り文字だけ / 末尾カンマなどは正規化（先頭トークンのみ残す）
      const next = tokens[0] || '';
      if (entry.app.value !== next) { entry.app.value = next; setAppName(entry, ''); return true; }
      return false;
    }
    entry.app.value = tokens[0];
    setAppName(entry, '');
    const guestVal = entry.guest.value.trim();
    const start = rows.indexOf(entry);
    let last = entry;
    for (let k = 1; k < tokens.length; k += 1) {
      last = insertRow(start + k, tokens[k], guestVal, false);
    }
    try { last.app.focus(); } catch { /* noop */ }
    return true;
  }
  function removeRow(entry: AppTableRowEntry) {
    if (rows.length <= minRows) {
      entry.app.value = '';
      entry.guest.value = '';
      setAppName(entry, '');
      emitChange();
      return;
    }
    const idx = rows.indexOf(entry);
    if (idx >= 0) rows.splice(idx, 1);
    entry.tr.remove();
    emitChange();
  }
  function insertRow(index: number, appId = '', guestId = '', focus = false, appName = ''): AppTableRowEntry {
    const tr = document.createElement('tr');
    const tdNo = document.createElement('td');
    tdNo.className = 'kus-lp__apptable-no';
    const tdApp = document.createElement('td');
    const tdGuest = document.createElement('td');
    const tdAct = document.createElement('td');
    tdAct.className = 'kus-lp__apptable-acts';

    const app = makeInput({ placeholder: opts.appPlaceholder || 'アプリID（カンマ区切りで複数可）', ariaLabel: 'アプリID' });
    const guest = makeInput({ placeholder: opts.guestPlaceholder || '空欄=通常スペース', ariaLabel: 'ゲストID' });
    app.value = appId;
    guest.value = guestId;
    const name = document.createElement('div');
    name.className = 'kus-lp__apptable-name';

    const copyBtn = makeButton('↑コピー', 'sub');
    copyBtn.title = '上の行のアプリID・ゲストIDをこの行へコピー';
    const dupBtn = makeButton('複製', 'sub');
    dupBtn.title = 'この行を下に複製';
    const delBtn = makeButton('×', 'ghost');
    delBtn.title = 'この行を削除';

    tdApp.appendChild(app);
    tdApp.appendChild(name);
    tdGuest.appendChild(guest);
    tdAct.appendChild(copyBtn);
    tdAct.appendChild(dupBtn);
    tdAct.appendChild(delBtn);
    tr.appendChild(tdNo);
    tr.appendChild(tdApp);
    tr.appendChild(tdGuest);
    tr.appendChild(tdAct);

    const entry: AppTableRowEntry = { tr, app, guest, name, appName: '', copyBtn };
    setAppName(entry, appName);

    copyBtn.addEventListener('click', () => {
      const idx = rows.indexOf(entry);
      if (idx <= 0) return;
      const prev = rows[idx - 1];
      app.value = prev.app.value;
      guest.value = prev.guest.value;
      setAppName(entry, prev.appName);
      app.focus();
      emitChange();
    });
    dupBtn.addEventListener('click', () => {
      const idx = rows.indexOf(entry);
      const ne = insertRow(idx + 1, app.value.trim(), guest.value.trim(), true, entry.appName);
      ne.app.focus();
      emitChange();
    });
    delBtn.addEventListener('click', () => removeRow(entry));
    app.addEventListener('input', () => { if (entry.appName) setAppName(entry, ''); emitChange(); });
    guest.addEventListener('input', emitChange);
    // カンマ（,／、）・空白・改行区切りで複数アプリIDをまとめて入力したら自動で行へ分割する。
    // 入力途中の誤分割を避けるため、確定（change/blur）時とペースト時にのみ分割する。
    app.addEventListener('change', () => { if (distributeAppTokens(entry)) emitChange(); });
    app.addEventListener('paste', (ev: ClipboardEvent) => {
      const text = ev.clipboardData?.getData('text') || '';
      if (!/[,、\s]/.test(text)) return;
      ev.preventDefault();
      const combined = [app.value.trim(), text].filter(Boolean).join(',');
      app.value = combined;
      if (distributeAppTokens(entry)) emitChange();
    });

    const at = Math.min(Math.max(index, 0), rows.length);
    if (at >= rows.length) tbody.appendChild(tr);
    else tbody.insertBefore(tr, rows[at].tr);
    rows.splice(at, 0, entry);
    refresh();
    if (focus) app.focus();
    return entry;
  }

  addBtn.addEventListener('click', () => {
    const e = insertRow(rows.length, '', '', true);
    e.app.focus();
    emitChange();
  });

  function putApp(appId = '', guestId = '', o: { focus?: boolean; appName?: string } = {}): AppTablePutResult {
    const id = String(appId || '').trim();
    if (!id) return { action: 'ignored', index: -1 };
    const guest = String(guestId || '').trim();
    const appName = String(o.appName || '').trim();
    const empty = rows.find((r) => !r.app.value.trim());
    const targetGuest = guest || empty?.guest.value.trim() || '';
    const existing = rows.find((r) => r.app.value.trim() === id && r.guest.value.trim() === targetGuest);
    if (existing) {
      if (appName && existing.appName !== appName) {
        setAppName(existing, appName);
        emitChange();
      }
      if (o.focus) existing.app.focus();
      return { action: 'existing', index: rows.indexOf(existing) };
    }
    if (empty) {
      setRowValues(empty, id, targetGuest, appName);
      if (o.focus) empty.app.focus();
      emitChange();
      return { action: 'filled', index: rows.indexOf(empty) };
    }
    const entry = insertRow(rows.length, id, guest, !!o.focus, appName);
    emitChange();
    return { action: 'added', index: rows.indexOf(entry) };
  }

  function setApps(list: AppTableRow[]) {
    rows.splice(0).forEach((r) => r.tr.remove());
    tbody.innerHTML = '';
    const src = Array.isArray(list) && list.length ? list : [{ appId: '', guestId: '' }];
    src.forEach((r) => insertRow(
      rows.length,
      String(r.appId || '').trim(),
      String(r.guestId || '').trim(),
      false,
      String(r.appName || '').trim()
    ));
    while (rows.length < minRows) insertRow(rows.length, '', '');
    emitChange();
  }

  // 初期化
  setApps(opts.initial || []);

  return {
    element: wrap,
    getApps,
    getAllRows,
    first: () => {
      const r = rows[0];
      if (!r) return { appId: '', guestId: '' };
      const row: AppTableRow = { appId: r.app.value.trim(), guestId: r.guest.value.trim() };
      if (r.appName) row.appName = r.appName;
      return row;
    },
    addRow: (appId = '', guestId = '', o = {}) => { insertRow(rows.length, appId, guestId, !!o.focus, String(o.appName || '').trim()); emitChange(); },
    putApp,
    setApps,
    clear: () => setApps([]),
    count: () => getApps().length
  };
}

// ===== Tab bar =====

export interface TabSpec { id: string; label: string; build: (panel: HTMLElement) => void }

export function makeTabs(specs: TabSpec[], opts: { initial?: string } = {}): { bar: HTMLElement; panels: HTMLElement } {
  const bar = document.createElement('div');
  bar.className = 'kus-lp__tabs';
  bar.setAttribute('role', 'tablist');
  const panels = document.createElement('div');
  panels.className = 'kus-lp__tab-panels';

  const tabBtns: HTMLButtonElement[] = [];
  const tabPanels: HTMLElement[] = [];

  function activate(id: string) {
    specs.forEach((spec, i) => {
      const on = spec.id === id;
      tabBtns[i].setAttribute('aria-selected', on ? 'true' : 'false');
      tabPanels[i].hidden = !on;
    });
  }

  specs.forEach((spec) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'kus-lp__tab';
    btn.setAttribute('role', 'tab');
    btn.textContent = spec.label;
    btn.dataset.tab = spec.id;
    btn.addEventListener('click', () => activate(spec.id));
    bar.appendChild(btn);
    tabBtns.push(btn);

    const panel = document.createElement('div');
    panel.className = 'kus-lp__tab-panel';
    panel.setAttribute('role', 'tabpanel');
    panel.hidden = true;
    spec.build(panel);
    panels.appendChild(panel);
    tabPanels.push(panel);
  });

  const initial = opts.initial || specs[0]?.id;
  if (initial) activate(initial);
  return { bar, panels };
}

// ===== Async wrapper =====

/** lite-ui の非同期処理共通ラッパー。エラーは setStatus(..., 'err') に流す */
export async function liteRun<T>(
  panel: LitePanelHandle,
  busyMsg: string,
  fn: () => Promise<T>,
  okMsg?: string
): Promise<T | undefined> {
  panel.setStatus(busyMsg, 'busy');
  panel.setBusy(true);
  try {
    const out = await fn();
    const tone = panel.status.dataset.tone;
    if (okMsg && tone !== 'err') {
      // 処理側が警告（err トーン）を出して正常終了した場合は、成功メッセージで上書きしない
      panel.setStatus(okMsg, 'ok');
    } else if (tone === 'busy') {
      // 処理側の最終メッセージ（「…完了」など）がスピナー付きのまま残らないよう成功トーンへ切り替える
      const text = panel.status.querySelector('.kus-lp__status-text')?.textContent || '';
      panel.setStatus(text || '完了', 'ok');
    }
    return out;
  } catch (e: any) {
    const message = String(e?.message || e || '不明なエラー');
    const lines = message.split('\n').map((line) => line.trim()).filter(Boolean);
    const [first, ...rest] = lines.length ? lines : [message];
    // 1 行目（要点）はステータスへ、部分成功の内訳や API コンテキストは下のログへ出す
    panel.setStatus(`エラー: ${first}${rest.length ? '（詳細は下のログ）' : ''}`, 'err');
    if (rest.length) panel.setResult(lines.join('\n'));
    return undefined;
  } finally {
    panel.setBusy(false);
  }
}
