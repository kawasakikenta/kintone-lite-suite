import { describe, expect, it } from 'vitest';
import { buildErCrawlOptions, validateErOptions } from '../src/tabs/er-standalone';
import { summarizeErStartIds } from '../src/tabs/er';

describe('ER図: 環境内の全アプリを起点にする', () => {
  const ids = Array.from({ length: 3000 }, (_, i) => String(i + 1));

  it('起点IDの個数に上限は無く、数千件でも入力チェックを通る', () => {
    expect(validateErOptions({ appId: ids.join(', '), appIds: ids, guestId: '' })).toBe('');
  });

  it('全アプリの起点が重複なく順序どおり crawl のオプションになる', () => {
    const options = buildErCrawlOptions({ appId: ids.join(', '), appIds: [...ids, '5'], guestId: '' });
    expect(options.startAppIds).toHaveLength(3000);
    expect(options.startAppIds[0]).toBe('1');
    expect(options.startAppIds.at(-1)).toBe('3000');
  });

  it('状態表示用の起点は先頭の数件と総数に短縮する', () => {
    expect(summarizeErStartIds(ids)).toBe('1, 2, 3, 4, 5 他2995件 (計3000)');
    expect(summarizeErStartIds(['7', '8'])).toBe('7, 8');
  });
});
