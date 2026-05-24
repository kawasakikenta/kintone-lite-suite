'use strict';

/**
 * 非フィールド系の差分行を「何が」「どこで」「どう変わったか」に分解する
 * セマンティック整形器。
 *
 * 入力: DiffRow ({ sectionKey, path, type, left, right, ... })
 * 出力: DecodedRow ({ whereChips, propLabel, beforeText, afterText, ... })
 *
 * 既存の `stringifyRowValueForDiff` が JSON.stringify ベースで raw JSON を
 * そのまま露出するのに対し、本モジュールは {@link label-dict} の辞書を介して
 * 内部キー (`recordViewable`, `accessibility=READ_WRITE` 等) を日本語ラベル＋
 * アイコンに変換する。フィールド／レイアウトは既存の整形が効くので対象外。
 */

import {
  labelOfProp, iconOfProp, labelOfValue, labelOfSection, labelOfBool, formatEntityText,
  VALUE_LABELS
} from './label-dict.js';

export interface WhereChip {
  icon?: string;
  label: string;
  muted?: boolean;
}

export interface DecodedRow {
  sectionLabel: string;
  sectionIcon: string;
  whereChips: WhereChip[];
  propLabel: string;
  propIcon: string;
  beforeText: string;
  afterText: string;
  /** カードヘッダ用の短文サマリ（例: 「閲覧: 許可 → 不許可」） */
  oneLineSummary: string;
  /** 検索インデックスに追加すべきトークン群 */
  searchableTokens: string[];
}

const SEMANTIC_SECTIONS = new Set([
  'appAcl', 'fieldAcl', 'recordPermissions',
  'notifications', 'perRecordNotifications', 'reminderNotifications',
  'viewSettings', 'reportSettings',
  'actionSettings', 'processSettings',
  'customizeSettings', 'pluginSettings',
  'appSettings', 'appInfo', 'formSettings',
  'categories'
]);

export function isSemanticSection(sectionKey: string | null | undefined): boolean {
  return !!sectionKey && SEMANTIC_SECTIONS.has(sectionKey);
}

// ---------------------------------------------------------------------------
// path のトークン化: 'appAcl.rights[3].recordEditable'
//                    → ['appAcl', 'rights', 3, 'recordEditable']
// ---------------------------------------------------------------------------
function tokenize(path: string | null | undefined): Array<string | number> {
  if (!path) return [];
  const out: Array<string | number> = [];
  const re = /([^[.\]]+)|\[(\d+)\]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(String(path))) !== null) {
    if (m[1] != null) out.push(m[1]);
    else out.push(Number(m[2]));
  }
  return out;
}

function isIndex(token: any): token is number {
  return typeof token === 'number';
}

// ---------------------------------------------------------------------------
// 値 → 表示テキスト
// ---------------------------------------------------------------------------

/** propKey の文脈で primitive / object / array を表示テキスト化する */
function valueToText(value: any, propKey: string, depth = 0): string {
  if (value === undefined) return '（未設定）';
  if (value === null) return '-';
  if (typeof value === 'boolean') return labelOfBool(value, propKey);
  if (typeof value === 'number') return String(value);
  if (typeof value === 'string') {
    // accessibility / view.type など enum スコープのラベルを優先
    if (propKey === 'accessibility') {
      return labelOfValue('accessibility', value) || value;
    }
    if (propKey === 'type') {
      return labelOfValue('view.type', value) || labelOfValue('chart.type', value) || value;
    }
    if (propKey === 'chartType') {
      return labelOfValue('chart.type', value) || value;
    }
    if (propKey === 'paginationStyle') {
      return labelOfValue('paginationStyle', value) || value;
    }
    return value;
  }
  if (Array.isArray(value)) {
    if (!value.length) return '（空）';
    // recipients/targets/entities 配列 → エンティティ列
    if (value[0] && typeof value[0] === 'object' && (value[0].entity || value[0].type)) {
      const compact = value.length > 4;
      const items = value.slice(0, 8).map((v) => {
        const ent = v.entity || (v.type ? v : null);
        if (ent) return formatEntityText(ent, { compact });
        return safeStringify(v);
      });
      const more = value.length > items.length ? `, …+${value.length - items.length}` : '';
      return items.join(', ') + more;
    }
    if (value.every((v: any) => v == null || typeof v !== 'object')) {
      return value.map((v: any) => (v == null ? '-' : String(v))).join(', ');
    }
    if (depth >= 1) return `(${value.length} 件)`;
    return value.slice(0, 6).map((v: any) => valueToText(v, propKey, depth + 1)).join('\n');
  }
  if (typeof value === 'object') {
    // entity ラッパ
    if (value.entity && typeof value.entity === 'object') {
      const base = formatEntityText(value.entity);
      const extras: string[] = [];
      if (value.accessibility) {
        const lv = labelOfValue('accessibility', value.accessibility) || value.accessibility;
        extras.push(lv as string);
      }
      if (typeof value.includeSubs === 'boolean') extras.push(value.includeSubs ? '配下含む' : '配下なし');
      return extras.length ? `${base} / ${extras.join(' / ')}` : base;
    }
    if (value.type && typeof value.code !== 'undefined' && Object.keys(value).length <= 4) {
      // type/code/name 程度の単純オブジェクト
      return formatEntityText(value);
    }
    // アクション/ビュー/通知などの構造物 → 重要キーを抜粋
    return summarizeObject(value, depth);
  }
  return String(value);
}

