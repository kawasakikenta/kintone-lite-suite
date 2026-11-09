'use strict';

/**
 * 1対多・ペア一括の結果を、保存（HTML・Excel・Markdown）のためにメモリへ保持するときの整理。
 *
 * 取得したバンドルには、比較の前処理だけが使う作業用の値が付いている。
 *   - JS/CSS ファイルの本文（`_bodyText`）とそのハッシュ（`_bodyHash`）。1 ファイルで数百 KB になりうる。
 *   - プラグイン設定の取得結果（`_config`）。
 * これらは比較が終わった時点で役目を終えている（差分行には本文の差分が入っており、HTML 出力は
 * もともとこれらを落としてから設定を収録する。Excel・Markdown は読まない）。
 * 比較先が数百〜数千件になると、これらが結果の保持量の大半を占めるため、保持する前に取り除く。
 *
 * 取り除くのは作業用の値だけで、設定の内容（収録対象のセクション）・取得状況（`_partial`・`_bodyUnavailable`）・
 * 差分行は変えない。引数のバンドルをその場で書き換えて返す。
 */
export function stripComparisonScratchForRetention<T>(bundle: T): T {
  const sections = (bundle as any)?.sections;
  if (!sections || typeof sections !== 'object') return bundle;
  const customize = sections.customizeSettings;
  if (customize && typeof customize === 'object') {
    for (const platform of ['desktop', 'mobile']) {
      for (const kind of ['js', 'css']) {
        const items = customize?.[platform]?.[kind];
        if (!Array.isArray(items)) continue;
        for (const item of items) {
          if (!item || typeof item !== 'object') continue;
          delete item._bodyText;
          delete item._bodyHash;
        }
      }
    }
  }
  const plugins = sections.pluginSettings?.plugins;
  if (Array.isArray(plugins)) {
    for (const plugin of plugins) {
      if (plugin && typeof plugin === 'object') delete plugin._config;
    }
  }
  return bundle;
}
