'use strict';

import { SECTION_DEFS, HIGH_IMPACT_SECTIONS } from '../constants.js';
import {
  deepClone,
  stableStringify,
  esc,
  normalize,
  downloadText,
  buildExportFilename,
  buildAppFilenameLabel,
  renderSectionIconHtml
} from '../utils.js';
import { state, ui } from '../state.js';
import { getToolDocument } from '../ui/dialog.js';
import { bumpSessionMetric } from '../ui/psychology.js';
import { isReflectNodeModeEffective } from './nodeModeUi.js';
import { apiGet, apiPost, apiPut, buildApiPrefix, extractSectionRevision } from '../api.js';
import {
  filterWritableFieldProps,
  convertLookupAppIds,
  sortRowsForPatch,
  applyDiffRowToSection,
  extractFieldCodeFromRowPath
} from './apply.js';
import { reflectRowModeById } from './rowMode.js';
import {
  commonParams,
  setStatus,
  selectedScopeKeys,
  parseLookupMapInput,
  getSelectedReflectRows,
  getEffectiveReflectScopeInfo,
  ensureDiffPreparedForReflect,
  resolveApplyScopes,
  saveCurrentDialogState,
  getSourceBundleForApply,
  loadReflectRowsFromLastDiff,
  renderReflectAssistPanel,
  renderReflectMainPanel
} from './helpers.js';

/**
 * 現状の差分・選択・接続情報からプラン署名を計算する。
 * `state.lastApplyPlan.signature` と一致しなければプランは古い。
 * Section/Node どちらのモードでも対応する。
 * 計算不能な状況（接続未設定など）では '' を返す。
 */
function computeCurrentReflectPlanSignature(): string {
  try {
    const c = commonParams();
    if (!c?.target?.appId) return '';
    if (isReflectNodeModeEffective()) {
      const rows = getSelectedReflectRows();
      if (!rows.length) return '';
      const nodeSigRows = rows
        .map((r) => ({ id: r._id, sectionKey: r.sectionKey, mode: reflectRowModeById(r._id), type: r.type, path: r.path }))
        .sort((a, b) => String(a.id).localeCompare(String(b.id)));
      return makeApplyPlanSignature('nodes', {
        targetApp: c.target.appId,
        targetGuest: c.target.guestId,
        sourceApp: c.source.appId,
        sourceGuest: c.source.guestId,
        nodes: nodeSigRows,
        lookupMap: ui.lookupMap.value.trim()
      });
    }
    const baseScopes = selectedScopeKeys(ui.applyScopes);
    if (!baseScopes.length) return '';
    const scopes = resolveApplyScopes(baseScopes);
    return makeApplyPlanSignature('section', {
      targetApp: c.target.appId,
      targetGuest: c.target.guestId,
      sourceApp: c.source.appId,
      sourceGuest: c.source.guestId,
      scopes,
      lookupMap: ui.lookupMap.value.trim()
    });
  } catch {
    return '';
  }
}

export function renderAppIdConfirmSection(appIdRefs) {
  if (!appIdRefs || !appIdRefs.length) return '<div style="color:#64748b;font-size:12px;margin-bottom:8px">関連アプリIDなし</div>';
  const rows = appIdRefs.map((r) =>
    `<tr><td style="padding:3px 8px;font-size:11px">${esc(r.fieldCode)}</td>` +
    `<td style="padding:3px 8px;font-size:11px">${esc(r.type)}</td>` +
    `<td style="padding:3px 8px;font-size:11px;font-weight:700">${esc(r.refAppId)}</td>` +
    `<td style="padding:3px 8px;font-size:11px;color:${r.convertedAppId ? '#2563eb' : '#94a3b8'}">${r.convertedAppId ? `→ ${esc(r.convertedAppId)}` : '-'}</td>` +
    `<td style="padding:3px 8px;font-size:11px">${esc(r.section)}</td></tr>`
  ).join('');
  return `<div style="margin-bottom:10px">
    <div style="font-weight:600;font-size:12px;margin-bottom:4px;color:#dc2626">関連アプリID一覧 (${appIdRefs.length}件)</div>
    <div style="max-height:160px;overflow:auto;border:1px solid #e2e8f0;border-radius:6px">
      <table style="width:100%;border-collapse:collapse;font-size:11px">
        <thead><tr style="background:#f1f5f9">
          <th style="padding:4px 8px;text-align:left">フィールド</th>
          <th style="padding:4px 8px;text-align:left">種別</th>
          <th style="padding:4px 8px;text-align:left">参照先アプリID</th>
          <th style="padding:4px 8px;text-align:left">変換後</th>
          <th style="padding:4px 8px;text-align:left">セクション</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  </div>`;
}

export function splitUpsertMap(currentMap, incomingMap, options) {
  const overwrite = !!(options && options.overwrite);
  const renameOnConflict = !!(options && options.renameOnConflict);
  const codeField = (options && options.codeField) || 'code';
  const add: Record<string, any> = {};
  const update: Record<string, any> = {};
  const logs: string[] = [];
  const used = new Set(Object.keys(currentMap || ({} as any)));

  for (const [rawKey, rawDef] of Object.entries(incomingMap || ({} as any) as Array<[string, any]>)) {
    const key = String(rawKey);
    const def = deepClone(rawDef || ({} as any));
    if (!def[codeField]) def[codeField] = key;

    if (!used.has(key)) {
      add[key] = def;
      used.add(key);
      logs.push(`ADD ${key}`);
      continue;
    }

    if (overwrite) {
      update[key] = def;
      logs.push(`UPDATE ${key}`);
      continue;
    }

    if (renameOnConflict) {
      let n = 2;
      let next = `${key}_${n}`;
      while (used.has(next)) {
        n += 1;
        next = `${key}_${n}`;
      }
      def[codeField] = next;
      add[next] = def;
      used.add(next);
      logs.push(`RENAME ${key} -> ${next}`);
    } else {
      logs.push(`SKIP ${key} (already exists)`);
    }
  }
  return { add, update, logs };
}

