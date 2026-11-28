import { describe, expect, it } from 'vitest';
import { extractExpressionFieldCodes, extractQueryFieldCodes } from '../../src/kintone-query';

// 一覧の絞り込み条件・計算式は、kintone の設定や読み込んだ設定JSONから来る文字列。
// 関数名を探す正規表現が長い語で二乗の時間（5 万文字で数秒）になり、プレビュー反映の差分確認が固まっていた。
describe('クエリ・計算式からフィールドコードを探す時間', () => {
  const longWord = 'a'.repeat(60000);

  it('長い語だけの絞り込み条件でも、すぐに終わる', () => {
    const started = performance.now();
    expect(extractQueryFieldCodes(`${longWord} = "1" and 数値 > 1`, ['数値'])).toEqual(['数値']);
    expect(extractQueryFieldCodes(`${longWord} b()`, ['b'])).toEqual([]);
    expect(performance.now() - started).toBeLessThan(1000);
  });

  it('長い語だけの計算式でも、すぐに終わる', () => {
    const started = performance.now();
    expect(extractExpressionFieldCodes(`${longWord} + 単価 * SUM(数量)`, ['単価', '数量'])).toEqual(['単価', '数量']);
    expect(performance.now() - started).toBeLessThan(1000);
  });

  it('普通の長さの関数名・フィールドコードの扱いは変わらない', () => {
    expect(extractQueryFieldCodes('作成者 in (LOGINUSER()) and 日付 >= FROM_TODAY(-1, DAYS) and 状態 in ("a")', ['作成者', '日付', '状態', 'LOGINUSER'])).toEqual(['作成者', '日付', '状態']);
    expect(extractExpressionFieldCodes('IF(合計 > 0, ROUND(合計 * 税率, 0), 0)', ['合計', '税率', 'ROUND'])).toEqual(['合計', '税率']);
    const longCode = 'c'.repeat(128);
    expect(extractExpressionFieldCodes(`SUM(${longCode})`, [longCode])).toEqual([longCode]);
  });
});
