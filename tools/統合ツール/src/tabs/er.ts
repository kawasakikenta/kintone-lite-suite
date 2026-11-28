'use strict';

import { state, ui } from '../state.js';
import { esc, safeJsonForScript } from '../utils.js';
import { apiGet, buildApiPrefix } from '../api.js';
import { isRunCancelledError } from '../runControl.js';
import { createCancelReport } from './run-cancel-summary.js';
import { getToolDocument } from '../ui/dialog.js';
import { analyzeErDependencies } from './er-analysis.js';
import { buildErLibraryScripts, escapeInlineScriptSource } from './er-libraries.js';
import { buildErAppModel, buildFailedErAppModel, ER_FIELD_TYPE_LABELS, ER_MD_MERMAID_MAX_CHARS } from './er-model.js';
import { ER_VIEWER_SCRIPT, renderErViewerPage } from './er-viewer/page.js';
import { buildErModelFromOfflineSource, describeOfflineFetchedAt, type ErOfflineSource } from './er-offline.js';

const ER_DEFAULTS = {
  maxFields: 220,
  sleepMs: 80,
  // 同時に読み取るアプリ数。1 アプリあたり 3 リクエスト（項目・アプリ情報・アクション）を並べて送るため、同時接続は最大 3 倍になる。
  concurrency: 4,
  layoutName: 'dagre',
  fieldDensity: 'standard',
  maxDepth: 0,
  includeSubtableFields: true,
  includeReverseLookup: false
};
const ER_TRAVERSE_RELATION_KINDS = new Set(['LOOKUP', 'REF', 'ACTION']);

export function formatErLayoutLabel(layoutName) {
  const map = {
    dagre: '階層',
    breadthfirst: 'ツリー',
    cose: '自動',
    concentric: '同心円',
    grid: 'グリッド',
    circle: '円形'
  };
  return map[layoutName] || layoutName || '-';
}

// 起点アプリIDが数百件になると UI が崩れるため、先頭数件 + 件数に要約する
export function summarizeErStartIds(ids, maxShown = 5): string {
  const list = (Array.isArray(ids) ? ids : []).map((v) => String(v)).filter(Boolean);
  if (!list.length) return '-';
  if (list.length <= maxShown) return list.join(', ');
  return `${list.slice(0, maxShown).join(', ')} 他${list.length - maxShown}件 (計${list.length})`;
}

const progressUi = (() => {
  let el, bar, msg;
  const removeEl = () => {
    if (el && el.parentNode) el.parentNode.removeChild(el);
    el = null; bar = null; msg = null;
  };
  return {
    init() {
      removeEl();
      const doc = (() => { try { return getToolDocument(); } catch (_) { return document; } })();
      el = doc.createElement("div");
      Object.assign(el.style, {
        position: "fixed", bottom: "20px", left: "20px", width: "320px",
        padding: "16px", background: "rgba(10,10,18,0.94)", color: "#fff",
        borderRadius: "12px", zIndex: "999990", fontFamily: "sans-serif",
        boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
      });
      el.innerHTML = `
      <div style="font-weight:700;margin-bottom:10px;font-size:14px;">📊 ER図を生成中...</div>
      <div style="background:#333;height:8px;border-radius:4px;overflow:hidden;">
        <div id="_eb" style="width:0%;height:100%;background:linear-gradient(90deg,#00d4ff,#7b61ff);transition:width .3s;border-radius:4px;"></div>
      </div>
      <div id="_em" style="font-size:12.5px;margin-top:8px;color:#aaa;">準備中...</div>`;
      (doc.body || doc.documentElement).appendChild(el);
      bar = el.querySelector("#_eb"); msg = el.querySelector("#_em");
      if (bar) bar.style.background = "linear-gradient(90deg,#00d4ff,#7b61ff)";
    },
    update(p, t) { if (bar) bar.style.width = p + "%"; if (msg) msg.textContent = t; },
    close() {
      if (!el) return;
      this.update(100, "完了！");
      const target = el;
      setTimeout(() => {
        if (target) target.style.opacity = "0";
        setTimeout(() => { if (target && target.parentNode) target.parentNode.removeChild(target); if (el === target) { el = null; bar = null; msg = null; } }, 600);
      }, 2e3);
    },
    error(e) {
      if (!el) return;
      this.update(100, "エラー: " + e);
      if (bar) bar.style.background = "#f44";
      const target = el;
      setTimeout(() => {
        if (target && target.parentNode) target.parentNode.removeChild(target);
        if (el === target) { el = null; bar = null; msg = null; }
      }, 6e3);
    },
    dismiss() { removeEl(); },
  };
})();

