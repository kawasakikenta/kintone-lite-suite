'use strict';

/**
 * 「反映元アプリから本番へ」の画面で使う表示用の純粋関数（DOM・API 非依存）。
 * 変更の絞り込み・グループ化・選択の連動（requires）、進めない理由、最終確認と結果の文言を置く。
 */

import { summarizeApplyOutcome, type ApplySectionOutcome } from '../reflect/applyOutcome.js';
import { REFLECT_ITEM_KIND_ORDER, describeRemovedItem, describeUndoGuidance } from '../reflect/applyProgress.js';
import type { ReflectItemSummary } from '../reflect/changeSummary.js';
import type { ReflectTargetPending } from '../reflect/targetPending.js';
import type { ComposedReflectSelection, ComposedSection, SectionSelectionModel, SectionSelectionState, SelectableChange, SelectableKind } from '../reflect/selectionTypes.js';
import type { ReflectSectionPlan } from '../reflect/standalonePlan.js';
import { undoGuidance } from './display.js';
import type { SourceDeployGoal } from './sourceTypes.js';

// =============================================================================
// 変更の絞り込み・グループ化
// =============================================================================

export type KindFilter = 'all' | SelectableKind;

export interface ChangeFilter { keyword: string; kind: KindFilter }

const searchCache = new WeakMap<SelectableChange, string>();

/** 場所・種類・前後の値をまとめた検索用の文字列（小文字。変更ごとに 1 回だけ作る）。 */
export function changeSearchText(change: SelectableChange): string {
  let text = searchCache.get(change);
  if (text === undefined) {
    text = [change.groupLabel, ...change.labelPath, change.kind, change.beforeText, change.afterText].join('\n').toLowerCase();
    searchCache.set(change, text);
  }
  return text;
}

export function isFilterActive(filter: ChangeFilter): boolean {
  return !!filter.keyword.trim() || filter.kind !== 'all';
}

/** キーワード（空白区切りの AND）と種類で絞り込む。 */
export function filterChanges(changes: readonly SelectableChange[], filter: ChangeFilter): SelectableChange[] {
  const words = filter.keyword.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length && filter.kind === 'all') return [...changes];
  return changes.filter((change) => (filter.kind === 'all' || change.kind === filter.kind)
    && (!words.length || words.every((word) => changeSearchText(change).includes(word))));
}

export interface ChangeGroup { groupId: string; groupLabel: string; changes: SelectableChange[] }

/** groupId ごとにまとめる（最初に現れた順）。 */
export function groupChanges(changes: readonly SelectableChange[]): ChangeGroup[] {
  const groups = new Map<string, ChangeGroup>();
  for (const change of changes) {
    let group = groups.get(change.groupId);
    if (!group) { group = { groupId: change.groupId, groupLabel: change.groupLabel, changes: [] }; groups.set(change.groupId, group); }
    group.changes.push(change);
  }
  return [...groups.values()];
}

export type GroupCheckState = 'all' | 'some' | 'none';

export function groupCheckState(changes: readonly SelectableChange[], selected: ReadonlySet<string>): GroupCheckState {
  let count = 0;
  for (const change of changes) if (selected.has(change.id)) count += 1;
  return count === 0 ? 'none' : count === changes.length ? 'all' : 'some';
}

export function describePath(change: Pick<SelectableChange, 'labelPath' | 'groupLabel'>): string {
  return change.labelPath.length ? change.labelPath.join(' / ') : change.groupLabel;
}

/** 長い値は先頭だけ示す（画面の行で使う。全文は title などで補う）。 */
export function clipText(text: string, max = 160): string {
  const value = String(text ?? '');
  return value.length > max ? `${value.slice(0, max)}…` : value;
}

// =============================================================================
// 選択の連動（requires）
// =============================================================================

export interface RequirementIndex {
  byId: Map<string, SelectableChange>;
  /** id を requires に持つ変更の id */
  dependents: Map<string, string[]>;
}

export function buildRequirementIndex(models: Iterable<Pick<SectionSelectionModel, 'changes'>>): RequirementIndex {
  const byId = new Map<string, SelectableChange>();
  const dependents = new Map<string, string[]>();
  for (const model of models) for (const change of model.changes) byId.set(change.id, change);
  for (const change of byId.values()) {
    for (const required of change.requires || []) {
      if (!byId.has(required)) continue;
      const list = dependents.get(required);
      if (list) list.push(change.id); else dependents.set(required, [change.id]);
    }
  }
  return { byId, dependents };
}

