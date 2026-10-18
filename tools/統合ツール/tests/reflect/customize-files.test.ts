import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildCustomizeSettingsPutPayload } from '../../src/constants';
import {
  base64ToBytes, bytesToBase64, comparableCustomizePayload, customizeFileNames, embedCustomizeFileContents, resolveCustomizeFiles
} from '../../src/reflect/customizeFiles';
import { buildReflectSectionPlan } from '../../src/reflect/standalonePlan';
import { previewReflectStandalone, runApplyPreviewStandalone } from '../../src/tabs/reflect-standalone';

const file = (key: string, name: string, extra: Record<string, unknown> = {}) => ({ type: 'FILE', file: { fileKey: key, name, contentType: 'text/javascript', size: '10', ...extra } });
const section = (desktopJs: any[] = [], extra: Record<string, any> = {}) => ({ revision: '5', scope: 'ALL', desktop: { js: desktopJs, css: [] }, mobile: { js: [], css: [] }, ...extra });
const blobOf = (text: string, type = 'text/javascript') => new Blob([text], { type });
const textOf = async (blob: Blob) => blob.text();
/** fileKey → 本体 の辞書から download を作る。値が Error なら失敗させ、呼び出しを記録する。 */
function downloader(bodies: Record<string, string | Error>) {
  const calls: Array<[string, string]> = [];
  const download = vi.fn(async (guestId: string, fileKey: string) => {
    calls.push([guestId, fileKey]);
    const body = bodies[fileKey];
    if (body === undefined || body instanceof Error) throw body ?? new Error('HTTP 404');
    return blobOf(body);
  });
  return { download, calls };
}

describe('base64 helpers', () => {
  it('round-trips large binary data without overflowing the stack', () => {
    const bytes = new Uint8Array(600_000).map((_, index) => (index * 31 + 7) % 256);
    const decoded = base64ToBytes(bytesToBase64(bytes));
    expect(decoded.length).toBe(bytes.length);
    expect(decoded.every((byte, index) => byte === bytes[index])).toBe(true);
    expect(bytesToBase64(new Uint8Array(0))).toBe('');
  });
});

