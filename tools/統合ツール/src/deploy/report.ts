'use strict';

/**
 * 本番反映の計画・記録の Markdown と、結果 JSON を組み立てる（DOM・API 非依存）。
 * 承認依頼や作業記録に貼れるよう、変更の要約（items）を中心にし、設定値の生 JSON やバックアップ本体は含めない。
 */

import { escapeReflectMarkdown } from '../reflect/planReport.js';
import {
  aggregateChanges,
  backupDescription,
  changedSectionLabels,
  collectRemovedFields,
  countOutcomes,
  deployAppKey,
  deployModeText,
  describeBatchMode,
  describeDeployMessage,
  describeDeployStatus,
  describeRemovedField,
  describeRemovedSettings,
  describeRunResult,
  describeStopPolicy,
  formatDeployApp,
  formatRevisionPair,
  inspectStateLabel,
  removedSettingCount,
  undoGuidance
} from './display.js';
import type { DeployAppInspection, DeployAppOutcome, DeployBatchMode, DeployMode, DeployRunResult } from './types.js';

const KIND_ORDER = ['削除', '変更', '追加', '保持'] as const;
/** 1 項目あたり Markdown に書く変更の要約の上限（数千件の追加で巨大にしない。超えた分は件数だけ示す）。 */
const ITEMS_PER_SECTION_LIMIT = 50;

function esc(value: unknown): string {
  return escapeReflectMarkdown(value);
}

function cell(value: unknown): string {
  return esc(value) || '－';
}

function formatStamp(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value || '') : date.toLocaleString('ja-JP', { hour12: false });
}

function appHeading(app: { appId: string; guestId: string; name?: string }): string {
  return esc(formatDeployApp(app));
}

// =============================================================================
// 計画（実行前）
// =============================================================================

export interface DeployPlanInput {
  generatedAt: string;
  mode: DeployMode;
  batchMode: DeployBatchMode;
  stopOnError: boolean;
  /** 差分確認したすべてのアプリ（対象外を含む） */
  apps: readonly DeployAppInspection[];
  /** 実行の対象に選んでいるアプリのキー（deployAppKey） */
  selectedKeys: Iterable<string>;
}

function appendAppDetails(lines: string[], app: DeployAppInspection, mode: DeployMode, headingLevel: string): void {
  lines.push(`${headingLevel} ${appHeading(app)}`, '');
  lines.push(`- 状態: ${esc(inspectStateLabel(app.state))}`);
  lines.push(`- revision: ${esc(formatRevisionPair(app))}`);
  if (app.error) lines.push(`- 理由: ${esc(app.error)}`);
  if (app.state === 'changes' && app.contentSame) lines.push('- 設定の内容は同じです（revision だけが異なります）');
  for (const warning of app.warnings || []) lines.push(`- 注意: ${esc(warning)}`);
  if (mode === 'deploy') {
    for (const field of app.removedFields || []) {
      lines.push(`- 削除されるフィールド: ${esc(describeRemovedField(field))}${field.possibleRename ? `（プレビューの『${esc(field.possibleRename)}』へコードを変えただけなら値は残る可能性があります）` : ''}`);
    }
  }
  lines.push('');
  const heading = deployModeText(mode).changesHeading;
  for (const section of app.sections || []) {
    if (section.status === 'error') {
      lines.push(`**${esc(section.label)}**: 取得失敗${section.message ? `（${esc(section.message)}）` : ''}`, '');
      continue;
    }
    if (section.status !== 'change') continue;
    const counts = section.counts;
    lines.push(`**${esc(section.label)}**（${heading}: 追加 ${counts.added}・変更 ${counts.changed}・削除 ${counts.removed}）`, '');
    const items = [...(section.items || [])].sort((a, b) => KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind));
    for (const item of items.slice(0, ITEMS_PER_SECTION_LIMIT)) {
      lines.push(`- **${item.kind}** ${esc(item.name)}`);
      for (const detail of item.details || []) lines.push(`  - ${esc(detail)}`);
    }
    if (items.length > ITEMS_PER_SECTION_LIMIT) lines.push(`- ほか ${items.length - ITEMS_PER_SECTION_LIMIT} 件`);
    if (!items.length) lines.push(`- 変更 ${counts.added + counts.changed + counts.removed} 件（要約を作成できませんでした）`);
    lines.push('');
  }
}

