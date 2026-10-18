import {
  AGGREGATION_TYPE_JP, ALIGN_JP, APP_THEME_JP, CHART_MODE_JP, CHART_TYPE_JP, CUSTOMIZE_SCOPE_JP, DAY_OF_WEEK_JP,
  ENTITY_TYPE_JP, FIELD_TYPE_JP, GROUP_PER_JP, LINK_PROTOCOL_JP, NUMBER_FORMAT_JP, PERIODIC_REPORT_EVERY_JP,
  PROCESS_ASSIGNEE_TYPE_JP, REPORT_SORT_BY_JP, REPORT_SORT_ORDER_JP, RESOURCE_TYPE_JP, ROUNDING_MODE_JP,
  TITLE_SELECTION_JP, UNIT_POSITION_JP, VIEW_BUILTIN_TYPE_JP, VIEW_DEVICE_JP, VIEW_TYPE_JP,
  describePeriodicReport, describeReminderOffset
} from '../kintone-enums.js';
import { VALUE_LABELS, labelOfBool, labelOfProp } from '../diff/label-dict.js';
import { APP_SETTINGS_LABELS } from './sections.js';

/**
 * 反映計画の「項目単位の変更の要約」を作る。DOM に依存しない純粋関数。
 * before = 反映先の現在の PUT 形、after = 反映後の PUT 形（buildReflectSectionPlan の diffValues に渡すものと同じ）。
 */
export interface ReflectItemSummary { kind: '追加' | '変更' | '削除' | '保持'; name: string; details: string[] }
export interface ReflectSummaryContext { fieldLabels?: Record<string, string>; retained?: string[] }

type Dict = Record<string, string>;
type Labels = Record<string, string> | undefined;
type Kind = ReflectItemSummary['kind'];
type Push = (kind: Kind, name: string, details: string[]) => void;
type Special = (before: any, after: any, label: string) => string[];

const MAX_VALUE = 80;
const MAX_DETAILS = 8;

const own = (target: object, key: string) => Object.prototype.hasOwnProperty.call(target, key);
const isObj = (value: any): value is Record<string, any> => !!value && typeof value === 'object' && !Array.isArray(value);
const dictGet = (dict: Dict | undefined, key: string): string | undefined => dict && own(dict, key) ? dict[key] : undefined;
const get = (target: any, key: string): any => isObj(target) && own(target, key) ? target[key] : undefined;
const list = (value: any): any[] => Array.isArray(value) ? value : [];

function stable(value: any): string {
  const sort = (input: any): any => Array.isArray(input) ? input.map(sort) : isObj(input)
    ? Object.fromEntries(Object.keys(input).sort().map(key => [key, sort(input[key])])) : input;
  return JSON.stringify(sort(value)) ?? 'undefined';
}
const same = (a: any, b: any) => stable(a) === stable(b);

function clip(text: string, max = MAX_VALUE): string {
  if (text.length <= max) return text;
  const chars = Array.from(text);
  return chars.length <= max ? text : chars.slice(0, max - 1).join('') + '…';
}

// ---------------------------------------------------------------------------
// 辞書
// ---------------------------------------------------------------------------

const ENUM_BY_KEY: Record<string, Dict> = {
  theme: APP_THEME_JP, roundingMode: ROUNDING_MODE_JP, selectionMode: TITLE_SELECTION_JP, scope: CUSTOMIZE_SCOPE_JP,
  chartType: CHART_TYPE_JP, chartMode: CHART_MODE_JP, per: GROUP_PER_JP, by: REPORT_SORT_BY_JP, order: REPORT_SORT_ORDER_JP,
  every: PERIODIC_REPORT_EVERY_JP, dayOfWeek: DAY_OF_WEEK_JP, builtinType: VIEW_BUILTIN_TYPE_JP, device: VIEW_DEVICE_JP,
  paginationStyle: VALUE_LABELS.paginationStyle, accessibility: VALUE_LABELS.accessibility, recordTrigger: VALUE_LABELS.recordTrigger,
  format: NUMBER_FORMAT_JP, align: ALIGN_JP, unitPosition: UNIT_POSITION_JP, protocol: LINK_PROTOCOL_JP
};

const FIELD_ATTR_LABELS: Dict = {
  label: '表示名', required: '必須', unique: '重複禁止', defaultValue: '初期値', maxLength: '最大文字数', minLength: '最小文字数',
  maxValue: '最大値', minValue: '最小値', digit: '桁区切り', displayScale: '小数点以下の表示桁数', unit: '単位', unitPosition: '単位記号の位置',
  format: '表示形式', expression: '計算式', hideExpression: '計算式を非表示', noLabel: 'ラベルを非表示', align: '選択肢の並び',
  protocol: '入力値の種類', rows: '表示行数', defaultNowValue: '初期値を現在日時にする', options: '選択肢', type: '種類', code: 'フィールドコード',
  thumbnailSize: 'サムネイルの大きさ', openGroup: 'グループを開いた状態にする', entities: '選択できる対象'
};
const VIEW_ATTR_LABELS: Dict = {
  fields: '表示フィールド', sort: '並び順', filterCond: '絞り込み条件', type: '種類', index: '表示順', date: '日付フィールド',
  title: 'タイトルフィールド', html: 'HTML', pager: 'ページャー', name: '名前'
};
const REPORT_ATTR_LABELS: Dict = {
  chartType: 'グラフの種類', chartMode: 'モード', groups: '分類', aggregations: '集計', sorts: '並び順', filterCond: '絞り込み条件',
  periodicReport: '定期レポート', index: '表示順', name: '名前'
};
const ACTION_ATTR_LABELS: Dict = {
  filterCond: '実行条件', entities: '実行できる対象', destApp: 'コピー先アプリ', mappings: 'フィールド対応', index: '表示順', name: '名前'
};
const PROCESS_ACTION_LABELS: Dict = { filterCond: '条件', executableUser: '実行者', type: '種類', name: 'アクション名' };
const LAYOUT_ATTR_LABELS: Dict = { label: 'ラベル', openGroup: '初期状態で開く', width: '幅', height: '高さ', innerHeight: '入力欄の高さ' };
const APP_SETTING_LABELS: Dict = APP_SETTINGS_LABELS;
const LAYOUT_PLAIN_LABELS: Dict = { LABEL: 'ラベル', SPACER: 'スペース', HR: '罫線' };

