'use strict';

/**
 * レコード一括取得・CSV・ZIP 命名の純粋ヘルパー。
 * 旧統合 UI（tabs/record.ts）と lite 版（tabs/record-standalone.ts）の両方から参照する。
 * DOM や kintone API に依存しないので、そのまま vitest で回帰固定できる。
 */

/** kintone REST の records.json が 1 リクエストで返せる最大件数 */
export const RECORDS_FETCH_LIMIT = 500;
/** offset ページングが kintone 側で拒否される上限（これ以降は cursor API か $id シークが必要） */
export const RECORDS_OFFSET_LIMIT = 10000;
/** 一括登録・更新・ステータス変更の 1 リクエストあたり最大件数 */
export const RECORDS_WRITE_CHUNK = 100;

export function hasOrderByClause(query: unknown): boolean {
  return /\border\s+by\b/i.test(String(query || ''));
}

export function hasPagingClause(query: unknown): boolean {
  const text = String(query || '');
  return /\blimit\s+\d+/i.test(text) || /\boffset\s+\d+/i.test(text);
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

export function extractRecordCsvValue(rec: any, code: string): string {
  const f = rec?.[code];
  if (!f) return '';
  const type = String(f.type || '');
  if (type === 'USER_SELECT' || type === 'ORGANIZATION_SELECT' || type === 'GROUP_SELECT') {
    return (Array.isArray(f.value) ? f.value : []).map((v: any) => v?.code || v?.name || '').join(',');
  }
  if (type === 'CHECK_BOX' || type === 'MULTI_SELECT') return (Array.isArray(f.value) ? f.value : []).join(',');
  if (type === 'FILE') return (Array.isArray(f.value) ? f.value : []).map((file: any) => file?.name || '').join(',');
  if (type === 'SUBTABLE') return `${(Array.isArray(f.value) ? f.value : []).length}行`;
  if (typeof f.value === 'object' && f.value !== null) return JSON.stringify(f.value);
  return f.value == null ? '' : String(f.value);
}

/** BOM 付き UTF-8 の CSV テキスト。Excel でそのまま開ける。 */
export function buildRecordsCsvText(records: any[], propKeys: string[]): string {
  const lines = [propKeys.map(csvEscape).join(',')];
  for (const rec of records) lines.push(propKeys.map((k) => csvEscape(extractRecordCsvValue(rec, k))).join(','));
  return '\uFEFF' + lines.join('\n');
}

export function sanitizeZipSegment(value: unknown, fallback = 'item'): string {
  const cleaned = String(value == null ? '' : value)
    .replace(/[\\/:*?"<>|]/g, '_')
    .replace(/[\u0000-\u001f]/g, '')
    .trim();
  return cleaned || fallback;
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

/**
 * 100 件単位の書き込みが途中で失敗したとき、どこまで確定しどこから未処理かを
 * 利用者に伝えるメッセージ。部分成功を隠さない。
 */
export function describeBatchWriteFailure(label: string, failure: BatchWriteFailure, error: unknown): string {
  const reason = error instanceof Error ? error.message : String(error ?? '');
  const remaining = Math.max(0, failure.total - failure.done);
  return [
    `${label}が途中で失敗しました。`,
    `確定済み: ${failure.done}件 / 失敗チャンク: ${failure.from}～${failure.to}件目 / 未処理: ${remaining}件（全${failure.total}件）`,
    reason ? `原因: ${reason}` : ''
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
  chunkSize: number = RECORDS_WRITE_CHUNK
): Promise<number> {
  const size = Math.max(1, Math.floor(chunkSize) || RECORDS_WRITE_CHUNK);
  let done = 0;
  for (let i = 0; i < items.length; i += size) {
    const chunk = items.slice(i, i + size);
    try {
      await writeChunk(chunk, Math.floor(i / size));
    } catch (error) {
      const wrapped = new Error(describeBatchWriteFailure(label, { done, from: i + 1, to: i + chunk.length, total: items.length }, error));
      (wrapped as any).partial = { done, from: i + 1, to: i + chunk.length, total: items.length };
      (wrapped as any).original = error;
      throw wrapped;
    }
    done += chunk.length;
    if (onProgress) onProgress(done, items.length);
  }
  return done;
}
