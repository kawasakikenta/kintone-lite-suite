'use strict';

import { esc, sanitizeFilenamePart, buildExportFilename, downloadBlob } from '../utils.js';
import { buildApiPrefix, apiGet } from '../api.js';
import { loadJSZipLite } from '../jszipLoader.js';
import { isCancelRequested } from '../runControl.js';
import { createCancelReport, formatCancelledHeadline, isCancelStop } from './run-cancel-summary.js';
import { uniqueZipEntryName } from './record-query.js';

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
  // すべての読み込み先の失敗理由をログに残せるよう、最後の 1 件だけでなく全件をまとめる
  const failures: string[] = [];
  for (const url of urls) {
    try {
      await loadScript(url);
      return;
    } catch (e) {
      failures.push(e instanceof Error ? e.message : String(e));
    }
  }
  throw new Error(failures.join('\n') || 'Mermaid.js の読み込みに失敗しました');
}

/** 図の描画ライブラリを読み込めなかったときに利用者へ見せる文言（読み込み先の URL などは出さずログへ回す）。 */
export const MERMAID_LOAD_FAILURE_MESSAGE = '図の描画ライブラリ（Mermaid）を読み込めませんでした。ネットワークやブラウザの制限を確認してください。';

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
  copyHistoryBtn?: HTMLButtonElement | null;
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
  let history: Array<{ from: string; action: string; to: string; condition?: string }> = [];
  const { container, current: curEl, select, startBtn, execBtn, undoBtn, historyEl, detailEl, copyHistoryBtn } = simUi;
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
    if (copyHistoryBtn) {
      copyHistoryBtn.disabled = !current && history.length === 0;
      (copyHistoryBtn as any).__getSimHistoryText = () => formatProcessSimulationHistory(history, current, states);
    }
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
    history.push({ from: prev, action: action.name, to: action.to, condition: describeSimActionCondition(action) });
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
 * @param {{ textEl: HTMLTextAreaElement, viewEl: HTMLElement, summaryEl?: HTMLElement, simUi?: StandaloneProcessSimUi, isCurrent?: () => boolean, log?: (text: string) => void }} targets
 *   log は URL などの技術的な詳細を、状態表示ではなくログへ残すための任意の出力先
 */
export async function runRenderProcessFlowStandalone(source, setStatus, targets) {
  const isCurrent = typeof targets?.isCurrent === 'function' ? targets.isCurrent : () => true;
  const commitStatus = (message: string, error?: boolean, tone?: 'ok' | 'warn') => {
    if (isCurrent()) setStatus(message, error, tone);
  };
  if (!isCurrent()) return null;
  const offlineData = extractOfflineProcessStatusData(source);
  const connection = offlineData && (source?.appId == null || String(source.appId).trim() === '')
    ? {
        appId: String(source?.importedBundle?.appId || ''),
        guestId: String(source?.guestId || source?.importedBundle?.guestId || ''),
        preview: !!source?.preview
      }
    : validateProcessConnection(source?.appId ?? source?.importedBundle?.appId, source?.guestId ?? source?.importedBundle?.guestId, source?.preview);
  commitStatus('プロセス管理を取得中...');

  const res = offlineData !== undefined ? offlineData : await fetchProcessStatusSettings(connection);
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

  const { states, actions, orphanActionCount: orphanActions, summary } = normalizeProcessStatus(res);
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
      const detail = e instanceof Error ? e.message : String(e);
      if (phase === '読み込み') {
        // 読み込み先 URL を含む詳細はログだけに残し、状態表示は対処の分かる文言にする
        renderError = MERMAID_LOAD_FAILURE_MESSAGE;
        if (typeof targets.log === 'function') targets.log(`図の描画ライブラリ（Mermaid）の読み込みに失敗しました\n${detail}`);
        commitStatus(`${MERMAID_LOAD_FAILURE_MESSAGE}簡易表示に切り替えました。`, true);
      } else {
        renderError = detail;
        commitStatus(`${renderFailure}したため、簡易表示に切り替えました。(${renderError})`, true);
      }
      return false;
    }
  };

  commitStatus('フロー図 生成中...');
  await renderMermaid(null);
  if (!isCurrent()) return null;
  if (renderError) {
    commitStatus(renderFailure.endsWith('読み込みに失敗')
      ? `フロー図は簡易表示です。${renderError}`
      : `フロー図生成完了（簡易表示。${renderFailure}しました: ${renderError}）`, true);
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

  return { states, actions, orphanActionCount: orphanActions, summary };
}

// ---------------------------------------------------------------------------
// 複数アプリのプロセス図をまとめて出力（読み取り専用 / ZIP）
// ---------------------------------------------------------------------------

export interface ProcessBatchTarget {
  appId: string;
  guestId: string;
  /** 対象表に候補から入った名前。無いときは /app.json で補う（取得できなければ空）。 */
  appName?: string;
}

