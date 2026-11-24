import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CUSTOMIZE_BODY_SENSITIVE_NOTE, PLUGIN_CONFIG_INCLUDED_NOTE, SECTION_DEFS } from '../../src/constants';
import { fetchBundle } from '../../src/api';
import { copyTextToClipboard, downloadBlob, downloadText } from '../../src/utils';
import { DESIGN_JSON_SENSITIVE_NOTICE, designJsonSensitiveNotice, runBatchDesignExportMdZipStandalone, runDesignCopyMdStandalone, runDesignExportStandalone } from '../../src/tabs/design-standalone';

const zipFiles: Record<string, string> = {};
vi.mock('../../src/api', async (importOriginal) => ({ ...await importOriginal<typeof import('../../src/api')>(), fetchBundle: vi.fn() }));
vi.mock('../../src/utils', async (importOriginal) => ({ ...await importOriginal<typeof import('../../src/utils')>(), copyTextToClipboard: vi.fn(), downloadBlob: vi.fn(), downloadText: vi.fn() }));
vi.mock('../../src/jszipLoader', () => ({ loadJSZipLite: vi.fn(async () => class FakeJSZip {
  file(name: string, content: string) { zipFiles[name] = content; }
  async generateAsync() { return new Blob(['zip']); }
}) }));

const sections = () => Object.fromEntries(SECTION_DEFS.map((section) => {
  switch (section.key) {
    case 'appSettings': return [section.key, { name: '案件管理' }];
    case 'pluginSettings': return [section.key, { plugins: [{ id: 'p1', name: 'カレンダー', enabled: true, _config: { apiToken: 'sk-live-SECRET' } }] }];
    case 'customizeSettings': return [section.key, { scope: 'ALL', desktop: { js: [{ type: 'FILE', file: { fileKey: 'k1', name: 'core.js', size: '1' }, _bodyText: 'const T = "tok_live_SECRET";', _bodyHash: 'h' }], css: [] }, mobile: { js: [], css: [] } }];
    case 'fieldSettings': return [section.key, { properties: {} }];
    case 'layoutSettings': return [section.key, { layout: [] }];
    case 'viewSettings': return [section.key, { views: {} }];
    case 'reportSettings': return [section.key, { reports: {} }];
    case 'processSettings': return [section.key, { enable: false, states: {}, actions: [] }];
    case 'actionSettings': return [section.key, { actions: {} }];
    case 'notifications': case 'perRecordNotifications': case 'reminderNotifications': return [section.key, { notifications: [] }];
    case 'appAcl': case 'fieldAcl': case 'recordPermissions': return [section.key, { rights: [] }];
    case 'categories': return [section.key, { categories: {} }];
    default: return [section.key, { properties: [] }];
  }
}));
const bundle = () => ({ appId: '1', guestId: '', preview: false, fetchedAt: '2026-11-01T00:00:00.000Z', meta: { sectionRevisions: {} }, sections: sections() });

beforeEach(() => { vi.clearAllMocks(); Object.keys(zipFiles).forEach((key) => delete zipFiles[key]); vi.mocked(copyTextToClipboard).mockResolvedValue(true); vi.mocked(fetchBundle).mockImplementation(async () => bundle() as any); });

const savedText = () => String(vi.mocked(downloadText).mock.calls[0][1]);

describe('設計書 Markdown は、設定JSON由来のプラグイン設定値・JS/CSS本文を原文 JSON にも含めない', () => {
  it('設定JSONを読み込んだ Markdown の保存・コピー・一括 ZIP', async () => {
    await runDesignExportStandalone('md', { appId: '1', importedBundle: bundle() }, vi.fn());
    expect(savedText()).not.toContain('SECRET');
    expect(savedText()).toContain('カレンダー');
    await runDesignCopyMdStandalone({ appId: '1', importedBundle: bundle() }, vi.fn());
    expect(String(vi.mocked(copyTextToClipboard).mock.calls[0][0])).not.toContain('SECRET');
    await runBatchDesignExportMdZipStandalone({ apps: [{ appId: '1', bundle: bundle() }], format: 'both' }, vi.fn());
    expect(Object.values(zipFiles).join('\n')).not.toContain('SECRET');
  });

  it('設計書 JSON は設定の写しとして、従来どおり含める', async () => {
    await runDesignExportStandalone('json', { appId: '1', importedBundle: bundle() }, vi.fn());
    expect(savedText()).toContain('sk-live-SECRET');
  });
});

