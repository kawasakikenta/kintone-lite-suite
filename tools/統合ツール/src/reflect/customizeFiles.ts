import { downloadKintoneFile } from '../api.js';
import { deepClone } from '../utils.js';

/**
 * JS/CSS の FILE 項目を別アプリへ渡すための解決処理（DOM 非依存）。
 * fileKey は取得したアプリの外では使えないため、本体を取得して反映先へアップロードし、新しい fileKey で設定する。
 */
export type CustomizeFileState =
  | { status: 'existing' }
  | { status: 'reuse'; targetFileKey: string; hash: string; byteSize: number }
  | { status: 'upload'; hash: string; byteSize: number; contentType: string }
  | { status: 'unavailable'; reason: string };

export interface CustomizeFileResolution {
  /** 反映元 fileKey → 判定 */
  files: Record<string, CustomizeFileState>;
  /** fileKey（反映元・反映先）→ 内容ハッシュ */
  hashes: Record<string, string>;
  /** 反映元 fileKey → 本体（apply 時のアップロード用） */
  blobs: Map<string, Blob>;
}

export type CustomizeFileDownloader = (guestId: string, fileKey: string) => Promise<Blob>;

const PLATFORMS = ['desktop', 'mobile'] as const;
const KINDS = ['js', 'css'] as const;
const DOWNLOAD_CONCURRENCY = 4;
const isObject = (value: any): value is Record<string, any> => !!value && typeof value === 'object' && !Array.isArray(value);
const dict = <T>(): Record<string, T> => Object.create(null);
const messageOf = (error: unknown) => error instanceof Error ? error.message : String(error);

interface FileEntry { item: any; fileKey: string; name: string }

function listFileEntries(section: any): FileEntry[] {
  const entries: FileEntry[] = [];
  for (const platform of PLATFORMS) for (const kind of KINDS) {
    const list = section?.[platform]?.[kind];
    if (!Array.isArray(list)) continue;
    for (const item of list) {
      const fileKey = item?.type === 'FILE' ? item?.file?.fileKey : undefined;
      if (typeof fileKey === 'string' && fileKey) entries.push({ item, fileKey, name: String(item.file.name || '') });
    }
  }
  return entries;
}

/** fileKey → ファイル名（差分表示用）。複数のセクションを渡せる。 */
export function customizeFileNames(...sections: any[]): Record<string, string> {
  const names = dict<string>();
  for (const section of sections) for (const entry of listFileEntries(section)) if (entry.name && names[entry.fileKey] === undefined) names[entry.fileKey] = entry.name;
  return names;
}

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  // 引数の数でスタックを溢れさせないよう小分けにして変換する。
  for (let offset = 0; offset < bytes.length; offset += 0x8000) binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(offset, offset + 0x8000)));
  return btoa(binary);
}

export function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

async function blobBytes(blob: Blob): Promise<Uint8Array> {
  return new Uint8Array(await blob.arrayBuffer());
}

function fallbackHash(bytes: Uint8Array): string {
  let a = 0x811c9dc5, b = 0x01000193 ^ 0x9e3779b9;
  for (const byte of bytes) { a = Math.imul(a ^ byte, 0x01000193) >>> 0; b = Math.imul(b ^ byte, 0x85ebca6b) >>> 0; b = (b ^ (b >>> 13)) >>> 0; }
  return `fnv1a:${a.toString(16).padStart(8, '0')}${b.toString(16).padStart(8, '0')}${bytes.length.toString(16)}`;
}

/** SHA-256（16進）。crypto.subtle が無い環境ではバイト列の FNV-1a 系ハッシュを使う。 */
export async function hashBytes(bytes: Uint8Array): Promise<string> {
  try {
    const subtle = (globalThis as any).crypto?.subtle;
    if (subtle?.digest) {
      const digest = new Uint8Array(await subtle.digest('SHA-256', bytes));
      return Array.from(digest, byte => byte.toString(16).padStart(2, '0')).join('');
    }
  } catch { /* fall through */ }
  return fallbackHash(bytes);
}

function guessContentType(name: string): string {
  return /\.css$/i.test(name) ? 'text/css' : /\.js$/i.test(name) ? 'text/javascript' : '';
}

const defaultDownload: CustomizeFileDownloader = (guestId, fileKey) => downloadKintoneFile(guestId, fileKey);

async function pool<T>(items: T[], worker: (item: T) => Promise<void>): Promise<void> {
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(DOWNLOAD_CONCURRENCY, items.length) }, async () => {
    while (next < items.length) await worker(items[next++]);
  }));
}

interface Body { blob: Blob; hash: string }

async function loadBody(entry: FileEntry, guestId: string, download: CustomizeFileDownloader, allowEmbedded: boolean): Promise<Body> {
  const embedded = allowEmbedded ? entry.item.file?._content : undefined;
  let blob: Blob;
  if (isObject(embedded) && typeof embedded.base64 === 'string') {
    let bytes: Uint8Array;
    try { bytes = base64ToBytes(embedded.base64); } catch { throw new Error('バックアップに保存されたファイル本体を読み取れません'); }
    blob = new Blob([bytes as BlobPart], { type: typeof embedded.contentType === 'string' ? embedded.contentType : '' });
  } else blob = await download(guestId, entry.fileKey);
  return { blob, hash: await hashBytes(await blobBytes(blob)) };
}

