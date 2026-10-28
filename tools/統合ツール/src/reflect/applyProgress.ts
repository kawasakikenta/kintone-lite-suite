/**
 * プレビュー反映 lite の「実行中の進捗」「取り消しの案内」「アップロード予定」の表示用ヘルパー（DOM 非依存）。
 * 画面（reflect-lite-ui.ts / reflectPlanView.ts）から切り離して、単体テストの対象にする。
 */

import { REFLECT_UNDO_GUIDANCE } from './liteSetup.js';
import { REFLECT_SECTION_KEYS } from './sections.js';
import type { ReflectItemSummary } from './changeSummary.js';
import { formatBytes, type ReflectFileUpload } from './standalonePlan.js';

// =============================================================================
// 実行中の進捗
// =============================================================================

export type ApplyProgressStatus = 'waiting' | 'running' | 'ok' | 'ng' | 'skip' | 'pending';

export interface ApplyProgressRow { sectionKey: string; label: string; status: ApplyProgressStatus; message?: string; /** 利用者の「中止」で途中で止まった項目（status は ng） */ stopped?: boolean }

export interface ApplyProgressDisplay { icon: string; text: '待機中' | '実行中…' | '成功' | '失敗' | '途中で停止' | '変更なし' | '未実行'; tone: ApplyProgressStatus }

/** 状態は色だけに頼らず、記号と文字でも示す。 */
export function describeApplyProgressStatus(status: ApplyProgressStatus, stopped = false): ApplyProgressDisplay {
  if (status === 'ng' && stopped) return { icon: '■', text: '途中で停止', tone: 'ng' };
  if (status === 'running') return { icon: '…', text: '実行中…', tone: 'running' };
  if (status === 'ok') return { icon: '✓', text: '成功', tone: 'ok' };
  if (status === 'ng') return { icon: '✕', text: '失敗', tone: 'ng' };
  if (status === 'skip') return { icon: '－', text: '変更なし', tone: 'skip' };
  if (status === 'pending') return { icon: '○', text: '未実行', tone: 'pending' };
  return { icon: '○', text: '待機中', tone: 'waiting' };
}

/** 実行予定の項目を、反映エンジンの処理順に「待機中」で並べる。 */
export function createApplyProgressRows(sectionKeys: readonly string[], labelOf: (key: string) => string): ApplyProgressRow[] {
  const order = (key: string) => {
    const index = REFLECT_SECTION_KEYS.indexOf(key);
    return index < 0 ? REFLECT_SECTION_KEYS.length : index;
  };
  return [...new Set(sectionKeys)]
    .sort((a, b) => order(a) - order(b))
    .map((sectionKey) => ({ sectionKey, label: labelOf(sectionKey), status: 'waiting' as const }));
}

/** 通知を反映した新しい一覧を返す。一覧に無い項目の通知は末尾に足さず無視する。 */
export function applyProgressUpdate(rows: readonly ApplyProgressRow[], update: { sectionKey: string; status: ApplyProgressStatus; message?: string; stopped?: boolean }): ApplyProgressRow[] {
  return rows.map((row) => row.sectionKey === update.sectionKey
    ? { sectionKey: row.sectionKey, label: row.label, status: update.status, ...(update.message ? { message: update.message } : {}), ...(update.status === 'ng' && update.stopped ? { stopped: true } : {}) }
    : row);
}

/** 「完了 2 / 5 項目」のような進み具合の 1 文。 */
export function summarizeApplyProgress(rows: readonly ApplyProgressRow[]): string {
  if (!rows.length) return '';
  // 中断で実行されなかった項目は「完了」に数えない。
  const settled = rows.filter((row) => ['ok', 'ng', 'skip'].includes(row.status)).length;
  const failed = rows.filter((row) => row.status === 'ng' && !row.stopped).length;
  const stopped = rows.filter((row) => row.status === 'ng' && row.stopped).length;
  const skipped = rows.filter((row) => row.status === 'pending').length;
  const running = rows.find((row) => row.status === 'running');
  return `${settled} / ${rows.length} 項目が完了${failed ? `（失敗 ${failed}）` : ''}${stopped ? `（途中で停止 ${stopped}）` : ''}${skipped ? `、未実行 ${skipped}` : ''}${running ? `。実行中: ${running.label}` : ''}`;
}

// =============================================================================
// 取り消しの案内
// =============================================================================

export interface UndoGuidance { tone: 'info' | 'warn' | 'ok'; text: string; /** 「反映先の設定画面を開く」へ誘導するか */ openSettings: boolean }