export async function upsertFields(prefix, app, incomingProps, options) {
  const writableIncoming = filterWritableFieldProps(incomingProps, options && options.skipSystem);
  const lookupMap = (options && options.lookupMap) || ({} as any);
  const convertedIncoming: Record<string, any> = {};
  for (const [code, def] of Object.entries(writableIncoming || ({} as any) as Array<[string, any]>)) {
    const converted = convertLookupAppIds(def, lookupMap);
    convertedIncoming[code] = converted.def;
  }
  const current = await apiGet(prefix, '/app/form/fields.json', { app });
  const split = splitUpsertMap(current.properties || ({} as any), convertedIncoming || ({} as any), {
    overwrite: options && options.overwrite,
    renameOnConflict: options && options.renameOnConflict,
    codeField: 'code'
  });

  if (Object.keys(split.add).length) await apiPost(prefix, '/app/form/fields.json', { app, properties: split.add });
  if (Object.keys(split.update).length) await apiPut(prefix, '/app/form/fields.json', { app, properties: split.update });
  return split.logs;
}

export function splitMapSectionDiff(beforeMap, afterMap) {
  const before = (beforeMap && typeof beforeMap === 'object' && !Array.isArray(beforeMap)) ? beforeMap : {};
  const after = (afterMap && typeof afterMap === 'object' && !Array.isArray(afterMap)) ? afterMap : {};
  const add: Record<string, any> = {};
  const update: Record<string, any> = {};
  const del: string[] = [];
  for (const [k, v] of Object.entries(after) as Array<[string, any]>) {
    if (!Object.prototype.hasOwnProperty.call(before, k)) {
      add[k] = deepClone(v);
    } else if (stableStringify(before[k]) !== stableStringify(v)) {
      update[k] = deepClone(v);
    }
  }
  for (const k of Object.keys(before)) {
    if (!Object.prototype.hasOwnProperty.call(after, k)) del.push(k);
  }
  return { add, update, del };
}

const PREVIEW_MAX_ENTRIES = 40;
const PREVIEW_SNIPPET_MAX = 600;

function truncateForPreview(value) {
  try {
    const json = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
    if (json == null) return '';
    return json.length > PREVIEW_SNIPPET_MAX
      ? `${json.slice(0, PREVIEW_SNIPPET_MAX)}\n… （省略: 全${json.length}文字）`
      : json;
  } catch (e) {
    return String(value);
  }
}

export function buildMapSectionPreview(beforeMap: any, afterMap: any, options: { maxEntries?: number } = {}) {
  const before = (beforeMap && typeof beforeMap === 'object' && !Array.isArray(beforeMap)) ? beforeMap : {};
  const after = (afterMap && typeof afterMap === 'object' && !Array.isArray(afterMap)) ? afterMap : {};
  const added: any[] = [];
  const updated: any[] = [];
  const removed: any[] = [];
  for (const [k, v] of Object.entries(after) as Array<[string, any]>) {
    if (!Object.prototype.hasOwnProperty.call(before, k)) {
      added.push({ key: k, after: truncateForPreview(v) });
    } else if (stableStringify(before[k]) !== stableStringify(v)) {
      updated.push({ key: k, before: truncateForPreview(before[k]), after: truncateForPreview(v) });
    }
  }
  for (const k of Object.keys(before)) {
    if (!Object.prototype.hasOwnProperty.call(after, k)) {
      removed.push({ key: k, before: truncateForPreview(before[k]) });
    }
  }
  const totalKey = added.length + updated.length + removed.length;
  const cap = (options.maxEntries ?? PREVIEW_MAX_ENTRIES);
  return {
    addedKeys: added.slice(0, cap),
    updatedKeys: updated.slice(0, cap),
    removedKeys: removed.slice(0, cap),
    addedCount: added.length,
    updatedCount: updated.length,
    removedCount: removed.length,
    totalCount: totalKey,
    truncated: totalKey > cap
  };
}

export function buildWholeSectionPreview(before, after) {
  const beforeText = truncateForPreview(before);
  const afterText = truncateForPreview(after);
  const changed = stableStringify(before) !== stableStringify(after);
  return { beforeText, afterText, changed };
}

// 大量差分時にPUT/POST/DELETEがエラーになりやすいため、安全側のチャンクサイズで分割する
export const APPLY_REQUEST_CHUNK_SIZE = 100;

function chunkObjectEntries(obj, size = APPLY_REQUEST_CHUNK_SIZE) {
  const entries = Object.entries(obj || ({} as any));
  if (entries.length <= size) return entries.length ? [Object.fromEntries(entries)] : [];
  const out: any[] = [];
  for (let i = 0; i < entries.length; i += size) {
    out.push(Object.fromEntries(entries.slice(i, i + size)));
  }
  return out;
}

