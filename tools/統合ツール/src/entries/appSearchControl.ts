'use strict';

/**
 * lite パネル共通の「アプリ名検索」コントロール。
 *
 * 統合ツール（接続パネル）の `runConnectionSearchApps` 相当の機能を、
 * 各 lite 版（差分／反映／フィールド／JS設定／設定取得／設計書／ER／プロセス／レコード）の
 * アプリ ID 入力欄から直接使えるようにする。
 *
 * - アプリ名／アプリID／URL のいずれでも検索できる（ID/URL は直接候補化）
 * - 検索結果からワンクリックで対象の入力欄へ ID を流し込む
 * - 1 入力欄なら単一ボタン、複数入力欄（比較元/比較先など）なら割り当て先を選択
 */

import { apiGet, buildApiPrefix } from '../api.js';
import { extractAppIdFromInput, extractGuestIdFromInput } from '../handlers/diffFocus.js';
import { esc } from '../utils.js';
import {
  makeRow,
  makeInput,
  makeButton,
  makeSelect,
  makeDetails,
  makeNote,
  type LitePanelHandle,
  type StatusTone
} from './litePanelTheme.js';

const RESULT_CSS_ID = 'kus-app-search-styles';
const RESULT_CSS = `
.kus-as__result{margin-top:6px;border:1px solid var(--c-border);border-radius:8px;overflow:hidden;max-height:240px;overflow-y:auto}
.kus-as__result--empty{display:none}
.kus-as__head{padding:6px 10px;background:var(--c-surface-2);font-size:11px;font-weight:600;color:var(--c-text-2);position:sticky;top:0}
.kus-as__table{border-collapse:collapse;width:100%;font-size:11.5px}
.kus-as__table th,.kus-as__table td{padding:5px 8px;border-bottom:1px solid var(--c-border);text-align:left;vertical-align:top}
.kus-as__table th{background:var(--c-surface);font-weight:600;color:var(--c-text-2);font-size:11px}
.kus-as__table tr:last-child td{border-bottom:none}
.kus-as__id{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;color:var(--c-text-2);white-space:nowrap}
.kus-as__name{color:var(--c-text);word-break:break-all}
.kus-as__meta{margin-top:3px;color:var(--c-text-2);font-size:10.5px;line-height:1.5}
.kus-as__assign{display:flex;flex-wrap:wrap;gap:4px;justify-content:flex-end}
.kus-as__assign .kus-lp__btn{padding:4px 8px;font-size:10.5px}
.kus-as__assign .kus-as__picked{background:var(--c-ok-bg);border-color:var(--c-ok-bd);color:var(--c-ok-fg)}
`;

function ensureStyles() {
  if (document.getElementById(RESULT_CSS_ID)) return;
  const st = document.createElement('style');
  st.id = RESULT_CSS_ID;
  st.textContent = RESULT_CSS;
  document.head.appendChild(st);
}

export interface AppSearchApplyResult {
  /** apply 後に表示するステータスメッセージ。省略時は共通メッセージ。 */
  message?: string;
  tone?: StatusTone;
  /** 押した検索結果ボタンに残す文言。省略時は「設定済み」。 */
  pickedLabel?: string;
}

export interface AppSearchTarget {
  /** 割り当て先の表示名（例: 比較元 / 比較先）。1 件のみのときは省略可。 */
  label?: string;
  /** 候補が選択されたときに ID（と名称・検索に使ったゲストID）を流し込む処理 */
  apply: (appId: string, appName: string, guestId: string) => void | AppSearchApplyResult;
}

export interface AppSearchOptions {
  /** 検索結果から ID を流し込む対象。複数指定すると割り当て先ボタンを並べる。 */
  targets: AppSearchTarget[];
  /** 検索時に同期するゲストID入力欄（任意）。URL からゲストIDを抽出したら補完する。 */
  guestEl?: HTMLInputElement | null;
  /** details の見出し（既定: 「アプリを検索（名前・コード・ID）」） */
  title?: string;
  /** 最初から開いておくか */
  open?: boolean;
}

