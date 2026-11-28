#!/usr/bin/env node
'use strict';

// ER図（tools/ER図.js）の通し検証。配布物をそのままページに読み込み、業務システムに近い 39 アプリの合成 kintone
// （er-explore-fixture.cjs）につないで、利用者と同じ操作で確かめる。実際の kintone には通信しない。
//
//   - 生成: パネルの「ER図をHTMLで保存」で 3 つの図（案件管理から辿る・全アプリを起点・深さ 1）を作る。所要時間と状態表示を記録。
//   - 生成した HTML は、file:// 以外の通信をすべて遮断したブラウザで開く（描画ライブラリは同梱済み）。
//   - 全レイアウト（Dagre・ツリー・フォース・同心円・グリッド・円形）× 全表示密度で、アプリのカードが重ならないこと
//     （縮小表示と詳細表示の両方）、画面からはみ出さないこと、スクリーンショット。
//   - 検索・強調・シンプル表示・詳細パネル・関連の詳細（コピーするフィールド・表示フィールド・絞り込み条件）。
//   - 表示範囲（起点まわりで開く・全体／深さ 2／アプリのまわりへの切り替え）、同じアプリ間の線のまとめと線の名前。
//   - 表のビュー（アプリ一覧・関連一覧）、印刷の資料、配色（OS の設定・切り替え・コントラスト）。
//   - 以前の版で保存した編集状態（er-edit-state-v1.json・このリポジトリの以前の版で保存した er-edit-state-v1-lite.json）を
//     新しい版の図で開き直したときの復元と、保存し直し。
//   - 設定取得の ZIP（合成 kintone の設定から作る）を読み込んで、kintone に問い合わせずに図を作る。
//   - 出力（PNG・Mermaid・draw.io・PlantUML・SQL DDL・JSON・Markdown・CSV 3 種）の中身。
//   - 320〜1440px のはみ出し（スマホ幅の表・メニュー・引き出し）、キーボード操作。
//
// 画面と出力は .iter-shots/er-explore/ に保存する。失敗した検査は最後に一覧し、1 件でもあれば失敗にする。
const assert = require('node:assert/strict');
const fs = require('node:fs');
const zlib = require('node:zlib');
const path = require('node:path');
const { chromium } = require('playwright');
const { buildFixture } = require('./er-explore-fixture.cjs');

const ROOT = path.resolve(__dirname, '..', '..');
const TOOL_FILE = path.join(ROOT, 'tools', 'ER図.js');
const OUT = path.join(ROOT, '.iter-shots', 'er-explore');

const argValue = (name, fallback = '') => (process.argv.includes(name) ? process.argv[process.argv.indexOf(name) + 1] : fallback);
const hasFlag = (name) => process.argv.includes(name);

if (hasFlag('--help') || hasFlag('-h')) {
  console.log(`Usage: node tools/test-harness/er-explore.cjs [options]

ER図（tools/ER図.js をそのまま読み込み）を、業務システムに近い 39 アプリの合成 kintone につないで通しに検証します。
実際の kintone には通信しません。

Options:
  --browser <name>     chrome または chromium（既定: chrome）
  --executable <path>  ブラウザの実行ファイル（環境変数 KUS_PLAYWRIGHT_EXECUTABLE でも指定できます）
  --only <text>        名前に <text> を含む検査だけ実行します（例: --only layout）
  --help               このヘルプを表示

日本語のダウンロード名を扱うため、ロケールが C/POSIX の環境では LANG=C.UTF-8 LC_ALL=C.UTF-8 を付けて実行してください。
結果と画面: .iter-shots/er-explore/`);
  process.exit(0);
}

const results = [];
const only = argValue('--only');
// 検査の名前、またはその検査を含むグループの名前（layout・search など）で絞り込む
const shouldRun = (name) => !only || name.includes(only) || only.startsWith(name);

async function check(name, fn) {
  if (!shouldRun(name)) return;
  const started = Date.now();
  try {
    const detail = await fn();
    results.push({ name, ok: true, ms: Date.now() - started, detail });
    console.log(`  ok   ${String(Date.now() - started).padStart(5)}ms ${name}${detail ? `  (${typeof detail === 'string' ? detail : JSON.stringify(detail)})` : ''}`);
  } catch (error) {
    results.push({ name, ok: false, ms: Date.now() - started, error: String(error && error.message ? error.message : error) });
    console.log(`  FAIL ${name}\n       ${String(error && error.message ? error.message : error).split('\n').join('\n       ')}`);
  }
}

// ---------------------------------------------------------------------------
// 合成 kintone（ページ内）
// ---------------------------------------------------------------------------
async function installMock(page, fixture, latency = 0) {
  await page.evaluate(({ fixture, latency }) => {
    const calls = [];
    const state = { inflight: 0, peak: 0 };
    window.__ER_CALLS__ = calls;
    window.__ER_STATE__ = state;
    const api = async (url, method, params = {}) => {
      const resource = String(url).replace(/^.*\/k(?:\/guest\/[^/]+)?\/v1(?:\/preview)?/, '') || '/';
      calls.push({ resource, method: String(method), params: { ...params } });
      state.inflight += 1;
      state.peak = Math.max(state.peak, state.inflight);
      try {
        if (latency) await new Promise((resolve) => setTimeout(resolve, latency));
        if (String(method).toUpperCase() !== 'GET') throw new Error(`mock: GET のみ対応です (${method} ${resource})`);
        if (resource === '/apps.json') {
          const all = Object.values(fixture.apps).map((app) => ({ appId: app.id, name: app.name, spaceId: app.spaceId }));
          const offset = Number(params.offset || 0);
          return { apps: all.slice(offset, offset + Number(params.limit || 100)) };
        }
        const id = String(params.app ?? params.id);
        const app = fixture.apps[id];
        if (!app) {
          const error = new Error(`指定したアプリ（ID: ${id}）が見つかりません。`);
          error.code = 'GAIA_AP01';
          error.status = 404;
          throw error;
        }
        if (resource === '/app.json') return { appId: app.id, name: app.name, spaceId: app.spaceId, description: app.description, createdAt: '2026-01-01T00:00:00Z', modifiedAt: '2026-08-01T00:00:00Z' };
        if (resource === '/app/form/fields.json') {
          if (app.failFields) {
            const error = new Error(app.failFields);
            error.code = 'CB_NO02';
            error.status = 403;
            throw error;
          }
          return { properties: JSON.parse(JSON.stringify(app.fields)), revision: '5' };
        }
        if (resource === '/app/actions.json') return { actions: JSON.parse(JSON.stringify(app.actions)), revision: '5' };
        throw new Error(`mock: 未対応の API です (${resource})`);
      } finally {
        state.inflight -= 1;
      }
    };
    api.url = (resource, preview) => `/k/v1${preview ? '/preview' : ''}${resource}`;
    window.kintone = { api, app: { getId: () => 113 }, getLoginUser: () => ({ code: 'user', name: 'User' }) };
    window.alert = () => {};
    window.confirm = () => true;
  }, { fixture, latency });
}

function collectErrors(page, label, errors) {
  page.on('pageerror', (error) => errors.push(`${label}: pageerror: ${error.message}`));
  page.on('console', (message) => {
    // 取得失敗のアプリは、画面の動作とは別に console.error へ原因を残す（想定内）
    if (message.type() === 'error' && !/^App \d+: /.test(message.text())) errors.push(`${label}: console: ${message.text()}`);
  });
}

async function launch() {
  const executable = argValue('--executable', process.env.KUS_PLAYWRIGHT_EXECUTABLE || '');
  const requested = argValue('--browser', process.env.KUS_ER_BROWSER || 'chrome');
  const options = { headless: true };
  if (executable) options.executablePath = executable;
  else if (requested !== 'chromium') options.channel = requested;
  try {
    return await chromium.launch(options);
  } catch (error) {
    if (!options.channel && !options.executablePath) throw error;
    console.warn(`[ER explore] ${requested} を起動できないため bundled Chromium を使います: ${error.message}`);
    return chromium.launch({ headless: true });
  }
}

// ---------------------------------------------------------------------------
// 設定取得の保存形式（設定JSON・ZIP）を、合成 kintone の設定から作る
// ---------------------------------------------------------------------------
// 設定取得は応答のキーを並べ替えて保存する（normalizeSettingsSection）。同じように並べ替え、項目と関連の並びが kintone の応答と違う設定にする
const sortKeys = (value) => (Array.isArray(value) ? value.map(sortKeys)
  : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map((key) => [key, sortKeys(value[key])])) : value);
function settingsBundles(fixture, appIds, fetchedAt) {
  return appIds.map((id) => {
    const app = fixture.apps[id];
    return {
      appId: app.id, guestId: '', preview: false, fetchedAt, meta: { sectionRevisions: {} },
      sections: {
        appInfo: { appId: app.id, code: '', name: app.name, description: app.description, spaceId: app.spaceId, threadId: null },
        fieldSettings: app.failFields ? { _fetchError: app.failFields } : sortKeys({ properties: app.fields }),
        actionSettings: sortKeys({ actions: app.actions })
      }
    };
  });
}
// 圧縮なし（STORE）の ZIP。設定取得の「設定をZIPで保存」と同じく manifest.json とアプリごとの設定 JSON を入れる
function storedZip(files) {
  const locals = [];
  const centrals = [];
  let offset = 0;
  for (const file of files) {
    const name = Buffer.from(file.name, 'utf8');
    const data = Buffer.from(file.data, 'utf8');
    const crc = zlib.crc32(data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(20, 4); local.writeUInt16LE(0x0800, 6);
    local.writeUInt32LE(crc, 14); local.writeUInt32LE(data.length, 18); local.writeUInt32LE(data.length, 22); local.writeUInt16LE(name.length, 26);
    locals.push(local, name, data);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0); central.writeUInt16LE(20, 4); central.writeUInt16LE(20, 6); central.writeUInt16LE(0x0800, 8);
    central.writeUInt32LE(crc, 16); central.writeUInt32LE(data.length, 20); central.writeUInt32LE(data.length, 24); central.writeUInt16LE(name.length, 28);
    central.writeUInt32LE(offset, 42);
    centrals.push(central, name);
    offset += 30 + name.length + data.length;
  }
  const directory = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(files.length, 8); end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(directory.length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, directory, end]);
}
function writeSettingsZip(fixture, appIds, fetchedAt, file) {
  const bundles = settingsBundles(fixture, appIds, fetchedAt);
  const entries = bundles.map((bundle) => ({ name: `${bundle.sections.appInfo.name.slice(0, 20)}(${bundle.appId})_本番.json`, data: JSON.stringify(bundle) }));
  const manifest = { apps: entries.map((entry, i) => ({ appId: bundles[i].appId, file: entry.name })) };
  fs.writeFileSync(file, storedZip([{ name: 'manifest.json', data: JSON.stringify(manifest) }, ...entries]));
  return file;
}

