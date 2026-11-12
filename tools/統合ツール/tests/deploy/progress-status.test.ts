'use strict';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PROGRESS_RENDER_INTERVAL_MS, createProgressStatus } from '../../src/entries/deployProgressView.js';

// 差分確認の進捗（アプリごとに届く）を、画面へは一定間隔にまとめて書く。
// 届くたびに書くと、対象が 1000 アプリの画面では描き直しだけで数十秒かかる（CI の browser-dom が 30 秒の待ちを超えた）。
describe('createProgressStatus', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  function setup() {
    const written: string[] = [];
    const progress = createProgressStatus((message) => { written.push(message); });
    return { written, progress };
  }

  it('最初の進捗はすぐ書く', () => {
    const { written, progress } = setup();
    progress.update('1/1000');
    expect(written).toEqual(['1/1000']);
  });

  it('間隔の中で続けて届いた進捗は、最後の 1 件だけを間隔の終わりに書く', () => {
    const { written, progress } = setup();
    progress.update('1/1000');
    for (let done = 2; done <= 20; done += 1) progress.update(`${done}/1000`);
    expect(written).toEqual(['1/1000']);
    vi.advanceTimersByTime(PROGRESS_RENDER_INTERVAL_MS - 1);
    expect(written).toEqual(['1/1000']);
    vi.advanceTimersByTime(1);
    expect(written).toEqual(['1/1000', '20/1000']);
  });

  it('1000 件が 4 ミリ秒おきに届いても、書く回数は間隔ごとに 1 回までにする', () => {
    const { written, progress } = setup();
    for (let done = 1; done <= 1000; done += 1) {
      progress.update(`${done}/1000`);
      vi.advanceTimersByTime(4);
    }
    vi.advanceTimersByTime(PROGRESS_RENDER_INTERVAL_MS);
    expect(written.length).toBeLessThanOrEqual(Math.ceil((1000 * 4) / PROGRESS_RENDER_INTERVAL_MS) + 1);
    expect(written.at(-1)).toBe('1000/1000');
  });

  it('前回から間隔が空いていれば、すぐ書く（1 件ずつ時間のかかる確認では毎回表示する）', () => {
    const { written, progress } = setup();
    progress.update('1/3');
    vi.advanceTimersByTime(PROGRESS_RENDER_INTERVAL_MS);
    progress.update('2/3');
    vi.advanceTimersByTime(500);
    progress.update('3/3');
    expect(written).toEqual(['1/3', '2/3', '3/3']);
  });

  it('stop() の後は、まだ書いていない進捗を書かない（完了・中止の文言を遅れて上書きしない）', () => {
    const { written, progress } = setup();
    progress.update('1/1000');
    progress.update('2/1000');
    progress.stop();
    vi.advanceTimersByTime(PROGRESS_RENDER_INTERVAL_MS * 10);
    progress.update('3/1000');
    vi.advanceTimersByTime(PROGRESS_RENDER_INTERVAL_MS * 10);
    expect(written).toEqual(['1/1000']);
  });
});
