import { describe, it, expect } from 'vitest';
import { computeDiffRows } from '../../src/diff/engine';
import { addFieldImpactRef, enrichDiffRows, buildStatusImpactIndex, extractEntityContext, buildDiffReasonSummary } from '../../src/diff/enrich';

function makeBundle(sections: Record<string, any>) {
  return { sections };
}

describe('diff/enrich (non-field improvements)', () => {
  describe('real API shapes seen on the tenant', () => {
    const fields = {
      amount: { code: 'amount', label: '金額', type: 'NUMBER' },
      category: { code: 'category', label: '区分', type: 'DROP_DOWN' },
      company_name: { code: 'company_name', label: '会社名', type: 'SINGLE_LINE_TEXT' }
    };
    const enrichOne = (row: any, layout: any[] = []) => {
      const bundle = makeBundle({ fieldSettings: { properties: fields }, layoutSettings: { layout } });
      return enrichDiffRows([{ _id: 'r', ...row }], bundle, bundle)[0];
    };

    it('names the changed field setting instead of a generic reason', () => {
      const row = enrichOne({ sectionKey: 'fieldSettings', type: 'changed', path: 'fieldSettings.properties.amount.minValue', left: '0', right: '100' });
      expect(row.reasonSummary).toBe('数値の制限（最小） 変更');
    });

    it('names the option on option rows', () => {
      const row = enrichOne({ sectionKey: 'fieldSettings', type: 'added', path: 'fieldSettings.properties.category.options.VIP', right: { index: '3', label: 'VIP' } });
      expect(row.reasonSummary).toBe('選択肢「VIP」 追加');
    });

    it('keeps the generic reason when the setting is unknown', () => {
      const row = enrichOne({ sectionKey: 'fieldSettings', type: 'changed', path: 'fieldSettings.properties.amount.somethingNew', left: 'a', right: 'b' });
      expect(row.reasonSummary).toBe('フィールド設定変更');
    });

    it('identifies the field on formSettings rows, whose properties are an array', () => {
      const row = enrichOne({
        sectionKey: 'formSettings', type: 'changed', path: 'formSettings.properties[0].minLength',
        left: '0', right: null, arrayKey: 'code', arrayKeyValue: 'company_name'
      });
      expect(row.entityLabel).toBe('会社名（company_name）');
      expect(row.entityPropLabel).toBe('文字数（最小）');
      expect(row.reasonSummary).toBe('フォームのフィールド「会社名（company_name）」 / 文字数（最小） 変更');
    });

    it('treats a whole formSettings field as the entity itself', () => {
      const row = enrichOne({
        sectionKey: 'formSettings', type: 'removed', path: 'formSettings.properties[3]',
        left: { code: 'memo', label: 'メモ', type: 'MULTI_LINE_TEXT' }, arrayKey: 'code', arrayKeyValue: 'memo'
      });
      expect(row.reasonSummary).toBe('フォームのフィールド削除：メモ（memo）');
    });

    it('names the field on layout rows, including rows without a field payload', () => {
      const layout = [{ type: 'ROW', fields: [{ type: 'SINGLE_LINE_TEXT', code: 'company_name', size: { width: '300' } }] }];
      const width = enrichOne({ sectionKey: 'layoutSettings', type: 'changed', path: 'layoutSettings.layout[0].fields[0].size.width', left: '260', right: '300' }, layout);
      expect(width.entityPropLabel).toBe('フィールド「会社名（company_name）」 / 横幅');
      const removed = enrichOne({ sectionKey: 'layoutSettings', type: 'removed', path: 'layoutSettings.layout[0].fields[0]', left: layout[0].fields[0] }, layout);
      expect(removed.reasonSummary).toBe('レイアウト行「行 #1」 / フィールド「会社名（company_name）」 削除');
    });

    it('finds fields placed inside a group', () => {
      const layout = [{ type: 'GROUP', code: 'g', layout: [{ type: 'ROW', fields: [{ type: 'NUMBER', code: 'amount', size: { width: '100' } }] }] }];
      const row = enrichOne({ sectionKey: 'layoutSettings', type: 'changed', path: 'layoutSettings.layout[0].layout[0].fields[0].size.width', left: '90', right: '100' }, layout);
      expect(row.entityPropLabel).toBe('フィールド「金額（amount）」 / 横幅');
    });

    it('uses the file name for JS/CSS files instead of a fileKey prefix', () => {
      const ctx = extractEntityContext({
        sectionKey: 'customizeSettings', type: 'removed', path: 'customizeSettings.desktop.js[2]',
        left: { type: 'FILE', name: 'a.js', file: { fileKey: '20260502124602611BD', name: 'a.js' } }
      });
      expect(ctx.entityLabel).toBe('デスクトップ/JS: a.js');
    });

    it('keeps identifying JS/CSS file sub-rows by the matched file name', () => {
      const ctx = extractEntityContext({
        sectionKey: 'customizeSettings', type: 'changed', path: 'customizeSettings.desktop.js[2]._body',
        left: 'a', right: 'b', arrayKey: 'name', arrayKeyValue: 'a.js'
      });
      expect(ctx.entityLabel).toBe('デスクトップ/JS: a.js');
    });

    it('treats name-keyed app actions as entities', () => {
      const [root, child] = enrichDiffRows([
        { _id: 'a', sectionKey: 'actionSettings', type: 'removed', path: 'actionSettings.actions.出荷を指示', left: { name: '出荷を指示', id: '1' } },
        { _id: 'b', sectionKey: 'actionSettings', type: 'changed', path: 'actionSettings.actions.契約を作成.filterCond', left: '', right: 'a = 1' }
      ], makeBundle({}), makeBundle({}));
      expect(root.reasonSummary).toBe('アクション削除：出荷を指示');
      expect(child.reasonSummary).toBe('アクション「契約を作成」 / 実行条件 変更');
    });
  });

  describe('buildStatusImpactIndex', () => {
    it('indexes transition actions by referenced state names', () => {
      const bundle = makeBundle({
        processSettings: {
          enable: true,
          states: { 未処理: {}, 処理中: {}, 完了: {} },
          actions: [
            { name: '着手', from: '未処理', to: '処理中' },
            { name: '完了する', from: '処理中', to: '完了' }
          ]
        }
      });
      const index = buildStatusImpactIndex(bundle, null);
      expect(index.get('処理中')?.length).toBe(2);
      const kinds = (index.get('処理中') || []).map((r: any) => r.kind).sort();
      expect(kinds).toEqual(['遷移元参照', '遷移先参照']);
      expect(index.get('未処理')?.length).toBe(1);
    });
  });

  describe('enrichDiffRows: state removal impact', () => {
    it('attaches transition action refs to a removed state row', () => {
      const source = makeBundle({
        processSettings: {
          enable: true,
          states: { 未処理: {}, 完了: {}, 保留: {} },
          actions: [
            { name: '完了する', from: '未処理', to: '完了' },
            { name: '保留にする', from: '未処理', to: '保留' }
          ]
        }
      });
      const target = makeBundle({
        processSettings: {
          enable: true,
          states: { 未処理: {}, 完了: {} },
          actions: [
            { name: '完了する', from: '未処理', to: '完了' }
          ]
        }
      });
      const { rows } = computeDiffRows(source, target, ['processSettings'], '');
      const enriched = enrichDiffRows(rows, source, target);
      const stateRow = enriched.find((r: any) => r.path === 'processSettings.states.保留');
      expect(stateRow).toBeTruthy();
      expect(stateRow.type).toBe('removed');
      expect(stateRow.impactCount).toBeGreaterThan(0);
      expect(stateRow.impactRefs.some((ref: any) => ref.kind === '遷移先参照' && ref.label === '保留にする')).toBe(true);
    });
  });

  describe('enrichDiffRows: field removal impact covers ACL sections', () => {
    it('includes fieldAcl references for a removed field', () => {
      const source = makeBundle({
        fieldSettings: { properties: { price: { type: 'NUMBER', code: 'price', label: '価格' } } },
        fieldAcl: { rights: [{ code: 'price', entities: [{ entity: { type: 'GROUP', code: 'sales' }, accessibility: 'READ' }] }] }
      });
      const target = makeBundle({
        fieldSettings: { properties: {} },
        fieldAcl: { rights: [{ code: 'price', entities: [{ entity: { type: 'GROUP', code: 'sales' }, accessibility: 'READ' }] }] }
      });
      const { rows } = computeDiffRows(source, target, ['fieldSettings'], '');
      const enriched = enrichDiffRows(rows, source, target);
      const fieldRow = enriched.find((r: any) => r.path === 'fieldSettings.properties.price');
      expect(fieldRow).toBeTruthy();
      expect(fieldRow.impactRefs.some((ref: any) => ref.sectionKey === 'fieldAcl')).toBe(true);
    });
  });

  describe('enrichDiffRows: related setting deduplication', () => {
    it('collapses source/target field-list positions without merging different views', () => {
      const source = makeBundle({
        fieldSettings: {
          properties: {
            subject: { type: 'SINGLE_LINE_TEXT', code: 'subject', label: '件名' },
            owner: { type: 'USER_SELECT', code: 'owner', label: '担当者' }
          }
        },
        viewSettings: {
          views: {
            案件一覧: { type: 'LIST', fields: ['subject', 'owner'] },
            担当一覧: { type: 'LIST', fields: ['subject', 'owner'] }
          }
        }
      });
      const target = makeBundle({
        fieldSettings: {
          properties: {
            subject: { type: 'SINGLE_LINE_TEXT', code: 'subject', label: '案件名' },
            owner: { type: 'USER_SELECT', code: 'owner', label: '担当者' }
          }
        },
        viewSettings: {
          views: {
            案件一覧: { type: 'LIST', fields: ['owner', 'subject'] },
            担当一覧: { type: 'LIST', fields: ['owner', 'subject'] }
          }
        }
      });
      const { rows } = computeDiffRows(source, target, ['fieldSettings'], '');
      const enriched = enrichDiffRows(rows, source, target);
      const fieldRow = enriched.find((r: any) => r.path === 'fieldSettings.properties.subject.label');

      expect(fieldRow).toBeTruthy();
      expect(fieldRow.impactCount).toBe(2);
      expect(fieldRow.impactRefs).toHaveLength(2);
      expect(fieldRow.impactSummary).toContain(':2');
      expect(fieldRow.impactRefs.map((ref: any) => ref.path)).toEqual([
        'viewSettings.views.案件一覧.fields[0]',
        'viewSettings.views.担当一覧.fields[0]'
      ]);
    });
  });

  describe('buildDiffReasonSummary: moved rows include positions', () => {
    it('includes from/to positions when available', () => {
      const summary = buildDiffReasonSummary({
        sectionKey: 'layoutSettings',
        path: 'layoutSettings.layout[2]',
        type: 'changed',
        moved: true,
        movedFrom: 0,
        movedTo: 2
      });
      expect(summary).toBe('レイアウト順序変更（1番目 → 3番目）');
    });

    it('omits position note when indices are unknown', () => {
      const summary = buildDiffReasonSummary({
        sectionKey: 'categories',
        path: 'categories.categories.A',
        type: 'changed',
        moved: true
      });
      expect(summary).toBe('カテゴリ順序変更');
    });
  });

  describe('enrichDiffRows: notation/empty flags appear in reasonSummary', () => {
    it('appends a notation-only note for "100" vs 100 changes', () => {
      const source = makeBundle({
        fieldSettings: { properties: { num: { type: 'NUMBER', code: 'num', label: '数量', maxValue: '100' } } }
      });
      const target = makeBundle({
        fieldSettings: { properties: { num: { type: 'NUMBER', code: 'num', label: '数量', maxValue: 100 } } }
      });
      const { rows } = computeDiffRows(source, target, ['fieldSettings'], '');
      const enriched = enrichDiffRows(rows, source, target);
      const row = enriched.find((r: any) => r.path.endsWith('maxValue'));
      expect(row).toBeTruthy();
      expect(row.reasonSummary).toContain('表記のみ');
      expect(row.severity).toBe('low');
    });
  });

  describe('extractEntityContext', () => {
    it('uses one-based layout positions and the same Japanese height label as Excel', () => {
      const row = {
        sectionKey: 'layoutSettings',
        path: 'layoutSettings.layout[0].fields[1].size.innerHeight',
        type: 'changed',
        left: 60,
        right: 80
      };
      const ctx = extractEntityContext(row);
      expect(ctx.entityKind).toBe('layoutRow');
      expect(ctx.entityLabel).toBe('行 #1');
      expect(ctx.propLabel).toBe('入力欄の高さ');
    });

    it('labels general notification rows by recipient entity', () => {
      const row = {
        sectionKey: 'notifications',
        path: 'notifications.notifications[0].includeSubs',
        type: 'changed',
        left: false,
        right: true,
        arrayKey: 'entity',
        arrayKeyValue: { type: 'GROUP', code: 'sales' }
      };
      const ctx = extractEntityContext(row);
      expect(ctx.entityKind).toBe('notification');
      expect(ctx.entityLabel).toBe('sales (GROUP)');
    });

    it('labels fieldAcl entity-level rows by target entity', () => {
      const row = {
        sectionKey: 'fieldAcl',
        path: 'fieldAcl.rights[0].entities[1].accessibility',
        type: 'changed',
        left: 'READ',
        right: 'NONE',
        arrayKey: 'entity',
        arrayKeyValue: { type: 'GROUP', code: 'support' }
      };
      const ctx = extractEntityContext(row);
      expect(ctx.entityKind).toBe('fieldAclEntry');
      expect(ctx.entityLabel).toBe('support (GROUP)');
      expect(ctx.propLabel).toBe('アクセス権');
    });
  });
});

