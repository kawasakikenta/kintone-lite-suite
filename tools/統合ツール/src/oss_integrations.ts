'use strict';

import { loadExternalLibrary } from './utils.js';
import { getToolDocument } from './ui/dialog.js';

// ============================================================
// JSONEditor wrapper
// ============================================================
const editorInstances = {};

export async function initJsonEditor(containerId, options: any = {}) {
  const doc = options.document || options.doc || options.container?.ownerDocument || getToolDocument();
  const win = doc?.defaultView || window;
  const container = options.container || doc.getElementById(containerId);
  if (!container) return null;
  await loadExternalLibrary('jsoneditor', { document: doc });
  // Destroy previous instance if exists
  if (editorInstances[containerId]) {
    try { editorInstances[containerId].destroy(); } catch (e) { /* ignore */ }
  }
  const JSONEditor = win.JSONEditor || window.JSONEditor;
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
// Local rich diff renderer
// ============================================================

function escRichDiffHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderPlainCompare(leftStr, rightStr, outputElement, options: any = {}) {
  const leftLabel = options.leftLabel || '比較元';
  const rightLabel = options.rightLabel || '比較先';
  const message = options.message || '差分ライブラリの読み込みに失敗したため、プレーン比較を表示しています。';
  outputElement.innerHTML = `
    <div style="display:grid;gap:8px">
      <div style="padding:8px 10px;border:1px solid #fde68a;border-radius:8px;background:#fffbeb;color:#92400e;font-size:11px;line-height:1.5">${escRichDiffHtml(message)}</div>
      <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px">
        <section style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;background:#fff">
          <div style="padding:8px 10px;background:#f8fafc;border-bottom:1px solid #e2e8f0;font-size:11px;font-weight:700">${escRichDiffHtml(leftLabel)}</div>
          <pre style="margin:0;padding:10px;max-height:360px;overflow:auto;white-space:pre-wrap;word-break:break-word;font-size:11px;line-height:1.55;font-family:ui-monospace,SFMono-Regular,Menlo,monospace">${escRichDiffHtml(leftStr)}</pre>
        </section>
        <section style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;background:#fff">
          <div style="padding:8px 10px;background:#f8fafc;border-bottom:1px solid #e2e8f0;font-size:11px;font-weight:700">${escRichDiffHtml(rightLabel)}</div>
          <pre style="margin:0;padding:10px;max-height:360px;overflow:auto;white-space:pre-wrap;word-break:break-word;font-size:11px;line-height:1.55;font-family:ui-monospace,SFMono-Regular,Menlo,monospace">${escRichDiffHtml(rightStr)}</pre>
        </section>
      </div>
    </div>`;
}

function renderFallbackCell(text, tone) {
  const toneStyle = {
    same: 'background:#ffffff;color:#0f172a;',
    removed: 'background:#fef2f2;color:#991b1b;',
    added: 'background:#ecfdf5;color:#065f46;'
  }[tone] || 'background:#ffffff;color:#0f172a;';
  if (!text) {
    return `<div style="padding:10px;color:#94a3b8;font-size:11px;font-style:italic">（なし）</div>`;
  }
  return `<pre style="margin:0;padding:10px;white-space:pre-wrap;word-break:break-word;font-size:11px;line-height:1.55;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;${toneStyle}">${escRichDiffHtml(text)}</pre>`;
}

function buildLocalLineDiffOps(leftLines, rightLines) {
  const n = leftLines.length;
  const m = rightLines.length;
  if (n * m > 90000) return null;

  const dp = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i -= 1) {
    for (let j = m - 1; j >= 0; j -= 1) {
      dp[i][j] = leftLines[i] === rightLines[j]
        ? dp[i + 1][j + 1] + 1
        : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const ops: any[] = [];
  let i = 0;
  let j = 0;
  while (i < n || j < m) {
    if (i < n && j < m && leftLines[i] === rightLines[j]) {
      ops.push({ type: 'same', left: leftLines[i], right: rightLines[j] });
      i += 1;
      j += 1;
      continue;
    }

    const down = i < n ? dp[i + 1][j] : -1;
    const right = j < m ? dp[i][j + 1] : -1;
    const diag = i < n && j < m ? dp[i + 1][j + 1] : -1;
    if (i < n && j < m && diag >= down && diag >= right) {
      ops.push({ type: 'replace', left: leftLines[i], right: rightLines[j] });
      i += 1;
      j += 1;
      continue;
    }

    if (j < m && (i >= n || right >= down)) {
      ops.push({ type: 'add', right: rightLines[j] });
      j += 1;
    } else if (i < n) {
      ops.push({ type: 'del', left: leftLines[i] });
      i += 1;
    } else {
      break;
    }
  }
  return ops;
}

function buildLocalCharDiffHtml(leftText, rightText) {
  const a = [...String(leftText || '')];
  const b = [...String(rightText || '')];
  if (!a.length || !b.length) return null;
  if (a.length * b.length > 20000) return null;

  const dp = Array.from({ length: a.length + 1 }, () => new Uint16Array(b.length + 1));
  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1] + 1
        : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }

  const ops: any[] = [];
  let i = a.length;
  let j = b.length;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
      ops.push({ type: 'same', ch: a[i - 1] });
      i -= 1;
      j -= 1;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      ops.push({ type: 'add', ch: b[j - 1] });
      j -= 1;
    } else if (i > 0) {
      ops.push({ type: 'del', ch: a[i - 1] });
      i -= 1;
    } else {
      break;
    }
  }
  ops.reverse();

  let left = '';
  let right = '';
  for (const op of ops) {
    if (op.type === 'same') {
      const ch = escRichDiffHtml(op.ch);
      left += ch;
      right += ch;
    } else if (op.type === 'del') {
      left += `<mark style="background:#fecaca;color:#991b1b;border-radius:3px;padding:0 2px">${escRichDiffHtml(op.ch)}</mark>`;
    } else {
      right += `<mark style="background:#bbf7d0;color:#065f46;border-radius:3px;padding:0 2px">${escRichDiffHtml(op.ch)}</mark>`;
    }
  }
  return { left, right };
}

