import { describe, expect, it } from 'vitest';
import { buildReflectSectionPlan } from '../../src/reflect/standalonePlan';
import { buildPlanFromComposedAfter, buildSectionSelectionModel, defaultSelectionState } from '../../src/reflect/selection';
import { byPointer, compose, copy, prepare } from './selection-helpers';

const text = (code: string, extra: Record<string, any> = {}) => ({ type: 'SINGLE_LINE_TEXT', code, label: code, required: false, ...extra });

const sourceFields = () => ({
  fieldSettings: {
    properties: {
      name: text('name', { label: '顧客名（新）', required: true }),
      memo: text('memo', { label: 'メモ', maxLength: '200' }),
      added: text('added', { label: '追加項目' }),
      kind: { type: 'DROP_DOWN', code: 'kind', label: '種別', required: false, defaultValue: 'C', options: { A: { label: 'A', index: '0' }, B: { label: 'B', index: '1' }, C: { label: 'C', index: '2' } } },
      Items: { type: 'SUBTABLE', code: 'Items', fields: { qty: { type: 'NUMBER', code: 'qty', label: '数量', required: true }, price: { type: 'NUMBER', code: 'price', label: '単価', required: false } } }
    }
  }
});
const targetFields = () => ({
  fieldSettings: {
    properties: {
      name: text('name', { label: '顧客名' }),
      memo: text('memo', { label: 'メモ', maxLength: '100' }),
      only: text('only', { label: '反映先だけ' }),
      kind: { type: 'DROP_DOWN', code: 'kind', label: '種別', required: false, defaultValue: 'A', options: { A: { label: 'A', index: '0' }, B: { label: 'B', index: '1' } } },
      Items: { type: 'SUBTABLE', code: 'Items', fields: { qty: { type: 'NUMBER', code: 'qty', label: '数量', required: false } } }
    }
  }
});

const fieldCtx = () => prepare('fieldSettings', sourceFields().fieldSettings, targetFields().fieldSettings, { fieldLabels: { name: '顧客名', memo: 'メモ', added: '追加項目', only: '反映先だけ', kind: '種別', Items: '明細', qty: '数量', price: '単価' } });
const propsOf = (composed: ReturnType<typeof compose>) => composed.plan.operations.flatMap(operation => operation.method === 'PUT' ? [operation.body.properties] : []);

