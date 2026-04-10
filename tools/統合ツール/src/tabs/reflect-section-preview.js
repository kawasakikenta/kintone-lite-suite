'use strict';

import { SECTION_DEFS } from '../constants.js';
import { deepClone, esc, downloadText, stableStringify } from '../utils.js';
import { state } from '../state.js';
import { apiGet, buildApiPrefix } from '../api.js';

/**
 * セクション汎用プレビューエディタ
 * fieldSettings 以外の全 PUT 対応セクションについて、
 * 比較元／比較先の JSON 差分を可視化し、比較先側を編集できる汎用エディタ。
 */

const PUT_SECTIONS = SECTION_DEFS.filter((d) => d.put && d.key !== 'fieldSettings');

/** セクションデータの主キー wrapper プロパティ */
const WRAPPER_MAP = {
  viewSettings: 'views',
  reportSettings: 'reports',
  actionSettings: 'actions',
  categories: 'categories',
  layoutSettings: 'layout',
  pluginSettings: 'plugins',
  appAcl: 'rights',
  fieldAcl: 'rights',
  recordPermissions: 'rights',
  notifications: 'notifications',
  perRecordNotifications: 'notifications',
  reminderNotifications: 'notifications'
};

/** map 型セクション（キー = 名前）のキー一覧 */
const MAP_SECTIONS = new Set(['viewSettings', 'reportSettings', 'actionSettings', 'categories']);

function isMapSection(key) { return MAP_SECTIONS.has(key); }

function unwrap(data, sectionKey) {
  const w = WRAPPER_MAP[sectionKey];
  if (w && data && typeof data === 'object' && Object.prototype.hasOwnProperty.call(data, w)) return data[w];
  return data;
}

function rewrap(items, sectionKey) {
  const w = WRAPPER_MAP[sectionKey];
  if (w) return { [w]: items };
  return items;
}

function deepEqual(a, b) {
  return stableStringify(a) === stableStringify(b);
}

function formatJson(v) {
  if (v === undefined || v === null) return '(なし)';
  return JSON.stringify(v, null, 2);
}

/** map 型セクションのアイテム単位差分 */
function computeMapDiff(beforeMap, afterMap) {
  const keys = new Set([...Object.keys(beforeMap || {}), ...Object.keys(afterMap || {})]);
  const rows = [];
  for (const key of keys) {
    const bf = (beforeMap || {})[key];
    const af = (afterMap || {})[key];
    if (!bf && af) rows.push({ key, status: 'added', before: null, after: af, changes: [] });
    else if (bf && !af) rows.push({ key, status: 'removed', before: bf, after: null, changes: [] });
    else {
      const bfKeys = new Set(Object.keys(bf || {}));
      const afKeys = new Set(Object.keys(af || {}));
      const allProps = new Set([...bfKeys, ...afKeys]);
      const changes = [];
      allProps.forEach((prop) => {
        if (!deepEqual((bf || {})[prop], (af || {})[prop])) {
          changes.push({ prop, before: (bf || {})[prop], after: (af || {})[prop] });
        }
      });
      rows.push({ key, status: changes.length ? 'modified' : 'unchanged', before: bf, after: af, changes });
    }
  }
  const order = { added: 0, removed: 1, modified: 2, unchanged: 3 };
  rows.sort((a, b) => order[a.status] - order[b.status]);
  return rows;
}

/** 配列型セクションの差分（要素単位） */
function computeArrayDiff(beforeArr, afterArr) {
  const bf = Array.isArray(beforeArr) ? beforeArr : [];
  const af = Array.isArray(afterArr) ? afterArr : [];
  const maxLen = Math.max(bf.length, af.length);
  const rows = [];
  for (let i = 0; i < maxLen; i++) {
    const bItem = i < bf.length ? bf[i] : undefined;
    const aItem = i < af.length ? af[i] : undefined;
    const key = `[${i}]`;
    if (bItem === undefined) rows.push({ key, status: 'added', before: null, after: aItem, changes: [] });
    else if (aItem === undefined) rows.push({ key, status: 'removed', before: bItem, after: null, changes: [] });
    else if (!deepEqual(bItem, aItem)) rows.push({ key, status: 'modified', before: bItem, after: aItem, changes: [] });
    else rows.push({ key, status: 'unchanged', before: bItem, after: aItem, changes: [] });
  }
  return rows;
}

