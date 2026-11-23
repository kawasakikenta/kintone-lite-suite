import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchBundle } from '../../src/api';
import { downloadBlob } from '../../src/utils';
import { runSettingsExportStandalone } from '../../src/tabs/settings-export-standalone';
import { readSettingsZip } from '../../src/settingsZipImport';
import { pickAllSettingsBundles } from '../../src/settingsBundleImport';
import { LiteZip } from '../../src/archive/lite-zip';

// 設定取得の ZIP（実際の ZIP 作成）を、設計書作成の「設定JSON読込」と同じ読み方で読み戻す。
vi.mock('../../src/api', async importOriginal => ({ ...await importOriginal<typeof import('../../src/api')>(), fetchBundle: vi.fn() }));
vi.mock('../../src/utils', async importOriginal => ({ ...await importOriginal<typeof import('../../src/utils')>(),
  downloadText: vi.fn(), downloadBlob: vi.fn(), selectedScopeKeys: () => ['appSettings', 'fieldSettings'] }));

beforeEach(() => { vi.clearAllMocks(); });

const bytesOf = async (blob: Blob) => new Uint8Array(await blob.arrayBuffer());

describe('設定取得の ZIP を設定JSONとして読む', () => {
  it('manifest.json にあるアプリごとの設定 JSON を、その順に読む（取得に失敗した項目もそのまま）', async () => {
    vi.mocked(fetchBundle).mockImplementation(async ({ appId, guestId }: any) => ({ appId, guestId: guestId || '', preview: false, fetchedAt: '2026-11-23T00:00:00.000Z', meta: { sectionRevisions: {} },
      sections: appId === '3'
        ? { appSettings: { _fetchError: '権限不足' }, fieldSettings: { _fetchError: '権限不足' } }
        : { appSettings: { name: `顧客管理${appId}` }, fieldSettings: { properties: { name: { type: 'SINGLE_LINE_TEXT', code: 'name', label: '顧客名' } } } } }));
    await runSettingsExportStandalone('zip', { apps: [{ appId: '1' }, { appId: '1', guestId: '9' }, { appId: '3' }] }, vi.fn());
    const blob = vi.mocked(downloadBlob).mock.calls[0][1] as Blob;
    const imported = await readSettingsZip(await bytesOf(blob));
    expect(imported.warnings).toEqual([]);
    expect(imported.files).toHaveLength(3);
    const bundles = pickAllSettingsBundles(imported.raw, undefined, true, true);
    expect(bundles.map((bundle: any) => `${bundle.appId}:${bundle.guestId}`)).toEqual(['1:', '1:9', '3:']);
    expect(bundles[0].sections.fieldSettings.properties.name.label).toBe('顧客名');
    expect(bundles[2].sections.fieldSettings._fetchError).toBe('権限不足');
  });

  it('manifest.json にあるのに ZIP に無いファイルは注意に出し、manifest.json が無い ZIP は sections を持つ JSON を読む', async () => {
    const bundle = (appId: string) => JSON.stringify({ appId, guestId: '', sections: { fieldSettings: { properties: {} } } });
    const zip = new LiteZip();
    zip.file('manifest.json', JSON.stringify({ apps: [{ file: 'a.json' }, { file: 'missing.json' }] }));
    zip.file('a.json', bundle('5'));
    zip.file('a_JS_CSS/desktop/js/main.js', 'x');
    const withManifest = await readSettingsZip(await bytesOf(await zip.generateAsync({ type: 'blob' })));
    expect(withManifest.files).toEqual(['a.json']);
    expect(withManifest.warnings[0]).toContain('missing.json');

    const plain = new LiteZip();
    plain.file('b.json', bundle('7'));
    plain.file('note.json', JSON.stringify({ hello: 'world' }));
    plain.file('a.json', bundle('6'));
    const withoutManifest = await readSettingsZip(await bytesOf(await plain.generateAsync({ type: 'blob' })));
    expect(withoutManifest.raw.bundles.map((item: any) => item.appId)).toEqual(['6', '7']);
  });

  it('設定 JSON が 1 つも無い ZIP は、何の ZIP を読めばよいかを示して止める', async () => {
    const zip = new LiteZip();
    zip.file('readme.json', JSON.stringify({ hello: 'world' }));
    await expect(readSettingsZip(await bytesOf(await zip.generateAsync({ type: 'blob' })))).rejects.toThrow('設定取得の「設定をZIPで保存」で保存した ZIP');
  });
});
