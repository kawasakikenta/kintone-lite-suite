'use strict';

import { DEFAULT_APP_ID } from '../constants.js';
import { setStatus } from '../ui/components.js';
import {
  runApplyJsConfigStandalone,
  runExportJsConfigStandalone,
  runFetchJsConfigStandalone
} from '../tabs/jsconfig-standalone.js';
import { mountKusLitePanel } from './liteMount.js';

export function mountJsconfigLitePanel() {
  const { bodySlot, result } = mountKusLitePanel({
    id: 'kus-jsconfig-lite',
    title: 'JS/CSS設定',
    note: 'カスタマイズの取得・JSON保存・比較先プレビューへの反映。統合ツール.js は不要です。'
  });

  const srcApp = document.createElement('input');
  srcApp.type = 'text';
  srcApp.placeholder = '取得元アプリID';
  srcApp.value = DEFAULT_APP_ID || '';
  srcApp.style.cssText =
    'width:min(120px,40vw);padding:6px 10px;border:1px solid #e2e8f0;border-radius:8px;font-size:12px';

  const srcGuest = document.createElement('input');
  srcGuest.type = 'text';
  srcGuest.placeholder = 'ゲスト（任意）';
  srcGuest.style.cssText =
    'width:min(100px,36vw);padding:6px 10px;border:1px solid #e2e8f0;border-radius:8px;font-size:12px';

  const srcPrev = document.createElement('label');
  srcPrev.style.cssText = 'font-size:11px;display:inline-flex;align-items:center;gap:4px;cursor:pointer';
  const srcPrevCb = document.createElement('input');
  srcPrevCb.type = 'checkbox';
  srcPrev.appendChild(srcPrevCb);
  srcPrev.appendChild(document.createTextNode('プレビューで取得'));

  const row1 = document.createElement('div');
  row1.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:10px';
  row1.appendChild(srcApp);
  row1.appendChild(srcGuest);
  row1.appendChild(srcPrev);

  const fetchBtn = document.createElement('button');
  fetchBtn.type = 'button';
  fetchBtn.textContent = 'JS/CSS を取得';
  fetchBtn.style.cssText =
    'padding:8px 14px;font-size:12px;font-weight:700;border:none;border-radius:8px;background:#2563eb;color:#fff;cursor:pointer;margin-bottom:10px';

  const jsonTa = document.createElement('textarea');
  jsonTa.rows = 8;
  jsonTa.placeholder = '取得結果の JSON（手入力も可）';
  jsonTa.style.cssText =
    'width:100%;box-sizing:border-box;font-family:ui-monospace,monospace;font-size:11px;padding:8px;border:1px solid #e2e8f0;border-radius:8px;resize:vertical';

  const previewBox = document.createElement('div');
  previewBox.style.cssText =
    'max-height:120px;overflow:auto;margin-top:8px;font-size:11px;border:1px solid #e2e8f0;border-radius:8px;background:#fafafa';

  const exportBtn = document.createElement('button');
  exportBtn.type = 'button';
  exportBtn.textContent = 'JSON をファイル保存';
  exportBtn.style.cssText =
    'margin-top:8px;padding:8px 12px;font-size:12px;font-weight:600;border:1px solid #cbd5e1;border-radius:8px;background:#f8fafc;cursor:pointer';

  const tgtApp = document.createElement('input');
  tgtApp.type = 'text';
  tgtApp.placeholder = '反映先アプリID（プレビュー）';
  tgtApp.style.cssText =
    'width:min(140px,44vw);padding:6px 10px;border:1px solid #e2e8f0;border-radius:8px;font-size:12px';

  const tgtGuest = document.createElement('input');
  tgtGuest.type = 'text';
  tgtGuest.placeholder = 'ゲスト（任意）';
  tgtGuest.style.cssText =
    'width:min(100px,36vw);padding:6px 10px;border:1px solid #e2e8f0;border-radius:8px;font-size:12px';

  const applyBtn = document.createElement('button');
  applyBtn.type = 'button';
  applyBtn.textContent = '比較先プレビューへ反映';
  applyBtn.style.cssText =
    'margin-top:10px;width:100%;padding:10px 14px;font-size:13px;font-weight:700;border:none;border-radius:10px;background:linear-gradient(180deg,#16a34a,#15803d);color:#fff;cursor:pointer';

  bodySlot.appendChild(row1);
  bodySlot.appendChild(fetchBtn);
  bodySlot.appendChild(jsonTa);
  bodySlot.appendChild(previewBox);
  bodySlot.appendChild(exportBtn);

  const sep = document.createElement('div');
  sep.style.cssText = 'margin:14px 0 8px;padding-top:10px;border-top:1px solid #e2e8f0;font-size:11px;font-weight:700;color:#475569';
  sep.textContent = '反映（プレビュー環境）';
  bodySlot.appendChild(sep);

  const row2 = document.createElement('div');
  row2.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:8px';
  row2.appendChild(tgtApp);
  row2.appendChild(tgtGuest);
  bodySlot.appendChild(row2);
  const deployNote = document.createElement('div');
  deployNote.style.cssText = 'font-size:11px;color:#64748b;margin-bottom:6px;line-height:1.45';
  deployNote.textContent = '反映後の本番デプロイは管理画面で手動行ってください。';
  bodySlot.appendChild(deployNote);
  bodySlot.appendChild(applyBtn);

  const uiApi = {
    setJson: (t) => { jsonTa.value = t; },
    setCustomizeHtml: (h) => { previewBox.innerHTML = h; }
  };

  fetchBtn.addEventListener('click', async () => {
    try {
      await runFetchJsConfigStandalone(
        {
          sourceAppId: srcApp.value.trim(),
          sourceGuestId: srcGuest.value.trim(),
          preview: srcPrevCb.checked
        },
        (m, e) => setStatus(m, e),
        uiApi
      );
    } catch (e) {
      setStatus(e.message || String(e), true);
    }
  });

  exportBtn.addEventListener('click', () => {
    try {
      runExportJsConfigStandalone(jsonTa.value, srcApp.value.trim(), (m, e) => setStatus(m, e));
    } catch (e) {
      setStatus(e.message || String(e), true);
    }
  });

  applyBtn.addEventListener('click', async () => {
    try {
      result.style.display = 'block';
      await runApplyJsConfigStandalone(
        {
          targetAppId: tgtApp.value.trim(),
          targetGuestId: tgtGuest.value.trim(),
          jsonText: jsonTa.value,
          deployAfter: false
        },
        (m, e) => setStatus(m, e),
        (html) => { result.innerHTML = html; }
      );
    } catch (e) {
      setStatus(e.message || String(e), true);
    }
  });
}