const labelFor = (key: string, over?: Dict): string => dictGet(over, key) ?? labelOfProp(key);

// ---------------------------------------------------------------------------
// 値・名前の整形
// ---------------------------------------------------------------------------

function fmt(value: any, key = '', typeDict?: Dict): string {
  if (value === undefined || value === null) return '（なし）';
  if (typeof value === 'boolean') {
    if (key === 'includeSubs') return value ? 'はい' : 'いいえ';
    if (/^enable[A-Z]/.test(key)) return value ? '有効' : '無効';
    return labelOfBool(value, key);
  }
  if (typeof value === 'number') return String(value);
  if (typeof value === 'string') {
    if (value === '') return '（空）';
    const translated = dictGet(key === 'type' ? typeDict : ENUM_BY_KEY[own(ENUM_BY_KEY, key) ? key : ''], value);
    return clip(translated ?? value);
  }
  if (Array.isArray(value)) return clip(value.map(item => isObj(item) || Array.isArray(item) ? stable(item) : String(item)).join('、'));
  return clip(stable(value));
}

function labelOnly(code: string, hint: any, labels: Labels): string {
  if (typeof hint === 'string' && hint) return hint;
  return dictGet(labels, code) || code;
}

/** 「表示名（コード）」。表示名が無い、またはコードと同じならコードだけ。 */
function fieldName(code: string, labels: Labels, hint?: any): string {
  const label = labelOnly(code, hint, labels);
  return label && label !== code ? `${label}（${code}）` : code;
}

function entityOf(element: any): any { return isObj(element) && isObj(element.entity) ? element.entity : element; }

function entityText(entity: any, labels: Labels): string {
  if (!isObj(entity)) return typeof entity === 'string' ? entity : '（不明）';
  const type = String(entity.type || ''), code = String(entity.code ?? entity.login ?? '');
  const name = String(entity.name || '');
  if (type === 'FUNCTION') {
    const known = ({ 'LOGINUSER()': 'ログインユーザー', 'PRIMARY_ORGANIZATION()': '優先する組織' } as Dict)[code.trim().toUpperCase()];
    return known || `関数「${code}」`;
  }
  if (type === 'ALL' || type === 'EVERYONE') return '全員';
  if (type === 'LOGIN_USER') return 'ログインユーザー';
  if (type === 'CREATOR' || type === 'MODIFIER') return code ? `${dictGet(ENTITY_TYPE_JP, type)}「${code}」` : dictGet(ENTITY_TYPE_JP, type)!;
  if (type === 'FIELD_ENTITY' || type === 'CUSTOM_FIELD') return `フィールド値「${fieldName(code, labels)}」`;
  const typeText = type === 'DEPARTMENT' || type === 'DEPT' ? '組織' : dictGet(ENTITY_TYPE_JP, type) ?? (type || '対象');
  const display = name && code && name !== code ? `${name}（${code}）` : name || code || '（未設定）';
  return `${typeText}「${display}」`;
}

const entityKey = (element: any): string => {
  const entity = entityOf(element);
  return isObj(entity) ? `${entity.type ?? ''}\u0000${entity.code ?? ''}` : stable(entity);
};

const ordinal = (value: any): string => {
  if (value === undefined || value === null || value === '') return '（なし）';
  const number = Number(value);
  return Number.isFinite(number) ? `${number + 1}番目` : fmt(value);
};

const listText = (items: string[]): string => clip(items.join('、'));

// ---------------------------------------------------------------------------
// 要素ごとの短い表現
// ---------------------------------------------------------------------------

function elementText(key: string, element: any, labels: Labels, section: string): string {
  if (!isObj(element)) {
    const text = String(element);
    return key === 'fields' && section === 'viewSettings' ? fieldName(text, labels) : clip(text);
  }
  if (key === 'groups') return `${fieldName(String(element.code ?? ''), labels)}${element.per ? ` ${dictGet(GROUP_PER_JP, String(element.per)) ?? element.per}単位` : ''}`;
  if (key === 'aggregations') return `${dictGet(AGGREGATION_TYPE_JP, String(element.type)) ?? element.type ?? ''}${element.code ? ` ${fieldName(String(element.code), labels)}` : ''}`.trim();
  if (key === 'sorts') return `${dictGet(REPORT_SORT_BY_JP, String(element.by)) ?? element.by ?? ''} ${dictGet(REPORT_SORT_ORDER_JP, String(element.order)) ?? element.order ?? ''}`.trim();
  if (key === 'mappings') {
    const from = element.srcType === 'RECORD_URL' ? 'レコードのURL' : element.srcField ?? element.sourceField ?? '';
    const to = element.destType === 'RECORD_URL' ? 'レコードのURL' : element.destField ?? '';
    return `${from} → ${to}`;
  }
  if (key === 'fieldMappings') return `${element.field ?? ''} ← ${element.relatedField ?? ''}`;
  if (isObj(element.entity) || (element.type && own(element, 'code') && !element.name)) return entityText(entityOf(element), labels);
  return clip(String(element.name ?? element.code ?? element.id ?? stable(element)));
}

/** 配列の追加・削除・並び順だけの変更を 1 行にまとめる。 */
function arrayLine(key: string, label: string, before: any[], after: any[], labels: Labels, section: string): string {
  const pool = new Map<string, number>();
  for (const element of before) { const k = stable(element); pool.set(k, (pool.get(k) || 0) + 1); }
  const added: any[] = [];
  for (const element of after) {
    const k = stable(element), count = pool.get(k) || 0;
    if (count) pool.set(k, count - 1); else added.push(element);
  }
  const left = new Map(pool);
  const removed = before.filter(element => { const k = stable(element), count = left.get(k) || 0; if (count) { left.set(k, count - 1); return true; } return false; });
  const text = (items: any[]) => listText(items.map(element => elementText(key, element, labels, section)));
  if (!added.length && !removed.length) return `${label}: 並び順のみ変更`;
  const parts: string[] = [];
  if (added.length) parts.push(`追加 ${text(added)}`);
  if (removed.length) parts.push(`削除 ${text(removed)}`);
  return `${label}: ${parts.join(' / ')}`;
}

