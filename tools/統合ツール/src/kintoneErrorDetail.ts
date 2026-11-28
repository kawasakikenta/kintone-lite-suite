'use strict';

/**
 * kintone の入力エラー（CB_VA01 など）の、項目ごとの文を利用者が読める行にする（DOM に依存しない）。
 *
 * kintone は、受け付けなかった項目ごとに `errors: { "<キー>": { messages: ["…"] } }` を返す。キーは送った JSON の場所
 * （`properties.CODE.lookup.relatedApp.app`・`records[3].FIELD.value`・`states[未処理].index` など）で、そのままでは利用者に読めない。
 * ここでは、分かる範囲でキーを「フィールド「CODE」のルックアップ設定 / 参照するアプリID」「3件目・FIELD」のような場所の名前に言い換える
 * （言い換えられない部分はキーのまま残す）。
 *
 * - 文は kintone が返したもの。長さの上限を付け、改行は空白にする。画面へは textContent で入れること（innerHTML を使わない）。
 * - 画面（ステータス・結果の行）には先頭の数件（KINTONE_ERROR_SCREEN_LIMIT）と「ほか N 件」、ログ（コピー・保存できる）には全件を出す。
 * - `[API]` の通信情報の行（送った内容が入る）は、画面に出す文に含めない（utils.ts の withoutApiContextLines）。
 */

import { FIELD_SETTING_LABELS, ownLookup } from './diff/label-dict.js';

/** 画面（ステータス・結果の行）に出す件数。残りは「ほか N 件」にする。 */
export const KINTONE_ERROR_SCREEN_LIMIT = 3;
/** ログ・エラーの文に並べる件数の上限（kintone の 1 回の要求で返る数を超える大きさ。超えた分は「ほか N 件」）。 */
export const KINTONE_ERROR_LIST_LIMIT = 100;
const MESSAGE_MAX = 200;
const WHERE_MAX = 160;

/** 場所の呼び名の付け方。指定しない項目は既定（コード・「N件目」）のまま。 */
export interface KintoneErrorNaming {
  /** `records[N]` の N（その要求の records の 0 始まりの位置）の呼び名。既定は「N+1件目」 */
  record?: (index: number) => string;
  /** レコードのフィールドの呼び名。tableCode はテーブル内のフィールドのとき、そのテーブルのコード。既定はコードのまま */
  recordField?: (code: string, tableCode?: string) => string;
  /** 本番反映の `apps[N]` の N の呼び名。既定は「N+1件目のアプリ」 */
  app?: (index: number) => string;
}

export interface KintoneErrorItem {
  /** kintone が返したキー（そのまま） */
  key: string;
  /** 言い換えた場所（言い換えられない部分はキーのまま） */
  where: string;
  /** kintone が返した文（長さの上限つき・1 行） */
  messages: string[];
}

type Token = { kind: 'name' | 'key'; value: string; start: number } | { kind: 'index'; value: number; start: number };

const clip = (text: string, max: number) => (text.length > max ? `${text.slice(0, max)}…` : text);
const oneLine = (value: unknown) => String(value ?? '').replace(/\s+/g, ' ').trim();

/** キーを、名前（`a`）・添字（`[3]`）・角括弧の名前（`[未処理]`）に分ける。 */
function tokenizeKey(key: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < key.length) {
    if (key[i] === '.') { i++; continue; }
    if (key[i] === '[') {
      const end = key.indexOf(']', i + 1);
      if (end < 0) { tokens.push({ kind: 'name', value: key.slice(i), start: i }); break; }
      const inner = key.slice(i + 1, end);
      tokens.push(/^\d+$/.test(inner) ? { kind: 'index', value: Number(inner), start: i } : { kind: 'key', value: inner, start: i });
      i = end + 1;
      continue;
    }
    let j = i;
    while (j < key.length && key[j] !== '.' && key[j] !== '[') j++;
    tokens.push({ kind: 'name', value: key.slice(i, j), start: i });
    i = j;
  }
  return tokens;
}

const tokenText = (token: Token | undefined) => (token ? String(token.value) : '');
const isName = (token: Token | undefined, ...names: string[]) => !!token && token.kind === 'name' && names.includes(token.value);

