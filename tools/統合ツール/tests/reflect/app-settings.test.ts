import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildReflectSectionPlan as plan, reflectInspectionScopes, reflectSelectionBlockers, listReflectFieldCodes } from '../../src/reflect/standalonePlan';
import { APP_SETTINGS_REFLECT_KEYS, REFLECT_SECTION_KEYS, isReflectableSection, reflectSectionLabel } from '../../src/reflect/sections';
import { previewReflectStandalone, runApplyPreviewStandalone } from '../../src/tabs/reflect-standalone';

const settings = (extra: Record<string, any> = {}) => ({
  name: 'アプリ', description: '説明', icon: { type: 'PRESET', key: 'APP01' }, theme: 'WHITE',
  titleField: { selectionMode: 'AUTO' }, enableThumbnails: true, enableBulkDeletion: true, enableComments: true,
  enableDuplicateRecord: false, enableInlineRecordEditing: true,
  numberPrecision: { digits: '16', decimalPlaces: '4', roundingMode: 'HALF_EVEN' }, firstMonthOfFiscalYear: '1', revision: '5', ...extra
});
const copy = (value: any) => JSON.parse(JSON.stringify(value));

describe('一般設定（appSettings）の反映対象', () => {
  it('REFLECT_SECTION_KEYS は appSettings をレイアウトの直後に置き、未対応の項目を含めない', () => {
    expect(REFLECT_SECTION_KEYS.slice(0, 4)).toEqual(['fieldSettings', 'layoutSettings', 'appSettings', 'viewSettings']);
    expect(REFLECT_SECTION_KEYS).toContain('categories');
    expect(isReflectableSection('appSettings')).toBe(true);
    expect(isReflectableSection('appInfo')).toBe(false);
    expect(isReflectableSection('formSettings')).toBe(false);
  });
  it('ラベルは appSettings だけ「一般設定」、ほかは共通の定義に従う', () => {
    expect(reflectSectionLabel('appSettings')).toBe('一般設定');
    expect(reflectSectionLabel('fieldSettings')).toBe('フィールド設定');
    expect(reflectSectionLabel('unknown')).toBe('unknown');
  });
  it('アプリ名・説明・アイコンは反映するキーに含めない', () => {
    expect(APP_SETTINGS_REFLECT_KEYS).toEqual(['theme', 'titleField', 'enableThumbnails', 'enableBulkDeletion', 'enableComments', 'enableDuplicateRecord', 'enableInlineRecordEditing', 'numberPrecision', 'firstMonthOfFiscalYear']);
    for (const key of ['name', 'description', 'icon', 'revision']) expect(APP_SETTINGS_REFLECT_KEYS).not.toContain(key);
  });
  it('appSettings 選択時は fieldSettings も検査対象に含める', () => {
    expect(reflectInspectionScopes(['appSettings'])).toEqual(['appSettings', 'fieldSettings']);
  });
});

