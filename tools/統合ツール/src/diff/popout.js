'use strict';

import { state } from '../state.js';
import { getRoot, getToolWindow } from '../ui/dialog.js';
import { saveCurrentDialogState } from '../ui/dialog.js';
import { renderResultRows } from './export.js';

const WIN_NAME = 'kintone-diff-viewer-v2';
let popoutClickHandler = null;
let popoutChangeHandler = null;
let popoutMousedownHandler = null;

function teardownPopoutListeners(doc) {
  if (!doc) return;
  if (popoutClickHandler) doc.removeEventListener('click', popoutClickHandler, true);
  if (popoutChangeHandler) doc.removeEventListener('change', popoutChangeHandler);
  if (popoutMousedownHandler) doc.removeEventListener('mousedown', popoutMousedownHandler, true);
  popoutClickHandler = null;
  popoutChangeHandler = null;
  popoutMousedownHandler = null;
}

function setupPopoutListeners(win) {
  const doc = win.document;
  teardownPopoutListeners(doc);

  popoutChangeHandler = (e) => {
    const diffId = e.target?.dataset?.diffRowId;
    if (!diffId || e.target.type !== 'checkbox') return;
    const res = e.target.closest?.('#u_diffPopoutResult');
    if (res?.contains(e.target)) state.diffSelectionAnchorId = diffId;
    if (e.target.checked) state.diffSelectedIds.add(diffId);
    else state.diffSelectedIds.delete(diffId);
    renderResultRows(state.lastDiffRows || []);
    saveCurrentDialogState();
  };
  doc.addEventListener('change', popoutChangeHandler);

  popoutMousedownHandler = (e) => {
    const cb = e.target.closest('input[type=checkbox][data-diff-row-id]');
    if (!cb) return;
    const res = doc.getElementById('u_diffPopoutResult');
    if (!res || !res.contains(cb) || !e.shiftKey || !state.diffSelectionAnchorId) return;
    const boxes = [...res.querySelectorAll('tbody input[type=checkbox][data-diff-row-id]')];
    const ids = boxes.map((el) => el.dataset.diffRowId);
    const i0 = ids.indexOf(state.diffSelectionAnchorId);
    const i1 = ids.indexOf(cb.dataset.diffRowId);
    if (i0 < 0 || i1 < 0) return;
    e.preventDefault();
    const a = Math.min(i0, i1);
    const b = Math.max(i0, i1);
    const anchorEl = boxes.find((el) => el.dataset.diffRowId === state.diffSelectionAnchorId);
    const anchorChecked = anchorEl ? !!anchorEl.checked : true;
    for (let i = a; i <= b; i++) {
      const id = ids[i];
      if (anchorChecked) state.diffSelectedIds.add(id);
      else state.diffSelectedIds.delete(id);
    }
    renderResultRows(state.lastDiffRows || []);
    saveCurrentDialogState();
  };
  doc.addEventListener('mousedown', popoutMousedownHandler, true);

  popoutClickHandler = (e) => {
    const head = e.target.closest?.('[data-diff-sec-toggle]');
    if (head) {
      const key = head.dataset.diffSecToggle;
      if (key) {
        if (state.diffCollapsedSections.has(key)) state.diffCollapsedSections.delete(key);
        else state.diffCollapsedSections.add(key);
        renderResultRows(state.lastDiffRows || []);
        e.preventDefault();
      }
      return;
    }
    const more = e.target.closest?.('[data-act="moreDiffRows"]');
    if (more) {
      const sec = more.dataset.sec;
      if (sec) {
        const cur = state.diffSectionVisibleCounts[sec] || 80;
        state.diffSectionVisibleCounts[sec] = cur + 120;
        renderResultRows(state.lastDiffRows || []);
        e.preventDefault();
      }
    }
  };
  doc.addEventListener('click', popoutClickHandler, true);
}

export function openDiffViewerPopout() {
  const toolWin = getToolWindow();
  const prev = toolWin.__KUS_DIFF_WIN__;
  if (prev && !prev.closed) {
    try { prev.focus(); } catch (e) { /* ignore */ }
    syncDiffPopoutMirror();
    return prev;
  }

  const mainRoot = getRoot();
  const styleSrc = mainRoot?.querySelector('style');

  const w = toolWin.open('', WIN_NAME, 'width=1440,height=960');
  if (!w) {
    return null;
  }

  w.document.open();
  w.document.write(
    '<!DOCTYPE html><html lang="ja"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>差分ビュー（拡大）</title></head>' +
    '<body style="margin:0;background:#0f172a;font-family:system-ui,sans-serif"></body></html>'
  );
  w.document.close();

  if (styleSrc) {
    w.document.head.appendChild(styleSrc.cloneNode(true));
  }

  const shell = w.document.createElement('div');
  shell.id = 'kintone-unified-suite-v2';
  shell.style.cssText = 'position:relative;min-height:100vh;box-sizing:border-box;padding:0;';
  shell.innerHTML = `
    <div class="diff-popout-head" style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 14px;background:linear-gradient(135deg,#0f4c81,#2563eb);color:#fff;font-size:12px">
      <div><strong>差分ビュー（別ウィンドウ）</strong> · メイン画面と選択・折り畳みは同期します</div>
      <button type="button" class="btn sub" id="diffPopoutClose" style="background:rgba(255,255,255,.2);color:#fff;border:0">閉じる</button>
    </div>
    <div class="card result-card" style="margin:0;border-radius:0;border-left:0;border-right:0">
      <div class="result" id="u_diffPopoutResult" style="max-height:none;min-height:calc(100vh - 52px)"></div>
    </div>`;
  w.document.body.appendChild(shell);

  w.document.getElementById('diffPopoutClose')?.addEventListener('click', () => {
    try { w.close(); } catch (e) { /* ignore */ }
  });

  toolWin.__KUS_DIFF_WIN__ = w;
  setupPopoutListeners(w);

  w.addEventListener('beforeunload', () => {
    teardownPopoutListeners(w.document);
    if (toolWin.__KUS_DIFF_WIN__ === w) toolWin.__KUS_DIFF_WIN__ = null;
  });

  syncDiffPopoutMirror();
  try { w.focus(); } catch (e) { /* ignore */ }
  return w;
}

export function syncDiffPopoutMirror() {
  const w = getToolWindow().__KUS_DIFF_WIN__;
  if (!w || w.closed) return;
  const mount = w.document.getElementById('u_diffPopoutResult');
  const root = getRoot();
  const src = root?.querySelector('#u_result');
  if (mount && src) {
    mount.innerHTML = src.innerHTML;
  }
}

export function closeDiffViewerPopout() {
  const toolWin = getToolWindow();
  const w = toolWin.__KUS_DIFF_WIN__;
  if (w && !w.closed) {
    try { w.close(); } catch (e) { /* ignore */ }
  }
  toolWin.__KUS_DIFF_WIN__ = null;
}
