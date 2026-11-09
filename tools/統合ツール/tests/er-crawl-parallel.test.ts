import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiGet } from '../src/api';
import { RunCancelledError } from '../src/runControl';
import { crawl } from '../src/tabs/er';

vi.mock('../src/api', async original => ({
  ...await original<typeof import('../src/api')>(),
  apiGet: vi.fn()
}));

type Node = { name?: string; lookups?: number[]; refs?: number[]; actions?: number[]; fieldsError?: string; delay?: number };
type Graph = Record<number, Node>;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** 条件が成り立つまで待つ（固定時間ではなく状態で待つので、負荷が高くても安定する）。 */
async function until(condition: () => boolean, label: string) {
  for (let i = 0; i < 2000; i += 1) {
    if (condition()) return;
    await sleep(2);
  }
  throw new Error(`待っても条件が成り立ちませんでした: ${label}`);
}

/**
 * 合成 API。アプリごとの遅延、同時に処理中の項目取得の最大数、項目取得を始めた順を記録する。
 * gate を渡すと、項目取得はテストが release するまで返らない。
 */
function installGraph(graph: Graph, gate?: { wait: (id: number) => Promise<void> }) {
  const stats = { inflight: 0, peak: 0, started: [] as number[] };
  vi.mocked(apiGet).mockImplementation(async (_prefix: string, path: string, params: any) => {
    if (path === '/apps.json') {
      const ids = Object.keys(graph);
      return { apps: ids.slice(Number(params.offset || 0), Number(params.offset || 0) + 100).map((id) => ({ appId: id, name: graph[Number(id)].name || `App${id}` })) };
    }
    const id = Number(params?.app ?? params?.id);
    const app = graph[id];
    if (!app) throw new Error(`GAIA_AP01 app ${id} not found`);
    if (path === '/app.json') return { appId: String(id), name: app.name || `App${id}` };
    if (path === '/app/actions.json') {
      return { actions: Object.fromEntries((app.actions || []).map((to, i) => [`act${i}`, { name: `act${i}`, destApp: { app: String(to) } }])) };
    }
    if (path === '/app/form/fields.json') {
      stats.started.push(id);
      stats.inflight += 1;
      stats.peak = Math.max(stats.peak, stats.inflight);
      try {
        if (gate) await gate.wait(id);
        else if (app.delay) await sleep(app.delay);
      } finally {
        stats.inflight -= 1;
      }
      if (app.fieldsError) throw new Error(app.fieldsError);
      const properties: Record<string, any> = { key: { type: 'SINGLE_LINE_TEXT', code: 'key', label: 'Key' } };
      (app.lookups || []).forEach((to, i) => {
        properties[`lk${i}`] = { type: 'NUMBER', code: `lk${i}`, label: `LK${i}`, lookup: { relatedApp: { app: String(to) }, relatedKeyField: 'key' } };
      });
      (app.refs || []).forEach((to, i) => {
        properties[`rf${i}`] = { type: 'REFERENCE_TABLE', code: `rf${i}`, label: `RF${i}`, referenceTable: { relatedApp: { app: String(to) }, condition: { field: 'key', relatedField: 'key' } } };
      });
      return { properties };
    }
    throw new Error(`unexpected ${path}`);
  });
  return stats;
}

/** テストが各アプリの項目取得を成功・中止のどちらで終えるか決める。 */
function createGate() {
  const pending = new Map<number, { resolve: () => void; reject: (error: unknown) => void }>();
  return {
    wait: (id: number) => new Promise<void>((resolve, reject) => { pending.set(id, { resolve, reject }); }),
    isWaiting: (id: number) => pending.has(id),
    ok: (id: number) => { pending.get(id)?.resolve(); pending.delete(id); },
    cancel: (id: number) => { pending.get(id)?.reject(new RunCancelledError()); pending.delete(id); }
  };
}

const options = (extra: Record<string, unknown> = {}) => ({
  maxDepth: 0, includeReverseLookup: false, sleepMs: 1, source: { guestId: '', preview: false }, ...extra
});

/** 決定的な疑似乱数 */
function rng(seed: number) {
  let s = seed;
  return () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; };
}

function randomGraph(size: number, seed: number): Graph {
  const rand = rng(seed);
  const graph: Graph = {};
  for (let id = 1; id <= size; id += 1) {
    const pick = () => 1 + Math.floor(rand() * (size + 3)); // size を超える ID は存在しない参照先（取得失敗として残る）
    graph[id] = {
      lookups: Array.from({ length: 1 + Math.floor(rand() * 3) }, pick),
      refs: rand() < 0.3 ? [pick()] : [],
      actions: rand() < 0.2 ? [pick()] : [],
      delay: Math.floor(rand() * 12),
      ...(rand() < 0.06 ? { fieldsError: `CB_NO02 permission denied ${id}` } : {})
    };
  }
  return graph;
}

