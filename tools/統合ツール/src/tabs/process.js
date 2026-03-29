'use strict';

import { ui } from '../state.js';
import { esc } from '../utils.js';
import { buildApiPrefix, apiGet } from '../api.js';
import { setStatus } from '../ui/components.js';
import { commonParams } from './diff.js';
import { getToolDocument } from '../ui/dialog.js';

let pfSimStates = null;
let pfSimActions = null;
let pfSimCurrent = null;

async function ensureMermaid() {
  if (window.mermaid) return window.mermaid;
  setStatus('Mermaid.js を読み込み中...');
  await loadScript('https://cdn.jsdelivr.net/npm/mermaid@10.6.1/dist/mermaid.min.js');
  if (window.mermaid) {
    window.mermaid.initialize({ startOnLoad: false, theme: 'default' });
    return window.mermaid;
  }
  throw new Error('Mermaid.js の読み込みに失敗しました');
}

function loadScript(url) {
  return new Promise((resolve, reject) => {
    const doc = getToolDocument();
    const s = doc.createElement('script');
    s.src = url;
    s.async = true;
    s.onload = resolve;
    s.onerror = () => reject(new Error(`スクリプト読み込み失敗: ${url}`));
    doc.head.appendChild(s);
  });
}

export async function redrawProcessFlow(highlightState) {
  if (!pfSimStates) return;

  let md = 'stateDiagram-v2\n';
  const safeStateName = (n) => n.replace(/[*_~\[\]()]/g, '');

  const startStates = new Set(Object.keys(pfSimStates));
  for (const a of pfSimActions) {
    if (a.to) startStates.delete(a.to);
  }

  for (const st of startStates) {
    if (st && pfSimStates[st]) md += `    [*] --> ${safeStateName(st)}\n`;
  }

  for (const a of pfSimActions) {
    const from = safeStateName(a.from);
    const to = safeStateName(a.to);
    const actionName = a.name.replace(/[*_~\[\]()"]/g, '');
    md += `    ${from} --> ${to} : ${actionName}\n`;
  }

  if (highlightState) {
    md += `\n    classDef current fill:#bbf7d0,stroke:#16a34a,stroke-width:2px,color:#0f172a;\n`;
    md += `    class ${safeStateName(highlightState)} current;\n`;
  }

  ui.mermaidText.value = md;

  try {
    const mermaidObj = await ensureMermaid();
    const { svg } = await mermaidObj.render('mermaid-svg-generated', md);
    ui.mermaidView.innerHTML = svg;
  } catch (e) {
    ui.mermaidView.innerHTML = `<div style="color:#b91c1c">エラー: ${esc(e.message || String(e))}</div>`;
    throw e;
  }
}

export function updateProcessSimulationUI() {
  const elCurr = getToolDocument().getElementById('u_simCurrentStatus');
  const elSel = getToolDocument().getElementById('u_simActionSelect');
  const container = getToolDocument().getElementById('u_simContainer');

  if (!pfSimStates || Object.keys(pfSimStates).length === 0) {
    if (container) container.style.display = 'none';
    return;
  }
  if (container) container.style.display = 'block';

  if (!pfSimCurrent) {
    elCurr.textContent = '未開始';
    elCurr.style.background = '#e2e8f0';
    elSel.innerHTML = '<option value="">-- 最初から開始してください --</option>';
    elSel.disabled = true;
    return;
  }

  elCurr.textContent = pfSimCurrent;
  elCurr.style.background = '#bbf7d0';
  elSel.disabled = false;

  const available = pfSimActions.filter(a => a.from === pfSimCurrent);
  if (available.length === 0) {
    elSel.innerHTML = '<option value="">-- 次のアクションなし（完了） --</option>';
    elSel.disabled = true;
  } else {
    elSel.innerHTML = available.map(a => `<option value="${esc(a.name)}">${esc(a.name)} (→ ${esc(a.to)})</option>`).join('');
  }
}

export async function runSimStart() {
  if (!pfSimStates) return;
  const startStates = new Set(Object.keys(pfSimStates));
  for (const a of pfSimActions) if (a.to) startStates.delete(a.to);
  const startSt = [...startStates][0] || Object.keys(pfSimStates)[0];
  if (!startSt) return;

  pfSimCurrent = startSt;
  updateProcessSimulationUI();
  setStatus('シミュレーション開始: ' + startSt);
  await redrawProcessFlow(startSt);
}

export async function runSimExecuteAction() {
  const sel = getToolDocument().getElementById('u_simActionSelect');
  if (sel.disabled) return;
  const actionName = sel.value;
  if (!actionName) return;

  const action = pfSimActions.find(a => a.from === pfSimCurrent && a.name === actionName);
  if (!action) return;

  pfSimCurrent = action.to;
  updateProcessSimulationUI();
  setStatus(`アクション「${actionName}」実行 → 「${action.to}」`);
  await redrawProcessFlow(action.to);
}

export async function runRenderProcessFlow() {
  const c = commonParams();
  const app = c.source.appId;
  if (!app) throw new Error('比較元アプリIDを入力してください');

  const prefix = buildApiPrefix(c.source.guestId, false);
  setStatus('プロセス管理を取得中...');

  try {
    const res = await apiGet(prefix, '/app/status.json', { app });
    if (!res.enable) {
      ui.mermaidText.value = 'プロセス管理は無効です。';
      ui.mermaidView.innerHTML = '<div style="color:#64748b">プロセス管理は無効です</div>';
      setStatus('プロセス管理は無効です');
      pfSimStates = null;
      pfSimActions = null;
      pfSimCurrent = null;
      updateProcessSimulationUI();
      return;
    }

    pfSimStates = res.states || {};
    pfSimActions = res.actions || [];
    pfSimCurrent = null;

    setStatus('フロー図 生成中...');
    await redrawProcessFlow(null);
    updateProcessSimulationUI();
    setStatus('フロー図 生成完了');
  } catch (e) {
    ui.mermaidView.innerHTML = `<div style="color:#b91c1c">エラー: ${esc(e.message || String(e))}</div>`;
    throw e;
  }
}