function appendHeader(lines: string[], opts: { mode: DeployMode; batchMode: DeployBatchMode; stopOnError: boolean }): void {
  const text = deployModeText(opts.mode);
  lines.push(`- 操作: ${esc(text.label)}`);
  lines.push(`- 方向: ${esc(text.direction)}`);
  lines.push(`- 反映の方法: ${esc(describeBatchMode(opts.batchMode))}（${esc(describeStopPolicy(opts.batchMode, opts.stopOnError))}）`);
}

export function buildDeployPlanMarkdown(input: DeployPlanInput): string {
  const selected = new Set(input.selectedKeys);
  const targets = input.apps.filter((app) => app.state === 'changes' && selected.has(deployAppKey(app)));
  const others = input.apps.filter((app) => !targets.includes(app));
  const text = deployModeText(input.mode);
  const totals = aggregateChanges(targets);
  const lines: string[] = [];
  lines.push(`# ${input.mode === 'revert' ? '変更の中止' : '本番反映'}の計画`, '');
  lines.push(`- 作成日時: ${esc(formatStamp(input.generatedAt))}`);
  appendHeader(lines, input);
  lines.push(`- 対象: ${targets.length} アプリ（確認した ${input.apps.length} アプリのうち）`);
  lines.push(`- バックアップ: ${esc(backupDescription(input.mode, targets.length))}`);
  lines.push(`- 取り消し方: ${esc(undoGuidance(input.mode))}`);
  lines.push('- この計画は書き込み前の確認結果です。まだ本番へは反映していません。', '');

  lines.push('## 概要', '');
  lines.push(`変更のある項目: 追加 ${totals.added} 件・変更 ${totals.changed} 件・削除 ${totals.removed} 件`);
  const removedText = describeRemovedSettings(totals);
  if (removedText) lines.push('', `削除される設定: ${esc(removedText)}`);
  lines.push('');
  lines.push('| アプリ | 状態 | 実行 | 変更のある項目 | 削除 | revision（本番 → プレビュー） |');
  lines.push('| --- | --- | --- | --- | ---: | --- |');
  for (const app of input.apps) {
    const run = targets.includes(app) ? '対象' : app.state === 'clean' ? '対象外（反映不要）' : selected.has(deployAppKey(app)) ? '対象外（確認が必要）' : '対象外';
    lines.push(`| ${cell(formatDeployApp(app))} | ${cell(inspectStateLabel(app.state))} | ${cell(run)} | ${cell(changedSectionLabels(app).join('、'))} | ${removedSettingCount(app)} | ${cell(`${app.productionRevision || '－'} → ${app.previewRevision || '－'}`)} |`);
  }
  lines.push('');

  if (input.mode === 'deploy') {
    const removedFields = collectRemovedFields(targets);
    if (removedFields.length) {
      lines.push('## 削除されるフィールド', '');
      lines.push('本番へ反映すると、これらのフィールドのレコードの値も削除され、元に戻せません。', '');
      for (const { app, field } of removedFields) {
        lines.push(`- ${appHeading(app)}: ${esc(describeRemovedField(field))}${field.possibleRename ? `（フィールドコードを変えただけなら値は残る可能性があります。プレビューの『${esc(field.possibleRename)}』）` : ''}`);
      }
      lines.push('');
    }
  }

  lines.push(`## アプリ別の${text.changesHeading}`, '');
  for (const app of targets) appendAppDetails(lines, app, input.mode, '###');
  if (others.length) {
    lines.push('## 対象外のアプリ', '');
    for (const app of others) {
      lines.push(`- ${appHeading(app)}: ${esc(inspectStateLabel(app.state))}${app.error ? `（${esc(app.error)}）` : ''}`);
    }
    lines.push('');
  }
  return finish(lines);
}

// =============================================================================
// 記録（実行後）
// =============================================================================

export interface DeployRecordInput {
  result: DeployRunResult;
  /** 実行した対象の差分確認結果（result.apps と同じ順） */
  inspections: readonly DeployAppInspection[];
  stopOnError: boolean;
}

