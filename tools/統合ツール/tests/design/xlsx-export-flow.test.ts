import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readZip } from '../archive/zip-reader';
import { clampCellText, getExporterDialogZIndex, readableErrorMessage, runAdvancedDesignExporter, runBatchDesignExportXlsxZip, toManifestTargets } from '../../src/tabs/design-xlsx';
import { beginRun, endRun, isRunCancelledError, requestCancel } from '../../src/runControl';

// 同梱の xlsx-js-style の代わりに、各テストが用意した記録用の偽物（globalThis.XLSX）を渡す。
vi.mock('../../src/tabs/sheetLib', () => ({ loadSheetLib: async () => (globalThis as any).XLSX }));

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

afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });
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
    '/app/notifications/general.json': { notifications: [] },
    '/app/notifications/perRecord.json': { notifications: [] },
    '/app/notifications/reminder.json': { notifications: [] },
    '/form.json': { properties: [] },
    '/app/categories.json': { enabled: false, categories: [] },
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
    expect(result.failedAPIs).toEqual([{ name: 'ビュー設定', error: '403 権限なし' }]);
    const summary: any[][] = result.wb.Sheets['サマリー'].__aoa;
    expect(summary.some((row) => row[0] === 'ビュー設定' && row[1] === '403 権限なし')).toBe(true);
  });

  it('取得失敗の項目名は内部名（Fields / RecordCount など）でなく日本語の表示名で報告する', async () => {
    installEnvironment(baseResponses({
      '/app/form/fields.json': new Error('403'),
      '/records.json': new Error('500'),
      '/app/adminNotes.json': new Error('403')
    }));
    vi.useFakeTimers();
    const promise = runAdvancedDesignExporter({ appId: '5', preselectedSheets: ALL_SHEETS, returnWorkbook: true, suppressToast: true });
    await vi.runAllTimersAsync();
    const result: any = await promise;
    vi.useRealTimers();
    const names = result.failedAPIs.map((f: any) => f.name);
    expect(names).toEqual(expect.arrayContaining(['フィールド設定', 'レコード件数', '管理者メモ']));
    expect(names.some((name: string) => /^[A-Za-z]+$/.test(name))).toBe(false);
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
    expect(names).toContain('レイアウト設定（設定JSON）');
    expect(names).toContain('ビュー設定（設定JSON）');
    expect(result.failedAPIs.find((f: any) => f.name === 'レイアウト設定（設定JSON）').error).toBe('403');
    expect(result.failedAPIs.find((f: any) => f.name === 'ビュー設定（設定JSON）').error).toMatch(/含まれていません/);
    // フィールド・レイアウトの2回目取得などで同じセクションを重複して報告しない
    expect(new Set(names).size).toBe(names.length);
  });

  it('付随情報だけ失敗した設定JSONのセクションは、本体を使いつつ取得失敗として報告する', async () => {
    installEnvironment({});
    const bundle = {
      appId: '5', guestId: '', preview: false,
      sections: {
        appInfo: { name: 'JSON由来' },
        customizeSettings: {
          scope: 'ALL',
          desktop: { js: [{ type: 'URL', url: 'https://example.com/a.js' }], css: [] },
          mobile: { js: [], css: [] },
          _fetchError: 'JS/CSSファイル本文の取得に失敗'
        }
      }
    };
    const result: any = await runAdvancedDesignExporter({ appId: '5', bundle, preselectedSheets: new Set(['customize']), returnWorkbook: true, suppressToast: true });
    const rows: any[][] = result.wb.Sheets['JS_CSSカスタマイズ'].__aoa;
    expect(rows.some((row) => row.includes('https://example.com/a.js'))).toBe(true);
    expect(result.failedAPIs.some((f: any) => f.name === 'JS/CSS設定（設定JSON）' && /本文/.test(f.error))).toBe(true);
  });

  it('公開 API の無い Webhook は呼び出さず、対象外だと明記して完了扱いにする', async () => {
    const { calls } = installEnvironment(baseResponses({}));
    vi.useFakeTimers();
    const promise = runAdvancedDesignExporter({ appId: '5', preselectedSheets: ALL_SHEETS, returnWorkbook: true, suppressToast: true });
    await vi.runAllTimersAsync();
    const result: any = await promise;
    vi.useRealTimers();
    expect(JSON.stringify(calls)).not.toContain('webhook');
    expect(result.failedAPIs).toEqual([]);
    const summary: any[][] = result.wb.Sheets['サマリー'].__aoa;
    expect(summary.find((row) => row[0] === 'Webhook')?.[1]).toContain('対象外');
  });

  it('プロセス管理が無効で states が null でも未取得ではなく 0 件と書く', async () => {
    installEnvironment(baseResponses({}));
    vi.useFakeTimers();
    const promise = runAdvancedDesignExporter({ appId: '5', preselectedSheets: ALL_SHEETS, returnWorkbook: true, suppressToast: true });
    await vi.runAllTimersAsync();
    const result: any = await promise;
    vi.useRealTimers();
    const summary: any[][] = result.wb.Sheets['サマリー'].__aoa;
    expect(summary.find((row) => row[0] === 'ステータス数')?.[1]).toBe('0');
    expect(summary.find((row) => row[0] === 'アクション数(プロセス)')?.[1]).toBe('0');
  });

  it('シート選択ダイアログは lite パネルの裏に隠れない', () => {
    const panel = { style: { zIndex: '999999' } };
    vi.stubGlobal('document', { getElementById: () => null, querySelector: (selector: string) => (selector === '.kus-lp' ? panel : null) });
    vi.stubGlobal('window', { getComputedStyle: (element: any) => element.style });
    expect(Number(getExporterDialogZIndex())).toBeGreaterThan(999999);
    vi.unstubAllGlobals();
  });

  it('HTML のエラーページは全文を見せず状態だけを示す', () => {
    const page = '<!DOCTYPE html><html><body><ul><li><strong>Code:</strong> 404 Not Found</li></ul></body></html>';
    expect(readableErrorMessage(page)).toBe('サーバーがエラーページを返しました（404 Not Found）');
    expect(readableErrorMessage(new Error('権限がありません'))).toBe('権限がありません');
  });
});

