import { afterEach, describe, expect, it, vi } from 'vitest';
import { inspectTargetPendingChanges, reconcileOwnPendingChanges } from '../../src/reflect/targetPending';
import { previewReflectStandalone } from '../../src/tabs/reflect-standalone';

const field = (code: string, label = code) => ({ type: 'SINGLE_LINE_TEXT', code, label, required: false });
const copy = (value: any) => JSON.parse(JSON.stringify(value));
const previewBundle = (sections: Record<string, any>, revision = '20') => ({ appId: '2', meta: { sectionRevisions: Object.fromEntries(Object.keys(sections).map(key => [key, revision])) }, sections });

/** 本番とプレビューの設定を URL で出し分けるモック。 */
function mockKintone(production: { revision: string; sections?: Record<string, any>; fail?: string }) {
  const endpoints: Record<string, string> = { '/app/settings.json': 'appSettings', '/app/form/fields.json': 'fieldSettings', '/app/views.json': 'viewSettings', '/app/customize.json': 'customizeSettings' };
  const api = vi.fn(async (url: string, method: string) => {
    if (method !== 'GET') throw new Error(`Unexpected write: ${method} ${url}`);
    if (production.fail) throw new Error(production.fail);
    const endpoint = Object.keys(endpoints).find(item => url.endsWith(item));
    if (!endpoint || url.includes('/preview/')) throw new Error(`Unexpected endpoint: ${url}`);
    const key = endpoints[endpoint];
    return { ...copy(production.sections?.[key] ?? {}), revision: production.revision };
  });
  vi.stubGlobal('kintone', { api });
  return api;
}