const summarize = (apps: any[]) => apps.map((a) => ({ id: a.id, depth: a.depth, status: a.status, relations: a.relations.map((r: any) => `${r.kind}:${r.toApp}`) }));

beforeEach(() => { vi.clearAllMocks(); vi.spyOn(console, 'error').mockImplementation(() => undefined); });

describe('ER crawl reads several apps at once', () => {
  it('never reads more apps at the same time than the limit, and does use the limit', async () => {
    const graph: Graph = {};
    for (let id = 1; id <= 12; id += 1) graph[id] = { delay: 15 };
    const stats = installGraph(graph);
    const apps = await crawl(Array.from({ length: 12 }, (_, i) => String(i + 1)), options({ concurrency: 4 }));
    expect(apps).toHaveLength(12);
    expect(stats.peak).toBe(4);
    expect(stats.started).toHaveLength(12);
  });

  it('uses 4 apps at a time by default', async () => {
    const graph: Graph = {};
    for (let id = 1; id <= 10; id += 1) graph[id] = { delay: 15 };
    const stats = installGraph(graph);
    await crawl(Array.from({ length: 10 }, (_, i) => String(i + 1)), options());
    expect(stats.peak).toBe(4);
  });

  it('returns exactly what a one-at-a-time crawl returns, whatever order the apps finish in', async () => {
    const graph = randomGraph(40, 11);
    const seeds = ['4', '7', '12'];
    const baseline: Record<string, unknown> = {};
    for (const reverse of [false, true]) {
      for (const maxDepth of [0, 2]) {
        installGraph(graph);
        const serial: any = options({ concurrency: 1, includeReverseLookup: reverse, maxDepth });
        const serialApps = await crawl(seeds, serial);
        const key = `${reverse}/${maxDepth}`;
        baseline[key] = { apps: summarize(serialApps), scan: serial.reverseScan };
        expect(serialApps.length).toBeGreaterThan(maxDepth ? 5 : 20);
        for (const concurrency of [2, 4, 8]) {
          installGraph(graph);
          const parallel: any = options({ concurrency, includeReverseLookup: reverse, maxDepth });
          const parallelApps = await crawl(seeds, parallel);
          expect({ apps: summarize(parallelApps), scan: parallel.reverseScan }, `${key} x${concurrency}`).toEqual(baseline[key]);
        }
      }
    }
  });

  it('keeps the visiting order when a later app finishes before an earlier one', async () => {
    const gate = createGate();
    installGraph({ 1: { lookups: [2, 3] }, 2: { lookups: [4] }, 3: { lookups: [5] }, 4: {}, 5: {} }, gate);
    const run = crawl(['1'], options({ concurrency: 4 }));
    await until(() => gate.isWaiting(1), 'app 1');
    gate.ok(1);
    await until(() => gate.isWaiting(2) && gate.isWaiting(3), 'apps 2 and 3');
    gate.ok(3); // 3 が先に終わる
    await until(() => !gate.isWaiting(3), 'app 3 done');
    gate.ok(2);
    await until(() => gate.isWaiting(4) && gate.isWaiting(5), 'apps 4 and 5');
    gate.ok(5);
    gate.ok(4);
    const apps = await run;
    expect(apps.map((a: any) => [a.id, a.depth])).toEqual([[1, 0], [2, 1], [3, 1], [4, 2], [5, 2]]);
  });

  it('keeps a failed app in its place and still reads the apps around it', async () => {
    installGraph({
      1: { lookups: [2, 3, 4, 5] },
      2: { delay: 20 },
      3: { fieldsError: 'CB_NO02 permission denied', delay: 1 },
      4: { delay: 5 },
      5: {}
    });
    const apps = await crawl(['1'], options({ concurrency: 4 }));
    expect(apps.map((a: any) => [a.id, a.status])).toEqual([[1, 'complete'], [2, 'complete'], [3, 'failed'], [4, 'complete'], [5, 'complete']]);
    expect(apps[2].issues[0].message).toContain('CB_NO02');
  });

  it('reports reverse-scan problems in the same order as the app list', async () => {
    const graph: Graph = {};
    for (let id = 1; id <= 9; id += 1) graph[id] = { delay: id % 3 === 0 ? 1 : 12 };
    graph[2].fieldsError = 'CB_NO02 permission denied';
    graph[5].fieldsError = 'CB_NO02 permission denied';
    graph[8].fieldsError = 'CB_NO02 permission denied';
    graph[9].lookups = [1];
    installGraph(graph);
    const opts: any = options({ includeReverseLookup: true, concurrency: 4 });
    const apps = await crawl(['1'], opts);
    expect(opts.reverseScan.total).toBe(9);
    expect(opts.reverseScan.incomplete.map((r: any) => r.appId)).toEqual([2, 5, 8]);
    expect(apps.map((a: any) => a.id)).toEqual([1, 9]);
  });

  it('does not read deeper than the depth limit, nor apps nobody reaches', async () => {
    const stats = installGraph({ 1: { lookups: [2, 3] }, 2: { lookups: [4] }, 3: {}, 4: { lookups: [5] }, 5: {}, 6: {} });
    const apps = await crawl(['1'], options({ maxDepth: 2, concurrency: 4 }));
    expect(apps.map((a: any) => [a.id, a.depth])).toEqual([[1, 0], [2, 1], [3, 1], [4, 2]]);
    expect([...stats.started].sort()).toEqual([1, 2, 3, 4]);
  });
});

