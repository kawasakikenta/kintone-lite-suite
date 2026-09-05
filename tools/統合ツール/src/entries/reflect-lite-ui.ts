'use strict';

import { DEFAULT_APP_ID, SECTION_DEFS } from '../constants.js';
import {
  runApplyPreviewStandalone,
  previewReflectStandalone,
  preflightLookupMapStandalone,
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
  type LitePanelHandle
} from './litePanelTheme.js';
import { createAppSearchControl } from './appSearchControl.js';
import { pickAllSettingsBundles } from '../settingsBundleImport.js';
import { collectRetrySectionKeys, summarizeApplyOutcome } from '../reflect/applyOutcome.js';

// =============================================================================
// メモリ状態（リロードで消える。lite はブラウザ永続ストレージを使わない方針）
// =============================================================================

interface PreviewSnapshot {
  signature: string;
  scopes?: string[];
  at: number;
  result: PreviewReflectResult;
}

interface LiteMemoryState {
  sourceAppId?: string;
  sourceGuestId?: string;
  targetAppId?: string;
  targetGuestId?: string;
  sourcePreview?: boolean;
  stopOnError?: boolean;
  doBackup?: boolean;
  onlyChanged?: boolean;
  excludePreviewErrors?: boolean;
  selectedScopes?: string[];
  lookupMapText?: string;
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
  } | null;
  /** ユーザー定義プリセット（接続情報＋スコープ） */
  presets?: ReflectLitePreset[];
}

