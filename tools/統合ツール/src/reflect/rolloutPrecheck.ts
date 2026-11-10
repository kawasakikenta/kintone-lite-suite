'use strict';

// =============================================================================
// 「続けて反映する反映先」の一括事前確認（DOM・API 非依存）。
// 全反映先について差分だけを先に取得して一覧にする（読み取りだけ。プレビューにも書き込まない）。
// 反映先ごとの行は要約だけを持ち、設定本体は保持しない（1000 件でも固まらない）。
// 反映先ごとの差分確認と最終確認は、反映のときに今までどおり必要。
// =============================================================================

import { withoutApiContextLines } from '../utils.js';
import { isRunCancelledError } from '../runControl.js';
import type { AppReference } from './appReference.js';
import { findMissingFieldReferences } from './liteSetup.js';
import { reflectSectionLabel } from './sections.js';
import { reflectSelectionBlockers, type ReflectSectionPlan } from './standalonePlan.js';
import { escapeReflectMarkdown } from './planReport.js';
import type { ReflectTargetPending } from './targetPending.js';

/**
 * diff: 差分あり / same: 差分なし（一致） / attention: 確認が必要（種類の違い・参照するフィールドの不足など、そのままでは反映できない項目がある）
 * error: 取得失敗（反映先または反映元の設定を取得できなかった。「差分なし」とは扱わない） / notrun: 未実行（中止）
 */
export type RolloutPrecheckState = 'diff' | 'same' | 'attention' | 'error' | 'notrun';

export const ROLLOUT_PRECHECK_STATE_LABELS: Record<RolloutPrecheckState, string> = {
  diff: '差分あり',
  same: '差分なし（一致）',
  attention: '確認が必要',
  error: '取得失敗',
  notrun: '未実行（中止）'
};

/** 画面の絞り込みの選択肢（all 以外は状態と同じ）。 */
export type RolloutPrecheckFilter = 'all' | RolloutPrecheckState;

/** 行に残す項目名の上限（反映できる項目は十数個なので実際には切り詰めない。異常な入力への備え）。 */
const LABEL_LIMIT = 24;
/** 行に残す理由の長さの上限。 */
const REASON_LIMIT = 160;

/** 一括事前確認の 1 反映先ぶんの要約。設定本体・差分の中身は持たない。 */
export interface RolloutPrecheckRow {
  appId: string;
  guestId: string;
  /** 反映先のアプリ名（確認できなかったときは空） */
  name: string;
  state: RolloutPrecheckState;
  /** 差分のある項目の表示名 */
  changedLabels: string[];
  /** そのままでは反映できない（確認が必要な）項目の表示名 */
  attentionLabels: string[];
  changeCount: number;
  removalCount: number;
  /** 反映先プレビューの以前からの未公開の変更（clean: なし / own: このツールの反映分だけ / pending: あり / unknown: 確認できない / 空: 確認していない） */
  pending: ReflectTargetPending['state'] | '';
  /** 未公開の変更がある項目の表示名 */
  pendingLabels: string[];
  /** 取得失敗・確認が必要・未実行の理由（1 行） */
  reason: string;
  /** 参照先変換の候補（反映元と反映先で参照先が違うもの）と、食い違いの件数 */
  lookupCandidates: number;
  lookupConflicts: number;
  /** この行を確認した時刻（ms） */
  at: number;
}

export const rolloutRowKey = (target: AppReference): string => `${target.guestId || ''}:${target.appId}`;

const firstLine = (message: unknown, limit = REASON_LIMIT): string => {
  const line = withoutApiContextLines(message).split('\n').map(item => item.trim()).find(Boolean) || '';
  return Array.from(line).length > limit ? `${Array.from(line).slice(0, limit - 1).join('')}…` : line;
};

const unique = <T,>(values: T[]) => [...new Set(values)];

/** 一括事前確認で使う、差分取得の結果のうち要約に必要な部分（PreviewReflectResult の部分集合。DOM・API に依存しないようにする）。 */
export interface RolloutPreviewSummaryInput {
  entries: ReflectSectionPlan[];
  sourceFieldCodes: string[];
  targetFieldCodes: string[];
  sourceSystemFieldCodes: string[];
  targetPending?: ReflectTargetPending;
  lookupCandidates?: { candidates: unknown[]; conflicts: unknown[] };
}

