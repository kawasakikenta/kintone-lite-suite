'use strict';

/**
 * 「反映元アプリから本番へ」の記録の Markdown と、結果 JSON を組み立てる（DOM・API 非依存）。
 * 作業記録に貼れるよう、選んだ変更・修正の件数と変更の要約（items）を中心にし、設定値の生 JSON やバックアップ本体は含めない。
 */

import type { ApplySectionOutcome } from '../reflect/applyOutcome.js';
import { previewWriteState, summarizeApplyOutcome } from '../reflect/applyOutcome.js';
import type { ReflectItemSummary } from '../reflect/changeSummary.js';
import { escapeReflectMarkdown } from '../reflect/planReport.js';
import type { ReflectTargetPending } from '../reflect/targetPending.js';
import { countOutcomes, describeDeployMessage, describeDeployStatus, describeRunResult, formatDeployApp } from './display.js';
import { buildDeployResultJson, type DeployResultJson } from './report.js';
import { describeDeploySkippedFollowUp, describeSourceResult, sourceUndoGuidance, summarizeItemKinds, type SourceResultMessage } from './sourceDisplay.js';
import type { SourceDeployGoal, SourceDeployResult } from './sourceTypes.js';

const ITEMS_PER_SECTION_LIMIT = 50;
const KIND_ORDER = ['削除', '変更', '追加', '保持'] as const;

const esc = (value: unknown) => escapeReflectMarkdown(value);
const cell = (value: unknown) => esc(value) || '－';

function formatStamp(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value || '') : date.toLocaleString('ja-JP', { hour12: false });
}

export type SourceEnvironment = 'production' | 'preview' | 'json';

const ENVIRONMENT_LABEL: Record<SourceEnvironment, string> = { production: '本番', preview: 'プレビュー', json: '設定JSON' };

export interface SourceRecordSection {
  sectionKey: string;
  label: string;
  /** 選んだ変更の数 / 全体の数 */
  selectedCount: number;
  totalCount: number;
  /** 入力欄・JSON で既定から変えた値の数 */
  editedCount: number;
  /** 作り直した計画の変更の要約 */
  items: readonly ReflectItemSummary[];
}

export interface SourceRecordApp { appId: string; guestId: string; name: string }

export interface SourceRecordInput {
  goal: SourceDeployGoal;
  source: SourceRecordApp & { environment: SourceEnvironment };
  target: SourceRecordApp;
  preserveTargetOnly: boolean;
  lookupMap: Record<string, string>;
  targetPending?: ReflectTargetPending;
  allowPendingChanges?: boolean;
  /** 実行した項目の選択・修正の内容 */
  sections: readonly SourceRecordSection[];
  startedAt: string;
  finishedAt: string;
  result: SourceDeployResult;
}

/** 本番への反映の要約（goal が production で反映を依頼したときだけ）。 */
function deploySummary(result: SourceDeployResult): { ok: boolean; text: string } | undefined {
  if (!result.deploy) return undefined;
  const message = describeRunResult(result.deploy);
  return { ok: message.tone === 'ok', text: message.text };
}

/** 結果の 1 文（画面のステータスと記録で共通）。 */
export function describeSourceDeployResult(result: SourceDeployResult): SourceResultMessage {
  return describeSourceResult({
    goal: result.goal,
    sections: result.apply.sections,
    cancelled: result.apply.cancelled,
    deploy: deploySummary(result),
    deploySkipped: result.deploySkipped
  });
}

function appLine(app: SourceRecordApp, environment: string): string {
  const parts = [`App ${app.appId || '－'}`, app.guestId ? `ゲストスペース ${app.guestId}` : '通常スペース', environment];
  return `${esc(app.name || '（名前なし）')}（${parts.map(esc).join(' / ')}）`;
}

function outcomeLabel(section: ApplySectionOutcome | undefined): string {
  if (!section) return '未実行';
  if (section.status === 'ok') return '成功';
  if (section.status === 'skip') return '変更なし';
  if (section.status === 'pending') return '未実行';
  return section.stopped ? '途中で停止' : '失敗';
}

