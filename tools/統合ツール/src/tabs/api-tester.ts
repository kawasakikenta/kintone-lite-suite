'use strict';

import { downloadText, esc, showToast, buildExportFilename } from '../utils.js';
import { assertAllowsMutatingApiUrl } from '../api.js';
import { setBusy } from '../ui/components.js';
import { setStatus } from '../ui/components.js';
import { getToolDocument } from '../ui/dialog.js';
import { bumpSessionMetric } from '../ui/psychology.js';

type ApiTesterPreset = {
  id: string;
  label: string;
  group: string;
  method: string;
  path: string;
  body: any;
  hint: string;
};

const API_TESTER_PRESETS: ReadonlyArray<ApiTesterPreset> = [
  // ----- 取得系（読み取り） -----
  {
    id: 'app-info',
    label: 'アプリ情報を取得',
    group: '取得（読み取り）',
    method: 'GET',
    path: '/k/v1/app.json',
    body: { id: 1 },
    hint: 'アプリのメタ情報（名称・コード・スペースなど）を取得します。'
  },
  {
    id: 'app-settings',
    label: 'アプリ設定を取得',
    group: '取得（読み取り）',
    method: 'GET',
    path: '/k/v1/app/settings.json',
    body: { app: 1 },
    hint: '読み取り専用APIです。app に対象アプリIDを指定します。'
  },
  {
    id: 'form-fields-get',
    label: 'フォーム項目を取得',
    group: '取得（読み取り）',
    method: 'GET',
    path: '/k/v1/app/form/fields.json',
    body: { app: 1 },
    hint: 'フォーム構造確認用。返却値の properties でフィールド一覧を確認できます。'
  },
  {
    id: 'form-layout-get',
    label: 'フォームレイアウトを取得',
    group: '取得（読み取り）',
    method: 'GET',
    path: '/k/v1/app/form/layout.json',
    body: { app: 1 },
    hint: 'レイアウト構造（ROW / GROUP / SUBTABLE）を取得します。'
  },
  {
    id: 'views-get',
    label: 'ビュー設定を取得',
    group: '取得（読み取り）',
    method: 'GET',
    path: '/k/v1/app/views.json',
    body: { app: 1 },
    hint: '一覧（ビュー）の設定を取得します。'
  },
  {
    id: 'process-mgmt-get',
    label: 'プロセス管理設定を取得',
    group: '取得（読み取り）',
    method: 'GET',
    path: '/k/v1/app/status.json',
    body: { app: 1 },
    hint: 'ステータス・アクション・閲覧設定を取得します。'
  },
  {
    id: 'deploy-status-get',
    label: 'デプロイ状態を取得',
    group: '取得（読み取り）',
    method: 'GET',
    path: '/k/v1/preview/app/deploy.json',
    body: { apps: [1] },
    hint: 'デプロイ中(PROCESSING)/成功(SUCCESS)/失敗(FAIL)/未着手(CANCEL/NONE) を確認できます。'
  },
  {
    id: 'record-get',
    label: 'レコード1件取得',
    group: '取得（読み取り）',
    method: 'GET',
    path: '/k/v1/record.json',
    body: { app: 1, id: 1 },
    hint: 'app と id の組み合わせで1件取得します。'
  },
  {
    id: 'records-get',
    label: 'レコード一覧取得',
    group: '取得（読み取り）',
    method: 'GET',
    path: '/k/v1/records.json',
    body: {
      app: 1,
      query: 'order by $id desc limit 10'
    },
    hint: '大量取得時は limit/offset や query を調整してください。'
  },
  {
    id: 'comments-get',
    label: 'コメント一覧取得',
    group: '取得（読み取り）',
    method: 'GET',
    path: '/k/v1/record/comments.json',
    body: { app: 1, record: 1, order: 'desc', limit: 10 },
    hint: 'レコードのコメントを新しい順で取得します。'
  },
  // ----- preview 更新系（書き込み） -----
  {
    id: 'form-fields-post-preview',
    label: 'フィールドを追加（POST / preview）',
    group: '更新（preview 必須）',
    method: 'POST',
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
    hint: '新規フィールドを preview に追加します。デプロイ反映は別途必要です。'
  },
  {
    id: 'form-fields-put-preview',
    label: 'フィールドを更新（PUT / preview）',
    group: '更新（preview 必須）',
    method: 'PUT',
    path: '/k/v1/preview/app/form/fields.json',
    body: {
      app: 1,
      properties: {
        sample_text: {
          type: 'SINGLE_LINE_TEXT',
          code: 'sample_text',
          label: 'サンプルテキスト(更新)'
        }
      }
    },
    hint: '既存フィールド設定を変更します。type/code は変更不可です。'
  },
  {
    id: 'app-settings-put-preview',
    label: 'アプリ設定を更新（PUT / preview）',
    group: '更新（preview 必須）',
    method: 'PUT',
    path: '/k/v1/preview/app/settings.json',
    body: {
      app: 1,
      name: '更新後のアプリ名'
    },
    hint: 'アプリ名・説明・アイコンなどの基本設定を更新します。'
  }
];

