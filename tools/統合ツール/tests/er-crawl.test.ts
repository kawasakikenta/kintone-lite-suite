import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiGet } from '../src/api';
import { buildHTML, crawl, describeReverseScan } from '../src/tabs/er';
import { summarizeCrawl } from '../src/tabs/er-standalone';

vi.mock('../src/api', async original => ({
  ...await original<typeof import('../src/api')>(),
  apiGet: vi.fn()
}));

type Graph = Record<number, { name: string; lookups?: number[]; refs?: number[]; actions?: number[]; fieldsError?: string; fieldsResponse?: unknown }>;

function installGraph(graph: Graph) {
  vi.mocked(apiGet).mockImplementation(async (_prefix: string, path: string, params: any) => {
    if (path === '/apps.json') {
      return { apps: Object.keys(graph).map((id) => ({ appId: id, name: graph[Number(id)].name })) };
    }
    const id = Number(params?.app ?? params?.id);
    const app = graph[id];
    if (!app) throw new Error(`GAIA_AP01 app ${id} not found`);
    if (path === '/app.json') return { appId: String(id), name: app.name };
    if (path === '/app/actions.json') {
      return {
        actions: Object.fromEntries((app.actions || []).map((to, i) => [`act${i}`, { name: `act${i}`, destApp: { app: String(to) } }]))
      };
    }
    if (path === '/app/form/fields.json') {
      if (app.fieldsError) throw new Error(app.fieldsError);
      if ('fieldsResponse' in app) return app.fieldsResponse;
      const properties: Record<string, any> = {};
      (app.lookups || []).forEach((to, i) => {
        properties[`lk${i}`] = { type: 'NUMBER', code: `lk${i}`, label: `LK${i}`, lookup: { relatedApp: { app: String(to) }, relatedKeyField: 'key' } };
      });
      (app.refs || []).forEach((to, i) => {
        properties[`rf${i}`] = { type: 'REFERENCE_TABLE', code: `rf${i}`, label: `RF${i}`, referenceTable: { relatedApp: { app: String(to) }, condition: { field: 'key', relatedField: 'key' } } };
      });
      properties.key = { type: 'SINGLE_LINE_TEXT', code: 'key', label: 'Key' };
      return { properties };
    }
    throw new Error(`unexpected ${path}`);
  });
}

const options = (extra: Record<string, unknown> = {}) => ({
  maxDepth: 0, includeReverseLookup: false, sleepMs: 1, source: { guestId: '', preview: false }, ...extra
});

beforeEach(() => vi.clearAllMocks());

describe('ER crawl', () => {
  it('visits each app once across cycles, self references and duplicate seeds', async () => {
    installGraph({
      1: { name: 'A', lookups: [2, 1] },
      2: { name: 'B', refs: [3], actions: [1] },
      3: { name: 'C', lookups: [1] }
    });
    const apps = await crawl(['1', '01', 1], options());
    expect(apps.map((a: any) => a.id)).toEqual([1, 2, 3]);
    const fieldCalls = vi.mocked(apiGet).mock.calls.filter((c) => c[1] === '/app/form/fields.json');
    expect(fieldCalls).toHaveLength(3);
  });

  it('stops expanding at the requested depth and keeps the unreached target as an unresolved relation', async () => {
    installGraph({
      1: { name: 'A', lookups: [2] },
      2: { name: 'B', lookups: [3] },
      3: { name: 'C' }
    });
    const apps = await crawl(['1'], options({ maxDepth: 1 }));
    expect(apps.map((a: any) => [a.id, a.depth])).toEqual([[1, 0], [2, 1]]);
    expect(apps[1].relations.map((r: any) => r.toApp)).toEqual([3]);
  });

  it('keeps an unreadable or deleted reference as a failed app instead of aborting', async () => {
    installGraph({
      1: { name: 'A', lookups: [2, 9] },
      2: { name: 'B', fieldsError: 'CB_NO02 permission denied' }
    });
    const apps = await crawl(['1'], options());
    const byId = new Map(apps.map((a: any) => [a.id, a]));
    expect(byId.get(2).status).toBe('failed');
    expect(byId.get(2).issues[0].message).toContain('CB_NO02');
    expect(byId.get(9).status).toBe('failed');
    expect(byId.get(9).name).toBe('アプリ 9');
  });

  it('adds apps that reference the start app when reverse lookup is on', async () => {
    installGraph({
      1: { name: 'A' },
      2: { name: 'B', lookups: [1] },
      3: { name: 'C' }
    });
    const apps = await crawl(['1'], options({ includeReverseLookup: true }));
    expect(apps.map((a: any) => a.id).sort()).toEqual([1, 2]);
  });

  it('treats an unexpected fields response as a failed app instead of aborting the crawl', async () => {
    installGraph({
      1: { name: 'A', lookups: [2] },
      2: { name: 'B', fieldsResponse: {} }
    });
    const apps = await crawl(['1'], options());
    expect(apps.map((a: any) => [a.id, a.status])).toEqual([[1, 'complete'], [2, 'failed']]);
  });

  it('reports apps whose settings could not be read during the reverse scan', async () => {
    installGraph({
      1: { name: 'A' },
      2: { name: 'B', lookups: [1] },
      3: { name: 'C', fieldsError: 'CB_NO02 permission denied' }
    });
    const opts: any = options({ includeReverseLookup: true });
    const apps = await crawl(['1'], opts);
    expect(apps.map((a: any) => a.id).sort()).toEqual([1, 2]);
    expect(opts.reverseScan.total).toBe(3);
    expect(opts.reverseScan.incomplete.map((r: any) => r.appId)).toEqual([3]);
    expect(describeReverseScan(opts)).toMatch(/全3アプリ中 1アプリ/);

    const html = buildHTML(apps, { ...opts, startAppId: '1', startAppIds: ['1'], source: {} });
    expect(html).toContain('<b>逆引き走査</b> 1/3件が不完全');
    expect(html).toContain('"reverseScanNote":"逆引き走査: 全3アプリ中 1アプリ');
    expect(summarizeCrawl(apps, opts)).toMatchObject({ tone: 'warn' });
    expect(summarizeCrawl(apps, opts).note).toContain('逆引き走査');
  });

  it('stays silent about the reverse scan when every app was readable', async () => {
    installGraph({ 1: { name: 'A' }, 2: { name: 'B', lookups: [1] } });
    const opts: any = options({ includeReverseLookup: true });
    const apps = await crawl(['1'], opts);
    expect(describeReverseScan(opts)).toBe('');
    expect(summarizeCrawl(apps, opts)).toMatchObject({ tone: false, note: '' });
    expect(buildHTML(apps, { ...opts, startAppId: '1', startAppIds: ['1'], source: {} })).not.toContain('<b>逆引き走査</b>');
  });
});
