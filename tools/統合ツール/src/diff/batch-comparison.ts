'use strict';

export const DEFAULT_MAX_DIFF_BATCH_PAIRS = 50;

export interface DiffBatchEndpointInput {
  appId?: unknown;
  guestId?: unknown;
  preview?: unknown;
  appName?: unknown;
}

export interface DiffBatchEndpoint {
  appId: string;
  guestId: string;
  preview: boolean;
  appName: string;
}

export interface DiffBatchPairInput {
  source?: DiffBatchEndpointInput | null;
  target?: DiffBatchEndpointInput | null;
  rowNumber?: number;
}

export interface DiffBatchPair {
  source: DiffBatchEndpoint;
  target: DiffBatchEndpoint;
  rowNumber: number;
}

export type DiffBatchPairIssueCode =
  | 'incomplete'
  | 'invalid-source-app'
  | 'invalid-target-app'
  | 'invalid-source-guest'
  | 'invalid-target-guest'
  | 'same-endpoint'
  | 'duplicate-pair'
  | 'duplicate-source'
  | 'duplicate-target'
  | 'too-many';

export interface DiffBatchPairIssue {
  code: DiffBatchPairIssueCode;
  rowNumber: number;
  relatedRowNumber?: number;
  side?: 'source' | 'target' | 'pair';
  message: string;
}

export interface PrepareDiffBatchPairsOptions {
  maxPairs?: number;
  requireOneToOne?: boolean;
}

export interface PreparedDiffBatchPairs {
  pairs: DiffBatchPair[];
  issues: DiffBatchPairIssue[];
}

export interface DiffBatchRunContext {
  importedSourceBundle: unknown | null;
  importedTargetBundle: unknown | null;
  onSourceBundle: (bundle: unknown) => void;
}

export interface DiffBatchRunSuccess<TResult> {
  status: 'fulfilled';
  pair: DiffBatchPair;
  index: number;
  value: TResult;
}

export interface DiffBatchRunFailure {
  status: 'rejected';
  pair: DiffBatchPair;
  index: number;
  error: unknown;
}

export type DiffBatchRunResult<TResult> = DiffBatchRunSuccess<TResult> | DiffBatchRunFailure;

function text(value: unknown): string {
  return String(value ?? '').trim();
}

function numericIdentifier(value: unknown): string {
  const normalized = text(value);
  return /^\d+$/.test(normalized) ? normalized.replace(/^0+(?=\d)/, '') : normalized;
}

function normalizeEndpoint(input?: DiffBatchEndpointInput | null): DiffBatchEndpoint {
  return {
    appId: numericIdentifier(input?.appId),
    guestId: numericIdentifier(input?.guestId),
    preview: input?.preview === true,
    appName: text(input?.appName)
  };
}

function endpointWasTouched(endpoint: DiffBatchEndpoint): boolean {
  return !!(endpoint.appId || endpoint.guestId || endpoint.preview || endpoint.appName);
}

function endpointDescription(endpoint: DiffBatchEndpoint): string {
  const space = endpoint.guestId ? `ゲスト ${endpoint.guestId}` : '通常スペース';
  return `App ${endpoint.appId || '-'} / ${space} / ${endpoint.preview ? 'プレビュー' : '運用'}`;
}

/** app / guest / preview を衝突なく区別する、バンドル再利用専用の接続キー。 */
export function buildDiffBatchEndpointKey(endpoint: DiffBatchEndpointInput): string {
  return JSON.stringify([
    numericIdentifier(endpoint?.appId),
    numericIdentifier(endpoint?.guestId),
    endpoint?.preview === true
  ]);
}

/** 比較方向を含む完全なペアキー。 */
export function buildDiffBatchPairKey(pair: Pick<DiffBatchPair, 'source' | 'target'>): string {
  return JSON.stringify([
    buildDiffBatchEndpointKey(pair.source),
    buildDiffBatchEndpointKey(pair.target)
  ]);
}

/**
 * 動的な入力行を正規化し、1対1対応として安全に実行できるか検証する。
 * 完全な空行だけを無視し、片側だけの入力や重複は黙って補正しない。
 */
