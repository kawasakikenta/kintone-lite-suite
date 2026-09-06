import { afterEach, describe, expect, it, vi } from 'vitest';
import { previewReflectStandalone, runApplyPreviewStandalone } from '../../src/tabs/reflect-standalone';

const copy = (value: any) => JSON.parse(JSON.stringify(value));

function setup(sourceSections: Record<string, any>, targetSections: Record<string, any>, initialRevision = 10) {
  let revision = initialRevision;
  let afterWrite: ((response: any) => any) | undefined;
  const endpoints = {
    '/app/form/fields.json': 'fieldSettings',
    '/app/form/layout.json': 'layoutSettings',
    '/app/views.json': 'viewSettings',
    '/app/reports.json': 'reportSettings'
  };
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
  const opts = {
    sourceAppId: '1',
    sourceBundle: { appId: '1', sections: sourceSections },
    targetAppId: '2',
    scopes: Object.keys(sourceSections)
  };
  return {
    api, opts,
    writes: () => api.mock.calls.filter(([, method]) => method !== 'GET'),
    advanceRevision: () => { revision += 1; },
    afterWrite: (fn: (response: any) => any) => { afterWrite = fn; },
    async apply(extra = {}) {
      const preview = await previewReflectStandalone(opts, () => {});
      return runApplyPreviewStandalone({ ...opts, reviewBaseline: preview.baseline, ...extra }, () => {}, () => {});
    }
  };
}

describe('lite preview reflection revisions', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('sends the reviewed target revision when replacing views', async () => {
    const server = setup(
      { viewSettings: { views: { List: { type: 'LIST', index: 0 } } } },
      { viewSettings: { views: {} } }, 42
    );
    const result = await server.apply();
    expect(result.sections[0].status).toBe('ok');
    expect(server.writes()).toEqual([['/k/v1/preview/app/views.json', 'PUT', {
      app: '2', views: { List: { type: 'LIST', index: 0 } }, revision: '42'
    }]]);
  });

  it('chains the revision from field addition through update and the next section', async () => {
    const server = setup({
      fieldSettings: { properties: {
        added: { type: 'SINGLE_LINE_TEXT', code: 'added' },
        existing: { type: 'NUMBER', code: 'existing' }
      } },
      viewSettings: { views: { List: { type: 'LIST', index: 0 } } }
    }, {
      fieldSettings: { properties: { existing: { type: 'NUMBER', code: 'existing' } } },
      viewSettings: { views: {} }
    });
    const result = await server.apply();
    expect(result.sections.map((entry) => entry.status)).toEqual(['ok', 'ok']);
    expect(server.writes().map(([, method, body]) => [method, body.revision])).toEqual([
      ['POST', '10'], ['PUT', '11'], ['PUT', '12']
    ]);
  });

  it('stops after a concurrent update between sections even when stopOnError is false', async () => {
    const server = setup({
      layoutSettings: { layout: [{ type: 'ROW', fields: [] }] },
      viewSettings: { views: { List: { type: 'LIST', index: 0 } } },
      reportSettings: { reports: {} }
    }, { layoutSettings: { layout: [] }, viewSettings: { views: {} }, reportSettings: { reports: {} } });
    server.afterWrite((response) => { server.advanceRevision(); return response; });
    const result = await server.apply({ stopOnError: false });
    expect(result.sections.map((entry) => entry.status)).toEqual(['ok', 'ng', 'pending']);
    expect(result.sections[1].message).toContain('revision 競合');
    expect(server.writes().map(([, , body]) => body.revision)).toEqual(['10', '11']);
    const firstWrite = server.api.mock.calls.findIndex(([, method]) => method !== 'GET');
    expect(server.api.mock.calls.slice(firstWrite).every(([, method]) => method !== 'GET')).toBe(true);
  });

  it('stops between field addition and update on conflict, leaving later sections pending', async () => {
    const server = setup({
      fieldSettings: { properties: {
        added: { type: 'SINGLE_LINE_TEXT', code: 'added' },
        existing: { type: 'NUMBER', code: 'existing' }
      } }, viewSettings: { views: {} }
    }, {
      fieldSettings: { properties: { existing: { type: 'NUMBER', code: 'existing' } } },
      viewSettings: { views: {} }
    });
    server.afterWrite((response) => { server.advanceRevision(); return response; });
    const result = await server.apply({ stopOnError: false });
    expect(result.sections.map((entry) => entry.status)).toEqual(['ng', 'pending']);
    expect(result.sections[0].message).toContain('revision 競合');
    expect(server.writes().map(([url, method, body]) => [url, method, body.revision])).toEqual([
      ['/k/v1/preview/app/form/fields.json', 'POST', '10'],
      ['/k/v1/preview/app/form/fields.json', 'PUT', '11']
    ]);
  });

  it('does not continue with an unverified revision when a write response omits it', async () => {
    const server = setup({ viewSettings: { views: {} }, layoutSettings: { layout: [] } },
      { viewSettings: { views: {} }, layoutSettings: { layout: [] } });
    server.afterWrite(() => ({}));
    const result = await server.apply({ stopOnError: false });
    expect(server.writes()).toHaveLength(1);
    expect(result.sections.map((entry) => entry.status)).toEqual(['ng', 'pending']);
    expect(result.sections[0].message).toContain('書き込みは完了しました');
  });
});
