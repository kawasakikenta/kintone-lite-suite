'use strict';

import { SECTION_DEFS, SYSTEM_FIELD_TYPES } from '../constants.js';
import {
  deepClone, normalize, stableStringify, downloadText, apiErrorWithContext, esc, readTextFile,
  relativePathFromRow, tokenizePath, kusConfirm, buildExportFilename, buildAppFilenameLabel, extractAppNameFromBundle
} from '../utils.js';
import { state, ui, pushReflectApplyHistoryEntry } from '../state.js';
import {
  apiGet,
  assertAllowsMutatingRestCall,
  buildApiPrefix,
  fetchBundle,
  extractSectionRevision,
  ensureBundleShape
} from '../api.js';
import { buildPatchPayload } from '../diff/export.js';
import {
  planFieldSectionDiffRequests,
  planViewsSectionDiffRequests,
  planReportsSectionDiffRequests,
  planActionsSectionDiffRequests,
  appendRequestPlanLogs,
  makeApplyPlanSignature,
  ensureApplyPlanApproved,
  splitUpsertMap,
  runPreviewApplyPlan,
  runPreviewApplyPlanNodes
} from './plan.js';
import {
  commonParams,
  setStatus,
  selectedScopeKeys,
  parseLookupMapInput,
  getSelectedReflectRows,
  ensureDiffPreparedForReflect,
  resolveApplyScopes,
  saveCurrentDialogState,
  getSourceBundleForApply,
  loadReflectRowsFromLastDiff,
  renderReflectAssistPanel,
  renderReflectMainPanel,
  renderProgressLog,
  appendProgressSummary,
  pushReflectUndo,
  renderReflectNodeList
} from './helpers.js';
import { reflectRowModeById, reflectRowDesiredValue } from './rowMode.js';
import { isReflectNodeModeEffective } from './nodeModeUi.js';
import { getToolDocument } from '../ui/dialog.js';
import { getJsonEditorInstance, renderRichDiff } from '../oss_integrations.js';

export { reflectRowModeById, reflectRowDesiredValue } from './rowMode.js';

let patchJsonDiffTimer = 0;
let patchJsonDiffSeq = 0;
const APPLY_GUARD_DIFF_THRESHOLD = 100;
const APPLY_GUARD_REQUEST_THRESHOLD = 80;

export function convertLookupAppIds(fieldDef, map) {
  const def = deepClone(fieldDef || {});
  const lookupMap = map || {};
  if (!Object.keys(lookupMap).length) return { def, changed: false };
  let changed = false;
  const walk = (node) => {
    if (!node || typeof node !== 'object') return;
    const relatedApp = node.lookup && node.lookup.relatedApp;
    if (relatedApp && relatedApp.app != null) {
      const before = String(relatedApp.app);
      const after = lookupMap[before];
      if (after && String(after) !== before) {
        node.lookup.relatedApp.app = String(after);
        changed = true;
      }
    }
    if (node.type === 'SUBTABLE' && node.fields && typeof node.fields === 'object') {
      Object.values(node.fields).forEach(walk);
    }
  };
  walk(def);
  return { def, changed };
}

export function extractReferencedAppIds(sourceBundle, scopes, lookupMap) {
  const refs = [];
  const map = lookupMap || {};
  const scopeSet = new Set(scopes || []);
  const fields = sourceBundle?.sections?.fieldSettings?.properties || {};
  if (scopeSet.has('fieldSettings') || scopeSet.size === 0) {
    const walkFields = (fieldMap, parent) => {
      for (const [code, f] of Object.entries(fieldMap || {})) {
        if (f.lookup && f.lookup.relatedApp && f.lookup.relatedApp.app != null) {
          const appId = String(f.lookup.relatedApp.app);
          const converted = map[appId] ? String(map[appId]) : null;
          refs.push({ fieldCode: parent ? `${parent} > ${code}` : code, refAppId: appId, convertedAppId: converted, section: 'フィールド設定', type: 'ルックアップ' });
        }
        if (f.referenceTable && f.referenceTable.relatedApp && f.referenceTable.relatedApp.app != null) {
          const appId = String(f.referenceTable.relatedApp.app);
          const converted = map[appId] ? String(map[appId]) : null;
          refs.push({ fieldCode: parent ? `${parent} > ${code}` : code, refAppId: appId, convertedAppId: converted, section: 'フィールド設定', type: '関連レコード一覧' });
        }
        if (f.type === 'SUBTABLE' && f.fields && typeof f.fields === 'object') {
          walkFields(f.fields, code);
        }
      }
    };
    walkFields(fields, null);
  }
  const actions = sourceBundle?.sections?.actionSettings?.actions || {};
  if (scopeSet.has('actionSettings') || scopeSet.size === 0) {
    for (const [name, a] of Object.entries(actions)) {
      if (a.destApp && a.destApp.app) {
        const appId = String(a.destApp.app);
        refs.push({ fieldCode: name, refAppId: appId, convertedAppId: null, section: 'アクション設定', type: 'アクション' });
      }
    }
  }
  return refs;
}

export function filterWritableFieldProps(props, skipSystem) {
  if (!skipSystem) return deepClone(props || {});
  const out = {};
  for (const [k, def] of Object.entries(props || {})) {
    if (!def || typeof def !== 'object') continue;
    if (SYSTEM_FIELD_TYPES.has(def.type)) continue;
    out[k] = deepClone(def);
  }
  return out;
}

export { relativePathFromRow, tokenizePath };

export function getByTokens(root, tokens) {
  let cur = root;
  for (const tk of tokens) {
    if (typeof tk === 'number') {
      if (!Array.isArray(cur) || tk < 0 || tk >= cur.length) return undefined;
      cur = cur[tk];
    } else {
      if (!cur || typeof cur !== 'object' || !Object.prototype.hasOwnProperty.call(cur, tk)) return undefined;
      cur = cur[tk];
    }
  }
  return cur;
}

export function itemKeySignature(v) {
  return `${typeof v}:${String(v)}`;
}

const ARRAY_KEY_FALLBACK_CANDIDATES = ['code', 'id', 'name', 'entity', 'field', 'status', 'state', 'app', 'from', 'to', 'key'];

function inferArrayKeyFromRow(row) {
  const candidates = [row?.left, row?.right, reflectRowDesiredValue(row)];
  for (const key of ARRAY_KEY_FALLBACK_CANDIDATES) {
    for (const value of candidates) {
      if (!value || typeof value !== 'object') continue;
      if (Object.prototype.hasOwnProperty.call(value, key) && value[key] !== undefined && value[key] !== null) {
        return { key, value: value[key] };
      }
    }
  }
  return { key: null, value: undefined };
}

export function resolveArrayKeyValue(row, desired) {
  const key = row.arrayKey;
  if (!key) return inferArrayKeyFromRow(row);
  if (row.arrayKeyValue !== undefined) return { key, value: row.arrayKeyValue };
  const candidates = [desired, row.left, row.right];
  for (const obj of candidates) {
    if (obj && typeof obj === 'object' && Object.prototype.hasOwnProperty.call(obj, key)) {
      return { key, value: obj[key] };
    }
  }
  return { key, value: undefined };
}

export function findArrayIndexByKey(arr, key, value) {
  if (!Array.isArray(arr) || !key) return -1;
  const sig = itemKeySignature(value);
  const asText = String(value);
  for (let i = 0; i < arr.length; i++) {
    const obj = arr[i];
    if (!obj || typeof obj !== 'object') continue;
    if (!Object.prototype.hasOwnProperty.call(obj, key)) continue;
    if (itemKeySignature(obj[key]) === sig) return i;
    if (String(obj[key]) === asText) return i;
  }
  return -1;
}

