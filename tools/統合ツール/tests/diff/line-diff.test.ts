import { describe, expect, it } from 'vitest';
import {
  LINE_DIFF_MAX_EDITS,
  computeLineDiff,
  foldLineDiffRows,
  splitDiffLines,
  type LineDiffRow
} from '../../src/diff/line-diff';

const types = (rows: readonly LineDiffRow[]) => rows.map((row) => row.type).join(',');

/** 行の列から、比較元・比較先の行を組み立て直す。 */
function rebuild(rows: readonly LineDiffRow[]) {
  const left: string[] = [];
  const right: string[] = [];
  for (const row of rows) {
    if (row.type !== 'add') left.push(row.left as string);
    if (row.type !== 'del') right.push(row.right as string);
  }
  return { left, right };
}

/** 表を使う素朴な最長共通部分列の長さ（結果の照合用）。 */
function lcsLength(a: string[], b: string[]): number {
  const table = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      table[i][j] = a[i - 1] === b[j - 1] ? table[i - 1][j - 1] + 1 : Math.max(table[i - 1][j], table[i][j - 1]);
    }
  }
  return table[a.length][b.length];
}

describe('diff/line-diff 行単位の差分', () => {
  it('改行コードの種類によらず行に分ける', () => {
    expect(splitDiffLines('a\r\nb\nc\rd')).toEqual(['a', 'b', 'c', 'd']);
    expect(splitDiffLines('')).toEqual(['']);
  });

  it('同じ内容は変更なしの行だけを返す', () => {
    const result = computeLineDiff('a\nb\nc', 'a\nb\nc')!;
    expect(types(result.rows)).toBe('same,same,same');
    expect(result).toMatchObject({ removed: 0, added: 0, leftLines: 3, rightLines: 3, newlineOnly: false });
  });

  it('1行の書き換えを置き換えとして返し、行番号を付ける', () => {
    const result = computeLineDiff('const a = 1;\nconst b = 2;\nconst c = 3;', 'const a = 1;\nconst b = 20;\nconst c = 3;')!;
    expect(types(result.rows)).toBe('same,replace,same');
    expect(result.rows[1]).toEqual({
      type: 'replace', left: 'const b = 2;', right: 'const b = 20;', leftNo: 2, rightNo: 2, similar: true
    });
    expect(result).toMatchObject({ removed: 1, added: 1 });
  });

  it('行の追加と削除を、行番号をずらして返す', () => {
    const added = computeLineDiff('a\nc', 'a\nb\nc')!;
    expect(added.rows).toEqual([
      { type: 'same', left: 'a', right: 'a', leftNo: 1, rightNo: 1 },
      { type: 'add', right: 'b', rightNo: 2 },
      { type: 'same', left: 'c', right: 'c', leftNo: 2, rightNo: 3 }
    ]);
    expect(added).toMatchObject({ removed: 0, added: 1, leftLines: 2, rightLines: 3 });

    const removed = computeLineDiff('a\nb\nc', 'a\nc')!;
    expect(removed.rows[1]).toEqual({ type: 'del', left: 'b', leftNo: 2 });
    expect(removed).toMatchObject({ removed: 1, added: 0 });
  });

  it('連続する削除と追加は上から組にし、余りを削除または追加にする', () => {
    const result = computeLineDiff('head\nx1\nx2\nx3\ntail', 'head\ny1\ntail')!;
    expect(types(result.rows)).toBe('same,replace,del,del,same');
    expect(result).toMatchObject({ removed: 3, added: 1 });
    const more = computeLineDiff('head\nx1\ntail', 'head\ny1\ny2\ntail')!;
    expect(types(more.rows)).toBe('same,replace,add,same');
  });

  it('似ていない行の置き換えには、文字単位の強調を使わせない', () => {
    const result = computeLineDiff('    "code": "priority",', '    "label": "優先度",')!;
    expect(result.rows[0]).toMatchObject({ type: 'replace', similar: false });
    const similar = computeLineDiff('  "width": "300"', '  "width": "360"')!;
    expect(similar.rows[0]).toMatchObject({ type: 'replace', similar: true });
  });

  it('改行コードだけの違いを区別する', () => {
    const result = computeLineDiff('a\r\nb\r\n', 'a\nb\n')!;
    expect(result).toMatchObject({ removed: 0, added: 0, newlineOnly: true });
    expect(computeLineDiff('a\nb', 'a\nb')!.newlineOnly).toBe(false);
  });

  it('末尾の改行の有無は、空行の追加・削除として示す', () => {
    const result = computeLineDiff('a\n', 'a')!;
    expect(result.rows).toEqual([
      { type: 'same', left: 'a', right: 'a', leftNo: 1, rightNo: 1 },
      { type: 'del', left: '', leftNo: 2 }
    ]);
  });

  it('行数が多くても、違いが少なければ行単位で比べる', () => {
    const base = Array.from({ length: 6000 }, (_value, index) => `line ${index}`);
    const edited = base.slice();
    edited[3] = 'version 2';
    edited.splice(3000, 0, 'inserted');
    edited[5990] = 'footer changed';
    const result = computeLineDiff(base.join('\n'), edited.join('\n'))!;
    expect(result).toMatchObject({ removed: 2, added: 3, leftLines: 6000, rightLines: 6001 });
    expect(rebuild(result.rows)).toEqual({ left: base, right: edited });
    expect(result.rows.filter((row) => row.type !== 'same').map((row) => [row.type, row.leftNo, row.rightNo])).toEqual([
      ['replace', 4, 4],
      ['add', undefined, 3001],
      ['replace', 5990, 5991]
    ]);
  });

  it('違いが上限を超えるときは null を返す', () => {
    const left = Array.from({ length: 40 }, (_value, index) => `a${index}`).join('\n');
    const right = Array.from({ length: 40 }, (_value, index) => `b${index}`).join('\n');
    expect(computeLineDiff(left, right, { maxEdits: 79 })).toBeNull();
    expect(computeLineDiff(left, right, { maxEdits: 80 })).toMatchObject({ removed: 40, added: 40 });
    expect(LINE_DIFF_MAX_EDITS).toBeGreaterThanOrEqual(1000);
  });

  it('乱数で作った入力でも、元の行を復元でき、編集数が最小になる', () => {
    let seed = 20261110;
    const random = (limit: number) => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed % limit;
    };
    for (let round = 0; round < 300; round++) {
      const makeLines = () => Array.from({ length: random(14) }, () => `v${random(5)}`);
      const left = makeLines();
      const right = makeLines();
      const result = computeLineDiff(left.join('\n'), right.join('\n'))!;
      // 空の列は join すると 1 行の空文字になる
      const expectedLeft = left.length ? left : [''];
      const expectedRight = right.length ? right : [''];
      expect(rebuild(result.rows)).toEqual({ left: expectedLeft, right: expectedRight });
      const common = lcsLength(expectedLeft, expectedRight);
      expect(result.removed).toBe(expectedLeft.length - common);
      expect(result.added).toBe(expectedRight.length - common);
      let leftNo = 0;
      let rightNo = 0;
      for (const row of result.rows) {
        if (row.type !== 'add') expect(row.leftNo).toBe(++leftNo);
        if (row.type !== 'del') expect(row.rightNo).toBe(++rightNo);
        if (row.type === 'same') expect(row.left).toBe(row.right);
        if (row.type === 'replace') expect(row.left).not.toBe(row.right);
      }
    }
  });
});

