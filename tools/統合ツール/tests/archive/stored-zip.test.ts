import { describe, expect, it } from 'vitest';
import {
  buildStoredZip,
  calculateStoredZipByteLength,
  CLASSIC_ZIP_MAX_ENTRIES,
  type StoredZipEntry
} from '../../src/archive/stored-zip';

async function blobToBuffer(blob: Blob): Promise<Buffer> {
  return Buffer.from(await blob.arrayBuffer());
}

interface ParsedLocalEntry {
  name: string;
  data: Buffer;
  flags: number;
  method: number;
  crc: number;
  dosTime: number;
  dosDate: number;
}

function parseLocalEntries(buffer: Buffer): ParsedLocalEntry[] {
  const entries: ParsedLocalEntry[] = [];
  let offset = 0;
  while (offset + 4 <= buffer.length && buffer.readUInt32LE(offset) === 0x04034b50) {
    const flags = buffer.readUInt16LE(offset + 6);
    const method = buffer.readUInt16LE(offset + 8);
    const dosTime = buffer.readUInt16LE(offset + 10);
    const dosDate = buffer.readUInt16LE(offset + 12);
    const crc = buffer.readUInt32LE(offset + 14);
    const size = buffer.readUInt32LE(offset + 18);
    const nameLength = buffer.readUInt16LE(offset + 26);
    const extraLength = buffer.readUInt16LE(offset + 28);
    const nameStart = offset + 30;
    const dataStart = nameStart + nameLength + extraLength;
    entries.push({
      name: buffer.subarray(nameStart, nameStart + nameLength).toString('utf8'),
      data: buffer.subarray(dataStart, dataStart + size),
      flags,
      method,
      crc,
      dosTime,
      dosDate
    });
    offset = dataStart + size;
  }
  return entries;
}

describe('archive/stored-zip', () => {
  it('writes UTF-8 STORE entries with valid local and central records', async () => {
    const entries: StoredZipEntry[] = [
      { name: 'hello.txt', data: new TextEncoder().encode('hello') },
      { name: '資料/比較.txt', data: new TextEncoder().encode('差分') }
    ];
    const blob = buildStoredZip(entries);
    const buffer = await blobToBuffer(blob);

    expect(blob.type).toBe('application/zip');
    expect(blob.size).toBe(calculateStoredZipByteLength(entries));
    expect(buffer.readUInt32LE(buffer.length - 22)).toBe(0x06054b50);
    expect(buffer.readUInt16LE(buffer.length - 22 + 8)).toBe(2);

    const parsed = parseLocalEntries(buffer);
    expect(parsed.map((entry) => entry.name)).toEqual(['hello.txt', '資料/比較.txt']);
    expect(parsed.map((entry) => entry.data.toString('utf8'))).toEqual(['hello', '差分']);
    expect(parsed.every((entry) => entry.flags === 0x0800)).toBe(true);
    expect(parsed.every((entry) => entry.method === 0)).toBe(true);
    expect(parsed[0].crc).toBe(0x3610a686);
  });

  it('keeps the deterministic XLSX timestamp by default and accepts a real archive timestamp', async () => {
    const entry = { name: 'book.xlsx', data: new Uint8Array([1, 2, 3]) };
    const fixed = parseLocalEntries(await blobToBuffer(buildStoredZip([entry])))[0];
    expect(fixed.dosTime).toBe(0);
    expect(fixed.dosDate).toBe(((2020 - 1980) << 9) | (1 << 5) | 1);

    const modifiedAt = new Date(2026, 7, 27, 13, 14, 15);
    const actual = parseLocalEntries(await blobToBuffer(buildStoredZip([entry], { modifiedAt })))[0];
    expect(actual.dosDate).toBe(((2026 - 1980) << 9) | (8 << 5) | 27);
    expect(actual.dosTime).toBe((13 << 11) | (14 << 5) | 7);
  });

  it('supports an explicit MIME type without changing the stored data', async () => {
    const blob = buildStoredZip(
      [{ name: 'a.bin', data: new Uint8Array([0, 255]) }],
      { mimeType: 'application/example' }
    );
    expect(blob.type).toBe('application/example');
    expect(parseLocalEntries(await blobToBuffer(blob))[0].data).toEqual(Buffer.from([0, 255]));
  });

  it('rejects ambiguous or unsafe entry names', () => {
    const data = new Uint8Array();
    expect(() => buildStoredZip([{ name: '', data }])).toThrow(/empty name/);
    expect(() => buildStoredZip([{ name: '../outside.txt', data }])).toThrow(/parent path/);
    expect(() => buildStoredZip([{ name: 'folder\\file.txt', data }])).toThrow(/forward slashes/);
    expect(() => buildStoredZip([{ name: '/absolute.txt', data }])).toThrow(/relative path/);
    expect(() => buildStoredZip([{ name: 'same.txt', data }, { name: 'same.txt', data }])).toThrow(/Duplicate/);
  });

  it('fails before classic ZIP count fields can overflow', () => {
    const tooManyEntries = { length: CLASSIC_ZIP_MAX_ENTRIES + 1 } as unknown as StoredZipEntry[];
    expect(() => buildStoredZip(tooManyEntries)).toThrow(/entry count/);
  });

  it('rejects an invalid modified timestamp', () => {
    expect(() => buildStoredZip([], { modifiedAt: new Date(Number.NaN) })).toThrow(/valid Date/);
  });
});