/**
 * 差分取得の結果から、反映先 1 件ぶんの行を作る（純粋。通信しない）。
 * 取得失敗（設定を取得できなかった項目がある）を「差分なし」と表示しないよう、状態は 取得失敗 > 確認が必要 > 差分あり > 差分なし の順に決める。
 */
export function summarizeRolloutPreview(target: AppReference & { name?: string }, preview: RolloutPreviewSummaryInput, scopes: string[], at: number): RolloutPrecheckRow {
  const entries = preview.entries.filter(entry => scopes.includes(entry.sectionKey));
  const fetchFailed = entries.filter(entry => entry.status === 'src-missing' || entry.status === 'tgt-missing');
  const blocked = entries.filter(entry => entry.status === 'error' || (entry.blockers.length > 0 && !fetchFailed.includes(entry)));
  const issues = reflectSelectionBlockers(entries, scopes, preview.sourceFieldCodes, preview.targetFieldCodes, preview.sourceSystemFieldCodes);
  const missing = findMissingFieldReferences(entries, scopes, preview.sourceFieldCodes, preview.targetFieldCodes, preview.sourceSystemFieldCodes);
  const attentionLabels = unique([...blocked.map(entry => entry.label), ...missing.map(item => item.label)]);
  const changed = entries.filter(entry => entry.status === 'change');
  let state: RolloutPrecheckState = changed.length ? 'diff' : 'same';
  let reason = '';
  if (attentionLabels.length || issues.length) {
    state = 'attention';
    reason = firstLine(issues[0] || blocked[0]?.blockers[0] || blocked[0]?.message);
  }
  if (fetchFailed.length) {
    state = 'error';
    reason = firstLine(fetchFailed[0].message);
  }
  const pending = preview.targetPending;
  return {
    appId: target.appId, guestId: target.guestId || '', name: target.name || '', state,
    changedLabels: changed.map(entry => entry.label).slice(0, LABEL_LIMIT),
    attentionLabels: unique([...fetchFailed.map(entry => entry.label), ...attentionLabels]).slice(0, LABEL_LIMIT),
    changeCount: changed.reduce((sum, entry) => sum + entry.changeCount, 0),
    removalCount: changed.reduce((sum, entry) => sum + entry.removalCount, 0),
    pending: pending?.state || '',
    pendingLabels: pending?.state === 'pending' ? pending.sectionKeys.map(reflectSectionLabel).slice(0, LABEL_LIMIT) : [],
    reason,
    lookupCandidates: preview.lookupCandidates?.candidates.length || 0,
    lookupConflicts: preview.lookupCandidates?.conflicts.length || 0,
    at
  };
}

/** 差分の取得そのものが失敗した反映先の行（取得失敗）。 */
export function rolloutFailureRow(target: AppReference & { name?: string }, error: unknown, at: number): RolloutPrecheckRow {
  const message = error instanceof Error ? error.message : typeof error === 'object' && error && 'message' in error ? String((error as any).message) : String(error);
  return {
    appId: target.appId, guestId: target.guestId || '', name: target.name || '', state: 'error', changedLabels: [], attentionLabels: [],
    changeCount: 0, removalCount: 0, pending: '', pendingLabels: [], reason: firstLine(message) || '設定を取得できませんでした', lookupCandidates: 0, lookupConflicts: 0, at
  };
}

/** 中止のため確認しなかった反映先の行（未実行（中止））。失敗には数えない。 */
export function rolloutNotRunRow(target: AppReference & { name?: string }, at: number): RolloutPrecheckRow {
  return {
    appId: target.appId, guestId: target.guestId || '', name: target.name || '', state: 'notrun', changedLabels: [], attentionLabels: [],
    changeCount: 0, removalCount: 0, pending: '', pendingLabels: [], reason: '中止したため確認していません', lookupCandidates: 0, lookupConflicts: 0, at
  };
}

