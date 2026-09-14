'use strict';

import { DEFAULT_APP_ID, SECTION_DEFS } from '../constants.js';
import {
  runApplyPreviewStandalone,
  previewReflectStandalone,
  resolveReflectAppsStandalone,
  reflectConnectionError,
  type ReflectIdentities,
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
  liteRun
} from './litePanelTheme.js';
import { createAppSearchControl } from './appSearchControl.js';
import { pickAllSettingsBundles } from '../settingsBundleImport.js';
import { reflectSelectionBlockers } from '../reflect/standalonePlan.js';
import { appendReflectChanges, renderReflectRoute, reflectIdentityLabel } from './reflectPlanView.js';
import { collectRetrySectionKeys, summarizeApplyOutcome, type ApplySectionOutcome } from '../reflect/applyOutcome.js';

// =============================================================================
// メモリ状態（リロードで消える。lite はブラウザ永続ストレージを使わない方針）
// =============================================================================

interface PreviewSnapshot {
  identities: ReflectIdentities;
  signature: string;
  scopes?: string[];
  at: number;
  result: PreviewReflectResult;
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
  lastPreview?: PreviewSnapshot | null;
  /** 直近の反映結果（成功 / 失敗の最終サマリ） */
  lastResult?: {
    ok: number;
    ng: number;
    /** エラー中断により未実行のまま残ったセクション数 */
    pending: number;
    skip: number;
    at: number;
    durationMs: number;
    appId: string;
    guestId: string;
    /** 再実行が必要なセクション（失敗 + 未実行）のキー */
    retryScopes: string[];
    /** 失敗セクションの表示ラベル */
    failedLabels: string[];
    /** 監査用に保存できる実行時の全セクション結果とログ */
    report: {
      source: { appId: string; guestId: string; environment: 'production' | 'preview' | 'json' };
      target: { appId: string; guestId: string; environment: 'preview' };
      preserveTargetOnly: boolean;
      scopes: string[];
      sections: ApplySectionOutcome[];
      logs: string[];
    };
  } | null;
  /** ユーザー定義プリセット（接続情報＋スコープ） */
  presets?: ReflectLitePreset[];
}

