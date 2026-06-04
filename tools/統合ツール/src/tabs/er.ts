'use strict';

import { SECTION_DEFS, EXTERNAL_LIBRARIES } from '../constants.js';
import { state, ui } from '../state.js';
import { esc, safeJsonForScript, downloadText, showToast, buildExportFilename, buildAppFilenameLabel } from '../utils.js';
import { apiGet, buildApiPrefix, fetchAppsInSpace } from '../api.js';
import { setStatus, setBusy } from '../ui/components.js';
import { getToolWindow, getToolDocument } from '../ui/dialog.js';
import { commonParams } from './diff.js';
import { FIELD_TYPE_JP, lookupEnum } from '../kintone-enums.js';

const ER_DEFAULTS = {
  maxFields: 220,
  sleepMs: 80,
  layoutName: 'dagre',
  fieldDensity: 'standard',
  maxDepth: 0,
  includeSubtableFields: true,
  includeReverseLookup: false
};
const ER_TRAVERSE_RELATION_KINDS = new Set(['LOOKUP', 'REF', 'ACTION']);

function normalizeFieldProperties(response) {
  const props = response?.properties;
  return props && typeof props === 'object' && !Array.isArray(props) ? props : {};
}

function buildScriptTag(src, fallbackSrc = '') {
  const safeSrc = esc(src || '');
  const safeFallback = esc(fallbackSrc || '');
  const fallback = safeFallback ? ` onerror="this.onerror=null;this.src='${safeFallback}'"` : '';
  return `<script src="${safeSrc}"${fallback}><\/script>`;
}

export function readErDiagramOptions() {
  const startAppId = String(ui.sourceApp?.value || '').trim();
  const layoutName = String(ui.erLayout?.value || ER_DEFAULTS.layoutName).trim() || ER_DEFAULTS.layoutName;
  const fieldDensity = String(ui.erFieldDensity?.value || ER_DEFAULTS.fieldDensity).trim() || ER_DEFAULTS.fieldDensity;
  const maxDepthRaw = String(ui.erMaxDepth?.value || '').trim();
  const maxDepthNum = Number(maxDepthRaw);
  const extraAppIds = String(ui.erExtraApps?.value || '')
    .split(/[\s,，]+/)
    .map((v) => v.trim())
    .filter((v) => /^\d+$/.test(v));
  const startAppIds = [startAppId, ...extraAppIds].filter((v, i, arr) => /^\d+$/.test(v) && arr.indexOf(v) === i);
  const spaceId = String(ui.erSpaceId?.value || '').trim();
  return {
    startAppId,
    startAppIds,
    spaceId: /^\d+$/.test(spaceId) ? spaceId : '',
    layoutName,
    fieldDensity: ['compact', 'standard', 'full'].includes(fieldDensity) ? fieldDensity : ER_DEFAULTS.fieldDensity,
    maxDepth: Number.isFinite(maxDepthNum) && maxDepthNum >= 0 ? Math.floor(maxDepthNum) : ER_DEFAULTS.maxDepth,
    includeSubtableFields: !!ui.erIncludeSubtable?.checked,
    includeReverseLookup: !!ui.erIncludeReverseLookup?.checked,
    maxFields: ER_DEFAULTS.maxFields,
    sleepMs: ER_DEFAULTS.sleepMs,
    source: commonParams().source
  };
}

export function formatErLayoutLabel(layoutName) {
  const map = {
    dagre: 'Dagre',
    breadthfirst: 'ツリー',
    cose: 'フォース',
    concentric: '同心円',
    grid: 'グリッド',
    circle: '円形'
  };
  return map[layoutName] || layoutName || '-';
}

const progressUi = (() => {
  let el, bar, msg;
  const removeEl = () => {
    if (el && el.parentNode) el.parentNode.removeChild(el);
    el = null; bar = null; msg = null;
  };
  return {
    init() {
      removeEl();
      const doc = (() => { try { return getToolDocument(); } catch (_) { return document; } })();
      el = doc.createElement("div");
      Object.assign(el.style, {
        position: "fixed", top: "20px", right: "20px", width: "320px",
        padding: "16px", background: "rgba(10,10,18,0.94)", color: "#fff",
        borderRadius: "12px", zIndex: "999999", fontFamily: "sans-serif",
        boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
      });
      el.innerHTML = `
      <div style="font-weight:700;margin-bottom:10px;font-size:14px;">📊 ER図を生成中...</div>
      <div style="background:#333;height:8px;border-radius:4px;overflow:hidden;">
        <div id="_eb" style="width:0%;height:100%;background:linear-gradient(90deg,#00d4ff,#7b61ff);transition:width .3s;border-radius:4px;"></div>
      </div>
      <div id="_em" style="font-size:12px;margin-top:8px;color:#aaa;">準備中...</div>`;
      (doc.body || doc.documentElement).appendChild(el);
      bar = el.querySelector("#_eb"); msg = el.querySelector("#_em");
    },
    update(p, t) { if (bar) bar.style.width = p + "%"; if (msg) msg.textContent = t; },
    close() {
      if (!el) return;
      this.update(100, "完了！");
      const target = el;
      setTimeout(() => {
        if (target) target.style.opacity = "0";
        setTimeout(() => { if (target && target.parentNode) target.parentNode.removeChild(target); if (el === target) { el = null; bar = null; msg = null; } }, 600);
      }, 2e3);
    },
    error(e) {
      if (!el) return;
      this.update(100, "エラー: " + e);
      if (bar) bar.style.background = "#f44";
      const target = el;
      setTimeout(() => {
        if (target && target.parentNode) target.parentNode.removeChild(target);
        if (el === target) { el = null; bar = null; msg = null; }
      }, 6e3);
    },
    dismiss() { removeEl(); },
  };
})();

export { progressUi, ER_DEFAULTS };

const sleep = ms => new Promise(r => setTimeout(r, ms));

const fetchAllApps = async (options) => {
  const prefix = buildApiPrefix(options?.source?.guestId, false);
  const apps = [];
  const limit = 100;
  for (let offset = 0; ; offset += limit) {
    const resp = await apiGet(prefix, '/apps.json', { limit, offset });
    const chunk = Array.isArray(resp?.apps) ? resp.apps : [];
    apps.push(...chunk);
    if (chunk.length < limit) break;
  }
  return apps;
};

const getSchema = async (appId, options, cache) => {
  if (cache.has(appId)) return cache.get(appId);
  try {
    const prefix = buildApiPrefix(options?.source?.guestId, !!options?.source?.preview);
    const appInfoPrefix = buildApiPrefix(options?.source?.guestId, false);
    const [fR, aR, actionResp] = await Promise.all([
      apiGet(prefix, '/app/form/fields.json', { app: appId }),
      apiGet(appInfoPrefix, '/app.json', { id: appId }).catch((error) => ({
        name: `アプリ ${appId}`,
        _fetchError: error?.message || String(error)
      })),
      apiGet(prefix, '/app/actions.json', { app: appId }).catch(() => ({ actions: {} })),
    ]);
    const fields = [], relations = [];
    const walk = (props, parentTable = '', parentTableLabel = '') => {
      for (const [c, f] of Object.entries(props) as Array<[string, any]>) {
        if (!f || typeof f !== 'object') continue;
        if (["GROUP", "SPACER", "HR", "LABEL"].includes(f.type)) continue;
        if (f.type === "SUBTABLE") {
          fields.push({
            code: c,
            label: f.label,
            type: "SUBTABLE",
            sub: true,
            inSubtable: !!parentTable,
            tableCode: parentTable || '',
            tableLabel: parentTableLabel || '',
            path: c,
            displayPath: f.label ? `${f.label} [${c}]` : c
          });
          if (options?.includeSubtableFields) walk(f.fields || ({} as any), c, f.label || c);
          continue;
        }
        const hasLookupSetting = !!(f.lookup && typeof f.lookup === 'object');
        const isL = hasLookupSetting;
        const isR = f.type === "REFERENCE_TABLE";
        const isPK = /^(\$id|record_number|レコード番号)$/i.test(c);
        const fieldPath = parentTable ? `${parentTable}.${c}` : c;
        const displayPath = parentTableLabel ? `${parentTableLabel} > ${f.label || c}` : (f.label || c);
        fields.push({
          code: c,
          label: f.label || c,
          type: f.type,
          required: !!f.required,
          unique: !!f.unique,
          isPK,
          isLookup: isL,
          isRef: isR,
          inSubtable: !!parentTable,
          tableCode: parentTable || '',
          tableLabel: parentTableLabel || '',
          path: fieldPath,
          displayPath
        });
        if (isL && f.lookup?.relatedApp?.app) relations.push({
          from: c,
          fromPath: fieldPath,
          fromLabel: f.label || c,
          fromDisplay: displayPath,
          fromTableCode: parentTable || '',
          fromTableLabel: parentTableLabel || '',
          toApp: Number(f.lookup.relatedApp.app),
          toField: f.lookup.relatedKeyField,
          kind: "LOOKUP"
        });
        if (isR && f.referenceTable?.relatedApp?.app) relations.push({
          from: c,
          fromPath: fieldPath,
          fromLabel: f.label || c,
          fromDisplay: displayPath,
          fromTableCode: parentTable || '',
          fromTableLabel: parentTableLabel || '',
          toApp: Number(f.referenceTable.relatedApp.app),
          toField: f.referenceTable.condition?.field,
          kind: "REF"
        });
      }
    };
    walk(normalizeFieldProperties(fR));
    Object.entries(actionResp?.actions || ({} as any)).forEach(([actionName, action]: [string, any], index) => {
      const toApp = Number(action?.destApp?.app || action?.app?.app || 0);
      if (!toApp) return;
      relations.push({
        from: `__ACTION__${index}`,
        fromLabel: action?.name || actionName || `アクション${index + 1}`,
        toApp,
        toField: '',
        kind: 'ACTION'
      });
    });
    const linkedFieldPaths = new Set(
      relations
        .filter((rel) => rel.kind === 'LOOKUP' || rel.kind === 'REF')
        .map((rel) => String(rel.fromPath || rel.from || '').trim())
        .filter(Boolean)
    );
    // 表示密度に応じて可視フィールド集合を変える
    // - compact: PK / unique / リレーション結びの先 だけ
    // - standard: 上記 + 必須項目
    // - full: 全フィールド（SUBTABLE除く / inSubtable はオプション従属）
    const density = String(options?.fieldDensity || ER_DEFAULTS.fieldDensity);
    const isEssential = (field) => {
      if (field.type === 'SUBTABLE') return false;
      if (field.isPK || field.unique) return true;
      return linkedFieldPaths.has(String(field.path || field.code || '').trim());
    };
    let visibleFieldsSource;
    if (density === 'full') {
      visibleFieldsSource = fields.filter((f) => f.type !== 'SUBTABLE');
    } else if (density === 'standard') {
      visibleFieldsSource = fields.filter((f) => f.type !== 'SUBTABLE' && (isEssential(f) || !!f.required));
      // standard で 0件になるケース（必須も unique もない簡素なアプリ）には先頭6件をフォールバック
      if (!visibleFieldsSource.length) visibleFieldsSource = fields.filter((f) => f.type !== 'SUBTABLE').slice(0, 6);
    } else { // compact
      const essential = fields.filter(isEssential);
      visibleFieldsSource = essential.length ? essential : fields.filter((f) => f.type !== 'SUBTABLE').slice(0, 6);
    }
    const visibleFields = visibleFieldsSource.slice(0, options?.maxFields || ER_DEFAULTS.maxFields);
    const totalFieldCount = fields.filter((f) => f.type !== 'SUBTABLE').length;
    const r = {
      id: appId,
      name: aR.name || `アプリ ${appId}`,
      spaceId: aR.spaceId || null,
      threadId: aR.threadId || null,
      fields: visibleFields,
      allFields: fields,
      totalFieldCount,
      relations,
      ok: true,
      createdAt: aR.createdAt,
      modifiedAt: aR.modifiedAt,
      requiredCount: fields.filter((field) => !!field.required && field.type !== 'SUBTABLE').length,
      lookupCount: relations.filter((rel) => rel.kind === 'LOOKUP').length,
      refCount: relations.filter((rel) => rel.kind === 'REF').length,
      sourceGuestId: options?.source?.guestId || ''
    };
    cache.set(appId, r); return r;
  } catch (e) { console.error(`App ${appId}:`, e); const r = { id: appId, name: `アプリ ${appId} (取得失敗)`, fields: [], allFields: [], totalFieldCount: 0, relations: [], ok: false }; cache.set(appId, r); return r; }
};

export const crawl = async (startIds, options) => {
  const cache = new Map();
  const visited = new Set();
  let reverseLookupIndex = null;
  const enqueueIfNeeded = (queue, appId, depth) => {
    if (!Number.isFinite(appId) || appId <= 0) return;
    if (visited.has(appId) || queue.some((item) => item.id === appId)) return;
    queue.push({ id: appId, depth });
  };
  const seeds = (Array.isArray(startIds) ? startIds : [startIds]).map((v) => Number(v)).filter((v) => Number.isFinite(v) && v > 0);
  const q = seeds.map((id) => ({ id, depth: 0 }));
  const apps = [];
  if (options?.includeReverseLookup) {
    progressUi.update(3, '逆引き探索用に全アプリを走査中...');
    const allApps = await fetchAllApps(options);
    reverseLookupIndex = new Map();
    for (let i = 0; i < allApps.length; i += 1) {
      const appId = Number(allApps[i]?.appId);
      if (!appId) continue;
      const schema = await getSchema(appId, options, cache);
      for (const rel of schema.relations || []) {
        if (!ER_TRAVERSE_RELATION_KINDS.has(rel.kind)) continue;
        const targetId = Number(rel.toApp);
        if (!targetId) continue;
        const set = reverseLookupIndex.get(targetId) || new Set();
        set.add(appId);
        reverseLookupIndex.set(targetId, set);
      }
      if (i % 20 === 0) progressUi.update(3 + Math.min(20, Math.floor((i / Math.max(1, allApps.length)) * 20)), `逆引き探索インデックス作成中... ${i + 1}/${allApps.length}`);
      if (i % 25 === 0) await sleep(Math.max(10, Math.floor((options.sleepMs || ER_DEFAULTS.sleepMs) / 2)));
    }
  }
  while (q.length) {
    const current = q.shift();
    const id = current?.id;
    const depth = current?.depth || 0;
    if (visited.has(id)) continue;
    visited.add(id);
    const a = await getSchema(id, options, cache);
    a.depth = depth;
    apps.push(a);
    progressUi.update(Math.min(90, (apps.length / Math.max(1, apps.length + q.length)) * 100 | 0), `解析: ${a.name} / 深さ ${depth}`);
    if (options?.maxDepth > 0 && depth >= options.maxDepth) {
      await sleep(options.sleepMs || ER_DEFAULTS.sleepMs);
      continue;
    }
    for (const r of a.relations) {
      if (!ER_TRAVERSE_RELATION_KINDS.has(r.kind)) continue;
      enqueueIfNeeded(q, Number(r.toApp), depth + 1);
    }
    if (reverseLookupIndex && reverseLookupIndex.has(id)) {
      const reverseRefs = Array.from(reverseLookupIndex.get(id));
      for (const srcId of reverseRefs) {
        enqueueIfNeeded(q, Number(srcId), depth + 1);
      }
    }
    await sleep(options.sleepMs || ER_DEFAULTS.sleepMs);
  }
  return apps;
};

