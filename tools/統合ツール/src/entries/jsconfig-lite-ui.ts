'use strict';

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
  cardApply.body.appendChild(makeNote('反映先は常にプレビュー環境。デプロイは管理画面から手動で行ってください。'));
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
}
