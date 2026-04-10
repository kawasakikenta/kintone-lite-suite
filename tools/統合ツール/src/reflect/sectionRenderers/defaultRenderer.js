'use strict';

import { esc } from '../../utils.js';

export function createDefaultSectionRenderer() {
  function renderDiff({ row, helpers }) {
    const { formatJson } = helpers;
    if (row.status === 'modified' && row.changes.length) {
      return `<table class="rpp-table"><thead><tr><th>プロパティ</th><th>比較元</th><th>比較先</th></tr></thead><tbody>${row.changes.map((ch) => `<tr><td>${esc(ch.prop)}</td><td><pre>${esc(formatJson(ch.before))}</pre></td><td><pre>${esc(formatJson(ch.after))}</pre></td></tr>`).join('')}</tbody></table>`;
    }
    if (row.status === 'modified') {
      return `<div class="rpp-preview-grid"><div><div class="rpp-preview-head">比較元</div><div class="rpp-preview-body"><pre class="rpp-pre">${esc(formatJson(row.before))}</pre></div></div><div><div class="rpp-preview-head">比較先</div><div class="rpp-preview-body"><pre class="rpp-pre">${esc(formatJson(row.after))}</pre></div></div></div>`;
    }
    return `<pre class="rpp-pre">${esc(formatJson(row.after || row.before))}</pre>`;
  }

  function renderPreview({ row, helpers }) {
    return renderDiff({ row, helpers });
  }

  return { renderDiff, renderPreview };
}
