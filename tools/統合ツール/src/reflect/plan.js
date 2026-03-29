'use strict';

import { SECTION_DEFS } from '../constants.js';
import { deepClone, stableStringify, esc, normalize } from '../utils.js';
import { state, ui } from '../state.js';
import { getToolDocument } from '../ui/dialog.js';
import { isReflectNodeModeEffective } from './nodeModeUi.js';
import { apiGet, apiPost, apiPut, buildApiPrefix } from '../api.js';
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
  const add = {};
  const update = {};
  const logs = [];
  const used = new Set(Object.keys(currentMap || {}));

  for (const [rawKey, rawDef] of Object.entries(incomingMap || {})) {
    const key = String(rawKey);
    const def = deepClone(rawDef || {});
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
  const lookupMap = (options && options.lookupMap) || {};
  const convertedIncoming = {};
  for (const [code, def] of Object.entries(writableIncoming || {})) {
    const converted = convertLookupAppIds(def, lookupMap);
    convertedIncoming[code] = converted.def;
  }
  const current = await apiGet(prefix, '/app/form/fields.json', { app });
  const split = splitUpsertMap(current.properties || {}, convertedIncoming || {}, {
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
  const add = {};
  const update = {};
  const del = [];
  for (const [k, v] of Object.entries(after)) {
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

export function planFieldSectionDiffRequests(app, beforeProps, afterProps, lookupMap, sourceModeCodes) {
  const beforeMap = filterWritableFieldProps(beforeProps, true);
  const afterMap = filterWritableFieldProps(afterProps, true);
  const add = {};
  const update = {};
  const del = [];
  let lookupChanged = 0;

  for (const [code, def] of Object.entries(afterMap || {})) {
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
  for (const code of Object.keys(beforeMap || {})) {
    if (!Object.prototype.hasOwnProperty.call(afterMap || {}, code)) del.push(code);
  }

  const requests = [];
  if (Object.keys(add).length) requests.push({ method: 'POST', path: '/app/form/fields.json', body: { app, properties: add }, note: `fields add:${Object.keys(add).length}` });
  if (Object.keys(update).length) requests.push({ method: 'PUT', path: '/app/form/fields.json', body: { app, properties: update }, note: `fields update:${Object.keys(update).length}` });
  if (del.length) requests.push({ method: 'DELETE', path: '/app/form/fields.json', body: { app, fields: del }, note: `fields delete:${del.length}` });
  return { requests, addCount: Object.keys(add).length, updateCount: Object.keys(update).length, deleteCount: del.length, lookupChanged };
}

export function planViewsSectionDiffRequests(app, beforeViews, afterViews) {
  const split = splitMapSectionDiff(beforeViews, afterViews);
  const up = { ...split.add, ...split.update };
  const requests = [];
  if (Object.keys(up).length) requests.push({ method: 'PUT', path: '/app/views.json', body: { app, views: up }, note: `views upsert:${Object.keys(up).length}` });
  return { requests, upsertCount: Object.keys(up).length, deleteSkipCount: split.del.length };
}

export function planReportsSectionDiffRequests(app, beforeReports, afterReports) {
  const split = splitMapSectionDiff(beforeReports, afterReports);
  const up = { ...split.add, ...split.update };
  const requests = [];
  if (Object.keys(up).length) requests.push({ method: 'PUT', path: '/app/reports.json', body: { app, reports: up }, note: `reports upsert:${Object.keys(up).length}` });
  if (split.del.length) requests.push({ method: 'DELETE', path: '/app/reports.json', body: { app, reports: split.del }, note: `reports delete:${split.del.length}` });
  return { requests, upsertCount: Object.keys(up).length, deleteCount: split.del.length };
}

export function planActionsSectionDiffRequests(app, beforeActions, afterActions) {
  const split = splitMapSectionDiff(beforeActions, afterActions);
  const up = { ...split.add, ...split.update };
  const requests = [];
  if (Object.keys(up).length) requests.push({ method: 'PUT', path: '/app/actions.json', body: { app, actions: up }, note: `actions upsert:${Object.keys(up).length}` });
  return { requests, upsertCount: Object.keys(up).length, deleteSkipCount: split.del.length };
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

export function markApplyPlan(signature, mode, totalReq, lines) {
  state.lastApplyPlan = {
    signature,
    mode,
    totalReq: Number(totalReq || 0),
    createdAt: Date.now(),
    summary: (lines || []).slice(0, 16).join('\n'),
    logs: lines || []
  };
}

export function showInlineConfirmation(plan, options) {
  const appIdRefs = (options && options.appIdRefs) || [];
  return new Promise((resolve) => {
    const stamp = new Date(plan.createdAt).toLocaleString();
    const planText = (plan.logs || []).join('\n') || '(プラン詳細なし)';
    const appIdSection = renderAppIdConfirmSection(appIdRefs);
    const previousHtml = ui.result.innerHTML;
    const previousScrollTop = ui.result.scrollTop;
    ui.result.innerHTML = `<div class="plan-confirm-panel">
      <div style="font-weight:700;font-size:13px;margin-bottom:8px">反映プラン確認</div>
      ${appIdSection}
      <div class="plan-summary">${esc(planText)}</div>
      <div class="plan-actions">
        <span class="plan-meta">予定リクエスト: ${plan.totalReq || 0}件 | 作成: ${esc(stamp)}</span>
        <button class="btn sub" id="u_planCancel">キャンセル</button>
        <button class="btn ok" id="u_planExecute">このまま実行</button>
      </div>
    </div>`;
    ui.result.scrollTop = 0;
    const cleanup = () => {
      const execBtn = getToolDocument().getElementById('u_planExecute');
      const cancelBtn = getToolDocument().getElementById('u_planCancel');
      if (execBtn) execBtn.removeEventListener('click', onExec);
      if (cancelBtn) cancelBtn.removeEventListener('click', onCancel);
    };
    const onExec = () => { cleanup(); resolve(true); };
    const onCancel = () => {
      cleanup();
      ui.result.innerHTML = previousHtml;
      ui.result.scrollTop = previousScrollTop;
      resolve(false);
    };
    getToolDocument().getElementById('u_planExecute')?.addEventListener('click', onExec);
    getToolDocument().getElementById('u_planCancel')?.addEventListener('click', onCancel);
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

  const sectionMap = {};
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

  const lines = [];
  lines.push('=== 反映プラン（ノードモード）===');
  lines.push(`比較先アプリ: ${c.target.appId}`);
  lines.push(`選択ノード数: ${rows.length}`);
  lines.push(`モード内訳: 比較元 ${srcCount} / 比較先 ${tgtCount}`);
  lines.push('');
  for (const [k, stat] of Object.entries(sectionMap)) {
    const label = SECTION_DEFS.find((d) => d.key === k)?.label || k;
    lines.push(`${label}: ${stat.total}件 (A:${stat.added} R:${stat.removed} C:${stat.changed})`);
  }
  lines.push('');

  const bySection = {};
  for (const row of rows) {
    if (!row.sectionKey) continue;
    if (!bySection[row.sectionKey]) bySection[row.sectionKey] = [];
    bySection[row.sectionKey].push(row);
  }

  let totalReq = 0;
  const sectionKeys = Object.keys(bySection);
  for (let i = 0; i < sectionKeys.length; i++) {
    const secKey = sectionKeys[i];
    const def = SECTION_DEFS.find((d) => d.key === secKey);
    if (!def || !def.put) continue;
    try {
      setStatus(`ノード反映プラン計算中 ${i + 1}/${sectionKeys.length}: ${def.label}`);
      const current = normalize(await apiGet(prefix, def.endpoint, { app }));
      const before = deepClone(current);
      let patched = deepClone(current);
      const rowsInSection = sortRowsForPatch(bySection[secKey], secKey);
      for (const row of rowsInSection) {
        const r = applyDiffRowToSection(patched, row, secKey);
        patched = r.section;
      }

      let plan;
      if (secKey === 'fieldSettings') {
        const sourceModeCodes = new Set(
          rowsInSection
            .filter((row) => reflectRowModeById(row._id) === 'src')
            .map(extractFieldCodeFromRowPath)
            .filter(Boolean)
        );
        plan = planFieldSectionDiffRequests(app, before.properties || before || {}, patched.properties || patched || {}, lookupMap, sourceModeCodes);
      } else if (secKey === 'viewSettings') {
        plan = planViewsSectionDiffRequests(app, before.views || before || {}, patched.views || patched || {});
      } else if (secKey === 'reportSettings') {
        plan = planReportsSectionDiffRequests(app, before.reports || before || {}, patched.reports || patched || {});
      } else if (secKey === 'actionSettings') {
        plan = planActionsSectionDiffRequests(app, before.actions || before || {}, patched.actions || patched || {});
      } else {
        plan = { requests: [{ method: 'PUT', path: def.endpoint, body: { app, ...def.putBuilder(patched) }, note: `${def.label} put` }] };
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
  markApplyPlan(planSignature, 'nodes', totalReq, lines);

  ui.result.innerHTML = `<pre style="margin:0;padding:10px;font-size:12px;white-space:pre-wrap">${esc(lines.join('\n'))}</pre>`;
  renderReflectAssistPanel();
  renderReflectMainPanel();
  setStatus('ノード反映プラン確認完了');
}

export async function runPreviewApplyPlan() {
  if (isReflectNodeModeEffective()) return runPreviewApplyPlanNodes();
  await ensureDiffPreparedForReflect();
  const c = commonParams();
  if (!c.target.appId) throw new Error('比較先アプリIDを入力してください');
  const lookupMap = parseLookupMapInput(ui.lookupMap.value);
  const baseScopes = selectedScopeKeys(ui.applyScopes);
  if (!baseScopes.length) throw new Error('反映セクションを選択してください');
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
  const logs = [];
  logs.push('=== 反映プラン（ドライラン）===');
  logs.push(`比較先アプリ: ${app}`);
  logs.push(`対象セクション: ${scopes.map((k) => SECTION_DEFS.find((d) => d.key === k)?.label || k).join(', ')}`);
  logs.push('');
  let totalReq = 0;

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
      const plan = planFieldSectionDiffRequests(app, current.properties || {}, sourceSec.properties || sourceSec || {}, lookupMap);
      logs.push(`PLAN ${def.label}: ${plan.requests.length} request(s)`);
      appendRequestPlanLogs(logs, plan);
      if (plan.lookupChanged) logs.push(`  - lookup appId 変換: ${plan.lookupChanged}`);
      totalReq += plan.requests.length;
      continue;
    }
    if (secKey === 'viewSettings') {
      const current = await apiGet(prefix, '/app/views.json', { app });
      const plan = planViewsSectionDiffRequests(app, current.views || {}, sourceSec.views || sourceSec || {});
      logs.push(`PLAN ${def.label}: ${plan.requests.length} request(s)`);
      appendRequestPlanLogs(logs, plan);
      if (plan.deleteSkipCount) logs.push(`  - views delete(skip): ${plan.deleteSkipCount} (互換モード: 削除は行いません)`);
      totalReq += plan.requests.length;
      continue;
    }
    if (secKey === 'reportSettings') {
      const current = await apiGet(prefix, '/app/reports.json', { app });
      const plan = planReportsSectionDiffRequests(app, current.reports || {}, sourceSec.reports || sourceSec || {});
      logs.push(`PLAN ${def.label}: ${plan.requests.length} request(s)`);
      appendRequestPlanLogs(logs, plan);
      totalReq += plan.requests.length;
      continue;
    }
    if (secKey === 'actionSettings') {
      const current = await apiGet(prefix, '/app/actions.json', { app });
      const plan = planActionsSectionDiffRequests(app, current.actions || {}, sourceSec.actions || sourceSec || {});
      logs.push(`PLAN ${def.label}: ${plan.requests.length} request(s)`);
      appendRequestPlanLogs(logs, plan);
      if (plan.deleteSkipCount) logs.push(`  - actions delete(skip): ${plan.deleteSkipCount} (互換モード: 削除は行いません)`);
      totalReq += plan.requests.length;
      continue;
    }
    const plan = { requests: [{ method: 'PUT', path: def.endpoint, body: { app, ...def.putBuilder(sourceSec) }, note: `${def.label} put` }] };
    logs.push(`PLAN ${def.label}: ${plan.requests.length} request(s)`);
    appendRequestPlanLogs(logs, plan);
    totalReq += plan.requests.length;
  }
  logs.push('');
  logs.push(`合計予定リクエスト数: ${totalReq}`);
  markApplyPlan(planSignature, 'section', totalReq, logs);
  ui.result.innerHTML = `<pre style="margin:0;padding:10px;font-size:12px;white-space:pre-wrap">${esc(logs.join('\n'))}</pre>`;
  renderReflectAssistPanel();
  renderReflectMainPanel();
  setStatus('反映プラン確認完了');
}
