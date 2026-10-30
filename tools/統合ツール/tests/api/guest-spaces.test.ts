import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchAllApps, fetchAllAppsIncludingGuestSpaces, findGuestSpaces, GUEST_SPACE_PROBE_LIMIT, type EnvironmentAppsResult } from '../../src/api';
import { describeEnvironmentAppsProgress, summarizeEnvironmentApps } from '../../src/entries/environmentApps';
import { __resetRunControlForTests, beginRun, requestCancel } from '../../src/runControl';

afterEach(() => {
  __resetRunControlForTests();
  vi.unstubAllGlobals();
});

const kintoneError = (code: string, message = 'エラー') => Object.assign(new Error(message), { code });

/** `/k/guest/{id}/v1/space.json` の応答を、ゲストスペースID → 名前の表から作る模擬 API。 */
function stubKintone(guests: Record<string, string>, extra: (url: string, params: any) => any = () => undefined) {
  const api = vi.fn(async (url: string, _method: string, params: any) => {
    const handled = await extra(url, params);
    if (handled !== undefined) return handled;
    const space = url.match(/^\/k\/guest\/(\d+)\/v1\/space\.json$/);
    if (space) {
      if (space[1] in guests) return { id: space[1], name: guests[space[1]], isGuest: true };
      throw kintoneError('GAIA_SP01', 'スペースが見つかりません');
    }
    throw new Error(`unexpected ${url}`);
  });
  vi.stubGlobal('kintone', { api });
  return api;
}

const probedIds = (api: ReturnType<typeof vi.fn>) => api.mock.calls
  .map((call) => String(call[0]).match(/^\/k\/guest\/(\d+)\/v1\/space\.json$/)?.[1])
  .filter(Boolean)
  .map(Number);

describe('findGuestSpaces', () => {
  it('checks unknown space ids up to the tail after the largest known id and extends it after each guest space', async () => {
    const api = stubKintone({ 2: 'A', 6: 'B' });
    const progress = vi.fn();
    const result = await findGuestSpaces({ knownSpaceIds: ['1', 3, null, 'x'], tail: 3, onProgress: progress });
    expect(result).toEqual({
      spaces: [{ guestId: '2', name: 'A' }, { guestId: '6', name: 'B' }],
      checkedUpTo: 9,
      checked: 7,
      unconfirmed: [],
      limited: false
    });
    expect(probedIds(api)).toEqual([2, 4, 5, 6, 7, 8, 9]);
    expect(api).toHaveBeenCalledWith('/k/guest/2/v1/space.json', 'GET', { id: 2 });
    expect(progress.mock.calls.at(-1)).toEqual([9, 2]);
  });

  it('does not treat a normal space returned on the guest URL as a guest space and keeps failed checks visible', async () => {
    const api = stubKintone({}, (url) => {
      if (url === '/k/guest/1/v1/space.json') return { id: '1', name: '通常', isGuest: false };
      if (url === '/k/guest/2/v1/space.json') return { id: '9', name: '別のスペース', isGuest: true };
      if (url === '/k/guest/3/v1/space.json') throw new Error('予期しない応答');
      if (url === '/k/guest/4/v1/space.json') throw new Error('network error');
      return undefined;
    });
    const result = await findGuestSpaces({ tail: 4 });
    expect(result.spaces).toEqual([]);
    expect(result.unconfirmed).toEqual(['3', '4']);
    // 通信エラーは再試行してから確かめられなかったものとして残す
    expect(api.mock.calls.filter((call) => call[0] === '/k/guest/4/v1/space.json')).toHaveLength(2);
  });

  it('stops at the probe limit but still checks the guest space ids the user typed', async () => {
    const api = stubKintone({ 20: '指定したゲスト' });
    const result = await findGuestSpaces({ extraGuestIds: ['20', '', '0'], tail: 10, limit: 3 });
    expect(result).toMatchObject({ spaces: [{ guestId: '20', name: '指定したゲスト' }], checkedUpTo: 3, checked: 4, limited: true });
    expect(probedIds(api)).toEqual([1, 2, 3, 20]);
  });

  it('checks a typed guest space id even when the regular app list reported it as a space', async () => {
    const api = stubKintone({ 2: 'G' });
    const result = await findGuestSpaces({ knownSpaceIds: ['2'], extraGuestIds: ['2'], tail: 1 });
    expect(result.spaces).toEqual([{ guestId: '2', name: 'G' }]);
    expect(probedIds(api)).toEqual([1, 2, 3]);
  });

  it('stops before the next batch when the caller asks it to', async () => {
    let stop = false;
    const api = stubKintone({}, (url) => {
      if (url === '/k/guest/2/v1/space.json') stop = true;
      return undefined;
    });
    await expect(findGuestSpaces({ tail: 50, shouldStop: () => stop })).rejects.toMatchObject({ name: 'RunCancelledError' });
    expect(probedIds(api)).toEqual([1, 2, 3, 4]);
  });

  it('stops immediately when the run is cancelled', async () => {
    beginRun();
    const api = stubKintone({}, (url) => {
      if (url === '/k/guest/1/v1/space.json') requestCancel();
      return undefined;
    });
    await expect(findGuestSpaces({ tail: 50 })).rejects.toMatchObject({ name: 'RunCancelledError' });
    expect(Math.max(...probedIds(api))).toBeLessThanOrEqual(4);
  });
});