export const buildHTML = (apps, options: any = {}) => {
  const data = safeJsonForScript(apps);
  const diagramOptions = safeJsonForScript({
    startAppId: options.startAppId || '',
    startAppIds: Array.isArray(options.startAppIds) ? options.startAppIds : [options.startAppId || ''],
    layoutName: options.layoutName || ER_DEFAULTS.layoutName,
    fieldDensity: options.fieldDensity || ER_DEFAULTS.fieldDensity,
    maxDepth: options.maxDepth || 0,
    includeSubtableFields: !!options.includeSubtableFields,
    includeReverseLookup: !!options.includeReverseLookup,
    spaceId: options.spaceId || '',
    spaceAppIds: Array.isArray(options.spaceAppIds) ? options.spaceAppIds.map((v) => String(v)) : [],
    sourceGuestId: options.source?.guestId || '',
    sourcePreview: !!options.source?.preview
  });
  const safeApps = Array.isArray(apps) ? apps : [];
  const densityLabelMap = { compact: 'コンパクト', standard: '標準', full: '詳細' };
  const summary = safeApps.reduce((acc, app) => {
    acc.relations += Array.isArray(app?.relations) ? app.relations.length : 0;
    acc.lookups += Number(app?.lookupCount || 0);
    acc.refs += Number(app?.refCount || 0);
    acc.actions += (app?.relations || []).filter((rel) => rel?.kind === 'ACTION').length;
    acc.required += Number(app?.requiredCount || 0);
    return acc;
  }, { relations: 0, lookups: 0, refs: 0, actions: 0, required: 0 });
  const startAppText = (Array.isArray(options.startAppIds) ? options.startAppIds : [options.startAppId || '']).filter(Boolean).join(', ');
  const erSpaceId = String(options.spaceId || '');
  const spaceAppIdSet = new Set((Array.isArray(options.spaceAppIds) ? options.spaceAppIds : []).map((v) => String(v)));
  const spaceAppCount = erSpaceId
    ? safeApps.filter((app) => spaceAppIdSet.has(String(app?.id)) || String(app?.spaceId || '') === erSpaceId).length
    : 0;
  const spacePill = erSpaceId
    ? `<span class="meta-pill" title="このスペースに属するアプリは二重枠で表示されます"><b>スペース</b> #${esc(erSpaceId)} (${esc(String(spaceAppCount))}アプリ)</span>`
    : '';
  const densityLabel = densityLabelMap[options.fieldDensity || ER_DEFAULTS.fieldDensity] || String(options.fieldDensity || ER_DEFAULTS.fieldDensity || '-');
  const cytoscapeScript = buildScriptTag(EXTERNAL_LIBRARIES.cytoscape.cdnUrl, EXTERNAL_LIBRARIES.cytoscape.altCdnUrl);
  const dagreScript = buildScriptTag(EXTERNAL_LIBRARIES.dagre.cdnUrl);
  const cytoscapeDagreScript = buildScriptTag(EXTERNAL_LIBRARIES.cytoscapeDagre.cdnUrl, EXTERNAL_LIBRARIES.cytoscapeDagre.altCdnUrl);
  return /*html*/`<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>kintone ER図 v3</title>
${cytoscapeScript}
${dagreScript}
${cytoscapeDagreScript}
<style>
@import url('${EXTERNAL_LIBRARIES.googleFontsDmSansMono.cdnUrl}');

*{margin:0;padding:0;box-sizing:border-box;}

:root{
  --bg:#08090d;--surface:#11131a;--surface2:#181c27;--border:#262d3d;
  --text:#d8dee9;--dim:#636e83;--accent:#5eead4;--accent2:#818cf8;
  --lookup:#60a5fa;--ref:#34d399;--pk:#fbbf24;--req:#f87171;--action:#f59e0b;
  --radius:10px;
  --topbar-h:52px;
  --shadow-sm:0 2px 6px rgba(0,0,0,0.18);
  --shadow-md:0 10px 28px rgba(0,0,0,0.28);
}
[data-theme="light"]{
  --bg:#f0f2f5;--surface:#ffffff;--surface2:#f7f8fa;--border:#d8dce6;
  --text:#1a1c23;--dim:#6b7280;--accent:#0d9488;--accent2:#6366f1;
  --lookup:#2563eb;--ref:#059669;--pk:#d97706;--req:#dc2626;--action:#d97706;
  --shadow-sm:0 1px 3px rgba(15,23,42,0.08);
  --shadow-md:0 12px 28px rgba(15,23,42,0.14);
}

body{font-family:'DM Sans',sans-serif;background:
  radial-gradient(circle at top left, rgba(94,234,212,0.08), transparent 28%),
  radial-gradient(circle at top right, rgba(129,140,248,0.08), transparent 26%),
  var(--bg);
  color:var(--text);overflow:hidden;height:100vh;}

/* ── Command Palette ── */
#cmd-overlay{display:none;position:fixed;inset:0;z-index:500;background:rgba(0,0,0,0.55);backdrop-filter:blur(6px);justify-content:center;align-items:flex-start;padding-top:12vh;}
#cmd-overlay.open{display:flex;}
#cmd-box{width:min(540px,92vw);background:var(--surface);border:1px solid var(--border);border-radius:14px;overflow:hidden;box-shadow:var(--shadow-md);}
#cmd-input{width:100%;padding:16px 20px;border:none;background:transparent;color:var(--text);font-size:15px;font-family:inherit;outline:none;border-bottom:1px solid var(--border);}
#cmd-input::placeholder{color:var(--dim);}
#cmd-results{max-height:min(340px,60vh);overflow-y:auto;}
.cmd-item{padding:10px 20px;cursor:pointer;display:flex;align-items:center;gap:10px;font-size:13px;border-bottom:1px solid var(--border);}
.cmd-item:hover,.cmd-item.active{background:var(--surface2);}
.cmd-item .kbd{margin-left:auto;font-size:10px;padding:2px 7px;background:var(--surface2);border:1px solid var(--border);border-radius:4px;font-family:'DM Mono',monospace;color:var(--dim);}

/* ── Top Bar ── */
#topbar{
  position:fixed;top:0;left:0;right:0;z-index:100;
  display:flex;align-items:center;gap:6px;padding:8px 14px;
  min-height:var(--topbar-h);
  background:linear-gradient(180deg,var(--bg) 82%,rgba(8,9,13,0.92));
  backdrop-filter:blur(12px);
  border-bottom:1px solid var(--border);
  flex-wrap:wrap;overflow-x:hidden;white-space:normal;
}
#topbar::-webkit-scrollbar{display:none;}
#topbar h1{font-size:14px;font-weight:700;margin-right:6px;white-space:nowrap;
  background:linear-gradient(135deg,var(--accent),var(--accent2));-webkit-background-clip:text;-webkit-text-fill-color:transparent;}
.tb{padding:6px 12px;border:1px solid var(--border);border-radius:var(--radius);background:var(--surface);color:var(--text);font-size:11px;cursor:pointer;transition:.15s;font-family:inherit;white-space:nowrap;flex:0 0 auto;display:inline-flex;align-items:center;gap:4px;min-height:30px;}
.tb:hover{border-color:var(--accent);color:var(--accent);}
.tb.active{background:var(--accent);color:#000;border-color:var(--accent);font-weight:600;}
.tb-icon{padding:6px 9px;font-size:13px;}
.tb-group{display:inline-flex;align-items:center;gap:4px;padding:2px 4px;border:1px solid var(--border);border-radius:var(--radius);background:var(--surface2);flex-wrap:nowrap;}
.tb-group .tb{border:1px solid transparent;background:transparent;padding:4px 8px;}
.tb-group .tb:hover{background:var(--surface);border-color:var(--border);color:var(--accent);}
.tb-group .tb.active{background:var(--accent);color:#000;border-color:var(--accent);}
.tb-group-label{font-size:10px;color:var(--dim);padding:0 4px;font-weight:600;letter-spacing:0.02em;}
.meta-pill{display:inline-flex;align-items:center;gap:4px;padding:4px 10px;border:1px solid var(--border);border-radius:999px;background:var(--surface2);font-size:10px;color:var(--dim);max-width:100%;}
.meta-pill b{color:var(--text);font-weight:700;}
#topbar select.tb-select{padding:5px 8px;border:1px solid var(--border);border-radius:var(--radius);background:var(--surface2);color:var(--text);font-size:11px;font-family:inherit;outline:none;flex:0 0 auto;min-height:30px;}
#topbar select.tb-select:focus{border-color:var(--accent);}
.sep{width:1px;height:20px;background:var(--border);margin:0 4px;}
#search-box{padding:6px 10px;border:1px solid var(--border);border-radius:var(--radius);background:var(--surface2);color:var(--text);font-size:11px;width:200px;font-family:inherit;outline:none;min-height:30px;}
#search-box:focus{border-color:var(--accent);}
#search-box::placeholder{color:var(--dim);}
#search-meta{min-width:84px;justify-content:center;}
.spacer{flex:1 1 16px;}

/* ── Dropdown menu ── */
.tb-menu{position:relative;}
.tb-menu > .tb-menu-btn::after{content:"▾";margin-left:4px;font-size:9px;opacity:0.7;}
.tb-menu-panel{display:none;position:absolute;top:calc(100% + 6px);right:0;min-width:200px;background:var(--surface);border:1px solid var(--border);border-radius:12px;box-shadow:var(--shadow-md);padding:6px;z-index:120;}
.tb-menu.open .tb-menu-panel{display:flex;flex-direction:column;gap:2px;}
.tb-menu-panel .tb{background:transparent;border:1px solid transparent;justify-content:flex-start;width:100%;padding:7px 10px;font-size:12px;}
.tb-menu-panel .tb:hover{background:var(--surface2);border-color:var(--border);}
.tb-menu-panel hr{border:none;border-top:1px solid var(--border);margin:4px 2px;}

/* mobile menu button (hidden on desktop) */
#mobile-menu-btn{display:none;}

@media (max-width: 1280px){
  #topbar{padding:6px 10px;row-gap:6px;}
  #topbar .sep{display:none;}
  #search-box{width:min(220px,100%);flex:1 1 200px;}
  #search-meta{min-width:0;}
  .tb-group-label{display:none;}
}
@media (max-width: 900px){
  :root{--topbar-h:auto;}
  #overview{top:calc(var(--topbar-h, 52px) + 58px);width:calc(100vw - 24px);left:12px;}
  .ov-grid{grid-template-columns:repeat(2,minmax(0,1fr));}
  #detail{width:min(96vw,420px);top:calc(var(--topbar-h, 52px) + 6px);}
  #banner{top:calc(var(--topbar-h, 52px) + 6px);}
  #sidebar{top:calc(var(--topbar-h, 52px) + 2px);width:min(300px,92vw);}
  #legend{font-size:9px;padding:6px 10px;gap:8px;flex-wrap:wrap;max-width:calc(100vw - 92px);}
}
@media (max-width: 640px){
  #topbar{padding:6px 8px;gap:4px;}
  #topbar h1{font-size:12px;margin-right:2px;}
  #mobile-menu-btn{display:inline-flex;}
  #topbar > .meta-group,
  #topbar > .tb-group[data-group="view"],
  #topbar > .tb-group[data-group="layout"],
  #topbar > .tb-group[data-group="focus"],
  #topbar > .tb-group[data-group="edit"],
  #topbar > #density-select,
  #topbar > #overview-toggle-btn,
  #topbar > .tb[data-mobile="hide"]{display:none;}
  #topbar.mobile-open > .meta-group,
  #topbar.mobile-open > .tb-group,
  #topbar.mobile-open > #density-select,
  #topbar.mobile-open > #overview-toggle-btn,
  #topbar.mobile-open > .tb[data-mobile="hide"]{display:inline-flex;}
  #topbar.mobile-open{padding-bottom:10px;}
  #search-box{flex:1 1 120px;width:100%;}
  #detail{width:100vw;right:0;top:0;max-height:100vh;border-radius:0;}
  #detail.open{top:0;}
  #sidebar{width:100vw;top:0;padding-top:22px;}
  #overview{top:calc(var(--topbar-h, 52px) + 40px);}
  .ov-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:6px;}
  .ov-card{padding:8px;min-height:58px;}
  .ov-kpi{font-size:16px;}
  #legend{bottom:8px;right:8px;font-size:9px;padding:5px 8px;gap:6px;max-width:calc(100vw - 16px);}
  #minimap{display:none !important;}
  #pathfinder{left:8px;right:8px;transform:none;padding:8px 10px;flex-wrap:wrap;}
  #path-result{max-width:100%;white-space:normal;}
  #toast{bottom:80px;font-size:11px;padding:7px 14px;}
  #banner{top:calc(var(--topbar-h, 52px) + 4px);left:8px;max-width:calc(100vw - 16px);}
  .meta-pill{font-size:9px;padding:3px 7px;}
  #zoom-ctrl{bottom:56px;right:8px;}
  #fab-mobile{display:flex;}
}

/* Floating action button for mobile */
#fab-mobile{display:none;position:fixed;bottom:16px;left:16px;z-index:110;flex-direction:column;gap:8px;}
#fab-mobile button{width:44px;height:44px;border-radius:50%;border:1px solid var(--border);background:var(--surface);color:var(--text);font-size:16px;cursor:pointer;box-shadow:var(--shadow-md);}
#fab-mobile button:hover{color:var(--accent);border-color:var(--accent);}

/* ── Zoom controls ── */
#zoom-ctrl{position:fixed;bottom:52px;right:210px;z-index:100;display:flex;flex-direction:column;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);overflow:hidden;box-shadow:var(--shadow-sm);}
#zoom-ctrl button{width:34px;height:30px;border:none;background:transparent;color:var(--text);cursor:pointer;font-size:13px;font-family:inherit;border-bottom:1px solid var(--border);transition:.12s;}
#zoom-ctrl button:last-child{border-bottom:none;}
#zoom-ctrl button:hover{background:var(--surface2);color:var(--accent);}
#zoom-level{font-size:9px;color:var(--dim);text-align:center;padding:3px 0;border-bottom:1px solid var(--border);font-family:'DM Mono',monospace;}

/* ── Sidebar ── */
#sidebar{
  position:fixed;top:48px;left:0;bottom:0;width:280px;z-index:90;
  background:var(--surface);border-right:1px solid var(--border);
  transform:translateX(-100%);transition:transform .25s;overflow-y:auto;
  padding:14px;font-size:12px;
}
#sidebar.open{transform:translateX(0);}
#sidebar h3{font-size:13px;margin:14px 0 8px;color:var(--accent);font-weight:600;}
#sidebar h3:first-child{margin-top:0;}
.stat-row{display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid var(--border);}
.stat-val{font-weight:600;font-family:'DM Mono',monospace;color:var(--accent2);}
.app-list-item{padding:6px 8px;cursor:pointer;border-radius:6px;margin:2px 0;transition:.1s;}
.app-list-item:hover{background:var(--surface2);}
.app-list-item.highlighted{background:rgba(94,234,212,0.12);border:1px solid var(--accent);}
.app-list-item.active-app{background:rgba(129,140,248,0.12);border:1px solid var(--accent2);}
.filter-chip{display:inline-block;padding:3px 8px;margin:2px;border:1px solid var(--border);border-radius:20px;font-size:10px;cursor:pointer;transition:.1s;}
.filter-chip:hover,.filter-chip.active{background:var(--accent);color:#000;border-color:var(--accent);}

/* ── Detail Panel ── */
#detail{
  position:fixed;top:54px;right:0;width:390px;max-height:calc(100vh - 62px);
  overflow-y:auto;z-index:90;background:var(--surface);border-left:1px solid var(--border);
  padding:20px;display:none;box-shadow:-18px 0 36px rgba(0,0,0,0.18);
}
#detail.open{display:block;}
#detail h2{font-size:15px;margin-bottom:4px;color:var(--accent);}
#detail .app-meta{font-size:11px;color:var(--dim);margin-bottom:12px;}
.detail-chip-row{display:flex;gap:6px;flex-wrap:wrap;margin:8px 0 12px;}
.close-btn{position:absolute;top:12px;right:14px;background:none;border:none;color:var(--dim);font-size:16px;cursor:pointer;}
.field-group-title{font-size:11px;font-weight:600;color:var(--dim);margin:12px 0 6px;text-transform:uppercase;letter-spacing:.05em;}
.field-row{display:flex;align-items:flex-start;gap:8px;padding:7px 8px;border-radius:8px;font-size:11px;border-bottom:1px solid var(--border);}
.field-row:hover{background:var(--surface2);}
.field-icon{width:18px;text-align:center;flex-shrink:0;}
.field-main{flex:1;min-width:0;}
.field-name{display:flex;align-items:center;gap:4px;flex-wrap:wrap;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:600;}
.field-sub{margin-top:2px;font-size:10px;color:var(--dim);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-family:'DM Mono',monospace;}
.field-type{color:var(--dim);font-size:10px;flex-shrink:0;}
.tag{display:inline-block;padding:1px 5px;border-radius:3px;font-size:9px;font-weight:600;margin-left:4px;}
.tag-pk{background:rgba(251,191,36,0.15);color:var(--pk);}
.tag-fk{background:rgba(96,165,250,0.15);color:var(--lookup);}
.tag-ref{background:rgba(52,211,153,0.15);color:var(--ref);}
.tag-req{background:rgba(248,113,113,0.12);color:var(--req);}
.tag-sub{background:rgba(99,110,131,0.15);color:var(--dim);}

/* ── Path Finder ── */
#pathfinder{
  position:fixed;bottom:16px;left:50%;transform:translateX(-50%);z-index:100;
  background:var(--surface);border:1px solid var(--border);border-radius:12px;
  padding:10px 16px;display:none;align-items:center;gap:8px;font-size:12px;
  box-shadow:0 8px 30px rgba(0,0,0,0.4);
}
#pathfinder.open{display:flex;}
#pathfinder select{padding:4px 8px;border:1px solid var(--border);border-radius:6px;background:var(--surface2);color:var(--text);font-size:11px;font-family:inherit;}
#pathfinder button{padding:4px 12px;border-radius:6px;}
#path-result{font-size:11px;color:var(--accent);max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}

/* ── Legend ── */
#legend{
  position:fixed;bottom:16px;right:16px;z-index:100;
  display:flex;gap:14px;padding:8px 14px;
  background:var(--surface);border:1px solid var(--border);
  border-radius:var(--radius);font-size:10px;box-shadow:var(--shadow-sm);
}
#legend span{display:flex;align-items:center;gap:4px;}
#legend i{display:inline-block;width:9px;height:9px;border-radius:2px;}
#legend .legend-toggle{cursor:pointer;padding:2px 6px;border:1px solid transparent;border-radius:8px;transition:.12s;}
#legend .legend-toggle:hover{background:var(--surface2);border-color:var(--border);}
#legend .legend-toggle.off{opacity:0.35;text-decoration:line-through;}

/* ── Help / Shortcut modal ── */
#help-overlay{display:none;position:fixed;inset:0;z-index:320;background:rgba(0,0,0,0.6);backdrop-filter:blur(4px);justify-content:center;align-items:center;padding:16px;}
#help-overlay.open{display:flex;}
#help-box{background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:22px;width:min(640px,100%);max-height:85vh;overflow-y:auto;box-shadow:var(--shadow-md);}
#help-box h2{font-size:16px;margin-bottom:4px;color:var(--accent);}
#help-box .help-sub{font-size:11px;color:var(--dim);margin-bottom:14px;}
.help-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:14px;}
.help-section h3{font-size:12px;font-weight:700;margin-bottom:6px;color:var(--text);text-transform:uppercase;letter-spacing:0.04em;}
.help-row{display:flex;justify-content:space-between;align-items:center;padding:5px 0;border-bottom:1px dashed var(--border);gap:10px;}
.help-row:last-child{border-bottom:none;}
.help-row span:first-child{font-size:11px;color:var(--text);}
.help-row kbd{background:var(--surface2);border:1px solid var(--border);border-radius:4px;padding:2px 7px;font-size:10px;color:var(--accent2);font-family:'DM Mono',monospace;white-space:nowrap;}
#help-box .close-row{margin-top:16px;display:flex;justify-content:flex-end;}
#help-box .close-row button{padding:7px 14px;border:1px solid var(--border);border-radius:8px;background:var(--surface);color:var(--text);cursor:pointer;font-family:inherit;font-size:12px;}

/* ── Minimap ── */
#minimap{
  position:fixed;bottom:52px;right:16px;z-index:100;
  width:180px;height:130px;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);
  overflow:hidden;display:none;
}
#minimap.open{display:block;}
#minimap canvas{width:100%;height:100%;}

/* ── Cy ── */
#cy{width:100vw;height:100vh;}

/* ── Modal ── */
#modal-overlay{display:none;position:fixed;inset:0;z-index:300;background:rgba(0,0,0,0.6);backdrop-filter:blur(4px);justify-content:center;align-items:center;}
#modal-overlay.open{display:flex;}
#modal{background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:24px;width:600px;max-height:80vh;overflow-y:auto;}
#modal h2{margin-bottom:10px;font-size:15px;}
#modal pre{background:var(--bg);padding:12px;border-radius:8px;font-size:11px;overflow-x:auto;white-space:pre-wrap;font-family:'DM Mono',monospace;color:var(--dim);max-height:400px;overflow-y:auto;border:1px solid var(--border);}
#modal .actions{margin-top:12px;display:flex;gap:8px;}
#modal .actions button{padding:7px 14px;border:1px solid var(--border);border-radius:8px;background:var(--surface);color:var(--text);cursor:pointer;font-family:inherit;font-size:12px;}
#modal .actions button.primary{background:var(--accent);color:#000;border-color:var(--accent);font-weight:600;}

/* ── Empty / Banner ── */
#banner{
  position:fixed;top:48px;left:16px;z-index:95;display:flex;gap:8px;flex-wrap:wrap;max-width:min(900px,calc(100vw - 32px));
  pointer-events:none;
}
#banner .meta-pill{pointer-events:auto;box-shadow:0 8px 20px rgba(0,0,0,0.18);}

/* ── Overview ── */
#overview{
  position:fixed;top:94px;left:16px;z-index:94;width:min(460px,calc(100vw - 32px));
  background:var(--surface);
  border:1px solid var(--border);border-radius:16px;padding:16px 16px 14px;
  box-shadow:0 18px 40px rgba(0,0,0,0.22);backdrop-filter:blur(12px);
}
#overview.collapsed .ov-sub,#overview.collapsed .ov-grid,#overview.collapsed .ov-tip-row{display:none;}
#overview.hidden{display:none;}
.ov-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:12px;}
.ov-close{flex:0 0 auto;background:none;border:1px solid transparent;color:var(--dim);font-size:14px;line-height:1;cursor:pointer;padding:4px 8px;border-radius:8px;transition:.12s;}
.ov-close:hover{background:var(--surface2);border-color:var(--border);color:var(--text);}
.ov-title{font-size:14px;font-weight:700;color:var(--text);}
.ov-sub{margin-top:4px;font-size:11px;line-height:1.6;color:var(--dim);}
.ov-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px;}
.ov-card{padding:10px 12px;border:1px solid var(--border);border-radius:12px;background:var(--surface2);display:flex;flex-direction:column;gap:4px;min-height:72px;}
.ov-kpi{font-size:18px;font-weight:700;line-height:1;color:var(--text);}
.ov-label{font-size:10px;color:var(--dim);}
.ov-tip-row{display:flex;gap:6px;flex-wrap:wrap;margin-top:10px;}
.ov-tip-row span{padding:5px 8px;border-radius:999px;background:var(--surface2);border:1px solid var(--border);font-size:10px;color:var(--dim);}

/* ── Toast ── */
#toast{position:fixed;bottom:60px;left:50%;transform:translateX(-50%) translateY(20px);z-index:600;padding:8px 20px;background:var(--accent);color:#000;border-radius:8px;font-size:12px;font-weight:600;opacity:0;transition:.3s;pointer-events:none;}
#toast.show{opacity:1;transform:translateX(-50%) translateY(0);}

/* scrollbar */
::-webkit-scrollbar{width:5px;}::-webkit-scrollbar-track{background:transparent;}::-webkit-scrollbar-thumb{background:var(--border);border-radius:3px;}
</style>
</head>
<body>

<!-- Command Palette -->
<div id="cmd-overlay" onclick="if(event.target===this)closeCmd()">
  <div id="cmd-box">
    <input id="cmd-input" placeholder="コマンドを入力... (アプリ検索、エクスポート、レイアウト変更...)" oninput="filterCmd(this.value)">
    <div id="cmd-results"></div>
  </div>
</div>

<!-- Top Bar -->
<div id="topbar">
  <button class="tb tb-icon" id="mobile-menu-btn" onclick="toggleMobileMenu()" title="メニュー" aria-label="メニュー">☰</button>
  <h1>⬡ kintone ER図</h1>

  <div class="meta-group" style="display:inline-flex;gap:4px;flex-wrap:wrap;">
    <span class="meta-pill"><b>開始</b> ${esc((Array.isArray(options.startAppIds) ? options.startAppIds : [options.startAppId || ""]).filter(Boolean).join(", "))}</span>
    <span class="meta-pill" id="layout-pill"><b>配置</b> ${esc(formatErLayoutLabel(options.layoutName))}</span>
    <span class="meta-pill" id="density-pill"><b>密度</b> ${esc(densityLabel)}</span>
    <span class="meta-pill"><b>深さ</b> ${esc(String(options.maxDepth || 0))}</span>
    ${spacePill}
  </div>

  <div class="sep"></div>

  <div class="tb-group" data-group="view">
    <span class="tb-group-label">表示</span>
    <button class="tb" onclick="toggleSidebar()" title="統計パネル (Ctrl+B)">📊</button>
    <button class="tb" id="overview-toggle-btn" onclick="toggleOverview()" title="ガイドパネル">🧭</button>
    <button class="tb" onclick="togglePathFinder()" title="経路探索">🛣</button>
    <button class="tb" onclick="toggleMinimap()" title="ミニマップ">🗺</button>
    <button class="tb" onclick="toggleFullscreen()" id="fs-btn" title="フルスクリーン (F11)">⛶</button>
  </div>

  <div class="tb-group" data-group="layout">
    <span class="tb-group-label">配置</span>
    <button class="tb" data-layout-btn="dagre" onclick="setLayout('dagre')" title="Dagre (推奨)">Dagre</button>
    <button class="tb" data-layout-btn="cose" onclick="setLayout('cose')" title="自動配置">自動</button>
    <button class="tb" data-layout-btn="breadthfirst" onclick="setLayout('breadthfirst')" title="ツリー">🌳</button>
    <button class="tb" data-layout-btn="concentric" onclick="setLayout('concentric')" title="同心円">◎</button>
    <button class="tb" data-layout-btn="grid" onclick="setLayout('grid')" title="グリッド">⊞</button>
    <button class="tb" data-layout-btn="circle" onclick="setLayout('circle')" title="円形">◯</button>
  </div>

  <select id="density-select" class="tb-select" onchange="setDensity(this.value)" title="表示密度">
    <option value="compact">🪶 コンパクト</option>
    <option value="standard">📄 標準</option>
    <option value="full">🧾 詳細</option>
  </select>

  <div class="sep"></div>

  <input id="search-box" placeholder="🔎 アプリ・フィールド検索 (Ctrl+F)" oninput="searchGraph(this.value)">
  <span class="meta-pill" id="search-meta"><b>検索</b> すべて</span>

  <div class="tb-group" data-group="focus">
    <span class="tb-group-label">強調</span>
    <button class="tb active" id="focus-toggle-btn" onclick="toggleFocusMode()" title="関連強調 (Shift+F)">🎯 ON</button>
    <select id="focus-depth" class="tb-select" onchange="updateFocusOptions()" title="強調する深さ">
      <option value="1">深さ1</option>
      <option value="2">深さ2</option>
      <option value="3">深さ3</option>
    </select>
    <select id="focus-direction" class="tb-select" onchange="updateFocusOptions()" title="強調の方向">
      <option value="both">双方向</option>
      <option value="out">出方向</option>
      <option value="in">入方向</option>
    </select>
    <button class="tb" onclick="clearFocus()" title="強調解除">✕</button>
  </div>

  <div class="tb-group" data-group="edit">
    <span class="tb-group-label">線</span>
    <button class="tb active" id="rel-lookup-btn" onclick="toggleRelationKind('LOOKUP')" title="ルックアップ線">🔗</button>
    <button class="tb active" id="rel-ref-btn" onclick="toggleRelationKind('REF')" title="関連レコード線">📋</button>
    <button class="tb active" id="rel-action-btn" onclick="toggleRelationKind('ACTION')" title="アクション線">⚡</button>
    <button class="tb active" id="rel-label-btn" onclick="toggleRelationLabels()" title="線ラベル">🏷</button>
  </div>

  <div class="tb-menu" id="edit-menu" data-mobile="hide">
    <button class="tb tb-menu-btn" onclick="toggleMenu('edit-menu')" title="編集">✏</button>
    <div class="tb-menu-panel">
      <button class="tb" onclick="removeSelectedRelations();closeAllMenus()">🗑 選択した関連線を削除</button>
      <button class="tb" onclick="restoreRemovedRelations();closeAllMenus()">↺ 削除した関連線を復元</button>
      <hr>
      <button class="tb" onclick="removeSelectedApps();closeAllMenus()">🗑 選択したアプリを削除</button>
      <button class="tb" onclick="restoreRemovedApps();closeAllMenus()">↺ 削除したアプリを復元</button>
      <hr>
      <button class="tb" onclick="togglePinFromSelection();closeAllMenus()">📌 選択ノードを固定/解除 (Shift+P)</button>
      <button class="tb" onclick="clearPins();closeAllMenus()">📍 固定を全解除</button>
    </div>
  </div>

  <div class="spacer"></div>

  <button class="tb" onclick="fit()" title="全体表示 (Ctrl+0)">📐</button>

  <div class="tb-menu" id="export-menu">
    <button class="tb tb-menu-btn" onclick="toggleMenu('export-menu')">💾 出力</button>
    <div class="tb-menu-panel">
      <button class="tb" onclick="exportPNG();closeAllMenus()">🖼 PNG 画像</button>
      <button class="tb" onclick="exportSVG();closeAllMenus()">📄 SVG 画像</button>
      <hr>
      <button class="tb" onclick="showMermaid();closeAllMenus()">🧜 Mermaid</button>
      <button class="tb" onclick="showDrawio();closeAllMenus()">📊 draw.io XML</button>
      <button class="tb" onclick="showPlantUML();closeAllMenus()">🌱 PlantUML</button>
      <button class="tb" onclick="showSQL();closeAllMenus()">🗄 SQL DDL</button>
      <hr>
      <button class="tb" onclick="showJSON();closeAllMenus()">{} JSON スキーマ</button>
      <button class="tb" onclick="showMarkdown();closeAllMenus()">📝 Markdown 仕様書</button>
      <button class="tb" onclick="showCSVApps();closeAllMenus()">📑 CSV (アプリ一覧)</button>
      <button class="tb" onclick="showCSVFields();closeAllMenus()">📑 CSV (フィールド)</button>
      <button class="tb" onclick="showCSVRelations();closeAllMenus()">📑 CSV (関連)</button>
      <hr>
      <button class="tb" onclick="copyShareUrl();closeAllMenus()">🔗 表示状態のURLをコピー</button>
      <button class="tb" onclick="printDiagram();closeAllMenus()">🖨 印刷</button>
    </div>
  </div>

  <button class="tb tb-icon" id="theme-btn" onclick="toggleTheme()" title="テーマ切替">🌙</button>
  <button class="tb tb-icon" onclick="openHelp()" title="ヘルプ (?)">❓</button>
  <button class="tb tb-icon" onclick="openCmd()" title="コマンド (Ctrl+K)">⌘K</button>
</div>

<!-- Floating action buttons for mobile -->
<div id="fab-mobile">
  <button onclick="fit()" title="全体表示">📐</button>
  <button onclick="toggleSidebar()" title="統計">📊</button>
</div>

<!-- Zoom controls -->
<div id="zoom-ctrl">
  <button onclick="zoomIn()" title="拡大 (+)">＋</button>
  <div id="zoom-level">100%</div>
  <button onclick="zoomReset()" title="リセット (0)">◎</button>
  <button onclick="zoomOut()" title="縮小 (-)">－</button>
</div>

<div id="banner">
  <span class="meta-pill"><b>アプリ数</b> ${apps.length}</span>
  <span class="meta-pill"><b>ゲスト</b> ${esc(options.source?.guestId ? `ゲスト ${String(options.source.guestId)}` : '通常空間')}</span>
  <span class="meta-pill"><b>モード</b> ${options.source?.preview ? 'プレビュー' : '本番'}</span>
  <span class="meta-pill"><b>サブテーブル</b> ${options.includeSubtableFields ? 'ON' : 'OFF'}</span>
</div>

<div id="overview">
  <div class="ov-head">
    <div>
      <div class="ov-title">見方のガイド</div>
      <div class="ov-sub">開始アプリの周辺から追って、検索と関連強調で範囲を絞ると読みやすくなります。詳細度は上部の「密度」でその場で切り替えできます。</div>
    </div>
    <button class="ov-close" onclick="hideOverview()" title="ガイドを閉じる（🧭 で再表示）" aria-label="ガイドを閉じる">✕</button>
  </div>
  <div class="ov-grid">
    <div class="ov-card"><span class="ov-kpi">${safeApps.length}</span><span class="ov-label">アプリ</span></div>
    <div class="ov-card"><span class="ov-kpi">${summary.relations}</span><span class="ov-label">総関連</span></div>
    <div class="ov-card"><span class="ov-kpi">${summary.lookups}</span><span class="ov-label">Lookup</span></div>
    <div class="ov-card"><span class="ov-kpi">${summary.refs}</span><span class="ov-label">関連レコード</span></div>
    <div class="ov-card"><span class="ov-kpi">${summary.actions}</span><span class="ov-label">アクション</span></div>
  </div>
  <div class="ov-tip-row">
    <span>開始: ${esc(startAppText || '-')}</span>
    <span>必須項目: ${summary.required}</span>
    <span>クリックで詳細</span>
    <span>右クリックで固定</span>
    <span>Alt/⌥ + 右クリックで非表示</span>
    <span>Shift + F で関連強調</span>
  </div>
</div>

<!-- Sidebar -->
<div id="sidebar">
  <h3>📊 統計サマリー</h3>
  <div id="stats-summary"></div>
  <h3>🏷 フィールドタイプフィルター</h3>
  <div id="type-filters"></div>
  <h3>📱 アプリ一覧</h3>
  <div id="app-list"></div>
</div>

<!-- Cytoscape -->
<div id="cy"></div>

<!-- Detail Panel -->
<div id="detail">
  <button class="close-btn" onclick="closeDetail()">✕</button>
  <h2 id="detail-title"></h2>
  <div class="app-meta" id="detail-meta"></div>
  <div id="detail-relations"></div>
  <div id="detail-fields"></div>
</div>

<!-- Path Finder -->
<div id="pathfinder">
  <span>経路:</span>
  <select id="pf-from"></select>
  <span>→</span>
  <select id="pf-to"></select>
  <button class="tb active" onclick="findPath()">検索</button>
  <button class="tb" onclick="clearPath()">クリア</button>
  <span id="path-result"></span>
</div>

<!-- Legend -->
<div id="legend">
  <span><i style="background:var(--pk)"></i>PK</span>
  <span><i style="background:var(--lookup)"></i>ルックアップ</span>
  <span><i style="background:var(--ref)"></i>関連</span>
  <span><i style="background:var(--req)"></i>必須</span>
  <span><i style="background:#f59e0b"></i>アクション</span>
  <span class="legend-toggle" id="legend-lookup-edge" onclick="toggleRelationKind('LOOKUP')"><i style="border:2px solid var(--lookup)"></i>ルックアップ線</span>
  <span class="legend-toggle" id="legend-ref-edge" onclick="toggleRelationKind('REF')"><i style="border:2px dashed var(--ref)"></i>関連線</span>
  <span class="legend-toggle" id="legend-action-edge" onclick="toggleRelationKind('ACTION')"><i style="border:2px dotted #f59e0b"></i>アクション線</span>
</div>

<!-- Minimap -->
<div id="minimap"><canvas id="minimap-canvas"></canvas></div>

<!-- Modal -->
<div id="modal-overlay" onclick="if(event.target===this)closeModal()">
  <div id="modal"><h2 id="modal-title"></h2><pre id="modal-content"></pre>
    <div class="actions">
      <button class="primary" onclick="copyModal()">📋 コピー</button>
      <button onclick="downloadModal()">💾 ダウンロード</button>
      <button onclick="closeModal()">閉じる</button>
    </div>
  </div>
</div>

<!-- Help / Shortcut modal -->
<div id="help-overlay" onclick="if(event.target===this)closeHelp()">
  <div id="help-box">
    <h2>❓ キーボードショートカット ＆ 使い方</h2>
    <div class="help-sub">クリック: 詳細表示 / 右クリック: 固定 / Alt+右クリック: 非表示 / ドラッグ: 移動</div>
    <div class="help-grid">
      <div class="help-section">
        <h3>表示・ナビゲーション</h3>
        <div class="help-row"><span>コマンドパレット</span><kbd>Ctrl/⌘ + K</kbd></div>
        <div class="help-row"><span>アプリ・項目を検索</span><kbd>Ctrl/⌘ + F</kbd></div>
        <div class="help-row"><span>全体表示 (フィット)</span><kbd>Ctrl/⌘ + 0</kbd></div>
        <div class="help-row"><span>拡大 / 縮小</span><kbd>+ / -</kbd></div>
        <div class="help-row"><span>統計パネル</span><kbd>Ctrl/⌘ + B</kbd></div>
        <div class="help-row"><span>ヘルプを開閉</span><kbd>?</kbd></div>
        <div class="help-row"><span>閉じる / 強調解除</span><kbd>Esc</kbd></div>
      </div>
      <div class="help-section">
        <h3>操作・編集</h3>
        <div class="help-row"><span>関連強調 ON/OFF</span><kbd>Shift + F</kbd></div>
        <div class="help-row"><span>固定 / 固定解除</span><kbd>Shift + P</kbd></div>
        <div class="help-row"><span>フルスクリーン</span><kbd>F11</kbd></div>
        <div class="help-row"><span>背景をクリック</span><kbd>強調解除</kbd></div>
        <div class="help-row"><span>ノードをダブルクリック</span><kbd>近隣のみ表示</kbd></div>
        <div class="help-row"><span>右クリック (ノード)</span><kbd>固定/解除</kbd></div>
        <div class="help-row"><span>Alt + 右クリック</span><kbd>非表示</kbd></div>
      </div>
    </div>
    <div class="close-row"><button onclick="closeHelp()">閉じる</button></div>
  </div>
</div>

<div id="toast"></div>

<script>
const APPS = ${data};
const ER_OPTIONS = ${diagramOptions};
const appMap = new Map(APPS.map(a=>[a.id,a]));
if (window.cytoscapeDagre) cytoscape.use(window.cytoscapeDagre);

// ─── Toast ───
function toast(msg){const t=document.getElementById("toast");t.textContent=msg;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),2000);}
function escapeHtml(value){
  return String(value == null ? "" : value)
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;")
    .replace(/'/g,"&#39;");
}

// ─── Theme ───
let isDark = true;
function readCssVar(name, fallback){
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}
function currentPalette(){
  return {
    text: readCssVar("--text", isDark ? "#d8dee9" : "#1a1c23"),
    dim: readCssVar("--dim", isDark ? "#636e83" : "#6b7280"),
    accent: readCssVar("--accent", isDark ? "#5eead4" : "#0d9488"),
    accent2: readCssVar("--accent2", isDark ? "#818cf8" : "#6366f1"),
    lookup: readCssVar("--lookup", isDark ? "#60a5fa" : "#2563eb"),
    ref: readCssVar("--ref", isDark ? "#34d399" : "#059669"),
    pk: readCssVar("--pk", isDark ? "#fbbf24" : "#d97706"),
    req: readCssVar("--req", isDark ? "#f87171" : "#dc2626"),
    action: readCssVar("--action", isDark ? "#f59e0b" : "#d97706"),
    bg: readCssVar("--bg", isDark ? "#08090d" : "#f0f2f5"),
    surface: readCssVar("--surface", isDark ? "#11131a" : "#ffffff"),
    surface2: readCssVar("--surface2", isDark ? "#181c27" : "#f7f8fa"),
    border: readCssVar("--border", isDark ? "#262d3d" : "#d8dce6")
  };
}
function formatFieldDensityLabel(density){
  const map = { compact:"コンパクト", standard:"標準", full:"詳細" };
  return map[density] || density || "-";
}
function fieldIconForLabel(f){
  if(f.isPK) return "🔑";
  if(f.isLookup) return "🔗";
  if(f.isRef) return "📋";
  if(f.unique) return "🔒";
  if(f.type==="SUBTABLE") return "📦";
  if(f.inSubtable) return "↳";
  if(f.required) return "•";
  return "·";
}
// kintone API のフィールド ENUM を日本語化（ER 図側パネル表示用）
const FIELD_TYPE_JP_LABEL = {
  SINGLE_LINE_TEXT:"文字列(1行)", MULTI_LINE_TEXT:"文字列(複数行)", RICH_TEXT:"リッチエディター",
  NUMBER:"数値", CALC:"計算", RADIO_BUTTON:"ラジオボタン", CHECK_BOX:"チェックボックス",
  DROP_DOWN:"ドロップダウン", MULTI_SELECT:"複数選択", DATE:"日付", TIME:"時刻", DATETIME:"日時",
  USER_SELECT:"ユーザー選択", ORGANIZATION_SELECT:"組織選択", GROUP_SELECT:"グループ選択",
  LOOKUP:"ルックアップ", SUBTABLE:"テーブル", REFERENCE_TABLE:"関連レコード一覧",
  RECORD_NUMBER:"レコード番号", CREATOR:"作成者", CREATED_TIME:"作成日時",
  MODIFIER:"更新者", UPDATED_TIME:"更新日時", STATUS:"ステータス", STATUS_ASSIGNEE:"作業者",
  CATEGORY:"カテゴリー", FILE:"添付ファイル", LINK:"リンク",
  LABEL:"ラベル", SPACER:"スペース", HR:"罫線", GROUP:"グループ"
};
function fieldTypeJpLabel(type){
  if(!type) return "-";
  const key = String(type).trim().toUpperCase();
  return FIELD_TYPE_JP_LABEL[key] || type;
}
function visibleFieldsForNode(app){
  return (app.fields || []).filter(f=>ER_OPTIONS.includeSubtableFields || !f.inSubtable);
}
function buildFieldDisplayName(field){
  if(!field) return "";
  if(field.inSubtable && field.tableLabel) return field.tableLabel + " > " + (field.label || field.code || "");
  return field.label || field.code || field.path || "";
}
function fieldPrefixForNodeLabel(field){
  if(field.isPK) return "KEY";
  if(field.isLookup) return "FK";
  if(field.isRef) return "REF";
  if(field.required) return "REQ";
  if(field.type === "SUBTABLE") return "SUB";
  if(field.inSubtable) return "COL";
  return "FLD";
}
function buildFieldPreviewLine(field){
  const label = buildFieldDisplayName(field).trim();
  const code = String(field.code || "").trim();
  const type = String(field.type || "").trim();
  const prefix = fieldPrefixForNodeLabel(field);
  if(ER_OPTIONS.fieldDensity === "compact"){
    return prefix + " " + label;
  }
  if(ER_OPTIONS.fieldDensity === "full"){
    const extras = [];
    if(code && code !== label) extras.push("[" + code + "]");
    if(type) extras.push(lookupEnum(FIELD_TYPE_JP, type) || type);
    return prefix + " " + label + (extras.length ? " • " + extras.join(" • ") : "");
  }
  return prefix + " " + label + (code && code !== label ? " [" + code + "]" : "");
}
function buildNodeLabel(app){
  const limits = { compact: 6, standard: 10, full: 16 };
  const maxLines = limits[ER_OPTIONS.fieldDensity] || limits.standard;
  const fields = visibleFieldsForNode(app);
  const ordered = fields.slice().sort((a,b)=>{
    const score = (f)=> (f.isPK ? 0 : (f.isLookup ? 1 : (f.isRef ? 2 : (f.required ? 3 : (f.inSubtable ? 5 : 4)))));
    const diff = score(a) - score(b);
    if(diff !== 0) return diff;
    return String(buildFieldDisplayName(a) || a.code || '').localeCompare(String(buildFieldDisplayName(b) || b.code || ''));
  });
  const preview = ordered.slice(0, maxLines).map((f)=>buildFieldPreviewLine(f));
  if(ordered.length > maxLines) preview.push("+ " + (ordered.length - maxLines) + " 件");
  const totalFieldCount = typeof app.totalFieldCount === "number" ? app.totalFieldCount : fields.length;
  const fieldCountText = totalFieldCount > fields.length
    ? fields.length + "/" + totalFieldCount + "項目"
    : fields.length + "項目";
  const meta = [
    "App " + app.id,
    fieldCountText,
    app.relations.length + "関連",
    "深さ " + (app.depth || 0)
  ].join(" / ");
  return [(app.depth || 0) === 0 ? "★ " + app.name : app.name, meta, ...preview].join("\\n");
}
function detailFieldGroups(app){
  const groups={pk:[],lookup:[],ref:[],required:[],subtable:[],normal:[]};
  visibleFieldsForNode(app).forEach(f=>{
    if(f.isPK) groups.pk.push(f);
    else if(f.isLookup) groups.lookup.push(f);
    else if(f.isRef) groups.ref.push(f);
    else if(f.type==="SUBTABLE") groups.subtable.push(f);
    else if(f.required) groups.required.push(f);
    else groups.normal.push(f);
  });
  return groups;
}
function layoutDisplayName(name){
  const map = { dagre:"Dagre", breadthfirst:"ツリー", cose:"フォース", concentric:"同心円", grid:"グリッド", circle:"円形" };
  return map[name] || name || "-";
}
function buildLayoutOptions(name, initial){
  const base = { padding: 80, animate: !initial, animationDuration: initial ? 0 : 550, fit: true };
  if(name === "dagre" && window.cytoscapeDagre){
    return Object.assign(base, { name: "dagre", rankDir: "LR", rankSep: 170, nodeSep: 48, edgeSep: 24, spacingFactor: 1.1 });
  }
  if(name === "grid") return Object.assign(base, { name: "grid", rows: Math.ceil(Math.sqrt(APPS.length || 1)) });
  if(name === "circle") return Object.assign(base, { name: "circle" });
  if(name === "breadthfirst") return Object.assign(base, { name: "breadthfirst", directed: true, spacingFactor: 1.6, circle: false });
  if(name === "concentric") return Object.assign(base, { name: "concentric", concentric: n => (n.data("relCount") || 0) + 1, levelWidth: () => 2 });
  return Object.assign(base, { name: "cose", nodeRepulsion: 900000, idealEdgeLength: 280, gravity: 0.22, numIter: 1400 });
}
function densityNodeMetrics(){
  if(ER_OPTIONS.fieldDensity === "compact") return { maxWidth:"230px", fontSize:"9px", padding:"12px", lineHeight:"1.22" };
  if(ER_OPTIONS.fieldDensity === "full") return { maxWidth:"320px", fontSize:"10.5px", padding:"18px", lineHeight:"1.35" };
  return { maxWidth:"280px", fontSize:"10px", padding:"15px", lineHeight:"1.3" };
}
function buildCyStyle(palette){
  const nodeMetrics = densityNodeMetrics();
  return [
    {selector:"node",style:{
      "shape":"round-rectangle","label":"data(label)","text-valign":"center","text-halign":"center",
      "text-wrap":"wrap","text-max-width":nodeMetrics.maxWidth,"font-size":nodeMetrics.fontSize,"line-height":nodeMetrics.lineHeight,
      "font-family":"'DM Sans','Hiragino Sans','Yu Gothic UI',sans-serif","font-weight":600,"color":palette.text,
      "text-outline-color":palette.surface,"text-outline-width":"2px",
      "background-color":palette.surface,"border-width":2,"border-color":palette.border,"padding":nodeMetrics.padding,"width":"label","height":"label"
    }},
    {selector:"node[?isError]",style:{"border-color":palette.req,"background-color":isDark ? "#220b12" : "#fff1f2"}},
    {selector:"node[?isStart]",style:{"border-color":palette.accent2,"border-width":4,"background-color":isDark ? "#11162d" : "#eef2ff"}},
    {selector:"node[?inSpace]",style:{"border-color":"#0ea5a4","border-width":4,"border-style":"double","background-color":isDark ? "#06231f" : "#ecfdf5"}},
    {selector:"node:selected",style:{"border-color":palette.accent,"border-width":4,"overlay-color":"transparent"}},
    {selector:"node.highlighted",style:{"border-color":palette.pk,"border-width":3,"background-color":isDark ? "#1a1805" : "#fffbeb"}},
    {selector:"node.path-node",style:{"border-color":"#f472b6","border-width":4,"background-color":isDark ? "#1a0a12" : "#fdf2f8"}},
    {selector:"node.focus-root",style:{"border-color":palette.accent,"border-width":4,"background-color":isDark ? "#042525" : "#ecfeff","z-index":999}},
    {selector:"node.focus-neighbor",style:{"border-color":"#67e8f9","border-width":3,"background-color":isDark ? "#061d2a" : "#ecfeff"}},
    {selector:"node.pinned-node",style:{"border-color":palette.pk,"border-width":4,"background-color":isDark ? "#2a1f05" : "#fff7ed"}},
    {selector:"node.isolated-by-filter",style:{"opacity":0.35}},
    {selector:"node.focus-dim",style:{"opacity":0.08}},
    {selector:"node.dimmed",style:{"opacity":0.14}},
    {selector:"node.app-manual-hidden",style:{"display":"none"}},
    {selector:'edge[kind="LOOKUP"]',style:{
      "width":2.5,"line-color":palette.lookup,"target-arrow-color":palette.lookup,"target-arrow-shape":"triangle",
      "source-arrow-shape":"circle","source-arrow-color":palette.lookup,"curve-style":"bezier",
      "label":"data(label)","font-size":"9px","color":palette.lookup,
      "text-outline-color":palette.bg,"text-outline-width":"2px",
      "text-background-color":palette.bg,"text-background-opacity":0.78,"text-background-padding":"3px"
    }},
    {selector:'edge[kind="REF"]',style:{
      "width":2,"line-color":palette.ref,"line-style":"dashed","target-arrow-color":palette.ref,
      "target-arrow-shape":"triangle","source-arrow-shape":"diamond","source-arrow-color":palette.ref,"curve-style":"bezier",
      "label":"data(label)","font-size":"9px","color":palette.ref,
      "text-outline-color":palette.bg,"text-outline-width":"2px",
      "text-background-color":palette.bg,"text-background-opacity":0.78,"text-background-padding":"3px"
    }},
    {selector:'edge[kind="ACTION"]',style:{
      "width":2.2,"line-color":palette.action,"line-style":"dotted","target-arrow-color":palette.action,
      "target-arrow-shape":"triangle","source-arrow-shape":"none","curve-style":"bezier",
      "label":"data(label)","font-size":"9px","color":palette.action,
      "text-outline-color":palette.bg,"text-outline-width":"2px",
      "text-background-color":palette.bg,"text-background-opacity":0.78,"text-background-padding":"3px"
    }},
    {selector:"edge.label-hidden",style:{"text-opacity":0,"text-background-opacity":0}},
    {selector:"edge.path-edge",style:{"width":4,"line-color":"#f472b6","target-arrow-color":"#f472b6","source-arrow-color":"#f472b6","z-index":999}},
    {selector:"edge.focus-edge",style:{"width":4,"line-color":palette.accent,"target-arrow-color":palette.accent,"source-arrow-color":palette.accent,"z-index":998}},
    {selector:"edge.rel-hidden",style:{"display":"none"}},
    {selector:"edge.rel-manual-hidden",style:{"display":"none"}},
    {selector:"edge.focus-dim",style:{"opacity":0.04}},
    {selector:"edge.dimmed",style:{"opacity":0.08}}
  ];
}
function applyTheme(){
  document.documentElement.setAttribute("data-theme",isDark?"":"light");
  document.getElementById("theme-btn").textContent=isDark?"🌙":"☀️";
}
function toggleTheme(){
  isDark=!isDark;
  applyTheme();
  applyCyTheme();
  toast(isDark?"ダークモード":"ライトモード");
}
applyTheme();

// ─── Cytoscape Init ───
const startAppIdSet = new Set((ER_OPTIONS.startAppIds || []).map((id)=>String(id)));
const spaceAppIdSet = new Set((ER_OPTIONS.spaceAppIds || []).map((id)=>String(id)));
const erSpaceId = String(ER_OPTIONS.spaceId || "");
const isInSpaceApp = (app)=> !!erSpaceId && (spaceAppIdSet.has(String(app.id)) || String(app.spaceId || "") === erSpaceId);
const elements=[];
APPS.forEach(app=>{
  elements.push({data:{
    id:"a"+app.id,
    label:buildNodeLabel(app),
    appId:app.id,
    isError:!app.ok,
    isStart:startAppIdSet.has(String(app.id)),
    inSpace:isInSpaceApp(app),
    fieldCount:visibleFieldsForNode(app).length,
    relCount:app.relations.length,
    depth:app.depth || 0
  }});
});
let ei=0;
APPS.forEach(app=>{
  app.relations.forEach(r=>{
    if(appMap.has(r.toApp)){
      elements.push({data:{id:"e"+(ei++),source:"a"+app.id,target:"a"+r.toApp,kind:r.kind,label:r.fromDisplay || r.fromLabel || (r.kind==="LOOKUP"?"ルックアップ":(r.kind==="REF"?"関連":"アクション")),fromLabel:r.fromLabel,fromDisplay:r.fromDisplay || r.fromLabel || ""}});
    }
  });
});

const cy=cytoscape({
  container:document.getElementById("cy"),
  elements,
  style: buildCyStyle(currentPalette()),
  layout: buildLayoutOptions(ER_OPTIONS.layoutName || "dagre", true),
  minZoom:0.05,maxZoom:4,wheelSensitivity:0.25,
});

function applyCyTheme(){
  cy.style().fromJson(buildCyStyle(currentPalette())).update();
}
function syncLayoutButtons(name){
  document.querySelectorAll("[data-layout-btn]").forEach((btn)=>{
    btn.classList.toggle("active", btn.dataset.layoutBtn === name);
  });
}
function refreshNodeLabels(){
  APPS.forEach((app)=>{
    const node = cy.getElementById("a"+app.id);
    if(node.length) node.data("label", buildNodeLabel(app));
  });
}
function syncDensityControl(){
  const select = document.getElementById("density-select");
  if(select) select.value = ER_OPTIONS.fieldDensity || "standard";
  const pill = document.getElementById("density-pill");
  if(pill) pill.innerHTML = "<b>表示密度</b> " + formatFieldDensityLabel(ER_OPTIONS.fieldDensity);
}
function setDensity(value){
  const next = ["compact","standard","full"].includes(String(value)) ? String(value) : "standard";
  ER_OPTIONS.fieldDensity = next;
  refreshNodeLabels();
  applyCyTheme();
  syncDensityControl();
  toast("表示密度: " + formatFieldDensityLabel(next));
}
function hideOverview(){
  const panel = document.getElementById("overview");
  const btn = document.getElementById("overview-toggle-btn");
  if(!panel) return;
  panel.classList.add("hidden");
  if(btn){
    btn.classList.remove("active");
    btn.title = "ガイドを開く";
  }
}
function toggleOverview(){
  const panel = document.getElementById("overview");
  const btn = document.getElementById("overview-toggle-btn");
  if(!panel) return;
  if(panel.classList.contains("hidden")){
    panel.classList.remove("hidden","collapsed");
    if(btn){ btn.classList.add("active"); btn.title = "ガイドを隠す"; }
    return;
  }
  const nextCollapsed = !panel.classList.contains("collapsed");
  panel.classList.toggle("collapsed", nextCollapsed);
  if(btn){
    btn.classList.toggle("active", !nextCollapsed);
    btn.title = nextCollapsed ? "ガイドを開く" : "ガイドを隠す";
  }
}
function updateSearchMeta(query, matched){
  const pill = document.getElementById("search-meta");
  if(!pill) return;
  const normalized = String(query || "").trim();
  if(!normalized){
    pill.innerHTML = "<b>検索</b> すべて";
    pill.title = "";
    return;
  }
  pill.innerHTML = "<b>検索</b> " + matched + "件";
  pill.title = normalized;
}

function fit(){cy.fit(undefined,60);}
cy.one("layoutstop",()=>setTimeout(fit,200));
syncLayoutButtons(ER_OPTIONS.layoutName || "dagre");
syncDensityControl();
updateSearchMeta("", 0);

// ─── Layout Switching ───
function setLayout(name){
  ER_OPTIONS.layoutName = name;
  syncLayoutButtons(name);
  const pill = document.getElementById("layout-pill");
  if(pill) pill.innerHTML = "<b>レイアウト</b> " + layoutDisplayName(name);
  cy.layout(buildLayoutOptions(name, false)).run();
  toast("レイアウト: " + layoutDisplayName(name));
}

const relationKindState = { LOOKUP: true, REF: true, ACTION: true };
let relationLabelVisible = true;
let focusMode = true;
let focusDepth = 1;
let focusDirection = "both";
let currentFocusNodeId = "";
let lastTappedNodeId = "";
let activeAppId = 0;
const pinnedNodeIds = new Set();

function syncLegendState(){
  const lookup = document.getElementById("legend-lookup-edge");
  const ref = document.getElementById("legend-ref-edge");
  const action = document.getElementById("legend-action-edge");
  if(lookup) lookup.classList.toggle("off", !relationKindState.LOOKUP);
  if(ref) ref.classList.toggle("off", !relationKindState.REF);
  if(action) action.classList.toggle("off", !relationKindState.ACTION);
}
function syncRelationLabelButton(){
  const btn = document.getElementById("rel-label-btn");
  if(!btn) return;
  btn.classList.toggle("active", relationLabelVisible);
  btn.textContent = relationLabelVisible ? "線ラベル" : "線ラベル OFF";
}
function applyRelationLabelVisibility(){
  cy.edges().toggleClass("label-hidden", !relationLabelVisible);
  syncRelationLabelButton();
}
function toggleRelationLabels(){
  relationLabelVisible = !relationLabelVisible;
  applyRelationLabelVisibility();
  toast(relationLabelVisible ? "線ラベルを表示" : "線ラベルを非表示");
}
function setActiveApp(appId){
  activeAppId = Number(appId) || 0;
  refreshAppList();
}

function applyRelationFilter(){
  const partialFilter = !relationKindState.LOOKUP || !relationKindState.REF || !relationKindState.ACTION;
  cy.edges().forEach(e=>{
    const visible = !!relationKindState[e.data("kind")];
    e.toggleClass("rel-hidden", !visible);
  });
  cy.nodes().forEach(n=>{
    const visibleEdgeCount = n.connectedEdges().filter(e=>!e.hasClass("rel-hidden") && !e.hasClass("rel-manual-hidden")).length;
    n.toggleClass("isolated-by-filter", partialFilter && visibleEdgeCount === 0);
  });
  syncLegendState();
}

function collectFocusSet(rootNode, depth, direction){
  let nodes = cy.collection(rootNode);
  let edges = cy.collection();
  let frontier = cy.collection(rootNode);
  const visited = new Set([rootNode.id()]);

  for(let i=0;i<depth;i++){
    let next = cy.collection();
    frontier.forEach(n=>{
      let candidateEdges = n.connectedEdges().filter(e=>!e.hasClass("rel-hidden") && !e.hasClass("rel-manual-hidden"));
      if(direction==="out") candidateEdges = candidateEdges.filter(e=>e.source().id()===n.id());
      if(direction==="in") candidateEdges = candidateEdges.filter(e=>e.target().id()===n.id());

      candidateEdges.forEach(e=>{
        edges = edges.union(e);
        let linked = cy.collection();
        if(direction==="out") linked = linked.union(e.target());
        else if(direction==="in") linked = linked.union(e.source());
        else linked = linked.union(e.connectedNodes().difference(n));

        linked.forEach(nn=>{
          if(visited.has(nn.id())) return;
          visited.add(nn.id());
          nodes = nodes.union(nn);
          next = next.union(nn);
        });
      });
    });
    frontier = next;
    if(frontier.length===0) break;
  }

  return { nodes, edges };
}

function applyFocusToNode(node, silent){
  cy.elements().removeClass("focus-root focus-neighbor focus-edge focus-dim");
  if(!focusMode || !node || !node.length) return;

  const depth = Math.max(1, Number(focusDepth) || 1);
  const result = collectFocusSet(node, depth, focusDirection);
  cy.elements().addClass("focus-dim");
  result.nodes.removeClass("focus-dim").addClass("focus-neighbor");
  result.edges.removeClass("focus-dim").addClass("focus-edge");
  node.removeClass("focus-neighbor").addClass("focus-root");
  currentFocusNodeId = node.id();

  if(!silent){
    const relatedCount = Math.max(0, result.nodes.length - 1);
    toast("関連強調: "+relatedCount+"アプリ");
  }
}

function clearFocus(silent){
  currentFocusNodeId = "";
  cy.elements().removeClass("focus-root focus-neighbor focus-edge focus-dim");
  if(!silent) toast("関連強調を解除");
}

function toggleFocusMode(){
  focusMode = !focusMode;
  const btn = document.getElementById("focus-toggle-btn");
  if(btn){
    btn.classList.toggle("active", focusMode);
    btn.textContent = focusMode ? "🎯 関連強調 ON" : "🎯 関連強調 OFF";
  }
  if(!focusMode) clearFocus(true);
  else if(currentFocusNodeId) applyFocusToNode(cy.getElementById(currentFocusNodeId), true);
  toast(focusMode ? "関連強調 ON" : "関連強調 OFF");
}

function updateFocusOptions(){
  focusDepth = Number(document.getElementById("focus-depth")?.value || 1);
  focusDirection = document.getElementById("focus-direction")?.value || "both";
  if(focusMode && currentFocusNodeId) applyFocusToNode(cy.getElementById(currentFocusNodeId), true);
}


const manuallyRemovedEdgeIds = new Set();
const manuallyRemovedNodeIds = new Set();
const nodeHiddenEdgeIds = new Set();

function removeSelectedRelations(){
  const edges = cy.edges(":selected");
  if(!edges.length){toast("削除対象の関連線を選択してください");return;}
  edges.forEach((e)=>{ manuallyRemovedEdgeIds.add(e.id()); e.addClass("rel-manual-hidden"); });
  if(focusMode && currentFocusNodeId) applyFocusToNode(cy.getElementById(currentFocusNodeId), true);
  applyRelationFilter();
  toast("関連線を手動削除: "+edges.length+"件");
}

function restoreRemovedRelations(){
  let restored = 0;
  manuallyRemovedEdgeIds.forEach((id)=>{
    const edge = cy.getElementById(id);
    if(edge.length){ edge.removeClass("rel-manual-hidden"); restored += 1; }
  });
  manuallyRemovedEdgeIds.clear();
  if(focusMode && currentFocusNodeId) applyFocusToNode(cy.getElementById(currentFocusNodeId), true);
  applyRelationFilter();
  toast(restored ? ("手動削除した関連線を復元: "+restored+"件") : "復元対象がありません");
}

function removeSelectedApps(){
  let nodes = cy.nodes(":selected").not(".app-manual-hidden");
  if(!nodes.length && lastTappedNodeId){
    const n = cy.getElementById(lastTappedNodeId);
    if(n.length && !n.hasClass("app-manual-hidden")) nodes = nodes.union(n);
  }
  if(!nodes.length){toast("削除対象のアプリを選択してください");return;}
  let edgeCount = 0;
  nodes.forEach((node)=>{
    manuallyRemovedNodeIds.add(node.id());
    node.addClass("app-manual-hidden");
    node.connectedEdges().forEach((edge)=>{
      nodeHiddenEdgeIds.add(edge.id());
      if(!edge.hasClass("rel-manual-hidden")) edgeCount += 1;
      edge.addClass("rel-manual-hidden");
    });
  });
  applyRelationFilter();
  refreshAppList();
  if(focusMode && currentFocusNodeId) applyFocusToNode(cy.getElementById(currentFocusNodeId), true);
  toast("アプリを手動削除: "+nodes.length+"件 / 関連線 "+edgeCount+"件");
}

function restoreRemovedApps(){
  let restoredNodes = 0;
  manuallyRemovedNodeIds.forEach((id)=>{
    const node = cy.getElementById(id);
    if(node.length){
      node.removeClass("app-manual-hidden");
      restoredNodes += 1;
    }
  });
  let restoredEdges = 0;
  nodeHiddenEdgeIds.forEach((id)=>{
    const edge = cy.getElementById(id);
    if(!edge.length) return;
    if(manuallyRemovedEdgeIds.has(id)) return;
    edge.removeClass("rel-manual-hidden");
    restoredEdges += 1;
  });
  manuallyRemovedNodeIds.clear();
  nodeHiddenEdgeIds.clear();
  applyRelationFilter();
  refreshAppList();
  if(focusMode && currentFocusNodeId) applyFocusToNode(cy.getElementById(currentFocusNodeId), true);
  toast(restoredNodes ? ("手動削除したアプリを復元: "+restoredNodes+"件 / 関連線 "+restoredEdges+"件") : "復元対象のアプリがありません");
}
function toggleRelationKind(kind){
  relationKindState[kind] = !relationKindState[kind];
  const btn = document.getElementById(kind==="LOOKUP" ? "rel-lookup-btn" : (kind==="REF" ? "rel-ref-btn" : "rel-action-btn"));
  if(btn) btn.classList.toggle("active", !!relationKindState[kind]);
  applyRelationFilter();
  if(focusMode && currentFocusNodeId) applyFocusToNode(cy.getElementById(currentFocusNodeId), true);
  const label = kind === "LOOKUP" ? "ルックアップ" : (kind === "REF" ? "関連" : "アクション");
  toast(label + "線: " + (relationKindState[kind] ? "表示" : "非表示"));
}

function pinNode(node,silent){
  if(!node || !node.length) return;
  node.lock();
  node.addClass("pinned-node");
  pinnedNodeIds.add(node.id());
  if(!silent) toast("固定: "+(appMap.get(node.data("appId"))?.name || node.id()));
}

function unpinNode(node,silent){
  if(!node || !node.length) return;
  node.unlock();
  node.removeClass("pinned-node");
  pinnedNodeIds.delete(node.id());
  if(!silent) toast("固定解除: "+(appMap.get(node.data("appId"))?.name || node.id()));
}

function togglePinFromSelection(){
  let nodes = cy.nodes(":selected");
  if(!nodes.length && lastTappedNodeId){
    const n = cy.getElementById(lastTappedNodeId);
    if(n.length) nodes = nodes.union(n);
  }
  if(!nodes.length){toast("固定対象ノードを選択してください");return;}
  const allPinned = nodes.every(n=>pinnedNodeIds.has(n.id()));
  nodes.forEach(n=>{if(allPinned) unpinNode(n,true); else pinNode(n,true);});
  toast(allPinned ? "選択ノードの固定を解除" : "選択ノードを固定");
}

function clearPins(){
  [...pinnedNodeIds].forEach(id=>{
    const n = cy.getElementById(id);
    if(n.length) n.unlock().removeClass("pinned-node");
  });
  pinnedNodeIds.clear();
  toast("固定を全解除");
}

applyRelationFilter();
applyRelationLabelVisibility();
updateFocusOptions();

// ─── Search & Highlight ───
function searchGraph(q){
  cy.elements().removeClass("highlighted dimmed");
  if(!q.trim()){
    updateSearchMeta("", 0);
    return;
  }
  const low=q.toLowerCase();
  const matched=cy.nodes().not(".app-manual-hidden").filter(n=>{
    const app=appMap.get(n.data("appId"));
    if(!app) return false;
    if(app.name.toLowerCase().includes(low) || String(app.id).includes(low)) return true;
    return visibleFieldsForNode(app).some(f=>buildFieldDisplayName(f).toLowerCase().includes(low)||(f.code||"").toLowerCase().includes(low)||String(f.path||"").toLowerCase().includes(low));
  });
  updateSearchMeta(q, matched.length);
  if(matched.length){
    matched.addClass("highlighted");
    const visibleEdges = matched.connectedEdges().filter(e=>!e.hasClass("rel-hidden") && !e.hasClass("rel-manual-hidden"));
    cy.elements().not(matched).not(visibleEdges).addClass("dimmed");
  }
}

// ─── Click Detail ───
function renderAppDetail(app){
  const visibleFields = visibleFieldsForNode(app);
  const fieldGroups = detailFieldGroups(app);
  const panel = document.getElementById("detail");
  document.getElementById("detail-title").textContent = app.name;
  const realFieldTotal = typeof app.totalFieldCount === "number" ? app.totalFieldCount : visibleFields.length;
  const fieldPillText = realFieldTotal > visibleFields.length
    ? '項目 ' + visibleFields.length + '/<small>' + realFieldTotal + '</small>'
    : '<b>項目</b> ' + visibleFields.length;
  document.getElementById("detail-meta").innerHTML = "ID: " + escapeHtml(app.id)
    + (app.createdAt ? " | 作成: " + escapeHtml(new Date(app.createdAt).toLocaleDateString()) : "")
    + (app.modifiedAt ? " | 更新: " + escapeHtml(new Date(app.modifiedAt).toLocaleDateString()) : "")
    + '<div class="detail-chip-row">'
    + '<span class="meta-pill" title="表示中 / 総数（表示数は密度設定に依存）">' + fieldPillText + '</span>'
    + '<span class="meta-pill"><b>ルックアップ</b> ' + fieldGroups.lookup.length + '</span>'
    + '<span class="meta-pill"><b>関連</b> ' + fieldGroups.ref.length + '</span>'
    + '<span class="meta-pill"><b>必須</b> ' + fieldGroups.required.length + '</span>'
    + '<span class="meta-pill"><b>深さ</b> ' + (app.depth || 0) + '</span>'
    + '</div>';

  const relationGroups = [
    { key:"LOOKUP", label:"ルックアップ", icon:"🔗" },
    { key:"REF", label:"関連レコード", icon:"📋" },
    { key:"ACTION", label:"アクション", icon:"⚡" }
  ];
  let relHtml = "";
  relationGroups.forEach((group)=>{
    const items = (app.relations || []).filter((rel)=>rel.kind === group.key);
    if(!items.length) return;
    relHtml += '<div class="field-group-title">' + group.label + ' (' + items.length + ')</div>';
    items
      .slice()
      .sort((a,b)=>String(a.fromDisplay || a.fromLabel || a.from || '').localeCompare(String(b.fromDisplay || b.fromLabel || b.from || '')))
      .forEach((rel)=>{
        const targetApp = appMap.get(rel.toApp);
        const targetName = targetApp ? targetApp.name : "アプリ " + rel.toApp;
        const relationLabel = rel.fromDisplay || rel.fromLabel || rel.from || group.label;
        const relationMeta = [];
        if(rel.fromPath && rel.fromPath !== rel.from) relationMeta.push("path: " + rel.fromPath);
        if(rel.toField) relationMeta.push("to: " + rel.toField);
        relHtml += '<div class="field-row" style="cursor:pointer" onclick="focusApp(' + rel.toApp + ')">'
          + '<span class="field-icon">' + group.icon + '</span>'
          + '<div class="field-main">'
          + '<div class="field-name" title="' + escapeHtml(relationLabel + ' → ' + targetName) + '">' + escapeHtml(relationLabel) + ' → ' + escapeHtml(targetName) + '</div>'
          + '<div class="field-sub">' + escapeHtml(relationMeta.join(' / ') || '接続先をクリックで移動') + '</div>'
          + '</div>'
          + '<span class="field-type">' + escapeHtml(group.key === "ACTION" ? "ACTION" : group.key) + '</span>'
          + '</div>';
      });
  });
  document.getElementById("detail-relations").innerHTML = relHtml || '<div class="field-group-title">リレーション</div><div class="field-sub">関連はありません。</div>';

  let fieldHtml = "";
  const renderGroup = (title, fields, tagClass, tagLabel) => {
    if(!fields.length) return;
    fieldHtml += '<div class="field-group-title">' + title + ' (' + fields.length + ')</div>';
    fields.forEach((field)=>{
      let tags = "";
      if(tagLabel) tags += '<span class="tag ' + tagClass + '">' + tagLabel + '</span>';
      if(field.required && tagLabel !== "必須") tags += '<span class="tag tag-req">必須</span>';
      if(field.inSubtable) tags += '<span class="tag tag-sub">表</span>';
      if(field.unique) tags += '<span class="tag tag-pk">重複不可</span>';
      const fieldName = buildFieldDisplayName(field);
      const meta = ["code: " + (field.code || "-")];
      if(field.path && field.path !== field.code) meta.push("path: " + field.path);
      if(field.tableLabel) meta.push("table: " + field.tableLabel);
      fieldHtml += '<div class="field-row" title="' + escapeHtml(fieldName) + '">'
        + '<span class="field-icon">' + fieldIconForLabel(field) + '</span>'
        + '<div class="field-main">'
        + '<div class="field-name">' + escapeHtml(fieldName) + tags + '</div>'
        + '<div class="field-sub">' + escapeHtml(meta.join(' / ')) + '</div>'
        + '</div>'
        + '<span class="field-type">' + escapeHtml(fieldTypeJpLabel(field.type)) + '</span>'
        + '</div>';
    });
  };
  renderGroup("主キー", fieldGroups.pk, "tag-pk", "PK");
  renderGroup("ルックアップ (FK)", fieldGroups.lookup, "tag-fk", "FK");
  renderGroup("関連レコード", fieldGroups.ref, "tag-ref", "REF");
  renderGroup("必須フィールド", fieldGroups.required, "tag-req", "必須");
  renderGroup("サブテーブル", fieldGroups.subtable, "tag-sub", "Table");
  renderGroup("その他フィールド", fieldGroups.normal, "", "");
  document.getElementById("detail-fields").innerHTML = fieldHtml || '<div class="field-group-title">フィールド</div><div class="field-sub">表示できるフィールドはありません。</div>';

  panel.classList.add("open");
  setActiveApp(app.id);
}
cy.on("tap","node",e=>{
  lastTappedNodeId = e.target.id();
  const app=appMap.get(e.target.data("appId"));
  if(!app) return;
  renderAppDetail(app);
  if(focusMode) applyFocusToNode(e.target);
});
cy.on("cxttap","node",e=>{
  const n = e.target;
  const oe = e.originalEvent || ({});
  if(oe.altKey || oe.metaKey){
    manuallyRemovedNodeIds.add(n.id());
    n.addClass("app-manual-hidden");
    n.connectedEdges().forEach((edge)=>{ nodeHiddenEdgeIds.add(edge.id()); edge.addClass("rel-manual-hidden"); });
    applyRelationFilter();
    refreshAppList();
    if(focusMode && currentFocusNodeId) applyFocusToNode(cy.getElementById(currentFocusNodeId), true);
    toast("アプリを手動削除");
    return;
  }
  if(pinnedNodeIds.has(n.id())) unpinNode(n);
  else pinNode(n);
});
cy.on("cxttap","edge",e=>{
  const edge = e.target;
  manuallyRemovedEdgeIds.add(edge.id());
  edge.addClass("rel-manual-hidden");
  applyRelationFilter();
  if(focusMode && currentFocusNodeId) applyFocusToNode(cy.getElementById(currentFocusNodeId), true);
  toast("関連線を手動削除");
});
cy.on("tap",e=>{if(e.target===cy){closeDetail();cy.elements().removeClass("highlighted dimmed path-node path-edge");clearFocus(true);}});

function closeDetail(){
  document.getElementById("detail").classList.remove("open");
  setActiveApp(0);
}

function focusApp(id){
  const n=cy.getElementById("a"+id);
  if(n.length && !n.hasClass("app-manual-hidden")){
    cy.animate({center:{eles:n},zoom:1.5},{ duration:400 });
    n.select();
    const app = appMap.get(id);
    if(app) renderAppDetail(app);
    if(focusMode) applyFocusToNode(n, true);
  }
}

// ─── Sidebar ───
function toggleSidebar(){document.getElementById("sidebar").classList.toggle("open");}

// Build stats
(function buildSidebar(){
  const visibleFieldsTotal=APPS.reduce((s,a)=>s+visibleFieldsForNode(a).length,0);
  const totalFieldsAcrossApps=APPS.reduce((s,a)=>s+(typeof a.totalFieldCount==="number"?a.totalFieldCount:visibleFieldsForNode(a).length),0);
  const totalRels=APPS.reduce((s,a)=>s+a.relations.length,0);
  const lookups=APPS.reduce((s,a)=>s+a.relations.filter(r=>r.kind==="LOOKUP").length,0);
  const actions=APPS.reduce((s,a)=>s+a.relations.filter(r=>r.kind==="ACTION").length,0);
  const refs=totalRels-lookups-actions;
  const typeCount={};
  APPS.forEach(a=>visibleFieldsForNode(a).forEach(f=>{typeCount[f.type]=(typeCount[f.type]||0)+1;}));

  let html='<div class="stat-row"><span>アプリ数</span><span class="stat-val">'+APPS.length+'</span></div>';
  html+='<div class="stat-row"><span>総フィールド数</span><span class="stat-val">'+totalFieldsAcrossApps+'</span></div>';
  if(visibleFieldsTotal!==totalFieldsAcrossApps){
    html+='<div class="stat-row"><span>表示中フィールド</span><span class="stat-val">'+visibleFieldsTotal+'</span></div>';
  }
  html+='<div class="stat-row"><span>ルックアップ数</span><span class="stat-val">'+lookups+'</span></div>';
  html+='<div class="stat-row"><span>関連レコード数</span><span class="stat-val">'+refs+'</span></div>';
  html+='<div class="stat-row"><span>アクション線数</span><span class="stat-val">'+actions+'</span></div>';
  html+='<div class="stat-row"><span>総リレーション</span><span class="stat-val">'+totalRels+'</span></div>';
  html+='<div class="stat-row"><span>エラーアプリ</span><span class="stat-val">'+APPS.filter(a=>!a.ok).length+'</span></div>';
  document.getElementById("stats-summary").innerHTML=html;

  // type filters
  let fHtml="";
  Object.entries(typeCount).sort((a,b)=>b[1]-a[1]).forEach(([t,c])=>{
    fHtml+='<span class="filter-chip" onclick="filterByType(this,\\''+t+'\\')" data-type="'+t+'">'+t+' ('+c+')</span>';
  });
  document.getElementById("type-filters").innerHTML=fHtml;

  refreshAppList();
})();

function refreshAppList(){
  let aHtml="";
  APPS
    .slice()
    .sort((a,b)=>{
      const aStart = startAppIdSet.has(String(a.id)) ? 0 : 1;
      const bStart = startAppIdSet.has(String(b.id)) ? 0 : 1;
      if(aStart !== bStart) return aStart - bStart;
      if((a.depth || 0) !== (b.depth || 0)) return (a.depth || 0) - (b.depth || 0);
      return String(a.name || "").localeCompare(String(b.name || ""));
    })
    .forEach(a=>{
    const visibleCount = visibleFieldsForNode(a).length;
    const node = cy.getElementById('a'+a.id);
    const hidden = node.length && node.hasClass('app-manual-hidden');
    const activeCls = Number(activeAppId) === Number(a.id) ? ' active-app' : '';
    const hiddenCls = hidden ? ' highlighted' : '';
    const startMeta = startAppIdSet.has(String(a.id)) ? ' / 開始' : '';
    const hiddenMeta = hidden ? ' / 非表示' : '';
    aHtml+='<div class="app-list-item'+activeCls+hiddenCls+'" onclick="focusApp('+a.id+')">'+escapeHtml(a.name)+' <span style="color:var(--dim);font-size:10px">('+visibleCount+' 項目 / '+a.relations.length+' 関連 / 深さ '+(a.depth || 0)+startMeta+hiddenMeta+')</span></div>';
  });
  document.getElementById("app-list").innerHTML=aHtml;
}

function filterByType(el,type){
  el.classList.toggle("active");
  const active=[...document.querySelectorAll(".filter-chip.active")].map(e=>e.dataset.type);
  cy.elements().removeClass("highlighted dimmed");
  if(!active.length) return;
  const matched=cy.nodes().not(".app-manual-hidden").filter(n=>{
    const app=appMap.get(n.data("appId"));
    return app&&visibleFieldsForNode(app).some(f=>active.includes(f.type));
  });
  matched.addClass("highlighted");
  const visibleEdges = matched.connectedEdges().filter(e=>!e.hasClass("rel-hidden") && !e.hasClass("rel-manual-hidden"));
  cy.elements().not(matched).not(visibleEdges).addClass("dimmed");
}

// ─── Path Finder ───
function togglePathFinder(){
  const pf=document.getElementById("pathfinder");
  pf.classList.toggle("open");
  if(pf.classList.contains("open")){
    const opts=APPS.filter(a=>{ const n = cy.getElementById("a"+a.id); return n.length && !n.hasClass("app-manual-hidden"); }).map(a=>'<option value="a'+a.id+'">'+a.name+"</option>").join("");
    document.getElementById("pf-from").innerHTML=opts;
    document.getElementById("pf-to").innerHTML=opts;
  }
}

function findPath(){
  clearPath();
  const from=document.getElementById("pf-from").value;
  const to=document.getElementById("pf-to").value;
  if(from===to){toast("同じアプリです");return;}
  const dijkstra=cy.elements().not(".rel-hidden").not(".rel-manual-hidden").not(".app-manual-hidden").dijkstra({root:"#"+from,directed:false});
  const path=dijkstra.pathTo(cy.getElementById(to));
  if(!path||path.length===0){document.getElementById("path-result").textContent="経路なし";return;}
  path.addClass("path-node path-edge");
  cy.elements().not(path).addClass("dimmed");
  const names=path.nodes().map(n=>appMap.get(n.data("appId"))?.name||"?").join(" → ");
  document.getElementById("path-result").textContent=names;
  toast("経路: "+path.nodes().length+"アプリ");
}

function clearPath(){
  cy.elements().removeClass("path-node path-edge dimmed highlighted");
  document.getElementById("path-result").textContent="";
}

// ─── Minimap ───
let minimapOpen=false,minimapTimer;
function toggleMinimap(){
  minimapOpen=!minimapOpen;
  document.getElementById("minimap").classList.toggle("open",minimapOpen);
  if(minimapOpen) startMinimap(); else clearInterval(minimapTimer);
}
function startMinimap(){
  const canvas=document.getElementById("minimap-canvas");
  const ctx=canvas.getContext("2d");
  const render=()=>{
    canvas.width=180;canvas.height=130;
    ctx.fillStyle=getComputedStyle(document.documentElement).getPropertyValue("--surface").trim()||"#11131a";
    ctx.fillRect(0,0,180,130);
    const bb=cy.elements().boundingBox();
    if(bb.w===0) return;
    const sx=170/bb.w,sy=120/bb.h,s=Math.min(sx,sy);
    const ox=(180-bb.w*s)/2,oy=(130-bb.h*s)/2;
    cy.edges().filter(e=>!e.hasClass("rel-hidden") && !e.hasClass("rel-manual-hidden")).forEach(e=>{
      const sp=e.sourceEndpoint(),tp=e.targetEndpoint();
      ctx.strokeStyle=e.data("kind")==="LOOKUP"?"#60a5fa":(e.data("kind")==="REF"?"#34d399":"#f59e0b");
      ctx.lineWidth=0.5;ctx.beginPath();
      ctx.moveTo((sp.x-bb.x1)*s+ox,(sp.y-bb.y1)*s+oy);
      ctx.lineTo((tp.x-bb.x1)*s+ox,(tp.y-bb.y1)*s+oy);
      ctx.stroke();
    });
    cy.nodes().forEach(n=>{
      const p=n.position();
      if(n.hasClass("pinned-node")) ctx.fillStyle="#fbbf24";
      else if(n.hasClass("focus-root")) ctx.fillStyle="#5eead4";
      else if(n.hasClass("focus-neighbor")) ctx.fillStyle="#67e8f9";
      else if(n.hasClass("path-node")) ctx.fillStyle="#f472b6";
      else if(n.hasClass("highlighted")) ctx.fillStyle="#fbbf24";
      else ctx.fillStyle="#5eead4";
      ctx.globalAlpha=(n.hasClass("dimmed")||n.hasClass("focus-dim"))?0.12:0.8;
      ctx.fillRect((p.x-bb.x1)*s+ox-2,(p.y-bb.y1)*s+oy-2,4,4);
      ctx.globalAlpha=1;
    });
    // viewport rect
    const ext=cy.extent();
    ctx.strokeStyle="#fff";ctx.lineWidth=1;ctx.globalAlpha=0.5;
    ctx.strokeRect((ext.x1-bb.x1)*s+ox,(ext.y1-bb.y1)*s+oy,(ext.x2-ext.x1)*s,(ext.y2-ext.y1)*s);
    ctx.globalAlpha=1;
  };
  minimapTimer=setInterval(render,500);
  render();
}

// ─── Command Palette ───
const commands=[
  {label:"全体表示",icon:"📐",action:fit,keys:"Ctrl+0"},
  {label:"Dagre レイアウト",icon:"⬡",action:()=>setLayout("dagre")},
  {label:"自動配置 (Cose)",icon:"🔄",action:()=>setLayout("cose")},
  {label:"グリッド レイアウト",icon:"⊞",action:()=>setLayout("grid")},
  {label:"円形 レイアウト",icon:"◯",action:()=>setLayout("circle")},
  {label:"ツリー レイアウト",icon:"🌳",action:()=>setLayout("breadthfirst")},
  {label:"同心円 レイアウト",icon:"◎",action:()=>setLayout("concentric")},
  {label:"表示密度: コンパクト",icon:"🪶",action:()=>setDensity("compact")},
  {label:"表示密度: 標準",icon:"📄",action:()=>setDensity("standard")},
  {label:"表示密度: 詳細",icon:"🧾",action:()=>setDensity("full")},
  {label:"統計パネル",icon:"📊",action:toggleSidebar,keys:"Ctrl+B"},
  {label:"ガイドパネル 表示/非表示",icon:"🧭",action:toggleOverview},
  {label:"経路探索",icon:"🔍",action:togglePathFinder},
  {label:"関連強調 ON/OFF",icon:"🎯",action:toggleFocusMode,keys:"Shift+F"},
  {label:"関連強調解除",icon:"🧹",action:()=>clearFocus()},
  {label:"ルックアップ線 ON/OFF",icon:"🔗",action:()=>toggleRelationKind("LOOKUP")},
  {label:"関連線 ON/OFF",icon:"📋",action:()=>toggleRelationKind("REF")},
  {label:"アクション線 ON/OFF",icon:"⚡",action:()=>toggleRelationKind("ACTION")},
  {label:"線ラベル ON/OFF",icon:"🏷",action:toggleRelationLabels},
  {label:"選択関連を削除",icon:"🗑",action:removeSelectedRelations},
  {label:"削除関連を復元",icon:"↺",action:restoreRemovedRelations},
  {label:"選択アプリを削除",icon:"🗑📱",action:removeSelectedApps},
  {label:"削除アプリを復元",icon:"↺📱",action:restoreRemovedApps},
  {label:"選択ノード 固定/解除",icon:"📌",action:togglePinFromSelection,keys:"Shift+P"},
  {label:"固定を全解除",icon:"📍",action:clearPins},
  {label:"ミニマップ",icon:"🗺",action:toggleMinimap},
  {label:"テーマ切替",icon:"🌓",action:toggleTheme},
  {label:"PNG エクスポート",icon:"🖼",action:exportPNG},
  {label:"SVG エクスポート",icon:"📄",action:exportSVG},
  {label:"Mermaid エクスポート",icon:"🧜",action:showMermaid},
  {label:"draw.io エクスポート",icon:"📊",action:showDrawio},
  {label:"SQL DDL エクスポート",icon:"🗄",action:showSQL},
  {label:"PlantUML エクスポート",icon:"🌱",action:showPlantUML},
  {label:"JSON スキーマ エクスポート",icon:"{}",action:showJSON},
  {label:"Markdown 仕様書エクスポート",icon:"📝",action:showMarkdown},
  {label:"CSV (アプリ一覧) エクスポート",icon:"📑",action:showCSVApps},
  {label:"CSV (フィールド) エクスポート",icon:"📑",action:showCSVFields},
  {label:"CSV (リレーション) エクスポート",icon:"📑",action:showCSVRelations},
  {label:"印刷プレビュー",icon:"🖨",action:printDiagram},
  {label:"表示状態のURLをコピー",icon:"🔗",action:copyShareUrl},
  {label:"フルスクリーン",icon:"⛶",action:toggleFullscreen,keys:"F11"},
  {label:"ズームイン",icon:"➕",action:zoomIn,keys:"+"},
  {label:"ズームアウト",icon:"➖",action:zoomOut,keys:"-"},
  {label:"ズームリセット",icon:"◎",action:zoomReset,keys:"0"},
  {label:"ヘルプ",icon:"❓",action:openHelp,keys:"?"},
  {label:"ハイライト解除",icon:"✨",action:()=>{cy.elements().removeClass("highlighted dimmed path-node path-edge");document.getElementById("search-box").value="";clearFocus(true);}},
];

// Add app-focus commands
APPS.forEach(a=>{
  commands.push({label:"アプリ: "+a.name+" (ID:"+a.id+")",icon:"📱",action:()=>focusApp(a.id)});
});

function openCmd(){
  document.getElementById("cmd-overlay").classList.add("open");
  const inp=document.getElementById("cmd-input");inp.value="";inp.focus();
  filterCmd("");
}
function closeCmd(){document.getElementById("cmd-overlay").classList.remove("open");}

function filterCmd(q){
  const low=q.toLowerCase();
  const filtered=q?commands.filter(c=>c.label.toLowerCase().includes(low)):commands.slice(0,12);
  const box=document.getElementById("cmd-results");
  box.innerHTML=filtered.map((c,i)=>
    '<div class="cmd-item'+(i===0?" active":"")+'" onclick="runCmd('+commands.indexOf(c)+')"><span>'+c.icon+'</span><span>'+c.label+'</span>'+(c.keys?'<span class="kbd">'+c.keys+'</span>':'')+'</div>'
  ).join("");
}

function runCmd(idx){commands[idx].action();closeCmd();}

// ─── Keyboard Shortcuts ───
function isTypingTarget(el){
  if(!el) return false;
  const tag=(el.tagName||"").toUpperCase();
  return tag==="INPUT"||tag==="TEXTAREA"||tag==="SELECT"||el.isContentEditable;
}
document.addEventListener("keydown",e=>{
  if(e.key==="k"&&(e.ctrlKey||e.metaKey)){e.preventDefault();openCmd();}
  if(e.key==="b"&&(e.ctrlKey||e.metaKey)){e.preventDefault();toggleSidebar();}
  if(e.key==="f"&&(e.ctrlKey||e.metaKey)){e.preventDefault();document.getElementById("search-box").focus();}
  if(e.key==="F"&&e.shiftKey){e.preventDefault();toggleFocusMode();}
  if(e.key==="P"&&e.shiftKey){e.preventDefault();togglePinFromSelection();}
  if(e.key==="0"&&(e.ctrlKey||e.metaKey)){e.preventDefault();fit();}
  if(e.key==="Escape"){closeCmd();closeDetail();closeModal();closeHelp();closeAllMenus();clearFocus(true);document.getElementById("topbar").classList.remove("mobile-open");}
  if(!isTypingTarget(e.target)){
    if(e.key==="?"||(e.key==="/"&&e.shiftKey)){e.preventDefault();openHelp();}
    if(e.key==="+"||e.key==="="){e.preventDefault();zoomIn();}
    if(e.key==="-"||e.key==="_"){e.preventDefault();zoomOut();}
    if(e.key==="0"&&!e.ctrlKey&&!e.metaKey){e.preventDefault();zoomReset();}
    if(e.key==="F11"){e.preventDefault();toggleFullscreen();}
  }
  // cmd palette navigation
  if(document.getElementById("cmd-overlay").classList.contains("open")){
    const items=[...document.querySelectorAll(".cmd-item")];
    const ai=items.findIndex(i=>i.classList.contains("active"));
    if(e.key==="ArrowDown"){e.preventDefault();items[ai]?.classList.remove("active");items[Math.min(ai+1,items.length-1)]?.classList.add("active");}
    if(e.key==="ArrowUp"){e.preventDefault();items[ai]?.classList.remove("active");items[Math.max(ai-1,0)]?.classList.add("active");}
    if(e.key==="Enter"){e.preventDefault();items[ai]?.click();}
  }
});

// ─── Exports ───
function exportPNG(){
  try{
    const a=document.createElement("a");
    a.href=cy.png({bg:isDark?"#08090d":"#f0f2f5",full:true,scale:2});
    a.download="kintone_erd.png";a.click();toast("PNG ダウンロード");
  }catch(err){
    console.error("[ER] exportPNG failed", err);
    toast("PNG出力に失敗: "+((err&&err.message)||err));
  }
}
function exportSVG(){
  try{
    if(typeof cy.svg !== "function"){
      toast("SVGエクスポートは未対応のためPNGを出力します");
      exportPNG();
      return;
    }
    const blob=new Blob([cy.svg({full:true,bg:isDark?"#08090d":"#f0f2f5"})],{type:"image/svg+xml"});
    const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="kintone_erd.svg";a.click();toast("SVG ダウンロード");
  }catch(err){
    console.error("[ER] exportSVG failed", err);
    toast("SVG出力に失敗: "+((err&&err.message)||err));
  }
}

let _md={text:"",filename:""};
function openModal(t,text,fn){_md={text,filename:fn};document.getElementById("modal-title").textContent=t;document.getElementById("modal-content").textContent=text;document.getElementById("modal-overlay").classList.add("open");}
function closeModal(){document.getElementById("modal-overlay").classList.remove("open");}
function copyModal(){navigator.clipboard.writeText(_md.text).then(()=>toast("コピーしました！"));}
function downloadModal(){const b=new Blob([_md.text],{type:"text/plain"});const a=document.createElement("a");a.href=URL.createObjectURL(b);a.download=_md.filename;a.click();toast("ダウンロード: "+_md.filename);}

// safe name helper
const sn=s=>s.replace(/[^a-zA-Z0-9_\\u3000-\\u9FFF\\uF900-\\uFAFF]/g,"_").replace(/^_+|_+$/g,"")||"unnamed";

function showMermaid(){
  let m="erDiagram\\n";
  APPS.forEach(a=>{
    const n=sn(a.name);
    m+="  "+n+" {\\n";
    a.fields.forEach(f=>{
      if(f.type==="SUBTABLE") return;
      let com=""; if(f.isPK) com=" PK"; else if(f.isLookup) com=" FK";
      m+="    "+f.type.replace(/[^a-zA-Z0-9_]/g,"")+" "+sn(f.code)+com+"\\n";
    });
    m+="  }\\n";
  });
  APPS.forEach(a=>{
    a.relations.forEach(r=>{
      const t=appMap.get(r.toApp); if(!t) return;
      m+="  "+sn(a.name)+(r.kind==="LOOKUP"?" }o--|| ":" ||--o{ ")+sn(t.name)+' : "'+r.fromLabel+'"\\n';
    });
  });
  openModal("Mermaid ER図",m,"ER図.mmd");
}

function showDrawio(){
  const esc=s=>s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
  let x='<mxfile host="app.diagrams.net"><diagram name="ER"><mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/>';
  APPS.forEach((a,i)=>{
    const nid="A"+a.id,col=4,px=i%col*600,py=Math.floor(i/col)*400,h=30+a.fields.length*26;
    x+='<mxCell id="'+nid+'" value="'+esc(a.name)+'" style="shape=table;startSize=30;container=1;childLayout=tableLayout;fillColor=#DDA0DD;rounded=1;" vertex="1" parent="1"><mxGeometry x="'+px+'" y="'+py+'" width="280" height="'+h+'" as="geometry"/></mxCell>';
    a.fields.forEach((f,fi)=>{
      let c="#FFF";if(f.isPK)c="#FFD700";else if(f.isLookup)c="#87CEFA";else if(f.isRef)c="#98FB98";else if(f.inSubtable)c="#F5F5F5";else if(f.required)c="#FFF0F5";
      let l=(f.isPK?"🔑 ":f.isLookup?"🔗 ":f.isRef?"📋 ":"")+(f.label||f.code)+" ["+f.code+"]";
      x+='<mxCell id="'+nid+"_F"+fi+'" value="'+esc(l)+'" style="shape=partialRectangle;fillColor='+c+';align=left;spacingLeft=6;strokeColor=#d0d0d0;" vertex="1" parent="'+nid+'"><mxGeometry width="280" height="26" as="geometry"/></mxCell>';
    });
  });
  let ec=0;
  APPS.forEach(a=>a.relations.forEach(r=>{
    if(!appMap.has(r.toApp)) return;
    const st=r.kind==="LOOKUP"?"edgeStyle=orthogonalEdgeStyle;rounded=1;endArrow=classic;startArrow=oval;strokeColor=#0066CC;strokeWidth=2;":"edgeStyle=orthogonalEdgeStyle;rounded=1;endArrow=classic;startArrow=diamond;dashed=1;strokeColor=#2E8B57;strokeWidth=2;";
    x+='<mxCell id="E'+(ec++)+'" value="'+(r.kind==="LOOKUP"?"ルックアップ":"関連")+'" style="'+st+'" edge="1" parent="1" source="A'+a.id+'" target="A'+r.toApp+'"><mxGeometry relative="1" as="geometry"/></mxCell>';
  }));
  x+="</root></mxGraphModel></diagram></mxfile>";
  openModal("draw.io 用XML",x,"ER図.drawio");
}

function showSQL(){
  let sql="-- kintone ER図 → SQL DDL\\n-- 生成日時: "+new Date().toISOString()+"\\n\\n";
  const typeMap={SINGLE_LINE_TEXT:"VARCHAR(256)",MULTI_LINE_TEXT:"TEXT",NUMBER:"DECIMAL(18,4)",CALC:"DECIMAL(18,4)",
    RICH_TEXT:"TEXT",CHECK_BOX:"TEXT",RADIO_BUTTON:"VARCHAR(128)",DROP_DOWN:"VARCHAR(128)",MULTI_SELECT:"TEXT",
    DATE:"DATE",TIME:"TIME",DATETIME:"DATETIME",LINK:"VARCHAR(512)",FILE:"TEXT",
    USER_SELECT:"TEXT",ORGANIZATION_SELECT:"TEXT",GROUP_SELECT:"TEXT",
    RECORD_NUMBER:"INT AUTO_INCREMENT",CREATOR:"VARCHAR(128)",MODIFIER:"VARCHAR(128)",
    CREATED_TIME:"DATETIME",UPDATED_TIME:"DATETIME",STATUS:"VARCHAR(64)",
    STATUS_ASSIGNEE:"TEXT",CATEGORY:"TEXT",LOOKUP:"VARCHAR(256)",REFERENCE_TABLE:"-- ref"};

  APPS.forEach(a=>{
    const tbl=sn(a.name);
    sql+="CREATE TABLE "+tbl+" (\\n";
    const cols=[];
    a.fields.forEach(f=>{
      if(f.type==="SUBTABLE"||f.type==="REFERENCE_TABLE") return;
      const col=sn(f.code);
      const dt=typeMap[f.type]||"TEXT";
      if(dt.startsWith("--")) return;
      let line="  "+col+" "+dt;
      if(f.isPK) line+=" PRIMARY KEY";
      else if(f.required) line+=" NOT NULL";
      cols.push(line);
    });
    sql+=cols.join(",\\n")+"\\n);\\n\\n";
  });

  // Foreign keys
  APPS.forEach(a=>{
    a.relations.filter(r=>r.kind==="LOOKUP"&&appMap.has(r.toApp)).forEach(r=>{
      const t=appMap.get(r.toApp);
      sql+="ALTER TABLE "+sn(a.name)+" ADD CONSTRAINT fk_"+sn(a.name)+"_"+sn(r.from)+" FOREIGN KEY ("+sn(r.from)+") REFERENCES "+sn(t.name)+"("+sn(r.toField)+");\\n";
    });
  });
  openModal("SQL DDL",sql,"ER図.sql");
}

function showPlantUML(){
  let p="@startuml\\n!theme cerulean\\nskinparam linetype ortho\\n\\n";
  APPS.forEach(a=>{
    const n=sn(a.name);
    p+="entity "+n+" {\\n";
    a.fields.forEach(f=>{
      if(f.type==="SUBTABLE"||f.type==="REFERENCE_TABLE") return;
      let prefix="  ";
      if(f.isPK) prefix="  * ";
      else if(f.isLookup) prefix="  # ";
      p+=prefix+sn(f.code)+" : "+f.type+(f.required?" <<required>>":"")+"\\n";
      if(f.isPK) p+="  --\\n";
    });
    p+="}\\n\\n";
  });
  APPS.forEach(a=>{
    a.relations.forEach(r=>{
      const t=appMap.get(r.toApp); if(!t) return;
      if(r.kind==="LOOKUP") p+=sn(a.name)+' }o--|| '+sn(t.name)+' : "'+r.fromLabel+'"\\n';
      else p+=sn(a.name)+' ||--o{ '+sn(t.name)+' : "'+r.fromLabel+'"\\n';
    });
  });
  p+="@enduml";
  openModal("PlantUML",p,"ER図.puml");
}

function showJSON(){
  const schema={
    $schema:"https://json-schema.org/draft/2020-12/schema",
    title:"kintone ERスキーマ",
    generated:new Date().toISOString(),
    apps:APPS.map(a=>({
      id:a.id,name:a.name,
      fields:a.fields.map(f=>({code:f.code,label:f.label,type:f.type,required:f.required||false,isPrimaryKey:f.isPK||false,isLookup:f.isLookup||false,isRelatedRecord:f.isRef||false,inSubtable:f.inSubtable||false})),
      relations:a.relations.map(r=>({fromField:r.from,toApp:r.toApp,toField:r.toField,type:r.kind})),
    })),
  };
  openModal("JSON スキーマ",JSON.stringify(schema,null,2),"ER図スキーマ.json");
}

// ─── CSV exports ───
function csvCell(v){
  const s=String(v==null?"":v);
  return /[",\\n\\r]/.test(s) ? '"'+s.replace(/"/g,'""')+'"' : s;
}
function csvLine(arr){return arr.map(csvCell).join(",");}
function showCSVApps(){
  const rows=[["アプリID","アプリ名","項目数","リレーション数","Lookup数","関連レコード数","アクション数","必須項目数","深さ","開始点","取得状態"]];
  APPS.forEach(a=>{
    const lookups=(a.relations||[]).filter(r=>r.kind==="LOOKUP").length;
    const refs=(a.relations||[]).filter(r=>r.kind==="REF").length;
    const acts=(a.relations||[]).filter(r=>r.kind==="ACTION").length;
    rows.push([a.id,a.name,visibleFieldsForNode(a).length,a.relations.length,lookups,refs,acts,a.requiredCount||0,a.depth||0,startAppIdSet.has(String(a.id))?"1":"0",a.ok?"OK":"ERROR"]);
  });
  openModal("CSV (アプリ一覧)","\\ufeff"+rows.map(csvLine).join("\\n"),"ER図_アプリ一覧.csv");
}
function showCSVFields(){
  const rows=[["アプリID","アプリ名","フィールドコード","フィールド名","種類","必須","重複禁止","主キー","ルックアップ","関連","サブテーブル内","テーブル名"]];
  APPS.forEach(a=>{
    visibleFieldsForNode(a).forEach(f=>{
      rows.push([a.id,a.name,f.code||"",buildFieldDisplayName(f),f.type||"",f.required?"1":"0",f.unique?"1":"0",f.isPK?"1":"0",f.isLookup?"1":"0",f.isRef?"1":"0",f.inSubtable?"1":"0",f.tableLabel||""]);
    });
  });
  openModal("CSV (フィールド一覧)","\\ufeff"+rows.map(csvLine).join("\\n"),"ER図_フィールド一覧.csv");
}
function showCSVRelations(){
  const rows=[["種類","起点アプリID","起点アプリ名","起点フィールド","宛先アプリID","宛先アプリ名","宛先フィールド"]];
  APPS.forEach(a=>{
    a.relations.forEach(r=>{
      const t=appMap.get(r.toApp);
      rows.push([r.kind,a.id,a.name,r.fromDisplay||r.fromLabel||r.from||"",r.toApp,t?t.name:"(不明)",r.toField||""]);
    });
  });
  openModal("CSV (リレーション一覧)","\\ufeff"+rows.map(csvLine).join("\\n"),"ER図_リレーション一覧.csv");
}

// ─── Markdown spec ───
function mdEsc(s){return String(s==null?"":s).replace(/\\|/g,"\\\\|").replace(/\\n/g," ");}
function showMarkdown(){
  const lines=[];
  lines.push("# kintone ER図 仕様書");
  lines.push("");
  lines.push("- 生成日時: " + new Date().toLocaleString("ja-JP"));
  lines.push("- 起点アプリ: " + ((ER_OPTIONS.startAppIds||[]).join(", ") || "-"));
  lines.push("- アプリ数: " + APPS.length);
  lines.push("- 総リレーション: " + APPS.reduce((s,a)=>s+a.relations.length,0));
  lines.push("");
  lines.push("## アプリ一覧");
  lines.push("");
  lines.push("| アプリID | アプリ名 | 項目数 | 関連数 | 深さ | 状態 |");
  lines.push("|---:|---|---:|---:|---:|---|");
  APPS.forEach(a=>{
    lines.push("| "+a.id+" | "+mdEsc(a.name)+" | "+visibleFieldsForNode(a).length+" | "+a.relations.length+" | "+(a.depth||0)+" | "+(a.ok?"OK":"取得失敗")+" |");
  });
  lines.push("");
  APPS.forEach(a=>{
    lines.push("## "+mdEsc(a.name)+" (App "+a.id+")");
    lines.push("");
    const vf=visibleFieldsForNode(a);
    if(vf.length){
      lines.push("### フィールド");
      lines.push("");
      lines.push("| コード | 名称 | 種類 | 必須 | 主キー | Lookup | 関連 | サブテーブル |");
      lines.push("|---|---|---|:---:|:---:|:---:|:---:|:---:|");
      vf.forEach(f=>{
        lines.push("| "+mdEsc(f.code||"")+" | "+mdEsc(buildFieldDisplayName(f))+" | "+mdEsc(f.type||"")+" | "+(f.required?"✓":"")+" | "+(f.isPK?"✓":"")+" | "+(f.isLookup?"✓":"")+" | "+(f.isRef?"✓":"")+" | "+(f.inSubtable?"✓":"")+" |");
      });
      lines.push("");
    }
    if(a.relations && a.relations.length){
      lines.push("### リレーション");
      lines.push("");
      lines.push("| 種類 | 起点フィールド | 宛先アプリ | 宛先フィールド |");
      lines.push("|---|---|---|---|");
      a.relations.forEach(r=>{
        const t=appMap.get(r.toApp);
        lines.push("| "+r.kind+" | "+mdEsc(r.fromDisplay||r.fromLabel||r.from||"")+" | "+mdEsc(t?t.name+" (App "+r.toApp+")":"App "+r.toApp)+" | "+mdEsc(r.toField||"")+" |");
      });
      lines.push("");
    }
  });
  openModal("Markdown 仕様書",lines.join("\\n"),"ER図仕様書.md");
}

// ─── Zoom controls ───
function updateZoomLabel(){
  const lab=document.getElementById("zoom-level");
  if(lab) lab.textContent = Math.round(cy.zoom()*100)+"%";
}
function zoomIn(){ cy.zoom({level: Math.min(cy.zoom()*1.25, cy.maxZoom()), renderedPosition:{x:cy.width()/2,y:cy.height()/2}}); updateZoomLabel(); }
function zoomOut(){ cy.zoom({level: Math.max(cy.zoom()/1.25, cy.minZoom()), renderedPosition:{x:cy.width()/2,y:cy.height()/2}}); updateZoomLabel(); }
function zoomReset(){ cy.zoom(1); cy.center(); updateZoomLabel(); }
cy.on("zoom", updateZoomLabel);
setTimeout(updateZoomLabel, 300);

// ─── Fullscreen ───
function toggleFullscreen(){
  const doc=document;
  const el=doc.documentElement;
  try{
    if(!doc.fullscreenElement){
      (el.requestFullscreen||el.webkitRequestFullscreen||el.msRequestFullscreen).call(el);
    }else{
      (doc.exitFullscreen||doc.webkitExitFullscreen||doc.msExitFullscreen).call(doc);
    }
  }catch(_){ toast("フルスクリーンに対応していません"); }
}
document.addEventListener("fullscreenchange",()=>{
  const btn=document.getElementById("fs-btn");
  if(btn) btn.textContent = document.fullscreenElement ? "⛔" : "⛶";
});

// ─── Dropdown menus ───
function toggleMenu(id){
  const m=document.getElementById(id);
  if(!m) return;
  const willOpen=!m.classList.contains("open");
  closeAllMenus();
  if(willOpen) m.classList.add("open");
}
function closeAllMenus(){ document.querySelectorAll(".tb-menu.open").forEach(x=>x.classList.remove("open")); }
document.addEventListener("click",(e)=>{
  const inside=e.target.closest(".tb-menu");
  if(!inside) closeAllMenus();
});

// ─── Mobile menu toggle ───
function toggleMobileMenu(){
  document.getElementById("topbar").classList.toggle("mobile-open");
}

// ─── Help modal ───
function openHelp(){ document.getElementById("help-overlay").classList.add("open"); }
function closeHelp(){ document.getElementById("help-overlay").classList.remove("open"); }

// ─── Share URL (encodes current state in hash) ───
function encodeState(){
  const state={
    l: ER_OPTIONS.layoutName,
    d: ER_OPTIONS.fieldDensity,
    f: focusMode ? 1 : 0,
    fd: focusDepth,
    fdir: focusDirection,
    rl: relationLabelVisible ? 1 : 0,
    rk: (relationKindState.LOOKUP?"L":"") + (relationKindState.REF?"R":"") + (relationKindState.ACTION?"A":""),
    t: isDark ? "d" : "l"
  };
  return btoa(unescape(encodeURIComponent(JSON.stringify(state))));
}
function applyStateFromHash(){
  try{
    const h=location.hash.replace(/^#/,"");
    if(!h) return;
    const state=JSON.parse(decodeURIComponent(escape(atob(h))));
    if(state.l) setLayout(state.l);
    if(state.d) setDensity(state.d);
    if(typeof state.f === "number"){ if(!!state.f !== focusMode) toggleFocusMode(); }
    if(state.fd){ const sel=document.getElementById("focus-depth"); if(sel) sel.value=String(state.fd); }
    if(state.fdir){ const sel=document.getElementById("focus-direction"); if(sel) sel.value=state.fdir; }
    if(state.rk){
      if(relationKindState.LOOKUP !== state.rk.includes("L")) toggleRelationKind("LOOKUP");
      if(relationKindState.REF !== state.rk.includes("R")) toggleRelationKind("REF");
      if(relationKindState.ACTION !== state.rk.includes("A")) toggleRelationKind("ACTION");
    }
    if(typeof state.rl === "number" && !!state.rl !== relationLabelVisible) toggleRelationLabels();
    if(state.t === "l" && isDark) toggleTheme();
    if(state.t === "d" && !isDark) toggleTheme();
    updateFocusOptions();
  }catch(_){ /* ignore */ }
}
function copyShareUrl(){
  const url=location.origin+location.pathname+"#"+encodeState();
  try{
    navigator.clipboard.writeText(url).then(()=>toast("表示状態のURLをコピーしました"));
  }catch(_){
    prompt("URLをコピーしてください", url);
  }
}
setTimeout(applyStateFromHash, 350);

// ─── Print ───
function printDiagram(){
  const data=cy.png({ full:true, scale:2, bg: currentPalette().bg });
  const w=window.open("","_blank");
  if(!w){ toast("別タブを開けませんでした"); return; }
  w.document.write('<title>kintone ER図 印刷</title><body style="margin:0;padding:0;text-align:center;"><img src="'+data+'" style="max-width:100%;height:auto"/></body>');
  w.document.close();
  setTimeout(()=>{ try{ w.focus(); w.print(); }catch(_){} }, 500);
}

// ─── Double-click to isolate ───
cy.on("dbltap","node",e=>{
  const n=e.target;
  const neighborhood=n.closedNeighborhood();
  cy.elements().addClass("dimmed");
  neighborhood.removeClass("dimmed").addClass("highlighted");
  toast("ダブルクリック: 接続アプリのみ表示（背景クリックで解除）");
});

// ─── Hover tooltip ───
let tipEl;
cy.on("mouseover","node",e=>{
  const app=appMap.get(e.target.data("appId"));
  if(!app) return;
  if(!tipEl){tipEl=document.createElement("div");Object.assign(tipEl.style,{position:"fixed",zIndex:"999",background:"var(--surface)",border:"1px solid var(--border)",borderRadius:"8px",padding:"8px 12px",fontSize:"11px",fontFamily:"'DM Mono',monospace",pointerEvents:"none",boxShadow:"0 4px 16px rgba(0,0,0,0.3)",maxWidth:"260px"});document.body.appendChild(tipEl);}
  const _v = visibleFieldsForNode(app).length;
  const _t = typeof app.totalFieldCount === "number" ? app.totalFieldCount : _v;
  const _itemText = _t > _v ? (_v + "/" + _t) : _v;
  tipEl.innerHTML="<b>"+app.name+"</b> (ID:"+app.id+")<br>項目: "+_itemText+" | 関連: "+app.relations.length+" | 深さ: "+(app.depth || 0);
  tipEl.style.display="block";
});
cy.on("mouseout","node",()=>{if(tipEl) tipEl.style.display="none";});
cy.on("mousemove",e=>{if(tipEl&&tipEl.style.display==="block"){tipEl.style.left=(e.originalEvent.clientX+14)+"px";tipEl.style.top=(e.originalEvent.clientY+14)+"px";}});
<\/script>
</body>
</html>`;
};


