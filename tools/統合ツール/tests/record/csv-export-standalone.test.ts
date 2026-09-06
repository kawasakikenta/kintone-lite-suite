import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiGet, fetchRecordsByQuery } from '../../src/api';
import { loadJSZipLite } from '../../src/jszipLoader';
import { downloadBlob } from '../../src/utils';
import {
  runCsvExportStandalone,
  runCsvExportBatchStandalone,
  runRecordBackupStandalone
} from '../../src/tabs/record-standalone';

vi.mock('../../src/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/api')>();
  return { ...actual, apiGet: vi.fn(), fetchRecordsByQuery: vi.fn() };
});
vi.mock('../../src/utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/utils')>();
  return { ...actual, downloadBlob: vi.fn() };
});
vi.mock('../../src/jszipLoader', () => ({ loadJSZipLite: vi.fn() }));

class FakeZip {
  static instances: FakeZip[] = [];
  files = new Map<string, string | Blob>();
  generateAsync = vi.fn(async () => new Blob(['synthetic zip'], { type: 'application/zip' }));

  constructor() { FakeZip.instances.push(this); }

  file(name: string, content: string | Blob) {
    // Real JSZip replaces duplicate names. The fake preserves that behavior so
    // assertions on folder counts detect accidental overwrites across apps.
    this.files.set(name, content);
    return this;
  }

  remove(name: string) {
    for (const key of this.files.keys()) {
      if (key === name || key.startsWith(`${name}/`)) this.files.delete(key);
    }
    return this;
  }

  folder(prefix: string) {
    return { file: (name: string, content: string | Blob) => this.file(`${prefix}/${name}`, content) };
  }
}

const field = (type: string, value: unknown) => ({ type, value });
const flatProperties = { title: { type: 'SINGLE_LINE_TEXT', code: 'title', label: '件名' } };
const tableProperties = {
  ...flatProperties,
  details: {
    type: 'SUBTABLE', code: 'details', label: '明細',
    fields: {
      product: { type: 'SINGLE_LINE_TEXT', code: 'product', label: '商品' },
      quantity: { type: 'NUMBER', code: 'quantity', label: '数量' }
    }
  },
  checks: {
    type: 'SUBTABLE', code: 'checks', label: '確認',
    fields: { reviewer: { type: 'SINGLE_LINE_TEXT', code: 'reviewer', label: '確認者' } }
  }
};
const tableRecords = () => [
  {
    $id: field('__ID__', '41'), $revision: field('__REVISION__', '8'), title: field('SINGLE_LINE_TEXT', '注文A'),
    details: field('SUBTABLE', [
      { id: '501', value: { product: field('SINGLE_LINE_TEXT', '商品A'), quantity: field('NUMBER', '2') } },
      { id: '502', value: { product: field('SINGLE_LINE_TEXT', '商品B'), quantity: field('NUMBER', '3') } }
    ]),
    checks: field('SUBTABLE', [
      { id: '701', value: { reviewer: field('SINGLE_LINE_TEXT', '担当A') } },
      { id: '702', value: { reviewer: field('SINGLE_LINE_TEXT', '担当B') } },
      { id: '703', value: { reviewer: field('SINGLE_LINE_TEXT', '担当C') } }
    ])
  },
  {
    $id: field('__ID__', '42'), $revision: field('__REVISION__', '3'), title: field('SINGLE_LINE_TEXT', '注文B'),
    details: field('SUBTABLE', [
      { id: '503', value: { product: field('SINGLE_LINE_TEXT', '商品C'), quantity: field('NUMBER', '4') } }
    ]),
    checks: field('SUBTABLE', [])
  }
];

const options = () => ({ appId: '7', guestId: '', query: 'order by title asc', filename: 'orders.csv' });
const status = vi.fn();

beforeEach(() => {
  vi.mocked(apiGet).mockReset().mockResolvedValue({ properties: tableProperties });
  vi.mocked(fetchRecordsByQuery).mockReset().mockResolvedValue({ records: tableRecords(), mode: 'cursor' } as any);
  vi.mocked(loadJSZipLite).mockReset().mockResolvedValue(FakeZip as any);
  vi.mocked(downloadBlob).mockReset();
  FakeZip.instances = [];
  status.mockReset();
});

function onlyZip() {
  expect(FakeZip.instances).toHaveLength(1);
  return FakeZip.instances[0];
}

function textFile(zip: FakeZip, name: string): string {
  expect(zip.files.has(name), `ZIP contains ${name}`).toBe(true);
  const content = zip.files.get(name);
  expect(typeof content).toBe('string');
  return content as string;
}

