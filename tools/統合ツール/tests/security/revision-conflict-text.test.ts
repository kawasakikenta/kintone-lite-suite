import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { isRevisionConflictError } from '../../src/api';
import { runBatchProcessStandalone } from '../../src/tabs/record-standalone';
import { runFieldApplyStandalone } from '../../src/tabs/field-standalone';

// revision 競合（GAIA_CO02）は、エラーコードが無いときだけ文面（/revision.*(latest|mismatch|conflict)/i など）でも見分ける。
// API 層が失敗に添える内部の通信情報の行（[API] PUT … payload=…）には、送った内容の抜粋がそのまま入る。そこには利用者が付けた名前
// （プロセス管理のアクション名・フィールド名など）が含まれるため、文面の見分けがその行を読むと、アクション名が「Approve latest」なだけで
// 通信エラーや別の理由の拒否を「取得後に別の更新が入った（revision 競合）」と言い切ってしまう。

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('isRevisionConflictError ignores the request summary that the API layer appends', () => {
  it('does not read user-named values in the [API] line as a revision conflict', () => {
    const wrapped = Object.assign(new Error('Network Error\n[API] PUT /k/v1/records/status.json app=7 payload={"app":"7","records":[{"id":1,"revision":"3","action":"Approve latest"}]}'), { code: 'NETWORK' });
    expect(isRevisionConflictError(wrapped)).toBe(false);
    const rejected = Object.assign(new Error('入力内容が正しくありません。\n[API] POST /k/v1/preview/app/form/fields.json app=5 payload={"app":"5","properties":{"rev":{"label":"Revision"},"flag":{"label":"Conflict"}},"revision":"9"}'), { code: 'CB_VA01' });
    expect(isRevisionConflictError(rejected)).toBe(false);
  });

  it('still recognises a revision conflict by its code or by the message kintone returned', () => {
    expect(isRevisionConflictError({ code: 'GAIA_CO02', message: '指定したrevisionは最新ではありません。' })).toBe(true);
    expect(isRevisionConflictError(new Error('revision mismatch\n[API] PUT /k/v1/preview/app/views.json app=3'))).toBe(true);
    expect(isRevisionConflictError(new Error('リビジョンが最新ではありません。'))).toBe(true);
  });
});

describe('status update: an action named like a conflict does not turn another failure into "revision 競合"', () => {
  const api = vi.fn();
  const confirm = vi.fn();
  const records = [{ $id: { type: '__ID__', value: '1' }, $revision: { type: '__REVISION__', value: '3' } }];
  const run = (action: string) => runBatchProcessStandalone({ appId: '7', guestId: '', query: '', action, assignee: null }, vi.fn()).catch((caught) => caught);

  beforeEach(() => {
    api.mockReset();
    confirm.mockReset().mockReturnValue(true);
    vi.stubGlobal('kintone', { api });
    vi.stubGlobal('window', { confirm });
  });

  it('a lost response is reported as unconfirmed only (no revision conflict)', async () => {
    api.mockResolvedValueOnce({ records }).mockRejectedValueOnce(Object.assign(new Error('Network Error'), { code: 'NETWORK' }));
    const error: any = await run('Approve latest');
    expect(error.message).toContain('kintone に書き込まれたかどうか確認できません');
    expect(error.message).not.toContain('revision 競合');
    expect(error.revisionConflict).toBeUndefined();
  });

  it('a kintone rejection for another reason keeps its own reason', async () => {
    api.mockResolvedValueOnce({ records }).mockRejectedValueOnce({ code: 'GAIA_IL20', id: 'req-1', message: '指定したアクションを実行できません。' });
    const error: any = await run('Resolve conflict');
    expect(error.message).toContain('指定したアクションを実行できません。');
    expect(error.message).not.toContain('revision 競合');
  });

  it('a real revision conflict is still reported as one', async () => {
    api.mockResolvedValueOnce({ records }).mockRejectedValueOnce({ code: 'GAIA_CO02', id: 'req-2', message: '指定したrevisionは最新ではありません。' });
    const error: any = await run('Approve latest');
    expect(error.message).toContain('revision 競合');
  });
});

describe('field addition: field names like "Revision" and "Conflict" do not turn a rejection into "revision 競合"', () => {
  const api = vi.fn();
  const confirm = vi.fn();
  beforeEach(() => {
    api.mockReset();
    confirm.mockReset().mockReturnValue(true);
    vi.stubGlobal('kintone', { api });
    vi.stubGlobal('window', { confirm });
  });

  it('shows the kintone reason, not a revision conflict', async () => {
    api.mockImplementation(async (_url: string, method: string) => {
      if (method === 'GET') return { properties: {}, revision: '9' };
      throw { code: 'CB_VA01', id: 'req-3', message: '入力内容が正しくありません。' };
    });
    const fieldJson = JSON.stringify({ properties: { rev: { type: 'SINGLE_LINE_TEXT', code: 'rev', label: 'Revision' }, flag: { type: 'SINGLE_LINE_TEXT', code: 'flag', label: 'Conflict flag' } } });
    const error: any = await runFieldApplyStandalone({ targetAppId: '5', targetGuestId: '', fieldJson, lookupMapJson: '', overwrite: false }, vi.fn()).catch((caught) => caught);
    expect(error.message).toContain('入力内容が正しくありません。');
    expect(error.message).not.toContain('revision 競合');
  });
});
