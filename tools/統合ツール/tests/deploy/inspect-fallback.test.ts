import { describe, expect, it, vi } from 'vitest';

// 要約が空になる（要約器が差分を言語化できない）場合でも、利用者に「変更あり」を伝える。
vi.mock('../../src/reflect/changeSummary', async (importOriginal) => ({ ...(await importOriginal<typeof import('../../src/reflect/changeSummary')>()), summarizeReflectItems: () => [] }));

import { compareDeploySection } from '../../src/deploy/inspect';

describe('compareDeploySection の補い', () => {
  it('status が change なのに要約が空なら、項目名で 1 件補う', () => {
    const diff = compareDeploySection('viewSettings', { views: { A: 1 } }, { views: { A: 2 } });
    expect(diff.status).toBe('change');
    expect(diff.items).toEqual([{ kind: '変更', name: 'ビュー設定', details: ['設定の内容が異なります'] }]);
    expect(diff.counts).toEqual({ added: 0, changed: 1, removed: 0 });
  });
});
