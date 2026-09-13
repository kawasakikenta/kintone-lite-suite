'use strict';

// API response contracts: apps/view/get-views and apps/form/get-form-fields.
// IDs remain strings; labels are for display, codes are used for requests.
export interface RecordViewChoice {
  id: string;
  name: string;
  type: string;
  index: number;
  filter: string;
  sort: string;
  query: string;
}

export interface AttachmentFieldChoice {
  fileFieldCode: string;
  fileLabel: string;
  tableFieldCode: string;
  tableLabel: string;
}

function isObject(value: any): value is Record<string, any> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function readRecordViews(response: any): RecordViewChoice[] {
  if (!isObject(response?.views)) throw new Error('一覧設定の応答が不正です。再取得してください');
  return Object.entries(response.views).flatMap(([name, view]) => {
    if (!isObject(view) || !['LIST', 'CALENDAR', 'CUSTOM'].includes(view.type)) return [];
    const filter = String(view.filterCond || '').trim();
    const sort = String(view.sort || '').trim();
    return [{ id: String(view.id ?? name), name: String(view.name || name), type: view.type,
      index: Number(view.index) || 0, filter, sort, query: [filter, sort ? `order by ${sort}` : ''].filter(Boolean).join(' ') }];
  }).sort((a, b) => a.index - b.index);
}

export function readAttachmentFields(response: any): AttachmentFieldChoice[] {
  if (!isObject(response?.properties)) throw new Error('フィールド設定の応答が不正です。再取得してください');
  const choices: AttachmentFieldChoice[] = [];
  for (const [key, field] of Object.entries(response.properties)) {
    if (!isObject(field)) continue;
    const code = String(field.code || key);
    const label = String(field.label || code);
    if (field.type === 'FILE') choices.push({ fileFieldCode: code, fileLabel: label, tableFieldCode: '', tableLabel: '' });
    if (field.type !== 'SUBTABLE' || !isObject(field.fields)) continue;
    for (const [childKey, child] of Object.entries(field.fields)) {
      if (!isObject(child) || child.type !== 'FILE') continue;
      const childCode = String(child.code || childKey);
      choices.push({ fileFieldCode: childCode, fileLabel: String(child.label || childCode), tableFieldCode: code, tableLabel: label });
    }
  }
  return choices;
}
