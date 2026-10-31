'use strict';

import { hasKintoneOrderByClause, hasKintonePagingClause } from '../kintone-query.js';

/**
 * レコード一括取得・CSV・ZIP 命名の純粋ヘルパー。
 * 旧統合 UI（tabs/record.ts）と lite 版（tabs/record-standalone.ts）の両方から参照する。
 * DOM や kintone API に依存しないので、そのまま vitest で回帰固定できる。
 */

/** kintone REST の records.json が 1 リクエストで返せる最大件数 */
export const RECORDS_FETCH_LIMIT = 500;
/** 一括登録・更新・ステータス変更の 1 リクエストあたり最大件数 */
export const RECORDS_WRITE_CHUNK = 100;

export function hasOrderByClause(query: unknown): boolean {
  return hasKintoneOrderByClause(query);
}

export function hasPagingClause(query: unknown): boolean {
  return hasKintonePagingClause(query);
}

const PAGING_CONFLICT_MESSAGE =
  'クエリ内の limit/offset はページング動作と競合します。limit/offset を取り除いて再実行してください。';

export function buildPagedRecordsQuery(
  query: unknown,
  offset: unknown,
  options: { includeOrder?: boolean; limit?: number } = {}
): string {
  const base = String(query || '').trim();
  if (hasPagingClause(base)) throw new Error(PAGING_CONFLICT_MESSAGE);
  const parts: string[] = [];
  if (base) parts.push(base);
  if (options.includeOrder !== false && !hasOrderByClause(base)) parts.push('order by $id asc');
  parts.push(`limit ${Number(options.limit || RECORDS_FETCH_LIMIT)}`);
  parts.push(`offset ${Number(offset || 0)}`);
  return parts.join(' ');
}

/**
 * $id シークによるページングクエリ。利用者クエリが独自の order by を持つ場合は
 * $id 順に並べ替えられないため null を返す（呼び出し側は cursor API へ切り替える）。
 */
export function buildKeysetRecordsQuery(query: unknown, lastRecordId: unknown, limit: unknown = RECORDS_FETCH_LIMIT): string | null {
  const base = String(query || '').trim();
  if (hasPagingClause(base)) throw new Error(PAGING_CONFLICT_MESSAGE);
  const idCond = `$id > ${Number(lastRecordId || 0)}`;
  const lim = Number(limit || RECORDS_FETCH_LIMIT);
  if (!base) return `${idCond} order by $id asc limit ${lim}`;
  if (hasOrderByClause(base)) return null;
  return `(${base}) and ${idCond} order by $id asc limit ${lim}`;
}

/**
 * cursor API へ渡すクエリ。limit/offset は cursor 側の size で制御するため禁止。
 * order by は利用者指定をそのまま尊重する。
 */
export function buildCursorRecordsQuery(query: unknown): string {
  const base = String(query || '').trim();
  if (hasPagingClause(base)) throw new Error(PAGING_CONFLICT_MESSAGE);
  return base;
}

