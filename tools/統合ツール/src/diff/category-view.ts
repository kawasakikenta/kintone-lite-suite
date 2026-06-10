'use strict';

/**
 * 差分結果の「セクション別ビュー」レンダラー。
 *
 * 既存の「行一覧」表示はパス/種別/値の機械的な diff 表示で、フィールド以外
 * （権限/プロセス/通知/ビュー/レイアウト/JS-CSS/アプリ設定/カテゴリ）が
 * 直感的に読み取れないという課題があった。本モジュールはセクションを
 * 9 カテゴリに束ね、各カテゴリ向けの可視化（マトリクス・カード・図）で
 * 差分を提示する。
 *
 * 入口は {@link buildCategoryViewHtml}。`state.lastSourceBundle` /
 * `state.lastTargetBundle` と enriched diff rows を入力に取り、ビュー全体の
 * HTML 文字列を返す。
 */

import { esc, renderSectionIconHtml, extractAppNameFromBundle } from '../utils.js';
import { state } from '../state.js';
import { labelOfProp, labelOfValue, formatEntityText } from './label-dict.js';
import { decodeRow, isSemanticSection } from './path-decoder.js';

// ---------------------------------------------------------------------------
// Category definitions
// ---------------------------------------------------------------------------

export interface DiffCategoryDef {
  key: string;
  label: string;
  hint: string;
  sections: string[];
  icon: string;
}

export const DIFF_CATEGORIES: ReadonlyArray<DiffCategoryDef> = [
  { key: 'fields',    label: 'フィールド',       hint: 'フィールド定義の追加・変更',           sections: ['fieldSettings'], icon: '🔤' },
  { key: 'layout',    label: 'レイアウト',       hint: 'フォーム配置の差分',                   sections: ['layoutSettings'], icon: '🧩' },
  { key: 'views',     label: 'ビュー・グラフ',   hint: '一覧表示とレポート',                   sections: ['viewSettings', 'reportSettings'], icon: '📊' },
  { key: 'process',   label: 'プロセス・アクション', hint: 'ステータス遷移とアクション',        sections: ['processSettings', 'actionSettings'], icon: '🔁' },
  { key: 'notify',    label: '通知',             hint: '通知ルールとリマインダー',             sections: ['notifications', 'perRecordNotifications', 'reminderNotifications'], icon: '🔔' },
  { key: 'acl',       label: '権限',             hint: 'アプリ・フィールド・レコード権限',     sections: ['appAcl', 'fieldAcl', 'recordPermissions'], icon: '🔐' },
  { key: 'customize', label: 'JS/CSS・プラグイン', hint: 'カスタマイズと配布資産',              sections: ['customizeSettings', 'pluginSettings'], icon: '🧪' },
  { key: 'app',       label: 'アプリ設定',       hint: '基本情報・フォーム・カテゴリ',         sections: ['appSettings', 'appInfo', 'formSettings', 'categories'], icon: '⚙' }
];

const SECTION_TO_CATEGORY: Record<string, string> = (() => {
  const m: Record<string, string> = {};
  for (const cat of DIFF_CATEGORIES) for (const sec of cat.sections) m[sec] = cat.key;
  return m;
})();

