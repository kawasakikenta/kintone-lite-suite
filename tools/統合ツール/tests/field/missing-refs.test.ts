import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiGet, apiPost, apiPut } from '../../src/api';
import { kusConfirm } from '../../src/utils';
import {
  buildFieldApplyConfirmText,
  buildFieldMultiConfirmText,
  findMissingFieldReferences,
  planBulkRename,
  planFieldApply,
  runFieldApplyMultiStandalone,
  runFieldApplyStandalone
} from '../../src/tabs/field-standalone';
import { collectFormulaRefs, rewriteFormulaRefs } from '../../src/tabs/field';

vi.mock('../../src/api', async original => ({ ...await original<typeof import('../../src/api')>(), apiGet: vi.fn(), apiPost: vi.fn(), apiPut: vi.fn() }));
vi.mock('../../src/utils', async original => ({ ...await original<typeof import('../../src/utils')>(), kusConfirm: vi.fn() }));

// 比較元から選んだフィールドが、反映後のフォームに無いフィールドを参照するとき（計算式・ルックアップのコピー先・関連レコード一覧の条件）、
// kintone は定義ごと拒否する。書き込む前の最終確認に、足りないコードを示す。

const text = (code: string, extra: any = {}) => ({ type: 'SINGLE_LINE_TEXT', code, label: code, ...extra });
const calc = (code: string, expression: string) => ({ type: 'CALC', code, label: code, expression });
const lookup = (code: string, fields: string[]) => ({ ...text(code), lookup: { relatedApp: { app: '9' }, relatedKeyField: 'k', fieldMappings: fields.map(field => ({ field, relatedField: 'x' })) } });
const plan = (incoming: Record<string, any>, current: Record<string, any>, overwrite = false) => planFieldApply(incoming, current, {}, overwrite);

describe('formula references', () => {
  it('collects field codes (including Japanese codes) and skips functions, strings and numbers', () => {
    expect(collectFormulaRefs('IF(数量 > 0, 数量 * 単価, 0) + SUM(qty) + "円 amount"')).toEqual(['数量', '単価', 'qty']);
    expect(collectFormulaRefs('ROUND( a / b , 2 ) & TRUE')).toEqual(['a', 'b']);
  });

  it('rewrites only whole field codes and leaves strings and functions alone', () => {
    const map = new Map([['amount', 'dev_amount'], ['qty', 'dev_qty']]);
    expect(rewriteFormulaRefs('SUM(qty) * amount + amount2 + "amount"', map)).toBe('SUM(dev_qty) * dev_amount + amount2 + "amount"');
    expect(rewriteFormulaRefs('', map)).toBe('');
  });
});

describe('findMissingFieldReferences', () => {
  const current = { amount: { type: 'NUMBER', code: 'amount' } };

  it('reports a calculation that refers to fields absent from the target and from the JSON', () => {
    const p = plan({ total: calc('total', 'amount * (1 + tax_rate / 100) + shipping') }, current);
    expect(findMissingFieldReferences(p, current)).toEqual([{ field: 'total', kind: 'calc', missing: ['tax_rate', 'shipping'] }]);
  });

  it('does not report references that the target already has or that the same JSON adds', () => {
    const p = plan({ total: calc('total', 'amount + tax_rate'), tax_rate: { type: 'NUMBER', code: 'tax_rate' } }, current);
    expect(findMissingFieldReferences(p, current)).toEqual([]);
  });

  it('reports lookup copy-to fields that do not exist after the apply, and counts table children as existing fields', () => {
    const incoming = {
      customer_code: lookup('customer_code', ['cust_name', 'cust_tel']),
      items: { type: 'SUBTABLE', code: 'items', fields: { qty: { type: 'NUMBER', code: 'qty' }, subtotal: calc('subtotal', 'qty * price'), item_code: lookup('item_code', ['qty']) } }
    };
    const p = plan(incoming, current);
    expect(findMissingFieldReferences(p, current)).toEqual([
      { field: 'customer_code', kind: 'lookup', missing: ['cust_name', 'cust_tel'] },
      { field: 'items.subtotal', kind: 'calc', missing: ['price'] }
    ]);
  });

  it('reports a related-records condition field that is missing', () => {
    const incoming = { rel: { type: 'REFERENCE_TABLE', code: 'rel', referenceTable: { relatedApp: { app: '9' }, condition: { field: 'customer_code', relatedField: 'code' } } } };
    expect(findMissingFieldReferences(plan(incoming, current), current)).toEqual([{ field: 'rel', kind: 'reference', missing: ['customer_code'] }]);
  });

  it('reports an existing calculation that refers to a field whose code the apply renames', () => {
    const cur = { amount: { type: 'NUMBER', code: 'amount' }, total: calc('total', 'amount * 2') };
    const p = plan({ amount: { type: 'NUMBER', code: 'dev_amount' } }, cur, true);
    expect(findMissingFieldReferences(p, cur)).toEqual([{ field: 'total', kind: 'renamed', missing: ['amount'] }]);
    // 計算式も同じ反映で直すなら問題なし
    const fixed = plan({ amount: { type: 'NUMBER', code: 'dev_amount' }, total: calc('total', 'dev_amount * 2') }, cur, true);
    expect(findMissingFieldReferences(fixed, cur)).toEqual([]);
  });

  it('shows the missing codes in the confirmation text', () => {
    const p = plan({ total: calc('total', 'amount + tax_rate'), customer_code: lookup('customer_code', ['cust_name']) }, current);
    const confirm = buildFieldApplyConfirmText('202', '', p, findMissingFieldReferences(p, current));
    expect(confirm).toContain('反映後のフォームに無いフィールドを参照しています');
    expect(confirm).toContain('・total（計算式）: tax_rate');
    expect(confirm).toContain('・customer_code（ルックアップのコピー先）: cust_name');
    expect(buildFieldApplyConfirmText('202', '', plan({ memo: text('memo') }, current), [])).not.toContain('参照しています');
  });
});