describe('resolveCustomizeFiles', () => {
  const opts = { sourceGuestId: '1', targetGuestId: '2' };

  it('treats keys already in the target as existing without downloading anything', async () => {
    const { download, calls } = downloader({});
    const resolution = await resolveCustomizeFiles(section([file('same', 'a.js')]), section([file('same', 'a.js')]), { ...opts, download });
    expect(resolution.files).toEqual({ same: { status: 'existing' } });
    expect(calls).toEqual([]);
  });

  it('reuses a target file with the same name and content, uploads otherwise, and reports unavailable files', async () => {
    const { download, calls } = downloader({ srcA: 'console.log(1)', srcB: 'console.log(2)', srcC: 'console.log(3)', tgtA: 'console.log(1)', tgtB: 'console.log(3)', gone: new Error('HTTP 404') });
    const source = section([file('srcA', 'a.js'), file('srcB', 'b.js'), file('srcC', 'c.js'), file('missing', 'x.js')]);
    const target = section([file('tgtA', 'a.js'), file('tgtB', 'renamed.js'), file('gone', 'g.js')]);
    const resolution = await resolveCustomizeFiles(source, target, { ...opts, download });
    expect(resolution.files.srcA).toMatchObject({ status: 'reuse', targetFileKey: 'tgtA', byteSize: 14 });
    expect(resolution.files.srcB).toMatchObject({ status: 'upload', byteSize: 14, contentType: 'text/javascript' });
    // 内容が同じでも名前が違えば再利用しない。
    expect(resolution.files.srcC).toMatchObject({ status: 'upload' });
    expect(resolution.files.srcC).not.toHaveProperty('targetFileKey');
    expect(resolution.files.missing).toEqual({ status: 'unavailable', reason: 'HTTP 404' });
    expect(resolution.hashes.srcA).toBe(resolution.hashes.tgtA);
    expect(resolution.hashes.srcC).toBe(resolution.hashes.tgtB);
    expect(resolution.hashes.gone).toBeUndefined();
    expect(await textOf(resolution.blobs.get('srcB')!)).toBe('console.log(2)');
    expect(resolution.blobs.has('missing')).toBe(false);
    // 反映元は反映元のゲスト、反映先は反映先のゲストから取得する。
    expect(calls.filter(([, key]) => key.startsWith('src')).every(([guest]) => guest === '1')).toBe(true);
    expect(calls.filter(([, key]) => key.startsWith('tgt')).every(([guest]) => guest === '2')).toBe(true);
  });

  it('downloads a source file shared by desktop and mobile only once', async () => {
    const { download, calls } = downloader({ shared: 'x', other: 'y' });
    const source = section([file('shared', 'a.js')], { mobile: { js: [file('shared', 'a.js')], css: [] } });
    const resolution = await resolveCustomizeFiles(source, section([file('other', 'o.js')]), { ...opts, download });
    expect(calls.filter(([, key]) => key === 'shared')).toHaveLength(1);
    expect(resolution.files.shared.status).toBe('upload');
  });

  it('keeps going when a target file cannot be downloaded: it is only excluded from reuse', async () => {
    const { download } = downloader({ src: 'same', tgt: new Error('HTTP 403') });
    const resolution = await resolveCustomizeFiles(section([file('src', 'a.js')]), section([file('tgt', 'a.js')]), { ...opts, download });
    expect(resolution.files.src.status).toBe('upload');
  });

  it('guesses the content type from the extension when nothing else is known', async () => {
    const download = vi.fn(async () => new Blob(['a{}']));
    const resolution = await resolveCustomizeFiles(section([], { desktop: { js: [], css: [{ type: 'FILE', file: { fileKey: 'css1', name: 'style.css' } }] } }), section([file('other', 'o.js')]), { ...opts, download });
    expect(resolution.files.css1).toMatchObject({ status: 'upload', contentType: 'text/css' });
  });

  it('resolves embedded backup content without downloading the source file', async () => {
    const { download, calls } = downloader({ tgt: 'embedded body' });
    const embedded = file('old-key', 'a.js', { _content: { base64: bytesToBase64(new TextEncoder().encode('embedded body')), contentType: 'text/javascript', byteSize: 13 } });
    const resolution = await resolveCustomizeFiles(section([embedded]), section([file('tgt', 'a.js')]), { ...opts, download });
    expect(calls.map(([, key]) => key)).toEqual(['tgt']);
    expect(resolution.files['old-key']).toMatchObject({ status: 'reuse', targetFileKey: 'tgt' });
    const upload = await resolveCustomizeFiles(section([embedded]), section([file('other', 'o.js')]), { ...opts, download: downloader({ other: 'zzz' }).download });
    expect(upload.files['old-key']).toMatchObject({ status: 'upload', byteSize: 13 });
    expect(await textOf(upload.blobs.get('old-key')!)).toBe('embedded body');
  });

  it('is safe with prototype-like file keys', async () => {
    const download = vi.fn(async () => blobOf('x'));
    const resolution = await resolveCustomizeFiles(section([file('__proto__', 'a.js')]), section([file('other', 'o.js')]), { ...opts, download });
    expect(Object.keys(resolution.files)).toEqual(['__proto__']);
    expect(resolution.files['__proto__'].status).toBe('upload');
  });
});

