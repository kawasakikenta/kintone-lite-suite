'use strict';

import { DEFAULT_APP_ID, SECTION_DEFS } from '../constants.js';
import { setStatus } from '../ui/components.js';
import { runApplyPreviewStandalone } from '../tabs/reflect-standalone.js';
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

export function mountReflectLitePanel() {
  const { bodySlot } = mountKusLitePanel({
    id: 'kus-reflect-lite',
    title: 'プレビュー反映',
    note: '比較元アプリの設定を比較先プレビュー環境へ一括反映します。統合ツール.js は不要です。'
  });

  const mkInput = (ph, val) => {
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

  const scopeBox = document.createElement('div');
  scopeBox.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px';
  const putSections = SECTION_DEFS.filter((d) => d.put);
  const scopeChecks = putSections.map((d) => {
    const label = document.createElement('label');
    label.style.cssText = 'font-size:11px;display:inline-flex;align-items:center;gap:4px;cursor:pointer;padding:3px 6px;border:1px solid #e2e8f0;border-radius:6px;background:#f8fafc';
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = true;
    cb.dataset.key = d.key;
    label.appendChild(cb);
    label.appendChild(document.createTextNode(d.label));
    scopeBox.appendChild(label);
    return cb;
  });

  const scopeLabel = document.createElement('div');
  scopeLabel.style.cssText = 'font-size:12px;font-weight:600;color:#334155;margin-bottom:6px';
  scopeLabel.textContent = '反映セクション:';
  bodySlot.appendChild(scopeLabel);
  bodySlot.appendChild(scopeBox);

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
  const deployCb = mkOpt('デプロイ実行');
  const backupCb = mkOpt('バックアップ保存');
  backupCb.checked = true;
  const stopCb = mkOpt('エラー時中断');
  bodySlot.appendChild(optRow);

  const logArea = document.createElement('pre');
  logArea.style.cssText = 'margin:0;padding:10px;font-size:11px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;max-height:200px;overflow:auto;white-space:pre-wrap;display:none';
  bodySlot.appendChild(logArea);

  const runBtn = document.createElement('button');
  runBtn.type = 'button';
  runBtn.textContent = 'プレビュー反映を実行';
  runBtn.style.cssText =
    'padding:10px 14px;font-size:13px;font-weight:700;border:none;border-radius:10px;background:linear-gradient(180deg,#dc2626,#b91c1c);color:#fff;cursor:pointer;margin-top:4px';

  runBtn.addEventListener('click', async () => {
    const scopes = scopeChecks.filter((cb) => cb.checked).map((cb) => cb.dataset.key);
    logArea.style.display = 'block';
    logArea.textContent = '';
    try {
      await runApplyPreviewStandalone(
        {
          sourceAppId: srcApp.value.trim(),
          sourceGuestId: srcGuest.value.trim(),
          sourcePreview: true,
          targetAppId: tgtApp.value.trim(),
          targetGuestId: tgtGuest.value.trim(),
          scopes,
          doDeploy: deployCb.checked,
          doBackup: backupCb.checked,
          stopOnError: stopCb.checked
        },
        (m, e) => setStatus(m, e),
        (logs) => {
          logArea.textContent = logs.join('\n');
          logArea.scrollTop = logArea.scrollHeight;
        }
      );
    } catch (e) {
      setStatus(e.message || String(e), true);
    }
  });

  bodySlot.appendChild(runBtn);
}