describe('enrichDiffRows: rename candidate search cost', () => {
  it('normalizes each removed/added field once instead of once per candidate pair', () => {
    const count = 24;
    let reads = 0;
    const makeField = (code: string, label: string) => {
      const def: any = { type: 'SINGLE_LINE_TEXT', code, required: false };
      Object.defineProperty(def, 'label', {
        enumerable: true,
        get() { reads += 1; return label; }
      });
      return def;
    };
    const makeProps = (prefix: string) => Object.fromEntries(
      Array.from({ length: count }, (_, index) => {
        const code = `${prefix}_${index}`;
        return [code, makeField(code, `${prefix} 項目 ${index}`)];
      })
    );
    const rows = [
      ...Object.entries(makeProps('old')).map(([code, field], index) => ({
        _id: `r${index}`, sectionKey: 'fieldSettings', type: 'removed', path: `fieldSettings.properties.${code}`, left: field
      })),
      ...Object.entries(makeProps('new')).map(([code, field], index) => ({
        _id: `a${index}`, sectionKey: 'fieldSettings', type: 'added', path: `fieldSettings.properties.${code}`, right: field
      }))
    ];
    reads = 0;
    enrichDiffRows(rows, makeBundle({}), makeBundle({}));
    // 総当たり（24 x 24 = 576 組）ごとに再計算すると 1,000 回を超える。行ごとに 1 回なら 48 行 x 数回で収まる。
    expect(reads).toBeLessThan(count * 2 * 8);
  });

  it('still pairs the removed and added field that share structure and label', () => {
    const base = { type: 'NUMBER', label: '金額', required: true, unit: '円' };
    const rows = [
      { _id: 'r1', sectionKey: 'fieldSettings', type: 'removed', path: 'fieldSettings.properties.price', left: { ...base, code: 'price' } },
      { _id: 'r2', sectionKey: 'fieldSettings', type: 'removed', path: 'fieldSettings.properties.memo', left: { type: 'NUMBER', label: '備考', code: 'memo' } },
      { _id: 'a1', sectionKey: 'fieldSettings', type: 'added', path: 'fieldSettings.properties.amount', right: { ...base, code: 'amount' } }
    ];
    const enriched = enrichDiffRows(rows, makeBundle({}), makeBundle({}));
    expect(enriched.find((row: any) => row._id === 'r1')?.renameCandidate?.toCode).toBe('amount');
    expect(enriched.find((row: any) => row._id === 'a1')?.renameCandidate?.fromCode).toBe('price');
    expect(enriched.find((row: any) => row._id === 'r2')?.renameCandidate).toBeUndefined();
  });
});