describe('差分の選択: フィールド設定', () => {
  it('設定値 1 つずつの変更に分解し、日本語の名前と値を付ける', () => {
    const { model, plan } = fieldCtx();
    expect(plan.status).toBe('change');
    expect(model.sectionKey).toBe('fieldSettings');
    expect(model.jsonEditable).toBe(true);
    const label = byPointer(model, '/properties/name/label');
    expect(label).toMatchObject({
      id: 'fieldSettings:/properties/name/label', kind: '変更', whole: false, groupId: 'fieldSettings:/properties/name', groupLabel: '顧客名（新）（name）',
      beforeText: '顧客名', afterText: '顧客名（新）'
    });
    expect(label.labelPath).toEqual(['顧客名（新）（name）', 'フィールド名']);
    expect(label.before).toBe('顧客名');
    expect(label.after).toBe('顧客名（新）');
    const required = byPointer(model, '/properties/name/required');
    expect(required).toMatchObject({ kind: '変更', beforeText: 'いいえ', afterText: 'はい' });
    expect(required.labelPath).toEqual(['顧客名（新）（name）', '必須項目にする']);
    expect(required.editables).toEqual([{ pointer: '/properties/name/required', label: '必須項目にする', value: true, editor: { type: 'boolean' } }]);
    expect(label.editables).toEqual([{ pointer: '/properties/name/label', label: 'フィールド名', value: '顧客名（新）', editor: { type: 'text' } }]);
    expect(byPointer(model, '/properties/memo/maxLength')).toMatchObject({ beforeText: '100', afterText: '200', kind: '変更' });
  });

  it('種類・コードの違いは変更として出さず、反映先だけのフィールドは削除として出さない', () => {
    const source = sourceFields().fieldSettings, target = targetFields().fieldSettings;
    source.properties.memo.type = 'MULTI_LINE_TEXT';
    const plan = buildReflectSectionPlan('fieldSettings', source, target, {});
    expect(plan.blockers.join('\n')).toContain('種類が異なります');
    // 書き込めない項目（blockers あり）はモデルを作らない
    expect(plan.status).toBe('error');
    expect(buildSectionSelectionModel(plan)).toBeNull();
    // blockers を無視して分解しても、種類・コードの違いは変更として出さない
    source.properties.memo.type = 'SINGLE_LINE_TEXT'; source.properties.name.code = 'name2';
    const forced = { ...buildReflectSectionPlan('fieldSettings', source, target, {}), status: 'change' as const };
    forced.values!.after.properties.memo.type = 'MULTI_LINE_TEXT';
    const model = buildSectionSelectionModel(forced)!;
    expect(model.changes.some(change => change.pointer.endsWith('/type') || change.pointer.endsWith('/code'))).toBe(false);
    expect(model.changes.some(change => change.kind === '削除')).toBe(false);
    expect(model.changes.some(change => change.pointer.startsWith('/properties/only'))).toBe(false);
  });

  it('必須だけを選ぶと、PUT の定義は必須だけが変わり、表示名は反映先のまま', () => {
    const ctx = fieldCtx();
    const composed = compose(ctx, { selected: ['fieldSettings:/properties/name/required'] });
    expect(composed.errors).toEqual([]);
    expect(composed.selectedCount).toBe(1);
    expect(composed.totalCount).toBe(ctx.model.changes.length);
    expect(composed.plan.operations.map(operation => [operation.method, operation.label])).toEqual([['PUT', 'フィールド更新']]);
    expect(propsOf(composed)[0]).toEqual({ name: { type: 'SINGLE_LINE_TEXT', code: 'name', label: '顧客名', required: true } });
    expect(composed.after.properties.name.label).toBe('顧客名');
    expect(composed.plan.changeCount).toBe(1);
    expect(composed.plan.status).toBe('change');
    expect(composed.plan.items?.map(item => item.name)).toContain('顧客名（name）');
    // 何も選ばなければ反映先と同じで、書き込まない。
    const none = compose(ctx, { selected: [] });
    expect(none.after).toEqual(ctx.model.before);
    expect(none.plan.operations).toEqual([]);
    expect(none.plan.status).toBe('same');
  });

  it('追加フィールドは 1 つの変更（whole）で、選ぶと POST、選ばなければ POST なし', () => {
    const ctx = fieldCtx();
    const added = byPointer(ctx.model, '/properties/added');
    expect(added).toMatchObject({ kind: '追加', whole: true, groupLabel: '追加項目（added）', beforeText: '（なし）' });
    expect(added.afterText).toContain('文字列');
    expect(added.editables.map(editable => [editable.label, editable.value, editable.editor.type])).toEqual([
      ['フィールド名', '追加項目', 'text'], ['必須項目にする', false, 'boolean']
    ]);
    const withAdd = compose(ctx, { selected: [added.id] });
    expect(withAdd.plan.operations.map(operation => operation.method)).toEqual(['POST']);
    expect(Object.keys(withAdd.plan.operations[0].body.properties)).toEqual(['added']);
    expect(withAdd.plan.fieldStats).toMatchObject({ add: 1, update: 0 });
    const without = compose(ctx, { selected: ctx.model.changes.filter(change => change.id !== added.id).map(change => change.id) });
    expect(without.plan.operations.filter(operation => operation.method === 'POST').flatMap(operation => Object.keys(operation.body.properties))).toEqual(['Items']);
    expect(without.plan.operations.some(operation => operation.method === 'PUT')).toBe(true);
    expect(Object.keys(without.after.properties)).not.toContain('added');
  });

  it('選択肢の追加だけを選べる。初期値の変更は選択肢の追加と一緒に選ぶ必要がある', () => {
    const ctx = fieldCtx();
    const option = byPointer(ctx.model, '/properties/kind/options/C');
    expect(option).toMatchObject({ kind: '追加', whole: true, groupLabel: '種別（kind）', afterText: 'C' });
    expect(option.labelPath).toEqual(['種別（kind）', '選択肢', 'C']);
    const defaultValue = byPointer(ctx.model, '/properties/kind/defaultValue');
    expect(defaultValue.requires).toEqual([option.id]);
    const onlyOption = compose(ctx, { selected: [option.id] });
    expect(onlyOption.errors).toEqual([]);
    expect(propsOf(onlyOption)[0].kind.options).toEqual({ A: { label: 'A', index: '0' }, B: { label: 'B', index: '1' }, C: { label: 'C', index: '2' } });
    expect(propsOf(onlyOption)[0].kind.defaultValue).toBe('A');
    const onlyDefault = compose(ctx, { selected: [defaultValue.id] });
    expect(onlyDefault.errors.join('\n')).toContain('一緒に選んでください');
    const both = compose(ctx, { selected: [option.id, defaultValue.id] });
    expect(both.errors).toEqual([]);
    expect(propsOf(both)[0].kind.defaultValue).toBe('C');
  });

  it('テーブル内のフィールドは「テーブル名 › フィールド」でまとめ、追加は POST・既存の変更は PUT に分ける', () => {
    const ctx = fieldCtx();
    const price = byPointer(ctx.model, '/properties/Items/fields/price');
    expect(price).toMatchObject({ whole: true, kind: '追加', groupId: 'fieldSettings:/properties/Items/fields/price', groupLabel: '明細（Items） › 単価（price）' });
    const qty = byPointer(ctx.model, '/properties/Items/fields/qty/required');
    expect(qty.groupLabel).toBe('明細（Items） › 数量（qty）');
    expect(qty.labelPath).toEqual(['明細（Items） › 数量（qty）', '必須項目にする']);
    const composed = compose(ctx, { selected: [price.id, qty.id] });
    expect(composed.errors).toEqual([]);
    expect(composed.plan.operations.map(operation => [operation.method, operation.label])).toEqual([['POST', 'フィールド追加'], ['PUT', 'フィールド更新']]);
    expect(composed.plan.operations[0].body.properties).toEqual({ Items: { type: 'SUBTABLE', code: 'Items', fields: { price: { type: 'NUMBER', code: 'price', label: '単価', required: false } } } });
    expect(Object.keys(composed.plan.operations[1].body.properties.Items.fields)).toEqual(['qty']);
    // 新規行に id を含めない（追加するフィールド定義に id が無い）
    expect(JSON.stringify(composed.plan.operations[0].body)).not.toContain('"id"');
  });

  it('入力欄の修正（表示名）を反映し、選んだ変更の範囲外の修正は無視する', () => {
    const ctx = fieldCtx();
    const label = byPointer(ctx.model, '/properties/name/label');
    const composed = compose(ctx, {
      selected: [label.id],
      overrides: { '/properties/name/label': '顧客名（修正）', '/properties/memo/maxLength': '999', '/properties/name/required': true }
    });
    expect(composed.errors).toEqual([]);
    expect(composed.editedCount).toBe(1);
    expect(propsOf(composed)[0].name.label).toBe('顧客名（修正）');
    expect(propsOf(composed)[0].name.required).toBe(false);
    expect(composed.after.properties.memo.maxLength).toBe('100');
    // 追加フィールドの中の値も直せる
    const added = byPointer(ctx.model, '/properties/added');
    const addedComposed = compose(ctx, { selected: [added.id], overrides: { '/properties/added/label': '新しい名前', '/properties/added/required': true } });
    expect(addedComposed.after.properties.added).toMatchObject({ label: '新しい名前', required: true });
    expect(addedComposed.editedCount).toBe(2);
  });

  it('JSON で直した設定が優先され、形の誤り・種類の変更・フィールドの削除は errors になる', () => {
    const ctx = fieldCtx();
    const edited = copy(ctx.model.after);
    edited.properties.name.label = 'JSONで直した名前';
    const ok = compose(ctx, { selected: [], json: edited });
    expect(ok.errors).toEqual([]);
    expect(ok.editedCount).toBeGreaterThanOrEqual(1);
    expect(propsOf(ok).some(props => props.name?.label === 'JSONで直した名前')).toBe(true);

    expect(compose(ctx, { json: 'text' as any }).errors.join('\n')).toContain('オブジェクト');
    expect(compose(ctx, { json: { foo: 1 } }).errors.join('\n')).toContain('properties');

    const typeChanged = copy(ctx.model.after);
    typeChanged.properties.memo.type = 'MULTI_LINE_TEXT';
    const typeResult = compose(ctx, { json: typeChanged });
    expect(typeResult.errors.join('\n')).toContain('種類は変更できません');
    expect(typeResult.plan.status).toBe('error');

    const removed = copy(ctx.model.after);
    delete removed.properties.only;
    expect(compose(ctx, { json: removed }).errors.join('\n')).toContain('削除する設定は反映できません');

    const codeChanged = copy(ctx.model.after);
    codeChanged.properties.memo.code = 'memo2';
    expect(compose(ctx, { json: codeChanged }).errors.join('\n')).toContain('フィールドコードは変更できません');

    const typeMissing = copy(ctx.model.after);
    delete typeMissing.properties.added.type;
    expect(compose(ctx, { json: typeMissing }).errors.join('\n')).toContain('種類（type）がありません');
  });

  it('既定（全選択・修正なし）の compose は既定の計画と同じ operations になる', () => {
    const ctx = fieldCtx();
    const composed = compose(ctx, defaultSelectionState(ctx.model));
    expect(composed.errors).toEqual([]);
    expect(composed.plan.operations).toEqual(ctx.plan.operations);
    expect(composed.plan.changes).toEqual(ctx.plan.changes);
    expect(composed.plan.items).toEqual(ctx.plan.items);
    expect(composed.plan.fieldStats).toEqual(ctx.plan.fieldStats);
    expect(composed.plan.changeCount).toBe(ctx.plan.changeCount);
    expect(composed.plan.message).toBe(ctx.plan.message);
    expect(composed.selectedCount).toBe(composed.totalCount);
    expect(composed.editedCount).toBe(0);
    const rebuilt = buildPlanFromComposedAfter(ctx.plan, ctx.plan.values!.after, ctx.fieldLabels);
    expect(rebuilt.operations).toEqual(ctx.plan.operations);
  });

  it('JSON Pointer は ~ と / をエスケープし、__proto__ という名前でも壊れない', () => {
    const source = { properties: { 'a/b': text('a/b', { label: '新' }), 'c~d': text('c~d', { label: '新' }), ['__proto__']: undefined } as any };
    Object.defineProperty(source.properties, '__proto__', { value: text('__proto__', { label: '新' }), enumerable: true, configurable: true, writable: true });
    const target = { properties: { 'a/b': text('a/b'), 'c~d': text('c~d') } };
    const ctx = prepare('fieldSettings', source, target);
    expect(ctx.model.changes.map(change => change.pointer)).toContain('/properties/a~1b/label');
    expect(ctx.model.changes.map(change => change.pointer)).toContain('/properties/c~0d/label');
    const composed = compose(ctx, { selected: ['fieldSettings:/properties/a~1b/label'] });
    expect(composed.after.properties['a/b'].label).toBe('新');
    expect(composed.after.properties['c~d'].label).toBe('c~d');
    expect(Object.getPrototypeOf(composed.after.properties)).toBe(Object.prototype);
    const protoAdded = compose(ctx, { selected: ['fieldSettings:/properties/__proto__'] });
    expect(Object.prototype.hasOwnProperty.call(protoAdded.after.properties, '__proto__')).toBe(true);
    expect(({} as any).label).toBeUndefined();
  });
});