/** ids を選ぶときに、一緒に選ぶ必要がある変更（requires の推移的な閉包）のうち、まだ選んでいないものを返す（ids 自身は含めない）。 */
export function requiredToSelect(ids: readonly string[], index: RequirementIndex, selected: ReadonlySet<string>): string[] {
  const seen = new Set<string>(ids);
  const added: string[] = [];
  const queue = [...ids];
  while (queue.length) {
    const change = index.byId.get(queue.pop()!);
    for (const required of change?.requires || []) {
      if (seen.has(required) || !index.byId.has(required)) continue;
      seen.add(required);
      if (!selected.has(required)) added.push(required);
      queue.push(required);
    }
  }
  return added;
}

/** ids を外すときに、それを必要とするため一緒に外す変更（選択中のものだけ）を返す（ids 自身は含めない）。 */
export function dependentsToDeselect(ids: readonly string[], index: RequirementIndex, selected: ReadonlySet<string>): string[] {
  const seen = new Set<string>(ids);
  const removed: string[] = [];
  const queue = [...ids];
  while (queue.length) {
    for (const dependent of index.dependents.get(queue.pop()!) || []) {
      if (seen.has(dependent)) continue;
      seen.add(dependent);
      if (selected.has(dependent)) removed.push(dependent);
      queue.push(dependent);
    }
  }
  return removed;
}

/** 「〇〇も一緒に選びます」の表示用。requires の変更の場所を並べる。 */
export function describeRequires(change: SelectableChange, index: RequirementIndex): string {
  const names = (change.requires || []).map((id) => index.byId.get(id)).filter((item): item is SelectableChange => !!item).map((item) => describePath(item));
  if (!names.length) return '';
  const shown = names.slice(0, 3).join('、');
  return `選ぶと一緒に選ばれる変更: ${shown}${names.length > 3 ? ` ほか ${names.length - 3} 件` : ''}`;
}

// =============================================================================
// 抽出結果の要約と、進めない理由
// =============================================================================

export type EntryTone = 'change' | 'same' | 'error';

export function entryTone(entry: Pick<ReflectSectionPlan, 'status'>): EntryTone {
  return entry.status === 'change' || entry.status === 'same' ? entry.status : 'error';
}

export interface ExtractionCounts { change: number; same: number; error: number; changes: number }

/** 項目ごとの状態の件数と、変更の合計。scopes を渡すと、その項目だけを数える。 */
export function countExtraction(entries: readonly Pick<ReflectSectionPlan, 'status' | 'sectionKey' | 'changeCount'>[], scopes?: readonly string[]): ExtractionCounts {
  const counts: ExtractionCounts = { change: 0, same: 0, error: 0, changes: 0 };
  for (const entry of entries) {
    if (scopes && !scopes.includes(entry.sectionKey)) continue;
    counts[entryTone(entry)] += 1;
    if (entry.status === 'change') counts.changes += entry.changeCount || 0;
  }
  return counts;
}

export function describeExtractionSummary(counts: ExtractionCounts): string {
  if (!counts.change && !counts.error) return '差分はありません。反映先は反映元と同じ設定です。';
  const parts = [`差分のある項目 ${counts.change}`, `差分なし ${counts.same}`];
  if (counts.error) parts.push(`取得失敗 ${counts.error}`);
  return `${parts.join('・')}（変更 ${counts.changes} 件）。`;
}

export interface SelectionBlockerInput {
  entries: readonly ReflectSectionPlan[];
  activeScopes: readonly string[];
  models: Readonly<Record<string, SectionSelectionModel | undefined>>;
  composed: ComposedReflectSelection | null;
}

export interface SelectionBlockerResult {
  /** 項目の取得失敗・書き込めない項目（外すか、抽出し直す） */
  failed: Array<{ sectionKey: string; label: string; message: string }>;
  /** 選んだ内容の問題（参照するフィールドの不足など。composed.blockers と各項目の errors） */
  problems: string[];
  /** problems のうち、選んだ変更の組み合わせの問題（参照するフィールドの不足など）。JSON の形式などの修正内容の問題は含まない */
  references: string[];
  /** 選んだ変更が 1 つも無い */
  empty: boolean;
}

