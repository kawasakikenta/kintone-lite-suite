'use strict';

/**
 * 設定一括取得で「プラグインの設定値を含めない」を選んだときの目印。
 *
 * 設定JSONを読み込む側（差分比較・プレビュー反映・設計書）が、設定値が無いことを「取得失敗」や「設定の削除」と取り違えないよう、
 * プラグインのセクションに `_partial`（種類 `pluginConfigOmitted`）を付ける。プラグインの一覧（ID・名前・有効状態）はそのまま残る。
 */
export const PLUGIN_CONFIG_OMITTED_KIND = 'pluginConfigOmitted';
export const PLUGIN_CONFIG_OMITTED_MESSAGE = 'プラグインの設定値は含めずに保存しています（プラグインの一覧だけです）';

export function isPluginConfigOmittedMarker(partial: any): boolean {
  return !!partial && typeof partial === 'object' && partial.kind === PLUGIN_CONFIG_OMITTED_KIND;
}

/**
 * 取得済みのバンドルに、設定値を含めないことを記録する。取得に失敗したセクションと、プラグインが 1 件も無いセクションには付けない。
 * @returns 設定値を含めなかったプラグインの数
 */
export function markPluginConfigOmitted(bundle: any): number {
  const section = bundle?.sections?.pluginSettings;
  if (!section || typeof section !== 'object' || section._fetchError || !Array.isArray(section.plugins) || !section.plugins.length) return 0;
  section._partial = { kind: PLUGIN_CONFIG_OMITTED_KIND, message: PLUGIN_CONFIG_OMITTED_MESSAGE, omittedPlugins: section.plugins.length };
  return section.plugins.length;
}
