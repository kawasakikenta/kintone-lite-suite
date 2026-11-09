import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PLUGIN_CONFIG_OMITTED_KIND, PLUGIN_CONFIG_OMITTED_MESSAGE, markPluginConfigOmitted } from '../../src/pluginConfigMarker';
import { buildDesignSnapshot } from '../../src/design/snapshot';
import { computeDiffRows } from '../../src/diff/engine';
import { collectPartialComparisonIssues } from '../../src/tabs/diff-standalone';
import { pickAllSettingsBundles } from '../../src/settingsBundleImport';
import { downloadText } from '../../src/utils';
import { runSettingsExportStandalone } from '../../src/tabs/settings-export-standalone';

const scopes = vi.hoisted(() => ({ keys: [] as string[] }));
vi.mock('../../src/api', async importOriginal => ({ ...await importOriginal<typeof import('../../src/api')>(), fetchBundle: vi.fn(async (params: any) => syntheticBundle(params)) }));
vi.mock('../../src/utils', async importOriginal => ({ ...await importOriginal<typeof import('../../src/utils')>(),
  downloadText: vi.fn(), downloadBlob: vi.fn(), selectedScopeKeys: () => scopes.keys }));
const zipFiles = vi.hoisted(() => new Map<string, string>());
vi.mock('../../src/jszipLoader', () => ({ loadJSZipLite: async () => class {
  file(name: string, content: string) { zipFiles.set(name, content); return this; }
  async generateAsync() { return new Blob(['zip fixture']); }
} }));

const PLUGINS = [
  { id: 'p1', name: 'カレンダー', enabled: true },
  { id: 'p2', name: 'チャット通知', enabled: false }
];
/** fetchBundle の応答。プラグインの設定値を除く指定（skipPluginConfig）のときは、本物と同じ形で除いたことを記録する。 */
function syntheticBundle(params: any) {
  const omit = !!params.skipPluginConfig;
  const plugins = PLUGINS.map(plugin => omit ? { ...plugin } : { ...plugin, _config: { apiToken: `secret-${plugin.id}` } });
  return {
    appId: String(params.appId), guestId: String(params.guestId || ''), preview: !!params.preview, fetchedAt: '2026-11-01T00:00:00.000Z', meta: { sectionRevisions: {} },
    sections: {
      appSettings: { name: `App ${params.appId}` },
      pluginSettings: omit ? { plugins, _partial: { kind: PLUGIN_CONFIG_OMITTED_KIND, message: PLUGIN_CONFIG_OMITTED_MESSAGE, omittedPlugins: plugins.length } } : { plugins }
    }
  };
}

beforeEach(() => { vi.clearAllMocks(); zipFiles.clear(); scopes.keys = ['appSettings', 'pluginSettings']; });

const callsOf = async () => {
  const { fetchBundle: mocked } = await import('../../src/api');
  return vi.mocked(mocked).mock.calls.map(([params]) => params as any);
};

