'use strict';

import { SECTION_DEFS, SYSTEM_FIELD_TYPES } from '../constants.js';

/** 状態は取得結果の意味を保ったまま、空配列と未取得を区別する。 */
export type DesignSnapshotSectionStatus =
  | 'available'
  | 'empty'
  | 'missing'
  | 'fetch-error'
  | 'partial';

export interface DesignSnapshotSection {
  key: string;
  label: string;
  status: DesignSnapshotSectionStatus;
  count: number | null;
  detail: string;
}

export interface DesignSnapshotField {
  path: string;
  code: string;
  label: string;
  type: string;
  tableCode: string | null;
  group: string;
  definition: any;
}

export interface DesignSnapshotCounts {
  topLevel: number | null;
  subtableChildren: number | null;
  total: number | null;
  groups: number | null;
  tables: number | null;
  system: number | null;
}

export interface DesignSnapshot {
  sections: DesignSnapshotSection[];
  fields: DesignSnapshotField[];
  counts: DesignSnapshotCounts;
  complete: boolean;
}

const hasOwn = (value: any, key: string): boolean =>
  value != null && Object.prototype.hasOwnProperty.call(value, key);

const isObject = (value: any): boolean => value !== null && typeof value === 'object';
const isPlainObject = (value: any): boolean => isObject(value) && !Array.isArray(value);