function optionNames(options: any): string[] {
  if (Array.isArray(options)) return options.map(item => isObj(item) ? String(item.label ?? item.name ?? '') : String(item));
  if (!isObj(options)) return [];
  const keys = Object.keys(options);
  const position = (key: string) => { const n = Number(get(options[key], 'index')); return Number.isFinite(n) ? n : Number.MAX_SAFE_INTEGER; };
  return keys.map((key, i) => ({ key, i })).sort((a, b) => position(a.key) - position(b.key) || a.i - b.i).map(item => item.key);
}

function optionLines(before: any, after: any, label: string): string[] {
  const b = optionNames(before), a = optionNames(after);
  const added = a.filter(name => !b.includes(name)), removed = b.filter(name => !a.includes(name));
  if (!added.length && !removed.length) return [`${label}: 並び順のみ変更`];
  const parts: string[] = [];
  if (added.length) parts.push(`追加 ${listText(added)}`);
  if (removed.length) parts.push(`削除 ${listText(removed)}`);
  return [`${label}: ${parts.join(' / ')}`];
}

/** 対象（entity）の一覧の追加・削除・権限の変化。 */
function entityListLines(label: string, beforeList: any[], afterList: any[], labels: Labels): string[] {
  const permissionText = (element: any): string => {
    if (!isObj(element)) return '';
    const on: string[] = [];
    for (const [key, value] of Object.entries(element)) {
      if (key === 'entity' || key === 'type' || key === 'code' || key === 'name' || key === 'includeSubs') continue;
      if (value === true) on.push(labelOfProp(key));
      else if (key === 'accessibility' && typeof value === 'string') on.push(fmt(value, key));
    }
    if (element.includeSubs === true) on.push('配下を含む');
    return on.length ? `（${on.join('・')}）` : '';
  };
  const queues = new Map<string, any[]>();
  afterList.forEach(element => { const k = entityKey(element); const queue = queues.get(k); if (queue) queue.push(element); else queues.set(k, [element]); });
  const removed: string[] = [], changed: string[] = [];
  const matched = new Set<any>();
  for (const element of beforeList) {
    const peer = queues.get(entityKey(element))?.shift();
    if (peer === undefined) { removed.push(entityText(entityOf(element), labels)); continue; }
    matched.add(peer);
    if (same(element, peer)) continue;
    const keys = new Set([...Object.keys(isObj(element) ? element : {}), ...Object.keys(isObj(peer) ? peer : {})]);
    const diffs = [...keys].filter(key => !['entity', 'type', 'code', 'name'].includes(key) && !same(get(element, key), get(peer, key)))
      .map(key => `${labelOfProp(key)} ${fmt(get(element, key), key)} → ${fmt(get(peer, key), key)}`);
    if (diffs.length) changed.push(`${label} ${entityText(entityOf(element), labels)}: ${diffs.join('、')}`);
  }
  const added = afterList.filter(element => !matched.has(element)).map(element => `${entityText(entityOf(element), labels)}${permissionText(element)}`);
  const lines: string[] = [];
  const parts: string[] = [];
  if (added.length) parts.push(`追加 ${listText(added)}`);
  if (removed.length) parts.push(`削除 ${listText(removed)}`);
  if (parts.length) lines.push(`${label}: ${parts.join(' / ')}`);
  return [...lines, ...changed];
}

// ---------------------------------------------------------------------------
// 属性の差分（共通）
// ---------------------------------------------------------------------------

interface AttrOptions { ignore?: ReadonlySet<string>; over?: Dict; typeDict?: Dict; section?: string; prefix?: string[]; labels: Labels; special?: Record<string, Special> }

function attrLines(before: any, after: any, options: AttrOptions): string[] {
  const b = isObj(before) ? before : {}, a = isObj(after) ? after : {};
  const prefix = options.prefix || [];
  const lines: string[] = [];
  for (const key of new Set([...Object.keys(b), ...Object.keys(a)])) {
    if (options.ignore?.has(key)) continue;
    const bv = get(b, key), av = get(a, key);
    if (same(bv, av)) continue;
    const name = labelFor(key, options.over), label = [...prefix, name].join(' / ');
    const special = options.special && own(options.special, key) ? options.special[key] : undefined;
    if (special) { lines.push(...special(bv, av, label)); continue; }
    if (key === 'periodicReport') {
      const x = describePeriodicReport(bv), y = describePeriodicReport(av);
      if (x !== null || y !== null) { lines.push(`${label}: ${x ?? '（なし）'} → ${y ?? '（なし）'}`); continue; }
    }
    if ((Array.isArray(bv) || bv === undefined) && (Array.isArray(av) || av === undefined) && (bv !== undefined || av !== undefined)) {
      lines.push(arrayLine(key, label, list(bv), list(av), options.labels, options.section || ''));
      continue;
    }
    if (isObj(bv) && isObj(av)) {
      lines.push(...attrLines(bv, av, { labels: options.labels, section: options.section, prefix: [...prefix, name], over: options.over }));
      continue;
    }
    const x = fmt(bv, key, options.typeDict), y = fmt(av, key, options.typeDict);
    if (x !== y) lines.push(`${label}: ${x} → ${y}`);
  }
  return lines;
}

const entitiesSpecial = (labels: Labels): Special => (before, after, label) => entityListLines(label, list(before), list(after), labels);

// ---------------------------------------------------------------------------
// セクション別
// ---------------------------------------------------------------------------

function fieldBrief(definition: any): string[] {
  if (!isObj(definition)) return [];
  const out: string[] = [];
  if (definition.type) out.push(`種類: ${dictGet(FIELD_TYPE_JP, String(definition.type)) ?? definition.type}`);
  if (definition.type === 'SUBTABLE' && isObj(definition.fields)) out.push(`テーブル内フィールド ${Object.keys(definition.fields).length}件`);
  else if (definition.required === true) out.push('必須');
  else if (definition.unique === true) out.push('重複禁止');
  else if (isObj(definition.options) && Object.keys(definition.options).length) out.push(`選択肢 ${Object.keys(definition.options).length}件`);
  return out.slice(0, 2);
}

