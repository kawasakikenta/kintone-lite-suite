import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { buildCopyRecordPayloads, parseCsvText, runRecordAppBatchStandalone, runRecordCopyStandalone, validateCsvImportHeader } from '../../src/tabs/record-standalone';

// レコードコピーの payload は本番アプリへ POST される。システム項目・ファイルの除外と
// サブテーブル行に id を含めないことは kintone REST の制約なので回帰を固定する。

describe('buildCopyRecordPayloads', () => {
  const record = {
    $id: { type: '__ID__', value: '10' },
    $revision: { type: '__REVISION__', value: '3' },
    レコード番号: { type: 'RECORD_NUMBER', value: '10' },
    作成者: { type: 'CREATOR', value: { code: 'u' } },
    title: { type: 'SINGLE_LINE_TEXT', value: 'hello' },
    total: { type: 'CALC', value: '100' },
    attach: { type: 'FILE', value: [{ fileKey: 'k', name: 'a.pdf' }] },
    table: {
      type: 'SUBTABLE',
      value: [{
        id: '55',
        value: {
          item: { type: 'SINGLE_LINE_TEXT', value: 'row' },
          rowFile: { type: 'FILE', value: [{ fileKey: 'k2' }] },
          rowCalc: { type: 'CALC', value: '1' }
        }
      }]
    }
  };

  it('drops system, calc and file fields and strips subtable row ids', () => {
    const plan = buildCopyRecordPayloads([record]);
    expect(plan.records).toEqual([{
      title: { value: 'hello' },
      table: { value: [{ value: { item: { value: 'row' } } }] }
    }]);
    expect(plan.droppedFields).toEqual([]);
  });

  it('collects top-level FILE fields in droppedFileFields', () => {
    const plan = buildCopyRecordPayloads([record]);
    expect(plan.droppedFileFields).toContain('attach');
    expect(plan.droppedFields).not.toContain('attach');
  });

  it('collects subtable FILE fields as tableCode.fieldCode in droppedFileFields', () => {
    const plan = buildCopyRecordPayloads([record]);
    expect(plan.droppedFileFields).toContain('table.rowFile');
    expect(plan.droppedFields).not.toContain('table.rowFile');
  });

  it('counts records that have at least one non-empty file attachment', () => {
    // record has attach with 1 file → recordsWithFiles = 1
    const plan = buildCopyRecordPayloads([record]);
    expect(plan.recordsWithFiles).toBe(1);
  });

  it('does not count records where all FILE values are empty arrays', () => {
    const recNoFile = {
      ...record,
      attach: { type: 'FILE', value: [] },
      table: {
        type: 'SUBTABLE',
        value: [{ id: '55', value: { item: { type: 'SINGLE_LINE_TEXT', value: 'row' }, rowFile: { type: 'FILE', value: [] } } }]
      }
    };
    const plan = buildCopyRecordPayloads([recNoFile]);
    expect(plan.droppedFileFields).toContain('attach');
    expect(plan.droppedFileFields).toContain('table.rowFile');
    expect(plan.recordsWithFiles).toBe(0);
  });

  it('returns empty droppedFileFields and zero recordsWithFiles when no FILE fields exist', () => {
    const recNoFile = { title: { type: 'SINGLE_LINE_TEXT', value: 'x' } };
    const plan = buildCopyRecordPayloads([recNoFile]);
    expect(plan.droppedFileFields).toEqual([]);
    expect(plan.recordsWithFiles).toBe(0);
  });

  it('preserves existing droppedFields behavior unchanged', () => {
    const targetProps = {
      title: { type: 'SINGLE_LINE_TEXT', code: 'title' },
      table: { type: 'SUBTABLE', code: 'table', fields: { other: { type: 'SINGLE_LINE_TEXT' } } }
    };
    const plan = buildCopyRecordPayloads([{ ...record, extra: { type: 'NUMBER', value: '1' }, title: { type: 'MULTI_LINE_TEXT', value: 'x' } }], targetProps);
    expect(plan.records).toEqual([{ table: { value: [{ value: {} }] } }]);
    expect(plan.droppedFields).toEqual(['extra', 'table.item', 'title(型不一致)']);
  });

  it('does not include id in subtable rows (regression)', () => {
    const plan = buildCopyRecordPayloads([record]);
    const row = plan.records[0]?.table?.value?.[0];
    expect(row).toBeDefined();
    expect(Object.keys(row)).toEqual(['value']);
    expect('id' in row).toBe(false);
  });

  it('drops subtable cells whose type differs from the target app and reports them', () => {
    const targetProps = {
      table: { type: 'SUBTABLE', code: 'table', fields: { item: { type: 'NUMBER' }, rowCalc: { type: 'CALC' } } }
    };
    const plan = buildCopyRecordPayloads([{
      table: { type: 'SUBTABLE', value: [{ id: '1', value: { item: { type: 'SINGLE_LINE_TEXT', value: 'x' }, num: { type: 'NUMBER', value: '1' } } }] }
    }], targetProps);
    expect(plan.records).toEqual([{ table: { value: [{ value: {} }] } }]);
    expect(plan.droppedFields).toEqual(['table.item(型不一致)', 'table.num']);
  });

  it('keeps subtable cells whose type matches the target app', () => {
    const targetProps = {
      title: { type: 'SINGLE_LINE_TEXT', code: 'title' },
      table: { type: 'SUBTABLE', code: 'table', fields: { item: { type: 'SINGLE_LINE_TEXT' } } }
    };
    const plan = buildCopyRecordPayloads([record], targetProps);
    expect(plan.records).toEqual([{ title: { value: 'hello' }, table: { value: [{ value: { item: { value: 'row' } } }] } }]);
    expect(plan.droppedFields).toEqual([]);
  });

  it('drops fields the target app does not have (or has with another type) and reports them', () => {
    const targetProps = {
      title: { type: 'SINGLE_LINE_TEXT', code: 'title' },
      table: { type: 'SUBTABLE', code: 'table', fields: { other: { type: 'SINGLE_LINE_TEXT' } } }
    };
    const plan = buildCopyRecordPayloads([{ ...record, extra: { type: 'NUMBER', value: '1' }, title: { type: 'MULTI_LINE_TEXT', value: 'x' } }], targetProps);
    expect(plan.records).toEqual([{ table: { value: [{ value: {} }] } }]);
    expect(plan.droppedFields).toEqual(['extra', 'table.item', 'title(型不一致)']);
  });
});

