'use strict';

import { SECTION_DEFS, SYSTEM_FIELD_TYPES } from '../constants.js';
import {
  deepClone, normalize, stableStringify, downloadText, downloadBlob, apiErrorWithContext, esc, readTextFile,
  relativePathFromRow, tokenizePath, kusConfirm, buildExportFilename, buildAppFilenameLabel, extractAppNameFromBundle,
  showToast
} from '../utils.js';
import { state, ui, pushReflectApplyHistoryEntry } from '../state.js';
import {
  apiGet,
  assertAllowsMutatingRestCall,
  buildApiPrefix,
  fetchBundle,
  extractSectionRevision,
  ensureBundleShape,
  isRetriableMutation,
  computeRetryDelayMs,
  resolveHttpStatus
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
  appendProgressSummary
} from './helpers.js';
import { reflectRowModeById, reflectRowDesiredValue } from './rowMode.js';
import { summarizePlanDeletes, assessApplyRisk } from './planInsights.js';
import { isReflectNodeModeEffective } from './nodeModeUi.js';
import { getToolDocument } from '../ui/dialog.js';
import { getJsonEditorInstance, renderRichDiff } from '../oss_integrations.js';
import { confirmDestructive, bumpSessionMetric, startProgress, renderHumanizedError } from '../ui/psychology.js';
import { loadJSZip } from '../tabs/record.js';

export { reflectRowModeById, reflectRowDesiredValue } from './rowMode.js';

let patchJsonDiffTimer = 0;
let patchJsonDiffSeq = 0;
export const APPLY_GUARD_DIFF_THRESHOLD = 100;
export const APPLY_GUARD_REQUEST_THRESHOLD = 80;

// Lookup 変換ルール（変換先アプリ）の存在確認 — リリース直前の typo を検知。
// セッションをまたいだ古いキャッシュで誤検知しないよう TTL 付きにし、
// 失敗側だけ TTL を短く（=リトライしやすく）する。
const LOOKUP_CACHE_TTL_OK_MS = 5 * 60 * 1000;   // 5 分
const LOOKUP_CACHE_TTL_NG_MS = 60 * 1000;       // 1 分（typo 修正後すぐに再試行できる）
interface LookupCacheEntry { ok: boolean; at: number; }
const _lookupPreflightCache = new Map<string, LookupCacheEntry>();


function getLookupCache(cacheKey: string, now: number): LookupCacheEntry | undefined {
  const hit = _lookupPreflightCache.get(cacheKey);
  if (!hit) return undefined;
  const ttl = hit.ok ? LOOKUP_CACHE_TTL_OK_MS : LOOKUP_CACHE_TTL_NG_MS;
  if (now - hit.at > ttl) {
    _lookupPreflightCache.delete(cacheKey);
    return undefined;
  }
  return hit;
}

async function preflightLookupMap(lookupMap, prefix) {
  const entries = Object.entries(lookupMap || ({} as any));
  if (!entries.length) return { ok: true, missing: [] };
  const missing: any[] = [];
  const now = Date.now();
  for (const [from, to] of entries) {
    const target = String(to || '').trim();
    if (!target || !/^\d+$/.test(target)) {
      missing.push({ from, to: target, reason: 'AppID 形式が不正' });
      continue;
    }
    const cacheKey = `${prefix}::${target}`;
    const cached = getLookupCache(cacheKey, now);
    if (cached) {
      if (cached.ok === false) {
        missing.push({ from, to: target, reason: '変換先アプリが見つかりません（キャッシュ）' });
      }
      continue;
    }
    try {
      await apiGet(prefix, '/app.json', { id: target });
      _lookupPreflightCache.set(cacheKey, { ok: true, at: Date.now() });
    } catch (e) {
      _lookupPreflightCache.set(cacheKey, { ok: false, at: Date.now() });
      missing.push({ from, to: target, reason: `取得失敗: ${e?.message || String(e)}` });
    }
  }
  return { ok: missing.length === 0, missing };
}

async function assertLookupMapPreflight(lookupMap, prefix) {
  const result = await preflightLookupMap(lookupMap, prefix);
  if (result.ok) return;
  const lines = result.missing.map((m) => ` - ${m.from} → ${m.to || '(空)'}: ${m.reason}`);
  const message = `Lookup 変換ルールに問題があります:\n${lines.join('\n')}\n\n[OK] 続行 / [キャンセル] 中断（失敗キャッシュは約1分で自動失効し、再実行時に再判定されます）`;
  if (!kusConfirm(message)) {
    throw new Error('Lookup 変換ルールのプリフライトで中断しました');
  }
}