export { progressUi, ER_DEFAULTS };

const sleep = ms => new Promise(r => setTimeout(r, ms));

const fetchAllApps = async (options) => {
  const prefix = buildApiPrefix(options?.source?.guestId, false);
  const apps = [];
  const limit = 100;
  for (let offset = 0; ; offset += limit) {
    const resp = await apiGet(prefix, '/apps.json', { limit, offset });
    const chunk = Array.isArray(resp?.apps) ? resp.apps : [];
    apps.push(...chunk);
    if (chunk.length < limit) break;
  }
  return apps;
};

const getSchema = async (rawAppId, options, cache) => {
  // キャッシュキーを数値へ正規化し、文字列/数値の揺れによる二重取得を防ぐ
  const appId = Number(rawAppId);
  if (cache.has(appId)) return cache.get(appId);

  const prefix = buildApiPrefix(options?.source?.guestId, !!options?.source?.preview);
  const appInfoPrefix = buildApiPrefix(options?.source?.guestId, false);
  const [fieldsResult, appInfoResult, actionsResult] = await Promise.allSettled([
    apiGet(prefix, '/app/form/fields.json', { app: appId }),
    apiGet(appInfoPrefix, '/app.json', { id: appId }),
    apiGet(prefix, '/app/actions.json', { app: appId })
  ]);

  // 中止を「このアプリの取得失敗」としてキャッシュしない。探索全体を止めて呼び出し元へ伝える。
  for (const settled of [fieldsResult, appInfoResult, actionsResult]) {
    if (settled.status === 'rejected' && isRunCancelledError(settled.reason)) throw settled.reason;
  }
  const appInfoResponse = appInfoResult.status === 'fulfilled' ? appInfoResult.value : undefined;
  let model;
  if (fieldsResult.status === 'rejected') {
    console.error(`App ${appId}:`, fieldsResult.reason);
    model = buildFailedErAppModel(appId, fieldsResult.reason, {
      appInfoResponse,
      sourceGuestId: options?.source?.guestId || ''
    });
  } else {
    try {
      model = buildErAppModel({
        appId,
        fieldsResponse: fieldsResult.value,
        appInfoResponse,
        actionsResponse: actionsResult.status === 'fulfilled' ? actionsResult.value : undefined,
        appInfoError: appInfoResult.status === 'rejected' ? appInfoResult.reason : undefined,
        actionsError: actionsResult.status === 'rejected' ? actionsResult.reason : undefined,
        sourceGuestId: options?.source?.guestId || ''
      });
    } catch (e) {
      // 想定外の応答形でも1アプリの取得失敗として扱い、探索全体を止めない
      console.error(`App ${appId}:`, e);
      model = buildFailedErAppModel(appId, e, {
        appInfoResponse,
        sourceGuestId: options?.source?.guestId || ''
      });
    }
  }
  cache.set(appId, model);
  return model;
};

/**
 * 逆引き走査で関連を読み取れなかったアプリの要約文。問題がなければ空文字。
 * 走査に失敗したアプリを参照している関連は、図に含まれない可能性がある。
 */
export function describeReverseScan(options: any): string {
  const report = options?.reverseScan;
  const incomplete = Array.isArray(report?.incomplete) ? report.incomplete.length : 0;
  if (!incomplete) return '';
  return `逆引き走査: 全${Number(report.total) || 0}アプリ中 ${incomplete}アプリは取得失敗または一部取得のため、それらを参照する関連が図に含まれない可能性があります`;
}

/** 同時に読み取るアプリ数。指定（テスト用）が不正なら既定値にする。 */
function resolveCrawlConcurrency(options: any): number {
  const value = Math.floor(Number(options?.concurrency));
  return Number.isFinite(value) && value >= 1 ? Math.min(value, 8) : ER_DEFAULTS.concurrency;
}