interface ReflectLitePreset {
  preserveTargetOnly?: boolean;
  name: string;
  createdAt: string;
  source: { appId: string; guestId: string; preview: boolean };
  target: { appId: string; guestId: string };
  scopes: string[];
  lookupMapText: string;
}

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
#kus-reflect-lite .kus-lp__title{font-size:20px;letter-spacing:-.01em}
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
#kus-reflect-lite .kus-rl-next{padding:10px 12px;border-radius:10px;font-size:12px;line-height:1.6;border:1px solid #e2e8f0;background:#fff}
#kus-reflect-lite .kus-rl-next strong{display:block;margin-bottom:2px}
#kus-reflect-lite .kus-rl-next--ok{background:#ecfdf5;border-color:#a7f3d0;color:#065f46}
#kus-reflect-lite .kus-rl-next--info{background:#eff6ff;border-color:#bfdbfe;color:#1e3a8a}
#kus-reflect-lite .kus-rl-next--warn{background:#fffbeb;border-color:#fde68a;color:#92400e}
#kus-reflect-lite .kus-rl-issues{margin:0;padding-left:18px;font-size:12px;line-height:1.6;color:#92400e}
#kus-reflect-lite .kus-rl-issues li+li{margin-top:3px}
#kus-reflect-lite .kus-rl-quiet{font-size:11.5px;color:#64748b}
#kus-reflect-lite .kus-rl-preview-summary{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px}
#kus-reflect-lite .kus-rl-preview-tools{display:flex;flex-direction:column;gap:8px;margin-bottom:10px}
#kus-reflect-lite .kus-rl-preview-tools__actions{display:flex;flex-wrap:wrap;gap:6px}
#kus-reflect-lite .kus-rl-preview-empty{padding:14px 12px;border:1px dashed #cbd5e1;border-radius:10px;background:#f8fafc;font-size:12px;color:#64748b}
#kus-reflect-lite .kus-rl-preview-group{border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;background:#fff;margin-bottom:10px}
#kus-reflect-lite .kus-rl-preview-group__head{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:9px 12px;background:#f8fafc;border-bottom:1px solid #e2e8f0;font-size:11.5px;font-weight:700;color:#334155}
#kus-reflect-lite .kus-rl-preview-list{display:flex;flex-direction:column;gap:8px;padding:10px}
#kus-reflect-lite .kus-rl-preview-row{border:1px solid #e2e8f0;border-radius:10px;padding:10px;background:#fff}
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
#kus-reflect-lite .kus-rl-result-list{display:grid;gap:6px;margin-top:10px}
#kus-reflect-lite .kus-rl-result-row{display:grid;grid-template-columns:auto minmax(0,1fr);gap:8px;align-items:start;padding:8px 10px;border:1px solid #e2e8f0;border-radius:9px;background:#fff}
#kus-reflect-lite .kus-rl-result-row__status{display:inline-flex;min-width:50px;justify-content:center;padding:2px 6px;border-radius:999px;font-size:10px;font-weight:800}
#kus-reflect-lite .kus-rl-result-row[data-status="ok"] .kus-rl-result-row__status{background:#dcfce7;color:#166534}
#kus-reflect-lite .kus-rl-result-row[data-status="ng"] .kus-rl-result-row__status{background:#fee2e2;color:#991b1b}
#kus-reflect-lite .kus-rl-result-row[data-status="pending"] .kus-rl-result-row__status{background:#fef3c7;color:#92400e}
#kus-reflect-lite .kus-rl-result-row[data-status="skip"] .kus-rl-result-row__status{background:#e2e8f0;color:#475569}
#kus-reflect-lite .kus-rl-result-row__label{font-size:12px;font-weight:700;color:#0f172a}
#kus-reflect-lite .kus-rl-result-row__message{margin-top:2px;font-size:11px;line-height:1.5;color:#64748b;overflow-wrap:anywhere}
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
@media(prefers-reduced-motion:reduce){#kus-reflect-lite{animation:none}#kus-reflect-lite *{scroll-behavior:auto!important}}
`;

type LookupParseResult =
  | { ok: true; value: Record<string, string> }
  | { ok: false; error: string };

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
  ensureReflectLiteStyles();

  const panel = createLitePanel({
    id: 'kus-reflect-lite',
    title: 'プレビュー反映',
    subtitle: '比較元アプリの設定を比較先プレビューへ一括反映します。',
    accent: 'reflect',
    badges: [],
    hint: '<strong>差分を確認してから反映</strong> · 反映先はプレビューです。本番への公開は設定画面で行います。',
    wide: true
  });
  let showWorkflowStage: (stage: 'setup' | 'review' | 'confirm' | 'result') => void = () => {};
  let refreshWorkflow = () => {};
  let busy = false;
  let sourceMode: 'app' | 'json' = 'app';

  // ---- アプリ ----
  const srcApp = makeInput({ placeholder: '比較元アプリID', value: memoryState.sourceAppId || '', width: 'id' });
  const srcGuest = makeInput({ placeholder: 'ゲストID', value: memoryState.sourceGuestId || '', width: 'guest' });
  const tgtApp = makeInput({ placeholder: '比較先アプリID', value: memoryState.targetAppId || DEFAULT_APP_ID || '', width: 'id' });
  const tgtGuest = makeInput({ placeholder: 'ゲストID', value: memoryState.targetGuestId || '', width: 'guest' });
  srcApp.setAttribute('aria-label', '比較元アプリID');
  srcGuest.setAttribute('aria-label', '比較元ゲストスペースID');
  tgtApp.setAttribute('aria-label', '比較先アプリID');
  tgtGuest.setAttribute('aria-label', '比較先ゲストスペースID');
  let sourceBundleFromJson: any = null;
  let sourceJsonBundles: any[] = [];
  // 差分プレビューの鮮度判定（signature）に使う読み込み済みJSONの識別子
  let sourceBundleToken = '';
  const srcJsonFile = document.createElement('input');
  srcJsonFile.type = 'file';
  srcJsonFile.accept = '.json,application/json';
  srcJsonFile.className = 'kus-lp__file';
  const sourceJsonAppSelect = document.createElement('select');
  sourceJsonAppSelect.className = 'kus-lp__select';
  sourceJsonAppSelect.setAttribute('aria-label', '設定JSON内の比較元アプリ');
  sourceJsonAppSelect.hidden = true;
  const srcJsonClearBtn = makeButton('クリア', 'ghost');
  srcJsonClearBtn.style.display = 'none';
  const srcJsonNote = document.createElement('div');
  srcJsonNote.className = 'kus-lp__small';
  srcJsonNote.style.display = 'none';

  const currentSrcBtn = makeButton('現在のアプリを比較元', 'sub');
  const copyBtn = makeButton('比較元 → 比較先', 'sub');
  const currentBtn = makeButton('現在のアプリを比較先', 'sub');
  const swapBtn = makeButton('入れ替え', 'sub');

  const cardApp = makeCard({ title: 'アプリ', number: 1 });
  cardApp.card.classList.add('kus-rl-card--route');
  const route = document.createElement('div');
  route.className = 'kus-rl-route';
  const sourceEndpoint = document.createElement('section');
  sourceEndpoint.className = 'kus-rl-endpoint';
  sourceEndpoint.innerHTML = '<div class="kus-rl-endpoint__eyebrow">比較元 · 設定を読み取る</div>';
  const sourceModeSelect = document.createElement('select');
  sourceModeSelect.className = 'kus-lp__select';
  sourceModeSelect.setAttribute('aria-label', '比較元の取得方法');
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
  const sourceGuestDetails = makeDetails('ゲストスペースを指定', { open: !!srcGuest.value });
  sourceGuestDetails.body.appendChild(labeledInput(srcGuest, 'ゲストスペースID（任意）'));
  sourceAppFields.append(sourceGuestDetails.details, currentSrcBtn);
  sourceEndpoint.appendChild(sourceAppFields);
  const sourceJsonFields = document.createElement('div');
  sourceJsonFields.hidden = true;
  srcJsonFile.setAttribute('aria-label', '比較元の設定JSON');
  sourceJsonFields.append(srcJsonFile, sourceJsonAppSelect, srcJsonClearBtn, srcJsonNote);
  sourceEndpoint.appendChild(sourceJsonFields);
  const routeArrow = document.createElement('div');
  routeArrow.className = 'kus-rl-route-arrow';
  routeArrow.setAttribute('aria-hidden', 'true');
  routeArrow.textContent = '→';
  const targetEndpoint = document.createElement('section');
  targetEndpoint.className = 'kus-rl-endpoint kus-rl-endpoint--target';
  targetEndpoint.innerHTML = '<div class="kus-rl-endpoint__eyebrow">比較先 · プレビューへ反映</div><div class="kus-rl-endpoint__note">本番への公開は設定画面から行います</div>';
  targetEndpoint.appendChild(labeledInput(tgtApp, 'アプリID'));
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
      srcJsonNote.textContent = `比較元JSON読み込み済み: App ${sourceBundleFromJson?.appId || '-'}（比較元はこのJSONから取得し、アプリからの取得は行いません）`;
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

  srcJsonFile.addEventListener('change', () => liteRun(panel, '比較元JSONを読み込み中…', async () => {
    const file = srcJsonFile.files?.[0];
    if (!file) return;
    sourceBundleFromJson = null;
    sourceJsonBundles = [];
    sourceBundleToken = '';
    sourceJsonBundles = pickAllSettingsBundles(JSON.parse(await file.text()), 'source', true);
    sourceJsonAppSelect.replaceChildren(...sourceJsonBundles.map((bundle, index) => {
      const option = document.createElement('option');
      option.value = String(index);
      option.textContent = `アプリ #${bundle.appId}`;
      return option;
    }));
    sourceBundleFromJson = sourceJsonBundles[0];
    sourceBundleToken = `${file.name}:${file.size}:${file.lastModified}:${Date.now()}`;
    if (sourceBundleFromJson?.appId) srcApp.value = String(sourceBundleFromJson.appId);
    panel.setStatus(`比較元JSONを読み込みました: App ${sourceBundleFromJson?.appId || '-'}`, 'ok');
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
    panel.setStatus('比較元JSONをクリアしました。設定JSONを選んでください。', 'info');
  });

  const sameConnBanner = document.createElement('div');
  sameConnBanner.className = 'kus-lp__note--warn';
  sameConnBanner.style.display = 'none';
  sameConnBanner.textContent = '⚠ 比較元と比較先が同一接続です（同じアプリID・ゲストID）。同一アプリのプレビューを上書きする状態です。';
  cardApp.body.appendChild(sameConnBanner);

  cardApp.body.appendChild(createAppSearchControl(panel, {
    targets: [
      { label: '比較元', apply: (id, _name, guestId) => {
        sourceModeSelect.value = 'app';
        sourceModeSelect.dispatchEvent(new Event('change'));
        srcApp.value = id;
        srcGuest.value = guestId || '';
        saveState(); refreshSameConnBanner(); refreshReviewCard();
      } },
      { label: '比較先', apply: (id, _name, guestId) => {
        tgtApp.value = id;
        tgtGuest.value = guestId || '';
        saveState(); refreshSameConnBanner(); refreshReviewCard();
      } }
    ]
  }));

  panel.body.insertBefore(cardApp.card, panel.status);

  function refreshSameConnBanner() {
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
    saveState();
    refreshSameConnBanner();
    refreshReviewCard();
    panel.setStatus('現在のアプリIDを比較元にセットしました', 'info');
  });
  copyBtn.addEventListener('click', () => {
    tgtApp.value = srcApp.value.trim();
    tgtGuest.value = srcGuest.value.trim();
    saveState();
    refreshSameConnBanner();
    refreshReviewCard();
    panel.setStatus('比較元IDを比較先へコピーしました', 'info');
  });
  currentBtn.addEventListener('click', () => {
    tgtApp.value = DEFAULT_APP_ID || '';
    saveState();
    refreshSameConnBanner();
    refreshReviewCard();
    panel.setStatus('現在のアプリIDを比較先にセットしました', 'info');
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
    panel.setStatus('比較元と比較先を入れ替えました', 'info');
  });

  [srcApp, srcGuest, tgtApp, tgtGuest].forEach((el) => {
    el.addEventListener('input', () => {
      saveState();
      refreshSameConnBanner();
      refreshReviewCard();
    });
  });

  // ---- セクション選択 ----
  const cardScope = makeCard({ title: '反映する項目', number: 2, subtitle: '目的に近いセットを選び、必要な項目を調整できます。' });
  const putSections = SECTION_DEFS.filter((d) => d.put);
  const initialSelected = new Set(
    Array.isArray(memoryState.selectedScopes)
      ? memoryState.selectedScopes
      : ['fieldSettings', 'layoutSettings', 'viewSettings']
  );
  const chips = putSections.map((d) => makeChip({
    label: d.label,
    checked: initialSelected.has(d.key),
    value: d.key
  }));
  const chipBox = document.createElement('div');
  chipBox.className = 'kus-lp__chips';
  const scopeGroups = [
    { label: 'フォーム・表示', keys: ['fieldSettings', 'layoutSettings', 'viewSettings', 'reportSettings', 'categories'] },
    { label: '動作・カスタマイズ', keys: ['processSettings', 'actionSettings', 'pluginSettings', 'customizeSettings'] },
    { label: '権限・通知', keys: ['appAcl', 'fieldAcl', 'recordPermissions', 'notifications', 'perRecordNotifications', 'reminderNotifications'] }
  ];
  chipBox.className = 'kus-rl-scope-groups';
  scopeGroups.forEach((group) => {
    const fieldset = document.createElement('fieldset');
    fieldset.className = 'kus-rl-scope-group';
    const legend = document.createElement('legend');
    legend.textContent = group.label;
    fieldset.appendChild(legend);
    const list = document.createElement('div');
    list.className = 'kus-lp__chips';
    chips.filter((c) => group.keys.includes(c.checkbox.value)).forEach((c) => list.appendChild(c.label));
    fieldset.appendChild(list);
    chipBox.appendChild(fieldset);
  });
  cardScope.body.appendChild(chipBox);

  const scopeCountLabel = document.createElement('div');
  scopeCountLabel.className = 'kus-lp__small';
  scopeCountLabel.style.marginTop = '4px';
  cardScope.body.appendChild(scopeCountLabel);

  function collectSelectedScopes() {
    return chips.filter((c) => c.checkbox.checked).map((c) => c.checkbox.value);
  }

  function refreshScopeCount() {
    const sel = collectSelectedScopes().length;
    scopeCountLabel.textContent = `選択中: ${sel} / ${chips.length} セクション`;
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
  presetRow.style.marginTop = '8px';
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
  const preserve = makeCheck({ label: '反映先だけの一覧・グラフ・アクションを保持する', checked: memoryState.preserveTargetOnly !== false, help: '標準は保持。OFFにすると反映元にない設定を削除します。フィールドは常に保持します。' });
  cardScope.body.prepend(preserve.label);
  const safetyNote = document.createElement('p'); safetyNote.className = 'kus-rl-quiet';
  safetyNote.textContent = '反映前のバックアップを自動保存します。変更のない項目は送信せず、書き込みエラーが起きたら中断します。';
  cardOpt.body.appendChild(safetyNote);

  // Lookup mapping
  const lookupDetails = makeDetails('Lookup AppID マッピング（任意）');
  const lookupTa = makeTextarea({
    rows: 3,
    code: true,
    placeholder: '{"旧AppID":"新AppID", ...}',
    value: memoryState.lookupMapText || ''
  });
  lookupTa.setAttribute('aria-label', 'ルックアップの参照アプリID変換');
  lookupDetails.body.appendChild(lookupTa);
  const lookupHint = document.createElement('div');
  lookupHint.className = 'kus-lp__small';
  lookupHint.style.marginTop = '6px';
  lookupHint.textContent = 'フィールドの参照アプリ（ルックアップ）を別 AppID に置換します。差分プレビューにも反映し、実行前に変換先 AppID の存在を確認します。';
  lookupDetails.body.appendChild(lookupHint);
  cardOpt.body.appendChild(lookupDetails.details);

  [sourceEnvironment, preserve.checkbox].forEach((cb) => {
    cb.addEventListener('change', () => {
      saveState();
      refreshSameConnBanner();
      refreshReviewCard();
    });
  });
  lookupTa.addEventListener('input', () => {
    saveState();
    refreshReviewCard();
  });

  panel.body.insertBefore(cardOpt.card, panel.status);

  // ---- プリセット（接続情報＋スコープを保存・読み込み） ----
  const cardPreset = makeCard({ title: 'プリセット（接続+スコープ）', soft: true });
  cardPreset.card.classList.add('kus-rl-card--preset');
  const presetSelect = document.createElement('select');
  presetSelect.className = 'kus-lp__select';
  presetSelect.style.minWidth = '180px';
  const saveBtn = makeButton('現在の設定を保存', 'sub');
  const loadBtn = makeButton('読み込み', 'sub');
  const delBtn = makeButton('削除', 'sub');
  cardPreset.body.appendChild(makeRow([presetSelect, loadBtn, saveBtn, delBtn], { label: '名前' }));
  const presetHint = document.createElement('div');
  presetHint.className = 'kus-lp__small';
  presetHint.textContent = 'プリセットはこのタブを閉じるまで保持されます（ブラウザに永続保存はしません）。';
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
  refreshPresetSelect();

  saveBtn.addEventListener('click', () => {
    const name = window.prompt('プリセット名を入力してください', '');
    if (!name) return;
    const trimmed = name.trim();
    if (!trimmed) {
      panel.setStatus('プリセット名が空です', 'warn');
      return;
    }
    const preset: ReflectLitePreset = {
      name: trimmed,
      createdAt: new Date().toISOString(),
      source: {
        appId: srcApp.value.trim(),
        guestId: srcGuest.value.trim(),
        preview: (sourceEnvironment.value === 'preview')
      },
      target: {
        appId: tgtApp.value.trim(),
        guestId: tgtGuest.value.trim()
      },
      scopes: collectSelectedScopes(),
      lookupMapText: lookupTa.value,
      preserveTargetOnly: preserve.checkbox.checked,
    };
    memoryState.presets = (memoryState.presets || []).filter((p) => p.name !== trimmed);
    memoryState.presets.unshift(preset);
    refreshPresetSelect();
    presetSelect.value = trimmed;
    panel.setStatus(`プリセット「${trimmed}」を保存しました`, 'ok');
  });

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
    lookupTa.value = preset.lookupMapText || '';
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
    panel.setStatus(`プリセット「${name}」を削除しました`, 'info');
  });

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
      preserveTargetOnly: preserve.checkbox.checked
    };
  }

  function currentOptions(scopes = collectSelectedScopes()) {
    return { sourceAppId: srcApp.value.trim(), sourceGuestId: srcGuest.value.trim(), sourcePreview: sourceEnvironment.value === 'preview', sourceBundle: sourceBundleFromJson,
      targetAppId: tgtApp.value.trim(), targetGuestId: tgtGuest.value.trim(), scopes, lookupMap: getLookupValue(tryParseLookupMap(lookupTa.value)), preserveTargetOnly: preserve.checkbox.checked };
  }

  function getPreviewState(scopes = collectSelectedScopes(), lookupState = tryParseLookupMap(lookupTa.value)) {
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
      onRemove: (sectionKey) => setSelectedScopes(collectSelectedScopes().filter((key) => key !== sectionKey))
    });
    previewCard.card.style.display = 'block';
  }

  async function runPreview(scopes: string[], lookupMap: Record<string, string>) {
    memoryState.lastPreview = null;
    clearConfirmation();
    const options = { ...currentOptions(scopes), lookupMap };
    const signature = buildPreviewSignature({ ...options, sourceBundleToken });
    panel.setStatus('アプリ名と接続先を確認中…', 'busy');
    const identities = await resolveReflectAppsStandalone(options);
    const result = await previewReflectStandalone(options, (message) => panel.setStatus(message, 'busy'));
    memoryState.lastPreview = { signature, scopes: [...scopes], at: Date.now(), result, identities };
    rerenderPreviewCard(); refreshReviewCard(); showWorkflowStage('review');
    return result;
  }

  function selectionIssues(result: PreviewReflectResult | undefined, scopes: string[]): string[] {
    return result ? reflectSelectionBlockers(result.entries, scopes, result.sourceFieldCodes, result.targetFieldCodes) : [];
  }

  function refreshReviewCard() {
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
    let message = invalid || getLookupError(lookupState) || (!scopes.length ? '反映する項目を選んでください。' : '変更前と変更後を確認し、最終確認に進んでください。');
    if (!preview) message = '対象を指定して差分を取得してください。';
    else if (!fresh) message = '条件が変わりました。差分を再取得してください。';
    else if (blockers.length) message = '確認できない項目が選択されています。問題を解決して再取得するか、対象から外してください。';
    else if (!plan.effectiveScopes.length) message = '書き込みが必要な項目はありません。反映先だけの項目を保持した場合も書き込み不要です。';
    reviewBody.innerHTML = '';
    if (preview?.identities && fresh) renderReflectRoute(reviewBody, preview.identities, sourceMode === 'json' ? '設定JSON' : sourceEnvironment.value === 'preview' ? 'プレビュー' : '本番');
    const info = document.createElement('div'); info.className = 'kus-rl-next ' + (blockers.length ? 'kus-rl-next--warn' : 'kus-rl-next--info');
    info.textContent = message; reviewBody.appendChild(info);
    const summary = document.createElement('p'); summary.className = 'kus-rl-quiet';
    summary.textContent = fresh ? `反映予定 ${plan.effectiveScopes.length} 項目 / 変更なし ${plan.sameScopes.length} 項目 / 確認が必要 ${plan.errorScopes.length} 項目 · ${formatPreviewStamp(preview!.at)}` : 'この段階では書き込みを行いません。';
    reviewBody.appendChild(summary);
    if (blockers.length) {
      const list = document.createElement('ul'); list.className = 'kus-rl-issues';
      for (const message of blockers) { const item = document.createElement('li'); item.textContent = message; list.appendChild(item); }
      reviewBody.appendChild(list);
    }
    exportPlanBtn.disabled = busy || !fresh;
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

  previewBtn.addEventListener('click', () => {
    if (busy || previewBtn.disabled) return;
    const { scopes, lookupState } = getPreviewState();
    const lookupError = getLookupError(lookupState);
    const lookupMap = getLookupValue(lookupState);
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
    }, `差分プレビュー完了（${scopes.length}セクションを比較）`);
  });

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
    renderReflectRoute(confirmBody, state.preview.identities, sourceMode === 'json' ? '設定JSON' : sourceEnvironment.value === 'preview' ? 'プレビュー' : '本番');
    const entries = state.preview.result.entries.filter(entry => state.scopes.includes(entry.sectionKey) && entry.status === 'change');
    const summary = document.createElement('p'); summary.textContent = `反映する項目（${entries.length}）：${entries.map(entry => entry.label).join('、')}`; confirmBody.appendChild(summary);
    const reasons = highImpactReasons(); targetCheckRow.hidden = !reasons.length;
    if (reasons.length) { const note = document.createElement('p'); note.className = 'kus-rl-next kus-rl-next--warn'; note.textContent = reasons.join('。') + '。反映先IDを入力して確認してください。'; confirmBody.appendChild(note); }
    const removals = entries.flatMap(entry => entry.changes.filter(change => change.kind === '削除').map(change => ({ label: entry.label, change })));
    if (removals.length) {
      const list = document.createElement('ul'); list.className = 'kus-rl-issues';
      for (const { label, change } of removals.slice(0, 30)) {
        const item = document.createElement('li'); item.textContent = `${label} / ${change.path}：${change.before.slice(0, 180)}${change.before.length > 180 ? '…' : ''}`; list.appendChild(item);
      }
      if (removals.length > 30) { const item = document.createElement('li'); item.textContent = `ほか ${removals.length - 30} 件。下の各項目の内訳、または反映計画JSONで全件を確認してください。`; list.appendChild(item); }
      confirmBody.appendChild(list);
    }
    const policy = document.createElement('p'); policy.className = 'kus-rl-quiet';
    policy.textContent = '反映前の設定JSONを自動保存します。実行直前に設定を再取得し、確認後の変更があれば中止します。途中エラーでは中断します。複数項目の一括取消はできません。本番公開はアプリ設定画面で行います。'; confirmBody.appendChild(policy);
    for (const entry of entries) appendReflectChanges(confirmBody, entry);
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
      preserveTargetOnly: preserve.checkbox.checked, scopes: state.scopes, entries: state.preview.result.entries.filter(entry => state.scopes.includes(entry.sectionKey)), baseline: state.preview.result.baseline };
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a'); link.href = url; link.download = `プレビュー反映計画_App${tgtApp.value.trim()}.json`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 5000);
  });

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

  // 直近結果カード
  const lastResultCard = makeCard({ title: '直近の実行結果', soft: true });
  const lastResultBody = document.createElement('div');
  lastResultBody.className = 'kus-lp__small';
  lastResultCard.body.appendChild(lastResultBody);
  const lastResultActions = document.createElement('div');
  lastResultActions.className = 'kus-lp__btn-row';
  lastResultActions.style.marginTop = '8px';
  const retryFailedBtn = makeButton('失敗・未実行だけ選択', 'sub');
  retryFailedBtn.title = '失敗または中断で未実行のセクションだけを反映対象に選び直します';
  const openTargetBtn = makeButton('比較先の設定画面を開く', 'sub');
  openTargetBtn.title = '比較先アプリの設定画面を新しいタブで開きます（運用環境への反映はそこから実行できます）';
  const exportResultBtn = makeButton('実行結果JSONを保存', 'sub');
  exportResultBtn.title = '実行時の対象、セクション別結果、ログを監査用JSONとして保存します';
  lastResultActions.appendChild(retryFailedBtn);
  lastResultActions.appendChild(exportResultBtn);
  lastResultActions.appendChild(openTargetBtn);
  lastResultCard.body.appendChild(lastResultActions);
  lastResultCard.card.style.display = 'none';
  panel.body.insertBefore(lastResultCard.card, panel.status);

  retryFailedBtn.addEventListener('click', () => {
    const retryScopes = memoryState.lastResult?.retryScopes || [];
    if (!retryScopes.length) return;
    setSelectedScopes(retryScopes);
    showWorkflowStage('setup');
    panel.setStatus(`失敗・未実行の ${retryScopes.length} セクションを選択しました。差分プレビューで確認してから再実行してください。`, 'info');
    cardScope.card.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  openTargetBtn.addEventListener('click', () => {
    const last = memoryState.lastResult;
    if (!last?.appId) return;
    const base = last.guestId ? `/k/guest/${encodeURIComponent(last.guestId)}` : '/k';
    const url = `${window.location.origin}${base}/admin/app/flow?app=${encodeURIComponent(last.appId)}`;
    window.open(url, '_blank', 'noopener');
    panel.setStatus(`比較先アプリ #${last.appId} の設定画面を開きました`, 'info');
  });

  exportResultBtn.addEventListener('click', () => {
    const last = memoryState.lastResult;
    if (!last) return;
    const payload = {
      schemaVersion: 1,
      executedAt: new Date(last.at).toISOString(),
      durationMs: last.durationMs,
      summary: { ok: last.ok, ng: last.ng, pending: last.pending, skip: last.skip },
      retryScopes: last.retryScopes,
      ...last.report
    };
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `プレビュー反映結果_App${last.appId}_${new Date(last.at).toISOString().replace(/[:.]/g, '-')}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  });

  function renderLastResult() {
    const last = memoryState.lastResult;
    if (!last) {
      lastResultCard.card.style.display = 'none';
      return;
    }
    const stamp = new Date(last.at).toLocaleString();
    const hasIssue = last.ng > 0 || last.pending > 0;
    const tone = hasIssue ? 'color:#9a3412' : 'color:#065f46';
    const failedSummary = last.failedLabels.length
      ? `<div>失敗: ${escapeHtml(last.failedLabels.slice(0, 5).join(' / '))}${last.failedLabels.length > 5 ? ` ほか ${last.failedLabels.length - 5} 件` : ''}</div>`
      : '';
    const statusLabels: Record<ApplySectionOutcome['status'], string> = { ok: '成功', ng: '失敗', pending: '未実行', skip: '変更なし' };
    const sectionRows = last.report.sections.map((section) => `
      <div class="kus-rl-result-row" data-status="${section.status}">
        <span class="kus-rl-result-row__status">${statusLabels[section.status]}</span>
        <div><div class="kus-rl-result-row__label">${escapeHtml(section.label)}</div>${section.message ? `<div class="kus-rl-result-row__message">${escapeHtml(section.message)}</div>` : ''}</div>
      </div>`).join('');
    lastResultBody.innerHTML = `<div style="${tone};font-weight:600">${hasIssue ? '⚠ 一部エラー' : '✓ 全成功'}</div>`
      + `<div>比較先 #${escapeHtml(last.appId || '-')} / 成功 ${last.ok} / 失敗 ${last.ng} / 未実行 ${last.pending} / 変更なし ${last.skip}</div>`
      + failedSummary
      + `<div>${stamp} / ${(last.durationMs / 1000).toFixed(1)} 秒</div>`
      + `<div class="kus-rl-result-list" aria-label="セクション別実行結果">${sectionRows}</div>`
      + (hasIssue
        ? '<div style="margin-top:4px">「失敗・未実行だけ選択」で対象を絞って再実行できます。</div>'
        : '<div style="margin-top:4px">反映先はプレビューです。運用環境への反映（デプロイ）は比較先の設定画面から実行してください。</div>');
    retryFailedBtn.style.display = last.retryScopes.length ? '' : 'none';
    exportResultBtn.style.display = '';
    openTargetBtn.style.display = last.appId ? '' : 'none';
    lastResultCard.card.style.display = 'block';
  }
  renderLastResult();

  runBtn.addEventListener('click', async () => {
    if (busy || runBtn.disabled || activeStage !== 'confirm' || !confirmationReady()) return;
    const { scopes, lookupState } = getPreviewState();
    const lookupError = getLookupError(lookupState);
    const lookupMap = getLookupValue(lookupState);
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
      const applyOptions = { ...currentOptions(plan.effectiveScopes), reviewBaseline: previewResult.baseline, doDeploy: false, doBackup: true, stopOnError: true };
      clearConfirmation();

      logCard.card.style.display = 'block';
      logPre.style.display = 'block';
      logPre.textContent = '';
      showWorkflowStage('result');
      // 反映開始後は、成功・部分失敗を問わず反映前の比較結果を再使用しない。
      memoryState.lastPreview = null;
      memoryState.lastResult = null;
      renderLastResult();
      const startedAt = Date.now();
      const applyOutcome = await runApplyPreviewStandalone(
        applyOptions,
        (m: string, e?: boolean) => panel.setStatus(m, e ? 'err' : 'busy'),
        (logsArr: string[]) => {
          logPre.textContent = logsArr.join('\n');
          logPre.scrollTop = logPre.scrollHeight;
        }
      );

      const counts = summarizeApplyOutcome(applyOutcome.sections);
      memoryState.lastResult = {
        ok: counts.ok,
        ng: counts.ng,
        pending: counts.pending,
        skip: counts.skip,
        at: Date.now(),
        durationMs: Date.now() - startedAt,
        appId: applyOptions.targetAppId,
        guestId: applyOptions.targetGuestId,
        retryScopes: collectRetrySectionKeys(applyOutcome.sections),
        failedLabels: applyOutcome.sections.filter((s) => s.status === 'ng').map((s) => s.label),
        report: {
          source: {
            appId: applyOptions.sourceBundle ? String((applyOptions.sourceBundle as any)?.appId || '') : applyOptions.sourceAppId,
            guestId: applyOptions.sourceGuestId || '',
            environment: sourceMode === 'json' ? 'json' : applyOptions.sourcePreview ? 'preview' : 'production'
          },
          target: { appId: applyOptions.targetAppId, guestId: applyOptions.targetGuestId || '', environment: 'preview' },
          preserveTargetOnly: !!applyOptions.preserveTargetOnly,
          scopes: plan.effectiveScopes.slice(),
          sections: applyOutcome.sections,
          logs: applyOutcome.logs.slice()
        }
      };
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
    panel.setStatus('プレビュー反映が完了しました。運用環境への反映は「比較先の設定画面を開く」からデプロイしてください。', 'ok');
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
  stages.setup.innerHTML = '<header class="kus-rl-stage-head"><h2>どの設定を、どこへ反映しますか？</h2><p>比較元と比較先を指定し、反映したい項目を選びます。</p></header>';
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
  setupGrid.append(advanced.details, presetDetails.details);
  stages.setup.appendChild(setupGrid);
  [reviewCard.card, previewCard.card].forEach((node) => stages.review.appendChild(node));
  [lastResultCard.card, logCard.card].forEach((node) => stages.result.appendChild(node));
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
    let message = `${scopes.length} 項目を比較します。書き込みは行いません。`;
    if (activeStage === 'review') message = !fresh ? '差分の取得が必要です。' : confirmBtn.disabled ? '確認が必要な項目、または変更の有無を確認してください。' : `${plan?.effectiveScopes.length} 項目の内容を確認し、最終確認へ進んでください。`;
    if (activeStage === 'confirm') message = fresh && confirmedToken ? '反映前バックアップを自動保存 / エラー時は中断 / 本番公開は行いません' : '条件が変わりました。差分の取得と最終確認をやり直してください。';
    if (activeStage === 'result') message = '結果を確認してください。再実行には差分の再取得が必要です。';
    const sourceLabel = fresh && preview?.identities ? reflectIdentityLabel(preview.identities, 'source', sourceMode === 'json' ? 'JSON' : sourceEnvironment.value === 'preview' ? 'プレビュー' : '本番') : `反映元 #${srcApp.value.trim() || '未入力'}`;
    const targetLabel = fresh && preview?.identities ? reflectIdentityLabel(preview.identities, 'target', '') : `反映先 #${tgtApp.value.trim() || '未入力'} / プレビュー`;
    // The complete route stays in the confirmation card. Keep the fixed footer short on small screens.
    dockCopy.innerHTML = activeStage === 'confirm' && fresh && preview?.identities
      ? `<strong>書き込み先 #${escapeHtml(preview.identities.target.appId)} · プレビュー</strong>${escapeHtml(confirmedToken ? '内容を確認してから反映してください。' : '条件が変わりました。差分を再取得してください。')}`
      : `<strong>${escapeHtml(sourceLabel)} → ${escapeHtml(targetLabel)}</strong>${escapeHtml(message)}`;
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
    workspace.inert = value;
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

function getSectionLabel(key: string): string {
  return SECTION_DEFS.find((def) => def.key === key)?.label || key;
}

function formatPreviewStamp(at: number): string {
  const diffSec = Math.max(0, Math.floor((Date.now() - at) / 1000));
  if (diffSec < 60) return `たった今 (${new Date(at).toLocaleTimeString()})`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}分前 (${new Date(at).toLocaleTimeString()})`;
  return new Date(at).toLocaleString();
}

function buildSkipSummary(plan: ExecutionPlan): string {
  const parts: string[] = [];
  if (plan.skippedSameScopes.length > 0) parts.push(`一致除外 ${plan.skippedSameScopes.length}件`);
  if (plan.skippedErrorScopes.length > 0) parts.push(`失敗除外 ${plan.skippedErrorScopes.length}件`);
  return parts.length ? parts.join(' / ') : '除外なし';
}

function setButtonText(button: HTMLButtonElement, text: string) {
  const spans = button.querySelectorAll('span');
  const label = spans[spans.length - 1] as HTMLElement | undefined;
  if (label) label.textContent = text;
  else button.textContent = text;
}

function tryParseLookupMap(text: string): LookupParseResult {
  const t = text.trim();
  if (!t) return { ok: true, value: {} };
  try {
    const parsed = JSON.parse(t);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return { ok: false, error: '参照先変換は {"旧AppID":"新AppID"} 形式のJSONを入力してください。' };
    const out: Record<string, string> = Object.create(null);
    for (const [k, v] of Object.entries(parsed || {})) {
      if (!/^[1-9]\d*$/.test(k) || !/^[1-9]\d*$/.test(String(v))) return { ok: false, error: '参照先変換のアプリIDには正の整数を指定してください。' };
      out[k] = String(v);
    }
    return { ok: true, value: out };
  } catch {
    return { ok: false, error: 'Lookup マッピング JSON が壊れています。JSON 形式を修正してください。' };
  }
}

function getLookupError(result: LookupParseResult): string {
  return 'error' in result ? result.error : '';
}

function getLookupValue(result: LookupParseResult): Record<string, string> {
  return 'value' in result ? result.value : {};
}

function buildPreviewSignature(args: {
  sourceAppId: string;
  sourceGuestId: string;
  sourcePreview: boolean;
  /** 比較元JSONを読み込んでいる場合の識別子（ファイルが変わったら差分プレビューを古い扱いにする） */
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
      const statusLabel = group.tone === 'change' ? '差分あり' : (group.tone === 'same' ? '一致' : '取得失敗');
      const metaPills: string[] = [];
      const statePills: string[] = [];
      if (entry.fieldStats) {
        metaPills.push(`<span class="kus-rl-preview-mini">追加 ${entry.fieldStats.add}</span>`);
        metaPills.push(`<span class="kus-rl-preview-mini">更新 ${entry.fieldStats.update}</span>`);
        metaPills.push(`<span class="kus-rl-preview-mini">比較先のみ ${entry.fieldStats.tgtOnly}</span>`);
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
