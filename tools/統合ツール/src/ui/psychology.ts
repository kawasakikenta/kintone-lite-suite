'use strict';

/**
 * 心理学ベースの UI 強化モジュール。
 *
 * 設計方針:
 * - 永続化は一切行わない（localStorage / sessionStorage / IndexedDB / Cookie いずれも未使用）。
 *   利用情報は本モジュールのモジュールスコープ変数にのみ保持し、ページを閉じれば消える。
 * - kintone のセッションストレージは情報資産扱いとなる場合があるため、
 *   入力履歴・操作カウンタ等は揮発メモリのみに留める。
 *
 * 提供機能:
 *  1. 認知負荷の軽減: タブグループ別の視覚化（CSS 側で実装）
 *  2. 損失回避: 破壊的アクションの type-to-confirm 強化ガード
 *  3. リスク認知のフレーミング: 環境バッジ・方向ラベル
 *  4. 進捗フィードバックと Peak-End 効果: 進捗オーバーレイ + 完了サマリ
 *  5. リコール → リコグニション: アプリID 直近候補の datalist サジェスト（揮発メモリ）
 *  6. 選択疲れの軽減: 推奨デフォルトに ★ バッジ（CSS で適用）
 *  7. 自己効力感: 段階的オンボーディング（既存ツアーコース活用）
 *  8. 自責緩和: エラーメッセージのヒューマナイズ
 *  9. タイポグラフィ: コントラスト & 太字ガード（CSS で適用）
 * 10. メタ認知: セッションサマリのレンダリング
 */

import { esc } from '../utils.js';
import { getRoot, getToolDocument } from './dialog.js';

/* =====================================================================
 * 5. 揮発メモリ上のアプリID 直近履歴（リコグニション）
 * =====================================================================
 * セキュリティ要件:
 *  - kintone 上で扱う数値 ID であっても、永続化はしない。
 *  - モジュール変数のみ。タブ/ウィンドウを閉じれば消える。
 */
type AppIdKind = 'source' | 'target';
const recentAppIdsByKind: Record<AppIdKind, string[]> = {
  source: [],
  target: []
};
const RECENT_LIMIT = 8;

export function rememberAppId(kind: AppIdKind, value: string): void {
  const v = String(value || '').trim();
  if (!v || !/^\d+$/.test(v)) return;
  const list = recentAppIdsByKind[kind];
  const idx = list.indexOf(v);
  if (idx >= 0) list.splice(idx, 1);
  list.unshift(v);
  while (list.length > RECENT_LIMIT) list.pop();
  syncDatalist(kind);
}

export function getRecentAppIds(kind: AppIdKind): readonly string[] {
  return recentAppIdsByKind[kind].slice();
}

function syncDatalist(kind: AppIdKind): void {
  const doc = getToolDocument();
  const id = kind === 'source' ? 'u_sourceAppRecents' : 'u_targetAppRecents';
  const list = doc?.getElementById(id);
  if (!list) return;
  list.innerHTML = recentAppIdsByKind[kind]
    .map((v) => `<option value="${esc(v)}"></option>`)
    .join('');
}

/**
 * 接続入力欄に datalist サジェストを取り付け、入力確定時に揮発履歴へ追加する。
 */
export function installAppIdRecents(input: HTMLInputElement | null, kind: AppIdKind): void {
  if (!input) return;
  const doc = input.ownerDocument || getToolDocument();
  const listId = kind === 'source' ? 'u_sourceAppRecents' : 'u_targetAppRecents';
  if (!doc.getElementById(listId)) {
    const dl = doc.createElement('datalist');
    dl.id = listId;
    input.parentElement?.appendChild(dl);
  }
  input.setAttribute('list', listId);
  input.setAttribute('autocomplete', 'off');
  input.setAttribute('data-kus-recents', kind);
  input.addEventListener('change', () => rememberAppId(kind, input.value));
  input.addEventListener('blur', () => rememberAppId(kind, input.value));
  syncDatalist(kind);
}

/* =====================================================================
 * 3. 環境バッジ（プロスペクト理論 / リスク認知）
 * =====================================================================
 * 比較先がプレビュー API か本番か、また同一接続かを常時表示。
 */
