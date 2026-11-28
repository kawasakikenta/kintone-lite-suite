'use strict';

import { DIFF_NORMALIZATION_PRESETS } from '../constants.js';
import { canonicalIgnoreRules } from './engine.js';
import { sha256Hex } from './export-safety.js';

/**
 * 比較結果の識別子（比較結果ID）。
 * 同じ比較から作った画面・HTML・Excel・Markdown に同じ値を出し、受け取った人が
 * 「この Excel とこの HTML は同じ比較から出たか」を確かめられるようにする。
 *
 * 入力: 比較元・比較先のアプリ（アプリID・ゲストスペースID・本番／プレビュー）、比較条件（比較したセクション・
 * 無視ルール・正規化）、取得の状態（取得失敗・本文未検証・件数上限）、全件の実差分行（セクション・場所・種類・
 * 変更前後の値）。生成日時・取得日時・出力範囲・表示用の日本語の名前は入れない。
 * 行・セクション・無視ルールの並びと、オブジェクトのキーの順は値に影響しない。
 * 同一行（「同一行を含める」で集める証跡）と表示用の補助行は差分ではないので入れない。
 * 改ざん防止の電子署名ではない（入力を変えて計算し直せば、別の値を作れる）。
 */
export const DIFF_RESULT_ID_VERSION = 1;
export const DIFF_RESULT_ID_SHORT_LENGTH = 12;
export const DIFF_RESULT_ID_LABEL = '比較結果ID';

export interface DiffResultId {
  /** SHA-256 の 16 進 64 桁（小文字）。 */
  full: string;
  /** 先頭 12 桁。画面と見出しで使う短い表示。 */
  short: string;
  /** 計算方式の版。入力や正規化を変えたときに上げる。 */
  version: number;
}

export interface DiffResultIdInput {
  sourceBundle?: any;
  targetBundle?: any;
  scopes?: readonly string[] | null;
  ignoreKeys?: string | null;
  normalizationPresetState?: Record<string, unknown> | null;
  /** 比較結果の全件の行（絞り込む前）。 */
  rows?: readonly any[] | null;
  fetchIssues?: readonly any[] | null;
  partialIssues?: readonly any[] | null;
  truncation?: any;
}

/** 識別子の計算に使うもの（値そのものは説明に出さない）。HTML・Excel・Markdown・機能説明で同じ文を使う。 */
export const DIFF_RESULT_ID_DESCRIPTION = '比較元・比較先のアプリ（アプリID・ゲストスペースID・本番／プレビュー）、比較条件（セクション・無視ルール・正規化）、取得の状態、全件の差分行（セクション・場所・種類・変更前後の値）から計算した SHA-256 です。生成日時・出力範囲・表示の言語は値に影響しません。';

/** 値の扱いの注記。差分行の値（JS/CSS の本文・プラグインの設定値を含む）は計算に使うが、ここには載せない。 */
export const DIFF_RESULT_ID_VALUE_NOTE = '差分行の値（JS/CSS の本文・プラグインの設定値を含む）も計算に使います。識別子の説明には値を載せていません。';

/** 照合のしかた（短い注記）。 */
export const DIFF_RESULT_ID_MATCH_NOTE = '同じ比較から保存した画面・HTML・Excel・Markdown には同じ値が入ります。';

/** 絞り込んだ出力の注記。識別子は全件の比較結果のもので、出力範囲とは別に示す。 */
export const DIFF_RESULT_ID_FILTERED_NOTE = '全件の比較結果の識別子です。この出力は絞り込んだ範囲だけを収録しています。';

/** 全件の行が無く、識別子を計算できなかったときの表示。 */
export const DIFF_RESULT_ID_UNAVAILABLE = '未計算（全件の比較結果が渡されていないため）';

