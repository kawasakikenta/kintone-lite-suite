'use strict';

import { describe, expect, it } from 'vitest';
import { formatReflectChangeValue } from '../../src/entries/reflectPlanView.js';

describe('formatReflectChangeValue', () => {
  it('JSON のオブジェクト・配列は 2 スペースのインデントで整形する', () => {
    expect(formatReflectChangeValue('{"type":"LIST","fields":["a","b"]}')).toBe('{\n  "type": "LIST",\n  "fields": [\n    "a",\n    "b"\n  ]\n}');
    expect(formatReflectChangeValue('["a","b"]')).toBe('[\n  "a",\n  "b"\n]');
  });

  it('通常の文字列・数値・真偽値・「（なし）」はそのまま返す', () => {
    for (const value of ['取引先', '123', 'true', '（なし）', '', '反映先の設定を保持']) expect(formatReflectChangeValue(value)).toBe(value);
  });

  it('壊れた JSON と、JSON に見えるだけの文字列はそのまま返す', () => {
    expect(formatReflectChangeValue('{broken')).toBe('{broken');
    expect(formatReflectChangeValue('[1, 2')).toBe('[1, 2');
    expect(formatReflectChangeValue('{ 反映先 }')).toBe('{ 反映先 }');
  });

  it('空のオブジェクト・配列は整形後も空のまま', () => {
    expect(formatReflectChangeValue('{}')).toBe('{}');
    expect(formatReflectChangeValue('[]')).toBe('[]');
  });

  it('解析しきれないほど大きな値は整形せずそのまま返す', () => {
    const huge = JSON.stringify({ text: 'x'.repeat(250_000) });
    expect(formatReflectChangeValue(huge)).toBe(huge);
  });
});
