'use strict';

import { describe, expect, it } from 'vitest';
import {
  buildRequirementIndex,
  buildSourceSetupSignature,
  clipText,
  collectRemovedSettings,
  collectSelectionBlockers,
  composedAfterMap,
  countExtraction,
  describeExtractionSummary,
  describeRequires,
  describeRoute,
  describeSourceResult,
  dependentsToDeselect,
  filterChanges,
  firstBlockerText,
  firstEditEntryBlockerText,
  describeStageStatus,
  describeDeploySkippedFollowUp,
  EXTRACTION_COUNT_HELP,
  groupChanges,
  groupCheckState,
  requiredToSelect,
  scopesCoveredBy,
  sectionsToRun,
  sourceBackupDescriptions,
  sourceRunLabel,
  sourceUndoGuidance,
  summarizeItemKinds
} from '../../src/deploy/sourceDisplay.js';
import type { ComposedReflectSelection, ComposedSection, SectionSelectionModel, SelectableChange } from '../../src/reflect/selectionTypes.js';
import type { ReflectSectionPlan } from '../../src/reflect/standalonePlan.js';

function change(id: string, extra: Partial<SelectableChange> = {}): SelectableChange {
  return {
    id, sectionKey: 'fieldSettings', pointer: `/properties/${id}`, labelPath: [`項目 ${id}`, '必須'], groupId: `g-${id}`, groupLabel: `項目 ${id}`,
    kind: '変更', before: false, after: true, beforeText: 'いいえ', afterText: 'はい', whole: false, editables: [], ...extra
  };
}

function model(changes: SelectableChange[], sectionKey = 'fieldSettings'): SectionSelectionModel {
  return { sectionKey, label: 'フィールド設定', before: {}, after: {}, changes, jsonEditable: true };
}

function plan(sectionKey: string, extra: Partial<ReflectSectionPlan> = {}): ReflectSectionPlan {
  return { sectionKey, label: sectionKey === 'fieldSettings' ? 'フィールド設定' : '一覧', status: 'change', message: '', behavior: '', changes: [], changeCount: 2, removalCount: 0, warnings: [], blockers: [], operations: [], ...extra };
}

function composedSection(sectionKey: string, extra: Partial<ComposedSection> = {}): ComposedSection {
  return { sectionKey, label: sectionKey === 'fieldSettings' ? 'フィールド設定' : '一覧', after: { key: sectionKey }, plan: plan(sectionKey), selectedCount: 1, totalCount: 2, editedCount: 0, errors: [], ...extra };
}

describe('filterChanges / groupChanges', () => {
  const changes = [
    change('a', { groupId: 'name', groupLabel: '顧客名（name）', labelPath: ['顧客名（name）', '必須'], kind: '変更', afterText: 'はい' }),
    change('b', { groupId: 'name', groupLabel: '顧客名（name）', labelPath: ['顧客名（name）', '表示名'], kind: '変更', beforeText: '取引先', afterText: '顧客名' }),
    change('c', { groupId: 'memo', groupLabel: '備考（memo）', labelPath: ['備考（memo）'], kind: '追加', whole: true }),
    change('d', { groupId: 'old', groupLabel: '旧項目（old）', labelPath: ['旧項目（old）'], kind: '削除', whole: true })
  ];

  it('キーワード（空白区切りの AND・大文字小文字を区別しない）と種類で絞り込む', () => {
    expect(filterChanges(changes, { keyword: '', kind: 'all' })).toHaveLength(4);
    expect(filterChanges(changes, { keyword: '顧客名', kind: 'all' }).map((item) => item.id)).toEqual(['a', 'b']);
    expect(filterChanges(changes, { keyword: '顧客名 取引先', kind: 'all' }).map((item) => item.id)).toEqual(['b']);
    expect(filterChanges(changes, { keyword: 'MEMO', kind: 'all' }).map((item) => item.id)).toEqual(['c']);
    expect(filterChanges(changes, { keyword: '', kind: '削除' }).map((item) => item.id)).toEqual(['d']);
    expect(filterChanges(changes, { keyword: '備考', kind: '削除' })).toEqual([]);
  });

  it('groupId ごとに最初に現れた順でまとめる', () => {
    expect(groupChanges(changes).map((group) => [group.groupId, group.changes.map((item) => item.id)])).toEqual([['name', ['a', 'b']], ['memo', ['c']], ['old', ['d']]]);
  });

  it('グループの選択状態は全部・一部・なしで示す', () => {
    expect(groupCheckState(changes.slice(0, 2), new Set(['a', 'b']))).toBe('all');
    expect(groupCheckState(changes.slice(0, 2), new Set(['a']))).toBe('some');
    expect(groupCheckState(changes.slice(0, 2), new Set())).toBe('none');
  });

  it('長い値は先頭だけ示す', () => {
    expect(clipText('a'.repeat(300), 10)).toBe(`${'a'.repeat(10)}…`);
    expect(clipText('短い', 10)).toBe('短い');
  });
});