export type ProcessBatchOutcome = 'enabled' | 'disabled' | 'failed' | 'not-run';

export interface ProcessBatchRow {
  appId: string;
  guestId: string;
  appName: string;
  outcome: ProcessBatchOutcome;
  stateCount: number;
  actionCount: number;
  /** 構造上の注意（summarizeProcessStructure の warnings） */
  warnings: string[];
  /** 取得失敗の理由（outcome が failed のとき）。アプリ名を取得できなかった旨もここに添える */
  reason: string;
  /** ZIP 内の図ファイル（outcome が enabled のとき） */
  file: string;
  /** 状態一覧・アクション遷移一覧の表出力用（任意） */
  states?: any;
  actions?: any[];
}

export interface ProcessBatchResult {
  rows: ProcessBatchRow[];
  counts: { enabled: number; disabled: number; failed: number; notRun: number };
  /** 中止で止めたとき、最初に未実行になった位置（最後まで実行したら -1） */
  stoppedAt: number;
  zipName: string;
  zipEntries: string[];
}

export const PROCESS_BATCH_DIAGRAM_DIR = 'diagrams';
export const PROCESS_BATCH_OVERVIEW_FILE = 'overview.md';
export const PROCESS_BATCH_MANIFEST_FILE = 'manifest.json';

/** 大文字小文字だけが異なる名前も重複として扱う（Windows / macOS で展開時に上書きされるため）。 */
class CaseInsensitiveNameSet extends Set<string> {
  has(value: string) { return super.has(value.toLowerCase()); }
  add(value: string) { return super.add(value.toLowerCase()); }
}

/** 図ファイル名の重複判定に使う集合（大文字小文字を区別しない）。 */
export function createProcessBatchNameSet(): Set<string> {
  return new CaseInsensitiveNameSet();
}

const PROCESS_BATCH_NAME_MAX = 60;
const WINDOWS_RESERVED_NAME = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\..*)?$/i;

/** ファイル名に使うアプリ名。禁則文字・制御文字・表示偽装用の文字を除き、長い名前は切り詰める。 */
function safeFileNamePart(name: unknown): string {
  const cleaned = Array.from(sanitizeFilenamePart(name, '')
    .replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2066-\u2069\ufeff]/g, '')
    .trim())
    .slice(0, PROCESS_BATCH_NAME_MAX)
    .join('')
    .replace(/[. ]+$/, '');
  return WINDOWS_RESERVED_NAME.test(cleaned) ? `_${cleaned}` : cleaned;
}

/**
 * ZIP 内の図ファイル名。アプリIDを必ず含め（別のゲストスペースの同じIDと区別するため
 * ゲストスペースIDも前に付ける）、大文字小文字だけが違う名前も別名にする。
 */
export function buildProcessBatchDiagramFileName(target: { appId: string; guestId?: string; appName?: string }, used: Set<string>): string {
  const guest = String(target.guestId || '').trim();
  const name = safeFileNamePart(target.appName);
  const base = `${guest ? `guest${guest}_` : ''}${String(target.appId).trim()}${name ? `_${name}` : ''}.mmd`;
  return `${PROCESS_BATCH_DIAGRAM_DIR}/${uniqueZipEntryName(used, base)}`;
}

/** 入力行を検証する。問題が無ければ空文字、あれば最初の問題を行番号つきで返す（確認画面の事前検証用）。 */
export function validateProcessBatchTargets(targets: Array<{ appId: unknown; guestId?: unknown }>): string {
  if (!targets.length) return 'まとめて出力する対象アプリを1件以上指定してください。';
  for (let i = 0; i < targets.length; i++) {
    try {
      validateProcessConnection(targets[i].appId, targets[i].guestId ?? '');
    } catch (error: any) {
      return `${i + 1}行目: ${error?.message || String(error)}`;
    }
  }
  return '';
}