// 設定の項目名（フィールドの設定は diff/label-dict.ts の FIELD_SETTING_LABELS。差分比較の「設定項目（日本語）」と同じ言葉）。
const LAYOUT_LABELS: Record<string, string> = { fields: '部品', layout: 'グループ内のレイアウト', code: 'フィールドコード', type: '種類', size: '大きさ', width: '幅', height: '高さ', innerHeight: '高さ', label: 'ラベル', elementId: '要素ID' };
const VIEW_LABELS: Record<string, string> = { type: '一覧の種類', builtinType: '一覧の種類', name: '一覧名', index: '並び順', fields: '表示するフィールド', filterCond: '絞り込み条件', sort: 'ソート', html: 'HTML', pager: 'ページネーション', device: '表示する画面', date: '日付のフィールド', title: 'タイトルのフィールド' };
const REPORT_LABELS: Record<string, string> = { name: 'グラフ名', index: '並び順', chartType: 'グラフの種類', chartMode: '表示モード', groups: '分類する項目', aggregations: '集計方法', filterCond: '絞り込み条件', sorts: 'ソート', periodicReport: '定期レポート', code: 'フィールドコード', per: '単位', type: '種類', by: '基準', order: '順序' };
const STATE_LABELS: Record<string, string> = { name: 'ステータス名', index: '並び順', assignee: '作業者', type: '作業者の指定方法', entities: '作業者', entity: '作業者', code: 'コード' };
const ACTION_LABELS: Record<string, string> = { name: 'アクション名', from: '実行前のステータス', to: '実行後のステータス', filterCond: '実行条件', type: '種類', executableUser: '実行できるユーザー', destApp: 'コピー先のアプリ', app: 'アプリID', mappings: 'コピーするフィールド', srcType: 'コピー元の種類', srcField: 'コピー元のフィールド', destField: 'コピー先のフィールド', entities: '利用できるユーザー', entity: 'ユーザー', index: '並び順', code: 'コード' };
const CUSTOMIZE_LABELS: Record<string, string> = { js: 'JavaScript', css: 'CSS', url: 'URL', type: '種類', file: 'ファイル', fileKey: 'ファイル', name: 'ファイル名' };
const RIGHT_LABELS: Record<string, string> = {
  entity: '対象', entities: '対象', type: '種類', code: 'コード', filterCond: '条件', includeSubs: '下位の組織への継承', accessibility: '権限',
  appEditable: 'アプリ管理', recordViewable: 'レコード閲覧', recordAddable: 'レコード追加', recordEditable: 'レコード編集', recordDeletable: 'レコード削除',
  recordImportable: 'ファイルから読み込む', recordExportable: 'ファイルに書き出す', viewable: '閲覧', editable: '編集', deletable: '削除'
};
const NOTIFICATION_LABELS: Record<string, string> = {
  entity: '通知先', targets: '通知先', type: '種類', code: 'コード', includeSubs: '下位の組織', filterCond: '条件', title: '通知の内容', timing: '通知のタイミング',
  recordAdded: 'レコード追加', recordEdited: 'レコード編集', commentAdded: 'コメント書き込み', statusChanged: 'ステータスの更新', fileImported: 'ファイル読み込み',
  daysLater: '日後', hoursLater: '時間後', time: '時刻', field: '基準の日時のフィールド'
};
const APP_SETTING_LABELS: Record<string, string> = {
  name: 'アプリ名', description: '説明', icon: 'アイコン', theme: 'デザインテーマ', titleField: 'レコードタイトル', selectionMode: '選び方', code: 'フィールドコード',
  enableThumbnails: 'サムネイルの表示', enableBulkDeletion: 'レコードの一括削除', enableComments: 'コメント機能', enableDuplicateRecord: 'レコードの再利用',
  enableInlineRecordEditing: '一覧での編集', numberPrecision: '数値の計算の精度', digits: '全体の桁数', decimalPlaces: '小数部の桁数', roundingMode: '数値の丸めかた',
  firstMonthOfFiscalYear: '年度の開始月'
};

