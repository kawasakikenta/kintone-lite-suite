import { beforeEach, describe, expect, it, vi } from 'vitest';

const downloads: Array<{ name: string; text: string }> = [];
vi.mock('../../src/utils', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../src/utils')>()),
  downloadText: (name: string, text: string) => { downloads.push({ name, text }); }
}));

import { runDesignDiffMdStandalone } from '../../src/tabs/design-standalone';

function bundle(appId: string, fetchedAt: string, name: string) {
  return {
    appId, guestId: '', preview: false, fetchedAt, meta: { sectionRevisions: {} },
    sections: { appSettings: { name, theme: 'WHITE' } }
  };
}

describe('runDesignDiffMdStandalone', () => {
  beforeEach(() => { downloads.length = 0; });

  it('取得日時の違いだけでは差分行にしない', async () => {
    const status = vi.fn();
    await runDesignDiffMdStandalone({
      source: { appId: '1', importedBundle: bundle('1', '2026-01-01T00:00:00.000Z', '同じ名前') },
      target: { appId: '1', importedBundle: bundle('1', '2026-02-02T00:00:00.000Z', '同じ名前') }
    }, status);
    expect(downloads).toHaveLength(1);
    const text = downloads[0].text;
    expect(text).toContain('| 差分行数 | 追加 0 行 / 削除 0 行 |');
    expect(text).toContain('差分はありません');
    expect(text).not.toMatch(/^[+-] .*取得日時/m);
  });

  it('設定の違いは追加・削除として数える', async () => {
    await runDesignDiffMdStandalone({
      source: { appId: '1', importedBundle: bundle('1', '2026-01-01T00:00:00.000Z', '新しい名前') },
      target: { appId: '1', importedBundle: bundle('1', '2026-02-02T00:00:00.000Z', '古い名前') }
    }, vi.fn());
    expect(downloads[0].text).toMatch(/^\+ .*新しい名前/m);
    expect(downloads[0].text).toMatch(/^- .*古い名前/m);
  });
});
