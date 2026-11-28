import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildHTML, crawl } from '../src/tabs/er';
import { downloadBlob, downloadText } from '../src/utils';
import { runSettingsExportStandalone } from '../src/tabs/settings-export-standalone';
import { readSettingsZip } from '../src/settingsZipImport';
import { analyzeErDependencies } from '../src/tabs/er-analysis';
import { buildErModelFromOfflineSource, buildErOfflineSource, listOfflineSpaceApps } from '../src/tabs/er-offline';
import { runExportERDiagramHtmlStandalone, runExportERMarkdownStandalone, runExportERMermaidStandalone, runExportERRelationsCsvStandalone } from '../src/tabs/er-standalone';

// 設定取得で保存した設定JSON・ZIP から、kintone に問い合わせずに ER図を作る。
// 設定取得（実際の fetchBundle）と ER図の取得（実際の getSchema）は、同じ合成 kintone（kintone.api）を読む。
vi.mock('../src/tabs/er', async original => ({
  ...await original<typeof import('../src/tabs/er')>(),
  progressUi: { init: vi.fn(), update: vi.fn(), close: vi.fn(), dismiss: vi.fn(), error: vi.fn() }
}));
vi.mock('../src/utils', async original => ({
  ...await original<typeof import('../src/utils')>(),
  downloadText: vi.fn(), downloadBlob: vi.fn(), selectedScopeKeys: () => ['appInfo', 'fieldSettings', 'actionSettings']
}));

const text = (code: string, label: string, extra: Record<string, unknown> = {}) => ({ type: 'SINGLE_LINE_TEXT', code, label, required: false, unique: false, ...extra });
const lookup = (code: string, label: string, app: string, key: string, mappings: Array<[string, string]> = []) => ({
  type: 'SINGLE_LINE_TEXT', code, label, required: false,
  lookup: { relatedApp: { app, code: '' }, relatedKeyField: key, fieldMappings: mappings.map(([field, relatedField]) => ({ field, relatedField })), lookupPickerFields: [], filterCond: '', sort: '' }
});
// 顧客(1) ← 案件(2) → 見積(3)。見積は商品マスタ(9) を参照するが、設定は保存していない。請求(4) は案件を参照する（逆引きでだけ見つかる）。
const WORLD: Record<string, { name: string; spaceId: string | null; properties: Record<string, any>; actions: Record<string, any> }> = {
  1: { name: '顧客マスタ', spaceId: '7', actions: {}, properties: { cust_code: text('cust_code', '顧客コード', { unique: true, required: true }), cust_name: text('cust_name', '顧客名') } },
  2: { name: '案件', spaceId: '7', actions: {}, properties: {
    deal_no: { type: 'RECORD_NUMBER', code: 'deal_no', label: '案件番号' },
    customer: lookup('customer', '顧客', '1', 'cust_code', [['customer_name', 'cust_name']]),
    customer_name: text('customer_name', '顧客名'),
    quotes: { type: 'REFERENCE_TABLE', code: 'quotes', label: '見積一覧', referenceTable: { relatedApp: { app: '3', code: '' }, condition: { field: 'deal_no', relatedField: 'deal' }, displayFields: ['amount'], filterCond: 'amount > 0', sort: '' } }
  } },
  3: { name: '見積', spaceId: null, properties: { deal: lookup('deal', '案件', '2', 'deal_no'), product: lookup('product', '商品', '9', 'sku'), amount: { type: 'NUMBER', code: 'amount', label: '金額' } },
    actions: { 受注へ: { name: '受注へ', destApp: { app: '2', code: '' }, mappings: [{ srcType: 'FIELD', srcField: 'amount', destField: 'deal_no' }], entities: [], filterCond: '' } } },
  4: { name: '請求', spaceId: null, actions: {}, properties: { deal: lookup('deal', '案件', '2', 'deal_no') } }
};

