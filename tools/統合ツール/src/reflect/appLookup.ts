'use strict';

// =============================================================================
// プレビュー反映 lite: 入力中のアプリID確認（アプリ名の表示用）。
// 差分取得時の厳密な確認（resolveReflectAppsStandalone）の代わりではなく、入力ミスに早く気づくための補助。
// この確認の結果で操作をブロックしない。
// =============================================================================

import { apiGet, buildApiPrefix } from '../api.js';

export type ReflectAppLookupOk = { ok: true; appId: string; name: string; code: string };
export type ReflectAppLookupResult = ReflectAppLookupOk | { ok: false; message: string };

export const REFLECT_APP_LOOKUP_FAILURE = 'アプリを確認できません。ID・ゲストスペース・閲覧権限を確認してください。';

const POSITIVE_INTEGER = /^[1-9]\d*$/;

/** アプリIDとして問い合わせ可能な形（正の整数）か。ゲストスペースIDは空、または正の整数。 */
export function isLookupableReflectApp(appId: string, guestId: string): boolean {
  const id = String(appId || '').trim();
  const guest = String(guestId || '').trim();
  return POSITIVE_INTEGER.test(id) && (!guest || POSITIVE_INTEGER.test(guest));
}

/**
 * 本番側のアプリ情報（/app.json）を取得して、アプリ名とコードを返す。
 * 応答のアプリIDが入力と一致しない場合・例外は ok:false にする。
 */
export async function lookupReflectApp(appId: string, guestId: string): Promise<ReflectAppLookupResult> {
  const id = String(appId || '').trim();
  const guest = String(guestId || '').trim();
  const failure: ReflectAppLookupResult = { ok: false, message: REFLECT_APP_LOOKUP_FAILURE };
  if (!isLookupableReflectApp(id, guest)) return failure;
  try {
    const response = await apiGet(buildApiPrefix(guest, false), '/app.json', { id }, { retries: 1 });
    if (String(response?.appId ?? '') !== id) return failure;
    return { ok: true, appId: id, name: String(response?.name ?? ''), code: String(response?.code ?? '') };
  } catch {
    return failure;
  }
}

export interface ReflectAppLookupCache {
  /** 同じ (ゲストスペースID, アプリID) の問い合わせは 1 回にまとめ、成功した結果は保持する。失敗は保持しない（権限やネットワークの回復後に再確認できるように）。 */
  get(appId: string, guestId: string): Promise<ReflectAppLookupResult>;
  /** 成功済みの結果があれば返す（待たずに表示するため）。 */
  peek(appId: string, guestId: string): ReflectAppLookupOk | undefined;
}

export function createReflectAppLookupCache(
  lookup: (appId: string, guestId: string) => Promise<ReflectAppLookupResult> = lookupReflectApp
): ReflectAppLookupCache {
  const done = new Map<string, ReflectAppLookupOk>();
  const pending = new Map<string, Promise<ReflectAppLookupResult>>();
  const keyOf = (appId: string, guestId: string) => `${String(guestId || '').trim()}|${String(appId || '').trim()}`;
  return {
    peek(appId, guestId) {
      return done.get(keyOf(appId, guestId));
    },
    get(appId, guestId) {
      const key = keyOf(appId, guestId);
      const cached = done.get(key);
      if (cached) return Promise.resolve(cached);
      const inFlight = pending.get(key);
      if (inFlight) return inFlight;
      const request = lookup(String(appId || '').trim(), String(guestId || '').trim())
        .catch((): ReflectAppLookupResult => ({ ok: false, message: REFLECT_APP_LOOKUP_FAILURE }))
        .then((result) => {
          pending.delete(key);
          if (result.ok) done.set(key, result);
          return result;
        });
      pending.set(key, request);
      return request;
    }
  };
}

/** 「営業テンプレート（コード: sales）」形式。名前が空ならアプリIDで代替する。 */
export function formatReflectAppName(info: { appId: string; name: string; code?: string }): string {
  const name = info.name || `アプリ #${info.appId}`;
  return info.code ? `${name}（コード: ${info.code}）` : name;
}
