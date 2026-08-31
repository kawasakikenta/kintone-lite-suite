import { describe, it, expect } from 'vitest';
import {
  buildDiffXlsxBlob as buildDiffXlsxBlobWithSafeDefault,
  buildDiffXlsxExport as buildDiffXlsxExportWithSafeDefault,
  buildDiffXlsxFieldModel,
  type DiffXlsxContext
} from '../../src/diff/xlsx-export';
import { computeDiffRows } from '../../src/diff/engine';
import { enrichDiffRows } from '../../src/diff/enrich';

// 既存の内部監査版の回帰は明示的に internal として維持する。
const buildDiffXlsxBlob = (ctx: DiffXlsxContext) => buildDiffXlsxBlobWithSafeDefault({ ...ctx, audience: ctx.audience || 'internal' });
const buildDiffXlsxExport = (ctx: DiffXlsxContext) => buildDiffXlsxExportWithSafeDefault({ ...ctx, audience: ctx.audience || 'internal' });

async function readEntry(blob: Blob, name: string): Promise<string> {
  const ab = await blob.arrayBuffer();
  const buf = Buffer.from(ab);
  for (let off = 0; off < buf.length - 4; off++) {
    if (buf.readUInt32LE(off) === 0x04034b50) {
      const nameLen = buf.readUInt16LE(off + 26);
      const extraLen = buf.readUInt16LE(off + 28);
      const compressed = buf.readUInt32LE(off + 18);
      const entryName = buf.slice(off + 30, off + 30 + nameLen).toString('utf8');
      if (entryName === name) {
        const dataStart = off + 30 + nameLen + extraLen;
        return buf.slice(dataStart, dataStart + compressed).toString('utf8');
      }
    }
  }
  throw new Error(`entry not found: ${name}`);
}

async function readAllEntryText(blob: Blob): Promise<string> {
  const buf = Buffer.from(await blob.arrayBuffer());
  const entries: string[] = [];
  for (let off = 0; off < buf.length - 4;) {
    if (buf.readUInt32LE(off) !== 0x04034b50) { off += 1; continue; }
    const nameLen = buf.readUInt16LE(off + 26);
    const extraLen = buf.readUInt16LE(off + 28);
    const size = buf.readUInt32LE(off + 18);
    const dataStart = off + 30 + nameLen + extraLen;
    entries.push(buf.slice(off + 30, off + 30 + nameLen).toString('utf8'));
    entries.push(buf.slice(dataStart, dataStart + size).toString('utf8'));
    off = dataStart + size;
  }
  return entries.join('\n');
}

async function readWorksheetEntries(blob: Blob): Promise<string[]> {
  const workbook = await readEntry(blob, 'xl/workbook.xml');
  const count = (workbook.match(/<sheet\s/g) || []).length;
  return Promise.all(Array.from({ length: count }, (_, index) => (
    readEntry(blob, `xl/worksheets/sheet${index + 1}.xml`)
  )));
}

async function readWorksheetByName(blob: Blob, name: string): Promise<string> {
  const workbook = await readEntry(blob, 'xl/workbook.xml');
  const sheetNames = [...workbook.matchAll(/<sheet\b[^>]*\bname="([^"]+)"[^>]*\/>/g)]
    .map((match) => match[1]
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&'));
  const index = sheetNames.indexOf(name);
  if (index < 0) throw new Error(`worksheet not found: ${name}`);
  return readEntry(blob, `xl/worksheets/sheet${index + 1}.xml`);
}

async function readWorkbookSheetNames(blob: Blob): Promise<string[]> {
  const workbook = await readEntry(blob, 'xl/workbook.xml');
  return [...workbook.matchAll(/<sheet\b[^>]*\bname="([^"]+)"[^>]*\/>/g)]
    .map((match) => decodeXmlText(match[1]));
}

function worksheetRowContaining(worksheet: string, text: string): string {
  const rows = [...worksheet.matchAll(/<row\b[^>]*>[\s\S]*?<\/row>/g)]
    .map((match) => match[0])
    .filter((xml) => xml.includes(text));
  const row = rows[rows.length - 1];
  if (!row) throw new Error(`worksheet row not found: ${text}`);
  return row;
}

function worksheetRowHeight(worksheet: string, row: number): number {
  return Number(new RegExp(`<row r="${row}" ht="([0-9.]+)" customHeight="1">`).exec(worksheet)?.[1] || 0);
}

function decodeXmlText(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

function hasLoneSurrogate(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const codeUnit = value.charCodeAt(index);
    if (codeUnit >= 0xd800 && codeUnit <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) return true;
      index += 1;
    } else if (codeUnit >= 0xdc00 && codeUnit <= 0xdfff) {
      return true;
    }
  }
  return false;
}

function worksheetInlineTexts(worksheet: string, column: string, firstRow = 1): string[] {
  return [...worksheet.matchAll(/<c r="([A-Z]+)(\d+)"[^>]*t="inlineStr"><is><t[^>]*>([\s\S]*?)<\/t><\/is><\/c>/g)]
    .filter((match) => match[1] === column && Number(match[2]) >= firstRow)
    .sort((a, b) => Number(a[2]) - Number(b[2]))
    .map((match) => decodeXmlText(match[3]));
}

function worksheetNumbers(worksheet: string, column: string, firstRow = 1): number[] {
  return [...worksheet.matchAll(/<c r="([A-Z]+)(\d+)"[^>]*><v>([0-9.]+)<\/v><\/c>/g)]
    .filter((match) => match[1] === column && Number(match[2]) >= firstRow)
    .sort((a, b) => Number(a[2]) - Number(b[2]))
    .map((match) => Number(match[3]));
}

const sampleCtx: DiffXlsxContext = {
  audience: 'internal',
  generatedAt: '2026-08-16T00:00:00.000Z',
  comparedAt: '2026-08-15T23:59:00.000Z',
  sourceBundle: { appId: 1, guestId: '', preview: false, fetchedAt: '2026-08-15T23:57:00.000Z', meta: { appName: 'アプリA' } },
  targetBundle: { appId: 2, guestId: '7', preview: true, fetchedAt: '2026-08-15T23:58:00.000Z', meta: { appName: 'アプリB' } },
  scopes: ['fieldSettings', 'viewSettings'],
  ignoreKeys: 'revision',
  normalizationPresetState: { viewOrder: true, permissionOrder: false },
  exportMode: 'filtered',
  exportLabel: '表示中（フィルタ適用後）',
  exportContentMode: 'diffOnly',
  filterDescription: '画面の絞り込み: 変更種別=追加・変更・削除',
  rows: [
    { sectionKey: 'fieldSettings', type: 'added', severity: 'high', path: 'fieldSettings.properties.foo', label: 'フィールド「foo」', right: { code: 'foo', type: 'SINGLE_LINE_TEXT' } },
    { sectionKey: 'fieldSettings', type: 'changed', severity: 'low', path: 'fieldSettings.properties.bar.label', label: 'フィールド「bar」 / フィールド名', left: '旧ラベル', right: '新ラベル', reasonSummary: '表示名が変更されています' },
    { sectionKey: 'viewSettings', type: 'removed', severity: 'medium', path: 'viewSettings.views.一覧A', label: 'ビュー「一覧A」', left: { type: 'LIST' } }
  ],
  fetchIssues: [
    { sectionKey: 'pluginSettings', side: 'source', message: '権限不足' }
  ]
};

