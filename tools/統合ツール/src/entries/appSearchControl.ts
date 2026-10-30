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
 * - 「環境内の全アプリ」で接続先の全アプリを候補にし、複数件を受け付ける割り当て先（applyAll）へまとめて流し込む
 * - 「ゲストスペースも探す」では、ゲストスペースを探してそのアプリも候補に加え、候補ごとにゲストスペースIDを持たせる
 */

import {
  apiGet,
  buildApiPrefix,
  fetchAllApps,
  fetchAllAppsIncludingGuestSpaces,
  GUEST_SPACE_PROBE_TAIL,
  type EnvironmentAppsResult
} from '../api.js';
import { extractAppIdFromInput, extractGuestIdFromInput } from '../handlers/diffFocus.js';
import { describeEnvironmentAppsProgress, summarizeEnvironmentApps } from './environmentApps.js';
import { esc } from '../utils.js';
import {
  makeRow,
  makeInput,
  makeButton,
  makeSelect,
  makeCheck,
  makeDetails,
  makeNote,
  type LitePanelHandle,
  type StatusTone
} from './litePanelTheme.js';

const RESULT_CSS_ID = 'kus-app-search-styles';
const RESULT_CSS = `
.kus-as__result{margin-top:6px;border:1px solid var(--c-border);border-radius:8px;overflow:hidden;max-height:240px;overflow-y:auto}
.kus-as__result--empty{display:none}
.kus-as__head{padding:6px 10px;background:var(--c-surface-2);font-size:12.5px;font-weight:600;color:var(--c-text-2);position:sticky;top:0}
.kus-as__table{border-collapse:collapse;width:100%;font-size:13px}
.kus-as__table th,.kus-as__table td{padding:5px 8px;border-bottom:1px solid var(--c-border);text-align:left;vertical-align:top}
.kus-as__table th{background:var(--c-surface);font-weight:600;color:var(--c-text-2);font-size:12.5px}
.kus-as__table tr:last-child td{border-bottom:none}
.kus-as__id{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;color:var(--c-text-2);white-space:nowrap}
.kus-as__name{color:var(--c-text);word-break:break-all}
.kus-as__meta{margin-top:3px;color:var(--c-text-2);font-size:12px;line-height:1.5}
.kus-as__assign{display:flex;flex-wrap:wrap;gap:4px;justify-content:flex-end}
.kus-as__assign .kus-lp__btn{padding:4px 8px;font-size:12px}
.kus-as__assign .kus-as__picked{background:var(--c-ok-bg);border-color:var(--c-ok-bd);color:var(--c-ok-fg)}
.kus-as__bulk{display:flex;flex-wrap:wrap;align-items:center;gap:6px;padding:6px 10px;border-bottom:1px solid var(--c-border);background:var(--c-surface)}
.kus-as__bulk .kus-lp__btn{padding:4px 10px;font-size:12.5px}
.kus-as__bulk .kus-as__picked{background:var(--c-ok-bg);border-color:var(--c-ok-bd);color:var(--c-ok-fg)}
.kus-as__bulk-note{flex-basis:100%;color:var(--c-text-2);font-size:12px;line-height:1.5}
.kus-as__scope{padding:6px 10px;border-bottom:1px solid var(--c-border);background:var(--c-surface);color:var(--c-text-2);font-size:12px;line-height:1.5}
.kus-as__filter{display:flex;flex-wrap:wrap;align-items:center;gap:6px;padding:6px 10px;border-bottom:1px solid var(--c-border);background:var(--c-surface);font-size:12.5px;color:var(--c-text-2)}
.kus-as__filter select{max-width:100%;min-width:0}
.kus-as__guest{color:var(--c-info-fg,var(--c-text));font-weight:600}
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

/** 「すべて設定」で渡す候補 1 件。 */
export interface AppSearchPick {
  appId: string;
  appName: string;
  /** その候補のゲストスペースID（通常スペース・スペース外のアプリは空文字） */
  guestId: string;
}

export interface AppSearchTarget {
  /** 割り当て先の表示名（例: 比較元 / 比較先）。1 件のみのときは省略可。 */
  label?: string;
  /** 候補が選択されたときに ID（と名称・その候補のゲストスペースID）を流し込む処理 */
  apply: (appId: string, appName: string, guestId: string) => void | AppSearchApplyResult;
  /**
   * 複数のアプリを受け付ける割り当て先だけが指定する。表示中の候補すべて（ID の昇順）を
   * 一度に流し込む。指定した割り当て先には、候補一覧の上に「すべて設定」のボタンを出す。
   * 候補ごとのゲストスペースIDは各 pick の guestId に入る。
   */
  applyAll?: (apps: AppSearchPick[]) => void | AppSearchApplyResult;
  /** 「すべて設定」ボタンの文言。省略時は「候補 N 件をすべて追加」（割り当て先が複数なら「…すべて{label}へ」）。 */
  applyAllLabel?: (count: number) => string;
  /**
   * ゲストスペースIDを 1 つしか持てない割り当て先（カンマ区切りのアプリID欄など）。
   * 表示中の候補に通常スペースとゲストスペース、または複数のゲストスペースが混ざるときは「すべて設定」を押せなくし、
   * 「表示する場所」で 1 か所に絞るよう示す。
   */
  singleGuest?: boolean;
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
  /** 候補を取得した接続先のゲストスペースID（通常スペース・スペース外は空文字） */
  guestId: string;
  code?: string;
  spaceId?: string | null;
  modifiedAt?: string;
  modifierName?: string;
}

function appCandidate(info: any, appId: string, guestId: string): AppCandidate {
  return { appId, name: String(info?.name || ''), guestId, code: info?.code == null ? undefined : String(info.code),
    spaceId: info?.spaceId === null ? null : info?.spaceId === undefined ? undefined : String(info.spaceId),
    modifiedAt: String(info?.modifiedAt || ''), modifierName: String(info?.modifier?.name || info?.modifier?.code || '') };
}

/** 候補の接続先の表示名。ゲストスペース名が分かれば添える。 */
function locationLabel(guestId: string, guestNames: ReadonlyMap<string, string>): string {
  if (!guestId) return '通常スペース・スペース外';
  const name = guestNames.get(guestId);
  return name ? `ゲストスペース「${name}」（ID ${guestId}）` : `ゲストスペース ${guestId}`;
}

function candidateDetails(app: AppCandidate): string {
  const parts = [app.code === undefined ? 'コード未取得' : app.code ? `コード: ${app.code}` : 'コード未設定',
    app.guestId ? '' : app.spaceId === null ? 'スペース外' : app.spaceId ? `スペース: ${app.spaceId}` : '所属スペース未取得'].filter(Boolean);
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
  const allBtn = makeButton('環境内の全アプリ', 'sub');
  allBtn.title = '接続先で閲覧できるアプリをすべて候補に表示します（検索語とスペースIDは使いません）';
  const guestScan = makeCheck({
    label: 'ゲストスペースも探す',
    checked: true,
    help: `スペースIDを順に確かめて、閲覧できるゲストスペースのアプリも候補に加えます（見つかった最後のスペースIDの ${GUEST_SPACE_PROBE_TAIL} 件先まで）。スペースが多い環境では時間がかかります`
  });
  const searchMode = makeSelect([['name', '名前 / ID / URL'], ['code', 'アプリコード（完全一致）']]);
  searchMode.setAttribute('aria-label', '検索方法');
  const space = makeInput({ placeholder: 'スペースID（任意）', width: 'guest', noSubmit: true, ariaLabel: '検索対象スペースID' });
  body.appendChild(makeRow([searchMode, space], { label: '検索方法' }));
  body.appendChild(makeRow([keyword, guest, searchBtn], { label: '検索語' }));
  body.appendChild(makeRow([allBtn, guestScan.label], { label: '全アプリ' }));
  body.appendChild(makeNote('閲覧できるアプリを名前（部分一致）またはコード（大文字・小文字を区別する完全一致）で検索します。スペースIDで検索範囲を絞れます。ID / URL の直接指定ではスペースIDの絞り込みは使いません。'));
  const allTargets = opts.targets.filter((t) => typeof t.applyAll === 'function');
  body.appendChild(makeNote(`「環境内の全アプリ」は、閲覧できるアプリをすべて候補に表示します${allTargets.length ? '（候補の上の「すべて…」でまとめて設定できます）' : ''}。「ゲストスペースも探す」を付けると、ゲストスペースを探してそのアプリも加え、行ごとにゲストスペースかどうかを示します（外すと、ゲストIDを入れたときはそのゲストスペースだけを取得します）。`));

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
  /** 表示中の候補が「環境内の全アプリ」の取得結果か（見出しの文言に使う） */
  let resultIsAll = false;
  /** 「環境内のアプリ N件」に続ける文と、ゲストスペースを確かめた範囲の説明 */
  let allHeadSuffix = '';
  let allScope = '';
  /** 見つかったゲストスペースの名前（ゲストスペースID → 名前） */
  let guestNames = new Map<string, string>();
  /** 「表示する場所」の選択。'*' はすべて、'' は通常スペース・スペース外、数字はゲストスペースID */
  let locationFilter = '*';

  function invalidate() {
    generation += 1;
    candidates = [];
    nextOffset = 0;
    resultIsAll = false;
    allHeadSuffix = '';
    allScope = '';
    guestNames = new Map();
    locationFilter = '*';
    resultBox.replaceChildren();
    resultBox.className = 'kus-as__result kus-as__result--empty';
    moreBtn.hidden = true;
  }
  keyword.addEventListener('input', invalidate);
  guest.addEventListener('input', invalidate);
  space.addEventListener('input', invalidate);
  guestScan.checkbox.addEventListener('change', invalidate);
  searchMode.addEventListener('change', () => {
    keyword.placeholder = searchMode.value === 'code' ? 'アプリコード（完全一致）' : 'アプリ名 / アプリID / URL';
    invalidate();
  });
  function syncBusyControls() {
    const busy = panel.root.getAttribute('aria-busy') === 'true';
    searchBtn.disabled = running || busy;
    allBtn.disabled = running || busy;
    moreBtn.disabled = running || busy;
  }
  panel.root.addEventListener('kus-lite-busy-change', () => {
    if (running && panel.root.getAttribute('aria-busy') === 'true') invalidate();
    syncBusyControls();
  });

  /** 候補の接続先へゲストID欄を合わせる。通常スペースへの切り替えでは空欄に戻す。 */
  function syncGuestEl(guestId: string) {
    if (!opts.guestEl || opts.guestEl.value.trim() === guestId) return;
    opts.guestEl.value = guestId;
    opts.guestEl.dispatchEvent(new Event('input', { bubbles: true }));
    opts.guestEl.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function renderResults(): void {
    if (!candidates.length) {
      resultBox.className = 'kus-as__result';
      resultBox.innerHTML = '<div class="kus-as__head">検索結果なし</div>';
      return;
    }
    const counts = new Map<string, number>();
    candidates.forEach((app) => counts.set(app.guestId, (counts.get(app.guestId) || 0) + 1));
    const locations = [...counts.keys()].sort((a, b) => (a ? Number(a) : 0) - (b ? Number(b) : 0));
    const filterable = resultIsAll && locations.length > 1;
    if (!filterable || (locationFilter !== '*' && !counts.has(locationFilter))) locationFilter = '*';
    const apps = locationFilter === '*' ? candidates : candidates.filter((app) => app.guestId === locationFilter);
    const mixed = locationFilter === '*' && locations.length > 1;
    const single = opts.targets.length <= 1;
    const rowsHtml = apps.map((app, idx) => {
      const buttons = opts.targets.map((t, ti) => {
        const label = single ? '選択' : `${t.label || '設定'}へ`;
        return `<button type="button" class="kus-lp__btn kus-lp__btn--sub" data-as-pick="${idx}" data-as-target="${ti}">${esc(label)}</button>`;
      }).join('');
      const where = app.guestId ? `<span class="kus-as__guest">${esc(locationLabel(app.guestId, guestNames))}</span> · ` : '';
      return `<tr>
        <td class="kus-as__id">${esc(app.appId)}</td>
        <td class="kus-as__name"><div>${esc(app.name)}</div><div class="kus-as__meta">${where}${esc(candidateDetails(app))}</div></td>
        <td><div class="kus-as__assign">${buttons}</div></td>
      </tr>`;
    }).join('');
    const filterHtml = filterable ? `<label class="kus-as__filter">表示する場所<select class="kus-lp__select" data-as-filter aria-label="表示する場所">
        <option value="*"${locationFilter === '*' ? ' selected' : ''}>すべて（${candidates.length}件）</option>
        ${locations.map((loc) => `<option value="${esc(loc)}"${loc === locationFilter ? ' selected' : ''}>${esc(locationLabel(loc, guestNames))}（${counts.get(loc)}件）</option>`).join('')}
      </select></label>` : '';
    // ゲストスペースIDを 1 つしか持てない割り当て先へは、場所が混ざった候補をまとめて入れない
    const blocked = mixed ? allTargets.filter((t) => t.singleGuest) : [];
    const blockedNote = blocked.length
      ? `<div class="kus-as__bulk-note">通常スペースとゲストスペースなど、場所の違うアプリが混ざっているため${blocked.some((t) => t.label) ? `「${blocked.map((t) => t.label || '設定').join('」「')}」へは` : ''}まとめて設定できません（ゲストスペースIDは 1 つしか入れられません）。「表示する場所」で 1 か所に絞ってください。</div>`
      : '';
    const bulkHtml = allTargets.length ? `<div class="kus-as__bulk">${allTargets.map((t) => {
      const ti = opts.targets.indexOf(t);
      const label = t.applyAllLabel ? t.applyAllLabel(apps.length)
        : single || !t.label ? `候補 ${apps.length} 件をすべて追加` : `候補 ${apps.length} 件をすべて${t.label}へ`;
      return `<button type="button" class="kus-lp__btn kus-lp__btn--sub" data-as-all="${ti}"${blocked.includes(t) ? ' disabled' : ''}>${esc(label)}</button>`;
    }).join('')}${blockedNote}</div>` : '';
    const head = resultIsAll ? `環境内のアプリ ${candidates.length}件${allHeadSuffix}` : `${candidates.length}件の候補`;
    resultBox.className = 'kus-as__result';
    resultBox.innerHTML = `<div class="kus-as__head">${esc(head)}</div>${allScope ? `<div class="kus-as__scope">${esc(allScope)}</div>` : ''}${filterHtml}${bulkHtml}
      <table class="kus-as__table">
        <thead><tr><th style="width:74px">アプリID</th><th>アプリ名</th><th style="width:1%"></th></tr></thead>
        <tbody>${rowsHtml}</tbody>
      </table>`;
    resultBox.querySelector<HTMLSelectElement>('select[data-as-filter]')?.addEventListener('change', (event) => {
      locationFilter = (event.target as HTMLSelectElement).value;
      renderResults();
      resultBox.querySelector<HTMLSelectElement>('select[data-as-filter]')?.focus();
    });
    resultBox.querySelectorAll<HTMLButtonElement>('button[data-as-pick]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const app = apps[Number(btn.dataset.asPick)];
        const target = opts.targets[Number(btn.dataset.asTarget)];
        if (!app || !target) return;
        if (running || panel.root.getAttribute('aria-busy') === 'true') return;
        const outcome: AppSearchApplyResult = target.apply(app.appId, app.name, app.guestId) || {};
        // 候補を取得した接続先も同期する
        syncGuestEl(app.guestId);
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
    resultBox.querySelectorAll<HTMLButtonElement>('button[data-as-all]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const target = opts.targets[Number(btn.dataset.asAll)];
        if (!target?.applyAll || !apps.length || btn.disabled) return;
        if (running || panel.root.getAttribute('aria-busy') === 'true') return;
        const picks = apps.map((app) => ({ appId: app.appId, appName: app.name, guestId: app.guestId }));
        const outcome: AppSearchApplyResult = target.applyAll(picks) || {};
        // 1 か所の候補だけなら、その接続先へゲストID欄を合わせる
        if (!mixed) syncGuestEl(picks[0].guestId);
        const where = opts.targets.length > 1 && target.label ? `（${target.label}）` : '';
        btn.classList.add('kus-as__picked');
        btn.setAttribute('aria-pressed', 'true');
        btn.textContent = outcome.pickedLabel || `${apps.length} 件を設定済み`;
        panel.setStatus(outcome.message || `候補 ${apps.length} 件を設定しました${where}`, outcome.tone || 'ok');
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
    syncBusyControls();
    resultBox.setAttribute('aria-busy', 'true');
    try {
      if (directAppId) {
        panel.setStatus('アプリIDを確認中…', 'busy');
        let candidate: AppCandidate = { appId: directAppId, name: 'ID指定（名称未取得）', guestId };
        try {
          const info = await apiGet(prefix, '/app.json', { id: directAppId });
          candidate = appCandidate(info, directAppId, guestId);
        } catch { /* 名称を取得できない場合も、明示されたIDを候補に残す。 */ }
        if (!isCurrent()) return;
        candidates = [candidate];
        renderResults();
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
        if (/^\d+$/.test(appId)) byId.set(appId, appCandidate(app, appId, guestId));
      }
      candidates = [...byId.values()].sort((a, b) => BigInt(a.appId) < BigInt(b.appId) ? -1 : BigInt(a.appId) > BigInt(b.appId) ? 1 : 0);
      nextOffset = Number(params.offset) + 100;
      renderResults();
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

  /** ゲストスペースも探した「環境内の全アプリ」の結果を候補に表示する。 */
  function showEnvironmentApps(result: EnvironmentAppsResult, typedGuestId: string): void {
    guestNames = new Map(result.guestSpaces.map((space) => [space.guestId, space.name]));
    candidates = result.apps.map((entry) => appCandidate(entry.app, String(entry.app.appId).trim(), entry.guestId));
    resultIsAll = true;
    const summary = summarizeEnvironmentApps(result, { typedGuestId, canApplyAll: allTargets.length > 0 });
    allHeadSuffix = summary.headSuffix;
    allScope = summary.scope;
    renderResults();
    panel.setStatus(summary.message, summary.tone);
  }

  async function runAll(): Promise<void> {
    if (running || panel.root.getAttribute('aria-busy') === 'true') return;
    invalidate();
    const guestId = guest.value.trim();
    if (guestId && !/^\d+$/.test(guestId)) {
      panel.setStatus('ゲストIDは数値で入力してください', 'warn');
      return;
    }
    const scanGuests = guestScan.checkbox.checked;
    const requestGeneration = generation;
    const isCurrent = () => requestGeneration === generation && panel.root.isConnected
      && panel.root.getAttribute('aria-busy') !== 'true';
    running = true;
    syncBusyControls();
    resultBox.setAttribute('aria-busy', 'true');
    try {
      panel.setStatus('環境内の全アプリを取得中…', 'busy');
      if (scanGuests) {
        const result = await fetchAllAppsIncludingGuestSpaces({
          extraGuestIds: guestId ? [guestId] : [],
          onProgress: (progress) => { if (isCurrent()) panel.setStatus(describeEnvironmentAppsProgress(progress), 'busy'); },
          // 取得条件が変わったら、残りのスペースIDを確かめずに止める
          shouldStop: () => !isCurrent()
        });
        if (!isCurrent()) return;
        showEnvironmentApps(result, guestId);
        return;
      }
      const apps = await fetchAllApps(guestId, (fetched) => {
        if (isCurrent()) panel.setStatus(`環境内の全アプリを取得中…（${fetched}件）`, 'busy');
      });
      if (!isCurrent()) return;
      candidates = apps.map((app) => appCandidate(app, String(app.appId), guestId));
      resultIsAll = true;
      allHeadSuffix = guestId ? `（ゲストスペース ${guestId}）` : '';
      renderResults();
      const where = guestId ? `ゲストスペース ${guestId}` : '通常スペース・スペース外';
      panel.setStatus(
        candidates.length
          ? `環境内のアプリ ${candidates.length}件を表示しました（${where}のアプリ）${allTargets.length ? '。「すべて…」でまとめて設定できます' : ''}`
          : `閲覧できるアプリがありません（${where}）`,
        candidates.length ? 'ok' : 'info'
      );
    } catch (e: any) {
      if (!isCurrent()) return;
      panel.setStatus(`全アプリの取得エラー: ${e?.message || String(e)}`, 'err');
    } finally {
      running = false;
      syncBusyControls();
      resultBox.setAttribute('aria-busy', 'false');
      if (!isCurrent() && panel.root.isConnected && panel.root.getAttribute('aria-busy') !== 'true' && panel.status.dataset.tone === 'busy') {
        panel.setStatus('取得条件が変わりました。もう一度取得してください', 'info');
      }
    }
  }

  searchBtn.addEventListener('click', () => { void runSearch(); });
  allBtn.addEventListener('click', () => { void runAll(); });
  moreBtn.addEventListener('click', () => { void runSearch(true); });
  const onEnterKey = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.isComposing && (e as any).keyCode !== 229) {
      e.preventDefault();
      void runSearch();
    }
  };
  keyword.addEventListener('keydown', onEnterKey);
  guest.addEventListener('keydown', onEnterKey);
  space.addEventListener('keydown', onEnterKey);

  return details;
}
