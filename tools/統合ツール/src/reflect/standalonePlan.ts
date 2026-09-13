import { SECTION_DEFS, SYSTEM_FIELD_TYPES } from '../constants.js';
import { deepClone } from '../utils.js';
import { isCompleteReflectSection, stableReflectStringify } from './standalonePreflight.js';

export interface ReflectChange { kind: '追加' | '変更' | '削除' | '保持'; path: string; before: string; after: string }
export interface ReflectOperation { method: 'POST' | 'PUT'; endpoint: string; body: Record<string, any>; label: string }
export interface ReflectSectionPlan {
  sectionKey: string; label: string; status: 'change' | 'same' | 'src-missing' | 'tgt-missing' | 'error'; message: string;
  behavior: string; changes: ReflectChange[]; changeCount: number; removalCount: number; warnings: string[]; blockers: string[];
  operations: ReflectOperation[]; fieldStats?: { add: number; update: number; tgtOnly: number };
  requiredFields?: string[];
}
export interface ReflectPlanOptions { lookupMap?: Record<string, string>; preserveTargetOnly?: boolean }
const namedSections: Record<string, string> = { viewSettings: 'views', reportSettings: 'reports', actionSettings: 'actions' };
const own = (object: object, key: string) => Object.prototype.hasOwnProperty.call(object, key);
const object = (value: any): value is Record<string, any> => !!value && typeof value === 'object' && !Array.isArray(value);
const equal = (a: any, b: any) => stableReflectStringify(a) === stableReflectStringify(b);
const valueText = (value: any) => value === undefined ? '（なし）' : typeof value === 'string' ? value : JSON.stringify(value);
const labels: Record<string, string> = { properties: 'フィールド', layout: '配置', views: '一覧', reports: 'グラフ', actions: 'アクション', rights: 'アクセス権', notifications: '通知', categories: 'カテゴリー', label: '表示名', required: '必須', unique: '重複禁止', options: '選択肢', defaultValue: '初期値', type: '種類', index: '表示順', filterCond: '絞り込み', sort: '並び順', enable: '有効', states: '状態', scope: '適用範囲', fields: 'フィールド', desktop: 'PC', mobile: 'モバイル' };

/** Compare the payload's actual effect, not app-specific IDs or API metadata. */
function diffValues(before: any, after: any, path: string[], output: ReflectChange[]) {
  if (equal(before, after)) return;
  if (object(before) && object(after)) {
    for (const key of new Set([...Object.keys(before), ...Object.keys(after)])) diffValues(own(before, key) ? before[key] : undefined, own(after, key) ? after[key] : undefined, [...path, own(labels, key) ? labels[key] : key], output);
  } else if (Array.isArray(before) && Array.isArray(after)) {
    // Align lists by content to avoid presenting a reorder as removal of every item.
    const remaining = [...after];
    for (const [index, value] of before.entries()) {
      const found = remaining.findIndex(item => equal(item, value));
      if (found >= 0) remaining.splice(found, 1);
      else output.push({ kind: '削除', path: [...path, `${index + 1}件目`].join(' / '), before: valueText(value), after: '（なし）' });
    }
    for (const value of remaining) output.push({ kind: '追加', path: path.join(' / '), before: '（なし）', after: valueText(value) });
    if (!remaining.length && before.length === after.length && before.every(value => after.some(item => equal(item, value)))) {
      output.push({ kind: '変更', path: path.join(' / ') + ' / 順序', before: valueText(before), after: valueText(after) });
    }
  } else output.push({ kind: before === undefined ? '追加' : after === undefined ? '削除' : '変更', path: path.join(' / '), before: valueText(before), after: valueText(after) });
}

function fieldDefinitions(section: any): Record<string, any> {
  const properties = section?.properties;
  if (!object(properties)) throw new Error('フィールド設定の properties を取得できません。');
  return properties;
}

