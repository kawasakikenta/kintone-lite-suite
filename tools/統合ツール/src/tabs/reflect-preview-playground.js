'use strict';

import { deepClone, esc, downloadText } from '../utils.js';

const SAMPLE_BEFORE = {
  '文字列__1行_': { type: 'SINGLE_LINE_TEXT', code: '文字列__1行_', label: '会社名', noLabel: false, required: true, unique: false, maxLength: '64', minLength: '', defaultValue: '', expression: '', hideExpression: false },
  '数値': { type: 'NUMBER', code: '数値', label: '金額', noLabel: false, required: false, unique: false, maxValue: '', minValue: '', defaultValue: '0', digit: true, unit: '¥', unitPosition: 'BEFORE' },
  'ドロップダウン': { type: 'DROP_DOWN', code: 'ドロップダウン', label: 'ステータス', noLabel: false, required: true, defaultValue: '未着手', options: { '未着手': { label: '未着手', index: 0 }, '進行中': { label: '進行中', index: 1 }, '完了': { label: '完了', index: 2 } } },
  '日付': { type: 'DATE', code: '日付', label: '登録日', noLabel: false, required: false, unique: false, defaultValue: '', defaultNowValue: true },
  'リッチエディター': { type: 'RICH_TEXT', code: 'リッチエディター', label: '備考', noLabel: false, required: false, defaultValue: '' }
};

const SAMPLE_AFTER = {
  '文字列__1行_': { type: 'SINGLE_LINE_TEXT', code: '文字列__1行_', label: '会社名（正式名称）', noLabel: false, required: true, unique: true, maxLength: '128', minLength: '1', defaultValue: '', expression: '', hideExpression: false },
  '数値': { type: 'NUMBER', code: '数値', label: '金額', noLabel: false, required: true, unique: false, maxValue: '9999999', minValue: '0', defaultValue: '0', digit: true, unit: '円', unitPosition: 'BEFORE' },
  'ドロップダウン': { type: 'DROP_DOWN', code: 'ドロップダウン', label: 'ステータス', noLabel: false, required: true, defaultValue: '未着手', options: { '未着手': { label: '未着手', index: 0 }, '進行中': { label: '進行中', index: 1 }, 'レビュー中': { label: 'レビュー中', index: 2 }, '完了': { label: '完了', index: 3 } } },
  '日付': { type: 'DATE', code: '日付', label: '登録日', noLabel: false, required: true, unique: false, defaultValue: '', defaultNowValue: true },
  '担当者': { type: 'USER_SELECT', code: '担当者', label: '担当者', noLabel: false, required: true, defaultValue: [], entities: [] }
};

const STATUS_LABELS = { added: '追加', removed: '削除', modified: '変更', unchanged: '変更なし' };

function deepEqual(a, b) {
  if (a === b) return true;
  if (a == null || b == null) return a === b;
  if (typeof a !== typeof b || typeof a !== 'object') return false;
  const ka = Object.keys(a);
  const kb = Object.keys(b);
  if (ka.length !== kb.length) return false;
  return ka.every((k) => deepEqual(a[k], b[k]));
}

function formatValue(v) {
  if (v === undefined || v === null) return '—';
  if (typeof v === 'boolean') return v ? 'はい' : 'いいえ';
  if (typeof v === 'object') return JSON.stringify(v, null, 2);
  if (v === '') return '""';
  return String(v);
}

function computeDiff(before, after) {
  const keys = new Set([...Object.keys(before || {}), ...Object.keys(after || {})]);
  const rows = [];
  for (const code of keys) {
    const bf = before?.[code];
    const af = after?.[code];
    if (!bf && af) rows.push({ code, status: 'added', before: null, after: af, changes: [] });
    else if (bf && !af) rows.push({ code, status: 'removed', before: bf, after: null, changes: [] });
    else {
      const props = new Set([...Object.keys(bf || {}), ...Object.keys(af || {})]);
      const changes = [];
      props.forEach((prop) => {
        if (!deepEqual(bf[prop], af[prop])) changes.push({ prop, before: bf[prop], after: af[prop] });
      });
      rows.push({ code, status: changes.length ? 'modified' : 'unchanged', before: bf, after: af, changes });
    }
  }
  const order = { added: 0, removed: 1, modified: 2, unchanged: 3 };
  rows.sort((a, b) => order[a.status] - order[b.status]);
  return rows;
}

