'use strict';

/**
 * lite パネル共通の「入力中のアプリ名確認」。
 *
 * アプリID・ゲストスペースIDの入力欄のそばに、本番側 `/app.json` で確認したアプリ名を表示する。
 * ID の打ち間違いや、ゲストスペースの指定漏れに実行前に気づくための補助で、
 * 確認に失敗しても操作をブロックしない（厳密な確認は各処理の取得時に行う）。
 *
 * - 入力が止まってから APP_NAME_HINT_DELAY_MS 後に確認し、入力途中の値は問い合わせない
 * - 同じ (ゲストスペースID, アプリID) の確認はパネル内で 1 回にまとめ、成功結果を保持する
 * - 複数 ID を 1 欄に入力するツール（レコード管理など）は、先頭から APP_NAME_HINT_MAX_IDS 件を確認する
 * - 問い合わせ・キャッシュの実装はプレビュー反映の `reflect/appLookup.ts` と共有する
 */

import { DEFAULT_APP_ID, DEFAULT_GUEST_ID } from '../constants.js';
import {
  createReflectAppLookupCache,
  formatReflectAppName,
  isLookupableReflectApp,
  lookupReflectApp,
  REFLECT_APP_LOOKUP_FAILURE,
  type ReflectAppLookupCache,
  type ReflectAppLookupOk,
  type ReflectAppLookupResult
} from '../reflect/appLookup.js';
import type { AppTableLookupResult, LitePanelHandle } from './litePanelTheme.js';

export type AppLookupResult = ReflectAppLookupResult;
export type AppLookupOk = ReflectAppLookupOk;
export type AppLookupCache = ReflectAppLookupCache;

export const APP_NAME_HINT_DELAY_MS = 350;
export const APP_NAME_HINT_MAX_IDS = 10;
export const APP_NAME_HINT_FAILURE = REFLECT_APP_LOOKUP_FAILURE;
export const APP_NAME_HINT_PENDING = '確認中…';
export const APP_NAME_HINT_CURRENT = '開いているアプリ';

/** 「100, 120 130」のような複数 ID 入力を ID の配列にする（空要素は除く。検証はしない）。 */
export function splitAppIdsForHint(value: unknown): string[] {
  return String(value ?? '').split(/[\s,、，]+/).map((v) => v.trim()).filter(Boolean);
}

/** アプリID・ゲストスペースIDが問い合わせ可能な形（正の整数）か。 */
export const isLookupableApp = isLookupableReflectApp;

/** 「営業テンプレート（コード: sales）」形式。名前が空ならアプリIDで代替する。 */
export const formatAppLookupName = formatReflectAppName;

/** パネル 1 つにつき 1 つ作る確認キャッシュ。同じ接続先の問い合わせをまとめる。 */
export function createAppLookupCache(): AppLookupCache {
  return createReflectAppLookupCache();
}

/**
 * `makeAppTable({ lookupAppName })` に渡す確認関数を、パネル内のキャッシュから作る。
 * 表の各行とヒント欄が同じアプリを別々に問い合わせないようにする。
 */
export function createAppTableLookup(cache: AppLookupCache): (appId: string, guestId: string) => Promise<AppTableLookupResult> {
  return async (appId, guestId) => {
    const result = await cache.get(appId, guestId);
    return result.ok ? { ok: true, name: result.name, code: result.code } : { ok: false, message: 'message' in result ? result.message : APP_NAME_HINT_FAILURE };
  };
}

/** 開いているアプリ（kintone 画面のアプリ）と同じ接続先か。 */
export function isCurrentApp(appId: string, guestId: string): boolean {
  return !!DEFAULT_APP_ID && String(appId || '').trim() === DEFAULT_APP_ID && String(guestId || '').trim() === DEFAULT_GUEST_ID;
}

