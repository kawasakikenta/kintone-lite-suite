import { afterEach, describe, expect, it, vi } from 'vitest';
import { LiteZip } from '../../src/archive/lite-zip';
import { readZipEntries } from '../../src/archive/zip-read';

const SIG_CENTRAL = 0x02014b50;

/** 中央ディレクトリに書かれた展開後の大きさ（と CRC）を書き換え、実際より小さく見せる ZIP（ZIP 爆弾の形）にする。 */
function understateCentralSize(bytes: Uint8Array, declaredSize: number): Uint8Array {
  const out = bytes.slice();
  const view = new DataView(out.buffer);
  for (let pos = 0; pos + 46 <= out.length; pos += 1) {
    if (view.getUint32(pos, true) !== SIG_CENTRAL) continue;
    view.setUint32(pos + 24, declaredSize, true);
    return out;
  }
  throw new Error('central directory was not found');
}

/** 展開で取り出したバイト数を数える DecompressionStream（本物に処理を任せる）。 */
function countInflatedBytes(): { bytes: () => number } {
  const Original = globalThis.DecompressionStream;
  let produced = 0;
  class CountingDecompressionStream {
    readable: ReadableStream<Uint8Array>;
    writable: WritableStream<BufferSource>;
    constructor(format: CompressionFormat) {
      const inner = new Original(format);
      const counter = new TransformStream<Uint8Array, Uint8Array>({
        transform(chunk, controller) {
          produced += chunk.byteLength;
          controller.enqueue(chunk);
        }
      });
      inner.readable.pipeTo(counter.writable).catch(() => {});
      this.writable = inner.writable;
      this.readable = counter.readable;
    }
  }
  vi.stubGlobal('DecompressionStream', CountingDecompressionStream);
  return { bytes: () => produced };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('readZipEntries と大きさを偽った ZIP', () => {
  it('記録された大きさを超えて展開せずに止める（小さな ZIP でメモリを使い切らない）', async () => {
    const zip = new LiteZip();
    zip.file('app.json', new Uint8Array(32 * 1024 * 1024));
    const packed = new Uint8Array(await (await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' })).arrayBuffer());
    expect(packed.length).toBeLessThan(1024 * 1024);
    const bomb = understateCentralSize(packed, 16);

    const inflated = countInflatedBytes();
    await expect(readZipEntries(bomb)).rejects.toThrow('「app.json」の内容が壊れています');
    expect(inflated.bytes()).toBeLessThan(4 * 1024 * 1024);
  });

  it('記録どおりの大きさなら、これまでどおり読める', async () => {
    const zip = new LiteZip();
    const body = JSON.stringify({ sections: { appSettings: { name: '顧客'.repeat(50000) } } });
    zip.file('app.json', body);
    const packed = new Uint8Array(await (await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' })).arrayBuffer());
    const [entry] = await readZipEntries(packed);
    expect(new TextDecoder().decode(entry.data)).toBe(body);
  });
});