function fieldItems(before: any, after: any, labels: Labels, push: Push) {
  const bp = get(before, 'properties'), ap = get(after, 'properties');
  if (!isObj(bp) || !isObj(ap)) throw new Error('フィールド設定の形式が不正です。');
  const walk = (b: Record<string, any>, a: Record<string, any>, parentLabel: string | null) => {
    for (const code of [...Object.keys(a), ...Object.keys(b).filter(key => !own(a, key))]) {
      const bd = get(b, code), ad = get(a, code), definition = ad ?? bd;
      const label = labelOnly(code, get(definition, 'label'), labels);
      const withCode = label !== code ? `${label}（${code}）` : code;
      const name = parentLabel ? `${parentLabel} / ${withCode}` : withCode;
      if (bd === undefined || ad === undefined) { push(ad === undefined ? '削除' : '追加', name, fieldBrief(definition)); continue; }
      const ignore = new Set(['fields']);
      const bc = get(bd, 'code'), ac = get(ad, 'code');
      if (bc === undefined || ac === undefined || bc === ac) ignore.add('code');
      const lines = attrLines(bd, ad, { ignore, over: FIELD_ATTR_LABELS, typeDict: FIELD_TYPE_JP, labels, section: 'fieldSettings', special: { options: (x, y, l) => optionLines(x, y, l) } });
      if (lines.length) push('変更', name, lines);
      if (isObj(bd.fields) || isObj(ad.fields)) walk(isObj(bd.fields) ? bd.fields : {}, isObj(ad.fields) ? ad.fields : {}, label);
    }
  };
  walk(bp, ap, null);
}

interface Placed { code: string; where: string; node: any }

function scanLayout(layout: any, labels: Labels) {
  const placed = new Map<string, Placed>();
  const plain = new Map<string, any[]>();
  const place = (node: any, where: string) => { const code = String(node.code); if (!placed.has(code)) placed.set(code, { code, where, node }); };
  const addPlain = (node: any) => { const type = String(node?.type ?? '不明'); const items = plain.get(type); if (items) items.push(node); else plain.set(type, [node]); };
  const walk = (nodes: any[], container: string) => {
    nodes.forEach((node, i) => {
      if (!isObj(node)) return;
      const prefix = container ? `${container}内の` : '';
      if (node.type === 'ROW') {
        list(node.fields).forEach((child, j) => { if (isObj(child) && typeof child.code === 'string' && child.code) place(child, `${prefix}${i + 1}行目の${j + 1}番目`); else if (isObj(child)) addPlain(child); });
      } else if (node.type === 'GROUP' && typeof node.code === 'string') {
        place(node, `${prefix}${i + 1}行目`);
        walk(list(node.layout), `グループ「${fieldName(node.code, labels, node.label)}」`);
      } else if (node.type === 'SUBTABLE' && typeof node.code === 'string') {
        place(node, `${prefix}${i + 1}行目`);
        const table = `テーブル「${fieldName(node.code, labels)}」`;
        list(node.fields).forEach((child, j) => { if (isObj(child) && typeof child.code === 'string' && child.code) place(child, `${table}の${j + 1}番目`); else if (isObj(child)) addPlain(child); });
      }
    });
  };
  walk(list(layout), '');
  return { placed, plain };
}

function layoutItems(before: any, after: any, labels: Labels, push: Push) {
  const bl = get(before, 'layout'), al = get(after, 'layout');
  if (!Array.isArray(bl) || !Array.isArray(al)) throw new Error('レイアウトの形式が不正です。');
  const b = scanLayout(bl, labels), a = scanLayout(al, labels);
  let count = 0;
  const emit: Push = (kind, name, details) => { count += 1; push(kind, name, details); };
  for (const [code, now] of a.placed) {
    const nameOf = (placed: Placed) => fieldName(code, labels, placed.node.type === 'GROUP' ? placed.node.label : undefined);
    const prev = b.placed.get(code);
    if (!prev) { emit('追加', nameOf(now), [`配置: ${now.where}`]); continue; }
    const lines: string[] = [];
    if (prev.where !== now.where) lines.push(`位置: ${prev.where} → ${now.where}`);
    const px = (value: any) => value === undefined ? '（自動）' : /^\d+$/.test(String(value)) ? `${value}px` : String(value);
    const sizes = new Set([...Object.keys(isObj(prev.node.size) ? prev.node.size : {}), ...Object.keys(isObj(now.node.size) ? now.node.size : {})]);
    for (const key of sizes) {
      const x = get(prev.node.size, key), y = get(now.node.size, key);
      if (String(x ?? '') !== String(y ?? '')) lines.push(`${labelFor(key, LAYOUT_ATTR_LABELS)}: ${px(x)} → ${px(y)}`);
    }
    lines.push(...attrLines(prev.node, now.node, { ignore: new Set(['code', 'type', 'size', 'layout', 'fields', 'elementId']), over: LAYOUT_ATTR_LABELS, labels }));
    if (lines.length) emit('変更', nameOf(now), lines);
  }
  for (const [code, prev] of b.placed) if (!a.placed.has(code)) emit('削除', fieldName(code, labels, prev.node.type === 'GROUP' ? prev.node.label : undefined), [`配置: ${prev.where} → なし`]);
  // ラベル・スペース・罫線は識別子が無いので個数でまとめる。
  const plainLines: string[] = [];
  for (const type of new Set([...b.plain.keys(), ...a.plain.keys()])) {
    const x = b.plain.get(type) || [], y = a.plain.get(type) || [], name = dictGet(LAYOUT_PLAIN_LABELS, type) ?? type;
    if (x.length !== y.length) { plainLines.push(`${name}: ${x.length}個 → ${y.length}個`); continue; }
    if (type !== 'LABEL') continue;
    const texts = (items: any[]) => items.map(item => String(item.label ?? ''));
    if (!same(texts(x), texts(y))) plainLines.push(arrayLine('label', `${name}の内容`, texts(x), texts(y), labels, 'layoutSettings'));
  }
  if (plainLines.length) emit('変更', 'ラベル・スペース・罫線', plainLines);
  if (!count && !same(bl, al)) emit('変更', 'レイアウト', ['行や要素の並びを変更']);
}

