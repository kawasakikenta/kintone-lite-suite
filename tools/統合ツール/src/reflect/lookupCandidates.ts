'use strict';

// =============================================================================
// 参照先変換の候補（DOM 非依存）。
// 反映元と反映先の両方にある同じコードのフィールド（ルックアップ・関連レコード一覧）と、同じ名前のアクションから、
// 「反映元の参照先アプリID → 反映先の現在の参照先アプリID」の対応を読み取る。根拠は「反映先の現在の設定がそうなっている」ことだけで、
// アプリ名の類似などからは推測しない。参照先変換を入れ忘れると、反映元（開発用アプリ）の参照先が反映先に書き込まれてしまうため、差分確認で気づけるようにする。
// =============================================================================

/** 候補に添える根拠の件数の上限（画面と Markdown が長くならないよう、残りは件数だけ示す）。 */
const SOURCE_NAME_LIMIT = 5;

export interface LookupCandidateTarget {
  /** 反映先の現在の参照先アプリID */
  to: string;
  /** 根拠になったフィールド・アクションの数 */
  total: number;
  /** 根拠の名前（先頭 SOURCE_NAME_LIMIT 件。例: ルックアップ「顧客名（customer）」） */
  sources: string[];
}

/** 反映元の参照先ごとに、反映先の現在の参照先が 1 つに定まったもの。 */
export interface LookupMapCandidate extends LookupCandidateTarget {
  /** 反映元の参照先アプリID（参照先変換の「旧ID」） */
  from: string;
}

/** 反映元の参照先ごとに、反映先の現在の参照先が複数ある（食い違う）もの。自動では参照先変換に入れない。 */
export interface LookupMapConflict {
  from: string;
  targets: LookupCandidateTarget[];
}

export interface LookupMapCandidates {
  candidates: LookupMapCandidate[];
  conflicts: LookupMapConflict[];
}

export interface LookupCandidateInput {
  /** 反映元・反映先のフィールド設定（`properties` を持つセクション。取得できていなければ省略） */
  sourceFields?: any;
  targetFields?: any;
  /** 反映元・反映先のアクション設定（`actions` を持つセクション） */
  sourceActions?: any;
  targetActions?: any;
  /** 利用者が入力済みの参照先変換。旧IDが入っているものは候補にしない（上書きしない） */
  lookupMap?: Record<string, string>;
  /** フィールドコード → 表示名。根拠の表示に使う */
  fieldLabels?: Record<string, string>;
}

const own = (object: object, key: string) => Object.prototype.hasOwnProperty.call(object, key);
const isObject = (value: any): value is Record<string, any> => !!value && typeof value === 'object' && !Array.isArray(value);
const appIdOf = (value: any): string => {
  const id = value === undefined || value === null ? '' : String(value).trim();
  return /^[1-9]\d*$/.test(id) ? id : '';
};

interface Observation { from: string; to: string; source: string }

/** 同じコードのフィールドの参照先（ルックアップ・関連レコード一覧）を並べて観測する。テーブル内のフィールドも同じコード同士で比べる。 */
function observeFields(source: Record<string, any>, target: Record<string, any>, labelOf: (code: string) => string, out: Observation[]) {
  for (const [code, sourceDef] of Object.entries(source)) {
    if (!own(target, code) || !isObject(sourceDef) || !isObject(target[code])) continue;
    const targetDef = target[code];
    for (const holder of ['lookup', 'referenceTable'] as const) {
      const from = appIdOf(sourceDef[holder]?.relatedApp?.app), to = appIdOf(targetDef[holder]?.relatedApp?.app);
      if (from && to) out.push({ from, to, source: `${holder === 'lookup' ? 'ルックアップ' : '関連レコード一覧'}「${labelOf(code)}」` });
    }
    if (sourceDef.type === 'SUBTABLE' && targetDef.type === 'SUBTABLE' && isObject(sourceDef.fields) && isObject(targetDef.fields)) observeFields(sourceDef.fields, targetDef.fields, labelOf, out);
  }
}

/** 同じ名前のアクションのコピー先アプリ。 */
function observeActions(source: Record<string, any>, target: Record<string, any>, out: Observation[]) {
  for (const [name, sourceAction] of Object.entries(source)) {
    if (!own(target, name) || !isObject(sourceAction) || !isObject(target[name])) continue;
    const from = appIdOf(sourceAction.destApp?.app), to = appIdOf(target[name].destApp?.app);
    if (from && to) out.push({ from, to, source: `アクション「${name}」` });
  }
}

