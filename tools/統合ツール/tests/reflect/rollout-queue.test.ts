import { describe, expect, it } from 'vitest';
import { countRolloutLogDropped, describeRolloutLookupNotice, formatRolloutTarget, mergeRolloutTargets, parseRolloutQueue, ROLLOUT_LOG_LIMIT, ROLLOUT_QUEUE_LIMIT, serializeRolloutQueue, upsertRolloutLog } from '../../src/reflect/rolloutQueue';

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
  it('環境内の全アプリを対象にできる件数まで受け付ける', () => {
    expect(ROLLOUT_QUEUE_LIMIT).toBe(1000);
    const all = Array.from({ length: ROLLOUT_QUEUE_LIMIT }, (_, i) => String(1 + i)).join('\n');
    const result = parseRolloutQueue(all);
    expect(result.ok && result.targets.length).toBe(ROLLOUT_QUEUE_LIMIT);
    // 上限を超える分は、重複や現在の反映先を除いた件数で数える
    expect(parseRolloutQueue(`${all}\n1 2 3`)).toMatchObject({ ok: true });
    expect(parseRolloutQueue(`${all}\n${ROLLOUT_QUEUE_LIMIT + 1}`)).toMatchObject({ ok: false, error: expect.stringContaining('分けて実行') });
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

  it('展開の記録の上限は、最初の反映先と続けて反映する上限までの反映先をすべて残せる', () => {
    expect(ROLLOUT_LOG_LIMIT).toBeGreaterThanOrEqual(ROLLOUT_QUEUE_LIMIT + 1);
    let log: Array<{ appId: string; guestId: string }> = [];
    for (let i = 0; i <= ROLLOUT_QUEUE_LIMIT; i++) log = upsertRolloutLog(log, { appId: String(i + 1), guestId: '' });
    expect(log).toHaveLength(ROLLOUT_QUEUE_LIMIT + 1);
    expect(log[0].appId).toBe('1');
  });
  it('記録の上限で捨てる件数を数える（同じ反映先の再実行では捨てない）', () => {
    const log = Array.from({ length: 3 }, (_, i) => ({ appId: String(200 + i), guestId: '' }));
    expect(countRolloutLogDropped(log, { appId: '300', guestId: '' }, 3)).toBe(1);
    expect(countRolloutLogDropped(log, { appId: '201', guestId: '' }, 3)).toBe(0);
    expect(countRolloutLogDropped(log, { appId: '300', guestId: '' }, 10)).toBe(0);
    expect(countRolloutLogDropped(log, { appId: '201', guestId: '9' }, 3)).toBe(1);
  });

  describe('アプリ一覧から選んだ反映先を加える', () => {
    const pick = (appId: string, guestId = '') => ({ appId, guestId });
    it('入力済みと重複せずに加え、ゲストスペースのアプリはURL形式で戻す', () => {
      const result = mergeRolloutTargets('203\n204', [pick('204'), pick('205'), pick('206', '5'), pick('206', '5')]);
      expect(result).toEqual({ ok: true, text: '203\n204\n205\n/k/guest/5/206/', added: 2, duplicates: 1, excluded: 0, total: 4 });
      if (result.ok) expect(parseRolloutQueue(result.text)).toEqual({ ok: true, targets: [pick('203'), pick('204'), pick('205'), pick('206', '5')] });
    });
    it('同じIDでもゲストスペースが違えば別のアプリとして加える', () => {
      const result = mergeRolloutTargets('203', [pick('203', '5')]);
      expect(result).toMatchObject({ ok: true, added: 1, duplicates: 0, total: 2 });
    });
    it('反映元は加えず、除いた件数を返す', () => {
      const result = mergeRolloutTargets('', [pick('100'), pick('101'), pick('102')], [pick('101')]);
      expect(result).toMatchObject({ ok: true, text: '100\n102', added: 2, excluded: 1, total: 2 });
      // 反映元と同じIDでもゲストスペースが違えば除かない
      expect(mergeRolloutTargets('', [pick('101', '3')], [pick('101')])).toMatchObject({ ok: true, added: 1, excluded: 0 });
    });
    it('現在の反映先と同じ入力は消さずに残す（実行時に除く）', () => {
      const merged = mergeRolloutTargets('202', [pick('203')]);
      expect(merged).toMatchObject({ ok: true, text: '202\n203', total: 2 });
      if (merged.ok) expect(parseRolloutQueue(merged.text, [pick('202')])).toEqual({ ok: true, targets: [pick('203')] });
    });
    it('追加できる反映先が無いときは入力を変えない', () => {
      expect(mergeRolloutTargets('203', [pick('203')])).toMatchObject({ ok: true, text: '203', added: 0, duplicates: 1 });
    });
    it('入力欄に読み取れない値があるときは追加せずに止める', () => {
      expect(mergeRolloutTargets('203 abc', [pick('204')])).toEqual({ ok: false, error: expect.stringContaining('「abc」をアプリIDとして読み取れません') });
    });
    it('加えると上限を超えるときは、件数と分けて実行する案内を返す', () => {
      const picks = Array.from({ length: ROLLOUT_QUEUE_LIMIT + 1 }, (_, i) => pick(String(i + 1)));
      const result = mergeRolloutTargets('', picks);
      expect(result).toEqual({ ok: false, error: expect.stringContaining(`${ROLLOUT_QUEUE_LIMIT} 件までです（${ROLLOUT_QUEUE_LIMIT + 1} 件）`) });
      if (!result.ok) expect(result.error).toContain('入力欄は変更していません');
      expect(mergeRolloutTargets('', picks.slice(0, ROLLOUT_QUEUE_LIMIT))).toMatchObject({ ok: true, added: ROLLOUT_QUEUE_LIMIT, total: ROLLOUT_QUEUE_LIMIT });
    });
  });
});