/** 同じアプリID・ゲストスペースIDの重複を除き、IDを正規化する。 */
export function normalizeProcessBatchTargets(targets: ProcessBatchTarget[]): ProcessBatchTarget[] {
  const seen = new Set<string>();
  const out: ProcessBatchTarget[] = [];
  for (const target of targets) {
    const c = validateProcessConnection(target.appId, target.guestId);
    const key = `${c.guestId}::${c.appId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ appId: c.appId, guestId: c.guestId, appName: String(target.appName || '').trim() });
  }
  return out;
}

/** kintone が返す status.json から、描画・集計に使う形を取り出す（単体の描画と共通）。 */
export function normalizeProcessStatus(res: any): { states: any; actions: any[]; orphanActionCount: number; summary: ProcessStructureSummary } {
  const states = res?.states && typeof res.states === 'object' && !Array.isArray(res.states) ? res.states : ({} as any);
  const rawActions = Array.isArray(res?.actions) ? res.actions : [];
  const actions = rawActions.filter((a: any) => a && a.from != null && a.to != null
    && String(a.from).trim() && String(a.to).trim());
  const orphanActionCount = rawActions.length - actions.length;
  return { states, actions, orphanActionCount, summary: summarizeProcessStructure(states, actions, orphanActionCount) };
}

function oneLine(value: unknown): string {
  return String(value ?? '').replace(/[\r\n\u2028\u2029]+/g, ' ').trim();
}

function processBatchLabel(row: { appId: string; guestId?: string; appName?: string }): string {
  return `アプリ ${row.appId}${row.appName ? ` ${oneLine(row.appName)}` : ''}${row.guestId ? ` (guest:${row.guestId})` : ''}`;
}

const OUTCOME_LABEL: Record<ProcessBatchOutcome, string> = {
  enabled: '有効',
  disabled: '無効',
  failed: '取得失敗',
  'not-run': '未実行（中止）'
};

/** .mmd の先頭に付けるコメント。単体の「.mmd で保存」と同じ書式にそろえる。 */
export function buildProcessBatchMmd(row: { appId: string; guestId?: string; appName?: string }, source: string, preview: boolean, generatedAt: Date = new Date()): string {
  const header = [
    `%% kintone プロセス図 / アプリ ${row.appId}${row.appName ? ` ${oneLine(row.appName)}` : ''}${row.guestId ? ` / ゲストスペース ${row.guestId}` : ''} / ${preview ? 'プレビュー' : '本番'} / 生成 ${generatedAt.toLocaleString('ja-JP', { hour12: false })}`,
    '%% Mermaid Live Editor（https://mermaid.live）や Markdown の ```mermaid ブロックに貼り付けると図として表示できます。'
  ].join('\n');
  return `${header}\n${source.replace(/\r\n/g, '\n').replace(/\n+$/, '')}\n`;
}

/** Markdown の表のセルに入れる文字列。区切り・改行・HTML として解釈される文字を無害にする。 */
function mdCell(value: unknown): string {
  return oneLine(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\|/g, '\\|');
}

