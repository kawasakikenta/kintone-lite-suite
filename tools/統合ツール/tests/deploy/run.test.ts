import { afterEach, describe, expect, it, vi } from 'vitest';
import { inspectDeployTargetsStandalone, runDeployStandalone } from '../../src/tabs/deploy-standalone';
import type { DeployAppInspection, DeployAppUpdate, DeployBackupFile, DeployRunOptions } from '../../src/deploy/types';
import { __resetRunControlForTests, beginRun, requestCancel } from '../../src/runControl';
import { createFakeKintone, field, makeApp, type FakeApp, type FakeOptions } from './fake-kintone';

afterEach(() => {
  __resetRunControlForTests();
  vi.unstubAllGlobals();
});

const fields = (...items: any[]) => ({ properties: Object.fromEntries(items.map(item => [item.code, item])) });
const POLL = { initialMs: 1, maxMs: 2, timeoutMs: 5000 };

/** 本番とプレビューの revision が異なり、フィールドが 1 つ追加されたアプリ。 */
const changedApp = (name = 'テスト', overrides: Partial<FakeApp> = {}): FakeApp => makeApp({
  name, prodRevision: '10', previewRevision: '12',
  production: { fieldSettings: fields(field('name', '名前')) },
  preview: { fieldSettings: fields(field('name', '名前'), field('added', '追加項目')) },
  ...overrides
});

function setup(apps: Record<string, FakeApp>, options: FakeOptions = {}) {
  const env = createFakeKintone(apps, options);
  vi.stubGlobal('kintone', { api: env.api });
  return env;
}

async function inspectApps(ids: string[], guestId = ''): Promise<DeployAppInspection[]> {
  const result = await inspectDeployTargetsStandalone({ targets: ids.map(appId => ({ appId, guestId })) });
  for (const app of result.apps) expect(app.state).toBe('changes');
  return result.apps;
}

/** 反映を実行し、依頼された deploy.json の本文と保存されたバックアップも返す。 */
async function run(targets: DeployAppInspection[], options: Partial<DeployRunOptions> = {}) {
  const saved: Array<{ fileName: string; json: string }> = [];
  const updates: DeployAppUpdate[] = [];
  const result = await runDeployStandalone({
    mode: 'deploy', batchMode: 'sequential', targets, poll: POLL,
    saveBackup: (fileName, json) => { saved.push({ fileName, json }); },
    onUpdate: update => updates.push(update),
    ...options
  });
  return { result, saved, updates, statuses: result.apps.map(app => app.status) };
}

const backupOf = (saved: Array<{ json: string }>): DeployBackupFile => JSON.parse(saved[0].json);

describe('runDeployStandalone: 入力の検査', () => {
  it('空の対象・反映できない状態・取得値の欠落・重複は例外にする（画面の不具合）', async () => {
    setup({ '1': changedApp(), '2': makeApp() });
    const [target] = await inspectApps(['1']);
    await expect(run([])).rejects.toThrow('反映するアプリがありません');
    await expect(run([{ ...target, state: 'clean' }])).rejects.toThrow('反映できる状態ではありません');
    await expect(run([{ ...target, productionBundle: undefined }])).rejects.toThrow('設定の取得値がありません');
    await expect(run([{ ...target, previewBundle: undefined }])).rejects.toThrow('設定の取得値がありません');
    await expect(run([target, target])).rejects.toThrow('重複');
    await expect(run([target, { ...target, appId: '2', guestId: '3' }], { batchMode: 'atomic' })).rejects.toThrow('同じスペース');
  });
});