/**
 * スペースID指定時は当該スペースの全アプリを起点に追加し、
 * スペース内アプリ集合を options.spaceAppIds に格納する（ER 描画でのスペース表現用）。
 */
async function resolveErStartAppIds(options: any): Promise<void> {
  if (!options.spaceId) return;
  setStatus(`スペース ${options.spaceId} のアプリ一覧を取得中...`);
  progressUi.update(2, `スペース ${options.spaceId} のアプリ一覧を取得中...`);
  const apps = await fetchAppsInSpace(options.spaceId, options.source?.guestId);
  const spaceIds = apps.map((a) => String(a.appId));
  options.spaceAppIds = spaceIds;
  const merged = [...(Array.isArray(options.startAppIds) ? options.startAppIds : []), ...spaceIds];
  options.startAppIds = merged.filter((v, i, arr) => /^\d+$/.test(String(v)) && arr.indexOf(v) === i);
}

export async function runGenerateERDiagram() {
  const options = readErDiagramOptions();
  await resolveErStartAppIds(options);
  if (!options.startAppIds?.length) throw new Error('比較元アプリID（または追加起点ID / スペースID）を入力してください');
  const popup = getToolWindow().open('', '_blank');
  if (!popup) throw new Error('別タブを開けませんでした。ポップアップブロックを確認してください');
  popup.document.write('<title>ER図</title><body style="font-family:sans-serif;padding:24px">ER図を生成中...</body>');
  setStatus(`ER図の解析を開始します... 起点 ${options.startAppIds.join(",")} / ${formatErLayoutLabel(options.layoutName)} / ${options.fieldDensity}`);
  progressUi.init();
  progressUi.update(4, `開始: 起点 ${options.startAppIds.join(",")}`);

  try {
    const apps = await crawl(options.startAppIds, options);
    progressUi.update(94, 'HTML生成中...');
    const html = buildHTML(apps, options);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    popup.location.href = url;
    progressUi.close();
    // 起点アプリ群と一致 = 関連が全く伸びなかった = 孤立しているケース
    const seedCount = options.startAppIds.length;
    const onlySeeds = apps.length === seedCount;
    if (onlySeeds && seedCount === 1) {
      const totalRels = apps[0]?.relations?.length || 0;
      if (totalRels === 0) {
        setStatus(`ER図の生成完了: 起点アプリのみ表示（関連 0件）。「逆引き探索」をONにすると、このアプリを参照しているアプリも辿れます`);
      } else {
        setStatus(`ER図の生成完了: 起点アプリのみ表示（関連先アプリは取得不可）`);
      }
    } else {
      setStatus(`ER図の生成完了: ${apps.length}アプリを別タブ表示しました`);
    }
    setTimeout(() => URL.revokeObjectURL(url), 60 * 1000);
  } catch (e) {
    try { popup.close(); } catch (e) { /* noop */ }
    progressUi.error(e.message || String(e));
    throw e;
  }
}

