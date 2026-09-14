'use strict';

import { SECTION_DEFS } from '../constants.js';
import { state } from '../state.js';
import { nowStamp, downloadText, buildExportFilename, appLabelFromBundle, copyTextToClipboard, extractAppNameFromBundle } from '../utils.js';
import { fetchBundle } from '../api.js';
import { pickSettingsBundle } from '../settingsBundleImport.js';
import { bundleToMarkdown } from '../diff/export.js';
import { runAdvancedDesignExporter, runBatchDesignExportXlsxZip } from './design-xlsx.js';

interface DesignSourceInput {
  appId?: string;
  guestId?: string;
  preview?: boolean;
  importedBundle?: any;
}

/**
 * 設定JSON（importedBundle）があればそれを、無ければ API から全セクションを取得して bundle を返す。
 * 設計書出力・Markdownコピー・差分レポートで共通。取得できなかったセクション数を status に出す。
 */
async function resolveDesignBundle(
  source: DesignSourceInput,
  side: 'source' | 'target',
  setStatus: (msg: string, err?: boolean) => void,
  labelPrefix = ''
) {
  const appId = String(source?.appId || '').trim();
  const importedBundle = source?.importedBundle;
  if (!appId && !importedBundle) throw new Error(`${labelPrefix || ''}アプリIDまたは設定JSONを指定してください`.trim());
  const scopes = SECTION_DEFS.map((s) => s.key);
  setStatus(importedBundle ? `${labelPrefix}設定JSONから設計情報を読み込み中...` : `${labelPrefix}設計情報を取得中...`);
  const bundle = importedBundle
    ? pickSettingsBundle(importedBundle, { side, appId })
    : await fetchBundle({
      appId,
      guestId: String(source?.guestId || '').trim(),
      preview: !!source?.preview,
      sections: scopes,
      onProgress: (p, l) => setStatus(`${labelPrefix}取得中 ${Math.round(p * 100)}% (${l})`)
    });
  const failed = scopes.filter((key) => bundle?.sections?.[key]?._fetchError);
  if (failed.length) {
    const labels = failed.map((key) => SECTION_DEFS.find((s) => s.key === key)?.label || key);
    setStatus(`${labelPrefix}取得できなかったセクション ${failed.length}件（${labels.join(', ')}）は設計書に「取得失敗」として載ります`, true);
  }
  return bundle;
}

/**
 * @param {'md'|'json'} kind
 * @param {{ appId: string, guestId: string, preview: boolean }} source
 * @param {(msg: string, err?: boolean) => void} setStatus
 */
export async function runDesignExportStandalone(kind, source, setStatus) {
  if (kind !== 'md' && kind !== 'json') throw new Error('設計書の出力形式は md または json を指定してください');
  const bundle = await resolveDesignBundle(source, 'source', setStatus);
  state.lastSourceBundle = bundle;

  const appLabel = appLabelFromBundle(bundle);
  if (kind === 'json') {
    downloadText(buildExportFilename('設計書', 'json', { appLabel }), JSON.stringify(bundle, null, 2), 'application/json');
  } else {
    downloadText(buildExportFilename('設計書', 'md', { appLabel }), bundleToMarkdown(bundle), 'text/markdown');
  }
  setStatus(`設計書出力完了（App ${bundle.appId}）`);
}

/**
 * @param {{ appId: string, guestId: string, preview: boolean }} source
 * @param {(msg: string, err?: boolean) => void} setStatus
 */
export async function runDesignCopyMdStandalone(source, setStatus) {
  const bundle = await resolveDesignBundle(source, 'source', setStatus);
  state.lastSourceBundle = bundle;

  const md = bundleToMarkdown(bundle);
  if (!(await copyTextToClipboard(md))) {
    throw new Error('クリップボードへのコピーに失敗しました。ブラウザのクリップボード権限を確認するか、Markdown 保存を使ってください');
  }
  setStatus('設計書Markdownをクリップボードにコピーしました');
}

/**
 * @param {{ appId: string, guestId: string, importedBundle?: any, appNameLookup?: Record<string, string> }} source
 * @param {(msg: string, err?: boolean) => void} setStatus
 */
export async function runDesignExportXlsxStandalone(source, setStatus) {
  const appId = String(source.appId || '').trim();
  const importedBundle = (source as any).importedBundle;
  if (!appId && !importedBundle) throw new Error('アプリIDまたは設定JSONを指定してください');
  const guestId = String(source.guestId || '').trim();
  setStatus(importedBundle ? '設計書Excel出力を開始（設定JSONから生成）...' : '設計書Excel出力を開始...');
  const done = await runAdvancedDesignExporter({
    appId,
    guestId,
    bundle: importedBundle || null,
    appNameLookup: (source as any).appNameLookup || {}
  });
  if (done === false) {
    setStatus('設計書Excel出力をキャンセルしました');
    return;
  }
  setStatus('設計書Excel出力完了');
}

