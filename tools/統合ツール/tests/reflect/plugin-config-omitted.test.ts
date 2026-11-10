import { afterEach, describe, expect, it, vi } from 'vitest';
import { previewReflectStandalone } from '../../src/tabs/reflect-standalone';
import { PLUGIN_CONFIG_OMITTED_KIND, PLUGIN_CONFIG_OMITTED_MESSAGE } from '../../src/pluginConfigMarker';

// 設定一括取得で「プラグインの設定値を含めない」を選んだ設定JSONを反映元にする。
// 反映はプラグインの ID だけを使い、固有の設定値はコピーしないため、目印（_partial）で反映を止めてはならない。
function server(targetPlugins: any[]) {
  const api = vi.fn(async (url: string, method: string) => {
    if (method !== 'GET') throw new Error(`書き込みは想定していません: ${method} ${url}`);
    if (url.endsWith('/app/plugins.json')) return { plugins: JSON.parse(JSON.stringify(targetPlugins)), revision: '7' };
    if (url.endsWith('/app.json')) return { appId: '2', name: '反映先', code: '' };
    throw new Error(`Unexpected endpoint: ${method} ${url}`);
  });
  vi.stubGlobal('kintone', { api });
  return api;
}

const sourceBundle = (withMarker: boolean) => ({
  appId: '1',
  sections: {
    pluginSettings: {
      plugins: [{ id: 'p1', name: 'A', enabled: true }, { id: 'p2', name: 'B', enabled: true }],
      revision: '3',
      ...(withMarker ? { _partial: { kind: PLUGIN_CONFIG_OMITTED_KIND, message: PLUGIN_CONFIG_OMITTED_MESSAGE, omittedPlugins: 2 } } : {})
    }
  }
});

describe('プラグインの設定値を含めない設定JSONを反映元にする', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('目印があっても、目印が無い設定JSONと同じ反映計画（不足しているプラグインの追加）になる', async () => {
    const run = async (withMarker: boolean) => {
      const api = server([{ id: 'p1', name: 'A', enabled: true }]);
      const preview = await previewReflectStandalone({ sourceAppId: '1', sourceBundle: sourceBundle(withMarker), targetAppId: '2', scopes: ['pluginSettings'] }, () => {});
      expect(api.mock.calls.every(([, method]) => method === 'GET')).toBe(true);
      return preview.entries.map((entry: any) => ({ sectionKey: entry.sectionKey, status: entry.status, operations: entry.operations }));
    };
    const plain = await run(false);
    const marked = await run(true);
    expect(marked).toEqual(plain);
    expect(marked).toHaveLength(1);
    expect(marked[0]).toMatchObject({ sectionKey: 'pluginSettings', status: 'change' });
    expect(JSON.stringify(marked[0].operations)).toContain('p2');
  });
});