function mergeFields(source: Record<string, any>, target: Record<string, any>, lookupMap: Record<string, string>, path: string[], plan: ReflectSectionPlan): Record<string, any> {
  const after = Object.assign(Object.create(null), deepClone(target));
  for (const [code, def] of Object.entries(source)) {
    if (!object(def) || !def.type) { plan.blockers.push(`${[...path, code].join(' / ')}: フィールドの種類がありません。`); continue; }
    if (SYSTEM_FIELD_TYPES.has(def.type)) continue;
    const current = own(target, code) ? target[code] : undefined;
    if (current && current.type !== def.type) { plan.blockers.push(`${[...path, code].join(' / ')}: 種類が異なります（${current.type} → ${def.type}）。既存項目の種類はこの反映では変更できません。`); continue; }
    // Missing optional PUT properties mean unchanged, including in older exported JSON.
    const next = { code, ...deepClone(current || {}), ...deepClone(def) };
    if (!current && next.label === undefined) next.label = code;
    if (next.code && next.code !== code) plan.blockers.push(`${code}: フィールドコードの変更を含みます。フィールド追加ツールで確認してください。`);
    if (next.lookup?.relatedApp?.app && lookupMap[String(next.lookup.relatedApp.app)]) {
      next.lookup.relatedApp.app = lookupMap[String(next.lookup.relatedApp.app)];
      delete next.lookup.relatedApp.code;
    }
    if (def.type === 'SUBTABLE') {
      if (!object(def.fields)) throw new Error(`${code}: テーブル内のフィールド定義がありません。`);
      next.fields = mergeFields(def.fields, current?.fields || {}, lookupMap, [...path, code], plan);
    }
    after[code] = next;
  }
  for (const [code, def] of Object.entries(target)) if (!own(source, code) && !SYSTEM_FIELD_TYPES.has(def?.type)) {
    plan.changes.push({ kind: '保持', path: [...path, code].join(' / '), before: valueText(def), after: '反映先の設定を保持' });
  }
  return after;
}

function namedPayload(section: any, property: string): Record<string, any> {
  if (!object(section?.[property])) throw new Error(`${property} の設定を取得できません。`);
  return Object.fromEntries(Object.entries(section[property]).map(([key, raw]) => {
    if (!object(raw)) throw new Error(`${key}: 設定の形式が不正です。`);
    const value = deepClone(raw); delete value.id;
    return [key, value];
  }));
}

/** Keep target-only fields in the layout; the layout API requires all existing fields. */
function mergeLayout(source: any[], target: any[], plan: ReflectSectionPlan): any[] {
  const result = deepClone(source), locations = new Map<string, any>();
  const collect = (nodes: any[]) => { for (const node of nodes) {
    if (!object(node)) throw new Error('レイアウトに不正な項目があります。');
    if (node.code) { if (locations.has(node.code)) throw new Error(`配置が重複しています: ${node.code}`); locations.set(node.code, node); }
    if (Array.isArray(node.fields)) collect(node.fields);
    if (Array.isArray(node.layout)) collect(node.layout);
  } };
  collect(result);
  const retain = (field: any) => {
    if (!field.code || locations.has(field.code)) return false;
    locations.set(field.code, field);
    plan.changes.push({ kind: '保持', path: `配置 / ${field.code}`, before: valueText(field), after: '既存の配置を末尾に保持' });
    return true;
  };
  const appendMissing = (nodes: any[], destination: any[]) => {
    for (const node of deepClone(nodes)) {
      if (node.type === 'ROW') { node.fields = (node.fields || []).filter(retain); if (node.fields.length) destination.push(node); }
      else if (node.type === 'GROUP') {
        const existing = locations.get(node.code);
        if (existing) appendMissing(node.layout || [], existing.layout || (existing.layout = []));
        else { retain(node); const children = node.layout || []; node.layout = []; appendMissing(children, node.layout); destination.push(node); }
      } else if (node.type === 'SUBTABLE') {
        const existing = locations.get(node.code);
        const fields = (node.fields || []).filter(retain);
        if (existing) existing.fields.push(...fields);
        else { retain(node); node.fields = fields; destination.push(node); }
      }
    }
  };
  appendMissing(target, result);
  return result;
}

export function reflectInspectionScopes(scopes: string[]): string[] {
  return [...new Set([...scopes, ...(scopes.some(key => ['layoutSettings', 'viewSettings'].includes(key)) ? ['fieldSettings'] : [])])];
}

export function reflectSelectionBlockers(entries: ReflectSectionPlan[], scopes: string[], sourceFields: string[], targetFields: string[]): string[] {
  const selected = entries.filter(entry => scopes.includes(entry.sectionKey));
  const available = new Set([...targetFields, ...(scopes.includes('fieldSettings') && !selected.find(entry => entry.sectionKey === 'fieldSettings')?.blockers.length ? sourceFields : [])]);
  const issues = selected.flatMap(entry => entry.blockers.map(message => `${entry.label}: ${message}`));
  for (const entry of selected) for (const code of entry.requiredFields || []) if (!available.has(code)) issues.push(`${entry.label}: 参照するフィールド「${code}」が反映先にありません。フィールド設定も反映対象に含めるか、この項目を除外してください。`);
  return [...new Set(issues)];
}

