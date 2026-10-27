/**
 * プレビュー反映 lite の入力補助（DOM 非依存）。
 * URL からのアプリID読み取り、ルックアップ変換の記法、進めない理由の説明、反映後の再確認判定を
 * 純粋関数として切り出し、単体テストの対象にする。
 */

import type { ApplySectionOutcome } from './applyOutcome.js';
import { reflectInspectionScopes } from './standalonePlan.js';

export { parseAppReference, guestIdFromPagePath, needsAppReferenceParse, type AppReference } from './appReference.js';

export type LookupMapParseResult =
  | { ok: true; value: Record<string, string>; count: number }
  | { ok: false; error: string };

const LOOKUP_PAIR_SEPARATOR = /\s*(?:→|->|=>|=|:|,|\t)\s*|\s+/;

/**
 * ルックアップ参照アプリIDの変換表を解析する。
 * JSON オブジェクト（{"旧":"新"}）に加えて、1 行 1 組の「旧ID → 新ID」記法を受け付ける。
 * 区切りは →, ->, =>, =, :, カンマ, 空白のいずれか。# で始まる行は無視する。
 */
export function parseLookupMapText(text: string): LookupMapParseResult {
  const trimmed = String(text || '').trim();
  if (!trimmed) return { ok: true, value: {}, count: 0 };
  const pairs: Array<[string, string]> = [];
  if (trimmed.startsWith('{')) {
    let parsed: unknown;
    try { parsed = JSON.parse(trimmed); } catch {
      return { ok: false, error: '参照先変換の JSON が壊れています。{"旧AppID":"新AppID"} 形式か、1 行ずつ「旧ID → 新ID」で入力してください。' };
    }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return { ok: false, error: '参照先変換は {"旧AppID":"新AppID"} 形式のJSONを入力してください。' };
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) pairs.push([key, String(value)]);
  } else {
    for (const [index, line] of trimmed.split(/\r?\n/).entries()) {
      const body = line.trim();
      if (!body || body.startsWith('#')) continue;
      const parts = body.split(LOOKUP_PAIR_SEPARATOR).filter(Boolean);
      if (parts.length !== 2) return { ok: false, error: `参照先変換の ${index + 1} 行目を読み取れません。「旧ID → 新ID」の形式で入力してください。` };
      pairs.push([parts[0], parts[1]]);
    }
  }
  const out: Record<string, string> = Object.create(null);
  for (const [from, to] of pairs) {
    if (!/^[1-9]\d*$/.test(from) || !/^[1-9]\d*$/.test(to)) return { ok: false, error: `参照先変換のアプリIDには正の整数を指定してください（${from} → ${to}）。` };
    if (out[from] !== undefined && out[from] !== to) return { ok: false, error: `参照先変換で旧ID ${from} が複数の変換先（${out[from]}, ${to}）に指定されています。` };
    out[from] = to;
  }
  return { ok: true, value: out, count: Object.keys(out).length };
}

export function lookupMapError(result: LookupMapParseResult): string {
  return 'error' in result ? result.error : '';
}

export function lookupMapValue(result: LookupMapParseResult): Record<string, string> {
  return 'value' in result ? result.value : {};
}

export interface SetupBlockerInput {
  /** reflectConnectionError の結果（空文字なら接続先は有効） */
  connectionError: string;
  sourceMode: 'app' | 'json';
  hasSourceBundle: boolean;
  scopeCount: number;
  lookupError: string;
}

/**
 * 「差分を確認する」へ進めない理由を利用者向けの 1 文で返す。進める場合は空文字。
 * 入力の並び順（反映元 → 反映先 → 項目 → 詳細設定）に合わせて、最初に直すべきものを返す。
 */
export function describeReflectSetupBlocker(input: SetupBlockerInput): string {
  if (input.sourceMode === 'json' && !input.hasSourceBundle) return '反映元の設定JSONを読み込んでください。';
  if (input.connectionError) return input.connectionError;
  if (!input.scopeCount) return '反映する項目を 1 つ以上選んでください。';
  if (input.lookupError) return `詳細設定の参照先変換に誤りがあります。${input.lookupError}`;
  return '';
}

export interface PostApplyCheckInput {
  /** 再確認で比較した項目数 */
  scopeCount: number;
  /** 差分が残っている項目のラベル */
  changedLabels: string[];
  /** 取得に失敗した項目のラベル */
  errorLabels: string[];
}

export interface PostApplyCheckSummary { tone: 'ok' | 'warn'; message: string }

/** 反映後に差分を再取得した結果を、利用者向けの要約にする。 */
export function summarizePostApplyCheck(input: PostApplyCheckInput): PostApplyCheckSummary {
  const list = (labels: string[]) => labels.slice(0, 5).join('、') + (labels.length > 5 ? ` ほか ${labels.length - 5} 件` : '');
  if (input.errorLabels.length) return { tone: 'warn', message: `反映後の再確認：${input.errorLabels.length} 項目を取得できませんでした（${list(input.errorLabels)}）。取得し直して確認してください。` };
  if (input.changedLabels.length) return { tone: 'warn', message: `反映後の再確認：${input.changedLabels.length} 項目に差分が残っています（${list(input.changedLabels)}）。内容を確認して再反映してください。` };
  return { tone: 'ok', message: `反映後の再確認：${input.scopeCount} 項目はすべて反映元と一致しています。本番への公開は反映先の設定画面で行います。` };
}

