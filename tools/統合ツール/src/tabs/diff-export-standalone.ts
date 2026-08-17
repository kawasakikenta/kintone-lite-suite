'use strict';

import { downloadText, buildExportFilename, appLabelFromBundle } from '../utils.js';
import { countActualDiffRows } from '../diff/engine.js';
import { buildDiffHtml } from '../diff/export.js';

function warningInfoLite(rows: any[], fetchIssues: any[], partialIssues: any[] = []) {
  const diffCount = countActualDiffRows(rows || []);
  const issueCount = (fetchIssues || []).length;
  const partialIssueCount = partialIssues.length;
  const total = diffCount + issueCount + partialIssueCount;
  return { threshold: 0, diffCount, issueCount, partialIssueCount, total, exceeded: false };
}

/** 比較元・比較先バンドルから「比較元_vs_比較先」のファイル名ラベルを作る。 */
function diffPairLabel(sourceBundle: any, targetBundle: any): string {
  const src = appLabelFromBundle(sourceBundle);
  const tgt = appLabelFromBundle(targetBundle);
  if (src && tgt) return `${src}_vs_${tgt}`;
  return src || tgt || '';
}

/**
 * @param {{
 *   rows: object[],
 *   fetchIssues: object[],
 *   sourceBundle: object,
 *   targetBundle: object,
 *   scopes: string[],
 *   ignoreKeys: string,
 *   normalizationPresetState: object,
 *   exportContentMode?: 'diffOnly'|'withCompared',
 *   exportContentLabel?: string
 * }} ctx
 */
export function buildDiffHtmlStandaloneExport(ctx) {
  const rows = ctx.rows || [];
  const fetchIssues = ctx.fetchIssues || [];
  const partialIssues = ctx.partialIssues || [];
  const scopes = ctx.scopes || [];
  const exportMode = ctx.exportMode || 'all';
  const exportLabel = ctx.exportLabel || (exportMode === 'all' ? '全差分' : '表示中（フィルタ適用後）');
  const exportContentMode = ctx.exportContentMode === 'withCompared' ? 'withCompared' : 'diffOnly';
  const exportContentLabel = ctx.exportContentLabel || (exportContentMode === 'withCompared'
    ? '比較設定込み（フィールド詳細・反映JSON）'
    : '差分行のみ（安全共有向け）');
  const html = buildDiffHtml(ctx.sourceBundle, ctx.targetBundle, rows, scopes, ctx.ignoreKeys || '', {
    fetchIssues,
    partialIssues,
    exportMode,
    exportLabel,
    exportContentMode,
    exportContentLabel,
    normalizationState: ctx.normalizationPresetState || ({} as any),
    warning: warningInfoLite(rows, fetchIssues, partialIssues),
    truncation: ctx.truncation || null
  });
  const filename = buildExportFilename('差分', 'html', { appLabel: diffPairLabel(ctx.sourceBundle, ctx.targetBundle) });
  return { filename, html };
}

export function runExportDiffHtmlStandalone(ctx) {
  const output = buildDiffHtmlStandaloneExport(ctx);
  downloadText(output.filename, output.html, 'text/html');
  return output;
}
