'use strict';

import { SECTION_DEFS } from './constants.js';
import { normalize, deepClone, apiErrorWithContext } from './utils.js';

export function buildApiPrefix(guestId: string | number | null | undefined, preview: boolean): string {
  const g = String(guestId || '').trim();
  if (g) return `/k/guest/${g}/v1${preview ? '/preview' : ''}`;
  return `/k/v1${preview ? '/preview' : ''}`;
}

const DEPLOY_PATH_SNIPPET = 'app/deploy.json';

const ERR_NO_PROD_WRITE =
  '本番APIへの追加・更新・削除は無効です。プレビューAPIへの書き込みのみ可能です。本番への反映はkintone管理画面から手動でデプロイしてください。';
const ERR_NO_DEPLOY_API =
  'デプロイAPIの実行は無効です。本番への反映はkintone管理画面から手動でデプロイしてください。';
const ERR_NO_RECORD_PREVIEW_API =
  'レコードAPIにはプレビュー用の追加・更新・削除エンドポイントがありません。レコード操作は本番REST APIを明示的な確認付きで実行します。';
const ERR_NO_API_TESTER_RECORD_WRITE =
  'APIテスターではレコードの追加・更新・削除を実行できません。レコード管理タブの確認付き操作を使用してください。';
const DEFAULT_API_GET_RETRIES = 3;
const DEFAULT_RETRY_BASE_DELAY_MS = 500;
const DEFAULT_RETRY_MAX_DELAY_MS = 3000;
const RETRIABLE_STATUS_CODES: ReadonlySet<number> = new Set([408, 409, 425, 429, 500, 502, 503, 504]);
const RECORD_DATA_MUTATION_PATHS: ReadonlySet<string> = new Set([
  '/record.json',
  '/records.json',
  '/record/status.json',
  '/records/status.json'
]);
/**
 * cursor API はレコードを読み取るためのハンドルを作成・破棄するだけで、
 * アプリ設定にもレコード本体にも書き込まない。10,000 件超の取得（offset 上限回避）に
 * 必要なため、本番 prefix でも POST/DELETE を許可する。
 */
const RECORD_CURSOR_PATH = '/records/cursor.json';

export interface ApiPathMetric {
  calls: number;
  retries: number;
  failures: number;
  lastError: string;
}

export interface ApiGetMetrics {
  calls: number;
  retries: number;
  failures: number;
  lastLatencyMs: number;
  lastError: string;
  byPath: Record<string, ApiPathMetric>;
}

const apiGetMetrics: ApiGetMetrics = {
  calls: 0,
  retries: 0,
  failures: 0,
  lastLatencyMs: 0,
  lastError: '',
  byPath: {}
};

/** REST ベース URL がプレビュー用（/v1/preview を含む）か */
export function isPreviewRestPrefix(prefix: string | null | undefined): boolean {
  return String(prefix || '').includes('/v1/preview');
}

function normalizeApiResourcePath(path: string | null | undefined): string {
  const raw = String(path || '').replace(/\\/g, '/').split('?')[0];
  const match = raw.match(/\/k(?:\/guest\/[^/]+)?\/v1(?:\/preview)?(\/.*)$/);
  const resource = match ? match[1] : raw;
  return resource.startsWith('/') ? resource : `/${resource}`;
}

function isRecordDataMutationPath(path: string | null | undefined): boolean {
  return RECORD_DATA_MUTATION_PATHS.has(normalizeApiResourcePath(path));
}

/**
 * prefix + path への POST/PUT/DELETE を許可するか検査（GET は呼ばない想定）
 */
export function assertAllowsMutatingRestCall(prefix: string, path: string, method: string): void {
  const m = String(method || '').toUpperCase();
  if (m === 'GET' || m === 'HEAD' || m === 'OPTIONS') return;
  if (m !== 'POST' && m !== 'PUT' && m !== 'DELETE' && m !== 'PATCH') return;

  const rel = String(path || '').replace(/\\/g, '/');
  if (rel.includes(DEPLOY_PATH_SNIPPET)) {
    throw new Error(ERR_NO_DEPLOY_API);
  }
  if (normalizeApiResourcePath(rel) === RECORD_CURSOR_PATH && (m === 'POST' || m === 'DELETE')) {
    if (isPreviewRestPrefix(prefix)) throw new Error(ERR_NO_RECORD_PREVIEW_API);
    return;
  }
  if (isRecordDataMutationPath(rel)) {
    if (isPreviewRestPrefix(prefix)) throw new Error(ERR_NO_RECORD_PREVIEW_API);
    return;
  }
  if (!isPreviewRestPrefix(prefix)) {
    throw new Error(ERR_NO_PROD_WRITE);
  }
}

