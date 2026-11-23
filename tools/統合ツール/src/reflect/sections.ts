import { SECTION_DEFS } from '../constants.js';

/**
 * 反映できるセクションキーの実行順。
 * 共有の SECTION_DEFS は appSettings を put: false としているため、一般設定は反映ツール側で追加する。
 * レコードタイトル（titleField）がフィールドの存在を必要とするため、フィールド・レイアウトより後に置く。
 */
export const REFLECT_SECTION_KEYS: readonly string[] = (() => {
  const keys = SECTION_DEFS.filter(def => def.put).map(def => def.key).filter(key => key !== 'appSettings');
  const anchor = Math.max(keys.indexOf('layoutSettings'), keys.indexOf('fieldSettings'));
  keys.splice(anchor + 1, 0, 'appSettings');
  return keys;
})();

/** プロセス管理のフィールド（ステータス・作業者）の種類。プロセス管理が無効なアプリでもフィールド設定には含まれる。 */
export const PROCESS_FIELD_TYPES: ReadonlySet<string> = new Set(['STATUS', 'STATUS_ASSIGNEE']);

/** プロセス管理より先に書く項目（作業者のフィールドやアクションの条件が参照するフィールドを先に用意する）。 */
const PROCESS_LEAD_KEYS: readonly string[] = ['fieldSettings', 'layoutSettings', 'appSettings'];

/** 書き込みの順番を決めるのに見る、項目の計画の一部（ReflectSectionPlan と同じ形）。 */
export interface ReflectWriteOrderPlan {
  sectionKey: string;
  operations?: readonly { body?: any }[];
  requiredFields?: readonly string[];
  values?: { before?: any };
}

/**
 * 書き込む順番。REFLECT_SECTION_KEYS の順を土台に、プロセス管理の位置だけを変える。
 * kintone は、プロセス管理が無効なアプリへ「（作業者が自分）」やステータス・作業者を使う一覧を書き込めず（「プロセス管理機能が無効化されています」）、
 * 一覧の条件の存在しないステータス名も拒否する。有効な間は自動作成された「（作業者が自分）」を削除できず、無効にするとその一覧を削除し、
 * 一覧・グラフの条件からステータス・作業者を外す（実テナントで確認）。そこで:
 * - 反映後にプロセス管理が有効（有効にする・有効のまま変える）: フィールド・レイアウト・一般設定の直後に書き、一覧・グラフなどはその後にする。
 * - 有効から無効にする: プロセス管理を使う項目（「（作業者が自分）」を残す一覧、ステータス・作業者を参照する項目）を先に書き、次にプロセス管理、残りはその後にする。
 * - それ以外（プロセス管理を書かない・無効のまま）: 既定の順。
 * processFieldCodes は反映元・反映先のステータス・作業者のフィールドコード。
 */
export function orderReflectWrites<T extends ReflectWriteOrderPlan>(plans: readonly T[], processFieldCodes: Iterable<string>): T[] {
  const rank = (key: string) => { const index = REFLECT_SECTION_KEYS.indexOf(key); return index < 0 ? REFLECT_SECTION_KEYS.length : index; };
  const base = [...plans].sort((a, b) => rank(a.sectionKey) - rank(b.sectionKey));
  const process = base.find(plan => plan.sectionKey === 'processSettings');
  const enable = process?.operations?.find(operation => typeof operation?.body?.enable === 'boolean')?.body.enable;
  if (!process || typeof enable !== 'boolean') return base;
  const disabling = !enable && process.values?.before?.enable === true;
  if (!enable && !disabling) return base;
  const lead = base.filter(plan => PROCESS_LEAD_KEYS.includes(plan.sectionKey));
  const rest = base.filter(plan => plan !== process && !PROCESS_LEAD_KEYS.includes(plan.sectionKey));
  if (enable) return [...lead, process, ...rest];
  const codes = new Set(processFieldCodes);
  const usesProcess = (plan: T) => !!plan.requiredFields?.some(code => codes.has(code))
    || (plan.sectionKey === 'viewSettings' && !!plan.operations?.some(operation => Object.values<any>(operation?.body?.views || {}).some(view => view?.builtinType === 'ASSIGNEE')));
  const first = rest.filter(usesProcess);
  return [...lead, ...first, process, ...rest.filter(plan => !first.includes(plan))];
}

/** 反映する一般設定のキー。アプリ名・説明・アイコンはアプリ固有の情報なので反映しない。 */
export const APP_SETTINGS_REFLECT_KEYS: readonly string[] = ['theme', 'titleField', 'enableThumbnails', 'enableBulkDeletion', 'enableComments', 'enableDuplicateRecord', 'enableInlineRecordEditing', 'numberPrecision', 'firstMonthOfFiscalYear'];

/** 一般設定の項目名（差分の内訳と変更の要約で共通）。 */
export const APP_SETTINGS_LABELS: Record<string, string> = {
  theme: 'テーマ', titleField: 'レコードのタイトル', enableThumbnails: 'サムネイル表示', enableBulkDeletion: '一括削除',
  enableComments: 'コメント機能', enableDuplicateRecord: 'レコードの再利用', enableInlineRecordEditing: '一覧でのインライン編集',
  numberPrecision: '数値の桁数と丸め', firstMonthOfFiscalYear: '年度の開始月'
};

export function isReflectableSection(key: string): boolean { return REFLECT_SECTION_KEYS.includes(key); }

export function reflectSectionLabel(key: string): string {
  return key === 'appSettings' ? '一般設定' : SECTION_DEFS.find(def => def.key === key)?.label || key;
}
