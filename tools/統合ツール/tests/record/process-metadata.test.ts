import { beforeEach, describe, expect, it, vi } from 'vitest';
import fixture from '../fixtures/api-metadata.json';
import { readProcessActionChoices, describeProcessAction, processActionQuery } from '../../src/tabs/record-process-metadata';
import { runLoadStatusActionsStandalone } from '../../src/tabs/record-standalone';
import { apiGet } from '../../src/api';
vi.mock('../../src/api', async original => ({ ...await original<typeof import('../../src/api')>(), apiGet: vi.fn() }));
beforeEach(() => vi.mocked(apiGet).mockReset());

describe('process action metadata', () => {
  it('retains same-name actions from different states and identifies same-state ambiguity', () => {
    const actions = readProcessActionChoices(fixture.process);
    expect(actions).toHaveLength(5);
    expect(actions.map(action => action.ambiguous)).toEqual([false, false, true, true, false]);
    expect(actions[0]).toMatchObject({ name: '進める', from: '新規', filterCond: 'amount >= 1000', assigneeType: 'ONE' });
    expect(describeProcessAction(actions[0])).toMatch(/候補から1人を選択.*ユーザー: reviewer.*フィールド: owner/s);
  });
  it('explains secondary actions and inherited organization permissions', () => {
    expect(describeProcessAction(readProcessActionChoices(fixture.process)[4])).toContain('実行者: 組織: approval_team（下位組織を含む）');
    expect(describeProcessAction(readProcessActionChoices({ actions: [{ name: '実行', from: 'A', to: 'B', type: 'SECONDARY', executableUser: { entities: [] } }], states: {} })[0])).toContain('実行者: レコード閲覧可能なユーザー全員');
  });
  it('builds an explicit source-state and action filter, escaping state names', () => {
    const action = readProcessActionChoices(fixture.process)[0];
    expect(processActionQuery(action, 'workflow_status')).toBe('workflow_status in ("新規") and (amount >= 1000)');
    expect(processActionQuery({ ...action, from: '確認"待ち\\', filterCond: '' }, '状態')).toBe('状態 in ("確認\\"待ち\\\\")');
    expect(() => processActionQuery({ ...action, ambiguous: true }, '状態')).toThrow(/同名/);
    expect(() => processActionQuery(action, '')).toThrow(/フィールドコード/);
  });
  it('fetches the action names in the language required by the execution API and discovers the status code', async () => {
    vi.mocked(apiGet).mockResolvedValueOnce(fixture.process).mockResolvedValueOnce(fixture.fields);
    const result = await runLoadStatusActionsStandalone({ appId: '7', guestId: '3' }, vi.fn());
    expect(apiGet).toHaveBeenNthCalledWith(1, '/k/guest/3/v1', '/app/status.json', { app: '7', lang: 'user' });
    expect(result.statusFieldCode).toBe('workflow_status');
    expect(result.states).toEqual(['新規', '確認中', '完了']);
  });
  it('handles never-configured process settings without requesting fields', async () => {
    vi.mocked(apiGet).mockResolvedValue({ enable: false, states: null, actions: null, revision: '1' });
    expect(await runLoadStatusActionsStandalone({ appId: '7' }, vi.fn())).toMatchObject({ enabled: false, actions: [], statusFieldCode: '' });
    expect(apiGet).toHaveBeenCalledTimes(1);
  });
  it('rejects incomplete action responses rather than using an empty condition', () => {
    expect(() => readProcessActionChoices({ actions: null })).toThrow(/不正/);
    expect(() => readProcessActionChoices({ actions: [{ name: '不足' }] })).toThrow(/不正/);
  });
});
