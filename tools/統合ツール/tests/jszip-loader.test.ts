import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LiteZip } from '../src/archive/lite-zip';
import { loadJSZipLite } from '../src/jszipLoader';

let appendChild: ReturnType<typeof vi.fn>;
let createElement: ReturnType<typeof vi.fn>;
let fetchSpy: ReturnType<typeof vi.fn>;

beforeEach(() => {
  appendChild = vi.fn();
  createElement = vi.fn();
  fetchSpy = vi.fn();
  vi.stubGlobal('window', { JSZip: class PageProvidedJSZip {} });
  vi.stubGlobal('document', {
    querySelectorAll: () => [],
    createElement,
    head: { appendChild }
  });
  vi.stubGlobal('fetch', fetchSpy);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('loadJSZipLite', () => {
  it('returns the bundled ZIP implementation without touching the network or the page', async () => {
    await expect(loadJSZipLite()).resolves.toBe(LiteZip);
    expect(createElement).not.toHaveBeenCalled();
    expect(appendChild).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('ignores a window.JSZip that the page already has because its content cannot be verified', async () => {
    const Zip = await loadJSZipLite();
    expect(Zip).toBe(LiteZip);
    expect(Zip).not.toBe((window as any).JSZip);
  });

  it('works with the call shape the tools use: new Zip(), file(), folder(), remove(), generateAsync({ type: "blob" })', async () => {
    const Zip = await loadJSZipLite();
    const zip = new Zip();
    zip.file('設定/アプリ.json', '{}');
    zip.folder('添付').file('メモ.txt', 'x');
    zip.remove('設定');
    const blob: Blob = await zip.generateAsync({ type: 'blob' });
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.size).toBeGreaterThan(22);
  });

  it('can be called repeatedly', async () => {
    expect(await loadJSZipLite()).toBe(await loadJSZipLite());
  });
});