function renderLocalDiffLine(lineNo, contentHtml, tone = 'same') {
  const toneStyle = {
    same: 'background:#ffffff;color:#0f172a;',
    removed: 'background:#fef2f2;color:#991b1b;',
    added: 'background:#ecfdf5;color:#065f46;',
    pad: 'background:#f8fafc;color:#94a3b8;'
  }[tone] || 'background:#ffffff;color:#0f172a;';
  return `<div style="display:flex;min-height:1.6em;line-height:1.6;white-space:pre-wrap;word-break:break-word;${toneStyle}">
    <span style="min-width:38px;display:inline-block;text-align:right;margin-right:8px;padding:0 6px 0 8px;border-right:1px solid #e2e8f0;font-size:10px;color:#64748b;flex-shrink:0">${lineNo || ''}</span>
    <span style="display:block;flex:1;padding:0 8px 0 0">${contentHtml || ''}</span>
  </div>`;
}

function renderLocalRichDiff(leftStr, rightStr, outputElement, options: any = {}) {
  const leftLabel = options.leftLabel || '比較元';
  const rightLabel = options.rightLabel || '比較先';
  const leftLines = String(leftStr || '').split('\n');
  const rightLines = String(rightStr || '').split('\n');
  const ops = buildLocalLineDiffOps(leftLines, rightLines);
  if (!ops) {
    renderPlainCompare(leftStr, rightStr, outputElement, {
      leftLabel,
      rightLabel,
      message: '差分サイズが大きいため、プレーン比較を表示しています。'
    });
    return;
  }

  let leftHtml = '';
  let rightHtml = '';
  let leftNo = 0;
  let rightNo = 0;
  for (const op of ops) {
    if (op.type === 'same') {
      leftNo += 1;
      rightNo += 1;
      leftHtml += renderLocalDiffLine(leftNo, escRichDiffHtml(op.left || ''), 'same');
      rightHtml += renderLocalDiffLine(rightNo, escRichDiffHtml(op.right || ''), 'same');
      continue;
    }
    if (op.type === 'replace') {
      leftNo += 1;
      rightNo += 1;
      const charDiff = options.highlightChars === false ? null : buildLocalCharDiffHtml(op.left, op.right);
      leftHtml += renderLocalDiffLine(leftNo, charDiff ? charDiff.left : escRichDiffHtml(op.left || ''), 'removed');
      rightHtml += renderLocalDiffLine(rightNo, charDiff ? charDiff.right : escRichDiffHtml(op.right || ''), 'added');
      continue;
    }
    if (op.type === 'del') {
      leftNo += 1;
      leftHtml += renderLocalDiffLine(leftNo, escRichDiffHtml(op.left || ''), 'removed');
      rightHtml += renderLocalDiffLine('', '', 'pad');
      continue;
    }
    rightNo += 1;
    leftHtml += renderLocalDiffLine('', '', 'pad');
    rightHtml += renderLocalDiffLine(rightNo, escRichDiffHtml(op.right || ''), 'added');
  }

  outputElement.innerHTML = `
    <div style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;background:#fff">
      <table style="width:100%;border-collapse:collapse;table-layout:fixed">
        <thead>
          <tr>
            <th style="width:50%;padding:8px 10px;background:#f8fafc;border-bottom:1px solid #e2e8f0;border-right:1px solid #e2e8f0;text-align:left;font-size:11px;font-weight:700">${escRichDiffHtml(leftLabel)}</th>
            <th style="width:50%;padding:8px 10px;background:#f8fafc;border-bottom:1px solid #e2e8f0;text-align:left;font-size:11px;font-weight:700">${escRichDiffHtml(rightLabel)}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="vertical-align:top;border-right:1px solid #e2e8f0"><div style="max-height:360px;overflow:auto">${leftHtml || renderFallbackCell('', 'same')}</div></td>
            <td style="vertical-align:top"><div style="max-height:360px;overflow:auto">${rightHtml || renderFallbackCell('', 'same')}</div></td>
          </tr>
        </tbody>
      </table>
    </div>`;
}

export async function renderRichDiff(leftText, rightText, outputElement, options: any = {}) {
  const leftLabel = options.leftLabel || '比較元';
  const rightLabel = options.rightLabel || '比較先';
  const leftStr = typeof leftText === 'string' ? leftText : JSON.stringify(leftText, null, 2);
  const rightStr = typeof rightText === 'string' ? rightText : JSON.stringify(rightText, null, 2);

  try {
    renderLocalRichDiff(leftStr, rightStr, outputElement, {
      ...options,
      leftLabel,
      rightLabel
    });
  } catch (err) {
    renderPlainCompare(leftStr, rightStr, outputElement, {
      leftLabel,
      rightLabel,
      message: `ローカル差分描画に失敗したため、プレーン比較を表示しています。`
    });
    throw err;
  }
}

// ============================================================
// driver.js tour wrapper
// ============================================================

let driverInstance: any = null;

export async function startGuidedTour(steps, options: any = {}) {
  const doc = options.document || options.doc || getToolDocument();
  const win = doc?.defaultView || window;
  await loadExternalLibrary('driver', { document: doc });

  const driverModule = win.driver || window.driver;
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

  driverInstance?.drive();
}

export function destroyGuidedTour() {
  if (driverInstance) {
    try { driverInstance.destroy(); } catch (e) { /* */ }
    driverInstance = null;
  }
}
