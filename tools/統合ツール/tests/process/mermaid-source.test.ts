import { beforeEach, describe, it, expect, vi } from 'vitest';
import { apiGet } from '../../src/api';
import {
  buildProcessMermaidSource,
  findInitialState,
  summarizeProcessStructure,
  describeStateAssignee,
  describeSimActionCondition,
  runRenderProcessFlowStandalone,
  validateProcessConnection
} from '../../src/tabs/process-standalone';

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
  it('declares every state with an alias, references aliases in transitions, and marks terminal states', () => {
    const src = buildProcessMermaidSource(states, actions);
    expect(src.startsWith('stateDiagram-v2\n')).toBe(true);
    expect(src).toContain('state "未処理" as s0');
    expect(src).toContain('state "承認 待ち" as s1');
    expect(src).toContain(`state "完了 'カ'" as s2`.replace('カ', '仮'));
    expect(src).toContain('[*] --> s0');
    expect(src).toContain('s0 --> s1 : 申請する');
    expect(src).toContain('s1 --> s2 : 承認- OK');
    expect(src).toContain('s2 --> [*]');
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

  it('summarizes process structure and describes assignee and action conditions', () => {
    const summary = summarizeProcessStructure(
      { 未処理: { index: '0' }, 承認待ち: { index: '1' }, 完了: { index: '2' } },
      [
        { name: '申請', from: '未処理', to: '承認待ち' },
        { name: '即時完了', from: '未処理', to: '完了' },
        { name: '承認', from: '承認待ち', to: '未定义状態' }
      ],
      1
    );
    expect(summary.stateCount).toBe(3);
    expect(summary.actionCount).toBe(3);
    expect(summary.startStates).toEqual(['未処理']);
    expect(summary.endStates).toEqual(['完了']);
    expect(summary.branchingStates).toEqual(['未処理']);
    expect(summary.undefinedStates).toEqual(['未定义状態']);
    expect(summary.orphanActionCount).toBe(1);
    expect(describeStateAssignee({ assignee: { type: 'ONE', entities: [{ entity: { type: 'USER', code: 'alice' } }] } })).toContain('alice');
    expect(describeSimActionCondition({ type: 'SECONDARY', filterCond: 'amount > 100' })).toContain('amount > 100');
  });
});

describe('buildProcessMermaidSource HTML-like names', () => {
  it('keeps names that would be swallowed as HTML tags, and leaves plain comparisons alone', () => {
    const src = buildProcessMermaidSource(
      { 'Level<High>': {}, '<10万円': {}, '<b>太字</b>': {} },
      [{ name: '承認<script>x</script>', from: 'Level<High>', to: '<10万円' }]
    );
    expect(src).not.toMatch(/<[A-Za-z/]/);
    expect(src).toContain('state "Level＜High>" as s0');
    expect(src).toContain('state "<10万円" as s1');
    expect(src).toContain('state "＜b>太字＜/b>" as s2');
    expect(src).toContain('s0 --> s1 : 承認＜script>x＜/script>');
  });
});

