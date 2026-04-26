'use strict';

import { DEFAULT_APP_ID } from '../constants.js';
import { launchKintoneSql } from '../tabs/sql.js';
import { mountKusLitePanel } from './liteMount.js';

if (!window.kintone?.api || !window.kintone?.app) {
  alert('kintone画面で実行してください');
} else {
  const { bodySlot } = mountKusLitePanel({
    id: 'kus-sql-lite',
    title: 'SQL実行',
    note: 'アプリID を指定して SQL エディタを開きます。統合ツール.js は不要です。'
  });

  const appInp = document.createElement('input');
  appInp.type = 'text';
  appInp.placeholder = 'アプリID';
  appInp.value = DEFAULT_APP_ID || '';
  appInp.style.cssText =
    'width:min(140px,44vw);padding:8px 10px;border:1px solid #e2e8f0;border-radius:8px;font-size:13px';

  const openBtn = document.createElement('button');
  openBtn.type = 'button';
  openBtn.textContent = 'SQLエディタを開く';
  openBtn.style.cssText =
    'padding:10px 16px;font-size:13px;font-weight:700;border:none;border-radius:10px;background:linear-gradient(180deg,#7c3aed,#6d28d9);color:#fff;cursor:pointer';

  const row = document.createElement('div');
  row.style.cssText = 'display:flex;flex-wrap:wrap;gap:10px;align-items:center';
  row.appendChild(appInp);
  row.appendChild(openBtn);
  bodySlot.appendChild(row);

  openBtn.addEventListener('click', () => {
    launchKintoneSql({ document, appId: appInp.value.trim() });
  });
}
