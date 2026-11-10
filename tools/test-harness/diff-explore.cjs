#!/usr/bin/env node
'use strict';

// 差分比較（tools/差分比較.js）の通し検証。配布物をそのままページに読み込み（esbuild で作り直さない）、
// window.kintone.api と window.fetch を、業務アプリに近い合成 kintone に差し替えて、利用者と同じ操作で確かめる。
// 実際の kintone には通信しない（合成 kintone は読み取り専用で、書き込みは違反として記録する）。
//
// 確認する観点:
//   (a) 実在しない差（ノイズ）を出していないか
//   (b) 入れた差を取りこぼしていないか
//   (c) 見出し・要約・日本語ラベルが誤っていたり読めなかったりしないか
//   (d) 件数が画面・HTML・Excel・Markdown で食い違わないか
//   (e) 「環境固有IDを比較から除外」や正規化プリセットが説明どおりに効くか
//   (f) 取得失敗・不完全の表示が正しいか
//   (g) フィールド 300・差分 1000 件規模で固まらないか（所要時間を計測）
//   （1対多）比較先 200〜500 件の比較後に保持しているデータ量
//
// 直した問題は通常の検査（失敗させるもの）にしてある。まだ直していない製品の不具合・使いにくさは
// 「既知の問題（findings）」として記録し、.iter-shots/diff-explore/results.json に保存する（severity が critical のものだけ失敗にする）。
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const world = require('./diff-explore-world.cjs');

const ROOT = path.resolve(__dirname, '../..');
const TOOL_FILE = path.join(ROOT, 'tools/差分比較.js');
const OUT = path.join(ROOT, '.iter-shots/diff-explore');

function printHelp() {
  console.log(`Usage: node tools/test-harness/diff-explore.cjs [options]

差分比較（tools/差分比較.js をそのまま読み込み）を、業務アプリに近い合成 kintone につないで、利用者と同じ操作で通しに検証します。
実際の kintone には通信しません。

Options:
  --browser <name>      chrome または chromium（既定: chrome）
  --executable <path>   ブラウザの実行ファイル（環境変数 KUS_PLAYWRIGHT_EXECUTABLE でも指定できます）
  --only <text>         名前に <text> を含むシナリオだけ実行します（例: --only scale）
  --skip-scale          規模のシナリオ（フィールド 300・差分 1000 件）を省き、1対多のメモリの計測も比較先 60 件にします
  --bundle <path>       読み込む配布物（既定: tools/差分比較.js。変更前の版との数値の比較に使います）
  --help                このヘルプを表示

日本語のダウンロード名を扱うため、ロケールが C/POSIX の環境では LANG=C.UTF-8 LC_ALL=C.UTF-8 を付けて実行してください。
結果と画面: .iter-shots/diff-explore/（results.json に計測値と既知の問題、出力ファイル）`);
}

const argValue = (name, fallback) => (process.argv.includes(name) ? process.argv[process.argv.indexOf(name) + 1] : fallback);

// ---------------------------------------------------------------------------
// 合成 kintone（ページ内で動く）。page.evaluate に関数として渡すため、外側の変数は参照しない。
// ---------------------------------------------------------------------------
function installSyntheticKintone(config) {
  const clone = (value) => JSON.parse(JSON.stringify(value));
  const nativeSetTimeout = window.setTimeout.bind(window);
  const sleep = (ms) => new Promise((resolve) => nativeSetTimeout(resolve, ms));
  const S = window.__k = {
    calls: [], violations: [], fetches: [], downloads: [], latency: config.latency ?? 2,
    apps: config.apps, files: config.files || {}, pluginConfigs: config.pluginConfigs || {}, fail: config.fail || [], fileFail: config.fileFail || {},
    seq: 0
  };
  const kerr = (code, message, extra = {}) => Object.assign(new Error(message), { code, id: `req-${S.seq}`, ...extra });
  const api = async (url, method, params = {}) => {
    S.calls.push({ url, method, app: String(params?.app ?? params?.id ?? '') });
    S.seq += 1;
    if (S.latency) await sleep(S.latency);
    const match = /^\/k(?:\/guest\/(\d+))?\/v1(\/preview)?(\/.*)$/.exec(url);
    if (!match) { S.violations.push(`想定外の URL: ${url}`); throw new Error('bad url'); }
    const guest = match[1] || '', preview = !!match[2], p = match[3];
    if (method !== 'GET') { S.violations.push(`書き込み: ${method} ${url}`); throw new Error('差分比較は読み取り専用です'); }
    const appId = String(params?.app ?? params?.id ?? '');
    for (const rule of S.fail) {
      if (rule.app && String(rule.app) !== appId) continue;
      if (rule.preview !== undefined && !!rule.preview !== preview) continue;
      if (rule.resource && rule.resource !== p) continue;
      if (rule.times !== undefined) { rule.count = (rule.count || 0) + 1; if (rule.count > rule.times) continue; }
      throw kerr(rule.code || 'GAIA_FAKE', rule.message || '合成の取得失敗', { status: rule.status || 500 });
    }
    let def = S.apps[`${guest}:${appId}`] || (guest ? null : S.apps[appId]);
    // 大量の比較先（1 対多の規模検証）は、要求されたときに雛形から作る（ページ内に全件を保持しない）。
    const bulk = config.bulkApps;
    if (!def && bulk && !guest && Number(appId) >= bulk.from && Number(appId) < bulk.from + bulk.count) {
      const index = Number(appId) - bulk.from;
      const level = bulk.levels[index % bulk.levels.length];
      def = {
        prodRevision: 3,
        get prod() {
          const template = S.apps[bulk.template].prod;
          const copy = {};
          for (const key of Object.keys(template)) copy[key] = template[key];
          // 差の数（level）だけ、一括フィールドのラベルを変える（フィールド設定と旧フォーム設定の両方）
          const relabel = (properties) => {
            let changed = 0;
            for (const field of properties) {
              if (changed >= level) break;
              if (/^item_\d+$/.test(field.code)) { field.label = `${field.label}（${appId}）`; changed += 1; }
            }
          };
          const fields = clone(template['/app/form/fields.json']);
          relabel(Object.values(fields.properties));
          copy['/app/form/fields.json'] = fields;
          const form = clone(template['/form.json']);
          relabel(form.properties);
          copy['/form.json'] = form;
          const info = clone(template['/app.json']);
          info.appId = String(appId); info.name = `${info.name}${appId}`;
          copy['/app.json'] = info;
          return copy;
        }
      };
    }
    if (!def) throw kerr('GAIA_AP01', `指定したアプリ（id: ${appId}）が見つかりません。`, { status: 404 });
    if (p === '/app/plugin/config.json') {
      const found = (S.pluginConfigs[appId] || S.pluginConfigs[config.bulkApps?.template] || {})[params.id];
      if (!found) throw kerr('GAIA_PL01', 'プラグイン設定が見つかりません。', { status: 404 });
      return { config: clone(found), revision: '1' };
    }
    const side = preview ? (def.preview || def.prod) : def.prod;
    const body = side[p];
    if (body === undefined) throw kerr('GAIA_NF01', `未定義の API: ${p}`, { status: 404 });
    return { ...clone(body), revision: String(preview ? (def.previewRevision || 5) : (def.prodRevision || 5)) };
  };
  api.url = (value) => value;
  window.kintone = { app: { getId: () => (Number(config.currentAppId) || null) }, mobile: { app: { getId: () => null } }, api, getRequestToken: () => 'TOKEN', getLoginUser: () => ({ code: 'u', name: 'U' }) };
  window.fetch = async (url, init = {}) => {
    S.fetches.push({ url: String(url), method: init.method || 'GET' });
    if (S.latency) await sleep(S.latency);
    const match = /^\/k(?:\/guest\/(\d+))?\/v1\/file\.json\?fileKey=([^&]+)$/.exec(String(url));
    if (!match || (init.method && init.method !== 'GET')) { S.violations.push(`想定外の fetch: ${init.method || 'GET'} ${url}`); return new Response('', { status: 404 }); }
    const key = decodeURIComponent(match[2]);
    if (S.fileFail[key]) return new Response('', { status: S.fileFail[key] });
    if (S.files[key] === undefined) return new Response('', { status: 404 });
    return new Response(new Blob([S.files[key]], { type: 'text/plain' }));
  };
  window.alert = () => {};
  window.confirm = () => true;
  window.open = () => null;
}

// ---------------------------------------------------------------------------
// 検証の枠組み
// ---------------------------------------------------------------------------
const findings = [];
const metrics = {};
const checks = [];
/** 製品の不具合・使いにくさ・文言の問題を記録する。severity: critical（失敗にする）/ high / medium / low */
function finding(id, severity, title, detail = {}) {
  if (findings.some((item) => item.id === id)) return;
  findings.push({ id, severity, title, ...detail });
  console.log(`  [既知の問題 ${severity}] ${id}: ${title}`);
}
const ok = (name) => { checks.push(name); console.log(`  OK ${name}`); };

