'use strict';

import { DEFAULT_APP_ID, SECTION_DEFS } from '../constants.js';
import { setStatus } from '../ui/components.js';
import { runApplyPreviewStandalone } from '../tabs/reflect-standalone.js';
import { mountKusLitePanel } from './liteMount.js';

const REFLECT_LITE_STATE_KEY = 'kus_reflect_lite_state_v1';

function row(labelHtml, child) {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-bottom:10px';
  const lab = document.createElement('span');
  lab.style.cssText = 'font-size:12px;font-weight:600;color:#334155;min-width:6em';
  lab.innerHTML = labelHtml;
  wrap.appendChild(lab);
  wrap.appendChild(child);
  return wrap;
}

export function mountReflectLitePanel() {
  const { bodySlot } = mountKusLitePanel({
    id: 'kus-reflect-lite',
    title: 'プレビュー反映',
    note: '比較元アプリの設定を比較先プレビュー環境へ一括反映します。統合ツール.js は不要です。'
  });

  const mkInput = (ph, val) => {
    const inp = document.createElement('input');
    inp.type = 'text';
    inp.placeholder = ph;
    if (val) inp.value = val;
    inp.style.cssText = 'width:min(120px,40vw);padding:6px 10px;border:1px solid #e2e8f0;border-radius:8px;font-size:12px';
    return inp;
  };

  let savedState: any = {};
  try {
    const raw = localStorage.getItem(REFLECT_LITE_STATE_KEY) || '';
    savedState = raw ? JSON.parse(raw) : {};
  } catch (_) {
    savedState = {};
  }

  const srcApp = mkInput('比較元アプリID', savedState.sourceAppId || DEFAULT_APP_ID || '');
  const srcGuest = mkInput('ゲストID（任意）', savedState.sourceGuestId || '');
  const tgtApp = mkInput('比較先アプリID', savedState.targetAppId || DEFAULT_APP_ID || '');
  const tgtGuest = mkInput('ゲストID（任意）', savedState.targetGuestId || '');

  bodySlot.appendChild(row('比較元ID', srcApp));
  bodySlot.appendChild(row('元ゲスト', srcGuest));
  bodySlot.appendChild(row('比較先ID', tgtApp));
  bodySlot.appendChild(row('先ゲスト', tgtGuest));

  const quickRow = document.createElement('div');
  quickRow.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;margin:-2px 0 10px';
  const mkQuickBtn = (text) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = text;
    btn.style.cssText =
      'padding:5px 10px;font-size:11px;font-weight:600;border:1px solid #cbd5e1;border-radius:8px;background:#f8fafc;color:#334155;cursor:pointer';
    quickRow.appendChild(btn);
    return btn;
  };
  const copySrcToTgtBtn = mkQuickBtn('比較元→比較先をコピー');
  const setCurrentToTgtBtn = mkQuickBtn('現在のアプリを比較先にセット');
  bodySlot.appendChild(quickRow);

  const scopeBox = document.createElement('div');
  scopeBox.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px';
  const putSections = SECTION_DEFS.filter((d) => d.put);
  const scopeChecks = putSections.map((d) => {
    const label = document.createElement('label');
    label.style.cssText = 'font-size:11px;display:inline-flex;align-items:center;gap:4px;cursor:pointer;padding:3px 6px;border:1px solid #e2e8f0;border-radius:6px;background:#f8fafc';
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = true;
    cb.dataset.key = d.key;
    label.appendChild(cb);
    label.appendChild(document.createTextNode(d.label));
    scopeBox.appendChild(label);
    return cb;
  });

  const scopeLabel = document.createElement('div');
  scopeLabel.style.cssText = 'font-size:12px;font-weight:600;color:#334155;margin-bottom:6px';
  scopeLabel.textContent = '反映するセクション:';
  bodySlot.appendChild(scopeLabel);
  const scopeActionRow = document.createElement('div');
  scopeActionRow.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;margin:0 0 6px';
  const selectAllBtn = document.createElement('button');
  selectAllBtn.type = 'button';
  selectAllBtn.textContent = '全選択';
  selectAllBtn.style.cssText =
    'padding:5px 10px;font-size:11px;font-weight:600;border:1px solid #cbd5e1;border-radius:8px;background:#f8fafc;cursor:pointer';
  const clearAllBtn = document.createElement('button');
  clearAllBtn.type = 'button';
  clearAllBtn.textContent = '全解除';
  clearAllBtn.style.cssText =
    'padding:5px 10px;font-size:11px;font-weight:600;border:1px solid #cbd5e1;border-radius:8px;background:#fff;cursor:pointer';
  scopeActionRow.appendChild(selectAllBtn);
  scopeActionRow.appendChild(clearAllBtn);
  bodySlot.appendChild(scopeActionRow);
  bodySlot.appendChild(scopeBox);

  const optRow = document.createElement('div');
  optRow.style.cssText = 'display:flex;flex-wrap:wrap;gap:12px;margin-bottom:12px';
  const mkOpt = (text) => {
    const label = document.createElement('label');
    label.style.cssText = 'font-size:11px;color:#475569;display:inline-flex;align-items:center;gap:4px;cursor:pointer';
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    label.appendChild(cb);
    label.appendChild(document.createTextNode(text));
    optRow.appendChild(label);
    return cb;
  };
  const backupCb = mkOpt('バックアップ保存');
  backupCb.checked = true;
  const srcPreviewCb = mkOpt('比較元をプレビューから取得');
  srcPreviewCb.checked = savedState.sourcePreview !== false;
  const stopCb = mkOpt('エラー時中断');
  stopCb.checked = !!savedState.stopOnError;
  bodySlot.appendChild(optRow);
  const deployNote = document.createElement('div');
  deployNote.style.cssText = 'font-size:11px;color:#64748b;margin:-4px 0 10px;line-height:1.45';
  deployNote.textContent = '本番デプロイはツールから実行できません。プレビュー反映後、kintone管理画面から手動でデプロイしてください。';
  bodySlot.appendChild(deployNote);

  const logArea = document.createElement('pre');
  logArea.style.cssText = 'margin:0;padding:10px;font-size:11px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;max-height:200px;overflow:auto;white-space:pre-wrap;display:none';
  bodySlot.appendChild(logArea);

  const runBtn = document.createElement('button');
  runBtn.type = 'button';
  runBtn.textContent = 'プレビュー反映を実行';
  runBtn.style.cssText =
    'padding:10px 14px;font-size:13px;font-weight:700;border:none;border-radius:10px;background:linear-gradient(180deg,#dc2626,#b91c1c);color:#fff;cursor:pointer;margin-top:4px';

  const saveState = () => {
    const payload = {
      sourceAppId: srcApp.value.trim(),
      sourceGuestId: srcGuest.value.trim(),
      targetAppId: tgtApp.value.trim(),
      targetGuestId: tgtGuest.value.trim(),
      sourcePreview: srcPreviewCb.checked,
      stopOnError: stopCb.checked
    };
    try {
      localStorage.setItem(REFLECT_LITE_STATE_KEY, JSON.stringify(payload));
    } catch (_) {
      // ignore quota / private browsing errors
    }
  };

  copySrcToTgtBtn.addEventListener('click', () => {
    tgtApp.value = srcApp.value.trim();
    tgtGuest.value = srcGuest.value.trim();
    saveState();
    setStatus('比較元IDを比較先へコピーしました');
  });

  setCurrentToTgtBtn.addEventListener('click', () => {
    tgtApp.value = DEFAULT_APP_ID || '';
    saveState();
    setStatus('現在のアプリIDを比較先にセットしました');
  });

  selectAllBtn.addEventListener('click', () => {
    scopeChecks.forEach((cb) => { cb.checked = true; });
  });
  clearAllBtn.addEventListener('click', () => {
    scopeChecks.forEach((cb) => { cb.checked = false; });
  });

  runBtn.addEventListener('click', async () => {
    const scopes = scopeChecks.filter((cb) => cb.checked).map((cb) => cb.dataset.key);
    logArea.style.display = 'block';
    logArea.textContent = '';
    saveState();
    try {
      await runApplyPreviewStandalone(
        {
          sourceAppId: srcApp.value.trim(),
          sourceGuestId: srcGuest.value.trim(),
          sourcePreview: srcPreviewCb.checked,
          targetAppId: tgtApp.value.trim(),
          targetGuestId: tgtGuest.value.trim(),
          scopes,
          doDeploy: false,
          doBackup: backupCb.checked,
          stopOnError: stopCb.checked
        },
        (m, e) => setStatus(m, e),
        (logs) => {
          logArea.textContent = logs.join('\n');
          logArea.scrollTop = logArea.scrollHeight;
        }
      );
    } catch (e) {
      setStatus(e.message || String(e), true);
    }
  });

  bodySlot.appendChild(runBtn);
}
