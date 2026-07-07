'use strict';

import { SECTION_DEFS } from '../constants.js';
import { buildCharDiffHtml, stringifyRowValueForDiff } from '../diff/export.js';
import { esc } from '../utils.js';
import {
  runExportBundleJsonStandalone,
  runExportDiffHtmlStandalone,
  runExportDiffJsonStandalone,
  runExportPatchJsonStandalone
} from '../tabs/diff-export-standalone.js';
import { runExportDiffXlsx } from '../diff/xlsx-export.js';
import {
  createLitePanel,
  makeRow,
  makeInput,
  makeButton,
  makeCheck,
  makeChip,
  makeTextarea,
  makeSelect,
  makeCard,
  makeDetails,
  makeNote,
  liteRun,
  type LitePanelHandle
} from './litePanelTheme.js';
import { createAppSearchControl } from './appSearchControl.js';
import { readSettingsBundleFile } from '../settingsBundleImport.js';

const SCOPE_OPTS: Array<[string, string, boolean]> = [
  ['fieldSettings', 'フィールド', true],
  ['layoutSettings', 'レイアウト', true],
  ['viewSettings', 'ビュー', true],
  ['reportSettings', 'グラフ', false],
  ['processSettings', 'プロセス', true],
  ['appSettings', 'アプリ設定', false],
  ['formSettings', 'フォーム', false],
  ['customizeSettings', 'JS/CSS', false],
  ['pluginSettings', 'プラグイン', false],
  ['actionSettings', 'アクション', false],
  ['appAcl', 'アプリ権限', false],
  ['fieldAcl', 'フィールド権限', false],
  ['recordPermissions', 'レコード権限', false],
  ['notifications', '通知', false],
  ['perRecordNotifications', 'レコード条件通知', false],
  ['reminderNotifications', 'リマインダー', false],
  ['categories', 'カテゴリ', false]
];

const TYPE_LABEL: Record<string, string> = { added: '追加', removed: '削除', changed: '変更', moved: '移動', same: '同一' };
const SEVERITY_LABEL: Record<string, string> = { high: '高', medium: '中', low: '低' };

const RESULT_CSS_ID = 'kus-diff-lite-result-styles';
const RESULT_CSS = `
.kus-dl-result{font:12px/1.5 ui-monospace,Menlo,monospace;color:#0f172a}
.kus-dl-result__summary{margin:0 0 6px;font-family:-apple-system,Segoe UI,sans-serif;font-size:11.5px;color:#475569;display:flex;flex-wrap:wrap;gap:6px 12px}
.kus-dl-result__summary strong{color:#0f172a}
.kus-dl-section{border:1px solid #e2e8f0;border-radius:8px;margin-bottom:8px;overflow:hidden;background:#fff}
.kus-dl-section>summary{padding:6px 10px;background:#f8fafc;font:600 12px/1.4 -apple-system,Segoe UI,sans-serif;cursor:pointer;list-style:none;display:flex;justify-content:space-between;gap:8px}
.kus-dl-section>summary::-webkit-details-marker{display:none}
.kus-dl-section>summary::before{content:"▸";display:inline-block;margin-right:6px;color:#64748b;transition:transform .15s}
.kus-dl-section[open]>summary::before{transform:rotate(90deg)}
.kus-dl-section__count{color:#64748b;font-weight:400}
.kus-dl-section__body{padding:6px}
.kus-dl-row{border-bottom:1px solid #f1f5f9;padding:6px 8px;font-family:-apple-system,Segoe UI,sans-serif;font-size:11.5px}
.kus-dl-row:last-child{border-bottom:none}
.kus-dl-row__head{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-bottom:4px}
.kus-dl-row__path{font-family:ui-monospace,Menlo,monospace;color:#334155;word-break:break-all;flex:1;min-width:120px}
.kus-dl-row__cols{display:grid;grid-template-columns:1fr 1fr;gap:6px;font-family:ui-monospace,Menlo,monospace;font-size:11px}
.kus-dl-pre{margin:0;padding:6px 8px;background:#f8fafc;border-radius:6px;border:1px solid #e2e8f0;white-space:pre-wrap;word-break:break-all;max-height:300px;overflow:auto}
.kus-dl-pre.del{background:#fef2f2;border-color:#fecaca;color:#7f1d1d}
.kus-dl-pre.add{background:#f0fdf4;border-color:#bbf7d0;color:#14532d}
.kus-dl-pre.empty{color:#94a3b8;font-style:italic}
.kus-dl-badge{display:inline-block;padding:1px 6px;border-radius:4px;font:600 10.5px/1.4 -apple-system,Segoe UI,sans-serif;letter-spacing:.02em}
.kus-dl-badge--added{background:#dcfce7;color:#166534}
.kus-dl-badge--removed{background:#fee2e2;color:#991b1b}
.kus-dl-badge--changed{background:#dbeafe;color:#1d4ed8}
.kus-dl-badge--moved{background:#fef3c7;color:#92400e}
.kus-dl-badge--same{background:#e2e8f0;color:#475569}
.kus-dl-sev{display:inline-block;padding:0 5px;border-radius:3px;font:600 10px/1.4 -apple-system,Segoe UI,sans-serif}
.kus-dl-sev--high{background:#fee2e2;color:#991b1b}
.kus-dl-sev--medium{background:#fef3c7;color:#92400e}
.kus-dl-sev--low{background:#e0f2fe;color:#0c4a6e}
.kus-dl-empty{padding:14px;text-align:center;color:#64748b;font-size:12px;background:#f8fafc;border-radius:8px}
.kus-dl-reason{display:inline-block;padding:1px 6px;border-radius:999px;background:#fff7ed;color:#9a3412;border:1px solid #fdba74;font:500 10px/1.4 -apple-system,Segoe UI,sans-serif}
.kus-dl-flag{display:inline-block;padding:1px 6px;border-radius:999px;background:#f5f3ff;color:#5b21b6;border:1px solid #c4b5fd;font:500 10px/1.4 -apple-system,Segoe UI,sans-serif}
.kus-dl-result mark.diff-char-del{background:#fecaca;color:#7f1d1d;border-radius:2px;padding:0 1px;text-decoration:line-through}
.kus-dl-result mark.diff-char-add{background:#bbf7d0;color:#14532d;border-radius:2px;padding:0 1px}
.kus-dl-target-field{display:flex;flex:1 1 180px;min-width:180px;flex-direction:column}
.kus-dl-target-field .kus-lp__input{width:100%;box-sizing:border-box}
.kus-dl-target-name{min-height:1.35em;margin-top:3px;color:#64748b;font-size:10.5px;line-height:1.35;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.kus-dl-target-name:not(.kus-dl-target-name--empty)::before{content:'アプリ名: ';color:#334155;font-weight:600}
`;