/** 先頭の名前（設定の種類）ごとの呼び名と、続く項目名の辞書。 */
interface SectionRule { label: string; labels: Record<string, string>; /** 添字の呼び方（既定は「件目」） */ unit?: string }
const SECTION_RULES: Record<string, SectionRule> = {
  layout: { label: 'レイアウト', labels: LAYOUT_LABELS, unit: '行目' },
  views: { label: '一覧', labels: VIEW_LABELS },
  reports: { label: 'グラフ', labels: REPORT_LABELS },
  states: { label: 'ステータス', labels: STATE_LABELS },
  actions: { label: 'アクション', labels: ACTION_LABELS },
  desktop: { label: 'PC用', labels: CUSTOMIZE_LABELS },
  mobile: { label: 'モバイル用', labels: CUSTOMIZE_LABELS },
  rights: { label: 'アクセス権', labels: RIGHT_LABELS },
  notifications: { label: '通知', labels: NOTIFICATION_LABELS },
  categories: { label: 'カテゴリー', labels: { name: 'カテゴリー名', index: '並び順', children: '下位のカテゴリー' } },
  apps: { label: 'アプリ', labels: { app: 'アプリID', revision: '設定の更新番号（revision）' } }
};
/** それだけで 1 つの設定を表す先頭の名前。 */
const SINGLE_LABELS: Record<string, string> = {
  ...APP_SETTING_LABELS,
  enable: 'プロセス管理の有効化',
  scope: 'JavaScript・CSS の適用範囲',
  notifyToCommenter: 'コメント投稿者への通知',
  timezone: 'タイムゾーン',
  enabled: '有効状態',
  ids: 'プラグイン',
  app: 'アプリID',
  revision: '設定の更新番号（revision）',
  revert: '変更の中止（revert）',
  // 先頭の id は、レコード 1 件の更新ならレコードID・アプリの取得ならアプリIDで、決められないのでキーのまま出す（records[N].id はレコードID）
  query: '条件',
  limit: '件数の上限',
  offset: '開始位置',
  fields: '取得するフィールド',
  totalCount: '件数の取得',
  properties: 'フィールドの設定',
  records: 'レコード',
  record: 'レコード'
};

/**
 * 先頭の名前に続く項目を、項目名で並べる（項目名は差分比較の設定項目と同じ。配列の要素は直前の項目名に「（N件目）」を付ける）。
 * 区切りは「・」（レコードの「CSV 3行目・金額」と同じ。複数の行を 1 行にまとめるときの「 / 」と見分けられるようにする）。
 * 直後の項目名が前の項目名で始まるとき（「参照するアプリ」→「参照するアプリID」）は、前の項目名を省く。
 */
function describeTokens(tokens: Token[], labels: Record<string, string>, unit = '件目'): string {
  const parts: string[] = [];
  for (const token of tokens) {
    if (token.kind === 'index') {
      if (parts.length) parts[parts.length - 1] += `（${token.value + 1}${unit}）`;
      else parts.push(`${token.value + 1}${unit}`);
      continue;
    }
    const label = ownLookup(labels, token.value) || token.value;
    const previous = parts[parts.length - 1];
    if (previous === label) continue;
    if (previous && !/）$/.test(previous) && label.startsWith(previous)) parts[parts.length - 1] = label;
    else parts.push(label);
  }
  return parts.join('・');
}

/** フィールドの設定（`properties.CODE…`）の、CODE より後ろ。選択肢の名前は「.」を含みうるので、キーの文字列から取り出す。 */
function describeFieldSetting(rest: Token[], key: string): string {
  if (!rest.length) return '';
  if (isName(rest[0], 'options')) {
    if (rest.length === 1) return '選択肢';
    if (rest[1].kind === 'key') {
      const suffix = rest.slice(2);
      return `選択肢「${rest[1].value}」${suffix.length ? `の${describeOptionProperty(suffix)}` : ''}`;
    }
    const tail = key.slice(rest[1].start);
    const property = /^(.+)\.(label|index)$/.exec(tail);
    return `選択肢「${property ? property[1] : tail}」${property ? `の${property[2] === 'label' ? '名前' : '並び順'}` : ''}`;
  }
  return describeTokens(rest, FIELD_SETTING_LABELS);
}

