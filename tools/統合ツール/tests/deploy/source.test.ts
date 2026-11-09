import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { runSourceToProductionStandalone } from '../../src/tabs/deploy-source-standalone';
import { composeReflectSelectionStandalone } from '../../src/tabs/reflect-standalone';
import type { ReflectSectionUpdate } from '../../src/tabs/reflect-standalone';
import type { SectionSelectionState } from '../../src/reflect/selectionTypes';
import type { SourceDeployOptions } from '../../src/deploy/sourceTypes';
import type { DeployAppUpdate } from '../../src/deploy/types';
import { __resetRunControlForTests, beginRun, requestCancel } from '../../src/runControl';
import { makeWorld } from '../reflect/compose-world';

const POLL = { initialMs: 1, maxMs: 2, timeoutMs: 5000 };
const state = (selected: string[], overrides: Record<string, unknown> = {}): SectionSelectionState => ({ selected, overrides });
let downloads: string[] = [];

beforeEach(() => {
  downloads = [];
  vi.stubGlobal('document', { createElement: vi.fn(() => ({ href: '', download: '', click() { downloads.push(this.download); } })) });
  vi.spyOn(URL, 'createObjectURL').mockImplementation(() => 'blob:backup');
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
});
afterEach(() => {
  __resetRunControlForTests();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

async function run(world: ReturnType<typeof makeWorld>, states: Record<string, SectionSelectionState> = {}, extra: Partial<SourceDeployOptions> = {}, afterPreview?: () => void) {
  const preview = await world.preview();
  const composed = composeReflectSelectionStandalone(preview, states);
  expect(composed.blockers).toEqual([]);
  afterPreview?.();
  const sectionUpdates: ReflectSectionUpdate[] = [], deployUpdates: DeployAppUpdate[] = [], statuses: string[] = [];
  const result = await runSourceToProductionStandalone({
    reflect: world.reflect, reviewBaseline: preview.baseline, composed: Object.fromEntries(composed.sections.map(section => [section.sectionKey, section.after])),
    goal: 'production', targetPending: preview.targetPending, poll: POLL,
    onSectionUpdate: update => sectionUpdates.push(update), onDeployUpdate: update => deployUpdates.push(update), setStatus: message => statuses.push(message),
    ...extra
  });
  return { preview, composed, result, sectionUpdates, deployUpdates, statuses };
}

const requestsOf = (world: ReturnType<typeof makeWorld>) => world.env.requests;

describe('runSourceToProductionStandalone: プレビューへ書き込み、続けて本番へ反映', () => {
  it('選んだ設定値だけをプレビューへ書き込み、続けて本番へ反映する', async () => {
    const world = makeWorld();
    const { result, sectionUpdates, deployUpdates, statuses } = await run(world, {
      fieldSettings: state(['fieldSettings:/properties/name/required']), layoutSettings: state([]), viewSettings: state([]), appSettings: state(['appSettings:/theme'], { '/theme': 'BLUE' })
    });
    expect(result.goal).toBe('production');
    expect(result.deploySkipped).toBeUndefined();
    expect(result.apply.sections.map(section => section.status)).toEqual(['ok', 'skip', 'ok', 'skip']);
    expect(result.apply.cancelled).toBeUndefined();
    expect(result.apply.finalRevision).toBe('12');
    expect(sectionUpdates.filter(update => update.status === 'ok').map(update => update.sectionKey)).toEqual(['fieldSettings', 'appSettings']);
    // 本番へ反映された（選んだ値だけ）
    expect(result.deploy?.apps.map(app => app.status)).toEqual(['success']);
    expect(result.deploy?.apps[0]).toMatchObject({ appId: '2', productionRevisionBefore: '10', previewRevision: '12', productionRevisionAfter: '12', verified: true });
    expect(requestsOf(world)).toEqual([{ url: '/k/v1/preview/app/deploy.json', body: { apps: [{ app: '2', revision: '12' }] } }]);
    expect(world.apps['2'].production.fieldSettings.properties.name).toMatchObject({ label: '顧客名', required: true });
    expect(world.apps['2'].production.appSettings.theme).toBe('BLUE');
    expect(world.apps['2'].production.viewSettings.views).toEqual({});
    // 確認結果にはバックアップ用の取得値を含めない
    expect(result.deployInspection).toMatchObject({ appId: '2', state: 'changes', productionRevision: '10', previewRevision: '12' });
    expect(result.deployInspection).not.toHaveProperty('productionBundle');
    expect(result.deployInspection).not.toHaveProperty('previewBundle');
    expect(deployUpdates.map(update => update.status)).toEqual(['checking', 'deploying', 'deploying', 'success']);
    expect(statuses.length).toBeGreaterThan(0);
    // バックアップ: プレビュー反映前と、本番反映前の 2 回保存する
    expect(downloads).toHaveLength(2);
    expect(downloads[0]).toMatch(/^反映前バックアップ_/);
    expect(downloads[1]).toMatch(/^本番反映前バックアップ_/);
    expect(result.apply.backup).toBeDefined();
    expect(result.deploy?.backup).toBeDefined();
  });

  it('goal が preview ならプレビューへの書き込みだけで終わり、本番へは反映しない', async () => {
    const world = makeWorld();
    const { result } = await run(world, {}, { goal: 'preview' });
    expect(result.goal).toBe('preview');
    expect(result.apply.sections.every(section => section.status === 'ok')).toBe(true);
    expect(result.deploy).toBeUndefined();
    expect(result.deploySkipped).toBeUndefined();
    expect(result.deployInspection).toBeUndefined();
    expect(requestsOf(world)).toEqual([]);
    expect(world.apps['2'].production.appSettings.theme).toBe('WHITE');
    expect(world.apps['2'].preview.appSettings.theme).toBe('RED');
  });

  it('プレビューへの書き込みが失敗したら本番へは反映せず、理由を返す', async () => {
    let writes = 0;
    const world = makeWorld({ onWrite: () => { writes += 1; if (writes === 2) throw new Error('サーバーが書き込みを拒否しました'); } });
    const { result } = await run(world);
    expect(result.apply.sections.map(section => section.status)).toEqual(['ng', 'pending', 'pending', 'pending']);
    expect(result.deploy).toBeUndefined();
    expect(result.deploySkipped).toContain('書き込みが完了しなかった項目があるため');
    expect(result.deploySkipped).toContain('フィールド設定: 失敗');
    expect(result.deploySkipped).toContain('レイアウト設定: 未実行');
    expect(requestsOf(world)).toEqual([]);
    expect(world.apps['2'].production.fieldSettings.properties.added).toBeUndefined();
  });

  it('書き込みを中止したら、例外にせず結果で返し、本番へは反映しない', async () => {
    let writes = 0;
    const world = makeWorld({ onWrite: () => { writes += 1; if (writes === 2) requestCancel(); } });
    beginRun();
    const { result } = await run(world);
    expect(result.apply.cancelled).toBe(true);
    expect(result.apply.sections.some(section => section.status === 'pending')).toBe(true);
    expect(result.deploy).toBeUndefined();
    expect(result.deploySkipped).toContain('中止');
    expect(requestsOf(world)).toEqual([]);
  });

  it('書き込みの前に中止したら、何も書き込まずに結果で返す', async () => {
    const world = makeWorld();
    const preview = await world.preview();
    beginRun();
    requestCancel();
    const result = await runSourceToProductionStandalone({
      reflect: world.reflect, reviewBaseline: preview.baseline, composed: {}, goal: 'production', targetPending: preview.targetPending, poll: POLL
    });
    expect(result.apply.cancelled).toBe(true);
    expect(result.apply.sections).toEqual([]);
    expect(result.deploySkipped).toContain('まだ何も書き込んでいません');
    expect(world.writes()).toEqual([]);
  });

  it('反映前の検査で止まる場合（差分の抽出後に反映先が更新された）は例外のまま伝える', async () => {
    const world = makeWorld();
    await expect(run(world, {}, {}, () => { world.apps['2'].preview.appSettings.theme = 'GREEN'; world.apps['2'].previewRevision = '11'; })).rejects.toThrow();
    expect(world.writes()).toEqual([]);
  });

  it('以前からの未公開の変更があるときは、了承がなければ本番へ反映せず、了承があれば反映する', async () => {
    const pendingWorld = () => makeWorld({}, apps => { apps['2'].previewRevision = '11'; apps['2'].preview.viewSettings = { views: {} }; apps['2'].preview.layoutSettings = { layout: [] }; });
    const world = pendingWorld();
    const first = await run(world);
    expect(first.preview.targetPending?.state).toBe('pending');
    expect(first.result.apply.sections.every(section => section.status === 'ok')).toBe(true);
    expect(first.result.deploy).toBeUndefined();
    expect(first.result.deploySkipped).toContain('以前からの未公開の変更があるため');
    expect(first.result.deploySkipped).toContain('「プレビューの変更を公開」');
    expect(requestsOf(world)).toEqual([]);
    expect(world.apps['2'].preview.appSettings.theme).toBe('RED');

    const allowed = pendingWorld();
    const second = await run(allowed, {}, { allowPendingChanges: true });
    expect(second.result.deploySkipped).toBeUndefined();
    expect(second.result.deploy?.apps[0].status).toBe('success');
    expect(requestsOf(allowed)).toHaveLength(1);
    expect(second.result.deployInspection?.productionRevision).toBe('10');
  });

  it('未公開の変更の有無を確認できなかった（unknown）ときも、了承がなければ本番へ反映しない', async () => {
    const world = makeWorld();
    const unknown = { state: 'unknown' as const, productionRevision: '', previewRevision: '', sectionKeys: [], message: '確認できませんでした。' };
    const first = await run(world, {}, { targetPending: unknown });
    expect(first.result.apply.sections.every(section => section.status === 'ok')).toBe(true);
    expect(first.result.deploy).toBeUndefined();
    expect(first.result.deploySkipped).toContain('確認できなかったため');
    expect(requestsOf(world)).toEqual([]);
    const allowed = makeWorld();
    const second = await run(allowed, {}, { targetPending: unknown, allowPendingChanges: true });
    expect(second.result.deploy?.apps[0].status).toBe('success');
  });

  it('書き込みの後にほかの人がプレビューを更新したら、本番へは反映しない', async () => {
    let writes = 0, bumped = false;
    const world = makeWorld({
      onWrite: () => { writes += 1; },
      onGet: (_call, apps) => { if (writes === 5 && !bumped) { bumped = true; apps['2'].previewRevision = String(Number(apps['2'].previewRevision) + 1); } }
    });
    const { result } = await run(world);
    expect(bumped).toBe(true);
    expect(result.apply.sections.every(section => section.status === 'ok')).toBe(true);
    expect(result.deploy).toBeUndefined();
    expect(result.deploySkipped).toContain('書き込みの後にほかの更新が入ったため');
    expect(result.deploySkipped).toContain(`revision ${result.apply.finalRevision} → ${Number(result.apply.finalRevision) + 1}`);
    expect(result.deployInspection).toMatchObject({ state: 'changes' });
    expect(requestsOf(world)).toEqual([]);
  });

  it('差分の抽出後に本番が更新されていたら、本番へは反映しない', async () => {
    const world = makeWorld();
    const { result } = await run(world, {}, {}, () => { world.apps['2'].prodRevision = '12'; });
    expect(result.apply.sections.every(section => section.status === 'ok')).toBe(true);
    expect(result.deploy).toBeUndefined();
    expect(result.deploySkipped).toContain('本番が更新されたため');
    expect(result.deploySkipped).toContain('本番の revision 10 → 12');
    expect(requestsOf(world)).toEqual([]);
  });

  it('書き込みが 1 件もなく、本番とプレビューに差がなければ、反映するものがない旨を返す', async () => {
    const world = makeWorld();
    const { result } = await run(world, { fieldSettings: state([]), layoutSettings: state([]), viewSettings: state([]), appSettings: state([]) });
    expect(result.apply.sections.every(section => section.status === 'skip')).toBe(true);
    expect(result.deploy).toBeUndefined();
    expect(result.deploySkipped).toContain('差がないため');
    expect(result.deployInspection).toMatchObject({ state: 'clean' });
    expect(world.writes()).toEqual([]);
    expect(downloads).toEqual([]);
  });

  it('本番反映の失敗は、そのまま結果で返す（例外にしない）', async () => {
    const world = makeWorld({ failApps: ['2'] });
    const { result } = await run(world);
    expect(result.deploySkipped).toBeUndefined();
    expect(result.deploy?.apps.map(app => app.status)).toEqual(['failed']);
    expect(result.deploy?.apps[0].message).toContain('kintone が反映に失敗しました');
    expect(result.apply.sections.every(section => section.status === 'ok')).toBe(true);
  });

  it('本番反映の中止は、そのまま結果で返す', async () => {
    const world = makeWorld({ pollsToFinish: 50 });
    beginRun();
    const { result } = await run(world, {}, { onDeployUpdate: update => { if (update.status === 'deploying' && update.message?.includes('処理を待っています')) requestCancel(); } });
    expect(result.apply.cancelled).toBeUndefined();
    expect(result.deploy?.cancelled).toBe(true);
    expect(result.deploy?.apps[0].status).toBe('unknown');
    expect(result.deploySkipped).toBeUndefined();
  });
});
