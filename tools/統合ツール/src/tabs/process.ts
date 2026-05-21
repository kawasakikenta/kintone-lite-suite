'use strict';

import { ui } from '../state.js';
import { downloadText, esc, nowStamp, showToast } from '../utils.js';
import { buildApiPrefix, apiGet } from '../api.js';
import { setStatus } from '../ui/components.js';
import { commonParams } from './diff.js';
import { getToolDocument } from '../ui/dialog.js';

let pfSimStates: any = null;
let pfSimActions: any[] | null = null;
let pfSimCurrent: string | null = null;
let pfSimHistory: Array<{ from: string; action: string; to: string; at: string }> = [];
let mermaidLoadPromise: Promise<void> | null = null;
let mermaidRenderSeq = 0;

const MERMAID_CDN_URLS = [
  'https://cdn.jsdelivr.net/npm/mermaid@10.6.1/dist/mermaid.min.js',
  'https://unpkg.com/mermaid@10.6.1/dist/mermaid.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/mermaid/10.6.1/mermaid.min.js'
];

function getMermaidGlobal(): any {
  const doc = getToolDocument();
  const docWin = (doc as any)?.defaultView;
  if (docWin && docWin.mermaid) return docWin.mermaid;
  if ((window as any).mermaid) return (window as any).mermaid;
  return null;
}

async function ensureMermaid() {
  const existing = getMermaidGlobal();
  if (existing) return existing;
  if (!mermaidLoadPromise) {
    setStatus('Mermaid.js を読み込み中...');
    mermaidLoadPromise = loadScriptWithFallback(MERMAID_CDN_URLS).catch((err) => {
      mermaidLoadPromise = null;
      throw err;
    });
  }
  await mermaidLoadPromise;
  const m = getMermaidGlobal();
  if (m) {
    m.initialize({ startOnLoad: false, theme: 'default' });
    return m;
  }
  throw new Error('Mermaid.js の読み込みに失敗しました');
}

function loadScript(url: string): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const doc = getToolDocument();
    let cspViolation: any = null;
    const onPolicyViolation = (ev: any) => {
      const blocked = String(ev.blockedURI || '');
      if (blocked === url || blocked.includes('mermaid')) {
        cspViolation = ev;
      }
    };
    const existing = doc.querySelector(`script[src="${url}"]`) as HTMLScriptElement | null;
    if (existing) {
      if (existing.dataset.loaded === '1') {
        resolve();
      } else if (existing.dataset.failed === '1') {
        existing.remove();
        loadScript(url).then(resolve).catch(reject);
      } else {
        existing.addEventListener('load', () => resolve(), { once: true });
        existing.addEventListener('error', () => reject(new Error(`スクリプト読み込み失敗: ${url}`)), { once: true });
      }
      return;
    }
    const s = doc.createElement('script');
    s.src = url;
    s.async = true;
    doc.addEventListener('securitypolicyviolation', onPolicyViolation as any, false);
    const cleanup = () => doc.removeEventListener('securitypolicyviolation', onPolicyViolation as any, false);
    s.onload = () => {
      cleanup();
      s.dataset.loaded = '1';
      resolve();
    };
    s.onerror = () => {
      cleanup();
      s.dataset.failed = '1';
      if (cspViolation) {
        reject(new Error(
          `スクリプト読み込み失敗(CSP): ${url} / directive=${cspViolation.effectiveDirective || 'unknown'} / blocked=${cspViolation.blockedURI || 'unknown'}`
        ));
        return;
      }
      reject(new Error(`スクリプト読み込み失敗: ${url}`));
    };
    doc.head.appendChild(s);
  });
}

