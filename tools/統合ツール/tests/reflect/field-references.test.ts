import { describe, expect, it } from 'vitest';
import { buildReflectSectionPlan, reflectInspectionScopes, reflectRequiredFields, reflectSelectionBlockers } from '../../src/reflect/standalonePlan';
import { attachFieldAdditionRequires, buildPlanFromComposedAfter, buildSectionSelectionModel, checkComposedAfter } from '../../src/reflect/selection';
import { composeReflectSelectionStandalone, type PreviewReflectResult } from '../../src/tabs/reflect-standalone';
import { composeSectionSelection } from '../../src/reflect/selection';
import { byPointer, copy, prepare } from './selection-helpers';
import { applyRequires } from './field-references-helpers';

const text = (code: string, extra: Record<string, any> = {}) => ({ type: 'SINGLE_LINE_TEXT', code, label: code, required: false, ...extra });
const choice = (type: string, code: string, names: string[], defaultValue: unknown) => ({
  type, code, label: code, required: false, defaultValue,
  options: Object.fromEntries(names.map((name, index) => [name, { label: name, index: String(index) }]))
});
const KNOWN = ['name', 'region', 'amount', 'shipping', 'total', 'status', 'owner'];

describe('reflectRequiredFields: クエリが参照するフィールド', () => {
  it('一覧の絞り込み条件と並び順が参照するフィールドを求める（実在する語だけ）', () => {
    const after = { views: { A: { type: 'LIST', fields: ['name'], filterCond: 'region = "東日本" and note = "x"', sort: 'amount desc' }, B: { type: 'CUSTOM', html: '', filterCond: 'status = "region"', sort: '' } } };
    expect(reflectRequiredFields('viewSettings', after, KNOWN)).toEqual(['name', 'region', 'amount', 'status']);
    // knownFieldCodes が無ければ、クエリからは参照を求めない（従来どおり）
    expect(reflectRequiredFields('viewSettings', after)).toEqual(['name']);
  });

  it('レコード権限・レコード条件通知・プロセスのアクション・グラフ・アクション・リマインダーの条件も対象にする', () => {
    expect(reflectRequiredFields('recordPermissions', { rights: [{ filterCond: 'region = "x"', entities: [] }, { filterCond: '', entities: [] }] }, KNOWN)).toEqual(['region']);
    expect(reflectRequiredFields('perRecordNotifications', { notifications: [{ filterCond: 'amount > 1', targets: [] }] }, KNOWN)).toEqual(['amount']);
    expect(reflectRequiredFields('processSettings', { states: { A: { name: 'A' } }, actions: [{ name: 'go', filterCond: 'status != "x"' }] }, KNOWN)).toEqual(['status']);
    expect(reflectRequiredFields('reportSettings', { reports: { R: { groups: [{ code: 'owner' }], aggregations: [{ type: 'COUNT' }], filterCond: 'region = "x"' } } }, KNOWN)).toEqual(['owner', 'region']);
    expect(reflectRequiredFields('actionSettings', { actions: { C: { mappings: [{ srcType: 'FIELD', srcField: 'name', dstField: 'x' }], filterCond: 'amount > 0' } } }, KNOWN)).toEqual(['name', 'amount']);
    expect(reflectRequiredFields('reminderNotifications', { notifications: [{ timing: { code: 'due' }, filterCond: 'status != "x"', targets: [] }] }, KNOWN)).toEqual(['due', 'status']);
  });

  it('レコード権限・レコード条件通知を選ぶと、フィールド設定も取得する', () => {
    expect(reflectInspectionScopes(['recordPermissions'])).toEqual(['recordPermissions', 'fieldSettings']);
    expect(reflectInspectionScopes(['perRecordNotifications'])).toEqual(['perRecordNotifications', 'fieldSettings']);
  });

  it('既定の計画に requiredFields を付け、反映先に無い追加フィールドを参照すると進めない理由にする', () => {
    const target = { rights: [{ filterCond: '', entities: [] }] }, source = { rights: [{ filterCond: 'region = "東日本"', entities: [] }] };
    const entry = buildReflectSectionPlan('recordPermissions', source, target, { knownFieldCodes: KNOWN });
    expect(entry.requiredFields).toEqual(['region']);
    const blockers = reflectSelectionBlockers([entry], ['fieldSettings', 'recordPermissions'], [], ['name'], [], ['region']);
    expect(blockers.join('\n')).toContain('参照するフィールド「region」が反映先にありません。反映元にあるフィールドなので、フィールド設定で「region」の追加も選ぶか');
    // 反映先にあれば止めない
    expect(reflectSelectionBlockers([entry], ['recordPermissions'], [], ['name', 'region'])).toEqual([]);
    // どちらのアプリにも無い語は参照とみなさず、止めない
    const unknown = buildReflectSectionPlan('recordPermissions', { rights: [{ filterCond: 'mystery = "x"', entities: [] }] }, target, { knownFieldCodes: KNOWN });
    expect(unknown.requiredFields).toEqual([]);
    expect(reflectSelectionBlockers([unknown], ['recordPermissions'], [], ['name'])).toEqual([]);
  });
});

