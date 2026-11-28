import { describe, expect, it } from 'vitest';
import { buildLiteDiffSummaryText, renderLiteDiffOverviewHtml } from '../../src/entries/diff-lite-ui';
import { computeDiffResultId } from '../../src/diff/result-id';

function cache(rows: any[], overrides: Record<string, any> = {}): any {
  return {
    rows,
    fetchIssues: [],
    partialIssues: [],
    sourceBundle: { appId: '101', guestId: '', preview: false, meta: { appName: '顧客管理（開発）' }, sections: {} },
    targetBundle: { appId: '202', guestId: '7', preview: true, meta: { appName: '顧客管理（本番）' }, sections: {} },
    scopes: ['appSettings', 'fieldSettings'],
    ignoreKeys: '',
    normalizationPresetState: {},
    truncation: null,
    ...overrides
  };
}

const rows = [
  { sectionKey: 'appSettings', section: 'アプリ設定', type: 'changed', path: 'appSettings.name', left: '旧', right: '新' },
  { sectionKey: 'fieldSettings', section: 'フィールド設定', type: 'added', path: 'fieldSettings.properties.memo', right: { code: 'memo', type: 'MULTI_LINE_TEXT', label: 'メモ' } },
  { sectionKey: 'fieldSettings', section: 'フィールド設定', type: 'removed', path: 'fieldSettings.properties.old', left: { code: 'old', type: 'NUMBER', label: '旧数値' } },
  { sectionKey: 'viewSettings', section: 'ビュー設定', type: 'same', path: 'viewSettings', left: {}, right: {} }
];

describe('差分比較: 結果の要約をコピー', () => {
  it('比較方向・判定・内訳・差分のあるセクションの件数・比較条件を、画面の概要と同じ文で数行にする', () => {
    const source = cache(rows);
    const text = buildLiteDiffSummaryText(source);
    const id = computeDiffResultId(source);
    expect(text.split('\n')).toEqual([
      '差分比較の結果',
      '比較元: 顧客管理（開発）（App 101）（本番 / 通常スペース）',
      '比較先: 顧客管理（本番）（App 202）（プレビュー / ゲスト 7）',
      '結果: 差分が 3 件見つかりました。追加 1 / 削除 1 / 内容変更 1',
      '取得: 問題なし',
      'セクション別: アプリ設定 1件、フィールド設定 2件',
      '比較条件: 無視ルールは適用していません。 正規化は適用していません。',
      `比較結果ID: ${id.short}（完全な値: ${id.full}）`,
      ''
    ]);
    expect(id.full).toMatch(/^[0-9a-f]{64}$/);
    // 画面の概要と同じ見出しと内訳
    const overview = renderLiteDiffOverviewHtml(cache(rows), { announce: false });
    expect(overview).toContain('差分が 3 件見つかりました');
    expect(overview).toContain('追加 1 / 削除 1 / 内容変更 1');
    expect(overview).toContain('data-kus-dl-copy-summary');
  });

  it('設定の値は含めない', () => {
    const text = buildLiteDiffSummaryText(cache(rows));
    expect(text).not.toContain('旧数値');
    expect(text).not.toContain('MULTI_LINE_TEXT');
  });

  it('取得失敗があるときは「確認が必要」と、画面と同じ注意を入れる', () => {
    const text = buildLiteDiffSummaryText(cache(rows, {
      fetchIssues: [{ sectionKey: 'viewSettings', section: 'ビュー設定', side: 'target', message: '権限がありません。' }]
    }));
    expect(text).toContain('結果: 比較結果は不完全です。取得できた範囲では 3 件の差分があります。警告内容を確認してください。');
    expect(text).toContain('取得: 確認が必要（下の注意を確認してください）');
    expect(text).toContain('注意: 設定の取得に 1 件失敗しました。');
    expect(text).toContain('ビュー設定（比較先）: 権限がありません。');
  });

  it('差分が無いときは一致と示し、セクション別の行を出さない', () => {
    const text = buildLiteDiffSummaryText(cache([rows[3]]));
    expect(text).toContain('結果: 選択した設定に差分はありません。比較元と比較先は一致しています（同一 1 件）。');
    expect(text).not.toContain('セクション別');
  });
});