describe('requires の連動', () => {
  const changes = [
    change('lookup', { requires: ['field'] }),
    change('field', { requires: ['base'] }),
    change('base'),
    change('other')
  ];
  const index = buildRequirementIndex([model(changes)]);

  it('選ぶときは requires を推移的にたどり、まだ選んでいないものだけを返す', () => {
    expect(requiredToSelect(['lookup'], index, new Set()).sort()).toEqual(['base', 'field']);
    expect(requiredToSelect(['lookup'], index, new Set(['field'])).sort()).toEqual(['base']);
    expect(requiredToSelect(['other'], index, new Set())).toEqual([]);
  });

  it('存在しない id を requires に持っても無視する', () => {
    const lone = buildRequirementIndex([model([change('x', { requires: ['missing'] })])]);
    expect(requiredToSelect(['x'], lone, new Set())).toEqual([]);
  });

  it('外すときは、それを必要とする選択中の変更も一緒に外す', () => {
    const all = new Set(['lookup', 'field', 'base', 'other']);
    expect(dependentsToDeselect(['base'], index, all).sort()).toEqual(['field', 'lookup']);
    expect(dependentsToDeselect(['field'], index, all)).toEqual(['lookup']);
    expect(dependentsToDeselect(['base'], index, new Set(['base']))).toEqual([]);
    expect(dependentsToDeselect(['other'], index, all)).toEqual([]);
  });

  it('一緒に選ばれる変更の場所を示す', () => {
    expect(describeRequires(changes[0], index)).toBe('選ぶと一緒に選ばれる変更: 項目 field / 必須');
    expect(describeRequires(changes[3], index)).toBe('');
  });
});

