'use strict';

import { esc } from '../utils.js';
import { buildApiPrefix, apiGet } from '../api.js';

let mermaidLoadPromise = null;
const MERMAID_CDN_URLS = [
  'https://cdn.jsdelivr.net/npm/mermaid@10.6.1/dist/mermaid.min.js',
  'https://unpkg.com/mermaid@10.6.1/dist/mermaid.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/mermaid/10.6.1/mermaid.min.js'
];

function loadScript(url: string): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    let cspViolation: any = null;
    const onPolicyViolation = (ev: any) => {
      const blocked = String(ev.blockedURI || '');
      if (blocked === url || blocked.includes('mermaid')) {
        cspViolation = ev;
      }
    };
    const existing = document.querySelector(`script[src="${url}"]`) as HTMLScriptElement | null;
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
    const s = document.createElement('script');
    s.src = url;
    s.async = true;
    document.addEventListener('securitypolicyviolation', onPolicyViolation as any, false);
    const cleanup = () => document.removeEventListener('securitypolicyviolation', onPolicyViolation as any, false);
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
    document.head.appendChild(s);
  });
}

async function loadScriptWithFallback(urls: string[]): Promise<void> {
  let lastErr: any = null;
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

async function ensureMermaid(): Promise<any> {
  const w = window as any;
  if (w.mermaid) return w.mermaid;
  if (!mermaidLoadPromise) {
    mermaidLoadPromise = loadScriptWithFallback(MERMAID_CDN_URLS).catch((err: any) => {
      mermaidLoadPromise = null;
      throw err;
    });
  }
  await mermaidLoadPromise;
  if (w.mermaid) {
    w.mermaid.initialize({ startOnLoad: false, theme: 'default', securityLevel: 'strict' });
    return w.mermaid;
  }
  throw new Error('Mermaid.js の読み込みに失敗しました');
}

/** Mermaid の `state "..." as id` に入れる表示名。ダブルクォートと改行は使えないので置換する。 */
function mermaidDisplayName(name: string): string {
  return String(name ?? '')
    .replace(/[\r\n]+/g, ' ')
    .replace(/"/g, "'")
    .trim() || '(名称なし)';
}

/** 遷移ラベル（`A --> B : label`）。改行・コロン・セミコロンは構文と衝突するので置換する。 */
function mermaidTransitionLabel(name: string): string {
  return String(name ?? '')
    .replace(/[\r\n]+/g, ' ')
    .replace(/[:;]/g, '-')
    .replace(/[#"]/g, '')
    .trim() || '(名称なし)';
}

/**
 * プロセス管理の状態・アクションから Mermaid stateDiagram-v2 ソースを組み立てる。
 * 状態名に空白・記号・日本語が含まれても壊れないよう、状態は `s0`, `s1`… の別名で参照し、
 * 表示名は `state "名前" as s0` で宣言する。
 * 純粋関数なので単体テストで回帰固定できる。
 */
export function buildProcessMermaidSource(states: any, actions: any[], highlightState?: string | null): string {
  const stateNames = Object.keys(states || {});
  const ids = new Map<string, string>();
  const idOf = (name: string): string => {
    const key = String(name ?? '');
    let id = ids.get(key);
    if (!id) {
      id = `s${ids.size}`;
      ids.set(key, id);
    }
    return id;
  };
  const lines = ['stateDiagram-v2'];
  for (const st of stateNames) {
    lines.push(`    state "${mermaidDisplayName(st)}" as ${idOf(st)}`);
  }
  const validActions = (Array.isArray(actions) ? actions : []).filter((a) => a && a.from != null && a.to != null);
  // アクションに現れるが states に無い状態（設定不整合）も描画から落とさない
  for (const a of validActions) {
    for (const name of [String(a.from), String(a.to)]) {
      if (!ids.has(name)) lines.push(`    state "${mermaidDisplayName(name)}" as ${idOf(name)}`);
    }
  }
  // 開始状態（index 最小）は差し戻しで遷移先になっていても [*] から入る。
  // それ以外で遷移先にならない状態も孤立させず [*] から描く。
  const initial = findInitialState(states, validActions);
  const startStates = new Set(stateNames);
  for (const a of validActions) startStates.delete(String(a.to));
  if (initial != null) startStates.add(initial);
  for (const st of stateNames) {
    if (startStates.has(st)) lines.push(`    [*] --> ${idOf(st)}`);
  }
  for (const a of validActions) {
    lines.push(`    ${idOf(String(a.from))} --> ${idOf(String(a.to))} : ${mermaidTransitionLabel(a.name)}`);
  }
  if (highlightState != null && highlightState !== '' && ids.has(String(highlightState))) {
    lines.push('');
    lines.push('    classDef current fill:#bbf7d0,stroke:#16a34a,stroke-width:2px,color:#0f172a');
    lines.push(`    class ${idOf(String(highlightState))} current`);
  }
  return lines.join('\n') + '\n';
}

/**
 * プロセス管理の開始状態を返す。
 * kintone の status.json では index が最小の状態が開始状態（差し戻しで遷移先になっていてもよい）。
 * index が無い入力では、どの遷移先にもならない状態、それも無ければ先頭の状態を使う。
 */
export function findInitialState(states: any, actions: any[]): string | null {
  const names = Object.keys(states || {});
  if (!names.length) return null;
  const indexed = names
    .map((name) => ({ name, index: Number(states?.[name]?.index) }))
    .filter((s) => Number.isFinite(s.index));
  if (indexed.length === names.length) {
    indexed.sort((a, b) => a.index - b.index);
    return indexed[0].name;
  }
  const remaining = new Set(names);
  for (const a of Array.isArray(actions) ? actions : []) {
    if (a?.to != null) remaining.delete(String(a.to));
  }
  return [...remaining][0] || names[0];
}

function renderFallbackFlowHtml(states: any, actions: any, highlightState: string | undefined) {
  const stateList = Object.keys(states || ({} as any));
  const transitions = (actions || []).map((a: any) => {
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

  const states = res.states || ({} as any);
  const actions = (res.actions || []).filter((a: any) => a && a.from != null && a.to != null);
  const orphanActions = (res.actions || []).length - actions.length;

  const renderMermaid = async (highlightState) => {
    const md = buildProcessMermaidSource(states, actions, highlightState);
    targets.textEl.value = md;
    try {
      const mermaidObj = await ensureMermaid();
      const { svg } = await mermaidObj.render('mermaid-svg-generated-' + Date.now(), md);
      targets.viewEl.innerHTML = svg;
    } catch (e) {
      targets.viewEl.innerHTML = renderFallbackFlowHtml(states, actions, highlightState);
      setStatus(`Mermaid.js の読み込みに失敗したため、簡易表示に切り替えました。(${e.message || e})`, true);
    }
  };

  setStatus('フロー図 生成中...');
  await renderMermaid(null);
  setStatus(orphanActions ? `フロー図 生成完了（from/to 未設定のアクション ${orphanActions}件は除外）` : 'フロー図 生成完了', orphanActions > 0);

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
      const avail = actions.filter((a) => a.from === current);
      if (avail.length === 0) {
        select.innerHTML = '<option value="">-- 次のアクションなし（完了） --</option>';
        select.disabled = true;
      } else {
        select.innerHTML = avail.map((a, idx) => `<option value="${idx}">${esc(a.name)} (→ ${esc(a.to)})</option>`).join('');
      }
    };
    updateSim();

    startBtn.onclick = async () => {
      current = findInitialState(states, actions);
      updateSim();
      if (current) {
        setStatus('シミュレーション開始: ' + current);
        await renderMermaid(current);
      }
    };
    execBtn.onclick = async () => {
      if (select.disabled) return;
      const idx = Number(select.value);
      if (!Number.isFinite(idx)) return;
      // 同名アクションが複数ある場合でも、表示中の選択肢（from に一致する並び）から確実に選ぶ
      const action = actions.filter((a) => a.from === current)[idx];
      if (!action) return;
      current = action.to;
      updateSim();
      setStatus(`アクション「${action.name}」実行 → 「${action.to}」`);
      await renderMermaid(action.to);
    };
  }

  return { states, actions };
}
