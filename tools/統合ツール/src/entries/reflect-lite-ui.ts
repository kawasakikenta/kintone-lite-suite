'use strict';

import { DEFAULT_APP_ID } from '../constants.js';
import {
  runApplyPreviewStandalone,
  previewReflectStandalone,
  resolveReflectAppsStandalone,
  reflectConnectionError,
  reflectResultMatchesOptions,
  type ReflectIdentities,
  type ReflectBackup,
  type ReflectSectionUpdate,
  type PreviewReflectResult
} from '../tabs/reflect-standalone.js';
import {
  createLitePanel,
  makeRow,
  makeInput,
  makeButton,
  makeCheck,
  makeChip,
  makeCard,
  makeTextarea,
  makeDetails,
  liteRun,
  copyTextToClipboard
} from './litePanelTheme.js';
import { createAppSearchControl } from './appSearchControl.js';
import { pickAllSettingsBundles } from '../settingsBundleImport.js';
import { reflectSelectionBlockers } from '../reflect/standalonePlan.js';
import { buildReflectReportMarkdown } from '../reflect/planReport.js';
import { formatRolloutTarget, parseRolloutQueue, serializeRolloutQueue } from '../reflect/rolloutQueue.js';
import { appendReflectChanges, appendReflectItems, renderReflectRoute, renderReflectSummaryTable, renderApplySectionResults, createApplyProgressView, type ApplyProgressView } from './reflectPlanView.js';
import { REFLECT_SECTION_KEYS, reflectSectionLabel } from '../reflect/sections.js';
import {
  RESTORE_MODE_NOTICE,
  TARGET_PENDING_REASON,
  collectUploadLabels,
  createApplyProgressRows,
  describeRemovedItem,
  describeUndoGuidance,
  formatReflectDateTime,
  formatReflectTime
} from '../reflect/applyProgress.js';
import type { ReflectTargetPending } from '../reflect/targetPending.js';
import { collectRetrySectionKeys, summarizeApplyOutcome } from '../reflect/applyOutcome.js';
import {
  parseAppReference,
  needsAppReferenceParse,
  parseLookupMapText,
  lookupMapError,
  lookupMapValue,
  describeReflectSetupBlocker,
  summarizePostApplyCheck,
  guestIdFromPagePath,
  groupReflectScopes,
  describeReflectScope,
  shouldWarnMissingFieldSettings,
  FIELD_SETTINGS_OMITTED_NOTICE,
  findMissingFieldReferences,
  canResolveByIncludingFieldSettings,
  normalizeApplySections
} from '../reflect/liteSetup.js';
import { createReflectAppLookupCache, formatReflectAppName, isLookupableReflectApp, REFLECT_APP_LOOKUP_FAILURE, type ReflectAppLookupOk } from '../reflect/appLookup.js';
import { buildReflectPresetsExport, normalizeImportedReflectPresets, mergeReflectPresets, type ReflectPreset } from '../reflect/presetIo.js';
import { buildAppFilenameLabel, buildExportFilename, downloadText, extractAppNameFromBundle, readTextFile } from '../utils.js';

// =============================================================================
// メモリ状態（リロードで消える。lite はブラウザ永続ストレージを使わない方針）
// =============================================================================

interface PreviewSnapshot {
  identities: ReflectIdentities;
  signature: string;
  scopes?: string[];
  at: number;
  result: PreviewReflectResult;
  /** 反映直後に同じ条件で再取得した差分（反映先が反映元と一致したかの確認用） */
  postApplyCheck?: { scopeCount: number };
}

/** 複数アプリへ順次展開したときの、反映先ごとの記録（メモリのみ）。 */
interface RolloutLogEntry {
  appId: string;
  guestId: string;
  name: string;
  ok: number;
  ng: number;
  pending: number;
  at: number;
}

interface LiteMemoryState {
  preserveTargetOnly?: boolean;
  sourceAppId?: string;
  sourceGuestId?: string;
  targetAppId?: string;
  targetGuestId?: string;
  sourcePreview?: boolean;
  selectedScopes?: string[];
  lookupMapText?: string;
  /** 「続けて反映する反映先」の入力欄の内容 */
  rolloutQueueText?: string;
  /** 展開の記録と、その記録を作った条件（反映元・項目・保持・参照先変換）。条件が変わったら捨てる。 */
  rolloutLog?: RolloutLogEntry[];
  rolloutKey?: string;
  lastPreview?: PreviewSnapshot | null;
  /** 直近の反映結果（成功 / 失敗の最終サマリ） */
  lastResult?: {
    ok: number;
    ng: number;
    /** エラー中断により未実行のまま残ったセクション数 */
    pending: number;
    at: number;
    appId: string;
    guestId: string;
    /** 再実行が必要なセクション（失敗 + 未実行）のキー */
    retryScopes: string[];
    /** 失敗セクションの表示ラベル */
    failedLabels: string[];
    /** JSON 反映元が差し替えられたかを検知する UI 内の一時トークン。 */
    sourceBundleToken?: string;
    /** 反映前に自動保存したバックアップと同じ内容（「バックアップから戻す」用）。実行結果JSONには含めない。 */
    backup?: ReflectBackup;
    /** Markdown の反映記録用に、実行した計画（実行項目の差分）と反映元・反映先の名前を控える。実行結果JSONには含めない。 */
    planned?: { identities: ReflectIdentities; entries: PreviewEntry[] };
    /** 監査用に保存できる実行時の全セクション結果とログ */
    report: {
      source: { appId: string; guestId: string; environment: 'production' | 'preview' | 'json' };
      target: { appId: string; guestId: string; environment: 'preview' };
      preserveTargetOnly: boolean;
      scopes: string[];
      lookupMap?: Record<string, string>;
      /** 反映前に、反映先プレビューに以前からの未公開の変更があったか（取り消し方の案内に使う）。 */
      targetPending?: ReflectTargetPending;
      sections: unknown[];
      logs: string[];
    };
  } | null;
  /** ユーザー定義プリセット（接続情報＋スコープ）。JSON ファイルで書き出し・読み込みできる */
  presets?: ReflectPreset[];
}

const REFLECT_PRESET_LIMIT = 30;

let memoryState: LiteMemoryState = {
  presets: []
};

// =============================================================================
// クイック選択プリセット（セクション単位、フル版の reflect quick presets 相当）
// =============================================================================

interface ScopeQuickPreset {
  id: string;
  label: string;
  hint: string;
  /** undefined = すべての put 可能セクション */
  scopes?: string[];
  /** 除外するセクション（all を起点に絞り込む場合に使用） */
  exclude?: string[];
}

const SCOPE_QUICK_PRESETS: ScopeQuickPreset[] = [
  { id: 'all', label: 'すべての項目', hint: '反映可能なセクションを全選択' },
  {
    id: 'formOnly',
    label: 'フォームのみ',
    hint: 'フィールド設定＋レイアウト＋ビュー',
    scopes: ['fieldSettings', 'layoutSettings', 'viewSettings']
  },
  {
    id: 'viewsOnly',
    label: 'ビュー+グラフ',
    hint: 'ビュー設定とグラフ設定のみ',
    scopes: ['viewSettings', 'reportSettings']
  },
  {
    id: 'permsOnly',
    label: '権限のみ',
    hint: 'アプリ・フィールド・レコード権限',
    scopes: ['appAcl', 'fieldAcl', 'recordPermissions']
  },
  {
    id: 'notificationsOnly',
    label: '通知のみ',
    hint: '一般・条件・リマインダー通知',
    scopes: ['notifications', 'perRecordNotifications', 'reminderNotifications']
  },
  {
    id: 'noPerms',
    label: '権限を除外',
    hint: '権限系・通知系を除いた全セクション',
    exclude: ['appAcl', 'fieldAcl', 'recordPermissions', 'notifications', 'perRecordNotifications', 'reminderNotifications']
  }
];

const RISKY_SCOPE_KEYS = new Set([
  'appAcl',
  'fieldAcl',
  'recordPermissions',
  'notifications',
  'perRecordNotifications',
  'reminderNotifications',
  'processSettings'
]);

