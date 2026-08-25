'use strict';

import type { Bundle } from '../api.js';
import { pickAllSettingsBundles } from '../settingsBundleImport.js';
import { extractAppNameFromBundle } from '../utils.js';
import { buildDiffBatchEndpointKey } from './batch-comparison.js';

/**
 * UI 側で File を読み終えた後に渡す、DOM 非依存のファイル表現。
 * relativePath はフォルダ取込時の webkitRelativePath 等を想定する。
 */
export interface DiffBatchFolderImportFile {
  name: string;
  relativePath?: string;
  text: string;
}

export type DiffBatchFolderImportIssueCode =
  | 'invalid-json'
  | 'no-bundle'
  | 'invalid-bundle'
  | 'invalid-preview'
  | 'invalid-app-id'
  | 'invalid-guest-id'
  | 'duplicate-endpoint'
  | 'manifest-mismatch';

export interface DiffBatchFolderImportIssue {
  code: DiffBatchFolderImportIssueCode;
  fileName: string;
  relativePath: string;
  message: string;
  bundleIndex?: number;
  endpointKey?: string;
  relatedFileName?: string;
  relatedRelativePath?: string;
  relatedBundleIndex?: number;
}

export interface DiffBatchFolderImportedBundle {
  bundle: Bundle;
  appId: string;
  guestId: string;
  preview: boolean;
  appName: string;
  endpointKey: string;
  fileName: string;
  relativePath: string;
  /** 1 ファイル内のバンドル番号（1 始まり）。 */
  bundleIndex: number;
}

export interface DiffBatchFolderImportResult {
  bundles: DiffBatchFolderImportedBundle[];
  issues: DiffBatchFolderImportIssue[];
  /** manifest.json を除き、解析対象にした JSON ファイル数。 */
  jsonFileCount: number;
  /** 拡張子が .json でないため無視したファイル数。 */
  ignoredFileCount: number;
  /** バンドルとして数えず無視した manifest.json の数。 */
  manifestFileCount: number;
}

export type DiffBatchFolderMatchKind = 'app-name' | 'app-id' | 'unpaired';

export interface DiffBatchFolderMatchedPair {
  source: DiffBatchFolderImportedBundle | null;
  target: DiffBatchFolderImportedBundle | null;
  matchKind: DiffBatchFolderMatchKind;
}

function normalizedFileName(file: DiffBatchFolderImportFile): string {
  return String(file?.name || '').trim();
}

function normalizedRelativePath(file: DiffBatchFolderImportFile, fileName: string): string {
  return String(file?.relativePath || fileName).trim() || fileName;
}

function baseName(path: string): string {
  const pieces = String(path || '').replace(/\\/g, '/').split('/');
  return pieces[pieces.length - 1] || '';
}

function directoryName(path: string): string {
  const normalized = String(path || '').replace(/\\/g, '/');
  const separator = normalized.lastIndexOf('/');
  return separator >= 0 ? normalized.slice(0, separator) : '';
}

function isInsideDirectory(relativePath: string, directory: string): boolean {
  const normalizedPath = String(relativePath || '').replace(/\\/g, '/');
  if (!directory) return true;
  return normalizedPath.startsWith(`${directory}/`);
}

function normalizeNumericIdentifier(value: unknown): string {
  const identifier = String(value ?? '').trim();
  return /^\d+$/.test(identifier) ? identifier.replace(/^0+(?=\d)/, '') : identifier;
}

function bundlePosition(fileName: string, bundleIndex: number, bundleCount: number): string {
  return bundleCount > 1 ? `${fileName} のバンドル ${bundleIndex}` : fileName;
}

function isPlainRecord(value: unknown): value is Record<string, any> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function appNameFromGeneratedFileName(fileName: string, appId: string): string {
  const stem = baseName(fileName)
    .replace(/\.json$/i, '')
    .replace(/(?:_ゲスト\d+)?_(?:プレビュー|本番)$/u, '');
  const match = stem.match(/^(.*)\(app(\d+)\)$/i);
  if (!match || normalizeNumericIdentifier(match[2]) !== appId) return '';
  return String(match[1] || '').trim();
}