export function prepareDiffBatchPairs(
  inputs: DiffBatchPairInput[],
  options: PrepareDiffBatchPairsOptions = {}
): PreparedDiffBatchPairs {
  const maxPairs = Math.max(1, Math.floor(options.maxPairs ?? DEFAULT_MAX_DIFF_BATCH_PAIRS));
  const requireOneToOne = options.requireOneToOne !== false;
  const pairs: DiffBatchPair[] = [];
  const issues: DiffBatchPairIssue[] = [];
  const pairRows = new Map<string, number>();
  const sourceRows = new Map<string, number>();
  const targetRows = new Map<string, number>();

  for (let index = 0; index < inputs.length; index += 1) {
    const input = inputs[index] || {};
    const rowNumber = Number.isInteger(input.rowNumber) && Number(input.rowNumber) > 0
      ? Number(input.rowNumber)
      : index + 1;
    const source = normalizeEndpoint(input.source);
    const target = normalizeEndpoint(input.target);
    const sourceTouched = endpointWasTouched(source);
    const targetTouched = endpointWasTouched(target);

    if (!sourceTouched && !targetTouched) continue;
    if (!source.appId || !target.appId) {
      const missing = [!source.appId ? '比較元' : '', !target.appId ? '比較先' : ''].filter(Boolean).join('と');
      issues.push({
        code: 'incomplete',
        rowNumber,
        side: !source.appId ? 'source' : 'target',
        message: `ペア ${rowNumber}: ${missing}のアプリIDを入力してください`
      });
      continue;
    }

    const fieldChecks: Array<{
      value: string;
      code: DiffBatchPairIssueCode;
      side: 'source' | 'target';
      label: string;
      optional?: boolean;
    }> = [
      { value: source.appId, code: 'invalid-source-app', side: 'source', label: '比較元アプリID' },
      { value: target.appId, code: 'invalid-target-app', side: 'target', label: '比較先アプリID' },
      { value: source.guestId, code: 'invalid-source-guest', side: 'source', label: '比較元ゲストID', optional: true },
      { value: target.guestId, code: 'invalid-target-guest', side: 'target', label: '比較先ゲストID', optional: true }
    ];
    let invalid = false;
    for (const check of fieldChecks) {
      if ((check.optional && !check.value) || /^\d+$/.test(check.value)) continue;
      invalid = true;
      issues.push({
        code: check.code,
        rowNumber,
        side: check.side,
        message: `ペア ${rowNumber}: ${check.label}は半角数字で入力してください`
      });
    }
    if (invalid) continue;

    const pair: DiffBatchPair = { source, target, rowNumber };
    const sourceKey = buildDiffBatchEndpointKey(source);
    const targetKey = buildDiffBatchEndpointKey(target);
    const pairKey = buildDiffBatchPairKey(pair);
    if (sourceKey === targetKey) {
      issues.push({
        code: 'same-endpoint',
        rowNumber,
        side: 'pair',
        message: `ペア ${rowNumber}: 比較元と比較先が同じ接続先です（${endpointDescription(source)}）`
      });
      continue;
    }

    const duplicatePairRow = pairRows.get(pairKey);
    if (duplicatePairRow != null) {
      issues.push({
        code: 'duplicate-pair',
        rowNumber,
        relatedRowNumber: duplicatePairRow,
        side: 'pair',
        message: `ペア ${rowNumber}: ペア ${duplicatePairRow} と同じ組み合わせです`
      });
      continue;
    }

    if (requireOneToOne) {
      const duplicateSourceRow = sourceRows.get(sourceKey);
      if (duplicateSourceRow != null) {
        issues.push({
          code: 'duplicate-source',
          rowNumber,
          relatedRowNumber: duplicateSourceRow,
          side: 'source',
          message: `ペア ${rowNumber}: 比較元がペア ${duplicateSourceRow} と重複しています。1対多比較は「1対多比較」を使ってください`
        });
        continue;
      }
      const duplicateTargetRow = targetRows.get(targetKey);
      if (duplicateTargetRow != null) {
        issues.push({
          code: 'duplicate-target',
          rowNumber,
          relatedRowNumber: duplicateTargetRow,
          side: 'target',
          message: `ペア ${rowNumber}: 比較先がペア ${duplicateTargetRow} と重複しています。各アプリを1件ずつ対応付けてください`
        });
        continue;
      }
    }

    pairRows.set(pairKey, rowNumber);
    sourceRows.set(sourceKey, rowNumber);
    targetRows.set(targetKey, rowNumber);
    pairs.push(pair);
  }

  if (pairs.length > maxPairs) {
    const firstOverflow = pairs[maxPairs]?.rowNumber || maxPairs + 1;
    issues.push({
      code: 'too-many',
      rowNumber: firstOverflow,
      side: 'pair',
      message: `一度に比較できるペアは ${maxPairs} 件までです`
    });
  }

  return { pairs: pairs.slice(0, maxPairs), issues };
}

/**
 * ペアを登録順に1件ずつ比較する。接続先が別の行の反対側に再登場した場合も、
 * app / guest / preview が完全一致するときだけ取得済みバンドルを再利用する。
 */
export async function runSequentialDiffBatch<TResult extends { sourceBundle?: unknown; targetBundle?: unknown }>(
  pairs: DiffBatchPair[],
  runPair: (pair: DiffBatchPair, context: DiffBatchRunContext) => Promise<TResult>,
  onProgress?: (pair: DiffBatchPair, index: number, total: number) => void
): Promise<Array<DiffBatchRunResult<TResult>>> {
  const bundleCache = new Map<string, unknown>();
  const results: Array<DiffBatchRunResult<TResult>> = [];

  for (let index = 0; index < pairs.length; index += 1) {
    const pair = pairs[index];
    const sourceKey = buildDiffBatchEndpointKey(pair.source);
    const targetKey = buildDiffBatchEndpointKey(pair.target);
    onProgress?.(pair, index, pairs.length);
    try {
      const value = await runPair(pair, {
        importedSourceBundle: bundleCache.get(sourceKey) ?? null,
        importedTargetBundle: bundleCache.get(targetKey) ?? null,
        onSourceBundle: (bundle) => {
          if (bundle != null) bundleCache.set(sourceKey, bundle);
        }
      });
      if (value?.sourceBundle != null) bundleCache.set(sourceKey, value.sourceBundle);
      if (value?.targetBundle != null) bundleCache.set(targetKey, value.targetBundle);
      results.push({ status: 'fulfilled', pair, index, value });
    } catch (error) {
      results.push({ status: 'rejected', pair, index, error });
    }
  }

  return results;
}