/**
 * kintone.api の完全パス（例: /k/v1/preview/app.json）用。APIテスター等。
 */
export function assertAllowsMutatingApiUrl(fullPath: string, method: string): void {
  const m = String(method || '').toUpperCase();
  if (m === 'GET' || m === 'HEAD' || m === 'OPTIONS') return;
  if (m !== 'POST' && m !== 'PUT' && m !== 'DELETE' && m !== 'PATCH') return;

  const fp = String(fullPath || '').replace(/\\/g, '/');
  if (fp.includes(DEPLOY_PATH_SNIPPET)) {
    throw new Error(ERR_NO_DEPLOY_API);
  }
  if (isRecordDataMutationPath(fp)) {
    if (/\/v1\/preview(\/|$)/.test(fp)) throw new Error(ERR_NO_RECORD_PREVIEW_API);
    throw new Error(ERR_NO_API_TESTER_RECORD_WRITE);
  }
  if (!/\/v1\/preview(\/|$)/.test(fp)) {
    throw new Error(ERR_NO_PROD_WRITE);
  }
}

export interface ApiGetOptions {
  retries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
}

function normalizeApiGetOptions(optionsOrRetries: ApiGetOptions | number | undefined | null): ApiGetOptions {
  if (typeof optionsOrRetries === 'number') return { retries: optionsOrRetries };
  if (!optionsOrRetries || typeof optionsOrRetries !== 'object') return {};
  return optionsOrRetries;
}

export function resolveHttpStatus(error: any): number {
  const direct = Number(error?.status ?? error?.statusCode ?? error?.response?.status);
  if (Number.isFinite(direct) && direct > 0) return direct;
  const text = String(error?.message || '');
  // Error messages often contain unrelated numeric values (field codes, limits,
  // record counts, etc.). Only accept a fallback status when the number is
  // explicitly labelled as an HTTP/status value.
  const matched = text.match(/\b(?:HTTP(?:\/\d+(?:\.\d+)?)?(?:\s+status(?:\s+code)?)?|status(?:\s+code)?)\s*(?::|=|-)?\s*([45]\d{2})\b/i);
  return matched ? Number(matched[1]) : 0;
}

export function isRetriableApiError(error: any): boolean {
  if (!error) return false;
  const status = resolveHttpStatus(error);
  if (RETRIABLE_STATUS_CODES.has(status)) return true;
  const code = String(error?.code || '').toUpperCase();
  if (code && (code.includes('NETWORK') || code.includes('TIMEOUT') || code === 'ECONNRESET')) return true;
  const message = String(error?.message || '').toLowerCase();
  return message.includes('network') || message.includes('timeout');
}

export function computeRetryDelayMs(attempt: number, baseDelayMs: number, maxDelayMs: number): number {
  const expDelay = Math.min(maxDelayMs, baseDelayMs * 2 ** attempt);
  const jitter = Math.random() * Math.min(200, baseDelayMs);
  return Math.round(expDelay + jitter);
}

/**
 * 書き込み系（POST/PUT/DELETE）のリトライ可否判定。
 * - 5xx / ネットワーク系エラーは方法に関わらずリトライ可。
 * - 4xx は副作用が確定している可能性があるため一律リトライ不可。
 * - PUT は冪等のため 408/429 もリトライ可（apiGet と同じ判定）。
 * - POST/DELETE は冪等でないため、4xx 全般を弾き、5xx/ネットワーク系のみリトライ可。
 */
export function isRetriableMutation(method: string, error: any): boolean {
  if (!error) return false;
  const m = String(method || '').toUpperCase();
  const status = resolveHttpStatus(error);
  if (status >= 400 && status < 500) {
    if (m === 'PUT' && (status === 408 || status === 429)) return true;
    return false;
  }
  if (status >= 500 && status < 600) return true;
  // status===0 または 5xx でないネットワーク/タイムアウト
  return isRetriableApiError(error);
}