const REFLECT_LITE_STYLE_ID = 'kus-reflect-lite-styles';
const REFLECT_LITE_CSS = `
#kus-reflect-lite.kus-lp--wide{width:min(960px,calc(100vw - 32px));max-height:calc(100dvh - 32px);top:16px;right:16px;border-radius:18px;border-color:#cbd5e1}
#kus-reflect-lite .kus-lp__hero{padding:16px 24px;background:#172033}
#kus-reflect-lite .kus-lp__title{font-size:20px;letter-spacing:-.01em;word-break:keep-all}
#kus-reflect-lite .kus-lp__card pre:empty{display:none!important}
#kus-reflect-lite .kus-lp__subtitle{font-size:12.5px;max-width:560px}
#kus-reflect-lite .kus-lp__body{padding:0;background:#f4f6f8;display:flex;flex-direction:column;overflow:hidden}
#kus-reflect-lite .kus-lp__hint{margin:0;padding:11px 24px;border:0;border-bottom:1px solid #e2e8f0;border-radius:0;background:#fff7ed;color:#9a3412}
#kus-reflect-lite .kus-lp__hint strong{color:#7c2d12}
#kus-reflect-lite .kus-lp__card{border-radius:16px;padding:16px 18px;box-shadow:0 1px 2px rgba(15,23,42,.04)}
#kus-reflect-lite .kus-lp__card-head{border:0;margin:0 0 12px;padding:0}
#kus-reflect-lite .kus-lp__card-title{font-size:12px;text-transform:none;letter-spacing:.01em;color:#172033}
#kus-reflect-lite .kus-lp__card-num{background:#172033;color:#fff}
#kus-reflect-lite .kus-rl-workspace{display:flex;flex-direction:column;min-height:0;flex:1}
#kus-reflect-lite .kus-rl-canvas{min-width:0;min-height:0;overflow:auto;padding:20px 24px;scroll-padding:16px}
#kus-reflect-lite .kus-rl-setup-grid{display:grid;grid-template-columns:minmax(0,1fr);gap:14px}
#kus-reflect-lite .kus-rl-setup-grid>.kus-lp__card{margin:0}
#kus-reflect-lite .kus-rl-setup-grid>.kus-rl-card--route,#kus-reflect-lite .kus-rl-setup-grid>.kus-rl-card--preset{grid-column:1/-1}
#kus-reflect-lite .kus-rl-route{display:grid;grid-template-columns:minmax(0,1fr) 48px minmax(0,1fr);align-items:stretch;gap:10px}
#kus-reflect-lite .kus-rl-endpoint{padding:13px;border:1px solid #e2e8f0;border-radius:13px;background:#f8fafc}
#kus-reflect-lite .kus-rl-endpoint--target{background:#fff7ed;border-color:#fed7aa}
#kus-reflect-lite .kus-rl-endpoint__eyebrow{margin-bottom:8px;font-size:10.5px;font-weight:800;letter-spacing:.08em;color:#64748b;text-transform:uppercase}
#kus-reflect-lite .kus-rl-endpoint--target .kus-rl-endpoint__eyebrow{color:#c2410c}
#kus-reflect-lite .kus-rl-endpoint .kus-lp__row{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,.8fr);gap:7px;margin:0}
#kus-reflect-lite .kus-rl-endpoint .kus-lp__input{width:100%;min-width:0;box-sizing:border-box}
#kus-reflect-lite .kus-rl-endpoint .kus-lp__select{width:100%;margin-bottom:8px}
#kus-reflect-lite .kus-rl-endpoint__note{font-size:11px;color:#9a3412;min-height:33px;margin-bottom:8px}
#kus-reflect-lite .kus-rl-field{display:flex;flex-direction:column;gap:4px;font-size:11px;font-weight:600;margin:8px 0}
#kus-reflect-lite .kus-rl-field .kus-lp__input{min-height:40px;font-size:14px}
#kus-reflect-lite .kus-rl-endpoint .kus-lp__file{width:100%;min-width:0;box-sizing:border-box;margin:12px 0}
#kus-reflect-lite .kus-rl-endpoint .kus-lp__check{margin:10px 0}
#kus-reflect-lite .kus-rl-scope-groups{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-top:14px}
#kus-reflect-lite .kus-rl-scope-group{min-width:0;margin:0;padding:10px;border:1px solid #e2e8f0;border-radius:10px}
#kus-reflect-lite .kus-rl-scope-group legend{font-size:11px;font-weight:700;color:#475569;padding:0 4px}
#kus-reflect-lite .kus-rl-scope-group .kus-lp__chips{display:flex;flex-direction:column;align-items:stretch}
#kus-reflect-lite .kus-rl-scope-group .kus-lp__chip{border-radius:6px;white-space:normal;min-height:32px}
#kus-reflect-lite .kus-rl-advanced{border:1px solid #e2e8f0;border-radius:12px;background:#fff;padding:2px 14px}
#kus-reflect-lite .kus-rl-advanced>.kus-lp__details-body{padding:10px 0}
#kus-reflect-lite .kus-rl-advanced .kus-lp__card{box-shadow:none}
#kus-reflect-lite [hidden]{display:none!important}
#kus-reflect-lite :is(button,input,select,summary):focus-visible{outline:3px solid #2563eb;outline-offset:3px}
#kus-reflect-lite .kus-rl-route-arrow{display:flex;align-items:center;justify-content:center;color:#dc2626;font-size:22px;font-weight:800}
#kus-reflect-lite .kus-rl-route-utility{margin-top:10px!important;padding-top:10px;border-top:1px dashed #e2e8f0}
#kus-reflect-lite .kus-rl-review{display:flex;flex-direction:column;gap:10px}
#kus-reflect-lite .kus-rl-review-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
#kus-reflect-lite .kus-rl-stat{padding:10px 12px;border:1px solid #e2e8f0;border-radius:10px;background:#fff}
#kus-reflect-lite .kus-rl-stat__label{font-size:10.5px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px}
#kus-reflect-lite .kus-rl-stat__value{font-size:13px;font-weight:700;color:#0f172a;word-break:break-word}
#kus-reflect-lite .kus-rl-stat__meta{margin-top:4px;font-size:11px;line-height:1.5;color:#64748b}
#kus-reflect-lite .kus-rl-pills{display:flex;flex-wrap:wrap;gap:6px}
#kus-reflect-lite .kus-rl-pill{display:inline-flex;align-items:center;gap:4px;padding:3px 8px;border-radius:999px;font-size:11px;font-weight:700;border:1px solid #e2e8f0;background:#fff;color:#334155}
#kus-reflect-lite .kus-rl-pill--change{background:#fff7ed;border-color:#fdba74;color:#9a3412}
#kus-reflect-lite .kus-rl-pill--same{background:#ecfdf5;border-color:#a7f3d0;color:#065f46}
#kus-reflect-lite .kus-rl-pill--error{background:#fef2f2;border-color:#fca5a5;color:#991b1b}
#kus-reflect-lite .kus-rl-pill--stale{background:#eff6ff;border-color:#93c5fd;color:#1d4ed8}
#kus-reflect-lite .kus-rl-next{padding:10px 12px;border-radius:10px;font-size:12px;line-height:1.6;border:1px solid #e2e8f0;background:#fff;overflow-wrap:anywhere}
#kus-reflect-lite .kus-rl-next strong{display:block;margin-bottom:2px}
#kus-reflect-lite .kus-rl-next--ok{background:#ecfdf5;border-color:#a7f3d0;color:#065f46}
#kus-reflect-lite .kus-rl-next--info{background:#eff6ff;border-color:#bfdbfe;color:#1e3a8a}
#kus-reflect-lite .kus-rl-next--warn{background:#fffbeb;border-color:#fde68a;color:#92400e}
#kus-reflect-lite .kus-rl-issues{margin:0;padding-left:18px;font-size:12px;line-height:1.6;color:#92400e;overflow-wrap:anywhere}
#kus-reflect-lite .kus-rl-issues li+li{margin-top:3px}
#kus-reflect-lite .kus-rl-quiet{font-size:11.5px;color:#64748b}
#kus-reflect-lite .kus-rl-lookup-status{margin-top:6px;font-size:11.5px;color:#475569}
#kus-reflect-lite .kus-rl-lookup-status--err{color:#b91c1c;font-weight:700}
#kus-reflect-lite .kus-rl-preset-name{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:6px;align-items:center;margin-bottom:8px}
#kus-reflect-lite .kus-rl-preset-name .kus-lp__input{width:100%;min-width:0;box-sizing:border-box}
#kus-reflect-lite .kus-rl-dock-reason{color:#9a3412;font-weight:600}
#kus-reflect-lite .kus-rl-preview-summary{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px}
#kus-reflect-lite .kus-rl-preview-tools{display:flex;flex-direction:column;gap:8px;margin-bottom:10px}
#kus-reflect-lite .kus-rl-preview-tools__actions{display:flex;flex-wrap:wrap;gap:6px}
#kus-reflect-lite .kus-rl-preview-empty{padding:14px 12px;border:1px dashed #cbd5e1;border-radius:10px;background:#f8fafc;font-size:12px;color:#64748b}
#kus-reflect-lite .kus-rl-preview-group{border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;background:#fff;margin-bottom:10px}
#kus-reflect-lite .kus-rl-preview-group__head{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:9px 12px;background:#f8fafc;border-bottom:1px solid #e2e8f0;font-size:11.5px;font-weight:700;color:#334155}
#kus-reflect-lite .kus-rl-preview-list{display:flex;flex-direction:column;gap:8px;padding:10px}
#kus-reflect-lite .kus-rl-preview-row{border:1px solid #e2e8f0;border-radius:10px;padding:10px;background:#fff;overflow-wrap:anywhere}
#kus-reflect-lite .kus-rl-preview-row--change{border-color:#fdba74;background:#fffaf0}
#kus-reflect-lite .kus-rl-preview-row--same{border-color:#bbf7d0;background:#f0fdf4}
#kus-reflect-lite .kus-rl-preview-row--error{border-color:#fca5a5;background:#fff5f5}
#kus-reflect-lite .kus-rl-preview-row__head{display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:6px}
#kus-reflect-lite .kus-rl-preview-row__title{font-size:12px;font-weight:700;color:#0f172a}
#kus-reflect-lite .kus-rl-preview-row__detail{font-size:11.5px;line-height:1.6;color:#475569}
#kus-reflect-lite .kus-rl-preview-row__meta{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}
#kus-reflect-lite .kus-rl-preview-row__actions{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}
#kus-reflect-lite .kus-rl-preview-row__state{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}
#kus-reflect-lite .kus-rl-preview-mini{display:inline-flex;align-items:center;padding:2px 7px;border-radius:999px;background:#fff;border:1px solid #e2e8f0;font-size:10.5px;font-weight:700;color:#475569}
#kus-reflect-lite .kus-rl-nav{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;padding:10px 24px;background:#fff;border-bottom:1px solid #e2e8f0;flex-shrink:0}
#kus-reflect-lite .kus-rl-nav__btn{appearance:none;width:100%;border:1px solid transparent;border-radius:10px;background:transparent;color:#64748b;padding:10px;cursor:pointer;font-family:inherit;font-size:12px;font-weight:700;display:grid;grid-template-columns:24px 1fr;align-items:center;gap:9px;text-align:left}
#kus-reflect-lite .kus-rl-nav__btn:hover{background:#f1f5f9;color:#172033}
#kus-reflect-lite .kus-rl-nav__btn[aria-selected="true"]{background:#fff7ed;color:#9a3412;border-color:#fed7aa}
#kus-reflect-lite .kus-rl-nav__num{display:inline-flex;width:19px;height:19px;align-items:center;justify-content:center;border-radius:50%;background:#e2e8f0;color:#475569;font-size:10px}
#kus-reflect-lite .kus-rl-nav__btn[aria-selected="true"] .kus-rl-nav__num{background:#fee2e2;color:#b91c1c}
#kus-reflect-lite .kus-rl-nav__copy{display:block;font-size:9.5px;font-weight:500;color:#94a3b8;margin-top:2px}
#kus-reflect-lite .kus-rl-nav__btn[aria-selected="true"] .kus-rl-nav__copy{color:#64748b}
#kus-reflect-lite .kus-rl-stage[hidden]{display:none}
#kus-reflect-lite .kus-rl-stage-head{margin:0 2px 16px}
#kus-reflect-lite .kus-rl-stage-head h2{margin:0;font-size:19px;letter-spacing:-.02em;color:#0f172a}
#kus-reflect-lite .kus-rl-stage-head p{margin:4px 0 0;font-size:12px;color:#64748b}
#kus-reflect-lite .kus-rl-action-dock{flex-shrink:0;padding:12px 24px;background:#fff;border-top:1px solid #e2e8f0}
#kus-reflect-lite .kus-rl-dock-row{display:flex;align-items:center;gap:10px}
#kus-reflect-lite .kus-rl-dock-copy{flex:1;min-width:0;font-size:12px;color:#475569;overflow-wrap:anywhere}
#kus-reflect-lite .kus-rl-dock-copy strong{display:block;color:#0f172a}
#kus-reflect-lite .kus-rl-dock-msg{display:block}
#kus-reflect-lite .kus-rl-dock-actions{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end}
#kus-reflect-lite .kus-rl-dock-actions .kus-lp__btn{min-height:42px}
#kus-reflect-lite .kus-rl-action-dock .kus-lp__result{max-height:80px;overflow:auto}
#kus-reflect-lite .kus-rl-action-dock .kus-lp__status-text{max-height:48px;overflow:auto}
#kus-reflect-lite .kus-rl-action-dock .kus-lp__status{margin-top:8px}
#kus-reflect-lite .kus-rl-stage .kus-lp__card:last-child{margin-bottom:0}
#kus-reflect-lite .kus-rl-confirm-route{display:grid;gap:8px;margin-bottom:12px}
#kus-reflect-lite .kus-rl-confirm-route>div{padding:12px;border-radius:10px;border:1px solid #cbd5e1;background:#f8fafc;overflow-wrap:anywhere}
#kus-reflect-lite .kus-rl-confirm-route>div:last-child{border:2px solid #ea580c;background:#fff7ed}
#kus-reflect-lite .kus-rl-confirm-route span{display:block;font-size:11px;color:#64748b;margin-bottom:4px}
#kus-reflect-lite .kus-rl-changes{margin-top:10px;font-size:12px;min-width:0}
#kus-reflect-lite .kus-rl-changes summary{cursor:pointer;padding:8px 0;font-weight:700}
#kus-reflect-lite .kus-rl-change{border-top:1px solid #cbd5e1;padding:10px 0;overflow-wrap:anywhere}
#kus-reflect-lite .kus-rl-change[data-kind="削除"]>strong{color:#b91c1c}
#kus-reflect-lite .kus-rl-change__values{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:8px}
#kus-reflect-lite .kus-rl-change__values>div{min-width:0;background:#fff;border:1px solid #e2e8f0;border-radius:6px;padding:8px}
#kus-reflect-lite .kus-rl-change__values span{font-size:10px;color:#64748b}
#kus-reflect-lite .kus-rl-change__values pre{margin:4px 0 0;white-space:pre-wrap;overflow-wrap:anywhere;font:11px/1.6 ui-monospace,monospace}
#kus-reflect-lite .kus-rl-nav__btn:disabled{opacity:.45;cursor:not-allowed}
#kus-reflect-lite .kus-rl-app-note{margin:-2px 0 8px;min-height:18px;font-size:11.5px;line-height:1.5;color:#64748b;overflow-wrap:anywhere}
#kus-reflect-lite .kus-rl-app-note--ok{color:#065f46;font-weight:600}
#kus-reflect-lite .kus-rl-app-note--warn{color:#b91c1c;font-weight:700}
#kus-reflect-lite .kus-rl-scope-group .kus-lp__chip{display:flex;align-items:center;gap:6px}
#kus-reflect-lite .kus-rl-chip__badge{margin-left:auto;flex:none;padding:0 6px;border:1px solid #fb923c;border-radius:4px;background:#fff7ed;color:#9a3412;font-size:10px;font-weight:800;line-height:16px;letter-spacing:.04em}
#kus-reflect-lite .kus-rl-scope-notice{margin:10px 0 0}
#kus-reflect-lite .kus-rl-scope-option{margin-top:12px;padding:10px 12px;border:1px solid #e2e8f0;border-radius:10px;background:#f8fafc}
#kus-reflect-lite .kus-rl-scope-option__title{margin-bottom:6px;font-size:11px;font-weight:700;color:#475569}
#kus-reflect-lite .kus-rl-scope-option .kus-lp__check{margin:0}
#kus-reflect-lite .kus-rl-scope-option__help{margin:4px 0 0 22px;font-size:11.5px;line-height:1.5;color:#475569}
#kus-reflect-lite .kus-rl-scope-option__help--warn{color:#9a3412;font-weight:700}
#kus-reflect-lite .kus-rl-scope-help{margin:0;display:grid;gap:8px;font-size:11.5px;line-height:1.55}
#kus-reflect-lite .kus-rl-scope-help dt{display:flex;flex-wrap:wrap;align-items:center;gap:6px;font-weight:700;color:#0f172a}
#kus-reflect-lite .kus-rl-scope-help dd{margin:2px 0 0;color:#475569}
#kus-reflect-lite .kus-rl-fix{display:flex;flex-direction:column;align-items:flex-start;gap:6px}
#kus-reflect-lite .kus-rl-fix__note{font-size:11.5px;color:#475569}
#kus-reflect-lite .kus-rl-summary{margin:0 0 12px;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;background:#fff}
#kus-reflect-lite .kus-rl-summary__title{display:flex;flex-wrap:wrap;align-items:baseline;gap:4px 10px;padding:9px 12px;background:#f8fafc;border-bottom:1px solid #e2e8f0;font-size:11.5px;color:#475569}
#kus-reflect-lite .kus-rl-summary__title strong{color:#0f172a}
#kus-reflect-lite .kus-rl-summary__table{width:100%;border-collapse:collapse;font-size:12px}
#kus-reflect-lite .kus-rl-summary__table th{padding:7px 10px;text-align:left;font-size:11px;font-weight:700;color:#475569;background:#fff;border-bottom:1px solid #e2e8f0;white-space:nowrap}
#kus-reflect-lite .kus-rl-summary__table td{padding:8px 10px;border-top:1px solid #f1f5f9;vertical-align:middle;overflow-wrap:anywhere}
#kus-reflect-lite .kus-rl-summary__table tbody tr{cursor:pointer}
#kus-reflect-lite .kus-rl-summary__table tbody tr:hover{background:#f8fafc}
#kus-reflect-lite .kus-rl-summary__table th.kus-rl-summary__num,#kus-reflect-lite .kus-rl-summary__table td.kus-rl-summary__num{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}
#kus-reflect-lite .kus-rl-summary__link{appearance:none;border:0;background:none;padding:2px 0;font:inherit;font-weight:700;color:#1d4ed8;text-align:left;text-decoration:underline;cursor:pointer}
#kus-reflect-lite .kus-rl-preview-row{scroll-margin-top:8px}
#kus-reflect-lite .kus-rl-preview-row--focus{box-shadow:0 0 0 3px #93c5fd}
#kus-reflect-lite .kus-rl-result-heading{margin-top:10px;font-size:11px;font-weight:700;color:#475569}
#kus-reflect-lite .kus-rl-result-list{list-style:none;margin:6px 0 0;padding:0;display:flex;flex-direction:column;gap:6px}
#kus-reflect-lite .kus-rl-result-item{min-width:0;padding:8px 10px;border:1px solid #e2e8f0;border-radius:10px;background:#fff;overflow-wrap:anywhere}
#kus-reflect-lite .kus-rl-result-item--ok{border-color:#a7f3d0}
#kus-reflect-lite .kus-rl-result-item--ng{border-color:#fca5a5;background:#fff5f5}
#kus-reflect-lite .kus-rl-result-item--pending{border-color:#fde68a;background:#fffbeb}
#kus-reflect-lite .kus-rl-result-item__head{display:flex;flex-wrap:wrap;align-items:center;gap:4px 8px;font-size:12px}
#kus-reflect-lite .kus-rl-result-state{display:inline-flex;align-items:center;gap:4px;padding:1px 8px;border:1px solid #cbd5e1;border-radius:999px;background:#f8fafc;font-size:11px;font-weight:700;color:#475569}
#kus-reflect-lite .kus-rl-result-state--ok{border-color:#a7f3d0;background:#ecfdf5;color:#065f46}
#kus-reflect-lite .kus-rl-result-state--ng{border-color:#fca5a5;background:#fef2f2;color:#991b1b}
#kus-reflect-lite .kus-rl-result-state--pending{border-color:#fde68a;background:#fffbeb;color:#92400e}
#kus-reflect-lite .kus-rl-result-item__message{margin-top:6px;font-size:11.5px;line-height:1.6;color:#334155;white-space:pre-wrap;overflow-wrap:anywhere}
#kus-reflect-lite .kus-rl-result-item__hint{margin-top:4px;font-size:11.5px;line-height:1.5;font-weight:600;color:#9a3412}
#kus-reflect-lite .kus-rl-undo{margin:10px 0 0}
#kus-reflect-lite .kus-rl-items{margin:8px 0 6px;padding:10px 12px;border:1px solid #e2e8f0;border-radius:10px;background:#fff}
#kus-reflect-lite .kus-rl-items__title{display:flex;flex-wrap:wrap;align-items:baseline;gap:2px 10px;margin-bottom:8px;font-size:11.5px;color:#475569}
#kus-reflect-lite .kus-rl-items__title strong{font-size:12px;color:#0f172a}
#kus-reflect-lite .kus-rl-items__list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:7px}
#kus-reflect-lite .kus-rl-item{display:grid;grid-template-columns:auto minmax(0,1fr);column-gap:8px;row-gap:2px;align-items:baseline;font-size:12px;line-height:1.55;overflow-wrap:anywhere}
#kus-reflect-lite .kus-rl-item__name{min-width:0;font-weight:700;color:#0f172a}
#kus-reflect-lite .kus-rl-item__details{grid-column:2;margin:0;padding-left:16px;font-size:11.5px;color:#475569}
#kus-reflect-lite .kus-rl-item--keep .kus-rl-item__name{font-weight:600;color:#475569}
#kus-reflect-lite .kus-rl-kind{display:inline-block;min-width:36px;padding:0 6px;border:1px solid #cbd5e1;border-radius:4px;background:#f1f5f9;color:#475569;font-size:10.5px;font-weight:800;line-height:18px;letter-spacing:.04em;text-align:center}
#kus-reflect-lite .kus-rl-kind--delete{border-color:#fca5a5;background:#fef2f2;color:#991b1b}
#kus-reflect-lite .kus-rl-kind--change{border-color:#fdba74;background:#fff7ed;color:#9a3412}
#kus-reflect-lite .kus-rl-kind--add{border-color:#86efac;background:#f0fdf4;color:#166534}
#kus-reflect-lite .kus-rl-items--quiet{padding:0 12px;border-style:dashed;background:#f8fafc}
#kus-reflect-lite .kus-rl-items--quiet>summary{cursor:pointer;padding:8px 0;font-size:11.5px;font-weight:700;color:#64748b}
#kus-reflect-lite .kus-rl-items--quiet[open]>summary{margin-bottom:6px}
#kus-reflect-lite .kus-rl-items--quiet .kus-rl-items__list{padding-bottom:10px}
#kus-reflect-lite .kus-rl-items__more{margin-top:8px}
#kus-reflect-lite .kus-rl-uploads{margin:8px 0 6px;padding:9px 12px;border:1px solid #bfdbfe;border-radius:10px;background:#eff6ff;font-size:11.5px;line-height:1.55;color:#1e3a8a;overflow-wrap:anywhere}
#kus-reflect-lite .kus-rl-uploads ul{margin:4px 0 0;padding-left:18px}
#kus-reflect-lite .kus-rl-pending{display:flex;flex-wrap:wrap;gap:2px 8px;margin:0;padding:8px 12px;border-radius:10px;font-size:11.5px;line-height:1.55;overflow-wrap:anywhere}
#kus-reflect-lite .kus-rl-pending--clean{border:1px solid #bbf7d0;background:#f0fdf4;color:#065f46}
#kus-reflect-lite .kus-rl-pending--unknown{border:1px dashed #cbd5e1;background:#f8fafc;color:#475569}
#kus-reflect-lite .kus-rl-restore-notice{margin:0}
#kus-reflect-lite .kus-rl-progress__summary{margin:0 0 6px;font-size:12px;font-weight:700;color:#334155}
#kus-reflect-lite .kus-rl-result-item--running{border-color:#93c5fd;background:#eff6ff}
#kus-reflect-lite .kus-rl-result-state--running{border-color:#93c5fd;background:#dbeafe;color:#1e40af}
#kus-reflect-lite .kus-rl-confirm-entry{margin-top:12px;padding-top:10px;border-top:1px solid #cbd5e1}
#kus-reflect-lite .kus-rl-confirm-entry h3{margin:0 0 6px;font-size:13px;color:#0f172a}
#kus-reflect-lite .kus-rl-confirm-heading{margin:10px 0 4px;font-size:12px;font-weight:700;color:#991b1b}
#kus-reflect-lite .kus-rl-rollout__input{width:100%;min-width:0;box-sizing:border-box;min-height:84px}
#kus-reflect-lite .kus-rl-rollout__status{margin-top:6px;font-size:11.5px;line-height:1.5;color:#475569;overflow-wrap:anywhere}
#kus-reflect-lite .kus-rl-rollout__status--err{color:#b91c1c;font-weight:700}
#kus-reflect-lite .kus-rl-rollout-card .kus-rl-next{margin-bottom:8px}
#kus-reflect-lite .kus-rl-rollout-heading{margin-top:12px;font-size:11px;font-weight:700;color:#475569}
#kus-reflect-lite .kus-rl-rollout-list{list-style:none;margin:6px 0 0;padding:0;display:flex;flex-direction:column;gap:6px}
#kus-reflect-lite .kus-rl-rollout-item{min-width:0;padding:8px 10px;border:1px solid #e2e8f0;border-radius:10px;background:#fff;overflow-wrap:anywhere}
#kus-reflect-lite .kus-rl-rollout-item--ng{border-color:#fca5a5;background:#fff5f5}
#kus-reflect-lite .kus-rl-rollout-item--pending{border-color:#fde68a;background:#fffbeb}
#kus-reflect-lite .kus-rl-rollout-item__head{display:flex;flex-wrap:wrap;align-items:center;gap:4px 8px;font-size:12px}
#kus-reflect-lite .kus-rl-rollout-card .kus-rl-next[hidden]{display:none}
@media(max-width:760px){
  #kus-reflect-lite .kus-rl-summary__table,#kus-reflect-lite .kus-rl-summary__table tbody{display:block}
  #kus-reflect-lite .kus-rl-summary__table thead{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
  #kus-reflect-lite .kus-rl-summary__table tbody tr{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:4px 8px;padding:10px 12px;border-top:1px solid #e2e8f0}
  #kus-reflect-lite .kus-rl-summary__table tbody tr:first-child{border-top:0}
  #kus-reflect-lite .kus-rl-summary__table td{display:block;padding:0;border:0;min-width:0}
  #kus-reflect-lite .kus-rl-summary__table td.kus-rl-summary__name{grid-column:1/5}
  #kus-reflect-lite .kus-rl-summary__table td.kus-rl-summary__status{grid-column:5/7;justify-self:end}
  #kus-reflect-lite .kus-rl-summary__table td.kus-rl-summary__num{grid-column:span 2;text-align:left}
  #kus-reflect-lite .kus-rl-summary__table td.kus-rl-summary__how,#kus-reflect-lite .kus-rl-summary__table td.kus-rl-summary__sel{grid-column:1/-1}
  #kus-reflect-lite .kus-rl-summary__table td.kus-rl-summary__num::before,#kus-reflect-lite .kus-rl-summary__table td.kus-rl-summary__how::before{content:attr(data-label) " ";font-size:10.5px;font-weight:700;color:#64748b}
}
@media(max-width:720px){
  #kus-reflect-lite .kus-rl-change__values{grid-template-columns:1fr}
  #kus-reflect-lite .kus-rl-nav__num{display:none}

  #kus-reflect-lite.kus-lp--wide{width:calc(100vw - 16px);right:8px;top:8px;max-height:calc(100dvh - 16px)}
  #kus-reflect-lite .kus-lp__hero{padding:12px 16px}
  #kus-reflect-lite .kus-lp__hint,#kus-reflect-lite .kus-lp__badge-row{display:none}
  #kus-reflect-lite .kus-rl-nav{padding:8px;gap:4px}
  #kus-reflect-lite .kus-rl-nav::before,#kus-reflect-lite .kus-rl-nav__copy{display:none}
  #kus-reflect-lite .kus-rl-nav__btn{display:flex;justify-content:center;text-align:center;padding:8px 4px;font-size:11px}
  #kus-reflect-lite .kus-rl-nav__btn+.kus-rl-nav__btn{margin:0}
  #kus-reflect-lite .kus-rl-canvas{padding:18px 16px 8px}
  #kus-reflect-lite .kus-rl-setup-grid{grid-template-columns:1fr}
  #kus-reflect-lite .kus-rl-setup-grid>*{grid-column:1!important}
  #kus-reflect-lite .kus-rl-route{grid-template-columns:1fr}
  #kus-reflect-lite .kus-rl-route-arrow{height:24px;transform:rotate(90deg)}
  #kus-reflect-lite .kus-rl-action-dock{padding:12px 16px 15px}
  #kus-reflect-lite .kus-rl-review-grid{grid-template-columns:1fr}
  #kus-reflect-lite .kus-rl-scope-groups{grid-template-columns:1fr}
  #kus-reflect-lite .kus-rl-dock-row{align-items:stretch;flex-direction:column;gap:8px}
  #kus-reflect-lite .kus-rl-dock-actions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px}
  #kus-reflect-lite .kus-rl-dock-actions .kus-lp__btn{min-width:0;white-space:normal}
  #kus-reflect-lite .kus-rl-dock-actions .kus-lp__btn--danger,#kus-reflect-lite .kus-rl-dock-actions .kus-lp__btn--primary{grid-column:1/-1}
  #kus-reflect-lite .kus-lp__card{padding:12px}
  #kus-reflect-lite .kus-lp__card-head{flex-wrap:wrap}
  #kus-reflect-lite .kus-lp__select{min-width:0!important;max-width:100%}
}
/* 幅が狭いとき、経過時間の表示がタイトルを折り返させないよう省く（処理中は上端のバーと下のステータスで分かる）。 */
@media(max-width:400px){#kus-reflect-lite .kus-lp__elapsed{display:none}}
/* 低い画面（スマートフォンの横向き・小さなノート PC など）では、固定フッターと見出しを詰めて本文の領域を確保する。 */
@media(max-height:720px){
  #kus-reflect-lite .kus-lp__hero{padding:8px 16px}
  #kus-reflect-lite .kus-lp__title{font-size:16px}
  #kus-reflect-lite .kus-lp__subtitle{display:none}
  #kus-reflect-lite .kus-rl-nav{padding:6px 12px}
  #kus-reflect-lite .kus-rl-nav__btn{padding:6px 4px}
  #kus-reflect-lite .kus-rl-nav__copy{display:none}
  #kus-reflect-lite .kus-rl-canvas{padding:12px 16px 8px}
  #kus-reflect-lite .kus-rl-stage-head{margin-bottom:10px}
  #kus-reflect-lite .kus-rl-stage-head h2{font-size:16px}
  #kus-reflect-lite .kus-rl-stage-head p{display:none}
  #kus-reflect-lite .kus-rl-action-dock{padding:8px 16px 10px}
  #kus-reflect-lite .kus-rl-dock-row{gap:6px}
  #kus-reflect-lite .kus-rl-dock-copy{font-size:11px;line-height:1.4}
  #kus-reflect-lite .kus-rl-dock-copy strong,#kus-reflect-lite .kus-rl-dock-msg{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden}
  #kus-reflect-lite .kus-rl-dock-actions{gap:4px 6px}
  #kus-reflect-lite .kus-rl-dock-actions .kus-lp__btn{min-height:36px;padding:6px 10px}
  #kus-reflect-lite .kus-rl-action-dock .kus-lp__status{margin-top:6px;padding:6px 10px;min-height:0;line-height:1.4}
  #kus-reflect-lite .kus-rl-action-dock .kus-lp__status-text{max-height:2.9em}
  #kus-reflect-lite .kus-rl-action-dock .kus-lp__result{max-height:48px}
}
/* 低くて幅のある画面（横向きのタブレットなど）では、フッターの説明と操作を 1 行に並べて高さを節約する。 */
@media(max-height:720px) and (min-width:560px){
  #kus-reflect-lite .kus-rl-dock-row{flex-direction:row;align-items:center;gap:10px}
  #kus-reflect-lite .kus-rl-dock-actions{display:flex;flex-wrap:nowrap;justify-content:flex-end;flex:none}
  #kus-reflect-lite .kus-rl-dock-actions .kus-lp__btn{white-space:nowrap}
}
@media(prefers-reduced-motion:reduce){#kus-reflect-lite{animation:none}#kus-reflect-lite *{scroll-behavior:auto!important}}
`;

type PreviewEntry = PreviewReflectResult['entries'][number];

interface ExecutionPlan {
  effectiveScopes: string[];
  changedScopes: string[];
  sameScopes: string[];
  errorScopes: string[];
  skippedSameScopes: string[];
  skippedErrorScopes: string[];
}

interface PreviewRenderOptions {
  selectedScopes?: string[];
  plan?: ExecutionPlan | null;
  searchKeyword?: string;
  statusFilter?: string;
  fresh?: boolean;
  onAdd?: (sectionKey: string) => void;
  onRemove?: (sectionKey: string) => void;
  /** 要約表から移動する項目が絞り込みで隠れているとき、絞り込みを解除して再描画する。 */
  onShowAll?: () => void;
}

function ensureReflectLiteStyles() {
  if (document.getElementById(REFLECT_LITE_STYLE_ID)) return;
  const st = document.createElement('style');
  st.id = REFLECT_LITE_STYLE_ID;
  st.textContent = REFLECT_LITE_CSS;
  document.head.appendChild(st);
}

