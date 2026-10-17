import { describe, expect, it } from 'vitest';
import { SECTION_DEFS } from '../../src/constants';
import { buildDesignAiMarkdown } from '../../src/design/ai-markdown';
import { buildDesignSnapshot } from '../../src/design/snapshot';

function makeBundle(sections: Record<string, any>, extra: Record<string, any> = {}) {
  return {
    appId: '9100',
    guestId: '',
    preview: false,
    fetchedAt: '2026-09-26T00:00:00.000Z',
    meta: { sectionRevisions: { appSettings: '42' }, marker: false, count: 0 },
    ...extra,
    sections
  };
}

function section(snapshot: ReturnType<typeof buildDesignSnapshot>, key: string) {
  return snapshot.sections.find((row) => row.key === key);
}

function fencedJsonBlocks(markdown: string): string[] {
  const lines = markdown.split('\n');
  const bodies: string[] = [];
  for (let index = 0; index < lines.length; index += 1) {
    const opening = lines[index].match(/^(`{3,})json$/);
    if (!opening) continue;
    const closing = opening[1];
    const body: string[] = [];
    index += 1;
    while (index < lines.length && lines[index] !== closing) {
      body.push(lines[index]);
      index += 1;
    }
    bodies.push(body.join('\n'));
  }
  return bodies;
}

describe('design snapshot shared contract', () => {
  it('indexes every canonical section and distinguishes missing, empty, failed, partial, and null', () => {
    const snapshot = buildDesignSnapshot(makeBundle({
      appSettings: { name: '受発注' },
      fieldSettings: { properties: {} },
      viewSettings: { _fetchError: '権限不足' },
      reportSettings: { _partial: { message: '応答を途中で省略' } },
      layoutSettings: null,
      unknownExtra: { value: 1 }
    }));

    expect(snapshot.sections.map((row) => row.key).slice(0, SECTION_DEFS.length)).toEqual(SECTION_DEFS.map((def) => def.key));
    expect(section(snapshot, 'appSettings')).toMatchObject({ status: 'available' });
    expect(section(snapshot, 'fieldSettings')).toMatchObject({ status: 'empty', count: 0 });
    expect(section(snapshot, 'viewSettings')).toMatchObject({ status: 'fetch-error', count: null });
    expect(section(snapshot, 'reportSettings')).toMatchObject({ status: 'partial', count: null });
    expect(section(snapshot, 'layoutSettings')).toMatchObject({ status: 'partial', count: null });
    expect(section(snapshot, 'formSettings')).toMatchObject({ status: 'missing', count: null });
    expect(section(snapshot, 'unknownExtra')).toMatchObject({ status: 'available' });
    expect(snapshot.complete).toBe(false);
  });

  it('does not turn false partial markers into partial, and missing known collections stay incomplete', () => {
    const snapshot = buildDesignSnapshot(makeBundle({
      fieldSettings: { revision: '1', _partial: false },
      viewSettings: { views: {}, _fetchError: false },
      appSettings: {}
    }));
    expect(section(snapshot, 'fieldSettings')).toMatchObject({ status: 'partial', count: null });
    expect(section(snapshot, 'viewSettings')).toMatchObject({ status: 'empty', count: 0 });
    expect(section(snapshot, 'appSettings')).toMatchObject({ status: 'empty' });
  });

  it('counts large top-level/group/subtable/system definitions and escapes JSON Pointer tokens', () => {
    const properties: Record<string, any> = {};
    for (let index = 0; index < 271; index += 1) {
      properties[`domain_field_${index}`] = {
        code: `domain_field_${index}`,
        label: `業務項目${index}`,
        type: index === 0 ? 'RECORD_NUMBER' : 'SINGLE_LINE_TEXT'
      };
    }
    properties['group_code'] = { code: 'group_code', label: '受注基本情報', type: 'GROUP' };
    properties['table/x~y'] = {
      code: 'table/x~y', label: '受注明細', type: 'SUBTABLE', fields: {
        'child/x~y': { code: 'child/x~y', label: '数量', type: 'NUMBER' },
        child_status: { code: 'child_status', label: '明細状態', type: 'STATUS' }
      }
    };
    Object.defineProperty(properties, '__proto__', {
      value: { code: '__proto__', label: '特殊コード', type: 'SINGLE_LINE_TEXT' },
      enumerable: true,
      configurable: true,
      writable: true
    });
    const snapshot = buildDesignSnapshot(makeBundle({
      fieldSettings: { properties },
      layoutSettings: { layout: [{ type: 'GROUP', code: 'group_code', layout: [{ type: 'ROW', fields: [{ type: 'FIELD', code: 'domain_field_0' }] }] }] }
    }));

    expect(snapshot.fields.length).toBeGreaterThan(270);
    expect(snapshot.counts.topLevel).toBe(Object.keys(properties).length);
    expect(snapshot.counts.subtableChildren).toBe(2);
    expect(snapshot.counts.total).toBe(Object.keys(properties).length + 2);
    expect(snapshot.counts.groups).toBe(1);
    expect(snapshot.counts.tables).toBe(1);
    expect(snapshot.counts.system).toBe(2);
    expect(snapshot.fields.find((field) => field.code === 'table/x~y')?.path).toBe('/sections/fieldSettings/properties/table~1x~0y');
    expect(snapshot.fields.find((field) => field.code === 'child/x~y')?.path).toBe('/sections/fieldSettings/properties/table~1x~0y/fields/child~1x~0y');
    expect(snapshot.fields.find((field) => field.code === 'domain_field_0')?.group).toBe('受注基本情報');
    expect(snapshot.fields.find((field) => field.code === '__proto__')?.definition?.label).toBe('特殊コード');
  });

  it('preserves null, false, zero, empty text, and raw definitions without mutation', () => {
    const definition = {
      code: 'exact',
      label: '値',
      type: 'SINGLE_LINE_TEXT',
      nullable: null,
      disabled: false,
      defaultValue: 0,
      emptyValue: ''
    };
    const bundle = makeBundle({ fieldSettings: { properties: { exact: definition } } });
    const snapshot = buildDesignSnapshot(bundle);
    expect(snapshot.fields[0].definition).toBe(definition);
    expect(snapshot.fields[0].definition).toMatchObject({ nullable: null, disabled: false, defaultValue: 0, emptyValue: '' });
    expect(bundle.sections.fieldSettings.properties.exact).toBe(definition);
  });
});

describe('AI design Markdown', () => {
  it('emits metadata, all section statuses, explicit references, unknown sections, and deterministic output', () => {
    const weirdKey = '追加\nセクション```';
    const bundle = makeBundle({
      appSettings: { name: 'AI設計書' },
      fieldSettings: {
        properties: {
          customer: {
            code: 'customer', label: '顧客', type: 'SINGLE_LINE_TEXT',
            lookup: {
              relatedApp: { app: '9201' }, relatedKeyField: 'customer_code',
              fieldMappings: [{ field: 'customer_name', relatedField: 'name' }]
            }
          },
          history: {
            code: 'history', label: '履歴', type: 'REFERENCE_TABLE',
            referenceTable: {
              relatedApp: { app: '9202' },
              condition: { field: 'customer', relatedField: 'customer_code' },
              displayFields: ['order_number'], size: '10'
            }
          }
        }
      },
      actionSettings: {
        actions: {
          '注文作成': { name: '注文作成', destApp: { app: '9203', code: 'order_number' }, mappings: [{ srcField: 'customer', destField: 'customer' }] }
        }
      },
      [weirdKey]: { _fetchError: '失敗\n```\n<script>alert(1)</script>' }
    }, { fixtureMeta: { synthetic: true, count: 0 }, marker: false });
    const first = buildDesignAiMarkdown(bundle);
    const second = buildDesignAiMarkdown(bundle);
    expect(first).toBe(second);
    expect(first).toContain('schema_version');
    expect(first).toContain('9201');
    expect(first).toContain('lookup');
    expect(first).toContain('referenceTable');
    expect(first).toContain('appAction');
    expect(first).toContain('status:');
    expect(first).toContain('missing from bundle.sections');
    expect(first).not.toContain('<details>');
    expect(first).toContain('\\n');
    expect(fencedJsonBlocks(first).length).toBe(1 + Object.keys(bundle.sections).length);
  });

  it('keeps standard process API from/to values in the reference index', () => {
    const markdown = buildDesignAiMarkdown(makeBundle({
      processSettings: {
        enable: true,
        states: {
          下書き: { name: '下書き', index: 0, assignee: { type: 'ONE', entities: [] } },
          営業確認: { name: '営業確認', index: 1, assignee: { type: 'ONE', entities: [] } }
        },
        actions: [{
          name: '営業確認へ提出', index: 0, from: '下書き', to: '営業確認', filterCond: 'order_number != ""'
        }]
      }
    }));
    const referenceRow = markdown.split('\n').find((line) => line.includes('processTransition'));
    expect(referenceRow).toBeTruthy();
    expect(referenceRow).toContain('`営業確認`');
    expect(referenceRow).toContain('"from": "下書き"');
  });

  it('keeps ordinary JSON ordinary, and uses a collision-safe typed tree only for undefined values', () => {
    const plainBundle = makeBundle({
      fieldSettings: { properties: { exact: { code: 'exact', label: '値', type: 'NUMBER', value: null, no: false, zero: 0, empty: '' } } }
    });
    const plainMarkdown = buildDesignAiMarkdown(plainBundle);
    const plainBlocks = fencedJsonBlocks(plainMarkdown);
    const plainFieldJson = plainBlocks.find((body) => body.includes('"properties"'));
    expect(plainFieldJson).toBeTruthy();
    const plainParsed = JSON.parse(plainFieldJson!);
    expect(plainParsed.properties.exact).toMatchObject({ value: null, no: false, zero: 0, empty: '' });
    expect(plainMarkdown).not.toContain('"$kusType": "typed-tree"');

    const value = 'literal ``` and ~~~ plus <tag> and | pipe';
    const withUndefined = makeBundle({
      fieldSettings: { properties: { exact: { code: 'exact', label: value, type: 'SINGLE_LINE_TEXT', value, missing: undefined } } }
    });
    const markdown = buildDesignAiMarkdown(withUndefined);
    expect(markdown).toContain('"$kusType": "typed-tree"');
    expect(markdown).toContain(value);
    const block = fencedJsonBlocks(markdown).find((body) => body.includes('typed-tree'));
    expect(block).toBeTruthy();
    expect(JSON.parse(block!).$kusType).toBe('typed-tree');
  });

  it('marks the encoding outside the fence so a literal typed-tree-looking JSON object cannot collide', () => {
    const literal = { $kusType: 'typed-tree', value: { kind: 'undefined' } };
    const markdown = buildDesignAiMarkdown(makeBundle({
      fieldSettings: { properties: { literal: { code: 'literal', label: 'literal', type: 'SINGLE_LINE_TEXT', literal } } }
    }));
    const fieldSection = markdown.slice(markdown.indexOf('### `fieldSettings`'));
    expect(fieldSection).toContain('- encoding: json');
    expect(fieldSection).not.toContain('- encoding: kus-typed-tree-v1');
    const block = fencedJsonBlocks(fieldSection).find((body) => body.includes('"$kusType"'));
    expect(JSON.parse(block!).properties.literal.literal).toEqual(literal);
  });
});