describe('addFieldImpactRef', () => {
  it('drops duplicates of the same logical reference without rescanning the bucket each time', () => {
    const index = new Map<string, any[]>();
    let pathReads = 0;
    const makeRef = (path: string) => {
      const ref: any = { sectionKey: 'viewSettings', kind: '配列参照', label: 'fields' };
      Object.defineProperty(ref, 'path', { enumerable: true, get() { pathReads += 1; return path; } });
      return ref;
    };
    const total = 200;
    for (let i = 0; i < total; i += 1) addFieldImpactRef(index, 'amount', makeRef(`viewSettings.views.v${i}.fields[0]`));
    // 添字だけが違う表示項目の参照は同じ論理設定として 1 件にまとめる。
    addFieldImpactRef(index, 'amount', makeRef('viewSettings.views.v0.fields[5]'));
    addFieldImpactRef(index, 'amount', makeRef('viewSettings.views.v1.fields[3]'));
    expect(index.get('amount')).toHaveLength(total);
    // 登録済みの全参照を毎回読み直す実装では 200 x 200 / 2 回を超える。
    expect(pathReads).toBeLessThan(total * 6);
  });
});

describe('enrichDiffRows: process state rename notice', () => {
  const state = (name: string, index: string) => ({ name, index, assignee: { type: 'ONE', entities: [] } });
  const source = makeBundle({
    processSettings: { enable: true, states: { 未処理: state('未処理', '0'), 処理中: state('処理中', '1') }, actions: [{ name: '着手', from: '未処理', to: '処理中', filterCond: '' }] }
  });
  const target = makeBundle({
    processSettings: { enable: true, states: { 未処理: state('未処理', '0'), 対応中: state('対応中', '1') }, actions: [{ name: '着手', from: '未処理', to: '対応中', filterCond: '' }] }
  });

  it('keeps the readable rename description instead of the internal __rename__ marker', () => {
    const { rows } = computeDiffRows(source, target, ['processSettings'], '');
    const [row] = enrichDiffRows(rows, source, target);

    expect(row.path).toBe('processSettings.states.__rename__');
    expect(row.reasonSummary).toBe('ステータス改名：処理中 → 対応中（参照を自動補正）');
    expect(row.entityLabel).toBe('処理中 → 対応中');
    expect(row.entityPropLabel).toBe('ステータス名');
    expect(JSON.stringify([row.reasonSummary, row.entityLabel, row.entityPropLabel])).not.toContain('__rename__');
  });
});

