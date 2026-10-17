'use strict';

const SUPPORTED = new Set(['SINGLE_LINE_TEXT', 'MULTI_LINE_TEXT', 'RICH_TEXT', 'NUMBER', 'LINK',
  'RADIO_BUTTON', 'DROP_DOWN', 'CHECK_BOX', 'MULTI_SELECT', 'DATE', 'TIME', 'DATETIME',
  'USER_SELECT', 'ORGANIZATION_SELECT', 'GROUP_SELECT']);
const enabled = (value: unknown) => value === true || value === 'true';
const has = (object: object, key: string) => Object.prototype.hasOwnProperty.call(object, key);
const writable = (field: any) => SUPPORTED.has(String(field?.type || '')) && !field?.expression;

export function csvImportUnsupportedFields(properties: Record<string, any>): Map<string, string> {
  const targets = new Set(Object.values(properties).flatMap(field => (field?.lookup?.fieldMappings || []).map((mapping: any) => String(mapping.field))));
  return new Map(Object.entries(properties).filter(([code, field]) => !writable(field) || targets.has(code))
    .map(([code, field]) => [code, `${String(field?.type || '不明な種類')}${field?.expression ? '・自動計算' : ''}${targets.has(code) ? '・ルックアップのコピー先' : ''}`]));
}

export function splitCsvListValue(value: unknown): string[] {
  const text = String(value ?? '').trim();
  return text ? text.split(',').map(item => item.trim()).filter(Boolean) : [];
}

export function coerceCsvImportValue(rawValue: unknown, fieldDef: any): unknown {
  const type = String(fieldDef?.type || '');
  if (type === 'CHECK_BOX' || type === 'MULTI_SELECT') return splitCsvListValue(rawValue);
  if (['USER_SELECT', 'ORGANIZATION_SELECT', 'GROUP_SELECT'].includes(type)) return splitCsvListValue(rawValue).map(code => ({ code }));
  if (type === 'NUMBER') {
    const trimmed = String(rawValue ?? '').trim();
    if (fieldDef?.lookup) {
      const m = /^[A-Za-z][A-Za-z0-9_-]*-(\d+)$/.exec(trimmed);
      if (m) return m[1];
    }
    return trimmed;
  }
  return rawValue;
}

export function validateCsvImportHeader(header: string[], properties: Record<string, any>): void {
  if (header.includes('$id')) throw new Error('CSV内にシステムフィールド（$idなど）が含まれています。インポート時は除外してください。');
  if (!header.length || header.some(code => !code)) throw new Error('CSVヘッダに空の列があります。すべての列にフィールドコードを指定してください。');
  const duplicate = header.filter((code, index) => header.indexOf(code) !== index);
  if (duplicate.length) throw new Error(`CSVヘッダが重複しています: ${[...new Set(duplicate)].join(', ')}`);
  const unknown = header.filter(code => !has(properties, code));
  if (unknown.length) throw new Error(`CSVヘッダに存在しないフィールドコードがあります: ${unknown.join(', ')}`);
  const excluded = csvImportUnsupportedFields(properties);
  const unsupported = header.filter(code => excluded.has(code)).map(code => `${code}(${excluded.get(code)})`);
  if (unsupported.length) throw new Error(`CSVインポート非対応のフィールドが含まれています: ${unsupported.join(', ')}`);
}

/** Strict CSV parsing; logical row numbers include the header and retain quoted newlines. */
export function parseCsvText(csv: string): string[][] {
  const rows: string[][] = [];
  let current: string[] = [];
  let cell = '';
  let quoted = false;
  let closed = false;
  const error = (message: string) => new Error(`CSV ${rows.length + 1}行目・${current.length + 1}列目: ${message}`);
  const pushCell = () => { current.push(cell); cell = ''; closed = false; };
  for (let i = 0; i < csv.length; i++) {
    const char = csv[i];
    if (quoted) {
      if (char === '"' && csv[i + 1] === '"') { cell += '"'; i++; }
      else if (char === '"') { quoted = false; closed = true; }
      else cell += char;
      continue;
    }
    if (char === ',') pushCell();
    else if (char === '\r' || char === '\n') {
      if (char === '\r' && csv[i + 1] === '\n') i++;
      pushCell(); rows.push(current); current = [];
    } else if (char === '"' && !cell && !closed) quoted = true;
    else {
      if (char === '"' || closed) throw error('ダブルクォートの位置が不正です');
      cell += char;
    }
  }
  if (quoted) throw error('ダブルクォートが閉じられていません');
  if (cell || current.length || closed) { pushCell(); rows.push(current); }
  return rows;
}

export interface CsvImportIssue { row: number; field: string; message: string }
export interface CsvImportReport {
  count: number;
  columns: Array<{ code: string; label: string; type: string }>;
  issues: CsvImportIssue[];
  issueCount: number;
  sample: Array<{ row: number; values: string[] }>;
}

