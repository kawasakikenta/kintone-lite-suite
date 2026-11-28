'use strict';

import { CUSTOMIZE_BODY_SENSITIVE_NOTE, PLUGIN_CONFIG_INCLUDED_NOTE, SECTION_DEFS } from '../constants.js';
import { state } from '../state.js';
import { downloadText, downloadBlob, buildExportFilename, appLabelFromBundle, copyTextToClipboard, extractAppNameFromBundle, sanitizeFilenamePart, UNSAFE_FILENAME_CHARS } from '../utils.js';
import { apiGet, buildApiPrefix, fetchBundle } from '../api.js';
import { loadJSZipLite } from '../jszipLoader.js';
import { pickSettingsBundle } from '../settingsBundleImport.js';
import { bundleToMarkdown } from '../diff/export.js';
import { buildDesignAiMarkdown } from '../design/ai-markdown.js';
import { BATCH_DESIGN_OVERVIEW_HEADERS, buildBatchDesignHtmlOverview, buildDesignHtml, type BatchDesignOverviewModel } from '../design/html.js';
import { buildDesignSnapshot } from '../design/snapshot.js';
import { stripSensitiveSupplements } from '../design/sanitize.js';
import { runAdvancedDesignExporter, runBatchDesignExportXlsxZip, type BatchDesignExportInfo, type DesignExporterCompletionSummary } from './design-xlsx.js';
import { isCancelRequested, isRunCancelledError } from '../runControl.js';
import { createCancelReport, isCancelStop } from './run-cancel-summary.js';