/** RFC 6901 の JSON Pointer token escape。field code の `/` と `~` を順序通りに逃がす。 */
export function escapeJsonPointerToken(value: any): string {
  return String(value ?? '').replace(/~/g, '~0').replace(/\//g, '~1');
}

function valueText(value: any): string {
  if (value === undefined) return 'undefined';
  if (value === null) return 'null';
  if (typeof value === 'string') return value;
  try {
    const out = JSON.stringify(value);
    return out == null ? String(value) : out;
  } catch {
    return String(value);
  }
}

function firstMessage(value: any): string {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (value instanceof Error) return value.message || String(value);
  if (typeof value === 'object') {
    for (const key of ['message', 'error', 'reason', 'detail', 'kind']) {
      if (hasOwn(value, key) && value[key] != null && String(value[key]) !== '') return String(value[key]);
    }
  }
  return valueText(value);
}

function partialDetail(section: any): string {
  const parts: string[] = [];
  if (hasOwn(section, '_partial') && section._partial !== false) {
    const text = firstMessage(section._partial);
    parts.push(text ? `_partial: ${text}` : '_partial が付与されています');
  }
  for (const key of ['_bodyFetchStats', '_configFetchStats']) {
    const stats = section?.[key];
    if (!isObject(stats)) continue;
    const failed = Number(stats.failed || 0);
    const skipped = Number(stats.skipped || 0);
    const omitted = Number(stats.omitted || stats.omittedCount || 0);
    if (failed || skipped || omitted) {
      const detail = [
        failed ? `failed=${failed}` : '',
        skipped ? `skipped=${skipped}` : '',
        omitted ? `omitted=${omitted}` : ''
      ].filter(Boolean).join(', ');
      parts.push(`${key}: ${detail}`);
    }
  }
  return parts.join('; ');
}

function hasPartialMarker(section: any): boolean {
  if (!isObject(section)) return false;
  if (hasOwn(section, '_partial') && section._partial !== false) return true;
  return partialDetail(section) !== '';
}

interface CollectionInfo {
  count: number | null;
  detail: string;
  malformed: boolean;
}

function knownCollection(section: any, key: string, kind: 'array' | 'object'): CollectionInfo {
  if (!hasOwn(section, key)) {
    return { count: null, detail: `${key} コレクションは応答にありません`, malformed: true };
  }
  const value = section[key];
  if (kind === 'array') {
    if (!Array.isArray(value)) {
      return { count: null, detail: `${key} は配列ではありません（値=${valueText(value)}）`, malformed: true };
    }
    return {
      count: value.length,
      detail: value.length ? `${key} の要素数=${value.length}` : `${key} は空です`,
      malformed: false
    };
  }
  if (!isPlainObject(value)) {
    return { count: null, detail: `${key} はオブジェクトではありません（値=${valueText(value)}）`, malformed: true };
  }
  const count = Object.keys(value).length;
  return {
    count,
    detail: count ? `${key} のキー数=${count}` : `${key} は空です`,
    malformed: false
  };
}

function collectionInfo(key: string, section: any): CollectionInfo {
  if (!isPlainObject(section)) {
    return { count: null, detail: 'セクション値がオブジェクトではありません', malformed: true };
  }
  switch (key) {
    case 'fieldSettings': return knownCollection(section, 'properties', 'object');
    case 'layoutSettings': return knownCollection(section, 'layout', 'array');
    case 'viewSettings': return knownCollection(section, 'views', 'object');
    case 'reportSettings': return knownCollection(section, 'reports', 'object');
    case 'processSettings': {
      const states = knownCollection(section, 'states', 'object');
      if (hasOwn(section, 'actions')) {
        const actions = Array.isArray(section.actions)
          ? section.actions.length
          : isPlainObject(section.actions) ? Object.keys(section.actions).length : null;
        if (actions == null) return { ...states, detail: `${states.detail}; actions は不正な型です`, malformed: true };
        return { ...states, detail: `${states.detail}; actions=${actions}` };
      }
      return states;
    }
    case 'pluginSettings': return knownCollection(section, 'plugins', 'array');
    case 'actionSettings': {
      if (!hasOwn(section, 'actions')) return { count: null, detail: 'actions コレクションは応答にありません', malformed: true };
      const actions = section.actions;
      if (Array.isArray(actions)) return { count: actions.length, detail: `actions の要素数=${actions.length}`, malformed: false };
      if (isPlainObject(actions)) {
        const count = Object.keys(actions).length;
        return { count, detail: count ? `actions のキー数=${count}` : 'actions は空です', malformed: false };
      }
      return { count: null, detail: `actions は配列/オブジェクトではありません（値=${valueText(actions)}）`, malformed: true };
    }
    case 'customizeSettings': {
      let total = 0;
      let known = false;
      const malformed: string[] = [];
      for (const area of ['desktop', 'mobile']) {
        if (!hasOwn(section, area)) continue;
        const zone = section[area];
        if (!isPlainObject(zone)) { malformed.push(`${area} が不正`); continue; }
        for (const kind of ['js', 'css']) {
          if (!hasOwn(zone, kind)) continue;
          known = true;
          if (!Array.isArray(zone[kind])) malformed.push(`${area}.${kind} が配列ではない`);
          else total += zone[kind].length;
        }
      }
      if (malformed.length) return { count: null, detail: malformed.join('; '), malformed: true };
      if (!known) return { count: null, detail: 'desktop/mobile の js/css コレクションは応答にありません', malformed: true };
      return { count: total, detail: total ? `JS/CSS リソース数=${total}` : 'JS/CSS コレクションは空です', malformed: false };
    }
    case 'appAcl':
    case 'fieldAcl':
    case 'recordPermissions': return knownCollection(section, 'rights', 'array');
    case 'notifications':
    case 'perRecordNotifications':
    case 'reminderNotifications': return knownCollection(section, 'notifications', 'array');
    case 'categories': return knownCollection(section, 'categories', 'array');
    default: {
      const keys = Object.keys(section).filter((key) => !key.startsWith('_'));
      return {
        count: null,
        detail: keys.length ? '設定オブジェクトは取得済みです（標準コレクションの件数定義なし）' : '設定オブジェクトは空です',
        malformed: false
      };
    }
  }
}

function isFailedSection(section: any): boolean {
  return isObject(section) && hasOwn(section, '_fetchError') && !!section._fetchError;
}

function fieldSettingsIssue(section: any): string {
  if (!isPlainObject(section) || !isPlainObject(section.properties)) return '';
  const problems: string[] = [];
  for (const key of Object.keys(section.properties)) {
    const definition = section.properties[key];
    if (!isPlainObject(definition)) {
      problems.push(`properties.${key} の定義がオブジェクトではありません`);
      continue;
    }
    if (String(definition.type || '').toUpperCase() === 'SUBTABLE'
      && (!hasOwn(definition, 'fields') || !isPlainObject(definition.fields))) {
      problems.push(`properties.${key}.fields が未取得または不正です`);
    }
  }
  return problems.join('; ');
}

function statusForSection(key: string, present: boolean, section: any): DesignSnapshotSection {
  const label = SECTION_DEFS.find((def) => def.key === key)?.label || `追加セクション（${key}）`;
  if (!present) {
    return { key, label, status: 'missing', count: null, detail: 'bundle.sections にキーがありません' };
  }
  if (isFailedSection(section)) {
    return { key, label, status: 'fetch-error', count: null, detail: `取得失敗: ${firstMessage(section._fetchError)}` };
  }
  if (!isObject(section) || Array.isArray(section)) {
    return { key, label, status: 'partial', count: null, detail: `セクション値がオブジェクトではありません（値=${valueText(section)}）` };
  }
  const info = collectionInfo(key, section);
  const fieldIssue = key === 'fieldSettings' ? fieldSettingsIssue(section) : '';
  const partial = hasPartialMarker(section) || info.malformed || !!fieldIssue;
  if (partial) {
    const extra = partialDetail(section);
    const detail = [extra, info.malformed ? info.detail : '', fieldIssue].filter(Boolean).join('; ') || '部分取得または不完全な応答です';
    return { key, label, status: 'partial', count: info.malformed || !!fieldIssue ? null : info.count, detail };
  }
  if (info.count === 0 || (info.count == null && Object.keys(section).filter((field) => !field.startsWith('_')).length === 0)) {
    return { key, label, status: 'empty', count: info.count, detail: info.detail };
  }
  return { key, label, status: 'available', count: info.count, detail: info.detail };
}

function addGroup(groupMap: Map<string, string>, code: any, group: string): void {
  const key = String(code ?? '');
  if (!key || !group) return;
  if (!groupMap.has(key)) groupMap.set(key, group);
}

function walkLayoutRows(rows: any, groupMap: Map<string, string>, currentGroup = ''): void {
  if (!Array.isArray(rows)) return;
  for (const row of rows) {
    if (!isObject(row)) continue;
    if (String(row.type || '').toUpperCase() === 'GROUP') {
      const group = String(row.label ?? row.code ?? currentGroup ?? '');
      walkLayoutRows(row.layout, groupMap, group);
      continue;
    }
    if (String(row.type || '').toUpperCase() === 'SUBTABLE') {
      addGroup(groupMap, row.code, currentGroup);
      for (const field of Array.isArray(row.fields) ? row.fields : []) addGroup(groupMap, field?.code, currentGroup);
      continue;
    }
    const fields = Array.isArray(row.fields) ? row.fields : [];
    for (const field of fields) {
      if (!isObject(field)) continue;
      const type = String(field.type || '').toUpperCase();
      if (type === 'GROUP') {
        const group = String(field.label ?? field.code ?? currentGroup ?? '');
        walkLayoutRows(field.layout, groupMap, group);
      } else if (type === 'SUBTABLE') {
        addGroup(groupMap, field.code, currentGroup);
        for (const child of Array.isArray(field.fields) ? field.fields : []) addGroup(groupMap, child?.code, currentGroup);
      } else {
        addGroup(groupMap, field.code, currentGroup);
      }
    }
  }
}

function fieldCode(definition: any, fallback: string): string {
  return String(definition?.code ?? fallback);
}

function fieldLabel(definition: any, fallback: string): string {
  return String(definition?.label ?? definition?.name ?? fallback);
}

function fieldType(definition: any): string {
  return String(definition?.type ?? 'UNKNOWN');
}

function buildFieldsAndCounts(bundle: any): { fields: DesignSnapshotField[]; counts: DesignSnapshotCounts } {
  const section = bundle?.sections?.fieldSettings;
  const properties = section && isPlainObject(section) && hasOwn(section, 'properties') ? section.properties : undefined;
  if (!isPlainObject(properties)) {
    return {
      fields: [],
      counts: { topLevel: null, subtableChildren: null, total: null, groups: null, tables: null, system: null }
    };
  }
  const groupMap = new Map<string, string>();
  walkLayoutRows(bundle?.sections?.layoutSettings?.layout, groupMap);
  const groupLabels = new Map<string, string>();
  for (const propertyKey of Object.keys(properties)) {
    const definition = properties[propertyKey];
    if (isPlainObject(definition) && String(definition.type || '').toUpperCase() === 'GROUP') {
      const label = fieldLabel(definition, propertyKey);
      groupLabels.set(propertyKey, label);
      groupLabels.set(fieldCode(definition, propertyKey), label);
    }
  }
  const resolveGroup = (value: any): string => {
    const raw = String(value ?? '');
    return groupLabels.get(raw) || raw;
  };
  const fields: DesignSnapshotField[] = [];
  const propertyKeys = Object.keys(properties);
  let subtableChildren = 0;
  let subtableChildrenKnown = true;
  let groups = 0;
  let tables = 0;
  let system = 0;
  for (const propertyKey of propertyKeys) {
    const definition = properties[propertyKey];
    const code = fieldCode(definition, propertyKey);
    const type = fieldType(definition);
    if (type === 'GROUP') groups += 1;
    if (type === 'SUBTABLE') tables += 1;
    if (SYSTEM_FIELD_TYPES.has(type)) system += 1;
    const group = resolveGroup(groupMap.get(propertyKey) || groupMap.get(code) || (type === 'GROUP' ? fieldLabel(definition, propertyKey) : ''));
    fields.push({
      path: `/sections/fieldSettings/properties/${escapeJsonPointerToken(propertyKey)}`,
      code,
      label: fieldLabel(definition, propertyKey),
      type,
      tableCode: null,
      group,
      definition
    });
    if (type !== 'SUBTABLE') continue;
    if (!isPlainObject(definition) || !hasOwn(definition, 'fields') || !isPlainObject(definition.fields)) {
      subtableChildrenKnown = false;
      continue;
    }
    const childFields = definition.fields;
    subtableChildren += Object.keys(childFields).length;
    for (const childKey of Object.keys(childFields)) {
      const child = childFields[childKey];
      const childType = fieldType(child);
      if (SYSTEM_FIELD_TYPES.has(childType)) system += 1;
      fields.push({
        path: `/sections/fieldSettings/properties/${escapeJsonPointerToken(propertyKey)}/fields/${escapeJsonPointerToken(childKey)}`,
        code: fieldCode(child, childKey),
        label: fieldLabel(child, childKey),
        type: childType,
        tableCode: code,
        group: resolveGroup(groupMap.get(childKey) || group),
        definition: child
      });
    }
  }
  const topLevel = propertyKeys.length;
  const childCount = subtableChildrenKnown ? subtableChildren : null;
  return {
    fields,
    counts: {
      topLevel,
      subtableChildren: childCount,
      total: childCount == null ? null : topLevel + childCount,
      groups,
      tables,
      system
    }
  };
}

function sectionKeys(bundle: any): string[] {
  const sections = bundle?.sections;
  const known = SECTION_DEFS.map((def) => def.key);
  const unknown = isPlainObject(sections)
    ? Object.keys(sections).filter((key) => !known.includes(key))
    : [];
  return [...known, ...unknown];
}

/**
 * 設計書出力とExcelが共有する、取得状態を失わない純粋な索引を作る。
 * bundleは読み取り専用で扱い、未取得を空コレクションへ変換しない。
 */
export function buildDesignSnapshot(bundle: any): DesignSnapshot {
  const sections = isPlainObject(bundle?.sections) ? bundle.sections : Object.create(null);
  const sectionRows = sectionKeys(bundle).map((key) => statusForSection(key, hasOwn(sections, key), sections[key]));
  const { fields, counts } = buildFieldsAndCounts(bundle);
  const fieldSettings = sections.fieldSettings;
  if (isFailedSection(fieldSettings) || hasPartialMarker(fieldSettings) || fieldSettingsIssue(fieldSettings)) {
    counts.topLevel = null;
    counts.subtableChildren = null;
    counts.total = null;
    counts.groups = null;
    counts.tables = null;
    counts.system = null;
  }
  return {
    sections: sectionRows,
    fields,
    counts,
    complete: sectionRows.every((row) => row.status === 'available' || row.status === 'empty')
  };
}