function touchApiPathMetric(path: string, field: 'calls' | 'retries' | 'failures'): ApiPathMetric {
  const key = String(path || '');
  const row: ApiPathMetric = apiGetMetrics.byPath[key] || { calls: 0, retries: 0, failures: 0, lastError: '' };
  row[field] += 1;
  apiGetMetrics.byPath[key] = row;
  return row;
}

export function getApiGetMetrics(): ApiGetMetrics {
  return deepClone(apiGetMetrics);
}

export function resetApiGetMetrics(): void {
  apiGetMetrics.calls = 0;
  apiGetMetrics.retries = 0;
  apiGetMetrics.failures = 0;
  apiGetMetrics.lastLatencyMs = 0;
  apiGetMetrics.lastError = '';
  apiGetMetrics.byPath = {};
}

export async function apiGet(prefix: string, path: string, params: Record<string, unknown>, optionsOrRetries?: ApiGetOptions | number): Promise<any> {
  const options = normalizeApiGetOptions(optionsOrRetries);
  const retries = Number.isFinite(options.retries) ? Math.max(1, Number(options.retries)) : DEFAULT_API_GET_RETRIES;
  const baseDelayMs = Number.isFinite(options.baseDelayMs) ? Math.max(1, Number(options.baseDelayMs)) : DEFAULT_RETRY_BASE_DELAY_MS;
  const maxDelayMs = Number.isFinite(options.maxDelayMs) ? Math.max(baseDelayMs, Number(options.maxDelayMs)) : DEFAULT_RETRY_MAX_DELAY_MS;
  let err: any;
  const startAt = Date.now();
  apiGetMetrics.calls += 1;
  touchApiPathMetric(path, 'calls');
  for (let i = 0; i < retries; i++) {
    try {
      const res = await (kintone as any).api(`${prefix}${path}`, 'GET', params);
      apiGetMetrics.lastLatencyMs = Date.now() - startAt;
      apiGetMetrics.lastError = '';
      return res;
    } catch (e) {
      err = e;
      const retriable = isRetriableApiError(e);
      if (i < retries - 1 && retriable) {
        apiGetMetrics.retries += 1;
        touchApiPathMetric(path, 'retries');
        const waitMs = computeRetryDelayMs(i, baseDelayMs, maxDelayMs);
        await new Promise<void>((r) => setTimeout(r, waitMs));
        continue;
      }
      break;
    }
  }
  apiGetMetrics.failures += 1;
  const pathMetric = touchApiPathMetric(path, 'failures');
  const lastError = err?.message || String(err);
  pathMetric.lastError = lastError;
  apiGetMetrics.lastError = lastError;
  apiGetMetrics.lastLatencyMs = Date.now() - startAt;
  throw apiErrorWithContext(err, { method: 'GET', prefix, path, payload: params });
}

export async function apiPut(prefix: string, path: string, body: Record<string, unknown>): Promise<any> {
  assertAllowsMutatingRestCall(prefix, path, 'PUT');
  try {
    return await (kintone as any).api(`${prefix}${path}`, 'PUT', body);
  } catch (e) {
    throw apiErrorWithContext(e, { method: 'PUT', prefix, path, payload: body });
  }
}

export async function apiPost(prefix: string, path: string, body: Record<string, unknown>): Promise<any> {
  assertAllowsMutatingRestCall(prefix, path, 'POST');
  try {
    return await (kintone as any).api(`${prefix}${path}`, 'POST', body);
  } catch (e) {
    throw apiErrorWithContext(e, { method: 'POST', prefix, path, payload: body });
  }
}

export async function apiDelete(prefix: string, path: string, body: Record<string, unknown>): Promise<any> {
  assertAllowsMutatingRestCall(prefix, path, 'DELETE');
  try {
    return await (kintone as any).api(`${prefix}${path}`, 'DELETE', body);
  } catch (e) {
    throw apiErrorWithContext(e, { method: 'DELETE', prefix, path, payload: body });
  }
}

// ---------------------------------------------------------------------------
// revision 競合（楽観ロック）
// ---------------------------------------------------------------------------
// アプリ設定の PUT/POST に GET 時の revision を添えると、別の利用者が先に更新していた
// 場合 kintone が GAIA_CO02 で拒否する。黙って上書きせず、利用者へ再取得を促す。
// ---------------------------------------------------------------------------
const REVISION_CONFLICT_CODES: ReadonlySet<string> = new Set(['GAIA_CO02']);