describe('Excel のセル文字数上限', () => {
  it('上限を超える文字列だけを注記つきで切り詰める', () => {
    expect(clampCellText('短い')).toBe('短い');
    expect(clampCellText(12)).toBe(12);
    const exact = 'a'.repeat(32767);
    expect(clampCellText(exact)).toBe(exact);
    const clamped = clampCellText('a'.repeat(40000)) as string;
    expect(clamped.length).toBe(32767);
    expect(clamped.endsWith('省略）')).toBe(true);
  });

  it('長大な計算式があってもシートには上限内の文字列だけを渡す', async () => {
    installEnvironment(baseResponses({
      '/app/form/fields.json': { properties: { 長い式: { code: '長い式', label: '長い式', type: 'CALC', expression: 'A+'.repeat(30000) } } }
    }));
    const result: any = await runAdvancedDesignExporter({ appId: '5', preselectedSheets: new Set(['fields']), returnWorkbook: true, suppressToast: true });
    const rows: any[][] = result.wb.Sheets['項目定義'].__aoa;
    const cells = rows.flat().filter((v) => typeof v === 'string');
    expect(Math.max(...cells.map((v) => v.length))).toBeLessThanOrEqual(32767);
    expect(cells.some((v) => v.endsWith('省略）'))).toBe(true);
  });
});

