import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readZip } from '../archive/zip-reader';
import { runAdvancedDesignExporter, runBatchDesignExportXlsxZip } from '../../src/tabs/design-xlsx';
import { buildDesignAiMarkdown } from '../../src/design/ai-markdown';
import { stripSensitiveSupplements } from '../../src/design/sanitize';
import { compactDesignDiff, buildDesignDiffReport, DESIGN_DIFF_CONTEXT_LINES } from '../../src/tabs/design-standalone';

// 同梱の xlsx-js-style の代わりに、各テストが用意した記録用の偽物（globalThis.XLSX）を渡す。
vi.mock('../../src/tabs/sheetLib', () => ({ loadSheetLib: async () => (globalThis as any).XLSX }));

// 業務アプリに近い設定の通し検証（tools/test-harness/settings-design-explore.cjs）で見つかった問題の再現。

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
      book_new: () => ({ SheetNames: [] as string[], Sheets: {} as Record<string, any> }),
      aoa_to_sheet: (aoa: any[][]) => ({ __aoa: aoa }),
      book_append_sheet: (wb: any, ws: any, name: string) => { wb.SheetNames.push(name); wb.Sheets[name] = ws; }
    },
    write: () => new Uint8Array()
  };
  vi.stubGlobal('kintone', { api, getLoginUser: () => ({ name: 'tester' }) });
  vi.stubGlobal('XLSX', xlsx);
  vi.stubGlobal('window', { XLSX: xlsx, getComputedStyle: () => ({ zIndex: '1' }), __kusBatchCancel: false });
  vi.stubGlobal('document', { getElementById: () => null, createElement: fakeElement, body: fakeElement(), head: fakeElement() });
  return { api, calls };
}

const ALL_SHEETS = new Set(['summary', 'fields', 'dependencies', 'views']);
const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });
beforeEach(() => { consoleWarn.mockClear(); });

