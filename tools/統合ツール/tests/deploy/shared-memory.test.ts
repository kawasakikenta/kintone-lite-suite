import { afterEach, describe, expect, it, vi } from 'vitest';
import { sharedMemory } from '../../src/entries/deployMemory';

afterEach(() => { vi.unstubAllGlobals(); });

describe('sharedMemory: 閉じて開き直したときに引き継ぐ状態（メモリだけ）', () => {
  it('同じページで開き直すと前の状態を引き継ぎ、ページを読み込み直すと消える', () => {
    const page1 = { documentElement: {} };
    vi.stubGlobal('document', page1);
    const first = sharedMemory('source', { sourceApp: '', lastRun: null as null | { text: string } });
    expect(first.restored).toBe(false);
    first.state.sourceApp = '101';
    first.state.lastRun = { text: '結果' };
    // スクリプトを読み込み直しても、同じページなら引き継ぐ
    const reopened = sharedMemory('source', { sourceApp: '', lastRun: null as null | { text: string } });
    expect(reopened.restored).toBe(true);
    expect(reopened.state.sourceApp).toBe('101');
    expect(reopened.state.lastRun).toEqual({ text: '結果' });
    // 別の名前の状態は別に持つ
    expect(sharedMemory('publish', { flow: 'source' }).restored).toBe(false);
    // ページを読み込み直した（新しい document）と消える。永続化はしない
    vi.stubGlobal('document', { documentElement: {} });
    expect(sharedMemory('source', { sourceApp: '', lastRun: null }).restored).toBe(false);
  });

  it('新しい版で増えた項目は、初期値で補う', () => {
    vi.stubGlobal('document', { documentElement: {} });
    sharedMemory('source', { a: 1 }).state.a = 5;
    const next = sharedMemory('source', { a: 1, b: 'new' });
    expect(next.state).toEqual({ a: 5, b: 'new' });
  });
});