/** Excel のセル・要約の文など、文字だけで載せる識別子（短い表示・完全な値・注記）。 */
export function formatDiffResultIdText(id: DiffResultId | null, options: { filtered?: boolean } = {}): string {
  if (!id) return DIFF_RESULT_ID_UNAVAILABLE;
  return [
    id.short,
    `完全な値: ${id.full}`,
    options.filtered ? DIFF_RESULT_ID_FILTERED_NOTE : DIFF_RESULT_ID_MATCH_NOTE
  ].join('\n');
}

/**
 * 型を区別する決定的な文字列表現。オブジェクトのキーは並べ替え、配列は順序を保つ。
 * 文字列は JSON の引用で表すので、区切りの記号と混ざらない。undefined・null・数値・真偽値を区別する。
 */
function canonicalValue(value: unknown, seen: Set<object>): string {
  if (value === undefined) return 'u';
  if (value === null) return 'n';
  if (typeof value === 'string') return `s${JSON.stringify(value)}`;
  if (typeof value === 'boolean') return value ? 'b1' : 'b0';
  if (typeof value === 'number') return `d${Object.is(value, -0) ? '0' : String(value)}`;
  if (typeof value === 'bigint') return `i${String(value)}`;
  if (typeof value !== 'object') return `x${JSON.stringify(String(value))}`;
  if (seen.has(value as object)) return 'c';
  seen.add(value as object);
  let out: string;
  if (Array.isArray(value)) {
    out = `a[${value.map((item) => canonicalValue(item, seen)).join(',')}]`;
  } else {
    const record = value as Record<string, unknown>;
    out = `o{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${canonicalValue(record[key], seen)}`).join(',')}}`;
  }
  seen.delete(value as object);
  return out;
}

const canonical = (value: unknown) => canonicalValue(value, new Set());

function sectionKeyOfRow(row: any): string {
  const explicit = String(row?.sectionKey || '').trim();
  if (explicit) return explicit;
  return String(row?.path || '').split(/[.[]/, 1)[0] || '';
}

function endpointMaterial(bundle: any) {
  return {
    appId: String(bundle?.appId ?? '').trim(),
    guestId: String(bundle?.guestId ?? '').trim(),
    preview: !!bundle?.preview
  };
}

function rowMaterial(row: any): string {
  return canonical({
    section: sectionKeyOfRow(row),
    path: String(row?.path || ''),
    type: String(row?.type || ''),
    moved: !!row?.moved,
    movedFrom: row?.movedFrom,
    movedTo: row?.movedTo,
    arrayKey: String(row?.arrayKey || ''),
    arrayKeyValue: row?.arrayKeyValue,
    left: row?.left,
    right: row?.right
  });
}

function scanStatusOf(section: any): string {
  return String(section?.scanStatus
    || (section?.scanned === false ? 'unscanned' : (section?.partiallyScanned ? 'partial' : 'complete')));
}

/** 実差分の完全性に関わる打ち切りだけ（同一行の省略は「同一行を含める」で変わるので入れない）。 */
function truncationMaterial(truncation: any): string[] {
  const sections = Array.isArray(truncation?.sections) ? truncation.sections : [];
  return sections
    .map((section: any) => ({
      section: String(section?.sectionKey || ''),
      status: scanStatusOf(section),
      droppedDiff: Number(section?.droppedDiff || 0)
    }))
    .filter((item: any) => item.status !== 'complete' || item.droppedDiff > 0)
    .map((item: any) => canonical(item))
    .sort();
}

function fetchIssueMaterial(issues: readonly any[]): string[] {
  // 取得失敗の文（言語・時刻・通信の詳細を含み得る）は入れず、どのセクションのどちら側かだけにする。
  return [...new Set(issues.map((issue) => canonical({
    section: String(issue?.sectionKey || ''),
    side: String(issue?.side || '')
  })))].sort();
}

function partialIssueMaterial(issues: readonly any[]): string[] {
  return issues.map((issue) => canonical({
    section: String(issue?.sectionKey || ''),
    side: String(issue?.side || ''),
    files: (Array.isArray(issue?.files) ? issue.files : [])
      .map((file: any) => canonical({
        fileKey: String(file?.fileKey || ''),
        fileName: String(file?.fileName || ''),
        reason: String(file?.reason || '')
      }))
      .sort()
  })).sort();
}

/** 識別子の計算に使う正規化済みの文字列（テスト・検証用）。 */
export function buildDiffResultIdMaterial(input: DiffResultIdInput): string {
  const normalizationState = input.normalizationPresetState || {};
  const rows = Array.isArray(input.rows) ? input.rows : [];
  const material = {
    format: 'kintone-diff-result-id',
    version: DIFF_RESULT_ID_VERSION,
    source: endpointMaterial(input.sourceBundle),
    target: endpointMaterial(input.targetBundle),
    conditions: {
      sections: [...new Set((input.scopes || []).map((key) => String(key)))].sort(),
      ignoreRules: canonicalIgnoreRules(input.ignoreKeys || ''),
      // engine と同じく、真と見なせる値の正規化だけが比較に効く。
      normalization: Object.keys(DIFF_NORMALIZATION_PRESETS).filter((key) => !!normalizationState[key]).sort()
    },
    fetchIssues: fetchIssueMaterial(Array.isArray(input.fetchIssues) ? input.fetchIssues : []),
    partialIssues: partialIssueMaterial(Array.isArray(input.partialIssues) ? input.partialIssues : []),
    truncation: truncationMaterial(input.truncation),
    rows: rows
      .filter((row) => row && row.type !== 'same' && !row._displayOnly)
      .map(rowMaterial)
      .sort()
  };
  return canonical(material);
}

export function computeDiffResultId(input: DiffResultIdInput): DiffResultId {
  const full = sha256Hex(buildDiffResultIdMaterial(input));
  return { full, short: full.slice(0, DIFF_RESULT_ID_SHORT_LENGTH), version: DIFF_RESULT_ID_VERSION };
}

const resultIdCache = new WeakMap<object, DiffResultId>();

/**
 * 比較結果（画面の比較結果の保持など、同じ比較の間は変わらないオブジェクト）の識別子。
 * 同じオブジェクトには計算し直さず同じ値を返す（再描画のたびに全件をハッシュしない）。
 */
export function diffResultIdOf(result: DiffResultIdInput & object): DiffResultId {
  const cached = resultIdCache.get(result);
  if (cached) return cached;
  const id = computeDiffResultId(result);
  resultIdCache.set(result, id);
  return id;
}

/** 出力の context に渡された識別子を検める（形の違う値は使わない）。 */
export function readDiffResultId(value: unknown): DiffResultId | null {
  const record = value as Partial<DiffResultId> | null | undefined;
  const full = String(record?.full || '');
  if (!/^[0-9a-f]{64}$/.test(full)) return null;
  return { full, short: full.slice(0, DIFF_RESULT_ID_SHORT_LENGTH), version: Number(record?.version) || DIFF_RESULT_ID_VERSION };
}

/**
 * 出力に載せる識別子。呼び出し側が全件の比較結果から計算した値（resultId）を優先し、無ければ全件の行が分かるときだけ計算する。
 * 絞り込んだ出力で全件の行が分からないときは null（全件の識別子を偽らない）。
 */
export function resolveDiffResultIdForExport(options: {
  resultId?: unknown;
  exportMode?: string | null;
  rows?: readonly any[] | null;
  allRows?: readonly any[] | null;
} & Omit<DiffResultIdInput, 'rows'>): DiffResultId | null {
  const provided = readDiffResultId(options.resultId);
  if (provided) return provided;
  const isAll = !options.exportMode || String(options.exportMode).toLowerCase() === 'all';
  const rows = Array.isArray(options.allRows) ? options.allRows : (isAll ? options.rows : null);
  if (!Array.isArray(rows)) return null;
  return computeDiffResultId({ ...options, rows });
}