describe('diff/line-diff 変更のない行の省略', () => {
  const lines = (count: number) => Array.from({ length: count }, (_value, index) => `l${index + 1}`);

  it('違う行の前後だけを残し、間の行数を示す', () => {
    const base = lines(20);
    const edited = base.slice();
    edited[9] = 'changed';
    const segments = foldLineDiffRows(computeLineDiff(base.join('\n'), edited.join('\n'))!.rows, 2);
    expect(segments.map((segment) => segment.kind === 'skip' ? `skip:${segment.count}` : `rows:${segment.rows.length}`))
      .toEqual(['skip:7', 'rows:5', 'skip:8']);
    const visible = segments.flatMap((segment) => segment.kind === 'rows' ? segment.rows : []);
    expect(visible.map((row) => row.leftNo)).toEqual([8, 9, 10, 11, 12]);
  });

  it('1行だけの省略はせず、そのまま残す', () => {
    const base = lines(7);
    const edited = base.slice();
    edited[0] = 'first';
    edited[6] = 'last';
    // 前後 2 行を残すと、間の 1 行（4 行目）だけが省略の対象になる
    const segments = foldLineDiffRows(computeLineDiff(base.join('\n'), edited.join('\n'))!.rows, 2);
    expect(segments).toHaveLength(1);
    expect(segments[0]).toMatchObject({ kind: 'rows' });
    expect((segments[0] as { rows: LineDiffRow[] }).rows).toHaveLength(7);
  });

  it('違う行が無ければ全体を 1 つの省略にする', () => {
    const rows = computeLineDiff('a\nb\nc', 'a\nb\nc')!.rows;
    expect(foldLineDiffRows(rows)).toEqual([{ kind: 'skip', count: 3 }]);
    expect(foldLineDiffRows([])).toEqual([]);
  });
});
