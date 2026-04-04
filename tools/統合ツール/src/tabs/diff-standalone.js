'use strict';

import { fetchBundle } from '../api.js';
import {
  computeDiffRows,
  countActualDiffRows,
  summarizeRows
} from '../diff/engine.js';
import { enrichDiffRows, summarizeSeverity } from '../diff/enrich.js';

function warningInfoForStandalone(rows, fetchIssues) {
  const diffCount = countActualDiffRows(rows || []);
  const issueCount = (fetchIssues || []).length;
  const total = diffCount + issueCount;
  return { threshold: 0, diffCount, issueCount, total, exceeded: false };
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
 *   onStatus?: (msg: string) => void,
 *   onProgress?: (side: 'source'|'target', progress: number, label: string) => void
 * }} opts
 */
export async function runDiffStandalone(opts) {
  const onStatus = typeof opts.onStatus === 'function' ? opts.onStatus : () => {};
  const onProgress = typeof opts.onProgress === 'function' ? opts.onProgress : () => {};

  const source = opts.source || {};
  const target = opts.target || {};
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
    if (imported) return imported;
    const params = side === 'source' ? source : target;
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
  const sourceBundle = await resolveSide('source');
  onStatus('比較先を取得中...');
  const targetBundle = await resolveSide('target');

  onStatus('差分計算中...');
  const diffResult = computeDiffRows(sourceBundle, targetBundle, scopes, ignoreKeys, {
    normalizationPresetState,
    includeSame
  });
  const rows = enrichDiffRows(diffResult.rows, sourceBundle, targetBundle);
  const fetchIssues = diffResult.fetchIssues || [];

  const s = summarizeRows(rows);
  const sev = summarizeSeverity(rows);
  const warning = warningInfoForStandalone(rows, fetchIssues);
  const statusLine = `差分比較完了: 差分 ${countActualDiffRows(rows)}件 / 同一 ${s.same}件 / 取得失敗 ${fetchIssues.length}件${warning.exceeded ? ` / 警告 ${warning.total}>=${warning.threshold}` : ''} (追加:${s.added} / 削除:${s.removed} / 変更:${s.changed} / 移動:${s.moved} / 高:${sev.high} / 中:${sev.medium} / 低:${sev.low})`;
  onStatus(statusLine);

  return {
    rows,
    fetchIssues,
    sourceBundle,
    targetBundle,
    summary: {
      text: statusLine,
      counts: s,
      severity: sev,
      warning
    }
  };
}