function ensureResultStyles() {
  if (document.getElementById(RESULT_CSS_ID)) return;
  const st = document.createElement('style');
  st.id = RESULT_CSS_ID;
  st.textContent = RESULT_CSS;
  document.head.appendChild(st);
}

interface DiffRow {
  sectionKey: string;
  section: string;
  type: string;
  severity?: string;
  path: string;
  label?: string;
  left?: any;
  right?: any;
  moved?: boolean;
  reasonSummary?: string;
  notationOnly?: boolean;
  emptyOnly?: boolean;
}

interface DiffCache {
  rows: DiffRow[];
  fetchIssues: any[];
  sourceBundle: any;
  targetBundle: any;
  scopes: string[];
  ignoreKeys: string;
  normalizationPresetState: any;
  /** 差分エンジンの上限打ち切り情報（打ち切りなしなら null） */
  truncation: any;
}

function rowSearchText(row: DiffRow): string {
  const safe = (v: any) => { try { return v === undefined ? '' : JSON.stringify(v); } catch { return String(v); } };
  return [row.section || '', row.sectionKey || '', row.severity || '', row.path || '', row.label || '', safe(row.left), safe(row.right)].join('\n').toLowerCase();
}

function rowMatchesFilters(row: DiffRow, filters: { section: string; type: string; severity: string; keyword: string }): boolean {
  if (filters.section && row.sectionKey !== filters.section) return false;
  if (filters.type) {
    if (filters.type === 'moved') {
      if (!row.moved) return false;
    } else if (row.type !== filters.type) {
      return false;
    }
  }
  if (filters.severity && String(row.severity || 'low') !== filters.severity) return false;
  if (filters.keyword && !rowSearchText(row).includes(filters.keyword)) return false;
  return true;
}

function rowColumnsHtml(row: DiffRow, useCharDiff: boolean): { left: string; right: string } {
  const leftStr = stringifyRowValueForDiff(row.left, row.path);
  const rightStr = stringifyRowValueForDiff(row.right, row.path);
  if (row.type === 'added') {
    return { left: '<pre class="kus-dl-pre empty">（なし）</pre>', right: `<pre class="kus-dl-pre add">${esc(rightStr)}</pre>` };
  }
  if (row.type === 'removed') {
    return { left: `<pre class="kus-dl-pre del">${esc(leftStr)}</pre>`, right: '<pre class="kus-dl-pre empty">（なし）</pre>' };
  }
  if (row.type === 'same') {
    return { left: `<pre class="kus-dl-pre empty">${esc(leftStr)}</pre>`, right: '<pre class="kus-dl-pre empty">（同一）</pre>' };
  }
  // changed (or moved with both sides)
  if (useCharDiff) {
    const charDiff = buildCharDiffHtml(leftStr, rightStr);
    if (charDiff) {
      return { left: `<pre class="kus-dl-pre del">${charDiff.left}</pre>`, right: `<pre class="kus-dl-pre add">${charDiff.right}</pre>` };
    }
  }
  return { left: `<pre class="kus-dl-pre del">${esc(leftStr)}</pre>`, right: `<pre class="kus-dl-pre add">${esc(rightStr)}</pre>` };
}