interface RawBundleCandidate {
  value: any;
  /** apps/bundles配列やwrapper内で、バンドルとして明示された候補。 */
  explicit: boolean;
}

function rawBundleCandidates(raw: any, explicit = false): RawBundleCandidate[] {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return explicit ? [{ value: raw, explicit: true }] : [];
  }
  if (Object.prototype.hasOwnProperty.call(raw, 'source') && Object.prototype.hasOwnProperty.call(raw, 'target')) {
    return rawBundleCandidates(raw.source, true);
  }
  if (Object.prototype.hasOwnProperty.call(raw, 'bundle')) return rawBundleCandidates(raw.bundle, true);
  if (Array.isArray(raw.apps)) return raw.apps.flatMap((candidate: any) => rawBundleCandidates(candidate, true));
  if (Array.isArray(raw.bundles)) return raw.bundles.flatMap((candidate: any) => rawBundleCandidates(candidate, true));
  return [{ value: raw, explicit }];
}

function rawBundleIssue(candidate: any): { code: 'invalid-bundle' | 'invalid-preview'; detail: string } | null {
  if (!isPlainRecord(candidate)) {
    return { code: 'invalid-bundle', detail: 'バンドルはオブジェクトで指定してください' };
  }
  const looksLikeBundle = Object.prototype.hasOwnProperty.call(candidate, 'appId') ||
    Object.prototype.hasOwnProperty.call(candidate, 'sections') ||
    Object.prototype.hasOwnProperty.call(candidate, 'preview');
  if (!looksLikeBundle) return null;
  if (!isPlainRecord(candidate.sections)) {
    return { code: 'invalid-bundle', detail: 'sectionsはオブジェクトで指定してください' };
  }
  if (!Object.prototype.hasOwnProperty.call(candidate, 'preview') || typeof candidate.preview !== 'boolean') {
    return { code: 'invalid-preview', detail: 'previewは true または false で指定してください' };
  }
  return null;
}

function manifestShapeIssues(raw: any): string[] {
  if (!isPlainRecord(raw)) return ['ルートはオブジェクトで指定してください'];
  const details: string[] = [];
  if (typeof raw.appCount !== 'number' || !Number.isInteger(raw.appCount) || raw.appCount < 0) {
    details.push('appCountは0以上の整数で指定してください');
  }
  if (Object.prototype.hasOwnProperty.call(raw, 'preview') && typeof raw.preview !== 'boolean') {
    details.push('previewは true または false で指定してください');
  }
  if (Object.prototype.hasOwnProperty.call(raw, 'targets')) {
    if (!Array.isArray(raw.targets)) {
      details.push('targetsは配列で指定してください');
    } else {
      if (typeof raw.preview !== 'boolean') details.push('targetsがある場合はpreviewも指定してください');
      raw.targets.forEach((target: any, index: number) => {
        if (!isPlainRecord(target)) {
          details.push(`targets[${index}]はオブジェクトで指定してください`);
          return;
        }
        const appId = normalizeNumericIdentifier(target.appId);
        const guestId = normalizeNumericIdentifier(target.guestId);
        if (!/^\d+$/.test(appId)) details.push(`targets[${index}].appIdは半角数字で指定してください`);
        if (guestId && !/^\d+$/.test(guestId)) details.push(`targets[${index}].guestIdは空欄または半角数字で指定してください`);
      });
    }
  }
  return details;
}

function rawAppName(candidate: any): string {
  if (candidate?.bundle) return rawAppName(candidate.bundle);
  return extractAppNameFromBundle(candidate);
}