export function applyArrayRowByKey(sectionObj, row, tokens, desired) {
  if (!tokens.length) return null;
  const last = tokens[tokens.length - 1];
  if (typeof last !== 'number') return null;
  const arr = getByTokens(sectionObj, tokens.slice(0, -1));
  if (!Array.isArray(arr)) return null;

  const mode = reflectRowModeById(row._id);
  const { key, value } = resolveArrayKeyValue(row, desired);
  if (!key || value === undefined) return null;
  const curIndex = findArrayIndexByKey(arr, key, value);

  if (desired === undefined) {
    if (curIndex < 0) return { section: sectionObj, applied: false, op: 'delete', reason: 'array item not found' };
    arr.splice(curIndex, 1);
    return { section: sectionObj, applied: true, op: 'delete' };
  }

  const preferredIndex = row.moved
    ? (mode === 'src' && Number.isInteger(row.movedFrom)
      ? row.movedFrom
      : (Number.isInteger(row.movedTo) ? row.movedTo : last))
    : last;
  const bounded = (n, max) => Math.max(0, Math.min(max, Number.isInteger(n) ? n : max));
  const insertItem = deepClone(desired);

  if (curIndex >= 0) {
    arr.splice(curIndex, 1);
    const ins = bounded(preferredIndex, arr.length);
    arr.splice(ins, 0, insertItem);
  } else {
    const ins = bounded(preferredIndex, arr.length);
    arr.splice(ins, 0, insertItem);
  }
  return { section: sectionObj, applied: true, op: row.moved ? 'move' : 'set' };
}

export function setByTokens(root, tokens, value) {
  if (!tokens.length) return deepClone(value);
  if (root == null || typeof root !== 'object') root = {};
  let cur = root;
  for (let i = 0; i < tokens.length - 1; i++) {
    const tk = tokens[i];
    const next = tokens[i + 1];
    if (typeof tk === 'number') {
      if (!Array.isArray(cur)) return root;
      if (cur[tk] == null || typeof cur[tk] !== 'object') cur[tk] = typeof next === 'number' ? [] : {};
      cur = cur[tk];
    } else {
      if (cur[tk] == null || typeof cur[tk] !== 'object') cur[tk] = typeof next === 'number' ? [] : {};
      cur = cur[tk];
    }
  }
  const last = tokens[tokens.length - 1];
  if (typeof last === 'number') {
    if (!Array.isArray(cur)) return root;
    cur[last] = deepClone(value);
  } else {
    cur[last] = deepClone(value);
  }
  return root;
}

export function deleteByTokens(root, tokens) {
  if (!tokens.length) return { root, deleted: false };
  let cur = root;
  for (let i = 0; i < tokens.length - 1; i++) {
    const tk = tokens[i];
    if (typeof tk === 'number') {
      if (!Array.isArray(cur) || cur[tk] == null) return { root, deleted: false };
      cur = cur[tk];
    } else {
      if (!cur || typeof cur !== 'object' || !Object.prototype.hasOwnProperty.call(cur, tk)) return { root, deleted: false };
      cur = cur[tk];
    }
  }
  const last = tokens[tokens.length - 1];
  if (typeof last === 'number') {
    if (!Array.isArray(cur) || last < 0 || last >= cur.length) return { root, deleted: false };
    cur.splice(last, 1);
    return { root, deleted: true };
  }
  if (!cur || typeof cur !== 'object' || !Object.prototype.hasOwnProperty.call(cur, last)) return { root, deleted: false };
  delete cur[last];
  return { root, deleted: true };
}

export function applyDiffRowToSection(sectionObj, row, secKey) {
  const rel = relativePathFromRow(row.path, secKey);
  if (rel == null) return { section: sectionObj, applied: false, op: 'skip', reason: 'path mismatch' };
  const desired = reflectRowDesiredValue(row);
  if (desired === undefined) {
    if (!rel) return { section: sectionObj, applied: false, op: 'skip', reason: 'root delete unsupported' };
    const tokens = tokenizePath(rel);
    const keyDel = applyArrayRowByKey(sectionObj, row, tokens, desired);
    if (keyDel) return keyDel;
    const out = deleteByTokens(sectionObj, tokens);
    return { section: out.root, applied: out.deleted, op: 'delete', reason: out.deleted ? '' : 'target path not found' };
  }
  if (!rel) {
    return { section: deepClone(desired), applied: true, op: 'set' };
  }
  const tokens = tokenizePath(rel);
  const keySet = applyArrayRowByKey(sectionObj, row, tokens, desired);
  if (keySet) return keySet;
  return { section: setByTokens(sectionObj, tokens, desired), applied: true, op: 'set' };
}

export function compareTokensForDelete(aTokens, bTokens) {
  const n = Math.min(aTokens.length, bTokens.length);
  for (let i = 0; i < n; i++) {
    const a = aTokens[i];
    const b = bTokens[i];
    if (a === b) continue;
    const aNum = typeof a === 'number';
    const bNum = typeof b === 'number';
    if (aNum && bNum) return b - a;
    if (aNum && !bNum) return -1;
    if (!aNum && bNum) return 1;
    return String(a).localeCompare(String(b));
  }
  return bTokens.length - aTokens.length;
}

export function sortRowsForPatch(rows, secKey) {
  return [...rows].sort((a, b) => {
    const aDel = reflectRowDesiredValue(a) === undefined;
    const bDel = reflectRowDesiredValue(b) === undefined;
    if (aDel && !bDel) return -1;
    if (!aDel && bDel) return 1;

    const aRel = relativePathFromRow(a.path, secKey) || '';
    const bRel = relativePathFromRow(b.path, secKey) || '';
    const aTokens = tokenizePath(aRel);
    const bTokens = tokenizePath(bRel);
    if (aDel && bDel) return compareTokensForDelete(aTokens, bTokens);
    if (aTokens.length !== bTokens.length) return aTokens.length - bTokens.length;
    return aRel.localeCompare(bRel);
  });
}

export function extractFieldCodeFromRowPath(row) {
  const rel = relativePathFromRow(row.path, 'fieldSettings');
  if (!rel) return null;
  const tokens = tokenizePath(rel);
  if (tokens[0] !== 'properties' || typeof tokens[1] !== 'string') return null;
  return tokens[1];
}

export async function executeRequestPlan(prefix, requests, logs, stopOnError) {
  const list = Array.isArray(requests) ? requests : [];
  for (let i = 0; i < list.length; i++) {
    const req = list[i];
    try {
      let _err;
      for (let _r = 0; _r <= 2; _r++) {
        try {
          assertAllowsMutatingRestCall(prefix, req.path, req.method);
          await kintone.api(`${prefix}${req.path}`, req.method, req.body);
          _err = null;
          break;
        }
        catch (re) {
          _err = re;
          if (_r < 2) await new Promise((r) => setTimeout(r, 700 * (_r + 1)));
        }
      }
      if (_err) throw apiErrorWithContext(_err, { method: req.method, prefix, path: req.path, payload: req.body });
      if (logs) logs.push(`  - OK ${req.method} ${req.path}${req.note ? ` (${req.note})` : ''}`);
    } catch (e) {
      if (logs) logs.push(`  - NG ${req.method} ${req.path}: ${e.message || String(e)}`);
      if (stopOnError) throw e;
    }
  }
}

export async function applyFieldSectionDiff(prefix, app, beforeProps, afterProps, logs, lookupMap, sourceModeCodes, stopOnError) {
  const plan = planFieldSectionDiffRequests(app, beforeProps, afterProps, lookupMap, sourceModeCodes);
  appendRequestPlanLogs(logs, plan);
  await executeRequestPlan(prefix, plan.requests, logs, stopOnError);
  if (plan.lookupChanged) logs.push(`  - lookup appId 変換: ${plan.lookupChanged}`);
}

export async function applyViewsSectionDiff(prefix, app, beforeViews, afterViews, logs, stopOnError) {
  const plan = planViewsSectionDiffRequests(app, beforeViews, afterViews);
  appendRequestPlanLogs(logs, plan);
  await executeRequestPlan(prefix, plan.requests, logs, stopOnError);
  if (plan.deleteSkipCount) logs.push(`  - views delete(skip): ${plan.deleteSkipCount} (互換モード: 削除は行いません)`);
}

