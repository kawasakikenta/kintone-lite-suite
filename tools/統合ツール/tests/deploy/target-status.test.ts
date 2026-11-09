import { afterEach, describe, expect, it, vi } from 'vitest';
import { inspectTargetDeployStatus, previewReflectStandalone } from '../../src/tabs/reflect-standalone';
import { makeWorld } from '../reflect/compose-world';
import { __resetRunControlForTests } from '../../src/runControl';

afterEach(() => {
  __resetRunControlForTests();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('差分の抽出時の、反映先の反映状況の確認', () => {
  it('反映先が反映処理中なら processing を返し、抽出結果に載せる', async () => {
    const world = makeWorld({ neverFinish: true });
    world.env.deployments.push({ ids: ['2'], revert: false, polls: 99, done: false, result: {} });
    const preview = await world.preview();
    // 指定しない抽出（プレビュー反映）では確認しない
    expect(preview.targetDeployStatus).toBeUndefined();
    const checked = await previewReflectStandalone(world.reflect, () => {}, { checkTargetDeployStatus: true });
    expect(checked.targetDeployStatus).toEqual({ state: 'processing', message: '反映先は前回の反映を kintone が処理中です。完了してから抽出し直してください。' });
    // 書き込みはしない
    expect(world.writes()).toEqual([]);
  });

  it('処理中でなければ idle、確認に失敗したら unknown（抽出は止めない）', async () => {
    const world = makeWorld();
    expect((await previewReflectStandalone(world.reflect, () => {}, { checkTargetDeployStatus: true })).targetDeployStatus?.state).toBe('idle');
    const failing = makeWorld({ statusError: Object.assign(new Error('状態を取得できません。'), { code: 'X' }) });
    const result = await previewReflectStandalone(failing.reflect, () => {}, { checkTargetDeployStatus: true });
    expect(result.targetDeployStatus?.state).toBe('unknown');
    expect(result.targetDeployStatus?.message).toContain('反映処理中か確認できませんでした（状態を取得できません。）');
    // 差分の抽出自体は成功している
    expect(result.entries.length).toBeGreaterThan(0);
  });

  it('inspectTargetDeployStatus は反映先の PROCESSING だけを処理中とする', async () => {
    const world = makeWorld({ neverFinish: true });
    expect((await inspectTargetDeployStatus({ targetAppId: '2' })).state).toBe('idle');
    world.env.deployments.push({ ids: ['2'], revert: false, polls: 99, done: false, result: {} });
    expect((await inspectTargetDeployStatus({ targetAppId: '2', targetGuestId: '' })).state).toBe('processing');
    expect((await inspectTargetDeployStatus({ targetAppId: '1' })).state).toBe('idle');
  });
});
