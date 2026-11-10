import { describe, expect, it } from 'vitest';
import { createContext, runInContext } from 'node:vm';
import {
  buildErAppModel,
  buildErAppModelFromBundle,
  buildErMarkdownSpec,
  buildErRelationsCsv,
  describeErRelationCopy,
  describeErRelationDisplay,
  describeErRelationFilter,
  analyzeErDependencies
} from '../src/tabs/er-model.js';
import { buildHTML } from '../src/tabs/er.js';

const fieldsResponse = {
  properties: {
    customer_code: { code: 'customer_code', label: '顧客コード', type: 'SINGLE_LINE_TEXT', required: true },
    customer_lookup: {
      code: 'customer_lookup',
      label: '顧客',
      type: 'SINGLE_LINE_TEXT',
      lookup: {
        relatedApp: { app: '202' },
        relatedKeyField: 'company_code',
        fieldMappings: [
          { field: 'customer_name', relatedField: 'company_name' },
          { field: 'customer_industry', relatedField: 'industry' },
          { field: '', relatedField: 'ignored_when_destination_is_empty' }
        ],
        lookupPickerFields: ['company_name'],
        filterCond: 'status = "有効" and area in ("東京", "大阪")',
        sort: 'company_code asc'
      }
    },
    customer_name: { code: 'customer_name', label: '顧客名', type: 'SINGLE_LINE_TEXT' },
    line_items: {
      code: 'line_items',
      label: '明細',
      type: 'SUBTABLE',
      fields: {
        item_lookup: {
          code: 'item_lookup',
          label: '商品',
          type: 'SINGLE_LINE_TEXT',
          lookup: { relatedApp: { app: '303' }, relatedKeyField: 'item_code', fieldMappings: [{ field: 'item_name', relatedField: 'name' }] }
        },
        item_name: { code: 'item_name', label: '商品名', type: 'SINGLE_LINE_TEXT' }
      }
    },
    related_orders: {
      code: 'related_orders',
      label: '関連受注',
      type: 'REFERENCE_TABLE',
      referenceTable: {
        relatedApp: { app: '404' },
        condition: { field: 'customer_code', relatedField: 'order_customer' },
        filterCond: 'ステータス not in ("キャンセル")',
        displayFields: ['order_no', 'order_date', 'amount'],
        sort: 'order_date desc',
        size: '10'
      }
    }
  }
};

const actionsResponse = {
  actions: {
    toQuote: {
      name: '見積を作成',
      destApp: { app: '505' },
      mappings: [
        { srcType: 'FIELD', srcField: 'customer_code', destType: 'FIELD', destField: 'quote_customer' },
        { srcType: 'RECORD_URL', destType: 'FIELD', destField: 'source_url' },
        { srcType: 'FIELD', srcField: 'only_source' }
      ],
      filterCond: 'ステータス = "受注"'
    },
    plain: { name: '何も写さない', destApp: { app: '606' }, mappings: [], filterCond: '' }
  }
};

const model = buildErAppModel({
  appId: 101,
  fieldsResponse,
  appInfoResponse: { name: '案件' },
  actionsResponse
});
const byKind = (kind: string, field?: string) => model.relations.find((r) => r.kind === kind && (!field || r.from === field || r.controlField === field))!;

describe('ER relation details in the model', () => {
  it('keeps what a lookup copies and how it narrows the candidates', () => {
    const lookup = byKind('LOOKUP', 'customer_lookup');
    expect(lookup.toField).toBe('company_code');
    expect(lookup.copyFields).toEqual([
      { from: 'company_name', to: 'customer_name' },
      { from: 'industry', to: 'customer_industry' }
    ]);
    expect(lookup.filterCond).toBe('status = "有効" and area in ("東京", "大阪")');
    expect(describeErRelationCopy(lookup)).toBe('参照先 company_name → customer_name / 参照先 industry → customer_industry');
    expect(describeErRelationFilter(lookup)).toBe('status = "有効" and area in ("東京", "大阪")');
  });

  it('keeps the copy mapping of a lookup inside a table', () => {
    const inTable = byKind('LOOKUP', 'item_lookup');
    expect(inTable.fromTableCode).toBe('line_items');
    expect(inTable.copyFields).toEqual([{ from: 'name', to: 'item_name' }]);
  });

  it('keeps the displayed fields and the narrowing condition of a related-record list', () => {
    const ref = byKind('REF');
    expect(ref.displayFields).toEqual(['order_no', 'order_date', 'amount']);
    expect(ref.filterCond).toBe('ステータス not in ("キャンセル")');
    expect(describeErRelationDisplay(ref)).toBe('order_no / order_date / amount');
    expect(ref.copyFields).toBeUndefined();
  });

  it('keeps what an app action copies into the destination app, including non-field sources', () => {
    const action = byKind('ACTION');
    expect(action.copyFields).toEqual([
      { from: 'customer_code', to: 'quote_customer' },
      { from: 'RECORD_URL', to: 'source_url' }
    ]);
    expect(action.filterCond).toBe('ステータス = "受注"');
    expect(describeErRelationCopy(action)).toBe('customer_code → 起動先 quote_customer / RECORD_URL → 起動先 source_url');
  });

  it('adds nothing when the settings have no mapping or condition', () => {
    const plain = model.relations.find((r) => r.kind === 'ACTION' && r.toApp === 606)!;
    expect(plain).not.toHaveProperty('copyFields');
    expect(plain).not.toHaveProperty('filterCond');
    expect(describeErRelationCopy(plain)).toBe('');
    expect(describeErRelationFilter({})).toBe('');
    expect(describeErRelationDisplay(undefined)).toBe('');
  });

  it('reads the same details from a settings JSON bundle', () => {
    const fromBundle = buildErAppModelFromBundle({
      appId: 101,
      appName: '案件',
      sections: { fieldSettings: fieldsResponse, actionSettings: actionsResponse }
    });
    expect(fromBundle.relations).toEqual(model.relations);
  });
});