interface OrderedRun {
  /** 完了した要素（完了順ではなく添字で持つ） */
  done: boolean[];
  /** 着手した要素 */
  started: boolean[];
  failure: { error: unknown } | null;
}

/**
 * items を最大 limit 件ずつ同時に処理し、結果は items の順に commit へ渡す（完了順に依存しない）。
 * 1 件でも失敗（中止を含む）したら新しい要素には着手せず、処理中の要素の終了を待ってから failure を返す。
 * 各レーンは 1 件終えるたび pauseMs だけ待つ（直列のときの間隔を、レーンごとに保つ）。
 */
async function runOrdered<T, R>(
  items: readonly T[],
  limit: number,
  pauseMs: number,
  work: (item: T, index: number) => Promise<R>,
  commit: (item: T, result: R, index: number) => void
): Promise<OrderedRun> {
  const done: boolean[] = new Array(items.length).fill(false);
  const started: boolean[] = new Array(items.length).fill(false);
  const results: Array<R | undefined> = new Array(items.length);
  const run: OrderedRun = { done, started, failure: null };
  let next = 0;
  let committed = 0;
  const drain = () => {
    while (committed < items.length && done[committed]) {
      const index = committed;
      committed += 1;
      const result = results[index] as R;
      results[index] = undefined;
      commit(items[index], result, index);
    }
  };
  const lane = async () => {
    while (!run.failure && next < items.length) {
      const index = next;
      next += 1;
      started[index] = true;
      try {
        results[index] = await work(items[index], index);
        done[index] = true;
        if (!run.failure) drain();
      } catch (error) {
        if (!run.failure) run.failure = { error };
        return;
      }
      if (pauseMs > 0 && next < items.length && !run.failure) await sleep(pauseMs);
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, lane));
  return run;
}

const countTrue = (flags: boolean[]): number => flags.reduce((sum, flag) => sum + (flag ? 1 : 0), 0);

const MAX_INTERRUPTED_APPS_SHOWN = 5;

/**
 * 起点から関連を辿ってアプリの設定を読み取る。
 * 深さごとに、同時に最大 `concurrency` アプリ（既定 4）を読み取る。結果の並び・深さ・関連は、1 アプリずつ順に読んだときと同じ
 * （各深さの結果を、見つけた順に取り込んで次の深さを決める）。
 */
