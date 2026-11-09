import { describe, expect, it } from 'vitest';
import { coerceEditable, editableDefaultText, editableText } from '../../src/entries/deploy-source-edit';

describe('editableDefaultText（段階 3 の「既定: …」）', () => {
  it('真偽値の既定は「はい / いいえ」で示す（true / false を出さない）', () => {
    expect(editableDefaultText({ value: true, editor: { type: 'boolean' } })).toBe('はい');
    expect(editableDefaultText({ value: false, editor: { type: 'boolean' } })).toBe('いいえ');
    // 入力欄の種類に関わらず、真偽値の既定は「はい / いいえ」
    expect(editableDefaultText({ value: true, editor: { type: 'text' } })).toBe('はい');
  });

  it('選択肢の入力欄は、選択肢の表示名で示す。表示名が無い値は値のまま', () => {
    const editor = { type: 'select' as const, options: [['ALL', '全員'], ['ADMIN', '管理者のみ']] as Array<[string, string]> };
    expect(editableDefaultText({ value: 'ADMIN', editor })).toBe('管理者のみ');
    expect(editableDefaultText({ value: 'OTHER', editor })).toBe('OTHER');
    // 値が文字列の 'true' / 'false' の選択肢は、選択肢の表示名（はい / いいえ）で示す
    expect(editableDefaultText({ value: 'true', editor: { type: 'select', options: [['true', 'はい'], ['false', 'いいえ']] } })).toBe('はい');
  });

  it('文字列・数値はそのまま、空は「（空）」、オブジェクトは JSON で示す', () => {
    expect(editableDefaultText({ value: '顧客名', editor: { type: 'text' } })).toBe('顧客名');
    expect(editableDefaultText({ value: 0, editor: { type: 'text' } })).toBe('0');
    expect(editableDefaultText({ value: '', editor: { type: 'text' } })).toBe('（空）');
    expect(editableDefaultText({ value: undefined, editor: { type: 'text' } })).toBe('（空）');
    expect(editableDefaultText({ value: { a: 1 }, editor: { type: 'text' } })).toBe('{"a":1}');
  });
});

describe('editableText / coerceEditable', () => {
  it('入力欄の文字列を、既定の値と同じ型へ戻す', () => {
    expect(editableText(true)).toBe('true');
    expect(editableText(null)).toBe('');
    expect(coerceEditable('12', 1)).toBe(12);
    expect(coerceEditable('abc', 1)).toBe('abc');
    expect(coerceEditable('true', false)).toBe(true);
    expect(coerceEditable('false', true)).toBe(false);
    expect(coerceEditable('x', 'text')).toBe('x');
  });
});
