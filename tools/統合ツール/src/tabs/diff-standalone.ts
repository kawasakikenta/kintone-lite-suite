'use strict';

import { fetchBundle } from '../api.js';
import { pickSettingsBundle } from '../settingsBundleImport.js';
import {
  computeDiffRows,
  countActualDiffRows,
  summarizeRows
} from '../diff/engine.js';
import { enrichDiffRows } from '../diff/enrich.js';
import { deepClone } from '../utils.js';
import { SECTION_DEFS } from '../constants.js';

function warningInfoForStandalone(rows, fetchIssues, partialIssues: any[] = []) {
  const diffCount = countActualDiffRows(rows || []);
  const issueCount = (fetchIssues || []).length;
  const partialIssueCount = partialIssues.length;
  const total = diffCount + issueCount + partialIssueCount;
  return { threshold: 0, diffCount, issueCount, partialIssueCount, total, exceeded: false };
}

export function collectPartialComparisonIssues(sourceBundle: any, targetBundle: any) {
  const issues: any[] = [];
  const addSide = (bundle: any, side: 'source' | 'target') => {
    Object.entries(bundle?.sections || {}).forEach(([sectionKey, section]: [string, any]) => {
      // _fetchError means computeDiffRows skips the whole section. In that case
      // _partial is only supplemental detail, not a separately compared item.
      if (section?._fetchError) return;
      const partial = section?._partial;
      if (!partial) return;
      const files = Array.isArray(partial.files) ? partial.files : [];
      const sectionLabel = SECTION_DEFS.find((def) => def.key === sectionKey)?.label || sectionKey;
      issues.push({
        sectionKey,
        section: sectionLabel,
        side,
        message: String(partial.message || '一部データを取得できず、代替情報で比較しました'),
        files: files.map((file: any) => ({
          fileName: String(file?.fileName || ''),
          fileKey: String(file?.fileKey || ''),
          reason: String(file?.reason || ''),
          detail: String(file?.detail || ''),
          byteSize: Number(file?.byteSize || 0)
        }))
      });
    });
  };
  addSide(sourceBundle, 'source');
  addSide(targetBundle, 'target');
  return issues;
}

/**
 * 統合ツールの DOM（ui）に依存せず差分計算だけ行う API。
 * 軽量な単体 UI（差分比較.js）から利用する。
 *
 * @param {{
 *   source: { appId: string, guestId?: string, preview?: boolean },
 *   target: { appId: string, guestId?: string, preview?: boolean },
 *   scopes: string[],
 *   ignoreKeys?: string,
 *   includeSame?: boolean,
 *   normalizationPresetState?: { viewOrder?: boolean, permissionOrder?: boolean, generalArrayOrder?: boolean },
 *   importedSourceBundle?: object,
 *   importedTargetBundle?: object,
 *   onSourceBundle?: (bundle: object) => void,
 *   onStatus?: (msg: string) => void,
 *   onProgress?: (side: 'source'|'target', progress: number, label: string) => void
 * }} opts
 */
export async function runDiffStandalone(opts) {
  const onStatus = typeof opts.onStatus === 'function' ? opts.onStatus : () => {};
  const onProgress = typeof opts.onProgress === 'function' ? opts.onProgress : () => {};

  const source = opts.source || ({} as any);
  const target = opts.target || ({} as any);
  const scopes = opts.scopes || [];
  const ignoreKeys = opts.ignoreKeys != null ? String(opts.ignoreKeys) : '';
  const includeSame = !!opts.includeSame;
  const normalizationPresetState = opts.normalizationPresetState || {
    viewOrder: false,
    permissionOrder: false,
    generalArrayOrder: false
  };

  if (!scopes.length) throw new Error('比較セクションを選択してください');
  if (!opts.importedSourceBundle && !String(source.appId || '').trim()) {
    throw new Error('比較元アプリIDを入力してください');
  }
  if (!opts.importedTargetBundle && !String(target.appId || '').trim()) {
    throw new Error('比較先アプリIDを入力してください');
  }

  async function resolveSide(side) {
    const imported = side === 'source' ? opts.importedSourceBundle : opts.importedTargetBundle;
    const params = side === 'source' ? source : target;
    if (imported) {
      return pickSettingsBundle(imported, {
        side,
        appId: String(params.appId || '').trim(),
        sections: scopes
      });
    }
    return fetchBundle({
      appId: String(params.appId || '').trim(),
      guestId: String(params.guestId || '').trim(),
      preview: !!params.preview,
      sections: scopes,
      onProgress: onProgress
        ? (progress, label) => {
            onProgress(side, progress, label);
          }
        : undefined
    });
  }

  onStatus('比較元を取得中...');
  const sourceBundle = deepClone(await resolveSide('source'));
  if (typeof opts.onSourceBundle === 'function') {
    opts.onSourceBundle(deepClone(sourceBundle));
  }
  onStatus('比較先を取得中...');
  const targetBundle = deepClone(await resolveSide('target'));

  onStatus('差分計算中...');
  const diffResult = computeDiffRows(sourceBundle, targetBundle, scopes, ignoreKeys, {
    normalizationPresetState,
    includeSame
  });
  const rows = enrichDiffRows(diffResult.rows, sourceBundle, targetBundle);
  const fetchIssues = diffResult.fetchIssues || [];
  const partialIssues = collectPartialComparisonIssues(sourceBundle, targetBundle);

  const s = summarizeRows(rows);
  const warning = warningInfoForStandalone(rows, fetchIssues, partialIssues);
  const truncation = diffResult.truncation?.truncated ? diffResult.truncation : null;
  const incompleteNotes = [
    truncation ? `差分上限 ${truncation.diffLimit}件に到達` : '',
    partialIssues.length ? `本文未検証 ${partialIssues.length}件` : ''
  ].filter(Boolean);
  const incompleteNote = incompleteNotes.length ? ` / ⚠ 結果は不完全（${incompleteNotes.join(' / ')}）` : '';
  const statusLine = `差分比較完了: 差分 ${countActualDiffRows(rows)}件 / 同一 ${s.same}件 / 取得失敗 ${fetchIssues.length}件 / 一部未検証 ${partialIssues.length}件${warning.exceeded ? ` / 警告 ${warning.total}>=${warning.threshold}` : ''}${incompleteNote} (追加:${s.added} / 削除:${s.removed} / 変更:${s.changed} / 移動:${s.moved})`;
  onStatus(statusLine);

  return {
    rows,
    fetchIssues,
    partialIssues,
    sourceBundle,
    targetBundle,
    truncation,
    summary: {
      text: statusLine,
      counts: s,
      warning
    }
  };
}
