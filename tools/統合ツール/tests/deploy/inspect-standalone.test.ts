import { afterEach, describe, expect, it, vi } from 'vitest';
import { inspectDeployTargetsStandalone, validateDeployTargets } from '../../src/tabs/deploy-standalone';
import { RunCancelledError, __resetRunControlForTests, beginRun, requestCancel } from '../../src/runControl';
import { createFakeKintone, field, makeApp, type FakeApp, type FakeOptions } from './fake-kintone';

afterEach(() => {
  __resetRunControlForTests();
  vi.unstubAllGlobals();
});

const fields = (...items: any[]) => ({ properties: Object.fromEntries(items.map(item => [item.code, item])) });

/** 本番とプレビューの revision が異なり、フィールドが 1 つ追加されたアプリ。 */
const changedApp = (overrides: Partial<FakeApp> = {}): FakeApp => makeApp({
  prodRevision: '10', previewRevision: '12',
  production: { fieldSettings: fields(field('name', '名前')) },
  preview: { fieldSettings: fields(field('name', '名前'), field('added', '追加項目')) },
  ...overrides
});

function setup(apps: Record<string, FakeApp>, options: FakeOptions = {}) {
  const env = createFakeKintone(apps, options);
  vi.stubGlobal('kintone', { api: env.api });
  return env;
}

describe('validateDeployTargets', () => {
  const ref = (appId: string, guestId = '') => ({ appId, guestId });

  it('問題が無ければ空文字を返す', () => {
    expect(validateDeployTargets([ref('1'), ref('2'), ref('1', '5')], 'sequential')).toBe('');
    expect(validateDeployTargets([ref('1'), ref('2')], 'atomic')).toBe('');
    expect(validateDeployTargets([ref('1', '5'), ref('2', '5')], 'atomic')).toBe('');
  });

  it('未入力・形式・件数・重複を 1 文で返す', () => {
    expect(validateDeployTargets([], 'sequential')).toMatch(/入力/);
    expect(validateDeployTargets([ref('')], 'sequential')).toMatch(/空/);
    expect(validateDeployTargets([ref('abc')], 'sequential')).toContain('abc');
    expect(validateDeployTargets([ref('0')], 'sequential')).toContain('正の整数');
    expect(validateDeployTargets([ref('-1')], 'sequential')).toContain('正の整数');
    expect(validateDeployTargets([ref('1.5')], 'sequential')).toContain('正の整数');
    expect(validateDeployTargets([ref('1', 'x')], 'sequential')).toContain('ゲストスペースID');
    expect(validateDeployTargets(Array.from({ length: 1001 }, (_, index) => ref(String(index + 1))), 'sequential')).toContain('1000');
    expect(validateDeployTargets(Array.from({ length: 1000 }, (_, index) => ref(String(index + 1))), 'sequential')).toBe('');
    expect(validateDeployTargets([ref('1'), ref(' 1 ')], 'sequential')).toMatch(/重複.*App 1/);
    // 同じアプリIDでもスペースが違えば別のアプリ
    expect(validateDeployTargets([ref('1'), ref('1', '5')], 'sequential')).toBe('');
  });

  it('まとめて反映は 300 件まで・同じスペースだけ', () => {
    expect(validateDeployTargets(Array.from({ length: 300 }, (_, index) => ref(String(index + 1))), 'atomic')).toBe('');
    expect(validateDeployTargets(Array.from({ length: 301 }, (_, index) => ref(String(index + 1))), 'atomic')).toContain('300');
    expect(validateDeployTargets([ref('1'), ref('2', '5')], 'atomic')).toMatch(/同じスペース/);
    expect(validateDeployTargets([ref('1', '4'), ref('2', '5')], 'atomic')).toMatch(/同じスペース/);
  });
});

