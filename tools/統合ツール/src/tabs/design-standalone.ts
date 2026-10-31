'use strict';

import { SECTION_DEFS } from '../constants.js';
import { state } from '../state.js';
import { nowStamp, downloadText, downloadBlob, buildExportFilename, appLabelFromBundle, copyTextToClipboard, extractAppNameFromBundle, sanitizeFilenamePart } from '../utils.js';
import { fetchBundle } from '../api.js';
import { loadJSZipLite } from '../jszipLoader.js';
import { pickSettingsBundle } from '../settingsBundleImport.js';
import { bundleToMarkdown } from '../diff/export.js';
import { buildDesignAiMarkdown } from '../design/ai-markdown.js';
import { buildDesignSnapshot } from '../design/snapshot.js';
import { runAdvancedDesignExporter, runBatchDesignExportXlsxZip, type BatchDesignExportInfo, type DesignExporterCompletionSummary } from './design-xlsx.js';
import { isCancelRequested } from '../runControl.js';
import { createCancelReport, isCancelStop } from './run-cancel-summary.js';

interface DesignSourceInput {
  appId?: string;
  guestId?: string;
  preview?: boolean;
  rawSettings?: boolean;
  importedBundle?: any;
}

/** 設計書 Lite の対象指定を API／出力処理の前に検証する。 */
export function validateDesignTarget(source: DesignSourceInput | undefined, label = ''): string {
  const appId = String(source?.appId || '').trim();
  const importedBundle = source?.importedBundle;
  if (!appId && !importedBundle) return `${label}アプリIDまたは設定JSONを指定してください`.trim();
  if (appId && !/^\d+$/.test(appId)) return `${label}アプリIDは数値で入力してください: ${appId}`;
  const guestId = String(source?.guestId || '').trim();
  if (guestId && !/^\d+$/.test(guestId)) return `${label}ゲストスペースIDは半角数字で入力してください: ${guestId}`;
  return '';
}

/**
 * 設定JSONから取り出したバンドルを、アプリIDごとの読込対象に振り分ける。
 * アプリIDの無いバンドルは使えず、同じアプリIDが複数あると後のものだけが残るため、件数を数えて呼び出し側が利用者に示せるようにする。
 */
export function classifyImportedDesignBundles(bundles: any[]): {
  entries: Array<{ appId: string; bundle: any }>;
  missingAppId: number;
  duplicatedAppIds: string[];
} {
  const entries = new Map<string, any>();
  const duplicated = new Set<string>();
  let missingAppId = 0;
  for (const bundle of bundles || []) {
    const appId = String(bundle?.appId || '').trim();
    if (!appId) { missingAppId += 1; continue; }
    if (entries.has(appId)) duplicated.add(appId);
    entries.set(appId, bundle);
  }
  return {
    entries: [...entries.entries()].map(([appId, bundle]) => ({ appId, bundle })),
    missingAppId,
    duplicatedAppIds: [...duplicated]
  };
}

/** 複数アプリ出力の入力を検証し、無効な行を黙って捨てない。 */
export function validateDesignExportTargets(
  apps: Array<{ appId?: string; guestId?: string; bundle?: any }> | undefined,
  label = ''
): string {
  if (!Array.isArray(apps) || apps.length === 0) return `${label}アプリIDを1件以上入力してください`;
  for (let i = 0; i < apps.length; i += 1) {
    const target = apps[i] || {};
    const error = validateDesignTarget(target, `${label}${i + 1}行目: `);
    if (error) return error;
  }
  return '';
}

/** 取得に失敗した（設定JSONに無い場合を含む）セクションのラベル一覧。 */
function failedSectionLabels(bundle: any): string[] {
  return SECTION_DEFS.filter((s) => bundle?.sections?.[s.key]?._fetchError).map((s) => s.label);
}

/** 完了メッセージに添える、取得できなかったセクションの注記。無ければ空文字。 */
function failedSectionNote(labels: string[], prefix = ''): string {
  return labels.length ? `${prefix}取得できなかったセクション ${labels.length}件（${labels.join(', ')}）は設計書に「取得失敗」と記載しました` : '';
}

/**
 * 設定JSON（importedBundle）があればそれを、無ければ API から全セクションを取得して bundle を返す。
 * 設計書出力・Markdownコピー・差分レポートで共通。取得できなかったセクション数を status に出す。
 */