describe('選択肢を持つフィールドの初期値の検査', () => {
  const target = { properties: { kind: choice('DROP_DOWN', 'kind', ['A', 'B'], 'A') } };
  const check = (definition: any) => checkComposedAfter('fieldSettings', target, { properties: { kind: definition } }, { kind: '種別' });

  it('ドロップダウンの初期値が選択肢に無いと、修正の段階で止める（空は可）', () => {
    expect(check(choice('DROP_DOWN', 'kind', ['A', 'B'], 'Z'))).toEqual(['フィールド「種別（kind）」の初期値「Z」が選択肢にありません。初期値は、送る設定の選択肢のどれかにしてください。']);
    expect(check(choice('DROP_DOWN', 'kind', ['A', 'B'], ''))).toEqual([]);
    expect(check(choice('DROP_DOWN', 'kind', ['A', 'B'], 'B'))).toEqual([]);
  });

  it('ラジオボタンは初期値が選択肢のどれかである必要がある（空は不可）', () => {
    const radioTarget = { properties: { kind: choice('RADIO_BUTTON', 'kind', ['A', 'B'], 'A') } };
    const radio = (defaultValue: unknown) => checkComposedAfter('fieldSettings', radioTarget, { properties: { kind: choice('RADIO_BUTTON', 'kind', ['A', 'B'], defaultValue) } }, {});
    expect(radio('')).toEqual(['フィールド「kind」の初期値がありません。ラジオボタンは、初期値を選択肢のどれかにする必要があります。']);
    expect(radio('Z')[0]).toContain('初期値「Z」が選択肢にありません');
    expect(radio('B')).toEqual([]);
  });

  it('チェックボックス・複数選択は、初期値の配列の各要素が選択肢にある必要がある', () => {
    const multi = (type: string, defaultValue: unknown) => checkComposedAfter('fieldSettings', { properties: { kind: choice(type, 'kind', ['A', 'B'], []) } }, { properties: { kind: choice(type, 'kind', ['A', 'B'], defaultValue) } }, {});
    for (const type of ['CHECK_BOX', 'MULTI_SELECT']) {
      expect(multi(type, ['A', 'B'])).toEqual([]);
      expect(multi(type, [])).toEqual([]);
      expect(multi(type, ['A', 'Z', 'Y']).map(message => /初期値「([ZY])」/.exec(message)?.[1])).toEqual(['Z', 'Y']);
      expect(multi(type, 'A')[0]).toContain('初期値の形式が不正です');
    }
  });

  it('テーブル内のフィールドも検査する', () => {
    const table = (defaultValue: unknown) => ({ properties: { items: { type: 'SUBTABLE', code: 'items', fields: { kind: choice('DROP_DOWN', 'kind', ['A'], defaultValue) } } } });
    expect(checkComposedAfter('fieldSettings', table('A'), table('Z'), { items: '明細' })[0]).toContain('フィールド「明細（items） › kind」の初期値「Z」が選択肢にありません');
  });

  it('入力欄で選択肢に無い初期値にすると compose の errors に出て、実行時の buildPlanFromComposedAfter でも書き込み前に止まる', () => {
    const source = { properties: { kind: choice('DROP_DOWN', 'kind', ['A', 'B', 'C'], 'C') } };
    const ctx = prepare('fieldSettings', source, target, { fieldLabels: { kind: '種別' } });
    const defaultChange = byPointer(ctx.model, '/properties/kind/defaultValue');
    const optionChange = byPointer(ctx.model, '/properties/kind/options/C');
    const selected = [defaultChange.id, optionChange.id];
    const ok = composeSectionSelection(ctx.model, { selected, overrides: {} }, ctx.plan, ctx.fieldLabels);
    expect(ok.errors).toEqual([]);
    const bad = composeSectionSelection(ctx.model, { selected, overrides: { '/properties/kind/defaultValue': '存在しない選択肢' } }, ctx.plan, ctx.fieldLabels);
    expect(bad.errors.join('\n')).toContain('初期値「存在しない選択肢」が選択肢にありません');
    expect(bad.plan.status).toBe('error');
    expect(bad.plan.operations).toEqual([]);
    const rebuilt = buildPlanFromComposedAfter(ctx.plan, bad.after, ctx.fieldLabels);
    expect(rebuilt.status).toBe('error');
    expect(rebuilt.blockers.join('\n')).toContain('初期値「存在しない選択肢」が選択肢にありません');
    // JSON で直した場合も同じ
    const viaJson = composeSectionSelection(ctx.model, { selected: [], overrides: {}, json: { properties: { kind: choice('DROP_DOWN', 'kind', ['A', 'B'], 'Q') } } }, ctx.plan, ctx.fieldLabels);
    expect(viaJson.errors.join('\n')).toContain('初期値「Q」が選択肢にありません');
  });
});

