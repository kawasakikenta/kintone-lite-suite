import { describe, expect, it } from 'vitest';
import {
  ErFieldsUnavailableError,
  buildErAppModel,
  buildFailedErAppModel,
  selectErFieldsForDensity,
  buildErAppModelFromBundle,
  buildErMermaidSource,
  buildErMarkdownSpec,
  buildErRelationsCsv,
  analyzeErDependencies
} from '../src/tabs/er-model.js';

const successfulMetadata = {
  name: '受注管理',
  spaceId: '9',
  threadId: '12',
  createdAt: '2026-08-01T00:00:00Z',
  modifiedAt: '2026-08-02T00:00:00Z'
};

const emptyActions = { actions: {} };

describe('buildErAppModel', () => {
  it('builds all fields, official lookup/reference joins and action relations', () => {
    const model = buildErAppModel({
      appId: '101',
      fieldsResponse: {
        properties: {
          record_no: { code: 'record_no', label: 'レコード番号', type: 'RECORD_NUMBER' },
          customer_code: { code: 'customer_code', label: '顧客コード', type: 'SINGLE_LINE_TEXT', required: true },
          customer_lookup: {
            code: 'customer_lookup',
            label: '顧客ルックアップ',
            type: 'SINGLE_LINE_TEXT',
            lookup: { relatedApp: { app: '202' }, relatedKeyField: 'external_customer_code' }
          },
          line_items: {
            code: 'line_items',
            label: '明細',
            type: 'SUBTABLE',
            fields: {
              quantity: { code: 'quantity', label: '数量', type: 'NUMBER', required: true }
            }
          },
          related_orders: {
            code: 'related_orders',
            label: '関連受注',
            type: 'REFERENCE_TABLE',
            referenceTable: {
              relatedApp: { app: '303' },
              condition: { field: 'customer_code', relatedField: 'customer_code_on_order' }
            }
          },
          separator: { type: 'HR' }
        }
      },
      appInfoResponse: successfulMetadata,
      actionsResponse: {
        actions: {
          '顧客へ登録': { name: '顧客へ登録', destApp: { app: '202' } }
        }
      },
      sourceGuestId: 7
    });

    expect(model).toMatchObject({
      id: 101,
      name: '受注管理',
      spaceId: '9',
      threadId: '12',
      status: 'complete',
      ok: true,
      totalFieldCount: 5,
      requiredCount: 2,
      lookupCount: 1,
      refCount: 1,
      actionCount: 1,
      relationCount: 3,
      sourceGuestId: '7'
    });
    expect(model.issues).toEqual([]);
    expect(model.allFields.map((field) => field.path)).toEqual([
      'record_no',
      'customer_code',
      'customer_lookup',
      'line_items',
      'line_items.quantity',
      'related_orders'
    ]);
    expect(model.fields).toEqual(model.allFields);

    expect(model.relations.find((relation) => relation.kind === 'LOOKUP')).toMatchObject({
      from: 'customer_lookup',
      fromPath: 'customer_lookup',
      toApp: 202,
      toField: 'external_customer_code'
    });
    expect(model.relations.find((relation) => relation.kind === 'REF')).toMatchObject({
      controlField: 'related_orders',
      controlFieldLabel: '関連受注',
      sourceJoinField: 'customer_code',
      from: 'customer_code',
      fromPath: 'customer_code',
      fromLabel: '顧客コード',
      toApp: 303,
      toField: 'customer_code_on_order'
    });
    expect(model.relations.find((relation) => relation.kind === 'ACTION')).toMatchObject({
      from: '__ACTION__0',
      fromLabel: '顧客へ登録',
      toApp: 202,
      kind: 'ACTION'
    });
  });

  it('keeps recoverable fetch and null-setting problems as partial issues', () => {
    const model = buildErAppModel({
      appId: 55,
      fieldsResponse: {
        properties: {
          plain: { code: 'plain', label: '通常項目', type: 'SINGLE_LINE_TEXT', lookup: null },
          broken_ref: {
            code: 'broken_ref',
            label: '参照設定不明',
            type: 'REFERENCE_TABLE',
            referenceTable: null
          }
        }
      },
      appInfoError: new Error('メタデータ権限なし'),
      actionsError: new Error('アクション権限なし')
    });

    expect(model.status).toBe('partial');
    expect(model.ok).toBe(true);
    expect(model.name).toBe('アプリ 55');
    expect(model.allFields).toHaveLength(2);
    expect(model.issues.map((issue) => issue.code)).toEqual([
      'metadata_fetch_failed',
      'lookup_null',
      'reference_table_null',
      'actions_fetch_failed'
    ]);
    expect(model.issues.find((issue) => issue.code === 'lookup_null')).toMatchObject({
      scope: 'lookup', fieldCode: 'plain', fieldPath: 'plain'
    });
    expect(model.issues.find((issue) => issue.code === 'reference_table_null')).toMatchObject({
      scope: 'referenceTable', fieldCode: 'broken_ref'
    });
  });

  it('throws a typed fields error and lets the caller create a failed model', () => {
    expect(() => buildErAppModel({
      appId: 44,
      fieldsResponse: null,
      appInfoResponse: successfulMetadata,
      actionsResponse: emptyActions
    })).toThrow(ErFieldsUnavailableError);

    const failed = buildFailedErAppModel(44, new Error('フィールド取得失敗'), {
      appInfoResponse: successfulMetadata,
      sourceGuestId: '3'
    });
    expect(failed).toMatchObject({
      id: 44,
      name: '受注管理',
      status: 'failed',
      ok: false,
      totalFieldCount: 0,
      relationCount: 0,
      sourceGuestId: '3'
    });
    expect(failed.issues).toEqual([
      { scope: 'fields', code: 'fields_fetch_failed', message: 'フィールド取得失敗' }
    ]);
  });

  it('uses the field type rather than a user-controlled code to identify the primary key', () => {
    const model = buildErAppModel({
      appId: 77,
      fieldsResponse: {
        properties: {
          renamed_no: { code: '伝票番号', label: '伝票番号', type: 'RECORD_NUMBER' },
          lookalike: { code: 'record_number', label: '利用者項目', type: 'SINGLE_LINE_TEXT' }
        }
      },
      appInfoResponse: { name: '主キー確認' },
      actionsResponse: emptyActions
    });

    expect(model.allFields.filter((field) => field.isPK).map((field) => field.code)).toEqual(['伝票番号']);
  });
});