export async function applyReportsSectionDiff(prefix, app, beforeReports, afterReports, logs, stopOnError) {
  const plan = planReportsSectionDiffRequests(app, beforeReports, afterReports);
  appendRequestPlanLogs(logs, plan);
  await executeRequestPlan(prefix, plan.requests, logs, stopOnError);
}

export async function applyActionsSectionDiff(prefix, app, beforeActions, afterActions, logs, stopOnError) {
  const plan = planActionsSectionDiffRequests(app, beforeActions, afterActions);
  appendRequestPlanLogs(logs, plan);
  await executeRequestPlan(prefix, plan.requests, logs, stopOnError);
  if (plan.deleteSkipCount) logs.push(`  - actions delete(skip): ${plan.deleteSkipCount} (互換モード: 削除は行いません)`);
}

export async function applySectionsLoop(prefix, app, sourceBundle, scopes, logs, lookupMap, stopOnError, { phaseLabel = '反映', onProgress, sectionResults } = {}) {
  let hadError = false;
  for (let i = 0; i < scopes.length; i++) {
    const secKey = scopes[i];
    const def = SECTION_DEFS.find((x) => x.key === secKey);
    if (!def || !def.put) continue;
    const sourceSec = deepClone(sourceBundle.sections[secKey]);
    if (!sourceSec || sourceSec._fetchError) {
      logs.push(`SKIP ${def.label}: source未取得`);
      recordSectionResult(sectionResults, secKey, def.label, 'skipped', 'source未取得');
      if (onProgress) onProgress(i, scopes.length);
      continue;
    }
    setStatus(`${phaseLabel}中 ${i + 1}/${scopes.length}: ${def.label}`);
    if (onProgress) onProgress(i, scopes.length);
    try {
      if (secKey === 'fieldSettings') {
        const current = await apiGet(prefix, '/app/form/fields.json', { app });
        const beforeProps = current.properties || {};
        const afterProps = filterWritableFieldProps(sourceSec.properties || sourceSec, true);
        await applyFieldSectionDiff(prefix, app, beforeProps, afterProps, logs, lookupMap, null, stopOnError);
        logs.push(`OK ${def.label}`);
        recordSectionResult(sectionResults, secKey, def.label, 'ok', '');
        continue;
      }
      if (secKey === 'viewSettings') {
        const current = await apiGet(prefix, '/app/views.json', { app });
        await applyViewsSectionDiff(prefix, app, current.views || {}, sourceSec.views || sourceSec || {}, logs, stopOnError);
        logs.push(`OK ${def.label}`);
        recordSectionResult(sectionResults, secKey, def.label, 'ok', '');
        continue;
      }
      if (secKey === 'reportSettings') {
        const current = await apiGet(prefix, '/app/reports.json', { app });
        await applyReportsSectionDiff(prefix, app, current.reports || {}, sourceSec.reports || sourceSec || {}, logs, stopOnError);
        logs.push(`OK ${def.label}`);
        recordSectionResult(sectionResults, secKey, def.label, 'ok', '');
        continue;
      }
      if (secKey === 'actionSettings') {
        const current = await apiGet(prefix, '/app/actions.json', { app });
        await applyActionsSectionDiff(prefix, app, current.actions || {}, sourceSec.actions || sourceSec || {}, logs, stopOnError);
        logs.push(`OK ${def.label}`);
        recordSectionResult(sectionResults, secKey, def.label, 'ok', '');
        continue;
      }
      const reqs = [{ method: 'PUT', path: def.endpoint, body: { app, ...def.putBuilder(sourceSec) }, note: `${def.label} put` }];
      appendRequestPlanLogs(logs, { requests: reqs });
      await executeRequestPlan(prefix, reqs, logs, stopOnError);
      logs.push(`OK ${def.label}`);
      recordSectionResult(sectionResults, secKey, def.label, 'ok', '');
    } catch (e) {
      hadError = true;
      const msg = e.message || String(e);
      logs.push(`NG ${def.label}: ${msg}`);
      recordSectionResult(sectionResults, secKey, def.label, 'ng', msg);
      if (stopOnError) {
        logs.push('中断: エラーが発生したため処理を停止しました');
        break;
      }
    }
  }
  return hadError;
}

function recordSectionResult(results, sectionKey, label, status, message) {
  if (!Array.isArray(results)) return;
  const existing = results.find((r) => r && r.sectionKey === sectionKey);
  if (existing) {
    existing.status = status;
    existing.label = label || existing.label;
    if (message) existing.message = message;
    return;
  }
  results.push({
    sectionKey,
    label: label || sectionKey,
    status,
    message: message || ''
  });
}

function commitApplyReport({ mode, appId, scopes, sectionResults, hadError, sourceAppId, sourceGuestId, targetGuestId }) {
  const now = Date.now();
  const okSections = sectionResults.filter((r) => r.status === 'ok').map((r) => r.sectionKey);
  const ngSections = sectionResults.filter((r) => r.status === 'ng').map((r) => r.sectionKey);
  const skipSections = sectionResults.filter((r) => r.status === 'skipped').map((r) => r.sectionKey);
  const report = {
    completedAt: now,
    mode,
    appId: appId || '',
    sourceAppId: sourceAppId || '',
    sourceGuestId: sourceGuestId || '',
    targetGuestId: targetGuestId || '',
    scopes: [...scopes],
    sections: sectionResults.map((r) => ({ ...r })),
    okCount: okSections.length,
    ngCount: ngSections.length,
    skipCount: skipSections.length,
    failedSectionKeys: ngSections,
    hadError: !!hadError
  };
  state.lastApplyReport = report;
  state.lastApplyCompletedAt = now;
  state.lastApplyCompletedMode = mode;
  state.lastApplyCompletedHadError = !!hadError;
  state.lastApplyCompletedAppId = appId || '';
  pushReflectApplyHistoryEntry({
    id: `apply_${now}`,
    at: now,
    mode,
    appId: appId || '',
    scopes: [...scopes],
    okCount: okSections.length,
    ngCount: ngSections.length,
    skipCount: skipSections.length,
    failedSectionKeys: ngSections,
    hadError: !!hadError
  });
  return report;
}

export function resolveBackupScopes(c) {
  if (isReflectNodeModeEffective()) {
    if (!state.reflectRows.length) loadReflectRowsFromLastDiff();
    const rows = getSelectedReflectRows();
    if (!rows.length) throw new Error('バックアップ対象ノードが未選択です');
    const scopes = [...new Set(rows.map((r) => r.sectionKey).filter(Boolean))];
    if (!scopes.length) throw new Error('バックアップ対象セクションを判定できません');
    return scopes;
  }
  const baseScopes = selectedScopeKeys(ui.applyScopes);
  if (!baseScopes.length) throw new Error('反映するセクションを選択してください');
  return [...new Set(baseScopes.filter(Boolean))];
}

export async function backupTargetPreviewSettings(c, scopes, options = {}) {
  if (!c.target.appId) throw new Error('比較先アプリIDを入力してください');
  const actualScopes = Array.isArray(scopes) && scopes.length ? scopes : resolveBackupScopes(c);
  const scopeSummary = formatSectionList(actualScopes);
  const target = { ...c.target, preview: true };
  setStatus(`バックアップ取得中... (${actualScopes.length}セクション)`);
  const bundle = await fetchBundle({
    ...target,
    sections: actualScopes,
    onProgress: (p, l) => setStatus(`バックアップ取得中 ${Math.round(p * 100)}% (${l})`)
  });
  const payload = {
    generatedAt: new Date().toISOString(),
    mode: 'target-preview-backup',
    scopes: actualScopes,
    target: {
      appId: target.appId,
      guestId: target.guestId || '',
      preview: true
    },
    bundle
  };
  const filename = buildExportFilename('比較先プレビュー_バックアップ', 'json', {
    appLabel: buildAppFilenameLabel(target.appId, extractAppNameFromBundle(bundle))
  });
  state.lastPreviewBackupPayload = deepClone(payload);
  state.lastPreviewBackupFilename = filename;
  downloadText(filename, JSON.stringify(payload, null, 2), 'application/json');
  if (!options?.silentStatus) setStatus(`比較先(プレビュー)バックアップ保存: ${filename} (${scopeSummary || '-'})`);
  if (ui.backupStatus) {
    ui.backupStatus.textContent = `\u2705 バックアップ保存済: ${filename} (${actualScopes.length}セクション: ${scopeSummary || '-'}, ${new Date().toLocaleTimeString()})`;
    ui.backupStatus.style.display = 'block';
  }
  return { filename, payload };
}