function describeOptionProperty(tokens: Token[]): string {
  if (tokens.length === 1 && isName(tokens[0], 'label')) return '名前';
  if (tokens.length === 1 && isName(tokens[0], 'index')) return '並び順';
  return describeTokens(tokens, FIELD_SETTING_LABELS);
}

/** `properties.CODE…`（フィールドの設定）。テーブル内のフィールドは `properties.TABLE.fields.CHILD…`。 */
function describePropertiesKey(tokens: Token[], key: string): string {
  const [, codeToken, ...after] = tokens;
  if (!codeToken) return 'フィールドの設定';
  let where = `フィールド「${tokenText(codeToken)}」`;
  let rest = after;
  if (isName(rest[0], 'fields') && rest[1] && rest[1].kind !== 'index') {
    where = `テーブル「${tokenText(codeToken)}」のフィールド「${tokenText(rest[1])}」`;
    rest = rest.slice(2);
  }
  const setting = describeFieldSetting(rest, key);
  return setting ? `${where}の${setting}` : where;
}

/** `records[N].FIELD.value`・`records[N].TABLE.value[M].value.CHILD.value`・`record.FIELD.value`・`records[N].id` など。 */
function describeRecordKey(tokens: Token[], naming: KintoneErrorNaming): string {
  const single = isName(tokens[0], 'record');
  let rest = tokens.slice(1);
  let recordLabel = '';
  if (!single && rest[0]?.kind === 'index') {
    const index = rest[0].value;
    recordLabel = naming.record ? naming.record(index) : `${index + 1}件目`;
    rest = rest.slice(1);
  }
  if (!rest.length) return recordLabel || 'レコード';
  const fieldName = (code: string, table?: string) => (naming.recordField ? naming.recordField(code, table) : code);
  const [head, ...tail] = rest;
  const SPECIAL: Record<string, string> = { id: 'レコードID', revision: 'レコードの更新番号（revision）', action: 'アクション', assignee: '作業者' };
  let field: string;
  if (head.kind === 'name' && !tail.length && ownLookup(SPECIAL, head.value)) field = ownLookup(SPECIAL, head.value) as string;
  else if (head.kind === 'index') field = describeTokens(rest, {});
  else {
    const code = tokenText(head);
    const inner = isName(tail[0], 'value') ? tail.slice(1) : tail;
    if (!inner.length) field = fieldName(code);
    else if (inner[0].kind === 'index') {
      // テーブルの行: value[M].value.CHILD.value / value[M].id
      const row = `${fieldName(code)}${inner[0].value + 1}行目`;
      const cell = isName(inner[1], 'value') ? inner.slice(2) : inner.slice(1);
      if (!cell.length) field = row;
      else if (cell.length === 1 && isName(cell[0], 'id')) field = `${row}の行ID`;
      else {
        const child = tokenText(cell[0]);
        const more = isName(cell[1], 'value') ? cell.slice(2) : cell.slice(1);
        field = `${row}・${fieldName(child, code)}${more.length ? `（${more.map(tokenText).join('.')}）` : ''}`;
      }
    } else field = `${fieldName(code)}（${inner.map(tokenText).join('.')}）`;
  }
  return [recordLabel, field].filter(Boolean).join('・');
}

/** `apps[N].revision`（本番反映の deploy.json）。 */
function describeAppsKey(tokens: Token[], naming: KintoneErrorNaming): string {
  const rest = tokens.slice(1);
  if (rest[0]?.kind !== 'index') return describeTokens(tokens, { apps: 'アプリ', ...SECTION_RULES.apps.labels });
  const app = naming.app ? naming.app(rest[0].value) : `${rest[0].value + 1}件目のアプリ`;
  const setting = describeTokens(rest.slice(1), SECTION_RULES.apps.labels);
  return setting ? `${app}の${setting}` : app;
}

/**
 * kintone が返したキーを、利用者が読める場所の名前にする。言い換えられないキーはそのまま返す。
 * 例: `properties.customer.lookup.relatedApp.app` → `フィールド「customer」のルックアップ設定 / 参照するアプリID`、
 *     `records[2].amount.value` → `3件目・amount`、`states[未処理].index` → `ステータス「未処理」の並び順`。
 */
