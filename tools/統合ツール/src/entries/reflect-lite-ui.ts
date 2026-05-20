'use strict';

import { DEFAULT_APP_ID, SECTION_DEFS } from '../constants.js';
import { runApplyPreviewStandalone } from '../tabs/reflect-standalone.js';
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

let memoryState: any = {};

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

  const cardApp = makeCard({ title: 'アプリ', number: 1 });
  cardApp.body.appendChild(makeRow([srcApp, srcGuest], { label: '比較元' }));
  cardApp.body.appendChild(makeRow([tgtApp, tgtGuest], { label: '比較先' }));
  const quickRow = makeRow([copyBtn, currentBtn]);
  quickRow.style.marginTop = '4px';
  cardApp.body.appendChild(quickRow);
  panel.body.insertBefore(cardApp.card, panel.status);

  copyBtn.addEventListener('click', () => {
    tgtApp.value = srcApp.value.trim();
    tgtGuest.value = srcGuest.value.trim();
    saveState();
    panel.setStatus('比較元IDを比較先へコピーしました', 'info');
  });
  currentBtn.addEventListener('click', () => {
    tgtApp.value = DEFAULT_APP_ID || '';
    saveState();
    panel.setStatus('現在のアプリIDを比較先にセットしました', 'info');
  });

  // ---- セクション選択 ----
  const cardScope = makeCard({ title: '反映するセクション', number: 2 });
  const putSections = SECTION_DEFS.filter((d) => d.put);
  const chips = putSections.map((d) => makeChip({ label: d.label, checked: true, value: d.key }));
  const chipBox = document.createElement('div');
  chipBox.className = 'kus-lp__chips';
  chips.forEach((c) => chipBox.appendChild(c.label));
  cardScope.body.appendChild(chipBox);

  const allBtn = makeButton('全選択', 'sub');
  const noneBtn = makeButton('全解除', 'sub');
  cardScope.actions.appendChild(allBtn);
  cardScope.actions.appendChild(noneBtn);
  allBtn.addEventListener('click', () => chips.forEach((c) => { c.checkbox.checked = true; }));
  noneBtn.addEventListener('click', () => chips.forEach((c) => { c.checkbox.checked = false; }));
  panel.body.insertBefore(cardScope.card, panel.status);

  // ---- オプション ----
  const cardOpt = makeCard({ title: '実行オプション', number: 3, soft: true });
  const backup = makeCheck({ label: '比較先プレビューのバックアップを保存', checked: true });
  const srcPreview = makeCheck({ label: '比較元をプレビューから取得', checked: memoryState.sourcePreview !== false });
  const stop = makeCheck({ label: 'エラー時に中断する', checked: !!memoryState.stopOnError });
  const optGrid = document.createElement('div');
  optGrid.className = 'kus-lp__check-grid';
  optGrid.appendChild(backup.label);
  optGrid.appendChild(srcPreview.label);
  optGrid.appendChild(stop.label);
  cardOpt.body.appendChild(optGrid);

  // Lookup mapping
  const lookupDetails = makeDetails('Lookup AppID マッピング（任意）');
  const lookupTa = makeTextarea({ rows: 3, code: true, placeholder: '{"旧AppID":"新AppID", ...}' });
  lookupDetails.body.appendChild(lookupTa);
  cardOpt.body.appendChild(lookupDetails.details);
  panel.body.insertBefore(cardOpt.card, panel.status);

  // ---- 実行 ----
  const runBtn = makeButton('プレビュー反映を実行', 'run', { icon: '⤴' });
  runBtn.classList.add('kus-lp__btn--danger');
  runBtn.classList.remove('kus-lp__btn--run');
  runBtn.style.cssText = ''; // クラスのみ反映
  // 反映は破壊的なので danger 色のまま run 同等の幅を与える
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

  function saveState() {
    memoryState = {
      sourceAppId: srcApp.value.trim(),
      sourceGuestId: srcGuest.value.trim(),
      targetAppId: tgtApp.value.trim(),
      targetGuestId: tgtGuest.value.trim(),
      sourcePreview: srcPreview.checkbox.checked,
      stopOnError: stop.checkbox.checked
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
    logCard.card.style.display = 'block';
    logPre.style.display = 'block';
    logPre.textContent = '';
    return liteRun(panel, 'プレビュー反映 実行中…', async () => {
      const lookupMap = parseLookupMap(lookupTa.value);
      await runApplyPreviewStandalone(
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
        (logs: string[]) => {
          logPre.textContent = logs.join('\n');
          logPre.scrollTop = logPre.scrollHeight;
        }
      );
    }, 'プレビュー反映が完了しました（kintone管理画面でデプロイ実行してください）');
  });
}
