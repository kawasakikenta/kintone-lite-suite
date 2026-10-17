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

const initializedMermaid = new WeakSet<object>();

async function ensureMermaid(): Promise<any> {
  const w = window as any;
  if (!w.mermaid) {
    if (!mermaidLoadPromise) {
      mermaidLoadPromise = loadScriptWithFallback(MERMAID_CDN_URLS).catch((err: any) => {
        mermaidLoadPromise = null;
        throw err;
      });
    }
    await mermaidLoadPromise;
  }
  if (!w.mermaid) throw new Error('Mermaid.js の読み込みに失敗しました');
  // kintone 側のカスタマイズが先に mermaid を読み込んでいた場合も、ステータス名・アクション名を
  // 描画するので securityLevel: 'strict' を必ず適用する（初期化は 1 回だけ）
  if (!initializedMermaid.has(w.mermaid) && typeof w.mermaid.initialize === 'function') {
    w.mermaid.initialize({ startOnLoad: false, theme: 'default', securityLevel: 'strict' });
    initializedMermaid.add(w.mermaid);
  }
  return w.mermaid;
}

/** HTML タグとして解釈されて表示名が欠ける `<` を全角にする（`<10万円` のようにタグにならない `<` は残す）。 */
function neutralizeHtmlTagOpen(text: string): string {
  return text.replace(/<(?=[A-Za-z/!?])/g, '＜');
}