export interface RolloutPrecheckRunOptions {
  /** 同時に確認する反映先の数（既定 3） */
  concurrency?: number;
  /** 1 件終わるたびに呼ぶ（完了数, 全体, 直近の行） */
  onProgress?: (done: number, total: number, row: RolloutPrecheckRow) => void;
  /** 時刻の供給（テスト用） */
  now?: () => number;
  /** 中止の要求を確認する（runControl の isCancelRequested を渡す）。中止後は新しい反映先の確認を始めない */
  isCancelled?: () => boolean;
}

/**
 * 反映先を順に確認して行を作る。結果は targets と同じ順序で返す。
 * check が例外を投げたときは、中止なら以降を「未実行（中止）」に、それ以外はその反映先を「取得失敗」にして続ける
 * （1 件の失敗で全体を止めない。1 件の中止を N 件の失敗にしない）。
 */
export async function runRolloutPrecheck<T extends AppReference>(
  targets: readonly T[],
  check: (target: T, index: number) => Promise<RolloutPrecheckRow>,
  options: RolloutPrecheckRunOptions = {}
): Promise<RolloutPrecheckRow[]> {
  const now = options.now ?? Date.now;
  const rows: Array<RolloutPrecheckRow | undefined> = new Array(targets.length).fill(undefined);
  let next = 0, done = 0, cancelled = false;
  const finish = (index: number, row: RolloutPrecheckRow) => {
    rows[index] = row;
    done += 1;
    try { options.onProgress?.(done, targets.length, row); } catch { /* 表示側の例外で確認を止めない */ }
  };
  const worker = async () => {
    while (next < targets.length) {
      const index = next++;
      const target = targets[index];
      if (cancelled || options.isCancelled?.()) { cancelled = true; finish(index, rolloutNotRunRow(target, now())); continue; }
      try {
        finish(index, await check(target, index));
      } catch (error) {
        if (isRunCancelledError(error)) { cancelled = true; finish(index, rolloutNotRunRow(target, now())); }
        else finish(index, rolloutFailureRow(target, error, now()));
      }
    }
  };
  const width = Math.max(1, Math.min(Math.floor(options.concurrency ?? 3), targets.length || 1));
  await Promise.all(Array.from({ length: width }, worker));
  return rows as RolloutPrecheckRow[];
}

export interface RolloutPrecheckCounts { total: number; diff: number; same: number; attention: number; error: number; notrun: number; withPending: number; withLookupCandidates: number }

export function countRolloutPrecheck(rows: readonly RolloutPrecheckRow[]): RolloutPrecheckCounts {
  const counts: RolloutPrecheckCounts = { total: rows.length, diff: 0, same: 0, attention: 0, error: 0, notrun: 0, withPending: 0, withLookupCandidates: 0 };
  for (const row of rows) {
    counts[row.state] += 1;
    if (row.pending === 'pending') counts.withPending += 1;
    if (row.lookupCandidates + row.lookupConflicts > 0) counts.withLookupCandidates += 1;
  }
  return counts;
}

/** 画面の絞り込み。元の順序を保つ。 */
export function filterRolloutPrecheckRows(rows: readonly RolloutPrecheckRow[], filter: RolloutPrecheckFilter): RolloutPrecheckRow[] {
  return filter === 'all' ? [...rows] : rows.filter(row => row.state === filter);
}

/** 行を新しい確認結果で置き換える（反映先ごとに 1 行。順序は元のまま、新しい反映先は末尾へ加える）。 */
export function mergeRolloutPrecheckRows(previous: readonly RolloutPrecheckRow[], updates: readonly RolloutPrecheckRow[]): RolloutPrecheckRow[] {
  const byKey = new Map(updates.map(row => [rolloutRowKey(row), row]));
  const seen = new Set<string>();
  const merged = previous.map(row => { const key = rolloutRowKey(row); seen.add(key); return byKey.get(key) ?? row; });
  for (const row of updates) if (!seen.has(rolloutRowKey(row))) merged.push(row);
  return merged;
}

