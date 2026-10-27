import { describe, expect, it } from 'vitest';
import { describeLayoutNode, reclassifyLayoutRemovals } from '../../src/reflect/changeSummary';
import { describeRemovedChange } from '../../src/reflect/applyProgress';
import { buildReflectSectionPlan as plan } from '../../src/reflect/standalonePlan';

const f = (code: string) => ({ type: 'SINGLE_LINE_TEXT', code, size: { width: '200' } });
const row = (...fields: any[]) => ({ type: 'ROW', fields });
const labels = { a: '顧客名', b: '電話番号', c: 'メール', d: '住所', e: '備考' };

describe('レイアウトの組み替えは「削除」として数えない', () => {
  it('フィールドを別の行へ移しても、削除・置換は 0 件（行の内容が変わっても）', () => {
    const target = { layout: [row(f('a'), f('b')), row(f('c')), row(f('d'))] };
    const source = { layout: [row(f('a')), row(f('b'), f('c')), row(f('d'))] };
    const result = plan('layoutSettings', source, target, { fieldLabels: labels });
    expect(result.status).toBe('change');
    expect(result.removalCount).toBe(0);
    expect(result.changes.filter(change => change.kind === '削除')).toEqual([]);
    expect(result.changeCount).toBeGreaterThan(0);
    // 行の組み替えは「変更」として残り、利用者向けの説明が付く。
    expect(result.changes.some(change => change.kind === '変更' && /並べ替え・移動/.test(change.summary || ''))).toBe(true);
    // 変更の要約には削除が出ない（位置の変更として示す）。
    expect(result.items?.some(item => item.kind === '削除')).toBe(false);
  });

  it('行の順序だけを入れ替えても削除にならない', () => {
    const target = { layout: [row(f('a')), row(f('b')), row(f('c'))] };
    const source = { layout: [row(f('c')), row(f('a')), row(f('b'))] };
    const result = plan('layoutSettings', source, target);
    expect(result.removalCount).toBe(0);
    expect(result.changeCount).toBe(1);
  });

  it('グループの中身を組み替えても、フィールドが残るなら削除にならない', () => {
    const group = (...rows: any[]) => ({ type: 'GROUP', code: 'g', label: '連絡先', openGroup: true, layout: rows });
    const target = { layout: [group(row(f('a'), f('b')), row(f('c')))] };
    const source = { layout: [group(row(f('a')), row(f('b'), f('c')))] };
    const result = plan('layoutSettings', source, target);
    expect(result.removalCount).toBe(0);
  });

  it('本当に無くなる要素（ラベルだけの行）は削除のまま数え、生 JSON ではなく言葉で説明する', () => {
    const label = { type: 'LABEL', label: '注意書き', elementId: 'l1' };
    const target = { layout: [row(label), row(f('a'))] };
    const source = { layout: [row(f('a'))] };
    const result = plan('layoutSettings', source, target, { fieldLabels: labels });
    expect(result.removalCount).toBe(1);
    const removal = result.changes.find(change => change.kind === '削除')!;
    expect(removal.summary).toBe('ラベル・スペース・罫線だけの行');
    expect(describeRemovedChange(result.label, removal)).toBe('レイアウト設定 / 配置：ラベル・スペース・罫線だけの行');
    expect(describeRemovedChange(result.label, removal)).not.toMatch(/\{"type"/);
  });

  it('反映先だけのフィールドは保持されるため、反映元に無くても削除にならない', () => {
    const target = { layout: [row(f('a')), row(f('e'))] };
    const source = { layout: [row(f('a'))] };
    const result = plan('layoutSettings', source, target);
    expect(result.removalCount).toBe(0);
  });
});

describe('reclassifyLayoutRemovals', () => {
  const removal = (node: any) => ({ kind: '削除', path: '配置 / 1件目', before: JSON.stringify(node), after: '（なし）' });

  it('反映後のレイアウトに残るフィールドだけの行は「変更」へ、無くなるものは説明を付けて削除のまま', () => {
    const moved = removal(row(f('a'), f('b')));
    const gone = removal(row(f('c'), f('d'), f('e')));
    const changes = [moved, gone];
    const after = [row(f('a')), row(f('b'))];
    reclassifyLayoutRemovals(changes, [], after, labels);
    expect(moved.kind).toBe('変更');
    expect(gone.kind).toBe('削除');
    expect((gone as any).summary).toBe('フィールド 3 個の行（メール（c）、住所（d）、備考（e））');
  });

  it('JSON を読めない変更や、配列要素ではない削除には触れない', () => {
    const odd = { kind: '削除', path: '配置 / 1件目', before: '（なし）', after: '（なし）' };
    const other = { kind: '削除', path: 'アクセス権 / 2件目', before: '{"entity":1}', after: '（なし）' };
    const nested = { kind: '削除', path: 'フィールド / x', before: '{"type":"ROW","fields":[]}', after: '（なし）' };
    reclassifyLayoutRemovals([odd, other, nested], [], [], labels);
    expect([odd.kind, other.kind, nested.kind]).toEqual(['削除', '削除', '削除']);
  });
});

describe('describeLayoutNode', () => {
  it('行・グループ・テーブルを短い言葉で説明する', () => {
    expect(describeLayoutNode(row(f('a'), f('b')), labels)).toBe('フィールド 2 個の行（顧客名（a）、電話番号（b））');
    expect(describeLayoutNode({ type: 'GROUP', code: 'g', label: '連絡先', layout: [row(f('c'))] }, labels)).toBe('グループ「連絡先（g）」（中のフィールド 1 個）');
    expect(describeLayoutNode({ type: 'SUBTABLE', code: 't', fields: [f('d')] }, labels)).toBe('テーブル「t」');
    expect(describeLayoutNode(row(f('a'), f('b'), f('c'), f('d'), f('e')), labels)).toContain('…');
  });
});