function namedItems(sectionKey: string, before: any, after: any, labels: Labels, push: Push) {
  const property = sectionKey === 'viewSettings' ? 'views' : sectionKey === 'reportSettings' ? 'reports' : 'actions';
  const bm = get(before, property), am = get(after, property);
  if (!isObj(bm) || !isObj(am)) throw new Error('設定の形式が不正です。');
  const over = sectionKey === 'viewSettings' ? VIEW_ATTR_LABELS : sectionKey === 'reportSettings' ? REPORT_ATTR_LABELS : ACTION_ATTR_LABELS;
  const special: Record<string, Special> = {
    index: (x, y, label) => [`${label}: ${ordinal(x)} → ${ordinal(y)}`], entities: entitiesSpecial(labels),
    destApp: (x, y, label) => [...(same(get(x, 'app'), get(y, 'app')) ? [] : [`${label}: ${fmt(get(x, 'app'))} → ${fmt(get(y, 'app'))}`]),
      ...(same(get(x, 'code'), get(y, 'code')) ? [] : [`${label}のアプリコード: ${fmt(get(x, 'code'))} → ${fmt(get(y, 'code'))}`])]
  };
  const brief = (value: any): string[] => {
    if (!isObj(value)) return [];
    if (sectionKey === 'viewSettings') {
      const out = [`種類: ${dictGet(VIEW_TYPE_JP, String(value.type)) ?? value.type ?? '（不明）'}`];
      if (Array.isArray(value.fields)) out.push(`表示フィールド ${value.fields.length}件`);
      return out;
    }
    if (sectionKey === 'reportSettings') return [`種類: ${dictGet(CHART_TYPE_JP, String(value.chartType)) ?? value.chartType ?? '（不明）'}`];
    const out: string[] = [];
    if (value.destApp?.app !== undefined) out.push(`コピー先アプリ: ${value.destApp.app}`);
    if (Array.isArray(value.mappings)) out.push(`フィールド対応 ${value.mappings.length}件`);
    return out;
  };
  for (const name of [...Object.keys(am), ...Object.keys(bm).filter(key => !own(am, key))]) {
    const bv = get(bm, name), av = get(am, name);
    if (bv === undefined || av === undefined) { push(av === undefined ? '削除' : '追加', name, brief(av ?? bv)); continue; }
    const ignore = new Set(['id']);
    if (get(bv, 'name') === undefined || get(av, 'name') === undefined || get(bv, 'name') === get(av, 'name')) ignore.add('name');
    const lines = attrLines(bv, av, { ignore, over, typeDict: VIEW_TYPE_JP, labels, section: sectionKey, special });
    if (lines.length) push('変更', name, lines);
  }
}

/** キーで対応付けられる配列（ルール）の追加・削除・変更・並び順を項目にする。キー無しの要素があれば件数の要約にする。 */
function ruleItems(beforeRules: any[], afterRules: any[], options: {
  key: (rule: any) => string | null; name: (rule: any) => string; brief: (rule: any) => string[]; diff: (before: any, after: any) => string[]; orderName?: string; sectionName: string;
}, push: Push) {
  const keysOf = (rules: any[]) => rules.map(rule => isObj(rule) ? options.key(rule) : null);
  const bk = keysOf(beforeRules), ak = keysOf(afterRules);
  if (bk.some(key => key === null) || ak.some(key => key === null)) {
    if (same(beforeRules, afterRules)) return;
    push('変更', options.sectionName, [beforeRules.length === afterRules.length ? `ルールの内容を変更（${afterRules.length}件）` : `ルール: ${beforeRules.length}件 → ${afterRules.length}件`]);
    return;
  }
  const queues = new Map<string, number[]>();
  ak.forEach((key, i) => { const queue = queues.get(key!); if (queue) queue.push(i); else queues.set(key!, [i]); });
  const matched = new Set<number>(), pairs: Array<[number, number]> = [];
  beforeRules.forEach((rule, i) => {
    const j = queues.get(bk[i]!)?.shift();
    if (j === undefined) { push('削除', options.name(rule), options.brief(rule)); return; }
    matched.add(j); pairs.push([i, j]);
    const lines = options.diff(rule, afterRules[j]);
    if (lines.length) push('変更', options.name(afterRules[j]), lines);
  });
  afterRules.forEach((rule, j) => { if (!matched.has(j)) push('追加', options.name(rule), options.brief(rule)); });
  const order = pairs.map(([, j]) => j);
  if (order.some((j, i) => i > 0 && j < order[i - 1])) push('変更', options.orderName || `${options.sectionName}の並び`, ['並び順のみ変更']);
}

function permissionBrief(rule: any, extra: string[] = []): string[] {
  if (!isObj(rule)) return [];
  const on = Object.keys(rule).filter(key => key !== 'includeSubs' && rule[key] === true).map(key => labelOfProp(key));
  if (rule.includeSubs === true) on.push('配下を含む');
  return [on.length ? `許可: ${listText(on)}` : '許可: なし', ...extra];
}

function processItems(before: any, after: any, labels: Labels, push: Push) {
  if (!isObj(before) || !isObj(after)) throw new Error('プロセス管理の形式が不正です。');
  if (before.enable !== after.enable) push('変更', 'プロセス管理', [`有効化: ${fmt(before.enable, 'enable')} → ${fmt(after.enable, 'enable')}`]);
  const assignee: Special = (x, y) => {
    const lines: string[] = [];
    if (get(x, 'type') !== get(y, 'type')) lines.push(`作業者の選択方式: ${fmt(get(x, 'type'), 'type', PROCESS_ASSIGNEE_TYPE_JP)} → ${fmt(get(y, 'type'), 'type', PROCESS_ASSIGNEE_TYPE_JP)}`);
    return [...lines, ...entityListLines('作業者', list(get(x, 'entities')), list(get(y, 'entities')), labels)];
  };
  const bs = isObj(before.states) ? before.states : {}, as = isObj(after.states) ? after.states : {};
  const stateBrief = (state: any): string[] => {
    const out = ['種類: 状態'];
    const entities = list(get(get(state, 'assignee'), 'entities'));
    if (entities.length) out.push(`作業者: ${listText(entities.map(entity => entityText(entityOf(entity), labels)))}`);
    return out;
  };
  for (const name of [...Object.keys(as), ...Object.keys(bs).filter(key => !own(as, key))]) {
    const bv = get(bs, name), av = get(as, name);
    if (bv === undefined || av === undefined) { push(av === undefined ? '削除' : '追加', name, stateBrief(av ?? bv)); continue; }
    const lines = attrLines(bv, av, { ignore: new Set(['name']), over: { index: '表示順', assignee: '作業者' }, labels, section: 'processSettings', special: { index: (x, y, label) => [`${label}: ${ordinal(x)} → ${ordinal(y)}`], assignee } });
    if (lines.length) push('変更', name, lines);
  }
  const actionKey = (action: any) => `${action.name ?? ''}\u0000${action.from ?? ''}\u0000${action.to ?? ''}`;
  const actionName = (action: any) => `${action.name ?? '（名称なし）'}（${action.from ?? '?'} → ${action.to ?? '?'}）`;
  const actionSpecial: Record<string, Special> = { executableUser: (x, y) => entityListLines('実行者', list(get(x, 'entities')), list(get(y, 'entities')), labels) };
  ruleItems(list(before.actions), list(after.actions), {
    key: actionKey, name: actionName, sectionName: 'アクション', orderName: 'アクションの並び',
    brief: action => ['種類: アクション', ...(action.filterCond ? [`条件: ${fmt(action.filterCond)}`] : [])],
    diff: (x, y) => attrLines(x, y, { ignore: new Set(['name', 'from', 'to']), over: PROCESS_ACTION_LABELS, labels, section: 'processSettings', special: actionSpecial })
  }, push);
}