describe('単体出力の中断', () => {
  it('取得中に中断ボタンが押されたら、ワークブックを作らず false を返す', async () => {
    const { api } = installEnvironment(baseResponses());
    const original = api.getMockImplementation()!;
    api.mockImplementation(async (url: string, ...rest: unknown[]) => {
      (globalThis as any).window.__kusBatchCancel = true;
      return original(url, ...rest);
    });
    const result = await runAdvancedDesignExporter({ appId: '5', preselectedSheets: ALL_SHEETS, suppressToast: true });
    expect(result).toBe(false);
  });

  it('前回の中断フラグが残っていても、新しい単体出力は中断扱いにならない', async () => {
    installEnvironment(baseResponses());
    (globalThis as any).window.__kusBatchCancel = true;
    const result = await runAdvancedDesignExporter({ appId: '5', preselectedSheets: ALL_SHEETS, suppressToast: true });
    expect(result).toBe(true);
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

describe('通知シート', () => {
  it('一般通知の「サブ組織含」を通知先に残す', async () => {
    installEnvironment(baseResponses({
      '/app/notifications/general.json': { notifications: [
        { entity: { type: 'ORGANIZATION', code: 'sales' }, includeSubs: true, recordAdded: true },
        { entity: { type: 'USER', code: 'u1' }, includeSubs: false, recordAdded: true }
      ] }
    }));
    const result: any = await runAdvancedDesignExporter({ appId: '5', preselectedSheets: new Set(['genNotif']), returnWorkbook: true, suppressToast: true });
    const rows: any[][] = result.wb.Sheets['通知(一般)'].__aoa;
    expect(rows.find((row) => String(row[1]).includes('sales'))?.[1]).toContain('(サブ組織含)');
    expect(rows.find((row) => String(row[1]).includes('u1'))?.[1]).not.toContain('サブ組織含');
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

describe('runBatchDesignExportXlsxZip の preview / preselectedSheets オプション', () => {
  it('preselectedSheets 指定時はシート選択ダイアログを表示せず、preview: true でプレビュー API から取得する', async () => {
    const { calls } = installEnvironment(baseResponses());
    // 実際の ZIP 実装で作られた Blob をダウンロード直前に受け取り、中身を読み戻して確かめる。
    const downloads: Blob[] = [];
    vi.stubGlobal('URL', {
      createObjectURL: (blob: Blob) => { downloads.push(blob); return 'blob:fake'; },
      revokeObjectURL: () => {}
    });

    const onFinish = vi.fn();
    const ok = await runBatchDesignExportXlsxZip({
      apps: [{ appId: '5', guestId: '' }],
      preview: true,
      preselectedSheets: ['summary', 'fields'],
      onFinish
    });

    expect(ok).toBe(true);
    expect(onFinish).toHaveBeenCalledWith(expect.objectContaining({
      total: 1,
      successCount: 1,
      failedCount: 0,
      cancelled: false
    }));
    expect(calls).toContain('/k/v1/preview/app/form/fields.json');
    expect(downloads).toHaveLength(1);
    const zipEntries = Object.fromEntries(readZip(Buffer.from(await downloads[0].arrayBuffer())).map((entry) => [entry.name, entry]));
    const names = Object.keys(zipEntries);
    expect(names).toHaveLength(3);
    expect(names).toEqual(expect.arrayContaining(['_manifest.json', '_manifest.txt']));
    expect(names.filter((name) => /^設計書_テスト\(app5\)_\d{8}_\d{6}\.xlsx$/.test(name))).toHaveLength(1);
    const manifest = JSON.parse(zipEntries['_manifest.json'].data.toString('utf8'));
    expect(manifest.successCount).toBe(1);
  });
});

describe('runAdvancedDesignExporter の再試行', () => {
  // kintone.api は失敗時に応答の JSON（code・message）で reject する。
  const kintoneError = (code: string, message: string, extra: Record<string, unknown> = {}) => Object.assign(new Error(message), { code, ...extra });

  async function runWith(responses: Record<string, any>) {
    const env = installEnvironment(baseResponses(responses));
    vi.useFakeTimers();
    const promise = runAdvancedDesignExporter({ appId: '5', preselectedSheets: new Set(['summary']), returnWorkbook: true, suppressToast: true });
    await vi.runAllTimersAsync();
    const result: any = await promise;
    vi.useRealTimers();
    return { ...env, result };
  }

  it('権限が無い・アプリが無いなど、やり直しても変わらない失敗は再試行しない', async () => {
    const { calls, result } = await runWith({
      '/app/views.json': kintoneError('CB_NO02', '権限がありません。'),
      '/app/reports.json': kintoneError('GAIA_AP01', '指定したアプリ（id: 5）が見つかりません。', { status: 404 })
    });
    expect(calls.filter((url) => url.endsWith('/app/views.json'))).toHaveLength(1);
    expect(calls.filter((url) => url.endsWith('/app/reports.json'))).toHaveLength(1);
    expect(result.failedAPIs.map((entry: any) => entry.name)).toEqual(expect.arrayContaining(['ビュー設定', 'グラフ設定']));
  });

  it('応答待ちの超過・通信失敗・混雑（429・5xx）は、差分比較・設定取得と同じく再試行する', async () => {
    const failures: Record<string, any[]> = {
      '/app/views.json': [kintoneError('TIMEOUT', '応答待ちが 120 秒を超えました（timeout）')],
      '/app/reports.json': [kintoneError('', 'Too Many Requests', { status: 429 }), kintoneError('', 'Service Unavailable', { status: 503 })]
    };
    const env = installEnvironment(baseResponses());
    const original = env.api.getMockImplementation()!;
    env.api.mockImplementation(async (url: string, method: string, params: any) => {
      const key = Object.keys(failures).find((suffix) => url.endsWith(suffix));
      if (key && failures[key].length) { env.calls.push(url); throw failures[key].shift(); }
      return original(url, method, params);
    });
    vi.useFakeTimers();
    const promise = runAdvancedDesignExporter({ appId: '5', preselectedSheets: new Set(['summary']), returnWorkbook: true, suppressToast: true });
    await vi.runAllTimersAsync();
    const result: any = await promise;
    vi.useRealTimers();
    expect(env.calls.filter((url) => url.endsWith('/app/views.json'))).toHaveLength(2);
    expect(env.calls.filter((url) => url.endsWith('/app/reports.json'))).toHaveLength(3);
    expect(result.failedAPIs).toEqual([]);
  });

  it('再試行の待ち時間に「中止」すると、待ち終わるのを待たずに止める', async () => {
    const env = installEnvironment(baseResponses({ '/app/views.json': kintoneError('', 'Service Unavailable', { status: 503 }) }));
    const token = beginRun();
    try {
      vi.useFakeTimers();
      const promise = runAdvancedDesignExporter({ appId: '5', preselectedSheets: new Set(['summary']), returnWorkbook: true, suppressToast: true });
      let outcome = '';
      promise.then(() => { outcome = 'resolved'; }, (error) => { outcome = isRunCancelledError(error) ? 'cancelled' : `error: ${error}`; });
      // 1 回目の失敗の後の待ち時間（1 秒）の途中で中止する
      await vi.advanceTimersByTimeAsync(10);
      expect(env.calls.filter((url) => url.endsWith('/app/views.json'))).toHaveLength(1);
      requestCancel(token);
      await vi.advanceTimersByTimeAsync(50);
      expect(outcome).toBe('cancelled');
      expect(env.calls.filter((url) => url.endsWith('/app/views.json'))).toHaveLength(1);
    } finally {
      vi.useRealTimers();
      endRun(token);
    }
  });
});

describe('runBatchDesignExportXlsxZip の失敗の数え方', () => {
  it('設定を 1 つも取得できなかったアプリ（存在しないアプリ）は、成功に数えず失敗として示す', async () => {
    const { api } = installEnvironment(baseResponses());
    const original = api.getMockImplementation()!;
    api.mockImplementation(async (url: string, method: string, params: any) => {
      if (String(params?.app ?? params?.id) === '999999') throw new Error('指定したアプリ（ID: 999999）が見つかりません。');
      return original(url, method, params);
    });
    const downloads: Blob[] = [];
    vi.stubGlobal('URL', { createObjectURL: (blob: Blob) => { downloads.push(blob); return 'blob:fake'; }, revokeObjectURL: () => {} });
    const onFinish = vi.fn();
    vi.useFakeTimers();
    const promise = runBatchDesignExportXlsxZip({ apps: [{ appId: '5', guestId: '' }, { appId: '999999', guestId: '' }], preselectedSheets: ['summary', 'fields'], onFinish });
    await vi.runAllTimersAsync();
    expect(await promise).toBe(true);
    vi.useRealTimers();
    expect(onFinish).toHaveBeenCalledWith(expect.objectContaining({
      total: 2, successCount: 1, failedCount: 1,
      failedApps: [{ appId: '999999', error: expect.stringContaining('見つかりません') }]
    }));
    const entries = Object.fromEntries(readZip(Buffer.from(await downloads[0].arrayBuffer())).map((entry) => [entry.name, entry]));
    const manifest = JSON.parse(entries['_manifest.json'].data.toString('utf8'));
    expect(manifest).toMatchObject({ successCount: 1, failedCount: 1 });
    expect(manifest.results.map((row: any) => [row.appId, row.ok])).toEqual([['5', true], ['999999', false]]);
    expect(Object.keys(entries).filter((name) => name.includes('999999'))).toEqual([]);
    expect(entries['_manifest.txt'].data.toString('utf8')).toContain('[NG] App 999999');
  });
});

describe('項目一覧シートの種別', () => {
  it('ルックアップは項目定義シートと同じく「ルックアップ(元の種類)」で示す', async () => {
    installEnvironment(baseResponses({
      '/app/form/fields.json': { properties: {
        顧客: { code: '顧客', label: '顧客', type: 'SINGLE_LINE_TEXT', lookup: { relatedApp: { app: '9' }, relatedKeyField: '名前', fieldMappings: [], lookupPickerFields: [], filterCond: '', sort: '' } },
        金額: { code: '金額', label: '金額', type: 'NUMBER' }
      } }
    }));
    const result: any = await runAdvancedDesignExporter({ appId: '5', preselectedSheets: new Set(['fields']), returnWorkbook: true, suppressToast: true });
    const index: any[][] = result.wb.Sheets['項目一覧'].__aoa;
    expect(index.find((row) => row[4] === '顧客')?.[5]).toBe('ルックアップ(文字列(1行))');
    expect(index.find((row) => row[4] === '金額')?.[5]).toBe('数値');
    const detail: any[][] = result.wb.Sheets['項目定義'].__aoa;
    expect(detail.flat()).toContain('ルックアップ(文字列(1行))');
  });

  it('小数点以下の表示桁数が空（指定なし）なら、書式に「小数点: 桁」を出さない', async () => {
    installEnvironment(baseResponses({
      '/app/form/fields.json': { properties: {
        金額: { code: '金額', label: '金額', type: 'NUMBER', digit: true, displayScale: '', unit: '円', unitPosition: 'AFTER' },
        率: { code: '率', label: '率', type: 'NUMBER', digit: false, displayScale: '2' }
      } }
    }));
    const result: any = await runAdvancedDesignExporter({ appId: '5', preselectedSheets: new Set(['fields']), returnWorkbook: true, suppressToast: true });
    const cells = (result.wb.Sheets['項目定義'].__aoa as any[][]).flat().filter((value) => typeof value === 'string');
    expect(cells.some((value) => value.includes('小数点: 桁'))).toBe(false);
    expect(cells.some((value) => value.includes('桁区切り: あり') && value.includes('単位: 円'))).toBe(true);
    expect(cells.some((value) => value.includes('小数点: 2桁'))).toBe(true);
  });
});

describe('設計書 Excel: 取得できなかった件数', () => {
  it('権限を取得できなかったとき、サマリーのレビュー観点に「null件」と書かず未取得と書く', async () => {
    installEnvironment(baseResponses({ '/app/acl.json': new Error('403'), '/record/acl.json': new Error('403'), '/field/acl.json': new Error('403') }));
    vi.useFakeTimers();
    const promise = runAdvancedDesignExporter({ appId: '5', preselectedSheets: new Set(['summary']), returnWorkbook: true, suppressToast: true });
    await vi.runAllTimersAsync();
    const result: any = await promise;
    vi.useRealTimers();
    const summary: any[][] = result.wb.Sheets['サマリー'].__aoa;
    expect(summary.find((row) => row[0] === '権限')?.[1]).toBe('アプリ 未取得件 / レコード 未取得件 / フィールド 未取得件');
    expect(summary.flat().join('\n')).not.toContain('null件');
  });
});