function responses(overrides: Record<string, any> = {}): Record<string, any> {
  return {
    '/app.json': { name: '案件管理', description: '' },
    '/app/settings.json': { revision: '1' },
    // 実際の kintone と同じく、レイアウトのグループ（GROUP）はコードだけを持ち、表示名はフィールド設定の label にある。
    '/app/form/fields.json': { properties: {
      grp_basic: { type: 'GROUP', code: 'grp_basic', label: '案件情報', noLabel: false, openGroup: true },
      deal_title: { type: 'SINGLE_LINE_TEXT', code: 'deal_title', label: '案件名' },
      grp_money: { type: 'GROUP', code: 'grp_money', label: '金額', noLabel: false, openGroup: true },
      amount: { type: 'NUMBER', code: 'amount', label: '見込金額' }
    } },
    '/app/form/layout.json': { layout: [
      { type: 'GROUP', code: 'grp_basic', layout: [{ type: 'ROW', fields: [{ type: 'SINGLE_LINE_TEXT', code: 'deal_title', size: { width: '200' } }] }] },
      { type: 'GROUP', code: 'grp_money', layout: [{ type: 'ROW', fields: [{ type: 'NUMBER', code: 'amount', size: { width: '200' } }] }] }
    ] },
    '/records.json': { totalCount: '3' },
    '/app/views.json': { views: {} },
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

describe('設計書 Excel の項目定義シート', () => {
  it('グループの名前（フィールド設定の label）を出す。コードで置き換えない', async () => {
    installEnvironment(responses());
    const result: any = await runAdvancedDesignExporter({ appId: '5', preselectedSheets: ALL_SHEETS, returnWorkbook: true, suppressToast: true });
    const rows: any[][] = result.wb.Sheets['項目定義'].__aoa;
    const group = rows.find((row) => row[3] === 'grp_basic')!;
    expect(group[2]).toBe('案件情報');
    // 所属グループの列も、コードでなく表示名にする
    const child = rows.find((row) => row[3] === 'deal_title')!;
    expect(child[1]).toBe('案件情報');
    expect(rows.find((row) => row[3] === 'amount')![1]).toBe('金額');
    // 項目一覧シートと同じ表示名になる
    const index: any[][] = result.wb.Sheets['項目一覧'].__aoa;
    expect(index.find((row) => row[4] === 'deal_title')![1]).toBe('案件情報');
  });
});

describe('設計書 Excel の列挙値の表示名', () => {
  it('kintone が返す AVERAGE（平均）と ANY（作業者の選び方）を日本語にする', async () => {
    installEnvironment(responses({
      '/app/reports.json': { reports: { 平均単価: { chartType: 'BAR', chartMode: 'NORMAL', name: '平均単価', index: '0', groups: [{ code: 'deal_title' }], aggregations: [{ type: 'AVERAGE', code: 'amount' }, { type: 'SUM', code: 'amount' }], filterCond: '', sort: 'GROUP1_ASC', periodicReport: null } } },
      '/app/status.json': { enable: true, states: { 未着手: { name: '未着手', index: '0', assignee: { type: 'ONE', entities: [] } }, 承認待ち: { name: '承認待ち', index: '1', assignee: { type: 'ANY', entities: [] } } }, actions: [{ name: '申請', from: '未着手', to: '承認待ち', filterCond: '' }] }
    }));
    const result: any = await runAdvancedDesignExporter({ appId: '5', preselectedSheets: new Set(['summary', 'fields', 'reports', 'status']), returnWorkbook: true, suppressToast: true });
    const graph = result.wb.Sheets['グラフ'].__aoa.flat().join('\n');
    expect(graph).toContain('平均（amount）');
    expect(graph).not.toContain('AVERAGE');
    const process = result.wb.Sheets['プロセス管理'].__aoa.flat().join('\n');
    expect(process).toContain('候補の誰でも（先着）');
    expect(process).not.toMatch(/(^|\n)ANY(\n|$)/);
  });
});

describe('複数アプリの設計書 ZIP の記録', () => {
  const run = async (preview: boolean | undefined, appName = '案件管理') => {
    installEnvironment(responses({ '/app.json': { name: appName, description: '' } }));
    const names: string[] = [];
    const blobs: Blob[] = [];
    vi.stubGlobal('URL', { createObjectURL: (blob: Blob) => { blobs.push(blob); return 'blob:fake'; }, revokeObjectURL: () => {} });
    const anchor = fakeElement();
    (globalThis as any).document.createElement = () => { anchor.click = () => { names.push(anchor.download); }; return anchor; };
    await runBatchDesignExportXlsxZip({ apps: [{ appId: '5', guestId: '' }], ...(preview === undefined ? {} : { preview }), preselectedSheets: ['summary', 'fields'] });
    const zipEntries: Record<string, string> = Object.fromEntries(readZip(Buffer.from(await blobs[0].arrayBuffer())).map((entry) => [entry.name, entry.data.toString('utf8')]));
    return { zipEntries, names };
  };

  it('取得環境を manifest に残し、プレビューのときは ZIP の名前にも付ける', async () => {
    const live = await run(false);
    expect(JSON.parse(live.zipEntries['_manifest.json'])).toMatchObject({ preview: false, environment: 'production' });
    expect(live.zipEntries['_manifest.txt']).toContain('取得環境: 本番（運用中の設定）');
    expect(live.names.some((name) => /^kintone設計書_1件_\d/.test(name))).toBe(true);
    const preview = await run(true);
    expect(JSON.parse(preview.zipEntries['_manifest.json'])).toMatchObject({ preview: true, environment: 'preview' });
    expect(preview.zipEntries['_manifest.txt']).toContain('取得環境: プレビュー（未公開の設定）');
    expect(preview.names.some((name) => /^kintone設計書_1件_プレビュー_\d/.test(name))).toBe(true);
  });

  it('アプリ名に改行があっても manifest.txt の 1 行に収める', async () => {
    const { zipEntries } = await run(false, '長い名前\n改行入り');
    const line = String(zipEntries['_manifest.txt']).split('\n').find((text) => text.includes('App 5'))!;
    expect(line).toContain('(長い名前 改行入り)');
  });
});

describe('設計書（Markdown・AI向けMarkdown）に機微な補助情報を載せない', () => {
  const bundle = () => ({
    appId: '1', guestId: '', preview: false, fetchedAt: '2026-11-01T00:00:00.000Z', meta: { sectionRevisions: {} },
    sections: {
      appSettings: { name: '案件管理' },
      pluginSettings: { plugins: [{ id: 'p1', name: 'カレンダー', enabled: true, _config: { apiToken: 'sk-live-SECRET' } }, { id: 'p2', name: '通知', enabled: false }] },
      customizeSettings: { scope: 'ALL', desktop: { js: [
        { type: 'URL', url: 'https://cdn.example.com/a.js' },
        { type: 'FILE', file: { fileKey: 'k1', name: 'core.js', size: '10' }, _bodyText: 'const TOKEN = "tok_live_SECRET";', _bodyHash: 'abc' }
      ], css: [] }, mobile: { js: [], css: [] } }
    }
  });

  it('stripSensitiveSupplements はプラグインの設定値と JS/CSS 本文だけを除き、入力を変更しない', () => {
    const input = bundle();
    const before = JSON.stringify(input);
    const result = stripSensitiveSupplements(input);
    expect(result).toMatchObject({ pluginConfigs: 1, customizeBodies: 1 });
    expect(JSON.stringify(result.bundle)).not.toContain('SECRET');
    expect((result.bundle as any).sections.pluginSettings.plugins).toEqual([{ id: 'p1', name: 'カレンダー', enabled: true }, { id: 'p2', name: '通知', enabled: false }]);
    expect((result.bundle as any).sections.customizeSettings.desktop.js[1]).toEqual({ type: 'FILE', file: { fileKey: 'k1', name: 'core.js', size: '10' } });
    expect(JSON.stringify(input)).toBe(before);
    // 除くものが無ければ同じ参照を返す
    const clean = { sections: { pluginSettings: { plugins: [{ id: 'p' }] } } };
    expect(stripSensitiveSupplements(clean).bundle).toBe(clean);
  });

  it('AI向けMarkdown は設定JSON由来の値を含めず、除いたことを書く', () => {
    const md = buildDesignAiMarkdown(bundle());
    expect(md).not.toContain('SECRET');
    expect(md).not.toContain('_config');
    expect(md).toContain('## 除外した補助情報');
    expect(md).toContain('プラグインの設定値（1件）');
    expect(md).toContain('JS/CSSファイルの本文（1件）');
    expect(md).toContain('カレンダー');
    expect(buildDesignAiMarkdown({ ...bundle(), sections: { appSettings: { name: 'x' } } })).not.toContain('## 除外した補助情報');
  });
});

describe('設計書の差分レポートは変更の前後だけを残す', () => {
  const body = (n: number, prefix: string) => Array.from({ length: n }, (_, i) => `  ${prefix}${i}`);
  const diff = [
    '  ## アプリ設定', ...body(20, 'a'), '- | 名前 | 旧 |', '+ | 名前 | 新 |', ...body(20, 'b'),
    '  ## フィールド設定', ...body(30, 'c'), '+ | memo | メモ |', ...body(30, 'd'),
    '  ## 一覧', ...body(5, 'e')
  ].join('\n');

  it('変更行の前後 3 行だけを残し、離れた変更の前にセクション名と省略した行数を示す', () => {
    const out = compactDesignDiff(diff).split('\n');
    expect(out.length).toBeLessThan(40);
    expect(out).toContain('- | 名前 | 旧 |');
    expect(out).toContain('+ | memo | メモ |');
    const first = out.findIndex((line) => line.startsWith('@@'));
    expect(out[first]).toBe('@@ アプリ設定（省略 18 行）@@');
    expect(out.filter((line) => line.startsWith('@@ フィールド設定'))).toHaveLength(1);
    expect(out[out.length - 1]).toMatch(/^@@ 以降の \d+ 行は変更なし @@$/);
    // 変更行の前後は DESIGN_DIFF_CONTEXT_LINES 行
    const at = out.indexOf('- | 名前 | 旧 |');
    expect(out.slice(at - DESIGN_DIFF_CONTEXT_LINES, at).every((line) => line.startsWith('  a'))).toBe(true);
  });

  it('変更が無い、または全体が文脈に収まるときは、そのまま返す', () => {
    const unchanged = ['  # 同一', '  ## A', '  x'].join('\n');
    expect(compactDesignDiff(unchanged)).toBe(unchanged);
    const small = ['  # t', '- a', '+ b', '  c'].join('\n');
    expect(compactDesignDiff(small)).toBe(small);
  });

  it('レポートの集計は全体の差分から数え、本文だけ省略し、その旨を見方に書く', () => {
    const md = buildDesignDiffReport({ diff, generatedAt: '2026-11-09 22:00:00',
      source: { appId: '1', appName: '', guestId: '', environment: '本番（運用中）' },
      target: { appId: '2', appName: '', guestId: '', environment: '本番（運用中）' } });
    expect(md).toContain('| 差分行数 | 追加 2 行 / 削除 1 行 |');
    expect(md).toContain('変更のない行は、変更の前後 3 行を除いて省略しています');
    expect(md).toContain('@@ フィールド設定（省略');
    expect(md.split('\n').length).toBeLessThan(80);
  });
});