describe('embedCustomizeFileContents', () => {
  it('embeds file bodies into a copy and leaves the original untouched', async () => {
    const original = section([file('a', 'a.js'), file('b', 'b.js'), { type: 'URL', url: 'https://example.com/x.js' }]);
    const frozen = structuredClone(original);
    const { download } = downloader({ a: 'AAA', b: new Error('HTTP 500') });
    const result = await embedCustomizeFileContents(original, { guestId: '9', download });
    expect(original).toEqual(frozen);
    const [a, b, url] = result.section.desktop.js;
    expect(a.file._content).toEqual({ base64: bytesToBase64(new TextEncoder().encode('AAA')), contentType: 'text/javascript', byteSize: 3 });
    expect(b.file._contentUnavailable).toBe('HTTP 500');
    expect(url).toEqual({ type: 'URL', url: 'https://example.com/x.js' });
    expect(result.unavailable).toEqual([{ fileKey: 'b', name: 'b.js', reason: 'HTTP 500' }]);
    expect(download).toHaveBeenCalledWith('9', 'a');
  });
});

describe('comparableCustomizePayload', () => {
  it('turns FILE items into name + content hash when known, and name + fileKey otherwise', () => {
    const payload = { desktop: { js: [{ type: 'FILE', file: { fileKey: 'k1' } }, { type: 'FILE', file: { fileKey: 'k2' } }, { type: 'URL', url: 'u' }], css: [] }, mobile: { js: [], css: [] }, scope: 'ALL' };
    const resolution = { files: {}, hashes: { k1: 'hash1' }, blobs: new Map() };
    const names = customizeFileNames(section([file('k1', 'one.js'), file('k2', 'two.js')]));
    const out = comparableCustomizePayload(payload, resolution, names);
    expect(out.desktop.js).toEqual([{ type: 'FILE', file: { name: 'one.js', contentHash: 'hash1' } }, { type: 'FILE', file: { name: 'two.js', fileKey: 'k2' } }, { type: 'URL', url: 'u' }]);
    expect(out.scope).toBe('ALL');
    expect(payload.desktop.js[0]).toEqual({ type: 'FILE', file: { fileKey: 'k1' } });
    expect(comparableCustomizePayload(payload, undefined, names).desktop.js[0]).toEqual({ type: 'FILE', file: { name: 'one.js', fileKey: 'k1' } });
  });

  it('does not leak embedded backup content into the PUT payload', () => {
    const input = section([file('k', 'a.js', { _content: { base64: 'QQ==', contentType: 'text/javascript', byteSize: 1 }, _contentUnavailable: 'x' })]);
    expect(JSON.stringify(buildCustomizeSettingsPutPayload(input))).not.toContain('_content');
    expect(buildCustomizeSettingsPutPayload(input)).toMatchObject({ desktop: { js: [{ type: 'FILE', file: { fileKey: 'k' } }] } });
  });
});

