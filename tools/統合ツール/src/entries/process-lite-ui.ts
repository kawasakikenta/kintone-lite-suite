'use strict';

import { installLiteWorkflow, foldWorkflowSection, connectionSummary } from './liteWorkflow.js';

import { DEFAULT_APP_ID } from '../constants.js';
import { runRenderProcessFlowStandalone } from '../tabs/process-standalone.js';
import {
  createLitePanel,
  makeRow,
  makeInput,
  makeButton,
  makeCard,
  makeNote,
  liteRun
} from './litePanelTheme.js';
import { createAppSearchControl } from './appSearchControl.js';

export function mountProcessLitePanel() {
  const panel = createLitePanel({
    id: 'kus-process-lite',
    title: 'プロセス図',
    subtitle: 'プロセス管理を Mermaid フロー図で描画し、シミュレーションで動きを確認します。',
    accent: 'process',
    badges: [{ label: 'Lite' }, { label: 'シミュレーション可' }],
    hint: 'プロセスの流れと状態遷移を確認できます。シミュレーションで実際のレコードが更新されることはありません。'
  });

  // ---- 入力 ----
  const cardApp = makeCard({ title: '対象アプリ', number: 1 });
  const appInp = makeInput({ placeholder: 'アプリID', value: DEFAULT_APP_ID || '', width: 'id' });
  const guestInp = makeInput({ placeholder: 'ゲストID（任意）', width: 'guest' });
  cardApp.body.appendChild(makeRow([appInp, guestInp], { label: 'アプリ' }));
  cardApp.body.appendChild(createAppSearchControl(panel, {
    guestEl: guestInp,
    targets: [{ apply: (id, _name, guestId) => { appInp.value = id; if (guestId && !guestInp.value.trim()) guestInp.value = guestId; } }]
  }));

  const runBtn = makeButton('フロー図を描画', 'run', { icon: '◐' });
  cardApp.body.appendChild(runBtn);
  panel.body.insertBefore(cardApp.card, panel.status);

  // ---- 描画 ----
  const cardDiag = makeCard({ title: 'プロセス図', number: 2, soft: true });
  const viewEl = document.createElement('div');
  viewEl.style.cssText = 'min-height:64px;background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:10px;overflow:auto;max-height:340px';
  viewEl.innerHTML = '<span class="kus-lp__small">描画結果がここに表示されます</span>';
  cardDiag.body.appendChild(viewEl);
  panel.body.insertBefore(cardDiag.card, panel.status);

  // ---- Mermaid テキスト ----
  const cardText = makeCard({ title: 'Mermaid ソース', soft: true });
  const textEl = document.createElement('textarea');
  textEl.className = 'kus-lp__textarea kus-lp__textarea--code';
  textEl.rows = 5;
  textEl.readOnly = true;
  textEl.placeholder = 'Mermaid 用ソースがここに表示されます';
  cardText.body.appendChild(textEl);
  panel.body.insertBefore(cardText.card, panel.status);

  // ---- シミュレーション ----
  const cardSim = makeCard({ title: 'シミュレーション', number: 3 });
  cardSim.card.style.display = 'none';
  const curRow = document.createElement('div');
  curRow.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:8px';
  const curLabel = document.createElement('span');
  curLabel.className = 'kus-lp__label';
  curLabel.textContent = '現在状態';
  const curEl = document.createElement('span');
  curEl.style.cssText = 'display:inline-block;padding:4px 10px;font-size:11.5px;border-radius:6px;background:#e2e8f0;color:#1e293b;font-weight:600';
  curEl.textContent = '未開始';
  curRow.appendChild(curLabel);
  curRow.appendChild(curEl);
  cardSim.body.appendChild(curRow);

  const simSelect = document.createElement('select');
  simSelect.className = 'kus-lp__select kus-lp__input--full';
  simSelect.innerHTML = '<option value="">--</option>';
  cardSim.body.appendChild(makeRow(simSelect, { label: 'アクション' }));

  const simStartBtn = makeButton('最初から開始', 'sub', { icon: '⟲' });
  const simExecBtn = makeButton('アクション実行', 'primary', { icon: '▶' });
  cardSim.body.appendChild(makeRow([simStartBtn, simExecBtn]));
  cardSim.body.appendChild(makeNote('シミュレーションは実データを変更しません。状態遷移の確認用です。'));
  panel.body.insertBefore(cardSim.card, panel.status);

  runBtn.addEventListener('click', () => liteRun(panel, 'プロセスフロー生成中…', async () => {
    const result = await runRenderProcessFlowStandalone(
      { appId: appInp.value.trim(), guestId: guestInp.value.trim() },
      (m: string, e?: boolean) => panel.setStatus(m, e ? 'err' : 'busy'),
      {
        textEl,
        viewEl,
        simUi: {
          container: cardSim.card,
          current: curEl,
          select: simSelect,
          startBtn: simStartBtn,
          execBtn: simExecBtn
        }
      }
    );
    // 描画側が警告（Mermaid 読込失敗 / from-to 未設定のアクション除外）を出している場合は残す
    if (result && panel.status.dataset.tone !== 'err') {
      panel.setStatus(`プロセスフロー生成完了（状態 ${Object.keys(result.states || {}).length}件 / アクション ${(result.actions || []).length}件）`, 'ok');
    }
  }));

  appInp.setAttribute('aria-label', '対象アプリID');
  guestInp.setAttribute('aria-label', 'ゲストスペースID');
  simSelect.setAttribute('aria-label', 'シミュレーションのアクション');
  textEl.setAttribute('aria-label', 'プロセス図のMermaidソース');
  installLiteWorkflow(panel, {
    setup: [cardApp.card], results: [cardDiag.card, cardSim.card, foldWorkflowSection('図のソースを確認する', cardText.card)],
    beforeRun: () => { textEl.value = ''; viewEl.replaceChildren(); cardSim.card.style.display = 'none'; },
    actions: [{ id: 'render', label: 'プロセス図を表示', description: '状態とアクションの流れを表示し、結果画面でシミュレーションできます。', button: runBtn,
      validate: () => appInp.value.trim() ? '' : '対象アプリIDを指定してください。',
      summary: () => [['対象', connectionSummary(appInp.value.trim(), guestInp.value.trim())], ['操作', '状態遷移図を表示。シミュレーションは実データを変更しません。']]
    }]
  });

}
