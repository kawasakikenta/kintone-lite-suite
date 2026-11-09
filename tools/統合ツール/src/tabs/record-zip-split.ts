'use strict';

import { LITE_ZIP_MAX_BYTES, LITE_ZIP_MAX_ENTRIES } from '../archive/lite-zip.js';

/**
 * 添付ファイル保存・バックアップで、ZIP を分ける位置を決める純粋ヘルパー。
 *
 * classic ZIP は、ZIP 全体と 1 ファイルが 4GB 未満、ファイルとフォルダの合計が 65,535 件までしか扱えない。
 * 上限を超えてから ZIP を作ろうとすると、すべて取得し終えた後に失敗して取得済みの分も保存できない。
 * そこで、取得を始める前にレコード単位（1 レコードの添付は同じ ZIP に入れる）で ZIP の担当を決め、
 * 1 つ分を取得し終えるたびに保存してメモリを解放できるようにする。
 * 見積もりは、圧縮しない（STORE）場合の大きさ（ファイルの宣言サイズ＋ローカル・中央ディレクトリのヘッダ＋名前 2 回）。
 * DEFLATE で縮むときは実際の ZIP が見積もりより小さくなるだけで、上限を超えることはない（早めに切っても ZIP は壊れない）。
 */

/** 1 つの ZIP の目安。これを超える前に次の ZIP へ分ける（巨大な ZIP はブラウザのメモリを使い切りやすい）。 */
export const ZIP_PART_TARGET_BYTES = 2 * 1024 * 1024 * 1024;
/** ZIP 全体・1 ファイルの上限（バイト）。ZIP の実装（archive/lite-zip.ts）の上限と同じ値を使う。 */
export const ZIP_MAX_BYTES = LITE_ZIP_MAX_BYTES;
/** ファイルとフォルダの合計の上限。ZIP の実装の上限と同じ値を使う。 */
export const ZIP_MAX_ENTRIES = LITE_ZIP_MAX_ENTRIES;

/** 添付以外（manifest.json・download_errors.txt など）のために残す件数・サイズ。 */
const RESERVED_ENTRIES = 32;
const RESERVED_BYTES = 16 * 1024 * 1024;
/** 1 ファイルごとに増える見積もり: ローカル・セントラルヘッダ（名前を 2 回）と manifest の 1 行ぶん。 */
const PER_FILE_FIXED_BYTES = 76 + 64 + 1024;
const PER_DIRECTORY_FIXED_BYTES = 76 + 64;

export interface ZipPlanLimits {
  targetBytes: number;
  maxBytes: number;
  maxEntries: number;
  reservedEntries: number;
  reservedBytes: number;
}

export const DEFAULT_ZIP_PLAN_LIMITS: ZipPlanLimits = Object.freeze({
  targetBytes: ZIP_PART_TARGET_BYTES,
  maxBytes: ZIP_MAX_BYTES,
  maxEntries: ZIP_MAX_ENTRIES,
  reservedEntries: RESERVED_ENTRIES,
  reservedBytes: RESERVED_BYTES
});

export interface ZipPlanFile {
  /** ZIP 内の保存先（フォルダ区切りは /）。名前の重複回避前の見積もりでよい。 */
  path: string;
  /** kintone が示すファイルサイズ（バイト）。不明なときは 0。 */
  size: number;
}

export interface ZipPlanUnit<F extends ZipPlanFile = ZipPlanFile> {
  /** 分けない単位（レコード ID）。 */
  id: string;
  files: F[];
}

export interface ZipPlanSkipped<F extends ZipPlanFile = ZipPlanFile> {
  unitId: string;
  file: F;
  reason: string;
  /** 本来入るはずだった ZIP（番号は 1 始まり）。 */
  part: number;
}