export interface EnvBadgeContext {
  sourceAppId: string;
  targetAppId: string;
  sourcePreview: boolean;
  targetPreview: boolean;
  sameConnection: boolean;
}

export function renderEnvBadge(ctx: EnvBadgeContext): string {
  const tone = ctx.sameConnection
    ? 'danger'
    : !ctx.targetPreview
    ? 'danger'
    : ctx.targetAppId
    ? 'caution'
    : 'neutral';
  const label = ctx.sameConnection
    ? '同一接続'
    : !ctx.targetPreview
    ? '比較先=本番'
    : ctx.targetAppId
    ? '比較先=プレビュー'
    : '未設定';
  const direction = ctx.sourceAppId && ctx.targetAppId
    ? `<span class="kus-env-badge__dir"><span class="kus-env-badge__src">#${esc(ctx.sourceAppId)}</span><span class="kus-env-badge__arrow" aria-hidden="true">→</span><span class="kus-env-badge__tgt">#${esc(ctx.targetAppId)}</span></span>`
    : '<span class="kus-env-badge__dir kus-env-badge__dir--empty">アプリID未設定</span>';
  const icon = tone === 'danger' ? '!' : tone === 'caution' ? '⚠' : 'i';
  return `<span class="kus-env-badge kus-env-badge--${tone}" role="status" aria-live="polite" title="比較元→比較先 / プレビュー or 本番">
    <span class="kus-env-badge__icon" aria-hidden="true">${icon}</span>
    <span class="kus-env-badge__label">${esc(label)}</span>
    ${direction}
  </span>`;
}

export function updateEnvBadge(host: HTMLElement | null, getCtx: () => EnvBadgeContext): void {
  if (!host) return;
  host.innerHTML = renderEnvBadge(getCtx());
}

/* =====================================================================
 * 2. 破壊的アクションの type-to-confirm ガード
 * =====================================================================
 * automation bias / loss aversion 対策。
 * Promise を返し、ユーザがキーワードを正確に入力した場合のみ resolve(true)。
 */
export interface ConfirmDestructiveOptions {
  title: string;
  body: string;
  /** 入力させるキーワード。アプリID や 'DELETE' など。 */
  keyword: string;
  /** ボタンラベル。省略時は「実行する」 */
  okLabel?: string;
  /** false の場合キャンセル扱い */
  riskTone?: 'danger' | 'warning';
}

export function confirmDestructive(opts: ConfirmDestructiveOptions): Promise<boolean> {
  return new Promise((resolve) => {
    const root = getRoot();
    const doc = getToolDocument();
    if (!root || !doc) { resolve(false); return; }
    const overlay = doc.createElement('div');
    overlay.className = `kus-confirm-overlay kus-confirm-overlay--${opts.riskTone || 'danger'}`;
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'kus-confirm-title');
    overlay.innerHTML = `
      <div class="kus-confirm-card">
        <div class="kus-confirm-header">
          <span class="kus-confirm-icon" aria-hidden="true">!</span>
          <h3 class="kus-confirm-title" id="kus-confirm-title">${esc(opts.title)}</h3>
        </div>
        <div class="kus-confirm-body">${escMultiline(opts.body)}</div>
        <label class="kus-confirm-prompt">
          確認のため <code>${esc(opts.keyword)}</code> と入力してください
          <input type="text" class="kus-confirm-input" autocomplete="off" spellcheck="false" />
        </label>
        <div class="kus-confirm-actions">
          <button type="button" class="kus-confirm-cancel">キャンセル</button>
          <button type="button" class="kus-confirm-ok" disabled>${esc(opts.okLabel || '実行する')}</button>
        </div>
      </div>
    `;
    root.appendChild(overlay);

    const input = overlay.querySelector<HTMLInputElement>('.kus-confirm-input');
    const ok = overlay.querySelector<HTMLButtonElement>('.kus-confirm-ok');
    const cancel = overlay.querySelector<HTMLButtonElement>('.kus-confirm-cancel');
    const close = (result: boolean) => {
      overlay.remove();
      resolve(result);
    };
    input?.addEventListener('input', () => {
      if (ok) ok.disabled = (input.value || '').trim() !== opts.keyword;
    });
    input?.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && ok && !ok.disabled) close(true);
      if (event.key === 'Escape') close(false);
    });
    ok?.addEventListener('click', () => { if (!ok.disabled) close(true); });
    cancel?.addEventListener('click', () => close(false));
    setTimeout(() => input?.focus(), 0);
  });
}

