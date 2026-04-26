'use strict';

import { DEFAULT_APP_ID } from '../constants.js';
import { setStatus } from '../ui/components.js';
import {
  runDesignCopyMdStandalone,
  runDesignExportStandalone,
  runDesignExportXlsxStandalone
} from '../tabs/design-standalone.js';
import { mountKusLitePanel } from './liteMount.js';

function row(labelHtml, child) {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-bottom:10px';
  const lab = document.createElement('span');
  lab.style.cssText = 'font-size:12px;font-weight:600;color:#334155;min-width:5em';
  lab.innerHTML = labelHtml;
  wrap.appendChild(lab);
  wrap.appendChild(child);
  return wrap;
}

export function mountDesignLitePanel() {
  const { bodySlot } = mountKusLitePanel({
    id: 'kus-design-lite',
    title: '設計書',
    note: 'アプリ設定を取得し、Markdown または JSON で保存します。統合ツール.js は不要です。'
  });

  const appInp = document.createElement('input');
  appInp.type = 'text';
  appInp.placeholder = 'アプリID';
  appInp.value = DEFAULT_APP_ID || '';
  appInp.style.cssText =
    'width:min(120px,40vw);padding:6px 10px;border:1px solid #e2e8f0;border-radius:8px;font-size:12px';

  const guestInp = document.createElement('input');
  guestInp.type = 'text';
  guestInp.placeholder = 'ゲストID（任意）';
  guestInp.style.cssText =
    'width:min(120px,40vw);padding:6px 10px;border:1px solid #e2e8f0;border-radius:8px;font-size:12px';

  const prev = document.createElement('label');
  prev.style.cssText = 'font-size:12px;color:#475569;display:inline-flex;align-items:center;gap:6px;cursor:pointer';
  const prevCb = document.createElement('input');
  prevCb.type = 'checkbox';
  prev.appendChild(prevCb);
  prev.appendChild(document.createTextNode('プレビュー環境'));

  bodySlot.appendChild(row('アプリID', appInp));
  bodySlot.appendChild(row('ゲスト', guestInp));
  bodySlot.appendChild(row('', prev));

  const btnRow = document.createElement('div');
  btnRow.style.cssText = 'display:flex;flex-direction:column;gap:8px;margin-top:12px';

  function source() {
    return {
      appId: appInp.value.trim(),
      guestId: guestInp.value.trim(),
      preview: prevCb.checked
    };
  }

  function mkBtn(text) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = text;
    b.style.cssText =
      'padding:10px 14px;font-size:13px;font-weight:700;border:none;border-radius:10px;background:linear-gradient(180deg,#3b82f6,#2563eb);color:#fff;cursor:pointer';
    return b;
  }

  const bMd = mkBtn('Markdown を保存');
  bMd.addEventListener('click', async () => {
    try {
      await runDesignExportStandalone('md', source(), (m, e) => setStatus(m, e));
    } catch (e) {
      setStatus(e.message || String(e), true);
    }
  });

  const bJson = mkBtn('JSON を保存');
  bJson.style.background = 'linear-gradient(180deg,#64748b,#475569)';
  bJson.addEventListener('click', async () => {
    try {
      await runDesignExportStandalone('json', source(), (m, e) => setStatus(m, e));
    } catch (e) {
      setStatus(e.message || String(e), true);
    }
  });

  const bCopy = mkBtn('Markdown をクリップボードへ');
  bCopy.style.background = 'linear-gradient(180deg,#0ea5e9,#0284c7)';
  bCopy.addEventListener('click', async () => {
    try {
      await runDesignCopyMdStandalone(source(), (m, e) => setStatus(m, e));
    } catch (e) {
      setStatus(e.message || String(e), true);
    }
  });

  const bXlsx = mkBtn('Excel (.xlsx) を保存');
  bXlsx.style.background = 'linear-gradient(180deg,#16a34a,#15803d)';
  bXlsx.addEventListener('click', async () => {
    try {
      await runDesignExportXlsxStandalone(source(), (m, e) => setStatus(m, e));
    } catch (e) {
      setStatus(e.message || String(e), true);
    }
  });

  btnRow.appendChild(bMd);
  btnRow.appendChild(bJson);
  btnRow.appendChild(bCopy);
  btnRow.appendChild(bXlsx);
  bodySlot.appendChild(btnRow);
}