function installKintone() {
  const api = vi.fn(async (path: string, _method: string, params: any) => {
    const resource = path.replace(/^\/k(?:\/guest\/\d+)?\/v1(?:\/preview)?/, '');
    if (resource === '/apps.json') return { apps: Object.entries(WORLD).map(([appId, app]) => ({ appId, name: app.name })) };
    const id = String(params?.app ?? params?.id);
    const app = WORLD[id];
    if (!app) throw new Error(`GAIA_AP01 指定したアプリ（id: ${id}）が見つかりません。`);
    if (resource === '/app.json') return { appId: id, code: '', name: app.name, description: '', spaceId: app.spaceId, threadId: app.spaceId ? '1' : null, createdAt: '2026-01-01T00:00:00Z', modifiedAt: '2026-11-01T00:00:00Z' };
    if (resource === '/app/form/fields.json') return { properties: JSON.parse(JSON.stringify(app.properties)), revision: '5' };
    if (resource === '/app/actions.json') return { actions: JSON.parse(JSON.stringify(app.actions)), revision: '2' };
    throw new Error(`unexpected ${resource}`);
  });
  vi.stubGlobal('kintone', { api: Object.assign(api, { url: (p: string) => p }) });
  return api;
}

const crawlOptions = (extra: Record<string, unknown> = {}) => ({ maxDepth: 0, includeReverseLookup: false, sleepMs: 1, includeSubtableFields: true, source: { guestId: '', preview: false }, ...extra });
/**
 * kintone から読んだモデルと比べる形にする。設定取得は応答の作成日時・更新日時を保存せず、キーを並べ替えて保存するため、
 * 作成日時・更新日時を除き、項目と関連をコードの順に並べてから比べる（項目の並びはフィールドコードの順になる）。
 */
const canonical = (apps: any[]) => apps.map(({ createdAt: _c, modifiedAt: _m, ...rest }) => {
  const byPath = (a: any, b: any) => String(a.path).localeCompare(String(b.path));
  const relKey = (rel: any) => [rel.kind, rel.controlField || rel.fromLabel || rel.from, rel.toApp].join('|');
  return {
    ...rest,
    fields: rest.fields.slice().sort(byPath),
    allFields: rest.allFields.slice().sort(byPath),
    relations: rest.relations.map(({ from, ...rel }: any) => ({ ...rel, from: rel.kind === 'ACTION' ? '' : from })).sort((a: any, b: any) => relKey(a).localeCompare(relKey(b)))
  };
});

async function exportSettingsJson(appIds: string[]): Promise<any> {
  await runSettingsExportStandalone('json', { apps: appIds.map((appId) => ({ appId })), scopeRoot: {} }, vi.fn());
  const call = vi.mocked(downloadText).mock.calls.at(-1)!;
  return JSON.parse(String(call[1]));
}

beforeEach(() => { vi.clearAllMocks(); });
afterEach(() => { vi.unstubAllGlobals(); });

