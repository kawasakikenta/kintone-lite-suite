'use strict';

import { REFLECT_SECTION_KEYS, reflectSectionLabel } from '../reflect/sections.js';

/**
 * 本番とプレビューで比べる項目。プレビュー反映でバックアップから戻せる項目すべてと同じにする
 * （バックアップを「設定JSONから取得」で読み込めば、同じ項目をプレビューへ戻せる）。
 */
export const DEPLOY_COMPARE_SECTION_KEYS: readonly string[] = REFLECT_SECTION_KEYS;

/** 利用者向けの項目名（プレビュー反映と同じ）。 */
export function deploySectionLabel(key: string): string {
  return reflectSectionLabel(key);
}
