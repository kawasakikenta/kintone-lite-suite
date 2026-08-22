'use strict';

import { DEFAULT_IGNORE_KEYS, SECTION_DEFS } from '../constants.js';
import { state, ui } from '../state.js';
import { getActualDiffRows, parseIgnoreRules, normalizeIgnoreToken, getPathLeafKey, isIgnoredPath } from './engine.js';
import { pickBundleSections } from '../api.js';
import { diffRowMatchesKeyword, diffRowMatchesFieldNameKeyword, groupDiffRowsBySection } from './export.js';
import type { DiffRow, DiffFetchIssue, DiffFilterState } from './types.js';

export function normalizeDiffFavoritePath(path: unknown): string {
  return String(path || '').trim();
}

export function isDiffPathFavorite(path: unknown): boolean {
  return state.diffFavoritePaths.has(normalizeDiffFavoritePath(path));
}

export function getCurrentDiffFilterState(): DiffFilterState {
  return {
    keyword: String(ui.diffSearch?.value || '').trim().toLowerCase(),
    section: ui.diffFilterSection?.value || state.diffFilterSection || '',
    type: ui.diffFilterType?.value || state.diffFilterType || '',
    severity: ui.diffFilterSeverity?.value || state.diffFilterSeverity || '',
    searchByFieldName: !!ui.diffSearchFieldName?.checked || !!state.diffSearchFieldName,
    sourceBundle: state.lastSourceBundle,
    targetBundle: state.lastTargetBundle,
    favoritesOnly: !!state.diffFavoritesOnly
  };
}

export function diffIssueMatchesKeyword(issue: DiffFetchIssue, keyword: string): boolean {
  if (!keyword) return true;
  const text = [
    issue.section || '',
    issue.sectionKey || '',
    issue.side || '',
    issue.sourceError || '',
    issue.targetError || '',
    issue.message || ''
  ].join('\n').toLowerCase();
  return text.includes(keyword);
}

export function diffRowMatchesFilters(row: DiffRow, filters: DiffFilterState): boolean {
  if (filters.keyword) {
    if (filters.searchByFieldName) {
      if (!diffRowMatchesFieldNameKeyword(row, filters.keyword, filters.sourceBundle, filters.targetBundle)) return false;
    } else if (!diffRowMatchesKeyword(row, filters.keyword)) {
      return false;
    }
  }
  if (filters.section && row.sectionKey !== filters.section) return false;
  if (filters.type === 'moved') {
    if (!row.moved) return false;
  } else if (filters.type && row.type !== filters.type) {
    return false;
  }
  if (filters.severity && String(row.severity || 'low') !== filters.severity) return false;
  if (filters.favoritesOnly && !isDiffPathFavorite(row.path)) return false;
  return true;
}

export function getFilteredDiffRows(rows?: DiffRow[]): DiffRow[] {
  const list: DiffRow[] = rows || state.lastDiffRows || [];
  const filters = getCurrentDiffFilterState();
  const ex = state.diffExcludeSections;
  return list.filter((row) => {
    if (Array.isArray(ex) && ex.length && ex.includes(row.sectionKey)) return false;
    return diffRowMatchesFilters(row, filters);
  });
}

/** セクションタブ用（セクション条件以外のフィルタのみ適用した件数） */
export function getFilteredDiffRowsWithoutSectionFilter(rows?: DiffRow[]): DiffRow[] {
  const list: DiffRow[] = rows || state.lastDiffRows || [];
  const filters: DiffFilterState = { ...getCurrentDiffFilterState(), section: '' };
  const ex = state.diffExcludeSections;
  return list.filter((row) => {
    if (Array.isArray(ex) && ex.length && ex.includes(row.sectionKey)) return false;
    return diffRowMatchesFilters(row, filters);
  });
}


export function getSelectedDiffRows(rows?: DiffRow[]): DiffRow[] {
  const selected = state.diffSelectedIds || new Set<string>();
  return (rows || state.lastDiffRows || []).filter((row: DiffRow) => selected.has(row._id || ''));
}

export function getFavoriteDiffRows(rows?: DiffRow[]): DiffRow[] {
  return (rows || state.lastDiffRows || []).filter((row: DiffRow) => isDiffPathFavorite(row.path));
}

export function getRenderedDiffRows(rows?: DiffRow[]): DiffRow[] {
  const filtered = getFilteredDiffRows(rows);
  const grouped: Array<{ key: string; rows: DiffRow[] }> = groupDiffRowsBySection(filtered);
  const out: DiffRow[] = [];
  for (const group of grouped) {
    if (state.diffCollapsedSections.has(group.key)) continue;
    const visible = Math.max(40, state.diffSectionVisibleCounts[group.key] || 80);
    out.push(...group.rows.slice(0, visible));
  }
  return out;
}

export function resolveDiffExportMode(): string {
  return ui.diffExportMode?.value || state.diffExportMode || 'all';
}

export function resolveDiffExportContentMode(): string {
  return ui.diffExportContent?.value || state.diffExportContent || 'diffOnly';
}

export function getDiffExportContentLabel(mode: string): string {
  return mode === 'withCompared' ? '比較設定込み（取扱注意）' : '差分行のみ（全設定は未収録）';
}

export function shouldIncludeComparedContent(mode: string): boolean {
  return mode === 'withCompared';
}

export interface DiffExportInfo {
  mode: string;
  label: string;
  rows: DiffRow[];
}

