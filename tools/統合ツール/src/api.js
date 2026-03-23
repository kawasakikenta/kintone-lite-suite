'use strict';

import { SECTION_DEFS } from './constants.js';
import { normalize, deepClone, apiErrorWithContext } from './utils.js';
import { state } from './state.js';

export function buildApiPrefix(guestId, preview) {
  const g = String(guestId || '').trim();
  if (g) return `/k/guest/${g}/v1${preview ? '/preview' : ''}`;
  return `/k/v1${preview ? '/preview' : ''}`;
}

export async function apiGet(prefix, path, params, retries = 3) {
  let err;
  for (let i = 0; i < retries; i++) {
    try {
      return await kintone.api(`${prefix}${path}`, 'GET', params);
    } catch (e) {
      err = e;
      if (i < retries - 1) await new Promise((r) => setTimeout(r, (i + 1) * 700));
    }
  }
  throw apiErrorWithContext(err, { method: 'GET', prefix, path, payload: params });
}

export async function apiPut(prefix, path, body) {
  try {
    return await kintone.api(`${prefix}${path}`, 'PUT', body);
  } catch (e) {
    throw apiErrorWithContext(e, { method: 'PUT', prefix, path, payload: body });
  }
}

export async function apiPost(prefix, path, body) {
  try {
    return await kintone.api(`${prefix}${path}`, 'POST', body);
  } catch (e) {
    throw apiErrorWithContext(e, { method: 'POST', prefix, path, payload: body });
  }
}

export function sanitizeBundleMeta(meta) {
  const out = { sectionRevisions: {} };
  const revisions = meta?.sectionRevisions;
  if (!revisions || typeof revisions !== 'object') return out;
  Object.keys(revisions).forEach((key) => {
    const value = revisions[key];
    if (value == null || value === '') return;
    out.sectionRevisions[key] = String(value);
  });
  return out;
}

export function extractSectionRevision(res) {
  if (!res || typeof res !== 'object') return '';
  const candidates = [res.revision, res.appRevision, res.revisionNo, res.app?.revision];
  for (const value of candidates) {
    if (value == null || value === '') continue;
    return String(value);
  }
  return '';
}

export function ensureBundleShape(bundle) {
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

export function pickBundleSections(bundle, sections) {
  const picked = {
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

export async function fetchBundle({ appId, guestId, preview, sections, onProgress }) {
  const prefix = buildApiPrefix(guestId, preview);
  const app = String(appId || '').trim();
  if (!app) throw new Error('アプリIDが必要です');

  const bundle = {
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
      const res = await apiGet(prefix, def.endpoint, { app });
      const revision = extractSectionRevision(res);
      if (revision) bundle.meta.sectionRevisions[sec] = revision;
      bundle.sections[sec] = normalize(res);
    } catch (e) {
      bundle.sections[sec] = { _fetchError: e.message || String(e) };
    }
    if (onProgress) onProgress((i + 1) / sections.length, def.label);
  }
  return bundle;
}

export function bundleMatchesParams(bundle, params) {
  if (!bundle || !params) return false;
  return (
    String(bundle.appId || '') === String(params.appId || '').trim()
    && String(bundle.guestId || '') === String(params.guestId || '').trim()
    && !!bundle.preview === !!params.preview
  );
}

export function bundleHasSections(bundle, sections) {
  if (!bundle || !bundle.sections) return false;
  return (sections || []).every((sec) => Object.prototype.hasOwnProperty.call(bundle.sections, sec));
}

export async function resolveBundle(side, params, sections, onProgress, { skipImported = false } = {}) {
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

export function resolveBundleRevision(bundle) {
  const revisions = bundle?.meta?.sectionRevisions || {};
  for (const key of ['appSettings', 'fieldSettings', 'layoutSettings', 'viewSettings', 'processSettings']) {
    const revision = revisions[key];
    if (revision != null && revision !== '') return String(revision);
  }
  const first = Object.values(revisions).find((value) => value != null && value !== '');
  return first != null ? String(first) : '';
}