export interface ZipPlanPart<F extends ZipPlanFile = ZipPlanFile> {
  /** 1 始まり */
  index: number;
  unitIds: string[];
  files: F[];
  /** 見積もったファイル＋フォルダ数（添付以外の予約分は含まない）。 */
  entryCount: number;
  estimatedBytes: number;
  /** 1 レコードの添付が上限を超えるため、この ZIP を含む複数の ZIP に分けたレコード。 */
  splitUnitIds: string[];
}

export interface ZipPlan<F extends ZipPlanFile = ZipPlanFile> {
  /** 少なくとも 1 つ。添付が無いときも、添付以外の内容を入れる ZIP が 1 つある。 */
  parts: Array<ZipPlanPart<F>>;
  skipped: Array<ZipPlanSkipped<F>>;
}

function utf8Length(text: string): number {
  let bytes = 0;
  for (const char of text) {
    const code = char.codePointAt(0) as number;
    bytes += code < 0x80 ? 1 : code < 0x800 ? 2 : code < 0x10000 ? 3 : 4;
  }
  return bytes;
}

/** パスの祖先フォルダ（"a/b/c.txt" → ["a", "a/b"]）。 */
export function zipDirectoryPrefixes(path: string): string[] {
  const segments = String(path).split('/');
  const prefixes: string[] = [];
  for (let i = 1; i < segments.length; i++) prefixes.push(segments.slice(0, i).join('/'));
  return prefixes;
}

interface MutablePart<F extends ZipPlanFile> extends ZipPlanPart<F> {
  directories: Set<string>;
}

function emptyPart<F extends ZipPlanFile>(index: number): MutablePart<F> {
  return { index, unitIds: [], files: [], entryCount: 0, estimatedBytes: 0, splitUnitIds: [], directories: new Set() };
}

function fileCost(file: ZipPlanFile, part: MutablePart<any>): { entries: number; bytes: number; directories: string[] } {
  const newDirectories = zipDirectoryPrefixes(file.path).filter((dir) => !part.directories.has(dir));
  const size = Number.isFinite(file.size) && file.size > 0 ? file.size : 0;
  const bytes = size + PER_FILE_FIXED_BYTES + 2 * utf8Length(file.path)
    + newDirectories.reduce((sum, dir) => sum + PER_DIRECTORY_FIXED_BYTES + 2 * utf8Length(dir), 0);
  return { entries: 1 + newDirectories.length, bytes, directories: newDirectories };
}

function formatBytes(bytes: number): string {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1)}GB`;
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1)}MB`;
  return `${Math.round(bytes / 1024)}KB`;
}

/**
 * ファイルを順に詰め、上限を超える前に次の ZIP へ移る。
 * - 1 レコードの添付は同じ ZIP に入れる。1 レコードだけで目安を超えるときは、その ZIP を単独にする。
 * - 1 レコードだけで上限そのものを超えるときだけ、ファイル単位に分ける（`splitUnitIds`）。
 * - 1 ファイルで上限を超える添付は ZIP に入れられないので、理由つきで `skipped` に残して続ける。
 * @param base 添付以外に最後の ZIP へ入れる内容（レコードの CSV・JSON など）。入らなければ最後に専用の ZIP を足す。
 */