export function resolveDiffExportRows(mode?: string): DiffExportInfo {
  const exportMode = mode || resolveDiffExportMode();
  if (exportMode === 'selected') {
    const rows = getSelectedDiffRows();
    if (!rows.length) throw new Error('選択差分がありません');
    return { mode: exportMode, label: '選択差分', rows };
  }
  if (exportMode === 'visible') {
    const rows = getRenderedDiffRows();
    if (!rows.length) throw new Error('現在表示中の差分がありません');
    return { mode: exportMode, label: '現在表示中', rows };
  }
  if (exportMode === 'favorites') {
    const rows = getFavoriteDiffRows();
    if (!rows.length) throw new Error('お気に入り差分がありません');
    return { mode: exportMode, label: 'お気に入り差分', rows };
  }
  return { mode: 'all', label: '全差分', rows: state.lastDiffRows || [] };
}

export function resolveDiffExportComparedScopes(exportInfo: DiffExportInfo | null | undefined, scopes: readonly string[] | null | undefined): string[] {
  const fallbackScopes: string[] = [...new Set((scopes || []).filter(Boolean) as string[])];
  if ((exportInfo?.mode || 'all') === 'all') return fallbackScopes;
  const rowScopes: string[] = [...new Set((exportInfo?.rows || []).map((row) => row.sectionKey).filter(Boolean) as string[])];
  if (rowScopes.length) return rowScopes;
  const issueScopes: string[] = [...new Set((state.lastFetchIssues || []).map((issue: any) => issue.sectionKey).filter(Boolean) as string[])];
  return issueScopes.length ? issueScopes : fallbackScopes;
}

export interface DiffExportComparedBundles {
  scopes: string[];
  sourceBundle: any;
  targetBundle: any;
}

export function buildDiffExportComparedBundles(sourceBundle: any, targetBundle: any, scopes: readonly string[] | null | undefined): DiffExportComparedBundles {
  const compareScopes: string[] = [...new Set((scopes || []).filter(Boolean) as string[])];
  return {
    scopes: compareScopes,
    sourceBundle: pickBundleSections(sourceBundle, compareScopes),
    targetBundle: pickBundleSections(targetBundle, compareScopes)
  };
}

export interface IgnoreKeySuggestion {
  key: string;
  count: number;
  sectionCount: number;
  topSectionKey: string;
  topSectionLabel: string;
  sampleLeft: string;
  sampleRight: string;
  samplePath: string;
}

interface IgnoreKeySuggestionAcc {
  key: string;
  count: number;
  sections: Map<string, number>;
  sample: { left: string; right: string; path: string } | null;
}

const SECTION_LABEL_BY_KEY: Map<string, string> = new Map(
  SECTION_DEFS.map((s) => [s.key, s.label])
);

function snippet(value: unknown, max = 80): string {
  if (value == null) return '';
  let text: string;
  try {
    text = typeof value === 'string' ? value : JSON.stringify(value);
  } catch {
    text = String(value);
  }
  text = String(text).replace(/\s+/g, ' ').trim();
  if (text.length > max) text = `${text.slice(0, max - 1)}…`;
  return text;
}

export function buildIgnoreKeySuggestions(rows: DiffRow[] | undefined, ignoreKeysText: string): IgnoreKeySuggestion[] {
  const ignoreRules = parseIgnoreRules(ignoreKeysText);
  const counts = new Map<string, IgnoreKeySuggestionAcc>();
  for (const row of getActualDiffRows(rows) as DiffRow[]) {
    if (row.severity !== 'low') continue;
    const leaf = normalizeIgnoreToken(getPathLeafKey(row.path));
    if (!leaf || leaf.length < 2) continue;
    if (ignoreRules.keySet.has(leaf) || DEFAULT_IGNORE_KEYS.has(leaf)) continue;
    if (!/^[a-z0-9_]+$/i.test(leaf)) continue;
    if (leaf === normalizeIgnoreToken(row.sectionKey)) continue;
    const cur: IgnoreKeySuggestionAcc = counts.get(leaf) || {
      key: leaf,
      count: 0,
      sections: new Map<string, number>(),
      sample: null
    };
    cur.count += 1;
    if (row.sectionKey) {
      cur.sections.set(row.sectionKey, (cur.sections.get(row.sectionKey) || 0) + 1);
    }
    if (!cur.sample) {
      cur.sample = {
        left: snippet((row as any).left),
        right: snippet((row as any).right),
        path: String(row.path || '')
      };
    }
    counts.set(leaf, cur);
  }
  return [...counts.values()]
    .filter((item) => item.count >= 2)
    .sort((a, b) => (b.count - a.count) || (b.sections.size - a.sections.size) || a.key.localeCompare(b.key))
    .slice(0, 8)
    .map((item) => {
      let topKey = '';
      let topCount = -1;
      for (const [k, c] of item.sections) {
        if (c > topCount) { topKey = k; topCount = c; }
      }
      return {
        key: item.key,
        count: item.count,
        sectionCount: item.sections.size,
        topSectionKey: topKey,
        topSectionLabel: SECTION_LABEL_BY_KEY.get(topKey) || topKey,
        sampleLeft: item.sample?.left || '',
        sampleRight: item.sample?.right || '',
        samplePath: item.sample?.path || ''
      };
    });
}

/**
 * 与えた無視キー設定を再適用したときに、現在の差分行のうち除外される件数を見積もる。
 * 既に diff 実行時に除外されている行はカウントされないため、設定を更にきつくしたときの
 * "次回比較で減る件数" の概算に使える。
 */
export function previewIgnoreKeyImpact(rows: DiffRow[] | undefined, ignoreKeysText: string): { total: number; wouldRemove: number } {
  const list = getActualDiffRows(rows) as DiffRow[];
  if (!list.length) return { total: 0, wouldRemove: 0 };
  const ignoreRules = parseIgnoreRules(ignoreKeysText);
  let wouldRemove = 0;
  for (const row of list) {
    if (isIgnoredPath(ignoreRules, row.path)) wouldRemove += 1;
  }
  return { total: list.length, wouldRemove };
}