function renderRowsHtml(rows: DiffRow[], useCharDiff: boolean, summary: string): string {
  if (!rows.length) return `<div class="kus-dl-empty">該当する差分はありません${summary ? ` — ${summary}` : ''}</div>`;
  const bySection = new Map<string, DiffRow[]>();
  for (const r of rows) {
    const key = r.sectionKey || '(その他)';
    if (!bySection.has(key)) bySection.set(key, []);
    bySection.get(key)!.push(r);
  }
  // SECTION_DEFS 順を尊重
  const orderedKeys: string[] = [];
  for (const def of SECTION_DEFS) if (bySection.has(def.key)) orderedKeys.push(def.key);
  for (const k of bySection.keys()) if (!orderedKeys.includes(k)) orderedKeys.push(k);

  const parts: string[] = [];
  parts.push(`<div class="kus-dl-result__summary">${summary}</div>`);
  for (const k of orderedKeys) {
    const list = bySection.get(k)!;
    const label = SECTION_DEFS.find((d) => d.key === k)?.label || k;
    parts.push(`<details class="kus-dl-section" open><summary>${esc(label)} <span class="kus-dl-section__count">${list.length}件</span></summary><div class="kus-dl-section__body">`);
    for (const r of list) {
      const cols = rowColumnsHtml(r, useCharDiff);
      const typeKey = r.moved ? 'moved' : (r.type || 'same');
      const typeBadge = `<span class="kus-dl-badge kus-dl-badge--${esc(typeKey)}">${esc(TYPE_LABEL[typeKey] || typeKey)}</span>`;
      const sevBadge = r.severity ? `<span class="kus-dl-sev kus-dl-sev--${esc(r.severity)}">${esc(SEVERITY_LABEL[r.severity] || r.severity)}</span>` : '';
      const labelHtml = r.label ? `<span style="color:#475569">${esc(r.label)}</span>` : '';
      const reasonHtml = r.reasonSummary ? `<span class="kus-dl-reason">${esc(r.reasonSummary)}</span>` : '';
      const flagHtml = [
        r.notationOnly ? '<span class="kus-dl-flag" title="型・表記だけが異なり、値としては同じです（例: &quot;100&quot; と 100）">表記のみ</span>' : '',
        r.emptyOnly ? '<span class="kus-dl-flag" title="空文字・null・空配列など、空値同士の差です">空値ゆれ</span>' : ''
      ].join('');
      parts.push(`<div class="kus-dl-row"><div class="kus-dl-row__head">${typeBadge}${sevBadge}<span class="kus-dl-row__path">${esc(r.path || '')}</span>${reasonHtml}${flagHtml}${labelHtml}</div><div class="kus-dl-row__cols">${cols.left}${cols.right}</div></div>`);
    }
    parts.push('</div></details>');
  }
  return parts.join('');
}