// Fixtures deliberately contain no quoted CSV values; escaping has separate
// unit coverage. Here the rows verify joins and cardinality at the ZIP boundary.
function rows(zip: FakeZip, name: string) {
  return textFile(zip, name).replace(/^\uFEFF/, '').split(/\r?\n/).map(line => line.split(','));
}

function expectTableFiles(zip: FakeZip, prefix = '') {
  const parent = rows(zip, `${prefix}records.csv`);
  const details = rows(zip, `${prefix}tables/details.csv`);
  const checks = rows(zip, `${prefix}tables/checks.csv`);
  expect(parent[0]).toEqual(['$id', 'title', 'details', 'checks']);
  expect(parent.slice(1).map(row => row[0])).toEqual(['41', '42']);
  expect(details[0]).toEqual(['$id', '$rowId', '$rowIndex', 'product', 'quantity']);
  expect(details.slice(1)).toEqual([
    ['41', '501', '1', '商品A', '2'],
    ['41', '502', '2', '商品B', '3'],
    ['42', '503', '1', '商品C', '4']
  ]);
  expect(checks).toHaveLength(4);
  expect(checks.slice(1).map(row => row[0])).toEqual(['41', '41', '41']);
  // Two independently repeating tables must not multiply the parent records.
  expect(parent).toHaveLength(3);
}

describe('standalone record CSV export', () => {
  it.each(['orders.csv', 'orders.zip'])('keeps ordinary CSV columns and a CSV extension for a flat app (%s)', async (filename) => {
    vi.mocked(apiGet).mockResolvedValue({ properties: flatProperties });
    vi.mocked(fetchRecordsByQuery).mockResolvedValue({
      records: [{ $id: field('__ID__', '41'), title: field('SINGLE_LINE_TEXT', '注文A') }], mode: 'cursor'
    } as any);

    await runCsvExportStandalone({ ...options(), filename }, status);

    expect(downloadBlob).toHaveBeenCalledOnce();
    const [name, blob] = vi.mocked(downloadBlob).mock.calls[0];
    expect(name).toBe('orders.csv');
    expect(blob.type).toBe('text/csv;charset=utf-8;');
    expect(Array.from(new Uint8Array(await blob.arrayBuffer()).slice(0, 3))).toEqual([239, 187, 191]);
    expect(await blob.text()).toBe('title\n注文A');
    expect(loadJSZipLite).not.toHaveBeenCalled();
    expect(fetchRecordsByQuery).toHaveBeenCalledWith('/k/v1', '7', 'order by title asc', expect.any(Object));
  });

  it('exports related parent and detail CSVs in a ZIP and replaces a supplied CSV extension', async () => {
    await runCsvExportStandalone(options(), status);

    const zip = onlyZip();
    expect([...zip.files.keys()].sort()).toEqual(['manifest.json', 'records.csv', 'tables/checks.csv', 'tables/details.csv']);
    expectTableFiles(zip);
    const manifest = JSON.parse(textFile(zip, 'manifest.json'));
    expect(manifest).toMatchObject({
      schemaVersion: 1, appId: '7', guestId: '', recordCount: 2, parentFile: 'records.csv', recordIdColumn: '$id', warnings: [],
      tables: [
        { fieldCode: 'details', fileName: 'tables/details.csv', rowCount: 3, parentIdColumn: '$id', rowIdColumn: '$rowId', rowIndexColumn: '$rowIndex' },
        { fieldCode: 'checks', fileName: 'tables/checks.csv', rowCount: 3, parentIdColumn: '$id', rowIdColumn: '$rowId', rowIndexColumn: '$rowIndex' }
      ]
    });
    expect(zip.generateAsync).toHaveBeenCalledWith({ type: 'blob' });
    expect(downloadBlob).toHaveBeenCalledWith('orders.zip', expect.any(Blob));
  });

  it('uses the table ZIP layout when batch export contains only one app', async () => {
    await runCsvExportBatchStandalone({ apps: [{ appId: '7', guestId: '3' }], filename: 'single.CSV' }, status);

    expectTableFiles(onlyZip());
    expect(downloadBlob).toHaveBeenCalledWith('single.zip', expect.any(Blob));
    expect(apiGet).toHaveBeenCalledWith('/k/guest/3/v1', '/app/form/fields.json', { app: '7' });
  });

  it('does not publish partial data when fetching records fails', async () => {
    vi.mocked(fetchRecordsByQuery).mockRejectedValue(new Error('レコードの続きを取得できません'));

    await expect(runCsvExportStandalone(options(), status)).rejects.toThrow('レコードの続きを取得できません');

    expect(downloadBlob).not.toHaveBeenCalled();
    expect(FakeZip.instances.every(zip => zip.generateAsync.mock.calls.length === 0)).toBe(true);
  });

  it('does not offer a download if ZIP generation fails', async () => {
    vi.mocked(loadJSZipLite).mockResolvedValue(class extends FakeZip {
      constructor() {
        super();
        this.generateAsync.mockRejectedValue(new Error('ZIPを作成できません'));
      }
    } as any);

    await expect(runCsvExportStandalone(options(), status)).rejects.toThrow('ZIPを作成できません');
    expect(downloadBlob).not.toHaveBeenCalled();
  });
});

