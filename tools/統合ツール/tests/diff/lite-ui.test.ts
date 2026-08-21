import { describe, expect, it } from 'vitest';
import {
  buildLiteDiffHtmlContext,
  buildLiteDiffFilterDescription,
  buildLiteDiffRowKey,
  buildLiteDiffXlsxContext,
  getLiteHtmlExportContentLabel,
  isIncompleteLiteDiff,
  renderLiteDiffOverviewHtml,
  renderRowsHtml,
  rowMatchesFilters,
  summarizeLiteIgnoreRules,
  summarizeLiteDiffRows
} from '../../src/entries/diff-lite-ui';

function cache(rows: any[], overrides: Record<string, any> = {}) {
  return {
    rows,
    fetchIssues: [],
    sourceBundle: {
      appId: '10', guestId: '', preview: false,
      fetchedAt: '2026-08-16T00:00:00.000Z',
      meta: { appName: '受注管理' }, sections: {}
    },
    targetBundle: {
      appId: '20', guestId: '3', preview: true,
      fetchedAt: '2026-08-16T00:15:00.000Z',
      meta: { appName: '受注管理（改修版）' }, sections: {}
    },
    scopes: ['appAcl'],
    ignoreKeys: '',
    normalizationPresetState: {},
    truncation: null,
    ...overrides
  } as any;
}