async function resolveDesignBundle(
  source: DesignSourceInput,
  side: 'source' | 'target',
  setStatus: (msg: string, err?: boolean) => void,
  labelPrefix = '',
  rawSettings = false
) {
  const appId = String(source?.appId || '').trim();
  const importedBundle = source?.importedBundle;
  const validationError = validateDesignTarget(source, labelPrefix);
  if (validationError) throw new Error(validationError);
  const scopes = SECTION_DEFS.map((s) => s.key);
  setStatus(importedBundle ? `${labelPrefix}設定JSONから設計情報を読み込み中...` : `${labelPrefix}設計情報を取得中...`);
  const bundle = importedBundle
    // 通常の設計書・差分では、設定JSONに無いセクションを「取得失敗」として明示する（空の設定と誤読させない）。
    // AI向けの原文出力（rawSettings）では、欠落を「未取得」のまま区別して残す。
    ? pickSettingsBundle(importedBundle, { side, appId, rawSettings: true, preserveMetadata: true, ...(rawSettings ? {} : { sections: scopes }) })
    : await fetchBundle({
      rawSettings,
      appId,
      guestId: String(source?.guestId || '').trim(),
      preview: !!source?.preview,
      sections: scopes,
      onProgress: (p, l) => setStatus(`${labelPrefix}取得中 ${Math.round(p * 100)}% (${l})`)
    });
  if (!importedBundle && rawSettings && bundle?.meta && typeof bundle.meta === 'object') {
    // rawSettings は normalize を避ける代わりに、JS/CSS本文とプラグイン個別設定の
    // 補助取得を行わない。AI向けMarkdownの bundle metadata に取得方針を残す。
    bundle.meta.designSource = 'raw-settings-api';
    bundle.meta.supplements = 'not-requested';
  }
  const sections = bundle?.sections && typeof bundle.sections === 'object' ? bundle.sections : null;
  const snapshot = sections ? buildDesignSnapshot(bundle) : null;
  const statusRows = snapshot?.sections.filter((row) => scopes.includes(row.key)) || [];
  const missing = statusRows.filter((row) => row.status === 'missing');
  const failed = statusRows.filter((row) => row.status === 'fetch-error');
  const partial = statusRows.filter((row) => row.status === 'partial');
  const labelsFor = (rows: Array<{ key: string; label: string }>) => rows.map((row) => row.label || row.key);
  if (missing.length || failed.length || partial.length) {
    const parts: string[] = [];
    if (missing.length) {
      parts.push(`未取得のセクション ${missing.length}件（${labelsFor(missing).join(', ')}）`);
    }
    if (failed.length) {
      parts.push(`取得できなかったセクション ${failed.length}件（${labelsFor(failed).join(', ')}）`);
    }
    if (partial.length) {
      parts.push(`部分取得のセクション ${partial.length}件（${labelsFor(partial).join(', ')}）`);
    }
    setStatus(`${labelPrefix}${parts.join(' / ')}は設計書に状態を付けて載ります`, true);
  }
  return bundle;
}

/** 出力完了メッセージにも、取得失敗・部分取得の状態を残す。 */
function designBundleCompletionNote(bundle: any): string {
  if (!bundle?.sections || typeof bundle.sections !== 'object') return '';
  const known = new Set(SECTION_DEFS.map((s) => s.key));
  const rows = buildDesignSnapshot(bundle).sections.filter((row) => known.has(row.key));
  const missing = rows.filter((row) => row.status === 'missing').length;
  const failed = rows.filter((row) => row.status === 'fetch-error').length;
  const partial = rows.filter((row) => row.status === 'partial').length;
  if (!missing && !failed && !partial) return '';
  const parts: string[] = [];
  if (missing) parts.push(`未取得 ${missing}件`);
  if (failed) parts.push(`取得失敗 ${failed}件`);
  if (partial) parts.push(`部分取得 ${partial}件`);
  return `（${parts.join(' / ')}。内容を確認してください）`;
}

function designBundleSourceNote(bundle: any): string {
  return bundle?.meta?.designSource === 'raw-settings-api'
    ? '（原文取得。JS/CSS本文・プラグイン個別設定の補助取得なし）'
    : '';
}

/** ライブExcel出力の完了通知。取得状況シートと同じsnapshot集計を表示する。 */
function designExcelCompletionNote(summary: DesignExporterCompletionSummary | undefined): string {
  if (!summary || summary.complete) return '';
  const parts: string[] = [];
  if (summary.missingSectionCount) parts.push(`未取得 ${summary.missingSectionCount}件`);
  if (summary.fetchErrorSectionCount) parts.push(`取得失敗 ${summary.fetchErrorSectionCount}件`);
  if (summary.partialSectionCount) parts.push(`部分取得 ${summary.partialSectionCount}件`);
  if (summary.supplementalMissingCount) parts.push(`補足情報未取得 ${summary.supplementalMissingCount}件`);
  const supplementalOther = Math.max(0, summary.supplementalIncompleteCount - summary.supplementalMissingCount);
  if (supplementalOther) parts.push(`補足情報未完了 ${supplementalOther}件`);
  return parts.length ? `（${parts.join(' / ')}。内容を確認してください）` : '（取得状態を確認してください）';
}

function designBundleExportMarkdown(kind: 'md' | 'ai-md', bundle: any): string {
  return kind === 'ai-md' ? buildDesignAiMarkdown(bundle) : bundleToMarkdown(bundle);
}

/**
 * @param {'md'|'json'|'ai-md'} kind
 * @param {{ appId: string, guestId: string, preview: boolean }} source
 * @param {(msg: string, err?: boolean) => void} setStatus
 */
export async function runDesignExportStandalone(kind, source, setStatus) {
  if (kind !== 'md' && kind !== 'json' && kind !== 'ai-md') throw new Error('設計書の出力形式は md、json または ai-md を指定してください');
  const bundle = await resolveDesignBundle(source, 'source', setStatus, '', kind === 'ai-md');
  state.lastSourceBundle = bundle;

  const appLabel = appLabelFromBundle(bundle);
  if (kind === 'json') {
    downloadText(buildExportFilename('設計書', 'json', { appLabel }), JSON.stringify(bundle, null, 2), 'application/json');
  } else {
    const baseLabel = kind === 'ai-md' ? '設計書_AI向けMarkdown' : '設計書';
    downloadText(buildExportFilename(baseLabel, 'md', { appLabel }), designBundleExportMarkdown(kind, bundle), 'text/markdown');
  }
  // 取得失敗の警告は完了メッセージで上書きされないよう、エラー色のまま残す
  const note = failedSectionNote(failedSectionLabels(bundle));
  const completionNote = designBundleCompletionNote(bundle);
  setStatus(`${kind === 'ai-md' ? 'AI向けMarkdown' : '設計書'}出力完了（App ${bundle.appId}）${note ? `。${note}` : ''}${completionNote}${kind === 'ai-md' ? designBundleSourceNote(bundle) : ''}`, !!note || !!completionNote);
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
  const note = failedSectionNote(failedSectionLabels(bundle));
  const completionNote = designBundleCompletionNote(bundle);
  setStatus(`設計書Markdownをクリップボードにコピーしました${note ? `。${note}` : ''}${completionNote}`, !!note || !!completionNote);
}

