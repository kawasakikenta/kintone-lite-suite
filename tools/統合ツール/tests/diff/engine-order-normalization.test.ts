import { describe, expect, it } from 'vitest';
import { computeDiffRows } from '../../src/diff/engine';

// 「並び順を無視」を選んだときは、並び順の差（moved の行）を出してはならない。
// 正規化は配列を内容で並べ替えるため、内容が違う要素が混ざると、並べ替え後の位置がずれて
// 内容の同じ要素が「並び順が異なる」と見えてしまうことがあった（通し検証で確認）。
function run(source: Record<string, any>, target: Record<string, any>, sections: string[], presets: Record<string, boolean>) {
  return computeDiffRows({ sections: source }, { sections: target }, sections, '', { normalizationPresetState: presets });
}

const everyone = { type: 'GROUP', code: 'everyone' };
const admin = { type: 'USER', code: 'admin' };

describe('diff/engine 並び順の正規化と移動行', () => {
  it('フィールド権限: 並び順を無視すると、アクセス権の変更だけが出て、移動の行は出ない', () => {
    const fieldAcl = (everyoneAccess: string) => ({
      rights: [{ code: 'amount', entities: [
        { accessibility: everyoneAccess, entity: everyone, includeSubs: false },
        { accessibility: 'WRITE', entity: admin, includeSubs: false }
      ] }]
    });
    const withPreset = run({ fieldAcl: fieldAcl('READ') }, { fieldAcl: fieldAcl('WRITE') }, ['fieldAcl'], { permissionOrder: true });
    const rows = withPreset.rows.filter((row: any) => row.type !== 'same');
    expect(rows.filter((row: any) => row.moved)).toEqual([]);
    expect(rows.map((row: any) => [row.type, row.path])).toEqual([['changed', 'fieldAcl.rights[0].entities[1].accessibility']]);
  });

  it('アプリ権限: 並び順を無視すると、権限の変更だけが出て、移動の行は出ない', () => {
    const right = (entity: any, recordEditable: boolean) => ({ entity, includeSubs: false, appEditable: false, recordViewable: true, recordEditable });
    const source = { appAcl: { rights: [right(admin, true), right(everyone, false), right({ type: 'ORGANIZATION', code: 'sales' }, true)] } };
    const target = { appAcl: { rights: [right(everyone, true), right(admin, true), right({ type: 'ORGANIZATION', code: 'sales' }, true)] } };
    const rows = run(source, target, ['appAcl'], { permissionOrder: true }).rows.filter((row: any) => row.type !== 'same');
    expect(rows.filter((row: any) => row.moved)).toEqual([]);
    expect(rows).toHaveLength(1);
    expect(rows[0].type).toBe('changed');
  });

  it('並び順を無視しないときは、従来どおり移動の行を出す', () => {
    const right = (entity: any) => ({ entity, includeSubs: false, appEditable: false });
    const source = { appAcl: { rights: [right(admin), right(everyone)] } };
    const target = { appAcl: { rights: [right(everyone), right(admin)] } };
    const rows = run(source, target, ['appAcl'], {}).rows.filter((row: any) => row.type !== 'same');
    expect(rows.some((row: any) => row.moved)).toBe(true);
  });

  it('一覧: 並び順を無視すると、表示順（index）の違いと移動は出ず、条件の変更だけが出る', () => {
    const views = (filter: string, order: string[]) => ({
      views: Object.fromEntries(order.map((name, index) => [name, { type: 'LIST', name, index: String(index), fields: ['a'], filterCond: name === 'B' ? filter : '', sort: '' }]))
    });
    const rows = run({ viewSettings: views('x > 1', ['A', 'B', 'C']) }, { viewSettings: views('x > 2', ['C', 'A', 'B']) }, ['viewSettings'], { viewOrder: true }).rows.filter((row: any) => row.type !== 'same');
    expect(rows.filter((row: any) => row.moved)).toEqual([]);
    expect(rows.map((row: any) => row.path)).toEqual(['viewSettings.views.B.filterCond']);
  });
});

