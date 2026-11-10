import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, afterEach, describe, expect, it, vi } from 'vitest';
import { LITE_ZIP_MAX_ENTRIES, LiteZip, ZipLimitError } from '../../src/archive/lite-zip';
import { readZip, type ReadEntry } from './zip-reader';

async function generate(zip: LiteZip, options?: Parameters<LiteZip['generateAsync']>[0]): Promise<Buffer> {
  const blob = await zip.generateAsync({ type: 'blob', ...options });
  expect(blob.type).toBe('application/zip');
  return Buffer.from(await blob.arrayBuffer());
}

function byName(entries: ReadEntry[]): Record<string, ReadEntry> {
  return Object.fromEntries(entries.map((entry) => [entry.name, entry]));
}

function pseudoRandomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  let state = 0x12345678;
  for (let i = 0; i < length; i += 1) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    bytes[i] = state >>> 24;
  }
  return bytes;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe('LiteZip', () => {
  it('writes an empty archive that a standard reader accepts', async () => {
    const buffer = await generate(new LiteZip());
    expect(buffer.length).toBe(22);
    expect(readZip(buffer)).toEqual([]);
  });

  it('stores Japanese file and folder names as UTF-8 with the language-encoding flag', async () => {
    const zip = new LiteZip();
    zip.file('設計書/アプリ_一覧.csv', 'あ,い\r\n1,2\r\n');
    zip.folder('空フォルダ');
    const entries = byName(readZip(await generate(zip)));
    expect(Object.keys(entries)).toEqual(['設計書/', '設計書/アプリ_一覧.csv', '空フォルダ/']);
    expect(entries['設計書/アプリ_一覧.csv'].flags & 0x0800).toBe(0x0800);
    expect(entries['設計書/アプリ_一覧.csv'].data.toString('utf8')).toBe('あ,い\r\n1,2\r\n');
    expect(entries['設計書/'].externalAttrs & 0x10).toBe(0x10);
    expect(entries['設計書/'].size).toBe(0);
    expect(entries['空フォルダ/'].isFolder).toBe(true);
  });

  it('accepts strings, Blob, ArrayBuffer, typed arrays and byte arrays', async () => {
    const zip = new LiteZip();
    const bytes = pseudoRandomBytes(300);
    zip.file('text.txt', '文字列');
    zip.file('blob.bin', new Blob([bytes]));
    zip.file('buffer.bin', bytes.buffer.slice(0));
    zip.file('typed.bin', bytes);
    zip.file('view.bin', new Uint8Array(bytes.buffer, 10, 20));
    zip.file('array.bin', [1, 2, 3]);
    const entries = byName(readZip(await generate(zip)));
    expect(entries['text.txt'].data.toString('utf8')).toBe('文字列');
    expect([...entries['blob.bin'].data]).toEqual([...bytes]);
    expect([...entries['buffer.bin'].data]).toEqual([...bytes]);
    expect([...entries['typed.bin'].data]).toEqual([...bytes]);
    expect([...entries['view.bin'].data]).toEqual([...bytes.subarray(10, 30)]);
    expect([...entries['array.bin'].data]).toEqual([1, 2, 3]);
    expect(() => new LiteZip().file('x', { a: 1 } as any)).toThrow(TypeError);
  });

  it('lets a later file with the same name win and keeps the original position', async () => {
    const zip = new LiteZip();
    zip.file('a.txt', '1');
    zip.file('b.txt', 'b');
    zip.file('a.txt', '2');
    const entries = readZip(await generate(zip));
    expect(entries.map((entry) => entry.name)).toEqual(['a.txt', 'b.txt']);
    expect(entries[0].data.toString()).toBe('2');
  });

  it('adds files through folder() and nested folders', async () => {
    const zip = new LiteZip();
    const app = zip.folder('app_1');
    app.file('records.csv', 'id\n1\n');
    app.folder('sub/deeper').file('x.txt', 'x');
    const entries = byName(readZip(await generate(zip)));
    expect(Object.keys(entries)).toEqual(['app_1/', 'app_1/records.csv', 'app_1/sub/', 'app_1/sub/deeper/', 'app_1/sub/deeper/x.txt']);
  });

  it('removes a folder with everything below it, or a single file', async () => {
    const zip = new LiteZip();
    zip.file('keep.txt', 'k');
    zip.file('app_1/a.csv', 'a');
    zip.file('app_1/inner/b.csv', 'b');
    zip.file('app_10/c.csv', 'c');
    zip.remove('app_1');
    zip.remove('keep2.txt');
    let names = readZip(await generate(zip)).map((entry) => entry.name);
    expect(names).toEqual(['keep.txt', 'app_10/', 'app_10/c.csv']);
    zip.remove('keep.txt');
    names = readZip(await generate(zip)).map((entry) => entry.name);
    expect(names).toEqual(['app_10/', 'app_10/c.csv']);
  });

  it('compresses with DEFLATE when it shrinks the data and keeps STORE when it does not', async () => {
    const zip = new LiteZip();
    const text = 'kintone '.repeat(5000);
    const random = pseudoRandomBytes(4096);
    zip.file('text.txt', text);
    zip.file('random.bin', random);
    zip.file('photo.jpg', 'x'.repeat(4000));
    zip.file('tiny.txt', 'a');
    zip.file('empty.txt', '');
    const entries = byName(readZip(await generate(zip)));
    expect(entries['text.txt'].method).toBe(8);
    expect(entries['text.txt'].compressedSize).toBeLessThan(text.length / 10);
    expect(entries['random.bin'].method).toBe(0);
    expect(entries['photo.jpg'].method).toBe(0);
    expect(entries['tiny.txt'].method).toBe(0);
    expect(entries['empty.txt'].size).toBe(0);
    expect([...entries['random.bin'].data]).toEqual([...random]);
  });

  it('writes only STORE entries when compression is turned off or CompressionStream is missing', async () => {
    const text = 'kintone '.repeat(5000);
    const stored = new LiteZip();
    stored.file('text.txt', text);
    expect(readZip(await generate(stored, { compression: 'STORE' }))[0].method).toBe(0);

    vi.resetModules();
    vi.stubGlobal('CompressionStream', undefined);
    const { LiteZip: NoCompressionZip, isDeflateRawSupported } = await import('../../src/archive/lite-zip');
    expect(isDeflateRawSupported()).toBe(false);
    const zip = new NoCompressionZip();
    zip.file('日本語.txt', text);
    const [entry] = readZip(await generate(zip as unknown as LiteZip));
    expect(entry.method).toBe(0);
    expect(entry.data.toString()).toBe(text);
  });

  it('round-trips large binary data in both methods without changing it', async () => {
    const random = pseudoRandomBytes(6 * 1024 * 1024);
    const compressible = new Uint8Array(6 * 1024 * 1024);
    for (let i = 0; i < compressible.length; i += 1) compressible[i] = (i >> 8) & 0x0f;
    for (const compression of ['DEFLATE', 'STORE'] as const) {
      const zip = new LiteZip();
      zip.file('attachments/random.dat', new Blob([random]));
      zip.file('attachments/pattern.dat', compressible);
      const entries = byName(readZip(await generate(zip, { compression })));
      expect(Buffer.compare(entries['attachments/random.dat'].data, Buffer.from(random))).toBe(0);
      expect(Buffer.compare(entries['attachments/pattern.dat'].data, Buffer.from(compressible))).toBe(0);
      expect(entries['attachments/pattern.dat'].method).toBe(compression === 'DEFLATE' ? 8 : 0);
    }
  });

  it('uses the current time for the modification time and accepts an override', async () => {
    const before = new Date();
    const zip = new LiteZip();
    zip.file('a.txt', 'a');
    const [entry] = readZip(await generate(zip));
    const year = 1980 + (entry.dosDate >> 9);
    expect(year).toBeGreaterThanOrEqual(before.getFullYear());
    expect(year).toBeLessThanOrEqual(new Date().getFullYear());
    const fixed = readZip(await generate(zip, { modifiedAt: new Date(2024, 4, 6, 7, 8, 10) }))[0];
    expect(fixed.dosDate).toBe(((2024 - 1980) << 9) | (5 << 5) | 6);
    expect(fixed.dosTime).toBe((7 << 11) | (8 << 5) | 5);
  });

  it('rejects names that could escape the extraction folder', () => {
    const zip = new LiteZip();
    expect(() => zip.file('../evil.txt', 'x')).toThrow('..');
    expect(() => zip.file('/abs.txt', 'x')).toThrow('相対パス');
    expect(() => zip.file('C:\\abs.txt', 'x')).toThrow('相対パス');
    expect(() => zip.file('', 'x')).toThrow();
    expect(() => zip.file('a\0b', 'x')).toThrow();
    zip.file('dir\\file.txt', 'x');
    expect(Array.from((zip as any).store.keys())).toEqual(['dir/', 'dir/file.txt']);
  });
});

