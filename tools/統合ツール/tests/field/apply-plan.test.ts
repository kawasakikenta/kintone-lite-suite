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
    expect(plan.logs).toEqual(['ADD title', 'SKIP rec (system)', 'ADD ref (lookup変換)', 'SKIP existing (exists)']);
  });

  it('updates existing fields when overwrite is on', () => {
    const plan = planFieldApply(incoming, current, {}, true);
    expect(Object.keys(plan.updates)).toEqual(['existing']);
    expect(plan.skippedExisting).toEqual([]);
    const text = buildFieldApplyConfirmText('99', '3', plan);
    expect(text).toContain('App 99（ゲスト 3）');
    expect(text).toContain('追加 2件 / 更新 1件 / スキップ 1件');
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
    expect(Object.keys(out.properties)).toEqual(['dev_title', 'dev_table']);
    expect(out.properties.dev_table.fields).toEqual({ dev_qty: { type: 'NUMBER', code: 'dev_qty' } });
    expect(out.renamePairs).toEqual([
      { from: 'title', to: 'dev_title' },
      { from: 'table', to: 'dev_table' },
      { from: 'table.qty', to: 'dev_table.dev_qty' }
    ]);
    expect(out.collisions).toEqual([]);
  });

  it('removes a prefix and reports codes that would become empty', () => {
    const out = planBulkRename({ ...props, dev_: { type: 'NUMBER', code: 'dev_' } }, 'dev_', true);
    expect(Object.keys(out.properties)).toEqual(['done']);
    expect(out.collisions).toEqual(['dev_ → (空)']);
  });

  it('reports a collision with an unchanged existing field', () => {
    const out = planBulkRename({
      title: { type: 'SINGLE_LINE_TEXT', code: 'title' },
      dev_title: { type: 'SINGLE_LINE_TEXT', code: 'dev_title' }
    }, 'dev_', true);
    expect(out.collisions).toContain('dev_title → title');
  });
});