describe('customizeSettings plan with resolved files', () => {
  const resolve = (source: any, target: any, bodies: Record<string, string | Error>) => resolveCustomizeFiles(source, target, { sourceGuestId: '', targetGuestId: '', download: downloader(bodies).download });

  it('replaces reused keys, records uploads with their index and raises no blocker', async () => {
    const source = section([file('srcA', 'a.js'), file('srcB', 'b.js')], { mobile: { js: [file('srcB', 'b.js')], css: [] } });
    const target = section([file('tgtA', 'a.js')]);
    const resolution = await resolve(source, target, { srcA: 'A', srcB: 'BBBB', tgtA: 'A' });
    const plan = buildReflectSectionPlan('customizeSettings', source, target, { customizeFiles: resolution });
    expect(plan.blockers).toEqual([]);
    expect(plan.status).toBe('change');
    const [operation] = plan.operations;
    expect(operation.body.desktop.js).toEqual([{ type: 'FILE', file: { fileKey: 'tgtA' } }, { type: 'FILE', file: { fileKey: 'srcB' } }]);
    const bResult = { sourceFileKey: 'srcB', name: 'b.js', byteSize: 4 };
    expect(operation.uploads).toEqual([{ platform: 'desktop', kind: 'js', index: 1, ...bResult }, { platform: 'mobile', kind: 'js', index: 0, ...bResult }]);
    expect(plan.fileUploads).toEqual(operation.uploads);
    expect(plan.warnings.join('\n')).toContain('1 件のファイル');
    expect(plan.warnings.join('\n')).not.toContain('含みません');
    // 内訳にはファイル名が表示され、反映先キーへ置換した項目は差分に出ない。
    expect(plan.changes.some(change => change.after.includes('b.js'))).toBe(true);
    expect(plan.changes.some(change => change.after.includes('a.js'))).toBe(false);
  });

  it('reports no change and no write when a different key holds the same file', async () => {
    const source = section([file('srcA', 'a.js')]), target = section([file('tgtA', 'a.js')]);
    const resolution = await resolve(source, target, { srcA: 'same', tgtA: 'same' });
    const plan = buildReflectSectionPlan('customizeSettings', source, target, { customizeFiles: resolution });
    expect(plan.status).toBe('same');
    expect(plan.operations).toEqual([]);
    expect(plan.fileUploads).toBeUndefined();
  });

  it('shows a file replaced by different content as a change', async () => {
    const source = section([file('srcA', 'a.js')]), target = section([file('tgtA', 'a.js')]);
    const resolution = await resolve(source, target, { srcA: 'new', tgtA: 'old' });
    const plan = buildReflectSectionPlan('customizeSettings', source, target, { customizeFiles: resolution });
    expect(plan.status).toBe('change');
    expect(plan.operations[0].uploads).toHaveLength(1);
  });

  it('blocks with the file name and reason when the source file cannot be fetched', async () => {
    const source = section([file('srcA', 'app.js')]), target = section([file('tgtA', 't.js')]);
    const resolution = await resolve(source, target, { srcA: new Error('HTTP 403'), tgtA: 'x' });
    const plan = buildReflectSectionPlan('customizeSettings', source, target, { customizeFiles: resolution });
    expect(plan.status).toBe('error');
    expect(plan.blockers[0]).toContain('desktop/js: 「app.js」を反映元から取得できません（HTTP 403）');
  });

  it('keeps blocking foreign keys when no resolution is available', () => {
    const plan = buildReflectSectionPlan('customizeSettings', section([file('foreign', 'app.js')]), section());
    expect(plan.status).toBe('error');
    expect(plan.blockers[0]).toContain('「app.js」');
    expect(plan.blockers[0]).toContain('ファイル本体を確認できません');
  });
});

