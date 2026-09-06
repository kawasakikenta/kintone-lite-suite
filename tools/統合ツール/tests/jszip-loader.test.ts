import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EXTERNAL_LIBRARIES } from '../src/constants';

class ScriptElement extends EventTarget {
  src = '';
  async = false;
  remove = vi.fn(() => {
    const index = scripts.indexOf(this);
    if (index >= 0) scripts.splice(index, 1);
  });
}

let scripts: ScriptElement[];
let pageWindow: { JSZip?: unknown };
let appendScript: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.resetModules();
  vi.useFakeTimers();
  scripts = [];
  pageWindow = {};
  appendScript = vi.fn((script: ScriptElement) => {
    scripts.push(script);
    return script;
  });
  vi.stubGlobal('window', pageWindow);
  vi.stubGlobal('document', {
    querySelectorAll: () => scripts.filter((script) => script.src === EXTERNAL_LIBRARIES.jszip.cdnUrl),
    createElement: () => new ScriptElement(),
    head: { appendChild: appendScript }
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function completeLoad(script: ScriptElement) {
  const ctor = class JSZip {};
  pageWindow.JSZip = ctor;
  script.dispatchEvent(new Event('load'));
  return ctor;
}

describe('loadJSZipLite', () => {
  it('reuses an already available JSZip without inserting a script', async () => {
    const ctor = class ExistingJSZip {};
    pageWindow.JSZip = ctor;
    const { loadJSZipLite } = await import('../src/jszipLoader');

    await expect(loadJSZipLite()).resolves.toBe(ctor);
    expect(appendScript).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('shares one in-flight promise and cleans both listeners after success', async () => {
    const { loadJSZipLite } = await import('../src/jszipLoader');
    const first = loadJSZipLite();
    const second = loadJSZipLite();
    expect(second).toBe(first);
    expect(appendScript).toHaveBeenCalledTimes(1);
    const script = scripts[0];
    const removeListener = vi.spyOn(script, 'removeEventListener');
    const ctor = completeLoad(script);

    await expect(first).resolves.toBe(ctor);
    await expect(second).resolves.toBe(ctor);
    expect(removeListener).toHaveBeenCalledWith('load', expect.any(Function));
    expect(removeListener).toHaveBeenCalledWith('error', expect.any(Function));
    expect(vi.getTimerCount()).toBe(0);
    expect(script.remove).not.toHaveBeenCalled();
  });

  it('removes a failed script and allows all waiting callers to retry successfully', async () => {
    const { loadJSZipLite } = await import('../src/jszipLoader');
    const first = loadJSZipLite();
    const second = loadJSZipLite();
    const failure = expect(first).rejects.toThrow('JSZipの読み込みに失敗');
    const secondFailure = expect(second).rejects.toThrow('JSZipの読み込みに失敗');
    const failed = scripts[0];
    const removeListener = vi.spyOn(failed, 'removeEventListener');
    failed.dispatchEvent(new Event('error'));
    await Promise.all([failure, secondFailure]);

    expect(failed.remove).toHaveBeenCalledOnce();
    expect(removeListener).toHaveBeenCalledWith('load', expect.any(Function));
    expect(removeListener).toHaveBeenCalledWith('error', expect.any(Function));
    expect(vi.getTimerCount()).toBe(0);
    const retried = loadJSZipLite();
    expect(retried).not.toBe(first);
    expect(appendScript).toHaveBeenCalledTimes(2);
    expect(scripts[0]).not.toBe(failed);
    const ctor = completeLoad(scripts[0]);
    await expect(retried).resolves.toBe(ctor);
  });

  it('retries a load event that did not provide a JSZip constructor', async () => {
    const { loadJSZipLite } = await import('../src/jszipLoader');
    const pending = loadJSZipLite();
    const failed = scripts[0];
    const failure = expect(pending).rejects.toThrow('グローバル変数が見つかりません');
    failed.dispatchEvent(new Event('load'));
    await failure;

    expect(failed.remove).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
    const retried = loadJSZipLite();
    const ctor = completeLoad(scripts[0]);
    await expect(retried).resolves.toBe(ctor);
  });

  it('times out a request without load/error events and permits a fresh request', async () => {
    const { loadJSZipLite } = await import('../src/jszipLoader');
    const pending = loadJSZipLite();
    const stalled = scripts[0];
    const failure = expect(pending).rejects.toThrow('30秒以内に完了しませんでした');
    await vi.advanceTimersByTimeAsync(30_000);
    await failure;

    expect(stalled.remove).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
    const retried = loadJSZipLite();
    stalled.dispatchEvent(new Event('error'));
    const ctor = completeLoad(scripts[0]);
    await expect(retried).resolves.toBe(ctor);
  });

  it('shares another feature’s loading script without replacing its handlers or element', async () => {
    const existing = new ScriptElement();
    existing.src = EXTERNAL_LIBRARIES.jszip.cdnUrl!;
    const otherLoad = vi.fn();
    existing.addEventListener('load', otherLoad);
    scripts.push(existing);
    const { loadJSZipLite } = await import('../src/jszipLoader');
    const pending = loadJSZipLite();
    const ctor = completeLoad(existing);

    await expect(pending).resolves.toBe(ctor);
    expect(appendScript).not.toHaveBeenCalled();
    expect(existing.remove).not.toHaveBeenCalled();
    expect(otherLoad).toHaveBeenCalledOnce();
    existing.dispatchEvent(new Event('load'));
    expect(otherLoad).toHaveBeenCalledTimes(2);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('skips an existing script whose load event has already been missed on retry', async () => {
    const existing = new ScriptElement();
    existing.src = EXTERNAL_LIBRARIES.jszip.cdnUrl!;
    scripts.push(existing);
    const { loadJSZipLite } = await import('../src/jszipLoader');
    const failure = expect(loadJSZipLite()).rejects.toThrow('30秒以内に完了しませんでした');
    await vi.advanceTimersByTimeAsync(30_000);
    await failure;

    expect(existing.remove).not.toHaveBeenCalled();
    const retried = loadJSZipLite();
    expect(appendScript).toHaveBeenCalledOnce();
    const ctor = completeLoad(scripts[1]);
    await expect(retried).resolves.toBe(ctor);
    expect(scripts).toContain(existing);
  });

  it('cleans up a DOM insertion failure and allows retry', async () => {
    appendScript.mockImplementationOnce(() => { throw new Error('script insertion blocked'); });
    const { loadJSZipLite } = await import('../src/jszipLoader');
    await expect(loadJSZipLite()).rejects.toThrow('script insertion blocked');
    expect(vi.getTimerCount()).toBe(0);

    const retried = loadJSZipLite();
    const ctor = completeLoad(scripts[0]);
    await expect(retried).resolves.toBe(ctor);
  });
});
