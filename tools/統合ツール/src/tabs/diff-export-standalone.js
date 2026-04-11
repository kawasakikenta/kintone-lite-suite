'use strict';

import { nowStamp, downloadText } from '../utils.js';
import { countActualDiffRows } from '../diff/engine.js';
import {
  buildDiffHtml,
  buildPatchPayload,
  buildDiffExportPayload,
  getDiffExportContentLabel,
  buildDiffExportComparedBundles
} from '../diff/export.js';

function shouldIncludeComparedContent(mode) {
  return mode === 'withCompared';
}

function comparedScopesForExport(exportInfo, scopes, fetchIssues) {
  const fallback = [...new Set((scopes || []).filter(Boolean))];
  if ((exportInfo?.mode || 'all') === 'all') return fallback;
  const rowScopes = [...new Set((exportInfo?.rows || []).map((r) => r.sectionKey).filter(Boolean))];
  if (rowScopes.length) return rowScopes;
  const issueScopes = [...new Set((fetchIssues || []).map((i) => i.sectionKey).filter(Boolean))];
  return issueScopes.length ? issueScopes : fallback;
}

function warningInfoLite(rows, fetchIssues) {
  const diffCount = countActualDiffRows(rows || []);
  const issueCount = (fetchIssues || []).length;
  const total = diffCount + issueCount;
  return { threshold: 0, diffCount, issueCount, total, exceeded: false };
}

/**
 * @param {{
 *   rows: object[],
 *   fetchIssues: object[],
 *   sourceBundle: object,
 *   targetBundle: object,
 *   scopes: string[],
 *   ignoreKeys: string,
 *   exportContentMode: string,
 *   normalizationPresetState: object
 * }} ctx
 */
export function runExportDiffJsonStandalone(ctx) {
  const rows = ctx.rows || [];
  const fetchIssues = ctx.fetchIssues || [];
  const exportInfo = { mode: 'all', label: '全差分', rows };
  const exportContentMode = ctx.exportContentMode || 'diffOnly';
  const compareInfo = shouldIncludeComparedContent(exportContentMode)
    ? buildDiffExportComparedBundles(
        ctx.sourceBundle,
        ctx.targetBundle,
        comparedScopesForExport(exportInfo, ctx.scopes, fetchIssues)
      )
    : null;
  if (!rows.length && !fetchIssues.length && !compareInfo?.scopes?.length) {
    throw new Error('出力できる比較結果がありません');
  }
  const payload = buildDiffExportPayload({
    sourceBundle: ctx.sourceBundle,
    targetBundle: ctx.targetBundle,
    rows,
    fetchIssues,
    ignoreKeys: ctx.ignoreKeys || '',
    exportMode: exportInfo.mode,
    exportLabel: exportInfo.label,
    exportContentMode,
    exportContentLabel: getDiffExportContentLabel(exportContentMode),
    normalizationState: ctx.normalizationPresetState || {},
    warning: warningInfoLite(rows, fetchIssues),
    compareScopes: compareInfo?.scopes || [],
    compareSourceBundle: compareInfo?.sourceBundle || null,
    compareTargetBundle: compareInfo?.targetBundle || null
  });
  downloadText(`diff_${nowStamp()}.json`, JSON.stringify(payload, null, 2), 'application/json');
}

/**
 * @param {Parameters<typeof runExportDiffJsonStandalone>[0]} ctx
 */
export function runExportDiffHtmlStandalone(ctx) {
  const rows = ctx.rows || [];
  const fetchIssues = ctx.fetchIssues || [];
  const scopes = ctx.scopes || [];
  const exportInfo = { mode: 'all', label: '全差分', rows };
  const exportContentMode = ctx.exportContentMode || 'diffOnly';
  const compareInfo = shouldIncludeComparedContent(exportContentMode)
    ? buildDiffExportComparedBundles(
        ctx.sourceBundle,
        ctx.targetBundle,
        comparedScopesForExport(exportInfo, scopes, fetchIssues)
      )
    : null;
  if (!rows.length && !fetchIssues.length && !compareInfo?.scopes?.length) {
    throw new Error('出力できる比較結果がありません');
  }
  const html = buildDiffHtml(ctx.sourceBundle, ctx.targetBundle, rows, scopes, ctx.ignoreKeys || '', {
    fetchIssues,
    exportMode: exportInfo.mode,
    exportLabel: exportInfo.label,
    exportContentMode,
    exportContentLabel: getDiffExportContentLabel(exportContentMode),
    compareScopes: compareInfo?.scopes || [],
    compareSourceBundle: compareInfo?.sourceBundle || null,
    compareTargetBundle: compareInfo?.targetBundle || null,
    normalizationState: ctx.normalizationPresetState || {},
    warning: warningInfoLite(rows, fetchIssues)
  });
  downloadText(`diff_${nowStamp()}.html`, html, 'text/html');
}

export function runExportBundleJsonStandalone(sourceBundle, targetBundle) {
  if (!sourceBundle || !targetBundle) throw new Error('先に差分比較を実行してください');
  const payload = {
    generatedAt: new Date().toISOString(),
    source: sourceBundle,
    target: targetBundle
  };
  downloadText(`bundle_${nowStamp()}.json`, JSON.stringify(payload, null, 2), 'application/json');
}

/**
 * @param {object[]} rows
 * @param {object} sourceBundle
 * @param {object} targetBundle
 */
export function runExportPatchJsonStandalone(rows, sourceBundle, targetBundle) {
  if (!countActualDiffRows(rows || [])) throw new Error('出力できる差分がありません');
  const payload = buildPatchPayload(rows, sourceBundle, targetBundle);
  downloadText(`patch_${nowStamp()}.json`, JSON.stringify(payload, null, 2), 'application/json');
}