// =============================================================================
// メイン
// =============================================================================

export function mountReflectLitePanel() {
  // 取得・反映の実行中に再起動すると、実行中の処理を見失ったまま新しい操作を始められてしまう。既存のパネルを残す。
  const running = document.getElementById('kus-reflect-lite');
  if (running?.getAttribute('aria-busy') === 'true') {
    running.setAttribute('tabindex', '-1');
    running.focus({ preventScroll: true });
    return;
  }
  ensureReflectLiteStyles();

  const panel = createLitePanel({
    id: 'kus-reflect-lite',
    title: 'プレビュー反映',
    subtitle: '反映元アプリの設定を、反映先アプリのプレビューへまとめて反映します。',
    accent: 'reflect',
    badges: [],
    hint: '<strong>差分を確認してから反映</strong> · 反映先はプレビューです。本番への公開は設定画面で行います。',
    wide: true
  });
  let showWorkflowStage: (stage: 'setup' | 'review' | 'confirm' | 'result') => void = () => {};
  let refreshWorkflow = () => {};
  let busy = false;
  let sourceMode: 'app' | 'json' = 'app';
  // 「バックアップから戻す」で反映元を切り替えている間だけ値を持つ。反映元・反映先を手で変えたら解除する（refreshReviewCard で判定）。
  let restoreMode: { token: string; targetAppId: string; targetGuestId: string; at: number } | null = null;

  // ---- アプリ ----
  const srcApp = makeInput({ placeholder: '反映元アプリID', value: memoryState.sourceAppId || '', width: 'id' });
  const srcGuest = makeInput({ placeholder: 'ゲストID', value: memoryState.sourceGuestId || '', width: 'guest' });
  // 開いているアプリがゲストスペースにある場合、アプリIDだけを入れると別の（通常）スペースを指してしまう。
  const pageGuestId = () => guestIdFromPagePath(window.location?.pathname || '');
  const defaultsToCurrentApp = !memoryState.targetAppId && !!DEFAULT_APP_ID;
  const tgtApp = makeInput({ placeholder: '反映先アプリID', value: memoryState.targetAppId || DEFAULT_APP_ID || '', width: 'id' });
  const tgtGuest = makeInput({ placeholder: 'ゲストID', value: defaultsToCurrentApp ? pageGuestId() : (memoryState.targetGuestId || ''), width: 'guest' });
  // ---- 入力中のアプリ名確認（進行はブロックしない。厳密な確認は差分取得時の resolveReflectAppsStandalone） ----
  const appLookupCache = createReflectAppLookupCache();
  const APP_LOOKUP_DELAY_MS = 350;
  function createAppNote(appInput: HTMLInputElement, guestInput: HTMLInputElement, isActive: () => boolean, onResolved: () => void) {
    const el = document.createElement('div');
    el.className = 'kus-rl-app-note';
    el.setAttribute('aria-live', 'polite');
    let key = '\u0000';
    let seq = 0;
    let timer: number | undefined;
    let known: ReflectAppLookupOk | null = null;
    const paint = (text: string, tone: '' | 'ok' | 'warn' = '') => {
      el.textContent = text;
      el.classList.toggle('kus-rl-app-note--ok', tone === 'ok');
      el.classList.toggle('kus-rl-app-note--warn', tone === 'warn');
    };
    const show = (info: ReflectAppLookupOk, open: boolean) => {
      known = info;
      paint(`✓ ${formatReflectAppName(info)}${open ? ' · 開いているアプリ' : ''}`, 'ok');
      onResolved();
    };
    function refresh() {
      const appId = appInput.value.trim();
      const guest = guestInput.value.trim();
      const active = isActive() && isLookupableReflectApp(appId, guest);
      const nextKey = active ? `${guest}|${appId}` : '';
      if (nextKey === key) return;
      key = nextKey;
      seq += 1;
      known = null;
      window.clearTimeout(timer);
      if (!active) { paint(''); return; }
      const open = !!DEFAULT_APP_ID && appId === DEFAULT_APP_ID && guest === pageGuestId();
      const cached = appLookupCache.peek(appId, guest);
      if (cached) { show(cached, open); return; }
      paint(open ? '· 開いているアプリ' : '確認中…');
      const mine = seq;
      timer = window.setTimeout(async () => {
        const result = await appLookupCache.get(appId, guest);
        // 入力が変わった後に返ってきた古い応答は捨てる。
        if (mine !== seq) return;
        if (result.ok) show(result, open);
        else if (!open) paint('message' in result ? result.message : REFLECT_APP_LOOKUP_FAILURE, 'warn');
      }, APP_LOOKUP_DELAY_MS);
    }
    return { el, refresh, known: () => known };
  }
  // 名前が分かったらフッターの経路表示も更新する。
  const sourceNote = createAppNote(srcApp, srcGuest, () => sourceMode === 'app', () => refreshWorkflow());
  const targetNote = createAppNote(tgtApp, tgtGuest, () => true, () => refreshWorkflow());
  srcApp.setAttribute('aria-label', '反映元アプリID');
  srcGuest.setAttribute('aria-label', '反映元ゲストスペースID');
  tgtApp.setAttribute('aria-label', '反映先アプリID');
  tgtGuest.setAttribute('aria-label', '反映先ゲストスペースID');
  let sourceBundleFromJson: any = null;
  let sourceJsonBundles: any[] = [];
  // 差分プレビューの鮮度判定（signature）に使う読み込み済みJSONの識別子
  let sourceBundleToken = '';
  let sourceBundleFileName = '';
  const srcJsonFile = document.createElement('input');
  srcJsonFile.type = 'file';
  srcJsonFile.accept = '.json,application/json';
  srcJsonFile.className = 'kus-lp__file';
  const sourceJsonAppSelect = document.createElement('select');
  sourceJsonAppSelect.className = 'kus-lp__select';
  sourceJsonAppSelect.setAttribute('aria-label', '設定JSON内の反映元アプリ');
  sourceJsonAppSelect.hidden = true;
  const srcJsonClearBtn = makeButton('クリア', 'ghost');
  srcJsonClearBtn.style.display = 'none';
  const srcJsonNote = document.createElement('div');
  srcJsonNote.className = 'kus-lp__small';
  srcJsonNote.style.display = 'none';

  const currentSrcBtn = makeButton('現在のアプリを反映元', 'sub');
  const copyBtn = makeButton('反映元 → 反映先', 'sub');
  const currentBtn = makeButton('現在のアプリを反映先', 'sub');
  const swapBtn = makeButton('入れ替え', 'sub');

  const cardApp = makeCard({ title: 'アプリ', number: 1 });
  cardApp.card.classList.add('kus-rl-card--route');
  const route = document.createElement('div');
  route.className = 'kus-rl-route';
  const sourceEndpoint = document.createElement('section');
  sourceEndpoint.className = 'kus-rl-endpoint';
  sourceEndpoint.innerHTML = '<div class="kus-rl-endpoint__eyebrow">反映元 · 設定を読み取る</div>';
  const sourceModeSelect = document.createElement('select');
  sourceModeSelect.className = 'kus-lp__select';
  sourceModeSelect.setAttribute('aria-label', '反映元の取得方法');
  sourceModeSelect.innerHTML = '<option value="app">アプリから取得</option><option value="json">設定JSONから取得</option>';
  sourceEndpoint.appendChild(sourceModeSelect);
  const sourceAppFields = document.createElement('div');
  function labeledInput(input: HTMLInputElement, caption: string) {
    const label = document.createElement('label');
    label.className = 'kus-rl-field';
    const text = document.createElement('span');
    text.textContent = caption;
    label.append(text, input);
    input.inputMode = 'numeric';
    return label;
  }
  sourceAppFields.appendChild(labeledInput(srcApp, 'アプリID'));
  sourceAppFields.appendChild(sourceNote.el);
  const sourceGuestDetails = makeDetails('ゲストスペースを指定', { open: !!srcGuest.value });
  sourceGuestDetails.body.appendChild(labeledInput(srcGuest, 'ゲストスペースID（任意）'));
  sourceAppFields.append(sourceGuestDetails.details, currentSrcBtn);
  sourceEndpoint.appendChild(sourceAppFields);
  const sourceJsonFields = document.createElement('div');
  sourceJsonFields.hidden = true;
  srcJsonFile.setAttribute('aria-label', '反映元の設定JSON');
  sourceJsonFields.append(srcJsonFile, sourceJsonAppSelect, srcJsonClearBtn, srcJsonNote);
  sourceEndpoint.appendChild(sourceJsonFields);
  const routeArrow = document.createElement('div');
  routeArrow.className = 'kus-rl-route-arrow';
  routeArrow.setAttribute('aria-hidden', 'true');
  routeArrow.textContent = '→';
  const targetEndpoint = document.createElement('section');
  targetEndpoint.className = 'kus-rl-endpoint kus-rl-endpoint--target';
  targetEndpoint.innerHTML = '<div class="kus-rl-endpoint__eyebrow">反映先 · プレビューへ反映</div><div class="kus-rl-endpoint__note">本番への公開は設定画面から行います</div>';
  targetEndpoint.appendChild(labeledInput(tgtApp, 'アプリID'));
  targetEndpoint.appendChild(targetNote.el);
  const targetGuestDetails = makeDetails('ゲストスペースを指定', { open: !!tgtGuest.value });
  targetGuestDetails.body.appendChild(labeledInput(tgtGuest, 'ゲストスペースID（任意）'));
  targetEndpoint.append(targetGuestDetails.details, currentBtn);
  route.appendChild(sourceEndpoint);
  route.appendChild(routeArrow);
  route.appendChild(targetEndpoint);
  cardApp.body.appendChild(route);
  const quickRow = makeRow([swapBtn, copyBtn]);
  quickRow.classList.add('kus-rl-route-utility');
  cardApp.body.appendChild(quickRow);

  function refreshSrcJsonNote() {
    sourceAppFields.hidden = sourceMode === 'json';
    sourceJsonFields.hidden = sourceMode !== 'json';
    sourceModeSelect.value = sourceMode;
    swapBtn.disabled = sourceMode === 'json';
    copyBtn.disabled = sourceMode === 'json';
    sourceJsonAppSelect.hidden = sourceJsonBundles.length < 2;
    if (sourceBundleFromJson) {
      const appName = extractAppNameFromBundle(sourceBundleFromJson);
      srcJsonNote.textContent = `反映元JSON読み込み済み${sourceBundleFileName ? `（${sourceBundleFileName}）` : ''}: App ${sourceBundleFromJson?.appId || '-'}${appName ? ` (${appName})` : ''}（反映元はこのJSONから取得し、アプリからの取得は行いません）`;
      srcJsonNote.style.display = 'block';
      srcJsonClearBtn.style.display = '';
    } else {
      srcJsonNote.style.display = 'none';
      srcJsonClearBtn.style.display = 'none';
    }
  }

  sourceModeSelect.addEventListener('change', () => {
    sourceMode = sourceModeSelect.value === 'json' ? 'json' : 'app';
    sourceBundleFromJson = null;
    sourceJsonBundles = [];
    sourceBundleToken = '';
    srcJsonFile.value = '';
    refreshSrcJsonNote();
    refreshSameConnBanner();
    refreshReviewCard();
  });

  srcJsonFile.addEventListener('change', () => liteRun(panel, '反映元JSONを読み込み中…', async () => {
    const file = srcJsonFile.files?.[0];
    if (!file) return;
    // 同じファイルを編集して選び直したときも change が発生するよう、選択状態は読み込み後に空へ戻す。
    srcJsonFile.value = '';
    sourceBundleFromJson = null;
    sourceJsonBundles = [];
    sourceBundleToken = '';
    sourceBundleFileName = '';
    let parsed: unknown;
    try {
      parsed = JSON.parse(await file.text());
    } catch {
      throw new Error('設定JSONの読み込みに失敗しました（JSON形式が不正です）');
    }
    sourceJsonBundles = pickAllSettingsBundles(parsed, 'source', true);
    sourceJsonAppSelect.replaceChildren(...sourceJsonBundles.map((bundle, index) => {
      const option = document.createElement('option');
      option.value = String(index);
      const appName = extractAppNameFromBundle(bundle);
      option.textContent = `アプリ #${bundle.appId}${appName ? ` (${appName})` : ''}`;
      return option;
    }));
    sourceBundleFromJson = sourceJsonBundles[0];
    sourceBundleToken = `${file.name}:${file.size}:${file.lastModified}:${Date.now()}`;
    sourceBundleFileName = file.name;
    if (sourceBundleFromJson?.appId) srcApp.value = String(sourceBundleFromJson.appId);
    panel.setStatus(`反映元JSONを読み込みました: App ${sourceBundleFromJson?.appId || '-'}`, 'ok');
    saveState();
    refreshSrcJsonNote();
    refreshSameConnBanner();
    refreshReviewCard();
  }));

  sourceJsonAppSelect.addEventListener('change', () => {
    sourceBundleFromJson = sourceJsonBundles[Number(sourceJsonAppSelect.value)];
    srcApp.value = String(sourceBundleFromJson.appId);
    saveState();
    refreshSrcJsonNote();
    refreshReviewCard();
  });

  srcJsonClearBtn.addEventListener('click', () => {
    sourceBundleFromJson = null;
    sourceJsonBundles = [];
    sourceBundleToken = '';
    srcJsonFile.value = '';
    refreshSrcJsonNote();
    refreshSameConnBanner();
    refreshReviewCard();
    panel.setStatus('反映元JSONをクリアしました。設定JSONを選んでください。', 'info');
  });

  const sameConnBanner = document.createElement('div');
  sameConnBanner.className = 'kus-lp__note--warn';
  sameConnBanner.style.display = 'none';
  sameConnBanner.textContent = '⚠ 反映元と反映先が同一接続です（同じアプリID・ゲストID）。同一アプリのプレビューを上書きする状態です。';
  cardApp.body.appendChild(sameConnBanner);

  cardApp.body.appendChild(createAppSearchControl(panel, {
    targets: [
      { label: '反映元', apply: (id, _name, guestId) => {
        sourceModeSelect.value = 'app';
        sourceModeSelect.dispatchEvent(new Event('change'));
        srcApp.value = id;
        srcGuest.value = guestId || '';
        saveState(); refreshSameConnBanner(); refreshReviewCard();
      } },
      { label: '反映先', apply: (id, _name, guestId) => {
        tgtApp.value = id;
        tgtGuest.value = guestId || '';
        saveState(); refreshSameConnBanner(); refreshReviewCard();
      } }
    ]
  }));

  panel.body.insertBefore(cardApp.card, panel.status);

  function refreshSameConnBanner() {
    sourceNote.refresh();
    targetNote.refresh();
    if (srcGuest.value) sourceGuestDetails.details.open = true;
    if (tgtGuest.value) targetGuestDetails.details.open = true;
    const same = sourceMode === 'app'
      && !!srcApp.value.trim()
      && srcApp.value.trim() === tgtApp.value.trim()
      && srcGuest.value.trim() === tgtGuest.value.trim();
    sameConnBanner.style.display = same ? 'block' : 'none';
    sameConnBanner.textContent = sourceEnvironment.value === 'preview'
      ? '同じプレビュー同士は反映できません。反映元の取得環境かアプリIDを変更してください。'
      : '同じアプリの本番設定でプレビューを更新します。未公開の編集への影響を、次の画面で確認してください。';
  }

  currentSrcBtn.addEventListener('click', () => {
    srcApp.value = DEFAULT_APP_ID || '';
    srcGuest.value = DEFAULT_APP_ID ? pageGuestId() : srcGuest.value;
    saveState();
    refreshSameConnBanner();
    refreshReviewCard();
    panel.setStatus('現在のアプリIDを反映元にセットしました', 'info');
  });
  copyBtn.addEventListener('click', () => {
    tgtApp.value = srcApp.value.trim();
    tgtGuest.value = srcGuest.value.trim();
    saveState();
    refreshSameConnBanner();
    refreshReviewCard();
    panel.setStatus('反映元IDを反映先へコピーしました', 'info');
  });
  currentBtn.addEventListener('click', () => {
    tgtApp.value = DEFAULT_APP_ID || '';
    tgtGuest.value = DEFAULT_APP_ID ? pageGuestId() : tgtGuest.value;
    saveState();
    refreshSameConnBanner();
    refreshReviewCard();
    panel.setStatus('現在のアプリIDを反映先にセットしました', 'info');
  });
  swapBtn.addEventListener('click', () => {
    const sa = srcApp.value;
    const sg = srcGuest.value;
    srcApp.value = tgtApp.value;
    srcGuest.value = tgtGuest.value;
    tgtApp.value = sa;
    tgtGuest.value = sg;
    saveState();
    refreshSameConnBanner();
    refreshReviewCard();
    panel.setStatus('反映元と反映先を入れ替えました', 'info');
  });

  [srcApp, srcGuest, tgtApp, tgtGuest].forEach((el) => {
    el.addEventListener('input', () => {
      saveState();
      refreshSameConnBanner();
      refreshReviewCard();
    });
  });

  // アプリ URL の貼り付け・入力から ID を読み取る（/k/123/、/k/guest/5/123/、?app=123）。
  function adoptAppReference(appInput: HTMLInputElement, guestInput: HTMLInputElement, guestDetails: HTMLDetailsElement, sideLabel: string, text = appInput.value) {
    if (!needsAppReferenceParse(text)) return false;
    const reference = parseAppReference(text);
    if (!reference) {
      panel.setStatus(`${sideLabel}のアプリIDを読み取れません。数字のID、またはアプリのURLを入力してください。`, 'warn');
      return false;
    }
    // 通常スペースのURLなら、以前入力したゲストスペースIDを残さない（別スペースのアプリを指してしまうため）。
    const clearedGuest = !reference.guestId && !!guestInput.value.trim();
    appInput.value = reference.appId;
    guestInput.value = reference.guestId;
    if (reference.guestId) guestDetails.open = true;
    saveState();
    refreshSameConnBanner();
    refreshReviewCard();
    panel.setStatus(`URLから${sideLabel}のアプリID ${reference.appId}${reference.guestId ? `（ゲストスペース ${reference.guestId}）` : ''}を読み取りました。${clearedGuest ? 'ゲストスペースIDは空にしました。' : ''}`, 'ok');
    return true;
  }
  for (const [appInput, guestInput, guestDetails, sideLabel] of [
    [srcApp, srcGuest, sourceGuestDetails.details, '反映元'],
    [tgtApp, tgtGuest, targetGuestDetails.details, '反映先']
  ] as const) {
    appInput.addEventListener('paste', (event) => {
      const pasted = event.clipboardData?.getData('text') || '';
      if (!needsAppReferenceParse(pasted)) return;
      if (adoptAppReference(appInput, guestInput, guestDetails, sideLabel, pasted)) event.preventDefault();
    });
    appInput.addEventListener('change', () => { adoptAppReference(appInput, guestInput, guestDetails, sideLabel); });
  }

  // ---- セクション選択 ----
  const cardScope = makeCard({ title: '反映する項目', number: 2, subtitle: '目的に近いセットを選び、必要な項目を調整できます。' });
  // 反映できる項目と表示名は反映エンジンの定義（一般設定を含む）から作る。
  const putSections = REFLECT_SECTION_KEYS.map((key) => ({ key, label: reflectSectionLabel(key) }));
  const initialSelected = new Set(
    Array.isArray(memoryState.selectedScopes)
      ? memoryState.selectedScopes
      : ['fieldSettings', 'layoutSettings', 'viewSettings']
  );
  // チップとグループは反映エンジンの REFLECT_SECTION_KEYS と liteSetup.ts のキー一覧（REFLECT_SCOPE_GROUPS / REFLECT_SCOPE_HINTS）から作る。
  // 項目を増やすときは、そのキー一覧に足す。どのグループにも無い項目は「その他」に入る。
  const chips = putSections.map((d) => {
    const chip = makeChip({ label: d.label, checked: initialSelected.has(d.key), value: d.key });
    const hint = describeReflectScope(d.key);
    // 名前は項目名だけに保ち、説明は title と aria-describedby で伝える。「置換」の目印は色だけに頼らず文字でも示す。
    chip.checkbox.setAttribute('aria-label', d.label);
    if (hint) {
      chip.label.title = `${d.label}: ${hint}`;
      const description = document.createElement('span');
      description.id = `kus-rl-scope-hint-${d.key}`;
      description.hidden = true;
      description.textContent = `${RISKY_SCOPE_KEYS.has(d.key) ? '置換型の項目。' : ''}${hint}`;
      chip.label.appendChild(description);
      chip.checkbox.setAttribute('aria-describedby', description.id);
    }
    if (RISKY_SCOPE_KEYS.has(d.key)) {
      const badge = document.createElement('span');
      badge.className = 'kus-rl-chip__badge';
      badge.setAttribute('aria-hidden', 'true');
      badge.textContent = '置換';
      chip.label.appendChild(badge);
    }
    return chip;
  });
  const chipBox = document.createElement('div');
  chipBox.className = 'kus-rl-scope-groups';
  groupReflectScopes(putSections.map((d) => d.key)).forEach((group) => {
    const fieldset = document.createElement('fieldset');
    fieldset.className = 'kus-rl-scope-group';
    const legend = document.createElement('legend');
    legend.textContent = group.label;
    fieldset.appendChild(legend);
    const list = document.createElement('div');
    list.className = 'kus-lp__chips';
    group.keys.forEach((key) => {
      const chip = chips.find((c) => c.checkbox.value === key);
      if (chip) list.appendChild(chip.label);
    });
    fieldset.appendChild(list);
    chipBox.appendChild(fieldset);
  });
  cardScope.body.appendChild(chipBox);

  // フィールド設定を選ばずに、フィールドを参照する項目だけを選んだときの注意
  const fieldSettingsNotice = document.createElement('p');
  fieldSettingsNotice.className = 'kus-rl-next kus-rl-next--warn kus-rl-scope-notice';
  fieldSettingsNotice.textContent = FIELD_SETTINGS_OMITTED_NOTICE;
  fieldSettingsNotice.hidden = true;
  cardScope.body.appendChild(fieldSettingsNotice);

  // 一覧・グラフ・アクションに関係する設定（項目の選択より後に置く）
  const preserve = makeCheck({ label: '反映先だけの一覧・グラフ・アクションを保持する', checked: memoryState.preserveTargetOnly !== false, help: '標準は保持。OFFにすると反映元にない設定を削除します。フィールドは常に保持します。' });
  const preserveBox = document.createElement('div');
  preserveBox.className = 'kus-rl-scope-option';
  const preserveTitle = document.createElement('div');
  preserveTitle.className = 'kus-rl-scope-option__title';
  preserveTitle.textContent = '一覧・グラフ・アクションの扱い';
  const preserveHelp = document.createElement('p');
  preserveHelp.className = 'kus-rl-scope-option__help';
  preserveHelp.setAttribute('aria-live', 'polite');
  preserveBox.append(preserveTitle, preserve.label, preserveHelp);
  cardScope.body.appendChild(preserveBox);

  const scopeCountLabel = document.createElement('div');
  scopeCountLabel.className = 'kus-lp__small';
  scopeCountLabel.style.marginTop = '8px';
  cardScope.body.appendChild(scopeCountLabel);

  // 項目ごとの反映方法（タッチ操作では title が見えないため、一覧でも読めるようにする）
  const scopeHelp = makeDetails('各項目の反映方法');
  const scopeHelpList = document.createElement('dl');
  scopeHelpList.className = 'kus-rl-scope-help';
  putSections.forEach((d) => {
    const hint = describeReflectScope(d.key);
    if (!hint) return;
    const term = document.createElement('dt');
    term.textContent = d.label;
    if (RISKY_SCOPE_KEYS.has(d.key)) {
      const badge = document.createElement('span');
      badge.className = 'kus-rl-chip__badge';
      badge.textContent = '置換';
      term.appendChild(badge);
    }
    const desc = document.createElement('dd');
    desc.textContent = hint;
    const item = document.createElement('div');
    item.append(term, desc);
    scopeHelpList.appendChild(item);
  });
  scopeHelp.body.appendChild(scopeHelpList);
  cardScope.body.appendChild(scopeHelp.details);

  function collectSelectedScopes() {
    return chips.filter((c) => c.checkbox.checked).map((c) => c.checkbox.value);
  }

  function refreshScopeNotices() {
    const selected = collectSelectedScopes();
    fieldSettingsNotice.hidden = !shouldWarnMissingFieldSettings(selected);
    const keeps = preserve.checkbox.checked;
    const usesNamedSections = ['viewSettings', 'reportSettings', 'actionSettings'].some((key) => selected.includes(key));
    preserveHelp.classList.toggle('kus-rl-scope-option__help--warn', !keeps);
    preserveHelp.textContent = (keeps
      ? '反映先だけの一覧・グラフ・アクションは削除せず残します（標準）。フィールドは常に保持します。'
      : '反映元にない一覧・グラフ・アクションを反映先から削除します。フィールドは常に保持します。')
      + (usesNamedSections ? '' : ' 今の選択（一覧・グラフ・アクションなし）では使われません。');
  }

  function refreshScopeCount() {
    const sel = collectSelectedScopes().length;
    scopeCountLabel.textContent = `選択中: ${sel} / ${chips.length} セクション`;
    refreshScopeNotices();
  }

  function setSelectedScopes(scopeKeys: string[]) {
    const target = new Set(scopeKeys);
    chips.forEach((c) => { c.checkbox.checked = target.has(c.checkbox.value); });
    refreshScopeCount();
    saveState();
    refreshReviewCard();
  }

  chips.forEach((c) => c.checkbox.addEventListener('change', () => {
    refreshScopeCount();
    saveState();
    refreshReviewCard();
  }));
  refreshScopeCount();

  const presetRow = document.createElement('div');
  presetRow.className = 'kus-lp__btn-row';
  presetRow.style.margin = '8px 0 10px';
  for (const preset of SCOPE_QUICK_PRESETS) {
    const btn = makeButton(preset.label, 'sub');
    btn.title = preset.hint;
    btn.addEventListener('click', () => {
      applyScopePreset(preset);
      panel.setStatus(`プリセット適用: ${preset.label}（${collectSelectedScopes().length}件）`, 'info');
    });
    presetRow.appendChild(btn);
  }
  cardScope.body.prepend(presetRow);

  const allBtn = makeButton('全選択', 'sub');
  const noneBtn = makeButton('全解除', 'sub');
  cardScope.actions.appendChild(allBtn);
  cardScope.actions.appendChild(noneBtn);
  allBtn.addEventListener('click', () => {
    chips.forEach((c) => { c.checkbox.checked = true; });
    refreshScopeCount();
    saveState();
    refreshReviewCard();
  });
  noneBtn.addEventListener('click', () => {
    chips.forEach((c) => { c.checkbox.checked = false; });
    refreshScopeCount();
    saveState();
    refreshReviewCard();
  });

  function applyScopePreset(preset: ScopeQuickPreset) {
    if (preset.id === 'all') {
      chips.forEach((c) => { c.checkbox.checked = true; });
    } else if (preset.scopes) {
      const target = new Set(preset.scopes);
      chips.forEach((c) => { c.checkbox.checked = target.has(c.checkbox.value); });
    } else if (preset.exclude) {
      const excluded = new Set(preset.exclude);
      chips.forEach((c) => { c.checkbox.checked = !excluded.has(c.checkbox.value); });
    }
    refreshScopeCount();
    saveState();
    refreshReviewCard();
  }

  panel.body.insertBefore(cardScope.card, panel.status);

  // ---- オプション ----
  const cardOpt = makeCard({ title: '実行オプション', number: 3, soft: true });
  const sourceEnvironment = document.createElement('select');
  sourceEnvironment.className = 'kus-lp__select';
  sourceEnvironment.setAttribute('aria-label', '反映元の取得環境');
  sourceEnvironment.innerHTML = '<option value="production">本番設定（運用中）を取得</option><option value="preview">プレビュー設定（未公開）を取得</option>';
  sourceEnvironment.value = memoryState.sourcePreview ? 'preview' : 'production';
  sourceAppFields.insertBefore(sourceEnvironment, sourceGuestDetails.details);
  const safetyNote = document.createElement('p'); safetyNote.className = 'kus-rl-quiet';
  safetyNote.textContent = '反映前のバックアップを自動保存します。変更のない項目は送信せず、書き込みエラーが起きたら中断します。';
  cardOpt.body.appendChild(safetyNote);

  // Lookup mapping
  const lookupDetails = makeDetails('Lookup AppID マッピング（任意）');
  const lookupTa = makeTextarea({
    rows: 3,
    code: true,
    placeholder: '旧AppID → 新AppID（1行に1組）\n例: 101 → 202',
    value: memoryState.lookupMapText || ''
  });
  lookupTa.setAttribute('aria-label', 'ルックアップの参照アプリID変換');
  lookupDetails.body.appendChild(lookupTa);
  const lookupStatus = document.createElement('div');
  lookupStatus.className = 'kus-rl-lookup-status';
  lookupStatus.setAttribute('aria-live', 'polite');
  lookupDetails.body.appendChild(lookupStatus);
  const lookupHint = document.createElement('div');
  lookupHint.className = 'kus-lp__small';
  lookupHint.style.marginTop = '6px';
  lookupHint.textContent = 'フィールドの参照アプリ（ルックアップ）を別 AppID に置換します。1行に「旧ID → 新ID」（→ / = / : / カンマ区切り）か、{"旧AppID":"新AppID"} のJSONで入力します。差分プレビューにも反映し、実行前に変換先 AppID の存在を確認します。';
  lookupDetails.body.appendChild(lookupHint);
  cardOpt.body.appendChild(lookupDetails.details);

  function refreshLookupStatus() {
    const parsed = parseLookupMapText(lookupTa.value);
    lookupStatus.classList.toggle('kus-rl-lookup-status--err', !parsed.ok);
    lookupStatus.textContent = 'error' in parsed ? parsed.error : parsed.count ? `参照先変換 ${parsed.count} 件を適用します。` : '';
    if (!parsed.ok) lookupDetails.details.open = true;
  }
  refreshLookupStatus();

  [sourceEnvironment, preserve.checkbox].forEach((cb) => {
    cb.addEventListener('change', () => {
      refreshScopeNotices();
      saveState();
      refreshSameConnBanner();
      refreshReviewCard();
    });
  });
  lookupTa.addEventListener('input', () => {
    saveState();
    refreshLookupStatus();
    refreshReviewCard();
  });

  panel.body.insertBefore(cardOpt.card, panel.status);

  // ---- プリセット（接続情報＋スコープを保存・読み込み） ----
  const cardPreset = makeCard({ title: 'プリセット（接続+スコープ）', soft: true });
  cardPreset.card.classList.add('kus-rl-card--preset');
  const presetSelect = document.createElement('select');
  presetSelect.className = 'kus-lp__select';
  presetSelect.style.minWidth = '180px';
  presetSelect.setAttribute('aria-label', '保存済みプリセット');
  const presetName = makeInput({ placeholder: '例: 本番テンプレ → 東京営業所', width: 'wide', noSubmit: true });
  presetName.setAttribute('aria-label', 'プリセット名');
  presetName.maxLength = 60;
  const saveBtn = makeButton('現在の設定を保存', 'sub');
  const loadBtn = makeButton('読み込み', 'sub');
  const delBtn = makeButton('削除', 'sub');
  const exportPresetsBtn = makeButton('JSONで書き出し', 'sub');
  exportPresetsBtn.title = '保存済みプリセットをJSONファイルに書き出します。次回はこのファイルを読み込んで再利用できます。';
  const importPresetsBtn = makeButton('JSONを読み込み', 'sub');
  importPresetsBtn.title = '書き出したプリセットJSONを読み込みます。同名のプリセットは読み込んだ内容で置き換えます。';
  const importPresetsFile = document.createElement('input');
  importPresetsFile.type = 'file';
  importPresetsFile.accept = '.json,application/json';
  importPresetsFile.hidden = true;
  importPresetsFile.setAttribute('aria-label', 'プリセットJSON');
  const presetNameRow = document.createElement('div');
  presetNameRow.className = 'kus-rl-preset-name';
  presetNameRow.append(presetName, saveBtn);
  cardPreset.body.appendChild(presetNameRow);
  cardPreset.body.appendChild(makeRow([presetSelect, loadBtn, delBtn], { label: '保存済み' }));
  cardPreset.body.appendChild(makeRow([exportPresetsBtn, importPresetsBtn, importPresetsFile]));
  const presetHint = document.createElement('div');
  presetHint.className = 'kus-lp__small';
  presetHint.textContent = 'プリセットはこのタブを閉じるまで保持されます（ブラウザに永続保存はしません）。次回も使う場合は「JSONで書き出し」で保存し、「JSONを読み込み」で復元してください。';
  cardPreset.body.appendChild(presetHint);
  panel.body.insertBefore(cardPreset.card, panel.status);

  function refreshPresetSelect() {
    presetSelect.innerHTML = '';
    const presets = memoryState.presets || [];
    if (!presets.length) {
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = '(プリセットなし)';
      presetSelect.appendChild(opt);
      presetSelect.disabled = true;
      loadBtn.disabled = true;
      delBtn.disabled = true;
      return;
    }
    presetSelect.disabled = false;
    loadBtn.disabled = false;
    delBtn.disabled = false;
    for (const p of presets) {
      const opt = document.createElement('option');
      opt.value = p.name;
      opt.textContent = `${p.name} (src#${p.source.appId} → tgt#${p.target.appId})`;
      presetSelect.appendChild(opt);
    }
  }
  function refreshPresetButtons() {
    exportPresetsBtn.disabled = busy || !(memoryState.presets || []).length;
    importPresetsBtn.disabled = busy;
    saveBtn.disabled = busy || !presetName.value.trim();
  }
  refreshPresetSelect();
  refreshPresetButtons();
  presetName.addEventListener('input', refreshPresetButtons);

  saveBtn.addEventListener('click', () => {
    const trimmed = presetName.value.trim();
    if (!trimmed) {
      panel.setStatus('プリセット名を入力してください', 'warn');
      presetName.focus();
      return;
    }
    const preset: ReflectPreset = {
      name: trimmed,
      createdAt: new Date().toISOString(),
      source: {
        appId: srcApp.value.trim(),
        guestId: srcGuest.value.trim(),
        preview: (sourceEnvironment.value === 'preview')
      },
      target: {
        appId: tgtApp.value.trim(),
        guestId: tgtGuest.value.trim(),
        preview: false
      },
      scopes: collectSelectedScopes(),
      applyDiffOnly: false,
      lookupMap: lookupTa.value,
      preserveTargetOnly: preserve.checkbox.checked,
      rolloutQueue: rolloutTa.value
    };
    const replaced = (memoryState.presets || []).some((p) => p.name === trimmed);
    const saved = mergeReflectPresets(memoryState.presets, [preset], REFLECT_PRESET_LIMIT);
    memoryState.presets = saved.presets;
    refreshPresetSelect();
    refreshPresetButtons();
    presetSelect.value = trimmed;
    presetName.value = '';
    refreshPresetButtons();
    panel.setStatus(`プリセット「${trimmed}」を${replaced ? '上書き保存' : '保存'}しました。${saved.dropped ? `上限 ${REFLECT_PRESET_LIMIT} 件のため古いプリセット ${saved.dropped} 件を削除しました。` : ''}次回も使う場合は「JSONで書き出し」で保存してください。`, saved.dropped ? 'warn' : 'ok');
  });

  exportPresetsBtn.addEventListener('click', () => {
    const payload = buildReflectPresetsExport(memoryState.presets);
    if (!payload.count) {
      panel.setStatus('書き出せるプリセットがありません', 'warn');
      return;
    }
    const filename = buildExportFilename('プレビュー反映プリセット', 'json');
    downloadText(filename, JSON.stringify(payload, null, 2), 'application/json');
    panel.setStatus(`プリセット ${payload.count} 件を ${filename} に書き出しました`, 'ok');
  });

  importPresetsBtn.addEventListener('click', () => importPresetsFile.click());
  importPresetsFile.addEventListener('change', () => liteRun(panel, 'プリセットJSONを読み込み中…', async () => {
    const file = importPresetsFile.files?.[0];
    importPresetsFile.value = '';
    if (!file) return;
    let parsed: unknown;
    try {
      parsed = JSON.parse(await readTextFile(file));
    } catch {
      throw new Error('プリセットJSONの読み込みに失敗しました（JSON形式が不正です）');
    }
    const { presets, error } = normalizeImportedReflectPresets(parsed);
    if (error) throw new Error(error);
    if (!presets.length) throw new Error('取り込めるプリセットが見つかりませんでした');
    const merged = mergeReflectPresets(memoryState.presets, presets, REFLECT_PRESET_LIMIT);
    memoryState.presets = merged.presets;
    refreshPresetSelect();
    refreshPresetButtons();
    presetSelect.value = presets[0].name;
    panel.setStatus(`プリセットを読み込みました（追加 ${merged.added} 件 / 上書き ${merged.replaced} 件 / 合計 ${merged.presets.length} 件）。${merged.dropped ? `上限 ${REFLECT_PRESET_LIMIT} 件を超えた ${merged.dropped} 件は保持できませんでした。` : ''}「読み込み」で適用できます。`, merged.dropped ? 'warn' : 'ok');
  }));

  loadBtn.addEventListener('click', () => {
    const name = presetSelect.value;
    const preset = (memoryState.presets || []).find((p) => p.name === name);
    if (!preset) return;
    sourceModeSelect.value = 'app';
    sourceModeSelect.dispatchEvent(new Event('change'));
    srcApp.value = preset.source.appId;
    srcGuest.value = preset.source.guestId;
    tgtApp.value = preset.target.appId;
    tgtGuest.value = preset.target.guestId;
    sourceEnvironment.value = preset.source.preview ? 'preview' : 'production';
    preserve.checkbox.checked = preset.preserveTargetOnly !== false;
    lookupTa.value = preset.lookupMap || '';
    refreshLookupStatus();
    rolloutTa.value = preset.rolloutQueue || '';
    if (rolloutTa.value.trim()) rolloutDetails.details.open = true;
    setSelectedScopes(preset.scopes || []);
    refreshSameConnBanner();
    saveState();
    refreshReviewCard();
    panel.setStatus(`プリセット「${name}」を読み込みました`, 'ok');
  });

  delBtn.addEventListener('click', () => {
    const name = presetSelect.value;
    if (!name) return;
    if (!window.confirm(`プリセット「${name}」を削除しますか？`)) return;
    memoryState.presets = (memoryState.presets || []).filter((p) => p.name !== name);
    refreshPresetSelect();
    refreshPresetButtons();
    panel.setStatus(`プリセット「${name}」を削除しました`, 'info');
  });

  // ---- 続けて反映する反映先（同じ反映元・項目・設定で、ほかのアプリにも順番に反映する） ----
  const rolloutDetails = makeDetails('続けて反映する反映先（複数アプリへ展開）', { open: !!(memoryState.rolloutQueueText || '').trim() });
  rolloutDetails.details.classList.add('kus-rl-advanced', 'kus-rl-rollout');
  const rolloutHelp = document.createElement('p');
  rolloutHelp.className = 'kus-rl-quiet';
  rolloutHelp.textContent = '同じ反映元・項目・設定で、ほかのアプリにも順番に反映します。反映先ごとに差分確認と最終確認を行います。数字だけのIDは通常スペースのアプリ、ゲストスペースのアプリはURLで指定します。';
  const rolloutTa = makeTextarea({ rows: 4, code: true, placeholder: '1行に1件（改行・カンマ区切りも可）\n例: 203\nhttps://example.cybozu.com/k/guest/5/204/', value: memoryState.rolloutQueueText || '' });
  rolloutTa.classList.add('kus-rl-rollout__input');
  rolloutTa.setAttribute('aria-label', '続けて反映する反映先');
  const rolloutStatus = document.createElement('div');
  rolloutStatus.className = 'kus-rl-rollout__status';
  rolloutStatus.setAttribute('aria-live', 'polite');
  rolloutDetails.body.append(rolloutHelp, rolloutTa, rolloutStatus);
  rolloutTa.addEventListener('input', () => {
    saveState();
    refreshReviewCard();
  });
  /** 入力欄の内容。現在の反映先と重複する指定は除く。 */
  function currentRollout() {
    const appId = tgtApp.value.trim();
    return parseRolloutQueue(rolloutTa.value, appId ? [{ appId, guestId: tgtGuest.value.trim() }] : []);
  }
  /** 展開の記録を作った条件。反映先は含めない（反映先を切り替えても記録を続ける）。 */
  function rolloutConditionKey() {
    const lookup = parseLookupMapText(lookupTa.value);
    return JSON.stringify({
      source: sourceMode === 'json' ? ['json', sourceBundleToken, String(sourceBundleFromJson?.appId || '')] : ['app', srcApp.value.trim(), srcGuest.value.trim(), sourceEnvironment.value],
      // 反映項目は「失敗・未実行だけ選択」などの再実行で変わるため、展開の記録を引き継ぐ条件には含めない。
      preserve: preserve.checkbox.checked,
      lookup: lookup.ok ? Object.entries(lookup.value).sort() : lookupTa.value.trim()
    });
  }
  function recordRolloutResult(entry: RolloutLogEntry) {
    const key = rolloutConditionKey();
    const log = memoryState.rolloutKey === key ? memoryState.rolloutLog || [] : [];
    memoryState.rolloutKey = key;
    memoryState.rolloutLog = [...log, entry].slice(-100);
  }
  const rolloutCard = makeCard({ title: '続けて反映', soft: true });
  rolloutCard.card.classList.add('kus-rl-rollout-card');
  rolloutCard.card.style.display = 'none';
  const rolloutNote = document.createElement('div');
  rolloutNote.className = 'kus-rl-next kus-rl-next--info';
  rolloutNote.dataset.rolloutNote = 'next';
  const rolloutWarn = document.createElement('div');
  rolloutWarn.className = 'kus-rl-next kus-rl-next--warn';
  rolloutWarn.dataset.rolloutNote = 'warn';
  const rolloutError = document.createElement('div');
  rolloutError.className = 'kus-rl-next kus-rl-next--warn';
  rolloutError.dataset.rolloutNote = 'error';
  const rolloutNextBtn = makeButton('次の反映先の差分を確認', 'primary');
  rolloutNextBtn.dataset.rolloutNext = 'true';
  const rolloutNextRow = document.createElement('div');
  rolloutNextRow.className = 'kus-lp__btn-row';
  rolloutNextRow.appendChild(rolloutNextBtn);
  const rolloutLogBox = document.createElement('div');
  rolloutLogBox.dataset.rolloutLog = 'true';
  rolloutCard.body.append(rolloutNote, rolloutWarn, rolloutError, rolloutNextRow, rolloutLogBox);

  /** 入力欄の解析結果と、反映結果画面の「続けて反映」カードを現在の状態に合わせる。 */
  function renderRollout() {
    const text = rolloutTa.value.trim();
    const queue = currentRollout();
    rolloutStatus.classList.toggle('kus-rl-rollout__status--err', !queue.ok);
    if (!text) rolloutStatus.textContent = '';
    else if ('error' in queue) { rolloutStatus.textContent = queue.error; rolloutDetails.details.open = true; }
    else if (!queue.targets.length) rolloutStatus.textContent = '続けて反映する反映先はありません（現在の反映先は除いています）。';
    else {
      const shown = queue.targets.slice(0, 10).map(formatRolloutTarget).join('、');
      rolloutStatus.textContent = `${queue.targets.length} 件: ${shown}${queue.targets.length > 10 ? ` ほか ${queue.targets.length - 10} 件` : ''}`;
    }
    const last = memoryState.lastResult;
    const log = memoryState.rolloutLog || [];
    const next = queue.ok ? queue.targets[0] : undefined;
    const show = !!last && !restoreMode && (!queue.ok || !!next || log.length >= 2);
    rolloutCard.card.style.display = show ? 'block' : 'none';
    renderRolloutLog(rolloutLogBox, log);
    if (!show) return;
    rolloutNote.hidden = !next;
    if (next) {
      const rest = queue.ok ? queue.targets.length - 1 : 0;
      rolloutNote.replaceChildren();
      const head = document.createElement('strong');
      head.textContent = `次の反映先: ${formatRolloutTarget(next)}（${rest ? `残り ${rest} 件` : '最後の反映先'}）`;
      const body = document.createElement('span');
      body.textContent = '同じ反映元・項目・設定で差分を取得します。反映先ごとに差分確認と最終確認を行うため、ここでは書き込みません。';
      rolloutNote.append(head, body);
    }
    rolloutWarn.hidden = !(last && (last.ng > 0 || last.pending > 0));
    rolloutWarn.textContent = '直前の反映先に失敗・未実行の項目があります。結果を確認してから進んでください。';
    rolloutError.hidden = queue.ok;
    rolloutError.textContent = 'error' in queue ? `続けて反映する反映先を読み取れません。${queue.error}` : '';
    rolloutNextRow.hidden = !next && queue.ok;
    setButtonText(rolloutNextBtn, next ? `次の反映先 ${formatRolloutTarget(next)} の差分を確認` : '次の反映先の差分を確認');
    rolloutNextBtn.disabled = busy || !next;
  }
  rolloutNextBtn.addEventListener('click', () => { startNextRollout(); });

  /** 次の反映先へ切り替えて、差分確認へ進む（書き込みは確認後だけ）。 */
  function startNextRollout() {
    if (busy || restoreMode) return;
    const queue = currentRollout();
    if (!queue.ok || !queue.targets.length) return;
    const [next, ...rest] = queue.targets;
    const lookupState = parseLookupMapText(lookupTa.value);
    // 切り替える前に、次の反映先で差分を取得できるかを確かめる（できないなら今の結果と入力を残す）。
    const invalid = reflectConnectionError({ ...currentOptions(), targetAppId: next.appId, targetGuestId: next.guestId }) || lookupMapError(lookupState);
    if (invalid) {
      panel.setStatus(`次の反映先 ${formatRolloutTarget(next)} へ進めません。${invalid}`, 'warn');
      return;
    }
    tgtApp.value = next.appId;
    tgtGuest.value = next.guestId;
    rolloutTa.value = serializeRolloutQueue(rest);
    saveState();
    refreshSameConnBanner();
    refreshReviewCard();
    return startPreview(`次の反映先 ${formatRolloutTarget(next)} の差分を取得しました。内容を確認してから反映してください（まだ書き込んでいません）。`);
  }

  // ---- 実行前サマリ / 差分プレビュー ----
  const previewBtn = makeButton('差分プレビューを更新', 'primary');
  const changedOnlyBtn = makeButton('差分ありだけ選択', 'sub');

  const reviewCard = makeCard({ title: '反映予定を確認', soft: true });
  reviewCard.actions.style.flexWrap = 'wrap';
  reviewCard.actions.appendChild(changedOnlyBtn);
  reviewCard.actions.appendChild(previewBtn);
  const reviewBody = document.createElement('div');
  reviewBody.className = 'kus-rl-review';
  reviewCard.body.appendChild(reviewBody);
  panel.body.insertBefore(reviewCard.card, panel.status);

  const previewCard = makeCard({ title: '差分プレビュー結果' });
  previewCard.card.style.display = 'none';
  const previewTools = document.createElement('div');
  previewTools.className = 'kus-rl-preview-tools';
  const previewSearch = makeInput({ placeholder: 'セクション名や詳細で検索', width: 'wide' });
  previewSearch.setAttribute('aria-label', '差分を検索');
  previewSearch.type = 'search';
  const previewFilter = document.createElement('select');
  previewFilter.className = 'kus-lp__select';
  previewFilter.setAttribute('aria-label', '差分の状態で絞り込み');
  previewFilter.innerHTML = '<option value="all">すべての状態</option><option value="change">差分あり</option><option value="error">取得失敗</option><option value="same">一致</option>';
  previewFilter.addEventListener('change', () => rerenderPreviewCard());
  const previewActions = document.createElement('div');
  previewActions.className = 'kus-rl-preview-tools__actions';
  const previewKeepShownBtn = makeButton('表示中だけ選択', 'sub');
  const previewAddShownBtn = makeButton('表示中を追加', 'sub');
  const previewRemoveShownBtn = makeButton('表示中を除外', 'sub');
  const previewRiskyBtn = makeButton('高リスクだけ選択', 'sub');
  previewActions.appendChild(previewKeepShownBtn);
  previewActions.appendChild(previewAddShownBtn);
  previewActions.appendChild(previewRemoveShownBtn);
  previewActions.appendChild(previewRiskyBtn);
  previewTools.appendChild(makeRow([previewFilter, previewSearch]));
  const selectionDetails = makeDetails('表示中の項目をまとめて選択');
  selectionDetails.body.appendChild(previewActions);
  previewTools.appendChild(selectionDetails.details);
  const previewBody = document.createElement('div');
  previewCard.body.appendChild(previewTools);
  previewCard.body.appendChild(previewBody);
  panel.body.insertBefore(previewCard.card, panel.status);

  function saveState() {
    memoryState = {
      ...memoryState,
      sourceAppId: srcApp.value.trim(),
      sourceGuestId: srcGuest.value.trim(),
      targetAppId: tgtApp.value.trim(),
      targetGuestId: tgtGuest.value.trim(),
      sourcePreview: (sourceEnvironment.value === 'preview'),
      selectedScopes: collectSelectedScopes(),
      lookupMapText: lookupTa.value,
      rolloutQueueText: rolloutTa.value,
      preserveTargetOnly: preserve.checkbox.checked
    };
  }

  function currentOptions(scopes = collectSelectedScopes()) {
    return { sourceAppId: srcApp.value.trim(), sourceGuestId: srcGuest.value.trim(), sourcePreview: sourceEnvironment.value === 'preview', sourceBundle: sourceBundleFromJson,
      targetAppId: tgtApp.value.trim(), targetGuestId: tgtGuest.value.trim(), scopes, lookupMap: lookupMapValue(parseLookupMapText(lookupTa.value)), preserveTargetOnly: preserve.checkbox.checked };
  }

  function getPreviewState(scopes = collectSelectedScopes(), lookupState = parseLookupMapText(lookupTa.value)) {
    const preview = memoryState.lastPreview || null;
    const coveredScopes = preview?.scopes || scopes;
    const signature = lookupState.ok
      ? buildPreviewSignature({
        sourceAppId: srcApp.value.trim(),
        sourceGuestId: srcGuest.value.trim(),
        sourcePreview: (sourceEnvironment.value === 'preview'),
        sourceBundleToken,
        targetAppId: tgtApp.value.trim(),
        targetGuestId: tgtGuest.value.trim(),
        scopes: coveredScopes,
        lookupMap: lookupState.value,
        preserveTargetOnly: preserve.checkbox.checked
      })
      : '';
    const fresh = !!preview && !!signature && preview.signature === signature
      && scopes.every((key) => coveredScopes.includes(key))
      && (sourceMode !== 'json' || !!sourceBundleFromJson);
    return { scopes, lookupState, signature, preview, fresh };
  }

  function getExecutionPlan(scopes: string[], previewResult?: PreviewReflectResult | null): ExecutionPlan {
    const selectedSet = new Set(scopes);
    if (!previewResult) {
      return {
        effectiveScopes: [...selectedSet],
        changedScopes: [],
        sameScopes: [],
        errorScopes: [],
        skippedSameScopes: [],
        skippedErrorScopes: []
      };
    }

    const changedSet = new Set<string>();
    const sameSet = new Set<string>();
    const errorSet = new Set<string>();

    for (const entry of previewResult.entries) {
      if (!selectedSet.has(entry.sectionKey)) continue;
      if (entry.status === 'change') changedSet.add(entry.sectionKey);
      else if (entry.status === 'same') sameSet.add(entry.sectionKey);
      else errorSet.add(entry.sectionKey);
    }

    const effective = [...selectedSet].filter(key => changedSet.has(key));
    const skippedSameScopes = [...sameSet];
    const skippedErrorScopes: string[] = [];

    return {
      effectiveScopes: effective,
      changedScopes: [...changedSet],
      sameScopes: [...sameSet],
      errorScopes: [...errorSet],
      skippedSameScopes,
      skippedErrorScopes
    };
  }

  function rerenderPreviewCard() {
    const previewResult = memoryState.lastPreview?.result || null;
    if (!previewResult) {
      previewCard.card.style.display = 'none';
      [previewKeepShownBtn, previewAddShownBtn, previewRemoveShownBtn, previewRiskyBtn].forEach((btn) => { btn.disabled = true; });
      return;
    }

    const selectedScopes = collectSelectedScopes();
    const { fresh } = getPreviewState();
    const plan = fresh ? getExecutionPlan(selectedScopes, previewResult) : null;
    const filteredEntries = filterPreviewEntries(previewResult.entries, previewSearch.value.trim().toLowerCase(), previewFilter.value);
    const filteredScopeKeys = uniqueSectionKeys(filteredEntries);
    const currentSelected = new Set(selectedScopes);

    previewKeepShownBtn.disabled = filteredScopeKeys.length === 0;
    previewAddShownBtn.disabled = filteredScopeKeys.every((key) => currentSelected.has(key));
    previewRemoveShownBtn.disabled = filteredScopeKeys.every((key) => !currentSelected.has(key));
    previewRiskyBtn.disabled = !previewResult.entries.some((entry) => RISKY_SCOPE_KEYS.has(entry.sectionKey));

    renderPreviewResult(previewBody, previewResult, {
      selectedScopes,
      plan,
      searchKeyword: previewSearch.value.trim().toLowerCase(),
      statusFilter: previewFilter.value,
      fresh,
      onAdd: (sectionKey) => setSelectedScopes([...new Set([...collectSelectedScopes(), sectionKey])]),
      onRemove: (sectionKey) => setSelectedScopes(collectSelectedScopes().filter((key) => key !== sectionKey)),
      onShowAll: () => {
        previewSearch.value = '';
        previewFilter.value = 'all';
        rerenderPreviewCard();
      }
    });
    previewCard.card.style.display = 'block';
  }

  async function runPreview(scopes: string[], lookupMap: Record<string, string>, postApplyCheck = false) {
    memoryState.lastPreview = null;
    clearConfirmation();
    const options = { ...currentOptions(scopes), lookupMap };
    const signature = buildPreviewSignature({ ...options, sourceBundleToken });
    panel.setStatus('アプリ名と接続先を確認中…', 'busy');
    const identities = await resolveReflectAppsStandalone(options);
    const result = await previewReflectStandalone(options, (message) => panel.setStatus(message, 'busy'));
    memoryState.lastPreview = { signature, scopes: [...scopes], at: Date.now(), result, identities, ...(postApplyCheck ? { postApplyCheck: { scopeCount: scopes.length } } : {}) };
    rerenderPreviewCard(); refreshReviewCard(); showWorkflowStage('review');
    return result;
  }

  /** 反映直後の再確認結果（差分が残っていないか）。再確認以外、または条件が変わった後は null。 */
  function postApplySummary() {
    const { scopes, preview, fresh } = getPreviewState();
    if (!fresh || !preview?.postApplyCheck) return null;
    const entries = preview.result.entries.filter((entry) => scopes.includes(entry.sectionKey));
    return summarizePostApplyCheck({
      scopeCount: entries.length,
      changedLabels: entries.filter((entry) => entry.status === 'change').map((entry) => entry.label),
      errorLabels: entries.filter((entry) => !['change', 'same'].includes(entry.status)).map((entry) => entry.label)
    });
  }

  function selectionIssues(result: PreviewReflectResult | undefined, scopes: string[]): string[] {
    return result ? reflectSelectionBlockers(result.entries, scopes, result.sourceFieldCodes, result.targetFieldCodes) : [];
  }

  function refreshReviewCard() {
    if (restoreMode && (sourceMode !== 'json' || sourceBundleToken !== restoreMode.token || tgtApp.value.trim() !== restoreMode.targetAppId || tgtGuest.value.trim() !== restoreMode.targetGuestId)) restoreMode = null;
    // 反映元・項目・保持・参照先変換が変わったら、展開の記録は引き継がない（反映先の切り替えでは残す）。
    if (memoryState.rolloutLog?.length && memoryState.rolloutKey !== rolloutConditionKey()) { memoryState.rolloutLog = []; memoryState.rolloutKey = ''; }
    const staleResult = memoryState.lastResult;
    const currentSourceBundleToken = sourceMode === 'json' ? sourceBundleToken : '';
    if (staleResult && (
      !reflectResultMatchesOptions(staleResult.report, currentOptions(staleResult.report.scopes))
      || staleResult.sourceBundleToken !== currentSourceBundleToken
    )) {
      memoryState.lastResult = null;
      if (memoryState.lastPreview?.postApplyCheck) {
        memoryState.lastPreview = { ...memoryState.lastPreview, postApplyCheck: undefined };
      }
      // 結果カードと同じ実行に属するログ・成功ステータスも捨てる。対象を
      // 変更したあとに旧対象の成功を現在の対象へ誤って帰属させない。
      logCard.card.style.display = 'none';
      logPre.style.display = 'none';
      logPre.textContent = '';
      renderLastResult();
      panel.setStatus('対象が変わったため、まだ反映していません。現在の条件で差分を再取得してから反映してください。', 'info');
    }
    const { scopes, lookupState, preview, fresh } = getPreviewState();
    const invalid = reflectConnectionError(currentOptions());
    const result = preview?.result;
    const plan = getExecutionPlan(scopes, fresh ? result : null);
    const blockers = fresh ? selectionIssues(result, scopes) : [];
    const canCompare = !invalid && !!scopes.length && lookupState.ok && (sourceMode !== 'json' || !!sourceBundleFromJson);
    previewBtn.disabled = busy || !canCompare;
    changedOnlyBtn.disabled = busy || !fresh || !result?.changedSections;
    confirmBtn.disabled = busy || !canCompare || !fresh || !plan.effectiveScopes.length || !!blockers.length;
    const token = confirmationToken();
    if (confirmedToken && confirmedToken !== token) clearConfirmation();
    runBtn.disabled = busy || !confirmationReady();
    setButtonText(runBtn, `確認した ${plan.effectiveScopes.length} 項目をプレビューへ反映`);
    let message = invalid || lookupMapError(lookupState) || (!scopes.length ? '反映する項目を選んでください。' : '変更前と変更後を確認し、最終確認に進んでください。');
    if (!preview) message = '対象を指定して差分を取得してください。';
    else if (!fresh) message = '条件が変わりました。差分を再取得してください。';
    else if (blockers.length) message = '確認できない項目が選択されています。問題を解決して再取得するか、対象から外してください。';
    else if (!plan.effectiveScopes.length) message = '書き込みが必要な項目はありません。反映先だけの項目を保持した場合も書き込み不要です。';
    const postApply = postApplySummary();
    if (postApply && !blockers.length) message = postApply.message;
    reviewBody.innerHTML = '';
    if (preview?.identities && fresh) renderReflectRoute(reviewBody, preview.identities, sourceMode === 'json' ? '設定JSON' : sourceEnvironment.value === 'preview' ? 'プレビュー' : '本番', restoreRouteOptions(preview.identities));
    if (fresh && restoreMode) appendRestoreNotice(reviewBody);
    if (fresh && result) appendTargetPendingNotice(reviewBody, result.targetPending);
    const info = document.createElement('div'); info.className = 'kus-rl-next ' + (blockers.length ? 'kus-rl-next--warn' : postApply ? `kus-rl-next--${postApply.tone}` : 'kus-rl-next--info');
    info.textContent = message; reviewBody.appendChild(info);
    const summary = document.createElement('p'); summary.className = 'kus-rl-quiet';
    summary.textContent = fresh ? `反映予定 ${plan.effectiveScopes.length} 項目 / 変更なし ${plan.sameScopes.length} 項目 / 確認が必要 ${plan.errorScopes.length} 項目 · ${formatPreviewStamp(preview!.at)}` : 'この段階では書き込みを行いません。';
    reviewBody.appendChild(summary);
    if (blockers.length) {
      const list = document.createElement('ul'); list.className = 'kus-rl-issues';
      for (const message of blockers) { const item = document.createElement('li'); item.textContent = message; list.appendChild(item); }
      reviewBody.appendChild(list);
      // フィールド不足は、メッセージの文字列ではなく requiredFields と取得済みフィールドコードから構造的に判定する。
      const missing = result ? findMissingFieldReferences(result.entries, scopes, result.sourceFieldCodes, result.targetFieldCodes) : [];
      if (canResolveByIncludingFieldSettings(missing, scopes)) {
        const fix = document.createElement('div'); fix.className = 'kus-rl-fix';
        const fixBtn = makeButton('フィールド設定も反映対象に含めて再取得', 'sub');
        fixBtn.dataset.reflectFix = 'include-field-settings';
        fixBtn.disabled = busy;
        fixBtn.addEventListener('click', () => { includeFieldSettingsAndRefetch(); });
        const candidates = missing.filter((item) => item.inSource !== false);
        const codes = [...new Set(candidates.map((item) => item.code))];
        const codeList = `${codes.slice(0, 5).join('、')}${codes.length > 5 ? ' ほか' : ''}`;
        const fixNote = document.createElement('span'); fixNote.className = 'kus-rl-fix__note';
        fixNote.textContent = candidates.every((item) => item.inSource)
          ? `反映元にある ${codes.length} 件のフィールド（${codeList}）を、フィールド設定の反映で追加します。差分を取得し直してから確認してください。`
          : `不足しているフィールド（${codeList}）が反映元にあれば、フィールド設定の反映で追加できます。反映元にも無い場合は、再取得後も停止します。`;
        fix.append(fixBtn, fixNote); reviewBody.appendChild(fix);
      }
    }
    exportPlanBtn.disabled = busy || !fresh;
    exportPlanMdBtn.disabled = busy || !fresh;
    copyPlanMdBtn.disabled = busy || !fresh;
    renderRollout();
    rerenderPreviewCard(); refreshWorkflow();
  }

  previewSearch.addEventListener('input', () => {
    rerenderPreviewCard();
  });

  previewKeepShownBtn.addEventListener('click', () => {
    const previewResult = memoryState.lastPreview?.result || null;
    if (!previewResult) {
      panel.setStatus('先に差分プレビューを取得してください', 'warn');
      return;
    }
    const scopeKeys = uniqueSectionKeys(filterPreviewEntries(previewResult.entries, previewSearch.value.trim().toLowerCase(), previewFilter.value));
    setSelectedScopes(scopeKeys);
    panel.setStatus(`表示中の ${scopeKeys.length} セクションだけを選択しました`, scopeKeys.length ? 'ok' : 'info');
  });

  previewAddShownBtn.addEventListener('click', () => {
    const previewResult = memoryState.lastPreview?.result || null;
    if (!previewResult) {
      panel.setStatus('先に差分プレビューを取得してください', 'warn');
      return;
    }
    const scopeKeys = uniqueSectionKeys(filterPreviewEntries(previewResult.entries, previewSearch.value.trim().toLowerCase(), previewFilter.value));
    setSelectedScopes([...new Set([...collectSelectedScopes(), ...scopeKeys])]);
    panel.setStatus(`表示中の ${scopeKeys.length} セクションを追加しました`, scopeKeys.length ? 'ok' : 'info');
  });

  previewRemoveShownBtn.addEventListener('click', () => {
    const previewResult = memoryState.lastPreview?.result || null;
    if (!previewResult) {
      panel.setStatus('先に差分プレビューを取得してください', 'warn');
      return;
    }
    const scopeKeys = new Set(uniqueSectionKeys(filterPreviewEntries(previewResult.entries, previewSearch.value.trim().toLowerCase(), previewFilter.value)));
    setSelectedScopes(collectSelectedScopes().filter((key) => !scopeKeys.has(key)));
    panel.setStatus(`表示中の ${scopeKeys.size} セクションを選択から外しました`, scopeKeys.size ? 'ok' : 'info');
  });

  previewRiskyBtn.addEventListener('click', () => {
    const previewResult = memoryState.lastPreview?.result || null;
    if (!previewResult) {
      panel.setStatus('先に差分プレビューを取得してください', 'warn');
      return;
    }
    const riskyScopes = uniqueSectionKeys(previewResult.entries.filter((entry) => RISKY_SCOPE_KEYS.has(entry.sectionKey)));
    setSelectedScopes(riskyScopes);
    panel.setStatus(`高リスク ${riskyScopes.length} セクションだけを選択しました`, riskyScopes.length ? 'warn' : 'info');
  });

  function startPreview(okMessage?: string) {
    if (busy || previewBtn.disabled) return;
    const { scopes, lookupState } = getPreviewState();
    const lookupError = lookupMapError(lookupState);
    const lookupMap = lookupMapValue(lookupState);
    if (!scopes.length) {
      panel.setStatus('対象セクションを選択してください', 'warn');
      return;
    }
    if (lookupError) {
      panel.setStatus(lookupError, 'warn');
      return;
    }
    return liteRun(panel, '差分プレビューを取得中…', async () => {
      await runPreview(scopes, lookupMap);
    }, okMessage || `差分プレビュー完了（${scopes.length}セクションを比較）`);
  }
  previewBtn.addEventListener('click', () => { startPreview(); });

  /** フィールド設定を反映対象に加えて、同じ条件で差分を取得し直す（フィールド不足による停止の解消用）。 */
  function includeFieldSettingsAndRefetch() {
    if (busy) return;
    const chip = chips.find((c) => c.checkbox.value === 'fieldSettings');
    if (!chip) return;
    chip.checkbox.checked = true;
    refreshScopeCount();
    saveState();
    refreshReviewCard();
    return startPreview('フィールド設定も反映対象に含めて差分を再取得しました。');
  }

  changedOnlyBtn.addEventListener('click', () => {
    const { preview, fresh } = getPreviewState();
    if (!fresh || !preview?.result) {
      panel.setStatus('先に最新の差分プレビューを取得してください', 'warn');
      return;
    }
    const changedScopes = preview.result.entries
      .filter((entry) => entry.status === 'change')
      .map((entry) => entry.sectionKey);
    setSelectedScopes(changedScopes);
    panel.setStatus(`差分あり ${changedScopes.length} セクションだけを選択しました`, changedScopes.length ? 'ok' : 'info');
  });

  // ---- 最終確認：確認済みの条件だけを実行可能にする ----
  const confirmBtn = makeButton('最終確認に進む', 'primary');
  const confirmCard = makeCard({ title: 'この内容をプレビューへ反映します' });
  const confirmBody = document.createElement('div'); confirmCard.body.appendChild(confirmBody);
  const acknowledged = makeCheck({ label: '反映先と変更・削除の内容を確認しました', checked: false });
  acknowledged.checkbox.setAttribute('aria-label', '反映内容の確認');
  const targetCheck = makeInput({ placeholder: '反映先アプリIDを入力', width: 'wide' });
  targetCheck.setAttribute('aria-label', '確認用の反映先アプリID'); targetCheck.setAttribute('data-lp-no-submit', '');
  targetCheck.inputMode = 'numeric'; targetCheck.autocomplete = 'off';
  const targetCheckRow = makeRow([targetCheck], { label: '反映先IDの再確認' });
  const confirmStatus = document.createElement('p'); confirmStatus.className = 'kus-rl-quiet'; confirmStatus.setAttribute('aria-live', 'polite');
  confirmCard.body.append(acknowledged.label, targetCheckRow, confirmStatus);
  let confirmedToken = '';
  function confirmationToken() {
    const state = getPreviewState();
    return state.fresh ? JSON.stringify([state.preview!.signature, state.preview!.at, [...state.scopes].sort()]) : '';
  }
  function clearConfirmation() {
    confirmedToken = ''; acknowledged.checkbox.checked = false; targetCheck.value = '';
    confirmStatus.textContent = '反映先と変更内容を確認してチェックを入れてください。';
  }
  function highImpactReasons() {
    const { preview, scopes } = getPreviewState();
    const entries = preview?.result.entries.filter(entry => scopes.includes(entry.sectionKey) && entry.status === 'change') || [];
    const reasons: string[] = [];
    const removals = entries.reduce((sum, entry) => sum + entry.removalCount, 0);
    if (removals) reasons.push(`削除・置換される設定が ${removals} 件あります`);
    if (entries.some(entry => RISKY_SCOPE_KEYS.has(entry.sectionKey))) reasons.push('権限・通知・プロセス管理の変更を含みます');
    if (preview?.result.targetPending?.state === 'pending') reasons.push(TARGET_PENDING_REASON);
    if (!sourceBundleFromJson && srcApp.value.trim() === tgtApp.value.trim() && srcGuest.value.trim() === tgtGuest.value.trim()) reasons.push('同じアプリの本番設定でプレビューを更新します');
    return reasons;
  }
  function confirmationReady() {
    const state = getPreviewState();
    return !!confirmedToken && confirmedToken === confirmationToken() && acknowledged.checkbox.checked
      && !selectionIssues(state.preview?.result, state.scopes).length
      && (!highImpactReasons().length || targetCheck.value.trim() === tgtApp.value.trim());
  }
  function openConfirmation() {
    if (busy || confirmBtn.disabled) return;
    clearConfirmation(); confirmedToken = confirmationToken();
    const state = getPreviewState(); if (!confirmedToken || !state.preview) return;
    confirmBody.innerHTML = '';
    renderReflectRoute(confirmBody, state.preview.identities, sourceMode === 'json' ? '設定JSON' : sourceEnvironment.value === 'preview' ? 'プレビュー' : '本番', restoreRouteOptions(state.preview.identities));
    const entries = state.preview.result.entries.filter(entry => state.scopes.includes(entry.sectionKey) && entry.status === 'change');
    const summary = document.createElement('p'); summary.textContent = `反映する項目（${entries.length}）：${entries.map(entry => entry.label).join('、')}`; confirmBody.appendChild(summary);
    if (restoreMode) appendRestoreNotice(confirmBody);
    appendTargetPendingNotice(confirmBody, state.preview.result.targetPending);
    const reasons = highImpactReasons(); targetCheckRow.hidden = !reasons.length;
    if (reasons.length) { const note = document.createElement('p'); note.className = 'kus-rl-next kus-rl-next--warn'; note.textContent = reasons.join('。') + '。反映先IDを入力して確認してください。'; confirmBody.appendChild(note); }
    const uploadLabels = collectUploadLabels(entries);
    if (uploadLabels.length) {
      const box = document.createElement('div'); box.className = 'kus-rl-uploads'; box.dataset.reflectUploads = 'true';
      const title = document.createElement('strong'); title.textContent = `反映先へアップロードするファイル（${uploadLabels.length} 件）`;
      const list = document.createElement('ul'); for (const label of uploadLabels) { const item = document.createElement('li'); item.textContent = label; list.appendChild(item); }
      box.append(title, list); confirmBody.appendChild(box);
    }
    // 削除される設定は、利用者が読める要約（項目名＋内容）で示す。削除と、一覧の表示フィールドの削除のように「変更」の中で削除する内容を拾う。
    // 要約が無い、または削除を含む内容を要約から拾えない項目は、従来の表示（設定値の抜粋）で補う（削除を見落とさないため）。
    const removals: string[] = [];
    for (const entry of entries) {
      const removedItems = (entry.items || []).filter(item => item.kind === '削除' || (item.kind === '変更' && item.details.some(detail => detail.includes('削除'))));
      if (removedItems.length || !entry.removalCount) removals.push(...removedItems.map(item => describeRemovedItem(entry.label, item)));
      else removals.push(...entry.changes.filter(change => change.kind === '削除').map(change => `${entry.label} / ${change.path}：${change.before.slice(0, 180)}${change.before.length > 180 ? '…' : ''}`));
    }
    if (removals.length) {
      const heading = document.createElement('p'); heading.className = 'kus-rl-confirm-heading'; heading.textContent = `削除・置換される設定（${removals.length} 件）`; confirmBody.appendChild(heading);
      const list = document.createElement('ul'); list.className = 'kus-rl-issues'; list.dataset.reflectRemovals = 'true';
      for (const text of removals.slice(0, 30)) { const item = document.createElement('li'); item.textContent = text; list.appendChild(item); }
      if (removals.length > 30) { const item = document.createElement('li'); item.textContent = `ほか ${removals.length - 30} 件。下の各項目の変更の要約・設定値の内訳、または反映計画JSONで全件を確認してください。`; list.appendChild(item); }
      confirmBody.appendChild(list);
    }
    const policy = document.createElement('p'); policy.className = 'kus-rl-quiet';
    policy.textContent = '反映前の設定JSONを自動保存します。実行直前に設定を再取得し、確認後の変更があれば中止します。途中エラーでは中断します。複数項目の一括取消はできません。本番公開はアプリ設定画面で行います。'; confirmBody.appendChild(policy);
    // 反映する項目ごとに、変更の要約（削除・変更・追加・保持）と設定値の内訳を示す。
    for (const entry of entries) {
      const block = document.createElement('section'); block.className = 'kus-rl-confirm-entry'; block.dataset.reflectConfirmEntry = entry.sectionKey;
      const heading = document.createElement('h3'); heading.textContent = entry.label; block.appendChild(heading);
      appendReflectChanges(block, entry, { uploads: false });
      confirmBody.appendChild(block);
    }
    showWorkflowStage('confirm'); refreshReviewCard();
  }
  confirmBtn.addEventListener('click', openConfirmation);
  for (const control of [acknowledged.checkbox, targetCheck]) control.addEventListener('input', () => {
    runBtn.disabled = busy || !confirmationReady();
    confirmStatus.textContent = confirmationReady() ? '確認が完了しました。下の反映ボタンから実行できます。' : '確認チェックと、表示されている場合は反映先IDの入力が必要です。';
  });
  const exportPlanBtn = makeButton('反映計画JSONを保存', 'sub'); reviewCard.actions.appendChild(exportPlanBtn);
  exportPlanBtn.addEventListener('click', () => {
    const state = getPreviewState(); if (!state.fresh || !state.preview) return;
    const payload = { generatedAt: new Date().toISOString(), identities: state.preview.identities, sourceEnvironment: sourceMode === 'json' ? 'json' : sourceEnvironment.value,
      preserveTargetOnly: preserve.checkbox.checked, scopes: state.scopes, targetPending: state.preview.result.targetPending, entries: state.preview.result.entries.filter(entry => state.scopes.includes(entry.sectionKey)), baseline: state.preview.result.baseline };
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
    const appLabel = buildAppFilenameLabel(tgtApp.value.trim(), state.preview.identities?.target?.name || '');
    const link = document.createElement('a'); link.href = url; link.download = buildExportFilename('プレビュー反映計画', 'json', { appLabel }); link.click(); setTimeout(() => URL.revokeObjectURL(url), 5000);
  });
  // 承認依頼や作業記録に貼れるよう、変更の要約を中心にした Markdown でも出力する（設定値の生JSONは含めない）。
  const exportPlanMdBtn = makeButton('計画をMarkdownで保存', 'sub');
  exportPlanMdBtn.title = '選択中の項目の計画（経路・変更の要約・未公開の変更）をMarkdownで保存します';
  const copyPlanMdBtn = makeButton('Markdownをコピー', 'sub');
  copyPlanMdBtn.title = '選択中の項目の計画をMarkdownとしてクリップボードへコピーします';
  reviewCard.actions.append(exportPlanMdBtn, copyPlanMdBtn);
  function buildPlanMarkdown() {
    const state = getPreviewState();
    if (!state.fresh || !state.preview) return null;
    const identities = reportIdentities(state.preview.identities);
    const text = buildReflectReportMarkdown({
      generatedAt: new Date().toISOString(),
      source: identities.source,
      target: identities.target,
      sourceEnvironment: sourceMode === 'json' ? 'json' : sourceEnvironment.value === 'preview' ? 'preview' : 'production',
      preserveTargetOnly: preserve.checkbox.checked,
      lookupMap: lookupMapValue(state.lookupState),
      entries: state.preview.result.entries.filter(entry => state.scopes.includes(entry.sectionKey)),
      targetPending: state.preview.result.targetPending
    });
    return { text, appLabel: buildAppFilenameLabel(tgtApp.value.trim(), identities.target.name) };
  }
  async function copyMarkdown(text: string | undefined, what: string) {
    if (!text) { panel.setStatus(`${what}を作成できません。最新の差分を取得してください。`, 'warn'); return; }
    const copied = await copyTextToClipboard(text);
    panel.setStatus(copied ? `${what}のMarkdownをコピーしました。` : `コピーできませんでした。ブラウザの権限を確認するか、Markdownで保存してください。`, copied ? 'ok' : 'warn');
  }
  exportPlanMdBtn.addEventListener('click', () => {
    const built = buildPlanMarkdown();
    if (!built) { panel.setStatus('反映計画を作成できません。最新の差分を取得してください。', 'warn'); return; }
    const filename = buildExportFilename('プレビュー反映計画', 'md', { appLabel: built.appLabel });
    downloadText(filename, built.text, 'text/markdown');
    panel.setStatus(`反映計画を ${filename} に保存しました。`, 'ok');
  });
  copyPlanMdBtn.addEventListener('click', () => { void copyMarkdown(buildPlanMarkdown()?.text, '反映計画'); });

  // ---- 実行 ----
  const runBtn = makeButton('プレビュー反映を実行', 'run');
  runBtn.classList.add('kus-lp__btn--danger');
  runBtn.classList.remove('kus-lp__btn--run');
  runBtn.style.cssText = '';
  runBtn.classList.add('kus-lp__btn--danger');
  runBtn.style.padding = '11px 16px';
  runBtn.style.fontSize = '13px';
  runBtn.style.fontWeight = '700';
  panel.body.insertBefore(runBtn, panel.status);

  // 反映ログ表示
  const logCard = makeCard({ title: '実行ログ', soft: true });
  const logPre = document.createElement('pre');
  logPre.style.cssText = 'margin:0;padding:8px 10px;font:11.5px/1.5 ui-monospace,monospace;background:#0f172a;color:#e2e8f0;border-radius:8px;max-height:240px;overflow:auto;white-space:pre-wrap;display:none';
  logCard.body.appendChild(logPre);
  logCard.card.style.display = 'none';
  panel.body.insertBefore(logCard.card, panel.status);

  // 反映中の進捗（実行予定の全項目を並べ、通知に合わせて状態を更新する。完了後は下の結果一覧に置き換える）
  const progressCard = makeCard({ title: '反映の進捗', soft: true });
  progressCard.card.classList.add('kus-rl-progress');
  progressCard.card.style.display = 'none';
  const progressHost = document.createElement('div');
  progressCard.body.appendChild(progressHost);
  let progressView: ApplyProgressView | null = null;
  panel.body.insertBefore(progressCard.card, panel.status);

  // 直近結果カード
  const lastResultCard = makeCard({ title: '直近の実行結果', soft: true });
  const lastResultBody = document.createElement('div');
  lastResultBody.className = 'kus-lp__small';
  lastResultCard.body.appendChild(lastResultBody);
  // セクション別の結果と、反映後の取り消し方の案内
  const lastResultSections = document.createElement('div');
  lastResultCard.body.appendChild(lastResultSections);
  const undoNote = document.createElement('p');
  undoNote.className = 'kus-rl-next kus-rl-next--info kus-rl-undo';
  undoNote.textContent = describeUndoGuidance(null).text;
  lastResultCard.body.appendChild(undoNote);
  const lastResultActions = document.createElement('div');
  lastResultActions.className = 'kus-lp__btn-row';
  lastResultActions.style.marginTop = '8px';
  const retryFailedBtn = makeButton('失敗・未実行だけ選択', 'sub');
  retryFailedBtn.title = '失敗または中断で未実行のセクションだけを反映対象に選び直します';
  const openTargetBtn = makeButton('反映先の設定画面を開く', 'sub');
  openTargetBtn.title = '反映先アプリの設定画面を新しいタブで開きます（運用環境への反映はそこから実行できます）';
  const restoreBtn = makeButton('バックアップから戻す（差分を確認）', 'sub');
  restoreBtn.title = '反映前に自動保存したバックアップを反映元にして、反映先との差分を確認します（この操作では書き込みません）';
  restoreBtn.dataset.reflectRestore = 'backup';
  const exportResultBtn = makeButton('実行結果JSONを保存', 'sub');
  exportResultBtn.title = '実行時の対象、セクション別結果、ログを監査用JSONとして保存します';
  const verifyResultBtn = makeButton('反映後の差分を再確認', 'primary');
  verifyResultBtn.title = '反映した項目を同じ条件で再取得し、反映先が反映元と一致したかを確認します（書き込みは行いません）';
  lastResultActions.appendChild(verifyResultBtn);
  lastResultActions.appendChild(retryFailedBtn);
  lastResultActions.appendChild(restoreBtn);
  lastResultActions.appendChild(exportResultBtn);
  const exportResultMdBtn = makeButton('記録をMarkdownで保存', 'sub');
  exportResultMdBtn.title = '実行した項目の計画と結果（成功・失敗）をMarkdownの反映記録として保存します';
  const copyResultMdBtn = makeButton('Markdownをコピー', 'sub');
  copyResultMdBtn.title = '反映記録をMarkdownとしてクリップボードへコピーします';
  lastResultActions.append(exportResultMdBtn, copyResultMdBtn);
  lastResultActions.appendChild(openTargetBtn);

  verifyResultBtn.addEventListener('click', () => {
    if (busy) return;
    const scopes = memoryState.lastResult?.report.scopes || [];
    if (!scopes.length) return;
    const lookupState = parseLookupMapText(lookupTa.value);
    const invalid = reflectConnectionError(currentOptions(scopes)) || lookupMapError(lookupState) || (sourceMode === 'json' && !sourceBundleFromJson ? '反映元の設定JSONを読み込んでください。' : '');
    if (invalid) {
      panel.setStatus(`再確認できません。${invalid}`, 'warn');
      return;
    }
    setSelectedScopes(scopes);
    return liteRun(panel, '反映後の差分を再取得中…', async () => {
      await runPreview(scopes, lookupMapValue(lookupState), true);
      const summary = postApplySummary();
      if (summary) panel.setStatus(summary.message, summary.tone);
    });
  });
  lastResultCard.body.appendChild(lastResultActions);
  lastResultCard.card.style.display = 'none';
  panel.body.insertBefore(lastResultCard.card, panel.status);

  /**
   * 反映前に自動保存したバックアップを反映元にして、差分確認へ進む（書き込みは行わない）。
   * 反映で追加された一覧などを消せるよう「反映先だけの一覧・グラフ・アクションを保持する」はOFFにする。
   */
  function startRestoreFromBackup() {
    const last = memoryState.lastResult;
    if (busy || !last?.backup) return;
    let bundles: any[];
    try {
      bundles = pickAllSettingsBundles(last.backup, 'source', true);
    } catch (error: any) {
      panel.setStatus(`バックアップを読み込めません。${error?.message || String(error)}`, 'err');
      return;
    }
    const bundle = bundles[0];
    const scopes = last.report.scopes.filter((key) => REFLECT_SECTION_KEYS.includes(key));
    if (!bundle?.appId || !scopes.length) {
      panel.setStatus('バックアップに戻せる内容が見つかりません。', 'err');
      return;
    }
    const targetAppId = last.appId;
    const targetGuestId = last.guestId;
    // 反映元を「設定JSONから取得」に切り替え、手でファイルを選んだときと同じ状態（読み込み済みJSON・鮮度トークン・表示）にする。
    sourceMode = 'json';
    sourceModeSelect.value = 'json';
    sourceJsonBundles = bundles;
    sourceJsonAppSelect.replaceChildren(...bundles.map((item, index) => {
      const option = document.createElement('option');
      option.value = String(index);
      const appName = extractAppNameFromBundle(item);
      option.textContent = `アプリ #${item.appId}${appName ? ` (${appName})` : ''}`;
      return option;
    }));
    sourceBundleFromJson = bundle;
    sourceBundleToken = `backup:${last.at}:${Date.now()}`;
    sourceBundleFileName = `反映前バックアップ（${formatReflectDateTime(last.at)}）`;
    srcJsonFile.value = '';
    srcApp.value = String(bundle.appId);
    srcGuest.value = '';
    tgtApp.value = targetAppId;
    tgtGuest.value = targetGuestId;
    preserve.checkbox.checked = false;
    lookupTa.value = '';
    refreshLookupStatus();
    const restoreScopes = new Set(scopes);
    chips.forEach((chip) => { chip.checkbox.checked = restoreScopes.has(chip.checkbox.value); });
    refreshScopeCount();
    restoreMode = { token: sourceBundleToken, targetAppId, targetGuestId, at: last.at };
    saveState();
    refreshSrcJsonNote();
    refreshSameConnBanner();
    refreshReviewCard();
    return startPreview('バックアップから戻す内容の差分を取得しました。反映前の状態に戻る内容を確認してください。');
  }
  restoreBtn.addEventListener('click', () => { startRestoreFromBackup(); });
  /** バックアップから戻しているときの反映元の表示（反映先の名前とバックアップの日時から作る）。 */
  function restoreSourceLabel(targetName: string) {
    return `反映前のバックアップ（${[targetName, restoreMode ? formatReflectDateTime(restoreMode.at) : ''].filter(Boolean).join('・')}）`;
  }
  function restoreRouteOptions(identities: ReflectIdentities) {
    return restoreMode ? { sourceLabel: restoreSourceLabel(identities.target.name) } : {};
  }
  /** Markdown や反映記録へ書く反映元・反映先。バックアップから戻しているときは反映元をバックアップとして示す。 */
  function reportIdentities(identities: ReflectIdentities): ReflectIdentities {
    return restoreMode ? { ...identities, source: { ...identities.source, name: restoreSourceLabel(identities.target.name) } } : identities;
  }

  retryFailedBtn.addEventListener('click', () => {
    const retryScopes = memoryState.lastResult?.retryScopes || [];
    if (!retryScopes.length) return;
    setSelectedScopes(retryScopes);
    showWorkflowStage('setup');
    panel.setStatus(`失敗・未実行の ${retryScopes.length} セクションを選択しました。差分プレビューで確認してから再実行してください。`, 'info');
    scrollWithinCanvas(cardScope.card);
  });

  openTargetBtn.addEventListener('click', () => {
    const last = memoryState.lastResult;
    if (!last?.appId) return;
    const base = last.guestId ? `/k/guest/${encodeURIComponent(last.guestId)}` : '/k';
    const url = `${window.location.origin}${base}/admin/app/flow?app=${encodeURIComponent(last.appId)}`;
    window.open(url, '_blank', 'noopener');
    panel.setStatus(`反映先アプリ #${last.appId} の設定画面を開きました`, 'info');
  });

  exportResultBtn.addEventListener('click', () => {
    const last = memoryState.lastResult;
    if (!last) return;
    const payload = {
      schemaVersion: 1,
      executedAt: new Date(last.at).toISOString(),
      summary: { ok: last.ok, ng: last.ng, pending: last.pending },
      ...last.report
    };
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = buildExportFilename('プレビュー反映結果', 'json', { appLabel: `App${last.appId}` });
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  });

  function buildResultMarkdown() {
    const last = memoryState.lastResult;
    if (!last?.planned) return null;
    const { identities, entries } = last.planned;
    const text = buildReflectReportMarkdown({
      generatedAt: new Date().toISOString(),
      source: identities.source,
      target: identities.target,
      sourceEnvironment: last.report.source.environment,
      preserveTargetOnly: last.report.preserveTargetOnly,
      lookupMap: last.report.lookupMap,
      entries,
      targetPending: last.report.targetPending,
      outcome: { executedAt: new Date(last.at).toISOString(), sections: normalizeApplySections(last.report.sections) }
    });
    return { text, appLabel: buildAppFilenameLabel(last.appId, identities.target.name) };
  }
  exportResultMdBtn.addEventListener('click', () => {
    const built = buildResultMarkdown();
    if (!built) { panel.setStatus('反映記録を作成できません。', 'warn'); return; }
    const filename = buildExportFilename('プレビュー反映記録', 'md', { appLabel: built.appLabel });
    downloadText(filename, built.text, 'text/markdown');
    panel.setStatus(`反映記録を ${filename} に保存しました。`, 'ok');
  });
  copyResultMdBtn.addEventListener('click', () => { void copyMarkdown(buildResultMarkdown()?.text, '反映記録'); });

  function renderLastResult() {
    const last = memoryState.lastResult;
    if (!last) {
      lastResultCard.card.style.display = 'none';
      return;
    }
    const stamp = formatReflectDateTime(last.at);
    const hasIssue = last.ng > 0 || last.pending > 0;
    const tone = hasIssue ? 'color:#9a3412' : 'color:#065f46';
    const failedSummary = last.failedLabels.length
      ? `<div>失敗: ${escapeHtml(last.failedLabels.slice(0, 5).join(' / '))}${last.failedLabels.length > 5 ? ` ほか ${last.failedLabels.length - 5} 件` : ''}</div>`
      : '';
    lastResultBody.innerHTML = `<div style="${tone};font-weight:600">${hasIssue ? '⚠ 一部エラー' : '✓ 全成功'}</div>`
      + `<div>反映先 #${escapeHtml(last.appId || '-')} / 成功 ${last.ok} / 失敗 ${last.ng}${last.pending ? ` / 未実行 ${last.pending}` : ''}</div>`
      + failedSummary
      + `<div>${stamp}</div>`
      + (hasIssue
        ? '<div style="margin-top:4px">「失敗・未実行だけ選択」で対象を絞って再実行できます。</div>'
        : '<div style="margin-top:4px">反映先はプレビューです。運用環境への反映（デプロイ）は反映先の設定画面から実行してください。</div>');
    renderApplySectionResults(lastResultSections, last.report.sections);
    // 反映前に反映先プレビューへ未公開の変更があったかで、取り消しの案内を出し分ける。
    const guidance = describeUndoGuidance(last.report.targetPending);
    undoNote.textContent = guidance.text;
    undoNote.className = `kus-rl-next kus-rl-next--${guidance.tone} kus-rl-undo`;
    undoNote.dataset.undoState = last.report.targetPending?.state || 'unknown';
    openTargetBtn.classList.toggle('kus-lp__btn--primary', guidance.openSettings);
    openTargetBtn.classList.toggle('kus-lp__btn--sub', !guidance.openSettings);
    restoreBtn.style.display = last.backup ? '' : 'none';
    retryFailedBtn.style.display = last.retryScopes.length ? '' : 'none';
    verifyResultBtn.style.display = last.report.scopes.length ? '' : 'none';
    exportResultBtn.style.display = '';
    exportResultMdBtn.style.display = last.planned ? '' : 'none';
    copyResultMdBtn.style.display = last.planned ? '' : 'none';
    openTargetBtn.style.display = last.appId ? '' : 'none';
    lastResultCard.card.style.display = 'block';
  }
  renderLastResult();

  runBtn.addEventListener('click', async () => {
    if (busy || runBtn.disabled || activeStage !== 'confirm' || !confirmationReady()) return;
    const { scopes, lookupState } = getPreviewState();
    const lookupError = lookupMapError(lookupState);
    const lookupMap = lookupMapValue(lookupState);
    if (!scopes.length) {
      panel.setStatus('反映するセクションを選択してください', 'warn');
      return;
    }
    if (lookupError) {
      panel.setStatus(lookupError, 'warn');
      return;
    }
    saveState();

    const outcome = await liteRun(panel, 'プレビュー反映 実行中…', async () => {
      let previewState = getPreviewState(scopes, lookupState);
      let previewResult = previewState.fresh ? previewState.preview?.result || null : null;
      if (!previewResult) {
        panel.setStatus('差分を再取得して、変更内容を確認してください。', 'warn');
        return { cancelled: true };
      }
      const plan = getExecutionPlan(scopes, previewResult);

      if (!plan.effectiveScopes.length) {
        if (!previewResult.changedSections) {
          throw new Error('差分プレビューでは変更対象がありません。反映は実行しません。');
        }
        throw new Error(`現在の実行オプションでは実行対象が 0 件です。${buildSkipSummary(plan)}`);
      }

      if (selectionIssues(previewResult, scopes).length) throw new Error('確認できない項目が含まれています。差分確認へ戻ってください。');
      // Markdown の反映記録用に、実行する計画（実行項目の差分）と反映元・反映先の名前を控える。
      const plannedSnapshot = { identities: reportIdentities(previewState.preview!.identities), entries: previewResult.entries.filter((entry) => plan.effectiveScopes.includes(entry.sectionKey)) };
      const wasRestoreMode = !!restoreMode;
      // 反映の進捗は、実行予定の全項目を「待機中」で並べ、エンジンの通知に合わせて更新する。
      const progressRows = createApplyProgressRows(plan.effectiveScopes, (key) => previewResult!.entries.find((entry) => entry.sectionKey === key)?.label || reflectSectionLabel(key));
      const applyOptions = {
        ...currentOptions(plan.effectiveScopes), reviewBaseline: previewResult.baseline, doDeploy: false, doBackup: true, stopOnError: true,
        onSectionUpdate: (update: ReflectSectionUpdate) => {
          progressView?.update(update);
          if (update.status === 'running') {
            const item = progressHost.querySelector<HTMLElement>(`[data-progress-section="${update.sectionKey}"]`);
            if (item) keepVisibleWithinCanvas(item);
          }
        }
      };
      // 反映時の取り消し案内に使うため、確認した差分の「未公開の変更」の判定を控えておく。
      const targetPendingAtApply = previewResult.targetPending;
      clearConfirmation();

      logCard.card.style.display = 'block';
      logPre.style.display = 'block';
      logPre.textContent = '';
      showWorkflowStage('result');
      // 反映開始後は、成功・部分失敗を問わず反映前の比較結果を再使用しない。
      memoryState.lastPreview = null;
      memoryState.lastResult = null;
      renderLastResult();
      progressView = createApplyProgressView(progressHost, progressRows);
      progressCard.card.style.display = 'block';
      let applyOutcome: Awaited<ReturnType<typeof runApplyPreviewStandalone>>;
      try {
        applyOutcome = await runApplyPreviewStandalone(
          applyOptions,
          (m: string, e?: boolean) => panel.setStatus(m, e ? 'err' : 'busy'),
          (logsArr: string[]) => {
            logPre.textContent = logsArr.join('\n');
            logPre.scrollTop = logPre.scrollHeight;
          }
        );
      } finally {
        // 完了（または書き込み前の停止）後は、進捗の一覧を下の結果一覧に置き換える。
        progressCard.card.style.display = 'none';
        progressHost.replaceChildren();
        progressView = null;
      }

      const counts = summarizeApplyOutcome(applyOutcome.sections);
      memoryState.lastResult = {
        ok: counts.ok,
        ng: counts.ng,
        pending: counts.pending,
        at: Date.now(),
        appId: applyOptions.targetAppId,
        guestId: applyOptions.targetGuestId,
        retryScopes: collectRetrySectionKeys(applyOutcome.sections),
        failedLabels: applyOutcome.sections.filter((s) => s.status === 'ng').map((s) => s.label),
        sourceBundleToken: sourceMode === 'json' ? sourceBundleToken : '',
        ...(applyOutcome.backup ? { backup: applyOutcome.backup } : {}),
        planned: plannedSnapshot,
        report: {
          source: {
            appId: applyOptions.sourceBundle ? String((applyOptions.sourceBundle as any)?.appId || '') : applyOptions.sourceAppId,
            guestId: applyOptions.sourceBundle ? '' : (applyOptions.sourceGuestId || ''),
            environment: sourceMode === 'json' ? 'json' : applyOptions.sourcePreview ? 'preview' : 'production'
          },
          target: { appId: applyOptions.targetAppId, guestId: applyOptions.targetGuestId || '', environment: 'preview' },
          preserveTargetOnly: !!applyOptions.preserveTargetOnly,
          scopes: plan.effectiveScopes.slice(),
          lookupMap: { ...(applyOptions.lookupMap || {}) },
          ...(targetPendingAtApply ? { targetPending: targetPendingAtApply } : {}),
          sections: applyOutcome.sections,
          logs: applyOutcome.logs.slice()
        }
      };
      // 複数アプリへの展開の記録。バックアップから戻す操作は展開に含めない。
      if (!wasRestoreMode) recordRolloutResult({ appId: applyOptions.targetAppId, guestId: applyOptions.targetGuestId || '', name: plannedSnapshot.identities.target.name, ok: counts.ok, ng: counts.ng, pending: counts.pending, at: memoryState.lastResult.at });
      renderLastResult();
      showWorkflowStage('result');
      return { cancelled: false, hadError: counts.ng > 0 || counts.pending > 0 };
    });

    if (!outcome) return;
    if (outcome.cancelled) {
      panel.setStatus('反映実行をキャンセルしました', 'info');
      return;
    }
    if (outcome.hadError) {
      panel.setStatus('プレビュー反映が一部失敗しました。「直近の実行結果」から失敗・未実行だけ選択して再実行できます。', 'warn');
      return;
    }
    panel.setStatus('プレビュー反映が完了しました。運用環境への反映は「反映先の設定画面を開く」からデプロイしてください。', 'ok');
  });

  // ---- 4ステップ・ワークフロー ----
  // 現在の段階に必要な主操作だけを固定フッターに置く。
  const nav = document.createElement('nav');
  nav.className = 'kus-rl-nav';
  nav.setAttribute('aria-label', 'プレビュー反映の手順');
  nav.setAttribute('role', 'tablist');
  const stageDefs = [
    { id: 'setup' as const, number: '1', label: '対象を選ぶ', copy: 'アプリと反映項目' },
    { id: 'review' as const, number: '2', label: '差分を確認', copy: '変更前・変更後' },
    { id: 'confirm' as const, number: '3', label: '最終確認', copy: '反映先と変更を確定' },
    { id: 'result' as const, number: '4', label: '反映結果', copy: '結果と次の操作' }
  ];
  const stages = {} as Record<'setup' | 'review' | 'confirm' | 'result', HTMLElement>;
  const navButtons = {} as Record<'setup' | 'review' | 'confirm' | 'result', HTMLButtonElement>;
  for (const def of stageDefs) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'kus-rl-nav__btn';
    button.id = `kus-rl-tab-${def.id}`;
    button.setAttribute('role', 'tab');
    button.setAttribute('aria-controls', `kus-rl-stage-${def.id}`);
    button.innerHTML = `<span class="kus-rl-nav__num">${def.number}</span><span>${def.label}<small class="kus-rl-nav__copy">${def.copy}</small></span>`;
    nav.appendChild(button);
    navButtons[def.id] = button;
    const stage = document.createElement('section');
    stage.className = 'kus-rl-stage';
    stage.id = `kus-rl-stage-${def.id}`;
    stage.dataset.stage = def.id;
    stage.setAttribute('role', 'tabpanel');
    stage.setAttribute('aria-labelledby', button.id);
    stages[def.id] = stage;
    button.addEventListener('click', () => def.id === 'confirm' ? openConfirmation() : showWorkflowStage(def.id));
    button.addEventListener('keydown', (event) => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const current = stageDefs.findIndex((item) => item.id === def.id);
      const direction = event.key === 'ArrowRight' ? 1 : -1;
      const next = stageDefs[event.key === 'Home' ? 0 : event.key === 'End' ? stageDefs.length - 1 : (current + direction + stageDefs.length) % stageDefs.length];
      if (next.id === 'confirm') openConfirmation(); else showWorkflowStage(next.id);
    });
  }
  stages.setup.innerHTML = '<header class="kus-rl-stage-head"><h2>どの設定を、どこへ反映しますか？</h2><p>反映元と反映先を指定し、反映したい項目を選びます。</p></header>';
  stages.review.innerHTML = '<header class="kus-rl-stage-head"><h2>差分と実行予定を確認</h2><p>実際に変更されるセクションと注意点を確認します。</p></header>';
  stages.confirm.innerHTML = '<header class="kus-rl-stage-head"><h2>書き込み先と内容の最終確認</h2><p>この画面で確認した条件だけを実行します。</p></header>';
  stages.confirm.appendChild(confirmCard.card);
  stages.result.innerHTML = '<header class="kus-rl-stage-head"><h2>実行結果と次の操作</h2><p>成功・失敗と、再実行が必要なセクションを確認します。</p></header>';
  const setupGrid = document.createElement('div');
  setupGrid.className = 'kus-rl-setup-grid';
  [cardApp.card, cardScope.card].forEach((node) => setupGrid.appendChild(node));
  const advanced = makeDetails('詳細設定 · バックアップ・エラー時の動作・参照先変換');
  advanced.details.classList.add('kus-rl-advanced');
  advanced.body.appendChild(cardOpt.card);
  const presetDetails = makeDetails('よく使う設定を保存・読み込み');
  presetDetails.details.classList.add('kus-rl-advanced');
  presetDetails.body.appendChild(cardPreset.card);
  setupGrid.append(rolloutDetails.details, advanced.details, presetDetails.details);
  stages.setup.appendChild(setupGrid);
  [reviewCard.card, previewCard.card].forEach((node) => stages.review.appendChild(node));
  [progressCard.card, lastResultCard.card, rolloutCard.card, logCard.card].forEach((node) => stages.result.appendChild(node));
  const resultEmpty = document.createElement('div');
  resultEmpty.className = 'kus-rl-preview-empty';
  resultEmpty.textContent = 'まだ反映していません。対象を選び、差分を確認してから反映してください。';
  stages.result.appendChild(resultEmpty);
  const dock = document.createElement('div');
  dock.className = 'kus-rl-action-dock';
  const dockRow = document.createElement('div');
  dockRow.className = 'kus-rl-dock-row';
  const dockCopy = document.createElement('div');
  dockCopy.className = 'kus-rl-dock-copy';
  dockCopy.setAttribute('aria-live', 'polite');
  const dockActions = document.createElement('div');
  dockActions.className = 'kus-rl-dock-actions';
  const backBtn = makeButton('対象を変更', 'sub');
  backBtn.addEventListener('click', () => showWorkflowStage(activeStage === 'confirm' ? 'review' : 'setup'));
  const nextBtn = makeButton('差分を確認する', 'primary');
  nextBtn.addEventListener('click', () => {
    if (getPreviewState().fresh) showWorkflowStage('review');
    else previewBtn.click();
  });
  dockActions.append(backBtn, previewBtn, nextBtn, confirmBtn, runBtn);
  dockRow.append(dockCopy, dockActions);
  dock.appendChild(dockRow);
  dock.appendChild(panel.status);
  dock.appendChild(panel.result);
  const hint = panel.body.querySelector('.kus-lp__hint');
  const workspace = document.createElement('div');
  workspace.className = 'kus-rl-workspace';
  const canvas = document.createElement('main');
  canvas.className = 'kus-rl-canvas';
  workspace.appendChild(nav);
  stageDefs.forEach((def) => canvas.appendChild(stages[def.id]));
  workspace.appendChild(canvas);
  hint?.insertAdjacentElement('afterend', workspace);
  panel.body.appendChild(dock);
  let activeStage: 'setup' | 'review' | 'confirm' | 'result' = 'setup';
  const noInputSubmit = document.createElement('button'); noInputSubmit.disabled = true;
  /** フッターの経路表示。差分取得済みなら確認済みの名前、未取得なら入力中に確認できた名前を使う。 */
  function dockEndpointLabel(side: 'source' | 'target', identities?: ReflectIdentities | null): string {
    const role = side === 'source' ? '反映元' : '反映先';
    // バックアップから戻している間は、反映元を「反映前のバックアップ（…）」と示す。
    if (side === 'source' && restoreMode) return `${role}: ${restoreSourceLabel(identities?.target.name || targetNote.known()?.name || '')}`;
    let id: string;
    let name = '';
    let guest: string;
    if (identities) {
      ({ appId: id, name, guestId: guest } = identities[side]);
    } else if (side === 'source' && sourceMode === 'json') {
      id = String(sourceBundleFromJson?.appId || srcApp.value.trim());
      name = sourceBundleFromJson ? extractAppNameFromBundle(sourceBundleFromJson) : '';
      guest = '';
    } else {
      id = (side === 'source' ? srcApp : tgtApp).value.trim();
      guest = (side === 'source' ? srcGuest : tgtGuest).value.trim();
      name = (side === 'source' ? sourceNote : targetNote).known()?.name || '';
    }
    const head = name ? `${role}: ${name}（#${id}）` : `${role}: ${id ? `#${id}` : '未入力'}`;
    const tail = [
      guest ? `ゲスト ${guest}` : '',
      side === 'target' ? 'プレビュー' : sourceMode === 'json' ? '設定JSON' : sourceEnvironment.value === 'preview' ? 'プレビュー設定' : ''
    ].filter(Boolean);
    return tail.length ? `${head} / ${tail.join(' / ')}` : head;
  }
  refreshWorkflow = () => {
    const { scopes, fresh, preview } = getPreviewState();
    const plan = fresh ? getExecutionPlan(scopes, preview?.result) : null;
    backBtn.hidden = activeStage === 'setup'; nextBtn.hidden = activeStage !== 'setup';
    previewBtn.hidden = activeStage !== 'review'; confirmBtn.hidden = activeStage !== 'review'; runBtn.hidden = activeStage !== 'confirm';
    backBtn.disabled = busy; nextBtn.disabled = previewBtn.disabled || busy; navButtons.confirm.disabled = confirmBtn.disabled;
    setButtonText(backBtn, activeStage === 'confirm' ? '差分に戻る' : '対象を変更');
    setButtonText(nextBtn, fresh ? '確認した差分へ進む' : '差分を確認する'); setButtonText(previewBtn, '差分を再取得');
    previewBtn.classList.toggle('kus-lp__btn--primary', !fresh); previewBtn.classList.toggle('kus-lp__btn--sub', fresh);
    resultEmpty.hidden = !!memoryState.lastResult || logCard.card.style.display !== 'none';
    const setupBlocker = activeStage === 'setup' ? describeReflectSetupBlocker({
      connectionError: reflectConnectionError(currentOptions()),
      sourceMode,
      hasSourceBundle: !!sourceBundleFromJson,
      scopeCount: scopes.length,
      lookupError: lookupMapError(parseLookupMapText(lookupTa.value))
    }) : '';
    let message = setupBlocker ? `次に進むには：${setupBlocker}` : `${scopes.length} 項目を比較します。書き込みは行いません。`;
    const postApply = activeStage === 'review' ? postApplySummary() : null;
    if (activeStage === 'review') message = !fresh ? '差分の取得が必要です。' : postApply ? postApply.message : confirmBtn.disabled ? '確認が必要な項目、または変更の有無を確認してください。' : `${plan?.effectiveScopes.length} 項目の内容を確認し、最終確認へ進んでください。`;
    if (activeStage === 'confirm') message = fresh && confirmedToken ? '反映前バックアップを自動保存 / エラー時は中断 / 本番公開は行いません' : '条件が変わりました。差分の取得と最終確認をやり直してください。';
    if (activeStage === 'result') message = '結果を確認してください。再実行には差分の再取得が必要です。';
    const sourceLabel = dockEndpointLabel('source', fresh ? preview?.identities : null);
    const targetLabel = dockEndpointLabel('target', fresh ? preview?.identities : null);
    // The complete route stays in the confirmation card. Keep the fixed footer short on small screens.
    dockCopy.innerHTML = activeStage === 'confirm' && fresh && preview?.identities
      ? `<strong>書き込み先 #${escapeHtml(preview.identities.target.appId)} · プレビュー</strong><span class="kus-rl-dock-msg">${escapeHtml(confirmedToken ? '内容を確認してから反映してください。' : '条件が変わりました。差分を再取得してください。')}</span>`
      : `<strong>${escapeHtml(sourceLabel)} → ${escapeHtml(targetLabel)}</strong><span class="kus-rl-dock-msg${setupBlocker ? ' kus-rl-dock-reason' : ''}">${escapeHtml(message)}</span>`;
    panel.result.hidden = activeStage === 'confirm';
    const advancedSummary = advanced.details.querySelector('summary');
    if (advancedSummary) advancedSummary.textContent = '詳細設定 · 自動バックアップ / 参照先変換';
    // Text-entry Enter must never start a settings write.
    panel.setPrimaryAction(activeStage === 'setup' ? nextBtn : activeStage === 'review' ? (fresh ? confirmBtn : previewBtn) : noInputSubmit);
  };
  showWorkflowStage = (active) => {
    if (active === 'confirm' && !confirmedToken) return;
    if (activeStage === 'confirm' && active !== 'confirm') clearConfirmation();
    activeStage = active;
    stageDefs.forEach((def) => {
      const selected = def.id === active;
      stages[def.id].hidden = !selected;
      navButtons[def.id].setAttribute('aria-selected', String(selected));
      navButtons[def.id].tabIndex = selected ? 0 : -1;
    });
    navButtons[active].focus({ preventScroll: true });
    canvas.scrollTo({ top: 0 });
    refreshWorkflow();
  };
  // 非同期処理中は条件の編集と二重実行を防ぐ。解除後は現在の状態から再計算する。
  const setPanelBusy = panel.setBusy;
  const disabledBefore = new Map<HTMLInputElement | HTMLButtonElement | HTMLSelectElement | HTMLTextAreaElement, boolean>();
  panel.setBusy = (value) => {
    busy = value;
    panel.root.setAttribute('aria-busy', String(value));
    // 反映中の進捗（読み上げ対象）を残すため、結果の段階は inert にしない。操作は下の一括無効化で防ぐ。
    nav.inert = value;
    stageDefs.forEach((def) => { stages[def.id].inert = value && def.id !== 'result'; });
    if (value) {
      panel.root.querySelectorAll<HTMLInputElement | HTMLButtonElement | HTMLSelectElement | HTMLTextAreaElement>('input,button,select,textarea').forEach((control) => {
        disabledBefore.set(control, control.disabled);
        control.disabled = true;
      });
    } else {
      disabledBefore.forEach((disabled, control) => { control.disabled = disabled; });
      disabledBefore.clear();
      refreshSrcJsonNote();
      refreshPresetSelect();
      refreshPresetButtons();
      refreshReviewCard();
      navButtons[activeStage].focus({ preventScroll: true });
    }
    setPanelBusy(value);
  };
  showWorkflowStage(memoryState.lastResult ? 'result' : (memoryState.lastPreview ? 'review' : 'setup'));

  refreshSameConnBanner();
  refreshReviewCard();
}

