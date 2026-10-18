import { describe, expect, it } from 'vitest';
import { buildReflectReportMarkdown, escapeReflectMarkdown } from '../../src/reflect/planReport';
import { buildReflectSectionPlan } from '../../src/reflect/standalonePlan';

const field = (code: string, label = code, extra: Record<string, unknown> = {}) => ({ type: 'SINGLE_LINE_TEXT', code, label, required: false, ...extra });
const base = {
  generatedAt: '2026-10-18T06:00:00.000Z',
  source: { appId: '101', name: '営業テンプレート', code: 'TPL', guestId: '' },
  target: { appId: '202', name: '東京営業所', guestId: '7' },
  sourceEnvironment: 'production' as const,
  preserveTargetOnly: true
};

describe('プレビュー反映のMarkdownレポート', () => {
  const fields = buildReflectSectionPlan('fieldSettings', { properties: { name: field('name', '顧客名', { required: true }), tag: field('tag', '担当部署') } }, { properties: { name: field('name', '取引先'), local: field('local', '営業所メモ') } }, { fieldLabels: { name: '顧客名', tag: '担当部署', local: '営業所メモ' } });
  const views = buildReflectSectionPlan('viewSettings', { views: {} }, { views: { 旧: { type: 'LIST', name: '旧', index: '0', fields: [] } } }, { preserveTargetOnly: false });

  it('計画として経路・概要・変更の要約を出し、設定値の生JSONは含めない', () => {
    const markdown = buildReflectReportMarkdown({ ...base, lookupMap: { '10': '20' }, entries: [fields, views], targetPending: { state: 'clean', productionRevision: '5', previewRevision: '5', sectionKeys: [], message: '反映先プレビューに未公開の変更はありません。' } });
    expect(markdown).toContain('# プレビュー反映の計画');
    expect(markdown).toContain('- 反映元: 営業テンプレート（App 101 / コード TPL / 通常スペース / 本番設定）');
    expect(markdown).toContain('- 反映先: 東京営業所（App 202 / ゲストスペース 7 / プレビュー）');
    expect(markdown).toContain('- 参照先変換: 10 → 20');
    expect(markdown).toContain('- 反映先の未公開の変更: 反映先プレビューに未公開の変更はありません。');
    expect(markdown).toContain('| フィールド設定 | 差分あり |');
    expect(markdown).toContain('- **変更** 顧客名（name）\n  - 表示名: 取引先 → 顧客名');
    expect(markdown).toContain('- **追加** 担当部署（tag）');
    expect(markdown).toContain('- **保持** 営業所メモ（local）');
    expect(markdown).toContain('- **削除** 旧');
    expect(markdown.indexOf('**削除** 旧')).toBeLessThan(markdown.length);
    expect(markdown).not.toContain('"type"');
    expect(markdown.endsWith('\n')).toBe(true);
  });

  it('記録として項目ごとの結果と失敗の詳細を出す', () => {
    const markdown = buildReflectReportMarkdown({ ...base, entries: [fields, views], outcome: { executedAt: '2026-10-18T06:05:00.000Z', sections: [
      { sectionKey: 'fieldSettings', label: 'フィールド設定', status: 'ok' },
      { sectionKey: 'viewSettings', label: 'ビュー設定', status: 'ng', message: 'GAIA_IL26 フィールドが見つかりません' }
    ] } });
    expect(markdown).toContain('# プレビュー反映の記録');
    expect(markdown).toContain('| フィールド設定 | 成功 |');
    expect(markdown).toContain('| ビュー設定 | 失敗 |');
    expect(markdown).toContain('- 詳細: GAIA\\_IL26 フィールドが見つかりません');
  });

  it('利用者が付けた名前の記号を Markdown として解釈させない', () => {
    expect(escapeReflectMarkdown('a|b *c* [x](y) <script>\n#1')).toBe('a\\|b \\*c\\* \\[x\\](y) \\<script\\> #1');
    const plan = buildReflectSectionPlan('viewSettings', { views: { '|*危険*|': { type: 'LIST', name: '|*危険*|', index: '0', fields: [] } } }, { views: {} });
    const markdown = buildReflectReportMarkdown({ ...base, entries: [plan] });
    expect(markdown).toContain('**追加** \\|\\*危険\\*\\|');
    expect(markdown).not.toMatch(/\| \|\*危険/);
  });
});
