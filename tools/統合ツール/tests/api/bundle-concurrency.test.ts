import { afterEach, describe, expect, it, vi } from 'vitest';
import { BUNDLE_FETCH_CONCURRENCY, fetchBundle } from '../../src/api';
import { SECTION_DEFS } from '../../src/constants';

afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe('bounded bundle fetching', () => {
  it('fetches independent sections concurrently, preserving order, errors and revisions', async () => {
    vi.useFakeTimers();
    const keys = ['appSettings', 'fieldSettings', 'layoutSettings', 'viewSettings', 'processSettings', 'appInfo'];
    let active = 0;
    let peak = 0;
    const api = vi.fn(async (path: string) => {
      active += 1;
      peak = Math.max(peak, active);
      await new Promise(resolve => setTimeout(resolve, path.endsWith('/app/settings.json') ? 90 : 30));
      active -= 1;
      if (path.endsWith('/app/views.json')) throw new Error('権限がありません');
      return { revision: '17', name: path };
    });
    vi.stubGlobal('kintone', { api });
    const progress: number[] = [];
    const start = Date.now();
    const pending = fetchBundle({ appId: '42', guestId: '7', preview: true,
      sections: [...keys, 'appSettings', 'unknown'], onProgress: value => progress.push(value) });
    await vi.runAllTimersAsync();
    const bundle = await pending;
    expect(peak).toBe(BUNDLE_FETCH_CONCURRENCY);
    expect(Date.now() - start).toBeLessThan(90 + 5 * 30);
    expect(api).toHaveBeenCalledTimes(keys.length);
    expect(Object.keys(bundle.sections)).toEqual(keys);
    expect(Object.keys(bundle.meta.sectionRevisions)).toEqual(keys.filter(key => key !== 'viewSettings'));
    expect(bundle.sections.viewSettings._fetchError).toContain('権限がありません');
    expect(bundle.meta.sectionRevisions.fieldSettings).toBe('17');
    expect(progress).toEqual(keys.map((_, index) => (index + 1) / keys.length));
    for (const key of keys) {
      const def = SECTION_DEFS.find(item => item.key === key)!;
      const prefix = key === 'appInfo' ? '/k/guest/7/v1' : '/k/guest/7/v1/preview';
      expect(api).toHaveBeenCalledWith(prefix + def.endpoint, 'GET', key === 'appInfo' ? { id: '42' } : { app: '42' });
    }
  });

  it('does not call APIs or report invalid progress for an empty selection', async () => {
    const api = vi.fn();
    const progress = vi.fn();
    vi.stubGlobal('kintone', { api });
    const bundle = await fetchBundle({ appId: '42', sections: [], onProgress: progress });
    expect(bundle.sections).toEqual({});
    expect(api).not.toHaveBeenCalled();
    expect(progress).not.toHaveBeenCalled();
  });
});
