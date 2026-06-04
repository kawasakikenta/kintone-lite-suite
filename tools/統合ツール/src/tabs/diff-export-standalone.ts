'use strict';

import { downloadText, buildExportFilename, appLabelFromBundle } from '../utils.js';
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

function comparedScopesForExport(exportInfo: any, scopes: readonly string[] | null | undefined, fetchIssues: any[] | null | undefined): string[] {
  const fallback: string[] = [...new Set((scopes || []).filter(Boolean) as string[])];
  if ((exportInfo?.mode || 'all') === 'all') return fallback;
  const rowScopes: string[] = [...new Set((exportInfo?.rows || []).map((r: any) => r.sectionKey).filter(Boolean) as string[])];
  if (rowScopes.length) return rowScopes;
  const issueScopes: string[] = [...new Set((fetchIssues || []).map((i: any) => i.sectionKey).filter(Boolean) as string[])];
  return issueScopes.length ? issueScopes : fallback;
}

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
    normalizationState: ctx.normalizationPresetState || ({} as any),
    warning: warningInfoLite(rows, fetchIssues),
    compareScopes: compareInfo?.scopes || [],
    compareSourceBundle: compareInfo?.sourceBundle || null,
    compareTargetBundle: compareInfo?.targetBundle || null
  });
  downloadText(buildExportFilename('差分', 'json', { appLabel: diffPairLabel(ctx.sourceBundle, ctx.targetBundle) }), JSON.stringify(payload, null, 2), 'application/json');
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
    normalizationState: ctx.normalizationPresetState || ({} as any),
    warning: warningInfoLite(rows, fetchIssues)
  });
  downloadText(buildExportFilename('差分', 'html', { appLabel: diffPairLabel(ctx.sourceBundle, ctx.targetBundle) }), html, 'text/html');
}

export function runExportBundleJsonStandalone(sourceBundle, targetBundle) {
  if (!sourceBundle || !targetBundle) throw new Error('先に差分比較を実行してください');
  const payload = {
    generatedAt: new Date().toISOString(),
    source: sourceBundle,
    target: targetBundle
  };
  downloadText(buildExportFilename('比較バンドル', 'json', { appLabel: diffPairLabel(sourceBundle, targetBundle) }), JSON.stringify(payload, null, 2), 'application/json');
}

/**
 * @param {object[]} rows
 * @param {object} sourceBundle
 * @param {object} targetBundle
 */
export function runExportPatchJsonStandalone(rows, sourceBundle, targetBundle) {
  if (!countActualDiffRows(rows || [])) throw new Error('出力できる差分がありません');
  const payload = buildPatchPayload(rows, sourceBundle, targetBundle);
  downloadText(buildExportFilename('反映パッチ', 'json', { appLabel: diffPairLabel(sourceBundle, targetBundle) }), JSON.stringify(payload, null, 2), 'application/json');
}
