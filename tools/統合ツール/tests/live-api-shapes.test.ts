import { describe, expect, it } from 'vitest';
import { buildDesignSnapshot } from '../src/design/snapshot';
import { bundleToMarkdown } from '../src/diff/export';
import { buildReflectSectionPlan as plan } from '../src/reflect/standalonePlan';
import { apiErrorWithContext, flattenCategories } from '../src/utils';

// Yu5 テナントの実応答（2026-10-31 確認）。合成データとのずれを防ぐため形を固定する。
const noCategories = { enabled: false, categories: {}, revision: '13' };
const categories = { enabled: true, revision: '14', categories: {
  検証親2: { name: '検証親2', index: '1', children: {} },
  検証親: { name: '検証親', index: '0', children: { 検証子: { name: '検証子', index: '0', children: {} } } }
} };
const noReminders = { notifications: [], timezone: null, revision: '13' };
const reminders = { timezone: 'Asia/Tokyo', revision: '59', notifications: [{ timing: { code: '作成日時', daysLater: '0', hoursLater: '0' }, filterCond: '', title: '通知', targets: [{ entity: { type: 'FIELD_ENTITY', code: '作業者' }, includeSubs: false }] }] };
const statusRow = (name: string, index: string) => ({ name, index, assignee: { type: 'ONE', entities: [] } });

describe('kintone の実際の応答形式', () => {
  it('カテゴリーが無いアプリを部分取得にしない', () => {
    const row = buildDesignSnapshot({ appId: '63', sections: { categories: noCategories } } as any).sections.find((item: any) => item.key === 'categories');
    expect(row?.status).not.toBe('partial');
  });
  it('名前をキーにしたカテゴリーを階層と表示順どおりに平坦化する', () => {
    expect(flattenCategories(categories.categories).map((item) => item.path)).toEqual(['検証親', '検証親 > 検証子', '検証親2']);
    expect(flattenCategories([{ name: '親', children: [{ name: '子' }] }]).map((item) => item.path)).toEqual(['親', '親 > 子']);
    expect(flattenCategories(undefined)).toEqual([]);
  });
  it('カテゴリーを Markdown に出力する', () => {
    const markdown = bundleToMarkdown({ appId: '63', sections: { categories } } as any);
    expect(markdown).toContain('検証親 > 検証子');
    expect(() => bundleToMarkdown({ appId: '63', sections: { categories: noCategories } } as any)).not.toThrow();
  });
  it('通知が無いアプリへリマインダー通知を反映できる', () => {
    const result = plan('reminderNotifications', reminders, noReminders);
    expect(result.status).toBe('change');
    expect(result.operations[0].body.timezone).toBe('Asia/Tokyo');
  });
  it('通知が無いアプリを反映元にしても反映先のタイムゾーンを変えない', () => {
    const result = plan('reminderNotifications', noReminders, reminders);
    expect(result.status).toBe('change');
    expect(result.operations[0].body).toMatchObject({ notifications: [], timezone: 'Asia/Tokyo' });
  });
  it('反映する通知があるのに反映元のタイムゾーンが無ければ止める', () => {
    expect(plan('reminderNotifications', { ...reminders, timezone: null }, noReminders).status).toBe('error');
  });
  it('リマインダー通知の宛先フィールドも参照として確認する', () => {
    expect(plan('reminderNotifications', reminders, noReminders).requiredFields).toEqual(['作成日時', '作業者']);
  });
  it('先頭のステータスが異なると事前に警告する', () => {
    const source = { revision: '1', enable: true, actions: [], states: { 未処理: statusRow('未処理', '0'), 完了: statusRow('完了', '1') } };
    const target = { revision: '1', enable: true, actions: [], states: { 完了: statusRow('完了', '1'), 未着手: statusRow('未着手', '0') } };
    expect(plan('processSettings', source, target).warnings.join('')).toContain('反映先「未着手」→ 反映元「未処理」');
    expect(plan('processSettings', source, source).warnings).toEqual([]);
  });
  it('kintone の項目別の拒否理由をメッセージに含める', () => {
    const error = apiErrorWithContext({ message: '入力内容が正しくありません。', code: 'CB_VA01', errors: { 'states[未処理].index': { messages: ['先頭のステータスは、先頭以外の位置に変更できません。'] } } }, { method: 'PUT', path: '/app/status.json' });
    expect(error.message.split('\n').slice(0, 2)).toEqual(['入力内容が正しくありません。', 'states[未処理].index: 先頭のステータスは、先頭以外の位置に変更できません。']);
  });
});
