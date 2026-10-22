'use strict';

import { describe, expect, it, vi } from 'vitest';
import {
  APP_NAME_HINT_FAILURE,
  createAppTableLookup,
  isCurrentApp,
  isLookupableApp,
  splitAppIdsForHint,
  type AppLookupCache,
  type AppLookupResult
} from '../../src/entries/appNameHint';
import { connectionSummary, formatWorkflowDuration } from '../../src/entries/liteWorkflow';

describe('splitAppIdsForHint', () => {
  it('カンマ・読点・空白・改行で区切り、空要素を除く', () => {
    expect(splitAppIdsForHint('100, 120 130\n140、150，160')).toEqual(['100', '120', '130', '140', '150', '160']);
    expect(splitAppIdsForHint('  ')).toEqual([]);
    expect(splitAppIdsForHint(undefined)).toEqual([]);
  });

  it('検証はせず、問い合わせ可否は isLookupableApp で判定する', () => {
    expect(splitAppIdsForHint('abc, 12')).toEqual(['abc', '12']);
    expect(isLookupableApp('12', '')).toBe(true);
    expect(isLookupableApp('abc', '')).toBe(false);
    expect(isLookupableApp('12', '0')).toBe(false);
  });
});

describe('createAppTableLookup', () => {
  function cacheOf(result: AppLookupResult): AppLookupCache & { get: ReturnType<typeof vi.fn> } {
    const get = vi.fn(async () => result);
    return { get, peek: () => undefined, remember: () => undefined } as any;
  }

  it('確認できた名前とコードを表の行へ渡す', async () => {
    const cache = cacheOf({ ok: true, appId: '101', name: '営業テンプレート', code: 'sales' });
    await expect(createAppTableLookup(cache)('101', '7')).resolves.toEqual({ ok: true, name: '営業テンプレート', code: 'sales' });
    expect(cache.get).toHaveBeenCalledWith('101', '7');
  });

  it('失敗は理由付きで ok:false にする', async () => {
    const cache = cacheOf({ ok: false, message: APP_NAME_HINT_FAILURE });
    await expect(createAppTableLookup(cache)('101', '')).resolves.toEqual({ ok: false, message: APP_NAME_HINT_FAILURE });
  });
});

describe('isCurrentApp', () => {
  it('kintone 画面外（既定のアプリIDが無い）では常に false', () => {
    expect(isCurrentApp('1', '')).toBe(false);
    expect(isCurrentApp('', '')).toBe(false);
  });
});

describe('connectionSummary', () => {
  it('アプリ名があれば ID の後ろに添え、ゲストスペースと環境を続ける', () => {
    expect(connectionSummary('123', '5', '本番', '顧客管理')).toBe('#123 顧客管理（ゲスト 5） · 本番');
    expect(connectionSummary('123', '', 'プレビュー')).toBe('#123 · プレビュー');
    expect(connectionSummary('', '', undefined, '  ')).toBe('#未入力 · 本番');
  });
});

describe('formatWorkflowDuration', () => {
  it('秒・分秒の表記にし、1 秒未満は「1秒未満」にする', () => {
    expect(formatWorkflowDuration(0)).toBe('1秒未満');
    expect(formatWorkflowDuration(999)).toBe('1秒未満');
    expect(formatWorkflowDuration(5000)).toBe('5秒');
    expect(formatWorkflowDuration(72_400)).toBe('1分12秒');
    expect(formatWorkflowDuration(3_600_000)).toBe('60分0秒');
    expect(formatWorkflowDuration(-10)).toBe('1秒未満');
    expect(formatWorkflowDuration(Number.NaN)).toBe('1秒未満');
  });
});