export function mountDiffLitePanel(runDiffStandalone: (opts: any) => Promise<any>) {
  ensureResultStyles();
  const panel: LitePanelHandle = createLitePanel({
    id: 'kus-diff-lite',
    title: '差分比較',
    subtitle: '2 アプリの設定差分を取得し、JSON / HTML / Excel / バンドル / パッチで保存',
    accent: 'diff',
    badges: [{ label: 'Lite' }, { label: '出力対応' }],
    hint: 'API 取得・差分計算・出力をこのスクリプトに同梱しています。<strong>統合ツール.js は不要</strong>。',
    wide: true
  });

  // ---- アプリ ----
  const srcApp = makeInput({ placeholder: 'アプリID', width: 'id' });
  const srcGuest = makeInput({ placeholder: 'ゲストID', width: 'guest' });
  const srcPrev = makeCheck({ label: 'プレビューで取得' });
  const tgtApp = makeInput({ placeholder: 'アプリID（カンマ区切り可）', width: 'medium' });
  const tgtGuest = makeInput({ placeholder: 'ゲストID', width: 'guest' });
  const tgtPrev = makeCheck({ label: 'プレビューで取得' });

  const cardApp = makeCard({ title: 'アプリと環境', number: 1 });
  cardApp.body.appendChild(makeRow([srcApp, srcGuest, srcPrev.label], { label: '比較元' }));
  const makeTargetName = () => {
    const el = document.createElement('div');
    el.className = 'kus-dl-target-name kus-dl-target-name--empty';
    return el;
  };
  const makeTargetField = (app: HTMLInputElement, name: HTMLElement) => {
    const wrap = document.createElement('div');
    wrap.className = 'kus-dl-target-field';
    wrap.appendChild(app);
    wrap.appendChild(name);
    return wrap;
  };
  const setTargetName = (entry: TargetRowEntry, appName: string) => {
    entry.appName = String(appName || '').trim();
    entry.name.textContent = entry.appName;
    entry.name.title = entry.appName ? `アプリ名: ${entry.appName}` : '';
    entry.name.classList.toggle('kus-dl-target-name--empty', !entry.appName);
  };
  const tgtName = makeTargetName();
  const firstTargetRow = makeRow([makeTargetField(tgtApp, tgtName), tgtGuest, tgtPrev.label], { label: '比較先 1' });
  cardApp.body.appendChild(firstTargetRow);
  const targetList = document.createElement('div');
  targetList.style.display = 'grid';
  targetList.style.gap = '6px';
  targetList.style.marginTop = '6px';
  targetList.style.maxHeight = '180px';
  targetList.style.overflowY = 'auto';
  targetList.style.paddingRight = '2px';
  interface TargetRowEntry { app: HTMLInputElement; guest: HTMLInputElement; row: HTMLElement; name: HTMLElement; appName: string }
  const targetRows: TargetRowEntry[] = [{ app: tgtApp, guest: tgtGuest, row: firstTargetRow, name: tgtName, appName: '' }];
  const relabelTargetRows = () => targetRows.forEach((r, idx) => {
    const label = r.row?.querySelector?.('.kus-lp__label') as HTMLElement | null;
    if (label) label.textContent = `比較先 ${idx + 1}`;
  });
  const addTargetRow = (appId = '', guestId = '', appName = '') => {
    const app = makeInput({ placeholder: 'アプリID（カンマ区切り可）', width: 'medium' });
    const guest = makeInput({ placeholder: 'ゲストID', width: 'guest' });
    const name = makeTargetName();
    app.value = appId;
    guest.value = guestId;
    const copy = makeButton('行コピー', 'sub');
    const remove = makeButton('削除', 'ghost');
    const row = makeRow([makeTargetField(app, name), guest, copy, remove], { label: `比較先 ${targetRows.length + 1}` });
    const entry: TargetRowEntry = { app, guest, row, name, appName: '' };
    setTargetName(entry, appName);
    copy.addEventListener('click', async () => {
      const text = [`比較先 ${targetRows.indexOf(entry) + 1}`, app.value.trim(), guest.value.trim()].join('\t');
      try { await navigator.clipboard.writeText(text); panel.setStatus('比較先行をコピーしました', 'info'); } catch { panel.setStatus(text, 'info'); }
    });
    remove.addEventListener('click', () => {
      row.remove();
      const idx = targetRows.indexOf(entry);
      if (idx >= 0) targetRows.splice(idx, 1);
      relabelTargetRows();
    });
    app.addEventListener('input', () => { if (entry.appName) setTargetName(entry, ''); });
    targetRows.push(entry);
    targetList.appendChild(row);
    attachTargetSplit(entry);
    return entry;
  };
  // 比較先のアプリID欄に「100, 120, 130」のようにカンマ区切りで入力したら比較先行へ分割する
  const attachTargetSplit = (entry: TargetRowEntry) => {
    const distribute = () => {
      const raw = entry.app.value;
      if (!/[,、\s]/.test(raw)) return;
      const tokens = raw.split(/[,、\s]+/).map((t) => t.trim()).filter(Boolean);
      if (tokens.length <= 1) { entry.app.value = tokens[0] || ''; setTargetName(entry, ''); return; }
      entry.app.value = tokens[0];
      setTargetName(entry, '');
      const guestVal = entry.guest.value.trim();
      for (let k = 1; k < tokens.length; k += 1) addTargetRow(tokens[k], guestVal);
      panel.setStatus(`比較先を ${tokens.length} 件に分割しました`, 'info');
    };
    entry.app.addEventListener('change', distribute);
    entry.app.addEventListener('paste', (ev: ClipboardEvent) => {
      const text = ev.clipboardData?.getData('text') || '';
      if (!/[,、\s]/.test(text)) return;
      ev.preventDefault();
      entry.app.value = [entry.app.value.trim(), text].filter(Boolean).join(',');
      distribute();
    });
  };
  tgtApp.addEventListener('input', () => { if (targetRows[0]?.appName) setTargetName(targetRows[0], ''); });
  attachTargetSplit(targetRows[0]);
  const addTargetBtn = makeButton('比較先行を追加', 'sub');
  addTargetBtn.addEventListener('click', () => { addTargetRow(); panel.setStatus('比較先行を追加しました', 'info'); });
  const copyFirstBtn = makeButton('比較先1を複製', 'sub');
  copyFirstBtn.addEventListener('click', () => addTargetRow(tgtApp.value.trim(), tgtGuest.value.trim(), targetRows[0]?.appName || ''));
  cardApp.body.appendChild(makeRow([addTargetBtn, copyFirstBtn], { label: '複数比較' }));
  cardApp.body.appendChild(createAppSearchControl(panel, {
    targets: [
      { label: '比較元', apply: (id, _name, guestId) => { srcApp.value = id; if (guestId && !srcGuest.value.trim()) srcGuest.value = guestId; } },
      { label: '比較先', apply: (id, name, guestId) => {
        const empty = targetRows.find((r) => !r.app.value.trim()) || addTargetRow();
        empty.app.value = id;
        setTargetName(empty, name);
        if (guestId && !empty.guest.value.trim()) empty.guest.value = guestId;
      } }
    ]
  }));
  cardApp.body.appendChild(targetList);
  panel.body.insertBefore(cardApp.card, panel.status);

  // ---- セクション ----
  const cardScope = makeCard({ title: '比較セクション', number: 2 });
  const chipBox = document.createElement('div');
  chipBox.className = 'kus-lp__chips';
  const chips = SCOPE_OPTS.map(([key, label, def]) => makeChip({ label, value: key, checked: def }));
  chips.forEach((c) => chipBox.appendChild(c.label));
  cardScope.body.appendChild(chipBox);
  const allBtn = makeButton('全選択', 'sub');
  const noneBtn = makeButton('全解除', 'sub');
  cardScope.actions.appendChild(allBtn);
  cardScope.actions.appendChild(noneBtn);
  allBtn.addEventListener('click', () => chips.forEach((c) => { c.checkbox.checked = true; }));
  noneBtn.addEventListener('click', () => chips.forEach((c) => { c.checkbox.checked = false; }));
  panel.body.insertBefore(cardScope.card, panel.status);

  // ---- 設定JSON読込 ----
  const cardImport = makeCard({ title: '設定JSON読込（任意）', soft: true });
  cardImport.body.appendChild(makeNote('設定出力で保存した単体JSON、設定一括取得JSON（apps 配列）、差分バンドルJSONを指定できます。指定した側はAPI取得せずJSONを使用します。'));
  const srcFile = document.createElement('input');
  srcFile.type = 'file';
  srcFile.accept = '.json,application/json';
  srcFile.className = 'kus-lp__file';
  const tgtFile = document.createElement('input');
  tgtFile.type = 'file';
  tgtFile.accept = '.json,application/json';
  tgtFile.className = 'kus-lp__file';
  const clearImportBtn = makeButton('読込解除', 'ghost');
  cardImport.body.appendChild(makeRow(srcFile, { label: '比較元JSON' }));
  cardImport.body.appendChild(makeRow(tgtFile, { label: '比較先JSON' }));
  cardImport.body.appendChild(makeRow(clearImportBtn));
  panel.body.insertBefore(cardImport.card, panel.status);

  // ---- 詳細オプション ----
  const advDetails = makeDetails('詳細オプション');
  const ignTa = makeTextarea({ rows: 2, code: true, placeholder: '無視キー（カンマ区切り）' });
  advDetails.body.appendChild(makeRow(ignTa, { label: '無視キー', block: true }));

  const includeSame = makeCheck({ label: '同一行も差分行に含める' });
  const showResultList = makeCheck({ label: '画面に比較結果一覧を表示', checked: false, help: '通常は画面に明細を出さず、JSON/HTML/Excel等のファイル出力だけにします' });
  const nView = makeCheck({ label: 'ビュー/グラフ/アクション順序を無視', checked: false });
  const nPerm = makeCheck({ label: '権限/通知/カテゴリ順序を無視', checked: false });
  const nAll = makeCheck({ label: 'すべての配列順序を無視', checked: false });
  const nField = makeCheck({ label: 'フィールド/レイアウト順序を無視', checked: false });
  const nProcess = makeCheck({ label: 'プロセスの並び順を無視', checked: false });
  const nAppRefs = makeCheck({ label: 'アプリID/参照先アプリIDを無視', checked: false });
  const nAudit = makeCheck({ label: '監査/リビジョン情報を無視', checked: false });
  const nText = makeCheck({ label: 'ラベル/説明文/ヘルプを無視', checked: false });
  const nAppearance = makeCheck({ label: '見た目/幅/座標を無視', checked: false });
  const nFileKeys = makeCheck({ label: '添付/JS/CSS fileKeyを無視', checked: false });
  const nEnabled = makeCheck({ label: '有効/無効フラグを無視', checked: false });
  const normGrid = document.createElement('div');
  normGrid.className = 'kus-lp__check-grid';
  [
    includeSame.label,
    showResultList.label,
    nView.label,
    nPerm.label,
    nAll.label,
    nField.label,
    nProcess.label,
    nAppRefs.label,
    nAudit.label,
    nText.label,
    nAppearance.label,
    nFileKeys.label,
    nEnabled.label
  ].forEach((el) => normGrid.appendChild(el));
  advDetails.body.appendChild(normGrid);
  panel.body.insertBefore(advDetails.details, panel.status);

  // ---- 実行 ----
  const runBtn = makeButton('差分比較を実行', 'run', { icon: '◎' });
  const runAllBtn = makeButton('全比較先を順に比較', 'sub', { icon: '◎' });
  panel.body.insertBefore(makeRow([runBtn, runAllBtn]), panel.status);
  // 入力欄で Enter を押すと差分比較を実行（読み取り専用なので安全）
  panel.setPrimaryAction(runBtn);

  // ---- 結果フィルタ ----
  const cardFilter = makeCard({ title: '結果の絞り込み', soft: true });
  cardFilter.card.style.display = 'none';
  const filterSection = makeSelect([['', '全セクション']]);
  const filterType = makeSelect([
    ['', '全種別'],
    ['added', '追加'],
    ['removed', '削除'],
    ['changed', '変更'],
    ['moved', '移動'],
    ['same', '同一']
  ]);
  const filterSeverity = makeSelect([
    ['', '全重要度'],
    ['high', '高'],
    ['medium', '中'],
    ['low', '低']
  ]);
  const filterSearch = makeInput({ placeholder: 'パス・値・ラベルで検索', width: 'wide', noSubmit: true });
  const filterClear = makeButton('クリア', 'ghost');
  cardFilter.body.appendChild(makeRow([filterSection, filterType, filterSeverity, filterClear], { label: 'フィルタ' }));
  cardFilter.body.appendChild(makeRow(filterSearch, { label: '検索' }));
  const charDiffCb = makeCheck({ label: '文字単位ハイライト', checked: true, help: '変更行で「どこが変わったか」を文字単位で強調表示します' });
  cardFilter.body.appendChild(makeRow(charDiffCb.label));
  filterClear.addEventListener('click', () => {
    filterSection.value = '';
    filterType.value = '';
    filterSeverity.value = '';
    filterSearch.value = '';
    rerender();
  });
  [filterSection, filterType, filterSeverity].forEach((el) => el.addEventListener('change', () => rerender()));
  filterSearch.addEventListener('input', () => rerender());
  charDiffCb.checkbox.addEventListener('change', () => rerender());
  showResultList.checkbox.addEventListener('change', () => rerender());
  panel.body.insertBefore(cardFilter.card, panel.status);

  // ---- 結果表示エリア（HTMLテーブル） ----
  const cardResult = makeCard({ title: '結果', soft: true });
  cardResult.card.style.display = 'none';
  const resultBox = document.createElement('div');
  resultBox.className = 'kus-dl-result';
  cardResult.body.appendChild(resultBox);
  panel.body.insertBefore(cardResult.card, panel.status);

  // ---- 出力 ----
  const cardOut = makeCard({ title: 'ファイル出力', number: 3, soft: true });
  cardOut.body.appendChild(makeNote('比較完了後に利用できます。レポートに生設定を含めるか、出力対象を絞るかを選べます。'));
  const expRange = makeSelect([
    ['all', '全件'],
    ['filtered', '表示中（フィルタ適用後）']
  ], 'all');
  const expMode = makeSelect([
    ['diffOnly', '行データのみ'],
    ['withCompared', '行データ + 比較セクションの設定']
  ], 'diffOnly');
  cardOut.body.appendChild(makeRow([expRange, expMode], { label: '範囲 / 内容' }));

  const grid = document.createElement('div');
  grid.className = 'kus-lp__btn-grid';
  const bJson = makeButton('差分 JSON', 'sub', { icon: '↓' });
  const bHtml = makeButton('差分 HTML', 'sub', { icon: '↓' });
  const bXlsx = makeButton('差分 Excel', 'sub', { icon: '↓' });
  const bBundle = makeButton('バンドル JSON', 'sub', { icon: '↓' });
  const bPatch = makeButton('パッチ JSON', 'sub', { icon: '↓' });
  grid.appendChild(bJson);
  grid.appendChild(bHtml);
  grid.appendChild(bXlsx);
  grid.appendChild(bBundle);
  grid.appendChild(bPatch);
  cardOut.body.appendChild(grid);
  // 出力カードは結果カードの前に挿入し、差分件数が多くても結果リストの下までスクロールせず
  // 出力ボタンへすぐ届くようにする
  panel.body.insertBefore(cardOut.card, cardResult.card);

  // ---- 状態 ----
  let cache: DiffCache | null = null;
  let summaryText = '';
  let importedSourceBundle: any = null;
  let importedTargetBundle: any = null;

  srcFile.addEventListener('change', () => liteRun(panel, '比較元JSONを読み込み中…', async () => {
    const file = srcFile.files?.[0];
    if (!file) return;
    importedSourceBundle = await readSettingsBundleFile(file, { side: 'source', appId: srcApp.value.trim() });
    if (!srcApp.value.trim() && importedSourceBundle?.appId) srcApp.value = String(importedSourceBundle.appId);
    panel.setStatus(`比較元JSONを読み込みました: App ${importedSourceBundle?.appId || '-'}`, 'ok');
  }));
  tgtFile.addEventListener('change', () => liteRun(panel, '比較先JSONを読み込み中…', async () => {
    const file = tgtFile.files?.[0];
    if (!file) return;
    importedTargetBundle = await readSettingsBundleFile(file, { side: 'target', appId: tgtApp.value.trim() });
    if (!tgtApp.value.trim() && importedTargetBundle?.appId) tgtApp.value = String(importedTargetBundle.appId);
    panel.setStatus(`比較先JSONを読み込みました: App ${importedTargetBundle?.appId || '-'}`, 'ok');
  }));
  clearImportBtn.addEventListener('click', () => {
    importedSourceBundle = null;
    importedTargetBundle = null;
    srcFile.value = '';
    tgtFile.value = '';
    panel.setStatus('設定JSONの読込を解除しました', 'info');
  });

  function readTargets() {
    const seen = new Set<string>();
    return targetRows
      .map((r) => ({ appId: r.app.value.trim(), guestId: r.guest.value.trim(), preview: tgtPrev.checkbox.checked }))
      .filter((t) => t.appId)
      .filter((t) => {
        const key = `${t.appId}::${t.guestId}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  }

  function readForm() {
    return {
      source: { appId: srcApp.value.trim(), guestId: srcGuest.value.trim(), preview: srcPrev.checkbox.checked },
      target: { appId: tgtApp.value.trim(), guestId: tgtGuest.value.trim(), preview: tgtPrev.checkbox.checked },
      scopes: chips.filter((c) => c.checkbox.checked).map((c) => c.checkbox.value),
      ignoreKeys: ignTa.value,
      includeSame: includeSame.checkbox.checked,
      normalizationPresetState: {
        viewOrder: nView.checkbox.checked,
        permissionOrder: nPerm.checkbox.checked,
        generalArrayOrder: nAll.checkbox.checked,
        fieldOrder: nField.checkbox.checked,
        processOrder: nProcess.checkbox.checked,
        appReferences: nAppRefs.checkbox.checked,
        auditMeta: nAudit.checkbox.checked,
        labelsAndText: nText.checkbox.checked,
        appearance: nAppearance.checkbox.checked,
        fileKeys: nFileKeys.checkbox.checked,
        enabledFlags: nEnabled.checkbox.checked
      }
    };
  }

  function currentFilters() {
    return {
      section: filterSection.value,
      type: filterType.value,
      severity: filterSeverity.value,
      keyword: filterSearch.value.trim().toLowerCase()
    };
  }

  function filteredRows(): DiffRow[] {
    if (!cache) return [];
    const f = currentFilters();
    return cache.rows.filter((r) => rowMatchesFilters(r, f));
  }

  function refreshFilterSectionOptions() {
    if (!cache) return;
    const set = new Set(cache.rows.map((r) => r.sectionKey).filter(Boolean));
    const prev = filterSection.value;
    filterSection.innerHTML = '';
    const optAll = document.createElement('option');
    optAll.value = ''; optAll.textContent = '全セクション';
    filterSection.appendChild(optAll);
    for (const def of SECTION_DEFS) {
      if (set.has(def.key)) {
        const o = document.createElement('option');
        o.value = def.key; o.textContent = def.label;
        filterSection.appendChild(o);
      }
    }
    if ([...filterSection.options].some((o) => o.value === prev)) filterSection.value = prev;
  }

  function rerender() {
    if (!cache) {
      resultBox.innerHTML = '';
      cardResult.card.style.display = 'none';
      cardFilter.card.style.display = 'none';
      return;
    }
    if (!showResultList.checkbox.checked) {
      resultBox.innerHTML = '';
      cardResult.card.style.display = 'none';
      cardFilter.card.style.display = 'none';
      return;
    }
    const rows = filteredRows();
    const summary = `<strong>${rows.length}</strong>件 表示中 / 全 <strong>${cache.rows.length}</strong>件 ・ ${summaryText}`;
    resultBox.innerHTML = renderRowsHtml(rows, charDiffCb.checkbox.checked, summary);
    cardResult.card.style.display = 'block';
    cardFilter.card.style.display = 'block';
  }

  function exportCtx(forceAll = false) {
    if (!cache) throw new Error('先に差分比較を実行してください');
    const rows = forceAll || expRange.value === 'all' ? cache.rows : filteredRows();
    return {
      ...cache,
      rows,
      exportContentMode: expMode.value || 'diffOnly'
    };
  }

  runAllBtn.addEventListener('click', () => {
    const targets = readTargets();
    if (!targets.length) {
      panel.setStatus('比較先アプリIDを 1 件以上入力してください', 'warn');
      return;
    }
    liteRun(panel, '全比較先を比較中…', async () => {
      const base = readForm();
      const rows: string[] = [];
      for (let i = 0; i < targets.length; i += 1) {
        const t = targets[i];
        panel.setStatus(`比較中 (${i + 1}/${targets.length}) App:${t.appId}${t.guestId ? ` / Guest:${t.guestId}` : ''}`, 'busy');
        const out = await runDiffStandalone({
          source: base.source,
          target: t,
          scopes: base.scopes,
          ignoreKeys: base.ignoreKeys,
          includeSame: base.includeSame,
          normalizationPresetState: base.normalizationPresetState,
          importedSourceBundle,
          onStatus: (m: string) => panel.setStatus(m, 'busy')
        });
        rows.push(`<tr><td>${esc(t.appId)}</td><td>${esc(t.guestId || '通常')}</td><td>${(out.rows || []).filter((r: any) => r.type !== 'same').length}</td><td>${(out.fetchIssues || []).length}</td></tr>`);
      }
      if (showResultList.checkbox.checked) {
        cardResult.card.style.display = '';
        resultBox.innerHTML = `<div class="kus-dl-result"><table><thead><tr><th>比較先App</th><th>ゲストID</th><th>差分</th><th>取得失敗</th></tr></thead><tbody>${rows.join('')}</tbody></table></div>`;
      } else {
        cardResult.card.style.display = 'none';
        resultBox.innerHTML = '';
      }
      panel.setStatus(`全比較先の比較が完了しました (${targets.length}件)${showResultList.checkbox.checked ? '' : '（画面出力なし）'}`, 'ok');
    });
  });

  runBtn.addEventListener('click', () => {
    cache = null;
    summaryText = '';
    resultBox.innerHTML = '';
    cardResult.card.style.display = 'none';
    cardFilter.card.style.display = 'none';
    const f = readForm();
    if (!f.scopes.length) {
      panel.setStatus('比較セクションを 1 つ以上選択してください', 'warn');
      return;
    }
    liteRun(panel, '差分比較を実行中…', async () => {
      const out = await runDiffStandalone({
        source: f.source,
        target: f.target,
        scopes: f.scopes,
        ignoreKeys: f.ignoreKeys,
        includeSame: f.includeSame,
        normalizationPresetState: f.normalizationPresetState,
        importedSourceBundle,
        importedTargetBundle,
        onStatus: (m: string) => panel.setStatus(m, 'busy')
      });
      cache = {
        rows: out.rows,
        fetchIssues: out.fetchIssues || [],
        sourceBundle: out.sourceBundle,
        targetBundle: out.targetBundle,
        scopes: f.scopes,
        ignoreKeys: f.ignoreKeys,
        normalizationPresetState: f.normalizationPresetState,
        truncation: out.truncation || null
      };
      summaryText = out.summary?.text || '完了';
      refreshFilterSectionOptions();
      rerender();
      panel.setStatus(`${summaryText} — ${showResultList.checkbox.checked ? '画面に結果一覧を表示しました。' : '比較結果一覧は画面出力せず、'}ファイル出力ボタンから保存できます`, 'ok');
    });
  });

  bJson.addEventListener('click', () => {
    try {
      runExportDiffJsonStandalone(exportCtx());
      panel.setStatus(`差分 JSON をダウンロードしました（${expRange.value === 'all' ? '全件' : '表示中'}）`, 'ok');
    } catch (e: any) {
      panel.setStatus(`エラー: ${e?.message || String(e)}`, 'err');
    }
  });
  bHtml.addEventListener('click', () => {
    try {
      runExportDiffHtmlStandalone(exportCtx());
      panel.setStatus(`差分 HTML をダウンロードしました（${expRange.value === 'all' ? '全件' : '表示中'}）`, 'ok');
    } catch (e: any) {
      panel.setStatus(`エラー: ${e?.message || String(e)}`, 'err');
    }
  });
  bXlsx.addEventListener('click', () => {
    try {
      runExportDiffXlsx(exportCtx());
      panel.setStatus(`差分 Excel をダウンロードしました（${expRange.value === 'all' ? '全件' : '表示中'}）`, 'ok');
    } catch (e: any) {
      panel.setStatus(`エラー: ${e?.message || String(e)}`, 'err');
    }
  });
  bBundle.addEventListener('click', () => {
    try {
      if (!cache) throw new Error('先に差分比較を実行してください');
      runExportBundleJsonStandalone(cache.sourceBundle, cache.targetBundle);
      panel.setStatus('バンドル JSON をダウンロードしました', 'ok');
    } catch (e: any) {
      panel.setStatus(`エラー: ${e?.message || String(e)}`, 'err');
    }
  });
  bPatch.addEventListener('click', () => {
    try {
      if (!cache) throw new Error('先に差分比較を実行してください');
      const rows = expRange.value === 'all' ? cache.rows : filteredRows();
      runExportPatchJsonStandalone(rows, cache.sourceBundle, cache.targetBundle);
      panel.setStatus(`パッチ JSON をダウンロードしました（${expRange.value === 'all' ? '全件' : '表示中'}）`, 'ok');
    } catch (e: any) {
      panel.setStatus(`エラー: ${e?.message || String(e)}`, 'err');
    }
  });
}
