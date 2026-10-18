/**
 * アプリIDとアプリURLの読み取り（DOM 非依存）。差分比較など他の lite ツールからも使うため、
 * 反映エンジンに依存しない小さなモジュールに分けている。
 */

import { extractAppIdFromInput, extractGuestIdFromInput } from '../handlers/diffFocus.js';

export interface AppReference { appId: string; guestId: string }

/**
 * 入力欄に貼り付けられた文字列からアプリIDとゲストスペースIDを読み取る。
 * 数字だけならそのまま、kintone の URL（/k/123/、/k/guest/5/123/、?app=123）なら抽出する。
 * 読み取れない場合は null。
 */
export function parseAppReference(text: string): AppReference | null {
  const raw = String(text || '').trim();
  if (!raw) return null;
  if (/^[1-9]\d*$/.test(raw)) return { appId: raw, guestId: '' };
  const appId = extractAppIdFromInput(raw);
  if (!/^[1-9]\d*$/.test(appId)) return null;
  return { appId, guestId: extractGuestIdFromInput(raw) };
}

/** 開いている kintone 画面のパスからゲストスペースIDを読み取る（通常スペースなら空文字）。 */
export function guestIdFromPagePath(pathname: string): string {
  return extractGuestIdFromInput(String(pathname || ''));
}

/** 入力値が数字だけではなく、URL などから読み取りが必要かどうか。 */
export function needsAppReferenceParse(text: string): boolean {
  const raw = String(text || '').trim();
  return !!raw && !/^\d+$/.test(raw);
}
