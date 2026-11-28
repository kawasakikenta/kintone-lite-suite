import { describe, expect, it } from 'vitest';
import { buildDiffHtml } from '../../src/diff/export';
import { buildHTML } from '../../src/tabs/er.js';
import { buildErRelationsCsv } from '../../src/tabs/er-model';
import { buildRecordsCsvText, neutralizeCsvFormula } from '../../src/tabs/record-query';
import { reportCsv } from '../../src/tabs/record-quality';

/**
 * CSV を Excel で開くと数式として評価される値。日本語版の Excel は全角の「＝＋－＠」で始まる値も数式にする
 * （kintone-settings-tools の検査で Excel で確かめた。半角と同じく HYPERLINK なども動く）。
 * レコードの値は、レコードを登録できる利用者なら誰でも入れられるため、CSV に出すときは文字列にする。
 * 前にタブ・改行があるものは、取り除いて評価する表計算ソフトもあるため止める。
 */
const formulaLike: Array<[string, string]> = [
  ['=1+1', "'=1+1"],
  ['+1+1', "'+1+1"],
  ['-1+1', "'-1+1"],
  ['@SUM(1;1)', "'@SUM(1;1)"],
  ['＝1+1', "'＝1+1"],
  ['＋1+1', "'＋1+1"],
  ['－1+1', "'－1+1"],
  ['＠SUM(1;1)', "'＠SUM(1;1)"],
  ['＝HYPERLINK("https://evil.example/";"開く")', '"\'＝HYPERLINK(""https://evil.example/"";""開く"")"'],
  [' ＝1+1', "' ＝1+1"],
  ['\u3000=1+1', "'\u3000=1+1"],
  ['\t=1+1', "'\t=1+1"],
  ['\tabc', "'\tabc"],
  ['\rabc', '"\'\rabc"'],
  ['\nabc', '"\'\nabc"']
];
const plain: Array<[string, string]> = [
  ['abc', 'abc'],
  ['顧客＝取引先', '顧客＝取引先'],
  ['1-2', '1-2'],
  ['−1', '−1'],
  ['a,b', '"a,b"'],
  ['', '']
];

function reportCsvEscape(): (value: unknown) => string {
  const html = buildDiffHtml({ appId: '1', sections: {} }, { appId: '2', sections: {} }, [], ['appSettings'], '', {});
  const script = html.match(/<script>([\s\S]*)<\/script>/)?.[1] || '';
  const start = script.indexOf('  function csvEscape(');
  const end = script.indexOf('\n  function ', start + 1);
  if (start < 0) throw new Error('csvEscape was not found in the report script');
  return new Function(`${script.slice(start, end)}\nreturn csvEscape;`)();
}

function erViewerCsvCell(): (value: unknown) => string {
  const html = buildHTML([{ id: 1, name: 'A', ok: true, status: 'complete', allFields: [], relations: [] }], {
    startAppId: '1', startAppIds: ['1'], layoutName: 'dagre', fieldDensity: 'standard', source: {}
  });
  const script = html.match(/<script id="er-main" type="text\/plain">([\s\S]*?)<\/script>/)?.[1] || '';
  const start = script.indexOf('function csvCell(');
  const end = script.indexOf('\nfunction ', start + 1);
  if (start < 0) throw new Error('csvCell was not found in the ER viewer script');
  return new Function(`${script.slice(start, end)}\nreturn csvCell;`)();
}

/** 関連一覧 CSV の参照元アプリ名の列に value を入れ、その列の書き出し結果を返す。 */
function erRelationsCsvCell(value: string): string {
  const csv = buildErRelationsCsv([
    { id: 1, name: value, fields: [], allFields: [], relations: [{ kind: 'LOOKUP', from: 'code', fromLabel: 'ラベル', toApp: 2, toField: 'key' }] },
    { id: 2, name: '参照先', fields: [], allFields: [], relations: [] }
  ]);
  const start = csv.indexOf('\n1,') + 3;
  const end = csv.indexOf(',code,ラベル,', start);
  if (start < 3 || end < 0) throw new Error(`relation row was not found: ${JSON.stringify(csv)}`);
  return csv.slice(start, end);
}

/** レコードの CSV 出力（kintoneレコード取得・CSV出力）で、文字列 1 行フィールドの値が value のときのセル。 */
function recordCsvCell(value: string): string {
  const csv = buildRecordsCsvText([{ memo: { type: 'SINGLE_LINE_TEXT', value } }], ['memo'], { lineEnding: '\r\n' });
  return csv.replace(/^\ufeff/, '').split('\r\n').slice(1).join('\r\n');
}

/** データ品質チェックの結果 CSV・CSVひな形の fields.csv（reportCsv）のセル。 */
function qualityCsvCell(value: string): string {
  return reportCsv([[value]]).replace(/^\ufeff/, '').replace(/\r?\n$/, '');
}

describe('CSV の数式注入対策', () => {
  const cases = [...formulaLike, ...plain];
  const writers: Array<[string, (value: string) => string]> = [
    ['差分HTMLレポートの CSV', reportCsvEscape()],
    ['ER図ビューアーの CSV', erViewerCsvCell()],
    ['ER図の関連一覧 CSV', erRelationsCsvCell],
    ['レコードの CSV', recordCsvCell],
    ['データ品質チェックの CSV', qualityCsvCell]
  ];
  for (const [label, write] of writers) {
    it(`${label}: 数式として評価され得る値の先頭に ' を付ける（全角の＝＋－＠、先頭のタブ・改行を含む）`, () => {
      for (const [input, expected] of cases) {
        if (label === 'ER図の関連一覧 CSV' && input === '') continue;
        expect(write(input), JSON.stringify(input)).toBe(expected);
      }
    });
  }

  it('レコードの CSV でも、値全体が数値（負の数を含む）のときは集計できるよう変えない', () => {
    for (const value of ['-1', '+2', '-0.5', '1e3', '-1.5E-3']) expect(neutralizeCsvFormula(value)).toBe(value);
    expect(neutralizeCsvFormula('－１')).toBe("'－１");
  });
});