describe('preview reflection with file upload', () => {
  let order: string[];
  let writes: Array<[string, string, any]>;
  let uploads: Array<{ url: string; token: unknown; name: string; text: string; headers: any }>;
  let downloads: string[];
  let backups: Blob[];
  let nextKey: number;
  let uploadFails: boolean;
  const bodies: Record<string, string> = { src1: 'console.log("src1")', src2: 'body{color:red}', tgt1: 'console.log("tgt1")', tgt2: 'console.log("kept")' };
  const sourceSection = () => section([file('src1', 'app.js'), file('src2', 'style.css')]);
  const targetSection = () => section([file('tgt1', 'old.js'), file('tgt2', 'kept.js')]);

  beforeEach(() => {
    order = []; writes = []; uploads = []; downloads = []; backups = []; nextKey = 1; uploadFails = false;
    vi.stubGlobal('kintone', {
      getRequestToken: () => 'TOKEN',
      api: vi.fn(async (url: string, method: string, body: any) => {
        if (method === 'GET') {
          const guest = url.includes('/k/guest/5/') ? 'target' : 'source';
          return { ...structuredClone(guest === 'target' ? targetSection() : sourceSection()), revision: guest === 'target' ? '30' : '7' };
        }
        order.push(`PUT ${url}`); writes.push([url, method, structuredClone(body)]);
        return { revision: '31' };
      })
    });
    vi.stubGlobal('fetch', vi.fn(async (url: string, init: any = {}) => {
      if (init.method === 'POST') {
        const form = init.body as FormData, upload = form.get('file') as File;
        order.push(`UPLOAD ${upload.name}`);
        if (uploadFails) return new Response(JSON.stringify({ code: 'CB_VA01', message: '不正' }), { status: 400 });
        uploads.push({ url, token: form.get('__REQUEST_TOKEN__'), name: upload.name, text: await upload.text(), headers: init.headers });
        return new Response(JSON.stringify({ fileKey: `new-${nextKey++}` }));
      }
      const key = new URL(url, 'https://x.example').searchParams.get('fileKey')!;
      downloads.push(url);
      return new Response(blobOf(bodies[key] ?? ''));
    }));
    vi.stubGlobal('document', { createElement: vi.fn(() => ({ href: '', download: '', click: () => { order.push('BACKUP'); } })) });
    vi.spyOn(URL, 'createObjectURL').mockImplementation(blob => { backups.push(blob as Blob); return 'blob:backup'; });
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  });
  afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

  const baseOpts = { sourceAppId: '1', targetAppId: '2', targetGuestId: '5', scopes: ['customizeSettings'] };
  const apply = async (extra: Record<string, unknown> = {}, opts: any = baseOpts) => {
    const preview = await previewReflectStandalone(opts, () => {});
    return { preview, result: await runApplyPreviewStandalone({ ...opts, reviewBaseline: preview.baseline, doBackup: true, ...extra }, () => {}, () => {}) };
  };

  it('previews the upload instead of blocking on a foreign fileKey', async () => {
    const preview = await previewReflectStandalone(baseOpts, () => {});
    expect(preview.errorSections).toBe(0);
    expect(preview.entries[0].fileUploads?.map(upload => upload.name)).toEqual(['app.js', 'style.css']);
    expect(writes).toEqual([]);
    expect(uploads).toEqual([]);
    // 反映元は通常スペース、反映先はゲストスペース5の通常 prefix から本体を取得する。
    expect(downloads.some(url => url.startsWith('/k/v1/file.json?fileKey=src1'))).toBe(true);
    expect(downloads.some(url => url.startsWith('/k/guest/5/v1/file.json?fileKey=tgt1'))).toBe(true);
  });

  it('uploads each file to the target, then PUTs the new fileKeys after the backup', async () => {
    const { result } = await apply();
    expect(result.sections[0].status).toBe('ok');
    expect(uploads.map(upload => [upload.url, upload.token, upload.name, upload.text])).toEqual([
      ['/k/guest/5/v1/file.json', 'TOKEN', 'app.js', bodies.src1],
      ['/k/guest/5/v1/file.json', 'TOKEN', 'style.css', bodies.src2]
    ]);
    expect(uploads[0].headers).toEqual({ 'X-Requested-With': 'XMLHttpRequest' });
    expect(order).toEqual(['BACKUP', 'UPLOAD app.js', 'UPLOAD style.css', 'PUT /k/guest/5/v1/preview/app/customize.json']);
    expect(writes).toHaveLength(1);
    expect(writes[0][2]).toMatchObject({ app: '2', revision: '30', scope: 'ALL', desktop: { js: [{ type: 'FILE', file: { fileKey: 'new-1' } }, { type: 'FILE', file: { fileKey: 'new-2' } }] } });
    expect(JSON.stringify(writes[0][2])).not.toContain('src1');
    expect(JSON.stringify(writes[0][2])).not.toContain('_content');
    expect(result.logs).toContain('  OK ファイルアップロード: app.js');
    expect(result.logs).toContain('  OK ファイルアップロード: style.css');
  });

  it('does not PUT the item when an upload fails, and reports the failure', async () => {
    uploadFails = true;
    const { result } = await apply();
    expect(writes).toEqual([]);
    expect(result.sections[0].status).toBe('ng');
    expect(result.sections[0].message).toContain('「app.js」のアップロードに失敗');
    expect(result.sections[0].message).toContain('不正');
  });

  it('embeds the target file bodies in the backup and returns the same backup', async () => {
    const { result } = await apply();
    const downloaded = JSON.parse(await backups[0].text());
    expect(result.backup).toEqual(downloaded);
    expect(Object.keys(downloaded)).toEqual(['generatedAt', 'scopes', 'bundle']);
    const [first, second] = downloaded.bundle.sections.customizeSettings.desktop.js;
    expect(first.file).toMatchObject({ fileKey: 'tgt1', _content: { contentType: 'text/javascript', byteSize: bodies.tgt1.length } });
    expect(new TextDecoder().decode(base64ToBytes(first.file._content.base64))).toBe(bodies.tgt1);
    expect(new TextDecoder().decode(base64ToBytes(second.file._content.base64))).toBe(bodies.tgt2);
  });

  it('stops before any upload or PUT when a target file that the write removes cannot be backed up', async () => {
    const preview = await previewReflectStandalone(baseOpts, () => {});
    // 確認後に反映先ファイル（置き換えで外れる tgt1）の本体が取得できなくなった想定。
    const original = bodies.tgt1;
    (fetch as any).mockImplementation(async (url: string, init: any = {}) => {
      if (init.method === 'POST') { order.push('UPLOAD'); return new Response(JSON.stringify({ fileKey: 'new' })); }
      const key = new URL(url, 'https://x.example').searchParams.get('fileKey')!;
      if (key === 'tgt1' && downloads.filter(item => item.includes('fileKey=tgt1')).length >= 2) return new Response('', { status: 503 });
      downloads.push(url);
      return new Response(blobOf(bodies[key] ?? ''));
    });
    await expect(runApplyPreviewStandalone({ ...baseOpts, reviewBaseline: preview.baseline, doBackup: true }, () => {}, () => {})).rejects.toThrow(/バックアップに保存できないため、反映を中止しました。まだ書き込んでいません。\n「old\.js」/);
    expect(order).toEqual([]);
    expect(writes).toEqual([]);
    bodies.tgt1 = original;
  });
  it('returns no backup when nothing is written', async () => {
    const same = { ...baseOpts, sourceAppId: '2' };
    (kintone as any).api.mockImplementation(async () => ({ ...structuredClone(targetSection()), revision: '30' }));
    const { result } = await apply({}, same);
    expect(result.sections[0].status).toBe('skip');
    expect(result.backup).toBeUndefined();
    expect(backups).toEqual([]);
  });

  it('restores JS/CSS from the embedded backup content without downloading source files', async () => {
    const { result: first } = await apply();
    const backup = first.backup!;
    order.length = 0; writes.length = 0; uploads.length = 0; downloads.length = 0; backups.length = 0; nextKey = 10;
    // 反映先の現状は、バックアップ取得後に別ファイルへ置き換わっている想定。
    const replaced = section([file('other', 'other.js')]);
    (kintone as any).api.mockImplementation(async (url: string, method: string, body: any) => {
      if (method === 'GET') return { ...structuredClone(replaced), revision: '40' };
      writes.push([url, method, structuredClone(body)]); order.push(`PUT ${url}`); return { revision: '41' };
    });
    bodies.other = 'console.log("other")';
    const opts = { sourceAppId: '2', sourceBundle: backup.bundle, targetAppId: '2', targetGuestId: '5', scopes: ['customizeSettings'] };
    const preview = await previewReflectStandalone(opts, () => {});
    expect(preview.errorSections).toBe(0);
    const restored = await runApplyPreviewStandalone({ ...opts, reviewBaseline: preview.baseline, doBackup: true }, () => {}, () => {});
    expect(restored.sections[0].status).toBe('ok');
    // 復元元の本体は埋め込みから取得するため、tgt1/tgt2 のダウンロードは行わない（反映先の現在のファイルだけ）。
    expect(downloads.every(url => url.includes('fileKey=other'))).toBe(true);
    expect(uploads.map(upload => [upload.name, upload.text])).toEqual([['old.js', bodies.tgt1], ['kept.js', bodies.tgt2]]);
    expect(writes[0][2].desktop.js).toEqual([{ type: 'FILE', file: { fileKey: 'new-10' } }, { type: 'FILE', file: { fileKey: 'new-11' } }]);
  });
});
