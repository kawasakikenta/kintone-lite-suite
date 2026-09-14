import { describe, expect, it } from 'vitest';
import { buildDesignDiffReport, summarizeDesignDiff } from '../../src/tabs/design-standalone';

const diff = [
  '  # kintone アプリ設計書',
  '  ## アプリ設定',
  '- | アプリ名 | 旧 |',
  '+ | アプリ名 | 新 |',
  '  ## フィールド設定',
  '+ | memo | メモ | 文字列（複数行） |',
  '  | title | 件名 | 文字列（1行） |'
].join('\n');

describe('design diff report', () => {
  it('集計はセクション見出しごとに追加・削除行を数える', () => {
    expect(summarizeDesignDiff(diff)).toEqual({
      added: 2,
      removed: 1,
      sections: [
        { section: 'アプリ設定', added: 1, removed: 1 },
        { section: 'フィールド設定', added: 1, removed: 0 }
      ]
    });
    expect(summarizeDesignDiff('')).toEqual({ added: 0, removed: 0, sections: [] });
  });

  it('レポートは比較方向・見方・セクション別集計・diff 本体の順に並ぶ', () => {
    const md = buildDesignDiffReport({
      diff,
      generatedAt: '2026-09-14 10:00:00',
      source: { appId: '200', appName: '営業案件（開発）', guestId: '', environment: 'プレビュー（未公開）' },
      target: { appId: '201', appName: '営業案件', guestId: '5', environment: '本番（運用中）' }
    });
    expect(md.startsWith('# 設計書差分レポート')).toBe(true);
    expect(md).toContain('| 比較元（追加・更新後の姿） | App 200 営業案件（開発） · プレビュー（未公開） |');
    expect(md).toContain('| 比較先（現在の設定） | App 201 営業案件（ゲスト 5） · 本番（運用中） |');
    expect(md).toContain('| 差分行数 | 追加 2 行 / 削除 1 行 |');
    expect(md).toContain('| アプリ設定 | 1 | 1 |');
    expect(md.indexOf('## 見方')).toBeLessThan(md.indexOf('## セクション別の差分'));
    expect(md.indexOf('## セクション別の差分')).toBeLessThan(md.indexOf('```diff'));
    expect(md).toContain('```diff\n' + diff + '\n```');
  });

  it('差分がない場合はその旨を書く', () => {
    const md = buildDesignDiffReport({ diff: '  # 同一', generatedAt: 'now',
      source: { appId: '1', appName: '', guestId: '', environment: '本番（運用中）' },
      target: { appId: '2', appName: '', guestId: '', environment: '本番（運用中）' } });
    expect(md).toContain('差分はありません');
    expect(md).toContain('| 差分行数 | 追加 0 行 / 削除 0 行 |');
  });
});
