// ZIP を読み戻す検査用の独立した実装（中央ディレクトリの解析、zlib の inflate、CRC-32 の照合）。作成側の実装には依存しない。
import { crc32 as nodeCrc32, inflateRawSync } from 'node:zlib';
import { expect } from 'vitest';

export interface ReadEntry {
  name: string;
  isFolder: boolean;
  method: number;
  flags: number;
  crc: number;
  compressedSize: number;
  size: number;
  data: Buffer;
  dosDate: number;
  dosTime: number;
  externalAttrs: number;
}

/** 生成側とは別に、中央ディレクトリから読み戻す（zlib の inflate と CRC で内容も検証する）。 */
export function readZip(buffer: Buffer): ReadEntry[] {
  let end = buffer.length - 22;
  while (end >= 0 && buffer.readUInt32LE(end) !== 0x06054b50) end -= 1;
  if (end < 0) throw new Error('end of central directory not found');
  const count = buffer.readUInt16LE(end + 10);
  expect(buffer.readUInt16LE(end + 8)).toBe(count);
  const centralSize = buffer.readUInt32LE(end + 12);
  let pos = buffer.readUInt32LE(end + 16);
  expect(pos + centralSize).toBe(end);
  const entries: ReadEntry[] = [];
  for (let i = 0; i < count; i += 1) {
    expect(buffer.readUInt32LE(pos)).toBe(0x02014b50);
    const flags = buffer.readUInt16LE(pos + 8);
    const method = buffer.readUInt16LE(pos + 10);
    const dosTime = buffer.readUInt16LE(pos + 12);
    const dosDate = buffer.readUInt16LE(pos + 14);
    const crc = buffer.readUInt32LE(pos + 16);
    const compressedSize = buffer.readUInt32LE(pos + 20);
    const size = buffer.readUInt32LE(pos + 24);
    const nameLength = buffer.readUInt16LE(pos + 28);
    const extraLength = buffer.readUInt16LE(pos + 30);
    const commentLength = buffer.readUInt16LE(pos + 32);
    const externalAttrs = buffer.readUInt32LE(pos + 38);
    const localOffset = buffer.readUInt32LE(pos + 42);
    const name = buffer.subarray(pos + 46, pos + 46 + nameLength).toString('utf8');
    expect(buffer.readUInt32LE(localOffset)).toBe(0x04034b50);
    expect(buffer.readUInt16LE(localOffset + 6)).toBe(flags);
    expect(buffer.readUInt32LE(localOffset + 14)).toBe(crc);
    expect(buffer.readUInt32LE(localOffset + 18)).toBe(compressedSize);
    expect(buffer.readUInt32LE(localOffset + 22)).toBe(size);
    expect(buffer.subarray(localOffset + 30, localOffset + 30 + nameLength).toString('utf8')).toBe(name);
    const dataStart = localOffset + 30 + nameLength + buffer.readUInt16LE(localOffset + 28);
    const raw = buffer.subarray(dataStart, dataStart + compressedSize);
    const data = method === 8 ? inflateRawSync(raw) : Buffer.from(raw);
    expect(data.length).toBe(size);
    expect(nodeCrc32(data)).toBe(crc);
    entries.push({ name, isFolder: name.endsWith('/'), method, flags, crc, compressedSize, size, data, dosDate, dosTime, externalAttrs });
    pos += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

