'use strict';

/**
 * CRC-32（ZIP・PNG と同じ多項式 0xEDB88320）。大きな Blob を分割して読みながら計算できるよう、
 * 初期値・更新・確定を分けている。
 */

let crcTable: Uint32Array | null = null;

function getCrcTable(): Uint32Array {
  if (crcTable) return crcTable;
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let value = i;
    for (let bit = 0; bit < 8; bit += 1) {
      value = (value & 1) ? (0xedb88320 ^ (value >>> 1)) : (value >>> 1);
    }
    table[i] = value >>> 0;
  }
  crcTable = table;
  return table;
}

/** CRC の計算途中の状態の初期値。 */
export const CRC32_INITIAL = 0xffffffff;

/** 計算途中の状態へ bytes を加える。 */
export function crc32Update(state: number, bytes: Uint8Array): number {
  const table = getCrcTable();
  let crc = state;
  for (let i = 0; i < bytes.length; i += 1) {
    crc = table[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  }
  return crc >>> 0;
}

/** 計算途中の状態から CRC-32 の値（符号なし 32 ビット）を確定する。 */
export function crc32Finish(state: number): number {
  return (state ^ 0xffffffff) >>> 0;
}

export function crc32(bytes: Uint8Array): number {
  return crc32Finish(crc32Update(CRC32_INITIAL, bytes));
}
