'use strict';

import { describe, expect, it } from 'vitest';
import {
  MAX_SELECTION_FILE_BYTES,
  SELECTION_FILE_KIND,
  applySelectionFile,
  buildSelectionFile,
  checkSelectionFileSize,
  countSelectionFile,
  describeSelectionFileApply,
  describeSelectionFileMismatch,
  describeSelectionFileSettingNotes,
  parseSelectionFile,
  selectionFileLabels,
  settingsFingerprint,
  stringifySelectionFile
} from '../../src/deploy/sourceSelectionFile.js';
import { applySelection, createSourceSession, hasJsonOverride, selectedCount, setJsonOverride, setOverride, type SourceSession, type SourceSessionDeps } from '../../src/deploy/sourceSession.js';
import type { SectionSelectionModel, SelectableChange } from '../../src/reflect/selectionTypes.js';
import type { ReflectSectionPlan } from '../../src/reflect/standalonePlan.js';

function change(section: string, pointer: string, extra: Partial<SelectableChange> = {}): SelectableChange {
  return {
    id: `${section}:${pointer}`, sectionKey: section, pointer, labelPath: [pointer], groupId: pointer, groupLabel: pointer, kind: '変更', before: 0, after: 1, beforeText: '0', afterText: '1',
    whole: false, editables: [{ pointer, label: '値', value: 1, editor: { type: 'text' } }], ...extra
  };
}

function modelOf(section: string, label: string, pointers: string[], before: any = { base: section }): SectionSelectionModel {
  return { sectionKey: section, label, before, after: {}, jsonEditable: section !== 'customizeSettings', changes: pointers.map((pointer) => change(section, pointer)) };
}

function plan(key: string): ReflectSectionPlan {
  return { sectionKey: key, label: key, status: 'change', message: '', behavior: '', changes: [], changeCount: 1, removalCount: 0, warnings: [], blockers: [], operations: [] };
}

function makeSession(models: Record<string, SectionSelectionModel>, over: { source?: string; target?: string; guest?: string; env?: 'production' | 'preview' | 'json'; preserve?: boolean; lookup?: Record<string, string> } = {}): SourceSession {
  const deps: SourceSessionDeps = {
    buildModel: (entry) => models[entry.sectionKey] || null,
    defaultState: (model) => ({ selected: model.changes.map((item) => item.id), overrides: {} }),
    compose: () => ({ sections: [], blockers: [] })
  };
  const keys = Object.keys(models);
  return createSourceSession({
    signature: 'sig',
    opts: { sourceAppId: over.source || '101', targetAppId: over.target || '202', scopes: keys, preserveTargetOnly: over.preserve ?? true, lookupMap: over.lookup || {} },
    identities: { source: { appId: over.source || '101', name: '営業管理（開発）', code: '', guestId: '' }, target: { appId: over.target || '202', name: '営業管理', code: '', guestId: over.guest || '' } },
    sourceEnvironment: over.env || 'production',
    preview: { totalSections: keys.length, changedSections: keys.length, sameSections: 0, errorSections: 0, entries: keys.map(plan), baseline: {} as any, sourceFieldCodes: [], targetFieldCodes: [], sourceSystemFieldCodes: [] }
  }, deps);
}

const world = () => ({
  fieldSettings: modelOf('fieldSettings', 'フィールド設定', ['/properties/a', '/properties/b', '/properties/c']),
  viewSettings: modelOf('viewSettings', 'ビュー設定', ['/views/x', '/views/y'])
});

