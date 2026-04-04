'use strict';

import { SETTINGS_EXPORT_SCOPE_DEFS } from '../constants.js';
import { setStatus } from '../ui/components.js';
import {
  runSettingsExportSearchStandalone,
  runSettingsExportStandalone,
  renderSettingsExportSearchResultsHtml
} from '../tabs/settings-export-standalone.js';
import { mountKusLitePanel } from './liteMount.js';

function row(labelText, child) {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'margin-bottom:10px';
  if (labelText) {
    const lab = document.createElement('div');
    lab.style.cssText = 'font-size:11px;font-weight:700;color:#475569;margin-bottom:4px';
    lab.textContent = labelText;
    wrap.appendChild(lab);
  }
  wrap.appendChild(child);
  return wrap;
}

export function mountSettingsExportLitePanel() {
  const { bodySlot, result } = mountKusLitePanel({
    id: 'kus-settings-export-lite',
    title: '設定一括取得',
    note: '複数アプリの設定を JSON または ZIP で保存します。統合ツール.js は不要です。'
  });

  const appTa = document.createElement('textarea');
  appTa.rows = 3;
  appTa.placeholder = 'アプリID（カンマ・改行区切り）';
  appTa.style.cssText =
    'width:100%;box-sizing:border-box;padding:8px 10px;border:1px solid #e2e8f0;border-radius:8px;font-size:12px;resize:vertical';

  const searchKw = document.createElement('input');
  searchKw.type = 'text';
  searchKw.placeholder = 'アプリ名の一部';
  searchKw.style.cssText =
    'flex:1;min-width:120px;padding:6px 10px;border:1px solid #e2e8f0;border-radius:8px;font-size:12px';

  const searchRow = document.createElement('div');
  searchRow.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;align-items:center';
  const searchBtn = document.createElement('button');
  searchBtn.type = 'button';
  searchBtn.textContent = '検索';
  searchBtn.style.cssText =
    'padding:6px 12px;font-size:12px;font-weight:600;border:1px solid #cbd5e1;border-radius:8px;background:#f8fafc;cursor:pointer';
  searchRow.appendChild(searchKw);
  searchRow.appendChild(searchBtn);

  const searchOut = document.createElement('div');
  searchOut.style.cssText =
    'max-height:140px;overflow:auto;border:1px solid #e2e8f0;border-radius:8px;margin-top:6px;background:#fff';

  const guestInp = document.createElement('input');
  guestInp.type = 'text';
  guestInp.placeholder = 'ゲストID（任意）';
  guestInp.style.cssText =
    'width:min(140px,44vw);padding:6px 10px;border:1px solid #e2e8f0;border-radius:8px;font-size:12px';

  const prev = document.createElement('label');
  prev.style.cssText = 'font-size:12px;color:#475569;display:inline-flex;align-items:center;gap:6px;cursor:pointer';
  const prevCb = document.createElement('input');
  prevCb.type = 'checkbox';
  prev.appendChild(prevCb);
  prev.appendChild(document.createTextNode('プレビュー'));

  const scopeRoot = document.createElement('div');
  scopeRoot.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px 10px;padding:8px 0';
  for (const s of SETTINGS_EXPORT_SCOPE_DEFS) {
    const lab = document.createElement('label');
    lab.style.cssText = 'font-size:11px;color:#334155;display:inline-flex;align-items:center;gap:4px;cursor:pointer';
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.value = s.key;
    cb.checked = ['fieldSettings', 'layoutSettings', 'viewSettings', 'processSettings'].includes(s.key);
    lab.appendChild(cb);
    lab.appendChild(document.createTextNode(s.label));
    scopeRoot.appendChild(lab);
  }

  const btnJson = document.createElement('button');
  btnJson.type = 'button';
  btnJson.textContent = 'JSON で保存';
  btnJson.style.cssText =
    'width:100%;margin-top:8px;padding:10px 14px;font-size:13px;font-weight:700;border:none;border-radius:10px;background:linear-gradient(180deg,#3b82f6,#2563eb);color:#fff;cursor:pointer';

  const btnZip = document.createElement('button');
  btnZip.type = 'button';
  btnZip.textContent = 'ZIP で保存';
  btnZip.style.cssText =
    'width:100%;margin-top:8px;padding:10px 14px;font-size:13px;font-weight:700;border:none;border-radius:10px;background:linear-gradient(180deg,#64748b,#475569);color:#fff;cursor:pointer';

  bodySlot.appendChild(row('対象アプリID', appTa));
  bodySlot.appendChild(row('アプリ検索', searchRow));
  bodySlot.appendChild(searchOut);
  bodySlot.appendChild(row('ゲスト / 環境', (() => {
    const w = document.createElement('div');
    w.style.cssText = 'display:flex;flex-wrap:wrap;gap:10px;align-items:center';
    w.appendChild(guestInp);
    w.appendChild(prev);
    return w;
  })()));
  bodySlot.appendChild(row('取得セクション', scopeRoot));
  bodySlot.appendChild(btnJson);
  bodySlot.appendChild(btnZip);

  function opts() {
    return {
      appIdsText: appTa.value,
      guestId: guestInp.value.trim(),
      preview: prevCb.checked,
      scopeRoot
    };
  }

  searchBtn.addEventListener('click', async () => {
    try {
      const apps = await runSettingsExportSearchStandalone(
        searchKw.value,
        guestInp.value.trim(),
        (m, e) => setStatus(m, e)
      );
      searchOut.innerHTML = renderSettingsExportSearchResultsHtml(apps);
    } catch (e) {
      setStatus(e.message || String(e), true);
    }
  });

  searchOut.addEventListener('click', (ev) => {
    const t = ev.target;
    if (!(t instanceof HTMLElement)) return;
    const btn = t.closest('.kus-se-add');
    if (!btn) return;
    const id = btn.getAttribute('data-app');
    if (!id) return;
    const cur = appTa.value.trim();
    const next = cur ? `${cur}\n${id}` : id;
    appTa.value = next;
  });

  btnJson.addEventListener('click', async () => {
    try {
      result.style.display = 'block';
      const { summaryHtml } = await runSettingsExportStandalone('json', opts(), (m, e) => setStatus(m, e));
      result.innerHTML = summaryHtml;
    } catch (e) {
      setStatus(e.message || String(e), true);
    }
  });

  btnZip.addEventListener('click', async () => {
    try {
      result.style.display = 'block';
      const { summaryHtml } = await runSettingsExportStandalone('zip', opts(), (m, e) => setStatus(m, e));
      result.innerHTML = summaryHtml;
    } catch (e) {
      setStatus(e.message || String(e), true);
    }
  });
}
