'use strict';

import { DEFAULT_APP_ID } from '../constants.js';
import { setStatus } from '../ui/components.js';
import {
  runGenerateERDiagramStandalone,
  runExportERDiagramHtmlStandalone
} from '../tabs/er-standalone.js';
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

function mkSelect(opts) {
  const sel = document.createElement('select');
  sel.style.cssText =
    'padding:6px 10px;border:1px solid #e2e8f0;border-radius:8px;font-size:12px;background:#fff';
  for (const [val, label] of opts) {
    const o = document.createElement('option');
    o.value = val;
    o.textContent = label;
    sel.appendChild(o);
  }
  return sel;
}

export function mountErLitePanel() {
  const { bodySlot } = mountKusLitePanel({
    id: 'kus-er-lite',
    title: 'ER図',
    note: '起点アプリからルックアップ/関連レコードを辿り、ER図を生成します。統合ツール.js は不要です。'
  });

  const appInp = document.createElement('input');
  appInp.type = 'text';
  appInp.placeholder = 'アプリID';
  appInp.value = DEFAULT_APP_ID || '';
  appInp.style.cssText =
    'width:min(120px,40vw);padding:6px 10px;border:1px solid #e2e8f0;border-radius:8px;font-size:12px';

  const extraInp = document.createElement('input');
  extraInp.type = 'text';
  extraInp.placeholder = '追加起点ID (カンマ区切り)';
  extraInp.style.cssText =
    'width:min(200px,60vw);padding:6px 10px;border:1px solid #e2e8f0;border-radius:8px;font-size:12px';

  const guestInp = document.createElement('input');
  guestInp.type = 'text';
  guestInp.placeholder = 'ゲストID（任意）';
  guestInp.style.cssText =
    'width:min(120px,40vw);padding:6px 10px;border:1px solid #e2e8f0;border-radius:8px;font-size:12px';

  const layoutSel = mkSelect([
    ['dagre', 'Dagre (推奨)'],
    ['breadthfirst', 'ツリー'],
    ['cose', 'フォース'],
    ['concentric', '同心円'],
    ['grid', 'グリッド'],
    ['circle', '円形']
  ]);

  const densitySel = mkSelect([
    ['standard', '標準'],
    ['compact', 'コンパクト'],
    ['full', '詳細']
  ]);

  const depthInp = document.createElement('input');
  depthInp.type = 'number';
  depthInp.min = '0';
  depthInp.value = '0';
  depthInp.placeholder = '0=無制限';
  depthInp.style.cssText =
    'width:min(80px,30vw);padding:6px 10px;border:1px solid #e2e8f0;border-radius:8px;font-size:12px';

  const subtableCb = document.createElement('input');
  subtableCb.type = 'checkbox';
  subtableCb.checked = true;
  const subtableLabel = document.createElement('label');
  subtableLabel.style.cssText = 'font-size:12px;color:#475569;display:inline-flex;align-items:center;gap:6px;cursor:pointer';
  subtableLabel.appendChild(subtableCb);
  subtableLabel.appendChild(document.createTextNode('サブテーブル展開'));

  const reverseCb = document.createElement('input');
  reverseCb.type = 'checkbox';
  const reverseLabel = document.createElement('label');
  reverseLabel.style.cssText = 'font-size:12px;color:#475569;display:inline-flex;align-items:center;gap:6px;cursor:pointer';
  reverseLabel.appendChild(reverseCb);
  reverseLabel.appendChild(document.createTextNode('逆引き探索'));

  bodySlot.appendChild(row('アプリID', appInp));
  bodySlot.appendChild(row('追加起点', extraInp));
  bodySlot.appendChild(row('ゲスト', guestInp));
  bodySlot.appendChild(row('レイアウト', layoutSel));
  bodySlot.appendChild(row('表示密度', densitySel));
  bodySlot.appendChild(row('探索深さ', depthInp));

  const optRow = document.createElement('div');
  optRow.style.cssText = 'display:flex;flex-wrap:wrap;gap:14px;margin-bottom:12px';
  optRow.appendChild(subtableLabel);
  optRow.appendChild(reverseLabel);
  bodySlot.appendChild(optRow);

  function source() {
    return {
      appId: appInp.value.trim(),
      guestId: guestInp.value.trim(),
      preview: false,
      layoutName: layoutSel.value,
      fieldDensity: densitySel.value,
      maxDepth: Number(depthInp.value) || 0,
      includeSubtableFields: subtableCb.checked,
      includeReverseLookup: reverseCb.checked,
      extraAppIds: extraInp.value.split(/[\s,，]+/).map(v => v.trim()).filter(Boolean)
    };
  }

  const btnRow = document.createElement('div');
  btnRow.style.cssText = 'display:flex;flex-direction:column;gap:8px;margin-top:4px';

  function mkBtn(text) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = text;
    b.style.cssText =
      'padding:10px 14px;font-size:13px;font-weight:700;border:none;border-radius:10px;background:linear-gradient(180deg,#7c3aed,#6d28d9);color:#fff;cursor:pointer';
    return b;
  }

  const bOpen = mkBtn('ER図を別タブで開く');
  bOpen.addEventListener('click', async () => {
    try {
      await runGenerateERDiagramStandalone(source(), (m, e) => setStatus(m, e));
    } catch (e) {
      setStatus(e.message || String(e), true);
    }
  });

  const bSave = mkBtn('ER図 HTML を保存');
  bSave.style.background = 'linear-gradient(180deg,#3b82f6,#2563eb)';
  bSave.addEventListener('click', async () => {
    try {
      await runExportERDiagramHtmlStandalone(source(), (m, e) => setStatus(m, e));
    } catch (e) {
      setStatus(e.message || String(e), true);
    }
  });

  btnRow.appendChild(bOpen);
  btnRow.appendChild(bSave);
  bodySlot.appendChild(btnRow);
}
