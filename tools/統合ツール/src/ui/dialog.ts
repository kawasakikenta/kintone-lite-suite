'use strict';

import {
  DIALOG_MARGIN,
  DIALOG_MIN_WIDTH,
  DIALOG_MIN_HEIGHT,
  DIALOG_DEFAULT_WIDTH,
  DIALOG_DEFAULT_HEIGHT,
  DIALOG_LARGE_WIDTH,
  DIALOG_LARGE_HEIGHT
} from '../constants.js';
import { state, saveDialogState, loadDialogState } from '../state.js';

export interface DialogPosition {
  left: number;
  top: number;
  maxLeft: number;
  maxTop: number;
}

export interface DialogSizeBounds {
  minWidth: number;
  minHeight: number;
  maxWidth: number;
  maxHeight: number;
}

export interface DialogSize extends DialogSizeBounds {
  width: number;
  height: number;
}

export interface DialogPersistOptions {
  persist?: boolean;
}

interface DialogDragState {
  startX: number;
  startY: number;
  left: number;
  top: number;
}

let root: HTMLElement | null = null;
let ui: Record<string, any> = {};
let dialogResizeObserver: ResizeObserver | null = null;
let dialogResizeSaveTimer = 0;
let dialogDragState: DialogDragState | null = null;
let dialogDragMoveHandler: ((e: MouseEvent) => void) | null = null;
let dialogDragEndHandler: (() => void) | null = null;


export function getRoot(): HTMLElement | null {
  return root;
}

/** ツールUIが載っている document（別タブ表示時は子ウィンドウ） */
export function getToolDocument(): Document {
  return root?.ownerDocument || document;
}

export function getToolWindow(): Window {
  const d = getToolDocument();
  return d.defaultView || window;
}


export function setUiRefs(uiRefs: Record<string, any>): void {
  ui = uiRefs;
}

export function setRootElement(el: HTMLElement | null): void {
  root = el;
}

