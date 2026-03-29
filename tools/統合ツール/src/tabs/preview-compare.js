'use strict';

import { PREVIEW_COMPARE_PRESETS } from '../constants.js';
import { buildApiPrefix } from '../api.js';
import { esc } from '../utils.js';

export function findMatchingPresetId(ui) {
  if (!ui?.sourcePreview || !ui?.targetPreview) return null;
  const sp = !!ui.sourcePreview.checked;
  const tp = !!ui.targetPreview.checked;
  const m = PREVIEW_COMPARE_PRESETS.find((p) => p.sourcePreview === sp && p.targetPreview === tp);
  return m ? m.id : null;
}

export function getPreviewPresetById(id) {
  return PREVIEW_COMPARE_PRESETS.find((p) => p.id === id) || null;
}

export function applyPreviewPreset(ui, presetId) {
  const p = getPreviewPresetById(presetId);
  if (!p || !ui?.sourcePreview || !ui?.targetPreview) return;
  ui.sourcePreview.checked = !!p.sourcePreview;
  ui.targetPreview.checked = !!p.targetPreview;
}

export function getPreviewCompareStatusPrefix(ui) {
  const id = findMatchingPresetId(ui);
  if (id) {
    const p = getPreviewPresetById(id);
    if (p) return `〔${p.label}〕`;
  }
  return '〔カスタム環境〕';
}

export function syncPreviewPresetButtons(root, ui) {
  if (!root) return;
  const id = findMatchingPresetId(ui);
  root.querySelectorAll('[data-act="setPreviewPreset"]').forEach((btn) => {
    const pid = btn.dataset.preset || '';
    const match = pid === id;
    btn.classList.toggle('is-active', !!match);
    btn.setAttribute('aria-pressed', match ? 'true' : 'false');
  });
  const note = root.querySelector('#u_previewPresetCustomNote');
  if (note) note.style.display = id ? 'none' : 'block';
}

export function renderPreviewCompareSummary(root, ui) {
  const el = root?.querySelector?.('#u_previewCompareSummary');
  if (!el || !ui?.sourcePreview || !ui?.targetPreview) return;

  const sg = (ui.sourceGuest?.value || '').trim();
  const tg = (ui.targetGuest?.value || '').trim();
  const sp = !!ui.sourcePreview.checked;
  const tp = !!ui.targetPreview.checked;
  const srcPrefix = buildApiPrefix(sg, sp);
  const tgtPrefix = buildApiPrefix(tg, tp);
  const presetId = findMatchingPresetId(ui);
  const preset = presetId ? getPreviewPresetById(presetId) : null;

  const guestLine = (label, g) => {
    if (!g) return `${label}: 通常スペース`;
    return `${label}: ゲスト ${esc(g)}`;
  };

  const head = preset
    ? `<div class="pcs-head"><span class="pcs-badge">選択中</span> <strong>${esc(preset.label)}</strong></div><p class="pcs-hint">${esc(preset.hint)}</p>`
    : '<div class="pcs-head"><span class="pcs-badge pcs-badge-custom">カスタム</span> <strong>チェックボックスで個別指定</strong></div><p class="pcs-hint">4パターン以外の組み合わせです。下のチェックで比較元・比較先それぞれのプレビューON/OFFを調整できます。</p>';

  el.innerHTML =
    `${head}` +
    '<ul class="pcs-api-list">' +
    `<li><span class="pcs-k">比較元GET</span> <code class="pcs-code">${esc(srcPrefix)}</code> …</li>` +
    `<li><span class="pcs-k">比較先GET</span> <code class="pcs-code">${esc(tgtPrefix)}</code> …</li>` +
    `<li class="pcs-meta">${guestLine('比較元', sg)} · ${guestLine('比較先', tg)}</li>` +
    '</ul>' +
    '<p class="pcs-footnote">プレビュー反映タブの<strong>PUT（設定書き込み）</strong>は、安全のため常に「比較先アプリのプレビューAPI」に対して行われます（上の「比較先GET」が本番でも同様）。本番環境への直接PUTは行いません。デプロイは別操作です。</p>';
}

export function syncPreviewComparePanel(root, ui) {
  syncPreviewPresetButtons(root, ui);
  renderPreviewCompareSummary(root, ui);
}