/** 指定した反映先（現在の反映先と続けて反映する反映先）の行だけを、その順序で取り出す。確認していない反映先の数も返す。 */
export function selectRolloutPrecheckRows(rows: readonly RolloutPrecheckRow[], targets: readonly AppReference[]): { rows: RolloutPrecheckRow[]; unchecked: AppReference[] } {
  const byKey = new Map(rows.map(row => [rolloutRowKey(row), row]));
  const found: RolloutPrecheckRow[] = [], unchecked: AppReference[] = [];
  for (const target of targets) {
    const row = byKey.get(rolloutRowKey(target));
    if (row) found.push(row); else unchecked.push(target);
  }
  return { rows: found, unchecked };
}

/** 「差分なし（一致）」と確認できた反映先を取り除く。確認していない反映先・取得失敗・確認が必要な反映先は残す。 */
export function dropSameRolloutTargets<T extends AppReference>(targets: readonly T[], rows: readonly RolloutPrecheckRow[]): { kept: T[]; removed: T[] } {
  const same = new Set(rows.filter(row => row.state === 'same').map(rolloutRowKey));
  const kept: T[] = [], removed: T[] = [];
  for (const target of targets) (same.has(rolloutRowKey(target)) ? removed : kept).push(target);
  return { kept, removed };
}

/** 確認し直す反映先（取得失敗と未実行（中止））。 */
export function rolloutRetryTargets(rows: readonly RolloutPrecheckRow[]): AppReference[] {
  return rows.filter(row => row.state === 'error' || row.state === 'notrun').map(row => ({ appId: row.appId, guestId: row.guestId }));
}

/** 一括確認の結果の 1 行の言い方（状態欄の補足）。 */
export function describeRolloutPrecheckSummary(counts: RolloutPrecheckCounts): string {
  const parts = [`差分あり ${counts.diff}`, `差分なし ${counts.same}`];
  if (counts.attention) parts.push(`確認が必要 ${counts.attention}`);
  if (counts.error) parts.push(`取得失敗 ${counts.error}`);
  if (counts.notrun) parts.push(`未実行（中止） ${counts.notrun}`);
  return `${counts.total} 件を確認しました（${parts.join(' / ')}）。`;
}

/** 反映先の表示（#203 営業所）。 */
export function formatRolloutPrecheckTarget(row: Pick<RolloutPrecheckRow, 'appId' | 'guestId' | 'name'>): string {
  return `#${row.appId}${row.guestId ? `（ゲスト ${row.guestId}）` : ''}${row.name ? ` ${row.name}` : ''}`;
}

/** 未公開の変更の表示用の言葉。 */
export function describeRolloutPrecheckPending(row: Pick<RolloutPrecheckRow, 'pending' | 'pendingLabels'>): string {
  if (row.pending === 'pending') return `あり${row.pendingLabels.length ? `（${row.pendingLabels.join('、')}）` : ''}`;
  if (row.pending === 'clean') return 'なし';
  if (row.pending === 'own') return 'このツールの反映分だけ';
  if (row.pending === 'unknown') return '確認できない';
  return '－';
}

export interface RolloutPrecheckReportInput {
  generatedAt: string;
  source: { appId: string; name: string; guestId: string };
  sourceEnvironment: 'production' | 'preview' | 'json';
  scopes: string[];
  preserveTargetOnly: boolean;
  lookupMap?: Record<string, string>;
  /** 確認した反映先（入力欄の順序） */
  rows: readonly RolloutPrecheckRow[];
  /** 差分がないため、続けて反映する反映先から外した反映先（記録に残す） */
  removed?: readonly RolloutPrecheckRow[];
  /** 確認していない反映先の数（あれば記録に残す） */
  uncheckedCount?: number;
}

const ENVIRONMENT_LABELS: Record<RolloutPrecheckReportInput['sourceEnvironment'], string> = { production: '本番設定', preview: 'プレビュー設定', json: '設定JSON' };
const cell = (value: unknown) => escapeReflectMarkdown(value) || '－';

/**
 * 一括事前確認の結果を、承認依頼や作業記録に貼れる Markdown にする。設定値の生 JSON は含めない。
 * 読み取りだけの確認であり、書き込みも本番への公開もしていないことを冒頭に明記する。
 */