/** 最小の ZIP 読み取り（.xlsx の中身を調べる用）。 */
function readZipEntries(buffer) {
  const entries = {};
  let end = buffer.length - 22;
  while (end >= 0 && buffer.readUInt32LE(end) !== 0x06054b50) end -= 1;
  assert.ok(end >= 0, 'ZIP の終端が見つかりません');
  const count = buffer.readUInt16LE(end + 10);
  let offset = buffer.readUInt32LE(end + 16);
  for (let i = 0; i < count; i += 1) {
    assert.equal(buffer.readUInt32LE(offset), 0x02014b50, 'ZIP の中央ディレクトリが不正です');
    const method = buffer.readUInt16LE(offset + 10);
    const compressed = buffer.readUInt32LE(offset + 20);
    const nameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const localOffset = buffer.readUInt32LE(offset + 42);
    const name = buffer.slice(offset + 46, offset + 46 + nameLength).toString('utf8');
    const localNameLength = buffer.readUInt16LE(localOffset + 26);
    const localExtraLength = buffer.readUInt16LE(localOffset + 28);
    const dataStart = localOffset + 30 + localNameLength + localExtraLength;
    const raw = buffer.slice(dataStart, dataStart + compressed);
    entries[name] = method === 0 ? raw : zlib.inflateRawSync(raw);
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

const xmlText = (value) => String(value)
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'")
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code))).replace(/&amp;/g, '&');

