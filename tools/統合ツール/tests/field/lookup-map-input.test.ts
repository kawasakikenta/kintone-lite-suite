import { describe, expect, it } from 'vitest';
import {
  findFieldApplyProblem,
  findFieldMultiApplyProblem,
  parseLookupMapInput,
  planFieldApply
} from '../../src/tabs/field-standalone';

// フィールド追加の参照先変換（{"旧のアプリID":"新のアプリID"}）。
// 全角数字のまま入れた変換や、数字でない・空の値を黙って通すと、ルックアップ・関連レコード一覧の参照先が
// 変換されないまま（または kintone に無いアプリIDのまま）反映先プレビューへ書き込まれる。
// キーと値は全角数字を半角にしてから読み、正の整数でないものは反映の前に理由を示して止める。

const fieldJson = JSON.stringify({ properties: { x: { type: 'SINGLE_LINE_TEXT', code: 'x', label: 'x' } } });
const incoming = {
  ref: { type: 'SINGLE_LINE_TEXT', code: 'ref', label: '顧客', lookup: { relatedApp: { app: '10', code: 'CUST' }, relatedKeyField: 'k' } },
  rel: { type: 'REFERENCE_TABLE', code: 'rel', label: '案件', referenceTable: { relatedApp: { app: '11' }, condition: { field: 'a', relatedField: 'b' } } }
};

describe('parseLookupMapInput（フィールド追加の参照先変換）', () => {
  it('全角数字のキーと値を半角に直し、変換が反映の計画に効く', () => {
    const map = parseLookupMapInput('{"１０":"２５","１１":"２６"}');
    expect(map).toEqual({ '10': '25', '11': '26' });
    const plan = planFieldApply(incoming, {}, map, false);
    expect(plan.adds.ref.lookup.relatedApp.app).toBe('25');
    expect(plan.adds.rel.referenceTable.relatedApp.app).toBe('26');
    expect(plan.lookupConverted).toEqual(['ref', 'rel']);
  });

  it('全角のカンマで区切っても読む（全角数字と混ざっていてもよい）', () => {
    expect(parseLookupMapInput('{"10":"25"，"１１":"26"}')).toEqual({ '10': '25', '11': '26' });
  });

  it.each([
    ['数字でない値', '{"10":"abc"}', '「10」→「abc」'],
    ['数字でないキー', '{"abc":"25"}', '「abc」→「25」'],
    ['空の値', '{"10":""}', '「10」→「（空）」'],
    ['空白だけの値', '{"10":"  "}', '「10」→「（空）」'],
    ['空のキー', '{"":"25"}', '「（空）」→「25」'],
    ['null の値', '{"10":null}', '「10」→「（空）」'],
    ['0', '{"10":"0"}', '「10」→「0」'],
    ['負の数', '{"10":-5}', '「10」→「-5」'],
    ['小数', '{"10":2.5}', '「10」→「2.5」'],
    ['0 で始まる値', '{"10":"025"}', '「10」→「025」'],
    ['配列の値', '{"10":[25]}', '「10」→「[25]」'],
    ['オブジェクトの値', '{"10":{"app":"25"}}', '「10」→「{"app":"25"}」'],
    ['真偽値の値', '{"10":true}', '「10」→「true」'],
    ['全角の英字', '{"１０":"２ａ"}', '「10」→「2ａ」']
  ])('%s は理由を示して止める', (_label, text, detail) => {
    expect(() => parseLookupMapInput(text)).toThrow(/正の整数/);
    expect(() => parseLookupMapInput(text)).toThrow(detail);
  });

  it('全角と半角で同じ旧アプリIDを別の変換先にしたときは止める（同じ変換先なら 1 件にまとめる）', () => {
    expect(() => parseLookupMapInput('{"10":"25","１０":"26"}')).toThrow(/旧アプリID 10 が複数の変換先（25、26）/);
    expect(parseLookupMapInput('{"10":"25","１０":"２５"}')).toEqual({ '10': '25' });
  });

  it('正しい入力の読み方は変えない（前後の空白・数値の値・空の入力・形式の誤り）', () => {
    expect(parseLookupMapInput(' {"10":" 20 ", " 30 ": 40} ')).toEqual({ '10': '20', '30': '40' });
    expect(parseLookupMapInput('')).toEqual({});
    expect(parseLookupMapInput('   ')).toEqual({});
    expect(parseLookupMapInput('{}')).toEqual({});
    expect(() => parseLookupMapInput('[1]')).toThrow(/{"旧AppID":"新AppID"} 形式/);
    expect(() => parseLookupMapInput('{')).toThrow(/解析できません/);
  });

  it('確認画面へ進む前の検査（1 件・複数）が同じ理由を返す', () => {
    const single = findFieldApplyProblem({ targetAppId: '202', targetGuestId: '', fieldJson, lookupMapJson: '{"10":"abc"}' });
    expect(single).toMatch(/正の整数/);
    const multi = findFieldMultiApplyProblem({ targets: [{ appId: '202' }], fieldJson, lookupMapJson: '{"10":""}' });
    expect(multi).toMatch(/正の整数/);
    expect(findFieldApplyProblem({ targetAppId: '202', targetGuestId: '', fieldJson, lookupMapJson: '{"１０":"２５"}' })).toBe('');
  });
});