export function buildSourceDeployRecordMarkdown(input: SourceRecordInput): string {
  const { result } = input;
  const message = describeSourceDeployResult(result);
  const counts = summarizeApplyOutcome(result.apply.sections);
  const lines: string[] = [];
  lines.push('# 反映元アプリから本番への反映の記録', '');
  lines.push(`- 開始日時: ${esc(formatStamp(input.startedAt))}`);
  lines.push(`- 終了日時: ${esc(formatStamp(input.finishedAt))}`);
  lines.push(`- 反映元: ${appLine(input.source, ENVIRONMENT_LABEL[input.source.environment])}`);
  lines.push(`- 反映先: ${appLine(input.target, input.goal === 'production' ? 'プレビュー → 本番' : 'プレビュー')}`);
  lines.push(`- 目標: ${input.goal === 'production' ? '本番まで反映' : 'プレビューまで（本番へは反映しない）'}`);
  lines.push(`- 反映先だけの一覧・グラフ・アクション: ${input.preserveTargetOnly ? '保持する' : '削除する'}`);
  const lookupPairs = Object.entries(input.lookupMap || {});
  if (lookupPairs.length) lines.push(`- 参照先変換: ${lookupPairs.map(([from, to]) => `${esc(from)} → ${esc(to)}`).join('、')}`);
  if (input.targetPending) {
    const acknowledged = input.targetPending.state === 'pending' && input.goal === 'production'
      ? `（${input.allowPendingChanges ? '本番へ一緒に反映されることを了承して実行' : '了承なし'}）` : '';
    lines.push(`- 反映先の未公開の変更: ${esc(input.targetPending.message)}${acknowledged}`);
  }
  lines.push(`- 結果: ${esc(message.text)}`);
  lines.push(`- 件数（プレビューへの書き込み）: 成功 ${counts.ok}・失敗 ${counts.ng}・途中で停止 ${counts.stopped}・未実行 ${counts.pending}・変更なし ${counts.skip}`);
  if (result.apply.cancelled) lines.push('- 利用者の操作で中止しました。');
  if (result.apply.backup) lines.push(`- バックアップ（反映前のプレビュー）: ${esc(formatStamp(result.apply.backup.generatedAt))} に保存（項目: ${esc(result.apply.backup.scopes.join('、'))}）`);
  else lines.push('- バックアップ（反映前のプレビュー）: 保存していません');
  if (input.goal === 'production') {
    const backup = result.deploy?.backup;
    lines.push(backup
      ? `- バックアップ（本番へ反映する前の本番）: \`${String(backup.fileName).replace(/`/g, '')}\`（${backup.appCount} アプリ分）`
      : '- バックアップ（本番へ反映する前の本番）: 保存していません');
    for (const file of backup?.unavailableFiles || []) lines.push(`  - 本体を保存できなかったファイル: App ${esc(file.appId)} / ${esc(file.name)}（${esc(file.reason)}）`);
  }
  lines.push(`- 取り消し方: ${esc(sourceUndoGuidance(input.goal, input.targetPending))}`, '');

  lines.push('## 項目別の結果', '');
  lines.push('| 項目 | 選んだ変更 | 修正した値 | 結果 | 理由 |');
  lines.push('| --- | --- | --- | --- | --- |');
  for (const section of input.sections) {
    const outcome = result.apply.sections.find((candidate) => candidate.sectionKey === section.sectionKey);
    lines.push(`| ${cell(section.label)} | ${section.selectedCount}/${section.totalCount} | ${section.editedCount} | ${cell(outcomeLabel(outcome))} | ${cell(String(outcome?.message || '').split('\n')[0])} |`);
  }
  lines.push('');

  lines.push('## 本番への反映', '');
  if (result.deploy) {
    lines.push(`- ${esc(describeRunResult(result.deploy).text)}`);
    for (const app of result.deploy.apps) {
      lines.push(`- ${esc(formatDeployApp(app))}: ${esc(describeDeployStatus(app.status, 'deploy').text)}${app.message ? `（${esc(describeDeployMessage(app.message).split('\n')[0])}）` : ''}。本番の設定の更新番号（revision） ${esc(app.productionRevisionBefore || '－')} → ${esc(app.productionRevisionAfter || '－')}`);
    }
  } else if (input.goal === 'preview') {
    lines.push('- 目標がプレビューまでのため、本番へは反映していません。');
  } else {
    lines.push(`- 本番へは反映していません。${esc(result.deploySkipped || '')}`);
    const followUp = describeDeploySkippedFollowUp(previewWriteState(result.apply.sections));
    if (followUp) lines.push(`- ${esc(followUp)}`);
  }
  lines.push('');

  lines.push('## 項目別の変更の要約', '');
  for (const section of input.sections) {
    const kinds = summarizeItemKinds(section.items);
    lines.push(`### ${esc(section.label)}（選んだ変更 ${section.selectedCount}/${section.totalCount}${kinds ? `・${kinds}` : ''}）`, '');
    const items = [...section.items].sort((a, b) => KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind));
    for (const item of items.slice(0, ITEMS_PER_SECTION_LIMIT)) {
      lines.push(`- **${item.kind}** ${esc(item.name)}`);
      for (const detail of item.details || []) lines.push(`  - ${esc(detail)}`);
    }
    if (items.length > ITEMS_PER_SECTION_LIMIT) lines.push(`- ほか ${items.length - ITEMS_PER_SECTION_LIMIT} 件`);
    if (!items.length) lines.push('- 変更の要約はありません。');
    lines.push('');
  }
  return `${lines.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd()}\n`;
}