describe('抽出結果の要約と進めない理由', () => {
  const entries = [
    plan('fieldSettings', { changeCount: 3 }),
    plan('layoutSettings', { status: 'same', changeCount: 0 }),
    plan('viewSettings', { status: 'error', message: '一覧の取得に失敗しました。', blockers: ['一覧の取得に失敗しました。'] })
  ];

  it('項目ごとの状態と変更の合計を数える（scopes で絞れる）', () => {
    expect(countExtraction(entries)).toEqual({ change: 1, same: 1, error: 1, changes: 3 });
    expect(countExtraction(entries, ['fieldSettings', 'layoutSettings'])).toEqual({ change: 1, same: 1, error: 0, changes: 3 });
    expect(describeExtractionSummary(countExtraction(entries))).toBe('差分のある項目 1・差分なし 1・取得失敗 1（変更 3 件）。');
    expect(describeExtractionSummary({ change: 0, same: 2, error: 0, changes: 0 })).toContain('差分はありません');
  });

  it('変更の合計は、モデルがあればその項目で選べる変更の数にそろえる（レイアウト・配列は全体で 1 件）', () => {
    const models = { fieldSettings: model([change('a'), change('b')]) };
    const counts = countExtraction(entries, undefined, models);
    expect(counts).toEqual({ change: 1, same: 1, error: 1, changes: 2 });
    expect(describeExtractionSummary(counts)).toBe('差分のある項目 1・差分なし 1・取得失敗 1（変更 2 件）。');
    // モデルを作れなかった項目は、差分の計画の件数で数える
    expect(countExtraction(entries, undefined, {}).changes).toBe(3);
    expect(EXTRACTION_COUNT_HELP).toContain('選べる変更の数');
  });

  it('反映先が前回の反映を処理中なら、抽出し直すまで進めない（確認できなかったときは止めない）', () => {
    const composed: ComposedReflectSelection = { sections: [composedSection('fieldSettings')], blockers: [] };
    const base = { entries: [entries[0]], activeScopes: ['fieldSettings'], models: { fieldSettings: model([change('a')]) }, composed };
    const processing = collectSelectionBlockers({ ...base, targetDeployStatus: { state: 'processing', message: '反映先は前回の反映を kintone が処理中です。完了してから抽出し直してください。' } });
    expect(processing.processing).toContain('処理中です');
    expect(firstBlockerText(processing)).toBe('反映先は前回の反映を kintone が処理中です。完了してから抽出し直してください。');
    expect(firstEditEntryBlockerText(processing)).toBe(firstBlockerText(processing));
    for (const targetDeployStatus of [undefined, { state: 'idle' as const, message: '' }, { state: 'unknown' as const, message: '確認できませんでした。' }]) {
      const result = collectSelectionBlockers({ ...base, targetDeployStatus });
      expect(result.processing).toBe('');
      expect(firstBlockerText(result)).toBe('');
    }
  });

  it('取得失敗の項目を選んだままでは進めない。外すと進める', () => {
    const models = { fieldSettings: model([change('a')]) };
    const composed: ComposedReflectSelection = { sections: [composedSection('fieldSettings')], blockers: [] };
    const blocked = collectSelectionBlockers({ entries, activeScopes: ['fieldSettings', 'viewSettings'], models, composed });
    expect(blocked.failed.map((item) => item.sectionKey)).toEqual(['viewSettings']);
    expect(firstBlockerText(blocked)).toContain('取得失敗の項目（一覧）');
    const released = collectSelectionBlockers({ entries, activeScopes: ['fieldSettings'], models, composed });
    expect(released.failed).toEqual([]);
    expect(firstBlockerText(released)).toBe('');
  });

  it('モデルが無く一致でもない項目（書き込めない項目）も進めない', () => {
    const result = collectSelectionBlockers({ entries: [plan('fieldSettings', { blockers: ['種類が異なります。'] })], activeScopes: ['fieldSettings'], models: {}, composed: null });
    expect(result.failed[0].message).toBe('種類が異なります。');
  });

  it('参照フィールドの不足と修正内容の問題を示し、何も選んでいなければ空と判定する', () => {
    const composed: ComposedReflectSelection = {
      sections: [composedSection('viewSettings', { selectedCount: 0, errors: ['JSONの形式が正しくありません。'] })],
      blockers: ['一覧: 参照するフィールド「memo」が反映先にありません。']
    };
    const result = collectSelectionBlockers({ entries: [plan('viewSettings')], activeScopes: ['viewSettings'], models: { viewSettings: model([change('v')], 'viewSettings') }, composed });
    expect(result.problems).toEqual(['一覧: JSONの形式が正しくありません。', '一覧: 参照するフィールド「memo」が反映先にありません。']);
    expect(result.empty).toBe(true);
    expect(firstBlockerText({ processing: '', failed: [], problems: [], references: [], empty: true })).toBe('反映する差分を選んでください。');
  });

  it('外した項目の問題は数えない', () => {
    const composed: ComposedReflectSelection = { sections: [composedSection('viewSettings', { errors: ['x'] }), composedSection('fieldSettings')], blockers: [] };
    const result = collectSelectionBlockers({ entries: [plan('viewSettings'), plan('fieldSettings')], activeScopes: ['fieldSettings'], models: { fieldSettings: model([change('a')]), viewSettings: model([change('v')], 'viewSettings') }, composed });
    expect(result.problems).toEqual([]);
  });
});