function getSectionDisplayLabel(sectionKey) {
  return SECTION_DEFS.find((item) => item.key === sectionKey)?.label || sectionKey;
}

function formatSectionList(sectionKeys) {
  return (sectionKeys || []).map((sectionKey) => getSectionDisplayLabel(sectionKey)).join(', ');
}

function isSameConnectionPair(c) {
  const srcApp = String(c?.source?.appId || '').trim();
  const tgtApp = String(c?.target?.appId || '').trim();
  const srcGuest = String(c?.source?.guestId || '').trim();
  const tgtGuest = String(c?.target?.guestId || '').trim();
  return !!srcApp && srcApp === tgtApp && srcGuest === tgtGuest;
}

function summarizeRowsBySeverity(rows) {
  const out = { total: 0, high: 0, medium: 0, low: 0 };
  for (const row of rows || []) {
    out.total += 1;
    const sev = String(row?.severity || 'low').toLowerCase();
    if (sev === 'high') out.high += 1;
    else if (sev === 'medium') out.medium += 1;
    else out.low += 1;
  }
  return out;
}

function confirmApplyRiskGuard(mode, c, options = {}) {
  const issues = [];
  const labels = [];
  const diffSummary = options.diffSummary || { total: 0, high: 0, medium: 0, low: 0 };
  const requestCount = Number(options.requestCount || 0);

  if (isSameConnectionPair(c)) {
    issues.push('比較元と比較先が同一接続です（同一 appId / guestId）');
  }
  if (diffSummary.total >= APPLY_GUARD_DIFF_THRESHOLD) {
    issues.push(`差分件数がしきい値以上です（${diffSummary.total}件 / しきい値 ${APPLY_GUARD_DIFF_THRESHOLD}件）`);
  }
  if (diffSummary.high > 0) {
    issues.push(`高重要度の差分を含みます（高 ${diffSummary.high}件）`);
  }
  if (requestCount >= APPLY_GUARD_REQUEST_THRESHOLD) {
    issues.push(`APIリクエスト予定数が多いです（${requestCount}件 / しきい値 ${APPLY_GUARD_REQUEST_THRESHOLD}件）`);
  }

  if (!issues.length) return true;
  if (Array.isArray(options.scopeLabels) && options.scopeLabels.length) {
    labels.push(`対象セクション: ${options.scopeLabels.join(', ')}`);
  }
  labels.push(`差分件数: ${diffSummary.total}件（高 ${diffSummary.high} / 中 ${diffSummary.medium} / 低 ${diffSummary.low}）`);
  if (requestCount > 0) labels.push(`予定リクエスト: ${requestCount}件`);

  const modeLabel = mode === 'nodes' ? 'ノード反映' : (mode === 'patch' ? 'JSONパッチ反映' : 'プレビュー反映');
  const body = [
    `【安全確認: ${modeLabel}】`,
    '',
    `比較先アプリ: ${c?.target?.appId || '-'}`,
    ...labels,
    '',
    '注意点:',
    ...issues.map((line) => ` - ${line}`),
    '',
    '内容を確認したうえで実行しますか？'
  ].join('\n');
  return kusConfirm(body);
}

async function assertTargetPreviewMatchesPlannedBaseline(prefix, app, sectionKeys) {
  const plan = state.lastApplyPlan;
  const baselines = plan?.targetSectionBaselines || {};
  const uniqueSectionKeys = [...new Set((sectionKeys || []).filter(Boolean))];
  const checked = [];
  const skipped = [];
  const mismatches = [];

  for (const secKey of uniqueSectionKeys) {
    const baseline = baselines[secKey];
    const def = SECTION_DEFS.find((item) => item.key === secKey);
    if (!baseline || !def) {
      skipped.push(secKey);
      continue;
    }
    const current = await apiGet(prefix, def.endpoint, { app });
    const currentRevision = extractSectionRevision(current);
    const currentFingerprint = stableStringify(current);
    const revisionChanged = baseline.revision && currentRevision && baseline.revision !== currentRevision;
    const fingerprintChanged = baseline.fingerprint && baseline.fingerprint !== currentFingerprint;
    if (revisionChanged || fingerprintChanged) {
      mismatches.push({
        sectionKey: secKey,
        label: getSectionDisplayLabel(secKey),
        plannedRevision: baseline.revision || '-',
        currentRevision: currentRevision || '-'
      });
      continue;
    }
    checked.push(secKey);
  }

  if (mismatches.length) {
    const detail = mismatches
      .map((item) => `${item.label} (plan ${item.plannedRevision} / current ${item.currentRevision})`)
      .join(', ');
    throw new Error(`プラン確認後に比較先プレビューが更新されています。再度「実行前プラン確認」を実行してください。対象: ${detail}`);
  }

  return { checked, skipped };
}

function resolvePatchSectionKey(name) {
  const raw = String(name || '').trim();
  if (!raw) return '';
  const def = SECTION_DEFS.find((item) => item.key === raw || item.label === raw);
  return def?.key || raw;
}

function getPatchEditorText() {
  try {
    const editor = getJsonEditorInstance('u_patchJsonEditor');
    if (editor) return editor.getText() || '';
  } catch (e) { /* ignore */ }
  const el = getToolDocument().getElementById('u_patchJsonEditor');
  if (!el) return '';
  if (typeof el.value === 'string') return el.value;
  return typeof el.textContent === 'string' ? el.textContent : '';
}

function setPatchEditorValue(value) {
  const text = typeof value === 'string' ? value : JSON.stringify(value || {}, null, 2);
  try {
    const editor = getJsonEditorInstance('u_patchJsonEditor');
    if (editor) {
      editor.set(typeof value === 'string' ? JSON.parse(value || '{}') : (value || {}));
      return;
    }
  } catch (e) {
    try {
      const editor = getJsonEditorInstance('u_patchJsonEditor');
      if (editor) {
        editor.setText(text);
        return;
      }
    } catch (e2) { /* ignore */ }
  }
  const el = getToolDocument().getElementById('u_patchJsonEditor');
  if (el && typeof el.value !== 'undefined') el.value = text;
}

function isPatchEditorEffectivelyEmpty(text) {
  const raw = String(text || '').trim();
  return !raw || raw === '{}' || raw === 'null';
}

function normalizePatchRows(sectionKey, rows) {
  const def = SECTION_DEFS.find((item) => item.key === sectionKey);
  return (Array.isArray(rows) ? rows : []).map((row, index) => ({
    _id: `patch:${sectionKey}:${index}`,
    sectionKey,
    section: def?.label || sectionKey,
    type: String(row?.type || 'changed'),
    path: String(row?.path || sectionKey),
    left: row?.sourceValue,
    right: row?.targetValue,
    moved: !!row?.moved,
    movedFrom: row?.movedFrom,
    movedTo: row?.movedTo,
    arrayKey: row?.arrayKey,
    arrayKeyValue: row?.arrayKeyValue,
    reasonSummary: row?.reasonSummary || '',
    renameCandidate: row?.renameCandidate || null,
    impactCount: row?.impactCount || 0,
    impactRefs: Array.isArray(row?.impactRefs) ? row.impactRefs : []
  }));
}