describe('selectErFieldsForDensity', () => {
  const buildDensityModel = () => buildErAppModel({
    appId: 1,
    fieldsResponse: {
      properties: {
        record_no: { code: 'record_no', label: 'No.', type: 'RECORD_NUMBER' },
        unique_code: { code: 'unique_code', label: '一意', type: 'SINGLE_LINE_TEXT', unique: true },
        required_name: { code: 'required_name', label: '必須', type: 'SINGLE_LINE_TEXT', required: true },
        optional_note: { code: 'optional_note', label: '任意', type: 'MULTI_LINE_TEXT' },
        lookup_code: {
          code: 'lookup_code', label: 'ルックアップ', type: 'SINGLE_LINE_TEXT',
          lookup: { relatedApp: { app: 2 }, relatedKeyField: 'code' }
        },
        ref_join: { code: 'ref_join', label: '関連結合元', type: 'SINGLE_LINE_TEXT' },
        related_rows: {
          code: 'related_rows', label: '関連一覧', type: 'REFERENCE_TABLE',
          referenceTable: { relatedApp: { app: 3 }, condition: { field: 'ref_join', relatedField: 'foreign_code' } }
        },
        details: {
          code: 'details', label: '明細', type: 'SUBTABLE',
          fields: {
            detail_required: { code: 'detail_required', label: '明細必須', type: 'NUMBER', required: true },
            detail_optional: { code: 'detail_optional', label: '明細任意', type: 'NUMBER' }
          }
        }
      }
    },
    appInfoResponse: { name: '密度確認' },
    actionsResponse: emptyActions
  });

  it('selects none/compact/standard/full without mutating allFields', () => {
    const model = buildDensityModel();
    const originalPaths = model.allFields.map((field) => field.path);

    expect(selectErFieldsForDensity(model, 'none', true, 220)).toEqual([]);
    expect(selectErFieldsForDensity(model, 'compact', false, 220).map((field) => field.code)).toEqual([
      'record_no', 'unique_code', 'lookup_code', 'ref_join', 'related_rows'
    ]);
    expect(selectErFieldsForDensity(model, 'standard', false, 220).map((field) => field.code)).toEqual([
      'record_no', 'unique_code', 'required_name', 'lookup_code', 'ref_join', 'related_rows'
    ]);
    expect(selectErFieldsForDensity(model, 'full', false, 220).map((field) => field.code)).not.toContain('detail_required');
    expect(selectErFieldsForDensity(model, 'full', true, 220).map((field) => field.code)).toEqual([
      'record_no', 'unique_code', 'required_name', 'optional_note', 'lookup_code', 'ref_join',
      'related_rows', 'detail_required', 'detail_optional'
    ]);
    expect(selectErFieldsForDensity(model, 'full', true, 3)).toHaveLength(3);
    expect(model.allFields.map((field) => field.path)).toEqual(originalPaths);
  });

  it('falls back to the first six ordinary fields when no essential field exists', () => {
    const model = buildErAppModel({
      appId: 8,
      fieldsResponse: {
        properties: Object.fromEntries(Array.from({ length: 8 }, (_, i) => [
          `field_${i + 1}`,
          { code: `field_${i + 1}`, label: `項目${i + 1}`, type: 'SINGLE_LINE_TEXT' }
        ]))
      },
      appInfoResponse: { name: '単純アプリ' },
      actionsResponse: emptyActions
    });

    expect(selectErFieldsForDensity(model, 'compact', true, 220).map((field) => field.code)).toEqual([
      'field_1', 'field_2', 'field_3', 'field_4', 'field_5', 'field_6'
    ]);
  });
});

