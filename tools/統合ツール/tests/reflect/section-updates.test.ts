import { afterEach, describe, expect, it, vi } from 'vitest';
import { previewReflectStandalone, runApplyPreviewStandalone, type ReflectSectionUpdate } from '../../src/tabs/reflect-standalone';

const copy = (value: any) => JSON.parse(JSON.stringify(value));

function setup(sourceSections: Record<string, any>, targetSections: Record<string, any>) {
  let revision = 10;
  let afterWrite: ((response: any) => any) | undefined;
  const endpoints = { '/app/form/layout.json': 'layoutSettings', '/app/views.json': 'viewSettings', '/app/reports.json': 'reportSettings' };
  const api = vi.fn(async (url: string, method: string, body: any) => {
    const key = Object.entries(endpoints).find(([endpoint]) => url.endsWith(endpoint))?.[1];
    if (!key) throw new Error(`Unexpected endpoint: ${url}`);
    if (method === 'GET') return { ...copy(targetSections[key]), revision: String(revision) };
    if (body.revision !== String(revision)) throw { code: 'GAIA_CO02', message: 'revision mismatch' };
    revision += 1;
    const response = { revision: String(revision) };
    return afterWrite ? afterWrite(response) : response;
  });
  vi.stubGlobal('kintone', { api });
  const opts = { sourceAppId: '1', sourceBundle: { appId: '1', sections: sourceSections }, targetAppId: '2', scopes: Object.keys(sourceSections) };
  const updates: ReflectSectionUpdate[] = [];
  return {
    api, updates,
    writes: () => api.mock.calls.filter(([, method]) => method !== 'GET'),
    afterWrite: (fn: (response: any) => any) => { afterWrite = fn; },
    advanceRevision: () => { revision += 1; },
    async apply(extra: Record<string, any> = {}) {
      const preview = await previewReflectStandalone(opts, () => {});
      return runApplyPreviewStandalone({ ...opts, reviewBaseline: preview.baseline, onSectionUpdate: (update) => updates.push(update), ...extra }, () => {}, () => {});
    }
  };
}

const layoutChange = { layoutSettings: { layout: [{ type: 'ROW', fields: [] }] } };

describe('onSectionUpdate: 項目ごとの進捗通知', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('書き込む項目は running → ok、書き込み不要の項目は skip を、処理順に通知する', async () => {
    const server = setup(
      { ...layoutChange, viewSettings: { views: {} }, reportSettings: { reports: { 件数: { chartType: 'TABLE', chartMode: 'NORMAL', name: '件数', index: 0, groups: [], aggregations: [{ type: 'COUNT' }], filterCond: '', sort: '' } } } },
      { layoutSettings: { layout: [] }, viewSettings: { views: {} }, reportSettings: { reports: {} } }
    );
    const result = await server.apply();
    expect(result.sections.map((entry) => entry.status)).toEqual(['ok', 'skip', 'ok']);
    expect(server.updates.map((update) => [update.sectionKey, update.status])).toEqual([
      ['layoutSettings', 'running'], ['layoutSettings', 'ok'],
      ['viewSettings', 'skip'],
      ['reportSettings', 'running'], ['reportSettings', 'ok']
    ]);
    expect(server.updates.every((update) => update.label)).toBe(true);
    expect(server.updates.find((update) => update.status === 'skip')?.message).toBe('変更なし（書き込み不要）');
  });

  it('途中で失敗したら ng を通知し、中断で残った項目は pending で通知する', async () => {
    const server = setup(
      { ...layoutChange, viewSettings: { views: { 一覧: { type: 'LIST', name: '一覧', index: 0, fields: [] } } }, reportSettings: { reports: {} } },
      { layoutSettings: { layout: [] }, viewSettings: { views: {} }, reportSettings: { reports: { 旧: { chartType: 'TABLE', name: '旧', index: 0 } } } }
    );
    server.afterWrite((response) => { server.advanceRevision(); return response; });
    const result = await server.apply();
    expect(result.sections.map((entry) => entry.status)).toEqual(['ok', 'ng', 'pending']);
    expect(server.updates.map((update) => [update.sectionKey, update.status])).toEqual([
      ['layoutSettings', 'running'], ['layoutSettings', 'ok'],
      ['viewSettings', 'running'], ['viewSettings', 'ng'],
      ['reportSettings', 'pending']
    ]);
    expect(server.updates.find((update) => update.status === 'ng')?.message).toContain('revision 競合');
    expect(server.updates.find((update) => update.status === 'pending')?.message).toBe('中断のため未実行');
    // 通知の内容は、返り値の項目別結果と一致する。
    for (const section of result.sections) expect(server.updates.filter((update) => update.sectionKey === section.sectionKey).pop()?.status).toBe(section.status);
  });

  it('通知先が例外を投げても、書き込みと結果には影響しない', async () => {
    const server = setup({ ...layoutChange }, { layoutSettings: { layout: [] } });
    const result = await server.apply({ onSectionUpdate: () => { throw new Error('表示側の失敗'); } });
    expect(result.sections.map((entry) => entry.status)).toEqual(['ok']);
    expect(server.writes()).toHaveLength(1);
  });

  it('onSectionUpdate を渡さなくても従来どおり動く', async () => {
    const server = setup({ ...layoutChange }, { layoutSettings: { layout: [] } });
    const result = await server.apply({ onSectionUpdate: undefined });
    expect(result.sections.map((entry) => entry.status)).toEqual(['ok']);
  });
});