export interface AppNameHintOptions {
  panel: LitePanelHandle;
  appInput: HTMLInputElement;
  guestInput?: HTMLInputElement | null;
  /** 1 欄に複数 ID（カンマ・空白区切り）を入力する欄。先頭から APP_NAME_HINT_MAX_IDS 件を確認する。 */
  multiple?: boolean;
  /** 表示・問い合わせを行う条件（例: 設定 JSON から読み込む間は確認しない）。省略時は常に行う。 */
  isActive?: () => boolean;
  /** 複数の欄で共有する確認キャッシュ。省略時は欄ごとに作る。 */
  cache?: AppLookupCache;
  /** 確認結果の表示が変わるたびに呼ぶ（確認画面の要約を更新するなど）。 */
  onChange?: () => void;
  /** 問い合わせ関数の差し替え（テスト用）。 */
  lookup?: (appId: string, guestId: string) => Promise<AppLookupResult>;
}

export interface AppNameHintHandle {
  /** 入力欄の行の直後に置く表示要素（`aria-live="polite"`）。確認対象がないときは hidden。 */
  element: HTMLElement;
  /** 先頭のアプリ ID の確認済み名称。未確認・失敗は空。 */
  name(): string;
  /** 確認済みの アプリID → 名称（複数 ID 欄用）。 */
  names(): Map<string, string>;
  /** いま入力されている ID と名前を「#123 顧客管理」形式で並べる（要約表示用）。未確認の ID は番号だけ。 */
  label(): string;
  /** 入力欄を直接書き換えた後に表示を更新する（input イベントを発火しない経路向け）。 */
  refresh(): void;
  /** 待機中の確認を止める。 */
  stop(): void;
}

/**
 * アプリ ID 欄（とゲストスペース ID 欄）の値を監視し、確認したアプリ名を表示する要素を返す。
 * 呼び出し側は `card.body.appendChild(hint.element)` のように入力行の直後へ置く。
 */
