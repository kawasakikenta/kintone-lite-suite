'use strict';

import { extractAppNameFromBundle } from '../utils.js';

export interface DiffSnapshotAppContext {
  appId: string | number;
  guestId: string;
  preview: boolean;
  appName: string;
}

export interface DiffSnapshotComparisonContext {
  source: DiffSnapshotAppContext | null;
  target: DiffSnapshotAppContext | null;
  scopes: string[];
  ignoreKeys: string;
  normalization: Record<string, boolean>;
  comparedAt: string | number;
}

export interface DiffSnapshotFilters {
  section: string;
  type: string;
  severity: string;
}

export interface DiffSnapshotPayload extends DiffSnapshotComparisonContext {
  tool: 'kintone-unified-suite';
  type: 'diff-snapshot';
  version: 2;
  savedAt: string | number;
  rows: any[];
  fetchIssues: any[];
  partialIssues: any[];
  truncation: any | null;
  filters: DiffSnapshotFilters;
}

export interface BuildDiffSnapshotInput {
  rows?: any[];
  fetchIssues?: any[];
  partialIssues?: any[];
  truncation?: any;
  sourceBundle?: any;
  targetBundle?: any;
  source?: DiffSnapshotAppContext | null;
  target?: DiffSnapshotAppContext | null;
  scopes?: readonly string[];
  ignoreKeys?: unknown;
  normalization?: unknown;
  comparedAt?: unknown;
  savedAt?: unknown;
  filters?: Partial<DiffSnapshotFilters>;
}

export interface DiffSnapshotImportState {
  snapshot: DiffSnapshotPayload;
  statePatch: {
    lastSourceBundle: null;
    lastTargetBundle: null;
    lastDiffRows: any[];
    lastFetchIssues: any[];
    lastPartialIssues: any[];
    lastDiffTruncation: any | null;
    lastDiffAt: string | number;
    lastDiffSignature: '';
    lastDiffSnapshotContext: DiffSnapshotComparisonContext;
    importedSourceBundle: null;
    importedTargetBundle: null;
    importedSourceName: '';
    importedTargetName: '';
    lastApplyPlan: null;
    diffSelectedIds: Set<string>;
    diffExcludeSections: null;
    diffSectionVisibleCounts: Record<string, number>;
    diffIgnoreSuggestions: any[];
    diffExportMode: 'all';
  };
}

function asRecord(value: unknown): Record<string, any> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, any>
    : {};
}

function text(value: unknown): string {
  return value == null ? '' : String(value);
}

function finiteNumber(value: unknown): number | undefined {
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function normalizeTimestamp(value: unknown, fallback: string | number): string | number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) return value.trim();
  return fallback;
}

function normalizeScopes(value: unknown, rows: any[] = []): string[] {
  const supplied = Array.isArray(value) ? value : [];
  const derived = supplied.length ? supplied : rows.map((row) => row?.sectionKey);
  return [...new Set(derived.map((scope) => text(scope).trim()).filter(Boolean))];
}

function normalizeSwitches(value: unknown): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const [key, enabled] of Object.entries(asRecord(value))) {
    if (typeof enabled === 'boolean') out[key] = enabled;
  }
  return out;
}

function normalizeFilters(value: unknown): DiffSnapshotFilters {
  const filters = asRecord(value);
  return {
    section: text(filters.section),
    type: text(filters.type),
    severity: text(filters.severity)
  };
}

function normalizeFetchIssues(value: unknown): any[] {
  if (!Array.isArray(value)) return [];
  return value.map((raw) => {
    const issue = asRecord(raw);
    return {
      sectionKey: text(issue.sectionKey),
      section: text(issue.section),
      side: text(issue.side),
      message: text(issue.message),
      sourceError: text(issue.sourceError),
      targetError: text(issue.targetError)
    };
  });
}

function normalizePartialIssues(value: unknown): any[] {
  if (!Array.isArray(value)) return [];
  return value.map((raw) => {
    const issue = asRecord(raw);
    const files = Array.isArray(issue.files) ? issue.files : [];
    return {
      sectionKey: text(issue.sectionKey),
      section: text(issue.section),
      side: text(issue.side),
      message: text(issue.message),
      reason: text(issue.reason),
      files: files.map((rawFile: unknown) => {
        const file = asRecord(rawFile);
        return {
          fileName: text(file.fileName),
          fileKey: text(file.fileKey),
          reason: text(file.reason),
          detail: text(file.detail),
          byteSize: finiteNumber(file.byteSize) || 0
        };
      })
    };
  });
}

function normalizeTruncation(value: unknown): any | null {
  const truncation = asRecord(value);
  if (!truncation.truncated) return null;
  const sections = Array.isArray(truncation.sections) ? truncation.sections : [];
  return {
    truncated: true,
    diffLimit: finiteNumber(truncation.diffLimit),
    sameLimit: finiteNumber(truncation.sameLimit),
    droppedDiff: finiteNumber(truncation.droppedDiff) || 0,
    droppedSame: finiteNumber(truncation.droppedSame) || 0,
    sections: sections.map((raw: unknown) => {
      const section = asRecord(raw);
      return {
        sectionKey: text(section.sectionKey),
        section: text(section.section),
        droppedDiff: finiteNumber(section.droppedDiff) || 0,
        droppedSame: finiteNumber(section.droppedSame) || 0
      };
    })
  };
}

