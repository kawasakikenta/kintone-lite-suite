import { describe, it, expect } from 'vitest';
import {
  buildFieldApplyConfirmText,
  parseFieldJsonInput,
  parseLookupMapInput,
  planBulkRename,
  planFieldApply
} from '../../src/tabs/field-standalone';

// フィールド追加 lite の反映計画。API を呼ぶ前に何を追加・更新・スキップするかを
// 確認ダイアログとログで見せるため、計画は純粋関数として固定する。

describe('parseFieldJsonInput', () => {
  it('accepts both wrapped and bare property maps', () => {
    expect(parseFieldJsonInput('{"properties":{"a":{"type":"SINGLE_LINE_TEXT"}}}')).toEqual({ a: { type: 'SINGLE_LINE_TEXT' } });
    expect(parseFieldJsonInput('{"a":{"type":"SINGLE_LINE_TEXT"}}')).toEqual({ a: { type: 'SINGLE_LINE_TEXT' } });
  });

  it('explains parse and shape errors', () => {
    expect(() => parseFieldJsonInput('')).toThrow(/入力してください/);
    expect(() => parseFieldJsonInput('{oops')).toThrow(/解析できません/);
    expect(() => parseFieldJsonInput('[]')).toThrow(/properties/);
    expect(() => parseFieldJsonInput('{"properties":{}}')).toThrow(/反映対象/);
    expect(() => parseFieldJsonInput('{"properties":{"name":null}}')).toThrow(/定義がオブジェクト/);
    expect(() => parseFieldJsonInput('{"properties":{"name":{"label":"名前"}}}')).toThrow(/type がありません/);
    expect(parseFieldJsonInput('{"properties":{"old_name":{"type":"SINGLE_LINE_TEXT","code":"new_name"}}}'))
      .toEqual({ old_name: { type: 'SINGLE_LINE_TEXT', code: 'new_name' } });
  });

  it('parses lookup maps and rejects malformed input', () => {
    expect(parseLookupMapInput(' {"10":" 20 ", "": "x", "30": ""} ')).toEqual({ '10': '20' });
    expect(parseLookupMapInput('')).toEqual({});
    expect(() => parseLookupMapInput('[1]')).toThrow(/形式/);
  });
});

describe('planFieldApply', () => {
  const incoming = {
    title: { type: 'SINGLE_LINE_TEXT', label: 'Title' },
    rec: { type: 'RECORD_NUMBER', code: 'rec' },
    ref: { type: 'SINGLE_LINE_TEXT', lookup: { relatedApp: { app: '10' }, relatedKeyField: 'k' } },
    existing: { type: 'NUMBER' }
  };
  const current = { existing: { type: 'NUMBER', code: 'existing' } };

  it('separates adds, updates and skips and fills the code', () => {
    const plan = planFieldApply(incoming, current, { '10': '20' }, false);
    expect(Object.keys(plan.adds)).toEqual(['title', 'ref']);
    expect(plan.adds.title.code).toBe('title');
    expect(plan.adds.ref.lookup.relatedApp.app).toBe('20');
    expect(plan.updates).toEqual({});
    expect(plan.skippedSystem).toEqual(['rec']);
    expect(plan.skippedExisting).toEqual(['existing']);
    expect(plan.lookupConverted).toEqual(['ref']);
    expect(plan.logs).toEqual(['ADD title', 'SKIP rec (system)', 'ADD ref (参照先AppID変換)', 'SKIP existing (exists)']);
  });

  it('updates existing fields when overwrite is on', () => {
    const plan = planFieldApply(incoming, current, {}, true);
    expect(Object.keys(plan.updates)).toEqual(['existing']);
    expect(plan.skippedExisting).toEqual([]);
    const text = buildFieldApplyConfirmText('99', '3', plan);
    expect(text).toContain('App 99（ゲスト 3）');
    expect(text).toContain('追加 2件 / 更新 1件 / スキップ 1件');
    expect(text).toContain('追加: title、ref');
    expect(text).toContain('更新: existing');
    expect(text).toContain('削除 0件');
  });

  it('preserves an explicit new code for an existing field rename', () => {
    const plan = planFieldApply(
      { old_name: { type: 'SINGLE_LINE_TEXT', code: 'new_name' } },
      { old_name: { type: 'SINGLE_LINE_TEXT', code: 'old_name' } },
      {},
      true
    );
    expect(plan.updates).toEqual({ old_name: { type: 'SINGLE_LINE_TEXT', code: 'new_name' } });
  });
});

