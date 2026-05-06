'use strict';

import { esc, showToast } from '../utils.js';
import { assertAllowsMutatingApiUrl } from '../api.js';
import { setBusy } from '../ui/components.js';
import { setStatus } from '../ui/components.js';
import { getToolDocument } from '../ui/dialog.js';
import { bumpSessionMetric } from '../ui/psychology.js';

const API_TESTER_PRESETS = [
  {
    id: 'app-settings',
    label: 'アプリ設定を取得（GET）',
    method: 'GET',
    path: '/k/v1/app/settings.json',
    body: { app: 1 },
    hint: '読み取り専用APIです。app に対象アプリIDを指定します。'
  },
  {
    id: 'form-fields-get',
    label: 'フォーム項目を取得（GET）',
    method: 'GET',
    path: '/k/v1/app/form/fields.json',
    body: { app: 1 },
    hint: 'フォーム構造確認用。返却値の properties でフィールド一覧を確認できます。'
  },
  {
    id: 'form-fields-put-preview',
    label: 'フォーム項目を更新（PUT / preview）',
    method: 'PUT',
    path: '/k/v1/preview/app/form/fields.json',
    body: {
      app: 1,
      properties: {
        sample_text: {
          type: 'SINGLE_LINE_TEXT',
          code: 'sample_text',
          label: 'サンプルテキスト'
        }
      }
    },
    hint: '更新系APIのため preview パス必須です。反映後の本番デプロイは管理画面で実施してください。'
  },
  {
    id: 'record-get',
    label: 'レコード1件取得（GET）',
    method: 'GET',
    path: '/k/v1/record.json',
    body: { app: 1, id: 1 },
    hint: 'app と id の組み合わせで1件取得します。'
  },
  {
    id: 'records-get',
    label: 'レコード一覧取得（GET）',
    method: 'GET',
    path: '/k/v1/records.json',
    body: {
      app: 1,
      query: 'order by $id desc limit 10'
    },
    hint: '大量取得時は limit/offset や query を調整してください。'
  }
];

export async function runApiTester() {
  bumpSessionMetric('apiTesterRun');
  const method = (getToolDocument().getElementById('u_apiTesterMethod') as HTMLInputElement | null)?.value || 'GET';
  const path = (getToolDocument().getElementById('u_apiTesterPath') as HTMLInputElement | null)?.value?.trim();
  const bodyStr = (getToolDocument().getElementById('u_apiTesterBody') as HTMLInputElement | null)?.value?.trim() || '{}';
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
    if (/^https?:\/\//i.test(path)) {
      throw new Error('kintone.api には /k/v1/... または /k/guest/... の相対パスを指定してください。完全URLは実行できません。');
    }
    let finalPath = path;
    if (!path.startsWith('/k/v1/') && !path.startsWith('/k/guest/')) {
      const g = (getToolDocument().getElementById('u_sourceGuest') as HTMLInputElement | null)?.value?.trim();
      const prefix = g ? `/k/guest/${g}/v1` : '/k/v1';
      finalPath = prefix + (path.startsWith('/') ? path : `/${path}`);
    }

    assertAllowsMutatingApiUrl(finalPath, method);

    const res = await kintone.api(finalPath, method, payload);
    resEl.innerHTML = `<pre style="margin:0;padding:10px;font-size:12px;white-space:pre-wrap;color:#166534;background:#f0fdf4;border:1px solid #bbf7d0">${esc(JSON.stringify(res, null, 2))}</pre>`;
    setStatus(`API実行成功: ${method} ${finalPath}`);
    saveApiTesterHistory(method, path, bodyStr);
  } catch (e) {
    let errMsg = e instanceof Error ? e.message : String((e as any)?.message || e);
    if (!(e instanceof Error) && typeof e === 'object' && e !== null) {
      try { errMsg = JSON.stringify(e, null, 2); } catch (_) { }
    }
    resEl.innerHTML = `<pre style="margin:0;padding:10px;font-size:12px;white-space:pre-wrap;color:#991b1b;background:#fee2e2;border:1px solid #fecaca">${esc(errMsg)}</pre>`;
    setStatus(`API実行エラー: ${method} ${path}`, true);
  } finally {
    setBusy(false);
  }
}

const API_HISTORY_KEY = 'KUS_API_TESTER_HISTORY';

function prettyJson(value) {
  try {
    return JSON.stringify(value, null, 2);
  } catch (_) {
    return '{}';
  }
}

function setPresetHint(text) {
  const hintEl = getToolDocument().getElementById('u_apiTesterPresetHint');
  if (!hintEl) return;
  hintEl.textContent = text || 'プリセットを選択すると、入力例と注意点が表示されます。';
}

