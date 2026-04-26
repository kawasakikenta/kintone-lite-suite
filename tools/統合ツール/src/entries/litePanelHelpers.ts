'use strict';

/**
 * lite-entry 群（差分/フィールド/JS設定/プロセス/レコード/設定取得 など）で
 * 重複していた DOM ファクトリを集約する。
 *
 * `liteMount.mountKusLitePanel()` で生成した `bodySlot` に追加することを想定。
 */

import { setStatus } from '../ui/components.js';

const INPUT_BASE = 'padding:6px 10px;border:1px solid #e2e8f0;border-radius:8px;font-size:12px';
const BTN_BASE = 'padding:8px 14px;font-size:12px;font-weight:700;border:none;border-radius:10px;color:#fff;cursor:pointer';
const ROW_BASE = 'display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-bottom:10px';
const ROW_LABEL_BASE = 'font-size:12px;font-weight:600;color:#334155;min-width:6em';

/** ラベル + 子要素を 1 行にまとめる。lite パネルで多用される並び。 */
export function row(labelHtml: string, child: HTMLElement, options: { labelMinWidth?: string } = {}): HTMLElement {
  const wrap = document.createElement('div');
  wrap.style.cssText = ROW_BASE;
  const lab = document.createElement('span');
  const minWidth = options.labelMinWidth ? `min-width:${options.labelMinWidth}` : ROW_LABEL_BASE.split(';').slice(-1)[0];
  lab.style.cssText = `${ROW_LABEL_BASE.split(';').slice(0, -1).join(';')};${minWidth}`;
  lab.innerHTML = labelHtml;
  wrap.appendChild(lab);
  wrap.appendChild(child);
  return wrap;
}

export interface MkInputOptions {
  /** 既存値（既定: 空） */
  value?: string;
  /** 幅プリセット: narrow=120px / wide=260px / full=100% (既定: narrow) */
  width?: 'narrow' | 'wide' | 'full';
  /** input type を指定（既定: text） */
  type?: string;
}

/** プレースホルダー入力。lite パネルの統一スタイル。 */
export function mkInput(placeholder: string, options: MkInputOptions = {}): HTMLInputElement {
  const inp = document.createElement('input');
  inp.type = options.type || 'text';
  inp.placeholder = placeholder;
  if (options.value) inp.value = options.value;
  let widthCss: string;
  if (options.width === 'wide') widthCss = 'width:min(260px,80vw)';
  else if (options.width === 'full') widthCss = 'width:100%;box-sizing:border-box';
  else widthCss = 'width:min(120px,40vw)';
  inp.style.cssText = `${widthCss};${INPUT_BASE}`;
  return inp;
}

/** lite パネルの実行ボタン。背景色グラデーションを差し替えられる。 */
export function mkBtn(text: string, options: { bg?: string; marginTop?: string } = {}): HTMLButtonElement {
  const b = document.createElement('button');
  b.type = 'button';
  b.textContent = text;
  const bg = options.bg || 'linear-gradient(180deg,#3b82f6,#2563eb)';
  const mt = options.marginTop || '6px';
  b.style.cssText = `${BTN_BASE};background:${bg};margin-top:${mt}`;
  return b;
}

/** チェックボックス + ラベルの組（横並び小さめ）。 */
export function mkOption(text: string): { label: HTMLLabelElement; checkbox: HTMLInputElement } {
  const label = document.createElement('label');
  label.style.cssText = 'font-size:11px;color:#475569;display:inline-flex;align-items:center;gap:4px;cursor:pointer';
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  label.appendChild(checkbox);
  label.appendChild(document.createTextNode(text));
  return { label, checkbox };
}

/** 折りたたみ可能なセクション（`<details>`）。lite パネル内のグループ化に使う。 */
export function mkSection(title: string): { sec: HTMLDetailsElement; body: HTMLDivElement } {
  const sec = document.createElement('details');
  sec.style.cssText = 'border:1px solid #e2e8f0;border-radius:8px;padding:10px;margin-bottom:10px;background:#fafafa';
  const sum = document.createElement('summary');
  sum.style.cssText = 'font-size:12px;font-weight:700;cursor:pointer;color:#1e293b';
  sum.textContent = title;
  sec.appendChild(sum);
  const body = document.createElement('div');
  body.style.cssText = 'margin-top:10px';
  sec.appendChild(body);
  return { sec, body };
}

/** 説明テキストの小ノート（パネル内の補足）。 */
export function mkNote(text: string): HTMLDivElement {
  const note = document.createElement('div');
  note.style.cssText = 'font-size:11px;color:#64748b;margin:-4px 0 8px;line-height:1.45';
  note.textContent = text;
  return note;
}

/**
 * lite-entry の非同期ハンドラ共通ラッパ。
 * try/catch + setStatus のボイラープレートを集約する。
 */
export async function liteRun<T>(fn: () => Promise<T>, busyMessage?: string): Promise<T | undefined> {
  if (busyMessage) setStatus(busyMessage);
  try {
    return await fn();
  } catch (e: any) {
    setStatus(e?.message || String(e), true);
    return undefined;
  }
}
