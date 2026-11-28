'use strict';

/**
 * ZIP の読み取り（DOM 非依存。通信しない）。設定取得が保存した ZIP を、設計書作成の「設定JSON読込」で読むために使う。
 * - 中央ディレクトリから各エントリを読み、STORE（0）と DEFLATE（8）に対応する（DEFLATE は `DecompressionStream('deflate-raw')`）。
 * - 暗号化・ZIP64・分割 ZIP は扱わない（設定取得の ZIP は使わない）。
 * - 展開後の大きさと件数に上限を設け、CRC-32 で内容を確かめる。各ファイルは中央ディレクトリに書かれた大きさを超えて展開しない。
 */

import { crc32 } from './crc32.js';

export interface ZipReadEntry {
  /** ZIP 内のパス（UTF-8。フォルダは末尾が「/」） */
  name: string;
  /** 展開した中身（フォルダは空） */
  data: Uint8Array;
}

export interface ZipReadOptions {
  /** 読むエントリを選ぶ（false のエントリは展開しない）。既定はすべて */
  include?: (name: string) => boolean;
  /** 展開後の合計の上限（バイト）。既定 512 MiB */
  maxTotalBytes?: number;
  /** エントリ数の上限。既定 65,535 */
  maxEntries?: number;
}

const SIG_END = 0x06054b50;
const SIG_CENTRAL = 0x02014b50;
const SIG_LOCAL = 0x04034b50;
const DEFAULT_MAX_TOTAL = 512 * 1024 * 1024;

/** ZIP の先頭が「PK\x03\x04」（または空の ZIP の終端）か。 */
export function looksLikeZip(bytes: Uint8Array): boolean {
  return bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b && ((bytes[2] === 0x03 && bytes[3] === 0x04) || (bytes[2] === 0x05 && bytes[3] === 0x06));
}

/**
 * DEFLATE を展開する。中央ディレクトリに書かれた大きさ（expectedSize）を超えたところで展開をやめる
 * （大きさを小さく偽った ZIP で、展開後の上限を素通りしてメモリを使い切らないように）。超えたときは null を返す。
 */
async function inflateRaw(bytes: Uint8Array, expectedSize: number): Promise<Uint8Array | null> {
  if (typeof DecompressionStream !== 'function') throw new Error('このブラウザは ZIP の展開（deflate-raw）に対応していません。設定JSONを読み込んでください');
  const reader = new Blob([bytes as BlobPart]).stream().pipeThrough(new DecompressionStream('deflate-raw')).getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.byteLength;
    if (length > expectedSize) {
      await reader.cancel().catch(() => {});
      return null;
    }
    chunks.push(value);
  }
  const out = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return out;
}

/** ZIP のエントリを読み出す。壊れた ZIP・未対応の形式・上限超えは、利用者向けの理由を付けて例外にする。 */
export async function readZipEntries(bytes: Uint8Array, options: ZipReadOptions = {}): Promise<ZipReadEntry[]> {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const u16 = (offset: number) => view.getUint16(offset, true);
  const u32 = (offset: number) => view.getUint32(offset, true);
  // 終端レコード（末尾のコメントは最大 65,535 バイト）
  let end = -1;
  for (let pos = bytes.length - 22; pos >= Math.max(0, bytes.length - 22 - 0xffff); pos -= 1) {
    if (u32(pos) === SIG_END) { end = pos; break; }
  }
  if (end < 0) throw new Error('ZIP の終端が見つかりません（ZIP ファイルではないか、壊れています）');
  const count = u16(end + 10);
  const centralOffset = u32(end + 16);
  if (count === 0xffff || centralOffset === 0xffffffff) throw new Error('ZIP64 形式の ZIP には対応していません');
  if (count > (options.maxEntries ?? 0xffff)) throw new Error(`ZIP のファイル数（${count}）が多すぎます`);
  const decoder = new TextDecoder('utf-8');
  const maxTotal = options.maxTotalBytes ?? DEFAULT_MAX_TOTAL;
  const entries: ZipReadEntry[] = [];
  let total = 0;
  let pos = centralOffset;
  for (let i = 0; i < count; i += 1) {
    if (pos + 46 > bytes.length || u32(pos) !== SIG_CENTRAL) throw new Error('ZIP の中央ディレクトリが壊れています');
    const flags = u16(pos + 8);
    const method = u16(pos + 10);
    const crc = u32(pos + 16);
    const compressedSize = u32(pos + 20);
    const size = u32(pos + 24);
    const nameLength = u16(pos + 28);
    const extraLength = u16(pos + 30);
    const commentLength = u16(pos + 32);
    const localOffset = u32(pos + 42);
    const name = decoder.decode(bytes.subarray(pos + 46, pos + 46 + nameLength));
    pos += 46 + nameLength + extraLength + commentLength;
    if (name.endsWith('/')) { entries.push({ name, data: new Uint8Array(0) }); continue; }
    if (options.include && !options.include(name)) continue;
    if (flags & 0x1) throw new Error(`暗号化された ZIP には対応していません（${name}）`);
    if (method !== 0 && method !== 8) throw new Error(`未対応の圧縮方式です（${name}・方式 ${method}）`);
    total += size;
    if (total > maxTotal) throw new Error('ZIP の展開後の大きさが上限を超えます');
    if (localOffset + 30 > bytes.length || u32(localOffset) !== SIG_LOCAL) throw new Error(`ZIP のファイル「${name}」の位置が壊れています`);
    const dataStart = localOffset + 30 + u16(localOffset + 26) + u16(localOffset + 28);
    if (dataStart + compressedSize > bytes.length) throw new Error(`ZIP のファイル「${name}」が途中で切れています`);
    const raw = bytes.subarray(dataStart, dataStart + compressedSize);
    const data = method === 8 ? await inflateRaw(raw, size) : raw.slice();
    if (!data || data.length !== size || crc32(data) !== crc) throw new Error(`ZIP のファイル「${name}」の内容が壊れています（大きさ・CRC が一致しません）`);
    entries.push({ name, data });
  }
  return entries;
}
