import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { isRevisionConflictError } from '../../src/api';
import { previewReflectStandalone, runApplyPreviewStandalone } from '../../src/tabs/reflect-standalone';
import { runFieldApplyMultiStandalone, runFieldApplyStandalone } from '../../src/tabs/field-standalone';
import { runApplyJsConfigMultiStandalone, runApplyJsConfigStandalone } from '../../src/tabs/jsconfig-standalone';

// 書き込みの応答が届かなかった（通信エラー・応答の無い 5xx）とき、kintone 側では反映されていた場合と、されていなかった場合。
// 送り直しで「成功したのに revision 競合」と表示したり、二重に送ったりしないことを、状態を持つ合成 kintone で確かめる。

const copy = (value: any) => JSON.parse(JSON.stringify(value));

const ENDPOINTS: Record<string, string> = {
  '/app/form/fields.json': 'fieldSettings',
  '/app/form/layout.json': 'layoutSettings',
  '/app/views.json': 'viewSettings',
  '/app/reports.json': 'reportSettings',
  '/app/customize.json': 'customizeSettings'
};

type LostKind = 'network' | 'bad-gateway' | 'timeout';
interface Fault { match: RegExp; method?: string; commit: boolean; kind: LostKind }

const lostError = (kind: LostKind) => {
  if (kind === 'bad-gateway') return Object.assign(new Error('Bad Gateway'), { status: 502 });
  if (kind === 'timeout') return Object.assign(new Error('Request timeout'), { code: 'TIMEOUT' });
  return Object.assign(new Error('Network Error'), { code: 'NETWORK' });
};

/** アプリごとに revision（設定全体で 1 つ）と設定を持つ合成 kintone。faults で「応答が届かない」書き込みを作る。 */
function fakeKintone(apps: Record<string, { revision: number; sections: Record<string, any> }>) {
  const state = copy(apps) as typeof apps;
  const faults: Fault[] = [];
  const hooks = new Map<number, () => void>();
  let writeCount = 0;
  const api = vi.fn(async (url: string, method: string, body: any) => {
    const path = url.replace(/^\/k(?:\/guest\/\d+)?\/v1(?:\/preview)?/, '');
    const key = ENDPOINTS[path];
    if (!key) throw new Error(`Unexpected endpoint: ${method} ${url}`);
    const app = state[String(body?.app)];
    if (!app) throw { code: 'GAIA_AP01', id: 'req', message: '指定したアプリが見つかりません。' };
    if (method === 'GET') return { ...copy(app.sections[key] || {}), revision: String(app.revision) };
    writeCount += 1;
    hooks.get(writeCount)?.();
    const fault = faults.find((item) => item.match.test(url) && (!item.method || item.method === method));
    if (fault) faults.splice(faults.indexOf(fault), 1);
    if (fault && !fault.commit) throw lostError(fault.kind);
    if (body.revision !== undefined && String(body.revision) !== String(app.revision)) {
      throw { code: 'GAIA_CO02', id: 'req-co', message: '指定したrevisionは最新ではありません。他のユーザーによってアプリの設定が更新されています。' };
    }
    const { app: _app, revision: _revision, ...rest } = copy(body);
    if (key === 'fieldSettings') {
      const properties = { ...(app.sections.fieldSettings?.properties || {}) };
      for (const [code, def] of Object.entries<any>(rest.properties || {})) properties[code] = { ...(properties[code] || {}), ...def, code };
      app.sections.fieldSettings = { properties };
    } else {
      app.sections[key] = { ...(app.sections[key] || {}), ...rest };
    }
    app.revision += 1;
    if (fault) throw lostError(fault.kind);
    return { revision: String(app.revision) };
  });
  vi.stubGlobal('kintone', { api });
  return {
    api, state,
    lose: (match: RegExp, opts: { commit: boolean; kind?: LostKind; method?: string }) => { faults.push({ match, commit: opts.commit, kind: opts.kind || 'network', method: opts.method }); },
    /** n 回目（1 始まり）の書き込みを処理する直前に実行する（遅れて確定した書き込み・ほかの利用者の更新を作る）。 */
    beforeWrite: (n: number, hook: () => void) => { hooks.set(n, hook); },
    writes: () => api.mock.calls.filter(([, method]) => method !== 'GET').map(([url, method, body]) => ({ url, method, revision: body.revision })),
    revisionOf: (app: string) => String(state[app].revision)
  };
}

