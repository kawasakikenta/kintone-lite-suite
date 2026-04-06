'use strict';

import { esc, showToast } from '../utils.js';
import { assertAllowsMutatingApiUrl } from '../api.js';
import { setBusy } from '../ui/components.js';
import { setStatus } from '../ui/components.js';
import { getToolDocument } from '../ui/dialog.js';

export async function runApiTester() {
  const method = getToolDocument().getElementById('u_apiTesterMethod')?.value || 'GET';
  const path = getToolDocument().getElementById('u_apiTesterPath')?.value?.trim();
  const bodyStr = getToolDocument().getElementById('u_apiTesterBody')?.value?.trim() || '{}';
  const resEl = getToolDocument().getElementById('u_apiTesterResult');

  if (!resEl) {
    setStatus('APIテスターの結果表示要素が見つかりません。画面を再読み込みしてください。', true);
    return;
  }

  if (!path) {
    showToast('エンドポイントを指定してください', 'warn');
    return;
  }

  let payload = {};
  if (bodyStr) {
    try {
      payload = JSON.parse(bodyStr);
    } catch (e) {
      showToast('リクエストBodyのJSON形式が不正です: ' + e.message, 'error');
      return;
    }
  }

  setBusy(true, `API実行中 (${method}) ...`);
  resEl.innerHTML = '<div style="color:#64748b">実行中...</div>';

  try {
    let finalPath = path;
    if (!path.startsWith('http') && !path.startsWith('/k/v1/') && !path.startsWith('/k/guest/')) {
      const g = getToolDocument().getElementById('u_sourceGuest')?.value?.trim();
      const prefix = g ? `/k/guest/${g}/v1` : '/k/v1';
      finalPath = prefix + (path.startsWith('/') ? path : `/${path}`);
    }

    assertAllowsMutatingApiUrl(finalPath, method);

    const res = await kintone.api(finalPath, method, payload);
    resEl.innerHTML = `<pre style="margin:0;padding:10px;font-size:12px;white-space:pre-wrap;color:#166534;background:#f0fdf4;border:1px solid #bbf7d0">${esc(JSON.stringify(res, null, 2))}</pre>`;
    setStatus(`API実行成功: ${method} ${finalPath}`);
    saveApiTesterHistory(method, path, bodyStr);
  } catch (e) {
    let errMsg = String(e.message || e);
    if (typeof e === 'object' && e !== null) {
      try { errMsg = JSON.stringify(e, null, 2); } catch (_) { }
    }
    resEl.innerHTML = `<pre style="margin:0;padding:10px;font-size:12px;white-space:pre-wrap;color:#991b1b;background:#fee2e2;border:1px solid #fecaca">${esc(errMsg)}</pre>`;
    setStatus(`API実行エラー: ${method} ${path}`, true);
  } finally {
    setBusy(false);
  }
}

const API_HISTORY_KEY = 'KUS_API_TESTER_HISTORY';

export function saveApiTesterHistory(method, path, bodyStr) {
  try {
    let hist = JSON.parse(localStorage.getItem(API_HISTORY_KEY) || '[]');
    hist = hist.filter(h => !(h.method === method && h.path === path && h.body === bodyStr));
    hist.unshift({ method, path, body: bodyStr, time: new Date().toISOString() });
    if (hist.length > 15) hist = hist.slice(0, 15);
    localStorage.setItem(API_HISTORY_KEY, JSON.stringify(hist));
    renderApiTesterHistory();
  } catch (e) { console.error('History save failed', e); }
}

export function clearApiTesterHistory() {
  localStorage.removeItem(API_HISTORY_KEY);
  renderApiTesterHistory();
}

export function renderApiTesterHistory() {
  const listEl = getToolDocument().getElementById('u_apiTesterHistoryList');
  if (!listEl) return;
  try {
    const hist = JSON.parse(localStorage.getItem(API_HISTORY_KEY) || '[]');
    if (!hist.length) {
      listEl.innerHTML = '<div style="color:#94a3b8;font-size:11px;font-style:italic;padding:8px;">履歴はありません</div>';
      return;
    }
    const html = hist.map((h, i) => {
      let bPrev = h.body || '';
      if (bPrev.length > 30) bPrev = bPrev.slice(0, 30) + '...';
      const isGet = h.method === 'GET';
      const methodColor = isGet ? '#2563eb' : (h.method === 'POST' ? '#16a34a' : (h.method === 'PUT' ? '#d97706' : '#dc2626'));
      const methodBg = isGet ? '#dbeafe' : (h.method === 'POST' ? '#dcfce3' : (h.method === 'PUT' ? '#fef3c7' : '#fee2e2'));
      return `
        <div class="api-history-item" data-idx="${i}" role="button" tabindex="0"
          style="cursor:pointer;background:#fff;border:1px solid #e2e8f0;padding:6px 8px;border-radius:6px;transition:0.15s;display:flex;flex-direction:column;gap:4px;">
          <div style="display:flex;align-items:center;gap:6px;overflow:hidden;">
            <span style="font-size:9px;font-weight:800;background:${methodBg};color:${methodColor};padding:2px 4px;border-radius:4px;">${esc(h.method)}</span>
            <span style="font-size:11px;color:#0f172a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${esc(h.path)}">${esc(h.path)}</span>
          </div>
          ${bPrev && bPrev !== '{}' ? `<div style="font-size:10px;color:#64748b;font-family:monospace;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(bPrev)}</div>` : ''}
        </div>
      `;
    }).join('');
    listEl.innerHTML = html;
    
    // bind events
    const items = listEl.querySelectorAll('.api-history-item');
    const applyHistoryItem = (item) => {
      const idx = parseInt(item.dataset.idx, 10);
      const data = hist[idx];
      if (!data) return;
      const methodEl = getToolDocument().getElementById('u_apiTesterMethod');
      const pathEl = getToolDocument().getElementById('u_apiTesterPath');
      const bodyEl = getToolDocument().getElementById('u_apiTesterBody');
      if (methodEl) methodEl.value = data.method;
      if (pathEl) pathEl.value = data.path;
      if (bodyEl) bodyEl.value = data.body || '{}';
    };
    items.forEach(item => {
      item.addEventListener('click', () => {
        applyHistoryItem(item);
      });
      item.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        applyHistoryItem(item);
      });
      // a11y focus outline
      item.addEventListener('focus', () => { item.style.outline = '2px solid #2563eb'; });
      item.addEventListener('blur', () => { item.style.outline = 'none'; });
      item.addEventListener('mouseover', () => { item.style.borderColor = '#93c5fd'; item.style.backgroundColor = '#eff6ff'; });
      item.addEventListener('mouseout', () => { item.style.borderColor = '#e2e8f0'; item.style.backgroundColor = '#fff'; });
    });
  } catch (e) {
    listEl.innerHTML = '<div style="color:#ef4444;font-size:11px;">履歴読込エラー</div>';
  }
}