describe('planBulkRename keeps references consistent with the new codes', () => {
  const props = {
    amount: { type: 'NUMBER', code: 'amount' },
    tax: { type: 'NUMBER', code: 'tax' },
    total: calc('total', 'amount * (1 + tax / 100)'),
    cust_name: text('cust_name'),
    customer_code: lookup('customer_code', ['cust_name']),
    rel: { type: 'REFERENCE_TABLE', code: 'rel', referenceTable: { relatedApp: { app: '9' }, condition: { field: 'customer_code', relatedField: 'code' } } },
    items: { type: 'SUBTABLE', code: 'items', fields: { qty: { type: 'NUMBER', code: 'qty' }, subtotal: calc('subtotal', 'qty * amount') } },
    grand: calc('grand', 'SUM(subtotal)')
  };

  it('rewrites formulas, lookup copy-to fields and related-records conditions (also inside tables)', () => {
    const out = planBulkRename(props, 'dev_', false);
    expect(out.properties.total.expression).toBe('dev_amount * (1 + dev_tax / 100)');
    expect(out.properties.customer_code.lookup.fieldMappings[0].field).toBe('dev_cust_name');
    expect(out.properties.rel.referenceTable.condition.field).toBe('dev_customer_code');
    expect(out.properties.items.fields.subtotal.expression).toBe('dev_qty * dev_amount');
    expect(out.properties.grand.expression).toBe('SUM(dev_subtotal)');
    // 元の入力は変更しない
    expect(props.total.expression).toBe('amount * (1 + tax / 100)');
    // 反映計画で見ても、参照先が足りない定義は残らない
    const p = planFieldApply(out.properties, props, {}, true);
    expect(findMissingFieldReferences(p, props)).toEqual([]);
  });

  it('also outputs an already prefixed field when its references change, and removes prefixes in the references too', () => {
    const cur = { amount: { type: 'NUMBER', code: 'amount' }, dev_total: calc('dev_total', 'amount * 2') };
    const out = planBulkRename(cur, 'dev_', false);
    expect(Object.keys(out.properties).sort()).toEqual(['amount', 'dev_total']);
    expect(out.properties.dev_total.expression).toBe('dev_amount * 2');
    const removed = planBulkRename({ dev_amount: { type: 'NUMBER', code: 'dev_amount' }, dev_total: calc('dev_total', 'dev_amount * 2') }, 'dev_', true);
    expect(removed.properties.dev_total.expression).toBe('amount * 2');
    expect(removed.properties.dev_amount.code).toBe('amount');
  });
});

describe('apply flow shows the warning but still lets the user decide', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(kusConfirm).mockReturnValue(true);
    vi.mocked(apiPost).mockImplementation(async (_p: string, _u: string, body: any) => ({ revision: String(Number(body.revision) + 1) }));
    vi.mocked(apiPut).mockImplementation(async (_p: string, _u: string, body: any) => ({ revision: String(Number(body.revision) + 1) }));
    vi.mocked(apiGet).mockImplementation(async (_p: string, _u: string, params: any) => ({ properties: { amount: { type: 'NUMBER', code: 'amount' } }, revision: `${params.app}0` }));
  });
  afterEach(() => vi.clearAllMocks());
  const fieldJson = JSON.stringify({ properties: { total: calc('total', 'amount + tax_rate') } });

  it('single target: the confirmation lists the missing field and the write is sent only after the user agrees', async () => {
    await runFieldApplyStandalone({ targetAppId: '5', fieldJson, lookupMapJson: '', overwrite: false }, vi.fn());
    expect(vi.mocked(kusConfirm).mock.calls[0][0]).toContain('・total（計算式）: tax_rate');
    expect(apiPost).toHaveBeenCalledTimes(1);
    vi.mocked(kusConfirm).mockReturnValue(false);
    vi.mocked(apiPost).mockClear();
    await runFieldApplyStandalone({ targetAppId: '5', fieldJson, lookupMapJson: '', overwrite: false }, vi.fn());
    expect(apiPost).not.toHaveBeenCalled();
  });

  it('many targets: the single confirmation shows the missing references per target', async () => {
    await runFieldApplyMultiStandalone({ targets: [{ appId: '5' }, { appId: '6' }], fieldJson, lookupMapJson: '' }, vi.fn());
    const confirm = vi.mocked(kusConfirm).mock.calls[0][0];
    expect(confirm).toContain('参照先のフィールドが反映後のフォームに無い反映先は、kintone に拒否される可能性があります');
    expect(confirm).toContain('App 5: 追加 1 / 更新 0 / スキップ 0');
    expect(confirm).toContain('⚠ 反映後のフォームに無いフィールドを参照: total → tax_rate');
    expect(buildFieldMultiConfirmText([{ appId: '5', guestId: '', appName: '', status: 'success', add: 1, update: 0, skip: 0, phase: 'precheck', message: '' }])).not.toContain('⚠');
  });
});