function buildPatchDiffPreviewPayload(payload) {
  const sourceView = {
    app: payload?.source || {},
    sections: {}
  };
  const targetView = {
    app: payload?.target || {},
    sections: {}
  };
  const order = new Map(SECTION_DEFS.map((item, index) => [item.key, index]));
  const sectionKeys = Object.keys(payload?.sections || {}).sort((a, b) => {
    const ao = order.has(a) ? order.get(a) : 999;
    const bo = order.has(b) ? order.get(b) : 999;
    if (ao !== bo) return ao - bo;
    return String(a).localeCompare(String(b));
  });
  sectionKeys.forEach((sectionKey) => {
    const def = SECTION_DEFS.find((item) => item.key === sectionKey);
    const label = def?.label || sectionKey;
    const rows = normalizePatchRows(sectionKey, payload.sections[sectionKey]).sort((a, b) => String(a.path || '').localeCompare(String(b.path || '')));
    sourceView.sections[label] = rows.map((row) => ({
      path: row.path,
      type: row.type,
      value: row.left === undefined ? '（なし）' : row.left
    }));
    targetView.sections[label] = rows.map((row) => ({
      path: row.path,
      type: row.type,
      value: row.right === undefined ? '（なし）' : row.right
    }));
  });
  return {
    leftText: JSON.stringify(sourceView, null, 2),
    rightText: JSON.stringify(targetView, null, 2)
  };
}

function clearPatchJsonDiff(message) {
  const el = getToolDocument().getElementById('u_patchJsonDiff');
  if (!el) return;
  el.innerHTML = `<div style="padding:8px;color:#64748b;font-size:11px">${esc(message || 'パッチJSONを読み込むと、比較元 / 比較先の差分比較をここに表示します。')}</div>`;
}

function renderPatchJsonDiff(payload) {
  const el = getToolDocument().getElementById('u_patchJsonDiff');
  if (!el) return;
  if (!payload || !payload.sections || !Object.keys(payload.sections).length) {
    clearPatchJsonDiff();
    return;
  }
  const seq = ++patchJsonDiffSeq;
  clearTimeout(patchJsonDiffTimer);
  el.innerHTML = '<div style="padding:8px;color:#64748b;font-size:11px">JSON差分比較を描画中...</div>';
  patchJsonDiffTimer = window.setTimeout(async () => {
    try {
      const preview = buildPatchDiffPreviewPayload(payload);
      await renderRichDiff(preview.leftText, preview.rightText, el, {
        fileName: 'patch-preview.json',
        leftLabel: '比較元',
        rightLabel: '比較先',
        sideBySide: true
      });
      if (seq !== patchJsonDiffSeq) return;
    } catch (err) {
      if (seq !== patchJsonDiffSeq) return;
      el.innerHTML = `<div style="padding:8px;color:#b91c1c;font-size:11px">JSON差分比較の描画に失敗しました: ${esc(err?.message || String(err))}</div>`;
    }
  }, 120);
}

export function parsePatchJsonPayload(input) {
  const payload = typeof input === 'string' ? JSON.parse(input) : deepClone(input);
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error('パッチJSONはオブジェクト形式で入力してください');
  }
  const rawSections = payload.sections;
  if (!rawSections || typeof rawSections !== 'object' || Array.isArray(rawSections)) {
    throw new Error('パッチJSONに sections がありません');
  }
  const normalizedSections = {};
  Object.entries(rawSections).forEach(([name, rows]) => {
    const key = resolvePatchSectionKey(name);
    if (!key) return;
    normalizedSections[key] = normalizePatchRows(key, rows);
  });
  const scopeKeys = Object.keys(normalizedSections);
  if (!scopeKeys.length) throw new Error('パッチJSONに反映対象セクションがありません');
  return {
    generatedAt: payload.generatedAt || new Date().toISOString(),
    source: payload.source || {},
    target: payload.target || {},
    sections: normalizedSections
  };
}

export function renderPatchJsonSummary(payload) {
  const el = getToolDocument().getElementById('u_patchJsonSummary');
  if (!el) {
    renderPatchJsonDiff(payload);
    return;
  }
  if (!payload || !payload.sections || !Object.keys(payload.sections).length) {
    el.style.display = 'none';
    el.textContent = '';
    renderPatchJsonDiff(null);
    return;
  }
  const sectionLabels = Object.entries(payload.sections).map(([key, rows]) => {
    const def = SECTION_DEFS.find((item) => item.key === key);
    return `${def?.label || key}:${Array.isArray(rows) ? rows.length : 0}件`;
  });
  const totalRows = Object.values(payload.sections).reduce((sum, rows) => sum + (Array.isArray(rows) ? rows.length : 0), 0);
  el.textContent = `生成日時 ${payload.generatedAt || '-'} / 比較元 ${payload.source?.appId || '-'} → 比較先 ${payload.target?.appId || '-'} / ${sectionLabels.join(' / ')} / 合計 ${totalRows} 行`;
  el.style.display = 'block';
  renderPatchJsonDiff(payload);
}

export async function importPatchJsonFromFile(file) {
  const text = await readTextFile(file);
  const payload = parsePatchJsonPayload(text);
  state.importedPatchPayload = payload;
  setPatchEditorValue(payload);
  renderPatchJsonSummary(payload);
  setStatus(`パッチJSON読込完了: ${file.name}`);
  return payload;
}

export function populatePatchJsonFromCurrentDiff(options = {}) {
  if (!state.lastDiffRows.length) throw new Error('先に差分比較を実行してください');
  if (!state.lastSourceBundle || !state.lastTargetBundle) throw new Error('差分比較の比較元/比較先バンドルがありません');
  const payload = parsePatchJsonPayload(buildPatchPayload(state.lastDiffRows, state.lastSourceBundle, state.lastTargetBundle));
  state.importedPatchPayload = payload;
  const currentText = getPatchEditorText();
  if (options.force || isPatchEditorEffectivelyEmpty(currentText)) {
    setPatchEditorValue(payload);
  }
  renderPatchJsonSummary(payload);
  if (!options.silent) setStatus(`差分比較結果からパッチJSONを生成しました (${Object.keys(payload.sections).length}セクション)`);
  return payload;
}

function getPatchPayloadForApply() {
  const text = getPatchEditorText();
  if (!isPatchEditorEffectivelyEmpty(text)) {
    const payload = parsePatchJsonPayload(text);
    state.importedPatchPayload = payload;
    renderPatchJsonSummary(payload);
    return payload;
  }
  if (state.importedPatchPayload?.sections && Object.keys(state.importedPatchPayload.sections).length) {
    const payload = parsePatchJsonPayload(state.importedPatchPayload);
    renderPatchJsonSummary(payload);
    return payload;
  }
  return populatePatchJsonFromCurrentDiff({ force: true, silent: true });
}

function applyPatchRowsToSection(sectionObj, rows, secKey) {
  const previousModes = {};
  let patched = deepClone(sectionObj);
  let appliedCount = 0;
  const normalizedRows = sortRowsForPatch(rows, secKey);
  try {
    normalizedRows.forEach((row) => {
      previousModes[row._id] = state.reflectNodeModes[row._id];
      state.reflectNodeModes[row._id] = 'src';
      const result = applyDiffRowToSection(patched, row, secKey);
      patched = result.section;
      if (result.applied) appliedCount += 1;
    });
  } finally {
    normalizedRows.forEach((row) => {
      if (previousModes[row._id] == null) delete state.reflectNodeModes[row._id];
      else state.reflectNodeModes[row._id] = previousModes[row._id];
    });
  }
  return { patched, appliedCount, rows: normalizedRows };
}

