'use strict';

import {
  DIALOG_MARGIN,
  DIALOG_DEFAULT_WIDTH,
  DIALOG_DEFAULT_HEIGHT
} from '../constants.js';
import { state, saveDialogState, loadDialogState } from '../state.js';

export interface DialogPosition {
  left: number;
  top: number;
  maxLeft: number;
  maxTop: number;
}

let root: HTMLElement | null = null;
let ui: Record<string, any> = {};

/** ツールUIが載っている document（別タブ表示時は子ウィンドウ） */
export function getToolDocument(): Document {
  return root?.ownerDocument || document;
}

export function getToolWindow(): Window {
  const d = getToolDocument();
  return d.defaultView || window;
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

