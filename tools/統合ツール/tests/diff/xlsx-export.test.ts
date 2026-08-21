import { describe, it, expect } from 'vitest';
import {
  buildDiffXlsxBlob as buildDiffXlsxBlobWithSafeDefault,
  buildDiffXlsxExport as buildDiffXlsxExportWithSafeDefault,
  buildDiffXlsxFieldModel,
  type DiffXlsxContext
} from '../../src/diff/xlsx-export';

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

function worksheetRowContaining(worksheet: string, text: string): string {
  const rows = [...worksheet.matchAll(/<row\b[^>]*>[\s\S]*?<\/row>/g)]
    .map((match) => match[0])
    .filter((xml) => xml.includes(text));
  const row = rows[rows.length - 1];
  if (!row) throw new Error(`worksheet row not found: ${text}`);
  return row;
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
  it('defaults to the compact customer workbook and records only actual review rows', async () => {
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
    const allText = await readAllEntryText(blob);

    expect([...workbook.matchAll(/<sheet\b[^>]*\bname="([^"]+)"/g)].map((match) => match[1])).toEqual([
      '比較概要', '変更一覧'
    ]);
    expect(summary).toContain('kintone 設定差分確認レポート');
    expect(summary).toContain('比較元：変更前アプリ  ／  比較先：変更後アプリ');
    expect(summary).toContain('比較結果');
    expect(summary).toContain('比較処理');
    expect(summary).toContain('正常完了（選択範囲）');
    expect(summary).toContain('変更件数');
    expect(summary).toContain('詳細を省略した変更');
    expect(summary).toContain('上記以外の設定領域は比較していません');
    expect(summary).toContain('設定の反映・移行計画ではありません');
    expect(summary).toContain('比較条件の調整');
    expect(summary).toContain('変更一覧を開く');
    expect(summary).toContain('<hyperlink ref="F3" location="&apos;変更一覧&apos;!A2"');
    expect(summary).not.toContain('生成日時');
    expect(summary).not.toContain('取得日時');
    expect(summary).not.toContain('正規化設定');
    expect(summary).not.toContain('無視キー');
    expect(summary).not.toContain('シート案内');

    for (const [cell, label] of [
      ['A2', 'No.'], ['B2', '分類'], ['C2', '対象'], ['D2', '変更区分'],
      ['E2', '比較元'], ['F2', '比較先'], ['G2', '確認ポイント'], ['H2', '顧客レビュー状況'],
      ['I2', '対応方針'], ['J2', '担当者'], ['K2', 'コメント']
    ]) {
      expect(list).toMatch(new RegExp(`<c r="${cell}"[^>]*>[\\s\\S]*?${label}[\\s\\S]*?<\\/c>`));
    }
    expect((list.match(/<row r="/g) || []).length).toBe(3);
    expect(list).toContain('<pane xSplit="3" ySplit="2" topLeftCell="D3" activePane="bottomRight" state="frozen"/>');
    expect(list).toContain('<autoFilter ref="A2:K3"/>');
    expect(list).toContain('sqref="H3:H3"');
    expect(list).toContain('顧客レビュー状況');
    expect(list).toContain('&quot;未レビュー,レビュー中,レビュー済み,対象外&quot;');
    expect(list).toContain('sqref="I3:I3"');
    expect(list).toContain('&quot;未判断,対応する,対応しない,保留,対象外&quot;');
    for (const cell of ['H3', 'I3', 'J3', 'K3']) expect(list).toContain(`<c r="${cell}" s="11"`);
    expect(list).not.toContain('差分ID');
    expect(list).not.toContain('存在状況');
    expect(list).not.toContain('技術パス');
    expect((allText.match(/<hyperlink\b/g) || []).length).toBe(1);
    expect(allText).not.toContain('<f>');
    expect(allText).not.toContain('externalLink');
    expect(allText).not.toContain('vbaProject');
    expect(allText).not.toContain('connections.xml');
    expect(allText).not.toContain('SAME_ROW_SECRET');
    expect(allText).not.toContain('30303');
    expect(allText).not.toContain('40404');
    expect(allText).not.toContain('10101');
    expect(allText).not.toContain('20202');
  });

  it('directs masked-value review to the comparison side that actually contains the hidden value', async () => {
    const blob = buildDiffXlsxBlobWithSafeDefault({
      scopes: ['appSettings'],
      rows: [
        { sectionKey: 'appSettings', type: 'added', path: 'appSettings.name', right: 'api_key=TARGET_SECRET' },
        { sectionKey: 'appSettings', type: 'removed', path: 'appSettings.name', left: 'api_key=SOURCE_SECRET' },
        { sectionKey: 'appSettings', type: 'changed', path: 'appSettings.name', left: 'api_key=SOURCE_SECRET_2', right: 'api_key=TARGET_SECRET_2' }
      ]
    });
    const list = await readWorksheetByName(blob, '変更一覧');
    expect(list).toMatch(/<c r="G3"[^>]*>[\s\S]*?比較先の環境で確認[\s\S]*?<\/c>/);
    expect(list).toMatch(/<c r="G4"[^>]*>[\s\S]*?比較元の環境で確認[\s\S]*?<\/c>/);
    expect(list).toMatch(/<c r="G5"[^>]*>[\s\S]*?比較元と比較先の両方の環境で確認[\s\S]*?<\/c>/);
    expect(list).not.toContain('担当者が元の環境で確認');
    for (const secret of ['TARGET_SECRET', 'SOURCE_SECRET']) expect(list).not.toContain(secret);
  });

  it('adds a safe customer issue sheet only when comparison coverage is incomplete', async () => {
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
    const allText = await readAllEntryText(blob);

    expect([...workbook.matchAll(/<sheet\b[^>]*\bname="([^"]+)"/g)].map((match) => match[1])).toEqual([
      '比較概要', '確認できなかった範囲', '変更一覧'
    ]);
    expect(summary).toContain('比較未完了');
    expect(summary).toContain('一部未完了');
    expect(issues).toContain('取得できませんでした');
    expect(issues).toContain('この範囲は比較結果に含まれていません。再取得して確認してください。');
    expect(issues).toContain('取得できた範囲だけを比較しています。必要に応じて再取得してください。');
    expect(issues).toContain('確認できた件数は全体の一部です。条件を分けて再比較してください。');
    for (const secret of [rawError, rawMessage, rawFile, 'FILE_KEY_778899', 'RAW_PARTIAL_MESSAGE', 'RAW_FILE_REASON']) {
      expect(allText).not.toContain(secret);
    }
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
    expect(summary).toContain('正常完了（選択範囲）');
    expect(summary).not.toContain('比較未完了');
    expect(summary).not.toContain('一部未完了');
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
      '比較概要', '確認できなかった範囲', '変更一覧'
    ]);
    expect(summary).toContain('比較未完了');
    expect(summary).toContain('一部未完了');
    expect(summary).not.toContain('変更なし');
  });

  it('aggregates high-risk sections and removes technical identifiers from the customer ZIP and filename', async () => {
    const longSecret = `${'顧客説明'.repeat(80)}LONG_SECRET_TAIL_556677`;
    const result = buildDiffXlsxExportWithSafeDefault({
      filename: 'unsafe-app-556677-search.xlsx',
      sourceBundle: {
        appId: 556677,
        guestId: '778899',
        meta: { appName: '変更前環境' },
        sections: { fieldSettings: { properties: { title: { label: '件名', type: 'SINGLE_LINE_TEXT' } } } }
      },
      targetBundle: {
        appId: 667788,
        guestId: '889900',
        meta: { appName: '変更後環境' },
        sections: { fieldSettings: { properties: { title: { label: '件名', type: 'SINGLE_LINE_TEXT' } } } }
      },
      scopes: ['fieldSettings', 'appAcl', 'pluginSettings', 'customizeSettings', 'notifications'],
      exportMode: 'filtered',
      exportLabel: 'RAW_EXPORT_LABEL_556677',
      filterDescription: '検索: RAW_SEARCH_TERM_556677',
      ignoreKeys: 'revision,threadId',
      normalizationPresetState: { auditMeta: true },
      rows: [
        {
          sectionKey: 'appAcl', type: 'changed', path: 'appAcl.rights[0].entity.code',
          left: { type: 'USER', code: 'USER_556677', id: 556677 },
          right: { type: 'USER', code: 'USER_667788', id: 667788 }
        },
        {
          sectionKey: 'appAcl', type: 'changed', path: 'appAcl.rights[1].entity.code',
          left: 'ACL_SECRET_LEFT', right: 'ACL_SECRET_RIGHT'
        },
        {
          sectionKey: 'pluginSettings', type: 'changed', path: 'pluginSettings.plugins[0].config',
          left: { token: 'PLUGIN_SECRET_556677' }, right: { token: 'PLUGIN_SECRET_667788' }
        },
        {
          sectionKey: 'customizeSettings', type: 'changed', path: 'customizeSettings.desktop.js[0].file._body',
          left: 'CUSTOM_BODY_SECRET', right: 'https://internal.example/custom.js'
        },
        {
          sectionKey: 'notifications', type: 'changed', path: 'notifications.notifications[0]',
          left: { entity: { code: 'NOTIFY_USER_556677' } }, right: { entity: { code: 'NOTIFY_USER_667788' } }
        },
        {
          sectionKey: 'fieldSettings', type: 'changed', path: 'fieldSettings.properties.title.label',
          left: '旧件名', right: '新件名'
        },
        {
          sectionKey: 'fieldSettings', type: 'changed', path: 'fieldSettings.properties.title.lookup.relatedApp.app',
          left: '556677', right: '667788'
        },
        {
          sectionKey: 'appSettings', type: 'changed', path: 'appSettings.revision',
          label: 'revision', left: 112233, right: 223344
        },
        {
          sectionKey: 'viewSettings', type: 'changed', path: 'viewSettings.views.customer',
          left: { url: 'https://internal.example/556677', spaceId: 334455 },
          right: { url: 'https://internal.example/667788', threadId: 445566 }
        },
        {
          sectionKey: 'appSettings', type: 'changed', path: 'appSettings.description',
          left: longSecret, right: `${longSecret}R`
        },
        {
          sectionKey: 'pluginSettings', type: 'same', path: 'pluginSettings',
          left: { config: 'SAME_PLUGIN_SECRET' }, right: { config: 'SAME_PLUGIN_SECRET' }
        },
        {
          sectionKey: 'appSettings', type: 'changed', path: 'appSettings.helper',
          left: 'DISPLAY_ONLY_SECRET', right: 'DISPLAY_ONLY_SECRET', _displayOnly: true
        }
      ]
    });
    const workbook = await readEntry(result.blob, 'xl/workbook.xml');
    const summary = await readWorksheetByName(result.blob, '比較概要');
    const list = await readWorksheetByName(result.blob, '変更一覧');
    const allText = await readAllEntryText(result.blob);

    expect([...workbook.matchAll(/<sheet\b[^>]*\bname="([^"]+)"/g)].map((match) => match[1])).toEqual([
      '比較概要', '変更一覧'
    ]);
    expect(list).toContain('アプリ権限（2件の変更）');
    expect(list).toContain('プラグイン設定（1件の変更）');
    expect(list).toContain('カスタマイズ設定（1件の変更）');
    expect(list).toContain('通知設定（1件の変更）');
    expect(list).toContain('詳細は安全のため非表示');
    expect(list).toContain('件名 / フィールド名');
    expect(summary).toContain('絞り込み');
    expect(summary).toContain('比較条件の調整');
    expect(summary).toContain('詳細を省略した変更');
    expect(result.filename).toMatch(/^設定差分確認_変更前環境_vs_変更後環境_/);
    expect(result.filename).not.toContain('556677');
    expect(result.filename).not.toContain('667788');
    expect(result.filename).not.toContain('unsafe');
    for (const secret of [
      '556677', '667788', '778899', '889900', '112233', '223344', '334455', '445566',
      'RAW_EXPORT_LABEL_556677', 'RAW_SEARCH_TERM_556677',
      'appAcl.rights[0].entity.code', 'pluginSettings.plugins[0].config', 'appSettings.revision',
      'ACL_SECRET_LEFT', 'ACL_SECRET_RIGHT', 'PLUGIN_SECRET_556677', 'PLUGIN_SECRET_667788',
      'CUSTOM_BODY_SECRET', 'NOTIFY_USER_556677', 'NOTIFY_USER_667788',
      'https://internal.example', 'LONG_SECRET_TAIL_556677', 'SAME_PLUGIN_SECRET', 'DISPLAY_ONLY_SECRET'
    ]) {
      expect(allText).not.toContain(secret);
    }
    expect(allText).not.toMatch(/D-[0-9A-F]{8}/);
    expect(allText).not.toContain('識別:');
  });

  it('uses field labels and plain Japanese for customer layout, conditions, and sort order', async () => {
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
    const allText = await readAllEntryText(blob);

    for (const expected of [
      'レイアウト 1行目 / 取引先名 / 横幅',
      '見積金額が0より大きい',
      '優先度が「高」',
      '優先度が「高」または「通常」',
      '見積金額（降順）',
      '取引先名（昇順）'
    ]) expect(allText).toContain(expected);
    for (const technical of [
      'customer_name', 'amount &gt; 0', 'priority in', 'amount desc', 'customer_name asc'
    ]) expect(allText).not.toContain(technical);
  });

  it('denies unknown and credential-like customer values while preserving accurate source counts', async () => {
    const result = buildDiffXlsxExportWithSafeDefault({
      sourceBundle: { appId: 202, guestId: 7, meta: { appName: 'Dept7 Sales2024 (App 202)' } },
      targetBundle: { meta: { appName: 'Source App 991122' } },
      rows: [
        { sectionKey: 'appAcl', type: 'added', path: 'appAcl.rights[0]', right: 'ACL_ADD_SENTINEL' },
        { sectionKey: 'appAcl', type: 'removed', path: 'appAcl.rights[1]', left: 'ACL_REMOVE_SENTINEL' },
        { sectionKey: 'actionSettings', type: 'changed', path: 'actionSettings.actions[0].destApp.app', left: 'DEST_APP_441122', right: 'DEST_APP_551133' },
        { sectionKey: 'actionSettings', type: 'changed', path: 'actionSettings.actions[1].targetAppId', left: 'TARGET_APP_661144', right: 'TARGET_APP_771155' },
        { sectionKey: 'processSettings', type: 'changed', path: 'processSettings.actions[0].assignee.entity.code', left: 'USER_CODE_LEFT', right: 'USER_CODE_RIGHT' },
        { sectionKey: 'appInfo', type: 'changed', path: 'appInfo.creator.code', left: 'CREATOR_LEFT', right: 'CREATOR_RIGHT' },
        { sectionKey: 'viewSettings', type: 'changed', path: 'viewSettings.views.main.id', left: 'VIEW_ID_LEFT', right: 'VIEW_ID_RIGHT' },
        { sectionKey: 'reportSettings', type: 'changed', path: 'reportSettings.reports.main.id', left: 'REPORT_ID_LEFT', right: 'REPORT_ID_RIGHT' },
        { sectionKey: 'fieldSettings', type: 'changed', path: 'fieldSettings.properties.api_token.defaultValue', left: 'FIELD_SECRET_LEFT', right: 'FIELD_SECRET_RIGHT' },
        { sectionKey: 'fieldSettings', type: 'changed', path: 'fieldSettings.properties.total.expression', left: 'FORMULA_SECRET_LEFT', right: 'FORMULA_SECRET_RIGHT' },
        { sectionKey: 'futureUnknownSettings', type: 'changed', path: 'futureUnknownSettings.apiToken', left: 'UNKNOWN_TOKEN_LEFT', right: 'UNKNOWN_TOKEN_RIGHT' },
        { sectionKey: 'appSettings', type: 'changed', path: 'appSettings.description', left: 'C:\\Corp\\secret.txt', right: '\\\\server\\private\\share' },
        { sectionKey: 'appSettings', type: 'changed', path: 'appSettings.theme', left: 'Bearer SECRET_BEARER_ABC', right: 'api_key=SECRET_API_KEY_X' },
        { sectionKey: 'appSettings', type: 'changed', path: 'appSettings.icon', left: '/var/private/customer.pem', right: 'owner@example.internal' }
      ]
    });
    const summary = await readWorksheetByName(result.blob, '比較概要');
    const list = await readWorksheetByName(result.blob, '変更一覧');
    const allText = await readAllEntryText(result.blob);

    expect(allText).toContain('比較元：Dept7 Sales2024  ／  比較先：Source');
    expect(result.filename).toContain('Dept7 Sales2024_vs_Source');
    expect(result.filename).not.toContain('991122');
    expect(list).toContain('アプリ権限（2件の変更）');
    expect(summary).toMatch(/<c r="B4"[^>]*t="inlineStr"[^>]*>[\s\S]*?14件[\s\S]*?<\/c>/);
    expect(summary).toMatch(/<c r="B5"[^>]*t="inlineStr"[^>]*>[\s\S]*?1件[\s\S]*?<\/c>/);
    expect(summary).toMatch(/<c r="D5"[^>]*t="inlineStr"[^>]*>[\s\S]*?1件[\s\S]*?<\/c>/);
    for (const secret of [
      '991122', 'ACL_ADD_SENTINEL', 'ACL_REMOVE_SENTINEL',
      'DEST_APP_441122', 'DEST_APP_551133', 'TARGET_APP_661144', 'TARGET_APP_771155',
      'USER_CODE_LEFT', 'USER_CODE_RIGHT', 'CREATOR_LEFT', 'CREATOR_RIGHT',
      'VIEW_ID_LEFT', 'VIEW_ID_RIGHT', 'REPORT_ID_LEFT', 'REPORT_ID_RIGHT',
      'FIELD_SECRET_LEFT', 'FIELD_SECRET_RIGHT', 'FORMULA_SECRET_LEFT', 'FORMULA_SECRET_RIGHT',
      'UNKNOWN_TOKEN_LEFT', 'UNKNOWN_TOKEN_RIGHT',
      'C:\\Corp\\secret.txt', '\\\\server\\private\\share',
      'SECRET_BEARER_ABC', 'SECRET_API_KEY_X', '/var/private/customer.pem', 'owner@example.internal',
      'futureUnknownSettings.apiToken'
    ]) expect(allText).not.toContain(secret);
  });

  it('fails closed for future paths, identifier variants, credentials, unsafe labels, and invalid evidence dates', async () => {
    const longHash = 'a'.repeat(64);
    const sourceBundle = {
      appId: 202,
      meta: { appName: 'Legit App 2024' },
      sections: {
        fieldSettings: {
          properties: {
            customer_name: { code: 'customer_name', label: 'customer_name', type: 'SINGLE_LINE_TEXT' },
            lookup_field: { code: 'lookup_field', label: '顧客検索', type: 'SINGLE_LINE_TEXT' },
            field_1: { code: 'field_1', label: 'C:\\Corp\\private\\FIELD_LABEL_SECRET.txt', type: 'SINGLE_LINE_TEXT' },
            notes: { code: 'notes', label: '備考', type: 'SINGLE_LINE_TEXT' },
            owner: { code: 'owner', label: '担当者', type: 'USER_SELECT' },
            phone: { code: 'phone', label: '電話番号', type: 'SINGLE_LINE_TEXT' },
            owner_code: { code: 'owner_code', label: '担当者コード', type: 'USER_SELECT' },
            owner_choice: { code: 'owner_choice', label: '担当者選択', type: 'DROP_DOWN', options: { 通常: { label: '通常' } } },
            phone_num: { code: 'phone_num', label: '電話番号', type: 'NUMBER' },
            date_field: { code: 'date_field', label: '日付', type: 'DATE' },
            status: { code: 'status', label: '状態', type: 'DROP_DOWN', options: { OPEN: { label: 'OPEN' } } },
            text: { code: 'text', label: 'テキスト', type: 'SINGLE_LINE_TEXT' },
            unsafe_status: {
              code: 'unsafe_status', label: '社内状態', type: 'DROP_DOWN',
              options: { USER_CODE_ALICE: { label: 'USER_CODE_ALICE' }, USER_CODE_BOB: { label: 'USER_CODE_BOB' } }
            },
            choice: { code: 'choice', label: '選択', type: 'DROP_DOWN', options: { Safe: { label: 'Safe' } } },
            ref: { code: 'ref', label: '参照先', type: 'REFERENCE_TABLE' }
          }
        }
      }
    };
    const targetBundle = {
      meta: { appName: 'Source App 991122' },
      sections: sourceBundle.sections
    };
    const result = buildDiffXlsxExportWithSafeDefault({
      sourceBundle,
      targetBundle,
      comparedAt: 'https://internal.example/error?token=DATE_SECRET',
      rows: [
        { sectionKey: 'actionSettings', type: 'changed', path: 'actionSettings.actions[0].targetAppID', left: '441122', right: '551133' },
        { sectionKey: 'appSettings', type: 'changed', path: 'appSettings.description', left: 'path=C:\\Corp\\private\\client.txt', right: 'path=/var/private/client.pem' },
        { sectionKey: 'appSettings', type: 'changed', path: 'appSettings.description', left: 'TypeError: Cannot read properties of undefined at render (bundle.js:12:34)', right: 'Exception: INTERNAL_FAILURE_SENTINEL' },
        { sectionKey: 'appSettings', type: 'changed', path: 'appSettings.description', left: 'ODBC;DSN=Prod;UID=svc_batch;PWD=N7zQ4p!', right: 'ODBC;DSN=Prod;UID=svc_batch;PWD=V9mT2x!' },
        { sectionKey: 'appSettings', type: 'changed', path: 'appSettings.name', left: 'DBPWD=N7zQ4p!', right: 'SQLPWD=V9mT2x!' },
        { sectionKey: 'appSettings', type: 'changed', path: 'appSettings.name', left: 'cfg.DBPWD=N7zQ4p!', right: 'cfg.DBPASS=V9mT2x!' },
        { sectionKey: 'appSettings', type: 'changed', path: 'appSettings.name', left: 'Portal [778899]', right: 'Portal [667788]' },
        { sectionKey: 'appInfo', type: 'changed', path: 'appInfo.name', left: '665544', right: '554433' },
        { sectionKey: 'appSettings', type: 'changed', path: 'appSettings.theme', left: 'JSESSIONID=SIDABC123', right: 'PHPSESSID=SIDXYZ789' },
        { sectionKey: 'appSettings', type: 'changed', path: 'appSettings.enableThumbnails', left: 'Frank Internal', right: 'Frank External' },
        { sectionKey: 'appSettings', type: 'changed', path: 'appSettings.firstMonthOfFiscalYear', left: 'Grace Internal', right: 'Grace External' },
        { sectionKey: 'appSettings', type: 'changed', path: 'appSettings.numberPrecision', left: 'Heidi Internal', right: 'Heidi External' },
        { sectionKey: 'appSettings', type: 'changed', path: 'appSettings.name', left: 'path=..\\private\\client.txt', right: 'path=%APPDATA%\\client.txt' },
        { sectionKey: 'appSettings', type: 'changed', path: 'appSettings.icon', left: '$USERPROFILE\\private\\client.txt', right: '~\\private\\client.txt' },
        { sectionKey: 'appSettings', type: 'changed', path: 'appSettings.firstMonthOfFiscalYear', left: 'path=/rootfile.txt', right: 'path=/Users/山田/文書.txt' },
        { sectionKey: 'appSettings', type: 'changed', path: 'appSettings.theme', left: 'sk-proj-ABCDEF1234567890XYZ', right: 'AKIAIOSFODNN7EXAMPLE' },
        { sectionKey: 'fieldSettings', type: 'changed', path: 'fieldSettings.properties.notes.defaultValue', left: longHash, right: '550e8400-e29b-41d4-a716-446655440000' },
        { sectionKey: 'fieldSettings', type: 'changed', path: 'fieldSettings.properties.notes.description', left: 'sk_live_51ABCDEF1234567890XYZ', right: 'xoxb-123456789012-123456789012-abcdefghijklmnopqrstuvwx' },
        { sectionKey: 'fieldSettings', type: 'changed', path: 'fieldSettings.properties.notes.defaultValue', left: 'AbCDefGHIjklMNOP0123456789qrstUVWXyz0123456789ABCD', right: 'safe replacement' },
        { sectionKey: 'fieldSettings', type: 'changed', path: 'fieldSettings.properties.notes.defaultValue', left: 'Qx7+/Za9Bc2_De4+Fg6/Hi8=Jk0Lm2No4Pq6Rs8Tu0Vw2Xy4Z', right: 'safe replacement 2' },
        { sectionKey: 'fieldSettings', type: 'changed', path: 'fieldSettings.properties.notes.defaultValue', left: 'data:text/plain;base64,QUJDREVGRw==', right: 'ssh:internal-host' },
        { sectionKey: 'fieldSettings', type: 'changed', path: 'fieldSettings.properties.notes.defaultValue', left: 'glpat-abcdefghijklmnopqrst', right: 'npm_abcdefghijklmnopqrstuvwxyz0123456789' },
        { sectionKey: 'fieldSettings', type: 'changed', path: 'fieldSettings.properties.notes.defaultValue', left: 'session_key=abcdefghijklmnopqrstuv', right: 'safe replacement 3' },
        { sectionKey: 'fieldSettings', type: 'changed', path: 'fieldSettings.properties.field_1.required', left: false, right: true },
        { sectionKey: 'viewSettings', type: 'changed', path: 'viewSettings.views.案件一覧.sort', left: 'customer_name desc', right: 'customer_name asc' },
        { sectionKey: 'fieldSettings', type: 'changed', path: 'fieldSettings.properties.lookup_field.lookup.relatedKeyField', left: 'old_customer_id', right: 'customer_id' },
        { sectionKey: 'fieldSettings', type: 'changed', path: 'fieldSettings.properties.owner.entities[0].name', left: 'Alice Internal', right: 'Bob Internal' },
        { sectionKey: 'fieldSettings', type: 'changed', path: 'fieldSettings.properties.owner.defaultValue[0]', left: 'USER_CODE_ALICE', right: 'USER_CODE_BOB' },
        { sectionKey: 'fieldSettings', type: 'changed', path: 'fieldSettings.properties.orphan_owner.defaultValue[0].code', left: 'ORPHAN_USER_CODE_ALICE', right: 'ORPHAN_USER_CODE_BOB' },
        { sectionKey: 'fieldSettings', type: 'changed', path: 'fieldSettings.properties.orphan_owner.defaultValue[0].name', left: 'Orphan Alice Internal', right: 'Orphan Bob Internal' },
        { sectionKey: 'fieldSettings', type: 'changed', path: 'fieldSettings.properties.orphan_owner.defaultValue', left: 'ORPHAN_SCALAR_USER_ALICE', right: 'ORPHAN_SCALAR_USER_BOB' },
        { sectionKey: 'fieldSettings', type: 'changed', path: 'fieldSettings.properties.owner.type', left: 'INTERNAL_TYPE_X', right: 'INTERNAL_TYPE_Y' },
        { sectionKey: 'fieldSettings', type: 'changed', path: 'fieldSettings.properties.status.defaultValue', left: 'USER_CODE_ALICE', right: 'USER_CODE_BOB' },
        { sectionKey: 'fieldSettings', type: 'changed', path: 'fieldSettings.properties.phone_num.defaultValue', left: 'Alice Internal', right: 'Bob Internal' },
        { sectionKey: 'fieldSettings', type: 'changed', path: 'fieldSettings.properties.date_field.defaultValue', left: 'Alice Internal', right: 'Bob Internal' },
        { sectionKey: 'fieldSettings', type: 'changed', path: 'fieldSettings.properties.text.required', left: 'Ivan Internal', right: 'Ivan External' },
        { sectionKey: 'fieldSettings', type: 'changed', path: 'fieldSettings.properties.text.maxLength', left: 'Judy Internal', right: 'Judy External' },
        { sectionKey: 'fieldSettings', type: 'changed', path: 'fieldSettings.properties.text.label.required', left: 'Alice Internal', right: 'Alice External' },
        { sectionKey: 'fieldSettings', type: 'changed', path: 'fieldSettings.properties.text.code.label', left: 'Bob Internal', right: 'Bob External' },
        { sectionKey: 'fieldSettings', type: 'changed', path: 'fieldSettings.properties.text.options.foo.required', left: 'Carol Internal', right: 'Carol External' },
        { sectionKey: 'fieldSettings', type: 'changed', path: 'fieldSettings.properties.customer_name.label', left: 'customer_name', right: 'customer_name_new' },
        { sectionKey: 'fieldSettings', type: 'changed', path: 'fieldSettings.properties.ref.displayFields[0]', left: 'internal_customer_code', right: 'internal_customer_code_new' },
        { sectionKey: 'fieldSettings', type: 'changed', path: 'fieldSettings.properties.unsafe_status.defaultValue', left: 'USER_CODE_ALICE', right: 'USER_CODE_BOB' },
        { sectionKey: 'fieldSettings', type: 'changed', path: 'fieldSettings.properties.unsafe_status.options.USER_CODE_ALICE.label', left: 'USER_CODE_ALICE', right: 'USER_CODE_BOB' },
        { sectionKey: 'fieldSettings', type: 'changed', path: 'fieldSettings.properties.choice.options.Safe', left: 'Alice Internal', right: 'Bob Internal' },
        { sectionKey: 'viewSettings', type: 'changed', path: 'viewSettings.views.案件一覧.filterCond', left: 'phone = "090-1234-5678"', right: 'owner_code = "USER_CODE_ALICE"' },
        { sectionKey: 'viewSettings', type: 'changed', path: 'viewSettings.views.案件一覧.filterCond', left: 'owner_choice in ("alice@corp")', right: 'phone_num = 09012345678' },
        { sectionKey: 'viewSettings', type: 'changed', path: 'viewSettings.views.案件一覧.filterCond', left: 'owner_choice in ("alice@corp_internal")', right: 'phone_num = "Dave Internal"' },
        { sectionKey: 'viewSettings', type: 'changed', path: 'viewSettings.views.案件一覧.filterCond', left: 'phone_num = +819012345678', right: 'phone_num = "090 1234 5678"' },
        { sectionKey: 'viewSettings', type: 'changed', path: 'viewSettings.views.Customer App 771144 Prod.name', left: 'Customer App 771144 Prod', right: 'Customer App 661155 Prod' },
        { sectionKey: 'layoutSettings', type: 'changed', path: 'layoutSettings.layout[0].size.width', left: 'Ken Internal', right: 'Ken External' },
        { sectionKey: 'viewSettings', type: 'changed', path: 'viewSettings.views.Main.index', left: 'Leo Internal', right: 'Leo External' },
        { sectionKey: 'viewSettings', type: 'changed', path: 'viewSettings.views.Main.name', left: 'View ID 771144', right: 'ReportID=881155' },
        { sectionKey: 'viewSettings', type: 'changed', path: 'viewSettings.views.V1.name', left: 'P\u200BASSWORD=alpha1', right: 'alice\u200B@internal' },
        { sectionKey: 'viewSettings', type: 'changed', path: 'viewSettings.views.V2.name', left: 'LOG\u200BIN=ALICE01', right: 'C\u200B:\\Users\\alice\\secrets.txt' },
        { sectionKey: 'viewSettings', type: 'changed', path: 'viewSettings.views.V3.name', left: '+1 415 555 2671', right: 'commit=abcdef1234' },
        { sectionKey: 'viewSettings', type: 'changed', path: 'viewSettings.views.V4.name', left: 'cfg."DBPWD":"N7zQ4p!"', right: 'cfg["DBPWD"]=V9mT2x!' },
        { sectionKey: 'viewSettings', type: 'changed', path: 'viewSettings.views.V5.name', left: 'Error [ERR_MODULE_NOT_FOUND]: Alice Internal', right: 'at src/client.js:12:34' },
        { sectionKey: 'viewSettings', type: 'changed', path: 'viewSettings.views.V6.name', left: 'ENOENT: no such file, open private/client.json', right: 'HOST=db01;PORT=5432' },
        { sectionKey: 'viewSettings', type: 'changed', path: 'viewSettings.views.V7.name', left: 'DATA SOURCE=db01', right: '(415) 555 2671' },
        { sectionKey: 'viewSettings', type: 'changed', path: 'viewSettings.views.V8.name', left: 'private/secrets.txt', right: 'config\\prod.env' },
        { sectionKey: 'viewSettings', type: 'changed', path: 'viewSettings.views.V9.name', left: 'ECONNREFUSED 10.0.0.8:443', right: 'SECRETKEY=ABCxyz' },
        { sectionKey: 'viewSettings', type: 'changed', path: 'viewSettings.views.V10.name', left: 'PASSPHRASE=ABCxyz', right: 'SESSION=ABCxyz' },
        { sectionKey: 'viewSettings', type: 'changed', path: 'viewSettings.views.V11.name', left: 'COOKIE=ABCxyz', right: 'AUTHCODE=ABCxyz' },
        { sectionKey: 'viewSettings', type: 'changed', path: 'viewSettings.views.V12.name', left: 'SSHKEY=ABCxyz', right: 'PIN=1234' },
        { sectionKey: 'viewSettings', type: 'changed', path: 'viewSettings.views.V13.name', left: 'Employee ID ALICE', right: 'Account ID BOB' },
        { sectionKey: 'viewSettings', type: 'changed', path: 'viewSettings.views.V14.name', left: 'Owner login CAROL', right: 'passphrase huntertwo' },
        { sectionKey: 'viewSettings', type: 'changed', path: 'viewSettings.views.V15.name', left: 'session ABCxyz', right: 'auth code ABCxyz' },
        { sectionKey: 'viewSettings', type: 'changed', path: 'viewSettings.views.V16.name', left: 'Release deadbeef', right: 'Build deadbeefcafebabe' },
        { sectionKey: 'viewSettings', type: 'changed', path: 'viewSettings.views.V17.name', left: 'ssn 123 45 6789', right: 'card 4111 1111 1111 1111' },
        { sectionKey: 'viewSettings', type: 'changed', path: 'viewSettings.views.V18.name', left: 'db01.corp.local', right: 'prod-db.internal' },
        { sectionKey: 'viewSettings', type: 'changed', path: 'viewSettings.views.V19.name', left: '山田@example.com', right: 'alice@例え.テスト' },
        { sectionKey: 'viewSettings', type: 'changed', path: 'viewSettings.views.V20.name', left: 'PWD(N7zQ4p!)', right: '<DBPWD>V9mT2x!' },
        { sectionKey: 'viewSettings', type: 'changed', path: 'viewSettings.views.V21.name', left: 'private∕client.pem', right: 'private∖client.pem' },
        { sectionKey: 'viewSettings', type: 'changed', path: 'viewSettings.views.Contact.filterCond', left: 'phone_num = 2125551212', right: 'phone_num = 4155552671' },
        { sectionKey: 'fieldSettings', type: 'changed', path: 'fieldSettings.properties.phone_num.defaultValue', left: '2125551212', right: '4155552671' },
        { sectionKey: 'processSettings', type: 'changed', path: 'processSettings.enable', left: 'Mallory Internal', right: 'Mallory External' },
        { sectionKey: 'processSettings', type: 'changed', path: 'processSettings.states.Active.name', left: 'LOGIN=ALICE01', right: 'USERID=BOB02' },
        { sectionKey: 'actionSettings', type: 'changed', path: 'actionSettings.actions[0].name', left: 'CLIENT_ID=cli-ABC-123', right: 'CLIENT_ID=cli-XYZ-789' },
        { sectionKey: 'appSettings', type: 'changed', path: 'appSettings.futureInternalBlob', left: 'FUTURE_INTERNAL_LEFT_ABC', right: 'FUTURE_INTERNAL_RIGHT_XYZ' },
        { sectionKey: 'appSettings', type: 'changed', path: 'appSettings', left: 'ROOTPAYLOADABC', right: 'ROOTPAYLOADABCR' }
      ]
    });
    const summary = await readWorksheetByName(result.blob, '比較概要');
    const list = await readWorksheetByName(result.blob, '変更一覧');
    const allText = await readAllEntryText(result.blob);

    expect(summary).toContain('比較元：Legit App 2024  ／  比較先：Source');
    expect(summary).toContain('未記録');
    expect(result.filename).toContain('Legit App 2024_vs_Source');
    expect(list).toContain('フィールド / 必須項目にする');
    expect(list).toContain('並び順が変更されました（詳細非表示）');
    expect(list).toContain('詳細は安全のため非表示');
    for (const secret of [
      '991122', '441122', '551133', 'targetAppID',
      'path=C:\\Corp\\private\\client.txt', 'path=/var/private/client.pem',
      'TypeError: Cannot read properties of undefined at render (bundle.js:12:34)', 'INTERNAL_FAILURE_SENTINEL',
      'ODBC;DSN=Prod;UID=svc_batch;PWD=N7zQ4p!', 'ODBC;DSN=Prod;UID=svc_batch;PWD=V9mT2x!',
      'DBPWD=N7zQ4p!', 'SQLPWD=V9mT2x!',
      'cfg.DBPWD=N7zQ4p!', 'cfg.DBPASS=V9mT2x!',
      'Portal [778899]', 'Portal [667788]', '665544', '554433',
      'JSESSIONID=SIDABC123', 'PHPSESSID=SIDXYZ789',
      'Frank Internal', 'Frank External', 'Grace Internal', 'Grace External', 'Heidi Internal', 'Heidi External',
      'path=..\\private\\client.txt', 'path=%APPDATA%\\client.txt',
      '$USERPROFILE\\private\\client.txt', '~\\private\\client.txt',
      'path=/rootfile.txt', 'path=/Users/山田/文書.txt',
      'sk-proj-ABCDEF1234567890XYZ', 'AKIAIOSFODNN7EXAMPLE', longHash,
      'sk_live_51ABCDEF1234567890XYZ', 'xoxb-123456789012-123456789012-abcdefghijklmnopqrstuvwx',
      'AbCDefGHIjklMNOP0123456789qrstUVWXyz0123456789ABCD',
      'Qx7+/Za9Bc2_De4+Fg6/Hi8=Jk0Lm2No4Pq6Rs8Tu0Vw2Xy4Z',
      'data:text/plain;base64,QUJDREVGRw==', 'ssh:internal-host',
      'glpat-abcdefghijklmnopqrst', 'npm_abcdefghijklmnopqrstuvwxyz0123456789',
      'session_key=abcdefghijklmnopqrstuv',
      '550e8400-e29b-41d4-a716-446655440000',
      'C:\\Corp\\private\\FIELD_LABEL_SECRET.txt',
      'customer_name', 'old_customer_id', 'customer_id',
      'Alice Internal', 'Bob Internal', 'USER_CODE_ALICE', 'USER_CODE_BOB',
      'ORPHAN_USER_CODE_ALICE', 'ORPHAN_USER_CODE_BOB', 'Orphan Alice Internal', 'Orphan Bob Internal',
      'ORPHAN_SCALAR_USER_ALICE', 'ORPHAN_SCALAR_USER_BOB', 'INTERNAL_TYPE_X', 'INTERNAL_TYPE_Y',
      '090-1234-5678', 'phone =', 'owner_code =',
      'alice@corp', '09012345678', 'owner_choice in', 'phone_num =',
      'alice@corp_internal', 'Dave Internal', '+819012345678', '090 1234 5678',
      'Customer App 771144 Prod', 'Customer App 661155 Prod', '771144', '661155',
      'Ivan Internal', 'Ivan External', 'Judy Internal', 'Judy External',
      'Alice External', 'Bob External', 'Carol Internal', 'Carol External',
      'customer_name_new', 'internal_customer_code', 'internal_customer_code_new',
      'Ken Internal', 'Ken External', 'Leo Internal', 'Leo External',
      'View ID 771144', 'ReportID=881155', 'LOGIN=ALICE01', 'USERID=BOB02',
      'CLIENT_ID=cli-ABC-123', 'CLIENT_ID=cli-XYZ-789', 'Mallory Internal', 'Mallory External',
      'P\u200BASSWORD=alpha1', 'alice\u200B@internal', 'LOG\u200BIN=ALICE01', 'C\u200B:\\Users\\alice\\secrets.txt',
      '+1 415 555 2671', 'commit=abcdef1234',
      'cfg."DBPWD":"N7zQ4p!"', 'cfg["DBPWD"]=V9mT2x!',
      'Error [ERR_MODULE_NOT_FOUND]: Alice Internal', 'at src/client.js:12:34',
      'ENOENT: no such file, open private/client.json', 'HOST=db01;PORT=5432',
      'DATA SOURCE=db01', '(415) 555 2671', 'private/secrets.txt', 'config\\prod.env',
      'ECONNREFUSED 10.0.0.8:443', 'SECRETKEY=ABCxyz', 'PASSPHRASE=ABCxyz', 'SESSION=ABCxyz',
      'COOKIE=ABCxyz', 'AUTHCODE=ABCxyz', 'SSHKEY=ABCxyz', 'PIN=1234',
      'Employee ID ALICE', 'Account ID BOB', 'Owner login CAROL', 'passphrase huntertwo',
      'session ABCxyz', 'auth code ABCxyz', 'Release deadbeef', 'Build deadbeefcafebabe',
      'ssn 123 45 6789', 'card 4111 1111 1111 1111', 'db01.corp.local', 'prod-db.internal',
      '山田@example.com', 'alice@例え.テスト', 'PWD(N7zQ4p!)', '<DBPWD>V9mT2x!',
      'private∕client.pem', 'private∖client.pem', '2125551212', '4155552671',
      'futureInternalBlob', 'FUTURE_INTERNAL_LEFT_ABC', 'FUTURE_INTERNAL_RIGHT_XYZ',
      'ROOTPAYLOADABC', 'ROOTPAYLOADABCR',
      'https://internal.example/error?token=DATE_SECRET', 'DATE_SECRET'
    ]) expect(allText).not.toContain(secret);

    for (const unsafeName of [
      '991122', 'ID: 991122', 'App 991122', 'APP_991122', 'App 991122: Source', '991122 - Source'
    ]) {
      const idOnly = buildDiffXlsxExportWithSafeDefault({
        sourceBundle: { meta: { appName: 'Safe' } },
        targetBundle: { meta: { appName: unsafeName } },
        rows: [{ sectionKey: 'appSettings', type: 'changed', path: 'appSettings.name', left: '旧名称', right: '新名称' }]
      });
      expect(await readAllEntryText(idOnly.blob)).not.toContain('991122');
      expect(idOnly.filename).not.toContain('991122');
    }

    for (const shortExplicitId of ['Portal [9911]', 'ID: 8822']) {
      const unsafeShortId = buildDiffXlsxExportWithSafeDefault({
        sourceBundle: { meta: { appName: 'Safe' } },
        targetBundle: { meta: { appName: shortExplicitId } },
        rows: [{ sectionKey: 'appSettings', type: 'changed', path: 'appSettings.name', left: shortExplicitId, right: 'Safe target' }]
      });
      expect(await readAllEntryText(unsafeShortId.blob)).not.toContain(shortExplicitId);
      expect(unsafeShortId.filename).not.toContain(shortExplicitId);
    }

    for (const unsafeCredentialName of [
      'glpat-abcdefghijklmnopqrst',
      'npm_abcdefghijklmnopqrstuvwxyz0123456789',
      'session_key=abcdefghijklmnopqrstuv',
      'P\u200BASSWORD=alpha1',
      'alice\u200B@internal',
      'Release deadbeef',
      'Build deadbeefcafebabe',
      '山田@example.com',
      'alice@例え.テスト',
      'PWD(N7zQ4p!)',
      '<DBPWD>N7zQ4p!',
      'Portal Guest 7'
    ]) {
      const credentialName = buildDiffXlsxExportWithSafeDefault({
        sourceBundle: { meta: { appName: 'Safe' } },
        targetBundle: { meta: { appName: unsafeCredentialName } },
        rows: [{ sectionKey: 'appSettings', type: 'changed', path: 'appSettings.name', left: '旧名称', right: '新名称' }]
      });
      expect(await readAllEntryText(credentialName.blob)).not.toContain(unsafeCredentialName);
      expect(credentialName.filename).not.toContain(unsafeCredentialName);
    }

    const mismatchedIdNames = buildDiffXlsxExportWithSafeDefault({
      sourceBundle: { appId: 202, meta: { appName: '顧客ポータル (App 991122)' } },
      targetBundle: { appId: 303, meta: { appName: '(App 882233)' } },
      rows: [{ sectionKey: 'appSettings', type: 'changed', path: 'appSettings.name', left: '旧名称', right: '新名称' }]
    });
    const mismatchedIdText = await readAllEntryText(mismatchedIdNames.blob);
    expect(mismatchedIdText).toContain('顧客ポータル');
    for (const leakedId of ['991122', '882233']) {
      expect(mismatchedIdText).not.toContain(leakedId);
      expect(mismatchedIdNames.filename).not.toContain(leakedId);
    }

    const bracketedMismatchedIdNames = buildDiffXlsxExportWithSafeDefault({
      sourceBundle: { appId: 202, meta: { appName: 'Customer Portal [App 991122]' } },
      targetBundle: { appId: 303, meta: { appName: 'Customer Portal 【App 882233】' } },
      rows: [{ sectionKey: 'appSettings', type: 'changed', path: 'appSettings.name', left: '旧名称', right: '新名称' }]
    });
    const bracketedMismatchedIdText = await readAllEntryText(bracketedMismatchedIdNames.blob);
    for (const leakedId of ['991122', '882233']) {
      expect(bracketedMismatchedIdText).not.toContain(leakedId);
      expect(bracketedMismatchedIdNames.filename).not.toContain(leakedId);
    }

    const bareBracketedIdNames = buildDiffXlsxExportWithSafeDefault({
      sourceBundle: { appId: 202, meta: { appName: 'Customer Portal [991122]' } },
      targetBundle: { appId: 303, meta: { appName: 'Customer Portal 【882233】' } },
      rows: [{ sectionKey: 'appSettings', type: 'changed', path: 'appSettings.name', left: '旧名称', right: '新名称' }]
    });
    const bareBracketedIdText = await readAllEntryText(bareBracketedIdNames.blob);
    for (const leakedId of ['991122', '882233']) {
      expect(bareBracketedIdText).not.toContain(leakedId);
      expect(bareBracketedIdNames.filename).not.toContain(leakedId);
    }

    const knownShortIds = buildDiffXlsxExportWithSafeDefault({
      sourceBundle: { appId: 202, guestId: 7, meta: { appName: 'Portal [２０２]' } },
      targetBundle: { appId: 303, meta: { appName: 'Safe target' } },
      rows: [
        { sectionKey: 'appSettings', type: 'changed', path: 'appSettings.name', left: 'Portal #202', right: 'Portal [7]' },
        { sectionKey: 'appInfo', type: 'changed', path: 'appInfo.name', left: 'Portal 202', right: 'Portal 7' }
      ]
    });
    const knownShortIdText = await readAllEntryText(knownShortIds.blob);
    for (const technicalName of ['Portal [２０２]', 'Portal [202]', 'Portal #202', 'Portal [7]', 'Portal 202', 'Portal 7']) {
      expect(knownShortIdText).not.toContain(technicalName);
      expect(knownShortIds.filename).not.toContain(technicalName);
    }

    const readableEmbeddedIds = buildDiffXlsxExportWithSafeDefault({
      sourceBundle: { appId: 202, meta: { appName: '顧客202管理' } },
      targetBundle: { appId: 7, meta: { appName: 'Dept7Sales' } },
      rows: [{ sectionKey: 'appSettings', type: 'changed', path: 'appSettings.name', left: '旧名称', right: '新名称' }]
    });
    const readableEmbeddedIdText = await readAllEntryText(readableEmbeddedIds.blob);
    expect(readableEmbeddedIdText).toContain('顧客202管理');
    expect(readableEmbeddedIdText).toContain('Dept7Sales');
    expect(readableEmbeddedIds.filename).toContain('顧客202管理');
    expect(readableEmbeddedIds.filename).toContain('Dept7Sales');

    const embeddedMismatchedIdNames = buildDiffXlsxExportWithSafeDefault({
      sourceBundle: { appId: 202, meta: { appName: 'Customer App 991122 Prod' } },
      targetBundle: { appId: 303, meta: { appName: 'Customer New App 882233 Prod' } },
      rows: [{ sectionKey: 'appSettings', type: 'changed', path: 'appSettings.name', left: '旧名称', right: '新名称' }]
    });
    const embeddedMismatchedIdText = await readAllEntryText(embeddedMismatchedIdNames.blob);
    for (const leakedId of ['991122', '882233']) {
      expect(embeddedMismatchedIdText).not.toContain(leakedId);
      expect(embeddedMismatchedIdNames.filename).not.toContain(leakedId);
    }

    const epochDate = buildDiffXlsxBlobWithSafeDefault({
      comparedAt: 1787270400000,
      rows: [{ sectionKey: 'appSettings', type: 'changed', path: 'appSettings.name', left: '旧名称', right: '新名称' }]
    });
    expect(await readWorksheetByName(epochDate, '比較概要')).toContain('JST');

    const readableNames = buildDiffXlsxExportWithSafeDefault({
      sourceBundle: { meta: { appName: 'CustomerPortalRelease2024Production' } },
      targetBundle: { meta: { appName: 'Department7CustomerManagement2024' } },
      rows: [{ sectionKey: 'appSettings', type: 'changed', path: 'appSettings.name', left: '旧名称', right: '新名称' }]
    });
    const readableNameText = await readAllEntryText(readableNames.blob);
    expect(readableNameText).toContain('CustomerPortalRelease2024Production');
    expect(readableNameText).toContain('Department7CustomerManagement2024');
    expect(readableNames.filename).toContain('CustomerPortalRelease2024Production_vs_Department7CustomerManagement2024');

    const readableEnglishFieldLabels = buildDiffXlsxBlobWithSafeDefault({
      sourceBundle: { sections: { fieldSettings: { properties: { amount: { code: 'amount', label: 'OldAmount', type: 'NUMBER' } } } } },
      targetBundle: { sections: { fieldSettings: { properties: { amount: { code: 'amount', label: 'Amount', type: 'NUMBER' } } } } },
      rows: [{ sectionKey: 'fieldSettings', type: 'changed', path: 'fieldSettings.properties.amount.label', left: 'OldAmount', right: 'Amount' }]
    });
    const readableEnglishFieldLabelText = await readAllEntryText(readableEnglishFieldLabels);
    expect(readableEnglishFieldLabelText).toContain('OldAmount');
    expect(readableEnglishFieldLabelText).toContain('Amount');
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
    expect(styles).toContain('<cellXfs count="18">');
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

  it('uses one-based nested layout positions with field identity and Japanese innerHeight', async () => {
    const list = await readWorksheetByName(buildDiffXlsxBlob({
      targetBundle: {
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
      },
      rows: [{
        sectionKey: 'layoutSettings', type: 'changed', severity: 'low',
        path: 'layoutSettings.layout[0].fields[1].size.innerHeight', left: 60, right: 80,
        reasonSummary: 'レイアウト行「行 #0」 / フィールド #1 / innerheight 変更'
      }]
    }), '差分一覧');

    expect(list).toContain('レイアウト行 #1 / フィールド #2 「優先度」（priority） / 内側の高さ');
    expect(list).toContain('レイアウト行「行 #1」 / フィールド #2 / 入力欄の高さ 変更');
    expect(list).not.toContain('行 #0');
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
    expect(list).toContain('いいえ');
    expect(list).toContain('はい');
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
