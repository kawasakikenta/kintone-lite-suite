'use strict';

import { GUIDED_TOUR_STEPS } from '../constants.js';
import { state, ui } from '../state.js';
import { esc } from '../utils.js';
import { getRoot, saveCurrentDialogState } from './dialog.js';
import { setStatus, switchTab } from './components.js';

let guidedTourLayoutRaf = 0;

export function setBusy(isBusy, message) {
  const root = getRoot();
  if (message) ui.busyText.textContent = message;
  root.classList.toggle('busy', !!isBusy);
}

export function switchSubTab(parentKey, subKey, options = {}) {
  if (!parentKey) return;
  const tabs = ui.subTabs.filter((tab) => tab.dataset.subtabParent === parentKey);
  const panes = ui.subPanes.filter((pane) => pane.dataset.subpaneParent === parentKey);
  if (!tabs.length || !panes.length) return;
  const fallback = state.activeSubTabs[parentKey] || tabs[0]?.dataset.subtab || '';
  const key = tabs.some((tab) => tab.dataset.subtab === subKey) ? subKey : fallback;
  state.activeSubTabs[parentKey] = key;
  tabs.forEach((tab) => tab.classList.toggle('active', tab.dataset.subtab === key));
  panes.forEach((pane) => pane.classList.toggle('active', pane.dataset.subpane === key));
  if (state.guidedTourActive) scheduleGuidedTourLayout();
  if (options.persist !== false) saveCurrentDialogState();
}

export function getGuidedTourStep(index) {
  if (!GUIDED_TOUR_STEPS.length) return null;
  const bounded = Math.max(0, Math.min(GUIDED_TOUR_STEPS.length - 1, Number(index) || 0));
  return GUIDED_TOUR_STEPS[bounded] || null;
}

export function getGuidedTourTarget(step) {
  if (!step?.selector) return null;
  const root = getRoot();
  return root.querySelector(step.selector);
}

export function scheduleGuidedTourLayout() {
  if (!state.guidedTourActive) return;
  if (guidedTourLayoutRaf) window.cancelAnimationFrame(guidedTourLayoutRaf);
  guidedTourLayoutRaf = window.requestAnimationFrame(() => {
    guidedTourLayoutRaf = 0;
    updateGuidedTourLayout();
  });
}

function updateGuidedTourLayout() {
  const root = getRoot();
  if (!state.guidedTourActive || !ui.tourOverlay || !ui.tourCard || !ui.tourSpotlight) return;
  const step = getGuidedTourStep(state.guidedTourIndex);
  const target = getGuidedTourTarget(step);
  const rootRect = root.getBoundingClientRect();
  const overlayWidth = root.clientWidth || Math.round(rootRect.width || 0);
  const overlayHeight = root.clientHeight || Math.round(rootRect.height || 0);
  const margin = 12;

  if (!target) {
    ui.tourSpotlight.style.display = 'none';
    const cardWidth = ui.tourCard.offsetWidth || 340;
    const cardHeight = ui.tourCard.offsetHeight || 220;
    ui.tourCard.style.left = `${Math.max(margin, Math.round((overlayWidth - cardWidth) / 2))}px`;
    ui.tourCard.style.top = `${Math.max(margin, Math.round((overlayHeight - cardHeight) / 2))}px`;
    return;
  }

  const rect = target.getBoundingClientRect();
  const rel = {
    left: rect.left - rootRect.left,
    top: rect.top - rootRect.top,
    width: rect.width,
    height: rect.height,
    right: rect.right - rootRect.left,
    bottom: rect.bottom - rootRect.top
  };
  const pad = 10;
  const spotLeft = Math.max(8, rel.left - pad);
  const spotTop = Math.max(8, rel.top - pad);
  const spotWidth = Math.max(48, Math.min(overlayWidth - spotLeft - 8, rel.width + (pad * 2)));
  const spotHeight = Math.max(40, Math.min(overlayHeight - spotTop - 8, rel.height + (pad * 2)));

  ui.tourSpotlight.style.display = 'block';
  ui.tourSpotlight.style.left = `${Math.round(spotLeft)}px`;
  ui.tourSpotlight.style.top = `${Math.round(spotTop)}px`;
  ui.tourSpotlight.style.width = `${Math.round(spotWidth)}px`;
  ui.tourSpotlight.style.height = `${Math.round(spotHeight)}px`;

  const cardWidth = ui.tourCard.offsetWidth || 340;
  const cardHeight = ui.tourCard.offsetHeight || 220;
  let cardLeft = Math.round(Math.min(Math.max(margin, spotLeft), overlayWidth - cardWidth - margin));
  let cardTop = Math.round(spotTop + spotHeight + 16);
  if (cardTop + cardHeight > overlayHeight - margin) {
    cardTop = Math.round(spotTop - cardHeight - 16);
  }
  if (cardTop < margin) {
    cardTop = Math.round(Math.min(overlayHeight - cardHeight - margin, spotTop + 12));
  }
  if (cardTop < margin) cardTop = margin;

  ui.tourCard.style.left = `${cardLeft}px`;
  ui.tourCard.style.top = `${cardTop}px`;
}

