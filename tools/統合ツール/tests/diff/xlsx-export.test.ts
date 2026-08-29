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

function decodeXmlText(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

function worksheetInlineTexts(worksheet: string, column: string, firstRow = 1): string[] {
  return [...worksheet.matchAll(/<c r="([A-Z]+)(\d+)"[^>]*t="inlineStr"><is><t[^>]*>([\s\S]*?)<\/t><\/is><\/c>/g)]
    .filter((match) => match[1] === column && Number(match[2]) >= firstRow)
    .sort((a, b) => Number(a[2]) - Number(b[2]))
    .map((match) => decodeXmlText(match[3]));
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
  it('defaults to the customer workbook and records every actual difference row with raw evidence', async () => {
    const blob = buildDiffXlsxBlobWithSafeDefault({
      sourceBundle: { appId: 10101, guestId: '30303', meta: { appName: '変更前アプリ' } },
      targetBundle: { appId: 20202, guestId: '40404', meta: { appName: '変更後アプリ' } },
      scopes: ['appSettings'],
      comparedAt: '2026-08-21T00:00:00.000Z',
      rows: [
        { sectionKey: 'appSettings', type: 'changed', path: 'appSettings.name', left: '旧名称', right: '新名称' },
        { sectionKey: 'appSettings', type: 'same', path: 'appSettings.description', left: 'SAME_ROW_SECRET', right: 'SAME_ROW_SECRET' },
        { sectionKey: 'appSettings', type: 'changed', path: 'appSettings.theme', left: 'A', right: 'B', _displayOnly: true }
      ]
    });
    const workbook = await readEntry(blob, 'xl/workbook.xml');
    const summary = await readWorksheetByName(blob, '比較概要');
    const list = await readWorksheetByName(blob, '変更一覧');
    const detail = await readWorksheetByName(blob, '設定値詳細');
    const allText = await readAllEntryText(blob);

    expect([...workbook.matchAll(/<sheet\b[^>]*\bname="([^"]+)"/g)].map((match) => match[1])).toEqual([
      '比較概要', '変更一覧', '01_アプリ一般設定', '設定値詳細'
    ]);
    expect(list).toContain('設定対象／変更内容');
    expect(list).toContain('旧名称 → 新名称');
    const appSettings = await readWorksheetByName(blob, '01_アプリ一般設定');
    expect(appSettings).toContain('01 アプリ一般設定');
    expect(appSettings).toContain('比較元：変更前アプリ');
    expect(appSettings).toContain('比較先：変更後アプリ');
    expect(appSettings).not.toContain('対象API');
    expect(summary).toContain('kintone 設定差分確認レポート');
    expect(summary).toContain('比較元\n変更前アプリ');
    expect(summary).toContain('比較先\n変更後アプリ');
    expect(summary).toMatch(/<c r="A1" s="6"/);
    expect(summary).toMatch(/<c r="A2" s="16"/);
    expect(summary).toMatch(/<c r="C2" s="32"/);
    expect(summary).toMatch(/<c r="D2" s="17"/);
    expect(summary).toMatch(/<c r="B3" s="19"/);
    expect(summary).toContain('比較結果');
    expect(summary).toContain('比較処理');
    expect(summary).toContain('正常完了（選択範囲）');
    expect(summary).toContain('変更件数');
    expect(summary).toContain('変更一覧の明細');
    expect(summary).not.toContain('詳細を省略した変更');
    for (const removedText of ['掲載内容', '読み方', '表記', '確認時の注意', '反映・移行計画', '並べ替え後']) {
      expect(summary).not.toContain(removedText);
    }
    expect(summary).toContain('比較から除外');
    expect(summary).toMatch(/<c r="F8"[^>]*>[\s\S]*?なし[\s\S]*?<\/c>/);
    expect(summary).toContain('変更一覧を開く');
    expect(summary).toContain('<hyperlink ref="F3" location="&apos;変更一覧&apos;!A1"');
    expect(summary).not.toContain('<hyperlink ref="F4"');
    expect(summary).toMatch(/<c r="F3" s="30"/);
    expect(summary).toContain('<c r="E3" s="12"/>');
    expect(summary).toContain('<c r="E4" s="12"/>');
    expect(summary).toContain('<c r="F4" s="12"/>');
    for (const cell of ['B9', 'C9', 'D9', 'E9', 'F9']) expect(summary).toContain(`<c r="${cell}" s="7"/>`);
    expect(summary).toContain('<mergeCell ref="A2:B2"/>');
    expect(summary).toContain('<mergeCell ref="D2:F2"/>');
    expect(summary).toContain('zoomScale="100" zoomScaleNormal="100"');
    expect(summary).not.toContain('生成日時');
    expect(summary).not.toContain('取得日時');
    expect(summary).not.toContain('正規化設定');
    expect(summary).not.toContain('無視キー');
    expect(summary).not.toContain('シート案内');

    for (const [cell, label] of [
      ['A1', 'No.'], ['B1', '変更区分'], ['C1', '分類'], ['D1', '設定対象'], ['E1', '差分プロパティ'],
      ['F1', '変更前'], ['G1', '変更後']
    ]) {
      expect(list).toMatch(new RegExp(`<c r="${cell}"[^>]*>[\\s\\S]*?${label}[\\s\\S]*?<\\/c>`));
    }
    expect((list.match(/<row r="/g) || []).length).toBe(2);
    expect(list).toContain('<pane xSplit="5" ySplit="1" topLeftCell="F2" activePane="bottomRight" state="frozen"/>');
    expect(list).toContain('<autoFilter ref="A1:G2"/>');
    expect(list).not.toContain('<mergeCell');
    expect(list).toContain('zoomScale="95" zoomScaleNormal="95"');
    expect(list).toContain('orientation="landscape" fitToWidth="1" fitToHeight="0"');
    expect(workbook).toContain('&apos;変更一覧&apos;!$1:$1,&apos;変更一覧&apos;!$A:$E');
    expect(list).not.toContain('<dataValidations');
    for (const removedText of ['顧客レビュー状況', 'レビュー入力', '未レビュー', '未判断', '対応方針']) {
      expect(list).not.toContain(removedText);
    }
    expect(list).not.toMatch(/<c r="[H-Z]\d+"/);
    expect(list).toContain('<col min="7" max="7"');
    expect(list).not.toContain('<col min="8"');
    for (const column of 'ABCDEFG') expect(list).toContain(`<c r="${column}2"`);
    for (const label of ['変更前の原文', '変更後の原文']) {
      expect(detail).toContain(label);
    }
    expect(detail).toMatch(/<c r="D1"[^>]*>[\s\S]*?設定対象[\s\S]*?<\/c>/);
    expect(detail).toMatch(/<c r="E1"[^>]*>[\s\S]*?差分プロパティ[\s\S]*?<\/c>/);
    expect(detail).toContain('<pane xSplit="5" ySplit="1" topLeftCell="F2" activePane="bottomRight" state="frozen"/>');
    expect(detail).toContain('<autoFilter ref="A1:H2"/>');
    expect(detail).not.toContain('<mergeCell');
    expect(workbook).toContain('&apos;設定値詳細&apos;!$1:$1,&apos;設定値詳細&apos;!$A:$E');
    expect(detail).not.toContain('文字列（3文字）');
    expect(detail).toContain('&quot;旧名称&quot;');
    expect(detail).toContain('&quot;新名称&quot;');
    for (const column of 'ABCDEFGH') expect(detail).toContain(`<c r="${column}2"`);
    expect(list).toContain('<hyperlink ref="A2" location="&apos;設定値詳細&apos;!A2"');
    expect(detail).toContain('<hyperlink ref="H2" location="&apos;変更一覧&apos;!A2"');
    expect(list).not.toContain('差分ID');
    expect(list).not.toContain('存在状況');
    expect(list).not.toContain('技術パス');
    expect((allText.match(/<hyperlink\b/g) || []).length).toBe(6);
    expect(allText).not.toContain('<f>');
    expect(allText).not.toContain('externalLink');
    expect(allText).not.toContain('vbaProject');
    expect(allText).not.toContain('connections.xml');
    expect(allText).not.toContain('<dataValidation');
    for (const genericUi of ['顧客向け', '顧客レビュー', '顧客共有']) expect(allText).not.toContain(genericUi);
    expect(allText).not.toContain('確認すること');
    expect(allText).not.toContain('状態・型');
    expect(allText).not.toContain('SAME_ROW_SECRET');
    expect(allText).not.toContain('30303');
    expect(allText).not.toContain('40404');
    expect(allText).not.toContain('10101');
    expect(allText).not.toContain('20202');
  });

  it('removes report-owned customer review UI while preserving similarly named compared data', async () => {
    const field = { code: 'customer_name', label: '顧客名', type: 'SINGLE_LINE_TEXT' };
    const blob = buildDiffXlsxBlobWithSafeDefault({
      sourceBundle: {
        meta: { appName: '顧客管理（開発）' },
        sections: { fieldSettings: { properties: { customer_name: field } } }
      },
      targetBundle: {
        meta: { appName: '顧客管理（本番）' },
        sections: { fieldSettings: { properties: { customer_name: field } } }
      },
      rows: [{
        sectionKey: 'fieldSettings',
        type: 'changed',
        path: 'fieldSettings.properties.customer_name.defaultValue',
        left: '担当者',
        right: 'レビュー'
      }]
    });
    const summary = await readWorksheetByName(blob, '比較概要');
    const list = await readWorksheetByName(blob, '変更一覧');
    const allText = await readAllEntryText(blob);

    expect(summary).toMatch(/<c r="A2"[^>]*>[\s\S]*?顧客管理\(開発\)[\s\S]*?<\/c>/);
    expect(summary).toMatch(/<c r="D2"[^>]*>[\s\S]*?顧客管理\(本番\)[\s\S]*?<\/c>/);
    expect(list).toMatch(/<c r="D2"[^>]*>[\s\S]*?顧客名[\s\S]*?<\/c>/);
    expect(list).toMatch(/<c r="F2"[^>]*>[\s\S]*?担当者[\s\S]*?<\/c>/);
    expect(list).toMatch(/<c r="G2"[^>]*>[\s\S]*?レビュー[\s\S]*?<\/c>/);
    const detail = await readWorksheetByName(blob, '設定値詳細');
    expect(detail).toMatch(/<c r="D2"[^>]*>[\s\S]*?顧客名[\s\S]*?<\/c>/);
    expect(detail).toMatch(/<c r="F2"[^>]*>[\s\S]*?&quot;担当者&quot;[\s\S]*?<\/c>/);
    expect(detail).toMatch(/<c r="G2"[^>]*>[\s\S]*?&quot;レビュー&quot;[\s\S]*?<\/c>/);
    for (const removedUi of ['顧客レビュー状況', '顧客レビューの進捗', 'レビュー入力', '入力欄：I/J']) {
      expect(allText).not.toContain(removedUi);
    }
    expect(summary).not.toContain('<hyperlink ref="F4"');
    expect(allText).not.toContain('<dataValidation');
    expect(list).not.toMatch(/<c r="[I-Z]\d+"/);
  });

  it('separates customer setting targets from changed items and shows active exclusions in the summary', async () => {
    const fields = {
      BM会社情報: {
        code: 'BM会社情報',
        label: 'BM会社情報',
        type: 'REFERENCE_TABLE',
        referenceTable: { relatedApp: { app: '101' } }
      }
    };
    const sourceBundle = {
      sections: {
        fieldSettings: { properties: fields },
        layoutSettings: { layout: [{ type: 'ROW', fields: [{ type: 'LABEL', label: '<div>契約情報<br>注意事項</div>' }] }] }
      }
    };
    const targetBundle = {
      sections: {
        fieldSettings: { properties: fields },
        layoutSettings: { layout: [{ type: 'ROW', fields: [{ type: 'LABEL', label: '&lt;div&gt;契約情報&lt;br&gt;確認事項&lt;/div&gt;' }] }] }
      }
    };
    const blob = buildDiffXlsxBlobWithSafeDefault({
      sourceBundle,
      targetBundle,
      rows: [
        {
          sectionKey: 'fieldSettings',
          type: 'changed',
          path: 'fieldSettings.properties.BM会社情報.referenceTable.relatedApp.app',
          left: '101',
          right: '202'
        },
        {
          sectionKey: 'layoutSettings',
          type: 'changed',
          path: 'layoutSettings.layout[0].fields[0].label',
          left: '<div>契約情報<br>注意事項</div>',
          right: '&lt;div&gt;契約情報&lt;br&gt;確認事項&lt;/div&gt;'
        },
        {
          sectionKey: 'viewSettings',
          type: 'changed',
          path: 'viewSettings.views.保有物件一覧.sort',
          left: '更新日時 desc',
          right: '物件名 asc'
        }
      ]
    });
    const summaryBlob = buildDiffXlsxBlobWithSafeDefault({
      normalizationPresetState: { appReferences: true, viewOrder: false },
      ignoreKeys: 'revision, version revision',
      rows: [{
        sectionKey: 'appSettings',
        type: 'changed',
        path: 'appSettings.name',
        left: '変更前',
        right: '変更後'
      }]
    });
    const summary = await readWorksheetByName(summaryBlob, '比較概要');
    const list = await readWorksheetByName(blob, '変更一覧');
    const detail = await readWorksheetByName(blob, '設定値詳細');

    expect(summary).toMatch(/<c r="E8"[^>]*>[\s\S]*?比較から除外[\s\S]*?<\/c>/);
    expect(summary).toMatch(/<c r="F8"[^>]*>[\s\S]*?環境固有ID（アプリ・一覧・グラフ・アクション）[\s\S]*?個別指定 2件[\s\S]*?<\/c>/);
    expect(Number(/<row r="8" ht="([\d.]+)"/.exec(summary)?.[1] || 0)).toBeGreaterThan(26);
    expect(list).toMatch(/<c r="D2"[^>]*>[\s\S]*?フィールド「BM会社情報」[\s\S]*?<\/c>/);
    expect(list).toMatch(/<c r="E2"[^>]*>[\s\S]*?関連レコード一覧：参照するアプリ（アプリID）[\s\S]*?<\/c>/);
    expect(list).toMatch(/<c r="D3"[^>]*>[\s\S]*?ラベル「契約情報 確認事項」（1行目・1項目目）[\s\S]*?<\/c>/);
    expect(list).toMatch(/<c r="E3"[^>]*>[\s\S]*?表示文字[\s\S]*?<\/c>/);
    expect(list).toMatch(/<c r="D4"[^>]*>[\s\S]*?一覧「保有物件一覧」[\s\S]*?<\/c>/);
    expect(list).toMatch(/<c r="E4"[^>]*>[\s\S]*?ソート[\s\S]*?<\/c>/);
    expect(detail).toMatch(/<c r="D2"[^>]*>[\s\S]*?フィールド「BM会社情報」[\s\S]*?<\/c>/);
    expect(detail).toMatch(/<c r="E2"[^>]*>[\s\S]*?関連レコード一覧：参照するアプリ（アプリID）[\s\S]*?<\/c>/);
    expect(list).not.toContain('BM会社情報 / 関連レコード一覧設定 / 参照するアプリ / 参照するアプリID');
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

  it('separates field identity, property, presence, and table hierarchy in a dedicated customer sheet', async () => {
    const sourceFields = {
      amount: { code: 'amount', label: '金額', type: 'NUMBER' },
      lines: {
        code: 'lines', label: '請求 > 明細', type: 'SUBTABLE',
        fields: { item: { code: 'item', label: '商品 > SKU', type: 'SINGLE_LINE_TEXT', required: false } }
      }
    };
    const targetFields = {
      ...sourceFields,
      status: { code: 'status', label: '進捗', type: 'DROP_DOWN' },
      amount: { ...sourceFields.amount, unit: '円' },
      lines: {
        ...sourceFields.lines,
        fields: { item: { ...sourceFields.lines.fields.item, required: true } }
      },
      new_lines: {
        code: 'new_lines', label: '新しい明細', type: 'SUBTABLE',
        fields: { memo: { code: 'memo', label: '備考', type: 'SINGLE_LINE_TEXT' } }
      }
    };
    const addedTable = targetFields.new_lines;
    const blob = buildDiffXlsxBlobWithSafeDefault({
      sourceBundle: { sections: { fieldSettings: { properties: sourceFields } } },
      targetBundle: { sections: { fieldSettings: { properties: targetFields } } },
      rows: [
        { sectionKey: 'fieldSettings', type: 'added', path: 'fieldSettings.properties.status', right: targetFields.status },
        { sectionKey: 'fieldSettings', type: 'added', path: 'fieldSettings.properties.amount.unit', right: '円' },
        { sectionKey: 'fieldSettings', type: 'changed', path: 'fieldSettings.properties.lines.fields.item.required', left: false, right: true },
        { sectionKey: 'fieldSettings', type: 'added', path: 'fieldSettings.properties.new_lines', right: addedTable }
      ]
    });
    const workbook = await readEntry(blob, 'xl/workbook.xml');
    const list = await readWorksheetByName(blob, '変更一覧');
    const fields = await readWorksheetByName(blob, '03_フォームフィールド');
    const styles = await readEntry(blob, 'xl/styles.xml');

    expect([...workbook.matchAll(/<sheet\b[^>]*\bname="([^"]+)"/g)].map((match) => match[1])).toEqual([
      '比較概要', '変更一覧', '03_フォームフィールド', '設定値詳細', '長文原文'
    ]);
    expect(worksheetInlineTexts(fields, 'C', 3)).toEqual([
      'フィールド', 'フィールド',
      'テーブル「請求 > 明細」（コード: lines）\n└ テーブル内フィールド',
      'テーブル',
      'テーブル「新しい明細」（コード: new_lines）\n└ テーブル内フィールド'
    ]);
    expect(worksheetInlineTexts(fields, 'D', 3)).toEqual([
      '進捗', '金額', '商品 > SKU', '新しい明細', '備考'
    ]);
    expect(worksheetInlineTexts(fields, 'E', 3)).toEqual([
      'status', 'amount', 'item', 'new_lines', 'memo'
    ]);
    expect(worksheetInlineTexts(fields, 'G', 3)).toEqual([
      'フィールド自体', '単位記号', '必須項目にする', 'テーブル自体', 'フィールド自体'
    ]);
    expect(worksheetInlineTexts(fields, 'H', 3)).toEqual([
      '比較先のみ', '両方', '両方', '比較先のみ', '比較先のみ'
    ]);
    expect(worksheetInlineTexts(fields, 'I', 3)).toEqual(['—', '比較先のみ', '両方', '—', '—']);
    expect(worksheetInlineTexts(fields, 'J', 3)).toEqual([
      '存在しません', '存在しません', '任意', '存在しません', '存在しません'
    ]);
    expect(worksheetInlineTexts(fields, 'K', 3)).toEqual(['存在', '円', '必須', '存在', '存在']);
    expect(fields).toMatch(/<row r="5"[^>]*outlineLevel="1"/);
    expect(fields).toMatch(/<row r="7"[^>]*outlineLevel="1"/);
    expect(fields).toContain('<pane xSplit="5" ySplit="2" topLeftCell="F3" activePane="bottomRight" state="frozen"/>');
    expect(fields).toContain('<autoFilter ref="A2:K7"/>');
    expect(fields).toMatch(/<c r="J3" s="39"/);
    expect(list).toMatch(/<c r="D2"[^>]*>[\s\S]*?フィールド「進捗」[\s\S]*?<\/c>/);
    expect(list).toMatch(/<c r="E2"[^>]*>[\s\S]*?フィールド自体[\s\S]*?<\/c>/);
    expect(list).toMatch(/<c r="F2"[^>]*>[\s\S]*?存在しません[\s\S]*?<\/c>/);
    expect(list).toMatch(/<c r="G2"[^>]*>[\s\S]*?存在[\s\S]*?<\/c>/);
    expect(list).toMatch(/<c r="D5"[^>]*>[\s\S]*?テーブル「新しい明細」[\s\S]*?<\/c>/);
    expect(list).toMatch(/<c r="E5"[^>]*>[\s\S]*?テーブル自体[\s\S]*?<\/c>/);

    for (let row = 3; row <= 7; row += 1) {
      for (const column of 'ABCDEFGHIJK') expect(fields).toContain(`<c r="${column}${row}"`);
    }
    const cellXfsBlock = /<cellXfs\b[^>]*>([\s\S]*?)<\/cellXfs>/.exec(styles)?.[1] || '';
    const cellXfs = [...cellXfsBlock.matchAll(/<xf\b[^>]*>/g)].map((match) => match[0]);
    expect(cellXfs[39]).toContain('borderId="1"');
    expect(cellXfs[39]).toContain('applyBorder="1"');
    const bordersBlock = /<borders\b[^>]*>([\s\S]*?)<\/borders>/.exec(styles)?.[1] || '';
    const borders = [...bordersBlock.matchAll(/<border>([\s\S]*?)<\/border>/g)].map((match) => match[1]);
    for (const edge of ['left', 'right', 'top', 'bottom']) {
      expect(borders[1]).toMatch(new RegExp(`<${edge} style="thin"`));
    }
  });

  it('keeps technical paths and long target identities out of the customer list while preserving them in details', async () => {
    const longLabel = `長い顧客向けラベル${'・契約確認事項'.repeat(16)}`;
    const blob = buildDiffXlsxBlobWithSafeDefault({
      sourceBundle: {
        sections: {
          layoutSettings: { layout: [{ type: 'ROW', fields: [{ type: 'LABEL', label: `<div>${longLabel}（旧）</div>` }] }] }
        }
      },
      targetBundle: {
        sections: {
          layoutSettings: { layout: [{ type: 'ROW', fields: [{ type: 'LABEL', label: `<div>${longLabel}（新）</div>` }] }] }
        }
      },
      rows: [
        {
          sectionKey: 'futureUnknownSettings', type: 'changed',
          path: 'futureUnknownSettings.apiToken', left: 'old', right: 'new'
        },
        {
          sectionKey: 'layoutSettings', type: 'changed',
          path: 'layoutSettings.layout[0].fields[0].label', left: `${longLabel}（旧）`, right: `${longLabel}（新）`
        },
        {
          sectionKey: 'pluginSettings', type: 'changed', arrayKey: 'id', arrayKeyValue: 'plugin-id',
          path: 'pluginSettings.plugins[0].config', left: { mode: 'old' }, right: { mode: 'new' }
        },
        {
          sectionKey: 'customizeSettings', type: 'changed',
          path: 'customizeSettings.desktop.js[0].file._body', left: 'old();', right: 'new();'
        },
        {
          sectionKey: 'notifications', type: 'changed',
          path: 'notifications.notifications[0].body', left: '旧通知本文', right: '新通知本文'
        },
        {
          sectionKey: 'actionSettings', type: 'changed', arrayKey: 'name', arrayKeyValue: '顧客へ転記',
          path: 'actionSettings.actions[0].targetAppId', left: '101', right: '202'
        },
        {
          sectionKey: 'viewSettings', type: 'changed',
          path: 'viewSettings.views.保有物件一覧.paginationStyle', left: 'PAGER', right: 'SCROLL'
        }
      ]
    });
    const list = await readWorksheetByName(blob, '変更一覧');
    const detail = await readWorksheetByName(blob, '設定値詳細');

    expect(list).toContain('未識別の設定項目');
    expect(list).not.toContain('futureUnknownSettings.apiToken');
    expect(detail).toContain('内部パス: futureUnknownSettings.apiToken');
    expect(list).toContain('プラグイン「plugin-id」');
    expect(list).toContain('プラグイン設定内容');
    expect(list).toContain('デスクトップ JavaScript');
    expect(list).toContain('ファイル内容');
    expect(list).toContain('本文');
    expect(list).toContain('アプリアクション「顧客へ転記」');
    expect(list).toContain('レコードを追加するアプリ（アプリID）');
    expect(list).toContain('一覧「保有物件一覧」');
    expect(list).toContain('ページ送りの形式');
    expect(list).toContain('…');
    expect(list).not.toContain(`ラベル「${longLabel}（新）」`);
    expect(detail).toContain(`ラベル「${longLabel}（新）」`);
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

  it('distinguishes absence, undefined, null, empty text, scalar, array, and object raw values without type columns', async () => {
    const blob = buildDiffXlsxBlobWithSafeDefault({
      rows: [
        { sectionKey: 'appSettings', type: 'added', path: 'appSettings.a', right: '（存在しません）' },
        { sectionKey: 'appSettings', type: 'changed', path: 'appSettings.b', left: undefined, right: null },
        { sectionKey: 'appSettings', type: 'changed', path: 'appSettings.c', left: '', right: 'null' },
        { sectionKey: 'appSettings', type: 'changed', path: 'appSettings.d', left: 0, right: false },
        { sectionKey: 'appSettings', type: 'changed', path: 'appSettings.e', left: ['x', 1], right: { x: 1 } }
      ]
    });
    const workbook = await readEntry(blob, 'xl/workbook.xml');
    const list = await readWorksheetByName(blob, '変更一覧');
    const detail = await readWorksheetByName(blob, '設定値詳細');

    expect(workbook).not.toContain('name="長文原文"');
    for (const raw of [
      '存在しません', 'undefined', 'null', '空文字', '&quot;null&quot;',
      '&quot;（存在しません）&quot;', '>0<', '>false<', '[', '{'
    ]) {
      expect(detail).toContain(raw);
    }
    for (const removedState of ['未定義（undefined）', '文字列（空文字）', '文字列（4文字）', '数値', '真偽値', '配列（2件）', 'オブジェクト（1項目）']) {
      expect(detail).not.toContain(removedState);
    }
    for (let row = 2; row <= 6; row += 1) {
      for (const column of 'ABCDEFGH') expect(detail).toContain(`<c r="${column}${row}"`);
    }
    expect((list.match(/<hyperlink ref="A\d+"/g) || []).length).toBe(5);
    expect((detail.match(/<hyperlink ref="H\d+"/g) || []).length).toBe(5);
    expect((detail.match(/<row r="/g) || []).length).toBe(6);
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

  it('preserves complete object values without subtable summaries or HTML stripping', async () => {
    const blob = buildDiffXlsxBlobWithSafeDefault({
      rows: [
        {
          sectionKey: 'fieldSettings',
          type: 'changed',
          path: 'fieldSettings.properties.items',
          left: {
            type: 'SUBTABLE', code: 'items', label: '<b>明細</b>', required: true,
            defaultValue: [{ note: 'KEEP_LEFT' }],
            fields: {
              note: { type: 'SINGLE_LINE_TEXT', code: 'note', label: '<i>備考</i>', required: true, defaultValue: 'KEEP_ME' }
            }
          },
          right: {
            type: 'SUBTABLE', code: 'items', label: '<b>明細（新）</b>', required: false,
            defaultValue: [{ note: 'KEEP_RIGHT' }],
            fields: {
              note: { type: 'SINGLE_LINE_TEXT', code: 'note', label: '<i>備考（新）</i>', required: false, defaultValue: 'KEEP_ME_TOO' }
            }
          }
        },
        {
          sectionKey: 'layoutSettings',
          type: 'changed',
          path: 'layoutSettings.layout[0]',
          left: { type: 'LABEL', label: '<strong>HTML_LABEL_LEFT</strong>', value: 'RAW_LEFT' },
          right: { type: 'LABEL', label: '<strong>HTML_LABEL_RIGHT</strong>', value: 'RAW_RIGHT' }
        }
      ]
    });
    const list = await readWorksheetByName(blob, '変更一覧');
    const detail = await readWorksheetByName(blob, '設定値詳細');
    const allText = await readAllEntryText(blob);

    for (const value of [
      'required', 'defaultValue', 'KEEP_LEFT', 'KEEP_RIGHT', 'KEEP_ME', 'KEEP_ME_TOO',
      'RAW_LEFT', 'RAW_RIGHT', '&lt;b&gt;明細&lt;/b&gt;', '&lt;strong&gt;HTML_LABEL_LEFT&lt;/strong&gt;'
    ]) expect(allText).toContain(value);
    expect(list).not.toContain('No.（リンク）から全差分の状態・型・原文を確認できます');
    expect(list).toContain('<hyperlink ref="A2" location="&apos;設定値詳細&apos;!A2"');
    expect(detail).toContain('<hyperlink ref="H2" location="&apos;変更一覧&apos;!A2"');
    expect(list).not.toContain('テーブル内のフィールド:');
    expect(list).not.toContain('詳細は安全のため非表示');
  });

  it('keeps oversized raw values complete in visible, reconnectable long-text chunks', async () => {
    const oversized = `SOURCE_HEAD_${'X'.repeat(20000)}😀SOURCE_MIDDLE_${'Y'.repeat(20000)}SOURCE_TAIL`;
    const targetOversized = `TARGET_HEAD_${'Z'.repeat(40000)}TARGET_TAIL`;
    const blob = buildDiffXlsxBlobWithSafeDefault({
      rows: [{
        sectionKey: 'customizeSettings',
        type: 'changed',
        path: 'customizeSettings.desktop.js[0].file._body',
        left: oversized,
        right: targetOversized
      }]
    });
    const workbook = await readEntry(blob, 'xl/workbook.xml');
    const summary = await readWorksheetByName(blob, '比較概要');
    const list = await readWorksheetByName(blob, '変更一覧');
    const detail = await readWorksheetByName(blob, '設定値詳細');
    const longRaw = await readWorksheetByName(blob, '長文原文');
    const allText = await readAllEntryText(blob);

    expect([...workbook.matchAll(/<sheet\b[^>]*\bname="([^"]+)"/g)].map((match) => match[1])).toEqual([
      '比較概要', '変更一覧', '12_カスタマイズ本文', '設定値詳細', '長文原文'
    ]);
    expect(summary).not.toContain('掲載内容');
    expect(list).not.toContain('No.（リンク）から全差分の状態・型・原文を確認できます');
    expect(list).toContain('…');
    expect(list).not.toContain('SOURCE_MIDDLE_');
    expect(Number(/<row r="2"[^>]*ht="([\d.]+)"/.exec(list)?.[1] || 0)).toBeLessThanOrEqual(79);
    expect(detail).toContain('長文原文へ');
    expect(detail).toContain('<hyperlink ref="F2" location="&apos;長文原文&apos;!A2"');
    expect(detail).toMatch(/<hyperlink ref="G2" location="&apos;長文原文&apos;!A\d+"/);
    expect(longRaw).not.toContain('区切り文字を追加せず連結すると原文表記を完全に復元できます');
    expect(longRaw).not.toContain('すべての行・列は表示状態です');
    expect(longRaw).not.toContain('状態・型');
    expect(longRaw).toContain('<pane xSplit="3" ySplit="1" topLeftCell="D2" activePane="bottomRight" state="frozen"/>');
    expect(longRaw).not.toMatch(/<c r="H\d+"/);
    const chunks = worksheetInlineTexts(longRaw, 'F', 2);
    expect(chunks.length).toBeGreaterThan(2);
    expect(chunks.every((chunk) => chunk.length <= 30000)).toBe(true);
    expect(chunks.join('')).toBe(`${JSON.stringify(oversized)}${JSON.stringify(targetOversized)}`);
    for (const sentinel of ['SOURCE_HEAD_', 'SOURCE_MIDDLE_', 'SOURCE_TAIL', 'TARGET_HEAD_', 'TARGET_TAIL', '😀']) {
      expect(chunks.join('')).toContain(sentinel);
    }
    expect(allText).not.toContain('Excelセル上限32,767文字のため省略');
    expect(allText).not.toContain('<f>');
    expect(allText).not.toContain('externalLink');
    expect(allText).not.toContain('hidden="1"');
    for (const sheet of [list, detail, longRaw]) {
      const heights = [...sheet.matchAll(/<row\b[^>]*\bht="([0-9.]+)"/g)].map((match) => Number(match[1]));
      expect(Math.max(...heights)).toBeLessThanOrEqual(96);
    }
  });

  it('adds a customer issue sheet only when comparison coverage is incomplete', async () => {
    const rawError = 'HTTP 403 https://internal.example/error?app=778899';
    const rawMessage = 'RAW_FETCH_MESSAGE_778899';
    const rawFile = 'private-file-778899.js';
    const blob = buildDiffXlsxBlobWithSafeDefault({
      rows: [],
      fetchIssues: [{ sectionKey: 'pluginSettings', side: 'target', message: rawMessage, targetError: rawError }],
      partialIssues: [{
        sectionKey: 'customizeSettings', side: 'source', message: 'RAW_PARTIAL_MESSAGE',
        files: [{ fileName: rawFile, fileKey: 'FILE_KEY_778899', reason: 'RAW_FILE_REASON' }]
      }],
      truncation: {
        truncated: true,
        diffLimit: 778899,
        sections: [{ sectionKey: 'viewSettings', scanStatus: 'partial', omittedDiffCount: null }]
      }
    });
    const workbook = await readEntry(blob, 'xl/workbook.xml');
    const summary = await readWorksheetByName(blob, '比較概要');
    const issues = await readWorksheetByName(blob, '確認できなかった範囲');
    const longRaw = await readWorksheetByName(blob, '長文原文');
    const allText = await readAllEntryText(blob);
    const rawEvidence = worksheetInlineTexts(longRaw, 'F', 2).join('');

    expect([...workbook.matchAll(/<sheet\b[^>]*\bname="([^"]+)"/g)].map((match) => match[1])).toEqual([
      '比較概要', '確認できなかった範囲', '変更一覧', '長文原文'
    ]);
    expect(summary).toContain('比較未完了');
    expect(summary).toContain('一部未完了');
    expect(issues).toContain('取得できませんでした');
    expect(issues).toContain('この範囲は比較結果に含まれていません。再取得して確認してください。');
    expect(issues).toContain('取得できた範囲だけを比較しています。必要に応じて再取得してください。');
    expect(issues).toContain('確認できた件数は全体の一部です。条件を分けて再比較してください。');
    expect(issues).toContain('取得・打切り情報（原文）');
    expect(issues).not.toContain('マスキング');
    for (const value of [
      rawError, rawMessage, rawFile, 'FILE_KEY_778899',
      'RAW_PARTIAL_MESSAGE', 'RAW_FILE_REASON', '778899'
    ]) expect(rawEvidence).toContain(value);
    expect(allText).not.toContain('<f>');
    expect(allText).not.toContain('externalLink');
  });

  it('keeps oversized acquisition issue evidence complete in visible long-text chunks', async () => {
    const rawMessage = `ISSUE_HEAD_${'A'.repeat(20000)}😀ISSUE_MIDDLE_${'B'.repeat(21000)}ISSUE_TAIL`;
    const issue = {
      sectionKey: 'pluginSettings',
      side: 'target' as const,
      message: rawMessage,
      targetError: 'HTTP 503 ISSUE_ERROR_TAIL'
    };
    const blob = buildDiffXlsxBlobWithSafeDefault({
      rows: [],
      fetchIssues: [issue]
    });
    const workbook = await readEntry(blob, 'xl/workbook.xml');
    const summary = await readWorksheetByName(blob, '比較概要');
    const issues = await readWorksheetByName(blob, '確認できなかった範囲');
    const longRaw = await readWorksheetByName(blob, '長文原文');
    const allText = await readAllEntryText(blob);

    expect([...workbook.matchAll(/<sheet\b[^>]*\bname="([^"]+)"/g)].map((match) => match[1])).toEqual([
      '比較概要', '確認できなかった範囲', '変更一覧', '長文原文'
    ]);
    expect(summary).not.toContain('掲載内容');
    expect(issues).toContain('長文原文へ');
    expect(issues).toContain('<hyperlink ref="E3" location="&apos;長文原文&apos;!A2"');
    const chunks = worksheetInlineTexts(longRaw, 'F', 2);
    expect(chunks.length).toBeGreaterThan(2);
    expect(chunks.every((chunk) => chunk.length <= 30000)).toBe(true);
    expect(chunks.join('')).toBe(JSON.stringify(issue, null, 2));
    expect(longRaw).toContain('確認範囲 1');
    for (const sentinel of ['ISSUE_HEAD_', 'ISSUE_MIDDLE_', 'ISSUE_TAIL', 'ISSUE_ERROR_TAIL', '😀']) {
      expect(chunks.join('')).toContain(sentinel);
    }
    expect(longRaw).toContain('<hyperlink ref="G2" location="&apos;確認できなかった範囲&apos;!A3"');
    expect(allText).not.toContain('Excelセル上限32,767文字のため省略');
    expect(allText).not.toContain('<f>');
    expect(allText).not.toContain('externalLink');
    expect(allText).not.toContain('hidden="1"');
  });

  it('does not describe an empty filtered export as a complete no-difference result', async () => {
    const blob = buildDiffXlsxBlobWithSafeDefault({
      exportMode: 'filtered',
      scopes: ['appSettings'],
      rows: []
    });
    const summary = await readWorksheetByName(blob, '比較概要');
    expect(summary).toContain('絞り込み後：掲載対象なし');
    expect(summary).toContain('掲載変更件数');
    expect(summary).not.toContain('変更なし');
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
      '比較概要', '変更一覧'
    ]);
    expect(summary).toContain('正常完了（同一証跡 5件を省略）');
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

    expect(summary).toContain('変更あり');
    expect(summary).toContain('1件');
    expect(list).toContain('ステータス名');
    expect(list).toContain('未処理');
    expect(list).toContain('受付');
    expect(list).not.toContain('確認専用で、自動反映の対象外です');
    expect(list).not.toContain('processSettings.states.__rename__');
  });

  it('fails closed when diff truncation evidence exists without a true top-level flag', async () => {
    const blob = buildDiffXlsxBlobWithSafeDefault({
      scopes: ['viewSettings'],
      rows: [],
      truncation: {
        truncated: false,
        droppedDiff: 3,
        sections: [{ sectionKey: 'viewSettings', scanStatus: 'partial', omittedDiffCount: null }]
      }
    });
    const workbook = await readEntry(blob, 'xl/workbook.xml');
    const summary = await readWorksheetByName(blob, '比較概要');
    expect([...workbook.matchAll(/<sheet\b[^>]*\bname="([^"]+)"/g)].map((match) => match[1])).toEqual([
      '比較概要', '確認できなかった範囲', '変更一覧', '長文原文'
    ]);
    expect(summary).toContain('比較未完了');
    expect(summary).toContain('一部未完了');
    expect(summary).not.toContain('変更なし');
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
    expect(summary).toContain('変更一覧の明細');
    expect(summary).toMatch(/<c r="D6"[^>]*>[\s\S]*?8件[\s\S]*?<\/c>/);
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
    expect(result.filename).toContain('変更前環境 App 556677_vs_変更後環境 App 667788');
  });

  it('keeps readable item labels while showing the original layout, condition, and sort values', async () => {
    const sourceFields = {
      customer_name: { code: 'customer_name', label: '顧客名', type: 'SINGLE_LINE_TEXT' },
      amount: { code: 'amount', label: '見積金額', type: 'NUMBER' },
      notes: { code: 'notes', label: '備考', type: 'MULTI_LINE_TEXT' }
    };
    const targetFields = {
      customer_name: { code: 'customer_name', label: '取引先名', type: 'SINGLE_LINE_TEXT' },
      priority: {
        code: 'priority',
        label: '優先度',
        type: 'DROP_DOWN',
        options: { 高: { label: '高', index: '0' }, 通常: { label: '通常', index: '1' } }
      },
      notes: { code: 'notes', label: '備考', type: 'MULTI_LINE_TEXT' }
    };
    const sourceBundle = {
      meta: { appName: '変更前' },
      sections: {
        fieldSettings: { properties: sourceFields },
        layoutSettings: { layout: [{ type: 'ROW', fields: [{ code: 'customer_name' }] }] }
      }
    };
    const targetBundle = {
      meta: { appName: '変更後' },
      sections: {
        fieldSettings: { properties: targetFields },
        layoutSettings: { layout: [{ type: 'ROW', fields: [{ code: 'customer_name' }] }] }
      }
    };
    const blob = buildDiffXlsxBlobWithSafeDefault({
      sourceBundle,
      targetBundle,
      rows: [
        { sectionKey: 'layoutSettings', type: 'changed', path: 'layoutSettings.layout[0].fields[0].size.width', left: '300', right: '360' },
        { sectionKey: 'viewSettings', type: 'removed', path: 'viewSettings.views.案件一覧.fields[0]', left: 'amount' },
        { sectionKey: 'viewSettings', type: 'added', path: 'viewSettings.views.案件一覧.fields[0]', right: 'priority' },
        { sectionKey: 'viewSettings', type: 'changed', path: 'viewSettings.views.案件一覧.filterCond', left: 'amount > 0', right: 'priority in ("高")' },
        { sectionKey: 'viewSettings', type: 'changed', path: 'viewSettings.views.案件一覧.sort', left: 'amount desc', right: 'customer_name asc' },
        { sectionKey: 'processSettings', type: 'changed', path: 'processSettings.actions[0].filterCond', left: '', right: 'priority in ("高", "通常")' }
      ]
    });
    const workbook = await readEntry(blob, 'xl/workbook.xml');
    const list = await readWorksheetByName(blob, '変更一覧');
    const detail = await readWorksheetByName(blob, '設定値詳細');
    const allText = await readAllEntryText(blob);

    expect(workbook).toContain('name="設定値詳細"');
    for (const expected of [
      '300px', '360px', '見積金額（amount）', '優先度（priority）',
      '（降順）', '（昇順）'
    ]) expect(list).toContain(expected);
    expect(list).toMatch(/<c r="F2" s="37"/);
    expect(list).toMatch(/<c r="G2" s="38"/);
    expect(list).toContain('<hyperlink ref="A2" location="&apos;設定値詳細&apos;!A2"');
    expect(detail).toContain('<hyperlink ref="H2" location="&apos;変更一覧&apos;!A2"');
    expect(list).toContain('一覧「案件一覧」');
    expect(list).toContain('表示するフィールド（1件目）');
    for (const expected of [
      'フィールド「取引先名」（コード: customer_name）', 'customer_name', 'amount', 'priority',
      'amount &gt; 0', 'priority in', 'amount desc', 'customer_name asc'
    ]) expect(allText).toContain(expected);
    expect(allText).not.toContain('詳細は安全のため非表示');
    expect(allText).not.toContain('詳細非表示');
  });

  it('replaces field codes only outside quoted filter values without cascading through inserted labels', async () => {
    const fields = {
      status: { code: 'status', label: '公開状態 open', type: 'DROP_DOWN' },
      open: { code: 'open', label: '公開フラグ', type: 'SINGLE_LINE_TEXT' }
    };
    const blob = buildDiffXlsxBlobWithSafeDefault({
      sourceBundle: { sections: { fieldSettings: { properties: fields } } },
      targetBundle: { sections: { fieldSettings: { properties: fields } } },
      rows: [{
        sectionKey: 'viewSettings',
        type: 'changed',
        path: 'viewSettings.views.公開一覧.filterCond',
        left: 'status = "closed"',
        right: 'status in ("open") and open != "open"'
      }]
    });
    const list = await readWorksheetByName(blob, '変更一覧');
    const detail = await readWorksheetByName(blob, '設定値詳細');

    expect(list).toContain('公開状態 open（status） in (&quot;open&quot;) and 公開フラグ（open） != &quot;open&quot;');
    expect(list).not.toContain('&quot;公開フラグ（open）&quot;');
    expect(list).not.toContain('公開状態 公開フラグ（open）');
    expect(detail).toContain('status in (\\&quot;open\\&quot;) and open != \\&quot;open\\&quot;');
  });

  it('shows zero-based kintone index values as one-based positions only in human-facing sheets', async () => {
    const blob = buildDiffXlsxBlobWithSafeDefault({
      rows: [
        { sectionKey: 'fieldSettings', type: 'changed', path: 'fieldSettings.properties.priority.options.high.index', left: '0', right: '2' },
        { sectionKey: 'viewSettings', type: 'changed', path: 'viewSettings.views.案件一覧.index', left: '0', right: '2' },
        { sectionKey: 'reportSettings', type: 'changed', path: 'reportSettings.reports.月次集計.index', left: 0, right: 2 },
        { sectionKey: 'processSettings', type: 'changed', path: 'processSettings.states.受付.index', left: '0', right: '2' },
        { sectionKey: 'actionSettings', type: 'changed', path: 'actionSettings.actions.転記.index', left: 0, right: 2 },
        { sectionKey: 'categories', type: 'changed', path: 'categories.categories.重要.index', left: '0', right: '2' },
        { sectionKey: 'futureUnknownSettings', type: 'changed', path: 'futureUnknownSettings.items[0].index', left: '0', right: '2' },
        { sectionKey: 'appSettings', type: 'changed', path: 'appSettings.no', left: 0, right: 2 },
        { sectionKey: 'appSettings', type: 'changed', path: 'appSettings.size', left: 0, right: 2 }
      ]
    });
    const list = await readWorksheetByName(blob, '変更一覧');
    const detail = await readWorksheetByName(blob, '設定値詳細');
    const before = worksheetInlineTexts(list, 'F', 2);
    const after = worksheetInlineTexts(list, 'G', 2);

    expect(before.filter((value) => value === '1番目')).toHaveLength(6);
    expect(after.filter((value) => value === '3番目')).toHaveLength(6);
    expect(before.filter((value) => value === '0')).toHaveLength(3);
    expect(after.filter((value) => value === '2')).toHaveLength(3);
    expect(detail).toContain('futureUnknownSettings.items[0].index');
    expect(detail).toContain('選択肢「high」：並び順');
    expect(detail).toContain('&quot;0&quot;');
    expect(detail).not.toContain('3番目');
  });

  it('localizes kintone query functions outside quoted literals and keeps the raw evidence', async () => {
    const fields = {
      memo: { code: 'memo', label: 'メモ', type: 'SINGLE_LINE_TEXT' },
      assignee: { code: 'assignee', label: '作業者', type: 'USER_SELECT' },
      organization: { code: 'organization', label: '組織', type: 'ORGANIZATION_SELECT' },
      created: { code: 'created', label: '作成日', type: 'DATE' },
      members: { code: 'members', label: '担当者', type: 'USER_SELECT' }
    };
    const bundle = { sections: { fieldSettings: { properties: fields } } };
    const blob = buildDiffXlsxBlobWithSafeDefault({
      sourceBundle: bundle,
      targetBundle: bundle,
      rows: [
        {
          sectionKey: 'viewSettings', type: 'changed', path: 'viewSettings.views.担当一覧.filterCond',
          left: 'memo = "LOGINUSER()"',
          right: 'assignee in (LOGINUSER())'
        },
        {
          sectionKey: 'viewSettings', type: 'changed', path: 'viewSettings.views.組織一覧.filterCond',
          left: 'organization in (PRIMARY_ORGANIZATION())',
          right: 'created = TODAY()'
        },
        {
          sectionKey: 'fieldSettings', type: 'changed', path: 'fieldSettings.properties.members.defaultValue',
          left: [{ type: 'FUNCTION', code: 'LOGINUSER()' }],
          right: [{ type: 'FUNCTION', code: 'PRIMARY_ORGANIZATION()' }]
        }
      ]
    });
    const list = await readWorksheetByName(blob, '変更一覧');
    const detail = await readWorksheetByName(blob, '設定値詳細');

    expect(list).toContain('作業者（assignee） in (ログインユーザー)');
    expect(list).toContain('組織（organization） in (優先する組織)');
    expect(list).toContain('作成日（created） = 今日');
    expect(list).toContain('メモ（memo） = &quot;LOGINUSER()&quot;');
    expect(worksheetInlineTexts(list, 'F', 2)).toContain('ログインユーザー');
    expect(worksheetInlineTexts(list, 'G', 2)).toContain('優先する組織');
    expect(detail).toContain('LOGINUSER()');
    expect(detail).toContain('PRIMARY_ORGANIZATION()');
  });

  it('localizes path-specific kintone enums without rewriting ordinary strings', async () => {
    const blob = buildDiffXlsxBlobWithSafeDefault({
      rows: [
        { sectionKey: 'fieldSettings', type: 'changed', path: 'fieldSettings.properties.choice.align', left: 'HORIZONTAL', right: 'VERTICAL' },
        { sectionKey: 'fieldSettings', type: 'changed', path: 'fieldSettings.properties.amount.unitPosition', left: 'BEFORE', right: 'AFTER' },
        { sectionKey: 'fieldSettings', type: 'changed', path: 'fieldSettings.properties.link.protocol', left: 'WEB', right: 'MAIL' },
        { sectionKey: 'fieldSettings', type: 'changed', path: 'fieldSettings.properties.amount.format', left: 'NUMBER_DIGIT', right: 'PERCENT' },
        { sectionKey: 'fieldAcl', type: 'changed', path: 'fieldAcl.rights[0].entities[0].accessibility', left: 'WRITE', right: 'READ' },
        { sectionKey: 'processSettings', type: 'changed', path: 'processSettings.states.受付.assignee.type', left: 'ONE', right: 'ALL' },
        { sectionKey: 'customizeSettings', type: 'changed', path: 'customizeSettings.scope', left: 'ALL', right: 'ADMIN' },
        { sectionKey: 'customizeSettings', type: 'changed', path: 'customizeSettings.desktop.js[0].type', left: 'URL', right: 'FILE' },
        { sectionKey: 'actionSettings', type: 'changed', path: 'actionSettings.actions.転記.mappings[0].srcType', left: 'RECORD_URL', right: 'FIELD' },
        { sectionKey: 'reportSettings', type: 'changed', path: 'reportSettings.reports.月次.chartType', left: 'BAR', right: 'PIE' },
        { sectionKey: 'reportSettings', type: 'changed', path: 'reportSettings.reports.月次.chartMode', left: 'NORMAL', right: 'STACKED' },
        { sectionKey: 'reportSettings', type: 'changed', path: 'reportSettings.reports.月次.aggregations[0].type', left: 'COUNT', right: 'SUM' },
        { sectionKey: 'reportSettings', type: 'changed', path: 'reportSettings.reports.月次.groups[0].per', left: 'MONTH', right: 'YEAR' },
        { sectionKey: 'viewSettings', type: 'changed', path: 'viewSettings.views.担当一覧.builtinType', left: 'ASSIGNEE', right: 'UNDONE' },
        { sectionKey: 'viewSettings', type: 'changed', path: 'viewSettings.views.担当一覧.device', left: 'ANY', right: 'DESKTOP' },
        { sectionKey: 'appSettings', type: 'changed', path: 'appSettings.theme', left: 'WHITE', right: 'CLIPBOARD' },
        { sectionKey: 'appSettings', type: 'changed', path: 'appSettings.icon.type', left: 'PRESET', right: 'FILE' },
        { sectionKey: 'appSettings', type: 'changed', path: 'appSettings.titleField.selectionMode', left: 'AUTO', right: 'MANUAL' },
        { sectionKey: 'appSettings', type: 'changed', path: 'appSettings.numberPrecision.roundingMode', left: 'HALF_EVEN', right: 'DOWN' },
        { sectionKey: 'appSettings', type: 'changed', path: 'appSettings.description', left: 'FILE', right: 'ALL' }
      ]
    });
    const list = await readWorksheetByName(blob, '変更一覧');
    const detail = await readWorksheetByName(blob, '設定値詳細');
    const before = worksheetInlineTexts(list, 'F', 2);
    const after = worksheetInlineTexts(list, 'G', 2);

    for (const expected of [
      '横並び', '前につける', 'Webサイトのアドレス', '数値（桁区切り）', '閲覧・編集可',
      '候補から作業者を1人選ぶ', '全ユーザー', 'URL指定', 'レコードのURL',
      '横棒グラフ', '通常', 'レコード数', '月', '作業者ビュー', 'PC・モバイル両方',
      'ホワイト', 'プリセット', '自動選択', '四捨五入（偶数丸め）', 'FILE'
    ]) expect(before).toContain(expected);
    for (const expected of [
      '縦並び', '後につける', 'メールアドレス', 'パーセント', '閲覧のみ',
      '候補の全員が作業する', '管理者のみ', 'ファイル指定', 'フィールド',
      '円グラフ', '積み上げ', '合計', '年', '未完了レコード', 'PC版のみ',
      'クリップボード', 'アップロードファイル', '手動指定', '切り捨て', 'ALL'
    ]) expect(after).toContain(expected);
    expect(before.filter((value) => value === 'FILE')).toHaveLength(1);
    expect(after.filter((value) => value === 'ALL')).toHaveLength(1);
    expect(detail).toContain('RECORD_URL');
    expect(detail).toContain('STACKED');
    expect(detail).toContain('HALF_EVEN');
  });

  it('shows permission target entity types in Japanese while retaining their identifying codes', async () => {
    const rows = enrichDiffRows([{
      sectionKey: 'fieldAcl',
      type: 'changed',
      path: 'fieldAcl.rights[0].entities[0].accessibility',
      left: 'WRITE',
      right: 'READ',
      arrayKey: 'entity',
      arrayKeyValue: { type: 'GROUP', code: 'sales' }
    }], {}, {});
    const blob = buildDiffXlsxBlobWithSafeDefault({ rows });
    const list = await readWorksheetByName(blob, '変更一覧');
    const detail = await readWorksheetByName(blob, '設定値詳細');

    expect(list).toContain('グループ「sales」');
    expect(list).not.toContain('sales (GROUP)');
    expect(worksheetInlineTexts(list, 'F', 2)).toEqual(['閲覧・編集可']);
    expect(worksheetInlineTexts(list, 'G', 2)).toEqual(['閲覧のみ']);
    expect(detail).toContain('WRITE');
    expect(detail).toContain('READ');
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

  it('shows identifiers, URLs, long values, and app names without masking them', async () => {
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
    expect(result.filename).toContain('Customer App 991122 Prod_vs_Portal Guest 7');
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

  it('adds grouped view and action sheets with domain labels while preserving ordinary strings', async () => {
    const fields = {
      amount: { code: 'amount', label: '金額', type: 'NUMBER' },
      total: { code: 'total', label: '合計', type: 'NUMBER' }
    };
    const actionSettings = { actions: { 顧客登録: { name: '顧客登録' } } };
    const blob = buildDiffXlsxBlobWithSafeDefault({
      sourceBundle: { sections: { fieldSettings: { properties: fields }, actionSettings } },
      targetBundle: { sections: { fieldSettings: { properties: fields }, actionSettings } },
      rows: [
        {
          sectionKey: 'viewSettings', type: 'changed',
          path: 'viewSettings.views.案件一覧.filterCond', left: 'amount > 0', right: 'total > 0'
        },
        {
          sectionKey: 'viewSettings', type: 'changed',
          path: 'viewSettings.views.案件一覧.sort', left: 'amount desc', right: 'total asc'
        },
        {
          sectionKey: 'actionSettings', type: 'changed',
          path: 'actionSettings.actions.顧客登録.mappings[0].srcField', left: 'amount', right: 'total'
        },
        {
          sectionKey: 'actionSettings', type: 'changed',
          path: 'actionSettings.actions.顧客登録.mappings[0].srcType', left: 'NUMBER_DIGIT', right: 'FIELD'
        },
        {
          sectionKey: 'actionSettings', type: 'changed',
          path: 'actionSettings.actions.顧客登録.enabled', left: 'true', right: 'false'
        },
        {
          sectionKey: 'appSettings', type: 'changed',
          path: 'appSettings.description', left: 'NUMBER', right: 'FIELD'
        },
        {
          sectionKey: 'appSettings', type: 'changed',
          path: 'appSettings.footer', left: 'true', right: 'null'
        }
      ]
    });
    const workbook = await readEntry(blob, 'xl/workbook.xml');
    const list = await readWorksheetByName(blob, '変更一覧');
    const views = await readWorksheetByName(blob, '06_一覧設定');
    const actions = await readWorksheetByName(blob, '13_アプリアクション');

    expect(workbook).toContain('name="06_一覧設定"');
    expect(workbook).toContain('name="13_アプリアクション"');
    expect(worksheetInlineTexts(views, 'C', 3)).toEqual(['案件一覧', '案件一覧']);
    expect(worksheetInlineTexts(views, 'D', 3)).toEqual(['絞り込み条件', 'ソート']);
    expect(actions).toContain('アプリアクション');
    expect(actions).toContain('顧客登録');
    expect(actions).toContain('コピー元フィールド');
    expect(actions).toContain('コピー元の種類');
    expect(actions).toContain('有効状態');
    expect(actions).toContain('数値（桁区切りあり）');
    expect(actions).toContain('フィールド');
    expect(actions).toContain('はい');
    expect(actions).toContain('いいえ');
    expect(actions).not.toContain('srcField');
    expect(actions).not.toContain('srcType');
    expect(actions).not.toContain('NUMBER_DIGIT');
    expect(worksheetInlineTexts(list, 'F', 2)).toContain('NUMBER');
    expect(worksheetInlineTexts(list, 'G', 2)).toContain('FIELD');
    expect(worksheetInlineTexts(list, 'F', 2)).toContain('true');
    expect(worksheetInlineTexts(list, 'G', 2)).toContain('null');
  });

  it('uses one fully bordered state row and no empty navigation or category table when there is no difference', async () => {
    const blob = buildDiffXlsxBlobWithSafeDefault({
      scopes: ['fieldSettings'],
      rows: []
    });
    const workbook = await readEntry(blob, 'xl/workbook.xml');
    const summary = await readWorksheetByName(blob, '比較概要');
    const list = await readWorksheetByName(blob, '変更一覧');

    expect(summary).toContain('変更なし');
    expect(summary).not.toContain('変更一覧を開く');
    expect(summary).not.toContain('分類別件数');
    expect(summary).not.toContain('<hyperlink');
    expect(summary).not.toContain('<autoFilter');
    expect(list).toContain('差分はありません');
    expect(list).not.toContain('<autoFilter');
    expect((list.match(/<row r="/g) || []).length).toBe(2);
    for (const column of 'ABCDEFG') expect(list).toContain(`<c r="${column}2"`);
    const zeroStyles = [...list.matchAll(/<c r="[A-G]2" s="(\d+)"/g)].map((match) => match[1]);
    expect(new Set(zeroStyles).size).toBe(1);
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
    expect(worksheetInlineTexts(list, 'F', 2)).toEqual(['存在', '存在しません']);
    expect(worksheetInlineTexts(list, 'G', 2)).toEqual(['存在しません', '存在']);
    expect(fields).toContain('比較元のみ');
    expect(fields).toContain('比較先のみ');
  });

  it('keeps the deprecated form.json restatement out of the change list and the headline counts', async () => {
    const blob = buildDiffXlsxBlobWithSafeDefault({
      scopes: ['fieldSettings', 'layoutSettings', 'formSettings'],
      rows: [
        { sectionKey: 'fieldSettings', type: 'changed', path: 'fieldSettings.properties.顧客.label', left: '顧客', right: '取引先' },
        { sectionKey: 'layoutSettings', type: 'changed', path: 'layoutSettings.layout[0].fields[0].size.width', left: 100, right: 200 },
        { sectionKey: 'formSettings', type: 'changed', path: 'formSettings.properties[3].label', left: '顧客', right: '取引先' },
        { sectionKey: 'formSettings', type: 'changed', path: 'formSettings.properties[4].label', left: '住所', right: '所在地' }
      ]
    });
    const summary = await readWorksheetByName(blob, '比較概要');
    const list = await readWorksheetByName(blob, '変更一覧');
    const formSheet = await readWorksheetByName(blob, '05_フォーム設計情報');
    const detail = await readWorksheetByName(blob, '設定値詳細');

    // 変更一覧と件数は再掲を含まない 2 件。
    expect(summary).toContain('変更あり');
    expect(worksheetInlineTexts(summary, 'B', 4)[0]).toBe('2件');
    expect(worksheetInlineTexts(list, 'C', 2)).toEqual(['フィールド設定', 'レイアウト設定']);
    expect(worksheetInlineTexts(list, 'A', 2)).toEqual([]);

    // 再掲であることと件数は概要で明示し、証跡は専用シートに残す。
    expect(summary).toContain('参考として別シートに掲載');
    expect(summary).toContain('2件（他シートと同じ変更のため件数に含めていません）');
    expect(summary).toContain('05 フォーム設計情報（参考・再掲）');
    expect(formSheet).toContain('参考・再掲');
    expect(formSheet).toContain('旧 /form.json の再掲');
    // 設定値詳細は全件（再掲は末尾の No.3・No.4）を保持する。
    expect(worksheetInlineTexts(detail, 'C', 2)).toEqual([
      'フィールド設定', 'レイアウト設定', 'フォーム設定', 'フォーム設定'
    ]);
    expect(worksheetInlineTexts(detail, 'H', 2)).toEqual([
      '変更一覧 No.1へ', '変更一覧 No.2へ', '05 フォーム設計情報へ', '05 フォーム設計情報へ'
    ]);
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

  it('reports the change count and the missing scopes separately when the fetch was incomplete', async () => {
    const blob = buildDiffXlsxBlobWithSafeDefault({
      scopes: ['fieldSettings', 'categories'],
      rows: [
        { sectionKey: 'fieldSettings', type: 'changed', path: 'fieldSettings.properties.顧客.label', left: '顧客', right: '取引先' }
      ],
      fetchIssues: [{ sectionKey: 'categories', side: 'source', message: '取得できませんでした' }]
    });
    const summary = await readWorksheetByName(blob, '比較概要');

    expect(summary).toContain('比較未完了（確認できた範囲に変更 1件）');
    expect(summary).toContain('一部未完了（カテゴリ設定）');
    expect(summary).not.toContain('変更なし');
  });

  it('creates customer API sheets for actual differences in canonical API order', async () => {
    const blob = buildDiffXlsxBlobWithSafeDefault({
      scopes: [
        'appSettings', 'appInfo', 'fieldSettings', 'layoutSettings', 'formSettings',
        'viewSettings', 'reportSettings', 'processSettings', 'pluginSettings',
        'customizeSettings', 'actionSettings', 'appAcl', 'fieldAcl',
        'recordPermissions', 'notifications', 'perRecordNotifications',
        'reminderNotifications', 'categories'
      ],
      rows: [
        { sectionKey: 'appSettings', type: 'changed', path: 'appSettings.name', left: '旧', right: '新' },
        { sectionKey: 'appInfo', type: 'changed', path: 'appInfo.name', left: '旧', right: '新' },
        { sectionKey: 'fieldSettings', type: 'changed', path: 'fieldSettings.properties.customer.label', left: '顧客', right: '取引先' },
        { sectionKey: 'layoutSettings', type: 'changed', path: 'layoutSettings.layout[0].fields[0].size.width', left: 100, right: 200 },
        { sectionKey: 'formSettings', type: 'changed', path: 'formSettings.properties.customer.label', left: '顧客', right: '取引先' },
        { sectionKey: 'viewSettings', type: 'changed', path: 'viewSettings.views.一覧.name', left: '旧一覧', right: '新一覧' },
        { sectionKey: 'reportSettings', type: 'changed', path: 'reportSettings.reports.集計.name', left: '旧集計', right: '新集計' },
        { sectionKey: 'processSettings', type: 'changed', path: 'processSettings.states.受付.name', left: '受付', right: '受領' },
        { sectionKey: 'pluginSettings', type: 'changed', path: 'pluginSettings.plugins[0].name', left: '旧プラグイン', right: '新プラグイン' },
        { sectionKey: 'pluginSettings', type: 'changed', path: 'pluginSettings.plugins[0].config.mode', left: 'old', right: 'new' },
        { sectionKey: 'customizeSettings', type: 'changed', path: 'customizeSettings.scope', left: 'ALL', right: 'ADMIN' },
        { sectionKey: 'customizeSettings', type: 'changed', path: 'customizeSettings.desktop.js[0].file._body', left: 'old();', right: 'new();' },
        { sectionKey: 'actionSettings', type: 'changed', path: 'actionSettings.actions.転記.name', left: '旧転記', right: '新転記' },
        { sectionKey: 'appAcl', type: 'changed', path: 'appAcl.rights[0].recordViewable', left: false, right: true },
        { sectionKey: 'fieldAcl', type: 'changed', path: 'fieldAcl.rights[0].accessibility', left: 'READ', right: 'WRITE' },
        { sectionKey: 'recordPermissions', type: 'changed', path: 'recordPermissions.rights[0].recordEditable', left: false, right: true },
        { sectionKey: 'notifications', type: 'changed', path: 'notifications.notifyToCommenter', left: false, right: true },
        { sectionKey: 'perRecordNotifications', type: 'changed', path: 'perRecordNotifications.notifications[0].filterCond', left: 'A', right: 'B' },
        { sectionKey: 'reminderNotifications', type: 'changed', path: 'reminderNotifications.notifications[0].timing.daysLater', left: 0, right: 1 },
        { sectionKey: 'categories', type: 'changed', path: 'categories.categories[0].name', left: '旧分類', right: '新分類' },
        { sectionKey: 'futureSettings', type: 'changed', path: 'futureSettings.option', left: 'old', right: 'new' }
      ]
    });
    const names = await readWorkbookSheetNames(blob);

    expect(names.filter((name) => /^\d{2}_/.test(name))).toEqual([
      '01_アプリ一般設定',
      '02_アプリ情報',
      '03_フォームフィールド',
      '04_フォームレイアウト',
      '05_フォーム設計情報',
      '06_一覧設定',
      '07_グラフ設定',
      '08_プロセス管理',
      '09_追加済みプラグイン',
      '10_プラグイン個別設定',
      '11_JavaScript・CSS',
      '12_カスタマイズ本文',
      '13_アプリアクション',
      '14_アプリ権限',
      '15_フィールド権限',
      '16_レコード権限',
      '17_アプリ条件通知',
      '18_レコード条件通知',
      '19_リマインダー通知',
      '20_カテゴリー設定',
      '99_その他の設定'
    ]);
    expect(names.indexOf('変更一覧')).toBeLessThan(names.indexOf('01_アプリ一般設定'));
    expect(names.indexOf('99_その他の設定')).toBeLessThan(names.indexOf('設定値詳細'));

    const settingsApi = await readWorksheetByName(blob, '01_アプリ一般設定');
    expect(worksheetRowContaining(settingsApi, '01 アプリ一般設定')).toMatch(/<row r="1"/);
    expect(worksheetRowContaining(settingsApi, 'No.')).toMatch(/<row r="2"/);
    expect(settingsApi).toMatch(/<row r="3"(?:\s|>)/);
    expect(settingsApi).toContain('<hyperlink ref="A3" location="&apos;設定値詳細&apos;!A2"');
  });

  it('routes supplemental API children separately while keeping added or removed parents on their parent API', async () => {
    const blob = buildDiffXlsxBlobWithSafeDefault({
      rows: [
        {
          sectionKey: 'pluginSettings', type: 'added', path: 'pluginSettings.plugins[0]',
          right: { id: 'parent-plugin', config: { mode: 'PARENT_PLUGIN_CONFIG' } }
        },
        {
          sectionKey: 'pluginSettings', type: 'changed', path: 'pluginSettings.plugins[1].config.mode',
          left: 'PLUGIN_CONFIG_OLD', right: 'PLUGIN_CONFIG_NEW'
        },
        {
          sectionKey: 'customizeSettings', type: 'removed', path: 'customizeSettings.desktop.js[0]',
          left: { type: 'FILE', file: { name: 'parent.js', _body: 'PARENT_CUSTOMIZE_BODY' } }
        },
        {
          sectionKey: 'customizeSettings', type: 'changed', path: 'customizeSettings.desktop.js[1].file._body',
          left: 'CUSTOMIZE_BODY_OLD', right: 'CUSTOMIZE_BODY_NEW'
        }
      ]
    });
    const names = await readWorkbookSheetNames(blob);
    expect(names.filter((name) => /^\d{2}_/.test(name))).toEqual([
      '09_追加済みプラグイン',
      '10_プラグイン個別設定',
      '11_JavaScript・CSS',
      '12_カスタマイズ本文'
    ]);

    const pluginParent = await readWorksheetByName(blob, '09_追加済みプラグイン');
    const pluginConfig = await readWorksheetByName(blob, '10_プラグイン個別設定');
    const customizeParent = await readWorksheetByName(blob, '11_JavaScript・CSS');
    const customizeBody = await readWorksheetByName(blob, '12_カスタマイズ本文');
    for (const sheet of [pluginParent, pluginConfig, customizeParent, customizeBody]) {
      expect((sheet.match(/<row r="/g) || []).length).toBe(3);
    }
    expect(pluginParent).toContain('<hyperlink ref="A3" location="&apos;設定値詳細&apos;!A2"');
    expect(pluginConfig).toContain('<hyperlink ref="A3" location="&apos;設定値詳細&apos;!A3"');
    expect(customizeParent).toContain('<hyperlink ref="A3" location="&apos;設定値詳細&apos;!A4"');
    expect(customizeBody).toContain('<hyperlink ref="A3" location="&apos;設定値詳細&apos;!A5"');
  });

  it('keeps process actions, app actions, and unknown APIs in separate customer sheets', async () => {
    const blob = buildDiffXlsxBlobWithSafeDefault({
      rows: [
        {
          sectionKey: 'processSettings', type: 'changed', path: 'processSettings.actions[0].filterCond',
          left: 'PROCESS_ACTION_OLD', right: 'PROCESS_ACTION_NEW'
        },
        {
          sectionKey: 'actionSettings', type: 'changed', path: 'actionSettings.actions.転記.filterCond',
          left: 'APP_ACTION_OLD', right: 'APP_ACTION_NEW'
        },
        {
          sectionKey: 'futureSettings', type: 'changed', path: 'futureSettings.option',
          left: 'UNKNOWN_OLD', right: 'UNKNOWN_NEW'
        }
      ]
    });
    const processApi = await readWorksheetByName(blob, '08_プロセス管理');
    const actionApi = await readWorksheetByName(blob, '13_アプリアクション');
    const unknownApi = await readWorksheetByName(blob, '99_その他の設定');

    expect(processApi).toContain('08 プロセス管理');
    expect(processApi).toContain('PROCESS_ACTION_OLD');
    expect(processApi).not.toContain('APP_ACTION_OLD');
    expect(processApi).toContain('<hyperlink ref="A3" location="&apos;設定値詳細&apos;!A2"');
    expect(actionApi).toContain('13 アプリアクション');
    expect(actionApi).toContain('APP_ACTION_OLD');
    expect(actionApi).not.toContain('PROCESS_ACTION_OLD');
    expect(actionApi).toContain('<hyperlink ref="A3" location="&apos;設定値詳細&apos;!A3"');
    expect(unknownApi).toContain('UNKNOWN_OLD');
    expect(unknownApi).toContain('<hyperlink ref="A3" location="&apos;設定値詳細&apos;!A4"');
  });

  it('builds summary, one filterable list, per-section sheets, and an issue sheet', async () => {
    const blob = buildDiffXlsxBlob(sampleCtx);
    const workbook = await readEntry(blob, 'xl/workbook.xml');
    expect(workbook).toContain('name="概要"');
    expect(workbook).toContain('name="差分一覧"');
    expect(workbook).toContain('name="フィールド差分要約"');
    expect(workbook).toContain('name="フィールド差分詳細"');
    expect(workbook).toContain('name="フィールド技術明細"');
    expect(workbook).toContain('name="ビュー設定"');
    expect(workbook).toContain('name="取得・未検証"');
    expect(workbook.indexOf('name="概要"')).toBeLessThan(workbook.indexOf('name="取得・未検証"'));
    expect(workbook.indexOf('name="取得・未検証"')).toBeLessThan(workbook.indexOf('name="フィールド差分要約"'));
    expect(workbook.indexOf('name="フィールド差分要約"')).toBeLessThan(workbook.indexOf('name="フィールド差分詳細"'));
    expect(workbook.indexOf('name="フィールド差分詳細"')).toBeLessThan(workbook.indexOf('name="差分一覧"'));
    expect(workbook).toContain('<definedNames>');
    expect(workbook).toContain('&apos;概要&apos;!$1:$2');
    expect(workbook).toContain('&apos;フィールド差分要約&apos;!$2:$3');
    expect(workbook).toContain('&apos;フィールド差分詳細&apos;!$2:$3');
    expect(workbook).toContain('&apos;差分一覧&apos;!$2:$3');
    expect(workbook).toContain('&apos;フィールド技術明細&apos;!$2:$3');
    expect(workbook).toContain('&apos;ビュー設定&apos;!$2:$3');
    expect(workbook).toContain('&apos;取得・未検証&apos;!$2:$2');
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
    expect(summary).toMatch(/<c r="A38" s="5"/);
    expect(summary).toContain('<mergeCell ref="B38:D38"/>');

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
    expect(issues).toMatch(/<c r="A3" s="5"/);
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
    expect(summary).toContain('2026/08/16 09:00:00 JST');
    expect(summary).toContain('比較日時');
    expect(summary).toContain('2026/08/16 08:59:00 JST');
    expect(summary).toContain('比較元取得日時');
    expect(summary).toContain('2026/08/16 08:57:00 JST');
    expect(summary).toContain('比較先取得日時');
    expect(summary).toContain('2026/08/16 08:58:00 JST');
    expect(summary).toContain('表示中（フィルタ適用後）');
    expect(summary).toContain('フィールド設定、ビュー設定');
    expect(summary).toContain('収録差分数');
    expect(summary).toContain('追加（比較先のみ）');
    expect(summary).toContain('削除（比較元のみ）');
    expect(summary).toContain('kintone 設定差分比較レポート');
    expect(summary).toContain('取得状態');
    expect(summary).toContain('比較不完全（差分なしとは判断できません）');
    expect(summary).toContain('不完全（取得失敗 1件）');
    expect(summary).toMatch(/<c r="A12"[^>]*>[\s\S]*?同一[\s\S]*?<\/c>/);
    expect(summary).toMatch(/<c r="B12"[^>]*><v>0<\/v>/);
    expect(summary).not.toContain('参考行');
    expect(summary).toContain('①「フィールド差分要約」で対象を確認');
    expect(summary).toContain('②「フィールド差分詳細」で変更前後を確認');
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
    expect(summary).toContain('収録された差分とレビュー入力は「差分一覧」へ進みます。');
    expect(summary).not.toContain('すべての差分');
    expect(summary).toContain('<hyperlink ref="A26" location="&apos;取得・未検証&apos;!A3"');
    expect(summary).toContain('<hyperlink ref="A27" location="&apos;フィールド差分要約&apos;!C4"');
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
    expect(list).toMatch(/<c r="I4" s="11"/);
    expect(list).toMatch(/<c r="I4" s="11"[^>]*>[\s\S]*?未確認/);
    expect(list).toMatch(/<c r="J4" s="11"/);
    expect(list).toMatch(/<c r="J4" s="11"[^>]*>[\s\S]*?未判断/);
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
    expect(list).toContain('orientation="landscape" fitToWidth="1" fitToHeight="0"');

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

  it('keeps section-specific drill-down sheets', async () => {
    const fieldSheet = await readWorksheetByName(buildDiffXlsxBlob(sampleCtx), 'フィールド技術明細');
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
    expect(detail).toContain('<pane xSplit="6" ySplit="3" topLeftCell="G4" activePane="bottomRight" state="frozen"/>');
    expect(detail).toContain('<autoFilter ref="A3:J5"/>');
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

  it('truncates field summary values without splitting a surrogate pair', async () => {
    const left = `${'a'.repeat(98)}😀tail`;
    const right = `${'b'.repeat(98)}😀tail`;
    const summary = await readWorksheetByName(buildDiffXlsxBlob({
      rows: [{
        sectionKey: 'fieldSettings', type: 'changed', severity: 'low',
        path: 'fieldSettings.properties.customer.description', left, right
      }]
    }), 'フィールド差分要約');

    expect(summary).toContain(`${'a'.repeat(98)}…`);
    expect(summary).toContain(`${'b'.repeat(98)}…`);
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
    expect(summary).toContain('フィールド差分');
    expect(summary).toContain('0件（走査済み）');
    expect(summary).not.toContain('差分なしとは判断できません');
    expect(summary).not.toContain('フィールド差分要約');
    expect(summary).not.toContain('取得・未検証');
    expect((list.match(/<row r="/g) || []).length).toBe(3);
    expect(list).toContain('このシートで分かること：このブックに収録された差分');
    expect(list).toContain('<autoFilter ref="A3:L3"/>');
    expect(summary).toContain('<hyperlink ref="A26" location="&apos;差分一覧&apos;!A3"');
    expect(workbook).not.toContain('name="フィールド差分要約"');
    expect(workbook).not.toContain('name="フィールド差分詳細"');
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
    expect(summary).toContain('比較不完全（差分なしとは判断できません）');
    expect(summary).toContain('差分上限 1000 件');
    expect(summary).toContain('一部未検証');
    expect(issues).toContain('取得失敗');
    expect(issues).toContain('HTTP 403');
    expect(issues).toContain('本文未検証');
    expect(issues).toContain('desktop.js: サイズ上限');
    expect(issues).toContain('件数上限');
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
});
