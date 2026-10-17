import { describe, expect, it } from 'vitest';
import { buildErCrawlOptions, validateErOptions } from '../src/tabs/er-standalone';

describe('ER図 Lite input validation', () => {
  it('reports the field that contains a malformed target before crawling', () => {
    expect(validateErOptions({ appId: '1,abc' })).toMatch(/アプリIDは数値.*abc/);
    expect(validateErOptions({ appId: '1', guestId: 'guest' })).toMatch(/ゲストIDは数値/);
    expect(validateErOptions({ spaceId: 'space' })).toMatch(/スペースIDは数値/);
    expect(validateErOptions({ appId: '1', maxDepth: '1.5' })).toMatch(/探索深さは0以上の整数/);
  });

  it('accepts a space-only target and rejects an empty target or empty space selection', () => {
    expect(validateErOptions({ spaceId: '7' })).toBe('');
    expect(validateErOptions({ spaceId: '7', spaceSelectedAppIds: ['10'] })).toBe('');
    expect(validateErOptions({ spaceId: '7', spaceSelectedAppIds: [] })).toMatch(/スペース内アプリを1件以上選択/);
    expect(validateErOptions({ appId: '1', spaceId: '7', spaceSelectedAppIds: [] })).toBe('');
    expect(validateErOptions({ appId: '7', appIds: [] })).toBe('');
    expect(validateErOptions({})).toMatch(/アプリID または スペースID/);
  });

  it('normalizes direct comma-separated app IDs and preserves preview flag for standalone callers', () => {
    const built = buildErCrawlOptions({ appId: '1, 2', extraAppIds: '2,3', preview: true });
    expect(built.startAppIds).toEqual(['1', '2', '3']);
    expect(built.source.preview).toBe(true);
  });
});
