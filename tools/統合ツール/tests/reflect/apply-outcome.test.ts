'use strict';

import { describe, it, expect } from 'vitest';
import {
  buildReflectErrorHint,
  collectRetrySectionKeys,
  summarizeApplyOutcome,
  type ApplySectionOutcome
} from '../../src/reflect/applyOutcome.js';

describe('buildReflectErrorHint', () => {
  it('権限エラーには管理権限の確認を促す', () => {
    expect(buildReflectErrorHint('権限がありません (CB_NO02)')).toContain('アプリ管理権限');
    expect(buildReflectErrorHint('403 Forbidden')).toContain('アプリ管理権限');
  });

  it('アプリ不存在エラーにはアプリID・ゲストIDの確認を促す', () => {
    expect(buildReflectErrorHint('指定したアプリ（id: 123）が見つかりません。(GAIA_AP01)')).toContain('ゲストスペースID');
  });

  it('ルックアップ関連エラーにはマッピングでの変換を促す', () => {
    expect(buildReflectErrorHint('ルックアップの参照先アプリが不正です')).toContain('Lookup AppID マッピング');
  });

  it('フィールド不存在エラーには先にフィールド設定の反映を促す', () => {
    expect(buildReflectErrorHint('指定したフィールド（code: 顧客名）が見つかりません')).toContain('フィールド設定');
  });

  it('通信エラーには再実行を促す', () => {
    expect(buildReflectErrorHint('Failed to fetch')).toContain('再実行');
  });

  it('未知のエラーは空文字（ヒントなし）', () => {
    expect(buildReflectErrorHint('something unexpected happened')).toBe('');
    expect(buildReflectErrorHint('')).toBe('');
  });
});

describe('collectRetrySectionKeys', () => {
  const sections: ApplySectionOutcome[] = [
    { sectionKey: 'fieldSettings', label: 'フィールド設定', status: 'ok' },
    { sectionKey: 'viewSettings', label: 'ビュー設定', status: 'ng', message: '権限がありません' },
    { sectionKey: 'appAcl', label: 'アプリ権限', status: 'skip', message: '比較元未取得' },
    { sectionKey: 'notifications', label: '通知設定', status: 'pending', message: '中断のため未実行' }
  ];

  it('失敗と未実行のセクションを実行順で返す', () => {
    expect(collectRetrySectionKeys(sections)).toEqual(['viewSettings', 'notifications']);
  });

  it('全成功なら空配列', () => {
    expect(collectRetrySectionKeys([
      { sectionKey: 'fieldSettings', label: 'フィールド設定', status: 'ok' }
    ])).toEqual([]);
    expect(collectRetrySectionKeys([])).toEqual([]);
  });
});

describe('summarizeApplyOutcome', () => {
  it('ステータス別に件数を集計する', () => {
    const sections: ApplySectionOutcome[] = [
      { sectionKey: 'a', label: 'A', status: 'ok' },
      { sectionKey: 'b', label: 'B', status: 'ok' },
      { sectionKey: 'c', label: 'C', status: 'ng' },
      { sectionKey: 'd', label: 'D', status: 'pending' },
      { sectionKey: 'e', label: 'E', status: 'skip' }
    ];
    expect(summarizeApplyOutcome(sections)).toEqual({ ok: 2, ng: 1, pending: 1, skip: 1 });
  });

  it('空配列はすべて 0', () => {
    expect(summarizeApplyOutcome([])).toEqual({ ok: 0, ng: 0, pending: 0, skip: 0 });
  });
});
