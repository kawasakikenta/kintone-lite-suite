'use strict';

import { DEFAULT_APP_ID } from '../constants.js';
import { setStatus } from '../ui/components.js';
import {
  runDesignCopyMdStandalone,
  runDesignExportStandalone,
  runDesignExportXlsxStandalone,
  runBatchDesignExportXlsxZipStandalone
} from '../tabs/design-standalone.js';
import { mountKusLitePanel } from './liteMount.js';
import { row, mkInput, mkBtn, mkOption, liteRun } from './litePanelHelpers.js';

export function mountDesignLitePanel() {
  const { bodySlot } = mountKusLitePanel({
    id: 'kus-design-lite',
    title: '設計書',
    note: 'アプリ設定を取得し、Markdown または JSON で保存します。統合ツール.js は不要です。'
  });

  const appInp = mkInput('アプリID', { value: DEFAULT_APP_ID || '' });
  const guestInp = mkInput('ゲストID（任意）');
  const prev = mkOption('プレビュー環境');

  bodySlot.appendChild(row('アプリID', appInp));
  bodySlot.appendChild(row('ゲスト', guestInp));
  bodySlot.appendChild(row('', prev.label));

  const btnRow = document.createElement('div');
  btnRow.style.cssText = 'display:flex;flex-direction:column;gap:8px;margin-top:12px';

  function source() {
    return {
      appId: appInp.value.trim(),
      guestId: guestInp.value.trim(),
      preview: prev.checkbox.checked
    };
  }

  const bigBtn = (text: string, bg?: string) => {
    const b = mkBtn(text, { bg, marginTop: '0' });
    b.style.cssText += ';padding:10px 14px;font-size:13px';
    return b;
  };

  const bMd = bigBtn('Markdown を保存');
  bMd.addEventListener('click', () => liteRun(async () => {
    await runDesignExportStandalone('md', source(), (m, e) => setStatus(m, e));
  }));

  const bJson = bigBtn('JSON を保存', 'linear-gradient(180deg,#64748b,#475569)');
  bJson.addEventListener('click', () => liteRun(async () => {
    await runDesignExportStandalone('json', source(), (m, e) => setStatus(m, e));
  }));

  const bCopy = bigBtn('Markdown をクリップボードへ', 'linear-gradient(180deg,#0ea5e9,#0284c7)');
  bCopy.addEventListener('click', () => liteRun(async () => {
    await runDesignCopyMdStandalone(source(), (m, e) => setStatus(m, e));
  }));

  const bXlsx = bigBtn('Excel (.xlsx) を保存', 'linear-gradient(180deg,#16a34a,#15803d)');
  bXlsx.addEventListener('click', () => liteRun(async () => {
    await runDesignExportXlsxStandalone(source(), (m, e) => setStatus(m, e));
  }));

  btnRow.appendChild(bMd);
  btnRow.appendChild(bJson);
  btnRow.appendChild(bCopy);
  btnRow.appendChild(bXlsx);
  bodySlot.appendChild(btnRow);

  // ----- 複数アプリ一括Excel出力 (ZIP) -----
  const batchWrap = document.createElement('div');
  batchWrap.style.cssText = 'margin-top:14px;padding:10px;border:1px dashed #94a3b8;border-radius:10px;background:#f8fafc';
  const batchTitle = document.createElement('div');
  batchTitle.textContent = '複数アプリの一括出力 (ZIP)';
  batchTitle.style.cssText = 'font-size:12px;font-weight:700;color:#0f172a;margin-bottom:6px';
  const batchNote = document.createElement('div');
  batchNote.style.cssText = 'font-size:11px;color:#475569;line-height:1.5;margin-bottom:8px';
  batchNote.textContent = '対象アプリIDを改行/カンマ/スペース区切りで指定すると、各アプリの設計書Excelをまとめて1つのZIPに保存します。シート選択は最初に1回だけ表示し、全アプリに適用されます。';
  const batchIds = document.createElement('textarea');
  batchIds.placeholder = '例: 74, 120, 305';
  batchIds.style.cssText = 'width:100%;box-sizing:border-box;min-height:64px;padding:6px 10px;border:1px solid #e2e8f0;border-radius:8px;font-size:12px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace';
  const bBatchZip = bigBtn('複数アプリの設計書ZIPを保存', 'linear-gradient(180deg,#0f766e,#0d544f)');
  bBatchZip.addEventListener('click', () => liteRun(async () => {
    await runBatchDesignExportXlsxZipStandalone(
      { appIdsText: batchIds.value, guestId: guestInp.value.trim() },
      (m, e) => setStatus(m, e)
    );
  }));
  batchWrap.appendChild(batchTitle);
  batchWrap.appendChild(batchNote);
  batchWrap.appendChild(batchIds);
  batchWrap.appendChild(bBatchZip);
  bodySlot.appendChild(batchWrap);
}
