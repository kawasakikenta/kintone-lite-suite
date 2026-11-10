'use strict';

import { CRC32_INITIAL, crc32Finish, crc32Update } from './crc32.js';

/**
 * ZIP 作成の自前実装（JSZip 互換の最小限の API）。
 *
 * 各ツールが使う `new LiteZip()`・`file()`・`folder()`・`remove()`・`generateAsync({ type: 'blob' })` だけを持つ。
 * 外部ライブラリを読み込まず、通信もしない。
 *
 * - ファイル名は UTF-8（汎用フラグ bit 11）。日本語名でも Windows・macOS・unzip・Python で文字化けしない。
 * - 圧縮は `CompressionStream('deflate-raw')` があれば DEFLATE、無ければ STORE。縮まないものは STORE のまま入れる。
 * - 全体を 1 つの `Uint8Array` に連結せず、`Blob` の部品のまま組み立てる。読み出しは 1 エントリずつ。
 * - classic ZIP の上限（1 エントリ・全体とも 4GB 未満、65,535 件）を超える場合は、壊れた ZIP を作らず `ZipLimitError` にする。
 */

export type LiteZipData = string | Blob | ArrayBuffer | ArrayBufferView | ArrayLike<number>;

export interface LiteZipGenerateOptions {
  /** 出力形式。Blob だけ対応する。 */
  type?: 'blob';
  mimeType?: string;
  /** 'STORE' を指定すると圧縮しない。既定は使えるときだけ DEFLATE。 */
  compression?: 'DEFLATE' | 'STORE';
  /** 全エントリの更新日時。省略時は各エントリを追加した時刻。 */
  modifiedAt?: Date;
}

/** classic ZIP の上限を超えたときのエラー。メッセージは利用者にそのまま見せられる文にする。 */
export class ZipLimitError extends RangeError {
  constructor(message: string) {
    super(message);
    this.name = 'ZipLimitError';
  }
}

export const LITE_ZIP_MAX_ENTRIES = 0xffff;
/** 1 エントリの大きさ・全体の大きさ・各位置の上限。0xffffffff は ZIP64 の印と読まれるため含めない。 */
export const LITE_ZIP_MAX_BYTES = 0xfffffffe;

const LOCAL_HEADER_SIZE = 30;
const CENTRAL_HEADER_SIZE = 46;
const END_RECORD_SIZE = 22;
const FLAG_UTF8_NAME = 0x0800;
const METHOD_STORE = 0;
const METHOD_DEFLATE = 8;
const DEFAULT_MIME_TYPE = 'application/zip';

/** 縮まない形式。試しに圧縮して時間を使わない。 */
const INCOMPRESSIBLE_EXTENSIONS = new Set([
  'zip', 'gz', 'tgz', 'bz2', 'xz', '7z', 'rar', 'jar', 'xlsx', 'xlsm', 'docx', 'pptx', 'odt', 'ods',
  'jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'avif', 'mp3', 'm4a', 'aac', 'ogg', 'mp4', 'm4v', 'mov', 'webm', 'mkv', 'avi'
]);

interface ZipEntry {
  name: string;
  isFolder: boolean;
  bytes: Uint8Array | null;
  blob: Blob | null;
  size: number;
  modifiedAt: Date;
}

type EntryStore = Map<string, ZipEntry>;

// 読み込み時には作らない（TextEncoder の無い環境でモジュールを評価するだけの検査があるため）
let sharedTextEncoder: TextEncoder | null = null;
const textEncoder = {
  encode(text: string): Uint8Array {
    if (!sharedTextEncoder) sharedTextEncoder = new TextEncoder();
    return sharedTextEncoder.encode(text);
  }
};

function isBlobLike(value: unknown): value is Blob {
  const candidate = value as Blob | null;
  return !!candidate && typeof candidate === 'object'
    && typeof candidate.size === 'number'
    && typeof candidate.slice === 'function'
    && typeof candidate.arrayBuffer === 'function';
}