describe('fetchAllApps with a space id', () => {
  it('narrows the app list to that space', async () => {
    const api = vi.fn().mockResolvedValueOnce({ apps: [{ appId: '3', spaceId: '5' }] });
    vi.stubGlobal('kintone', { api });
    await fetchAllApps('5', undefined, { spaceId: '5' });
    expect(api).toHaveBeenCalledWith('/k/guest/5/v1/apps.json', 'GET', { limit: 100, offset: 0, spaceIds: ['5'] });
  });
});

describe('fetchAllAppsIncludingGuestSpaces', () => {
  it('adds the apps of every guest space found, tagged with the guest space id, and keeps going after a failure', async () => {
    const api = stubKintone({ 2: '取引先A', 4: '取引先B' }, (url, params) => {
      if (url === '/k/v1/apps.json') return { apps: [{ appId: '10', name: '通常', spaceId: '1' }, { appId: '30', name: 'スペース外', spaceId: null }] };
      if (url === '/k/guest/2/v1/apps.json') {
        expect(params).toEqual({ limit: 100, offset: 0, spaceIds: ['2'] });
        return { apps: [{ appId: '20', name: 'ゲストA', spaceId: '2' }, { appId: '10', name: '重複', spaceId: '2' }] };
      }
      if (url === '/k/guest/4/v1/apps.json') throw kintoneError('CB_NO02', '権限がありません。\n[API] GET /k/guest/4/v1/apps.json');
      return undefined;
    });
    const phases: string[] = [];
    const result = await fetchAllAppsIncludingGuestSpaces({ onProgress: (progress) => phases.push(progress.phase) });
    expect(result.apps.map((entry) => [entry.app.appId, entry.guestId])).toEqual([['10', '2'], ['20', '2'], ['30', '']]);
    expect(result.guestSpaces).toEqual([
      { guestId: '2', name: '取引先A', appCount: 2 },
      { guestId: '4', name: '取引先B', appCount: 0, error: '権限がありません。' }
    ]);
    // 通常スペース 1 は確かめず、見つかった最後のゲストスペース 4 の 50 件先まで確かめる
    expect(probedIds(api)).not.toContain(1);
    expect(result.search.checkedUpTo).toBe(54);
    expect([...new Set(phases)]).toEqual(['apps', 'guest-spaces', 'guest-apps']);
  });
});

describe('summarizeEnvironmentApps', () => {
  const base = (patch: Partial<EnvironmentAppsResult> = {}): EnvironmentAppsResult => ({
    apps: [{ app: { appId: '1' }, guestId: '' }, { app: { appId: '2' }, guestId: '5' }, { app: { appId: '3' }, guestId: '5' }],
    guestSpaces: [{ guestId: '5', name: '取引先', appCount: 2 }],
    search: { spaces: [{ guestId: '5', name: '取引先' }], checkedUpTo: 55, checked: 40, unconfirmed: [], limited: false },
    ...patch
  });

  it('reports the regular and guest space counts and the checked range', () => {
    const summary = summarizeEnvironmentApps(base(), { canApplyAll: true });
    expect(summary.tone).toBe('ok');
    expect(summary.message).toBe('環境内のアプリ 3件を表示しました（通常スペース・スペース外 1件、ゲストスペース 1か所 2件）。「すべて…」でまとめて設定できます');
    expect(summary.headSuffix).toBe('（うちゲストスペース 1か所の 2件）');
    expect(summary.scope).toContain('スペースID 1〜55 を順に確かめて 1か所見つかりました');
  });

  it('warns about failed guest spaces, unconfirmed ids, the probe limit and a typed id that was not found', () => {
    const summary = summarizeEnvironmentApps(base({
      guestSpaces: [{ guestId: '5', name: '取引先', appCount: 2 }, { guestId: '7', name: '', appCount: 0, error: '権限がありません。' }],
      search: { spaces: [], checkedUpTo: 2000, checked: 2000, unconfirmed: ['3', '4', '8', '9', '11', '12'], limited: true }
    }), { typedGuestId: '99', canApplyAll: true });
    expect(summary.tone).toBe('warn');
    expect(summary.message).toContain('ゲストスペースのアプリ一覧の取得に失敗 1か所（ゲストスペース 7: 権限がありません。）');
    expect(summary.message).toContain('確かめられなかったスペースID 6件（3・4・8・9・11 ほか 1 件。通信エラーなど）');
    expect(summary.message).toContain(`確かめる件数の上限（${GUEST_SPACE_PROBE_LIMIT}件）に達したため、スペースID 2000 より後は確かめていません`);
    expect(summary.message).toContain('ゲストスペース 99 は見つかりませんでした');
    expect(summary.message).not.toContain('まとめて設定できます');
  });

  it('says when no guest space and no app was found', () => {
    const summary = summarizeEnvironmentApps({ apps: [], guestSpaces: [], search: { spaces: [], checkedUpTo: 50, checked: 50, unconfirmed: [], limited: false } });
    expect(summary).toMatchObject({ tone: 'info', headSuffix: '' });
    expect(summary.message).toBe('閲覧できるアプリがありません（通常スペース・スペース外とゲストスペース）');
    expect(summary.scope).toContain('閲覧できるゲストスペースは見つかりませんでした');
  });

  it('describes each progress phase', () => {
    expect(describeEnvironmentAppsProgress({ phase: 'apps', fetched: 100 })).toBe('環境内の全アプリを取得中…（100件）');
    expect(describeEnvironmentAppsProgress({ phase: 'guest-spaces', checkedUpTo: 40, found: 2 })).toContain('スペースID 40 まで確認、2か所が見つかりました');
    expect(describeEnvironmentAppsProgress({ phase: 'guest-apps', index: 1, total: 2, guestId: '5', fetched: 3 })).toContain('1/2か所目: ゲストスペース 5、3件');
  });
});