describe('batch record CSV export', () => {
  it('isolates app and guest data in unique folders, including a repeated app and a flat app', async () => {
    vi.mocked(apiGet).mockImplementation(async (_prefix, _path, params: any) => ({
      properties: params.app === '8' ? flatProperties : tableProperties
    }));
    vi.mocked(fetchRecordsByQuery).mockImplementation(async (_prefix, app) => ({
      records: app === '8' ? [{ $id: field('__ID__', '99'), title: field('SINGLE_LINE_TEXT', 'テーブルなし') }] : tableRecords(),
      mode: 'keyset'
    } as any));

    await runCsvExportBatchStandalone({ apps: [
      { appId: '7' }, { appId: '7', guestId: '3' }, { appId: '7', guestId: '3' }, { appId: '8' }
    ], filename: 'batch.csv' }, status);

    const zip = onlyZip();
    const parents = [...zip.files.keys()].filter(name => name.endsWith('/records.csv'));
    expect(parents).toHaveLength(4);
    expect(new Set(parents.map(name => name.split('/')[0])).size).toBe(4);
    const tableParents = parents.filter(name => name.startsWith('app_7'));
    expect(tableParents).toHaveLength(3);
    expect(tableParents.filter(name => name.includes('guest3'))).toHaveLength(2);
    for (const name of tableParents) {
      const prefix = name.slice(0, -'records.csv'.length);
      expectTableFiles(zip, prefix);
      expect(JSON.parse(textFile(zip, `${prefix}manifest.json`))).toMatchObject({ appId: '7', recordCount: 2 });
    }
    const flatParent = parents.find(name => name.startsWith('app_8'))!;
    expect(rows(zip, flatParent)).toEqual([['title'], ['テーブルなし']]);
    expect([...zip.files.keys()].some(name => name.startsWith('app_8/tables/'))).toBe(false);
    expect(textFile(zip, 'manifest.txt')).toContain('成功 4 / 失敗 0');
    expect(textFile(zip, 'manifest.txt')).toContain('総レコード数: 7');
    expect(downloadBlob).toHaveBeenCalledWith('batch.zip', expect.any(Blob));
  });

  it('keeps successful tables, excludes the failed app, and reports partial success', async () => {
    vi.mocked(fetchRecordsByQuery).mockImplementation(async (_prefix, app) => {
      if (app === '8') throw new Error('明細取得中に通信が切れました');
      return { records: tableRecords(), mode: 'keyset' } as any;
    });

    await runCsvExportBatchStandalone({ apps: [{ appId: '7' }, { appId: '8' }], filename: 'partial.csv' }, status);

    const zip = onlyZip();
    const parentFiles = [...zip.files.keys()].filter(name => name.endsWith('/records.csv'));
    expect(parentFiles).toHaveLength(1);
    expectTableFiles(zip, parentFiles[0].slice(0, -'records.csv'.length));
    expect([...zip.files.keys()].some(name => name.startsWith('app_8/'))).toBe(false);
    const manifest = textFile(zip, 'manifest.txt');
    expect(manifest).toContain('成功 1 / 失敗 1');
    expect(manifest).toContain('App 8: 明細取得中に通信が切れました');
    expect(manifest).toContain('総レコード数: 2');
    expect(status).toHaveBeenLastCalledWith(expect.stringContaining('失敗 1アプリ'), true);
    expect(downloadBlob).toHaveBeenCalledWith('partial.zip', expect.any(Blob));
  });

  it('removes a partially written app folder if adding one of its table files fails', async () => {
    vi.mocked(loadJSZipLite).mockResolvedValue(class extends FakeZip {
      file(name: string, content: string | Blob) {
        if (name === 'app_8/tables/details.csv') throw new Error('明細をZIPへ追加できません');
        return super.file(name, content);
      }
    } as any);

    await runCsvExportBatchStandalone({ apps: [{ appId: '7' }, { appId: '8' }] }, status);

    const zip = onlyZip();
    expectTableFiles(zip, 'app_7/');
    expect([...zip.files.keys()].some(name => name.startsWith('app_8/'))).toBe(false);
    expect(textFile(zip, 'manifest.txt')).toContain('App 8: 明細をZIPへ追加できません');
    expect(textFile(zip, 'manifest.txt')).toContain('総レコード数: 2');
    expect(downloadBlob).toHaveBeenCalledOnce();
    expect(status).toHaveBeenLastCalledWith(expect.stringContaining('失敗 1アプリ'), true);
  });

  it('does not download a misleading empty ZIP when every app fails', async () => {
    vi.mocked(apiGet).mockRejectedValue(new Error('閲覧権限がありません'));

    await expect(runCsvExportBatchStandalone({ apps: [{ appId: '7' }, { appId: '8' }] }, status))
      .rejects.toThrow('すべてのアプリで CSV 出力に失敗');

    expect(downloadBlob).not.toHaveBeenCalled();
    expect(onlyZip().generateAsync).not.toHaveBeenCalled();
  });
});

