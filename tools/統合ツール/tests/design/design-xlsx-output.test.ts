import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { runAdvancedDesignExporter } from '../../src/tabs/design-xlsx';

type FakeSheet = Record<string, any>;

function colName(column: number): string {
  let value = column;
  let result = '';
  while (value > 0) {
    const remainder = (value - 1) % 26;
    result = String.fromCharCode(65 + remainder) + result;
    value = Math.floor((value - 1) / 26);
  }
  return result;
}

function makeXlsxStub() {
  return {
    utils: {
      book_new: () => ({ SheetNames: [] as string[], Sheets: {} as Record<string, FakeSheet> }),
      aoa_to_sheet: (aoa: any[][]) => {
        const sheet: FakeSheet = {};
        let maxColumns = 0;
        aoa.forEach((row, rowIndex) => {
          maxColumns = Math.max(maxColumns, row.length);
          row.forEach((value, columnIndex) => {
            const address = `${colName(columnIndex + 1)}${rowIndex + 1}`;
            sheet[address] = { v: value, t: typeof value === 'number' ? 'n' : 's' };
          });
        });
        sheet['!ref'] = `A1:${colName(maxColumns || 1)}${Math.max(1, aoa.length)}`;
        return sheet;
      },
      book_append_sheet: (workbook: any, sheet: FakeSheet, name: string) => {
        workbook.SheetNames.push(name);
        workbook.Sheets[name] = sheet;
      }
    }
  };
}

function makeElement() {
  const element: any = {
    id: '',
    style: {},
    innerHTML: '',
    parentNode: null,
    children: [] as any[],
    appendChild(child: any) {
      child.parentNode = element;
      element.children.push(child);
      return child;
    },
    removeChild(child: any) {
      element.children = element.children.filter((item: any) => item !== child);
      child.parentNode = null;
      return child;
    },
    addEventListener() {},
    removeEventListener() {},
    querySelector() { return null; },
    querySelectorAll() { return []; }
  };
  return element;
}

function installBrowserStubs(api: (path: string, method: string, params: any) => any) {
  const body = makeElement();
  const head = makeElement();
  const documentStub: any = {
    body,
    head,
    createElement: () => makeElement(),
    getElementById: () => null,
    addEventListener() {},
    removeEventListener() {}
  };
  const xlsx = makeXlsxStub();
  const windowStub: any = {
    XLSX: xlsx,
    getComputedStyle: () => ({ zIndex: '0' }),
    setTimeout,
    clearTimeout
  };
  (globalThis as any).window = windowStub;
  (globalThis as any).document = documentStub;
  (globalThis as any).XLSX = xlsx;
  (globalThis as any).kintone = {
    api,
    api: Object.assign(api, { url: (path: string) => path }),
    getLoginUser: () => ({ name: 'テストユーザー' })
  };
  return { xlsx, documentStub };
}

function makeBundle() {
  const properties: Record<string, any> = {};
  for (let i = 0; i < 207; i += 1) {
    const code = `field_${String(i).padStart(3, '0')}`;
    properties[code] = {
      code,
      label: `項目${i + 1}`,
      type: i === 0 ? 'GROUP' : i === 1 ? 'SUBTABLE' : i === 2 ? 'STATUS' : i === 3 ? 'CATEGORY' : 'SINGLE_LINE_TEXT',
      required: i % 5 === 0
    };
  }
  properties.field_001.fields = Object.fromEntries(Array.from({ length: 60 }, (_, i) => {
    const code = `child_${String(i).padStart(3, '0')}`;
    return [code, { code, label: `子項目${i + 1}`, type: 'SINGLE_LINE_TEXT' }];
  }));

  const emptySections: Record<string, any> = {
    appSettings: { name: '大容量テストアプリ', description: '説明' },
    appInfo: { name: '大容量テストアプリ' },
    fieldSettings: { properties },
    layoutSettings: {
      layout: [
        { type: 'ROW', fields: [{ type: 'GROUP', code: 'field_000', label: '基本情報', layout: [] }] },
        { type: 'ROW', fields: [{ type: 'SUBTABLE', code: 'field_001' }] }
      ]
    },
    viewSettings: { views: {} },
    reportSettings: { _fetchError: 'レポート権限不足' },
    processSettings: { _fetchError: 'ステータス権限不足' },
    pluginSettings: { plugins: [] },
    customizeSettings: { _partial: { message: '本文未取得' }, desktop: { js: [], css: [] }, mobile: { js: [], css: [] } },
    actionSettings: { actions: [] },
    appAcl: { rights: [] },
    fieldAcl: { rights: [] },
    recordPermissions: { rights: [] },
    notifications: { notifications: [] },
    perRecordNotifications: { notifications: [] },
    reminderNotifications: { notifications: [] },
    categories: { categories: [] },
    formSettings: {}
  };
  return {
    appId: 9100,
    guestId: '77',
    preview: true,
    fetchedAt: '2026-09-26T00:00:00.000Z',
    sections: emptySections
  };
}

