import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { kusConfirm } from '../../src/utils';
import { RunCancelledError, __resetRunControlForTests, beginRun, requestCancel } from '../../src/runControl';
import {
  buildJsConfigApplyPlan,
  collectJsConfigFileKeys,
  planJsConfigFiles,
  runApplyJsConfigMultiStandalone,
  runApplyJsConfigStandalone,
  type JsConfigFileSource
} from '../../src/tabs/jsconfig-standalone';

vi.mock('../../src/utils', async original => ({ ...await original<typeof import('../../src/utils')>(), kusConfirm: vi.fn() }));

// 別アプリの FILE 形式（アップロード済みファイル）を反映する: 取得元から本体を取得し、反映先に同じ枠・同名・同内容のファイルがあれば再利用、
// 無ければ反映先へアップロードして新しい fileKey で設定する。合成の kintone（customize.json と file.json）につないで確かめる。

type Call = { method: string; url: string; body?: any };
let calls: Call[];
/** fileKey → 本体。取得元・反映先どちらのファイルもここから返す（実 kintone の fileKey は環境内で一意） */
let storedFiles: Record<string, string>;
/** アプリ別の現在のプレビュー設定 */
let currentByApp: Record<string, any>;
let revisions: Record<string, string>;
let uploadCounter: number;
let uploadHook: (fileName: string, count: number) => Response | Promise<Response> | undefined;
let getFileFail: Record<string, number>;
let putHook: (app: string, body: any) => Promise<any> | any;

const key = (app: string, guest = '') => `${guest}/${app}`;
const urlOf = (guest: string, preview = false) => `/k/${guest ? `guest/${guest}/` : ''}v1${preview ? '/preview' : ''}`;
const fileItem = (fileKey: string, name: string) => ({ type: 'FILE', file: { fileKey, name, contentType: 'text/javascript', size: '10' } });
const urlItem = (url: string) => ({ type: 'URL', url });
const emptyCurrent = () => ({ scope: 'ALL', desktop: { js: [], css: [] }, mobile: { js: [], css: [] } });
const source = (extra: Partial<JsConfigFileSource> = {}): JsConfigFileSource => ({ guestId: '', label: 'App 12 / 本番', knownFileKeys: ['src-a', 'src-b', 'src-c'], ...extra });
const jsonOf = (desktopJs: any[], extra: any = {}) => JSON.stringify({ scope: 'ALL', desktop: { js: desktopJs, css: [] }, mobile: { js: [], css: [] }, ...extra });
const targets = (...ids: string[]) => ids.map(appId => ({ appId, guestId: '' }));

beforeEach(() => {
  vi.clearAllMocks();
  __resetRunControlForTests();
  calls = [];
  storedFiles = { 'src-a': 'console.log("a");', 'src-b': 'body{color:red}', 'src-c': 'console.log("c");' };
  currentByApp = {};
  revisions = {};
  uploadCounter = 0;
  uploadHook = () => undefined;
  getFileFail = {};
  putHook = (app) => ({ revision: String(Number(revisions[app]) + 1) });
  vi.mocked(kusConfirm).mockReturnValue(true);
  const api = vi.fn(async (url: string, method: string, body: any) => {
    calls.push({ method, url, body });
    const app = String(body.app);
    const guest = /\/guest\/(\d+)\//.exec(url)?.[1] || '';
    if (method === 'GET') return { revision: revisions[app], ...(currentByApp[key(app, guest)] || emptyCurrent()) };
    return putHook(app, body);
  });
  vi.stubGlobal('kintone', { api: Object.assign(api, { url: (p: string) => p }), getRequestToken: () => 'token' });
  vi.stubGlobal('fetch', vi.fn(async (url: string, init: any) => {
    if (init?.method === 'POST') {
      const form = init.body as FormData;
      const file = form.get('file') as File;
      calls.push({ method: 'POST', url, body: { name: file.name, size: file.size } });
      const hooked = await uploadHook(file.name, ++uploadCounter);
      if (hooked) return hooked;
      const fileKey = `up-${uploadCounter}`;
      storedFiles[fileKey] = await file.text();
      return new Response(JSON.stringify({ fileKey }), { status: 200 });
    }
    calls.push({ method: 'FILE-GET', url });
    const fileKey = decodeURIComponent(String(url).split('fileKey=')[1] || '');
    if (getFileFail[fileKey]) return new Response('{}', { status: getFileFail[fileKey] });
    if (storedFiles[fileKey] === undefined) return new Response('{}', { status: 404 });
    return new Response(new Blob([storedFiles[fileKey]], { type: 'text/javascript' }), { status: 200 });
  }));
});
afterEach(() => vi.unstubAllGlobals());