const SUMMARY_KEYS_PRIORITY = [
  'name', 'label', 'title', 'code', 'id', 'type', 'chartType',
  'from', 'to', 'enable', 'filterCond', 'accessibility', 'timing',
  'version', 'paginationStyle', 'url'
];

function summarizeObject(obj: any, depth: number): string {
  const lines: string[] = [];
  let n = 0;
  for (const key of SUMMARY_KEYS_PRIORITY) {
    if (n >= 6) break;
    if (!Object.prototype.hasOwnProperty.call(obj, key)) continue;
    const v = obj[key];
    if (v === null || v === undefined) continue;
    if (typeof v === 'object' && depth >= 1) continue;
    lines.push(`${labelOfProp(key)}: ${valueToText(v, key, depth + 1)}`);
    n++;
  }
  // 残りキー (rights/entities/recipients 等)
  const remaining = Object.keys(obj).filter((k) => !SUMMARY_KEYS_PRIORITY.includes(k));
  for (const key of remaining) {
    if (n >= 6) break;
    const v = obj[key];
    if (v === null || v === undefined) continue;
    if (Array.isArray(v)) {
      lines.push(`${labelOfProp(key)}: ${valueToText(v, key, depth + 1)}`);
      n++;
    } else if (typeof v !== 'object') {
      lines.push(`${labelOfProp(key)}: ${valueToText(v, key, depth + 1)}`);
      n++;
    }
  }
  if (!lines.length) return safeStringify(obj);
  return lines.join('\n');
}

function safeStringify(v: any): string {
  try { return JSON.stringify(v); } catch { return String(v); }
}

// ---------------------------------------------------------------------------
// "where" コンテキストの組み立て
// ---------------------------------------------------------------------------

interface ParsedContext {
  /** rights[3] のような添字付き配列ノード */
  arrayBucketKey?: string;   // 'rights', 'entities', 'notifications', etc
  arrayIndex?: number;
  /** views.MyView のような名前付きマップノード */
  namedKey?: string;
  namedScope?: string;       // 'views', 'reports', 'states', 'categories'
  /** path 末尾の leaf プロパティ (propKey) */
  leafKey?: string;
  /** customizeSettings.desktop.js[0] の platform/kind */
  platform?: string;
  kind?: string;
}

function parsePath(sectionKey: string, path: string): ParsedContext {
  const tokens = tokenize(path);
  // tokens[0] === sectionKey usually
  if (!tokens.length) return {};
  const ctx: ParsedContext = {};

  // customizeSettings.<platform>.<kind>[idx]...
  if (sectionKey === 'customizeSettings' && tokens.length >= 2) {
    if (typeof tokens[1] === 'string') ctx.platform = tokens[1] as string;
    if (typeof tokens[2] === 'string') ctx.kind = tokens[2] as string;
  }

  // 名前付きマップ (views.X, reports.X, states.X, categories.X, notifications-bucket は配列なので除外)
  const namedMaps: Record<string, string> = {
    viewSettings: 'views',
    reportSettings: 'reports',
    processSettings: 'states', // processSettings.states.<name> も対象だが actions は配列
    categories: 'categories'
  };
  const mapBucket = namedMaps[sectionKey];
  if (mapBucket) {
    for (let i = 1; i < tokens.length; i++) {
      if (tokens[i] === mapBucket && typeof tokens[i + 1] === 'string') {
        ctx.namedScope = mapBucket;
        ctx.namedKey = tokens[i + 1] as string;
        break;
      }
    }
  }

  // 配列バケット
  for (let i = 1; i < tokens.length; i++) {
    if (typeof tokens[i] === 'string' && isIndex(tokens[i + 1])) {
      ctx.arrayBucketKey = tokens[i] as string;
      ctx.arrayIndex = tokens[i + 1] as number;
      break;
    }
  }

  // leaf: 末尾の非数値トークン
  for (let i = tokens.length - 1; i >= 1; i--) {
    if (typeof tokens[i] === 'string') {
      ctx.leafKey = tokens[i] as string;
      break;
    }
  }
  return ctx;
}

function extractEntityFromPayload(payload: any): any | null {
  if (!payload || typeof payload !== 'object') return null;
  if (payload.entity && typeof payload.entity === 'object') return payload.entity;
  if (payload.type && (payload.code !== undefined || payload.login !== undefined || payload.id !== undefined)) {
    const entityTypes = Object.keys(VALUE_LABELS['entity.type'] || {});
    if (entityTypes.includes(String(payload.type))) return payload;
  }
  return null;
}

