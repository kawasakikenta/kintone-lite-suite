'use strict';

/**
 * 本番反映（lite）の画面。プレビューの未公開の変更をアプリごとに確認し、反映前の本番設定をバックアップしてから
 * 本番へ反映（アプリを更新）または変更を中止する。エンジンは tabs/deploy-standalone.ts の 3 関数と deploy/types.ts の型だけで使う。
 *
 * 4 段階: 1 対象を選ぶ → 2 変更を確認（書き込みなし）→ 3 最終確認 → 4 結果。
 */

import { DEFAULT_APP_ID } from '../constants.js';
import { inspectDeployTargetsStandalone, runDeployStandalone, validateDeployTargets } from '../tabs/deploy-standalone.js';
import type {
  DeployAppInspection,
  DeployAppOutcome,
  DeployAppRef,
  DeployAppStatus,
  DeployAppUpdate,
  DeployBatchMode,
  DeployInspectResult,
  DeployMode,
  DeployRunResult
} from '../deploy/types.js';
import {
  DEPLOY_ATOMIC_LIMIT,
  DEPLOY_RESULT_FULL_LIMIT,
  DEPLOY_TARGET_LIMIT,
  aggregateChanges,
  appSettingsPath,
  backupDescription,
  changedSectionLabels,
  collectRemovedFields,
  confirmRequirement,
  countInspectStates,
  countOutcomes,
  defaultSelectedKeys,
  deployAppKey,
  deployModeText,
  deployRunLabel,
  describeBatchMode,
  describeDeployOptions,
  describeDeployMessage,
  describeDeployStatus,
  describeInspectSummary,
  describeRemovedField,
  describeRemovedSettings,
  describeRunProgress,
  describeRunResult,
  describeStopPolicy,
  formatDeployApp,
  formatRevisionPair,
  inspectStateLabel,
  isProblemStatus,
  isSelectableInspection,
  removedSettingCount,
  retryableOutcomes,
  selectionBlockers,
  sortInspectionsForReview,
  summarizeSelection,
  undoGuidance,
  type DeployOutcomeCounts
} from '../deploy/display.js';
import { buildDeployPlanMarkdown, buildDeployRecordMarkdown, stringifyDeployResultJson } from '../deploy/report.js';
import {
  attachCardHelp,
  copyTextToClipboard,
  createLitePanel,
  liteRun,
  makeAppTable,
  makeButton,
  makeCard,
  makeCheck,
  makeDialog,
  makeInput,
  makeNote,
  type AppTableRow
} from './litePanelTheme.js';
import { createAppSearchControl } from './appSearchControl.js';
import { createProgressView, el, firstLines, setButtonText, type ProgressView } from './deployProgressView.js';
import { createSourceFlow } from './deploy-source-ui.js';
import { appendReflectItems } from './reflectPlanView.js';
import { guestIdFromPagePath } from '../reflect/liteSetup.js';
import { buildAppFilenameLabel, buildExportFilename, downloadText, summarizeList } from '../utils.js';

// =============================================================================
// メモリ状態（リロードで消える。lite はブラウザ永続ストレージを使わない方針）
// =============================================================================

type Stage = 'setup' | 'review' | 'confirm' | 'result';

/** 直近の実行結果。差分確認の取得値（バックアップ用の設定本体）は持たない。 */
interface RunSnapshot {
  result: DeployRunResult;
  inspections: DeployAppInspection[];
  stopOnError: boolean;
}

/** 操作の切り替え: source = 反映元アプリから本番へ（既定）、publish = プレビューの変更を公開（従来の流れ） */
type DeployFlow = 'source' | 'publish';

interface DeployMemory {
  flow: DeployFlow;
  targets: AppTableRow[];
  mode: DeployMode;
  batchMode: DeployBatchMode;
  stopOnError: boolean;
  lastRun: RunSnapshot | null;
}

const memory: DeployMemory = { flow: 'source', targets: [], mode: 'deploy', batchMode: 'sequential', stopOnError: true, lastRun: null };

interface InspectionState {
  apps: DeployAppInspection[];
  /** 確認したときの条件（対象・操作・詳細設定）。変わったら差分確認からやり直す */
  signature: string;
  at: number;
  inspectedAt: string;
}

// =============================================================================
// スタイル
// =============================================================================

const STYLE_ID = 'kus-deploy-lite-styles';
const P = '#kus-deploy-lite';