describe('buildDiffReasonSummary: property names', () => {
  const summary = (sectionKey: string, path: string) => buildDiffReasonSummary({ sectionKey, path, type: 'changed', left: 1, right: 2 });

  it('resolves camelCase app setting and app info keys instead of dropping the property name', () => {
    expect(summary('appSettings', 'appSettings.enableThumbnails')).toBe('アプリ設定変更：サムネイル表示');
    expect(summary('appSettings', 'appSettings.name')).toBe('アプリ設定変更：アプリ名');
    expect(summary('appInfo', 'appInfo.threadId')).toBe('アプリ情報変更：スレッドID');
  });

  it('shows the dictionary label, or the original-case key, for unknown entity properties', () => {
    expect(summary('notifications', 'notifications.notifications[0].recordAdded')).toContain('/ レコードの追加 変更');
    expect(summary('reportSettings', 'reportSettings.reports.r1.periodicReport.period.dayOfMonth')).toContain('/ 日 変更');
    expect(summary('reportSettings', 'reportSettings.reports.r1.someFutureKey')).toContain('/ someFutureKey 変更');
  });

  it('labels the JS/CSS file size as a file size in the row summary', () => {
    expect(summary('customizeSettings', 'customizeSettings.desktop.js[0].file.size')).toContain('/ ファイルサイズ 変更');
  });
});