describe('buildErAppModelFromBundle', () => {
  it('constructs an AppData model directly from SettingsBundle without REST API calls', () => {
    const bundle = {
      appId: '501',
      appName: '案件管理（オフライン）',
      guestId: '15',
      sections: {
        appSettings: {
          name: '案件管理（オフライン）',
          spaceId: '20',
          threadId: '21'
        },
        formFields: {
          properties: {
            record_no: { code: 'record_no', label: 'レコード番号', type: 'RECORD_NUMBER' },
            client_code: {
              code: 'client_code',
              label: '取引先コード',
              type: 'SINGLE_LINE_TEXT',
              lookup: { relatedApp: { app: '601' }, relatedKeyField: 'master_client_code' }
            },
            activities: {
              code: 'activities',
              label: '活動履歴一覧',
              type: 'REFERENCE_TABLE',
              referenceTable: {
                relatedApp: { app: '701' },
                condition: { field: 'client_code', relatedField: 'activity_client_code' }
              }
            }
          }
        },
        actionSettings: {
          actions: {
            '見積アプリへ転記': { name: '見積アプリへ転記', destApp: { app: '801' } }
          }
        }
      }
    };

    const model = buildErAppModelFromBundle(bundle);
    expect(model).toMatchObject({
      id: 501,
      name: '案件管理（オフライン）',
      sourceGuestId: '15',
      spaceId: '20',
      threadId: '21',
      status: 'complete',
      ok: true,
      lookupCount: 1,
      refCount: 1,
      actionCount: 1,
      relationCount: 3
    });
    expect(model.relations.map((r: any) => [r.kind, r.toApp])).toEqual([
      ['LOOKUP', 601],
      ['REF', 701],
      ['ACTION', 801]
    ]);
  });
});

