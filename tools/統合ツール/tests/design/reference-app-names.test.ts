import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { bundleToMarkdown } from '../../src/diff/export';
import { fetchBundle } from '../../src/api';
import { downloadText } from '../../src/utils';
import {
  collectReferencedAppIds,
  resolveReferencedAppNames,
  runBatchDesignExportMdZipStandalone,
  runDesignExportStandalone
} from '../../src/tabs/design-standalone';

const zipFiles: Record<string, string> = {};

vi.mock('../../src/api', async (importOriginal) => ({
  ...await importOriginal<typeof import('../../src/api')>(),
  fetchBundle: vi.fn()
}));

vi.mock('../../src/utils', async (importOriginal) => ({
  ...await importOriginal<typeof import('../../src/utils')>(),
  downloadBlob: vi.fn(),
  downloadText: vi.fn()
}));

vi.mock('../../src/jszipLoader', () => ({
  loadJSZipLite: vi.fn(async () => class FakeJSZip {
    file(name: string, content: string) { zipFiles[name] = content; }
    async generateAsync() { return new Blob(['zip']); }
  })
}));

// 受注アプリ: 顧客マスタ（302）へのルックアップ、テーブル内の商品マスタ（303）へのルックアップ、
// 請求（304）の関連レコード一覧、出荷（305）へのアクション。
function orderBundle(appId = '301', guestId = '') {
  return {
    appId,
    guestId,
    preview: false,
    fetchedAt: '2026-11-01T00:00:00.000Z',
    sections: {
      appSettings: { name: '受注' },
      fieldSettings: { properties: {
        customer: { code: 'customer', label: '顧客', type: 'SINGLE_LINE_TEXT', lookup: { relatedApp: { app: '302', code: '' }, relatedKeyField: 'code', fieldMappings: [{ field: 'customer_name', relatedField: 'name' }] } },
        items: { code: 'items', label: '明細', type: 'SUBTABLE', fields: {
          product: { code: 'product', label: '商品', type: 'SINGLE_LINE_TEXT', lookup: { relatedApp: { app: '303', code: '' }, relatedKeyField: 'sku', fieldMappings: [] } }
        } },
        invoices: { code: 'invoices', label: '請求', type: 'REFERENCE_TABLE', referenceTable: { relatedApp: { app: '304', code: '' }, condition: { field: 'order_no', relatedField: 'order_no' }, displayFields: ['amount'], size: '5' } }
      } },
      actionSettings: { actions: { 出荷を作成: { name: '出荷を作成', index: '0', destApp: { app: '305', code: '' }, mappings: [], entities: [], filterCond: '' } } }
    }
  };
}

describe('設計書 Markdown の参照先アプリ名', () => {
  it('名前が分かる参照先は「名前（App ID）」、分からない参照先は「App ID」で示す', () => {
    const markdown = bundleToMarkdown(orderBundle(), { appNames: { 302: '顧客マスタ', 303: '商品 | マスタ', 305: '出荷' } });
    expect(markdown).toContain('ルックアップ: 顧客マスタ（App 302）');
    expect(markdown).toContain('ルックアップ: 商品 \\| マスタ（App 303）');
    expect(markdown).toContain('関連レコード: App 304');
    expect(markdown).toContain('| 出荷を作成 | 0 | 出荷（App 305） |');
  });

  it('名前を渡さなければ、これまでどおり App ID だけで示す', () => {
    const markdown = bundleToMarkdown(orderBundle());
    expect(markdown).toContain('ルックアップ: App 302');
    expect(markdown).toContain('| 出荷を作成 | 0 | App 305 |');
  });

  it('参照先のアプリIDを、テーブル内のフィールドとアクションを含めて集める', () => {
    expect(collectReferencedAppIds(orderBundle()).sort()).toEqual(['302', '303', '304', '305']);
    expect(collectReferencedAppIds({ sections: { fieldSettings: { _fetchError: '403' } } })).toEqual([]);
  });
});

describe('参照先アプリ名の解決', () => {
  const calls: Array<{ url: string; params: any }> = [];
  beforeEach(() => {
    calls.length = 0;
    vi.stubGlobal('kintone', {
      api: vi.fn(async (url: string, _method: string, params: any) => {
        calls.push({ url, params });
        if (params.id === '304') throw Object.assign(new Error('権限がありません。'), { code: 'CB_NO02' });
        return { name: ({ 302: '顧客マスタ', 303: '商品マスタ', 305: '出荷' } as any)[params.id] };
      })
    });
  });
  afterEach(() => { vi.unstubAllGlobals(); });

  it('kintone から作るときは、足りない名前だけを読み取り（GET）で引き、読めない参照先は名前を入れない', async () => {
    const names = await resolveReferencedAppNames(orderBundle('301', '7'), { known: { '302::7': '顧客（JSON）' }, live: true, guestId: '7' });
    expect(calls.map((call) => [call.url, call.params.id]).sort()).toEqual([
      ['/k/guest/7/v1/app.json', '303'], ['/k/guest/7/v1/app.json', '304'], ['/k/guest/7/v1/app.json', '305']
    ]);
    expect(names).toMatchObject({ '302::7': '顧客（JSON）', '303::7': '商品マスタ', '305::7': '出荷' });
    expect(names['304']).toBeUndefined();
  });

  it('設定JSONから作るときは kintone に問い合わせない', async () => {
    const names = await resolveReferencedAppNames(orderBundle(), { known: { 302: '顧客マスタ' }, live: false });
    expect(calls).toEqual([]);
    expect(names).toEqual({ 302: '顧客マスタ' });
  });

  it('一括出力では、読み取った名前（読めなかったことも含む）をアプリをまたいで使い回す', async () => {
    const cache = new Map<string, string | null>();
    await resolveReferencedAppNames(orderBundle('301'), { live: true, cache });
    await resolveReferencedAppNames(orderBundle('311'), { live: true, cache });
    expect(calls).toHaveLength(4);
  });

  it('Markdown 設計書の保存で、参照先アプリの名前を出す', async () => {
    vi.mocked(fetchBundle).mockResolvedValue(orderBundle() as any);
    await runDesignExportStandalone('md', { appId: '301', guestId: '', preview: false }, () => {});
    const markdown = String(vi.mocked(downloadText).mock.calls.at(-1)?.[1] || '');
    expect(markdown).toContain('ルックアップ: 顧客マスタ（App 302）');
    expect(markdown).toContain('ルックアップ: 商品マスタ（App 303）');
    expect(markdown).toContain('関連レコード: App 304');
  });

  it('設定JSONの Markdown ZIP では、同じ ZIP のアプリの名前を使い、kintone には問い合わせない', async () => {
    const customer = { appId: '302', guestId: '', preview: false, sections: { appSettings: { name: '顧客マスタ' }, fieldSettings: { properties: {} } } };
    await runBatchDesignExportMdZipStandalone({
      apps: [{ appId: '301', bundle: orderBundle() }, { appId: '302', bundle: customer }],
      format: 'md',
      appNameLookup: { 305: '出荷' }
    }, () => {});
    expect(calls).toEqual([]);
    const orderMd = Object.entries(zipFiles).find(([name]) => name.includes('受注'))?.[1] || '';
    expect(orderMd).toContain('ルックアップ: 顧客マスタ（App 302）');
    expect(orderMd).toContain('ルックアップ: App 303');
    expect(orderMd).toContain('| 出荷を作成 | 0 | 出荷（App 305） |');
  });
});