/** セクションキーに応じた差分計算 */
function computeDiff(before, after, sectionKey) {
  const bData = unwrap(before, sectionKey);
  const aData = unwrap(after, sectionKey);
  if (isMapSection(sectionKey)) {
    return computeMapDiff(bData, aData);
  }
  if (Array.isArray(bData) || Array.isArray(aData)) {
    return computeArrayDiff(bData, aData);
  }
  // オブジェクト全体を1アイテムとして比較
  if (!deepEqual(bData, aData)) {
    return [{ key: '(root)', status: 'modified', before: bData, after: aData, changes: [] }];
  }
  return [{ key: '(root)', status: 'unchanged', before: bData, after: aData, changes: [] }];
}

/** アイテムの表示ラベル */
function itemLabel(row, sectionKey) {
  if (isMapSection(sectionKey)) return row.key;
  const item = row.after || row.before;
  if (item && typeof item === 'object') {
    return item.name || item.code || item.status || item.filterCond || row.key;
  }
  return row.key;
}

const STATUS_LABELS = { added: '追加', removed: '削除', modified: '変更', unchanged: '変更なし' };
const SUPPORTED_PREVIEW_SECTIONS = new Set(['viewSettings', 'layoutSettings', 'processSettings', 'notifications']);

function extractSectionData(bundle, sectionKey) {
  const sec = bundle?.sections?.[sectionKey];
  if (!sec || sec._fetchError) return null;
  return deepClone(sec);
}

function changedPropSet(row) {
  const out = new Set();
  if (Array.isArray(row?.changes) && row.changes.length) {
    row.changes.forEach((ch) => { if (ch?.prop) out.add(String(ch.prop)); });
    return out;
  }
  const bf = row?.before && typeof row.before === 'object' ? row.before : {};
  const af = row?.after && typeof row.after === 'object' ? row.after : {};
  const keys = new Set([...Object.keys(bf), ...Object.keys(af)]);
  keys.forEach((key) => {
    if (!deepEqual(bf[key], af[key])) out.add(key);
  });
  return out;
}

