'use strict';

import { SECTION_DEFS } from '../constants.js';
import { state, ui } from '../state.js';
import { esc, selectedScopeKeys } from '../utils.js';
import { apiGet, fetchBundle, pickBundleSections } from '../api.js';
import { getActualDiffRows } from '../diff/engine.js';
import { setStatus } from '../ui/components.js';
import { commonParams, currentDiffSignature, runDiff, saveCurrentDialogState } from '../tabs/diff.js';
import { parseLookupMapInput } from '../tabs/field.js';
import {
  loadReflectRowsFromLastDiff,
  getSelectedReflectRows,
  getEffectiveReflectScopeInfo,
  pushReflectUndo
} from '../tabs/reflect.js';
import {
  renderReflectAssistPanel,
  renderReflectMainPanel,
  renderReflectNodeList
} from '../ui/components.js';

export {
  commonParams,
  setStatus,
  selectedScopeKeys,
  parseLookupMapInput,
  getSelectedReflectRows,
  getEffectiveReflectScopeInfo,
  saveCurrentDialogState,
  loadReflectRowsFromLastDiff,
  renderReflectAssistPanel,
  renderReflectMainPanel,
  pushReflectUndo,
  renderReflectNodeList
};

export function diffSectionKeySet() {
  const set = new Set();
  for (const row of getActualDiffRows(state.lastDiffRows || [])) {
    let key = row.sectionKey;
    if (!key && row.section) {
      const def = SECTION_DEFS.find((d) => d.label === row.section || d.key === row.section);
      if (def) key = def.key;
    }
    if (key) set.add(key);
  }
  return set;
}

export async function ensureDiffPreparedForReflect() {
  const sig = currentDiffSignature();
  if (state.lastDiffAt && state.lastDiffSignature === sig) return;
  setStatus('差分が未作成または条件変更のため、自動で差分比較を実行します...');
  await runDiff();
}

export function resolveApplyScopes(baseScopes) {
  let scopes = [...baseScopes];
  if (!ui.applyDiffOnly.checked) return scopes;
  const diffSet = diffSectionKeySet();
  if (!diffSet.size) throw new Error('「前回差分のあるセクションのみ反映」がONのため先に差分比較が必要です。差分なしで反映する場合はこのチェックをOFFにしてください');
  scopes = scopes.filter((k) => diffSet.has(k));
  if (!scopes.length) throw new Error('選択中の反映セクションに差分がありません');
  return scopes;
}

export async function getSourceBundleForApply(c, scopes) {
  let sourceBundle = state.lastSourceBundle || state.importedSourceBundle;
  if (!sourceBundle) {
    if (!c.source.appId) throw new Error('比較元アプリIDを入力してください');
    setStatus('比較元設定を取得中...');
    sourceBundle = await fetchBundle({
      ...c.source,
      sections: scopes,
      onProgress: (p, l) => setStatus(`比較元取得中 ${Math.round(p * 100)}% (${l})`)
    });
    state.lastSourceBundle = sourceBundle;
  } else {
    sourceBundle = pickBundleSections(sourceBundle, scopes);
  }
  return sourceBundle;
}

export function renderProgressLog(logs, options = {}) {
  const { phase, current, total } = options;
  const progressBar = (typeof current === 'number' && total > 0)
    ? `<div style="height:6px;background:#e2e8f0;border-radius:3px;margin:8px 10px 0"><div style="width:${Math.round(((current + 1) / total) * 100)}%;height:100%;background:#3b82f6;border-radius:3px;transition:width .3s"></div></div>`
    : '';
  const phaseLabel = phase
    ? `<div style="font-weight:700;padding:8px 10px;border-bottom:1px solid #e2e8f0;font-size:13px">${esc(phase)}</div>`
    : '';
  const colored = logs.map((line) => {
    if (line.startsWith('OK ')) return `<span style="color:#166534">${esc(line)}</span>`;
    if (line.startsWith('NG ')) return `<span style="color:#b91c1c">${esc(line)}</span>`;
    if (line.startsWith('SKIP ')) return `<span style="color:#92400e">${esc(line)}</span>`;
    if (line.startsWith('START ')) return `<span style="color:#1d4ed8">${esc(line)}</span>`;
    if (line.startsWith('PLAN ')) return `<span style="color:#1d4ed8">${esc(line)}</span>`;
    return esc(line);
  }).join('\n');
  ui.result.innerHTML = `${phaseLabel}${progressBar}<pre style="margin:0;padding:10px;font-size:12px;white-space:pre-wrap">${colored}</pre>`;
  ui.result.scrollTop = ui.result.scrollHeight;
}

export function appendProgressSummary(logs) {
  const ok = logs.filter((l) => l.startsWith('OK ')).length;
  const ng = logs.filter((l) => l.startsWith('NG ')).length;
  const skip = logs.filter((l) => l.startsWith('SKIP ')).length;
  logs.push('');
  logs.push(`=== 完了: OK ${ok} / NG ${ng} / SKIP ${skip} ===`);
}

