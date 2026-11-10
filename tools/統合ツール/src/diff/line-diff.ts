'use strict';

/**
 * 行単位の差分（差分比較パネルの明細で、複数行の値の「どの行が違うか」を示す）。
 *
 * JS/CSS の本文のように行数が多く、違いが数行だけの値を想定し、違いの行数に比例して計算する
 * （Myers の差分。行数の積に比例する表は作らない）。違いが多すぎるときは null を返し、
 * 呼び出し側は値の全文を左右に並べる表示へ戻す。
 */

/** 追加と削除を合わせた行数の上限。超えると行単位の対応付けをやめる。 */
export const LINE_DIFF_MAX_EDITS = 1500;
/** 違う行の前後に残す、変更のない行の数。 */
export const LINE_DIFF_CONTEXT_LINES = 2;
/** 置き換えの行で、文字単位の強調を使う類似度の下限（行頭の空白を除いた共通の先頭・末尾の割合）。 */
const SIMILAR_LINE_RATIO = 0.5;

export type LineDiffRowType = 'same' | 'replace' | 'del' | 'add';

export interface LineDiffRow {
  type: LineDiffRowType;
  /** 比較元の行（add には無い） */
  left?: string;
  /** 比較先の行（del には無い） */
  right?: string;
  /** 1 始まりの行番号 */
  leftNo?: number;
  rightNo?: number;
  /** replace の 2 行が似ている（文字単位の強調で違いを示せる） */
  similar?: boolean;
}

export interface LineDiffResult {
  rows: LineDiffRow[];
  /** 比較元から無くなった行数（置き換えを含む） */
  removed: number;
  /** 比較先で増えた行数（置き換えを含む） */
  added: number;
  leftLines: number;
  rightLines: number;
  /** 行の内容は同じで、改行コード（CRLF / LF）だけが違う */
  newlineOnly: boolean;
}

export type LineDiffSegment =
  | { kind: 'rows'; rows: LineDiffRow[] }
  | { kind: 'skip'; count: number };

/** 改行コードの種類によらず行に分ける。 */
export function splitDiffLines(text: string): string[] {
  return String(text ?? '').split(/\r\n|\r|\n/);
}

const OP_SAME = 0;
const OP_DEL = 1;
const OP_ADD = 2;

/**
 * 最短の編集手順（Myers）。a・b は行を整数にした列。編集数が maxEdits を超えるなら null。
 * 戻り値は先頭からの操作列（OP_SAME / OP_DEL / OP_ADD）。
 */
function shortestEditScript(a: Int32Array, b: Int32Array, maxEdits: number): Uint8Array | null {
  const n = a.length;
  const m = b.length;
  const max = Math.min(n + m, Math.max(0, maxEdits));
  const furthest = new Int32Array(2 * max + 2);
  const trace: Int32Array[] = [];
  let found = -1;
  for (let d = 0; d <= max && found < 0; d++) {
    // d 回目を始める前の状態（d-1 回目の結果）を残す。添字は k + d。
    trace.push(furthest.slice(max - d, max + d + 1));
    for (let k = -d; k <= d; k += 2) {
      let x: number;
      if (k === -d || (k !== d && furthest[max + k - 1] < furthest[max + k + 1])) x = furthest[max + k + 1];
      else x = furthest[max + k - 1] + 1;
      let y = x - k;
      while (x < n && y < m && a[x] === b[y]) { x += 1; y += 1; }
      furthest[max + k] = x;
      if (x >= n && y >= m) { found = d; break; }
    }
  }
  if (found < 0) return null;

  const reversed = new Uint8Array(n + m);
  let length = 0;
  let x = n;
  let y = m;
  for (let d = found; d > 0; d--) {
    const before = trace[d];
    const k = x - y;
    const down = k === -d || (k !== d && before[k - 1 + d] < before[k + 1 + d]);
    const prevK = down ? k + 1 : k - 1;
    const prevX = before[prevK + d];
    const startX = down ? prevX : prevX + 1;
    while (x > startX) { reversed[length++] = OP_SAME; x -= 1; y -= 1; }
    reversed[length++] = down ? OP_ADD : OP_DEL;
    if (down) y -= 1; else x -= 1;
  }
  while (x > 0 && y > 0) { reversed[length++] = OP_SAME; x -= 1; y -= 1; }
  const ops = new Uint8Array(length);
  for (let i = 0; i < length; i++) ops[i] = reversed[length - 1 - i];
  return ops;
}

function linesAreSimilar(left: string, right: string): boolean {
  const a = left.replace(/^\s+/, '');
  const b = right.replace(/^\s+/, '');
  const longer = Math.max(a.length, b.length);
  if (!longer) return false;
  const shorter = Math.min(a.length, b.length);
  let prefix = 0;
  while (prefix < shorter && a.charCodeAt(prefix) === b.charCodeAt(prefix)) prefix += 1;
  let suffix = 0;
  while (suffix < shorter - prefix && a.charCodeAt(a.length - 1 - suffix) === b.charCodeAt(b.length - 1 - suffix)) suffix += 1;
  return (prefix + suffix) / longer >= SIMILAR_LINE_RATIO;
}