export const crawl = async (startIds, options) => {
  const cache = new Map();
  let reverseLookupIndex = null;
  const concurrency = resolveCrawlConcurrency(options);
  // 設定JSONから作るとき（options.offlineSource）は kintone に問い合わせず、読み込んだ設定からモデルを作る。
  // 読み込んでいないアプリは null になり、図には入れない（関連の参照先は「未取得の参照先」になる）。
  const offline: ErOfflineSource | null = options?.offlineSource || null;
  const sleepMs = offline ? 0 : (options?.sleepMs || ER_DEFAULTS.sleepMs);
  const loadSchema = (appId: number): Promise<any> => {
    if (!offline) return getSchema(appId, options, cache);
    const key = Number(appId);
    if (!cache.has(key)) cache.set(key, buildErModelFromOfflineSource(offline, key));
    return Promise.resolve(cache.get(key));
  };
  // 数値化した上で Set デデュープ（"010" と "10" のような表記揺れでも二重取得しない）
  const seeds = [...new Set((Array.isArray(startIds) ? startIds : [startIds]).map((v) => Number(v)).filter((v) => Number.isFinite(v) && v > 0))];
  const apps = [];
  if (options?.includeReverseLookup) {
    progressUi.update(3, offline ? '逆引き探索用に読み込んだアプリを走査中...' : '逆引き探索用に全アプリを走査中...');
    const allApps = offline ? offline.appIds.map((appId) => ({ appId })) : await fetchAllApps(options);
    reverseLookupIndex = new Map();
    const incomplete: Array<{ appId: number; status: string; message: string }> = [];
    options.reverseScan = { total: allApps.length, incomplete };
    const scanIds = [...new Set(allApps.map((entry) => Number(entry?.appId)).filter((appId) => appId > 0))];
    const skipped = allApps.length - scanIds.length;
    const scan = await runOrdered(scanIds, concurrency, offline ? 0 : Math.max(10, Math.floor(sleepMs / 4)),
      (appId) => loadSchema(appId),
      (appId, schema, i) => {
        if (!schema) return;
        const relationIssues = (schema.issues || []).filter((issue) => issue.scope !== 'metadata');
        if (schema.status === 'failed' || schema.ok === false || relationIssues.length) {
          incomplete.push({ appId, status: schema.status, message: (relationIssues[0] || schema.issues?.[0])?.message || '' });
        }
        for (const rel of schema.relations || []) {
          if (!ER_TRAVERSE_RELATION_KINDS.has(rel.kind)) continue;
          const targetId = Number(rel.toApp);
          if (!targetId) continue;
          const set = reverseLookupIndex.get(targetId) || new Set();
          set.add(appId);
          reverseLookupIndex.set(targetId, set);
        }
        if (i % 20 === 0) progressUi.update(3 + Math.min(20, Math.floor((i / Math.max(1, scanIds.length)) * 20)), `逆引き探索インデックス作成中... ${i + 1}/${scanIds.length}`);
      });
    if (scan.failure) {
      if (!isRunCancelledError(scan.failure.error)) throw scan.failure.error;
      throw createCancelReport(skipped + countTrue(scan.done), allApps.length, ['逆引き探索用の全アプリ走査を中止しました', 'ER図は生成していません']);
    }
  }

  // 幅優先。深さごとに読み取り、深さ内の結果を先頭から順に取り込んで次の深さの並びを決める。
  const visited = new Set<number>(seeds);
  let level = seeds.map((id) => ({ id, depth: 0 }));
  while (level.length) {
    const next: Array<{ id: number; depth: number }> = [];
    const nextIds = new Set<number>();
    const enqueueIfNeeded = (appId: number, depth: number) => {
      if (!Number.isFinite(appId) || appId <= 0) return;
      if (visited.has(appId) || nextIds.has(appId)) return;
      nextIds.add(appId);
      next.push({ id: appId, depth });
    };
    let levelCommitted = 0;
    const levelRun = await runOrdered(level, concurrency, sleepMs,
      (item) => loadSchema(item.id),
      (item, a, i) => {
        if (!a) return;
        const { id, depth } = item;
        a.depth = depth;
        apps.push(a);
        levelCommitted += 1;
        progressUi.update(Math.min(90, (apps.length / Math.max(1, apps.length + (level.length - i - 1) + next.length)) * 100 | 0), `解析: ${a.name} / 深さ ${depth}`);
        if (options?.maxDepth > 0 && depth >= options.maxDepth) return;
        for (const r of a.relations) {
          if (!ER_TRAVERSE_RELATION_KINDS.has(r.kind)) continue;
          enqueueIfNeeded(Number(r.toApp), depth + 1);
        }
        if (reverseLookupIndex && reverseLookupIndex.has(id)) {
          for (const srcId of Array.from(reverseLookupIndex.get(id))) enqueueIfNeeded(Number(srcId), depth + 1);
        }
      });
    if (levelRun.failure) {
      if (!isRunCancelledError(levelRun.failure.error)) throw levelRun.failure.error;
      // 読み取りを終えたアプリ（取り込み前を含む）を処理済み、この深さの未完了と見つけ済みの次の深さを未実行として数える
      const finishedInLevel = countTrue(levelRun.done);
      const processed = apps.length - levelCommitted + finishedInLevel;
      const interrupted = level.filter((_, i) => levelRun.started[i] && !levelRun.done[i]).map((item) => item.id);
      const shown = interrupted.slice(0, MAX_INTERRUPTED_APPS_SHOWN).join(', ');
      throw createCancelReport(processed, processed + (level.length - finishedInLevel) + next.length, [
        `解析を中断したアプリ: ${shown}${interrupted.length > MAX_INTERRUPTED_APPS_SHOWN ? ` ほか ${interrupted.length - MAX_INTERRUPTED_APPS_SHOWN} 件` : ''}`,
        '残りは、ここまでの解析で見つかった未解析のアプリ（関連先をすべて辿れていない可能性があります）',
        'ER図は生成していません'
      ]);
    }
    for (const item of next) visited.add(item.id);
    level = next;
  }
  return apps;
};

