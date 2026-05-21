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

// =============================================================================
// メモリ状態（リロードで消える。lite はブラウザ永続ストレージを使わない方針）
// =============================================================================

interface LiteMemoryState {
  sourceAppId?: string;
  sourceGuestId?: string;
  targetAppId?: string;
  targetGuestId?: string;
  sourcePreview?: boolean;
  stopOnError?: boolean;
  doBackup?: boolean;
  selectedScopes?: string[];
  lookupMapText?: string;
  /** 直近の反映結果（成功 / 失敗の最終サマリ） */
  lastResult?: { ok: number; ng: number; at: number; appId: string } | null;
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

// =============================================================================
// メイン
// =============================================================================

export function mountReflectLitePanel() {
  const panel = createLitePanel({
    id: 'kus-reflect-lite',
    title: 'プレビュー反映',
    subtitle: '比較元アプリの設定を比較先プレビューへ一括反映します。',
    accent: 'reflect',
    badges: [{ label: 'Lite' }, { label: '比較先プレビューへ' }],
    hint: '<strong>反映先は常にプレビュー</strong>環境です。本番デプロイはツールから行いません。'
  });

  // ---- アプリ ----
  const srcApp = makeInput({ placeholder: '比較元アプリID', value: memoryState.sourceAppId || DEFAULT_APP_ID || '', width: 'id' });
  const srcGuest = makeInput({ placeholder: 'ゲストID', value: memoryState.sourceGuestId || '', width: 'guest' });
  const tgtApp = makeInput({ placeholder: '比較先アプリID', value: memoryState.targetAppId || DEFAULT_APP_ID || '', width: 'id' });
  const tgtGuest = makeInput({ placeholder: 'ゲストID', value: memoryState.targetGuestId || '', width: 'guest' });

  const copyBtn = makeButton('比較元 → 比較先', 'sub');
  const currentBtn = makeButton('現在のアプリを比較先', 'sub');
  const swapBtn = makeButton('入れ替え', 'sub');

  const cardApp = makeCard({ title: 'アプリ', number: 1 });
  cardApp.body.appendChild(makeRow([srcApp, srcGuest], { label: '比較元' }));
  cardApp.body.appendChild(makeRow([tgtApp, tgtGuest], { label: '比較先' }));
  const quickRow = makeRow([copyBtn, currentBtn, swapBtn]);
  quickRow.style.marginTop = '4px';
  cardApp.body.appendChild(quickRow);

  // 同一接続警告バナー
  const sameConnBanner = document.createElement('div');
  sameConnBanner.className = 'kus-lp__note--warn';
  sameConnBanner.style.display = 'none';
  sameConnBanner.textContent = '⚠ 比較元と比較先が同一接続です（同じアプリID・ゲストID）。実行すると同一アプリで上書きになります。';
  cardApp.body.appendChild(sameConnBanner);

  panel.body.insertBefore(cardApp.card, panel.status);

  copyBtn.addEventListener('click', () => {
    tgtApp.value = srcApp.value.trim();
    tgtGuest.value = srcGuest.value.trim();
    saveState();
    refreshSameConnBanner();
    panel.setStatus('比較元IDを比較先へコピーしました', 'info');
  });
  currentBtn.addEventListener('click', () => {
    tgtApp.value = DEFAULT_APP_ID || '';
    saveState();
    refreshSameConnBanner();
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
    panel.setStatus('比較元と比較先を入れ替えました', 'info');
  });

  [srcApp, srcGuest, tgtApp, tgtGuest].forEach((el) => {
    el.addEventListener('input', () => {
      saveState();
      refreshSameConnBanner();
    });
  });

  function refreshSameConnBanner() {
    const same = !!srcApp.value.trim()
      && srcApp.value.trim() === tgtApp.value.trim()
      && srcGuest.value.trim() === tgtGuest.value.trim();
    sameConnBanner.style.display = same ? 'block' : 'none';
  }

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

  // 選択件数表示
  const scopeCountLabel = document.createElement('div');
  scopeCountLabel.className = 'kus-lp__small';
  scopeCountLabel.style.marginTop = '4px';
  cardScope.body.appendChild(scopeCountLabel);

  function refreshScopeCount() {
    const sel = chips.filter((c) => c.checkbox.checked).length;
    scopeCountLabel.textContent = `選択中: ${sel} / ${chips.length} セクション`;
  }
  chips.forEach((c) => c.checkbox.addEventListener('change', () => {
    refreshScopeCount();
    saveState();
  }));
  refreshScopeCount();

  // クイックプリセット行
  const presetRow = document.createElement('div');
  presetRow.className = 'kus-lp__btn-row';
  presetRow.style.marginTop = '8px';
  for (const preset of SCOPE_QUICK_PRESETS) {
    const btn = makeButton(preset.label, 'sub');
    btn.title = preset.hint;
    btn.addEventListener('click', () => {
      applyScopePreset(preset);
      panel.setStatus(`プリセット適用: ${preset.label}（${chips.filter((c) => c.checkbox.checked).length}件）`, 'info');
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
  });
  noneBtn.addEventListener('click', () => {
    chips.forEach((c) => { c.checkbox.checked = false; });
    refreshScopeCount();
    saveState();
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
    checked: !!memoryState.stopOnError,
    help: '途中で失敗したらそこで止めます（ロールバックはしません）'
  });
  const optGrid = document.createElement('div');
  optGrid.className = 'kus-lp__check-grid';
  optGrid.appendChild(backup.label);
  optGrid.appendChild(srcPreview.label);
  optGrid.appendChild(stop.label);
  cardOpt.body.appendChild(optGrid);

  [backup.checkbox, srcPreview.checkbox, stop.checkbox].forEach((cb) => {
    cb.addEventListener('change', saveState);
  });

  // Lookup mapping
  const lookupDetails = makeDetails('Lookup AppID マッピング（任意）');
  const lookupTa = makeTextarea({
    rows: 3,
    code: true,
    placeholder: '{"旧AppID":"新AppID", ...}',
    value: memoryState.lookupMapText || ''
  });
  lookupTa.addEventListener('input', saveState);
  lookupDetails.body.appendChild(lookupTa);
  const lookupHint = document.createElement('div');
  lookupHint.className = 'kus-lp__small';
  lookupHint.style.marginTop = '6px';
  lookupHint.textContent = 'フィールドの参照アプリ（ルックアップ）を別 AppID に置換します。実行前にマッピング先 AppID の存在を自動チェックします。';
  lookupDetails.body.appendChild(lookupHint);
  cardOpt.body.appendChild(lookupDetails.details);

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
      scopes: chips.filter((c) => c.checkbox.checked).map((c) => c.checkbox.value),
      lookupMapText: lookupTa.value,
      doBackup: backup.checkbox.checked,
      stopOnError: stop.checkbox.checked
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
    lookupTa.value = preset.lookupMapText || '';
    const wanted = new Set(preset.scopes || []);
    chips.forEach((c) => { c.checkbox.checked = wanted.has(c.checkbox.value); });
    refreshScopeCount();
    refreshSameConnBanner();
    saveState();
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

  // ---- 差分プレビュー ----
  const previewBtn = makeButton('差分プレビュー（読取のみ）', 'ghost', { icon: '👁' });
  previewBtn.style.width = '100%';
  previewBtn.style.marginBottom = '8px';
  panel.body.insertBefore(previewBtn, panel.status);

  const previewCard = makeCard({ title: '差分プレビュー結果' });
  previewCard.card.style.display = 'none';
  const previewBody = document.createElement('div');
  previewCard.body.appendChild(previewBody);
  panel.body.insertBefore(previewCard.card, panel.status);

  previewBtn.addEventListener('click', () => {
    const scopes = chips.filter((c) => c.checkbox.checked).map((c) => c.checkbox.value);
    if (!scopes.length) {
      panel.setStatus('対象セクションを選択してください', 'warn');
      return;
    }
    return liteRun(panel, '差分プレビューを取得中…', async () => {
      const result = await previewReflectStandalone(
        {
          sourceAppId: srcApp.value.trim(),
          sourceGuestId: srcGuest.value.trim(),
          sourcePreview: srcPreview.checkbox.checked,
          targetAppId: tgtApp.value.trim(),
          targetGuestId: tgtGuest.value.trim(),
          scopes
        },
        (m) => panel.setStatus(m, 'busy')
      );
      renderPreviewResult(previewBody, result);
      previewCard.card.style.display = 'block';
    }, `差分プレビュー完了（${scopes.length}セクションを比較）`);
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
  lastResultCard.card.style.display = 'none';
  panel.body.insertBefore(lastResultCard.card, panel.status);
  renderLastResult();

  function renderLastResult() {
    const last = memoryState.lastResult;
    if (!last) {
      lastResultCard.card.style.display = 'none';
      return;
    }
    const stamp = new Date(last.at).toLocaleString();
    const tone = last.ng > 0 ? 'color:#9a3412' : 'color:#065f46';
    lastResultBody.innerHTML = `<div style="${tone};font-weight:600">${last.ng > 0 ? '⚠ 一部エラー' : '✓ 全成功'}</div>`
      + `<div>比較先 #${escapeHtml(last.appId || '-')} / OK ${last.ok} / NG ${last.ng}</div>`
      + `<div>${stamp}</div>`;
    lastResultCard.card.style.display = 'block';
  }

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
      selectedScopes: chips.filter((c) => c.checkbox.checked).map((c) => c.checkbox.value),
      lookupMapText: lookupTa.value
    };
  }

  function parseLookupMap(text: string): Record<string, string> {
    const t = text.trim();
    if (!t) return {};
    try {
      const parsed = JSON.parse(t);
      const out: Record<string, string> = {};
      for (const [k, v] of Object.entries(parsed || {})) {
        if (k && v != null) out[String(k).trim()] = String(v).trim();
      }
      return out;
    } catch {
      throw new Error('Lookup マッピング JSON が壊れています');
    }
  }

  runBtn.addEventListener('click', () => {
    const scopes = chips.filter((c) => c.checkbox.checked).map((c) => c.checkbox.value);
    if (!scopes.length) {
      panel.setStatus('反映するセクションを選択してください', 'warn');
      return;
    }
    saveState();

    // --- 最終確認ダイアログ（リスクガード） ---
    if (!confirmReflectRisk(panel, {
      sourceAppId: srcApp.value.trim(),
      sourceGuestId: srcGuest.value.trim(),
      targetAppId: tgtApp.value.trim(),
      targetGuestId: tgtGuest.value.trim(),
      scopes,
      doBackup: backup.checkbox.checked,
      stopOnError: stop.checkbox.checked,
      lookupMapText: lookupTa.value
    })) {
      panel.setStatus('反映実行をキャンセルしました', 'info');
      return;
    }

    logCard.card.style.display = 'block';
    logPre.style.display = 'block';
    logPre.textContent = '';

    return liteRun(panel, 'プレビュー反映 実行中…', async () => {
      let lookupMap: Record<string, string>;
      try {
        lookupMap = parseLookupMap(lookupTa.value);
      } catch (e: any) {
        throw e;
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

      const logs = await runApplyPreviewStandalone(
        {
          sourceAppId: srcApp.value.trim(),
          sourceGuestId: srcGuest.value.trim(),
          sourcePreview: srcPreview.checkbox.checked,
          targetAppId: tgtApp.value.trim(),
          targetGuestId: tgtGuest.value.trim(),
          scopes,
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

      const okCount = logs.filter((l) => l.startsWith('OK ')).length;
      const ngCount = logs.filter((l) => l.startsWith('NG ')).length;
      memoryState.lastResult = {
        ok: okCount,
        ng: ngCount,
        at: Date.now(),
        appId: tgtApp.value.trim()
      };
      renderLastResult();
    }, 'プレビュー反映が完了しました（kintone管理画面でデプロイ実行してください）');
  });

  refreshSameConnBanner();
}

// =============================================================================
// 補助関数
// =============================================================================

function escapeHtml(s: string): string {
  return String(s).replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  } as Record<string, string>)[ch]);
}

function renderPreviewResult(host: HTMLElement, result: PreviewReflectResult) {
  host.innerHTML = '';

  const summary = document.createElement('div');
  summary.className = 'kus-lp__small';
  summary.style.marginBottom = '8px';
  summary.innerHTML = `<strong>${result.totalSections}</strong>セクション中 `
    + `<span style="color:#9a3412;font-weight:600">差分あり ${result.changedSections}</span> / `
    + `<span style="color:#065f46">差分なし ${result.sameSections}</span>`
    + (result.errorSections > 0 ? ` / <span style="color:#991b1b">取得失敗 ${result.errorSections}</span>` : '');
  host.appendChild(summary);

  if (!result.entries.length) {
    const empty = document.createElement('div');
    empty.className = 'kus-lp__small';
    empty.textContent = '対象セクションがありません';
    host.appendChild(empty);
    return;
  }

  const table = document.createElement('table');
  table.style.cssText = 'width:100%;border-collapse:collapse;font-size:11.5px';
  const thead = document.createElement('thead');
  thead.innerHTML = '<tr>'
    + '<th style="text-align:left;padding:4px 6px;border-bottom:1px solid #e2e8f0">セクション</th>'
    + '<th style="text-align:left;padding:4px 6px;border-bottom:1px solid #e2e8f0">状態</th>'
    + '<th style="text-align:left;padding:4px 6px;border-bottom:1px solid #e2e8f0">詳細</th>'
    + '</tr>';
  table.appendChild(thead);
  const tbody = document.createElement('tbody');
  for (const entry of result.entries) {
    const tr = document.createElement('tr');
    const labelTd = document.createElement('td');
    labelTd.style.cssText = 'padding:4px 6px;border-bottom:1px solid #f1f5f9';
    labelTd.textContent = entry.label;
    const statusTd = document.createElement('td');
    statusTd.style.cssText = 'padding:4px 6px;border-bottom:1px solid #f1f5f9;font-weight:600';
    const detailTd = document.createElement('td');
    detailTd.style.cssText = 'padding:4px 6px;border-bottom:1px solid #f1f5f9;color:#475569';
    detailTd.textContent = entry.message;
    switch (entry.status) {
      case 'change':
        statusTd.textContent = '差分あり';
        statusTd.style.color = '#b45309';
        break;
      case 'same':
        statusTd.textContent = '一致';
        statusTd.style.color = '#065f46';
        break;
      case 'src-missing':
      case 'tgt-missing':
      case 'error':
        statusTd.textContent = '取得失敗';
        statusTd.style.color = '#991b1b';
        break;
    }
    tr.appendChild(labelTd);
    tr.appendChild(statusTd);
    tr.appendChild(detailTd);
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);
  host.appendChild(table);
}

function confirmReflectRisk(
  panel: LitePanelHandle,
  ctx: {
    sourceAppId: string;
    sourceGuestId: string;
    targetAppId: string;
    targetGuestId: string;
    scopes: string[];
    doBackup: boolean;
    stopOnError: boolean;
    lookupMapText: string;
  }
): boolean {
  if (!ctx.sourceAppId) {
    panel.setStatus('比較元アプリIDを入力してください', 'warn');
    return false;
  }
  if (!ctx.targetAppId) {
    panel.setStatus('比較先アプリIDを入力してください', 'warn');
    return false;
  }

  const issues: string[] = [];
  const sameConn = ctx.sourceAppId === ctx.targetAppId && ctx.sourceGuestId === ctx.targetGuestId;
  if (sameConn) {
    issues.push('比較元と比較先が同一接続です（同じアプリID・ゲストID）');
  }
  if (ctx.scopes.length >= 10) {
    issues.push(`対象セクション数が多いです（${ctx.scopes.length}件）`);
  }
  // 権限・通知系の存在チェック（影響が広いセクション）
  const riskySections = ['appAcl', 'fieldAcl', 'recordPermissions', 'notifications', 'perRecordNotifications', 'reminderNotifications', 'processSettings'];
  const riskyHit = ctx.scopes.filter((s) => riskySections.includes(s));
  if (riskyHit.length) {
    const labels = riskyHit.map((s) => SECTION_DEFS.find((d) => d.key === s)?.label || s).join(', ');
    issues.push(`影響範囲の広いセクションを含みます: ${labels}`);
  }
  if (!ctx.doBackup) {
    issues.push('「バックアップを保存」が OFF です（ロールバック用ファイルが残りません）');
  }

  const scopeLabels = ctx.scopes
    .map((s) => SECTION_DEFS.find((d) => d.key === s)?.label || s)
    .join(', ');

  const lines = [
    '【最終確認: プレビュー反映】',
    `比較元: #${ctx.sourceAppId}${ctx.sourceGuestId ? ` (guest:${ctx.sourceGuestId})` : ''}`,
    `比較先: #${ctx.targetAppId}${ctx.targetGuestId ? ` (guest:${ctx.targetGuestId})` : ''} ※プレビュー`,
    `対象セクション (${ctx.scopes.length}): ${scopeLabels}`,
    `オプション: バックアップ=${ctx.doBackup ? 'ON' : 'OFF'} / エラー時中断=${ctx.stopOnError ? 'ON' : 'OFF'}${ctx.lookupMapText.trim() ? ' / Lookup変換あり' : ''}`,
    '',
    issues.length ? `注意点:\n  - ${issues.join('\n  - ')}` : '注意点: なし'
  ];
  return window.confirm(lines.join('\n') + '\n\n本当に実行しますか？');
}
