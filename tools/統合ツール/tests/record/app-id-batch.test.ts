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

  it('keeps the existing successful result for operations without warnings', async () => {
    const status = vi.fn();
    await runRecordAppBatchStandalone('463,464', async () => {}, status);
    expect(status).toHaveBeenLastCalledWith('2アプリの操作が完了しました');
  });

  it('retains an earlier app warning after a later app succeeds', async () => {
    const visited: string[] = [];
    const status = vi.fn();
    const warning = 'バックアップ完了（未取得のテーブル 1件、詳細は manifest.json）';

    await runRecordAppBatchStandalone('463,464', async (appId) => {
      visited.push(appId);
      if (appId === '463') return { warning };
    }, status);

    expect(visited).toEqual(['463', '464']);
    expect(status).toHaveBeenLastCalledWith(`2アプリの操作が完了しました\n警告 1アプリ:\nApp 463: ${warning}`, true);
  });

  it('includes warnings with failures while continuing the remaining apps', async () => {
    const visited: string[] = [];
    const status = vi.fn();
    const error = await runRecordAppBatchStandalone('463,464,469', async (appId) => {
      visited.push(appId);
      if (appId === '463') return { warning: 'テーブル明細の一部を取得できませんでした' };
      if (appId === '464') throw new Error('権限がありません');
    }, status).catch((caught) => caught);

    expect(visited).toEqual(['463', '464', '469']);
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toContain('3件中1件が失敗しました');
    expect(error.message).toContain('App 464: 権限がありません');
    expect(error.message).toContain('警告 1アプリ:\nApp 463: テーブル明細の一部を取得できませんでした');
    expect(status).not.toHaveBeenCalledWith('3アプリの操作が完了しました');
  });
});
