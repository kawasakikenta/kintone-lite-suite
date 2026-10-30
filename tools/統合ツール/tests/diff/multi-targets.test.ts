import { describe, expect, it } from 'vitest';
import {
  MULTI_AUTO_HTML_MAX_TARGETS,
  MULTI_LARGE_TARGET_THRESHOLD,
  describeMultiTargetFill,
  multiRetainNote,
  multiTargetScaleNote,
  planMultiAutoHtml,
  planMultiTargetFill
} from '../../src/diff/multi-targets';

const apps = (...ids: number[]) => ids.map((id) => ({ appId: String(id), appName: `App${id}` }));

describe('planMultiTargetFill', () => {
  it('adds every candidate in order when nothing exists yet', () => {
    const plan = planMultiTargetFill({ candidates: apps(1, 2, 3), guestId: '', existing: [{ appId: '', guestId: '' }], targetPreview: false });
    expect(plan.add.map((a) => a.appId)).toEqual(['1', '2', '3']);
    expect(plan.add[1].appName).toBe('App2');
    expect(plan).toMatchObject({ alreadyPresent: 0, skippedSelf: 0, invalid: 0 });
  });

  it('skips rows already present with the same app id and guest id only', () => {
    const plan = planMultiTargetFill({
      candidates: apps(1, 2),
      guestId: '5',
      existing: [{ appId: '1', guestId: '5' }, { appId: '2', guestId: '' }],
      targetPreview: false
    });
    expect(plan.add.map((a) => a.appId)).toEqual(['2']);
    expect(plan.alreadyPresent).toBe(1);
  });

  it('counts duplicate candidates as already present', () => {
    const plan = planMultiTargetFill({ candidates: apps(1, 1, 2), guestId: '', existing: [], targetPreview: false });
    expect(plan.add.map((a) => a.appId)).toEqual(['1', '2']);
    expect(plan.alreadyPresent).toBe(1);
  });

  it('skips the source app only when it would compare the same endpoint with itself', () => {
    const base = { candidates: apps(1, 2), guestId: '', existing: [] as Array<{ appId: string; guestId: string }> };
    const same = planMultiTargetFill({ ...base, source: { appId: '1', guestId: '', preview: false }, targetPreview: false });
    expect(same.add.map((a) => a.appId)).toEqual(['2']);
    expect(same.skippedSelf).toBe(1);
    // 本番 → プレビューは意味のある比較なので外さない
    const crossEnv = planMultiTargetFill({ ...base, source: { appId: '1', guestId: '', preview: false }, targetPreview: true });
    expect(crossEnv.add.map((a) => a.appId)).toEqual(['1', '2']);
    expect(crossEnv.skippedSelf).toBe(0);
    // ゲストスペースが違えば別のアプリ
    const otherGuest = planMultiTargetFill({ ...base, guestId: '7', source: { appId: '1', guestId: '', preview: false }, targetPreview: false });
    expect(otherGuest.add.map((a) => a.appId)).toEqual(['1', '2']);
  });

  it('ignores the self check while the source app id is empty (JSON import)', () => {
    const plan = planMultiTargetFill({ candidates: apps(1), guestId: '', existing: [], source: { appId: '', guestId: '', preview: false }, targetPreview: false });
    expect(plan.add).toHaveLength(1);
    expect(plan.skippedSelf).toBe(0);
  });

  it('drops candidates whose app id is not a positive integer and reports them', () => {
    const plan = planMultiTargetFill({
      candidates: [{ appId: 'abc' }, { appId: '0' }, { appId: ' 12 ', appName: ' 名前 ' }],
      guestId: '',
      existing: [],
      targetPreview: false
    });
    expect(plan.add).toEqual([{ appId: '12', appName: '名前', guestId: '' }]);
    expect(plan.invalid).toBe(2);
  });

  it('keeps each candidate guest space id (environment-wide list with guest spaces)', () => {
    const plan = planMultiTargetFill({
      candidates: [
        { appId: '1', appName: '通常', guestId: '' },
        { appId: '2', appName: 'ゲスト', guestId: '5' },
        { appId: '3', guestId: '8' },
        { appId: '4' }
      ],
      guestId: '9',
      existing: [{ appId: '3', guestId: '8' }],
      source: { appId: '2', guestId: '5', preview: false },
      targetPreview: false
    });
    expect(plan.add).toEqual([
      { appId: '1', appName: '通常', guestId: '' },
      { appId: '4', appName: '', guestId: '9' }
    ]);
    expect(plan).toMatchObject({ alreadyPresent: 1, skippedSelf: 1 });
  });

  it('handles thousands of candidates in linear time', () => {
    const candidates = Array.from({ length: 5000 }, (_, i) => ({ appId: String(i + 1) }));
    const existing = Array.from({ length: 2500 }, (_, i) => ({ appId: String(i + 1), guestId: '' }));
    const started = Date.now();
    const plan = planMultiTargetFill({ candidates, guestId: '', existing, targetPreview: false });
    expect(Date.now() - started).toBeLessThan(500);
    expect(plan.add).toHaveLength(2500);
    expect(plan.alreadyPresent).toBe(2500);
  });
});

