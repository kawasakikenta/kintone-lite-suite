'use strict';

import { loadExternalLibrary } from './utils.js';

// ============================================================
// JSONEditor wrapper
// ============================================================
const editorInstances = {};

export async function initJsonEditor(containerId, options = {}) {
  await loadExternalLibrary('jsoneditor');
  const container = document.getElementById(containerId);
  if (!container) return null;
  // Destroy previous instance if exists
  if (editorInstances[containerId]) {
    try { editorInstances[containerId].destroy(); } catch (e) { /* ignore */ }
  }
  const JSONEditor = window.JSONEditor;
  if (!JSONEditor) {
    console.warn('JSONEditor not loaded');
    return null;
  }
  const defaultOpts = {
    mode: options.mode || 'code',
    modes: options.modes || ['code', 'tree', 'view'],
    language: 'ja',
    mainMenuBar: options.mainMenuBar !== false,
    statusBar: options.statusBar !== false,
    search: options.search !== false,
    onChange: options.onChange || null,
    onError: options.onError || null
  };
  const editor = new JSONEditor(container, defaultOpts);
  if (options.initialValue !== undefined) {
    try {
      editor.set(options.initialValue);
    } catch (e) {
      try { editor.setText(typeof options.initialValue === 'string' ? options.initialValue : JSON.stringify(options.initialValue, null, 2)); } catch (e2) { /* */ }
    }
  }
  editorInstances[containerId] = editor;
  return editor;
}

export function getJsonEditorInstance(containerId) {
  return editorInstances[containerId] || null;
}

export function getJsonEditorValue(containerId) {
  const editor = editorInstances[containerId];
  if (!editor) return null;
  try {
    return editor.get();
  } catch (e) {
    try {
      const text = editor.getText();
      return JSON.parse(text);
    } catch (e2) {
      return null;
    }
  }
}

export function getJsonEditorText(containerId) {
  const editor = editorInstances[containerId];
  if (!editor) return '';
  try {
    return editor.getText();
  } catch (e) {
    return '';
  }
}

// ============================================================
// diff2html / jsdiff wrapper
// ============================================================

export async function renderRichDiff(leftText, rightText, outputElement, options = {}) {
  await loadExternalLibrary('jsdiff');
  await loadExternalLibrary('diff2html');

  const Diff = window.Diff;
  const Diff2Html = window.Diff2Html;

  if (!Diff || !Diff2Html) {
    outputElement.innerHTML = '<div style="color:#ef4444;padding:8px">diff2html ライブラリの読み込みに失敗しました</div>';
    return;
  }

  const fileName = options.fileName || 'settings.json';
  const leftLabel = options.leftLabel || '比較元';
  const rightLabel = options.rightLabel || '比較先';

  const leftStr = typeof leftText === 'string' ? leftText : JSON.stringify(leftText, null, 2);
  const rightStr = typeof rightText === 'string' ? rightText : JSON.stringify(rightText, null, 2);

  const unifiedDiff = Diff.createTwoFilesPatch(
    `${leftLabel}/${fileName}`,
    `${rightLabel}/${fileName}`,
    leftStr || '',
    rightStr || '',
    leftLabel,
    rightLabel
  );

  const diffHtml = Diff2Html.html(unifiedDiff, {
    drawFileList: false,
    matching: 'lines',
    outputFormat: options.sideBySide ? 'side-by-side' : 'line-by-line',
    highlight: true,
    diffStyle: 'word'
  });

  outputElement.innerHTML = diffHtml;
}

// ============================================================
// driver.js tour wrapper
// ============================================================

let driverInstance = null;

export async function startGuidedTour(steps, options = {}) {
  await loadExternalLibrary('driver');

  const driverModule = window.driver;
  if (!driverModule) {
    console.warn('driver.js not loaded');
    return;
  }

  if (driverInstance) {
    try { driverInstance.destroy(); } catch (e) { /* */ }
  }

  driverInstance = driverModule.driver({
    showProgress: true,
    allowClose: true,
    animate: true,
    overlayColor: 'rgba(0, 0, 0, 0.55)',
    stagePadding: 8,
    stageRadius: 8,
    popoverClass: 'kus-driver-popover',
    nextBtnText: '次へ',
    prevBtnText: '前へ',
    doneBtnText: '完了',
    progressText: '{{current}} / {{total}}',
    onDestroyed: () => {
      driverInstance = null;
      if (options.onComplete) options.onComplete();
    },
    steps: steps.map((step) => ({
      element: step.selector || step.element,
      popover: {
        title: step.title,
        description: step.body || step.description || '',
        side: step.side || 'bottom',
        align: step.align || 'start'
      }
    }))
  });

  driverInstance.drive();
}

export function destroyGuidedTour() {
  if (driverInstance) {
    try { driverInstance.destroy(); } catch (e) { /* */ }
    driverInstance = null;
  }
}