/**
 * 解析できたアプリが 1 つもない場合に、起点アプリと理由を示して失敗にする。
 * ほぼ空の HTML を「保存しました」と報告しないための確認で、一部でも解析できていれば何もしない。
 */
export const assertErAnalysed = (apps: any[], options: any = {}): void => {
  const isFailed = (app: any): boolean => app?.status === 'failed' || app?.ok === false;
  if (apps.some((app) => !isFailed(app))) return;
  const startIds: string[] = Array.isArray(options?.startAppIds) ? options.startAppIds.map(String) : [];
  const byId = new Map(apps.map((app) => [String(app?.id), app]));
  const targets = (startIds.length ? startIds : apps.map((app) => String(app?.id))).map((id) => {
    const app: any = byId.get(id);
    const name = app?.name && app.name !== `アプリ ${id}` ? `（${app.name}）` : '';
    // kintone のエラー文は「。」で終わることが多い。続けて「。」を付けるため、末尾の句点は外す（「。。」にしない）。
    const reason = String(app?.issues?.[0]?.message || app?.issues?.[0]?.code || '原因不明').replace(/[。．.\s]+$/, '');
    return `起点アプリ ${id}${name}を取得できませんでした: ${reason}`;
  });
  const hint = options?.offlineSource
    ? '設定取得で「フィールド設定」を含めて保存した設定JSONか確認してください'
    : 'アプリIDと閲覧権限を確認してください';
  throw new Error(`ER図を作成できませんでした。${targets.join(' / ')}。${hint}`);
};