/** .xlsx を { シート名: [[セル文字列...]...] } に読む（共有文字列・インライン文字列・数値）。 */
function readXlsx(file) {
  const entries = readZipEntries(fs.readFileSync(file));
  const workbook = entries['xl/workbook.xml'].toString('utf8');
  const rels = entries['xl/_rels/workbook.xml.rels'].toString('utf8');
  const shared = [];
  if (entries['xl/sharedStrings.xml']) {
    for (const match of entries['xl/sharedStrings.xml'].toString('utf8').matchAll(/<si>([\s\S]*?)<\/si>/g)) {
      shared.push(xmlText([...match[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((t) => t[1]).join('')));
    }
  }
  const sheets = {};
  for (const sheet of workbook.matchAll(/<sheet [^>]*?name="([^"]*)"[^>]*?r:id="([^"]*)"/g)) {
    const name = xmlText(sheet[1]);
    const target = new RegExp(`<Relationship [^>]*Id="${sheet[2]}"[^>]*Target="([^"]*)"|<Relationship [^>]*Target="([^"]*)"[^>]*Id="${sheet[2]}"`).exec(rels);
    const rel = (target?.[1] || target?.[2] || '').replace(/^\//, '').replace(/^xl\//, '');
    const xml = entries[`xl/${rel}`]?.toString('utf8') || '';
    const rows = [];
    for (const rowMatch of xml.matchAll(/<row [^>]*?(?:\/>|>([\s\S]*?)<\/row>)/g)) {
      const cells = [];
      for (const cellMatch of (rowMatch[1] || '').matchAll(/<c ([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
        const attrs = cellMatch[1];
        const refMatch = /r="([A-Z]+)\d+"/.exec(attrs);
        const col = refMatch ? [...refMatch[1]].reduce((acc, ch) => acc * 26 + ch.charCodeAt(0) - 64, 0) - 1 : cells.length;
        const type = /t="([^"]*)"/.exec(attrs)?.[1] || '';
        const inner = cellMatch[2] || '';
        let value = '';
        if (type === 's') value = shared[Number(/<v>([\s\S]*?)<\/v>/.exec(inner)?.[1])] ?? '';
        else if (type === 'inlineStr') value = xmlText([...inner.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((t) => t[1]).join(''));
        else value = xmlText(/<v>([\s\S]*?)<\/v>/.exec(inner)?.[1] ?? '');
        cells[col] = value;
      }
      rows.push(Array.from(cells, (cellValue) => cellValue ?? ''));
    }
    sheets[name] = rows;
  }
  return sheets;
}

// ---------------------------------------------------------------------------
// 画面の操作（利用者と同じ操作）
// ---------------------------------------------------------------------------
/** 業務アプリの合成世界（開発 #101 ＝ 比較元、本番 #202 ＝ 比較先、参照先マスタ #301・#401）。 */
function businessConfig(extra = {}) {
  return {
    apps: {
      '101': { prod: world.businessApp('dev'), prodRevision: 20 },
      '202': { prod: world.businessApp('prod'), prodRevision: 10 },
      '301': { prod: world.masterApp('301', '取引先マスタ（開発）') },
      '401': { prod: world.masterApp('401', '取引先マスタ') }
    },
    files: world.FILES_BY_KEY,
    pluginConfigs: { '101': world.pluginConfigs().dev, '202': world.pluginConfigs().prod },
    ...extra
  };
}

async function openPanel(browser, config, { width = 1440, height = 1000, bundle } = {}) {
  const context = await browser.newContext({ viewport: { width, height }, acceptDownloads: true });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(`console: ${message.text()}`); });
  await page.setContent('<!doctype html><html lang="ja"><head><meta charset="utf-8"><title>mock kintone</title></head><body><main></main></body></html>');
  await page.evaluate(installSyntheticKintone, config);
  await page.addScriptTag({ content: bundle || fs.readFileSync(argValue('--bundle', TOOL_FILE), 'utf8') });
  await page.waitForSelector('#kus-diff-lite[role="dialog"]', { timeout: 20000 });
  return { page, context, errors };
}

/** 比較が終わる（結果のステータスが ok / warn / err になる）まで待つ。所要時間（ms）を返す。 */
async function waitForResult(page, timeout = 600000) {
  const started = Date.now();
  await page.waitForFunction(() => {
    const status = [...document.querySelectorAll('#kus-diff-lite [data-tone]')].find((element) => ['ok', 'warn', 'err'].includes(element.getAttribute('data-tone') || ''));
    const busy = document.querySelector('#kus-diff-lite')?.getAttribute('aria-busy') === 'true';
    return !!status && !busy;
  }, null, { timeout });
  return Date.now() - started;
}

async function setNormalization(page, labels = []) {
  // 詳細設定のポップアップの中のチェック。環境固有ID は表面にある。
  const root = page.locator('#kus-diff-lite');
  const surface = root.getByRole('checkbox', { name: '環境固有ID（アプリ・一覧・グラフ・アクション）を比較から除外', exact: true });
  const wantEnv = labels.includes('環境固有ID（アプリ・一覧・グラフ・アクション）を比較から除外');
  if ((await surface.isChecked()) !== wantEnv) await surface.setChecked(wantEnv);
  const others = labels.filter((label) => !label.startsWith('環境固有ID'));
  if (others.length) {
    const dialog = page.locator('#kus-dl-details-dialog');
    if (!(await dialog.evaluate((element) => element.open))) await page.getByRole('button', { name: '詳細設定…' }).click();
    await dialog.waitFor({ state: 'visible' });
    for (const label of others) await dialog.getByRole('checkbox', { name: label, exact: true }).check();
    await page.getByRole('button', { name: '詳細設定を閉じる' }).click();
    await dialog.waitFor({ state: 'hidden' });
  }
}

/** 1対1比較を実行し、画面の結果を読み取る。 */
async function runSingle(page, { source = '101', target = '202', sourcePreview = false, targetPreview = false, sourceGuest = '', targetGuest = '', normalization = [], waitDownload = true } = {}) {
  const root = page.locator('#kus-diff-lite');
  await root.getByLabel(/^比較元アプリID$/).fill(source);
  await root.getByLabel(/^比較先1アプリID$/).fill(target);
  await root.getByLabel('比較元ゲストスペースID', { exact: true }).fill(sourceGuest);
  await root.getByLabel('比較先1ゲストスペースID', { exact: true }).fill(targetGuest);
  await root.getByRole('checkbox', { name: '比較元をプレビュー環境から取得' }).setChecked(sourcePreview);
  await root.getByRole('checkbox', { name: '比較先をプレビュー環境から取得' }).setChecked(targetPreview);
  await setNormalization(page, normalization);
  const download = waitDownload ? page.waitForEvent('download', { timeout: 600000 }).catch(() => null) : null;
  await page.getByRole('button', { name: /差分比較を実行/ }).click();
  const elapsed = await waitForResult(page);
  const html = download ? await download : null;
  return { elapsed, htmlDownload: html };
}

/**
 * パネルの結果（概要・行）を読み取る。
 * 行の値は「詳細」の表示（比較元・比較先の値が開いた状態）で読み、読んだ後に元の表示方法へ戻す。
 * 既定の「一覧」は値を閉じて要点だけを出すため、値の取りこぼしを調べる検査は詳細で行う。
 * list には、読み取り前（利用者が最初に見る状態）の行の開閉と要点の数を入れる。
 */
async function readPanel(page) {
  return page.locator('#kus-diff-lite').evaluate((rootElement) => {
    const norm = (value) => String(value || '').replace(/\s+/g, ' ').trim();
    const modeSelect = rootElement.querySelector('select[aria-label="差分の表示方法"]');
    const originalMode = modeSelect?.value || '';
    const list = {
      mode: originalMode,
      rows: rootElement.querySelectorAll('[data-kus-dl-row-key]').length,
      closed: rootElement.querySelectorAll('[data-kus-dl-row-toggle][aria-expanded="false"]').length,
      briefs: rootElement.querySelectorAll('.kus-dl-row__brief').length,
      briefText: [...rootElement.querySelectorAll('.kus-dl-row__brief')].slice(0, 400).map((element) => norm(element.textContent)),
      valueBlocks: rootElement.querySelectorAll('.kus-dl-row__cols').length
    };
    const setMode = (mode) => {
      if (!modeSelect || modeSelect.value === mode) return;
      modeSelect.value = mode;
      modeSelect.dispatchEvent(new Event('change', { bubbles: true }));
    };
    setMode('detail');
    const statusElement = [...rootElement.querySelectorAll('[data-tone]')].find((element) => ['neutral', 'info', 'busy', 'ok', 'warn', 'err'].includes(element.getAttribute('data-tone') || ''));
    const overview = rootElement.querySelector('[data-kus-dl-overview]');
    const verdict = rootElement.querySelector('[data-kus-dl-completeness]');
    const metrics = {};
    for (const button of rootElement.querySelectorAll('[data-kus-dl-type-filter]')) metrics[button.getAttribute('data-kus-dl-type-filter')] = Number((/(\d+)/.exec(button.querySelector('.kus-dl-metric__num')?.textContent || '') || [])[1] || 0);
    const total = Number((/(\d+)/.exec(rootElement.querySelector('.kus-dl-metrics .kus-dl-metric .kus-dl-metric__num')?.textContent || '') || [])[1] || 0);
    const sections = [...rootElement.querySelectorAll('[data-kus-dl-section-filter]')].map((button) => ({ key: button.getAttribute('data-kus-dl-section-filter'), text: norm(button.textContent) }));
    const alerts = [...(overview?.querySelectorAll('.kus-dl-alert') || [])].map((element) => norm(element.textContent));
    const rows = [...rootElement.querySelectorAll('details[data-kus-dl-section-key]')].flatMap((section) => [...section.querySelectorAll('[data-kus-dl-row-key]')].map((row) => ({
      section: section.getAttribute('data-kus-dl-section-key'),
      key: row.getAttribute('data-kus-dl-row-key'),
      text: String(row.innerText || '').replace(/\n+/g, ' | ').replace(/ \| 値を(?:表示|閉じる)(?= \| |$)/, '')
    })));
    const result = {
      list,
      statusTone: statusElement?.getAttribute('data-tone') || '',
      statusText: norm(statusElement?.textContent),
      completeness: verdict?.getAttribute('data-kus-dl-completeness') || '',
      verdict: norm(verdict?.textContent),
      overviewText: norm(overview?.textContent),
      metrics, total, sections, alerts, rows
    };
    setMode(originalMode);
    return result;
  });
}

/** 出力（Excel・Markdown・HTML）を保存して、保存先を返す。 */
async function exportOutputs(page, dir, prefix, { html = true } = {}) {
  fs.mkdirSync(dir, { recursive: true });
  const saved = {};
  const save = async (key, click) => {
    const waiter = page.waitForEvent('download', { timeout: 120000 });
    await click();
    const download = await waiter;
    const file = path.join(dir, `${prefix}-${key}${path.extname(download.suggestedFilename()) || ''}`);
    await download.saveAs(file);
    saved[key] = { file, name: download.suggestedFilename() };
  };
  await save('xlsx', () => page.locator('#kus-diff-lite [data-kus-dl-completion="xlsx"]').click());
  await save('md', () => page.locator('#kus-diff-lite [data-kus-dl-completion="md"]').click());
  if (html) {
    const disclosure = page.locator('#kus-diff-lite [data-kus-dl-step="export"] details').first();
    if ((await disclosure.count()) && !(await disclosure.getAttribute('open'))) await disclosure.locator('summary').click();
    await save('html', () => page.locator('#kus-diff-lite [data-kus-dl-export="html"]').click());
  }
  return saved;
}

const htmlToText = (source) => String(source)
  .replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ')
  .replace(/<[^>]+>/g, '\n').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&')
  .split('\n').map((line) => line.trim()).filter(Boolean).join('\n');

module.exports = {
  installSyntheticKintone, readXlsx, readZipEntries, findings, metrics, checks, finding, ok, argValue, ROOT, TOOL_FILE, OUT, world, printHelp,
  businessConfig, openPanel, waitForResult, setNormalization, runSingle, readPanel, exportOutputs, htmlToText
};


// ---------------------------------------------------------------------------
// 出力の読み取りと、画面・HTML・Excel・Markdown の突き合わせ
// ---------------------------------------------------------------------------
function parseMarkdown(text) {
  const count = (key) => Number((new RegExp(`^- ${key}: (\\d+)`, 'm').exec(text) || [])[1]);
  const blocks = text.split(/^### 差分 \d+\s*$/m).slice(1).map((block) => ({
    sectionKey: (/^- sectionKey: `([^`]+)`/m.exec(block) || [])[1] || '',
    text: block
  }));
  return {
    rowsTotal: count('rowsTotal'), realDiffs: count('realDiffs'), added: count('added'), removed: count('removed'), changed: count('changed'), moved: count('moved'),
    complete: (/^- comparisonComplete: (true|false)/m.exec(text) || [])[1] === 'true',
    fetchFailures: count('取得失敗'),
    blocks,
    bySection: blocks.reduce((acc, block) => { acc[block.sectionKey] = (acc[block.sectionKey] || 0) + 1; return acc; }, {}),
    text
  };
}

function parseHtmlReport(source) {
  const text = htmlToText(source);
  return { text, reviewCount: Number((/未確認レビューを開始（(\d+)件）/.exec(text) || [])[1] ?? NaN), complete: /比較対象の取得と差分検出は完了しています/.test(text) };
}

function readXlsxSummary(file) {
  const sheets = readXlsx(file);
  const names = Object.keys(sheets);
  const list = sheets['変更一覧'] || [];
  const overview = sheets['比較概要'] || [];
  const targetsRow = overview.findIndex((row) => row[0] === '変更対象件数');
  const targets = targetsRow >= 0 ? (overview[targetsRow + 1] || []) : [];
  return {
    sheets, names,
    listCount: Math.max(0, list.length - 1),
    targetCount: Number(String(targets[0] || '').replace(/\D/g, '')) || 0,
    targetListCount: Math.max(0, (sheets['変更対象一覧'] || []).length - 2),
    hasUnverifiedSheet: names.includes('確認できなかった範囲'),
    overviewText: overview.map((row) => row.join(' ')).join('\n')
  };
}

/** 同じ比較結果の 4 つの出力（画面・HTML・Excel・Markdown）の件数が食い違っていないか。 */
function checkOutputsAgree(name, panel, saved) {
  const md = parseMarkdown(fs.readFileSync(saved.md.file, 'utf8'));
  const html = parseHtmlReport(fs.readFileSync(saved.html.file, 'utf8'));
  const xlsx = readXlsxSummary(saved.xlsx.file);
  assert.equal(md.rowsTotal, panel.total, `${name}: Markdown の件数（${md.rowsTotal}）が画面（${panel.total}）と違います`);
  assert.equal(md.blocks.length, panel.total, `${name}: Markdown の明細数（${md.blocks.length}）が画面（${panel.total}）と違います`);
  assert.equal(html.reviewCount, panel.total, `${name}: HTML の件数（${html.reviewCount}）が画面（${panel.total}）と違います`);
  const mdMetrics = { added: md.added, removed: md.removed, moved: md.moved, changed: md.changed };
  assert.deepEqual(mdMetrics, { added: panel.metrics.added || 0, removed: panel.metrics.removed || 0, moved: panel.metrics.moved || 0, changed: panel.metrics.changed || 0 }, `${name}: Markdown の内訳が画面と違います`);
  // 旧フォーム設定（再掲）は、Excel では変更一覧と件数に含めず、別シートに参考として載せる（画面・HTML・Markdown は含めて数える）。
  const formRows = md.bySection.formSettings || 0;
  const reprint = (md.bySection.fieldSettings || md.bySection.layoutSettings) ? formRows : 0;
  assert.equal(xlsx.listCount, panel.total - reprint, `${name}: Excel の変更一覧（${xlsx.listCount} 行）が、画面（${panel.total}）から再掲（${reprint}）を除いた数と違います`);
  assert.equal(xlsx.hasUnverifiedSheet, panel.completeness === 'incomplete', `${name}: 「確認できなかった範囲」シートの有無が、画面の完全性（${panel.completeness}）と合っていません`);
  assert.equal(md.complete, panel.completeness === 'complete', `${name}: Markdown の comparisonComplete が画面の完全性と合っていません`);
  assert.equal(html.complete, panel.completeness === 'complete', `${name}: HTML の完全性の表示が画面と合っていません`);
  return { md, html, xlsx };
}

/** 文言の検査: 内部の語・未翻訳の値・壊れた表記が見出し・値に出ていない。 */
function checkReadableText(name, text) {
  const forbidden = [/\bundefined\b/, /\[object Object\]/, /\bNaN\b/, /_fetchError/, /\(未設定\)/, /\bAVERAGE\b/, /\bAVG\b/, /\bnull → /];
  for (const pattern of forbidden) assert.ok(!pattern.test(text), `${name}: 画面に読みにくい表記（${pattern}）があります`);
}

// ---------------------------------------------------------------------------
// シナリオ
// ---------------------------------------------------------------------------
const scenarios = [];
const scenario = (name, fn, options = {}) => scenarios.push({ name, fn, ...options });

let browser;
const shotsDir = () => { fs.mkdirSync(OUT, { recursive: true }); return OUT; };
/**
 * 行の見出し（セクション・種別・見出し）。値や添字を含めず、条件を変えても同じ差を同じ行と見なせるようにする。
 * 見出しは「場所と項目」で、値（A → B）を含まない（値は要点と、開いた行の比較元・比較先に出る）。
 */
const rowKeyOf = (row) => {
  const parts = row.text.split(' | ');
  return `${row.section}|${parts[0]}|${String(parts[2]).replace(/（名前: .*$/, '').replace(/行 #\d+/g, '行')}`;
};
/** keys の多重集合から、other の多重集合を引いた残りの行。 */
const rowsNotIn = (rows, other) => {
  const counts = new Map();
  for (const row of other) counts.set(rowKeyOf(row), (counts.get(rowKeyOf(row)) || 0) + 1);
  return rows.filter((row) => { const key = rowKeyOf(row); const left = counts.get(key) || 0; if (left > 0) { counts.set(key, left - 1); return false; } return true; });
};

// ---- 1. 業務アプリの全セクションを通しに比べる ----
let baselineRows = null;
scenario('baseline: 業務アプリの全セクション（1対1）', async () => {
  const { page, context, errors } = await openPanel(browser, businessConfig());
  const { elapsed } = await runSingle(page);
  const panel = await readPanel(page);
  baselineRows = panel.rows;
  metrics.baseline = { elapsedMs: elapsed, total: panel.total };
  await page.screenshot({ path: path.join(shotsDir(), 'baseline-panel.png') });
  assert.equal(panel.statusTone, 'ok', `完了の表示が ok ではありません: ${panel.statusText}`);
  assert.equal(panel.completeness, 'complete', '取得に問題がないのに完全性が complete ではありません');
  assert.match(panel.statusText, new RegExp(`差分 ${panel.total}件 / 同一 0件 / 取得失敗 0件 / 一部未検証 0件`), '完了メッセージの件数が概要と違います');
  // 完了メッセージの内訳は、概要（追加・削除・内容変更・移動）と同じ数（内容変更と移動を重ねない）
  assert.ok(panel.statusText.includes(`追加:${panel.metrics.added} / 削除:${panel.metrics.removed} / 内容変更:${panel.metrics.changed} / 移動:${panel.metrics.moved}`), `完了メッセージの内訳が概要と違います: ${panel.statusText}`);
  assert.equal(panel.metrics.added + panel.metrics.removed + panel.metrics.changed + panel.metrics.moved, panel.total, '概要の内訳の合計が差分の件数と違います');
  const formRows = panel.rows.filter((row) => row.section === 'formSettings').length;
  assert.ok(formRows > 0 && panel.overviewText.includes(`フォーム設定の ${formRows} 件は、フィールド設定・レイアウト設定の変更の再掲です`), `旧フォーム設定が再掲であることが概要に示されていません（${formRows} 件）`);
  checkReadableText('baseline', panel.overviewText + '\n' + panel.rows.map((row) => row.text).join('\n'));
  // 既定の「一覧」: 行は閉じていて値を描画せず、変更の要点だけを出す（差分のある項目を 1 画面で見渡せる）
  assert.equal(panel.list.mode, 'list', '差分の表示方法の既定が一覧になっていません');
  assert.ok(panel.list.rows > 0 && panel.list.closed === panel.list.rows, `一覧の初期状態で値が開いている行があります（${panel.list.closed} / ${panel.list.rows}）`);
  assert.equal(panel.list.valueBlocks, 0, '一覧の初期状態で、閉じた行の値を描画しています');
  assert.ok(panel.list.briefs >= panel.list.rows * 0.8, `閉じた行に変更の要点がほとんど出ていません（${panel.list.briefs} / ${panel.list.rows}）`);
  checkReadableText('baseline-list', panel.list.briefText.join('\n'));
  assert.ok(panel.list.briefText.some((text) => /.+→.+/.test(text)), '要点に「変更前 → 変更後」の形が出ていません');
  ok('baseline: 既定は一覧で、行は閉じて要点（変更前 → 変更後）だけを出す');
  ok('baseline: 画面の件数・完了メッセージ・文言');

  const saved = await exportOutputs(page, path.join(OUT, 'baseline'), 'baseline');
  const { md, html, xlsx } = checkOutputsAgree('baseline', panel, saved);
  ok(`baseline: 画面・HTML・Excel・Markdown の件数が一致（画面 ${panel.total} / Excel 変更一覧 ${xlsx.listCount} + 再掲 ${md.bySection.formSettings || 0}）`);

  // (b) 入れた差を取りこぼしていない
  const missing = [];
  for (const expected of world.EXPECTED_DIFFS) {
    const hit = md.blocks.some((block) => block.sectionKey === expected.section && expected.needles.every((needle) => block.text.includes(needle)));
    if (!hit) missing.push(`${expected.section}: ${expected.note}（${expected.needles.join(' ')}）`);
  }
  assert.deepEqual(missing, [], `入れた差が出力に現れていません:\n  ${missing.join('\n  ')}`);
  ok(`baseline: 入れた ${world.EXPECTED_DIFFS.length} 種類の差がすべて Markdown に現れる`);

  // (a) 実在しない差（ノイズ）を出していない: 内容が同じ再アップロード・環境内の同じ設定は出ない
  const noise = [];
  for (const row of panel.rows) {
    if (row.section === 'customizeSettings' && /(main\.js|style\.css|mobile\.js)/.test(row.text)) noise.push(`同じ内容のファイル: ${row.text.slice(0, 80)}`);
    if (/(^| )(revision|createdAt|modifiedAt)( |:)/.test(row.text.split(' | ').slice(2, 4).join(' '))) noise.push(`メタ情報: ${row.text.slice(0, 80)}`);
  }
  assert.deepEqual(noise, [], `実在しない差が出ています:\n  ${noise.join('\n  ')}`);
  // 表記だけの違い（'100' と 100・空文字と null）は、差として残すが、注記が付く
  const notation = panel.rows.filter((row) => /表記のみ/.test(row.text));
  const emptyOnly = panel.rows.filter((row) => /空値の差のみ|空値ゆれ/.test(row.text));
  assert.ok(notation.length >= 2, '表記だけの違い（"100" と 100 など）に「表記のみ」の注記が付いていません');
  assert.ok(emptyOnly.length >= 1, '空文字と null の違いに「空値の差のみ」の注記が付いていません');
  ok('baseline: 内容が同じ再アップロードは差にならず、表記ゆれ・空値には注記が付く');

  // 見出し: プロセスのステータス改名は 1 件に吸収する（参照の連鎖を多数の差にしない）
  const renames = panel.rows.filter((row) => row.section === 'processSettings' && /ステータス改名/.test(row.text));
  assert.equal(renames.length, 1, 'ステータスの改名が 1 件にまとまっていません');
  assert.ok(!panel.rows.some((row) => row.section === 'processSettings' && /遷移アクション「着手」/.test(row.text)), 'ステータス改名の連鎖（遷移元・遷移先）が個別の差として出ています');
  ok('baseline: ステータス名の変更は 1 件にまとまる');

  // 表示順: 途中への追加・削除で繰り下がっただけの項目は差にしない（入れ替えた 2 つの一覧だけが「表示順」の差）
  const orderRows = panel.rows.filter((row) => row.section === 'viewSettings' && /表示順/.test(row.text.split(' | ').slice(2, 4).join(' ')));
  assert.deepEqual(orderRows.map((row) => /ビュー「([^」]+)」/.exec(row.text)[1]).sort(), ['今月納期', '要注意'], `一覧の表示順の差が、入れ替えた一覧だけになっていません: ${orderRows.map((row) => row.text.slice(0, 70)).join(' / ')}`);
  assert.ok(!panel.rows.some((row) => row.section === 'processSettings' && /ステータス「[^」]+」 \/ 表示順/.test(row.text)), 'ステータスの追加による表示順の繰り下がりが、差として出ています');
  ok('baseline: 一覧・ステータスの追加で後続の表示順が繰り下がっただけの違いは差にならない');

  // 見出し: フィールド権限の行が、対象のフィールドを示す
  const acl = panel.rows.filter((row) => row.section === 'fieldAcl' && /アクセス権/.test(row.text));
  assert.ok(acl.length === 1 && /金額（amount）/.test(acl[0].text), `フィールド権限の行に対象のフィールドが示されていません: ${acl.map((row) => row.text.slice(0, 120)).join(' / ')}`);
  ok('baseline: フィールド権限の行が対象のフィールドを示す');

  // Excel: 値の取り違えが無い（アクションの関連付けの行は、関連付けそのものを値に示す）
  const list = xlsx.sheets['変更一覧'];
  const mappingRows = list.filter((row) => /フィールドの関連付け/.test(row[4] || ''));
  assert.ok(mappingRows.length >= 1 && mappingRows.every((row) => !/^アプリアクション「/.test(row[5] || '') && !/^アプリアクション「/.test(row[6] || '')), 'Excel のアクションの関連付けの行の値が、アクション名になっています');
  assert.ok(!list.some((row) => /(^|\s)2件目$/.test(row[4] || '') && (row[3] || '').includes('タグ')), 'Excel のフィールドの初期値の行が「2件目」だけになっています');
  ok('baseline: Excel の関連付け・初期値の行の表記');
  assert.deepEqual(errors, [], `ページのエラー: ${errors.join(' / ')}`);
  assert.deepEqual(await page.evaluate(() => window.__k.violations), [], '合成 kintone への想定外の通信（書き込みなど）');
  await context.close();
});

// ---- 2. 環境固有 ID を除外 / 並び順の正規化 ----
scenario('exclude: 環境固有IDを比較から除外', async () => {
  assert.ok(baselineRows, 'baseline が先に必要です');
  const { page, context } = await openPanel(browser, businessConfig());
  await runSingle(page, { normalization: ['環境固有ID（アプリ・一覧・グラフ・アクション）を比較から除外'] });
  const panel = await readPanel(page);
  const removed = rowsNotIn(baselineRows, panel.rows);
  const added = rowsNotIn(panel.rows, baselineRows);
  assert.deepEqual(added.map((row) => row.text.slice(0, 80)), [], '除外すると、新しい差が現れています');
  const envPattern = /(ビューID|グラフID|アクションID|対象アプリ|参照するアプリ|アプリ情報変更 \| アプリID \| 比較元 \| 101 \| 比較先 \| 202|"301" \| 比較先 \| "401")/;
  const unexpected = removed.filter((row) => !envPattern.test(row.text));
  assert.deepEqual(unexpected.map((row) => row.text.slice(0, 100)), [], '環境固有ID以外の差が消えています');
  const leftovers = panel.rows.filter((row) => /(ビューID|グラフID|アクションID)/.test(row.text) || (row.section !== 'pluginSettings' && /比較元 \| "?30[12]"? \| 比較先 \| "?40[12]"?( \||$)/.test(row.text)));
  assert.deepEqual(leftovers.map((row) => row.text.slice(0, 100)), [], '環境固有IDの差が残っています');
  // 説明どおり、フィールドコード・プラグイン設定・一覧条件は除外されない
  assert.ok(panel.rows.some((row) => row.section === 'pluginSettings' && /sourceApp/.test(row.text)), 'プラグイン設定内のIDまで除外されています（説明では比較する）');
  assert.ok(panel.rows.some((row) => row.section === 'fieldSettings' && /cust_name/.test(row.text)), 'フィールドコードの変更まで除外されています');
  assert.ok(panel.rows.some((row) => row.section === 'viewSettings' && /絞り込み条件/.test(row.text)), '一覧の条件の変更まで除外されています');
  assert.match(panel.overviewText, /環境固有ID（アプリ・一覧・グラフ・アクション）/, '適用した比較条件に環境固有IDの除外が示されていません');
  metrics.exclude = { before: baselineRows.length, after: panel.rows.length, removed: removed.length };
  ok(`exclude: 環境固有ID の差 ${removed.length} 件だけが消え、ほかは変わらない（${baselineRows.length} → ${panel.rows.length}）`);
  // 保存した出力の件数も同じ条件になる
  const saved = await exportOutputs(page, path.join(OUT, 'exclude'), 'exclude');
  checkOutputsAgree('exclude', panel, saved);
  ok('exclude: 除外後の Excel・HTML・Markdown も同じ件数');
  await context.close();
});

scenario('order: 並び順を無視する正規化', async () => {
  const { page, context } = await openPanel(browser, businessConfig());
  await runSingle(page, { normalization: ['一覧・グラフ・アクションの並び順を無視', '権限・通知・カテゴリの並び順を無視', 'フィールド・レイアウトの並び順を無視'] });
  const panel = await readPanel(page);
  assert.equal(panel.metrics.moved || 0, 0, '並び順を無視したのに、並び順が異なる行が出ています（正規化の並べ替えで位置がずれた行）');
  const fabricated = rowsNotIn(panel.rows, baselineRows);
  assert.deepEqual(fabricated.map((row) => row.text.slice(0, 100)), [], '並び順を無視すると、新しい差が現れています');
  assert.ok(panel.total < baselineRows.length, '並び順を無視しても件数が減っていません');
  ok(`order: 並び順の差だけが消え、新しい差は出ない（${baselineRows.length} → ${panel.total}）`);
  await context.close();
});

// ---- 3. 取得失敗・不完全 ----
async function incompleteCase(name, config, expectations) {
  const { page, context } = await openPanel(browser, config);
  await runSingle(page);
  const panel = await readPanel(page);
  assert.equal(panel.statusTone, 'warn', `${name}: 完了の表示が警告ではありません: ${panel.statusText}`);
  assert.equal(panel.completeness, 'incomplete', `${name}: 完全性が incomplete ではありません`);
  assert.match(panel.verdict, /不完全|差分なしとは判断できません/, `${name}: 「不完全」と示されていません`);
  await expectations.panel(panel);
  const saved = await exportOutputs(page, path.join(OUT, name), name);
  const outputs = checkOutputsAgree(name, panel, saved);
  assert.ok(outputs.xlsx.hasUnverifiedSheet, `${name}: Excel に「確認できなかった範囲」がありません`);
  if (expectations.outputs) await expectations.outputs(outputs, panel);
  await context.close();
  return panel;
}

scenario('failure: 片側・両側の取得失敗', async () => {
  const panel = await incompleteCase('fail-source-views', businessConfig({ fail: [{ app: '101', resource: '/app/views.json' }] }), {
    panel: (p) => {
      assert.match(p.statusText, /取得失敗 1件/, '取得失敗の件数が完了メッセージにありません');
      assert.ok(p.alerts.some((text) => /ビュー設定（比較元）/.test(text)), '取得失敗の場所（ビュー設定・比較元）が示されていません');
      assert.ok(!p.rows.some((row) => row.section === 'viewSettings'), '取得できなかったセクションに、偽の追加・削除が出ています');
    },
    outputs: ({ md, xlsx }) => {
      assert.ok(!md.bySection.viewSettings, 'Markdown に取得できなかったセクションの差が出ています');
      assert.match(xlsx.sheets['確認できなかった範囲'].map((row) => row.join(' ')).join('\n'), /ビュー設定/, 'Excel の「確認できなかった範囲」にビュー設定がありません');
    }
  });
  assert.ok(panel.total > 100, '取得できた範囲の差が消えています');
  ok('failure: 比較元だけの取得失敗（ビュー）は、そのセクションだけを比較不能にし、画面・Excel・Markdown に示す');
  await incompleteCase('fail-both', businessConfig({ fail: [{ resource: '/app/views.json' }, { app: '202', resource: '/app/acl.json' }] }), {
    panel: (p) => {
      assert.match(p.statusText, /取得失敗 2件/);
      assert.ok(p.alerts.some((text) => /ビュー設定（両側）/.test(text) && /アプリ権限（比較先）/.test(text)), '両側・片側の取得失敗が区別して示されていません');
      assert.ok(!p.rows.some((row) => row.section === 'viewSettings' || row.section === 'appAcl'));
    }
  });
  ok('failure: 両側の取得失敗と、片側の取得失敗を区別して示す');
});

scenario('failure: 一過性の失敗は再試行して完了する', async () => {
  const { page, context } = await openPanel(browser, businessConfig({ fail: [{ app: '101', resource: '/app/views.json', times: 2, status: 503 }] }));
  await runSingle(page);
  const panel = await readPanel(page);
  assert.equal(panel.completeness, 'complete', '一過性の失敗（503 を 2 回）で比較不能になっています');
  assert.equal(panel.total, baselineRows.length, '再試行後の結果が、失敗なしの結果と違います');
  const tries = await page.evaluate(() => window.__k.calls.filter((call) => call.url.endsWith('/app/views.json') && call.app === '101').length);
  assert.equal(tries, 3, `再試行の回数が想定（3 回）と違います: ${tries}`);
  ok('failure: 503 が 2 回続いても、3 回目で取得でき、結果は失敗なしと同じ');
  await context.close();
});

scenario('incomplete: プラグイン設定・JS/CSS 本文の取得失敗と本文未検証', async () => {
  await incompleteCase('fail-plugin-config', businessConfig({ fail: [{ app: '202', resource: '/app/plugin/config.json' }] }), {
    panel: (p) => {
      assert.ok(p.alerts.some((text) => /プラグイン\(※\)（比較先）: プラグイン設定の取得に失敗したため、このセクションは比較できません/.test(text)), 'プラグイン設定の取得不完全が示されていません');
      assert.ok(!p.rows.some((row) => row.section === 'pluginSettings'), '取得できなかったプラグインのセクションを部分的に比較しています');
    }
  });
  ok('incomplete: プラグイン設定を取得できないときは、プラグインのセクション全体を比較不能にする');
  await incompleteCase('fail-js-body', businessConfig({ fileFail: { 'prod-util-js': 500 } }), {
    panel: (p) => {
      assert.ok(p.alerts.some((text) => /JS\/CSS設定（比較先）/.test(text) && /util\.js: HTTP 500/.test(text)), 'JS/CSS 本文の取得失敗が、ファイル名と理由つきで示されていません');
      assert.ok(!p.rows.some((row) => row.section === 'customizeSettings'));
    }
  });
  ok('incomplete: JS/CSS の本文を取得できないときは、ファイル名と理由を示してそのセクションを比較不能にする');
  // 1MB を超えるファイルは本文を比較せず fileKey で比べ、「一部未検証」と示す
  const big = 'x'.repeat(1_100_000);
  const config = businessConfig();
  config.files = { ...config.files, 'prod-util-js': big, 'dev-util-js': big };
  await incompleteCase('partial-js-oversize', config, {
    panel: (p) => {
      assert.match(p.statusText, /一部未検証 [12]件/, '本文未検証の件数が完了メッセージにありません');
      assert.ok(p.alerts.some((text) => /本文を比較できず fileKey だけで比較しました/.test(text) && /util\.js/.test(text)), '本文を比較できなかったことが示されていません');
    },
    outputs: ({ md }) => assert.ok(/util\.js/.test(md.text.split('## 完全性・注意事項')[1] || ''), 'Markdown の完全性の注意にファイルが示されていません')
  });
  ok('incomplete: 1MB 超のファイルは fileKey で比べ、本文未検証として示す');
});

// ---- 4. 規模 ----
scenario('scale: フィールド 300・差分 1000 件規模', async () => {
  for (const [label, changes, expectIncomplete] of [['フィールド 300・差分 約 760 件', 1, false], ['フィールド 300・差分 1000 件に到達', 3, true]]) {
    const config = businessConfig();
    config.apps['101'].prod = world.businessApp('dev', { bulk: 300, changesPerField: changes });
    config.apps['202'].prod = world.businessApp('prod', { bulk: 300 });
    const { page, context } = await openPanel(browser, config);
    const { elapsed } = await runSingle(page);
    const panel = await readPanel(page);
    const t0 = Date.now();
    await page.getByRole('button', { name: 'セクションを開く' }).first().click();
    await page.getByRole('button', { name: 'セクションを閉じる' }).first().click();
    const expandMs = Date.now() - t0;
    const saved = await exportOutputs(page, path.join(OUT, `scale-${changes}`), `scale-${changes}`);
    const exportMs = Date.now() - t0 - expandMs;
    assert.equal(panel.completeness, expectIncomplete ? 'incomplete' : 'complete', `${label}: 完全性の表示が想定と違います`);
    if (expectIncomplete) {
      assert.equal(panel.total, 1000, `${label}: 差分の上限（1000 件）で止まっていません`);
      assert.ok(panel.alerts.some((text) => /差分上限 1,000 件に到達/.test(text)), `${label}: 上限到達が示されていません`);
    }
    assert.ok(panel.rows.length <= 200, `${label}: 画面に ${panel.rows.length} 行を一度に描画しています（200 行ずつのはず）`);
    checkOutputsAgree(`scale-${changes}`, panel, saved);
    metrics[`scale${changes}`] = { label, fields: 300 + 45, diffs: panel.total, compareMs: elapsed, expandCollapseMs: expandMs, exportsMs: exportMs, xlsxBytes: fs.statSync(saved.xlsx.file).size, htmlBytes: fs.statSync(saved.html.file).size, mdBytes: fs.statSync(saved.md.file).size };
    assert.ok(elapsed < 20000, `${label}: 比較に ${elapsed}ms かかりました`);
    assert.ok(exportMs < 30000, `${label}: 出力に ${exportMs}ms かかりました`);
    ok(`scale: ${label}（比較 ${elapsed}ms・展開と折りたたみ ${expandMs}ms・3 つの出力 ${exportMs}ms）`);
    await context.close();
  }
}, { scale: true });

// ---- 5. 同じアプリの「本番 → プレビュー（未公開の変更）」 ----
/** 同じアプリの本番とプレビュー（未公開の変更あり）の合成 kintone。 */
function previewConfig(extra = {}) {
  const prod = world.businessApp('prod');
  const preview = world.clone(prod);
  const props = preview['/app/form/fields.json'].properties;
  props.rush_flag = world.f.text('rush_flag', '至急フラグ');            // 未公開: フィールドの追加
  props.amount.required = true;                                          // 未公開: 必須化
  preview['/app/views.json'].views['全件'].filterCond = 'amount > 100';  // 未公開: 一覧の条件の変更
  preview['/app/customize.json'].desktop.js[2] = { type: 'FILE', file: { fileKey: 'preview-main-js', name: 'main.js', contentType: 'text/javascript', size: '200' } }; // 未公開: JS の差し替え（内容違い）
  const files = { ...world.FILES_BY_KEY, 'preview-main-js': '(function () { console.log("main v2 (unpublished)"); })();\n' };
  const guestProd = world.businessApp('prod');
  const guestPreview = world.clone(guestProd);
  guestPreview['/app/form/fields.json'].properties.guest_only = world.f.text('guest_only', 'ゲスト限定');
  return {
    apps: {
      '202': { prod, preview, prodRevision: 10, previewRevision: 12 },
      '7:303': { prod: guestProd, preview: guestPreview, prodRevision: 4, previewRevision: 5 },
      '301': { prod: world.masterApp('301', '取引先マスタ（開発）') },
      '401': { prod: world.masterApp('401', '取引先マスタ') }
    },
    files,
    pluginConfigs: { '202': world.pluginConfigs().prod, '303': world.pluginConfigs().prod },
    currentAppId: '202',
    ...extra
  };
}

const PREVIEW_BUTTON = '本番とプレビューを比較（未公開の変更を確認）';
const readInputs = (page) => page.evaluate(() => {
  const root = document.querySelector('#kus-diff-lite');
  const value = (label) => root.querySelector(`input[aria-label="${label}"]`)?.value ?? null;
  const checked = (label) => root.querySelector(`input[aria-label="${label}"]`)?.checked ?? null;
  return {
    sourceApp: value('比較元アプリID'), sourceGuest: value('比較元ゲストスペースID'), sourcePreview: checked('比較元をプレビュー環境から取得'),
    targetApp: value('比較先1アプリID'), targetGuest: value('比較先1ゲストスペースID'), targetPreview: checked('比較先をプレビュー環境から取得'),
    focused: document.activeElement?.textContent?.trim() || document.activeElement?.getAttribute('aria-label') || '',
    status: root.querySelector('.kus-lp__status-text')?.textContent?.trim() || '',
    mode: root.getAttribute('data-kus-dl-mode')
  };
});

scenario('preview: 同じアプリの本番とプレビューをワンクリックで比べる', async () => {
  const { page, context, errors } = await openPanel(browser, previewConfig());
  const button = page.getByRole('button', { name: PREVIEW_BUTTON, exact: true });
  assert.equal(await button.count(), 1, '「本番とプレビューを比較」の操作がありません');
  assert.ok(await button.isVisible(), '「本番とプレビューを比較」の操作が見えません');

  // 入力が空のときは、開いているアプリ（#202）を使う
  await button.click();
  let inputs = await readInputs(page);
  assert.deepEqual({ ...inputs, focused: '', status: '' }, { sourceApp: '202', sourceGuest: '', sourcePreview: false, targetApp: '202', targetGuest: '', targetPreview: true, focused: '', status: '', mode: 'single' }, `設定された値が違います: ${JSON.stringify(inputs)}`);
  assert.match(inputs.status, /App 202 の本番を比較元、同じアプリのプレビューを比較先に設定しました。「差分比較を実行」で、未公開の変更を確認できます/, `設定後の案内が違います: ${inputs.status}`);
  assert.match(inputs.focused, /差分比較を実行/, '設定後に、次の操作（差分比較を実行）へフォーカスが移っていません');
  ok('preview: 入力が空のとき、開いているアプリの本番（比較元）とプレビュー（比較先）を設定し、実行へ進める');

  // 実行 → 比較方向の表示・差分・取得先の URL
  const { elapsed } = await runSingle(page, { source: '202', target: '202', sourcePreview: false, targetPreview: true });
  const panel = await readPanel(page);
  await page.screenshot({ path: path.join(shotsDir(), 'preview-result.png') });
  assert.equal(panel.completeness, 'complete', `完全性: ${panel.verdict}`);
  const direction = await page.locator('#kus-diff-lite .kus-dl-overview__direction').innerText();
  assert.match(direction.replace(/\s+/g, ' '), /比較元 .*（App 202） 本番 \/ 通常スペース .*比較先 .*（App 202） プレビュー \/ 通常スペース/, `比較方向の表示が違います: ${direction}`);
  // 比較元＝本番（変更前）、比較先＝プレビュー（変更後）。プレビューにだけあるフィールドは「比較先のみ（追加）」
  assert.ok(panel.rows.some((row) => row.section === 'fieldSettings' && /rush_flag/.test(row.text) && /^追加/.test(row.text)), `プレビューで追加したフィールドが「追加」になっていません: ${panel.rows.filter((row) => /rush_flag/.test(row.text)).map((row) => row.text.slice(0, 80)).join(' / ')}`);
  assert.ok(panel.rows.some((row) => row.section === 'fieldSettings' && /金額（amount） · 必須設定変更/.test(row.text)), '未公開の必須化が出ていません');
  assert.ok(panel.rows.some((row) => row.section === 'viewSettings' && /絞り込み条件/.test(row.text)), '未公開の一覧の条件の変更が出ていません');
  assert.ok(panel.rows.some((row) => row.section === 'customizeSettings' && /main\.js/.test(row.text)), '未公開の JS の差し替え（内容違い）が出ていません');
  // 本番とプレビューで同じ設定は差にならない（アプリ情報・設定の同じ項目）
  assert.ok(!panel.rows.some((row) => row.section === 'appInfo'), 'アプリ情報（同じアプリ）が差として出ています');
  // 入れた未公開の変更（必須化・追加フィールド・一覧の条件・JS の本文とサイズ）の 5 件だけ（旧フォーム設定は再掲）
  const real = panel.rows.filter((row) => row.section !== 'formSettings');
  assert.equal(real.length, 5, `未公開の変更以外の差が出ています: ${real.map((row) => `${row.section}:${row.text.slice(0, 50)}`).join('\n')}`);
  assert.deepEqual([...new Set(real.map((row) => row.section))].sort(), ['customizeSettings', 'fieldSettings', 'viewSettings']);
  const calls = await page.evaluate(() => window.__k.calls.filter((call) => call.app === '202' && /\/app\/(?:form\/)?fields\.json$/.test(call.url)).map((call) => call.url));
  assert.deepEqual(calls.sort(), ['/k/v1/app/form/fields.json', '/k/v1/preview/app/form/fields.json'], `取得先が違います: ${calls.join(', ')}`);
  metrics.previewCompare = { elapsedMs: elapsed, total: panel.total };
  ok('preview: 実行後、比較元＝本番・比較先＝プレビューと表示され、未公開の変更だけが差として出る（取得先も本番とプレビューの 2 つ）');

  // 出力: 環境の表示・完全性
  const saved = await exportOutputs(page, path.join(OUT, 'preview'), 'preview');
  const md = parseMarkdown(fs.readFileSync(saved.md.file, 'utf8'));
  assert.match(md.text, /AFTER \/ 比較先（変更後）[\s\S]*?環境: プレビュー \/ 通常スペース[\s\S]*?preview: `true`/, 'Markdown の比較先がプレビューになっていません');
  assert.match(md.text, /BEFORE \/ 比較元（変更前）[\s\S]*?環境: 本番 \/ 通常スペース[\s\S]*?preview: `false`/, 'Markdown の比較元が本番になっていません');
  ok('preview: Markdown の比較元は本番・比較先はプレビュー');

  // ゲストスペース: 入力欄の比較元（アプリ 303・ゲストスペース 7）を、本番とプレビューに
  await context.close();

  const second = await openPanel(browser, previewConfig());
  const root = second.page.locator('#kus-diff-lite');
  await root.getByLabel('比較元アプリID', { exact: true }).fill('303');
  await root.getByLabel('比較元ゲストスペースID', { exact: true }).fill('7');
  await root.getByLabel('比較先1アプリID', { exact: true }).fill('999');           // 別のアプリが入っていても、比較先は比較元に合わせて上書きする
  await second.page.getByRole('button', { name: PREVIEW_BUTTON, exact: true }).click();
  inputs = await readInputs(second.page);
  assert.deepEqual({ a: inputs.sourceApp, g: inputs.sourceGuest, sp: inputs.sourcePreview, b: inputs.targetApp, tg: inputs.targetGuest, tp: inputs.targetPreview }, { a: '303', g: '7', sp: false, b: '303', tg: '7', tp: true }, `ゲストスペースも同じにする: ${JSON.stringify(inputs)}`);
  assert.match(inputs.status, /App 303（ゲストスペース 7）/, '案内にゲストスペースが示されていません');
  await runSingle(second.page, { source: '303', sourceGuest: '7', target: '303', targetGuest: '7', targetPreview: true });
  const guestPanel = await readPanel(second.page);
  assert.ok(guestPanel.rows.some((row) => /guest_only/.test(row.text)), 'ゲストスペースのアプリのプレビューの変更が出ていません');
  const guestCalls = await second.page.evaluate(() => [...new Set(window.__k.calls.filter((call) => call.app === '303').map((call) => /^(\/k\/guest\/\d+\/v1(?:\/preview)?)/.exec(call.url)[1]))].sort());
  assert.deepEqual(guestCalls, ['/k/guest/7/v1', '/k/guest/7/v1/preview'], `ゲストスペースの取得先が違います: ${guestCalls.join(', ')}`);
  ok('preview: ゲストスペースも比較元と同じにし、取得先も /k/guest/7/v1 と /k/guest/7/v1/preview');

  // URL の貼り付け・不正な入力・結果の無効化
  await root.getByLabel('比較元アプリID', { exact: true }).fill('https://example.cybozu.com/k/guest/9/404/');
  await second.page.getByRole('button', { name: PREVIEW_BUTTON, exact: true }).click();
  inputs = await readInputs(second.page);
  assert.deepEqual({ a: inputs.sourceApp, g: inputs.sourceGuest, b: inputs.targetApp, tg: inputs.targetGuest, tp: inputs.targetPreview }, { a: '404', g: '9', b: '404', tg: '9', tp: true }, `URL からアプリとゲストスペースを読み取って設定する: ${JSON.stringify(inputs)}`);
  ok('preview: 比較元に貼ったアプリの URL（ゲストスペースつき）も読み取って、本番とプレビューに設定する');
  await root.getByLabel('比較元アプリID', { exact: true }).fill('abc');
  await root.getByLabel('比較先1アプリID', { exact: true }).fill('55');
  await second.page.getByRole('button', { name: PREVIEW_BUTTON, exact: true }).click();
  inputs = await readInputs(second.page);
  assert.equal(inputs.targetApp, '55', '不正な入力のとき、比較先を書き換えています');
  assert.match(inputs.status, /比較元アプリIDには正の整数を入力してください/, `不正な入力の案内: ${inputs.status}`);
  await root.getByLabel('比較元アプリID', { exact: true }).fill('');
  // 開いているアプリが無いとき（kintone のアプリの画面ではない）
  await second.context.close();

  const noApp = await openPanel(browser, previewConfig({ currentAppId: '' }));
  await noApp.page.getByRole('button', { name: PREVIEW_BUTTON, exact: true }).click();
  inputs = await readInputs(noApp.page);
  assert.equal(inputs.targetApp, '', '開いているアプリも比較元の入力もないのに、設定しています');
  assert.match(inputs.status, /比較元にアプリIDを入力してください/, `案内: ${inputs.status}`);
  ok('preview: 比較元が空で、開いているアプリも無いときは、設定せず、入力を促す');
  // 結果の無効化・複数の比較への切り替え
  await noApp.page.getByLabel('比較元アプリID', { exact: true }).fill('202');
  await noApp.page.getByRole('button', { name: PREVIEW_BUTTON, exact: true }).click();
  await runSingle(noApp.page, { source: '202', target: '202', targetPreview: true });
  await noApp.page.getByRole('button', { name: PREVIEW_BUTTON, exact: true }).click();
  const invalidated = await readInputs(noApp.page);
  assert.match(invalidated.status, /前回の結果は無効にしました/, `結果がある状態で設定し直したときの案内: ${invalidated.status}`);
  assert.equal(await noApp.page.locator('#kus-diff-lite [data-kus-dl-overview]').count(), 0, '設定し直したのに、前回の結果が残っています');
  await noApp.page.getByRole('button', { name: '1対多比較', exact: true }).click();
  assert.equal(await noApp.page.getByRole('button', { name: PREVIEW_BUTTON, exact: true }).isVisible(), false, '1対多比較でも、本番とプレビューの設定の操作が見えています');
  await noApp.page.getByRole('button', { name: 'ペア一括比較', exact: true }).click();
  assert.equal(await noApp.page.getByRole('button', { name: PREVIEW_BUTTON, exact: true }).isVisible(), false, 'ペア一括比較でも、本番とプレビューの設定の操作が見えています');
  ok('preview: 結果があるときは無効にして案内し、1対多・ペア一括では出さない');
  assert.deepEqual(noApp.errors, [], `ページのエラー: ${noApp.errors.join(' / ')}`);
  assert.deepEqual(errors, [], `ページのエラー: ${errors.join(' / ')}`);
  await noApp.context.close();
});

scenario('preview: 320〜1440px のはみ出しとキーボード操作', async () => {
  for (const width of [320, 390, 768, 1024, 1440]) {
    const { page, context } = await openPanel(browser, previewConfig(), { width, height: width <= 390 ? 700 : 900 });
    const root = page.locator('#kus-diff-lite');
    const button = page.getByRole('button', { name: PREVIEW_BUTTON, exact: true });
    await button.scrollIntoViewIfNeeded();
    const layout = await page.evaluate(() => {
      const panel = document.querySelector('#kus-diff-lite');
      const target = [...panel.querySelectorAll('button')].find((element) => element.textContent.trim() === '本番とプレビューを比較（未公開の変更を確認）');
      const panelRect = panel.getBoundingClientRect();
      const rect = target.getBoundingClientRect();
      return {
        documentOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 2,
        panelOverflow: panel.scrollWidth > panel.clientWidth + 2,
        buttonInside: rect.left >= panelRect.left - 1 && rect.right <= panelRect.right + 1 && rect.width > 0,
        buttonTextClipped: target.scrollWidth > target.clientWidth + 2,
        buttonHeight: Math.round(rect.height),
        buttonWidth: Math.round(rect.width)
      };
    });
    assert.equal(layout.documentOverflow, false, `${width}px: ページに横スクロールがあります`);
    assert.equal(layout.panelOverflow, false, `${width}px: パネルに横スクロールがあります`);
    assert.equal(layout.buttonInside, true, `${width}px: ボタンがパネルの外へはみ出しています`);
    assert.equal(layout.buttonTextClipped, false, `${width}px: ボタンの文字が切れています`);
    assert.ok(layout.buttonHeight >= 36, `${width}px: ボタンが小さすぎます（${layout.buttonHeight}px）`);
    if (width === 320) await page.screenshot({ path: path.join(shotsDir(), 'preview-320.png') });
    if (width === 1440) await page.screenshot({ path: path.join(shotsDir(), 'preview-1440.png') });
    // キーボード: ボタンに Tab で到達でき、Enter で設定され、フォーカスは実行ボタンへ移る
    if (width === 320 || width === 1440) {
      await page.evaluate(() => document.querySelector('#kus-diff-lite input[aria-label="比較元アプリID"]').focus());
      let reached = false;
      for (let step = 0; step < 14 && !reached; step += 1) {
        await page.keyboard.press('Tab');
        reached = await page.evaluate(() => document.activeElement?.textContent?.trim() === '本番とプレビューを比較（未公開の変更を確認）');
      }
      assert.ok(reached, `${width}px: Tab キーで「本番とプレビューを比較」へ届きません`);
      await page.keyboard.press('Enter');
      const inputs = await readInputs(page);
      assert.deepEqual({ a: inputs.sourceApp, b: inputs.targetApp, sp: inputs.sourcePreview, tp: inputs.targetPreview }, { a: '202', b: '202', sp: false, tp: true }, `${width}px: Enter で設定されません`);
      assert.match(inputs.focused, /差分比較を実行/, `${width}px: 設定後のフォーカスが実行ボタンにありません`);
    }
    await context.close();
  }
  ok('preview: 320・390・768・1024・1440px で横にはみ出さず、ボタンの文字が切れない。Tab・Enter で操作できる');
});

// ---- 6. 1対多: 結果を保持したときのメモリ ----
scenario('multi-memory: 1対多の結果を保持したときのメモリ', async () => {
  const count = process.argv.includes('--skip-scale') ? 60 : 200;
  const bulk = 150;
  const run = async (label, config) => {
    const { page, context, errors } = await openPanel(await memoryBrowser(), config);
    const heap = async () => page.evaluate(async () => { for (let i = 0; i < 3; i += 1) { window.gc(); await new Promise((resolve) => setTimeout(resolve, 30)); } return performance.memory.usedJSHeapSize / 1048576; });
    const root = page.locator('#kus-diff-lite');
    await root.getByLabel('比較元アプリID', { exact: true }).fill('101');
    const target = root.getByLabel('比較先1アプリID', { exact: true });
    await target.fill(Array.from({ length: count }, (_, index) => String(1000 + index)).join(','));
    await target.dispatchEvent('change');
    await page.waitForTimeout(300);
    const before = await heap();
    await page.getByRole('button', { name: /複数の比較を実行/ }).click();
    const elapsed = await waitForResult(page, 1800000);
    const after = await heap();
    const status = await page.locator('#kus-diff-lite .kus-lp__status-text').innerText();
    assert.match(status, new RegExp(`${count}件中 ${count}件を比較しました`), `${label}: ${status}`);
    assert.deepEqual(errors, []);
    return { page, context, elapsed, perTargetKB: ((after - before) * 1024) / count, retainedMB: after - before };
  };
  // 業務アプリ規模（フィールド約 200・JS/CSS の本文つき）の比較先。比較先ごとに、差は 0〜60 件
  const config = businessConfig();
  config.apps['101'].prod = world.businessApp('prod', { bulk });
  config.apps['202'].prod = world.businessApp('prod', { bulk });
  config.bulkApps = { from: 1000, count, template: '202', levels: [0, 5, 20, 60] };
  config.files = Object.fromEntries(Object.entries(world.FILES_BY_KEY).map(([key, text]) => [key, text + '\n' + Array.from({ length: 3500 }, (_, index) => `var v${index} = ${index}; // padding`).join('\n')]));
  const bundleKB = Math.round(JSON.stringify(world.businessApp('prod', { bulk })).length / 1024);
  const bodyKB = Math.round(Object.values(config.files).slice(0, 5).reduce((sum, text) => sum + text.length, 0) / 1024);
  const result = await run('1対多', config);
  metrics.multiMemory = { targets: count, bundleKB, jsCssBodiesPerTargetKB: bodyKB, retainedMB: Math.round(result.retainedMB * 10) / 10, perTargetKB: Math.round(result.perTargetKB), elapsedMs: result.elapsed };
  // 保持量は、設定の大きさ（bundleKB）の数倍に収まり、JS/CSS の本文（比較先ごとに bodyKB）の分は含まない。
  assert.ok(result.perTargetKB < bundleKB * 2.2 + 30, `比較先 1 件あたりの保持量が大きすぎます（${Math.round(result.perTargetKB)}KB。設定は約 ${bundleKB}KB、JS/CSS の本文は約 ${bodyKB}KB）`);
  ok(`multi-memory: 比較先 ${count} 件の保持量は ${result.retainedMB.toFixed(1)}MB（1 件あたり ${Math.round(result.perTargetKB)}KB。設定 ${bundleKB}KB・JS/CSS の本文 ${bodyKB}KB）。本文は保持しない`);
  // 保存: 行からの HTML・Excel・Markdown（比較先ごと）が、1 対 1 の結果と同じ内容になる
  const first = result.page.locator('#kus-diff-lite [data-kus-dl-multi-xlsx="2"]');
  const downloadXlsx = result.page.waitForEvent('download');
  await first.click();
  const xlsxDownload = await downloadXlsx;
  const multiFile = path.join(OUT, 'multi-row.xlsx');
  await xlsxDownload.saveAs(multiFile);
  // 続けて保存する操作は、前の保存の待ち（クールダウン）が終わるまで受け付けない
  await result.page.waitForFunction(() => ![...document.querySelectorAll('#kus-diff-lite [data-kus-dl-multi-xlsx]')].some((button) => button.disabled));
  await result.page.waitForTimeout(1500);
  const downloadMd = result.page.waitForEvent('download');
  await result.page.locator('#kus-diff-lite [data-kus-dl-multi-md="2"]').click();
  const mdDownload = await downloadMd;
  const multiMd = path.join(OUT, 'multi-row.md');
  await mdDownload.saveAs(multiMd);
  await result.page.waitForTimeout(1500);
  const downloadHtml = result.page.waitForEvent('download');
  await result.page.locator('#kus-diff-lite [data-kus-dl-multi-html="2"]').click();
  const htmlDownload = await downloadHtml;
  const multiHtml = path.join(OUT, 'multi-row.html');
  await htmlDownload.saveAs(multiHtml);
  await result.context.close();
  // 同じ組（#101 → #1002）を 1 対 1 で比べた結果と比べる
  const single = await openPanel(await memoryBrowser(), config);
  await runSingle(single.page, { source: '101', target: '1002' });
  const singlePanel = await readPanel(single.page);
  const singleSaved = await exportOutputs(single.page, path.join(OUT, 'multi-vs-single'), 'single');
  await single.context.close();
  const rowsOf = (file) => readXlsx(file)['変更一覧'].map((row) => row.slice(1).join('|'));
  assert.deepEqual(rowsOf(multiFile), rowsOf(singleSaved.xlsx.file), '1対多の行から保存した Excel が、1対1の結果と違います（保持量を減らした影響）');
  const mdBlocks = (file) => parseMarkdown(fs.readFileSync(file, 'utf8')).blocks.map((block) => block.text.replace(/stableId: `d\d+`/g, ''));
  assert.deepEqual(mdBlocks(multiMd), mdBlocks(singleSaved.md.file), '1対多の行から保存した Markdown が、1対1の結果と違います');
  const htmlCount = parseHtmlReport(fs.readFileSync(multiHtml, 'utf8')).reviewCount;
  assert.equal(htmlCount, singlePanel.total, '1対多の行から保存した HTML の件数が違います');
  ok('multi-memory: 保持を減らしても、行から保存した Excel・Markdown・HTML は 1対1 の結果と同じ');
}, { scale: false });

let memoryBrowserInstance;
async function memoryBrowser() {
  if (!memoryBrowserInstance) {
    const { chromium } = require('playwright');
    const browserName = argValue('--browser', 'chrome');
    const executablePath = argValue('--executable', process.env.KUS_PLAYWRIGHT_EXECUTABLE);
    memoryBrowserInstance = await chromium.launch({ headless: true, args: ['--enable-precise-memory-info', '--js-flags=--expose-gc'], ...(executablePath ? { executablePath } : browserName === 'chromium' ? {} : { channel: browserName }) });
  }
  return memoryBrowserInstance;
}

async function main() {
  if (process.argv.includes('--help')) { printHelp(); return; }
  if (!fs.existsSync(TOOL_FILE)) throw new Error(`配布物が見つかりません: ${TOOL_FILE}（npm run build で生成してください）`);
  const { chromium } = require('playwright');
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });
  const only = argValue('--only', '');
  const skipScale = process.argv.includes('--skip-scale');
  const browserName = argValue('--browser', 'chrome');
  const executablePath = argValue('--executable', process.env.KUS_PLAYWRIGHT_EXECUTABLE);
  browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : browserName === 'chromium' ? {} : { channel: browserName }) });
  let failures = 0;
  const started = Date.now();
  for (const item of scenarios) {
    if (only && !item.name.includes(only)) continue;
    if (skipScale && item.scale === true) { console.log(`- 省略（--skip-scale）: ${item.name}`); continue; }
    console.log(`\n# ${item.name}`);
    const t0 = Date.now();
    try { await item.fn(); console.log(`  （${Math.round((Date.now() - t0) / 100) / 10}s）`); } catch (error) {
      failures += 1;
      console.error(`  NG ${item.name}\n${String(error && error.stack || error).split('\n').slice(0, 8).join('\n')}`);
    }
  }
  await browser.close();
  if (memoryBrowserInstance) await memoryBrowserInstance.close();
  fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify({ checks, metrics, findings, failures, elapsedMs: Date.now() - started }, null, 2));
  const critical = findings.filter((item) => item.severity === 'critical');
  console.log(`\n検査 ${checks.length} 件 OK / 失敗したシナリオ ${failures} / 既知の問題 ${findings.length} 件（重大 ${critical.length}）  ${Math.round((Date.now() - started) / 1000)}s`);
  console.log(`計測値: ${JSON.stringify(metrics)}`);
  if (failures || critical.length) process.exit(1);
}

if (require.main === module) {
  main().catch((error) => { console.error(error); process.exit(1); });
}