describe('反映先プレビューの未公開の変更の確認', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('revision が一致すれば clean とし、本番のバンドルは取得しない', async () => {
    const api = mockKintone({ revision: '20' });
    const result = await inspectTargetPendingChanges({ targetAppId: '2', scopes: ['fieldSettings', 'viewSettings'] }, previewBundle({ fieldSettings: { properties: {}, revision: '20' }, viewSettings: { views: {}, revision: '20' } }));
    expect(result).toEqual({ state: 'clean', productionRevision: '20', previewRevision: '20', sectionKeys: [], message: '反映先プレビューに未公開の変更はありません。' });
    expect(api.mock.calls.map(([url, method, params]) => [url, method, params])).toEqual([['/k/v1/app/settings.json', 'GET', { app: '2' }]]);
  });
  it('取得できていない項目や、項目間で revision が食い違う場合は clean と判定しない', async () => {
    const api = mockKintone({ revision: '18' });
    const failed = await inspectTargetPendingChanges({ targetAppId: '2', scopes: ['fieldSettings', 'viewSettings'] }, previewBundle({ fieldSettings: { properties: {}, revision: '18' }, viewSettings: { _fetchError: '取得失敗' } }, '18'));
    expect(failed.state).toBe('unknown');
    const mixed = previewBundle({ fieldSettings: { properties: {}, revision: '18' }, viewSettings: { views: {}, revision: '20' } });
    mixed.meta.sectionRevisions = { fieldSettings: '18', viewSettings: '20' };
    const result = await inspectTargetPendingChanges({ targetAppId: '2', scopes: ['fieldSettings', 'viewSettings'] }, mixed);
    expect(result.state).toBe('unknown');
    expect(result.message).toContain('更新された可能性');
    expect(api).not.toHaveBeenCalled();
  });
  it('JS/CSS は fileKey の違いではなく、ファイル名とサイズの違いだけを未公開の変更として扱う', async () => {
    const js = (fileKey: string, name = 'app.js', size = '10') => ({ type: 'FILE', file: { fileKey, name, size } });
    const customize = (list: any[]) => ({ scope: 'ALL', desktop: { js: list, css: [] }, mobile: { js: [], css: [] } });
    mockKintone({ revision: '18', sections: { customizeSettings: customize([js('prod-key')]) } });
    const sameContent = await inspectTargetPendingChanges({ targetAppId: '2', scopes: ['customizeSettings'] }, previewBundle({ customizeSettings: { ...customize([js('preview-key')]), revision: '20' } }));
    expect(sameContent.sectionKeys).toEqual([]);
    const changed = await inspectTargetPendingChanges({ targetAppId: '2', scopes: ['customizeSettings'] }, previewBundle({ customizeSettings: { ...customize([js('preview-key', 'app.js', '12')]), revision: '20' } }));
    expect(changed.sectionKeys).toEqual(['customizeSettings']);
  });
  it('revision が異なれば pending とし、内容が異なるセクションを列挙する', async () => {
    const api = mockKintone({ revision: '18', sections: {
      fieldSettings: { properties: { name: field('name', '本番') } },
      viewSettings: { views: { List: { type: 'LIST', fields: [], index: '0' } } }
    } });
    const bundle = previewBundle({
      fieldSettings: { properties: { name: field('name', 'プレビュー') }, revision: '20' },
      viewSettings: { views: { List: { type: 'LIST', fields: [], index: '0' } }, revision: '20' }
    });
    const result = await inspectTargetPendingChanges({ targetAppId: '2', scopes: ['fieldSettings', 'viewSettings'] }, bundle);
    expect(result.state).toBe('pending');
    expect(result.sectionKeys).toEqual(['fieldSettings']);
    expect([result.productionRevision, result.previewRevision]).toEqual(['18', '20']);
    expect(result.message).toBe('反映先プレビューには未公開の変更があります（フィールド設定）。公開すると今回の反映と一緒に本番へ反映されます。');
    expect(api.mock.calls.every(([url]) => !String(url).includes('/preview/'))).toBe(true);
  });
  it('複数のセクションが異なるときはまとめて示す', async () => {
    mockKintone({ revision: '18', sections: { fieldSettings: { properties: {} }, viewSettings: { views: {} } } });
    const result = await inspectTargetPendingChanges({ targetAppId: '2', scopes: ['fieldSettings', 'viewSettings'] }, previewBundle({
      fieldSettings: { properties: { added: field('added') }, revision: '20' }, viewSettings: { views: { New: { type: 'LIST' } }, revision: '20' }
    }));
    expect(result.sectionKeys).toEqual(['fieldSettings', 'viewSettings']);
    expect(result.message).toContain('（フィールド設定、ビュー設定）');
  });
  it('revision だけが違い、選択した項目が同じならその旨を示す', async () => {
    mockKintone({ revision: '18', sections: { fieldSettings: { properties: { name: field('name') } } } });
    const result = await inspectTargetPendingChanges({ targetAppId: '2', scopes: ['fieldSettings'] }, previewBundle({ fieldSettings: { properties: { name: field('name') }, revision: '20' } }));
    expect(result.state).toBe('pending'); expect(result.sectionKeys).toEqual([]);
    expect(result.message).toBe('選択した項目には未公開の変更はありませんが、ほかの設定に未公開の変更がある可能性があります（設定の更新番号 revision が 本番 18 とプレビュー 20 で異なります）。');
  });
  it('ゲストスペースでは guest prefix の本番 API を読む', async () => {
    const api = mockKintone({ revision: '18', sections: { fieldSettings: { properties: {} } } });
    await inspectTargetPendingChanges({ targetAppId: '2', targetGuestId: '7', scopes: ['fieldSettings'] }, previewBundle({ fieldSettings: { properties: {}, revision: '20' } }));
    const urls = api.mock.calls.map(([url]) => url);
    expect(urls).toEqual(['/k/guest/7/v1/app/settings.json', '/k/guest/7/v1/app/form/fields.json']);
  });
  it('取得に失敗しても例外にならず unknown を返す', async () => {
    mockKintone({ revision: '18', fail: '権限がありません' });
    const result = await inspectTargetPendingChanges({ targetAppId: '2', scopes: ['fieldSettings'] }, previewBundle({ fieldSettings: { properties: {}, revision: '20' } }));
    expect(result.state).toBe('unknown'); expect(result.sectionKeys).toEqual([]);
    expect(result.message).toContain('確認できませんでした'); expect(result.message).toContain('権限がありません');
  });
  it('反映先プレビューや本番のrevisionが無ければ unknown とし、不完全なセクションも unknown とする', async () => {
    const api = mockKintone({ revision: '18' });
    const noPreview = await inspectTargetPendingChanges({ targetAppId: '2', scopes: ['fieldSettings'] }, { sections: { fieldSettings: { properties: {} } } });
    expect(noPreview.state).toBe('unknown'); expect(api).not.toHaveBeenCalled();
    vi.stubGlobal('kintone', { api: vi.fn(async () => ({ properties: {} })) });
    expect((await inspectTargetPendingChanges({ targetAppId: '2', scopes: ['fieldSettings'] }, previewBundle({ fieldSettings: { properties: {}, revision: '20' } }))).state).toBe('unknown');
    mockKintone({ revision: '18', sections: { fieldSettings: { properties: {} } } });
    const partial = await inspectTargetPendingChanges({ targetAppId: '2', scopes: ['fieldSettings'] }, previewBundle({ fieldSettings: { _fetchError: '失敗' } }));
    expect(partial.state).toBe('unknown'); expect(partial.message).toContain('フィールド設定');
  });
  it('previewReflectStandalone が targetPending を返し、状況メッセージを出す', async () => {
    const api = vi.fn(async (url: string, method: string) => {
      if (method !== 'GET') throw new Error('unexpected write');
      if (url === '/k/v1/app/settings.json') return { revision: '9' };
      if (url === '/k/v1/app/form/fields.json') return { properties: {}, revision: '9' };
      if (url === '/k/v1/preview/app/form/fields.json') return { properties: { local: field('local') }, revision: '12' };
      throw new Error(`Unexpected endpoint: ${url}`);
    });
    vi.stubGlobal('kintone', { api });
    const messages: string[] = [];
    const preview = await previewReflectStandalone({ sourceAppId: '1', targetAppId: '2', scopes: ['fieldSettings'], sourceBundle: { appId: '1', sections: { fieldSettings: { properties: { name: field('name') } } } } }, message => messages.push(message));
    expect(messages).toContain('反映先の未公開の変更を確認中…');
    expect(preview.targetPending).toMatchObject({ state: 'pending', productionRevision: '9', previewRevision: '12', sectionKeys: ['fieldSettings'] });
    expect(api.mock.calls.every(([, method]) => method === 'GET')).toBe(true);
  });
  it('未公開の変更の確認に失敗しても差分確認は続けられる', async () => {
    vi.stubGlobal('kintone', { api: vi.fn(async (url: string) => {
      if (url === '/k/v1/preview/app/form/fields.json') return { properties: {}, revision: '12' };
      throw new Error('本番を読めません');
    }) });
    const preview = await previewReflectStandalone({ sourceAppId: '1', targetAppId: '2', scopes: ['fieldSettings'], sourceBundle: { appId: '1', sections: { fieldSettings: { properties: { name: field('name') } } } } }, () => {});
    expect(preview.targetPending?.state).toBe('unknown');
    expect(preview.entries[0].status).toBe('change');
  });
});