export function getCategoryOfSection(sectionKey: string): string {
  return SECTION_TO_CATEGORY[sectionKey] || 'app';
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function countRowSummary(rows: any[]) {
  const s = { total: 0, added: 0, removed: 0, changed: 0, high: 0, medium: 0, low: 0 };
  for (const r of rows || []) {
    if (!r || r.type === 'same') continue;
    s.total += 1;
    if (r.type === 'added') s.added += 1;
    else if (r.type === 'removed') s.removed += 1;
    else if (r.type === 'changed') s.changed += 1;
    const sev = String(r.severity || 'low').toLowerCase();
    if (sev === 'high') s.high += 1;
    else if (sev === 'medium') s.medium += 1;
    else s.low += 1;
  }
  return s;
}

function diffBadge(s: ReturnType<typeof countRowSummary>): string {
  const items = [
    s.added ? `<span class="diff-cat-stat diff-cat-stat--add" title="追加">+${s.added}</span>` : '',
    s.removed ? `<span class="diff-cat-stat diff-cat-stat--rm" title="削除">−${s.removed}</span>` : '',
    s.changed ? `<span class="diff-cat-stat diff-cat-stat--chg" title="変更">~${s.changed}</span>` : '',
    s.high ? `<span class="diff-cat-stat diff-cat-stat--high" title="重要度高">⚠${s.high}</span>` : ''
  ].filter(Boolean).join('');
  return items;
}

function getRowsBySection(rows: any[]): Map<string, any[]> {
  const m = new Map<string, any[]>();
  for (const r of rows || []) {
    if (!r || r.type === 'same') continue;
    const k = r.sectionKey || '';
    if (!k) continue;
    if (!m.has(k)) m.set(k, []);
    m.get(k)!.push(r);
  }
  return m;
}

function getSection(bundle: any, key: string): any {
  return bundle?.sections?.[key];
}

function emptyState(message: string): string {
  return `<div class="diff-cat-empty">${esc(message)}</div>`;
}

function shortList(items: string[], max = 5): string {
  const list = (items || []).filter(Boolean);
  if (!list.length) return '<span class="diff-cat-muted">-</span>';
  const head = list.slice(0, max).map((x) => `<span class="diff-cat-tag">${esc(x)}</span>`).join('');
  const rest = list.length > max ? `<span class="diff-cat-tag diff-cat-tag--more">+${list.length - max}</span>` : '';
  return head + rest;
}

function statusLabel(present: { left: boolean; right: boolean }): { cls: string; label: string } {
  if (present.left && present.right) return { cls: 'diff-cat-status--chg', label: '変更' };
  if (!present.left && present.right) return { cls: 'diff-cat-status--add', label: '追加' };
  if (present.left && !present.right) return { cls: 'diff-cat-status--rm', label: '削除' };
  return { cls: 'diff-cat-status--same', label: '同一' };
}

function valueChanged(a: any, b: any): boolean {
  try {
    return JSON.stringify(a) !== JSON.stringify(b);
  } catch {
    return a !== b;
  }
}

function safeStringify(v: any): string {
  if (v === undefined) return '（未定義）';
  if (v == null) return '-';
  if (typeof v === 'string') return v;
  try { return JSON.stringify(v); } catch { return String(v); }
}

function diffWrap(left: any, right: any): { html: string; same: boolean } {
  const same = !valueChanged(left, right);
  if (same) {
    return { same, html: `<div class="diff-cat-same">${esc(safeStringify(left))}</div>` };
  }
  return {
    same,
    html: `<div class="diff-cat-prev"><span class="diff-cat-prev-tag">旧</span>${esc(safeStringify(left))}</div>
           <div class="diff-cat-next"><span class="diff-cat-next-tag">新</span>${esc(safeStringify(right))}</div>`
  };
}

// ---------------------------------------------------------------------------
// 変更サマリ生成 (Step 2: カード見出しに「宛先 +2/−1」等のチップを出す)
// ---------------------------------------------------------------------------

interface ChangedKeySpec {
  /** 'recipients' 'targets' のように配列を集合 diff 表示するキー */
  setKeys?: string[];
  /** スカラー / オブジェクトを「変更あり」とだけ示すキー */
  scalarKeys?: string[];
  /** 集合 diff における識別キー（既定では JSON.stringify） */
  identify?: (item: any) => string;
}

/**
 * src と tgt の差分を「キー名 → 説明文」のリストに変換する。
 * 配列キーは "+N/-M" 形式、スカラー/オブジェクトは "変更" 表示。
 */
function summarizeChangedKeys(src: any, tgt: any, spec: ChangedKeySpec): string[] {
  if (!src || !tgt) return [];
  const out: string[] = [];
  const identify = spec.identify || ((v: any) => { try { return JSON.stringify(v); } catch { return String(v); } });
  for (const k of (spec.setKeys || [])) {
    const a = Array.isArray(src[k]) ? src[k] : [];
    const b = Array.isArray(tgt[k]) ? tgt[k] : [];
    if (!a.length && !b.length) continue;
    const am = new Map<string, any>(a.map((x: any) => [identify(x), x]));
    const bm = new Map<string, any>(b.map((x: any) => [identify(x), x]));
    let added = 0;
    let removed = 0;
    for (const key of bm.keys()) if (!am.has(key)) added++;
    for (const key of am.keys()) if (!bm.has(key)) removed++;
    if (!added && !removed) continue;
    const parts: string[] = [];
    if (added) parts.push(`+${added}`);
    if (removed) parts.push(`−${removed}`);
    out.push(`${labelOfProp(k)} ${parts.join('/')}`);
  }
  for (const k of (spec.scalarKeys || [])) {
    if (!valueChanged(src[k], tgt[k])) continue;
    out.push(`${labelOfProp(k)}変更`);
  }
  return out;
}

function renderChangedSummaryChips(items: string[]): string {
  if (!items?.length) return '';
  return `<span class="diff-cat-changed-chips">` +
    items.map((x) => `<span class="diff-cat-changed-chip">${esc(x)}</span>`).join('') +
    `</span>`;
}

// ---------------------------------------------------------------------------
// 共通カード (Step 4: renderNotificationCard / renderViewCards / renderReportCards
// / renderActionSettings で重複していたカード構造を一本化)
// ---------------------------------------------------------------------------

interface DiffCardOpts {
  status: { cls: string; label: string };
  title: string;
  typeBadge?: string;
  changedSummary?: string[];
  bodyHtml: string;
  changedDetailHtml?: string;
  changedClass?: boolean;
}

function renderDiffCard(opts: DiffCardOpts): string {
  const chgCls = opts.changedClass ? ' diff-cat-card--chg' : '';
  const typeBadge = opts.typeBadge
    ? `<span class="diff-cat-tag diff-cat-tag--type">${esc(opts.typeBadge)}</span>`
    : '';
  const summaryHtml = renderChangedSummaryChips(opts.changedSummary || []);
  return `<div class="diff-cat-card${chgCls}">
    <header class="diff-cat-card-head">
      <span class="diff-cat-status ${opts.status.cls}">${esc(opts.status.label)}</span>
      <span class="diff-cat-card-title">${esc(opts.title)}</span>
      ${typeBadge}
      ${summaryHtml}
    </header>
    <div class="diff-cat-card-body">
      ${opts.bodyHtml}
      ${opts.changedDetailHtml || ''}
    </div>
  </div>`;
}

// ---------------------------------------------------------------------------
// Permissions (appAcl / fieldAcl / recordPermissions)
// ---------------------------------------------------------------------------

const APP_ACL_PERMISSIONS = [
  { key: 'appEditable', label: 'アプリ管理' },
  { key: 'recordViewable', label: '閲覧' },
  { key: 'recordAddable', label: '追加' },
  { key: 'recordEditable', label: '編集' },
  { key: 'recordDeletable', label: '削除' },
  { key: 'recordImportable', label: 'CSV読込' },
  { key: 'recordExportable', label: 'CSV書出' }
] as const;

const FIELD_ACL_LEVELS = ['NONE', 'READ', 'READ_WRITE'] as const;

function entityKey(entity: any): string {
  if (!entity) return '';
  return `${entity.type || ''}:${entity.code || entity.id || entity.login || ''}`;
}

function entityLabel(entity: any): string {
  if (!entity) return '-';
  const type = entity.type || '';
  const code = entity.code || entity.login || entity.id || '';
  const name = entity.name || '';
  const typeIcon = type === 'USER' ? '👤'
    : type === 'GROUP' ? '👥'
    : type === 'ORGANIZATION' ? '🏢'
    : type === 'CREATOR' ? '✏️'
    : type === 'FIELD_ENTITY' ? '🔗'
    : '·';
  return `${typeIcon} ${name || code || '(未設定)'}${code && name ? ` <span class="diff-cat-muted">${esc(code)}</span>` : ''}`;
}

function appAclRowsByEntity(rights: any[]): Map<string, any> {
  const m = new Map<string, any>();
  for (const r of rights || []) {
    const k = entityKey(r?.entity);
    if (!k) continue;
    m.set(k, r);
  }
  return m;
}

function renderAppAclMatrix(srcRights: any[], tgtRights: any[]): string {
  const sm = appAclRowsByEntity(srcRights);
  const tm = appAclRowsByEntity(tgtRights);
  const keys = new Set<string>([...sm.keys(), ...tm.keys()]);
  if (!keys.size) return emptyState('アプリ権限の設定がありません');

  const headerCells = APP_ACL_PERMISSIONS.map((p) => `<th title="${esc(p.label)}">${esc(p.label)}</th>`).join('');
  const rows: string[] = [];
  for (const key of keys) {
    const s = sm.get(key);
    const t = tm.get(key);
    const status = statusLabel({ left: !!s, right: !!t });
    const entity = (t || s)?.entity;
    const cells = APP_ACL_PERMISSIONS.map((p) => {
      const lv = !!s?.[p.key];
      const rv = !!t?.[p.key];
      const cls = !s || !t
        ? (rv ? 'diff-cat-cell--grant-new' : (lv ? 'diff-cat-cell--deny-new' : 'diff-cat-cell--off'))
        : (lv === rv ? (rv ? 'diff-cat-cell--on' : 'diff-cat-cell--off')
          : (rv ? 'diff-cat-cell--grant' : 'diff-cat-cell--deny'));
      const glyph = lv === rv ? (rv ? '●' : '○')
        : (rv ? '↑●' : '↓○');
      const title = `${p.label}: ${lv ? '許可' : '不許可'} → ${rv ? '許可' : '不許可'}`;
      return `<td class="diff-cat-cell ${cls}" title="${esc(title)}">${glyph}</td>`;
    }).join('');
    rows.push(`<tr>
      <td class="diff-cat-entity"><span class="diff-cat-status ${status.cls}">${esc(status.label)}</span></td>
      <td class="diff-cat-entity">${entityLabel(entity)}</td>
      ${cells}
      <td class="diff-cat-entity diff-cat-muted">${esc(t?.filterCond || s?.filterCond || '-')}</td>
    </tr>`);
  }
  return `<div class="diff-cat-table-wrap"><table class="diff-cat-matrix">
    <thead><tr>
      <th style="width:60px">状態</th>
      <th style="width:200px">対象</th>
      ${headerCells}
      <th style="min-width:140px">フィルタ条件</th>
    </tr></thead>
    <tbody>${rows.join('')}</tbody>
  </table></div>
  <div class="diff-cat-legend">
    <span><span class="diff-cat-cell diff-cat-cell--on diff-cat-legend-cell">●</span> 許可</span>
    <span><span class="diff-cat-cell diff-cat-cell--off diff-cat-legend-cell">○</span> 不許可</span>
    <span><span class="diff-cat-cell diff-cat-cell--grant diff-cat-legend-cell">↑●</span> 拡大</span>
    <span><span class="diff-cat-cell diff-cat-cell--deny diff-cat-legend-cell">↓○</span> 縮小</span>
  </div>`;
}

function fieldAclRowsByCode(rights: any[]): Map<string, any> {
  const m = new Map<string, any>();
  for (const r of rights || []) {
    const code = String(r?.code || '');
    if (!code) continue;
    m.set(code, r);
  }
  return m;
}

function renderFieldAclTable(srcRights: any[], tgtRights: any[]): string {
  const sm = fieldAclRowsByCode(srcRights);
  const tm = fieldAclRowsByCode(tgtRights);
  const codes = new Set<string>([...sm.keys(), ...tm.keys()]);
  if (!codes.size) return emptyState('フィールド権限の設定がありません');
  const rows: string[] = [];
  for (const code of codes) {
    const s = sm.get(code);
    const t = tm.get(code);
    const entries = new Map<string, { left: string; right: string }>();
    for (const e of s?.entities || []) {
      const k = entityKey(e?.entity);
      entries.set(k, { left: e?.accessibility || 'NONE', right: 'NONE' });
    }
    for (const e of t?.entities || []) {
      const k = entityKey(e?.entity);
      const cur = entries.get(k) || { left: 'NONE', right: 'NONE' };
      cur.right = e?.accessibility || 'NONE';
      entries.set(k, cur);
    }
    // 変更ありを先頭に並べ替え（Step 5: 変更箇所が探しやすく）
    const sorted = [...entries.entries()].sort((a, b) => {
      const ca = a[1].left !== a[1].right ? 0 : 1;
      const cb = b[1].left !== b[1].right ? 0 : 1;
      return ca - cb;
    });
    const changedCount = sorted.filter(([, v]) => v.left !== v.right).length;
    const entityHtml = sorted.map(([k, v]) => {
      const ent = (t?.entities || []).find((e: any) => entityKey(e?.entity) === k)?.entity
        || (s?.entities || []).find((e: any) => entityKey(e?.entity) === k)?.entity;
      const lvL = FIELD_ACL_LEVELS.indexOf(v.left as any);
      const lvR = FIELD_ACL_LEVELS.indexOf(v.right as any);
      const isChanged = v.left !== v.right;
      const cls = [
        lvR < lvL ? 'diff-cat-acl-down' : (lvR > lvL ? 'diff-cat-acl-up' : ''),
        isChanged ? 'diff-cat-acl-row--chg' : 'diff-cat-acl-row--same'
      ].filter(Boolean).join(' ');
      const leftDisp = labelOfValue('accessibility', v.left) || v.left;
      const rightDisp = labelOfValue('accessibility', v.right) || v.right;
      const arrow = isChanged ? ' → ' : '';
      const rightLabel = isChanged ? esc(rightDisp) : '';
      return `<div class="diff-cat-acl-row ${cls}">
        <span class="diff-cat-acl-entity">${entityLabel(ent)}</span>
        <span class="diff-cat-acl-level">${esc(leftDisp)}${arrow}${rightLabel}</span>
      </div>`;
    }).join('');
    const changeBadge = changedCount
      ? `<span class="diff-cat-changed-chip">変更 ${changedCount}</span>`
      : `<span class="diff-cat-tag diff-cat-tag--same">変更なし</span>`;
    rows.push(`<section class="diff-cat-acl-block">
      <header class="diff-cat-acl-header">
        <span class="diff-cat-tag">${esc(code)}</span>
        ${changeBadge}
        <span class="diff-cat-muted">${entries.size} 件のエンティティ</span>
      </header>
      ${entityHtml || emptyState('エンティティ設定なし')}
    </section>`);
  }
  return rows.join('');
}

function renderRecordPermissionMatrix(srcRights: any[], tgtRights: any[]): string {
  // recordPermissions は filterCond ごとに分かれた配列。entity × permission を表示。
  const list = (rights: any[]) => (rights || []).map((r, idx) => ({
    key: `${r?.filterCond || ''}:${idx}`,
    cond: r?.filterCond || '(条件なし)',
    rights: r
  }));
  const slist = list(srcRights);
  const tlist = list(tgtRights);
  const maxLen = Math.max(slist.length, tlist.length);
  if (!maxLen) return emptyState('レコード権限の設定がありません');
  const blocks: string[] = [];
  for (let i = 0; i < maxLen; i++) {
    const s = slist[i];
    const t = tlist[i];
    const cond = t?.cond || s?.cond || '-';
    const sEntities = s?.rights?.entities || [];
    const tEntities = t?.rights?.entities || [];
    const status = statusLabel({ left: !!s, right: !!t });
    const condChanged = !!s && !!t && s.cond !== t.cond;
    const matrix = renderAppAclMatrix(sEntities, tEntities);
    blocks.push(`<section class="diff-cat-acl-block">
      <header class="diff-cat-acl-header">
        <span class="diff-cat-status ${status.cls}">${esc(status.label)}</span>
        <span class="diff-cat-acl-condition">条件: <code>${esc(cond)}</code></span>
        ${condChanged ? `<span class="diff-cat-changed-chip">条件変更</span>` : ''}
      </header>
      ${matrix}
    </section>`);
  }
  return blocks.join('');
}

function renderAclCategory(src: any, tgt: any, rowsBySection: Map<string, any[]>): string {
  const blocks: string[] = [];
  const has = (k: string) => rowsBySection.has(k);

  if (has('appAcl') || getSection(src, 'appAcl') || getSection(tgt, 'appAcl')) {
    const srcRights = getSection(src, 'appAcl')?.rights || [];
    const tgtRights = getSection(tgt, 'appAcl')?.rights || [];
    blocks.push(`<section class="diff-cat-sec">
      <header class="diff-cat-sec-head">
        <span class="diff-cat-sec-icon">${renderSectionIconHtml('appAcl')}</span>
        <span class="diff-cat-sec-title">アプリ権限</span>
        <span class="diff-cat-sec-sub">エンティティ × 操作のマトリクス</span>
      </header>
      ${renderAppAclMatrix(srcRights, tgtRights)}
    </section>`);
  }

  if (has('fieldAcl') || getSection(src, 'fieldAcl') || getSection(tgt, 'fieldAcl')) {
    const srcRights = getSection(src, 'fieldAcl')?.rights || [];
    const tgtRights = getSection(tgt, 'fieldAcl')?.rights || [];
    blocks.push(`<section class="diff-cat-sec">
      <header class="diff-cat-sec-head">
        <span class="diff-cat-sec-icon">${renderSectionIconHtml('fieldAcl')}</span>
        <span class="diff-cat-sec-title">フィールド権限</span>
        <span class="diff-cat-sec-sub">NONE / READ / READ_WRITE の昇降</span>
      </header>
      ${renderFieldAclTable(srcRights, tgtRights)}
    </section>`);
  }

  if (has('recordPermissions') || getSection(src, 'recordPermissions') || getSection(tgt, 'recordPermissions')) {
    const srcRights = getSection(src, 'recordPermissions')?.rights || [];
    const tgtRights = getSection(tgt, 'recordPermissions')?.rights || [];
    blocks.push(`<section class="diff-cat-sec">
      <header class="diff-cat-sec-head">
        <span class="diff-cat-sec-icon">${renderSectionIconHtml('recordPermissions')}</span>
        <span class="diff-cat-sec-title">レコード権限</span>
        <span class="diff-cat-sec-sub">filterCond ごとに権限を比較</span>
      </header>
      ${renderRecordPermissionMatrix(srcRights, tgtRights)}
    </section>`);
  }

  return blocks.length ? blocks.join('') : emptyState('権限セクションのデータがありません');
}

// ---------------------------------------------------------------------------
// Process (processSettings / actionSettings)
// ---------------------------------------------------------------------------

function processStates(p: any): string[] {
  if (!p) return [];
  if (Array.isArray(p.states)) return p.states.map((s: any) => String(s?.name || s));
  if (p.states && typeof p.states === 'object') return Object.keys(p.states);
  return [];
}

function processActions(p: any): Array<{ name: string; from: string; to: string }> {
  if (!p || !Array.isArray(p.actions)) return [];
  return p.actions.map((a: any) => ({
    name: String(a?.name || ''),
    from: String(a?.from || ''),
    to: String(a?.to || '')
  }));
}

function renderProcessStates(src: string[], tgt: string[]): string {
  const all = new Set([...src, ...tgt]);
  if (!all.size) return emptyState('ステータスがありません');
  const chips = [...all].map((name) => {
    const inS = src.includes(name);
    const inT = tgt.includes(name);
    const cls = inS && inT ? 'diff-cat-state-same'
      : inT ? 'diff-cat-state-add' : 'diff-cat-state-rm';
    const icon = inS && inT ? '＝' : inT ? '＋' : '−';
    return `<span class="diff-cat-state ${cls}" title="${esc(name)}">${icon} ${esc(name)}</span>`;
  }).join('');
  return `<div class="diff-cat-state-row">${chips}</div>`;
}

function renderProcessActions(srcActs: Array<{ name: string; from: string; to: string }>, tgtActs: Array<{ name: string; from: string; to: string }>): string {
  const keyOf = (a: { name: string; from: string; to: string }) => `${a.from}→${a.to}|${a.name}`;
  const sm = new Map(srcActs.map((a) => [keyOf(a), a]));
  const tm = new Map(tgtActs.map((a) => [keyOf(a), a]));
  const keys = new Set([...sm.keys(), ...tm.keys()]);
  if (!keys.size) return emptyState('アクションがありません');
  const rows = [...keys].map((k) => {
    const s = sm.get(k);
    const t = tm.get(k);
    const status = statusLabel({ left: !!s, right: !!t });
    const ref = t || s!;
    return `<tr>
      <td><span class="diff-cat-status ${status.cls}">${esc(status.label)}</span></td>
      <td class="diff-cat-process-name">${esc(ref.name || '(無名)')}</td>
      <td><span class="diff-cat-tag">${esc(ref.from || '(未設定)')}</span></td>
      <td class="diff-cat-arrow">→</td>
      <td><span class="diff-cat-tag">${esc(ref.to || '(未設定)')}</span></td>
    </tr>`;
  }).join('');
  return `<div class="diff-cat-table-wrap"><table class="diff-cat-table">
    <thead><tr>
      <th style="width:60px">状態</th>
      <th>アクション名</th>
      <th>遷移元</th>
      <th></th>
      <th>遷移先</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table></div>`;
}

function renderProcessFlowDiagram(srcActs: Array<{ name: string; from: string; to: string }>, tgtActs: Array<{ name: string; from: string; to: string }>): string {
  // Mermaid なしで自前 SVG を描く。状態を縦に並べ、遷移を矢印で結ぶ。
  const states = new Set<string>();
  srcActs.forEach((a) => { states.add(a.from); states.add(a.to); });
  tgtActs.forEach((a) => { states.add(a.from); states.add(a.to); });
  const stateList = [...states].filter(Boolean);
  if (stateList.length < 2) return '';

  const W = 640;
  const colW = 220;
  const rowH = 56;
  const padY = 24;
  const H = padY * 2 + stateList.length * rowH;
  const stateY = (s: string) => padY + stateList.indexOf(s) * rowH + rowH / 2;

  const stateNodes = stateList.map((s) => {
    const y = stateY(s);
    return `<g><rect x="${(W - colW) / 2}" y="${y - 18}" width="${colW}" height="36" rx="18" fill="#eff6ff" stroke="#2563eb" stroke-width="1.5"/>
      <text x="${W / 2}" y="${y + 5}" text-anchor="middle" font-size="13" font-weight="700" fill="#0f172a">${esc(s)}</text></g>`;
  }).join('');

  const keyOf = (a: { name: string; from: string; to: string }) => `${a.from}→${a.to}|${a.name}`;
  const sm = new Map(srcActs.map((a) => [keyOf(a), a]));
  const tm = new Map(tgtActs.map((a) => [keyOf(a), a]));
  const allActs = new Set([...sm.keys(), ...tm.keys()]);
  let curve = 0;
  const arrows = [...allActs].map((k) => {
    const a = tm.get(k) || sm.get(k)!;
    if (!a.from || !a.to || a.from === a.to) return '';
    const y1 = stateY(a.from);
    const y2 = stateY(a.to);
    const x1 = W / 2 + colW / 2;
    const x2 = W / 2 + colW / 2;
    const off = 30 + (curve % 4) * 24;
    curve += 1;
    const cx = x1 + off;
    const inSrc = sm.has(k);
    const inTgt = tm.has(k);
    const color = inSrc && inTgt ? '#64748b' : inTgt ? '#16a34a' : '#dc2626';
    const dash = inSrc && inTgt ? '' : ' stroke-dasharray="5,3"';
    const labelY = (y1 + y2) / 2;
    return `<g>
      <path d="M${x1},${y1} Q${cx},${labelY} ${x2},${y2}" fill="none" stroke="${color}" stroke-width="1.8"${dash} marker-end="url(#diff-cat-arrow)"/>
      <text x="${cx + 6}" y="${labelY}" font-size="11" fill="${color}">${esc(a.name || '')}</text>
    </g>`;
  }).join('');

  return `<svg class="diff-cat-flow-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="プロセス遷移図">
    <defs>
      <marker id="diff-cat-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
        <path d="M0,0 L10,5 L0,10 z" fill="#475569"/>
      </marker>
    </defs>
    ${arrows}
    ${stateNodes}
  </svg>
  <div class="diff-cat-legend">
    <span><svg width="22" height="6"><line x1="0" y1="3" x2="22" y2="3" stroke="#64748b" stroke-width="2"/></svg> 不変</span>
    <span><svg width="22" height="6"><line x1="0" y1="3" x2="22" y2="3" stroke="#16a34a" stroke-width="2" stroke-dasharray="5,3"/></svg> 追加</span>
    <span><svg width="22" height="6"><line x1="0" y1="3" x2="22" y2="3" stroke="#dc2626" stroke-width="2" stroke-dasharray="5,3"/></svg> 削除</span>
  </div>`;
}

function renderActionSettings(src: any, tgt: any): string {
  const ss = Array.isArray(src?.actions) ? src.actions : (Array.isArray(src) ? src : []);
  const tt = Array.isArray(tgt?.actions) ? tgt.actions : (Array.isArray(tgt) ? tgt : []);
  const keyOf = (a: any) => `${a?.name || ''}|${a?.app || ''}`;
  const sm = new Map<string, any>(ss.map((a: any) => [keyOf(a), a]));
  const tm = new Map<string, any>(tt.map((a: any) => [keyOf(a), a]));
  const keys = new Set<string>([...sm.keys(), ...tm.keys()]);
  if (!keys.size) return emptyState('アクション設定がありません');
  const cards = [...keys].map((k) => {
    const s = sm.get(k);
    const t = tm.get(k);
    const ref: any = t || s;
    const status = statusLabel({ left: !!s, right: !!t });
    const targetApp = ref?.app?.app || ref?.app?.code || ref?.app || '-';
    const changedKeys = (s && t)
      ? summarizeChangedKeys(s, t, {
          setKeys: ['mappings'],
          scalarKeys: ['name', 'app']
        })
      : [];
    const bodyHtml = [
      `<div class="diff-cat-kv"><span class="diff-cat-k">対象アプリ</span><span class="diff-cat-v">${esc(String(targetApp))}</span></div>`,
      `<div class="diff-cat-kv"><span class="diff-cat-k">フィールド対応</span><span class="diff-cat-v">${esc(String(((ref?.mappings || []).length) + ' 件'))}</span></div>`
    ].join('');
    return renderDiffCard({
      status,
      title: ref?.name || '(無名アクション)',
      changedSummary: changedKeys,
      bodyHtml,
      changedClass: changedKeys.length > 0
    });
  }).join('');
  return `<div class="diff-cat-card-grid">${cards}</div>`;
}

function renderProcessCategory(src: any, tgt: any): string {
  const blocks: string[] = [];
  const sp = getSection(src, 'processSettings');
  const tp = getSection(tgt, 'processSettings');
  if (sp || tp) {
    const srcStates = processStates(sp);
    const tgtStates = processStates(tp);
    const srcActs = processActions(sp);
    const tgtActs = processActions(tp);
    const enableChanged = (sp?.enable ?? null) !== (tp?.enable ?? null);
    const enableBadge = enableChanged
      ? `<span class="diff-cat-tag diff-cat-tag--warn">プロセス有効化: ${sp?.enable ? '有' : '無'} → ${tp?.enable ? '有' : '無'}</span>`
      : `<span class="diff-cat-tag">プロセス有効化: ${tp?.enable ?? sp?.enable ? '有' : '無'}</span>`;
    blocks.push(`<section class="diff-cat-sec">
      <header class="diff-cat-sec-head">
        <span class="diff-cat-sec-icon">${renderSectionIconHtml('processSettings')}</span>
        <span class="diff-cat-sec-title">プロセス管理</span>
        <span class="diff-cat-sec-sub">ステータスとアクション</span>
      </header>
      <div class="diff-cat-process-meta">${enableBadge}</div>
      <h4 class="diff-cat-h4">ステータス一覧</h4>
      ${renderProcessStates(srcStates, tgtStates)}
      <h4 class="diff-cat-h4">アクション一覧</h4>
      ${renderProcessActions(srcActs, tgtActs)}
      <h4 class="diff-cat-h4">遷移図</h4>
      ${renderProcessFlowDiagram(srcActs, tgtActs)}
    </section>`);
  }

  const sa = getSection(src, 'actionSettings');
  const ta = getSection(tgt, 'actionSettings');
  if (sa || ta) {
    blocks.push(`<section class="diff-cat-sec">
      <header class="diff-cat-sec-head">
        <span class="diff-cat-sec-icon">${renderSectionIconHtml('actionSettings')}</span>
        <span class="diff-cat-sec-title">アクション設定</span>
        <span class="diff-cat-sec-sub">アプリ間アクション</span>
      </header>
      ${renderActionSettings(sa, ta)}
    </section>`);
  }
  return blocks.length ? blocks.join('') : emptyState('プロセス/アクション設定のデータがありません');
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

function notificationKey(n: any): string {
  // 大半の通知は完全一致での識別子がないため、内容ハッシュを使う。
  return JSON.stringify({
    cond: n?.filterCond || '',
    name: n?.name || '',
    when: n?.when || n?.event || '',
    timing: n?.timing || ''
  });
}

function recipientLabels(rule: any): string[] {
  const list = rule?.recipients || rule?.targets || [];
  return (Array.isArray(list) ? list : [])
    .map((r: any) => formatEntityText(r?.entity || r, { compact: true }))
    .filter(Boolean);
}

function recipientIdentity(r: any): string {
  const ent = r?.entity || r || {};
  return `${ent.type || ''}:${ent.code || ent.login || ent.id || ''}`;
}

function renderNotificationCard(s: any, t: any, status: { cls: string; label: string }): string {
  const rule = t || s;
  const recipients = recipientLabels(rule);
  const condition = rule?.filterCond || rule?.condition || '';
  const changedKeys = (s && t)
    ? summarizeChangedKeys(s, t, {
        setKeys: ['recipients', 'targets'],
        scalarKeys: ['filterCond', 'timing', 'when', 'name', 'title'],
        identify: recipientIdentity
      })
    : [];
  const bodyHtml = [
    condition ? `<div class="diff-cat-kv"><span class="diff-cat-k">条件</span><code class="diff-cat-code">${esc(condition)}</code></div>` : '',
    rule?.timing ? `<div class="diff-cat-kv"><span class="diff-cat-k">タイミング</span><span class="diff-cat-v">${esc(rule.timing)}</span></div>` : '',
    rule?.when ? `<div class="diff-cat-kv"><span class="diff-cat-k">トリガー</span><span class="diff-cat-v">${esc(rule.when)}</span></div>` : '',
    `<div class="diff-cat-kv"><span class="diff-cat-k">宛先</span><span class="diff-cat-v">${shortList(recipients, 8)}</span></div>`
  ].filter(Boolean).join('');
  return renderDiffCard({
    status,
    title: rule?.name || rule?.title || '(無名通知)',
    changedSummary: changedKeys,
    bodyHtml,
    changedClass: changedKeys.length > 0
  });
}

function renderNotificationGroup(label: string, srcRules: any[], tgtRules: any[]): string {
  const sm = new Map<string, any>();
  const tm = new Map<string, any>();
  (srcRules || []).forEach((r) => sm.set(notificationKey(r), r));
  (tgtRules || []).forEach((r) => tm.set(notificationKey(r), r));
  const keys = new Set<string>([...sm.keys(), ...tm.keys()]);
  if (!keys.size) return '';
  const cards = [...keys].map((k) => {
    const s = sm.get(k);
    const t = tm.get(k);
    const status = statusLabel({ left: !!s, right: !!t });
    return renderNotificationCard(s, t, status);
  }).join('');
  return `<section class="diff-cat-sec">
    <header class="diff-cat-sec-head">
      <span class="diff-cat-sec-title">${esc(label)}</span>
      <span class="diff-cat-sec-sub">${keys.size}件のルール</span>
    </header>
    <div class="diff-cat-card-grid">${cards}</div>
  </section>`;
}

function renderNotifyCategory(src: any, tgt: any): string {
  const blocks: string[] = [];
  const sn = getSection(src, 'notifications');
  const tn = getSection(tgt, 'notifications');
  const srcG = Array.isArray(sn?.notifications) ? sn.notifications : (Array.isArray(sn) ? sn : []);
  const tgtG = Array.isArray(tn?.notifications) ? tn.notifications : (Array.isArray(tn) ? tn : []);
  if (srcG.length || tgtG.length) blocks.push(renderNotificationGroup('一般通知', srcG, tgtG));

  const sp = getSection(src, 'perRecordNotifications');
  const tp = getSection(tgt, 'perRecordNotifications');
  const sPR = Array.isArray(sp?.notifications) ? sp.notifications : (Array.isArray(sp) ? sp : []);
  const tPR = Array.isArray(tp?.notifications) ? tp.notifications : (Array.isArray(tp) ? tp : []);
  if (sPR.length || tPR.length) blocks.push(renderNotificationGroup('レコード条件通知', sPR, tPR));

  const sr = getSection(src, 'reminderNotifications');
  const tr = getSection(tgt, 'reminderNotifications');
  const sRM = Array.isArray(sr?.notifications) ? sr.notifications : (Array.isArray(sr) ? sr : []);
  const tRM = Array.isArray(tr?.notifications) ? tr.notifications : (Array.isArray(tr) ? tr : []);
  if (sRM.length || tRM.length) blocks.push(renderNotificationGroup('リマインダー通知', sRM, tRM));

  if ((sr?.timezone || tr?.timezone) && sr?.timezone !== tr?.timezone) {
    blocks.push(`<section class="diff-cat-sec">
      <header class="diff-cat-sec-head">
        <span class="diff-cat-sec-title">タイムゾーン</span>
      </header>
      <div class="diff-cat-kv-row">
        <span class="diff-cat-tag">${esc(sr?.timezone || '-')}</span>
        <span class="diff-cat-arrow">→</span>
        <span class="diff-cat-tag">${esc(tr?.timezone || '-')}</span>
      </div>
    </section>`);
  }
  return blocks.length ? blocks.join('') : emptyState('通知設定のデータがありません');
}

// ---------------------------------------------------------------------------
// Views (viewSettings / reportSettings)
// ---------------------------------------------------------------------------

function renderViewCards(srcViews: any, tgtViews: any): string {
  const sm = srcViews && typeof srcViews === 'object' ? srcViews : {};
  const tm = tgtViews && typeof tgtViews === 'object' ? tgtViews : {};
  const keys = new Set<string>([...Object.keys(sm), ...Object.keys(tm)]);
  if (!keys.size) return emptyState('ビューがありません');
  const cards = [...keys].map((k) => {
    const s = sm[k];
    const t = tm[k];
    const ref = t || s;
    const status = statusLabel({ left: !!s, right: !!t });
    const changed = !!s && !!t && valueChanged(s, t);
    const typeRaw = ref?.type || 'LIST';
    const typeLabel = labelOfValue('view.type', typeRaw) || typeRaw;
    const fields: string[] = Array.isArray(ref?.fields)
      ? ref.fields.map((f: any) => (typeof f === 'object' ? (f?.code || f?.label || '') : String(f))).filter(Boolean)
      : (ref?.fields ? Object.keys(ref.fields) : []);
    const filter = ref?.filterCond || '';
    const sort = ref?.sort || '';
    const changedKeys = (s && t)
      ? summarizeChangedKeys(s, t, {
          setKeys: ['fields'],
          scalarKeys: ['name', 'type', 'filterCond', 'sort', 'index', 'paginationStyle']
        })
      : [];
    const bodyHtml = [
      `<div class="diff-cat-kv"><span class="diff-cat-k">表示項目</span><span class="diff-cat-v">${shortList(fields, 6)}</span></div>`,
      filter ? `<div class="diff-cat-kv"><span class="diff-cat-k">絞込</span><code class="diff-cat-code">${esc(filter)}</code></div>` : '',
      sort ? `<div class="diff-cat-kv"><span class="diff-cat-k">ソート</span><code class="diff-cat-code">${esc(sort)}</code></div>` : ''
    ].filter(Boolean).join('');
    return renderDiffCard({
      status,
      title: ref?.name || k,
      typeBadge: typeLabel,
      changedSummary: changedKeys,
      bodyHtml,
      changedDetailHtml: changed ? renderViewChangedDetail(s, t) : '',
      changedClass: changed
    });
  }).join('');
  return `<div class="diff-cat-card-grid">${cards}</div>`;
}

function renderViewChangedDetail(s: any, t: any): string {
  const checks: Array<{ key: string; valueScope?: string }> = [
    { key: 'name' },
    { key: 'type', valueScope: 'view.type' },
    { key: 'filterCond' },
    { key: 'sort' },
    { key: 'index' },
    { key: 'paginationStyle', valueScope: 'paginationStyle' }
  ];
  const items: string[] = [];
  for (const c of checks) {
    if (valueChanged(s?.[c.key], t?.[c.key])) {
      const oldRaw = s?.[c.key];
      const newRaw = t?.[c.key];
      const oldDisp = c.valueScope ? (labelOfValue(c.valueScope, oldRaw) || safeStringify(oldRaw)) : safeStringify(oldRaw);
      const newDisp = c.valueScope ? (labelOfValue(c.valueScope, newRaw) || safeStringify(newRaw)) : safeStringify(newRaw);
      items.push(`<li><span class="diff-cat-k">${esc(labelOfProp(c.key))}</span>: <span class="diff-cat-old">${esc(oldDisp)}</span> → <span class="diff-cat-new">${esc(newDisp)}</span></li>`);
    }
  }
  const sf = Array.isArray(s?.fields) ? s.fields : [];
  const tf = Array.isArray(t?.fields) ? t.fields : [];
  if (valueChanged(sf, tf)) {
    const keyOf = (x: any) => (typeof x === 'object' ? (x?.code || x?.label || JSON.stringify(x)) : String(x));
    const sCodes = sf.map(keyOf);
    const tCodes = tf.map(keyOf);
    const added = tCodes.filter((x: string) => !sCodes.includes(x));
    const removed = sCodes.filter((x: string) => !tCodes.includes(x));
    if (added.length || removed.length) {
      items.push(`<li><span class="diff-cat-k">表示項目</span>: ${added.length ? `<span class="diff-cat-new">+${added.length}件 (${added.slice(0, 3).map(esc).join(', ')}${added.length > 3 ? '…' : ''})</span>` : ''}${removed.length ? ` <span class="diff-cat-old">−${removed.length}件 (${removed.slice(0, 3).map(esc).join(', ')}${removed.length > 3 ? '…' : ''})</span>` : ''}</li>`);
    }
  }
  if (!items.length) return '';
  const openAttr = items.length >= 3 ? ' open' : '';
  return `<details class="diff-cat-changed-detail"${openAttr}><summary>変更詳細 (${items.length})</summary><ul>${items.join('')}</ul></details>`;
}

function renderReportCards(srcReports: any, tgtReports: any): string {
  const sm = srcReports && typeof srcReports === 'object' ? srcReports : {};
  const tm = tgtReports && typeof tgtReports === 'object' ? tgtReports : {};
  const keys = new Set<string>([...Object.keys(sm), ...Object.keys(tm)]);
  if (!keys.size) return emptyState('グラフ設定がありません');
  const cards = [...keys].map((k) => {
    const s = sm[k];
    const t = tm[k];
    const ref = t || s;
    const status = statusLabel({ left: !!s, right: !!t });
    const chartRaw = ref?.chartType || ref?.type || 'GRAPH';
    const chartLabel = labelOfValue('chart.type', chartRaw) || chartRaw;
    const changedKeys = (s && t)
      ? summarizeChangedKeys(s, t, {
          setKeys: ['groups', 'aggregations'],
          scalarKeys: ['name', 'chartType', 'chartMode', 'filterCond']
        })
      : [];
    const bodyHtml = [
      ref?.filterCond ? `<div class="diff-cat-kv"><span class="diff-cat-k">条件</span><code class="diff-cat-code">${esc(ref.filterCond)}</code></div>` : '',
      ref?.groups ? `<div class="diff-cat-kv"><span class="diff-cat-k">分類</span><span class="diff-cat-v">${shortList((ref.groups || []).map((g: any) => g?.code || g), 6)}</span></div>` : '',
      ref?.aggregations ? `<div class="diff-cat-kv"><span class="diff-cat-k">集計</span><span class="diff-cat-v">${shortList((ref.aggregations || []).map((a: any) => `${a?.type || ''}(${a?.code || '-'})`), 6)}</span></div>` : ''
    ].filter(Boolean).join('');
    return renderDiffCard({
      status,
      title: ref?.name || k,
      typeBadge: chartLabel,
      changedSummary: changedKeys,
      bodyHtml,
      changedClass: changedKeys.length > 0
    });
  }).join('');
  return `<div class="diff-cat-card-grid">${cards}</div>`;
}

function renderViewsCategory(src: any, tgt: any): string {
  const blocks: string[] = [];
  const sv = getSection(src, 'viewSettings');
  const tv = getSection(tgt, 'viewSettings');
  if (sv || tv) {
    const srcViews = sv?.views || sv;
    const tgtViews = tv?.views || tv;
    blocks.push(`<section class="diff-cat-sec">
      <header class="diff-cat-sec-head">
        <span class="diff-cat-sec-icon">${renderSectionIconHtml('viewSettings')}</span>
        <span class="diff-cat-sec-title">ビュー設定</span>
        <span class="diff-cat-sec-sub">一覧の表示項目・絞込・ソート</span>
      </header>
      ${renderViewCards(srcViews, tgtViews)}
    </section>`);
  }
  const sr = getSection(src, 'reportSettings');
  const tr = getSection(tgt, 'reportSettings');
  if (sr || tr) {
    const srcR = sr?.reports || sr;
    const tgtR = tr?.reports || tr;
    blocks.push(`<section class="diff-cat-sec">
      <header class="diff-cat-sec-head">
        <span class="diff-cat-sec-icon">${renderSectionIconHtml('reportSettings')}</span>
        <span class="diff-cat-sec-title">グラフ設定</span>
        <span class="diff-cat-sec-sub">レポートの種別・分類・集計</span>
      </header>
      ${renderReportCards(srcR, tgtR)}
    </section>`);
  }
  return blocks.length ? blocks.join('') : emptyState('ビュー/グラフのデータがありません');
}

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

function flatLayout(layout: any[]): Array<{ row: number; col: number; code: string; type: string; label?: string }> {
  if (!Array.isArray(layout)) return [];
  const out: Array<{ row: number; col: number; code: string; type: string; label?: string }> = [];
  layout.forEach((row, rIdx) => {
    if (row?.type === 'GROUP') {
      const groupCode = row.code || `_group${rIdx}`;
      out.push({ row: rIdx, col: 0, code: groupCode, type: 'GROUP', label: row.label });
      (row.layout || []).forEach((inner: any, riIdx: number) => {
        (inner?.fields || []).forEach((f: any, cIdx: number) => {
          out.push({ row: rIdx + 0.1 * (riIdx + 1), col: cIdx, code: f?.code || `_${f?.type}_${rIdx}_${riIdx}_${cIdx}`, type: f?.type || '', label: f?.label });
        });
      });
    } else {
      (row?.fields || []).forEach((f: any, cIdx: number) => {
        out.push({ row: rIdx, col: cIdx, code: f?.code || `_${f?.type}_${rIdx}_${cIdx}`, type: f?.type || '', label: f?.label });
      });
    }
  });
  return out;
}

function renderLayoutGrid(
  items: Array<{ row: number; col: number; code: string; type: string; label?: string }>,
  comparedCodes: Set<string>,
  movedCodes: Set<string>,
  mode: 'src' | 'tgt'
): string {
  if (!items.length) return emptyState('レイアウト未取得');
  // Group by row, sort by col
  const byRow = new Map<number, Array<typeof items[0]>>();
  for (const it of items) {
    if (!byRow.has(it.row)) byRow.set(it.row, []);
    byRow.get(it.row)!.push(it);
  }
  const rows = [...byRow.keys()].sort((a, b) => a - b);
  const rowsHtml = rows.map((r) => {
    const cells = byRow.get(r)!.sort((a, b) => a.col - b.col).map((c) => {
      const exists = comparedCodes.has(c.code);
      const moved = exists && movedCodes.has(c.code);
      const cls = c.type === 'GROUP' ? 'diff-cat-layout-group'
        : !exists ? (mode === 'tgt' ? 'diff-cat-layout-add' : 'diff-cat-layout-rm')
        : (moved ? 'diff-cat-layout-move' : 'diff-cat-layout-keep');
      const movedBadge = moved ? '<span class="diff-cat-layout-move-badge" aria-hidden="true">↕</span>' : '';
      const titleSuffix = !exists ? (mode === 'tgt' ? ' / 新規追加' : ' / 削除予定')
        : (moved ? ' / 位置移動' : '');
      return `<div class="diff-cat-layout-cell ${cls}" data-layout-code="${esc(c.code)}" data-layout-mode="${mode}" title="${esc(`${c.label || c.code} (${c.type})${titleSuffix}`)}">
        <span class="diff-cat-layout-code">${esc(c.code)}</span>
        <span class="diff-cat-layout-type">${esc(c.type || '-')}</span>
        ${movedBadge}
      </div>`;
    }).join('');
    return `<div class="diff-cat-layout-row">${cells}</div>`;
  }).join('');
  return `<div class="diff-cat-layout-grid">${rowsHtml}</div>`;
}

function renderLayoutCategory(src: any, tgt: any): string {
  const sl = getSection(src, 'layoutSettings');
  const tl = getSection(tgt, 'layoutSettings');
  const srcLayout = Array.isArray(sl?.layout) ? sl.layout : (Array.isArray(sl) ? sl : []);
  const tgtLayout = Array.isArray(tl?.layout) ? tl.layout : (Array.isArray(tl) ? tl : []);
  if (!srcLayout.length && !tgtLayout.length) return emptyState('レイアウト設定がありません');
  const flatS = flatLayout(srcLayout);
  const flatT = flatLayout(tgtLayout);
  const srcCodes = new Set(flatS.map((i) => i.code));
  const tgtCodes = new Set(flatT.map((i) => i.code));
  const onlyInSrc = flatS.filter((i) => !tgtCodes.has(i.code));
  const onlyInTgt = flatT.filter((i) => !srcCodes.has(i.code));
  // 両側に存在するコードのうち、row / col が変わっているものを「移動」として検出
  const srcByCode = new Map(flatS.map((i) => [i.code, i] as const));
  const movedCodes = new Set<string>();
  for (const item of flatT) {
    const s = srcByCode.get(item.code);
    if (!s) continue;
    if (s.row !== item.row || s.col !== item.col) movedCodes.add(item.code);
  }
  const changedTotal = onlyInSrc.length + onlyInTgt.length + movedCodes.size;
  const headSub = changedTotal
    ? `変更 ${changedTotal} 件（追加 ${onlyInTgt.length} / 削除 ${onlyInSrc.length} / 移動 ${movedCodes.size}）`
    : '行 × 列のフィールド配置';
  return `<section class="diff-cat-sec">
    <header class="diff-cat-sec-head">
      <span class="diff-cat-sec-icon">${renderSectionIconHtml('layoutSettings')}</span>
      <span class="diff-cat-sec-title">レイアウト</span>
      <span class="diff-cat-sec-sub">${esc(headSub)}</span>
    </header>
    <div class="diff-cat-layout-cmp">
      <div class="diff-cat-layout-side">
        <header class="diff-cat-side-head">比較元 (${flatS.length}項目)</header>
        ${renderLayoutGrid(flatS, tgtCodes, movedCodes, 'src')}
      </div>
      <div class="diff-cat-layout-side">
        <header class="diff-cat-side-head">比較先 (${flatT.length}項目)</header>
        ${renderLayoutGrid(flatT, srcCodes, movedCodes, 'tgt')}
      </div>
    </div>
    <div class="diff-cat-layout-summary">
      <span class="diff-cat-tag diff-cat-tag--rm">削除候補 ${onlyInSrc.length}</span>
      <span class="diff-cat-tag diff-cat-tag--add">新規 ${onlyInTgt.length}</span>
      ${movedCodes.size ? `<span class="diff-cat-tag diff-cat-tag--move">移動 ${movedCodes.size}</span>` : ''}
      <span class="diff-cat-tag">保持 ${flatT.length - onlyInTgt.length - movedCodes.size}</span>
    </div>
  </section>`;
}

// ---------------------------------------------------------------------------
// Customize (JS/CSS + plugins)
// ---------------------------------------------------------------------------

function listCustomizeFiles(side: any): Array<{ scope: string; type: string; url: string; name: string }> {
  const out: Array<{ scope: string; type: string; url: string; name: string }> = [];
  if (!side) return out;
  for (const scope of ['desktop', 'mobile']) {
    const sc = side[scope];
    if (!sc) continue;
    for (const t of ['js', 'css']) {
      const list = Array.isArray(sc[t]) ? sc[t] : [];
      list.forEach((item: any) => {
        const file = item?.file || item;
        out.push({
          scope,
          type: t.toUpperCase(),
          url: item?.url || file?.url || '',
          name: file?.name || item?.name || (item?.url ? String(item.url).split('/').pop() : '(不明)')
        });
      });
    }
  }
  return out;
}

function renderCustomizeCategory(src: any, tgt: any): string {
  const sc = getSection(src, 'customizeSettings');
  const tc = getSection(tgt, 'customizeSettings');
  const sFiles = listCustomizeFiles(sc);
  const tFiles = listCustomizeFiles(tc);
  const keyOf = (f: { scope: string; type: string; name: string }) => `${f.scope}/${f.type}/${f.name}`;
  const sm = new Map(sFiles.map((f) => [keyOf(f), f]));
  const tm = new Map(tFiles.map((f) => [keyOf(f), f]));
  const keys = new Set<string>([...sm.keys(), ...tm.keys()]);

  let addedFiles = 0;
  let removedFiles = 0;
  const fileRows = [...keys].map((k) => {
    const s = sm.get(k);
    const t = tm.get(k);
    const status = statusLabel({ left: !!s, right: !!t });
    if (!s && t) addedFiles++;
    else if (s && !t) removedFiles++;
    const ref = t || s!;
    return `<tr>
      <td><span class="diff-cat-status ${status.cls}">${esc(status.label)}</span></td>
      <td><span class="diff-cat-tag">${esc(ref.scope)}</span></td>
      <td><span class="diff-cat-tag diff-cat-tag--type">${esc(ref.type)}</span></td>
      <td class="diff-cat-mono">${esc(ref.name)}</td>
    </tr>`;
  }).join('');

  let customizeBlock = '';
  if (keys.size) {
    const changedTotal = addedFiles + removedFiles;
    const headSub = changedTotal
      ? `変更 ${changedTotal} 件（追加 ${addedFiles} / 削除 ${removedFiles}）`
      : 'desktop / mobile × JS / CSS のファイル一覧';
    customizeBlock = `<section class="diff-cat-sec">
      <header class="diff-cat-sec-head">
        <span class="diff-cat-sec-icon">${renderSectionIconHtml('customizeSettings')}</span>
        <span class="diff-cat-sec-title">JS/CSS</span>
        <span class="diff-cat-sec-sub">${esc(headSub)}</span>
      </header>
      <div class="diff-cat-table-wrap"><table class="diff-cat-table">
        <thead><tr><th style="width:60px">状態</th><th style="width:80px">配置</th><th style="width:60px">種別</th><th>ファイル</th></tr></thead>
        <tbody>${fileRows}</tbody>
      </table></div>
    </section>`;
  }

  // Plugins
  const sp = getSection(src, 'pluginSettings');
  const tp = getSection(tgt, 'pluginSettings');
  const sPlugins: any[] = Array.isArray(sp?.plugins) ? sp.plugins : (Array.isArray(sp) ? sp : []);
  const tPlugins: any[] = Array.isArray(tp?.plugins) ? tp.plugins : (Array.isArray(tp) ? tp : []);
  let pluginBlock = '';
  if (sPlugins.length || tPlugins.length) {
    const sMap = new Map(sPlugins.map((p) => [String(p?.id || ''), p]));
    const tMap = new Map(tPlugins.map((p) => [String(p?.id || ''), p]));
    const allIds = new Set([...sMap.keys(), ...tMap.keys()]);
    let pAdded = 0, pRemoved = 0, pChanged = 0;
    for (const id of allIds) {
      const s = sMap.get(id);
      const t = tMap.get(id);
      if (!s && t) pAdded++;
      else if (s && !t) pRemoved++;
      else if (s && t && valueChanged(s, t)) pChanged++;
    }
    const rows = [...allIds].map((id) => {
      const s = sMap.get(id);
      const t = tMap.get(id);
      const ref = t || s;
      const status = statusLabel({ left: !!s, right: !!t });
      const vL = s?.version || '';
      const vR = t?.version || '';
      const vChanged = vL && vR && vL !== vR;
      const summaryHtml = (s && t && !vChanged && valueChanged(s, t))
        ? renderChangedSummaryChips(['設定変更'])
        : '';
      return `<tr>
        <td><span class="diff-cat-status ${status.cls}">${esc(status.label)}</span></td>
        <td class="diff-cat-mono">${esc(id)}</td>
        <td>${esc(ref?.name || '-')}${summaryHtml}</td>
        <td>${vChanged ? `<span class="diff-cat-old">${esc(vL)}</span> → <span class="diff-cat-new">${esc(vR)}</span>` : esc(vR || vL || '-')}</td>
      </tr>`;
    }).join('');
    const pTotal = pAdded + pRemoved + pChanged;
    const pSub = pTotal
      ? `変更 ${pTotal} 件（追加 ${pAdded} / 削除 ${pRemoved} / 更新 ${pChanged}）`
      : '有効化されたプラグイン一覧';
    pluginBlock = `<section class="diff-cat-sec">
      <header class="diff-cat-sec-head">
        <span class="diff-cat-sec-icon">${renderSectionIconHtml('pluginSettings')}</span>
        <span class="diff-cat-sec-title">プラグイン</span>
        <span class="diff-cat-sec-sub">${esc(pSub)}</span>
      </header>
      <div class="diff-cat-table-wrap"><table class="diff-cat-table">
        <thead><tr><th style="width:60px">状態</th><th>ID</th><th>名前</th><th>バージョン</th></tr></thead>
        <tbody>${rows}</tbody>
      </table></div>
    </section>`;
  }

  return (customizeBlock + pluginBlock) || emptyState('JS/CSS・プラグインのデータがありません');
}

// ---------------------------------------------------------------------------
// App settings (appSettings / appInfo / formSettings / categories)
// ---------------------------------------------------------------------------

function renderKvDiffTable(label: string, src: any, tgt: any): string {
  if (!src && !tgt) return '';
  const keys = new Set<string>([...Object.keys(src || {}), ...Object.keys(tgt || {})]);
  if (!keys.size) return '';
  const rows: string[] = [];
  for (const k of keys) {
    const a = src?.[k];
    const b = tgt?.[k];
    if (!valueChanged(a, b)) continue;
    const status = statusLabel({ left: a !== undefined, right: b !== undefined });
    rows.push(`<tr>
      <td><span class="diff-cat-status ${status.cls}">${esc(status.label)}</span></td>
      <td class="diff-cat-mono">${esc(k)}</td>
      <td class="diff-cat-old">${esc(safeStringify(a))}</td>
      <td class="diff-cat-arrow">→</td>
      <td class="diff-cat-new">${esc(safeStringify(b))}</td>
    </tr>`);
  }
  if (!rows.length) return '';
  return `<section class="diff-cat-sec">
    <header class="diff-cat-sec-head">
      <span class="diff-cat-sec-title">${esc(label)}</span>
      <span class="diff-cat-sec-sub">変更されたキーのみ表示 (${rows.length})</span>
    </header>
    <div class="diff-cat-table-wrap"><table class="diff-cat-table">
      <thead><tr><th style="width:60px">状態</th><th>キー</th><th>旧</th><th></th><th>新</th></tr></thead>
      <tbody>${rows.join('')}</tbody>
    </table></div>
  </section>`;
}

function renderCategoriesTree(src: any[], tgt: any[]): string {
  const sm = new Map<string, any>();
  const tm = new Map<string, any>();
  (src || []).forEach((c: any) => sm.set(String(c?.code || ''), c));
  (tgt || []).forEach((c: any) => tm.set(String(c?.code || ''), c));
  const keys = new Set([...sm.keys(), ...tm.keys()]);
  if (!keys.size) return emptyState('カテゴリ設定がありません');
  const items = [...keys].map((k) => {
    const s = sm.get(k);
    const t = tm.get(k);
    const status = statusLabel({ left: !!s, right: !!t });
    const ref = t || s;
    return `<li>
      <span class="diff-cat-status ${status.cls}">${esc(status.label)}</span>
      <span class="diff-cat-mono">${esc(k)}</span>
      <span>${esc(ref?.name || '-')}</span>
    </li>`;
  }).join('');
  return `<section class="diff-cat-sec">
    <header class="diff-cat-sec-head">
      <span class="diff-cat-sec-icon">${renderSectionIconHtml('categories')}</span>
      <span class="diff-cat-sec-title">カテゴリ</span>
      <span class="diff-cat-sec-sub">分類コードでマッチング</span>
    </header>
    <ul class="diff-cat-tree">${items}</ul>
  </section>`;
}

function renderAppSettingsCategory(src: any, tgt: any): string {
  const blocks: string[] = [];
  blocks.push(renderKvDiffTable('アプリ設定 (appSettings)', getSection(src, 'appSettings'), getSection(tgt, 'appSettings')));
  blocks.push(renderKvDiffTable('アプリ情報 (appInfo)', getSection(src, 'appInfo'), getSection(tgt, 'appInfo')));
  blocks.push(renderKvDiffTable('フォーム設定 (formSettings)', getSection(src, 'formSettings'), getSection(tgt, 'formSettings')));
  const sc = getSection(src, 'categories');
  const tc = getSection(tgt, 'categories');
  const sCats = Array.isArray(sc?.categories) ? sc.categories : (Array.isArray(sc) ? sc : []);
  const tCats = Array.isArray(tc?.categories) ? tc.categories : (Array.isArray(tc) ? tc : []);
  if (sCats.length || tCats.length) blocks.push(renderCategoriesTree(sCats, tCats));
  const html = blocks.filter(Boolean).join('');
  return html || emptyState('アプリ設定の変更はありません');
}

// ---------------------------------------------------------------------------
// Fields (existing flat row list rendered with category styling)
// ---------------------------------------------------------------------------

function lookupFieldDef(code: string): any {
  const pick = (bundle: any) => bundle?.sections?.fieldSettings?.properties?.[code];
  return pick(state.lastTargetBundle) || pick(state.lastSourceBundle) || null;
}

/** フィールド本体（定義オブジェクト）を人間が読める要約テキストにする */
function summarizeFieldPayload(payload: any): string {
  if (!payload || typeof payload !== 'object') return safeStringify(payload);
  const parts: string[] = [];
  if (payload.type) parts.push(`タイプ: ${payload.type}`);
  const label = payload.label || payload.name;
  if (label) parts.push(`ラベル: ${label}`);
  if (payload.required != null) parts.push(payload.required === true || payload.required === 'true' ? '必須' : '任意');
  if (payload.unique === true || payload.unique === 'true') parts.push('重複禁止');
  if (payload.expression) parts.push(`計算式: ${payload.expression}`);
  if (payload.defaultValue != null && payload.defaultValue !== '') parts.push(`初期値: ${safeStringify(payload.defaultValue)}`);
  if (payload.options && typeof payload.options === 'object' && !Array.isArray(payload.options)) {
    const opts = Object.keys(payload.options);
    if (opts.length) parts.push(`選択肢: ${opts.slice(0, 6).join(', ')}${opts.length > 6 ? ` 他${opts.length - 6}件` : ''}`);
  }
  if (payload.type === 'SUBTABLE' && payload.fields && typeof payload.fields === 'object') {
    parts.push(`テーブル内フィールド: ${Object.keys(payload.fields).length}件`);
  }
  return parts.length ? parts.join(' / ') : safeStringify(payload);
}

function renderFieldDiffLine(r: any): string {
  const rel = String(r.path || '').replace(/^fieldSettings\.properties\.[^.[\]]+\.?/, '');
  const isRoot = !rel;
  const leafKey = rel.match(/([^[.\]]+)(?:\[\d+\])?$/)?.[1] || '';
  const propLabel = leafKey ? labelOfProp(leafKey) : '';
  const leafDisp = isRoot
    ? 'フィールド定義'
    : (propLabel && propLabel !== leafKey ? `${propLabel} (${rel})` : rel);
  const sev = String(r.severity || 'low');
  const sevDot = `<span class="diff-cat-sev-dot diff-cat-sev-dot--${esc(sev)}" title="重要度: ${esc(sev)}"></span>`;
  const leafHtml = `<span class="diff-cat-mono" title="${esc(String(r.path || ''))}">${esc(leafDisp)}</span>`;
  const valueOf = (v: any) => (isRoot ? summarizeFieldPayload(v) : safeStringify(v));
  if (r.type === 'added') {
    return `<li class="diff-cat-field-line">${sevDot}
      <span class="diff-cat-status diff-cat-status--add">追加</span>
      ${leafHtml}
      <span class="diff-cat-new">${esc(valueOf(r.right))}</span>
    </li>`;
  }
  if (r.type === 'removed') {
    return `<li class="diff-cat-field-line">${sevDot}
      <span class="diff-cat-status diff-cat-status--rm">削除</span>
      ${leafHtml}
      <span class="diff-cat-old">${esc(valueOf(r.left))}</span>
    </li>`;
  }
  if (r.moved) {
    const from = Number(r.movedFrom);
    const to = Number(r.movedTo);
    const pos = Number.isFinite(from) && Number.isFinite(to) ? `（${from + 1}番目 → ${to + 1}番目）` : '';
    return `<li class="diff-cat-field-line">${sevDot}
      <span class="diff-cat-status diff-cat-status--chg">移動</span>
      ${leafHtml}
      <span class="diff-cat-muted">順序のみ変更${esc(pos)}</span>
    </li>`;
  }
  return `<li class="diff-cat-field-line">${sevDot}
    <span class="diff-cat-status diff-cat-status--chg">変更</span>
    ${leafHtml}
    <span class="diff-cat-old">${esc(valueOf(r.left))}</span>
    <span class="diff-cat-arrow">→</span>
    <span class="diff-cat-new">${esc(valueOf(r.right))}</span>
  </li>`;
}

function renderFieldsCategory(rows: any[]): string {
  // フィールドはコード単位でグループ化し、各コードの差分行をまとめる。
  const byCode = new Map<string, any[]>();
  for (const r of rows || []) {
    if (!r || r.type === 'same') continue;
    const m = String(r.path || '').match(/^fieldSettings\.properties\.([^.[\]]+)/);
    const code = m ? m[1] : '(その他)';
    if (!byCode.has(code)) byCode.set(code, []);
    byCode.get(code)!.push(r);
  }
  if (!byCode.size) return emptyState('フィールドの差分はありません');
  // 重要度の高いフィールドを先頭へ（高 > 中 > 低、同順位は差分件数の多い順）
  const sevRank = (rs: any[]) => (rs.some((r) => r.severity === 'high') ? 0 : rs.some((r) => r.severity === 'medium') ? 1 : 2);
  const sorted = [...byCode.entries()].sort((a, b) => {
    const ra = sevRank(a[1]);
    const rb = sevRank(b[1]);
    if (ra !== rb) return ra - rb;
    return b[1].length - a[1].length;
  });
  const blocks = sorted.map(([code, rs]) => {
    const summary = countRowSummary(rs);
    const list = rs.map((r) => renderFieldDiffLine(r)).join('');
    const def = lookupFieldDef(code)
      || (rs.find((r) => r.right && typeof r.right === 'object' && (r.right as any).type)?.right)
      || (rs.find((r) => r.left && typeof r.left === 'object' && (r.left as any).type)?.left);
    const fieldLabel = String(def?.label || def?.name || '').trim();
    const fieldType = String(def?.type || '').trim();
    const labelHtml = fieldLabel && fieldLabel !== code ? `<span class="diff-cat-field-label">${esc(fieldLabel)}</span>` : '';
    const typeHtml = fieldType ? `<span class="diff-cat-tag diff-cat-tag--type">${esc(fieldType)}</span>` : '';
    const rootRow = rs.find((r) => /^fieldSettings\.properties\.[^.[\]]+$/.test(String(r.path || '')));
    const statusChip = rootRow?.type === 'added'
      ? '<span class="diff-cat-status diff-cat-status--add">追加</span>'
      : (rootRow?.type === 'removed' ? '<span class="diff-cat-status diff-cat-status--rm">削除</span>' : '');
    return `<details class="diff-cat-field-block" ${rs.length <= 5 ? 'open' : ''}>
      <summary>
        ${statusChip}
        ${labelHtml}
        <span class="diff-cat-mono">${esc(code)}</span>
        ${typeHtml}
        <span class="diff-cat-stats">${diffBadge(summary)}</span>
        <span class="diff-cat-muted">${rs.length}件</span>
      </summary>
      <ul class="diff-cat-field-list">${list}</ul>
    </details>`;
  }).join('');
  return `<section class="diff-cat-sec">
    <header class="diff-cat-sec-head">
      <span class="diff-cat-sec-icon">${renderSectionIconHtml('fieldSettings')}</span>
      <span class="diff-cat-sec-title">フィールド</span>
      <span class="diff-cat-sec-sub">フィールドコード単位で集約（重要度の高い順）</span>
    </header>
    ${blocks}
  </section>`;
}

// ---------------------------------------------------------------------------
// Main entry: tab strip + active panel
// ---------------------------------------------------------------------------

function renderCategoryContent(catKey: string, rows: any[], src: any, tgt: any, rowsBySection: Map<string, any[]>): string {
  switch (catKey) {
    case 'acl': return renderAclCategory(src, tgt, rowsBySection);
    case 'process': return renderProcessCategory(src, tgt);
    case 'notify': return renderNotifyCategory(src, tgt);
    case 'views': return renderViewsCategory(src, tgt);
    case 'layout': return renderLayoutCategory(src, tgt);
    case 'customize': return renderCustomizeCategory(src, tgt);
    case 'app': return renderAppSettingsCategory(src, tgt);
    case 'fields': return renderFieldsCategory(rows);
    default: return emptyState('未対応のカテゴリです');
  }
}

function appLabel(bundle: any, fallback: string): string {
  if (!bundle) return fallback;
  const id = String(bundle.appId || '').trim();
  const name = extractAppNameFromBundle(bundle) || '';
  if (!id && !name) return fallback;
  return name ? `${name}（app${id || '-'}）` : `app${id}`;
}

export function buildCategoryViewHtml(rows: any[]): string {
  const src = state.lastSourceBundle;
  const tgt = state.lastTargetBundle;
  const actualRows = (rows || []).filter((r) => r && r.type !== 'same');
  const rowsBySection = getRowsBySection(actualRows);

  // Build tabs
  const activeCat = state.diffCategoryView && DIFF_CATEGORIES.some((c) => c.key === state.diffCategoryView)
    ? state.diffCategoryView
    : (DIFF_CATEGORIES.find((c) => c.sections.some((sec) => rowsBySection.has(sec)))?.key || 'acl');

  const tabs = DIFF_CATEGORIES.map((cat, idx) => {
    const catRows = cat.sections.flatMap((sec) => rowsBySection.get(sec) || []);
    const s = countRowSummary(catRows);
    const hasSource = cat.sections.some((sec) => getSection(src, sec) || getSection(tgt, sec));
    const dim = !s.total && !hasSource;
    const active = activeCat === cat.key ? ' is-active' : '';
    const badge = s.total
      ? `<span class="diff-cat-tab-badge diff-cat-tab-badge--${s.high ? 'high' : (s.medium ? 'med' : 'low')}">${s.total}</span>`
      : '';
    const idxHint = idx < 9 ? `<span class="diff-cat-tab-key" aria-hidden="true">${idx + 1}</span>` : '';
    return `<button type="button" class="diff-cat-tab${active}${dim ? ' is-dim' : ''}" data-act="setDiffCategoryView" data-cat="${esc(cat.key)}" title="${esc(cat.hint)}（${idx + 1}キーで切替）">
      ${idxHint}
      <span class="diff-cat-tab-icon">${esc(cat.icon)}</span>
      <span class="diff-cat-tab-label">${esc(cat.label)}</span>
      ${badge}
    </button>`;
  }).join('');

  const activeRows = (DIFF_CATEGORIES.find((c) => c.key === activeCat)?.sections || []).flatMap((sec) => rowsBySection.get(sec) || []);
  const contentHtml = renderCategoryContent(activeCat, activeRows, src, tgt, rowsBySection);

  const srcLabel = appLabel(src, '比較元');
  const tgtLabel = appLabel(tgt, '比較先');
  const headerHtml = `<header class="diff-cat-header">
    <div class="diff-cat-header-apps" title="現在比較しているアプリ">
      <span class="diff-cat-header-app diff-cat-header-app--src">📤 ${esc(srcLabel)}</span>
      <span class="diff-cat-header-arrow">vs</span>
      <span class="diff-cat-header-app diff-cat-header-app--tgt">📥 ${esc(tgtLabel)}</span>
    </div>
    <div class="diff-cat-header-actions">
      <button type="button" class="diff-cat-header-btn" data-act="copyCategoryViewMarkdown" title="現在表示中のカテゴリビューを Markdown としてコピー">📋 Markdown コピー</button>
      <button type="button" class="diff-cat-header-btn" data-act="downloadCategoryViewMarkdown" title="セクション別ビュー全体を Markdown ファイルとして保存">⬇ MD 保存</button>
      <button type="button" class="diff-cat-header-btn" data-act="printCategoryView" title="カテゴリビューを印刷プレビュー">🖨 印刷</button>
    </div>
  </header>`;

  const keyboardHintHtml = `<div class="diff-cat-hotkeys" aria-hidden="true">
    <span><kbd>V</kbd> 行一覧へ戻る</span>
    <span><kbd>1</kbd>〜<kbd>${DIFF_CATEGORIES.length}</kbd> カテゴリ切替</span>
  </div>`;

  return `<div class="diff-cat-view" data-active-cat="${esc(activeCat)}">
    ${headerHtml}
    <nav class="diff-cat-tabs" role="tablist" aria-label="セクション別ビューの切替">${tabs}</nav>
    ${keyboardHintHtml}
    <div class="diff-cat-content">${contentHtml}</div>
  </div>`;
}

// ---------------------------------------------------------------------------
// Markdown export of category view (text-friendly summary for copy/share)
// ---------------------------------------------------------------------------

function categoryToMarkdown(catKey: string, rows: any[], src: any, tgt: any, rowsBySection: Map<string, any[]>): string {
  const cat = DIFF_CATEGORIES.find((c) => c.key === catKey);
  if (!cat) return '';
  const lines: string[] = [`## ${cat.icon} ${cat.label}`];
  for (const sec of cat.sections) {
    const secRows = rowsBySection.get(sec) || [];
    const s = countRowSummary(secRows);
    if (!secRows.length) continue;
    const label = SECTION_LABELS[sec] || sec;
    lines.push(`### ${label}`);
    lines.push(`差分: +${s.added} / -${s.removed} / ~${s.changed} (高:${s.high} 中:${s.medium} 低:${s.low})`);
    const sample = secRows.slice(0, 30);
    for (const r of sample) {
      const t = r.type === 'added' ? '+ 追加' : r.type === 'removed' ? '- 削除' : '~ 変更';
      // 非フィールド系は辞書経由のセマンティック整形を優先 (HTML と表記を揃える)
      const decoded = isSemanticSection(r.sectionKey) ? decodeRow(r) : null;
      let where = '';
      let value = '';
      if (decoded) {
        const chips = (decoded.whereChips || []).map((c) => (c.icon ? `${c.icon} ${c.label}` : c.label)).join(' / ');
        where = chips ? ` [${chips}]` : '';
        const propPart = decoded.propLabel ? `${decoded.propLabel}: ` : '';
        value = r.type === 'added'   ? `${propPart}${decoded.afterText}`
              : r.type === 'removed' ? `${propPart}${decoded.beforeText}`
                                     : `${propPart}${decoded.beforeText} → ${decoded.afterText}`;
      } else {
        value = r.type === 'added' ? safeStringify(r.right)
              : r.type === 'removed' ? safeStringify(r.left)
                                     : `${safeStringify(r.left)} → ${safeStringify(r.right)}`;
      }
      lines.push(`- ${t}${where} ${value.slice(0, 200)}`);
    }
    if (secRows.length > sample.length) lines.push(`- … 他 ${secRows.length - sample.length} 件`);
  }
  return lines.join('\n');
}

const SECTION_LABELS: Record<string, string> = {
  appSettings: 'アプリ設定',
  appInfo: 'アプリ情報',
  fieldSettings: 'フィールド設定',
  layoutSettings: 'レイアウト設定',
  formSettings: 'フォーム設定',
  viewSettings: 'ビュー設定',
  reportSettings: 'グラフ設定',
  processSettings: 'プロセス管理',
  pluginSettings: 'プラグイン',
  customizeSettings: 'JS/CSS設定',
  actionSettings: 'アクション設定',
  appAcl: 'アプリ権限',
  fieldAcl: 'フィールド権限',
  recordPermissions: 'レコード権限',
  notifications: '通知設定',
  perRecordNotifications: 'レコード条件通知',
  reminderNotifications: 'リマインダー通知',
  categories: 'カテゴリ設定'
};

export function buildCategoryViewMarkdown(rows: any[], options: { onlyActive?: boolean } = {}): string {
  const src = state.lastSourceBundle;
  const tgt = state.lastTargetBundle;
  const actualRows = (rows || []).filter((r) => r && r.type !== 'same');
  const rowsBySection = getRowsBySection(actualRows);
  const srcLabel = appLabel(src, '比較元');
  const tgtLabel = appLabel(tgt, '比較先');
  const lines: string[] = [
    `# 差分比較レポート（セクション別ビュー）`,
    ``,
    `- 比較元: ${srcLabel}`,
    `- 比較先: ${tgtLabel}`,
    `- 生成: ${new Date().toISOString()}`,
    ``
  ];
  const cats = options.onlyActive && state.diffCategoryView
    ? DIFF_CATEGORIES.filter((c) => c.key === state.diffCategoryView)
    : DIFF_CATEGORIES;
  for (const cat of cats) {
    const catRows = cat.sections.flatMap((sec) => rowsBySection.get(sec) || []);
    if (!catRows.length) continue;
    lines.push(categoryToMarkdown(cat.key, catRows, src, tgt, rowsBySection));
    lines.push('');
  }
  return lines.join('\n');
}