export function isRevisionConflictError(error: any): boolean {
  if (!error) return false;
  const codes = [error?.code, error?.original?.code, error?.original?.error?.code]
    .map((c) => String(c || '').toUpperCase())
    .filter(Boolean);
  if (codes.some((c) => REVISION_CONFLICT_CODES.has(c))) return true;
  const text = String(error?.message || '');
  return /GAIA_CO02|リビジョン.*(最新|一致|異な)|revision.*(latest|mismatch|conflict)/i.test(text);
}

/** revision 競合なら利用者向けの説明を付けたエラーに、それ以外はそのまま返す。 */
export function decorateRevisionConflict(error: any, subject: string): any {
  if (!isRevisionConflictError(error)) return error;
  const base = error?.message != null ? String(error.message) : String(error);
  const wrapped = new Error(
    `${subject}は取得後に別の更新が入ったため中止しました（revision 競合）。最新の設定を取得し直してから再実行してください。\n${base}`
  ) as any;
  wrapped.revisionConflict = true;
  wrapped.original = error;
  if (error?.code) wrapped.code = error.code;
  return wrapped;
}

/** GET 応答の revision を文字列で取り出す（無ければ空文字）。 */
export function pickRevision(res: any): string {
  const value = res?.revision;
  if (value == null || value === '') return '';
  return String(value);
}

// ---------------------------------------------------------------------------
// レコード一括取得（$id シーク / cursor API）
// ---------------------------------------------------------------------------
export interface FetchRecordsByQueryOptions {
  fields?: string[];
  onProgress?: (fetched: number, mode: 'keyset' | 'cursor') => void;
}

export interface FetchRecordsByQueryResult {
  records: any[];
  /** 'keyset': $id シーク / 'cursor': cursor API（利用者クエリに order by がある場合） */
  mode: 'keyset' | 'cursor';
}

function throwIfPagingClause(query: string): void {
  if (/\blimit\s+\d+/i.test(query) || /\boffset\s+\d+/i.test(query)) {
    throw new Error('クエリ内の limit/offset はページング動作と競合します。limit/offset を取り除いて再実行してください。');
  }
}

/**
 * 条件に合うレコードを全件取得する。
 * - 利用者クエリに order by が無ければ `$id > lastId order by $id asc limit 500` でシークする（offset 上限なし）。
 * - order by がある場合は $id 順に並べ替えられないため cursor API を使う（offset 10,000 件上限を回避）。
 *   cursor は取得完了・失敗のどちらでも削除する。
 */
export async function fetchRecordsByQuery(
  prefix: string,
  app: string | number,
  query: string,
  options: FetchRecordsByQueryOptions = {}
): Promise<FetchRecordsByQueryResult> {
  const base = String(query || '').trim();
  throwIfPagingClause(base);
  const fields = Array.isArray(options.fields) && options.fields.length ? options.fields : undefined;
  const onProgress = typeof options.onProgress === 'function' ? options.onProgress : () => {};
  const useCursor = /\border\s+by\b/i.test(base);
  const limit = 500;

  if (!useCursor) {
    const all: any[] = [];
    let lastId = 0;
    while (true) {
      const cond = `$id > ${lastId}`;
      const q = base ? `(${base}) and ${cond} order by $id asc limit ${limit}` : `${cond} order by $id asc limit ${limit}`;
      const params: Record<string, unknown> = { app, query: q };
      if (fields) params.fields = fields.includes('$id') ? fields : [...fields, '$id'];
      const resp = await apiGet(prefix, '/records.json', params);
      const batch: any[] = Array.isArray(resp?.records) ? resp.records : [];
      if (!batch.length) break;
      all.push(...batch);
      onProgress(all.length, 'keyset');
      const nextId = Number(batch[batch.length - 1]?.$id?.value);
      if (!Number.isFinite(nextId) || nextId <= lastId) {
        throw new Error('レコードIDの取得順が想定と異なるため中断しました（$id を fields に含めてください）');
      }
      lastId = nextId;
      if (batch.length < limit) break;
    }
    return { records: all, mode: 'keyset' };
  }

  const createBody: Record<string, unknown> = { app, query: base, size: limit };
  if (fields) createBody.fields = fields;
  const created = await apiPost(prefix, '/records/cursor.json', createBody);
  const cursorId = String(created?.id || '');
  if (!cursorId) throw new Error('cursor の作成に失敗しました（id が返りません）');
  const all: any[] = [];
  let finished = false;
  try {
    while (true) {
      const resp = await apiGet(prefix, '/records/cursor.json', { id: cursorId });
      const batch: any[] = Array.isArray(resp?.records) ? resp.records : [];
      all.push(...batch);
      onProgress(all.length, 'cursor');
      if (!resp?.next) { finished = true; break; }
    }
  } finally {
    // 読み切ると kintone 側で自動削除されるが、途中失敗時は残るので明示的に片付ける。
    if (!finished) {
      try { await apiDelete(prefix, '/records/cursor.json', { id: cursorId }); } catch { /* noop */ }
    }
  }
  return { records: all, mode: 'cursor' };
}