/** 段階 2・3 で次へ進めない理由。 */
export function collectSelectionBlockers(input: SelectionBlockerInput): SelectionBlockerResult {
  const active = new Set(input.activeScopes);
  const failed: SelectionBlockerResult['failed'] = [];
  let selectedTotal = 0;
  for (const entry of input.entries) {
    if (!active.has(entry.sectionKey)) continue;
    const model = input.models[entry.sectionKey];
    if (entryTone(entry) === 'error' || (!model && entry.status !== 'same')) {
      const reason = [...(entry.blockers || []), entry.message].filter(Boolean)[0] || '設定を取得できませんでした。';
      failed.push({ sectionKey: entry.sectionKey, label: entry.label, message: String(reason).split('\n')[0] });
    }
  }
  const problems: string[] = [];
  for (const section of input.composed?.sections || []) {
    if (!active.has(section.sectionKey)) continue;
    selectedTotal += section.selectedCount;
    for (const error of section.errors || []) problems.push(`${section.label}: ${error}`);
  }
  for (const blocker of input.composed?.blockers || []) problems.push(blocker);
  return { failed, problems: [...new Set(problems)], references: [...new Set(input.composed?.blockers || [])], empty: !!input.composed && selectedTotal === 0 };
}

/** 「内容の修正」へ進めない理由（取得失敗・選択の組み合わせの問題・何も選んでいない）。JSON の形式などの修正内容の問題は、修正の画面で直せるので含めない。 */
export function firstEditEntryBlockerText(result: SelectionBlockerResult): string {
  if (result.failed.length) return firstBlockerText({ ...result, problems: [] });
  if (result.references.length) return result.references[0];
  if (result.empty) return '反映する差分を選んでください。';
  return '';
}

/** 次へ進めない理由を 1 つの文にする（空なら進める）。 */
export function firstBlockerText(result: SelectionBlockerResult): string {
  if (result.failed.length) return `取得失敗の項目（${result.failed.map((item) => item.label).join('、')}）は、反映しない項目から外すか、差分を抽出し直してください。`;
  if (result.problems.length) return result.problems[0];
  if (result.empty) return '反映する差分を選んでください。';
  return '';
}

// =============================================================================
// 入力の署名（抽出結果の鮮度）
// =============================================================================

export interface SourceSetupSignatureInput {
  sourceKind: 'production' | 'preview' | 'json';
  sourceAppId: string;
  sourceGuestId: string;
  /** 設定JSONを読み込んだときの識別子 */
  jsonToken: string;
  targetAppId: string;
  targetGuestId: string;
  preserveTargetOnly: boolean;
  lookupMap: Record<string, string>;
}

/** 差分の抽出に使った入力の署名。項目（scopes）は含めない（抽出時の項目の部分集合なら、抽出結果を使い続けられる）。 */
export function buildSourceSetupSignature(input: SourceSetupSignatureInput): string {
  const lookupPairs = Object.keys(input.lookupMap || {}).sort().map((key) => [key, input.lookupMap[key]]);
  return JSON.stringify([input.sourceKind, input.sourceAppId, input.sourceGuestId, input.jsonToken, input.targetAppId, input.targetGuestId, !!input.preserveTargetOnly, lookupPairs]);
}

/** 抽出後に、項目の選択だけが変わっても抽出結果を使えるか（現在の項目が抽出時の項目の部分集合か）。 */
export function scopesCoveredBy(current: readonly string[], extracted: readonly string[]): boolean {
  return current.length > 0 && current.every((key) => extracted.includes(key));
}

// =============================================================================
// 最終確認
// =============================================================================

export function sourceRunLabel(goal: SourceDeployGoal): string {
  return goal === 'production' ? '確認した内容を反映先へ書き込み、本番へ反映' : '確認した内容を反映先プレビューへ反映';
}

export function describeRoute(sourceLabel: string, targetLabel: string, goal: SourceDeployGoal): string {
  return goal === 'production'
    ? `${sourceLabel} → ${targetLabel}のプレビュー → ${targetLabel}の本番`
    : `${sourceLabel} → ${targetLabel}のプレビュー（本番へは反映しません）`;
}

export function sourceBackupDescriptions(goal: SourceDeployGoal): string[] {
  const list = ['反映前の反映先プレビューの設定をJSONで保存してから、プレビューへ書き込みます。'];
  if (goal === 'production') list.push('本番へ反映する前の本番設定をJSONで保存してから、本番へ反映します（変更のあるJS/CSSはファイル本体も含む）。');
  return list;
}

export function sourceUndoGuidance(goal: SourceDeployGoal, targetPending?: Pick<ReflectTargetPending, 'state'> | null): string {
  if (goal === 'production') return undoGuidance('deploy');
  return describeUndoGuidance(targetPending).text;
}

