import { afterEach, describe, expect, it, vi } from 'vitest';
import { applySelection, createSourceSession, recomposeSession } from '../../src/deploy/sourceSession';
import { collectSelectionBlockers } from '../../src/deploy/sourceDisplay';
import { makeWorld } from '../reflect/compose-world';
import { __resetRunControlForTests } from '../../src/runControl';

afterEach(() => {
  __resetRunControlForTests();
  vi.unstubAllGlobals();
});

/** 反映元の一覧の絞り込み条件が、反映先に無い「追加」フィールドを参照する世界。 */
async function session() {
  const world = makeWorld({}, apps => { apps['1'].production.viewSettings.views.List.filterCond = 'added != ""'; });
  const preview = await world.preview();
  const created = createSourceSession({ signature: 's', opts: world.reflect, identities: { source: { appId: '1', name: '開発用', code: '', guestId: '' }, target: { appId: '2', name: '本番用', code: '', guestId: '' } }, sourceEnvironment: 'production', preview });
  return { world, preview, created };
}

describe('差分の選択: 条件が参照する追加フィールドの連動', () => {
  it('一覧（絞り込み条件が追加フィールドを参照）を選ぶと、参照する追加フィールドの追加も一緒に選ぶ。追加を外すと条件も外れる', async () => {
    const { created } = await session();
    const filter = created.models.viewSettings.changes.find(change => change.pointer === '/views/List')!;
    expect(filter.requires).toEqual(['fieldSettings:/properties/added']);
    for (const set of Object.values(created.selected)) set.clear();
    const on = applySelection(created, [filter.id], true);
    expect(on.required).toEqual(['fieldSettings:/properties/added']);
    expect(created.selected.fieldSettings.has('fieldSettings:/properties/added')).toBe(true);
    const off = applySelection(created, ['fieldSettings:/properties/added'], false);
    expect(off.cascaded).toEqual([filter.id]);
    expect(created.selected.viewSettings.has(filter.id)).toBe(false);
  });

  it('追加を選ばないまま条件だけを選ぶ状態は、参照するフィールドの不足として進めない', async () => {
    const { created, world } = await session();
    const filter = created.models.viewSettings.changes.find(change => change.pointer === '/views/List')!;
    for (const key of Object.keys(created.selected)) created.selected[key].clear();
    // 連動を通さずに（外から）条件だけ選んだ状態を作る
    created.selected.viewSettings.add(filter.id);
    recomposeSession(created, world.reflect.scopes);
    const result = collectSelectionBlockers({ entries: created.preview.entries, activeScopes: world.reflect.scopes, models: created.models, composed: created.composed });
    expect(result.references.join('\n')).toContain('参照するフィールド「added」が反映先にありません。反映元にあるフィールドなので、フィールド設定で「added」の追加も選ぶか、この項目を除外してください。');
  });
});
