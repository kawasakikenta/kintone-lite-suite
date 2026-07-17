'use strict';

import { downloadText, buildExportFilename, appLabelFromBundle } from '../utils.js';
import { countActualDiffRows } from '../diff/engine.js';
import { buildDiffHtml } from '../diff/export.js';

function warningInfoLite(rows: any[], fetchIssues: any[]) {
  const diffCount = countActualDiffRows(rows || []);
  const issueCount = (fetchIssues || []).length;
  const total = diffCount + issueCount;
  return { threshold: 0, diffCount, issueCount, total, exceeded: false };
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
 *   normalizationPresetState: object
 * }} ctx
 */
export function runExportDiffHtmlStandalone(ctx) {
  const rows = ctx.rows || [];
  const fetchIssues = ctx.fetchIssues || [];
  const scopes = ctx.scopes || [];
  if (!rows.length && !fetchIssues.length) {
    throw new Error('出力できる比較結果がありません');
  }
  const html = buildDiffHtml(ctx.sourceBundle, ctx.targetBundle, rows, scopes, ctx.ignoreKeys || '', {
    fetchIssues,
    exportMode: 'all',
    exportLabel: '全差分',
    normalizationState: ctx.normalizationPresetState || ({} as any),
    warning: warningInfoLite(rows, fetchIssues),
    truncation: ctx.truncation || null
  });
  downloadText(buildExportFilename('差分', 'html', { appLabel: diffPairLabel(ctx.sourceBundle, ctx.targetBundle) }), html, 'text/html');
}