interface ReflectLitePreset {
  name: string;
  createdAt: string;
  source: { appId: string; guestId: string; preview: boolean };
  target: { appId: string; guestId: string };
  scopes: string[];
  lookupMapText: string;
  doBackup: boolean;
  stopOnError: boolean;
  onlyChanged: boolean;
  excludePreviewErrors: boolean;
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
#kus-reflect-lite .kus-rl-nav{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;padding:10px 24px;background:#fff;border-bottom:1px solid #e2e8f0;flex-shrink:0}
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
@media(max-width:720px){
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
  let showWorkflowStage: (stage: 'setup' | 'review' | 'result') => void = () => {};
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
    sourceJsonBundles = pickAllSettingsBundles(JSON.parse(await file.text()), 'source');
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
        if (guestId && !srcGuest.value.trim()) srcGuest.value = guestId;
        saveState(); refreshSameConnBanner(); refreshReviewCard();
      } },
      { label: '比較先', apply: (id, _name, guestId) => {
        tgtApp.value = id;
        if (guestId && !tgtGuest.value.trim()) tgtGuest.value = guestId;
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
      : putSections.map((d) => d.key)
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
  const backup = makeCheck({
    label: '比較先プレビューのバックアップを保存',
    checked: memoryState.doBackup !== false,
    help: '反映前に比較先プレビューの設定を JSON で書き出します'
  });
  const srcPreview = makeCheck({
    label: 'プレビューの設定を取得',
    checked: memoryState.sourcePreview !== false,
    help: 'OFF にすると比較元の本番（運用中）設定を取得します'
  });
  const stop = makeCheck({
    label: 'エラー時に中断する',
    checked: memoryState.stopOnError !== false,
    help: '途中で失敗したらそこで止めます（推奨）'
  });
  const onlyChanged = makeCheck({
    label: '差分ありセクションだけ実行',
    checked: memoryState.onlyChanged !== false,
    help: '最新の差分プレビュー結果を使い、一致セクションは実行対象から自動で外します'
  });
  const excludePreviewErrors = makeCheck({
    label: '取得失敗セクションを自動除外',
    checked: memoryState.excludePreviewErrors !== false,
    help: '差分プレビューで取得失敗したセクションは、実行対象から自動で外します'
  });
  const optGrid = document.createElement('div');
  optGrid.className = 'kus-lp__check-grid';
  optGrid.appendChild(backup.label);
  sourceAppFields.insertBefore(srcPreview.label, sourceGuestDetails.details);
  optGrid.appendChild(stop.label);
  optGrid.appendChild(onlyChanged.label);
  optGrid.appendChild(excludePreviewErrors.label);
  cardOpt.body.appendChild(optGrid);

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

  [backup.checkbox, srcPreview.checkbox, stop.checkbox, onlyChanged.checkbox, excludePreviewErrors.checkbox].forEach((cb) => {
    cb.addEventListener('change', () => {
      saveState();
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
        preview: srcPreview.checkbox.checked
      },
      target: {
        appId: tgtApp.value.trim(),
        guestId: tgtGuest.value.trim()
      },
      scopes: collectSelectedScopes(),
      lookupMapText: lookupTa.value,
      doBackup: backup.checkbox.checked,
      stopOnError: stop.checkbox.checked,
      onlyChanged: onlyChanged.checkbox.checked,
      excludePreviewErrors: excludePreviewErrors.checkbox.checked
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
    srcPreview.checkbox.checked = !!preset.source.preview;
    backup.checkbox.checked = !!preset.doBackup;
    stop.checkbox.checked = !!preset.stopOnError;
    onlyChanged.checkbox.checked = preset.onlyChanged !== false;
    excludePreviewErrors.checkbox.checked = preset.excludePreviewErrors !== false;
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
      sourcePreview: srcPreview.checkbox.checked,
      stopOnError: stop.checkbox.checked,
      doBackup: backup.checkbox.checked,
      onlyChanged: onlyChanged.checkbox.checked,
      excludePreviewErrors: excludePreviewErrors.checkbox.checked,
      selectedScopes: collectSelectedScopes(),
      lookupMapText: lookupTa.value
    };
  }

  function getPreviewState(scopes = collectSelectedScopes(), lookupState = tryParseLookupMap(lookupTa.value)) {
    const preview = memoryState.lastPreview || null;
    const coveredScopes = preview?.scopes || scopes;
    const signature = lookupState.ok
      ? buildPreviewSignature({
        sourceAppId: srcApp.value.trim(),
        sourceGuestId: srcGuest.value.trim(),
        sourcePreview: srcPreview.checkbox.checked,
        sourceBundleToken,
        targetAppId: tgtApp.value.trim(),
        targetGuestId: tgtGuest.value.trim(),
        scopes: coveredScopes,
        lookupMap: lookupState.value
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

    let effective = [...selectedSet];
    let skippedSameScopes: string[] = [];
    let skippedErrorScopes: string[] = [];

    if (onlyChanged.checkbox.checked) {
      skippedSameScopes = effective.filter((key) => sameSet.has(key));
      skippedErrorScopes = effective.filter((key) => errorSet.has(key));
      effective = effective.filter((key) => changedSet.has(key));
    }
    if (excludePreviewErrors.checkbox.checked) {
      const additionallySkipped = effective.filter((key) => errorSet.has(key));
      skippedErrorScopes = [...new Set([...skippedErrorScopes, ...additionallySkipped])];
      effective = effective.filter((key) => !errorSet.has(key));
    }

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
    const signature = buildPreviewSignature({
      sourceAppId: srcApp.value.trim(),
      sourceGuestId: srcGuest.value.trim(),
      sourcePreview: srcPreview.checkbox.checked,
      sourceBundleToken,
      targetAppId: tgtApp.value.trim(),
      targetGuestId: tgtGuest.value.trim(),
      scopes,
      lookupMap
    });
    const result = await previewReflectStandalone(
      {
        sourceAppId: srcApp.value.trim(),
        sourceGuestId: srcGuest.value.trim(),
        sourcePreview: srcPreview.checkbox.checked,
        sourceBundle: sourceBundleFromJson,
        targetAppId: tgtApp.value.trim(),
        targetGuestId: tgtGuest.value.trim(),
        scopes,
        lookupMap
      },
      (m) => panel.setStatus(m, 'busy')
    );
    memoryState = {
      ...memoryState,
      lastPreview: {
        signature,
        scopes: [...scopes],
        at: Date.now(),
        result
      }
    };
    rerenderPreviewCard();
    refreshReviewCard();
    showWorkflowStage('review');
    return result;
  }

  function refreshReviewCard() {
    const { scopes, lookupState, preview, fresh } = getPreviewState();
    const lookupError = getLookupError(lookupState);
    const src = srcApp.value.trim();
    const tgt = tgtApp.value.trim();
    const sameConn = !sourceBundleFromJson && !!src && src === tgt && srcGuest.value.trim() === tgtGuest.value.trim();
    const riskyHit = scopes.filter((key) => RISKY_SCOPE_KEYS.has(key));
    const previewResult = preview?.result || null;
    const plan = fresh ? getExecutionPlan(scopes, previewResult) : getExecutionPlan(scopes, null);
    const canRunBase = (sourceMode === 'json' ? !!sourceBundleFromJson : !!src) && !!tgt && scopes.length > 0 && lookupState.ok;
    previewBtn.disabled = busy || !canRunBase;
    changedOnlyBtn.disabled = busy || !(fresh && previewResult && previewResult.changedSections > 0);
    runBtn.disabled = busy || !canRunBase || !fresh || !plan.effectiveScopes.length;

    if (fresh && previewResult) {
      if (plan.effectiveScopes.length > 0) {
        setButtonText(runBtn, `プレビュー反映を実行（予定 ${plan.effectiveScopes.length}）`);
      } else if (previewResult.changedSections > 0) {
        setButtonText(runBtn, `プレビュー反映を実行（差分 ${previewResult.changedSections}）`);
      } else {
        setButtonText(runBtn, 'プレビュー反映を実行（差分なし）');
      }
    } else {
      setButtonText(runBtn, 'プレビュー反映を実行');
    }

    const issues: string[] = [];
    if (!src && !sourceBundleFromJson) issues.push('比較元アプリIDまたは比較元JSONが未入力です。');
    if (!tgt) issues.push('比較先アプリIDが未入力です。');
    if (!scopes.length) issues.push('反映対象セクションが未選択です。');
    if (lookupError) issues.push(lookupError);
    if (sameConn) issues.push('比較元と比較先が同一接続です。');
    if (riskyHit.length) issues.push(`影響範囲の広いセクションを含みます: ${riskyHit.map((key) => getSectionLabel(key)).join(', ')}`);
    if (!backup.checkbox.checked) issues.push('バックアップ保存が OFF です。');
    if (!stop.checkbox.checked) issues.push('エラー時中断が OFF です。');
    if (!preview) {
      issues.push('差分プレビューが未取得です。');
    } else if (!fresh) {
      issues.push('条件が変わりました。差分を再取得してから反映してください。');
    } else if (previewResult) {
      if (previewResult.errorSections > 0) issues.push(`差分プレビューで取得失敗が ${previewResult.errorSections} 件あります。`);
      if (previewResult.changedSections === 0) issues.push('差分プレビューでは変更対象がありません。通常は反映不要です。');
      if (!plan.effectiveScopes.length) issues.push('現在の実行オプションでは、実行対象セクションが 0 件です。');
    }

    let nextTone: 'ok' | 'info' | 'warn' = 'warn';
    const nextTitle = '次の操作';
    let nextText = '比較元 / 比較先 / セクションを確認してください。';
    if ((!src && !sourceBundleFromJson) || !tgt) {
      nextText = '比較元（アプリIDまたはJSON）と比較先のアプリIDを埋めてください。比較先は通常、いま開いているアプリです。';
    } else if (!scopes.length) {
      nextText = '反映したいセクションを選んでください。迷う場合は「フォームのみ」から始めるのが安全です。';
    } else if (!lookupState.ok) {
      nextText = lookupError || 'Lookup AppID マッピング JSON を修正してください。';
    } else if (!preview) {
      nextTone = 'info';
      nextText = '差分プレビューを更新して、どのセクションに差分があるか確認してください。';
    } else if (!fresh) {
      nextTone = 'info';
      nextText = '条件が変わりました。「差分を再取得」で変更内容を確認してください。';
    } else if (!plan.effectiveScopes.length) {
      nextTone = 'info';
      nextText = '現在のオプションでは実行対象がありません。差分ありだけ実行 / 取得失敗除外の設定か、選択セクションを見直してください。';
    } else if (previewResult && previewResult.errorSections > 0) {
      nextText = '取得失敗セクションを確認してから実行してください。必要なら対象セクションを絞って再プレビューします。';
    } else if (previewResult && previewResult.changedSections === 0) {
      nextTone = 'info';
      nextText = '差分なしです。反映は通常不要です。必要ならセクション選択か比較元 / 比較先を見直してください。';
    } else {
      nextTone = 'ok';
      nextText = '差分プレビューで内容を確認できています。そのままプレビュー反映へ進めます。';
    }

    reviewBody.innerHTML = ''
      + '<div class="kus-rl-review-grid">'
      + `<div class="kus-rl-stat"><div class="kus-rl-stat__label">反映予定</div><div class="kus-rl-stat__value">${fresh ? plan.effectiveScopes.length + ' 項目' : '差分の確認が必要'}</div><div class="kus-rl-stat__meta">${escapeHtml(fresh ? buildSkipSummary(plan) : '差分を取得すると反映予定を表示します')}</div></div>`
      + `<div class="kus-rl-stat"><div class="kus-rl-stat__label">確認状況</div><div class="kus-rl-stat__value">${fresh ? '確認済み' : preview ? '再取得が必要' : '未取得'}</div><div class="kus-rl-stat__meta">${preview ? escapeHtml(formatPreviewStamp(preview.at)) : 'アプリ設定への書き込みはまだ行いません'}</div></div>`
      + '</div>'
      + `<div class="kus-rl-next kus-rl-next--${nextTone}"><strong>${nextTitle}</strong>${escapeHtml(nextText)}</div>`
      + (issues.length ? `<details class="kus-lp__details"><summary>注意点を確認（${issues.length}件）</summary><ul class="kus-rl-issues">${issues.map((line) => '<li>' + escapeHtml(line) + '</li>').join('')}</ul></details>` : '');

    rerenderPreviewCard();
    refreshWorkflow();
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
  lastResultActions.appendChild(retryFailedBtn);
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
    lastResultBody.innerHTML = `<div style="${tone};font-weight:600">${hasIssue ? '⚠ 一部エラー' : '✓ 全成功'}</div>`
      + `<div>比較先 #${escapeHtml(last.appId || '-')} / OK ${last.ok} / NG ${last.ng}${last.pending ? ` / 未実行 ${last.pending}` : ''}</div>`
      + failedSummary
      + `<div>${stamp}</div>`
      + (hasIssue
        ? '<div style="margin-top:4px">「失敗・未実行だけ選択」で対象を絞って再実行できます。</div>'
        : '<div style="margin-top:4px">反映先はプレビューです。運用環境への反映（デプロイ）は比較先の設定画面から実行してください。</div>');
    retryFailedBtn.style.display = last.retryScopes.length ? '' : 'none';
    openTargetBtn.style.display = last.appId ? '' : 'none';
    lastResultCard.card.style.display = 'block';
  }
  renderLastResult();

  runBtn.addEventListener('click', async () => {
    if (busy || runBtn.disabled) return;
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

      if (!confirmReflectRisk(panel, {
        sourceAppId: srcApp.value.trim(),
        sourceGuestId: srcGuest.value.trim(),
        hasSourceBundle: !!sourceBundleFromJson,
        targetAppId: tgtApp.value.trim(),
        targetGuestId: tgtGuest.value.trim(),
        scopes,
        effectiveScopes: plan.effectiveScopes,
        skippedSameScopes: plan.skippedSameScopes,
        skippedErrorScopes: plan.skippedErrorScopes,
        doBackup: backup.checkbox.checked,
        stopOnError: stop.checkbox.checked,
        lookupMapText: lookupTa.value,
        preview: previewState.preview?.result || previewResult || undefined
      })) {
        return { cancelled: true };
      }

      // Lookup preflight
      if (Object.keys(lookupMap).length) {
        panel.setStatus('Lookup マッピング先 AppID を確認中…', 'busy');
        const pf = await preflightLookupMapStandalone(lookupMap, { targetGuestId: tgtGuest.value.trim() });
        if (!pf.ok) {
          const detail = pf.missing.map((m) => ` - ${m.from} → ${m.to || '(空)'}: ${m.reason}`).join('\n');
          const cont = window.confirm(`Lookup 変換ルールに問題があります:\n${detail}\n\n[OK] 続行 / [キャンセル] 中断`);
          if (!cont) throw new Error('Lookup プリフライトで中断しました');
        }
      }

      logCard.card.style.display = 'block';
      logPre.style.display = 'block';
      logPre.textContent = '';
      showWorkflowStage('result');
      // 反映開始後は、成功・部分失敗を問わず反映前の比較結果を再使用しない。
      memoryState.lastPreview = null;
      memoryState.lastResult = null;
      renderLastResult();
      const applyOutcome = await runApplyPreviewStandalone(
        {
          sourceAppId: srcApp.value.trim(),
          sourceGuestId: srcGuest.value.trim(),
          sourcePreview: srcPreview.checkbox.checked,
          sourceBundle: sourceBundleFromJson,
          targetAppId: tgtApp.value.trim(),
          targetGuestId: tgtGuest.value.trim(),
          scopes: plan.effectiveScopes,
          lookupMap,
          doDeploy: false,
          doBackup: backup.checkbox.checked,
          stopOnError: stop.checkbox.checked
        },
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
        at: Date.now(),
        appId: tgtApp.value.trim(),
        guestId: tgtGuest.value.trim(),
        retryScopes: collectRetrySectionKeys(applyOutcome.sections),
        failedLabels: applyOutcome.sections.filter((s) => s.status === 'ng').map((s) => s.label)
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

  // ---- 3ステップ・ワークフロー ----
  // 現在の段階に必要な主操作だけを固定フッターに置く。
  const nav = document.createElement('nav');
  nav.className = 'kus-rl-nav';
  nav.setAttribute('aria-label', 'プレビュー反映の手順');
  nav.setAttribute('role', 'tablist');
  const stageDefs = [
    { id: 'setup' as const, number: '1', label: '対象を選ぶ', copy: 'アプリと反映項目' },
    { id: 'review' as const, number: '2', label: '差分を確認', copy: '変更内容を見て反映' },
    { id: 'result' as const, number: '3', label: '反映結果', copy: '結果と次の操作' }
  ];
  const stages = {} as Record<'setup' | 'review' | 'result', HTMLElement>;
  const navButtons = {} as Record<'setup' | 'review' | 'result', HTMLButtonElement>;
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
    button.addEventListener('click', () => showWorkflowStage(def.id));
    button.addEventListener('keydown', (event) => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const current = stageDefs.findIndex((item) => item.id === def.id);
      const direction = event.key === 'ArrowRight' ? 1 : -1;
      const next = stageDefs[event.key === 'Home' ? 0 : event.key === 'End' ? stageDefs.length - 1 : (current + direction + stageDefs.length) % stageDefs.length];
      showWorkflowStage(next.id);
    });
  }
  stages.setup.innerHTML = '<header class="kus-rl-stage-head"><h2>どの設定を、どこへ反映しますか？</h2><p>比較元と比較先を指定し、反映したい項目を選びます。</p></header>';
  stages.review.innerHTML = '<header class="kus-rl-stage-head"><h2>差分と実行予定を確認</h2><p>実際に変更されるセクションと注意点を確認します。</p></header>';
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
  backBtn.addEventListener('click', () => showWorkflowStage('setup'));
  const nextBtn = makeButton('差分を確認する', 'primary');
  nextBtn.addEventListener('click', () => {
    if (getPreviewState().fresh) showWorkflowStage('review');
    else previewBtn.click();
  });
  dockActions.append(backBtn, previewBtn, nextBtn, runBtn);
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
  let activeStage: 'setup' | 'review' | 'result' = 'setup';
  refreshWorkflow = () => {
    const { scopes, fresh, preview, lookupState } = getPreviewState();
    const plan = fresh ? getExecutionPlan(scopes, preview?.result) : null;
    backBtn.hidden = activeStage === 'setup';
    nextBtn.hidden = activeStage !== 'setup';
    previewBtn.hidden = activeStage !== 'review';
    runBtn.hidden = activeStage !== 'review';
    backBtn.disabled = busy;
    nextBtn.disabled = previewBtn.disabled || busy;
    setButtonText(nextBtn, fresh ? '確認した差分へ進む' : '差分を確認する');
    setButtonText(previewBtn, '差分を再取得');
    previewBtn.classList.toggle('kus-lp__btn--primary', !fresh);
    previewBtn.classList.toggle('kus-lp__btn--sub', fresh);
    resultEmpty.hidden = !!memoryState.lastResult || logCard.card.style.display !== 'none';
    let message = `${scopes.length} 項目を比較します。設定の書き込みは行いません。`;
    if (sourceMode === 'json' && !sourceBundleFromJson) message = '比較元の設定JSONを選んでください。';
    else if (!srcApp.value.trim() || !tgtApp.value.trim()) message = '比較元と比較先のアプリIDを入力してください。';
    else if (!scopes.length) message = '反映したい項目を1つ以上選んでください。';
    else if (!lookupState.ok) message = '詳細設定の参照先変換JSONを修正してください。';
    else if (activeStage === 'review') message = !fresh ? '条件が変わったか、差分が未取得です。再取得して確認してください。'
      : plan?.effectiveScopes.length ? `${plan.effectiveScopes.length} 項目を反映予定 · バックアップ ${backup.checkbox.checked ? 'あり' : 'なし'}`
      : '反映予定は0件です。差分と取得失敗の有無を確認してください。';
    else if (activeStage === 'result') message = memoryState.lastResult ? '結果を確認し、比較先の設定画面へ進めます。' : '反映結果はここに表示されます。';
    const sourceLabel = sourceMode === 'json' ? `設定JSON #${sourceBundleFromJson?.appId || '未読込'}`
      : `#${srcApp.value.trim() || '未入力'}${srcGuest.value.trim() ? `（ゲスト ${srcGuest.value.trim()}）` : ''}・${srcPreview.checkbox.checked ? 'プレビュー' : '本番'}`;
    const targetLabel = `#${tgtApp.value.trim() || '未入力'}${tgtGuest.value.trim() ? `（ゲスト ${tgtGuest.value.trim()}）` : ''}・プレビュー`;
    dockCopy.innerHTML = `<strong>${escapeHtml(sourceLabel)} → ${escapeHtml(targetLabel)}</strong>${escapeHtml(message)}`;
    const advancedSummary = advanced.details.querySelector('summary');
    if (advancedSummary) advancedSummary.textContent = `詳細設定 · バックアップ${backup.checkbox.checked ? 'あり' : 'なし'} / ${stop.checkbox.checked ? 'エラー時に中断' : 'エラー後も続行'}${lookupTa.value.trim() ? ' / 参照先変換あり' : ''}`;
    panel.setPrimaryAction(activeStage === 'setup' ? nextBtn : activeStage === 'review' ? (fresh ? runBtn : previewBtn) : backBtn);
  };
  showWorkflowStage = (active) => {
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
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(parsed || {})) {
      if (k && v != null) out[String(k).trim()] = String(v).trim();
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
    lookupPairs
  });
}

function filterPreviewEntries(entries: PreviewEntry[], keyword: string, status = 'all'): PreviewEntry[] {
  entries = entries.filter((entry) => status === 'all' || (status === 'error'
    ? !['change', 'same'].includes(entry.status) : entry.status === status));
  if (!keyword) return entries;
  return entries.filter((entry) => {
    const hay = [entry.label, entry.message, entry.sectionKey]
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
      list.appendChild(row);
    }
    wrap.appendChild(list);
    host.appendChild(wrap);
  }
}

function confirmReflectRisk(
  panel: LitePanelHandle,
  ctx: {
    sourceAppId: string;
    sourceGuestId: string;
    /** 比較元を設定JSONファイルから読み込んでいる場合 true */
    hasSourceBundle?: boolean;
    targetAppId: string;
    targetGuestId: string;
    scopes: string[];
    effectiveScopes: string[];
    skippedSameScopes: string[];
    skippedErrorScopes: string[];
    doBackup: boolean;
    stopOnError: boolean;
    lookupMapText: string;
    preview?: PreviewReflectResult;
  }
): boolean {
  if (!ctx.sourceAppId && !ctx.hasSourceBundle) {
    panel.setStatus('比較元アプリIDを入力するか、比較元JSONを読み込んでください', 'warn');
    return false;
  }
  if (!ctx.targetAppId) {
    panel.setStatus('比較先アプリIDを入力してください', 'warn');
    return false;
  }

  const issues: string[] = [];
  const sameConn = !ctx.hasSourceBundle && ctx.sourceAppId === ctx.targetAppId && ctx.sourceGuestId === ctx.targetGuestId;
  if (sameConn) {
    issues.push('比較元と比較先が同一接続です（同じアプリID・ゲストID）');
  }
  if (ctx.scopes.length >= 10) {
    issues.push(`対象セクション数が多いです（${ctx.scopes.length}件）`);
  }
  if (ctx.effectiveScopes.length >= 10) {
    issues.push(`実行予定セクション数が多いです（${ctx.effectiveScopes.length}件）`);
  }
  const riskyHit = ctx.scopes.filter((s) => RISKY_SCOPE_KEYS.has(s));
  if (riskyHit.length) {
    const labels = riskyHit.map((s) => getSectionLabel(s)).join(', ');
    issues.push(`影響範囲の広いセクションを含みます: ${labels}`);
  }
  if (!ctx.doBackup) {
    issues.push('「バックアップを保存」が OFF です（ロールバック用ファイルが残りません）');
  }
  if (!ctx.stopOnError) {
    issues.push('「エラー時に中断」が OFF です（失敗後も残りの反映を続行します）');
  }
  if (ctx.preview) {
    if (ctx.preview.errorSections > 0) {
      issues.push(`差分プレビューで取得失敗が ${ctx.preview.errorSections} 件あります`);
    }
    if (ctx.preview.changedSections === 0) {
      issues.push('差分プレビューでは変更対象がありません');
    }
  }
  if (ctx.skippedSameScopes.length > 0) {
    issues.push(`一致セクション ${ctx.skippedSameScopes.length} 件は自動で除外されます`);
  }
  if (ctx.skippedErrorScopes.length > 0) {
    issues.push(`取得失敗セクション ${ctx.skippedErrorScopes.length} 件は自動で除外されます`);
  }
  if (!ctx.effectiveScopes.length) {
    issues.push('実行予定セクションが 0 件です');
  }

  const scopeLabels = ctx.scopes.map((s) => getSectionLabel(s)).join(', ');
  const effectiveLabels = ctx.effectiveScopes.map((s) => getSectionLabel(s)).join(', ');
  const changedLabels = ctx.preview
    ? ctx.preview.entries.filter((entry) => entry.status === 'change').map((entry) => entry.label)
    : [];
  const changedPreview = changedLabels.length
    ? `${changedLabels.slice(0, 6).join(', ')}${changedLabels.length > 6 ? ` ほか ${changedLabels.length - 6} 件` : ''}`
    : 'なし';
  // 高リスク判定とその理由（追加確認を求めるときに、なぜ必要かを必ず提示する）
  const highRiskReasons: string[] = [];
  if (sameConn) highRiskReasons.push('比較元と比較先が同一接続');
  if (riskyHit.length > 0) highRiskReasons.push(`影響範囲の広いセクションを含む（${riskyHit.map((s) => getSectionLabel(s)).join(', ')}）`);
  if (!ctx.doBackup) highRiskReasons.push('バックアップ保存が OFF');
  if (!ctx.stopOnError) highRiskReasons.push('エラー時中断が OFF');
  if ((ctx.preview?.errorSections || 0) > 0) highRiskReasons.push(`差分プレビューに取得失敗が ${ctx.preview?.errorSections} 件`);
  if (ctx.effectiveScopes.length >= 10) highRiskReasons.push(`実行予定セクションが ${ctx.effectiveScopes.length} 件と多い`);
  const highRisk = highRiskReasons.length > 0;

  const lines = [
    '【最終確認: プレビュー反映】',
    ctx.hasSourceBundle
      ? `比較元: 設定JSON${ctx.sourceAppId ? ` (App ${ctx.sourceAppId})` : ''}`
      : `比較元: #${ctx.sourceAppId}${ctx.sourceGuestId ? ` (guest:${ctx.sourceGuestId})` : ''}`,
    `比較先: #${ctx.targetAppId}${ctx.targetGuestId ? ` (guest:${ctx.targetGuestId})` : ''} ※プレビュー`,
    `対象セクション (${ctx.scopes.length}): ${scopeLabels}`,
    `実行予定セクション (${ctx.effectiveScopes.length}): ${effectiveLabels || 'なし'}`,
    `オプション: バックアップ=${ctx.doBackup ? 'ON' : 'OFF'} / エラー時中断=${ctx.stopOnError ? 'ON' : 'OFF'}${ctx.lookupMapText.trim() ? ' / Lookup変換あり' : ''}`,
    ctx.preview
      ? `差分プレビュー: 差分 ${ctx.preview.changedSections} / 一致 ${ctx.preview.sameSections} / 取得失敗 ${ctx.preview.errorSections}`
      : '差分プレビュー: 未確認',
    ctx.preview ? `差分ありセクション: ${changedPreview}` : '',
    '',
    issues.length ? `注意点:\n  - ${issues.join('\n  - ')}` : '注意点: なし'
  ].filter(Boolean);
  if (!window.confirm(lines.join('\n') + '\n\n本当に実行しますか？')) return false;
  if (highRisk) {
    const typed = window.prompt(
      '高リスク実行のため追加確認します。\n'
      + `理由:\n  - ${highRiskReasons.join('\n  - ')}\n\n`
      + `確認のため比較先アプリID「${ctx.targetAppId}」を入力してください。`,
      ''
    );
    if (typed === null) {
      panel.setStatus('反映実行をキャンセルしました', 'info');
      return false;
    }
    if (typed.trim() !== ctx.targetAppId) {
      panel.setStatus('確認入力が一致しないため、中断しました', 'warn');
      return false;
    }
  }
  return true;
}