describe('settings export: plug-in configuration values', () => {
  it('includes plug-in configuration by default and says so in the result, manifest and INDEX.md', async () => {
    const status = vi.fn();
    const { summaryHtml } = await runSettingsExportStandalone('zip', { apps: [{ appId: '1' }] }, status);
    expect((await callsOf())[0].skipPluginConfig).toBe(false);
    const manifest = JSON.parse(zipFiles.get('manifest.json')!);
    expect(manifest.pluginConfig).toBe('included');
    expect(zipFiles.get('INDEX.md')).toContain('プラグインの設定値を含みます（API キーなどの機微な値を含む場合があります）');
    expect(JSON.parse([...zipFiles].find(([name]) => name.endsWith('.json') && name !== 'manifest.json')![1]).sections.pluginSettings.plugins[0]._config).toEqual({ apiToken: 'secret-p1' });
    expect(summaryHtml).toContain('プラグインの設定値を含みます');
  });

  it('can leave the configuration out while keeping id, name and enabled state, and records that in the output', async () => {
    const status = vi.fn();
    const { summaryHtml } = await runSettingsExportStandalone('zip', { apps: [{ appId: '1' }, { appId: '2', guestId: '7' }], excludePluginConfig: true }, status);
    expect((await callsOf()).every(params => params.skipPluginConfig === true)).toBe(true);
    const manifest = JSON.parse(zipFiles.get('manifest.json')!);
    expect(manifest.pluginConfig).toBe('omitted');
    expect(manifest.failedAppCount).toBe(0);
    expect(manifest.apps[0]).toMatchObject({ omittedPluginConfigs: 2, sections: { ok: 2, ng: 0 }, failedSections: [] });
    const index = zipFiles.get('INDEX.md')!;
    expect(index).toContain('プラグインの設定値: プラグインの設定値は含めていません（プラグインの一覧だけを保存）');
    expect(index).toContain('プラグインの設定値は含めず 2件');
    const bundleJson = [...zipFiles].filter(([name]) => name.endsWith('.json') && name !== 'manifest.json').map(([, text]) => JSON.parse(text));
    expect(bundleJson[0].sections.pluginSettings.plugins).toEqual(PLUGINS);
    expect(bundleJson[0].sections.pluginSettings._partial).toMatchObject({ kind: PLUGIN_CONFIG_OMITTED_KIND });
    expect(JSON.stringify(bundleJson)).not.toContain('secret-');
    expect(summaryHtml).toContain('プラグインの設定値は含めていません');
    // 利用者が選んだ除外は、取得失敗や警告として出さない
    expect(status).toHaveBeenLastCalledWith(expect.stringContaining('プラグインの設定値は含めていません'), false);
    expect(summaryHtml).toContain('プラグインの設定値は含めず 2件');
  });

  it('records the choice in the single JSON file', async () => {
    await runSettingsExportStandalone('json', { apps: [{ appId: '1' }], excludePluginConfig: true }, vi.fn());
    const payload = JSON.parse(vi.mocked(downloadText).mock.calls[0][1] as string);
    expect(payload.pluginConfig).toBe('omitted');
    expect(payload.summary[0].omittedPluginConfigs).toBe(2);
    expect(JSON.stringify(payload)).not.toContain('secret-');
  });

  it('ignores the choice when the plug-in section is not exported', async () => {
    scopes.keys = ['appSettings'];
    await runSettingsExportStandalone('zip', { apps: [{ appId: '1' }], excludePluginConfig: true }, vi.fn());
    expect((await callsOf())[0].skipPluginConfig).toBe(false);
    expect(JSON.parse(zipFiles.get('manifest.json')!)).not.toHaveProperty('pluginConfig');
    expect(zipFiles.get('INDEX.md')).not.toContain('プラグインの設定値');
  });

  it('warns that JS/CSS file bodies are part of the JSON when JS/CSS settings are exported', async () => {
    scopes.keys = ['appSettings', 'customizeSettings'];
    const { summaryHtml } = await runSettingsExportStandalone('zip', { apps: [{ appId: '1' }] }, vi.fn());
    expect(zipFiles.get('INDEX.md')).toContain('JS/CSSファイルの本文: 各アプリの JSON に含みます（API トークンなどが書かれている場合があります');
    expect(summaryHtml).toContain('JS/CSSファイルの本文を含みます');
  });
});

describe('settings JSON written without plug-in configuration is still readable', () => {
  it('is read back as a normal bundle whose partial marker tells the readers the values were left out', async () => {
    await runSettingsExportStandalone('json', { apps: [{ appId: '1' }, { appId: '2' }], excludePluginConfig: true }, vi.fn());
    const payload = JSON.parse(vi.mocked(downloadText).mock.calls[0][1] as string);
    const bundles = pickAllSettingsBundles(payload, undefined, true, true);
    expect(bundles).toHaveLength(2);
    expect(bundles[0].sections.pluginSettings.plugins.map((plugin: any) => [plugin.id, plugin.name, plugin.enabled])).toEqual([['p1', 'カレンダー', true], ['p2', 'チャット通知', false]]);
    // 差分比較は「取得失敗」にせず、設定値を比べていないことを注意として出す
    const issues = collectPartialComparisonIssues(bundles[0], bundles[1]);
    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0].message).toContain('プラグインの設定値は含めずに保存');
    const { rows, fetchIssues } = computeDiffRows(bundles[0], bundles[1], ['pluginSettings'], '') as any;
    expect(fetchIssues).toEqual([]);
    expect(rows.filter((row: any) => row.type !== 'same')).toEqual([]);
  });
});