function allCellValues(sheet: FakeSheet): any[] {
  return Object.keys(sheet)
    .filter((key) => !key.startsWith('!'))
    .map((key) => sheet[key]?.v);
}

afterEach(() => {
  delete (globalThis as any).window;
  delete (globalThis as any).document;
  delete (globalThis as any).XLSX;
  delete (globalThis as any).kintone;
});

describe('design xlsx output', () => {
  it('keeps the recursive field index, detail links, and explicit missing/failed states', async () => {
    const apiCalls: string[] = [];
    const completions: any[] = [];
    installBrowserStubs((path) => {
      apiCalls.push(path);
      throw new Error(`unexpected API call: ${path}`);
    });

    const bundle = makeBundle();
    const result: any = await runAdvancedDesignExporter({
      bundle,
      appId: 1234,
      appNameLookup: {},
      preselectedSheets: new Set(['summary', 'fields', 'dependencies']),
      returnWorkbook: true,
      suppressToast: true,
      fieldTypeExclusion: new Set(),
      onComplete: (summary: any) => completions.push(summary)
    });

    expect(apiCalls).toEqual([]);
    expect(result.appId).toBe(9100);
    expect(completions).toHaveLength(1);
    expect(completions[0]).toMatchObject({
      source: 'bundle',
      complete: false,
      incompleteSectionCount: 3,
      fetchErrorSectionCount: 2,
      partialSectionCount: 1,
      supplementalMissingCount: 3,
      supplementalIncompleteCount: 3
    });
    expect(result.completionSummary).toEqual(completions[0]);
    expect(result.wb.SheetNames).toContain('取得状況');
    expect(result.wb.SheetNames).toContain('項目一覧');
    expect(result.wb.SheetNames).toContain('項目定義');

    const indexSheet = result.wb.Sheets['項目一覧'];
    const indexCodes = Array.from({ length: 267 }, (_, i) => indexSheet[`E${i + 3}`]?.v);
    expect(indexCodes).toHaveLength(267);
    expect(new Set(indexCodes).size).toBe(267);
    expect(indexCodes).toContain('field_002');
    expect(indexCodes).toContain('child_059');
    expect(indexSheet['!autofilter']).toEqual({ ref: 'A2:H269' });
    expect(Object.keys(indexSheet).some((key) => indexSheet[key]?.l?.Target?.includes("'項目定義'!A"))).toBe(true);

    const statusValues = allCellValues(result.wb.Sheets['取得状況']);
    expect(statusValues).toContain('未取得');
    expect(statusValues).toContain('取得失敗');
    expect(statusValues).toContain('部分取得');
    expect(statusValues).toContain('空（0件）');
    expect(statusValues).toContain('2026-09-26T00:00:00.000Z');
    expect(statusValues).toContain('設定JSON（プレビュー）');
    expect(statusValues.some((value) => String(value).includes('システム項目=2（項目定義シートでは除外）'))).toBe(true);
    expect(result.failedAPIs).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'グラフ設定', error: expect.stringContaining('レポート権限不足') })
    ]));

    const summaryValues = allCellValues(result.wb.Sheets['サマリー']);
    expect(summaryValues).toContain('267');
    expect(summaryValues).toContain('未取得');
    expect(summaryValues).toContain('未取得/不明');
    expect(summaryValues).toContain('部分取得');
  });

  it('renders the process matrix from state keys and string/array action endpoints', async () => {
    installBrowserStubs(() => {
      throw new Error('bundle output must not call the API');
    });
    const bundle: any = makeBundle();
    bundle.sections.processSettings = {
      enable: true,
      states: {
        Draft: { index: 0 },
        Review: { index: 1 },
        Done: { index: 2 }
      },
      actions: [
        { name: '提出', from: ['Draft'], to: 'Review' },
        { name: '再提出', from: 'Draft', to: ['Review'] },
        { name: '差戻し', from: ['Review'], to: ['Draft'] },
        { name: '完了', from: 'Review', to: 'Done' },
        { name: '保留', from: [], to: [] }
      ]
    };

    const result: any = await runAdvancedDesignExporter({
      bundle,
      appId: 9100,
      preselectedSheets: new Set(['status', 'statusMatrix']),
      returnWorkbook: true,
      suppressToast: true,
      fieldTypeExclusion: new Set()
    });

    const processSheet = result.wb.Sheets['プロセス管理'];
    expect(processSheet.B11?.v).toBe('Draft');
    expect(processSheet.E11?.v).toBe('1');
    expect(processSheet.F11?.v).toBe('2');
    expect(processSheet.B12?.v).toBe('Review');
    expect(processSheet.E12?.v).toBe('2');
    expect(processSheet.F12?.v).toBe('2');
    expect(processSheet.B13?.v).toBe('Done');
    expect(processSheet.E13?.v).toBe('1');
    expect(processSheet.F13?.v).toBe('0');
    expect(processSheet.C17?.v).toBe('Draft');
    expect(processSheet.D17?.v).toBe('Review');
    expect(processSheet.C19?.v).toBe('Review');
    expect(processSheet.D19?.v).toBe('Draft');
    expect(processSheet.C21?.v).toBe('-');
    expect(processSheet.D21?.v).toBe('-');

    const matrixSheet = result.wb.Sheets['遷移マトリクス'];
    expect(matrixSheet.B2?.v).toBe('Draft');
    expect(matrixSheet.C2?.v).toBe('Review');
    expect(matrixSheet.D2?.v).toBe('Done');
    expect(matrixSheet.A3?.v).toBe('Draft');
    expect(matrixSheet.C3?.v).toBe('提出\n再提出');
    expect(matrixSheet.A4?.v).toBe('Review');
    expect(matrixSheet.B4?.v).toBe('差戻し');
    expect(matrixSheet.D4?.v).toBe('完了');
    expect(matrixSheet.A5?.v).toBe('Done');
  });

  it('uses one consistent preview/prod endpoint choice in live mode', async () => {
    const apiCalls: string[] = [];
    const completions: any[] = [];
    installBrowserStubs((path) => {
      apiCalls.push(path);
      if (path.includes('/records.json')) return { totalCount: 0 };
      if (path.includes('/form/fields.json')) return { properties: {} };
      if (path.includes('/form/layout.json')) return { layout: [] };
      if (path.includes('/views.json')) return { views: {} };
      if (path.includes('/reports.json')) return { reports: {} };
      if (path.includes('/status.json')) return { enable: false, states: {}, actions: [] };
      if (path.includes('/plugins.json')) return { plugins: [] };
      if (path.includes('/actions.json')) return { actions: [] };
      if (path.includes('/customize.json')) return { desktop: { js: [], css: [] }, mobile: { js: [], css: [] } };
      if (path.includes('/acl.json') || path.includes('/field/acl.json') || path.includes('/record/acl.json')) return { rights: [] };
      if (path.includes('/notifications/')) return { notifications: [] };
      if (path.includes('/webhook.json')) return { webhooks: [] };
      if (path.includes('/adminNotes.json')) return { content: '' };
      if (path.includes('/categories.json')) return { categories: [] };
      if (path.endsWith('/form.json')) return { revision: '1' };
      if (path.endsWith('/app.json')) return { name: 'ライブアプリ' };
      return {};
    });

    await runAdvancedDesignExporter({
      appId: 9100,
      guestId: '77',
      preview: true,
      preselectedSheets: new Set(['summary']),
      returnWorkbook: true,
      suppressToast: true,
      fieldTypeExclusion: new Set(),
      onComplete: (summary: any) => completions.push(summary)
    });

    expect(completions).toHaveLength(1);
    expect(completions[0]).toMatchObject({ source: 'live', complete: true, incompleteSectionCount: 0, supplementalMissingCount: 0, supplementalIncompleteCount: 0 });
    expect(apiCalls.filter((path) => path.includes('/form/fields.json'))).toEqual([
      '/k/guest/77/v1/preview/app/form/fields.json'
    ]);
    expect(apiCalls.filter((path) => path.includes('/form/layout.json'))).toEqual([
      '/k/guest/77/v1/preview/app/form/layout.json'
    ]);
    expect(apiCalls).toContain('/k/guest/77/v1/app.json');
    expect(apiCalls).toContain('/k/guest/77/v1/records.json');
    expect(apiCalls).toContain('/k/guest/77/v1/app/adminNotes.json');
    expect(apiCalls).toContain('/k/guest/77/v1/app/webhook.json');
    expect(apiCalls).not.toContain('/k/guest/77/v1/preview/app.json');
    expect(apiCalls).not.toContain('/k/guest/77/v1/app/form/fields.json');
    expect(apiCalls).not.toContain('/k/guest/77/v1/app/form/layout.json');
  });

  it('keeps an empty preselection as a cancellation before workbook creation', async () => {
    const completions: any[] = [];
    installBrowserStubs(() => ({ properties: {} }));
    await expect(runAdvancedDesignExporter({
      appId: 9100,
      preselectedSheets: new Set(),
      returnWorkbook: true,
      suppressToast: true,
      onComplete: (summary: any) => completions.push(summary)
    })).resolves.toBe(false);
    expect(completions).toEqual([]);
  });

  it('does not invent environment, guest, or capture time when imported metadata is absent', async () => {
    const bundle: any = makeBundle();
    delete bundle.guestId;
    delete bundle.preview;
    delete bundle.fetchedAt;
    installBrowserStubs(() => {
      throw new Error('bundle output must not call the API');
    });

    const result: any = await runAdvancedDesignExporter({
      bundle,
      appId: 9100,
      preselectedSheets: new Set(['summary']),
      returnWorkbook: true,
      suppressToast: true,
      fieldTypeExclusion: new Set()
    });
    const statusValues = allCellValues(result.wb.Sheets['取得状況']);
    expect(statusValues).toContain('不明（設定JSONに記載なし）');
    expect(allCellValues(result.wb.Sheets['サマリー']).some((value) => String(value).includes('ゲストスペース: 不明（設定JSONに記載なし）'))).toBe(true);
  });
});
