'use strict';

import { GUIDED_TOUR_STEPS, GUIDED_TOUR_COURSES, GUIDED_TOUR_DEFAULT_COURSE } from '../constants.js';
import { state, ui } from '../state.js';
import { getRoot, saveCurrentDialogState } from './dialog.js';
import { setStatus, switchTab } from './components.js';

let guidedTourLayoutRaf = 0;
let activeTourSteps = GUIDED_TOUR_STEPS;
let activeTourCourseKey = GUIDED_TOUR_DEFAULT_COURSE;


export interface SwitchSubTabOptions {
  persist?: boolean;
}

export function switchSubTab(parentKey: string, subKey: string, options: SwitchSubTabOptions = {}): void {
  if (!parentKey) return;
  const tabs: HTMLElement[] = (ui.subTabs as HTMLElement[] | undefined)?.filter((tab) => tab.dataset.subtabParent === parentKey) || [];
  const panes: HTMLElement[] = (ui.subPanes as HTMLElement[] | undefined)?.filter((pane) => pane.dataset.subpaneParent === parentKey) || [];
  if (!tabs.length || !panes.length) return;
  const fallback = state.activeSubTabs[parentKey] || tabs[0]?.dataset.subtab || '';
  const key = tabs.some((tab) => tab.dataset.subtab === subKey) ? subKey : fallback;
  state.activeSubTabs[parentKey] = key;
  tabs.forEach((tab) => tab.classList.toggle('active', tab.dataset.subtab === key));
  panes.forEach((pane) => pane.classList.toggle('active', pane.dataset.subpane === key));
  if (state.guidedTourActive) scheduleGuidedTourLayout();
  if (options.persist !== false) saveCurrentDialogState();
}

interface ResolvedTourCourse {
  key: string;
  course: any;
  steps: readonly any[];
}

function resolveTourCourse(courseKey: string): ResolvedTourCourse {
  const key = String(courseKey || '').trim();
  const courses = GUIDED_TOUR_COURSES as Record<string, any>;
  const course = courses[key] || courses[GUIDED_TOUR_DEFAULT_COURSE];
  return {
    key: courses[key] ? key : GUIDED_TOUR_DEFAULT_COURSE,
    course,
    steps: course?.steps || GUIDED_TOUR_STEPS
  };
}

export function getGuidedTourStep(index: number): any {
  if (!activeTourSteps.length) return null;
  const bounded = Math.max(0, Math.min(activeTourSteps.length - 1, Number(index) || 0));
  return activeTourSteps[bounded] || null;
}

export function getGuidedTourTarget(step: any): Element | null {
  if (!step?.selector) return null;
  const root = getRoot();
  return root?.querySelector(step.selector) || null;
}

export function scheduleGuidedTourLayout(): void {
  if (!state.guidedTourActive) return;
  if (guidedTourLayoutRaf) window.cancelAnimationFrame(guidedTourLayoutRaf);
  guidedTourLayoutRaf = window.requestAnimationFrame(() => {
    guidedTourLayoutRaf = 0;
    updateGuidedTourLayout();
  });
}