export function describeKintoneErrorKey(key: string, naming: KintoneErrorNaming = {}): string {
  const raw = oneLine(key);
  if (!raw) return '（場所の指定なし）';
  const tokens = tokenizeKey(raw);
  const head = tokens[0];
  if (!head || head.kind !== 'name') return clip(raw, WHERE_MAX);
  let text = '';
  if (head.value === 'properties') text = describePropertiesKey(tokens, raw);
  else if ((head.value === 'records' && tokens.length > 1) || (head.value === 'record' && tokens.length > 1)) text = describeRecordKey(tokens, naming);
  else if (head.value === 'apps') text = describeAppsKey(tokens, naming);
  else if (ownLookup(SECTION_RULES, head.value)) {
    const rule = SECTION_RULES[head.value];
    const [, entity, ...rest] = tokens;
    if (!entity) text = rule.label;
    else if (entity.kind === 'index') {
      const setting = describeTokens(rest, rule.labels);
      text = `${rule.label}（${entity.value + 1}${rule.unit || '件目'}）${setting ? `の${setting}` : ''}`;
    } else if (head.value === 'desktop' || head.value === 'mobile') {
      text = `${rule.label}の${describeTokens([entity, ...rest], rule.labels)}`;
    } else {
      const setting = describeTokens(rest, rule.labels);
      text = `${rule.label}「${entity.value}」${setting ? `の${setting}` : ''}`;
    }
  } else if (ownLookup(SINGLE_LABELS, head.value)) {
    text = [ownLookup(SINGLE_LABELS, head.value), describeTokens(tokens.slice(1), APP_SETTING_LABELS)].filter(Boolean).join('・');
  } else text = raw;
  return clip(text || raw, WHERE_MAX);
}

/** エラー（API 層が包んだものは元のエラーまで）から、kintone の項目ごとのエラー（errors）を探す。無ければ null。 */
export function findKintoneErrorMap(error: unknown): Record<string, unknown> | null {
  for (let current: any = error, depth = 0; current && typeof current === 'object' && depth < 6; current = current.original, depth++) {
    const errors = current.errors;
    if (errors && typeof errors === 'object' && !Array.isArray(errors) && Object.keys(errors).length) return errors as Record<string, unknown>;
  }
  return null;
}

function messagesOf(value: unknown): string[] {
  const list = Array.isArray((value as any)?.messages) ? (value as any).messages : typeof value === 'string' ? [value] : [];
  return list.map((message: unknown) => clip(oneLine(message), MESSAGE_MAX)).filter(Boolean);
}

/** 項目ごとのエラーを、kintone が返した順に並べる（errors が無ければ空）。 */
export function collectKintoneErrors(error: unknown, naming: KintoneErrorNaming = {}): KintoneErrorItem[] {
  const map = findKintoneErrorMap(error);
  if (!map) return [];
  return Object.entries(map)
    .filter(([, value]) => value != null && (typeof value === 'string' || typeof value === 'object'))
    .map(([key, value]) => ({ key, where: describeKintoneErrorKey(key, naming), messages: messagesOf(value) }));
}

/** 1 件の行: 「場所: 文」（文が複数なら「 / 」でつなぐ）。 */
export function formatKintoneError(item: KintoneErrorItem): string {
  return `${item.where}: ${item.messages.join(' / ') || '(詳細なし)'}`;
}

/** 「ほか N 件」の行。 */
export const kintoneErrorOverflowLine = (rest: number) => `ほか ${rest} 件`;

/**
 * 項目ごとのエラーの行。limit を超える分は「ほか N 件」の 1 行にする（既定はログ向けの KINTONE_ERROR_LIST_LIMIT）。
 * error・naming が同じなら、同じ行を返す（画面向けに短くするとき、エラーの文の中の行をこれで見分ける）。
 */
export function formatKintoneErrorLines(error: unknown, naming: KintoneErrorNaming = {}, limit = KINTONE_ERROR_LIST_LIMIT): string[] {
  const lines = collectKintoneErrors(error, naming).map(formatKintoneError);
  return lines.length > limit ? [...lines.slice(0, limit), kintoneErrorOverflowLine(lines.length - limit)] : lines;
}