interface AppCandidate {
  appId: string;
  name: string;
  code?: string;
  spaceId?: string | null;
  modifiedAt?: string;
  modifierName?: string;
}

function appCandidate(info: any, appId: string): AppCandidate {
  return { appId, name: String(info?.name || ''), code: info?.code == null ? undefined : String(info.code),
    spaceId: info?.spaceId === null ? null : info?.spaceId === undefined ? undefined : String(info.spaceId),
    modifiedAt: String(info?.modifiedAt || ''), modifierName: String(info?.modifier?.name || info?.modifier?.code || '') };
}

function candidateDetails(app: AppCandidate): string {
  const parts = [app.code === undefined ? 'コード未取得' : app.code ? `コード: ${app.code}` : 'コード未設定',
    app.spaceId === null ? 'スペース外' : app.spaceId ? `スペース: ${app.spaceId}` : '所属スペース未取得'];
  if (app.modifiedAt) {
    const date = new Date(app.modifiedAt);
    const time = Number.isNaN(date.getTime()) ? app.modifiedAt : date.toLocaleString('ja-JP');
    parts.push(`更新: ${time}${app.modifierName ? ` / ${app.modifierName}` : ''}`);
  }
  return parts.join(' · ');
}

/**
 * アプリ名検索コントロールを生成して `details` 要素を返す。
 * 呼び出し側で `panel.body.insertBefore(control, panel.status)` 等で配置する。
 */