describe('diff/engine 表示順（index）の繰り下がり', () => {
  const view = (name: string, index: number) => ({ type: 'LIST', name, index: String(index), fields: ['a'], filterCond: '', sort: '' });
  const views = (names: string[]) => ({ views: Object.fromEntries(names.map((name, index) => [name, view(name, index)])) });
  const rowsOf = (source: any, target: any, section = 'viewSettings') => run({ [section]: source }, { [section]: target }, [section], {}).rows.filter((row: any) => row.type !== 'same');

  it('途中への追加で後続の index が 1 つずつずれただけなら、後続の「表示順」を差にしない', () => {
    const rows = rowsOf(views(['A', 'B', 'C', 'D']), views(['A', 'X', 'B', 'C', 'D']));
    expect(rows.map((row: any) => [row.type, row.path])).toEqual([['added', 'viewSettings.views.X']]);
  });

  it('途中の削除で繰り上がっただけでも差にしない', () => {
    const rows = rowsOf(views(['A', 'X', 'B', 'C']), views(['A', 'B', 'C']));
    expect(rows.map((row: any) => [row.type, row.path])).toEqual([['removed', 'viewSettings.views.X']]);
  });

  it('本当の並べ替え（相対順位の変更）は、index の実際の値のまま差として残す', () => {
    const rows = rowsOf(views(['A', 'B', 'C', 'D']), views(['A', 'X', 'C', 'B', 'D']));
    const changed = rows.filter((row: any) => row.type === 'changed').map((row: any) => [row.path, row.left, row.right]);
    // B は相対順位が 1 → 2 に変わった（実際の index は 1 → 3）。C は index の値は同じ（2 → 2）なので差にならない。A・D は順位が同じ。
    expect(changed).toEqual([['viewSettings.views.B.index', '1', '3']]);
    expect(rows.some((row: any) => row.type === 'added' && row.path === 'viewSettings.views.X')).toBe(true);
    expect(rows.some((row: any) => row.path === 'viewSettings.views.D.index')).toBe(false);
  });

  it('ステータス・グラフ・カテゴリにも同じ規則を適用し、index が数値でないときは従来どおり比べる', () => {
    const states = (names: string[]) => ({ enable: true, states: Object.fromEntries(names.map((name, index) => [name, { name, index: String(index), assignee: { type: 'ONE', entities: [] } }])), actions: [] });
    const stateRows = rowsOf(states(['未対応', '対応中', '完了']), states(['未対応', '対応中', '保留', '完了']), 'processSettings');
    expect(stateRows.map((row: any) => [row.type, row.path])).toEqual([['added', 'processSettings.states.保留']]);
    const reports = (names: string[]) => ({ reports: Object.fromEntries(names.map((name, index) => [name, { name, chartType: 'PIE', index: String(index) }])) });
    expect(rowsOf(reports(['R1', 'R2']), reports(['R0', 'R1', 'R2']), 'reportSettings').map((row: any) => row.path)).toEqual(['reportSettings.reports.R0']);
    const broken = (index: string) => ({ views: { A: { ...view('A', 0), index }, B: view('B', 1) } });
    expect(rowsOf(broken('x'), broken('y')).map((row: any) => row.path)).toEqual(['viewSettings.views.A.index']);
  });
});