describe('入力の署名', () => {
  const base = { sourceKind: 'production' as const, sourceAppId: '10', sourceGuestId: '', jsonToken: '', targetAppId: '20', targetGuestId: '', preserveTargetOnly: true, lookupMap: { '2': '4', '1': '3' } };

  it('参照先変換の順序に依存せず、入力が変わると署名が変わる', () => {
    expect(buildSourceSetupSignature(base)).toBe(buildSourceSetupSignature({ ...base, lookupMap: { '1': '3', '2': '4' } }));
    expect(buildSourceSetupSignature(base)).not.toBe(buildSourceSetupSignature({ ...base, sourceKind: 'preview' }));
    expect(buildSourceSetupSignature(base)).not.toBe(buildSourceSetupSignature({ ...base, targetAppId: '21' }));
    expect(buildSourceSetupSignature(base)).not.toBe(buildSourceSetupSignature({ ...base, preserveTargetOnly: false }));
    expect(buildSourceSetupSignature(base)).not.toBe(buildSourceSetupSignature({ ...base, jsonToken: 'a.json:1' }));
  });

  it('項目は抽出時の部分集合なら抽出結果を使える', () => {
    expect(scopesCoveredBy(['fieldSettings'], ['fieldSettings', 'layoutSettings'])).toBe(true);
    expect(scopesCoveredBy(['fieldSettings', 'viewSettings'], ['fieldSettings'])).toBe(false);
    expect(scopesCoveredBy([], ['fieldSettings'])).toBe(false);
  });
});

describe('最終確認の文言', () => {
  it('経路・実行ボタン・バックアップはゴールで変わる', () => {
    expect(describeRoute('営業テンプレート（開発）', '営業管理', 'production')).toBe('営業テンプレート（開発） → 営業管理のプレビュー → 営業管理の本番');
    expect(describeRoute('設定JSON', '営業管理', 'preview')).toBe('設定JSON → 営業管理のプレビュー（本番へは反映しません）');
    expect(sourceRunLabel('production')).toBe('確認した内容を反映先へ書き込み、本番へ反映');
    expect(sourceRunLabel('preview')).toBe('確認した内容を反映先プレビューへ反映');
    expect(sourceBackupDescriptions('production')).toHaveLength(2);
    expect(sourceBackupDescriptions('preview')).toHaveLength(1);
  });

  it('本番へ反映するときは取り消せないと言い切り、プレビューまでのときは変更を中止での取り消しを案内する', () => {
    expect(sourceUndoGuidance('production', { state: 'clean' })).toContain('本番への反映は取り消せません');
    expect(sourceUndoGuidance('preview', { state: 'clean' })).toContain('変更を中止');
  });

  it('変更の要約は保持を数えない', () => {
    expect(summarizeItemKinds([{ kind: '追加', name: 'a', details: [] }, { kind: '追加', name: 'b', details: [] }, { kind: '保持', name: 'c', details: [] }, { kind: '削除', name: 'd', details: [] }])).toBe('削除 1・追加 2');
    expect(summarizeItemKinds([])).toBe('');
  });

  it('削除される設定を集め、フィールドの削除は見分ける', () => {
    const sections = [
      composedSection('fieldSettings', { plan: plan('fieldSettings', { items: [{ kind: '削除', name: '旧項目（old）', details: [] }, { kind: '追加', name: '新項目', details: [] }] }) }),
      composedSection('viewSettings', { plan: plan('viewSettings', { items: [{ kind: '削除', name: '古い一覧', details: [] }] }) })
    ];
    const removed = collectRemovedSettings(sections);
    expect(removed.map((item) => [item.sectionKey, item.isField])).toEqual([['fieldSettings', true], ['viewSettings', false]]);
    expect(removed[0].text).toContain('旧項目（old）');
  });

  it('実行に渡すのは、選んだ変更がある有効な項目だけ', () => {
    const composed: ComposedReflectSelection = { sections: [composedSection('fieldSettings'), composedSection('viewSettings', { selectedCount: 0 }), composedSection('layoutSettings')], blockers: [] };
    const run = sectionsToRun(composed, ['fieldSettings', 'viewSettings']);
    expect(run.map((section) => section.sectionKey)).toEqual(['fieldSettings']);
    expect(composedAfterMap(run)).toEqual({ fieldSettings: { key: 'fieldSettings' } });
    expect(sectionsToRun(null, ['fieldSettings'])).toEqual([]);
  });
});

