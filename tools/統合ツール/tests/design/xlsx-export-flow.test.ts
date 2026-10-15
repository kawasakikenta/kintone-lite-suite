import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { runAdvancedDesignExporter, toManifestTargets } from '../../src/tabs/design-xlsx';

type Sheet = { __aoa: any[][]; [key: string]: any };

function fakeElement(): any {
  return {
    style: {}, innerHTML: '', textContent: '', dataset: {},
    appendChild() {}, removeChild() {}, remove() {}, click() {}, setAttribute() {},
    addEventListener() {}, querySelector: () => null, querySelectorAll: () => []
  };
}

function installEnvironment(responses: Record<string, any>) {
  const calls: string[] = [];
  const api: any = vi.fn(async (url: string) => {
    calls.push(url);
    const key = Object.keys(responses).find((k) => url.endsWith(k));
    if (!key) throw new Error(`unexpected request: ${url}`);
    const value = responses[key];
    if (value instanceof Error) throw value;
    return value;
  });
  api.url = vi.fn((path: string) => path);
  const xlsx = {
    utils: {
      book_new: () => ({ SheetNames: [] as string[], Sheets: {} as Record<string, Sheet> }),
      aoa_to_sheet: (aoa: any[][]): Sheet => ({ __aoa: aoa }),
      book_append_sheet: (wb: any, ws: Sheet, name: string) => { wb.SheetNames.push(name); wb.Sheets[name] = ws; }
    },
    write: () => new Uint8Array()
  };
  vi.stubGlobal('kintone', { api, getLoginUser: () => ({ name: 'tester' }) });
  vi.stubGlobal('XLSX', xlsx);
  vi.stubGlobal('window', { XLSX: xlsx, getComputedStyle: () => ({ zIndex: '1' }), __kusBatchCancel: false });
  vi.stubGlobal('document', {
    getElementById: () => null,
    createElement: fakeElement,
    body: fakeElement(),
    head: fakeElement()
  });
  return { api, calls };
}

const ALL_SHEETS = new Set(['summary', 'fields', 'dependencies', 'views']);
const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});

afterEach(() => { vi.unstubAllGlobals(); });
beforeEach(() => { consoleWarn.mockClear(); });

function baseResponses(overrides: Record<string, any> = {}): Record<string, any> {
  return {
    '/app.json': { name: 'テスト', description: '' },
    '/app/settings.json': { revision: '1' },
    '/app/form/fields.json': { properties: {
      金額: { code: '金額', label: '金額', type: 'NUMBER' },
      合計金額: { code: '合計金額', label: '合計金額', type: 'NUMBER' }
    } },
    '/app/form/layout.json': { layout: [] },
    '/records.json': { totalCount: '3' },
    '/app/views.json': { views: { 高額: { type: 'LIST', index: '0', fields: ['合計金額'], filterCond: '合計金額 > 100' } } },
    '/app/reports.json': { reports: {} },
    '/app/status.json': { enable: false, states: null, actions: null },
    '/app/acl.json': { rights: [] },
    '/record/acl.json': { rights: [] },
    '/field/acl.json': { rights: [] },
    '/app/customize.json': { desktop: { js: [], css: [] }, mobile: { js: [], css: [] } },
    '/app/actions.json': { actions: {} },
    '/app/plugins.json': { plugins: [] },
    '/app/adminNotes.json': { content: '' },
    '/app/webhook.json': { webhooks: [] },
    '/app/notifications/general.json': { notifications: [] },
    '/app/notifications/perRecord.json': { notifications: [] },
    '/app/notifications/reminder.json': { notifications: [] },
    ...overrides
  };
}

describe('runAdvancedDesignExporter の取得先', () => {
  it('既定は本番 API だけを使い、空欄のゲストIDでは kintone.api.url にゲスト検出させない', async () => {
    const { calls, api } = installEnvironment(baseResponses());
    await runAdvancedDesignExporter({ appId: '5', preselectedSheets: ALL_SHEETS, returnWorkbook: true, suppressToast: true });
    expect(calls.length).toBeGreaterThan(10);
    expect(calls.some((url) => url.includes('/preview/'))).toBe(false);
    expect(calls).toContain('/k/v1/app/form/fields.json');
    expect(calls).toContain('/k/v1/app/actions.json');
    expect(api.url.mock.calls.every(([, detect]: [string, boolean]) => detect === false)).toBe(true);
  });

  it('preview 指定ではフォーム・一覧・権限などをプレビュー API で取得し、app.json と records.json は本番のまま', async () => {
    const { calls } = installEnvironment(baseResponses());
    await runAdvancedDesignExporter({ appId: '5', preview: true, preselectedSheets: ALL_SHEETS, returnWorkbook: true, suppressToast: true });
    expect(calls).toContain('/k/v1/preview/app/form/fields.json');
    expect(calls).toContain('/k/v1/preview/app/form/layout.json');
    expect(calls).toContain('/k/v1/preview/app/views.json');
    expect(calls).toContain('/k/v1/preview/app/actions.json');
    expect(calls).toContain('/k/v1/app.json');
    expect(calls).toContain('/k/v1/records.json');
    expect(calls.filter((url) => url.endsWith('/app.json') || url.endsWith('/records.json')).every((url) => !url.includes('/preview/'))).toBe(true);
  });

  it('ゲストスペースでは本番・プレビューとも /k/guest/{id}/v1 配下を呼ぶ', async () => {
    const { calls } = installEnvironment(baseResponses());
    await runAdvancedDesignExporter({ appId: '5', guestId: '7', preview: true, preselectedSheets: ALL_SHEETS, returnWorkbook: true, suppressToast: true });
    expect(calls).toContain('/k/guest/7/v1/preview/app/form/fields.json');
    expect(calls).toContain('/k/guest/7/v1/app.json');
    expect(calls.every((url) => url.startsWith('/k/guest/7/v1/'))).toBe(true);
  });
});