/** 取得日時の表示（例: 2026/11/28 10:39）。 */
function formatErGeneratedAt(date: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}/${p(date.getMonth() + 1)}/${p(date.getDate())} ${p(date.getHours())}:${p(date.getMinutes())}`;
}

/** 見出しの横に出す対象（起点アプリの名前。多いときは先頭と件数）。 */
export function describeErTarget(apps: any[], startAppIds: string[]): { text: string; title: string } {
  const byId = new Map((Array.isArray(apps) ? apps : []).map((app) => [String(app?.id), app]));
  const names = startAppIds.map((id) => {
    const app: any = byId.get(String(id));
    return app?.name ? String(app.name) : `App ${id}`;
  });
  if (!names.length) return { text: '', title: '' };
  const title = `起点: ${names.join('、')}`;
  if (names.length === 1) return { text: `${names[0]}（App ${startAppIds[0]}）`, title };
  if (names.length <= 3) return { text: names.join('、'), title };
  return { text: `${names[0]} ほか ${names.length - 1} 件`, title };
}

/** 接続先の表示（ホスト・通常空間／ゲストスペース・本番／プレビュー）。 */
function describeErConnection(options: any, host: string): string {
  const space = options?.source?.guestId ? `ゲストスペース ${String(options.source.guestId)}` : '通常空間';
  const env = options?.source?.preview ? 'プレビュー' : '本番';
  return [host, space, env].filter(Boolean).join(' / ');
}

export const buildHTML = (apps, options: any = {}) => {
  const safeApps = Array.isArray(apps) ? apps : [];
  // allFields が正規データ。旧互換用 fields を同時に埋め込むと大規模図でHTMLがほぼ倍になるため省く。
  const serializedApps = safeApps.map((app) => {
    if (!app || !Array.isArray(app.allFields)) return app;
    const { fields: _legacyDensityFields, ...rest } = app;
    return rest;
  });
  const data = safeJsonForScript(serializedApps);
  const reverseScanNote = describeReverseScan(options);
  // 設定JSONから作ったときは、取得日時に読み込んだ設定の取得日時を使い、いま開いている kintone のホストは出さない
  const offline: ErOfflineSource | null = options.offlineSource || null;
  const offlineFrom = offline?.fetchedAtFrom ? new Date(offline.fetchedAtFrom) : null;
  const generatedAt = offlineFrom || (options.generatedAt ? new Date(options.generatedAt) : new Date());
  // 接続先のホスト。kintone の画面で作るときだけ分かる（単体テストなどでは空）
  const sourceHost = offline ? '' : String(options.source?.host || (typeof location !== 'undefined' && location && location.host ? location.host : ''));
  const offlineFetchedText = offline ? describeOfflineFetchedAt(offline, formatErGeneratedAt) : '';
  const sourceLabel = offline ? `設定JSONから作成（${offlineFetchedText} 取得）` : '';
  const startAppIdList = (Array.isArray(options.startAppIds) ? options.startAppIds : [options.startAppId || '']).map((v) => String(v)).filter(Boolean);
  const diagramOptions = safeJsonForScript({
    startAppId: options.startAppId || '',
    startAppIds: Array.isArray(options.startAppIds) ? options.startAppIds : [options.startAppId || ''],
    layoutName: options.layoutName || ER_DEFAULTS.layoutName,
    fieldDensity: options.fieldDensity || ER_DEFAULTS.fieldDensity,
    maxFields: Number(options.maxFields) || ER_DEFAULTS.maxFields,
    maxDepth: options.maxDepth || 0,
    includeSubtableFields: !!options.includeSubtableFields,
    includeReverseLookup: !!options.includeReverseLookup,
    spaceId: options.spaceId || '',
    spaceAppIds: Array.isArray(options.spaceAppIds) ? options.spaceAppIds.map((v) => String(v)) : [],
    sourceGuestId: options.source?.guestId || '',
    sourcePreview: !!options.source?.preview,
    sourceHost,
    generatedAt: generatedAt.toISOString(),
    reverseScanNote,
    // 設定JSONから作った図だけ「設定JSONから作成（取得日時）」を持つ（印刷・出力の見出しに出す）
    ...(sourceLabel ? { sourceLabel } : {})
  });
  const dependencyAnalysis = analyzeErDependencies(safeApps);
  const dependencyAnalysisData = safeJsonForScript(dependencyAnalysis);
  const densityLabelMap = { none: '結合のみ', compact: 'コンパクト', standard: '標準', full: '詳細' };
  const summary = safeApps.reduce((acc, app) => {
    acc.relations += Array.isArray(app?.relations) ? app.relations.length : 0;
    acc.lookups += Number(app?.lookupCount || 0);
    acc.refs += Number(app?.refCount || 0);
    acc.actions += (app?.relations || []).filter((rel) => rel?.kind === 'ACTION').length;
    acc.required += Number(app?.requiredCount || 0);
    return acc;
  }, { relations: 0, lookups: 0, refs: 0, actions: 0, required: 0 });
  const erSpaceId = String(options.spaceId || '');
  const spaceAppIdSet = new Set((Array.isArray(options.spaceAppIds) ? options.spaceAppIds : []).map((v) => String(v)));
  const spaceAppCount = erSpaceId
    ? safeApps.filter((app) => spaceAppIdSet.has(String(app?.id)) || String(app?.spaceId || '') === erSpaceId).length
    : 0;
  const densityLabel = densityLabelMap[options.fieldDensity || ER_DEFAULTS.fieldDensity] || String(options.fieldDensity || ER_DEFAULTS.fieldDensity || '-');
  const target = describeErTarget(safeApps, startAppIdList);
  const connectionText = offline ? offline.connectionText : describeErConnection(options, sourceHost);
  const conditions: Array<[string, string]> = [
    ['起点', summarizeErStartIds(startAppIdList)],
    ...(offline ? [['取得元', `設定JSON${offline.fileName ? `「${offline.fileName}」` : ''}（${offline.appIds.length}アプリ。kintone には問い合わせていません）`] as [string, string]] : []),
    ['接続先', connectionText],
    ['取得日時', offline ? offlineFetchedText : formatErGeneratedAt(generatedAt)],
    ['探索の深さ', options.maxDepth ? String(options.maxDepth) : '無制限'],
    ['逆引き探索', options.includeReverseLookup ? 'ON' : 'OFF'],
    ['サブテーブル', options.includeSubtableFields ? 'ON' : 'OFF'],
    ['配置', formatErLayoutLabel(options.layoutName)],
    ['カードの項目', densityLabel]
  ];
  if (erSpaceId) conditions.push(['スペース', `#${erSpaceId}（${spaceAppCount}アプリ。二重枠で表示）`]);
  if (reverseScanNote) conditions.push(['逆引き走査', `${options.reverseScan.incomplete.length}/${options.reverseScan.total}件が不完全。${reverseScanNote}`]);
  const runtimeFallbackRows = safeApps.map((app) => `<tr><td>${esc(String(app?.id || '-'))}</td><td>${esc(String(app?.name || `アプリ ${app?.id || '-'}`))}</td><td>${esc(String(app?.totalFieldCount ?? app?.allFields?.length ?? app?.fields?.length ?? 0))}</td><td>${esc(String(app?.relations?.length || 0))}</td><td>${esc(app?.status === 'partial' ? '一部取得' : (app?.ok === false ? '取得失敗' : '取得完了'))}</td></tr>`).join('');
  const mainScript = [
    `const APPS = ${data};`,
    `const ER_OPTIONS = ${diagramOptions};`,
    `const ER_ANALYSIS = ${dependencyAnalysisData};`,
    // kintone API のフィールド ENUM を日本語化（ER 図側パネル表示用）
    `const FIELD_TYPE_JP_LABEL = ${safeJsonForScript(ER_FIELD_TYPE_LABELS)};`,
    `const ER_MD_MERMAID_MAX_CHARS=${ER_MD_MERMAID_MAX_CHARS};`,
    escapeInlineScriptSource(ER_VIEWER_SCRIPT)
  ].join('\n');
  return renderErViewerPage({
    pageTitle: target.text ? `kintone ER図 - ${target.text}` : 'kintone ER図',
    targetText: target.text,
    targetTitle: target.title,
    generatedText: formatErGeneratedAt(generatedAt),
    ...(sourceLabel ? { sourceText: sourceLabel } : {}),
    connectionText,
    libraryScripts: buildErLibraryScripts(),
    appCount: safeApps.length,
    relationCount: summary.relations,
    summary,
    analysis: {
      counts: dependencyAnalysis.counts,
      cycles: dependencyAnalysis.cycles.length,
      isolated: dependencyAnalysis.isolatedAppIds.length,
      selfReferences: dependencyAnalysis.selfReferences.length,
      unresolved: dependencyAnalysis.unresolvedTargets.length,
      highConnectionThreshold: dependencyAnalysis.highConnectionThreshold
    },
    conditions,
    densityLabel,
    layoutLabel: formatErLayoutLabel(options.layoutName || ER_DEFAULTS.layoutName),
    mainScript,
    fallbackRowsJson: safeJsonForScript(runtimeFallbackRows)
  });
};