const puts = () => calls.filter(c => c.method === 'PUT');
const posts = () => calls.filter(c => c.method === 'POST');
const fileGets = () => calls.filter(c => c.method === 'FILE-GET');
const setApp = (app: string, current: any, revision = '5', guest = '') => { currentByApp[key(app, guest)] = current; revisions[app] = revision; };

describe('planJsConfigFiles', () => {
  it('collects the fileKeys of a fetched JSON and aligns plan.files with the payload positions', () => {
    const data = { desktop: { js: [urlItem('https://x/a.js'), { type: 'FILE', file: {} }, fileItem('src-a', 'a.js')], css: [] }, mobile: { js: [], css: [fileItem('src-b', 'b.css'), { type: 'file', file: { fileKey: 'src-a', name: 'a.js' } }] } };
    expect(collectJsConfigFileKeys(data).sort()).toEqual(['src-a', 'src-b']);
    const plan = buildJsConfigApplyPlan(data);
    expect(plan.files.map(f => [f.platform, f.kind, f.index, f.fileKey, f.name])).toEqual([
      ['desktop', 'js', 1, 'src-a', 'a.js'], ['mobile', 'css', 0, 'src-b', 'b.css'], ['mobile', 'css', 1, 'src-a', 'a.js']
    ]);
    expect((plan.payload as any).desktop.js[1].file.fileKey).toBe('src-a');
  });

  it('keeps a fileKey that the target already uses in the same slot, without downloading anything', async () => {
    const plan = buildJsConfigApplyPlan(JSON.parse(jsonOf([fileItem('src-a', 'a.js')])));
    const current = { ...emptyCurrent(), desktop: { js: [fileItem('src-a', 'a.js')], css: [] } };
    const filePlan = await planJsConfigFiles(plan, current, { source: source(), targetGuestId: '' });
    expect(filePlan.items.map(i => i.action)).toEqual(['keep']);
    expect(filePlan.problems).toEqual([]);
    expect(fileGets()).toEqual([]);
  });
});