export function planCsvImport(rows: string[][], properties: Record<string, any>): CsvImportReport & { records: any[]; recordRows: number[] } {
  if (!properties || typeof properties !== 'object' || Array.isArray(properties)) throw new Error('フィールド設定の応答が不正です');
  if (rows.length < 2) throw new Error('ヘッダ行とデータ行が必要です');
  const header = rows[0].map(code => code.trim());
  validateCsvImportHeader(header, properties);
  const columns = header.map(code => ({ code, label: String(properties[code].label || code), type: String(properties[code].type || '') }));
  const records: any[] = [], recordRows: number[] = [], issues: CsvImportIssue[] = [], sample: CsvImportReport['sample'] = [];
  let issueCount = 0, count = 0;
  const issue = (row: number, field: string, message: string) => { issueCount++; if (issues.length < 100) issues.push({ row, field, message }); };
  // Lookup mappings may populate required fields without a CSV column.
  const mapped = new Set(header.flatMap(code => (properties[code]?.lookup?.fieldMappings || []).map((mapping: any) => String(mapping.field))));
  for (const [code, field] of Object.entries(properties)) {
    const defaultValue = field?.defaultValue;
    const hasDefault = enabled(field?.defaultNowValue) || (Array.isArray(defaultValue) ? defaultValue.length > 0 : defaultValue !== undefined && defaultValue !== null && String(defaultValue) !== '');
    if (enabled(field?.required) && writable(field) && !header.includes(code) && !mapped.has(code) && !hasDefault) {
      issue(1, `${field.label || code}［${code}］`, '必須フィールドの列がなく、初期値もありません');
    }
  }
  const seenValues = new Map<string, Map<string, number>>();
  for (let index = 1; index < rows.length; index++) {
    const values = rows[index], row = index + 1;
    // Excel は内容を消した行を ",,," として書き出す。全セルが空の行は空行として扱い、空レコードを作らない。
    if (values.every(value => value === '')) continue;
    count++;
    if (sample.length < 5) sample.push({ row, values: values.slice(0, 6).map(value => value.length > 120 ? value.slice(0, 120) + '…' : value) });
    if (values.length !== header.length) { issue(row, '', `列数が一致しません（ヘッダ ${header.length}列 / データ ${values.length}列）`); continue; }
    const record: Record<string, any> = Object.create(null);
    for (let col = 0; col < header.length; col++) {
      const code = header[col], def = properties[code], value = coerceCsvImportValue(values[col], def);
      const label = `${def.label || code}［${code}］`;
      const empty = Array.isArray(value) ? value.length === 0 : value === '';
      if (enabled(def.required) && empty) issue(row, label, '必須項目が空です');
      if (!empty && def.type === 'NUMBER') {
        const numText = String(value);
        if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(numText)) {
          issue(row, label, '数値の形式が不正です');
        } else {
          const numVal = Number(numText);
          if (def.minValue !== undefined && def.minValue !== null && String(def.minValue) !== '' && numVal < Number(def.minValue)) {
            issue(row, label, `最小値（${def.minValue}）を下回っています`);
          }
          if (def.maxValue !== undefined && def.maxValue !== null && String(def.maxValue) !== '' && numVal > Number(def.maxValue)) {
            issue(row, label, `最大値（${def.maxValue}）を超えています`);
          }
        }
      }
      if (!empty && typeof value === 'string' && ['SINGLE_LINE_TEXT', 'MULTI_LINE_TEXT', 'LINK'].includes(def.type)) {
        const charLen = Array.from(value).length;
        if (def.minLength !== undefined && def.minLength !== null && String(def.minLength) !== '' && charLen < Number(def.minLength)) {
          issue(row, label, `最小文字数（${def.minLength}文字）未満です`);
        }
        if (def.maxLength !== undefined && def.maxLength !== null && String(def.maxLength) !== '' && charLen > Number(def.maxLength)) {
          issue(row, label, `最大文字数（${def.maxLength}文字）を超えています`);
        }
      }
      if (!empty && def.type === 'DATE' && !/^\d{4}-\d{2}-\d{2}$/.test(String(value).trim())) {
        issue(row, label, '日付の形式が不正です（YYYY-MM-DD）');
      }
      if (!empty && def.type === 'TIME' && !/^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(String(value).trim())) {
        issue(row, label, '時刻の形式が不正です（HH:MM）');
      }
      if (!empty && def.type === 'DATETIME' && !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?$/.test(String(value).trim())) {
        issue(row, label, '日時の形式が不正です（ISO 8601形式: YYYY-MM-DDTHH:MM:SSZ）');
      }
      if (['RADIO_BUTTON', 'DROP_DOWN', 'CHECK_BOX', 'MULTI_SELECT'].includes(def.type)) {
        const choices = Array.isArray(value) ? value : empty ? [] : [value];
        for (const choice of choices) if (!has(def.options || {}, String(choice))) issue(row, label, `選択肢にありません: ${choice}`);
      }
      if (enabled(def.unique) && !empty && typeof value === 'string') {
        const seen = seenValues.get(code) || new Map<string, number>();
        if (seen.has(value)) issue(row, label, `CSV内で同じ値が重複しています（${seen.get(value)}行目）`);
        else seen.set(value, row);
        seenValues.set(code, seen);
      }
      record[code] = { value };
    }
    records.push(record);
    recordRows.push(row);
  }
  if (!count) throw new Error('登録するデータがありません');
  return { count, columns, issues, issueCount, sample, records, recordRows };
}

export function formatCsvImportReport(report: CsvImportReport): string {
  const lines = [`${report.count}件 / ${report.columns.length}フィールド / 検出した問題 ${report.issueCount}件`,
    `列: ${report.columns.map(col => `${col.label}［${col.code}］`).join(', ')}`];
  for (const issue of report.issues) lines.push(`${issue.row}行目${issue.field ? `・${issue.field}` : ''}: ${issue.message}`);
  if (report.issueCount > report.issues.length) lines.push(`ほか ${report.issueCount - report.issues.length}件（表示は先頭100件）`);
  return lines.join('\n');
}