// =============================================================================
// 補助関数
// =============================================================================

function escapeHtml(s: string): string {
  return String(s).replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  } as Record<string, string>)[ch]);
}

/** バックアップから戻している間の注意（差分確認・最終確認で表示する）。 */
function appendRestoreNotice(host: HTMLElement) {
  const note = document.createElement('p');
  note.className = 'kus-rl-next kus-rl-next--info kus-rl-restore-notice';
  note.dataset.restoreNotice = 'true';
  note.textContent = RESTORE_MODE_NOTICE;
  host.appendChild(note);
}

/**
 * 反映先プレビューに以前からの未公開の変更があるかの表示。
 * 未公開あり＝警告色、なし＝控えめな確認済み、確認できない＝控えめな注意。状態は色だけでなく見出しの文字でも示す。
 */
function appendTargetPendingNotice(host: HTMLElement, pending: ReflectTargetPending | undefined) {
  if (!pending) return;
  const box = document.createElement('div');
  box.dataset.targetPending = pending.state;
  const text = document.createElement('span');
  text.textContent = pending.message;
  if (pending.state === 'pending') {
    box.className = 'kus-rl-next kus-rl-next--warn';
    const title = document.createElement('strong');
    title.textContent = '反映先に以前からの未公開の変更があります';
    box.append(title, text);
  } else {
    box.className = `kus-rl-pending kus-rl-pending--${pending.state === 'clean' ? 'clean' : 'unknown'}`;
    const mark = document.createElement('strong');
    mark.textContent = pending.state === 'clean' ? '✓ 未公開の変更なし' : 'ⓘ 未公開の変更は未確認';
    box.append(mark, text);
  }
  host.appendChild(box);
}