const PATH_SUGGESTIONS: ReadonlyArray<string> = [
  '/k/v1/app.json',
  '/k/v1/app/settings.json',
  '/k/v1/app/form/fields.json',
  '/k/v1/app/form/layout.json',
  '/k/v1/app/views.json',
  '/k/v1/app/status.json',
  '/k/v1/app/acl.json',
  '/k/v1/field/acl.json',
  '/k/v1/record/acl.json',
  '/k/v1/record.json',
  '/k/v1/records.json',
  '/k/v1/record/comments.json',
  '/k/v1/preview/app/deploy.json',
  '/k/v1/preview/app/settings.json',
  '/k/v1/preview/app/form/fields.json',
  '/k/v1/preview/app/form/layout.json',
  '/k/v1/preview/app/views.json'
];

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRateLimitLike(error: any): boolean {
  const text = `${error?.code || ''} ${error?.message || ''} ${error?.status || ''}`.toLowerCase();
  return error?.status === 429 || text.includes('limit') || text.includes('too many') || text.includes('rate');
}

function formatApiTesterError(error: any): string {
  if (!error || typeof error !== 'object') return String(error);
  const lines = [
    error.message ? `message: ${error.message}` : '',
    error.code ? `code: ${error.code}` : '',
    error.id ? `id: ${error.id}` : '',
    error.status ? `status: ${error.status}` : ''
  ].filter(Boolean);
  if (error.errors && typeof error.errors === 'object') {
    lines.push('errors:');
    for (const [key, value] of Object.entries(error.errors) as Array<[string, any]>) {
      lines.push(`  ${key}: ${value?.messages?.join(', ') || JSON.stringify(value)}`);
    }
  }
  if (!lines.length) {
    try { return JSON.stringify(error, null, 2); } catch (_) { return String(error); }
  }
  return lines.join('\n');
}

async function runKintoneApiWithSingleRetry(path: string, method: string, payload: any) {
  try {
    return await kintone.api(path, method, payload);
  } catch (error) {
    if (!isRateLimitLike(error)) throw error;
    setStatus('API制限の可能性があるため、1.5秒待って再試行します...', true);
    await sleep(1500);
    return await kintone.api(path, method, payload);
  }
}

let lastApiTesterResponse: any = null;

function setApiTesterMeta(text: string, ok: boolean): void {
  const metaEl = getToolDocument().getElementById('u_apiTesterMeta');
  if (!metaEl) return;
  metaEl.textContent = text;
  metaEl.style.color = ok ? '#166534' : '#991b1b';
  metaEl.style.background = ok ? '#f0fdf4' : '#fee2e2';
  metaEl.style.border = `1px solid ${ok ? '#bbf7d0' : '#fecaca'}`;
}