// ---------------------------------------------------------------------------
// ER プリセット: 詳細オプションをワンクリックで既定値に揃える
// ---------------------------------------------------------------------------

export interface ErPreset {
  layout?: string;
  density?: string;
  maxDepth?: string;
  includeSubtable?: boolean;
  includeReverseLookup?: boolean;
  focusSpaceInput?: boolean;
  label: string;
}

const ER_PRESETS: Record<string, ErPreset> = {
  current:      { label: '現在のみ', layout: 'dagre', density: 'standard', maxDepth: '1', includeSubtable: true, includeReverseLookup: false },
  neighborhood: { label: '周辺 (深さ2)', layout: 'dagre', density: 'standard', maxDepth: '2', includeSubtable: true, includeReverseLookup: false },
  reverse:      { label: '逆引きあり', layout: 'dagre', density: 'standard', maxDepth: '2', includeSubtable: true, includeReverseLookup: true },
  full:         { label: 'すべて辿る', layout: 'cose', density: 'standard', maxDepth: '0', includeSubtable: true, includeReverseLookup: true },
  space:        { label: 'スペース全体', layout: 'dagre', density: 'standard', maxDepth: '2', includeSubtable: true, includeReverseLookup: false, focusSpaceInput: true }
};

// ---------------------------------------------------------------------------
// 事前見積もり: 生成前に「何を取得するか」を要約表示
// ---------------------------------------------------------------------------