describe('一般設定の反映計画', () => {
  it('差分がなければ書き込まない（アプリ名などが違っても同じ扱い）', () => {
    const result = plan('appSettings', settings({ name: '反映元' }), settings({ name: '反映先', description: '別の説明' }));
    expect(result.status).toBe('same'); expect(result.operations).toEqual([]); expect(result.label).toBe('一般設定');
  });
  it('テーマなどの変更を PUT /app/settings.json にまとめ、名前・説明・アイコンは送らない', () => {
    const result = plan('appSettings', settings({ theme: 'RED', enableComments: false, name: '反映元', icon: { type: 'PRESET', key: 'APP99' } }), settings({ name: '反映先' }));
    expect(result.status).toBe('change');
    expect(result.behavior).toBe('動作・表示の設定を更新（アプリ名・説明・アイコンは対象外）');
    expect(result.operations).toHaveLength(1);
    const [operation] = result.operations;
    expect(operation).toMatchObject({ method: 'PUT', endpoint: '/app/settings.json', label: '一般設定' });
    expect(operation.body.theme).toBe('RED'); expect(operation.body.enableComments).toBe(false);
    for (const key of ['name', 'description', 'icon', 'revision']) expect(operation.body).not.toHaveProperty(key);
    expect(result.changes).toEqual([
      { kind: '変更', path: 'テーマ', before: 'WHITE', after: 'RED' },
      { kind: '変更', path: 'コメント機能', before: 'true', after: 'false' }
    ]);
  });
  it('反映元に無いキーは変更なしとして送らない（古いJSONとの互換）', () => {
    const result = plan('appSettings', { theme: 'RED', revision: '5' }, settings());
    expect(result.operations[0].body).toEqual({ theme: 'RED' });
    expect(result.changeCount).toBe(1);
  });
  it('反映元に対象キーが一つも無ければ書き込まない', () => {
    const result = plan('appSettings', { name: 'のみ', revision: '5' }, settings());
    expect(result.status).toBe('same'); expect(result.operations).toEqual([]);
  });
  it('数値は文字列に正規化して比較する', () => {
    const same = plan('appSettings', settings({ numberPrecision: { digits: 16, decimalPlaces: 4, roundingMode: 'HALF_EVEN' }, firstMonthOfFiscalYear: 1 }), settings());
    expect(same.status).toBe('same');
    const changed = plan('appSettings', settings({ numberPrecision: { digits: 20, decimalPlaces: 2, roundingMode: 'DOWN' }, firstMonthOfFiscalYear: 4 }), settings());
    expect(changed.operations[0].body.numberPrecision).toEqual({ digits: '20', decimalPlaces: '2', roundingMode: 'DOWN' });
    expect(changed.operations[0].body.firstMonthOfFiscalYear).toBe('4');
  });
  it('レコードのタイトルが自動のときは code の有無で差分にしない', () => {
    const result = plan('appSettings', settings({ titleField: { selectionMode: 'AUTO', code: 'old' } }), settings());
    expect(result.status).toBe('same'); expect(result.requiredFields).toBeUndefined();
  });
  it('手動のレコードのタイトルは反映先に必要なフィールドとして登録し、反映先に無ければ検出する', () => {
    const result = plan('appSettings', settings({ titleField: { selectionMode: 'MANUAL', code: 'subject' } }), settings());
    expect(result.status).toBe('change');
    expect(result.operations[0].body.titleField).toEqual({ selectionMode: 'MANUAL', code: 'subject' });
    expect(result.requiredFields).toEqual(['subject']);
    expect(reflectSelectionBlockers([result], ['appSettings'], [], [])[0]).toContain('参照するフィールド「subject」が反映先にありません');
    expect(reflectSelectionBlockers([result], ['appSettings'], [], ['subject'])).toEqual([]);
  });
  it('不正な形の取得値は書き込まずエラーにする', () => {
    for (const bad of [undefined, null, [], 'text', { _fetchError: '失敗' }]) {
      const result = plan('appSettings', bad, settings());
      expect(result.status).not.toBe('change'); expect(result.operations).toEqual([]); expect(result.blockers.length).toBeGreaterThan(0);
      const reverse = plan('appSettings', settings(), bad);
      expect(reverse.operations).toEqual([]); expect(reverse.blockers.length).toBeGreaterThan(0);
    }
    const title = plan('appSettings', settings({ titleField: 'code' }), settings());
    expect(title.status).toBe('error'); expect(title.operations).toEqual([]); expect(title.message).toContain('レコードのタイトル');
  });
  it('入力を書き換えない', () => {
    const source = settings({ theme: 'RED', titleField: { selectionMode: 'MANUAL', code: 'a' } }), target = settings();
    const frozen = copy({ source, target });
    plan('appSettings', source, target);
    expect({ source, target }).toEqual(frozen);
  });
});

// ---- 実エンジン経由（kintone.api をモック） ----
const field = (code: string) => ({ type: 'SINGLE_LINE_TEXT', code, label: code, required: false });

function server(options: { target?: any; fields?: Record<string, any>; revision?: number } = {}) {
  let revision = options.revision ?? 10;
  const target = { current: options.target ?? settings({ theme: 'WHITE' }) };
  const api = vi.fn(async (url: string, method: string, body: any) => {
    if (url.endsWith('/app/settings.json')) {
      if (method === 'GET') return { ...copy(target.current), revision: String(revision) };
      if (url !== '/k/v1/preview/app/settings.json') throw new Error(`Unexpected write: ${url}`);
      if (body.revision !== String(revision)) throw { code: 'GAIA_CO02', message: 'revision mismatch' };
      revision += 1; return { revision: String(revision) };
    }
    if (url.endsWith('/app/form/fields.json') && method === 'GET') return { properties: copy(options.fields ?? {}), revision: String(revision) };
    throw new Error(`Unexpected endpoint: ${method} ${url}`);
  });
  vi.stubGlobal('kintone', { api });
  const writes = () => api.mock.calls.filter(([, method]) => method !== 'GET');
  return { api, writes };
}