function aclItems(sectionKey: string, before: any, after: any, labels: Labels, push: Push) {
  const br = get(before, 'rights'), ar = get(after, 'rights');
  if (!Array.isArray(br) || !Array.isArray(ar)) throw new Error('権限の形式が不正です。');
  const special = { entities: entitiesSpecial(labels) };
  if (sectionKey === 'appAcl') {
    ruleItems(br, ar, {
      sectionName: 'アプリ権限', key: rule => entityKey(rule), name: rule => entityText(entityOf(rule), labels), brief: rule => permissionBrief(rule),
      diff: (x, y) => attrLines(x, y, { ignore: new Set(['entity']), labels, section: sectionKey })
    }, push);
  } else if (sectionKey === 'recordPermissions') {
    ruleItems(br, ar, {
      sectionName: 'レコード権限', key: rule => String(rule.filterCond ?? ''), name: rule => rule.filterCond ? `条件「${clip(String(rule.filterCond), 60)}」` : '条件なし（すべてのレコード）',
      brief: rule => rule.entities?.length ? entityListLines('対象', [], list(rule.entities), labels) : ['対象なし'],
      diff: (x, y) => attrLines(x, y, { ignore: new Set(['filterCond']), labels, section: sectionKey, special, over: { entities: '対象' } })
    }, push);
  } else {
    ruleItems(br, ar, {
      sectionName: 'フィールド権限', key: rule => typeof rule.code === 'string' && rule.code ? rule.code : null, name: rule => fieldName(String(rule.code), labels),
      brief: rule => rule.entities?.length ? entityListLines('対象', [], list(rule.entities), labels) : ['対象なし'],
      diff: (x, y) => attrLines(x, y, { ignore: new Set(['code']), labels, section: sectionKey, special, over: { entities: '対象' } })
    }, push);
  }
  extraItems(before, after, new Set(['rights']), push);
}

function timingText(timing: any, labels: Labels): string {
  if (!isObj(timing)) return fmt(timing);
  const parts: string[] = [];
  if (timing.code) parts.push(fieldName(String(timing.code), labels));
  if (timing.daysLater !== undefined && timing.daysLater !== '') parts.push(describeReminderOffset('days', timing.daysLater) ?? `${timing.daysLater}日`);
  if (timing.hoursLater !== undefined && timing.hoursLater !== '') parts.push(describeReminderOffset('hours', timing.hoursLater) ?? `${timing.hoursLater}時間`);
  if (timing.time) parts.push(String(timing.time));
  return parts.join(' ') || '（なし）';
}

/** rights / notifications 以外のトップレベル値（timezone, notifyToCommenter, enabled など）を項目にする。 */
function extraItems(before: any, after: any, skip: ReadonlySet<string>, push: Push) {
  const b = isObj(before) ? before : {}, a = isObj(after) ? after : {};
  for (const key of new Set([...Object.keys(b), ...Object.keys(a)])) {
    if (skip.has(key)) continue;
    const bv = get(b, key), av = get(a, key);
    if (same(bv, av)) continue;
    push('変更', labelOfProp(key), [`${fmt(bv, key)} → ${fmt(av, key)}`]);
  }
}

function notificationItems(sectionKey: string, before: any, after: any, labels: Labels, push: Push) {
  const bn = get(before, 'notifications'), an = get(after, 'notifications');
  if (!Array.isArray(bn) || !Array.isArray(an)) throw new Error('通知の形式が不正です。');
  const targets: Special = entitiesSpecial(labels);
  if (sectionKey === 'notifications') {
    ruleItems(bn, an, {
      sectionName: '通知', key: rule => entityKey(rule), name: rule => entityText(entityOf(rule), labels),
      brief: rule => { const on = Object.keys(rule).filter(key => key !== 'entity' && key !== 'includeSubs' && rule[key] === true).map(key => labelOfProp(key)); return [on.length ? `通知する: ${listText(on)}` : '通知する条件なし']; },
      diff: (x, y) => attrLines(x, y, { ignore: new Set(['entity']), labels, section: sectionKey })
    }, push);
  } else {
    const reminder = sectionKey === 'reminderNotifications';
    ruleItems(bn, an, {
      sectionName: reminder ? 'リマインダー通知' : 'レコード条件通知',
      key: rule => typeof rule.title === 'string' && rule.title ? rule.title : null,
      name: rule => String(rule.title),
      brief: rule => [
        ...(reminder ? [`通知するタイミング: ${timingText(rule.timing, labels)}`] : []),
        ...(rule.filterCond ? [`絞り込み条件: ${fmt(rule.filterCond)}`] : []),
        ...(list(rule.targets).length ? entityListLines('通知先', [], list(rule.targets), labels) : ['通知先なし'])
      ],
      diff: (x, y) => attrLines(x, y, {
        ignore: new Set(['title']), labels, section: sectionKey, over: { targets: '通知先', filterCond: '絞り込み条件', timing: '通知するタイミング' },
        special: { targets, timing: (p, q, label) => [`${label}: ${timingText(p, labels)} → ${timingText(q, labels)}`] }
      })
    }, push);
  }
  extraItems(before, after, new Set(['notifications']), push);
}

function categoryPaths(categories: any): Map<string, any> {
  const out = new Map<string, any>();
  const walk = (node: any, trail: string[]) => {
    const children = (value: any): Array<[string, any]> => Array.isArray(value)
      ? value.map((child, i) => [String(isObj(child) ? child.name ?? child.label ?? child.code ?? i + 1 : child), child] as [string, any])
      : isObj(value) ? Object.entries(value) : [];
    for (const [name, child] of children(node)) {
      const path = [...trail, name];
      out.set(path.join(' / '), child);
      if (isObj(child)) for (const key of ['children', 'subCategories', 'categories']) if (own(child, key)) walk(child[key], path);
    }
  };
  walk(categories, []);
  return out;
}