describe('runDeployStandalone: 1 件ずつ反映', () => {
  it('依頼 → 完了の確認 → 反映後の revision の確認まで行い、revision を添えて 1 件ずつ依頼する', async () => {
    const env = setup({ '1': changedApp('A'), '2': changedApp('B', { previewRevision: '15' }) });
    const targets = await inspectApps(['1', '2']);
    const statusTexts: string[] = [];
    const { result, saved, updates, statuses } = await run(targets, { setStatus: message => statusTexts.push(message) });
    expect(statuses).toEqual(['success', 'success']);
    expect(result.blocked).toBeUndefined();
    expect(result.cancelled).toBeUndefined();
    expect(result.apps[0]).toMatchObject({ appId: '1', name: 'A', productionRevisionBefore: '10', previewRevision: '12', productionRevisionAfter: '12', verified: true, message: '本番へ反映しました。' });
    expect(result.apps[1]).toMatchObject({ productionRevisionBefore: '10', previewRevision: '15', productionRevisionAfter: '15', verified: true });
    expect(env.requests).toEqual([
      { url: '/k/v1/preview/app/deploy.json', body: { apps: [{ app: '1', revision: '12' }] } },
      { url: '/k/v1/preview/app/deploy.json', body: { apps: [{ app: '2', revision: '15' }] } }
    ]);
    // 本番へ反映された
    expect(env.apps['1'].production.fieldSettings.properties.added).toBeDefined();
    // 1 件目の完了を待ってから 2 件目を依頼する
    expect(env.deployments[0].done).toBe(true);
    expect(updates.filter(update => update.appId === '1').map(update => update.status)).toEqual(['checking', 'deploying', 'deploying', 'success']);
    expect(updates.filter(update => update.appId === '2').map(update => update.status)).toEqual(['checking', 'deploying', 'deploying', 'success']);
    expect(statusTexts.length).toBeGreaterThan(0);
    // 利用者向けの文に内部の通信情報は出さず、ログには残す
    expect(result.apps.every(app => !(app.message || '').includes('[API]'))).toBe(true);
    expect(result.logs.some(line => line.startsWith('[API] POST /k/v1/preview/app/deploy.json apps=1@12'))).toBe(true);
    expect(result.backup).toMatchObject({ appCount: 2, environment: 'production', unavailableFiles: [] });
    expect(saved).toHaveLength(1);
    expect(saved[0].fileName).toMatch(/^本番反映前バックアップ_2アプリ_.+\.json$/);
    expect(result.backup?.fileName).toBe(saved[0].fileName);
    expect(new Date(result.startedAt) <= new Date(result.finishedAt)).toBe(true);
  });

  it('ゲストスペースのアプリはゲスト用の URL へ依頼し、1 件だけのバックアップ名にはアプリ名とIDを入れる', async () => {
    const env = setup({ '5': changedApp('顧客') });
    const targets = await inspectApps(['5'], '3');
    const { result, saved } = await run(targets);
    expect(result.apps[0].status).toBe('success');
    expect(env.requests[0].url).toBe('/k/guest/3/v1/preview/app/deploy.json');
    expect(saved[0].fileName).toMatch(/^本番反映前バックアップ_顧客\(app5\)_.+\.json$/);
    expect(env.calls.filter(call => call.url.includes('/deploy.json')).every(call => call.url.startsWith('/k/guest/3/v1/preview/'))).toBe(true);
  });

  it('kintone が FAIL を返したアプリは failed とし、既定では残りを未実行にする', async () => {
    const env = setup({ '1': changedApp(), '2': changedApp(), '3': changedApp() }, { failApps: ['1'] });
    const { result, statuses, updates } = await run(await inspectApps(['1', '2', '3']));
    expect(statuses).toEqual(['failed', 'pending', 'pending']);
    expect(result.apps[0].message).toContain('kintone が反映に失敗しました');
    expect(result.apps[0].message).toContain('「アプリを更新」');
    expect(result.apps[1].message).toBe('前のアプリで問題があったため未実行');
    expect(env.requests).toHaveLength(1);
    expect(result.apps[0].verified).toBeUndefined();
    expect(updates.filter(update => update.status === 'pending').map(update => update.appId)).toEqual(['2', '3']);
  });

  it('stopOnError が false なら失敗しても続行する', async () => {
    const env = setup({ '1': changedApp(), '2': changedApp() }, { failApps: ['1'] });
    const { statuses } = await run(await inspectApps(['1', '2']), { stopOnError: false });
    expect(statuses).toEqual(['failed', 'success']);
    expect(env.requests).toHaveLength(2);
  });

  it('開始時の再確認で 1 件でも食い違えば、何も依頼せず blocked にする', async () => {
    const env = setup({ '1': changedApp(), '2': changedApp(), '3': changedApp() });
    const targets = await inspectApps(['1', '2', '3']);
    env.apps['2'].previewRevision = '99';
    const { result, saved, statuses } = await run(targets);
    expect(statuses).toEqual(['pending', 'conflict', 'pending']);
    expect(result.blocked).toContain('App 2');
    expect(result.blocked).toContain('何も反映していません');
    expect(result.apps[1].message).toContain('プレビュー（revision 12 → 99）');
    expect(result.apps[0].message).toContain('まだ何も反映していません');
    expect(env.requests).toEqual([]);
    expect(env.writes()).toEqual([]);
    expect(saved).toEqual([]);
    expect(result.backup).toBeUndefined();
    // 本番の revision が変わった場合も同じ
    env.apps['2'].previewRevision = '12';
    env.apps['3'].prodRevision = '11';
    const second = await run(targets);
    expect(second.statuses).toEqual(['pending', 'pending', 'conflict']);
    expect(second.result.apps[2].message).toContain('本番（revision 10 → 11）');
  });

  it('開始時の再確認で設定を取得できないアプリがあっても、何も依頼せず pending にする', async () => {
    const env = setup({ '1': changedApp(), '2': changedApp() });
    const targets = await inspectApps(['1', '2']);
    delete env.apps['2'];
    const { result, statuses } = await run(targets);
    expect(statuses).toEqual(['pending', 'pending']);
    expect(result.blocked).toContain('確認できないアプリがあります（App 2');
    expect(result.apps[1].message).toContain('最新の状態を確認できなかったため未実行');
    expect(env.requests).toEqual([]);
  });

  it('直前の確認で食い違ったアプリだけ conflict とし、依頼しない', async () => {
    const env = setup({ '1': changedApp(), '2': changedApp(), '3': changedApp() }, {
      // 1 件目を依頼した後に、別の利用者が 2 件目のプレビューを更新した
      onPost: (_call, apps) => { apps['2'].previewRevision = '99'; }
    });
    const targets = await inspectApps(['1', '2', '3']);
    const { result, statuses } = await run(targets, { stopOnError: false });
    expect(statuses).toEqual(['success', 'conflict', 'success']);
    expect(result.apps[1].message).toContain('確認した後');
    expect(env.requests.map(request => request.body.apps[0].app)).toEqual(['1', '3']);
    // 既定（stopOnError）では conflict の後は未実行
    const stopEnv = setup({ '1': changedApp(), '2': changedApp(), '3': changedApp() }, { onPost: (_call, apps) => { apps['2'].previewRevision = '99'; } });
    const stopped = await run(await inspectApps(['1', '2', '3']));
    expect(stopped.statuses).toEqual(['success', 'conflict', 'pending']);
    expect(stopEnv.requests).toHaveLength(1);
  });

  it('依頼が revision 競合（GAIA_CO02）で拒否されたら conflict とし、再送しない', async () => {
    const env = setup({ '1': changedApp() }, { postError: Object.assign(new Error('リビジョンが最新ではありません'), { code: 'GAIA_CO02' }) });
    const { result, statuses } = await run(await inspectApps(['1']));
    expect(statuses).toEqual(['conflict']);
    expect(result.apps[0].message).toContain('差分を確認し直してください');
    expect(result.apps[0].message).not.toContain('GAIA_CO02');
    expect(env.api.mock.calls.filter(call => call[1] === 'POST')).toHaveLength(1);
  });

  it('依頼が拒否された理由は利用者向けに示し、通信の情報は含めない。通信の途絶（5xx）は確認できない状態にする', async () => {
    setup({ '1': changedApp() }, { postError: Object.assign(new Error('このアプリを更新する権限がありません'), { code: 'CB_NO02' }) });
    const rejected = await run(await inspectApps(['1']));
    expect(rejected.statuses).toEqual(['failed']);
    expect(rejected.result.apps[0].message).toContain('このアプリを更新する権限がありません');
    expect(rejected.result.apps[0].message).not.toContain('[API]');
    expect(rejected.result.logs.join('\n')).toContain('[API] POST /k/v1/preview/app/deploy.json');

    const env = setup({ '1': changedApp(), '2': changedApp() }, { postError: Object.assign(new Error('Bad Gateway'), { status: 502 }) });
    const unknown = await run(await inspectApps(['1', '2']));
    expect(unknown.statuses).toEqual(['unknown', 'pending']);
    expect(unknown.result.apps[0].message).toContain('届いたか確認できませんでした');
    expect(env.api.mock.calls.filter(call => call[1] === 'POST')).toHaveLength(1);
  });

  it('完了を確認できないまま時間切れになったら unknown とし、残りを未実行にする', async () => {
    const env = setup({ '1': changedApp(), '2': changedApp() }, { neverFinish: true });
    const { result, statuses } = await run(await inspectApps(['1', '2']), { poll: { initialMs: 1, maxMs: 2, timeoutMs: 20 } });
    expect(statuses).toEqual(['unknown', 'pending']);
    expect(result.apps[0].message).toBe('反映の完了を確認できませんでした。kintone 側で処理が続いている可能性があります。アプリの設定画面で確認してください。');
    expect(env.requests).toHaveLength(1);
    expect(result.apps[0].verified).toBeUndefined();
  });

  it('状態の取得が続けて失敗したら unknown にする', async () => {
    setup({ '1': changedApp() }, { statusError: Object.assign(new Error('権限がありません'), { status: 403 }) });
    // 差分確認の時点では状態を確認しない（確認の失敗は注意に入るだけ）
    const targets = await inspectApps(['1']);
    const { result, statuses } = await run(targets);
    expect(statuses).toEqual(['unknown']);
    expect(result.apps[0].message).toContain('状況を確認できませんでした');
    expect(result.apps[0].message).toContain('権限がありません');
  });

  it('反映後の本番とプレビューの revision が一致しなくても失敗にはせず、verified を false にする', async () => {
    const env = setup({ '1': changedApp() }, {
      onGet: (call, apps) => { if (call.url === '/k/v1/app/settings.json' && env.deployments[0]?.done) apps['1'].prodRevision = '13'; }
    });
    const { result } = await run(await inspectApps(['1']));
    expect(result.apps[0]).toMatchObject({ status: 'success', verified: false, productionRevisionAfter: '13' });
    expect(result.apps[0].message).toContain('一致していません');
  });

  it('反映後の revision を確認できなくても成功のまま、verified は undefined', async () => {
    const env = setup({ '1': changedApp() }, {
      onGet: (call) => { if (call.url === '/k/v1/preview/app/settings.json' && env.deployments[0]?.done) throw Object.assign(new Error('一時的なエラー'), { status: 400 }); }
    });
    const { result } = await run(await inspectApps(['1']));
    expect(result.apps[0].status).toBe('success');
    expect(result.apps[0].verified).toBeUndefined();
    expect(result.apps[0].productionRevisionAfter).toBeUndefined();
    expect(result.logs.some(line => line.includes('反映後の確認ができませんでした'))).toBe(true);
  });
});