export function buildReflectSectionPlan(key: string, source: any, target: any, options: ReflectPlanOptions = {}): ReflectSectionPlan {
  const def = SECTION_DEFS.find(item => item.key === key);
  const plan: ReflectSectionPlan = { sectionKey: key, label: def?.label || key, status: 'same', message: '', behavior: '全置換', changes: [], changeCount: 0, removalCount: 0, warnings: [], blockers: [], operations: [] };
  const fail = (side: 'src' | 'tgt', section: any) => {
    plan.status = side === 'src' ? 'src-missing' : 'tgt-missing';
    plan.message = `${side === 'src' ? '反映元' : '反映先'}を完全に取得できません: ${section?._fetchError || section?._partial?.message || '設定がありません'}`;
    plan.blockers.push(plan.message); return plan;
  };
  if (!isCompleteReflectSection(source)) return fail('src', source);
  if (!isCompleteReflectSection(target)) return fail('tgt', target);
  if (!def?.put || !def.putBuilder) { plan.status = 'error'; plan.blockers.push('この項目は反映に対応していません。'); return plan; }
  try {
    let before: any, after: any;
    if (key === 'fieldSettings') {
      plan.behavior = '追加・更新（反映先だけの項目は保持）';
      const sourceProps = fieldDefinitions(source), targetProps = fieldDefinitions(target);
      const positions = (props: Record<string, any>) => {
        const map = new Map<string, string>();
        const add = (code: string, parent: string) => { if (map.has(code)) throw new Error(`フィールドコードが重複しています: ${code}`); map.set(code, parent); };
        for (const [code, field] of Object.entries(props)) { add(code, 'フォーム'); if (field?.type === 'SUBTABLE') for (const child of Object.keys(field.fields || {})) add(child, code); }
        return map;
      };
      const sourcePositions = positions(sourceProps), targetPositions = positions(targetProps);
      for (const [code, parent] of sourcePositions) if (targetPositions.has(code) && parent !== targetPositions.get(code)) plan.blockers.push(`${code}: フォームとテーブル間、またはテーブル間の移動には対応していません。`);
      const merged = mergeFields(sourceProps, targetProps, options.lookupMap || {}, ['フィールド'], plan);
      const adds: Record<string, any> = Object.create(null), updates: Record<string, any> = Object.create(null);
      for (const [code, value] of Object.entries(merged)) {
        if (!own(sourceProps, code) || SYSTEM_FIELD_TYPES.has(value?.type)) continue;
        if (!own(targetProps, code)) adds[code] = value;
        else if (value.type === 'SUBTABLE') {
          const current = targetProps[code], addedFields = Object.fromEntries(Object.entries(value.fields).filter(([child]) => !own(current.fields || {}, child)));
          if (Object.keys(addedFields).length) adds[code] = { type: 'SUBTABLE', code, fields: addedFields };
          const updatedFields = Object.fromEntries(Object.entries(value.fields).filter(([child, childDef]) => own(current.fields || {}, child) && !equal(childDef, current.fields[child])));
          const { fields: _nextFields, ...nextTable } = value, { fields: _currentFields, ...currentTable } = current;
          if (Object.keys(updatedFields).length || !equal(nextTable, currentTable)) updates[code] = { ...nextTable, fields: updatedFields };
        } else if (!equal(value, targetProps[code])) updates[code] = value;
      }
      const fieldCounts = { add: Object.keys(adds).length, update: Object.keys(updates).length, tgtOnly: Object.keys(targetProps).filter(code => !own(sourceProps, code) && !SYSTEM_FIELD_TYPES.has(targetProps[code]?.type)).length };
      plan.fieldStats = fieldCounts;
      if (fieldCounts.add) plan.operations.push({ method: 'POST', endpoint: def.endpoint, body: { properties: adds }, label: 'フィールド追加' });
      if (fieldCounts.update) plan.operations.push({ method: 'PUT', endpoint: def.endpoint, body: { properties: updates }, label: 'フィールド更新' });
      before = { properties: targetProps }; after = { properties: merged };
    } else if (namedSections[key]) {
      const property = namedSections[key];
      const from = namedPayload(source, property), to = namedPayload(target, property);
      for (const name of Object.keys(from)) if (own(to, name)) from[name] = { ...to[name], ...from[name] };
      const preserve = options.preserveTargetOnly !== false;
      const combined = preserve ? { ...to, ...from } : from;
      // New names must not collide with retained target indices. Make their final order explicit.
      const ordered = [...Object.keys(from).sort((a, b) => Number(from[a].index || 0) - Number(from[b].index || 0)), ...(preserve ? Object.keys(to).filter(name => !own(from, name)).sort((a, b) => Number(to[a].index || 0) - Number(to[b].index || 0)) : [])];
      for (const [index, name] of ordered.entries()) combined[name] = { ...combined[name], index: String(index) };
      if (key === 'viewSettings') for (const [name, view] of Object.entries(combined)) {
        if (!['LIST', 'CALENDAR', 'CUSTOM'].includes(view.type)) throw new Error(`${name}: 一覧の種類を取得できません。`);
        if (view.type === 'LIST' && (!Array.isArray(view.fields) || view.fields.some(code => typeof code !== 'string'))) throw new Error(`${name}: 一覧のフィールド定義が不完全です。`);
        if (view.type === 'CUSTOM' && typeof view.html !== 'string') throw new Error(`${name}: カスタマイズ一覧のHTMLを取得できません。`);
      }
      // Normalize only the numeric representation of an index; keep its meaningful position.
      for (const item of Object.values(to)) if (item.index !== undefined) item.index = String(item.index);
      before = { [property]: to }; after = { [property]: combined };
      plan.behavior = preserve ? '追加・更新（反映先だけの設定は保持）' : '全置換（反映元にない設定を削除）';
      if (preserve) for (const name of Object.keys(to).filter(name => !own(from, name))) plan.changes.push({ kind: '保持', path: `${labels[property]} / ${name}`, before: valueText(to[name]), after: '内容を保持（表示順は反映元の後）' });
      if (key === 'viewSettings') plan.requiredFields = [...new Set(Object.values(combined).flatMap(view => view.type === 'LIST' ? (view.fields || []) : view.type === 'CALENDAR' ? [view.date, view.title].filter(Boolean) : []).filter(code => !['$id', '$revision'].includes(code)))];
    } else if (key === 'pluginSettings') {
      if (!Array.isArray(source.plugins) || !Array.isArray(target.plugins)) throw new Error('プラグイン一覧の形式が不正です。');
      const existing = new Set(target.plugins.map(item => item.id));
      const additions = source.plugins.filter(item => !existing.has(item.id));
      if (additions.some(item => typeof item.id !== 'string' || !item.id)) throw new Error('プラグインIDがありません。');
      plan.behavior = '未追加のプラグインを追加（設定値は対象外）';
      plan.warnings.push('プラグイン本体はkintoneシステム管理に導入済みである必要があります。プラグイン固有の設定はコピーしません。');
      before = { plugins: target.plugins.map(item => item.id) }; after = { plugins: [...before.plugins, ...additions.map(item => item.id)] };
      if (additions.length) plan.operations.push({ method: 'POST', endpoint: def.endpoint, body: { ids: additions.map(item => item.id) }, label: 'プラグイン追加' });
    } else {
      for (const section of [source, target]) {
        const arrayKey = ['appAcl', 'fieldAcl', 'recordPermissions'].includes(key) ? 'rights' : ['notifications', 'perRecordNotifications', 'reminderNotifications'].includes(key) ? 'notifications' : '';
        if (arrayKey && !Array.isArray(section[arrayKey])) throw new Error(`${arrayKey} の設定がありません。空の設定で上書きしないため、反映を停止します。`);
        if (key === 'reminderNotifications' && (typeof section.timezone !== 'string' || !section.timezone)) throw new Error('リマインダー通知のタイムゾーンを取得できません。');
        if (key === 'categories' && (typeof section.enabled !== 'boolean' || !object(section.categories))) throw new Error('カテゴリーの enabled / categories を取得できません。');
        if (key === 'processSettings' && (typeof section.enable !== 'boolean' || (section.enable && (!object(section.states) || !Array.isArray(section.actions))))) throw new Error('プロセス管理の enable / states / actions を取得できません。');
        if (key === 'customizeSettings') {
          if (!['ALL', 'ADMIN', 'NONE'].includes(section.scope)) throw new Error('JS/CSSの適用範囲を取得できません。');
          for (const platform of ['desktop', 'mobile']) for (const kind of ['js', 'css']) {
            const list = section[platform]?.[kind];
            if (!Array.isArray(list) || list.some(item => !item || (item.type === 'URL' ? typeof item.url !== 'string' || !item.url : item.type === 'FILE' ? typeof item.file?.fileKey !== 'string' || !item.file.fileKey : true))) throw new Error(`${platform}/${kind}: JS/CSS一覧が不完全です。`);
          }
        }
      }
      before = def.putBuilder(target); after = def.putBuilder(source);
      if (key === 'categories') { before.enabled = target.enabled; after.enabled = source.enabled; }
      if (key === 'notifications') {
        // Older exported JSON may omit this optional property: omission means unchanged.
        if (typeof target.notifyToCommenter === 'boolean') before.notifyToCommenter = after.notifyToCommenter = target.notifyToCommenter;
        if (typeof source.notifyToCommenter === 'boolean') after.notifyToCommenter = source.notifyToCommenter;
      }
      if (key === 'customizeSettings') {
        plan.warnings.push('JSONバックアップにはJS/CSSのファイル本体を含みません。ファイルの取り外しや差し替えを行う場合は、元のファイルも別途保管してください。');
        if (source.scope !== undefined) after.scope = source.scope;
        if (target.scope !== undefined) before.scope = target.scope;
        const currentKeys = new Set(['desktop', 'mobile'].flatMap(platform => ['js', 'css'].flatMap(kind => (target[platform]?.[kind] || []).map(item => item.file?.fileKey).filter(Boolean))));
        for (const platform of ['desktop', 'mobile']) for (const kind of ['js', 'css']) for (const item of source[platform]?.[kind] || []) {
          if (item.type === 'FILE' && !currentKeys.has(item.file?.fileKey)) plan.blockers.push(`${platform}/${kind}: 「${item.file?.name || 'アップロードファイル'}」は反映先に存在しません。JS/CSS設定画面でファイルをアップロードしてから比較してください。`);
        }
      }
      if (key === 'layoutSettings') {
        if (!Array.isArray(source.layout) || !Array.isArray(target.layout)) throw new Error('レイアウトの形式が不正です。');
        after.layout = mergeLayout(source.layout, target.layout, plan);
        plan.behavior = '配置を更新（反映先だけのフィールド配置は保持）';
        const codes: string[] = [];
        const walk = (nodes: any[]) => { for (const node of nodes) { if (node.code) codes.push(String(node.code)); if (Array.isArray(node.fields)) walk(node.fields); if (Array.isArray(node.layout)) walk(node.layout); } };
        walk(after.layout); plan.requiredFields = [...new Set(codes)];
      }
    }
    diffValues(before, after, [], plan.changes);
    plan.changeCount = plan.changes.filter(change => change.kind !== '保持').length;
    plan.removalCount = plan.changes.filter(change => change.kind === '削除').length;
    if (key !== 'fieldSettings' && key !== 'pluginSettings' && plan.changeCount) plan.operations.push({ method: 'PUT', endpoint: def.endpoint, body: after, label: def.label });
    if (plan.blockers.length) plan.status = 'error';
    else plan.status = plan.operations.length ? 'change' : 'same';
    plan.message = plan.blockers.length ? plan.blockers.join('\n') : plan.operations.length ? `変更 ${plan.changeCount}件 / 削除 ${plan.removalCount}件 / ${plan.behavior}` : `書き込み不要${plan.changes.some(change => change.kind === '保持') ? '（反映先だけの設定は保持）' : '（一致）'}`;
  } catch (error: any) { plan.status = 'error'; plan.blockers.push(error.message || String(error)); plan.message = plan.blockers.join('\n'); }
  return plan;
}

export function listReflectFieldCodes(bundle: any, writableOnly = false): string[] {
  const props = bundle?.sections?.fieldSettings?.properties;
  if (!object(props)) return [];
  return Object.entries(props).filter(([, def]) => !writableOnly || !SYSTEM_FIELD_TYPES.has(def?.type)).flatMap(([code, def]) => [code, ...Object.keys(def?.type === 'SUBTABLE' ? def.fields || {} : {})]);
}
