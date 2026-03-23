'use strict';

import { ui } from '../state.js';
import { esc } from '../utils.js';
import { setBusy } from '../ui/components.js';
import { setStatus } from '../ui/components.js';

export async function runApiTester() {
  const method = document.getElementById('u_apiTesterMethod')?.value || 'GET';
  const path = document.getElementById('u_apiTesterPath')?.value?.trim();
  const bodyStr = document.getElementById('u_apiTesterBody')?.value?.trim() || '{}';
  const resEl = document.getElementById('u_apiTesterResult');

  if (!path) {
    alert('エンドポイントを指定してください');
    return;
  }

  let payload = {};
  if (bodyStr) {
    try {
      payload = JSON.parse(bodyStr);
    } catch (e) {
      alert('リクエストBodyのJSON形式が不正です:\n' + e.message);
      return;
    }
  }

  setBusy(true, `API実行中 (${method}) ...`);
  resEl.innerHTML = '<div style="color:#64748b">実行中...</div>';

  try {
    let finalPath = path;
    if (!path.startsWith('http') && !path.startsWith('/k/v1/') && !path.startsWith('/k/guest/')) {
      const g = document.getElementById('u_sourceGuest')?.value?.trim();
      const prefix = g ? `/k/guest/${g}/v1` : '/k/v1';
      finalPath = prefix + (path.startsWith('/') ? path : `/${path}`);
    }

    const res = await kintone.api(finalPath, method, payload);
    resEl.innerHTML = `<pre style="margin:0;padding:10px;font-size:12px;white-space:pre-wrap;color:#166534;background:#f0fdf4;border:1px solid #bbf7d0">${esc(JSON.stringify(res, null, 2))}</pre>`;
    setStatus(`API実行成功: ${method} ${finalPath}`);
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