describe('buildSelectionFile', () => {
  it('選択・入力欄の修正・JSON での修正・反映元と反映先を保存する', () => {
    const session = makeSession(world(), { preserve: false, lookup: { '10': '25' } });
    applySelection(session, ['fieldSettings:/properties/b'], false);
    setOverride(session, 'fieldSettings', '/properties/a', '修正後', 1);
    setJsonOverride(session, 'viewSettings', { views: { z: {} } });
    const file = buildSelectionFile({ session, scopes: ['fieldSettings', 'viewSettings'], goal: 'preview', createdAt: '2026-11-09T01:02:03.000Z' });
    expect(file.kind).toBe(SELECTION_FILE_KIND);
    expect(file.version).toBe(1);
    expect(file.createdAt).toBe('2026-11-09T01:02:03.000Z');
    expect(file.source).toEqual({ appId: '101', guestId: '', name: '営業管理（開発）', environment: 'production' });
    expect(file.target).toEqual({ appId: '202', guestId: '', name: '営業管理' });
    expect(file).toMatchObject({ scopes: ['fieldSettings', 'viewSettings'], preserveTargetOnly: false, lookupMap: { '10': '25' }, goal: 'preview' });
    const fields = file.sections.find((section) => section.sectionKey === 'fieldSettings')!;
    expect(fields.selected).toEqual(['fieldSettings:/properties/a', 'fieldSettings:/properties/c']);
    expect(fields.notSelected).toEqual(['fieldSettings:/properties/b']);
    expect(fields.overrides).toEqual([{ pointer: '/properties/a', value: '修正後' }]);
    expect(fields.json).toBeUndefined();
    const views = file.sections.find((section) => section.sectionKey === 'viewSettings')!;
    expect(views.json).toEqual({ baseHash: settingsFingerprint({ base: 'viewSettings' }), value: { views: { z: {} } } });
    expect(countSelectionFile(file)).toEqual({ selected: 4, overrides: 1, jsonSections: 1, sections: 2 });
  });

  it('JS/CSS の本文・バックアップ本体のような機微な内容を含めない（選択の ID・入力欄の値・JSON だけ）', () => {
    const session = makeSession({ ...world(), customizeSettings: modelOf('customizeSettings', 'JS/CSS設定', ['/desktop/js']) });
    const text = stringifySelectionFile(buildSelectionFile({ session, scopes: ['fieldSettings'], goal: 'production', createdAt: '2026-11-09T00:00:00.000Z' }));
    const parsed = JSON.parse(text);
    expect(Object.keys(parsed).sort()).toEqual(['createdAt', 'goal', 'kind', 'lookupMap', 'preserveTargetOnly', 'scopes', 'sections', 'source', 'target', 'version']);
    for (const section of parsed.sections) expect(Object.keys(section).sort()).toEqual(['label', 'notSelected', 'overrides', 'sectionKey', 'selected']);
    expect(text).not.toMatch(/fileKey|_content|bundles|\"before\"|\"after\"/);
  });

  it('ファイル名に使うラベルで、反映元・反映先が分かる', () => {
    const session = makeSession(world());
    const file = buildSelectionFile({ session, scopes: [], goal: 'production', createdAt: '2026-11-09T00:00:00.000Z' });
    expect(selectionFileLabels(file)).toEqual({ appLabel: '反映元-営業管理（開発）(app101)', suffix: '反映先-営業管理(app202)' });
  });
});

describe('parseSelectionFile', () => {
  const valid = () => buildSelectionFile({ session: makeSession(world()), scopes: ['fieldSettings'], goal: 'production', createdAt: '2026-11-09T00:00:00.000Z' });

  it('保存したファイルを読み込める（往復で同じ内容）', () => {
    const file = valid();
    const parsed = parseSelectionFile(stringifySelectionFile(file));
    expect(parsed).toEqual({ ok: true, file });
  });

  it('壊れたファイル・別種の JSON・新しすぎる版・大きすぎるファイルは理由を示して拒否する', () => {
    const reject = (text: string, size?: number) => { const result = parseSelectionFile(text, size); expect(result.ok).toBe(false); return result.ok ? '' : result.message; };
    expect(reject('{ not json')).toContain('JSON として読み込めませんでした');
    expect(reject('[1,2]')).toContain('選択と修正のファイルではありません');
    expect(reject(JSON.stringify({ kind: 'kintone-deploy-backup', version: 1 }))).toContain('種類: kintone-deploy-backup');
    expect(reject(JSON.stringify({ ...valid(), version: 2 }))).toContain('版（2）は読み込めません');
    expect(reject('{}', MAX_SELECTION_FILE_BYTES + 1)).toContain('大きすぎる');
    expect(checkSelectionFileSize(MAX_SELECTION_FILE_BYTES)).toBe('');
    const base = JSON.parse(JSON.stringify(valid()));
    expect(reject(JSON.stringify({ ...base, source: { guestId: '' } }))).toContain('反映元のアプリIDがありません');
    expect(reject(JSON.stringify({ ...base, source: { ...base.source, environment: 'x' } }))).toContain('反映元の取得方法がありません');
    expect(reject(JSON.stringify({ ...base, sections: [{ sectionKey: 'a', selected: 'no', notSelected: [], overrides: [] }] }))).toContain('選択の形式が不正');
    expect(reject(JSON.stringify({ ...base, sections: [{ sectionKey: 'a', selected: [], notSelected: [], overrides: [{ value: 1 }] }] }))).toContain('入力欄の修正の形式が不正');
    expect(reject(JSON.stringify({ ...base, sections: [{ sectionKey: 'a', selected: [], notSelected: [], overrides: [] }, { sectionKey: 'a', selected: [], notSelected: [], overrides: [] }] }))).toContain('重複');
    expect(reject(JSON.stringify({ ...base, goal: 'x' }))).toContain('目標がありません');
  });
});

describe('describeSelectionFileMismatch', () => {
  const file = () => buildSelectionFile({ session: makeSession(world()), scopes: ['fieldSettings'], goal: 'production', createdAt: '2026-11-09T00:00:00.000Z' });

  it('同じ反映元・反映先なら違いは無い（アプリ名が変わっていても同じ）', () => {
    const session = makeSession(world());
    session.identities.target.name = '営業管理（改名後）';
    expect(describeSelectionFileMismatch(file(), session)).toEqual([]);
  });

  it('別の反映先・反映元・取得方法・ゲストスペースは違いを示す', () => {
    expect(describeSelectionFileMismatch(file(), makeSession(world(), { target: '303' }))).toEqual([expect.stringContaining('反映先のアプリが違います（保存時: 営業管理（#202）、現在: 営業管理（#303）')]);
    expect(describeSelectionFileMismatch(file(), makeSession(world(), { source: '105' }))[0]).toContain('反映元のアプリが違います');
    expect(describeSelectionFileMismatch(file(), makeSession(world(), { env: 'preview' }))).toEqual([expect.stringContaining('保存時: 本番設定、現在: プレビュー設定')]);
    expect(describeSelectionFileMismatch(file(), makeSession(world(), { guest: '5' }))[0]).toContain('反映先のゲストスペースIDが違います');
    expect(describeSelectionFileMismatch(file(), makeSession(world(), { source: '105', target: '303' }))).toHaveLength(2);
  });

  it('保持・参照先変換の違いは読み込みを止めない注意として返す', () => {
    expect(describeSelectionFileSettingNotes(file(), makeSession(world()))).toEqual([]);
    expect(describeSelectionFileSettingNotes(file(), makeSession(world(), { preserve: false, lookup: { '1': '2' } }))).toHaveLength(2);
  });
});

describe('applySelectionFile', () => {
  const save = (session: SourceSession) => buildSelectionFile({ session, scopes: Object.keys(session.models), goal: 'production', createdAt: '2026-11-09T00:00:00.000Z' });

  it('保存 → 開き直し → 抽出 → 読み込みで、選択と入力欄の修正が戻る', () => {
    const first = makeSession(world());
    applySelection(first, ['fieldSettings:/properties/b', 'viewSettings:/views/y'], false);
    setOverride(first, 'fieldSettings', '/properties/a', '直した値', 1);
    const file = parseSelectionFile(stringifySelectionFile(save(first)));
    if (!file.ok) throw new Error(file.message);
    const next = makeSession(world());
    const result = applySelectionFile(next, file.file);
    expect(next.selected.fieldSettings).toEqual(new Set(['fieldSettings:/properties/a', 'fieldSettings:/properties/c']));
    expect(next.selected.viewSettings).toEqual(new Set(['viewSettings:/views/x']));
    expect(next.states.fieldSettings.overrides).toEqual({ '/properties/a': '直した値' });
    expect(result).toMatchObject({ selectionKept: 3, selectionLost: 0, overridesKept: 1, overridesLost: 0, jsonKept: 0, jsonLost: 0 });
  });

  it('現在の差分に無い選択・修正は当てはまらなかった件数に数え、保存後に増えた変更は既定どおり選ぶ', () => {
    const first = makeSession(world());
    applySelection(first, ['fieldSettings:/properties/c'], false);
    setOverride(first, 'fieldSettings', '/properties/a', 'x', 1);
    setOverride(first, 'fieldSettings', '/properties/b', 'y', 1);
    const file = parseSelectionFile(stringifySelectionFile(save(first)));
    if (!file.ok) throw new Error(file.message);
    // 現在の差分は、a が無くなり、新しく d が増えた。ビュー設定の差分も無い
    const next = makeSession({ fieldSettings: modelOf('fieldSettings', 'フィールド設定', ['/properties/b', '/properties/c', '/properties/d']) });
    const result = applySelectionFile(next, file.file);
    expect(next.selected.fieldSettings).toEqual(new Set(['fieldSettings:/properties/b', 'fieldSettings:/properties/d']));
    expect(next.states.fieldSettings.overrides).toEqual({ '/properties/b': 'y' });
    // 選択の当てはまらなかった 3 件は、フィールド設定の a と、現在の差分に項目が無いビュー設定の 2 件
    expect(result).toMatchObject({ selectionKept: 1, selectionLost: 3, overridesKept: 1, overridesLost: 1, sectionsLost: 1 });
    const text = describeSelectionFileApply(file.file, result);
    expect(text).toContain('当てはめたもの: 選択 1 件・入力欄の修正 1 件。');
    expect(text).toContain('当てはまらなかったもの: 選択 3 件・入力欄の修正 1 件（現在の差分に無いため）');
    expect(text).toContain('最終確認は、あらためて必要です。');
  });

  it('ファイルに含まれる項目は現在の選択・修正をファイルの内容に置き換え、含まれない項目は変えない', () => {
    const first = makeSession({ fieldSettings: world().fieldSettings });
    applySelection(first, ['fieldSettings:/properties/a'], false);
    const file = parseSelectionFile(stringifySelectionFile(save(first)));
    if (!file.ok) throw new Error(file.message);
    const next = makeSession(world());
    setOverride(next, 'fieldSettings', '/properties/b', '古い修正', 1);
    applySelection(next, ['viewSettings:/views/x'], false);
    applySelectionFile(next, file.file);
    expect(next.states.fieldSettings.overrides).toEqual({});
    expect(next.selected.fieldSettings).toEqual(new Set(['fieldSettings:/properties/b', 'fieldSettings:/properties/c']));
    expect(selectedCount(next, 'viewSettings')).toBe(1);
  });

  it('JSON での修正は、反映先の設定が保存時と同じ項目だけ当てはめる', () => {
    const first = makeSession(world());
    setJsonOverride(first, 'fieldSettings', { properties: { j: {} } });
    setJsonOverride(first, 'viewSettings', { views: { j: {} } });
    const file = parseSelectionFile(stringifySelectionFile(save(first)));
    if (!file.ok) throw new Error(file.message);
    // フィールド設定の反映先は同じ。ビュー設定の反映先は保存時から変わった
    const changed = world();
    changed.viewSettings.before = { base: 'viewSettings', late: true };
    const next = makeSession(changed);
    const result = applySelectionFile(next, file.file);
    expect(hasJsonOverride(next, 'fieldSettings')).toBe(true);
    expect(next.states.fieldSettings.json).toEqual({ properties: { j: {} } });
    expect(hasJsonOverride(next, 'viewSettings')).toBe(false);
    expect(result).toMatchObject({ jsonKept: 1, jsonLost: 1, jsonLostLabels: ['ビュー設定'] });
    const text = describeSelectionFileApply(file.file, result);
    expect(text).toContain('JSON での修正は、反映先の設定が保存時と同じだったため当てはめました。');
    expect(text).toContain('JSON での修正（ビュー設定）は、反映先の設定が保存時から変わった');
  });

  it('JSON で直せない項目・現在の差分に無い項目の JSON は当てはめない', () => {
    const first = makeSession({ ...world(), customizeSettings: modelOf('customizeSettings', 'JS/CSS設定', ['/scope']) });
    first.states.customizeSettings.json = { scope: 'ADMIN' };
    const file = parseSelectionFile(stringifySelectionFile(save(first)));
    if (!file.ok) throw new Error(file.message);
    const result = applySelectionFile(makeSession({ ...world(), customizeSettings: modelOf('customizeSettings', 'JS/CSS設定', ['/scope']) }), file.file);
    expect(result.jsonKept).toBe(0);
    expect(result.jsonLost).toBe(1);
    const gone = applySelectionFile(makeSession(world()), file.file);
    expect(gone).toMatchObject({ jsonLost: 1, sectionsLost: 1 });
  });

  it('項目名が __proto__ のようなファイルでも、プロトタイプを汚さず当てはまらないものとして数える', () => {
    const first = makeSession(world());
    const file = save(first);
    file.sections.push({ sectionKey: '__proto__', label: '怪しい項目', selected: ['x'], notSelected: [], overrides: [{ pointer: '/a', value: 1 }], json: { baseHash: 'x', value: {} } });
    const parsed = parseSelectionFile(JSON.stringify(file));
    if (!parsed.ok) throw new Error(parsed.message);
    const next = makeSession(world());
    const result = applySelectionFile(next, parsed.file);
    expect(result).toMatchObject({ sectionsLost: 1, selectionLost: 1, overridesLost: 1, jsonLost: 1 });
    expect(({} as any).overrides).toBeUndefined();
    expect(({} as any).json).toBeUndefined();
  });
});
