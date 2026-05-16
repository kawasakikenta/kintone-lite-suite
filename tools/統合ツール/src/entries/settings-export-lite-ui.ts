'use strict';

import { SETTINGS_EXPORT_SCOPE_DEFS } from '../constants.js';
import { setStatus } from '../ui/components.js';
import {
  runSettingsExportSearchStandalone,
  runSettingsExportStandalone,
  runSettingsExportAddSpaceStandalone,
  renderSettingsExportSearchResultsHtml
} from '../tabs/settings-export-standalone.js';
import { mountKusLitePanel } from './liteMount.js';
import { mkInput, mkOption, liteRun } from './litePanelHelpers.js';

// 設定一括取得タブ専用の縦積みラベル row（litePanelHelpers の row は横並び）。
function row(labelText: string, child: HTMLElement): HTMLElement {
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

  const searchKw = mkInput('アプリ名の一部');
  searchKw.style.cssText = 'flex:1;min-width:120px;padding:6px 10px;border:1px solid #e2e8f0;border-radius:8px;font-size:12px';

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

  const spaceKw = mkInput('スペースID');
  spaceKw.style.cssText = 'flex:1;min-width:120px;padding:6px 10px;border:1px solid #e2e8f0;border-radius:8px;font-size:12px';
  const spaceRow = document.createElement('div');
  spaceRow.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;align-items:center';
  const spaceBtn = document.createElement('button');
  spaceBtn.type = 'button';
  spaceBtn.textContent = 'スペース内全アプリを追加';
  spaceBtn.style.cssText =
    'padding:6px 12px;font-size:12px;font-weight:600;border:1px solid #cbd5e1;border-radius:8px;background:#f8fafc;cursor:pointer';
  spaceRow.appendChild(spaceKw);
  spaceRow.appendChild(spaceBtn);

  const guestInp = mkInput('ゲストID（任意）');
  guestInp.style.cssText = 'width:min(140px,44vw);padding:6px 10px;border:1px solid #e2e8f0;border-radius:8px;font-size:12px';
  const prev = mkOption('プレビュー');
  const prevCb = prev.checkbox;

  const scopeRoot = document.createElement('div');
  scopeRoot.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px 10px;padding:8px 0';
  for (const s of SETTINGS_EXPORT_SCOPE_DEFS) {
    const lab = document.createElement('label');
    lab.style.cssText = 'font-size:11px;color:#334155;display:inline-flex;align-items:center;gap:4px;cursor:pointer';
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.value = s.key;
    cb.checked = true;
    lab.appendChild(cb);
    lab.appendChild(document.createTextNode(s.label));
    scopeRoot.appendChild(lab);
  }

  const scopeActions = document.createElement('div');
  scopeActions.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;margin:4px 0 8px';
  const selectAllBtn = document.createElement('button');
  selectAllBtn.type = 'button';
  selectAllBtn.textContent = '全選択';
  selectAllBtn.style.cssText =
    'padding:6px 12px;font-size:12px;font-weight:600;border:1px solid #cbd5e1;border-radius:8px;background:#f8fafc;cursor:pointer';
  const clearAllBtn = document.createElement('button');
  clearAllBtn.type = 'button';
  clearAllBtn.textContent = '全解除';
  clearAllBtn.style.cssText =
    'padding:6px 12px;font-size:12px;font-weight:600;border:1px solid #cbd5e1;border-radius:8px;background:#fff;cursor:pointer';
  scopeActions.appendChild(selectAllBtn);
  scopeActions.appendChild(clearAllBtn);

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
  bodySlot.appendChild(row('スペース指定', spaceRow));
  bodySlot.appendChild(row('ゲスト / 環境', (() => {
    const w = document.createElement('div');
    w.style.cssText = 'display:flex;flex-wrap:wrap;gap:10px;align-items:center';
    w.appendChild(guestInp);
    w.appendChild(prev.label);
    return w;
  })()));
  bodySlot.appendChild(row('取得セクション', (() => {
    const w = document.createElement('div');
    w.appendChild(scopeActions);
    w.appendChild(scopeRoot);
    return w;
  })()));
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

  searchBtn.addEventListener('click', () => liteRun(async () => {
    const apps = await runSettingsExportSearchStandalone(
      searchKw.value,
      guestInp.value.trim(),
      (m, e) => setStatus(m, e)
    );
    searchOut.innerHTML = renderSettingsExportSearchResultsHtml(apps);
  }));

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

  spaceBtn.addEventListener('click', () => liteRun(async () => {
    appTa.value = await runSettingsExportAddSpaceStandalone(
      spaceKw.value.trim(),
      guestInp.value.trim(),
      appTa.value,
      (m, e) => setStatus(m, e)
    );
  }));

  selectAllBtn.addEventListener('click', () => {
    scopeRoot.querySelectorAll<HTMLInputElement>('input[type="checkbox"]').forEach((cb) => { cb.checked = true; });
  });

  clearAllBtn.addEventListener('click', () => {
    scopeRoot.querySelectorAll<HTMLInputElement>('input[type="checkbox"]').forEach((cb) => { cb.checked = false; });
  });

  btnJson.addEventListener('click', () => liteRun(async () => {
    result.style.display = 'block';
    const { summaryHtml } = await runSettingsExportStandalone('json', opts(), (m, e) => setStatus(m, e));
    result.innerHTML = summaryHtml;
  }));

  btnZip.addEventListener('click', () => liteRun(async () => {
    result.style.display = 'block';
    const { summaryHtml } = await runSettingsExportStandalone('zip', opts(), (m, e) => setStatus(m, e));
    result.innerHTML = summaryHtml;
  }));
}