function escMultiline(text: string): string {
  return esc(text).replace(/\n/g, '<br>');
}

/* =====================================================================
 * 4. 進捗オーバーレイ + Peak-End サマリ
 * =====================================================================
 */
export interface ProgressHandle {
  setLabel(label: string): void;
  setProgress(current: number, total?: number): void;
  finish(summary: ProgressFinishSummary): void;
  cancel(): void;
}

export interface ProgressFinishSummary {
  /** 結果のラベル。完了時の最後の印象（Peak-End）に効く。 */
  title: string;
  /** key/value で結果を箇条書き。 */
  metrics: Array<{ label: string; value: string; tone?: 'ok' | 'warn' | 'info' }>;
  /** OK の場合 false 以外。エラーがあれば true。 */
  hasError?: boolean;
  /** バックアップファイル名や保存先など、ユーザの安心材料を載せる。 */
  hint?: string;
}

export function startProgress(initialLabel: string, total = 0): ProgressHandle {
  const root = getRoot();
  const doc = getToolDocument();
  if (!root || !doc) {
    return {
      setLabel() {},
      setProgress() {},
      finish() {},
      cancel() {}
    };
  }
  const startedAt = Date.now();
  const overlay = doc.createElement('div');
  overlay.className = 'kus-progress-overlay';
  overlay.setAttribute('role', 'status');
  overlay.setAttribute('aria-live', 'polite');
  overlay.innerHTML = `
    <div class="kus-progress-card">
      <div class="kus-progress-spinner" aria-hidden="true"></div>
      <div class="kus-progress-label">${esc(initialLabel)}</div>
      <div class="kus-progress-bar"><div class="kus-progress-fill" style="width:0%"></div></div>
      <div class="kus-progress-meta"><span class="kus-progress-count"></span><span class="kus-progress-elapsed">0秒</span></div>
    </div>
  `;
  root.appendChild(overlay);
  const labelEl = overlay.querySelector<HTMLElement>('.kus-progress-label');
  const fill = overlay.querySelector<HTMLElement>('.kus-progress-fill');
  const countEl = overlay.querySelector<HTMLElement>('.kus-progress-count');
  const elapsedEl = overlay.querySelector<HTMLElement>('.kus-progress-elapsed');

  let totalRef = Number(total) || 0;
  let currentRef = 0;
  const elapsedTimer = setInterval(() => {
    if (!elapsedEl) return;
    const sec = Math.max(0, Math.round((Date.now() - startedAt) / 1000));
    elapsedEl.textContent = `${sec}秒`;
  }, 500);

  function update() {
    if (countEl) {
      if (totalRef > 0) countEl.textContent = `${currentRef} / ${totalRef}`;
      else countEl.textContent = currentRef ? `${currentRef} 件` : '';
    }
    if (fill) {
      const ratio = totalRef > 0 ? Math.min(1, currentRef / totalRef) : (currentRef > 0 ? 0.5 : 0);
      fill.style.width = `${Math.round(ratio * 100)}%`;
      fill.classList.toggle('kus-progress-fill--indeterminate', totalRef <= 0);
    }
  }
  update();

  function dispose() {
    clearInterval(elapsedTimer);
    overlay.remove();
  }

  return {
    setLabel(label) { if (labelEl) labelEl.textContent = label; },
    setProgress(current, totalArg) {
      currentRef = Math.max(0, Number(current) || 0);
      if (typeof totalArg === 'number') totalRef = Math.max(0, totalArg);
      update();
    },
    finish(summary) {
      dispose();
      renderCompletionSummary(summary, Date.now() - startedAt);
    },
    cancel() { dispose(); }
  };
}