/** ソースの中に含まれる連続したバッククォートより長い囲みを選ぶ（図のソースが囲みを閉じてしまわないように）。 */
function mdFence(text: string): string {
  const longest = Math.max(2, ...(text.match(/`+/g) || []).map((m) => m.length));
  return '`'.repeat(longest + 1);
}

export interface ProcessBatchMeta {
  generatedAt: string;
  preview: boolean;
  /** 中止で止めたとき true */
  cancelled: boolean;
  total: number;
}

export function countProcessBatchRows(rows: ProcessBatchRow[]) {
  return {
    enabled: rows.filter((r) => r.outcome === 'enabled').length,
    disabled: rows.filter((r) => r.outcome === 'disabled').length,
    failed: rows.filter((r) => r.outcome === 'failed').length,
    notRun: rows.filter((r) => r.outcome === 'not-run').length
  };
}

/**
 * 一覧（表）と、有効なアプリごとの Mermaid ブロックを 1 つにまとめた Markdown。
 * sources は図ファイル（ZIP 内パス）→ Mermaid ソース。
 */
export function buildProcessBatchOverviewMarkdown(rows: ProcessBatchRow[], sources: Record<string, string>, meta: ProcessBatchMeta): string {
  const counts = countProcessBatchRows(rows);
  const lines: string[] = [
    '# プロセス図 一括出力',
    '',
    `- 生成日時: ${meta.generatedAt}`,
    `- 参照環境: ${meta.preview ? 'プレビュー' : '本番'}`,
    `- 対象アプリ: ${meta.total}件（プロセス管理あり ${counts.enabled} / 無効 ${counts.disabled} / 取得失敗 ${counts.failed} / 未実行（中止） ${counts.notRun}）`
  ];
  if (meta.cancelled) lines.push('- 注意: 利用者の操作で中止したため、未実行のアプリは含まれていません。');
  if (counts.failed) lines.push('- 注意: 取得に失敗したアプリがあります。下の表の「失敗理由」を確認して、再実行してください。');
  lines.push('', '## 一覧', '',
    '| アプリID | アプリ名 | ゲストスペース | プロセス管理 | 状態 | アクション | 構造上の注意 | 失敗理由 | 図ファイル |',
    '| --- | --- | --- | --- | ---: | ---: | --- | --- | --- |');
  for (const row of rows) {
    const enabled = row.outcome === 'enabled';
    lines.push(`| ${mdCell(row.appId)} | ${mdCell(row.appName)} | ${mdCell(row.guestId)} | ${OUTCOME_LABEL[row.outcome]} | ${enabled ? row.stateCount : ''} | ${enabled ? row.actionCount : ''} | ${mdCell(row.warnings.join(' / '))} | ${mdCell(row.reason)} | ${enabled ? mdCell(row.file) : ''} |`);
  }
  const drawn = rows.filter((r) => r.outcome === 'enabled' && sources[r.file] != null);
  lines.push('', '## 図', '');
  if (!drawn.length) lines.push('プロセス管理が有効なアプリはありませんでした。', '');
  for (const row of drawn) {
    const source = sources[row.file].replace(/\r\n/g, '\n').replace(/\n+$/, '');
    const fence = mdFence(source);
    lines.push(`### ${mdCell(`アプリ ${row.appId}${row.appName ? ` ${row.appName}` : ''}${row.guestId ? `（ゲストスペース ${row.guestId}）` : ''}`)}`, '',
      `状態 ${row.stateCount} / アクション ${row.actionCount} · ファイル: ${mdCell(row.file)}`, '');
    if (row.warnings.length) lines.push(`注意: ${mdCell(row.warnings.join(' / '))}`, '');
    lines.push(`${fence}mermaid`, source, fence, '');
    appendBatchRowDetailTables(lines, row);
  }
  return `${lines.join('\n').replace(/\n+$/, '')}\n`;
}

/** manifest.json の中身（設定一括取得・JS/CSS一括DL の manifest と同じく generatedAt / 件数 / apps / 中止時の notExecuted を持つ）。 */
export function buildProcessBatchManifest(rows: ProcessBatchRow[], meta: ProcessBatchMeta & { guestIds: string[] }) {
  const counts = countProcessBatchRows(rows);
  const notRun = rows.filter((r) => r.outcome === 'not-run');
  return {
    tool: 'process-diagram-batch',
    generatedAt: meta.generatedAt,
    environment: meta.preview ? 'preview' : 'production',
    preview: meta.preview,
    guestIds: meta.guestIds,
    targetCount: meta.total,
    appCount: rows.length - notRun.length,
    enabledAppCount: counts.enabled,
    disabledAppCount: counts.disabled,
    failedAppCount: counts.failed,
    overview: PROCESS_BATCH_OVERVIEW_FILE,
    ...(notRun.length ? { cancelled: true, notExecuted: notRun.map((r) => ({ appId: r.appId, guestId: r.guestId, appName: r.appName })) } : {}),
    apps: rows.filter((r) => r.outcome !== 'not-run').map((r) => ({
      appId: r.appId,
      appName: r.appName,
      guestId: r.guestId,
      processManagement: r.outcome === 'failed' ? 'unknown' : r.outcome === 'enabled' ? 'enabled' : 'disabled',
      status: r.outcome === 'failed' ? 'failed' : 'ok',
      ...(r.outcome === 'enabled' ? { file: r.file, stateCount: r.stateCount, actionCount: r.actionCount, warnings: r.warnings } : {}),
      ...(r.reason ? { error: r.reason } : {})
    }))
  };
}

/** パネルのログに出す、アプリごとの結果（取得失敗・無効・未実行を隠さない）。 */
export function formatProcessBatchResultLines(rows: ProcessBatchRow[]): string[] {
  return rows.map((row) => {
    const head = `${OUTCOME_LABEL[row.outcome]}\t${processBatchLabel(row)}`;
    if (row.outcome === 'enabled') {
      return `${head}\t状態 ${row.stateCount} / アクション ${row.actionCount}${row.warnings.length ? `\t注意: ${row.warnings.join(' / ')}` : ''}\t${row.file}${row.reason ? `\t${row.reason}` : ''}`;
    }
    if (row.outcome === 'disabled') return `${head}\tプロセス管理は無効です${row.reason ? `\t${row.reason}` : ''}`;
    if (row.outcome === 'failed') return `${head}\t${row.reason}`;
    return `${head}\t中止したため取得していません`;
  });
}

function firstLine(error: unknown): string {
  const text = error instanceof Error ? error.message : String(error ?? '不明なエラー');
  return oneLine(text.split('\n')[0]) || '不明なエラー';
}

/**
 * 複数アプリのプロセス管理を取得し、アプリごとの .mmd と一覧（overview.md）・manifest.json を 1 つの ZIP にして保存する。
 * kintone には何も書き込まない。
 * - プロセス管理が無効なアプリは失敗ではなく「無効」として一覧に残す。取得に失敗したアプリは理由つきで記録して続行する。
 * - 中止したら、取得済みの分だけを ZIP に保存し、残りは「未実行（中止）」にする（設定一括取得・JS/CSS一括DL と同じ）。
 *   保存できる結果が 1 件も無いときは何も保存しない。
 * - アプリ名は対象表の名前を使い、無いものは /app.json（本番）で補う。取得できなくても処理は続け、一覧にその旨を残す。
 */
export async function runProcessBatchZipStandalone(
  opts: { apps: ProcessBatchTarget[]; preview?: boolean },
  setStatus: (msg: string, isError?: boolean) => void
): Promise<ProcessBatchResult> {
  const targets = normalizeProcessBatchTargets(Array.isArray(opts?.apps) ? opts.apps : []);
  if (!targets.length) throw new Error('まとめて出力する対象アプリを1件以上指定してください');
  const preview = !!opts.preview;

  // 時間のかかる取得を始める前に JSZip を読み込み、読み込めない環境（CSP・ネットワーク制限）では取得結果を無駄にしない。
  const JSZipCtor = await loadJSZipLite();

  const total = targets.length;
  const rows: ProcessBatchRow[] = [];
  const sources: Record<string, string> = {};
  const mmdFiles: Array<{ file: string; text: string }> = [];
  const used = createProcessBatchNameSet();
  const generatedAtDate = new Date();
  let failedSoFar = 0;
  /** 中止で止めたアプリの位置。-1 は最後まで実行した。 */
  let stoppedAt = -1;

  for (let i = 0; i < total; i++) {
    const target = targets[i];
    if (isCancelRequested()) { stoppedAt = i; break; }
    const guestNote = target.guestId ? ` (guest:${target.guestId})` : '';
    setStatus(`[${i + 1}/${total}] アプリ ${target.appId}${guestNote} のプロセス管理を取得中...${failedSoFar ? `（取得失敗 ${failedSoFar}件）` : ''}`);
    let appName = String(target.appName || '').trim();
    let nameNote = '';
    const row: ProcessBatchRow = {
      appId: target.appId, guestId: target.guestId, appName, outcome: 'failed',
      stateCount: 0, actionCount: 0, warnings: [], reason: '', file: ''
    };
    try {
      if (!appName) {
        try {
          const info = await apiGet(buildApiPrefix(target.guestId, false), '/app.json', { id: target.appId }, { retries: 1 });
          appName = oneLine(info?.name);
        } catch (error) {
          if (isCancelStop(error)) throw error;
          nameNote = `アプリ名を取得できませんでした（${firstLine(error)}）`;
        }
        row.appName = appName;
      }
      const res = await fetchProcessStatusSettings({ appId: target.appId, guestId: target.guestId, preview });
      // 空・非オブジェクトの応答を「プロセス管理は無効」と取り違えない
      if (!res || typeof res !== 'object') throw new Error('プロセス管理の設定を取得できませんでした（想定外の応答形式です）');
      if (!res.enable) {
        row.outcome = 'disabled';
      } else {
        const { states, actions, summary } = normalizeProcessStatus(res);
        const source = buildProcessMermaidSource(states, actions, null);
        row.outcome = 'enabled';
        row.stateCount = summary.stateCount;
        row.actionCount = summary.actionCount;
        row.warnings = summary.warnings;
        row.states = states;
        row.actions = actions;
        row.file = buildProcessBatchDiagramFileName(row, used);
        sources[row.file] = source;
        mmdFiles.push({ file: row.file, text: buildProcessBatchMmd(row, source, preview, generatedAtDate) });
      }
      row.reason = nameNote;
    } catch (error) {
      // 中止を「このアプリの取得失敗」にして残りのアプリを取り続けない。途中で止めたアプリは未実行として扱う。
      if (isCancelStop(error)) { stoppedAt = i; break; }
      row.outcome = 'failed';
      row.reason = [firstLine(error), nameNote].filter(Boolean).join(' / ');
      failedSoFar += 1;
    }
    rows.push(row);
  }

  const notRunTargets = stoppedAt >= 0 ? targets.slice(stoppedAt) : [];
  const processedRows = [...rows];
  for (const t of notRunTargets) {
    rows.push({ appId: t.appId, guestId: t.guestId, appName: String(t.appName || ''), outcome: 'not-run', stateCount: 0, actionCount: 0, warnings: [], reason: '', file: '' });
  }
  const counts = countProcessBatchRows(rows);
  const failureLines = rows.filter((r) => r.outcome === 'failed').map((r) => `${processBatchLabel(r)}: 取得失敗: ${r.reason}`);
  const notRunLine = notRunTargets.length ? `未実行（中止）: ${notRunTargets.map((t) => processBatchLabel(t)).join(', ')}` : '';

  // 保存できる結果（有効 / 無効）が 1 件も無いときは ZIP を作らない。理由はログへ出す。
  if (!counts.enabled && !counts.disabled) {
    if (stoppedAt >= 0) {
      throw createCancelReport(stoppedAt, total, [...failureLines, notRunLine, 'ZIP は保存していません']);
    }
    throw new Error([`ZIP を作成できませんでした。プロセス管理を取得できたアプリがありません（取得失敗 ${counts.failed}件）`, ...failureLines].join('\n'));
  }

  setStatus('ZIPファイル作成中...');
  const meta: ProcessBatchMeta = { generatedAt: generatedAtDate.toISOString(), preview, cancelled: stoppedAt >= 0, total };
  const guestIds = [...new Set(targets.map((t) => t.guestId).filter(Boolean))];
  const zip = new JSZipCtor();
  zip.file(PROCESS_BATCH_MANIFEST_FILE, JSON.stringify(buildProcessBatchManifest(rows, { ...meta, guestIds }), null, 2));
  zip.file(PROCESS_BATCH_OVERVIEW_FILE, buildProcessBatchOverviewMarkdown(rows, sources, meta));
  for (const { file, text } of mmdFiles) zip.file(file, text);
  const zipBlob = await zip.generateAsync({ type: 'blob' });
  const zipName = buildExportFilename('プロセス図一括', 'zip', {
    appLabel: `${processedRows.length}アプリ`,
    suffix: preview ? 'プレビュー' : ''
  });
  downloadBlob(zipName, zipBlob);

  const detail = `プロセス管理あり ${counts.enabled}件 / 無効 ${counts.disabled}件${counts.failed ? ` / 取得失敗 ${counts.failed}件` : ''}`;
  const failureHint = counts.failed ? `。取得失敗は ${PROCESS_BATCH_OVERVIEW_FILE} と下のログで確認してください` : '';
  if (stoppedAt >= 0) {
    setStatus(`${formatCancelledHeadline(stoppedAt, total)}。取得済みの ${processedRows.length}アプリだけを保存しました（${detail} / 未実行（中止） ${counts.notRun}件）${failureHint}`, true);
  } else {
    setStatus(`プロセス図 ${counts.enabled}件を含むZIPを保存しました（${total}アプリ: ${detail}）${failureHint}`, counts.failed > 0);
  }
  return { rows, counts, stoppedAt, zipName, zipEntries: [PROCESS_BATCH_MANIFEST_FILE, PROCESS_BATCH_OVERVIEW_FILE, ...mmdFiles.map((f) => f.file)] };
}

// ---------------------------------------------------------------------------
// 単一アプリの「プロセス管理仕様書 (Markdown)」出力・シミュレーション履歴フォーマット・オフライン設定JSON対応
// ---------------------------------------------------------------------------

/**
 * source.statusData または source.importedBundle (SettingsBundle 形式) から
 * REST API を呼ばずにプロセス管理設定オブジェクトを取り出す。
 */
export function extractOfflineProcessStatusData(source: any): any {
  if (!source || typeof source !== 'object') return undefined;
  if (source.statusData && typeof source.statusData === 'object') {
    return source.statusData;
  }
  const bundle = source.importedBundle;
  if (bundle && typeof bundle === 'object') {
    const sections = bundle.sections && typeof bundle.sections === 'object' ? bundle.sections : bundle;
    const candidate =
      sections.processManagement ??
      sections.processSettings ??
      sections.status ??
      bundle.processManagement ??
      bundle.processSettings ??
      bundle.status;
    if (candidate && typeof candidate === 'object') {
      return candidate;
    }
  }
  return undefined;
}

function sortStateEntries(states: any): Array<{ name: string; index: number | string; def: any }> {
  const stateObj = states && typeof states === 'object' && !Array.isArray(states) ? states : {};
  const names = Object.keys(stateObj);
  return names
    .map((name, fallbackIdx) => {
      const def = stateObj[name] || {};
      const rawIdx = def.index;
      const numIdx = rawIdx == null || String(rawIdx).trim() === '' ? NaN : Number(rawIdx);
      return {
        name,
        index: Number.isFinite(numIdx) ? numIdx : fallbackIdx,
        sortKey: Number.isFinite(numIdx) ? numIdx : Number.MAX_SAFE_INTEGER,
        fallbackIdx,
        def
      };
    })
    .sort((a, b) => (a.sortKey !== b.sortKey ? a.sortKey - b.sortKey : a.fallbackIdx - b.fallbackIdx))
    .map(({ name, index, def }) => ({ name, index, def }));
}

function formatAssigneeTypeLabel(stateDef: any): string {
  const assignee = stateDef?.assignee;
  if (!assignee || typeof assignee !== 'object') return '未設定';
  const entities = Array.isArray(assignee.entities) ? assignee.entities : [];
  const t = String(assignee.type || '').toUpperCase();
  if (!entities.length && !t) return '未設定';
  if (t === 'ALL') return '全員 (ALL)';
  if (t === 'ANY') return '誰でも (ANY)';
  if (t === 'ONE') return '1人 (ONE)';
  return t || '未設定';
}

function formatInitialAssigneesList(stateDef: any): string {
  const assignee = stateDef?.assignee;
  if (!assignee || typeof assignee !== 'object') return 'なし';
  const entities = Array.isArray(assignee.entities) ? assignee.entities : [];
  if (!entities.length) return 'なし';
  const labels = entities.map((item: any) => {
    const ent = item?.entity || item;
    const code = String(ent?.code || '').trim();
    const type = String(ent?.type || '').trim().toUpperCase();
    const sub = item?.includeSubs ? '（下位組織含む）' : '';
    if (type === 'CREATOR') return '作成者 (CREATOR)';
    if (type === 'FIELD_ENTITY' && code) return `フィールド (${code})${sub}`;
    if (type === 'USER' && code) return `ユーザー (${code})`;
    if (type === 'ORGANIZATION' && code) return `組織 (${code})${sub}`;
    if (type === 'GROUP' && code) return `グループ (${code})`;
    if (type === 'CUSTOM_FIELD' && code) return `カスタム (${code})`;
    if (code && type) return `${code} (${type})${sub}`;
    return `${code || type || '未設定'}${sub}`;
  });
  return labels.join(', ');
}

function formatActionTypeLabel(action: any): string {
  const t = String(action?.type || 'PRIMARY').trim().toUpperCase();
  if (t === 'SECONDARY') return '作業者以外も実行可 (SECONDARY)';
  return '通常 (PRIMARY)';
}

function appendBatchRowDetailTables(lines: string[], row: ProcessBatchRow): void {
  const hasStates = row.states && typeof row.states === 'object' && Object.keys(row.states).length > 0;
  const hasActions = Array.isArray(row.actions) && row.actions.length > 0;
  if (!hasStates && !hasActions) return;
  const sortedStates = sortStateEntries(row.states);
  const validActions = (Array.isArray(row.actions) ? row.actions : []).filter(
    (a) => a && a.from != null && a.to != null && String(a.from).trim() && String(a.to).trim()
  );
  lines.push(
    '<details>',
    `<summary>状態・アクション定義一覧（状態 ${sortedStates.length}件 / アクション ${validActions.length}件）</summary>`,
    '',
    '#### 状態一覧',
    '',
    '| 表示順 | 状態名 | 作業者種別 | 初期作業者一覧 |',
    '| ---: | --- | --- | --- |'
  );
  for (const s of sortedStates) {
    lines.push(
      `| ${mdCell(s.index)} | ${mdCell(s.name)} | ${mdCell(formatAssigneeTypeLabel(s.def))} | ${mdCell(formatInitialAssigneesList(s.def))} |`
    );
  }
  lines.push(
    '',
    '#### アクション遷移一覧',
    '',
    '| アクション名 | 種別 | 遷移元 | 遷移先 | 実行条件式 |',
    '| --- | --- | --- | --- | --- |'
  );
  if (!validActions.length) {
    lines.push('| - | - | - | - | 遷移なし |');
  } else {
    for (const a of validActions) {
      const cond = String(a.filterCond || '').trim();
      lines.push(
        `| ${mdCell(a.name || '')} | ${mdCell(formatActionTypeLabel(a))} | ${mdCell(a.from)} | ${mdCell(a.to)} | ${mdCell(cond || 'なし')} |`
      );
    }
  }
  lines.push('', '</details>', '');
}

/**
 * 単一アプリの「プロセス管理仕様書 (Markdown)」を生成する純粋関数。
 * アプリ情報、構造診断サマリ、ステータス定義一覧表、アクション遷移定義一覧表、Mermaid フローチャートを出力する。
 */
export function buildProcessSpecMarkdown(input: {
  appId: string;
  guestId?: string;
  appName?: string;
  preview?: boolean;
  generatedAt?: string;
  states: any;
  actions: any[];
  orphanActionCount?: number;
  summary?: ProcessStructureSummary;
}): string {
  const appId = String(input?.appId ?? '').trim();
  const guestId = String(input?.guestId ?? '').trim();
  const appName = oneLine(input?.appName ?? '');
  const preview = !!input?.preview;
  const generatedAt = String(input?.generatedAt || new Date().toISOString());
  const stateObj = input?.states && typeof input.states === 'object' && !Array.isArray(input.states) ? input.states : {};
  const rawActions = Array.isArray(input?.actions) ? input.actions : [];
  const validActions = rawActions.filter(
    (a) => a && a.from != null && a.to != null && String(a.from).trim() && String(a.to).trim()
  );
  const orphanCount =
    typeof input?.orphanActionCount === 'number'
      ? input.orphanActionCount
      : rawActions.length - validActions.length;
  const summary = input?.summary || summarizeProcessStructure(stateObj, validActions, orphanCount);
  const sortedStates = sortStateEntries(stateObj);
  const mermaidSource = buildProcessMermaidSource(stateObj, validActions, null).replace(/\r\n/g, '\n').replace(/\n+$/, '');
  const fence = mdFence(mermaidSource);

  const lines: string[] = [
    `# プロセス管理仕様書${appName ? ` - ${appName}` : appId ? ` - アプリ ${appId}` : ''}`,
    '',
    '## アプリ情報',
    '',
    `- アプリID: ${appId || '-'}`,
    ...(appName ? [`- アプリ名: ${appName}`] : []),
    `- ゲストスペースID: ${guestId || 'なし'}`,
    `- 参照環境: ${preview ? 'プレビュー' : '本番'}`,
    `- 生成日時: ${generatedAt}`,
    '',
    '## 構造診断サマリ',
    '',
    `- 状態数: ${summary.stateCount}`,
    `- アクション数: ${summary.actionCount}`,
    `- 始点ステータス: ${summary.startStates.length ? summary.startStates.join(', ') : 'なし'}`,
    `- 終端ステータス: ${summary.endStates.length ? summary.endStates.join(', ') : 'なし'}`,
    `- 分岐ステータス: ${summary.branchingStates.length ? summary.branchingStates.join(', ') : 'なし'}`,
    `- 構造上の注意・警告: ${summary.warnings.length ? summary.warnings.join(' / ') : 'なし'}`,
    '',
    '## ステータス定義一覧',
    '',
    '| 表示順 | 状態名 | 作業者種別 | 初期作業者一覧 |',
    '| ---: | --- | --- | --- |'
  ];

  if (!sortedStates.length) {
    lines.push('| - | （状態なし） | - | - |');
  } else {
    for (const s of sortedStates) {
      lines.push(
        `| ${mdCell(s.index)} | ${mdCell(s.name)} | ${mdCell(formatAssigneeTypeLabel(s.def))} | ${mdCell(formatInitialAssigneesList(s.def))} |`
      );
    }
  }

  lines.push(
    '',
    '## アクション遷移定義一覧',
    '',
    '| アクション名 | 種別 | 遷移元 | 遷移先 | 実行条件式 (filterCond) |',
    '| --- | --- | --- | --- | --- |'
  );

  if (!validActions.length) {
    lines.push('| （アクションなし） | - | - | - | - |');
  } else {
    for (const a of validActions) {
      const cond = String(a.filterCond || '').trim();
      lines.push(
        `| ${mdCell(a.name || '')} | ${mdCell(formatActionTypeLabel(a))} | ${mdCell(a.from)} | ${mdCell(a.to)} | ${mdCell(cond || 'なし')} |`
      );
    }
  }

  lines.push(
    '',
    '## プロセスフロー図',
    '',
    `${fence}mermaid`,
    mermaidSource,
    fence,
    ''
  );

  return `${lines.join('\n').replace(/\n+$/, '')}\n`;
}

/**
 * シミュレーションで実行した遷移履歴を、テストエビデンス・レビュー記録として貼り付けやすい
 * Markdown 形式でフォーマットする純粋関数。
 */
export function formatProcessSimulationHistory(
  history: Array<{ from: string; action: string; to: string; condition?: string }>,
  currentState: string | null,
  states?: any
): string {
  const safeHistory = Array.isArray(history) ? history : [];
  const stateObj = states && typeof states === 'object' && !Array.isArray(states) ? states : {};
  const currentAssignee = currentState && stateObj[currentState] ? `（${describeStateAssignee(stateObj[currentState])}）` : '';
  const startState = safeHistory.length > 0 ? safeHistory[0].from : (currentState || '未開始');

  const lines: string[] = [
    '## プロセス遷移シミュレーション履歴',
    '',
    `- 開始ステータス: ${startState}`,
    `- 現在ステータス: ${currentState || '未開始'}${currentAssignee}`,
    `- 実行ステップ数: ${safeHistory.length}手`
  ];

  if (!safeHistory.length) {
    lines.push(`- 遷移経路: ${currentState ? `${currentState}（遷移履歴なし）` : 'まだ開始していません'}`);
    return `${lines.join('\n')}\n`;
  }

  const chain = [safeHistory[0].from, ...safeHistory.map((h) => `[${h.action}] → ${h.to}`)].join(' ');
  lines.push(
    `- 遷移経路: ${chain}`,
    '',
    '| 手順 | 遷移元 | 実行アクション | 遷移先 | 備考（作業者設定・実行条件） |',
    '| ---: | --- | --- | --- | --- |'
  );

  safeHistory.forEach((step, idx) => {
    const notes: string[] = [];
    if (stateObj[step.to]) {
      notes.push(describeStateAssignee(stateObj[step.to]));
    }
    if (step.condition) {
      notes.push(step.condition);
    }
    lines.push(
      `| ${idx + 1} | ${mdCell(step.from)} | ${mdCell(step.action)} | ${mdCell(step.to)} | ${mdCell(notes.join(' / ') || '-')} |`
    );
  });

  return `${lines.join('\n')}\n`;
}