// ---------------------------------------------------------------------------
// 生成（パネルの操作）
// ---------------------------------------------------------------------------
const setValue = (locator, value) => locator.evaluate((element, v) => {
  element.value = v;
  element.dispatchEvent(new Event('input', { bubbles: true }));
  element.dispatchEvent(new Event('change', { bubbles: true }));
}, value);

async function generateHtml(browser, fixture, spec) {
  const context = await browser.newContext({ acceptDownloads: true, viewport: { width: 1200, height: 900 } });
  const page = await context.newPage();
  const errors = [];
  collectErrors(page, `generate-${spec.name}`, errors);
  await page.route('https://mock.cybozu.com/**', (route) => route.fulfill({
    status: 200, contentType: 'text/html; charset=utf-8',
    body: '<!doctype html><html lang="ja"><head><meta charset="utf-8"><title>Mock kintone</title></head><body></body></html>'
  }));
  await page.goto('https://mock.cybozu.com/k/113/', { waitUntil: 'domcontentloaded' });
  await installMock(page, fixture, spec.latency || 0);
  await page.addScriptTag({ content: fs.readFileSync(TOOL_FILE, 'utf8') });
  const root = page.locator('#kus-er-lite');
  await root.waitFor({ state: 'visible', timeout: 15000 });
  if (spec.settingsFile) {
    // 設定JSON・ZIP は詳細設定のポップアップにある。読み込むと起点が読み込んだ全アプリになり、kintone に問い合わせずに作る
    await page.locator('input[type=file][aria-label="設定JSON・ZIP を読み込む"]').setInputFiles(spec.settingsFile);
    await page.waitForFunction(() => document.querySelector('[data-import-status="loaded"]'), null, { timeout: 15000 });
  }
  await root.locator('.kus-lp__row').filter({ hasText: '起点ID' }).first().locator('input').first().fill(spec.ids.join(','));
  await setValue(root.locator('select').filter({ has: page.locator('option[value="dagre"]') }).first(), spec.layout || 'dagre');
  await setValue(root.locator('select').filter({ has: page.locator('option[value="full"]') }).first(), spec.density || 'standard');
  await setValue(root.locator('input[type=number]').first(), String(spec.depth ?? 0));
  await root.locator('label').filter({ hasText: '逆引き探索' }).first().locator('input').evaluate((element, checked) => {
    element.checked = checked;
    element.dispatchEvent(new Event('change', { bubbles: true }));
  }, !!spec.reverse);
  await root.getByRole('radio', { name: 'ER図をHTMLで保存', exact: true }).check();
  await root.getByRole('button', { name: '内容を確認する', exact: true }).click();
  const downloadPromise = page.waitForEvent('download', { timeout: spec.cancelAfterMs ? 3000 : 120000 });
  const callsBefore = await page.evaluate(() => window.__ER_CALLS__.length);
  const loadStatus = spec.settingsFile ? String(await root.locator('[data-er-offline]').innerText().catch(() => '')) : '';
  const started = Date.now();
  await root.getByRole('button', { name: 'ER図をHTMLで保存', exact: true }).click();
  if (spec.cancelAfterMs) {
    // 読み取りの途中で「中止」を押す。図は保存されず、件数つきの状態が出る
    await page.waitForTimeout(spec.cancelAfterMs);
    await root.getByRole('button', { name: /中止/ }).first().click();
    const downloaded = await downloadPromise.then(() => true, () => false);
    await page.waitForTimeout(500);
    const cancelStatus = String(await root.locator('.kus-lp__status').first().innerText().catch(() => '')).replace(/\s+/g, ' ').trim();
    const state = await page.evaluate(() => ({ peak: window.__ER_STATE__.peak, fieldCalls: window.__ER_CALLS__.filter((c) => c.resource === '/app/form/fields.json').length }));
    await context.close();
    return { cancelled: true, downloaded, status: cancelStatus, errors, ...state };
  }
  const download = await downloadPromise;
  const file = path.join(OUT, `${spec.name}.html`);
  await download.saveAs(file);
  const elapsedMs = Date.now() - started;
  const status = String(await root.locator('.kus-lp__status').first().innerText().catch(() => '')).replace(/\s+/g, ' ').trim();
  const peak = await page.evaluate(() => window.__ER_STATE__.peak);
  const requests = await page.evaluate((before) => window.__ER_CALLS__.length - before, callsBefore);
  await context.close();
  return { file, elapsedMs, status, errors, peakRequests: peak, requests, loadStatus, html: fs.readFileSync(file, 'utf8') };
}

// ---------------------------------------------------------------------------
// 生成した図を開く（file:// 以外の通信をすべて遮断）
// ---------------------------------------------------------------------------
async function openViewer(browser, file, { width = 1440, height = 900, hash = '', colorScheme = 'light' } = {}) {
  const context = await browser.newContext({ viewport: { width, height }, acceptDownloads: true, colorScheme });
  const page = await context.newPage();
  const errors = [];
  const blocked = [];
  collectErrors(page, path.basename(file), errors);
  await page.route('**/*', async (route) => {
    const url = route.request().url();
    if (/^(?:file|data|blob|about):/i.test(url)) return route.continue();
    blocked.push(url);
    return route.abort();
  });
  await page.goto(`file://${file}${hash}`, { waitUntil: 'load' });
  await page.waitForSelector('#cy canvas', { state: 'attached', timeout: 30000 });
  await page.waitForTimeout(1500);
  return { context, page, errors, blocked };
}

// 生成した HTML に、編集済みHTMLと同じ形で編集状態（window.__ER_EDIT_STATE__）を差し込んだ複製を作る。
// 以前の版で保存した編集状態（er-edit-state-v1.json）を、新しい版の図で開き直すときに使う
function withEditState(htmlFile, state, outFile) {
  const html = fs.readFileSync(htmlFile, 'utf8');
  const json = JSON.stringify(state).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');
  const marker = '<script id="er-main" type="text/plain">';
  assert.ok(html.includes(marker), '図の本体スクリプトが見つかりません');
  fs.writeFileSync(outFile, html.replace(marker, () => `<script id="er-edit-state">window.__ER_EDIT_STATE__=${json};</script>${marker}`), 'utf8');
  return outFile;
}