export function buildDeployRecordMarkdown(input: DeployRecordInput): string {
  const { result } = input;
  const text = deployModeText(result.mode);
  const counts = countOutcomes(result.apps);
  const message = describeRunResult(result);
  const lines: string[] = [];
  lines.push(`# ${result.mode === 'revert' ? '変更の中止' : '本番反映'}の記録`, '');
  lines.push(`- 開始日時: ${esc(formatStamp(result.startedAt))}`);
  lines.push(`- 終了日時: ${esc(formatStamp(result.finishedAt))}`);
  appendHeader(lines, { mode: result.mode, batchMode: result.batchMode, stopOnError: input.stopOnError });
  lines.push(`- 結果: ${esc(message.text)}`);
  lines.push(`- 件数: 成功 ${counts.success}・失敗 ${counts.failed}・取り消し ${counts.cancelled}・確認後に更新 ${counts.conflict}・完了を確認できない ${counts.unknown}・未実行 ${counts.pending}（対象 ${counts.total} アプリ）`);
  if (result.cancelled) lines.push('- 利用者の操作で中止しました。依頼済みのアプリは kintone 側で処理が続く場合があります。');
  if (result.blocked) lines.push(`- 反映前の確認で止めました: ${esc(result.blocked)}`);
  if (result.backup) {
    lines.push(`- バックアップ: \`${String(result.backup.fileName).replace(/`/g, '')}\`（${result.backup.appCount} アプリ分・${result.backup.environment === 'preview' ? '中止前のプレビューの設定' : '反映前の本番設定'}）`);
    for (const file of result.backup.unavailableFiles || []) {
      lines.push(`  - 本体を保存できなかったファイル: App ${esc(file.appId)} / ${esc(file.name)}（${esc(file.reason)}）`);
    }
  } else {
    lines.push('- バックアップ: 保存していません');
  }
  lines.push(`- 取り消し方: ${esc(undoGuidance(result.mode))}`, '');

  lines.push('## アプリ別の結果', '');
  lines.push('| アプリ | 結果 | 理由 | 本番の revision（前 → 後） | プレビューの revision | 反映後の確認 |');
  lines.push('| --- | --- | --- | --- | --- | --- |');
  for (const app of result.apps) {
    lines.push(`| ${cell(formatDeployApp(app))} | ${cell(describeDeployStatus(app.status, result.mode).text)} | ${cell(describeDeployMessage(app.message))} | ${cell(`${app.productionRevisionBefore || '－'} → ${app.productionRevisionAfter || '－'}`)} | ${cell(app.previewRevision)} | ${cell(verifiedLabel(app))} |`);
  }
  lines.push('');

  const targets = input.inspections.filter((inspection) => inspection.state === 'changes');
  if (result.mode === 'deploy') {
    const removedFields = collectRemovedFields(targets.filter((inspection) => {
      const outcome = result.apps.find((app) => deployAppKey(app) === deployAppKey(inspection));
      return !!outcome && outcome.status !== 'pending';
    }));
    if (removedFields.length) {
      lines.push('## 削除を依頼したフィールド', '');
      lines.push('反映に成功したアプリでは、これらのフィールドのレコードの値も削除されています。', '');
      for (const { app, field } of removedFields) lines.push(`- ${appHeading(app)}: ${esc(describeRemovedField(field))}`);
      lines.push('');
    }
  }
  lines.push(`## アプリ別の${text.changesHeading}`, '');
  for (const inspection of targets) appendAppDetails(lines, inspection, result.mode, '###');
  return finish(lines);
}

function verifiedLabel(app: DeployAppOutcome): string {
  if (app.status !== 'success') return '－';
  if (app.verified === true) return '一致';
  if (app.verified === false) return '不一致（要確認）';
  return '確認できず';
}

function finish(lines: string[]): string {
  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd() + '\n';
}

// =============================================================================
// 結果 JSON
// =============================================================================

export interface DeployResultJson {
  kind: 'kintone-deploy-result';
  version: 1;
  mode: DeployMode;
  batchMode: DeployBatchMode;
  startedAt: string;
  finishedAt: string;
  cancelled: boolean;
  blocked?: string;
  summary: ReturnType<typeof countOutcomes>;
  message: string;
  backup?: DeployRunResult['backup'];
  apps: DeployAppOutcome[];
  logs: string[];
}

export function buildDeployResultJson(result: DeployRunResult): DeployResultJson {
  return {
    kind: 'kintone-deploy-result',
    version: 1,
    mode: result.mode,
    batchMode: result.batchMode,
    startedAt: result.startedAt,
    finishedAt: result.finishedAt,
    cancelled: !!result.cancelled,
    ...(result.blocked ? { blocked: result.blocked } : {}),
    summary: countOutcomes(result.apps),
    message: describeRunResult(result).text,
    ...(result.backup ? { backup: result.backup } : {}),
    apps: result.apps.map((app) => ({ ...app })),
    logs: [...(result.logs || [])]
  };
}

export function stringifyDeployResultJson(result: DeployRunResult): string {
  return JSON.stringify(buildDeployResultJson(result), null, 2);
}