// =============================================================================
// 結果 JSON
// =============================================================================

export interface SourceDeployResultJson {
  kind: 'kintone-source-deploy-result';
  version: 1;
  goal: SourceDeployGoal;
  startedAt: string;
  finishedAt: string;
  source: SourceRecordApp & { environment: SourceEnvironment };
  target: SourceRecordApp;
  message: string;
  cancelled: boolean;
  selection: Array<{ sectionKey: string; label: string; selectedCount: number; totalCount: number; editedCount: number }>;
  apply: {
    summary: ReturnType<typeof summarizeApplyOutcome>;
    sections: ApplySectionOutcome[];
    finalRevision: string;
    backup?: { generatedAt: string; scopes: string[] };
    logs: string[];
  };
  deploy?: DeployResultJson;
  deploySkipped?: string;
  deploySummary?: ReturnType<typeof countOutcomes>;
}

export function buildSourceDeployResultJson(input: Pick<SourceRecordInput, 'goal' | 'source' | 'target' | 'sections' | 'startedAt' | 'finishedAt' | 'result'>): SourceDeployResultJson {
  const { result } = input;
  return {
    kind: 'kintone-source-deploy-result',
    version: 1,
    goal: input.goal,
    startedAt: input.startedAt,
    finishedAt: input.finishedAt,
    source: { ...input.source },
    target: { ...input.target },
    message: describeSourceDeployResult(result).text,
    cancelled: !!result.apply.cancelled,
    selection: input.sections.map(({ sectionKey, label, selectedCount, totalCount, editedCount }) => ({ sectionKey, label, selectedCount, totalCount, editedCount })),
    apply: {
      summary: summarizeApplyOutcome(result.apply.sections),
      sections: result.apply.sections.map((section) => ({ ...section })),
      finalRevision: result.apply.finalRevision,
      ...(result.apply.backup ? { backup: { generatedAt: result.apply.backup.generatedAt, scopes: [...result.apply.backup.scopes] } } : {}),
      logs: [...(result.apply.logs || [])]
    },
    ...(result.deploy ? { deploy: buildDeployResultJson(result.deploy), deploySummary: countOutcomes(result.deploy.apps) } : {}),
    ...(result.deploySkipped ? { deploySkipped: result.deploySkipped } : {})
  };
}

export function stringifySourceDeployResultJson(input: Parameters<typeof buildSourceDeployResultJson>[0]): string {
  return JSON.stringify(buildSourceDeployResultJson(input), null, 2);
}
