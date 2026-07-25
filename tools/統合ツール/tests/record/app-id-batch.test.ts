import { describe, expect, it, vi } from 'vitest';
import { parseRecordAppIds, runRecordAppBatchStandalone } from '../../src/tabs/record-standalone';

describe('record app ID batch operations', () => {
  it('accepts pasted comma, Japanese comma, whitespace and newline separated IDs', () => {
    expect(parseRecordAppIds('463,464、469　470\n471 463')).toEqual(['463', '464', '469', '470', '471']);
  });

  it('rejects invalid and non-positive IDs', () => {
    expect(() => parseRecordAppIds('463,abc,0')).toThrow('アプリIDは正の数値');
  });

  it('runs every app in order and reports failures after continuing', async () => {
    const visited: string[] = [];
    const status = vi.fn();
    await expect(runRecordAppBatchStandalone('463,464,469', async (appId) => {
      visited.push(appId);
      if (appId === '464') throw new Error('権限がありません');
    }, status)).rejects.toThrow('3件中1件が失敗');
    expect(visited).toEqual(['463', '464', '469']);
  });
});