export function renderCompletionSummary(summary: ProgressFinishSummary, elapsedMs: number): void {
  const root = getRoot();
  const doc = getToolDocument();
  if (!root || !doc) return;
  const card = doc.createElement('div');
  card.className = `kus-completion-card kus-completion-card--${summary.hasError ? 'warn' : 'ok'}`;
  card.setAttribute('role', 'status');
  const elapsedSec = Math.max(0, Math.round(elapsedMs / 1000));
  const metricsHtml = (summary.metrics || []).map((m) => `
    <div class="kus-completion-metric kus-completion-metric--${m.tone || 'info'}">
      <div class="kus-completion-metric__label">${esc(m.label)}</div>
      <div class="kus-completion-metric__value">${esc(m.value)}</div>
    </div>
  `).join('');
  card.innerHTML = `
    <div class="kus-completion-head">
      <span class="kus-completion-icon" aria-hidden="true">${summary.hasError ? '⚠' : '✓'}</span>
      <h3 class="kus-completion-title">${esc(summary.title)}</h3>
      <button type="button" class="kus-completion-close" aria-label="閉じる">×</button>
    </div>
    <div class="kus-completion-grid">${metricsHtml}
      <div class="kus-completion-metric kus-completion-metric--info">
        <div class="kus-completion-metric__label">所要時間</div>
        <div class="kus-completion-metric__value">${elapsedSec}秒</div>
      </div>
    </div>
    ${summary.hint ? `<p class="kus-completion-hint">${escMultiline(summary.hint)}</p>` : ''}
  `;
  root.appendChild(card);
  card.querySelector('.kus-completion-close')?.addEventListener('click', () => card.remove());
  // 6秒ハイライト後に閉じる
  setTimeout(() => card.classList.add('kus-completion-card--dim'), 6000);
}

/* =====================================================================
 * 10. セッション・メタ認知カウンタ
 * =====================================================================
 */
type SessionMetricKey =
  | 'diffRun'
  | 'planRun'
  | 'applyRun'
  | 'applyError'
  | 'recordDelete'
  | 'designExport'
  | 'apiTesterRun';

const sessionMetrics: Record<SessionMetricKey, number> = {
  diffRun: 0,
  planRun: 0,
  applyRun: 0,
  applyError: 0,
  recordDelete: 0,
  designExport: 0,
  apiTesterRun: 0
};

const METRIC_LABELS: Record<SessionMetricKey, string> = {
  diffRun: '差分比較',
  planRun: 'プラン確認',
  applyRun: 'プレビュー反映',
  applyError: '反映エラー',
  recordDelete: 'レコード削除',
  designExport: '設計書出力',
  apiTesterRun: 'APIテスター実行'
};

export function bumpSessionMetric(key: SessionMetricKey, delta = 1): void {
  if (!(key in sessionMetrics)) return;
  sessionMetrics[key] = Math.max(0, sessionMetrics[key] + Number(delta || 0));
  refreshSessionSummary();
}

export function getSessionMetricsSnapshot(): Readonly<Record<SessionMetricKey, number>> {
  return { ...sessionMetrics };
}

export function renderSessionSummary(): string {
  const items = Object.keys(sessionMetrics)
    .map((k) => k as SessionMetricKey)
    .filter((k) => sessionMetrics[k] > 0);
  if (!items.length) {
    return `<p class="kus-session-empty">このセッションの実行記録はまだありません。安全な操作から始めて記録を残せます。</p>`;
  }
  const chips = items.map((k) => `
    <span class="kus-session-chip kus-session-chip--${k === 'applyError' ? 'warn' : 'info'}">
      <span class="kus-session-chip__label">${esc(METRIC_LABELS[k])}</span>
      <span class="kus-session-chip__value">${sessionMetrics[k]}</span>
    </span>
  `).join('');
  return `<div class="kus-session-chips">${chips}</div>`;
}

function refreshSessionSummary(): void {
  const doc = getToolDocument();
  const host = doc?.getElementById('u_sessionSummary');
  if (!host) return;
  host.innerHTML = renderSessionSummary();
}

/* =====================================================================
 * 8. エラーメッセージ・ヒューマナイザ（自責緩和）
 * =====================================================================
 */
export interface HumanizedError {
  title: string;
  body: string;
  hint?: string;
}