describe('runRecordCopyStandalone', () => {
  const api = vi.fn();
  const confirm = vi.fn();
  const status = vi.fn();
  const options = { sourceAppId: '1', sourceGuestId: '', targetAppId: '2', targetGuestId: '', query: '' };
  const source = [{ $id: { type: '__ID__', value: '1' }, title: { type: 'SINGLE_LINE_TEXT', value: 'a' } }];
  const posts = () => api.mock.calls.filter((call) => call[1] === 'POST');

  beforeEach(() => {
    api.mockReset();
    confirm.mockReset().mockReturnValue(true);
    status.mockReset();
    vi.stubGlobal('kintone', { api });
    vi.stubGlobal('window', { confirm });
  });
  afterEach(() => { vi.unstubAllGlobals(); });

  it('refuses to create empty records when no field of the target app matches the source', async () => {
    api.mockResolvedValueOnce({ properties: { other: { type: 'SINGLE_LINE_TEXT', code: 'other' } } }).mockResolvedValueOnce({ records: source });
    await expect(runRecordCopyStandalone(options, status)).rejects.toThrow(/コピーできるフィールドがありません.*title/s);
    expect(confirm).not.toHaveBeenCalled();
    expect(posts()).toHaveLength(0);
  });

  it('rejects a malformed field settings response instead of treating every field as missing', async () => {
    api.mockResolvedValueOnce({});
    await expect(runRecordCopyStandalone(options, status)).rejects.toThrow(/フィールド設定の応答が不正/);
    expect(api).toHaveBeenCalledTimes(1);
  });

  it('reports a declined confirmation as cancelled and an empty source as a warning', async () => {
    api.mockResolvedValueOnce({ properties: { title: { type: 'SINGLE_LINE_TEXT', code: 'title' } } }).mockResolvedValueOnce({ records: source });
    confirm.mockReturnValue(false);
    await expect(runRecordCopyStandalone(options, status)).resolves.toEqual({ cancelled: true });
    expect(posts()).toHaveLength(0);

    api.mockReset();
    api.mockResolvedValueOnce({ properties: { title: { type: 'SINGLE_LINE_TEXT', code: 'title' } } }).mockResolvedValueOnce({ records: [] });
    await expect(runRecordCopyStandalone(options, status)).resolves.toEqual({ warning: 'コピー対象のレコードがありません' });
    expect(status).toHaveBeenLastCalledWith('コピー対象のレコードがありません', 'warn');
  });

  it('posts matching fields after confirmation', async () => {
    api.mockResolvedValueOnce({ properties: { title: { type: 'SINGLE_LINE_TEXT', code: 'title' } } }).mockResolvedValueOnce({ records: source }).mockResolvedValue({});
    await runRecordCopyStandalone(options, status);
    expect(posts().map((call) => call[2])).toEqual([{ app: '2', records: [{ title: { value: 'a' } }] }]);
    expect(status).toHaveBeenLastCalledWith('1件をコピーしました（コピー先 App 2）', 'ok');
  });

  it('returns the copied count to the app batch and keeps the dropped-field note as a warning', async () => {
    api.mockResolvedValueOnce({ properties: { title: { type: 'SINGLE_LINE_TEXT', code: 'title' } } })
      .mockResolvedValueOnce({ records: [{ $id: { type: '__ID__', value: '1' }, title: { type: 'SINGLE_LINE_TEXT', value: 'a' }, memo: { type: 'SINGLE_LINE_TEXT', value: 'b' } }] })
      .mockResolvedValue({});
    await runRecordAppBatchStandalone('2', (targetAppId) => runRecordCopyStandalone({ ...options, targetAppId }, status), status);
    const [message, tone] = status.mock.calls.at(-1) as [string, string];
    expect(message.split('\n')[0]).toBe('1件をコピーしました（コピー先 App 2）');
    expect(message).toContain('コピー先に無い/型が違うため除外: memo');
    expect(tone).toBe('warn');
  });
});

describe('parseCsvText', () => {
  it('handles quoted cells with commas, escaped quotes and CRLF', () => {
    expect(parseCsvText('a,b\r\n"x,y","say ""hi"""\n')).toEqual([['a', 'b'], ['x,y', 'say "hi"']]);
  });

  it('keeps newlines inside quoted cells', () => {
    expect(parseCsvText('a\n"line1\nline2"')).toEqual([['a'], ['line1\nline2']]);
  });
});

describe('validateCsvImportHeader', () => {
  const props = { title: { type: 'SINGLE_LINE_TEXT' }, attach: { type: 'FILE' } };
  it('rejects $id, unknown codes and unsupported types', () => {
    expect(() => validateCsvImportHeader(['$id'], props)).toThrow(/システムフィールド/);
    expect(() => validateCsvImportHeader(['nope'], props)).toThrow(/存在しないフィールドコード.*nope/);
    expect(() => validateCsvImportHeader(['attach'], props)).toThrow(/非対応.*attach\(FILE\)/);
    expect(() => validateCsvImportHeader(['title', ''], props)).toThrow(/空の列/);
    expect(() => validateCsvImportHeader(['title'], props)).not.toThrow();
  });
});