export function createAppNameHint(opts: AppNameHintOptions): AppNameHintHandle {
  const { panel, appInput, guestInput } = opts;
  const cache = opts.cache || createAppLookupCache();
  const lookup = opts.lookup;
  const isActive = opts.isActive || (() => true);
  const el = document.createElement('div');
  el.className = 'kus-lp__app-note';
  el.setAttribute('aria-live', 'polite');
  el.hidden = true;

  let key = '\u0000';
  let seq = 0;
  let timer: number | undefined;
  /** 直近の確認で失敗した ID があるか。同じ値では再確認されないため、change（確定）でもう一度確認する。 */
  let failed = false;
  const resolved = new Map<string, string>();
  let currentIds: string[] = [];
  let currentGuest = '';

  const paint = (text: string, tone: '' | 'ok' | 'warn' = '') => {
    el.textContent = text;
    el.hidden = !text;
    el.classList.toggle('kus-lp__app-note--ok', tone === 'ok');
    el.classList.toggle('kus-lp__app-note--warn', tone === 'warn');
    opts.onChange?.();
    // 確認画面の要約（アプリ名入り）を描き直すための通知。入力値は変わらないので再確認は求めない
    el.dispatchEvent(new Event('kus-lite-summary-change', { bubbles: true }));
  };

  const ids = (): string[] => (opts.multiple ? splitAppIdsForHint(appInput.value) : [appInput.value.trim()]).filter(Boolean);
  const guest = (): string => String(guestInput?.value || '').trim();

  const get = (appId: string, guestId: string): Promise<AppLookupResult> =>
    lookup ? lookup(appId, guestId).catch((): AppLookupResult => ({ ok: false, message: APP_NAME_HINT_FAILURE })) : cache.get(appId, guestId);
  const peek = (appId: string, guestId: string): AppLookupOk | undefined =>
    lookup ? undefined : cache.peek(appId, guestId);

  function render(results: Map<string, AppLookupResult | 'pending'>, guestId: string, omitted: number) {
    resolved.clear();
    let anyFailed = false;
    let anyPending = false;
    const parts: string[] = [];
    for (const id of currentIds) {
      const r = results.get(id);
      if (!r || r === 'pending') { anyPending = true; parts.push(opts.multiple ? `#${id} ${APP_NAME_HINT_PENDING}` : APP_NAME_HINT_PENDING); continue; }
      if (r.ok) {
        resolved.set(id, r.name);
        const current = isCurrentApp(id, guestId) ? ` · ${APP_NAME_HINT_CURRENT}` : '';
        parts.push(opts.multiple ? `#${id} ${r.name || `アプリ #${id}`}${current}` : `✓ ${formatAppLookupName(r)}${current}`);
      } else {
        anyFailed = true;
        parts.push(opts.multiple ? `#${id} 確認できません` : ('message' in r && r.message) || APP_NAME_HINT_FAILURE);
      }
    }
    failed = anyFailed;
    if (!currentIds.length) { paint(''); return; }
    let text = opts.multiple ? `${parts.join(' / ')}` : parts[0];
    if (opts.multiple && anyFailed) text += `\n${APP_NAME_HINT_FAILURE}`;
    if (omitted > 0) text += `\n他 ${omitted} 件は確認していません（先頭 ${APP_NAME_HINT_MAX_IDS} 件まで）`;
    paint(text, anyFailed ? 'warn' : anyPending ? '' : 'ok');
  }

  function refresh() {
    const guestId = guest();
    const all = ids();
    const active = isActive() && all.length > 0 && all.every((id) => isLookupableApp(id, guestId));
    const nextKey = active ? `${guestId}|${all.join(',')}` : '';
    if (nextKey === key) return;
    key = nextKey;
    seq += 1;
    window.clearTimeout(timer);
    resolved.clear();
    failed = false;
    if (!active) { currentIds = []; paint(''); return; }
    currentGuest = guestId;
    const omitted = Math.max(0, all.length - APP_NAME_HINT_MAX_IDS);
    currentIds = all.slice(0, APP_NAME_HINT_MAX_IDS);
    const results = new Map<string, AppLookupResult | 'pending'>();
    const missing: string[] = [];
    for (const id of currentIds) {
      const cached = peek(id, guestId);
      if (cached) results.set(id, cached); else { results.set(id, 'pending'); missing.push(id); }
    }
    render(results, guestId, omitted);
    if (!missing.length) return;
    const mine = seq;
    timer = window.setTimeout(async () => {
      // パネルを閉じた後に待機していた確認は行わない。
      if (!panel.root.isConnected) return;
      await Promise.all(missing.map(async (id) => {
        const result = await get(id, guestId);
        // 入力が変わった後に返ってきた古い応答は捨てる。
        if (mine !== seq || !panel.root.isConnected) return;
        results.set(id, result);
        render(results, guestId, omitted);
      }));
    }, APP_NAME_HINT_DELAY_MS);
  }

  /** 失敗していた確認を、欄の change（確定）でもう一度行う（権限やネットワークが回復した場合に備える）。 */
  function recheck() {
    if (!failed) return;
    key = '\u0000';
    refresh();
  }
  function stop() {
    seq += 1;
    window.clearTimeout(timer);
  }

  appInput.addEventListener('input', refresh);
  appInput.addEventListener('change', () => { refresh(); recheck(); });
  if (guestInput) {
    guestInput.addEventListener('input', refresh);
    guestInput.addEventListener('change', () => { refresh(); recheck(); });
  }
  panel.root.addEventListener('kus-lite-dispose', stop, { once: true });
  refresh();

  return {
    element: el,
    name: () => (currentIds.length ? resolved.get(currentIds[0]) || '' : ''),
    names: () => new Map(resolved),
    label: () => currentIds.map((id) => {
      const name = resolved.get(id);
      return name ? `#${id} ${name}` : `#${id}`;
    }).join('、') + (currentGuest ? `（ゲスト ${currentGuest}）` : ''),
    refresh,
    stop
  };
}

/** 直接問い合わせる（キャッシュなし）。表やヒント以外の用途向け。 */
export const lookupAppName = lookupReflectApp;
