import { afterEach, describe, expect, it, vi } from 'vitest';
import { beginRun, endRun, noteWrite, requestCancel } from '../../src/runControl';
import { parseRecordAppIds, runRecordAppBatchStandalone, toPanelTone, validateRecordConnection, watchCancelledWriteWait, type RecordOperationSummary } from '../../src/tabs/record-standalone';

describe('record app ID batch operations', () => {
  it('accepts pasted comma, Japanese comma, whitespace and newline separated IDs', () => {
    expect(parseRecordAppIds('463,464、469　470\n471 463')).toEqual(['463', '464', '469', '470', '471']);
  });

  it('rejects invalid and non-positive IDs', () => {
    expect(() => parseRecordAppIds('463,abc,0')).toThrow('アプリIDは正の数値');
  });

  it('validates a single app and guest pair before building a REST path', () => {
    expect(validateRecordConnection('463', '9')).toEqual({ appId: '463', guestId: '9' });
    expect(() => validateRecordConnection('463,464', '')).toThrow(/1件ずつ/);
    expect(() => validateRecordConnection('463', '../9')).toThrow(/ゲストID/);
  });

  it('runs every app in order and reports failures after continuing', async () => {
    const visited: string[] = [];
    const status = vi.fn();
    await expect(runRecordAppBatchStandalone('463,464,469', async (appId) => {
      visited.push(appId);
      if (appId === '464') throw new Error('権限がありません');
    }, status)).rejects.toThrow('3アプリ中1アプリで失敗');
    expect(visited).toEqual(['463', '464', '469']);
  });

  it('keeps the existing successful result for operations without warnings', async () => {
    const status = vi.fn();
    await runRecordAppBatchStandalone('463,464', async () => {}, status);
    expect(status).toHaveBeenLastCalledWith('2アプリの操作が完了しました', 'ok');
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
    expect(status).toHaveBeenLastCalledWith(`2アプリの操作が完了しました\n警告 1アプリ:\nApp 463: ${warning}`, 'warn');
  });

  it('does not report an app whose confirmation was declined as completed', async () => {
    const status = vi.fn();
    await runRecordAppBatchStandalone('463,464', async (appId) => (appId === '464' ? { cancelled: true } : undefined), status);
    expect(status).toHaveBeenLastCalledWith('1アプリの操作が完了しました\n確認でキャンセルしたため実行していません（1アプリ）: App 464', 'warn');
  });

  it('keeps cancelled apps in the failure summary', async () => {
    const error = await runRecordAppBatchStandalone('463,464', async (appId) => {
      if (appId === '463') return { cancelled: true };
      throw new Error('権限がありません');
    }, vi.fn()).catch((caught) => caught);
    expect(error.message).toContain('2アプリ中1アプリで失敗しました');
    expect(error.message).toContain('確認でキャンセルしたため実行していません（1アプリ）: App 463');
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
    expect(error.message).toContain('3アプリ中1アプリで失敗しました');
    expect(error.message).toContain('App 464: 権限がありません');
    expect(error.message).toContain('警告 1アプリ:\nApp 463: テーブル明細の一部を取得できませんでした');
    expect(status).not.toHaveBeenCalledWith('3アプリの操作が完了しました');
  });

  describe('result counts in the final message', () => {
    const statusSummary = (count: number): RecordOperationSummary => ({
      counts: { 件: count },
      written: count,
      describe: (counts, appIds) => (appIds.length === 1 ? `${counts['件']}件のステータスを更新しました（App ${appIds[0]}）` : `${appIds.length}アプリで計 ${counts['件']}件のステータスを更新しました`)
    });

    it('ends a single app with the record count and the app', async () => {
      const status = vi.fn();
      const outcome = await runRecordAppBatchStandalone('202', async () => ({ summary: statusSummary(250) }), status);
      expect(status).toHaveBeenLastCalledWith('250件のステータスを更新しました（App 202）', 'ok');
      expect(outcome).toEqual({ message: '250件のステータスを更新しました（App 202）', tone: 'ok' });
    });

    it('adds up the counts of every app', async () => {
      const status = vi.fn();
      await runRecordAppBatchStandalone('1,2,3', async (appId) => ({ summary: statusSummary(Number(appId) * 100 + 150) }), status);
      expect(status).toHaveBeenLastCalledWith('3アプリで計 1050件のステータスを更新しました', 'ok');
    });

    it('keeps a warning after the counts and reports it in the warn tone', async () => {
      const status = vi.fn();
      await runRecordAppBatchStandalone('202', async () => ({ summary: statusSummary(5), warning: '添付除外 1フィールド' }), status);
      expect(status).toHaveBeenLastCalledWith('5件のステータスを更新しました（App 202）\n警告 1アプリ:\nApp 202: 添付除外 1フィールド', 'warn');
    });

    it('counts only the apps that ran when one app declined its confirmation', async () => {
      const status = vi.fn();
      await runRecordAppBatchStandalone('1,2', async (appId) => (appId === '2' ? { cancelled: true } : { summary: statusSummary(10) }), status);
      expect(status).toHaveBeenLastCalledWith('10件のステータスを更新しました（App 1）\n確認でキャンセルしたため実行していません（1アプリ）: App 2', 'warn');
    });

    it('ends on the confirmation stage when every app declined', async () => {
      const status = vi.fn();
      const outcome = await runRecordAppBatchStandalone('1,2', async () => ({ cancelled: true }), status);
      expect(status).toHaveBeenLastCalledWith('確認でキャンセルしました（実行していません）', 'info');
      expect(outcome.tone).toBe('info');
      expect(status.mock.calls.at(-1)?.[0]).toMatch(/キャンセルしました/);
    });

    it('counts apps in the failure line, keeps the written and unwritten records, and marks partial success', async () => {
      const partial = Object.assign(new Error('App 2 の更新が途中で失敗しました'), { partial: { done: 100, from: 101, to: 200, total: 350 } });
      const error: any = await runRecordAppBatchStandalone('1,2,3', async (appId) => {
        if (appId === '2') throw partial;
        return { summary: statusSummary(200) };
      }, vi.fn()).catch((caught) => caught);
      expect(error.message.split('\n')[0]).toBe('3アプリ中1アプリで失敗しました（成功 2アプリ・書き込み済み 500件・未処理 250件）');
      expect(error.message).toContain('App 2: App 2 の更新が途中で失敗しました');
      // 一部のアプリが成功しているので、パネルは警告として扱う
      expect(error.partialSuccess).toBe(true);
    });

    it('treats a batch where every app failed as an error', async () => {
      const error: any = await runRecordAppBatchStandalone('1,2', async () => { throw new Error('権限がありません'); }, vi.fn()).catch((caught) => caught);
      expect(error.message.split('\n')[0]).toBe('2アプリ中2アプリで失敗しました');
      expect(error.partialSuccess).toBeUndefined();
    });
  });

  it('maps the status callback tones for the panel, keeping boolean true as an error', () => {
    expect(toPanelTone()).toBe('busy');
    expect(toPanelTone(false)).toBe('busy');
    expect(toPanelTone(true)).toBe('err');
    expect(toPanelTone('warn')).toBe('warn');
    expect(toPanelTone('info')).toBe('info');
  });
});