export function buildRolloutPrecheckMarkdown(input: RolloutPrecheckReportInput): string {
  const counts = countRolloutPrecheck(input.rows);
  const lines: string[] = [];
  lines.push('# プレビュー反映 一括事前確認', '');
  const stamp = new Date(input.generatedAt);
  lines.push(`- 作成日時: ${escapeReflectMarkdown(Number.isNaN(stamp.getTime()) ? input.generatedAt : stamp.toLocaleString('ja-JP', { hour12: false }))}`);
  const sourceParts = [`App ${input.source.appId || '－'}`, input.source.guestId ? `ゲストスペース ${input.source.guestId}` : '通常スペース', ENVIRONMENT_LABELS[input.sourceEnvironment] || input.sourceEnvironment];
  lines.push(`- 反映元: ${escapeReflectMarkdown(input.source.name || '（名前なし）')}（${sourceParts.map(escapeReflectMarkdown).join(' / ')}）`);
  lines.push(`- 反映する項目: ${input.scopes.map(key => escapeReflectMarkdown(reflectSectionLabel(key))).join('、') || '－'}`);
  lines.push(`- 反映先だけの一覧・グラフ・アクション: ${input.preserveTargetOnly ? '保持する' : '削除する'}`);
  const lookupPairs = Object.entries(input.lookupMap || {});
  if (lookupPairs.length) lines.push(`- 参照先変換: ${lookupPairs.slice(0, 30).map(([from, to]) => `${escapeReflectMarkdown(from)} → ${escapeReflectMarkdown(to)}`).join('、')}${lookupPairs.length > 30 ? ` ほか ${lookupPairs.length - 30} 件` : ''}`);
  if (input.uncheckedCount) lines.push(`- 確認していない反映先: ${input.uncheckedCount} 件`);
  lines.push('- 読み取りだけの確認です。反映先のプレビューにも書き込んでいません。反映先ごとの差分確認と最終確認は、反映のときに行います。', '');

  lines.push('## 概要', '');
  lines.push('| 状態 | 反映先の数 |', '| --- | ---: |');
  for (const state of ['diff', 'same', 'attention', 'error', 'notrun'] as const) lines.push(`| ${ROLLOUT_PRECHECK_STATE_LABELS[state]} | ${counts[state]} |`);
  lines.push(`| 合計 | ${counts.total} |`, '');
  if (counts.withPending) lines.push(`- 以前からの未公開の変更がある反映先: ${counts.withPending} 件`);
  if (counts.withLookupCandidates) lines.push(`- 参照先変換の候補がある反映先: ${counts.withLookupCandidates} 件（反映元と反映先で、ルックアップなどの参照先アプリが違います。参照先変換を確認してください）`);
  if (counts.withPending || counts.withLookupCandidates) lines.push('');

  lines.push('## 反映先ごとの結果', '');
  lines.push('| 反映先 | アプリ名 | 状態 | 差分のある項目 | 変更 | 削除 | 未公開の変更 | 補足 |');
  lines.push('| --- | --- | --- | --- | ---: | ---: | --- | --- |');
  for (const row of input.rows) {
    const notes = [row.reason, row.attentionLabels.length && row.state === 'attention' ? `対象: ${row.attentionLabels.join('、')}` : '', row.lookupCandidates + row.lookupConflicts ? '参照先変換の候補あり' : ''].filter(Boolean).join(' / ');
    lines.push(`| ${cell(`#${row.appId}${row.guestId ? `（ゲスト ${row.guestId}）` : ''}`)} | ${cell(row.name)} | ${cell(ROLLOUT_PRECHECK_STATE_LABELS[row.state])} | ${cell(row.changedLabels.join('、'))} | ${row.changeCount} | ${row.removalCount} | ${cell(describeRolloutPrecheckPending(row))} | ${cell(notes)} |`);
  }
  lines.push('');
  if (input.removed?.length) {
    lines.push(`## 差分がないため続けて反映から外した反映先（${input.removed.length} 件）`, '');
    lines.push(input.removed.map(row => escapeReflectMarkdown(formatRolloutPrecheckTarget(row))).join('、'), '');
  }
  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd() + '\n';
}
