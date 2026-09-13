'use strict';

import { csvEscape } from './record-query.js';

const SCALAR = new Set(['SINGLE_LINE_TEXT', 'MULTI_LINE_TEXT', 'LINK', 'NUMBER', 'DATE', 'TIME', 'DATETIME', 'DROP_DOWN', 'RADIO_BUTTON']);
const MULTI = new Set(['CHECK_BOX', 'MULTI_SELECT', 'USER_SELECT', 'ORGANIZATION_SELECT', 'GROUP_SELECT']);
const TEXT = new Set(['SINGLE_LINE_TEXT', 'MULTI_LINE_TEXT', 'LINK']);
const has = (value: object, key: string) => Object.prototype.hasOwnProperty.call(value, key);
export interface QualityField { code: string; label: string; type: string }
export interface QualityOptions { trimText: boolean; ignoreCase: boolean }
export interface QualityFinding { recordId: string; kind: '重複' | '未入力' | '取得不可'; group: number; fields: string[]; values: string[] }
export interface QualityReport {
  fields: QualityField[]; total: number; duplicateGroups: number; duplicateRecords: number;
  emptyRecords: number; unavailableRecords: number; findings: QualityFinding[];
}
export interface QualityAppResult { appId: string; report?: QualityReport; error?: string }

export function readQualityFields(properties: Record<string, any>): QualityField[] {
  if (!properties || typeof properties !== 'object' || Array.isArray(properties)) throw new Error('フィールド設定の応答が不正です');
  return Object.entries(properties).filter(([, field]) => SCALAR.has(field?.type) || MULTI.has(field?.type))
    .map(([code, field]) => ({ code, label: String(field.label || code), type: String(field.type) }));
}

export function selectQualityFields(properties: Record<string, any>, codes: string[]): QualityField[] {
  if (!codes.length || codes.length > 5 || new Set(codes).size !== codes.length) throw new Error('検査するフィールドを1〜5個選んでください');
  const available = new Map(readQualityFields(properties).map(field => [field.code, field]));
  return codes.map(code => {
    const field = available.get(code);
    if (!field) throw new Error(`検査に使えないフィールドです: ${code}（存在・種類を確認してください）`);
    return field;
  });
}

// Keep all significant digits; Number() would merge distinct large values.
function numberKey(value: string): string {
  const match = /^([+-]?)(\d*)(?:\.(\d*))?(?:[eE]([+-]?\d+))?$/.exec(value.trim());
  if (!match || !(match[2] || match[3])) return value;
  let digits = (match[2] + (match[3] || '')).replace(/^0+/, '');
  if (!digits) return '0';
  const trailing = digits.length - digits.replace(/0+$/, '').length;
  digits = digits.slice(0, digits.length - trailing);
  return `${match[1] === '-' ? '-' : ''}${digits}e${BigInt(match[4] || '0') - BigInt((match[3] || '').length) + BigInt(trailing)}`;
}