export interface BundleMeta {
  sectionRevisions: Record<string, string>;
}

export interface Bundle {
  appId: string;
  guestId: string;
  preview: boolean;
  fetchedAt: string;
  meta: BundleMeta;
  sections: Record<string, any>;
  [key: string]: any;
}

export function sanitizeBundleMeta(meta: any): BundleMeta {
  const out: BundleMeta = { sectionRevisions: {} };
  const revisions = meta?.sectionRevisions;
  if (!revisions || typeof revisions !== 'object') return out;
  Object.keys(revisions).forEach((key) => {
    const value = revisions[key];
    if (value == null || value === '') return;
    out.sectionRevisions[key] = String(value);
  });
  return out;
}

export function extractSectionRevision(res: any): string {
  if (!res || typeof res !== 'object') return '';
  const candidates = [res.revision, res.appRevision, res.revisionNo, res.app?.revision];
  for (const value of candidates) {
    if (value == null || value === '') continue;
    return String(value);
  }
  return '';
}

export function ensureBundleShape(bundle: any): Bundle {
  if (!bundle || typeof bundle !== 'object') throw new Error('バンドル形式が不正です');
  if (!bundle.sections || typeof bundle.sections !== 'object') throw new Error('sections がありません');
  return {
    appId: String(bundle.appId || ''),
    guestId: String(bundle.guestId || ''),
    preview: !!bundle.preview,
    fetchedAt: bundle.fetchedAt || new Date().toISOString(),
    meta: sanitizeBundleMeta(bundle.meta),
    sections: normalize(bundle.sections)
  };
}

export function pickBundleSections(bundle: any, sections: readonly string[]): Bundle {
  const picked: Bundle = {
    appId: String(bundle.appId || ''),
    guestId: String(bundle.guestId || ''),
    preview: !!bundle.preview,
    fetchedAt: bundle.fetchedAt || new Date().toISOString(),
    meta: { sectionRevisions: {} },
    sections: {}
  };
  for (const sec of sections) {
    if (Object.prototype.hasOwnProperty.call(bundle.sections || {}, sec)) {
      picked.sections[sec] = deepClone(bundle.sections[sec]);
    } else {
      picked.sections[sec] = { _fetchError: 'bundleに該当セクションなし' };
    }
    const revision = bundle?.meta?.sectionRevisions?.[sec];
    if (revision != null && revision !== '') picked.meta.sectionRevisions[sec] = String(revision);
  }
  return picked;
}

export interface FetchBundleParams {
  appId: string | number;
  guestId?: string | number;
  preview: boolean;
  sections: readonly string[];
  onProgress?: (ratio: number, label: string) => void;
}

// ---------------------------------------------------------------------------
// JS/CSS / プラグイン用の補助フェッチ
// ---------------------------------------------------------------------------
// kintone.api はファイル本体（/k/v1/file.json）の取得を直接サポートしないため、
// fetch を使う。差分比較用なのでテキスト系（.js / .css / .json / .txt 等）の
// FILE 要素のみ本文取得する。サイズ上限を超えるものはスキップ。
// ---------------------------------------------------------------------------
const CUSTOMIZE_BODY_MAX_BYTES = 1 * 1024 * 1024; // 1 MB
export const CUSTOMIZE_BODY_FETCH_CONCURRENCY = 6;
const TEXT_LIKE_EXT = /\.(js|css|mjs|ts|jsx|tsx|json|txt|html|md)$/i;

