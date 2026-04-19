'use strict';

import { esc } from '../../utils.js';
import { createDefaultSectionRenderer } from './defaultRenderer.js';

function normalizeText(v) {
  if (v === undefined || v === null || v === '') return '—';
  if (Array.isArray(v)) return v.length ? v.join(', ') : '—';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

function changedPropSet(row, helpers) {
  const out = new Set();
  if (Array.isArray(row?.changes) && row.changes.length) {
    row.changes.forEach((ch) => { if (ch?.prop) out.add(String(ch.prop)); });
    return out;
  }
  const bf = row?.before && typeof row.before === 'object' ? row.before : {};
  const af = row?.after && typeof row.after === 'object' ? row.after : {};
  const keys = new Set([...Object.keys(bf), ...Object.keys(af)]);
  keys.forEach((key) => {
    if (!helpers.deepEqual(bf[key], af[key])) out.add(key);
  });
  return out;
}

function renderAdminCard(title, rows, options = {}) {
  const changed = options.changed || new Set();
  return `<section class="rpp-k-like-card"><h4 class="rpp-k-like-card-title">${esc(title)}</h4><table class="rpp-k-like-table"><tbody>${rows.map((row) => {
    const key = row?.key || '';
    const isChanged = changed.has(key);
    return `<tr class="${isChanged ? 'is-changed' : ''}"><th>${esc(row.label || key)}</th><td>${esc(normalizeText(row.value))}${isChanged ? ' <span class="rpp-k-like-badge">差分</span>' : ''}</td></tr>`;
  }).join('')}</tbody></table></section>`;
}

function renderViewSettingsCard(view, row, helpers) {
  const changed = changedPropSet(row, helpers);
  const rows = [
    { key: 'name', label: 'ビュー名', value: view?.name },
    { key: 'type', label: '表示形式', value: view?.type },
    { key: 'index', label: '表示順', value: view?.index },
    { key: 'filterCond', label: '絞り込み条件', value: view?.filterCond },
    { key: 'sort', label: 'ソート', value: Array.isArray(view?.sort) ? view.sort.map((s) => `${s.field || '-'}:${s.order || '-'}`) : view?.sort }
  ];
  return `${renderAdminCard('ビュー設定', rows, { changed })}<section class="rpp-k-like-card"><h4 class="rpp-k-like-card-title">表示カラム</h4><div class="rpp-chip-list">${(Array.isArray(view?.fields) ? view.fields : []).map((f) => `<span>${esc(f)}</span>`).join('') || '<span>設定なし</span>'}</div></section>`;
}

function renderLayoutCard(layout) {
  const rows = Array.isArray(layout) ? layout : [];
  const body = rows.map((line, idx) => {
    const fields = Array.isArray(line?.fields) ? line.fields : [];
    const names = fields.map((f) => f?.code || f?.type || '-');
    return `<tr><td>${idx + 1}</td><td>${esc(line?.type || 'ROW')}</td><td>${esc(names.join(' / ') || '—')}</td></tr>`;
  }).join('');
  return `<section class="rpp-k-like-card"><h4 class="rpp-k-like-card-title">レイアウト行</h4><table class="rpp-k-like-table"><thead><tr><th>#</th><th>種別</th><th>配置フィールド</th></tr></thead><tbody>${body || '<tr><td colspan="3">設定なし</td></tr>'}</tbody></table></section>`;
}

function renderProcessCard(process) {
  if (!process || typeof process !== 'object') return renderAdminCard('プロセス管理', [{ label: '状態', value: '設定なし' }]);
  const states = Array.isArray(process.states) ? process.states : [];
  const actions = Array.isArray(process.actions) ? process.actions : [];
  const stateRows = states.map((s) => `<tr><td>${esc(s?.name || '-')}</td><td>${esc(s?.assignee?.type || '-')}</td></tr>`).join('');
  const actionRows = actions.map((a) => `<tr><td>${esc(a?.name || '-')}</td><td>${esc(a?.from || '-')}</td><td>${esc(a?.to || '-')}</td></tr>`).join('');
  return `<section class="rpp-k-like-card"><h4 class="rpp-k-like-card-title">プロセス管理</h4><table class="rpp-k-like-table"><tbody><tr><th>有効化</th><td>${esc(normalizeText(process.enable))}</td></tr></tbody></table><h5 class="rpp-k-like-subtitle">ステータス</h5><table class="rpp-k-like-table"><thead><tr><th>状態名</th><th>担当者</th></tr></thead><tbody>${stateRows || '<tr><td colspan="2">設定なし</td></tr>'}</tbody></table><h5 class="rpp-k-like-subtitle">アクション</h5><table class="rpp-k-like-table"><thead><tr><th>アクション名</th><th>遷移元</th><th>遷移先</th></tr></thead><tbody>${actionRows || '<tr><td colspan="3">設定なし</td></tr>'}</tbody></table></section>`;
}

function renderNotificationsCard(notifications) {
  const list = Array.isArray(notifications) ? notifications : [];
  const rows = list.map((item, idx) => {
    const cond = item?.filterCond || item?.condition || '-';
    const recipients = Array.isArray(item?.recipients) ? item.recipients.map((r) => r?.entity?.code || r?.entity?.type || r?.code || '-').join(', ') : '-';
    return `<tr><td>${idx + 1}</td><td>${esc(cond)}</td><td>${esc(recipients)}</td></tr>`;
  }).join('');
  return `<section class="rpp-k-like-card"><h4 class="rpp-k-like-card-title">通知設定</h4><table class="rpp-k-like-table"><thead><tr><th>#</th><th>通知条件</th><th>通知先</th></tr></thead><tbody>${rows || '<tr><td colspan="3">設定なし</td></tr>'}</tbody></table></section>`;
}

function renderAclCard(rights) {
  const list = Array.isArray(rights) ? rights : [];
  const body = list.map((r, idx) => `<tr><td>${idx + 1}</td><td>${esc(r?.entity?.code || r?.entity?.type || '-')}</td><td>${esc((r?.includeSubs ? '配下含む' : '単体'))}</td><td>${esc(normalizeText(r?.appEditable || r?.recordViewable || r?.editable || r?.viewable))}</td></tr>`).join('');
  return `<section class="rpp-k-like-card"><h4 class="rpp-k-like-card-title">アクセス権</h4><table class="rpp-k-like-table"><thead><tr><th>#</th><th>対象</th><th>範囲</th><th>許可</th></tr></thead><tbody>${body || '<tr><td colspan="4">設定なし</td></tr>'}</tbody></table></section>`;
}

const PREVIEW_ADAPTERS = {
  viewSettings: (val, row, helpers) => renderViewSettingsCard(val, row, helpers),
  layoutSettings: (val) => renderLayoutCard(val),
  processSettings: (val) => renderProcessCard(val),
  notifications: (val) => renderNotificationsCard(val),
  appAcl: (val) => renderAclCard(val?.rights || val),
  fieldAcl: (val) => renderAclCard(val?.rights || val),
  recordPermissions: (val) => renderAclCard(val?.rights || val)
};

export function createAdminSectionRenderer() {
  const fallback = createDefaultSectionRenderer();

  function renderPreview({ row, sectionKey, helpers }) {
    const adapter = PREVIEW_ADAPTERS[sectionKey];
    if (!adapter) return fallback.renderPreview({ row, helpers, sectionKey });
    const beforeHtml = adapter(row.before, row, helpers);
    const afterHtml = adapter(row.after, row, helpers);
    return `<div class="rpp-k-like-compare"><div><div class="rpp-k-like-head">比較元</div><div class="rpp-k-like-body">${beforeHtml}</div></div><div><div class="rpp-k-like-head">比較先</div><div class="rpp-k-like-body">${afterHtml}</div></div></div>`;
  }

  return { renderDiff: fallback.renderDiff, renderPreview };
}
