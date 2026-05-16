'use strict';

import { DEFAULT_APP_ID } from '../constants.js';
import { setStatus } from '../ui/components.js';
import {
  runGenerateERDiagramStandalone,
  runExportERDiagramHtmlStandalone
} from '../tabs/er-standalone.js';
import { mountKusLitePanel } from './liteMount.js';
import { row, mkInput, liteRun } from './litePanelHelpers.js';

function mkSelect(opts: Array<[string, string]>): HTMLSelectElement {
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

  const appInp = mkInput('アプリID', { value: DEFAULT_APP_ID || '' });
  const extraInp = mkInput('追加起点ID (カンマ区切り)', { width: 'wide' });
  const spaceInp = mkInput('スペースID（任意）');
  const guestInp = mkInput('ゲストID（任意）');

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

  const optRow = document.createElement('div');
  optRow.style.cssText = 'display:flex;flex-wrap:wrap;gap:14px;margin-bottom:12px';
  optRow.appendChild(subtableLabel);
  optRow.appendChild(reverseLabel);

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
      extraAppIds: extraInp.value.split(/[\s,，]+/).map(v => v.trim()).filter(Boolean),
      spaceId: spaceInp.value.trim()
    };
  }

  const btnRow = document.createElement('div');
  btnRow.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;margin-top:10px';

  function mkBtn(text) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = text;
    b.style.cssText =
      'padding:9px 12px;font-size:13px;font-weight:700;border:none;border-radius:8px;background:#2563eb;color:#fff;cursor:pointer';
    return b;
  }

  const bOpen = mkBtn('ER図を開く');
  bOpen.addEventListener('click', () => liteRun(async () => {
    await runGenerateERDiagramStandalone(source(), (m, e) => setStatus(m, e));
  }));

  const bSave = mkBtn('HTML保存');
  bSave.style.background = '#475569';
  bSave.addEventListener('click', () => liteRun(async () => {
    await runExportERDiagramHtmlStandalone(source(), (m, e) => setStatus(m, e));
  }));

  btnRow.appendChild(bOpen);
  btnRow.appendChild(bSave);

  const route = document.createElement('div');
  route.style.cssText = 'border:1px solid #a7f3d0;border-radius:8px;background:#fff;padding:12px;margin-bottom:8px';
  const badge = document.createElement('div');
  badge.textContent = '標準生成';
  badge.style.cssText = 'display:inline-flex;padding:2px 8px;border:1px solid #99f6e4;border-radius:999px;background:#ecfdf5;color:#0f766e;font-size:10px;font-weight:800';
  const title = document.createElement('div');
  title.textContent = '現在のアプリからER図を開く';
  title.style.cssText = 'font-size:14px;font-weight:800;color:#0f172a;margin-top:6px';
  const primaryRow = row('アプリID', appInp);
  primaryRow.style.marginTop = '10px';
  route.appendChild(badge);
  route.appendChild(title);
  route.appendChild(primaryRow);
  route.appendChild(btnRow);
  bodySlot.appendChild(route);

  const details = document.createElement('details');
  details.style.cssText = 'border:1px solid #e2e8f0;border-radius:8px;background:#fff;margin-top:8px';
  const summary = document.createElement('summary');
  summary.textContent = '詳細オプション';
  summary.style.cssText = 'cursor:pointer;padding:9px 10px;font-size:12px;font-weight:800;color:#334155';
  const detailBody = document.createElement('div');
  detailBody.style.cssText = 'padding:0 10px 10px';
  detailBody.appendChild(row('追加起点', extraInp));
  detailBody.appendChild(row('スペースID', spaceInp));
  detailBody.appendChild(row('ゲスト', guestInp));
  detailBody.appendChild(row('レイアウト', layoutSel));
  detailBody.appendChild(row('表示密度', densitySel));
  detailBody.appendChild(row('探索深さ', depthInp));
  detailBody.appendChild(optRow);
  details.appendChild(summary);
  details.appendChild(detailBody);
  bodySlot.appendChild(details);
}