export async function runExportERDiagramHtml() {
  const options = readErDiagramOptions();
  await resolveErStartAppIds(options);
  if (!options.startAppIds?.length) throw new Error('比較元アプリID（または追加起点ID / スペースID）を入力してください');
  setStatus(`ER図HTMLを生成します... 起点 ${options.startAppIds.join(",")}`);
  progressUi.init();
  progressUi.update(4, `開始: 起点 ${options.startAppIds.join(",")}`);

  try {
    const apps = await crawl(options.startAppIds, options);
    progressUi.update(94, 'HTML保存データ生成中...');
    const html = buildHTML(apps, options);
    const suffix = `${options.source?.guestId ? `guest${options.source.guestId}_` : ''}${options.source?.preview ? 'プレビュー' : '本番'}`;
    downloadText(
      buildExportFilename('ER図', 'html', { appLabel: buildAppFilenameLabel(options.startAppId, ''), suffix }),
      html,
      'text/html'
    );
    progressUi.close();
    setStatus(`ER図HTMLを保存しました (${apps.length}アプリ)`);
  } catch (e) {
    progressUi.error(e.message || String(e));
    throw e;
  }
}

// ---------------------------------------------------------------------------
// ER プリセット: 詳細オプションをワンクリックで既定値に揃える
// ---------------------------------------------------------------------------

