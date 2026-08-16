import { describe, expect, it } from 'vitest';
import {
  buildLiteDiffXlsxContext,
  isIncompleteLiteDiff,
  renderLiteDiffOverviewHtml,
  renderRowsHtml,
  summarizeLiteDiffRows
} from '../../src/entries/diff-lite-ui';

function cache(rows: any[], overrides: Record<string, any> = {}) {
  return {
    rows,
    fetchIssues: [],
    sourceBundle: {
      appId: '10', guestId: '', preview: false,
      meta: { appName: '受注管理' }, sections: {}
    },
    targetBundle: {
      appId: '20', guestId: '3', preview: true,
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
    const ctx = buildLiteDiffXlsxContext(full, selected, 'filtered', '表示中（フィルタ適用後）');

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
    expect(ctx.exportContentMode).toBe('diffOnly');
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
    expect(html.match(/role="alert"/g)).toHaveLength(2);
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

    expect(added).toContain('比較元にはなし');
    expect(removed).toContain('比較先にはなし');
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
    expect(html).toContain('~250');
  });
});