describe('runDeployStandalone: まとめて反映（atomic）', () => {
  it('全件を 1 回で依頼し、各アプリの結果を反映する', async () => {
    const env = setup({ '1': changedApp(), '2': changedApp(), '3': changedApp() });
    const { result, statuses } = await run(await inspectApps(['1', '2', '3']), { batchMode: 'atomic' });
    expect(statuses).toEqual(['success', 'success', 'success']);
    expect(env.requests).toHaveLength(1);
    expect(env.requests[0].body).toEqual({ apps: [{ app: '1', revision: '12' }, { app: '2', revision: '12' }, { app: '3', revision: '12' }] });
    expect(result.apps.every(app => app.verified === true)).toBe(true);
  });

  it('1 件が FAIL なら、そのアプリは failed、ほかは cancelled にする（本番は変わらない）', async () => {
    const env = setup({ '1': changedApp(), '2': changedApp(), '3': changedApp() }, { failApps: ['2'] });
    const { result, statuses } = await run(await inspectApps(['1', '2', '3']), { batchMode: 'atomic' });
    expect(statuses).toEqual(['cancelled', 'failed', 'cancelled']);
    expect(result.apps[0].message).toContain('ほかのアプリの反映が失敗したため、kintone が取り消しました');
    expect(env.apps['1'].production.fieldSettings.properties.added).toBeUndefined();
    expect(result.apps.every(app => app.verified === undefined)).toBe(true);
  });

  it('依頼自体の失敗は全件に反映し、競合なら全件 conflict にする', async () => {
    setup({ '1': changedApp(), '2': changedApp() }, { postError: Object.assign(new Error('権限がありません'), { code: 'CB_NO02' }) });
    const failed = await run(await inspectApps(['1', '2']), { batchMode: 'atomic' });
    expect(failed.statuses).toEqual(['failed', 'failed']);
    expect(failed.result.apps[1].message).toContain('権限がありません');
    setup({ '1': changedApp(), '2': changedApp() }, { postError: Object.assign(new Error('リビジョンが最新ではありません'), { code: 'GAIA_CO02' }) });
    const conflict = await run(await inspectApps(['1', '2']), { batchMode: 'atomic' });
    expect(conflict.statuses).toEqual(['conflict', 'conflict']);
  });

  it('開始時の再確認で食い違いがあれば全件依頼しない', async () => {
    const env = setup({ '1': changedApp(), '2': changedApp() });
    const targets = await inspectApps(['1', '2']);
    env.apps['1'].previewRevision = '50';
    const { result, statuses } = await run(targets, { batchMode: 'atomic' });
    expect(statuses).toEqual(['conflict', 'pending']);
    expect(result.blocked).toBeTruthy();
    expect(env.requests).toEqual([]);
  });

  it('時間切れは全件 unknown にする', async () => {
    setup({ '1': changedApp(), '2': changedApp() }, { neverFinish: true });
    const { statuses } = await run(await inspectApps(['1', '2']), { batchMode: 'atomic', poll: { initialMs: 1, maxMs: 2, timeoutMs: 15 } });
    expect(statuses).toEqual(['unknown', 'unknown']);
  });
});

