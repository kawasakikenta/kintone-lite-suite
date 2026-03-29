'use strict';

import {
  TOOL_ID,
  DIALOG_MARGIN,
  DIALOG_MIN_WIDTH,
  DIALOG_MIN_HEIGHT,
  DIALOG_DEFAULT_WIDTH,
  DIALOG_DEFAULT_HEIGHT,
  DIALOG_LARGE_WIDTH,
  DIALOG_LARGE_HEIGHT
} from '../constants.js';
import { state, saveDialogState, loadDialogState } from '../state.js';
import { esc } from '../utils.js';

let root = null;
let ui = {};
let dialogResizeObserver = null;
let dialogResizeSaveTimer = 0;
let dialogDragState = null;
let dialogDragMoveHandler = null;
let dialogDragEndHandler = null;

let scheduleGuidedTourLayoutFn = null;

export function setScheduleGuidedTourLayout(fn) {
  scheduleGuidedTourLayoutFn = fn;
}

function callScheduleGuidedTourLayout() {
  if (typeof scheduleGuidedTourLayoutFn === 'function') scheduleGuidedTourLayoutFn();
}

export function getRoot() {
  return root;
}

/** ツールUIが載っている document（別タブ表示時は子ウィンドウ） */
export function getToolDocument() {
  return root?.ownerDocument || document;
}

export function getToolWindow() {
  const d = getToolDocument();
  return d.defaultView || window;
}

export function getUi() {
  return ui;
}

export function setUiRefs(uiRefs) {
  ui = uiRefs;
}

export function setRootElement(el) {
  root = el;
}

function clampDialogPosition(left, top, width, height) {
  const dialogWidth = Math.max(320, Math.round(Number(width) || root?.offsetWidth || DIALOG_DEFAULT_WIDTH));
  const dialogHeight = Math.max(240, Math.round(Number(height) || root?.offsetHeight || DIALOG_DEFAULT_HEIGHT));
  const tw = getToolWindow();
  const viewportWidth = Math.max(dialogWidth + (DIALOG_MARGIN * 2), tw.innerWidth || dialogWidth);
  const viewportHeight = Math.max(dialogHeight + (DIALOG_MARGIN * 2), tw.innerHeight || dialogHeight);
  const maxLeft = Math.max(DIALOG_MARGIN, viewportWidth - dialogWidth - DIALOG_MARGIN);
  const maxTop = Math.max(DIALOG_MARGIN, viewportHeight - dialogHeight - DIALOG_MARGIN);
  const fallbackLeft = maxLeft;
  const fallbackTop = DIALOG_MARGIN;
  const nextLeft = Math.min(maxLeft, Math.max(DIALOG_MARGIN, Math.round(Number.isFinite(Number(left)) ? Number(left) : fallbackLeft)));
  const nextTop = Math.min(maxTop, Math.max(DIALOG_MARGIN, Math.round(Number.isFinite(Number(top)) ? Number(top) : fallbackTop)));
  return { left: nextLeft, top: nextTop, maxLeft, maxTop };
}

export function getDefaultDialogPosition(width, height) {
  const dialogWidth = Math.round(Number(width) || root?.offsetWidth || DIALOG_DEFAULT_WIDTH);
  const dialogHeight = Math.round(Number(height) || root?.offsetHeight || DIALOG_DEFAULT_HEIGHT);
  const tw = getToolWindow();
  return clampDialogPosition((tw.innerWidth || dialogWidth) - dialogWidth - DIALOG_MARGIN, DIALOG_MARGIN, dialogWidth, dialogHeight);
}

export function getCurrentDialogPosition(width, height) {
  const rect = root.getBoundingClientRect();
  const defaultPos = getDefaultDialogPosition(width || rect.width, height || rect.height);
  const rawLeft = Number.parseFloat(root.style.left);
  const rawTop = Number.parseFloat(root.style.top);
  const left = Number.isFinite(rawLeft) ? rawLeft : (rect.left || defaultPos.left);
  const top = Number.isFinite(rawTop) ? rawTop : (rect.top || defaultPos.top);
  return clampDialogPosition(left, top, width || rect.width, height || rect.height);
}

function getDialogSizeBounds() {
  const tw = getToolWindow();
  const maxWidth = Math.max(360, Math.floor((tw.innerWidth || DIALOG_DEFAULT_WIDTH) - (DIALOG_MARGIN * 2)));
  const maxHeight = Math.max(320, Math.floor((tw.innerHeight || DIALOG_DEFAULT_HEIGHT) - (DIALOG_MARGIN * 2)));
  return {
    minWidth: Math.min(DIALOG_MIN_WIDTH, maxWidth),
    minHeight: Math.min(DIALOG_MIN_HEIGHT, maxHeight),
    maxWidth,
    maxHeight
  };
}

function clampDialogSize(width, height) {
  const bounds = getDialogSizeBounds();
  const nextWidth = Math.max(bounds.minWidth, Math.min(bounds.maxWidth, Math.round(Number(width) || DIALOG_DEFAULT_WIDTH)));
  const nextHeight = Math.max(bounds.minHeight, Math.min(bounds.maxHeight, Math.round(Number(height) || DIALOG_DEFAULT_HEIGHT)));
  return { ...bounds, width: nextWidth, height: nextHeight };
}