describe('diff lite result presentation', () => {
  it('maps the current result and selected rows to the Excel export context', () => {
    const full = cache([
      { sectionKey: 'appAcl', section: 'アプリ権限', path: 'appAcl.rights[0]', type: 'added', right: {} },
      { sectionKey: 'viewSettings', section: 'ビュー', path: 'viewSettings.views.old', type: 'removed', left: {} }
    ], {
      partialIssues: [{ sectionKey: 'customizeSettings', side: 'source' }],
      truncation: { truncated: true, diffLimit: 1000 },
      normalizationPresetState: { viewOrder: true },
      comparedAt: '2026-08-16T00:30:00.000Z'
    });
    const selected = [full.rows[1]];
    const ctx = buildLiteDiffXlsxContext(
      full,
      selected,
      'filtered',
      '表示中（フィルタ適用後）',
      '画面の絞り込み: ビュー設定 / 削除'
    );

    expect(ctx.audience).toBe('customer');
    expect(ctx.rows).toEqual(selected);
    expect(ctx.sourceBundle?.appId).toBe('10');
    expect(ctx.targetBundle?.appId).toBe('20');
    expect(ctx.partialIssues).toHaveLength(1);
    expect(ctx.truncation).toEqual({ truncated: true, diffLimit: 1000 });
    expect(ctx.scopes).toEqual(['appAcl']);
    expect(ctx.normalizationPresetState).toEqual({ viewOrder: true });
    expect(ctx.comparedAt).toBe('2026-08-16T00:30:00.000Z');
    expect(ctx.exportMode).toBe('filtered');
    expect(ctx.exportLabel).toBe('表示中（フィルタ適用後）');
    expect(ctx.filterDescription).toBe('画面の絞り込み: ビュー設定 / 削除');
    expect(ctx.exportContentMode).toBe('diffOnly');
  });

  it('does not substitute a bundle fetch time for an unrecorded comparison time', () => {
    const current = cache([]);
    const ctx = buildLiteDiffXlsxContext(current, [], 'all', '全件');

    expect(ctx.comparedAt).toBeUndefined();
    expect(ctx.sourceBundle?.fetchedAt).toBe('2026-08-16T00:00:00.000Z');
    expect(ctx.targetBundle?.fetchedAt).toBe('2026-08-16T00:15:00.000Z');
    expect(ctx.filterDescription).toBe('フィルターなし（比較結果の全件）');
  });

  it('keeps the full raw keyword in the Excel filter evidence while labels remain readable', () => {
    const keyword = '顧客名に含まれる非常に長い検索語を省略せず証跡へ残すための文字列1234567890';
    const description = buildLiteDiffFilterDescription({
      section: 'fieldSettings',
      sectionLabel: 'フィールド設定',
      type: 'changed',
      typeLabel: '変更｜内容が異なる',
      keyword
    });

    expect(description).toBe(
      `画面の絞り込み: セクション: フィールド設定 [fieldSettings] / 変更種別: 変更｜内容が異なる [changed] / 検索: ${keyword}`
    );
    expect(description).not.toContain('…');
  });

  it('defaults standalone HTML context to safe diff-only and preserves an explicit compared-content choice', () => {
    const current = cache([{ sectionKey: 'appAcl', type: 'changed', path: 'appAcl.rights[0]' }]);
    const safe = buildLiteDiffHtmlContext(current, current.rows, 'all', '全差分');
    const detailed = buildLiteDiffHtmlContext(current, current.rows, 'filtered', '表示中', 'withCompared');

    expect(safe.exportContentMode).toBe('diffOnly');
    expect(safe.exportContentLabel).toBe('差分行のみ（安全共有向け）');
    expect(detailed.exportContentMode).toBe('withCompared');
    expect(detailed.exportContentLabel).toBe('比較設定込み（フィールド詳細・反映JSON）');
    expect(getLiteHtmlExportContentLabel('unexpected')).toBe('差分行のみ（安全共有向け）');
  });

  it('keeps fetch failures and truncation in a warning state after export', () => {
    expect(isIncompleteLiteDiff({ fetchIssues: [{ sectionKey: 'pluginSettings' }], truncation: null })).toBe(true);
    expect(isIncompleteLiteDiff({ fetchIssues: [], partialIssues: [{ sectionKey: 'customizeSettings' }], truncation: null })).toBe(true);
    expect(isIncompleteLiteDiff({ fetchIssues: [], truncation: { truncated: true } })).toBe(true);
    expect(isIncompleteLiteDiff({ fetchIssues: [], truncation: null })).toBe(false);
  });

  it('counts actual changes and moved rows without counting same rows as diffs', () => {
    expect(summarizeLiteDiffRows([
      { type: 'added' },
      { type: 'removed' },
      { type: 'changed' },
      { type: 'changed', moved: true },
      { type: 'same' },
      { type: 'changed', _displayOnly: true }
    ] as any)).toEqual({
      total: 6,
      actual: 4,
      added: 1,
      removed: 1,
      changed: 2,
      moved: 1,
      same: 1,
      displayOnly: 1
    });
  });

  it('shows a pure move separately from content changes and keeps type filters exclusive', () => {
    const movedRow = {
      sectionKey: 'layoutSettings',
      section: 'レイアウト',
      path: 'layoutSettings.layout[0].fields[0]',
      type: 'changed',
      moved: true,
      left: { code: 'customer', index: 0 },
      right: { code: 'customer', index: 1 }
    } as any;
    const overview = renderLiteDiffOverviewHtml(cache([movedRow]));
    const rows = renderRowsHtml([movedRow], false, '1件');

    expect(summarizeLiteDiffRows([movedRow])).toMatchObject({ actual: 1, changed: 1, moved: 1 });
    expect(overview).toContain('内容変更 0 / 移動 1');
    expect(overview).toContain('aria-label="内容が異なる 0件を表示" disabled');
    expect(overview).toContain('aria-label="並び順 1件を表示"');
    expect(rows).not.toContain('kus-dl-section__stat--changed');
    expect(rows).toContain('kus-dl-section__stat--moved">移動 1</span>');
    expect(rowMatchesFilters(movedRow, { section: '', type: 'changed', keyword: '' })).toBe(false);
    expect(rowMatchesFilters(movedRow, { section: '', type: 'moved', keyword: '' })).toBe(true);
  });

  it('makes comparison direction, app identity, and added/removed meaning explicit', () => {
    const html = renderLiteDiffOverviewHtml(cache([
      { sectionKey: 'appAcl', section: 'アプリ権限', path: 'appAcl.rights[0]', type: 'added', right: {} },
      { sectionKey: 'appAcl', section: 'アプリ権限', path: 'appAcl.rights[1]', type: 'removed', left: {} }
    ]));

    expect(html).toContain('受注管理（App 10）');
    expect(html).toContain('受注管理（改修版）（App 20）');
    expect(html).toContain('比較元');
    expect(html).toContain('比較先');
    expect(html).toContain('比較先のみ');
    expect(html).toContain('比較元のみ');
    expect(html).toContain('通常スペース');
    expect(html).toContain('ゲスト 3');
    expect(html).toContain('プレビュー');
    expect(html).toContain('data-kus-dl-completeness="complete"');
    expect(html.indexOf('data-kus-dl-completeness')).toBeLessThan(html.indexOf('kus-dl-metrics'));
  });

  it('does not present a truncated or partially fetched result as complete', () => {
    const html = renderLiteDiffOverviewHtml(cache([], {
      fetchIssues: [{ sectionKey: 'pluginSettings', section: 'プラグイン' }],
      truncation: { truncated: true, diffLimit: 1000, sections: [{ sectionKey: 'fieldSettings', section: 'フィールド' }] }
    }));

    expect(html).toContain('比較結果は不完全です');
    expect(html).toContain('差分なしとは判断できません');
    expect(html).toContain('差分上限 1,000 件');
    expect(html).toContain('設定の取得に 1 件失敗');
    expect(html).toContain('data-kus-dl-completeness="incomplete"');
    expect(html.match(/role="alert"/g)).toHaveLength(2);
  });

  it('does not recreate live-region alerts during keyboard navigation rerenders', () => {
    const result = cache([], {
      fetchIssues: [{ sectionKey: 'pluginSettings', section: 'プラグイン' }]
    });
    const initialHtml = renderLiteDiffOverviewHtml(result);
    const navigationHtml = renderLiteDiffOverviewHtml(result, { announce: false });
    expect(initialHtml).toContain('role="status"');
    expect(initialHtml).toContain('role="alert"');
    expect(navigationHtml).not.toContain('role="status"');
    expect(navigationHtml).not.toContain('role="alert"');
    expect(navigationHtml).toContain('比較結果は不完全です');
  });

  it('does not call a state-rename notice "no differences"', () => {
    const html = renderLiteDiffOverviewHtml(cache([{
      sectionKey: 'processSettings',
      section: 'プロセス管理',
      path: 'processSettings.states.__rename__',
      type: 'changed',
      left: { name: '未処理' },
      right: { name: '受付' },
      _displayOnly: true,
      _stateRenameNotice: true
    }]));

    expect(html).toContain('状態名の変更候補が 1 件');
    expect(html).not.toContain('差分はありません');
    expect(html).toContain('削除・追加としては数えていません');
  });

  it('states that visible results are after ignore rules were applied', () => {
    const html = renderLiteDiffOverviewHtml(cache([], { ignoreKeys: 'revision, viewSettings.views.営業 一覧.filterCond' }));
    expect(html).toContain('無視ルール 2件を適用した後の結果');
    expect(html).toContain('ルールに一致した設定差分は一覧に含まれません');
    expect(html).toContain('完全パス/パターン 1件');
  });

  it('renders semantic Japanese labels and clearly labeled before/after values', () => {
    const html = renderRowsHtml([{
      sectionKey: 'appAcl',
      section: 'アプリ権限',
      path: 'appAcl.rights[0].recordViewable',
      type: 'changed',
      left: true,
      right: false
    }] as any, false, '1 / 1件を表示');

    expect(html).toContain('閲覧');
    expect(html).toContain('許可');
    expect(html).toContain('不許可');
    expect(html).toContain('aria-label="比較元の値"');
    expect(html).toContain('aria-label="比較先の値"');
    expect(html).toContain('appAcl.rights[0].recordViewable');
  });

  it('states which side is missing for additions and removals', () => {
    const added = renderRowsHtml([{
      sectionKey: 'viewSettings', section: 'ビュー', path: 'viewSettings.views.new', type: 'added', right: { name: '新一覧' }
    }] as any, false, '');
    const removed = renderRowsHtml([{
      sectionKey: 'viewSettings', section: 'ビュー', path: 'viewSettings.views.old', type: 'removed', left: { name: '旧一覧' }
    }] as any, false, '');

    expect(added).toContain('比較先にのみ存在');
    expect(added).toContain('比較元にはありません');
    expect(added).toContain('<span class="kus-dl-badge__type">追加</span>');
    expect(added).toContain('<span class="kus-dl-badge__fact">比較先にのみ存在</span>');
    expect(removed).toContain('比較元にのみ存在');
    expect(removed).toContain('比較先にはありません');
    expect(removed).toContain('<span class="kus-dl-badge__type">削除</span>');
    expect(removed).toContain('<span class="kus-dl-badge__fact">比較元にのみ存在</span>');
  });

  it('shows both visible and total section counts when rows are paged', () => {
    const allRows = Array.from({ length: 250 }, (_, index) => ({
      sectionKey: 'appAcl',
      section: 'アプリ権限',
      path: `appAcl.rights[${index}].recordViewable`,
      type: 'changed',
      left: true,
      right: false
    }));

    const html = renderRowsHtml(allRows.slice(0, 200) as any, false, '200 / 250件を表示', allRows as any);
    expect(html).toContain('200 / 250件表示');
    expect(html).toContain('変更 250');
  });

  it('prioritizes a human-readable item name and keeps the raw path in collapsed technical details', () => {
    const html = renderRowsHtml([{
      sectionKey: 'customSettings', section: 'カスタム設定', path: 'customSettings.deep.internal.value',
      type: 'changed', reasonSummary: '配色テーマの変更', left: 'light', right: 'dark'
    }] as any, false, '1件');

    expect(html).toContain('<span class="kus-dl-row__title">配色テーマの変更</span>');
    expect(html).toContain('<details class="kus-dl-row__technical" data-kus-dl-technical><summary>技術情報</summary>');
    expect(html).toContain('<span>内部パス</span>customSettings.deep.internal.value');
    expect(html.indexOf('配色テーマの変更')).toBeLessThan(html.indexOf('customSettings.deep.internal.value'));
  });

  it('clips long values with an explicit accessible expansion control and preserves expanded state', () => {
    const longJson = JSON.stringify({
      fields: Array.from({ length: 12 }, (_, index) => ({ code: `field_${index}`, required: index % 2 === 0 }))
    }, null, 2);
    const row = {
      sectionKey: 'pluginSettings', section: 'プラグイン', path: 'pluginSettings.plugins.sample.config',
      type: 'changed', left: longJson, right: `${longJson}\nchanged`
    } as any;
    const rowKey = buildLiteDiffRowKey(row);
    const collapsed = renderRowsHtml([row], false, '', [row]);
    const expanded = renderRowsHtml([row], false, '', [row], { expandedValueKeys: new Set([`${rowKey}:before`]) });

    expect(collapsed).toContain(`data-kus-dl-value-toggle="${rowKey}:before"`);
    expect(collapsed).toContain('aria-expanded="false"');
    expect(collapsed).toContain('全文を展開');
    expect(collapsed).toMatch(/\d+行 · \d+文字/);
    expect(expanded).toContain(`data-kus-dl-value-key="${rowKey}:before"`);
    expect(expanded).toContain('class="kus-dl-value is-expanded"');
    expect(expanded).toContain('aria-expanded="true"');
    expect(expanded).toContain('プレビューに戻す');
  });

  it('does not add an expansion control to short values', () => {
    const html = renderRowsHtml([{
      sectionKey: 'appSettings', section: 'アプリ設定', path: 'appSettings.name',
      type: 'changed', left: '旧名称', right: '新名称'
    }] as any, false, '');
    expect(html).not.toContain('data-kus-dl-value-toggle');
  });

  it('builds stable navigation keys from semantic row identity', () => {
    const row = {
      sectionKey: 'fieldSettings', type: 'changed', path: 'fieldSettings.properties.code.label',
      arrayKey: 'code', arrayKeyValue: { code: 'customer' }
    };
    expect(buildLiteDiffRowKey(row)).toBe(buildLiteDiffRowKey({ ...row }));
    expect(buildLiteDiffRowKey(row)).not.toBe(buildLiteDiffRowKey({ ...row, path: `${row.path}.other` }));
    expect(buildLiteDiffRowKey(row)).not.toBe(buildLiteDiffRowKey({ ...row, type: 'removed' }));
  });

  it('filters rows only by factual section, type, and keyword, not internal severity', () => {
    const row = {
      sectionKey: 'appAcl', section: 'アプリ権限', path: 'appAcl.rights[0].recordViewable',
      type: 'changed', severity: 'high', left: true, right: false
    } as any;
    expect(rowMatchesFilters(row, { section: 'appAcl', type: 'changed', keyword: 'recordviewable' })).toBe(true);
    expect(rowMatchesFilters({ ...row, severity: 'low' }, { section: 'appAcl', type: 'changed', keyword: '' })).toBe(true);
    expect(rowMatchesFilters(row, { section: 'viewSettings', type: 'changed', keyword: '' })).toBe(false);
  });

  it('distinguishes broad ignore keys from contextual path and wildcard rules', () => {
    expect(summarizeLiteIgnoreRules('revision, fieldSettings.properties.code.label\n*.description, pluginSettings, appAcl.rights[3].appEditable, REVISION')).toEqual({
      total: 5,
      pathRules: 4,
      wildcardRules: 1,
      positionalRules: 1,
      contextualRules: 4
    });
  });

  it('counts encoded literal paths without treating literal stars as wildcards', () => {
    expect(summarizeLiteIgnoreRules('path:viewSettings.views.Sales*View%2C%20East.filterCond')).toEqual({
      total: 1,
      pathRules: 1,
      wildcardRules: 0,
      positionalRules: 0,
      contextualRules: 1
    });
  });

  it('renders focusable stable rows, mobile side labels, collapse state, and an exact-path ignore action', () => {
    const row = {
      sectionKey: 'fieldSettings', section: 'フィールド', path: 'fieldSettings.properties.customer.label',
      type: 'changed', left: '顧客名', right: '取引先名'
    } as any;
    const rowKey = buildLiteDiffRowKey(row);
    const openHtml = renderRowsHtml([row], false, '', [row], { currentRowKey: rowKey });
    const closedHtml = renderRowsHtml([row], false, '', [row], { collapsedSections: new Set(['fieldSettings']) });

    expect(openHtml).toContain(`data-kus-dl-row-key="${rowKey}"`);
    expect(openHtml).not.toContain('data-severity');
    expect(openHtml).not.toContain('影響');
    expect(openHtml).toContain('<span class="kus-dl-badge__type">変更</span>');
    expect(openHtml).toContain('<span class="kus-dl-badge__fact">内容が異なる</span>');
    expect(openHtml).toContain('tabindex="-1"');
    expect(openHtml).toContain('aria-current="true"');
    expect(openHtml).toContain('data-kus-dl-ignore-path="fieldSettings.properties.customer.label"');
    expect(openHtml).toContain('data-side-label="比較元の値"');
    expect(openHtml).toContain('data-side-label="比較先の値"');
    expect(openHtml).toContain('data-kus-dl-section-key="fieldSettings" open');
    expect(closedHtml).not.toContain('data-kus-dl-section-key="fieldSettings" open');
  });

  it('offers literal exact-path ignore for wildcard and delimiter characters', () => {
    const html = renderRowsHtml([{
      sectionKey: 'viewSettings', section: 'ビュー', path: 'viewSettings.views.Sales*View, East.filterCond',
      type: 'changed', left: 'a = 1', right: 'a = 2'
    }] as any, false, '');
    expect(html).toContain('data-kus-dl-ignore-path="viewSettings.views.Sales*View, East.filterCond"');
    expect(html).not.toContain('区切り記号を含むパス（自動無視不可）');
  });

  it('does not offer automatic ignore for an array-index-dependent path', () => {
    const html = renderRowsHtml([{
      sectionKey: 'appAcl', section: 'アプリ権限', path: 'appAcl.rights[3].appEditable',
      type: 'changed', left: true, right: false
    }] as any, false, '');
    expect(html).toContain('並び順に依存（自動除外不可）');
    expect(html).not.toContain('data-kus-dl-ignore-path');
  });

  it('offers a literal automatic ignore when an entity path contains a rule delimiter', () => {
    const html = renderRowsHtml([{
      sectionKey: 'viewSettings', section: 'ビュー', path: 'viewSettings.views.営業,管理.filterCond',
      type: 'changed', left: 'a = 1', right: 'a = 2'
    }] as any, false, '');
    expect(html).not.toContain('区切り記号を含むパス（自動無視不可）');
    expect(html).toContain('data-kus-dl-ignore-path="viewSettings.views.営業,管理.filterCond"');
  });

  it('marks unscanned truncation sections as count unknown', () => {
    const html = renderLiteDiffOverviewHtml(cache([], {
      truncation: {
        truncated: true,
        diffLimit: 1000,
        sections: [
          { sectionKey: 'fieldSettings', section: 'フィールド', scanned: true, partiallyScanned: true, scanStatus: 'partial', omittedDiffCount: null },
          { sectionKey: 'pluginSettings', section: 'プラグイン', scanned: false, partiallyScanned: false, scanStatus: 'unscanned', omittedDiffCount: null }
        ]
      }
    }));
    expect(html).toContain('フィールド は部分走査');
    expect(html).toContain('プラグイン は未走査');
    expect(html).toContain('未検出件数も不明');
  });
});