describe('record backup table CSV integration', () => {
  it('adds detail CSVs while preserving the original records JSON, IDs, and existing backup metadata', async () => {
    const original = tableRecords();
    const before = structuredClone(original);
    vi.mocked(fetchRecordsByQuery).mockResolvedValue({ records: original, mode: 'cursor' } as any);

    await runRecordBackupStandalone({
      appId: '7', guestId: '', query: 'order by title asc', zipName: 'backup.zip',
      includeFiles: false, includeComments: false, includeAppSettings: false, appScopes: []
    }, status);

    const zip = onlyZip();
    expect([...zip.files.keys()].sort()).toEqual([
      'manifest.json', 'records.csv', 'records.json', 'tables/checks.csv', 'tables/details.csv'
    ]);
    expectTableFiles(zip);
    const data = JSON.parse(textFile(zip, 'records.json'));
    expect(data).toMatchObject({ appId: '7', recordCount: 2, records: before });
    expect(original).toEqual(before);
    const manifest = JSON.parse(textFile(zip, 'manifest.json'));
    expect(manifest).toMatchObject({
      appId: '7', recordCount: 2, fileCount: 0, commentCount: 0,
      fileFailures: [], commentFailures: [], appSettings: { ok: 0, ng: 0, ngSections: [], scopes: [] }
    });
    expect(manifest.csvExport).toBeDefined();
    expect(JSON.stringify(manifest.csvExport)).toContain('records.csv');
    expect(JSON.stringify(manifest.csvExport)).toContain('tables/details.csv');
    expect(manifest.notes).toContain('添付ファイル未取得');
    expect(downloadBlob).toHaveBeenCalledWith('backup.zip', expect.any(Blob));
  });

  it('does not publish a backup with incomplete record retrieval', async () => {
    vi.mocked(fetchRecordsByQuery).mockRejectedValue(new Error('レコード取得に失敗'));

    await expect(runRecordBackupStandalone({ appId: '7' }, status)).rejects.toThrow('レコード取得に失敗');

    expect(downloadBlob).not.toHaveBeenCalled();
    expect(FakeZip.instances.every(zip => zip.generateAsync.mock.calls.length === 0)).toBe(true);
  });
});

describe('CSV export completeness warnings', () => {
  it.each(['single', 'batch', 'backup'])('reports an unreturned table in the %s manifest and completion status', async (mode) => {
    const records: any[] = tableRecords();
    delete records[0].details;
    vi.mocked(fetchRecordsByQuery).mockResolvedValue({ records, mode: 'keyset' } as any);

    if (mode === 'single') await runCsvExportStandalone(options(), status);
    else if (mode === 'batch') await runCsvExportBatchStandalone({ apps: [{ appId: '7' }, { appId: '8' }] }, status);
    else await runRecordBackupStandalone({ appId: '7' }, status);

    const zip = onlyZip();
    const manifest = JSON.parse(textFile(zip, mode === 'batch' ? 'app_7/manifest.json' : 'manifest.json'));
    const csv = mode === 'backup' ? manifest.csvExport : manifest;
    expect(csv.warnings).toHaveLength(1);
    expect(csv.warnings[0]).toContain('41');
    expect(csv.warnings[0]).toContain('details');
    expect(status).toHaveBeenLastCalledWith(expect.stringMatching(/未取得|取得失敗/), true);
    expect(downloadBlob).toHaveBeenCalledOnce();
  });
});
