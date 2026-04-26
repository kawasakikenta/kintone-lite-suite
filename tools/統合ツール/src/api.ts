'use strict';

import { SECTION_DEFS } from './constants.js';
import { normalize, deepClone, apiErrorWithContext } from './utils.js';
import { state } from './state.js';

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
const DEFAULT_API_GET_RETRIES = 3;
const DEFAULT_RETRY_BASE_DELAY_MS = 500;
const DEFAULT_RETRY_MAX_DELAY_MS = 3000;
const RETRIABLE_STATUS_CODES: ReadonlySet<number> = new Set([408, 409, 425, 429, 500, 502, 503, 504]);

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

function resolveHttpStatus(error: any): number {
  const direct = Number(error?.status ?? error?.statusCode ?? error?.response?.status);
  if (Number.isFinite(direct) && direct > 0) return direct;
  const text = String(error?.message || '');
  const matched = text.match(/\b([45]\d{2})\b/);
  return matched ? Number(matched[1]) : 0;
}

function isRetriableApiError(error: any): boolean {
  if (!error) return false;
  const status = resolveHttpStatus(error);
  if (RETRIABLE_STATUS_CODES.has(status)) return true;
  const code = String(error?.code || '').toUpperCase();
  if (code && (code.includes('NETWORK') || code.includes('TIMEOUT') || code === 'ECONNRESET')) return true;
  const message = String(error?.message || '').toLowerCase();
  return message.includes('network') || message.includes('timeout');
}

function computeRetryDelayMs(attempt: number, baseDelayMs: number, maxDelayMs: number): number {
  const expDelay = Math.min(maxDelayMs, baseDelayMs * 2 ** attempt);
  const jitter = Math.random() * Math.min(200, baseDelayMs);
  return Math.round(expDelay + jitter);
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
  return bundle;
}

export interface BundleMatchParams {
  appId?: string | number;
  guestId?: string | number;
  preview?: boolean;
}

export function bundleMatchesParams(bundle: any, params: BundleMatchParams | null | undefined): boolean {
  if (!bundle || !params) return false;
  return (
    String(bundle.appId || '') === String(params.appId || '').trim()
    && String(bundle.guestId || '') === String(params.guestId || '').trim()
    && !!bundle.preview === !!params.preview
  );
}

export function bundleHasSections(bundle: any, sections: readonly string[] | null | undefined): boolean {
  if (!bundle || !bundle.sections) return false;
  return (sections || []).every((sec) => Object.prototype.hasOwnProperty.call(bundle.sections, sec));
}

export interface ResolveBundleOptions {
  skipImported?: boolean;
}

export async function resolveBundle(
  side: 'source' | 'target',
  params: BundleMatchParams & { appId: string | number; preview: boolean },
  sections: readonly string[],
  onProgress?: (ratio: number, label: string) => void,
  options: ResolveBundleOptions = {}
): Promise<Bundle> {
  const { skipImported = false } = options;
  if (!skipImported) {
    if (side === 'source' && state.importedSourceBundle) return pickBundleSections(state.importedSourceBundle, sections);
    if (side === 'target' && state.importedTargetBundle) return pickBundleSections(state.importedTargetBundle, sections);
  }
  const cached = side === 'source' ? state.lastSourceBundle : state.lastTargetBundle;
  if (skipImported && cached === (side === 'target' ? state.importedTargetBundle : state.importedSourceBundle)) {
    // skip imported cache
  } else if (bundleMatchesParams(cached, params) && bundleHasSections(cached, sections)) {
    if (onProgress) onProgress(1, 'キャッシュ');
    return pickBundleSections(cached, sections);
  }
  return fetchBundle({ ...params, sections, onProgress });
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
