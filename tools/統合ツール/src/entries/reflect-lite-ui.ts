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
import { readSettingsBundleFile } from '../settingsBundleImport.js';
import { collectRetrySectionKeys, summarizeApplyOutcome } from '../reflect/applyOutcome.js';

// =============================================================================
// メモリ状態（リロードで消える。lite はブラウザ永続ストレージを使わない方針）
// =============================================================================

interface PreviewSnapshot {
  signature: string;
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
  { id: 'all', label: 'すべて', hint: '反映可能なセクションを全選択' },
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
@media(max-width:640px){
  #kus-reflect-lite .kus-rl-review-grid{grid-template-columns:1fr}
}
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
  onSelectOnly?: (sectionKey: string) => void;
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
    badges: [{ label: 'Lite' }, { label: '比較先プレビューへ' }],
    hint: '<strong>反映先は常にプレビュー</strong>環境です。まず差分プレビューで変更内容を確認し、そのまま反映判断につなげます。',
    wide: true
  });

  // ---- アプリ ----
  const srcApp = makeInput({ placeholder: '比較元アプリID', value: memoryState.sourceAppId || '', width: 'id' });
  const srcGuest = makeInput({ placeholder: 'ゲストID', value: memoryState.sourceGuestId || '', width: 'guest' });
  const tgtApp = makeInput({ placeholder: '比較先アプリID', value: memoryState.targetAppId || DEFAULT_APP_ID || '', width: 'id' });
  const tgtGuest = makeInput({ placeholder: 'ゲストID', value: memoryState.targetGuestId || '', width: 'guest' });
  let sourceBundleFromJson: any = null;
  // 差分プレビューの鮮度判定（signature）に使う読み込み済みJSONの識別子
  let sourceBundleToken = '';
  const srcJsonFile = document.createElement('input');
  srcJsonFile.type = 'file';
  srcJsonFile.accept = '.json,application/json';
  srcJsonFile.className = 'kus-lp__file';
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
  cardApp.body.appendChild(makeRow([srcApp, srcGuest], { label: '比較元' }));
  cardApp.body.appendChild(makeRow([srcJsonFile, srcJsonClearBtn], { label: '比較元JSON' }));
  cardApp.body.appendChild(srcJsonNote);
  cardApp.body.appendChild(makeRow([tgtApp, tgtGuest], { label: '比較先' }));
  const quickRow = makeRow([currentSrcBtn, copyBtn, currentBtn, swapBtn]);
  quickRow.style.marginTop = '4px';
  cardApp.body.appendChild(quickRow);

  function refreshSrcJsonNote() {
    if (sourceBundleFromJson) {
      srcJsonNote.textContent = `比較元JSON読み込み済み: App ${sourceBundleFromJson?.appId || '-'}（比較元はこのJSONから取得し、アプリからの取得は行いません）`;
      srcJsonNote.style.display = 'block';
      srcJsonClearBtn.style.display = '';
    } else {
      srcJsonNote.style.display = 'none';
      srcJsonClearBtn.style.display = 'none';
    }
  }

  srcJsonFile.addEventListener('change', () => liteRun(panel, '比較元JSONを読み込み中…', async () => {
    const file = srcJsonFile.files?.[0];
    if (!file) return;
    sourceBundleFromJson = await readSettingsBundleFile(file, { side: 'source', appId: srcApp.value.trim() });
    sourceBundleToken = `${file.name}:${file.size}:${file.lastModified}:${Date.now()}`;
    if (!srcApp.value.trim() && sourceBundleFromJson?.appId) srcApp.value = String(sourceBundleFromJson.appId);
    panel.setStatus(`比較元JSONを読み込みました: App ${sourceBundleFromJson?.appId || '-'}`, 'ok');
    saveState();
    refreshSrcJsonNote();
    refreshSameConnBanner();
    refreshReviewCard();
  }));

  srcJsonClearBtn.addEventListener('click', () => {
    sourceBundleFromJson = null;
    sourceBundleToken = '';
    srcJsonFile.value = '';
    refreshSrcJsonNote();
    refreshSameConnBanner();
    refreshReviewCard();
    panel.setStatus('比較元JSONをクリアしました（比較元アプリIDから取得します）', 'info');
  });

  const sameConnBanner = document.createElement('div');
  sameConnBanner.className = 'kus-lp__note--warn';
  sameConnBanner.style.display = 'none';
  sameConnBanner.textContent = '⚠ 比較元と比較先が同一接続です（同じアプリID・ゲストID）。同一アプリのプレビューを上書きする状態です。';
  cardApp.body.appendChild(sameConnBanner);

  cardApp.body.appendChild(createAppSearchControl(panel, {
    targets: [
      { label: '比較元', apply: (id, _name, guestId) => {
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
    const same = !sourceBundleFromJson
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
  const cardScope = makeCard({ title: '反映するセクション', number: 2 });
  const putSections = SECTION_DEFS.filter((d) => d.put);
  const initialSelected = new Set(
    Array.isArray(memoryState.selectedScopes) && memoryState.selectedScopes.length
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
  chips.forEach((c) => chipBox.appendChild(c.label));
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
  cardScope.body.appendChild(presetRow);

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
    label: '比較元をプレビューから取得',
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
  optGrid.appendChild(srcPreview.label);
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
  const previewBtn = makeButton('差分プレビューを更新', 'primary', { icon: '👁' });
  const changedOnlyBtn = makeButton('差分ありだけ選択', 'sub');

  const reviewCard = makeCard({ title: '実行前チェック', number: 4, soft: true });
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
  previewTools.appendChild(previewSearch);
  previewTools.appendChild(previewActions);
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
    const signature = lookupState.ok
      ? buildPreviewSignature({
        sourceAppId: srcApp.value.trim(),
        sourceGuestId: srcGuest.value.trim(),
        sourcePreview: srcPreview.checkbox.checked,
        sourceBundleToken,
        targetAppId: tgtApp.value.trim(),
        targetGuestId: tgtGuest.value.trim(),
        scopes,
        lookupMap: lookupState.value
      })
      : '';
    const preview = memoryState.lastPreview || null;
    const fresh = !!preview && !!signature && preview.signature === signature;
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
    const plan = getExecutionPlan(selectedScopes, previewResult);
    const filteredEntries = filterPreviewEntries(previewResult.entries, previewSearch.value.trim().toLowerCase());
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
      onSelectOnly: (sectionKey) => setSelectedScopes([sectionKey]),
      onAdd: (sectionKey) => setSelectedScopes([...new Set([...collectSelectedScopes(), sectionKey])]),
      onRemove: (sectionKey) => setSelectedScopes(collectSelectedScopes().filter((key) => key !== sectionKey))
    });
    previewCard.card.style.display = 'block';
  }

  async function runPreview(scopes: string[], lookupMap: Record<string, string>) {
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
        at: Date.now(),
        result
      }
    };
    rerenderPreviewCard();
    refreshReviewCard();
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
    const canRunBase = (!!src || !!sourceBundleFromJson) && !!tgt && scopes.length > 0 && lookupState.ok;
    previewBtn.disabled = !canRunBase;
    changedOnlyBtn.disabled = !(fresh && previewResult && previewResult.changedSections > 0);
    runBtn.disabled = !canRunBase;

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
      issues.push('入力変更後に差分プレビューが未更新です。実行時に自動更新されます。');
    } else if (previewResult) {
      if (previewResult.errorSections > 0) issues.push(`差分プレビューで取得失敗が ${previewResult.errorSections} 件あります。`);
      if (previewResult.changedSections === 0) issues.push('差分プレビューでは変更対象がありません。通常は反映不要です。');
      if (!plan.effectiveScopes.length) issues.push('現在の実行オプションでは、実行対象セクションが 0 件です。');
    }

    let nextTone: 'ok' | 'info' | 'warn' = 'warn';
    let nextTitle = '次の一手';
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
      nextText = '入力変更があります。差分プレビューを更新すると内容を確認できます。実行時も自動で最新化します。';
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

    const selectedLabels = scopes.map((key) => getSectionLabel(key));
    const selectedSummary = selectedLabels.length
      ? `${selectedLabels.slice(0, 4).join(' / ')}${selectedLabels.length > 4 ? ` ほか ${selectedLabels.length - 4} 件` : ''}`
      : '未選択';
    const effectiveSummary = plan.effectiveScopes.length
      ? `${plan.effectiveScopes.slice(0, 4).map((key) => getSectionLabel(key)).join(' / ')}${plan.effectiveScopes.length > 4 ? ` ほか ${plan.effectiveScopes.length - 4} 件` : ''}`
      : 'なし';

    const previewMeta = previewResult
      ? `${fresh ? '最新' : '前回'}: 差分 ${previewResult.changedSections} / 一致 ${previewResult.sameSections} / 失敗 ${previewResult.errorSections}`
      : 'まだ取得していません';

    const previewPills: string[] = [];
    if (previewResult) {
      previewPills.push(`<span class="kus-rl-pill kus-rl-pill--change">差分 ${previewResult.changedSections}</span>`);
      previewPills.push(`<span class="kus-rl-pill kus-rl-pill--same">一致 ${previewResult.sameSections}</span>`);
      if (previewResult.errorSections > 0) previewPills.push(`<span class="kus-rl-pill kus-rl-pill--error">失敗 ${previewResult.errorSections}</span>`);
      if (fresh) previewPills.push(`<span class="kus-rl-pill">実行予定 ${plan.effectiveScopes.length}</span>`);
      if (fresh && plan.skippedSameScopes.length > 0) previewPills.push(`<span class="kus-rl-pill">一致除外 ${plan.skippedSameScopes.length}</span>`);
      if (fresh && plan.skippedErrorScopes.length > 0) previewPills.push(`<span class="kus-rl-pill kus-rl-pill--error">失敗除外 ${plan.skippedErrorScopes.length}</span>`);
      if (!fresh) previewPills.push('<span class="kus-rl-pill kus-rl-pill--stale">古い結果</span>');
    } else {
      previewPills.push('<span class="kus-rl-pill kus-rl-pill--stale">未取得</span>');
    }

    reviewBody.innerHTML = ''
      + '<div class="kus-rl-review-grid">'
      + `  <div class="kus-rl-stat"><div class="kus-rl-stat__label">比較元</div><div class="kus-rl-stat__value">${escapeHtml(sourceBundleFromJson ? `設定JSON${src ? ` (App ${src})` : ''}` : formatConnection(src, srcGuest.value.trim(), srcPreview.checkbox.checked ? 'preview' : 'prod'))}</div><div class="kus-rl-stat__meta">取得元: ${sourceBundleFromJson ? '読み込み済みJSON' : (srcPreview.checkbox.checked ? 'プレビュー' : '本番')}</div></div>`
      + `  <div class="kus-rl-stat"><div class="kus-rl-stat__label">比較先</div><div class="kus-rl-stat__value">${escapeHtml(formatConnection(tgt, tgtGuest.value.trim(), 'preview'))}</div><div class="kus-rl-stat__meta">反映先は常に比較先プレビューです</div></div>`
      + `  <div class="kus-rl-stat"><div class="kus-rl-stat__label">反映対象</div><div class="kus-rl-stat__value">${scopes.length ? `${scopes.length} セクション` : '未選択'}</div><div class="kus-rl-stat__meta">${escapeHtml(selectedSummary)}</div></div>`
      + `  <div class="kus-rl-stat"><div class="kus-rl-stat__label">差分プレビュー</div><div class="kus-rl-stat__value">${preview ? escapeHtml(formatPreviewStamp(preview.at)) : '未取得'}</div><div class="kus-rl-stat__meta">${escapeHtml(previewMeta)}</div></div>`
      + `  <div class="kus-rl-stat"><div class="kus-rl-stat__label">実行予定</div><div class="kus-rl-stat__value">${fresh ? `${plan.effectiveScopes.length} セクション` : 'プレビュー後に確定'}</div><div class="kus-rl-stat__meta">${escapeHtml(fresh ? effectiveSummary : '差分プレビューと実行オプションから自動算出します')}</div></div>`
      + `  <div class="kus-rl-stat"><div class="kus-rl-stat__label">自動除外</div><div class="kus-rl-stat__value">${fresh ? `${plan.skippedSameScopes.length + plan.skippedErrorScopes.length} 件` : '未計算'}</div><div class="kus-rl-stat__meta">${escapeHtml(fresh ? buildSkipSummary(plan) : '差分なし / 取得失敗セクションをここに表示します')}</div></div>`
      + '</div>'
      + `<div class="kus-rl-pills">${previewPills.join('')}</div>`
      + `<div class="kus-rl-next kus-rl-next--${nextTone}"><strong>${nextTitle}</strong>${escapeHtml(nextText)}</div>`
      + (issues.length
        ? `<ul class="kus-rl-issues">${issues.map((line) => `<li>${escapeHtml(line)}</li>`).join('')}</ul>`
        : '<div class="kus-rl-quiet">この条件では大きな注意点は見つかっていません。</div>');

    rerenderPreviewCard();
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
    const scopeKeys = uniqueSectionKeys(filterPreviewEntries(previewResult.entries, previewSearch.value.trim().toLowerCase()));
    setSelectedScopes(scopeKeys);
    panel.setStatus(`表示中の ${scopeKeys.length} セクションだけを選択しました`, scopeKeys.length ? 'ok' : 'info');
  });

  previewAddShownBtn.addEventListener('click', () => {
    const previewResult = memoryState.lastPreview?.result || null;
    if (!previewResult) {
      panel.setStatus('先に差分プレビューを取得してください', 'warn');
      return;
    }
    const scopeKeys = uniqueSectionKeys(filterPreviewEntries(previewResult.entries, previewSearch.value.trim().toLowerCase()));
    setSelectedScopes([...new Set([...collectSelectedScopes(), ...scopeKeys])]);
    panel.setStatus(`表示中の ${scopeKeys.length} セクションを追加しました`, scopeKeys.length ? 'ok' : 'info');
  });

  previewRemoveShownBtn.addEventListener('click', () => {
    const previewResult = memoryState.lastPreview?.result || null;
    if (!previewResult) {
      panel.setStatus('先に差分プレビューを取得してください', 'warn');
      return;
    }
    const scopeKeys = new Set(uniqueSectionKeys(filterPreviewEntries(previewResult.entries, previewSearch.value.trim().toLowerCase())));
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
  const runBtn = makeButton('プレビュー反映を実行', 'run', { icon: '⤴' });
  runBtn.classList.add('kus-lp__btn--danger');
  runBtn.classList.remove('kus-lp__btn--run');
  runBtn.style.cssText = '';
  runBtn.classList.add('kus-lp__btn--danger');
  runBtn.style.width = '100%';
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

    logCard.card.style.display = 'block';
    logPre.style.display = 'block';
    logPre.textContent = '';

    const outcome = await liteRun(panel, 'プレビュー反映 実行中…', async () => {
      let previewState = getPreviewState(scopes, lookupState);
      let previewResult = previewState.fresh ? previewState.preview?.result || null : null;
      if (!previewResult) {
        previewResult = await runPreview(scopes, lookupMap);
        previewState = getPreviewState(scopes, lookupState);
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

function formatConnection(appId: string, guestId: string, envLabel: string): string {
  const base = appId ? `#${appId}` : '(未入力)';
  const guest = guestId ? ` / guest:${guestId}` : '';
  return `${base}${guest} / ${envLabel}`;
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

function filterPreviewEntries(entries: PreviewEntry[], keyword: string): PreviewEntry[] {
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
  const filteredEntries = filterPreviewEntries(result.entries, String(opts.searchKeyword || '').trim().toLowerCase());
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

  for (const group of groups) {
    if (!group.entries.length) continue;
    const wrap = document.createElement('section');
    wrap.className = 'kus-rl-preview-group';
    wrap.innerHTML = `<div class="kus-rl-preview-group__head"><span>${escapeHtml(group.title)}</span><span>${group.entries.length} 件</span></div>`;
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

      if (opts.onSelectOnly || opts.onAdd || opts.onRemove) {
        const actions = document.createElement('div');
        actions.className = 'kus-rl-preview-row__actions';
        if (opts.onSelectOnly) {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'kus-lp__btn kus-lp__btn--sub';
          btn.textContent = 'このセクションだけ';
          btn.addEventListener('click', () => opts.onSelectOnly?.(entry.sectionKey));
          actions.appendChild(btn);
        }
        if (opts.onAdd) {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'kus-lp__btn kus-lp__btn--sub';
          btn.textContent = '追加';
          btn.disabled = selectedSet.has(entry.sectionKey);
          btn.addEventListener('click', () => opts.onAdd?.(entry.sectionKey));
          actions.appendChild(btn);
        }
        if (opts.onRemove) {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'kus-lp__btn kus-lp__btn--ghost';
          btn.textContent = '除外';
          btn.disabled = !selectedSet.has(entry.sectionKey);
          btn.addEventListener('click', () => opts.onRemove?.(entry.sectionKey));
          actions.appendChild(btn);
        }
        row.appendChild(actions);
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