/**
 * 参照先変換の候補を求める（通信しない）。
 * 反映元の参照先 ID ごとに、反映先の現在の参照先を集める。反映先の参照先が 1 つで、反映元と異なれば候補。
 * 反映先に反映元と同じ参照先のものも混ざる（同じ ID を指すフィールドが他にもある）ときは、変換すると差分が増えるため、食い違いとして扱う。
 * 利用者が入力済みの旧IDは対象にしない。
 */
export function findLookupMapCandidates(input: LookupCandidateInput): LookupMapCandidates {
  const observations: Observation[] = [];
  const labelOf = (code: string) => {
    const label = input.fieldLabels?.[code];
    return label && label !== code ? `${label}（${code}）` : code;
  };
  if (isObject(input.sourceFields?.properties) && isObject(input.targetFields?.properties)) observeFields(input.sourceFields.properties, input.targetFields.properties, labelOf, observations);
  if (isObject(input.sourceActions?.actions) && isObject(input.targetActions?.actions)) observeActions(input.sourceActions.actions, input.targetActions.actions, observations);
  const entered = new Set(Object.keys(input.lookupMap || {}));
  const byFrom = new Map<string, Map<string, { total: number; sources: string[] }>>();
  for (const { from, to, source } of observations) {
    if (entered.has(from)) continue;
    const targets = byFrom.get(from) ?? new Map<string, { total: number; sources: string[] }>();
    const entry = targets.get(to) ?? { total: 0, sources: [] };
    entry.total += 1;
    if (entry.sources.length < SOURCE_NAME_LIMIT && !entry.sources.includes(source)) entry.sources.push(source);
    targets.set(to, entry);
    byFrom.set(from, targets);
  }
  const result: LookupMapCandidates = { candidates: [], conflicts: [] };
  const byNumber = (a: string, b: string) => Number(a) - Number(b);
  for (const from of [...byFrom.keys()].sort(byNumber)) {
    const targets = byFrom.get(from)!;
    const list = [...targets.keys()].sort(byNumber).map((to) => ({ to, ...targets.get(to)! }));
    if (list.length === 1) {
      if (list[0].to !== from) result.candidates.push({ from, ...list[0] });
    } else result.conflicts.push({ from, targets: list });
  }
  return result;
}

/** 候補が 1 件でもあるか（結果へ載せるかの判定）。 */
export function hasLookupCandidates(result: LookupMapCandidates | undefined): boolean {
  return !!result && (result.candidates.length > 0 || result.conflicts.length > 0);
}

/**
 * 参照先変換の入力欄の文字列へ、候補を「旧ID → 新ID」の行として加える。入力済みの内容は上書きしない。
 * {"旧AppID":"新AppID"} 形式で入力されているときは、その形式のまま加える。戻り値は新しい入力欄の文字列と、実際に加えた件数。
 */
export function appendLookupMapCandidates(text: string, candidates: ReadonlyArray<{ from: string; to: string }>): { text: string; added: number } {
  const trimmed = String(text || '').trim();
  if (trimmed.startsWith('{')) {
    let parsed: unknown;
    try { parsed = JSON.parse(trimmed); } catch { return { text, added: 0 }; }
    if (!isObject(parsed)) return { text, added: 0 };
    const next: Record<string, unknown> = { ...parsed };
    let added = 0;
    for (const { from, to } of candidates) if (!own(next, from)) { next[from] = to; added += 1; }
    return added ? { text: JSON.stringify(next, null, 2), added } : { text, added: 0 };
  }
  const existing = new Set(trimmed.split(/\r?\n/).map(line => line.trim()).filter(line => line && !line.startsWith('#')).map(line => line.split(/\s*(?:→|->|=>|=|:|,|\t)\s*|\s+/).filter(Boolean)[0]));
  const lines = candidates.filter(({ from }) => !existing.has(from)).map(({ from, to }) => `${from} → ${to}`);
  if (!lines.length) return { text, added: 0 };
  const head = String(text || '').replace(/\s+$/, '');
  return { text: head ? `${head}\n${lines.join('\n')}` : lines.join('\n'), added: lines.length };
}

/** 画面と Markdown に出す 1 行の説明（例: 「101 → 201（ルックアップ「顧客」ほか 2 件）」）。名前は分かる範囲で添える。 */
export function describeLookupCandidate(candidate: LookupMapCandidate, names: { from?: string; to?: string } = {}): string {
  const idText = (id: string, name?: string) => name ? `${id}（${name}）` : id;
  const sources = candidate.sources.join('、') + (candidate.total > candidate.sources.length ? ` ほか ${candidate.total - candidate.sources.length} 件` : '');
  return `${idText(candidate.from, names.from)} → ${idText(candidate.to, names.to)}（${sources}）`;
}
