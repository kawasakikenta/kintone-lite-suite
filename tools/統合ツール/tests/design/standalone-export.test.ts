import { describe, expect, it, vi } from 'vitest';
import {
  runBatchDesignExportXlsxZipStandalone,
  runDesignExportStandalone,
  validateDesignExportTargets,
  validateDesignTarget
} from '../../src/tabs/design-standalone';

describe('lite design export', () => {
  it('rejects an unsupported format before fetching settings', async () => {
    await expect(runDesignExportStandalone('pdf', { appId: '1' }, vi.fn())).rejects.toThrow(/md または json/);
  });
  it('rejects malformed app and guest IDs before any export work', async () => {
    expect(validateDesignTarget({ appId: 'abc' })).toMatch(/アプリIDは数値/);
    expect(validateDesignTarget({ appId: '1', guestId: 'x' })).toMatch(/ゲストIDは数値/);
    await expect(runDesignExportStandalone('json', { appId: 'abc' }, vi.fn())).rejects.toThrow(/アプリIDは数値/);
    await expect(runBatchDesignExportXlsxZipStandalone({ apps: [{ appId: '1' }, { appId: 'bad' }] }, vi.fn())).rejects.toThrow(/2行目.*アプリIDは数値/);
  });
  it('does not silently drop malformed batch targets', () => {
    expect(validateDesignExportTargets([{ appId: '1' }, { appId: 'bad' }])).toMatch(/2行目.*アプリIDは数値/);
    expect(validateDesignExportTargets([{ appId: '1', guestId: 'bad' }])).toMatch(/ゲストIDは数値/);
  });
});