// =============================================================================
// 反映する項目の選び方（グループ・説明）
// 項目を増やすときは、このファイルのキー一覧（グループ）と説明を 1 か所足せば、
// 「対象を選ぶ」画面のチップ・説明・「各項目の反映方法」に反映される。
// =============================================================================

export interface ReflectScopeGroupDef { id: string; label: string; keys: string[] }

/** 項目のグループ。ここに載っていない反映可能な項目は「その他」に自動で入る。 */
export const REFLECT_SCOPE_GROUPS: readonly ReflectScopeGroupDef[] = [
  { id: 'form', label: 'フォーム・表示', keys: ['fieldSettings', 'layoutSettings', 'viewSettings', 'reportSettings', 'categories'] },
  { id: 'behavior', label: '動作・カスタマイズ', keys: ['appSettings', 'processSettings', 'actionSettings', 'pluginSettings', 'customizeSettings'] },
  { id: 'access', label: '権限・通知', keys: ['appAcl', 'fieldAcl', 'recordPermissions', 'notifications', 'perRecordNotifications', 'reminderNotifications'] }
];

const REFLECT_OTHER_SCOPE_GROUP: ReflectScopeGroupDef = { id: 'other', label: 'その他', keys: [] };

/** 項目ごとの「何をするか」の説明（docs/preview-reflection.md の「何を保持し、何を置き換えるか」に対応）。 */
export const REFLECT_SCOPE_HINTS: Record<string, string> = {
  appSettings: 'テーマ、レコードのタイトル、サムネイル表示、一括削除、コメント機能、レコードの再利用、一覧でのインライン編集、数値の桁数と丸め、年度の開始月を反映元に合わせます。アプリ名・説明・アイコンは変えません。',
  fieldSettings: '不足しているフィールドを追加し、変更のある定義だけ更新します。反映先だけのフィールドは保持します。',
  layoutSettings: '配置を反映元に合わせます。反映先だけのフィールドは、フォーム・グループ・テーブルの末尾に保持します。',
  viewSettings: '一覧を追加・更新します。反映先だけの一覧は「保持」の設定に従います。',
  reportSettings: 'グラフを追加・更新します。反映先だけのグラフは「保持」の設定に従います。',
  actionSettings: 'アクションを追加・更新します。反映先だけのアクションは「保持」の設定に従います。',
  pluginSettings: '反映先にまだ無いプラグインだけ追加します。プラグインの設定値はコピーしません。',
  customizeSettings: '適用範囲と、PC・モバイルのJS/CSSファイル一覧を反映元の内容に置き換えます。反映先だけのファイル・URLは外れます。別アプリのファイルは反映先へアップロードして設定します。',
  processSettings: '反映元の内容で置き換えます。状態・アクション・作業者が変わり、運用中の申請に影響することがあります。',
  appAcl: '反映元の内容で置き換えます。反映先だけの権限は削除されます。',
  fieldAcl: '反映元の内容で置き換えます。反映先だけの権限は削除されます。',
  recordPermissions: '反映元の内容で置き換えます。反映先だけの権限は削除されます。',
  notifications: '反映元の内容で置き換えます。反映先だけの通知は削除されます。',
  perRecordNotifications: '反映元の内容で置き換えます。反映先だけの通知は削除されます。',
  reminderNotifications: '反映元の内容で置き換えます。タイムゾーンも反映元に合わせます。',
  categories: '反映元の内容で置き換えます。カテゴリーの有効状態も反映元に合わせます。'
};

export function describeReflectScope(key: string): string {
  return REFLECT_SCOPE_HINTS[key] || '';
}

/** 反映可能な項目のキーを、表示グループへ振り分ける（空のグループは返さない）。 */
export function groupReflectScopes(availableKeys: readonly string[]): ReflectScopeGroupDef[] {
  const available = new Set(availableKeys);
  const placed = new Set<string>();
  const groups = REFLECT_SCOPE_GROUPS.map((group) => {
    const keys = group.keys.filter((key) => available.has(key));
    keys.forEach((key) => placed.add(key));
    return { ...group, keys };
  });
  const rest = availableKeys.filter((key) => !placed.has(key));
  if (rest.length) groups.push({ ...REFLECT_OTHER_SCOPE_GROUP, keys: [...rest] });
  return groups.filter((group) => group.keys.length > 0);
}

/**
 * レイアウト・一覧・グラフ・アクションを選んでいるのにフィールド設定を選んでいないとき true。
 * この場合、反映先に無いフィールドを参照していると差分確認で停止する。
 */
export function shouldWarnMissingFieldSettings(scopes: readonly string[]): boolean {
  if (scopes.includes('fieldSettings')) return false;
  return reflectInspectionScopes([...scopes]).includes('fieldSettings');
}