function updateGuidedTourLayout(): void {
  const root = getRoot();
  if (!root || !state.guidedTourActive || !ui.tourOverlay || !ui.tourCard || !ui.tourSpotlight) return;
  const step = getGuidedTourStep(state.guidedTourIndex);
  const target = getGuidedTourTarget(step) as HTMLElement | null;
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

function getCourseLabel(courseKey: string): string {
  return (GUIDED_TOUR_COURSES as Record<string, any>)[courseKey]?.label || '';
}

export interface RenderGuidedTourStepOptions {
  scroll?: boolean;
}

export function renderGuidedTourStep(options: RenderGuidedTourStepOptions = {}): void {
  if (!ui.tourOverlay || !ui.tourCard) return;
  const step = getGuidedTourStep(state.guidedTourIndex);
  if (!step) return;
  if (step.tab) switchTab(step.tab, { persist: false });
  if (step.diffSubTab) switchSubTab('diff', step.diffSubTab, { persist: false });
  else if (step.tab && step.subTab) switchSubTab(step.tab, step.subTab, { persist: false });

  const total = activeTourSteps.length;
  const courseLabel = getCourseLabel(activeTourCourseKey);
  ui.tourOverlay.classList.add('active');
  ui.tourStepLabel.textContent = `${courseLabel || 'ガイド'} ${state.guidedTourIndex + 1} / ${total}`;
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

function pickGuidedTourCourse(): string | null {
  // confirm/prompt しか使えないので、3択を 1/2/3 入力で受ける
  const lines = [
    'どのコースで操作ガイドを始めますか？',
    '',
    '1: 初回（全工程） — 接続から記録出力まで一通り',
    '2: 差分のみ確認 — 比較とレビューに絞る',
    '3: 反映まで実施 — 差分→プラン→反映の最短ルート',
    '',
    '番号で入力してください（空入力で 1）'
  ];
  let answer = '1';
  try {
    const win = (typeof window !== 'undefined') ? window : globalThis;
    const promptFn = win?.prompt || (typeof prompt !== 'undefined' ? prompt : null);
    if (typeof promptFn === 'function') {
      const v = promptFn(lines.join('\n'), '1');
      if (v == null) return null;
      answer = String(v).trim() || '1';
    }
  } catch (_e) { /* fallback to default */ }
  if (answer === '2') return 'diff';
  if (answer === '3') return 'apply';
  return 'full';
}

export async function openGuidedTour(arg1: string | number = 0, arg2?: number): Promise<void> {
  if (!ui.tourOverlay) return;

  // 後方互換: openGuidedTour(index) も受け付ける
  let courseKey = GUIDED_TOUR_DEFAULT_COURSE;
  let startIndex = 0;
  if (typeof arg1 === 'string') {
    courseKey = arg1;
    startIndex = Number(arg2 || 0) || 0;
  } else if (typeof arg1 === 'number') {
    startIndex = arg1;
  }

  // 引数指定がなければコース選択 UI を表示
  if (typeof arg1 !== 'string' && typeof arg1 !== 'number') {
    const picked = pickGuidedTourCourse();
    if (picked == null) return; // キャンセル
    courseKey = picked;
  } else if (typeof arg1 === 'number') {
    // 旧仕様呼び出し: コースは聞かずデフォルトで開始（明示の番号指定）
    courseKey = GUIDED_TOUR_DEFAULT_COURSE;
  }

  const resolved = resolveTourCourse(courseKey);
  activeTourCourseKey = resolved.key;
  activeTourSteps = resolved.steps;
  if (!activeTourSteps.length) return;

  // Try driver.js enhanced tour first
  try {
    const { startGuidedTour: startDriverTour } = await import('../oss_integrations.js');
    const { switchTab: swTab } = await import('./components.js');
    const stepsForDriver = activeTourSteps.map((step) => {
      return {
        selector: step.selector,
        element: step.selector,
        title: step.title || '',
        body: step.body || '',
        description: step.body || '',
        side: 'bottom',
        onHighlightStarted: () => {
          if (step.tab) swTab(step.tab, { persist: false });
          if (step.diffSubTab) switchSubTab('diff', step.diffSubTab, { persist: false });
          else if (step.tab && step.subTab) switchSubTab(step.tab, step.subTab, { persist: false });
        }
      };
    });
    await startDriverTour(stepsForDriver, {
      onComplete: () => {
        setStatus(`操作ガイド「${getCourseLabel(activeTourCourseKey)}」を完了しました。`);
      }
    });
    setStatus(`操作ガイド「${getCourseLabel(activeTourCourseKey)}」を開始しました。`);
    return;
  } catch (e: any) {
    console.warn('driver.js tour fallback to custom tour:', e?.message);
  }

  // Fallback: custom tour
  state.guidedTourActive = true;
  state.guidedTourIndex = Math.max(0, Math.min(activeTourSteps.length - 1, Number(startIndex) || 0));
  renderGuidedTourStep();
  setStatus(`操作ガイド「${getCourseLabel(activeTourCourseKey)}」を開始しました。`);
}

export interface CloseGuidedTourOptions {
  silent?: boolean;
}

export function closeGuidedTour(options: CloseGuidedTourOptions = {}): void {
  state.guidedTourActive = false;
  if (guidedTourLayoutRaf) {
    window.cancelAnimationFrame(guidedTourLayoutRaf);
    guidedTourLayoutRaf = 0;
  }
  ui.tourOverlay?.classList.remove('active');
  if (ui.tourSpotlight) ui.tourSpotlight.style.display = 'none';
  if (options.silent !== true) setStatus('操作ガイドを閉じました。');
}

export function moveGuidedTour(delta: number): void {
  if (!state.guidedTourActive) return;
  const nextIndex = state.guidedTourIndex + delta;
  if (nextIndex < 0) return;
  if (nextIndex >= activeTourSteps.length) {
    closeGuidedTour({ silent: true });
    setStatus(`操作ガイド「${getCourseLabel(activeTourCourseKey)}」を完了しました。必要なら再度ヘッダーの「操作ガイド」から開けます。`);
    return;
  }
  state.guidedTourIndex = nextIndex;
  renderGuidedTourStep();
}