interface DesignSourceInput {
  appId?: string;
  guestId?: string;
  preview?: boolean;
  rawSettings?: boolean;
  importedBundle?: any;
  /** 読み込んだ設定JSONにあるアプリの名前（参照先アプリの名前に使う）。キーは `${appId}::${guestId}` と appId。 */
  appNameLookup?: Record<string, string>;
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
  rawSettings = false,
  /** false: JS/CSS 本文とプラグインの設定値を取得しない（Markdown の設計書は使わないため。通信と、取得失敗の影響を減らす）。 */
  withSupplements = true
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
      ...(withSupplements ? {} : { skipPluginConfig: true, skipCustomizeBodies: true }),
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

/** 設計書 Markdown。設定JSON由来のプラグイン設定値・JS/CSS本文は、原文 JSON にも含めない（API から直接取得した場合と同じ）。 */
function designMarkdownOf(bundle: any, options?: Parameters<typeof bundleToMarkdown>[1]): string {
  return bundleToMarkdown(stripSensitiveSupplements(bundle).bundle, options);
}

/** 設定（フィールド・テーブル内のフィールドのルックアップと関連レコード一覧、アクションの連携先）が参照しているアプリのID。 */
export function collectReferencedAppIds(bundle: any): string[] {
  const ids = new Set<string>();
  const add = (ref: any) => {
    const id = String(ref?.app ?? '').trim();
    if (/^\d+$/.test(id)) ids.add(id);
  };
  const visit = (field: any) => {
    if (!field || typeof field !== 'object') return;
    add(field.lookup?.relatedApp);
    add(field.referenceTable?.relatedApp);
  };
  const properties = bundle?.sections?.fieldSettings?.properties;
  if (properties && typeof properties === 'object') {
    for (const field of Object.values(properties) as any[]) {
      visit(field);
      if (field?.type === 'SUBTABLE' && field.fields && typeof field.fields === 'object') {
        for (const child of Object.values(field.fields)) visit(child);
      }
    }
  }
  const actions = bundle?.sections?.actionSettings?.actions;
  const list = Array.isArray(actions) ? actions : (actions && typeof actions === 'object' ? Object.values(actions) : []);
  for (const action of list as any[]) add(action?.destApp);
  return [...ids];
}

/** 同時に読む参照先アプリの数（設計書 Excel の取得と同じ）。 */
const REFERENCED_APP_NAME_CONCURRENCY = 4;

/**
 * 設計書 Markdown に出す、参照先アプリの名前（キーは `${appId}::${guestId}` と appId）。
 * 読み込んだ設定JSONの名前（known）を先に使い、kintone から取得したアプリ（live）だけ、足りない名前を
 * 参照先アプリの情報（GET app.json。読み取りのみ）から読む。読めないアプリ（権限が無い・削除済みなど）は
 * 名前を入れず、設計書には App ID だけを出す。cache は一括出力でアプリをまたいで同じアプリを読み直さないためのもの。
 */
export async function resolveReferencedAppNames(
  bundle: any,
  opts: { known?: Record<string, string>; live: boolean; guestId?: string; cache?: Map<string, string | null> }
): Promise<Record<string, string>> {
  const guestId = String(opts.guestId ?? bundle?.guestId ?? '').trim();
  const known = opts.known || {};
  const own = (key: string) => (Object.prototype.hasOwnProperty.call(known, key) ? String(known[key] || '').trim() : '');
  const names: Record<string, string> = {};
  const put = (id: string, name: string) => {
    if (!name) return;
    if (guestId) names[`${id}::${guestId}`] = name;
    names[id] = name;
  };
  const selfId = String(bundle?.appId ?? '').trim();
  const selfName = extractAppNameFromBundle(bundle);
  const missing: string[] = [];
  for (const id of collectReferencedAppIds(bundle)) {
    const name = (guestId && own(`${id}::${guestId}`)) || own(id) || (id === selfId ? selfName : '');
    if (name) { put(id, name); continue; }
    const cacheKey = `${id}::${guestId}`;
    if (opts.cache?.has(cacheKey)) { put(id, opts.cache.get(cacheKey) || ''); continue; }
    missing.push(id);
  }
  // 設定JSONから作るときは kintone に問い合わせない（別の環境の同じ番号のアプリを読まないため）。
  if (!opts.live || !missing.length) return names;
  const prefix = buildApiPrefix(guestId, false);
  for (let start = 0; start < missing.length; start += REFERENCED_APP_NAME_CONCURRENCY) {
    await Promise.all(missing.slice(start, start + REFERENCED_APP_NAME_CONCURRENCY).map(async (id) => {
      let name = '';
      try {
        const info = await apiGet(prefix, '/app.json', { id });
        name = String(info?.name || '').trim();
      } catch (error) {
        // 利用者の中止はそのまま伝える。読めない参照先は App ID だけで出す。
        if (isRunCancelledError(error)) throw error;
      }
      opts.cache?.set(`${id}::${guestId}`, name || null);
      put(id, name);
    }));
  }
  return names;
}

/** 単一出力の設計書 Markdown。参照先アプリの名前は、設定JSONから作るときは読み込んだJSONの名前だけを使う。 */
async function designMarkdownWithReferenceNames(bundle: any, source: DesignSourceInput | undefined): Promise<string> {
  const appNames = await resolveReferencedAppNames(bundle, { known: source?.appNameLookup, live: !source?.importedBundle, guestId: String(source?.guestId || '') });
  return designMarkdownOf(bundle, { appNames });
}

/** 単一出力の設計書 HTML。参照先アプリの名前は Markdown と同じ（設定JSONから作るときは読み込んだJSONの名前だけ）。 */
async function designHtmlWithReferenceNames(bundle: any, source: DesignSourceInput | undefined): Promise<string> {
  const appNames = await resolveReferencedAppNames(bundle, { known: source?.appNameLookup, live: !source?.importedBundle, guestId: String(source?.guestId || '') });
  return buildDesignHtml(bundle, { appNames, source: source?.importedBundle ? 'settings-json' : 'kintone' });
}

/**
 * @param {'md'|'json'|'ai-md'|'html'} kind
 * @param {{ appId: string, guestId: string, preview: boolean }} source
 * @param {(msg: string, err?: boolean) => void} setStatus
 */
/** 保存する前の確認画面に出す、設計書 JSON の取扱注意（どちらが入るかは取得するまで分からないため両方を書く）。 */
export const DESIGN_JSON_SENSITIVE_NOTICE = `${PLUGIN_CONFIG_INCLUDED_NOTE}。${CUSTOMIZE_BODY_SENSITIVE_NOTE}。共有する前に内容を確認してください`;

/**
 * 保存する設計書 JSON に、プラグインの設定値・JS/CSSファイルの本文が入っていれば、その取扱注意を返す。入っていなければ空文字。
 * 設計書 JSON は設定の写しなので値はそのまま残し、完了メッセージで知らせる（ファイルの内容は変えない）。
 */
export function designJsonSensitiveNotice(bundle: any): string {
  const { pluginConfigs, customizeBodies } = stripSensitiveSupplements(bundle);
  const notes = [pluginConfigs ? PLUGIN_CONFIG_INCLUDED_NOTE : '', customizeBodies ? CUSTOMIZE_BODY_SENSITIVE_NOTE : ''].filter(Boolean);
  return notes.length ? `取扱注意: ${notes.join('。')}。共有する前に内容を確認してください` : '';
}

export async function runDesignExportStandalone(kind, source, setStatus) {
  if (kind !== 'md' && kind !== 'json' && kind !== 'ai-md' && kind !== 'html') throw new Error('設計書の出力形式は md、json、ai-md または html を指定してください');
  // HTML は Markdown と同じく、JS/CSS 本文とプラグインの設定値を取得しない（載せないため）
  const bundle = await resolveDesignBundle(source, 'source', setStatus, '', kind === 'ai-md', kind === 'json');
  state.lastSourceBundle = bundle;

  const appLabel = appLabelFromBundle(bundle);
  // 設計書 JSON は設定の写し（プラグインの設定値・JS/CSS本文もそのまま）。入っていれば完了メッセージで取扱注意を知らせる
  const sensitiveNotice = kind === 'json' ? designJsonSensitiveNotice(bundle) : '';
  if (kind === 'json') {
    downloadText(buildExportFilename('設計書', 'json', { appLabel }), JSON.stringify(bundle, null, 2), 'application/json');
  } else if (kind === 'html') {
    downloadText(buildExportFilename('設計書', 'html', { appLabel }), await designHtmlWithReferenceNames(bundle, source), 'text/html');
  } else {
    const baseLabel = kind === 'ai-md' ? '設計書_AI向けMarkdown' : '設計書';
    const markdown = kind === 'ai-md' ? buildDesignAiMarkdown(bundle) : await designMarkdownWithReferenceNames(bundle, source);
    downloadText(buildExportFilename(baseLabel, 'md', { appLabel }), markdown, 'text/markdown');
  }
  // 取得失敗の警告は完了メッセージで上書きされないよう、エラー色のまま残す
  const note = failedSectionNote(failedSectionLabels(bundle));
  const completionNote = designBundleCompletionNote(bundle);
  const done = kind === 'html' ? `HTML設計書を保存しました（App ${bundle.appId}）` : `${kind === 'ai-md' ? 'AI向けMarkdown' : '設計書'}出力完了（App ${bundle.appId}）`;
  setStatus(`${done}${note ? `。${note}` : ''}${completionNote}${kind === 'ai-md' ? designBundleSourceNote(bundle) : ''}${sensitiveNotice ? `。${sensitiveNotice}` : ''}`, !!note || !!completionNote);
}

/**
 * @param {{ appId: string, guestId: string, preview: boolean }} source
 * @param {(msg: string, err?: boolean) => void} setStatus
 */
export async function runDesignCopyMdStandalone(source, setStatus) {
  const bundle = await resolveDesignBundle(source, 'source', setStatus, '', false, false);
  state.lastSourceBundle = bundle;

  const md = await designMarkdownWithReferenceNames(bundle, source);
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
      .split(/[\s,、，]+/)
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

/** 一括出力（ZIP）の形式。html は設計書 HTML と overview.html。 */
export type BatchDesignMdExportFormat = 'md' | 'ai-md' | 'both' | 'html';

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
  htmlFile?: string;
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
  const cleaned = String(baseName || '').replace(/[\\/:*?"<>|]/g, '_').replace(UNSAFE_FILENAME_CHARS, '').trim() || 'design.md';
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

/**
 * Markdown の表のセルに入れる 1 行の文字列。アプリ名などの kintone の値が表を崩したり、
 * HTML のタグとして解釈されたりしないよう、`\`・`|`・`<` を逃がし、改行を空白にする（設計書 Markdown と同じ扱い）。
 */
function escapeOverviewCell(value: unknown): string {
  return String(value ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/\|/g, '\\|')
    .replace(/\[/g, '\\[')
    .replace(/</g, '&lt;')
    .replace(/\s*[\r\n]+\s*/g, ' ')
    .trim();
}

function firstErrorLine(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error ?? '不明なエラー');
  return raw.split(/\r?\n/)[0].trim() || '不明なエラー';
}

/** 一括出力のサマリ（overview.md・overview.html）の中身。Markdown と HTML で同じ内容にする。 */
function batchDesignOverviewModel(input: {
  generatedAt: string;
  format: BatchDesignMdExportFormat;
  preview: boolean;
  total: number;
  cancelled: boolean;
  items: BatchDesignMdManifestItem[];
  failedApps: BatchDesignMdFailedApp[];
}): BatchDesignOverviewModel {
  const notRunApps = input.failedApps.filter((f) => /未実行（中止）/.test(f.error));
  const actualFailedApps = input.failedApps.filter((f) => !/未実行（中止）/.test(f.error));
  const formatLabel = input.format === 'ai-md'
    ? 'AI向けMarkdown (ai-md)'
    : input.format === 'both'
      ? '設計書Markdown + AI向けMarkdown (both)'
      : input.format === 'html'
        ? '設計書HTML (html)'
        : '設計書Markdown (md)';
  const notes: string[] = [];
  if (input.cancelled) notes.push('利用者の操作で中止したため、未実行のアプリは含まれていません。');
  if (actualFailedApps.length) notes.push('取得に失敗したアプリがあります。下の表のエラー内容を確認してください。');
  const rows: BatchDesignOverviewModel['rows'] = [];
  for (const item of input.items) {
    const remarks: string[] = [];
    if (item.missingSections.length) remarks.push(`未取得: ${item.missingSections.join(', ')}`);
    if (item.failedSections.length) remarks.push(`取得失敗: ${item.failedSections.join(', ')}`);
    if (item.partialSections.length) remarks.push(`部分取得: ${item.partialSections.join(', ')}`);
    rows.push({
      appId: item.appId,
      appName: item.appName,
      guest: item.guestId || '(通常空間)',
      source: item.source === 'settings-json' ? '設定JSON' : 'API',
      status: item.complete ? '成功' : '一部未取得・失敗あり',
      ok: true,
      files: item.files,
      remarks: remarks.join(' / ')
    });
  }
  for (const failed of input.failedApps) {
    const isNotRun = /未実行（中止）/.test(failed.error);
    rows.push({
      appId: failed.appId,
      appName: '',
      guest: failed.guestId || '(通常空間)',
      source: '-',
      status: isNotRun ? '未実行（中止）' : '失敗',
      ok: false,
      files: [],
      remarks: failed.error
    });
  }
  return {
    facts: [
      // ISO（UTC）だけだと日本の時刻と 9 時間ずれて読めるため、端末の時刻を先に書き、ISO は括弧で添える
      ['生成日時', Number.isNaN(new Date(input.generatedAt).getTime()) ? input.generatedAt : `${readableTimestamp(new Date(input.generatedAt))}（${input.generatedAt}）`],
      ['出力形式', formatLabel],
      ['参照環境', input.preview ? 'プレビュー' : '本番'],
      ['対象アプリ数', `${input.total}件（成功 ${input.items.length} / 失敗 ${actualFailedApps.length}${notRunApps.length ? ` / 未実行（中止） ${notRunApps.length}` : ''}）`]
    ],
    notes,
    rows
  };
}

function buildBatchDesignMdOverview(model: BatchDesignOverviewModel): string {
  const lines: string[] = [
    '# kintone 設計書 Markdown 一括出力サマリ',
    '',
    ...model.facts.map(([label, value]) => `- ${label}: ${value}`),
    ...model.notes.map((note) => `- 注意: ${note}`)
  ];
  lines.push(
    '',
    '## アプリ一覧',
    '',
    `| ${BATCH_DESIGN_OVERVIEW_HEADERS.join(' | ')} |`,
    `| ${BATCH_DESIGN_OVERVIEW_HEADERS.map(() => '---').join(' | ')} |`
  );
  for (const row of model.rows) {
    const cells = row.ok
      ? [escapeOverviewCell(row.appId), escapeOverviewCell(row.appName), escapeOverviewCell(row.guest), row.source, row.status, escapeOverviewCell(row.files.join(', ')), escapeOverviewCell(row.remarks)]
      : [escapeOverviewCell(row.appId), '', escapeOverviewCell(row.guest), row.source, row.status, '', escapeOverviewCell(row.remarks)];
    lines.push(`| ${cells.join(' | ')} |`);
  }
  lines.push('');
  return lines.join('\n');
}

/**
 * 複数アプリの設計書 Markdown / AI向けMarkdown / HTML を一括生成し、サマリ（overview.md。HTML では overview.html）と
 * _manifest.json を同梱した ZIP として保存する。
 */
export async function runBatchDesignExportMdZipStandalone(
  source: {
    apps?: Array<{ appId: string; guestId?: string; bundle?: any }>;
    appIdsText?: string;
    guestId?: string;
    format?: BatchDesignMdExportFormat;
    preview?: boolean;
    /** 読み込んだ設定JSONにあるアプリの名前（参照先アプリの名前に使う）。対象のアプリの設定JSONの名前は自動で加える。 */
    appNameLookup?: Record<string, string>;
  },
  setStatus: (msg: string, err?: boolean) => void
): Promise<BatchDesignMdZipResult> {
  const format: BatchDesignMdExportFormat = (source?.format ?? 'md') as BatchDesignMdExportFormat;
  if (format !== 'md' && format !== 'ai-md' && format !== 'both' && format !== 'html') {
    throw new Error('一括出力の形式は md、ai-md、both または html を指定してください');
  }
  const preview = !!source?.preview;
  const isHtml = format === 'html';
  // 完了メッセージ・ZIP の中のサマリの名前（Markdown の ZIP は今までどおり）
  const zipLabel = isHtml ? '設計書HTML ZIP' : '設計書Markdown ZIP';
  const overviewName = isHtml ? 'overview.html' : 'overview.md';

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
      .split(/[\s,、，]+/)
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
  // 参照先アプリの名前: 読み込んだ設定JSONの名前を使い、kintone から読んだ名前はアプリをまたいで使い回す。
  const knownAppNames: Record<string, string> = { ...(source.appNameLookup || {}) };
  for (const t of targets) {
    const name = t.bundle ? extractAppNameFromBundle(t.bundle) : '';
    if (!name) continue;
    if (t.guestId) knownAppNames[`${t.appId}::${t.guestId}`] = name;
    if (!knownAppNames[t.appId]) knownAppNames[t.appId] = name;
  }
  const referencedAppNameCache = new Map<string, string | null>();

  const importedCount = targets.filter((t) => t.bundle).length;
  setStatus(`${zipLabel}出力を開始（${targets.length}件${importedCount ? ` / うち設定JSON ${importedCount}件` : ''}）...`);

  const JSZipCtor = await loadJSZipLite();
  const zip = new JSZipCtor();
  const usedFilenames = new Set<string>([overviewName, '_manifest.json']);
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
      if (format === 'md' || format === 'html') {
        // HTML は Markdown と同じ取得（JS/CSS 本文とプラグインの設定値は取得しない）
        mdBundle = await resolveDesignBundle(
          { appId: target.appId, guestId: target.guestId, preview, importedBundle: target.bundle },
          'source',
          setStatus,
          labelPrefix,
          false,
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
            false,
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
            false,
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
      // 設定を 1 つも取得できなかったアプリ（存在しない・閲覧できないなど）は、空の設計書を入れず失敗として数える。
      if (!target.bundle) {
        const fetched = buildDesignSnapshot(primaryBundle).sections.filter((row) => scopes.includes(row.key));
        const failed = fetched.filter((row) => row.status === 'fetch-error');
        if (failed.length && failed.length === fetched.length) {
          const detail = String(failed.find((row) => row.key === 'appInfo')?.detail || failed[0].detail || '').split('\n')[0].replace(/^取得失敗:\s*/, '');
          throw new Error(`設定を取得できませんでした（${detail || '取得失敗'}）`);
        }
      }
      const appName = extractAppNameFromBundle(primaryBundle) || '';
      const appLabel = appLabelFromBundle(primaryBundle) || `app${sanitizeFilenamePart(target.appId)}`;
      const guestPrefix = target.guestId && (appIdCounts.get(target.appId) || 0) > 1 ? `guest${target.guestId}_` : '';
      const files: string[] = [];
      let mdFile: string | undefined;
      let aiMdFile: string | undefined;
      let htmlFile: string | undefined;

      if (format === 'html') {
        htmlFile = uniqueMdZipEntryName(usedFilenames, `${guestPrefix}設計書_${appLabel}.html`);
        const appNames = await resolveReferencedAppNames(mdBundle, { known: knownAppNames, live: !target.bundle, guestId: target.guestId, cache: referencedAppNameCache });
        zip.file(htmlFile, buildDesignHtml(mdBundle, { appNames, source: target.bundle ? 'settings-json' : 'kintone' }));
        files.push(htmlFile);
      }
      if (format === 'md' || format === 'both') {
        mdFile = uniqueMdZipEntryName(usedFilenames, `${guestPrefix}設計書_${appLabel}.md`);
        const appNames = await resolveReferencedAppNames(mdBundle, { known: knownAppNames, live: !target.bundle, guestId: target.guestId, cache: referencedAppNameCache });
        zip.file(mdFile, designMarkdownOf(mdBundle, { appNames }));
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
        ...(htmlFile ? { htmlFile } : {}),
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
      `${zipLabel}は保存していません。`,
      ...priorFailures.map((f) => `App ${f.appId}: 中止前に失敗（${f.error}）`)
    ]);
  }
  if (successCount === 0) {
    const detail = failedApps.map((f) => `- App ${f.appId}: ${f.error}`).join('\n');
    throw new Error(`${zipLabel}の生成に失敗しました\n${detail}`);
  }

  const generatedAt = new Date().toISOString();
  const guestIds = [...new Set(targets.map((t) => t.guestId).filter(Boolean))];
  const overviewModel = batchDesignOverviewModel({
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

  zip.file(overviewName, isHtml ? buildBatchDesignHtmlOverview(overviewModel) : buildBatchDesignMdOverview(overviewModel));
  zip.file('_manifest.json', JSON.stringify(manifestPayload, null, 2));

  setStatus(`${zipLabel}ファイルを生成中...`);
  const blob = await zip.generateAsync({ type: 'blob' });
  const baseLabel = format === 'ai-md'
    ? '設計書_AI向けMarkdown一括'
    : format === 'both'
      ? '設計書_Markdown一括(通常+AI)'
      : isHtml
        ? '設計書_HTML一括'
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
      `生成できた ${successCount} アプリ分の${zipLabel}を保存しました（詳細は ZIP 内の ${overviewName} / _manifest.json）。`,
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
    setStatus(`${zipLabel}を保存しました。${parts.join('。')}。詳細は ZIP 内の ${overviewName} / _manifest.json を確認してください`, true);
  } else {
    setStatus(isHtml ? `${zipLabel}を保存しました（${successCount}件）` : `${zipLabel}出力完了（${successCount}件）`);
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
  // アプリ名は Markdown 表のセル内に入るため、区切りの | や改行で表が崩れず、< がタグにならないようにする
  const name = side.appName ? ` ${escapeOverviewCell(side.appName)}` : '';
  return `App ${escapeOverviewCell(side.appId) || '?'}${name}${side.guestId ? `（ゲスト ${escapeOverviewCell(side.guestId)}）` : ''} · ${side.environment}`;
}

/** レポートに書く生成日時（ファイル名用の 20261109_220200 ではなく、読める形）。 */
function readableTimestamp(date: Date): string {
  const two = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${two(date.getMonth() + 1)}-${two(date.getDate())} ${two(date.getHours())}:${two(date.getMinutes())}:${two(date.getSeconds())}`;
}

/** 差分レポートに残す、変更行の前後の変更なしの行数。 */
export const DESIGN_DIFF_CONTEXT_LINES = 3;

/**
 * diff 行（'+ ' / '- ' / '  ' で始まる）から、変更行とその前後 `context` 行だけを残す。
 * 設計書全体（業務アプリで数千行）の中に変更が埋もれないよう、離れた変更の前に、その変更が属するセクションと省略した行数を `@@ セクション（省略 N 行）@@` で示す。
 * 変更が無い、または全体が文脈に収まるときは、入力をそのまま返す。
 */
export function compactDesignDiff(diff: string, context = DESIGN_DIFF_CONTEXT_LINES): string {
  const lines = String(diff ?? '').split('\n');
  const changedAt: number[] = [];
  lines.forEach((line, index) => { if (line.startsWith('+ ') || line.startsWith('- ')) changedAt.push(index); });
  if (!changedAt.length) return String(diff ?? '');
  const keep = new Array<boolean>(lines.length).fill(false);
  for (const index of changedAt) {
    for (let k = Math.max(0, index - context); k <= Math.min(lines.length - 1, index + context); k += 1) keep[k] = true;
  }
  if (keep.every(Boolean)) return lines.join('\n');
  const sectionAt: string[] = [];
  let current = '';
  lines.forEach((line, index) => {
    const body = line.slice(2);
    if (/^## /.test(body)) current = body.slice(3).trim();
    sectionAt[index] = current;
  });
  const out: string[] = [];
  let previousKept = -1;
  const firstChangedFrom = (start: number) => changedAt.find((index) => index >= start) ?? start;
  for (let i = 0; i < lines.length; i += 1) {
    if (!keep[i]) continue;
    if (i !== previousKept + 1) {
      const omitted = i - previousKept - 1;
      const section = sectionAt[firstChangedFrom(i)] || '（ヘッダー）';
      out.push(`@@ ${section}（省略 ${omitted} 行）@@`);
    }
    out.push(lines[i]);
    previousKept = i;
  }
  if (previousKept < lines.length - 1) out.push(`@@ 以降の ${lines.length - 1 - previousKept} 行は変更なし @@`);
  return out.join('\n');
}

/** 設計書差分レポート（Markdown）を組み立てる。見出し・見方・セクション別集計・diff 本体の順。 */
export function buildDesignDiffReport(input: { diff: string; generatedAt: string; source: DesignDiffSide; target: DesignDiffSide }): string {
  const summary = summarizeDesignDiff(input.diff);
  const diffBody = compactDesignDiff(input.diff);
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
  if (diffBody !== input.diff) lines.push(`- 変更のない行は、変更の前後 ${DESIGN_DIFF_CONTEXT_LINES} 行を除いて省略しています。\`@@ セクション名（省略 N 行）@@\` の行が区切りです。`);
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
  while (diffBody.includes(fence)) fence += '`';
  lines.push(`${fence}diff`);
  lines.push(diffBody);
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

  const srcBundle = await resolveDesignBundle(opts.source, 'source', setStatus, '比較元: ', false, false);
  const tgtBundle = await resolveDesignBundle(opts.target, 'target', setStatus, '比較先: ', false, false);

  setStatus('差分レポート生成中...');
  // 生データ JSON は表・要約と重複して差分を読みにくくするため、比較は可読部分だけで行う
  // 取得日時は毎回異なりノイズになるため、比較対象から外す
  const srcMd = designMarkdownOf(srcBundle, { rawJson: false, fetchedAt: false });
  const tgtMd = designMarkdownOf(tgtBundle, { rawJson: false, fetchedAt: false });
  const diffMd = simpleLineDiffLite(tgtMd, srcMd);
  const finalMd = buildDesignDiffReport({
    diff: diffMd,
    generatedAt: readableTimestamp(new Date()),
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