export function createAppSearchControl(panel: LitePanelHandle, opts: AppSearchOptions): HTMLDetailsElement {
  ensureStyles();
  const { details, body } = makeDetails(opts.title || 'アプリを検索（名前・コード・ID）', { open: !!opts.open });

  const keyword = makeInput({ placeholder: 'アプリ名 / アプリID / URL', width: 'wide', noSubmit: true });
  const guest = makeInput({ placeholder: 'ゲストID（任意）', width: 'guest', noSubmit: true });
  if (opts.guestEl?.value.trim()) guest.value = opts.guestEl.value.trim();
  const searchBtn = makeButton('検索', 'sub', { icon: '🔍' });
  const searchMode = makeSelect([['name', '名前 / ID / URL'], ['code', 'アプリコード（完全一致）']]);
  searchMode.setAttribute('aria-label', '検索方法');
  const space = makeInput({ placeholder: 'スペースID（任意）', width: 'guest', noSubmit: true, ariaLabel: '検索対象スペースID' });
  body.appendChild(makeRow([searchMode, space], { label: '検索方法' }));
  body.appendChild(makeRow([keyword, guest, searchBtn], { label: '検索語' }));
  body.appendChild(makeNote('閲覧できるアプリを名前（部分一致）またはコード（大文字・小文字を区別する完全一致）で検索します。スペースIDで検索範囲を絞れます。ID / URL の直接指定ではスペースIDの絞り込みは使いません。'));

  const resultBox = document.createElement('div');
  resultBox.className = 'kus-as__result kus-as__result--empty';
  body.appendChild(resultBox);
  const moreBtn = makeButton('さらに100件を取得', 'sub');
  moreBtn.hidden = true;
  body.appendChild(moreBtn);
  let generation = 0;
  let running = false;
  let candidates: AppCandidate[] = [];
  let nextOffset = 0;
  let resultGuest = '';

  function invalidate() {
    generation += 1;
    candidates = [];
    nextOffset = 0;
    resultBox.replaceChildren();
    resultBox.className = 'kus-as__result kus-as__result--empty';
    moreBtn.hidden = true;
  }
  keyword.addEventListener('input', invalidate);
  guest.addEventListener('input', invalidate);
  space.addEventListener('input', invalidate);
  searchMode.addEventListener('change', () => {
    keyword.placeholder = searchMode.value === 'code' ? 'アプリコード（完全一致）' : 'アプリ名 / アプリID / URL';
    invalidate();
  });
  function syncBusyControls() {
    const busy = panel.root.getAttribute('aria-busy') === 'true';
    searchBtn.disabled = running || busy;
    moreBtn.disabled = running || busy;
  }
  panel.root.addEventListener('kus-lite-busy-change', () => {
    if (running && panel.root.getAttribute('aria-busy') === 'true') invalidate();
    syncBusyControls();
  });

  function renderResults(apps: AppCandidate[]): void {
    if (!apps.length) {
      resultBox.className = 'kus-as__result';
      resultBox.innerHTML = '<div class="kus-as__head">検索結果なし</div>';
      return;
    }
    const single = opts.targets.length <= 1;
    const rowsHtml = apps.map((app, idx) => {
      const buttons = opts.targets.map((t, ti) => {
        const label = single ? '選択' : `${t.label || '設定'}へ`;
        return `<button type="button" class="kus-lp__btn kus-lp__btn--sub" data-as-pick="${idx}" data-as-target="${ti}">${esc(label)}</button>`;
      }).join('');
      return `<tr>
        <td class="kus-as__id">${esc(app.appId)}</td>
        <td class="kus-as__name"><div>${esc(app.name)}</div><div class="kus-as__meta">${esc(candidateDetails(app))}</div></td>
        <td><div class="kus-as__assign">${buttons}</div></td>
      </tr>`;
    }).join('');
    resultBox.className = 'kus-as__result';
    resultBox.innerHTML = `<div class="kus-as__head">${apps.length}件の候補</div>
      <table class="kus-as__table">
        <thead><tr><th style="width:74px">アプリID</th><th>アプリ名</th><th style="width:1%"></th></tr></thead>
        <tbody>${rowsHtml}</tbody>
      </table>`;
    resultBox.querySelectorAll<HTMLButtonElement>('button[data-as-pick]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const app = apps[Number(btn.dataset.asPick)];
        const target = opts.targets[Number(btn.dataset.asTarget)];
        if (!app || !target) return;
        if (running || panel.root.getAttribute('aria-busy') === 'true') return;
        const searchGuest = resultGuest;
        const outcome: AppSearchApplyResult = target.apply(app.appId, app.name, searchGuest) || {};
        // 候補を取得した接続先も同期する。通常スペースへの切り替えでは空欄に戻す。
        if (opts.guestEl && opts.guestEl.value.trim() !== searchGuest) {
          opts.guestEl.value = searchGuest;
          opts.guestEl.dispatchEvent(new Event('input', { bubbles: true }));
          opts.guestEl.dispatchEvent(new Event('change', { bubbles: true }));
        }
        const where = opts.targets.length > 1 && target.label ? `（${target.label}）` : '';
        btn.classList.add('kus-as__picked');
        btn.setAttribute('aria-pressed', 'true');
        btn.textContent = outcome.pickedLabel || (opts.targets.length > 1 && target.label ? `${target.label}済み` : '設定済み');
        panel.setStatus(
          outcome.message || `App ${app.appId}${app.name ? ` (${app.name})` : ''} を設定しました${where}`,
          outcome.tone || 'ok'
        );
      });
    });
  }

  async function runSearch(append = false): Promise<void> {
    if (running || panel.root.getAttribute('aria-busy') === 'true') return;
    if (!append) invalidate();
    const raw = keyword.value.trim();
    const codeSearch = searchMode.value === 'code';
    const directAppId = codeSearch ? '' : extractAppIdFromInput(raw);
    if (!directAppId && ([...raw].length > 64 || (codeSearch && !raw))) {
      panel.setStatus(codeSearch ? 'アプリコードを1〜64文字で入力してください' : 'アプリ名は64文字以内で入力してください', 'warn');
      return;
    }
    const spaceId = space.value.trim();
    if (!directAppId && spaceId && !/^[1-9]\d*$/.test(spaceId)) {
      panel.setStatus('スペースIDは正の数値で入力してください', 'warn');
      return;
    }
    const urlGuestId = codeSearch ? '' : extractGuestIdFromInput(raw);
    if (urlGuestId) guest.value = urlGuestId;
    else if (!codeSearch && /\/k\/\d+(?:[/?#]|$)/i.test(raw)) guest.value = '';
    const guestId = guest.value.trim() || urlGuestId || '';
    if (guestId && !/^\d+$/.test(guestId)) {
      panel.setStatus('ゲストIDは数値で入力してください', 'warn');
      return;
    }
    const requestGeneration = generation;
    const isCurrent = () => requestGeneration === generation && panel.root.isConnected
      && panel.root.getAttribute('aria-busy') !== 'true';
    const prefix = buildApiPrefix(guestId, false);
    running = true;
    searchBtn.disabled = true;
    moreBtn.disabled = true;
    resultBox.setAttribute('aria-busy', 'true');
    try {
      if (directAppId) {
        panel.setStatus('アプリIDを確認中…', 'busy');
        let candidate: AppCandidate = { appId: directAppId, name: 'ID指定（名称未取得）' };
        try {
          const info = await apiGet(prefix, '/app.json', { id: directAppId });
          candidate = appCandidate(info, directAppId);
        } catch { /* 名称を取得できない場合も、明示されたIDを候補に残す。 */ }
        if (!isCurrent()) return;
        resultGuest = guestId;
        renderResults([candidate]);
        panel.setStatus(`アプリID ${directAppId}${guestId ? ` / ゲスト ${guestId}` : ''} を候補に表示しました`, 'ok');
        return;
      }
      const params: Record<string, unknown> = { limit: 100, offset: append ? nextOffset : 0 };
      if (raw) { if (codeSearch) params.codes = [raw]; else params.name = raw; }
      if (spaceId) params.spaceIds = [spaceId];
      panel.setStatus('アプリ検索中…', 'busy');
      const res = await apiGet(prefix, '/apps.json', params);
      if (!isCurrent()) return;
      if (!Array.isArray(res?.apps)) throw new Error('アプリ一覧の応答が不正です。再検索してください');
      const byId = new Map(candidates.map(app => [app.appId, app]));
      for (const app of res.apps) {
        const appId = String(app?.appId || '').trim();
        if (/^\d+$/.test(appId)) byId.set(appId, appCandidate(app, appId));
      }
      candidates = [...byId.values()].sort((a, b) => BigInt(a.appId) < BigInt(b.appId) ? -1 : BigInt(a.appId) > BigInt(b.appId) ? 1 : 0);
      nextOffset = Number(params.offset) + 100;
      resultGuest = guestId;
      renderResults(candidates);
      moreBtn.hidden = res.apps.length < 100;
      panel.setStatus(`アプリ検索完了: ${candidates.length}件${moreBtn.hidden ? '' : '。続きは「さらに100件を取得」で表示できます'}`, candidates.length ? 'ok' : 'info');
    } catch (e: any) {
      if (!isCurrent()) return;
      panel.setStatus(`アプリ検索エラー: ${e?.message || String(e)}`, 'err');
    } finally {
      running = false;
      syncBusyControls();
      resultBox.setAttribute('aria-busy', 'false');
      if (!isCurrent() && panel.root.isConnected && panel.root.getAttribute('aria-busy') !== 'true' && panel.status.dataset.tone === 'busy') {
        panel.setStatus('検索条件が変わりました。もう一度検索してください', 'info');
      }
    }
  }

  searchBtn.addEventListener('click', () => { void runSearch(); });
  moreBtn.addEventListener('click', () => { void runSearch(true); });
  keyword.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.isComposing && (e as any).keyCode !== 229) {
      e.preventDefault();
      void runSearch();
    }
  });

  return details;
}
