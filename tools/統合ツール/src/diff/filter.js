'use strict';

import { DEFAULT_IGNORE_KEYS } from '../constants.js';
import { state, ui } from '../state.js';
import { getActualDiffRows, parseIgnoreRules, normalizeIgnoreToken, getPathLeafKey } from './engine.js';
import { pickBundleSections } from '../api.js';
import { diffRowMatchesKeyword, diffRowMatchesFieldNameKeyword, groupDiffRowsBySection } from './export.js';

export function normalizeDiffFavoritePath(path) {
  return String(path || '').trim();
}

export function isDiffPathFavorite(path) {
  return state.diffFavoritePaths.has(normalizeDiffFavoritePath(path));
}

export function getCurrentDiffFilterState() {
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

export function diffIssueMatchesKeyword(issue, keyword) {
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

export function diffRowMatchesFilters(row, filters) {
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

export function getFilteredDiffRows(rows) {
  const list = rows || state.lastDiffRows || [];
  const filters = getCurrentDiffFilterState();
  const ex = state.diffExcludeSections;
  return list.filter((row) => {
    if (Array.isArray(ex) && ex.length && ex.includes(row.sectionKey)) return false;
    return diffRowMatchesFilters(row, filters);
  });
}

/** セクションタブ用（セクション条件以外のフィルタのみ適用した件数） */
export function getFilteredDiffRowsWithoutSectionFilter(rows) {
  const list = rows || state.lastDiffRows || [];
  const filters = { ...getCurrentDiffFilterState(), section: '' };
  const ex = state.diffExcludeSections;
  return list.filter((row) => {
    if (Array.isArray(ex) && ex.length && ex.includes(row.sectionKey)) return false;
    return diffRowMatchesFilters(row, filters);
  });
}

export function getFilteredFetchIssues(issues) {
  const list = issues || state.lastFetchIssues || [];
  const filters = getCurrentDiffFilterState();
  return list.filter((issue) => {
    if (filters.section && issue.sectionKey !== filters.section) return false;
    if (filters.keyword && !diffIssueMatchesKeyword(issue, filters.keyword)) return false;
    return true;
  });
}

export function getSelectedDiffRows(rows) {
  const selected = state.diffSelectedIds || new Set();
  return (rows || state.lastDiffRows || []).filter((row) => selected.has(row._id));
}

export function getFavoriteDiffRows(rows) {
  return (rows || state.lastDiffRows || []).filter((row) => isDiffPathFavorite(row.path));
}

export function getRenderedDiffRows(rows) {
  const filtered = getFilteredDiffRows(rows);
  const grouped = groupDiffRowsBySection(filtered);
  const out = [];
  for (const group of grouped) {
    if (state.diffCollapsedSections.has(group.key)) continue;
    const visible = Math.max(40, state.diffSectionVisibleCounts[group.key] || 80);
    out.push(...group.rows.slice(0, visible));
  }
  return out;
}

export function resolveDiffExportMode() {
  return ui.diffExportMode?.value || state.diffExportMode || 'all';
}

export function resolveDiffExportContentMode() {
  return ui.diffExportContent?.value || state.diffExportContent || 'diffOnly';
}

export function getDiffExportContentLabel(mode) {
  return mode === 'withCompared' ? '差分 + 比較設定' : '差分のみ';
}

export function shouldIncludeComparedContent(mode) {
  return mode === 'withCompared';
}

export function resolveDiffExportRows(mode) {
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

export function resolveDiffExportComparedScopes(exportInfo, scopes) {
  const fallbackScopes = [...new Set((scopes || []).filter(Boolean))];
  if ((exportInfo?.mode || 'all') === 'all') return fallbackScopes;
  const rowScopes = [...new Set((exportInfo?.rows || []).map((row) => row.sectionKey).filter(Boolean))];
  if (rowScopes.length) return rowScopes;
  const issueScopes = [...new Set((state.lastFetchIssues || []).map((issue) => issue.sectionKey).filter(Boolean))];
  return issueScopes.length ? issueScopes : fallbackScopes;
}

export function buildDiffExportComparedBundles(sourceBundle, targetBundle, scopes) {
  const compareScopes = [...new Set((scopes || []).filter(Boolean))];
  return {
    scopes: compareScopes,
    sourceBundle: pickBundleSections(sourceBundle, compareScopes),
    targetBundle: pickBundleSections(targetBundle, compareScopes)
  };
}

export function buildIgnoreKeySuggestions(rows, ignoreKeysText) {
  const ignoreRules = parseIgnoreRules(ignoreKeysText);
  const counts = new Map();
  for (const row of getActualDiffRows(rows)) {
    if (row.severity !== 'low') continue;
    const leaf = normalizeIgnoreToken(getPathLeafKey(row.path));
    if (!leaf || leaf.length < 2) continue;
    if (ignoreRules.keySet.has(leaf) || DEFAULT_IGNORE_KEYS.has(leaf)) continue;
    if (!/^[a-z0-9_]+$/i.test(leaf)) continue;
    if (leaf === normalizeIgnoreToken(row.sectionKey)) continue;
    const cur = counts.get(leaf) || { key: leaf, count: 0, sections: new Set() };
    cur.count += 1;
    if (row.sectionKey) cur.sections.add(row.sectionKey);
    counts.set(leaf, cur);
  }
  return [...counts.values()]
    .filter((item) => item.count >= 2)
    .sort((a, b) => (b.count - a.count) || (b.sections.size - a.sections.size) || a.key.localeCompare(b.key))
    .slice(0, 8)
    .map((item) => ({ key: item.key, count: item.count, sectionCount: item.sections.size }));
}
