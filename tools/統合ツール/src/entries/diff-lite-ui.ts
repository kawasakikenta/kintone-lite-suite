'use strict';

import {
  runExportBundleJsonStandalone,
  runExportDiffHtmlStandalone,
  runExportDiffJsonStandalone,
  runExportPatchJsonStandalone
} from '../tabs/diff-export-standalone.js';
import {
  createLitePanel,
  makeRow,
  makeInput,
  makeButton,
  makeCheck,
  makeChip,
  makeTextarea,
  makeSelect,
  makeCard,
  makeDetails,
  makeNote,
  liteRun,
  type LitePanelHandle
} from './litePanelTheme.js';

const SCOPE_OPTS: Array<[string, string, boolean]> = [
  ['fieldSettings', 'フィールド', true],
  ['layoutSettings', 'レイアウト', true],
  ['viewSettings', 'ビュー', true],
  ['reportSettings', 'グラフ', false],
  ['processSettings', 'プロセス', true],
  ['appSettings', 'アプリ設定', false],
  ['formSettings', 'フォーム', false],
  ['customizeSettings', 'JS/CSS', false],
  ['pluginSettings', 'プラグイン', false],
  ['actionSettings', 'アクション', false],
  ['appAcl', 'アプリ権限', false],
  ['fieldAcl', 'フィールド権限', false],
  ['recordPermissions', 'レコード権限', false],
  ['notifications', '通知', false],
  ['perRecordNotifications', 'レコード条件通知', false],
  ['reminderNotifications', 'リマインダー', false],
  ['categories', 'カテゴリ', false]
];

