import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

// 設計書作成の進捗表示（innerHTML で作る）には、アプリIDやゲストスペースIDを含む文言が入る。
// 呼び出し元で数字だけに絞っていても、表示の側でも HTML としては解釈させない（文字として出す）。
describe('設計書作成の進捗表示', () => {
  const source = readFileSync(resolve(__dirname, '../../src/tabs/design-xlsx.ts'), 'utf8');

  it('進捗の文言を innerHTML にそのまま入れない', () => {
    const templates = source.split('\n').filter((line) => line.includes('el.innerHTML') && line.includes('id="kex-status"'));
    expect(templates.length).toBe(2);
    for (const line of templates) {
      expect(line).not.toContain('>${msg}<');
      expect(line).toContain('>${escapeHtmlAttr(String(msg ?? \'\'))}<');
    }
  });
});
