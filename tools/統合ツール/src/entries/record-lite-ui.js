'use strict';

import { DEFAULT_APP_ID } from '../constants.js';
import { setStatus } from '../ui/components.js';
import {
  runCsvExportStandalone,
  runCsvImportStandalone,
  runBatchProcessStandalone,
  runRecordCopyStandalone
} from '../tabs/record-standalone.js';
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

function mkSection(title) {
  const sec = document.createElement('details');
  sec.style.cssText = 'border:1px solid #e2e8f0;border-radius:8px;padding:10px;margin-bottom:10px;background:#fafafa';
  const sum = document.createElement('summary');
  sum.style.cssText = 'font-size:12px;font-weight:700;cursor:pointer;color:#1e293b';
  sum.textContent = title;
  sec.appendChild(sum);
  const body = document.createElement('div');
  body.style.cssText = 'margin-top:10px';
  sec.appendChild(body);
  return { sec, body };
}

export function mountRecordLitePanel() {
  const { bodySlot } = mountKusLitePanel({
    id: 'kus-record-lite',
    title: 'レコード管理',
    note: 'CSVエクスポート/インポート、バッチ処理、レコードコピーを実行します。統合ツール.js は不要です。'
  });

  const mkInput = (ph, val, wide) => {
    const inp = document.createElement('input');
    inp.type = 'text';
    inp.placeholder = ph;
    if (val) inp.value = val;
    inp.style.cssText = `width:min(${wide ? '260px' : '120px'},${wide ? '80vw' : '40vw'});padding:6px 10px;border:1px solid #e2e8f0;border-radius:8px;font-size:12px`;
    return inp;
  };

  const tgtApp = mkInput('アプリID', DEFAULT_APP_ID || '');
  const tgtGuest = mkInput('ゲストID（任意）');
  bodySlot.appendChild(row('アプリID', tgtApp));
  bodySlot.appendChild(row('ゲスト', tgtGuest));

  function mkBtn(text, bg) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = text;
    b.style.cssText = `padding:8px 14px;font-size:12px;font-weight:700;border:none;border-radius:10px;background:${bg};color:#fff;cursor:pointer;margin-top:6px`;
    return b;
  }

  // --- CSV Export ---
  {
    const { sec, body } = mkSection('CSV エクスポート');
    const query = mkInput('絞り込み条件 (任意)', '', true);
    const fname = mkInput('ファイル名', 'records.csv');
    body.appendChild(row('条件', query));
    body.appendChild(row('ファイル名', fname));
    const btn = mkBtn('CSV出力', 'linear-gradient(180deg,#3b82f6,#2563eb)');
    btn.addEventListener('click', async () => {
      try {
        await runCsvExportStandalone(
          { appId: tgtApp.value.trim(), guestId: tgtGuest.value.trim(), query: query.value.trim(), filename: fname.value.trim() },
          (m, e) => setStatus(m, e)
        );
      } catch (e) { setStatus(e.message || String(e), true); }
    });
    body.appendChild(btn);
    bodySlot.appendChild(sec);
  }

  // --- CSV Import ---
  {
    const { sec, body } = mkSection('CSV インポート');
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.csv';
    fileInput.style.cssText = 'font-size:12px';
    body.appendChild(row('CSVファイル', fileInput));
    const btn = mkBtn('インポート実行', 'linear-gradient(180deg,#16a34a,#15803d)');
    btn.addEventListener('click', async () => {
      try {
        await runCsvImportStandalone(
          { appId: tgtApp.value.trim(), guestId: tgtGuest.value.trim(), file: fileInput.files?.[0] },
          (m, e) => setStatus(m, e)
        );
      } catch (e) { setStatus(e.message || String(e), true); }
    });
    body.appendChild(btn);
    bodySlot.appendChild(sec);
  }

  // --- Batch Process ---
  {
    const { sec, body } = mkSection('ステータス一括更新');
    const query = mkInput('絞り込み条件 (任意)', '', true);
    const action = mkInput('アクション名');
    const assignee = mkInput('作業者 (任意)');
    body.appendChild(row('条件', query));
    body.appendChild(row('アクション', action));
    body.appendChild(row('作業者', assignee));
    const btn = mkBtn('一括更新', 'linear-gradient(180deg,#f97316,#ea580c)');
    btn.addEventListener('click', async () => {
      try {
        await runBatchProcessStandalone(
          { appId: tgtApp.value.trim(), guestId: tgtGuest.value.trim(), query: query.value.trim(), action: action.value.trim(), assignee: assignee.value.trim() || null },
          (m, e) => setStatus(m, e)
        );
      } catch (e) { setStatus(e.message || String(e), true); }
    });
    body.appendChild(btn);
    bodySlot.appendChild(sec);
  }

  // --- Record Copy ---
  {
    const { sec, body } = mkSection('レコードコピー');
    const srcApp = mkInput('比較元アプリID');
    const srcGuest = mkInput('ゲストID（任意）');
    const query = mkInput('絞り込み条件 (任意)', '', true);
    body.appendChild(row('比較元ID', srcApp));
    body.appendChild(row('元ゲスト', srcGuest));
    body.appendChild(row('条件', query));
    const btn = mkBtn('コピー実行', 'linear-gradient(180deg,#7c3aed,#6d28d9)');
    btn.addEventListener('click', async () => {
      try {
        await runRecordCopyStandalone(
          { sourceAppId: srcApp.value.trim(), sourceGuestId: srcGuest.value.trim(), targetAppId: tgtApp.value.trim(), targetGuestId: tgtGuest.value.trim(), query: query.value.trim() },
          (m, e) => setStatus(m, e)
        );
      } catch (e) { setStatus(e.message || String(e), true); }
    });
    body.appendChild(btn);
    bodySlot.appendChild(sec);
  }
}
