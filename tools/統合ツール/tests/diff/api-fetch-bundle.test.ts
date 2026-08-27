import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  CUSTOMIZE_BODY_FETCH_CONCURRENCY,
  fetchBundle,
  fetchCustomizeFileBodies,
  isRetriableApiError,
  isRetriableMutation,
  resolveHttpStatus
} from '../../src/api';
import { computeDiffRows } from '../../src/diff/engine';

function installKintoneApi(handler: (path: string, method: string, params: any) => Promise<any>) {
  const api = vi.fn(handler);
  vi.stubGlobal('kintone', { api });
  return api;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('fetchBundle auxiliary diff data', () => {
  it('limits customization body concurrency and retries one transient failure', async () => {
    const files = Array.from({ length: 12 }, (_, index) => ({
      type: 'FILE',
      file: { fileKey: `key-${index}`, name: `file-${index}.js` }
    }));
    const section = {
      desktop: { js: files, css: [] },
      mobile: { js: [], css: [] }
    };
    let active = 0;
    let maxActive = 0;
    const attempts = new Map<string, number>();
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      const key = new URL(url, 'https://example.test').searchParams.get('fileKey') || '';
      attempts.set(key, (attempts.get(key) || 0) + 1);
      active += 1;
      maxActive = Math.max(maxActive, active);
      await new Promise((resolve) => setTimeout(resolve, 2));
      active -= 1;
      if (key === 'key-0' && attempts.get(key) === 1) {
        return { ok: false, status: 503 };
      }
      return {
        ok: true,
        status: 200,
        headers: { get: () => null },
        blob: async () => new Blob([`console.log(${JSON.stringify(key)});`], { type: 'text/javascript' })
      };
    }));

    const stats = await fetchCustomizeFileBodies(section, '/k/v1');

    expect(maxActive).toBeLessThanOrEqual(CUSTOMIZE_BODY_FETCH_CONCURRENCY);
    expect(attempts.get('key-0')).toBe(2);
    expect(stats).toMatchObject({ fetched: 12, failed: 0, skipped: 0 });
    expect(section.desktop.js.every((item: any) => typeof item._bodyText === 'string')).toBe(true);
  });

  it('uses the preview prefix for plug-in configuration when preview is selected', async () => {
    const api = installKintoneApi(async (path) => {
      if (path.endsWith('/app/plugins.json')) {
        return { revision: '5', plugins: [{ id: 'plugin-1', name: 'Plugin 1', version: '1.0.0' }] };
      }
      if (path.endsWith('/app/plugin/config.json')) {
        return { config: { enabled: 'true' } };
      }
      throw new Error(`unexpected API path: ${path}`);
    });

    const bundle = await fetchBundle({
      appId: '123',
      guestId: '42',
      preview: true,
      sections: ['pluginSettings']
    });

    const paths = api.mock.calls.map(([path]) => path);
    expect(paths).toContain('/k/guest/42/v1/preview/app/plugins.json');
    expect(paths).toContain('/k/guest/42/v1/preview/app/plugin/config.json');
    expect(paths).not.toContain('/k/guest/42/v1/app/plugin/config.json');
    expect(bundle.sections.pluginSettings.plugins[0]._config).toEqual({ enabled: 'true' });
    expect(bundle.sections.pluginSettings).not.toHaveProperty('_configFetchStats');
    expect(bundle.sections.pluginSettings).not.toHaveProperty('_fetchError');
  });

  it('marks plug-in settings as uncomparable when any configuration fetch fails', async () => {
    installKintoneApi(async (path) => {
      if (path.endsWith('/app/plugins.json')) {
        return { plugins: [{ id: 'plugin-1', name: 'Plugin 1', version: '1.0.0' }] };
      }
      if (path.endsWith('/app/plugin/config.json')) throw new Error('プラグイン設定を取得できません');
      throw new Error(`unexpected API path: ${path}`);
    });

    const sourceBundle = await fetchBundle({
      appId: '123',
      preview: true,
      sections: ['pluginSettings']
    });

    expect(sourceBundle.sections.pluginSettings._fetchError).toContain('プラグイン設定の取得に失敗');
    expect(sourceBundle.sections.pluginSettings._fetchError).toContain('1件');
    expect(sourceBundle.sections.pluginSettings).not.toHaveProperty('_configFetchStats');

    const result = computeDiffRows(
      sourceBundle,
      { sections: { pluginSettings: { plugins: [] } } },
      ['pluginSettings'],
      ''
    );
    expect(result.rows).toEqual([]);
    expect(result.fetchIssues).toHaveLength(1);
    expect(result.fetchIssues[0]).toMatchObject({ sectionKey: 'pluginSettings', side: 'source' });
  });

  it('marks plug-in settings as uncomparable when a configuration response is unavailable', async () => {
    installKintoneApi(async (path) => {
      if (path.endsWith('/app/plugins.json')) {
        return { plugins: [{ id: 'plugin-1', name: 'Plugin 1', version: '1.0.0' }] };
      }
      if (path.endsWith('/app/plugin/config.json')) return null;
      throw new Error(`unexpected API path: ${path}`);
    });

    const bundle = await fetchBundle({
      appId: '123',
      preview: true,
      sections: ['pluginSettings']
    });

    expect(bundle.sections.pluginSettings._fetchError).toContain('プラグイン設定の取得に失敗');
    expect(bundle.sections.pluginSettings._fetchError).toContain('1件');
  });

  it('marks customization settings as uncomparable when a text body cannot be fetched', async () => {
    installKintoneApi(async (path) => {
      if (path.endsWith('/app/customize.json')) {
        return {
          desktop: {
            js: [{ type: 'FILE', file: { fileKey: 'file-key-1', name: 'desktop.js' } }],
            css: []
          },
          mobile: { js: [], css: [] }
        };
      }
      throw new Error(`unexpected API path: ${path}`);
    });
    const fetchMock = vi.fn(async () => ({ ok: false }));
    vi.stubGlobal('fetch', fetchMock);

    const sourceBundle = await fetchBundle({
      appId: '123',
      preview: true,
      sections: ['customizeSettings']
    });

    expect(fetchMock).toHaveBeenCalledWith(
      '/k/v1/file.json?fileKey=file-key-1',
      expect.objectContaining({ method: 'GET' })
    );
    expect(sourceBundle.sections.customizeSettings._fetchError).toContain('JS/CSSファイル本文の取得に失敗');
    expect(sourceBundle.sections.customizeSettings._fetchError).toContain('1件');
    expect(sourceBundle.sections.customizeSettings._fetchError).toContain('desktop.js');
    expect(sourceBundle.sections.customizeSettings).not.toHaveProperty('_bodyFetchStats');

    const result = computeDiffRows(
      sourceBundle,
      { sections: { customizeSettings: { desktop: { js: [], css: [] }, mobile: { js: [], css: [] } } } },
      ['customizeSettings'],
      ''
    );
    expect(result.rows).toEqual([]);
    expect(result.fetchIssues).toHaveLength(1);
    expect(result.fetchIssues[0]).toMatchObject({ sectionKey: 'customizeSettings', side: 'source' });
  });

  it('keeps the customization section comparable when a text body exceeds the size limit', async () => {
    installKintoneApi(async (path) => {
      if (path.endsWith('/app/customize.json')) {
        return {
          desktop: {
            js: [
              { type: 'FILE', file: { fileKey: 'large-key', name: 'large.js' } },
              { type: 'FILE', file: { fileKey: 'small-key', name: 'small.js' } }
            ],
            css: []
          },
          mobile: { js: [], css: [] }
        };
      }
      throw new Error(`unexpected API path: ${path}`);
    });
    const largeBlob = vi.fn(async () => {
      throw new Error('oversized response body should not be downloaded');
    });
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes('large-key')) {
        return {
          ok: true,
          status: 200,
          headers: { get: (name: string) => name.toLowerCase() === 'content-length' ? String(2 * 1024 * 1024) : null },
          blob: largeBlob
        };
      }
      return {
        ok: true,
        status: 200,
        headers: { get: () => null },
        blob: async () => new Blob(['console.log("small");'], { type: 'text/javascript' })
      };
    });
    vi.stubGlobal('fetch', fetchMock);

    const bundle = await fetchBundle({
      appId: '123',
      preview: true,
      sections: ['customizeSettings']
    });

    const section = bundle.sections.customizeSettings;
    expect(section).not.toHaveProperty('_fetchError');
    expect(section._partial).toMatchObject({
      kind: 'customizeBody',
      files: [expect.objectContaining({ fileName: 'large.js', reason: 'oversize', byteSize: 2 * 1024 * 1024 })]
    });
    expect(section.desktop.js[0]._bodyUnavailable).toBe('oversize');
    expect(section.desktop.js[1]._bodyText).toBe('console.log("small");');
    expect(section.desktop.js[1]._bodyHash).toMatch(/^[0-9a-f]{8}$/);
    expect(largeBlob).not.toHaveBeenCalled();
  });

  it('can retain partial metadata when another customization body fetch makes the section uncomparable', async () => {
    installKintoneApi(async (path) => {
      if (path.endsWith('/app/customize.json')) {
        return {
          desktop: {
            js: [
              { type: 'FILE', file: { fileKey: 'large-key', name: 'large.js' } },
              { type: 'FILE', file: { fileKey: 'failed-key', name: 'failed.js' } }
            ],
            css: []
          },
          mobile: { js: [], css: [] }
        };
      }
      throw new Error(`unexpected API path: ${path}`);
    });
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (url.includes('large-key')) {
        return {
          ok: true,
          status: 200,
          headers: { get: () => String(2 * 1024 * 1024) },
          blob: async () => new Blob([])
        };
      }
      return { ok: false, status: 503 };
    }));

    const bundle = await fetchBundle({
      appId: '123',
      preview: true,
      sections: ['customizeSettings']
    });

    const section = bundle.sections.customizeSettings;
    expect(section._partial).toMatchObject({
      files: [expect.objectContaining({ fileName: 'large.js', reason: 'oversize' })]
    });
    expect(section._fetchError).toContain('failed.js');
  });
});

describe('HTTP status fallback parsing', () => {
  it.each([
    ['HTTP 503', 503],
    ['HTTP/1.1 502 Bad Gateway', 502],
    ['request failed with status 500', 500],
    ['request failed with status code: 429', 429]
  ])('accepts an explicitly labelled status in %s', (message, expected) => {
    expect(resolveHttpStatus(new Error(message))).toBe(expected);
  });

  it.each([
    'field code 503 is invalid',
    '最大500件までです',
    'record 429 could not be loaded'
  ])('does not infer an HTTP status from an unrelated number in %s', (message) => {
    const error = new Error(message);
    expect(resolveHttpStatus(error)).toBe(0);
    expect(isRetriableApiError(error)).toBe(false);
    expect(isRetriableMutation('DELETE', error)).toBe(false);
  });

  it('keeps retry decisions for explicitly labelled retryable statuses', () => {
    expect(isRetriableApiError(new Error('HTTP 503'))).toBe(true);
    expect(isRetriableMutation('DELETE', new Error('status code 503'))).toBe(true);
    expect(isRetriableMutation('PUT', new Error('HTTP status 429'))).toBe(true);
    expect(isRetriableMutation('DELETE', new Error('HTTP status 429'))).toBe(false);
  });
});
