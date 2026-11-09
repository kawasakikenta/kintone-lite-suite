'use strict';

import { describe, expect, it } from 'vitest';
import {
  applySelection,
  carryOverSession,
  clearOverrides,
  createSourceSession,
  describeCarryOver,
  hasCarryOverLoss,
  hasJsonOverride,
  hasOverride,
  recomposeSession,
  selectedCount,
  setJsonOverride,
  setOverride,
  type SourceSessionDeps
} from '../../src/deploy/sourceSession.js';
import type { SectionSelectionModel, SelectableChange } from '../../src/reflect/selectionTypes.js';
import type { ReflectSectionPlan } from '../../src/reflect/standalonePlan.js';

function change(id: string, extra: Partial<SelectableChange> = {}): SelectableChange {
  return { id, sectionKey: 'fieldSettings', pointer: id, labelPath: [id], groupId: id, groupLabel: id, kind: '変更', before: 0, after: 1, beforeText: '0', afterText: '1', whole: false, editables: [], ...extra };
}

const model: SectionSelectionModel = {
  sectionKey: 'fieldSettings', label: 'フィールド設定', before: {}, after: {}, jsonEditable: true,
  changes: [change('a'), change('b', { requires: ['a'] }), change('c')]
};

function plan(key: string, status: ReflectSectionPlan['status'] = 'change'): ReflectSectionPlan {
  return { sectionKey: key, label: key, status, message: '', behavior: '', changes: [], changeCount: 1, removalCount: 0, warnings: [], blockers: [], operations: [] };
}

const calls: any[] = [];
const deps: SourceSessionDeps = {
  buildModel: (entry) => (entry.sectionKey === 'fieldSettings' ? model : null),
  defaultState: (m) => ({ selected: m.changes.map((c) => c.id), overrides: {} }),
  compose: (preview, states) => { calls.push({ scopes: preview.entries.map((e) => e.sectionKey), states: JSON.parse(JSON.stringify(states)) }); return { sections: [], blockers: [] }; }
};

function session() {
  const entries = [plan('fieldSettings'), plan('layoutSettings'), plan('viewSettings', 'error')];
  return createSourceSession({
    signature: 'sig', opts: { sourceAppId: '1', targetAppId: '2', scopes: ['fieldSettings', 'layoutSettings', 'viewSettings'] },
    identities: { source: { appId: '1', name: 's', code: '', guestId: '' }, target: { appId: '2', name: 't', code: '', guestId: '' } },
    sourceEnvironment: 'production',
    preview: { totalSections: 3, changedSections: 2, sameSections: 0, errorSections: 1, entries, baseline: {} as any, sourceFieldCodes: [], targetFieldCodes: [], sourceSystemFieldCodes: [] }
  }, deps);
}

describe('createSourceSession', () => {
  it('差分のある項目だけ選択モデルを作り、既定ですべて選ぶ', () => {
    const s = session();
    expect(Object.keys(s.models)).toEqual(['fieldSettings']);
    expect(selectedCount(s, 'fieldSettings')).toBe(3);
    expect(s.scopes).toEqual(['fieldSettings', 'layoutSettings', 'viewSettings']);
  });

  it('モデルを作れなかった項目は理由を残す', () => {
    const s = createSourceSession({
      signature: 'x', opts: { sourceAppId: '1', targetAppId: '2', scopes: ['fieldSettings'] },
      identities: { source: { appId: '1', name: 's', code: '', guestId: '' }, target: { appId: '2', name: 't', code: '', guestId: '' } },
      sourceEnvironment: 'json',
      preview: { totalSections: 1, changedSections: 1, sameSections: 0, errorSections: 0, entries: [plan('fieldSettings')], baseline: {} as any, sourceFieldCodes: [], targetFieldCodes: [], sourceSystemFieldCodes: [] }
    }, { ...deps, buildModel: () => { throw new Error('壊れた計画'); } });
    expect(s.modelErrors.fieldSettings).toBe('壊れた計画');
    expect(Object.keys(s.models)).toEqual([]);
  });
});

