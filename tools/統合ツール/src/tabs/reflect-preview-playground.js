'use strict';

import { deepClone, esc, downloadText } from '../utils.js';
import { state } from '../state.js';

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
const FIELD_TYPES = [
  { value: 'SINGLE_LINE_TEXT', label: '文字列(1行)' },
  { value: 'MULTI_LINE_TEXT', label: '文字列(複数行)' },
  { value: 'RICH_TEXT', label: 'リッチエディター' },
  { value: 'NUMBER', label: '数値' },
  { value: 'CHECK_BOX', label: 'チェックボックス' },
  { value: 'RADIO_BUTTON', label: 'ラジオボタン' },
  { value: 'DROP_DOWN', label: 'ドロップダウン' },
  { value: 'MULTI_SELECT', label: '複数選択' },
  { value: 'DATE', label: '日付' },
  { value: 'TIME', label: '時刻' },
  { value: 'DATETIME', label: '日時' },
  { value: 'LINK', label: 'リンク' },
  { value: 'USER_SELECT', label: 'ユーザー選択' },
  { value: 'FILE', label: '添付ファイル' }
];
const DEFAULT_PROPS = {
  SINGLE_LINE_TEXT: { noLabel: false, required: false, unique: false, maxLength: '', minLength: '', defaultValue: '', expression: '', hideExpression: false },
  MULTI_LINE_TEXT: { noLabel: false, required: false, defaultValue: '' },
  RICH_TEXT: { noLabel: false, required: false, defaultValue: '' },
  NUMBER: { noLabel: false, required: false, unique: false, maxValue: '', minValue: '', defaultValue: '0', digit: true, unit: '', unitPosition: 'BEFORE' },
  CHECK_BOX: { noLabel: false, required: false, defaultValue: [], options: {} },
  RADIO_BUTTON: { noLabel: false, required: true, defaultValue: '', options: {} },
  DROP_DOWN: { noLabel: false, required: false, defaultValue: '', options: {} },
  MULTI_SELECT: { noLabel: false, required: false, defaultValue: [], options: {} },
  DATE: { noLabel: false, required: false, unique: false, defaultValue: '', defaultNowValue: false },
  TIME: { noLabel: false, required: false, defaultValue: '' },
  DATETIME: { noLabel: false, required: false, unique: false, defaultValue: '', defaultNowValue: false },
  LINK: { noLabel: false, required: false, unique: false, defaultValue: '', protocol: 'WEB' },
  USER_SELECT: { noLabel: false, required: false, defaultValue: [], entities: [] },
  FILE: { noLabel: false, required: false }
};

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

function parseLooseValue(text) {
  const t = String(text || '').trim();
  if (t === '') return '';
  if (t === 'true') return true;
  if (t === 'false') return false;
  if (t[0] === '{' || t[0] === '[') return JSON.parse(t);
  return t;
}

function normalizeFieldValue(key, value) {
  if (key === 'defaultValue') {
    if (Array.isArray(value)) return value;
    if (typeof value !== 'string') return value;
    const list = value.split(',').map((s) => s.trim()).filter(Boolean);
    if (list.length > 1) return list;
    return value;
  }
  if (key === 'options') {
    if (typeof value !== 'string') return value || {};
    const lines = value.split('\n').map((s) => s.trim()).filter(Boolean);
    const out = {};
    lines.forEach((label, idx) => { out[label] = { label, index: idx }; });
    return out;
  }
  if (Array.isArray(value)) {
    if (!value.length) return [];
    return value;
  }
  return value;
}

function collectFieldFromForm(form, fallback) {
  const type = form.querySelector('[data-rpp-field="type"]')?.value || fallback?.type || 'SINGLE_LINE_TEXT';
  const code = (form.querySelector('[data-rpp-field="code"]')?.value || fallback?.code || '').trim();
  const label = (form.querySelector('[data-rpp-field="label"]')?.value || fallback?.label || '').trim();
  if (!code || !type || !label) throw new Error('code/type/label は必須です');
  const next = { type, code, label };
  const rows = form.querySelectorAll('[data-rpp-key]');
  rows.forEach((row) => {
    const key = row.getAttribute('data-rpp-key');
    const input = row.querySelector('[data-rpp-input]');
    if (!key || !input) return;
    let value;
    if (input.type === 'checkbox') value = !!input.checked;
    else value = parseLooseValue(input.value);
    next[key] = normalizeFieldValue(key, value);
  });
  return next;
}