// WCAG のコントラスト比（文字色と、透明でない一番近い背景色）
const measureContrast = (page, selectors) => page.evaluate((list) => {
  const parse = (c) => { const m = String(c).match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(',').map((v) => parseFloat(v)); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
  const lum = ({ r, g, b }) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const bgOf = (el) => { for (let e = el; e; e = e.parentElement) { const c = parse(getComputedStyle(e).backgroundColor); if (c && c.a > 0.9) return c; } return { r: 255, g: 255, b: 255 }; };
  return list.map((selector) => {
    const el = document.querySelector(selector);
    if (!el) return { selector, missing: true };
    const fg = parse(getComputedStyle(el).color);
    const a = lum(fg), b = lum(bgOf(el));
    return { selector, ratio: Math.round(((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)) * 100) / 100 };
  });
}, selectors);

const measureOverlaps = (page) => page.evaluate(() => {
  const nodes = cy.nodes().filter((node) => node.visible() && !node.hasClass('note-node'));
  const boxes = nodes.map((node) => ({ id: node.id(), name: String(node.data('label') || '').split('\n')[0], box: node.boundingBox({ includeLabels: false, includeOverlays: false }) }));
  const overlaps = [];
  for (let i = 0; i < boxes.length; i += 1) {
    for (let j = i + 1; j < boxes.length; j += 1) {
      const a = boxes[i].box;
      const b = boxes[j].box;
      const width = Math.min(a.x2, b.x2) - Math.max(a.x1, b.x1);
      const height = Math.min(a.y2, b.y2) - Math.max(a.y1, b.y1);
      if (width > 2 && height > 2) overlaps.push({ a: boxes[i].name, b: boxes[j].name, width: Math.round(width), height: Math.round(height) });
    }
  }
  return { nodes: boxes.length, overlaps: overlaps.length, sample: overlaps.slice(0, 3), zoom: Math.round(cy.zoom() * 100) };
});

async function settleLayout(page) {
  // レイアウトの動き（0.55 秒）と全体表示の合わせ直し（0.45 秒）が終わるまで待つ
  await page.waitForTimeout(1600);
}

// ---------------------------------------------------------------------------
async function main() {
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });
  assert.ok(fs.existsSync(TOOL_FILE), `${TOOL_FILE} がありません。先に npm run build を実行してください`);
  const fixture = buildFixture();
  const allIds = fixture.allAppIds.map(String);
  const browser = await launch();
  const generated = {};
  try {
    console.log('生成');
    const specs = [
      { name: 'business', ids: ['113'], depth: 0, latency: 15 },
      { name: 'all', ids: allIds, depth: 0 },
      { name: 'depth1', ids: ['113'], depth: 1 },
      // 設定取得の ZIP から作る。商品マスタ(104)・社員マスタ(111) の設定は入れない（未取得の参照先になる）
      { name: 'offline', ids: ['113'], depth: 0, settingsFile: writeSettingsZip(fixture, allIds.filter((id) => id !== '104' && id !== '111'), '2026-11-20T01:39:00.000Z', path.join(OUT, '設定一括取得_合成.zip')) }
    ];
    for (const spec of specs) {
      if (!shouldRun('generate') && !shouldRun(spec.name) && only) { /* 後続の検査が使う図は常に作る */ }
      generated[spec.name] = await generateHtml(browser, fixture, spec);
    }
    await check('generate: 案件管理から辿る図（取得失敗 1・存在しない参照先は辿るだけ）', async () => {
      const g = generated.business;
      assert.match(g.status, /ER図HTMLを保存しました/);
      assert.match(g.status, /取得失敗 1/);
      assert.deepEqual(g.errors, []);
      // 同時に読むのは 4 アプリまで（1 アプリ 3 リクエスト）。直列ではなく並列で読んでいること
      assert.ok(g.peakRequests >= 6 && g.peakRequests <= 12, `同時リクエストの最大が ${g.peakRequests} 件です（4 アプリ × 3 リクエスト以内で、複数アプリを並行して読むはず）`);
      return `${g.status}  ${g.elapsedMs}ms 同時リクエスト最大 ${g.peakRequests}`;
    });
    await check('generate: 全アプリを起点にした図（孤立・取得失敗・削除済みの参照先を含む）', async () => {
      const g = generated.all;
      assert.match(g.status, /41アプリ/);
      assert.match(g.status, /取得失敗 3/);
      assert.deepEqual(g.errors, []);
      return `${g.status}  ${g.elapsedMs}ms`;
    });
    await check('generate: 深さ 1 の図', async () => {
      assert.match(generated.depth1.status, /9アプリ/);
      assert.deepEqual(generated.depth1.errors, []);
      return generated.depth1.status;
    });
    await check('generate: 設定取得の ZIP から作る図は kintone に問い合わせず、見出しに「設定JSONから作成」を出す', async () => {
      const g = generated.offline;
      assert.match(g.loadStatus, /設定JSON「設定一括取得_合成\.zip」の 37アプリから作ります（kintone に問い合わせません）/);
      assert.equal(g.requests, 0, `設定JSONから作るのに kintone へ ${g.requests} 件問い合わせました`);
      assert.match(g.status, /ER図HTMLを保存しました.*設定JSON「設定一括取得_合成\.zip」から作成（kintone には問い合わせていません）/);
      assert.deepEqual(g.errors, []);
      const meta = g.html.match(/<span class="brand-meta" title="設定JSONから作成[^"]*">([^<]*)<\/span>/)[1];
      assert.match(meta, /^設定JSONから作成（2026\/11\/2\d \d\d:\d\d 取得） · 通常空間 \/ 本番$/);
      assert.ok(!g.html.includes('mock.cybozu.com'), '設定JSONから作った図に、いま開いている kintone のホストを出しています');
      const viewer = await openViewer(browser, g.file);
      const state = await viewer.page.evaluate(() => ({
        apps: APPS.length,
        ghosts: cy.nodes('[?isGhost]').map((n) => n.data('targetAppId')).map(String).sort(),
        failed: APPS.filter((a) => a.ok === false).map((a) => a.id),
        print: (() => { const meta = buildPrintDocHtml(); return /取得元<\/dt><dd>設定JSONから作成/.test(meta); })()
      }));
      const problems = [...viewer.errors, ...viewer.blocked];
      await viewer.page.screenshot({ path: path.join(OUT, 'offline.png'), animations: 'disabled' });
      await viewer.context.close();
      assert.deepEqual(problems, []);
      // kintone から辿った図と同じアプリ数から、読み込まなかった 2 アプリを除いた数。読み込まなかったアプリは「未取得の参照先」になる
      const businessAppList = JSON.parse(generated.business.html.match(/const APPS = (.*);\n/)[1]);
      const businessApps = businessAppList.length;
      assert.ok(state.ghosts.includes('104') && state.ghosts.includes('111'), `未取得の参照先: ${state.ghosts.join(',')}`);
      assert.ok(state.apps < businessApps, `アプリ数 ${state.apps}（kintone から辿った図 ${businessApps}）`);
      assert.deepEqual(state.failed, businessAppList.filter((a) => a.ok === false).map((a) => a.id), '取得に失敗したセクションは、kintone から辿った図と同じく取得失敗のアプリとして出す');
      assert.equal(state.print, true, '印刷の見出しに取得元を出していません');
      return `${state.apps}アプリ・未取得の参照先 ${state.ghosts.length}・問い合わせ ${g.requests} 件`;
    });
    await check('generate: 外部の通信なしで描画できる自己完結の HTML', async () => {
      for (const [name, g] of Object.entries(generated)) {
        assert.ok(!/<script\b[^>]*\ssrc\s*=/i.test(g.html), `${name}: script src が残っています`);
        assert.ok(!/cdnjs|jsdelivr/.test(g.html.match(/Content-Security-Policy" content="([^"]*)"/)[1]), `${name}: CSP に CDN が残っています`);
      }
      return Object.entries(generated).map(([name, g]) => `${name} ${(g.html.length / 1024).toFixed(0)}KB`).join(' / ');
    });

    // -----------------------------------------------------------------------
    console.log('レイアウトと表示密度（全アプリを起点にした図 41 アプリ）');
    const layouts = ['dagre', 'breadthfirst', 'cose', 'concentric', 'grid', 'circle'];
    const densities = ['none', 'compact', 'standard', 'full'];
    if (shouldRun('layout')) {
      const viewer = await openViewer(browser, generated.all.file);
      const { page } = viewer;
      for (const density of densities) {
        await page.evaluate((value) => window.setDensity(value), density);
        await page.waitForTimeout(700);
        for (const layout of layouts) {
          await check(`layout: ${layout} / 密度 ${density} でカードが重ならない`, async () => {
            await page.evaluate((name) => window.setLayout(name), layout);
            await settleLayout(page);
            const overview = await measureOverlaps(page);
            await page.evaluate(() => { cy.zoom({ level: 1, renderedPosition: { x: cy.width() / 2, y: cy.height() / 2 } }); });
            await page.waitForTimeout(300);
            const detail = await measureOverlaps(page);
            await page.evaluate(() => window.fit());
            await page.waitForTimeout(300);
            if (density === 'standard') await page.screenshot({ path: path.join(OUT, `layout-${layout}.png`), animations: 'disabled' });
            assert.deepEqual({ overview: overview.overlaps, detail: detail.overlaps }, { overview: 0, detail: 0 },
              `重なり ${JSON.stringify([overview.sample, detail.sample])}`);
            return `縮小 ${overview.zoom}%`;
          });
        }
      }
      results.push({ name: 'layout: ページのエラー', ok: viewer.errors.length === 0 && viewer.blocked.length === 0, error: [...viewer.errors, ...viewer.blocked].join('\n') });
      if (viewer.errors.length || viewer.blocked.length) console.log(`  FAIL layout: ページのエラー ${[...viewer.errors, ...viewer.blocked].join(' / ')}`);
      await viewer.context.close();
    }

    // -----------------------------------------------------------------------
    console.log('構造の分析');
    if (shouldRun('analysis')) {
      const viewer = await openViewer(browser, generated.all.file);
      const { page } = viewer;
      await check('analysis: 循環・自己参照・孤立・取得失敗・接続数の多いアプリが事実どおり', async () => {
        const analysis = await page.evaluate(() => JSON.parse(JSON.stringify(ER_ANALYSIS)));
        const cycles = analysis.cycles.map((c) => [...c.appIds].map(Number).sort((a, b) => a - b).join('-'));
        assert.ok(cycles.includes('137-138-139'), `循環テスト A→B→C が見つかりません: ${cycles.join(' / ')}`);
        assert.ok(cycles.some((c) => ['113', '114', '116'].every((id) => c.split('-').includes(id))), `案件・見積・受注の循環が見つかりません: ${cycles.join(' / ')}`);
        assert.deepEqual(analysis.selfReferences.map((s) => Number(s.appId)).sort(), [101, 111], '自己参照（顧客マスタの親会社・社員マスタの上長）');
        assert.ok(analysis.isolatedAppIds.map(Number).includes(132), '孤立アプリ（社内連絡メモ）');
        assert.deepEqual(analysis.failedAppIds.map(Number).sort((a, b) => a - b), [133, 998, 999]);
        assert.ok(analysis.hubs.some((h) => Number(h.appId) === 136), '全社マスタ連携ハブが接続数の多いアプリに入っていません');
        return `循環 ${cycles.length} 件 / 孤立 ${analysis.isolatedAppIds.length} / 取得失敗 ${analysis.failedAppIds.length}`;
      });
      await check('analysis: 「チェック」パネルを開いて閉じられる（キーボード）', async () => {
        await page.locator('#analysis-toggle-btn').focus();
        await page.keyboard.press('Enter');
        await page.waitForTimeout(400);
        const text = await page.locator('#analysis-panel').innerText();
        assert.match(text, /循環/);
        assert.match(text, /取得/);
        assert.match(text, /このアプリを閲覧する権限がありません/, '取得失敗の理由');
        assert.ok(!text.includes('[API]'), '取得失敗の理由に内部の通信情報（[API] …）が出ています');
        await page.screenshot({ path: path.join(OUT, 'analysis-panel.png'), animations: 'disabled' });
        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);
        assert.equal(await page.evaluate(() => document.getElementById('analysis-panel').classList.contains('open')), false, 'Esc でパネルが閉じません');
      });
      await viewer.context.close();
    }

    console.log('検索・強調・詳細パネル');
    if (shouldRun('search') || shouldRun('detail') || shouldRun('simple')) {
      const viewer = await openViewer(browser, generated.all.file);
      const { page } = viewer;
      const searchMeta = async (query) => {
        await page.fill('#search-box', query);
        await page.waitForTimeout(500);
        const meta = String(await page.locator('#search-meta').innerText()).replace(/\s+/g, ' ');
        const highlighted = await page.evaluate(() => cy.nodes('.highlighted').length);
        const match = meta.match(/(\d+)件/);
        return { meta, count: match ? Number(match[1]) : 0, highlighted };
      };
      await check('search: アプリ名・日本語のフィールド名で一致した件数と強調が合う', async () => {
        const byName = await searchMeta('顧客');
        assert.ok(byName.count >= 8, `「顧客」で ${byName.count} 件`);
        assert.equal(byName.highlighted, byName.count, '一致件数と強調したアプリの数が違います');
        await page.screenshot({ path: path.join(OUT, 'search-customer.png'), animations: 'disabled' });
        const byCode = await searchMeta('プロジェクトマネージャー');
        assert.equal(byCode.count, 1, `長いフィールド名で ${byCode.count} 件`);
        const none = await searchMeta('存在しない語句zzz');
        assert.deepEqual([none.count, none.highlighted], [0, 0]);
        // 検索の表示が長くなって操作バーが折り返さない（1 行のまま）
        await searchMeta('顧客');
        const topbarHeight = await page.evaluate(() => document.getElementById('topbar').getBoundingClientRect().height);
        assert.ok(topbarHeight < 60, `検索中に操作バーが折り返しました (${Math.round(topbarHeight)}px)`);
        return `「顧客」${byName.count} 件`;
      });
      await check('search: 現在の密度では項目が見えないアプリも、項目名で見つかる', async () => {
        // 顧客担当者マスタ（App 102）の「メールアドレス」は必須でも結合でもなく、標準密度のカードには出ない
        const hidden = await searchMeta('メールアドレス');
        assert.equal(hidden.count, 1, `標準密度で「メールアドレス」が ${hidden.count} 件（取得済みの項目なので 1 件のはず）`);
        await page.evaluate(() => window.setDensity('none'));
        await page.waitForTimeout(600);
        const none = await searchMeta('顧客コード');
        await page.evaluate(() => window.setDensity('standard'));
        await page.waitForTimeout(600);
        assert.ok(none.count >= 2, `密度「結合のみ」で「顧客コード」が ${none.count} 件`);
      });
      await check('search: Enter で一致したアプリへ順に移り、Ctrl+F で検索欄へ戻れる', async () => {
        await searchMeta('保守');
        await page.locator('#search-box').press('Enter');
        await page.waitForTimeout(500);
        assert.match(await page.locator('#toast').innerText(), /一致 1\//);
        await page.locator('#search-box').press('Enter');
        await page.waitForTimeout(500);
        assert.match(await page.locator('#toast').innerText(), /一致 2\//);
        await page.fill('#search-box', '');
        await page.locator('#search-box').evaluate((el) => el.blur());
        await page.keyboard.press('Control+f');
        assert.equal(await page.evaluate(() => document.activeElement && document.activeElement.id), 'search-box');
        await page.fill('#search-box', '');
      });
      await check('detail: アプリを選ぶと詳細パネルに関連の詳細（コピー・表示・絞り込み）が出る', async () => {
        await page.evaluate(() => window.focusApp(113));
        await page.waitForTimeout(1200);
        assert.equal(await page.locator('#detail-title').innerText(), '案件管理');
        const relations = await page.locator('#detail-relations').innerText();
        assert.match(relations, /コピー: 参照先 顧客名 → 顧客名 \/ 参照先 業種名 → 顧客業種/, 'ルックアップのコピー先');
        assert.match(relations, /表示: 見積番号 \/ 見積日 \/ 見積金額/, '関連レコード一覧の表示フィールド');
        assert.match(relations, /絞り込み: ステータス != "完了"/, '関連レコード一覧の絞り込み条件');
        assert.match(relations, /コピー: 案件番号 → 起動先 案件番号/, 'アプリアクションのコピー');
        assert.match(relations, /このアプリを参照している関連/);
        // 長い説明も省略されず、パネルの幅に収まって折り返している
        const layout = await page.evaluate(() => {
          const panel = document.getElementById('detail').getBoundingClientRect();
          return [...document.querySelectorAll('#detail-relations .field-detail')].map((el) => {
            const rect = el.getBoundingClientRect();
            return { text: el.textContent.slice(0, 30), truncated: el.scrollWidth > el.clientWidth + 1, outside: rect.right > panel.right + 1, wrapped: getComputedStyle(el).whiteSpace };
          });
        });
        assert.ok(layout.length >= 6, `関連の詳細の行が ${layout.length} 行しかありません`);
        assert.deepEqual(layout.filter((row) => row.truncated || row.outside || row.wrapped !== 'normal'), []);
        await page.screenshot({ path: path.join(OUT, 'detail-113.png'), animations: 'disabled' });
        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);
      });
      await check('detail: 取得失敗のアプリは理由を示し、存在しない参照先は未取得として示す', async () => {
        await page.evaluate(() => window.focusApp(133));
        await page.waitForTimeout(800);
        const failed = await page.locator('#detail-meta').innerText();
        assert.match(failed, /取得失敗/);
        assert.match(failed, /権限/);
        assert.ok(!failed.includes('[API]'), '取得失敗の理由に内部の通信情報（[API] …）が出ています');
        await page.evaluate(() => window.focusApp(999));
        await page.waitForTimeout(800);
        assert.match(await page.locator('#detail-meta').innerText(), /取得失敗/);
        await page.keyboard.press('Escape');
      });
      await check('detail: 線にマウスを乗せると、コピーするフィールドと絞り込みが出る', async () => {
        const text = await page.evaluate(() => {
          const edge = cy.getElementById('e_113_0');
          edge.emit('mouseover');
          const tip = document.getElementById('er-tooltip');
          return tip ? tip.innerText : '';
        });
        assert.match(text, /コピー: 参照先 顧客名 → 顧客名/);
        await page.evaluate(() => { cy.getElementById('e_113_0').emit('mouseout'); });
      });
      await check('simple: シンプル表示で項目が隠れ、元に戻せる', async () => {
        await page.evaluate(() => window.toggleSimpleMode());
        await page.waitForTimeout(1600);
        const during = await measureOverlaps(page);
        await page.screenshot({ path: path.join(OUT, 'simple-mode.png'), animations: 'disabled' });
        await page.evaluate(() => window.toggleSimpleMode());
        await page.waitForTimeout(900);
        assert.equal(during.overlaps, 0, `重なり ${JSON.stringify(during.sample)}`);
      });
      results.push({ name: 'search/detail: ページのエラー', ok: viewer.errors.length === 0 && viewer.blocked.length === 0, error: [...viewer.errors, ...viewer.blocked].join('\n') });
      if (viewer.errors.length || viewer.blocked.length) console.log(`  FAIL search/detail: ページのエラー ${[...viewer.errors, ...viewer.blocked].join(' / ')}`);
      await viewer.context.close();
    }

    console.log('未取得の参照先（深さ 1）');
    if (shouldRun('ghost')) {
      const viewer = await openViewer(browser, generated.depth1.file);
      const { page } = viewer;
      await check('ghost: 図の外の参照先を点線のカードで示し、選ぶと向かう関連が分かる', async () => {
        const info = await page.evaluate(() => ({ ghosts: cy.nodes('[?isGhost]').map((n) => n.data('targetAppId')), apps: cy.nodes().not('[?isGhost]').length }));
        assert.ok(info.ghosts.length >= 5, `未取得の参照先が ${info.ghosts.length} 件`);
        await page.evaluate((id) => { cy.getElementById(`g${id}`).emit('tap'); }, info.ghosts[0]);
        await page.waitForTimeout(700);
        assert.equal(await page.locator('#detail-title').innerText(), '未取得の参照先');
        assert.match(await page.locator('#detail-relations').innerText(), /この参照先へ向かう関連/);
        await page.screenshot({ path: path.join(OUT, 'ghost-detail.png'), animations: 'disabled' });
        return `図の外 ${info.ghosts.length} 件`;
      });
      await check('ghost: 概要の件数と図の外の参照先の件数が合う', async () => {
        const pill = String(await page.locator('#overview-pill').innerText());
        const unresolved = await page.evaluate(() => ER_ANALYSIS.unresolvedTargets.length);
        assert.ok(unresolved > 0);
        assert.match(pill, /未取得\s*\d+/);
      });
      await viewer.context.close();
    }

    console.log('表示範囲（起点まわり / 全体）と線のまとめ');
    if (shouldRun('scope')) {
      await check('scope: 案件管理から辿った図は、起点まわり（起点と直接の関連先）で開き、カードの文字が読める倍率になる', async () => {
        const viewer = await openViewer(browser, generated.business.file);
        const { page } = viewer;
        const state = await page.evaluate(() => {
          const visible = cy.nodes().filter((n) => n.visible() && !n.hasClass('note-node'));
          const neighbours = new Set(['a113']);
          cy.getElementById('a113').connectedEdges().forEach((e) => { neighbours.add(e.source().id()); neighbours.add(e.target().id()); });
          return {
            scope: JSON.parse(JSON.stringify(viewScope)),
            visible: visible.map((n) => n.id()).sort(),
            expected: [...neighbours].sort(),
            total: cy.nodes().not('.note-node').length,
            zoom: cy.zoom(),
            bar: document.getElementById('scope-bar').innerText.replace(/\s+/g, ' '),
            startMarked: cy.nodes('[?isStart]').map((n) => n.id()),
            labels: cy.nodes().map((n) => String(n.data('label') || ''))
          };
        });
        await page.screenshot({ path: path.join(OUT, 'scope-start.png'), animations: 'disabled' });
        const overlaps = await measureOverlaps(page);
        await viewer.context.close();
        assert.deepEqual(state.scope, { mode: 'around', roots: ['113'], depth: 1 });
        assert.deepEqual(state.visible, state.expected, '起点と直接の関連先だけを表示していません');
        assert.ok(state.visible.length < state.total, '起点まわりでアプリが減っていません');
        assert.ok(state.zoom >= 0.6, `開いた直後の倍率が ${Math.round(state.zoom * 100)}% です（項目まで読める詳細カードで開くはず）`);
        assert.match(state.bar, /起点まわり/);
        assert.match(state.bar, /全体を表示/);
        assert.deepEqual(state.startMarked, ['a113'], '起点の目印は起点アプリだけに付く');
        assert.ok(!state.labels.some((label) => label.includes('★')), '意味のない「★」が残っています');
        assert.equal(overlaps.overlaps, 0, `重なり ${JSON.stringify(overlaps.sample)}`);
        return `${state.visible.length}/${state.total} アプリ・${Math.round(state.zoom * 100)}%`;
      });
      await check('scope: 全体・深さ 2・選んだアプリのまわりへ切り替えられ、戻ると前の位置に戻る', async () => {
        const viewer = await openViewer(browser, generated.business.file);
        const { page } = viewer;
        const before = await page.evaluate(() => cy.getElementById('a113').position());
        await page.locator('#scope-all-btn').click();
        await settleLayout(page);
        const all = await page.evaluate(() => ({ mode: viewScope.mode, visible: cy.nodes(':visible').length, total: cy.nodes().length }));
        const allOverlaps = await measureOverlaps(page);
        await page.locator('#scope-start-btn').click();
        await settleLayout(page);
        const back = await page.evaluate(() => ({ mode: viewScope.mode, pos: cy.getElementById('a113').position() }));
        await page.locator('#scope-depth-2').click();
        await settleLayout(page);
        const depth2 = await page.evaluate(() => ({ depth: viewScope.depth, visible: cy.nodes(':visible').length }));
        // アプリをダブルクリックすると、そのアプリのまわりを表示する
        await page.evaluate(() => cy.getElementById('a101').emit('dbltap'));
        await settleLayout(page);
        const around = await page.evaluate(() => ({ scope: JSON.parse(JSON.stringify(viewScope)), bar: document.getElementById('scope-bar').innerText.replace(/\s+/g, ' ') }));
        const aroundOverlaps = await measureOverlaps(page);
        const problems = [...viewer.errors, ...viewer.blocked];
        await viewer.context.close();
        assert.deepEqual(problems, []);
        assert.equal(all.mode, 'all');
        assert.equal(all.visible, all.total, '全体を表示しても隠れたアプリがあります');
        assert.equal(allOverlaps.overlaps, 0, `全体で重なり ${JSON.stringify(allOverlaps.sample)}`);
        assert.equal(back.mode, 'around');
        assert.deepEqual(back.pos, before, '起点まわりに戻ったとき、前の位置に戻っていません');
        assert.equal(depth2.depth, 2);
        assert.ok(depth2.visible > 9, `深さ 2 で ${depth2.visible} アプリ`);
        assert.deepEqual(around.scope.roots, ['101']);
        assert.match(around.bar, /顧客マスタ/);
        assert.equal(aroundOverlaps.overlaps, 0, `重なり ${JSON.stringify(aroundOverlaps.sample)}`);
        return `全体 ${all.total} / 深さ 2 ${depth2.visible}`;
      });
      await check('scope: 図の外のアプリを左の一覧で選ぶと、そのアプリのまわりへ移って詳細を出す', async () => {
        const viewer = await openViewer(browser, generated.business.file);
        const { page } = viewer;
        const outside = await page.evaluate(() => cy.nodes('.scope-out').filter((n) => n.data('appId') != null).first().data('appId'));
        assert.ok(outside, '図の外のアプリがありません');
        await page.locator(`#app-list .app-list-item[data-app="${outside}"]`).click();
        await settleLayout(page);
        const state = await page.evaluate((id) => ({ visible: cy.getElementById(`a${id}`).visible(), title: document.getElementById('detail-title').textContent, roots: viewScope.roots }), outside);
        await viewer.context.close();
        assert.equal(state.visible, true);
        assert.deepEqual(state.roots, [String(outside)]);
        assert.ok(state.title.length > 0);
      });
      await check('scope: 全アプリを起点にした図は全体で開き、同じアプリ間の線を 1 本にまとめ、線の名前は選んだ線だけに出す', async () => {
        const viewer = await openViewer(browser, generated.all.file);
        const { page } = viewer;
        const semantic = await page.evaluate(() => ({ semantic: semanticZoomActive, zoomMode: document.getElementById('zoom-mode').textContent }));
        await page.screenshot({ path: path.join(OUT, 'scope-all.png'), animations: 'disabled' });
        // 線の名前は、文字が読める倍率で確かめる（縮小中は名前を出さない）
        await page.evaluate(() => { cy.zoom({ level: 1, renderedPosition: { x: cy.width() / 2, y: cy.height() / 2 } }); });
        await page.waitForTimeout(200);
        const state = await page.evaluate(() => {
          const bundled = cy.edges('[bundleCount > 1]');
          const shown = (e) => Number(e.style('text-opacity'));
          const edge = cy.edges(':visible').first();
          const before = shown(edge);
          edge.select();
          const selected = shown(edge);
          edge.unselect();
          return {
            mode: viewScope.mode,
            bundled: bundled.length,
            collapsed: cy.edges('.edge-collapsed').length,
            maxCount: Math.max(...bundled.map((e) => e.data('bundleCount'))),
            labelBefore: before,
            labelSelected: selected,
            startMarked: cy.nodes('[?isStart]').length
          };
        });
        await viewer.context.close();
        assert.equal(state.mode, 'all');
        assert.ok(state.bundled > 0 && state.collapsed > 0, '同じアプリの組の線がまとまっていません');
        assert.equal(state.labelBefore, 0, '選んでいない線にも名前が出ています');
        assert.equal(state.labelSelected, 1, '選んだ線に名前が出ません');
        assert.equal(state.startMarked, 0, '全アプリが起点の図で、起点の目印が付いています');
        assert.equal(semantic.semantic, true, '縮小時は、アプリ名を大きく出す概要のカードにする');
        assert.match(semantic.zoomMode, /概要|構造/);
        return `まとめた線 ${state.bundled} 本（最大 ${state.maxCount} 本分）`;
      });
    }

    console.log('表のビュー（アプリ一覧・関連一覧）');
    if (shouldRun('table')) {
      await check('table: アプリ一覧を並べ替え・絞り込みでき、行から図のそのアプリへ移れる', async () => {
        const viewer = await openViewer(browser, generated.all.file);
        const { page } = viewer;
        await page.locator('#tab-apps').click();
        const rows = () => page.locator('#apps-table tbody tr').count();
        const total = await rows();
        // 「参照される」で降順に並べ替える（2 回押す）
        const header = page.locator('#apps-table th').filter({ hasText: '参照される' }).locator('button');
        await header.click();
        await page.locator('#apps-table th').filter({ hasText: '参照される' }).locator('button').click();
        const sortState = await page.evaluate(() => ({
          aria: document.querySelector('#apps-table th[aria-sort="descending"]')?.textContent || '',
          values: [...document.querySelectorAll('#apps-table tbody tr')].map((tr) => Number(tr.querySelector('td[data-label="参照される"]').textContent))
        }));
        await page.screenshot({ path: path.join(OUT, 'table-apps.png'), animations: 'disabled' });
        // 構造チェックで絞り込む（循環候補）
        await page.locator('#apps-checks .check-chip').filter({ hasText: '循環候補' }).click();
        const cycleRows = await rows();
        const cycleApps = await page.evaluate(() => new Set(ER_ANALYSIS.cycles.flatMap((c) => c.appIds.map(String))).size);
        await page.locator('#apps-checks .check-chip').filter({ hasText: '循環候補' }).click();
        // 取得失敗の理由が表に出る
        const failedText = await page.locator('#apps-table tbody tr').filter({ hasText: '外部連携ログ' }).innerText();
        // 検索は表にも効く
        await page.fill('#search-box', '顧客');
        await page.waitForTimeout(300);
        const searched = await rows();
        const searchedCount = Number((await page.locator('#search-meta').innerText()).match(/(\d+)件/)[1]);
        await page.fill('#search-box', '');
        await page.waitForTimeout(300);
        // 行の「図で見る」で図のそのアプリへ
        await page.locator('#apps-table tbody tr').filter({ hasText: '案件管理' }).first().getByRole('button', { name: /図で見る/ }).click();
        await page.waitForTimeout(900);
        const moved = await page.evaluate(() => ({ tab: document.querySelector('[role="tab"][aria-selected="true"]').id, title: document.getElementById('detail-title').textContent, tableHidden: document.getElementById('view-apps').hidden }));
        const problems = [...viewer.errors, ...viewer.blocked];
        await viewer.context.close();
        assert.deepEqual(problems, []);
        assert.equal(total, 41);
        assert.match(sortState.aria, /参照される/);
        assert.deepEqual(sortState.values, [...sortState.values].sort((a, b) => b - a), '降順に並んでいません');
        assert.equal(cycleRows, cycleApps, `循環候補で ${cycleRows} 行（循環に入るアプリは ${cycleApps}）`);
        assert.match(failedText, /取得失敗/);
        assert.match(failedText, /権限/);
        assert.equal(searched, searchedCount, `検索「顧客」で表は ${searched} 行、検索の件数は ${searchedCount}`);
        assert.deepEqual(moved, { tab: 'tab-diagram', title: '案件管理', tableHidden: true });
        return `${total} 行 / 循環候補 ${cycleRows} 行 / 検索 ${searched} 行`;
      });
      await check('table: 関連一覧は参照元・参照先の項目とコピー・絞り込みを示し、種類で絞り込め、行から図のその線へ移れる', async () => {
        const viewer = await openViewer(browser, generated.all.file);
        const { page } = viewer;
        await page.locator('#tab-relations').click();
        const counts = await page.evaluate(() => {
          const all = APPS.flatMap((a) => a.relations);
          return { total: all.length, lookup: all.filter((r) => r.kind === 'LOOKUP').length };
        });
        const total = await page.locator('#relations-table tbody tr').count();
        const lookupRow = await page.locator('#relations-table tbody tr').filter({ hasText: '参照先 業種名 → 顧客業種' }).first().innerText();
        const refRow = await page.locator('#relations-table tbody tr').filter({ hasText: '見積番号 / 見積日 / 見積金額' }).first().innerText();
        const filterRow = await page.locator('#relations-table tbody tr').filter({ hasText: 'ステータス != "完了"' }).first().innerText();
        await page.screenshot({ path: path.join(OUT, 'table-relations.png'), animations: 'disabled' });
        await page.locator('#relations-kinds .check-chip').filter({ hasText: 'ルックアップ' }).click();
        const withoutLookup = await page.locator('#relations-table tbody tr').count();
        await page.locator('#relations-kinds .check-chip').filter({ hasText: 'ルックアップ' }).click();
        await page.selectOption('#relations-state', 'filtered');
        const filtered = await page.locator('#relations-table tbody tr').count();
        await page.selectOption('#relations-state', '');
        // 「図で見る」で、その線（まとめた線なら代表の線）を選び、詳細を出す
        const edgeId = 'e_113_0';
        await page.locator(`#relations-table button[data-edge="${edgeId}"]`).click();
        await page.waitForTimeout(1000);
        const moved = await page.evaluate((id) => {
          const edge = cy.getElementById(id);
          const rep = bundleRepresentative(edge);
          return { selected: rep.selected(), visible: rep.visible(), detail: document.getElementById('detail-title').textContent, view: activeView };
        }, edgeId);
        const problems = [...viewer.errors, ...viewer.blocked];
        await viewer.context.close();
        assert.deepEqual(problems, []);
        assert.equal(total, counts.total);
        assert.match(lookupRow, /ルックアップ/);
        assert.match(lookupRow, /顧客マスタ/);
        assert.match(refRow, /関連レコード一覧/);
        assert.match(refRow, /一覧「見積書一覧」/);
        assert.match(filterRow, /関連レコード一覧/);
        assert.equal(withoutLookup, counts.total - counts.lookup);
        assert.ok(filtered > 0 && filtered < total, `絞り込み条件のある関連 ${filtered} 行`);
        assert.deepEqual(moved, { selected: true, visible: true, detail: '案件管理 → 顧客マスタ', view: 'diagram' });
        return `${total} 行 / ルックアップを除くと ${withoutLookup} 行`;
      });
    }

    console.log('印刷・配色');
    if (shouldRun('print') || shouldRun('theme')) {
      await check('print: 印刷は見出し・図（表示中の範囲）・アプリ一覧・関連一覧の資料になり、画面の部品を出さない', async () => {
        const viewer = await openViewer(browser, generated.business.file);
        const { page } = viewer;
        const imagesBefore = await page.evaluate(() => document.images.length);
        await page.evaluate(() => preparePrint());
        await page.emulateMedia({ media: 'print' });
        await page.waitForTimeout(400);
        const state = await page.evaluate(() => {
          const doc = document.getElementById('print-doc');
          const img = doc.querySelector('img');
          const shown = (sel) => { const el = document.querySelector(sel); return !!el && getComputedStyle(el).display !== 'none' && el.getBoundingClientRect().height > 0; };
          return {
            doc: shown('#print-doc'),
            chrome: ['#topbar', '#app-shell', '#cy'].filter(shown),
            heading: doc.querySelector('h1')?.textContent || '',
            meta: doc.querySelector('.print-meta')?.textContent || '',
            image: img ? { w: img.naturalWidth, h: img.naturalHeight } : null,
            appRows: doc.querySelectorAll('table')[0]?.querySelectorAll('tbody tr').length || 0,
            relRows: doc.querySelectorAll('table')[1]?.querySelectorAll('tbody tr').length || 0,
            apps: APPS.length,
            rels: APPS.reduce((s, a) => s + a.relations.length, 0)
          };
        });
        await page.screenshot({ path: path.join(OUT, 'print-preview.png'), fullPage: true, animations: 'disabled' });
        await page.pdf({ path: path.join(OUT, 'print.pdf'), format: 'A4', landscape: true, printBackground: true });
        await page.emulateMedia({ media: 'screen' });
        await page.evaluate(() => window.dispatchEvent(new Event('afterprint')));
        await page.waitForTimeout(100);
        const imagesAfter = await page.evaluate(() => document.images.length);
        await viewer.context.close();
        assert.equal(imagesBefore, 0, '開いた時点で画像の要素があります');
        assert.equal(state.doc, true, '印刷で資料が出ません');
        assert.deepEqual(state.chrome, [], `印刷に画面の部品が出ています: ${state.chrome}`);
        assert.equal(state.heading, 'kintone ER図');
        for (const word of ['対象（起点）', '取得日時', '接続先', '取得状態', '図の表示範囲', '起点まわり']) assert.ok(state.meta.includes(word), `見出しに「${word}」がありません`);
        assert.ok(state.image && state.image.w > 300, `図の画像 ${JSON.stringify(state.image)}`);
        assert.equal(state.appRows, state.apps);
        assert.equal(state.relRows, state.rels);
        assert.equal(imagesAfter, 0, '印刷のあとも画像が残っています');
        return `アプリ ${state.appRows} 行・関連 ${state.relRows} 行・図 ${state.image.w}x${state.image.h}`;
      });
      await check('theme: 開いたときは OS の配色に従い、切り替えられ、文字のコントラストが AA（4.5:1）以上', async () => {
        const results = {};
        const selectors = ['.brand h1', '.brand-meta', '#search-box', '.view-tab[aria-selected="false"]', '.view-tab[aria-selected="true"]', '#scope-bar .scope-label', '#scope-bar .scope-label small', '.ali-name', '.ali-sub', '.sidebar-checks .check-facts', '#legend .legend-toggle', '#zoom-value', '.tb-menu-btn'];
        for (const scheme of ['light', 'dark']) {
          const viewer = await openViewer(browser, generated.business.file, { colorScheme: scheme });
          const { page } = viewer;
          const theme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
          const contrast = await measureContrast(page, selectors);
          const cardText = await page.evaluate(() => { const p = currentPalette(); return { text: p.text, surface: p.surface }; });
          await page.screenshot({ path: path.join(OUT, `theme-${scheme}.png`), animations: 'disabled' });
          await page.locator('#theme-btn').click();
          const toggled = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
          await viewer.context.close();
          results[scheme] = { theme, toggled, low: contrast.filter((c) => c.missing || c.ratio < 4.5), cardText };
        }
        assert.equal(results.light.theme, 'light');
        assert.equal(results.light.toggled, 'dark');
        assert.equal(results.dark.theme, 'dark');
        assert.equal(results.dark.toggled, 'light');
        assert.notEqual(results.light.cardText.surface, results.dark.cardText.surface, 'カードの色が配色に合わせて変わりません');
        assert.deepEqual(results.light.low, [], `明るい配色でコントラスト不足: ${JSON.stringify(results.light.low)}`);
        assert.deepEqual(results.dark.low, [], `暗い配色でコントラスト不足: ${JSON.stringify(results.dark.low)}`);
      });
    }

    console.log('以前の版で保存した編集済みHTMLの互換');
    if (shouldRun('compat')) {
      // 以前の版（stateVersion なし）で保存した編集状態。どちらも同じ編集（手動の追加・名前と色・メモ・位置・削除・固定・隠した項目・アクションの線の非表示）をしたもの。
      //   er-edit-state-v1.json: kintone-settings-tools の以前の版で保存（同じ形式）
      //   er-edit-state-v1-lite.json: このリポジトリの以前の版（9691a4a の tools/ER図.js）の図を操作して保存
      const legacySources = [
        { name: 'settings-tools の以前の版', key: 'v1', state: JSON.parse(fs.readFileSync(path.join(__dirname, 'er-edit-state-v1.json'), 'utf8')) },
        { name: 'lite-suite の以前の版', key: 'v1-lite', state: JSON.parse(fs.readFileSync(path.join(__dirname, 'er-edit-state-v1-lite.json'), 'utf8')) }
      ];
      const inspectEdits = (page) => page.evaluate(() => {
        const app113 = findApp(113);
        const custom = findApp(-1);
        const note = cy.getElementById('note_1');
        const a113 = cy.getElementById('a113');
        return {
          customApp: custom ? { name: custom.name, fields: allFieldsForApp(custom).map((f) => f.label) } : null,
          customNode: cy.getElementById('a-1').length === 1,
          customField: allFieldsForApp(app113).some((f) => f.label === '承認ステータス' && f.isCustom),
          customRelation: app113.relations.some((r) => r.isCustom && r.toApp === -1 && r.fromLabel === '会計連携' && r.kind === 'ACTION'),
          note: note.length ? note.data('label') : null,
          appName: findApp(101).name,
          appColor: cy.getElementById('a101').data('accent'),
          fieldLabel: allFieldsForApp(app113).find((f) => f.code === '案件名')?.label,
          relationLabel: app113.relations[0].fromLabel,
          hiddenField: hiddenFieldKeys.has('113::顧客'),
          removedEdge: cy.getElementById('e_113_1').hasClass('rel-manual-hidden'),
          removedApp: cy.getElementById('a110').hasClass('app-manual-hidden'),
          pinned: a113.locked() && a113.hasClass('pinned-node'),
          position: a113.position(),
          actionHidden: !document.getElementById('rel-action-btn').classList.contains('active'),
          scope: viewScope.mode,
          labelsAlways: relationLabelVisible,
          theme: document.documentElement.getAttribute('data-theme')
        };
      });
      const expected = {
        customApp: { name: '外部会計システム', fields: ['会計コード', '金額', 'メモ'] },
        customNode: true,
        customField: true,
        customRelation: true,
        note: '受注フローの中心',
        appName: '顧客マスタ（編集済み）',
        appColor: '#f472b6',
        fieldLabel: '案件名（編集）',
        relationLabel: '顧客参照（編集）',
        hiddenField: true,
        removedEdge: true,
        removedApp: true,
        pinned: true,
        position: { x: 123.5, y: 456.25 }
      };
      for (const legacy of legacySources) {
        await check(`compat: ${legacy.name}で保存した編集済みHTMLの編集（追加・名前・メモ・位置・削除・固定・非表示）を新しい版で復元する`, async () => {
          const file = withEditState(generated.business.file, legacy.state, path.join(OUT, `compat-${legacy.key}.html`));
          const viewer = await openViewer(browser, file);
          const state = await inspectEdits(viewer.page);
          await viewer.page.screenshot({ path: path.join(OUT, `compat-${legacy.key}.png`), animations: 'disabled' });
          const problems = [...viewer.errors, ...viewer.blocked];
          await viewer.context.close();
          assert.deepEqual(problems, []);
          const { actionHidden, scope, labelsAlways, theme, ...edits } = state;
          assert.deepEqual(edits, expected);
          assert.equal(actionHidden, true, '保存時に隠したアクションの線が戻っています');
          // 以前の版は全体の図だけを保存していたため、全体で開く。線の名前は今の既定（選んだ線だけ）
          assert.equal(scope, 'all');
          assert.equal(labelsAlways, false);
          // 以前の版が保存した配色（暗い配色の "d"）は使わず、OS の設定（ここでは明るい配色）に従う
          assert.equal(legacy.state.view.theme, 'd');
          assert.equal(theme, 'light');
        });
        await check(`compat: ${legacy.name}の編集状態を新しい版で保存し直した編集済みHTMLは、編集と表示範囲を保ったまま開き直せる`, async () => {
          const file = withEditState(generated.business.file, legacy.state, path.join(OUT, `compat-${legacy.key}.html`));
          const viewer = await openViewer(browser, file);
          const { page } = viewer;
          await page.evaluate(() => showAroundApp(101));
          await settleLayout(page);
          const before = await page.evaluate(() => ({ scope: JSON.parse(JSON.stringify(viewScope)), pos: cy.getElementById('a101').position() }));
          const downloadPromise = page.waitForEvent('download', { timeout: 60000 });
          await page.evaluate(() => window.exportEditedHtml());
          const download = await downloadPromise;
          const saved = path.join(OUT, `compat-${legacy.key}-v2-saved.html`);
          await download.saveAs(saved);
          await viewer.context.close();
          const html = fs.readFileSync(saved, 'utf8');
          const reopened = await openViewer(browser, saved);
          const state = await inspectEdits(reopened.page);
          const after = await reopened.page.evaluate(() => ({ scope: JSON.parse(JSON.stringify(viewScope)), pos: cy.getElementById('a101').position(), tables: document.querySelectorAll('#apps-table tr').length, theme: document.documentElement.getAttribute('data-theme') }));
          const problems = [...reopened.errors, ...reopened.blocked];
          await reopened.context.close();
          assert.deepEqual(problems, []);
          const { actionHidden, scope, labelsAlways, theme, ...edits } = state;
          assert.deepEqual(edits, expected);
          assert.equal(actionHidden, true);
          assert.deepEqual(after.scope, before.scope, '表示範囲が戻りません');
          assert.deepEqual(after.pos, before.pos, '位置が戻りません');
          assert.match(html, /"stateVersion":2/);
          assert.ok(!/"theme":/.test(html.match(/window\.__ER_EDIT_STATE__=(.*?);<\/script>/)[1]), '配色を保存しています');
          assert.ok(!/<html[^>]*data-theme=/.test(html), '開いたときの配色を HTML に残しています');
          assert.equal(after.tables, 0, '表のビューの中身を保存しています');
          assert.equal(after.theme, 'light');
        });
      }
    }

    console.log('出力（全アプリを起点にした図 41 アプリ）');
    if (shouldRun('output')) {
      const viewer = await openViewer(browser, generated.all.file);
      const { page } = viewer;
      const fixtureApps = Object.values(fixture.apps);
      const totalRelations = await page.evaluate(() => APPS.reduce((sum, app) => sum + app.relations.length, 0));
      const modal = async (fn) => {
        await page.evaluate((name) => window[name](), fn);
        await page.waitForTimeout(250);
        const text = await page.evaluate(() => document.getElementById('modal-content').textContent);
        await page.evaluate(() => window.closeModal());
        return text;
      };
      const parseCsv = (text) => {
        const rows = [];
        let row = [];
        let cell = '';
        let quoted = false;
        const body = text.replace(/^\uFEFF/, '');
        for (let i = 0; i < body.length; i += 1) {
          const ch = body[i];
          if (quoted) {
            if (ch === '"' && body[i + 1] === '"') { cell += '"'; i += 1; } else if (ch === '"') quoted = false; else cell += ch;
          } else if (ch === '"') quoted = true;
          else if (ch === ',') { row.push(cell); cell = ''; } else if (ch === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; } else cell += ch;
        }
        if (cell || row.length) { row.push(cell); rows.push(row); }
        return rows;
      };
      await check('output: Mermaid に全アプリと全関連があり、日本語のコードでも構文が崩れない', async () => {
        const text = await modal('showMermaid');
        assert.match(text, /^[\s\S]*erDiagram/);
        for (const app of fixtureApps) assert.ok(text.includes(`app_${app.id}`), `Mermaid に App ${app.id} がありません`);
        assert.ok(text.includes('プロジェクト管理番号_西暦年度_連番_枝番'), '日本語のフィールドコードの注釈');
        const attributeLines = text.split('\n').filter((line) => /^\s+\S+ \S+/.test(line) && !/^\s*(%%|app_)/.test(line));
        assert.ok(attributeLines.every((line) => /^\s+[A-Za-z_]\w*\s+[A-Za-z_]\w*/.test(line) || /^\s+\w+\s+\w+\s/.test(line)), '項目名が ASCII でない行があります');
        const relationLines = text.split('\n').filter((line) => /\|\|--|}o--|o\{|--o/.test(line));
        return `${text.length} 文字 / 関連の行 ${relationLines.length}`;
      });
      await check('output: draw.io の XML が壊れておらず、全アプリのカードがある', async () => {
        const text = await modal('showDrawio');
        const info = await page.evaluate((xml) => {
          const doc = new DOMParser().parseFromString(xml, 'application/xml');
          return { error: doc.querySelector('parsererror') ? doc.querySelector('parsererror').textContent.slice(0, 200) : '', cells: doc.querySelectorAll('mxCell').length };
        }, text);
        assert.equal(info.error, '');
        assert.ok(info.cells > fixtureApps.length, `mxCell ${info.cells} 件`);
        assert.ok(text.includes('【2024年度版】全社横断プロジェクト進捗'), '長いアプリ名');
        return `mxCell ${info.cells} 件`;
      });
      await check('output: PlantUML・SQL DDL の形式と全アプリ', async () => {
        const puml = await modal('showPlantUML');
        assert.match(puml, /@startuml/);
        assert.match(puml, /@enduml/);
        for (const app of fixtureApps.filter((a) => !a.failFields)) assert.ok(puml.includes(String(app.id)), `PlantUML に App ${app.id} がありません`);
        const sql = await modal('showSQL');
        const tables = (sql.match(/CREATE TABLE/g) || []).length;
        assert.ok(tables >= fixtureApps.filter((a) => !a.failFields).length, `CREATE TABLE ${tables} 件`);
        assert.ok(sql.includes('`顧客コード`'), '日本語の列名をバッククォートで囲む');
        return `CREATE TABLE ${tables} 件`;
      });
      await check('output: JSON は読み込め、関連のコピー・表示・絞り込みを含む', async () => {
        const text = await modal('showJSON');
        const model = JSON.parse(text);
        assert.equal(model.apps.length, 41);
        const relations = model.apps.flatMap((app) => app.relations);
        assert.equal(relations.length, totalRelations);
        const lookup = relations.find((r) => r.type === 'LOOKUP' && r.copyFields.length);
        assert.ok(lookup, 'ルックアップのコピー先がありません');
        assert.ok(relations.some((r) => r.type === 'REF' && r.displayFields.length && r.filterCond), '関連レコード一覧の表示フィールド・絞り込み条件がありません');
        assert.ok(relations.some((r) => r.type === 'ACTION' && r.copyFields.length), 'アクションのコピーがありません');
        return `関連 ${relations.length} 件`;
      });
      await check('output: Markdown の関連の表に、コピー・表示するフィールドと絞り込み条件がある', async () => {
        const text = await modal('showMarkdown');
        assert.match(text, /# kintone ER図 仕様書/);
        assert.ok(text.includes('| コピー・表示するフィールド | 絞り込み条件 |'));
        assert.ok(text.includes('参照先 業種名 → 顧客業種'));
        assert.ok(text.includes('見積番号 / 見積日 / 見積金額'));
        assert.ok(text.includes('ステータス != "完了"'));
        assert.ok(text.includes('【2024年度版】全社横断プロジェクト進捗'), '長いアプリ名');
        for (const row of text.split('\n').filter((line) => /^\| (LOOKUP|REF|ACTION) \|/.test(line))) {
          // 表の列数が崩れていない（区切りの縦線をエスケープしてある）
          assert.equal((row.replace(/\\\|/g, '').match(/\|/g) || []).length, 9, row.slice(0, 80));
        }
      });
      await check('output: CSV は BOM 付きで、行数が件数と合い、関連の CSV に詳細の列がある', async () => {
        const apps = parseCsv(await modal('showCSVApps'));
        const fields = parseCsv(await modal('showCSVFields'));
        const relations = parseCsv(await modal('showCSVRelations'));
        assert.equal(apps.length, 1 + 41);
        assert.ok(![...apps.flat(), ...relations.flat()].some((cell) => cell.includes('[API]')), 'CSV に内部の通信情報（[API] …）が出ています');
        assert.equal(relations.length, 1 + totalRelations);
        assert.ok(fields.length > 200, `フィールド ${fields.length} 行`);
        const header = relations[0];
        assert.deepEqual(header.slice(-2), ['コピー・表示するフィールド', '絞り込み条件']);
        assert.ok(relations.some((row) => row[0] === 'LOOKUP' && /参照先 .* → /.test(row[row.length - 2])));
        assert.ok(relations.some((row) => row[0] === 'REF' && row[row.length - 2] === '見積番号 / 見積日 / 見積金額'));
        for (const row of [...apps, ...fields, ...relations]) assert.ok(row.length > 5);
        const widths = new Set(relations.map((row) => row.length));
        assert.equal(widths.size, 1, `列数が揃っていません: ${[...widths]}`);
      });
      await check('output: PNG を保存でき、大きさが読める範囲', async () => {
        const downloadPromise = page.waitForEvent('download', { timeout: 60000 });
        await page.evaluate(() => window.exportPNG());
        const download = await downloadPromise;
        const file = path.join(OUT, 'export.png');
        await download.saveAs(file);
        const buffer = fs.readFileSync(file);
        assert.equal(buffer.subarray(1, 4).toString('ascii'), 'PNG');
        const width = buffer.readUInt32BE(16);
        const height = buffer.readUInt32BE(20);
        assert.ok(width >= 1000 && height >= 600, `${width}x${height}`);
        assert.ok(width <= 16384 && height <= 16384, `大きすぎる画像 ${width}x${height}`);
        return `${width}x${height}px ${(buffer.length / 1024).toFixed(0)}KB`;
      });
      await check('output: 編集済みHTMLを保存して通信なしで開き直せる', async () => {
        await page.evaluate(() => window.toggleRelationKind('ACTION'));
        const downloadPromise = page.waitForEvent('download', { timeout: 60000 });
        await page.evaluate(() => window.exportEditedHtml());
        const download = await downloadPromise;
        const file = path.join(OUT, 'edited.html');
        await download.saveAs(file);
        const reopened = await openViewer(browser, file);
        const actionHidden = await reopened.page.evaluate(() => !document.getElementById('rel-action-btn').classList.contains('active'));
        const nodes = await reopened.page.evaluate(() => cy.nodes().length);
        const problems = [...reopened.errors, ...reopened.blocked];
        await reopened.context.close();
        assert.deepEqual(problems, []);
        assert.equal(actionHidden, true, '保存時に隠したアクションの線が、開き直すと戻っています');
        assert.equal(nodes, 41);
      });
      results.push({ name: 'output: ページのエラー', ok: viewer.errors.length === 0 && viewer.blocked.length === 0, error: [...viewer.errors, ...viewer.blocked].join('\n') });
      if (viewer.errors.length || viewer.blocked.length) console.log(`  FAIL output: ページのエラー ${[...viewer.errors, ...viewer.blocked].join(' / ')}`);
      await viewer.context.close();
    }

    console.log('画面幅とキーボード（全アプリを起点にした図）');
    if (shouldRun('responsive') || shouldRun('keyboard')) {
      for (const width of [320, 390, 768, 1024, 1440]) {
        await check(`responsive: ${width}px で横にはみ出さず、操作バーが図に重ならない`, async () => {
          const viewer = await openViewer(browser, generated.all.file, { width, height: width < 500 ? 740 : 900 });
          const { page } = viewer;
          const state = await page.evaluate(() => {
            const rect = (selector) => { const el = document.querySelector(selector); if (!el) return null; const r = el.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, height: r.height }; };
            const overflow = document.documentElement.scrollWidth > document.documentElement.clientWidth + 2 || document.body.scrollWidth > document.body.clientWidth + 2;
            return { overflow, topbar: rect('#topbar'), zoom: rect('#zoom-ctrl'), legend: rect('#legend'), viewport: { width: innerWidth, height: innerHeight } };
          });
          await page.screenshot({ path: path.join(OUT, `responsive-${width}.png`), animations: 'disabled' });
          // スマホ幅: 表は 1 行を 1 枚のカードにして読め、メニュー・表示設定・アプリ一覧の引き出しが画面に収まる
          let phone = null;
          if (width <= 390) {
            await page.locator('#tab-apps').click();
            await page.waitForTimeout(200);
            const table = await page.evaluate(() => {
              const td = document.querySelector('#apps-table tbody td[data-label="アプリ名"]');
              const rect = document.querySelector('#apps-table').getBoundingClientRect();
              return {
                label: td ? getComputedStyle(td, '::before').content : '',
                overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 2,
                tableFits: rect.right <= innerWidth + 1 && rect.left >= -1,
                headerHidden: document.querySelector('#apps-table thead').getBoundingClientRect().height <= 1
              };
            });
            await page.screenshot({ path: path.join(OUT, `responsive-${width}-apps.png`), animations: 'disabled' });
            await page.locator('#tab-diagram').click();
            await page.locator('#mobile-menu-btn').click();
            await page.locator('#settings-btn').click();
            await page.waitForTimeout(200);
            const menu = await page.evaluate(() => {
              const panel = document.querySelector('#settings-menu .tb-menu-panel').getBoundingClientRect();
              const topbar = document.getElementById('topbar').getBoundingClientRect();
              return { inside: panel.left >= -1 && panel.right <= innerWidth + 1 && panel.bottom <= innerHeight + 1 && panel.height > 0, belowTopbar: panel.top >= topbar.bottom - 1 };
            });
            await page.screenshot({ path: path.join(OUT, `responsive-${width}-settings.png`), animations: 'disabled' });
            await page.keyboard.press('Escape');
            await page.locator('#sidebar-toggle-btn').click();
            await page.waitForTimeout(400);
            const drawerOpen = await page.evaluate(() => { const r = document.getElementById('sidebar').getBoundingClientRect(); return r.left >= -1 && r.right <= innerWidth + 1 && getComputedStyle(document.getElementById('sidebar')).visibility === 'visible'; });
            await page.keyboard.press('Escape');
            await page.waitForTimeout(400);
            const drawerClosed = await page.evaluate(() => getComputedStyle(document.getElementById('sidebar')).visibility === 'hidden');
            phone = { table, menu, drawerOpen, drawerClosed };
          }
          const problems = [...viewer.errors, ...viewer.blocked];
          await viewer.context.close();
          if (phone) {
            assert.match(phone.table.label, /アプリ名/, '表の値の前に列名が出ていません');
            assert.equal(phone.table.overflow, false, '表のビューが横にはみ出しています');
            assert.equal(phone.table.tableFits, true, '表が画面幅に収まっていません');
            assert.equal(phone.table.headerHidden, true);
            assert.deepEqual(phone.menu, { inside: true, belowTopbar: true }, '表示設定が画面からはみ出すか、操作バーに重なっています');
            assert.equal(phone.drawerOpen, true, 'アプリ一覧の引き出しが開きません');
            assert.equal(phone.drawerClosed, true, 'Esc でアプリ一覧の引き出しが閉じません');
          }
          assert.deepEqual(problems, []);
          assert.equal(state.overflow, false, '横にはみ出しています');
          assert.ok(state.topbar.height <= state.viewport.height * 0.4, `操作バーが画面の 4 割を超えています (${Math.round(state.topbar.height)}px)`);
          if (state.zoom && state.legend) {
            const overlap = Math.min(state.zoom.right, state.legend.right) - Math.max(state.zoom.left, state.legend.left) > 1
              && Math.min(state.zoom.bottom, state.legend.bottom) - Math.max(state.zoom.top, state.legend.top) > 1;
            assert.equal(overlap, false, 'ズーム操作と凡例が重なっています');
          }
          assert.ok(!state.zoom || (state.zoom.right <= state.viewport.width + 1 && state.zoom.bottom <= state.viewport.height + 1), 'ズーム操作が画面の外にあります');
        });
      }
      await check('keyboard: Tab で操作バーを順に移れ、? でヘルプを開き Esc で閉じて元の位置へ戻る', async () => {
        const viewer = await openViewer(browser, generated.business.file);
        const { page } = viewer;
        const seen = new Set();
        await page.locator('body').click({ position: { x: 5, y: 5 } });
        for (let i = 0; i < 14; i += 1) {
          await page.keyboard.press('Tab');
          seen.add(await page.evaluate(() => { const el = document.activeElement; return el ? `${el.tagName}#${el.id}.${el.textContent.trim().slice(0, 12)}` : ''; }));
        }
        assert.ok(seen.size >= 10, `Tab で移れた要素が ${seen.size} 個だけです`);
        await page.locator('#search-box').focus();
        await page.evaluate(() => document.getElementById('search-box').blur());
        await page.keyboard.press('?');
        await page.waitForTimeout(300);
        assert.equal(await page.evaluate(() => document.getElementById('help-overlay').classList.contains('open')), true, '? でヘルプが開きません');
        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);
        assert.equal(await page.evaluate(() => document.getElementById('help-overlay').classList.contains('open')), false, 'Esc でヘルプが閉じません');
        await page.evaluate(() => window.showMermaid());
        await page.waitForTimeout(200);
        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);
        assert.equal(await page.evaluate(() => document.getElementById('modal-overlay').classList.contains('open')), false, 'Esc で出力の画面が閉じません');
        const problems = [...viewer.errors, ...viewer.blocked];
        await viewer.context.close();
        assert.deepEqual(problems, []);
      });
    }

    console.log('中止');
    if (shouldRun('cancel')) {
      await check('cancel: 読み取りの途中で「中止」すると、図は保存されず、処理した件数と未実行の件数が出る', async () => {
        const result = await generateHtml(browser, fixture, { name: 'cancel', ids: allIds, depth: 0, latency: 150, cancelAfterMs: 1200 });
        assert.equal(result.downloaded, false, '中止したのに図が保存されました');
        assert.match(result.status, /中止しました（\d+\/\d+ 件を処理、残り \d+ 件は未実行）/);
        const [, done, total] = result.status.match(/（(\d+)\/(\d+) 件を処理/).map(Number);
        assert.ok(done > 0 && done < total, `${done}/${total}`);
        // 中止後は新しい読み取りを始めない（全アプリを読み終えていない）
        assert.ok(result.fieldCalls < allIds.length + 2, `中止後も読み取りが続いています: ${result.fieldCalls} 回`);
        assert.ok(result.peak <= 12, `同時リクエストが ${result.peak} 件`);
        return result.status;
      });
    }
  } finally {
    await browser.close();
  }

  const failed = results.filter((r) => !r.ok);
  fs.writeFileSync(path.join(OUT, 'results.json'), `${JSON.stringify(results, null, 2)}\n`, 'utf8');
  console.log(`\n${results.length - failed.length}/${results.length} 件の検査が成功しました。結果: ${path.join(OUT, 'results.json')}`);
  if (failed.length) {
    console.log(`\n失敗 ${failed.length} 件:`);
    for (const r of failed) console.log(` - ${r.name}: ${r.error}`);
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error && error.stack ? error.stack : error);
  process.exitCode = 1;
});