export const FIELD_SETTINGS_OMITTED_NOTICE = 'フィールド設定を含めない場合、反映先に無いフィールドを参照していると差分確認で停止します。';

// =============================================================================
// 差分確認: 反映先に無いフィールドの参照
// =============================================================================

export interface MissingFieldReference {
  sectionKey: string;
  label: string;
  code: string;
  /** 反映元にもあるか。フィールド設定を選んでいないと反映元のフィールドは取得されないため、不明なときは undefined。 */
  inSource: boolean | undefined;
}

interface FieldDependencyEntry { sectionKey: string; label: string; blockers: string[]; requiredFields?: string[] }

/**
 * 選択中の項目が参照するフィールドのうち、反映先に存在しないものを構造的に求める
 * （reflectSelectionBlockers と同じ考え方。メッセージの文字列には依存しない）。
 * inSource は「反映元にはある」＝フィールド設定も反映すれば解消できることを示す
 * （反映元のフィールドコードを取得していないときは undefined）。
 */
export function findMissingFieldReferences(
  entries: readonly FieldDependencyEntry[],
  scopes: readonly string[],
  sourceFieldCodes: readonly string[],
  targetFieldCodes: readonly string[],
  sourceSystemFieldCodes: readonly string[] = []
): MissingFieldReference[] {
  const selected = entries.filter((entry) => scopes.includes(entry.sectionKey));
  // 反映元のシステムフィールド（レコード番号・ステータスなど）は、フィールド設定の反映では追加されない。
  const fieldEntry = selected.find((entry) => entry.sectionKey === 'fieldSettings');
  const sourceCodes = new Set(sourceFieldCodes);
  const systemCodes = new Set(sourceSystemFieldCodes);
  const available = new Set([...targetFieldCodes, ...(scopes.includes('fieldSettings') && !fieldEntry?.blockers.length ? sourceFieldCodes : [])]);
  const out: MissingFieldReference[] = [];
  for (const entry of selected) {
    for (const code of entry.requiredFields || []) {
      if (!available.has(code)) out.push({ sectionKey: entry.sectionKey, label: entry.label, code, inSource: systemCodes.has(code) ? false : sourceCodes.size ? sourceCodes.has(code) : undefined });
    }
  }
  return out;
}

/**
 * 「フィールド設定も反映対象に含めて再取得」を案内できるか。
 * フィールド設定が未選択で、不足フィールドがあり、反映元に無いと分かっているものだけではないとき。
 */
export function canResolveByIncludingFieldSettings(missing: readonly MissingFieldReference[], scopes: readonly string[]): boolean {
  return !scopes.includes('fieldSettings') && missing.some((item) => item.inSource !== false);
}

// =============================================================================
// 反映結果: セクション別の表示
// =============================================================================

export interface ApplySectionDisplay { icon: string; text: '成功' | '失敗' | '途中で停止' | '変更なし' | '未実行'; tone: 'ok' | 'ng' | 'skip' | 'pending' }

/** stopped は、利用者の「中止」で途中で止まった項目（失敗ではなく「途中で停止」と示す）。 */
export function describeApplySectionStatus(status: string, stopped = false): ApplySectionDisplay {
  if (status === 'ng' && stopped) return { icon: '■', text: '途中で停止', tone: 'ng' };
  if (status === 'ok') return { icon: '✓', text: '成功', tone: 'ok' };
  if (status === 'ng') return { icon: '✕', text: '失敗', tone: 'ng' };
  if (status === 'skip') return { icon: '－', text: '変更なし', tone: 'skip' };
  return { icon: '○', text: '未実行', tone: 'pending' };
}

/** 保存済みの結果（型は unknown[]）から、表示できるセクションだけを取り出す。 */
export function normalizeApplySections(sections: unknown): ApplySectionOutcome[] {
  if (!Array.isArray(sections)) return [];
  const out: ApplySectionOutcome[] = [];
  for (const item of sections) {
    if (!item || typeof item !== 'object') continue;
    const raw = item as Record<string, unknown>;
    const sectionKey = typeof raw.sectionKey === 'string' ? raw.sectionKey : '';
    const label = typeof raw.label === 'string' ? raw.label : '';
    if (!sectionKey && !label) continue;
    const status = raw.status === 'ok' || raw.status === 'ng' || raw.status === 'skip' || raw.status === 'pending' ? raw.status : 'pending';
    out.push({ sectionKey, label, status, ...(typeof raw.message === 'string' && raw.message ? { message: raw.message } : {}), ...(status === 'ng' && raw.stopped === true ? { stopped: true } : {}) });
  }
  return out;
}

export const REFLECT_UNDO_GUIDANCE = '取り消す場合: 反映前に反映先プレビューへ未公開の変更が無ければ、アプリの設定画面の『変更を中止』で今回の反映を含む未公開の変更をすべて破棄できます。または自動保存したバックアップJSONを『設定JSONから取得』で反映元に読み込み、差分を確認して戻せます（追加したフィールドは削除されません）。';