const CSS = `
${P}.kus-lp--wide{width:min(960px,calc(100vw - 32px));max-height:calc(100dvh - 32px);top:16px;right:16px;border-radius:18px;border-color:#cbd5e1}
${P} .kus-lp__hero{padding:16px 24px}
${P} .kus-lp__title{font-size:22px;letter-spacing:-.01em;word-break:keep-all}
${P} .kus-lp__subtitle{font-size:14px;max-width:560px}
${P} .kus-lp__body{padding:0;background:#f4f6f8;display:flex;flex-direction:column;overflow:hidden}
${P} .kus-lp__hint{margin:0;padding:11px 24px;border:0;border-bottom:1px solid #e2e8f0;border-radius:0;background:#fff1f2;color:#9f1239}
${P} .kus-lp__hint strong{color:#881337}
${P} .kus-lp__card{border-radius:16px;padding:16px 18px;box-shadow:0 1px 2px rgba(15,23,42,.04)}
${P} .kus-lp__card-head{border:0;margin:0 0 12px;padding:0}
${P} .kus-lp__card-title{font-size:13px;text-transform:none;letter-spacing:.01em;color:#172033}
${P} .kus-lp__card-num{background:#881337;color:#fff}
${P} [hidden]{display:none!important}
${P} :is(button,input,select,summary):focus-visible{outline:3px solid #2563eb;outline-offset:3px}
${P} .kus-dp-workspace{display:flex;flex-direction:column;min-height:0;flex:1}
${P} .kus-dp-canvas{min-width:0;min-height:0;overflow:auto;padding:20px 24px;scroll-padding:16px}
${P} .kus-dp-nav{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;padding:10px 24px;background:#fff;border-bottom:1px solid #e2e8f0;flex-shrink:0}
${P} .kus-dp-nav__btn{appearance:none;width:100%;border:1px solid transparent;border-radius:10px;background:transparent;color:#64748b;padding:10px;cursor:pointer;font-family:inherit;font-size:13px;font-weight:700;display:grid;grid-template-columns:24px 1fr;align-items:center;gap:9px;text-align:left}
${P} .kus-dp-nav__btn:hover{background:#f1f5f9;color:#172033}
${P} .kus-dp-nav__btn[aria-selected="true"]{background:#fff1f2;color:#881337;border-color:#fecdd3}
${P} .kus-dp-nav__btn:disabled{opacity:.45;cursor:not-allowed}
${P} .kus-dp-nav__num{display:inline-flex;width:19px;height:19px;align-items:center;justify-content:center;border-radius:50%;background:#e2e8f0;color:#475569;font-size:11.5px}
${P} .kus-dp-nav__btn[aria-selected="true"] .kus-dp-nav__num{background:#ffe4e6;color:#881337}
${P} .kus-dp-nav__copy{display:block;font-size:11px;font-weight:500;color:#94a3b8;margin-top:2px}
${P} .kus-dp-nav__btn[aria-selected="true"] .kus-dp-nav__copy{color:#64748b}
${P} .kus-dp-stage[hidden]{display:none}
${P} .kus-dp-stage-head{margin:0 2px 16px}
${P} .kus-dp-stage-head h2{margin:0;font-size:20px;letter-spacing:-.02em;color:#0f172a}
${P} .kus-dp-stage-head p{margin:4px 0 0;font-size:13px;color:#64748b}
${P} .kus-dp-stage .kus-lp__card:last-child{margin-bottom:0}
${P} .kus-dp-setup{display:grid;grid-template-columns:minmax(0,1fr);gap:14px}
${P} .kus-dp-setup>.kus-lp__card{margin:0}
${P} .kus-dp-count{font-size:12.5px;font-weight:700;color:#475569}
${P} .kus-dp-count--over{color:#b91c1c}
${P} .kus-dp-choices{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:8px}
${P} .kus-dp-choice{padding:12px;border:1px solid #cbd5e1;border-radius:10px;background:#fff;cursor:pointer;display:grid;grid-template-columns:18px 1fr;gap:8px;font-size:13px;min-width:0;align-items:start}
${P} .kus-dp-choice:has(input:checked){border-color:#be123c;background:#fff1f2}
${P} .kus-dp-choice:has(input:disabled){opacity:.55;cursor:not-allowed}
${P} .kus-dp-choice strong{display:block;color:#0f172a}
${P} .kus-dp-choice small{display:block;margin-top:3px;color:#64748b;line-height:1.5}
${P} .kus-dp-detail-row{display:flex;flex-wrap:wrap;align-items:center;gap:8px 12px}
${P} .kus-dp-detail-summary{flex:1 1 220px;min-width:0;overflow-wrap:anywhere;font-size:13px;line-height:1.5;color:#475569}
${P} .kus-dp-detail-summary--warn{color:#9a3412;font-weight:700}
${P} .kus-lp__dialog .kus-lp__card--soft{box-shadow:none}
${P} .kus-dp-next{padding:10px 12px;border-radius:10px;font-size:13px;line-height:1.6;border:1px solid #e2e8f0;background:#fff;overflow-wrap:anywhere}
${P} .kus-dp-next--ok{background:#ecfdf5;border-color:#a7f3d0;color:#065f46}
${P} .kus-dp-next--info{background:#eff6ff;border-color:#bfdbfe;color:#1e3a8a}
${P} .kus-dp-next--warn{background:#fffbeb;border-color:#fde68a;color:#92400e}
${P} .kus-dp-next--err{background:#fef2f2;border-color:#fecaca;color:#991b1b}
${P} .kus-dp-quiet{margin:6px 0 0;font-size:13px;color:#64748b;overflow-wrap:anywhere}
${P} .kus-dp-pills{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 10px}
${P} .kus-dp-pill{display:inline-flex;align-items:center;gap:4px;padding:3px 8px;border-radius:999px;font-size:12.5px;font-weight:700;border:1px solid #e2e8f0;background:#fff;color:#334155}
${P} .kus-dp-pill--change{background:#fff7ed;border-color:#fdba74;color:#9a3412}
${P} .kus-dp-pill--same{background:#ecfdf5;border-color:#a7f3d0;color:#065f46}
${P} .kus-dp-pill--error{background:#fef2f2;border-color:#fca5a5;color:#991b1b}
${P} .kus-dp-pill--processing{background:#eff6ff;border-color:#93c5fd;color:#1d4ed8}
${P} .kus-dp-tools{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}
${P} .kus-dp-issues{margin:8px 0 0;padding-left:18px;font-size:13px;line-height:1.6;color:#92400e;overflow-wrap:anywhere}
${P} .kus-dp-table-wrap{border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;background:#fff}
${P} .kus-dp-table{width:100%;border-collapse:collapse;font-size:13px}
${P} .kus-dp-table th{padding:7px 10px;text-align:left;font-size:12.5px;font-weight:700;color:#475569;background:#f8fafc;border-bottom:1px solid #e2e8f0;white-space:nowrap}
${P} .kus-dp-table td{padding:8px 10px;border-top:1px solid #f1f5f9;vertical-align:top;overflow-wrap:anywhere}
${P} .kus-dp-table td.kus-dp-c-sel{width:34px}
${P} .kus-dp-table td.kus-dp-c-app{min-width:150px}
${P} .kus-dp-table td.kus-dp-c-state,${P} .kus-dp-table td.kus-dp-c-act{white-space:nowrap}
${P} .kus-dp-table td.kus-dp-c-rev{min-width:130px}
${P} .kus-dp-table td.kus-dp-c-act .kus-lp__btn{padding:4px 8px;white-space:nowrap}
${P} .kus-dp-pill{white-space:nowrap}
${P} .kus-dp-table tr.kus-dp-row--error td{background:#fff5f5}
${P} .kus-dp-table tr.kus-dp-row--processing td{background:#eff6ff}
${P} .kus-dp-table tr.kus-dp-row--clean td{color:#64748b}
${P} .kus-dp-table tr.kus-dp-detail-tr>td{padding:0 10px 10px;background:#fff}
${P} .kus-dp-app-name{font-weight:700;color:#0f172a}
${P} .kus-dp-app-id{display:block;font-size:12px;color:#64748b}
${P} .kus-dp-app-error{display:block;margin-top:4px;font-size:12.5px;color:#991b1b;white-space:pre-wrap}
${P} .kus-dp-app-sub{display:block;margin-top:4px;font-size:12.5px;color:#475569}
${P} .kus-dp-del{font-variant-numeric:tabular-nums}
${P} .kus-dp-del--has{color:#b91c1c;font-weight:700}
${P} .kus-dp-more{margin-top:8px}
${P} .kus-dp-detail{display:flex;flex-direction:column;gap:8px;padding-top:6px}
${P} .kus-dp-detail h4{margin:4px 0 0;font-size:13px;color:#0f172a}
${P} .kus-dp-danger{padding:10px 12px;border:1px solid #fca5a5;border-radius:10px;background:#fef2f2;color:#991b1b;font-size:13px;line-height:1.6;overflow-wrap:anywhere}
${P} .kus-dp-danger strong{display:block;margin-bottom:2px}
${P} .kus-dp-danger ul{margin:4px 0 0;padding-left:18px}
${P} .kus-dp-danger small{display:block;color:#7f1d1d}
${P} .kus-dp-info{padding:8px 12px;border:1px solid #bfdbfe;border-radius:10px;background:#eff6ff;color:#1e3a8a;font-size:13px;line-height:1.55;overflow-wrap:anywhere}
${P} .kus-dp-warn{padding:8px 12px;border:1px solid #fde68a;border-radius:10px;background:#fffbeb;color:#92400e;font-size:13px;line-height:1.55;overflow-wrap:anywhere}
${P} .kus-dp-facts{margin:0;display:grid;gap:8px}
${P} .kus-dp-fact{padding:10px 12px;border:1px solid #e2e8f0;border-radius:10px;background:#fff;overflow-wrap:anywhere}
${P} .kus-dp-fact dt{margin:0 0 4px;font-size:12.5px;font-weight:700;color:#64748b}
${P} .kus-dp-fact dd{margin:0;font-size:14px;line-height:1.6;color:#0f172a}
${P} .kus-dp-fact--direction{border:2px solid #be123c;background:#fff1f2}
${P} .kus-dp-fact--danger{border-color:#fca5a5;background:#fef2f2}
${P} .kus-dp-fact--danger dd{color:#991b1b}
${P} .kus-dp-targets{margin:6px 0 0;white-space:pre-wrap;overflow-wrap:anywhere;font:13px/1.6 inherit;color:#334155}
${P} .kus-dp-confirm-input{margin-top:12px;display:flex;flex-direction:column;gap:8px}
${P} .kus-dp-confirm-input label.kus-dp-confirm-label{font-size:13px;font-weight:700;color:#0f172a}
${P} .kus-dp-confirm-input .kus-lp__input{width:100%;max-width:260px;box-sizing:border-box;min-height:40px;font-size:14px}
${P} .kus-dp-progress__summary{margin:0 0 6px;font-size:13px;font-weight:700;color:#334155}
${P} .kus-dp-progress__omitted{margin:0 0 6px;font-size:12.5px;color:#64748b}
${P} .kus-dp-result-list{list-style:none;margin:6px 0 0;padding:0;display:flex;flex-direction:column;gap:6px}
${P} .kus-dp-result-item{min-width:0;padding:8px 10px;border:1px solid #e2e8f0;border-radius:10px;background:#fff;overflow-wrap:anywhere}
${P} .kus-dp-result-item--ok{border-color:#a7f3d0}
${P} .kus-dp-result-item--ng{border-color:#fca5a5;background:#fff5f5}
${P} .kus-dp-result-item--warn{border-color:#fcd34d;background:#fffbeb}
${P} .kus-dp-result-item--pending{border-color:#e2e8f0;background:#f8fafc}
${P} .kus-dp-result-item--run{border-color:#93c5fd;background:#eff6ff}
${P} .kus-dp-result-item__head{display:flex;flex-wrap:wrap;align-items:center;gap:4px 8px;font-size:13px}
${P} .kus-dp-result-state{display:inline-flex;align-items:center;gap:4px;padding:1px 8px;border:1px solid #cbd5e1;border-radius:999px;background:#f8fafc;font-size:12.5px;font-weight:700;color:#475569}
${P} .kus-dp-result-state--ok{border-color:#a7f3d0;background:#ecfdf5;color:#065f46}
${P} .kus-dp-result-state--ng{border-color:#fca5a5;background:#fef2f2;color:#991b1b}
${P} .kus-dp-result-state--warn{border-color:#fcd34d;background:#fffbeb;color:#92400e}
${P} .kus-dp-result-state--run{border-color:#93c5fd;background:#dbeafe;color:#1e40af}
${P} .kus-dp-result-item__message{margin-top:6px;font-size:13px;line-height:1.6;color:#334155;white-space:pre-wrap;overflow-wrap:anywhere}
${P} .kus-dp-result-item__meta{margin-top:4px;font-size:12.5px;color:#64748b}
${P} .kus-dp-result-item__meta--warn{color:#9a3412;font-weight:700}
${P} .kus-dp-result-head{font-size:14px;font-weight:700;margin:0 0 8px;overflow-wrap:anywhere}
${P} .kus-dp-result-notes{display:flex;flex-direction:column;gap:8px;margin:8px 0}
${P} .kus-dp-empty{padding:14px 12px;border:1px dashed #cbd5e1;border-radius:10px;background:#f8fafc;font-size:13px;color:#64748b}
${P} .kus-dp-action-dock{flex-shrink:0;padding:12px 24px;background:#fff;border-top:1px solid #e2e8f0}
${P} .kus-dp-dock-row{display:flex;align-items:center;gap:10px}
${P} .kus-dp-dock-copy{flex:1;min-width:0;font-size:13px;color:#475569;overflow-wrap:anywhere}
${P} .kus-dp-dock-copy strong{display:block;color:#0f172a}
${P} .kus-dp-dock-msg{display:block}
${P} .kus-dp-dock-reason{color:#9a3412;font-weight:600}
${P} .kus-dp-dock-actions{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end}
${P} .kus-dp-dock-actions .kus-lp__btn{min-height:42px}
${P} .kus-dp-action-dock .kus-lp__result{max-height:80px;overflow:auto}
${P} .kus-dp-action-dock .kus-lp__status-text{max-height:48px;overflow:auto}
${P} .kus-dp-action-dock .kus-lp__status{margin-top:8px}
${P} .kus-rl-items{margin:4px 0;padding:10px 12px;border:1px solid #e2e8f0;border-radius:10px;background:#fff}
${P} .kus-rl-items__title{display:flex;flex-wrap:wrap;align-items:baseline;gap:2px 10px;margin-bottom:8px;font-size:13px;color:#475569}
${P} .kus-rl-items__title strong{font-size:13px;color:#0f172a}
${P} .kus-rl-items__list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:7px}
${P} .kus-rl-item{display:grid;grid-template-columns:auto minmax(0,1fr);column-gap:8px;row-gap:2px;align-items:baseline;font-size:13px;line-height:1.55;overflow-wrap:anywhere}
${P} .kus-rl-item__name{min-width:0;font-weight:700;color:#0f172a}
${P} .kus-rl-item__details{grid-column:2;margin:0;padding-left:16px;font-size:13px;color:#475569}
${P} .kus-rl-item--keep .kus-rl-item__name{font-weight:600;color:#475569}
${P} .kus-rl-kind{display:inline-block;min-width:36px;padding:0 6px;border:1px solid #cbd5e1;border-radius:4px;background:#f1f5f9;color:#475569;font-size:12px;font-weight:800;line-height:18px;letter-spacing:.04em;text-align:center}
${P} .kus-rl-kind--delete{border-color:#fca5a5;background:#fef2f2;color:#991b1b}
${P} .kus-rl-kind--change{border-color:#fdba74;background:#fff7ed;color:#9a3412}
${P} .kus-rl-kind--add{border-color:#86efac;background:#f0fdf4;color:#166534}
${P} .kus-rl-items--quiet{padding:0 12px;border-style:dashed;background:#f8fafc}
${P} .kus-rl-items--quiet>summary{cursor:pointer;padding:8px 0;font-size:13px;font-weight:700;color:#64748b}
${P} .kus-rl-items__more{margin-top:8px}
@media(max-width:760px){
  ${P} .kus-dp-table,${P} .kus-dp-table tbody{display:block}
  ${P} .kus-dp-table thead{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
  ${P} .kus-dp-table tr.kus-dp-row{display:grid;grid-template-columns:28px minmax(0,1fr) auto;gap:4px 8px;padding:10px 12px;border-top:1px solid #e2e8f0}
  ${P} .kus-dp-table tr.kus-dp-row:first-child{border-top:0}
  ${P} .kus-dp-table tr.kus-dp-row>td{display:block;padding:0;border:0;min-width:0;background:transparent!important}
  ${P} .kus-dp-table td.kus-dp-c-sel{grid-column:1;grid-row:1;width:auto}
  ${P} .kus-dp-table td.kus-dp-c-app,${P} .kus-dp-table td.kus-dp-c-rev{min-width:0}
  ${P} .kus-dp-table td.kus-dp-c-app{grid-column:2;grid-row:1}
  ${P} .kus-dp-table td.kus-dp-c-state{grid-column:3;grid-row:1;justify-self:end}
  ${P} .kus-dp-table td.kus-dp-c-items,${P} .kus-dp-table td.kus-dp-c-del,${P} .kus-dp-table td.kus-dp-c-rev,${P} .kus-dp-table td.kus-dp-c-act{grid-column:2/-1}
  ${P} .kus-dp-table td.kus-dp-c-items::before,${P} .kus-dp-table td.kus-dp-c-del::before,${P} .kus-dp-table td.kus-dp-c-rev::before{content:attr(data-label) "：";font-size:12px;font-weight:700;color:#64748b}
  ${P} .kus-dp-table tr.kus-dp-row.kus-dp-row--error{background:#fff5f5}
  ${P} .kus-dp-table tr.kus-dp-row.kus-dp-row--processing{background:#eff6ff}
  ${P} .kus-dp-table tr.kus-dp-detail-tr{display:block}
  ${P} .kus-dp-table tr.kus-dp-detail-tr>td{display:block}
}
@media(max-width:720px){
  ${P}.kus-lp--wide{width:calc(100vw - 16px);right:8px;top:8px;max-height:calc(100dvh - 16px)}
  ${P} .kus-lp__hero{padding:12px 16px}
  ${P} .kus-lp__hint{display:none}
  ${P} .kus-dp-nav{padding:8px;gap:4px}
  ${P} .kus-dp-nav__copy,${P} .kus-dp-nav__num{display:none}
  ${P} .kus-dp-nav__btn{display:flex;justify-content:center;text-align:center;padding:8px 4px;font-size:12.5px}
  ${P} .kus-dp-canvas{padding:18px 16px 8px}
  ${P} .kus-dp-action-dock{padding:12px 16px 15px}
  ${P} .kus-dp-dock-row{align-items:stretch;flex-direction:column;gap:8px}
  ${P} .kus-dp-dock-actions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px}
  ${P} .kus-dp-dock-actions .kus-lp__btn{min-width:0;white-space:normal}
  ${P} .kus-dp-dock-actions .kus-lp__btn--danger,${P} .kus-dp-dock-actions .kus-lp__btn--primary{grid-column:1/-1}
  ${P} .kus-lp__card{padding:12px}
  ${P} .kus-lp__card-head{flex-wrap:wrap}
  ${P} .kus-lp__select{min-width:0!important;max-width:100%}
}
@media(max-width:400px){${P} .kus-lp__elapsed{display:none}}
@media(max-height:720px){
  ${P} .kus-lp__hero{padding:8px 16px}
  ${P} .kus-lp__title{font-size:17px}
  ${P} .kus-lp__subtitle{display:none}
  ${P} .kus-dp-nav{padding:6px 12px}
  ${P} .kus-dp-nav__btn{padding:6px 4px}
  ${P} .kus-dp-nav__copy{display:none}
  ${P} .kus-dp-canvas{padding:12px 16px 8px}
  ${P} .kus-dp-stage-head{margin-bottom:10px}
  ${P} .kus-dp-stage-head h2{font-size:17px}
  ${P} .kus-dp-stage-head p{display:none}
  ${P} .kus-dp-action-dock{padding:8px 16px 10px}
  ${P} .kus-dp-dock-row{gap:6px}
  ${P} .kus-dp-dock-copy{font-size:12.5px;line-height:1.4}
  ${P} .kus-dp-dock-copy strong,${P} .kus-dp-dock-msg{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden}
  ${P} .kus-dp-dock-actions{gap:4px 6px}
  ${P} .kus-dp-dock-actions .kus-lp__btn{min-height:36px;padding:6px 10px}
  ${P} .kus-dp-action-dock .kus-lp__status{margin-top:6px;padding:6px 10px;min-height:0;line-height:1.4}
  ${P} .kus-dp-action-dock .kus-lp__status-text{max-height:2.9em}
  ${P} .kus-dp-action-dock .kus-lp__result{max-height:48px}
}
@media(prefers-reduced-motion:reduce){${P}{animation:none}${P} *{scroll-behavior:auto!important}}
`;

function ensureStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const st = document.createElement('style');
  st.id = STYLE_ID;
  st.textContent = CSS;
  document.head.appendChild(st);
}

const FLOW_SUBTITLES: Record<DeployFlow, string> = {
  source: '反映元アプリとの差分を選んで、反映先のプレビューへ書き込み、続けて本番へ反映します。',
  publish: 'プレビューの未公開の変更を確認してから、本番へ反映します。'
};

// =============================================================================
// 変更の詳細（開いたときに描画する）
// =============================================================================

function renderAppDetail(host: HTMLElement, app: DeployAppInspection, mode: DeployMode) {
  host.replaceChildren();
  const body = el('div', 'kus-dp-detail');
  const text = deployModeText(mode);
  if (app.contentSame) {
    body.appendChild(el('div', 'kus-dp-info', '設定の内容は同じです（revision だけが異なります）。'));
  }
  const removed = app.removedFields || [];
  if (removed.length && mode === 'deploy') {
    const box = el('div', 'kus-dp-danger');
    box.dataset.deployRemovedFields = String(removed.length);
    box.appendChild(el('strong', '', `削除されるフィールド（${removed.length} 件）`));
    box.appendChild(document.createTextNode('本番へ反映すると、このフィールドのレコードの値も削除され、元に戻せません。'));
    const ul = el('ul');
    for (const field of removed) {
      const li = el('li');
      li.textContent = describeRemovedField(field);
      if (field.possibleRename) {
        const sub = el('small', '', `フィールドコードを変えただけなら値は残る可能性があります（プレビューの『${field.possibleRename}』）`);
        li.appendChild(sub);
      }
      ul.appendChild(li);
    }
    box.appendChild(ul);
    body.appendChild(box);
  } else if (removed.length) {
    body.appendChild(el('div', 'kus-dp-info', `プレビューで削除されたフィールド（${removed.length} 件）は、変更を中止すると本番の状態に戻ります。`));
  }
  for (const warning of app.warnings || []) body.appendChild(el('div', 'kus-dp-warn', warning));
  const changed = (app.sections || []).filter((section) => section.status === 'change');
  for (const section of (app.sections || [])) {
    if (section.status === 'error') {
      body.appendChild(el('div', 'kus-dp-warn', `${section.label}: 取得失敗${section.message ? `（${firstLines(section.message, 2)}）` : ''}`));
    }
  }
  for (const section of changed) {
    const block = el('section');
    block.dataset.deploySection = section.sectionKey;
    const counts = section.counts;
    block.appendChild(el('h4', '', `${section.label}（追加 ${counts.added}・変更 ${counts.changed}・削除 ${counts.removed}）`));
    if (section.items?.length) {
      appendReflectItems(block, { label: section.label, items: section.items, sectionKey: section.sectionKey });
      const title = block.querySelector('.kus-rl-items__title strong');
      if (title) title.textContent = text.changesHeading;
    } else {
      block.appendChild(el('div', 'kus-dp-quiet', `変更 ${counts.added + counts.changed + counts.removed} 件（要約を作成できませんでした）`));
    }
    body.appendChild(block);
  }
  const same = (app.sections || []).filter((section) => section.status === 'same').map((section) => section.label);
  if (same.length) body.appendChild(el('div', 'kus-dp-quiet', `変更のない項目: ${same.join('、')}`));
  if (!changed.length && !removed.length && !(app.warnings || []).length && !app.contentSame) {
    body.appendChild(el('div', 'kus-dp-quiet', '変更の要約はありません。'));
  }
  host.appendChild(body);
}

// =============================================================================
// メイン
// =============================================================================