describe('設計書は、使わない補助情報を kintone から取得しない', () => {
  const lastFetch = () => vi.mocked(fetchBundle).mock.calls.at(-1)![0] as any;
  it('Markdown（保存・コピー・一括 ZIP）はプラグイン設定値と JS/CSS 本文を取得しない', async () => {
    await runDesignExportStandalone('md', { appId: '1' }, vi.fn());
    expect(lastFetch()).toMatchObject({ skipPluginConfig: true, skipCustomizeBodies: true });
    await runDesignCopyMdStandalone({ appId: '1' }, vi.fn());
    expect(lastFetch()).toMatchObject({ skipPluginConfig: true, skipCustomizeBodies: true });
    await runBatchDesignExportMdZipStandalone({ apps: [{ appId: '1' }], format: 'md' }, vi.fn());
    expect(lastFetch()).toMatchObject({ skipPluginConfig: true, skipCustomizeBodies: true });
    expect(savedText()).not.toContain('SECRET');
    expect(Object.values(zipFiles).join('\n')).not.toContain('SECRET');
  });

  it('設計書 JSON は設定の写しとして、従来どおり取得する', async () => {
    await runDesignExportStandalone('json', { appId: '1' }, vi.fn());
    expect(lastFetch().skipPluginConfig).toBeUndefined();
    expect(lastFetch().skipCustomizeBodies).toBeUndefined();
  });

  it('JS/CSS 本文の取得に失敗しても、使わない Markdown では取得失敗にしない', async () => {
    vi.mocked(fetchBundle).mockImplementation(async (params: any) => {
      const value = bundle() as any;
      if (!params.skipCustomizeBodies) value.sections.customizeSettings._fetchError = 'JS/CSSファイル本文の取得に失敗したため、このセクションは比較できません';
      return value;
    });
    const status = vi.fn();
    await runDesignExportStandalone('md', { appId: '1' }, status);
    expect(status).toHaveBeenLastCalledWith(expect.not.stringContaining('取得失敗'), false);
  });
});

describe('設計書 JSON の取扱注意', () => {
  it('設計書 JSON は設定の写しとして値をそのまま含め、確認画面と完了メッセージで取扱注意を伝える（ファイルの形は変えない）', async () => {
    const status = vi.fn();
    await runDesignExportStandalone('json', { appId: '1', importedBundle: bundle() }, status);
    expect(savedText()).toContain('sk-live-SECRET');
    expect(savedText()).toContain('tok_live_SECRET');
    expect(JSON.parse(savedText())).not.toHaveProperty('notice');
    expect(status).toHaveBeenLastCalledWith(expect.stringContaining(`。取扱注意: ${PLUGIN_CONFIG_INCLUDED_NOTE}。${CUSTOMIZE_BODY_SENSITIVE_NOTE}。共有する前に内容を確認してください`), false);
    expect(DESIGN_JSON_SENSITIVE_NOTICE).toBe(`${PLUGIN_CONFIG_INCLUDED_NOTE}。${CUSTOMIZE_BODY_SENSITIVE_NOTE}。共有する前に内容を確認してください`);
  });

  it('設定値・本文が入っていない設計書 JSON には取扱注意を付けない', async () => {
    const plain: any = bundle();
    delete plain.sections.pluginSettings.plugins[0]._config;
    delete plain.sections.customizeSettings.desktop.js[0]._bodyText;
    delete plain.sections.customizeSettings.desktop.js[0]._bodyHash;
    const status = vi.fn();
    await runDesignExportStandalone('json', { appId: '1', importedBundle: plain }, status);
    expect(status).toHaveBeenLastCalledWith(expect.not.stringContaining('取扱注意'), false);
  });

  it('プラグインの設定値だけが入っていれば、その注意だけを書く', () => {
    const pluginOnly: any = bundle();
    delete pluginOnly.sections.customizeSettings.desktop.js[0]._bodyText;
    delete pluginOnly.sections.customizeSettings.desktop.js[0]._bodyHash;
    expect(designJsonSensitiveNotice(pluginOnly)).toBe(`取扱注意: ${PLUGIN_CONFIG_INCLUDED_NOTE}。共有する前に内容を確認してください`);
  });
});