function renderFieldFormRows(draft) {
  const keys = Object.keys(draft).filter((k) => !['type', 'code', 'label'].includes(k));
  return keys.map((key) => {
    const value = draft[key];
    if (typeof value === 'boolean') {
      return `<label class="rpp-field-row" data-rpp-key="${esc(key)}"><span>${esc(key)}</span><input data-rpp-input type="checkbox" ${value ? 'checked' : ''}></label>`;
    }
    if (key === 'unitPosition') {
      return `<label class="rpp-field-row" data-rpp-key="${esc(key)}"><span>${esc(key)}</span><select data-rpp-input><option value="BEFORE" ${value === 'BEFORE' ? 'selected' : ''}>BEFORE</option><option value="AFTER" ${value === 'AFTER' ? 'selected' : ''}>AFTER</option></select></label>`;
    }
    if (key === 'options' && value && typeof value === 'object') {
      const lines = Object.values(value).sort((a, b) => a.index - b.index).map((o) => o.label).join('\n');
      return `<label class="rpp-field-row" data-rpp-key="${esc(key)}"><span>${esc(key)}（1行1候補）</span><textarea data-rpp-input class="rpp-modal-textarea rpp-modal-textarea-mini">${esc(lines)}</textarea></label>`;
    }
    const text = typeof value === 'string' ? value : JSON.stringify(value);
    return `<label class="rpp-field-row" data-rpp-key="${esc(key)}"><span>${esc(key)}</span><input data-rpp-input type="text" value="${esc(text || '')}"></label>`;
  }).join('');
}

