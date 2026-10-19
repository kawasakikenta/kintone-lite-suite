'use strict';

// =============================================================================
// プレビュー反映の計画・実行結果を、人が読む Markdown にまとめる（DOM・API 非依存）。
// 承認依頼や作業記録に貼れるよう、変更の要約（items）を中心に、設定値の生 JSON は含めない。
// =============================================================================

import type { ReflectSectionPlan } from './standalonePlan.js';
import type { ReflectTargetPending } from './targetPending.js';
import type { ApplySectionOutcome } from './applyOutcome.js';

export interface ReflectReportApp { appId: string; name: string; code?: string; guestId: string }

export interface ReflectReportInput {
  generatedAt: string;
  source: ReflectReportApp;
  target: ReflectReportApp;
  sourceEnvironment: 'production' | 'preview' | 'json';
  preserveTargetOnly: boolean;
  lookupMap?: Record<string, string>;
  /** 反映対象として選んだ項目の計画（差分なし・確認が必要な項目も含めてよい） */
  entries: ReflectSectionPlan[];
  targetPending?: ReflectTargetPending;
  /** 反映後の記録にする場合の実行結果 */
  outcome?: { executedAt: string; sections: ApplySectionOutcome[] };
}

const ENVIRONMENT_LABELS: Record<ReflectReportInput['sourceEnvironment'], string> = { production: '本番設定', preview: 'プレビュー設定', json: '設定JSON' };
const STATUS_LABELS: Record<string, string> = { change: '差分あり', same: '一致', 'src-missing': '確認が必要', 'tgt-missing': '確認が必要', error: '確認が必要' };
const OUTCOME_LABELS: Record<ApplySectionOutcome['status'], string> = { ok: '成功', ng: '失敗', skip: '変更なし', pending: '未実行' };
const KIND_ORDER = ['削除', '変更', '追加', '保持'] as const;
const outcomeLabel = (status: string) => OUTCOME_LABELS[status as ApplySectionOutcome['status']] || status;
const listOf = <T,>(value: T[] | undefined): T[] => Array.isArray(value) ? value : [];

/** 本文中で強調・リンク・表・HTMLとして解釈される記号を退避する（行頭には置かないため見出し等は対象外。改行は空白にまとめる）。 */
export function escapeReflectMarkdown(value: unknown): string {
  return String(value ?? '').replace(/[\r\n]+/g, ' ').replace(/([\\`*_[\]<>|~])/g, '\\$1');
}

function cell(value: unknown): string {
  return escapeReflectMarkdown(value) || '－';
}

function appLine(app: ReflectReportApp, environment: string): string {
  const parts = [`App ${app.appId || '－'}`, app.guestId ? `ゲストスペース ${app.guestId}` : '通常スペース', environment];
  if (app.code) parts.splice(1, 0, `コード ${app.code}`);
  return `${escapeReflectMarkdown(app.name || '（名前なし）')}（${parts.map(escapeReflectMarkdown).join(' / ')}）`;
}

function formatStamp(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value || '') : date.toLocaleString('ja-JP', { hour12: false });
}

export function buildReflectReportMarkdown(input: ReflectReportInput): string {
  const lines: string[] = [];
  const record = !!input.outcome;
  lines.push(`# プレビュー反映の${record ? '記録' : '計画'}`, '');
  lines.push(`- ${record ? '実行日時' : '作成日時'}: ${escapeReflectMarkdown(formatStamp(record ? input.outcome!.executedAt : input.generatedAt))}`);
  lines.push(`- 反映元: ${appLine(input.source, ENVIRONMENT_LABELS[input.sourceEnvironment] || input.sourceEnvironment)}`);
  lines.push(`- 反映先: ${appLine(input.target, 'プレビュー')}`);
  lines.push(`- 反映先だけの一覧・グラフ・アクション: ${input.preserveTargetOnly ? '保持する' : '削除する'}`);
  const lookupPairs = Object.entries(input.lookupMap || {});
  if (lookupPairs.length) lines.push(`- 参照先変換: ${lookupPairs.map(([from, to]) => `${escapeReflectMarkdown(from)} → ${escapeReflectMarkdown(to)}`).join('、')}`);
  if (input.targetPending) lines.push(`- 反映先の未公開の変更: ${escapeReflectMarkdown(input.targetPending.message)}`);
  lines.push('- 書き込み先はプレビューです。本番への公開はアプリの設定画面で行います。', '');

  lines.push('## 概要', '');
  const outcomeOf = (key: string) => input.outcome?.sections.find(section => section.sectionKey === key);
  lines.push(record ? '| 項目 | 結果 | 変更 | 削除 | 反映方法 |' : '| 項目 | 状態 | 変更 | 削除 | 保持 | 反映方法 |');
  lines.push(record ? '| --- | --- | ---: | ---: | --- |' : '| --- | --- | ---: | ---: | ---: | --- |');
  for (const entry of input.entries) {
    const kept = listOf(entry.changes).filter(change => change.kind === '保持').length;
    const outcome = outcomeOf(entry.sectionKey);
    lines.push(record
      ? `| ${cell(entry.label)} | ${cell(outcome ? outcomeLabel(outcome.status) : '対象外')} | ${entry.changeCount} | ${entry.removalCount} | ${cell(entry.behavior)} |`
      : `| ${cell(entry.label)} | ${cell(STATUS_LABELS[entry.status] || entry.status)} | ${entry.changeCount} | ${entry.removalCount} | ${kept} | ${cell(entry.behavior)} |`);
  }
  lines.push('');

  for (const entry of input.entries) {
    lines.push(`## ${escapeReflectMarkdown(entry.label)}`, '');
    const outcome = outcomeOf(entry.sectionKey);
    if (outcome) {
      lines.push(`- 結果: ${outcomeLabel(outcome.status)}`);
      if (outcome.message) lines.push(`- 詳細: ${escapeReflectMarkdown(outcome.message)}`);
    }
    lines.push(`- 状態: ${escapeReflectMarkdown(entry.message || STATUS_LABELS[entry.status] || entry.status)}`);
    for (const blocker of listOf(entry.blockers)) lines.push(`- 停止理由: ${escapeReflectMarkdown(blocker)}`);
    for (const warning of listOf(entry.warnings)) lines.push(`- 注意: ${escapeReflectMarkdown(warning)}`);
    for (const upload of entry.fileUploads || []) lines.push(`- アップロードするファイル: ${upload.platform === 'desktop' ? 'PC' : 'モバイル'} ${upload.kind.toUpperCase()} / ${escapeReflectMarkdown(upload.name)}`);
    const items = [...(entry.items || [])].sort((a, b) => KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind));
    if (items.length) {
      lines.push('', '### 変更の要約', '');
      for (const item of items) {
        lines.push(`- **${item.kind}** ${escapeReflectMarkdown(item.name)}`);
        for (const detail of item.details) lines.push(`  - ${escapeReflectMarkdown(detail)}`);
      }
    } else if (entry.status === 'change') {
      lines.push('', `変更 ${entry.changeCount} 件（要約を作成できませんでした。詳細は反映計画JSONで確認してください）`);
    }
    lines.push('');
  }
  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd() + '\n';
}