describe('findInitialState', () => {
  it('prefers the smallest kintone index, then the state no action transitions into', () => {
    expect(findInitialState({ B: { index: '1' }, A: { index: '0' } }, [{ from: 'A', to: 'B' }, { from: 'B', to: 'A' }])).toBe('A');
    expect(findInitialState({ B: {}, A: {} }, [{ from: 'A', to: 'B' }])).toBe('A');
    expect(findInitialState(states, actions)).toBe('未処理');
    expect(findInitialState({}, [])).toBeNull();
  });

  it('does not treat a missing or blank index as 0', () => {
    // index が空・null の状態は Number() で 0 になり、本来の開始状態(index 0)より先に選ばれてはいけない
    expect(findInitialState({ A: { index: '' }, B: { index: '0' } }, [{ from: 'B', to: 'A' }])).toBe('B');
    expect(findInitialState({ A: { index: null }, B: { index: '0' } }, [])).toBe('A');
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

describe('runRenderProcessFlowStandalone disabled process', () => {
  it('leaves the Mermaid source empty so copy/save cannot export a non-Mermaid message', async () => {
    const textEl: any = { value: 'previous source' };
    const viewEl: any = { innerHTML: '' };
    const simUi: any = { container: { style: { display: 'block' } } };
    vi.mocked(apiGet).mockResolvedValue({ enable: false, states: {}, actions: [] });
    const result = await runRenderProcessFlowStandalone({ appId: '7' }, () => {}, { textEl, viewEl, simUi });
    expect(result).toBeNull();
    expect(textEl.value).toBe('');
    expect(viewEl.innerHTML).toContain('プロセス管理は無効です');
    expect(simUi.container.style.display).toBe('none');
  });
});

describe('runRenderProcessFlowStandalone API response', () => {
  it('requests the production status.json for the guest space and rejects an empty response', async () => {
    const targets: any = { textEl: { value: '' }, viewEl: { innerHTML: '' } };
    vi.mocked(apiGet).mockResolvedValue(undefined);
    await expect(runRenderProcessFlowStandalone({ appId: '7', guestId: '3' }, () => {}, targets)).rejects.toThrow(/想定外の応答/);
    expect(apiGet).toHaveBeenCalledWith('/k/guest/3/v1', '/app/status.json', { app: '7', lang: 'user' });
    expect(targets.viewEl.innerHTML).toBe('');
  });
});

function simTargets() {
  const textEl: any = { value: '' };
  const viewEl: any = { innerHTML: '' };
  const simUi: any = {
    container: { style: {} },
    current: { textContent: '', style: {} },
    select: { disabled: true, innerHTML: '', value: '0' },
    startBtn: { onclick: null },
    execBtn: { onclick: null }
  };
  return { textEl, viewEl, simUi };
}

async function withMermaid<T>(mermaid: any, fn: () => Promise<T>): Promise<T> {
  const previousWindow = (globalThis as any).window;
  (globalThis as any).window = mermaid ? { mermaid } : {};
  try {
    return await fn();
  } finally {
    if (previousWindow === undefined) delete (globalThis as any).window;
    else (globalThis as any).window = previousWindow;
  }
}

describe('runRenderProcessFlowStandalone output', () => {
  it('keeps the shareable source free of the simulation highlight while the diagram is highlighted', async () => {
    vi.mocked(apiGet).mockResolvedValue({ enable: true, states: { A: { index: '0' }, B: { index: '1' } }, actions: [{ name: 'go', from: 'A', to: 'B' }] });
    const render = vi.fn(async () => ({ svg: '<svg/>' }));
    const targets = simTargets();
    await withMermaid({ render }, async () => {
      await runRenderProcessFlowStandalone({ appId: '7' }, () => {}, targets);
      await targets.simUi.startBtn.onclick();
    });
    expect(String((render.mock.calls.at(-1) as any[])[1])).toContain('class s0 current');
    expect(targets.textEl.value).not.toContain('classDef');
    expect(targets.textEl.value).toContain('s0 --> s1 : go');
  });

  it('applies the strict security level once, even when the page already provides mermaid', async () => {
    vi.mocked(apiGet).mockResolvedValue({ enable: true, states: { A: {} }, actions: [] });
    const mermaid = { initialize: vi.fn(), render: vi.fn(async () => ({ svg: '<svg/>' })) };
    await withMermaid(mermaid, async () => {
      await runRenderProcessFlowStandalone({ appId: '7' }, () => {}, simTargets());
      await runRenderProcessFlowStandalone({ appId: '7' }, () => {}, simTargets());
    });
    expect(mermaid.initialize).toHaveBeenCalledTimes(1);
    expect(mermaid.initialize).toHaveBeenCalledWith(expect.objectContaining({ securityLevel: 'strict' }));
  });
});

describe('runRenderProcessFlowStandalone simulation notices', () => {
  it('reports simulation progress with a finished tone and explains buttons that cannot act', async () => {
    const notices: Array<[string, boolean | undefined, string | undefined]> = [];
    const targets = simTargets();
    vi.mocked(apiGet).mockResolvedValue({
      enable: true,
      states: { 未処理: { index: '0' }, 完了: { index: '1' } },
      actions: [{ name: '完了にする', from: '未処理', to: '完了' }]
    });
    await withMermaid({ render: vi.fn(async () => ({ svg: '<svg/>' })) }, async () => {
      await runRenderProcessFlowStandalone({ appId: '7' }, (m, e, tone) => notices.push([m, e, tone]), targets);
      const { startBtn, execBtn, select } = targets.simUi;
      await execBtn.onclick();
      expect(notices.at(-1)).toEqual(['先に「最初から開始」を押してください', false, 'warn']);
      await startBtn.onclick();
      expect(notices.at(-1)).toEqual(['シミュレーション開始: 未処理', false, 'ok']);
      select.value = '0';
      await execBtn.onclick();
      expect(notices.at(-1)).toEqual(['アクション「完了にする」実行 → 「完了」', false, 'ok']);
      await execBtn.onclick();
      expect(notices.at(-1)?.[0]).toContain('実行できるアクションはありません');
      expect(notices.at(-1)?.[2]).toBe('warn');
    });
  });

  it('reports excluded actions as a warning, not an error', async () => {
    const notices: Array<[string, boolean | undefined, string | undefined]> = [];
    vi.mocked(apiGet).mockResolvedValue({
      enable: true,
      states: { A: {} },
      actions: [{ name: 'broken', from: 'A', to: '' }]
    });
    await withMermaid({ render: vi.fn(async () => ({ svg: '<svg/>' })) }, () =>
      runRenderProcessFlowStandalone({ appId: '7' }, (m, e, tone) => notices.push([m, e, tone]), simTargets()));
    expect(notices.at(-1)).toEqual([expect.stringContaining('除外'), false, 'warn']);
  });

  it('tells a render failure apart from a load failure in the fallback notice', async () => {
    vi.mocked(apiGet).mockResolvedValue({ enable: true, states: { A: {} }, actions: [] });
    const rendered = simTargets();
    const renderNotices: string[] = [];
    await withMermaid({ render: vi.fn(async () => { throw new Error('Maximum Text size in diagram exceeded'); }) }, () =>
      runRenderProcessFlowStandalone({ appId: '7' }, m => renderNotices.push(m), rendered));
    expect(rendered.viewEl.innerHTML).toContain('描画に失敗');
    expect(rendered.viewEl.innerHTML).not.toContain('読み込めなかった');
    expect(renderNotices.at(-1)).toContain('Maximum Text size');

    const loaded = simTargets();
    await withMermaid(null, () => runRenderProcessFlowStandalone({ appId: '7' }, () => {}, loaded));
    expect(loaded.viewEl.innerHTML).toContain('読み込みに失敗');
  });
});

describe('runRenderProcessFlowStandalone Mermaid load failure', () => {
  it('shows an actionable message without the CDN URL and keeps the URL in the log only', async () => {
    vi.mocked(apiGet).mockResolvedValue({ enable: true, states: { A: {} }, actions: [] });
    vi.stubGlobal('document', {
      querySelector: () => null,
      createElement: () => ({ dataset: {} }),
      head: { appendChild: (script: any) => queueMicrotask(() => script.onerror?.()) },
      addEventListener() {},
      removeEventListener() {}
    });
    try {
      const targets: any = { ...simTargets(), log: vi.fn() };
      const notices: string[] = [];
      await withMermaid(null, () => runRenderProcessFlowStandalone({ appId: '7' }, m => notices.push(m), targets));
      expect(notices.length).toBeGreaterThan(0);
      for (const notice of notices) expect(notice).not.toMatch(/https?:\/\//);
      expect(notices.at(-1)).toContain('図の描画ライブラリ（Mermaid）を読み込めませんでした。ネットワークやブラウザの制限を確認してください。');
      expect(targets.viewEl.innerHTML).not.toMatch(/https?:\/\//);
      expect(targets.log).toHaveBeenCalledTimes(1);
      expect(targets.log.mock.calls[0][0]).toMatch(/https:\/\/cdn\.jsdelivr\.net\/npm\/mermaid[\s\S]*unpkg\.com[\s\S]*cdnjs/);
    } finally {
      vi.unstubAllGlobals();
    }
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