function getSectionLabel(key: string): string {
  return reflectSectionLabel(key);
}

function formatPreviewStamp(at: number): string {
  const diffSec = Math.max(0, Math.floor((Date.now() - at) / 1000));
  if (diffSec < 60) return `たった今 (${formatReflectTime(at)})`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}分前 (${formatReflectTime(at)})`;
  return formatReflectDateTime(at);
}

function buildSkipSummary(plan: ExecutionPlan): string {
  const parts: string[] = [];
  if (plan.skippedSameScopes.length > 0) parts.push(`一致除外 ${plan.skippedSameScopes.length}件`);
  if (plan.skippedErrorScopes.length > 0) parts.push(`失敗除外 ${plan.skippedErrorScopes.length}件`);
  return parts.length ? parts.join(' / ') : '除外なし';
}

/** 展開の記録（これまでの反映先）。失敗・未実行があるものは文字でも目印を付ける。textContent で描画する。 */
function renderRolloutLog(host: HTMLElement, log: readonly RolloutLogEntry[]) {
  host.replaceChildren();
  if (!log.length) return;
  const heading = document.createElement('div');
  heading.className = 'kus-rl-rollout-heading';
  heading.textContent = `これまでの反映先（${log.length} 件）`;
  const list = document.createElement('ul');
  list.className = 'kus-rl-rollout-list';
  for (const entry of log) {
    const tone = entry.ng > 0 ? 'ng' : entry.pending > 0 ? 'pending' : 'ok';
    const item = document.createElement('li');
    item.className = `kus-rl-rollout-item kus-rl-rollout-item--${tone}`;
    item.dataset.rolloutEntry = `${entry.guestId ? `${entry.guestId}:` : ''}${entry.appId}`;
    const head = document.createElement('div');
    head.className = 'kus-rl-rollout-item__head';
    const state = document.createElement('span');
    state.className = `kus-rl-result-state kus-rl-result-state--${tone}`;
    const icon = document.createElement('span');
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = tone === 'ok' ? '✓' : '⚠';
    state.append(icon, document.createTextNode(tone === 'ok' ? '成功' : tone === 'ng' ? '失敗あり' : '未実行あり'));
    const name = document.createElement('strong');
    name.textContent = `${formatRolloutTarget(entry)}${entry.name ? ` ${entry.name}` : ''}`;
    head.append(state, name);
    const meta = document.createElement('div');
    meta.className = 'kus-rl-quiet';
    meta.textContent = `成功 ${entry.ok} / 失敗 ${entry.ng} / 未実行 ${entry.pending} · ${formatReflectDateTime(entry.at)}`;
    item.append(head, meta);
    list.appendChild(item);
  }
  host.append(heading, list);
}

function setButtonText(button: HTMLButtonElement, text: string) {
  const spans = button.querySelectorAll('span');
  const label = spans[spans.length - 1] as HTMLElement | undefined;
  if (label) label.textContent = text;
  else button.textContent = text;
}

function buildPreviewSignature(args: {
  sourceAppId: string;
  sourceGuestId: string;
  sourcePreview: boolean;
  /** 反映元JSONを読み込んでいる場合の識別子（ファイルが変わったら差分プレビューを古い扱いにする） */
  sourceBundleToken?: string;
  targetAppId: string;
  targetGuestId: string;
  scopes: string[];
  lookupMap: Record<string, string>;
  preserveTargetOnly: boolean;
}): string {
  const lookupPairs = Object.keys(args.lookupMap || {})
    .sort()
    .map((key) => [key, args.lookupMap[key]]);
  return JSON.stringify({
    sourceAppId: args.sourceAppId,
    sourceGuestId: args.sourceGuestId,
    sourcePreview: !!args.sourcePreview,
    sourceBundleToken: args.sourceBundleToken || '',
    targetAppId: args.targetAppId,
    targetGuestId: args.targetGuestId,
    scopes: [...(args.scopes || [])].sort(),
    lookupPairs,
    preserveTargetOnly: args.preserveTargetOnly
  });
}

function filterPreviewEntries(entries: PreviewEntry[], keyword: string, status = 'all'): PreviewEntry[] {
  entries = entries.filter((entry) => status === 'all' || (status === 'error'
    ? !['change', 'same'].includes(entry.status) : entry.status === status));
  if (!keyword) return entries;
  return entries.filter((entry) => {
    const hay = [entry.label, entry.message, entry.sectionKey, ...entry.changes.map(change => [change.path, change.before, change.after].join(" "))]
      .filter(Boolean)
      .join('\n')
      .toLowerCase();
    return hay.includes(keyword);
  });
}

function uniqueSectionKeys(entries: PreviewEntry[]): string[] {
  return [...new Set(entries.map((entry) => entry.sectionKey).filter(Boolean))];
}

/**
 * 指定した要素が見えるよう、パネル内の本文領域（.kus-rl-canvas）だけをスクロールする。
 * scrollIntoView は overflow:hidden のパネル外枠（.kus-lp）まで動かし、見出しが画面外へ消えて固定フッターの下に空白ができるため使わない。
 */
function scrollWithinCanvas(target: HTMLElement) {
  const canvas = target.closest<HTMLElement>('.kus-rl-canvas');
  if (!canvas) return;
  const padding = Number.parseFloat(window.getComputedStyle(canvas).scrollPaddingTop) || 0;
  const top = canvas.scrollTop + (target.getBoundingClientRect().top - canvas.getBoundingClientRect().top) - padding;
  const reduceMotion = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  canvas.scrollTo({ top: Math.max(0, top), behavior: reduceMotion ? 'auto' : 'smooth' });
}

/** 本文領域の表示範囲から外れている要素だけを、本文領域内でスクロールして見えるようにする（実行中の進捗の追従用）。 */
function keepVisibleWithinCanvas(target: HTMLElement) {
  const canvas = target.closest<HTMLElement>('.kus-rl-canvas');
  if (!canvas) return;
  const area = canvas.getBoundingClientRect();
  const box = target.getBoundingClientRect();
  if (box.top < area.top || box.bottom > area.bottom) scrollWithinCanvas(target);
}

/** 要約表の行から、該当項目の詳細（内訳）を開いてスクロールする。 */
function revealPreviewEntry(host: HTMLElement, sectionKey: string, opts: PreviewRenderOptions) {
  const find = () => Array.from(host.querySelectorAll<HTMLElement>('[data-reflect-entry]')).find((node) => node.dataset.reflectEntry === sectionKey);
  let row = find();
  if (!row) {
    // 絞り込みで隠れている項目は、絞り込みを解除して探し直す。
    opts.onShowAll?.();
    row = find();
  }
  if (!row) return;
  const group = row.closest('details.kus-rl-preview-group') as HTMLDetailsElement | null;
  if (group) group.open = true;
  const changes = row.querySelector('details.kus-rl-changes') as HTMLDetailsElement | null;
  if (changes) changes.open = true;
  scrollWithinCanvas(row);
  row.focus({ preventScroll: true });
  row.classList.add('kus-rl-preview-row--focus');
  window.setTimeout(() => row?.classList.remove('kus-rl-preview-row--focus'), 1800);
}

function renderPreviewResult(host: HTMLElement, result: PreviewReflectResult, opts: PreviewRenderOptions = {}) {
  host.innerHTML = '';
  const filteredEntries = filterPreviewEntries(result.entries, String(opts.searchKeyword || '').trim().toLowerCase(), opts.statusFilter);
  const selectedSet = new Set(opts.selectedScopes || []);
  const plan = opts.plan || null;
  const effectiveSet = new Set(plan?.effectiveScopes || []);
  const skippedSameSet = new Set(plan?.skippedSameScopes || []);
  const skippedErrorSet = new Set(plan?.skippedErrorScopes || []);

  const summary = document.createElement('div');
  summary.className = 'kus-rl-preview-summary';
  summary.innerHTML = ''
    + `<span class="kus-rl-pill kus-rl-pill--change">差分 ${result.changedSections}</span>`
    + `<span class="kus-rl-pill kus-rl-pill--same">一致 ${result.sameSections}</span>`
    + (result.errorSections > 0 ? `<span class="kus-rl-pill kus-rl-pill--error">取得失敗 ${result.errorSections}</span>` : '')
    + `<span class="kus-rl-pill">${result.totalSections} セクション</span>`
    + (opts.searchKeyword ? `<span class="kus-rl-pill kus-rl-pill--stale">検索一致 ${filteredEntries.length}</span>` : '');
  host.appendChild(summary);

  if (result.entries.length) {
    renderReflectSummaryTable(host, result.entries, {
      selectedScopes: selectedSet,
      onNavigate: (sectionKey) => revealPreviewEntry(host, sectionKey, opts)
    });
  }

  if (!result.entries.length) {
    const empty = document.createElement('div');
    empty.className = 'kus-rl-preview-empty';
    empty.textContent = '対象セクションがありません';
    host.appendChild(empty);
    return;
  }
  if (!filteredEntries.length) {
    const empty = document.createElement('div');
    empty.className = 'kus-rl-preview-empty';
    empty.textContent = `検索条件に一致するセクションがありません${opts.searchKeyword ? `: ${opts.searchKeyword}` : ''}`;
    host.appendChild(empty);
    return;
  }

  const groups: Array<{ title: string; entries: PreviewEntry[]; tone: 'change' | 'same' | 'error' }> = [
    { title: '差分あり', tone: 'change', entries: filteredEntries.filter((entry) => entry.status === 'change') },
    { title: '差分なし', tone: 'same', entries: filteredEntries.filter((entry) => entry.status === 'same') },
    {
      title: '取得失敗',
      tone: 'error',
      entries: filteredEntries.filter((entry) => entry.status === 'src-missing' || entry.status === 'tgt-missing' || entry.status === 'error')
    }
  ];

  groups.sort((a, b) => ['error', 'change', 'same'].indexOf(a.tone) - ['error', 'change', 'same'].indexOf(b.tone));
  for (const group of groups) {
    if (!group.entries.length) continue;
    const collapsed = group.tone === 'same' && opts.statusFilter === 'all' && !opts.searchKeyword;
    const wrap = document.createElement(collapsed ? 'details' : 'section');
    wrap.className = 'kus-rl-preview-group';
    const headTag = collapsed ? 'summary' : 'div';
    wrap.innerHTML = `<${headTag} class="kus-rl-preview-group__head"><span>${escapeHtml(group.title)}${collapsed ? ' · 開いて確認' : ''}</span><span>${group.entries.length} 件</span></${headTag}>`;
    const list = document.createElement('div');
    list.className = 'kus-rl-preview-list';
    for (const entry of group.entries) {
      const row = document.createElement('div');
      row.className = `kus-rl-preview-row kus-rl-preview-row--${group.tone}`;
      row.dataset.reflectEntry = entry.sectionKey;
      row.tabIndex = -1;
      const statusLabel = group.tone === 'change' ? '差分あり' : (group.tone === 'same' ? '一致' : '取得失敗');
      const metaPills: string[] = [];
      const statePills: string[] = [];
      if (entry.fieldStats) {
        metaPills.push(`<span class="kus-rl-preview-mini">追加 ${entry.fieldStats.add}</span>`);
        metaPills.push(`<span class="kus-rl-preview-mini">更新 ${entry.fieldStats.update}</span>`);
        metaPills.push(`<span class="kus-rl-preview-mini">反映先のみ ${entry.fieldStats.tgtOnly}</span>`);
      }
      if (selectedSet.has(entry.sectionKey)) statePills.push('<span class="kus-rl-preview-mini">選択中</span>');
      else statePills.push('<span class="kus-rl-preview-mini">未選択</span>');
      if (effectiveSet.has(entry.sectionKey)) statePills.push('<span class="kus-rl-preview-mini">実行予定</span>');
      if (!opts.fresh) statePills.push('<span class="kus-rl-preview-mini">再取得が必要</span>');
      if (skippedSameSet.has(entry.sectionKey)) statePills.push('<span class="kus-rl-preview-mini">一致のため除外</span>');
      if (skippedErrorSet.has(entry.sectionKey)) statePills.push('<span class="kus-rl-preview-mini">取得失敗のため除外</span>');
      if (RISKY_SCOPE_KEYS.has(entry.sectionKey)) statePills.push('<span class="kus-rl-preview-mini">高リスク</span>');
      row.innerHTML = ''
        + '<div class="kus-rl-preview-row__head">'
        + `  <div class="kus-rl-preview-row__title">${escapeHtml(entry.label)}</div>`
        + `  <span class="kus-rl-pill kus-rl-pill--${group.tone}">${statusLabel}</span>`
        + '</div>'
        + `<div class="kus-rl-preview-row__detail">${escapeHtml(entry.message)}</div>`
        + (statePills.length ? `<div class="kus-rl-preview-row__state">${statePills.join('')}</div>` : '')
        + (metaPills.length ? `<div class="kus-rl-preview-row__meta">${metaPills.join('')}</div>` : '');

      if (opts.onAdd && opts.onRemove) {
        const selection = makeCheck({ label: '反映候補に含める', checked: selectedSet.has(entry.sectionKey) });
        selection.checkbox.setAttribute('aria-label', `${entry.label}を反映候補に含める`);
        selection.checkbox.dataset.reflectScope = entry.sectionKey;
        selection.checkbox.addEventListener('change', () => {
          if (selection.checkbox.checked) opts.onAdd?.(entry.sectionKey);
          else opts.onRemove?.(entry.sectionKey);
          // 一覧を更新した後も、操作したチェックボックスへフォーカスを戻す。
          Array.from(host.querySelectorAll<HTMLInputElement>('input[data-reflect-scope]'))
            .find((input) => input.dataset.reflectScope === entry.sectionKey)?.focus({ preventScroll: true });
        });
        row.appendChild(selection.label);
      }
      appendReflectChanges(row, entry);
      list.appendChild(row);
    }
    wrap.appendChild(list);
    host.appendChild(wrap);
  }
}
