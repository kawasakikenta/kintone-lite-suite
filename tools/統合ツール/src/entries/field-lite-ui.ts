'use strict';

import { DEFAULT_APP_ID } from '../constants.js';
import { setStatus } from '../ui/components.js';
import { runFieldApplyStandalone, runLoadFieldsStandalone } from '../tabs/field-standalone.js';
import { mountKusLitePanel } from './liteMount.js';
import { row, mkInput, mkBtn, mkOption, mkNote, liteRun } from './litePanelHelpers.js';

export function mountFieldLitePanel() {
  const { bodySlot } = mountKusLitePanel({
    id: 'kus-field-lite',
    title: 'フィールド追加',
    note: 'フィールド定義JSONを比較先アプリへ追加・更新します。統合ツール.js は不要です。'
  });

  const srcApp = mkInput('比較元アプリID', { value: DEFAULT_APP_ID || '' });
  const srcGuest = mkInput('ゲストID（任意）');
  const tgtApp = mkInput('比較先アプリID');
  const tgtGuest = mkInput('ゲストID（任意）');

  bodySlot.appendChild(row('比較元ID', srcApp));
  bodySlot.appendChild(row('元ゲスト', srcGuest));
  bodySlot.appendChild(row('比較先ID', tgtApp));
  bodySlot.appendChild(row('先ゲスト', tgtGuest));

  const fieldJson = document.createElement('textarea');
  fieldJson.rows = 6;
  fieldJson.placeholder = 'フィールド定義JSON（{ "properties": { ... } } 形式）';
  fieldJson.style.cssText = 'width:100%;font-size:11px;font-family:monospace;border:1px solid #e2e8f0;border-radius:8px;padding:8px;resize:vertical;background:#f8fafc;color:#334155;margin-bottom:8px';
  bodySlot.appendChild(fieldJson);

  const lookupMap = document.createElement('textarea');
  lookupMap.rows = 2;
  lookupMap.placeholder = 'Lookup AppID変換JSON（任意）: {"旧AppID":"新AppID",...}';
  lookupMap.style.cssText = 'width:100%;font-size:11px;font-family:monospace;border:1px solid #e2e8f0;border-radius:8px;padding:8px;resize:vertical;background:#f8fafc;color:#334155;margin-bottom:8px';
  bodySlot.appendChild(lookupMap);

  const optRow = document.createElement('div');
  optRow.style.cssText = 'display:flex;flex-wrap:wrap;gap:12px;margin-bottom:12px';
  const overwriteOpt = mkOption('既存フィールドを上書き');
  optRow.appendChild(overwriteOpt.label);
  bodySlot.appendChild(optRow);

  bodySlot.appendChild(mkNote('本番デプロイはツールから実行できません。'));

  const resultPre = document.createElement('pre');
  resultPre.style.cssText = 'margin:0;padding:10px;font-size:11px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;max-height:160px;overflow:auto;white-space:pre-wrap;display:none';
  bodySlot.appendChild(resultPre);

  const btnRow = document.createElement('div');
  btnRow.style.cssText = 'display:flex;flex-direction:column;gap:8px;margin-top:4px';

  const grayBg = 'linear-gradient(180deg,#64748b,#475569)';

  const bLoadSrc = mkBtn('比較元フィールドを読込', { bg: grayBg });
  bLoadSrc.addEventListener('click', () => liteRun(async () => {
    const props = await runLoadFieldsStandalone(
      { appId: srcApp.value.trim(), guestId: srcGuest.value.trim(), preview: true },
      (m, e) => setStatus(m, e)
    );
    fieldJson.value = JSON.stringify({ properties: props }, null, 2);
  }));

  const bLoadTgt = mkBtn('比較先フィールドを読込', { bg: grayBg });
  bLoadTgt.addEventListener('click', () => liteRun(async () => {
    const props = await runLoadFieldsStandalone(
      { appId: tgtApp.value.trim(), guestId: tgtGuest.value.trim(), preview: true },
      (m, e) => setStatus(m, e)
    );
    fieldJson.value = JSON.stringify({ properties: props }, null, 2);
  }));

  const bApply = mkBtn('比較先へフィールド反映');
  bApply.addEventListener('click', () => liteRun(async () => {
    resultPre.style.display = 'block';
    resultPre.textContent = '';
    const logs = await runFieldApplyStandalone(
      {
        targetAppId: tgtApp.value.trim(),
        targetGuestId: tgtGuest.value.trim(),
        fieldJson: fieldJson.value,
        lookupMapJson: lookupMap.value,
        overwrite: overwriteOpt.checkbox.checked,
        deploy: false
      },
      (m, e) => setStatus(m, e)
    );
    resultPre.textContent = logs.join('\n');
  }));

  btnRow.appendChild(bLoadSrc);
  btnRow.appendChild(bLoadTgt);
  btnRow.appendChild(bApply);
  bodySlot.appendChild(btnRow);
}