describe('applySelection', () => {
  it('外すと requires を持つ変更も外し、選ぶと requires も選ぶ', () => {
    const s = session();
    expect(applySelection(s, ['a'], false)).toEqual({ changed: ['a', 'b'], required: [], cascaded: ['b'] });
    expect(selectedCount(s, 'fieldSettings')).toBe(1);
    expect(applySelection(s, ['b'], true)).toEqual({ changed: ['b', 'a'], required: ['a'], cascaded: [] });
    expect(selectedCount(s, 'fieldSettings')).toBe(3);
  });

  it('状態が変わらない操作は changed を空にし、知らない ID は無視する', () => {
    const s = session();
    expect(applySelection(s, ['a', 'zzz'], true).changed).toEqual([]);
  });
});

describe('recomposeSession', () => {
  it('選択の実体をモデルの順で状態へ書き戻し、有効な項目だけ作り直しへ渡す', () => {
    const s = session();
    calls.length = 0;
    applySelection(s, ['c'], false);
    recomposeSession(s, ['fieldSettings', 'layoutSettings'], deps);
    expect(calls[0].scopes).toEqual(['fieldSettings', 'layoutSettings']);
    expect(calls[0].states.fieldSettings.selected).toEqual(['a', 'b']);
    recomposeSession(s, ['layoutSettings'], deps);
    expect(Object.keys(calls[1].states)).toEqual([]);
  });

  it('作り直しが例外を投げたら composeError に残す', () => {
    const s = session();
    recomposeSession(s, ['fieldSettings'], { ...deps, compose: () => { throw new Error('作れません'); } });
    expect(s.composed).toBeNull();
    expect(s.composeError).toBe('作れません');
  });
});

describe('修正の保存', () => {
  it('入力欄の値は既定と同じなら消し、JSON は設定・取り消しできる', () => {
    const s = session();
    setOverride(s, 'fieldSettings', '/p', 'x', 'y');
    expect(hasOverride(s, 'fieldSettings', '/p')).toBe(true);
    setOverride(s, 'fieldSettings', '/p', 'y', 'y');
    expect(hasOverride(s, 'fieldSettings', '/p')).toBe(false);
    setOverride(s, 'fieldSettings', '/p', 'x', 'y');
    clearOverrides(s, 'fieldSettings');
    expect(hasOverride(s, 'fieldSettings', '/p')).toBe(false);
    setJsonOverride(s, 'fieldSettings', { a: 1 });
    expect(hasJsonOverride(s, 'fieldSettings')).toBe(true);
    setJsonOverride(s, 'fieldSettings', undefined);
    expect(hasJsonOverride(s, 'fieldSettings')).toBe(false);
  });
});