function chunkArray(arr, size = APPLY_REQUEST_CHUNK_SIZE) {
  const list = Array.isArray(arr) ? arr : [];
  if (list.length <= size) return list.length ? [list] : [];
  const out: any[] = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

function pushChunkedMapRequests(requests, { method, path, app, key, map, label }) {
  const chunks = chunkObjectEntries(map);
  if (!chunks.length) return;
  const total = Object.keys(map).length;
  chunks.forEach((chunk, idx) => {
    const partLabel = chunks.length > 1 ? ` ${idx + 1}/${chunks.length}` : '';
    requests.push({
      method,
      path,
      body: { app, [key]: chunk },
      note: `${label}:${Object.keys(chunk).length}${partLabel} (合計 ${total})`
    });
  });
}

function pushChunkedArrayRequests(requests, { method, path, app, key, list, label }) {
  const chunks = chunkArray(list);
  if (!chunks.length) return;
  const total = list.length;
  chunks.forEach((chunk, idx) => {
    const partLabel = chunks.length > 1 ? ` ${idx + 1}/${chunks.length}` : '';
    requests.push({
      method,
      path,
      body: { app, [key]: chunk },
      note: `${label}:${chunk.length}${partLabel} (合計 ${total})`
    });
  });
}

export function planFieldSectionDiffRequests(app: any, beforeProps: any, afterProps: any, lookupMap: any, sourceModeCodes?: Set<string> | null) {
  const beforeMap = filterWritableFieldProps(beforeProps, true);
  const afterMap = filterWritableFieldProps(afterProps, true);
  const add: Record<string, any> = {};
  const update: Record<string, any> = {};
  const del: string[] = [];
  let lookupChanged = 0;

  for (const [code, def] of Object.entries(afterMap || ({} as any) as Array<[string, any]>)) {
    const shouldConvert = !sourceModeCodes || sourceModeCodes.has(code);
    const converted = shouldConvert ? convertLookupAppIds(def, lookupMap) : { def: deepClone(def), changed: false };
    if (converted.changed) lookupChanged += 1;
    const outDef = converted.def;
    if (!beforeMap || !beforeMap[code]) {
      add[code] = outDef;
    } else if (stableStringify(beforeMap[code]) !== stableStringify(outDef)) {
      update[code] = outDef;
    }
  }
  for (const code of Object.keys(beforeMap || ({} as any))) {
    if (!Object.prototype.hasOwnProperty.call(afterMap || ({} as any), code)) del.push(code);
  }

  const requests: any[] = [];
  pushChunkedMapRequests(requests, { method: 'POST', path: '/app/form/fields.json', app, key: 'properties', map: add, label: 'fields add' });
  pushChunkedMapRequests(requests, { method: 'PUT', path: '/app/form/fields.json', app, key: 'properties', map: update, label: 'fields update' });
  pushChunkedArrayRequests(requests, { method: 'DELETE', path: '/app/form/fields.json', app, key: 'fields', list: del, label: 'fields delete' });
  const preview: any = buildMapSectionPreview(beforeMap, { ...add, ...update });
  preview.removedKeys = del.slice(0, PREVIEW_MAX_ENTRIES).map((key) => ({ key, before: truncateForPreview(beforeMap[key]) }));
  preview.removedCount = del.length;
  preview.totalCount = preview.addedCount + preview.updatedCount + preview.removedCount;
  return { requests, addCount: Object.keys(add).length, updateCount: Object.keys(update).length, deleteCount: del.length, lookupChanged, preview };
}

export function planViewsSectionDiffRequests(app: any, beforeViews: any, afterViews: any) {
  const split = splitMapSectionDiff(beforeViews, afterViews);
  const up = { ...split.add, ...split.update };
  const requests: any[] = [];
  pushChunkedMapRequests(requests, { method: 'PUT', path: '/app/views.json', app, key: 'views', map: up, label: 'views upsert' });
  const preview = buildMapSectionPreview(beforeViews, afterViews);
  return { requests, upsertCount: Object.keys(up).length, deleteSkipCount: split.del.length, preview };
}

export function planReportsSectionDiffRequests(app: any, beforeReports: any, afterReports: any) {
  const split = splitMapSectionDiff(beforeReports, afterReports);
  const up = { ...split.add, ...split.update };
  const requests: any[] = [];
  pushChunkedMapRequests(requests, { method: 'PUT', path: '/app/reports.json', app, key: 'reports', map: up, label: 'reports upsert' });
  pushChunkedArrayRequests(requests, { method: 'DELETE', path: '/app/reports.json', app, key: 'reports', list: split.del, label: 'reports delete' });
  const preview = buildMapSectionPreview(beforeReports, afterReports);
  return { requests, upsertCount: Object.keys(up).length, deleteCount: split.del.length, preview };
}

export function planActionsSectionDiffRequests(app: any, beforeActions: any, afterActions: any) {
  const split = splitMapSectionDiff(beforeActions, afterActions);
  const up = { ...split.add, ...split.update };
  const requests: any[] = [];
  pushChunkedMapRequests(requests, { method: 'PUT', path: '/app/actions.json', app, key: 'actions', map: up, label: 'actions upsert' });
  const preview = buildMapSectionPreview(beforeActions, afterActions);
  return { requests, upsertCount: Object.keys(up).length, deleteSkipCount: split.del.length, preview };
}

export function appendRequestPlanLogs(logs, plan) {
  const reqs = plan?.requests || [];
  for (const req of reqs) {
    logs.push(`  - PLAN ${req.method} ${req.path}${req.note ? ` (${req.note})` : ''}`);
  }
}

export function makeApplyPlanSignature(mode, payload) {
  return stableStringify({
    mode,
    targetApp: payload?.targetApp || '',
    targetGuest: payload?.targetGuest || '',
    sourceApp: payload?.sourceApp || '',
    sourceGuest: payload?.sourceGuest || '',
    scopes: payload?.scopes || [],
    nodes: payload?.nodes || [],
    lookupMap: payload?.lookupMap || ''
  });
}

function makeSectionPlanBaseline(response) {
  return {
    revision: extractSectionRevision(response),
    fingerprint: stableStringify(response)
  };
}

function buildPlanRequestSummary(requests) {
  const list = Array.isArray(requests) ? requests : [];
  const methods = { POST: 0, PUT: 0, DELETE: 0, OTHER: 0 };
  const sections = new Map<string, any>();
  for (const req of list) {
    const method = String(req?.method || '').toUpperCase();
    if (method === 'POST' || method === 'PUT' || method === 'DELETE') methods[method] += 1;
    else methods.OTHER += 1;
    const sectionKey = String(req?.sectionKey || '');
    const sectionLabel = String(req?.sectionLabel || sectionKey || '-');
    const row = sections.get(sectionKey) || { sectionKey, sectionLabel, count: 0, methods: { POST: 0, PUT: 0, DELETE: 0, OTHER: 0 } };
    row.count += 1;
    if (method === 'POST' || method === 'PUT' || method === 'DELETE') row.methods[method] += 1;
    else row.methods.OTHER += 1;
    sections.set(sectionKey, row);
  }
  const sectionRows = [...sections.values()].sort((a, b) => b.count - a.count);
  const highImpact = sectionRows.filter((row) => HIGH_IMPACT_SECTIONS.has(row.sectionKey));
  return {
    totalRequests: list.length,
    methods,
    sectionRows,
    sectionCount: sectionRows.length,
    highImpactCount: highImpact.length,
    highImpactLabels: highImpact.map((row) => row.sectionLabel)
  };
}

function renderPlanRequestSummary(plan) {
  const summary = plan?.requestSummary || buildPlanRequestSummary(plan?.plannedRequests || []);
  const methods = summary.methods || ({} as any);
  const highLabels = (summary.highImpactLabels || []).slice(0, 4).join(', ');
  const topSections = (summary.sectionRows || []).slice(0, 6)
    .map((row) => `${row.sectionLabel}:${row.count}`)
    .join(' / ');
  return `<div class="plan-summary-grid">
    <div class="plan-summary-card"><span>予定リクエスト</span><strong>${esc(String(summary.totalRequests || 0))}</strong><small>対象 ${esc(String(summary.sectionCount || 0))} セクション</small></div>
    <div class="plan-summary-card"><span>追加・更新・削除</span><strong>${esc(String(methods.POST || 0))} / ${esc(String(methods.PUT || 0))} / ${esc(String(methods.DELETE || 0))}</strong><small>POST / PUT / DELETE</small></div>
    <div class="plan-summary-card"><span>高リスク領域</span><strong>${esc(String(summary.highImpactCount || 0))}</strong><small>${esc(highLabels || 'なし')}</small></div>
    <div class="plan-summary-card"><span>主な対象</span><strong>${esc(topSections || '-')}</strong><small>リクエスト数順</small></div>
  </div>`;
}

export function markApplyPlan(signature, mode, totalReq, lines, extra: any = {}) {
  const requestSummary = buildPlanRequestSummary(extra.plannedRequests || []);
  state.lastApplyPlan = {
    signature,
    mode,
    totalReq: Number(totalReq || 0),
    createdAt: Date.now(),
    summary: (lines || []).slice(0, 16).join('\n'),
    logs: lines || [],
    requestSummary,
    ...extra
  };
}

export function showInlineConfirmation(plan, options) {
  const appIdRefs = (options && options.appIdRefs) || [];
  return new Promise((resolve) => {
    const stamp = new Date(plan.createdAt).toLocaleString();
    const planText = (plan.logs || []).join('\n') || '(プラン詳細なし)';
    const appIdSection = renderAppIdConfirmSection(appIdRefs);
    const doc = getToolDocument();
    const modalEl = doc.getElementById('u_reflectPlanModal') as HTMLElement | null;
    const modalBody = modalEl?.querySelector('.reflect-modal-body') as HTMLElement | null;
    const fallbackHost = modalBody || ui.result;
    if (!fallbackHost) { resolve(false); return; }
    const previousHtml = fallbackHost.innerHTML;
    const previousScrollTop = (fallbackHost as any).scrollTop || 0;
    if (modalEl) modalEl.hidden = false;
    fallbackHost.innerHTML = `<div class="plan-confirm-panel">
      <div style="font-weight:700;font-size:13px;margin-bottom:8px">実行前プラン確認</div>
      ${renderPlanRequestSummary(plan)}
      ${appIdSection}
      <div class="plan-summary">${esc(planText)}</div>
      <div class="plan-actions">
        <span class="plan-meta">予定リクエスト: ${plan.totalReq || 0}件 | 作成: ${esc(stamp)}</span>
        <button class="btn sub" id="u_planCancel">キャンセル</button>
        <button class="btn ok" id="u_planExecute">このまま実行</button>
      </div>
    </div>`;
    (fallbackHost as any).scrollTop = 0;
    const cleanup = () => {
      const execBtn = doc.getElementById('u_planExecute');
      const cancelBtn = doc.getElementById('u_planCancel');
      if (execBtn) execBtn.removeEventListener('click', onExec);
      if (cancelBtn) cancelBtn.removeEventListener('click', onCancel);
    };
    const onExec = () => {
      cleanup();
      if (modalEl) modalEl.hidden = true;
      resolve(true);
    };
    const onCancel = () => {
      cleanup();
      fallbackHost.innerHTML = previousHtml;
      (fallbackHost as any).scrollTop = previousScrollTop;
      if (modalEl) modalEl.hidden = true;
      resolve(false);
    };
    doc.getElementById('u_planExecute')?.addEventListener('click', onExec);
    doc.getElementById('u_planCancel')?.addEventListener('click', onCancel);
  });
}

export async function ensureApplyPlanApproved(signature, mode, planRunner, options) {
  const plan = state.lastApplyPlan;
  const valid = !!plan && plan.signature === signature && plan.mode === mode;
  if (!valid) {
    await planRunner();
  }
  const currentPlan = state.lastApplyPlan;
  if (!currentPlan) return false;
  return showInlineConfirmation(currentPlan, options);
}

export async function runPreviewApplyPlanNodes() {
  bumpSessionMetric('planRun');
  await ensureDiffPreparedForReflect();
  const c = commonParams();
  if (!c.target.appId) throw new Error('比較先アプリIDを入力してください');
  if (!state.reflectRows.length) loadReflectRowsFromLastDiff();
  const rows = getSelectedReflectRows();
  if (!rows.length) throw new Error('反映ノードを選択してください');
  const lookupMap = parseLookupMapInput(ui.lookupMap.value);
  const prefix = buildApiPrefix(c.target.guestId, true);
  const app = c.target.appId;
  const nodeSigRows = rows
    .map((r) => ({ id: r._id, sectionKey: r.sectionKey, mode: reflectRowModeById(r._id), type: r.type, path: r.path }))
    .sort((a, b) => String(a.id).localeCompare(String(b.id)));
  const planSignature = makeApplyPlanSignature('nodes', {
    targetApp: c.target.appId,
    targetGuest: c.target.guestId,
    sourceApp: c.source.appId,
    sourceGuest: c.source.guestId,
    nodes: nodeSigRows,
    lookupMap: ui.lookupMap.value.trim()
  });

  interface SectionMapEntry { total: number; added: number; removed: number; changed: number }
  const sectionMap: Record<string, SectionMapEntry> = {};
  let srcCount = 0;
  let tgtCount = 0;
  for (const r of rows) {
    const key = r.sectionKey;
    if (!key) continue;
    if (!sectionMap[key]) sectionMap[key] = { total: 0, added: 0, removed: 0, changed: 0 };
    sectionMap[key].total += 1;
    if (reflectRowModeById(r._id) === 'src') srcCount += 1;
    else tgtCount += 1;
    if (r.type === 'added') sectionMap[key].added += 1;
    else if (r.type === 'removed') sectionMap[key].removed += 1;
    else sectionMap[key].changed += 1;
  }

  const lines: string[] = [];
  lines.push('=== 反映プラン（ノードモード）===');
  lines.push(`比較先アプリ: ${c.target.appId}`);
  lines.push(`選択ノード数: ${rows.length}`);
  lines.push(`モード内訳: 比較元 ${srcCount} / 比較先 ${tgtCount}`);
  lines.push('');
  for (const [k, stat] of Object.entries(sectionMap) as Array<[string, SectionMapEntry]>) {
    const label = SECTION_DEFS.find((d) => d.key === k)?.label || k;
    lines.push(`${label}: ${stat.total}件 (A:${stat.added} R:${stat.removed} C:${stat.changed})`);
  }
  lines.push('');

  const bySection: Record<string, any[]> = {};
  for (const row of rows) {
    if (!row.sectionKey) continue;
    if (!bySection[row.sectionKey]) bySection[row.sectionKey] = [];
    bySection[row.sectionKey].push(row);
  }

  let totalReq = 0;
  const targetSectionBaselines: Record<string, any> = {};
  const sectionPreviews: Record<string, any> = {};
  const plannedRequests: any[] = [];
  const sectionKeys = Object.keys(bySection);
  for (let i = 0; i < sectionKeys.length; i++) {
    const secKey = sectionKeys[i];
    const def = SECTION_DEFS.find((d) => d.key === secKey);
    if (!def || !def.put) continue;
    try {
      setStatus(`ノード反映プラン計算中 ${i + 1}/${sectionKeys.length}: ${def.label}`);
      const currentRes = await apiGet(prefix, def.endpoint, { app });
      targetSectionBaselines[secKey] = makeSectionPlanBaseline(currentRes);
      const current = normalize(currentRes);
      const before = deepClone(current);
      let patched = deepClone(current);
      const rowsInSection = sortRowsForPatch(bySection[secKey], secKey);
      for (const row of rowsInSection) {
        const r = applyDiffRowToSection(patched, row, secKey);
        patched = r.section;
      }

      let plan;
      if (secKey === 'fieldSettings') {
        const sourceModeCodes = new Set<string>(
          rowsInSection
            .filter((row) => reflectRowModeById(row._id) === 'src')
            .map(extractFieldCodeFromRowPath)
            .filter((code): code is string => !!code)
        );
        plan = planFieldSectionDiffRequests(app, before.properties || before || ({} as any), patched.properties || patched || ({} as any), lookupMap, sourceModeCodes);
      } else if (secKey === 'viewSettings') {
        plan = planViewsSectionDiffRequests(app, before.views || before || ({} as any), patched.views || patched || ({} as any));
      } else if (secKey === 'reportSettings') {
        plan = planReportsSectionDiffRequests(app, before.reports || before || ({} as any), patched.reports || patched || ({} as any));
      } else if (secKey === 'actionSettings') {
        plan = planActionsSectionDiffRequests(app, before.actions || before || ({} as any), patched.actions || patched || ({} as any));
      } else {
        plan = {
          requests: [{ method: 'PUT', path: def.endpoint, body: { app, ...((def.putBuilder as any)?.(patched) || {}) }, note: `${def.label} put` }],
          wholePreview: buildWholeSectionPreview(before, patched)
        };
      }

      if (plan.preview || plan.wholePreview) {
        sectionPreviews[secKey] = {
          label: def.label,
          shape: plan.preview ? 'map' : 'whole',
          preview: plan.preview || null,
          wholePreview: plan.wholePreview || null,
          requestCount: (plan.requests || []).length
        };
      }
      for (const req of plan.requests || []) {
        plannedRequests.push({ sectionKey: secKey, sectionLabel: def.label, ...req });
      }

      totalReq += (plan.requests || []).length;
      lines.push(`PLAN ${def.label}: ${plan.requests.length} request(s)`);
      appendRequestPlanLogs(lines, plan);
    } catch (e) {
      lines.push(`PLAN NG ${def?.label || secKey}: ${e.message || String(e)}`);
    }
  }

  lines.push('');
  lines.push(`合計予定リクエスト数: ${totalReq}`);
  lines.push('※ ノードモードは差分パスをもとに比較先プレビューへ反映します。');
  markApplyPlan(planSignature, 'nodes', totalReq, lines, { targetSectionBaselines, sectionPreviews, plannedRequests });

  // プラン確認モーダル本体に描画（無ければ result にフォールバック）
  renderPlanIntoModal(state.lastApplyPlan, plannedRequests);
  renderReflectAssistPanel();
  renderReflectMainPanel();
  setStatus('差分選択モードのプラン確認が完了しました');
}

export async function runPreviewApplyPlan() {
  if (isReflectNodeModeEffective()) return runPreviewApplyPlanNodes();
  bumpSessionMetric('planRun');
  await ensureDiffPreparedForReflect();
  const c = commonParams();
  if (!c.target.appId) throw new Error('比較先アプリIDを入力してください');
  const lookupMap = parseLookupMapInput(ui.lookupMap.value);
  const baseScopes = selectedScopeKeys(ui.applyScopes);
  if (!baseScopes.length) throw new Error('反映するセクションを選択してください');
  const scopes = resolveApplyScopes(baseScopes);
  saveCurrentDialogState();
  const planSignature = makeApplyPlanSignature('section', {
    targetApp: c.target.appId,
    targetGuest: c.target.guestId,
    sourceApp: c.source.appId,
    sourceGuest: c.source.guestId,
    scopes,
    lookupMap: ui.lookupMap.value.trim()
  });

  const sourceBundle = await getSourceBundleForApply(c, scopes);
  const prefix = buildApiPrefix(c.target.guestId, true);
  const app = c.target.appId;
  const logs: string[] = [];
  const targetSectionBaselines: Record<string, any> = {};
  const sectionPreviews: Record<string, any> = {};
  const plannedRequests: any[] = [];
  logs.push('=== 反映プラン（ドライラン）===');
  logs.push(`比較先アプリ: ${app}`);
  logs.push(`対象セクション: ${scopes.map((k) => SECTION_DEFS.find((d) => d.key === k)?.label || k).join(', ')}`);
  logs.push('');
  let totalReq = 0;

  const capturePreview = (secKey: string, label: string, plan: any, wholeBefore?: any, wholeAfter?: any) => {
    if (plan && plan.preview) {
      sectionPreviews[secKey] = {
        label,
        shape: 'map',
        preview: plan.preview,
        wholePreview: null,
        requestCount: (plan.requests || []).length
      };
    } else {
      sectionPreviews[secKey] = {
        label,
        shape: 'whole',
        preview: null,
        wholePreview: buildWholeSectionPreview(wholeBefore, wholeAfter),
        requestCount: (plan.requests || []).length
      };
    }
    for (const req of plan.requests || []) {
      plannedRequests.push({ sectionKey: secKey, sectionLabel: label, ...req });
    }
  };

  for (let i = 0; i < scopes.length; i++) {
    const secKey = scopes[i];
    const def = SECTION_DEFS.find((x) => x.key === secKey);
    if (!def || !def.put) {
      logs.push(`SKIP ${def?.label || secKey}: PUT非対応`);
      continue;
    }
    const sourceSec = deepClone(sourceBundle.sections[secKey]);
    if (!sourceSec || sourceSec._fetchError) {
      logs.push(`SKIP ${def.label}: source未取得`);
      continue;
    }

    if (secKey === 'fieldSettings') {
      const current = await apiGet(prefix, '/app/form/fields.json', { app });
      targetSectionBaselines[secKey] = makeSectionPlanBaseline(current);
      const plan = planFieldSectionDiffRequests(app, current.properties || ({} as any), sourceSec.properties || sourceSec || ({} as any), lookupMap);
      capturePreview(secKey, def.label, plan);
      logs.push(`PLAN ${def.label}: ${plan.requests.length} request(s)`);
      appendRequestPlanLogs(logs, plan);
      if (plan.lookupChanged) logs.push(`  - lookup appId 変換: ${plan.lookupChanged}`);
      totalReq += plan.requests.length;
      continue;
    }
    if (secKey === 'viewSettings') {
      const current = await apiGet(prefix, '/app/views.json', { app });
      targetSectionBaselines[secKey] = makeSectionPlanBaseline(current);
      const plan = planViewsSectionDiffRequests(app, current.views || ({} as any), sourceSec.views || sourceSec || ({} as any));
      capturePreview(secKey, def.label, plan);
      logs.push(`PLAN ${def.label}: ${plan.requests.length} request(s)`);
      appendRequestPlanLogs(logs, plan);
      if (plan.deleteSkipCount) logs.push(`  - views delete(skip): ${plan.deleteSkipCount} (互換モード: 削除は行いません)`);
      totalReq += plan.requests.length;
      continue;
    }
    if (secKey === 'reportSettings') {
      const current = await apiGet(prefix, '/app/reports.json', { app });
      targetSectionBaselines[secKey] = makeSectionPlanBaseline(current);
      const plan = planReportsSectionDiffRequests(app, current.reports || ({} as any), sourceSec.reports || sourceSec || ({} as any));
      capturePreview(secKey, def.label, plan);
      logs.push(`PLAN ${def.label}: ${plan.requests.length} request(s)`);
      appendRequestPlanLogs(logs, plan);
      totalReq += plan.requests.length;
      continue;
    }
    if (secKey === 'actionSettings') {
      const current = await apiGet(prefix, '/app/actions.json', { app });
      targetSectionBaselines[secKey] = makeSectionPlanBaseline(current);
      const plan = planActionsSectionDiffRequests(app, current.actions || ({} as any), sourceSec.actions || sourceSec || ({} as any));
      capturePreview(secKey, def.label, plan);
      logs.push(`PLAN ${def.label}: ${plan.requests.length} request(s)`);
      appendRequestPlanLogs(logs, plan);
      if (plan.deleteSkipCount) logs.push(`  - actions delete(skip): ${plan.deleteSkipCount} (互換モード: 削除は行いません)`);
      totalReq += plan.requests.length;
      continue;
    }
    const current = await apiGet(prefix, def.endpoint, { app });
    targetSectionBaselines[secKey] = makeSectionPlanBaseline(current);
    const afterWhole = (def.putBuilder as any)?.(sourceSec) || {};
    const plan = { requests: [{ method: 'PUT', path: def.endpoint, body: { app, ...afterWhole }, note: `${def.label} put` }] };
    capturePreview(secKey, def.label, plan, current, afterWhole);
    logs.push(`PLAN ${def.label}: ${plan.requests.length} request(s)`);
    appendRequestPlanLogs(logs, plan);
    totalReq += plan.requests.length;
  }
  logs.push('');
  logs.push(`合計予定リクエスト数: ${totalReq}`);
  markApplyPlan(planSignature, 'section', totalReq, logs, { targetSectionBaselines, sectionPreviews, plannedRequests });
  // プラン確認モーダル本体に描画（無ければ result にフォールバック）
  renderPlanIntoModal(state.lastApplyPlan, plannedRequests);
  renderReflectAssistPanel();
  renderReflectMainPanel();
  setStatus('実行前プラン確認が完了しました');
}

// プラン確認の出力を専用モーダルに描画する。モーダル要素が無い場合は #u_result にフォールバック。
function renderPlanIntoModal(plan: any, plannedRequests: any[]): void {
  const html = renderPlanConfirmPanelHtml(plan, plannedRequests);
  const doc = getToolDocument();
  const modalBody = doc.querySelector('#u_reflectPlanModal .reflect-modal-body');
  if (modalBody) {
    // プランパネルの中の "applyPreview" ボタンや "exportDryRunPlan" はフッターと重複するため抑制
    modalBody.innerHTML = html;
  } else if (ui.result) {
    ui.result.innerHTML = html;
  }
}

// V3+U3+S5+S10+S1: リクエスト一覧をカード化 + delta指標 + セクションアイコン
function renderPlanConfirmPanelHtml(plan: any, plannedRequests: any[]): string {
  const reqs = Array.isArray(plannedRequests) ? plannedRequests : [];
  const sectionPreviews = (plan?.sectionPreviews || ({} as any)) as Record<string, any>;
  const sectionMap = new Map<string, { sectionKey: string; sectionLabel: string; reqs: any[]; methods: { POST: number; PUT: number; DELETE: number; OTHER: number } }>();
  for (const req of reqs) {
    const key = String(req?.sectionKey || '');
    const label = String(req?.sectionLabel || key || '-');
    const slot = sectionMap.get(key) || { sectionKey: key, sectionLabel: label, reqs: [], methods: { POST: 0, PUT: 0, DELETE: 0, OTHER: 0 } };
    slot.reqs.push(req);
    const m = String(req?.method || '').toUpperCase();
    if (m === 'POST' || m === 'PUT' || m === 'DELETE') slot.methods[m] += 1;
    else slot.methods.OTHER += 1;
    sectionMap.set(key, slot);
  }
  const sections = [...sectionMap.values()].sort((a, b) => b.reqs.length - a.reqs.length);
  const cards = sections.map((sec) => {
    const methodChips = (['POST', 'PUT', 'DELETE'] as const)
      .filter((m) => sec.methods[m] > 0)
      .map((m) => `<span class="plan-card-chip plan-card-chip--${m.toLowerCase()}">${m} ${sec.methods[m]}</span>`)
      .join('');
    const isHigh = HIGH_IMPACT_SECTIONS.has(sec.sectionKey);
    const sevClass = isHigh ? 'sev-high' : 'sev-medium';
    // S5: delta indicator
    const preview = sectionPreviews[sec.sectionKey];
    let deltaHtml = '';
    if (preview?.shape === 'map' && preview.preview) {
      const p = preview.preview;
      const adds = Number(p.addedCount || 0);
      const upds = Number(p.updatedCount || 0);
      const rms = Number(p.removedCount || 0);
      const parts: string[] = [];
      if (adds) parts.push(`<span class="plan-card-delta plan-card-delta--add" title="追加">+${adds}</span>`);
      if (upds) parts.push(`<span class="plan-card-delta plan-card-delta--neutral" title="更新">~${upds}</span>`);
      if (rms) parts.push(`<span class="plan-card-delta plan-card-delta--remove" title="削除">−${rms}</span>`);
      deltaHtml = parts.join('');
    } else if (preview?.shape === 'whole' && preview.wholePreview) {
      deltaHtml = `<span class="plan-card-delta plan-card-delta--neutral" title="セクション全体更新">⇄ 全体更新</span>`;
    }
    // S10 + S1: section icon + severity class on the card
    const sectionIcon = renderSectionIconHtml(sec.sectionKey, { withTooltip: sec.sectionLabel });
    const detailRows = sec.reqs.slice(0, 12).map((req) => {
      const note = String(req?.note || '').trim();
      const path = String(req?.path || '');
      return `<div class="plan-card-row">
        <span class="plan-card-row__method">${esc(String(req?.method || ''))}</span>
        <span class="plan-card-row__path">${esc(path)}</span>
        ${note ? `<span class="plan-card-row__note">${esc(note)}</span>` : ''}
      </div>`;
    }).join('');
    const more = sec.reqs.length > 12 ? `<div class="plan-card-row plan-card-row--more">…他 ${sec.reqs.length - 12} 件</div>` : '';
    return `<details class="plan-card ${sevClass}${isHigh ? ' plan-card--high' : ''}" open>
      <summary class="plan-card__head">
        ${sectionIcon}
        <span class="plan-card__title">${esc(sec.sectionLabel)}</span>
        <span class="plan-card__count">${sec.reqs.length}件</span>
        <span class="plan-card__chips">${methodChips}</span>
        ${deltaHtml}
        ${isHigh ? '<span class="plan-card__risk">高リスク</span>' : ''}
      </summary>
      <div class="plan-card__body">${detailRows}${more}</div>
    </details>`;
  }).join('');
  const stamp = new Date(plan?.createdAt || Date.now()).toLocaleString();
  return `<div class="plan-confirm-panel">
    <div class="plan-confirm-head">
      <div class="plan-confirm-head__title">実行前プラン確認</div>
      <div class="plan-confirm-head__meta">予定リクエスト ${plan?.totalReq || 0} 件 ／ ${esc(stamp)}</div>
    </div>
    ${renderPlanRequestSummary(plan)}
    <div class="plan-confirm-cards">${cards || '<div class="muted">予定リクエストがありません</div>'}</div>
    <div class="plan-confirm-actions">
      <button type="button" class="btn-stage" data-stage="apply" data-act="applyPreview" title="このプランの内容で比較先プレビューへ反映します">
        <span class="btn-stage__icon">🚀</span><span>このプランで反映する</span>
        <span class="btn-stage__shortcut">Ctrl+Shift+Enter</span>
      </button>
      <button type="button" class="btn sub" data-act="exportDryRunPlan" title="APIを実行せずプランをJSONで保存">ドライランJSONを保存</button>
    </div>
    <details class="plan-confirm-rawlogs"><summary>テキストログを表示</summary><div class="plan-summary">${esc((plan?.logs || []).join('\n'))}</div></details>
  </div>`;
}

export async function runExportDryRunPlan() {
  const plan = state.lastApplyPlan;
  const expectedSignature = computeCurrentReflectPlanSignature();
  const planIsFresh = !!(
    plan &&
    Array.isArray(plan.plannedRequests) &&
    plan.plannedRequests.length &&
    expectedSignature &&
    plan.signature === expectedSignature
  );
  if (!planIsFresh) {
    setStatus('プランが古いため再生成します（モード切替や差分・選択の変化を検知）');
    await runPreviewApplyPlan();
  }
  const latest = state.lastApplyPlan;
  const latestSignatureMatches = !!(latest && expectedSignature && latest.signature === expectedSignature);
  if (!latest || !Array.isArray(latest.plannedRequests) || !latest.plannedRequests.length) {
    throw new Error('ドライランに出力できる計画がありません。先に「実行前プラン確認」を実行してください。');
  }
  if (expectedSignature && !latestSignatureMatches) {
    throw new Error('プランが現在の条件と一致しません。再度「実行前プラン確認」を実行してください。');
  }
  const c = commonParams();
  const payload = {
    generatedAt: new Date().toISOString(),
    kind: 'reflect-dry-run',
    mode: latest.mode,
    target: {
      appId: c.target.appId,
      guestId: c.target.guestId || '',
      preview: true
    },
    source: {
      appId: c.source.appId,
      guestId: c.source.guestId || ''
    },
    totalRequests: latest.totalReq || latest.plannedRequests.length,
    plannedRequests: latest.plannedRequests.map((r) => ({
      sectionKey: r.sectionKey,
      sectionLabel: r.sectionLabel,
      method: r.method,
      path: r.path,
      note: r.note || '',
      body: r.body
    })),
    sectionPreviews: latest.sectionPreviews || ({} as any),
    logs: latest.logs || []
  };
  const filename = buildExportFilename('プレビュー反映ドライラン', 'json', {
    appLabel: buildAppFilenameLabel(c.target.appId || 'unknown', '')
  });
  downloadText(filename, JSON.stringify(payload, null, 2), 'application/json');
  setStatus(`ドライランJSONを保存しました: ${filename}（APIは送信していません）`);
}