describe('参照先AppID変換 (lookup & referenceTable)', () => {
  const refTableDef = (app: string, code?: string) => ({
    type: 'RELATED_RECORDS',
    referenceTable: {
      relatedApp: code != null ? { app, code } : { app },
      condition: { field: { code: 'k' }, relatedField: { code: 'k' } },
      filterCond: '', displayFields: [], sort: '', size: '5'
    }
  });

  it('(a) referenceTable の relatedApp.app が変換される', () => {
    const plan = planFieldApply({ rel: refTableDef('10', 'OLD') }, {}, { '10': '20' }, false);
    expect(plan.adds.rel.referenceTable.relatedApp.app).toBe('20');
    expect(plan.lookupConverted).toEqual(['rel']);
  });

  it('(b) 変換時に referenceTable.relatedApp.code が削除される', () => {
    const plan = planFieldApply({ rel: refTableDef('10', 'OLD') }, {}, { '10': '20' }, false);
    expect(plan.adds.rel.referenceTable.relatedApp).toEqual({ app: '20' });
  });

  it('(b) 変換時に lookup.relatedApp.code が削除される (field-standalone)', () => {
    const incoming = {
      lk: { type: 'SINGLE_LINE_TEXT', lookup: { relatedApp: { app: '10', code: 'OLD' }, relatedKeyField: 'k', fieldMappings: [] } }
    };
    const plan = planFieldApply(incoming, {}, { '10': '20' }, false);
    expect(plan.adds.lk.lookup.relatedApp).toEqual({ app: '20' });
  });

  it('(c) マップに無い app は app も code も変わらない', () => {
    const plan = planFieldApply(
      {
        lk: { type: 'SINGLE_LINE_TEXT', lookup: { relatedApp: { app: '99', code: 'KEEP_L' }, relatedKeyField: 'k', fieldMappings: [] } },
        rel: refTableDef('88', 'KEEP_R')
      },
      {},
      { '10': '20' },
      false
    );
    expect(plan.adds.lk.lookup.relatedApp).toEqual({ app: '99', code: 'KEEP_L' });
    expect(plan.adds.rel.referenceTable.relatedApp).toEqual({ app: '88', code: 'KEEP_R' });
    expect(plan.lookupConverted).toEqual([]);
  });

  it('(d) lookup の既存変換動作が変わらない', () => {
    const incoming = {
      ref: { type: 'SINGLE_LINE_TEXT', lookup: { relatedApp: { app: '10' }, relatedKeyField: 'k' } }
    };
    const plan = planFieldApply(incoming, {}, { '10': '20' }, false);
    expect(plan.adds.ref.lookup.relatedApp.app).toBe('20');
    expect(plan.lookupConverted).toEqual(['ref']);
  });

  it('(e) lookup 変換時にも code が削除される (上書きモード)', () => {
    const incoming = {
      lk: { type: 'SINGLE_LINE_TEXT', code: 'lk', lookup: { relatedApp: { app: '10', code: 'OLD' }, relatedKeyField: 'k', fieldMappings: [] } }
    };
    const current = { lk: { type: 'SINGLE_LINE_TEXT', code: 'lk' } };
    const plan = planFieldApply(incoming, current, { '10': '20' }, true);
    expect(plan.updates.lk.lookup.relatedApp).toEqual({ app: '20' });
  });
});

