'use strict';

import { esc } from '../utils.js';
import { buildApiPrefix, apiGet } from '../api.js';

function loadScript(url) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = url;
    s.async = true;
    s.onload = resolve;
    s.onerror = () => reject(new Error(`スクリプト読み込み失敗: ${url}`));
    document.head.appendChild(s);
  });
}

async function ensureMermaid() {
  if (window.mermaid) return window.mermaid;
  await loadScript('https://cdn.jsdelivr.net/npm/mermaid@10.6.1/dist/mermaid.min.js');
  if (window.mermaid) {
    window.mermaid.initialize({ startOnLoad: false, theme: 'default' });
    return window.mermaid;
  }
  throw new Error('Mermaid.js の読み込みに失敗しました');
}

/**
 * @param {{ appId: string, guestId?: string }} source
 * @param {(msg: string, err?: boolean) => void} setStatus
 * @param {{ textEl: HTMLTextAreaElement, viewEl: HTMLElement, simUi?: { container: HTMLElement, current: HTMLElement, select: HTMLSelectElement, startBtn: HTMLButtonElement, execBtn: HTMLButtonElement } }} targets
 */
export async function runRenderProcessFlowStandalone(source, setStatus, targets) {
  const app = String(source.appId || '').trim();
  if (!app) throw new Error('アプリIDを入力してください');

  const prefix = buildApiPrefix(source.guestId || '', false);
  setStatus('プロセス管理を取得中...');

  const res = await apiGet(prefix, '/app/status.json', { app });

  if (!res.enable) {
    targets.textEl.value = 'プロセス管理は無効です。';
    targets.viewEl.innerHTML = '<div style="color:#64748b">プロセス管理は無効です</div>';
    if (targets.simUi) targets.simUi.container.style.display = 'none';
    setStatus('プロセス管理は無効です');
    return null;
  }

  const states = res.states || {};
  const actions = res.actions || [];
  const safeStateName = (n) => n.replace(/[*_~\[\]()]/g, '');

  const renderMermaid = async (highlightState) => {
    let md = 'stateDiagram-v2\n';
    const startStates = new Set(Object.keys(states));
    for (const a of actions) { if (a.to) startStates.delete(a.to); }
    for (const st of startStates) {
      if (st && states[st]) md += `    [*] --> ${safeStateName(st)}\n`;
    }
    for (const a of actions) {
      md += `    ${safeStateName(a.from)} --> ${safeStateName(a.to)} : ${a.name.replace(/[*_~\[\]()"]/g, '')}\n`;
    }
    if (highlightState) {
      md += `\n    classDef current fill:#bbf7d0,stroke:#16a34a,stroke-width:2px,color:#0f172a;\n`;
      md += `    class ${safeStateName(highlightState)} current;\n`;
    }
    targets.textEl.value = md;
    try {
      const mermaidObj = await ensureMermaid();
      const { svg } = await mermaidObj.render('mermaid-svg-generated-' + Date.now(), md);
      targets.viewEl.innerHTML = svg;
    } catch (e) {
      targets.viewEl.innerHTML = `<div style="color:#b91c1c">エラー: ${esc(e.message || String(e))}</div>`;
    }
  };

  setStatus('フロー図 生成中...');
  await renderMermaid(null);
  setStatus('フロー図 生成完了');

  if (targets.simUi) {
    let current = null;
    const { container, current: curEl, select, startBtn, execBtn } = targets.simUi;
    container.style.display = 'block';

    const updateSim = () => {
      if (!current) {
        curEl.textContent = '未開始';
        curEl.style.background = '#e2e8f0';
        select.innerHTML = '<option value="">-- 開始ボタンを押してください --</option>';
        select.disabled = true;
        return;
      }
      curEl.textContent = current;
      curEl.style.background = '#bbf7d0';
      select.disabled = false;
      const avail = actions.filter(a => a.from === current);
      if (avail.length === 0) {
        select.innerHTML = '<option value="">-- 次のアクションなし（完了） --</option>';
        select.disabled = true;
      } else {
        select.innerHTML = avail.map(a => `<option value="${esc(a.name)}">${esc(a.name)} (→ ${esc(a.to)})</option>`).join('');
      }
    };
    updateSim();

    startBtn.onclick = async () => {
      const ss = new Set(Object.keys(states));
      for (const a of actions) if (a.to) ss.delete(a.to);
      current = [...ss][0] || Object.keys(states)[0] || null;
      updateSim();
      if (current) {
        setStatus('シミュレーション開始: ' + current);
        await renderMermaid(current);
      }
    };
    execBtn.onclick = async () => {
      if (select.disabled) return;
      const aName = select.value;
      if (!aName) return;
      const action = actions.find(a => a.from === current && a.name === aName);
      if (!action) return;
      current = action.to;
      updateSim();
      setStatus(`アクション「${aName}」実行 → 「${action.to}」`);
      await renderMermaid(action.to);
    };
  }

  return { states, actions };
}