describe('一般設定をプレビュー反映の経路で扱う', () => {
  afterEach(() => vi.unstubAllGlobals());
  const opts = (source: any, scopes = ['appSettings']) => ({ sourceAppId: '1', sourceBundle: { appId: '1', sections: { appSettings: source } }, targetAppId: '2', scopes });

  it('反映先のプレビュー設定を取得して PUT 計画を作る', async () => {
    const { api } = server();
    const preview = await previewReflectStandalone(opts(settings({ theme: 'RED' })), () => {});
    expect(preview.entries).toHaveLength(1);
    expect(preview.entries[0]).toMatchObject({ sectionKey: 'appSettings', label: '一般設定', status: 'change' });
    expect(preview.entries[0].operations[0]).toMatchObject({ method: 'PUT', endpoint: '/app/settings.json' });
    expect(api.mock.calls.map(([url]) => url)).toContain('/k/v1/preview/app/settings.json');
    expect(api.mock.calls.every(([, method]) => method === 'GET')).toBe(true);
  });
  it('revision 付きで /preview/app/settings.json へ PUT する', async () => {
    const { writes } = server({ revision: 42 });
    const o = opts(settings({ theme: 'RED' }));
    const preview = await previewReflectStandalone(o, () => {});
    const result = await runApplyPreviewStandalone({ ...o, reviewBaseline: preview.baseline }, () => {}, () => {});
    expect(result.sections).toEqual([{ sectionKey: 'appSettings', label: '一般設定', status: 'ok' }]);
    expect(writes()).toHaveLength(1);
    const [url, method, body] = writes()[0];
    expect([url, method]).toEqual(['/k/v1/preview/app/settings.json', 'PUT']);
    expect(body).toMatchObject({ app: '2', theme: 'RED', revision: '42' });
    for (const key of ['name', 'description', 'icon']) expect(body).not.toHaveProperty(key);
  });
  it('レコードのタイトルが反映先に無いフィールドを指すときは書き込まずに止める', async () => {
    const { writes } = server({ fields: { other: field('other') } });
    const o = opts(settings({ titleField: { selectionMode: 'MANUAL', code: 'subject' } }));
    const preview = await previewReflectStandalone(o, () => {});
    expect(preview.targetFieldCodes).toEqual(['other']);
    await expect(runApplyPreviewStandalone({ ...o, reviewBaseline: preview.baseline }, () => {}, () => {})).rejects.toThrow('参照するフィールド「subject」が反映先にありません');
    expect(writes()).toEqual([]);
  });
  it('フィールド設定も一緒に反映するときは、フィールドを先に書いてから一般設定を書く', async () => {
    const { api } = server({ fields: { other: field('other') } });
    const calls: string[] = [];
    api.mockImplementation(async (url: string, method: string, body: any) => {
      if (method !== 'GET') { calls.push(url); return { revision: String(Number(body.revision) + 1) }; }
      if (url.endsWith('/app/settings.json')) return { ...settings(), revision: '10' };
      if (url.endsWith('/app/form/fields.json')) return { properties: { other: field('other') }, revision: '10' };
      throw new Error(`Unexpected endpoint: ${url}`);
    });
    const o = { sourceAppId: '1', targetAppId: '2', scopes: ['appSettings', 'fieldSettings'], sourceBundle: { appId: '1', sections: {
      appSettings: settings({ titleField: { selectionMode: 'MANUAL', code: 'subject' } }),
      fieldSettings: { properties: { other: field('other'), subject: field('subject') } }
    } } };
    const preview = await previewReflectStandalone(o, () => {});
    expect(preview.entries.map(entry => entry.sectionKey)).toEqual(['fieldSettings', 'appSettings']);
    await runApplyPreviewStandalone({ ...o, reviewBaseline: preview.baseline }, () => {}, () => {});
    expect(calls).toEqual(['/k/v1/preview/app/form/fields.json', '/k/v1/preview/app/settings.json']);
  });
  it('実行順は REFLECT_SECTION_KEYS に従い、appSettings はフィールドとレイアウトの後・一覧の前になる', async () => {
    const { api } = server();
    api.mockImplementation(async (url: string) => {
      if (url.endsWith('/app/settings.json')) return { ...settings(), revision: '10' };
      if (url.endsWith('/app/views.json')) return { views: {}, revision: '10' };
      if (url.endsWith('/app/form/layout.json')) return { layout: [], revision: '10' };
      if (url.endsWith('/app/form/fields.json')) return { properties: {}, revision: '10' };
      throw new Error(`Unexpected endpoint: ${url}`);
    });
    const preview = await previewReflectStandalone({ sourceAppId: '1', targetAppId: '2', scopes: ['viewSettings', 'appSettings', 'layoutSettings', 'fieldSettings'], sourceBundle: { appId: '1', sections: {
      appSettings: settings(), fieldSettings: { properties: {} }, layoutSettings: { layout: [] }, viewSettings: { views: {} }
    } } }, () => {});
    expect(preview.entries.map(entry => entry.sectionKey)).toEqual(['fieldSettings', 'layoutSettings', 'appSettings', 'viewSettings']);
  });
  it('反映に対応していない項目は従来どおりエラーにする', async () => {
    server();
    await expect(previewReflectStandalone({ ...opts(settings()), scopes: ['appInfo'] }, () => {})).rejects.toThrow('反映に対応していない項目');
    await expect(previewReflectStandalone({ ...opts(settings()), scopes: [] }, () => {})).rejects.toThrow('反映する項目を選択');
  });
  it('listReflectFieldCodes は反映先のフィールド検査に使える', () => {
    expect(listReflectFieldCodes({ sections: { fieldSettings: { properties: { a: field('a') } } } })).toEqual(['a']);
  });
});