export interface ErPreset {
  layout?: string;
  density?: string;
  maxDepth?: string;
  includeSubtable?: boolean;
  includeReverseLookup?: boolean;
  focusSpaceInput?: boolean;
  label: string;
}

const ER_PRESETS: Record<string, ErPreset> = {
  current:      { label: '現在のみ', layout: 'dagre', density: 'standard', maxDepth: '1', includeSubtable: true, includeReverseLookup: false },
  neighborhood: { label: '周辺 (深さ2)', layout: 'dagre', density: 'standard', maxDepth: '2', includeSubtable: true, includeReverseLookup: false },
  reverse:      { label: '逆引きあり', layout: 'dagre', density: 'standard', maxDepth: '2', includeSubtable: true, includeReverseLookup: true },
  full:         { label: 'すべて辿る', layout: 'cose', density: 'standard', maxDepth: '0', includeSubtable: true, includeReverseLookup: true },
  space:        { label: 'スペース全体', layout: 'dagre', density: 'standard', maxDepth: '2', includeSubtable: true, includeReverseLookup: false, focusSpaceInput: true }
};

export function applyErPreset(presetKey: string): void {
  const preset = ER_PRESETS[presetKey];
  if (!preset) {
    setStatus(`不明なプリセット: ${presetKey}`, true);
    return;
  }
  if (preset.layout != null && ui.erLayout) ui.erLayout.value = preset.layout;
  if (preset.density != null && ui.erFieldDensity) ui.erFieldDensity.value = preset.density;
  if (preset.maxDepth != null && ui.erMaxDepth) ui.erMaxDepth.value = preset.maxDepth;
  if (preset.includeSubtable != null && ui.erIncludeSubtable) ui.erIncludeSubtable.checked = preset.includeSubtable;
  if (preset.includeReverseLookup != null && ui.erIncludeReverseLookup) ui.erIncludeReverseLookup.checked = preset.includeReverseLookup;
  if (preset.focusSpaceInput && ui.erSpaceId) {
    try {
      ui.erSpaceId.focus();
      ui.erSpaceId.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } catch (e) { /* noop */ }
  }
  renderErPreflight();
  renderErRouteMeta();
  setStatus(`ER プリセット「${preset.label}」を適用しました`);
}

