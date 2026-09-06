'use strict';

import { buildRecordsCsvText, sanitizeZipSegment, uniqueZipEntryName } from './record-query.js';

export interface RecordSubtableCsv {
  fieldCode: string;
  fileName: string;
  csvText: string;
  rowCount: number;
}

export interface RecordCsvExport {
  parentCsv: string;
  tables: RecordSubtableCsv[];
  warnings: string[];
}

const DETAIL_ID_COLUMNS = ['$id', '$rowId', '$rowIndex'];

function tableFileName(fieldCode: string, used: Set<string>): string {
  let stem = sanitizeZipSegment(fieldCode, 'table')
    .normalize('NFC')
    .replace(/[\u007f-\u009f\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069]/g, '')
    .replace(/^\.+|[. ]+$/g, '');
  // サロゲートを分断せず、UTF-8/Windows のどちらでも扱える短い名前にする。
  stem = Array.from(stem).slice(0, 50).join('').replace(/[. ]+$/g, '') || 'table';
  if (/^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(stem)) stem = `_${stem}`;
  // 大文字小文字を区別しない展開先でも衝突しないように番号を払い出す。
  const canonicalStem = stem.toLowerCase();
  const unique = uniqueZipEntryName(used, `${canonicalStem}.csv`);
  const suffix = unique.slice(canonicalStem.length, -'.csv'.length);
  return `tables/${stem}${suffix}.csv`;
}

function parentRecordId(record: any, index: number): string {
  const value = record?.$id?.value;
  if ((typeof value !== 'string' && typeof value !== 'number')
    || !String(value).trim() || (typeof value === 'number' && !Number.isFinite(value))) {
    throw new Error(`${index + 1}件目のレコードID（$id）がありません。サブテーブル明細を親レコードへ紐付けられないためCSV出力を中止しました。`);
  }
  return String(value);
}

/** 親CSVと、親ID・行ID・行番号で紐付けるテーブル別CSVを生成する。 */
export function buildRecordCsvExport(records: any[], properties: Record<string, any>): RecordCsvExport {
  const parentColumns = Object.keys(properties || {});
  const tableFields = new Map<string, Record<string, any>>();
  for (const code of parentColumns) {
    if (properties[code]?.type === 'SUBTABLE') tableFields.set(code, properties[code].fields || {});
  }
  // 設定取得後の変更などでschemaに無いテーブルが返っても、取得できた明細は捨てない。
  for (const record of records) {
    for (const [code, field] of Object.entries(record || {}) as Array<[string, any]>) {
      if (field?.type !== 'SUBTABLE' || tableFields.has(code)) continue;
      if (Object.prototype.hasOwnProperty.call(properties || {}, code)) {
        throw new Error(`フィールド ${code} の設定と取得レコードの型が一致しません。フィールド情報とレコードを取得し直してください。`);
      }
      tableFields.set(code, {});
      parentColumns.push(code);
    }
  }
  if (!tableFields.size) return { parentCsv: buildRecordsCsvText(records, parentColumns), tables: [], warnings: [] };

  const recordIds = records.map(parentRecordId);
  const warnings: string[] = [];
  const tables: RecordSubtableCsv[] = [];
  const usedNames = new Set<string>();
  for (const [fieldCode, childProperties] of tableFields) {
    const childColumns = new Set(Object.keys(childProperties));
    const detailRecords: any[] = [];
    records.forEach((record, recordIndex) => {
      const parentId = recordIds[recordIndex];
      const field = Object.prototype.hasOwnProperty.call(record || {}, fieldCode) ? record[fieldCode] : undefined;
      if (field == null) {
        warnings.push(`レコードID ${parentId}: テーブル ${fieldCode} を取得できませんでした（閲覧権限などを確認してください）。空テーブルとは区別して明細を省略しています。`);
        return;
      }
      if (field.type !== 'SUBTABLE' || !Array.isArray(field.value)) {
        throw new Error(`レコードID ${parentId}: テーブル ${fieldCode} の型または行データが不正なためCSV出力を中止しました。`);
      }
      field.value.forEach((row: any, rowIndex: number) => {
        if (!row || typeof row.value !== 'object' || row.value === null || Array.isArray(row.value)) {
          throw new Error(`レコードID ${parentId}: テーブル ${fieldCode} の${rowIndex + 1}行目の値が不正なためCSV出力を中止しました。`);
        }
        Object.keys(row.value).forEach((code) => childColumns.add(code));
        detailRecords.push({
          ...row.value,
          $id: { value: parentId },
          $rowId: { value: row.id ?? '' },
          $rowIndex: { value: rowIndex + 1 }
        });
      });
    });
    const collision = DETAIL_ID_COLUMNS.find((code) => childColumns.has(code));
    if (collision) {
      throw new Error(`テーブル ${fieldCode} の子フィールド ${collision} が明細の識別列と重複するためCSV出力を中止しました。`);
    }
    tables.push({
      fieldCode,
      fileName: tableFileName(fieldCode, usedNames),
      csvText: buildRecordsCsvText(detailRecords, [...DETAIL_ID_COLUMNS, ...childColumns]),
      rowCount: detailRecords.length
    });
  }
  return {
    parentCsv: buildRecordsCsvText(records, ['$id', ...parentColumns.filter((code) => code !== '$id')]),
    tables,
    warnings
  };
}
