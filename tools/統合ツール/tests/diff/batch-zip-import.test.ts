import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchBundle } from '../../src/api';
import { downloadBlob } from '../../src/utils';
import { runSettingsExportStandalone } from '../../src/tabs/settings-export-standalone';
import { LiteZip } from '../../src/archive/lite-zip';
import {
  autoMatchDiffBatchFolderBundles,
  parseDiffBatchFolderImport,
  type DiffBatchFolderImportFile,
  type DiffBatchFolderImportResult
} from '../../src/diff/batch-folder-import';
import { DIFF_BATCH_ZIP_MAX_BYTES, readDiffBatchZipFiles } from '../../src/diff/batch-zip-import';
import { computeDiffRows } from '../../src/diff/engine';
import { readZip } from '../archive/zip-reader';

// 差分比較の「設定フォルダからペアを作成」で、設定取得の ZIP をそのまま選んだときに、
// ZIP を展開したフォルダを選んだときと同じペア・同じ比較結果になることと、フォルダ取込の安全策が ZIP にも効くことを確かめる。
vi.mock('../../src/api', async importOriginal => ({ ...await importOriginal<typeof import('../../src/api')>(), fetchBundle: vi.fn() }));
vi.mock('../../src/utils', async importOriginal => ({ ...await importOriginal<typeof import('../../src/utils')>(),
  downloadText: vi.fn(), downloadBlob: vi.fn(), selectedScopeKeys: () => ['appSettings', 'fieldSettings'] }));

const SCOPES = ['appSettings', 'fieldSettings'];
const bytesOf = async (blob: Blob) => new Uint8Array(await blob.arrayBuffer());

beforeEach(() => { vi.clearAllMocks(); });
afterEach(() => { vi.unstubAllGlobals(); });

function fieldBundle(appId: string, appName: string, label: string, options: { guestId?: string; preview?: boolean } = {}) {
  return {
    appId,
    guestId: options.guestId || '',
    preview: options.preview === true,
    fetchedAt: '2026-11-28T00:00:00.000Z',
    meta: { sectionRevisions: {} },
    sections: {
      appSettings: { name: appName },
      fieldSettings: { properties: { title: { type: 'SINGLE_LINE_TEXT', code: 'title', label } } }
    }
  };
}

/** 設定取得の「設定をZIPで保存」を実際に動かし、保存された ZIP のバイト列を返す。 */
async function exportSettingsZip(version: 'before' | 'after', preview = false): Promise<Uint8Array> {
  vi.mocked(downloadBlob).mockClear();
  vi.mocked(fetchBundle).mockImplementation(async ({ appId, guestId }: any) => {
    const names: Record<string, string> = { '1': '顧客管理', '2': '案件管理', '3': '日報' };
    const bundle = fieldBundle(appId, names[appId] || `App ${appId}`, `${version}-${appId}-${guestId || ''}`, { guestId, preview });
    if (appId === '3') bundle.sections.fieldSettings = { _fetchError: '権限不足' } as any;
    return bundle;
  });
  await runSettingsExportStandalone('zip', { preview, apps: [{ appId: '1' }, { appId: '2', guestId: '9' }, { appId: '3' }] }, vi.fn());
  const blob = vi.mocked(downloadBlob).mock.calls[0][1] as Blob;
  return bytesOf(blob);
}

/** 利用者が ZIP を展開してフォルダを選んだときの形（展開は ZIP 読み取りとは別の実装＝node:zlib で行う）。 */
function extractAsFolder(bytes: Uint8Array, folderName: string): DiffBatchFolderImportFile[] {
  return readZip(Buffer.from(bytes)).filter((entry) => !entry.isFolder).map((entry) => {
    const isJson = /\.json$/i.test(entry.name);
    return {
      name: entry.name.split('/').pop() || entry.name,
      relativePath: `${folderName}/${entry.name}`,
      text: isJson ? new TextDecoder('utf-8').decode(entry.data) : ''
    };
  });
}

