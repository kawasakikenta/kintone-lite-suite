import { describe, it, expect } from 'vitest';
import { buildProcessMermaidSource, findInitialState } from '../../src/tabs/process-standalone';

// プロセス図は状態名をそのまま Mermaid のノード ID にしていたため、空白や記号を含む
// 状態名（「承認 待ち」「完了(仮)」など）で描画が壊れていた。別名宣言方式を固定する。

const states = { '未処理': {}, '承認 待ち': {}, '完了 "仮"': {} };
const actions = [
  { name: '申請する', from: '未処理', to: '承認 待ち' },
  { name: '承認: OK', from: '承認 待ち', to: '完了 "仮"' },
  { name: '差し戻し', from: '承認 待ち', to: '未処理' }
];

describe('buildProcessMermaidSource', () => {
  it('declares every state with an alias and references aliases in transitions', () => {
    const src = buildProcessMermaidSource(states, actions);
    expect(src.startsWith('stateDiagram-v2\n')).toBe(true);
    expect(src).toContain('state "未処理" as s0');
    expect(src).toContain('state "承認 待ち" as s1');
    expect(src).toContain(`state "完了 'カ'" as s2`.replace('カ', '仮'));
    expect(src).toContain('[*] --> s0');
    expect(src).toContain('s0 --> s1 : 申請する');
    expect(src).toContain('s1 --> s2 : 承認- OK');
    expect(src).not.toMatch(/-->\s*承認/);
  });

  it('adds highlight class only for known states', () => {
    expect(buildProcessMermaidSource(states, actions, '承認 待ち')).toContain('class s1 current');
    expect(buildProcessMermaidSource(states, actions, '存在しない')).not.toContain('classDef');
  });

  it('keeps transitions to states missing from the state list and skips broken actions', () => {
    const src = buildProcessMermaidSource({ A: {} }, [{ name: 'x', from: 'A', to: 'B' }, { name: 'broken', from: 'A' }]);
    expect(src).toContain('state "B" as s1');
    expect(src).toContain('s0 --> s1 : x');
    expect(src).not.toContain('broken');
  });
});

describe('findInitialState', () => {
  it('prefers the smallest kintone index, then the state no action transitions into', () => {
    expect(findInitialState({ B: { index: '1' }, A: { index: '0' } }, [{ from: 'A', to: 'B' }, { from: 'B', to: 'A' }])).toBe('A');
    expect(findInitialState({ B: {}, A: {} }, [{ from: 'A', to: 'B' }])).toBe('A');
    expect(findInitialState(states, actions)).toBe('未処理');
    expect(findInitialState({}, [])).toBeNull();
  });

  it('draws the start marker into the indexed initial state even when it is a transition target', () => {
    const src = buildProcessMermaidSource(
      { 未処理: { index: '0' }, 処理中: { index: '1' } },
      [{ name: '開始', from: '未処理', to: '処理中' }, { name: '戻す', from: '処理中', to: '未処理' }]
    );
    expect(src).toContain('[*] --> s0');
    expect(src).not.toContain('[*] --> s1');
  });
});