describe('guidance while a cancelled run waits for a write response', () => {
  afterEach(() => { vi.useRealTimers(); });
  const GUIDANCE = '書き込み中のリクエストの応答を待っています。応答が返ると次のリクエストの前で止めます。応答がない場合は kintone 画面で結果を確認してください。';

  it('shows the guidance once cancel has been waiting for more than 10 seconds after a write', () => {
    vi.useFakeTimers();
    const token = beginRun();
    const notify = vi.fn();
    const stop = watchCancelledWriteWait(notify);
    noteWrite();
    vi.advanceTimersByTime(30000);
    expect(notify).not.toHaveBeenCalled(); // 中止を要求していない間は何も言わない
    requestCancel(token);
    vi.advanceTimersByTime(9000);
    expect(notify).not.toHaveBeenCalled();
    vi.advanceTimersByTime(2000);
    expect(notify).toHaveBeenCalledTimes(1);
    expect(notify).toHaveBeenCalledWith(GUIDANCE);
    vi.advanceTimersByTime(30000);
    expect(notify).toHaveBeenCalledTimes(1);
    stop();
    endRun(token);
  });

  it('stays silent when no write was sent or the run finished first', () => {
    vi.useFakeTimers();
    const token = beginRun();
    const notify = vi.fn();
    const stop = watchCancelledWriteWait(notify);
    requestCancel(token);
    vi.advanceTimersByTime(60000);
    expect(notify).not.toHaveBeenCalled();
    stop();
    endRun(token);

    const second = beginRun();
    const notifySecond = vi.fn();
    const stopSecond = watchCancelledWriteWait(notifySecond);
    noteWrite();
    requestCancel(second);
    stopSecond();
    vi.advanceTimersByTime(60000);
    expect(notifySecond).not.toHaveBeenCalled();
    endRun(second);
  });
});