describe('ER crawl cancel while several apps are being read', () => {
  it('counts the apps that finished and the ones that were cut off, and starts nothing after the cancel', async () => {
    const gate = createGate();
    const stats = installGraph({ 1: { lookups: [2, 3, 4, 5, 6, 7] }, 2: {}, 3: {}, 4: {}, 5: {}, 6: {}, 7: {}, 8: {} }, gate);
    const run = crawl(['1'], options({ concurrency: 4 })).catch((error) => error);
    await until(() => gate.isWaiting(1), 'app 1');
    gate.ok(1);
    await until(() => [2, 3, 4, 5].every((id) => gate.isWaiting(id)), 'first four apps');
    gate.ok(2);
    gate.ok(3);
    await until(() => gate.isWaiting(6) && gate.isWaiting(7), 'apps 6 and 7 picked up');
    gate.cancel(4);
    await until(() => !gate.isWaiting(4), 'cancel reached');
    gate.cancel(5);
    gate.cancel(6);
    gate.cancel(7);
    const error: any = await run;

    expect(error.message.split('\n')[0]).toBe('中止しました（3/7 件を処理、残り 4 件は未実行）');
    expect(error.message).toContain('解析を中断したアプリ: 4, 5, 6, 7');
    expect(error.message).toContain('ER図は生成していません');
    expect(error.done).toBe(3);
    expect(error.total).toBe(7);
    expect(stats.started).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('counts the apps found so far in the next depth as not run', async () => {
    const gate = createGate();
    installGraph({ 1: { lookups: [2, 3] }, 2: { lookups: [4, 5] }, 3: { lookups: [6] }, 4: {}, 5: {}, 6: {} }, gate);
    const run = crawl(['1'], options({ concurrency: 4 })).catch((error) => error);
    await until(() => gate.isWaiting(1), 'app 1');
    gate.ok(1);
    await until(() => gate.isWaiting(2) && gate.isWaiting(3), 'apps 2 and 3');
    gate.ok(2); // 2 だけ終わる。次の深さに 4・5 が見つかる
    await until(() => !gate.isWaiting(2), 'app 2 done');
    gate.cancel(3);
    const error: any = await run;
    // 処理済み 2（1 と 2）、未実行は 3（中断）と、見つけ済みの 4・5 の合計 3
    expect(error.message.split('\n')[0]).toBe('中止しました（2/5 件を処理、残り 3 件は未実行）');
    expect(error.message).toContain('解析を中断したアプリ: 3');
  });

  it('shortens a long list of cut-off apps', async () => {
    const gate = createGate();
    const graph: Graph = {};
    for (let id = 1; id <= 8; id += 1) graph[id] = {};
    installGraph(graph, gate);
    const run = crawl(Array.from({ length: 8 }, (_, i) => String(i + 1)), options({ concurrency: 8 })).catch((error) => error);
    await until(() => [1, 2, 3, 4, 5, 6, 7, 8].every((id) => gate.isWaiting(id)), 'all eight');
    for (let id = 1; id <= 8; id += 1) gate.cancel(id);
    const error: any = await run;
    expect(error.message.split('\n')[0]).toBe('中止しました（0/8 件を処理、残り 8 件は未実行）');
    expect(error.message).toContain('解析を中断したアプリ: 1, 2, 3, 4, 5 ほか 3 件');
  });

  it('stops the reverse scan at the cancel and reports the scanned count', async () => {
    const gate = createGate();
    const graph: Graph = {};
    for (let id = 1; id <= 8; id += 1) graph[id] = {};
    const stats = installGraph(graph, gate);
    const opts: any = options({ includeReverseLookup: true, concurrency: 4 });
    const run = crawl(['1'], opts).catch((error) => error);
    await until(() => [1, 2, 3, 4].every((id) => gate.isWaiting(id)), 'first four apps');
    gate.ok(1);
    gate.ok(2);
    await until(() => gate.isWaiting(5) && gate.isWaiting(6), 'apps 5 and 6 picked up');
    gate.cancel(3);
    await until(() => !gate.isWaiting(3), 'cancel reached');
    for (const id of [4, 5, 6]) gate.cancel(id);
    const error: any = await run;

    expect(error.message.split('\n')[0]).toBe('中止しました（2/8 件を処理、残り 6 件は未実行）');
    expect(error.message).toContain('逆引き探索用の全アプリ走査を中止しました');
    expect(error.message).toContain('ER図は生成していません');
    expect(stats.started).toEqual([1, 2, 3, 4, 5, 6]);
  });
});