function buildWhereChips(row: any, ctx: ParsedContext): WhereChip[] {
  const chips: WhereChip[] = [];

  // 1) エンジンが付与した entity 情報を最優先で利用 (engine.ts L1138-1141)
  if (row.entityLabel) {
    const ek = String(row.entityKind || '');
    const iconMap: Record<string, string> = {
      aclEntry: '👥',
      recordAclEntry: '👥',
      fieldAclEntry: '🔤',
      notification: '🔔',
      perRecordNotification: '🔔',
      reminderNotification: '⏰',
      view: '📊',
      report: '📈',
      state: '🚦',
      action: '🔁',
      appAction: '⚡',
      plugin: '🧩',
      jsCss: '🧪',
      category: '🗂',
      layoutRow: '🧱'
    };
    chips.push({ icon: iconMap[ek] || '·', label: String(row.entityLabel) });
    if (row.entityCode && row.entityCode !== row.entityLabel) {
      chips.push({ label: String(row.entityCode), muted: true });
    }
    return chips;
  }

  // 2) payload からエンティティを抽出
  const payload = row.right ?? row.left;
  const entity = extractEntityFromPayload(payload);
  if (entity) {
    chips.push({ label: formatEntityText(entity) });
  }

  // 3) 名前付きマップキー (views.MyView 等)
  if (ctx.namedKey) {
    const scopeIcon = ctx.namedScope === 'views' ? '📊'
      : ctx.namedScope === 'reports' ? '📈'
      : ctx.namedScope === 'states' ? '🚦'
      : ctx.namedScope === 'categories' ? '🗂' : '·';
    chips.push({ icon: scopeIcon, label: ctx.namedKey });
  }

  // 4) customize の platform/kind
  if (ctx.platform || ctx.kind) {
    const platLabel = ctx.platform === 'desktop' ? 'デスクトップ'
      : ctx.platform === 'mobile' ? 'モバイル' : ctx.platform || '';
    const kindLabel = ctx.kind ? String(ctx.kind).toUpperCase() : '';
    const txt = [platLabel, kindLabel].filter(Boolean).join(' / ');
    if (txt) chips.push({ icon: '📁', label: txt });
  }

  // 5) 配列インデックスをフォールバックとして muted で表示
  if (!chips.length && ctx.arrayBucketKey && typeof ctx.arrayIndex === 'number') {
    chips.push({ label: `${labelOfProp(ctx.arrayBucketKey)} #${ctx.arrayIndex + 1}`, muted: true });
  }

  return chips;
}

// ---------------------------------------------------------------------------
// メイン
// ---------------------------------------------------------------------------

export function decodeRow(row: any): DecodedRow | null {
  if (!row || !row.sectionKey || !isSemanticSection(row.sectionKey)) return null;

  const sect = labelOfSection(row.sectionKey);
  const ctx = parsePath(row.sectionKey, String(row.path || ''));

  const whereChips = buildWhereChips(row, ctx);

  // leafKey が無い／配列バケット名そのもの／sectionKey なら "全体" 扱い
  const leaf = ctx.leafKey && ctx.leafKey !== row.sectionKey && ctx.leafKey !== ctx.arrayBucketKey
    ? ctx.leafKey
    : '';
  const propLabel = leaf ? labelOfProp(leaf) : '';
  const propIcon = leaf ? iconOfProp(leaf) : '';

  const propKey = leaf || ctx.arrayBucketKey || '';
  const beforeText = row.type === 'added' ? '（なし）' : valueToText(row.left, propKey);
  const afterText  = row.type === 'removed' ? '（なし）' : valueToText(row.right, propKey);

  const oneLineSummary = buildOneLineSummary(row, propLabel, beforeText, afterText);

  const searchableTokens = [
    sect.label, sect.icon,
    ...whereChips.map((c) => c.label),
    propLabel, propIcon,
    beforeText, afterText,
    oneLineSummary
  ].filter(Boolean) as string[];

  return {
    sectionLabel: sect.label,
    sectionIcon: sect.icon || '',
    whereChips,
    propLabel,
    propIcon,
    beforeText,
    afterText,
    oneLineSummary,
    searchableTokens
  };
}

function buildOneLineSummary(row: any, propLabel: string, beforeText: string, afterText: string): string {
  const shortLeft = beforeText.length > 30 ? beforeText.slice(0, 30) + '…' : beforeText;
  const shortRight = afterText.length > 30 ? afterText.slice(0, 30) + '…' : afterText;
  if (row.type === 'added')   return propLabel ? `${propLabel}: 追加（${shortRight}）` : `追加（${shortRight}）`;
  if (row.type === 'removed') return propLabel ? `${propLabel}: 削除（${shortLeft}）` : `削除（${shortLeft}）`;
  if (row.type === 'same')    return propLabel ? `${propLabel}: 同一` : '同一';
  return propLabel ? `${propLabel}: ${shortLeft} → ${shortRight}` : `${shortLeft} → ${shortRight}`;
}