export async function runApplyPatchJson() {
  const c = commonParams();
  if (!c.target.appId) throw new Error('比較先アプリIDを入力してください');
  const payload = getPatchPayloadForApply();
  const sectionKeys = Object.keys(payload.sections).filter((key) => SECTION_DEFS.find((item) => item.key === key)?.put);
  if (!sectionKeys.length) throw new Error('適用可能なパッチセクションがありません');
  renderPatchJsonSummary(payload);
  if (!kusConfirm(`JSONパッチを比較先(プレビュー)へ反映しますか？\n比較先アプリ: ${c.target.appId}\n対象セクション: ${sectionKeys.length}件`)) {
    setStatus('JSONパッチ反映をキャンセルしました');
    return;
  }
  const patchRows = Object.values(payload.sections || {}).flat().filter(Boolean);
  const patchSummary = summarizeRowsBySeverity(patchRows);
  const planReqCount = Number(state.lastApplyPlan?.totalReq || 0);
  const scopeLabels = sectionKeys.map((key) => SECTION_DEFS.find((d) => d.key === key)?.label || key);
  if (!confirmApplyRiskGuard('patch', c, { diffSummary: patchSummary, requestCount: planReqCount, scopeLabels })) {
    setStatus('JSONパッチ反映をキャンセルしました（安全確認）');
    return;
  }

  const prefix = buildApiPrefix(c.target.guestId, true);
  const app = c.target.appId;
  const stopOnError = !!ui.stopOnError?.checked;
  const lookupMap = parseLookupMapInput(ui.lookupMap.value);
  const logs = [];
  let hadError = false;

  logs.push(`比較先アプリ: ${app}`);
  logs.push(`JSONパッチ: ${sectionKeys.map((key) => SECTION_DEFS.find((item) => item.key === key)?.label || key).join(', ')}`);
  logs.push(`エラー時動作: ${stopOnError ? '中断' : '継続'}`);
  if (ui.autoBackupPreview?.checked) {
    const backup = await backupTargetPreviewSettings(c, sectionKeys, { silentStatus: true });
    logs.push(`バックアップ保存: ${backup.filename}`);
  }
  logs.push('');

  const sectionResults = [];
  for (let i = 0; i < sectionKeys.length; i++) {
    const secKey = sectionKeys[i];
    const def = SECTION_DEFS.find((item) => item.key === secKey);
    const rows = payload.sections[secKey] || [];
    if (!def || !def.put || !rows.length) continue;
    setStatus(`JSONパッチ反映中 ${i + 1}/${sectionKeys.length}: ${def.label}`);
    renderProgressLog(logs, { phase: 'JSONパッチ反映中', current: i, total: sectionKeys.length });
    try {
      const current = normalize(await apiGet(prefix, def.endpoint, { app }));
      const before = deepClone(current);
      const { patched, appliedCount, rows: sortedRows } = applyPatchRowsToSection(current, rows, secKey);

      if (secKey === 'fieldSettings') {
        const beforeProps = before.properties || before || {};
        const afterProps = patched.properties || patched || {};
        const sourceModeCodes = new Set(sortedRows.map(extractFieldCodeFromRowPath).filter(Boolean));
        await applyFieldSectionDiff(prefix, app, beforeProps, afterProps, logs, lookupMap, sourceModeCodes, stopOnError);
      } else if (secKey === 'viewSettings') {
        await applyViewsSectionDiff(prefix, app, before.views || before || {}, patched.views || patched || {}, logs, stopOnError);
      } else if (secKey === 'reportSettings') {
        await applyReportsSectionDiff(prefix, app, before.reports || before || {}, patched.reports || patched || {}, logs, stopOnError);
      } else if (secKey === 'actionSettings') {
        await applyActionsSectionDiff(prefix, app, before.actions || before || {}, patched.actions || patched || {}, logs, stopOnError);
      } else {
        const reqs = [{ method: 'PUT', path: def.endpoint, body: { app, ...def.putBuilder(patched) }, note: `${def.label} put` }];
        appendRequestPlanLogs(logs, { requests: reqs });
        await executeRequestPlan(prefix, reqs, logs, stopOnError);
      }
      logs.push(`OK ${def.label}: patch ${appliedCount}/${sortedRows.length}`);
      recordSectionResult(sectionResults, secKey, def.label, 'ok', `${appliedCount}/${sortedRows.length}`);
    } catch (e) {
      hadError = true;
      const msg = e.message || String(e);
      logs.push(`NG ${def.label}: ${msg}`);
      recordSectionResult(sectionResults, secKey, def.label, 'ng', msg);
      if (stopOnError) {
        logs.push('中断: エラーが発生したため処理を停止しました');
        break;
      }
    }
  }

  appendProgressSummary(logs);
  renderProgressLog(logs, { phase: 'JSONパッチ反映完了' });
  commitApplyReport({
    mode: 'patch',
    appId: app,
    scopes: sectionKeys,
    sectionResults,
    hadError,
    sourceAppId: c.source.appId,
    sourceGuestId: c.source.guestId,
    targetGuestId: c.target.guestId
  });
  renderReflectAssistPanel();
  renderReflectMainPanel();
  setStatus(hadError ? 'JSONパッチ反映完了（一部エラーあり）' : 'JSONパッチ反映完了');
}

export function runReflectModeAll(mode) {
  if (!state.reflectRows.length) {
    setStatus('反映ノードが読込されていません');
    return;
  }
  const selected = getSelectedReflectRows();
  if (!selected.length) {
    setStatus('ノードが選択されていません');
    return;
  }
  pushReflectUndo();
  let count = 0;
  for (const r of selected) {
    if (state.reflectNodeModes[r._id] !== mode) {
      state.reflectNodeModes[r._id] = mode;
      count++;
    }
  }
  renderReflectNodeList();
  setStatus(`選択中ノード(${selected.length}件)のうち、${count}件を ${mode === 'src' ? '比較元' : '比較先'} に一括変更しました`);
}

