import { describe, expect, it } from 'vitest';
import { computeDiffRows } from '../../src/diff/engine';
import { enrichDiffRows } from '../../src/diff/enrich';
import { decodeRow } from '../../src/diff/path-decoder';
import { runDiffStandalone } from '../../src/tabs/diff-standalone';

// 業務アプリに近い設定での通し検証（tools/test-harness/diff-explore.cjs）で見つかった、
// 差分行の見出し・値の表示の問題の再現テスト。

function compare(source: Record<string, any>, target: Record<string, any>, sections: string[], presets: Record<string, boolean> = {}) {
  const sourceBundle = { sections: source };
  const targetBundle = { sections: target };
  const result = computeDiffRows(sourceBundle, targetBundle, sections, '', { normalizationPresetState: presets });
  return enrichDiffRows(result.rows, sourceBundle, targetBundle) as any[];
}

describe('フィールド権限の行は、対象のフィールドを示す', () => {
  const rights = (amountEveryone: string, noteEveryone: string) => ({
    rights: [
      { code: 'amount', entities: [{ accessibility: amountEveryone, entity: { type: 'GROUP', code: 'everyone' }, includeSubs: false }] },
      { code: 'note', entities: [{ accessibility: noteEveryone, entity: { type: 'GROUP', code: 'everyone' }, includeSubs: false }] }
    ]
  });
  const fields = { properties: { amount: { type: 'NUMBER', code: 'amount', label: '金額' }, note: { type: 'SINGLE_LINE_TEXT', code: 'note', label: '備考' } } };

  it('同じ宛先（全員）を持つフィールドが複数あっても、どのフィールドのアクセス権の変更かが分かる', () => {
    const rows = compare(
      { fieldAcl: rights('READ', 'WRITE'), fieldSettings: fields },
      { fieldAcl: rights('WRITE', 'READ'), fieldSettings: fields },
      ['fieldAcl']
    );
    expect(rows).toHaveLength(2);
    expect(rows.map((row) => row.entityLabel)).toEqual(['金額（amount） › everyone (GROUP)', '備考（note） › everyone (GROUP)']);
    expect(rows.map((row) => row.entityCode)).toEqual(['amount', 'note']);
    expect(rows[0].reasonSummary).toContain('金額（amount）');
    expect(rows[1].reasonSummary).toContain('備考（note）');
  });

  it('並び順を無視した比較でも、対象のフィールドを示す', () => {
    const rows = compare(
      { fieldAcl: rights('READ', 'WRITE'), fieldSettings: fields },
      { fieldAcl: rights('WRITE', 'READ'), fieldSettings: fields },
      ['fieldAcl'],
      { permissionOrder: true }
    );
    expect(rows.map((row) => row.entityCode).sort()).toEqual(['amount', 'note']);
  });
});

describe('グラフの集計の値を読める文言にする', () => {
  it('kintone が返す AVERAGE（平均）を日本語にし、件数の集計に「未設定」を付けない', () => {
    const rows = compare(
      { reportSettings: { reports: { 月別: { name: '月別', chartType: 'BAR', groups: [{ code: 'due', per: 'MONTH' }], aggregations: [{ type: 'AVERAGE', code: 'amount' }] }, 地域別: { name: '地域別', chartType: 'PIE', groups: [], aggregations: [{ type: 'COUNT' }] } } } },
      { reportSettings: { reports: { 月別: { name: '月別', chartType: 'BAR', groups: [{ code: 'due', per: 'MONTH' }], aggregations: [{ type: 'SUM', code: 'amount' }] } } } },
      ['reportSettings']
    );
    const changed = rows.find((row) => row.path.endsWith('aggregations[0].type'));
    const decoded = decodeRow(changed)!;
    expect([decoded.beforeText, decoded.afterText]).toEqual(['平均', '合計']);
    const removed = decodeRow(rows.find((row) => row.path === 'reportSettings.reports.地域別')!)!;
    expect(removed.beforeText).toContain('集計: レコード数');
    expect(removed.beforeText).not.toContain('未設定');
    expect(decodeRow({ sectionKey: 'reportSettings', path: 'reportSettings.reports.R.aggregations[0]', type: 'removed', left: { type: 'SUM', code: 'amount' } } as any)!.beforeText).toBe('合計（amount）');
  });
});