function fnv1aHashString(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

export type TextFileBodyFetchResult =
  | { ok: true; text: string; byteSize: number }
  | { ok: false; reason: 'oversize' | 'http' | 'error'; detail: string; byteSize?: number; status?: number };

export async function fetchTextFileBody(prefix: string, fileKey: string): Promise<TextFileBodyFetchResult> {
  if (!fileKey) return { ok: false, reason: 'error', detail: 'fileKey がありません' };
  const url = `${prefix}/file.json?fileKey=${encodeURIComponent(fileKey)}`;
  const headers = { 'X-Requested-With': 'XMLHttpRequest' } as Record<string, string>;
  try {
    const resp = await fetch(url, { method: 'GET', headers });
    if (!resp.ok) {
      return {
        ok: false,
        reason: 'http',
        status: Number(resp.status || 0),
        detail: `HTTP ${resp.status || 'error'}`
      };
    }
    const contentLengthText = resp.headers?.get?.('content-length') || '';
    const contentLength = Number(contentLengthText);
    if (Number.isFinite(contentLength) && contentLength > CUSTOMIZE_BODY_MAX_BYTES) {
      return {
        ok: false,
        reason: 'oversize',
        byteSize: contentLength,
        detail: `本文サイズが上限 ${CUSTOMIZE_BODY_MAX_BYTES} bytes を超えています`
      };
    }
    const blob = await resp.blob();
    if (blob.size > CUSTOMIZE_BODY_MAX_BYTES) {
      return {
        ok: false,
        reason: 'oversize',
        byteSize: blob.size,
        detail: `本文サイズが上限 ${CUSTOMIZE_BODY_MAX_BYTES} bytes を超えています`
      };
    }
    return { ok: true, text: await blob.text(), byteSize: blob.size };
  } catch (error) {
    return {
      ok: false,
      reason: 'error',
      detail: error instanceof Error ? error.message : String(error)
    };
  }
}

async function fetchTextFileBodyWithRetry(prefix: string, fileKey: string): Promise<TextFileBodyFetchResult> {
  let result = await fetchTextFileBody(prefix, fileKey);
  if (result.ok === true) return result;
  if (result.reason === 'oversize') return result;
  // 補助取得は読み取り専用なので、一過性のHTTP/通信失敗だけを1回再試行する。
  result = await fetchTextFileBody(prefix, fileKey);
  return result;
}

async function runTaskFactoriesWithConcurrency(tasks: Array<() => Promise<void>>, concurrency: number): Promise<void> {
  if (!tasks.length) return;
  const limit = Math.max(1, Math.min(tasks.length, Math.floor(concurrency) || 1));
  let nextIndex = 0;
  await Promise.all(Array.from({ length: limit }, async () => {
    while (nextIndex < tasks.length) {
      const index = nextIndex++;
      await tasks[index]();
    }
  }));
}

interface CustomizeFetchFileIssue {
  fileName: string;
  fileKey: string;
  reason: 'missing-key' | 'unsupported' | 'oversize' | 'http' | 'error';
  detail: string;
  byteSize?: number;
}

interface CustomizeFetchStats {
  fetched: number;
  skipped: number;
  failed: number;
  skippedFiles: CustomizeFetchFileIssue[];
  failedFiles: CustomizeFetchFileIssue[];
}

export async function fetchCustomizeFileBodies(
  customizeSection: any,
  prefix: string
): Promise<CustomizeFetchStats> {
  const stats: CustomizeFetchStats = { fetched: 0, skipped: 0, failed: 0, skippedFiles: [], failedFiles: [] };
  if (!customizeSection || typeof customizeSection !== 'object') return stats;
  const tasks: Array<() => Promise<void>> = [];
  for (const platform of ['desktop', 'mobile']) {
    for (const kind of ['js', 'css']) {
      const arr = customizeSection?.[platform]?.[kind];
      if (!Array.isArray(arr)) continue;
      for (const item of arr) {
        if (!item || typeof item !== 'object' || item.type !== 'FILE') continue;
        const fileKey = item?.file?.fileKey;
        const fileName = String(item?.file?.name || '');
        if (!fileKey) {
          item._bodyUnavailable = 'missing-key';
          stats.skipped += 1;
          stats.skippedFiles.push({ fileName, fileKey: '', reason: 'missing-key', detail: 'fileKey がありません' });
          continue;
        }
        if (fileName && !TEXT_LIKE_EXT.test(fileName)) {
          item._bodyUnavailable = 'unsupported';
          stats.skipped += 1;
          stats.skippedFiles.push({ fileName, fileKey, reason: 'unsupported', detail: 'テキスト形式ではないため本文比較を省略しました' });
          continue;
        }
        tasks.push(async () => {
          const result = await fetchTextFileBodyWithRetry(prefix, fileKey);
          if (result.ok === false) {
            item._bodyUnavailable = result.reason;
            const issue: CustomizeFetchFileIssue = {
              fileName,
              fileKey,
              reason: result.reason,
              detail: result.detail,
              ...(result.byteSize === undefined ? {} : { byteSize: result.byteSize })
            };
            if (result.reason === 'oversize') {
              stats.skipped += 1;
              stats.skippedFiles.push(issue);
            } else {
              stats.failed += 1;
              stats.failedFiles.push(issue);
            }
            return;
          }
          item._bodyText = result.text;
          item._bodyHash = fnv1aHashString(result.text);
          stats.fetched += 1;
        });
      }
    }
  }
  await runTaskFactoriesWithConcurrency(tasks, CUSTOMIZE_BODY_FETCH_CONCURRENCY);
  return stats;
}

export interface PluginConfigFetchStats {
  fetched: number;
  skipped: number;
  failed: number;
}

function setAuxiliaryFetchError(
  section: any,
  label: string,
  failed: number,
  error?: unknown,
  files: CustomizeFetchFileIssue[] = []
): void {
  if (!section || typeof section !== 'object') return;
  const countText = failed > 0 ? `（${failed}件）` : '';
  const detail = error instanceof Error
    ? error.message
    : (error == null ? '' : String(error));
  const fileText = files.length
    ? ` [${files.slice(0, 3).map((item) => item.fileName || item.fileKey || '(名称不明)').join(', ')}${files.length > 3 ? ', …' : ''}]`
    : '';
  section._fetchError = `${label}の取得に失敗したため、このセクションは比較できません${countText}${fileText}${detail ? `: ${detail}` : ''}`;
}

export async function fetchPluginConfigs(
  pluginSection: any,
  prefix: string,
  appId: string | number
): Promise<PluginConfigFetchStats> {
  const stats: PluginConfigFetchStats = { fetched: 0, skipped: 0, failed: 0 };
  if (!pluginSection || typeof pluginSection !== 'object') return stats;
  const plugins = Array.isArray(pluginSection.plugins) ? pluginSection.plugins : [];
  if (!plugins.length) return stats;
  const tasks: Array<() => Promise<void>> = [];
  for (const plugin of plugins) {
    if (!plugin || typeof plugin !== 'object') continue;
    const id = String(plugin.id || '').trim();
    if (!id) { stats.skipped += 1; continue; }
    tasks.push(async () => {
      try {
        const res = await apiGet(prefix, '/app/plugin/config.json', { app: appId, id }, 1);
        if (res && typeof res === 'object') {
          plugin._config = res?.config != null ? res.config : res;
          stats.fetched += 1;
        } else {
          stats.skipped += 1;
        }
      } catch {
        stats.failed += 1;
      }
    });
  }
  await runTaskFactoriesWithConcurrency(tasks, CUSTOMIZE_BODY_FETCH_CONCURRENCY);
  return stats;
}

export async function fetchBundle({ appId, guestId, preview, sections, onProgress }: FetchBundleParams): Promise<Bundle> {
  const app = String(appId || '').trim();
  if (!app) throw new Error('アプリIDが必要です');

  const bundle: Bundle = {
    appId: app,
    guestId: String(guestId || '').trim(),
    preview: !!preview,
    fetchedAt: new Date().toISOString(),
    meta: { sectionRevisions: {} },
    sections: {}
  };

  for (let i = 0; i < sections.length; i++) {
    const sec = sections[i];
    const def = SECTION_DEFS.find((x) => x.key === sec);
    if (!def) continue;
    try {
      const sectionPreview = def.previewEndpoint === false ? false : preview;
      const prefix = buildApiPrefix(guestId, sectionPreview);
      const params: Record<string, unknown> = typeof def.paramBuilder === 'function' ? def.paramBuilder(app) : { app };
      const res = await apiGet(prefix, def.endpoint, params);
      const revision = extractSectionRevision(res);
      if (revision) bundle.meta.sectionRevisions[sec] = revision;
      bundle.sections[sec] = normalize(res);
    } catch (e: any) {
      bundle.sections[sec] = { _fetchError: e?.message || String(e) };
    }
    if (onProgress) onProgress((i + 1) / sections.length, def.label);
  }
  // 差分比較精度向上のための補助取得。
  // 一部だけ取得できた値を通常差分として扱うと「設定追加/削除」の偽差分になるため、
  // 1 件でも失敗したセクションは既存の _fetchError 契約で比較不能として扱う。
  // 取得件数の内部統計はセクション本体へ混ぜず、設定差分のノイズにしない。
  if (sections.includes('customizeSettings')) {
    const cust = bundle.sections.customizeSettings;
    if (cust && !cust._fetchError) {
      try {
        // ファイル本体 API には preview endpoint がないため、設定の取得元に関わらず通常 prefix を使う。
        const prefix = buildApiPrefix(guestId, false);
        const stats = await fetchCustomizeFileBodies(cust, prefix);
        if (stats.skippedFiles.length) {
          cust._partial = {
            kind: 'customizeBody',
            message: '一部ファイルは本文比較を省略し、fileKey で比較します',
            files: stats.skippedFiles
          };
        }
        if (stats.failed > 0) {
          setAuxiliaryFetchError(cust, 'JS/CSSファイル本文', stats.failed, undefined, stats.failedFiles);
        }
      } catch (e) {
        setAuxiliaryFetchError(cust, 'JS/CSSファイル本文', 0, e);
      }
    }
  }
  if (sections.includes('pluginSettings')) {
    const plug = bundle.sections.pluginSettings;
    if (plug && !plug._fetchError) {
      try {
        // プラグイン設定 API は本番/preview の両方を持つため、選択環境と揃える。
        const prefix = buildApiPrefix(guestId, preview);
        const stats = await fetchPluginConfigs(plug, prefix, app);
        // ID欠落や不正な応答で skipped になった場合も設定内容は揃っていないため、
        // 差分なしと誤判定せずセクション全体を比較未完了として扱う。
        const unavailable = stats.failed + stats.skipped;
        if (unavailable > 0) setAuxiliaryFetchError(plug, 'プラグイン設定', unavailable);
      } catch (e) {
        setAuxiliaryFetchError(plug, 'プラグイン設定', 0, e);
      }
    }
  }
  return bundle;
}

export interface SpaceAppInfo {
  appId: string;
  name: string;
  spaceId: string;
}

/**
 * 指定スペースに属する全アプリを取得する（ページング対応）。
 * kintone の `/apps.json` に `spaceIds` を渡してスペース絞り込みする。
 */
export async function fetchAppsInSpace(
  spaceId: string | number,
  guestId?: string | number
): Promise<SpaceAppInfo[]> {
  const sid = String(spaceId || '').trim();
  if (!/^\d+$/.test(sid)) throw new Error('スペースIDは数値で入力してください');
  const prefix = buildApiPrefix(guestId, false);
  const apps: SpaceAppInfo[] = [];
  const seen = new Set<string>();
  const limit = 100;
  for (let offset = 0; ; offset += limit) {
    const resp = await apiGet(prefix, '/apps.json', { spaceIds: [sid], limit, offset });
    const chunk = Array.isArray(resp?.apps) ? resp.apps : [];
    for (const a of chunk) {
      const appId = String(a?.appId || '').trim();
      if (!/^\d+$/.test(appId) || seen.has(appId)) continue;
      seen.add(appId);
      apps.push({ appId, name: String(a?.name || ''), spaceId: String(a?.spaceId || sid) });
    }
    if (chunk.length < limit) break;
  }
  apps.sort((a, b) => Number(a.appId) - Number(b.appId));
  return apps;
}

export function resolveBundleRevision(bundle: any): string {
  const revisions = bundle?.meta?.sectionRevisions || {};
  for (const key of ['appSettings', 'fieldSettings', 'layoutSettings', 'viewSettings', 'processSettings']) {
    const revision = revisions[key];
    if (revision != null && revision !== '') return String(revision);
  }
  const first = Object.values(revisions).find((value) => value != null && value !== '');
  return first != null ? String(first) : '';
}