describe('markPluginConfigOmitted', () => {
  it('marks only a fetched section that has plug-ins', () => {
    const bundle = syntheticBundle({ appId: '1' }) as any;
    expect(markPluginConfigOmitted(bundle)).toBe(2);
    expect(bundle.sections.pluginSettings._partial).toMatchObject({ kind: PLUGIN_CONFIG_OMITTED_KIND, omittedPlugins: 2 });
    const empty = { sections: { pluginSettings: { plugins: [] } } } as any;
    expect(markPluginConfigOmitted(empty)).toBe(0);
    expect(empty.sections.pluginSettings).not.toHaveProperty('_partial');
    const failed = { sections: { pluginSettings: { _fetchError: '権限がありません', plugins: PLUGINS } } } as any;
    expect(markPluginConfigOmitted(failed)).toBe(0);
    expect(failed.sections.pluginSettings).not.toHaveProperty('_partial');
  });

  it('is not counted as a partial section in the design documents (they never show configuration values)', () => {
    const bundle = syntheticBundle({ appId: '1', skipPluginConfig: true }) as any;
    const row = buildDesignSnapshot(bundle).sections.find(section => section.key === 'pluginSettings')!;
    expect(row.status).toBe('available');
    expect(row.count).toBe(2);
    // 設定値の取得に失敗して付いた通常の _partial は、これまでどおり部分取得として扱う
    bundle.sections.pluginSettings._partial = { kind: 'other', message: '一部だけ' };
    expect(buildDesignSnapshot(bundle).sections.find(section => section.key === 'pluginSettings')!.status).toBe('partial');
  });
});

describe('fetchBundle with skipPluginConfig', () => {
  afterEach(() => { vi.unstubAllGlobals(); });
  it('does not request any plug-in configuration', async () => {
    const actual = await vi.importActual<typeof import('../../src/api')>('../../src/api');
    const api = vi.fn(async (path: string) => {
      if (path.endsWith('/app/plugins.json')) return { revision: '5', plugins: PLUGINS };
      throw new Error(`unexpected API path: ${path}`);
    });
    vi.stubGlobal('kintone', { api });
    const bundle = await actual.fetchBundle({ appId: '1', preview: false, sections: ['pluginSettings'], skipPluginConfig: true });
    expect(api.mock.calls.map(([path]) => path)).toEqual(['/k/v1/app/plugins.json']);
    expect(bundle.sections.pluginSettings.plugins).toEqual(PLUGINS);
    expect(bundle.sections.pluginSettings).not.toHaveProperty('_fetchError');
    expect(bundle.sections.pluginSettings).not.toHaveProperty('_partial');
  });

  it('does not hide a failed plug-in list', async () => {
    const actual = await vi.importActual<typeof import('../../src/api')>('../../src/api');
    vi.stubGlobal('kintone', { api: vi.fn(async () => { throw Object.assign(new Error('権限がありません'), { code: 'CB_NO02' }); }) });
    const failed = await actual.fetchBundle({ appId: '1', preview: false, sections: ['pluginSettings'], skipPluginConfig: true });
    expect(failed.sections.pluginSettings._fetchError).toContain('権限がありません');
  });

  it('can skip JS/CSS file bodies as well', async () => {
    const actual = await vi.importActual<typeof import('../../src/api')>('../../src/api');
    const api = vi.fn(async (path: string) => {
      if (path.endsWith('/app/customize.json')) return { revision: '5', scope: 'ALL', desktop: { js: [{ type: 'FILE', file: { fileKey: 'k1', name: 'a.js', size: '10' } }], css: [] }, mobile: { js: [], css: [] } };
      throw new Error(`unexpected API path: ${path}`);
    });
    vi.stubGlobal('kintone', { api });
    const fetchMock = vi.fn(async () => new Response('x'));
    vi.stubGlobal('fetch', fetchMock);
    const bundle = await actual.fetchBundle({ appId: '1', preview: false, sections: ['customizeSettings'], skipCustomizeBodies: true });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(bundle.sections.customizeSettings).not.toHaveProperty('_fetchError');
    expect(bundle.sections.customizeSettings.desktop.js[0]).not.toHaveProperty('_bodyText');
  });
});