describe('describeMultiTargetFill', () => {
  it('reports added, already present, skipped and invalid counts with the total', () => {
    const message = describeMultiTargetFill({ add: apps(1, 2), alreadyPresent: 3, skippedSelf: 1, invalid: 2 }, 9, '4');
    expect(message).toContain('比較先へ 2 件を追加しました（ゲストスペース 4）');
    expect(message).toContain('設定済みのため 3 件は追加していません');
    expect(message).toContain('比較元と同じ接続先のため 1 件を除きました');
    expect(message).toContain('アプリIDを読み取れない 2 件を除きました');
    expect(message).toContain('合計 9 件');
  });

  it('describes the guest space of the added apps from the plan itself', () => {
    const base = { alreadyPresent: 0, skippedSelf: 0, invalid: 0 };
    expect(describeMultiTargetFill({ ...base, add: [{ appId: '1', appName: '', guestId: '5' }] }, 1)).toContain('比較先へ 1 件を追加しました（ゲストスペース 5）');
    expect(describeMultiTargetFill({ ...base, add: [{ appId: '1', appName: '', guestId: '' }] }, 1)).toContain('比較先へ 1 件を追加しました。');
    expect(describeMultiTargetFill({ ...base, add: [
      { appId: '1', appName: '', guestId: '' },
      { appId: '2', appName: '', guestId: '5' },
      { appId: '3', appName: '', guestId: '8' }
    ] }, 3)).toContain('比較先へ 3 件を追加しました（うちゲストスペースのアプリ 2 件）');
  });

  it('says nothing could be set when there are no candidates', () => {
    expect(describeMultiTargetFill({ add: [], alreadyPresent: 0, skippedSelf: 0, invalid: 0 }, 0)).toContain('設定できるアプリがありません');
  });

  it('does not claim success when every candidate was already present', () => {
    const message = describeMultiTargetFill({ add: [], alreadyPresent: 4, skippedSelf: 0, invalid: 0 }, 4);
    expect(message).toContain('0 件を追加しました');
    expect(message).toContain('設定済みのため 4 件');
  });
});

describe('planMultiAutoHtml', () => {
  it('auto-saves up to the limit when checked', () => {
    expect(planMultiAutoHtml(MULTI_AUTO_HTML_MAX_TARGETS, true)).toMatchObject({ enabled: true, suppressedByCount: false });
  });

  it('stops auto-saving above the limit and explains why', () => {
    const plan = planMultiAutoHtml(MULTI_AUTO_HTML_MAX_TARGETS + 1, true);
    expect(plan.enabled).toBe(false);
    expect(plan.suppressedByCount).toBe(true);
    expect(plan.note).toContain(`${MULTI_AUTO_HTML_MAX_TARGETS + 1} 件`);
    expect(plan.note).toContain('自動保存しませんでした');
  });

  it('stays quiet when the option is off', () => {
    expect(planMultiAutoHtml(500, false)).toEqual({ enabled: false, suppressedByCount: false, note: '' });
  });
});

describe('scale notes', () => {
  it('only warn above the threshold', () => {
    expect(multiTargetScaleNote(MULTI_LARGE_TARGET_THRESHOLD)).toBe('');
    expect(multiTargetScaleNote(MULTI_LARGE_TARGET_THRESHOLD + 1)).toContain('中止');
    expect(multiRetainNote(MULTI_LARGE_TARGET_THRESHOLD)).toBe('');
    expect(multiRetainNote(250)).toContain('250件分');
  });
});