describe('計算式が参照するフィールド', () => {
  const calc = (expression: string) => ({ type: 'CALC', code: 'total', label: '合計', expression, format: 'NUMBER' });
  const target = { properties: { amount: text('amount'), total: calc('amount') } };
  const source = { properties: { amount: text('amount'), shipping: text('shipping', { label: '送料' }), total: calc('amount + shipping') } };
  const labels = { amount: '金額', shipping: '送料', total: '合計' };
  const ctx = () => prepare('fieldSettings', source, target, { fieldLabels: labels, knownFieldCodes: ['amount', 'shipping', 'total'] });

  it('送る設定に無いフィールドを参照する計算式は、修正の段階で止める', () => {
    const { model, plan } = ctx();
    const expression = byPointer(model, '/properties/total/expression');
    const composed = composeSectionSelection(model, { selected: [expression.id], overrides: {} }, plan, labels, ['amount', 'shipping', 'total']);
    expect(composed.errors.join('\n')).toContain('フィールド「合計（total）」の計算式が、反映先に無いフィールド「送料（shipping）」を参照しています。その追加も一緒に選ぶか');
    expect(composed.plan.status).toBe('error');
    // 送料の追加も選べば通る
    const withField = composeSectionSelection(model, { selected: [expression.id, 'fieldSettings:/properties/shipping'], overrides: {} }, plan, labels, ['amount', 'shipping', 'total']);
    expect(withField.errors).toEqual([]);
    expect(withField.plan.status).toBe('change');
  });

  it('実在しない語・文字列の中の語は参照とみなさない', () => {
    const composed = checkComposedAfter('fieldSettings', target, { properties: { amount: text('amount'), total: calc('amount * rate & "shipping"') } }, labels, ['amount', 'shipping', 'total']);
    expect(composed).toEqual([]);
  });

  it('文字列（1行）の自動計算の式も検査する', () => {
    const issues = checkComposedAfter('fieldSettings', { properties: { amount: text('amount') } }, { properties: { amount: text('amount'), label: text('label', { expression: 'amount & shipping' }) } }, labels, ['amount', 'shipping', 'label']);
    expect(issues[0]).toContain('の計算式が、反映先に無いフィールド「送料（shipping）」を参照しています');
  });

  it('knownFieldCodes が無ければ計算式は検査しない（従来どおり）', () => {
    expect(checkComposedAfter('fieldSettings', target, { properties: { amount: text('amount'), total: calc('amount + shipping') } }, labels)).toEqual([]);
  });
});