describe('ER図: 設定JSON・ZIP から作る', () => {
  it('設定取得で保存した JSON から、kintone から読み取ったときと同じモデルを作り、kintone に問い合わせない', async () => {
    const api = installKintone();
    const saved = await exportSettingsJson(['1', '2', '3', '4']);
    const online = await crawl(['2'], crawlOptions());
    api.mockClear();
    const source = buildErOfflineSource(saved, '設定一括取得.json');
    const offline = await crawl(['2'], crawlOptions({ offlineSource: source }));
    expect(api).not.toHaveBeenCalled();
    expect(offline.map((app: any) => app.id)).toEqual([2, 1, 3]);
    // kintone から読むと、存在しない商品マスタ(9) は「取得失敗」のアプリになる。設定JSONからは図に入れない（未取得の参照先）
    expect(online.find((app: any) => app.id === 9)).toMatchObject({ status: 'failed' });
    expect(canonical(offline)).toEqual(canonical(online.filter((app: any) => app.id !== 9)));
    // ルックアップのコピー対応・関連レコード一覧の表示項目と絞り込み・アクションのコピー対応も残る
    const deal = offline.find((app: any) => app.id === 2);
    expect(deal.relations.map((rel: any) => [rel.kind, rel.toApp])).toEqual([['LOOKUP', 1], ['REF', 3]]);
    expect(deal.relations[0].copyFields).toEqual([{ from: 'cust_name', to: 'customer_name' }]);
    expect(deal.relations[1]).toMatchObject({ displayFields: ['amount'], filterCond: 'amount > 0', fromLabel: '案件番号' });
    expect(offline.find((app: any) => app.id === 3).relations.find((rel: any) => rel.kind === 'ACTION')).toMatchObject({ toApp: 2, copyFields: [{ from: 'amount', to: 'deal_no' }] });
    // 保存していない商品マスタ(9) は図に入れず、「未取得の参照先」になる
    expect(offline.some((app: any) => app.id === 9)).toBe(false);
    expect(analyzeErDependencies(offline).unresolvedTargets).toEqual([expect.objectContaining({ fromAppId: '3', toAppId: '9', reason: 'outside-diagram' })]);
  });

  it('設定取得の ZIP も同じように読み、逆引きは読み込んだアプリの中から探す（全アプリの一覧を取得しない）', async () => {
    const api = installKintone();
    await runSettingsExportStandalone('zip', { apps: ['1', '2', '3', '4'].map((appId) => ({ appId })), scopeRoot: {} }, vi.fn());
    const blob = vi.mocked(downloadBlob).mock.calls.at(-1)![1] as Blob;
    const zip = await readSettingsZip(new Uint8Array(await blob.arrayBuffer()));
    const source = buildErOfflineSource(zip.raw, '設定一括取得.zip');
    expect(source.appIds).toEqual([1, 2, 3, 4]);
    api.mockClear();
    const options: any = crawlOptions({ offlineSource: source, includeReverseLookup: true });
    const apps = await crawl(['1'], options);
    expect(api).not.toHaveBeenCalled();
    expect(apps.map((app: any) => [app.id, app.depth])).toEqual([[1, 0], [2, 1], [3, 2], [4, 2]]);
    expect(options.reverseScan).toEqual({ total: 4, incomplete: [] });
  });

  it('設定に無いセクションは理由を付けて示す（フィールド設定が無ければ取得失敗、アプリ情報・アクションが無ければ一部取得）', () => {
    const source = buildErOfflineSource({ apps: [
      { appId: '1', sections: { appInfo: { name: '項目なし' }, actionSettings: { actions: {} } } },
      { appId: '2', sections: { fieldSettings: { properties: { a: text('a', 'A') } }, appInfo: { name: 'アクションなし' } } },
      { appId: '3', sections: { fieldSettings: { _fetchError: '権限がありません（CB_NO02）' }, appInfo: { name: '取得失敗' }, actionSettings: { actions: {} } } },
      { appId: '4', sections: { fieldSettings: { properties: { a: text('a', 'A') } }, actionSettings: { actions: {} } } }
    ] }, 'x.json');
    expect(source.warnings).toEqual([expect.stringContaining('1アプリの設定にフィールド設定が含まれていない')]);
    const [noFields, noActions, failed, noInfo] = [1, 2, 3, 4].map((id) => buildErModelFromOfflineSource(source, id)!);
    expect(noFields).toMatchObject({ status: 'failed', ok: false, name: '項目なし' });
    expect(noFields.issues[0].message).toContain('読み込んだ設定JSONにフィールド設定が含まれていません');
    expect(noActions).toMatchObject({ status: 'partial', ok: true });
    expect(noActions.issues).toEqual([expect.objectContaining({ scope: 'actions', message: '読み込んだ設定JSONにアクション設定が含まれていません' })]);
    expect(failed).toMatchObject({ status: 'failed' });
    expect(failed.issues[0].message).toBe('権限がありません（CB_NO02）');
    expect(noInfo.issues).toEqual([expect.objectContaining({ scope: 'metadata', message: '読み込んだ設定JSONにアプリ情報が含まれていません' })]);
    expect(buildErModelFromOfflineSource(source, 99)).toBeNull();
  });

  it('アプリIDの無い設定・重複を注意に出し、取得環境と取得日時の範囲をまとめる', () => {
    const source = buildErOfflineSource({ apps: [
      { appId: '', sections: {} },
      { appId: '5', guestId: '3', preview: true, fetchedAt: '2026-11-21T00:00:00.000Z', sections: { fieldSettings: { properties: {} } } },
      { appId: '6', guestId: '', preview: true, fetchedAt: '2026-11-20T01:39:00.000Z', sections: { fieldSettings: { properties: {} } } },
      { appId: '5', guestId: '3', preview: true, fetchedAt: '2026-11-22T00:00:00.000Z', sections: { fieldSettings: { properties: {} } } }
    ] }, 'mix.json');
    expect(source.appIds).toEqual([5, 6]);
    expect(source.warnings).toEqual(['アプリIDの無い設定 1件は読み込めませんでした', '同じアプリIDが複数あったため後の設定を使用しました（App 5）']);
    expect(source).toMatchObject({ guestId: '', preview: true, connectionText: '通常空間・ゲストスペースが混在 / プレビュー', fetchedAtFrom: '2026-11-20T01:39:00.000Z', fetchedAtTo: '2026-11-22T00:00:00.000Z' });
    expect(() => buildErOfflineSource({ apps: [{ appId: 'x', sections: {} }] })).toThrow(/アプリIDのある設定が見つかりません/);
    expect(() => buildErOfflineSource({ foo: 1 })).toThrow(/設定JSON内にアプリ設定バンドルが見つかりません/);
  });

  it('生成した HTML の見出しに「設定JSONから作成（取得日時）」を出し、いま開いている kintone のホストは出さない', async () => {
    installKintone();
    const saved = await exportSettingsJson(['1', '2']);
    saved.apps[0].fetchedAt = '2026-11-20T01:39:00.000Z';
    saved.apps[1].fetchedAt = '2026-11-21T00:05:00.000Z';
    const source = buildErOfflineSource(saved, '顧客まわり.json');
    vi.stubGlobal('location', { host: 'other-tenant.cybozu.com' });
    const apps = await crawl(['1', '2'], crawlOptions({ offlineSource: source }));
    const html = buildHTML(apps, { ...crawlOptions(), startAppIds: ['1', '2'], offlineSource: source, source: { guestId: source.guestId, preview: source.preview } });
    const p = (n: number) => String(n).padStart(2, '0');
    const fmt = (iso: string) => { const d = new Date(iso); return `${d.getFullYear()}/${p(d.getMonth() + 1)}/${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`; };
    const label = `設定JSONから作成（${fmt('2026-11-20T01:39:00.000Z')}〜${fmt('2026-11-21T00:05:00.000Z')} 取得）`;
    expect(html).toContain(`<span class="brand-meta" title="${label} · 通常空間 / 本番">${label} · 通常空間 / 本番</span>`);
    expect(html).toContain('設定JSON「顧客まわり.json」（2アプリ。kintone には問い合わせていません）');
    expect(html).toContain(`"sourceLabel":"${label}"`);
    expect(html).toContain('"generatedAt":"2026-11-20T01:39:00.000Z"');
    expect(html).not.toContain('other-tenant.cybozu.com');
    // kintone から読んだ図は従来どおり（ホストを出し、取得元の行は無い）
    const onlineHtml = buildHTML(apps, { ...crawlOptions(), startAppIds: ['1'] });
    expect(onlineHtml).toContain('other-tenant.cybozu.com');
    expect(onlineHtml).not.toContain('"sourceLabel":');
    expect(onlineHtml).not.toContain('設定JSONから作成');
  });

  it('パネルの保存: kintone に問い合わせずに保存し、起点が読み込んだ中に無ければ止める', async () => {
    const api = installKintone();
    const saved = await exportSettingsJson(['1', '2', '3']);
    const source = buildErOfflineSource(saved, '保存.json');
    api.mockClear();
    const setStatus = vi.fn();
    await runExportERDiagramHtmlStandalone({ appId: '2', appIds: ['2'], guestId: '', preview: true, offlineSource: source }, setStatus);
    expect(api).not.toHaveBeenCalled();
    const [filename, html] = vi.mocked(downloadText).mock.calls.at(-1)!;
    // 取得環境は読み込んだ設定のとおり（プレビューの指定は使わない）
    expect(String(filename)).toMatch(/本番/);
    expect(String(html)).toContain('設定JSONから作成');
    expect(String(setStatus.mock.calls.at(-1)![0])).toContain('設定JSON「保存.json」から作成（kintone には問い合わせていません）');
    await expect(runExportERDiagramHtmlStandalone({ appId: '2, 8', appIds: ['2', '8'], offlineSource: source }, vi.fn()))
      .rejects.toThrow('起点アプリ 8 は、読み込んだ設定JSONにありません');
    const md = await runExportERMarkdownStandalone({ appId: '1', appIds: ['1'], offlineSource: source }, vi.fn());
    expect(md.markdown).toMatch(/- 取得元: 設定JSON「保存\.json」から作成（.* 取得。kintone には問い合わせていません）/);
    expect(api).not.toHaveBeenCalled();
  });

  it('スペースIDは、読み込んだ設定のアプリ情報から探す', async () => {
    const api = installKintone();
    const saved = await exportSettingsJson(['1', '2', '3', '4']);
    const source = buildErOfflineSource(saved, 's.json');
    expect(listOfflineSpaceApps(source, '7')).toEqual([{ appId: '1', name: '顧客マスタ' }, { appId: '2', name: '案件' }]);
    api.mockClear();
    await runExportERDiagramHtmlStandalone({ appId: '', appIds: [], spaceId: '7', maxDepth: '1', offlineSource: source }, vi.fn());
    expect(api).not.toHaveBeenCalled();
    const html = String(vi.mocked(downloadText).mock.calls.at(-1)![1]);
    expect(html).toContain('"spaceAppIds":["1","2"]');
    expect(html).toContain('"startAppIds":["1","2"]');
  });

  // lite-suite だけの出力（Mermaid・関連一覧 CSV）も同じ。ファイル名の取得環境は、パネルの指定ではなく読み込んだ設定のとおりにする
  it('Mermaid・関連一覧 CSV も設定JSONから作り、ファイル名の取得環境は読み込んだ設定のとおりにする', async () => {
    const api = installKintone();
    const saved = await exportSettingsJson(['1', '2', '3']);
    for (const app of saved.apps) app.preview = true;
    const source = buildErOfflineSource(saved, 'プレビュー.json');
    expect(source.connectionText).toBe('通常空間 / プレビュー');
    api.mockClear();
    const setStatus = vi.fn();
    const mermaid = await runExportERMermaidStandalone({ appId: '2', appIds: ['2'], preview: false, offlineSource: source }, setStatus);
    expect(mermaid.mermaid).toContain('erDiagram');
    expect(mermaid.apps.map((app: any) => String(app.id)).sort()).toEqual(['1', '2', '3']);
    expect(String(vi.mocked(downloadText).mock.calls.at(-1)![0])).toMatch(/プレビュー/);
    expect(String(setStatus.mock.calls.at(-1)![0])).toContain('設定JSON「プレビュー.json」から作成（kintone には問い合わせていません）');
    const csv = await runExportERRelationsCsvStandalone({ appId: '3', appIds: ['3'], maxDepth: '1', offlineSource: source }, vi.fn());
    expect(csv.apps.map((app: any) => String(app.id)).sort()).toEqual(['2', '3']);
    expect(csv.csv).toContain('見積');
    expect(api).not.toHaveBeenCalled();
  });
});
