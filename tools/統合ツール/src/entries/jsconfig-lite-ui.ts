'use strict';

import { installLiteWorkflow, connectionSummary, validateJsonObject } from './liteWorkflow.js';

import { DEFAULT_APP_ID } from '../constants.js';
import {
  runApplyJsConfigStandalone,
  runExportJsConfigStandalone,
  runFetchJsConfigStandalone,
  runBatchJsConfigDownloadStandalone
} from '../tabs/jsconfig-standalone.js';
import {
  createLitePanel,
  makeRow,
  makeInput,
  makeButton,
  makeCheck,
  makeTextarea,
  makeCard,
  makeDetails,
  makeNote,
  liteRun
} from './litePanelTheme.js';
import { createAppSearchControl } from './appSearchControl.js';

export function mountJsconfigLitePanel() {
  const panel = createLitePanel({
    id: 'kus-jsconfig-lite',
    title: 'JS / CSS 設定',
    subtitle: 'カスタマイズの取得・編集・JSON 保存・比較先プレビューへの反映',
    accent: 'jsconfig',
    badges: [{ label: 'Lite' }, { label: '取得 + 反映' }],
    hint: 'プレビュー環境への反映後、本番デプロイは kintone 管理画面から手動で行ってください。'
  });

  // 取得
  const cardFetch = makeCard({ title: '取得', number: 1 });
  const srcApp = makeInput({ placeholder: '取得元アプリID', value: DEFAULT_APP_ID || '', width: 'id' });
  const srcGuest = makeInput({ placeholder: 'ゲストID', width: 'guest' });
  const srcPrev = makeCheck({ label: 'プレビュー環境から取得' });
  cardFetch.body.appendChild(makeRow([srcApp, srcGuest, srcPrev.label], { label: '取得元' }));
  const fetchAppSearch = createAppSearchControl(panel, {
    guestEl: srcGuest,
    targets: [
      { label: '取得元', apply: (id, _name, guestId) => { srcApp.value = id; if (guestId && !srcGuest.value.trim()) srcGuest.value = guestId; } }
    ]
  });
  cardFetch.body.appendChild(fetchAppSearch);
  const fetchBtn = makeButton('JS/CSS を取得', 'primary', { icon: '⤓' });
  cardFetch.body.appendChild(makeRow(fetchBtn));
  panel.body.insertBefore(cardFetch.card, panel.status);

  // 編集
  const cardJson = makeCard({ title: 'カスタマイズ JSON', number: 2 });
  const jsonTa = makeTextarea({ rows: 9, code: true, placeholder: '取得結果の JSON（手入力も可）' });
  cardJson.body.appendChild(jsonTa);
  const exportBtn = makeButton('JSON ファイル保存', 'sub');
  const formatBtn = makeButton('整形', 'sub');
  formatBtn.addEventListener('click', () => {
    try {
      const parsed = JSON.parse(jsonTa.value);
      jsonTa.value = JSON.stringify(parsed, null, 2);
      panel.setStatus('JSON を整形しました', 'ok');
    } catch (e: any) {
      panel.setStatus('JSON が壊れています: ' + e.message, 'err');
    }
  });
  cardJson.actions.appendChild(formatBtn);
  cardJson.actions.appendChild(exportBtn);
  panel.body.insertBefore(cardJson.card, panel.status);

  // プレビュー（取得済みファイルの一覧）
  const cardPreview = makeCard({ title: '取得結果プレビュー', soft: true });
  const previewBox = document.createElement('div');
  previewBox.className = 'kus-lp__panel-html kus-lp__panel-html--empty';
  cardPreview.body.appendChild(previewBox);
  panel.body.insertBefore(cardPreview.card, panel.status);

  // 反映
  const cardApply = makeCard({ title: '比較先プレビューへ反映', number: 3 });
  const tgtApp = makeInput({ placeholder: '反映先アプリID', width: 'id' });
  const tgtGuest = makeInput({ placeholder: 'ゲストID', width: 'guest' });
  cardApply.body.appendChild(makeRow([tgtApp, tgtGuest], { label: '反映先' }));
  cardApply.body.appendChild(createAppSearchControl(panel, {
    guestEl: tgtGuest,
    targets: [
      { label: '反映先', apply: (id, _name, guestId) => { tgtApp.value = id; if (guestId && !tgtGuest.value.trim()) tgtGuest.value = guestId; } }
    ]
  }));
  cardApply.body.appendChild(makeNote('反映先は常にプレビュー環境。デプロイは管理画面から手動で行ってください。反映先の JS/CSS 一覧は JSON の内容で全置換され、JSON に scope（ALL / ADMIN / NONE）があれば適用範囲も更新します。'));
  cardApply.body.appendChild(makeNote('FILE タイプは反映先で有効なアップロード済み fileKey が必要です。取得結果の fileKey（ダウンロード用）を別アプリへそのまま流用すると kintone に拒否されます。反映前に件数を確認し、取得後に別の更新が入っていた場合は上書きせず中止します。'));
  const applyBtn = makeButton('比較先プレビューへ反映', 'run', { icon: '⤴' });
  cardApply.body.appendChild(applyBtn);
  panel.body.insertBefore(cardApply.card, panel.status);

  const uiApi = {
    setJson: (t: string) => { jsonTa.value = t; },
    setCustomizeHtml: (h: string) => {
      previewBox.innerHTML = h;
      if (h && !h.includes('データがありません')) previewBox.classList.remove('kus-lp__panel-html--empty');
      else previewBox.classList.add('kus-lp__panel-html--empty');
    }
  };

  fetchBtn.addEventListener('click', () => liteRun(panel, 'JS/CSS設定を取得中…', async () => {
    await runFetchJsConfigStandalone(
      { sourceAppId: srcApp.value.trim(), sourceGuestId: srcGuest.value.trim(), preview: srcPrev.checkbox.checked },
      (m: string, e?: boolean) => panel.setStatus(m, e ? 'err' : 'busy'),
      uiApi
    );
  }));

  exportBtn.addEventListener('click', () => liteRun(panel, 'JSON 保存中…', async () => {
    runExportJsConfigStandalone(jsonTa.value, srcApp.value.trim(), (m: string, e?: boolean) => panel.setStatus(m, e ? 'err' : 'busy'));
  }));

  applyBtn.addEventListener('click', () => liteRun(panel, 'JS/CSS 設定を比較先へ反映中…', async () => {
    await runApplyJsConfigStandalone(
      { targetAppId: tgtApp.value.trim(), targetGuestId: tgtGuest.value.trim(), jsonText: jsonTa.value, deployAfter: false },
      (m: string, e?: boolean) => panel.setStatus(m, e ? 'err' : 'busy'),
      (html: string) => { panel.setResultHtml(html); }
    );
  }));

  // 全アプリ JS/CSS ファイル 一括ダウンロード
  const batchDetails = makeDetails('全アプリの JS/CSS ファイルを一括ダウンロード');
  batchDetails.body.appendChild(makeNote('スペース内のアプリを走査し、customize.json の FILE タイプの JS/CSS を 1 つの ZIP にまとめます。URL タイプは除外されます（取得不能のため）。'));
  const batchGuest = makeInput({ placeholder: 'ゲストID（任意 / 未指定で全体）', width: 'wide' });
  batchDetails.body.appendChild(makeRow(batchGuest, { label: 'ゲスト' }));
  const batchBtn = makeButton('JS/CSS を ZIP で一括取得', 'primary', { icon: '↓' });
  batchBtn.style.width = '100%';
  batchDetails.body.appendChild(batchBtn);
  panel.body.insertBefore(batchDetails.details, panel.status);

  batchBtn.addEventListener('click', () => liteRun(panel, '全アプリの JS/CSS をスキャン中…', async () => {
    await runBatchJsConfigDownloadStandalone(
      { guestId: batchGuest.value.trim() || srcGuest.value.trim() },
      (m: string, e?: boolean) => panel.setStatus(m, e ? 'err' : 'busy')
    );
  }));

  srcApp.setAttribute('aria-label', '取得元アプリID'); srcGuest.setAttribute('aria-label', '取得元ゲストスペースID');
  tgtApp.setAttribute('aria-label', '反映先アプリID'); tgtGuest.setAttribute('aria-label', '反映先ゲストスペースID');
  jsonTa.setAttribute('aria-label', 'カスタマイズJSON');
  batchGuest.setAttribute('aria-label', '一括取得のゲストスペースID');
  const selectMode = (mode: string) => {
    cardFetch.card.hidden = mode === 'batch' || mode === 'apply';
    cardJson.card.hidden = mode === 'batch' || mode === 'fetch';
    cardApply.card.hidden = mode !== 'apply';
    batchDetails.details.hidden = mode !== 'batch';
    batchDetails.details.open = true;
  };
  const jsonSummary = (): Array<[string, string]> => {
    let data: any = {};
    try { data = JSON.parse(jsonTa.value) || {}; } catch { /* 入力中 */ }
    return [['PC用', 'JS ' + (data.desktop?.js?.length || 0) + ' / CSS ' + (data.desktop?.css?.length || 0)], ['モバイル用', 'JS ' + (data.mobile?.js?.length || 0) + ' / CSS ' + (data.mobile?.css?.length || 0)], ['適用範囲', data.scope || '指定なし']];
  };
  installLiteWorkflow(panel, {
    setup: [cardFetch.card, cardJson.card, cardApply.card, batchDetails.details], results: [cardPreview.card], resultActions: ['fetch'],
    beforeRun: actionId => { if (actionId === 'fetch') { previewBox.replaceChildren(); previewBox.classList.add('kus-lp__panel-html--empty'); } },
    actions: [
      { id: 'fetch', label: 'JS/CSS設定を取得', description: '対象アプリの設定を読み取り、ファイル一覧とJSONを確認します。', button: fetchBtn, validate: () => srcApp.value.trim() ? '' : '取得元アプリIDを指定してください。', summary: () => [['取得元', connectionSummary(srcApp.value.trim(), srcGuest.value.trim(), srcPrev.checkbox.checked ? 'プレビュー' : '本番')]], onSelect: () => selectMode('fetch') },
      { id: 'save', label: 'カスタマイズJSONを保存', description: '取得・編集したJSONをファイルに保存します。', button: exportBtn, validate: () => validateJsonObject(jsonTa.value), summary: jsonSummary, onSelect: () => selectMode('save') },
      { id: 'apply', label: '比較先プレビューへ反映', description: '比較先のJS/CSS一覧をJSONの内容で置き換えます。', button: applyBtn, writes: true, validate: () => !tgtApp.value.trim() ? '反映先アプリIDを指定してください。' : validateJsonObject(jsonTa.value), summary: () => [['反映先', connectionSummary(tgtApp.value.trim(), tgtGuest.value.trim(), 'プレビュー')], ...jsonSummary(), ['反映方法', 'JS/CSS一覧を全置換。FILEは反映先で利用可能なアップロード済みfileKeyが必要です。']], onSelect: () => selectMode('apply') },
      { id: 'batch', label: '全アプリのJS/CSSをZIP保存', description: '対象範囲のアプリを走査してFILE形式の実ファイルをまとめます。', button: batchBtn, validate: () => '', summary: () => [['対象範囲', (batchGuest.value.trim() || srcGuest.value.trim()) ? 'ゲストスペース ' + (batchGuest.value.trim() || srcGuest.value.trim()) : 'アクセス可能な全アプリ'], ['対象ファイル', 'FILE形式のJS/CSS。URL形式は含みません。']], onSelect: () => selectMode('batch') }
    ]
  });

}