describe('項目をまたぐ選択の連動（requires）', () => {
  const calc = (expression: string) => ({ type: 'CALC', code: 'total', label: '合計', expression, format: 'NUMBER' });
  const world = () => {
    const fieldTarget = { properties: { amount: text('amount'), total: calc('amount') } };
    const fieldSource = { properties: { amount: text('amount'), shipping: text('shipping', { label: '送料' }), region: text('region', { label: '地域' }), total: calc('amount + shipping') } };
    const known = ['amount', 'shipping', 'region', 'total'];
    const labels = { amount: '金額', shipping: '送料', region: '地域', total: '合計' };
    const opts = { fieldLabels: labels, knownFieldCodes: known };
    const entries = {
      fieldSettings: buildReflectSectionPlan('fieldSettings', fieldSource, fieldTarget, opts),
      viewSettings: buildReflectSectionPlan('viewSettings', { views: { 全件: { type: 'LIST', name: '全件', index: '0', fields: ['amount'], filterCond: 'region = "東日本"', sort: 'amount desc' } } }, { views: { 全件: { type: 'LIST', name: '全件', index: '0', fields: ['amount'], filterCond: '', sort: '' } } }, opts),
      recordPermissions: buildReflectSectionPlan('recordPermissions', { rights: [{ filterCond: 'region = "x"', entities: [] }] }, { rights: [] }, opts)
    };
    const models = Object.fromEntries(Object.entries(entries).map(([key, entry]) => [key, buildSectionSelectionModel(entry, labels)!]));
    return { entries, models, known, labels };
  };

  it('計算式を選ぶと、参照する追加フィールドの追加も一緒に選ぶ（同じ項目の中）', () => {
    const { models, known } = world();
    attachFieldAdditionRequires(models, known);
    expect(byPointer(models.fieldSettings, '/properties/total/expression').requires).toEqual(['fieldSettings:/properties/shipping']);
    // 追加フィールド自身・既存のフィールドだけを参照する変更には付かない
    expect(byPointer(models.fieldSettings, '/properties/shipping').requires).toBeUndefined();
  });

  it('一覧の絞り込み条件・並び順・レコード権限の条件を選ぶと、別の項目（フィールド設定）の追加も一緒に選ぶ', () => {
    const { models, known } = world();
    attachFieldAdditionRequires(models, known);
    expect(byPointer(models.viewSettings, '/views/全件/filterCond').requires).toEqual(['fieldSettings:/properties/region']);
    // 並び順は既存の amount だけなので付かない
    expect(byPointer(models.viewSettings, '/views/全件/sort').requires).toBeUndefined();
    expect(byPointer(models.recordPermissions, '/rights').requires).toEqual(['fieldSettings:/properties/region']);
  });

  it('参照が追加ではなく反映先に実在するフィールド・どちらにも無い語のときは付けない。既にある requires は残す', () => {
    const { models, known } = world();
    const change = byPointer(models.viewSettings, '/views/全件/filterCond');
    change.requires = ['x:keep'];
    attachFieldAdditionRequires(models, known.filter(code => code !== 'region'));
    expect(change.requires).toEqual(['x:keep']);
    attachFieldAdditionRequires(models, known);
    expect(change.requires).toEqual(['x:keep', 'fieldSettings:/properties/region']);
  });

  it('テーブルごと追加するとき、テーブル内のフィールドを参照する条件はテーブルの追加に結び付ける', () => {
    const labels = { items: '明細', qty: '数量' };
    const fieldSource = { properties: { items: { type: 'SUBTABLE', code: 'items', fields: { qty: { type: 'NUMBER', code: 'qty', label: '数量' } } } } };
    const fieldTarget = { properties: {} };
    const opts = { fieldLabels: labels, knownFieldCodes: ['items', 'qty'] };
    const models = {
      fieldSettings: buildSectionSelectionModel(buildReflectSectionPlan('fieldSettings', fieldSource, fieldTarget, opts), labels)!,
      viewSettings: buildSectionSelectionModel(buildReflectSectionPlan('viewSettings', { views: { V: { type: 'LIST', name: 'V', index: '0', fields: [], filterCond: 'qty > 1', sort: '' } } }, { views: {} }, opts), labels)!
    };
    attachFieldAdditionRequires(models, ['items', 'qty']);
    expect(models.viewSettings.changes[0].requires).toEqual(['fieldSettings:/properties/items']);
  });

  it('applyRequires（セッションの選択）: 選ぶと追加も選び、追加を外すと条件も外れる', () => {
    const { models, known } = world();
    attachFieldAdditionRequires(models, known);
    const result = applyRequires(models, ['viewSettings:/views/全件/filterCond']);
    expect(result.selectedAfter).toContain('fieldSettings:/properties/region');
    expect(result.deselected).toContain('viewSettings:/views/全件/filterCond');
  });
});

describe('composeReflectSelectionStandalone: 一覧の条件が参照する追加フィールド', () => {
  it('追加を選ばなければ進めない理由を示し、追加も選べば通る', () => {
    const labels = { amount: '金額', region: '地域' };
    const fieldSource = { properties: { amount: text('amount', { label: '金額' }), region: text('region', { label: '地域' }) } };
    const fieldTarget = { properties: { amount: text('amount', { label: '金額' }) } };
    const known = ['amount', 'region'];
    const opts = { fieldLabels: labels, knownFieldCodes: known };
    const views = (filterCond: string) => ({ views: { 全件: { type: 'LIST', name: '全件', index: '0', fields: ['amount'], filterCond, sort: '' } } });
    const entries = [
      buildReflectSectionPlan('fieldSettings', fieldSource, fieldTarget, opts),
      buildReflectSectionPlan('viewSettings', views('region = "x"'), views(''), opts)
    ];
    const preview = { entries, fieldLabels: labels, sourceFieldCodes: ['amount', 'region'], targetFieldCodes: ['amount'], sourceSystemFieldCodes: [] } as unknown as PreviewReflectResult;
    const onlyView = composeReflectSelectionStandalone(preview, { fieldSettings: { selected: [], overrides: {} }, viewSettings: { selected: ['viewSettings:/views/全件/filterCond'], overrides: {} } });
    expect(onlyView.blockers.join('\n')).toContain('ビュー設定: 参照するフィールド「region」が反映先にありません。反映元にあるフィールドなので、フィールド設定で「region」の追加も選ぶか、この項目を除外してください。');
    const both = composeReflectSelectionStandalone(preview, { fieldSettings: { selected: ['fieldSettings:/properties/region'], overrides: {} }, viewSettings: { selected: ['viewSettings:/views/全件/filterCond'], overrides: {} } });
    expect(both.blockers).toEqual([]);
    expect(copy(both.sections.map(section => section.sectionKey))).toEqual(['fieldSettings', 'viewSettings']);
  });
});