/** 「追加 2・変更 3・削除 1」。保持は数えない。変更が無ければ空文字。 */
export function summarizeItemKinds(items: readonly ReflectItemSummary[] | undefined): string {
  const counts: Record<string, number> = {};
  for (const item of items || []) counts[item.kind] = (counts[item.kind] || 0) + 1;
  return REFLECT_ITEM_KIND_ORDER.filter((kind) => kind !== '保持' && counts[kind]).map((kind) => `${kind} ${counts[kind]}`).join('・');
}

export interface RemovedSetting { sectionKey: string; sectionLabel: string; text: string; isField: boolean }

/** 反映で削除される設定（plan.items の削除）。フィールド設定の削除は isField で見分ける。 */
export function collectRemovedSettings(sections: readonly ComposedSection[]): RemovedSetting[] {
  const out: RemovedSetting[] = [];
  for (const section of sections) {
    for (const item of section.plan.items || []) {
      if (item.kind !== '削除') continue;
      out.push({ sectionKey: section.sectionKey, sectionLabel: section.label, text: describeRemovedItem(section.label, item), isField: section.sectionKey === 'fieldSettings' });
    }
  }
  return out;
}

/** 選んだ変更が 1 つ以上ある項目だけを、実行の対象にする。 */
export function sectionsToRun(composed: ComposedReflectSelection | null, activeScopes: readonly string[]): ComposedSection[] {
  const active = new Set(activeScopes);
  return (composed?.sections || []).filter((section) => active.has(section.sectionKey) && section.selectedCount > 0);
}

/** 実行に渡す「項目ごとの送る設定」。選んだ変更がある項目だけ。 */
export function composedAfterMap(sections: readonly ComposedSection[]): Record<string, any> {
  const map: Record<string, any> = {};
  for (const section of sections) map[section.sectionKey] = section.after;
  return map;
}

// =============================================================================
// 結果
// =============================================================================

export interface SourceResultInput {
  goal: SourceDeployGoal;
  sections: readonly ApplySectionOutcome[];
  cancelled?: boolean;
  /** 本番へ反映した結果の要約（成功・失敗の判定は呼び出し側で済ませる） */
  deploy?: { ok: boolean; text: string };
  deploySkipped?: string;
}

export interface SourceResultMessage { text: string; tone: 'ok' | 'warn' | 'err' }

/** 実行後のステータス文（文言ガイドの規則: 結果の動詞で終える。部分成功は成功数・失敗数・理由の順。中止は未実行の数）。 */
export function describeSourceResult(input: SourceResultInput): SourceResultMessage {
  const counts = summarizeApplyOutcome([...input.sections]);
  const total = counts.ok + counts.ng + counts.stopped + counts.pending + counts.skip;
  const written = counts.ok;
  if (input.cancelled) {
    return {
      text: `中止しました（${written}/${total} 項目を反映先プレビューへ反映${counts.stopped ? `、${counts.stopped} 項目は途中で停止` : ''}${counts.ng ? `、${counts.ng} 項目は失敗` : ''}、残り ${counts.pending} 項目は未実行）。書き込み済みの分は反映先プレビューに残っています。本番へは反映していません。`,
      tone: 'warn'
    };
  }
  if (counts.ng || counts.pending || counts.stopped) {
    const failure = input.sections.find((section) => section.status === 'ng' && !section.stopped);
    const reason = failure ? `（${failure.label}: ${String(failure.message || '').split('\n')[0].slice(0, 80)}）` : '';
    return {
      text: `${total} 項目中 ${written} 項目を反映先プレビューへ反映しました。失敗 ${counts.ng} 項目${counts.pending ? `、未実行 ${counts.pending} 項目` : ''}${reason}。本番へは反映していません。`,
      tone: written ? 'warn' : 'err'
    };
  }
  if (input.goal === 'preview') {
    return { text: `${written} 項目を反映先プレビューへ反映しました。本番へは反映していません。`, tone: 'ok' };
  }
  if (input.deploySkipped) {
    return { text: `${written} 項目を反映先プレビューへ反映しましたが、本番へは反映していません。${input.deploySkipped}`, tone: 'warn' };
  }
  if (input.deploy) return { text: `${written} 項目を反映先プレビューへ反映し、${input.deploy.text}`, tone: input.deploy.ok ? 'ok' : 'warn' };
  return { text: `${written} 項目を反映先プレビューへ反映しました。`, tone: 'ok' };
}

/** 本番へ反映しなかったときの案内（プレビューには書き込み済みで、「プレビューの変更を公開」で続きができる）。 */
export function describeDeploySkippedFollowUp(): string {
  return '反映先プレビューには書き込み済みです。理由を解消したあと、パネル上部の「プレビューの変更を公開」から続けて本番へ反映できます。';
}