export function csvEscape(val: unknown): string {
  const s = String(val == null ? '' : val);
  return (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r'))
    ? '"' + s.replace(/"/g, '""') + '"'
    : s;
}

const CSV_FORMULA_RE = /^[\s\uFEFF]*[=+\-@]/;
const CSV_CONTROL_RE = /^[\t\r\n]/;
const CSV_NUMERIC_RE = /^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/;

/**
 * Excel の数式実行を防ぐため、= + - @ やタブ・CR・LF で始まる文字列の先頭に
 * アポストロフィを付ける。ただし値全体が数値として読める場合は無害化しない。
 * （負の数値フィールドにアポストロフィが付くと集計用データが壊れるため）
 */
export function neutralizeCsvFormula(text: string): string {
  if (CSV_NUMERIC_RE.test(text)) return text;
  if (CSV_FORMULA_RE.test(text) || CSV_CONTROL_RE.test(text)) return "'" + text;
  return text;
}

export function extractRecordCsvValue(rec: any, code: string): string {
  const f = rec?.[code];
  if (!f) return '';
  const type = String(f.type || '');
  if (type === 'USER_SELECT' || type === 'ORGANIZATION_SELECT' || type === 'GROUP_SELECT' || type === 'STATUS_ASSIGNEE') {
    return (Array.isArray(f.value) ? f.value : []).map((v: any) => v?.code || v?.name || '').join(',');
  }
  // 作成者・更新者は配列ではなく {code, name} 1件で返る。JSON 文字列のまま出力しない。
  if (type === 'CREATOR' || type === 'MODIFIER') return f.value?.code || f.value?.name || '';
  if (type === 'CHECK_BOX' || type === 'MULTI_SELECT' || type === 'CATEGORY') return (Array.isArray(f.value) ? f.value : []).join(',');
  if (type === 'FILE') return (Array.isArray(f.value) ? f.value : []).map((file: any) => file?.name || '').join(',');
  if (type === 'SUBTABLE') return `${(Array.isArray(f.value) ? f.value : []).length}行`;
  if (typeof f.value === 'object' && f.value !== null) return JSON.stringify(f.value);
  return f.value == null ? '' : String(f.value);
}

export interface BuildRecordsCsvOptions {
  headers?: string[];
  lineEnding?: '\n' | '\r\n';
  neutralizeFormula?: boolean;
}

/** BOM 付き UTF-8 の CSV テキスト。Excel でそのまま開ける。 */
export function buildRecordsCsvText(records: any[], propKeys: string[], options?: BuildRecordsCsvOptions): string {
  const headers = Array.isArray(options?.headers) && options.headers.length === propKeys.length ? options.headers : propKeys;
  const lineEnding = options?.lineEnding === '\r\n' ? '\r\n' : '\n';
  const neutralize = options?.neutralizeFormula !== false;
  const norm = (val: string) => (neutralize ? neutralizeCsvFormula(val) : val);
  const lines = [headers.map((h) => csvEscape(norm(h))).join(',')];
  for (const rec of records) lines.push(propKeys.map((k) => csvEscape(norm(extractRecordCsvValue(rec, k)))).join(','));
  return '\uFEFF' + lines.join(lineEnding);
}

export function sanitizeZipSegment(value: unknown, fallback = 'item'): string {
  const cleaned = String(value == null ? '' : value)
    .replace(/[\\/:*?"<>|]/g, '_')
    .replace(/[\u0000-\u001f\u007f\u200e\u200f\u202a-\u202e\u2066-\u2069]/g, '')
    .trim();
  return !cleaned || /^\.+$/.test(cleaned) ? fallback : cleaned;
}

/** ZIP 内で衝突しないファイル名を払い出す（fileKey 先頭 12 文字を接頭辞にする）。 */
export function uniqueZipName(used: Set<string>, raw: string, fileKey: string, idx: number): string {
  const safeName = sanitizeZipSegment(raw || 'file.bin', 'file.bin');
  const safePrefix = sanitizeZipSegment(String(fileKey || '').slice(0, 12) || String(idx + 1), 'file');
  return uniqueZipEntryName(used, `${safePrefix}_${safeName}`);
}

/** 既存名と衝突する場合に `_2`, `_3` … を拡張子の前へ付けて一意化する。 */
export function uniqueZipEntryName(used: Set<string>, base: string): string {
  let cand = base;
  let n = 2;
  while (used.has(cand)) {
    const dot = base.lastIndexOf('.');
    cand = dot > 0 ? `${base.slice(0, dot)}_${n}${base.slice(dot)}` : `${base}_${n}`;
    n++;
  }
  used.add(cand);
  return cand;
}

export interface BatchWriteFailure {
  /** 失敗したチャンク以前に確定した件数 */
  done: number;
  /** 失敗したチャンクの先頭（1 始まり） */
  from: number;
  /** 失敗したチャンクの末尾（1 始まり） */
  to: number;
  total: number;
}

const RECORD_ERROR_DETAIL_LIMIT = 10;

/**
 * kintone のレコード登録・更新エラー（`errors: { "records[3].title.value": { messages } }`）から、
 * どのレコードのどのフィールドが原因かを取り出す。一括リクエストは全体が取り消されるため、
 * この詳細が無いと利用者は 100 件のどれが不正か分からない。
 * @param offset 失敗したチャンク先頭の、全体での 0 始まり位置
 * @param describeItem 全体での 0 始まり位置を利用者向けの呼び名（CSV の行番号など）にする
 */
export function describeKintoneRecordErrors(
  error: unknown,
  offset = 0,
  describeItem: (index: number) => string = (index) => `${index + 1}件目`
): string[] {
  let errors: any = null;
  for (let current: any = error, depth = 0; current && typeof current === 'object' && depth < 5; current = current.original, depth++) {
    if (current.errors && typeof current.errors === 'object' && !Array.isArray(current.errors)) { errors = current.errors; break; }
  }
  const lines = Object.entries(errors || {}).map(([key, value]: [string, any]) => {
    const messages = Array.isArray(value?.messages) ? value.messages : typeof value === 'string' ? [value] : [];
    const matched = /^records\[(\d+)\]\.?(.*)$/.exec(key);
    const where = matched ? [describeItem(offset + Number(matched[1])), matched[2].replace(/\.value$/, '')].filter(Boolean).join('・') : key;
    return `${where}: ${messages.map(String).join(' / ') || '(詳細なし)'}`;
  });
  return lines.length > RECORD_ERROR_DETAIL_LIMIT
    ? [...lines.slice(0, RECORD_ERROR_DETAIL_LIMIT), `ほか ${lines.length - RECORD_ERROR_DETAIL_LIMIT}件のエラー`]
    : lines;
}

/**
 * 100 件単位の書き込みが途中で失敗したとき、どこまで確定しどこから未処理かを
 * 利用者に伝えるメッセージ。部分成功を隠さない。
 */
export function describeBatchWriteFailure(label: string, failure: BatchWriteFailure, error: unknown, details: string[] = []): string {
  const reason = error instanceof Error ? error.message : String(error ?? '');
  const remaining = Math.max(0, failure.total - failure.done);
  return [
    `${label}が途中で失敗しました。`,
    `確定済み: ${failure.done}件 / 失敗チャンク: ${failure.from}～${failure.to}件目 / 未処理: ${remaining}件（全${failure.total}件）`,
    reason ? `原因: ${reason}` : '',
    ...(details.length ? ['エラーの詳細（このチャンクは全体が取り消されています）:', ...details] : [])
  ].filter(Boolean).join('\n');
}

/**
 * 100 件ずつ順に書き込み、失敗時は確定件数付きのエラーにして再送出する。
 * @returns 書き込んだ件数
 */
export async function writeInChunks<T>(
  items: T[],
  label: string,
  writeChunk: (chunk: T[], chunkIndex: number) => Promise<void>,
  onProgress?: (done: number, total: number) => void,
  chunkSize: number = RECORDS_WRITE_CHUNK,
  describeItem?: (index: number) => string
): Promise<number> {
  const size = Math.max(1, Math.floor(chunkSize) || RECORDS_WRITE_CHUNK);
  let done = 0;
  for (let i = 0; i < items.length; i += size) {
    const chunk = items.slice(i, i + size);
    try {
      await writeChunk(chunk, Math.floor(i / size));
    } catch (error) {
      const details = describeKintoneRecordErrors(error, i, describeItem);
      const wrapped = new Error(describeBatchWriteFailure(label, { done, from: i + 1, to: i + chunk.length, total: items.length }, error, details));
      (wrapped as any).partial = { done, from: i + 1, to: i + chunk.length, total: items.length };
      (wrapped as any).original = error;
      throw wrapped;
    }
    done += chunk.length;
    if (onProgress) onProgress(done, items.length);
  }
  return done;
}