/** AIへの受け渡し用 Markdown をクリップボードへコピーする。 */
export async function runDesignCopyAiMdStandalone(source, setStatus) {
  const bundle = await resolveDesignBundle(source, 'source', setStatus, '', true);
  state.lastSourceBundle = bundle;

  const md = buildDesignAiMarkdown(bundle);
  if (!(await copyTextToClipboard(md))) {
    throw new Error('AI向けMarkdownのコピーに失敗しました。ブラウザのクリップボード権限を確認するか、AI向けMarkdown 保存を使ってください');
  }
  const note = failedSectionNote(failedSectionLabels(bundle));
  const completionNote = designBundleCompletionNote(bundle);
  setStatus(`AI向けMarkdownをクリップボードにコピーしました${note ? `。${note}` : ''}${completionNote}${designBundleSourceNote(bundle)}`, !!note || !!completionNote);
}

/**
 * @param {{ appId: string, guestId: string, preview?: boolean, importedBundle?: any, appNameLookup?: Record<string, string> }} source
 * @param {(msg: string, err?: boolean) => void} setStatus
 */
export async function runDesignExportXlsxStandalone(source, setStatus) {
  const target = source || {};
  const appId = String(target.appId || '').trim();
  const importedRaw = (target as any).importedBundle;
  const validationError = validateDesignTarget(target);
  if (validationError) throw new Error(validationError);
  // 設定一括取得の apps 配列や source/target wrapper を直接 Excel exporter に渡さず、
  // 指定 App のバンドルだけを選ぶ。選択後の bundle metadata を exporter 側で尊重する。
  const importedBundle = importedRaw
    ? pickSettingsBundle(importedRaw, { side: 'source', appId, rawSettings: true, preserveMetadata: true })
    : null;
  state.lastSourceBundle = importedBundle || state.lastSourceBundle;
  const guestId = String(target.guestId || '').trim();
  setStatus(importedBundle ? '設計書Excel出力を開始（設定JSONから生成）...' : '設計書Excel出力を開始...');
  let failedAPIs: Array<{ name: string; error: string }> = [];
  let liveSummary: DesignExporterCompletionSummary | null = null;
  const exporterParams: any = {
    appId: appId || String(importedBundle?.appId || '').trim(),
    guestId,
    bundle: importedBundle || null,
    preview: target.preview === true,
    appNameLookup: (source as any).appNameLookup || {},
    onFinish: (info: { failedAPIs: Array<{ name: string; error: string }> }) => { failedAPIs = info.failedAPIs; }
  };
  // 設定JSON出力は既存のcompletion noteを使い、同じ警告を二重表示しない。
  // live出力だけ、exporterが実際に使ったsnapshotの完了集計を受け取る。
  if (!importedBundle) {
    exporterParams.onComplete = (summary: DesignExporterCompletionSummary) => { liveSummary = summary; };
  }
  const done = await runAdvancedDesignExporter(exporterParams);
  if (done === false) {
    setStatus('設計書Excel出力をキャンセルしました');
    return;
  }
  const summary = liveSummary as DesignExporterCompletionSummary | null;
  const completionNote = summary ? designExcelCompletionNote(summary) : designBundleCompletionNote(importedBundle);
  let message = `設計書Excel出力完了${completionNote}`;
  if (failedAPIs.length) {
    const names = [...new Set(failedAPIs.map((f) => f.name))].join(', ');
    message += `。取得に失敗した項目 ${failedAPIs.length}件（${names}）があります。詳細はサマリーシートの「API取得失敗レポート」を確認してください`;
  }
  if (failedAPIs.length) {
    // 失敗の内訳はステータスだけでなく結果ログにも残す（コピー・保存できるように）
    const lines = ['取得に失敗した項目', ...failedAPIs.map((f) => `- ${f.name}: ${f.error}`)];
    throw Object.assign(new Error(`${message}\n${lines.join('\n')}`), { partialSuccess: true });
  }
  if (completionNote) setStatus(message, true);
  else setStatus(message);
}

/**
 * 複数アプリの設計書を1つの ZIP にまとめて出力する（Lite パネル用）。
 * - source.apps: [{appId, guestId, bundle}]（アプリごとに別ゲストスペース・設定JSON対応）を優先
 * - 旧来の source.appIdsText + source.guestId（全アプリ共通ゲスト）も受け付ける
 * @param setStatus 進捗メッセージ
 */