describe('describeSourceResult', () => {
  const ok = (key: string) => ({ sectionKey: key, label: key === 'fieldSettings' ? 'フィールド設定' : '一覧', status: 'ok' as const });

  it('成功: プレビューへの書き込みと本番への反映を結果の動詞で伝える', () => {
    const result = describeSourceResult({ goal: 'production', sections: [ok('fieldSettings'), ok('viewSettings')], deploy: { ok: true, text: '1 アプリを本番へ反映しました。' } });
    expect(result).toEqual({ text: '2 項目を反映先プレビューへ反映し、1 アプリを本番へ反映しました。', tone: 'ok' });
  });

  it('プレビューまでのときは、本番へは反映していないことを示す', () => {
    expect(describeSourceResult({ goal: 'preview', sections: [ok('fieldSettings')] })).toEqual({ text: '1 項目を反映先プレビューへ反映しました。本番へは反映していません。', tone: 'ok' });
  });

  it('本番へ反映しなかったときは警告にし、理由を添える', () => {
    const result = describeSourceResult({ goal: 'production', sections: [ok('fieldSettings')], deploySkipped: '反映先プレビューの未公開の変更の了承がないため、本番へは反映しませんでした。' });
    expect(result.tone).toBe('warn');
    expect(result.text).toContain('本番へは反映していません。反映先プレビューの未公開の変更');
  });

  it('一部失敗は成功数・失敗数・理由の順', () => {
    const result = describeSourceResult({ goal: 'production', sections: [ok('fieldSettings'), { sectionKey: 'viewSettings', label: '一覧', status: 'ng', message: '権限がありません（CB_NO02）\n[API] PUT' }, { sectionKey: 'layoutSettings', label: 'レイアウト', status: 'pending' }] });
    expect(result.tone).toBe('warn');
    expect(result.text).toBe('3 項目中 1 項目を反映先プレビューへ反映しました。失敗 1 項目、未実行 1 項目（一覧: 権限がありません（CB_NO02））。本番へは反映していません。');
  });

  it('1 項目も反映できなければエラー', () => {
    expect(describeSourceResult({ goal: 'production', sections: [{ sectionKey: 'fieldSettings', label: 'フィールド設定', status: 'ng', message: '失敗' }] }).tone).toBe('err');
  });

  it('中止は処理した数と未実行の数を示す', () => {
    const result = describeSourceResult({ goal: 'production', cancelled: true, sections: [ok('fieldSettings'), { sectionKey: 'viewSettings', label: '一覧', status: 'pending' }, { sectionKey: 'layoutSettings', label: 'レイアウト', status: 'pending' }] });
    expect(result.tone).toBe('warn');
    expect(result.text).toBe('中止しました（1/3 項目を反映先プレビューへ反映、残り 2 項目は未実行）。書き込み済みの分は反映先プレビューに残っています。本番へは反映していません。');
  });
});

describe('段階を移ったときの状態欄', () => {
  it('段階に合った文言を返す（抽出直後の文言のままにしない）', () => {
    expect(describeStageStatus('select')).toBe('反映する変更を選んでください。まだ書き込んでいません。');
    expect(describeStageStatus('edit')).toBe('内容を確認し、必要なら直してください。まだ書き込んでいません。');
    expect(describeStageStatus('confirm')).toContain('最終確認です');
    expect(describeStageStatus('setup')).toContain('差分を抽出します');
  });
});

describe('本番へ反映しなかったときの、反映先プレビューの案内', () => {
  it('書き込み済みのときだけ「プレビューの変更を公開」から続けられると案内する（1 件も書き込めていない・一部だけのときは重ねない）', () => {
    expect(describeDeploySkippedFollowUp()).toContain('反映先プレビューには書き込み済みです');
    expect(describeDeploySkippedFollowUp('all')).toContain('「プレビューの変更を公開」');
    expect(describeDeploySkippedFollowUp('none')).toBe('');
    expect(describeDeploySkippedFollowUp('partial')).toBe('');
  });
});
