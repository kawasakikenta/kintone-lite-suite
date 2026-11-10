import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

class FakeScript extends EventTarget {
  src = '';
  integrity = '';
  crossOrigin: string | null = null;
  async = false;
  dataset: Record<string, string> = {};
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  attributes: Record<string, string> = {};
  getAttribute(name: string) { return name === 'integrity' ? this.integrity || null : (this.attributes[name] ?? null); }
}

let scripts: FakeScript[];
let onAppend: (script: FakeScript) => void;

async function importLoader() {
  vi.resetModules();
  return await import('../../src/tabs/mermaid-loader');
}

beforeEach(() => {
  vi.useFakeTimers();
  scripts = [];
  onAppend = () => {};
  vi.stubGlobal('document', {
    querySelectorAll: (selector: string) => {
      const match = /^script\[src="(.*)"\]$/.exec(selector);
      return scripts.filter((script) => match && script.src === match[1]);
    },
    createElement: () => new FakeScript(),
    head: { appendChild: (script: FakeScript) => { scripts.push(script); queueMicrotask(() => onAppend(script)); } },
    addEventListener() {},
    removeEventListener() {}
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('Mermaid の読み込み先', () => {
  it('固定版を npm の配布物のハッシュで検証する jsDelivr と unpkg だけを候補にする（cdnjs は含めない）', async () => {
    const { MERMAID_SCRIPT_SOURCES, MERMAID_INTEGRITY, MERMAID_VERSION } = await importLoader();
    expect(MERMAID_VERSION).toBe('10.6.1');
    expect(MERMAID_INTEGRITY).toMatch(/^sha384-[A-Za-z0-9+/]{64}$/);
    expect(MERMAID_SCRIPT_SOURCES.map((source) => source.url)).toEqual([
      'https://cdn.jsdelivr.net/npm/mermaid@10.6.1/dist/mermaid.min.js',
      'https://unpkg.com/mermaid@10.6.1/dist/mermaid.min.js'
    ]);
    for (const source of MERMAID_SCRIPT_SOURCES) expect(source.integrity).toBe(MERMAID_INTEGRITY);
  });
});

describe('loadMermaidScript', () => {
  it('integrity と crossorigin="anonymous" を付けて読み込む', async () => {
    const { loadMermaidScript, MERMAID_SCRIPT_SOURCES } = await importLoader();
    onAppend = (script) => script.onload?.();
    await loadMermaidScript();
    expect(scripts).toHaveLength(1);
    expect(scripts[0].src).toBe(MERMAID_SCRIPT_SOURCES[0].url);
    expect(scripts[0].integrity).toBe(MERMAID_SCRIPT_SOURCES[0].integrity);
    expect(scripts[0].crossOrigin).toBe('anonymous');
  });

  it('1 つ目が失敗（通信できない・ハッシュ不一致）したら 2 つ目を、同じ検証付きで試す', async () => {
    const { loadMermaidScript, MERMAID_SCRIPT_SOURCES } = await importLoader();
    onAppend = (script) => { if (script.src === MERMAID_SCRIPT_SOURCES[0].url) script.onerror?.(); else script.onload?.(); };
    await loadMermaidScript();
    expect(scripts.map((script) => script.src)).toEqual(MERMAID_SCRIPT_SOURCES.map((source) => source.url));
    expect(scripts.every((script) => script.integrity && script.crossOrigin === 'anonymous')).toBe(true);
  });

  it('すべて失敗したら全候補の理由を 1 つのエラーにまとめ、次の呼び出しでやり直せる', async () => {
    const { loadMermaidScript } = await importLoader();
    onAppend = (script) => script.onerror?.();
    const error = await loadMermaidScript().catch((e) => e);
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toContain('cdn.jsdelivr.net');
    expect(error.message).toContain('unpkg.com');
    expect(error.message).toContain('一致しません');
    expect(error.message).not.toContain('cdnjs');

    onAppend = (script) => script.onload?.();
    await expect(loadMermaidScript()).resolves.toBeUndefined();
    expect(scripts).toHaveLength(3);
  });

  it('応答が返らない読み込み先は 30 秒で諦めて次の候補へ進む', async () => {
    const { loadMermaidScript, MERMAID_LOAD_TIMEOUT_MS, MERMAID_SCRIPT_SOURCES } = await importLoader();
    onAppend = (script) => { if (script.src === MERMAID_SCRIPT_SOURCES[1].url) script.onload?.(); };
    const loading = loadMermaidScript();
    await vi.advanceTimersByTimeAsync(MERMAID_LOAD_TIMEOUT_MS);
    await expect(loading).resolves.toBeUndefined();
    expect(scripts).toHaveLength(2);
    expect(scripts[0].dataset.failed).toBe('1');
  });

  it('読み込み中は 1 つの Promise を共有する', async () => {
    const { loadMermaidScript } = await importLoader();
    onAppend = (script) => script.onload?.();
    const first = loadMermaidScript();
    expect(loadMermaidScript()).toBe(first);
    await first;
    expect(scripts).toHaveLength(1);
  });

  it('同じ URL でも integrity の無い既存の script は信用せず、検証付きの要素を新しく作る', async () => {
    const { loadMermaidScript, MERMAID_SCRIPT_SOURCES } = await importLoader();
    const foreign = new FakeScript();
    foreign.src = MERMAID_SCRIPT_SOURCES[0].url;
    foreign.dataset.loaded = '1';
    scripts.push(foreign);
    onAppend = (script) => script.onload?.();
    await loadMermaidScript();
    expect(scripts).toHaveLength(2);
    expect(scripts[1].integrity).toBe(MERMAID_SCRIPT_SOURCES[0].integrity);
  });

  it('同じ integrity で読み込み済みの要素は再利用する', async () => {
    const { loadMermaidScript, MERMAID_SCRIPT_SOURCES } = await importLoader();
    const verified = new FakeScript();
    verified.src = MERMAID_SCRIPT_SOURCES[0].url;
    verified.integrity = MERMAID_SCRIPT_SOURCES[0].integrity;
    verified.dataset.loaded = '1';
    scripts.push(verified);
    await loadMermaidScript();
    expect(scripts).toHaveLength(1);
  });
});