describe('inspectDeployTargetsStandalone', () => {
  it('revision が一致するアプリは clean とし、設定の本体は取得しない', async () => {
    const env = setup({ '1': makeApp({ name: '顧客管理' }) });
    const result = await inspectDeployTargetsStandalone({ targets: [{ appId: '1', guestId: '' }] });
    expect(result.counts).toEqual({ changes: 0, clean: 1, error: 0, processing: 0 });
    expect(result.apps[0]).toMatchObject({ appId: '1', name: '顧客管理', state: 'clean', productionRevision: '10', previewRevision: '10', sections: [], removedFields: [], warnings: [] });
    expect(result.apps[0].productionBundle).toBeUndefined();
    expect(result.apps[0].previewBundle).toBeUndefined();
    expect(env.calls.map(call => `${call.method} ${call.url}`).sort()).toEqual(['GET /k/v1/app/settings.json', 'GET /k/v1/preview/app/settings.json']);
    expect(env.writes()).toEqual([]);
  });

  it('revision が異なるアプリは項目ごとの差分・削除フィールド・件数を返し、バックアップ用の取得値を持つ', async () => {
    const env = setup({
      '7': changedApp({
        name: '案件',
        production: { fieldSettings: fields(field('name', '名前'), field('old_code', '旧項目')), viewSettings: { views: { 一覧: { type: 'LIST', index: '0', name: '一覧', fields: ['name'] } } } },
        preview: { fieldSettings: fields(field('name', '名前'), field('new_code', '旧項目'), field('extra', '追加')), viewSettings: { views: { 一覧: { type: 'LIST', index: '0', name: '一覧', fields: ['name'] } } } }
      })
    });
    const result = await inspectDeployTargetsStandalone({ targets: [{ appId: '7', guestId: '' }], sections: ['fieldSettings', 'viewSettings'] });
    const app = result.apps[0];
    expect(result.counts).toEqual({ changes: 1, clean: 0, error: 0, processing: 0 });
    expect(app).toMatchObject({ state: 'changes', name: '案件', productionRevision: '10', previewRevision: '12', contentSame: false });
    expect(app.sections.map(section => [section.sectionKey, section.status])).toEqual([['fieldSettings', 'change'], ['viewSettings', 'same']]);
    expect(app.sections[0].counts).toEqual({ added: 2, changed: 0, removed: 1 });
    expect(app.removedFields).toEqual([{ code: 'old_code', label: '旧項目', type: 'SINGLE_LINE_TEXT', possibleRename: 'new_code' }]);
    expect(app.productionBundle?.sections.fieldSettings.properties.old_code).toBeDefined();
    expect(app.previewBundle?.sections.fieldSettings.properties.extra).toBeDefined();
    expect(app.productionBundle?.preview).toBe(false);
    expect(app.previewBundle?.preview).toBe(true);
    expect(env.writes()).toEqual([]);
  });

  it('項目の既定は、プレビュー反映でバックアップから戻せる項目すべて（一般設定を含む）', async () => {
    const env = setup({ '1': changedApp() });
    const result = await inspectDeployTargetsStandalone({ targets: [{ appId: '1', guestId: '' }] });
    const keys = result.apps[0].sections.map(section => section.sectionKey);
    expect(keys).toContain('appSettings');
    expect(keys).toContain('fieldSettings');
    expect(keys).not.toContain('appInfo');
    expect(env.calls.filter(call => call.url === '/k/v1/app/form/fields.json')).toHaveLength(1);
  });

  it('revision だけが違い内容が同じときは contentSame とし、注意を付ける', async () => {
    setup({ '1': makeApp({ prodRevision: '10', previewRevision: '11', production: { fieldSettings: fields(field('a')) }, preview: { fieldSettings: fields(field('a')) } }) });
    const result = await inspectDeployTargetsStandalone({ targets: [{ appId: '1', guestId: '' }], sections: ['fieldSettings'] });
    expect(result.apps[0]).toMatchObject({ state: 'changes', contentSame: true });
    expect(result.apps[0].warnings.join()).toContain('revision');
  });

  it('JS/CSS は fileKey ではなくファイル名とサイズで比べる', async () => {
    const customize = (fileKey: string, size: string) => ({ scope: 'ALL', desktop: { js: [{ type: 'FILE', file: { fileKey, name: 'app.js', size } }], css: [] }, mobile: { js: [], css: [] } });
    setup({
      '1': makeApp({ prodRevision: '1', previewRevision: '2', production: { customizeSettings: customize('prod', '10') }, preview: { customizeSettings: customize('preview', '10') } }),
      '2': makeApp({ prodRevision: '1', previewRevision: '2', production: { customizeSettings: customize('prod', '10') }, preview: { customizeSettings: customize('preview', '11') } })
    });
    const result = await inspectDeployTargetsStandalone({ targets: [{ appId: '1', guestId: '' }, { appId: '2', guestId: '' }], sections: ['customizeSettings'] });
    expect(result.apps[0]).toMatchObject({ state: 'changes', contentSame: true });
    expect(result.apps[1].sections[0].status).toBe('change');
  });

  it('結果は targets と同じ順で、進捗を通知する', async () => {
    setup({ '3': makeApp({ name: 'C' }), '1': changedApp({ name: 'A' }), '2': makeApp({ name: 'B', prodRevision: '5', previewRevision: '5' }) });
    const progress: Array<[number, number, string]> = [];
    const result = await inspectDeployTargetsStandalone({
      targets: [{ appId: '3', guestId: '' }, { appId: '1', guestId: '' }, { appId: '2', guestId: '' }],
      sections: ['fieldSettings'],
      onProgress: (done, total, label) => progress.push([done, total, label])
    });
    expect(result.apps.map(app => app.appId)).toEqual(['3', '1', '2']);
    expect(result.apps.map(app => app.state)).toEqual(['clean', 'changes', 'clean']);
    expect(progress.map(item => item[0])).toEqual([1, 2, 3]);
    expect(progress.every(item => item[1] === 3)).toBe(true);
    expect(new Date(result.inspectedAt).toString()).not.toBe('Invalid Date');
  });

  it('ゲストスペースのアプリはゲスト用の URL で取得する', async () => {
    const env = setup({ '9': makeApp() });
    await inspectDeployTargetsStandalone({ targets: [{ appId: '9', guestId: '4' }] });
    expect(env.calls.map(call => call.url).sort()).toEqual(['/k/guest/4/v1/app/settings.json', '/k/guest/4/v1/preview/app/settings.json']);
  });

  it('設定を取得できないアプリは error とし、ほかのアプリは確認を続ける', async () => {
    setup({ '1': makeApp() });
    const result = await inspectDeployTargetsStandalone({ targets: [{ appId: '404', guestId: '' }, { appId: '1', guestId: '' }, { appId: 'abc', guestId: '' }] });
    expect(result.counts).toEqual({ changes: 0, clean: 1, error: 2, processing: 0 });
    expect(result.apps[0].state).toBe('error');
    expect(result.apps[0].error).toContain('本番の設定を取得できません');
    expect(result.apps[0].error).toContain('アプリID・ゲストスペース・アプリ管理の権限を確認してください。');
    expect(result.apps[0].error).not.toContain('[API]');
    expect(result.apps[1].state).toBe('clean');
    expect(result.apps[2].error).toContain('正しくありません');
  });

  it('一部の項目を取得できないアプリは error とし、どの項目かを残す', async () => {
    setup({ '1': changedApp() }, {
      onGet: (call) => { if (call.url === '/k/v1/preview/app/views.json') throw Object.assign(new Error('サーバーエラー'), { status: 400 }); }
    });
    const result = await inspectDeployTargetsStandalone({ targets: [{ appId: '1', guestId: '' }], sections: ['fieldSettings', 'viewSettings'] });
    const app = result.apps[0];
    expect(app.state).toBe('error');
    expect(app.error).toContain('ビュー設定');
    expect(app.sections.map(section => section.status)).toEqual(['change', 'error']);
    expect(app.sections[1].message).toContain('プレビューのビュー設定を取得できません');
    expect(app.productionBundle).toBeUndefined();
  });

  it('取得中に設定が更新されたアプリは error とする', async () => {
    setup({ '1': changedApp() }, {
      onGet: (call, apps) => { if (call.url === '/k/v1/preview/app/views.json') apps['1'].previewRevision = '99'; }
    });
    const result = await inspectDeployTargetsStandalone({ targets: [{ appId: '1', guestId: '' }], sections: ['fieldSettings', 'viewSettings'] });
    expect(result.apps[0]).toMatchObject({ state: 'error', error: '取得中に設定が更新されました。確認し直してください。', productionRevision: '10', previewRevision: '12' });
  });

  it('kintone が前回の反映を処理中のアプリは processing とし、設定の取得値は持たない', async () => {
    const env = setup({ '1': changedApp(), '2': changedApp(), '3': makeApp() });
    env.deployments.push({ ids: ['1'], revert: false, polls: 99, done: false, result: {} });
    const result = await inspectDeployTargetsStandalone({ targets: [{ appId: '1', guestId: '' }, { appId: '2', guestId: '' }, { appId: '3', guestId: '' }], sections: ['fieldSettings'] });
    expect(result.counts).toEqual({ changes: 1, clean: 1, error: 0, processing: 1 });
    expect(result.apps[0]).toMatchObject({ state: 'processing', error: '前回の反映を kintone が処理中です。完了してから確認し直してください。', sections: [] });
    expect(result.apps[0].productionBundle).toBeUndefined();
    expect(result.apps[1].state).toBe('changes');
    // 状態の確認は変更のあるアプリだけ、スペースごとに 1 回
    const statusCalls = env.calls.filter(call => call.url.endsWith('/preview/app/deploy.json'));
    expect(statusCalls).toHaveLength(1);
    expect(statusCalls[0].params).toEqual({ apps: ['1', '2'] });
  });

  it('処理状況の確認は 300 件ずつ、スペースごとに分ける。失敗しても止めず注意に入れる', async () => {
    const apps: Record<string, FakeApp> = {};
    for (let id = 1; id <= 301; id++) apps[String(id)] = changedApp();
    apps['900'] = changedApp();
    const env = setup(apps, { statusError: Object.assign(new Error('権限がありません'), { status: 403 }) });
    const targets = [...Array.from({ length: 301 }, (_, index) => ({ appId: String(index + 1), guestId: '' })), { appId: '900', guestId: '8' }];
    const result = await inspectDeployTargetsStandalone({ targets, sections: ['fieldSettings'] });
    // 状態を確認できなくても changes のまま、注意が付く
    expect(result.counts.changes).toBe(302);
    const statusCalls = env.calls.filter(call => call.url.endsWith('/preview/app/deploy.json'));
    expect(statusCalls.map(call => [call.url, call.params.apps.length])).toEqual([['/k/v1/preview/app/deploy.json', 300], ['/k/v1/preview/app/deploy.json', 1], ['/k/guest/8/v1/preview/app/deploy.json', 1]]);
    expect(result.apps[0].state).toBe('changes');
    expect(result.apps[0].warnings.join()).toContain('処理状況を確認できませんでした');
    expect(result.apps[0].warnings.join()).toContain('権限がありません');
    expect(result.apps[300].warnings).toHaveLength(1);
    expect(result.apps[301].warnings).toHaveLength(1);
  }, 30000);

  it('中止は例外のまま伝える', async () => {
    const env = setup({ '1': changedApp(), '2': changedApp() });
    beginRun();
    requestCancel();
    await expect(inspectDeployTargetsStandalone({ targets: [{ appId: '1', guestId: '' }, { appId: '2', guestId: '' }] })).rejects.toBeInstanceOf(RunCancelledError);
    expect(env.api).not.toHaveBeenCalled();
  });
});