function toEntryData(name: string, data: unknown): { bytes: Uint8Array | null; blob: Blob | null; size: number } {
  if (typeof data === 'string') {
    const bytes = textEncoder.encode(data);
    return { bytes, blob: null, size: bytes.length };
  }
  if (isBlobLike(data)) return { bytes: null, blob: data, size: data.size };
  if (Object.prototype.toString.call(data) === '[object ArrayBuffer]') {
    const bytes = new Uint8Array(data as ArrayBuffer);
    return { bytes, blob: null, size: bytes.length };
  }
  if (ArrayBuffer.isView(data)) {
    const bytes = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
    return { bytes, blob: null, size: bytes.length };
  }
  if (Array.isArray(data)) {
    const bytes = Uint8Array.from(data as number[]);
    return { bytes, blob: null, size: bytes.length };
  }
  throw new TypeError(`ZIP に入れられない形式のデータです: ${name}`);
}

/** パスを ZIP 内の形（区切りは /、先頭の / や .. は不可）にそろえる。末尾の / は残す。 */
function normalizeEntryName(raw: unknown): string {
  const text = String(raw ?? '').replace(/\\/g, '/');
  if (!text || text.includes('\0')) throw new TypeError('ZIP 内のファイル名が空か、使えない文字を含んでいます');
  if (text.startsWith('/') || /^[A-Za-z]:\//.test(text)) {
    throw new TypeError(`ZIP 内のファイル名は相対パスにしてください: ${text}`);
  }
  const trailingSlash = text.endsWith('/');
  const segments = text.split('/').filter((segment) => segment !== '' && segment !== '.');
  if (segments.some((segment) => segment === '..')) {
    throw new TypeError(`ZIP 内のファイル名に .. は使えません: ${text}`);
  }
  if (!segments.length) throw new TypeError('ZIP 内のファイル名が空です');
  return segments.join('/') + (trailingSlash ? '/' : '');
}

function addFolderEntry(store: EntryStore, folderName: string): void {
  if (store.get(folderName)?.isFolder) return;
  store.set(folderName, { name: folderName, isFolder: true, bytes: null, blob: null, size: 0, modifiedAt: new Date() });
}

/** a/b/c.txt の a/ と a/b/ を、まだ無ければ先に追加する（JSZip と同じ）。 */
function addParentFolders(store: EntryStore, name: string): void {
  const segments = name.replace(/\/$/, '').split('/');
  for (let i = 1; i < segments.length; i += 1) addFolderEntry(store, `${segments.slice(0, i).join('/')}/`);
}

/** file()・folder()・remove() を持つ範囲。ZIP 全体と、folder() が返すサブフォルダで共通。 */
export class LiteZipFolder {
  protected readonly store: EntryStore;
  protected readonly root: string;

  constructor(store: EntryStore, root: string) {
    this.store = store;
    this.root = root;
  }

  /** ファイルを追加する。同じ名前は後から追加したもので置き換える。 */
  file(name: string, data: LiteZipData): this {
    if (data === undefined || data === null) throw new TypeError(`ZIP に入れるデータがありません: ${name}`);
    const fullName = normalizeEntryName(this.root + String(name));
    if (fullName.endsWith('/')) {
      addParentFolders(this.store, fullName);
      addFolderEntry(this.store, fullName);
      return this;
    }
    const entryData = toEntryData(fullName, data);
    addParentFolders(this.store, fullName);
    this.store.set(fullName, { name: fullName, isFolder: false, ...entryData, modifiedAt: new Date() });
    return this;
  }

  /** フォルダを作り（無ければ空のフォルダとして残る）、そのフォルダへ追加できるオブジェクトを返す。 */
  folder(name: string): LiteZipFolder {
    const fullName = normalizeEntryName(`${this.root}${String(name)}/`);
    addParentFolders(this.store, fullName);
    addFolderEntry(this.store, fullName);
    return new LiteZipFolder(this.store, fullName);
  }

  /** ファイルを削除する。フォルダ名なら配下ごと削除する。 */
  remove(name: string): this {
    let fullName = normalizeEntryName(this.root + String(name));
    const exact = this.store.get(fullName);
    if (exact && !exact.isFolder) {
      this.store.delete(fullName);
      return this;
    }
    if (!fullName.endsWith('/')) fullName += '/';
    for (const key of Array.from(this.store.keys())) {
      if (key.startsWith(fullName)) this.store.delete(key);
    }
    return this;
  }
}

let deflateRawSupport: boolean | null = null;