export function renderGuidedTourStep(options = {}) {
  if (!ui.tourOverlay || !ui.tourCard) return;
  const step = getGuidedTourStep(state.guidedTourIndex);
  if (!step) return;
  if (step.tab) switchTab(step.tab, { persist: false });
  if (step.tab && step.subTab) switchSubTab(step.tab, step.subTab, { persist: false });

  const total = GUIDED_TOUR_STEPS.length;
  ui.tourOverlay.classList.add('active');
  ui.tourStepLabel.textContent = `基本フロー ${state.guidedTourIndex + 1} / ${total}`;
  ui.tourTitle.textContent = step.title || `ステップ ${state.guidedTourIndex + 1}`;
  ui.tourBody.textContent = step.body || '';
  ui.tourHint.textContent = step.path || '対象箇所を順番に案内します';
  ui.tourPrev.disabled = state.guidedTourIndex <= 0;
  ui.tourNext.textContent = state.guidedTourIndex >= total - 1 ? '完了' : '次へ';
  ui.tourProgress.style.width = `${Math.round(((state.guidedTourIndex + 1) / total) * 100)}%`;

  const target = getGuidedTourTarget(step);
  if (target && typeof target.scrollIntoView === 'function' && options.scroll !== false) {
    target.scrollIntoView({ block: 'center', inline: 'nearest' });
  }

  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      scheduleGuidedTourLayout();
      ui.tourNext?.focus();
    });
  });
}

export async function openGuidedTour(index = 0) {
  if (!GUIDED_TOUR_STEPS.length || !ui.tourOverlay) return;

  // Try driver.js enhanced tour first
  try {
    const { startGuidedTour: startDriverTour } = await import('../oss_integrations.js');
    const { switchTab: swTab } = await import('./components.js');
    const stepsForDriver = GUIDED_TOUR_STEPS.map((step) => {
      return {
        selector: step.selector,
        element: step.selector,
        title: step.title || '',
        body: step.body || '',
        description: step.body || '',
        side: 'bottom',
        onHighlightStarted: () => {
          if (step.tab) swTab(step.tab, { persist: false });
          if (step.tab && step.subTab) switchSubTab(step.tab, step.subTab, { persist: false });
        }
      };
    });
    await startDriverTour(stepsForDriver, {
      onComplete: () => {
        setStatus('操作ガイドを完了しました。');
      }
    });
    setStatus('操作ガイドを開始しました（driver.js 拡張版）。');
    return;
  } catch (e) {
    console.warn('driver.js tour fallback to custom tour:', e.message);
  }

  // Fallback: custom tour
  state.guidedTourActive = true;
  state.guidedTourIndex = Math.max(0, Math.min(GUIDED_TOUR_STEPS.length - 1, Number(index) || 0));
  renderGuidedTourStep();
  setStatus('操作ガイドを開始しました。順番に確認してください。');
}

export function closeGuidedTour(options = {}) {
  state.guidedTourActive = false;
  if (guidedTourLayoutRaf) {
    window.cancelAnimationFrame(guidedTourLayoutRaf);
    guidedTourLayoutRaf = 0;
  }
  ui.tourOverlay?.classList.remove('active');
  if (ui.tourSpotlight) ui.tourSpotlight.style.display = 'none';
  if (options.silent !== true) setStatus('操作ガイドを閉じました。');
}

export function moveGuidedTour(delta) {
  if (!state.guidedTourActive) return;
  const nextIndex = state.guidedTourIndex + delta;
  if (nextIndex < 0) return;
  if (nextIndex >= GUIDED_TOUR_STEPS.length) {
    closeGuidedTour({ silent: true });
    setStatus('操作ガイドを完了しました。必要なら再度ヘッダーの「操作ガイド」から開けます。');
    return;
  }
  state.guidedTourIndex = nextIndex;
  renderGuidedTourStep();
}