/**
 * 複数アプリの設計書を1つの ZIP にまとめて出力する（Lite パネル用）。
 * - source.apps: [{appId, guestId, bundle}]（アプリごとに別ゲストスペース・設定JSON対応）を優先
 * - 旧来の source.appIdsText + source.guestId（全アプリ共通ゲスト）も受け付ける
 * @param setStatus 進捗メッセージ
 */
export async function runBatchDesignExportXlsxZipStandalone(
  source: { apps?: Array<{ appId: string; guestId?: string; bundle?: any }>; appIdsText?: string; guestId?: string },
  setStatus: (msg: string, err?: boolean) => void
) {
  let apps: Array<{ appId: string; guestId: string; bundle?: any }>;
  if (Array.isArray(source.apps)) {
    apps = source.apps
      .map((a) => ({ appId: String(a.appId || '').trim(), guestId: String(a.guestId || '').trim(), bundle: a.bundle || null }))
      .filter((a) => /^\d+$/.test(a.appId));
  } else {
    const guestId = String(source.guestId || '').trim();
    apps = String(source.appIdsText || '')
      .split(/[\s,]+/)
      .map((s) => s.trim())
      .filter((s) => /^\d+$/.test(s))
      .map((appId) => ({ appId, guestId, bundle: null }));
  }
  if (apps.length === 0) throw new Error('アプリIDを1件以上入力してください（数値のみ）');
  const importedCount = apps.filter((a) => a.bundle).length;
  setStatus(`設計書ZIP出力を開始（${apps.length}件${importedCount ? ` / うち設定JSON ${importedCount}件` : ''}）...`);
  const done = await runBatchDesignExportXlsxZip({ apps });
  if (done === false) {
    setStatus('設計書ZIP出力をキャンセルしました');
    return;
  }
  setStatus(`設計書ZIP出力完了（${apps.length}件）`);
}

function simpleLineDiffLite(oStr: string, nStr: string): string {
  const oLines = oStr.split('\n');
  const nLines = nStr.split('\n');
  const result: string[] = [];
  let i = 0, j = 0;
  while (i < oLines.length || j < nLines.length) {
    if (i < oLines.length && j < nLines.length && oLines[i] === nLines[j]) {
      result.push('  ' + oLines[i]); i++; j++;
    } else {
      let rsI = -1, rsJ = -1;
      for (let k = 1; k < 60; k++) {
        if (i + k < oLines.length && oLines[i + k] === nLines[j]) { rsI = i + k; rsJ = j; break; }
        if (j + k < nLines.length && oLines[i] === nLines[j + k]) { rsI = i; rsJ = j + k; break; }
      }
      if (rsI !== -1) {
        if (rsI > i) {
          for (let scan = i; scan < rsI; scan++) result.push('- ' + oLines[scan]);
          i = rsI;
        } else {
          for (let scan = j; scan < rsJ; scan++) result.push('+ ' + nLines[scan]);
          j = rsJ;
        }
      } else {
        if (i < oLines.length) result.push('- ' + oLines[i++]);
        if (j < nLines.length) result.push('+ ' + nLines[j++]);
      }
    }
  }
  return result.join('\n');
}

/**
 * 比較元と比較先の設計書 Markdown を生成し、行差分レポートを Markdown 出力する。
 */
export interface DesignDiffSide {
  appId: string;
  appName: string;
  guestId: string;
  environment: string;
}

export interface DesignDiffSectionSummary {
  section: string;
  added: number;
  removed: number;
}