/** このブラウザで `CompressionStream('deflate-raw')` が使えるか。 */
export function isDeflateRawSupported(): boolean {
  if (deflateRawSupport !== null) return deflateRawSupport;
  try {
    deflateRawSupport = typeof CompressionStream === 'function'
      && typeof Response === 'function'
      && typeof Blob.prototype.stream === 'function'
      && !!new CompressionStream('deflate-raw');
  } catch {
    deflateRawSupport = false;
  }
  return deflateRawSupport;
}

function extensionOf(name: string): string {
  const base = name.slice(name.lastIndexOf('/') + 1);
  const dot = base.lastIndexOf('.');
  return dot > 0 ? base.slice(dot + 1).toLowerCase() : '';
}

function shouldTryDeflate(entry: ZipEntry): boolean {
  if (entry.size < 32) return false;
  return !INCOMPRESSIBLE_EXTENSIONS.has(extensionOf(entry.name));
}

async function computeCrc32(entry: ZipEntry): Promise<number> {
  if (entry.bytes) return crc32Finish(crc32Update(CRC32_INITIAL, entry.bytes));
  const blob = entry.blob as Blob;
  let state = CRC32_INITIAL;
  if (typeof blob.stream === 'function') {
    const reader = blob.stream().getReader();
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        state = crc32Update(state, value);
      }
    } finally {
      reader.releaseLock();
    }
  } else {
    state = crc32Update(state, new Uint8Array(await blob.arrayBuffer()));
  }
  return crc32Finish(state);
}

async function deflateRaw(entry: ZipEntry): Promise<Blob> {
  const source = entry.blob || new Blob([entry.bytes as Uint8Array as BlobPart]);
  const compressed = source.stream().pipeThrough(new CompressionStream('deflate-raw'));
  return await new Response(compressed).blob();
}

function dosDateTime(date: Date): { dosDate: number; dosTime: number } {
  const year = date.getFullYear();
  if (!Number.isFinite(year) || year < 1980) return { dosDate: (1 << 5) | 1, dosTime: 0 };
  if (year > 2107) return { dosDate: ((2107 - 1980) << 9) | (12 << 5) | 31, dosTime: (23 << 11) | (59 << 5) | 29 };
  return {
    dosDate: ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
    dosTime: (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2)
  };
}

function formatBytes(bytes: number): string {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1)}GB`;
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1)}MB`;
  return `${Math.ceil(bytes / 1024)}KB`;
}

function entryCountError(count: number): ZipLimitError {
  return new ZipLimitError(`ZIP に入れるファイルとフォルダが ${count.toLocaleString('ja-JP')} 件あり、1 つの ZIP に入る上限（${LITE_ZIP_MAX_ENTRIES.toLocaleString('ja-JP')} 件）を超えています。対象を分けて、もう一度実行してください。`);
}

function sizeError(what: string, bytes: number): ZipLimitError {
  return new ZipLimitError(`${what}が ${formatBytes(bytes)} 以上になるため、ZIP を作成できません（1 つの ZIP とその中の 1 ファイルは 4GB 未満までです）。対象を分けて、もう一度実行してください。`);
}

/** JSZip 互換の最小限の ZIP ビルダー。 */
export class LiteZip extends LiteZipFolder {
  constructor() {
    super(new Map<string, ZipEntry>(), '');
  }

