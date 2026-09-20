import { describe, expect, it } from 'vitest';
import { buildErCrawlOptions, validateErOptions } from '../src/tabs/er-standalone';

describe('ER図 Lite input validation', () => {
  it('reports the field that contains a malformed target before crawling', () => {
    expect(validateErOptions({ appId: '1,abc' })).toMatch(/アプリIDは数値.*abc/);
    expect(validateErOptions({ appId: '1', guestId: 'guest' })).toMatch(/ゲストIDは数値/);
    expect(validateErOptions({ spaceId: 'space' })).toMatch(/スペースIDは数値/);
    expect(validateErOptions({ appId: '1', maxDepth: '1.5' })).toMatch(/探索深さは0以上の整数/);
  });

  it('accepts a space-only target and rejects an empty target', () => {
    expect(validateErOptions({ spaceId: '7' })).toBe('');
    expect(validateErOptions({ appId: '7', appIds: [] })).toBe('');
    expect(validateErOptions({})).toMatch(/アプリID または スペースID/);
  });

  it('normalizes direct comma-separated app IDs for standalone callers', () => {
    expect(buildErCrawlOptions({ appId: '1, 2', extraAppIds: '2,3' }).startAppIds).toEqual(['1', '2', '3']);
  });
});