describe('runDeployStandalone: 中止', () => {
  it('完了を待っている間に中止したら、そのアプリは unknown、残りは未実行（中止）にして cancelled を返す', async () => {
    const env = setup({ '1': changedApp(), '2': changedApp(), '3': changedApp() }, { onPost: () => { requestCancel(); } });
    beginRun();
    const { result, statuses, updates } = await run(await inspectApps(['1', '2', '3']));
    expect(result.cancelled).toBe(true);
    expect(statuses).toEqual(['unknown', 'pending', 'pending']);
    expect(result.apps[0].message).toContain('反映を依頼しましたが、完了を確認する前に中止しました');
    expect(result.apps[1].message).toBe('未実行（中止）');
    expect(env.requests).toHaveLength(1);
    expect(result.backup).toBeDefined();
    expect(updates.at(-1)).toMatchObject({ appId: '3', status: 'pending' });
  });

  it('依頼の前に中止したら何も依頼せず、すべて未実行（中止）にする', async () => {
    const env = setup({ '1': changedApp(), '2': changedApp() });
    const targets = await inspectApps(['1', '2']);
    beginRun();
    const saved: string[] = [];
    const { result, statuses } = await run(targets, { saveBackup: (fileName) => { saved.push(fileName); requestCancel(); } });
    expect(saved).toHaveLength(1);
    expect(result.cancelled).toBe(true);
    expect(statuses).toEqual(['pending', 'pending']);
    expect(result.apps.every(app => app.message === '未実行（中止）')).toBe(true);
    expect(env.requests).toEqual([]);
    expect(env.writes()).toEqual([]);
  });

  it('開始時の再確認の途中で中止しても、すべて未実行（中止）にして例外にしない', async () => {
    let armed = false;
    const env = setup({ '1': changedApp(), '2': changedApp() }, { onGet: () => { if (armed) requestCancel(); } });
    const targets = await inspectApps(['1', '2']);
    beginRun();
    armed = true;
    const { result, statuses, saved } = await run(targets);
    expect(result.cancelled).toBe(true);
    expect(statuses).toEqual(['pending', 'pending']);
    expect(result.apps.every(app => app.message === '未実行（中止）')).toBe(true);
    expect(saved).toEqual([]);
    expect(env.requests).toEqual([]);
  });

  it('まとめて反映の完了待ち中に中止したら、全件 unknown にする', async () => {
    const env = setup({ '1': changedApp(), '2': changedApp() }, { onPost: () => { requestCancel(); } });
    beginRun();
    const { result, statuses } = await run(await inspectApps(['1', '2']), { batchMode: 'atomic' });
    expect(result.cancelled).toBe(true);
    expect(statuses).toEqual(['unknown', 'unknown']);
    expect(env.requests).toHaveLength(1);
  });
});