/**
 * 2 つの文字列を行単位で比べる。
 * 連続する削除と追加は、上から順に 1 行ずつ組にして「置き換え」（replace）として返す。
 * 追加と削除の合計が maxEdits を超えるときは null（行単位の表示をしない）。
 */
export function computeLineDiff(
  leftText: string,
  rightText: string,
  options: { maxEdits?: number } = {}
): LineDiffResult | null {
  const left = splitDiffLines(leftText);
  const right = splitDiffLines(rightText);
  const maxEdits = options.maxEdits ?? LINE_DIFF_MAX_EDITS;

  // 先頭と末尾の同じ行は、対応付けの対象から外す（大きな値でも違いの周辺だけを計算する）。
  let head = 0;
  const shortest = Math.min(left.length, right.length);
  while (head < shortest && left[head] === right[head]) head += 1;
  let tail = 0;
  while (tail < shortest - head && left[left.length - 1 - tail] === right[right.length - 1 - tail]) tail += 1;

  const ids = new Map<string, number>();
  const idOf = (line: string) => {
    let id = ids.get(line);
    if (id === undefined) { id = ids.size; ids.set(line, id); }
    return id;
  };
  const middleLeft = new Int32Array(left.length - head - tail);
  const middleRight = new Int32Array(right.length - head - tail);
  for (let i = 0; i < middleLeft.length; i++) middleLeft[i] = idOf(left[head + i]);
  for (let i = 0; i < middleRight.length; i++) middleRight[i] = idOf(right[head + i]);
  const ops = shortestEditScript(middleLeft, middleRight, maxEdits);
  if (!ops) return null;

  const rows: LineDiffRow[] = [];
  let removed = 0;
  let added = 0;
  let li = 0;
  let ri = 0;
  const pushSame = () => {
    rows.push({ type: 'same', left: left[li], right: right[ri], leftNo: li + 1, rightNo: ri + 1 });
    li += 1;
    ri += 1;
  };
  for (let i = 0; i < head; i++) pushSame();
  let index = 0;
  while (index < ops.length) {
    if (ops[index] === OP_SAME) { pushSame(); index += 1; continue; }
    let dels = 0;
    let adds = 0;
    while (index < ops.length && ops[index] !== OP_SAME) {
      if (ops[index] === OP_DEL) dels += 1; else adds += 1;
      index += 1;
    }
    const pairs = Math.min(dels, adds);
    for (let p = 0; p < pairs; p++) {
      rows.push({
        type: 'replace',
        left: left[li + p],
        right: right[ri + p],
        leftNo: li + p + 1,
        rightNo: ri + p + 1,
        similar: linesAreSimilar(left[li + p], right[ri + p])
      });
    }
    for (let p = pairs; p < dels; p++) rows.push({ type: 'del', left: left[li + p], leftNo: li + p + 1 });
    for (let p = pairs; p < adds; p++) rows.push({ type: 'add', right: right[ri + p], rightNo: ri + p + 1 });
    li += dels;
    ri += adds;
    removed += dels;
    added += adds;
  }
  for (let i = 0; i < tail; i++) pushSame();

  return {
    rows,
    removed,
    added,
    leftLines: left.length,
    rightLines: right.length,
    newlineOnly: removed === 0 && added === 0 && String(leftText ?? '') !== String(rightText ?? '')
  };
}

/**
 * 変更のない行の続きを、違う行の前後 context 行だけ残して省略する。
 * 省略が 1 行だけになる箇所は、省略の印と同じ高さになるためそのまま残す。
 */
export function foldLineDiffRows(rows: readonly LineDiffRow[], context = LINE_DIFF_CONTEXT_LINES): LineDiffSegment[] {
  const keep = new Uint8Array(rows.length);
  const span = Math.max(0, context);
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].type === 'same') continue;
    const from = Math.max(0, i - span);
    const to = Math.min(rows.length - 1, i + span);
    for (let j = from; j <= to; j++) keep[j] = 1;
  }
  const segments: LineDiffSegment[] = [];
  let visible: LineDiffRow[] = [];
  const flush = () => {
    if (visible.length) segments.push({ kind: 'rows', rows: visible });
    visible = [];
  };
  let i = 0;
  while (i < rows.length) {
    if (keep[i]) { visible.push(rows[i]); i += 1; continue; }
    let end = i;
    while (end < rows.length && !keep[end]) end += 1;
    const count = end - i;
    if (count === 1) {
      visible.push(rows[i]);
    } else {
      flush();
      segments.push({ kind: 'skip', count });
    }
    i = end;
  }
  flush();
  return segments;
}
