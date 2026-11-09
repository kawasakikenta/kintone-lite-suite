import { afterEach, describe, expect, it, vi } from 'vitest';
import { composeReflectSelectionStandalone } from '../../src/tabs/reflect-standalone';
import { buildSectionSelectionModel } from '../../src/reflect/selection';
import { copy, makeWorld } from './compose-world';

afterEach(() => vi.unstubAllGlobals());

describe('previewReflectStandalone: 差分の選択・修正に使う情報', () => {
  it('フィールドコードと表示名の対応を返し、各項目の計画に反映前後の設定値を持つ', async () => {
    const world = makeWorld();
    const preview = await world.preview();
    expect(preview.fieldLabels).toMatchObject({ name: '顧客名（新）', added: '追加項目' });
    for (const entry of preview.entries) {
      expect(entry.values, entry.sectionKey).toBeDefined();
      expect(buildSectionSelectionModel(entry, preview.fieldLabels)).not.toBeNull();
    }
  });
});

describe('composeReflectSelectionStandalone', () => {
  it('既定（全選択・修正なし）は、複数項目で既定の計画と同じ operations になる', async () => {
    const world = makeWorld();
    const preview = await world.preview();
    expect(preview.entries.map(entry => entry.status)).toEqual(['change', 'change', 'change', 'change']);
    const composed = composeReflectSelectionStandalone(preview, {});
    expect(composed.blockers).toEqual([]);
    expect(composed.sections.map(section => section.sectionKey)).toEqual(preview.entries.map(entry => entry.sectionKey));
    for (const [index, section] of composed.sections.entries()) {
      const entry = preview.entries[index];
      expect(section.plan.operations, entry.sectionKey).toEqual(entry.operations);
      expect(section.plan.requiredFields, entry.sectionKey).toEqual(entry.requiredFields);
      expect(section.plan.changeCount, entry.sectionKey).toBe(entry.changeCount);
      expect(section.selectedCount).toBe(section.totalCount);
      expect(section.editedCount).toBe(0);
      expect(section.errors).toEqual([]);
    }
    // 空の states でも、明示した既定の states でも同じ
    expect(composeReflectSelectionStandalone(preview, { fieldSettings: { selected: composed.sections[0].totalCount ? buildIds(preview, 'fieldSettings') : [], overrides: {} } }).sections[0].plan.operations).toEqual(preview.entries[0].operations);
  });

  it('選ばなかった追加フィールドを参照する項目を選ぶと、書き込めない理由（blockers）に出る', async () => {
    const world = makeWorld();
    const preview = await world.preview();
    const onlyRequired = { fieldSettings: { selected: ['fieldSettings:/properties/name/required'], overrides: {} } };
    const blocked = composeReflectSelectionStandalone(preview, onlyRequired);
    expect(blocked.blockers.some(message => message.startsWith('ビュー設定: 参照するフィールド「added」が反映先にありません'))).toBe(true);
    expect(blocked.blockers.some(message => message.startsWith('レイアウト設定: 参照するフィールド「added」が反映先にありません'))).toBe(true);
    // フィールド設定は反映対象に含まれている。「含めるか」ではなく、追加の変更も選ぶよう案内する（反映先の一覧・レイアウトとも）
    expect(blocked.blockers.some(message => message.startsWith('ビュー設定: 参照するフィールド「added」が反映先にありません。反映元にあるフィールドなので、フィールド設定で「added」の追加も選ぶか、この項目を除外してください。'))).toBe(true);
    expect(blocked.blockers.some(message => message.includes('フィールド設定も反映対象に含めるか'))).toBe(false);
    // フィールド設定を反映対象に含めていないときは、従来どおり含めるよう案内する
    const withoutFields = composeReflectSelectionStandalone({ ...preview, entries: preview.entries.filter(entry => entry.sectionKey !== 'fieldSettings') }, {});
    expect(withoutFields.blockers.some(message => message.startsWith('ビュー設定: 参照するフィールド「added」が反映先にありません。フィールド設定も反映対象に含めるか、この項目を除外してください。'))).toBe(true);
    // 参照する項目も選ばなければ止まらない
    const releasing = composeReflectSelectionStandalone(preview, {
      ...onlyRequired, viewSettings: { selected: [], overrides: {} }, layoutSettings: { selected: [], overrides: {} }
    });
    expect(releasing.blockers).toEqual([]);
    // 追加フィールドも選べば止まらない
    const withAdded = composeReflectSelectionStandalone(preview, { fieldSettings: { selected: ['fieldSettings:/properties/added', 'fieldSettings:/properties/name/required'], overrides: {} } });
    expect(withAdded.blockers).toEqual([]);
  });

  it('修正の問題（フィールドの種類の変更・JSON の形の誤り・一緒に選ぶ必要がある変更）を、項目名付きで blockers に出す', async () => {
    const world = makeWorld();
    const preview = await world.preview();
    const fieldModel = buildSectionSelectionModel(preview.entries[0], preview.fieldLabels)!;
    const typeChanged = copy(fieldModel.after);
    typeChanged.properties.name.type = 'MULTI_LINE_TEXT';
    const result = composeReflectSelectionStandalone(preview, { fieldSettings: { selected: [], overrides: {}, json: typeChanged }, appSettings: { selected: [], overrides: {}, json: 'x' as any } });
    expect(result.blockers.some(message => message.startsWith('フィールド設定: フィールド「顧客名（新）（name）」の種類は変更できません'))).toBe(true);
    expect(result.blockers.some(message => message.startsWith('一般設定: JSON はオブジェクトである必要があります'))).toBe(true);
    expect(result.sections[0].errors.length).toBeGreaterThan(0);
  });

  it('計画を作れない項目（種類の違いなど）は sections に含めず、その blockers を引き継ぐ', async () => {
    const world = makeWorld({}, apps => { apps['1'].production.fieldSettings.properties.name.type = 'MULTI_LINE_TEXT'; });
    const preview = await world.preview();
    expect(preview.entries[0].status).toBe('error');
    const composed = composeReflectSelectionStandalone(preview, {});
    expect(composed.sections.map(section => section.sectionKey)).toEqual(['layoutSettings', 'appSettings', 'viewSettings']);
    expect(composed.blockers.some(message => message.startsWith('フィールド設定: ') && message.includes('種類が異なります'))).toBe(true);
    // フィールド設定が書き込めないので、追加フィールドを参照する項目も止まる
    expect(composed.blockers.some(message => message.includes('参照するフィールド「added」が反映先にありません'))).toBe(true);
  });

  it('変更のない項目（same）も選択の対象になるが、選べる変更は 0 件', async () => {
    const world = makeWorld({}, apps => { apps['1'].production.appSettings = copy(apps['2'].production.appSettings); });
    const preview = await world.preview();
    expect(preview.entries.find(entry => entry.sectionKey === 'appSettings')!.status).toBe('same');
    const composed = composeReflectSelectionStandalone(preview, {});
    const settings = composed.sections.find(section => section.sectionKey === 'appSettings')!;
    expect(settings).toMatchObject({ totalCount: 0, selectedCount: 0, editedCount: 0 });
    expect(settings.plan.operations).toEqual([]);
  });
});

function buildIds(preview: Awaited<ReturnType<ReturnType<typeof makeWorld>['preview']>>, key: string): string[] {
  const entry = preview.entries.find(item => item.sectionKey === key)!;
  return buildSectionSelectionModel(entry, preview.fieldLabels)!.changes.map(change => change.id);
}