describe('ER relation details in the saved Markdown and CSV', () => {
  const apps = [model];

  it('adds the copied / displayed fields and the narrowing condition to the relation CSV', () => {
    const rows = buildErRelationsCsv(apps).replace('﻿', '').split('\n');
    expect(rows[0]).toBe('参照元アプリID,参照元アプリ名,フィールドコード,フィールド名,リレーション種別,参照先アプリID,参照先アプリ名,キー・条件詳細,コピー・表示するフィールド,絞り込み条件');
    const lookupRow = rows.find((row) => row.includes('customer_lookup'))!;
    expect(lookupRow).toContain('参照先 company_name → customer_name / 参照先 industry → customer_industry');
    expect(lookupRow).toContain('"status = ""有効"" and area in (""東京"", ""大阪"")"');
    const refRow = rows.find((row) => row.includes('related_orders'))!;
    expect(refRow).toContain('order_no / order_date / amount');
    expect(refRow).toContain('ステータス not in');
    const actionRow = rows.find((row) => row.includes(',ACTION,'))!;
    expect(actionRow).toContain('customer_code → 起動先 quote_customer');
  });

  it('adds the same columns to both relation tables of the Markdown spec', () => {
    const markdown = buildErMarkdownSpec(apps, analyzeErDependencies(apps));
    expect(markdown).toContain('| キー・条件詳細 | コピー・表示するフィールド | 絞り込み条件 |');
    expect(markdown).toContain('| 宛先フィールド | コピー・表示するフィールド | 絞り込み条件 |');
    expect(markdown).toContain('参照先 company_name → customer_name / 参照先 industry → customer_industry');
    expect(markdown).toContain('order_no / order_date / amount');
    // 表の区切りの縦線が条件の中に入っても列が崩れない
    const withPipe = buildErAppModel({
      appId: 9,
      fieldsResponse: { properties: { k: { code: 'k', label: 'K', type: 'SINGLE_LINE_TEXT', lookup: { relatedApp: { app: '2' }, relatedKeyField: 'x', filterCond: 'a = "x|y"', fieldMappings: [] } } } },
      appInfoResponse: { name: 'A' },
      actionsResponse: { actions: {} }
    });
    expect(buildErMarkdownSpec([withPipe], analyzeErDependencies([withPipe]))).toContain('a = "x\\|y"');
  });
});

describe('ER relation details in the viewer', () => {
  const html = buildHTML([model], { startAppId: '101', startAppIds: ['101'], layoutName: 'dagre', fieldDensity: 'standard', source: {} });
  const script = html.match(/<script id="er-main" type="text\/plain">([\s\S]*?)<\/script>/)![1];

  /** 図の画面の関数を取り出して、モデル側の説明と同じ文になることを確かめる。 */
  function loadViewerHelpers() {
    const source = ['relCopyText', 'relDisplayText', 'relFilterText', 'relFieldsText']
      .map((name) => script.match(new RegExp(`function ${name}\\(r\\)\\{[\\s\\S]*?\\r?\\n\\}`))?.[0])
      .join('\n');
    expect(source).not.toContain('undefined');
    const context = createContext({});
    runInContext(`${source}\nglobalThis.api={relCopyText,relDisplayText,relFilterText,relFieldsText};`, context);
    return (context as any).api;
  }

  it('describes every relation the same way as the saved Markdown and CSV do', () => {
    const api = loadViewerHelpers();
    for (const rel of model.relations) {
      expect(api.relCopyText(rel), `${rel.kind} ${rel.from}`).toBe(describeErRelationCopy(rel));
      expect(api.relDisplayText(rel)).toBe(describeErRelationDisplay(rel));
      expect(api.relFilterText(rel)).toBe(describeErRelationFilter(rel));
      expect(api.relFieldsText(rel)).toBe(rel.kind === 'REF' ? describeErRelationDisplay(rel) : describeErRelationCopy(rel));
    }
  });

  it('embeds the structured details and shows them in the app detail, the tooltip and every export', () => {
    expect(html).toContain('"copyFields":[{"from":"company_name","to":"customer_name"}');
    expect(html).toContain('"displayFields":["order_no","order_date","amount"]');
    // 詳細パネルの行は、省略せず折り返して全文を示す専用の行（field-detail）に出す
    expect(script).toContain('function relationDetailHtml(rel){');
    expect(script).toContain('[["コピー",relCopyText(rel)],["表示",relDisplayText(rel)],["絞り込み",relFilterText(rel)]]');
    expect(script.match(/relationDetailHtml\(rel\)/g)).toHaveLength(3);
    expect(html).toMatch(/\.field-detail\{[^}]*white-space:normal;overflow-wrap:anywhere/);
    expect(script).toContain('+edgeDetailTipHtml(edge);');
    expect(script).toContain('copyFields:r.copyFields||[],displayFields:r.displayFields||[],filterCond:r.filterCond||""');
    expect(script).toContain('"コピー・表示するフィールド","絞り込み条件"]];');
    expect(script).toContain('relFieldsText(r),relFilterText(r)]);');
    expect(script).toContain('| コピー・表示するフィールド | 絞り込み条件 |');
    expect(script).toContain('mdEsc(relFieldsText(r))');
  });
});
