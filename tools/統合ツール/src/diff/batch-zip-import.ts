'use strict';

/**
 * 差分比較の「設定フォルダからペアを作成」で、設定取得の ZIP をそのまま読む（DOM 非依存。通信しない）。
 *
 * ZIP を展開したフォルダを選んだときと同じファイルの並び（名前・パス・中身）にして返す。
 * 呼び出し元はそれを parseDiffBatchFolderImport に渡すので、manifest.json との照合、接続先の重複、
 * 壊れた JSON、比較元／比較先の読み分けは、フォルダ取込とまったく同じに判定される。
 *
 * - 件数・大きさの上限はフォルダ取込と同じ（DIFF_BATCH_FOLDER_LIMITS）。中央ディレクトリの値で、展開する前に確かめる
 * - 展開するのは JSON だけ。各ファイルは ZIP に記録された大きさを超えて展開せず、CRC-32 で中身を確かめる（archive/zip-read.ts）
 * - 展開すると別の場所を指すパス（絶対パス・「..」）や、展開すると同じ名前になるファイル（大文字小文字だけ違うものを含む）があれば読まない
 * - ZIP の中の並び（設定取得の ZIP なら取得した順）を保つ
 */

import { listZipEntries, looksLikeZip, readZipEntries } from '../archive/zip-read.js';
import { DIFF_BATCH_FOLDER_LIMITS, diffBatchFolderLimitIssue, type DiffBatchFolderImportFile } from './batch-folder-import.js';

/** 読み込める ZIP ファイルの大きさの上限（ZIP 全体をメモリへ読むため）。 */
export const DIFF_BATCH_ZIP_MAX_BYTES = 256 * 1024 * 1024;

export const DIFF_BATCH_ZIP_TOO_LARGE_MESSAGE = 'ZIPファイルが256MBを超えています。JS/CSSファイルを含めずに保存したZIPか、展開したフォルダを選んでください';

export interface DiffBatchZipFiles {
  /** フォルダ取込と同じ形のファイル（relativePath は「ZIPのファイル名/ZIP内のパス」） */
  files: DiffBatchFolderImportFile[];
  /** ZIP 内のファイル数（フォルダのエントリを除く） */
  fileCount: number;
  /** そのうち JSON のファイル数 */
  jsonFileCount: number;
}

const isJsonName = (name: string) => /\.json$/i.test(name);

function entryPath(name: string): string {
  // Windows の古い圧縮ツールは区切りに「\」を使う。展開するときと同じく、フォルダの区切りとして読む。
  return String(name || '').replace(/\\/g, '/');
}

function entryBaseName(path: string): string {
  const pieces = path.split('/');
  return pieces[pieces.length - 1] || '';
}

/** 展開すると ZIP の外や別の場所を指すパスか（絶対パス、ドライブ名、空・「.」・「..」の区切り）。 */
function isUnsafeEntryPath(path: string): boolean {
  if (/^[a-zA-Z]:/.test(path)) return true;
  return path.split('/').some((segment) => segment === '' || segment === '.' || segment === '..');
}

/**
 * 設定取得の ZIP（manifest.json つき・無し）を、展開済みフォルダを選んだときと同じファイルの並びにする。
 * 読めない ZIP・上限超え・危ないパス・同じ名前のファイルは、利用者向けの理由を付けて例外にする。
 */
export async function readDiffBatchZipFiles(bytes: Uint8Array, zipName: string): Promise<DiffBatchZipFiles> {
  if (bytes.byteLength > DIFF_BATCH_ZIP_MAX_BYTES) throw new Error(DIFF_BATCH_ZIP_TOO_LARGE_MESSAGE);
  if (!looksLikeZip(bytes)) throw new Error('ZIPファイルとして読み込めません。設定取得の「設定をZIPで保存」で保存したZIPを選んでください');
  // フォルダのエントリ（「\」区切りで書かれたものを含む）は、展開したフォルダと同じく数えない
  const listing = listZipEntries(bytes).filter((entry) => !entry.directory && !entryPath(entry.name).endsWith('/'));
  const seen = new Map<string, string>();
  for (const entry of listing) {
    const path = entryPath(entry.name);
    if (isUnsafeEntryPath(path)) throw new Error(`ZIP内のパス「${entry.name}」は展開すると別の場所を指すため、このZIPは読み込めません`);
    const key = path.normalize('NFC').toLowerCase();
    const previous = seen.get(key);
    if (previous !== undefined) {
      throw new Error(`ZIP内に同じ名前のファイルがあります（${previous}、${entry.name}）。展開すると片方が上書きされるため、このZIPは読み込めません`);
    }
    seen.set(key, entry.name);
  }
  const jsonEntries = listing.filter((entry) => isJsonName(entry.name));
  const limitIssue = diffBatchFolderLimitIssue({
    files: listing.length,
    jsonFiles: jsonEntries.length,
    jsonBytes: jsonEntries.reduce((sum, entry) => sum + entry.size, 0)
  }, '選択したZIP');
  if (limitIssue) throw new Error(limitIssue);

  const extracted = await readZipEntries(bytes, {
    include: isJsonName,
    maxTotalBytes: DIFF_BATCH_FOLDER_LIMITS.maxJsonBytes
  });
  const dataByName = new Map(extracted.filter((entry) => !entry.name.endsWith('/')).map((entry) => [entry.name, entry.data]));
  // Blob.text() と同じく UTF-8 で読み、先頭の BOM は落とす（フォルダ取込と同じ中身にする）
  const decoder = new TextDecoder('utf-8');
  const root = String(zipName || '').trim() || '選択したZIP';
  const files = listing.map((entry): DiffBatchFolderImportFile => {
    const path = entryPath(entry.name);
    const data = isJsonName(entry.name) ? dataByName.get(entry.name) : undefined;
    return {
      name: entryBaseName(path),
      relativePath: `${root}/${path}`,
      text: data ? decoder.decode(data) : ''
    };
  });
  return { files, fileCount: listing.length, jsonFileCount: jsonEntries.length };
}