describe('LiteZip classic ZIP limits', () => {
  it('refuses more than 65,535 entries (folders included) with a clear message', async () => {
    const zip = new LiteZip();
    for (let i = 0; i < LITE_ZIP_MAX_ENTRIES + 1; i += 1) zip.file(`f${i}.txt`, '');
    const error = await zip.generateAsync({ type: 'blob' }).catch((e) => e);
    expect(error).toBeInstanceOf(ZipLimitError);
    expect(error.message).toContain('65,535 件');
    expect(error.message).toContain('対象を分けて');

    const exact = new LiteZip();
    for (let i = 0; i < LITE_ZIP_MAX_ENTRIES; i += 1) exact.file(`f${i}.txt`, '');
    const exactBuffer = await generate(exact);
    expect(exactBuffer.readUInt16LE(exactBuffer.length - 12)).toBe(LITE_ZIP_MAX_ENTRIES);

    const withFolders = new LiteZip();
    for (let i = 0; i < LITE_ZIP_MAX_ENTRIES / 2 + 1; i += 1) withFolders.file(`d${i}/f.txt`, '');
    await expect(withFolders.generateAsync({ type: 'blob' })).rejects.toThrow(ZipLimitError);
  });

  it('refuses a file or an archive of 4GB or more before reading anything', async () => {
    const huge = (size: number) => ({
      size,
      slice: () => huge(size),
      arrayBuffer: () => { throw new Error('must not be read'); },
      stream: () => { throw new Error('must not be read'); }
    }) as unknown as Blob;
    const single = new LiteZip();
    single.file('big.bin', huge(2 ** 32));
    const singleError = await single.generateAsync({ type: 'blob' }).catch((e) => e);
    expect(singleError).toBeInstanceOf(ZipLimitError);
    expect(singleError.message).toContain('big.bin');
    expect(singleError.message).toContain('4GB');

    const total = new LiteZip();
    total.file('a.bin', huge(3 * 1024 ** 3));
    total.file('b.bin', huge(3 * 1024 ** 3));
    const totalError = await total.generateAsync({ type: 'blob', compression: 'STORE' }).catch((e) => e);
    expect(totalError).toBeInstanceOf(ZipLimitError);
    expect(totalError.message).toContain('ZIP 全体');
  });

  it('refuses a name longer than 65,535 UTF-8 bytes', async () => {
    const zip = new LiteZip();
    zip.file(`${'あ'.repeat(21846)}.txt`, 'x');
    await expect(zip.generateAsync({ type: 'blob' })).rejects.toThrow('ファイル名が長すぎます');
  });

  it('rejects an unsupported output type instead of returning something else', async () => {
    await expect(new LiteZip().generateAsync({ type: 'uint8array' } as any)).rejects.toThrow(TypeError);
  });
});