function formatDuration(ms: number): string {
  if (!isFinite(ms) || ms < 0) return '-';
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

function describeResponseShape(res: any): string {
  if (res == null) return 'null';
  if (Array.isArray(res)) return `array (${res.length} items)`;
  if (typeof res === 'object') {
    if (Array.isArray(res.records)) return `records (${res.records.length} items)`;
    if (res.properties && typeof res.properties === 'object') {
      return `properties (${Object.keys(res.properties).length} fields)`;
    }
    if (Array.isArray(res.comments)) return `comments (${res.comments.length} items)`;
    return `object (${Object.keys(res).length} keys)`;
  }
  return typeof res;
}

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
  setApiTesterMeta('実行中…', true);
  lastApiTesterResponse = null;

  const t0 = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
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

    const res = await runKintoneApiWithSingleRetry(finalPath, method, payload);
    const elapsed = ((typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now()) - t0;
    lastApiTesterResponse = res;
    const json = JSON.stringify(res, null, 2);
    const sizeBytes = new Blob([json]).size;
    resEl.innerHTML = `<pre style="margin:0;padding:10px;font-size:12px;white-space:pre-wrap;color:#166534;background:#f0fdf4;border:1px solid #bbf7d0">${esc(json)}</pre>`;
    setApiTesterMeta(`✓ 成功 / ${formatDuration(elapsed)} / ${describeResponseShape(res)} / ${(sizeBytes / 1024).toFixed(1)} KB`, true);
    setStatus(`API実行成功: ${method} ${finalPath} (${formatDuration(elapsed)})`);
    saveApiTesterHistory(method, path, bodyStr);
  } catch (e) {
    const elapsed = ((typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now()) - t0;
    let errMsg = formatApiTesterError(e);
    resEl.innerHTML = `<pre style="margin:0;padding:10px;font-size:12px;white-space:pre-wrap;color:#991b1b;background:#fee2e2;border:1px solid #fecaca">${esc(errMsg)}</pre>`;
    const status = (e && (e as any).status) ? ` / status ${(e as any).status}` : '';
    setApiTesterMeta(`✗ エラー / ${formatDuration(elapsed)}${status}`, false);
    setStatus(`API実行エラー: ${method} ${path}`, true);
  } finally {
    setBusy(false);
  }
}

let apiTesterHistoryMemory: any[] = [];

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
  const doc = getToolDocument();
  const methodEl = doc.getElementById('u_apiTesterMethod') as HTMLInputElement | HTMLSelectElement | null;
  const pathEl = doc.getElementById('u_apiTesterPath') as HTMLInputElement | null;
  const bodyEl = doc.getElementById('u_apiTesterBody') as HTMLTextAreaElement | null;
  // 比較元アプリID/ゲストIDが入力されていれば、プリセットの app=1 等をその値で置換して
  // ユーザーが手で書き換える手間を省く（GET 系は読み取り専用なので安全）。
  const sourceAppId = (doc.getElementById('u_sourceApp') as HTMLInputElement | null)?.value?.trim();
  let body = preset.body;
  if (sourceAppId && body && typeof body === 'object' && !Array.isArray(body)) {
    body = { ...body };
    if ('app' in (body as any) && /^\d+$/.test(sourceAppId)) (body as any).app = Number(sourceAppId);
    if ('id' in (body as any) && /^\d+$/.test(sourceAppId) && preset.path === '/k/v1/app.json') (body as any).id = Number(sourceAppId);
    if ('apps' in (body as any) && Array.isArray((body as any).apps) && /^\d+$/.test(sourceAppId)) {
      (body as any).apps = [Number(sourceAppId)];
    }
  }
  if (methodEl) methodEl.value = preset.method;
  if (pathEl) pathEl.value = preset.path;
  if (bodyEl) bodyEl.value = prettyJson(body);
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
    presetEl.querySelectorAll('option[data-api-tester-preset], optgroup[data-api-tester-preset]').forEach((node) => node.remove());
    const groups = new Map<string, ApiTesterPreset[]>();
    for (const preset of API_TESTER_PRESETS) {
      const arr = groups.get(preset.group) || [];
      arr.push(preset);
      groups.set(preset.group, arr);
    }
    const fragments: string[] = [];
    for (const [group, presets] of groups.entries()) {
      const options = presets.map((preset) => `<option data-api-tester-preset="1" value="${esc(preset.id)}">${esc(preset.label)}</option>`).join('');
      fragments.push(`<optgroup data-api-tester-preset="1" label="${esc(group)}">${options}</optgroup>`);
    }
    presetEl.insertAdjacentHTML('beforeend', fragments.join(''));
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
    const paths: string[] = [];
    for (const preset of API_TESTER_PRESETS) {
      if (seen.has(preset.path)) continue;
      seen.add(preset.path);
      paths.push(preset.path);
    }
    for (const path of PATH_SUGGESTIONS) {
      if (seen.has(path)) continue;
      seen.add(path);
      paths.push(path);
    }
    suggestEl.innerHTML = paths.map((path) => `<option value="${esc(path)}"></option>`).join('');
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

  // Ctrl/Cmd + Enter to execute, while focused on the API tester pane
  const pane = doc.querySelector('[data-pane="apiTester"]') as HTMLElement | null;
  if (pane) {
    pane.addEventListener('keydown', (event: Event) => {
      const ke = event as KeyboardEvent;
      if ((ke.ctrlKey || ke.metaKey) && ke.key === 'Enter') {
        ke.preventDefault();
        runApiTester();
      }
    });
  }
}