function categoryItems(before: any, after: any, labels: Labels, push: Push) {
  if (!isObj(before) || !isObj(after)) throw new Error('カテゴリーの形式が不正です。');
  if (before.enabled !== after.enabled) push('変更', 'カテゴリー機能', [`有効状態: ${fmt(before.enabled, 'enabled')} → ${fmt(after.enabled, 'enabled')}`]);
  const b = categoryPaths(before.categories), a = categoryPaths(after.categories);
  const strip = (node: any) => isObj(node) ? Object.fromEntries(Object.entries(node).filter(([key]) => !['children', 'subCategories', 'categories'].includes(key))) : node;
  for (const [path, node] of a) {
    if (!b.has(path)) { push('追加', path, ['カテゴリーを追加']); continue; }
    const lines = attrLines(strip(b.get(path)), strip(node), { over: { index: '表示順', name: '名前', label: '名前' }, labels, special: { index: (x, y, label) => [`${label}: ${ordinal(x)} → ${ordinal(y)}`] } });
    if (lines.length) push('変更', path, lines);
  }
  for (const path of b.keys()) if (!a.has(path)) push('削除', path, ['カテゴリーを削除']);
  extraItems(before, after, new Set(['enabled', 'categories']), push);
}

function pluginItems(before: any, after: any, push: Push) {
  const idOf = (item: any) => typeof item === 'string' ? item : String(get(item, 'id') ?? '');
  const bp = list(get(before, 'plugins')).map(idOf), ap = list(get(after, 'plugins')).map(idOf);
  for (const id of ap) if (!bp.includes(id)) push('追加', id, ['プラグインを追加（固有の設定はコピーしません）']);
  for (const id of bp) if (!ap.includes(id)) push('削除', id, ['プラグインを外す']);
}

function customizeItems(before: any, after: any, push: Push) {
  if (!isObj(before) || !isObj(after)) throw new Error('JS/CSS設定の形式が不正です。');
  if (before.scope !== after.scope) push('変更', '適用範囲', [`適用範囲: ${fmt(before.scope, 'scope')} → ${fmt(after.scope, 'scope')}`]);
  const fileOf = (item: any) => get(item, 'file');
  const nameOf = (item: any): string => {
    if (get(item, 'type') === 'URL') return clip(String(item.url ?? ''));
    const file = fileOf(item);
    return clip(String(get(file, 'name') || get(file, 'fileKey') || '（名称なし）'));
  };
  const idOf = (item: any): string => {
    if (get(item, 'type') === 'URL') return `U|${item.url}`;
    const file = fileOf(item);
    if (get(file, 'contentHash')) return `H|${file.contentHash}|${get(file, 'name') ?? ''}`;
    return get(file, 'fileKey') ? `K|${file.fileKey}` : `N|${get(file, 'name') ?? ''}`;
  };
  const kindText = (item: any) => dictGet(RESOURCE_TYPE_JP, String(get(item, 'type'))) ?? String(get(item, 'type') ?? '不明');
  for (const [platform, platformText] of [['desktop', 'PC'], ['mobile', 'モバイル']]) for (const [kind, kindLabel] of [['js', 'JS'], ['css', 'CSS']]) {
    const bl = list(get(get(before, platform), kind)), al = list(get(get(after, platform), kind));
    const prefix = `${platformText} ${kindLabel}`;
    const queues = new Map<string, number[]>();
    al.forEach((item, i) => { const key = idOf(item); const queue = queues.get(key); if (queue) queue.push(i); else queues.set(key, [i]); });
    const matched = new Set<number>(), pairs: number[] = [], removed: any[] = [];
    bl.forEach(item => { const j = queues.get(idOf(item))?.shift(); if (j === undefined) removed.push(item); else { matched.add(j); pairs.push(j); } });
    let added = al.map((item, i) => ({ item, i })).filter(entry => !matched.has(entry.i));
    // 同名のファイルで中身が違うものは差し替えとして 1 件にまとめる。
    const left: any[] = [];
    for (const item of removed) {
      const index = get(item, 'type') === 'FILE' ? added.findIndex(entry => get(entry.item, 'type') === 'FILE' && nameOf(entry.item) === nameOf(item)) : -1;
      if (index < 0) { left.push(item); continue; }
      const [entry] = added.splice(index, 1);
      push('変更', `${prefix} / ${nameOf(item)}`, ['ファイルの内容を差し替え', `読み込み順: ${entry.i + 1}番目`]);
    }
    for (const item of left) push('削除', `${prefix} / ${nameOf(item)}`, [`種類: ${kindText(item)}`]);
    for (const entry of added) push('追加', `${prefix} / ${nameOf(entry.item)}`, [`種類: ${kindText(entry.item)}`, `読み込み順: ${entry.i + 1}番目`]);
    if (pairs.some((j, i) => i > 0 && j < pairs[i - 1])) {
      const commonBefore = bl.filter(item => al.some(other => idOf(other) === idOf(item))), commonAfter = al.filter(item => bl.some(other => idOf(other) === idOf(item)));
      push('変更', `${prefix} の読み込み順`, [`読み込み順: ${listText(commonBefore.map(nameOf))} → ${listText(commonAfter.map(nameOf))}`]);
    }
  }
}