function extractFieldProperties(bundle) {
  const props = bundle?.sections?.fieldSettings?.properties || bundle?.sections?.fieldSettings;
  if (!props || typeof props !== 'object' || Array.isArray(props)) return null;
  return deepClone(props);
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
    dragCode: '',
    modal: null
  };

  const loadFromDiffBundles = (options = {}) => {
    const sourceProps = extractFieldProperties(state.importedSourceBundle || state.lastSourceBundle);
    const targetProps = extractFieldProperties(state.importedTargetBundle || state.lastTargetBundle);
    if (!sourceProps && !targetProps) return false;
    if (options.pushUndo) pushUndo();
    st.before = sourceProps || {};
    st.after = targetProps || {};
    st.filter = 'all';
    st.view = 'diff';
    st.expanded = new Set(
      computeDiff(st.before, st.after)
        .filter((row) => row.status !== 'unchanged')
        .slice(0, 8)
        .map((row) => row.code)
    );
    closeModal();
    if (!options.silent) setStatus('差分比較のフィールド設定をプレビューエディタへ読込しました');
    return true;
  };

  const pushUndo = () => {
    st.undo.push({ before: deepClone(st.before), after: deepClone(st.after) });
    if (st.undo.length > 20) st.undo.shift();
  };

  const parseFieldInput = (v) => {
    const obj = JSON.parse(v);
    if (!obj || typeof obj !== 'object') throw new Error('JSONオブジェクトを入力してください');
    if (!obj.code || !obj.type || !obj.label) throw new Error('code/type/label が必要です');
    return obj;
  };

  const openModal = (modal) => { st.modal = modal; };
  const closeModal = () => { st.modal = null; };

  const renderModal = () => {
    if (!st.modal) return '';
    if (st.modal.kind === 'fieldJson') {
      return `<div class="rpp-modal-backdrop" data-rpp-modal-act="cancel"><div class="rpp-modal"><div class="rpp-modal-head">${esc(st.modal.title)}</div><div class="rpp-modal-body"><textarea class="rpp-modal-textarea" data-rpp-modal-input="fieldJson">${esc(st.modal.text || '')}</textarea>${st.modal.error ? `<div class="rpp-modal-error">${esc(st.modal.error)}</div>` : ''}</div><div class="rpp-modal-actions"><button type="button" class="btn sub" data-rpp-modal-act="cancel">キャンセル</button><button type="button" class="btn ok" data-rpp-modal-act="saveFieldJson">保存</button></div></div></div>`;
    }
    if (st.modal.kind === 'pairJson') {
      return `<div class="rpp-modal-backdrop" data-rpp-modal-act="cancel"><div class="rpp-modal rpp-modal-wide"><div class="rpp-modal-head">${esc(st.modal.title)}</div><div class="rpp-modal-body rpp-modal-grid"><div><div class="rpp-modal-label">比較元JSON</div><textarea class="rpp-modal-textarea" data-rpp-modal-input="beforeJson">${esc(st.modal.beforeText || '')}</textarea></div><div><div class="rpp-modal-label">比較先JSON</div><textarea class="rpp-modal-textarea" data-rpp-modal-input="afterJson">${esc(st.modal.afterText || '')}</textarea></div>${st.modal.error ? `<div class="rpp-modal-error rpp-modal-error-full">${esc(st.modal.error)}</div>` : ''}</div><div class="rpp-modal-actions"><button type="button" class="btn sub" data-rpp-modal-act="cancel">キャンセル</button><button type="button" class="btn ok" data-rpp-modal-act="savePairJson">適用</button></div></div></div>`;
    }
    if (st.modal.kind === 'confirm') {
      return `<div class="rpp-modal-backdrop" data-rpp-modal-act="cancel"><div class="rpp-modal"><div class="rpp-modal-head">${esc(st.modal.title)}</div><div class="rpp-modal-body"><p class="rpp-modal-confirm">${esc(st.modal.message)}</p></div><div class="rpp-modal-actions"><button type="button" class="btn sub" data-rpp-modal-act="cancel">キャンセル</button><button type="button" class="btn ok" data-rpp-modal-act="confirmAction">実行</button></div></div></div>`;
    }
    if (st.modal.kind === 'fieldForm') {
      return `<div class="rpp-modal-backdrop" data-rpp-modal-act="cancel"><div class="rpp-modal"><div class="rpp-modal-head">${esc(st.modal.title)}</div><div class="rpp-modal-body"><div class="rpp-field-grid"><label class="rpp-field-row"><span>type</span>${st.modal.mode === 'edit' ? `<input data-rpp-field="type" type="text" value="${esc(st.modal.draft.type)}" readonly>` : `<select data-rpp-field="type">${FIELD_TYPES.map((t) => `<option value="${esc(t.value)}" ${st.modal.draft.type === t.value ? 'selected' : ''}>${esc(t.label)}</option>`).join('')}</select>`}</label><label class="rpp-field-row"><span>code</span><input data-rpp-field="code" type="text" value="${esc(st.modal.draft.code || '')}" ${st.modal.mode === 'edit' ? 'readonly' : ''}></label><label class="rpp-field-row"><span>label</span><input data-rpp-field="label" type="text" value="${esc(st.modal.draft.label || '')}"></label>${renderFieldFormRows(st.modal.draft)}</div><div class="rpp-modal-hint">詳細JSONでの編集が必要な場合は「JSON編集」を利用してください。</div>${st.modal.error ? `<div class="rpp-modal-error">${esc(st.modal.error)}</div>` : ''}</div><div class="rpp-modal-actions"><button type="button" class="btn sub" data-rpp-modal-act="cancel">キャンセル</button><button type="button" class="btn sub" data-rpp-modal-act="switchFieldJson">JSON編集</button><button type="button" class="btn ok" data-rpp-modal-act="saveFieldForm">保存</button></div></div></div>`;
    }
    return '';
  };

  const render = () => {
    const diff = computeDiff(st.before, st.after);
    const rows = st.filter === 'all' ? diff : diff.filter((r) => r.status === st.filter);
    const stats = { added: 0, removed: 0, modified: 0, unchanged: 0 };
    diff.forEach((d) => { stats[d.status] += 1; });

    root.innerHTML = `
      <div class="rpp-toolbar">
        <button type="button" class="btn sub" data-rpp-act="loadSample">サンプル</button>
        <button type="button" class="btn sub" data-rpp-act="loadDiff">差分比較から読込</button>
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
            : `<div class="rpp-preview-grid"><div><div class="rpp-preview-head">比較元</div><div class="rpp-preview-body">${row.before ? esc(row.before.label || row.before.code || '-') : 'なし'}</div></div><div><div class="rpp-preview-head">比較先</div><div class="rpp-preview-body">${row.after ? esc(row.after.label || row.after.code || '-') : 'なし'}</div></div></div>`;
          return `<div class="rpp-card" draggable="true" data-rpp-code="${esc(row.code)}"><div class="rpp-head"><button type="button" class="rpp-open" data-rpp-act="toggle" data-code="${esc(row.code)}">${opened ? '▾' : '▸'}</button><span class="rpp-badge rpp-${row.status}">${STATUS_LABELS[row.status]}</span><strong>${esc(label)}</strong><code>${esc(row.code)}</code><span class="rpp-spacer"></span>${row.after ? `<button type="button" class="btn sub" data-rpp-act="edit" data-code="${esc(row.code)}">編集</button><button type="button" class="btn sub" data-rpp-act="delete" data-code="${esc(row.code)}">削除</button>` : `<button type="button" class="btn sub" data-rpp-act="restore" data-code="${esc(row.code)}">復元</button>`}</div>${opened ? `<div class="rpp-body">${body}</div>` : ''}</div>`;
        }).join('') || '<div class="muted" style="padding:12px">表示対象がありません</div>'}
      </div>
      ${renderModal()}`;
  };

  root.addEventListener('click', (ev) => {
    const insideModalContent = ev.target.closest('.rpp-modal');
    const rawModalActionEl = ev.target.closest('[data-rpp-modal-act]');
    // モーダル内(.rpp-modal)をクリックした場合、backdrop のアクションがバブルで拾われないよう制限する
    const modalActionEl = (insideModalContent && rawModalActionEl && !insideModalContent.contains(rawModalActionEl))
      ? null
      : rawModalActionEl;
    if (st.modal && !modalActionEl && insideModalContent) return;
    const modalAct = modalActionEl?.dataset.rppModalAct;
    if (modalAct) {
      try {
        if (modalAct === 'cancel') {
          closeModal();
          render();
          return;
        }
        if (modalAct === 'saveFieldJson' && st.modal?.kind === 'fieldJson') {
          const raw = root.querySelector('[data-rpp-modal-input="fieldJson"]')?.value || '';
          const parsed = parseFieldInput(raw);
          pushUndo();
          if (st.modal.mode === 'add') {
            st.after[parsed.code] = parsed;
            setStatus(`${parsed.code} を追加しました`);
          } else if (st.modal.mode === 'edit') {
            const oldCode = st.modal.code || parsed.code;
            st.after[oldCode] = parsed;
            if (oldCode !== parsed.code) {
              st.after[parsed.code] = st.after[oldCode];
              delete st.after[oldCode];
            }
            setStatus(`${parsed.code} を更新しました`);
          }
          closeModal();
          render();
          return;
        }
        if (modalAct === 'switchFieldJson' && st.modal?.kind === 'fieldForm') {
          openModal({ kind: 'fieldJson', mode: st.modal.mode, code: st.modal.code || st.modal.draft.code, title: `${st.modal.title}（JSON）`, text: JSON.stringify(st.modal.draft, null, 2), error: '' });
          render();
          return;
        }
        if (modalAct === 'saveFieldForm' && st.modal?.kind === 'fieldForm') {
          const form = root.querySelector('.rpp-field-grid');
          const parsed = collectFieldFromForm(form, st.modal.draft);
          pushUndo();
          if (st.modal.mode === 'add') {
            if (st.after[parsed.code]) throw new Error(`code "${parsed.code}" は既に存在します`);
            st.after[parsed.code] = parsed;
            setStatus(`${parsed.code} を追加しました`);
          } else if (st.modal.mode === 'edit') {
            st.after[parsed.code] = parsed;
            setStatus(`${parsed.code} を更新しました`);
          }
          closeModal();
          render();
          return;
        }
        if (modalAct === 'savePairJson' && st.modal?.kind === 'pairJson') {
          const b = root.querySelector('[data-rpp-modal-input="beforeJson"]')?.value || '';
          const a = root.querySelector('[data-rpp-modal-input="afterJson"]')?.value || '';
          pushUndo();
          st.before = JSON.parse(b);
          st.after = JSON.parse(a);
          closeModal();
          setStatus('before/after JSON を更新しました');
          render();
          return;
        }
        if (modalAct === 'confirmAction' && st.modal?.kind === 'confirm') {
          const payload = st.modal.payload || {};
          if (st.modal.mode === 'delete') {
            pushUndo();
            delete st.after[payload.code];
            setStatus(`${payload.code} を削除しました`);
          } else if (st.modal.mode === 'overwrite') {
            const src = st.after[payload.sourceCode] || st.before[payload.sourceCode];
            const tgt = st.after[payload.targetCode];
            if (src && tgt) {
              pushUndo();
              const keep = { code: tgt.code, type: tgt.type };
              Object.keys(tgt).forEach((k) => { if (k !== 'code' && k !== 'type') delete tgt[k]; });
              Object.keys(src).forEach((k) => {
                if (k === 'code' || k === 'type') return;
                tgt[k] = deepClone(src[k]);
              });
              tgt.code = keep.code;
              tgt.type = keep.type;
              setStatus(`${payload.sourceCode} → ${payload.targetCode} の設定上書きを実行しました`);
            }
          }
          closeModal();
          render();
          return;
        }
      } catch (e) {
        if (st.modal && (st.modal.kind === 'fieldJson' || st.modal.kind === 'pairJson' || st.modal.kind === 'fieldForm')) {
          st.modal.error = e.message || String(e);
          render();
          return;
        }
        setStatus(`プレビュー差分エディタエラー: ${e.message || String(e)}`, true);
        return;
      }
    }

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
      } else if (act === 'loadDiff') {
        if (!loadFromDiffBundles({ pushUndo: true })) throw new Error('先に差分比較を実行し、fieldSettings を取得してください');
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
        openModal({ kind: 'confirm', mode: 'delete', title: 'フィールド削除の確認', message: `${code} を削除しますか？`, payload: { code } });
      } else if (act === 'restore') {
        if (!st.before[code]) return;
        pushUndo();
        st.after[code] = deepClone(st.before[code]);
        setStatus(`${code} を復元しました`);
      } else if (act === 'edit') {
        const cur = st.after[code];
        if (!cur) return;
        openModal({ kind: 'fieldForm', mode: 'edit', code, title: `${code} の編集`, draft: deepClone(cur), error: '' });
      } else if (act === 'add') {
        openModal({ kind: 'fieldForm', mode: 'add', title: 'フィールド追加', draft: { type: 'SINGLE_LINE_TEXT', code: `new_field_${Object.keys(st.after).length + 1}`, label: '新規フィールド', ...deepClone(DEFAULT_PROPS.SINGLE_LINE_TEXT) }, error: '' });
      } else if (act === 'editJson') {
        openModal({ kind: 'pairJson', title: 'before / after JSON 編集', beforeText: JSON.stringify(st.before, null, 2), afterText: JSON.stringify(st.after, null, 2), error: '' });
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
    openModal({ kind: 'confirm', mode: 'overwrite', title: '設定上書きの確認', message: `${st.dragCode} の設定で ${target} を上書きしますか？`, payload: { sourceCode: st.dragCode, targetCode: target } });
    render();
  });

  root.addEventListener('change', (ev) => {
    if (st.modal?.kind !== 'fieldForm' || st.modal.mode !== 'add') return;
    const sel = ev.target.closest('[data-rpp-field="type"]');
    if (!sel) return;
    const form = root.querySelector('.rpp-field-grid');
    const currentCode = form?.querySelector('[data-rpp-field="code"]')?.value || st.modal.draft.code;
    const currentLabel = form?.querySelector('[data-rpp-field="label"]')?.value || st.modal.draft.label;
    const type = sel.value || 'SINGLE_LINE_TEXT';
    st.modal.draft = { type, code: currentCode, label: currentLabel, ...deepClone(DEFAULT_PROPS[type] || {}) };
    render();
  });

  loadFromDiffBundles({ silent: true });
  render();
}