export function convertLookupAppIds(fieldDef, map) {
  const def = deepClone(fieldDef || ({} as any));
  const lookupMap = map || ({} as any);
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
  const refs: any[] = [];
  const map = lookupMap || ({} as any);
  const scopeSet = new Set(scopes || []);
  const fields = sourceBundle?.sections?.fieldSettings?.properties || ({} as any);
  if (scopeSet.has('fieldSettings') || scopeSet.size === 0) {
    const walkFields = (fieldMap: any, parent: string | null) => {
      for (const [code, f] of Object.entries(fieldMap || ({} as any) as Array<[string, any]>) as Array<[string, any]>) {
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
  const actions = sourceBundle?.sections?.actionSettings?.actions || ({} as any);
  if (scopeSet.has('actionSettings') || scopeSet.size === 0) {
    for (const [name, a] of Object.entries(actions) as Array<[string, any]>) {
      if (a.destApp && a.destApp.app) {
        const appId = String(a.destApp.app);
        refs.push({ fieldCode: name, refAppId: appId, convertedAppId: null, section: 'アクション設定', type: 'アクション' });
      }
    }
  }
  return refs;
}

export function filterWritableFieldProps(props: any, skipSystem: boolean): any {
  if (!skipSystem) return deepClone(props || ({} as any));
  const out: Record<string, any> = {};
  for (const [k, def] of Object.entries(props || ({} as any) as Array<[string, any]>) as Array<[string, any]>) {
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

const APPLY_RETRY_MAX_ATTEMPTS = 3;
const APPLY_RETRY_BASE_DELAY_MS = 600;
const APPLY_RETRY_MAX_DELAY_MS = 4000;

export async function executeRequestPlan(prefix, requests, logs, stopOnError) {
  const list = Array.isArray(requests) ? requests : [];
  for (let i = 0; i < list.length; i++) {
    const req = list[i];
    try {
      // Permission check is synchronous and not retriable — fail fast.
      assertAllowsMutatingRestCall(prefix, req.path, req.method);
      let _err: any = null;
      let _attempts = 0;
      for (let _r = 0; _r < APPLY_RETRY_MAX_ATTEMPTS; _r++) {
        _attempts = _r + 1;
        try {
          await (kintone as any).api(`${prefix}${req.path}`, req.method, req.body);
          _err = null;
          break;
        }
        catch (re) {
          _err = re;
          // 4xx は副作用が確定している可能性があるため一律リトライ不可（POST/DELETE）。
          // 5xx / ネットワーク系のみリトライ。PUT は冪等のため 408/429 もリトライ可。
          const canRetry = (_r < APPLY_RETRY_MAX_ATTEMPTS - 1) && isRetriableMutation(req.method, re);
          if (!canRetry) break;
          const waitMs = computeRetryDelayMs(_r, APPLY_RETRY_BASE_DELAY_MS, APPLY_RETRY_MAX_DELAY_MS);
          if (logs) logs.push(`  - retry ${req.method} ${req.path} (attempt ${_r + 2}/${APPLY_RETRY_MAX_ATTEMPTS}, status ${resolveHttpStatus(re) || 'n/a'}, wait ${waitMs}ms)`);
          await new Promise((r) => setTimeout(r, waitMs));
        }
      }
      if (_err) throw apiErrorWithContext(_err, { method: req.method, prefix, path: req.path, payload: req.body });
      if (logs) {
        const retrySuffix = _attempts > 1 ? ` (retried ${_attempts - 1}回)` : '';
        logs.push(`  - OK ${req.method} ${req.path}${req.note ? ` (${req.note})` : ''}${retrySuffix}`);
      }
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

export interface ApplySectionsLoopOptions {
  phaseLabel?: string;
  onProgress?: (idx: number, total: number, label?: string) => void;
  sectionResults?: any[];
}

export async function applySectionsLoop(prefix: string, app: string | number, sourceBundle: any, scopes: string[], logs: string[], lookupMap: any, stopOnError: boolean, { phaseLabel = '反映', onProgress, sectionResults }: ApplySectionsLoopOptions = {}) {
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
      // セクション反映は「current = before, sourceSec から構築した after = patched」を applySectionDiffByKey に渡す。
      // fieldSettings は after を filterWritableFieldProps で絞り込むため、ここで wrap する。
      let before: any = null;
      let patched: any = null;
      if (secKey === 'fieldSettings') {
        const current = await apiGet(prefix, '/app/form/fields.json', { app });
        before = current;
        patched = { properties: filterWritableFieldProps(sourceSec.properties || sourceSec, true) };
      } else if (secKey === 'viewSettings') {
        const current = await apiGet(prefix, '/app/views.json', { app });
        before = current;
        patched = { views: sourceSec.views || sourceSec || ({} as any) };
      } else if (secKey === 'reportSettings') {
        const current = await apiGet(prefix, '/app/reports.json', { app });
        before = current;
        patched = { reports: sourceSec.reports || sourceSec || ({} as any) };
      } else if (secKey === 'actionSettings') {
        const current = await apiGet(prefix, '/app/actions.json', { app });
        before = current;
        patched = { actions: sourceSec.actions || sourceSec || ({} as any) };
      } else {
        before = null;
        patched = sourceSec;
      }
      await applySectionDiffByKey({ secKey, def, prefix, app, before, patched, logs, lookupMap, sourceModeCodes: null, stopOnError });
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

// 反映完了直後に「反映前バックアップ」と「反映後の比較先プレビュー」を比較し、
// バックアップ時点から変化したセクションをログに追記する。
// プラン (state.lastApplyPlan.plannedRequests) と突き合わせて、想定通りの変化と
// 想定外の変化（=他者による同時編集や副作用の疑い）を分離して報告する。
async function verifyAppliedAgainstBackup({ targetGuestId, targetAppId, scopes, logs }: { targetGuestId: string; targetAppId: string; scopes: string[]; logs: string[] }) {
  const backup = state.lastPreviewBackupPayload;
  if (!backup?.bundle?.sections) return null;
  if (String(backup?.target?.appId || '') !== String(targetAppId || '')) return null;
  if (String(backup?.target?.guestId || '') !== String(targetGuestId || '')) return null;
  const targetScopes = [...new Set((scopes || []).filter(Boolean))];
  const backupScopes = Array.isArray(backup?.scopes) ? backup.scopes : Object.keys(backup.bundle.sections || ({} as any));
  const checkable = targetScopes.filter((key) => backupScopes.includes(key));
  if (!checkable.length) return null;

  const expectedSectionKeys = new Set<string>(
    Array.isArray(state.lastApplyPlan?.plannedRequests)
      ? state.lastApplyPlan.plannedRequests
        .map((r: any) => String(r?.sectionKey || ''))
        .filter(Boolean)
      : []
  );

  const prefix = buildApiPrefix(targetGuestId, true);
  const findings: any[] = [];
  for (const secKey of checkable) {
    const def = SECTION_DEFS.find((item) => item.key === secKey);
    if (!def) continue;
    try {
      const after = normalize(await apiGet(prefix, def.endpoint, { app: targetAppId }));
      const before = backup.bundle.sections[secKey];
      if (!before) continue;
      const beforeText = stableStringify(before);
      const afterText = stableStringify(after);
      if (beforeText !== afterText) {
        findings.push({
          sectionKey: secKey,
          label: def.label || secKey,
          expected: expectedSectionKeys.has(secKey)
        });
      }
    } catch (e) {
      findings.push({
        sectionKey: secKey,
        label: def.label || secKey,
        error: e?.message || String(e)
      });
    }
  }

  const expectedChanges = findings.filter((x) => !x.error && x.expected);
  const unexpectedChanges = findings.filter((x) => !x.error && !x.expected);
  const fetchErrors = findings.filter((x) => !!x.error);

  if (Array.isArray(logs)) {
    if (!findings.length) {
      logs.push('反映後検証: バックアップ時点からの変化は検出されませんでした');
    } else {
      if (expectedChanges.length) {
        logs.push(`反映後検証: 想定通りの変化 ${expectedChanges.length} セクション`);
        for (const item of expectedChanges) {
          logs.push(`  - ${item.label}: プラン通りに変化（OK）`);
        }
      }
      if (unexpectedChanges.length) {
        logs.push(`反映後検証: ⚠ 想定外の変化 ${unexpectedChanges.length} セクション（同時編集の疑い）`);
        for (const item of unexpectedChanges) {
          logs.push(`  - ${item.label}: プランに含まれていないが内容が変化`);
        }
      }
      if (fetchErrors.length) {
        logs.push(`反映後検証: 取得失敗 ${fetchErrors.length} セクション`);
        for (const item of fetchErrors) {
          logs.push(`  - ${item.label}: ${item.error}`);
        }
      }
    }
  }
  return {
    checked: checkable.length,
    findings,
    expectedCount: expectedChanges.length,
    unexpectedCount: unexpectedChanges.length,
    errorCount: fetchErrors.length
  };
}

/**
 * セクションキーごとの「before / patched」を受け取り、適切な applyXxxSectionDiff
 * 呼び出しに振り分ける共通処理。runApplyPatchJson / runApplyPreviewByNodes が
 * 個別に持っていた巨大な if-else の重複を解消するためのヘルパー。
 */
async function applySectionDiffByKey(opts: {
  secKey: string;
  def: any;
  prefix: string;
  app: string | number;
  before: any;
  patched: any;
  logs: string[];
  lookupMap: any;
  sourceModeCodes: Set<string> | null;
  stopOnError: boolean;
}): Promise<void> {
  const { secKey, def, prefix, app, before, patched, logs, lookupMap, sourceModeCodes, stopOnError } = opts;
  if (secKey === 'fieldSettings') {
    const beforeProps = before?.properties || before || ({} as any);
    const afterProps = patched?.properties || patched || ({} as any);
    await applyFieldSectionDiff(prefix, app, beforeProps, afterProps, logs, lookupMap, sourceModeCodes, stopOnError);
    return;
  }
  if (secKey === 'viewSettings') {
    const beforeViews = before?.views || before || ({} as any);
    const afterViews = patched?.views || patched || ({} as any);
    await applyViewsSectionDiff(prefix, app, beforeViews, afterViews, logs, stopOnError);
    return;
  }
  if (secKey === 'reportSettings') {
    const beforeReports = before?.reports || before || ({} as any);
    const afterReports = patched?.reports || patched || ({} as any);
    await applyReportsSectionDiff(prefix, app, beforeReports, afterReports, logs, stopOnError);
    return;
  }
  if (secKey === 'actionSettings') {
    const beforeActions = before?.actions || before || ({} as any);
    const afterActions = patched?.actions || patched || ({} as any);
    await applyActionsSectionDiff(prefix, app, beforeActions, afterActions, logs, stopOnError);
    return;
  }
  const reqs = [{
    method: 'PUT',
    path: def.endpoint,
    body: { app, ...((def.putBuilder as any)?.(patched) || {}) },
    note: `${def.label} put`
  }];
  appendRequestPlanLogs(logs, { requests: reqs });
  await executeRequestPlan(prefix, reqs, logs, stopOnError);
}

/**
 * 反映完了直後の共通仕上げ処理（バックアップ突合 → 進捗集計 → レポート確定 → UI 再描画）。
 * ノード反映 / セクション反映 / パッチ反映の終端がほぼ同じだったため共通化。
 */
async function finalizeApplyResult(opts: {
  mode: string;
  c: any;
  app: string | number;
  scopes: string[];
  sectionResults: any[];
  hadError: boolean;
  logs: string[];
  progress?: any;
  backupFilename?: string;
  phaseLabel?: string;
  finishMetrics?: Array<{ label: string; value: string; tone?: string }>;
}): Promise<void> {
  const { mode, c, app, scopes, sectionResults, hadError, logs, progress, backupFilename, phaseLabel, finishMetrics } = opts;
  // verifyAppliedAgainstBackup の失敗で commitApplyReport がスキップされないように保護する。
  // 反映自体は完了している可能性があるため、検証失敗はログに残すだけで処理は継続する。
  try {
    await verifyAppliedAgainstBackup({ targetGuestId: c.target.guestId, targetAppId: app as any, scopes, logs });
  } catch (verifyErr: any) {
    if (Array.isArray(logs)) {
      logs.push(`反映後検証: ⚠ 検証中にエラーが発生しました: ${verifyErr?.message || String(verifyErr)}`);
    }
  }
  appendProgressSummary(logs);
  renderProgressLog(logs, { phase: phaseLabel || '反映完了', scopes });
  commitApplyReport({
    mode,
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
  if (progress) {
    progress.finish({
      title: hadError ? `${phaseLabel || '反映'} 完了（一部エラー）` : `${phaseLabel || '反映'} 完了`,
      hasError: hadError,
      metrics: finishMetrics || [
        { label: '比較先アプリ', value: `#${app}` },
        { label: '結果', value: hadError ? '一部失敗' : '全成功', tone: hadError ? 'warn' : 'ok' }
      ],
      hint: backupFilename
        ? `バックアップ保存先: ${backupFilename}\n本番デプロイは kintone 管理画面から手動で実施してください。`
        : '本番デプロイは kintone 管理画面から手動で実施してください。'
    });
  }
}

/**
 * 反映処理の途中で例外を吐いて outer catch まで飛んだ場合に、
 * その時点までに成功したセクション情報を「部分反映レポート」として確定させる。
 * 何も触っていない場合（sectionResults 空）はレポートは作らない。
 */
function commitPartialApplyOnError(opts: {
  mode: string;
  c: any;
  app: string | number | undefined;
  scopes: string[];
  sectionResults: any[];
  err: any;
  logs?: string[];
}): void {
  const { mode, c, app, scopes, sectionResults, err, logs } = opts;
  if (!Array.isArray(sectionResults) || !sectionResults.length) return;
  if (Array.isArray(logs)) {
    logs.push(`NG 反映処理が中断されました: ${err?.message || String(err)}`);
  }
  try {
    commitApplyReport({
      mode,
      appId: app || '',
      scopes,
      sectionResults,
      hadError: true,
      sourceAppId: c?.source?.appId,
      sourceGuestId: c?.source?.guestId,
      targetGuestId: c?.target?.guestId
    });
  } catch (_e) { /* レポート確定で更にエラーは握り潰す */ }
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
  if (hadError) bumpSessionMetric('applyError');
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

export interface BackupTargetPreviewOptions {
  silentStatus?: boolean;
}

function buildBackupHealth(bundle, scopes) {
  const actualScopes = Array.isArray(scopes) ? scopes.filter(Boolean) : [];
  const issues = actualScopes
    .map((sectionKey) => {
      const section = bundle?.sections?.[sectionKey];
      if (!section) return { sectionKey, label: getSectionDisplayLabel(sectionKey), message: '未取得' };
      if (section._fetchError) return { sectionKey, label: getSectionDisplayLabel(sectionKey), message: section._fetchError };
      return null;
    })
    .filter(Boolean);
  return {
    totalCount: actualScopes.length,
    okCount: Math.max(0, actualScopes.length - issues.length),
    ngCount: issues.length,
    issues
  };
}

function formatBackupHealthSummary(health) {
  const h = health || ({} as any);
  const base = `取得OK ${Number(h.okCount || 0)} / NG ${Number(h.ngCount || 0)}`;
  if (!h.ngCount) return base;
  const labels = (h.issues || []).map((item) => item.label || item.sectionKey).slice(0, 4).join(', ');
  return `${base}（${labels}${(h.issues || []).length > 4 ? ' ほか' : ''}）`;
}

function renderBackupStatus(filename, scopes, health) {
  if (!ui.backupStatus) return;
  const h = health || buildBackupHealth(null, scopes);
  const scopeSummary = formatSectionList(scopes);
  const ok = !h.ngCount;
  ui.backupStatus.textContent = `${ok ? '\u2705' : '\u26A0'} バックアップ保存済: ${filename} (${formatBackupHealthSummary(h)}, ${scopeSummary || '-'}, ${new Date().toLocaleTimeString()})`;
  ui.backupStatus.style.display = 'block';
  ui.backupStatus.style.background = ok ? '#ecfdf5' : '#fff7ed';
  ui.backupStatus.style.borderColor = ok ? '#a7f3d0' : '#fed7aa';
  ui.backupStatus.style.color = ok ? '#065f46' : '#9a3412';
}

function assertBackupHealthOk(backupResult, actionLabel) {
  const health = backupResult?.health || backupResult?.payload?.health;
  if (!health?.ngCount) return;
  const detail = (health.issues || [])
    .map((item) => `${item.label || item.sectionKey}: ${item.message || '取得失敗'}`)
    .join(' / ');
  throw new Error(`${actionLabel || '反映'}を中断しました。反映前バックアップに取得NGがあります（${formatBackupHealthSummary(health)}）。${detail}`);
}

export async function backupTargetPreviewSettings(c: any, scopes: string[], options: BackupTargetPreviewOptions = {}) {
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
  const health = buildBackupHealth(bundle, actualScopes);
  const payload = {
    generatedAt: new Date().toISOString(),
    mode: 'target-preview-backup',
    scopes: actualScopes,
    health,
    target: {
      appId: target.appId,
      guestId: target.guestId || '',
      preview: true
    },
    bundle
  };
  const jsonFilename = buildExportFilename('比較先プレビュー_バックアップ', 'json', {
    appLabel: buildAppFilenameLabel(target.appId, extractAppNameFromBundle(bundle))
  });
  const filename = jsonFilename.replace(/\.json$/i, '.zip');
  state.lastPreviewBackupPayload = deepClone(payload);
  state.lastPreviewBackupFilename = filename;
  const JSZipCtor = await loadJSZip();
  const zip = new JSZipCtor();
  zip.file(jsonFilename, JSON.stringify(payload, null, 2));
  zip.file('README.txt', [
    'kintone 統合ツール 比較先プレビューバックアップ',
    `generatedAt: ${payload.generatedAt}`,
    `targetAppId: ${target.appId}`,
    `targetGuestId: ${target.guestId || ''}`,
    `scopes: ${actualScopes.join(', ')}`,
    `health: ${formatBackupHealthSummary(health)}`,
    '',
    'このZIPはブラウザストレージに保存せず、取得直後に明示ダウンロードしています。'
  ].join('\n'));
  const blob = await zip.generateAsync({ type: 'blob' });
  downloadBlob(filename, blob);
  const statusMessage = `比較先(プレビュー)バックアップ保存: ${filename} (${formatBackupHealthSummary(health)} / ${scopeSummary || '-'})`;
  if (!options?.silentStatus) setStatus(statusMessage, health.ngCount > 0);
  renderBackupStatus(filename, actualScopes, health);
  return { filename, payload, health };
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

interface ApplyRiskGuardOptions {
  diffSummary?: { total: number; high: number; medium: number; low: number };
  requestCount?: number;
  scopeLabels?: string[];
}

async function confirmApplyRiskGuard(mode: string, c: any, options: ApplyRiskGuardOptions = {}): Promise<boolean> {
  const labels: string[] = [];
  const diffSummary = options.diffSummary || { total: 0, high: 0, medium: 0, low: 0 };
  const requestCount = Number(options.requestCount || 0);
  // プランに含まれる削除対象数（除外済みセクションは除く）。削除は注意点として明示する。
  const plan = state.lastApplyPlan;
  const deleteSummary = summarizePlanDeletes(
    Array.isArray(plan?.plannedRequests) ? plan.plannedRequests : [],
    Array.isArray(plan?.excludedSectionKeys) ? plan.excludedSectionKeys : []
  );
  const risk = assessApplyRisk({
    sameConnection: isSameConnectionPair(c),
    diffSummary,
    requestCount,
    deleteCount: deleteSummary.total,
    diffThreshold: APPLY_GUARD_DIFF_THRESHOLD,
    requestThreshold: APPLY_GUARD_REQUEST_THRESHOLD
  });

  // 注意点が無くても最終確認は必ず表示する（3 ルート間で確認 UI を統一するため）。
  if (Array.isArray(options.scopeLabels) && options.scopeLabels.length) {
    labels.push(`対象セクション: ${options.scopeLabels.join(', ')}`);
  }
  labels.push(`差分件数: ${diffSummary.total}件（高 ${diffSummary.high} / 中 ${diffSummary.medium} / 低 ${diffSummary.low}）`);
  if (requestCount > 0) labels.push(`予定リクエスト: ${requestCount}件`);
  if (deleteSummary.total > 0) {
    labels.push(`削除対象: ${deleteSummary.total}件（${deleteSummary.sections.map((s) => `${s.sectionLabel} ${s.count}`).join(' / ')}）`);
  }

  const modeLabel = mode === 'nodes' ? 'ノード反映' : (mode === 'patch' ? 'JSONパッチ反映' : 'プレビュー反映');
  const targetAppId = String(c?.target?.appId || '').trim();
  const targetAppName = extractAppNameFromBundle(state.importedTargetBundle || state.lastTargetBundle) || '';
  const bodyLines = [
    `【最終確認: ${modeLabel}】`,
    `比較先アプリ: ${targetAppId || '-'}${targetAppName ? `（${targetAppName}）` : ''} のプレビューへ書き込みます`,
    ...labels
  ];
  if (risk.issues.length) {
    bodyLines.push('', '注意点:', ...risk.issues.map((line) => ` - ${line}`));
  } else {
    bodyLines.push('', '注意点: なし（しきい値以下）');
  }
  // 確認の重さはリスクに比例させる:
  // 高リスク → アプリID入力 / 注意点あり → キーワード入力 / 注意点なし → チェックのみ
  return confirmDestructive({
    title: `${modeLabel} の最終確認`,
    body: bodyLines.join('\n'),
    keyword: risk.highRisk && targetAppId ? targetAppId : '実行する',
    okLabel: `${modeLabel}を実行`,
    riskTone: risk.highRisk ? 'danger' : 'warning',
    requireKeyword: risk.requireKeyword
  });
}

async function assertTargetPreviewMatchesPlannedBaseline(prefix: string, app: string | number, sectionKeys: string[]) {
  const plan = state.lastApplyPlan;
  const baselines = plan?.targetSectionBaselines || ({} as any);
  const uniqueSectionKeys: string[] = [...new Set((sectionKeys || []).filter(Boolean) as string[])];
  const checked: string[] = [];
  const skipped: string[] = [];
  const mismatches: any[] = [];

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
    const planAge = plan?.createdAt ? Math.round((Date.now() - plan.createdAt) / 60000) : 0;
    const ageNote = planAge > 0 ? `（プラン確認から${planAge}分経過）` : '';
    throw new Error(
      `🛑 反映を中止しました${ageNote}：プラン確認後に比較先プレビューが他の操作で更新されています。`
      + `\n対象: ${detail}`
      + '\n\n対処：フッターの「実行前プラン確認」を押し直して、最新の差分でプランを作り直してから反映してください。'
    );
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
  const el = getToolDocument().getElementById('u_patchJsonEditor') as (HTMLTextAreaElement | HTMLInputElement | HTMLElement | null);
  if (!el) return '';
  if (typeof (el as HTMLInputElement).value === 'string') return (el as HTMLInputElement).value;
  return typeof el.textContent === 'string' ? el.textContent : '';
}

function setPatchEditorValue(value: any) {
  const text = typeof value === 'string' ? value : JSON.stringify(value || ({} as any), null, 2);
  try {
    const editor = getJsonEditorInstance('u_patchJsonEditor');
    if (editor) {
      editor.set(typeof value === 'string' ? JSON.parse(value || '{}') : (value || ({} as any)));
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
  const el = getToolDocument().getElementById('u_patchJsonEditor') as (HTMLTextAreaElement | HTMLInputElement | null);
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
  const sourceView: { app: any; sections: Record<string, any[]> } = {
    app: payload?.source || ({} as any),
    sections: {}
  };
  const targetView: { app: any; sections: Record<string, any[]> } = {
    app: payload?.target || ({} as any),
    sections: {}
  };
  const order = new Map<string, number>(SECTION_DEFS.map((item, index): [string, number] => [item.key, index]));
  const sectionKeys = Object.keys(payload?.sections || ({} as any)).sort((a, b) => {
    const ao = order.has(a) ? (order.get(a) as number) : 999;
    const bo = order.has(b) ? (order.get(b) as number) : 999;
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

function clearPatchJsonDiff(message?: string) {
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
    source: payload.source || ({} as any),
    target: payload.target || ({} as any),
    sections: normalizedSections
  };
}

function getPatchTypeJpLabel(type, moved) {
  if (moved) return '移動';
  if (type === 'added') return '追加';
  if (type === 'removed') return '削除';
  if (type === 'changed') return '変更';
  if (type === 'same') return '同一';
  return String(type || '-');
}

function renderPatchJsonRangeBody(payload) {
  const body = getToolDocument().getElementById('u_patchJsonRangeBody');
  if (!body) return;
  const fold = getToolDocument().getElementById('u_patchJsonRangeFold') as HTMLDetailsElement | null;
  const sections = payload?.sections || {};
  const sectionKeys = Object.keys(sections);
  if (!sectionKeys.length) {
    if (fold) fold.style.display = 'none';
    body.innerHTML = '';
    return;
  }
  if (fold) fold.style.display = 'block';
  const order = new Map<string, number>(SECTION_DEFS.map((item, index): [string, number] => [item.key, index]));
  const orderedKeys = sectionKeys.sort((a, b) => {
    const ao = order.has(a) ? (order.get(a) as number) : 999;
    const bo = order.has(b) ? (order.get(b) as number) : 999;
    if (ao !== bo) return ao - bo;
    return String(a).localeCompare(String(b));
  });
  const blocks = orderedKeys.map((key) => {
    const def = SECTION_DEFS.find((item) => item.key === key);
    const label = def?.label || key;
    const rows = Array.isArray(sections[key]) ? sections[key] : [];
    if (!rows.length) return '';
    const items = rows.slice(0, 80).map((row: any) => {
      const typeLabel = getPatchTypeJpLabel(row?.type, row?.moved);
      const cls = row?.type === 'added' ? 'patch-row-added' : row?.type === 'removed' ? 'patch-row-removed' : row?.moved ? 'patch-row-moved' : 'patch-row-changed';
      const reason = row?.reasonSummary ? `<span class="patch-row-reason">${esc(String(row.reasonSummary))}</span>` : '';
      return `<li class="patch-row ${cls}"><span class="patch-row-type">${esc(typeLabel)}</span><code class="patch-row-path">${esc(String(row?.path || '-'))}</code>${reason}</li>`;
    }).join('');
    const more = rows.length > 80 ? `<div class="patch-row-more muted">…他 ${rows.length - 80} 件</div>` : '';
    return `<section class="patch-section">
      <header class="patch-section-head">
        <span class="patch-section-label">${esc(label)}</span>
        <span class="patch-section-count">${rows.length}件</span>
      </header>
      <ul class="patch-row-list">${items}</ul>
      ${more}
    </section>`;
  }).filter(Boolean).join('');
  body.innerHTML = blocks || '<div class="muted" style="padding:8px">該当行なし</div>';
}

export function renderPatchJsonSummary(payload) {
  const el = getToolDocument().getElementById('u_patchJsonSummary');
  if (!el) {
    renderPatchJsonDiff(payload);
    renderPatchJsonRangeBody(payload);
    return;
  }
  if (!payload || !payload.sections || !Object.keys(payload.sections).length) {
    el.style.display = 'none';
    el.innerHTML = '';
    renderPatchJsonDiff(null);
    renderPatchJsonRangeBody(null);
    return;
  }
  // セクション別件数（並び順は SECTION_DEFS 順）
  const order = new Map<string, number>(SECTION_DEFS.map((item, index): [string, number] => [item.key, index]));
  const sectionEntries = Object.entries(payload.sections)
    .map(([key, rows]: [string, any]) => ({
      key,
      label: SECTION_DEFS.find((item) => item.key === key)?.label || key,
      count: Array.isArray(rows) ? rows.length : 0,
      added: Array.isArray(rows) ? rows.filter((r: any) => r?.type === 'added').length : 0,
      removed: Array.isArray(rows) ? rows.filter((r: any) => r?.type === 'removed').length : 0,
      changed: Array.isArray(rows) ? rows.filter((r: any) => r?.type !== 'added' && r?.type !== 'removed').length : 0,
      moved: Array.isArray(rows) ? rows.filter((r: any) => !!r?.moved).length : 0
    }))
    .sort((a, b) => {
      const ao = order.has(a.key) ? (order.get(a.key) as number) : 999;
      const bo = order.has(b.key) ? (order.get(b.key) as number) : 999;
      if (ao !== bo) return ao - bo;
      return a.label.localeCompare(b.label);
    });
  const totalRows = sectionEntries.reduce((sum, item) => sum + item.count, 0);
  const totals = sectionEntries.reduce(
    (acc, item) => {
      acc.added += item.added;
      acc.removed += item.removed;
      acc.changed += item.changed;
      acc.moved += item.moved;
      return acc;
    },
    { added: 0, removed: 0, changed: 0, moved: 0 }
  );
  const generatedAt = payload.generatedAt ? new Date(payload.generatedAt).toLocaleString() : '-';
  const srcId = payload.source?.appId || '-';
  const tgtId = payload.target?.appId || '-';
  const headerHtml = `
    <div class="patch-json-summary-card">
      <div class="patch-json-summary-head">
        <div class="patch-json-summary-title">📦 取込済みパッチJSONの内容</div>
        <div class="patch-json-summary-meta">生成日時 ${esc(generatedAt)} / 比較元 App ${esc(String(srcId))} → 比較先 App ${esc(String(tgtId))}</div>
      </div>
      <div class="patch-json-summary-stats">
        <span class="patch-stat patch-stat-total"><b>${totalRows}</b><small>合計行</small></span>
        <span class="patch-stat patch-stat-added"><b>${totals.added}</b><small>追加</small></span>
        <span class="patch-stat patch-stat-removed"><b>${totals.removed}</b><small>削除</small></span>
        <span class="patch-stat patch-stat-changed"><b>${totals.changed}</b><small>変更</small></span>
        ${totals.moved ? `<span class="patch-stat patch-stat-moved"><b>${totals.moved}</b><small>移動</small></span>` : ''}
        <span class="patch-stat patch-stat-section"><b>${sectionEntries.length}</b><small>対象セクション</small></span>
      </div>
      <div class="patch-json-summary-sections">
        ${sectionEntries.map((s) => `
          <span class="patch-section-chip" title="${esc(s.label)}">
            <span class="patch-section-chip-name">${esc(s.label)}</span>
            <span class="patch-section-chip-count">${s.count}</span>
          </span>
        `).join('')}
      </div>
      <div class="patch-json-summary-hint">この内容で「比較先プレビュー」へ反映されます。中身を確認したい場合は下の「📋 このJSONに含まれる差分範囲」を開いてください。</div>
    </div>
  `;
  el.innerHTML = headerHtml;
  el.style.display = 'block';
  renderPatchJsonDiff(payload);
  renderPatchJsonRangeBody(payload);
}

export async function importPatchJsonFromFile(file) {
  const text = await readTextFile(file);
  const payload = parsePatchJsonPayload(text);
  state.importedPatchPayload = payload;
  setPatchEditorValue(payload);
  renderPatchJsonSummary(payload);
  // 取り込み済みパッチの target/source と現在の接続を比較し、ミスマッチを目立たせる
  const c = commonParams();
  const patchTargetApp = String(payload.target?.appId || '').trim();
  const currentTargetApp = String(c.target.appId || '').trim();
  const patchSourceApp = String(payload.source?.appId || '').trim();
  const currentSourceApp = String(c.source.appId || '').trim();
  const mismatches: string[] = [];
  if (patchTargetApp && currentTargetApp && patchTargetApp !== currentTargetApp) {
    mismatches.push(`比較先 App ${currentTargetApp} ≠ パッチ target ${patchTargetApp}`);
  }
  if (patchSourceApp && currentSourceApp && patchSourceApp !== currentSourceApp) {
    mismatches.push(`比較元 App ${currentSourceApp} ≠ パッチ source ${patchSourceApp}`);
  }
  const sectionCount = Object.keys(payload.sections || ({} as any)).length;
  if (mismatches.length) {
    const warn = `パッチJSON読込完了: ${file.name} (${sectionCount}セクション) — 接続不一致: ${mismatches.join(' / ')}`;
    console.warn('[統合ツール] patch import target/source mismatch:', mismatches);
    setStatus(warn, true);
    showToast(warn, 'error').catch(() => {});
  } else {
    setStatus(`パッチJSON読込完了: ${file.name} (${sectionCount}セクション)`);
  }
  return payload;
}

export interface PopulatePatchJsonOptions {
  force?: boolean;
  silent?: boolean;
}

export function populatePatchJsonFromCurrentDiff(options: PopulatePatchJsonOptions = {}) {
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

/**
 * 差分タブで選択中の行だけをパッチJSONとして取り込む（部分反映の主動線）。
 * 選択がない場合は明示的にエラーにし、誤って全件を反映してしまうのを防ぐ。
 */
export function populatePatchJsonFromSelectedDiff(options: PopulatePatchJsonOptions = {}) {
  if (!state.lastDiffRows.length) throw new Error('先に差分比較を実行してください');
  if (!state.lastSourceBundle || !state.lastTargetBundle) throw new Error('差分比較の比較元/比較先バンドルがありません');
  const selectedIds = state.diffSelectedIds instanceof Set ? state.diffSelectedIds : new Set();
  const selectedRows = (state.lastDiffRows || []).filter((row) => row && row._id && selectedIds.has(row._id));
  if (!selectedRows.length) {
    throw new Error('差分タブで反映したい行を選択してから実行してください（チェックボックスや「表示中を選択」ボタンで指定できます）');
  }
  const payload = parsePatchJsonPayload(buildPatchPayload(selectedRows, state.lastSourceBundle, state.lastTargetBundle));
  state.importedPatchPayload = payload;
  setPatchEditorValue(payload);
  renderPatchJsonSummary(payload);
  const sectionCount = Object.keys(payload.sections).length;
  const totalRows = (Object.values(payload.sections) as any[][]).reduce((sum, rows) => sum + (Array.isArray(rows) ? rows.length : 0), 0);
  if (!options.silent) setStatus(`選択した差分 ${totalRows} 行（${sectionCount}セクション）をパッチJSONに取り込みました（"この内容で反映"ボタンで部分反映できます）`);
  return payload;
}

/**
 * エディタにある現在のパッチJSONをファイルダウンロード（部分反映の受け渡し用）
 */
export function exportPatchJsonToFile() {
  const text = getPatchEditorText();
  if (isPatchEditorEffectivelyEmpty(text)) throw new Error('エクスポートするパッチJSONがありません。先に「差分比較結果を読込」または「選択中の差分だけ取込」を実行してください');
  let payload;
  try {
    payload = parsePatchJsonPayload(text);
  } catch (e) {
    throw new Error(`パッチJSONのパースに失敗しました: ${e?.message || e}`);
  }
  const c = commonParams();
  const sourceLabel = buildAppFilenameLabel(payload.source?.appId || c.source.appId || 'unknown', extractAppNameFromBundle(state.lastSourceBundle));
  const targetLabel = buildAppFilenameLabel(payload.target?.appId || c.target.appId || 'unknown', extractAppNameFromBundle(state.lastTargetBundle));
  const filename = buildExportFilename('反映パッチ', 'json', { appLabel: `${sourceLabel}_to_${targetLabel}` });
  const formatted = JSON.stringify(payload, null, 2);
  downloadText(filename, formatted, 'application/json');
  const totalRows = (Object.values(payload.sections) as any[][]).reduce((sum, rows) => sum + (Array.isArray(rows) ? rows.length : 0), 0);
  setStatus(`パッチJSONを保存しました: ${filename} (${totalRows} 行 / ${Object.keys(payload.sections).length} セクション)`);
  return { filename, payload };
}

/**
 * エディタの現在のパッチJSONをクリップボードにコピー
 */
export async function copyPatchJsonToClipboard() {
  const text = getPatchEditorText();
  if (isPatchEditorEffectivelyEmpty(text)) throw new Error('コピーするパッチJSONがありません');
  // 整形してからコピー（編集中の整形不要なテキストでもきれいに）
  let formatted = text;
  try {
    const parsed = parsePatchJsonPayload(text);
    formatted = JSON.stringify(parsed, null, 2);
  } catch (e) { /* keep as-is if parse fails */ }
  try {
    await navigator.clipboard.writeText(formatted);
    setStatus('パッチJSONをクリップボードにコピーしました');
    return true;
  } catch (e) {
    throw new Error(`クリップボードへのコピーに失敗: ${e?.message || e}`);
  }
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
  // 1) Force 'src' mode on every row first so that reflectRowDesiredValue
  //    inside sortRowsForPatch sees the patched mode (delete vs set classification).
  rows.forEach((row) => {
    previousModes[row._id] = state.reflectNodeModes[row._id];
    state.reflectNodeModes[row._id] = 'src';
  });
  try {
    // 2) Sort under the forced-src view.
    const normalizedRows = sortRowsForPatch(rows, secKey);
    normalizedRows.forEach((row) => {
      const result = applyDiffRowToSection(patched, row, secKey);
      patched = result.section;
      if (result.applied) appliedCount += 1;
    });
    return { patched, appliedCount, rows: normalizedRows };
  } finally {
    rows.forEach((row) => {
      if (previousModes[row._id] == null) delete state.reflectNodeModes[row._id];
      else state.reflectNodeModes[row._id] = previousModes[row._id];
    });
  }
}

export async function runApplyPatchJson() {
  const c = commonParams();
  if (!c.target.appId) throw new Error('比較先アプリIDを入力してください');
  const payload = getPatchPayloadForApply();
  const sectionKeys = Object.keys(payload.sections).filter((key) => SECTION_DEFS.find((item) => item.key === key)?.put);
  if (!sectionKeys.length) throw new Error('適用可能なパッチセクションがありません');
  renderPatchJsonSummary(payload);
  // confirmApplyRiskGuard 側で最終確認モーダルを必ず出すため、ここでの kusConfirm は廃止。
  const patchRows = Object.values(payload.sections || ({} as any)).flat().filter(Boolean);
  const patchSummary = summarizeRowsBySeverity(patchRows);
  const planReqCount = Number(state.lastApplyPlan?.totalReq || 0);
  const scopeLabels = sectionKeys.map((key) => SECTION_DEFS.find((d) => d.key === key)?.label || key);
  if (!(await confirmApplyRiskGuard('patch', c, { diffSummary: patchSummary, requestCount: planReqCount, scopeLabels }))) {
    setStatus('JSONパッチ反映をキャンセルしました（安全確認）');
    return;
  }
  bumpSessionMetric('applyRun');

  const prefix = buildApiPrefix(c.target.guestId, true);
  const app = c.target.appId;
  const stopOnError = !!ui.stopOnError?.checked;
  const lookupMap = parseLookupMapInput(ui.lookupMap.value);
  await assertLookupMapPreflight(lookupMap, buildApiPrefix(c.target.guestId, false));
  const logs: string[] = [];
  let hadError = false;

  logs.push(`比較先アプリ: ${app}`);
  logs.push(`JSONパッチ: ${sectionKeys.map((key) => SECTION_DEFS.find((item) => item.key === key)?.label || key).join(', ')}`);
  logs.push(`エラー時動作: ${stopOnError ? '中断' : '継続'}`);
  if (ui.autoBackupPreview?.checked) {
    const backup = await backupTargetPreviewSettings(c, sectionKeys, { silentStatus: true });
    logs.push(`バックアップ保存: ${backup.filename}`);
    assertBackupHealthOk(backup, 'JSONパッチ反映');
  }
  logs.push('');

  const sectionResults: any[] = [];
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
      const sourceModeCodes = secKey === 'fieldSettings'
        ? new Set<string>(sortedRows.map(extractFieldCodeFromRowPath).filter((code: any): code is string => !!code))
        : null;
      await applySectionDiffByKey({ secKey, def, prefix, app, before, patched, logs, lookupMap, sourceModeCodes, stopOnError });
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

  await finalizeApplyResult({
    mode: 'patch',
    c,
    app,
    scopes: sectionKeys,
    sectionResults,
    hadError,
    logs,
    phaseLabel: 'JSONパッチ反映完了'
  });
  setStatus(hadError ? 'JSONパッチ反映完了（一部エラーあり）' : 'JSONパッチ反映完了');
}


export async function runApplyPreviewByNodes() {
  await ensureDiffPreparedForReflect();
  const c = commonParams();
  if (!c.target.appId) throw new Error('比較先アプリIDを入力してください');
  if (!state.reflectRows.length) loadReflectRowsFromLastDiff();
  const rows = getSelectedReflectRows();
  if (!rows.length) throw new Error('反映ノードを選択してください');
  const lookupMap = parseLookupMapInput(ui.lookupMap.value);
  await assertLookupMapPreflight(lookupMap, buildApiPrefix(c.target.guestId, false));
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
  // プラン確認モーダルでユーザーが除外したセクションのノードを取り除く
  const excludedSetN = new Set<string>(
    (state.lastApplyPlan?.signature === planSignature && Array.isArray(state.lastApplyPlan?.excludedSectionKeys))
      ? state.lastApplyPlan.excludedSectionKeys
      : []
  );
  const excludedNodeScopes = nodeScopes.filter((k) => excludedSetN.has(k));
  const effectiveRows = rows.filter((r) => !excludedSetN.has(r.sectionKey));
  if (!effectiveRows.length) {
    setStatus('全セクションが除外されているため反映できません。プラン画面で除外を解除してください', true);
    return;
  }
  const effectiveNodeScopes = [...new Set(effectiveRows.map((r) => r.sectionKey).filter(Boolean))];
  const nodeSummary = summarizeRowsBySeverity(effectiveRows);
  const plannedReq = Number(state.lastApplyPlan?.signature === planSignature ? state.lastApplyPlan.totalReq : 0);
  const nodeScopeLabels = effectiveNodeScopes.map((key) => SECTION_DEFS.find((d) => d.key === key)?.label || key);
  if (!(await confirmApplyRiskGuard('nodes', c, { diffSummary: nodeSummary, requestCount: plannedReq, scopeLabels: nodeScopeLabels }))) {
    setStatus('反映をキャンセルしました（安全確認）');
    return;
  }
  bumpSessionMetric('applyRun');

  const prefix = buildApiPrefix(c.target.guestId, true);
  const app = c.target.appId;
  const logs: string[] = [];
  let hadError = false;
  let backupFilename = '';
  const bySection: Record<string, any[]> = {};
  for (const row of effectiveRows) {
    if (!row.sectionKey) continue;
    if (!bySection[row.sectionKey]) bySection[row.sectionKey] = [];
    bySection[row.sectionKey].push(row);
  }
  const sectionKeys = Object.keys(bySection);
  const progress = startProgress('反映前チェック中...', sectionKeys.length);
  setStatus('反映前チェック中...');
  // 部分反映レポート確定用に try の外で宣言する
  const sectionResults: any[] = [];
  try {
    const recheck = await assertTargetPreviewMatchesPlannedBaseline(prefix, app, effectiveNodeScopes);
    const srcModeCount = effectiveRows.filter((r) => reflectRowModeById(r._id) === 'src').length;
    const tgtModeCount = effectiveRows.length - srcModeCount;
    logs.push(`比較先アプリ: ${app}`);
    logs.push(`ノードモード選択数: ${effectiveRows.length}${effectiveRows.length !== rows.length ? `（除外 ${rows.length - effectiveRows.length}件）` : ''}`);
    logs.push(`モード内訳: 比較元採用 ${srcModeCount} / 比較先維持 ${tgtModeCount}`);
    if (excludedNodeScopes.length) {
      const excludedLabels = excludedNodeScopes.map((k) => SECTION_DEFS.find((d) => d.key === k)?.label || k).join(', ');
      logs.push(`プラン画面で除外されたセクション: ${excludedLabels}`);
    }
    logs.push(`エラー時動作: ${stopOnError ? '中断' : '継続'}`);
    if (recheck.checked.length) logs.push(`反映前チェック: ${formatSectionList(recheck.checked)} はプラン確認時から変更なし`);
    if (recheck.skipped.length) logs.push(`反映前チェック(未判定): ${formatSectionList(recheck.skipped)}`);
    if (ui.autoBackupPreview?.checked) {
      progress.setLabel('バックアップ保存中...');
      const backupScopes = [...new Set(effectiveRows.map((r) => r.sectionKey).filter(Boolean))];
      const backup = await backupTargetPreviewSettings(c, backupScopes, { silentStatus: true });
      logs.push(`バックアップ保存: ${backup.filename}`);
      assertBackupHealthOk(backup, 'ノード反映');
      backupFilename = backup.filename || '';
    }
    logs.push('');

    progress.setLabel('差分選択モードで反映中...');
    for (let i = 0; i < sectionKeys.length; i++) {
      const secKey = sectionKeys[i];
      const def = SECTION_DEFS.find((d) => d.key === secKey);
      progress.setProgress(i, sectionKeys.length);
      if (!def || !def.put) {
        logs.push(`SKIP ${def?.label || secKey}: PUT非対応`);
        recordSectionResult(sectionResults, secKey, def?.label || secKey, 'skipped', 'PUT非対応');
        renderProgressLog(logs, { phase: 'ノード反映実行中', current: i, total: sectionKeys.length, scopes: sectionKeys });
        continue;
      }

      setStatus(`ノード反映中 ${i + 1}/${sectionKeys.length}: ${def.label}`);
      progress.setLabel(`反映中 ${i + 1}/${sectionKeys.length}: ${def.label}`);
      renderProgressLog(logs, { phase: 'ノード反映実行中', current: i, total: sectionKeys.length, scopes: sectionKeys });
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

        const sourceModeCodes = secKey === 'fieldSettings'
          ? new Set<string>(
              rowsInSection
                .filter((row) => reflectRowModeById(row._id) === 'src')
                .map(extractFieldCodeFromRowPath)
                .filter((code): code is string => !!code)
            )
          : null;
        await applySectionDiffByKey({ secKey, def, prefix, app, before, patched, logs, lookupMap, sourceModeCodes, stopOnError });
        logs.push(`OK ${def.label}: node ${appliedCount}/${rowsInSection.length}`);
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

    progress.setProgress(sectionKeys.length, sectionKeys.length);
    setStatus(hadError ? 'ノード反映処理完了（一部エラーあり）' : 'ノード反映処理完了');
    await finalizeApplyResult({
      mode: 'nodes',
      c,
      app,
      scopes: sectionKeys,
      sectionResults,
      hadError,
      logs,
      progress,
      backupFilename,
      phaseLabel: 'ノード反映',
      finishMetrics: [
        { label: '比較先アプリ', value: `#${app}` },
        { label: '反映ノード数', value: `${effectiveRows.length}件（比較元採用 ${srcModeCount} / 比較先維持 ${tgtModeCount}）${excludedNodeScopes.length ? ` / 除外セクション ${excludedNodeScopes.length}件` : ''}` },
        { label: '対象セクション', value: `${sectionKeys.length}件` },
        { label: '結果', value: hadError ? '一部失敗' : '全成功', tone: hadError ? 'warn' : 'ok' }
      ]
    });
  } catch (err) {
    progress.cancel();
    commitPartialApplyOnError({ mode: 'nodes', c, app, scopes: sectionKeys, sectionResults, err, logs });
    const host = ui.result || ui.status;
    if (host) {
      const div = (host.ownerDocument || document).createElement('div');
      div.innerHTML = renderHumanizedError(err, 'ノード反映');
      host.appendChild(div);
    }
    throw err;
  }
}

export async function runApplyPreview() {
  if (isReflectNodeModeEffective()) return runApplyPreviewByNodes();
  await ensureDiffPreparedForReflect();
  const c = commonParams();
  if (!c.target.appId) throw new Error('比較先アプリIDを入力してください');
  const lookupMap = parseLookupMapInput(ui.lookupMap.value);
  await assertLookupMapPreflight(lookupMap, buildApiPrefix(c.target.guestId, false));
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
  // プラン確認モーダルでユーザーが除外したセクションをここで取り除く
  const excludedSet = new Set<string>(
    (state.lastApplyPlan?.signature === planSignature && Array.isArray(state.lastApplyPlan?.excludedSectionKeys))
      ? state.lastApplyPlan.excludedSectionKeys
      : []
  );
  const excludedScopes = scopes.filter((k) => excludedSet.has(k));
  const effectiveScopes = scopes.filter((k) => !excludedSet.has(k));
  if (!effectiveScopes.length) {
    setStatus('全セクションが除外されているため反映できません。プラン画面で除外を解除してください', true);
    return;
  }
  const actualRows = (state.lastDiffRows || []).filter((row) => row && !row._displayOnly && effectiveScopes.includes(row.sectionKey));
  const sectionSummary = summarizeRowsBySeverity(actualRows);
  const plannedReq = Number(state.lastApplyPlan?.signature === planSignature ? state.lastApplyPlan.totalReq : 0);
  const scopeLabels = effectiveScopes.map((key) => SECTION_DEFS.find((d) => d.key === key)?.label || key);
  if (!(await confirmApplyRiskGuard('section', c, { diffSummary: sectionSummary, requestCount: plannedReq, scopeLabels }))) {
    setStatus('反映をキャンセルしました（安全確認）');
    return;
  }
  bumpSessionMetric('applyRun');
  saveCurrentDialogState();
  const sourceBundle = await getSourceBundleForApply(c, effectiveScopes);

  const prefix = buildApiPrefix(c.target.guestId, true);
  const app = c.target.appId;
  const stopOnError = !!ui.stopOnError.checked;
  const logs: string[] = [];
  let hadError = false;
  let backupFilename = '';
  const progress = startProgress('反映前チェック中...', effectiveScopes.length);
  setStatus('反映前チェック中...');
  // 部分反映レポート確定用に try の外で宣言する
  const sectionResults: any[] = [];
  try {
    const recheck = await assertTargetPreviewMatchesPlannedBaseline(prefix, app, effectiveScopes);
    logs.push(`比較先アプリ: ${app}`);
    logs.push(`適用セクション: ${effectiveScopes.map((k) => SECTION_DEFS.find((d) => d.key === k)?.label || k).join(', ')}`);
    if (excludedScopes.length) {
      const excludedLabels = excludedScopes.map((k) => SECTION_DEFS.find((d) => d.key === k)?.label || k).join(', ');
      logs.push(`プラン画面で除外されたセクション: ${excludedLabels}`);
    }
    logs.push(`エラー時動作: ${stopOnError ? '中断' : '継続'}`);
    if (recheck.checked.length) logs.push(`反映前チェック: ${formatSectionList(recheck.checked)} はプラン確認時から変更なし`);
    if (recheck.skipped.length) logs.push(`反映前チェック(未判定): ${formatSectionList(recheck.skipped)}`);
    if (ui.autoBackupPreview?.checked) {
      progress.setLabel('バックアップ保存中...');
      const backup = await backupTargetPreviewSettings(c, effectiveScopes, { silentStatus: true });
      logs.push(`バックアップ保存: ${backup.filename}`);
      assertBackupHealthOk(backup, 'プレビュー反映');
      backupFilename = backup.filename || '';
    }
    logs.push('');

    progress.setLabel('プレビュー反映を実行中...');
    hadError = await applySectionsLoop(prefix, app, sourceBundle, effectiveScopes, logs, lookupMap, stopOnError, {
      phaseLabel: '反映',
      onProgress: (i, total) => {
        renderProgressLog(logs, { phase: 'プレビュー反映実行中', current: i, total, scopes: effectiveScopes });
        progress.setProgress(i, total);
      },
      sectionResults
    });

    setStatus('プレビュー反映処理完了');
    await finalizeApplyResult({
      mode: 'section',
      c,
      app,
      scopes: effectiveScopes,
      sectionResults,
      hadError,
      logs,
      progress,
      backupFilename,
      phaseLabel: 'プレビュー反映',
      finishMetrics: [
        { label: '比較先アプリ', value: `#${app}` },
        { label: '適用セクション', value: excludedScopes.length ? `${effectiveScopes.length}件（除外 ${excludedScopes.length}件）` : `${effectiveScopes.length}件` },
        { label: '結果', value: hadError ? '一部失敗' : '全成功', tone: hadError ? 'warn' : 'ok' }
      ]
    });
  } catch (err) {
    progress.cancel();
    commitPartialApplyOnError({ mode: 'section', c, app, scopes: effectiveScopes, sectionResults, err, logs });
    const host = ui.result || ui.status;
    if (host) {
      const div = (host.ownerDocument || document).createElement('div');
      div.innerHTML = renderHumanizedError(err, 'プレビュー反映');
      host.appendChild(div);
    }
    throw err;
  }
}

export async function runBackupTargetPreview() {
  const c = commonParams();
  const scopes = resolveBackupScopes(c);
  await backupTargetPreviewSettings(c, scopes);
  renderReflectAssistPanel();
}

export async function importTargetPreviewBackupFromFile(file) {
  if (!file) throw new Error('バックアップJSONファイルを選択してください');
  const text = await readTextFile(file);
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (e) {
    throw new Error('バックアップJSONの読み込みに失敗しました（JSON形式が不正です）');
  }
  const rawBundle = parsed?.bundle || parsed;
  const bundle = ensureBundleShape(rawBundle);
  const target = {
    appId: String(parsed?.target?.appId || bundle.appId || '').trim(),
    guestId: String(parsed?.target?.guestId || bundle.guestId || '').trim(),
    preview: true
  };
  if (!target.appId) throw new Error('バックアップJSONから対象アプリIDを判定できません');
  if (parsed?.target?.preview === false || bundle.preview === false) {
    throw new Error('比較先プレビューのバックアップJSONではありません（本番設定のJSONは復元対象外です）');
  }
  const scopes = Array.isArray(parsed?.scopes) && parsed.scopes.length
    ? parsed.scopes.filter(Boolean)
    : Object.keys(bundle.sections || ({} as any));
  if (!scopes.length) throw new Error('バックアップJSONに復元対象セクションがありません');
  const health = parsed?.health || buildBackupHealth(bundle, scopes);
  const payload = {
    ...parsed,
    generatedAt: parsed?.generatedAt || new Date().toISOString(),
    mode: 'target-preview-backup',
    scopes,
    health,
    target,
    bundle
  };
  const filename = file.name || 'imported-backup.json';
  state.lastPreviewBackupPayload = deepClone(payload);
  state.lastPreviewBackupFilename = filename;
  renderBackupStatus(filename, scopes, health);
  renderReflectAssistPanel();
  setStatus(`バックアップJSONを読み込みました: ${filename} (${formatBackupHealthSummary(health)})`, health.ngCount > 0);
  return payload;
}

export async function runRestoreTargetPreviewBackup() {
  const c = commonParams();
  if (!c.target.appId) throw new Error('比較先アプリIDを入力してください');
  if (!state.lastPreviewBackupPayload?.bundle?.sections) {
    throw new Error('このセッションで復元できるバックアップがありません。先に「バックアップ」を実行してください');
  }

  const restorePayload = deepClone(state.lastPreviewBackupPayload);
  const restoreFilename = state.lastPreviewBackupFilename || 'session-backup.json';
  const backupTarget = restorePayload.target || ({} as any);
  if (String(backupTarget.appId || '') !== String(c.target.appId || '')) {
    throw new Error(`比較先アプリがバックアップ取得時と異なります。現在: ${c.target.appId || '-'} / バックアップ: ${backupTarget.appId || '-'}`);
  }
  if (String(backupTarget.guestId || '') !== String(c.target.guestId || '')) {
    throw new Error('比較先ゲストIDがバックアップ取得時と異なります。同じ接続先で実行してください');
  }

  const backupBundle = ensureBundleShape(restorePayload.bundle);
  const scopes = Array.isArray(restorePayload.scopes) && restorePayload.scopes.length
    ? restorePayload.scopes.filter(Boolean)
    : Object.keys(backupBundle.sections || ({} as any));
  if (!scopes.length) throw new Error('復元対象セクションがありません');
  const restoreHealth = restorePayload.health || buildBackupHealth(backupBundle, scopes);
  if (restoreHealth.ngCount) {
    throw new Error(`このバックアップは取得NGを含むため復元できません（${formatBackupHealthSummary(restoreHealth)}）。取得NGのないバックアップJSONを読み込んでください`);
  }

  const labels = formatSectionList(scopes);
  if (!kusConfirm(`直前バックアップを比較先(プレビュー)へ復元しますか？\n比較先アプリ: ${c.target.appId}\n対象セクション: ${labels || '-'}`)) {
    setStatus('バックアップ復元をキャンセルしました');
    return;
  }

  if (!(await confirmApplyRiskGuard('section', c, { diffSummary: { total: 0, high: 1, medium: 0, low: 0 }, requestCount: 0, scopeLabels: scopes.map((k) => SECTION_DEFS.find((d) => d.key === k)?.label || k) }))) {
    setStatus('バックアップ復元をキャンセルしました（安全確認）');
    return;
  }
  bumpSessionMetric('applyRun');

  const prefix = buildApiPrefix(c.target.guestId, true);
  const app = c.target.appId;
  const stopOnError = !!ui.stopOnError?.checked;
  const logs: string[] = [];
  let beforeRestoreFilename = '';
  let hadError = false;
  const progress = startProgress('バックアップ復元の準備中...', scopes.length);
  try {
    logs.push(`比較先アプリ: ${app}`);
    logs.push(`復元元バックアップ: ${restoreFilename}`);
    logs.push(`復元セクション: ${labels || '-'}`);
    logs.push(`エラー時動作: ${stopOnError ? '中断' : '継続'}`);
    if (ui.autoBackupPreview?.checked) {
      progress.setLabel('復元前のバックアップ保存中...');
      const beforeRestoreBackup = await backupTargetPreviewSettings(c, scopes, { silentStatus: true });
      logs.push(`復元前バックアップ保存: ${beforeRestoreBackup.filename}`);
      assertBackupHealthOk(beforeRestoreBackup, 'バックアップ復元');
      beforeRestoreFilename = beforeRestoreBackup.filename || '';
    }
    logs.push('');

    progress.setLabel('バックアップから復元中...');
    const sectionResults: any[] = [];
    hadError = await applySectionsLoop(prefix, app, backupBundle, scopes, logs, {}, stopOnError, {
      phaseLabel: 'バックアップ復元',
      onProgress: (i, total) => {
        renderProgressLog(logs, { phase: 'バックアップ復元中', current: i, total });
        progress.setProgress(i, total);
      },
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
    progress.finish({
      title: hadError ? 'バックアップ復元 完了（一部エラー）' : 'バックアップ復元 完了',
      hasError: hadError,
      metrics: [
        { label: '比較先アプリ', value: `#${app}` },
        { label: '復元元', value: restoreFilename },
        { label: '復元セクション', value: `${scopes.length}件` },
        { label: '結果', value: hadError ? '一部失敗' : '全成功', tone: hadError ? 'warn' : 'ok' }
      ],
      hint: beforeRestoreFilename
        ? `復元前のバックアップ: ${beforeRestoreFilename}`
        : ''
    });
  } catch (err) {
    progress.cancel();
    const host = ui.result || ui.status;
    if (host) {
      const div = (host.ownerDocument || document).createElement('div');
      div.innerHTML = renderHumanizedError(err, 'バックアップ復元');
      host.appendChild(div);
    }
    throw err;
  }
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
  const retryScopeLabels = failed.map((k) => SECTION_DEFS.find((d) => d.key === k)?.label || k);
  if (!(await confirmApplyRiskGuard('section', c, { diffSummary: { total: 0, high: 0, medium: 0, low: 0 }, requestCount: 0, scopeLabels: retryScopeLabels }))) {
    setStatus('失敗セクション再反映をキャンセルしました（安全確認）');
    return;
  }
  bumpSessionMetric('applyRun');

  const sourceBundle = await getSourceBundleForApply(c, failed);
  const prefix = buildApiPrefix(c.target.guestId, true);
  const app = c.target.appId;
  const stopOnError = !!ui.stopOnError?.checked;
  const lookupMap = parseLookupMapInput(ui.lookupMap?.value || '');
  const logs: string[] = [];
  let backupFilename = '';
  let hadError = false;
  const progress = startProgress('失敗セクション再反映の準備中...', failed.length);
  try {
    logs.push(`比較先アプリ: ${app}`);
    logs.push(`再反映セクション（前回NG）: ${failedLabels}`);
    logs.push(`エラー時動作: ${stopOnError ? '中断' : '継続'}`);
    if (ui.autoBackupPreview?.checked) {
      progress.setLabel('バックアップ保存中...');
      const backup = await backupTargetPreviewSettings(c, failed, { silentStatus: true });
      logs.push(`バックアップ保存: ${backup.filename}`);
      assertBackupHealthOk(backup, '失敗セクション再反映');
      backupFilename = backup.filename || '';
    }
    logs.push('');

    progress.setLabel('失敗セクションを再反映中...');
    const sectionResults: any[] = [];
    hadError = await applySectionsLoop(prefix, app, sourceBundle, failed, logs, lookupMap, stopOnError, {
      phaseLabel: '再反映',
      onProgress: (i, total) => {
        renderProgressLog(logs, { phase: '失敗セクション再反映中', current: i, total });
        progress.setProgress(i, total);
      },
      sectionResults
    });
    await verifyAppliedAgainstBackup({ targetGuestId: c.target.guestId, targetAppId: app, scopes: failed, logs });
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
    progress.finish({
      title: hadError ? '失敗セクション再反映 完了（一部エラー）' : '失敗セクション再反映 完了',
      hasError: hadError,
      metrics: [
        { label: '比較先アプリ', value: `#${app}` },
        { label: '再反映セクション', value: `${failed.length}件` },
        { label: '結果', value: hadError ? '一部失敗' : '全成功', tone: hadError ? 'warn' : 'ok' }
      ],
      hint: backupFilename
        ? `バックアップ保存先: ${backupFilename}`
        : ''
    });
  } catch (err) {
    progress.cancel();
    const host = ui.result || ui.status;
    if (host) {
      const div = (host.ownerDocument || document).createElement('div');
      div.innerHTML = renderHumanizedError(err, '失敗セクション再反映');
      host.appendChild(div);
    }
    throw err;
  }
}