describe('diff/xlsx-export', () => {
  it('groups customer field settings by field and view settings by view in the coarse sheet', async () => {
    const fields = {
      customer: { code: 'customer', label: '顧客', type: 'SINGLE_LINE_TEXT', required: false }
    };
    const views = {
      '営業': { id: '100', type: 'LIST' },
      '営業.sort': { id: '880', type: 'LIST', fields: ['customer'], filterCond: '', sort: '' }
    };
    const blob = buildDiffXlsxBlobWithSafeDefault({
      sourceBundle: {
        sections: {
          fieldSettings: { properties: fields },
          viewSettings: { views }
        }
      },
      targetBundle: {
        sections: {
          fieldSettings: { properties: { customer: { ...fields.customer, label: '取引先', required: true } } },
          viewSettings: { views }
        }
      },
      rows: [
        { sectionKey: 'fieldSettings', type: 'changed', path: 'fieldSettings.properties.customer.label', left: '顧客', right: '取引先' },
        { sectionKey: 'fieldSettings', type: 'changed', path: 'fieldSettings.properties.customer.required', left: false, right: true },
        { sectionKey: 'viewSettings', type: 'changed', path: 'viewSettings.views.営業.sort.filterCond', left: '', right: 'customer != ""' },
        { sectionKey: 'viewSettings', type: 'added', path: 'viewSettings.views.営業.sort.fields[0]', right: 'customer' },
        { sectionKey: 'viewSettings', type: 'removed', path: 'viewSettings.views.営業.sort.fields[1]', left: 'old_field' }
      ]
    });
    const targets = await readWorksheetByName(blob, '変更対象一覧');

    expect((targets.match(/<row r="/g) || []).length).toBe(4);
    expect(worksheetInlineTexts(targets, 'B', 3)).toEqual(['フィールド', '一覧']);
    expect(worksheetInlineTexts(targets, 'C', 3)[0]).toContain('取引先');
    expect(worksheetInlineTexts(targets, 'C', 3)[1]).toBe('一覧「営業.sort」');
    expect(worksheetInlineTexts(targets, 'D', 3)).toEqual(['設定変更', '複合変更']);
    expect(worksheetInlineTexts(targets, 'E', 3)[0]).toContain('フィールド名');
    expect(worksheetInlineTexts(targets, 'E', 3)[1]).toContain('絞り込み条件');
    expect(targets).toMatch(/<c r="F3"[^>]*><v>2<\/v><\/c>/);
    expect(targets).toMatch(/<c r="F4"[^>]*><v>3<\/v><\/c>/);
    expect(targets).toContain('<hyperlink ref="G3" location="&apos;変更一覧&apos;!D2"');
    expect(targets).toContain('<hyperlink ref="G4" location="&apos;変更一覧&apos;!D4"');
    expect(targets).toMatch(/<c r="B3" s="45"/);
    expect(targets).toMatch(/<c r="B4" s="31"/);
    for (const cell of ['C3', 'E3']) expect(targets).toMatch(new RegExp(`<c r="${cell}" s="2"`));
    for (const cell of ['C4', 'E4']) expect(targets).toMatch(new RegExp(`<c r="${cell}" s="23"`));
    for (const cell of ['A3', 'F3']) expect(targets).toMatch(new RegExp(`<c r="${cell}" s="22"`));
    for (const cell of ['A4', 'F4']) expect(targets).toMatch(new RegExp(`<c r="${cell}" s="24"`));
    expect(targets).toMatch(/<c r="D4" s="27"/);
    expect(targets).toMatch(/<c r="G4" s="30"/);
    expect(targets).not.toContain('一覧追加');
    expect(targets).not.toContain('一覧削除');
  });

  it('links only to sheets that exist in the customer workbook', async () => {
    const blob = buildDiffXlsxBlobWithSafeDefault({
      rows: [
        { sectionKey: 'fieldSettings', type: 'changed', path: 'fieldSettings.properties.foo.label', left: '旧ラベル', right: '新ラベル' },
        { sectionKey: 'viewSettings', type: 'changed', path: 'viewSettings.views.A一覧.filterCond', left: '', right: 'status = "open"' },
        { sectionKey: 'actionSettings', type: 'changed', path: 'actionSettings.actions.A転記.enabled', left: true, right: false }
      ],
      fetchIssues: [{ sectionKey: 'pluginSettings', side: 'source', message: '権限不足' }]
    });
    const sheetNames = await readWorkbookSheetNames(blob);
    const worksheets = await readWorksheetEntries(blob);
    const locations = worksheets.flatMap((worksheet) => (
      [...worksheet.matchAll(/<hyperlink [^>]*location="([^"]+)"/g)].map((match) => decodeXmlText(match[1]))
    ));
    expect(locations.length).toBeGreaterThan(0);
    for (const location of locations) {
      const target = /^'(.+)'![A-Z]+\d+$/.exec(location);
      expect(target, location).not.toBeNull();
      expect(sheetNames).toContain(target![1].replace(/''/g, "'"));
    }
  });

  it('styles customer No. columns as plain centered cells without dead detail-sheet links', async () => {
    const blob = buildDiffXlsxBlobWithSafeDefault({
      rows: [
        { sectionKey: 'fieldSettings', type: 'changed', path: 'fieldSettings.properties.foo.label', left: '旧ラベル', right: '新ラベル' },
        { sectionKey: 'fieldSettings', type: 'changed', path: 'fieldSettings.properties.bar.label', left: '旧', right: '新' },
        { sectionKey: 'viewSettings', type: 'changed', path: 'viewSettings.views.A一覧.filterCond', left: '', right: 'status = "open"' },
        { sectionKey: 'actionSettings', type: 'changed', path: 'actionSettings.actions.A転記.enabled', left: true, right: false }
      ]
    });
    const workbook = await readEntry(blob, 'xl/workbook.xml');
    const list = await readWorksheetByName(blob, '変更一覧');
    const fields = await readWorksheetByName(blob, '03_フォームフィールド');
    const views = await readWorksheetByName(blob, '06_一覧設定');
    const actions = await readWorksheetByName(blob, '13_アプリアクション');

    expect(workbook).not.toContain('設定値詳細');
    expect(list).toContain('<c r="A2" s="22"');
    expect(list).toContain('<c r="A3" s="24"');
    expect(list).not.toContain('<hyperlink ref="A');
    expect(list).toContain('<hyperlink ref="C2" location="&apos;03_フォームフィールド&apos;!A1"');
    for (const feature of [fields, views, actions]) {
      expect(feature).not.toContain('<hyperlinks>');
      expect(feature).not.toContain('s="30"');
      expect(feature).toContain('<c r="A3" s="22"');
    }
  });

  it('uses the bold zebra category style when a second customer target starts on an alternate row', async () => {
    const blob = buildDiffXlsxBlobWithSafeDefault({
      rows: [
        {
          sectionKey: 'notifications', type: 'changed',
          path: 'notifications.notifications[0].recipients[0]',
          entityKind: 'notification', entityLabel: 'A通知', entityPropLabel: '通知先',
          left: { entity: { type: 'USER', code: 'old-user-a' } },
          right: { entity: { type: 'USER', code: 'new-user-a' } }
        },
        {
          sectionKey: 'notifications', type: 'changed',
          path: 'notifications.notifications[1].recipients[0]',
          entityKind: 'notification', entityLabel: 'B通知', entityPropLabel: '通知先',
          left: { entity: { type: 'USER', code: 'old-user-b' } },
          right: { entity: { type: 'USER', code: 'new-user-b' } }
        },
        {
          sectionKey: 'viewSettings', type: 'changed',
          path: 'viewSettings.views.A一覧.filterCond', left: '', right: 'status = "open"'
        },
        {
          sectionKey: 'viewSettings', type: 'changed',
          path: 'viewSettings.views.B一覧.filterCond', left: '', right: 'status = "closed"'
        },
        {
          sectionKey: 'actionSettings', type: 'changed',
          path: 'actionSettings.actions.A転記.enabled', left: true, right: false
        },
        {
          sectionKey: 'actionSettings', type: 'changed',
          path: 'actionSettings.actions.B転記.enabled', left: true, right: false
        }
      ]
    });
    const generic = await readWorksheetByName(blob, '17_アプリ条件通知');
    const views = await readWorksheetByName(blob, '06_一覧設定');
    const actions = await readWorksheetByName(blob, '13_アプリアクション');

    for (const [sheet, column, target] of [
      [generic, 'C', '通知「B通知」'],
      [views, 'C', 'B一覧'],
      [actions, 'D', 'B転記']
    ] as const) {
      expect(worksheetRowContaining(sheet, target)).toMatch(new RegExp(`<c r="${column}\\d+" s="31"`));
    }
  });

  it('keeps view and action detail sheets in ascending change-list No. order', async () => {
    const blob = buildDiffXlsxBlobWithSafeDefault({
      rows: [
        { sectionKey: 'viewSettings', type: 'changed', path: 'viewSettings.views.B一覧.filterCond', left: '', right: 'status = "open"' },
        { sectionKey: 'viewSettings', type: 'changed', path: 'viewSettings.views.A一覧.filterCond', left: '', right: 'status = "closed"' },
        {
          sectionKey: 'actionSettings', type: 'changed', path: 'actionSettings.actions[0].name',
          entityKind: 'appAction', entityLabel: 'B転記', entityPropLabel: 'アクション名',
          arrayKey: 'name', arrayKeyValue: 'B転記', left: 'B転記', right: 'B転記済'
        },
        {
          sectionKey: 'actionSettings', type: 'changed', path: 'actionSettings.actions[1].name',
          entityKind: 'appAction', entityLabel: 'A転記', entityPropLabel: 'アクション名',
          arrayKey: 'name', arrayKeyValue: 'A転記', left: 'A転記', right: 'A転記済'
        }
      ]
    });
    const views = await readWorksheetByName(blob, '06_一覧設定');
    const actions = await readWorksheetByName(blob, '13_アプリアクション');

    expect(worksheetNumbers(views, 'A', 3)).toEqual([1, 2]);
    expect(worksheetInlineTexts(views, 'C', 3)).toEqual(['B一覧', 'A一覧']);
    expect(worksheetNumbers(actions, 'A', 3)).toEqual([3, 4]);
    expect(worksheetInlineTexts(actions, 'D', 3)).toEqual(['B転記', 'A転記']);
  });

  it.each([
    {
      label: 'complete comparison',
      context: {},
      message: '変更対象はありません（差分なし）'
    },
    {
      label: 'filtered export',
      context: { exportMode: 'filtered' as const },
      message: '現在の絞り込み条件に該当する変更対象はありません'
    },
    {
      label: 'incomplete comparison',
      context: { fetchIssues: [{ sectionKey: 'viewSettings', side: 'target' as const, message: '権限不足' }] },
      message: '比較できなかった範囲があります。変更対象0件を差分なしとは判断できません'
    }
  ])('shows a centered customer coarse-sheet empty state: $label', async ({ context, message }) => {
    const blob = buildDiffXlsxBlobWithSafeDefault({ rows: [], ...context });
    const targets = await readWorksheetByName(blob, '変更対象一覧');
    const workbook = await readEntry(blob, 'xl/workbook.xml');

    expect((targets.match(/<row r="/g) || []).length).toBe(3);
    expect(targets).toContain(message);
    expect(targets).toContain('<mergeCell ref="A3:G3"/>');
    expect(targets).not.toContain('<autoFilter');
    expect(targets).not.toContain('xSplit=');
    expect(targets).toContain('orientation="landscape" fitToWidth="1" fitToHeight="0"');
    expect(workbook).toContain('&apos;変更対象一覧&apos;!$1:$2</definedName>');
    expect(workbook).not.toContain('&apos;変更対象一覧&apos;!$1:$2,&apos;変更対象一覧&apos;!$A:');
  });

  it('expands long internal banner and directional headers only up to 120 points', async () => {
    const sourceName = `内部比較元${'非常に長いアプリ名'.repeat(30)}`;
    const targetName = `内部比較先${'別の非常に長いアプリ名'.repeat(30)}`;
    const sourceField = { code: 'customer', label: '顧客', type: 'SINGLE_LINE_TEXT' };
    const targetField = { ...sourceField, label: '取引先' };
    const blob = buildDiffXlsxBlob({
      sourceBundle: {
        meta: { appName: sourceName },
        sections: { fieldSettings: { properties: { customer: sourceField } } }
      },
      targetBundle: {
        meta: { appName: targetName },
        sections: { fieldSettings: { properties: { customer: targetField } } }
      },
      rows: [
        { sectionKey: 'fieldSettings', type: 'changed', path: 'fieldSettings.properties.customer.label', left: '顧客', right: '取引先' },
        { sectionKey: 'viewSettings', type: 'changed', path: 'viewSettings.views.案件一覧.name', left: '旧一覧', right: '新一覧' }
      ]
    });
    const summary = await readWorksheetByName(blob, '概要');
    const list = await readWorksheetByName(blob, '差分一覧');
    const section = await readWorksheetByName(blob, 'ビュー設定');
    const field = await readWorksheetByName(blob, 'フィールド差分詳細');

    for (const { actual, base } of [
      { actual: worksheetRowHeight(summary, 2), base: 24 },
      { actual: worksheetRowHeight(list, 3), base: 42 },
      { actual: worksheetRowHeight(section, 3), base: 42 },
      { actual: worksheetRowHeight(field, 3), base: 42 }
    ]) {
      expect(actual).toBeGreaterThan(base);
      expect(actual).toBeLessThanOrEqual(120);
    }
  });

  it('truncates customer labels by grapheme cluster without splitting a joined emoji', async () => {
    const label = `${'x'.repeat(42)}👩‍💻tail`;
    const layout = { layout: [{ type: 'ROW', fields: [{ type: 'LABEL', label }] }] };
    const list = await readWorksheetByName(buildDiffXlsxBlobWithSafeDefault({
      sourceBundle: { sections: { layoutSettings: layout } },
      targetBundle: { sections: { layoutSettings: layout } },
      rows: [{
        sectionKey: 'layoutSettings', type: 'changed',
        path: 'layoutSettings.layout[0].fields[0].label', left: '旧', right: '新'
      }]
    }), '変更一覧');

    expect(list).toContain(`ラベル「${'x'.repeat(42)}👩‍💻…`);
    expect(list).not.toContain('�');
  });

  it('describes related record and lookup diffs with kintone admin-screen terms and resolved own-app field names', async () => {
    const sourceFields = {
      BM会社情報: {
        type: 'REFERENCE_TABLE', code: 'BM会社情報', label: 'BM会社情報',
        referenceTable: {
          relatedApp: { app: '101' },
          condition: { field: 'BM会社選択', relatedField: '会社ID' },
          displayFields: ['会社名', '住所', 'TEL'],
          filterCond: '契約状態 in ("有効")',
          sort: '会社ID asc',
          size: '5'
        }
      },
      BM会社選択: { type: 'SINGLE_LINE_TEXT', code: 'BM会社選択', label: 'BM会社（選択用）' },
      請求先: {
        type: 'SINGLE_LINE_TEXT', code: '請求先', label: '請求先',
        lookup: {
          relatedApp: { app: '202' },
          relatedKeyField: '会社ID',
          fieldMappings: [{ field: '住所欄', relatedField: '住所' }],
          lookupPickerFields: ['会社名']
        }
      },
      住所欄: { type: 'SINGLE_LINE_TEXT', code: '住所欄', label: '住所（自動コピー）' }
    };
    const targetFields = {
      ...sourceFields,
      BM会社ID: { type: 'SINGLE_LINE_TEXT', code: 'BM会社ID', label: 'BM会社ID' },
      振込先住所: { type: 'SINGLE_LINE_TEXT', code: '振込先住所', label: '振込先住所（表示用）' }
    };
    const blob = buildDiffXlsxBlobWithSafeDefault({
      sourceBundle: { sections: { fieldSettings: { properties: sourceFields } } },
      targetBundle: { sections: { fieldSettings: { properties: targetFields } } },
      rows: [
        {
          sectionKey: 'fieldSettings', type: 'changed',
          path: 'fieldSettings.properties.BM会社情報.referenceTable.condition.field',
          left: 'BM会社選択', right: 'BM会社ID'
        },
        {
          sectionKey: 'fieldSettings', type: 'changed', moved: true, movedFrom: 0, movedTo: 2,
          path: 'fieldSettings.properties.BM会社情報.referenceTable.displayFields[0]',
          left: '会社名', right: '会社名'
        },
        {
          sectionKey: 'fieldSettings', type: 'changed',
          path: 'fieldSettings.properties.BM会社情報.referenceTable.filterCond',
          left: '契約状態 in ("有効")', right: ''
        },
        {
          sectionKey: 'fieldSettings', type: 'changed',
          path: 'fieldSettings.properties.BM会社情報.referenceTable.size',
          left: '5', right: '10'
        },
        {
          sectionKey: 'fieldSettings', type: 'changed',
          path: 'fieldSettings.properties.請求先.lookup.fieldMappings[0].field',
          left: '住所欄', right: '振込先住所'
        }
      ]
    });
    const list = await readWorksheetByName(blob, '変更一覧');

    // 差分プロパティは kintone のフィールド設定画面と同じ項目名で説明する。
    expect(worksheetInlineTexts(list, 'E', 2)).toEqual([
      '関連レコード一覧：表示するレコードの条件（自アプリのフィールド）',
      '関連レコード一覧：表示するフィールドの並び順',
      '関連レコード一覧：さらに絞り込む条件',
      '関連レコード一覧：一度に表示する最大レコード数',
      'ルックアップ：ほかのフィールドのコピー（1件目）のコピー先（自アプリのフィールド）'
    ]);
    expect(list).not.toContain('照合フィールド');
    // 自アプリ側のフィールドコードは「フィールド名（コード）」で表示し、名前の違いと分かるようにする。
    expect(worksheetInlineTexts(list, 'F', 2)).toEqual([
      'BM会社（選択用）（BM会社選択）',
      '1番目',
      '契約状態 in ("有効")',
      '5',
      '住所（自動コピー）（住所欄）'
    ]);
    expect(worksheetInlineTexts(list, 'G', 2)).toEqual([
      'BM会社ID',
      '3番目',
      '（空文字：条件なし）',
      '10',
      '振込先住所（表示用）（振込先住所）'
    ]);
  });

  it('keeps the app action name as the target when a field mapping is added or removed', async () => {
    const sourceBundle = {
      sections: {
        actionSettings: {
          actions: {
            物件を複製: {
              name: '物件を複製',
              mappings: [{ srcType: 'FIELD', srcField: '取得価額', destField: '取得価額' }]
            }
          }
        }
      }
    };
    const targetBundle = {
      sections: {
        actionSettings: {
          actions: {
            物件を複製: {
              name: '物件を複製',
              mappings: [{ srcType: 'FIELD', srcField: '取得価額', destField: '税抜取得価額' }]
            }
          }
        }
      }
    };
    const blob = buildDiffXlsxBlobWithSafeDefault({
      sourceBundle,
      targetBundle,
      rows: [
        {
          sectionKey: 'actionSettings', type: 'removed', arrayKey: 'destField', arrayKeyValue: '取得価額',
          path: 'actionSettings.actions.物件を複製.mappings[0]',
          left: { srcType: 'FIELD', srcField: '取得価額', destField: '取得価額' }
        },
        {
          sectionKey: 'actionSettings', type: 'added', arrayKey: 'destField', arrayKeyValue: '税抜取得価額',
          path: 'actionSettings.actions.物件を複製.mappings[0]',
          right: { srcType: 'FIELD', srcField: '取得価額', destField: '税抜取得価額' }
        }
      ]
    });
    const list = await readWorksheetByName(blob, '変更一覧');

    expect(worksheetInlineTexts(list, 'D', 2).map((value) => value.split('\n', 1)[0])).toEqual([
      'アプリアクション「物件を複製」',
      'アプリアクション「物件を複製」'
    ]);
    expect(list).toContain('比較先から削除：');
    expect(list).toContain('比較先に追加：');
    expect(worksheetInlineTexts(list, 'E', 2)).toEqual([
      'フィールドの関連付け（1件目）',
      'フィールドの関連付け（1件目）'
    ]);
    expect(list).not.toContain('アプリアクション「取得価額」');
    expect(list).not.toContain('アプリアクション「税抜取得価額」');
  });

  it('uses authoritative layout payload identities and distinguishes groups and tables from fields', async () => {
    const sourceBundle = {
      sections: {
        fieldSettings: {
          properties: {
            関連履歴: {
              type: 'REFERENCE_TABLE', code: '関連履歴', label: '関連履歴',
              referenceTable: { sort: '更新日時 desc' }
            }
          }
        },
        layoutSettings: {
          layout: [{ type: 'ROW', fields: [{ type: 'NUMBER', code: '物件本体償却累計額' }] }]
        }
      }
    };
    const targetBundle = {
      sections: {
        fieldSettings: sourceBundle.sections.fieldSettings,
        layoutSettings: { layout: [] }
      }
    };
    const blob = buildDiffXlsxBlobWithSafeDefault({
      sourceBundle,
      targetBundle,
      rows: [
        {
          sectionKey: 'layoutSettings', type: 'removed',
          path: 'layoutSettings.layout[0].fields[0]',
          left: { type: 'DROP_DOWN', code: '物件区分_土地_建物_借地権' }
        },
        {
          sectionKey: 'layoutSettings', type: 'added',
          path: 'layoutSettings.layout[1]',
          right: { type: 'GROUP', code: '分類マスタ' }
        },
        {
          sectionKey: 'layoutSettings', type: 'added',
          path: 'layoutSettings.layout[2].fields[0]',
          right: { type: 'SUBTABLE', code: '借入返済情報' }
        },
        {
          sectionKey: 'fieldSettings', type: 'changed',
          path: 'fieldSettings.properties.関連履歴.referenceTable.sort',
          left: '更新日時 desc', right: 'レコード番号 asc'
        }
      ]
    });
    const list = await readWorksheetByName(blob, '変更一覧');

    expect(list).toContain('フィールド「物件区分_土地_建物_借地権」');
    expect(list).not.toContain('フィールド「物件本体償却累計額」');
    expect(list).toContain('グループ「分類マスタ」');
    expect(list).not.toContain('フィールド「分類マスタ」');
    expect(list).toContain('テーブル「借入返済情報」');
    expect(list).not.toContain('フィールド「借入返済情報」');
    expect(list).toContain('関連レコード一覧：レコードのソート（表示順）');
  });

  it('preserves angle-bracket text in plain field and view names', async () => {
    const fields = {
      angle_field: { type: 'SINGLE_LINE_TEXT', code: 'angle_field', label: '<要確認>', required: false }
    };
    const blob = buildDiffXlsxBlobWithSafeDefault({
      sourceBundle: { sections: { fieldSettings: { properties: fields } } },
      targetBundle: { sections: { fieldSettings: { properties: fields } } },
      rows: [
        {
          sectionKey: 'fieldSettings', type: 'changed',
          path: 'fieldSettings.properties.angle_field.required', left: false, right: true
        },
        {
          sectionKey: 'viewSettings', type: 'changed',
          path: 'viewSettings.views.<要確認>.sort', left: '更新日時 desc', right: 'レコード番号 asc'
        }
      ]
    });
    const list = await readWorksheetByName(blob, '変更一覧');

    expect(list).toContain('フィールド「&lt;要確認&gt;」（コード: angle_field）');
    expect(list).toContain('一覧「&lt;要確認&gt;」');
  });

  it('styles literal existence words as compared values instead of structural markers', async () => {
    const list = await readWorksheetByName(buildDiffXlsxBlobWithSafeDefault({
      rows: [{
        sectionKey: 'appSettings',
        type: 'changed',
        path: 'appSettings.description',
        left: '存在',
        right: '存在しません'
      }]
    }), '変更一覧');

    expect(worksheetInlineTexts(list, 'F', 2)).toEqual(['存在']);
    expect(worksheetInlineTexts(list, 'G', 2)).toEqual(['存在しません']);
    expect(list).toContain('<c r="F2" s="37"');
    expect(list).toContain('<c r="G2" s="38"');
    expect(list).not.toMatch(/<c r="[FG]2" s="(?:25|26|39)"/);
  });

  it('keeps complete changed values without adding report-owned masking labels or environment-only instructions', async () => {
    const blob = buildDiffXlsxBlobWithSafeDefault({
      scopes: ['appSettings'],
      rows: [
        { sectionKey: 'appSettings', type: 'added', path: 'appSettings.name', right: 'api_key=TARGET_SECRET' },
        { sectionKey: 'appSettings', type: 'removed', path: 'appSettings.name', left: 'api_key=SOURCE_SECRET' },
        { sectionKey: 'appSettings', type: 'changed', path: 'appSettings.name', left: 'api_key=SOURCE_SECRET_2', right: 'api_key=TARGET_SECRET_2 / 実データ: マスキング' }
      ]
    });
    const list = await readWorksheetByName(blob, '変更一覧');

    for (const value of [
      'TARGET_SECRET', 'SOURCE_SECRET', 'SOURCE_SECRET_2', 'TARGET_SECRET_2'
    ]) expect(list).toContain(value);
    expect(list).toContain('>api_key=TARGET_SECRET<');
    expect(list).not.toContain('&quot;api_key=TARGET_SECRET&quot;');
    expect(list).toContain('存在しません');
    expect(list).toContain('実データ: マスキング');
    expect(list).not.toContain('マスキングせず収録');
    expect(list).not.toContain('マスキング済み');
    expect(list).not.toContain('非表示、マスキング');
    expect(list).not.toContain('詳細は安全のため非表示');
    expect(list).not.toContain('詳細非表示');
    expect(list).not.toContain('権限のある担当者');
    expect(list).not.toContain('環境で確認');
  });

  it('sizes customer value rows from visible XML-control tokens within the data-row cap', async () => {
    const changeListFor = (value: string) => readWorksheetByName(buildDiffXlsxBlobWithSafeDefault({
      rows: [{
        sectionKey: 'appSettings',
        type: 'changed',
        path: 'appSettings.description',
        left: value,
        right: `${value}末尾`
      }]
    }), '変更一覧');
    const controls = '\u0001'.repeat(18);
    const [controlList, plainList] = await Promise.all([
      changeListFor(controls),
      changeListFor('a'.repeat(controls.length))
    ]);
    const controlHeight = worksheetRowHeight(controlList, 2);
    const plainHeight = worksheetRowHeight(plainList, 2);

    expect(controlList).toContain('⟦U+0001⟧');
    expect(controlHeight).toBeGreaterThan(plainHeight);
    expect(controlHeight).toBeLessThanOrEqual(220);
  });

  it('does not describe an empty filtered export as a complete no-difference result', async () => {
    const blob = buildDiffXlsxBlobWithSafeDefault({
      exportMode: 'filtered',
      scopes: ['appSettings'],
      rows: []
    });
    const summary = await readWorksheetByName(blob, '比較概要');
    const list = await readWorksheetByName(blob, '変更一覧');
    expect(summary).toContain('掲載変更対象件数');
    expect(summary).toMatch(/<c r="A5"[^>]*>[\s\S]*?0件[\s\S]*?<\/c>/);
    expect(summary).toContain('シートの使い分け');
    expect(summary).not.toContain('機能別シート');
    expect(summary).not.toContain('設定値詳細');
    expect(summary).not.toContain('長文原文');
    for (const unnecessary of ['絞り込み後：掲載対象なし', '比較処理', '比較から除外']) {
      expect(summary).not.toContain(unnecessary);
    }
    expect(list).toContain('現在の絞り込み条件に該当する変更はありません');
    for (const column of 'ABCDEFG') expect(list).toContain(`<c r="${column}2" s="24"`);
    expect(list).not.toContain('差分はありません');
  });

  it('比較概要に件数タイルとシートの使い分けを示し、操作用の情報を載せない', async () => {
    const blob = buildDiffXlsxBlobWithSafeDefault({
      scopes: ['appSettings', 'fieldSettings'],
      comparedAt: '2026-08-30T12:34:56.000Z',
      rows: [{
        sectionKey: 'appSettings',
        type: 'changed',
        path: 'appSettings.name',
        left: '旧名称',
        right: '新名称'
      }]
    });
    const summary = await readWorksheetByName(blob, '比較概要');

    // 変更対象件数は合計＋種別を1つの帯（ラベル行＋件数行）にまとめる。
    expect(summary).toContain('<mergeCell ref="A3:F3"/>');
    expect(summary).toContain('<mergeCell ref="A4:B4"/>');
    expect(summary).toContain('<mergeCell ref="A5:B5"/>');
    expect(worksheetInlineTexts(summary, 'A', 4)[0]).toBe('変更対象件数');
    expect(worksheetInlineTexts(summary, 'A', 5)[0]).toBe('1件');
    for (const [cell, text] of [['C4', '追加'], ['D4', '削除'], ['E4', '変更'], ['F4', '並び順変更']] as const) {
      expect(summary).toMatch(new RegExp(`<c r="${cell}"[^>]*>[\\s\\S]*?${text}[\\s\\S]*?<\\/c>`));
    }
    expect(summary).toContain('<mergeCell ref="A6:F6"/>');
    expect(summary).toContain('<mergeCell ref="B7:F7"/>');
    expect(summary).toContain('比較した設定領域');
    expect(summary).toContain('アプリ基本設定、フィールド設定');
    expect(summary).toContain('比較日時');
    expect(summary).toContain('2026/08/30 21:34:56');
    expect(summary).toContain('シートの使い分け');
    expect(summary).toContain('確認したいこと');
    expect(summary).toContain('開くシート');
    expect(summary).toContain('どこが変わったか、まず全体を把握する');
    expect(summary).toContain('変更前と変更後の設定値を、1件ずつ確認する');
    expect(summary).toContain('機能別シート（上の表から開けます）');
    for (const unnecessary of [
      '掲載範囲', '比較から除外', 'シートごとの粒度', '1行の単位',
      '比較処理', '正常完了', '変更対象一覧を開く', '<hyperlink ref="F4"'
    ]) {
      expect(summary).not.toContain(unnecessary);
    }
  });

  it('変更対象一覧で同じアプリアクションの設定差分を1行にまとめる', async () => {
    const blob = buildDiffXlsxBlobWithSafeDefault({
      rows: [
        {
          sectionKey: 'actionSettings', type: 'changed',
          path: 'actionSettings.actions.次月作成.mappings[0].srcField',
          left: '売上', right: '税込売上'
        },
        {
          sectionKey: 'actionSettings', type: 'changed',
          path: 'actionSettings.actions.次月作成.mappings[0].destField',
          left: '売上', right: '転記先売上'
        },
        {
          sectionKey: 'actionSettings', type: 'moved', moved: true,
          path: 'actionSettings.actions.次月作成.mappings[1]',
          movedFrom: 1, movedTo: 5
        }
      ]
    });
    const targets = await readWorksheetByName(blob, '変更対象一覧');

    expect(worksheetInlineTexts(targets, 'C', 3)).toEqual(['アプリアクション「次月作成」']);
    expect(targets).toMatch(/<c r="F3"[^>]*><v>3<\/v><\/c>/);
  });

  it('比較概要の件数を変更対象一覧と同じ変更対象単位で数える', async () => {
    const blob = buildDiffXlsxBlobWithSafeDefault({
      rows: [
        {
          sectionKey: 'actionSettings', type: 'changed',
          path: 'actionSettings.actions.次月作成.mappings[0].srcField',
          left: '売上', right: '税込売上'
        },
        {
          sectionKey: 'actionSettings', type: 'changed',
          path: 'actionSettings.actions.次月作成.mappings[0].destField',
          left: '売上', right: '転記先売上'
        },
        {
          sectionKey: 'fieldSettings', type: 'added',
          path: 'fieldSettings.properties.new_field',
          right: { type: 'SINGLE_LINE_TEXT', code: 'new_field', label: '新フィールド' }
        }
      ]
    });
    const summary = await readWorksheetByName(blob, '比較概要');
    const targets = await readWorksheetByName(blob, '変更対象一覧');

    // 明細3件でも、変更対象（アプリアクション1件＋フィールド1件）の単位で数える。
    expect(worksheetInlineTexts(targets, 'C', 3)).toHaveLength(2);
    expect(worksheetInlineTexts(summary, 'A', 5)[0]).toBe('2件');
    expect(worksheetInlineTexts(summary, 'C', 5)[0]).toBe('1件');
    expect(worksheetInlineTexts(summary, 'D', 5)[0]).toBe('0件');
    expect(worksheetInlineTexts(summary, 'E', 5)[0]).toBe('1件');
    expect(worksheetInlineTexts(summary, 'F', 5)[0]).toBe('0件');
    // 機能別内訳は変更一覧の明細単位のままなので、単位をタイトルで区別する。
    expect(summary).toContain('kintone機能別の差分明細件数');
    expect(summary).not.toContain('kintone機能別の差分件数');
  });

  it('keeps customer comparison complete when only same rows were omitted', async () => {
    const blob = buildDiffXlsxBlobWithSafeDefault({
      scopes: ['appSettings'],
      rows: [],
      truncation: {
        truncated: true,
        droppedDiff: 0,
        droppedSame: 5,
        sections: [{ sectionKey: 'appSettings', scanStatus: 'complete', omittedDiffCount: 0 }]
      }
    });
    const workbook = await readEntry(blob, 'xl/workbook.xml');
    const summary = await readWorksheetByName(blob, '比較概要');
    expect([...workbook.matchAll(/<sheet\b[^>]*\bname="([^"]+)"/g)].map((match) => match[1])).toEqual([
      '比較概要', '変更対象一覧', '変更一覧'
    ]);
    expect(summary).toContain('5件（変更判定への影響なし）');
    expect(summary).not.toContain('比較未完了');
    expect(summary).not.toContain('一部未完了');
  });

  it('exports a process state rename without report-owned review guidance or technical apply claims', async () => {
    const blob = buildDiffXlsxBlobWithSafeDefault({
      scopes: ['processSettings'],
      rows: [{
        sectionKey: 'processSettings',
        section: 'プロセス管理',
        type: 'changed',
        path: 'processSettings.states.__rename__',
        left: { name: '未処理' },
        right: { name: '受付' },
        _nonActionable: true,
        _stateRenameNotice: true
      }]
    });
    const summary = await readWorksheetByName(blob, '比較概要');
    const list = await readWorksheetByName(blob, '変更一覧');

    expect(summary).toContain('1件');
    expect(list).toContain('ステータス名');
    expect(list).toContain('未処理');
    expect(list).toContain('受付');
    expect(list).not.toContain('確認専用で、自動反映の対象外です');
    expect(list).not.toContain('processSettings.states.__rename__');
  });

  it('exports every high-risk and unknown-section difference with its original values', async () => {
    const longValue = `${'顧客説明'.repeat(80)}LONG_VALUE_TAIL_556677`;
    const result = buildDiffXlsxExportWithSafeDefault({
      sourceBundle: {
        appId: 556677,
        meta: { appName: '変更前環境 App 556677' }
      },
      targetBundle: {
        appId: 667788,
        meta: { appName: '変更後環境 App 667788' }
      },
      scopes: [
        'appAcl', 'pluginSettings', 'customizeSettings', 'notifications',
        'fieldSettings', 'futureUnknownSettings', 'appSettings'
      ],
      rows: [
        {
          sectionKey: 'appAcl',
          type: 'changed',
          path: 'appAcl.rights[0].entity.code',
          left: { type: 'USER', code: 'USER_556677', id: 556677 },
          right: { type: 'USER', code: 'USER_667788', id: 667788 }
        },
        {
          sectionKey: 'appAcl',
          type: 'changed',
          path: 'appAcl.rights[1].entity.code',
          left: 'ACL_SECRET_LEFT',
          right: 'ACL_SECRET_RIGHT'
        },
        {
          sectionKey: 'pluginSettings',
          type: 'changed',
          path: 'pluginSettings.plugins[0].config',
          left: { token: 'PLUGIN_SECRET_556677' },
          right: { token: 'PLUGIN_SECRET_667788' }
        },
        {
          sectionKey: 'customizeSettings',
          type: 'changed',
          path: 'customizeSettings.desktop.js[0].file._body',
          left: 'const token = "CUSTOM_BODY_SECRET";',
          right: 'console.log("CUSTOM_BODY_VISIBLE");'
        },
        {
          sectionKey: 'notifications',
          type: 'changed',
          path: 'notifications.notifications[0]',
          left: { entity: { code: 'NOTIFY_USER_556677' } },
          right: { entity: { code: 'NOTIFY_USER_667788' } }
        },
        {
          sectionKey: 'fieldSettings',
          type: 'changed',
          path: 'fieldSettings.properties.title.lookup.relatedApp.app',
          left: '556677',
          right: '667788'
        },
        {
          sectionKey: 'futureUnknownSettings',
          type: 'changed',
          path: 'futureUnknownSettings.apiToken',
          left: 'https://internal.example/556677',
          right: 'UNKNOWN_TOKEN_667788'
        },
        {
          sectionKey: 'appSettings',
          type: 'changed',
          path: 'appSettings.description',
          left: longValue,
          right: `${longValue}R`
        },
        {
          sectionKey: 'pluginSettings',
          type: 'same',
          path: 'pluginSettings',
          left: 'SAME_PLUGIN_SECRET',
          right: 'SAME_PLUGIN_SECRET'
        },
        {
          sectionKey: 'appSettings',
          type: 'changed',
          path: 'appSettings.helper',
          left: 'DISPLAY_ONLY_SECRET',
          right: 'DISPLAY_ONLY_SECRET',
          _displayOnly: true
        }
      ]
    });
    const summary = await readWorksheetByName(result.blob, '比較概要');
    const list = await readWorksheetByName(result.blob, '変更一覧');
    const allText = await readAllEntryText(result.blob);

    expect((list.match(/<row r="/g) || []).length).toBe(9);
    expect(summary).not.toContain('変更一覧の明細');
    expect(summary).toMatch(/<c r="B5"[^>]*>[\s\S]*?8件[\s\S]*?<\/c>/);
    for (const value of [
      'USER_556677', 'USER_667788', 'ACL_SECRET_LEFT', 'ACL_SECRET_RIGHT',
      'PLUGIN_SECRET_556677', 'PLUGIN_SECRET_667788',
      'CUSTOM_BODY_SECRET', 'CUSTOM_BODY_VISIBLE',
      'NOTIFY_USER_556677', 'NOTIFY_USER_667788',
      'https://internal.example/556677', 'UNKNOWN_TOKEN_667788',
      'LONG_VALUE_TAIL_556677'
    ]) expect(allText).toContain(value);
    expect(allText).not.toContain('詳細は安全のため非表示');
    expect(allText).not.toContain('詳細非表示');
    expect(allText).not.toContain('詳細を省略した変更');
    expect(allText).not.toContain('SAME_PLUGIN_SECRET');
    expect(allText).not.toContain('DISPLAY_ONLY_SECRET');
    expect(result.filename).toContain('変更前環境 App 556677(app556677)_vs_変更後環境 App 667788(app667788)');
  });

  it('keeps credential-like and formula-looking customer values visible as inert text', async () => {
    const blob = buildDiffXlsxBlobWithSafeDefault({
      rows: [
        {
          sectionKey: 'appAcl',
          type: 'added',
          path: 'appAcl.rights[0]',
          right: 'ACL_ADD_SENTINEL'
        },
        {
          sectionKey: 'futureUnknownSettings',
          type: 'changed',
          path: 'futureUnknownSettings.apiToken',
          left: 'UNKNOWN_TOKEN_LEFT',
          right: 'UNKNOWN_TOKEN_RIGHT'
        },
        {
          sectionKey: 'appSettings',
          type: 'changed',
          path: 'appSettings.description',
          left: '=HYPERLINK("https://internal.example","open")',
          right: '@SUM(A1:A2)'
        },
        {
          sectionKey: 'appSettings',
          type: 'changed',
          path: 'appSettings.icon',
          left: 'C:\\Corp\\secret.txt',
          right: 'owner@example.internal'
        }
      ]
    });
    const list = await readWorksheetByName(blob, '変更一覧');
    const allText = await readAllEntryText(blob);

    for (const value of [
      'ACL_ADD_SENTINEL', 'UNKNOWN_TOKEN_LEFT', 'UNKNOWN_TOKEN_RIGHT',
      '=HYPERLINK', '@SUM(A1:A2)', 'Corp', 'secret.txt', 'owner@example.internal'
    ]) expect(allText).toContain(value);
    expect(list).toContain('t="inlineStr"');
    expect(allText).not.toContain('<f>');
    expect(list).not.toContain('r:id=');
    expect(allText).not.toContain('externalLink');
    expect(allText).not.toContain('詳細は安全のため非表示');
  });

  it.skip('shows identifiers, URLs, long values, and app names without masking them', async () => {
    const longValue = `${'長文設定'.repeat(300)}LONG_VALUE_END`;
    const result = buildDiffXlsxExportWithSafeDefault({
      comparedAt: 'not-a-date',
      sourceBundle: {
        appId: 202,
        guestId: '7',
        meta: { appName: 'Customer App 991122 Prod' }
      },
      targetBundle: {
        appId: 303,
        meta: { appName: 'Portal Guest 7' }
      },
      rows: [
        {
          sectionKey: 'actionSettings',
          type: 'changed',
          path: 'actionSettings.actions[0].targetAppId',
          left: 'TARGET_APP_661144',
          right: 'TARGET_APP_771155'
        },
        {
          sectionKey: 'viewSettings',
          type: 'changed',
          path: 'viewSettings.views.main',
          left: { id: 'VIEW_ID_LEFT', url: 'https://internal.example/left' },
          right: { id: 'VIEW_ID_RIGHT', url: 'https://internal.example/right' }
        },
        {
          sectionKey: 'fieldSettings',
          type: 'changed',
          path: 'fieldSettings.properties.phone_num.defaultValue',
          left: '090-1234-5678',
          right: 'owner@example.internal'
        },
        {
          sectionKey: 'appSettings',
          type: 'changed',
          path: 'appSettings.description',
          left: longValue,
          right: `${longValue}R`
        },
        {
          sectionKey: 'futureUnknownSettings',
          type: 'changed',
          path: 'futureUnknownSettings',
          left: { token: 'ROOTPAYLOADABC', revision: 991122 },
          right: { token: 'ROOTPAYLOADABCR', revision: 882233 }
        }
      ]
    });
    const summary = await readWorksheetByName(result.blob, '比較概要');
    const list = await readWorksheetByName(result.blob, '変更一覧');
    const allText = await readAllEntryText(result.blob);

    expect(summary).toContain('比較元\nCustomer App 991122 Prod');
    expect(summary).toContain('比較先\nPortal Guest 7');
    expect(summary).toContain('未記録');
    expect(result.filename).toContain('Customer App 991122 Prod(app202)_vs_Portal Guest 7(app303)');
    expect((list.match(/<row r="/g) || []).length).toBe(6);
    for (const value of [
      'TARGET_APP_661144', 'TARGET_APP_771155',
      'VIEW_ID_LEFT', 'VIEW_ID_RIGHT',
      'https://internal.example/left', 'https://internal.example/right',
      '090-1234-5678', 'owner@example.internal',
      'LONG_VALUE_END', 'ROOTPAYLOADABC', 'ROOTPAYLOADABCR',
      '991122', '882233'
    ]) expect(allText).toContain(value);
    expect(allText).not.toContain('詳細は安全のため非表示');
    expect(allText).not.toContain('詳細非表示');
    expect(allText).not.toContain('詳細を省略した変更');
  });

  it('shows moved elements as one-based order changes instead of identical values', async () => {
    const blob = buildDiffXlsxBlobWithSafeDefault({
      rows: [{
        sectionKey: 'viewSettings',
        type: 'moved',
        moved: true,
        movedFrom: 0,
        movedTo: 4,
        path: 'viewSettings.views.案件一覧.fields[0]',
        left: 'amount',
        right: 'amount'
      }]
    });
    const summary = await readWorksheetByName(blob, '比較概要');
    const list = await readWorksheetByName(blob, '変更一覧');
    const views = await readWorksheetByName(blob, '06_一覧設定');

    for (const sheet of [summary, list, views]) {
      expect(sheet).toContain('並び順変更');
      expect(sheet).not.toContain('要素の移動');
    }
    expect(worksheetInlineTexts(list, 'F', 2)).toEqual(['1番目']);
    expect(worksheetInlineTexts(list, 'G', 2)).toEqual(['5番目']);
    expect(worksheetInlineTexts(views, 'E', 3)).toEqual(['1番目']);
    expect(worksheetInlineTexts(views, 'F', 3)).toEqual(['5番目']);
  });

  it('uses one fully bordered state row and no empty navigation or category table when there is no difference', async () => {
    const blob = buildDiffXlsxBlobWithSafeDefault({
      scopes: ['fieldSettings'],
      rows: []
    });
    const workbook = await readEntry(blob, 'xl/workbook.xml');
    const summary = await readWorksheetByName(blob, '比較概要');
    const list = await readWorksheetByName(blob, '変更一覧');

    expect(summary).toMatch(/<c r="A5"[^>]*>[\s\S]*?0件[\s\S]*?<\/c>/);
    expect(summary).toContain('シートの使い分け');
    for (const unnecessary of ['変更なし', '変更一覧なし', '変更対象一覧を開く']) {
      expect(summary).not.toContain(unnecessary);
    }
    expect(summary).not.toContain('機能別シート');
    expect(summary).not.toContain('設定値詳細');
    expect(summary).not.toContain('長文原文');
    expect(summary).not.toContain('変更対象一覧を開く');
    expect(summary).not.toContain('分類別件数');
    expect(summary).not.toContain('<hyperlink');
    expect(summary).not.toContain('<autoFilter');
    expect(list).toContain('差分はありません');
    expect(list).toMatch(/<c r="A2"[^>]*>[\s\S]*?差分はありません[\s\S]*?<\/c>/);
    expect(list).not.toContain('<autoFilter');
    expect((list.match(/<row r="/g) || []).length).toBe(2);
    for (const column of 'ABCDEFG') expect(list).toContain(`<c r="${column}2"`);
    const zeroStyles = [...list.matchAll(/<c r="[A-G]2" s="(\d+)"/g)].map((match) => match[1]);
    expect(new Set(zeroStyles).size).toBe(1);
    expect(zeroStyles).toEqual(Array.from({ length: 7 }, () => '25'));
    expect(list).toContain('<mergeCell ref="A2:G2"/>');
    expect(list).not.toContain('xSplit=');
    expect(workbook).toContain('&apos;変更一覧&apos;!$1:$1');
    expect(workbook).not.toContain('&apos;変更一覧&apos;!$A:$');
    expect(worksheetRowHeight(list, 2)).toBeGreaterThanOrEqual(40);
    expect(workbook).not.toContain('name="設定値詳細"');
    expect(workbook).not.toContain('name="フィールド差分"');
  });

  it('does not expose uncertain code-change candidates in the customer workbook', async () => {
    const candidate = {
      id: 'rename:old_code:new_code',
      fromCode: 'old_code',
      toCode: 'new_code',
      matchedBy: 'same-type, same-label'
    };
    const blob = buildDiffXlsxBlobWithSafeDefault({
      sourceBundle: {
        sections: { fieldSettings: { properties: {
          old_code: { code: 'old_code', label: '金額', type: 'NUMBER' }
        } } }
      },
      targetBundle: {
        sections: { fieldSettings: { properties: {
          new_code: { code: 'new_code', label: '金額', type: 'NUMBER' }
        } } }
      },
      rows: [
        {
          sectionKey: 'fieldSettings', type: 'removed', path: 'fieldSettings.properties.old_code',
          left: { code: 'old_code', label: '金額', type: 'NUMBER' }, renameCandidate: candidate
        },
        {
          sectionKey: 'fieldSettings', type: 'added', path: 'fieldSettings.properties.new_code',
          right: { code: 'new_code', label: '金額', type: 'NUMBER' }, renameCandidate: candidate
        }
      ]
    });
    const list = await readWorksheetByName(blob, '変更一覧');
    const fields = await readWorksheetByName(blob, '03_フォームフィールド');

    expect((list.match(/<row r="/g) || []).length).toBe(3);
    expect(list).not.toContain('コード変更候補');
    expect(fields).not.toContain('コード変更候補');
    expect(worksheetInlineTexts(list, 'E', 2)).toEqual(['フィールド自体', 'フィールド自体']);
    expect(worksheetInlineTexts(list, 'F', 2)).toEqual([
      'フィールド「金額」（コード: old_code）', '存在しません'
    ]);
    expect(worksheetInlineTexts(list, 'G', 2)).toEqual([
      '存在しません', 'フィールド「金額」（コード: new_code）'
    ]);
    expect(list).toContain('<c r="F2" s="37"');
    expect(list).toContain('<c r="G2" s="39"');
    expect(list).toContain('<c r="F3" s="39"');
    expect(list).toContain('<c r="G3" s="38"');
    expect(fields).toContain('比較元のみ');
    expect(fields).toContain('比較先のみ');
    expect(fields).toContain('<c r="A3" s="22"');
    expect(fields).toContain('<c r="A4" s="24"');
    expect(fields).not.toContain('s="30"');
    for (const cell of ['H3', 'I3']) expect(fields).toContain(`<c r="${cell}" s="22"`);
    for (const cell of ['H4', 'I4']) expect(fields).toContain(`<c r="${cell}" s="24"`);
    expect(fields).toContain('<c r="J3" s="37"');
    expect(fields).toContain('<c r="K3" s="39"');
    expect(fields).toContain('<c r="J4" s="39"');
    expect(fields).toContain('<c r="K4" s="38"');
  });

  it('keeps form.json differences in the change list when the restated APIs were not compared', async () => {
    const blob = buildDiffXlsxBlobWithSafeDefault({
      scopes: ['formSettings'],
      rows: [
        { sectionKey: 'formSettings', type: 'changed', path: 'formSettings.properties[3].label', left: '顧客', right: '取引先' }
      ]
    });
    const summary = await readWorksheetByName(blob, '比較概要');
    const list = await readWorksheetByName(blob, '変更一覧');

    expect(worksheetInlineTexts(list, 'C', 2)).toEqual(['フォーム設定']);
    expect(summary).not.toContain('参考として別シートに掲載');
  });

  it('omits the redundant whole-plugin-settings change from customer Excel', async () => {
    const blob = buildDiffXlsxBlobWithSafeDefault({
      rows: [
        {
          sectionKey: 'pluginSettings', type: 'changed', path: 'pluginSettings',
          left: { plugins: [{ id: 'plugin-1' }] }, right: { plugins: [{ id: 'plugin-1' }] }
        },
        {
          sectionKey: 'pluginSettings', type: 'changed', path: 'pluginSettings.plugins[0].config.mode',
          arrayKey: 'id', arrayKeyValue: 'plugin-1', left: 'old', right: 'new'
        }
      ]
    });
    const targets = await readWorksheetByName(blob, '変更対象一覧');
    const details = await readWorksheetByName(blob, '変更一覧');

    expect(targets).not.toContain('プラグイン設定全体');
    expect(details).not.toContain('プラグイン設定全体');
    expect(details).toContain('プラグイン「plugin-1」');
    expect((details.match(/<row r="/g) || [])).toHaveLength(2);
  });

  it('builds summary, one filterable list, per-section sheets, and an issue sheet', async () => {
    const blob = buildDiffXlsxBlob(sampleCtx);
    const workbook = await readEntry(blob, 'xl/workbook.xml');
    expect(workbook).toContain('name="概要"');
    expect(workbook).toContain('name="変更対象一覧"');
    expect(workbook).toContain('name="差分一覧"');
    expect(workbook).toContain('name="フィールド差分要約"');
    expect(workbook).toContain('name="フィールド差分詳細"');
    expect(workbook).toContain('name="フィールド技術明細"');
    expect(workbook).toContain('name="ビュー設定"');
    expect(workbook).toContain('name="取得・未検証"');
    expect(workbook.indexOf('name="概要"')).toBeLessThan(workbook.indexOf('name="取得・未検証"'));
    expect(workbook.indexOf('name="取得・未検証"')).toBeLessThan(workbook.indexOf('name="変更対象一覧"'));
    expect(workbook.indexOf('name="変更対象一覧"')).toBeLessThan(workbook.indexOf('name="フィールド差分要約"'));
    expect(workbook.indexOf('name="取得・未検証"')).toBeLessThan(workbook.indexOf('name="フィールド差分要約"'));
    expect(workbook.indexOf('name="フィールド差分要約"')).toBeLessThan(workbook.indexOf('name="フィールド差分詳細"'));
    expect(workbook.indexOf('name="フィールド差分詳細"')).toBeLessThan(workbook.indexOf('name="差分一覧"'));
    expect(workbook).toContain('<definedNames>');
    expect(workbook).toContain('&apos;概要&apos;!$1:$2');
    expect(workbook).toContain('&apos;変更対象一覧&apos;!$2:$4,&apos;変更対象一覧&apos;!$A:$C');
    expect(workbook).toContain('&apos;フィールド差分要約&apos;!$2:$3');
    expect(workbook).toContain('&apos;フィールド差分詳細&apos;!$2:$3');
    expect(workbook).toContain('&apos;差分一覧&apos;!$2:$3');
    expect(workbook).toContain('&apos;フィールド技術明細&apos;!$2:$3');
    expect(workbook).toContain('&apos;ビュー設定&apos;!$2:$3');
    expect(workbook).toContain('&apos;取得・未検証&apos;!$2:$2');
  });

  it('groups the coarse target list by field and view while keeping drill-down links', async () => {
    const blob = buildDiffXlsxBlob({
      ...sampleCtx,
      fetchIssues: [],
      rows: [
        ...sampleCtx.rows,
        {
          sectionKey: 'viewSettings', type: 'changed', path: 'viewSettings.views.一覧A.fields[0]',
          label: 'ビュー「一覧A」 / 表示フィールド', left: '顧客名', right: '案件名'
        },
        {
          sectionKey: 'viewSettings', type: 'changed', path: 'viewSettings.views.一覧A.filterCond',
          label: 'ビュー「一覧A」 / 絞り込み条件', left: 'status = "未処理"', right: 'status = "処理中"'
        }
      ]
    });
    const targets = await readWorksheetByName(blob, '変更対象一覧');
    const workbook = await readEntry(blob, 'xl/workbook.xml');

    expect((targets.match(/<row r="/g) || []).length).toBe(6);
    for (const [cell, label] of [
      ['A3', '対象種別'], ['B3', '対象名'], ['C3', '識別子'], ['D3', '変更状態'],
      ['E3', '差分件数'], ['F3', '主な変更'], ['G3', '詳細']
    ]) {
      expect(targets).toMatch(new RegExp(`<c r="${cell}" s="1"[^>]*>[\\s\\S]*?${label}[\\s\\S]*?<\\/c>`));
    }
    expect(targets).toMatch(/<c r="A2" s="7"[^>]*>[\s\S]*?変更された対象[\s\S]*?<\/c>/);
    expect(targets).toMatch(/<c r="D2" s="12"[^>]*>[\s\S]*?変更の概要[\s\S]*?<\/c>/);
    expect(targets).toMatch(/<c r="G2" s="12"[^>]*>[\s\S]*?ナビゲーション[\s\S]*?<\/c>/);
    expect(targets).toContain('<mergeCell ref="A2:C2"/>');
    expect(targets).toContain('<mergeCell ref="D2:F2"/>');
    expect(worksheetInlineTexts(targets, 'A', 4).filter((value) => value === 'フィールド')).toHaveLength(2);
    expect(worksheetInlineTexts(targets, 'A', 4).filter((value) => value === '一覧')).toHaveLength(1);
    expect(worksheetInlineTexts(targets, 'C', 4)).toEqual(expect.arrayContaining(['foo', 'bar', '一覧名 一覧A']));
    expect(worksheetInlineTexts(targets, 'B', 4)).toHaveLength(3);
    expect(worksheetInlineTexts(targets, 'F', 4)).toHaveLength(3);
    expect(worksheetInlineTexts(targets, 'G', 4)).toHaveLength(3);
    const viewRow = worksheetRowContaining(targets, '一覧A');
    expect(viewRow).toMatch(/<c r="E\d+"[^>]*><v>3<\/v><\/c>/);
    expect(viewRow).toContain('表示するフィールド');
    expect(viewRow).toContain('絞り込み条件');
    expect(targets).toContain('location="&apos;フィールド差分要約&apos;!C');
    expect(targets).toContain('location="&apos;差分一覧&apos;!B');
    expect(targets).toContain('<pane xSplit="3" ySplit="3" topLeftCell="D4" activePane="bottomRight" state="frozen"/>');
    expect(targets).toContain('<autoFilter ref="A3:G6"/>');
    expect(targets).toContain('orientation="landscape" fitToWidth="1" fitToHeight="0"');
    expect(workbook).toContain('&apos;変更対象一覧&apos;!$2:$3,&apos;変更対象一覧&apos;!$A:$C');
  });

  it('uses the longest bundle view key when a view name contains dots', async () => {
    const sourceView = { id: '880', type: 'LIST', fields: ['顧客名'], filterCond: 'status = "未処理"' };
    const targetView = { id: '880', type: 'LIST', fields: ['案件名'], filterCond: 'status = "処理中"' };
    const targets = await readWorksheetByName(buildDiffXlsxBlob({
      audience: 'internal',
      sourceBundle: { sections: { viewSettings: { views: { '営業.sort': sourceView } } } },
      targetBundle: { sections: { viewSettings: { views: { '営業.sort': targetView } } } },
      rows: [
        {
          sectionKey: 'viewSettings', type: 'changed', path: 'viewSettings.views.営業.sort',
          left: sourceView, right: targetView
        },
        {
          sectionKey: 'viewSettings', type: 'changed', path: 'viewSettings.views.営業.sort.fields[0]',
          left: '顧客名', right: '案件名'
        },
        {
          sectionKey: 'viewSettings', type: 'changed', path: 'viewSettings.views.営業.sort.filterCond',
          left: 'status = "未処理"', right: 'status = "処理中"'
        }
      ]
    }), '変更対象一覧');

    expect(worksheetInlineTexts(targets, 'A', 4)).toEqual(['一覧']);
    expect(worksheetInlineTexts(targets, 'B', 4)).toEqual(['営業.sort']);
    expect(worksheetInlineTexts(targets, 'C', 4)).toEqual(['一覧ID 880']);
    const viewRow = worksheetRowContaining(targets, '営業.sort');
    expect(viewRow).toMatch(/<c r="E\d+"[^>]*><v>3<\/v><\/c>/);
    expect(viewRow).toContain('差分一覧へ');
  });

  it.each([
    { type: 'added', left: undefined, right: '更新日時 desc' },
    { type: 'removed', left: '案件番号 asc', right: undefined },
    { type: 'changed', left: '案件番号 asc', right: '更新日時 desc' }
  ])('keeps an ambiguous $type sort leaf under the shorter coexisting view name', async ({ type, left, right }) => {
    const commonViews = {
      営業: { id: '101', type: 'LIST', fields: ['案件番号'] },
      '営業.sort': { id: '202', type: 'LIST', fields: ['更新日時'] }
    };
    const context: DiffXlsxContext = {
      sourceBundle: { sections: { viewSettings: { views: commonViews } } },
      targetBundle: { sections: { viewSettings: { views: commonViews } } },
      rows: [{
        sectionKey: 'viewSettings', type, path: 'viewSettings.views.営業.sort', left, right
      }]
    };
    const internalTargets = await readWorksheetByName(buildDiffXlsxBlob({
      ...context,
      audience: 'internal'
    }), '変更対象一覧');
    const customerTargets = await readWorksheetByName(buildDiffXlsxBlobWithSafeDefault({
      ...context,
      audience: 'customer'
    }), '変更対象一覧');

    expect(worksheetInlineTexts(internalTargets, 'B', 4)).toEqual(['営業']);
    expect(worksheetInlineTexts(internalTargets, 'C', 4)).toEqual(['一覧ID 101']);
    expect(internalTargets).not.toContain('一覧追加');
    expect(internalTargets).not.toContain('一覧削除');
    expect(worksheetInlineTexts(customerTargets, 'C', 3)).toEqual(['一覧「営業」']);
    expect(worksheetInlineTexts(customerTargets, 'D', 3)).toEqual(['設定変更']);
    expect(customerTargets).not.toContain('一覧「営業.sort」');
  });

  it('treats an object payload at the same ambiguous path as the dotted view root', async () => {
    const salesView = { id: '101', type: 'LIST', fields: ['案件番号'] };
    const dottedView = { id: '202', type: 'LIST', fields: ['更新日時'] };
    const context: DiffXlsxContext = {
      sourceBundle: { sections: { viewSettings: { views: { 営業: salesView } } } },
      targetBundle: { sections: { viewSettings: { views: { 営業: salesView, '営業.sort': dottedView } } } },
      rows: [{
        sectionKey: 'viewSettings', type: 'added', path: 'viewSettings.views.営業.sort', right: dottedView
      }]
    };
    const internalTargets = await readWorksheetByName(buildDiffXlsxBlob({
      ...context,
      audience: 'internal'
    }), '変更対象一覧');
    const customerTargets = await readWorksheetByName(buildDiffXlsxBlobWithSafeDefault({
      ...context,
      audience: 'customer'
    }), '変更対象一覧');

    expect(worksheetInlineTexts(internalTargets, 'B', 4)).toEqual(['営業.sort']);
    expect(worksheetInlineTexts(internalTargets, 'C', 4)).toEqual(['一覧ID 202']);
    expect(worksheetInlineTexts(internalTargets, 'D', 4)).toEqual(['一覧追加']);
    expect(worksheetInlineTexts(customerTargets, 'C', 3)).toEqual(['一覧「営業.sort」']);
    expect(worksheetInlineTexts(customerTargets, 'D', 3)).toEqual(['追加']);
  });

  it('does not describe added or removed view leaves as whole-view additions or removals', async () => {
    const targets = await readWorksheetByName(buildDiffXlsxBlob({
      audience: 'internal',
      sourceBundle: {
        sections: {
          viewSettings: {
            views: {
              追加確認一覧: { id: '101', type: 'LIST', fields: [] },
              削除確認一覧: { id: '202', type: 'LIST', filterCond: 'status = "未処理"' }
            }
          }
        }
      },
      targetBundle: {
        sections: {
          viewSettings: {
            views: {
              追加確認一覧: { id: '101', type: 'LIST', fields: ['customer'] },
              削除確認一覧: { id: '202', type: 'LIST', filterCond: '' }
            }
          }
        }
      },
      rows: [
        {
          sectionKey: 'viewSettings', type: 'added', path: 'viewSettings.views.追加確認一覧.fields[0]',
          right: 'customer'
        },
        {
          sectionKey: 'viewSettings', type: 'removed', path: 'viewSettings.views.削除確認一覧.filterCond',
          left: 'status = "未処理"'
        }
      ]
    }), '変更対象一覧');

    const addedLeafRow = worksheetRowContaining(targets, '追加確認一覧');
    const removedLeafRow = worksheetRowContaining(targets, '削除確認一覧');
    expect(addedLeafRow).toMatch(/<c r="D\d+"[^>]*>[\s\S]*?>設定変更<[\s\S]*?<\/c>/);
    expect(addedLeafRow).not.toContain('一覧追加');
    expect(removedLeafRow).toMatch(/<c r="D\d+"[^>]*>[\s\S]*?>設定変更<[\s\S]*?<\/c>/);
    expect(removedLeafRow).not.toContain('一覧削除');
  });

  it('distinguishes root additions from leaf additions consistently in internal and customer target lists', async () => {
    const rows: DiffXlsxContext['rows'] = [
      {
        sectionKey: 'reportSettings', type: 'added', path: 'reportSettings.reports.新規売上',
        entityKind: 'report', entityCode: 'report-new', entityLabel: '新規売上', entityPropLabel: '',
        right: { name: '新規売上', chartType: 'BAR' }
      },
      {
        sectionKey: 'reportSettings', type: 'added', path: 'reportSettings.reports.既存売上.sort',
        entityKind: 'report', entityCode: 'report-existing', entityLabel: '既存売上', entityPropLabel: 'ソート',
        right: 'amount desc'
      },
      {
        sectionKey: 'actionSettings', type: 'added', path: 'actionSettings.actions[0]',
        entityKind: 'appAction', entityCode: 'action-new', entityLabel: '新規転記', entityPropLabel: '',
        arrayKey: 'name', arrayKeyValue: '新規転記', right: { name: '新規転記', mappings: [] }
      },
      {
        sectionKey: 'actionSettings', type: 'added', path: 'actionSettings.actions[1].mappings[0]',
        entityKind: 'appAction', entityCode: 'action-existing', entityLabel: '既存転記', entityPropLabel: 'フィールドの関連付け',
        arrayKey: 'name', arrayKeyValue: '既存転記', right: { srcField: 'customer', destField: 'customer' }
      },
      {
        sectionKey: 'notifications', type: 'added', path: 'notifications.notifications[0]',
        entityKind: 'notification', entityCode: 'notification-new', entityLabel: '新規通知', entityPropLabel: '',
        right: { entity: { type: 'USER', code: 'user-a' } }
      },
      {
        sectionKey: 'notifications', type: 'added', path: 'notifications.notifications[1].recipients[0]',
        entityKind: 'notification', entityCode: 'notification-existing', entityLabel: '既存通知', entityPropLabel: '通知先',
        right: { entity: { type: 'USER', code: 'user-b' } }
      }
    ];
    const internalTargets = await readWorksheetByName(buildDiffXlsxBlob({ audience: 'internal', rows }), '変更対象一覧');
    const customerTargets = await readWorksheetByName(buildDiffXlsxBlobWithSafeDefault({ audience: 'customer', rows }), '変更対象一覧');
    const stateIn = (worksheet: string, target: string): string => {
      const row = worksheetRowContaining(worksheet, target);
      return /<c r="D\d+"[^>]*t="inlineStr"><is><t[^>]*>([^<]*)<\/t><\/is><\/c>/.exec(row)?.[1] || '';
    };

    for (const [rootTarget, leafTarget] of [
      ['グラフ「新規売上」', 'グラフ「既存売上」'],
      ['アプリアクション「新規転記」', 'アプリアクション「既存転記」'],
      ['通知「新規通知」', '通知「既存通知」']
    ]) {
      expect(stateIn(internalTargets, rootTarget)).toBe('追加');
      expect(stateIn(internalTargets, leafTarget)).toBe('設定変更');
      expect(stateIn(customerTargets, rootTarget)).toBe('追加');
      expect(stateIn(customerTargets, leafTarget)).toBe('設定変更');
    }
  });

  it('keeps separate array entities even when their human-facing labels are identical', async () => {
    const rows: DiffXlsxContext['rows'] = [0, 1].map((index) => ({
      sectionKey: 'notifications',
      type: 'changed',
      path: `notifications.notifications[${index}].recipients[0]`,
      entityKind: 'notification',
      entityLabel: '担当者へ通知',
      entityPropLabel: '通知先',
      left: { entity: { type: 'USER', code: `old-user-${index}` } },
      right: { entity: { type: 'USER', code: `new-user-${index}` } }
    }));
    const internalTargets = await readWorksheetByName(buildDiffXlsxBlob({ audience: 'internal', rows }), '変更対象一覧');
    const customerTargets = await readWorksheetByName(buildDiffXlsxBlobWithSafeDefault({ audience: 'customer', rows }), '変更対象一覧');

    expect(worksheetInlineTexts(internalTargets, 'B', 4)).toEqual(['通知「担当者へ通知」', '通知「担当者へ通知」']);
    const identifiers = worksheetInlineTexts(internalTargets, 'C', 4);
    expect(identifiers).toHaveLength(2);
    expect(new Set(identifiers).size).toBe(2);
    expect(worksheetInlineTexts(customerTargets, 'C', 3)).toEqual(['通知「担当者へ通知」', '通知「担当者へ通知」']);
    expect((customerTargets.match(/<c r="F[34]"[^>]*><v>1<\/v><\/c>/g) || [])).toHaveLength(2);
  });

  it('shows an incomplete-comparison warning above coarse targets even when differences exist', async () => {
    const context: DiffXlsxContext = {
      rows: [{
        sectionKey: 'appSettings', type: 'changed', path: 'appSettings.name', left: '旧名称', right: '新名称'
      }],
      fetchIssues: [{ sectionKey: 'viewSettings', side: 'target', message: '権限不足' }]
    };
    const internalTargets = await readWorksheetByName(buildDiffXlsxBlob({
      ...context,
      audience: 'internal'
    }), '変更対象一覧');
    const customerTargets = await readWorksheetByName(buildDiffXlsxBlobWithSafeDefault({
      ...context,
      audience: 'customer'
    }), '変更対象一覧');

    expect(worksheetRowContaining(internalTargets, '比較できなかった範囲があります')).toMatch(/<row r="2"[\s\S]*?<c r="A2" s="27"/);
    expect(internalTargets).toContain('<mergeCell ref="A2:G2"/>');
    expect(internalTargets).toContain('<autoFilter ref="A4:G5"/>');
    expect(internalTargets).toContain('<pane xSplit="3" ySplit="4" topLeftCell="D5" activePane="bottomRight" state="frozen"/>');
    expect(worksheetRowContaining(customerTargets, '比較できなかった範囲があります')).toMatch(/<row r="2"[\s\S]*?<c r="A2" s="27"/);
    expect(customerTargets).toContain('<mergeCell ref="A2:G2"/>');
    expect(customerTargets).toContain('<autoFilter ref="A3:G4"/>');
    expect(customerTargets).toContain('<pane xSplit="3" ySplit="3" topLeftCell="D4" activePane="bottomRight" state="frozen"/>');
  });

  it.each([
    {
      label: 'complete comparison',
      context: { fetchIssues: [], partialIssues: [] },
      message: '変更対象はありません（差分なし）',
      style: 25
    },
    {
      label: 'filtered export',
      context: { exportMode: 'filtered' as const, fetchIssues: [], partialIssues: [] },
      message: '現在の絞り込み条件に該当する変更対象はありません',
      style: 24
    },
    {
      label: 'incomplete comparison',
      context: {
        fetchIssues: [{ sectionKey: 'viewSettings', side: 'target' as const, message: '権限不足' }],
        partialIssues: []
      },
      message: '比較できなかった範囲があります。概要と「取得・未検証」を確認してください',
      style: 27
    }
  ])('shows a centered semantic empty band on the coarse target list: $label', async ({ context, message, style }) => {
    const blob = buildDiffXlsxBlob({
      audience: 'internal',
      rows: [],
      scopes: ['fieldSettings', 'viewSettings'],
      ...context
    });
    const targets = await readWorksheetByName(blob, '変更対象一覧');
    const workbook = await readEntry(blob, 'xl/workbook.xml');

    expect((targets.match(/<row r="/g) || []).length).toBe(4);
    expect(targets).toContain(message);
    expect(targets).toContain(`<c r="A4" s="${style}"`);
    expect(targets).toContain('<mergeCell ref="A4:G4"/>');
    expect(targets).not.toContain('<autoFilter');
    expect(targets).not.toContain('<pane');
    expect(targets).toContain('orientation="landscape" fitToWidth="1" fitToHeight="0"');
    expect(workbook).toContain('&apos;変更対象一覧&apos;!$2:$3</definedName>');
    expect(workbook).not.toContain('&apos;変更対象一覧&apos;!$2:$3,&apos;変更対象一覧&apos;!$A:');
  });

  it('adds a neutral two-line guide band to every sheet', async () => {
    const blob = buildDiffXlsxBlob(sampleCtx);
    const worksheets = await readWorksheetEntries(blob);
    const summary = await readWorksheetByName(blob, '概要');
    expect(summary).toContain('このシートで分かること：この出力範囲の結果');
    expect(summary).toContain('使い方・次に見る場所：最初に確認します。');
    expect(summary).toMatch(/<row r="5" ht="44" customHeight="1">/);
    expect(summary).toMatch(/<c r="A5" s="12"/);
    expect(summary).toContain('<mergeCell ref="A5:D5"/>');
    expect(summary).toMatch(/<row r="2[5-9]" ht="40" customHeight="1">/);
    expect(summary).toMatch(/<c r="A39" s="5"/);
    expect(summary).toContain('<mergeCell ref="B39:D39"/>');

    for (const worksheet of worksheets.slice(1)) {
      expect(worksheet).toContain('このシートで分かること：');
      expect(worksheet).toContain('使い方・次に見る場所：');
      expect(worksheet).toMatch(/<row r="1" ht="44" customHeight="1">/);
      expect(worksheet).toMatch(/<c r="A1" s="12"/);
      expect(worksheet).not.toMatch(/<c r="A1" s="11"/);
    }

    const issues = await readWorksheetByName(blob, '取得・未検証');
    expect(issues).toContain('<pane xSplit="2" ySplit="2" topLeftCell="C3" activePane="bottomRight" state="frozen"/>');
    expect(issues).toContain('<autoFilter ref="A2:E3"/>');
    expect(issues).toContain('<mergeCell ref="A1:E1"/>');
    expect(issues).toMatch(/<c r="A3" s="26"/);
    expect(issues).toMatch(/<c r="B3" s="2"/);
  });

  it('records normalization switches in the evidence summary', async () => {
    const summary = await readWorksheetByName(buildDiffXlsxBlob(sampleCtx), '概要');
    expect(summary).toContain('正規化設定');
    expect(summary).toContain('有効: ビュー順序');
    expect(summary).toContain('無効: 権限順序');
  });

  it('writes comparison direction, export range, scopes, and accurate counts', async () => {
    const summary = await readWorksheetByName(buildDiffXlsxBlob(sampleCtx), '概要');
    expect(summary).toContain('アプリA (App 1)');
    expect(summary).toContain('アプリB (App 2)');
    expect(summary).toContain('比較元 → 比較先');
    expect(summary).toContain('2026/08/16 09:00:00');
    expect(summary).not.toContain('JST');
    expect(summary).toContain('比較日時');
    expect(summary).toContain('2026/08/16 08:59:00');
    expect(summary).toContain('比較元取得日時');
    expect(summary).toContain('2026/08/16 08:57:00');
    expect(summary).toContain('比較先取得日時');
    expect(summary).toContain('2026/08/16 08:58:00');
    expect(summary).toContain('表示中（フィルタ適用後）');
    expect(summary).toContain('フィールド設定、ビュー設定');
    expect(summary).toContain('収録差分数');
    expect(summary).toContain('追加（比較先のみ）');
    expect(summary).toContain('削除（比較元のみ）');
    expect(summary).toContain('kintone 設定差分比較レポート');
    expect(summary).toContain('取得状態');
    expect(summary).toContain('比較不完全（差分なしとは判断できません）');
    expect(summary).toContain('不完全（取得失敗 1件）');
    expect(summary).toContain('<c r="B6" s="27"');
    expect(summary).toContain('<c r="D6" s="27"');
    expect(summary).toMatch(/<c r="A12"[^>]*>[\s\S]*?同一[\s\S]*?<\/c>/);
    expect(summary).toMatch(/<c r="B12"[^>]*><v>0<\/v>/);
    expect(summary).not.toContain('参考行');
    expect(summary).toContain('①「変更対象一覧」で対象を絞る');
    expect(summary).toContain('②「フィールド差分要約・詳細」で変更内容を確認');
    expect(summary).toContain('③「差分一覧」で確認状況と対応判断を入力');
    expect(summary).toContain('※パスは技術明細シートにのみ掲載');
    expect(summary).toContain('フィールド差分を見る');
    expect(summary).toContain('2フィールド / 2件の差分明細');
    expect(summary).toContain('<hyperlink ref="D20" location="&apos;フィールド差分要約&apos;!C4"');
    expect(summary).toContain('<hyperlink ref="D21" location="&apos;差分一覧&apos;!I4"');
    expect(summary).toContain('シート案内');
    expect(summary).toContain('シート名');
    expect(summary).toContain('目的');
    expect(summary).toContain('利用場面');
    expect(summary).toContain('このブックに収録された差分と変更前後の値');
    expect(summary).toContain('設定項目ごとの差分とレビュー入力は「差分一覧」へ進みます。');
    expect(summary).not.toContain('すべての差分');
    expect(summary).toContain('<hyperlink ref="A26" location="&apos;取得・未検証&apos;!A3"');
    expect(summary).toContain('<hyperlink ref="A27" location="&apos;変更対象一覧&apos;!B4"');
    expect(summary).toContain('<hyperlink ref="A28" location="&apos;フィールド差分要約&apos;!C4"');
    expect(summary).toMatch(/<c r="B7"[^>]*><v>3<\/v>/);
    expect(summary).toContain('<mergeCell ref="A1:D1"/>');
    expect(summary).toContain('<mergeCell ref="A2:D2"/>');
    expect(summary).toContain('アプリA (App 1)  →  アプリB (App 2)');
    expect(summary).toMatch(/<c r="B14" s="3"/);
    expect(summary).toMatch(/<c r="D14" s="4"/);
    expect(summary).toContain('収録した差分行のみ（全設定スナップショットなし）');
    expect(summary).toContain('画面の絞り込み: 変更種別=追加・変更・削除');
    expect(summary).toContain('重要度、業務への影響、対応要否は自動判定しません');
    expect(summary).toContain('追加 1 / 削除 0 / 内容変更 1 / 移動 0 / 同一 0 / 参考 0');
    expect(summary).toContain('showGridLines="0"');
    expect(summary).toContain('orientation="portrait" fitToWidth="1" fitToHeight="0"');
  });

  it.each([
    {
      label: 'actual rows only',
      rows: [{ sectionKey: 'appSettings', type: 'changed', path: 'appSettings.name', left: 'A', right: 'B' }],
      expected: '収録した差分行のみ（全設定スナップショットなし）'
    },
    {
      label: 'actual and same evidence rows',
      rows: [
        { sectionKey: 'appSettings', type: 'changed', path: 'appSettings.name', left: 'A', right: 'B' },
        { sectionKey: 'viewSettings', type: 'same', path: 'viewSettings.views', left: {}, right: {} }
      ],
      expected: '収録した差分行と同一証跡行（全設定スナップショットなし）'
    },
    {
      label: 'actual and reference rows',
      rows: [
        { sectionKey: 'appSettings', type: 'changed', path: 'appSettings.name', left: 'A', right: 'B' },
        { sectionKey: 'processSettings', type: 'changed', path: 'processSettings.__rename__', _displayOnly: true }
      ],
      expected: '収録した差分行と参考表示行（全設定スナップショットなし）'
    },
    {
      label: 'actual, same, and reference rows',
      rows: [
        { sectionKey: 'appSettings', type: 'changed', path: 'appSettings.name', left: 'A', right: 'B' },
        { sectionKey: 'viewSettings', type: 'same', path: 'viewSettings.views', left: {}, right: {} },
        { sectionKey: 'processSettings', type: 'changed', path: 'processSettings.__rename__', _displayOnly: true }
      ],
      expected: '収録した差分行・同一証跡行・参考表示行（全設定スナップショットなし）'
    }
  ])('describes the rows actually recorded for $label', async ({ rows, expected }) => {
    const summary = await readWorksheetByName(buildDiffXlsxBlob({
      rows: rows as DiffXlsxContext['rows'],
      exportContentMode: 'diffOnly'
    }), '概要');

    expect(summary).toContain(expected);
  });

  it('writes one row per result to the consolidated list with directional values', async () => {
    const blob = buildDiffXlsxBlob(sampleCtx);
    const list = await readWorksheetByName(blob, '差分一覧');
    const workbook = await readEntry(blob, 'xl/workbook.xml');
    expect((list.match(/<row r="/g) || []).length).toBe(6);
    expect(list).toContain('このシートで分かること：このブックに収録された差分');
    expect(list).toContain('使い方・次に見る場所：黄色の列');
    expect(list).toMatch(/<c r="A1" s="12"/);
    expect(list).toContain('差分対象');
    expect(list).toContain('変更の事実');
    expect(list).toContain('レビュー入力（黄色）');
    expect(list).toContain('比較元（変更前）');
    expect(list).toContain('比較先（変更後）');
    expect(list).toContain('<mergeCell ref="A1:L1"/>');
    expect(list).toContain('<mergeCell ref="A2:B2"/>');
    expect(list).toContain('<mergeCell ref="C2:E2"/>');
    expect(list).toContain('<mergeCell ref="I2:L2"/>');
    expect(list).not.toContain('<mergeCell ref="F2:G2"/>');
    expect(list).toContain('比較元の値');
    expect(list).toContain('比較先の値');
    expect(list).toContain('アプリA (App 1)');
    expect(list).toContain('アプリB (App 2)');
    expect(list).toContain('確認事項');
    expect(list).toContain('差分ID');
    expect(list).toContain('項目／変更内容');
    expect(list).toContain('変更種別');
    expect(list).toContain('存在状況');
    expect(list).toContain('確認状況');
    expect(list).toContain('対応判断');
    expect(list).toContain('担当者');
    expect(list).toContain('コメント');
    for (const [cell, label] of [
      ['A3', 'セクション'], ['B3', '項目'], ['C3', '変更種別'], ['D3', '存在状況'],
      ['E3', '差分ID'], ['F3', '比較元の値'], ['G3', '比較先の値'], ['H3', '確認事項'],
      ['I3', '確認状況'], ['J3', '対応判断'], ['K3', '担当者'], ['L3', 'コメント']
    ]) {
      expect(list).toMatch(new RegExp(`<c r="${cell}"[^>]*>[\\s\\S]*?${label}[\\s\\S]*?<\\/c>`));
    }
    expect(list).toMatch(/<c r="F3"[^>]*>[\s\S]*?比較元の値[\s\S]*?<\/c>/);
    expect(list).toMatch(/<c r="G3"[^>]*>[\s\S]*?比較先の値[\s\S]*?<\/c>/);
    expect(list).toMatch(/<c r="H3"[^>]*>[\s\S]*?確認事項[\s\S]*?<\/c>/);
    expect(list).toMatch(/<c r="I3"[^>]*>[\s\S]*?確認状況[\s\S]*?<\/c>/);
    expect(list).toMatch(/<c r="J3"[^>]*>[\s\S]*?対応判断[\s\S]*?<\/c>/);
    expect(list).toMatch(/<c r="K3"[^>]*>[\s\S]*?担当者[\s\S]*?<\/c>/);
    expect(list).toMatch(/<c r="L3"[^>]*>[\s\S]*?コメント[\s\S]*?<\/c>/);
    expect(list).toContain('表示名が変更されています');
    expect(list).toContain('比較先に追加：');
    expect(list).toContain('比較先から削除：');
    expect(list).toContain('旧ラベル → 新ラベル');
    expect(list).toContain('新ラベル（bar） / フィールド名');
    expect(list).not.toContain('フィールド「bar」 / フィールド名');
    expect(list).toContain('フィールド追加');
    expect(list).toContain('比較先のみ');
    expect(list).toContain('削除');
    expect(list).toContain('比較元のみ');
    expect(list).not.toContain('技術パス');
    expect(list).not.toContain('fieldSettings.properties.foo');
    expect((list.match(/アプリA \(App 1\)/g) || [])).toHaveLength(1);
    expect((list.match(/アプリB \(App 2\)/g) || [])).toHaveLength(1);
    // 追加行の比較元(F列)にも、どちら側だけに存在するかを事実として表示する。
    expect(list).toMatch(/<c r="F4"/);
    expect(list).toContain('（存在しません）');
    expect(list).toMatch(/<c r="G4"/);
    // 削除行の比較先(G列)にも、どちら側だけに存在するかを事実として表示する。
    expect(list).toMatch(/<c r="F6"/);
    expect(list).toMatch(/<c r="G6"/);
    expect(list).toContain('（存在しません）');
    // ID～項目を固定し、レビュー状態にはドロップダウンを付ける。
    expect(list).toContain('<pane xSplit="5" ySplit="3" topLeftCell="F4" activePane="bottomRight" state="frozen"/>');
    expect(list).toContain('<autoFilter ref="A3:L6"/>');
    expect(list).toContain('sqref="I4:I6"');
    expect(list).toContain('&quot;未確認,確認中,確認済み,対象外&quot;');
    expect(list).toContain('sqref="J4:J6"');
    expect(list).toContain('&quot;未判断,要対応,対応不要,保留,対象外&quot;');
    // 確認状況・対応判断と空の担当・コメントを黄色の編集欄として保持する。
    expect(list).toMatch(/<c r="I4" s="29"/);
    expect(list).toMatch(/<c r="I4" s="29"[^>]*>[\s\S]*?未確認/);
    expect(list).toMatch(/<c r="J4" s="29"/);
    expect(list).toMatch(/<c r="J4" s="29"[^>]*>[\s\S]*?未判断/);
    expect(list).toMatch(/<c r="K4" s="11"/);
    expect(list).toMatch(/<c r="L4" s="11"/);
    expect(list).toContain('<hyperlink ref="E4" location="&apos;フィールド技術明細&apos;!A4"');
    expect(list).toContain('<hyperlink ref="E5" location="&apos;フィールド技術明細&apos;!A5"');
    expect(list).toContain('<hyperlink ref="E6" location="&apos;ビュー設定&apos;!A4"');
    // 状態別の行色は使わず、比較元・比較先の列を役割色と境界罫線で固定する。
    expect(list).toMatch(/<c r="B4" s="2"/);
    expect(list).toMatch(/<c r="F2" s="16"/);
    expect(list).toMatch(/<c r="G2" s="17"/);
    expect(list).toMatch(/<c r="F3" s="15"/);
    expect(list).toMatch(/<c r="F4" s="14"/);
    expect(list).toMatch(/<c r="G4" s="4"/);
    const dataRowHeights = [...list.matchAll(/<row r="[4-6]" ht="([0-9.]+)" customHeight="1">/g)]
      .map((match) => Number(match[1]));
    expect(dataRowHeights).toHaveLength(3);
    expect(dataRowHeights.every((height) => height >= 26 && height <= 110)).toBe(true);
    expect(dataRowHeights.some((height) => height > 26)).toBe(true);
    expect(list).toContain('orientation="landscape" fitToWidth="2" fitToHeight="0"');
    expect(workbook).toContain('&apos;差分一覧&apos;!$2:$3,&apos;差分一覧&apos;!$A:$E');

    const fieldTechnical = await readWorksheetByName(blob, 'フィールド技術明細');
    const viewTechnical = await readWorksheetByName(blob, 'ビュー設定');
    expect(fieldTechnical).toContain('<hyperlink ref="A4" location="&apos;差分一覧&apos;!I4"');
    expect(fieldTechnical).toContain('<hyperlink ref="A5" location="&apos;差分一覧&apos;!I5"');
    expect(viewTechnical).toContain('<hyperlink ref="A4" location="&apos;差分一覧&apos;!I6"');
  });

  it('expands rows for wrapped human text even when the value has no explicit newline', async () => {
    const list = await readWorksheetByName(buildDiffXlsxBlob({
      sourceBundle: { appId: 1, meta: { appName: '比較元アプリ' } },
      targetBundle: { appId: 2, meta: { appName: '比較先アプリ' } },
      rows: [{
        sectionKey: 'appSettings', type: 'added', path: 'appSettings.description',
        right: '比較先だけに追加された長い説明です'.repeat(6),
        reasonSummary: 'この変更内容が利用者向けの説明として適切か確認してください'.repeat(3)
      }]
    }), '差分一覧');

    const height = Number(list.match(/<row r="4" ht="([0-9.]+)" customHeight="1">/)?.[1] || 0);
    expect(height).toBeGreaterThan(26);
    expect(height).toBeLessThanOrEqual(110);
    expect(list).toContain('比較先のみ');
  });

  it('treats a lone carriage return as a line break when estimating row height', async () => {
    const rowHeightFor = async (left: string): Promise<number> => {
      const list = await readWorksheetByName(buildDiffXlsxBlob({
        rows: [{
          sectionKey: 'appSettings', type: 'changed', path: 'appSettings.description',
          left, right: '変更後'
        }]
      }), '差分一覧');
      return worksheetRowHeight(list, 4);
    };

    const singleLineHeight = await rowHeightFor('短い値');
    const loneCrHeight = await rowHeightFor('1行目\r2行目\r3行目\r4行目');
    expect(loneCrHeight).toBeGreaterThan(singleLineHeight);
    expect(loneCrHeight).toBeLessThanOrEqual(110);
  });

  it('keeps section-specific drill-down sheets', async () => {
    const blob = buildDiffXlsxBlob(sampleCtx);
    const fieldSheet = await readWorksheetByName(blob, 'フィールド技術明細');
    const workbook = await readEntry(blob, 'xl/workbook.xml');
    expect((fieldSheet.match(/<row r="/g) || []).length).toBe(5);
    expect(fieldSheet).toContain('このシートで分かること：フィールド技術明細');
    expect(fieldSheet).toContain('通常の確認は「フィールド差分詳細」、レビュー記録は同じ差分IDの「差分一覧」で行います。');
    expect(fieldSheet).toContain('長文はセルを選択して数式バーでも確認');
    expect(fieldSheet).toContain('「[一部表示]」または「…省略」がある場合は元データを確認');
    expect(fieldSheet).toContain('差分の識別');
    expect(fieldSheet).toContain('比較元（変更前）');
    expect(fieldSheet).toContain('比較先（変更後）');
    expect(fieldSheet).toContain('foo / フィールド全体');
    expect(fieldSheet).toContain('&quot;code&quot;: &quot;foo&quot;');
    expect(fieldSheet).toContain('旧ラベル');
    expect(fieldSheet).toContain('新ラベル');
    // レビュー記入欄はマスターの差分一覧だけに置き、シート間で状態が分裂しないようにする。
    expect(fieldSheet).toContain('差分ID');
    expect(fieldSheet).toContain('変更種別');
    expect(fieldSheet).toContain('存在状況');
    expect(fieldSheet).toContain('パス');
    expect(fieldSheet).toContain('fieldSettings.properties.foo');
    expect(fieldSheet).not.toContain('確認状態');
    expect(fieldSheet).not.toContain('レビューコメント');
    expect(fieldSheet).toMatch(/<row r="4" ht="([0-9.]+)" customHeight="1">/);
    expect(fieldSheet).toContain('<pane xSplit="4" ySplit="3" topLeftCell="E4" activePane="bottomRight" state="frozen"/>');
    expect(fieldSheet).toContain('<autoFilter ref="A3:H5"/>');
    expect(fieldSheet).toContain('orientation="landscape" fitToWidth="2" fitToHeight="0"');
    expect(workbook).toContain('&apos;フィールド技術明細&apos;!$2:$3,&apos;フィールド技術明細&apos;!$A:$E');
  });

  it('expands technical long-value rows while keeping a bounded height and a visible reading note', async () => {
    const longValue = Array.from({ length: 24 }, (_, index) => `設定${index + 1}: ${'値'.repeat(12)}`).join('\n');
    const technical = await readWorksheetByName(buildDiffXlsxBlob({
      rows: [{
        sectionKey: 'appSettings', type: 'changed', path: 'appSettings.longValue',
        left: longValue, right: `${longValue}\n変更後`
      }]
    }), 'アプリ設定');

    const height = Number(technical.match(/<row r="4" ht="([0-9.]+)" customHeight="1">/)?.[1] || 0);
    expect(height).toBe(264);
    expect(technical).toContain('長文はセルを選択して数式バーでも確認');
    expect(technical).toContain('「[一部表示]」または「…省略」がある場合は元データを確認');
  });

  it('keeps change type and existence as separate factual classifications', async () => {
    const list = await readWorksheetByName(buildDiffXlsxBlob({
      rows: [
        { sectionKey: 'layoutSettings', type: 'changed', moved: true, path: 'layoutSettings.layout[0]' },
        { sectionKey: 'appSettings', type: 'same', path: 'appSettings.name', left: '同じ', right: '同じ' },
        {
          sectionKey: 'processSettings', type: 'changed', path: 'processSettings.__rename__',
          _displayOnly: true, label: '名称対応の参考情報'
        }
      ]
    }), '差分一覧');

    expect(list).toContain('変更種別');
    expect(list).toContain('存在状況');
    expect(list).toContain('移動');
    expect(list).toContain('同一');
    expect(list).toContain('参考');
    expect(list).toContain('両方');
    expect(list).toMatch(/<c r="C6"[^>]*>[\s\S]*?—[\s\S]*?<\/c>/);
    expect(list).not.toContain('参考（件数外）');
    expect(list).toMatch(/<c r="I5" s="12"[^>]*>[\s\S]*?対象外[\s\S]*?<\/c>/);
    expect(list).toMatch(/<c r="J5" s="12"[^>]*>[\s\S]*?対象外[\s\S]*?<\/c>/);
    expect(list).toMatch(/<c r="I6" s="12"[^>]*>[\s\S]*?対象外[\s\S]*?<\/c>/);
    expect(list).toMatch(/<c r="J6" s="12"[^>]*>[\s\S]*?対象外[\s\S]*?<\/c>/);
    for (const cell of ['I5', 'J5', 'K5', 'L5', 'I6', 'J6', 'K6', 'L6']) {
      expect(list).not.toContain(`<c r="${cell}" s="11"`);
    }
  });

  it('omits tool-inferred severity values and explains that judgment is left to people', async () => {
    const blob = buildDiffXlsxBlob(sampleCtx);
    const worksheets = await readWorksheetEntries(blob);
    expect(worksheets.length).toBeGreaterThan(0);
    expect(worksheets[0]).toContain('重要度、業務への影響、対応要否は自動判定しません');
    for (const xml of worksheets.slice(1)) {
      expect(xml).not.toContain('重要度');
      expect(xml).not.toContain('影響度');
      expect(xml).not.toContain('最優先');
    }
    const styles = await readEntry(blob, 'xl/styles.xml');
    expect(styles).toContain('<cellXfs count="37">');
    expect(styles).not.toContain('rgb="FFDCFCE7"');
    expect(styles).not.toContain('rgb="FFFDE68A"');
  });

  it('produces identical worksheet XML when only severity values differ', async () => {
    const contextWithSeverities = (severities: string[]): DiffXlsxContext => ({
      ...sampleCtx,
      rows: sampleCtx.rows.map((row, index) => ({ ...row, severity: severities[index] }))
    });
    const first = await readWorksheetEntries(buildDiffXlsxBlob(contextWithSeverities(['high', 'medium', 'low'])));
    const second = await readWorksheetEntries(buildDiffXlsxBlob(contextWithSeverities(['low', 'high', 'medium'])));
    expect(first).toEqual(second);
  });

  it('extracts stable field names, codes, setting labels, and per-field counts', () => {
    const model = buildDiffXlsxFieldModel({
      sourceBundle: {
        sections: {
          fieldSettings: {
            properties: {
              amount: { code: 'amount', label: '見積金額', type: 'NUMBER', required: false },
              lines: {
                code: 'lines', label: '明細', type: 'SUBTABLE',
                fields: { item: { code: 'item', label: '品名', type: 'SINGLE_LINE_TEXT' } }
              },
              obsolete: { code: 'obsolete', label: '旧項目', type: 'SINGLE_LINE_TEXT' }
            }
          }
        }
      },
      targetBundle: {
        sections: {
          fieldSettings: {
            properties: {
              amount: { code: 'amount', label: '請求金額', type: 'NUMBER', required: true },
              lines: {
                code: 'lines', label: '請求明細', type: 'SUBTABLE',
                fields: { item: { code: 'item', label: '商品名', type: 'SINGLE_LINE_TEXT' } }
              },
              status: { code: 'status', label: '進捗', type: 'DROP_DOWN' }
            }
          }
        }
      },
      rows: [
        { sectionKey: 'fieldSettings', type: 'changed', severity: 'medium', path: 'fieldSettings.properties.amount.label', left: '見積金額', right: '請求金額' },
        { sectionKey: 'fieldSettings', type: 'changed', severity: 'high', path: 'fieldSettings.properties.amount.required', left: false, right: true },
        { sectionKey: 'fieldSettings', type: 'changed', severity: 'low', path: 'fieldSettings.properties.lines.fields.item.defaultValue', left: '', right: '未定' },
        { sectionKey: 'fieldSettings', type: 'added', severity: 'medium', path: 'fieldSettings.properties.status', right: { code: 'status', label: '進捗', type: 'DROP_DOWN' } },
        { sectionKey: 'fieldSettings', type: 'removed', severity: 'low', path: 'fieldSettings.properties.obsolete', left: { code: 'obsolete', label: '旧項目', type: 'SINGLE_LINE_TEXT' } },
        { sectionKey: 'fieldSettings', type: 'same', path: 'fieldSettings.properties.same.label', left: '同じ', right: '同じ' },
        { sectionKey: 'fieldSettings', type: 'changed', path: 'fieldSettings.properties.helper.label', _displayOnly: true, left: 'A', right: 'B' },
        { sectionKey: 'viewSettings', type: 'changed', path: 'viewSettings.views.list.name', left: 'A', right: 'B' }
      ]
    });

    expect(model.details).toHaveLength(5);
    expect(model.details.find((detail) => detail.fieldCode === 'amount' && detail.settingKey === 'required')).toMatchObject({
      fieldName: '請求金額', settingLabel: '必須項目にする'
    });
    expect(model.details.find((detail) => detail.fieldCode === 'lines > item')).toMatchObject({
      fieldName: '請求明細 > 商品名', settingLabel: '初期値'
    });
    expect(model.summaries.find((summary) => summary.fieldCode === 'amount')).toMatchObject({
      fieldName: '請求金額', diffCount: 2, added: 0, removed: 0, changed: 2,
      settingLabels: ['フィールド名', '必須項目にする']
    });
    expect(model.summaries.find((summary) => summary.fieldCode === 'status')).toMatchObject({
      fieldName: '進捗', diffCount: 1, added: 1, removed: 0, changed: 0
    });
    expect(model.summaries.find((summary) => summary.fieldCode === 'obsolete')).toMatchObject({
      fieldName: '旧項目', diffCount: 1, added: 0, removed: 1, changed: 0
    });
  });

  it('adds field-oriented summary and detail sheets without duplicate review inputs', async () => {
    const blob = buildDiffXlsxBlob(sampleCtx);
    const summary = await readWorksheetByName(blob, 'フィールド差分要約');
    const detail = await readWorksheetByName(blob, 'フィールド差分詳細');
    const workbook = await readEntry(blob, 'xl/workbook.xml');

    expect(summary).toContain('差分フィールド');
    expect(summary).toContain('変更種別');
    expect(summary).toContain('存在状況');
    expect(summary).toContain('フィールド名');
    expect(summary).toContain('フィールドコード');
    expect(summary).toContain('フィールド種別');
    expect(summary).toContain('差分明細数');
    expect(summary).toContain('主な変更');
    expect(summary).toContain('変更の状態');
    expect(summary).toContain('確認事項');
    expect(summary).toContain('変更前後の設定値と利用箇所を確認してください。');
    expect(summary).toContain('比較先のみ');
    expect(summary).toContain('両方');
    expect(summary).not.toContain('アプリB (App 2)');
    expect(summary).toContain('設定変更');
    expect(summary).toContain('新ラベル');
    expect(summary).toContain('フィールド全体');
    expect(summary).toContain('フィールド名');
    expect(summary).toContain('文字列（1行）');
    expect(summary).toContain('詳細を見る（1件）');
    expect(summary).toContain('このシートで分かること：差分があるフィールド');
    expect(summary).toContain('<pane xSplit="5" ySplit="3" topLeftCell="F4" activePane="bottomRight" state="frozen"/>');
    expect(summary).toContain('<autoFilter ref="A3:J5"/>');
    expect(summary).toContain('orientation="landscape" fitToWidth="2" fitToHeight="0"');
    expect(workbook).toContain('&apos;フィールド差分要約&apos;!$2:$3,&apos;フィールド差分要約&apos;!$A:$E');
    expect(summary).toContain('<hyperlink ref="I4" location="&apos;フィールド差分詳細&apos;!B4"');
    expect(summary).toContain('<hyperlink ref="I5" location="&apos;フィールド差分詳細&apos;!B5"');
    expect(summary).toContain('<hyperlink ref="J4" location="&apos;差分一覧&apos;!I5"');
    expect(summary).toContain('<hyperlink ref="J5" location="&apos;差分一覧&apos;!I4"');
    expect(summary).toMatch(/<c r="I4" s="13"/);

    expect(detail).toContain('設定項目');
    expect(detail).toContain('変更種別');
    expect(detail).toContain('存在状況');
    expect(detail).toContain('比較元（変更前）');
    expect(detail).toContain('比較先（変更後）');
    expect(detail).toContain('比較元の値');
    expect(detail).toContain('比較先の値');
    expect(detail).toContain('旧ラベル');
    expect(detail).toContain('新ラベル');
    expect(detail).toContain('要約へ戻る');
    expect(detail).toContain('差分ID');
    expect(detail).toContain('（存在しません）');
    expect(detail).toContain('種類: 文字列（1行）');
    expect(detail).toContain('コード: foo');
    expect(detail).not.toContain('&quot;code&quot;: &quot;foo&quot;');
    expect(detail).toContain('このシートで分かること：各フィールドの設定項目');
    expect(detail).toContain('<pane xSplit="4" ySplit="3" topLeftCell="E4" activePane="bottomRight" state="frozen"/>');
    expect(detail).toContain('<autoFilter ref="A3:J5"/>');
    expect(detail).toContain('orientation="landscape" fitToWidth="2" fitToHeight="0"');
    expect(workbook).toContain('&apos;フィールド差分詳細&apos;!$2:$3,&apos;フィールド差分詳細&apos;!$A:$D');
    expect(detail).toContain('<hyperlink ref="A4" location="&apos;差分一覧&apos;!I5"');
    expect(detail).toContain('<hyperlink ref="A5" location="&apos;差分一覧&apos;!I4"');
    expect(detail).toContain('<hyperlink ref="J4" location="&apos;フィールド差分要約&apos;!C4"');
    expect(detail).toContain('<hyperlink ref="J5" location="&apos;フィールド差分要約&apos;!C5"');
    expect(detail).toMatch(/<c r="A4" s="13"/);
    expect(detail).toMatch(/<c r="J4" s="13"/);
    // 差分種別にかかわらず、比較元は淡いスレート、比較先は淡い青で列の役割を固定する。
    expect(detail).toMatch(/<c r="G2" s="16"/);
    expect(detail).toMatch(/<c r="H2" s="17"/);
    expect(detail).toMatch(/<c r="G3" s="15"/);
    expect(detail).toMatch(/<c r="G4" s="14"/);
    expect(detail).toMatch(/<c r="H4" s="4"/);
    expect(detail).toMatch(/<c r="G5" s="14"/);
    expect(detail).toMatch(/<c r="H5" s="4"/);
    expect(detail).not.toContain('確認状態');
    expect(detail).not.toContain('レビューコメント');
    expect(detail).not.toContain('fieldSettings.properties');
  });

  it.each([
    { setting: 'required', left: false, right: true, expectedLeft: '任意', expectedRight: '必須' },
    { setting: 'unique', left: true, right: false, expectedLeft: '重複を禁止', expectedRight: '重複を許可' },
    { setting: 'noLabel', left: false, right: true, expectedLeft: 'フィールド名を表示する', expectedRight: 'フィールド名を表示しない' },
    { setting: 'hideExpression', left: false, right: true, expectedLeft: '計算式を表示する', expectedRight: '計算式を表示しない' },
    { setting: 'defaultNowValue', left: false, right: true, expectedLeft: '現在日時を使わない', expectedRight: '現在日時を使う' },
    { setting: 'digit', left: false, right: true, expectedLeft: 'いいえ', expectedRight: 'はい' },
    { setting: 'defaultValue', left: '', right: null, expectedLeft: '（空欄）', expectedRight: '（値なし）' }
  ])('uses the same human-readable values in field detail and master list: $setting', async ({
    setting, left, right, expectedLeft, expectedRight
  }) => {
    const blob = buildDiffXlsxBlob({
      rows: [{
        sectionKey: 'fieldSettings', type: 'changed', severity: 'medium',
        path: `fieldSettings.properties.customer.${setting}`, left, right
      }]
    });
    const detail = await readWorksheetByName(blob, 'フィールド差分詳細');
    const list = await readWorksheetByName(blob, '差分一覧');
    for (const xml of [detail, list]) {
      expect(xml).toContain(expectedLeft);
      expect(xml).toContain(expectedRight);
    }
  });

  it('summarizes at most three concrete setting changes and reports the remainder', async () => {
    const summary = await readWorksheetByName(buildDiffXlsxBlob({
      sourceBundle: {
        sections: { fieldSettings: { properties: { customer: { code: 'customer', label: '顧客', type: 'SINGLE_LINE_TEXT' } } } }
      },
      targetBundle: {
        sections: { fieldSettings: { properties: { customer: { code: 'customer', label: '取引先', type: 'SINGLE_LINE_TEXT' } } } }
      },
      rows: [
        { sectionKey: 'fieldSettings', type: 'changed', severity: 'medium', path: 'fieldSettings.properties.customer.label', left: '顧客', right: '取引先' },
        { sectionKey: 'fieldSettings', type: 'changed', severity: 'high', path: 'fieldSettings.properties.customer.required', left: false, right: true },
        { sectionKey: 'fieldSettings', type: 'changed', severity: 'low', path: 'fieldSettings.properties.customer.unique', left: false, right: true },
        { sectionKey: 'fieldSettings', type: 'changed', severity: 'low', path: 'fieldSettings.properties.customer.defaultValue', left: '', right: '未定' }
      ]
    }), 'フィールド差分要約');

    expect(summary).toContain('初期値: （空欄） → 未定');
    expect(summary).toContain('フィールド名: 顧客 → 取引先');
    expect(summary).toContain('必須項目にする: 任意 → 必須');
    expect(summary).toContain('ほか1件');
  });

  it('truncates field summary values without splitting a grapheme cluster', async () => {
    const left = `${'a'.repeat(98)}😀tail`;
    const right = `${'b'.repeat(98)}😀tail`;
    const summary = await readWorksheetByName(buildDiffXlsxBlob({
      rows: [{
        sectionKey: 'fieldSettings', type: 'changed', severity: 'low',
        path: 'fieldSettings.properties.customer.description', left, right
      }]
    }), 'フィールド差分要約');

    expect(summary).toContain(`${'a'.repeat(98)}😀…`);
    expect(summary).toContain(`${'b'.repeat(98)}😀…`);
    expect(summary).not.toContain('�');
  });

  it('always adds setting-specific review guidance to human field details', async () => {
    const detail = await readWorksheetByName(buildDiffXlsxBlob({
      rows: [
        {
          sectionKey: 'fieldSettings', type: 'removed', path: 'fieldSettings.properties.legacy',
          left: { code: 'legacy', label: '旧項目', type: 'SINGLE_LINE_TEXT' }
        },
        { sectionKey: 'fieldSettings', type: 'changed', path: 'fieldSettings.properties.customer.required', left: false, right: true },
        { sectionKey: 'fieldSettings', type: 'changed', path: 'fieldSettings.properties.status.options.OPEN.label', left: '未対応', right: '対応中' },
        { sectionKey: 'fieldSettings', type: 'changed', path: 'fieldSettings.properties.customer.type', left: 'SINGLE_LINE_TEXT', right: 'NUMBER' },
        { sectionKey: 'fieldSettings', type: 'changed', path: 'fieldSettings.properties.customer.lookup.relatedApp.app', left: '1', right: '2' },
        {
          sectionKey: 'fieldSettings', type: 'changed', path: 'fieldSettings.properties.customer.description',
          left: '旧説明', right: '新説明', reasonSummary: '既存の説明を確認'
        }
      ]
    }), 'フィールド差分詳細');

    expect(detail).toContain('保存済みデータ・一覧・外部連携からの参照有無を確認してください。');
    expect(detail).toContain('既存データの未入力有無と、入力画面・外部連携の入力条件を確認してください。');
    expect(detail).toContain('既存値・絞り込み条件・連携で使用している選択肢を確認してください。');
    expect(detail).toContain('保存済みデータとAPI・外部連携で使用している型・コードを確認してください。');
    expect(detail).toContain('参照先アプリ、キー、コピー項目を確認してください。');
    expect(detail).toContain('既存の説明を確認 / 変更前後の設定値と利用箇所を確認してください。');
  });

  it('uses a human layout label in the master list even when row.label is a raw path', async () => {
    const list = await readWorksheetByName(buildDiffXlsxBlob({
      rows: [{
        sectionKey: 'layoutSettings', type: 'changed', severity: 'low',
        path: 'layoutSettings.layout[0].size.width',
        label: 'layoutSettings.layout[0].size.width', left: 120, right: 180
      }]
    }), '差分一覧');

    expect(list).toMatch(/<c r="E3"[^>]*>[\s\S]*?レイアウト行 #1 \/ 横幅[\s\S]*?<\/c>/);
  });

  it('keeps enriched one-based layout positions unchanged in the human-facing list', async () => {
    const sourceBundle = {
      appId: 1,
      meta: { appName: '比較元アプリ' },
      sections: {
        layoutSettings: {
          layout: [{
            type: 'ROW',
            fields: [
              { code: 'amount', label: '金額' },
              { code: 'priority', label: '優先度', size: { innerHeight: 60 } }
            ]
          }]
        }
      }
    };
    const targetBundle = {
      appId: 2,
      meta: { appName: '比較先アプリ' },
      sections: {
        layoutSettings: {
          layout: [{
            type: 'ROW',
            fields: [
              { code: 'amount', label: '金額' },
              { code: 'priority', label: '優先度', size: { innerHeight: 80 } }
            ]
          }]
        }
      }
    };
    const computed = computeDiffRows(sourceBundle, targetBundle, ['layoutSettings'], '');
    const rows = enrichDiffRows(computed.rows, sourceBundle, targetBundle);
    expect(rows).toHaveLength(1);
    expect(rows[0].reasonSummary).toContain('行 #1');

    const list = await readWorksheetByName(buildDiffXlsxBlob({
      sourceBundle,
      targetBundle,
      rows
    }), '差分一覧');

    expect(list).toContain('レイアウト行 #1 / フィールド #2 「優先度」（priority） / 内側の高さ');
    expect(list).toContain('レイアウト行「行 #1」 / 入力欄の高さ 変更');
    expect(list).not.toContain('行 #0');
    expect(list).not.toContain('行 #2');
    expect(list).not.toContain('innerheight');
  });

  it('never exposes an unknown technical path in the human list item column', async () => {
    const rawPath = 'unknownSettings.deep[0].opaqueToken';
    const blob = buildDiffXlsxBlob({
      rows: [{ sectionKey: 'unknownSettings', type: 'changed', path: rawPath, label: rawPath, left: 'A', right: 'B' }]
    });
    const list = await readWorksheetByName(blob, '差分一覧');
    const technical = await readWorksheetByName(blob, 'unknownSettings');

    expect(list).toContain('項目名を判別できません（技術明細を確認）');
    expect(list).not.toContain(rawPath);
    expect(technical).toContain(rawPath);
  });

  it('shows generic list values without JSON quotes and distinguishes blank from missing', async () => {
    const list = await readWorksheetByName(buildDiffXlsxBlob({
      sourceBundle: { appId: 1, meta: { appName: '開発' } },
      targetBundle: { appId: 2, meta: { appName: '本番' } },
      rows: [
        { sectionKey: 'layoutSettings', type: 'changed', path: 'layoutSettings.layout[0].size.width', left: '300', right: '360' },
        { sectionKey: 'processSettings', type: 'changed', path: 'processSettings.actions[0].filterCond', left: '', right: 'status = "OPEN"' },
        { sectionKey: 'viewSettings', type: 'added', path: 'viewSettings.views.New', right: { type: 'LIST' } },
        { sectionKey: 'appSettings', type: 'changed', path: 'appSettings.enable', left: false, right: true }
      ]
    }), '差分一覧');

    expect(list).toContain('300');
    expect(list).toContain('360');
    expect(list).not.toContain('&quot;300&quot;');
    expect(list).toContain('（空欄）');
    expect(list).toContain('status = &quot;OPEN&quot;');
    expect(list).toContain('（存在しません）');
    // enable の真偽値は はい/いいえ ではなく設定画面の文脈語で表示する
    expect(list).toContain('無効');
    expect(list).toContain('有効');
  });

  it('localizes section-scoped enum values in the human list and field sheets', async () => {
    const fields = {
      金額: { type: 'NUMBER', code: '金額', label: '金額', unitPosition: 'AFTER' },
      合計: { type: 'CALC', code: '合計', label: '合計', format: 'NUMBER' },
      基本情報: { type: 'GROUP', code: '基本情報', label: '基本情報', openGroup: true }
    };
    const blob = buildDiffXlsxBlob({
      sourceBundle: { sections: { fieldSettings: { properties: fields } } },
      targetBundle: { sections: { fieldSettings: { properties: fields } } },
      rows: [
        { sectionKey: 'fieldSettings', type: 'changed', path: 'fieldSettings.properties.金額.unitPosition', left: 'AFTER', right: 'BEFORE' },
        { sectionKey: 'fieldSettings', type: 'changed', path: 'fieldSettings.properties.合計.format', left: 'NUMBER', right: 'NUMBER_DIGIT' },
        { sectionKey: 'fieldSettings', type: 'changed', path: 'fieldSettings.properties.基本情報.openGroup', left: true, right: false },
        { sectionKey: 'appSettings', type: 'changed', path: 'appSettings.theme', left: 'WHITE', right: 'RED' },
        { sectionKey: 'appSettings', type: 'changed', path: 'appSettings.icon.type', left: 'PRESET', right: 'FILE' },
        { sectionKey: 'viewSettings', type: 'changed', path: 'viewSettings.views.カスタム.device', left: 'ANY', right: 'DESKTOP' },
        { sectionKey: 'processSettings', type: 'changed', path: 'processSettings.states.処理中.assignee.type', left: 'ANY', right: 'ALL' },
        { sectionKey: 'pluginSettings', type: 'changed', path: 'pluginSettings.plugins[0].enabled', left: true, right: false }
      ]
    });
    const list = await readWorksheetByName(blob, '差分一覧');
    const fieldDetail = await readWorksheetByName(blob, 'フィールド差分詳細');

    // フィールド設定の enum 値はフィールド設定画面の選択肢名で表示する
    expect(fieldDetail).toContain('後につける');
    expect(fieldDetail).toContain('前につける');
    expect(fieldDetail).toContain('数値（桁区切り）');
    expect(fieldDetail).toContain('グループの初期表示');
    expect(fieldDetail).toContain('グループを開いた状態で表示');
    expect(list).toContain('後につける');

    // 非フィールドセクションの enum 値・ラベルも画面用語で表示する
    expect(list).toContain('ホワイト');
    expect(list).toContain('レッド');
    expect(list).toContain('アイコン');
    expect(list).toContain('アップロードファイル');
    expect(list).toContain('表示するデバイス');
    expect(list).toContain('PC・モバイル両方');
    expect(list).toContain('PC版のみ');
    expect(list).toContain('候補のうち誰か1人が作業する');
    expect(list).toContain('候補の全員が作業する');
    expect(list).toContain('有効状態');
    const humanCells = [...list.matchAll(/<c r="[A-L]\d+"[^>]*t="inlineStr"><is><t[^>]*>([\s\S]*?)<\/t>/g)]
      .map((match) => match[1]);
    // 人向け列に raw enum が残らない（差分IDやパス以外のセル本文を検査）
    for (const raw of ['AFTER', 'BEFORE', 'NUMBER_DIGIT', 'WHITE', 'RED', 'PRESET', 'DESKTOP', 'openGroup']) {
      expect(humanCells.filter((cell) => new RegExp(`(?<![A-Za-z0-9_])${raw}(?![A-Za-z0-9_])`).test(cell))).toEqual([]);
    }
  });

  it('localizes report sort, periodic report, and reminder offsets in the customer workbook', async () => {
    const blob = buildDiffXlsxBlobWithSafeDefault({
      audience: 'customer',
      rows: [
        { sectionKey: 'viewSettings', type: 'changed', path: 'viewSettings.views.カスタム.device', left: 'ANY', right: 'DESKTOP' },
        { sectionKey: 'reportSettings', type: 'changed', path: 'reportSettings.reports.売上集計.sorts[0].order', left: 'DESC', right: 'ASC' },
        {
          sectionKey: 'reportSettings', type: 'added', path: 'reportSettings.reports.売上集計.periodicReport',
          right: { active: true, period: { every: 'WEEK', dayOfWeek: 'MONDAY', time: '09:00' } }
        },
        { sectionKey: 'reminderNotifications', type: 'changed', path: 'reminderNotifications.notifications[0].timing.daysLater', left: '-1', right: '3' },
        { sectionKey: 'notifications', type: 'changed', path: 'notifications.notifyToMentioned', left: false, right: true }
      ]
    });
    const list = await readWorksheetByName(blob, '変更一覧');

    expect(list).toContain('一覧「カスタム」');
    expect(list).toContain('表示するデバイス');
    expect(list).toContain('PC・モバイル両方');
    expect(list).toContain('PC版のみ');
    expect(list).toContain('ソートの順序');
    expect(list).toContain('大きい順');
    expect(list).toContain('小さい順');
    expect(list).toContain('定期レポート');
    expect(list).toContain('有効（毎週 月曜日 09:00）');
    expect(list).toContain('通知する日');
    expect(list).toContain('1日前');
    expect(list).toContain('3日後');
    expect(list).toContain('コメントの宛先ユーザーへの通知');
    for (const raw of ['DESC', 'ASC', 'DESKTOP', 'MONDAY', 'daysLater', 'notifyToMentioned', 'periodicReport', 'device']) {
      expect(list).not.toContain(raw);
    }
  });

  it('summarizes non-field object and array values in the master list while retaining raw section evidence', async () => {
    const blob = buildDiffXlsxBlob({
      rows: [
        {
          sectionKey: 'viewSettings', type: 'changed', path: 'viewSettings.views.Sales',
          left: { type: 'LIST', name: '売上一覧', fields: ['customer', 'amount'] },
          right: { type: 'CALENDAR', name: '売上カレンダー', fields: ['date', 'amount'] }
        },
        {
          sectionKey: 'layoutSettings', type: 'added', path: 'layoutSettings.layout[0].fields[0]',
          right: { code: 'amount', type: 'NUMBER' }
        }
      ]
    });
    const list = await readWorksheetByName(blob, '差分一覧');
    const layoutTechnical = await readWorksheetByName(blob, 'レイアウト設定');
    const viewTechnical = await readWorksheetByName(blob, 'ビュー設定');

    expect(list).toContain('詳細は「ビュー設定」シートで確認');
    expect(list).not.toContain('&quot;fields&quot;');
    expect(list).not.toContain('&quot;customer&quot;');
    expect(list).toContain('種別: 数値');
    expect(list).not.toContain('種別: NUMBER');
    expect(viewTechnical).toContain('&quot;fields&quot;');
    expect(viewTechnical).toContain('&quot;customer&quot;');
    expect(layoutTechnical).toContain('&quot;NUMBER&quot;');
  });

  it('keeps the field model stable when diff rows are re-ordered', () => {
    const rows = [
      { sectionKey: 'fieldSettings', type: 'changed', severity: 'high', path: 'fieldSettings.properties.customer.required', left: false, right: true },
      { sectionKey: 'fieldSettings', type: 'changed', severity: 'medium', path: 'fieldSettings.properties.customer.label', left: '顧客', right: '取引先' },
      { sectionKey: 'fieldSettings', type: 'changed', severity: 'low', path: 'fieldSettings.properties.status.options.OPEN.label', left: '未完了', right: '対応中' }
    ];
    const normalize = (input: typeof rows) => {
      const model = buildDiffXlsxFieldModel({ rows: input });
      return {
        details: model.details.map(({ fieldCode, fieldName, settingKey, settingLabel }) => ({
          fieldCode, fieldName, settingKey, settingLabel
        })),
        summaries: model.summaries
      };
    };
    expect(normalize(rows)).toEqual(normalize([...rows].reverse()));
    expect(normalize(rows).details).toContainEqual(expect.objectContaining({
      fieldCode: 'status', settingKey: 'options.OPEN.label', settingLabel: '選択肢「OPEN」 / フィールド名'
    }));
  });

  it('keeps stable difference IDs when rows are re-ordered', async () => {
    const rows = [
      { sectionKey: 'appSettings', type: 'changed', path: 'appSettings.name', left: 'A', right: 'B' },
      { sectionKey: 'fieldSettings', type: 'added', path: 'fieldSettings.properties.code', right: { code: 'code' } }
    ];
    const first = await readWorksheetByName(buildDiffXlsxBlob({ rows }), '差分一覧');
    const second = await readWorksheetByName(buildDiffXlsxBlob({ rows: [...rows].reverse() }), '差分一覧');
    const firstIds = [...first.matchAll(/D-[0-9A-F]{8}/g)].map((match) => match[0]).sort();
    const secondIds = [...second.matchAll(/D-[0-9A-F]{8}/g)].map((match) => match[0]).sort();
    expect(firstIds).toEqual(secondIds);
    expect(new Set(firstIds).size).toBe(2);
  });

  it('binds duplicate-path IDs and field-detail links to the exact source row', async () => {
    const firstRow = {
      sectionKey: 'fieldSettings', type: 'changed', path: 'fieldSettings.properties.customer.label',
      left: '顧客', right: '取引先'
    };
    const secondRow = {
      sectionKey: 'fieldSettings', type: 'changed', path: 'fieldSettings.properties.customer.label',
      left: '顧客', right: '得意先'
    };
    const firstOnly = await readWorksheetByName(buildDiffXlsxBlob({ rows: [firstRow] }), '差分一覧');
    const expectedFirstId = firstOnly.match(/D-[0-9A-F]{8}/)?.[0];
    const reversed = await readWorksheetByName(buildDiffXlsxBlob({ rows: [secondRow, firstRow] }), '差分一覧');
    expect(expectedFirstId).toBeTruthy();
    expect(reversed).toContain(expectedFirstId!);

    const repeated = { ...firstRow };
    const repeatedBlob = buildDiffXlsxBlob({ rows: [repeated, repeated] });
    const list = await readWorksheetByName(repeatedBlob, '差分一覧');
    const detail = await readWorksheetByName(repeatedBlob, 'フィールド差分詳細');
    const technical = await readWorksheetByName(repeatedBlob, 'フィールド技術明細');
    const ids = [...list.matchAll(/D-[0-9A-F]{8}(?:-\d+)?/g)].map((match) => match[0]);
    expect(ids).toHaveLength(2);
    expect(new Set(ids).size).toBe(2);
    expect(detail).toContain('<hyperlink ref="A4" location="&apos;差分一覧&apos;!I4"');
    expect(detail).toContain('<hyperlink ref="A5" location="&apos;差分一覧&apos;!I5"');
    expect(list).toContain('<hyperlink ref="E4" location="&apos;フィールド技術明細&apos;!A4"');
    expect(list).toContain('<hyperlink ref="E5" location="&apos;フィールド技術明細&apos;!A5"');
    expect(technical).toContain('<hyperlink ref="A4" location="&apos;差分一覧&apos;!I4"');
    expect(technical).toContain('<hyperlink ref="A5" location="&apos;差分一覧&apos;!I5"');
  });

  it('treats an added setting as a setting change rather than a new field', async () => {
    const blob = buildDiffXlsxBlob({
      sourceBundle: { sections: { fieldSettings: { properties: { amount: { code: 'amount', label: '金額', type: 'NUMBER' } } } } },
      targetBundle: { sections: { fieldSettings: { properties: { amount: { code: 'amount', label: '金額', type: 'NUMBER', unit: '円' } } } } },
      rows: [{
        sectionKey: 'fieldSettings', type: 'added', severity: 'medium',
        path: 'fieldSettings.properties.amount.unit', right: '円'
      }]
    });
    const summary = await readWorksheetByName(blob, 'フィールド差分要約');
    const detail = await readWorksheetByName(blob, 'フィールド差分詳細');
    const list = await readWorksheetByName(blob, '差分一覧');
    expect(summary).toContain('設定変更');
    expect(summary).not.toContain('追加（比較先のみ）');
    expect(summary).toMatch(/<c r="A4" s="2"/);
    for (const xml of [detail, list]) {
      expect(xml).toContain('設定追加');
      expect(xml).toContain('比較先のみ');
      expect(xml).toContain('（未設定）');
      expect(xml).not.toContain('追加（比較先にのみ存在）');
    }
  });

  it('treats a removed setting as unset on the target rather than a removed field', async () => {
    const blob = buildDiffXlsxBlob({
      sourceBundle: { sections: { fieldSettings: { properties: { amount: { code: 'amount', label: '金額', type: 'NUMBER', unit: '円' } } } } },
      targetBundle: { sections: { fieldSettings: { properties: { amount: { code: 'amount', label: '金額', type: 'NUMBER' } } } } },
      rows: [{
        sectionKey: 'fieldSettings', type: 'removed', severity: 'medium',
        path: 'fieldSettings.properties.amount.unit', left: '円'
      }]
    });
    const detail = await readWorksheetByName(blob, 'フィールド差分詳細');
    const list = await readWorksheetByName(blob, '差分一覧');
    for (const xml of [detail, list]) {
      expect(xml).toContain('設定削除');
      expect(xml).toContain('比較元のみ');
      expect(xml).toContain('（未設定）');
      expect(xml).not.toContain('削除（比較元にのみ存在）');
    }
  });

  it('never falls back to raw JSON in the human field detail', async () => {
    const blob = buildDiffXlsxBlob({
      rows: [{
        sectionKey: 'fieldSettings', type: 'added', severity: 'high',
        path: 'fieldSettings.properties.legacy', right: { unknown: { token: 'RAW_TECHNICAL_MARKER' } }
      }]
    });
    const detail = await readWorksheetByName(blob, 'フィールド差分詳細');
    const list = await readWorksheetByName(blob, '差分一覧');
    const technical = await readWorksheetByName(blob, 'フィールド技術明細');
    expect(detail).toContain('要約できない形式です');
    expect(detail).not.toContain('RAW_TECHNICAL_MARKER');
    expect(list).toContain('要約できない形式です');
    expect(list).not.toContain('RAW_TECHNICAL_MARKER');
    expect(technical).toContain('RAW_TECHNICAL_MARKER');
  });

  it('surfaces unstructured field differences on the overview', async () => {
    const blob = buildDiffXlsxBlob({
      scopes: ['fieldSettings'],
      rows: [{
        sectionKey: 'fieldSettings', type: 'added', severity: 'high', path: 'fieldSettings',
        right: { properties: { legacy: { marker: 'UNSTRUCTURED_FIELD_DIFF' } } }
      }]
    });
    const workbook = await readEntry(blob, 'xl/workbook.xml');
    const summary = await readWorksheetByName(blob, '概要');
    expect(workbook).not.toContain('name="フィールド差分要約"');
    expect(workbook).toContain('name="フィールド技術明細"');
    expect(summary).toContain('構造化できない差分 1件');
    expect(summary).toContain('技術明細を見る');
    expect(summary).toContain('<hyperlink ref="D20" location="&apos;フィールド技術明細&apos;!A4"');
  });

  it('exports a zero-difference evidence workbook instead of throwing', async () => {
    const blob = buildDiffXlsxBlob({
      generatedAt: '2026-08-16T00:00:00.000Z',
      rows: [],
      fetchIssues: [],
      partialIssues: [],
      scopes: ['fieldSettings'],
      sourceBundle: { appId: 1, meta: { appName: '同一アプリA' } },
      targetBundle: { appId: 2, meta: { appName: '同一アプリB' } }
    });
    const summary = await readWorksheetByName(blob, '概要');
    const list = await readWorksheetByName(blob, '差分一覧');
    const workbook = await readEntry(blob, 'xl/workbook.xml');
    expect(summary).toContain('差分なし');
    expect(summary).toContain('<c r="B6" s="25"');
    expect(summary).toContain('<c r="D6" s="25"');
    expect(summary).toContain('フィールド差分');
    expect(summary).toContain('0件（走査済み）');
    expect(summary).not.toContain('差分なしとは判断できません');
    expect(summary).not.toContain('フィールド差分要約');
    expect(summary).not.toContain('取得・未検証');
    expect((list.match(/<row r="/g) || []).length).toBe(4);
    expect(list).toContain('このシートで分かること：このブックに収録された差分');
    expect(list).toContain('差分はありません');
    expect(list).toContain('<c r="A4" s="25"');
    expect(list).toContain('<mergeCell ref="A4:L4"/>');
    expect(list).not.toContain('<autoFilter');
    expect(list).not.toContain('xSplit=');
    expect(workbook).toContain('&apos;差分一覧&apos;!$2:$3</definedName>');
    expect(workbook).not.toContain('&apos;差分一覧&apos;!$2:$3,&apos;差分一覧&apos;!$A:');
    expect(summary).toContain('<hyperlink ref="A26" location="&apos;変更対象一覧&apos;!A4"');
    expect(summary).toContain('<hyperlink ref="A27" location="&apos;差分一覧&apos;!A3"');
    expect(workbook).not.toContain('name="フィールド差分要約"');
    expect(workbook).not.toContain('name="フィールド差分詳細"');
  });

  it('keeps an empty filtered internal export neutral instead of declaring no difference', async () => {
    const blob = buildDiffXlsxBlob({
      audience: 'internal',
      exportMode: 'filtered',
      exportLabel: '表示中（フィルタ適用後）',
      rows: [],
      fetchIssues: [],
      partialIssues: [],
      scopes: ['fieldSettings']
    });
    const summary = await readWorksheetByName(blob, '概要');
    const list = await readWorksheetByName(blob, '差分一覧');

    expect(summary).toContain('絞り込み後：掲載対象なし');
    expect(summary).toContain('<c r="B6" s="24"');
    expect(summary).not.toContain('差分なし');
    expect(list).toContain('現在の絞り込み条件に該当する変更はありません');
    expect(list).toContain('<c r="A4" s="24"');
    expect(list).toContain('<mergeCell ref="A4:L4"/>');
    expect(list).not.toContain('<autoFilter');
    expect(list).not.toContain('xSplit=');
  });

  it('records fetch failures, partial comparison, and truncation as incomplete', async () => {
    const blob = buildDiffXlsxBlob({
      rows: [],
      fetchIssues: [{ sectionKey: 'pluginSettings', side: 'target', targetError: 'HTTP 403' }],
      partialIssues: [{
        sectionKey: 'customizeSettings', side: 'source', message: '本文未検証',
        files: [{ fileName: 'desktop.js', fileKey: 'abc', reason: 'サイズ上限' }]
      }],
      truncation: {
        truncated: true,
        diffLimit: 1000,
        droppedDiff: 2,
        sections: [{ sectionKey: 'fieldSettings', droppedDiff: 2 }]
      }
    });
    const summary = await readWorksheetByName(blob, '概要');
    const issues = await readWorksheetByName(blob, '取得・未検証');
    const list = await readWorksheetByName(blob, '差分一覧');
    expect(summary).toContain('比較不完全（差分なしとは判断できません）');
    expect(summary).toContain('差分上限 1000 件');
    expect(summary).toContain('一部未検証');
    expect(issues).toContain('取得失敗');
    expect(issues).toContain('HTTP 403');
    expect(issues).toContain('本文未検証');
    expect(issues).toContain('desktop.js: サイズ上限');
    expect(issues).toContain('件数上限');
    expect(issues).toContain('<c r="A3" s="26"');
    expect(issues).toContain('<c r="A4" s="27"');
    expect(issues).toContain('<c r="A5" s="27"');
    expect(list).toContain('比較できなかった範囲があります。概要と「取得・未検証」を確認してください');
    expect(list).toContain('<c r="A4" s="27"');
    expect(list).toContain('<mergeCell ref="A4:L4"/>');
    expect(list).not.toContain('差分はありません');
    expect(list).not.toContain('<autoFilter');
    expect(list).not.toContain('xSplit=');
  });

  it('distinguishes partial, unscanned, and complete truncation counts', async () => {
    const blob = buildDiffXlsxBlob({
      rows: [],
      truncation: {
        truncated: true,
        diffLimit: 1000,
        sections: [
          {
            sectionKey: 'fieldSettings',
            section: 'フィールド設定',
            scanned: true,
            partiallyScanned: true,
            scanStatus: 'partial',
            omittedDiffCount: null,
            droppedDiff: 0,
            droppedSame: 0
          },
          {
            sectionKey: 'viewSettings',
            section: 'ビュー',
            scanned: false,
            partiallyScanned: false,
            scanStatus: 'unscanned',
            omittedDiffCount: null,
            droppedDiff: 0,
            droppedSame: 0
          },
          {
            sectionKey: 'reportSettings',
            section: 'グラフ',
            scanned: true,
            partiallyScanned: false,
            scanStatus: 'complete',
            omittedDiffCount: 1,
            droppedDiff: 1,
            droppedSame: 0
          }
        ]
      }
    });
    const summary = await readWorksheetByName(blob, '概要');
    const issues = await readWorksheetByName(blob, '取得・未検証');

    expect(summary).toContain('部分走査・総件数不明（表示件数は下限）');
    expect(summary).toContain('未走査・件数不明');
    expect(issues).toContain('このセクションは部分走査です。表示件数は総件数の下限です');
    expect(issues).toContain('差分 部分走査・総件数不明（表示件数は下限）');
    expect(issues).toContain('このセクションは未走査です');
    expect(issues).toContain('差分 未走査・件数不明');
    expect(issues).toContain('この片側セクションは全体を確認済みです');
    expect(issues).toContain('差分 1件（既知）');
    expect(issues).not.toContain('差分 0件以上');
    expect(issues).not.toContain('同一 0件以上');
  });

  it('keeps the internal workbook complete when only same evidence was omitted', async () => {
    const blob = buildDiffXlsxBlob({
      audience: 'internal',
      scopes: ['appSettings'],
      rows: [{ sectionKey: 'appSettings', type: 'changed', path: 'appSettings.name', left: '旧', right: '新' }],
      truncation: {
        truncated: true,
        actualDiffIncomplete: false,
        diffLimit: 1000,
        sameLimit: 3000,
        droppedDiff: 0,
        droppedSame: 5,
        sections: [{
          sectionKey: 'appSettings',
          scanStatus: 'complete',
          omittedDiffCount: 0,
          droppedDiff: 0,
          droppedSame: 5
        }]
      }
    });
    const workbook = await readEntry(blob, 'xl/workbook.xml');
    const summary = await readWorksheetByName(blob, '概要');

    expect([...workbook.matchAll(/<sheet\b[^>]*\bname="([^"]+)"/g)].map((match) => match[1])).not.toContain('取得・未検証');
    expect(summary).toContain('差分あり');
    expect(summary).toContain('<c r="B6" s="28"');
    expect(summary).toContain('<c r="D6" s="25"');
    expect(summary).toContain('完全（差分走査済み / 同一証跡 5件を省略）');
    expect(summary).toContain('同一証跡 5件を省略');
    expect(summary).toContain('実差分の検出結果は完全です');
    expect(summary).not.toContain('比較不完全（差分なしとは判断できません）');
  });

  it.each([
    { omitted: 0, expected: '0件（走査済み）' },
    { omitted: 2, expected: '確認できた差分 0件（走査済み・一部未収録 2件）' }
  ])('keeps a completely scanned field section objective when omitted count is $omitted', async ({
    omitted, expected
  }) => {
    const summary = await readWorksheetByName(buildDiffXlsxBlob({
      rows: [],
      scopes: ['fieldSettings'],
      truncation: {
        truncated: true,
        sections: [{
          sectionKey: 'fieldSettings',
          scanned: true,
          partiallyScanned: false,
          scanStatus: 'complete',
          omittedDiffCount: omitted,
          droppedDiff: omitted,
          droppedSame: 0
        }]
      }
    }), '概要');

    expect(summary).toContain(expected);
    expect(summary).not.toContain('未判定（取得・走査が不完全）');
  });

  it('aggregates overview sections from scopes, rows, issues, and truncation metadata', async () => {
    const summary = await readWorksheetByName(buildDiffXlsxBlob({
      scopes: ['fieldSettings'],
      rows: [{ sectionKey: 'appSettings', type: 'same', path: 'appSettings.name', left: 'A', right: 'A' }],
      fetchIssues: [{ sectionKey: 'pluginSettings', side: 'source', message: '取得不可' }],
      partialIssues: [{ sectionKey: 'customizeSettings', side: 'target', message: '本文未検証' }],
      truncation: {
        truncated: true,
        sections: [{
          sectionKey: 'reportSettings',
          scanStatus: 'complete',
          omittedDiffCount: 1,
          droppedDiff: 1,
          droppedSame: 0
        }]
      }
    }), '概要');

    expect(worksheetRowContaining(summary, 'アプリ設定')).toMatch(/<v>1<\/v>[\s\S]*同一 1[\s\S]*走査済み/);
    expect(worksheetRowContaining(summary, 'フィールド設定')).toMatch(/<v>0<\/v>[\s\S]*走査済み/);
    expect(worksheetRowContaining(summary, 'グラフ設定')).toMatch(/<v>0<\/v>[\s\S]*走査済み・一部省略/);
    expect(worksheetRowContaining(summary, 'プラグイン(※)')).toMatch(/<v>0<\/v>[\s\S]*取得失敗あり/);
    expect(worksheetRowContaining(summary, 'JS/CSS設定')).toMatch(/<v>0<\/v>[\s\S]*一部未検証/);
  });

  it('expands long overview warnings and issue rows within readable height caps', async () => {
    const longSectionNames = Array.from({ length: 12 }, (_, index) => `未走査セクション-${index + 1}-${'長'.repeat(12)}`);
    const blob = buildDiffXlsxBlob({
      rows: [],
      fetchIssues: [{ sectionKey: 'pluginSettings', side: 'target', message: '取得理由'.repeat(80) }],
      truncation: {
        truncated: true,
        diffLimit: 100,
        sections: longSectionNames.map((section) => ({
          section,
          scanStatus: 'unscanned',
          omittedDiffCount: null
        }))
      }
    });
    const summary = await readWorksheetByName(blob, '概要');
    const issues = await readWorksheetByName(blob, '取得・未検証');
    const summaryHeight = Number(worksheetRowContaining(summary, '⚠ 件数上限').match(/ht="([0-9.]+)"/)?.[1] || 0);
    const issueHeight = Number(issues.match(/<row r="3" ht="([0-9.]+)" customHeight="1">/)?.[1] || 0);

    expect(summaryHeight).toBeGreaterThan(26);
    expect(summaryHeight).toBeLessThanOrEqual(132);
    expect(issueHeight).toBeGreaterThan(30);
    expect(issueHeight).toBeLessThanOrEqual(160);
  });

  it('redacts identical plugin settings and customize bodies', async () => {
    const blob = buildDiffXlsxBlob({
      rows: [{
        sectionKey: 'pluginSettings', type: 'same', path: 'pluginSettings',
        left: { plugins: [{ id: 'plugin-1', config: { token: 'PLUGIN_SAME_SECRET' } }] },
        right: { plugins: [{ id: 'plugin-1', config: { token: 'PLUGIN_SAME_SECRET' } }] }
      }, {
        sectionKey: 'customizeSettings', type: 'same', path: 'customizeSettings.desktop.js[0].file._body',
        left: 'CUSTOM_SAME_SECRET', right: 'CUSTOM_SAME_SECRET'
      }]
    });
    const summary = await readWorksheetByName(blob, '概要');
    const list = await readWorksheetByName(blob, '差分一覧');

    expect(summary).toContain('機密値省略');
    expect(list).toContain('同一の機密値は安全のため省略しました');
    expect(list).not.toContain('PLUGIN_SAME_SECRET');
    expect(list).not.toContain('CUSTOM_SAME_SECRET');
  });

  it('does not derive sensitive same-row difference IDs from the raw secret', async () => {
    const differenceIdFor = async (secret: string) => {
      const list = await readWorksheetByName(buildDiffXlsxBlob({
        rows: [{
          sectionKey: 'pluginSettings', type: 'same', path: 'pluginSettings',
          left: { plugins: [{ id: 'plugin-1', config: { token: secret } }] },
          right: { plugins: [{ id: 'plugin-1', config: { token: secret } }] }
        }]
      }), '差分一覧');
      return list.match(/D-[0-9A-F]{8}/)?.[0];
    };

    expect(await differenceIdFor('1234')).toBe(await differenceIdFor('1235'));
  });

  it('counts moved changes and excludes display-only rows from diff totals', async () => {
    const summary = await readWorksheetByName(buildDiffXlsxBlob({
      rows: [
        { sectionKey: 'layoutSettings', type: 'changed', moved: true, path: 'layoutSettings.layout[0]' },
        { sectionKey: 'processSettings', type: 'changed', path: 'processSettings.__rename__', _displayOnly: true },
        { sectionKey: 'appSettings', type: 'same', path: 'appSettings' }
      ]
    }), '概要');
    expect(summary).toMatch(/<c r="B7"[^>]*><v>1<\/v>/);
    expect(summary).toMatch(/<c r="B10"[^>]*><v>0<\/v>/);
    expect(summary).toMatch(/<c r="B11"[^>]*><v>1<\/v>/);
    expect(summary).toMatch(/<c r="B12"[^>]*><v>1<\/v>/);
    expect(summary).not.toMatch(/<c r="C(?:10|11|12)"/);
    expect(summary).toMatch(/<c r="B4"[^>]*>[\s\S]*?未記録[\s\S]*?<\/c>/);
    expect(summary).toMatch(/<c r="D4"[^>]*>[\s\S]*?未記録[\s\S]*?<\/c>/);
    expect(summary).toMatch(/<c r="B14"[^>]*>[\s\S]*?未記録[\s\S]*?<\/c>/);
    expect(summary).toMatch(/<c r="D14"[^>]*>[\s\S]*?未記録[\s\S]*?<\/c>/);
  });

  it('keeps formula-looking values as inline text without formulas or external links', async () => {
    const list = await readWorksheetByName(buildDiffXlsxBlob({
      rows: [
        { sectionKey: 'appSettings', type: 'changed', path: 'appSettings.name', left: '=1+1', right: ' +SUM(A1:A2)' },
        { sectionKey: 'appSettings', type: 'changed', path: 'appSettings.description', left: '\t-HYPERLINK("https://example.com")', right: '@SUM(A1:A2)' }
      ]
    }), '差分一覧');
    expect(list).toContain('t="inlineStr"');
    expect(list).not.toContain('<f>');
    expect(list).toContain('<hyperlink ref="E4" location="&apos;アプリ設定&apos;!A4"');
    expect(list).not.toContain('r:id=');
    expect(list).not.toContain('externalLink');
    expect(list).toContain('=1+1');
    expect(list).toContain('@SUM(A1:A2)');
  });

  it('uses readable long-value previews with original UTF-16 length and distinct hashes', async () => {
    const common = 'x'.repeat(5000);
    const list = await readWorksheetByName(buildDiffXlsxBlob({
      rows: [{
        sectionKey: 'appSettings',
        type: 'changed',
        path: 'appSettings.description',
        left: `${common}LEFT_ONLY_TAIL`,
        right: `${common}RIGHT_ONLY_TAIL`
      }]
    }), '差分一覧');
    const hashes = [...new Set([...list.matchAll(/識別:([0-9A-F]{8})/g)].map((match) => match[1]))];
    expect(hashes).toHaveLength(2);
    expect(hashes[0]).not.toBe(hashes[1]);
    expect(list).toContain('[一部表示: 元データ 5014文字（UTF-16） / 識別:');
    expect(list).toContain('[一部表示: 元データ 5015文字（UTF-16） / 識別:');
    expect(list).toContain('値先頭の「[一部表示]」は技術明細または元データを確認します。');
    expect(list).toContain('元UTF-16長 5014');
    expect(list).toContain('元UTF-16長 5015');
    expect(list).not.toContain('LEFT_ONLY_TAIL');
    expect(list).not.toContain('RIGHT_ONLY_TAIL');
  });

  it('clips long-value previews only at grapheme-cluster boundaries', async () => {
    const list = await readWorksheetByName(buildDiffXlsxBlob({
      rows: [{
        sectionKey: 'appSettings',
        type: 'changed',
        path: 'appSettings.description',
        left: '👩‍💻'.repeat(1000),
        right: '変更後'
      }]
    }), '差分一覧');
    const preview = worksheetInlineTexts(list, 'F', 4)[0];
    const body = preview.slice(preview.indexOf('\n') + 1, preview.lastIndexOf('\n…'));

    expect(body.endsWith('👩‍💻')).toBe(true);
    expect(body.endsWith('👩')).toBe(false);
    expect(preview).not.toContain('�');
  });

  it('applies the same long-value safety preview to field detail values', async () => {
    const common = '値'.repeat(5000);
    const detail = await readWorksheetByName(buildDiffXlsxBlob({
      rows: [{
        sectionKey: 'fieldSettings',
        type: 'changed',
        path: 'fieldSettings.properties.notes.defaultValue',
        left: `${common}FIELD_LEFT_TAIL`,
        right: `${common}FIELD_RIGHT_TAIL`
      }]
    }), 'フィールド差分詳細');
    const hashes = [...new Set([...detail.matchAll(/識別:([0-9A-F]{8})/g)].map((match) => match[1]))];
    expect(hashes).toHaveLength(2);
    expect(hashes[0]).not.toBe(hashes[1]);
    expect(detail).toContain('[一部表示: 元データ 5015文字（UTF-16） / 識別:');
    expect(detail).toContain('[一部表示: 元データ 5016文字（UTF-16） / 識別:');
    expect(detail).toContain('値先頭の「[一部表示]」は技術明細または元データを確認します。');
    expect(detail).not.toContain('FIELD_LEFT_TAIL');
    expect(detail).not.toContain('FIELD_RIGHT_TAIL');
  });

  it('uses app names from appSettings when building the filename', () => {
    const result = buildDiffXlsxExport({
      rows: [],
      sourceBundle: { appId: 10, sections: { appSettings: { name: '受注/管理' } } },
      targetBundle: { appId: 20, sections: { appSettings: { name: '受注:改修' } } }
    });
    expect(result.filename).toMatch(/^差分一覧_/);
    expect(result.filename).toMatch(/app10/i);
    expect(result.filename).toMatch(/app20/i);
    expect(result.filename).toMatch(/\.xlsx$/);
    expect(result.filename).not.toMatch(/[\/:*?"<>|]/);
  });

  it('sanitizes an explicit customer filename and clips it without splitting graphemes', () => {
    const result = buildDiffXlsxExportWithSafeDefault({
      audience: 'customer',
      rows: [],
      filename: `\u202Eunsafe/name\u0001${'👩‍💻'.repeat(100)}\uD800.xlsx`
    });

    expect(result.filename).toMatch(/\.xlsx$/);
    expect(result.filename.length).toBeLessThanOrEqual(180);
    expect(result.filename).not.toMatch(/[\\/:*?"<>|\u0000-\u001F\u007F-\u009F\u061C\u200E\u200F\u202A-\u202E\u2066-\u206F]/);
    expect(hasLoneSurrogate(result.filename)).toBe(false);
    expect(result.filename.slice(0, -'.xlsx'.length)).not.toMatch(/\u200D$/);
    expect(result.filename).not.toContain('設定差分確認_');
  });

  it('preserves both customer App IDs, the timestamp, and the extension within the filename limit', () => {
    const sharedLongName = `同名アプリ${'👩‍💻長い名前'.repeat(50)}`;
    const result = buildDiffXlsxExportWithSafeDefault({
      audience: 'customer',
      rows: [],
      sourceBundle: { appId: 101, meta: { appName: sharedLongName } },
      targetBundle: { appId: 202, meta: { appName: sharedLongName } }
    });

    expect(result.filename.length).toBeLessThanOrEqual(180);
    expect(result.filename).toContain('(app101)');
    expect(result.filename).toContain('(app202)');
    expect(result.filename).toMatch(/_\d{8}_\d{6}\.xlsx$/);
    expect(result.filename.slice(0, result.filename.search(/_\d{8}_\d{6}\.xlsx$/))).not.toMatch(/\u200D$/);
  });

  it('omits evidence-only sheets and embeds long values in the feature sheet', async () => {
    const longBefore = '変更前の長文'.repeat(1200) + 'BEFORE_END';
    const longAfter = '変更後の長文'.repeat(1200) + 'AFTER_END';
    const blob = buildDiffXlsxBlobWithSafeDefault({ rows: [{ sectionKey: 'appSettings', type: 'changed', path: 'appSettings.description', left: longBefore, right: longAfter }] });
    const names = await readWorkbookSheetNames(blob);
    const feature = await readWorksheetByName(blob, '01_アプリ一般設定');
    expect(names).not.toContain('設定値詳細');
    expect(names).not.toContain('長文原文');
    expect(feature).toContain('BEFORE_END');
    expect(feature).toContain('AFTER_END');
  });


  it('explains a view position change with one-based ordinal values', async () => {
    const blob = buildDiffXlsxBlobWithSafeDefault({ rows: [{ sectionKey: 'viewSettings', type: 'changed', path: 'viewSettings.views.担当者別管理物件一覧.index', left: '5', right: '4' }] });
    const list = await readWorksheetByName(blob, '変更一覧');
    expect(worksheetInlineTexts(list, 'E', 2)).toEqual(['一覧自体の表示順']);
    expect(worksheetInlineTexts(list, 'F', 2)).toEqual(['6番目']);
    expect(worksheetInlineTexts(list, 'G', 2)).toEqual(['5番目']);
  });

  it('uses Meiryo for every workbook font style', async () => {
    const blob = buildDiffXlsxBlobWithSafeDefault({ rows: [{ sectionKey: 'appSettings', type: 'changed', path: 'appSettings.description', left: '変更前', right: '変更後' }] });
    const styles = await readEntry(blob, 'xl/styles.xml');
    const fonts = [...styles.matchAll(/<font>([\s\S]*?)<\/font>/g)].map((match) => match[1]);
    expect(fonts.length).toBeGreaterThan(0);
    for (const font of fonts) expect(font).toContain('<name val="Meiryo"/>');
    expect(styles).not.toContain('<name val="Consolas"/>');
  });

  it('gives the three change-kind areas equal width in the summary', async () => {
    const blob = buildDiffXlsxBlobWithSafeDefault({ rows: [{
      sectionKey: 'appSettings', type: 'changed', path: 'appSettings.name', left: '旧', right: '新'
    }] });
    const summary = await readWorksheetByName(blob, '比較概要');

    for (let column = 1; column <= 6; column += 1) {
      expect(summary).toContain(`<col min="${column}" max="${column}" width="19" customWidth="1"/>`);
    }
  });

  it('shows only the identity for added and removed fields, views, and actions', async () => {
    const blob = buildDiffXlsxBlobWithSafeDefault({ rows: [
      {
        sectionKey: 'fieldSettings', type: 'removed', path: 'fieldSettings.properties.old_field',
        left: { type: 'SINGLE_LINE_TEXT', code: 'old_field', label: '旧フィールド', defaultValue: '不要な設定値' }
      },
      {
        sectionKey: 'viewSettings', type: 'added', path: 'viewSettings.views.新一覧',
        right: { id: '20', name: '新一覧', type: 'LIST', filterCond: 'secret = "value"' }
      },
      {
        sectionKey: 'actionSettings', type: 'removed', entityKind: 'appAction', entityLabel: '旧転記',
        path: 'actionSettings.actions.旧転記', left: { name: '旧転記', mappings: [{ srcField: 'secret' }] }
      }
    ] });
    const list = await readWorksheetByName(blob, '変更一覧');
    const before = worksheetInlineTexts(list, 'F', 2);
    const after = worksheetInlineTexts(list, 'G', 2);

    expect(before).toContain('フィールド「旧フィールド」（コード: old_field）');
    expect(after).toContain('一覧「新一覧」');
    expect(before).toContain('アプリアクション「旧転記」');
    expect(list).not.toContain('不要な設定値');
    expect(list).not.toContain('secret =');
    expect(list).not.toContain('srcField');
  });

});
