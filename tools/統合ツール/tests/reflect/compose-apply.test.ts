import { afterEach, describe, expect, it, vi } from 'vitest';
import { composeReflectSelectionStandalone, runApplyPreviewStandalone } from '../../src/tabs/reflect-standalone';
import type { SectionSelectionState } from '../../src/reflect/selectionTypes';
import { makeWorld } from './compose-world';

afterEach(() => vi.unstubAllGlobals());

const composedAfters = (composed: ReturnType<typeof composeReflectSelectionStandalone>) => Object.fromEntries(composed.sections.map(section => [section.sectionKey, section.after]));
const state = (selected: string[], overrides: Record<string, unknown> = {}): SectionSelectionState => ({ selected, overrides });

async function applyWith(world: ReturnType<typeof makeWorld>, states: Record<string, SectionSelectionState>, extra: Record<string, unknown> = {}) {
  const preview = await world.preview();
  const composed = composeReflectSelectionStandalone(preview, states);
  const result = await runApplyPreviewStandalone({ ...world.reflect, reviewBaseline: preview.baseline, composed: composedAfters(composed), ...extra }, () => {}, () => {});
  return { preview, composed, result };
}

describe('runApplyPreviewStandalone: 差分の選択・修正の結果（composed）', () => {
  it('選んだ設定値だけを、revision を引き継いで書き込む', async () => {
    const world = makeWorld();
    const { composed, result } = await applyWith(world, {
      fieldSettings: state(['fieldSettings:/properties/name/required']),
      appSettings: state(['appSettings:/theme'], { '/theme': 'BLUE' }),
      layoutSettings: state([]), viewSettings: state([])
    });
    expect(composed.blockers).toEqual([]);
    expect(result.sections.map(section => [section.sectionKey, section.status])).toEqual([
      ['fieldSettings', 'ok'], ['layoutSettings', 'skip'], ['appSettings', 'ok'], ['viewSettings', 'skip']
    ]);
    const writes = world.writes();
    expect(writes.map(call => [call.method, call.url])).toEqual([['PUT', '/k/v1/preview/app/form/fields.json'], ['PUT', '/k/v1/preview/app/settings.json']]);
    expect(writes[0].params).toEqual({
      app: '2', revision: '10',
      properties: { name: { type: 'SINGLE_LINE_TEXT', code: 'name', label: '顧客名', required: true } }
    });
    expect(writes[1].params).toEqual({ app: '2', revision: '11', theme: 'BLUE', enableComments: false });
    expect(result.finalRevision).toBe('12');
    // 選ばなかった値は反映先のまま
    expect(world.apps['2'].preview.fieldSettings.properties.name.label).toBe('顧客名');
    expect(world.apps['2'].preview.fieldSettings.properties.added).toBeUndefined();
    expect(world.apps['2'].preview.viewSettings.views).toEqual({});
  });

  it('追加フィールドを選ぶと POST し、それを参照する項目も書き込める', async () => {
    const world = makeWorld();
    const { composed, result } = await applyWith(world, {
      fieldSettings: state(['fieldSettings:/properties/added'], { '/properties/added/label': '追加項目（修正）' })
    });
    expect(composed.blockers).toEqual([]);
    expect(result.sections.every(section => section.status === 'ok')).toBe(true);
    const writes = world.writes();
    expect(writes[0]).toMatchObject({ method: 'POST', url: '/k/v1/preview/app/form/fields.json' });
    expect(writes[0].params.properties.added).toMatchObject({ code: 'added', label: '追加項目（修正）' });
    expect(world.apps['2'].preview.fieldSettings.properties.added.label).toBe('追加項目（修正）');
    expect(writes.map(call => call.params.revision)).toEqual(['10', '11', '12', '13']);
  });

  it('差分の抽出後に反映先が更新されていたら、何も書き込まずに止まる', async () => {
    const world = makeWorld();
    const preview = await world.preview();
    const composed = composeReflectSelectionStandalone(preview, {});
    world.apps['2'].preview.fieldSettings.properties.name.label = '別の人が直した名前';
    world.apps['2'].previewRevision = '11';
    await expect(runApplyPreviewStandalone({ ...world.reflect, reviewBaseline: preview.baseline, composed: composedAfters(composed) }, () => {}, () => {}))
      .rejects.toThrow();
    expect(world.writes()).toEqual([]);
  });

  it('選ばなかったフィールドを参照する設定を送ろうとしたら、書き込む前に止まる', async () => {
    const world = makeWorld();
    const preview = await world.preview();
    // 画面の確認では全項目を選んでいた設定を、フィールドの追加を外した状態で送る（食い違った composed）
    const composed = composeReflectSelectionStandalone(preview, {});
    const afters = composedAfters(composed);
    afters.fieldSettings = composeReflectSelectionStandalone(preview, { fieldSettings: state([]) }).sections[0].after;
    await expect(runApplyPreviewStandalone({ ...world.reflect, reviewBaseline: preview.baseline, composed: afters }, () => {}, () => {}))
      .rejects.toThrow(/反映前の検査で停止しました。まだ書き込んでいません。[\s\S]*参照するフィールド「added」/);
    expect(world.writes()).toEqual([]);
  });

  it('形が不正な設定（フィールドの種類の変更）は書き込まずに止まる', async () => {
    const world = makeWorld();
    const preview = await world.preview();
    const afters = composedAfters(composeReflectSelectionStandalone(preview, {}));
    afters.fieldSettings.properties.name.type = 'MULTI_LINE_TEXT';
    await expect(runApplyPreviewStandalone({ ...world.reflect, reviewBaseline: preview.baseline, composed: afters }, () => {}, () => {}))
      .rejects.toThrow(/種類は変更できません/);
    expect(world.writes()).toEqual([]);
  });

  it('composed の無い項目は既定の計画どおり。composed 全体が無いときの動作は従来どおり', async () => {
    const worldA = makeWorld();
    const previewA = await worldA.preview();
    const resultA = await runApplyPreviewStandalone({ ...worldA.reflect, reviewBaseline: previewA.baseline }, () => {}, () => {});
    const worldB = makeWorld();
    const previewB = await worldB.preview();
    const composedB = composeReflectSelectionStandalone(previewB, {});
    const resultB = await runApplyPreviewStandalone({ ...worldB.reflect, reviewBaseline: previewB.baseline, composed: composedAfters(composedB) }, () => {}, () => {});
    expect(resultA.sections.map(section => section.status)).toEqual(['ok', 'ok', 'ok', 'ok']);
    // 既定のままの composed は、composed が無いときと同じ書き込みになる
    expect(worldB.writes().map(call => [call.method, call.url, call.params])).toEqual(worldA.writes().map(call => [call.method, call.url, call.params]));
    expect(resultB.sections).toEqual(resultA.sections);
    expect(worldB.apps['2'].preview).toEqual(worldA.apps['2'].preview);
    // 一部の項目だけ composed があるとき、無い項目は既定の計画
    const worldC = makeWorld();
    const previewC = await worldC.preview();
    const only = composeReflectSelectionStandalone(previewC, { appSettings: state([]) });
    const resultC = await runApplyPreviewStandalone({ ...worldC.reflect, reviewBaseline: previewC.baseline, composed: { appSettings: only.sections.find(section => section.sectionKey === 'appSettings')!.after } }, () => {}, () => {});
    expect(resultC.sections.find(section => section.sectionKey === 'appSettings')!.status).toBe('skip');
    expect(resultC.sections.filter(section => section.status === 'ok').map(section => section.sectionKey)).toEqual(['fieldSettings', 'layoutSettings', 'viewSettings']);
  });

  it('書き込みの途中で別の更新が入ったら revision 競合として止まる（従来どおり）', async () => {
    let writes = 0;
    const world = makeWorld({ onWrite: (_call, apps) => { writes += 1; if (writes === 3) apps['2'].previewRevision = '99'; } });
    const { result } = await applyWith(world, {});
    expect(result.sections.map(section => section.status)).toEqual(['ok', 'ng', 'pending', 'pending']);
    expect(result.sections[1].message).toContain('revision 競合');
  });
});