export function initReflectPreviewPlayground(ui, setStatus) {
  const root = ui.reflectPreviewPlayground;
  if (!root) return;
  const st = {
    before: deepClone(SAMPLE_BEFORE),
    after: deepClone(SAMPLE_AFTER),
    filter: 'all',
    view: 'diff',
    undo: [],
    expanded: new Set(),
    dragCode: ''
  };

  const pushUndo = () => {
    st.undo.push({ before: deepClone(st.before), after: deepClone(st.after) });
    if (st.undo.length > 20) st.undo.shift();
  };

  const render = () => {
    const diff = computeDiff(st.before, st.after);
    const rows = st.filter === 'all' ? diff : diff.filter((r) => r.status === st.filter);
    const stats = { added: 0, removed: 0, modified: 0, unchanged: 0 };
    diff.forEach((d) => { stats[d.status] += 1; });
    root.innerHTML = `
      <div class="rpp-toolbar">
        <button type="button" class="btn sub" data-rpp-act="loadSample">サンプル</button>
        <button type="button" class="btn sub" data-rpp-act="undo" ${st.undo.length ? '' : 'disabled'}>↩ 戻す</button>
        <button type="button" class="btn sub" data-rpp-act="add">＋ フィールド追加</button>
        <button type="button" class="btn sub" data-rpp-act="editJson">JSON編集</button>
        <button type="button" class="btn sub" data-rpp-act="export">JSON保存</button>
        <span style="margin-left:auto"></span>
        <button type="button" class="btn ${st.view === 'diff' ? 'ok' : 'sub'}" data-rpp-act="viewDiff">差分</button>
        <button type="button" class="btn ${st.view === 'preview' ? 'ok' : 'sub'}" data-rpp-act="viewPreview">プレビュー</button>
      </div>
      <div class="rpp-filters">
        ${['all', 'added', 'removed', 'modified', 'unchanged'].map((k) => `<button type="button" class="btn sub ${st.filter === k ? 'is-active' : ''}" data-rpp-act="filter" data-filter="${k}">${k === 'all' ? 'すべて' : STATUS_LABELS[k]} <span>${k === 'all' ? diff.length : stats[k]}</span></button>`).join('')}
      </div>
      <div class="rpp-list">
        ${rows.map((row) => {
          const opened = st.expanded.has(row.code);
          const label = row.after?.label || row.before?.label || row.code;
          const body = st.view === 'diff'
            ? (row.status === 'modified'
              ? `<table class="rpp-table"><thead><tr><th>プロパティ</th><th>変更前</th><th>変更後</th></tr></thead><tbody>${row.changes.map((ch) => `<tr><td>${esc(ch.prop)}</td><td><pre>${esc(formatValue(ch.before))}</pre></td><td><pre>${esc(formatValue(ch.after))}</pre></td></tr>`).join('')}</tbody></table>`
              : `<pre class="rpp-pre">${esc(formatValue(row.after || row.before))}</pre>`)
            : `<div class="rpp-preview-grid"><div><div class="rpp-preview-head">本番</div><div class="rpp-preview-body">${row.before ? esc(row.before.label || row.before.code || '-') : 'なし'}</div></div><div><div class="rpp-preview-head">プレビュー</div><div class="rpp-preview-body">${row.after ? esc(row.after.label || row.after.code || '-') : 'なし'}</div></div></div>`;
          return `<div class="rpp-card" draggable="true" data-rpp-code="${esc(row.code)}"><div class="rpp-head"><button type="button" class="rpp-open" data-rpp-act="toggle" data-code="${esc(row.code)}">${opened ? '▾' : '▸'}</button><span class="rpp-badge rpp-${row.status}">${STATUS_LABELS[row.status]}</span><strong>${esc(label)}</strong><code>${esc(row.code)}</code><span class="rpp-spacer"></span>${row.after ? `<button type="button" class="btn sub" data-rpp-act="edit" data-code="${esc(row.code)}">編集</button><button type="button" class="btn sub" data-rpp-act="delete" data-code="${esc(row.code)}">削除</button>` : `<button type="button" class="btn sub" data-rpp-act="restore" data-code="${esc(row.code)}">復元</button>`}</div>${opened ? `<div class="rpp-body">${body}</div>` : ''}</div>`;
        }).join('') || '<div class="muted" style="padding:12px">表示対象がありません</div>'}
      </div>`;
  };

  const parseFieldInput = (v) => {
    const obj = JSON.parse(v);
    if (!obj || typeof obj !== 'object') throw new Error('JSONオブジェクトを入力してください');
    if (!obj.code || !obj.type || !obj.label) throw new Error('code/type/label が必要です');
    return obj;
  };

  root.addEventListener('click', (ev) => {
    const btn = ev.target.closest('[data-rpp-act]');
    if (!btn) return;
    const act = btn.dataset.rppAct;
    const code = btn.dataset.code || '';
    try {
      if (act === 'loadSample') {
        pushUndo();
        st.before = deepClone(SAMPLE_BEFORE);
        st.after = deepClone(SAMPLE_AFTER);
        setStatus('サンプルデータを再読込しました');
      } else if (act === 'undo') {
        if (!st.undo.length) return;
        const prev = st.undo.pop();
        st.before = prev.before;
        st.after = prev.after;
        setStatus('元に戻しました');
      } else if (act === 'viewDiff') st.view = 'diff';
      else if (act === 'viewPreview') st.view = 'preview';
      else if (act === 'filter') st.filter = btn.dataset.filter || 'all';
      else if (act === 'toggle') {
        if (st.expanded.has(code)) st.expanded.delete(code);
        else st.expanded.add(code);
      } else if (act === 'delete') {
        if (!confirm(`${code} を削除しますか？`)) return;
        pushUndo();
        delete st.after[code];
      } else if (act === 'restore') {
        if (!st.before[code]) return;
        pushUndo();
        st.after[code] = deepClone(st.before[code]);
      } else if (act === 'edit') {
        const cur = st.after[code];
        if (!cur) return;
        const raw = prompt('フィールドJSONを編集してください', JSON.stringify(cur, null, 2));
        if (raw == null) return;
        const parsed = parseFieldInput(raw);
        pushUndo();
        st.after[code] = parsed;
        if (parsed.code !== code) {
          st.after[parsed.code] = st.after[code];
          delete st.after[code];
        }
      } else if (act === 'add') {
        const raw = prompt('追加するフィールドJSONを入力してください（code/type/label必須）', '{\n  "type": "SINGLE_LINE_TEXT",\n  "code": "new_field",\n  "label": "新規フィールド",\n  "required": false\n}');
        if (raw == null) return;
        const parsed = parseFieldInput(raw);
        pushUndo();
        st.after[parsed.code] = parsed;
      } else if (act === 'editJson') {
        const b = prompt('変更前JSON（before）を編集してください', JSON.stringify(st.before, null, 2));
        if (b == null) return;
        const a = prompt('変更後JSON（after）を編集してください', JSON.stringify(st.after, null, 2));
        if (a == null) return;
        pushUndo();
        st.before = JSON.parse(b);
        st.after = JSON.parse(a);
      } else if (act === 'export') {
        downloadText('kintone-preview-fields.json', JSON.stringify({ properties: st.after }, null, 2), 'application/json');
      }
      render();
    } catch (e) {
      setStatus(`プレビュー差分エディタエラー: ${e.message || String(e)}`, true);
    }
  });

  root.addEventListener('dragstart', (ev) => {
    const card = ev.target.closest('[data-rpp-code]');
    if (!card) return;
    st.dragCode = card.dataset.rppCode || '';
    ev.dataTransfer.effectAllowed = 'move';
  });

  root.addEventListener('dragover', (ev) => {
    if (!st.dragCode) return;
    const card = ev.target.closest('[data-rpp-code]');
    if (!card) return;
    ev.preventDefault();
    ev.dataTransfer.dropEffect = 'move';
  });

  root.addEventListener('drop', (ev) => {
    const card = ev.target.closest('[data-rpp-code]');
    if (!card || !st.dragCode) return;
    ev.preventDefault();
    const target = card.dataset.rppCode || '';
    if (!target || target === st.dragCode) return;
    const src = st.after[st.dragCode] || st.before[st.dragCode];
    const tgt = st.after[target];
    if (!src || !tgt) return;
    if (!confirm(`${st.dragCode} の設定で ${target} を上書きしますか？`)) return;
    pushUndo();
    const keep = { code: tgt.code, type: tgt.type };
    Object.keys(tgt).forEach((k) => { if (k !== 'code' && k !== 'type') delete tgt[k]; });
    Object.keys(src).forEach((k) => {
      if (k === 'code' || k === 'type') return;
      tgt[k] = deepClone(src[k]);
    });
    tgt.code = keep.code;
    tgt.type = keep.type;
    setStatus(`${st.dragCode} → ${target} の設定上書きを実行しました`);
    render();
  });

  render();
}