export function inspectRecordQuality(records: any[], fields: QualityField[], options: QualityOptions): QualityReport {
  const report: QualityReport = { fields, total: records.length, duplicateGroups: 0, duplicateRecords: 0, emptyRecords: 0, unavailableRecords: 0, findings: [] };
  const groups = new Map<string, Array<{ recordId: string; values: string[] }>>();
  for (const record of records) {
    const recordId = String(record?.$id?.value ?? '');
    if (!/^[1-9]\d*$/.test(recordId)) throw new Error('レコードIDを取得できませんでした。検査をやり直してください');
    const empty: string[] = [], unavailable: string[] = [], values: string[] = [], keys: string[] = [];
    for (const field of fields) {
      const cell = record && has(record, field.code) ? record[field.code] : undefined;
      const multi = MULTI.has(field.type), value = cell?.value;
      if (!cell || cell.type !== field.type || !has(cell, 'value') || value === undefined ||
          (multi ? !Array.isArray(value) || value.some(item => ['USER_SELECT', 'ORGANIZATION_SELECT', 'GROUP_SELECT'].includes(field.type) ? !item || typeof item.code !== 'string' : typeof item !== 'string') : value !== null && typeof value !== 'string')) {
        unavailable.push(field.code); values.push('（取得不可）'); keys.push(''); continue;
      }
      values.push(multi ? JSON.stringify(value.map(item => typeof item === 'string' ? item : item.code)) : String(value ?? ''));
      let key = multi ? JSON.stringify([...new Set(value.map(item => typeof item === 'string' ? item : item.code))].sort()) : String(value ?? '');
      if (TEXT.has(field.type)) { if (options.trimText) key = key.trim(); if (options.ignoreCase) key = key.toLowerCase(); }
      if (multi ? !value.length : !key) empty.push(field.code);
      keys.push(field.type === 'NUMBER' && key ? numberKey(key) : key);
    }
    if (empty.length) { report.emptyRecords++; report.findings.push({ recordId, kind: '未入力', group: 0, fields: empty, values }); }
    if (unavailable.length) { report.unavailableRecords++; report.findings.push({ recordId, kind: '取得不可', group: 0, fields: unavailable, values }); }
    if (!empty.length && !unavailable.length) {
      const key = JSON.stringify(keys), group = groups.get(key) || [];
      group.push({ recordId, values }); groups.set(key, group);
    }
  }
  for (const group of groups.values()) if (group.length > 1) {
    report.duplicateGroups++; report.duplicateRecords += group.length;
    for (const item of group) report.findings.push({ ...item, kind: '重複', group: report.duplicateGroups, fields: fields.map(field => field.code) });
  }
  return report;
}

/** Human-readable reports only. Import templates deliberately keep exact field codes. */
export function reportCsv(rows: unknown[][]): string {
  return '\uFEFF' + rows.map(row => row.map(value => {
    const text = String(value ?? '');
    return csvEscape(/^[\s\uFEFF]*[=+\-@]/.test(text) || /^[\t\r\n]/.test(text) ? "'" + text : text);
  }).join(',')).join('\r\n') + '\r\n';
}

export function qualityRecordPath(appId: string, guestId: string, recordId: string): string {
  if (![appId, recordId].every(id => /^[1-9]\d*$/.test(id)) || (guestId && !/^[1-9]\d*$/.test(guestId))) return '';
  return `/k/${guestId ? `guest/${guestId}/` : ''}${appId}/show#record=${recordId}`;
}

export function qualityReportCsv(results: QualityAppResult[], guestId: string, origin: string, options: QualityOptions, query: string): string {
  const codes = [...new Set(results.flatMap(result => result.report?.fields.map(field => field.code) || []))];
  const rows: unknown[][] = [['アプリID', '種別', 'レコードID', 'レコードURL', '重複グループ', '対象フィールド', '説明', ...codes.map(code => `値:${code}`)]];
  for (const result of results) {
    const report = result.report;
    rows.push([result.appId, report ? '集計' : 'エラー', '', '', '', report?.fields.map(field => field.code).join(', '), result.error ||
      `検査 ${report.total}件 / 重複 ${report.duplicateGroups}組・${report.duplicateRecords}件 / 未入力 ${report.emptyRecords}件 / 取得不可 ${report.unavailableRecords}件 / 条件: ${query || '全件'} / 前後空白を無視: ${options.trimText} / 大小文字を無視: ${options.ignoreCase}`]);
    if (!report) continue;
    for (const finding of report.findings) {
      const recordPath = qualityRecordPath(result.appId, guestId, finding.recordId);
      rows.push([result.appId, finding.kind, finding.recordId, recordPath ? origin + recordPath : '', finding.group || '', finding.fields.join(', '), '',
        ...codes.map(code => { const index = report.fields.findIndex(field => field.code === code); return index < 0 ? '' : finding.values[index]; })]);
    }
  }
  return reportCsv(rows);
}