describe('runDeployStandalone: バックアップ', () => {
  const file = (fileKey: string, name: string, size = '10') => ({ type: 'FILE', file: { fileKey, name, size, contentType: 'text/javascript' } });
  const customize = (...items: any[]) => ({ scope: 'ALL', desktop: { js: items, css: [] }, mobile: { js: [], css: [] } });
  const fileApp = (production: any[], preview: any[], overrides: Partial<FakeApp> = {}) => makeApp({
    name: 'JS付き', prodRevision: '10', previewRevision: '12',
    production: { fieldSettings: fields(field('name')), customizeSettings: customize(...production) },
    preview: { fieldSettings: fields(field('name')), customizeSettings: customize(...preview) },
    ...overrides
  });
  /** fileKey ごとの本体（null なら 404）を返す fetch */
  const stubFiles = (bodies: Record<string, string | null>) => {
    const fetchMock = vi.fn(async (url: string) => {
      const key = decodeURIComponent(String(url).split('fileKey=')[1] || '');
      const body = bodies[key];
      return body == null ? new Response('', { status: 404 }) : new Response(new Blob([body], { type: 'text/javascript' }));
    });
    vi.stubGlobal('fetch', fetchMock);
    return fetchMock;
  };

  it('deploy は反映前の本番の bundles を、プレビュー反映で読み込める形で保存する', async () => {
    setup({ '1': changedApp('A'), '2': changedApp('B') });
    const { saved, result } = await run(await inspectApps(['1', '2']));
    const backup = backupOf(saved);
    expect(backup).toMatchObject({ kind: 'kintone-deploy-backup', version: 1, mode: 'deploy', environment: 'production' });
    expect(backup.bundles.map(bundle => [bundle.appId, bundle.preview])).toEqual([['1', false], ['2', false]]);
    expect(backup.bundles[0].sections.fieldSettings.properties.added).toBeUndefined();
    expect(backup.bundles[0].sections.fieldSettings.properties.name).toBeDefined();
    expect(backup.scopes).toContain('fieldSettings');
    expect(backup.scopes).toContain('appSettings');
    expect(result.backup?.generatedAt).toBe(backup.generatedAt);
    // 保存した JSON の本体を結果から取れる（「バックアップから戻す」でそのままエンジンへ渡す）
    expect(result.backup?.content).toEqual(backup);
    // 「設定JSONから取得」と同じ読み込み関数でアプリごとに取り出せる
    const { pickSettingsBundle } = await import('../../src/settingsBundleImport');
    expect(pickSettingsBundle(backup, { appId: '2', rawSettings: true }).appId).toBe('2');
  });

  it('JS/CSS に変更があるアプリは、ファイル本体を埋め込む。外れるファイルを保存できなければ反映しない', async () => {
    const env = setup({ '1': fileApp([file('pA', 'a.js')], [file('pB', 'b.js')]) });
    const targets = await inspectApps(['1']);
    const fetchMock = stubFiles({ pA: 'console.log("A")', pB: 'console.log("B")' });
    const { saved, result } = await run(targets);
    expect(result.apps[0].status).toBe('success');
    const section = backupOf(saved).bundles[0].sections.customizeSettings;
    const embedded = section.desktop.js[0].file;
    expect(embedded.fileKey).toBe('pA');
    expect(Buffer.from(embedded._content.base64, 'base64').toString()).toBe('console.log("A")');
    expect(embedded._content.byteSize).toBe(16);
    // 反映前の本番の fileKey だけを取得する
    expect(fetchMock.mock.calls.map(call => call[0])).toEqual(['/k/v1/file.json?fileKey=pA']);

    // 保存できない（404）なら、何も依頼せず blocked
    const blockedEnv = setup({ '1': fileApp([file('pA', 'a.js')], [file('pB', 'b.js')]) });
    const blockedTargets = await inspectApps(['1']);
    stubFiles({ pA: null });
    const blocked = await run(blockedTargets);
    expect(blocked.result.blocked).toContain('バックアップに保存できない');
    expect(blocked.result.blocked).toContain('a.js');
    expect(blocked.statuses).toEqual(['pending']);
    expect(blocked.saved).toEqual([]);
    expect(blockedEnv.requests).toEqual([]);
    void env;
  });

  it('反映後も設定に残るファイルの取得失敗は、バックアップの注記とログに残して反映する', async () => {
    const env = setup({ '1': fileApp([file('pA', 'a.js'), file('keep', 'keep.js')], [file('keep', 'keep.js'), file('pB', 'b.js')]) });
    const targets = await inspectApps(['1']);
    stubFiles({ pA: 'A', keep: null });
    const { result, saved } = await run(targets);
    expect(result.apps[0].status).toBe('success');
    expect(result.backup?.unavailableFiles).toEqual([{ appId: '1', name: 'keep.js', reason: expect.stringContaining('404') }]);
    expect(result.logs.some(line => line.includes('keep.js') && line.includes('バックアップに保存できませんでした'))).toBe(true);
    const files = backupOf(saved).bundles[0].sections.customizeSettings.desktop.js;
    expect(files.find((item: any) => item.file.fileKey === 'pA').file._content).toBeDefined();
    expect(files.find((item: any) => item.file.fileKey === 'keep').file._contentUnavailable).toContain('404');
    expect(env.requests).toHaveLength(1);
  });

  it('JS/CSS に変更が無いアプリではファイル本体を取得しない', async () => {
    setup({ '1': fileApp([file('pA', 'a.js')], [file('pA2', 'a.js')]) });
    const targets = await inspectApps(['1']);
    expect(targets[0].sections.find(section => section.sectionKey === 'customizeSettings')?.status).toBe('same');
    const fetchMock = stubFiles({});
    const { result } = await run(targets);
    expect(result.apps[0].status).toBe('success');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('バックアップを保存できなければ、何も依頼せず blocked にする', async () => {
    const env = setup({ '1': changedApp() });
    const targets = await inspectApps(['1']);
    const { result, statuses } = await run(targets, { saveBackup: () => { throw new Error('ダウンロードがブロックされました'); } });
    expect(statuses).toEqual(['pending']);
    expect(result.blocked).toContain('バックアップを保存できなかった');
    expect(result.blocked).toContain('ダウンロードがブロックされました');
    expect(result.backup).toBeUndefined();
    expect(env.requests).toEqual([]);
  });
});

describe('runDeployStandalone: 変更の中止（revert）', () => {
  it('revert: true で依頼し、中止前のプレビューを保存する。反映後はプレビューが本番に揃う', async () => {
    const env = setup({ '1': changedApp('A') });
    const targets = await inspectApps(['1']);
    const { result, saved } = await run(targets, { mode: 'revert' });
    expect(env.requests[0].body).toEqual({ apps: [{ app: '1', revision: '12' }], revert: true });
    expect(result.mode).toBe('revert');
    expect(result.apps[0]).toMatchObject({ status: 'success', verified: true, productionRevisionAfter: '10' });
    expect(result.apps[0].message).toContain('中止しました');
    expect(result.backup?.environment).toBe('preview');
    expect(saved[0].fileName).toMatch(/^変更中止前バックアップ_A\(app1\)_.+\.json$/);
    const backup = backupOf(saved);
    expect(backup).toMatchObject({ mode: 'revert', environment: 'preview' });
    expect(backup.bundles[0].preview).toBe(true);
    expect(backup.bundles[0].sections.fieldSettings.properties.added).toBeDefined();
    // プレビューの変更が破棄され、本番はそのまま
    expect(env.apps['1'].preview.fieldSettings.properties.added).toBeUndefined();
    expect(env.apps['1'].prodRevision).toBe('10');
  });

  it('revert でプレビューにだけあるファイルを保存できなければ反映しない', async () => {
    const file = (fileKey: string, name: string) => ({ type: 'FILE', file: { fileKey, name, size: '10' } });
    const customize = (...items: any[]) => ({ scope: 'ALL', desktop: { js: items, css: [] }, mobile: { js: [], css: [] } });
    const env = setup({ '1': makeApp({ prodRevision: '10', previewRevision: '12', production: { customizeSettings: customize(file('pA', 'a.js')) }, preview: { customizeSettings: customize(file('pNew', 'new.js')) } }) });
    const targets = await inspectApps(['1']);
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 500 })));
    const { result } = await run(targets, { mode: 'revert' });
    expect(result.blocked).toContain('new.js');
    expect(env.requests).toEqual([]);
  });
});