function clampDialogPosition(left: number, top: number, width?: number, height?: number): DialogPosition {
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

export function getDefaultDialogPosition(width?: number, height?: number): DialogPosition {
  const dialogWidth = Math.round(Number(width) || root?.offsetWidth || DIALOG_DEFAULT_WIDTH);
  const dialogHeight = Math.round(Number(height) || root?.offsetHeight || DIALOG_DEFAULT_HEIGHT);
  const tw = getToolWindow();
  return clampDialogPosition((tw.innerWidth || dialogWidth) - dialogWidth - DIALOG_MARGIN, DIALOG_MARGIN, dialogWidth, dialogHeight);
}

export function getCurrentDialogPosition(width?: number, height?: number): DialogPosition {
  if (!root) return getDefaultDialogPosition(width, height);
  const rect = root.getBoundingClientRect();
  const defaultPos = getDefaultDialogPosition(width || rect.width, height || rect.height);
  const rawLeft = Number.parseFloat(root.style.left);
  const rawTop = Number.parseFloat(root.style.top);
  const left = Number.isFinite(rawLeft) ? rawLeft : (rect.left || defaultPos.left);
  const top = Number.isFinite(rawTop) ? rawTop : (rect.top || defaultPos.top);
  return clampDialogPosition(left, top, width || rect.width, height || rect.height);
}

export function getDialogSizeBounds(): DialogSizeBounds {
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

function clampDialogSize(width: number, height: number): DialogSize {
  const bounds = getDialogSizeBounds();
  const nextWidth = Math.max(bounds.minWidth, Math.min(bounds.maxWidth, Math.round(Number(width) || DIALOG_DEFAULT_WIDTH)));
  const nextHeight = Math.max(bounds.minHeight, Math.min(bounds.maxHeight, Math.round(Number(height) || DIALOG_DEFAULT_HEIGHT)));
  return { ...bounds, width: nextWidth, height: nextHeight };
}

export function applyDialogSize(width: number, height: number, options: DialogPersistOptions = {}): DialogSize {
  const next = clampDialogSize(width, height);
  if (!root) return next;
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

export function applyDialogPosition(left: number, top: number, options: DialogPersistOptions = {}): DialogPosition {
  if (!root) return clampDialogPosition(left, top);
  const rect = root.getBoundingClientRect();
  const next = clampDialogPosition(left, top, rect.width || root.offsetWidth, rect.height || root.offsetHeight);
  root.style.left = `${next.left}px`;
  root.style.top = `${next.top}px`;
  root.style.right = 'auto';
  root.style.bottom = 'auto';
  if (options.persist !== false) scheduleDialogSizeSave();
  return next;
}

export type DialogSizePresetMode = 'default' | 'large' | 'max' | string;

export function applyDialogSizePreset(mode: DialogSizePresetMode): DialogSize {
  if (mode === 'large') {
    return applyDialogSize(DIALOG_LARGE_WIDTH, DIALOG_LARGE_HEIGHT);
  }
  if (mode === 'max') {
    const bounds = getDialogSizeBounds();
    return applyDialogSize(bounds.maxWidth, bounds.maxHeight);
  }
  return applyDialogSize(DIALOG_DEFAULT_WIDTH, DIALOG_DEFAULT_HEIGHT);
}

export function fitDialogToViewport(options: DialogPersistOptions = {}): DialogSize & DialogPosition {
  if (!root) {
    const fallback = applyDialogSize(DIALOG_DEFAULT_WIDTH, DIALOG_DEFAULT_HEIGHT, { persist: false });
    const pos = getDefaultDialogPosition(fallback.width, fallback.height);
    return { ...fallback, ...pos };
  }
  const rect = root.getBoundingClientRect();
  const size = applyDialogSize(rect.width || DIALOG_DEFAULT_WIDTH, rect.height || DIALOG_DEFAULT_HEIGHT, { persist: false });
  const initialPos = getCurrentDialogPosition(size.width, size.height);
  const pos = applyDialogPosition(initialPos.left, initialPos.top, { persist: false });
  if (options.persist !== false) saveCurrentDialogState();
  return { ...size, ...pos };
}

function scheduleDialogSizeSave(): void {
  window.clearTimeout(dialogResizeSaveTimer);
  dialogResizeSaveTimer = window.setTimeout(() => {
    dialogResizeSaveTimer = 0;
    saveCurrentDialogState();
  }, 180);
}

export function saveCurrentDialogState(): void {
  if (!root) return;
  const rect = root.getBoundingClientRect();
  const saved = loadDialogState();
  const w = Math.round(rect.width || root.offsetWidth);
  const h = Math.round(rect.height || root.offsetHeight);
  const pos = getCurrentDialogPosition(w, h);
  const rawLeft = Number.parseFloat(root.style.left);
  const rawTop = Number.parseFloat(root.style.top);
  saved.dialogWidth = w;
  saved.dialogHeight = h;
  saved.dialogLeft = Number.isFinite(rawLeft) ? Math.round(rawLeft) : Math.round(pos.left);
  saved.dialogTop = Number.isFinite(rawTop) ? Math.round(rawTop) : Math.round(pos.top);
  delete saved.width;
  delete saved.height;
  delete saved.left;
  delete saved.top;
  saved.activeTab = state.activeTab || 'reflect';
  saved.activeFeatureKey = state.activeFeatureKey || '';
  saved.activeSubTabs = { ...state.activeSubTabs };
  saved.screenMode = root.classList.contains('screen-feature') ? 'feature' : 'launcher';
  saved.launcherSortMode = ui.featureSortMode?.value || state.launcherSortMode || 'onboarding';
  saveDialogState(saved);
}

export function initDialogResizeHandling(): void {
  if (dialogResizeObserver || typeof ResizeObserver !== 'function') return;
  if (!root) return;
  dialogResizeObserver = new ResizeObserver(() => {
    scheduleDialogSizeSave();
  });
  dialogResizeObserver.observe(root);
}

function canStartDialogDrag(target: Element | null): boolean {
  if (!target || !target.closest('[data-dialog-drag-handle]')) return false;
  return !target.closest('button, input, textarea, select, label, a, [data-no-dialog-drag]');
}

function finishDialogDrag(persist = true): void {
  if (!dialogDragState) return;
  const doc = getToolDocument();
  if (dialogDragMoveHandler) doc.removeEventListener('mousemove', dialogDragMoveHandler);
  if (dialogDragEndHandler) doc.removeEventListener('mouseup', dialogDragEndHandler);
  dialogDragState = null;
  root?.classList.remove('dragging');
  doc.body.style.userSelect = '';
  if (persist) saveCurrentDialogState();
}

function onDialogDragMove(e: MouseEvent): void {
  if (!dialogDragState) return;
  const nextLeft = dialogDragState.left + (e.clientX - dialogDragState.startX);
  const nextTop = dialogDragState.top + (e.clientY - dialogDragState.startY);
  applyDialogPosition(nextLeft, nextTop, { persist: false });
}

function onDialogDragEnd(): void {
  finishDialogDrag(true);
}

function onDialogDragStart(e: MouseEvent): void {
  if (e.button !== 0 || !canStartDialogDrag(e.target as Element | null)) return;
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
  root?.classList.add('dragging');
  doc.body.style.userSelect = 'none';
  e.preventDefault();
}

export function initDialogDragHandling(): void {
  (ui.dialogHandle as HTMLElement | undefined)?.addEventListener('mousedown', onDialogDragStart);
}

export function teardownDialogResizeHandling(): void {
  if (dialogResizeObserver) {
    dialogResizeObserver.disconnect();
    dialogResizeObserver = null;
  }
  window.clearTimeout(dialogResizeSaveTimer);
  dialogResizeSaveTimer = 0;
  (ui.dialogHandle as HTMLElement | undefined)?.removeEventListener('mousedown', onDialogDragStart);
  finishDialogDrag(false);
}