describe('プロセス管理の作業者・フィールドの初期値の見出し', () => {
  it('ステータスの作業者の変更を「作業者」と示す（内部の項目名「エンティティ」にしない）', () => {
    const states = (entities: any[]) => ({ enable: true, states: { 完了: { name: '完了', index: '0', assignee: { type: 'ONE', entities } } }, actions: [] });
    const rows = compare(
      { processSettings: states([{ entity: { type: 'USER', code: 'admin' }, includeSubs: false }]) },
      { processSettings: states([]) },
      ['processSettings']
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].reasonSummary).toBe('ステータス「完了」 / 作業者 削除');
  });

  it('チェックボックスの初期値の 1 要素の削除を、「初期値（2件目）」と示す', () => {
    const tags = (defaults: string[]) => ({ properties: { tags: { type: 'CHECK_BOX', code: 'tags', label: 'タグ', options: { a: { label: 'a', index: '0' }, b: { label: 'b', index: '1' } }, defaultValue: defaults } } });
    const rows = compare({ fieldSettings: tags(['a', 'b']) }, { fieldSettings: tags(['a']) }, ['fieldSettings']);
    expect(rows).toHaveLength(1);
    expect(rows[0].reasonSummary).toBe('初期値（2件目） 削除');
  });
});

describe('完了メッセージの件数', () => {
  it('内容変更と移動を重ねて数えず、画面の概要と同じ数にする', async () => {
    const plugin = (id: string) => ({ id, name: id, enabled: true });
    const bundle = (appId: string, ids: string[], enabled: boolean) => ({
      appId, guestId: '', preview: false, meta: { sectionRevisions: {} },
      sections: { pluginSettings: { plugins: ids.map((id) => ({ ...plugin(id), enabled })) } }
    });
    const result = await runDiffStandalone({
      source: { appId: '1' }, target: { appId: '2' }, scopes: ['pluginSettings'],
      // a・b を入れ替え（移動 2 件）、c の有効状態だけを変える（内容変更 1 件）
      importedSourceBundle: { ...bundle('1', ['a', 'b', 'c'], true) },
      importedTargetBundle: { ...bundle('2', ['b', 'a', 'c'], true), sections: { pluginSettings: { plugins: [plugin('b'), plugin('a'), { ...plugin('c'), enabled: false }] } } }
    });
    expect(result.summary.counts.moved).toBe(2);
    expect(result.summary.text).toContain('内容変更:1 / 移動:2');
    expect(result.summary.text).not.toMatch(/ 変更:/);
  });
});

describe('並び順を無視した比較でも、レイアウトの行に正しいフィールド名を付ける', () => {
  const field = (code: string, label: string) => ({ type: 'SINGLE_LINE_TEXT', code, label });
  const properties = Object.fromEntries([field('customer_name', '顧客名'), field('cust_name', '顧客名'), field('customer_code', '取引先コード'), field('cust_tel', '電話番号'), field('cust_addr', '住所')].map((item) => [item.code, item]));
  const cell = (code: string) => ({ type: 'SINGLE_LINE_TEXT', code, size: { width: '200' } });
  const row = (...codes: string[]) => ({ type: 'ROW', fields: codes.map(cell) });
  const layout = (first: string) => ({ layout: [row(first, 'customer_code'), row('cust_tel', 'cust_addr')] });

  it('並べ替え後の位置と元の設定の位置が違っても、削除・追加された配置は自分のコードの名前になる', () => {
    const rows = compare(
      { layoutSettings: layout('customer_name'), fieldSettings: { properties } },
      { layoutSettings: layout('cust_name'), fieldSettings: { properties } },
      ['layoutSettings'],
      { fieldOrder: true }
    );
    expect(rows.every((row) => row._orderNormalized === true)).toBe(true);
    const removed = rows.find((row) => row.type === 'removed');
    const added = rows.find((row) => row.type === 'added');
    expect(removed.reasonSummary).toContain('顧客名（customer_name）');
    expect(added.reasonSummary).toContain('顧客名（cust_name）');
    expect(rows.map((row) => row.reasonSummary).join('\n')).not.toMatch(/住所|電話番号/);
  });

  it('並び順を無視していない比較は、従来どおり path の位置から名前を引ける（フィールドの横幅の変更など）', () => {
    const wide = { layout: [{ type: 'ROW', fields: [{ type: 'SINGLE_LINE_TEXT', code: 'cust_tel', size: { width: '300' } }] }] };
    const narrow = { layout: [{ type: 'ROW', fields: [{ type: 'SINGLE_LINE_TEXT', code: 'cust_tel', size: { width: '200' } }] }] };
    const rows = compare({ layoutSettings: narrow, fieldSettings: { properties } }, { layoutSettings: wide, fieldSettings: { properties } }, ['layoutSettings']);
    expect(rows).toHaveLength(1);
    expect(rows[0]._orderNormalized).toBeUndefined();
    expect(rows[0].entityPropLabel).toContain('電話番号（cust_tel）');
  });
});