// ---------------------------------------------------------------------------
// 事前見積もり: 生成前に「何を取得するか」を要約表示
// ---------------------------------------------------------------------------

export function renderErPreflight(): void {
  let host: HTMLElement | null;
  try { host = getToolDocument().getElementById('u_erPreflight'); }
  catch { host = null; }
  if (!host) return;
  let opts: ReturnType<typeof readErDiagramOptions>;
  try { opts = readErDiagramOptions(); }
  catch { host.innerHTML = ''; return; }

  const startCount = opts.startAppIds.length;
  const hasSpace = !!opts.spaceId;
  const reverse = !!opts.includeReverseLookup;
  const depth = opts.maxDepth === 0 ? '無制限' : `${opts.maxDepth} ホップ`;
  const densityLabel = ({ compact: '簡易', standard: '標準', full: '詳細' } as Record<string, string>)[opts.fieldDensity] || opts.fieldDensity;

  if (!startCount && !hasSpace) {
    host.innerHTML = `<div class="er-preflight__empty">起点アプリIDがありません — 上の接続設定で比較元を指定するか、追加起点 / スペースIDを入力してください。</div>`;
    return;
  }

  const warnings: string[] = [];
  if (reverse) warnings.push('逆引き探索ON: 全アプリを走査するため時間がかかります（アプリ数 × 数秒）。');
  if (opts.maxDepth === 0) warnings.push('深さ無制限: アプリ網が大きい場合は実行時間が伸びます。');
  if (hasSpace) warnings.push(`スペース ${opts.spaceId} 内の全アプリを起点に追加します。`);
  if (startCount > 5 && !hasSpace) warnings.push(`起点が ${startCount}アプリと多めです。広範囲を探索します。`);

  const seedLabel = startCount
    ? opts.startAppIds.slice(0, 5).join(', ') + (startCount > 5 ? ` 他${startCount - 5}` : '')
    : '（スペース内アプリ）';
  const warningsHtml = warnings.length
    ? `<div class="er-preflight__warnings">${warnings.map((w) => `<div class="er-preflight__warn">⚠ ${esc(w)}</div>`).join('')}</div>`
    : `<div class="er-preflight__ok">✓ 軽量な探索です。すぐに生成できます。</div>`;
  host.innerHTML = `
    <div class="er-preflight__head">
      <span class="er-preflight__lbl">事前見積もり</span>
      <span class="er-preflight__hint">生成前に取得範囲を確認できます</span>
    </div>
    <div class="er-preflight__grid">
      <div class="er-preflight__chip"><span class="er-preflight__chip-lbl">起点</span><span class="er-preflight__chip-val">${esc(String(startCount))} アプリ</span></div>
      <div class="er-preflight__chip"><span class="er-preflight__chip-lbl">探索深さ</span><span class="er-preflight__chip-val">${esc(depth)}</span></div>
      <div class="er-preflight__chip"><span class="er-preflight__chip-lbl">密度</span><span class="er-preflight__chip-val">${esc(densityLabel)}</span></div>
      <div class="er-preflight__chip"><span class="er-preflight__chip-lbl">サブテーブル</span><span class="er-preflight__chip-val">${opts.includeSubtableFields ? 'ON' : 'OFF'}</span></div>
      <div class="er-preflight__chip${reverse ? ' er-preflight__chip--warn' : ''}"><span class="er-preflight__chip-lbl">逆引き</span><span class="er-preflight__chip-val">${reverse ? 'ON (全走査)' : 'OFF'}</span></div>
      ${hasSpace ? `<div class="er-preflight__chip er-preflight__chip--warn"><span class="er-preflight__chip-lbl">スペース</span><span class="er-preflight__chip-val">#${esc(opts.spaceId)}</span></div>` : ''}
    </div>
    <div class="er-preflight__seed" title="${esc(seedLabel)}"><span class="er-preflight__chip-lbl">起点ID</span> <code>${esc(seedLabel)}</code></div>
    ${warningsHtml}
  `;
}

export function renderErRouteMeta(): void {
  let host: HTMLElement | null;
  try { host = getToolDocument().getElementById('u_erRouteMeta'); }
  catch { host = null; }
  if (!host) return;
  let opts: ReturnType<typeof readErDiagramOptions>;
  try { opts = readErDiagramOptions(); }
  catch { return; }
  const layoutLabel = formatErLayoutLabel(opts.layoutName);
  const densityLabel = ({ compact: '簡易密度', standard: '標準密度', full: '詳細密度' } as Record<string, string>)[opts.fieldDensity] || opts.fieldDensity;
  const subtableLabel = `サブテーブル${opts.includeSubtableFields ? 'ON' : 'OFF'}`;
  const depthLabel = opts.maxDepth === 0 ? '深さ無制限' : `深さ${opts.maxDepth}`;
  const reverseLabel = opts.includeReverseLookup ? '逆引きON' : '';
  const parts = [layoutLabel, densityLabel, depthLabel, subtableLabel, reverseLabel].filter(Boolean);
  host.innerHTML = parts.map((p) => `<span>${esc(p)}</span>`).join('');
}

/**
 * ER タブを開いた・オプションを変更した瞬間に preflight と meta を再描画する。
 * UI 初期化フローから呼び出される（boot 時の登録は handlers/setupEventHandlers 側）。
 */
export function bindErPreflightListeners(): void {
  const doc = (() => { try { return getToolDocument(); } catch { return null; } })();
  if (!doc) return;
  const ids = ['u_erLayout', 'u_erFieldDensity', 'u_erMaxDepth', 'u_erExtraApps', 'u_erSpaceId', 'u_erIncludeSubtable', 'u_erIncludeReverseLookup', 'u_sourceApp'];
  ids.forEach((id) => {
    const el = doc.getElementById(id) as HTMLElement & { _kusErBound?: boolean } | null;
    if (!el || el._kusErBound) return;
    el._kusErBound = true;
    el.addEventListener('input', () => { renderErPreflight(); renderErRouteMeta(); });
    el.addEventListener('change', () => { renderErPreflight(); renderErRouteMeta(); });
  });
  renderErPreflight();
  renderErRouteMeta();
}