function normalizeText(v) {
  if (v === undefined || v === null || v === '') return '—';
  if (Array.isArray(v)) return v.length ? v.join(', ') : '—';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

function renderAdminCard(title, rows, options = {}) {
  const changed = options.changed || new Set();
  return `<section class="rpp-admin-card"><h4>${esc(title)}</h4><table class="rpp-admin-table"><tbody>${rows.map((row) => {
    const key = row?.key || '';
    const isChanged = changed.has(key);
    return `<tr class="${isChanged ? 'is-changed' : ''}"><th>${esc(row.label || key)}</th><td>${esc(normalizeText(row.value))}${isChanged ? ' <span class="rpp-mini-badge">差分</span>' : ''}</td></tr>`;
  }).join('')}</tbody></table></section>`;
}

function renderLayoutCard(layout) {
  const rows = Array.isArray(layout) ? layout : [];
  const body = rows.map((line, idx) => {
    const fields = Array.isArray(line?.fields) ? line.fields : [];
    const names = fields.map((f) => f?.code || f?.type || '-');
    return `<tr><td>${idx + 1}</td><td>${esc(line?.type || 'ROW')}</td><td>${esc(names.join(' / ') || '—')}</td></tr>`;
  }).join('');
  return `<section class="rpp-admin-card"><h4>レイアウト行</h4><table class="rpp-admin-table"><thead><tr><th>#</th><th>type</th><th>配置フィールド</th></tr></thead><tbody>${body || '<tr><td colspan="3">設定なし</td></tr>'}</tbody></table></section>`;
}

function renderProcessCard(process) {
  if (!process || typeof process !== 'object') return renderAdminCard('プロセス管理', [{ label: '状態', value: '設定なし' }]);
  const states = Array.isArray(process.states) ? process.states : [];
  const actions = Array.isArray(process.actions) ? process.actions : [];
  const stateRows = states.map((s) => `<tr><td>${esc(s?.name || '-')}</td><td>${esc(s?.assignee?.type || '-')}</td></tr>`).join('');
  const actionRows = actions.map((a) => `<tr><td>${esc(a?.name || '-')}</td><td>${esc(a?.from || '-')}</td><td>${esc(a?.to || '-')}</td></tr>`).join('');
  return `<section class="rpp-admin-card"><h4>プロセス管理</h4><table class="rpp-admin-table"><tbody><tr><th>有効化</th><td>${esc(normalizeText(process.enable))}</td></tr></tbody></table><h5>ステータス</h5><table class="rpp-admin-table"><thead><tr><th>状態名</th><th>担当者</th></tr></thead><tbody>${stateRows || '<tr><td colspan="2">設定なし</td></tr>'}</tbody></table><h5>アクション</h5><table class="rpp-admin-table"><thead><tr><th>アクション名</th><th>遷移元</th><th>遷移先</th></tr></thead><tbody>${actionRows || '<tr><td colspan="3">設定なし</td></tr>'}</tbody></table></section>`;
}

function renderNotificationsCard(notifications) {
  const list = Array.isArray(notifications) ? notifications : [];
  const rows = list.map((item, idx) => {
    const cond = item?.filterCond || item?.condition || '-';
    const recipients = Array.isArray(item?.recipients) ? item.recipients.map((r) => r?.entity?.code || r?.entity?.type || r?.code || '-').join(', ') : '-';
    return `<tr><td>${idx + 1}</td><td>${esc(cond)}</td><td>${esc(recipients)}</td></tr>`;
  }).join('');
  return `<section class="rpp-admin-card"><h4>通知設定</h4><table class="rpp-admin-table"><thead><tr><th>#</th><th>通知条件</th><th>通知先</th></tr></thead><tbody>${rows || '<tr><td colspan="3">設定なし</td></tr>'}</tbody></table></section>`;
}

function renderViewSettingsCard(view, row) {
  const changed = changedPropSet(row);
  const rows = [
    { key: 'name', label: 'ビュー名', value: view?.name },
    { key: 'type', label: '表示形式', value: view?.type },
    { key: 'index', label: '表示順', value: view?.index },
    { key: 'filterCond', label: '絞り込み条件', value: view?.filterCond },
    { key: 'sort', label: 'ソート', value: Array.isArray(view?.sort) ? view.sort.map((s) => `${s.field || '-'}:${s.order || '-'}`) : view?.sort }
  ];
  return `${renderAdminCard('ビュー設定', rows, { changed })}<section class="rpp-admin-card"><h4>表示カラム</h4><div class="rpp-chip-list">${(Array.isArray(view?.fields) ? view.fields : []).map((f) => `<span>${esc(f)}</span>`).join('') || '<span>設定なし</span>'}</div></section>`;
}

function renderAclCard(rights) {
  const list = Array.isArray(rights) ? rights : [];
  const body = list.map((r, idx) => `<tr><td>${idx + 1}</td><td>${esc(r?.entity?.code || r?.entity?.type || '-')}</td><td>${esc((r?.includeSubs ? '配下含む' : '単体'))}</td><td>${esc(normalizeText(r?.appEditable || r?.recordViewable || r?.editable || r?.viewable))}</td></tr>`).join('');
  return `<section class="rpp-admin-card"><h4>アクセス権</h4><table class="rpp-admin-table"><thead><tr><th>#</th><th>対象</th><th>範囲</th><th>許可</th></tr></thead><tbody>${body || '<tr><td colspan="4">設定なし</td></tr>'}</tbody></table></section>`;
}

const PREVIEW_ADAPTERS = {
  viewSettings: (val, row) => renderViewSettingsCard(val, row),
  layoutSettings: (val) => renderLayoutCard(val),
  processSettings: (val) => renderProcessCard(val),
  notifications: (val) => renderNotificationsCard(val),
  appAcl: (val) => renderAclCard(val?.rights || val),
  fieldAcl: (val) => renderAclCard(val?.rights || val),
  recordPermissions: (val) => renderAclCard(val?.rights || val)
};

export function initSectionPreviewEditor(ui, setStatus) {
  const root = ui.sectionPreviewEditor;
  if (!root) return;

  const st = {
    sectionKey: PUT_SECTIONS[0]?.key || '',
    before: null,
    after: null,
    view: 'diff',
    filter: 'all',
    undo: [],
    expanded: new Set(),
    modal: null,
    loaded: false
  };

  function pushUndo() {
    st.undo.push({ before: deepClone(st.before), after: deepClone(st.after), sectionKey: st.sectionKey });
    if (st.undo.length > 30) st.undo.shift();
  }

  function loadFromDiffBundles(options = {}) {
    const source = state.importedSourceBundle || state.lastSourceBundle;
    const target = state.importedTargetBundle || state.lastTargetBundle;
    if (!source && !target) return false;
    if (options.pushUndo && st.loaded) pushUndo();
    st.before = extractSectionData(source, st.sectionKey);
    st.after = extractSectionData(target, st.sectionKey);
    st.filter = 'all';
    st.expanded = new Set();
    st.loaded = true;
    const diff = computeDiff(st.before, st.after, st.sectionKey);
    diff.filter((r) => r.status !== 'unchanged').slice(0, 6).forEach((r) => st.expanded.add(r.key));
    if (!options.silent) {
      const label = SECTION_DEFS.find((d) => d.key === st.sectionKey)?.label || st.sectionKey;
      setStatus(`${label} を差分比較バンドルから読込しました`);
    }
    return true;
  }

  function closeModal() { st.modal = null; }

  function renderModal() {
    if (!st.modal) return '';
    if (st.modal.kind === 'itemJson') {
      return `<div class="rpp-modal-backdrop" data-spe-modal-act="cancel"><div class="rpp-modal rpp-modal-wide"><div class="rpp-modal-head">${esc(st.modal.title)}</div><div class="rpp-modal-body"><textarea class="rpp-modal-textarea" data-spe-modal-input="itemJson">${esc(st.modal.text || '')}</textarea>${st.modal.error ? `<div class="rpp-modal-error">${esc(st.modal.error)}</div>` : ''}</div><div class="rpp-modal-actions"><button type="button" class="btn sub" data-spe-modal-act="cancel">キャンセル</button><button type="button" class="btn ok" data-spe-modal-act="saveItemJson">保存</button></div></div></div>`;
    }
    if (st.modal.kind === 'fullJson') {
      return `<div class="rpp-modal-backdrop" data-spe-modal-act="cancel"><div class="rpp-modal rpp-modal-wide"><div class="rpp-modal-head">${esc(st.modal.title)}</div><div class="rpp-modal-body rpp-modal-grid"><div><div class="rpp-modal-label">比較元（読み取り専用）</div><textarea class="rpp-modal-textarea" readonly style="background:#f1f5f9;color:#64748b">${esc(st.modal.beforeText || '')}</textarea></div><div><div class="rpp-modal-label">比較先（編集可）</div><textarea class="rpp-modal-textarea" data-spe-modal-input="afterJson">${esc(st.modal.afterText || '')}</textarea></div>${st.modal.error ? `<div class="rpp-modal-error rpp-modal-error-full">${esc(st.modal.error)}</div>` : ''}</div><div class="rpp-modal-actions"><button type="button" class="btn sub" data-spe-modal-act="cancel">キャンセル</button><button type="button" class="btn ok" data-spe-modal-act="saveFullJson">適用</button></div></div></div>`;
    }
    if (st.modal.kind === 'confirm') {
      return `<div class="rpp-modal-backdrop" data-spe-modal-act="cancel"><div class="rpp-modal"><div class="rpp-modal-head">${esc(st.modal.title)}</div><div class="rpp-modal-body"><p class="rpp-modal-confirm">${esc(st.modal.message)}</p></div><div class="rpp-modal-actions"><button type="button" class="btn sub" data-spe-modal-act="cancel">キャンセル</button><button type="button" class="btn ok" data-spe-modal-act="confirmAction">実行</button></div></div></div>`;
    }
    if (st.modal.kind === 'addItem') {
      return `<div class="rpp-modal-backdrop" data-spe-modal-act="cancel"><div class="rpp-modal"><div class="rpp-modal-head">${esc(st.modal.title)}</div><div class="rpp-modal-body"><label class="rpp-field-row" style="margin-bottom:8px"><span>キー名</span><input type="text" data-spe-modal-input="newKey" value="${esc(st.modal.newKey || '')}" style="min-height:36px;border:1px solid #cbd5e1;border-radius:8px;padding:0 10px;font-size:13px"></label><textarea class="rpp-modal-textarea" data-spe-modal-input="newItemJson">${esc(st.modal.text || '{}')}</textarea>${st.modal.error ? `<div class="rpp-modal-error">${esc(st.modal.error)}</div>` : ''}</div><div class="rpp-modal-actions"><button type="button" class="btn sub" data-spe-modal-act="cancel">キャンセル</button><button type="button" class="btn ok" data-spe-modal-act="saveAddItem">追加</button></div></div></div>`;
    }
    return '';
  }

  function renderDiffBody(row) {
    if (row.status === 'modified' && row.changes.length) {
      return `<table class="rpp-table"><thead><tr><th>プロパティ</th><th>比較元</th><th>比較先</th></tr></thead><tbody>${row.changes.map((ch) => `<tr><td>${esc(ch.prop)}</td><td><pre>${esc(formatJson(ch.before))}</pre></td><td><pre>${esc(formatJson(ch.after))}</pre></td></tr>`).join('')}</tbody></table>`;
    }
    if (row.status === 'modified') {
      return `<div class="rpp-preview-grid"><div><div class="rpp-preview-head">比較元</div><div class="rpp-preview-body"><pre class="rpp-pre">${esc(formatJson(row.before))}</pre></div></div><div><div class="rpp-preview-head">比較先</div><div class="rpp-preview-body"><pre class="rpp-pre">${esc(formatJson(row.after))}</pre></div></div></div>`;
    }
    return `<pre class="rpp-pre">${esc(formatJson(row.after || row.before))}</pre>`;
  }

  function renderPreviewBody(row) {
    const adapter = PREVIEW_ADAPTERS[st.sectionKey];
    if (!adapter || !SUPPORTED_PREVIEW_SECTIONS.has(st.sectionKey)) return renderDiffBody(row);
    const beforeHtml = adapter(row.before, row);
    const afterHtml = adapter(row.after, row);
    return `<div class="rpp-preview-grid"><div><div class="rpp-preview-head">比較元</div><div class="rpp-preview-body rpp-preview-admin">${beforeHtml}</div></div><div><div class="rpp-preview-head">比較先</div><div class="rpp-preview-body rpp-preview-admin">${afterHtml}</div></div></div>`;
  }

  function render() {
    if (!st.loaded) {
      root.innerHTML = `<div class="spe-empty"><p>差分比較のバンドルデータがありません。</p><p>先に「差分比較」を実行するか、下のボタンから読込してください。</p><div class="spe-empty-actions"><button type="button" class="btn ok" data-spe-act="loadDiff">差分比較から読込</button></div></div>`;
      return;
    }

    const diff = computeDiff(st.before, st.after, st.sectionKey);
    const rows = st.filter === 'all' ? diff : diff.filter((r) => r.status === st.filter);
    const stats = { added: 0, removed: 0, modified: 0, unchanged: 0 };
    diff.forEach((d) => { stats[d.status] += 1; });
    const sectionLabel = SECTION_DEFS.find((d) => d.key === st.sectionKey)?.label || st.sectionKey;
    const isMap = isMapSection(st.sectionKey);

    root.innerHTML = `
      <div class="rpp-toolbar">
        <select class="spe-section-select" data-spe-act="changeSection">
          ${PUT_SECTIONS.map((d) => `<option value="${esc(d.key)}" ${d.key === st.sectionKey ? 'selected' : ''}>${esc(d.label)}</option>`).join('')}
        </select>
        <button type="button" class="btn sub" data-spe-act="loadDiff">差分読込</button>
        <button type="button" class="btn sub" data-spe-act="undo" ${st.undo.length ? '' : 'disabled'}>↩ 戻す</button>
        ${isMap ? `<button type="button" class="btn sub" data-spe-act="addItem">＋ 追加</button>` : ''}
        <button type="button" class="btn sub" data-spe-act="editFullJson">JSON編集</button>
        <button type="button" class="btn sub" data-spe-act="export">JSON保存</button>
        <span class="rpp-spacer"></span>
        <button type="button" class="btn ${st.view === 'diff' ? 'ok' : 'sub'}" data-spe-act="viewDiff">差分</button>
        <button type="button" class="btn ${st.view === 'preview' ? 'ok' : 'sub'}" data-spe-act="viewPreview">プレビュー</button>
      </div>
      <div class="rpp-filters">
        ${['all', 'added', 'removed', 'modified', 'unchanged'].map((k) => `<button type="button" class="btn sub ${st.filter === k ? 'is-active' : ''}" data-spe-act="filter" data-filter="${k}">${k === 'all' ? `すべて` : STATUS_LABELS[k]} <span>${k === 'all' ? diff.length : stats[k]}</span></button>`).join('')}
      </div>
      <div class="rpp-list">
        ${rows.map((row) => {
          const opened = st.expanded.has(row.key);
          const label = itemLabel(row, st.sectionKey);
          const canEdit = row.after != null;
          const canRestore = row.after == null && row.before != null;
          const canDelete = row.after != null && isMap;
          return `<div class="rpp-card"><div class="rpp-head"><button type="button" class="rpp-open" data-spe-act="toggle" data-key="${esc(row.key)}">${opened ? '▾' : '▸'}</button><span class="rpp-badge rpp-${row.status}">${STATUS_LABELS[row.status]}</span><strong>${esc(label)}</strong><code>${esc(row.key)}</code><span class="rpp-spacer"></span>${canEdit ? `<button type="button" class="btn sub" data-spe-act="editItem" data-key="${esc(row.key)}">編集</button>` : ''}${canDelete ? `<button type="button" class="btn sub" data-spe-act="deleteItem" data-key="${esc(row.key)}">削除</button>` : ''}${canRestore ? `<button type="button" class="btn sub" data-spe-act="restoreItem" data-key="${esc(row.key)}">復元</button>` : ''}</div>${opened ? `<div class="rpp-body">${st.view === 'preview' ? renderPreviewBody(row) : renderDiffBody(row)}</div>` : ''}</div>`;
        }).join('') || '<div class="muted" style="padding:12px">差分がありません（同一の内容です）</div>'}
      </div>
      ${renderModal()}`;
  }

  function getAfterItems() {
    return unwrap(st.after, st.sectionKey);
  }

  function setAfterItems(items) {
    st.after = rewrap(items, st.sectionKey);
  }

  // --- Event: click ---
  root.addEventListener('click', (ev) => {
    const insideModalContent = ev.target.closest('.rpp-modal');
    const rawModalEl = ev.target.closest('[data-spe-modal-act]');
    const modalEl = (insideModalContent && rawModalEl && !insideModalContent.contains(rawModalEl)) ? null : rawModalEl;
    if (st.modal && !modalEl && insideModalContent) return;
    const modalAct = modalEl?.dataset.speModalAct;

    if (modalAct) {
      try {
        if (modalAct === 'cancel') { closeModal(); render(); return; }

        if (modalAct === 'saveItemJson' && st.modal?.kind === 'itemJson') {
          const raw = root.querySelector('[data-spe-modal-input="itemJson"]')?.value || '';
          const parsed = JSON.parse(raw);
          pushUndo();
          if (isMapSection(st.sectionKey)) {
            const items = deepClone(getAfterItems() || {});
            items[st.modal.itemKey] = parsed;
            setAfterItems(items);
          } else if (Array.isArray(getAfterItems())) {
            const arr = deepClone(getAfterItems());
            const idx = parseInt(st.modal.itemKey.replace(/[\[\]]/g, ''), 10);
            if (idx >= 0 && idx < arr.length) arr[idx] = parsed;
            setAfterItems(arr);
          } else {
            st.after = deepClone(parsed);
          }
          closeModal();
          setStatus(`${st.modal.itemKey} を更新しました`);
          render();
          return;
        }

        if (modalAct === 'saveFullJson' && st.modal?.kind === 'fullJson') {
          const raw = root.querySelector('[data-spe-modal-input="afterJson"]')?.value || '';
          const parsed = JSON.parse(raw);
          pushUndo();
          st.after = deepClone(parsed);
          closeModal();
          setStatus('比較先 JSON を更新しました');
          render();
          return;
        }

        if (modalAct === 'confirmAction' && st.modal?.kind === 'confirm') {
          if (st.modal.mode === 'delete') {
            pushUndo();
            const items = deepClone(getAfterItems() || {});
            delete items[st.modal.payload.key];
            setAfterItems(items);
            setStatus(`${st.modal.payload.key} を削除しました`);
          }
          closeModal();
          render();
          return;
        }

        if (modalAct === 'saveAddItem' && st.modal?.kind === 'addItem') {
          const newKey = root.querySelector('[data-spe-modal-input="newKey"]')?.value?.trim();
          const raw = root.querySelector('[data-spe-modal-input="newItemJson"]')?.value || '';
          if (!newKey) throw new Error('キー名を入力してください');
          const parsed = JSON.parse(raw);
          const items = deepClone(getAfterItems() || {});
          if (items[newKey]) throw new Error(`"${newKey}" は既に存在します`);
          pushUndo();
          items[newKey] = parsed;
          setAfterItems(items);
          closeModal();
          setStatus(`${newKey} を追加しました`);
          render();
          return;
        }
      } catch (e) {
        if (st.modal) { st.modal.error = e.message || String(e); render(); return; }
        setStatus(`セクションエディタエラー: ${e.message}`, true);
        return;
      }
    }

    const btn = ev.target.closest('[data-spe-act]');
    if (!btn) return;
    const act = btn.dataset.speAct;
    const key = btn.dataset.key || '';

    try {
      if (act === 'loadDiff') {
        if (!loadFromDiffBundles({ pushUndo: true })) throw new Error('先に差分比較を実行してください');
      } else if (act === 'undo') {
        if (!st.undo.length) return;
        const prev = st.undo.pop();
        st.before = prev.before;
        st.after = prev.after;
        if (prev.sectionKey) st.sectionKey = prev.sectionKey;
        setStatus('元に戻しました');
      } else if (act === 'filter') {
        st.filter = btn.dataset.filter || 'all';
      } else if (act === 'viewDiff') {
        st.view = 'diff';
      } else if (act === 'viewPreview') {
        st.view = 'preview';
      } else if (act === 'toggle') {
        if (st.expanded.has(key)) st.expanded.delete(key);
        else st.expanded.add(key);
      } else if (act === 'editItem') {
        const items = getAfterItems();
        let item;
        if (isMapSection(st.sectionKey)) {
          item = items?.[key];
        } else if (Array.isArray(items)) {
          const idx = parseInt(key.replace(/[\[\]]/g, ''), 10);
          item = items?.[idx];
        } else {
          item = st.after;
        }
        if (item == null) return;
        st.modal = { kind: 'itemJson', title: `${key} の編集`, itemKey: key, text: JSON.stringify(item, null, 2), error: '' };
      } else if (act === 'deleteItem') {
        st.modal = { kind: 'confirm', mode: 'delete', title: '削除の確認', message: `${key} を削除しますか？`, payload: { key } };
      } else if (act === 'restoreItem') {
        const bItems = unwrap(st.before, st.sectionKey);
        let restoreVal;
        if (isMapSection(st.sectionKey)) {
          restoreVal = bItems?.[key];
        } else if (Array.isArray(bItems)) {
          const idx = parseInt(key.replace(/[\[\]]/g, ''), 10);
          restoreVal = bItems?.[idx];
        }
        if (restoreVal == null) return;
        pushUndo();
        if (isMapSection(st.sectionKey)) {
          const items = deepClone(getAfterItems() || {});
          items[key] = deepClone(restoreVal);
          setAfterItems(items);
        } else if (Array.isArray(getAfterItems())) {
          const arr = deepClone(getAfterItems());
          const idx = parseInt(key.replace(/[\[\]]/g, ''), 10);
          arr.splice(idx, 0, deepClone(restoreVal));
          setAfterItems(arr);
        }
        setStatus(`${key} を復元しました`);
      } else if (act === 'addItem') {
        st.modal = { kind: 'addItem', title: 'アイテム追加', newKey: '', text: '{}', error: '' };
      } else if (act === 'editFullJson') {
        st.modal = {
          kind: 'fullJson',
          title: `${SECTION_DEFS.find((d) => d.key === st.sectionKey)?.label || st.sectionKey} - JSON編集`,
          beforeText: formatJson(st.before),
          afterText: formatJson(st.after),
          error: ''
        };
      } else if (act === 'export') {
        const label = SECTION_DEFS.find((d) => d.key === st.sectionKey)?.label || st.sectionKey;
        downloadText(`kintone-${st.sectionKey}-preview.json`, JSON.stringify(st.after, null, 2), 'application/json');
        setStatus(`${label} の比較先JSONを保存しました`);
      }
      render();
    } catch (e) {
      setStatus(`セクションエディタエラー: ${e.message || String(e)}`, true);
    }
  });

  // --- Event: change (section selector) ---
  root.addEventListener('change', (ev) => {
    const sel = ev.target.closest('[data-spe-act="changeSection"]');
    if (!sel) return;
    st.sectionKey = sel.value;
    st.filter = 'all';
    st.expanded = new Set();
    loadFromDiffBundles({ silent: true });
    render();
  });

  // 初期ロード
  loadFromDiffBundles({ silent: true });
  render();
}