export async function runBatchDesignExportXlsxZipStandalone(
  source: {
    apps?: Array<{ appId: string; guestId?: string; bundle?: any }>;
    appIdsText?: string;
    guestId?: string;
    preview?: boolean;
    preselectedSheets?: Set<string> | string[];
  },
  setStatus: (msg: string, err?: boolean) => void
) {
  let apps: Array<{ appId: string; guestId: string; bundle?: any }>;
  if (Array.isArray(source.apps)) {
    const validationError = validateDesignExportTargets(source.apps);
    if (validationError) throw new Error(validationError);
    apps = source.apps.map((a) => ({
      appId: String(a.appId || '').trim(),
      guestId: String(a.guestId || '').trim(),
      bundle: a.bundle || null
    }));
  } else {
    const guestId = String(source.guestId || '').trim();
    const appIds = String(source.appIdsText || '')
      .split(/[\s,、]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    const validationError = validateDesignExportTargets(appIds.map((appId) => ({ appId, guestId })));
    if (validationError) throw new Error(validationError);
    apps = appIds.map((appId) => ({ appId, guestId, bundle: null }));
  }
  const importedCount = apps.filter((a) => a.bundle).length;
  setStatus(`設計書ZIP出力を開始（${apps.length}件${importedCount ? ` / うち設定JSON ${importedCount}件` : ''}）...`);
  let info: BatchDesignExportInfo | null = null;
  const done = await runBatchDesignExportXlsxZip({
    apps,
    ...(source.preview !== undefined ? { preview: !!source.preview } : {}),
    ...(source.preselectedSheets !== undefined ? { preselectedSheets: source.preselectedSheets } : {}),
    onFinish: (result) => { info = result; }
  });
  if (done === false) {
    // 1件も生成する前に「中止」した場合は、件数つきの中止報告にする（ZIP は保存していない）
    if (isCancelRequested()) {
      const failed = ((info as BatchDesignExportInfo | null)?.failedApps || []).filter((f) => f.error && !/未実行（中止）|生成途中/.test(f.error));
      throw createCancelReport(0, apps.length, ['設計書ZIPは保存していません。', ...failed.map((f) => `App ${f.appId}: 中止前に失敗（${f.error}）`)]);
    }
    setStatus('設計書ZIP出力をキャンセルしました');
    return;
  }
  const result = info as BatchDesignExportInfo | null;
  if (result && (result.failedCount > 0 || result.failedAPIs.length > 0)) {
    // 部分成功・中断・API取得失敗を「完了」だけで隠さない（詳細は ZIP 内の _manifest）
    if (result.cancelled) {
      // 中止: 件数つきの中止報告にし、保存済みの ZIP と失敗・未実行の内訳をログへ
      const notRun = result.failedApps.filter((f) => /未実行（中止）/.test(f.error));
      const failed = result.failedApps.filter((f) => !/未実行（中止）/.test(f.error));
      throw createCancelReport(result.successCount, result.total, [
        `生成できた ${result.successCount} アプリ分の設計書ZIPを保存しました（詳細は ZIP 内の _manifest.txt）。`,
        ...failed.map((f) => `失敗 App ${f.appId}: ${f.error}`),
        ...(notRun.length ? [`未実行（中止）: ${notRun.map((f) => `App ${f.appId}`).join(', ')}`] : []),
        ...(result.failedAPIs.length ? [`API取得に失敗した項目 ${result.failedAPIs.length}件`] : [])
      ]);
    }
    const parts = [`成功 ${result.successCount} / 失敗・未処理 ${result.failedCount}（全${result.total}件）`];
    if (result.failedApps.length) parts.push(`失敗したアプリ: ${result.failedApps.map((f) => `App ${f.appId}`).join(', ')}`);
    if (result.failedAPIs.length) parts.push(`API取得に失敗した項目 ${result.failedAPIs.length}件`);
    setStatus(`設計書ZIPを保存しました。${parts.join('。')}。詳細は ZIP 内の _manifest.txt を確認してください`, true);
    return;
  }
  setStatus(`設計書ZIP出力完了（${apps.length}件）`);
}

export type BatchDesignMdExportFormat = 'md' | 'ai-md' | 'both';

export interface BatchDesignMdManifestItem {
  appId: string;
  guestId: string;
  appName: string;
  source: 'settings-json' | 'api';
  status: 'ok' | 'partial';
  file: string;
  files: string[];
  mdFile?: string;
  aiMdFile?: string;
  complete: boolean;
  missingSections: string[];
  failedSections: string[];
  partialSections: string[];
}

export interface BatchDesignMdFailedApp {
  appId: string;
  guestId: string;
  error: string;
}

export interface BatchDesignMdZipResult {
  schemaVersion: 1;
  generatedAt: string;
  format: BatchDesignMdExportFormat;
  preview: boolean;
  total: number;
  successCount: number;
  failedCount: number;
  cancelled: boolean;
  zipName: string;
  items: BatchDesignMdManifestItem[];
  failedApps: BatchDesignMdFailedApp[];
}

function uniqueMdZipEntryName(used: Set<string>, baseName: string): string {
  const cleaned = String(baseName || '').replace(/[\\/:*?"<>|]/g, '_').replace(/[\u0000-\u001f]/g, '').trim() || 'design.md';
  let candidate = cleaned;
  let n = 2;
  while (used.has(candidate.toLowerCase())) {
    const dot = cleaned.lastIndexOf('.');
    const stem = dot > 0 ? cleaned.slice(0, dot) : cleaned;
    const ext = dot > 0 ? cleaned.slice(dot) : '';
    candidate = `${stem}(${n})${ext}`;
    n += 1;
  }
  used.add(candidate.toLowerCase());
  return candidate;
}

function escapeOverviewCell(value: unknown): string {
  return String(value ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/\|/g, '\\|')
    .replace(/[\r\n]+/g, ' ')
    .trim();
}

function firstErrorLine(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error ?? '不明なエラー');
  return raw.split(/\r?\n/)[0].trim() || '不明なエラー';
}

function buildBatchDesignMdOverview(input: {
  generatedAt: string;
  format: BatchDesignMdExportFormat;
  preview: boolean;
  total: number;
  cancelled: boolean;
  items: BatchDesignMdManifestItem[];
  failedApps: BatchDesignMdFailedApp[];
}): string {
  const notRunApps = input.failedApps.filter((f) => /未実行（中止）/.test(f.error));
  const actualFailedApps = input.failedApps.filter((f) => !/未実行（中止）/.test(f.error));
  const formatLabel = input.format === 'ai-md'
    ? 'AI向けMarkdown (ai-md)'
    : input.format === 'both'
      ? '設計書Markdown + AI向けMarkdown (both)'
      : '設計書Markdown (md)';
  const lines: string[] = [
    '# kintone 設計書 Markdown 一括出力サマリ',
    '',
    `- 生成日時: ${input.generatedAt}`,
    `- 出力形式: ${formatLabel}`,
    `- 参照環境: ${input.preview ? 'プレビュー' : '本番'}`,
    `- 対象アプリ数: ${input.total}件（成功 ${input.items.length} / 失敗 ${actualFailedApps.length}${notRunApps.length ? ` / 未実行（中止） ${notRunApps.length}` : ''}）`
  ];
  if (input.cancelled) {
    lines.push('- 注意: 利用者の操作で中止したため、未実行のアプリは含まれていません。');
  }
  if (actualFailedApps.length) {
    lines.push('- 注意: 取得に失敗したアプリがあります。下の表のエラー内容を確認してください。');
  }
  lines.push(
    '',
    '## アプリ一覧',
    '',
    '| アプリID | アプリ名 | ゲストスペース | 取得元 | 状態 | 出力ファイル | 備考・エラー |',
    '| --- | --- | --- | --- | --- | --- | --- |'
  );
  for (const item of input.items) {
    const notes: string[] = [];
    if (item.missingSections.length) notes.push(`未取得: ${item.missingSections.join(', ')}`);
    if (item.failedSections.length) notes.push(`取得失敗: ${item.failedSections.join(', ')}`);
    if (item.partialSections.length) notes.push(`部分取得: ${item.partialSections.join(', ')}`);
    lines.push(
      `| ${escapeOverviewCell(item.appId)} | ${escapeOverviewCell(item.appName)} | ${escapeOverviewCell(item.guestId || '(通常空間)')} | ${item.source === 'settings-json' ? '設定JSON' : 'API'} | ${item.complete ? '成功' : '一部未取得・失敗あり'} | ${escapeOverviewCell(item.files.join(', '))} | ${escapeOverviewCell(notes.join(' / '))} |`
    );
  }
  for (const failed of input.failedApps) {
    const isNotRun = /未実行（中止）/.test(failed.error);
    lines.push(
      `| ${escapeOverviewCell(failed.appId)} |  | ${escapeOverviewCell(failed.guestId || '(通常空間)')} | - | ${isNotRun ? '未実行（中止）' : '失敗'} |  | ${escapeOverviewCell(failed.error)} |`
    );
  }
  lines.push('');
  return lines.join('\n');
}

/**
 * 複数アプリの設計書 Markdown / AI向けMarkdown を一括生成し、overview.md と _manifest.json を同梱した ZIP として保存する。
 */
export async function runBatchDesignExportMdZipStandalone(
  source: {
    apps?: Array<{ appId: string; guestId?: string; bundle?: any }>;
    appIdsText?: string;
    guestId?: string;
    format?: BatchDesignMdExportFormat;
    preview?: boolean;
  },
  setStatus: (msg: string, err?: boolean) => void
): Promise<BatchDesignMdZipResult> {
  const format: BatchDesignMdExportFormat = (source?.format ?? 'md') as BatchDesignMdExportFormat;
  if (format !== 'md' && format !== 'ai-md' && format !== 'both') {
    throw new Error('一括Markdown出力の形式は md、ai-md または both を指定してください');
  }
  const preview = !!source?.preview;

  let rawApps: Array<{ appId: string; guestId: string; bundle: any }>;
  if (Array.isArray(source?.apps)) {
    const validationError = validateDesignExportTargets(source.apps);
    if (validationError) throw new Error(validationError);
    rawApps = source.apps.map((a) => ({
      appId: String(a.appId || a.bundle?.appId || '').trim(),
      guestId: String(a.guestId || '').trim(),
      bundle: a.bundle || null
    }));
  } else {
    const guestId = String(source?.guestId || '').trim();
    const appIds = String(source?.appIdsText || '')
      .split(/[\s,、]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    const validationError = validateDesignExportTargets(appIds.map((appId) => ({ appId, guestId })));
    if (validationError) throw new Error(validationError);
    rawApps = appIds.map((appId) => ({ appId, guestId, bundle: null }));
  }

  const seen = new Set<string>();
  const targets: Array<{ appId: string; guestId: string; bundle: any }> = [];
  for (const item of rawApps) {
    const key = `${item.appId}::${item.guestId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    targets.push(item);
  }
  if (targets.length === 0) throw new Error('アプリIDを1件以上入力してください');

  const appIdCounts = new Map<string, number>();
  for (const t of targets) {
    appIdCounts.set(t.appId, (appIdCounts.get(t.appId) || 0) + 1);
  }

  const importedCount = targets.filter((t) => t.bundle).length;
  setStatus(`設計書Markdown ZIP出力を開始（${targets.length}件${importedCount ? ` / うち設定JSON ${importedCount}件` : ''}）...`);

  const JSZipCtor = await loadJSZipLite();
  const zip = new JSZipCtor();
  const usedFilenames = new Set<string>(['overview.md', '_manifest.json']);
  const items: BatchDesignMdManifestItem[] = [];
  const failedApps: BatchDesignMdFailedApp[] = [];
  const scopes = SECTION_DEFS.map((s) => s.key);
  let stoppedAt = -1;

  for (let i = 0; i < targets.length; i += 1) {
    if (isCancelRequested()) {
      stoppedAt = i;
      break;
    }
    const target = targets[i];
    const labelPrefix = `(${i + 1}/${targets.length}) App ${target.appId}${target.guestId ? ` (guest:${target.guestId})` : ''}: `;
    try {
      let mdBundle: any = null;
      let aiBundle: any = null;
      if (format === 'md') {
        mdBundle = await resolveDesignBundle(
          { appId: target.appId, guestId: target.guestId, preview, importedBundle: target.bundle },
          'source',
          setStatus,
          labelPrefix,
          false
        );
      } else if (format === 'ai-md') {
        aiBundle = await resolveDesignBundle(
          { appId: target.appId, guestId: target.guestId, preview, importedBundle: target.bundle },
          'source',
          setStatus,
          labelPrefix,
          true
        );
      } else {
        // format === 'both'
        if (target.bundle) {
          mdBundle = await resolveDesignBundle(
            { appId: target.appId, guestId: target.guestId, preview, importedBundle: target.bundle },
            'source',
            setStatus,
            labelPrefix,
            false
          );
          aiBundle = pickSettingsBundle(target.bundle, {
            side: 'source',
            appId: target.appId,
            rawSettings: true,
            preserveMetadata: true
          });
        } else {
          // AI向けは正規化しない原文を使うため、通常版とは別に取得する（取得結果を共有すると単独出力と内容が変わる）。
          mdBundle = await resolveDesignBundle(
            { appId: target.appId, guestId: target.guestId, preview },
            'source',
            setStatus,
            labelPrefix,
            false
          );
          aiBundle = await resolveDesignBundle(
            { appId: target.appId, guestId: target.guestId, preview },
            'source',
            setStatus,
            labelPrefix,
            true
          );
        }
      }

      const primaryBundle = aiBundle || mdBundle;
      const appName = extractAppNameFromBundle(primaryBundle) || '';
      const appLabel = appLabelFromBundle(primaryBundle) || `app${sanitizeFilenamePart(target.appId)}`;
      const guestPrefix = target.guestId && (appIdCounts.get(target.appId) || 0) > 1 ? `guest${target.guestId}_` : '';
      const files: string[] = [];
      let mdFile: string | undefined;
      let aiMdFile: string | undefined;

      if (format === 'md' || format === 'both') {
        mdFile = uniqueMdZipEntryName(usedFilenames, `${guestPrefix}設計書_${appLabel}.md`);
        zip.file(mdFile, bundleToMarkdown(mdBundle));
        files.push(mdFile);
      }
      if (format === 'ai-md' || format === 'both') {
        aiMdFile = uniqueMdZipEntryName(usedFilenames, `${guestPrefix}設計書_AI向けMarkdown_${appLabel}.md`);
        zip.file(aiMdFile, buildDesignAiMarkdown(aiBundle));
        files.push(aiMdFile);
      }

      const snapshot = buildDesignSnapshot(primaryBundle);
      const knownRows = snapshot.sections.filter((row) => scopes.includes(row.key));
      const missingSections = knownRows.filter((row) => row.status === 'missing').map((row) => row.label || row.key);
      const failedSections = knownRows.filter((row) => row.status === 'fetch-error').map((row) => row.label || row.key);
      const partialSections = knownRows.filter((row) => row.status === 'partial').map((row) => row.label || row.key);
      const complete = missingSections.length === 0 && failedSections.length === 0 && partialSections.length === 0;

      items.push({
        appId: target.appId,
        guestId: target.guestId,
        appName,
        source: target.bundle ? 'settings-json' : 'api',
        status: complete ? 'ok' : 'partial',
        file: files[0] || '',
        files,
        ...(mdFile ? { mdFile } : {}),
        ...(aiMdFile ? { aiMdFile } : {}),
        complete,
        missingSections,
        failedSections,
        partialSections
      });
    } catch (error) {
      if (isCancelStop(error)) {
        stoppedAt = i;
        break;
      }
      failedApps.push({
        appId: target.appId,
        guestId: target.guestId,
        error: firstErrorLine(error)
      });
    }
  }

  if (stoppedAt >= 0) {
    for (let j = stoppedAt; j < targets.length; j += 1) {
      failedApps.push({
        appId: targets[j].appId,
        guestId: targets[j].guestId,
        error: '未実行（中止）'
      });
    }
  }

  const successCount = items.length;
  const cancelled = stoppedAt >= 0;
  if (successCount === 0 && cancelled) {
    const priorFailures = failedApps.filter((f) => !/未実行（中止）/.test(f.error));
    throw createCancelReport(0, targets.length, [
      '設計書Markdown ZIPは保存していません。',
      ...priorFailures.map((f) => `App ${f.appId}: 中止前に失敗（${f.error}）`)
    ]);
  }
  if (successCount === 0) {
    const detail = failedApps.map((f) => `- App ${f.appId}: ${f.error}`).join('\n');
    throw new Error(`設計書Markdown ZIPの生成に失敗しました\n${detail}`);
  }

  const generatedAt = new Date().toISOString();
  const guestIds = [...new Set(targets.map((t) => t.guestId).filter(Boolean))];
  const overviewMd = buildBatchDesignMdOverview({
    generatedAt,
    format,
    preview,
    total: targets.length,
    cancelled,
    items,
    failedApps
  });
  const manifestPayload = {
    schemaVersion: 1 as const,
    generatedAt,
    format,
    preview,
    total: targets.length,
    appCount: targets.length,
    successCount,
    failedCount: failedApps.length,
    cancelled,
    guestIds,
    items,
    failedApps
  };

  zip.file('overview.md', overviewMd);
  zip.file('_manifest.json', JSON.stringify(manifestPayload, null, 2));

  setStatus('設計書Markdown ZIPファイルを生成中...');
  const blob = await zip.generateAsync({ type: 'blob' });
  const baseLabel = format === 'ai-md'
    ? '設計書_AI向けMarkdown一括'
    : format === 'both'
      ? '設計書_Markdown一括(通常+AI)'
      : '設計書_Markdown一括';
  const zipName = buildExportFilename(baseLabel, 'zip', {
    appLabel: `${successCount}件`,
    suffix: preview ? 'プレビュー' : ''
  });
  downloadBlob(zipName, blob);

  if (cancelled) {
    const notRun = failedApps.filter((f) => /未実行（中止）/.test(f.error));
    const failed = failedApps.filter((f) => !/未実行（中止）/.test(f.error));
    throw createCancelReport(successCount, targets.length, [
      `生成できた ${successCount} アプリ分の設計書Markdown ZIPを保存しました（詳細は ZIP 内の overview.md / _manifest.json）。`,
      ...failed.map((f) => `失敗 App ${f.appId}: ${f.error}`),
      ...(notRun.length ? [`未実行（中止）: ${notRun.map((f) => `App ${f.appId}`).join(', ')}`] : [])
    ]);
  }

  const incompleteApps = items.filter((item) => !item.complete);
  if (failedApps.length > 0 || incompleteApps.length > 0) {
    const parts: string[] = [];
    if (failedApps.length > 0) {
      parts.push(`成功 ${successCount} / 失敗 ${failedApps.length}（全${targets.length}件）`);
      parts.push(`失敗したアプリ: ${failedApps.map((f) => `App ${f.appId}`).join(', ')}`);
    }
    if (incompleteApps.length > 0) {
      parts.push(`一部セクション未取得・失敗あり ${incompleteApps.length}件`);
    }
    setStatus(`設計書Markdown ZIPを保存しました。${parts.join('。')}。詳細は ZIP 内の overview.md / _manifest.json を確認してください`, true);
  } else {
    setStatus(`設計書Markdown ZIP出力完了（${successCount}件）`);
  }

  return {
    schemaVersion: 1,
    generatedAt,
    format,
    preview,
    total: targets.length,
    successCount,
    failedCount: failedApps.length,
    cancelled,
    zipName,
    items,
    failedApps
  };
}

function diffLinesBlock(oLines: string[], nLines: string[]): string[] {
  let start = 0;
  while (start < oLines.length && start < nLines.length && oLines[start] === nLines[start]) {
    start++;
  }
  let oEnd = oLines.length;
  let nEnd = nLines.length;
  while (oEnd > start && nEnd > start && oLines[oEnd - 1] === nLines[nEnd - 1]) {
    oEnd--;
    nEnd--;
  }

  const out: string[] = [];
  for (let idx = 0; idx < start; idx++) out.push('  ' + oLines[idx]);

  const oMid = oLines.slice(start, oEnd);
  const nMid = nLines.slice(start, nEnd);
  const M = oMid.length;
  const N = nMid.length;

  if (M === 0) {
    for (let j = 0; j < N; j++) out.push('+ ' + nMid[j]);
  } else if (N === 0) {
    for (let i = 0; i < M; i++) out.push('- ' + oMid[i]);
  } else if (M * N <= 400_000) {
    const stride = N + 1;
    const dp = new Int32Array((M + 1) * stride);
    for (let i = M - 1; i >= 0; i--) {
      const rowOffset = i * stride;
      const nextRowOffset = (i + 1) * stride;
      const oLine = oMid[i];
      for (let j = N - 1; j >= 0; j--) {
        if (oLine === nMid[j]) {
          dp[rowOffset + j] = dp[nextRowOffset + j + 1] + 1;
        } else {
          const down = dp[nextRowOffset + j];
          const right = dp[rowOffset + j + 1];
          dp[rowOffset + j] = down >= right ? down : right;
        }
      }
    }
    let i = 0;
    let j = 0;
    while (i < M || j < N) {
      if (i < M && j < N && oMid[i] === nMid[j]) {
        out.push('  ' + oMid[i]);
        i++;
        j++;
      } else if (i < M && (j === N || dp[(i + 1) * stride + j] >= dp[i * stride + j + 1])) {
        out.push('- ' + oMid[i++]);
      } else {
        out.push('+ ' + nMid[j++]);
      }
    }
  } else {
    let i = 0;
    let j = 0;
    while (i < M || j < N) {
      if (i < M && j < N && oMid[i] === nMid[j]) {
        out.push('  ' + oMid[i]);
        i++;
        j++;
      } else {
        let rsI = -1;
        let rsJ = -1;
        for (let k = 1; k < 500; k++) {
          if (i + k < M && oMid[i + k] === nMid[j]) { rsI = i + k; rsJ = j; break; }
          if (j + k < N && oMid[i] === nMid[j + k]) { rsI = i; rsJ = j + k; break; }
        }
        if (rsI !== -1) {
          if (rsI > i) {
            for (let scan = i; scan < rsI; scan++) out.push('- ' + oMid[scan]);
            i = rsI;
          } else {
            for (let scan = j; scan < rsJ; scan++) out.push('+ ' + nMid[scan]);
            j = rsJ;
          }
        } else {
          if (i < M) out.push('- ' + oMid[i++]);
          if (j < N) out.push('+ ' + nMid[j++]);
        }
      }
    }
  }

  for (let idx = oEnd; idx < oLines.length; idx++) out.push('  ' + oLines[idx]);
  return out;
}

interface MarkdownSectionBlock {
  heading: string;
  lines: string[];
}

function splitMarkdownSections(text: string): { preamble: string[]; hasPreamble: boolean; sections: MarkdownSectionBlock[] } {
  const allLines = String(text ?? '').split('\n');
  const preamble: string[] = [];
  const sections: MarkdownSectionBlock[] = [];
  let current: MarkdownSectionBlock | null = null;
  for (const line of allLines) {
    if (/^## /.test(line)) {
      current = { heading: line, lines: [] };
      sections.push(current);
    } else if (current) {
      current.lines.push(line);
    } else {
      preamble.push(line);
    }
  }
  return {
    preamble,
    hasPreamble: sections.length === 0 || preamble.length > 0,
    sections
  };
}

export function simpleLineDiffLite(oStr: string, nStr: string): string {
  const oParsed = splitMarkdownSections(oStr);
  const nParsed = splitMarkdownSections(nStr);
  if (oParsed.sections.length === 0 && nParsed.sections.length === 0) {
    return diffLinesBlock(oParsed.preamble, nParsed.preamble).join('\n');
  }

  const result: string[] = [];
  if (oParsed.preamble.length > 0 || nParsed.preamble.length > 0) {
    result.push(...diffLinesBlock(oParsed.preamble, nParsed.preamble));
  }

  const oSecs = oParsed.sections;
  const nSecs = nParsed.sections;
  const M = oSecs.length;
  const N = nSecs.length;
  const stride = N + 1;
  const dp = new Int32Array((M + 1) * stride);
  for (let i = M - 1; i >= 0; i--) {
    for (let j = N - 1; j >= 0; j--) {
      if (oSecs[i].heading === nSecs[j].heading) {
        dp[i * stride + j] = dp[(i + 1) * stride + j + 1] + 1;
      } else {
        const down = dp[(i + 1) * stride + j];
        const right = dp[i * stride + j + 1];
        dp[i * stride + j] = down >= right ? down : right;
      }
    }
  }

  let i = 0;
  let j = 0;
  while (i < M || j < N) {
    if (i < M && j < N && oSecs[i].heading === nSecs[j].heading) {
      result.push('  ' + oSecs[i].heading);
      result.push(...diffLinesBlock(oSecs[i].lines, nSecs[j].lines));
      i++;
      j++;
    } else if (i < M && (j === N || dp[(i + 1) * stride + j] >= dp[i * stride + j + 1])) {
      result.push('- ' + oSecs[i].heading);
      for (const line of oSecs[i].lines) result.push('- ' + line);
      i++;
    } else {
      result.push('+ ' + nSecs[j].heading);
      for (const line of nSecs[j].lines) result.push('+ ' + line);
      j++;
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
  /** 取得できなかったセクションのラベル（差分が不完全になる） */
  failedSections?: string[];
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
    environment: imported ? '読み込んだ設定JSON' : (bundle?.preview ?? side?.preview) ? 'プレビュー（未公開）' : '本番（運用中）',
    failedSections: failedSectionLabels(bundle)
  };
}

function designDiffSideLabel(side: DesignDiffSide): string {
  // アプリ名は Markdown 表のセル内に入るため、区切りの | や改行で表が崩れないようにする
  const name = side.appName ? ` ${side.appName.replace(/\\/g, '\\\\').replace(/\|/g, '\\|').replace(/\s*\r?\n\s*/g, ' ')}` : '';
  return `App ${side.appId || '?'}${name}${side.guestId ? `（ゲスト ${side.guestId}）` : ''} · ${side.environment}`;
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
  const incomplete = [
    input.source.failedSections?.length ? `比較元: ${input.source.failedSections.join('、')}` : '',
    input.target.failedSections?.length ? `比較先: ${input.target.failedSections.join('、')}` : ''
  ].filter(Boolean);
  if (incomplete.length) lines.push(`| 取得できなかったセクション（差分が不完全） | ${incomplete.join(' / ')} |`);
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
  // 差分本文に ``` が含まれていても、フェンスが途中で閉じないよう囲みを長くする
  let fence = '```';
  while (input.diff.includes(fence)) fence += '`';
  lines.push(`${fence}diff`);
  lines.push(input.diff);
  lines.push(fence);
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
  // 取得日時は毎回異なりノイズになるため、比較対象から外す
  const srcMd = bundleToMarkdown(srcBundle, { rawJson: false, fetchedAt: false });
  const tgtMd = bundleToMarkdown(tgtBundle, { rawJson: false, fetchedAt: false });
  const diffMd = simpleLineDiffLite(tgtMd, srcMd);
  const finalMd = buildDesignDiffReport({
    diff: diffMd,
    generatedAt: nowStamp(),
    source: describeDesignDiffSide(srcBundle, opts.source, importedSource),
    target: describeDesignDiffSide(tgtBundle, opts.target, importedTarget)
  });
  const diffLabel = `${appLabelFromBundle(srcBundle)}_vs_${appLabelFromBundle(tgtBundle)}`;
  downloadText(buildExportFilename('設計書差分', 'md', { appLabel: diffLabel }), finalMd, 'text/markdown');
  const notes = [failedSectionNote(failedSectionLabels(srcBundle), '比較元の'), failedSectionNote(failedSectionLabels(tgtBundle), '比較先の')].filter(Boolean);
  const completeness = [designBundleCompletionNote(srcBundle), designBundleCompletionNote(tgtBundle)]
    .filter(Boolean)
    .join(' / ');
  setStatus(`設計書差分レポートを出力しました（${srcAppId} ⇔ ${tgtAppId}）${notes.length ? `。${notes.join('。')}。差分は不完全です` : ''}${completeness ? ` ${completeness}` : ''}`, notes.length > 0 || !!completeness);
}
