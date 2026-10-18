import { describe, expect, it } from 'vitest';
import { describeRolloutLookupNotice, formatRolloutTarget, parseRolloutQueue, ROLLOUT_QUEUE_LIMIT, serializeRolloutQueue, upsertRolloutLog } from '../../src/reflect/rolloutQueue';

describe('続けて反映する反映先', () => {
  it('ID とアプリURLを区切り文字を問わず読み取り、重複と現在の反映先を除く', () => {
    const result = parseRolloutQueue('203, 204、205\n https://example.cybozu.com/k/guest/5/206/?view=1 203 202', [{ appId: '202', guestId: '' }]);
    expect(result).toEqual({ ok: true, targets: [
      { appId: '203', guestId: '' }, { appId: '204', guestId: '' }, { appId: '205', guestId: '' }, { appId: '206', guestId: '5' }
    ] });
  });
  it('同じIDでもゲストスペースが違えば別の反映先として扱う', () => {
    const result = parseRolloutQueue('/k/guest/5/203/ 203');
    expect(result.ok && result.targets).toEqual([{ appId: '203', guestId: '5' }, { appId: '203', guestId: '' }]);
  });
  it('読み取れない値は位置が分かる文言で止める', () => {
    expect(parseRolloutQueue('203 abc')).toEqual({ ok: false, error: '「abc」をアプリIDとして読み取れません。数字のID、またはアプリのURLを入力してください。' });
    expect(parseRolloutQueue('0')).toMatchObject({ ok: false });
  });
  it('空の入力は空のリスト、上限を超えたら止める', () => {
    expect(parseRolloutQueue('  \n ')).toEqual({ ok: true, targets: [] });
    const many = Array.from({ length: ROLLOUT_QUEUE_LIMIT + 1 }, (_, i) => String(1000 + i)).join(' ');
    expect(parseRolloutQueue(many)).toMatchObject({ ok: false, error: expect.stringContaining(`${ROLLOUT_QUEUE_LIMIT} 件まで`) });
  });
  it('表示用の文字列と、入力欄へ戻す文字列を作る', () => {
    const targets = [{ appId: '203', guestId: '' }, { appId: '206', guestId: '5' }];
    expect(targets.map(formatRolloutTarget)).toEqual(['#203', '#206（ゲスト 5）']);
    const text = serializeRolloutQueue(targets);
    expect(parseRolloutQueue(text)).toEqual({ ok: true, targets });
  });

  it('展開の記録は、同じ反映先の行を最新の結果で置き換え、順序と他の行は保つ', () => {
    const row = (appId: string, guestId: string, ok: number, at: number) => ({ appId, guestId, ok, at });
    const log = [row('202', '', 1, 1), row('203', '', 1, 2), row('203', '5', 1, 3)];
    expect(upsertRolloutLog(log, row('202', '', 2, 9))).toEqual([row('202', '', 2, 9), row('203', '', 1, 2), row('203', '5', 1, 3)]);
    // ゲストスペースが違えば別の反映先
    expect(upsertRolloutLog(log, row('203', '5', 0, 9))).toEqual([row('202', '', 1, 1), row('203', '', 1, 2), row('203', '5', 0, 9)]);
    expect(upsertRolloutLog(log, row('204', '', 1, 9)).map(item => item.appId)).toEqual(['202', '203', '203', '204']);
    // 元の配列は変えない
    expect(log[0].ok).toBe(1);
  });
  it('展開の記録は上限を超えたら古い行から捨てる', () => {
    const log = Array.from({ length: 3 }, (_, i) => ({ appId: String(200 + i), guestId: '' }));
    expect(upsertRolloutLog(log, { appId: '300', guestId: '' }, 3).map(item => item.appId)).toEqual(['201', '202', '300']);
    expect(upsertRolloutLog(log, { appId: '201', guestId: '' }, 3).map(item => item.appId)).toEqual(['200', '201', '202']);
  });
  it('参照先変換があるときだけ、すべての反映先へ同じ変換を使う注意を返す', () => {
    expect(describeRolloutLookupNotice(0)).toBe('');
    expect(describeRolloutLookupNotice(2)).toBe('参照先変換（2 件）を、すべての反映先に同じように使います。反映先ごとに変換先が違う場合は、反映先を切り替えた後に参照先変換を直してください。');
  });
});
