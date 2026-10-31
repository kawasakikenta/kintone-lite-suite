'use strict';

import { DEFAULT_IGNORE_KEYS, SECTION_DEFS } from '../constants.js';
import { state, ui } from '../state.js';
import { getActualDiffRows, parseIgnoreRules, normalizeIgnoreToken, getPathLeafKey } from './engine.js';
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
