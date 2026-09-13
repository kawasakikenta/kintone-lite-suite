import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchBundle } from '../../src/api';
import { pickAllSettingsBundles } from '../../src/settingsBundleImport';
import { reflectConnectionError, resolveReflectAppsStandalone, preflightLookupMapStandalone, previewReflectStandalone, runApplyPreviewStandalone } from '../../src/tabs/reflect-standalone';
import { buildReflectSectionPlan } from '../../src/reflect/standalonePlan';
import { captureReflectBaseline, assertReflectBaselineMatches } from '../../src/reflect/standalonePreflight';

const base = { sourceAppId: '1', targetAppId: '2', scopes: ['viewSettings'] };
afterEach(() => vi.unstubAllGlobals());

describe('reflection API boundaries and early stopping', () => {
  it.each(['', '0', '-1', '1.5', '1e3', 'abc', '02'])('rejects ambiguous target ID %s', targetAppId => {
    expect(reflectConnectionError({ ...base, targetAppId })).toContain('正の整数');
  });
  it('blocks same-preview writes while allowing same-app production to preview', () => {
    expect(reflectConnectionError({ ...base, targetAppId: '1', sourcePreview: true })).toContain('同じプレビュー');
    expect(reflectConnectionError({ ...base, targetAppId: '1', sourcePreview: false })).toBe('');
    expect(reflectConnectionError({ ...base, targetAppId: '1', sourcePreview: true, targetGuestId: '3' })).toBe('');
  });
  it('resolves names from the non-preview endpoint in the correct guest space', async () => {
    const api = vi.fn(async (_url, _method, body) => ({ appId: body.id, name: 'App ' + body.id, code: 'CODE' }));
    vi.stubGlobal('kintone', { api });
    const result = await resolveReflectAppsStandalone({ ...base, sourceGuestId: '10', targetGuestId: '20', sourcePreview: true });
    expect(result.target).toEqual({ appId: '2', guestId: '20', name: 'App 2', code: 'CODE' });
    expect(api.mock.calls.map(([url]) => url)).toEqual(['/k/guest/20/v1/app.json', '/k/guest/10/v1/app.json']);
  });
  it('refuses to label an unverified app response as a confirmed destination', async () => {
    vi.stubGlobal('kintone', { api: vi.fn(async () => ({ appId: '99', name: 'Wrong app' })) });
    await expect(resolveReflectAppsStandalone(base)).rejects.toThrow('名前とIDを確認できません');
  });
  it('uses non-preview app info for lookup mapping and checks response IDs', async () => {
    const api = vi.fn(async () => ({ appId: '9' })); vi.stubGlobal('kintone', { api });
    expect((await preflightLookupMapStandalone({ '1': '9' }, { targetGuestId: '3' })).ok).toBe(true);
    expect(api.mock.calls[0]).toEqual(['/k/guest/3/v1/app.json', 'GET', { id: '9' }]);
    expect((await preflightLookupMapStandalone({ '1': '8' })).ok).toBe(false);
  });
  it('keeps field names that look like metadata and avoids auxiliary file/config GETs', async () => {
    const api = vi.fn(async url => url.endsWith('/fields.json')
      ? JSON.parse('{"revision":"10","properties":{"revision":{"type":"SINGLE_LINE_TEXT","code":"revision","label":"版"},"__proto__":{"type":"NUMBER","code":"__proto__"}}}')
      : url.endsWith('/plugins.json') ? { revision: '10', plugins: [{ id: 'plugin' }] }
      : { revision: '10', scope: 'ALL', desktop: { js: [{ type: 'FILE', file: { fileKey: 'retained' } }], css: [] }, mobile: { js: [], css: [] } });
    vi.stubGlobal('kintone', { api });
    const bundle = await fetchBundle({ appId: '2', preview: true, rawSettings: true, sections: ['fieldSettings', 'pluginSettings', 'customizeSettings'] });
    expect(Object.keys(bundle.sections.fieldSettings.properties)).toEqual(['revision', '__proto__']);
    expect(api).toHaveBeenCalledTimes(3);
    const imported = pickAllSettingsBundles({ appId: '2', sections: bundle.sections }, 'source', true)[0];
    expect(Object.keys(imported.sections.fieldSettings.properties)).toEqual(['revision', '__proto__']);
    const plan = buildReflectSectionPlan('fieldSettings', imported.sections.fieldSettings, { properties: {} });
    expect(plan.operations[0].body.properties.revision.label).toBe('版');
    expect(plan.changeCount).toBe(2);
  });
  it('detects changes in metadata-looking user keys in JSON review baselines', () => {
    const source = { sections: { fieldSettings: { properties: { revision: { type: 'NUMBER', label: 'Before' } } } } };
    const target = { ...structuredClone(source), meta: { sectionRevisions: { fieldSettings: '1' } } };
    const opts = { ...base, sourceBundle: source, scopes: ['fieldSettings'] };
    const baseline = captureReflectBaseline(opts, source, target);
    source.sections.fieldSettings.properties.revision.label = 'After';
    expect(() => assertReflectBaselineMatches(baseline, opts, source, target)).toThrow('変更されたため');
  });
  it('binds the preservation mode to the confirmed baseline', () => {
    const section = { viewSettings: { views: {}, revision: '10' } };
    const source = { sections: section }, target = { sections: section };
    const baseline = captureReflectBaseline(base, source, target);
    expect(() => assertReflectBaselineMatches(baseline, { ...base, preserveTargetOnly: false }, source, target)).toThrow('反映条件が一致しません');
  });
  it('stops before writing any section when a later section has an invalid payload', async () => {
    const api = vi.fn(async url => url.endsWith('/fields.json') ? { properties: {}, revision: '10' } : { rights: [], revision: '10' });
    vi.stubGlobal('kintone', { api });
    const opts = { ...base, scopes: ['fieldSettings', 'appAcl'], sourceBundle: { appId: '1', sections: { fieldSettings: { properties: { name: { type: 'SINGLE_LINE_TEXT', code: 'name', label: '名前' } } }, appAcl: {} } } };
    const preview = await previewReflectStandalone(opts, () => {});
    expect(preview.errorSections).toBe(1);
    await expect(runApplyPreviewStandalone({ ...opts, reviewBaseline: preview.baseline }, () => {}, () => {})).rejects.toThrow('まだ書き込んでいません');
    expect(api.mock.calls.every(([, method]) => method === 'GET')).toBe(true);
  });
  it('marks missing revisions as blocked in the comparison screen', async () => {
    vi.stubGlobal('kintone', { api: vi.fn(async () => ({ views: {} })) });
    const preview = await previewReflectStandalone({ ...base, sourceBundle: { appId: '1', sections: { viewSettings: { views: {} } } } }, () => {});
    expect(preview.errorSections).toBe(1); expect(preview.entries[0].message).toContain('revision');
  });
  it('refuses deployment flags before any API call', async () => {
    const api = vi.fn(); vi.stubGlobal('kintone', { api });
    await expect(runApplyPreviewStandalone({ ...base, reviewBaseline: {} as any, doDeploy: true }, () => {}, () => {})).rejects.toThrow('プレビューへの反映専用');
    expect(api).not.toHaveBeenCalled();
  });
});