export function mountDeployLitePanel() {
  // 反映の実行中に再起動すると、実行中の処理を見失う。既存のパネルを残す。
  const running = document.getElementById('kus-deploy-lite');
  if (running?.getAttribute('aria-busy') === 'true') {
    running.setAttribute('tabindex', '-1');
    running.focus({ preventScroll: true });
    return;
  }
  ensureStyles();

  const panel = createLitePanel({
    id: 'kus-deploy-lite',
    title: '本番反映',
    subtitle: FLOW_SUBTITLES[memory.flow],
    accent: 'deploy',
    badges: [{ label: '本番の設定を変更', tone: 'production' }],
    hint: '<strong>本番のアプリ設定を変更します。</strong>反映前に差分と削除される設定を確認し、反映前の設定をバックアップしてから実行します。',
    wide: true
  });
  const runLite = <T,>(busyMsg: string, fn: () => Promise<T>, okMsg?: string) => liteRun(panel, busyMsg, async () => {
    panel.setResult('');
    return fn();
  }, okMsg);

  let busy = false;
  let ready = false;
  let activeStage: Stage = 'setup';
  let inspection: InspectionState | null = null;
  let selected = new Set<string>();
  let confirmedToken = '';
  let progressView: ProgressView | null = null;
  let reviewShown = 200;
  /** 実行中のモード（結果の表示・記録に使う） */
  let runningMode: DeployMode = memory.mode;
  let showStage: (stage: Stage) => void = () => {};
  let refreshWorkflow: () => void = () => {};

  const pageGuest = () => guestIdFromPagePath(window.location?.pathname || '');
  const currentMode = (): DeployMode => (modeRadios.revert.checked ? 'revert' : 'deploy');
  const currentBatchMode = (): DeployBatchMode => (batchRadios.atomic.checked ? 'atomic' : 'sequential');
  const currentStopOnError = () => !continueRadio.checked || currentBatchMode() === 'atomic';

  // ---------------------------------------------------------------------------
  // 段階 1: 対象を選ぶ
  // ---------------------------------------------------------------------------
  const cardApps = makeCard({ title: '対象アプリ', number: 1 });
  const countLabel = el('span', 'kus-dp-count');
  cardApps.actions.appendChild(countLabel);
  const appTable = makeAppTable({
    minRows: 1,
    currentAppId: DEFAULT_APP_ID,
    currentGuestId: pageGuest(),
    initial: memory.targets,
    onChange: () => { if (ready) onInputsChanged(); }
  });
  cardApps.body.appendChild(appTable.element);
  cardApps.body.appendChild(createAppSearchControl(panel, {
    targets: [{
      label: '対象アプリ',
      apply: (id, name, guestId) => {
        const result = appTable.putApp(id, guestId || '', { appName: name });
        return {
          message: `App ${id}${name ? `「${name}」` : ''} を対象アプリに${result.action === 'existing' ? '追加済みです' : '追加しました'}（現在 ${appTable.count()} 件）`,
          pickedLabel: result.action === 'existing' ? '追加済み' : '対象アプリに追加済み'
        };
      },
      applyAll: (apps, guestId) => {
        const result = appTable.putApps(apps.map((app) => ({ appId: app.appId, guestId, appName: app.appName })));
        const parts = [`新規 ${result.added + result.filled} 件`];
        if (result.existing) parts.push(`追加済み ${result.existing} 件`);
        if (result.ignored) parts.push(`IDなしで無視 ${result.ignored} 件`);
        return {
          message: `候補 ${apps.length} 件を対象アプリに追加しました（${parts.join(' / ')}。表は合計 ${appTable.count()} 件）。`,
          tone: result.ignored ? 'warn' : 'ok',
          pickedLabel: `${apps.length} 件を追加済み`
        };
      },
      applyAllLabel: (count) => `候補 ${count} 件をすべて対象アプリに追加`
    }]
  }));
  cardApps.body.appendChild(makeNote(`対象アプリは最大 ${DEPLOY_TARGET_LIMIT} 件です。アプリごとにゲストスペースを指定できます。「アプリを検索」の「環境内の全アプリ」から、環境内のアプリをまとめて追加できます。`, 'help'));

  const cardOp = makeCard({ title: '操作', number: 2 });
  function makeChoice(name: string, value: string, title: string, description: string, checked: boolean) {
    const label = el('label', 'kus-dp-choice');
    const input = document.createElement('input');
    input.type = 'radio';
    input.name = name;
    input.value = value;
    input.checked = checked;
    input.setAttribute('aria-label', title);
    const copy = el('span');
    copy.append(el('strong', '', title), el('small', '', description));
    label.append(input, copy);
    return { label, input };
  }
  const opGroup = el('div', 'kus-dp-choices');
  opGroup.setAttribute('role', 'radiogroup');
  opGroup.setAttribute('aria-label', '操作');
  const modeId = `${panel.root.id}-mode`;
  const deployChoice = makeChoice(modeId, 'deploy', deployModeText('deploy').label, deployModeText('deploy').description, memory.mode !== 'revert');
  const revertChoice = makeChoice(modeId, 'revert', deployModeText('revert').label, deployModeText('revert').description, memory.mode === 'revert');
  const modeRadios = { deploy: deployChoice.input, revert: revertChoice.input };
  opGroup.append(deployChoice.label, revertChoice.label);
  cardOp.body.appendChild(opGroup);
  cardOp.body.appendChild(makeNote('「本番へ反映」は kintone の「アプリを更新」、「変更を中止」は「変更を中止」と同じ操作です。変更を中止しても本番の設定は変わりません。どちらも、実行前に本番とプレビューの差分を確認します。', 'help'));

  // 詳細設定（反映の方法・失敗したとき）
  const detail = makeDialog({ title: '詳細設定', id: 'kus-dp-detail' });
  const cardBatch = makeCard({ title: '反映の方法', soft: true });
  const batchId = `${panel.root.id}-batch`;
  const seqChoice = makeChoice(batchId, 'sequential', '1アプリずつ反映（既定）', '1アプリずつ依頼し、完了を確認してから次へ進みます。', memory.batchMode !== 'atomic');
  const atomicChoice = makeChoice(batchId, 'atomic', 'まとめて反映', `すべて成功したときだけ本番へ反映します。最大 ${DEPLOY_ATOMIC_LIMIT} 件・同じゲストスペース。`, memory.batchMode === 'atomic');
  const batchRadios = { sequential: seqChoice.input, atomic: atomicChoice.input };
  const batchGroup = el('div', 'kus-dp-choices');
  batchGroup.setAttribute('role', 'radiogroup');
  batchGroup.setAttribute('aria-label', '反映の方法');
  batchGroup.append(seqChoice.label, atomicChoice.label);
  cardBatch.body.append(batchGroup, makeNote('まとめて反映は、1回の依頼にまとめます。kintone は1件でも失敗するとすべて取り消すため、本番が中途半端な状態になりません。', 'help'));
  const cardStop = makeCard({ title: '失敗したとき', soft: true });
  const stopId = `${panel.root.id}-stop`;
  const stopChoice = makeChoice(stopId, 'stop', '残りを実行しない（既定）', '失敗・確認後の更新・完了を確認できないアプリが出たら、残りは未実行にします。', memory.stopOnError);
  const continueChoice = makeChoice(stopId, 'continue', '残りも続ける', '失敗したアプリがあっても、残りのアプリを続けます。', !memory.stopOnError);
  const continueRadio = continueChoice.input;
  const stopGroup = el('div', 'kus-dp-choices');
  stopGroup.setAttribute('role', 'radiogroup');
  stopGroup.setAttribute('aria-label', '失敗したとき');
  stopGroup.append(stopChoice.label, continueChoice.label);
  cardStop.body.append(stopGroup, makeNote('1アプリずつ反映するときだけ選べます。まとめて反映では、1件でも失敗するとすべて取り消されます。', 'help'));
  detail.body.append(cardBatch.card, cardStop.card);
  attachCardHelp(detail.body);
  panel.root.appendChild(detail.dialog);
  const detailBtn = makeButton('詳細設定…', 'sub');
  detailBtn.setAttribute('aria-haspopup', 'dialog');
  detailBtn.addEventListener('click', () => detail.open());
  const detailSummary = el('span', 'kus-dp-detail-summary');
  const detailRow = el('div', 'kus-dp-detail-row');
  detailRow.append(detailBtn, detailSummary);

  /** ポップアップの中の設定を、表面に 1 行で示す（隠れた設定で意図しない動作をしないため）。 */
  function refreshDetailSummary() {
    const atomic = currentBatchMode() === 'atomic';
    stopChoice.input.disabled = atomic;
    continueChoice.input.disabled = atomic;
    const summary = describeDeployOptions(currentBatchMode(), currentStopOnError());
    detailSummary.textContent = summary.text;
    detailSummary.classList.toggle('kus-dp-detail-summary--warn', summary.warn);
  }

  function currentTargets(): DeployAppRef[] {
    return appTable.getApps().map((app) => ({ appId: app.appId, guestId: app.guestId, ...(app.appName ? { name: app.appName } : {}) }));
  }

  function currentSignature(): string {
    return JSON.stringify([currentMode(), currentBatchMode(), currentStopOnError(), currentTargets().map((app) => [app.guestId, app.appId])]);
  }

  const isFresh = () => !!inspection && inspection.signature === currentSignature();

  /** 次に進めない理由（空なら進める）。エンジンの検証結果を優先する。 */
  function setupBlocker(): string {
    const targets = currentTargets();
    try {
      const message = validateDeployTargets(targets, currentBatchMode());
      if (message) return message;
    } catch (error: any) {
      return `対象アプリを確認できません（${String(error?.message || error)}）`;
    }
    if (targets.length > DEPLOY_TARGET_LIMIT) return `対象アプリは最大 ${DEPLOY_TARGET_LIMIT} 件です（現在 ${targets.length} 件）。表から減らしてください。`;
    return '';
  }

  function onInputsChanged() {
    memory.targets = appTable.getAllRows().map((row) => ({ ...row }));
    memory.mode = currentMode();
    memory.batchMode = currentBatchMode();
    memory.stopOnError = currentStopOnError();
    const count = appTable.count();
    countLabel.textContent = `${count} アプリ（最大 ${DEPLOY_TARGET_LIMIT}）`;
    countLabel.classList.toggle('kus-dp-count--over', count > DEPLOY_TARGET_LIMIT);
    refreshDetailSummary();
    // 差分確認の後に条件が変わったら、確認は解除して差分確認からやり直す。
    if (confirmedToken && confirmedToken !== confirmationToken()) clearConfirmation();
    if (ready) refreshReview();
    refreshWorkflow();
  }
  for (const input of [modeRadios.deploy, modeRadios.revert, batchRadios.sequential, batchRadios.atomic, stopChoice.input, continueChoice.input]) {
    input.addEventListener('change', onInputsChanged);
  }

  const setupStage = el('div', 'kus-dp-setup');
  setupStage.append(cardApps.card, cardOp.card, detailRow);

  // ---------------------------------------------------------------------------
  // 段階 2: 変更を確認
  // ---------------------------------------------------------------------------
  const reviewCard = makeCard({ title: '確認の結果' });
  const reviewBody = el('div');
  reviewCard.body.appendChild(reviewBody);
  const pillsEl = el('div', 'kus-dp-pills');
  const infoEl = el('div', 'kus-dp-next kus-dp-next--info');
  const issuesEl = el('ul', 'kus-dp-issues');
  reviewBody.append(pillsEl, infoEl, issuesEl);
  const recheckProblemsBtn = makeButton('取得失敗・処理中だけ確認し直す', 'sub');
  const recheckAllBtn = makeButton('確認し直す', 'sub');
  const savePlanBtn = makeButton('計画をMarkdownで保存', 'sub');
  const copyPlanBtn = makeButton('計画のMarkdownをコピー', 'sub');
  const toolsEl = el('div', 'kus-dp-tools');
  toolsEl.append(recheckProblemsBtn, recheckAllBtn, savePlanBtn, copyPlanBtn);
  reviewBody.appendChild(toolsEl);
  reviewBody.appendChild(makeNote('変更の要約は、本番を基準にしたときの追加・変更・削除です。「変更を中止」を選んだときは、プレビューで加えた未公開の変更が「破棄される変更」になります。取得失敗や反映処理中のアプリは、確認し直すか対象から外すまで次へ進めません。', 'help'));

  const listCard = makeCard({ title: 'アプリ別の変更' });
  const selectChangedBtn = makeButton('変更ありをすべて選択', 'ghost');
  const clearSelectionBtn = makeButton('選択を解除', 'ghost');
  listCard.actions.append(selectChangedBtn, clearSelectionBtn);
  const tableWrap = el('div', 'kus-dp-table-wrap');
  const table = el('table', 'kus-dp-table');
  table.innerHTML = '<thead><tr><th scope="col">選択</th><th scope="col">アプリ</th><th scope="col">状態</th><th scope="col">変更のある項目</th><th scope="col">削除</th><th scope="col">revision</th><th scope="col">詳細</th></tr></thead>';
  const tbody = el('tbody');
  table.appendChild(tbody);
  tableWrap.appendChild(table);
  const moreRowsBtn = makeButton('さらに表示', 'sub');
  moreRowsBtn.classList.add('kus-dp-more');
  const reviewEmpty = el('div', 'kus-dp-empty', '対象アプリを選び、未公開の変更を確認してください。');
  listCard.body.append(reviewEmpty, tableWrap, moreRowsBtn);

  function modeForInspection(): DeployMode {
    return currentMode();
  }

  function appendReviewRow(app: DeployAppInspection) {
    const key = deployAppKey(app);
    const mode = modeForInspection();
    const tr = el('tr', `kus-dp-row kus-dp-row--${app.state}`);
    tr.dataset.deployApp = app.appId;
    tr.dataset.deployGuest = app.guestId;
    tr.dataset.deployState = app.state;
    const selectable = isSelectableInspection(app);
    const tdSel = el('td', 'kus-dp-c-sel');
    const check = document.createElement('input');
    check.type = 'checkbox';
    check.checked = selectable && selected.has(key);
    check.disabled = !selectable;
    check.setAttribute('aria-label', `${formatDeployApp(app)}を対象にする`);
    check.title = selectable ? '' : '未公開の変更がないため、反映は不要です';
    check.addEventListener('change', () => {
      if (check.checked) selected.add(key); else selected.delete(key);
      refreshReview();
    });
    tdSel.appendChild(check);

    const tdApp = el('td', 'kus-dp-c-app');
    tdApp.appendChild(el('span', 'kus-dp-app-name', app.name || `App ${app.appId}`));
    tdApp.appendChild(el('span', 'kus-dp-app-id', `#${app.appId}${app.guestId ? ` / ゲストスペース ${app.guestId}` : ''}`));
    if (app.state === 'error' || app.state === 'processing') {
      if (app.error) tdApp.appendChild(el('span', 'kus-dp-app-error', firstLines(app.error, 4)));
      const drop = makeButton('対象から外す', 'ghost');
      drop.addEventListener('click', () => removeFromTargets([key]));
      tdApp.appendChild(drop);
    }

    const tdState = el('td', 'kus-dp-c-state');
    const pillClass = app.state === 'changes' ? 'change' : app.state === 'clean' ? 'same' : app.state;
    tdState.appendChild(el('span', `kus-dp-pill kus-dp-pill--${pillClass}`, inspectStateLabel(app.state)));

    const tdItems = el('td', 'kus-dp-c-items');
    tdItems.dataset.label = '変更のある項目';
    const labels = changedSectionLabels(app);
    tdItems.textContent = labels.length ? labels.join('、') : '－';
    if (app.contentSame) tdItems.appendChild(el('span', 'kus-dp-app-sub', '設定の内容は同じです（revision だけが異なります）'));

    const tdDel = el('td', 'kus-dp-c-del');
    tdDel.dataset.label = '削除';
    const removedCount = removedSettingCount(app);
    const removedFields = mode === 'deploy' ? (app.removedFields || []).length : 0;
    tdDel.className = `kus-dp-c-del kus-dp-del${removedCount || removedFields ? ' kus-dp-del--has' : ''}`;
    tdDel.textContent = app.state === 'changes' ? `${removedCount} 件${removedFields ? ` / フィールド ${removedFields} 件（値も削除）` : ''}` : '－';

    const tdRev = el('td', 'kus-dp-c-rev');
    tdRev.dataset.label = 'revision';
    tdRev.textContent = app.productionRevision || app.previewRevision ? formatRevisionPair(app) : '－';

    const tdAct = el('td', 'kus-dp-c-act');
    tr.append(tdSel, tdApp, tdState, tdItems, tdDel, tdRev, tdAct);
    tbody.appendChild(tr);

    if (app.state === 'changes') {
      const toggle = makeButton('詳細を表示', 'ghost');
      toggle.setAttribute('aria-expanded', 'false');
      const detailTr = el('tr', 'kus-dp-detail-tr');
      detailTr.hidden = true;
      const detailTd = el('td');
      detailTd.colSpan = 7;
      detailTr.appendChild(detailTd);
      let rendered = false;
      toggle.addEventListener('click', () => {
        const open = detailTr.hidden;
        detailTr.hidden = !open;
        toggle.setAttribute('aria-expanded', String(open));
        setButtonText(toggle, open ? '詳細を閉じる' : '詳細を表示');
        // 開いたときに初めて描画する（数千件のアプリでも重くしない）
        if (open && !rendered) { rendered = true; renderAppDetail(detailTd, app, modeForInspection()); }
      });
      tdAct.appendChild(toggle);
      tbody.appendChild(detailTr);
    }
  }

  function renderReviewTable() {
    tbody.replaceChildren();
    const apps = inspection ? sortInspectionsForReview(inspection.apps) : [];
    for (const app of apps.slice(0, reviewShown)) appendReviewRow(app);
    const rest = apps.length - reviewShown;
    moreRowsBtn.hidden = rest <= 0;
    if (rest > 0) setButtonText(moreRowsBtn, `さらに表示（残り ${rest} アプリ）`);
    tableWrap.hidden = !apps.length;
    reviewEmpty.hidden = !!apps.length;
  }
  moreRowsBtn.addEventListener('click', () => { reviewShown += 200; renderReviewTable(); });

  function selectedApps(): DeployAppInspection[] {
    return inspection ? inspection.apps.filter((app) => app.state === 'changes' && selected.has(deployAppKey(app))) : [];
  }

  function refreshReview() {
    const fresh = isFresh();
    const apps = inspection?.apps || [];
    const mode = currentMode();
    pillsEl.replaceChildren();
    toolsEl.hidden = !inspection;
    const counts = countInspectStates(apps);
    if (inspection) {
      pillsEl.append(
        el('span', 'kus-dp-pill kus-dp-pill--change', `変更あり ${counts.changes}`),
        el('span', 'kus-dp-pill kus-dp-pill--same', `未公開の変更なし ${counts.clean}`),
        el('span', 'kus-dp-pill kus-dp-pill--error', `取得失敗 ${counts.error}`),
        el('span', 'kus-dp-pill kus-dp-pill--processing', `反映処理中 ${counts.processing}`)
      );
    }
    const blockers = fresh ? selectionBlockers(apps, selected, mode) : [];
    const summary = summarizeSelection(apps, selected);
    let message = '対象を指定して、未公開の変更を確認してください。';
    let tone: 'info' | 'ok' | 'warn' = 'info';
    if (inspection && !fresh) { message = '条件が変わりました。未公開の変更を確認し直してください。'; tone = 'warn'; }
    else if (inspection) {
      message = describeInspectSummary(counts);
      if (blockers.length) tone = 'warn';
      else if (counts.changes === 0) { message = '未公開の変更があるアプリはありません。反映は不要です。'; tone = 'info'; }
      else { message += `選択中 ${summary.runnable} アプリを${mode === 'revert' ? '変更の中止' : '本番への反映'}の対象にします。`; tone = 'ok'; }
    }
    infoEl.className = `kus-dp-next kus-dp-next--${tone}`;
    infoEl.textContent = message;
    infoEl.hidden = !inspection && activeStage !== 'review';
    issuesEl.replaceChildren(...(fresh ? blockers : []).map((text) => el('li', '', text)));
    issuesEl.hidden = !fresh || !blockers.length;
    recheckProblemsBtn.hidden = !fresh || (counts.error + counts.processing === 0);
    recheckAllBtn.disabled = busy || !inspection || !!setupBlocker();
    recheckProblemsBtn.disabled = busy;
    savePlanBtn.disabled = busy || !fresh || !inspection;
    copyPlanBtn.disabled = busy || !fresh || !inspection;
    selectChangedBtn.disabled = busy || !fresh;
    clearSelectionBtn.disabled = busy || !fresh;
    confirmBtn.disabled = busy || !fresh || !!blockers.length || !summary.runnable;
    setButtonText(runBtn, deployRunLabel(mode, summary.runnable));
    runBtn.disabled = busy || !confirmationReady();
    refreshWorkflow();
  }

  selectChangedBtn.addEventListener('click', () => {
    if (!inspection) return;
    for (const app of inspection.apps) if (app.state === 'changes') selected.add(deployAppKey(app));
    renderReviewTable();
    refreshReview();
  });
  clearSelectionBtn.addEventListener('click', () => {
    selected = new Set();
    renderReviewTable();
    refreshReview();
  });

  /** 取得失敗・反映処理中のアプリを、対象アプリの表から外す。 */
  function removeFromTargets(keys: string[]) {
    if (!inspection || busy) return;
    const drop = new Set(keys);
    const remaining = appTable.getApps().filter((app) => !drop.has(deployAppKey(app)));
    ready = false;
    appTable.setApps(remaining);
    ready = true;
    inspection.apps = inspection.apps.filter((app) => !drop.has(deployAppKey(app)));
    for (const key of drop) selected.delete(key);
    // 対象アプリの表から外しただけなので、差分確認は有効のまま（条件の署名だけ更新する）
    inspection.signature = currentSignature();
    onInputsChanged();
    renderReviewTable();
    refreshReview();
    panel.setStatus(`${keys.length} アプリを対象から外しました。`, 'info');
  }

  function planMarkdown(): string {
    return buildDeployPlanMarkdown({
      generatedAt: inspection ? inspection.inspectedAt : new Date().toISOString(),
      mode: currentMode(),
      batchMode: currentBatchMode(),
      stopOnError: currentStopOnError(),
      apps: inspection?.apps || [],
      selectedKeys: selected
    });
  }
  function exportFilename(base: string, ext: string, apps: readonly { appId: string; name?: string }[]) {
    const appLabel = apps.length === 1 ? buildAppFilenameLabel(apps[0].appId, apps[0].name || '') : '';
    return buildExportFilename(base, ext, { appLabel });
  }
  savePlanBtn.addEventListener('click', () => {
    if (!inspection || !isFresh()) return;
    const mode = currentMode();
    downloadText(exportFilename(mode === 'revert' ? '変更の中止計画' : '本番反映計画', 'md', selectedApps()), planMarkdown(), 'text/markdown;charset=utf-8');
    panel.setStatus('計画をMarkdownで保存しました。', 'ok');
  });
  copyPlanBtn.addEventListener('click', () => {
    if (!inspection || !isFresh()) return;
    void copyTextToClipboard(planMarkdown()).then((ok) => panel.setStatus(ok ? '計画のMarkdownをコピーしました。' : 'コピーできませんでした。「計画をMarkdownで保存」を使ってください。', ok ? 'ok' : 'warn'));
  });

  // ---- 差分確認（書き込みなし） ----
  function mergeInspection(result: DeployInspectResult, previous: InspectionState | null, onlyKeys: Set<string> | null) {
    const incoming = new Map(result.apps.map((app) => [deployAppKey(app), app]));
    let apps: DeployAppInspection[];
    if (onlyKeys && previous) {
      apps = previous.apps.map((app) => incoming.get(deployAppKey(app)) || app);
      for (const key of onlyKeys) {
        selected.delete(key);
        const app = incoming.get(key);
        if (app && isSelectableInspection(app)) selected.add(key);
      }
    } else {
      apps = result.apps;
      selected = new Set(defaultSelectedKeys(apps));
    }
    return apps;
  }

  async function startInspect(onlyProblems = false) {
    if (busy) return;
    const blocker = setupBlocker();
    if (blocker) { panel.setStatus(blocker, 'warn'); return; }
    const all = currentTargets();
    const problemKeys = onlyProblems && inspection ? new Set(inspection.apps.filter((app) => app.state === 'error' || app.state === 'processing').map(deployAppKey)) : null;
    const targets = problemKeys ? all.filter((app) => problemKeys.has(deployAppKey(app))) : all;
    if (!targets.length) return;
    const signature = currentSignature();
    const previous = inspection;
    await runLite(onlyProblems ? '取得失敗・処理中のアプリを確認し直し中…' : '未公開の変更を確認中…', async () => {
      const result = await inspectDeployTargetsStandalone({
        targets,
        onProgress: (done, total, label) => panel.setStatus(`未公開の変更を確認中…（${done}/${total} アプリ${label ? ` · ${label}` : ''}）`, 'busy')
      });
      const apps = mergeInspection(result, problemKeys ? previous : null, problemKeys);
      inspection = { apps, signature, at: Date.now(), inspectedAt: result.inspectedAt || new Date().toISOString() };
      reviewShown = 200;
      // 確認できたアプリ名を対象アプリの表へ反映する（名前の入力は署名に含めない）
      appTable.putApps(apps.map((app) => ({ appId: app.appId, guestId: app.guestId, appName: app.name })));
      clearConfirmation();
      renderReviewTable();
      refreshReview();
      showStage('review');
      const counts = countInspectStates(apps);
      const mode = currentMode();
      const blockers = selectionBlockers(apps, selected, mode);
      if (counts.error || counts.processing) {
        panel.setStatus(`${describeInspectSummary(counts)}取得失敗・反映処理中のアプリは、確認し直すか対象から外してください。まだ書き込んでいません。`, 'warn');
      } else if (!counts.changes) {
        panel.setStatus('未公開の変更があるアプリはありません。反映は不要です。まだ書き込んでいません。', 'info');
      } else if (blockers.length) {
        panel.setStatus(`${describeInspectSummary(counts)}${blockers[0]}`, 'warn');
      } else {
        panel.setStatus(`${describeInspectSummary(counts)}まだ書き込んでいません。`, 'ok');
      }
    });
  }
  recheckAllBtn.addEventListener('click', () => { void startInspect(false); });
  recheckProblemsBtn.addEventListener('click', () => { void startInspect(true); });

  // ---------------------------------------------------------------------------
  // 段階 3: 最終確認
  // ---------------------------------------------------------------------------
  const confirmBtn = makeButton('最終確認に進む', 'primary');
  const runBtn = makeButton(deployRunLabel('deploy', 0), 'danger');
  runBtn.disabled = true;
  const confirmCard = makeCard({ title: 'この内容で本番を変更します' });
  const confirmBody = el('div');
  const ack = makeCheck({ label: '上記の内容を確認しました', checked: false });
  ack.checkbox.setAttribute('aria-label', '上記の内容を確認しました');
  const confirmInput = makeInput({ width: 'wide', noSubmit: true });
  confirmInput.autocomplete = 'off';
  confirmInput.inputMode = 'numeric';
  confirmInput.setAttribute('data-lp-no-submit', '');
  const confirmLabel = el('label', 'kus-dp-confirm-label');
  const confirmInputWrap = el('div', 'kus-dp-confirm-input');
  confirmInputWrap.append(confirmLabel, confirmInput);
  const confirmStatus = el('p', 'kus-dp-quiet');
  confirmStatus.setAttribute('aria-live', 'polite');
  confirmCard.body.append(confirmBody, ack.label, confirmInputWrap, confirmStatus);
  let requiredInput = '';

  function confirmationToken(): string {
    return isFresh() && inspection ? JSON.stringify([inspection.signature, inspection.at, [...selected].sort()]) : '';
  }
  function clearConfirmation() {
    confirmedToken = '';
    ack.checkbox.checked = false;
    confirmInput.value = '';
    confirmStatus.textContent = '内容を確認して、チェックと入力をしてください。';
    runBtn.disabled = true;
  }
  function confirmationReady(): boolean {
    return !!confirmedToken && confirmedToken === confirmationToken() && ack.checkbox.checked
      && !!requiredInput && confirmInput.value.trim() === requiredInput
      && !selectionBlockers(inspection?.apps || [], selected, currentMode()).length;
  }
  function refreshConfirmState() {
    runBtn.disabled = busy || !confirmationReady();
    confirmStatus.textContent = confirmationReady()
      ? '確認できました。下の実行ボタンで実行できます。'
      : `確認のチェックと、${confirmRequirement(selectedApps()).label}が必要です。`;
  }
  for (const control of [ack.checkbox, confirmInput]) control.addEventListener('input', refreshConfirmState);

  function fact(key: string, title: string, mod = ''): { root: HTMLElement; dd: HTMLElement } {
    const root = el('div', `kus-dp-fact${mod ? ` kus-dp-fact--${mod}` : ''}`);
    root.dataset.confirm = key;
    const dt = el('dt', '', title);
    const dd = el('dd');
    root.append(dt, dd);
    return { root, dd };
  }

  function openConfirmation() {
    if (busy || confirmBtn.disabled || !inspection) return;
    clearConfirmation();
    confirmedToken = confirmationToken();
    if (!confirmedToken) return;
    const mode = currentMode();
    const text = deployModeText(mode);
    const targets = selectedApps();
    const totals = aggregateChanges(targets);
    confirmCard.card.querySelector('.kus-lp__card-title')!.textContent = mode === 'revert' ? 'この内容でプレビューの変更を中止します' : 'この内容で本番を変更します';
    confirmBody.replaceChildren();
    const facts = el('dl', 'kus-dp-facts');

    const direction = fact('direction', '方向', 'direction');
    direction.dd.textContent = text.direction;
    const targetFact = fact('targets', `対象アプリ（${targets.length} アプリ）`);
    targetFact.dd.appendChild(el('div', 'kus-dp-targets', summarizeList(targets.map((app) => formatDeployApp(app)))));
    const method = fact('method', '反映の方法');
    method.dd.textContent = `${describeBatchMode(currentBatchMode())}（${describeStopPolicy(currentBatchMode(), currentStopOnError())}）`;
    const removedText = describeRemovedSettings(totals);
    const changes = fact('changes', '削除される設定', removedText ? 'danger' : '');
    changes.dd.textContent = removedText
      ? `${removedText}（${mode === 'revert' ? '破棄されるプレビューの設定' : '本番から削除される設定'}）`
      : `削除される設定はありません（追加 ${totals.added} 件・変更 ${totals.changed} 件）。`;
    facts.append(direction.root, targetFact.root, method.root, changes.root);

    if (mode === 'deploy') {
      const removedFields = collectRemovedFields(targets);
      const removed = fact('removed-fields', `削除されるフィールド（${removedFields.length} 件）`, removedFields.length ? 'danger' : '');
      if (removedFields.length) {
        removed.dd.appendChild(el('strong', '', '本番へ反映すると、これらのフィールドのレコードの値も削除され、元に戻せません。'));
        const ul = el('ul', 'kus-dp-issues');
        ul.style.color = '#991b1b';
        for (const { app, field } of removedFields.slice(0, 30)) {
          const li = el('li');
          li.textContent = `${formatDeployApp(app)}: ${describeRemovedField(field)}${field.possibleRename ? `（フィールドコードを変えただけなら値は残る可能性があります。プレビューの『${field.possibleRename}』）` : ''}`;
          ul.appendChild(li);
        }
        if (removedFields.length > 30) ul.appendChild(el('li', '', `ほか ${removedFields.length - 30} 件（全件は計画のMarkdownで確認できます）`));
        removed.dd.appendChild(ul);
      } else {
        removed.dd.textContent = '削除されるフィールドはありません。';
      }
      facts.appendChild(removed.root);
    }
    const backup = fact('backup', 'バックアップ');
    backup.dd.textContent = backupDescription(mode, targets.length);
    const undo = fact('undo', '取り消し方');
    undo.dd.textContent = undoGuidance(mode);
    facts.append(backup.root, undo.root);
    confirmBody.appendChild(facts);

    const requirement = confirmRequirement(targets);
    requiredInput = requirement.value;
    confirmLabel.textContent = `${requirement.label}（${requirement.value} と入力）`;
    confirmInput.placeholder = requirement.placeholder;
    confirmInput.setAttribute('aria-label', targets.length === 1 ? '確認用の対象アプリID' : '確認用の対象アプリ数');
    confirmInput.id = `${panel.root.id}-confirm-input`;
    confirmLabel.htmlFor = confirmInput.id;
    setButtonText(runBtn, deployRunLabel(mode, targets.length));
    refreshConfirmState();
    showStage('confirm');
    panel.setStatus(`対象と変更内容を確認してください。まだ${mode === 'revert' ? 'プレビューの変更は破棄して' : '本番へは反映して'}いません。`, 'info');
  }
  confirmBtn.addEventListener('click', openConfirmation);

  // ---------------------------------------------------------------------------
  // 段階 4: 結果
  // ---------------------------------------------------------------------------
  const resultCard = makeCard({ title: '実行結果' });
  const resultHead = el('div', 'kus-dp-result-head');
  resultHead.setAttribute('aria-live', 'polite');
  const resultPills = el('div', 'kus-dp-pills');
  const resultNotes = el('div', 'kus-dp-result-notes');
  const progressHost = el('div');
  const resultTools = el('div', 'kus-dp-tools');
  const saveJsonBtn = makeButton('結果JSONを保存', 'sub');
  const saveRecordBtn = makeButton('記録をMarkdownで保存', 'sub');
  const copyRecordBtn = makeButton('記録をコピー', 'sub');
  const retryBtn = makeButton('失敗・未実行だけ選び直す', 'sub');
  const openSettingsBtn = makeButton('アプリの設定画面を開く', 'sub');
  resultTools.append(saveJsonBtn, saveRecordBtn, copyRecordBtn, retryBtn, openSettingsBtn);
  resultCard.body.append(resultHead, resultPills, resultNotes, progressHost, resultTools);
  const resultEmpty = el('div', 'kus-dp-empty', 'まだ実行していません。対象を選び、変更を確認してから実行してください。');

  function renderResultCard() {
    const last = memory.lastRun;
    const showing = !!progressView && (busy || !!last);
    resultCard.card.hidden = !showing;
    resultEmpty.hidden = showing;
    if (!showing) return;
    const view = progressView!;
    const counts = view.counts();
    resultPills.replaceChildren();
    const pills: Array<[string, number, string]> = [
      ['成功', counts.success, 'same'], ['失敗', counts.failed, 'error'], ['取り消し', counts.cancelled, 'error'],
      ['確認後に更新', counts.conflict, 'change'], ['完了を確認できない', counts.unknown, 'change'], ['未実行', counts.pending, 'processing']
    ];
    for (const [label, count, tone] of pills) if (count) resultPills.appendChild(el('span', `kus-dp-pill kus-dp-pill--${tone}`, `${label} ${count}`));
    resultNotes.replaceChildren();
    if (busy || !last) {
      resultHead.textContent = busy ? `${deployModeText(runningMode).verb === '中止' ? '変更の中止' : '本番への反映'}を実行中です。` : '';
      resultTools.hidden = true;
      return;
    }
    const message = describeRunResult(last.result);
    resultHead.textContent = message.text;
    resultTools.hidden = false;
    const result = last.result;
    const mode = result.mode;
    const unverified = result.apps.filter((app) => app.status === 'success' && app.verified === false);
    if (unverified.length) {
      const note = el('div', 'kus-dp-warn');
      note.dataset.deployUnverified = String(unverified.length);
      note.textContent = `注意: ${unverified.length} アプリは${mode === 'revert' ? '中止' : '反映'}後の状態（revision）が本番とプレビューで一致しませんでした（${unverified.slice(0, 5).map((app) => `App ${app.appId}`).join('、')}${unverified.length > 5 ? ` ほか ${unverified.length - 5} アプリ` : ''}）。アプリの設定画面で確認してください。`;
      resultNotes.appendChild(note);
    }
    const backup = result.backup;
    const backupNote = el('div', backup ? 'kus-dp-info' : 'kus-dp-warn');
    backupNote.dataset.deployBackup = backup ? 'saved' : 'none';
    if (backup) {
      backupNote.appendChild(document.createTextNode(`バックアップ: ${backup.fileName}（${backup.appCount} アプリ分・${backup.environment === 'preview' ? '中止前のプレビューの設定' : '反映前の本番設定'}）`));
      if (backup.unavailableFiles?.length) {
        const warn = el('div', 'kus-dp-warn');
        warn.dataset.deployBackupFiles = String(backup.unavailableFiles.length);
        warn.appendChild(el('strong', '', `本体を保存できなかったファイル（${backup.unavailableFiles.length} 件）`));
        const ul = el('ul', 'kus-dp-issues');
        for (const file of backup.unavailableFiles.slice(0, 20)) ul.appendChild(el('li', '', `App ${file.appId} / ${file.name}（${file.reason}）`));
        if (backup.unavailableFiles.length > 20) ul.appendChild(el('li', '', `ほか ${backup.unavailableFiles.length - 20} 件`));
        warn.appendChild(ul);
        backupNote.appendChild(warn);
      }
    } else {
      backupNote.textContent = 'バックアップは保存していません。';
    }
    resultNotes.appendChild(backupNote);
    resultNotes.appendChild(el('div', 'kus-dp-info', undoGuidance(mode)));
    retryBtn.disabled = busy || !retryableOutcomes(result.apps).length;
    retryBtn.hidden = !retryableOutcomes(result.apps).length;
    openSettingsBtn.hidden = result.apps.length !== 1;
    saveJsonBtn.disabled = busy;
    saveRecordBtn.disabled = busy;
    copyRecordBtn.disabled = busy;
  }

  function recordMarkdown(last: RunSnapshot): string {
    return buildDeployRecordMarkdown({ result: last.result, inspections: last.inspections, stopOnError: last.stopOnError });
  }
  saveJsonBtn.addEventListener('click', () => {
    const last = memory.lastRun;
    if (!last) return;
    downloadText(exportFilename(last.result.mode === 'revert' ? '変更の中止結果' : '本番反映結果', 'json', last.result.apps), stringifyDeployResultJson(last.result), 'application/json;charset=utf-8');
    panel.setStatus('結果JSONを保存しました。', 'ok');
  });
  saveRecordBtn.addEventListener('click', () => {
    const last = memory.lastRun;
    if (!last) return;
    downloadText(exportFilename(last.result.mode === 'revert' ? '変更の中止記録' : '本番反映記録', 'md', last.result.apps), recordMarkdown(last), 'text/markdown;charset=utf-8');
    panel.setStatus('記録をMarkdownで保存しました。', 'ok');
  });
  copyRecordBtn.addEventListener('click', () => {
    const last = memory.lastRun;
    if (!last) return;
    void copyTextToClipboard(recordMarkdown(last)).then((ok) => panel.setStatus(ok ? '記録のMarkdownをコピーしました。' : 'コピーできませんでした。「記録をMarkdownで保存」を使ってください。', ok ? 'ok' : 'warn'));
  });
  retryBtn.addEventListener('click', () => {
    const last = memory.lastRun;
    if (!last || busy) return;
    const retry = retryableOutcomes(last.result.apps);
    if (!retry.length) return;
    ready = false;
    appTable.setApps(retry.map((app) => ({ appId: app.appId, guestId: app.guestId, appName: app.name })));
    modeRadios[last.result.mode].checked = true;
    ready = true;
    inspection = null;
    selected = new Set();
    clearConfirmation();
    onInputsChanged();
    renderReviewTable();
    refreshReview();
    showStage('setup');
    panel.setStatus(`失敗・未実行の ${retry.length} アプリを対象に選び直しました。未公開の変更を確認し直してください。`, 'info');
  });
  openSettingsBtn.addEventListener('click', () => {
    const last = memory.lastRun;
    const app = last?.result.apps[0];
    if (!app) return;
    window.open(`${window.location.origin}${appSettingsPath(app)}`, '_blank', 'noopener');
    panel.setStatus(`アプリ #${app.appId} の設定画面を開きました。`, 'info');
  });

  // ---- 実行 ----
  function stripBundles(app: DeployAppInspection): DeployAppInspection {
    const { productionBundle: _p, previewBundle: _v, ...rest } = app;
    void _p; void _v;
    return rest;
  }

  async function startRun() {
    if (busy || !confirmationReady() || !inspection) return;
    const targets = selectedApps();
    if (!targets.length) return;
    const mode = currentMode();
    const batchMode = currentBatchMode();
    const stopOnError = currentStopOnError();
    runningMode = mode;
    clearConfirmation();
    progressView?.dispose();
    memory.lastRun = null;
    progressView = createProgressView(progressHost, mode, targets.map((app) => ({ appId: app.appId, guestId: app.guestId, name: app.name, status: 'waiting' as DeployAppStatus })));
    const view = progressView;
    showStage('result');
    resultEmpty.hidden = true;
    resultCard.card.hidden = false;
    const finish = (result: DeployRunResult) => {
      memory.lastRun = { result, inspections: targets.map(stripBundles), stopOnError };
      // 本番が変わったため、実行前の差分確認は使えない。
      inspection = null;
      selected = new Set();
      view.setOutcomes(result.apps);
    };
    await runLite(mode === 'revert' ? '変更を中止中…' : '本番へ反映中…', async () => {
      let result: DeployRunResult;
      try {
        result = await runDeployStandalone({
          mode, batchMode, stopOnError, targets,
          onUpdate: (update) => view.update(update),
          setStatus: (message) => panel.setStatus(message, 'busy')
        });
      } catch (error: any) {
        // 想定外の例外。依頼済みかもしれないアプリは「完了を確認できない」として残し、状態の確認を促す。
        const reason = String(error?.message || error || '不明なエラー');
        const now = new Date().toISOString();
        const rows = view.rows();
        finish({
          mode, batchMode, startedAt: now, finishedAt: now,
          apps: targets.map((app) => {
            const row = rows.find((candidate) => deployAppKey(candidate) === deployAppKey(app));
            const status: DeployAppStatus = !row || row.status === 'waiting' ? 'pending' : row.status === 'success' || row.status === 'failed' || row.status === 'conflict' || row.status === 'cancelled' ? row.status : 'unknown';
            return {
              appId: app.appId, guestId: app.guestId, name: app.name, status,
              message: status === 'success' || status === 'failed' ? row?.message : status === 'pending' ? '実行前に処理が止まりました。' : `処理が中断されました。アプリの設定画面で状態を確認してください。（${reason}）`,
              productionRevisionBefore: app.productionRevision, previewRevision: app.previewRevision
            };
          }),
          logs: [`エラー: ${reason}`]
        });
        renderResultCard();
        throw new Error(`実行中にエラーが発生しました。本番の状態をアプリの設定画面で確認してください。（${reason}）`);
      }
      finish(result);
      if (result.logs?.length) panel.setResult(result.logs.join('\n'));
      renderResultCard();
      const message = describeRunResult(result);
      panel.setStatus(message.text, message.tone);
    });
    renderResultCard();
    refreshReview();
  }
  runBtn.addEventListener('click', () => { void startRun(); });

  // ---------------------------------------------------------------------------
  // 4 段階のナビゲーション・固定フッター
  // ---------------------------------------------------------------------------
  const nav = el('nav', 'kus-dp-nav');
  nav.setAttribute('aria-label', '本番反映の手順');
  nav.setAttribute('role', 'tablist');
  const stageDefs: Array<{ id: Stage; number: string; label: string; copy: string }> = [
    { id: 'setup', number: '1', label: '対象を選ぶ', copy: '対象アプリと操作を選ぶ' },
    { id: 'review', number: '2', label: '変更を確認', copy: '本番との差分を見て絞る' },
    { id: 'confirm', number: '3', label: '最終確認', copy: '対象と削除を確かめる' },
    { id: 'result', number: '4', label: '結果', copy: '結果を見て次の操作を選ぶ' }
  ];
  const stages = {} as Record<Stage, HTMLElement>;
  const navButtons = {} as Record<Stage, HTMLButtonElement>;
  for (const def of stageDefs) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'kus-dp-nav__btn';
    button.id = `kus-dp-tab-${def.id}`;
    button.setAttribute('role', 'tab');
    button.setAttribute('aria-controls', `kus-dp-stage-${def.id}`);
    button.innerHTML = `<span class="kus-dp-nav__num">${def.number}</span><span>${def.label}<small class="kus-dp-nav__copy">${def.copy}</small></span>`;
    nav.appendChild(button);
    navButtons[def.id] = button;
    const stage = document.createElement('section');
    stage.className = 'kus-dp-stage';
    stage.id = `kus-dp-stage-${def.id}`;
    stage.dataset.stage = def.id;
    stage.setAttribute('role', 'tabpanel');
    stage.setAttribute('aria-labelledby', button.id);
    stages[def.id] = stage;
    button.addEventListener('click', () => (def.id === 'confirm' ? openConfirmation() : showStage(def.id)));
    button.addEventListener('keydown', (event) => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const count = stageDefs.length;
      const current = stageDefs.findIndex((item) => item.id === def.id);
      const enabledAt = (index: number) => !navButtons[stageDefs[index].id].disabled;
      let nextIndex = -1;
      if (event.key === 'Home' || event.key === 'End') {
        const order = stageDefs.map((_, index) => (event.key === 'Home' ? index : count - 1 - index));
        nextIndex = order.find(enabledAt) ?? -1;
      } else {
        const direction = event.key === 'ArrowRight' ? 1 : -1;
        for (let step = 1; step < count; step += 1) {
          const index = (current + direction * step + count) % count;
          if (enabledAt(index)) { nextIndex = index; break; }
        }
      }
      if (nextIndex < 0 || nextIndex === current) return;
      const next = stageDefs[nextIndex];
      if (next.id === 'confirm') openConfirmation(); else showStage(next.id);
    });
  }
  const heads: Record<Stage, [string, string]> = {
    setup: ['どのアプリの未公開の変更を扱いますか？', '対象アプリと操作を選びます。次の画面で、本番とプレビューの差分を確認します（この時点では書き込みません）。'],
    review: ['本番との差分を確認して、対象を決める', '未公開の変更があるアプリと、削除される設定を確認します。この画面では書き込みません。'],
    confirm: ['対象と内容の最終確認', '対象・削除される設定・バックアップ・取り消し方を確認してから実行します。'],
    result: ['実行結果と次の操作', 'アプリごとの結果を確認します。失敗したアプリは選び直して確認し直せます。']
  };
  for (const def of stageDefs) {
    const head = el('header', 'kus-dp-stage-head');
    head.append(el('h2', '', heads[def.id][0]), el('p', '', heads[def.id][1]));
    stages[def.id].appendChild(head);
  }
  stages.setup.appendChild(setupStage);
  stages.review.append(reviewCard.card, listCard.card);
  stages.confirm.appendChild(confirmCard.card);
  stages.result.append(resultCard.card, resultEmpty);

  const dock = el('div', 'kus-dp-action-dock');
  const dockRow = el('div', 'kus-dp-dock-row');
  const dockCopy = el('div', 'kus-dp-dock-copy');
  dockCopy.setAttribute('aria-live', 'polite');
  const dockActions = el('div', 'kus-dp-dock-actions');
  const backBtn = makeButton('対象を変更', 'sub');
  backBtn.addEventListener('click', () => showStage(activeStage === 'confirm' ? 'review' : 'setup'));
  const nextBtn = makeButton('未公開の変更を確認する', 'primary');
  nextBtn.addEventListener('click', () => {
    if (isFresh()) showStage('review'); else void startInspect(false);
  });
  dockActions.append(backBtn, nextBtn, confirmBtn, runBtn);
  dockRow.append(dockCopy, dockActions);
  dock.append(dockRow, panel.status, panel.result);

  const hint = panel.body.querySelector('.kus-lp__hint');
  const workspace = el('div', 'kus-dp-workspace');
  const canvas = el('main', 'kus-dp-canvas');
  workspace.appendChild(nav);
  for (const def of stageDefs) canvas.appendChild(stages[def.id]);
  workspace.appendChild(canvas);
  [stages.setup, stages.review, stages.confirm, stages.result].forEach((scope) => attachCardHelp(scope));

  const noInputSubmit = document.createElement('button');
  noInputSubmit.disabled = true;

  function dockTitle(): string {
    const mode = currentMode();
    const count = appTable.count();
    if (activeStage === 'setup') return `${deployModeText(mode).label} · 対象 ${count} アプリ`;
    if (activeStage === 'result') return `${deployModeText(runningMode).direction}`;
    const runnable = summarizeSelection(inspection?.apps || [], selected).runnable;
    return `${deployModeText(mode).direction} · 対象 ${runnable} アプリ`;
  }

  refreshWorkflow = () => {
    const fresh = isFresh();
    const mode = currentMode();
    const blocker = activeStage === 'setup' ? setupBlocker() : '';
    backBtn.hidden = activeStage === 'setup';
    nextBtn.hidden = activeStage !== 'setup';
    confirmBtn.hidden = activeStage !== 'review';
    runBtn.hidden = activeStage !== 'confirm';
    backBtn.disabled = busy;
    nextBtn.disabled = busy || !!blocker;
    setButtonText(backBtn, activeStage === 'confirm' ? '変更の確認に戻る' : activeStage === 'result' ? '対象を選び直す' : '対象を変更');
    setButtonText(nextBtn, fresh ? '確認済みの結果へ進む' : '未公開の変更を確認する');
    navButtons.review.disabled = !inspection || !fresh;
    navButtons.confirm.disabled = confirmBtn.disabled || !fresh;
    let message = '';
    if (activeStage === 'setup') {
      message = blocker ? `次に進むには：${blocker}` : fresh ? '確認済みの結果があります。進むか、確認し直してください。' : `${appTable.count()} アプリの本番とプレビューを比べます。書き込みは行いません。`;
    } else if (activeStage === 'review') {
      const blockers = fresh && inspection ? selectionBlockers(inspection.apps, selected, mode) : [];
      message = !fresh ? '条件が変わりました。対象を変更して、未公開の変更を確認し直してください。'
        : blockers.length ? `次に進むには：${blockers[0]}`
        : `${summarizeSelection(inspection!.apps, selected).runnable} アプリの内容を確認し、最終確認へ進んでください。`;
    } else if (activeStage === 'confirm') {
      message = confirmationReady() ? '内容を確認できました。実行すると本番の設定が変わります。' : '確認のチェックと入力をすると、実行できます。';
    } else {
      message = busy ? '実行中です。終わるまでお待ちください。「中止」で、次の依頼の前に止められます。' : memory.lastRun ? '結果を確認してください。' : 'まだ実行していません。';
    }
    const blocked = (activeStage === 'setup' && !!blocker) || (activeStage === 'review' && fresh && !!inspection && selectionBlockers(inspection.apps, selected, mode).length > 0);
    dockCopy.replaceChildren();
    dockCopy.append(el('strong', '', dockTitle()), el('span', `kus-dp-dock-msg${blocked ? ' kus-dp-dock-reason' : ''}`, message));
    // 操作の切り替えで見えていない流れは、共有のステータス欄・主操作を触らない。
    if (memory.flow !== 'publish') return;
    panel.result.hidden = activeStage === 'confirm';
    // 入力欄での Enter が、本番への書き込みを始めてはならない（確認画面・結果画面では何も実行しない）。
    panel.setPrimaryAction(activeStage === 'setup' ? nextBtn : activeStage === 'review' ? confirmBtn : noInputSubmit);
  };

  showStage = (active) => {
    if (active === 'confirm' && !confirmedToken) return;
    if (active === 'review' && !inspection) return;
    if (activeStage === 'confirm' && active !== 'confirm') clearConfirmation();
    activeStage = active;
    for (const def of stageDefs) {
      const selectedStage = def.id === active;
      stages[def.id].hidden = !selectedStage;
      navButtons[def.id].setAttribute('aria-selected', String(selectedStage));
      navButtons[def.id].tabIndex = selectedStage ? 0 : -1;
    }
    navButtons[active].focus({ preventScroll: true });
    canvas.scrollTo({ top: 0 });
    renderResultCard();
    refreshReview();
  };

  // 非同期処理中は条件の編集と二重実行を防ぐ。解除後は現在の状態から再計算する。
  const setPanelBusy = panel.setBusy;
  const disabledBefore = new Map<HTMLInputElement | HTMLButtonElement | HTMLSelectElement | HTMLTextAreaElement, boolean>();
  panel.setBusy = (value) => {
    busy = value;
    panel.root.setAttribute('aria-busy', String(value));
    if (value) refreshWorkflow();
    nav.inert = value;
    // 実行中の進捗（読み上げ対象）を残すため、結果の段階は inert にしない。操作は下の一括無効化で防ぐ。
    for (const def of stageDefs) stages[def.id].inert = value && def.id !== 'result';
    if (value) sourceFlow.setBusy(true);
    if (value) {
      panel.root.querySelectorAll<HTMLInputElement | HTMLButtonElement | HTMLSelectElement | HTMLTextAreaElement>('input,button,select,textarea').forEach((control) => {
        // 処理中でも押せる必要がある「中止」ボタンと、kintone 画面を確認するための折りたたみ「－」は無効化しない。
        if (control.classList.contains('kus-lp__cancel') || control.classList.contains('kus-lp__toggle')) return;
        if (!disabledBefore.has(control)) disabledBefore.set(control, control.disabled);
        control.disabled = true;
      });
      setPanelBusy(value);
      renderResultCard();
      return;
    }
    try {
      disabledBefore.forEach((disabled, control) => { control.disabled = disabled; });
      disabledBefore.clear();
      sourceFlow.setBusy(false);
      refreshDetailSummary();
      renderResultCard();
      refreshReview();
      if (memory.flow === 'publish') navButtons[activeStage].focus({ preventScroll: true });
    } finally {
      setPanelBusy(value);
    }
  };

  // ---------------------------------------------------------------------------
  // 操作の切り替え: 反映元アプリから本番へ（既定）／プレビューの変更を公開（従来の流れ）
  // ---------------------------------------------------------------------------
  const flowbar = el('div', 'kus-ds-flowbar');
  flowbar.appendChild(el('span', 'kus-ds-flowbar__label', '操作'));
  const flowGroup = el('div', 'kus-ds-flowbar__group');
  flowGroup.setAttribute('role', 'radiogroup');
  flowGroup.setAttribute('aria-label', '操作の切り替え');
  const flowInputs = {} as Record<DeployFlow, HTMLInputElement>;
  const flowName = `${panel.root.id}-flow`;
  for (const [id, label] of [['source', '反映元アプリから本番へ'], ['publish', 'プレビューの変更を公開']] as const) {
    const wrap = el('label', 'kus-ds-flow');
    const input = document.createElement('input');
    input.type = 'radio';
    input.name = flowName;
    input.value = id;
    input.checked = memory.flow === id;
    input.setAttribute('aria-label', label);
    input.dataset.flow = id;
    wrap.append(input, document.createTextNode(label));
    flowGroup.appendChild(wrap);
    flowInputs[id] = input;
    input.addEventListener('change', () => { if (input.checked) switchFlow(id); });
  }
  flowbar.appendChild(flowGroup);
  const subtitleEl = panel.root.querySelector('.kus-lp__subtitle');

  /** 見せる流れだけを DOM に置く（見えない流れの要素を残さない）。実行中は切り替えない。 */
  function mountFlow(flow: DeployFlow) {
    const next = flow === 'source' ? { workspace: sourceFlow.workspace, dock: sourceFlow.dock } : { workspace, dock };
    const other = flow === 'source' ? { workspace, dock } : { workspace: sourceFlow.workspace, dock: sourceFlow.dock };
    other.workspace.remove();
    other.dock.remove();
    if (!flowbar.isConnected) {
      if (hint) hint.insertAdjacentElement('afterend', flowbar); else panel.body.insertBefore(flowbar, panel.body.firstChild);
    }
    flowbar.insertAdjacentElement('afterend', next.workspace);
    panel.body.appendChild(next.dock);
    if (subtitleEl) subtitleEl.textContent = FLOW_SUBTITLES[flow];
    flowInputs[flow].checked = true;
    next.dock.append(panel.status, panel.result);
    if (flow === 'source') sourceFlow.activate(); else { sourceFlow.deactivate(); refreshWorkflow(); }
  }
  function switchFlow(flow: DeployFlow) {
    if (busy) { flowInputs[memory.flow].checked = true; return; }
    memory.flow = flow;
    mountFlow(flow);
    panel.setStatus('', 'neutral');
  }

  panel.root.addEventListener('kus-lite-dispose', () => { progressView?.dispose(); }, { once: true });

  const sourceFlow = createSourceFlow(panel);
  ready = true;
  clearConfirmation();
  refreshDetailSummary();
  onInputsChanged();
  renderReviewTable();
  // 開き直したときは、直近の実行結果が残っていれば結果から始める（差分確認は引き継がない）。
  if (memory.lastRun) {
    runningMode = memory.lastRun.result.mode;
    progressView = createProgressView(progressHost, memory.lastRun.result.mode, []);
    progressView.setOutcomes(memory.lastRun.result.apps);
  }
  showStage(memory.lastRun ? 'result' : 'setup');
  mountFlow(memory.flow);
  if (memory.flow === 'publish' && memory.lastRun) {
    if (memory.lastRun.result.logs?.length) panel.setResult(memory.lastRun.result.logs.join('\n'));
    panel.setStatus(describeRunResult(memory.lastRun.result).text, describeRunResult(memory.lastRun.result).tone);
  }
}