function appSettingsItems(before: any, after: any, labels: Labels, push: Push) {
  if (!isObj(before) || !isObj(after)) throw new Error('アプリ設定の形式が不正です。');
  const order = Object.keys(APP_SETTING_LABELS);
  const keys = [...order, ...[...new Set([...Object.keys(before), ...Object.keys(after)])].filter(key => !order.includes(key) && key !== 'revision')];
  const kv = (label: string, x: any, y: any, text: (value: any) => string = value => fmt(value)) => same(x, y) ? [] : [`${label}: ${text(x)} → ${text(y)}`];
  for (const key of keys) {
    const bv = get(before, key), av = get(after, key);
    if (same(bv, av)) continue;
    const name = labelFor(key, APP_SETTING_LABELS);
    let details: string[];
    if (key === 'titleField') {
      details = [...kv('選択方法', get(bv, 'selectionMode'), get(av, 'selectionMode'), value => fmt(value, 'selectionMode')),
        ...kv('フィールド', get(bv, 'code'), get(av, 'code'), value => value ? fieldName(String(value), labels) : '（なし）')];
    } else if (key === 'numberPrecision') {
      details = [...kv('全体の桁数', get(bv, 'digits'), get(av, 'digits')), ...kv('小数部の桁数', get(bv, 'decimalPlaces'), get(av, 'decimalPlaces')),
        ...kv('丸めかた', get(bv, 'roundingMode'), get(av, 'roundingMode'), value => fmt(value, 'roundingMode'))];
    } else if (key === 'firstMonthOfFiscalYear') {
      details = [`${bv === undefined ? '（なし）' : `${bv}月`} → ${av === undefined ? '（なし）' : `${av}月`}`];
    } else if (isObj(bv) && isObj(av)) {
      details = attrLines(bv, av, { labels });
    } else details = [`${fmt(bv, key)} → ${fmt(av, key)}`];
    push('変更', name, details.length ? details : [`${fmt(bv, key)} → ${fmt(av, key)}`]);
  }
}

/** 想定外の形でも例外を投げず、トップレベルのキーごとに要約する。 */
function genericItems(before: any, after: any, labels: Labels, push: Push) {
  if (!isObj(before) && !isObj(after)) {
    if (!same(before, after)) push('変更', '設定', [`${fmt(before)} → ${fmt(after)}`]);
    return;
  }
  const b = isObj(before) ? before : {}, a = isObj(after) ? after : {};
  for (const key of new Set([...Object.keys(b), ...Object.keys(a)])) {
    const bv = get(b, key), av = get(a, key);
    if (same(bv, av)) continue;
    const name = labelOfProp(key);
    const arrayish = (value: any) => Array.isArray(value) || value === undefined;
    const lines = arrayish(bv) && arrayish(av)
      ? [arrayLine(key, name, list(bv), list(av), labels, '')]
      : isObj(bv) && isObj(av) ? attrLines(bv, av, { labels }) : [`${fmt(bv, key)} → ${fmt(av, key)}`];
    push(bv === undefined ? '追加' : av === undefined ? '削除' : '変更', name, lines.length ? lines : ['内容を変更']);
  }
}

// ---------------------------------------------------------------------------
// 公開 API
// ---------------------------------------------------------------------------

const KIND_ORDER: Record<Kind, number> = { 削除: 0, 変更: 1, 追加: 2, 保持: 3 };

export function summarizeReflectItems(sectionKey: string, before: any, after: any, context: ReflectSummaryContext = {}): ReflectItemSummary[] {
  const labels = context.fieldLabels;
  const run = (build: (push: Push) => void): ReflectItemSummary[] => {
    const items: ReflectItemSummary[] = [];
    const push: Push = (kind, name, details) => {
      const clean = details.filter(Boolean);
      items.push({ kind, name, details: clean.length > MAX_DETAILS ? [...clean.slice(0, MAX_DETAILS - 1), `ほか ${clean.length - (MAX_DETAILS - 1)} 件`] : clean });
    };
    build(push);
    return items;
  };
  const specific = (push: Push) => {
    switch (sectionKey) {
      case 'fieldSettings': return fieldItems(before, after, labels, push);
      case 'layoutSettings': return layoutItems(before, after, labels, push);
      case 'viewSettings': case 'reportSettings': case 'actionSettings': return namedItems(sectionKey, before, after, labels, push);
      case 'processSettings': return processItems(before, after, labels, push);
      case 'appAcl': case 'recordPermissions': case 'fieldAcl': return aclItems(sectionKey, before, after, labels, push);
      case 'notifications': case 'perRecordNotifications': case 'reminderNotifications': return notificationItems(sectionKey, before, after, labels, push);
      case 'categories': return categoryItems(before, after, labels, push);
      case 'pluginSettings': return pluginItems(before, after, push);
      case 'customizeSettings': return customizeItems(before, after, push);
      case 'appSettings': return appSettingsItems(before, after, labels, push);
      default: return genericItems(before, after, labels, push);
    }
  };
  let items: ReflectItemSummary[];
  try { items = run(specific); } catch {
    try { items = run(push => genericItems(before, after, labels, push)); } catch { items = []; }
  }
  const names = new Set(items.map(item => item.name));
  for (const name of context.retained || []) {
    if (names.has(name)) continue;
    names.add(name);
    items.push({ kind: '保持', name, details: ['反映先だけにあるため、そのまま残します'] });
  }
  return items.map((item, index) => ({ item, index })).sort((x, y) => KIND_ORDER[x.item.kind] - KIND_ORDER[y.item.kind] || x.index - y.index).map(entry => entry.item);
}

/** 計画の「保持」変更（path のみ）から、要約の保持項目名を作る。フィールドは表示名を付ける。 */
export function retainedItemNames(sectionKey: string, changes: Array<{ kind: string; path: string }>, fieldLabels?: Record<string, string>): string[] {
  const names: string[] = [];
  for (const change of changes) {
    if (change.kind !== '保持') continue;
    const separator = change.path.indexOf(' / ');
    const rest = separator < 0 ? change.path : change.path.slice(separator + 3);
    if (sectionKey === 'fieldSettings') {
      const parts = rest.split(' / ');
      names.push(parts.length >= 2 ? `${labelOnly(parts[0], undefined, fieldLabels)} / ${fieldName(parts[1], fieldLabels)}` : fieldName(rest, fieldLabels));
    } else if (sectionKey === 'layoutSettings') names.push(fieldName(rest, fieldLabels));
    else names.push(rest);
  }
  return names;
}

/** バンドルの fieldSettings から「フィールドコード → 表示名」を作る。後に渡したバンドルが優先。 */
export function reflectFieldLabels(...bundles: any[]): Record<string, string> {
  const labels: Record<string, string> = Object.create(null);
  const collect = (properties: any) => {
    if (!isObj(properties)) return;
    for (const [code, definition] of Object.entries(properties)) {
      if (!isObj(definition)) continue;
      if (typeof definition.label === 'string' && definition.label) labels[code] = definition.label;
      if (definition.type === 'SUBTABLE') collect(definition.fields);
    }
  };
  for (const bundle of bundles) collect(bundle?.sections?.fieldSettings?.properties);
  return labels;
}