describe('apply JS/CSS with FILE entries to another app', () => {
  const json = jsonOf([fileItem('src-a', 'a.js'), urlItem('https://example.test/u.js')]);

  it('downloads the body from the source, uploads it to the target before the PUT, and sends the new fileKey', async () => {
    setApp('5', { ...emptyCurrent(), desktop: { js: [urlItem('https://example.test/old.js')], css: [] } });
    const logs = vi.fn();
    await runApplyJsConfigStandalone({ targetAppId: '5', jsonText: json, fileSource: source() }, vi.fn(), logs);

    expect(calls.map(c => [c.method, c.url])).toEqual([
      ['GET', '/k/v1/preview/app/customize.json'],
      ['FILE-GET', '/k/v1/file.json?fileKey=src-a'],
      ['POST', '/k/v1/file.json'],
      ['PUT', '/k/v1/preview/app/customize.json']
    ]);
    expect(posts()[0].body).toEqual({ name: 'a.js', size: 'console.log("a");'.length });
    expect(puts()[0].body.desktop.js).toEqual([{ type: 'FILE', file: { fileKey: 'up-1' } }, { type: 'URL', url: 'https://example.test/u.js' }]);
    expect(puts()[0].body.revision).toBe('5');
    // 取得元のキーを書き込みに流用しない
    expect(JSON.stringify(puts()[0].body)).not.toContain('src-a');
    const text = vi.mocked(kusConfirm).mock.calls[0][0];
    expect(text).toContain('FILE 形式のファイル 1件の扱い');
    expect(text).toContain('反映先へアップロードする: 1件');
    expect(text).toContain('PC JS: a.js（17 B）');
    expect(text).toContain('取得元（App 12 / 本番）');
    expect(text).toContain('外れる現在の設定: 1件');
    expect(logs.mock.calls[0][0]).toContain('アップロード 1件 / 再利用 0件 / そのまま 0件');
  });

  it('does not upload when the target already uses the same fileKey in the same slot (round trip to the same app)', async () => {
    setApp('5', { ...emptyCurrent(), desktop: { js: [fileItem('src-a', 'a.js')], css: [] } });
    await runApplyJsConfigStandalone({ targetAppId: '5', jsonText: json, fileSource: source() }, vi.fn(), vi.fn());
    expect(fileGets()).toEqual([]);
    expect(posts()).toEqual([]);
    expect(puts()[0].body.desktop.js[0]).toEqual({ type: 'FILE', file: { fileKey: 'src-a' } });
    expect(vi.mocked(kusConfirm).mock.calls[0][0]).toContain('そのまま使う: 1件');
  });

  it('reuses a same-name, same-content file that the target already has in the slot (different fileKey)', async () => {
    storedFiles['tgt-a'] = storedFiles['src-a'];
    setApp('5', { ...emptyCurrent(), desktop: { js: [fileItem('tgt-a', 'a.js')], css: [] } });
    await runApplyJsConfigStandalone({ targetAppId: '5', jsonText: json, fileSource: source() }, vi.fn(), vi.fn());
    expect(posts()).toEqual([]);
    expect(puts()[0].body.desktop.js[0]).toEqual({ type: 'FILE', file: { fileKey: 'tgt-a' } });
    expect(vi.mocked(kusConfirm).mock.calls[0][0]).toContain('同名・同内容のファイルを使う: 1件');
  });

  it('uploads when the same name has different content, and when the same file is in another slot', async () => {
    storedFiles['tgt-a'] = 'console.log("different");';
    setApp('5', { ...emptyCurrent(), desktop: { js: [fileItem('tgt-a', 'a.js')], css: [] }, mobile: { js: [fileItem('src-a', 'a.js')], css: [] } });
    await runApplyJsConfigStandalone({ targetAppId: '5', jsonText: json, fileSource: source() }, vi.fn(), vi.fn());
    expect(posts().length).toBe(1);
    expect(puts()[0].body.desktop.js[0].file.fileKey).toBe('up-1');
  });

  it('uploads the same file once per slot because an uploaded key can be used only once', async () => {
    setApp('5', emptyCurrent());
    const text = JSON.stringify({ desktop: { js: [fileItem('src-a', 'a.js')], css: [] }, mobile: { js: [fileItem('src-a', 'a.js')], css: [] } });
    await runApplyJsConfigStandalone({ targetAppId: '5', jsonText: text, fileSource: source() }, vi.fn(), vi.fn());
    expect(fileGets().length).toBe(1);
    expect(posts().length).toBe(2);
    const body = puts()[0].body;
    expect([body.desktop.js[0].file.fileKey, body.mobile.js[0].file.fileKey]).toEqual(['up-1', 'up-2']);
  });

  it('refuses a JSON whose origin is unknown, with the next step, before the confirmation and any write', async () => {
    setApp('5', emptyCurrent());
    await expect(runApplyJsConfigStandalone({ targetAppId: '5', jsonText: json, fileSource: null }, vi.fn(), vi.fn()))
      .rejects.toThrow(/取得元が分からないファイルが 1件[\s\S]*取得元アプリで「取得」してから反映してください[\s\S]*「a\.js」（PC JS）/);
    expect(kusConfirm).not.toHaveBeenCalled();
    expect(fileGets()).toEqual([]);
    expect(posts()).toEqual([]);
    expect(puts()).toEqual([]);
  });

  it('refuses a fileKey that was added after fetching (not in the fetched JSON) without guessing where it lives', async () => {
    setApp('5', emptyCurrent());
    const text = jsonOf([fileItem('src-a', 'a.js'), fileItem('manual-key', 'manual.js')]);
    await expect(runApplyJsConfigStandalone({ targetAppId: '5', jsonText: text, fileSource: source() }, vi.fn(), vi.fn()))
      .rejects.toThrow(/取得元が分からないファイルが 1件[\s\S]*「manual\.js」/);
    expect(fileGets().map(c => c.url)).not.toContain('/k/v1/file.json?fileKey=manual-key');
    expect(posts()).toEqual([]);
    expect(puts()).toEqual([]);
  });

  it('uses a body embedded in the JSON (backup) even when the origin is unknown', async () => {
    setApp('5', emptyCurrent());
    const item = { type: 'FILE', file: { fileKey: 'old-key', name: 'a.js', _content: { base64: btoa('embedded();'), contentType: 'text/javascript', byteSize: 11 } } };
    await runApplyJsConfigStandalone({ targetAppId: '5', jsonText: jsonOf([item]), fileSource: null }, vi.fn(), vi.fn());
    expect(fileGets()).toEqual([]);
    expect(posts()[0].body).toEqual({ name: 'a.js', size: 11 });
    expect(puts()[0].body.desktop.js[0].file.fileKey).toBe('up-1');
  });

  it('does not write anything when the source file cannot be downloaded', async () => {
    setApp('5', emptyCurrent());
    getFileFail['src-a'] = 404;
    await expect(runApplyJsConfigStandalone({ targetAppId: '5', jsonText: json, fileSource: source() }, vi.fn(), vi.fn()))
      .rejects.toThrow(/ファイル 1件を反映先へ渡せません[\s\S]*取得元アプリで「取得」してから[\s\S]*HTTP 404[\s\S]*書き込んでいません/);
    expect(kusConfirm).not.toHaveBeenCalled();
    expect(posts()).toEqual([]);
    expect(puts()).toEqual([]);
  });

  it('blocks a FILE entry without a name (the extension decides JS or CSS)', async () => {
    setApp('5', emptyCurrent());
    const item = { type: 'FILE', file: { fileKey: 'src-a' } };
    await expect(runApplyJsConfigStandalone({ targetAppId: '5', jsonText: jsonOf([item]), fileSource: source() }, vi.fn(), vi.fn()))
      .rejects.toThrow(/ファイル名がありません/);
    expect(posts()).toEqual([]);
    expect(puts()).toEqual([]);
  });

  it('does not PUT when an upload fails, and says nothing was written', async () => {
    setApp('5', emptyCurrent());
    uploadHook = () => new Response(JSON.stringify({ code: 'GAIA_X', message: 'サイズが大きすぎます' }), { status: 413 });
    await expect(runApplyJsConfigStandalone({ targetAppId: '5', jsonText: json, fileSource: source() }, vi.fn(), vi.fn()))
      .rejects.toThrow(/「a\.js」（PC JS）のアップロードに失敗しました[\s\S]*HTTP 413[\s\S]*反映先の設定は書き込んでいません/);
    expect(puts()).toEqual([]);
  });

  it('does not upload or PUT when the confirmation is declined', async () => {
    setApp('5', emptyCurrent());
    vi.mocked(kusConfirm).mockReturnValue(false);
    await runApplyJsConfigStandalone({ targetAppId: '5', jsonText: json, fileSource: source() }, vi.fn(), vi.fn());
    expect(posts()).toEqual([]);
    expect(puts()).toEqual([]);
  });

  it('stops without a PUT when cancelled during the uploads, and tells that the uploaded files stay unused', async () => {
    setApp('5', emptyCurrent());
    const token = beginRun();
    uploadHook = (_name, count) => { if (count === 1) requestCancel(token); return undefined; };
    const text = jsonOf([fileItem('src-a', 'a.js'), fileItem('src-c', 'c.js')]);
    const logs = vi.fn();
    await expect(runApplyJsConfigStandalone({ targetAppId: '5', jsonText: text, fileSource: source() }, vi.fn(), logs)).rejects.toBeInstanceOf(RunCancelledError);
    expect(posts().length).toBe(1);
    expect(puts()).toEqual([]);
    expect(logs.mock.calls[0][0]).toContain('反映先の設定は書き込んでいません');
    expect(logs.mock.calls[0][0]).toContain('使われずに残りますが、設定には影響しません');
  });

  it('uses the guest space URLs of the source for the download and of the target for the upload and the PUT', async () => {
    setApp('5', emptyCurrent(), '5', '7');
    await runApplyJsConfigStandalone({ targetAppId: '5', targetGuestId: '7', jsonText: json, fileSource: source({ guestId: '3' }) }, vi.fn(), vi.fn());
    expect(calls.map(c => [c.method, c.url])).toEqual([
      ['GET', '/k/guest/7/v1/preview/app/customize.json'],
      ['FILE-GET', '/k/guest/3/v1/file.json?fileKey=src-a'],
      ['POST', '/k/guest/7/v1/file.json'],
      ['PUT', '/k/guest/7/v1/preview/app/customize.json']
    ]);
  });

  it('never writes to production paths', async () => {
    setApp('5', emptyCurrent());
    await runApplyJsConfigStandalone({ targetAppId: '5', jsonText: json, fileSource: source() }, vi.fn(), vi.fn());
    const writes = calls.filter(c => c.method === 'PUT' || c.method === 'POST');
    expect(writes.every(c => c.url.includes('/preview/') || c.url.endsWith('/file.json'))).toBe(true);
  });
});

