import { describe, it, expect } from 'vitest';
import {
  parseAppReference,
  guestIdFromPagePath,
  needsAppReferenceParse,
  parseLookupMapText,
  describeReflectSetupBlocker,
  summarizePostApplyCheck,
  REFLECT_SCOPE_GROUPS,
  REFLECT_SCOPE_HINTS,
  groupReflectScopes,
  describeReflectScope,
  shouldWarnMissingFieldSettings,
  findMissingFieldReferences,
  canResolveByIncludingFieldSettings,
  describeApplySectionStatus,
  normalizeApplySections
} from '../../src/reflect/liteSetup';
import { SECTION_DEFS } from '../../src/constants';
import { reflectSelectionBlockers } from '../../src/reflect/standalonePlan';

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

describe('guestIdFromPagePath', () => {
  it('reads the guest space of the open kintone page, and is empty for the normal space', () => {
    expect(guestIdFromPagePath('/k/guest/5/123/show')).toBe('5');
    expect(guestIdFromPagePath('/k/guest/5/')).toBe('5');
    expect(guestIdFromPagePath('/k/123/')).toBe('');
    expect(guestIdFromPagePath('')).toBe('');
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
      .toBe('反映元の設定JSONを読み込んでください。');
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

describe('反映する項目のグループと説明', () => {
  const putKeys = SECTION_DEFS.filter((def) => def.put).map((def) => def.key);

  it('反映可能な項目はすべてグループに入り、説明が付く', () => {
    const grouped = groupReflectScopes(putKeys).flatMap((group) => group.keys);
    expect([...grouped].sort()).toEqual([...putKeys].sort());
    for (const key of putKeys) expect(describeReflectScope(key), key).not.toBe('');
  });

  it('グループに無い項目は「その他」へ入り、取りこぼさない', () => {
    const groups = groupReflectScopes([...putKeys, 'futureSettings']);
    expect(groups[groups.length - 1]).toEqual({ id: 'other', label: 'その他', keys: ['futureSettings'] });
  });

  it('対象が無いグループは返さない', () => {
    const groups = groupReflectScopes(['appAcl']);
    expect(groups.map((group) => group.id)).toEqual(['access']);
  });

  it('一般設定（appSettings）はキー一覧に足してあり、反映可能になれば動作グループへ入る', () => {
    expect(REFLECT_SCOPE_GROUPS.find((group) => group.id === 'behavior')?.keys).toContain('appSettings');
    expect(REFLECT_SCOPE_HINTS.appSettings).toBeTruthy();
    expect(groupReflectScopes(['fieldSettings', 'appSettings']).find((group) => group.id === 'behavior')?.keys).toEqual(['appSettings']);
  });

  it('説明は docs の保持・置換の区分に沿う', () => {
    expect(describeReflectScope('fieldSettings')).toContain('反映先だけのフィールドは保持');
    expect(describeReflectScope('layoutSettings')).toContain('末尾に保持');
    expect(describeReflectScope('viewSettings')).toContain('「保持」の設定に従います');
    expect(describeReflectScope('pluginSettings')).toContain('設定値はコピーしません');
    expect(describeReflectScope('customizeSettings')).toContain('ファイル一覧');
    for (const key of ['appAcl', 'notifications', 'processSettings', 'categories']) expect(describeReflectScope(key)).toContain('置き換えます');
  });
});

describe('shouldWarnMissingFieldSettings', () => {
  it('レイアウト・一覧・グラフ・アクションを選んでフィールド設定を選ばないときに注意する', () => {
    for (const key of ['layoutSettings', 'viewSettings', 'reportSettings', 'actionSettings']) {
      expect(shouldWarnMissingFieldSettings([key])).toBe(true);
    }
    expect(shouldWarnMissingFieldSettings(['layoutSettings', 'fieldSettings'])).toBe(false);
  });

  it('フィールドを参照しない項目だけなら注意しない', () => {
    expect(shouldWarnMissingFieldSettings([])).toBe(false);
    expect(shouldWarnMissingFieldSettings(['appAcl', 'notifications', 'pluginSettings'])).toBe(false);
    expect(shouldWarnMissingFieldSettings(['fieldSettings'])).toBe(false);
  });
});

describe('findMissingFieldReferences', () => {
  const view = { sectionKey: 'viewSettings', label: 'ビュー設定', blockers: [] as string[], requiredFields: ['name', 'tag'] };
  const layout = { sectionKey: 'layoutSettings', label: 'レイアウト設定', blockers: [] as string[], requiredFields: ['name'] };

  it('反映先に無い参照フィールドを、メッセージではなく requiredFields から求める', () => {
    expect(findMissingFieldReferences([view, layout], ['viewSettings'], [], ['name', 'local'])).toEqual([
      { sectionKey: 'viewSettings', label: 'ビュー設定', code: 'tag', inSource: undefined }
    ]);
  });

  it('反映元のフィールドコードが分かるときは、反映元にあるかも示す', () => {
    const missing = findMissingFieldReferences([view], ['viewSettings'], ['name', 'tag'], ['name']);
    expect(missing).toEqual([{ sectionKey: 'viewSettings', label: 'ビュー設定', code: 'tag', inSource: true }]);
    expect(findMissingFieldReferences([view], ['viewSettings'], ['name'], ['name'])[0].inSource).toBe(false);
  });

  it('選択していない項目は見ない', () => {
    expect(findMissingFieldReferences([view, layout], ['layoutSettings'], [], ['name'])).toEqual([]);
  });

  it('フィールド設定を選んでいて問題が無ければ、反映元のフィールドは追加されるので不足にしない', () => {
    const fields = { sectionKey: 'fieldSettings', label: 'フィールド設定', blockers: [] as string[] };
    expect(findMissingFieldReferences([fields, view], ['fieldSettings', 'viewSettings'], ['name', 'tag'], ['name'])).toEqual([]);
    const blocked = { ...fields, blockers: ['種類が異なります'] };
    expect(findMissingFieldReferences([blocked, view], ['fieldSettings', 'viewSettings'], ['name', 'tag'], ['name']).map((item) => item.code)).toEqual(['tag']);
  });

  it('reflectSelectionBlockers が不足と判定する場合と一致する', () => {
    const entries = [view, layout].map((entry) => ({ ...entry, status: 'change', message: '', behavior: '', changes: [], changeCount: 0, removalCount: 0, warnings: [], operations: [] }));
    const scopes = ['viewSettings', 'layoutSettings'];
    const blockers = reflectSelectionBlockers(entries as any, scopes, ['name', 'tag'], ['name']);
    const missing = findMissingFieldReferences(entries, scopes, ['name', 'tag'], ['name']);
    expect(blockers.length).toBe(missing.length);
    expect(blockers[0]).toContain(`「${missing[0].code}」`);
  });
});

describe('canResolveByIncludingFieldSettings', () => {
  const missing = (inSource: boolean | undefined) => [{ sectionKey: 'viewSettings', label: 'ビュー設定', code: 'tag', inSource }];

  it('フィールド設定が未選択で、反映元にある（または不明な）不足があれば案内する', () => {
    expect(canResolveByIncludingFieldSettings(missing(true), ['viewSettings'])).toBe(true);
    expect(canResolveByIncludingFieldSettings(missing(undefined), ['viewSettings'])).toBe(true);
  });

  it('反映元にも無いと分かっている不足だけなら案内しない（再取得しても解消しない）', () => {
    expect(canResolveByIncludingFieldSettings(missing(false), ['viewSettings'])).toBe(false);
  });

  it('フィールド設定を選択済み、または不足が無ければ案内しない', () => {
    expect(canResolveByIncludingFieldSettings(missing(true), ['viewSettings', 'fieldSettings'])).toBe(false);
    expect(canResolveByIncludingFieldSettings([], ['viewSettings'])).toBe(false);
  });
});

describe('反映結果の表示用ヘルパー', () => {
  it('状態を文字とアイコンで表す', () => {
    expect(describeApplySectionStatus('ok')).toEqual({ icon: '✓', text: '成功', tone: 'ok' });
    expect(describeApplySectionStatus('ng')).toEqual({ icon: '✕', text: '失敗', tone: 'ng' });
    expect(describeApplySectionStatus('skip')).toEqual({ icon: '－', text: '変更なし', tone: 'skip' });
    expect(describeApplySectionStatus('pending')).toEqual({ icon: '○', text: '未実行', tone: 'pending' });
    expect(describeApplySectionStatus('unknown').text).toBe('未実行');
  });

  it('保存済みの結果から表示できるセクションだけを取り出す', () => {
    expect(normalizeApplySections(undefined)).toEqual([]);
    expect(normalizeApplySections([
      { sectionKey: 'fieldSettings', label: 'フィールド設定', status: 'ng', message: '失敗\n詳細' },
      { sectionKey: 'viewSettings', label: 'ビュー設定', status: 'bogus' },
      null,
      'text',
      {}
    ])).toEqual([
      { sectionKey: 'fieldSettings', label: 'フィールド設定', status: 'ng', message: '失敗\n詳細' },
      { sectionKey: 'viewSettings', label: 'ビュー設定', status: 'pending' }
    ]);
  });
});