/** diff 行（'+ ' / '- ' / '  ' で始まる）からセクション別の追加・削除行数を集計する。 */
export function summarizeDesignDiff(diff: string): { added: number; removed: number; sections: DesignDiffSectionSummary[] } {
  const bySection = new Map<string, DesignDiffSectionSummary>();
  let current = '（ヘッダー）';
  let added = 0;
  let removed = 0;
  for (const line of String(diff || '').split('\n')) {
    const body = line.slice(2);
    if (/^## /.test(body)) current = body.slice(3).trim() || current;
    const kind = line.startsWith('+ ') ? 'added' : line.startsWith('- ') ? 'removed' : '';
    if (!kind) continue;
    if (!bySection.has(current)) bySection.set(current, { section: current, added: 0, removed: 0 });
    const entry = bySection.get(current)!;
    entry[kind] += 1;
    if (kind === 'added') added += 1; else removed += 1;
  }
  return { added, removed, sections: [...bySection.values()] };
}

function describeDesignDiffSide(bundle: any, side: { appId: string; guestId?: string; preview?: boolean } | undefined, imported: any): DesignDiffSide {
  return {
    appId: String(bundle?.appId || side?.appId || '').trim(),
    appName: extractAppNameFromBundle(bundle) || '',
    guestId: String(bundle?.guestId || side?.guestId || '').trim(),
    environment: imported ? '読み込んだ設定JSON' : (bundle?.preview ?? side?.preview) ? 'プレビュー（未公開）' : '本番（運用中）'
  };
}

function designDiffSideLabel(side: DesignDiffSide): string {
  return `App ${side.appId || '?'}${side.appName ? ` ${side.appName}` : ''}${side.guestId ? `（ゲスト ${side.guestId}）` : ''} · ${side.environment}`;
}

/** 設計書差分レポート（Markdown）を組み立てる。見出し・見方・セクション別集計・diff 本体の順。 */
export function buildDesignDiffReport(input: { diff: string; generatedAt: string; source: DesignDiffSide; target: DesignDiffSide }): string {
  const summary = summarizeDesignDiff(input.diff);
  const lines: string[] = [];
  lines.push('# 設計書差分レポート');
  lines.push('');
  lines.push('| 項目 | 値 |');
  lines.push('| --- | --- |');
  lines.push(`| 生成日時 | ${input.generatedAt} |`);
  lines.push(`| 比較元（追加・更新後の姿） | ${designDiffSideLabel(input.source)} |`);
  lines.push(`| 比較先（現在の設定） | ${designDiffSideLabel(input.target)} |`);
  lines.push(`| 差分行数 | 追加 ${summary.added} 行 / 削除 ${summary.removed} 行 |`);
  lines.push('');
  lines.push('## 見方');
  lines.push('');
  lines.push('- `+` の行は比較元にあって比較先にない内容、`-` の行は比較先にだけある内容です。比較先を比較元へ揃えるときの変更に相当します。');
  lines.push('- 設計書の表と要約を行単位で比べた簡易差分です。API レスポンスの生データは含めていません。厳密な差分は「差分比較」ツールの HTML / Excel を使ってください。');
  lines.push('- 並び順だけが異なる行も追加・削除として現れます。');
  lines.push('');
  lines.push('## セクション別の差分');
  lines.push('');
  if (summary.sections.length) {
    lines.push('| セクション | 追加 | 削除 |');
    lines.push('| --- | ---: | ---: |');
    for (const entry of summary.sections) lines.push(`| ${entry.section.replace(/\|/g, '\\|')} | ${entry.added} | ${entry.removed} |`);
  } else {
    lines.push('差分はありません。比較元と比較先の設計書は同じ内容です。');
  }
  lines.push('');
  lines.push('## 差分');
  lines.push('');
  lines.push('```diff');
  lines.push(input.diff);
  lines.push('```');
  lines.push('');
  return lines.join('\n');
}

export async function runDesignDiffMdStandalone(
  opts: {
    source: { appId: string; guestId?: string; preview?: boolean; importedBundle?: any };
    target: { appId: string; guestId?: string; preview?: boolean; importedBundle?: any };
  },
  setStatus: (msg: string, err?: boolean) => void
) {
  const srcAppId = String(opts.source?.appId || '').trim();
  const tgtAppId = String(opts.target?.appId || '').trim();
  const importedSource = (opts.source as any)?.importedBundle;
  const importedTarget = (opts.target as any)?.importedBundle;
  if ((!srcAppId && !importedSource) || (!tgtAppId && !importedTarget)) throw new Error('比較元と比較先の両方にアプリIDまたは設定JSONを指定してください。');

  const srcBundle = await resolveDesignBundle(opts.source, 'source', setStatus, '比較元: ');
  const tgtBundle = await resolveDesignBundle(opts.target, 'target', setStatus, '比較先: ');

  setStatus('差分レポート生成中...');
  // 生データ JSON は表・要約と重複して差分を読みにくくするため、比較は可読部分だけで行う
  const srcMd = bundleToMarkdown(srcBundle, { rawJson: false });
  const tgtMd = bundleToMarkdown(tgtBundle, { rawJson: false });
  const diffMd = simpleLineDiffLite(tgtMd, srcMd);
  const finalMd = buildDesignDiffReport({
    diff: diffMd,
    generatedAt: nowStamp(),
    source: describeDesignDiffSide(srcBundle, opts.source, importedSource),
    target: describeDesignDiffSide(tgtBundle, opts.target, importedTarget)
  });
  const diffLabel = `${appLabelFromBundle(srcBundle)}_vs_${appLabelFromBundle(tgtBundle)}`;
  downloadText(buildExportFilename('設計書差分', 'md', { appLabel: diffLabel }), finalMd, 'text/markdown');
  setStatus(`設計書差分レポートを出力しました（${srcAppId} ⇔ ${tgtAppId}）`);
}
