import { describe, expect, it } from 'vitest';
import { computeDiffRows } from '../../src/diff/engine';
import { collectPartialComparisonIssues } from '../../src/tabs/diff-standalone';
import { PLUGIN_CONFIG_OMITTED_KIND, PLUGIN_CONFIG_OMITTED_MESSAGE } from '../../src/pluginConfigMarker';

// 設定一括取得で「プラグインの設定値を含めない」を選んだ設定JSONは、プラグインの一覧だけを持つ。
// 設定値を持つ側（API から取得した側）と比べたときに、設定値の有無を「設定の追加・削除」と示してはならない。
const omitted = (plugins: any[]) => ({
  plugins,
  _partial: { kind: PLUGIN_CONFIG_OMITTED_KIND, message: PLUGIN_CONFIG_OMITTED_MESSAGE, omittedPlugins: plugins.length }
});
const plugin = (id: string, extra: Record<string, unknown> = {}) => ({ id, name: `プラグイン ${id}`, enabled: true, ...extra });
const actual = (rows: any[]) => rows.filter((row) => row.type !== 'same' && !row._displayOnly);
const run = (source: any, target: any) => computeDiffRows({ sections: { pluginSettings: source } }, { sections: { pluginSettings: target } }, ['pluginSettings'], '', {});

describe('diff/engine プラグインの設定値を含めない設定JSON', () => {
  it('片側だけに設定値があっても、設定値と目印（_partial）を差分にしない', () => {
    const source = omitted([plugin('p1'), plugin('p2')]);
    const target = { plugins: [plugin('p1', { _config: { apiKey: 'secret-1' } }), plugin('p2', { _config: { mode: 'a' } })] };
    expect(actual(run(source, target).rows)).toEqual([]);
    expect(actual(run(target, source).rows)).toEqual([]);
  });

  it('プラグインの一覧の違い（追加・有効状態）は、従来どおり差分にする', () => {
    const source = omitted([plugin('p1'), plugin('p2', { enabled: false })]);
    const target = { plugins: [plugin('p1', { _config: { apiKey: 'secret-1' } }), plugin('p2', { _config: {} }), plugin('p3', { _config: { x: 1 } })] };
    const rows = actual(run(source, target).rows);
    expect(rows.some((row) => row.type === 'added' && JSON.stringify(row.right).includes('p3'))).toBe(true);
    expect(rows.some((row) => /enabled$/.test(String(row.path)) && row.type === 'changed')).toBe(true);
    // 設定値そのものは、どの行の値にも出さない（比べていないため）
    expect(JSON.stringify(rows)).not.toContain('secret-1');
    expect(rows.some((row) => /config/.test(String(row.path)))).toBe(false);
  });

  it('設定値を比べていないことは、一部未検証として示す', () => {
    const source = { sections: { pluginSettings: omitted([plugin('p1')]) } };
    const target = { sections: { pluginSettings: { plugins: [plugin('p1', { _config: { apiKey: 'secret-1' } })] } } };
    const issues = collectPartialComparisonIssues(source, target);
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({ sectionKey: 'pluginSettings', side: 'source', message: PLUGIN_CONFIG_OMITTED_MESSAGE });
  });

  it('両側とも設定値を持つ通常の比較は変わらない（設定値の違いを差分にする）', () => {
    const source = { plugins: [plugin('p1', { _config: { apiKey: 'a' } })] };
    const target = { plugins: [plugin('p1', { _config: { apiKey: 'b' } })] };
    const rows = actual(run(source, target).rows);
    expect(rows).toHaveLength(1);
    expect(String(rows[0].path)).toMatch(/config\.apiKey$/);
  });
});