export async function resolveCustomizeFiles(sourceSection: any, targetSection: any, opts: { sourceGuestId: string; targetGuestId: string; download?: CustomizeFileDownloader }): Promise<CustomizeFileResolution> {
  const download = opts.download || defaultDownload;
  const resolution: CustomizeFileResolution = { files: dict<CustomizeFileState>(), hashes: dict<string>(), blobs: new Map() };
  const targetEntries = listFileEntries(targetSection);
  const targetKeys = new Set(targetEntries.map(entry => entry.fileKey));
  const pending = new Map<string, FileEntry>();
  for (const entry of listFileEntries(sourceSection)) {
    if (targetKeys.has(entry.fileKey)) resolution.files[entry.fileKey] = { status: 'existing' };
    else if (!pending.has(entry.fileKey)) pending.set(entry.fileKey, entry);
  }
  if (!pending.size) return resolution;

  const sourceBodies = new Map<string, Body>();
  await pool([...pending.values()], async entry => {
    try { sourceBodies.set(entry.fileKey, await loadBody(entry, opts.sourceGuestId, download, true)); }
    catch (error) { resolution.files[entry.fileKey] = { status: 'unavailable', reason: messageOf(error) }; }
  });

  // 同名・同内容の反映先ファイルを再利用するため、反映先の全ファイル本体を確認する。取得できないものは再利用候補から外すだけ。
  const targetByKey = new Map<string, FileEntry>();
  for (const entry of targetEntries) if (!targetByKey.has(entry.fileKey)) targetByKey.set(entry.fileKey, entry);
  const targetBodies = new Map<string, Body>();
  if (sourceBodies.size) await pool([...targetByKey.values()], async entry => {
    try { targetBodies.set(entry.fileKey, await loadBody(entry, opts.targetGuestId, download, false)); } catch { /* 再利用候補から外す */ }
  });
  for (const [key, body] of targetBodies) resolution.hashes[key] = body.hash;

  for (const [key, body] of sourceBodies) {
    const entry = pending.get(key)!;
    resolution.hashes[key] = body.hash;
    resolution.blobs.set(key, body.blob);
    const reused = [...targetBodies].find(([targetKey, targetBody]) => targetBody.hash === body.hash && targetByKey.get(targetKey)!.name === entry.name);
    resolution.files[key] = reused
      ? { status: 'reuse', targetFileKey: reused[0], hash: body.hash, byteSize: body.blob.size }
      : { status: 'upload', hash: body.hash, byteSize: body.blob.size, contentType: body.blob.type || String(entry.item.file?.contentType || '') || guessContentType(entry.name) };
  }
  return resolution;
}

/** PUT 用 payload を、差分表示・比較用の形（FILE は名前と内容ハッシュ）へ変換する。 */
export function comparableCustomizePayload(payload: any, resolution: CustomizeFileResolution | undefined, names: Record<string, string>): any {
  const result = deepClone(payload);
  for (const platform of PLATFORMS) for (const kind of KINDS) {
    const list = result?.[platform]?.[kind];
    if (!Array.isArray(list)) continue;
    result[platform][kind] = list.map((item: any) => {
      if (item?.type !== 'FILE') return item;
      const fileKey = item.file?.fileKey, name = names[fileKey], hash = resolution?.hashes[fileKey];
      return { type: 'FILE', file: { ...(name !== undefined ? { name } : {}), ...(hash ? { contentHash: hash } : { fileKey }) } };
    });
  }
  return result;
}

/** バックアップ用に、各 FILE 項目へファイル本体（base64）を埋め込んだ深いコピーを返す。元のオブジェクトは変更しない。 */
export async function embedCustomizeFileContents(section: any, opts: { guestId: string; download?: CustomizeFileDownloader }): Promise<{ section: any; unavailable: Array<{ name: string; reason: string }> }> {
  const download = opts.download || defaultDownload;
  const copy = deepClone(section);
  const entries = listFileEntries(copy);
  const results = new Map<string, { content: { base64: string; contentType: string; byteSize: number } } | { reason: string }>();
  const unique = new Map<string, FileEntry>();
  for (const entry of entries) if (!unique.has(entry.fileKey)) unique.set(entry.fileKey, entry);
  await pool([...unique.values()], async entry => {
    try {
      const blob = await download(opts.guestId, entry.fileKey);
      results.set(entry.fileKey, { content: { base64: bytesToBase64(await blobBytes(blob)), contentType: blob.type || String(entry.item.file?.contentType || '') || guessContentType(entry.name), byteSize: blob.size } });
    } catch (error) { results.set(entry.fileKey, { reason: messageOf(error) }); }
  });
  const unavailable: Array<{ name: string; reason: string }> = [], reported = new Set<string>();
  for (const entry of entries) {
    const result = results.get(entry.fileKey)!;
    if ('content' in result) entry.item.file._content = { ...result.content };
    else {
      entry.item.file._contentUnavailable = result.reason;
      if (!reported.has(entry.fileKey)) { reported.add(entry.fileKey); unavailable.push({ name: entry.name || entry.fileKey, reason: result.reason }); }
    }
  }
  return { section: copy, unavailable };
}