describe('直前の反映分を「以前からの未公開の変更」と区別する', () => {
  const pending = { state: 'pending' as const, productionRevision: '20', previewRevision: '24', sectionKeys: ['fieldSettings'], message: '未公開あり' };
  const target = { appId: '2', guestId: '' };
  it('同じ反映先で、最終 revision が一致し、反映前が clean なら own にする', () => {
    const result = reconcileOwnPendingChanges(pending, { targetAppId: '2', targetGuestId: '', finalRevision: '24', priorState: 'clean' }, target);
    expect(result?.state).toBe('own');
    expect(result?.message).toContain('直前の反映によるものだけ');
    expect(reconcileOwnPendingChanges(pending, { targetAppId: '2', targetGuestId: '', finalRevision: '24', priorState: 'own' }, target)?.state).toBe('own');
  });
  it('別の反映先・別の revision・反映前から未公開の変更があった場合は pending のまま', () => {
    expect(reconcileOwnPendingChanges(pending, { targetAppId: '3', targetGuestId: '', finalRevision: '24', priorState: 'clean' }, target)?.state).toBe('pending');
    expect(reconcileOwnPendingChanges(pending, { targetAppId: '2', targetGuestId: '5', finalRevision: '24', priorState: 'clean' }, target)?.state).toBe('pending');
    expect(reconcileOwnPendingChanges(pending, { targetAppId: '2', targetGuestId: '', finalRevision: '23', priorState: 'clean' }, target)?.state).toBe('pending');
    expect(reconcileOwnPendingChanges(pending, { targetAppId: '2', targetGuestId: '', finalRevision: '24', priorState: 'pending' }, target)?.state).toBe('pending');
    expect(reconcileOwnPendingChanges(pending, { targetAppId: '2', targetGuestId: '', finalRevision: '', priorState: 'clean' }, target)?.state).toBe('pending');
    expect(reconcileOwnPendingChanges(pending, null, target)?.state).toBe('pending');
  });
  it('clean / unknown / 未取得はそのまま返す', () => {
    const clean = { ...pending, state: 'clean' as const };
    expect(reconcileOwnPendingChanges(clean, { targetAppId: '2', targetGuestId: '', finalRevision: '24', priorState: 'clean' }, target)).toBe(clean);
    expect(reconcileOwnPendingChanges(undefined, { targetAppId: '2', targetGuestId: '', finalRevision: '24', priorState: 'clean' }, target)).toBeUndefined();
  });
});
