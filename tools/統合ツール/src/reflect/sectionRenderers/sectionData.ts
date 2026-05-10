'use strict';

// セクション JSON ↔ 表示用ペイロードの共通変換ユーティリティ。
// reflect-section-preview.ts と sectionRenderers/* の両方から使えるように
// UI 非依存・副作用なしで切り出した。

/** セクションデータの主キー wrapper プロパティ */
export const SECTION_WRAPPER_MAP: Record<string, string> = {
  viewSettings: 'views',
  reportSettings: 'reports',
  actionSettings: 'actions',
  categories: 'categories',
  layoutSettings: 'layout',
  pluginSettings: 'plugins',
  appAcl: 'rights',
  fieldAcl: 'rights',
  recordPermissions: 'rights',
  notifications: 'notifications',
  perRecordNotifications: 'notifications',
  reminderNotifications: 'notifications'
};

/** map 型セクション（キー = 名前）のキー一覧 */
export const SECTION_MAP_KEYS: ReadonlySet<string> = new Set([
  'viewSettings', 'reportSettings', 'actionSettings', 'categories'
]);

export function isMapSectionKey(key: string): boolean {
  return SECTION_MAP_KEYS.has(key);
}

export function unwrapSectionData(data: any, sectionKey: string): any {
  const w = SECTION_WRAPPER_MAP[sectionKey];
  if (w && data && typeof data === 'object' && Object.prototype.hasOwnProperty.call(data, w)) return data[w];
  return data;
}

export function rewrapSectionData(items: any, sectionKey: string): any {
  const w = SECTION_WRAPPER_MAP[sectionKey];
  if (w) return { [w]: items };
  return items;
}