export function applyDialogSize(width, height, options = {}) {
  const next = clampDialogSize(width, height);
  root.style.width = `${next.width}px`;
  root.style.height = `${next.height}px`;
  const currentPos = getCurrentDialogPosition(next.width, next.height);
  root.style.left = `${currentPos.left}px`;
  root.style.top = `${currentPos.top}px`;
  root.style.right = 'auto';
  root.style.bottom = 'auto';
  if (options.persist !== false) scheduleDialogSizeSave();
  return next;
}

export function applyDialogPosition(left, top, options = {}) {
  const rect = root.getBoundingClientRect();
  const next = clampDialogPosition(left, top, rect.width || root.offsetWidth, rect.height || root.offsetHeight);
  root.style.left = `${next.left}px`;
  root.style.top = `${next.top}px`;
  root.style.right = 'auto';
  root.style.bottom = 'auto';
  if (options.persist !== false) scheduleDialogSizeSave();
  if (state.guidedTourActive) callScheduleGuidedTourLayout();
  return next;
}

export function applyDialogSizePreset(mode) {
  if (mode === 'large') {
    return applyDialogSize(DIALOG_LARGE_WIDTH, DIALOG_LARGE_HEIGHT);
  }
  if (mode === 'max') {
    const bounds = getDialogSizeBounds();
    return applyDialogSize(bounds.maxWidth, bounds.maxHeight);
  }
  return applyDialogSize(DIALOG_DEFAULT_WIDTH, DIALOG_DEFAULT_HEIGHT);
}

export function fitDialogToViewport(options = {}) {
  const rect = root.getBoundingClientRect();
  const size = applyDialogSize(rect.width || DIALOG_DEFAULT_WIDTH, rect.height || DIALOG_DEFAULT_HEIGHT, { persist: false });
  const pos = applyDialogPosition(getCurrentDialogPosition(size.width, size.height).left, getCurrentDialogPosition(size.width, size.height).top, { persist: false });
  if (options.persist !== false) saveCurrentDialogState();
  return { ...size, ...pos };
}

function scheduleDialogSizeSave() {
  window.clearTimeout(dialogResizeSaveTimer);
  dialogResizeSaveTimer = window.setTimeout(() => {
    dialogResizeSaveTimer = 0;
    saveCurrentDialogState();
  }, 180);
}

export function saveCurrentDialogState() {
  if (!root) return;
  const rect = root.getBoundingClientRect();
  const saved = loadDialogState();
  saved.width = Math.round(rect.width || root.offsetWidth);
  saved.height = Math.round(rect.height || root.offsetHeight);
  const rawLeft = Number.parseFloat(root.style.left);
  const rawTop = Number.parseFloat(root.style.top);
  if (Number.isFinite(rawLeft)) saved.left = Math.round(rawLeft);
  if (Number.isFinite(rawTop)) saved.top = Math.round(rawTop);
  saved.activeTab = state.activeTab || 'diff';
  saved.activeSubTabs = { ...state.activeSubTabs };
  saveDialogState(saved);
}

export function initDialogResizeHandling() {
  if (dialogResizeObserver || typeof ResizeObserver !== 'function') return;
  dialogResizeObserver = new ResizeObserver(() => {
    scheduleDialogSizeSave();
    callScheduleGuidedTourLayout();
  });
  dialogResizeObserver.observe(root);
}

function canStartDialogDrag(target) {
  if (!target || !target.closest('[data-dialog-drag-handle]')) return false;
  return !target.closest('button, input, textarea, select, label, a, [data-no-dialog-drag]');
}

function finishDialogDrag(persist = true) {
  if (!dialogDragState) return;
  const doc = getToolDocument();
  doc.removeEventListener('mousemove', dialogDragMoveHandler);
  doc.removeEventListener('mouseup', dialogDragEndHandler);
  dialogDragState = null;
  root.classList.remove('dragging');
  doc.body.style.userSelect = '';
  if (persist) saveCurrentDialogState();
}

function onDialogDragMove(e) {
  if (!dialogDragState) return;
  const nextLeft = dialogDragState.left + (e.clientX - dialogDragState.startX);
  const nextTop = dialogDragState.top + (e.clientY - dialogDragState.startY);
  applyDialogPosition(nextLeft, nextTop, { persist: false });
}

function onDialogDragEnd() {
  finishDialogDrag(true);
}

function onDialogDragStart(e) {
  if (e.button !== 0 || !canStartDialogDrag(e.target)) return;
  const current = getCurrentDialogPosition();
  dialogDragState = {
    startX: e.clientX,
    startY: e.clientY,
    left: current.left,
    top: current.top
  };
  if (!dialogDragMoveHandler) dialogDragMoveHandler = onDialogDragMove;
  if (!dialogDragEndHandler) dialogDragEndHandler = onDialogDragEnd;
  const doc = getToolDocument();
  doc.addEventListener('mousemove', dialogDragMoveHandler);
  doc.addEventListener('mouseup', dialogDragEndHandler);
  root.classList.add('dragging');
  doc.body.style.userSelect = 'none';
  e.preventDefault();
}

export function initDialogDragHandling() {
  ui.dialogHandle?.addEventListener('mousedown', onDialogDragStart);
}

export function teardownDialogResizeHandling() {
  if (dialogResizeObserver) {
    dialogResizeObserver.disconnect();
    dialogResizeObserver = null;
  }
  window.clearTimeout(dialogResizeSaveTimer);
  dialogResizeSaveTimer = 0;
  ui.dialogHandle?.removeEventListener('mousedown', onDialogDragStart);
  finishDialogDrag(false);
}

export { teardownDialogResizeHandling as teardownDialog };

export function initDialog() {
  initDialogResizeHandling();
  initDialogDragHandling();
}