function normalizeAppContext(value: unknown): DiffSnapshotAppContext | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const app = asRecord(value);
  const rawId = app.appId;
  const appId = typeof rawId === 'number' && Number.isFinite(rawId) ? rawId : text(rawId).trim();
  return {
    appId,
    guestId: text(app.guestId).trim(),
    preview: !!app.preview,
    appName: text(app.appName).trim()
  };
}

export function diffSnapshotAppFromBundle(bundle: any): DiffSnapshotAppContext | null {
  if (!bundle || typeof bundle !== 'object') return null;
  return normalizeAppContext({
    appId: bundle.appId,
    guestId: bundle.guestId,
    preview: bundle.preview,
    appName: extractAppNameFromBundle(bundle)
  });
}

export function diffSnapshotAppToBundle(app: DiffSnapshotAppContext | null | undefined): any | null {
  if (!app) return null;
  return {
    appId: app.appId,
    guestId: app.guestId,
    preview: app.preview,
    meta: { appName: app.appName }
  };
}

export function buildDiffSnapshotPayload(input: BuildDiffSnapshotInput): DiffSnapshotPayload {
  const savedAt = normalizeTimestamp(input.savedAt, new Date().toISOString());
  const rows = Array.isArray(input.rows) ? input.rows : [];
  return {
    tool: 'kintone-unified-suite',
    type: 'diff-snapshot',
    version: 2,
    savedAt,
    comparedAt: normalizeTimestamp(input.comparedAt, savedAt),
    source: normalizeAppContext(input.source) || diffSnapshotAppFromBundle(input.sourceBundle),
    target: normalizeAppContext(input.target) || diffSnapshotAppFromBundle(input.targetBundle),
    scopes: normalizeScopes(input.scopes, rows),
    ignoreKeys: text(input.ignoreKeys),
    normalization: normalizeSwitches(input.normalization),
    rows,
    fetchIssues: normalizeFetchIssues(input.fetchIssues),
    partialIssues: normalizePartialIssues(input.partialIssues),
    truncation: normalizeTruncation(input.truncation),
    filters: normalizeFilters(input.filters)
  };
}

export function parseDiffSnapshotPayload(raw: unknown, importedAt: string | number = new Date().toISOString()): DiffSnapshotPayload {
  const data = asRecord(raw);
  if (!Array.isArray(data.rows)) throw new Error('rows 配列が見つかりません');
  const legacyComparison = asRecord(data.comparison);
  const savedAt = normalizeTimestamp(data.savedAt, importedAt);
  return buildDiffSnapshotPayload({
    savedAt,
    comparedAt: data.comparedAt ?? legacyComparison.comparedAt ?? savedAt,
    rows: data.rows,
    fetchIssues: data.fetchIssues,
    partialIssues: data.partialIssues ?? legacyComparison.partialIssues,
    truncation: data.truncation ?? legacyComparison.truncation,
    source: normalizeAppContext(data.source ?? legacyComparison.source),
    target: normalizeAppContext(data.target ?? legacyComparison.target),
    scopes: normalizeScopes(data.scopes ?? legacyComparison.scopes, data.rows),
    ignoreKeys: data.ignoreKeys ?? legacyComparison.ignoreKeys ?? '',
    normalization: data.normalization ?? legacyComparison.normalization,
    filters: data.filters
  });
}

export function createDiffSnapshotImportState(raw: unknown, importedAt?: string | number): DiffSnapshotImportState {
  const snapshot = parseDiffSnapshotPayload(raw, importedAt);
  return {
    snapshot,
    statePatch: {
      // 証跡スナップショットに設定本文は含めない。前回の実比較バンドルを継承しない。
      lastSourceBundle: null,
      lastTargetBundle: null,
      lastDiffRows: snapshot.rows,
      lastFetchIssues: snapshot.fetchIssues,
      lastPartialIssues: snapshot.partialIssues,
      lastDiffTruncation: snapshot.truncation,
      lastDiffAt: snapshot.comparedAt,
      // UIの現在条件と一致した実比較とは扱わない。
      lastDiffSignature: '',
      lastDiffSnapshotContext: {
        source: snapshot.source,
        target: snapshot.target,
        scopes: snapshot.scopes,
        ignoreKeys: snapshot.ignoreKeys,
        normalization: snapshot.normalization,
        comparedAt: snapshot.comparedAt
      },
      importedSourceBundle: null,
      importedTargetBundle: null,
      importedSourceName: '',
      importedTargetName: '',
      lastApplyPlan: null,
      diffSelectedIds: new Set<string>(),
      diffExcludeSections: null,
      diffSectionVisibleCounts: {},
      diffIgnoreSuggestions: [],
      diffExportMode: 'all'
    }
  };
}