/** 反映前の「反映先プレビューに未公開の変更があったか」に応じて、反映後の取り消し方を案内する。 */
export function describeUndoGuidance(targetPending?: { state?: string } | null): UndoGuidance {
  if (targetPending?.state === 'clean') {
    return { tone: 'ok', openSettings: true, text: '反映前、反映先プレビューに未公開の変更はありませんでした。アプリの設定画面で『変更を中止』を押すと、今回の反映をすべて取り消せます。' };
  }
  if (targetPending?.state === 'own') {
    return { tone: 'ok', openSettings: true, text: '反映前の未公開の変更は、このツールによる反映分だけでした。アプリの設定画面で『変更を中止』を押すと、それらを含む未公開の変更をすべて取り消せます。' };
  }
  if (targetPending?.state === 'pending') {
    return { tone: 'warn', openSettings: false, text: '反映前から未公開の変更があったため、『変更を中止』ではそれらも破棄されます。今回の反映だけを戻す場合は『バックアップから戻す』を使ってください。' };
  }
  return { tone: 'info', openSettings: false, text: REFLECT_UNDO_GUIDANCE };
}

export const RESTORE_MODE_NOTICE = 'バックアップから戻しています。反映で追加したフィールドは削除されません（保持として表示）。参照先変換は使いません。';

/** 反映先プレビューに以前からの未公開の変更がある場合に、最終確認で反映先IDの入力を求める理由。 */
export const TARGET_PENDING_REASON = '反映先プレビューに以前からの未公開の変更があります';

// =============================================================================
// JS/CSS のアップロード予定
// =============================================================================

const platformLabel = (platform: string) => platform === 'mobile' ? 'モバイル' : 'PC';

/**
 * 反映先へアップロードするファイルの表示行。同じ反映元ファイルを複数の場所で使う場合は 1 回にまとめる。
 * 例: 「PC JS / app.js（12 KB）」「PC JS・モバイル JS / common.js（3 KB）」
 */
export function formatUploadList(uploads: readonly ReflectFileUpload[] | undefined): string[] {
  const grouped = new Map<string, { slots: string[]; name: string; byteSize: number }>();
  for (const upload of uploads || []) {
    const slot = `${platformLabel(upload.platform)} ${upload.kind === 'css' ? 'CSS' : 'JS'}`;
    const entry = grouped.get(upload.sourceFileKey);
    if (!entry) grouped.set(upload.sourceFileKey, { slots: [slot], name: upload.name, byteSize: upload.byteSize });
    else if (!entry.slots.includes(slot)) entry.slots.push(slot);
  }
  return [...grouped.values()].map((entry) => `${entry.slots.join('・')} / ${entry.name}（${formatBytes(entry.byteSize)}）`);
}

/** 複数の項目にまたがるアップロード予定を、重複を除いて 1 つの一覧にする。 */
export function collectUploadLabels(plans: ReadonlyArray<{ fileUploads?: readonly ReflectFileUpload[] }>): string[] {
  return [...new Set(plans.flatMap((plan) => formatUploadList(plan.fileUploads as ReflectFileUpload[] | undefined)))];
}

// =============================================================================
// 変更の要約（項目単位）
// =============================================================================

export const REFLECT_ITEM_KIND_ORDER: readonly ReflectItemSummary['kind'][] = ['削除', '変更', '追加', '保持'];

/** 要約を「削除 → 変更 → 追加 → 保持」の順に並べる（同じ種類の中では元の順）。不正な行は除く。 */
export function orderReflectItems(items: readonly ReflectItemSummary[] | undefined): ReflectItemSummary[] {
  const valid = (items || []).filter((item) => item && REFLECT_ITEM_KIND_ORDER.includes(item.kind) && typeof item.name === 'string');
  return REFLECT_ITEM_KIND_ORDER.flatMap((kind) => valid.filter((item) => item.kind === kind));
}

export function countReflectItemKinds(items: readonly ReflectItemSummary[] | undefined): Record<ReflectItemSummary['kind'], number> {
  const counts = { 削除: 0, 変更: 0, 追加: 0, 保持: 0 };
  for (const item of items || []) if (item && item.kind in counts) counts[item.kind] += 1;
  return counts;
}

/** 最終確認の「削除される設定」一覧の 1 行（項目名＋内容）。 */
export function describeRemovedItem(sectionLabel: string, item: ReflectItemSummary): string {
  const details = (item.details || []).filter(Boolean);
  return `${sectionLabel} / ${item.name}${details.length ? `：${details.join('、')}` : ''}`;
}

/**
 * 要約から削除を拾えなかったときの、計画の変更（削除）1 件の説明。
 * 利用者向けの summary があればそれを使い、無ければ設定値を短く切って示す。
 */
export function describeRemovedChange(sectionLabel: string, change: { path: string; before: string; summary?: string }): string {
  if (change.summary) return `${sectionLabel} / ${change.path.replace(/ \/ \d+件目$/, '')}：${change.summary}`;
  return `${sectionLabel} / ${change.path}：${change.before.slice(0, 180)}${change.before.length > 180 ? '…' : ''}`;
}

// =============================================================================
// 日時
// =============================================================================

/** 結果画面などの日時表示（日本語形式）。 */
export function formatReflectDateTime(at: number | Date): string {
  return new Date(at).toLocaleString('ja-JP');
}

export function formatReflectTime(at: number | Date): string {
  return new Date(at).toLocaleTimeString('ja-JP');
}