/** 読み込んだ結果から、置き場所（フォルダ名・ZIP 名）だけを除いた形。 */
function withoutRoot(result: DiffBatchFolderImportResult) {
  return {
    ...result,
    bundles: result.bundles.map((item) => ({ ...item, relativePath: item.relativePath.replace(/^[^/]+\//, '') }))
  };
}

function pairSummary(source: DiffBatchFolderImportResult, target: DiffBatchFolderImportResult) {
  return autoMatchDiffBatchFolderBundles(source.bundles, target.bundles).map((pair) => {
    const result = pair.source && pair.target ? computeDiffRows(pair.source.bundle, pair.target.bundle, SCOPES, '') : null;
    return {
      source: pair.source?.endpointKey || '',
      target: pair.target?.endpointKey || '',
      matchKind: pair.matchKind,
      rows: result ? JSON.parse(JSON.stringify(result.rows)) : [],
      fetchIssues: result?.fetchIssues || []
    };
  });
}

/** 中央ディレクトリ・ローカルヘッダーにある名前（同じ長さ）を書き換える。中身の CRC は変わらない。 */
function renameEntries(bytes: Uint8Array, from: string, to: string): Uint8Array {
  const a = new TextEncoder().encode(from);
  const b = new TextEncoder().encode(to);
  expect(b.length).toBe(a.length);
  const out = bytes.slice();
  let replaced = 0;
  for (let pos = 0; pos + a.length <= out.length; pos += 1) {
    if (a.every((value, index) => out[pos + index] === value)) {
      out.set(b, pos);
      replaced += 1;
    }
  }
  expect(replaced).toBeGreaterThan(0);
  return out;
}

/** 中央ディレクトリにある、指定した名前のエントリの「展開後の大きさ」を書き換える。 */
function setDeclaredSize(bytes: Uint8Array, name: string, size: number): Uint8Array {
  const out = bytes.slice();
  const view = new DataView(out.buffer);
  const encoded = new TextEncoder().encode(name);
  for (let pos = 0; pos + 46 <= out.length; pos += 1) {
    if (view.getUint32(pos, true) !== 0x02014b50) continue;
    const nameLength = view.getUint16(pos + 28, true);
    const candidate = out.subarray(pos + 46, pos + 46 + nameLength);
    if (nameLength === encoded.length && candidate.every((value, index) => value === encoded[index])) {
      view.setUint32(pos + 24, size, true);
      return out;
    }
  }
  throw new Error(`central entry ${name} was not found`);
}

/** 展開したバイト数を数える（本物の DecompressionStream に処理を任せる）。 */
function countInflatedBytes(): { bytes: () => number } {
  const Original = globalThis.DecompressionStream;
  let produced = 0;
  class CountingDecompressionStream {
    readable: ReadableStream<Uint8Array>;
    writable: WritableStream<BufferSource>;
    constructor(format: CompressionFormat) {
      const inner = new Original(format);
      const counter = new TransformStream<Uint8Array, Uint8Array>({
        transform(chunk, controller) {
          produced += chunk.byteLength;
          controller.enqueue(chunk);
        }
      });
      inner.readable.pipeTo(counter.writable).catch(() => {});
      this.writable = inner.writable;
      this.readable = counter.readable;
    }
  }
  vi.stubGlobal('DecompressionStream', CountingDecompressionStream);
  return { bytes: () => produced };
}

async function zipOf(files: Record<string, string | Uint8Array>, compression: 'DEFLATE' | 'STORE' = 'DEFLATE'): Promise<Uint8Array> {
  const zip = new LiteZip();
  Object.entries(files).forEach(([name, content]) => zip.file(name, content));
  return bytesOf(await zip.generateAsync({ type: 'blob', compression }));
}

describe('差分比較のフォルダ取込で、設定取得の ZIP をそのまま読む', () => {
  it.each([false, true])('設定取得の ZIP（manifest つき）は、展開したフォルダと同じバンドル・同じペア・同じ比較結果になる（preview=%s）', async (preview) => {
    const before = await exportSettingsZip('before', preview);
    const after = await exportSettingsZip('after', preview);

    const zipSource = await readDiffBatchZipFiles(before, '設定一括取得_before.zip');
    const zipTarget = await readDiffBatchZipFiles(after, '設定一括取得_after.zip');
    expect(zipSource.files.map((file) => file.relativePath)).toEqual(extractAsFolder(before, '設定一括取得_before.zip').map((file) => file.relativePath));

    const fromZip = {
      source: parseDiffBatchFolderImport(zipSource.files, { side: 'source' }),
      target: parseDiffBatchFolderImport(zipTarget.files, { side: 'target' })
    };
    const fromFolder = {
      source: parseDiffBatchFolderImport(extractAsFolder(before, '設定一括取得_before'), { side: 'source' }),
      target: parseDiffBatchFolderImport(extractAsFolder(after, '設定一括取得_after'), { side: 'target' })
    };
    expect(fromZip.source.issues).toEqual([]);
    expect(fromZip.target.issues).toEqual([]);
    expect(fromZip.source.manifestFileCount).toBe(1);
    expect(fromZip.source.ignoredFileCount).toBe(1); // INDEX.md
    expect(fromZip.source.bundles.map((item) => item.endpointKey)).toEqual(fromFolder.source.bundles.map((item) => item.endpointKey));
    expect(fromZip.source.bundles.map((item) => item.appName)).toEqual(['顧客管理', '案件管理', '日報']);
    expect(fromZip.source.bundles[0].relativePath).toMatch(/^設定一括取得_before\.zip\/顧客管理\(app1\)_/);
    expect(withoutRoot(fromZip.source)).toEqual(withoutRoot(fromFolder.source));
    expect(withoutRoot(fromZip.target)).toEqual(withoutRoot(fromFolder.target));

    const zipPairs = pairSummary(fromZip.source, fromZip.target);
    expect(zipPairs).toEqual(pairSummary(fromFolder.source, fromFolder.target));
    expect(zipPairs.map((pair) => pair.matchKind)).toEqual(['app-name', 'app-name', 'app-name']);
    expect(zipPairs[0].rows.length).toBeGreaterThan(0);
    expect(JSON.stringify(zipPairs[0].rows)).toContain('before-1-');
    expect(JSON.stringify(zipPairs[0].rows)).toContain('after-1-');
    expect(zipPairs[2].fetchIssues.length).toBeGreaterThan(0); // 取得失敗の項目は比較不能のまま

    // 片方を ZIP、もう片方をフォルダにしても同じ
    expect(pairSummary(fromZip.source, fromFolder.target)).toEqual(zipPairs);
    expect(pairSummary(fromFolder.source, fromZip.target)).toEqual(zipPairs);
  });

  it('manifest.json の無い ZIP・入れ子のフォルダ・JSON 以外のファイルも、展開したフォルダと同じに読む', async () => {
    const bytes = await zipOf({
      'apps/b.json': JSON.stringify(fieldBundle('12', '在庫', 'b')),
      'apps/a.json': JSON.stringify(fieldBundle('11', '発注', 'a', { guestId: '5', preview: true })),
      'a_JS_CSS/desktop/js/main.js': 'console.log(1);',
      'notes/readme.txt': 'x',
      'pair.json': JSON.stringify({ source: fieldBundle('13', '旧', 'old'), target: fieldBundle('14', '新', 'new') })
    });
    const zip = await readDiffBatchZipFiles(bytes, 'settings.zip');
    expect(zip.fileCount).toBe(5);
    expect(zip.jsonFileCount).toBe(3);
    for (const side of ['source', 'target'] as const) {
      const fromZip = parseDiffBatchFolderImport(zip.files, { side });
      const fromFolder = parseDiffBatchFolderImport(extractAsFolder(bytes, 'settings'), { side });
      expect(fromZip.issues).toEqual([]);
      expect(fromZip.ignoredFileCount).toBe(2);
      expect(withoutRoot(fromZip)).toEqual(withoutRoot(fromFolder));
      // 比較元と比較先の両方を持つ JSON は、選んだ側だけを読む（取り違えない）
      expect(fromZip.bundles.map((item) => item.appId)).toEqual(['12', '11', side === 'source' ? '13' : '14']);
    }
    expect(parseDiffBatchFolderImport(zip.files).issues.map((issue) => issue.code)).toEqual(['invalid-bundle']);
  });

  it('区切りが「\\」の ZIP（古い Windows の圧縮ツール）も、フォルダの区切りとして読む', async () => {
    const backslash = String.fromCharCode(92);
    const bytes = renameEntries(await zipOf({ 'apps/x.json': JSON.stringify(fieldBundle('21', '経費', 'x')) }, 'STORE'), 'apps/x.json', `apps${backslash}x.json`);
    const zip = await readDiffBatchZipFiles(bytes, 'old.zip');
    expect(zip.files.map((file) => [file.name, file.relativePath])).toEqual([['x.json', 'old.zip/apps/x.json']]);
    expect(parseDiffBatchFolderImport(zip.files, { side: 'source' }).bundles.map((item) => item.appId)).toEqual(['21']);
  });

  it('manifest.json と中身が合わない・壊れた JSON・接続先の重複は、フォルダ取込と同じ理由で止める', async () => {
    const mismatch = await zipOf({
      'manifest.json': JSON.stringify({ appCount: 3, preview: false, targets: [{ appId: '1' }, { appId: '2' }, { appId: '3' }] }),
      'a.json': JSON.stringify(fieldBundle('1', 'A', 'a')),
      'b.json': JSON.stringify(fieldBundle('2', 'B', 'b'))
    });
    const mismatchResult = parseDiffBatchFolderImport((await readDiffBatchZipFiles(mismatch, 'm.zip')).files, { side: 'source' });
    expect(mismatchResult.issues.map((issue) => issue.code)).toEqual(['manifest-mismatch']);
    expect(mismatchResult.issues[0].message).toContain('m.zip/manifest.json');
    expect(mismatchResult.issues).toEqual(parseDiffBatchFolderImport(extractAsFolder(mismatch, 'm.zip'), { side: 'source' }).issues);

    const brokenJson = await zipOf({ 'a.json': '{ broken', 'b.json': JSON.stringify(fieldBundle('2', 'B', 'b')) });
    expect(parseDiffBatchFolderImport((await readDiffBatchZipFiles(brokenJson, 'j.zip')).files, { side: 'source' }).issues.map((issue) => issue.code)).toEqual(['invalid-json']);

    const duplicate = await zipOf({ 'a.json': JSON.stringify(fieldBundle('2', 'B', 'a')), 'copy/a.json': JSON.stringify(fieldBundle('2', 'B', 'b')) });
    expect(parseDiffBatchFolderImport((await readDiffBatchZipFiles(duplicate, 'd.zip')).files, { side: 'source' }).issues.map((issue) => issue.code)).toEqual(['duplicate-endpoint']);
  });

  it('ZIP ではないファイル・途中で切れた ZIP・中身が壊れた ZIP は、理由を付けて止める', async () => {
    await expect(readDiffBatchZipFiles(new TextEncoder().encode(JSON.stringify(fieldBundle('1', 'A', 'a'))), 'a.zip')).rejects.toThrow('ZIPファイルとして読み込めません');
    const bytes = await zipOf({ 'a.json': JSON.stringify(fieldBundle('1', 'A', 'abcdefghij')) }, 'STORE');
    await expect(readDiffBatchZipFiles(bytes.slice(0, bytes.length - 30), 'cut.zip')).rejects.toThrow('ZIP の終端が見つかりません');
    const broken = bytes.slice();
    const at = new TextDecoder('latin1').decode(broken).indexOf('abcdefghij');
    broken[at] = 'z'.charCodeAt(0);
    await expect(readDiffBatchZipFiles(broken, 'crc.zip')).rejects.toThrow('「a.json」の内容が壊れています');
  });

  it('大きさを偽った ZIP（ZIP 爆弾）は、記録された大きさを超えて展開せずに止める', async () => {
    const packed = await zipOf({ 'app.json': new Uint8Array(32 * 1024 * 1024) });
    expect(packed.length).toBeLessThan(1024 * 1024);
    const bomb = setDeclaredSize(packed, 'app.json', 16);
    const inflated = countInflatedBytes();
    await expect(readDiffBatchZipFiles(bomb, 'bomb.zip')).rejects.toThrow('「app.json」の内容が壊れています');
    expect(inflated.bytes()).toBeLessThan(4 * 1024 * 1024);
  });

  it('件数・大きさの上限はフォルダ取込と同じで、展開する前に止める', async () => {
    const inflated = countInflatedBytes();
    const huge = setDeclaredSize(await zipOf({ 'a.json': JSON.stringify(fieldBundle('1', 'A', 'a')) }), 'a.json', 128 * 1024 * 1024 + 1);
    await expect(readDiffBatchZipFiles(huge, 'huge.zip')).rejects.toThrow('選択したZIPのJSON合計サイズが128MBを超えています');
    expect(inflated.bytes()).toBe(0);

    const manyJson: Record<string, string> = {};
    for (let i = 0; i < 501; i += 1) manyJson[`apps/${i}.json`] = '{}';
    await expect(readDiffBatchZipFiles(await zipOf(manyJson, 'STORE'), 'many.zip')).rejects.toThrow('選択したZIPのファイル数が多すぎます（全体2,000件、JSON 500件まで）');

    const manyFiles: Record<string, string> = { 'a.json': '{}' };
    for (let i = 0; i < 2000; i += 1) manyFiles[`js/${i}.js`] = '';
    await expect(readDiffBatchZipFiles(await zipOf(manyFiles, 'STORE'), 'files.zip')).rejects.toThrow('選択したZIPのファイル数が多すぎます');
    expect(inflated.bytes()).toBe(0);

    // ZIP ファイル自体の大きさ（全体をメモリへ読むため）
    const tooLarge = new Uint8Array(16);
    Object.defineProperty(tooLarge, 'byteLength', { value: DIFF_BATCH_ZIP_MAX_BYTES + 1 });
    await expect(readDiffBatchZipFiles(tooLarge, 'large.zip')).rejects.toThrow('ZIPファイルが256MBを超えています');
  });

  it('展開すると同じ名前になるファイルや、別の場所を指すパスがある ZIP は読まない', async () => {
    const sameName = renameEntries(await zipOf({ 'a.json': JSON.stringify(fieldBundle('1', 'A', 'a')), 'b.json': JSON.stringify(fieldBundle('2', 'B', 'b')) }, 'STORE'), 'b.json', 'a.json');
    await expect(readDiffBatchZipFiles(sameName, 'same.zip')).rejects.toThrow('ZIP内に同じ名前のファイルがあります（a.json、a.json）');
    const caseOnly = await zipOf({ 'Apps/A.json': JSON.stringify(fieldBundle('1', 'A', 'a')), 'apps/a.json': JSON.stringify(fieldBundle('2', 'B', 'b')) });
    await expect(readDiffBatchZipFiles(caseOnly, 'case.zip')).rejects.toThrow('ZIP内に同じ名前のファイルがあります');

    const parent = renameEntries(await zipOf({ 'xx/a.json': JSON.stringify(fieldBundle('1', 'A', 'a')) }, 'STORE'), 'xx/a.json', '../a.json');
    await expect(readDiffBatchZipFiles(parent, 'parent.zip')).rejects.toThrow('ZIP内のパス「../a.json」は展開すると別の場所を指す');
    const absolute = renameEntries(await zipOf({ 'xa.json': JSON.stringify(fieldBundle('1', 'A', 'a')) }, 'STORE'), 'xa.json', '/a.json');
    await expect(readDiffBatchZipFiles(absolute, 'abs.zip')).rejects.toThrow('ZIP内のパス「/a.json」');
  });
});
