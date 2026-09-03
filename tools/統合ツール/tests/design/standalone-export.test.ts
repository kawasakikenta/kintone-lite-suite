import { describe, expect, it, vi } from 'vitest';
import { runDesignExportStandalone } from '../../src/tabs/design-standalone';

describe('lite design export', () => {
  it('rejects an unsupported format before fetching settings', async () => {
    await expect(runDesignExportStandalone('pdf', { appId: '1' }, vi.fn())).rejects.toThrow(/md または json/);
  });
});