describe('runAdvancedDesignExporter の取得失敗の扱い', () => {
  it('API 取得に失敗した項目は結果に残し、サマリーシートの失敗レポートにも載せる', async () => {
    installEnvironment(baseResponses({ '/app/views.json': new Error('403 権限なし') }));
    vi.useFakeTimers();
    const promise = runAdvancedDesignExporter({ appId: '5', preselectedSheets: ALL_SHEETS, returnWorkbook: true, suppressToast: true });
    await vi.runAllTimersAsync();
    const result: any = await promise;
    vi.useRealTimers();
    expect(result.failedAPIs).toEqual([{ name: 'Views', error: '403 権限なし' }]);
    const summary: any[][] = result.wb.Sheets['サマリー'].__aoa;
    expect(summary.some((row) => row[0] === 'Views' && row[1] === '403 権限なし')).toBe(true);
  });

  it('設定JSONに無いセクションは空の設計書にせず取得失敗として報告する', async () => {
    const { calls } = installEnvironment({});
    const bundle = {
      appId: '5', guestId: '', preview: false,
      sections: {
        appInfo: { name: 'JSON由来' },
        fieldSettings: { properties: { x: { code: 'x', label: 'X', type: 'SINGLE_LINE_TEXT' } } },
        layoutSettings: { _fetchError: '403' }
      }
    };
    const result: any = await runAdvancedDesignExporter({ appId: '5', bundle, preselectedSheets: ALL_SHEETS, returnWorkbook: true, suppressToast: true });
    expect(calls).toEqual([]);
    const names = result.failedAPIs.map((f: any) => f.name);
    expect(names).toContain('Layout（設定JSON）');
    expect(names).toContain('Views（設定JSON）');
    expect(result.failedAPIs.find((f: any) => f.name === 'Layout（設定JSON）').error).toBe('403');
    expect(result.failedAPIs.find((f: any) => f.name === 'Views（設定JSON）').error).toMatch(/含まれていません/);
    // フィールド・レイアウトの2回目取得などで同じセクションを重複して報告しない
    expect(new Set(names).size).toBe(names.length);
  });

  it('Webhook を取得できなかった場合は0件ではなく(取得不可)と書く', async () => {
    installEnvironment(baseResponses({ '/app/webhook.json': new Error('404') }));
    vi.useFakeTimers();
    const promise = runAdvancedDesignExporter({ appId: '5', preselectedSheets: ALL_SHEETS, returnWorkbook: true, suppressToast: true });
    await vi.runAllTimersAsync();
    const result: any = await promise;
    vi.useRealTimers();
    const summary: any[][] = result.wb.Sheets['サマリー'].__aoa;
    expect(summary.find((row) => row[0] === 'Webhook数')).toEqual(['Webhook数', '(取得不可)']);
  });
});

describe('ZIP のマニフェスト', () => {
  it('対象一覧に設定JSONの中身を入れず、取得元の種別だけ残す', () => {
    const bundle = { appId: '2', sections: { fieldSettings: { properties: { secret: { label: '機微な設定' } } } } };
    const targets = toManifestTargets([{ appId: '1', guestId: '', bundle: null }, { appId: '2', guestId: '3', bundle }]);
    expect(targets).toEqual([
      { appId: '1', guestId: '', source: 'api' },
      { appId: '2', guestId: '3', source: 'settings-json' }
    ]);
    expect(JSON.stringify(targets)).not.toContain('機微な設定');
  });
});

describe('フィールド依存関係シート', () => {
  it('日本語コードの部分一致では被参照にしない', async () => {
    installEnvironment(baseResponses());
    const result: any = await runAdvancedDesignExporter({ appId: '5', preselectedSheets: new Set(['dependencies']), returnWorkbook: true, suppressToast: true });
    const rows: any[][] = result.wb.Sheets['フィールド依存関係'].__aoa;
    const used = rows.filter((row) => row[3] === '被参照').map((row) => row[2]);
    expect(used).toEqual(['合計金額']);
    const viewRef = rows.find((row) => row[3] === '一覧絞込');
    expect(viewRef?.[4]).toBe('合計金額');
  });
});
