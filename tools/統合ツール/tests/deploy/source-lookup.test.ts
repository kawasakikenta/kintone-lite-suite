'use strict';

import { describe, expect, it } from 'vitest';
import { LOOKUP_CANDIDATES_TEXT, describeLookupConflict, describeSourceLookupCandidate, lookupCandidatesFor } from '../../src/deploy/sourceLookup';
import { buildSourceDeployRecordMarkdown, buildSourceDeployResultJson, type SourceRecordInput } from '../../src/deploy/sourceReport';
import type { LookupMapCandidates } from '../../src/reflect/lookupCandidates';

const candidates: LookupMapCandidates = {
  candidates: [{ from: '101', to: '201', total: 3, sources: ['ルックアップ「顧客」', 'アクション「コピー」'] }],
  conflicts: [{ from: '102', targets: [{ to: '202', total: 1, sources: ['ルックアップ「商品」'] }, { to: '203', total: 2, sources: ['関連レコード一覧「明細」'] }] }]
};

describe('参照先変換の候補の表示', () => {
  it('候補は旧ID → 反映先の参照先と根拠で示し、アプリ名は分かる範囲で添える', () => {
    expect(describeSourceLookupCandidate(candidates.candidates[0])).toBe('101 → 201（ルックアップ「顧客」、アクション「コピー」 ほか 1 件）');
    expect(describeSourceLookupCandidate(candidates.candidates[0], (side) => (side === 'from' ? '顧客台帳（開発）' : '顧客台帳'))).toBe('101（顧客台帳（開発）） → 201（顧客台帳）（ルックアップ「顧客」、アクション「コピー」 ほか 1 件）');
  });

  it('食い違いは自動では入れないと示す', () => {
    expect(describeLookupConflict(candidates.conflicts[0])).toBe('102 → 202 または 203：反映先の参照先が一致していません（202: ルックアップ「商品」 / 203: 関連レコード一覧「明細」 ほか 1 件）。自動では入れません。参照先変換に自分で入力してください。');
  });

  it('フィールド設定・アクション設定を反映しないときは出さない', () => {
    expect(lookupCandidatesFor(candidates, ['fieldSettings', 'layoutSettings'])).toBe(candidates);
    expect(lookupCandidatesFor(candidates, ['actionSettings'])).toBe(candidates);
    expect(lookupCandidatesFor(candidates, ['layoutSettings', 'viewSettings'])).toBeUndefined();
    expect(lookupCandidatesFor(undefined, ['fieldSettings'])).toBeUndefined();
    expect(lookupCandidatesFor({ candidates: [], conflicts: [] }, ['fieldSettings'])).toBeUndefined();
  });
});

describe('記録の Markdown と結果 JSON', () => {
  const input = (lookupCandidates?: LookupMapCandidates): SourceRecordInput => ({
    goal: 'production', source: { appId: '1', guestId: '', name: '開発', environment: 'production' }, target: { appId: '2', guestId: '', name: '本番' },
    preserveTargetOnly: true, lookupMap: {}, ...(lookupCandidates ? { lookupCandidates } : {}), sections: [], startedAt: '2026-11-10T00:00:00.000Z', finishedAt: '2026-11-10T00:01:00.000Z',
    result: { goal: 'production', apply: { logs: [], sections: [], finalRevision: '1' } }
  });

  it('候補を入れないまま反映したときは、注意として残す', () => {
    const markdown = buildSourceDeployRecordMarkdown(input(candidates));
    expect(markdown).toContain('## 注意: 参照先変換の候補');
    expect(markdown).toContain(LOOKUP_CANDIDATES_TEXT);
    expect(markdown).toContain('- 候補: 101 → 201（ルックアップ「顧客」、アクション「コピー」 ほか 1 件）');
    expect(markdown).toContain('- 食い違い（自動では入れません）: 102 → 202 または 203');
    expect(buildSourceDeployResultJson(input(candidates)).lookupCandidates).toEqual(candidates);
  });

  it('候補が無いときは残さない', () => {
    expect(buildSourceDeployRecordMarkdown(input())).not.toContain('参照先変換の候補');
    expect(buildSourceDeployResultJson(input()).lookupCandidates).toBeUndefined();
    expect(buildSourceDeployResultJson(input({ candidates: [], conflicts: [] })).lookupCandidates).toBeUndefined();
  });
});