beforeEach(() => {
  // 再試行の待ち時間（数百 ms）だけを縮める。読み取りの応答待ち上限（120 秒）のタイマーはそのまま使う。
  const realSetTimeout = globalThis.setTimeout;
  vi.spyOn(globalThis, 'setTimeout').mockImplementation(((fn: any, ms?: number, ...rest: any[]) => (Number(ms) < 10_000 ? realSetTimeout(fn, 0, ...rest) : realSetTimeout(fn, ms, ...rest))) as any);
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

// ---------------------------------------------------------------------------
// プレビュー反映
// ---------------------------------------------------------------------------
describe('preview reflection when a write response is lost', () => {
  const views = { List: { type: 'LIST', fields: [], index: 0 } };
  const reflectOpts = (sections: Record<string, any>) => ({
    sourceAppId: '1', sourceBundle: { appId: '1', sections }, targetAppId: '2', scopes: Object.keys(sections)
  });
  const apply = async (opts: any, extra: Record<string, unknown> = {}) => {
    const preview = await previewReflectStandalone(opts, () => {});
    return runApplyPreviewStandalone({ ...opts, reviewBaseline: preview.baseline, ...extra }, () => {}, () => {});
  };

  for (const kind of ['network', 'bad-gateway', 'timeout'] as const) {
    it(`does not report a revision conflict when the write was applied but its response was lost (${kind})`, async () => {
      const k = fakeKintone({ '2': { revision: 10, sections: { viewSettings: { views: {} } } } });
      k.lose(/views\.json$/, { commit: true, kind });
      const result = await apply(reflectOpts({ viewSettings: { views } }));
      // 送り直していない（2 回目を送ると、進んだ revision と食い違って競合に見える）
      expect(k.writes()).toEqual([{ url: '/k/v1/preview/app/views.json', method: 'PUT', revision: '10' }]);
      const section = result.sections[0];
      expect(section.status).toBe('ng');
      expect(section.unconfirmed).toBe(true);
      expect(section.message).toContain('反映されたか分かりません');
      expect(section.message).not.toContain('revision 競合');
      expect(section.message).toContain('差分を取得し直して');
    });
  }

  it('resends once after confirming by a read that the lost write was not applied', async () => {
    const k = fakeKintone({ '2': { revision: 10, sections: { viewSettings: { views: {} } } } });
    k.lose(/views\.json$/, { commit: false });
    const result = await apply(reflectOpts({ viewSettings: { views } }));
    expect(result.sections.map((section) => section.status)).toEqual(['ok']);
    expect(k.writes().map((write) => write.revision)).toEqual(['10', '10']);
    expect(result.finalRevision).toBe('11');
    expect(k.revisionOf('2')).toBe('11');
  });

  it('stops the following sections after an unconfirmed write even when stopOnError is false', async () => {
    const k = fakeKintone({ '2': { revision: 10, sections: { layoutSettings: { layout: [] }, viewSettings: { views: {} } } } });
    k.lose(/layout\.json$/, { commit: true });
    const result = await apply(reflectOpts({ layoutSettings: { layout: [{ type: 'ROW', fields: [] }] }, viewSettings: { views } }), { stopOnError: false });
    expect(result.sections.map((section) => [section.sectionKey, section.status])).toEqual([['layoutSettings', 'ng'], ['viewSettings', 'pending']]);
    expect(result.sections[0].unconfirmed).toBe(true);
    // 次の項目へ、確かめていない revision（自分の書き込みか、ほかの更新か分からない）で書き込まない
    expect(k.writes()).toHaveLength(1);
  });

  it('reports an unconfirmed write, not a conflict, when the resend meets a revision that the late first write advanced', async () => {
    const k = fakeKintone({ '2': { revision: 10, sections: { viewSettings: { views: {} } } } });
    k.lose(/views\.json$/, { commit: false });
    // 1 回目は応答が届かず、読み直した時点では反映されていない。送り直した 2 回目が届く直前に、1 回目が遅れて確定したことにする。
    k.beforeWrite(2, () => { k.state['2'].revision += 1; });
    const result = await apply(reflectOpts({ viewSettings: { views } }));
    expect(k.writes().map((write) => write.revision)).toEqual(['10', '10']);
    const section = result.sections[0];
    expect(section.status).toBe('ng');
    expect(section.unconfirmed).toBe(true);
    expect(section.message).not.toContain('revision 競合');
  });

  it('keeps a definite kintone rejection as a failure without re-reading or resending', async () => {
    const k = fakeKintone({ '2': { revision: 10, sections: { viewSettings: { views: {} } } } });
    const original = k.api.getMockImplementation()!;
    k.api.mockImplementation(async (url: string, method: string, body: any) => {
      if (method === 'PUT') throw { code: 'CB_VA01', id: 'req-va', message: '入力内容が正しくありません。' };
      return original(url, method, body);
    });
    const result = await apply(reflectOpts({ viewSettings: { views } }));
    expect(result.sections[0].status).toBe('ng');
    expect(result.sections[0].unconfirmed).toBeFalsy();
    expect(k.writes()).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// フィールド追加
// ---------------------------------------------------------------------------
describe('field addition when a write response is lost', () => {
  const fieldJson = JSON.stringify({ properties: { added: { type: 'SINGLE_LINE_TEXT', label: '追加' }, existing: { type: 'NUMBER', label: '更新後' } } });
  const initial = () => ({ revision: 10, sections: { fieldSettings: { properties: { existing: { type: 'NUMBER', code: 'existing', label: '数値' } } } } });

  it('does not report the applied addition as a revision conflict and does not send the update', async () => {
    const k = fakeKintone({ '2': initial() });
    k.lose(/fields\.json$/, { commit: true, method: 'POST' });
    const failure: any = await runFieldApplyStandalone({ targetAppId: '2', fieldJson, overwrite: true, skipConfirm: true }, vi.fn()).catch((error) => error);
    expect(failure).toBeInstanceOf(Error);
    expect(isRevisionConflictError(failure)).toBe(false);
    expect(failure.message).toContain('反映されたか分かりません');
    expect(failure.message).not.toContain('revision 競合');
    expect(k.writes()).toEqual([{ url: '/k/v1/preview/app/form/fields.json', method: 'POST', revision: '10' }]);
  });

  it('resends the addition after a read shows it was not applied, then sends the update with the new revision', async () => {
    const k = fakeKintone({ '2': initial() });
    k.lose(/fields\.json$/, { commit: false, method: 'POST' });
    await runFieldApplyStandalone({ targetAppId: '2', fieldJson, overwrite: true, skipConfirm: true }, vi.fn());
    expect(k.writes().map((write) => [write.method, write.revision])).toEqual([['POST', '10'], ['POST', '10'], ['PUT', '11']]);
    expect(Object.keys(k.state['2'].sections.fieldSettings.properties).sort()).toEqual(['added', 'existing']);
  });

  it('marks the target as unconfirmed (not a conflict) when applying to many targets, and continues with the next target', async () => {
    const k = fakeKintone({ '2': initial(), '3': initial() });
    k.lose(/fields\.json$/, { commit: true, method: 'POST' });
    const report = await runFieldApplyMultiStandalone({ targets: [{ appId: '2' }, { appId: '3' }], fieldJson, lookupMapJson: '', overwrite: false, skipConfirm: true }, vi.fn());
    expect(report.results.map((row) => [row.appId, row.status])).toEqual([['2', 'unconfirmed'], ['3', 'success']]);
    expect(report.counts.conflict).toBe(0);
    expect(report.results[0].message).toContain('反映されたか分かりません');
    expect(report.headline).toContain('反映されたか分からない 1 件');
  });
});

// ---------------------------------------------------------------------------
// JS/CSS 設定
// ---------------------------------------------------------------------------
describe('JS/CSS apply when a write response is lost', () => {
  const jsonText = JSON.stringify({ desktop: { js: [{ type: 'URL', url: 'https://example.test/a.js' }], css: [] }, mobile: { js: [], css: [] } });
  const initial = () => ({ revision: 7, sections: { customizeSettings: { scope: 'ALL', desktop: { js: [], css: [] }, mobile: { js: [], css: [] } } } });

  it('does not report the applied PUT as a revision conflict', async () => {
    const k = fakeKintone({ '5': initial() });
    k.lose(/customize\.json$/, { commit: true });
    const failure: any = await runApplyJsConfigStandalone({ targetAppId: '5', jsonText, skipConfirm: true }, vi.fn(), vi.fn()).catch((error) => error);
    expect(failure).toBeInstanceOf(Error);
    expect(failure.revisionConflict).toBeFalsy();
    expect(failure.message).toContain('反映されたか分かりません');
    expect(k.writes()).toHaveLength(1);
  });

  it('marks only the target whose response was lost as unconfirmed when applying to many targets', async () => {
    const k = fakeKintone({ '5': initial(), '6': initial() });
    k.lose(/customize\.json$/, { commit: true, kind: 'bad-gateway' });
    const res = await runApplyJsConfigMultiStandalone({ targets: [{ appId: '5' }, { appId: '6' }], jsonText, skipConfirm: true }, vi.fn(), vi.fn());
    expect(res.results.map((row) => [row.appId, row.status])).toEqual([['5', 'unconfirmed'], ['6', 'success']]);
    expect(res.counts.conflict).toBe(0);
    expect(res.results[0].message).toContain('反映されたか分かりません');
    expect(k.writes().map((write) => write.revision)).toEqual(['7', '7']);
  });
});