async function loadScriptWithFallback(urls: string[]): Promise<void> {
  let lastErr = null;
  for (const url of urls) {
    try {
      await loadScript(url);
      return;
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error('Mermaid.js の読み込みに失敗しました');
}

function renderFallbackFlowHtml(states, actions, highlightState) {
  const stateList = Object.keys(states || ({} as any));
  const transitions = (actions || []).map((a) => {
    const from = esc(a.from || '');
    const to = esc(a.to || '');
    const name = esc(a.name || '');
    const current = highlightState && (a.from === highlightState || a.to === highlightState);
    const style = current ? ' style="background:#dcfce7"' : '';
    return `<tr${style}><td>${from}</td><td>${name}</td><td>${to}</td></tr>`;
  }).join('');
  const stateHtml = stateList.map((s) => {
    const isCurrent = highlightState === s;
    const style = isCurrent ? 'background:#bbf7d0;border-color:#16a34a' : 'background:#f8fafc;border-color:#cbd5e1';
    return `<span style="display:inline-block;margin:2px;padding:2px 8px;border:1px solid;${style};border-radius:9999px">${esc(s)}</span>`;
  }).join('');
  return `
    <div style="color:#334155;font-size:12px;line-height:1.5">
      <div style="margin-bottom:8px;color:#b45309">Mermaid.js を読み込めなかったため、簡易表示に切り替えました。</div>
      <div style="margin-bottom:8px">${stateHtml || '<span style="color:#94a3b8">状態なし</span>'}</div>
      <table style="width:100%;border-collapse:collapse;font-size:12px">
        <thead><tr><th style="text-align:left;border-bottom:1px solid #cbd5e1;padding:4px">From</th><th style="text-align:left;border-bottom:1px solid #cbd5e1;padding:4px">Action</th><th style="text-align:left;border-bottom:1px solid #cbd5e1;padding:4px">To</th></tr></thead>
        <tbody>${transitions || '<tr><td colspan="3" style="padding:6px;color:#94a3b8">遷移なし</td></tr>'}</tbody>
      </table>
    </div>
  `;
}

export async function redrawProcessFlow(highlightState) {
  if (!pfSimStates) return;

  let md = 'stateDiagram-v2\n';
  const safeStateName = (n) => String(n == null ? '' : n).replace(/[*_~\[\]()]/g, '');
  const safeActionName = (n) => String(n == null ? '' : n).replace(/[*_~\[\]()"]/g, '');

  const startStates = new Set(Object.keys(pfSimStates));
  for (const a of pfSimActions) {
    if (a && a.to) startStates.delete(a.to);
  }

  for (const st of startStates) {
    if (st && pfSimStates[st]) md += `    [*] --> ${safeStateName(st)}\n`;
  }

  for (const a of pfSimActions) {
    if (!a || !a.from || !a.to) continue;
    const from = safeStateName(a.from);
    const to = safeStateName(a.to);
    const actionName = safeActionName(a.name);
    md += `    ${from} --> ${to} : ${actionName}\n`;
  }

  if (highlightState) {
    md += `\n    classDef current fill:#bbf7d0,stroke:#16a34a,stroke-width:2px,color:#0f172a;\n`;
    md += `    class ${safeStateName(highlightState)} current;\n`;
  }

  ui.mermaidText.value = md;

  try {
    const mermaidObj = await ensureMermaid();
    mermaidRenderSeq += 1;
    const { svg } = await mermaidObj.render(`mermaid-svg-generated-${Date.now()}-${mermaidRenderSeq}`, md);
    ui.mermaidView.innerHTML = svg;
  } catch (e) {
    ui.mermaidView.innerHTML = renderFallbackFlowHtml(pfSimStates, pfSimActions, highlightState);
    setStatus(`Mermaid.js の読み込みに失敗したため、簡易表示に切り替えました。(${e.message || e})`);
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

  const elCurrEl = elCurr as HTMLElement | null;
  const elSelEl = elSel as HTMLSelectElement | null;
  if (!elCurrEl || !elSelEl) return;

  if (!pfSimCurrent) {
    elCurrEl.textContent = '未開始';
    elCurrEl.style.background = '#e2e8f0';
    elSelEl.innerHTML = '<option value="">-- 最初から開始してください --</option>';
    elSelEl.disabled = true;
    return;
  }

  elCurrEl.textContent = pfSimCurrent;
  elCurrEl.style.background = '#bbf7d0';
  elSelEl.disabled = false;

  const available = pfSimActions.filter((a: any) => a.from === pfSimCurrent);
  if (available.length === 0) {
    elSelEl.innerHTML = '<option value="">-- 次のアクションなし（完了） --</option>';
    elSelEl.disabled = true;
  } else {
    elSelEl.innerHTML = available.map((a: any) => `<option value="${esc(a.name)}">${esc(a.name)} (→ ${esc(a.to)})</option>`).join('');
  }
}

function nowTimeLabel(): string {
  const d = new Date();
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

function renderSimHistory(): void {
  const el = getToolDocument().getElementById('u_simHistoryList');
  if (!el) return;
  if (!pfSimHistory.length) {
    el.innerHTML = '<div style="color:#94a3b8;font-size:11px;font-style:italic;padding:6px;">履歴はありません（最初から実行で開始）</div>';
    return;
  }
  const rows = pfSimHistory.map((h, idx) => {
    return `<div style="display:flex;gap:6px;align-items:center;padding:4px 6px;border-bottom:1px dashed #e2e8f0;font-size:11px;">
      <span style="color:#94a3b8;width:24px;flex-shrink:0;">#${idx + 1}</span>
      <span style="color:#94a3b8;flex-shrink:0;font-variant-numeric:tabular-nums;">${esc(h.at)}</span>
      <span style="color:#0f172a;font-weight:600;">${esc(h.from)}</span>
      <span style="color:#64748b;">→</span>
      <span style="color:#1e40af;background:#dbeafe;padding:1px 5px;border-radius:4px;">${esc(h.action)}</span>
      <span style="color:#64748b;">→</span>
      <span style="color:#0f172a;font-weight:600;">${esc(h.to)}</span>
    </div>`;
  }).join('');
  el.innerHTML = rows;
}

export async function runSimStart() {
  if (!pfSimStates) return;
  const startStates = new Set(Object.keys(pfSimStates));
  for (const a of (pfSimActions || [])) if (a.to) startStates.delete(a.to);
  const startSt = [...startStates][0] || Object.keys(pfSimStates)[0];
  if (!startSt) return;

  pfSimCurrent = startSt;
  pfSimHistory = [];
  renderSimHistory();
  updateProcessSimulationUI();
  setStatus('シミュレーション開始: ' + startSt);
  await redrawProcessFlow(startSt);
}

export async function runSimExecuteAction() {
  const sel = getToolDocument().getElementById('u_simActionSelect') as HTMLSelectElement | null;
  if (!sel || sel.disabled) return;
  const actionName = sel.value;
  if (!actionName) return;

  const action = (pfSimActions || []).find(a => a.from === pfSimCurrent && a.name === actionName);
  if (!action) return;

  const prev = pfSimCurrent;
  pfSimCurrent = action.to;
  pfSimHistory.push({ from: prev || '?', action: actionName, to: action.to, at: nowTimeLabel() });
  renderSimHistory();
  updateProcessSimulationUI();
  setStatus(`アクション「${actionName}」実行 → 「${action.to}」`);
  await redrawProcessFlow(action.to);
}

export function runSimUndo(): void {
  if (!pfSimHistory.length) {
    showToast('巻き戻せる履歴がありません', 'warn');
    return;
  }
  const last = pfSimHistory.pop();
  pfSimCurrent = last ? last.from : pfSimCurrent;
  renderSimHistory();
  updateProcessSimulationUI();
  setStatus(`巻き戻し: 現在ステータス ${pfSimCurrent}`);
  redrawProcessFlow(pfSimCurrent || null);
}

export async function copyMermaidSource(): Promise<void> {
  const text = (getToolDocument().getElementById('u_mermaidText') as HTMLTextAreaElement | null)?.value || '';
  if (!text.trim()) {
    showToast('先にフロー図を取得してください', 'warn');
    return;
  }
  try {
    await navigator.clipboard.writeText(text);
    setStatus('Mermaid構文をコピーしました');
  } catch (_e) {
    showToast('クリップボードへコピーできませんでした', 'error');
  }
}

export function downloadMermaidSource(): void {
  const text = (getToolDocument().getElementById('u_mermaidText') as HTMLTextAreaElement | null)?.value || '';
  if (!text.trim()) {
    showToast('先にフロー図を取得してください', 'warn');
    return;
  }
  downloadText(`process-flow_${nowStamp()}.mmd`, text, 'text/plain;charset=utf-8');
  setStatus('Mermaid構文を保存しました');
}

export function downloadFlowSvg(): void {
  const viewEl = getToolDocument().getElementById('u_mermaidView');
  const svg = viewEl?.querySelector('svg');
  if (!svg) {
    showToast('先にフロー図を取得してください（SVG未生成）', 'warn');
    return;
  }
  const clone = svg.cloneNode(true) as SVGElement;
  if (!clone.getAttribute('xmlns')) clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  const xml = new XMLSerializer().serializeToString(clone);
  downloadText(`process-flow_${nowStamp()}.svg`, xml, 'image/svg+xml;charset=utf-8');
  setStatus('フロー図をSVGとして保存しました');
}

export function renderProcessFlowSummary(): void {
  const el = getToolDocument().getElementById('u_processFlowSummary');
  if (!el) return;
  if (!pfSimStates || !pfSimActions) {
    el.innerHTML = '<span style="color:#94a3b8;font-style:italic;">フロー図を取得すると、ステータス・アクションの統計を表示します</span>';
    return;
  }
  const stateNames = Object.keys(pfSimStates);
  const stateCount = stateNames.length;
  const actionCount = pfSimActions.length;
  const startStates = new Set(stateNames);
  for (const a of pfSimActions) if (a.to) startStates.delete(a.to);
  const endStates = new Set(stateNames);
  for (const s of stateNames) {
    if (pfSimActions.some((a: any) => a.from === s)) endStates.delete(s);
  }
  const branching = stateNames.filter((s) => pfSimActions.filter((a: any) => a.from === s).length >= 2);
  const orphanFrom = pfSimActions.filter((a: any) => !pfSimStates[a.from]);
  const orphanTo = pfSimActions.filter((a: any) => !pfSimStates[a.to]);
  const issues: string[] = [];
  if (!startStates.size) issues.push('始点（受信側のないステータス）が見つかりません');
  if (!endStates.size) issues.push('終端（次のアクションのないステータス）が見つかりません');
  if (orphanFrom.length) issues.push(`未定義ステータスから出るアクション ${orphanFrom.length} 件`);
  if (orphanTo.length) issues.push(`未定義ステータスへ入るアクション ${orphanTo.length} 件`);
  const chip = (label: string, value: number, color: string) =>
    `<span style="display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:9999px;background:${color}1a;color:${color};font-size:11px;font-weight:600;">${esc(label)} <span style="font-variant-numeric:tabular-nums;">${value}</span></span>`;
  const issueHtml = issues.length
    ? `<div style="margin-top:6px;color:#b45309;font-size:11px;line-height:1.5;">⚠ ${issues.map(esc).join(' / ')}</div>`
    : '';
  el.innerHTML = `<div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;">
    ${chip('ステータス', stateCount, '#0f172a')}
    ${chip('アクション', actionCount, '#1e40af')}
    ${chip('始点', startStates.size, '#16a34a')}
    ${chip('終端', endStates.size, '#9333ea')}
    ${chip('分岐ステータス', branching.length, '#d97706')}
  </div>${issueHtml}`;
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
      pfSimHistory = [];
      updateProcessSimulationUI();
      renderSimHistory();
      renderProcessFlowSummary();
      return;
    }

    pfSimStates = res.states || ({} as any);
    pfSimActions = res.actions || [];
    pfSimCurrent = null;
    pfSimHistory = [];

    setStatus('フロー図 生成中...');
    await redrawProcessFlow(null);
    updateProcessSimulationUI();
    renderSimHistory();
    renderProcessFlowSummary();
    setStatus('フロー図 生成完了');
  } catch (e) {
    ui.mermaidView.innerHTML = `<div style="color:#b91c1c">エラー: ${esc(e.message || String(e))}</div>`;
    throw e;
  }
}