  /** ZIP を Blob として作る。取り込んだ順にエントリを書き、1 エントリずつ読み出す。 */
  async generateAsync(options: LiteZipGenerateOptions = {}): Promise<Blob> {
    if (options.type !== undefined && options.type !== 'blob') {
      throw new TypeError(`ZIP の出力形式 ${String(options.type)} には対応していません`);
    }
    const entries = Array.from(this.store.values());
    if (entries.length > LITE_ZIP_MAX_ENTRIES) throw entryCountError(entries.length);

    const deflateWanted = options.compression !== 'STORE' && isDeflateRawSupported();
    const encoded = entries.map((entry) => {
      const nameBytes = textEncoder.encode(entry.name);
      if (nameBytes.length > 0xffff) {
        throw new ZipLimitError(`ZIP 内のファイル名が長すぎます（${entry.name.slice(0, 40)}…）。名前を短くして、もう一度実行してください。`);
      }
      if (entry.size > LITE_ZIP_MAX_BYTES) throw sizeError(`ファイル「${entry.name}」`, entry.size);
      return nameBytes;
    });
    if (!deflateWanted) {
      // 圧縮できないときは、入れる内容の合計がそのまま ZIP の大きさになる。読み出す前に分かる分は先に止める。
      let total = END_RECORD_SIZE;
      entries.forEach((entry, index) => {
        total += LOCAL_HEADER_SIZE + CENTRAL_HEADER_SIZE + 2 * encoded[index].length + entry.size;
        if (total > LITE_ZIP_MAX_BYTES) throw sizeError('ZIP 全体', total);
      });
    }

    const parts: BlobPart[] = [];
    const central: Uint8Array[] = [];
    let offset = 0;

    for (let index = 0; index < entries.length; index += 1) {
      const entry = entries[index];
      const nameBytes = encoded[index];
      const { dosDate, dosTime } = dosDateTime(options.modifiedAt || entry.modifiedAt);

      let crc = 0;
      let method = METHOD_STORE;
      let compressedSize = entry.size;
      let body: Blob | Uint8Array | null = null;
      if (!entry.isFolder && entry.size > 0) {
        crc = await computeCrc32(entry);
        body = entry.blob || (entry.bytes as Uint8Array);
        if (deflateWanted && shouldTryDeflate(entry)) {
          const compressed = await deflateRaw(entry);
          if (compressed.size < entry.size) {
            method = METHOD_DEFLATE;
            compressedSize = compressed.size;
            body = compressed;
          }
        }
      }

      const local = new Uint8Array(LOCAL_HEADER_SIZE + nameBytes.length);
      const localView = new DataView(local.buffer);
      localView.setUint32(0, 0x04034b50, true);
      localView.setUint16(4, 20, true);
      localView.setUint16(6, FLAG_UTF8_NAME, true);
      localView.setUint16(8, method, true);
      localView.setUint16(10, dosTime, true);
      localView.setUint16(12, dosDate, true);
      localView.setUint32(14, crc, true);
      localView.setUint32(18, compressedSize, true);
      localView.setUint32(22, entry.size, true);
      localView.setUint16(26, nameBytes.length, true);
      local.set(nameBytes, LOCAL_HEADER_SIZE);

      const header = new Uint8Array(CENTRAL_HEADER_SIZE + nameBytes.length);
      const headerView = new DataView(header.buffer);
      headerView.setUint32(0, 0x02014b50, true);
      headerView.setUint16(4, 20, true);
      headerView.setUint16(6, 20, true);
      headerView.setUint16(8, FLAG_UTF8_NAME, true);
      headerView.setUint16(10, method, true);
      headerView.setUint16(12, dosTime, true);
      headerView.setUint16(14, dosDate, true);
      headerView.setUint32(16, crc, true);
      headerView.setUint32(20, compressedSize, true);
      headerView.setUint32(24, entry.size, true);
      headerView.setUint16(28, nameBytes.length, true);
      headerView.setUint32(38, entry.isFolder ? 0x10 : 0, true);
      headerView.setUint32(42, offset, true);
      header.set(nameBytes, CENTRAL_HEADER_SIZE);
      central.push(header);

      parts.push(local as BlobPart);
      if (body && compressedSize > 0) parts.push(body as BlobPart);
      offset += local.length + compressedSize;
      if (offset > LITE_ZIP_MAX_BYTES) throw sizeError('ZIP 全体', offset);
    }

    let centralSize = 0;
    for (const header of central) {
      parts.push(header as BlobPart);
      centralSize += header.length;
    }
    if (offset + centralSize + END_RECORD_SIZE > LITE_ZIP_MAX_BYTES) throw sizeError('ZIP 全体', offset + centralSize + END_RECORD_SIZE);

    const end = new Uint8Array(END_RECORD_SIZE);
    const endView = new DataView(end.buffer);
    endView.setUint32(0, 0x06054b50, true);
    endView.setUint16(8, central.length, true);
    endView.setUint16(10, central.length, true);
    endView.setUint32(12, centralSize, true);
    endView.setUint32(16, offset, true);
    parts.push(end as BlobPart);

    return new Blob(parts, { type: options.mimeType || DEFAULT_MIME_TYPE });
  }
}
