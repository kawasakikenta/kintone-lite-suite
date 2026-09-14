import { describe, it, expect } from 'vitest';
import {
  parseAppReference,
  needsAppReferenceParse,
  parseLookupMapText,
  describeReflectSetupBlocker,
  summarizePostApplyCheck
} from '../../src/reflect/liteSetup';

describe('parseAppReference', () => {
  it('accepts a plain app id', () => {
    expect(parseAppReference(' 123 ')).toEqual({ appId: '123', guestId: '' });
  });

  it('reads app and guest ids from kintone URLs', () => {
    expect(parseAppReference('https://example.cybozu.com/k/123/')).toEqual({ appId: '123', guestId: '' });
    expect(parseAppReference('https://example.cybozu.com/k/guest/5/123/?view=20')).toEqual({ appId: '123', guestId: '5' });
    expect(parseAppReference('https://example.cybozu.com/k/admin/app/flow?app=77#section=form')).toEqual({ appId: '77', guestId: '' });
    expect(parseAppReference('https://example.cybozu.com/k/guest/9/admin/app/flow?app=77')).toEqual({ appId: '77', guestId: '9' });
  });

  it('returns null for text without an app id', () => {
    expect(parseAppReference('')).toBeNull();
    expect(parseAppReference('営業アプリ')).toBeNull();
    expect(parseAppReference('https://example.cybozu.com/k/')).toBeNull();
    expect(parseAppReference('0')).toBeNull();
  });

  it('knows when a value still needs parsing', () => {
    expect(needsAppReferenceParse('123')).toBe(false);
    expect(needsAppReferenceParse('')).toBe(false);
    expect(needsAppReferenceParse('https://example.cybozu.com/k/123/')).toBe(true);
  });
});

describe('parseLookupMapText', () => {
  it('treats blank input as no mapping', () => {
    expect(parseLookupMapText('  \n ')).toEqual({ ok: true, value: {}, count: 0 });
  });

  it('keeps accepting the JSON object format', () => {
    const res = parseLookupMapText('{"10":"20","30":40}');
    expect(res).toEqual({ ok: true, value: { '10': '20', '30': '40' }, count: 2 });
  });

  it('accepts one pair per line with common separators and comments', () => {
    const res = parseLookupMapText('# 旧 → 新\n10 → 20\n30->40\n50 = 60\n70:80\n90,100\n110\t120\n130 140\n');
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.value).toEqual({ '10': '20', '30': '40', '50': '60', '70': '80', '90': '100', '110': '120', '130': '140' });
      expect(res.count).toBe(7);
    }
  });

  it('reports the line that cannot be read', () => {
    const res = parseLookupMapText('10 → 20\nabc');
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toMatch(/2 行目/);
  });

  it('rejects non-numeric ids, broken JSON, arrays and conflicting duplicates', () => {
    expect(parseLookupMapText('{"a":"20"}').ok).toBe(false);
    expect(parseLookupMapText('{bad').ok).toBe(false);
    expect(parseLookupMapText('[1,2]').ok).toBe(false);
    expect(parseLookupMapText('10 → 0').ok).toBe(false);
    const dup = parseLookupMapText('10 → 20\n10 → 30');
    expect(dup.ok).toBe(false);
    if (!dup.ok) expect(dup.error).toMatch(/複数の変換先/);
    expect(parseLookupMapText('10 → 20\n10 → 20')).toEqual({ ok: true, value: { '10': '20' }, count: 1 });
  });
});

describe('describeReflectSetupBlocker', () => {
  const base = { connectionError: '', sourceMode: 'app' as const, hasSourceBundle: false, scopeCount: 3, lookupError: '' };

  it('returns nothing when the setup is complete', () => {
    expect(describeReflectSetupBlocker(base)).toBe('');
    expect(describeReflectSetupBlocker({ ...base, sourceMode: 'json', hasSourceBundle: true })).toBe('');
  });

  it('asks for the JSON before anything else in JSON mode', () => {
    expect(describeReflectSetupBlocker({ ...base, sourceMode: 'json', connectionError: '反映先アプリIDには正の整数を入力してください。', scopeCount: 0 }))
      .toBe('比較元の設定JSONを読み込んでください。');
  });

  it('surfaces the connection error, then the scope count, then the lookup error', () => {
    expect(describeReflectSetupBlocker({ ...base, connectionError: '反映先アプリIDには正の整数を入力してください。', scopeCount: 0 }))
      .toBe('反映先アプリIDには正の整数を入力してください。');
    expect(describeReflectSetupBlocker({ ...base, scopeCount: 0, lookupError: 'x' })).toBe('反映する項目を 1 つ以上選んでください。');
    expect(describeReflectSetupBlocker({ ...base, lookupError: '2 行目を読み取れません。' })).toMatch(/詳細設定の参照先変換に誤りがあります。2 行目/);
  });
});

describe('summarizePostApplyCheck', () => {
  it('confirms when everything matches', () => {
    const res = summarizePostApplyCheck({ scopeCount: 3, changedLabels: [], errorLabels: [] });
    expect(res.tone).toBe('ok');
    expect(res.message).toMatch(/3 項目はすべて反映元と一致/);
  });

  it('warns about remaining differences and truncates long lists', () => {
    const res = summarizePostApplyCheck({ scopeCount: 7, changedLabels: ['a', 'b', 'c', 'd', 'e', 'f', 'g'], errorLabels: [] });
    expect(res.tone).toBe('warn');
    expect(res.message).toMatch(/7 項目に差分が残っています（a、b、c、d、e ほか 2 件）/);
  });

  it('prioritizes fetch failures over differences', () => {
    const res = summarizePostApplyCheck({ scopeCount: 2, changedLabels: ['a'], errorLabels: ['b'] });
    expect(res.tone).toBe('warn');
    expect(res.message).toMatch(/1 項目を取得できませんでした（b）/);
  });
});
