import { afterEach, describe, expect, it, vi } from 'vitest';
import { runApplyPreviewStandalone } from '../../src/tabs/reflect-standalone';

describe('lite preview reflection revisions', () => {
  afterEach(() => {
    delete (globalThis as any).kintone;
  });

  it('reads and sends the latest target revision before replacing views', async () => {
    const api = vi.fn()
      .mockResolvedValueOnce({ revision: '42', views: {} })
      .mockResolvedValueOnce({ revision: '43' });
    (globalThis as any).kintone = { api };

    await runApplyPreviewStandalone({
      sourceBundle: { appId: '1', sections: { viewSettings: { views: { List: { type: 'LIST', index: 0 } } } } },
      targetAppId: '2',
      scopes: ['viewSettings']
    }, () => {}, () => {});

    expect(api.mock.calls[0]).toEqual(['/k/v1/preview/app/views.json', 'GET', { app: '2' }]);
    expect(api.mock.calls[1]).toEqual(['/k/v1/preview/app/views.json', 'PUT', {
      app: '2',
      views: { List: { type: 'LIST', index: 0 } },
      revision: '42'
    }]);
  });

  it('chains the revision returned by a field addition into the following update', async () => {
    const api = vi.fn()
      .mockResolvedValueOnce({
        revision: '10',
        properties: { existing: { type: 'NUMBER', code: 'existing' } }
      })
      .mockResolvedValueOnce({ revision: '11' })
      .mockResolvedValueOnce({ revision: '12' });
    (globalThis as any).kintone = { api };

    await runApplyPreviewStandalone({
      sourceBundle: { appId: '1', sections: { fieldSettings: { properties: {
        added: { type: 'SINGLE_LINE_TEXT', code: 'added' },
        existing: { type: 'NUMBER', code: 'existing' }
      } } } },
      targetAppId: '2',
      scopes: ['fieldSettings']
    }, () => {}, () => {});

    expect(api.mock.calls[1][2].revision).toBe('10');
    expect(api.mock.calls[2][2].revision).toBe('11');
  });
});
