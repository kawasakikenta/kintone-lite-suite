'use strict';

/**
 * 設計書（Markdown・AI向けMarkdown）に載せない、機微な値を含み得る補助情報の除去。
 *
 * 設定一括取得の JSON には、差分比較のためにプラグインの設定値（`plugins[]._config`。API キーなどを含み得る）と
 * JS/CSS ファイルの本文（`_bodyText` / `_bodyHash`。API トークンなどが書かれている場合がある）が入る。
 * 設計書は人や AI に渡す資料なので、これらを原文 JSON としても出力しない（API から直接取得した設計書にも入らない）。
 */
export interface StripSensitiveResult {
  /** 除去後の設定バンドル。除去するものが無ければ入力と同じ参照を返す（入力は変更しない）。 */
  bundle: any;
  /** 設定値を除いたプラグインの数 */
  pluginConfigs: number;
  /** 本文（と内容ハッシュ）を除いた JS/CSS ファイルの数 */
  customizeBodies: number;
}

const isObject = (value: any): boolean => value !== null && typeof value === 'object' && !Array.isArray(value);
const hasOwn = (value: any, key: string): boolean => Object.prototype.hasOwnProperty.call(value, key);

export function stripSensitiveSupplements(bundle: any): StripSensitiveResult {
  const sections = bundle?.sections;
  if (!isObject(sections)) return { bundle, pluginConfigs: 0, customizeBodies: 0 };
  let pluginConfigs = 0;
  let customizeBodies = 0;
  let nextSections: Record<string, any> | null = null;

  const plugin = sections.pluginSettings;
  if (isObject(plugin) && Array.isArray(plugin.plugins) && plugin.plugins.some((item: any) => isObject(item) && hasOwn(item, '_config'))) {
    const plugins = plugin.plugins.map((item: any) => {
      if (!isObject(item) || !hasOwn(item, '_config')) return item;
      pluginConfigs += 1;
      const { _config: _omitted, ...rest } = item;
      return rest;
    });
    nextSections = { ...sections, pluginSettings: { ...plugin, plugins } };
  }

  const customize = sections.customizeSettings;
  if (isObject(customize)) {
    let changed = false;
    const next: Record<string, any> = { ...customize };
    for (const platform of ['desktop', 'mobile']) {
      const area = customize[platform];
      if (!isObject(area)) continue;
      const nextArea: Record<string, any> = { ...area };
      for (const kind of ['js', 'css']) {
        const list = area[kind];
        if (!Array.isArray(list) || !list.some((item: any) => isObject(item) && (hasOwn(item, '_bodyText') || hasOwn(item, '_bodyHash')))) continue;
        nextArea[kind] = list.map((item: any) => {
          if (!isObject(item) || !(hasOwn(item, '_bodyText') || hasOwn(item, '_bodyHash'))) return item;
          customizeBodies += 1;
          const { _bodyText: _text, _bodyHash: _hash, ...rest } = item;
          return rest;
        });
        changed = true;
      }
      next[platform] = nextArea;
    }
    if (changed) nextSections = { ...(nextSections || sections), customizeSettings: next };
  }

  if (!nextSections) return { bundle, pluginConfigs: 0, customizeBodies: 0 };
  return { bundle: { ...bundle, sections: nextSections }, pluginConfigs, customizeBodies };
}
