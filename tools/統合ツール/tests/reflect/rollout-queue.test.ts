import { describe, expect, it } from 'vitest';
import { formatRolloutTarget, parseRolloutQueue, ROLLOUT_QUEUE_LIMIT, serializeRolloutQueue } from '../../src/reflect/rolloutQueue';

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
});