export async function runApplyPreviewByNodes() {
  await ensureDiffPreparedForReflect();
  const c = commonParams();
  if (!c.target.appId) throw new Error('比較先アプリIDを入力してください');
  if (!state.reflectRows.length) loadReflectRowsFromLastDiff();
  const rows = getSelectedReflectRows();
  if (!rows.length) throw new Error('反映ノードを選択してください');
  const lookupMap = parseLookupMapInput(ui.lookupMap.value);
  const stopOnError = !!ui.stopOnError.checked;
  saveCurrentDialogState();
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
  const nodeScopes = [...new Set(rows.map((r) => r.sectionKey).filter(Boolean))];
  const appIdRefs = state.lastSourceBundle ? extractReferencedAppIds(state.lastSourceBundle, nodeScopes, lookupMap) : [];
  const approved = await ensureApplyPlanApproved(planSignature, 'nodes', runPreviewApplyPlanNodes, { appIdRefs });
  if (!approved) {
    setStatus('反映をキャンセルしました');
    return;
  }
  const nodeSummary = summarizeRowsBySeverity(rows);
  const plannedReq = Number(state.lastApplyPlan?.signature === planSignature ? state.lastApplyPlan.totalReq : 0);
  const nodeScopeLabels = nodeScopes.map((key) => SECTION_DEFS.find((d) => d.key === key)?.label || key);
  if (!confirmApplyRiskGuard('nodes', c, { diffSummary: nodeSummary, requestCount: plannedReq, scopeLabels: nodeScopeLabels })) {
    setStatus('反映をキャンセルしました（安全確認）');
    return;
  }

  const prefix = buildApiPrefix(c.target.guestId, true);
  const app = c.target.appId;
  const logs = [];
  let hadError = false;
  setStatus('反映前チェック中...');
  const recheck = await assertTargetPreviewMatchesPlannedBaseline(prefix, app, nodeScopes);
  const srcModeCount = rows.filter((r) => reflectRowModeById(r._id) === 'src').length;
  const tgtModeCount = rows.length - srcModeCount;
  logs.push(`比較先アプリ: ${app}`);
  logs.push(`ノードモード選択数: ${rows.length}`);
  logs.push(`モード内訳: 比較元 ${srcModeCount} / 比較先 ${tgtModeCount}`);
  logs.push(`エラー時動作: ${stopOnError ? '中断' : '継続'}`);
  if (recheck.checked.length) logs.push(`反映前チェック: ${formatSectionList(recheck.checked)} はプラン確認時から変更なし`);
  if (recheck.skipped.length) logs.push(`反映前チェック(未判定): ${formatSectionList(recheck.skipped)}`);
  if (ui.autoBackupPreview?.checked) {
    const backupScopes = [...new Set(rows.map((r) => r.sectionKey).filter(Boolean))];
    const backup = await backupTargetPreviewSettings(c, backupScopes, { silentStatus: true });
    logs.push(`バックアップ保存: ${backup.filename}`);
  }
  logs.push('');

  const bySection = {};
  for (const row of rows) {
    if (!row.sectionKey) continue;
    if (!bySection[row.sectionKey]) bySection[row.sectionKey] = [];
    bySection[row.sectionKey].push(row);
  }

  const sectionKeys = Object.keys(bySection);
  const sectionResults = [];
  for (let i = 0; i < sectionKeys.length; i++) {
    const secKey = sectionKeys[i];
    const def = SECTION_DEFS.find((d) => d.key === secKey);
    if (!def || !def.put) {
      logs.push(`SKIP ${def?.label || secKey}: PUT非対応`);
      recordSectionResult(sectionResults, secKey, def?.label || secKey, 'skipped', 'PUT非対応');
      renderProgressLog(logs, { phase: 'ノード反映実行中', current: i, total: sectionKeys.length });
      continue;
    }

    setStatus(`ノード反映中 ${i + 1}/${sectionKeys.length}: ${def.label}`);
    renderProgressLog(logs, { phase: 'ノード反映実行中', current: i, total: sectionKeys.length });
    try {
      const current = normalize(await apiGet(prefix, def.endpoint, { app }));
      const before = deepClone(current);
      let patched = deepClone(current);
      const rowsInSection = sortRowsForPatch(bySection[secKey], secKey);
      let appliedCount = 0;

      for (const row of rowsInSection) {
        const r = applyDiffRowToSection(patched, row, secKey);
        patched = r.section;
        if (r.applied) appliedCount += 1;
      }

      if (secKey === 'fieldSettings') {
        const beforeProps = before.properties || before || {};
        const afterProps = patched.properties || patched || {};
        const sourceModeCodes = new Set(
          rowsInSection
            .filter((row) => reflectRowModeById(row._id) === 'src')
            .map(extractFieldCodeFromRowPath)
            .filter(Boolean)
        );
        await applyFieldSectionDiff(prefix, app, beforeProps, afterProps, logs, lookupMap, sourceModeCodes, stopOnError);
        logs.push(`OK ${def.label}: node ${appliedCount}/${rowsInSection.length}`);
      } else if (secKey === 'viewSettings') {
        const beforeViews = before.views || before || {};
        const afterViews = patched.views || patched || {};
        await applyViewsSectionDiff(prefix, app, beforeViews, afterViews, logs, stopOnError);
        logs.push(`OK ${def.label}: node ${appliedCount}/${rowsInSection.length}`);
      } else if (secKey === 'reportSettings') {
        const beforeReports = before.reports || before || {};
        const afterReports = patched.reports || patched || {};
        await applyReportsSectionDiff(prefix, app, beforeReports, afterReports, logs, stopOnError);
        logs.push(`OK ${def.label}: node ${appliedCount}/${rowsInSection.length}`);
      } else if (secKey === 'actionSettings') {
        const beforeActions = before.actions || before || {};
        const afterActions = patched.actions || patched || {};
        await applyActionsSectionDiff(prefix, app, beforeActions, afterActions, logs, stopOnError);
        logs.push(`OK ${def.label}: node ${appliedCount}/${rowsInSection.length}`);
      } else {
        const reqs = [{ method: 'PUT', path: def.endpoint, body: { app, ...def.putBuilder(patched) }, note: `${def.label} put` }];
        appendRequestPlanLogs(logs, { requests: reqs });
        await executeRequestPlan(prefix, reqs, logs, stopOnError);
        logs.push(`OK ${def.label}: node ${appliedCount}/${rowsInSection.length}`);
      }
      recordSectionResult(sectionResults, secKey, def.label, 'ok', `${appliedCount}/${rowsInSection.length}`);
    } catch (e) {
      hadError = true;
      const msg = e.message || String(e);
      logs.push(`NG ${def.label}: ${msg}`);
      recordSectionResult(sectionResults, secKey, def.label, 'ng', msg);
      if (stopOnError) {
        logs.push('中断: エラーが発生したため処理を停止しました');
        break;
      }
    }
  }

  appendProgressSummary(logs);
  renderProgressLog(logs, { phase: 'ノード反映完了' });
  commitApplyReport({
    mode: 'nodes',
    appId: app,
    scopes: sectionKeys,
    sectionResults,
    hadError,
    sourceAppId: c.source.appId,
    sourceGuestId: c.source.guestId,
    targetGuestId: c.target.guestId
  });
  renderReflectAssistPanel();
  renderReflectMainPanel();
  setStatus('ノード反映処理完了');
}

export async function runApplyPreview() {
  if (isReflectNodeModeEffective()) return runApplyPreviewByNodes();
  await ensureDiffPreparedForReflect();
  const c = commonParams();
  if (!c.target.appId) throw new Error('比較先アプリIDを入力してください');
  const lookupMap = parseLookupMapInput(ui.lookupMap.value);
  const baseScopes = selectedScopeKeys(ui.applyScopes);
  if (!baseScopes.length) throw new Error('反映するセクションを選択してください');
  const scopes = resolveApplyScopes(baseScopes);
  const planSignature = makeApplyPlanSignature('section', {
    targetApp: c.target.appId,
    targetGuest: c.target.guestId,
    sourceApp: c.source.appId,
    sourceGuest: c.source.guestId,
    scopes,
    lookupMap: ui.lookupMap.value.trim()
  });
  const appIdRefs = state.lastSourceBundle ? extractReferencedAppIds(state.lastSourceBundle, scopes, lookupMap) : [];
  const approved = await ensureApplyPlanApproved(planSignature, 'section', runPreviewApplyPlan, { appIdRefs });
  if (!approved) {
    setStatus('反映をキャンセルしました');
    return;
  }
  const actualRows = (state.lastDiffRows || []).filter((row) => row && !row._displayOnly && scopes.includes(row.sectionKey));
  const sectionSummary = summarizeRowsBySeverity(actualRows);
  const plannedReq = Number(state.lastApplyPlan?.signature === planSignature ? state.lastApplyPlan.totalReq : 0);
  const scopeLabels = scopes.map((key) => SECTION_DEFS.find((d) => d.key === key)?.label || key);
  if (!confirmApplyRiskGuard('section', c, { diffSummary: sectionSummary, requestCount: plannedReq, scopeLabels })) {
    setStatus('反映をキャンセルしました（安全確認）');
    return;
  }
  saveCurrentDialogState();
  const sourceBundle = await getSourceBundleForApply(c, scopes);

  const prefix = buildApiPrefix(c.target.guestId, true);
  const app = c.target.appId;
  const stopOnError = !!ui.stopOnError.checked;
  const logs = [];
  let hadError = false;
  setStatus('反映前チェック中...');
  const recheck = await assertTargetPreviewMatchesPlannedBaseline(prefix, app, scopes);
  logs.push(`比較先アプリ: ${app}`);
  logs.push(`適用セクション: ${scopes.map((k) => SECTION_DEFS.find((d) => d.key === k)?.label || k).join(', ')}`);
  logs.push(`エラー時動作: ${stopOnError ? '中断' : '継続'}`);
  if (recheck.checked.length) logs.push(`反映前チェック: ${formatSectionList(recheck.checked)} はプラン確認時から変更なし`);
  if (recheck.skipped.length) logs.push(`反映前チェック(未判定): ${formatSectionList(recheck.skipped)}`);
  if (ui.autoBackupPreview?.checked) {
    const backup = await backupTargetPreviewSettings(c, scopes, { silentStatus: true });
    logs.push(`バックアップ保存: ${backup.filename}`);
  }
  logs.push('');

  const sectionResults = [];
  hadError = await applySectionsLoop(prefix, app, sourceBundle, scopes, logs, lookupMap, stopOnError, {
    phaseLabel: '反映',
    onProgress: (i, total) => renderProgressLog(logs, { phase: 'プレビュー反映実行中', current: i, total }),
    sectionResults
  });

  appendProgressSummary(logs);
  renderProgressLog(logs, { phase: 'プレビュー反映完了' });
  commitApplyReport({
    mode: 'section',
    appId: app,
    scopes,
    sectionResults,
    hadError,
    sourceAppId: c.source.appId,
    sourceGuestId: c.source.guestId,
    targetGuestId: c.target.guestId
  });
  renderReflectAssistPanel();
  renderReflectMainPanel();
  setStatus('プレビュー反映処理完了');
}