describe('buildErMermaidSource / buildErMarkdownSpec / buildErRelationsCsv', () => {
  const sampleApps = [
    buildErAppModelFromBundle({
      appId: '10',
      appName: '受注管理',
      sections: {
        formFields: {
          properties: {
            rec_no: { code: 'rec_no', label: 'No', type: 'RECORD_NUMBER' },
            cust_id: {
              code: 'cust_id',
              label: '顧客ID',
              type: 'SINGLE_LINE_TEXT',
              lookup: { relatedApp: { app: '20' }, relatedKeyField: 'customer_key' }
            },
            note: { code: 'note', label: '備考', type: 'MULTI_LINE_TEXT' }
          }
        },
        actionSettings: {
          actions: {
            '請求作成': { name: '請求作成', destApp: { app: '30' } }
          }
        }
      }
    }),
    buildErAppModelFromBundle({
      appId: '20',
      appName: '顧客マスタ',
      sections: {
        formFields: {
          properties: {
            customer_key: { code: 'customer_key', label: '顧客キー', type: 'SINGLE_LINE_TEXT', unique: true },
            order_ref: {
              code: 'order_ref',
              label: '受注履歴',
              type: 'REFERENCE_TABLE',
              referenceTable: {
                relatedApp: { app: '10' },
                condition: { field: 'customer_key', relatedField: 'cust_id' }
              }
            }
          }
        }
      }
    }),
    buildErAppModelFromBundle({
      appId: '99',
      appName: '孤立メモ',
      sections: {
        formFields: {
          properties: {
            memo: { code: 'memo', label: '=SUM(A1:A2)', type: 'SINGLE_LINE_TEXT' }
          }
        }
      }
    })
  ];

  it('builds erDiagram Mermaid source with relations and optional all-fields mode', () => {
    const defaultMermaid = buildErMermaidSource(sampleApps, { showAllFields: false });
    expect(defaultMermaid).toContain('erDiagram');
    expect(defaultMermaid).toContain('app_10 }o--o| app_20');
    expect(defaultMermaid).toContain('app_20 }o--o{ app_10');
    expect(defaultMermaid).toContain('%% ACTION app_10 -> app_30');


    expect(defaultMermaid).not.toContain('MULTI_LINE_TEXT note');
    expect(defaultMermaid).toContain('erDiagram');



    expect(defaultMermaid).not.toContain('MULTI_LINE_TEXT note');

    const fullMermaid = buildErMermaidSource(sampleApps, { showAllFields: true });
    expect(fullMermaid).toContain('MULTI_LINE_TEXT note');
  });

  it('keeps Mermaid attribute names ASCII and the real field code in the note', () => {
    const mermaid = buildErMermaidSource([{ id: 7, name: '売上 100%% "確定"', relations: [], fields: [
      { code: 'レコード番号', label: 'レコード番号', type: 'RECORD_NUMBER', isPK: true },
      { code: '文字列__1行_', label: '件名', type: 'SINGLE_LINE_TEXT' },
      { code: 'amount', label: 'amount', type: 'NUMBER' },
      { code: '金額', label: '金額', type: 'NUMBER' }
    ] }], {});
    expect(mermaid).toContain('RECORD_NUMBER field_1 PK "レコード番号"');
    expect(mermaid).toContain('SINGLE_LINE_TEXT field_2 "件名 [文字列__1行_]"');
    expect(mermaid).toContain('NUMBER amount "amount"');
    expect(mermaid).toContain('NUMBER field_4 "金額"');
    expect(mermaid).toContain('app_7["売上 100% \'確定\' (App 7)"]');
    expect(mermaid).not.toMatch(/^ {4}\S+ [^\x00-\x7F]/m);
  });

  it('escapes HTML-like names in the Markdown spec', () => {
    const md = buildErMarkdownSpec([{ id: 7, name: '活動 <重要> | C:\\tmp', relations: [], fields: [] }], undefined, { generatedAt: 'x' });
    expect(md).toContain('活動 \\<重要\\> \\| C:\\\\tmp');
  });

  it('builds ER Markdown spec with graph analysis summary (SCC, hub, isolated, unresolved)', () => {
    const analysis = analyzeErDependencies(sampleApps);
    const md = buildErMarkdownSpec(sampleApps, analysis, { generatedAt: '2026-10-31T00:00:00.000Z' });
    expect(md).toContain('# kintone ER図 仕様書');
    expect(md).toContain('## グラフ分析サマリ');
    expect(md).toContain('連結成分数: 2');
    expect(md).toContain('複数アプリの循環参照 (SCC)');
    expect(md).toContain('孤立アプリ');
    expect(md).toContain('孤立Memo (App 99)'.replace('Memo', 'メモ'));
    expect(md).toContain('### 未取得の参照先');
    expect(md).toContain('App 30');
    expect(md).toContain('## リレーション一覧');
    expect(md).toContain('### フィールド');


    expect(md).toContain('## リレーション一覧');

  });

  it('builds UTF-8 BOM CSV of relations and neutralizes formula injection cells', () => {
    const appsWithFormulaRel = [
      ...sampleApps,
      {
        id: 40,
        name: '=HYPERLINK("http://evil")',
        fields: [],
        allFields: [],
        relations: [
          {
            kind: 'LOOKUP',
            from: '+cmd',
            fromLabel: '-danger',
            toApp: 20,
            toField: '@target'
          }
        ]
      }
    ];
    const csv = buildErRelationsCsv(appsWithFormulaRel);
    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv).toContain('参照元アプリID,参照元アプリ名,フィールドコード,フィールド名,リレーション種別,参照先アプリID,参照先アプリ名,キー・条件詳細');
    expect(csv).toContain('10,受注管理,cust_id,顧客ID,LOOKUP,20,顧客マスタ,cust_id -> customer_key');

    expect(csv).toContain('\'=HYPERLINK(""http://evil"")');
    expect(csv).toContain('\'+cmd');
    expect(csv).toContain('\'-danger');
  });
});
