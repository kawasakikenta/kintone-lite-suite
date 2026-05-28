import { describe, it, expect } from 'vitest';
import { buildPreviewProdDiffCsv } from '../../src/reflect/previewProdDiff';

describe('buildPreviewProdDiffCsv', () => {
  it('emits a header row even with no diff rows', () => {
    const csv = buildPreviewProdDiffCsv([]);
    const lines = csv.split('\r\n');
    expect(lines).toHaveLength(1);
    expect(lines[0]).toBe('セクション,差分種別,重要度,パス,理由,プレビュー値,本番値');
  });

  it('renders one data row per diff and uses CRLF separators', () => {
    const csv = buildPreviewProdDiffCsv([
      { sectionKey: 'fieldSettings', type: 'changed', severity: 'high', path: 'a.b', left: 'x', right: 'y' }
    ]);
    const lines = csv.split('\r\n');
    expect(lines).toHaveLength(2);
    expect(lines[1]).toContain('値違い');
    expect(lines[1]).toContain('a.b');
  });

  it('quotes and escapes cells containing commas, quotes, or newlines', () => {
    // reasonSummary はそのまま出力される生フィールドなので CSV エスケープの検証に使う
    const csv = buildPreviewProdDiffCsv([
      { sectionKey: 'views', type: 'changed', severity: 'low', path: 'p', reasonSummary: 'a,"b"\nc', left: 'x', right: 'y' }
    ]);
    // セル内に LF を含むため CRLF 区切りで分割しても 1 データ行のまま保たれる
    const row = csv.split('\r\n')[1];
    expect(row).toContain('"a,""b""\nc"');
  });

  it('maps preview-only (removed) and production-only (added) to readable labels', () => {
    const csv = buildPreviewProdDiffCsv([
      { sectionKey: 'views', type: 'removed', severity: 'low', path: 'p', left: 'only-in-preview', right: undefined },
      { sectionKey: 'views', type: 'added', severity: 'low', path: 'q', left: undefined, right: 'only-in-prod' }
    ]);
    const lines = csv.split('\r\n');
    expect(lines[1]).toContain('プレビューのみ');
    expect(lines[2]).toContain('本番のみ');
    // undefined values render as the placeholder, not empty
    expect(lines[1]).toContain('（なし）');
  });
});