export async function runBackupTargetPreview() {
  const c = commonParams();
  const scopes = resolveBackupScopes(c);
  await backupTargetPreviewSettings(c, scopes);
  renderReflectAssistPanel();
}

export async function runRestoreTargetPreviewBackup() {
  const c = commonParams();
  if (!c.target.appId) throw new Error('比較先アプリIDを入力してください');
  if (!state.lastPreviewBackupPayload?.bundle?.sections) {
    throw new Error('このセッションで復元できるバックアップがありません。先に「バックアップ」を実行してください');
  }

  const restorePayload = deepClone(state.lastPreviewBackupPayload);
  const restoreFilename = state.lastPreviewBackupFilename || 'session-backup.json';
  const backupTarget = restorePayload.target || {};
  if (String(backupTarget.appId || '') !== String(c.target.appId || '')) {
    throw new Error(`比較先アプリがバックアップ取得時と異なります。現在: ${c.target.appId || '-'} / バックアップ: ${backupTarget.appId || '-'}`);
  }
  if (String(backupTarget.guestId || '') !== String(c.target.guestId || '')) {
    throw new Error('比較先ゲストIDがバックアップ取得時と異なります。同じ接続先で実行してください');
  }

  const backupBundle = ensureBundleShape(restorePayload.bundle);
  const scopes = Array.isArray(restorePayload.scopes) && restorePayload.scopes.length
    ? restorePayload.scopes.filter(Boolean)
    : Object.keys(backupBundle.sections || {});
  if (!scopes.length) throw new Error('復元対象セクションがありません');

  const labels = formatSectionList(scopes);
  if (!kusConfirm(`直前バックアップを比較先(プレビュー)へ復元しますか？\n比較先アプリ: ${c.target.appId}\n対象セクション: ${labels || '-'}`)) {
    setStatus('バックアップ復元をキャンセルしました');
    return;
  }

  const prefix = buildApiPrefix(c.target.guestId, true);
  const app = c.target.appId;
  const stopOnError = !!ui.stopOnError?.checked;
  const logs = [];
  logs.push(`比較先アプリ: ${app}`);
  logs.push(`復元元バックアップ: ${restoreFilename}`);
  logs.push(`復元セクション: ${labels || '-'}`);
  logs.push(`エラー時動作: ${stopOnError ? '中断' : '継続'}`);
  if (ui.autoBackupPreview?.checked) {
    const beforeRestoreBackup = await backupTargetPreviewSettings(c, scopes, { silentStatus: true });
    logs.push(`復元前バックアップ保存: ${beforeRestoreBackup.filename}`);
  }
  logs.push('');

  const sectionResults = [];
  const hadError = await applySectionsLoop(prefix, app, backupBundle, scopes, logs, {}, stopOnError, {
    phaseLabel: 'バックアップ復元',
    onProgress: (i, total) => renderProgressLog(logs, { phase: 'バックアップ復元中', current: i, total }),
    sectionResults
  });

  appendProgressSummary(logs);
  renderProgressLog(logs, { phase: 'バックアップ復元完了' });
  commitApplyReport({
    mode: 'restore',
    appId: app,
    scopes,
    sectionResults,
    hadError,
    sourceAppId: c.source?.appId,
    sourceGuestId: c.source?.guestId,
    targetGuestId: c.target?.guestId
  });
  renderReflectAssistPanel();
  renderReflectMainPanel();
  setStatus(hadError ? 'バックアップ復元で一部エラーが発生しました' : '直前バックアップから復元しました');
}

export async function runDeployOnly() {
  const msg = 'ツールからのデプロイAPI実行は無効です。プレビューへの反映後、本番へのデプロイはkintone管理画面から手動で行ってください。';
  setStatus(msg, true);
  if (ui.result) {
    ui.result.innerHTML = `<pre style="margin:0;padding:10px;font-size:12px;white-space:pre-wrap">${esc(msg)}</pre>`;
  }
}

/**
 * 直前の反映結果で失敗したセクションだけを再反映します。
 * セクション単位モードで実行した直近の結果に失敗があった場合に、
 * 対応する `fieldSettings` / `viewSettings` 等だけを再取得・再送信します。
 */
export async function runRetryFailedSections() {
  const report = state.lastApplyReport;
  if (!report) throw new Error('直近の反映結果がありません。まず反映を実行してください');
  const failed = (report.failedSectionKeys || []).filter(Boolean);
  if (!failed.length) {
    setStatus('失敗セクションはありません（再実行不要）');
    return;
  }
  const c = commonParams();
  if (!c.target.appId) throw new Error('比較先アプリIDを入力してください');
  if (String(c.target.appId) !== String(report.appId || '')) {
    throw new Error(`現在の比較先アプリIDが直近の反映時と異なります（今: ${c.target.appId} / 前回: ${report.appId}）。同じアプリで再実行してください`);
  }
  const failedLabels = failed.map((k) => SECTION_DEFS.find((d) => d.key === k)?.label || k).join(', ');
  if (!kusConfirm(`直前に失敗したセクションだけ再反映します。\n対象: ${failedLabels}\n比較先アプリ: ${c.target.appId}\n\n実行しますか？`)) {
    setStatus('失敗セクション再実行をキャンセルしました');
    return;
  }

  const sourceBundle = await getSourceBundleForApply(c, failed);
  const prefix = buildApiPrefix(c.target.guestId, true);
  const app = c.target.appId;
  const stopOnError = !!ui.stopOnError?.checked;
  const lookupMap = parseLookupMapInput(ui.lookupMap?.value || '');
  const logs = [];
  logs.push(`比較先アプリ: ${app}`);
  logs.push(`再反映セクション（前回NG）: ${failedLabels}`);
  logs.push(`エラー時動作: ${stopOnError ? '中断' : '継続'}`);
  if (ui.autoBackupPreview?.checked) {
    const backup = await backupTargetPreviewSettings(c, failed, { silentStatus: true });
    logs.push(`バックアップ保存: ${backup.filename}`);
  }
  logs.push('');

  const sectionResults = [];
  const hadError = await applySectionsLoop(prefix, app, sourceBundle, failed, logs, lookupMap, stopOnError, {
    phaseLabel: '再反映',
    onProgress: (i, total) => renderProgressLog(logs, { phase: '失敗セクション再反映中', current: i, total }),
    sectionResults
  });
  appendProgressSummary(logs);
  renderProgressLog(logs, { phase: '失敗セクション再反映完了' });
  commitApplyReport({
    mode: 'retry',
    appId: app,
    scopes: failed,
    sectionResults,
    hadError,
    sourceAppId: c.source.appId,
    sourceGuestId: c.source.guestId,
    targetGuestId: c.target.guestId
  });
  renderReflectAssistPanel();
  renderReflectMainPanel();
  setStatus(hadError ? '失敗セクション再反映: 一部エラーあり' : '失敗セクション再反映: 完了');
}
