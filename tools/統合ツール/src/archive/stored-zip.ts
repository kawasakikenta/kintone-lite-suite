'use strict';

/**
 * Minimal ZIP container writer using the STORE method (no compression).
 *
 * This intentionally supports the classic ZIP limits only. Callers receive a
 * clear error before a 16-bit/32-bit ZIP field would overflow; ZIP64 is not
 * emitted.
 */

export interface StoredZipEntry {
  name: string;
  data: Uint8Array;
}

export interface StoredZipOptions {
  mimeType?: string;
  /**
   * Timestamp written to every entry. When omitted, 2020-01-01 00:00:00 is
   * used so existing deterministic XLSX output remains byte-for-byte stable.
   */
  modifiedAt?: Date;
}

export const CLASSIC_ZIP_MAX_ENTRIES = 0xffff;
export const CLASSIC_ZIP_MAX_BYTES = 0xffffffff;

const DEFAULT_DOS_TIME = 0;
const DEFAULT_DOS_DATE = ((2020 - 1980) << 9) | (1 << 5) | 1;
const DEFAULT_MIME_TYPE = 'application/zip';
const LOCAL_FILE_HEADER_SIZE = 30;
const CENTRAL_DIRECTORY_HEADER_SIZE = 46;
const END_OF_CENTRAL_DIRECTORY_SIZE = 22;

interface PreparedStoredZipEntry extends StoredZipEntry {
  nameBytes: Uint8Array;
}

let crcTable: Uint32Array | null = null;

