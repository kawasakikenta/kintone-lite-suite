'use strict';

import { DEFAULT_APP_ID } from '../constants.js';
import { setStatus } from '../ui/components.js';
import { esc } from '../utils.js';
import { runFieldApplyStandalone, runLoadFieldsStandalone } from '../tabs/field-standalone.js';
import { mountKusLitePanel } from './liteMount.js';

function row(labelHtml, child) {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-bottom:10px';
  const lab = document.createElement('span');
  lab.style.cssText = 'font-size:12px;font-weight:600;color:#334155;min-width:6em';
  lab.innerHTML = labelHtml;
  wrap.appendChild(lab);
  wrap.appendChild(child);
  return wrap;
}

export function mountFieldLitePanel() {
  const { bodySlot } = mountKusLitePanel({
    id: 'kus-field-lite',
    title: 'フィールド追加',
    note: 'フィールド定義JSONを比較先アプリへ追加・更新します。統合ツール.js は不要です。'
  });

  const mkInput = (ph: string, val: string = '') => {
    const inp = document.createElement('input');
    inp.type = 'text';
    inp.placeholder = ph;
    if (val) inp.value = val;
    inp.style.cssText = 'width:min(120px,40vw);padding:6px 10px;border:1px solid #e2e8f0;border-radius:8px;font-size:12px';
    return inp;
  };

  const srcApp = mkInput('比較元アプリID', DEFAULT_APP_ID || '');
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
  const mkOpt = (text) => {
    const label = document.createElement('label');
    label.style.cssText = 'font-size:11px;color:#475569;display:inline-flex;align-items:center;gap:4px;cursor:pointer';
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    label.appendChild(cb);
    label.appendChild(document.createTextNode(text));
    optRow.appendChild(label);
    return cb;
  };
  const overwriteCb = mkOpt('既存フィールドを上書き');
  bodySlot.appendChild(optRow);
  const deployNote = document.createElement('div');
  deployNote.style.cssText = 'font-size:11px;color:#64748b;margin:-4px 0 8px;line-height:1.45';
  deployNote.textContent = '本番デプロイはツールから実行できません。';
  bodySlot.appendChild(deployNote);

  const resultPre = document.createElement('pre');
  resultPre.style.cssText = 'margin:0;padding:10px;font-size:11px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;max-height:160px;overflow:auto;white-space:pre-wrap;display:none';
  bodySlot.appendChild(resultPre);

  const btnRow = document.createElement('div');
  btnRow.style.cssText = 'display:flex;flex-direction:column;gap:8px;margin-top:4px';

  function mkBtn(text, bg) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = text;
    b.style.cssText = `padding:10px 14px;font-size:13px;font-weight:700;border:none;border-radius:10px;background:${bg};color:#fff;cursor:pointer`;
    return b;
  }

  const bLoadSrc = mkBtn('比較元フィールドを読込', 'linear-gradient(180deg,#64748b,#475569)');
  bLoadSrc.addEventListener('click', async () => {
    try {
      const props = await runLoadFieldsStandalone(
        { appId: srcApp.value.trim(), guestId: srcGuest.value.trim(), preview: true },
        (m, e) => setStatus(m, e)
      );
      fieldJson.value = JSON.stringify({ properties: props }, null, 2);
    } catch (e) { setStatus(e.message || String(e), true); }
  });

  const bLoadTgt = mkBtn('比較先フィールドを読込', 'linear-gradient(180deg,#64748b,#475569)');
  bLoadTgt.addEventListener('click', async () => {
    try {
      const props = await runLoadFieldsStandalone(
        { appId: tgtApp.value.trim(), guestId: tgtGuest.value.trim(), preview: true },
        (m, e) => setStatus(m, e)
      );
      fieldJson.value = JSON.stringify({ properties: props }, null, 2);
    } catch (e) { setStatus(e.message || String(e), true); }
  });

  const bApply = mkBtn('比較先へフィールド反映', 'linear-gradient(180deg,#3b82f6,#2563eb)');
  bApply.addEventListener('click', async () => {
    resultPre.style.display = 'block';
    resultPre.textContent = '';
    try {
      const logs = await runFieldApplyStandalone(
        {
          targetAppId: tgtApp.value.trim(),
          targetGuestId: tgtGuest.value.trim(),
          fieldJson: fieldJson.value,
          lookupMapJson: lookupMap.value,
          overwrite: overwriteCb.checked,
          deploy: false
        },
        (m, e) => setStatus(m, e)
      );
      resultPre.textContent = logs.join('\n');
    } catch (e) { setStatus(e.message || String(e), true); }
  });

  btnRow.appendChild(bLoadSrc);
  btnRow.appendChild(bLoadTgt);
  btnRow.appendChild(bApply);
  bodySlot.appendChild(btnRow);
}
