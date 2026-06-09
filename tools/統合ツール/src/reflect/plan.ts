'use strict';

import { SECTION_DEFS, HIGH_IMPACT_SECTIONS, SECTION_APPLY_HINTS } from '../constants.js';
import {
  deepClone,
  stableStringify,
  stableStringifyMemo,
  esc,
  normalize,
  downloadText,
  buildExportFilename,
  buildAppFilenameLabel,
  extractAppNameFromBundle,
  kusPrompt,
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
  extractFieldCodeFromRowPath,
  extractReferencedAppIds
} from './apply.js';
import { summarizePlanDeletes } from './planInsights.js';
import { reflectRowModeById } from './rowMode.js';
import { buildPlanRequestSummary } from './progress-pure.js';
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
import { buildPatchPayload, buildDiffHtml } from '../diff/export.js';
import { getDiffNormalizationPresetState } from '../diff/engine.js';
import { loadJSZip } from '../tabs/record.js';

/**
 * 現状の差分・選択・接続情報からプラン署名を計算する。
 * `state.lastApplyPlan.signature` と一致しなければプランは古い。
 * Section/Node どちらのモードでも対応する。
 * 計算不能な状況（接続未設定など）では '' を返す。
 */
export function computeCurrentReflectPlanSignature(): string {
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
    } else if (stableStringifyMemo(before[k]) !== stableStringifyMemo(v)) {
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
    } else if (stableStringifyMemo(before[k]) !== stableStringifyMemo(v)) {
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

// ------------------------------------------------------------
// whole-PUT セクションの「人が読めるアイテム単位プレビュー」生成
// notifications / acl / customize / plugin / categories / process など、
// 1リクエストで全置換するセクションでも、内部の追加/更新/削除を行単位で見せる。
// ------------------------------------------------------------

const ENTITY_TYPE_LABEL_MAP: Record<string, string> = {
  USER: 'ユーザー',
  GROUP: 'グループ',
  ORGANIZATION: '組織',
  FIELD_ENTITY: 'フィールド値',
  CREATOR: '作成者',
  MODIFIER: '更新者',
  LOGIN_USER: 'ログインユーザー',
  ALL: '全員'
};

function formatEntityRef(entityWrap: any): string {
  if (!entityWrap) return '-';
  const e = entityWrap.entity || entityWrap;
  const t = String(e?.type || '').toUpperCase();
  const typeLabel = ENTITY_TYPE_LABEL_MAP[t] || t || '不明';
  const id = e?.name || e?.code || '';
  return id ? `${typeLabel}:${id}` : typeLabel;
}

interface ItemizedPreviewItem {
  status: 'added' | 'updated' | 'removed';
  key: string;        // 一意キー（除外用）
  label: string;      // 1行サマリ
  beforeText?: string;
  afterText?: string;
  detail?: string;    // 追加メタ（リクエスト先など）
}

export interface ItemizedSectionPreview {
  items: ItemizedPreviewItem[];
  addedCount: number;
  updatedCount: number;
  removedCount: number;
  totalCount: number;
  truncated: boolean;
  notes?: string[];   // ユーザーへの注意書き（プラグインの config 同期されない等）
}

const ITEM_PREVIEW_CAP = 60;

function diffArrayByKey(
  before: any[],
  after: any[],
  keyFn: (item: any, idx: number) => string,
  labelFn: (item: any, idx: number) => string
): ItemizedPreviewItem[] {
  const beforeList = Array.isArray(before) ? before : [];
  const afterList = Array.isArray(after) ? after : [];
  const beforeMap = new Map<string, { val: any; idx: number }>();
  beforeList.forEach((it, i) => beforeMap.set(keyFn(it, i), { val: it, idx: i }));
  const afterMap = new Map<string, { val: any; idx: number }>();
  afterList.forEach((it, i) => afterMap.set(keyFn(it, i), { val: it, idx: i }));
  const out: ItemizedPreviewItem[] = [];
  for (const [k, entry] of afterMap) {
    const v = entry.val;
    if (!beforeMap.has(k)) {
      out.push({ status: 'added', key: k, label: labelFn(v, entry.idx), afterText: truncateForPreview(v) });
    } else {
      const bv = beforeMap.get(k)!.val;
      if (stableStringifyMemo(bv) !== stableStringifyMemo(v)) {
        out.push({ status: 'updated', key: k, label: labelFn(v, entry.idx), beforeText: truncateForPreview(bv), afterText: truncateForPreview(v) });
      }
    }
  }
  for (const [k, entry] of beforeMap) {
    if (!afterMap.has(k)) {
      out.push({ status: 'removed', key: k, label: labelFn(entry.val, entry.idx), beforeText: truncateForPreview(entry.val) });
    }
  }
  return out;
}

function diffMapByKey(
  before: Record<string, any>,
  after: Record<string, any>,
  labelFn: (key: string, val: any) => string
): ItemizedPreviewItem[] {
  const out: ItemizedPreviewItem[] = [];
  const beforeMap = (before && typeof before === 'object' && !Array.isArray(before)) ? before : {};
  const afterMap = (after && typeof after === 'object' && !Array.isArray(after)) ? after : {};
  for (const [k, v] of Object.entries(afterMap)) {
    if (!Object.prototype.hasOwnProperty.call(beforeMap, k)) {
      out.push({ status: 'added', key: k, label: labelFn(k, v), afterText: truncateForPreview(v) });
    } else if (stableStringify(beforeMap[k]) !== stableStringify(v)) {
      out.push({ status: 'updated', key: k, label: labelFn(k, v), beforeText: truncateForPreview(beforeMap[k]), afterText: truncateForPreview(v) });
    }
  }
  for (const k of Object.keys(beforeMap)) {
    if (!Object.prototype.hasOwnProperty.call(afterMap, k)) {
      out.push({ status: 'removed', key: k, label: labelFn(k, beforeMap[k]), beforeText: truncateForPreview(beforeMap[k]) });
    }
  }
  return out;
}

function summarizeItems(items: ItemizedPreviewItem[]): ItemizedSectionPreview {
  const addedCount = items.filter((i) => i.status === 'added').length;
  const updatedCount = items.filter((i) => i.status === 'updated').length;
  const removedCount = items.filter((i) => i.status === 'removed').length;
  const totalCount = items.length;
  const truncated = totalCount > ITEM_PREVIEW_CAP;
  return {
    items: items.slice(0, ITEM_PREVIEW_CAP),
    addedCount,
    updatedCount,
    removedCount,
    totalCount,
    truncated
  };
}

/**
 * whole-PUT セクションの「比較先 current」と「適用後 after」から、人が読めるアイテム単位プレビューを生成する。
 * 既知のセクション形状（通知 / ACL / JS-CSS / プラグイン / カテゴリ / プロセス管理 など）に対応。
 * 未知のセクション/データ破損時は null を返し、呼び出し側は wholePreview にフォールバックする。
 */
export function buildItemizedSectionPreview(secKey: string, before: any, after: any): ItemizedSectionPreview | null {
  try {
    if (secKey === 'notifications') {
      const items = diffArrayByKey(
        before?.notifications || [],
        after?.notifications || [],
        (it, i) => `${it?.entity?.type || '?'}:${it?.entity?.code || it?.entity?.name || `#${i}`}`,
        (it) => {
          const recipients = Array.isArray(it?.recipients) ? it.recipients.join(', ') : '';
          return `${formatEntityRef(it)}${recipients ? ` → ${recipients}` : ''}`;
        }
      );
      // 通知本体の要素以外（notifyToCommenter 等）の差分も拾う
      if (stableStringify(before?.notifyToCommenter) !== stableStringify(after?.notifyToCommenter)) {
        items.unshift({
          status: 'updated',
          key: '__notifyToCommenter__',
          label: 'コメント通知設定',
          beforeText: String(before?.notifyToCommenter ?? ''),
          afterText: String(after?.notifyToCommenter ?? '')
        });
      }
      return summarizeItems(items);
    }

    if (secKey === 'perRecordNotifications' || secKey === 'reminderNotifications') {
      const items = diffArrayByKey(
        before?.notifications || [],
        after?.notifications || [],
        (it, i) => `${String(it?.title || '')}#${i}`,
        (it) => {
          const t = String(it?.title || '(無題)');
          const cond = it?.filterCond ? ` [条件: ${String(it.filterCond).slice(0, 40)}${String(it.filterCond).length > 40 ? '…' : ''}]` : '';
          return `${t}${cond}`;
        }
      );
      if (secKey === 'reminderNotifications' && stableStringify(before?.timezone) !== stableStringify(after?.timezone)) {
        items.unshift({
          status: 'updated',
          key: '__timezone__',
          label: `タイムゾーン: ${String(before?.timezone || '-')} → ${String(after?.timezone || '-')}`,
          beforeText: String(before?.timezone || ''),
          afterText: String(after?.timezone || '')
        });
      }
      return summarizeItems(items);
    }

    if (secKey === 'appAcl') {
      const items = diffArrayByKey(
        before?.rights || [],
        after?.rights || [],
        (it, i) => `${it?.entity?.type || '?'}:${it?.entity?.code || it?.entity?.name || `#${i}`}`,
        (it) => {
          const flags = ['appEditable', 'recordViewable', 'recordAddable', 'recordEditable', 'recordDeletable', 'recordImportable', 'recordExportable']
            .filter((k) => it?.[k]);
          return `${formatEntityRef(it)} (${flags.length ? flags.join(', ') : '権限なし'})`;
        }
      );
      return summarizeItems(items);
    }

    if (secKey === 'fieldAcl') {
      const items = diffArrayByKey(
        before?.rights || [],
        after?.rights || [],
        (it, i) => String(it?.code || `#${i}`),
        (it) => {
          const ents = Array.isArray(it?.entities) ? it.entities.length : 0;
          return `フィールド ${String(it?.code || '?')}（権限定義: ${ents} 件）`;
        }
      );
      return summarizeItems(items);
    }

    if (secKey === 'recordPermissions') {
      const items = diffArrayByKey(
        before?.rights || [],
        after?.rights || [],
        (it, i) => `${String(it?.filterCond || '(全レコード)')}#${i}`,
        (it) => {
          const cond = it?.filterCond ? `条件: ${String(it.filterCond).slice(0, 40)}${String(it.filterCond).length > 40 ? '…' : ''}` : '(全レコード)';
          const ents = Array.isArray(it?.entities) ? it.entities.length : 0;
          return `${cond} → 権限定義 ${ents} 件`;
        }
      );
      return summarizeItems(items);
    }

    if (secKey === 'customizeSettings') {
      const collect = (root: any) => {
        const out: Array<{ loc: string; type: string; ident: string; raw: any }> = [];
        const sides: Array<['desktop' | 'mobile', any]> = [['desktop', root?.desktop], ['mobile', root?.mobile]];
        for (const [side, group] of sides) {
          for (const kind of ['js', 'css'] as const) {
            const list = Array.isArray(group?.[kind]) ? group[kind] : [];
            list.forEach((entry: any, idx: number) => {
              const ident = String(entry?.url || entry?.file?.name || entry?.file?.fileKey || `#${idx}`);
              out.push({ loc: side, type: kind, ident, raw: entry });
            });
          }
        }
        return out;
      };
      const beforeList = collect(before);
      const afterList = collect(after);
      const items = diffArrayByKey(
        beforeList,
        afterList,
        (it) => `${it.loc}/${it.type}|${it.ident}`,
        (it) => `[${it.loc}.${it.type}] ${it.ident}`
      );
      return summarizeItems(items);
    }

    if (secKey === 'pluginSettings') {
      const beforePlugins = Array.isArray(before?.plugins) ? before.plugins : [];
      const afterPlugins = Array.isArray(after?.plugins) ? after.plugins : [];
      // PUT body は pluginIds のみ送るため、id 集合の差分を見る
      const items = diffArrayByKey(
        beforePlugins,
        afterPlugins,
        (it, i) => String(it?.id || `#${i}`),
        (it) => `${String(it?.name || it?.id || '?')}${it?.version ? ` (v${it.version})` : ''}`
      );
      const result = summarizeItems(items);
      result.notes = ['※ プラグイン本体の有効化のみ同期します。各プラグインの設定 (plugin/config) は別途反映が必要です。'];
      return result;
    }

    if (secKey === 'categories') {
      const items = diffMapByKey(
        before?.categories || {},
        after?.categories || {},
        (key, val) => `${String(val?.name || key)}（コード: ${key}）`
      );
      return summarizeItems(items);
    }

    if (secKey === 'processSettings') {
      const stateItems = diffMapByKey(
        before?.states || {},
        after?.states || {},
        (key, val) => `[状態] ${String(val?.name || key)}`
      );
      const actionItems = diffArrayByKey(
        before?.actions || [],
        after?.actions || [],
        (it, i) => `[action]${String(it?.name || `#${i}`)}`,
        (it) => `[アクション] ${String(it?.name || '?')} (${String(it?.from || '?')} → ${String(it?.to || '?')})`
      );
      const enableChange = stableStringify(before?.enable) !== stableStringify(after?.enable)
        ? [{
            status: 'updated' as const,
            key: '__enable__',
            label: `プロセス管理 ${before?.enable ? 'ON' : 'OFF'} → ${after?.enable ? 'ON' : 'OFF'}`
          }]
        : [];
      return summarizeItems([...enableChange, ...stateItems, ...actionItems]);
    }

    if (secKey === 'layoutSettings') {
      // レイアウトは行（ROW/GROUP/SUBTABLE）単位の構造変化が分かるとうれしいので、
      // type+先頭フィールドコードで識別して行単位の差分を出す。詳細プレビューは既存ヒートマップで補完。
      const summarizeRow = (row: any, idx: number): string => {
        const t = String(row?.type || 'ROW');
        if (t === 'GROUP') return `行 ${idx + 1} [GROUP] ${String(row?.code || '')}`;
        if (t === 'SUBTABLE') return `行 ${idx + 1} [SUBTABLE] ${String(row?.code || '')}`;
        const codes = Array.isArray(row?.fields) ? row.fields.map((f: any) => String(f?.code || f?.type || '?')).join(', ') : '';
        return `行 ${idx + 1} [ROW] ${codes || '(空)'}`;
      };
      const items = diffArrayByKey(
        before?.layout || [],
        after?.layout || [],
        (row, i) => {
          // 同じ位置の行を同一視するため index ベースのキー
          const t = String(row?.type || 'ROW');
          const head = Array.isArray(row?.fields) && row.fields[0] ? String(row.fields[0].code || row.fields[0].type || '') : (row?.code || '');
          return `#${i}|${t}|${head}`;
        },
        summarizeRow
      );
      return summarizeItems(items);
    }
  } catch {
    return null;
  }
  return null;
}

// 大量差分時にPUT/POST/DELETEがエラーになりやすいため、安全側のチャンクサイズで分割する。
// fallback として旧来の 100 を残しつつ、API パスごとに実運用で安定する値に下げる。
// （views/reports/actions は 1 件あたりの設定が大きく 100 件投げると制限に当たることがある）
export const APPLY_REQUEST_CHUNK_SIZE = 100;
const CHUNK_SIZE_BY_PATH: Record<string, number> = {
  '/app/form/fields.json': 100,
  '/app/views.json': 20,
  '/app/reports.json': 20,
  '/app/actions.json': 20
};

function resolveChunkSize(path: string | undefined): number {
  if (!path) return APPLY_REQUEST_CHUNK_SIZE;
  return CHUNK_SIZE_BY_PATH[path] ?? APPLY_REQUEST_CHUNK_SIZE;
}

function chunkObjectEntries(obj, size: number) {
  const entries = Object.entries(obj || ({} as any));
  if (entries.length <= size) return entries.length ? [Object.fromEntries(entries)] : [];
  const out: any[] = [];
  for (let i = 0; i < entries.length; i += size) {
    out.push(Object.fromEntries(entries.slice(i, i + size)));
  }
  return out;
}

function chunkArray(arr, size: number) {
  const list = Array.isArray(arr) ? arr : [];
  if (list.length <= size) return list.length ? [list] : [];
  const out: any[] = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

function pushChunkedMapRequests(requests, { method, path, app, key, map, label }) {
  const size = resolveChunkSize(path);
  const chunks = chunkObjectEntries(map, size);
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
  const size = resolveChunkSize(path);
  const chunks = chunkArray(list, size);
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
    } else if (stableStringifyMemo(beforeMap[code]) !== stableStringifyMemo(outDef)) {
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

// buildPlanRequestSummary は副作用ゼロのため progress-pure.ts に移動した。

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
  // 同一プラン署名の場合は「セクション除外」選択を保持（プラン再生成での意図しないリセット防止）
  const prev = state.lastApplyPlan;
  const preservedExcludes: string[] = (() => {
    if (!prev || prev.signature !== signature) return [];
    const arr = Array.isArray(prev.excludedSectionKeys) ? prev.excludedSectionKeys : [];
    // 新プランに存在しないセクションキーは取り除く
    const validKeys = new Set<string>(
      Array.isArray(extra.plannedRequests)
        ? extra.plannedRequests.map((r: any) => String(r?.sectionKey || '')).filter(Boolean)
        : []
    );
    return arr.filter((k: string) => validKeys.has(k));
  })();
  state.lastApplyPlan = {
    signature,
    mode,
    totalReq: Number(totalReq || 0),
    createdAt: Date.now(),
    summary: (lines || []).slice(0, 16).join('\n'),
    logs: lines || [],
    requestSummary,
    excludedSectionKeys: preservedExcludes,
    ...extra
  };
}

// showInlineConfirmation（最終確認パネル）表示中フラグ。
// 表示中はプラン全体の再描画を避け、確認パネルの実行/キャンセルボタンを保護する。
let inlineConfirmActive = false;

/**
 * プラン確認画面で「このセクションだけ除外」チェックの状態を切り替える。
 * 状態は `state.lastApplyPlan.excludedSectionKeys` (string[]) に保持される。
 * 反映実行時に runApplyPreview / runApplyPreviewByNodes が参照して該当セクションを除外する。
 */
export function togglePlanSectionExclude(sectionKey: string): void {
  const key = String(sectionKey || '').trim();
  if (!key) return;
  const plan = state.lastApplyPlan;
  if (!plan) return;
  const cur: string[] = Array.isArray(plan.excludedSectionKeys) ? plan.excludedSectionKeys.slice() : [];
  const idx = cur.indexOf(key);
  if (idx >= 0) cur.splice(idx, 1);
  else cur.push(key);
  plan.excludedSectionKeys = cur;
  // 部分DOM更新で十分な箇所（カード自体の状態クラス・ラベル・ヘッダのカウンタ）は
  // 該当ノードだけ書き換える。詳細パネル内に展開した <details> は維持される。
  // 失敗したらモーダル全体を再描画するフォールバックに切り替える。
  const updated = updatePlanCardExcludeStateInDom(plan, key);
  if (!updated && !inlineConfirmActive) {
    try {
      renderPlanIntoModal(plan, Array.isArray(plan.plannedRequests) ? plan.plannedRequests : []);
    } catch (_e) { /* noop */ }
  }
  const label = SECTION_DEFS.find((d) => d.key === key)?.label || key;
  setStatus(idx >= 0
    ? `セクション除外を解除しました: ${label}`
    : `セクションを反映対象から除外しました: ${label}`);
}

/**
 * `togglePlanSectionExclude` の DOM 反映を、innerHTML 全置換ではなくピンポイント
 * 更新する。展開済みのプレビューや詳細 <details> の状態を保ちながら、
 * 状態クラス・除外ラベル・上部カウンタだけを書き換える。
 *
 * 想定される DOM 構造が見つからなければ false を返してフォールバックを促す。
 */
function updatePlanCardExcludeStateInDom(plan: any, sectionKey: string): boolean {
  try {
    const doc = getToolDocument();
    const root = doc.querySelector('#u_reflectPlanModal .reflect-modal-body') as HTMLElement | null
      || (ui.result as HTMLElement | null);
    if (!root) return false;

    const safeKey = String(sectionKey).replace(/"/g, '\\"');
    const cardSelector = `.plan-card .plan-card__exclude input[data-section-key="${safeKey}"]`;
    const checkbox = root.querySelector(cardSelector) as HTMLInputElement | null;
    if (!checkbox) return false;
    const card = checkbox.closest('.plan-card') as HTMLElement | null;
    const labelWrap = checkbox.closest('.plan-card__exclude') as HTMLElement | null;
    if (!card || !labelWrap) return false;

    const excludedKeys: string[] = Array.isArray(plan?.excludedSectionKeys) ? plan.excludedSectionKeys : [];
    const isExcluded = excludedKeys.includes(String(sectionKey));

    card.classList.toggle('plan-card--excluded', isExcluded);
    if (isExcluded) card.removeAttribute('open');
    else card.setAttribute('open', '');
    labelWrap.classList.toggle('is-excluded', isExcluded);
    checkbox.checked = isExcluded;
    const labelText = labelWrap.querySelector('span');
    if (labelText) labelText.textContent = isExcluded ? '除外中' : '除外';

    // 上部カウンタを再計算
    const reqs: any[] = Array.isArray(plan?.plannedRequests) ? plan.plannedRequests : [];
    const totalReqAll = reqs.length;
    const excludedSet = new Set<string>(excludedKeys);
    const remainingReq = reqs.reduce((s, r) => s + (excludedSet.has(String(r?.sectionKey || '')) ? 0 : 1), 0);
    const sectionKeysOfReqs = new Set<string>(reqs.map((r) => String(r?.sectionKey || '')).filter(Boolean));
    const excludedCount = [...sectionKeysOfReqs].filter((k) => excludedSet.has(k)).length;

    const meta = root.querySelector('.plan-confirm-head__meta') as HTMLElement | null;
    if (meta) {
      const stamp = new Date(plan?.createdAt || Date.now()).toLocaleString();
      const remainingMeta = excludedCount > 0
        ? ` ／ <span class="plan-confirm-head__remaining">実行対象 ${remainingReq} / ${totalReqAll} 件（除外 ${excludedCount} セクション）</span>`
        : '';
      meta.innerHTML = `予定リクエスト ${plan?.totalReq || 0} 件 ／ ${esc(stamp)}${remainingMeta}`;
    }

    const applyBtnLabel = root.querySelector('[data-act="applyPreview"] span:nth-of-type(2)') as HTMLElement | null;
    if (applyBtnLabel) {
      applyBtnLabel.textContent = excludedCount > 0
        ? `このプランで反映する（${remainingReq}/${totalReqAll}件）`
        : 'このプランで反映する';
    }

    // 最終確認パネル表示中は実行ボタンの件数表示と削除警告も連動して更新する
    const execBtn = root.querySelector('#u_planExecute') as HTMLElement | null;
    if (execBtn) {
      execBtn.textContent = buildPlanExecuteLabel({
        cardsHtml: '',
        totalReqAll,
        remainingReq,
        excludedCount,
        remainingMetaHtml: ''
      });
    }
    const deleteSlot = root.querySelector('[data-plan-delete-warning]') as HTMLElement | null;
    if (deleteSlot) deleteSlot.innerHTML = renderPlanDeleteWarningHtml(plan);
    return true;
  } catch (_e) {
    return false;
  }
}

export function showInlineConfirmation(plan, options) {
  const appIdRefs = (options && options.appIdRefs) || plan?.appIdRefs || [];
  return new Promise((resolve) => {
    const stamp = new Date(plan.createdAt).toLocaleString();
    const planText = (plan.logs || []).join('\n') || '(プラン詳細なし)';
    const appIdSection = appIdRefs.length
      ? `<details class="plan-confirm-appids"><summary>関連アプリID一覧（${appIdRefs.length}件）— ルックアップ等の参照先を確認</summary>${renderAppIdConfirmSection(appIdRefs)}</details>`
      : '';
    const baselineErrors: Array<{ sectionKey: string; label: string; message: string }> = Array.isArray(plan?.baselineErrors) ? plan.baselineErrors : [];
    const baselineWarning = baselineErrors.length
      ? `<div class="plan-baseline-warning" style="margin:8px 0;padding:8px 10px;border:1px solid #d97706;background:#fef3c7;color:#92400e;border-radius:6px;font-size:12px">
          <div style="font-weight:700;margin-bottom:4px">⚠ ベースライン取得失敗 ${baselineErrors.length} セクション</div>
          <div style="margin-bottom:4px">該当セクションは同時編集検出が無効化されます。続行する場合は内容を確認のうえチェックを入れてください。</div>
          <ul style="margin:4px 0 6px 16px;padding:0">${baselineErrors.map((e) => `<li>${esc(e.label)}: ${esc(e.message)}</li>`).join('')}</ul>
          <label style="display:flex;align-items:center;gap:6px;font-weight:600"><input type="checkbox" id="u_planBaselineAck"> ベースライン未取得セクションを承知のうえ続行する</label>
        </div>`
      : '';
    const doc = getToolDocument();
    const modalEl = doc.getElementById('u_reflectPlanModal') as HTMLElement | null;
    const modalBody = modalEl?.querySelector('.reflect-modal-body') as HTMLElement | null;
    const modalFoot = modalEl?.querySelector('.reflect-modal-foot') as HTMLElement | null;
    const modalTitle = modalEl?.querySelector('.reflect-modal-title') as HTMLElement | null;
    const fallbackHost = modalBody || ui.result;
    if (!fallbackHost) { resolve(false); return; }
    const previousHtml = fallbackHost.innerHTML;
    const previousScrollTop = (fallbackHost as any).scrollTop || 0;
    const previousTitle = modalTitle ? modalTitle.textContent : '';
    if (modalEl) modalEl.hidden = false;
    // 確認中はモーダル下部の「このプランで反映」等を隠し、実行ボタンを一本化する
    if (modalFoot) modalFoot.style.display = 'none';
    if (modalTitle) modalTitle.textContent = '実行前の最終確認';

    const reqs = Array.isArray(plan.plannedRequests) ? plan.plannedRequests : [];
    const cardsView = buildPlanSectionCardsHtml(plan, reqs);
    const execLabel = buildPlanExecuteLabel(cardsView);
    const execDisabled = baselineErrors.length ? 'disabled' : '';
    inlineConfirmActive = true;
    fallbackHost.innerHTML = `<div class="plan-confirm-panel" data-inline-confirm="1">
      <div class="plan-confirm-head">
        <div class="plan-confirm-head__title">実行前の最終確認</div>
        <div class="plan-confirm-head__meta">予定リクエスト ${plan.totalReq || 0} 件 ／ ${esc(stamp)}${cardsView.remainingMetaHtml}</div>
      </div>
      ${renderPlanTargetLineHtml()}
      ${renderPlanRequestSummary(plan)}
      <div class="plan-delete-warning-slot" data-plan-delete-warning>${renderPlanDeleteWarningHtml(plan)}</div>
      ${baselineWarning}
      ${appIdSection}
      <div class="plan-confirm-cards">${cardsView.cardsHtml || '<div class="muted">予定リクエストがありません</div>'}</div>
      <details class="plan-confirm-rawlogs"><summary>テキストログを表示</summary><div class="plan-summary">${esc(planText)}</div></details>
      <div class="plan-actions">
        <span class="plan-meta">不要なセクションは各カードの「除外」で外せます。実行後も「直前保存を戻す」で復元できます。</span>
        <button class="btn sub" id="u_planCancel">キャンセル</button>
        <button class="btn ok" id="u_planExecute" ${execDisabled}>${esc(execLabel)}</button>
      </div>
    </div>`;
    if (baselineErrors.length) {
      const ack = doc.getElementById('u_planBaselineAck') as HTMLInputElement | null;
      const exec = doc.getElementById('u_planExecute') as HTMLButtonElement | null;
      ack?.addEventListener('change', () => {
        if (exec) exec.disabled = !ack.checked;
      });
    }
    (fallbackHost as any).scrollTop = 0;

    let finished = false;
    let observer: MutationObserver | null = null;
    const finish = (result: boolean) => {
      if (finished) return;
      finished = true;
      inlineConfirmActive = false;
      if (observer) { observer.disconnect(); observer = null; }
      const execBtn = doc.getElementById('u_planExecute');
      const cancelBtn = doc.getElementById('u_planCancel');
      if (execBtn) execBtn.removeEventListener('click', onExec);
      if (cancelBtn) cancelBtn.removeEventListener('click', onCancel);
      fallbackHost.innerHTML = previousHtml;
      (fallbackHost as any).scrollTop = previousScrollTop;
      if (modalFoot) modalFoot.style.display = '';
      if (modalTitle) modalTitle.textContent = previousTitle;
      if (modalEl) modalEl.hidden = true;
      resolve(result);
    };
    const onExec = () => finish(true);
    const onCancel = () => finish(false);
    doc.getElementById('u_planExecute')?.addEventListener('click', onExec);
    doc.getElementById('u_planCancel')?.addEventListener('click', onCancel);
    // 初期フォーカスは安全側（キャンセル）に置き、Enter 押下での誤実行を防ぐ
    setTimeout(() => (doc.getElementById('u_planCancel') as HTMLElement | null)?.focus?.(), 0);
    // Esc・×ボタン・背景クリックでモーダルが hidden にされた場合もキャンセル扱いにする。
    // ここで resolve しないと withGuard が解放されず UI がロックされたままになる。
    if (modalEl && typeof MutationObserver !== 'undefined') {
      observer = new MutationObserver(() => {
        if (!finished && modalEl.hidden) finish(false);
      });
      observer.observe(modalEl, { attributes: true, attributeFilter: ['hidden'] });
    }
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
  // プラン確認モーダルを開いた状態で「このプランで反映」を押した場合は、
  // 直前まで同じプラン内容を見ているため同内容の確認をもう一度挟まない。
  // （最終的な安全確認は confirmApplyRiskGuard 側で必ず行われる）
  if (valid) {
    const doc = getToolDocument();
    const modalEl = doc.getElementById('u_reflectPlanModal') as HTMLElement | null;
    if (modalEl && !modalEl.hidden) {
      modalEl.hidden = true;
      return true;
    }
  }
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
  const baselineErrors: Array<{ sectionKey: string; label: string; message: string }> = [];
  const sectionPreviews: Record<string, any> = {};
  const plannedRequests: any[] = [];
  const sectionKeys = Object.keys(bySection);
  for (let i = 0; i < sectionKeys.length; i++) {
    const secKey = sectionKeys[i];
    const def = SECTION_DEFS.find((d) => d.key === secKey);
    if (!def || !def.put) continue;
    try {
      setStatus(`ノード反映プラン計算中 ${i + 1}/${sectionKeys.length}: ${def.label}`);
      let currentRes;
      try {
        currentRes = await apiGet(prefix, def.endpoint, { app });
      } catch (be) {
        const message = be?.message || String(be);
        baselineErrors.push({ sectionKey: secKey, label: def.label, message });
        lines.push(`PLAN NG ${def.label}: ベースライン取得失敗 ${message}`);
        continue;
      }
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
        const itemized = buildItemizedSectionPreview(secKey, before, patched);
        plan = {
          requests: [{ method: 'PUT', path: def.endpoint, body: { app, ...((def.putBuilder as any)?.(patched) || {}) }, note: `${def.label} put` }],
          wholePreview: buildWholeSectionPreview(before, patched),
          itemized: (itemized && (itemized.totalCount > 0 || itemized.notes?.length)) ? itemized : null
        };
      }

      if (plan.preview || plan.wholePreview || plan.itemized) {
        const shape: 'map' | 'items' | 'whole' = plan.preview ? 'map' : (plan.itemized ? 'items' : 'whole');
        sectionPreviews[secKey] = {
          label: def.label,
          shape,
          preview: plan.preview || null,
          itemized: plan.itemized || null,
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
  if (baselineErrors.length) {
    lines.push(`⚠ ベースライン取得失敗: ${baselineErrors.length} セクション（同時編集検出が無効化されます）`);
    for (const be of baselineErrors) {
      lines.push(`  - ${be.label}: ${be.message}`);
    }
    lines.push('');
  }
  lines.push(`合計予定リクエスト数: ${totalReq}`);
  lines.push('※ ノードモードは差分パスをもとに比較先プレビューへ反映します。');
  const appIdRefs = state.lastSourceBundle ? extractReferencedAppIds(state.lastSourceBundle, sectionKeys, lookupMap) : [];
  markApplyPlan(planSignature, 'nodes', totalReq, lines, { targetSectionBaselines, sectionPreviews, plannedRequests, baselineErrors, appIdRefs });

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
  const baselineErrors: Array<{ sectionKey: string; label: string; message: string }> = [];
  const sectionPreviews: Record<string, any> = {};
  const plannedRequests: any[] = [];

  const fetchBaselineSafe = async (secKey: string, label: string, endpoint: string) => {
    try {
      const res = await apiGet(prefix, endpoint, { app });
      targetSectionBaselines[secKey] = makeSectionPlanBaseline(res);
      return res;
    } catch (be) {
      const message = be?.message || String(be);
      baselineErrors.push({ sectionKey: secKey, label, message });
      logs.push(`PLAN NG ${label}: ベースライン取得失敗 ${message}`);
      return null;
    }
  };
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
      // whole-PUT セクションは可能ならアイテム単位プレビューに変換、未対応なら従来の wholePreview にフォールバック
      const itemized = buildItemizedSectionPreview(secKey, wholeBefore, wholeAfter);
      if (itemized && (itemized.totalCount > 0 || itemized.notes?.length)) {
        sectionPreviews[secKey] = {
          label,
          shape: 'items',
          preview: null,
          itemized,
          wholePreview: buildWholeSectionPreview(wholeBefore, wholeAfter),
          requestCount: (plan.requests || []).length
        };
      } else {
        sectionPreviews[secKey] = {
          label,
          shape: 'whole',
          preview: null,
          itemized: null,
          wholePreview: buildWholeSectionPreview(wholeBefore, wholeAfter),
          requestCount: (plan.requests || []).length
        };
      }
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
      const current = await fetchBaselineSafe(secKey, def.label, '/app/form/fields.json');
      if (!current) continue;
      const plan = planFieldSectionDiffRequests(app, current.properties || ({} as any), sourceSec.properties || sourceSec || ({} as any), lookupMap);
      capturePreview(secKey, def.label, plan);
      logs.push(`PLAN ${def.label}: ${plan.requests.length} request(s)`);
      appendRequestPlanLogs(logs, plan);
      if (plan.lookupChanged) logs.push(`  - lookup appId 変換: ${plan.lookupChanged}`);
      totalReq += plan.requests.length;
      continue;
    }
    if (secKey === 'viewSettings') {
      const current = await fetchBaselineSafe(secKey, def.label, '/app/views.json');
      if (!current) continue;
      const plan = planViewsSectionDiffRequests(app, current.views || ({} as any), sourceSec.views || sourceSec || ({} as any));
      capturePreview(secKey, def.label, plan);
      logs.push(`PLAN ${def.label}: ${plan.requests.length} request(s)`);
      appendRequestPlanLogs(logs, plan);
      if (plan.deleteSkipCount) logs.push(`  - views delete(skip): ${plan.deleteSkipCount} (互換モード: 削除は行いません)`);
      totalReq += plan.requests.length;
      continue;
    }
    if (secKey === 'reportSettings') {
      const current = await fetchBaselineSafe(secKey, def.label, '/app/reports.json');
      if (!current) continue;
      const plan = planReportsSectionDiffRequests(app, current.reports || ({} as any), sourceSec.reports || sourceSec || ({} as any));
      capturePreview(secKey, def.label, plan);
      logs.push(`PLAN ${def.label}: ${plan.requests.length} request(s)`);
      appendRequestPlanLogs(logs, plan);
      totalReq += plan.requests.length;
      continue;
    }
    if (secKey === 'actionSettings') {
      const current = await fetchBaselineSafe(secKey, def.label, '/app/actions.json');
      if (!current) continue;
      const plan = planActionsSectionDiffRequests(app, current.actions || ({} as any), sourceSec.actions || sourceSec || ({} as any));
      capturePreview(secKey, def.label, plan);
      logs.push(`PLAN ${def.label}: ${plan.requests.length} request(s)`);
      appendRequestPlanLogs(logs, plan);
      if (plan.deleteSkipCount) logs.push(`  - actions delete(skip): ${plan.deleteSkipCount} (互換モード: 削除は行いません)`);
      totalReq += plan.requests.length;
      continue;
    }
    const current = await fetchBaselineSafe(secKey, def.label, def.endpoint);
    if (!current) continue;
    const afterWhole = (def.putBuilder as any)?.(sourceSec) || {};
    const plan = { requests: [{ method: 'PUT', path: def.endpoint, body: { app, ...afterWhole }, note: `${def.label} put` }] };
    capturePreview(secKey, def.label, plan, current, afterWhole);
    logs.push(`PLAN ${def.label}: ${plan.requests.length} request(s)`);
    appendRequestPlanLogs(logs, plan);
    totalReq += plan.requests.length;
  }
  logs.push('');
  if (baselineErrors.length) {
    logs.push(`⚠ ベースライン取得失敗: ${baselineErrors.length} セクション（同時編集検出が無効化されます）`);
    for (const be of baselineErrors) {
      logs.push(`  - ${be.label}: ${be.message}`);
    }
    logs.push('');
  }
  logs.push(`合計予定リクエスト数: ${totalReq}`);
  const appIdRefs = sourceBundle ? extractReferencedAppIds(sourceBundle, scopes, lookupMap) : [];
  markApplyPlan(planSignature, 'section', totalReq, logs, { targetSectionBaselines, sectionPreviews, plannedRequests, baselineErrors, appIdRefs });
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

// 確認パネル共通: どこからどこへ書き込むかを 1 行で明示する
function renderPlanTargetLineHtml(): string {
  let src = { appId: '', guestId: '' };
  let tgt = { appId: '', guestId: '' };
  try {
    const c = commonParams();
    src = { appId: String(c.source?.appId || ''), guestId: String(c.source?.guestId || '') };
    tgt = { appId: String(c.target?.appId || ''), guestId: String(c.target?.guestId || '') };
  } catch (_e) {
    return '';
  }
  const srcName = extractAppNameFromBundle(state.importedSourceBundle || state.lastSourceBundle) || '';
  const tgtName = extractAppNameFromBundle(state.importedTargetBundle || state.lastTargetBundle) || '';
  const fmt = (appId: string, name: string, guestId: string) => {
    const guest = guestId ? `（ゲスト ${esc(guestId)}）` : '';
    return `App ${esc(appId || '-')}${name ? ` ${esc(name)}` : ''}${guest}`;
  };
  return `<div class="plan-confirm-target" aria-label="反映の方向">
    <span class="plan-confirm-target__side">比較元 ${fmt(src.appId, srcName, src.guestId)}</span>
    <span class="plan-confirm-target__arrow" aria-hidden="true">→</span>
    <span class="plan-confirm-target__side plan-confirm-target__side--target">比較先 ${fmt(tgt.appId, tgtName, tgt.guestId)}</span>
    <span class="plan-confirm-target__badge">プレビューへ書き込み</span>
  </div>`;
}

// 確認パネル共通: 削除を含むプランは赤帯で明示する（除外済みセクションは集計しない）
function renderPlanDeleteWarningHtml(plan: any): string {
  const reqs = Array.isArray(plan?.plannedRequests) ? plan.plannedRequests : [];
  const excludedKeys = Array.isArray(plan?.excludedSectionKeys) ? plan.excludedSectionKeys : [];
  const del = summarizePlanDeletes(reqs, excludedKeys);
  if (!del.total) return '';
  const breakdown = del.sections.map((s) => `${esc(s.sectionLabel)} ${s.count}件`).join(' ／ ');
  return `<div class="plan-delete-warning" role="alert">
    <div class="plan-delete-warning__title">⚠ 削除を含むプランです（合計 ${del.total}件）</div>
    <div class="plan-delete-warning__body">${breakdown}</div>
    <div class="plan-delete-warning__sub">削除は本番への反映（デプロイ）時に実データへも影響します。バックアップ自動保存をONにしたままの実行を推奨します。</div>
  </div>`;
}

interface PlanCardsView {
  cardsHtml: string;
  totalReqAll: number;
  remainingReq: number;
  excludedCount: number;
  remainingMetaHtml: string;
}

function buildPlanExecuteLabel(view: PlanCardsView): string {
  return view.excludedCount > 0
    ? `このまま実行（${view.remainingReq}/${view.totalReqAll}件）`
    : `このまま実行（リクエスト ${view.totalReqAll}件）`;
}

// V3+U3+S5+S10+S1: リクエスト一覧をカード化 + delta指標 + セクションアイコン
function buildPlanSectionCardsHtml(plan: any, plannedRequests: any[]): PlanCardsView {
  const reqs = Array.isArray(plannedRequests) ? plannedRequests : [];
  const sectionPreviews = (plan?.sectionPreviews || ({} as any)) as Record<string, any>;
  const excluded: Set<string> = new Set<string>(
    Array.isArray(plan?.excludedSectionKeys) ? plan.excludedSectionKeys : []
  );
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
  const totalReqAll = sections.reduce((s, sec) => s + sec.reqs.length, 0);
  const remainingReq = sections.reduce((s, sec) => s + (excluded.has(sec.sectionKey) ? 0 : sec.reqs.length), 0);
  const excludedCount = sections.filter((sec) => excluded.has(sec.sectionKey)).length;
  const cards = sections.map((sec) => {
    const isExcluded = excluded.has(sec.sectionKey);
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
    } else if (preview?.shape === 'items' && preview.itemized) {
      const it = preview.itemized;
      const parts: string[] = [];
      if (it.addedCount) parts.push(`<span class="plan-card-delta plan-card-delta--add" title="追加">+${it.addedCount}</span>`);
      if (it.updatedCount) parts.push(`<span class="plan-card-delta plan-card-delta--neutral" title="更新">~${it.updatedCount}</span>`);
      if (it.removedCount) parts.push(`<span class="plan-card-delta plan-card-delta--remove" title="削除">−${it.removedCount}</span>`);
      deltaHtml = parts.join('') || `<span class="plan-card-delta plan-card-delta--neutral" title="セクション全体更新">⇄ 全体更新</span>`;
    } else if (preview?.shape === 'whole' && preview.wholePreview) {
      deltaHtml = `<span class="plan-card-delta plan-card-delta--neutral" title="セクション全体更新">⇄ 全体更新</span>`;
    }
    // S10 + S1: section icon + severity class on the card
    const sectionIcon = renderSectionIconHtml(sec.sectionKey, { withTooltip: sec.sectionLabel });
    const applyHint = SECTION_APPLY_HINTS[sec.sectionKey] || '';
    // items プレビューがあれば各アイテムを直接プランカード本体に展開（モーダル内で完結）
    let itemSummaryHtml = '';
    if (preview?.shape === 'items' && preview.itemized && (preview.itemized.totalCount > 0 || (preview.itemized.notes && preview.itemized.notes.length))) {
      const STATUS_CLASS: Record<string, string> = { added: 'add', updated: 'upd', removed: 'rm' };
      const STATUS_LABEL: Record<string, string> = { added: '追加', updated: '更新', removed: '削除' };
      const itemRows = (preview.itemized.items || []).slice(0, 30).map((item: any) => {
        const cls = STATUS_CLASS[item.status] || 'upd';
        const lab = STATUS_LABEL[item.status] || item.status;
        return `<div class="plan-card-item plan-card-item--${cls}">
          <span class="plan-card-item__badge plan-card-item__badge--${cls}">${lab}</span>
          <span class="plan-card-item__label">${esc(item.label || item.key)}</span>
        </div>`;
      }).join('');
      const itemMore = preview.itemized.items && preview.itemized.items.length > 30
        ? `<div class="plan-card-item plan-card-item--more">…他 ${preview.itemized.items.length - 30} 件</div>`
        : '';
      const noteLines = (preview.itemized.notes || []).map((n: string) => `<div class="plan-card-note">${esc(n)}</div>`).join('');
      itemSummaryHtml = `<div class="plan-card__items">${noteLines}${itemRows}${itemMore}</div>`;
    }
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
    const hintHtml = applyHint ? `<div class="plan-card__hint">💡 ${esc(applyHint)}</div>` : '';
    // 「この変更だけ除外」チェックボックス。
    // data-act は data-act-event="change" にして change イベントで拾う。
    // click をそのまま使うと、<summary> 配下では details の開閉も連動して走るため。
    const excludeLabel = `<label class="plan-card__exclude${isExcluded ? ' is-excluded' : ''}" title="このセクションを反映対象から除外します（プラン本体は再生成されません）">
      <input type="checkbox" data-act="togglePlanSectionExclude" data-act-event="change" data-section-key="${esc(sec.sectionKey)}" ${isExcluded ? 'checked' : ''}>
      <span>${isExcluded ? '除外中' : '除外'}</span>
    </label>`;
    return `<details class="plan-card ${sevClass}${isHigh ? ' plan-card--high' : ''}${isExcluded ? ' plan-card--excluded' : ''}"${isExcluded ? '' : ' open'}>
      <summary class="plan-card__head">
        ${sectionIcon}
        <span class="plan-card__title">${esc(sec.sectionLabel)}</span>
        <span class="plan-card__count">${sec.reqs.length}件</span>
        <span class="plan-card__chips">${methodChips}</span>
        ${deltaHtml}
        ${isHigh ? '<span class="plan-card__risk">高リスク</span>' : ''}
        ${excludeLabel}
      </summary>
      <div class="plan-card__body">${hintHtml}${itemSummaryHtml}${detailRows}${more}</div>
    </details>`;
  }).join('');
  const remainingMetaHtml = excludedCount > 0
    ? ` ／ <span class="plan-confirm-head__remaining">実行対象 ${remainingReq} / ${totalReqAll} 件（除外 ${excludedCount} セクション）</span>`
    : '';
  return { cardsHtml: cards, totalReqAll, remainingReq, excludedCount, remainingMetaHtml };
}

function renderPlanConfirmPanelHtml(plan: any, plannedRequests: any[]): string {
  const cardsView = buildPlanSectionCardsHtml(plan, plannedRequests);
  const stamp = new Date(plan?.createdAt || Date.now()).toLocaleString();
  const appIdRefs = Array.isArray(plan?.appIdRefs) ? plan.appIdRefs : [];
  const appIdSection = appIdRefs.length
    ? `<details class="plan-confirm-appids"><summary>関連アプリID一覧（${appIdRefs.length}件）— ルックアップ等の参照先を確認</summary>${renderAppIdConfirmSection(appIdRefs)}</details>`
    : '';
  return `<div class="plan-confirm-panel">
    <div class="plan-confirm-head">
      <div class="plan-confirm-head__title">実行前プラン確認</div>
      <div class="plan-confirm-head__meta">予定リクエスト ${plan?.totalReq || 0} 件 ／ ${esc(stamp)}${cardsView.remainingMetaHtml}</div>
    </div>
    ${renderPlanTargetLineHtml()}
    ${renderPlanRequestSummary(plan)}
    <div class="plan-delete-warning-slot" data-plan-delete-warning>${renderPlanDeleteWarningHtml(plan)}</div>
    ${appIdSection}
    <div class="plan-confirm-cards">${cardsView.cardsHtml || '<div class="muted">予定リクエストがありません</div>'}</div>
    <div class="plan-confirm-actions">
      <button type="button" class="btn-stage" data-stage="apply" data-act="applyPreview" title="このプランの内容で比較先プレビューへ反映します（チェックを入れたセクションは除外されます）">
        <span class="btn-stage__icon">🚀</span><span>このプランで反映する${cardsView.excludedCount > 0 ? `（${cardsView.remainingReq}/${cardsView.totalReqAll}件）` : ''}</span>
        <span class="btn-stage__shortcut">Ctrl+Shift+Enter</span>
      </button>
      <button type="button" class="btn sub" data-act="exportDryRunPlan" title="APIを実行せずプランをJSONで保存">ドライランJSONを保存</button>
      <button type="button" class="btn sub" data-act="exportReviewZip" title="プラン・差分HTML・パッチJSON・申請メタ情報を1つのZIPにまとめてレビュー依頼用に書き出します">📦 レビュー依頼ZIPを書き出す</button>
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

/**
 * レビュー依頼用ZIPを書き出す。
 * 同梱物:
 *   - plan.json   ドライランプラン（APIは送信されない、レビュー時に追跡可能なメタ情報付き）
 *   - diff.html   現在の差分一覧をHTML化（オフライン閲覧可能、ブラウザで開ける）
 *   - patch.json  差分のパッチJSON（レビュー後に他環境で再適用も可能）
 *   - meta.json   申請者・理由・参照番号・除外セクション・接続情報を集約
 *   - README.md   レビュアー向けの読み方ガイド
 * 申請者と申請理由は kusPrompt で都度入力する（レビュー文化の押しつけにならないよう必須化はしない）。
 */
export async function runExportReviewZip(): Promise<void> {
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
    setStatus('プランが古いためレビュー依頼ZIPの書き出し前に再生成します');
    await runPreviewApplyPlan();
  }
  const latest = state.lastApplyPlan;
  if (!latest || !Array.isArray(latest.plannedRequests) || !latest.plannedRequests.length) {
    throw new Error('レビュー依頼ZIPに同梱できる計画がありません。先に「実行前プラン確認」を実行してください。');
  }
  if (expectedSignature && latest.signature !== expectedSignature) {
    throw new Error('プランが現在の条件と一致しません。再度「実行前プラン確認」を実行してください。');
  }
  if (!Array.isArray(state.lastDiffRows) || !state.lastDiffRows.length) {
    throw new Error('レビュー依頼ZIPには差分データが必要です。先に「差分比較」を実行してください。');
  }

  const c = commonParams();
  const reason = (kusPrompt('レビュー依頼の理由・概要を入力してください（任意）\n例: 検証環境で確認済み、本番反映の承認をお願いします', '') || '').trim();
  const applicant = (kusPrompt('申請者名を入力してください（任意・空欄可）', '') || '').trim();
  const refNo = (kusPrompt('参照番号（チケット番号 等）を入力してください（任意・空欄可）', '') || '').trim();

  const excludedSectionKeys = Array.isArray(latest.excludedSectionKeys) ? latest.excludedSectionKeys.slice() : [];
  const excludedLabels = excludedSectionKeys.map((k: string) => SECTION_DEFS.find((d) => d.key === k)?.label || k);
  const includedRequests = latest.plannedRequests.filter((r: any) => !excludedSectionKeys.includes(String(r?.sectionKey || '')));

  const planPayload = {
    generatedAt: new Date().toISOString(),
    kind: 'reflect-review-bundle-plan',
    mode: latest.mode,
    target: { appId: c.target.appId, guestId: c.target.guestId || '', preview: true },
    source: { appId: c.source.appId, guestId: c.source.guestId || '' },
    totalRequests: includedRequests.length,
    excludedSectionKeys,
    excludedSectionLabels: excludedLabels,
    plannedRequests: includedRequests.map((r: any) => ({
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

  const meta = {
    generatedAt: new Date().toISOString(),
    kind: 'reflect-review-bundle',
    schemaVersion: 1,
    applicant,
    reason,
    referenceNumber: refNo,
    target: { appId: c.target.appId, guestId: c.target.guestId || '', preview: true },
    source: { appId: c.source.appId, guestId: c.source.guestId || '' },
    excludedSectionKeys,
    excludedSectionLabels: excludedLabels,
    totalPlannedRequests: includedRequests.length,
    diffRowCount: (state.lastDiffRows || []).filter((row: any) => row && !row._displayOnly).length
  };

  const exportRows = state.lastDiffRows;
  const scopes = [...new Set((exportRows || []).map((r: any) => r?.sectionKey).filter(Boolean))];
  const diffHtml = buildDiffHtml(state.lastSourceBundle, state.lastTargetBundle, exportRows, scopes, ui.ignoreKeys?.value || '', {
    fetchIssues: state.lastFetchIssues || [],
    exportMode: 'all',
    exportLabel: 'レビュー依頼一括（全件）',
    exportContentMode: 'diffOnly',
    exportContentLabel: '差分のみ',
    normalizationState: getDiffNormalizationPresetState()
  });
  const patchPayload = buildPatchPayload(exportRows, state.lastSourceBundle, state.lastTargetBundle);

  const sourceLabel = buildAppFilenameLabel(c.source.appId || 'src', extractAppNameFromBundle(state.lastSourceBundle));
  const targetLabel = buildAppFilenameLabel(c.target.appId || 'tgt', extractAppNameFromBundle(state.lastTargetBundle));
  const baseLabel = `${sourceLabel}_to_${targetLabel}`;
  const readme = [
    '# プレビュー反映 レビュー依頼パッケージ',
    '',
    `生成日時: ${meta.generatedAt}`,
    applicant ? `申請者: ${applicant}` : '',
    refNo ? `参照番号: ${refNo}` : '',
    reason ? `理由・概要:\n${reason}` : '',
    '',
    `比較元アプリ: ${meta.source.appId || '-'}${meta.source.guestId ? ` (guest ${meta.source.guestId})` : ''}`,
    `比較先アプリ: ${meta.target.appId || '-'}${meta.target.guestId ? ` (guest ${meta.target.guestId})` : ''} (preview)`,
    `予定リクエスト数: ${meta.totalPlannedRequests}`,
    `差分行数: ${meta.diffRowCount}`,
    excludedLabels.length ? `プラン画面で除外されたセクション: ${excludedLabels.join(', ')}` : '除外セクション: なし',
    '',
    '## 同梱ファイル',
    '- meta.json   ... 申請者・理由・参照番号・接続情報・除外セクションを集約',
    '- plan.json   ... ドライラン形式の予定リクエスト一覧（APIは未送信）',
    '- diff.html   ... 差分一覧（ブラウザで開けます）',
    '- patch.json  ... 差分のパッチJSON（同型のkintoneアプリへ再適用も可能）',
    '',
    '## レビュー手順の例',
    '1. diff.html をブラウザで開いて差分を確認します。',
    '2. plan.json の plannedRequests で実際に送信されるAPI内容を確認します。',
    '3. 問題なければ統合ツール上で「実行前プラン確認 → このプランで反映する」を実行してもらいます。',
    '',
    '※ このパッケージは「比較先プレビュー」への反映プランです。本番デプロイは kintone 管理画面から手動で行ってください。'
  ].filter(Boolean).join('\n');

  const JSZip: any = await loadJSZip();
  const zip = new JSZip();
  zip.file('meta.json', JSON.stringify(meta, null, 2));
  zip.file('plan.json', JSON.stringify(planPayload, null, 2));
  zip.file('diff.html', diffHtml);
  zip.file('patch.json', JSON.stringify(patchPayload, null, 2));
  zip.file('README.md', readme);

  const blob: Blob = await zip.generateAsync({ type: 'blob' });
  const filename = buildExportFilename('レビュー依頼パッケージ', 'zip', { appLabel: baseLabel });
  const doc = getToolDocument();
  const win = doc.defaultView || window;
  const url = win.URL.createObjectURL(blob);
  const a = doc.createElement('a');
  a.href = url;
  a.download = filename;
  doc.body.appendChild(a);
  a.click();
  doc.body.removeChild(a);
  setTimeout(() => { try { win.URL.revokeObjectURL(url); } catch (_e) { /* noop */ } }, 1000);

  setStatus(`レビュー依頼ZIPを保存しました: ${filename}（APIは送信していません）`);
}
