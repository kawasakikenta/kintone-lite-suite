import { describe, expect, it } from 'vitest';
import { LiteZip } from '../../src/archive/lite-zip';
import { buildDiffMarkdownBatchExport } from '../../src/diff/markdown-export';
import { uniqueZipName } from '../../src/tabs/record-query';
import { buildAppFilenameLabel, buildExportFilename, sanitizeFilenamePart } from '../../src/utils';

// 制御文字と、表示上の名前・拡張子を入れ替えて見せる双方向制御（RLO など）。アプリ名は管理者が自由に付けられる。
const UNSAFE = /[\u0000-\u001f\u007f-\u009f\u061c\u200e\u200f\u202a-\u202e\u2066-\u206f]/;
const spoofedName = '請求書\u202efdp.exe\u0000\u0007\u2066x\u2069';

describe('保存するファイル名・ZIP 内の名前', () => {
  it('アプリ名の制御文字・双方向制御をファイル名に残さない', () => {
    expect(sanitizeFilenamePart(spoofedName)).not.toMatch(UNSAFE);
    expect(buildAppFilenameLabel('12', spoofedName)).not.toMatch(UNSAFE);
    expect(buildExportFilename('設計書', 'md', { appLabel: buildAppFilenameLabel('12', spoofedName), timestamp: '20261128_120000' })).not.toMatch(UNSAFE);
    // 普通の名前は変えない
    expect(buildAppFilenameLabel('12', '顧客 管理 (旧)')).toBe('顧客 管理 (旧)(app12)');
    expect(sanitizeFilenamePart('a\tb\nc')).toBe('a b c');
  });

  it('NUL を含むアプリ名でも ZIP を作れる（ZIP の作成で止まらない）', async () => {
    const zip = new LiteZip();
    zip.file(`${buildAppFilenameLabel('12', 'a\u0000b')}_本番.json`, '{}');
    await expect(zip.generateAsync({ type: 'blob' })).resolves.toBeInstanceOf(Blob);
  });

  it('差分のAI向けMarkdown一括 ZIP の中の名前にも残さない', () => {
    const bundle = (appId: string) => ({ appId, guestId: '', preview: false, fetchedAt: '2026-11-28T00:00:00.000Z', meta: { appName: spoofedName }, sections: { appSettings: { name: spoofedName } } });
    const result = buildDiffMarkdownBatchExport([{
      label: spoofedName,
      context: { sourceBundle: bundle('10'), targetBundle: bundle('11'), rows: [], scopes: ['appSettings'] } as any
    }], { generatedAt: '2026-11-28T00:00:00.000Z' });
    expect(result.entries.length).toBeGreaterThan(0);
    for (const name of result.entries) expect(name, JSON.stringify(name)).not.toMatch(UNSAFE);
  });
});

describe('レコードの添付ファイルを ZIP に入れるときの名前', () => {
  it('添付ファイル名（レコードを登録できる利用者なら誰でも付けられる）の制御文字・双方向制御を残さない', () => {
    const used = new Set<string>();
    const name = uniqueZipName(used, 'invoice\u202egpj.exe\u0085\u061c\u206a.txt', 'abcdefghijklmnop', 0);
    expect(name).not.toMatch(UNSAFE);
    expect(name).toBe('abcdefghijkl_invoicegpj.exe.txt');
    // 普通の名前は変えない
    expect(uniqueZipName(used, '見積書 (1).pdf', 'k1', 1)).toBe('k1_見積書 (1).pdf');
  });
});