describe('planBulkRename', () => {
  const props = {
    title: { type: 'SINGLE_LINE_TEXT', code: 'title' },
    dev_done: { type: 'CHECK_BOX', code: 'dev_done' },
    レコード番号: { type: 'RECORD_NUMBER', code: 'レコード番号' },
    table: { type: 'SUBTABLE', code: 'table', fields: { qty: { type: 'NUMBER', code: 'qty' } } }
  };

  it('adds a prefix to top-level and subtable child codes', () => {
    const out = planBulkRename(props, 'dev_', false);
    // キーは変更前のコード。反映時に新規追加ではなく既存フィールドのコード変更（PUT）になる。
    expect(Object.keys(out.properties)).toEqual(['title', 'table']);
    expect(out.properties.title.code).toBe('dev_title');
    expect(out.properties.table.code).toBe('dev_table');
    expect(out.properties.table.fields).toEqual({ qty: { type: 'NUMBER', code: 'dev_qty' } });
    expect(out.renamePairs).toEqual([
      { from: 'title', to: 'dev_title' },
      { from: 'table', to: 'dev_table' },
      { from: 'table.qty', to: 'dev_table.dev_qty' }
    ]);
    expect(out.collisions).toEqual([]);
  });

  it('removes a prefix and reports codes that would become empty', () => {
    const out = planBulkRename({ ...props, dev_: { type: 'NUMBER', code: 'dev_' } }, 'dev_', true);
    expect(Object.keys(out.properties)).toEqual(['dev_done']);
    expect(out.properties.dev_done.code).toBe('done');
    expect(out.collisions).toEqual(['dev_ → (空)']);
  });

  it('reports a collision with an unchanged existing field', () => {
    const out = planBulkRename({
      title: { type: 'SINGLE_LINE_TEXT', code: 'title' },
      dev_title: { type: 'SINGLE_LINE_TEXT', code: 'dev_title' }
    }, 'dev_', true);
    expect(out.collisions).toContain('dev_title → title');
  });

  it('reports collisions between subtable children and with fields that are not renamed', () => {
    const out = planBulkRename({
      qty: { type: 'NUMBER', code: 'qty' },
      table: { type: 'SUBTABLE', code: 'table', fields: { dev_qty: { type: 'NUMBER', code: 'dev_qty' } } },
      dev_memo: { type: 'SINGLE_LINE_TEXT', code: 'dev_memo' },
      memo: { type: 'RECORD_NUMBER', code: 'memo' }
    }, 'dev_', true);
    expect(out.collisions).toEqual(['table.dev_qty → table.qty', 'dev_memo → memo']);
  });

  it('does not report a chain of renames as a collision', () => {
    const out = planBulkRename({
      aab: { type: 'NUMBER', code: 'aab' },
      ab: { type: 'NUMBER', code: 'ab' }
    }, 'a', true);
    expect(out.collisions).toEqual([]);
    expect(out.renamePairs).toEqual([{ from: 'aab', to: 'ab' }, { from: 'ab', to: 'b' }]);
  });

  it('turns into a rename (PUT) rather than an add when applied with overwrite', () => {
    const out = planBulkRename(props, 'dev_', false);
    const plan = planFieldApply(out.properties, props, {}, true);
    expect(Object.keys(plan.adds)).toEqual([]);
    expect(plan.updates.title.code).toBe('dev_title');
  });
});

describe('buildFieldApplyConfirmText', () => {
  it('shows renamed codes and truncates a long list in the confirmation', () => {
    const incoming: Record<string, any> = { old_name: { type: 'NUMBER', code: 'new_name' } };
    const current: Record<string, any> = { old_name: { type: 'NUMBER', code: 'old_name' } };
    for (let i = 0; i < 12; i++) incoming[`f${i}`] = { type: 'NUMBER' };
    const text = buildFieldApplyConfirmText('1', '', planFieldApply(incoming, current, {}, true));
    expect(text).toContain('更新: old_name → new_name');
    expect(text).toContain('追加: f0、f1、f2、f3、f4、f5、f6、f7、f8、f9 ほか2件');
  });
});
