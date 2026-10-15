import { describe, it, expect } from 'vitest';
import { computeDiffRows } from '../../src/diff/engine';
import { addFieldImpactRef, enrichDiffRows, buildStatusImpactIndex, extractEntityContext, buildDiffReasonSummary } from '../../src/diff/enrich';

function makeBundle(sections: Record<string, any>) {
  return { sections };
}

describe('diff/enrich (non-field improvements)', () => {
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