/** Mermaid の `state "..." as id` に入れる表示名。ダブルクォートと改行は使えないので置換する。 */
function mermaidDisplayName(name: string): string {
  return neutralizeHtmlTagOpen(String(name ?? '')
    .replace(/[\r\n]+/g, ' ')
    .replace(/"/g, "'"))
    .trim() || '(名称なし)';
}

/** 遷移ラベル（`A --> B : label`）。改行・コロン・セミコロンは構文と衝突するので置換する。 */
function mermaidTransitionLabel(name: string): string {
  return neutralizeHtmlTagOpen(String(name ?? '')
    .replace(/[\r\n]+/g, ' ')
    .replace(/[:;]/g, '-')
    .replace(/[#"]/g, ''))
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
  if (validActions.length > 0) {
    const hasIncoming = new Set(validActions.map((a) => String(a.to)));
    const hasOutgoing = new Set(validActions.map((a) => String(a.from)));
    for (const st of stateNames) {
      if (hasIncoming.has(st) && !hasOutgoing.has(st)) {
        lines.push(`    ${idOf(st)} --> [*]`);
      }
    }
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
  // Number(null) や Number('') は 0 になり、index 未設定の状態を開始状態に取り違えるため数値化しない
  const indexed = names
    .map((name) => {
      const raw = states?.[name]?.index;
      return { name, index: raw == null || String(raw).trim() === '' ? NaN : Number(raw) };
    })
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

export interface ProcessFlowConnection {
  appId: string;
  guestId: string;
  preview?: boolean;
}

/** Validate process-flow inputs before a guest-space REST path is built. */
export function validateProcessConnection(appId: unknown, guestId: unknown = '', preview?: unknown): ProcessFlowConnection {
  const app = String(appId ?? '').trim();
  if (!/^[1-9]\d*$/.test(app)) throw new Error('アプリIDは正の数値で入力してください');
  const guest = String(guestId ?? '').trim();
  if (guest && !/^[1-9]\d*$/.test(guest)) throw new Error('ゲストIDは正の数値で入力してください');
  return preview === undefined ? { appId: app, guestId: guest } : { appId: app, guestId: guest, preview: !!preview };
}

export async function fetchProcessStatusSettings(connection: { appId: string; guestId?: string; preview?: boolean }) {
  const prefix = buildApiPrefix(connection.guestId || '', !!connection.preview);
  return apiGet(prefix, '/app/status.json', { app: connection.appId, lang: 'user' });
}

export interface ProcessStructureSummary {
  stateCount: number;
  actionCount: number;
  startStates: string[];
  endStates: string[];
  branchingStates: string[];
  undefinedStates: string[];
  orphanActionCount: number;
  warnings: string[];
}

export function summarizeProcessStructure(states: any, actions: any[], orphanActionCount = 0): ProcessStructureSummary {
  const stateObj = states && typeof states === 'object' && !Array.isArray(states) ? states : {};
  const stateNames = Object.keys(stateObj);
  const validActions = (Array.isArray(actions) ? actions : []).filter(
    (a) => a && a.from != null && a.to != null && String(a.from).trim() && String(a.to).trim()
  );
  const startSet = new Set(stateNames);
  for (const a of validActions) startSet.delete(String(a.to));
  const initial = findInitialState(stateObj, validActions);
  if (initial != null && stateObj[initial]) startSet.add(initial);
  const startStates = stateNames.filter((s) => startSet.has(s));
  const endStates = stateNames.filter((s) => !validActions.some((a) => String(a.from) === s));
  const branchingStates = stateNames.filter((s) => validActions.filter((a) => String(a.from) === s).length >= 2);
  const undefinedSet = new Set<string>();
  for (const a of validActions) {
    if (!stateObj[String(a.from)]) undefinedSet.add(String(a.from));
    if (!stateObj[String(a.to)]) undefinedSet.add(String(a.to));
  }
  const undefinedStates = [...undefinedSet];
  const warnings: string[] = [];
  if (stateNames.length > 0 && !startStates.length) warnings.push('始点状態が見つかりません');
  if (stateNames.length > 0 && validActions.length > 0 && !endStates.length) warnings.push('終端状態（完了状態）がありません（循環のみのフロー）');
  if (undefinedStates.length) warnings.push(`未定義の状態を参照するアクションがあります（${undefinedStates.join(', ')}）`);
  if (orphanActionCount > 0) warnings.push(`from/to 未設定のアクション ${orphanActionCount}件を除外しました`);
  return {
    stateCount: stateNames.length,
    actionCount: validActions.length,
    startStates,
    endStates,
    branchingStates,
    undefinedStates,
    orphanActionCount,
    warnings
  };
}

export function renderProcessStructureSummaryHtml(summary: ProcessStructureSummary): string {
  const chip = (label: string, val: string | number, color: string) =>
    `<span style="display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:9999px;background:${color}1a;color:${color};font-size:11px;font-weight:600">${esc(label)} <span>${esc(String(val))}</span></span>`;
  const warningHtml = summary.warnings.length
    ? `<div style="margin-top:6px;color:#b45309;font-size:11px;line-height:1.5">⚠ ${summary.warnings.map(esc).join(' / ')}</div>`
    : '';
  return `<div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center">
    ${chip('状態', summary.stateCount, '#0f172a')}
    ${chip('アクション', summary.actionCount, '#1e40af')}
    ${chip('始点', summary.startStates.join(', ') || 'なし', '#16a34a')}
    ${chip('終端', summary.endStates.join(', ') || 'なし', '#9333ea')}
    ${chip('分岐状態', summary.branchingStates.length, '#d97706')}
  </div>${warningHtml}`;
}

export function describeStateAssignee(stateDef: any): string {
  const assignee = stateDef?.assignee;
  if (!assignee || typeof assignee !== 'object') return '作業者設定: なし';
  const entities = Array.isArray(assignee.entities) ? assignee.entities : [];
  if (!entities.length) return '作業者設定: なし';
  const labels = entities.map((item: any) => {
    const ent = item?.entity || item;
    const code = String(ent?.code || '').trim();
    const type = String(ent?.type || '').trim();
    const sub = item?.includeSubs ? '（下位組織含む）' : '';
    if (type === 'CREATOR') return '作成者';
    return `${code || type || '未設定'}${sub}`;
  });
  const mode = assignee.type === 'ALL' ? '全員' : assignee.type === 'ANY' ? '誰でも' : '1人';
  return `作業者(${mode}): ${labels.join(', ')}`;
}

export function describeSimActionCondition(action: any): string {
  if (!action) return '';
  const cond = String(action.filterCond || '').trim();
  const typeNote = action.type === 'SECONDARY' ? '（作業者以外も実行可）' : '';
  return `実行条件: ${cond || '条件なし'}${typeNote}`;
}

function renderFallbackFlowHtml(states: any, actions: any, highlightState: string | undefined, reason: string) {
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
      <div style="margin-bottom:8px;color:#b45309">${esc(reason)}</div>
      <div style="margin-bottom:8px">${stateHtml || '<span style="color:#94a3b8">状態なし</span>'}</div>
      <table style="width:100%;border-collapse:collapse;font-size:12px">
        <thead><tr><th style="text-align:left;border-bottom:1px solid #cbd5e1;padding:4px">From</th><th style="text-align:left;border-bottom:1px solid #cbd5e1;padding:4px">Action</th><th style="text-align:left;border-bottom:1px solid #cbd5e1;padding:4px">To</th></tr></thead>
        <tbody>${transitions || '<tr><td colspan="3" style="padding:6px;color:#94a3b8">遷移なし</td></tr>'}</tbody>
      </table>
    </div>
  `;
}

export interface StandaloneProcessSimUi {
  container: HTMLElement;
  current: HTMLElement;
  select: HTMLSelectElement;
  startBtn: HTMLButtonElement;
  execBtn: HTMLButtonElement;
  undoBtn?: HTMLButtonElement | null;
  historyEl?: HTMLElement | null;
  detailEl?: HTMLElement | null;
}

export function bindStandaloneProcessSimulation(
  states: any,
  actions: any[],
  simUi: StandaloneProcessSimUi,
  options: {
    isCurrent: () => boolean;
    commitStatus: (msg: string, err?: boolean, tone?: 'ok' | 'warn') => void;
    renderMermaid: (highlightState: string | null) => Promise<boolean>;
  }
) {
  let current: string | null = null;
  let history: Array<{ from: string; action: string; to: string }> = [];
  const { container, current: curEl, select, startBtn, execBtn, undoBtn, historyEl, detailEl } = simUi;
  const { isCurrent, commitStatus, renderMermaid } = options;
  container.style.display = 'block';

  const getAvailableActions = () => (current ? actions.filter((a) => a.from === current) : []);

  const updateDetail = () => {
    if (!detailEl) return;
    if (!current) {
      detailEl.textContent = '「最初から開始」を押すと、各状態の作業者設定と選択アクションの実行条件を表示します。';
      return;
    }
    const avail = getAvailableActions();
    const idx = Number(select.value);
    const selectedAction = Number.isFinite(idx) ? avail[idx] : avail[0];
    const parts = [describeStateAssignee(states?.[current])];
    if (selectedAction) parts.push(describeSimActionCondition(selectedAction));
    detailEl.textContent = parts.filter(Boolean).join(' / ');
  };

  const updateHistory = () => {
    if (undoBtn) undoBtn.disabled = history.length === 0;
    if (!historyEl) return;
    if (!history.length) {
      historyEl.textContent = current ? `開始: ${current}（遷移履歴なし）` : '遷移履歴: まだ開始していません';
      return;
    }
    const chain = [history[0].from, ...history.map((h) => `[${h.action}] → ${h.to}`)].join(' ');
    historyEl.textContent = `遷移履歴 (${history.length}手): ${chain}`;
  };

  const updateSim = () => {
    if (!current) {
      curEl.textContent = '未開始';
      curEl.style.background = '#e2e8f0';
      select.innerHTML = '<option value="">-- 開始ボタンを押してください --</option>';
      select.disabled = true;
      updateDetail();
      updateHistory();
      return;
    }
    curEl.textContent = current;
    curEl.style.background = '#bbf7d0';
    select.disabled = false;
    const avail = getAvailableActions();
    if (avail.length === 0) {
      select.innerHTML = '<option value="">-- 次のアクションなし（完了） --</option>';
      select.disabled = true;
    } else {
      select.innerHTML = avail.map((a, idx) => `<option value="${idx}">${esc(a.name)} (→ ${esc(a.to)})</option>`).join('');
    }
    updateDetail();
    updateHistory();
  };

  if (typeof select.addEventListener === 'function') {
    select.onchange = () => updateDetail();
  }
  updateSim();

  startBtn.onclick = async () => {
    if (!isCurrent()) return;
    current = findInitialState(states, actions);
    history = [];
    updateSim();
    if (current) {
      commitStatus('シミュレーション開始: ' + current, false, 'ok');
      await renderMermaid(current);
    } else {
      commitStatus('ステータスが無いためシミュレーションを開始できません', false, 'warn');
    }
  };
  execBtn.onclick = async () => {
    if (!isCurrent()) return;
    if (select.disabled) {
      // 何も起きないボタンにならないよう、押せない理由を示す
      commitStatus(current ? `「${current}」から実行できるアクションはありません（終端のステータスです）` : '先に「最初から開始」を押してください', false, 'warn');
      return;
    }
    const idx = Number(select.value);
    if (!Number.isFinite(idx)) return;
    // 同名アクションが複数ある場合でも、表示中の選択肢（from に一致する並び）から確実に選ぶ
    const action = getAvailableActions()[idx];
    if (!action) return;
    const prev = current || '';
    current = action.to;
    history.push({ from: prev, action: action.name, to: action.to });
    updateSim();
    commitStatus(`アクション「${action.name}」実行 → 「${action.to}」`, false, 'ok');
    await renderMermaid(action.to);
  };
  if (undoBtn) {
    undoBtn.onclick = async () => {
      if (!isCurrent() || !history.length) return;
      const last = history.pop()!;
      current = last.from;
      updateSim();
      commitStatus(`1手戻しました: 「${current}」`, false, 'ok');
      await renderMermaid(current);
    };
  }
}

/**
 * @param {{ appId: string, guestId?: string, preview?: boolean }} source
 * @param {(msg: string, err?: boolean, tone?: 'ok' | 'warn') => void} setStatus err を指定しない通知は処理中表示になるため、完了後の通知は tone を渡す
 * @param {{ textEl: HTMLTextAreaElement, viewEl: HTMLElement, summaryEl?: HTMLElement, simUi?: StandaloneProcessSimUi, isCurrent?: () => boolean }} targets
 */
export async function runRenderProcessFlowStandalone(source, setStatus, targets) {
  const isCurrent = typeof targets?.isCurrent === 'function' ? targets.isCurrent : () => true;
  const commitStatus = (message: string, error?: boolean, tone?: 'ok' | 'warn') => {
    if (isCurrent()) setStatus(message, error, tone);
  };
  if (!isCurrent()) return null;
  const connection = validateProcessConnection(source.appId, source.guestId, source.preview);
  commitStatus('プロセス管理を取得中...');

  const res = await fetchProcessStatusSettings(connection);
  if (!isCurrent()) return null;
  // 空・非オブジェクトの応答を「プロセス管理は無効」と取り違えず、TypeError でもなく原因が分かる形で止める
  if (!res || typeof res !== 'object') throw new Error('プロセス管理の設定を取得できませんでした（想定外の応答形式です）');

  if (!res.enable) {
    // Mermaid ソースではない文章を入れると「コピー」「.mmd で保存」がそのまま書き出してしまう
    targets.textEl.value = '';
    targets.viewEl.innerHTML = '<div style="color:#64748b">プロセス管理は無効です</div>';
    if (targets.summaryEl) targets.summaryEl.innerHTML = '';
    if (targets.simUi) targets.simUi.container.style.display = 'none';
    commitStatus('プロセス管理は無効です');
    return null;
  }

  const states = res.states && typeof res.states === 'object' && !Array.isArray(res.states) ? res.states : ({} as any);
  const rawActions = Array.isArray(res.actions) ? res.actions : [];
  const actions = rawActions.filter((a: any) => a && a.from != null && a.to != null
    && String(a.from).trim() && String(a.to).trim());
  const orphanActions = rawActions.length - actions.length;
  const summary = summarizeProcessStructure(states, actions, orphanActions);
  if (targets.summaryEl) {
    targets.summaryEl.innerHTML = renderProcessStructureSummaryHtml(summary);
  }
  let renderError = '';
  let renderFailure = '';
  let renderSeq = 0;

  const renderMermaid = async (highlightState) => {
    const seq = ++renderSeq;
    const isFresh = () => isCurrent() && seq === renderSeq;
    if (!isFresh()) return false;
    const md = buildProcessMermaidSource(states, actions, highlightState);
    // 共有・保存するソースにはシミュレーション中の現在状態の強調を含めない
    targets.textEl.value = highlightState ? buildProcessMermaidSource(states, actions, null) : md;
    // 読み込み失敗と描画失敗（構文エラー・サイズ超過など）を区別して、簡易表示にした理由をそのまま示す
    let phase = '読み込み';
    try {
      const mermaidObj = await ensureMermaid();
      if (!isFresh()) return false;
      phase = '描画';
      const { svg } = await mermaidObj.render(`mermaid-svg-generated-${Date.now()}-${seq}`, md);
      if (!isFresh()) return false;
      targets.viewEl.innerHTML = svg;
      return true;
    } catch (e) {
      if (!isFresh()) return false;
      renderFailure = `Mermaid.js の${phase}に失敗`;
      targets.viewEl.innerHTML = renderFallbackFlowHtml(states, actions, highlightState, `${renderFailure}したため、簡易表示に切り替えました。`);
      renderError = e instanceof Error ? e.message : String(e);
      commitStatus(`${renderFailure}したため、簡易表示に切り替えました。(${renderError})`, true);
      return false;
    }
  };

  commitStatus('フロー図 生成中...');
  await renderMermaid(null);
  if (!isCurrent()) return null;
  if (renderError) {
    commitStatus(`フロー図生成完了（簡易表示。${renderFailure}しました: ${renderError}）`, true);
  } else {
    commitStatus(orphanActions ? `フロー図 生成完了（from/to 未設定のアクション ${orphanActions}件は除外）` : 'フロー図 生成完了', false, orphanActions > 0 ? 'warn' : undefined);
  }

  if (targets.simUi) {
    bindStandaloneProcessSimulation(states, actions, targets.simUi, {
      isCurrent,
      commitStatus,
      renderMermaid
    });
  }

  return { states, actions, summary };
}
