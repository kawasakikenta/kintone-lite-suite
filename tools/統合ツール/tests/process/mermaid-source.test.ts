import { beforeEach, describe, it, expect, vi } from 'vitest';
import { apiGet } from '../../src/api';
import { buildProcessMermaidSource, findInitialState, runRenderProcessFlowStandalone, validateProcessConnection } from '../../src/tabs/process-standalone';

vi.mock('../../src/api', async original => ({
  ...await original<typeof import('../../src/api')>(),
  apiGet: vi.fn()
}));

beforeEach(() => vi.clearAllMocks());

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

describe('validateProcessConnection', () => {
  it('rejects path-like app or guest identifiers before API access', () => {
    expect(validateProcessConnection('7', '3')).toEqual({ appId: '7', guestId: '3' });
    expect(() => validateProcessConnection('', '')).toThrow(/アプリID/);
    expect(() => validateProcessConnection('7/records', '')).toThrow(/アプリID/);
    expect(() => validateProcessConnection('7', '../3')).toThrow(/ゲストID/);
  });
});

describe('runRenderProcessFlowStandalone freshness', () => {
  it('does not commit a deferred simulation render after the connection changes', async () => {
    const previousWindow = (globalThis as any).window;
    const gate = new Promise<void>(resolve => { (globalThis as any).__resolveMermaid = resolve; });
    let renderCalls = 0;
    const mermaid = {
      render: vi.fn(async () => {
        renderCalls++;
        if (renderCalls === 2) await gate;
        return { svg: renderCalls === 2 ? '<svg>stale</svg>' : '<svg>initial</svg>' };
      })
    };
    (globalThis as any).window = { mermaid };
    const statuses: string[] = [];
    const textEl: any = { value: '' };
    const viewEl: any = { innerHTML: '' };
    const simUi: any = {
      container: { style: {} },
      current: { textContent: '', style: {} },
      select: { disabled: true, innerHTML: '', value: '' },
      startBtn: { onclick: null },
      execBtn: { onclick: null }
    };
    let current = true;
    try {
      vi.mocked(apiGet).mockResolvedValue({ enable: true, states: { Start: {} }, actions: [] });
      await runRenderProcessFlowStandalone(
        { appId: '7' },
        message => statuses.push(message),
        { textEl, viewEl, simUi, isCurrent: () => current }
      );
      expect(renderCalls).toBe(1);
      expect(simUi.startBtn.onclick).toEqual(expect.any(Function));

      const pending = simUi.startBtn.onclick();
      await new Promise(resolve => setTimeout(resolve, 0));
      expect(renderCalls).toBe(2);
      const statusCount = statuses.length;
      current = false;
      textEl.value = 'new connection source';
      viewEl.innerHTML = '<span>new connection</span>';
      (globalThis as any).__resolveMermaid();
      await pending;

      expect(textEl.value).toBe('new connection source');
      expect(viewEl.innerHTML).toBe('<span>new connection</span>');
      expect(statuses).toHaveLength(statusCount);
    } finally {
      delete (globalThis as any).__resolveMermaid;
      if (previousWindow === undefined) delete (globalThis as any).window;
      else (globalThis as any).window = previousWindow;
    }
  });
});