export function beautifyApiTesterBody(): void {
  const bodyEl = getToolDocument().getElementById('u_apiTesterBody') as HTMLTextAreaElement | null;
  if (!bodyEl) return;
  const raw = (bodyEl.value || '').trim();
  if (!raw) {
    bodyEl.value = '{}';
    setStatus('Body を {} に初期化しました');
    return;
  }
  try {
    const parsed = JSON.parse(raw);
    bodyEl.value = prettyJson(parsed);
    setStatus('Body を整形しました');
  } catch (e) {
    showToast('JSON が不正です: ' + (e as any).message, 'error');
  }
}

export function minifyApiTesterBody(): void {
  const bodyEl = getToolDocument().getElementById('u_apiTesterBody') as HTMLTextAreaElement | null;
  if (!bodyEl) return;
  const raw = (bodyEl.value || '').trim();
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw);
    bodyEl.value = JSON.stringify(parsed);
    setStatus('Body をミニファイしました');
  } catch (e) {
    showToast('JSON が不正です: ' + (e as any).message, 'error');
  }
}

export async function copyApiTesterResponse(): Promise<void> {
  if (lastApiTesterResponse == null) {
    showToast('先にAPIを実行してください', 'warn');
    return;
  }
  const text = prettyJson(lastApiTesterResponse);
  try {
    await navigator.clipboard.writeText(text);
    setStatus('レスポンスをクリップボードへコピーしました');
  } catch (_e) {
    showToast('クリップボードへコピーできませんでした', 'error');
  }
}

export function downloadApiTesterResponse(): void {
  if (lastApiTesterResponse == null) {
    showToast('先にAPIを実行してください', 'warn');
    return;
  }
  const doc = getToolDocument();
  const method = String((doc.getElementById('u_apiTesterMethod') as HTMLInputElement | HTMLSelectElement | null)?.value || 'GET').toUpperCase();
  const rawPath = String((doc.getElementById('u_apiTesterPath') as HTMLInputElement | null)?.value || '').trim();
  const pathSlug = rawPath
    .replace(/^\/+/, '')
    .replace(/\.json$/i, '')
    .replace(/[^A-Za-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'response';
  downloadText(buildExportFilename('API応答', 'json', { appLabel: `${method.toLowerCase()}_${pathSlug}` }), prettyJson(lastApiTesterResponse), 'application/json;charset=utf-8');
  setStatus('レスポンスをJSONとして保存しました');
}

export function exportApiTesterHistory(): void {
  if (!apiTesterHistoryMemory.length) {
    showToast('履歴がありません', 'warn');
    return;
  }
  const payload = {
    exportedAt: new Date().toISOString(),
    history: apiTesterHistoryMemory
  };
  downloadText(buildExportFilename('APIテスター履歴', 'json'), prettyJson(payload), 'application/json;charset=utf-8');
  setStatus(`履歴 ${apiTesterHistoryMemory.length} 件をエクスポートしました`);
}

export function importApiTesterHistory(): void {
  const doc = getToolDocument();
  const input = doc.createElement('input');
  input.type = 'file';
  input.accept = '.json,application/json';
  input.addEventListener('change', async () => {
    const file = input.files && input.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const items = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.history) ? parsed.history : null;
      if (!items) {
        showToast('履歴 JSON の形式が不正です（history 配列が見つかりません）', 'error');
        return;
      }
      const seen = new Set<string>();
      const normalized: any[] = [];
      for (const raw of items) {
        if (!raw || typeof raw !== 'object') continue;
        const method = String((raw as any).method || 'GET').toUpperCase();
        const path = String((raw as any).path || '').trim();
        if (!path) continue;
        const body = String((raw as any).body || '{}');
        const time = String((raw as any).time || new Date().toISOString());
        const key = `${method}\t${path}\t${body}`;
        if (seen.has(key)) continue;
        seen.add(key);
        normalized.push({ method, path, body, time });
      }
      const existing = apiTesterHistoryMemory.slice();
      const existingKeys = new Set(existing.map((h: any) => `${h.method}\t${h.path}\t${h.body}`));
      let added = 0;
      for (const item of normalized) {
        const key = `${item.method}\t${item.path}\t${item.body}`;
        if (existingKeys.has(key)) continue;
        existingKeys.add(key);
        existing.push(item);
        added += 1;
      }
      existing.sort((a, b) => String(b.time || '').localeCompare(String(a.time || '')));
      apiTesterHistoryMemory = existing.slice(0, 15);
      renderApiTesterHistory();
      setStatus(`履歴をインポートしました（追加 ${added} 件 / 合計 ${apiTesterHistoryMemory.length} 件）`);
    } catch (e: any) {
      showToast('履歴 JSON の読み込みに失敗: ' + (e?.message || String(e)), 'error');
    }
  }, { once: true });
  input.click();
}