function crc32(bytes: Uint8Array): number {
  if (!crcTable) {
    const table = new Uint32Array(256);
    for (let i = 0; i < table.length; i += 1) {
      let value = i;
      for (let bit = 0; bit < 8; bit += 1) {
        value = (value & 1) ? (0xedb88320 ^ (value >>> 1)) : (value >>> 1);
      }
      table[i] = value >>> 0;
    }
    crcTable = table;
  }

  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i += 1) {
    crc = (crcTable[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8)) >>> 0;
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function assertSafeEntryName(name: string, index: number): void {
  if (!name) throw new TypeError(`ZIP entry ${index + 1} has an empty name`);
  if (name.includes('\0')) throw new TypeError(`ZIP entry ${index + 1} contains a NUL in its name`);
  if (name.includes('\\')) throw new TypeError(`ZIP entry ${index + 1} must use forward slashes`);
  if (name.startsWith('/') || /^[A-Za-z]:\//.test(name)) {
    throw new TypeError(`ZIP entry ${index + 1} must use a relative path`);
  }
  if (name.split('/').some((segment) => segment === '..')) {
    throw new TypeError(`ZIP entry ${index + 1} must not contain a parent path segment`);
  }
}

function prepareEntries(entries: readonly StoredZipEntry[]): PreparedStoredZipEntry[] {
  if (entries.length > CLASSIC_ZIP_MAX_ENTRIES) {
    throw new RangeError(`ZIP entry count exceeds the classic ZIP limit (${CLASSIC_ZIP_MAX_ENTRIES})`);
  }

  const encoder = new TextEncoder();
  const seen = new Set<string>();
  return entries.map((entry, index) => {
    if (!entry || typeof entry.name !== 'string') {
      throw new TypeError(`ZIP entry ${index + 1} is invalid`);
    }
    if (!(entry.data instanceof Uint8Array)) {
      throw new TypeError(`ZIP entry ${index + 1} data must be a Uint8Array`);
    }
    assertSafeEntryName(entry.name, index);
    if (seen.has(entry.name)) throw new TypeError(`Duplicate ZIP entry name: ${entry.name}`);
    seen.add(entry.name);

    const nameBytes = encoder.encode(entry.name);
    if (nameBytes.length > 0xffff) {
      throw new RangeError(`ZIP entry ${index + 1} name exceeds 65,535 UTF-8 bytes`);
    }
    if (entry.data.length > CLASSIC_ZIP_MAX_BYTES) {
      throw new RangeError(`ZIP entry ${index + 1} exceeds the classic ZIP size limit`);
    }
    return { name: entry.name, data: entry.data, nameBytes };
  });
}

function checkedClassicZipSize(value: number, label: string): number {
  if (!Number.isSafeInteger(value) || value < 0 || value > CLASSIC_ZIP_MAX_BYTES) {
    throw new RangeError(`${label} exceeds the classic ZIP size limit`);
  }
  return value;
}

function resolveDosTimestamp(modifiedAt: Date | undefined): { dosDate: number; dosTime: number } {
  if (modifiedAt === undefined) return { dosDate: DEFAULT_DOS_DATE, dosTime: DEFAULT_DOS_TIME };
  if (!(modifiedAt instanceof Date) || !Number.isFinite(modifiedAt.getTime())) {
    throw new TypeError('ZIP modifiedAt must be a valid Date');
  }

  const actualYear = modifiedAt.getFullYear();
  if (actualYear < 1980) return { dosDate: 1 << 5 | 1, dosTime: 0 };
  if (actualYear > 2107) {
    return {
      dosDate: ((2107 - 1980) << 9) | (12 << 5) | 31,
      dosTime: (23 << 11) | (59 << 5) | 29
    };
  }

  const dosDate = ((actualYear - 1980) << 9) | ((modifiedAt.getMonth() + 1) << 5) | modifiedAt.getDate();
  const dosTime = (modifiedAt.getHours() << 11) | (modifiedAt.getMinutes() << 5) | Math.floor(modifiedAt.getSeconds() / 2);
  return { dosDate, dosTime };
}

function calculatePreparedZipByteLength(entries: readonly PreparedStoredZipEntry[]): number {
  let total = END_OF_CENTRAL_DIRECTORY_SIZE;
  for (const entry of entries) {
    total += LOCAL_FILE_HEADER_SIZE + entry.nameBytes.length + entry.data.length;
    total += CENTRAL_DIRECTORY_HEADER_SIZE + entry.nameBytes.length;
    checkedClassicZipSize(total, 'ZIP archive');
  }
  return total;
}

export function calculateStoredZipByteLength(entries: readonly StoredZipEntry[]): number {
  return calculatePreparedZipByteLength(prepareEntries(entries));
}

export function buildStoredZip(entries: readonly StoredZipEntry[], options: StoredZipOptions = {}): Blob {
  const prepared = prepareEntries(entries);
  calculatePreparedZipByteLength(prepared);
  const { dosDate, dosTime } = resolveDosTimestamp(options.modifiedAt);
  const parts: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;

  for (const entry of prepared) {
    const { nameBytes, data } = entry;
    const crc = crc32(data);
    const size = data.length;
    const localHeader = new Uint8Array(LOCAL_FILE_HEADER_SIZE + nameBytes.length);
    const localView = new DataView(localHeader.buffer);
    localView.setUint32(0, 0x04034b50, true);
    localView.setUint16(4, 20, true);
    localView.setUint16(6, 0x0800, true);
    localView.setUint16(8, 0, true);
    localView.setUint16(10, dosTime, true);
    localView.setUint16(12, dosDate, true);
    localView.setUint32(14, crc, true);
    localView.setUint32(18, size, true);
    localView.setUint32(22, size, true);
    localView.setUint16(26, nameBytes.length, true);
    localView.setUint16(28, 0, true);
    localHeader.set(nameBytes, LOCAL_FILE_HEADER_SIZE);
    parts.push(localHeader, data);

    const centralHeader = new Uint8Array(CENTRAL_DIRECTORY_HEADER_SIZE + nameBytes.length);
    const centralView = new DataView(centralHeader.buffer);
    centralView.setUint32(0, 0x02014b50, true);
    centralView.setUint16(4, 20, true);
    centralView.setUint16(6, 20, true);
    centralView.setUint16(8, 0x0800, true);
    centralView.setUint16(10, 0, true);
    centralView.setUint16(12, dosTime, true);
    centralView.setUint16(14, dosDate, true);
    centralView.setUint32(16, crc, true);
    centralView.setUint32(20, size, true);
    centralView.setUint32(24, size, true);
    centralView.setUint16(28, nameBytes.length, true);
    centralView.setUint16(30, 0, true);
    centralView.setUint16(32, 0, true);
    centralView.setUint16(34, 0, true);
    centralView.setUint16(36, 0, true);
    centralView.setUint32(38, 0, true);
    centralView.setUint32(42, offset, true);
    centralHeader.set(nameBytes, CENTRAL_DIRECTORY_HEADER_SIZE);
    central.push(centralHeader);
    offset = checkedClassicZipSize(offset + localHeader.length + data.length, 'ZIP local data');
  }

  const centralStart = offset;
  let centralSize = 0;
  for (const header of central) {
    parts.push(header);
    centralSize = checkedClassicZipSize(centralSize + header.length, 'ZIP central directory');
  }

  const end = new Uint8Array(END_OF_CENTRAL_DIRECTORY_SIZE);
  const endView = new DataView(end.buffer);
  endView.setUint32(0, 0x06054b50, true);
  endView.setUint16(4, 0, true);
  endView.setUint16(6, 0, true);
  endView.setUint16(8, central.length, true);
  endView.setUint16(10, central.length, true);
  endView.setUint32(12, centralSize, true);
  endView.setUint32(16, centralStart, true);
  endView.setUint16(20, 0, true);
  parts.push(end);

  return new Blob(parts as BlobPart[], { type: options.mimeType || DEFAULT_MIME_TYPE });
}