function normalizedAppName(value: unknown): string {
  return String(value ?? '')
    .normalize('NFKC')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

/**
 * 左右の取込バンドルを1回ずつだけ使って、安全度の高い順に自動対応付けする。
 *
 * 1. 両側とも1件だけの正規化アプリ名一致
 * 2. その後の未使用バンドル間で、両側とも1件だけの App ID 一致
 * 3. 対応を一意に確定できない残件は unpaired
 *
 * アプリ名や App ID が重複する場合、入力順での仮対応は行わない。
 * 表示順は比較元の入力順を維持し、対応しない比較先を末尾に追加する。
 */
export function autoMatchDiffBatchFolderBundles(
  sourceBundles: readonly DiffBatchFolderImportedBundle[],
  targetBundles: readonly DiffBatchFolderImportedBundle[]
): DiffBatchFolderMatchedPair[] {
  const sources = [...(sourceBundles || [])];
  const targets = [...(targetBundles || [])];
  const sourceMatches = new Map<number, { targetIndex: number; matchKind: Exclude<DiffBatchFolderMatchKind, 'unpaired'> }>();
  const usedTargets = new Set<number>();

  const sourceNameCounts = new Map<string, number>();
  const targetNameIndexes = new Map<string, number[]>();

  for (let sourceIndex = 0; sourceIndex < sources.length; sourceIndex += 1) {
    const name = normalizedAppName(sources[sourceIndex].appName);
    if (!name) continue;
    sourceNameCounts.set(name, (sourceNameCounts.get(name) || 0) + 1);
  }
  for (let targetIndex = 0; targetIndex < targets.length; targetIndex += 1) {
    const name = normalizedAppName(targets[targetIndex].appName);
    if (!name) continue;
    const indexes = targetNameIndexes.get(name) || [];
    indexes.push(targetIndex);
    targetNameIndexes.set(name, indexes);
  }

  for (let sourceIndex = 0; sourceIndex < sources.length; sourceIndex += 1) {
    const name = normalizedAppName(sources[sourceIndex].appName);
    const candidateTargets = name ? targetNameIndexes.get(name) : undefined;
    if (!name || sourceNameCounts.get(name) !== 1 || candidateTargets?.length !== 1) continue;
    const targetIndex = candidateTargets[0];
    if (usedTargets.has(targetIndex)) continue;
    sourceMatches.set(sourceIndex, { targetIndex, matchKind: 'app-name' });
    usedTargets.add(targetIndex);
  }

  const remainingSourceIndexes = sources
    .map((_, index) => index)
    .filter((index) => !sourceMatches.has(index));
  const remainingTargetIndexes = targets
    .map((_, index) => index)
    .filter((index) => !usedTargets.has(index));
  const sourceIdCounts = new Map<string, number>();
  const targetIdIndexes = new Map<string, number[]>();
  for (const sourceIndex of remainingSourceIndexes) {
    const appId = sources[sourceIndex].appId;
    sourceIdCounts.set(appId, (sourceIdCounts.get(appId) || 0) + 1);
  }
  for (const targetIndex of remainingTargetIndexes) {
    const appId = targets[targetIndex].appId;
    const indexes = targetIdIndexes.get(appId) || [];
    indexes.push(targetIndex);
    targetIdIndexes.set(appId, indexes);
  }
  for (const sourceIndex of remainingSourceIndexes) {
    const appId = sources[sourceIndex].appId;
    const candidateTargets = targetIdIndexes.get(appId);
    if (sourceIdCounts.get(appId) !== 1 || candidateTargets?.length !== 1) continue;
    const targetIndex = candidateTargets[0];
    sourceMatches.set(sourceIndex, { targetIndex, matchKind: 'app-id' });
    usedTargets.add(targetIndex);
  }

  const rows: DiffBatchFolderMatchedPair[] = sources.map((source, sourceIndex) => {
    const match = sourceMatches.get(sourceIndex);
    if (!match) return { source, target: null, matchKind: 'unpaired' };
    return {
      source,
      target: targets[match.targetIndex],
      matchKind: match.matchKind
    };
  });
  targets.forEach((target, targetIndex) => {
    if (!usedTargets.has(targetIndex)) rows.push({ source: null, target, matchKind: 'unpaired' });
  });
  return rows;
}

/**
 * 再帰的に列挙済みのファイルを入力順に解析する。
 *
 * - manifest.json はメタデータのためバンドルとして数えない
 * - 単体バンドルと apps/bundles 配列の両方を pickAllSettingsBundles で読む
 * - 同じ app / guest / preview の重複は、後勝ちにせず issue として返す
 *
 * issues が 1 件でもある場合は、UI 側で比較開始を止めて利用者に修正を促す想定。
 */
export function parseDiffBatchFolderImport(
  files: readonly DiffBatchFolderImportFile[]
): DiffBatchFolderImportResult {
  const bundles: DiffBatchFolderImportedBundle[] = [];
  const issues: DiffBatchFolderImportIssue[] = [];
  const endpoints = new Map<string, DiffBatchFolderImportedBundle>();
  const manifests: Array<{
    fileName: string;
    relativePath: string;
    directory: string;
    raw: any;
  }> = [];
  let jsonFileCount = 0;
  let ignoredFileCount = 0;
  let manifestFileCount = 0;

  for (const file of files || []) {
    const fileName = normalizedFileName(file);
    const relativePath = normalizedRelativePath(file, fileName);
    const effectiveName = baseName(relativePath) || fileName;

    if (effectiveName.toLowerCase() === 'manifest.json') {
      manifestFileCount += 1;
      try {
        const raw = JSON.parse(String(file?.text ?? ''));
        const shapeIssues = manifestShapeIssues(raw);
        if (!shapeIssues.length) {
          manifests.push({ fileName, relativePath, directory: directoryName(relativePath), raw });
        } else {
          issues.push({
            code: 'manifest-mismatch',
            fileName,
            relativePath,
            message: `${relativePath}: manifest.json の形式が不正です（${shapeIssues.join('、')}）`
          });
        }
      } catch (error) {
        const detail = error instanceof Error && error.message ? `: ${error.message}` : '';
        issues.push({
          code: 'manifest-mismatch',
          fileName,
          relativePath,
          message: `${relativePath}: manifest.json のJSON形式が不正です${detail}`
        });
      }
      continue;
    }
    if (!/\.json$/i.test(effectiveName)) {
      ignoredFileCount += 1;
      continue;
    }
    jsonFileCount += 1;

    let raw: unknown;
    try {
      raw = JSON.parse(String(file?.text ?? ''));
    } catch (error) {
      const detail = error instanceof Error && error.message ? `: ${error.message}` : '';
      issues.push({
        code: 'invalid-json',
        fileName,
        relativePath,
        message: `${relativePath}: JSONの形式が不正です${detail}`
      });
      continue;
    }

    const picked: Array<{ bundle: Bundle; appName: string }> = [];
    const candidates = rawBundleCandidates(raw);
    const issueCountBeforeCandidates = issues.length;
    for (let candidateIndex = 0; candidateIndex < candidates.length; candidateIndex += 1) {
      const candidateEntry = candidates[candidateIndex];
      const candidate = candidateEntry.value;
      const candidateIssue = rawBundleIssue(candidate);
      if (candidateIssue) {
        issues.push({
          code: candidateIssue.code,
          fileName,
          relativePath,
          bundleIndex: candidateIndex + 1,
          message: `${bundlePosition(fileName || relativePath, candidateIndex + 1, candidates.length)}: ${candidateIssue.detail}`
        });
        continue;
      }
      try {
        const candidateName = rawAppName(candidate);
        const candidateBundles = pickAllSettingsBundles(candidate) as Bundle[];
        candidateBundles.forEach((candidateBundle) => {
          picked.push({ bundle: candidateBundle, appName: candidateName });
        });
      } catch {
        if (candidateEntry.explicit || candidates.length > 1) {
          issues.push({
            code: 'invalid-bundle',
            fileName,
            relativePath,
            bundleIndex: candidateIndex + 1,
            message: `${bundlePosition(fileName || relativePath, candidateIndex + 1, candidates.length)}: バンドル形式が不正です`
          });
        }
      }
    }
    if (!picked.length) {
      if (issues.length === issueCountBeforeCandidates) {
        issues.push({
          code: 'no-bundle',
          fileName,
          relativePath,
          message: `${relativePath}: アプリ設定バンドルが見つかりません`
        });
      }
      continue;
    }

    for (let index = 0; index < picked.length; index += 1) {
      const sourceBundle = picked[index].bundle;
      const bundleIndex = index + 1;
      const appId = normalizeNumericIdentifier(sourceBundle?.appId);
      const guestId = normalizeNumericIdentifier(sourceBundle?.guestId);
      const preview = sourceBundle?.preview === true;
      const position = bundlePosition(fileName || relativePath, bundleIndex, picked.length);

      if (!/^\d+$/.test(appId)) {
        issues.push({
          code: 'invalid-app-id',
          fileName,
          relativePath,
          bundleIndex,
          message: `${position}: appIdは半角数字で指定してください`
        });
        continue;
      }
      if (guestId && !/^\d+$/.test(guestId)) {
        issues.push({
          code: 'invalid-guest-id',
          fileName,
          relativePath,
          bundleIndex,
          message: `${position}: guestIdは空欄または半角数字で指定してください`
        });
        continue;
      }

      const appName = picked[index].appName || (picked.length === 1 ? appNameFromGeneratedFileName(effectiveName, appId) : '');
      const bundle: Bundle = {
        ...sourceBundle,
        appId,
        guestId,
        preview,
        ...(appName ? { appName } : {})
      };
      const endpointKey = buildDiffBatchEndpointKey({ appId, guestId, preview });
      const imported: DiffBatchFolderImportedBundle = {
        bundle,
        appId,
        guestId,
        preview,
        appName: appName || extractAppNameFromBundle(bundle),
        endpointKey,
        fileName,
        relativePath,
        bundleIndex
      };
      const duplicate = endpoints.get(endpointKey);
      if (duplicate) {
        issues.push({
          code: 'duplicate-endpoint',
          fileName,
          relativePath,
          bundleIndex,
          endpointKey,
          relatedFileName: duplicate.fileName,
          relatedRelativePath: duplicate.relativePath,
          relatedBundleIndex: duplicate.bundleIndex,
          message: `${position}: App ${appId} / ${guestId ? `Guest ${guestId}` : '通常スペース'} / ${preview ? 'プレビュー' : '運用'} が ${bundlePosition(duplicate.fileName || duplicate.relativePath, duplicate.bundleIndex, 2)} と重複しています`
        });
      } else {
        endpoints.set(endpointKey, imported);
      }
      bundles.push(imported);
    }
  }

  for (const manifest of manifests) {
    const directoryBundles = bundles.filter((item) => isInsideDirectory(item.relativePath, manifest.directory));
    const details: string[] = [];
    const manifestAppCount = Number(manifest.raw?.appCount);
    if (Number.isInteger(manifestAppCount) && manifestAppCount >= 0 && manifestAppCount !== directoryBundles.length) {
      details.push(`appCount ${manifestAppCount} に対してJSON内のバンドルは ${directoryBundles.length} 件`);
    }

    if (Array.isArray(manifest.raw?.targets)) {
      const manifestPreview = manifest.raw?.preview === true;
      const expectedKeys = manifest.raw.targets.map((target: any) => buildDiffBatchEndpointKey({
        appId: normalizeNumericIdentifier(target?.appId),
        guestId: normalizeNumericIdentifier(target?.guestId),
        preview: manifestPreview
      })).sort();
      const actualKeys = directoryBundles.map((item) => item.endpointKey).sort();
      if (JSON.stringify(expectedKeys) !== JSON.stringify(actualKeys)) {
        details.push('targets の appId / guestId / preview とバンドル群が一致しません');
      }
    } else if (typeof manifest.raw?.preview === 'boolean') {
      const mismatchedPreview = directoryBundles.some((item) => item.preview !== manifest.raw.preview);
      if (mismatchedPreview) details.push(`preview=${String(manifest.raw.preview)} と異なるバンドルがあります`);
    }

    if (details.length) {
      issues.push({
        code: 'manifest-mismatch',
        fileName: manifest.fileName,
        relativePath: manifest.relativePath,
        message: `${manifest.relativePath}: manifest.json と同じフォルダの設定JSONが一致しません（${details.join('、')}）`
      });
    }
  }

  return {
    bundles,
    issues,
    jsonFileCount,
    ignoredFileCount,
    manifestFileCount
  };
}