describe('carryOverSession（書き込み前に止まった後の抽出し直し）', () => {
  const edit = (id: string, pointer: string) => change(id, { editables: [{ pointer, label: pointer, value: 'v', editor: { type: 'text' } }] });
  const modelOf = (changes: SelectableChange[]): SectionSelectionModel => ({ sectionKey: 'fieldSettings', label: 'フィールド設定', before: {}, after: {}, jsonEditable: true, changes });
  function make(changes: SelectableChange[], key = 'fieldSettings') {
    const m = modelOf(changes);
    return createSourceSession({
      signature: 'sig', opts: { sourceAppId: '1', targetAppId: '2', scopes: [key] },
      identities: { source: { appId: '1', name: 's', code: '', guestId: '' }, target: { appId: '2', name: 't', code: '', guestId: '' } },
      sourceEnvironment: 'production',
      preview: { totalSections: 1, changedSections: 1, sameSections: 0, errorSections: 0, entries: [plan(key)], baseline: {} as any, sourceFieldCodes: [], targetFieldCodes: [], sourceSystemFieldCodes: [] }
    }, { ...deps, buildModel: () => m });
  }

  it('同じ change.id の選択と、同じ pointer の入力欄の修正を引き継ぎ、今回だけの変更は既定（選ぶ）にする', () => {
    const previous = make([edit('a', '/a/label'), change('b'), change('c')]);
    applySelection(previous, ['b'], false);
    setOverride(previous, 'fieldSettings', '/a/label', 'お客様名', 'v');
    const next = make([edit('a', '/a/label'), change('b'), change('c'), change('d')]);
    const summary = carryOverSession(next, previous);
    expect([...next.selected.fieldSettings]).toEqual(['a', 'c', 'd']);
    expect(next.states.fieldSettings.overrides).toEqual({ '/a/label': 'お客様名' });
    expect(summary).toEqual({ selectionKept: 2, selectionLost: 0, overridesKept: 1, overridesLost: 0, jsonLost: 0 });
    expect(hasCarryOverLoss(summary)).toBe(false);
    expect(describeCarryOver(summary)).toBe('前回の選択 2 件・入力欄の修正 1 件を引き継ぎました。');
  });

  it('更新後の差分に無い選択・入力欄の修正・JSON での修正は、引き継げなかった件数として数える', () => {
    const previous = make([edit('a', '/a/label'), edit('b', '/b/label'), change('c')]);
    setOverride(previous, 'fieldSettings', '/a/label', 'A', 'v');
    setOverride(previous, 'fieldSettings', '/b/label', 'B', 'v');
    setJsonOverride(previous, 'fieldSettings', { properties: {} });
    const next = make([edit('a', '/a/label'), change('c')]);
    const summary = carryOverSession(next, previous);
    expect([...next.selected.fieldSettings]).toEqual(['a', 'c']);
    expect(next.states.fieldSettings.overrides).toEqual({ '/a/label': 'A' });
    expect(next.states.fieldSettings.json).toBeUndefined();
    expect(summary).toEqual({ selectionKept: 2, selectionLost: 1, overridesKept: 1, overridesLost: 1, jsonLost: 1 });
    expect(hasCarryOverLoss(summary)).toBe(true);
    expect(describeCarryOver(summary)).toBe('前回の選択 2 件・入力欄の修正 1 件を引き継ぎました。引き継げなかったもの: 選択 1 件・入力欄の修正 1 件・JSON での修正 1 項目（更新後の差分に無い、または JSON のため）。選び直してください。');
  });

  it('選んだ変更が必要とする変更が外れていたら、一緒に選ぶ。前回の項目が今回の差分に無いときは、その選択を引き継げなかった件数にする', () => {
    const previous = make([change('a'), change('b', { requires: ['a'] })]);
    applySelection(previous, ['a'], false);
    previous.selected.fieldSettings.add('b');
    const next = make([change('a'), change('b', { requires: ['a'] })]);
    carryOverSession(next, previous);
    expect([...next.selected.fieldSettings].sort()).toEqual(['a', 'b']);
    const other = createSourceSession({
      signature: 'sig', opts: { sourceAppId: '1', targetAppId: '2', scopes: ['layoutSettings'] },
      identities: { source: { appId: '1', name: 's', code: '', guestId: '' }, target: { appId: '2', name: 't', code: '', guestId: '' } },
      sourceEnvironment: 'production',
      preview: { totalSections: 1, changedSections: 0, sameSections: 1, errorSections: 0, entries: [plan('layoutSettings', 'same')], baseline: {} as any, sourceFieldCodes: [], targetFieldCodes: [], sourceSystemFieldCodes: [] }
    }, deps);
    expect(carryOverSession(other, previous)).toMatchObject({ selectionKept: 0, selectionLost: 1 });
  });

  it('引き継ぐものが無いときの案内', () => {
    expect(describeCarryOver({ selectionKept: 0, selectionLost: 0, overridesKept: 0, overridesLost: 0, jsonLost: 0 })).toBe('前回の選択と修正はありませんでした。');
  });
});
