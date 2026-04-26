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
import { row, mkInput, mkBtn, mkSection, liteRun } from './litePanelHelpers.js';

export function mountRecordLitePanel() {
  const { bodySlot } = mountKusLitePanel({
    id: 'kus-record-lite',
    title: 'レコード管理',
    note: 'CSVエクスポート/インポート、バッチ処理、レコードコピーを実行します。統合ツール.js は不要です。'
  });

  const tgtApp = mkInput('アプリID', { value: DEFAULT_APP_ID || '' });
  const tgtGuest = mkInput('ゲストID（任意）');
  bodySlot.appendChild(row('アプリID', tgtApp));
  bodySlot.appendChild(row('ゲスト', tgtGuest));

  // --- CSV Export ---
  {
    const { sec, body } = mkSection('CSV エクスポート');
    const query = mkInput('絞り込み条件 (任意)', { width: 'wide' });
    const fname = mkInput('ファイル名', { value: 'records.csv' });
    body.appendChild(row('条件', query));
    body.appendChild(row('ファイル名', fname));
    const btn = mkBtn('CSV出力');
    btn.addEventListener('click', () => liteRun(async () => {
      await runCsvExportStandalone(
        { appId: tgtApp.value.trim(), guestId: tgtGuest.value.trim(), query: query.value.trim(), filename: fname.value.trim() },
        (m, e) => setStatus(m, e)
      );
    }));
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
    const btn = mkBtn('インポート実行', { bg: 'linear-gradient(180deg,#16a34a,#15803d)' });
    btn.addEventListener('click', () => liteRun(async () => {
      await runCsvImportStandalone(
        { appId: tgtApp.value.trim(), guestId: tgtGuest.value.trim(), file: fileInput.files?.[0] },
        (m, e) => setStatus(m, e)
      );
    }));
    body.appendChild(btn);
    bodySlot.appendChild(sec);
  }

  // --- Batch Process ---
  {
    const { sec, body } = mkSection('ステータス一括更新');
    const query = mkInput('絞り込み条件 (任意)', { width: 'wide' });
    const action = mkInput('アクション名');
    const assignee = mkInput('作業者 (任意)');
    body.appendChild(row('条件', query));
    body.appendChild(row('アクション', action));
    body.appendChild(row('作業者', assignee));
    const btn = mkBtn('一括更新', { bg: 'linear-gradient(180deg,#f97316,#ea580c)' });
    btn.addEventListener('click', () => liteRun(async () => {
      await runBatchProcessStandalone(
        { appId: tgtApp.value.trim(), guestId: tgtGuest.value.trim(), query: query.value.trim(), action: action.value.trim(), assignee: assignee.value.trim() || null },
        (m, e) => setStatus(m, e)
      );
    }));
    body.appendChild(btn);
    bodySlot.appendChild(sec);
  }

  // --- Record Copy ---
  {
    const { sec, body } = mkSection('レコードコピー');
    const srcApp = mkInput('比較元アプリID');
    const srcGuest = mkInput('ゲストID（任意）');
    const query = mkInput('絞り込み条件 (任意)', { width: 'wide' });
    body.appendChild(row('比較元ID', srcApp));
    body.appendChild(row('元ゲスト', srcGuest));
    body.appendChild(row('条件', query));
    const btn = mkBtn('コピー実行', { bg: 'linear-gradient(180deg,#7c3aed,#6d28d9)' });
    btn.addEventListener('click', () => liteRun(async () => {
      await runRecordCopyStandalone(
        { sourceAppId: srcApp.value.trim(), sourceGuestId: srcGuest.value.trim(), targetAppId: tgtApp.value.trim(), targetGuestId: tgtGuest.value.trim(), query: query.value.trim() },
        (m, e) => setStatus(m, e)
      );
    }));
    body.appendChild(btn);
    bodySlot.appendChild(sec);
  }
}