export function saveApiTesterHistory(method: string, path: string, bodyStr: string) {
  let hist = apiTesterHistoryMemory.filter((h: any) => !(h.method === method && h.path === path && h.body === bodyStr));
  hist.unshift({ method, path, body: bodyStr, time: new Date().toISOString() });
  apiTesterHistoryMemory = hist.slice(0, 15);
  renderApiTesterHistory();
}

export function clearApiTesterHistory() {
  apiTesterHistoryMemory = [];
  renderApiTesterHistory();
}

export async function copyApiTesterCurl() {
  const doc = getToolDocument();
  const method = (doc.getElementById('u_apiTesterMethod') as HTMLInputElement | HTMLSelectElement | null)?.value || 'GET';
  const path = (doc.getElementById('u_apiTesterPath') as HTMLInputElement | null)?.value?.trim() || '';
  const body = (doc.getElementById('u_apiTesterBody') as HTMLTextAreaElement | null)?.value?.trim() || '{}';
  if (!path) {
    showToast('エンドポイントを指定してください', 'warn');
    return;
  }
  const escapedBody = body.replace(/'/g, "'\\''");
  const command = [
    'curl',
    '-X', method,
    `'${path}'`,
    '-H', "'Content-Type: application/json'",
    method === 'GET' ? '' : `--data '${escapedBody}'`
  ].filter(Boolean).join(' ');
  try {
    await navigator.clipboard.writeText(command);
    setStatus('APIリクエストのcurl例をコピーしました');
  } catch (e) {
    const resEl = doc.getElementById('u_apiTesterResult');
    if (resEl) resEl.innerHTML = `<pre style="margin:0;padding:10px;font-size:12px;white-space:pre-wrap">${esc(command)}</pre>`;
    setStatus('クリップボードへコピーできないため、結果欄にcurl例を表示しました', true);
  }
}

export function renderApiTesterHistory() {
  const listEl = getToolDocument().getElementById('u_apiTesterHistoryList');
  if (!listEl) return;
  try {
    const hist = apiTesterHistoryMemory.slice();
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
      let timeLabel = '';
      if (h.time) {
        try {
          const d = new Date(h.time);
          if (!isNaN(d.getTime())) {
            const hh = String(d.getHours()).padStart(2, '0');
            const mm = String(d.getMinutes()).padStart(2, '0');
            const ss = String(d.getSeconds()).padStart(2, '0');
            timeLabel = `${hh}:${mm}:${ss}`;
          }
        } catch (_) { /* ignore */ }
      }
      return `
        <div class="api-history-item" data-idx="${i}" role="button" tabindex="0"
          style="cursor:pointer;background:#fff;border:1px solid #e2e8f0;padding:6px 8px;border-radius:6px;transition:0.15s;display:flex;flex-direction:column;gap:4px;">
          <div style="display:flex;align-items:center;gap:6px;overflow:hidden;">
            <span style="font-size:9px;font-weight:800;background:${methodBg};color:${methodColor};padding:2px 4px;border-radius:4px;">${esc(h.method)}</span>
            <span style="font-size:11px;color:#0f172a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1;" title="${esc(h.path)}">${esc(h.path)}</span>
            ${timeLabel ? `<span style="font-size:9px;color:#94a3b8;flex-shrink:0;" title="${esc(h.time)}">${esc(timeLabel)}</span>` : ''}
            <button type="button" class="api-history-del" data-idx="${i}" title="この履歴を削除" aria-label="この履歴を削除" style="flex-shrink:0;background:transparent;border:none;color:#94a3b8;cursor:pointer;font-size:13px;line-height:1;padding:0 2px;">×</button>
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
      item.addEventListener('click', (event: Event) => {
        const target = event.target as HTMLElement | null;
        if (target?.classList?.contains('api-history-del')) return;
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
    listEl.querySelectorAll<HTMLElement>('.api-history-del').forEach((btn: HTMLElement) => {
      btn.addEventListener('click', (event: Event) => {
        event.stopPropagation();
        const idx = parseInt(btn.dataset.idx || '-1', 10);
        if (!(idx >= 0 && idx < apiTesterHistoryMemory.length)) return;
        apiTesterHistoryMemory.splice(idx, 1);
        renderApiTesterHistory();
        setStatus(`履歴を 1 件削除しました（残 ${apiTesterHistoryMemory.length} 件）`);
      });
    });
  } catch (e) {
    console.error('History load failed', e);
    listEl.innerHTML = '<div style="color:#ef4444;font-size:11px;">履歴読込エラー</div>';
  }
}