export function planZipParts<F extends ZipPlanFile>(
  units: ReadonlyArray<ZipPlanUnit<F>>,
  options: { limits?: Partial<ZipPlanLimits>; base?: { entries: number; bytes: number } } = {}
): ZipPlan<F> {
  const limits: ZipPlanLimits = { ...DEFAULT_ZIP_PLAN_LIMITS, ...(options.limits || {}) };
  const entryBudget = Math.max(1, limits.maxEntries - limits.reservedEntries);
  const parts: Array<MutablePart<F>> = [];
  const skipped: Array<ZipPlanSkipped<F>> = [];
  let current = emptyPart<F>(1);
  parts.push(current);

  /** 今の ZIP が空なら上限そのもの、そうでなければ目安までに収まるか。 */
  const fits = (part: MutablePart<F>, entries: number, bytes: number): boolean => {
    const byteBudget = (part.entryCount === 0 ? limits.maxBytes : limits.targetBytes) - limits.reservedBytes;
    return part.entryCount + entries <= entryBudget && part.estimatedBytes + bytes <= byteBudget;
  };
  const add = (part: MutablePart<F>, unitId: string, file: F, cost: { entries: number; bytes: number; directories: string[] }) => {
    part.files.push(file);
    part.entryCount += cost.entries;
    part.estimatedBytes += cost.bytes;
    for (const dir of cost.directories) part.directories.add(dir);
    if (part.unitIds[part.unitIds.length - 1] !== unitId) part.unitIds.push(unitId);
  };
  const next = () => { current = emptyPart<F>(parts.length + 1); parts.push(current); };

  /** 空の ZIP にも入らない 1 ファイルを取り除く。 */
  const placeable = (unit: ZipPlanUnit<F>): F[] => {
    const empty = emptyPart<F>(0);
    return unit.files.filter((file) => {
      const cost = fileCost(file, empty);
      if (cost.entries <= entryBudget && cost.bytes <= limits.maxBytes - limits.reservedBytes) return true;
      skipped.push({
        unitId: unit.id, file, part: current.index,
        reason: cost.entries > entryBudget
          ? 'ZIP に入れられるファイル数の上限を超えるため保存できません'
          : `1 ファイルが ZIP の上限（約 ${formatBytes(limits.maxBytes)}）を超えるため保存できません（サイズ ${formatBytes(Number(file.size) || 0)}）`
      });
      return false;
    });
  };

  for (const unit of units) {
    const files = placeable(unit);
    if (!files.length) continue;
    const trial = (part: MutablePart<F>) => {
      let entries = 0, bytes = 0;
      const scratch = emptyPart<F>(0);
      scratch.directories = new Set(part.directories);
      for (const file of files) {
        const cost = fileCost(file, scratch);
        cost.directories.forEach((dir) => scratch.directories.add(dir));
        entries += cost.entries;
        bytes += cost.bytes;
      }
      return { entries, bytes };
    };
    let whole = trial(current);
    if (!fits(current, whole.entries, whole.bytes) && current.entryCount > 0) {
      next();
      whole = trial(current);
    }
    if (fits(current, whole.entries, whole.bytes)) {
      for (const file of files) add(current, unit.id, file, fileCost(file, current));
      continue;
    }
    // 空の ZIP にも 1 レコードぶんが入らない: ファイル単位で詰める（同じレコードが複数の ZIP にまたがる）。
    for (const file of files) {
      let cost = fileCost(file, current);
      if (!fits(current, cost.entries, cost.bytes) && current.entryCount > 0) {
        next();
        cost = fileCost(file, current);
      }
      add(current, unit.id, file, cost);
      if (!current.splitUnitIds.includes(unit.id)) current.splitUnitIds.push(unit.id);
    }
  }

  // 最後の ZIP に添付以外の内容が入らなければ、その内容だけの ZIP を足す。
  const base = options.base;
  if (base && (current.entryCount + base.entries > entryBudget || current.estimatedBytes + base.bytes > limits.maxBytes - limits.reservedBytes)) {
    next();
  }
  // 入れられなかった添付は、同じレコードの残りが入った ZIP（無ければ、そのとき詰めていた ZIP）に記録する。
  return {
    parts,
    skipped: skipped.map((item) => {
      const owner = parts.find((part) => part.unitIds.includes(item.unitId));
      return { ...item, part: owner ? owner.index : Math.min(item.part, parts.length) };
    })
  };
}

/** `name.zip` の拡張子の前へ `_part2` を入れる。分けないとき（総数 1）は名前をそのまま返す。 */
export function zipPartFileName(fileName: string, part: number, total: number): string {
  if (total <= 1) return fileName;
  const width = String(total).length;
  const label = `_part${String(part).padStart(width, '0')}`;
  const match = /^(.*?)(\.zip)$/i.exec(fileName);
  return match ? `${match[1]}${label}${match[2]}` : `${fileName}${label}.zip`;
}