export function humanizeError(err: unknown, context: string = ''): HumanizedError {
  const raw = err instanceof Error ? err.message : String(err ?? '');
  const lower = raw.toLowerCase();
  if (!raw) {
    return {
      title: '不明なエラー',
      body: '原因情報が取得できませんでした。',
      hint: 'ブラウザの開発者ツール (Console) でログを確認してください。'
    };
  }
  if (/network|failed to fetch|networkerror/i.test(raw)) {
    return {
      title: '接続できませんでした',
      body: 'kintone との通信が失敗しました。原因はネットワーク・VPN・kintone 側障害が考えられます。',
      hint: '少し待ってから再試行するか、kintone 管理画面が開けるか確認してください。'
    };
  }
  if (/cb_va01|invalid input|不正/i.test(raw)) {
    return {
      title: '入力内容に問題がありました',
      body: `kintone から入力エラーが返されました。原文: ${raw}`,
      hint: '対象アプリID、フィールドコード、JSON 形式を見直してください。'
    };
  }
  if (/permission|aclsetting|権限/i.test(raw)) {
    return {
      title: '権限が不足しています',
      body: '実行ユーザにアプリ管理権限が無い、または対象アプリへのアクセスが許可されていません。',
      hint: 'アプリ管理者に依頼するか、別アカウントで再試行してください。'
    };
  }
  if (/cb_au01|cb_au02|認証|unauthorized|401/i.test(raw)) {
    return {
      title: 'ログインセッションが切れています',
      body: 'kintone のセッション認証が無効になりました。',
      hint: '同じブラウザで kintone を開き直してから、再度ツールを実行してください。'
    };
  }
  if (lower.includes('timeout')) {
    return {
      title: 'タイムアウトしました',
      body: '応答に時間がかかりすぎたため処理を打ち切りました。',
      hint: '対象範囲（セクション・件数）を絞って分割実行してください。'
    };
  }
  return {
    title: context ? `${context}でエラーが発生しました` : 'エラーが発生しました',
    body: raw,
    hint: '同じ内容で再現する場合は、ヘッダーのビルド表記をクリックして識別情報をコピーし、共有してください。'
  };
}

export function renderHumanizedError(err: unknown, context: string = ''): string {
  const h = humanizeError(err, context);
  return `<div class="kus-humanized-error" role="alert">
    <div class="kus-humanized-error__title">${esc(h.title)}</div>
    <div class="kus-humanized-error__body">${escMultiline(h.body)}</div>
    ${h.hint ? `<div class="kus-humanized-error__hint">対処: ${escMultiline(h.hint)}</div>` : ''}
  </div>`;
}

/* =====================================================================
 * 7. 操作ガイドのレベル表記支援
 * =====================================================================
 */
export const TOUR_LEVEL_HINT =
  '初めて: 1) 全工程 / 復習: 2) 差分のみ / 反映直前: 3) 反映まで';

/* =====================================================================
 * 起動時インストーラ
 * =====================================================================
 */
export interface PsychologyInstallRefs {
  sourceApp?: HTMLInputElement | null;
  targetApp?: HTMLInputElement | null;
  envBadgeHost?: HTMLElement | null;
  sessionSummaryHost?: HTMLElement | null;
  getEnvContext?: () => EnvBadgeContext;
}

export function installPsychology(refs: PsychologyInstallRefs): void {
  installAppIdRecents(refs.sourceApp || null, 'source');
  installAppIdRecents(refs.targetApp || null, 'target');

  if (refs.envBadgeHost && typeof refs.getEnvContext === 'function') {
    const refresh = () => updateEnvBadge(refs.envBadgeHost!, refs.getEnvContext!);
    refresh();
    [refs.sourceApp, refs.targetApp].forEach((el) => {
      el?.addEventListener('input', refresh);
      el?.addEventListener('change', refresh);
    });
    const root = getRoot();
    root?.addEventListener('change', (e: Event) => {
      const target = e.target as HTMLElement | null;
      if (target?.id === 'u_sourcePreview' || target?.id === 'u_targetPreview') refresh();
    });
  }

  if (refs.sessionSummaryHost) {
    refs.sessionSummaryHost.id = 'u_sessionSummary';
    refs.sessionSummaryHost.innerHTML = renderSessionSummary();
  }
}
