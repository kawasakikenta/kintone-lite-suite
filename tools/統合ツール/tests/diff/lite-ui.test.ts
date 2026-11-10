import { describe, expect, it, vi } from 'vitest';
import { computeLineDiff } from '../../src/diff/line-diff';
import {
  buildLiteDiffHtmlContext,
  buildLiteDiffMarkdownContext,
  buildLiteFieldLabelMap,
  buildLiteDiffFilterDescription,
  buildLiteDiffRowKey,
  buildLiteDiffScopeOptions,
  buildLiteDiffXlsxContext,
  createLiteDiffJsonImporter,
  getLiteHtmlExportContentLabel,
  isIncompleteLiteDiff,
  multiXlsxBatchSaveMarkup,
  renderLiteDiffOverviewHtml,
  renderRowsHtml,
  rowMatchesFilters,
  summarizeLiteIgnoreRules,
  mergePastedTargetAppIds,
  summarizeLiteDiffRows,
  validateLiteDiffStart
} from '../../src/entries/diff-lite-ui';
import { SECTION_DEFS } from '../../src/constants';

vi.mock('../../src/diff/line-diff', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../src/diff/line-diff')>();
  return { ...original, computeLineDiff: vi.fn(original.computeLineDiff) };
});
import { computeDiffRows } from '../../src/diff/engine';
import { enrichDiffRows } from '../../src/diff/enrich';

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
  it('validates comparison inputs before allowing an existing result to be cleared', () => {
    expect(validateLiteDiffStart({ sourceAppId: '', targetAppId: '2', scopes: ['viewSettings'] })).toContain('比較元アプリID');
    expect(validateLiteDiffStart({ sourceAppId: '1', targetAppId: '2', scopes: [] })).toContain('比較セクション');
    expect(validateLiteDiffStart({ sourceAppId: 'abc', targetAppId: '2', scopes: ['viewSettings'] })).toContain('正の整数');
    expect(validateLiteDiffStart({ sourceAppId: '1', targetAppId: '2', scopes: ['viewSettings'], ignoreKeys: 'views[0].name' })).toContain('位置依存');
    expect(validateLiteDiffStart({ sourceAppId: '', targetAppId: '', scopes: ['viewSettings'], hasImportedSource: true, hasImportedTarget: true })).toBe('');
    expect(validateLiteDiffStart({ sourceAppId: '1', sourceGuestId: '0', targetAppId: '2', scopes: ['viewSettings'] })).toContain('比較元のゲストスペースID');
    expect(validateLiteDiffStart({ sourceAppId: '1', targetAppId: '2', targetGuestId: 'abc', scopes: ['viewSettings'] })).toContain('比較先のゲストスペースID');
    expect(validateLiteDiffStart({ sourceAppId: '10', sourceGuestId: '5', sourcePreview: true, targetAppId: '10', targetGuestId: '5', targetPreview: true, scopes: ['viewSettings'] })).toContain('同一の接続先');
    expect(validateLiteDiffStart({ sourceAppId: '10', sourceGuestId: '5', sourcePreview: true, targetAppId: '10', targetGuestId: '5', targetPreview: false, scopes: ['viewSettings'] })).toBe('');
  });

  describe('mergePastedTargetAppIds', () => {
    it('replaces the selected text instead of appending to it', () => {
      expect(mergePastedTargetAppIds('5', 0, 1, '200, 300')).toEqual({ merged: '200,300', splits: true });
      expect(mergePastedTargetAppIds('100', 3, 3, '200\t300')).toEqual({ merged: '100,200,300', splits: true });
      expect(mergePastedTargetAppIds('100,900', 4, 7, '200 300')).toEqual({ merged: '100,200,300', splits: true });
    });

    it('leaves a single pasted ID, including spreadsheet whitespace, to the normal paste', () => {
      expect(mergePastedTargetAppIds('5', 0, 1, '123\n').splits).toBe(false);
      expect(mergePastedTargetAppIds('', 0, 0, ' 123 ').splits).toBe(false);
      expect(mergePastedTargetAppIds('5', 1, 1, '').splits).toBe(false);
    });

    it('tolerates a missing selection range', () => {
      expect(mergePastedTargetAppIds('100', null, undefined, '200、300')).toEqual({ merged: '100,200,300', splits: true });
    });
  });

  it('rejects a non-numeric guest space ID before it reaches the REST URL', () => {
    const base = { sourceAppId: '1', targetAppId: '2', scopes: ['viewSettings'] };
    expect(validateLiteDiffStart({ ...base, sourceGuestId: '１２３' })).toContain('比較元のゲストスペースID');
    expect(validateLiteDiffStart({ ...base, targetGuestId: 'abc' })).toContain('比較先のゲストスペースID');
    expect(validateLiteDiffStart({ ...base, sourceGuestId: '12/../3' })).toContain('半角数字');
    expect(validateLiteDiffStart({ ...base, sourceGuestId: ' 12 ', targetGuestId: '34' })).toBe('');
    expect(validateLiteDiffStart({ ...base, sourceGuestId: '', targetGuestId: '' })).toBe('');
    // 1対多比較では比較元のゲストIDも検査し、比較先は各行の検査に任せる。
    expect(validateLiteDiffStart({ sourceAppId: '1', sourceGuestId: 'x', scopes: ['viewSettings'], targets: [{ appId: '2', rowNumber: 1 }] }))
      .toContain('比較元のゲストスペースID');
  });

  describe('validateLiteDiffStart with targets (1対多比較)', () => {
    const scopes = ['viewSettings'];
    const sourceAppId = '1';

    it('returns empty string when all targets are valid', () => {
      const targets = [
        { appId: '10', guestId: '', rowNumber: 1 },
        { appId: '20', guestId: '5', rowNumber: 2 },
        { appId: '30', guestId: '', rowNumber: 3 }
      ];
      expect(validateLiteDiffStart({ sourceAppId, scopes, targets })).toBe('');
    });

    it('returns row-numbered error when the second target appId is invalid', () => {
      const targets = [
        { appId: '10', guestId: '', rowNumber: 1 },
        { appId: '12a', guestId: '', rowNumber: 2 },
        { appId: '30', guestId: '', rowNumber: 3 }
      ];
      const msg = validateLiteDiffStart({ sourceAppId, scopes, targets });
      expect(msg).toContain('2 行目');
      expect(msg).toContain('正の整数');
    });

    it('returns row-numbered error when the third target guestId is invalid', () => {
      const targets = [
        { appId: '10', guestId: '', rowNumber: 1 },
        { appId: '20', guestId: '', rowNumber: 2 },
        { appId: '30', guestId: 'abc', rowNumber: 3 }
      ];
      const msg = validateLiteDiffStart({ sourceAppId, scopes, targets });
      expect(msg).toContain('3 行目');
      expect(msg).toContain('ゲストID');
    });

    it('reports the duplicate target with both row numbers', () => {
      const targets = [
        { appId: '10', guestId: '', rowNumber: 1 },
        { appId: '20', guestId: '', rowNumber: 2 },
        { appId: '10', guestId: '', rowNumber: 4 }
      ];
      const msg = validateLiteDiffStart({ sourceAppId, scopes, targets });
      expect(msg).toContain('4 行目');
      expect(msg).toContain('1 行目');
      expect(msg).toContain('同じ接続先');
    });

    it('does not validate targetAppId when targets is provided (backward compat)', () => {
      // targets 指定時は既存の targetAppId チェックを行わない
      expect(validateLiteDiffStart({ sourceAppId, scopes, targets: [] })).toBe('');
    });

    it('keeps existing single-comparison behaviour when targets is undefined', () => {
      expect(validateLiteDiffStart({ sourceAppId, targetAppId: '', scopes })).toContain('比較先アプリID');
      expect(validateLiteDiffStart({ sourceAppId, targetAppId: '2', scopes })).toBe('');
    });
  });

  it('offers every fetchable kintone setting section and selects all of them by default', () => {
    const options = buildLiteDiffScopeOptions();

    expect(options.map(([key]) => key)).toEqual(SECTION_DEFS.map(({ key }) => key));
    expect(options.map(([, label]) => label)).toEqual(SECTION_DEFS.map(({ label }) => label));
    expect(options).toHaveLength(18);
    expect(options.every(([, , checked]) => checked)).toBe(true);
    expect(options.some(([key]) => key === 'appInfo')).toBe(true);
  });

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

    const internal = buildLiteDiffXlsxContext(full, selected, 'all', '全件', undefined, {
      audience: 'internal'
    });
    expect(internal.audience).toBe('internal');
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
    expect(safe.exportContentLabel).toBe('差分行のみ（全設定は未収録）');
    expect(detailed.exportContentMode).toBe('withCompared');
    expect(detailed.exportContentLabel).toBe('比較設定込み（取扱注意）');
    expect(getLiteHtmlExportContentLabel('unexpected')).toBe('差分行のみ（全設定は未収録）');
  });

  it('passes nested comparison values through HTML, Markdown, and Excel contexts unchanged', () => {
    const row = {
      sectionKey: 'pluginSettings',
      path: 'pluginSettings.plugins.p1.config',
      type: 'added',
      left: undefined,
      right: { config: { apiToken: 'NESTED_PLUGIN_TOKEN_RAW' } }
    };
    const current = cache([row]);
    const htmlContext = buildLiteDiffHtmlContext(current, [row], 'all', '全差分', 'withCompared');
    const markdownContext = buildLiteDiffMarkdownContext(current, [row], 'all', '全件');
    const xlsxContext = buildLiteDiffXlsxContext(current, [row], 'all', '全件', undefined, { audience: 'internal' });

    expect(htmlContext.rows[0].right.config.apiToken).toBe('NESTED_PLUGIN_TOKEN_RAW');
    expect(markdownContext.rows?.[0].right.config.apiToken).toBe('NESTED_PLUGIN_TOKEN_RAW');
    expect(xlsxContext.rows[0].right.config.apiToken).toBe('NESTED_PLUGIN_TOKEN_RAW');
  });

  it('keeps fetch failures and truncation in a warning state after export', () => {
    expect(isIncompleteLiteDiff({ fetchIssues: [{ sectionKey: 'pluginSettings' }], truncation: null })).toBe(true);
    expect(isIncompleteLiteDiff({ fetchIssues: [], partialIssues: [{ sectionKey: 'customizeSettings' }], truncation: null })).toBe(true);
    expect(isIncompleteLiteDiff({ fetchIssues: [], truncation: { truncated: true } })).toBe(true);
    expect(isIncompleteLiteDiff({
      fetchIssues: [],
      truncation: { truncated: true, actualDiffIncomplete: false, droppedDiff: 0, droppedSame: 2 }
    })).toBe(false);
    expect(isIncompleteLiteDiff({ fetchIssues: [], truncation: null })).toBe(false);
  });

  it('counts actual changes and moved rows without counting same rows as diffs', () => {
    expect(summarizeLiteDiffRows([
      { type: 'added' },
      { type: 'removed' },
      { type: 'changed' },
      { type: 'changed', moved: true },
      { type: 'same' },
      { type: 'changed', _displayOnly: true },
      { type: 'changed', _nonActionable: true }
    ] as any)).toEqual({
      total: 7,
      actual: 5,
      added: 1,
      removed: 1,
      changed: 3,
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
    expect(overview).not.toContain('data-kus-dl-type-filter="changed"');
    expect(overview).toContain('aria-label="並び順 1件を表示"');
    expect(rows).not.toContain('kus-dl-section__stat--changed');
    expect(rows).toContain('kus-dl-section__stat--moved">移動 1</span>');
    expect(rowMatchesFilters(movedRow, { section: '', type: 'changed', keyword: '' })).toBe(false);
    expect(rowMatchesFilters(movedRow, { section: '', type: 'moved', keyword: '' })).toBe(true);
  });

  it('says that the legacy form settings only repeat the field and layout changes (only when they are compared together)', () => {
    const formRow = (path: string) => ({ sectionKey: 'formSettings', section: 'フォーム設定', path, type: 'changed', left: 'a', right: 'b' }) as any;
    const fieldRow = { sectionKey: 'fieldSettings', section: 'フィールド設定', path: 'fieldSettings.properties.a.label', type: 'changed', left: 'a', right: 'b' } as any;
    const rows = [fieldRow, formRow('formSettings.properties[0].label'), formRow('formSettings.properties[1].label')];
    const together = renderLiteDiffOverviewHtml(cache(rows, { scopes: ['fieldSettings', 'formSettings'] }));
    expect(together).toContain('フォーム設定の 2 件は、フィールド設定・レイアウト設定の変更の再掲です（Excelの変更一覧には含めません）。');
    // フォーム設定だけを比較したときは、再掲元が無いので注記しない
    expect(renderLiteDiffOverviewHtml(cache(rows.slice(1), { scopes: ['formSettings'] }))).not.toContain('再掲');
    expect(renderLiteDiffOverviewHtml(cache([fieldRow], { scopes: ['fieldSettings'] }))).not.toContain('再掲');
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
    expect(html).toContain('id="kus-dl-overview"');
    expect(html).toContain('data-kus-dl-overview tabindex="-1"');
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

  it('counts a state rename as a difference while keeping it review-only', () => {
    const html = renderLiteDiffOverviewHtml(cache([{
      sectionKey: 'processSettings',
      section: 'プロセス管理',
      path: 'processSettings.states.__rename__',
      type: 'changed',
      left: { name: '未処理' },
      right: { name: '受付' },
      _nonActionable: true,
      _stateRenameNotice: true
    }]));

    expect(html).toContain('差分が 1 件見つかりました');
    expect(html).toContain('内容変更 1');
    expect(html).not.toContain('差分はありません');
  });

  it('keeps same-evidence-only truncation complete and explains the omission', () => {
    const html = renderLiteDiffOverviewHtml(cache([{
      sectionKey: 'appSettings', section: 'アプリ設定', path: 'appSettings.name',
      type: 'changed', left: '旧', right: '新'
    }], {
      truncation: {
        truncated: true,
        actualDiffIncomplete: false,
        diffLimit: 1000,
        sameLimit: 3000,
        droppedDiff: 0,
        droppedSame: 2,
        sections: [{ sectionKey: 'appSettings', scanStatus: 'complete', droppedDiff: 0, droppedSame: 2, omittedDiffCount: 0 }]
      }
    }));

    expect(html).toContain('data-kus-dl-completeness="complete"');
    expect(html).not.toContain('比較結果は不完全です');
    expect(html).toContain('同一証跡は上限 3,000 件まで表示し、2 件を省略しました');
    expect(html).toContain('実差分の検出結果は完全です');
  });

  it('states that visible results are after ignore rules were applied', () => {
    const html = renderLiteDiffOverviewHtml(cache([], { ignoreKeys: 'revision, viewSettings.views.営業 一覧.filterCond' }));
    expect(html).toContain('無視ルール 2件を適用した後の結果');
    expect(html).toContain('ルールに一致した設定差分は一覧に含まれません');
    expect(html).toContain('完全パス/パターン 1件');
    expect(html).toContain('正規化は適用していません');
  });

  it('always states the applied ignore and normalization comparison conditions', () => {
    const applied = renderLiteDiffOverviewHtml(cache([], {
      normalizationPresetState: { actionOrder: true, viewOrder: true, appearance: true, unknownPreset: true }
    }));
    const none = renderLiteDiffOverviewHtml(cache([]));

    expect(applied).toContain('適用した比較条件');
    expect(applied).toContain('無視ルールは適用していません');
    expect(applied).toContain('正規化 3件を適用しています');
    expect(applied).toContain('アプリアクションの並び順');
    expect(applied).toContain('一覧・グラフ・アクションの並び順');
    expect(applied).toContain('見た目/幅/座標');
    expect(applied).not.toContain('unknownPreset');
    expect(none).toContain('無視ルールは適用していません');
    expect(none).toContain('正規化は適用していません');
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
    const collapsed = renderRowsHtml([row], false, '', [row], { lineDiff: false });
    const expanded = renderRowsHtml([row], false, '', [row], { lineDiff: false, expandedValueKeys: new Set([`${rowKey}:before`]) });

    expect(collapsed).toContain(`data-kus-dl-value-toggle="${rowKey}:before"`);
    expect(collapsed).toContain('aria-expanded="false"');
    expect(collapsed).toContain('全文を展開');
    expect(collapsed).toMatch(/\d+行 · \d+文字/);
    expect(expanded).toContain(`data-kus-dl-value-key="${rowKey}:before"`);
    expect(expanded).toContain('class="kus-dl-value is-expanded"');
    expect(expanded).toContain('aria-expanded="true"');
    expect(expanded).toContain('省略表示に戻す');
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

  it('assigns unique navigation and disclosure ids to multiple process state renames', () => {
    const first = {
      sectionKey: 'processSettings', section: 'プロセス管理', type: 'changed',
      path: 'processSettings.states.__rename__', left: { name: 'a:b' }, right: { name: 'c' },
      _stateRenameNotice: true, _nonActionable: true,
      renameCandidate: { id: 'state-rename:a:b:c' }
    } as any;
    const second = {
      ...first,
      left: { name: 'a' }, right: { name: 'b:c' },
      renameCandidate: { id: 'state-rename:a:b:c' }
    } as any;
    const firstKey = buildLiteDiffRowKey(first);
    const secondKey = buildLiteDiffRowKey(second);
    const html = renderRowsHtml([first, second], false, '', [first, second]);

    expect(firstKey).not.toBe(secondKey);
    expect(html).toContain(`data-kus-dl-row-key="${firstKey}"`);
    expect(html).toContain(`data-kus-dl-row-key="${secondKey}"`);
    expect(html).toContain(`aria-controls="kus-dl-row-detail-${firstKey}"`);
    expect(html).toContain(`aria-controls="kus-dl-row-detail-${secondKey}"`);
    expect(html).toContain(`id="kus-dl-row-values-${firstKey}"`);
    expect(html).toContain(`id="kus-dl-row-values-${secondKey}"`);
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
    expect(openHtml).toContain('aria-label="customer · フィールド設定の表示名を次回の比較から除外（無視ルールへ追加）"');
    expect(openHtml).toContain('data-side-label="比較元の値"');
    expect(openHtml).toContain('data-side-label="比較先の値"');
    expect(openHtml).toContain(`data-kus-dl-row-toggle="${rowKey}"`);
    expect(openHtml).toContain(`aria-controls="kus-dl-row-detail-${rowKey}"`);
    expect(openHtml).toContain(`id="kus-dl-row-values-${rowKey}"`);
    expect(openHtml).not.toContain('data-kus-dl-mobile-row-toggle');
    expect(openHtml).not.toContain('kus-dl-row__mobile-toggle');
    expect(openHtml).toContain('aria-expanded="true"');
    expect(openHtml).toContain('data-kus-dl-section-key="fieldSettings" open');
    expect(closedHtml).not.toContain('data-kus-dl-section-key="fieldSettings" open');
  });

  it('uses an item-specific accessible label on the row toggle for every screen width', () => {
    const row = {
      sectionKey: 'appSettings', section: 'アプリ設定', path: 'appSettings.name',
      type: 'changed', reasonSummary: 'アプリ名の変更', left: '旧名称', right: '新名称'
    } as any;
    const rowKey = buildLiteDiffRowKey(row);
    const open = renderRowsHtml([row], false, '', [row], { rowMode: 'detail' });
    const closed = renderRowsHtml([row], false, '', [row], { rowMode: 'list' });

    expect(open).toContain(`data-kus-dl-row-toggle="${rowKey}"`);
    expect(open).toContain('aria-expanded="true"');
    expect(open).toContain('aria-label="アプリ名の変更の比較元・比較先の値を閉じる"');
    expect(open).toContain('>値を閉じる</button>');
    expect(open).toContain(`id="kus-dl-row-values-${rowKey}" class="kus-dl-row__cols"`);
    expect(closed).toContain('aria-expanded="false"');
    expect(closed).toContain('aria-label="アプリ名の変更の比較元・比較先の値を表示"');
    expect(closed).toContain('>値を表示</button>');
  });

  it('names a row by its place and item, and leaves the values to the brief and the value area', () => {
    const row = (reasonSummary?: string) => ({
      sectionKey: 'appSettings', section: 'アプリ設定', path: 'appSettings.name',
      type: 'changed', left: '旧名称', right: '新名称', ...(reasonSummary ? { reasonSummary } : {})
    } as any);
    const title = (html: string) => (/<span class="kus-dl-row__title">([^<]*)<\/span>/.exec(html) || [])[1];
    const subtitle = (html: string) => (/<div class="kus-dl-row__subtitle">([^<]*)<\/div>/.exec(html) || [])[1];

    // 場所と項目の説明がある行: それを見出しにし、値（A → B）は見出しに重ねない
    const located = renderRowsHtml([row('アプリ名の変更')], false, '', [row('アプリ名の変更')], { rowMode: 'list' });
    expect(title(located)).toBe('アプリ名の変更');
    expect(subtitle(located)).toBe('名前');
    expect(located).toContain('<span class="kus-dl-chip kus-dl-chip--before">旧名称</span>');
    expect(located).toContain('<span class="kus-dl-chip kus-dl-chip--after">新名称</span>');
    expect(located).toContain('aria-label="変更・内容が異なる: アプリ名の変更"');

    // 説明に項目名が入っていれば、項目名を重ねて出さない
    const named = renderRowsHtml([row('アプリ設定変更：名前')], false, '', [row('アプリ設定変更：名前')], { rowMode: 'list' });
    expect(title(named)).toBe('アプリ設定変更：名前');
    expect(subtitle(named)).toBeUndefined();

    // 説明が無い行は、これまでどおり項目と値の要約を見出しにする
    const bare = renderRowsHtml([row()], false, '', [row()], { rowMode: 'list' });
    expect(title(bare)).toBe('名前: 旧名称 → 新名称');
    expect(subtitle(bare)).toBeUndefined();
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


describe('diff lite JSON selection lifecycle', () => {
  function deferred<T>() {
    let resolve!: (value: T) => void;
    let reject!: (error: Error) => void;
    const promise = new Promise<T>((ok, fail) => { resolve = ok; reject = fail; });
    return { promise, resolve, reject };
  }

  it.each(['source', 'target'] as const)('discards a late %s read after import was cleared', async (side) => {
    const importer = createLiteDiffJsonImporter<{ appId: string }>();
    const read = deferred<{ appId: string }>();
    const pending = importer.load(side, () => read.promise);
    expect(importer.isLoading()).toBe(true);

    importer.cancel(side);
    read.resolve({ appId: '101' });

    expect(await pending).toBeNull();
    expect(importer.isLoading()).toBe(false);
  });

  it('keeps the latest file when the earlier file finishes last', async () => {
    const importer = createLiteDiffJsonImporter<string>();
    const first = deferred<string>();
    const second = deferred<string>();
    const oldRead = importer.load('source', () => first.promise);
    const latestRead = importer.load('source', () => second.promise);

    second.resolve('latest snapshot');
    expect(await latestRead).toBe('latest snapshot');
    first.resolve('older snapshot');
    expect(await oldRead).toBeNull();
    expect(importer.isLoading()).toBe(false);
  });

  it('does not unlock comparison while a newer read or the opposite side is pending', async () => {
    const busy: boolean[] = [];
    const importer = createLiteDiffJsonImporter<string>(() => busy.push(importer.isLoading()));
    const first = deferred<string>();
    const second = deferred<string>();
    const target = deferred<string>();
    const oldRead = importer.load('source', () => first.promise);
    const latestRead = importer.load('source', () => second.promise);
    const targetRead = importer.load('target', () => target.promise);

    first.resolve('old');
    expect(await oldRead).toBeNull();
    expect(importer.isLoading()).toBe(true);
    importer.cancel('source');
    second.resolve('cancelled');
    expect(await latestRead).toBeNull();
    expect(importer.isLoading()).toBe(true);
    target.resolve('target');
    expect(await targetRead).toBe('target');
    expect(busy.at(-1)).toBe(false);
  });

  it('suppresses a cancelled file error but reports an error from the current file', async () => {
    const importer = createLiteDiffJsonImporter<string>();
    const stale = deferred<string>();
    const oldRead = importer.load('target', () => stale.promise);
    importer.cancel('target');
    stale.reject(new Error('old malformed file'));
    expect(await oldRead).toBeNull();

    await expect(importer.load('target', async () => { throw new Error('current malformed file'); }))
      .rejects.toThrow('current malformed file');
    expect(importer.isLoading()).toBe(false);
  });

  it('shows a process state rename by its old and new names in the result list', () => {
    const state = (name: string, index: string) => ({ name, index, assignee: { type: 'ONE', entities: [] } });
    const source = { sections: { processSettings: { enable: true, states: { 未処理: state('未処理', '0'), 処理中: state('処理中', '1') }, actions: [] } } };
    const target = { sections: { processSettings: { enable: true, states: { 未処理: state('未処理', '0'), 対応中: state('対応中', '1') }, actions: [] } } };
    const rows = enrichDiffRows(computeDiffRows(source, target, ['processSettings'], '').rows, source, target) as any[];
    const html = renderRowsHtml(rows, false, '', rows);
    // 内部パスは「技術情報」にだけ残し、見出し・説明・場所のチップには出さない。
    const visibleText = html
      .replace(/<code class="kus-dl-row__raw">[\s\S]*?<\/code>/g, '')
      .replace(/<[^>]+>/g, '|');
    const labels = [...html.matchAll(/aria-label="([^"]*)"/g)].map((match) => match[1]).join('\n');

    expect(html).toContain('<span class="kus-dl-row__title">ステータス改名：処理中 → 対応中（参照を自動補正）</span>');
    expect(html).toContain('<div class="kus-dl-row__subtitle">ステータス名</div>');
    expect(visibleText).not.toContain('__rename__');
    expect(labels).not.toContain('__rename__');
  });

  describe('field setting rows', () => {
    const bundle = (label: string) => ({
      sections: {
        fieldSettings: {
          properties: {
            customer_name: { code: 'customer_name', type: 'SINGLE_LINE_TEXT', label },
            details: { code: 'details', type: 'SUBTABLE', fields: { qty: { code: 'qty', type: 'NUMBER', label: '数量' } } },
            note: { code: 'note', type: 'LABEL', label: '<div>注意<b>書き</b></div>' }
          }
        }
      }
    });
    const requiredRow = (code: string) => ({
      sectionKey: 'fieldSettings', section: 'フィールド設定', type: 'changed',
      path: `fieldSettings.properties.${code}.required`, left: false, right: true, reasonSummary: '必須設定変更'
    }) as any;

    it('names the field in each result row so same-property changes can be told apart', () => {
      const labels = buildLiteFieldLabelMap(bundle('旧顧客名'), bundle('顧客名'));
      expect(labels.get('customer_name')).toBe('顧客名');
      expect(labels.get('qty')).toBe('数量');
      expect(labels.get('note')).toBe('注意書き');

      const rows = [requiredRow('customer_name'), requiredRow('details'), {
        ...requiredRow('details'), path: 'fieldSettings.properties.details.fields.qty.required'
      }];
      const html = renderRowsHtml(rows, false, '', rows, { fieldLabels: labels });
      expect(html).toContain('顧客名（customer_name） · 必須設定変更');
      expect(html).toContain('details · 必須設定変更');
      expect(html).toContain('テーブル「details」内の 数量（qty） · 必須設定変更');
      expect(html).toContain('顧客名（customer_name） · 必須設定変更を次回の比較から除外');
    });

    it('falls back to the field code or the label inside a whole-field row', () => {
      const added = {
        sectionKey: 'fieldSettings', section: 'フィールド設定', type: 'added', reasonSummary: 'フィールド追加',
        path: 'fieldSettings.properties.memo', right: { code: 'memo', type: 'MULTI_LINE_TEXT', label: 'メモ' }
      } as any;
      expect(renderRowsHtml([added], false, '', [added])).toContain('メモ（memo） · フィールド追加');
      expect(renderRowsHtml([requiredRow('plain')], false, '', [requiredRow('plain')])).toContain('plain · 必須設定変更');
    });

    it('does not rewrite rows of other sections', () => {
      const row = {
        sectionKey: 'viewSettings', section: 'ビュー設定', type: 'changed', reasonSummary: 'ビュー「一覧」 / 絞り込み条件 変更',
        path: 'viewSettings.views.一覧.filterCond', left: 'a', right: 'b'
      } as any;
      const html = renderRowsHtml([row], false, '', [row], { fieldLabels: new Map([['customer_name', '顧客名']]) });
      expect(html).not.toContain('（customer_name）');
    });
  });
});

describe('diff lite row list mode and line-by-line values', () => {
  const textRow = (left: unknown, right: unknown, extra: Record<string, unknown> = {}) => ({
    sectionKey: 'pluginSettings', section: 'プラグイン', path: 'pluginSettings.plugins.sample.config',
    type: 'changed', reasonSummary: '設定値の変更', left, right, ...extra
  }) as any;
  const numberedLines = (count: number, replace: Record<number, string> = {}) =>
    Array.from({ length: count }, (_, index) => replace[index + 1] ?? `const value${index + 1} = ${index + 1};`).join('\n');
  const render = (row: any, options: Record<string, unknown> = {}) => renderRowsHtml([row], false, '', [row], options);
  const briefOf = (html: string) => html.match(/<div class="kus-dl-row__brief" data-kus-dl-brief>([\s\S]*?)<\/div><div id=/)?.[1] ?? '';
  const textOf = (html: string) => html.replace(/<[^>]+>/g, '|').replace(/\|+/g, '|');

  it('defaults to the detail mode in the pure function and opens the values', () => {
    const row = textRow('旧', '新');
    const html = render(row);
    expect(html).toContain('kus-dl-row--changed is-open"');
    expect(html).toContain('aria-expanded="true"');
    expect(html).toContain('class="kus-dl-row__cols"');
    expect(html).not.toContain('kus-dl-row__brief');
  });

  it('closes the row in the list mode: brief only, an empty hidden detail, and no value markup', () => {
    const row = textRow('旧名称', '新名称');
    const rowKey = buildLiteDiffRowKey(row);
    const html = render(row, { rowMode: 'list' });

    expect(html).not.toContain('is-open');
    expect(html).toContain(`data-kus-dl-row-toggle="${rowKey}" aria-expanded="false" aria-controls="kus-dl-row-detail-${rowKey}"`);
    expect(html).toContain('>値を表示</button>');
    expect(html).toContain('data-kus-dl-brief');
    expect(html).toContain(`<div id="kus-dl-row-detail-${rowKey}" class="kus-dl-row__detail" hidden></div>`);
    expect(html).not.toContain('kus-dl-row__cols');
    expect(html).not.toContain('kus-dl-pre');
    expect(html).not.toContain('data-kus-dl-technical');
    expect(html).not.toContain('data-kus-dl-ignore-path');
    expect(html).not.toContain('data-kus-dl-linediff');
  });

  it('combines the row mode with the rows the user toggled', () => {
    const row = textRow('旧名称', '新名称');
    const rowKey = buildLiteDiffRowKey(row);
    const toggled = new Set([rowKey]);

    expect(render(row, { rowMode: 'list', toggledRowKeys: toggled })).toContain('is-open');
    expect(render(row, { rowMode: 'list', toggledRowKeys: toggled })).toContain('class="kus-dl-row__cols"');
    expect(render(row, { rowMode: 'list', toggledRowKeys: new Set() })).not.toContain('is-open');
    expect(render(row, { rowMode: 'detail', toggledRowKeys: toggled })).not.toContain('is-open');
    expect(render(row, { rowMode: 'detail', toggledRowKeys: toggled })).toContain('hidden></div>');
    expect(render(row, { rowMode: 'detail', toggledRowKeys: new Set() })).toContain('is-open');
    const opened = render(row, { rowMode: 'list', toggledRowKeys: toggled });
    expect(opened).toContain('aria-expanded="true"');
    expect(opened).toContain('>値を閉じる</button>');
    expect(opened).not.toContain('kus-dl-row__brief');
    expect(opened).toContain('data-kus-dl-ignore-path');
  });

  it('shows a single-line change as a before-to-after chip pair', () => {
    const html = render(textRow('顧客名', '取引先名'), { rowMode: 'list' });
    const brief = briefOf(html);
    expect(brief).toContain('<span class="kus-dl-chip kus-dl-chip--before">顧客名</span>');
    expect(brief).toContain('<span class="kus-dl-arrow" role="img" aria-label="から">→</span>');
    expect(brief).toContain('<span class="kus-dl-chip kus-dl-chip--after">取引先名</span>');
    expect(brief.indexOf('顧客名')).toBeLessThan(brief.indexOf('取引先名'));
  });

  it('collapses whitespace and clips a long value to 120 characters in the chip', () => {
    const long = `${'あ'.repeat(130)}　 \t末尾`;
    const html = render(textRow('x', long.replace(/\n/g, ' ')), { rowMode: 'list' });
    const chip = html.match(/kus-dl-chip--after"[^>]*>([^<]*)</)?.[1] ?? '';
    expect(chip).toBe(`${'あ'.repeat(120)}…`);
    expect(html).toContain('kus-dl-chip--after" title="');

    const spaced = render(textRow('a   b', 'c\t\td'), { rowMode: 'list' });
    expect(briefOf(spaced)).toContain('>a b</span>');
    expect(briefOf(spaced)).toContain('>c d</span>');
  });

  it('shows an addition as a green chip, a removal as a red chip, and an unchanged item as a grey chip', () => {
    const added = render({ sectionKey: 'viewSettings', section: 'ビュー', path: 'viewSettings.views.new', type: 'added', right: { name: '新一覧' } } as any, { rowMode: 'list' });
    const removed = render({ sectionKey: 'viewSettings', section: 'ビュー', path: 'viewSettings.views.old', type: 'removed', left: { name: '旧一覧' } } as any, { rowMode: 'list' });
    const same = render({ sectionKey: 'viewSettings', section: 'ビュー', path: 'viewSettings.views.same', type: 'same', left: { name: '同じ一覧' }, right: { name: '同じ一覧' } } as any, { rowMode: 'list' });

    expect(briefOf(added)).toMatch(/^<span class="kus-dl-chip kus-dl-chip--after"[^>]*>[^<]*新一覧[^<]*<\/span>$/);
    expect(briefOf(removed)).toMatch(/^<span class="kus-dl-chip kus-dl-chip--before"[^>]*>[^<]*旧一覧[^<]*<\/span>$/);
    expect(briefOf(same)).toMatch(/^<span class="kus-dl-chip kus-dl-chip--same"[^>]*>[^<]*同じ一覧[^<]*<\/span>$/);
    expect(briefOf(added)).not.toContain('kus-dl-arrow');
  });

  it('shows the shared value once when both sides read the same', () => {
    const row = textRow('100', '100');
    const html = render(row, { rowMode: 'list' });
    expect(briefOf(html)).toBe('<span class="kus-dl-chip kus-dl-chip--same">100</span>');
    expect(html).not.toContain('kus-dl-arrow');
    expect(html).toContain('hidden></div>');
  });

  it('summarises a multi-line change with the line counts, the first differing line, and the rest', () => {
    const left = numberedLines(40);
    const right = numberedLines(40, { 10: 'const value10 = 100;', 30: 'const value30 = 300;' });
    const brief = briefOf(render(textRow(left, right), { rowMode: 'list' }));
    const text = textOf(brief);

    expect(brief).toContain('class="kus-dl-brief__count kus-dl-brief__count--del" role="img" aria-label="削除 2行">−2行</span>');
    expect(brief).toContain('class="kus-dl-brief__count kus-dl-brief__count--add" role="img" aria-label="追加 2行">+2行</span>');
    expect(brief).toContain('<span class="kus-dl-chip kus-dl-chip--before">const value10 = 10;</span>');
    expect(brief).toContain('<span class="kus-dl-chip kus-dl-chip--after">const value10 = 100;</span>');
    expect(brief).not.toContain('value30');
    expect(text).toContain('ほか 1 行');
  });

  it('summarises pure additions and deletions by the changed side only', () => {
    const base = numberedLines(20);
    const withInserted = `${base}\nconst tail = true;`;
    const added = briefOf(render(textRow(base, withInserted), { rowMode: 'list' }));
    expect(added).toContain('aria-label="追加 1行"');
    expect(added).not.toContain('aria-label="削除');
    expect(added).toContain('<span class="kus-dl-chip kus-dl-chip--after">const tail = true;</span>');
    expect(added).not.toContain('kus-dl-arrow');
    expect(added).not.toContain('ほか');

    const removed = briefOf(render(textRow(withInserted, base), { rowMode: 'list' }));
    expect(removed).toContain('aria-label="削除 1行"');
    expect(removed).toContain('<span class="kus-dl-chip kus-dl-chip--before">const tail = true;</span>');
  });

  it('strips leading indentation and clips an excerpt line to 80 characters', () => {
    const left = `a\n    ${'x'.repeat(100)}\nz`;
    const right = 'a\n    changed\nz';
    const brief = briefOf(render(textRow(left, right), { rowMode: 'list' }));
    expect(brief).toContain(`>${'x'.repeat(80)}…</span>`);
    expect(brief).toContain('>changed</span>');
    expect(brief).not.toContain('>    ');
  });

  it('says when only the line endings differ', () => {
    const row = textRow('a\r\nb\r\nc', 'a\nb\nc');
    const brief = briefOf(render(row, { rowMode: 'list' }));
    expect(brief).toContain('改行コードだけが異なります');
    expect(brief).not.toContain('kus-dl-chip');

    const detail = render(row, { rowMode: 'detail' });
    expect(detail).toContain('行の内容は同じです。改行コード（CRLF / LF）だけが異なります。');
    expect(detail).not.toContain('kus-dl-ld-row');
    expect(detail).toContain('data-kus-dl-linediff');
  });

  it('falls back to a flattened chip pair and the line counts when the line diff is disabled or too large', () => {
    const left = 'first\nsecond\nthird';
    const right = 'first\nSECOND\nthird\nfourth';
    const disabled = briefOf(render(textRow(left, right), { rowMode: 'list', lineDiff: false }));
    expect(disabled).toContain('>first second third</span>');
    expect(disabled).toContain('>first SECOND third fourth</span>');
    expect(textOf(disabled)).toContain('3行 → 4行');
    expect(disabled).not.toContain('kus-dl-brief__count');

    const hugeLeft = Array.from({ length: 2000 }, (_, index) => `old ${index}`).join('\n');
    const hugeRight = Array.from({ length: 2000 }, (_, index) => `new ${index}`).join('\n');
    const tooMany = render(textRow(hugeLeft, hugeRight), { rowMode: 'list' });
    expect(textOf(briefOf(tooMany))).toContain('2000行 → 2000行');
    const tooManyOpen = render(textRow(hugeLeft, hugeRight), { rowMode: 'detail' });
    expect(tooManyOpen).toContain('違う行が多いため、行単位の表示を省略しました。');
    expect(tooManyOpen).toContain('class="kus-dl-pre del"');
    expect(tooManyOpen).not.toContain('data-kus-dl-linediff');
  });

  it('escapes markup in the brief chips and in the line-by-line block', () => {
    const scriptLeft = 'a\n<script>alert("l")</script>\nz';
    const scriptRight = 'a\n<script>alert("r")</script>\nz';
    const closed = render(textRow(scriptLeft, scriptRight), { rowMode: 'list' });
    const open = render(textRow(scriptLeft, scriptRight), { rowMode: 'detail', lineDiff: true });
    const single = render(textRow('<img src=x onerror=1>', '<b>x</b>'), { rowMode: 'list' });

    for (const html of [closed, open, single]) {
      expect(html).not.toContain('<script>');
      expect(html).not.toContain('<img src');
      expect(html).not.toContain('<b>x</b>');
    }
    expect(closed).toContain('&lt;script&gt;');
    expect(open).toContain('&lt;script&gt;alert(&quot;l&quot;)');
    expect(single).toContain('&lt;img src=x onerror=1&gt;');
  });

  describe('line-by-line block', () => {
    const left = numberedLines(40);
    const right = numberedLines(41, { 10: 'const value10 = 100;' }).replace('const value41 = 41;', 'const extra = 1;\nconst value41b = 2;');

    it('shows line numbers, markers, aligned empty cells, and folds the unchanged lines', () => {
      const row = textRow(left, right);
      const rowKey = buildLiteDiffRowKey(row);
      const html = render(row, { rowMode: 'detail' });

      expect(html).toContain('<div class="kus-dl-linediff" role="group" aria-label="行単位の差分" data-kus-dl-linediff>');
      expect(html).toContain('<div class="kus-dl-linediff__head"><span>比較元</span><span>比較先</span></div>');
      expect(html).toContain('class="kus-dl-ld-row kus-dl-ld-row--replace"');
      expect(html).toContain('<div class="kus-dl-ld-cell kus-dl-ld-cell--del" data-side="before"><span class="kus-dl-ld-no">10</span><span class="kus-dl-ld-mark">−</span><span class="kus-dl-ld-text">const value10 = 10;</span></div>');
      expect(html).toContain('<div class="kus-dl-ld-cell kus-dl-ld-cell--add" data-side="after"><span class="kus-dl-ld-no">10</span><span class="kus-dl-ld-mark">+</span><span class="kus-dl-ld-text">const value10 = 100;</span></div>');
      expect(html).toContain('class="kus-dl-ld-row kus-dl-ld-row--add"');
      expect(html).toContain('<div class="kus-dl-ld-cell kus-dl-ld-cell--pad" data-side="before" aria-hidden="true"></div>');
      expect(html).toContain('class="kus-dl-ld-row kus-dl-ld-row--same"');
      // 変更のない行は、1 列に積む表示のために比較先の行番号も持つ（41 行目の前で 1 行増えるため、42 行目は 43 行目になる）
      expect(html).toContain('<div class="kus-dl-ld-cell" data-side="before"><span class="kus-dl-ld-alt">9</span><span class="kus-dl-ld-no">9</span>');
      expect(html).not.toContain('kus-dl-ld-cell--del" data-side="before"><span class="kus-dl-ld-alt">');
      expect(html).toMatch(/<div class="kus-dl-ld-skip">変更のない \d+ 行を省略<\/div>/);
      // 違う行の前後 2 行だけ（1 行目〜7 行目と 13 行目以降は省略）
      expect(html).toContain('const value8 = 8;');
      expect(html).not.toContain('const value3 = 3;');
      expect(html).toContain('−1行 / +3行');
      expect(html).toContain('比較元 40行 → 比較先 42行');
      expect(html).toContain(`data-kus-dl-lines-toggle="${rowKey}" aria-expanded="false"`);
      expect(html).toContain('>すべての行を表示</button>');
      expect(html).not.toContain('kus-dl-pre');
    });

    it('shows every line on request and offers to fold them again', () => {
      const row = textRow(left, right);
      const rowKey = buildLiteDiffRowKey(row);
      const html = render(row, { rowMode: 'detail', expandedValueKeys: new Set([`${rowKey}:lines`]) });

      expect(html).not.toContain('kus-dl-ld-skip');
      expect(html).toContain('const value3 = 3;');
      expect(html).toContain('const value40 = 40;');
      expect(html).toContain(`data-kus-dl-lines-toggle="${rowKey}" aria-expanded="true"`);
      expect(html).toContain('>変更のある行の前後だけ表示</button>');
    });

    it('does not offer the toggle when nothing is folded', () => {
      const html = render(textRow('a\nb\nc', 'a\nB\nc'), { rowMode: 'detail' });
      expect(html).toContain('data-kus-dl-linediff');
      expect(html).not.toContain('data-kus-dl-lines-toggle');
      expect(html).not.toContain('kus-dl-ld-skip');
    });

    it('highlights characters only inside a similar replaced line when the character highlight is on', () => {
      const similarLeft = `head\nconst totalPrice = price * quantity + shipping;\ntail`;
      const similarRight = `head\nconst totalPrice = price * quantity + shipping + tax;\ntail`;
      const on = renderRowsHtml([textRow(similarLeft, similarRight)], true, '', undefined, { rowMode: 'detail' });
      const off = renderRowsHtml([textRow(similarLeft, similarRight)], false, '', undefined, { rowMode: 'detail' });
      expect(on).toContain('diff-char-add');
      expect(off).not.toContain('diff-char-add');
      expect(off).not.toContain('diff-char-del');

      const dissimilar = renderRowsHtml([textRow('head\nalpha beta gamma\ntail', 'head\n12345 67890 !!!!!\ntail')], true, '', undefined, { rowMode: 'detail' });
      expect(dissimilar).toContain('data-kus-dl-linediff');
      expect(dissimilar).not.toContain('diff-char-');
    });

    it('keeps the previous two-column values when the line diff is off and for single-line values', () => {
      const off = render(textRow(left, right), { rowMode: 'detail', lineDiff: false });
      expect(off).not.toContain('data-kus-dl-linediff');
      expect(off).not.toContain('行単位の表示を省略');
      expect(off).toContain('class="kus-dl-pre del"');
      expect(off).toContain('class="kus-dl-pre add"');

      const single = render(textRow('旧', '新'), { rowMode: 'detail' });
      expect(single).not.toContain('data-kus-dl-linediff');
      expect(single).toContain('class="kus-dl-pre del"');

      const added = render({ sectionKey: 'pluginSettings', section: 'プラグイン', path: 'pluginSettings.plugins.new', type: 'added', right: 'a\nb\nc' } as any, { rowMode: 'detail' });
      expect(added).not.toContain('data-kus-dl-linediff');
      expect(added).toContain('比較先にのみ存在');
    });

    it('does not recompute the line diff for the same row object when it is rendered again', () => {
      const row = textRow(left, right);
      const calls = vi.mocked(computeLineDiff);
      calls.mockClear();
      const first = render(row, { rowMode: 'list' });
      render(row, { rowMode: 'detail' });
      render(row, { rowMode: 'list', toggledRowKeys: new Set([buildLiteDiffRowKey(row)]) });
      expect(calls).toHaveBeenCalledTimes(1);
      expect(first).toContain('kus-dl-brief__count');

      calls.mockClear();
      render(row, { rowMode: 'detail', lineDiff: false });
      expect(calls).not.toHaveBeenCalled();
    });
  });
});
