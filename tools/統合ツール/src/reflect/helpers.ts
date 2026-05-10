'use strict';

import { SECTION_DEFS } from '../constants.js';
import { state, ui } from '../state.js';
import { esc, selectedScopeKeys, renderSectionIconHtml } from '../utils.js';
import { classifyLogLine, buildGanttHtmlFromLogs } from './progress-pure.js';
import { fetchBundle, pickBundleSections } from '../api.js';
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

export function diffSectionKeySet(): Set<string> {
  const set = new Set<string>();
  for (const row of getActualDiffRows(state.lastDiffRows || []) as any[]) {
    let key: string | undefined = row.sectionKey;
    if (!key && row.section) {
      const def = SECTION_DEFS.find((d) => d.label === row.section || d.key === row.section);
      if (def) key = def.key;
    }
    if (key) set.add(key);
  }
  return set;
}

export async function ensureDiffPreparedForReflect(): Promise<void> {
  const sig = currentDiffSignature();
  if (state.lastDiffAt && state.lastDiffSignature === sig) return;
  setStatus('差分が未作成または条件変更のため、自動で差分比較を実行します...');
  await runDiff();
}

export function resolveApplyScopes(baseScopes: readonly string[]): string[] {
  let scopes = [...baseScopes];
  if (!ui.applyDiffOnly?.checked) return scopes;
  const diffSet = diffSectionKeySet();
  if (!diffSet.size) throw new Error('「前回差分のあるセクションのみ反映」がONのため先に差分比較が必要です。差分なしで反映する場合はこのチェックをOFFにしてください');
  scopes = scopes.filter((k) => diffSet.has(k));
  if (!scopes.length) throw new Error('選択中の反映対象セクションに差分がありません');
  return scopes;
}

export interface CommonParamsLike {
  source: {
    appId: string | number;
    guestId?: string | number;
    preview: boolean;
  };
  target?: {
    appId?: string | number;
    guestId?: string | number;
    preview?: boolean;
  };
  [key: string]: any;
}

export async function getSourceBundleForApply(c: CommonParamsLike, scopes: readonly string[]): Promise<any> {
  let sourceBundle = state.lastSourceBundle || state.importedSourceBundle;
  if (!sourceBundle) {
    if (!c.source.appId) throw new Error('比較元アプリIDを入力してください');
    setStatus('比較元設定を取得中...');
    sourceBundle = await fetchBundle({
      appId: c.source.appId,
      guestId: c.source.guestId,
      preview: c.source.preview,
      sections: scopes,
      onProgress: (p: number, l: string) => setStatus(`比較元取得中 ${Math.round(p * 100)}% (${l})`)
    });
    state.lastSourceBundle = sourceBundle;
  } else {
    sourceBundle = pickBundleSections(sourceBundle, scopes);
  }
  return sourceBundle;
}

export interface ProgressLogOptions {
  phase?: string;
  current?: number;
  total?: number;
  scopes?: readonly string[];
  perSection?: ReadonlyArray<{ sectionKey: string; label?: string; status: 'pending' | 'running' | 'ok' | 'ng' | 'skip'; durationMs?: number }>;
}

// classifyLogLine / buildGanttHtmlFromLogs は副作用のない純粋関数として
// progress-pure.ts に分離した（DOM 書き込み層から切り離して再利用しやすくするため）。

export function renderProgressLog(logs: string[], options: ProgressLogOptions = {}): void {
  const { phase, current, total, scopes } = options;
  const progressBar = (typeof current === 'number' && typeof total === 'number' && total > 0)
    ? `<div class="reflect-log-progress"><div class="reflect-log-progress__bar" style="width:${Math.round(((current + 1) / total) * 100)}%"></div><span class="reflect-log-progress__text">${Math.min(current + 1, total)} / ${total}</span></div>`
    : '';
  const phaseLabel = phase
    ? `<div class="reflect-log-phase">${esc(phase)}</div>`
    : '';
  const ganttHtml = buildGanttHtmlFromLogs(logs, scopes);
  const okCount = logs.filter((l) => l.startsWith('OK ')).length;
  const ngCount = logs.filter((l) => l.startsWith('NG ')).length;
  const skipCount = logs.filter((l) => l.startsWith('SKIP ')).length;
  const counterChips = (okCount + ngCount + skipCount > 0)
    ? `<div class="reflect-log-counters">
        ${okCount ? `<span class="reflect-log-chip ok" title="成功">✓ ${okCount}</span>` : ''}
        ${ngCount ? `<span class="reflect-log-chip ng" title="失敗">✗ ${ngCount}</span>` : ''}
        ${skipCount ? `<span class="reflect-log-chip skip" title="スキップ">⊘ ${skipCount}</span>` : ''}
      </div>`
    : '';
  const items = logs.map((line) => {
    const { tone, icon, rest } = classifyLogLine(line);
    if (tone === 'blank') return '<div class="reflect-log-line reflect-log-line--blank"></div>';
    const iconSpan = icon ? `<span class="reflect-log-line__icon">${esc(icon)}</span>` : '';
    return `<div class="reflect-log-line reflect-log-line--${tone}">${iconSpan}<span class="reflect-log-line__text">${esc(rest)}</span></div>`;
  }).join('');
  if (ui.result) {
    ui.result.innerHTML = `<div class="reflect-log-host">
      ${phaseLabel}${progressBar}${counterChips}
      ${ganttHtml}
      <div class="reflect-log-body">${items}</div>
    </div>`;
    ui.result.scrollTop = ui.result.scrollHeight;
  }
}

export function appendProgressSummary(logs: string[]): void {
  const ok = logs.filter((l) => l.startsWith('OK ')).length;
  const ng = logs.filter((l) => l.startsWith('NG ')).length;
  const skip = logs.filter((l) => l.startsWith('SKIP ')).length;
  logs.push('');
  logs.push(`=== 完了: OK ${ok} / NG ${ng} / SKIP ${skip} ===`);
}