function applyApiTesterPreset(presetId: string) {
  const preset = API_TESTER_PRESETS.find(p => p.id === presetId);
  if (!preset) return;
  const methodEl = getToolDocument().getElementById('u_apiTesterMethod') as HTMLInputElement | HTMLSelectElement | null;
  const pathEl = getToolDocument().getElementById('u_apiTesterPath') as HTMLInputElement | null;
  const bodyEl = getToolDocument().getElementById('u_apiTesterBody') as HTMLTextAreaElement | null;
  if (methodEl) methodEl.value = preset.method;
  if (pathEl) pathEl.value = preset.path;
  if (bodyEl) bodyEl.value = prettyJson(preset.body);
  setPresetHint(preset.hint);
}

export function initApiTesterEnhancements() {
  const doc = getToolDocument();
  const root = doc.getElementById('kintone-unified-suite-v2') || doc.body;
  if ((root as any).__apiTesterEnhanced) {
    renderApiTesterHistory();
    return;
  }
  (root as any).__apiTesterEnhanced = true;

  const presetEl = doc.getElementById('u_apiTesterPreset') as HTMLSelectElement | null;
  const suggestEl = doc.getElementById('u_apiTesterPathSuggest') as HTMLDataListElement | null;
  if (presetEl) {
    presetEl.querySelectorAll('option[data-api-tester-preset]').forEach((option) => option.remove());
    const options = API_TESTER_PRESETS.map((preset) => `<option data-api-tester-preset="1" value="${esc(preset.id)}">${esc(preset.label)}</option>`).join('');
    presetEl.insertAdjacentHTML('beforeend', options);
    presetEl.addEventListener('change', () => {
      const presetId = presetEl.value;
      if (!presetId) {
        setPresetHint('');
        return;
      }
      applyApiTesterPreset(presetId);
    });
  }
  if (suggestEl) {
    const seen = new Set<string>();
    suggestEl.innerHTML = API_TESTER_PRESETS
      .filter((preset) => {
        if (seen.has(preset.path)) return false;
        seen.add(preset.path);
        return true;
      })
      .map((preset) => `<option value="${esc(preset.path)}"></option>`)
      .join('');
  }

  const methodEl = doc.getElementById('u_apiTesterMethod') as HTMLInputElement | HTMLSelectElement | null;
  const pathEl = doc.getElementById('u_apiTesterPath') as HTMLInputElement | null;
  const bodyEl = doc.getElementById('u_apiTesterBody') as HTMLTextAreaElement | null;
  if (methodEl && pathEl && bodyEl) {
    const getPresetByMethod = (method: string) => API_TESTER_PRESETS.find((preset) => preset.method === method);
    methodEl.addEventListener('change', () => {
      const preset = getPresetByMethod(methodEl.value);
      if (!preset) return;
      if (!pathEl.value.trim()) pathEl.value = preset.path;
      if (!bodyEl.value.trim()) bodyEl.value = prettyJson(preset.body);
      setPresetHint(preset.hint);
    });
  }
}

export function saveApiTesterHistory(method: string, path: string, bodyStr: string) {
  try {
    let hist: any[] = JSON.parse(localStorage.getItem(API_HISTORY_KEY) || '[]');
    hist = hist.filter((h: any) => !(h.method === method && h.path === path && h.body === bodyStr));
    hist.unshift({ method, path, body: bodyStr, time: new Date().toISOString() });
    if (hist.length > 15) hist = hist.slice(0, 15);
    localStorage.setItem(API_HISTORY_KEY, JSON.stringify(hist));
    renderApiTesterHistory();
  } catch (e) {
    console.error('History save failed', e);
    showToast('API履歴の保存に失敗しました。ブラウザの保存容量や権限を確認してください。', 'warn');
  }
}

export function clearApiTesterHistory() {
  try {
    localStorage.removeItem(API_HISTORY_KEY);
  } catch (e) {
    console.error('History clear failed', e);
    showToast('API履歴の削除に失敗しました。', 'warn');
  }
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
    const html = hist.map((h: any, i: number) => {
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
    const items = listEl.querySelectorAll<HTMLElement>('.api-history-item');
    const applyHistoryItem = (item: HTMLElement) => {
      const idx = parseInt(item.dataset.idx || '0', 10);
      const data = hist[idx];
      if (!data) return;
      const methodEl = getToolDocument().getElementById('u_apiTesterMethod') as HTMLInputElement | HTMLSelectElement | null;
      const pathEl = getToolDocument().getElementById('u_apiTesterPath') as HTMLInputElement | null;
      const bodyEl = getToolDocument().getElementById('u_apiTesterBody') as HTMLTextAreaElement | null;
      if (methodEl) methodEl.value = data.method;
      if (pathEl) pathEl.value = data.path;
      if (bodyEl) bodyEl.value = data.body || '{}';
    };
    items.forEach((item: HTMLElement) => {
      item.addEventListener('click', () => {
        applyHistoryItem(item);
      });
      item.addEventListener('keydown', (event: Event) => {
        const ke = event as KeyboardEvent;
        if (ke.key !== 'Enter' && ke.key !== ' ') return;
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
    console.error('History load failed', e);
    listEl.innerHTML = '<div style="color:#ef4444;font-size:11px;">履歴読込エラー</div>';
  }
}
