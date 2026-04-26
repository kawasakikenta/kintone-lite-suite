'use strict';

import { DEFAULT_APP_ID } from '../constants.js';
import { setStatus } from '../ui/components.js';
import { runRenderProcessFlowStandalone } from '../tabs/process-standalone.js';
import { mountKusLitePanel } from './liteMount.js';
import { row, mkInput, mkBtn, liteRun } from './litePanelHelpers.js';

export function mountProcessLitePanel() {
  const { bodySlot } = mountKusLitePanel({
    id: 'kus-process-lite',
    title: 'プロセス実行',
    note: 'プロセス管理のフロー図を Mermaid で描画し、シミュレーションも可能です。統合ツール.js は不要です。'
  });

  const appInp = mkInput('アプリID', { value: DEFAULT_APP_ID || '' });
  const guestInp = mkInput('ゲストID（任意）');

  bodySlot.appendChild(row('アプリID', appInp));
  bodySlot.appendChild(row('ゲスト', guestInp));

  const runBtn = mkBtn('フロー図を描画', { bg: 'linear-gradient(180deg,#f97316,#ea580c)', marginTop: '0' });
  runBtn.style.cssText += ';padding:10px 14px;font-size:13px;margin-bottom:14px';
  bodySlot.appendChild(runBtn);

  const viewEl = document.createElement('div');
  viewEl.style.cssText =
    'min-height:60px;border:1px solid #e2e8f0;border-radius:8px;background:#fafafa;padding:8px;overflow:auto;max-height:320px;margin-bottom:8px';
  viewEl.innerHTML = '<span style="color:#94a3b8;font-size:11px">描画結果がここに表示されます</span>';
  bodySlot.appendChild(viewEl);

  const textEl = document.createElement('textarea');
  textEl.rows = 4;
  textEl.readOnly = true;
  textEl.style.cssText =
    'width:100%;font-size:11px;font-family:monospace;border:1px solid #e2e8f0;border-radius:8px;padding:8px;margin-bottom:8px;resize:vertical;background:#f8fafc;color:#334155';
  textEl.placeholder = 'Mermaid ソースがここに表示されます';
  bodySlot.appendChild(textEl);

  const simContainer = document.createElement('div');
  simContainer.style.cssText = 'display:none;border:1px solid #e2e8f0;border-radius:8px;padding:10px;margin-top:4px;background:#f0fdf4';

  const simTitle = document.createElement('div');
  simTitle.style.cssText = 'font-size:11px;font-weight:700;color:#166534;margin-bottom:6px';
  simTitle.textContent = 'シミュレーション';
  simContainer.appendChild(simTitle);

  const simCurEl = document.createElement('span');
  simCurEl.style.cssText = 'display:inline-block;padding:3px 8px;font-size:11px;border-radius:6px;margin-bottom:8px;background:#e2e8f0;color:#1e293b;font-weight:600';
  simCurEl.textContent = '未開始';
  simContainer.appendChild(simCurEl);

  const simSelect = document.createElement('select');
  simSelect.style.cssText = 'display:block;width:100%;padding:6px 10px;font-size:12px;border:1px solid #d1d5db;border-radius:8px;margin-bottom:8px;background:#fff';
  simSelect.innerHTML = '<option value="">--</option>';
  simContainer.appendChild(simSelect);

  const simBtnRow = document.createElement('div');
  simBtnRow.style.cssText = 'display:flex;gap:8px';

  const simStartBtn = document.createElement('button');
  simStartBtn.type = 'button';
  simStartBtn.textContent = '最初から開始';
  simStartBtn.style.cssText =
    'padding:6px 12px;font-size:11px;font-weight:600;border:1px solid #16a34a;border-radius:8px;background:#dcfce7;color:#166534;cursor:pointer';
  simBtnRow.appendChild(simStartBtn);

  const simExecBtn = document.createElement('button');
  simExecBtn.type = 'button';
  simExecBtn.textContent = 'アクション実行';
  simExecBtn.style.cssText =
    'padding:6px 12px;font-size:11px;font-weight:600;border:1px solid #2563eb;border-radius:8px;background:#dbeafe;color:#1e40af;cursor:pointer';
  simBtnRow.appendChild(simExecBtn);

  simContainer.appendChild(simBtnRow);
  bodySlot.appendChild(simContainer);

  runBtn.addEventListener('click', () => liteRun(async () => {
    await runRenderProcessFlowStandalone(
      { appId: appInp.value.trim(), guestId: guestInp.value.trim() },
      (m, e) => setStatus(m, e),
      {
        textEl,
        viewEl,
        simUi: {
          container: simContainer,
          current: simCurEl,
          select: simSelect,
          startBtn: simStartBtn,
          execBtn: simExecBtn
        }
      }
    );
  }));
}