describe('diff/engine 表示順の繰り下がりと同一行（includeSame）', () => {
  const view = (name: string, index: number) => ({ type: 'LIST', name, index: String(index), fields: ['a'], filterCond: '', sort: '' });
  const named = (entries: Array<[string, number]>) => ({ views: Object.fromEntries(entries.map(([name, index]) => [name, view(name, index)])) });
  const compare = (source: any, target: any, includeSame: boolean) => computeDiffRows(
    { sections: { viewSettings: source } }, { sections: { viewSettings: target } }, ['viewSettings'], '', { includeSame }
  ).rows as any[];
  const withoutSame = (rows: any[]) => rows.filter((row) => row.type !== 'same');
  const x: [string, number][] = [['X', 0], ['Y', 1], ['Z', 2]];
  const shifted: [string, number][] = [['X', 0], ['W', 1], ['Y', 2], ['Z', 3]];

  it('includeSame の有無で、差分（same 以外）の行と件数は変わらない', () => {
    const off = compare(named(x), named(shifted), false);
    const on = compare(named(x), named(shifted), true);
    expect(withoutSame(on).map(({ _id, ...row }: any) => row)).toEqual(off.map(({ _id, ...row }: any) => row));
    expect(withoutSame(on).map((row) => [row.type, row.path])).toEqual([['added', 'viewSettings.views.W']]);
  });

  it('同一行には実際の値を出す。繰り下がっただけで index が左右で違う要素の同一行は出さない', () => {
    const rows = compare(named(x), named(shifted), true);
    const same = rows.filter((row) => row.type === 'same');
    // X は index も同じ（0・0）。Y・Z は実際には 1→2・2→3 なので、順位の値（1・1、2・2）を「同一」として出さない。
    expect(same.map((row) => row.path)).toEqual(['viewSettings.views.X']);
    expect(same[0].left.index).toBe('0');
    for (const row of same) expect(JSON.stringify(row.left)).toBe(JSON.stringify(row.right));
    // 追加された要素の行は実際の index のまま
    expect(rows.find((row) => row.type === 'added').right.index).toBe('1');
  });

  it('相対順位が変わった要素の changed 行は、実際の index のまま', () => {
    const rows = compare(named([['A', 0], ['B', 1], ['C', 2], ['D', 3]]), named([['A', 0], ['X', 1], ['C', 2], ['B', 3], ['D', 4]]), true);
    const changed = rows.filter((row) => row.type === 'changed');
    expect(changed.map((row) => [row.path, row.left, row.right])).toEqual([['viewSettings.views.B.index', '1', '3']]);
    expect(rows.filter((row) => row.type === 'same').every((row) => JSON.stringify(row.left) === JSON.stringify(row.right))).toBe(true);
  });

  it('セクション全体が同一のときの同一行は実際の値（順位に書き換えない）。左右で違うなら出さない', () => {
    const identical = compare(named([['A', 5], ['B', 9]]), named([['A', 5], ['B', 9]]), true);
    expect(identical).toHaveLength(1);
    expect(identical[0].path).toBe('viewSettings');
    expect(identical[0].left.views.B.index).toBe('9');
    expect(identical[0].right.views.B.index).toBe('9');
    // 順位は同じだが index の値が違う（間が空いている）。差は無く、「同一」の値が食い違うので同一行も出さない
    expect(compare(named([['A', 0], ['B', 1]]), named([['A', 0], ['B', 3]]), true)).toEqual([]);
    expect(compare(named([['A', 0], ['B', 1]]), named([['A', 0], ['B', 3]]), false)).toEqual([]);
  });

  it('名前に「.」を含む要素でも、同一行の値を取り違えない', () => {
    const dotted: [string, number][] = [['A', 3], ['A.b', 7], ['Z', 9]];
    const rows = compare(named(dotted), named(dotted), true);
    expect(rows.map((row) => row.path)).toEqual(['viewSettings']);
    expect(rows[0].left.views['A.b'].index).toBe('7');
    // 途中への追加の後も、実際の値が一致する要素だけを出す
    const after = compare(named([['A', 0], ['A.b', 1], ['Z', 2]]), named([['A', 0], ['N', 1], ['A.b', 2], ['Z', 3]]), true);
    expect(after.filter((row) => row.type === 'same').map((row) => row.path)).toEqual(['viewSettings.views.A']);
    expect(withoutSame(after).map((row) => row.path)).toEqual(['viewSettings.views.N']);
  });
});
