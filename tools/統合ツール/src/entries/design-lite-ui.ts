'use strict';

import { DEFAULT_APP_ID } from '../constants.js';
import { setStatus } from '../ui/components.js';
import {
  runDesignCopyMdStandalone,
  runDesignExportStandalone,
  runDesignExportXlsxStandalone
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
}