/**
 * 利用者に見せる、項目ごとのエラーの行（全件。上限は KINTONE_ERROR_LIST_LIMIT）。
 * 呼び出し元が場所の呼び名を付けた行（`kintoneErrorDetails`。CSV の行番号・フィールド名など）があればそれを、無ければ errors から作る。
 */
export function kintoneErrorDetailsOf(error: unknown): string[] {
  for (let current: any = error, depth = 0; current && typeof current === 'object' && depth < 6; current = current.original, depth++) {
    if (Array.isArray(current.kintoneErrorDetails)) return current.kintoneErrorDetails.map((line: unknown) => String(line));
    const map = current.errors;
    if (map && typeof map === 'object' && !Array.isArray(map) && Object.keys(map).length) return formatKintoneErrorLines(current);
  }
  return [];
}

/** 画面に出す分: 先頭 limit 件と「ほか N 件」。行が「ほか N 件」で終わっていれば（上限を超えた全件の行）、その件数も数える。 */
export function summarizeKintoneErrorDetails(details: readonly string[], limit = KINTONE_ERROR_SCREEN_LIMIT): string[] {
  const list = [...details];
  let hidden = 0;
  const overflow = /^ほか (\d+) 件$/.exec(list[list.length - 1] || '');
  if (overflow) { hidden = Number(overflow[1]); list.pop(); }
  if (list.length <= limit) return hidden ? [...list, kintoneErrorOverflowLine(hidden)] : list;
  return [...list.slice(0, limit), kintoneErrorOverflowLine(list.length - limit + hidden)];
}

/**
 * エラーの文を画面向けにする。utils.ts の apiErrorWithContext が文に入れた項目ごとの行（全件）を、
 * 先頭 limit 件と「ほか N 件」に置き換える（呼び出し元が呼び名を付けた行があれば、そちらに置き換える）。
 * 文に項目ごとの行が無ければ、1 行目の後ろに入れる。項目ごとのエラーが無ければ、文をそのまま返す。
 * naming を渡すと、置き換える行はその呼び名で作る（本番反映の `apps[N]` をアプリ名にするなど）。
 * `[API]` の行は消さない（必要なら withoutApiContextLines を重ねる）。
 */
export function abbreviateKintoneErrorMessage(message: string, error: unknown, options: { limit?: number; naming?: KintoneErrorNaming } = {}): string {
  const details = options.naming ? formatKintoneErrorLines(error, options.naming) : kintoneErrorDetailsOf(error);
  if (!details.length) return message;
  const summary = summarizeKintoneErrorDetails(details, options.limit ?? KINTONE_ERROR_SCREEN_LIMIT);
  const { lines, at } = splitKintoneErrorLines(message, error, [...details, ...kintoneErrorDetailsOf(error)]);
  if (at < 0 && !lines.some((line) => line.trim())) return summary.join('\n');
  lines.splice(at < 0 ? Math.min(1, lines.length) : at, 0, ...summary);
  return lines.join('\n');
}

/** エラーの文から、項目ごとの行（apiErrorWithContext が入れた行と、呼び出し元が呼び名を付けた行）を除く。 */
export function withoutKintoneErrorLines(message: string, error: unknown): string {
  return splitKintoneErrorLines(message, error, kintoneErrorDetailsOf(error)).lines.join('\n');
}

/** 項目ごとの行を除いた行と、最初に除いた位置（無ければ -1）。行は同じ error から同じ関数で作るため、文字列の一致で見分けられる。 */
function splitKintoneErrorLines(message: string, error: unknown, details: readonly string[]): { lines: string[]; at: number } {
  const known = new Set([...formatKintoneErrorLines(error), ...details].map((line) => line.trim()));
  const lines: string[] = [];
  let at = -1;
  for (const line of String(message ?? '').split('\n')) {
    if (known.size && known.has(line.trim())) { if (at < 0) at = lines.length; continue; }
    lines.push(line);
  }
  return { lines, at };
}
