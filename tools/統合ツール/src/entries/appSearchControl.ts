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
  /** details の見出し（既定: 「アプリ名で検索」） */
  title?: string;
  /** 最初から開いておくか */
  open?: boolean;
}

interface AppCandidate {
  appId: string;
  name: string;
}

/**
 * アプリ名検索コントロールを生成して `details` 要素を返す。
 * 呼び出し側で `panel.body.insertBefore(control, panel.status)` 等で配置する。
 */
export function createAppSearchControl(panel: LitePanelHandle, opts: AppSearchOptions): HTMLDetailsElement {
  ensureStyles();
  const { details, body } = makeDetails(opts.title || 'アプリ名で検索', { open: !!opts.open });

  const keyword = makeInput({ placeholder: 'アプリ名 / アプリID / URL', width: 'wide', noSubmit: true });
  const guest = makeInput({ placeholder: 'ゲストID（任意）', width: 'guest', noSubmit: true });
  if (opts.guestEl?.value.trim()) guest.value = opts.guestEl.value.trim();
  const searchBtn = makeButton('検索', 'sub', { icon: '🔍' });
  body.appendChild(makeRow([keyword, guest, searchBtn], { label: '検索語' }));
  body.appendChild(makeNote('スペース内のアプリを名前で検索します。アプリIDや一覧画面のURLを貼り付けると直接候補にできます。'));

  const resultBox = document.createElement('div');
  resultBox.className = 'kus-as__result kus-as__result--empty';
  body.appendChild(resultBox);

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
        <td class="kus-as__name" title="${esc(app.name)}">${esc(app.name)}</td>
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
        const searchGuest = guest.value.trim();
        const outcome: AppSearchApplyResult = target.apply(app.appId, app.name, searchGuest) || {};
        // 検索で使ったゲストIDを、対象パネルのゲスト欄が未入力なら補完する
        if (searchGuest && opts.guestEl && !opts.guestEl.value.trim()) opts.guestEl.value = searchGuest;
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

  async function runSearch(): Promise<void> {
    const raw = keyword.value.trim();
    const urlGuestId = extractGuestIdFromInput(raw);
    if (urlGuestId && !guest.value.trim()) guest.value = urlGuestId;
    const guestId = guest.value.trim() || urlGuestId || '';
    const prefix = buildApiPrefix(guestId, false);

    const directAppId = extractAppIdFromInput(raw);
    if (directAppId) {
      panel.setStatus('アプリIDを確認中…', 'busy');
      let name = '';
      try {
        const info = await apiGet(prefix, '/app.json', { id: directAppId });
        name = String(info?.name || '').trim();
      } catch {
        name = 'ID指定（名称未取得）';
      }
      renderResults([{ appId: directAppId, name: name || 'ID指定' }]);
      panel.setStatus(`アプリID ${directAppId}${guestId ? ` / ゲスト ${guestId}` : ''} を候補に表示しました`, 'ok');
      return;
    }

    const params: Record<string, unknown> = { limit: 100 };
    if (raw) params.name = raw;
    panel.setStatus('アプリ検索中…', 'busy');
    try {
      const res = await apiGet(prefix, '/apps.json', params);
      const apps: AppCandidate[] = (res?.apps || [])
        .map((a: any) => ({ appId: String(a.appId || '').trim(), name: String(a.name || '') }))
        .filter((a: AppCandidate) => /^\d+$/.test(a.appId))
        .sort((a: AppCandidate, b: AppCandidate) => Number(a.appId) - Number(b.appId));
      renderResults(apps);
      panel.setStatus(`アプリ検索完了: ${apps.length}件`, apps.length ? 'ok' : 'info');
    } catch (e: any) {
      resultBox.className = 'kus-as__result kus-as__result--empty';
      resultBox.innerHTML = '';
      panel.setStatus(`アプリ検索エラー: ${e?.message || String(e)}`, 'err');
    }
  }

  searchBtn.addEventListener('click', () => { void runSearch(); });
  keyword.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.isComposing && (e as any).keyCode !== 229) {
      e.preventDefault();
      void runSearch();
    }
  });

  return details;
}