export function mountDiffLitePanel(runDiffStandalone: (opts: any) => Promise<any>) {
  const panel: LitePanelHandle = createLitePanel({
    id: 'kus-diff-lite',
    title: '差分比較',
    subtitle: '2 アプリの設定差分を取得し、JSON / HTML / バンドル / パッチで保存',
    accent: 'diff',
    badges: [{ label: 'Lite' }, { label: '出力対応' }],
    hint: 'API 取得・差分計算・出力をこのスクリプトに同梱しています。<strong>統合ツール.js は不要</strong>。'
  });

  // ---- アプリ ----
  const srcApp = makeInput({ placeholder: 'アプリID', width: 'id' });
  const srcGuest = makeInput({ placeholder: 'ゲストID', width: 'guest' });
  const srcPrev = makeCheck({ label: 'プレビューで取得' });
  const tgtApp = makeInput({ placeholder: 'アプリID', width: 'id' });
  const tgtGuest = makeInput({ placeholder: 'ゲストID', width: 'guest' });
  const tgtPrev = makeCheck({ label: 'プレビューで取得' });

  const cardApp = makeCard({ title: 'アプリと環境', number: 1 });
  cardApp.body.appendChild(makeRow([srcApp, srcGuest, srcPrev.label], { label: '比較元' }));
  cardApp.body.appendChild(makeRow([tgtApp, tgtGuest, tgtPrev.label], { label: '比較先' }));
  panel.body.insertBefore(cardApp.card, panel.status);

  // ---- セクション ----
  const cardScope = makeCard({ title: '比較セクション', number: 2 });
  const chipBox = document.createElement('div');
  chipBox.className = 'kus-lp__chips';
  const chips = SCOPE_OPTS.map(([key, label, def]) => makeChip({ label, value: key, checked: def }));
  chips.forEach((c) => chipBox.appendChild(c.label));
  cardScope.body.appendChild(chipBox);
  const allBtn = makeButton('全選択', 'sub');
  const noneBtn = makeButton('全解除', 'sub');
  cardScope.actions.appendChild(allBtn);
  cardScope.actions.appendChild(noneBtn);
  allBtn.addEventListener('click', () => chips.forEach((c) => { c.checkbox.checked = true; }));
  noneBtn.addEventListener('click', () => chips.forEach((c) => { c.checkbox.checked = false; }));
  panel.body.insertBefore(cardScope.card, panel.status);

  // ---- 詳細オプション ----
  const advDetails = makeDetails('詳細オプション');
  const ignTa = makeTextarea({ rows: 2, code: true, placeholder: '無視キー（カンマ区切り）' });
  advDetails.body.appendChild(makeRow(ignTa, { label: '無視キー', block: true }));

  const includeSame = makeCheck({ label: '同一行も差分行に含める' });
  const nView = makeCheck({ label: 'ビュー順序を正規化', checked: false });
  const nPerm = makeCheck({ label: '権限順序を正規化', checked: false });
  const nAll = makeCheck({ label: '配列順序を無視', checked: false });
  const normGrid = document.createElement('div');
  normGrid.className = 'kus-lp__check-grid';
  normGrid.appendChild(includeSame.label);
  normGrid.appendChild(nView.label);
  normGrid.appendChild(nPerm.label);
  normGrid.appendChild(nAll.label);
  advDetails.body.appendChild(normGrid);
  panel.body.insertBefore(advDetails.details, panel.status);

  // ---- 実行 ----
  const runBtn = makeButton('差分比較を実行', 'run', { icon: '◎' });
  panel.body.insertBefore(runBtn, panel.status);

  // ---- 出力 ----
  const cardOut = makeCard({ title: 'ファイル出力', number: 3, soft: true });
  cardOut.body.appendChild(makeNote('比較完了後に利用できます。レポートに生設定を含めるか選べます。'));
  const expMode = makeSelect([
    ['diffOnly', '行データのみ'],
    ['withCompared', '行データ + 比較セクションの設定']
  ], 'diffOnly');
  cardOut.body.appendChild(makeRow(expMode, { label: 'レポート' }));

  const grid = document.createElement('div');
  grid.className = 'kus-lp__btn-grid';
  const bJson = makeButton('差分 JSON', 'sub', { icon: '↓' });
  const bHtml = makeButton('差分 HTML', 'sub', { icon: '↓' });
  const bBundle = makeButton('バンドル JSON', 'sub', { icon: '↓' });
  const bPatch = makeButton('パッチ JSON', 'sub', { icon: '↓' });
  grid.appendChild(bJson);
  grid.appendChild(bHtml);
  grid.appendChild(bBundle);
  grid.appendChild(bPatch);
  cardOut.body.appendChild(grid);
  panel.body.insertBefore(cardOut.card, panel.status);

  // ---- 結果行表示 ----
  let cache: null | { rows: any[]; fetchIssues: any[]; sourceBundle: any; targetBundle: any; scopes: string[]; ignoreKeys: string; normalizationPresetState: any } = null;

  function readForm() {
    return {
      source: { appId: srcApp.value.trim(), guestId: srcGuest.value.trim(), preview: srcPrev.checkbox.checked },
      target: { appId: tgtApp.value.trim(), guestId: tgtGuest.value.trim(), preview: tgtPrev.checkbox.checked },
      scopes: chips.filter((c) => c.checkbox.checked).map((c) => c.checkbox.value),
      ignoreKeys: ignTa.value,
      includeSame: includeSame.checkbox.checked,
      normalizationPresetState: {
        viewOrder: nView.checkbox.checked,
        permissionOrder: nPerm.checkbox.checked,
        generalArrayOrder: nAll.checkbox.checked
      }
    };
  }

  function printRows(rows: any[]) {
    const max = 400;
    const lines: string[] = [];
    for (let i = 0; i < rows.length && i < max; i++) {
      const r = rows[i];
      lines.push(`${r.sectionKey || ''}\t${r.type || ''}\t${r.path || ''}\t${r.label || ''}`);
    }
    let txt = lines.join('\n');
    if (rows.length > max) txt += `\n... 他 ${rows.length - max} 件`;
    panel.setResult(txt || '差分はありません');
  }

  function exportCtx() {
    if (!cache) throw new Error('先に差分比較を実行してください');
    return { ...cache, exportContentMode: expMode.value || 'diffOnly' };
  }

  runBtn.addEventListener('click', () => {
    cache = null;
    panel.setResult('');
    const f = readForm();
    if (!f.scopes.length) {
      panel.setStatus('比較セクションを 1 つ以上選択してください', 'warn');
      return;
    }
    liteRun(panel, '差分比較を実行中…', async () => {
      const out = await runDiffStandalone({
        source: f.source,
        target: f.target,
        scopes: f.scopes,
        ignoreKeys: f.ignoreKeys,
        includeSame: f.includeSame,
        normalizationPresetState: f.normalizationPresetState,
        onStatus: (m: string) => panel.setStatus(m, 'busy')
      });
      cache = {
        rows: out.rows,
        fetchIssues: out.fetchIssues || [],
        sourceBundle: out.sourceBundle,
        targetBundle: out.targetBundle,
        scopes: f.scopes,
        ignoreKeys: f.ignoreKeys,
        normalizationPresetState: f.normalizationPresetState
      };
      printRows(out.rows);
      panel.setStatus(`${out.summary?.text || '完了'} — ファイル出力ボタンから保存できます`, 'ok');
    });
  });

  bJson.addEventListener('click', () => {
    try {
      runExportDiffJsonStandalone(exportCtx());
      panel.setStatus('差分 JSON をダウンロードしました', 'ok');
    } catch (e: any) {
      panel.setStatus(`エラー: ${e.message || String(e)}`, 'err');
    }
  });
  bHtml.addEventListener('click', () => {
    try {
      runExportDiffHtmlStandalone(exportCtx());
      panel.setStatus('差分 HTML をダウンロードしました', 'ok');
    } catch (e: any) {
      panel.setStatus(`エラー: ${e.message || String(e)}`, 'err');
    }
  });
  bBundle.addEventListener('click', () => {
    try {
      if (!cache) throw new Error('先に差分比較を実行してください');
      runExportBundleJsonStandalone(cache.sourceBundle, cache.targetBundle);
      panel.setStatus('バンドル JSON をダウンロードしました', 'ok');
    } catch (e: any) {
      panel.setStatus(`エラー: ${e.message || String(e)}`, 'err');
    }
  });
  bPatch.addEventListener('click', () => {
    try {
      if (!cache) throw new Error('先に差分比較を実行してください');
      runExportPatchJsonStandalone(cache.rows, cache.sourceBundle, cache.targetBundle);
      panel.setStatus('パッチ JSON をダウンロードしました', 'ok');
    } catch (e: any) {
      panel.setStatus(`エラー: ${e.message || String(e)}`, 'err');
    }
  });
}