/** 実際に取得したファイル 1 つが ZIP に占める見積もり（exceedsZipBudget の累計に使う）。 */
export function estimateZipEntryBytes(path: string, size: number): number {
  return (Number.isFinite(size) && size > 0 ? size : 0) + PER_FILE_FIXED_BYTES + 2 * utf8Length(path);
}

/**
 * 実際に取得したファイルを足すと上限を超えるか。宣言サイズが実際と違っても、classic ZIP の上限を超える ZIP を作らない。
 * 超えるときは利用者向けの理由、収まるときは空文字を返す。
 */
export function exceedsZipBudget(usedBytes: number, usedEntries: number, path: string, size: number, limits: Partial<ZipPlanLimits> = {}): string {
  const merged: ZipPlanLimits = { ...DEFAULT_ZIP_PLAN_LIMITS, ...limits };
  if (usedEntries + 1 > merged.maxEntries - merged.reservedEntries) return 'ZIP に入れられるファイル数の上限を超えるため保存できません';
  if (usedBytes + estimateZipEntryBytes(path, size) > merged.maxBytes - merged.reservedBytes) {
    return `ZIP の上限（約 ${formatBytes(merged.maxBytes)}）を超えるため保存できません（取得したサイズ ${formatBytes(Number(size) || 0)}）`;
  }
  return '';
}

export interface ZipPartRecord {
  part: number;
  fileName: string;
  /** saved: 保存した / empty: 保存できた添付が無く ZIP を作らなかった / pending: まだ保存していない */
  state: 'saved' | 'empty' | 'pending';
  firstRecordId: string;
  lastRecordId: string;
  recordCount: number;
  plannedFileCount: number;
  savedCount: number;
  failedCount: number;
  unsavedCount: number;
}

/**
 * 分割して保存したときの manifest.json の `split`。各 ZIP に同じ形で入れ、どの ZIP が全体のどこにあたるかを示す。
 * `parts` のうち保存し終えた分には保存数・失敗数が入る（まだの分は予定のファイル数だけ）。
 */
export function buildZipSplitManifest(
  parts: ReadonlyArray<ZipPartRecord>,
  current: number,
  info: { recordCount: number; plannedFileCount: number; splitRecordIds: string[]; baseInLastPart?: boolean }
) {
  const done = parts.filter((part) => part.state !== 'pending');
  return {
    partNumber: current,
    partCount: parts.length,
    note: `ZIP が大きいため ${parts.length} 個に分けて保存しました。1 レコードの添付は、上限を超える場合を除き同じ ZIP に入っています。`
      + (info.baseInLastPart ? '全体の manifest・レコードの CSV/JSON・コメント・設定は最後の ZIP にあります。' : ''),
    recordCount: info.recordCount,
    plannedFileCount: info.plannedFileCount,
    ...(info.splitRecordIds.length ? { recordsSplitAcrossParts: info.splitRecordIds } : {}),
    parts: parts.map((part) => ({
      part: part.part,
      fileName: part.fileName,
      state: part.state,
      firstRecordId: part.firstRecordId,
      lastRecordId: part.lastRecordId,
      recordCount: part.recordCount,
      plannedFileCount: part.plannedFileCount,
      ...(part.state === 'pending' ? {} : { savedCount: part.savedCount, failedCount: part.failedCount, unsavedCount: part.unsavedCount })
    })),
    overall: {
      savedCount: done.reduce((sum, part) => sum + part.savedCount, 0),
      failedCount: done.reduce((sum, part) => sum + part.failedCount, 0),
      unsavedCount: done.reduce((sum, part) => sum + part.unsavedCount, 0),
      finishedParts: done.length
    }
  };
}