describe('apply JS/CSS with FILE entries to many preview targets', () => {
  const json = jsonOf([fileItem('src-a', 'a.js'), urlItem('https://example.test/u.js')]);

  it('downloads the source once, uploads per target, and shows the uploads in the single confirmation', async () => {
    setApp('5', emptyCurrent()); setApp('6', emptyCurrent(), '3'); setApp('7', emptyCurrent(), '9');
    const res = await runApplyJsConfigMultiStandalone({ targets: targets('5', '6', '7'), jsonText: json, fileSource: source() }, vi.fn(), vi.fn());

    expect(kusConfirm).toHaveBeenCalledTimes(1);
    const text = vi.mocked(kusConfirm).mock.calls[0][0];
    expect(text).toContain('FILE 形式のファイルは、反映先ごとに次のとおり扱います');
    expect(text).toContain('反映先へアップロードする: 合計 3件');
    expect(text).toContain('PC JS: a.js（17 B）→ 3件の反映先');
    expect(text).toContain('ファイルはアップロード 1件・再利用 0件・そのまま 0件');
    expect(fileGets().filter(c => c.url.includes('src-a')).length).toBe(1);
    expect(posts().length).toBe(3);
    expect(puts().map(c => [c.body.app, c.body.desktop.js[0].file.fileKey, c.body.revision])).toEqual([['5', 'up-1', '5'], ['6', 'up-2', '3'], ['7', 'up-3', '9']]);
    // 各反映先の書き込みの直前にアップロードする（書き込み前の確認で何もアップロードしない）
    const order = calls.filter(c => c.method === 'POST' || c.method === 'PUT').map(c => c.method + (c.body.app || ''));
    expect(order).toEqual(['POST', 'PUT5', 'POST', 'PUT6', 'POST', 'PUT7']);
    expect(res.counts).toEqual({ total: 3, success: 3, failed: 0, conflict: 0, notExecuted: 0 });
    expect(res.results[0].files).toEqual({ uploaded: 1, reused: 0, kept: 0 });
  });

  it('fails only the target whose upload failed (no PUT there) and continues with the rest', async () => {
    setApp('5', emptyCurrent()); setApp('6', emptyCurrent()); setApp('7', emptyCurrent());
    uploadHook = (_name, count) => count === 2 ? new Response('{}', { status: 500 }) : undefined;
    const res = await runApplyJsConfigMultiStandalone({ targets: targets('5', '6', '7'), jsonText: json, fileSource: source() }, vi.fn(), vi.fn());
    expect(puts().map(c => c.body.app)).toEqual(['5', '7']);
    expect(res.results.map(r => r.status)).toEqual(['success', 'failed', 'success']);
    expect(res.results[1].message).toContain('アップロードに失敗しました');
    expect(res.results[1].message).toContain('この反映先には書き込んでいません');
    expect(res.results[1].precheck).toBeUndefined();
    expect(res.tone).toBe('warn');
  });

  it('records a revision conflict on one target after its upload and continues', async () => {
    setApp('5', emptyCurrent()); setApp('6', emptyCurrent());
    putHook = (app) => {
      if (app === '5') throw Object.assign(new Error('更新が競合しています'), { code: 'GAIA_CO02' });
      return { revision: '99' };
    };
    const res = await runApplyJsConfigMultiStandalone({ targets: targets('5', '6'), jsonText: json, fileSource: source() }, vi.fn(), vi.fn());
    expect(res.results.map(r => r.status)).toEqual(['conflict', 'success']);
  });

  it('mixes uploads, reuse and keep per target', async () => {
    storedFiles['tgt-a'] = storedFiles['src-a'];
    setApp('5', emptyCurrent());
    setApp('6', { ...emptyCurrent(), desktop: { js: [fileItem('tgt-a', 'a.js')], css: [] } });
    setApp('7', { ...emptyCurrent(), desktop: { js: [fileItem('src-a', 'a.js')], css: [] } });
    const res = await runApplyJsConfigMultiStandalone({ targets: targets('5', '6', '7'), jsonText: json, fileSource: source() }, vi.fn(), vi.fn());
    expect(posts().length).toBe(1);
    expect(puts().map(c => c.body.desktop.js[0].file.fileKey)).toEqual(['up-1', 'tgt-a', 'src-a']);
    expect(res.results.map(r => r.files)).toEqual([{ uploaded: 1, reused: 0, kept: 0 }, { uploaded: 0, reused: 1, kept: 0 }, { uploaded: 0, reused: 0, kept: 1 }]);
  });

  it('shows one message and stops before the confirmation when no target can receive the files because the origin is unknown', async () => {
    setApp('5', emptyCurrent()); setApp('6', emptyCurrent());
    await expect(runApplyJsConfigMultiStandalone({ targets: targets('5', '6'), jsonText: json, fileSource: null }, vi.fn(), vi.fn()))
      .rejects.toThrow(/取得元が分からないファイルが 1件[\s\S]*取得元アプリで「取得」してから反映してください[\s\S]*全2件の反映先で同じ理由です/);
    expect(kusConfirm).not.toHaveBeenCalled();
    expect(posts()).toEqual([]);
    expect(puts()).toEqual([]);
  });

  it('with an unknown origin, still applies to a target that already uses the same fileKey and fails the others before any write', async () => {
    setApp('5', emptyCurrent());
    setApp('6', { ...emptyCurrent(), desktop: { js: [fileItem('src-a', 'a.js')], css: [] } });
    const res = await runApplyJsConfigMultiStandalone({ targets: targets('5', '6'), jsonText: json, fileSource: null }, vi.fn(), vi.fn());
    expect(res.results.map(r => [r.appId, r.status, r.precheck])).toEqual([['5', 'failed', true], ['6', 'success', undefined]]);
    expect(res.results[0].message).toContain('取得元が分からないファイル');
    expect(vi.mocked(kusConfirm).mock.calls[0][0]).toContain('現在の設定を確認できなかった 1件は反映しません');
    expect(puts().map(c => c.body.app)).toEqual(['6']);
    expect(posts()).toEqual([]);
  });

  it('fails every target before any write when the source file cannot be downloaded', async () => {
    setApp('5', emptyCurrent()); setApp('6', emptyCurrent());
    getFileFail['src-a'] = 500;
    const status = vi.fn();
    const res = await runApplyJsConfigMultiStandalone({ targets: targets('5', '6'), jsonText: json, fileSource: source() }, status, vi.fn());
    expect(res.counts).toMatchObject({ success: 0, failed: 2 });
    expect(res.results.every(r => r.precheck)).toBe(true);
    expect(kusConfirm).not.toHaveBeenCalled();
    expect(posts()).toEqual([]);
    expect(puts()).toEqual([]);
  });

  it('uploads to the guest space of each target', async () => {
    setApp('5', emptyCurrent(), '5', '2'); setApp('6', emptyCurrent(), '3', '');
    await runApplyJsConfigMultiStandalone({ targets: [{ appId: '5', guestId: '2' }, { appId: '6', guestId: '' }], jsonText: json, fileSource: source({ guestId: '9' }) }, vi.fn(), vi.fn());
    expect(posts().map(c => c.url)).toEqual(['/k/guest/2/v1/file.json', '/k/v1/file.json']);
    expect(fileGets().map(c => c.url)).toEqual(['/k/guest/9/v1/file.json?fileKey=src-a']);
    expect(puts().map(c => c.url)).toEqual(['/k/guest/2/v1/preview/app/customize.json', '/k/v1/preview/app/customize.json']);
  });

  it('marks the rest as not executed when cancelled during an upload, writes nothing for that target, and notes the unused uploads', async () => {
    setApp('5', emptyCurrent()); setApp('6', emptyCurrent()); setApp('7', emptyCurrent());
    const token = beginRun();
    const text = jsonOf([fileItem('src-a', 'a.js'), fileItem('src-c', 'c.js')]);
    // 反映先 6 の 1 つ目のアップロードの後に中止する（アップロード通算 3 回目）
    uploadHook = (_name, count) => { if (count === 3) requestCancel(token); return undefined; };
    const html = vi.fn();
    const res = await runApplyJsConfigMultiStandalone({ targets: targets('5', '6', '7'), jsonText: text, fileSource: source() }, vi.fn(), html);
    expect(puts().map(c => c.body.app)).toEqual(['5']);
    expect(res.cancelled).toBe(true);
    expect(res.results.map(r => r.status)).toEqual(['success', 'notExecuted', 'notExecuted']);
    expect(res.results[1].message).toContain('アップロード中に中止したため、この反映先には書き込んでいません');
    expect(res.headline).toContain('反映済みの 1件は取り消していません');
    expect(res.note).toContain('アップロード済みの 1件のファイルは、使われずに残ります');
    expect(html.mock.calls[0][0]).toContain('使われずに残ります');
  });
});
