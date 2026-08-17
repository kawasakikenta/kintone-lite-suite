import { describe, it, expect } from 'vitest';
import {
  buildDiffXlsxBlob,
  buildDiffXlsxExport,
  buildDiffXlsxFieldModel,
  type DiffXlsxContext
} from '../../src/diff/xlsx-export';

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

const sampleCtx: DiffXlsxContext = {
  generatedAt: '2026-08-16T00:00:00.000Z',
  comparedAt: '2026-08-15T23:59:00.000Z',
  sourceBundle: { appId: 1, guestId: '', preview: false, meta: { appName: 'アプリA' } },
  targetBundle: { appId: 2, guestId: '7', preview: true, meta: { appName: 'アプリB' } },
  scopes: ['fieldSettings', 'viewSettings'],
  ignoreKeys: 'revision',
  normalizationPresetState: { viewOrder: true, permissionOrder: false },
  exportMode: 'filtered',
  exportLabel: '表示中（フィルタ適用後）',
  exportContentMode: 'diffOnly',
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
    expect(workbook.indexOf('name="概要"')).toBeLessThan(workbook.indexOf('name="フィールド差分要約"'));
    expect(workbook.indexOf('name="フィールド差分要約"')).toBeLessThan(workbook.indexOf('name="フィールド差分詳細"'));
    expect(workbook.indexOf('name="フィールド差分詳細"')).toBeLessThan(workbook.indexOf('name="差分一覧"'));
    expect(workbook).toContain('<definedNames>');
    expect(workbook).toContain('&apos;概要&apos;!$1:$2');
    expect(workbook).toContain('&apos;差分一覧&apos;!$1:$2');
    expect(workbook).toContain('&apos;取得・未検証&apos;!$1:$1');
  });

  it('records normalization switches in the evidence summary', async () => {
    const summary = await readEntry(buildDiffXlsxBlob(sampleCtx), 'xl/worksheets/sheet1.xml');
    expect(summary).toContain('正規化設定');
    expect(summary).toContain('有効: ビュー順序');
    expect(summary).toContain('無効: 権限順序');
  });

  it('writes comparison direction, export range, scopes, and accurate counts', async () => {
    const summary = await readEntry(buildDiffXlsxBlob(sampleCtx), 'xl/worksheets/sheet1.xml');
    expect(summary).toContain('アプリA (App 1)');
    expect(summary).toContain('アプリB (App 2)');
    expect(summary).toContain('比較元 → 比較先');
    expect(summary).toContain('比較日時');
    expect(summary).toContain('2026-08-15T23:59:00.000Z');
    expect(summary).toContain('表示中（フィルタ適用後）');
    expect(summary).toContain('フィールド設定、ビュー設定');
    expect(summary).toContain('追加（比較先のみ）');
    expect(summary).toContain('削除（比較元のみ）');
    expect(summary).toContain('kintone 設定差分比較レポート');
    expect(summary).toContain('完全性');
    expect(summary).toContain('不完全（取得失敗 1件）');
    expect(summary).toContain('重要度 高 / 中 / 低');
    expect(summary).toContain('1 / 1 / 1');
    expect(summary).toContain('「フィールド差分要約」で対象を特定し、「フィールド差分詳細」で設定項目ごとの比較値を確認できます');
    expect(summary).toContain('フィールド差分を見る');
    expect(summary).toContain('2フィールド / 2設定差分');
    expect(summary).toContain('<hyperlink ref="D18" location="&apos;フィールド差分要約&apos;!C3"');
    expect(summary).toMatch(/<c r="B6"[^>]*><v>3<\/v>/);
    expect(summary).toContain('<mergeCell ref="A1:D1"/>');
    expect(summary).toContain('<mergeCell ref="A2:D2"/>');
    expect(summary).toContain('アプリA (App 1)  →  アプリB (App 2)');
    expect(summary).toContain('showGridLines="0"');
    expect(summary).toContain('orientation="portrait" fitToWidth="1" fitToHeight="0"');
  });

  it('writes one row per result to the consolidated list with directional values', async () => {
    const list = await readEntry(buildDiffXlsxBlob(sampleCtx), 'xl/worksheets/sheet4.xml');
    expect((list.match(/<row r="/g) || []).length).toBe(5);
    expect(list).toContain('差分の識別');
    expect(list).toContain('レビュー入力（黄色）');
    expect(list).toContain('値の比較（比較元 → 比較先）');
    expect(list).toContain('<mergeCell ref="A1:E1"/>');
    expect(list).toContain('<mergeCell ref="F1:H1"/>');
    expect(list).toContain('<mergeCell ref="J1:K1"/>');
    expect(list).toContain('比較元の値');
    expect(list).toContain('比較先の値');
    expect(list).toContain('アプリA (App 1)');
    expect(list).toContain('アプリB (App 2)');
    expect(list).toContain('確認ポイント');
    expect(list).toContain('差分ID');
    expect(list).toContain('確認状態');
    expect(list).toContain('担当者');
    expect(list).toContain('レビューコメント');
    expect(list).toContain('表示名が変更されています');
    expect(list).toContain('新ラベル（bar） / フィールド名');
    expect(list).not.toContain('フィールド「bar」 / フィールド名');
    expect(list).toContain('追加（比較先のみ）');
    expect(list).toContain('削除（比較元のみ）');
    // 追加行は比較元(J列)が空、比較先(K列)だけに値がある。
    expect(list).not.toMatch(/<c r="J3"/);
    expect(list).toMatch(/<c r="K3"/);
    // 削除行は比較元(J列)だけに値がある。
    expect(list).toMatch(/<c r="J5"/);
    expect(list).not.toMatch(/<c r="K5"/);
    // ID～項目を固定し、レビュー状態にはドロップダウンを付ける。
    expect(list).toContain('<pane xSplit="5" ySplit="2" topLeftCell="F3" activePane="bottomRight" state="frozen"/>');
    expect(list).toContain('<autoFilter ref="A2:L5"/>');
    expect(list).toContain('sqref="F3:F5"');
    expect(list).toContain('&quot;未確認,確認中,対応要,対応不要,確認済み&quot;');
    // 状態（初期値: 未確認）と空の担当・コメントを黄色の編集欄として保持する。
    expect(list).toMatch(/<c r="F3" s="17"/);
    expect(list).toMatch(/<c r="F3" s="17"[^>]*>[\s\S]*?未確認/);
    expect(list).toMatch(/<c r="G3" s="17"/);
    expect(list).toMatch(/<c r="H3" s="17"/);
    // 高・低・中の重要度をそれぞれ視認できる色にする。
    expect(list).toMatch(/<c r="B3" s="14"/);
    expect(list).toMatch(/<c r="B4" s="16"/);
    expect(list).toMatch(/<c r="B5" s="15"/);
    const dataRowHeights = [...list.matchAll(/<row r="[3-5]" ht="([0-9.]+)" customHeight="1">/g)]
      .map((match) => Number(match[1]));
    expect(dataRowHeights).toHaveLength(3);
    expect(dataRowHeights.every((height) => height >= 22 && height <= 70)).toBe(true);
    expect(list).toContain('orientation="landscape" fitToWidth="1" fitToHeight="0"');
  });

  it('keeps section-specific drill-down sheets', async () => {
    const fieldSheet = await readEntry(buildDiffXlsxBlob(sampleCtx), 'xl/worksheets/sheet5.xml');
    expect((fieldSheet.match(/<row r="/g) || []).length).toBe(4);
    expect(fieldSheet).toContain('差分の識別');
    expect(fieldSheet).toContain('値の比較（比較元 → 比較先）');
    expect(fieldSheet).toContain('foo / フィールド全体');
    expect(fieldSheet).toContain('&quot;code&quot;: &quot;foo&quot;');
    expect(fieldSheet).toContain('旧ラベル');
    expect(fieldSheet).toContain('新ラベル');
    // レビュー記入欄はマスターの差分一覧だけに置き、シート間で状態が分裂しないようにする。
    expect(fieldSheet).toContain('差分ID');
    expect(fieldSheet).not.toContain('確認状態');
    expect(fieldSheet).not.toContain('レビューコメント');
    expect(fieldSheet).toMatch(/<row r="3" ht="([0-9.]+)" customHeight="1">/);
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
      fieldName: '請求金額', settingLabel: '必須項目にする', severity: 'high'
    });
    expect(model.details.find((detail) => detail.fieldCode === 'lines > item')).toMatchObject({
      fieldName: '請求明細 > 商品名', settingLabel: '初期値'
    });
    expect(model.summaries.find((summary) => summary.fieldCode === 'amount')).toMatchObject({
      fieldName: '請求金額', diffCount: 2, added: 0, removed: 0, changed: 2,
      severity: 'high', settingLabels: ['フィールド名', '必須項目にする']
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
    const summary = await readEntry(blob, 'xl/worksheets/sheet2.xml');
    const detail = await readEntry(blob, 'xl/worksheets/sheet3.xml');

    expect(summary).toContain('差分フィールド');
    expect(summary).toContain('状態');
    expect(summary).toContain('フィールド名');
    expect(summary).toContain('フィールドコード');
    expect(summary).toContain('フィールド種別');
    expect(summary).toContain('設定差分数');
    expect(summary).toContain('主な変更');
    expect(summary).toContain('追加（比較先のみ）');
    expect(summary).toContain('設定変更');
    expect(summary).toContain('新ラベル');
    expect(summary).toContain('フィールド全体');
    expect(summary).toContain('フィールド名');
    expect(summary).toContain('文字列（1行）');
    expect(summary).toContain('詳細を見る（1件）');
    expect(summary).toContain('<pane xSplit="5" ySplit="2" topLeftCell="F3" activePane="bottomRight" state="frozen"/>');
    expect(summary).toContain('<autoFilter ref="A2:H4"/>');
    expect(summary).toContain('<hyperlink ref="H3" location="&apos;フィールド差分詳細&apos;!C4"');
    expect(summary).toContain('<hyperlink ref="H4" location="&apos;フィールド差分詳細&apos;!C3"');
    expect(summary).toMatch(/<c r="H3" s="19"/);

    expect(detail).toContain('設定項目');
    expect(detail).toContain('値の比較（比較元 → 比較先）');
    expect(detail).toContain('比較元の値');
    expect(detail).toContain('比較先の値');
    expect(detail).toContain('旧ラベル');
    expect(detail).toContain('新ラベル');
    expect(detail).toContain('要約へ戻る');
    expect(detail).toContain('差分ID');
    expect(detail).toContain('—（比較元には存在しません）');
    expect(detail).toContain('種類: 文字列（1行）');
    expect(detail).toContain('コード: foo');
    expect(detail).not.toContain('&quot;code&quot;: &quot;foo&quot;');
    expect(detail).toContain('<autoFilter ref="A2:K4"/>');
    expect(detail).toContain('<hyperlink ref="A3" location="&apos;差分一覧&apos;!A4"');
    expect(detail).toContain('<hyperlink ref="A4" location="&apos;差分一覧&apos;!A3"');
    expect(detail).toContain('<hyperlink ref="K3" location="&apos;フィールド差分要約&apos;!C4"');
    expect(detail).toContain('<hyperlink ref="K4" location="&apos;フィールド差分要約&apos;!C3"');
    expect(detail).toMatch(/<c r="A3" s="19"/);
    expect(detail).toMatch(/<c r="K3" s="19"/);
    // 変更は比較元を赤、比較先を緑、追加時の欠落側は参考色にする。
    expect(detail).toMatch(/<c r="G3" s="4"/);
    expect(detail).toMatch(/<c r="H3" s="3"/);
    expect(detail).toMatch(/<c r="G4" s="7"/);
    expect(detail).toMatch(/<c r="H4" s="3"/);
    expect(detail).not.toContain('確認状態');
    expect(detail).not.toContain('レビューコメント');
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
        details: model.details.map(({ fieldCode, fieldName, settingKey, settingLabel, severity }) => ({
          fieldCode, fieldName, settingKey, settingLabel, severity
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
    const first = await readEntry(buildDiffXlsxBlob({ rows }), 'xl/worksheets/sheet4.xml');
    const second = await readEntry(buildDiffXlsxBlob({ rows: [...rows].reverse() }), 'xl/worksheets/sheet4.xml');
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
    const firstOnly = await readEntry(buildDiffXlsxBlob({ rows: [firstRow] }), 'xl/worksheets/sheet4.xml');
    const expectedFirstId = firstOnly.match(/D-[0-9A-F]{8}/)?.[0];
    const reversed = await readEntry(buildDiffXlsxBlob({ rows: [secondRow, firstRow] }), 'xl/worksheets/sheet4.xml');
    expect(expectedFirstId).toBeTruthy();
    expect(reversed).toContain(expectedFirstId!);

    const repeated = { ...firstRow };
    const repeatedBlob = buildDiffXlsxBlob({ rows: [repeated, repeated] });
    const list = await readEntry(repeatedBlob, 'xl/worksheets/sheet4.xml');
    const detail = await readEntry(repeatedBlob, 'xl/worksheets/sheet3.xml');
    const ids = [...list.matchAll(/D-[0-9A-F]{8}(?:-\d+)?/g)].map((match) => match[0]);
    expect(ids).toHaveLength(2);
    expect(new Set(ids).size).toBe(2);
    expect(detail).toContain('<hyperlink ref="A3" location="&apos;差分一覧&apos;!A3"');
    expect(detail).toContain('<hyperlink ref="A4" location="&apos;差分一覧&apos;!A4"');
  });

  it('treats an added setting as a setting change rather than a new field', async () => {
    const summary = await readEntry(buildDiffXlsxBlob({
      sourceBundle: { sections: { fieldSettings: { properties: { amount: { code: 'amount', label: '金額', type: 'NUMBER' } } } } },
      targetBundle: { sections: { fieldSettings: { properties: { amount: { code: 'amount', label: '金額', type: 'NUMBER', unit: '円' } } } } },
      rows: [{
        sectionKey: 'fieldSettings', type: 'added', severity: 'medium',
        path: 'fieldSettings.properties.amount.unit', right: '円'
      }]
    }), 'xl/worksheets/sheet2.xml');
    expect(summary).toContain('設定変更');
    expect(summary).not.toContain('追加（比較先のみ）');
    expect(summary).toMatch(/<c r="A3" s="5"/);
  });

  it('never falls back to raw JSON in the human field detail', async () => {
    const blob = buildDiffXlsxBlob({
      rows: [{
        sectionKey: 'fieldSettings', type: 'added', severity: 'high',
        path: 'fieldSettings.properties.legacy', right: { unknown: { token: 'RAW_TECHNICAL_MARKER' } }
      }]
    });
    const detail = await readEntry(blob, 'xl/worksheets/sheet3.xml');
    const technical = await readEntry(blob, 'xl/worksheets/sheet5.xml');
    expect(detail).toContain('要約できない形式です');
    expect(detail).not.toContain('RAW_TECHNICAL_MARKER');
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
    const summary = await readEntry(blob, 'xl/worksheets/sheet1.xml');
    expect(workbook).not.toContain('name="フィールド差分要約"');
    expect(workbook).toContain('name="フィールド技術明細"');
    expect(summary).toContain('構造化できない差分 1件');
    expect(summary).toContain('技術明細を見る');
    expect(summary).toContain('<hyperlink ref="D18" location="&apos;フィールド技術明細&apos;!A3"');
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
    const summary = await readEntry(blob, 'xl/worksheets/sheet1.xml');
    const list = await readEntry(blob, 'xl/worksheets/sheet2.xml');
    const workbook = await readEntry(blob, 'xl/workbook.xml');
    expect(summary).toContain('差分なし');
    expect(summary).toContain('フィールド差分');
    expect(summary).toContain('0件（走査済み）');
    expect(summary).not.toContain('差分なしとは判断できません');
    expect((list.match(/<row r="/g) || []).length).toBe(2);
    expect(list).toContain('<autoFilter ref="A2:L2"/>');
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
    const summary = await readEntry(blob, 'xl/worksheets/sheet1.xml');
    const issues = await readEntry(blob, 'xl/worksheets/sheet3.xml');
    expect(summary).toContain('要確認（比較結果は不完全です。差分なしとは判断できません）');
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
    const summary = await readEntry(blob, 'xl/worksheets/sheet1.xml');
    const issues = await readEntry(blob, 'xl/worksheets/sheet3.xml');

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
    const summary = await readEntry(blob, 'xl/worksheets/sheet1.xml');
    const list = await readEntry(blob, 'xl/worksheets/sheet2.xml');

    expect(summary).toContain('機密値省略');
    expect(list).toContain('同一の機密値は安全のため省略しました');
    expect(list).not.toContain('PLUGIN_SAME_SECRET');
    expect(list).not.toContain('CUSTOM_SAME_SECRET');
  });

  it('counts moved changes and excludes display-only rows from diff totals', async () => {
    const summary = await readEntry(buildDiffXlsxBlob({
      rows: [
        { sectionKey: 'layoutSettings', type: 'changed', moved: true, path: 'layoutSettings.layout[0]' },
        { sectionKey: 'processSettings', type: 'changed', path: 'processSettings.__rename__', _displayOnly: true },
        { sectionKey: 'appSettings', type: 'same', path: 'appSettings' }
      ]
    }), 'xl/worksheets/sheet1.xml');
    expect(summary).toMatch(/<c r="B6"[^>]*><v>1<\/v>/);
    expect(summary).toMatch(/<c r="B9"[^>]*><v>1<\/v>/);
    expect(summary).toContain('1 / 1');
  });

  it('keeps formula-looking values as inline text without formulas or links', async () => {
    const list = await readEntry(buildDiffXlsxBlob({
      rows: [
        { sectionKey: 'appSettings', type: 'changed', path: 'appSettings.name', left: '=1+1', right: ' +SUM(A1:A2)' },
        { sectionKey: 'appSettings', type: 'changed', path: 'appSettings.description', left: '\t-HYPERLINK("https://example.com")', right: '@SUM(A1:A2)' }
      ]
    }), 'xl/worksheets/sheet2.xml');
    expect(list).toContain('t="inlineStr"');
    expect(list).not.toContain('<f>');
    expect(list).not.toContain('<hyperlink');
    expect(list).not.toContain('externalLink');
    expect(list).toContain('=1+1');
    expect(list).toContain('@SUM(A1:A2)');
  });

  it('uses readable long-value previews with original UTF-16 length and distinct hashes', async () => {
    const common = 'x'.repeat(5000);
    const list = await readEntry(buildDiffXlsxBlob({
      rows: [{
        sectionKey: 'appSettings',
        type: 'changed',
        path: 'appSettings.description',
        left: `${common}LEFT_ONLY_TAIL`,
        right: `${common}RIGHT_ONLY_TAIL`
      }]
    }), 'xl/worksheets/sheet2.xml');
    const hashes = [...list.matchAll(/識別:([0-9A-F]{8})/g)].map((match) => match[1]);
    expect(hashes).toHaveLength(2);
    expect(hashes[0]).not.toBe(hashes[1]);
    expect(list).toContain('元UTF-16長 5014');
    expect(list).toContain('元UTF-16長 5015');
    expect(list).not.toContain('LEFT_ONLY_TAIL');
    expect(list).not.toContain('RIGHT_ONLY_TAIL');
  });

  it('applies the same long-value safety preview to field detail values', async () => {
    const common = '値'.repeat(5000);
    const detail = await readEntry(buildDiffXlsxBlob({
      rows: [{
        sectionKey: 'fieldSettings',
        type: 'changed',
        path: 'fieldSettings.properties.notes.defaultValue',
        left: `${common}FIELD_LEFT_TAIL`,
        right: `${common}FIELD_RIGHT_TAIL`
      }]
    }), 'xl/worksheets/sheet3.xml');
    const hashes = [...detail.matchAll(/識別:([0-9A-F]{8})/g)].map((match) => match[1]);
    expect(hashes).toHaveLength(2);
    expect(hashes[0]).not.toBe(hashes[1]);
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