describe('LiteZip with standard tools', () => {
  const dir = mkdtempSync(join(tmpdir(), 'lite-zip-'));
  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  async function buildSample(): Promise<Buffer> {
    const zip = new LiteZip();
    zip.file('設計書/アプリ_一覧.csv', 'あ,い\r\n'.repeat(500));
    zip.file('設計書/バイナリ.bin', new Blob([pseudoRandomBytes(100_000)]));
    zip.folder('空フォルダ');
    zip.file('manifest.json', JSON.stringify({ ok: true }));
    return generate(zip);
  }

  it('is accepted by Python zipfile with intact names and contents', async () => {
    const python = spawnSync('python3', ['--version']);
    if (python.status !== 0) return;
    const file = join(dir, 'sample.zip');
    writeFileSync(file, await buildSample());
    const script = [
      'import json, sys, zipfile',
      'z = zipfile.ZipFile(sys.argv[1])',
      'print(json.dumps({"bad": z.testzip(), "names": z.namelist(), "head": z.read("設計書/アプリ_一覧.csv").decode("utf-8")[:5], "methods": sorted(set(i.compress_type for i in z.infolist()))}, ensure_ascii=False))'
    ].join('\n');
    const out = JSON.parse(execFileSync('python3', ['-I', '-c', script, file], { encoding: 'utf8', env: { ...process.env, PYTHONIOENCODING: 'utf-8' } }));
    expect(out.bad).toBeNull();
    expect(out.names).toEqual(['設計書/', '設計書/アプリ_一覧.csv', '設計書/バイナリ.bin', '空フォルダ/', 'manifest.json']);
    expect(out.head).toBe('あ,い\r\n');
    expect(out.methods).toEqual([0, 8]);
  });

  it('passes unzip -t', async () => {
    const unzip = spawnSync('unzip', ['-v']);
    if (unzip.error || unzip.status !== 0) return;
    const file = join(dir, 'sample2.zip');
    writeFileSync(file, await buildSample());
    const out = execFileSync('unzip', ['-t', file], { encoding: 'utf8', env: { ...process.env, LC_ALL: 'C.UTF-8' } });
    expect(out).toContain('No errors detected');
  });
});
