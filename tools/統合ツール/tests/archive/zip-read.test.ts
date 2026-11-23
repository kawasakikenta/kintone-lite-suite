import { describe, expect, it } from 'vitest';
import { LiteZip } from '../../src/archive/lite-zip';
import { looksLikeZip, readZipEntries } from '../../src/archive/zip-read';

const bytesOf = async (blob: Blob) => new Uint8Array(await blob.arrayBuffer());
const text = (data: Uint8Array) => new TextDecoder().decode(data);

describe('readZipEntries', () => {
  it.each(['DEFLATE', 'STORE'] as const)('LiteZip で作った ZIP（%s）の名前と中身を読み戻す（日本語のパス・フォルダを含む）', async (compression) => {
    const zip = new LiteZip();
    zip.file('manifest.json', JSON.stringify({ apps: [] }));
    zip.folder('設計書')!.file('アプリ_一覧.json', JSON.stringify({ name: '顧客管理'.repeat(200) }));
    zip.file('a.js', 'console.log(1);');
    const bytes = await bytesOf(await zip.generateAsync({ type: 'blob', compression }));
    expect(looksLikeZip(bytes)).toBe(true);
    const entries = await readZipEntries(bytes);
    const files = Object.fromEntries(entries.filter((entry) => !entry.name.endsWith('/')).map((entry) => [entry.name, text(entry.data)]));
    expect(Object.keys(files).sort()).toEqual(['a.js', 'manifest.json', '設計書/アプリ_一覧.json']);
    expect(JSON.parse(files['設計書/アプリ_一覧.json']).name).toBe('顧客管理'.repeat(200));
    expect(files['a.js']).toBe('console.log(1);');
  });

  it('include で選んだエントリだけを展開する', async () => {
    const zip = new LiteZip();
    zip.file('a.json', '{}');
    zip.file('b.js', 'x');
    const entries = await readZipEntries(await bytesOf(await zip.generateAsync({ type: 'blob' })), { include: (name) => name.endsWith('.json') });
    expect(entries.map((entry) => entry.name)).toEqual(['a.json']);
  });

  it('ZIP ではないファイル・壊れた中身・上限を超える大きさは、理由を付けて止める', async () => {
    expect(looksLikeZip(new TextEncoder().encode('{"apps":[]}'))).toBe(false);
    await expect(readZipEntries(new TextEncoder().encode('{"apps":[]}'))).rejects.toThrow('ZIP の終端が見つかりません');
    const zip = new LiteZip();
    zip.file('a.json', '{"value":"abcdefghij"}');
    const bytes = await bytesOf(await zip.generateAsync({ type: 'blob', compression: 'STORE' }));
    const broken = bytes.slice();
    const at = new TextDecoder('latin1').decode(broken).indexOf('abcdefghij');
    broken[at] = 'z'.charCodeAt(0);
    await expect(readZipEntries(broken)).rejects.toThrow('「a.json」の内容が壊れています');
    await expect(readZipEntries(bytes, { maxTotalBytes: 5 })).rejects.toThrow('上限を超えます');
  });
});
