#!/usr/bin/env node
'use strict';

// ER図（tools/ER図.js）の通し検証。配布物をそのままページに読み込み、業務システムに近い 39 アプリの合成 kintone
// （er-explore-fixture.cjs）につないで、利用者と同じ操作で確かめる。実際の kintone には通信しない。
//
//   - 生成: パネルの「ER図をHTMLで保存」で 3 つの図（案件管理から辿る・全アプリを起点・深さ 1）を作る。所要時間と状態表示を記録。
//   - 生成した HTML は、file:// 以外の通信をすべて遮断したブラウザで開く（描画ライブラリは同梱済み）。
//   - 全レイアウト（Dagre・ツリー・フォース・同心円・グリッド・円形）× 全表示密度で、アプリのカードが重ならないこと
//     （縮小表示と詳細表示の両方。フォースは配置し直すたびに結果が変わるため 5 回）、画面からはみ出さないこと、スクリーンショット。
//     配置が終わる（runLayout の Promise の解決とカードの動きの停止）のを待ってから測る。--cpu-throttle で混んだ PC を再現できる。
//   - 検索・強調・シンプル表示・詳細パネル・関連の詳細（コピーするフィールド・表示フィールド・絞り込み条件）。
//   - 表示範囲（起点まわりで開く・全体／深さ 2／アプリのまわりへの切り替え）、同じアプリ間の線のまとめと線の名前。
//   - 表のビュー（アプリ一覧・関連一覧）、印刷の資料、配色（OS の設定・切り替え・コントラスト）。
//   - 以前の版で保存した編集状態（er-edit-state-v1.json・このリポジトリの以前の版で保存した er-edit-state-v1-lite.json）を
//     新しい版の図で開き直したときの復元と、保存し直し。
//   - 設定取得の ZIP（合成 kintone の設定から作る）を読み込んで、kintone に問い合わせずに図を作る。
//   - 「編集 → 編集済みHTMLから取り込む」: 以前の版・今の版の編集済みHTMLの編集を、新しく作った図へ取り込む（図に無いアプリは対象外、
//     関連の並びが違う図でも対応させる、ファイルのスクリプトは実行しない、元に戻す）。
//   - 出力（PNG・Mermaid・draw.io・PlantUML・SQL DDL・JSON・Markdown・CSV 3 種）の中身。
//   - 320〜1440px のはみ出し（スマホ幅の表・メニュー・引き出し）、キーボード操作。
//   - CSP: script-src が埋め込んだスクリプトのハッシュだけであること。すべてのメニュー・ボタン・ダイアログ・表・キーボード操作をして
//     securitypolicyviolation が 0 件で、イベント属性が DOM に現れないこと。保存した編集済みHTML・共有 URL で開いても同じ。
//     差し込んだイベント属性・javascript の URL・script は動かないこと。どの検査でも、CSP の違反はページのエラーとして数える。
//
// 画面と出力は .iter-shots/er-explore/ に保存する。失敗した検査は最後に一覧し、1 件でもあれば失敗にする。
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
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
  --cpu-throttle <n>   図のページの CPU を n 分の 1 の速さにします（混んだ PC の再現。例: --only layout --cpu-throttle 4）
  --help               このヘルプを表示

日本語のダウンロード名を扱うため、ロケールが C/POSIX の環境では LANG=C.UTF-8 LC_ALL=C.UTF-8 を付けて実行してください。
結果と画面: .iter-shots/er-explore/`);
  process.exit(0);
}

const results = [];
const only = argValue('--only');
const cpuThrottle = Math.max(1, Number(argValue('--cpu-throttle', '1')) || 1);
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
// CSP の違反（ハッシュで許可していないスクリプト・イベント属性・javascript の URL など）を securitypolicyviolation で記録する。
// 違反は console.error にも出し、collectErrors がページのエラーとして数える（どの検査でも違反 0 件であること）。
// あわせて、イベント属性（on…）や javascript の URL を持つ要素が DOM に一度でも現れたかと、押した data-action などの操作の名前を記録する。
function recordCspViolations() {
  const violations = [];
  const inlineAttributes = [];
  const exercised = { click: new Set(), change: new Set(), input: new Set(), keydown: new Set() };
  window.__ER_CSP__ = { violations, inlineAttributes, exercised };
  document.addEventListener('securitypolicyviolation', (event) => {
    const item = { directive: event.effectiveDirective || event.violatedDirective, blocked: event.blockedURI, sample: event.sample, line: event.lineNumber };
    violations.push(item);
    console.error(`[CSP] ${item.directive} ${item.blocked} ${item.sample || ''}`);
  }, true);
  const inspect = (el) => {
    if (!el || el.nodeType !== 1) return;
    for (const attr of Array.from(el.attributes)) {
      if (/^on/i.test(attr.name) || /^\s*javascript:/i.test(attr.value)) inlineAttributes.push(`${el.tagName.toLowerCase()} ${attr.name}`);
    }
  };
  new MutationObserver((records) => {
    for (const record of records) {
      if (record.type === 'attributes') inspect(record.target);
      record.addedNodes.forEach((node) => { if (node.nodeType === 1) { inspect(node); node.querySelectorAll('*').forEach(inspect); } });
    }
  }).observe(document, { subtree: true, childList: true, attributes: true });
  // ビューアーの受け口（document の捕捉の段階）より先に登録されるので、押した操作の名前を先に記録できる
  for (const [type, attribute] of [['click', 'data-action'], ['change', 'data-change'], ['input', 'data-input'], ['keydown', 'data-keydown']]) {
    document.addEventListener(type, (event) => {
      const el = event.target && typeof event.target.closest === 'function' ? event.target.closest(`[${attribute}]`) : null;
      if (el) exercised[type].add(el.getAttribute(attribute));
    }, true);
  }
}
const cspState = (page) => page.evaluate(() => ({
  violations: window.__ER_CSP__.violations.slice(),
  inlineAttributes: window.__ER_CSP__.inlineAttributes.slice(),
  exercised: Object.fromEntries(Object.entries(window.__ER_CSP__.exercised).map(([k, v]) => [k, [...v]]))
}));

async function openViewer(browser, file, { width = 1440, height = 900, hash = '', colorScheme = 'light' } = {}) {
  const context = await browser.newContext({ viewport: { width, height }, acceptDownloads: true, colorScheme });
  const page = await context.newPage();
  const errors = [];
  const blocked = [];
  await page.addInitScript(recordCspViolations);
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
  if (cpuThrottle > 1) {
    const cdp = await context.newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpuThrottle });
  }
  await trackLayouts(page);
  return { context, page, errors, blocked };
}

// 配置（runLayout）が終わったかを、図のページで数える（settleLayout が使う）。runLayout は配置を終えて全体表示に合わせ直したら
// 解決する Promise を返す。図の本体は通常の script なので、window.runLayout を差し替えると図の中からの呼び出しも数えられる
async function trackLayouts(page) {
  await page.evaluate(() => {
    if (typeof window.runLayout !== 'function' || window.__erLayoutSettled) return;
    const run = window.runLayout;
    let running = 0;
    window.runLayout = function trackedRunLayout(...args) {
      running += 1;
      return Promise.resolve(run.apply(this, args)).finally(() => { running -= 1; });
    };
    window.__erLayoutSettled = () => running === 0 && !cy.animated() && !cy.nodes().some((node) => node.animated());
  });
}

// 生成した HTML に、編集済みHTMLと同じ形で編集状態を差し込んだ複製を作る。
// 以前の版で保存した編集状態（er-edit-state-v1.json）を、新しい版の図で開き直すときに使う。
// 今の版は実行しない JSON（type="application/json"）として置く。legacy: true は以前の版の置き方（window.__ER_EDIT_STATE__ への代入の
// スクリプト）で、「編集済みHTMLから取り込む」の読み込み元にだけ使う（今の版の CSP では、この置き方のスクリプトは動かない）。
function withEditState(htmlFile, state, outFile, { legacy = false } = {}) {
  const html = fs.readFileSync(htmlFile, 'utf8');
  const json = JSON.stringify(state).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');
  const marker = '<script id="er-main" type="text/plain">';
  assert.ok(html.includes(marker), '図の本体スクリプトが見つかりません');
  const block = legacy
    ? `<script id="er-edit-state">window.__ER_EDIT_STATE__=${json};</script>`
    : `<script id="er-edit-state" type="application/json">${json}</script>`;
  fs.writeFileSync(outFile, html.replace(marker, () => `${block}${marker}`), 'utf8');
  return outFile;
}
/** 保存した編集済みHTMLの編集状態（実行しない JSON）。 */
const savedEditStateJson = (html) => {
  const match = html.match(/<script id="er-edit-state" type="application\/json">([\s\S]*?)<\/script>/);
  assert.ok(match, '編集の状態が実行しない JSON として保存されていません');
  return match[1];
};

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
  // レイアウトの動き（0.55 秒）と全体表示の合わせ直し（0.45 秒）が終わるまで待つ。
  // 「自動（cose）」は 20 回の計算ごとに描き直しながら動くため、PC が混んでいると 1.6 秒では終わらない。終わる前に測ると、
  // 押し広げる前の重なりを数えてしまう。そのため、配置が終わり（runLayout の Promise の解決）、カードの動きが止まるまで待つ
  await page.waitForTimeout(1600);
  await page.waitForFunction(() => typeof window.__erLayoutSettled !== 'function' || window.__erLayoutSettled(), null, { polling: 100, timeout: 60000 });
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
          // 「自動（cose）」は今の位置から計算するため、配置し直すたびに結果が変わる。5 回配置し直して、毎回重ならないことを確かめる
          const runs = layout === 'cose' ? 5 : 1;
          await check(`layout: ${layout} / 密度 ${density} でカードが重ならない${runs > 1 ? `（${runs} 回配置し直す）` : ''}`, async () => {
            const found = [];
            let zoom = 0;
            for (let run = 1; run <= runs; run += 1) {
              await page.evaluate((name) => window.setLayout(name), layout);
              await settleLayout(page);
              const overview = await measureOverlaps(page);
              await page.evaluate(() => { cy.zoom({ level: 1, renderedPosition: { x: cy.width() / 2, y: cy.height() / 2 } }); });
              await page.waitForTimeout(300);
              const detail = await measureOverlaps(page);
              await page.evaluate(() => window.fit());
              await page.waitForTimeout(300);
              if (run === 1 && density === 'standard') await page.screenshot({ path: path.join(OUT, `layout-${layout}.png`), animations: 'disabled' });
              if (overview.overlaps || detail.overlaps) found.push({ run, overview: overview.overlaps, detail: detail.overlaps, sample: [overview.sample, detail.sample] });
              zoom = overview.zoom;
            }
            assert.deepEqual(found, [], `重なり ${JSON.stringify(found)}`);
            return `縮小 ${zoom}%`;
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
          assert.ok(!/"theme":/.test(savedEditStateJson(html)), '配色を保存しています');
          assert.ok(!html.includes('window.__ER_EDIT_STATE__='), '編集の状態を実行するスクリプトとして保存しています');
          assert.ok(!/<html[^>]*data-theme=/.test(html), '開いたときの配色を HTML に残しています');
          assert.equal(after.tables, 0, '表のビューの中身を保存しています');
          assert.equal(after.theme, 'light');
        });
      }
    }

    console.log('編集済みHTMLから編集を取り込む');
    if (shouldRun('import')) {
      const legacyState = JSON.parse(fs.readFileSync(path.join(__dirname, 'er-edit-state-v1.json'), 'utf8'));
      // 以前の版の編集済みHTML（編集の状態を代入するスクリプトで持つ）。取り込みの読み込み元にする
      const v1File = withEditState(generated.business.file, legacyState, path.join(OUT, 'import-source-v1.html'), { legacy: true });
      // 同じ編集を今の版の置き方で持つ図。開いて保存し直し、今の版の編集済みHTMLを作る
      const v1Open = withEditState(generated.business.file, legacyState, path.join(OUT, 'import-source-v1-open.html'));
      const importState = (page) => page.evaluate(() => {
        const app113 = findApp(113);
        const custom = APPS.find((a) => a.isCustom && a.name === '外部会計システム');
        const a113 = cy.getElementById('a113');
        return {
          customApp: custom ? { name: custom.name, fields: allFieldsForApp(custom).map((f) => f.label), node: cy.getElementById('a' + custom.id).length === 1 } : null,
          customField: allFieldsForApp(app113).filter((f) => f.label === '承認ステータス' && f.isCustom).length,
          customRelation: app113.relations.filter((r) => r.isCustom && custom && r.toApp === custom.id && r.fromLabel === '会計連携' && r.kind === 'ACTION').length,
          notes: cy.nodes('.note-node').map((n) => n.data('label')),
          appName: findApp(101) && findApp(101).name,
          appColor: cy.getElementById('a101').data('accent'),
          fieldLabel: (allFieldsForApp(app113).find((f) => f.code === '案件名') || {}).label,
          renamedRelation: app113.relations.filter((r) => r.fromLabel === '顧客参照（編集）').map((r) => r.fromPath || r.from),
          hiddenField: hiddenFieldKeys.has('113::顧客'),
          removedApp: cy.getElementById('a110').length ? cy.getElementById('a110').hasClass('app-manual-hidden') : null,
          removedEdges: cy.edges('.rel-manual-hidden').filter((e) => manuallyRemovedEdgeIds.has(e.id())).map((e) => { const ref = relationForEdgeId(e.id()); return ref ? (ref.rel.fromPath || ref.rel.controlFieldPath || ref.rel.from) + '→' + ref.rel.toApp : e.id(); }),
          pinned: a113.locked() && a113.hasClass('pinned-node'),
          position: a113.position(),
          pos101: cy.getElementById('a101').length ? cy.getElementById('a101').position() : null,
          scope: JSON.parse(JSON.stringify(viewScope)),
          actionShown: document.getElementById('rel-action-btn').classList.contains('active')
        };
      });
      const importFile = async (page, file, viaMenu = false) => {
        await page.evaluate(() => { const t = document.getElementById('toast'); t.classList.remove('show'); t.textContent = ''; });
        if (viaMenu) {
          // 利用者と同じく「編集」メニューの「編集済みHTMLから取り込む」から選ぶ
          const chooser = page.waitForEvent('filechooser', { timeout: 10000 });
          await page.locator('#edit-menu > .tb-menu-btn').click();
          await page.getByRole('button', { name: '編集済みHTMLから取り込む', exact: true }).click();
          await (await chooser).setFiles(file);
        } else {
          await page.setInputFiles('#edit-import-file', file);
        }
        await page.waitForFunction(() => document.getElementById('modal-overlay').classList.contains('open') || document.getElementById('toast').classList.contains('show'), null, { timeout: 15000 });
        await page.waitForTimeout(300);
        const result = await page.evaluate(() => ({
          modal: document.getElementById('modal-overlay').classList.contains('open') ? document.getElementById('modal-content').textContent : '',
          title: document.getElementById('modal-title').textContent,
          toast: document.getElementById('toast').textContent
        }));
        if (result.modal) await page.evaluate(() => closeModal());
        return result;
      };
      // 今の版で保存した編集済みHTML（表示範囲は「顧客マスタのまわり」）を作っておく
      const v2File = path.join(OUT, 'import-source-v2.html');
      let v2Saved = null;
      {
        const viewer = await openViewer(browser, v1Open);
        await viewer.page.evaluate(() => showAroundApp(101));
        await settleLayout(viewer.page);
        v2Saved = await viewer.page.evaluate(() => ({ scope: JSON.parse(JSON.stringify(viewScope)), pos101: cy.getElementById('a101').position() }));
        const downloadPromise = viewer.page.waitForEvent('download', { timeout: 60000 });
        await viewer.page.evaluate(() => window.exportEditedHtml());
        await (await downloadPromise).saveAs(v2File);
        await viewer.context.close();
      }
      const businessRelations = JSON.parse(generated.business.html.match(/const APPS = (.*);\n/)[1]).find((a) => a.id === 113).relations;
      const relKey = (rel) => (rel.fromPath || rel.controlFieldPath || rel.from) + '→' + rel.toApp;

      await check('import: 以前の版の編集済みHTMLの編集を、新しく作った図へ取り込む（メニューから選ぶ・元に戻す）', async () => {
        const viewer = await openViewer(browser, generated.business.file);
        const { page } = viewer;
        const before = await importState(page);
        const result = await importFile(page, v1File, true);
        const after = await importState(page);
        await page.screenshot({ path: path.join(OUT, 'import-v1.png'), animations: 'disabled' });
        await page.evaluate(() => undoLast());
        await settleLayout(page);
        const undone = await importState(page);
        const problems = [...viewer.errors, ...viewer.blocked];
        await viewer.context.close();
        assert.deepEqual(problems, []);
        assert.equal(result.title, '編集済みHTMLから取り込みました');
        assert.match(result.modal, /以前の版の編集済みHTML/);
        assert.match(result.modal, /手動で追加したアプリ: 1 件/);
        assert.match(result.modal, /表示範囲: 全体（以前の版は全体の図だけを保存しています）/);
        assert.match(result.toast, /編集を取り込みました/);
        assert.deepEqual({ ...after, scope: undefined, position: undefined, pos101: undefined, actionShown: undefined }, {
          customApp: { name: '外部会計システム', fields: ['会計コード', '金額', 'メモ'], node: true },
          customField: 1,
          customRelation: 1,
          notes: ['受注フローの中心'],
          appName: '顧客マスタ（編集済み）',
          appColor: '#f472b6',
          fieldLabel: '案件名（編集）',
          renamedRelation: [businessRelations[0].fromPath || businessRelations[0].from],
          hiddenField: true,
          removedApp: true,
          removedEdges: [relKey(businessRelations[1])],
          pinned: true,
          scope: undefined, position: undefined, pos101: undefined, actionShown: undefined
        });
        assert.deepEqual(after.position, { x: 123.5, y: 456.25 });
        assert.equal(after.scope.mode, 'all');
        // 表示設定（線の種類の表示など）は取り込まない
        assert.equal(after.actionShown, true);
        // 元に戻すと、取り込む前に戻る
        assert.deepEqual(undone, before);
      });

      // このリポジトリの以前の版（er-edit-state-v1-lite.json。9691a4a の tools/ER図.js で保存）の編集済みHTMLも、同じように取り込める
      await check('import: lite-suite の以前の版で保存した編集済みHTMLの編集も、新しく作った図へ取り込む', async () => {
        const liteState = JSON.parse(fs.readFileSync(path.join(__dirname, 'er-edit-state-v1-lite.json'), 'utf8'));
        // 以前の版は編集の状態を window.__ER_EDIT_STATE__ への代入のスクリプトとして保存していた。その置き方のまま読み込み元にする
        const liteFile = withEditState(generated.business.file, liteState, path.join(OUT, 'import-source-v1-lite.html'), { legacy: true });
        const viewer = await openViewer(browser, generated.business.file);
        const { page } = viewer;
        const result = await importFile(page, liteFile);
        const after = await importState(page);
        await page.screenshot({ path: path.join(OUT, 'import-v1-lite.png'), animations: 'disabled' });
        const problems = [...viewer.errors, ...viewer.blocked];
        await viewer.context.close();
        assert.deepEqual(problems, []);
        assert.equal(result.title, '編集済みHTMLから取り込みました');
        assert.match(result.modal, /以前の版の編集済みHTML/);
        assert.match(result.modal, /手動で追加したアプリ: 1 件/);
        const { customApp, customField, customRelation, notes, appName, appColor, fieldLabel, hiddenField, removedApp, pinned, position } = after;
        assert.deepEqual({ customApp, customField, customRelation, notes, appName, appColor, fieldLabel, hiddenField, removedApp, pinned, position }, {
          customApp: { name: '外部会計システム', fields: ['会計コード', '金額', 'メモ'], node: true },
          customField: 1,
          customRelation: 1,
          notes: ['受注フローの中心'],
          appName: '顧客マスタ（編集済み）',
          appColor: '#f472b6',
          fieldLabel: '案件名（編集）',
          hiddenField: true,
          removedApp: true,
          pinned: true,
          position: { x: 123.5, y: 456.25 }
        });
        return `${(result.modal.match(/手動で追加したアプリ: \d+ 件/) || [''])[0]}`;
      });

      await check('import: 今の版の編集済みHTMLは、保存したときの表示範囲と位置で取り込み、同じファイルをもう一度取り込んでも重ねない', async () => {
        const viewer = await openViewer(browser, generated.business.file);
        const { page } = viewer;
        const result = await importFile(page, v2File);
        const after = await importState(page);
        const again = await importFile(page, v2File);
        const twice = await importState(page);
        const problems = [...viewer.errors, ...viewer.blocked];
        await viewer.context.close();
        assert.deepEqual(problems, []);
        assert.match(result.modal, /今の版の編集済みHTML/);
        assert.match(result.modal, /表示範囲: 保存したときの範囲（顧客マスタ（編集済み） のまわり・深さ 1）/);
        assert.deepEqual(after.scope, v2Saved.scope);
        assert.equal(after.customField, 1);
        assert.equal(after.customRelation, 1);
        assert.equal(after.appName, '顧客マスタ（編集済み）');
        assert.ok(Math.abs(after.pos101.x - v2Saved.pos101.x) < 0.02 && Math.abs(after.pos101.y - v2Saved.pos101.y) < 0.02, `位置が戻りません: ${JSON.stringify(after.pos101)} / ${JSON.stringify(v2Saved.pos101)}`);
        // 2 回目は同じ内容が今の図にあるので重ねない（手動のアプリ・項目・線・メモが 1 つずつのまま）
        assert.match(again.modal, /同じ内容が今の図にあったため取り込まなかった編集: \d+ 件/);
        assert.deepEqual({ customField: twice.customField, customRelation: twice.customRelation, notes: twice.notes }, { customField: 1, customRelation: 1, notes: ['受注フローの中心'] });
      });

      await check('import: 図に無いアプリの編集は「対象外」として件数を示し、ある分だけ取り込む（深さ 1 の図）', async () => {
        const viewer = await openViewer(browser, generated.depth1.file);
        const { page } = viewer;
        const present = await page.evaluate(() => APPS.map((a) => a.id));
        const result = await importFile(page, v1File);
        const after = await importState(page);
        const problems = [...viewer.errors, ...viewer.blocked];
        await viewer.context.close();
        assert.deepEqual(problems, []);
        assert.match(result.modal, /対象外: \d+ 件（今の図に無いアプリ・項目・関連線の編集）/);
        assert.match(result.modal, /今の図に無いアプリ: App \d+/);
        assert.match(result.toast, /対象外 \d+ 件/);
        assert.equal(after.appName, present.includes(101) ? '顧客マスタ（編集済み）' : null);
        assert.equal(after.customField, 1, '図にある案件管理の手動の項目は取り込む');
      });

      await check('import: 設定JSONから作った図（関連の並びが違う）でも、関連線の名前と削除を同じ関連へ対応させる', async () => {
        const offlineRelations = JSON.parse(generated.offline.html.match(/const APPS = (.*);\n/)[1]).find((a) => a.id === 113).relations;
        assert.notDeepEqual(offlineRelations.map(relKey), businessRelations.map(relKey), '並びが同じだと対応付けの検査になりません');
        const viewer = await openViewer(browser, generated.offline.file);
        const { page } = viewer;
        await importFile(page, v1File);
        const after = await importState(page);
        const problems = [...viewer.errors, ...viewer.blocked];
        await viewer.context.close();
        assert.deepEqual(problems, []);
        assert.deepEqual(after.renamedRelation, [businessRelations[0].fromPath || businessRelations[0].from]);
        assert.deepEqual(after.removedEdges, [relKey(businessRelations[1])]);
      });

      await check('import: 編集済みでない HTML・壊れたファイルは取り込まず、ファイルの中のスクリプトを実行しない', async () => {
        const hostileState = {
          stateVersion: 2,
          appOverrides: { 101: { name: '<img src=x onerror="window.__PWNED__=1">', color: 'red;background:url(https://evil.example/x)' } },
          notes: [{ text: '<script>window.__PWNED__=2</script>', color: '#fef08a', x: 0, y: 0 }],
          customApps: [{ id: -1, name: '"><svg onload="window.__PWNED__=3">', fields: [{ code: 'x', label: '<b onmouseover=alert(1)>x</b>', type: 'SINGLE_LINE_TEXT' }] }],
          // 取り込んだ名前が、詳細・表・構造チェック・印刷・ツールチップのどこで出ても要素にならないことを、目印の属性（data-xss）で確かめる
          customFields: [{ appId: 113, field: { code: '<b data-xss=1>c</b>', label: '<i data-xss=2>項目</i>', type: 'SINGLE_LINE_TEXT' } }],
          customRelations: [{ fromAppId: 113, rel: { toApp: -1, kind: 'LOOKUP', fromLabel: '<u data-xss=3>線</u>' } }],
          fieldOverrides: { [`113::${businessRelations[0].fromPath || businessRelations[0].from}`]: { label: '<s data-xss=4>名前</s>' } },
          relationOverrides: { e_113_0: { fromLabel: '<q data-xss=5>関連</q>' } },
          view: { positions: { a113: { x: 'NaN', y: 0 } }, scope: { mode: 'around', roots: ['javascript:alert(1)'], depth: 9 } }
        };
        // JSON の自身のキーとして __proto__ を持たせる（オブジェクトの書き方では入らないため、文字列で足す）
        const hostileJson = JSON.stringify(hostileState).replace('"appOverrides":{', '"appOverrides":{"__proto__":{"polluted":1},').replace(/</g, '\\u003c');
        const hostileFile = path.join(OUT, 'import-hostile.html');
        const marker = '<script id="er-main" type="text/plain">';
        fs.writeFileSync(hostileFile, fs.readFileSync(generated.business.file, 'utf8')
          .replace(marker, () => `<script id="er-edit-state">window.__ER_EDIT_STATE__=${hostileJson};</script>${marker}`)
          .replace('</body>', () => '<script>window.__PWNED__=4</script><img src="https://evil.example/pixel.png"></body>'), 'utf8');
        const viewer = await openViewer(browser, generated.business.file);
        const { page } = viewer;
        const plain = await importFile(page, generated.business.file);
        const result = await importFile(page, hostileFile);
        const state = await page.evaluate(() => ({
          pwned: window.__PWNED__,
          polluted: ({}).polluted,
          name101: findApp(101).name,
          accent: cy.getElementById('a101').data('accent'),
          injected: (() => {
            // 取り込んだアプリ・項目・関連線が出る画面をすべて描く
            const custom = APPS.find((app) => app.isCustom);
            const count = () => document.querySelectorAll('img[src="x"], svg[onload], [onerror], [onmouseover], [onload], [data-xss]').length;
            let total = count();
            for (const app of [findApp(101), findApp(113), custom]) { renderAppDetail(app); total += count(); }
            cy.edges().forEach((edge) => { if (edge.source().id() === 'a113') { renderEdgeDetail(edge); total += count(); edge.emit('mouseover'); total += count(); edge.emit('mouseout'); } });
            ['a101', 'a113', 'a' + custom.id].forEach((id) => { cy.getElementById(id).emit('mouseover'); total += count(); cy.getElementById(id).emit('mouseout'); });
            setView('apps'); total += count();
            setView('relations'); total += count();
            setView('diagram');
            toggleAnalysisPanel(true); renderAnalysisPanel(); total += count(); toggleAnalysisPanel(false);
            document.getElementById('print-doc').innerHTML = buildPrintDocHtml(); total += count(); document.getElementById('print-doc').innerHTML = '';
            openCmd(); filterCmd('<'); total += count(); filterCmd(''); total += count(); closeCmd();
            return total;
          })(),
          customName: APPS.find((app) => app.isCustom).name,
          imported: [findApp(113).allFields.some((f) => f.label === '<i data-xss=2>項目</i>'), findApp(113).relations.some((r) => r.fromLabel === '<u data-xss=3>線</u>'), findApp(113).relations[0].fromLabel === '<q data-xss=5>関連</q>'],
          listText: document.getElementById('app-list').textContent
        }));
        const problems = [...viewer.errors, ...viewer.blocked];
        await viewer.context.close();
        assert.match(plain.toast, /編集済みHTMLではありません/);
        assert.equal(plain.modal, '');
        assert.equal(state.pwned, undefined, 'ファイルの中のスクリプトが動きました');
        assert.equal(state.polluted, undefined);
        assert.equal(state.name101, '<img src=x onerror="window.__PWNED__=1">', '名前は文字として取り込む');
        assert.equal(state.accent, '', '色の形でない値を使っています');
        assert.deepEqual(state.imported, [true, true, true], '検査に使う名前を取り込めていません');
        assert.equal(state.customName, '"><svg onload="window.__PWNED__=3">');
        assert.equal(state.injected, 0, '取り込んだ名前が要素になっています');
        assert.ok(state.listText.includes('<img src=x onerror="window.__PWNED__=1">'));
        assert.match(result.modal, /形が正しくないため読まなかった値: \d+ 件/);
        assert.deepEqual(problems, [], '取り込みで通信を試みたかエラーが出ました');
      });
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

    console.log('CSP（埋め込んだスクリプトだけをハッシュで許可し、イベント属性を使わない）');
    if (shouldRun('csp')) {
      const cspOf = (html) => (html.match(/<meta http-equiv="Content-Security-Policy" content="([^"]*)">/) || [])[1] || '';
      const directivesOf = (html) => Object.fromEntries(cspOf(html).split(';').map((part) => part.trim().split(/\s+/)).map(([name, ...values]) => [name, values]));
      const hashSource = (text) => `'sha256-${crypto.createHash('sha256').update(text, 'utf8').digest('base64')}'`;
      const scriptsOf = (html) => [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)].map((m) => ({ attrs: m[1].trim(), text: m[2] }));
      const expectHashOnlyCsp = (html, label) => {
        const directives = directivesOf(html);
        const scripts = scriptsOf(html);
        const executable = scripts.filter((s) => !/\btype=/.test(s.attrs));
        const main = scripts.find((s) => s.attrs === 'id="er-main" type="text/plain"');
        assert.ok(main, `${label}: 図の本体がありません`);
        // 実行する script 要素（ライブラリ 3 つ・起動）と、起動スクリプトが er-main と同じ中身で作る図の本体。それ以外は許可しない
        assert.deepEqual(directives['script-src'], [...executable.map((s) => s.text), main.text].map(hashSource), `${label}: script-src が埋め込んだスクリプトのハッシュと合いません`);
        assert.deepEqual(directives['script-src-attr'], ["'none'"], `${label}: イベント属性を許可しています`);
        const markup = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '');
        assert.ok(!/<[^>]+\son[a-z]+\s*=/i.test(markup), `${label}: イベント属性があります`);
        assert.ok(!/javascript:/i.test(markup), `${label}: javascript の URL があります`);
        return directives['script-src'].length;
      };
      let savedEdited = null;
      let savedState = null;

      await check('csp: script-src は埋め込んだスクリプトのハッシュだけで、unsafe-inline・unsafe-eval・イベント属性を許可しない', async () => {
        const counts = Object.entries(generated).map(([name, g]) => `${name} ${expectHashOnlyCsp(g.html, name)}`);
        return `ハッシュの数: ${counts.join(' / ')}`;
      });

      await check('csp: すべてのメニュー・ボタン・ダイアログ・表・キーボード操作で CSP の違反が 0 件', async () => {
        const viewer = await openViewer(browser, generated.business.file);
        const { page } = viewer;
        // 共有 URL のコピーに失敗したときの prompt などは閉じる
        page.on('dialog', (dialog) => dialog.dismiss().catch(() => {}));
        const downloads = [];
        page.on('download', (download) => downloads.push(download));
        // メニューの中の部品は、メニューが閉じていたら開いてから操作する。メニューの外の部品は、開いたメニューに隠れないよう閉じてから操作する
        const openMenuOf = async (locator) => {
          const menu = await locator.evaluate((el) => {
            const m = el.closest('.tb-menu');
            if (!m) { if (!el.closest('#topbar')) closeAllMenus(); return ''; }
            return m.classList.contains('open') || el.matches('.tb-menu-btn') ? '' : m.id;
          });
          if (menu) await page.locator(`#${menu} > .tb-menu-btn`).click();
        };
        // 押す。画面に出ていない部品（狭い画面だけのボタンなど）は要素の click() で押す（受け口は同じ）
        const press = async (selector, { wait = 120 } = {}) => {
          const locator = page.locator(selector).first();
          await locator.waitFor({ state: 'attached', timeout: 5000 });
          await openMenuOf(locator);
          if (await locator.isVisible() && await locator.isEnabled()) await locator.click({ timeout: 5000 });
          else await locator.evaluate((el) => el.click());
          await page.waitForTimeout(wait);
        };
        const choose = async (selector, value) => {
          const locator = page.locator(selector).first();
          await openMenuOf(locator);
          await locator.selectOption(value);
          await page.waitForTimeout(150);
        };
        const pressAll = async (selectors) => { for (const selector of selectors) await press(selector); };
        const menuItem = async (menu, selector) => {
          await page.evaluate(() => closeAllMenus());
          await press(`#${menu} > .tb-menu-btn`);
          await press(`#${menu} .tb-menu-panel ${selector}`);
        };
        const isOpen = (id) => page.evaluate((target) => document.getElementById(target).classList.contains('open'), id);
        // ダイアログの外側（背景）を押して閉じる
        const pressBackdrop = async (id) => {
          assert.equal(await isOpen(id), true, `${id} が開いていません`);
          await page.mouse.click(4, 4);
          await page.waitForTimeout(150);
          assert.equal(await isOpen(id), false, `${id} が背景を押しても閉じません`);
        };
        const saveDownload = async (fn, name) => {
          const downloadPromise = page.waitForEvent('download', { timeout: 60000 });
          await fn();
          const download = await downloadPromise;
          const file = path.join(OUT, name);
          await download.saveAs(file);
          return file;
        };

        // 取得・関連サマリーと構造チェック
        await press('#overview-pill');
        await press('#overview [data-action="overview-analysis"]');
        await press('#analysis-content [data-action="analysis-focus"]');
        await settleLayout(page);
        await press('#analysis-panel [data-action="analysis-close"]');
        await press('#overview-pill');
        await press('#overview [data-action="overview-relations"][data-state="unresolved"]');
        await press('#tab-diagram');
        await press('#overview-pill');
        await press('#overview [data-action="overview-relations"][data-state=""]');
        await press('#tab-diagram');
        await press('#overview-pill');
        await press('#overview [data-action="overview-close"]');
        await press('#analysis-toggle-btn');
        await press('#analysis-toggle-btn');

        // 表示設定
        await press('#settings-btn');
        await press('#settings-menu [data-action="scope-all"]');
        await settleLayout(page);
        await press('#settings-menu [data-action="scope-start"]');
        await settleLayout(page);
        for (const name of ['cose', 'breadthfirst', 'concentric', 'grid', 'circle', 'dagre']) {
          await press(`#settings-menu [data-action="layout"][data-layout-btn="${name}"]`);
          await settleLayout(page);
        }
        for (const action of ['separate-nolink', 'simple-mode', 'bundle', 'relation-labels', 'focus-mode', 'minimap']) {
          await press(`#settings-menu [data-action="${action}"]`);
          await press(`#settings-menu [data-action="${action}"]`);
        }
        for (const kind of ['LOOKUP', 'REF', 'ACTION']) {
          await press(`#settings-menu [data-action="relation-kind"][data-kind="${kind}"]`);
          await press(`#settings-menu [data-action="relation-kind"][data-kind="${kind}"]`);
        }
        for (const value of ['none', 'compact', 'full', 'standard']) { await choose('#density-select', value); await page.waitForTimeout(250); }
        await choose('#focus-depth', '2');
        await choose('#focus-direction', 'out');
        await choose('#focus-direction', 'both');
        await choose('#focus-depth', '1');
        await press('#settings-menu [data-action="fullscreen"]', { wait: 400 });
        await press('#settings-menu [data-action="fullscreen"]', { wait: 400 });
        await press('#settings-menu [data-action="path-finder"]');
        await press('#settings-menu [data-action="clear-focus"]');
        // 経路探索
        await choose('#pf-from', { index: 0 });
        await choose('#pf-to', { index: 1 });
        await press('#pathfinder [data-action="find-path"]');
        await settleLayout(page);
        await press('#pathfinder [data-action="clear-path"]');
        await press('#pathfinder [data-action="path-finder"]');

        // 凡例・表示倍率・狭い画面だけの部品
        await pressAll(['#legend-toggle-btn', '#legend-toggle-btn']);
        for (const kind of ['LOOKUP', 'REF', 'ACTION']) await pressAll([`#legend [data-kind="${kind}"]`, `#legend [data-kind="${kind}"]`]);
        await pressAll(['#zoom-ctrl [data-action="zoom-in"]', '#zoom-ctrl [data-action="zoom-out"]', '#zoom-ctrl [data-action="zoom-reset"]', '#zoom-level', '#zoom-presets [data-zoom="150"]', '#zoom-ctrl [data-action="zoom-fit"]']);
        await pressAll(['#mobile-menu-btn', '#mobile-menu-btn', '#theme-btn', '#theme-btn']);

        // アプリ一覧（左）と詳細パネル
        await pressAll(['#sidebar-toggle-btn', '#sidebar-toggle-btn']);
        for (const value of ['scope', 'start', 'attention', 'nolink', '']) await choose('#app-list-filter', value);
        // 詳細パネルの項目の絞り込みは、項目が多いときだけ出る。カードの項目を「詳細」にしてから開く
        await choose('#density-select', 'full');
        await page.waitForTimeout(300);
        await press('#app-list [data-action="focus-app"][data-app="113"]');
        await settleLayout(page);
        await press('#detail [data-action="edit-app"]');
        await press('#editor .ed-swatch[data-action="swatch"]:nth-child(3)');
        await press('#editor [data-action="editor-submit"]');
        await press('#detail [data-action="edit-field-row"]');
        await press('#editor [data-action="editor-close"]');
        await press('#detail [data-action="hide-field-row"]');
        await press('#detail [data-action="restore-fields"]');
        await press('#detail [data-action="edit-relation-row"]');
        await press('#editor [data-action="editor-close"]');
        await press('#detail [data-action="toggle-relation-row"]');
        await press('#detail [data-action="toggle-relation-row"]');
        await page.locator('#detail .detail-filter').fill('顧客');
        await page.locator('#detail .detail-filter').fill('');
        await choose('#density-select', 'standard');
        await page.waitForTimeout(300);
        await press('#detail .link-btn[data-action="focus-app"]');
        await settleLayout(page);
        await press('#app-list [data-action="focus-app"][data-app="113"]');
        await settleLayout(page);
        await press('#detail [data-action="show-around"]');
        await settleLayout(page);
        // 表示範囲の帯（アプリのまわり）
        await press('#scope-bar [data-action="scope-depth"][data-depth="2"]');
        await settleLayout(page);
        await press('#scope-bar [data-action="scope-depth"][data-depth="1"]');
        await settleLayout(page);
        await press('#scope-bar [data-action="scope-all"]');
        await settleLayout(page);
        await press('#scope-bar [data-action="scope-start"]');
        await settleLayout(page);
        // 関連線の詳細
        await page.evaluate(() => renderEdgeDetail(cy.edges().filter((e) => e.visible())[0]));
        await press('#detail .detail-actions [data-action="focus-app"]');
        await press('#detail [data-action="detail-close"]');
        await pressAll(['#sidebar [data-action="sidebar-close"]', '#sidebar-toggle-btn', '#sidebar-backdrop', '#sidebar-toggle-btn']);

        // 編集メニュー（選んだアプリ 113 を対象にする）
        await page.evaluate(() => { focusApp(113); });
        await settleLayout(page);
        for (const action of ['undo', 'toggle-pin', 'toggle-pin', 'color-by-depth', 'clear-colors', 'clear-pins', 'restore-all-fields', 'remove-relations', 'restore-relations']) await menuItem('edit-menu', `[data-action="${action}"]`);
        for (const action of ['align', 'distribute']) for (const axis of ['x', 'y']) await menuItem('edit-menu', `[data-action="${action}"][data-axis="${axis}"]`);
        await page.evaluate(() => { cy.getElementById('a110').select(); });
        await menuItem('edit-menu', '[data-action="remove-apps"]');
        await menuItem('edit-menu', '[data-action="restore-apps"]');
        await menuItem('edit-menu', '[data-action="add-app"]');
        await page.locator('#editor-body input').first().fill('CSP 検査のアプリ');
        await press('#editor [data-action="editor-submit"]');
        await menuItem('edit-menu', '[data-action="add-field"]');
        await press('#editor [data-action="editor-close"]');
        await menuItem('edit-menu', '[data-action="add-relation"]');
        await pressBackdrop('editor-overlay');
        await menuItem('edit-menu', '[data-action="add-note"]');
        await page.locator('#ed-note-text').fill('CSP 検査のメモ');
        await press('#editor .ed-swatch[data-action="swatch"]:nth-child(2)');
        await press('#editor [data-action="editor-submit"]');
        await menuItem('edit-menu', '[data-action="add-note"]');
        await page.locator('#ed-note-text').fill('消すメモ');
        await press('#editor [data-action="editor-submit"]');
        await page.evaluate(() => openEditNote(cy.nodes('.note-node').last().id()));
        await press('#editor [data-action="editor-delete"]');
        await menuItem('edit-menu', '[data-action="edit-app"]');
        await press('#editor [data-action="editor-close"]');
        {
          const chooser = page.waitForEvent('filechooser', { timeout: 10000 });
          await menuItem('edit-menu', '[data-action="edit-import"]');
          await (await chooser).setFiles(generated.depth1.file);
          await page.waitForTimeout(400);
        }

        // 出力メニュー
        for (const action of ['markdown', 'csv-apps', 'csv-fields', 'csv-relations', 'json', 'mermaid', 'drawio', 'plantuml', 'sql']) {
          await menuItem('export-menu', `[data-action="${action}"]`);
          assert.equal(await isOpen('modal-overlay'), true, `${action}: 出力の画面が開きません`);
          if (action === 'markdown') {
            await press('#modal [data-action="modal-copy"]');
            await saveDownload(() => press('#modal [data-action="modal-download"]'), 'csp-modal-download.md');
          }
          if (action === 'sql') await pressBackdrop('modal-overlay');
          else await press('#modal [data-action="modal-close"]');
        }
        await menuItem('export-menu', '[data-action="share-url"]');
        const pngFile = await saveDownload(() => menuItem('export-menu', '[data-action="png"]'), 'csp-export.png');
        await menuItem('export-menu', '[data-action="print"]');
        await page.waitForTimeout(1500);
        await page.evaluate(() => window.dispatchEvent(new Event('afterprint')));
        savedEdited = await saveDownload(() => menuItem('export-menu', '[data-action="save-html"]'), 'csp-edited.html');
        savedState = await page.evaluate(() => ({ customApps: APPS.filter((a) => a.isCustom).map((a) => a.name), notes: cy.nodes('.note-node').map((n) => n.data('label')), accent: cy.getElementById('a113').data('accent') }));

        // ヘルプ・コマンドパレット
        await press('#help-btn');
        await press('#help-box [data-action="help-close"]');
        await press('#help-btn');
        await pressBackdrop('help-overlay');
        await press('#help-btn');
        await press('#help-box [data-action="help-cmd"]');
        assert.equal(await isOpen('cmd-overlay'), true, 'ヘルプからコマンドパレットを開けません');
        await page.locator('#cmd-input').fill('画面に合わせる');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(300);
        await page.keyboard.press('Control+k');
        await pressBackdrop('cmd-overlay');

        // 表のビュー
        await press('#tab-apps');
        for (const key of ['id', 'name', 'name']) await press(`#apps-table [data-action="sort"][data-sort="${key}"]`);
        await press('#apps-checks [data-action="apps-check"]');
        await press('#apps-checks [data-action="apps-check"]');
        for (const value of ['scope', 'start', 'custom', 'removed', '']) await choose('#apps-status', value);
        await press('#apps-checks [data-action="analysis-open"]');
        await press('#analysis-panel [data-action="analysis-close"]');
        await press('#tab-apps');
        await press('#apps-table .row-link[data-action="focus-app"]');
        await settleLayout(page);
        await press('#tab-apps');
        await press('#apps-table .row-go[data-action="focus-app"]');
        await settleLayout(page);
        await press('#tab-relations');
        await press('#relations-kinds [data-action="relation-table-kind"]');
        await press('#relations-kinds [data-action="relation-table-kind"]');
        for (const value of ['unresolved', 'self', 'filtered', 'custom', 'removed', '']) await choose('#relations-state', value);
        await press('#relations-table [data-action="sort"][data-sort="kind"]');
        await press('#relations-table [data-action="go-edge"]');
        await settleLayout(page);

        // キーボード
        await page.locator('#tab-diagram').focus();
        for (const key of ['ArrowRight', 'ArrowRight', 'ArrowLeft', 'End', 'Home']) { await page.keyboard.press(key); await page.waitForTimeout(120); }
        await page.locator('#search-box').fill('顧客');
        await page.keyboard.press('Enter');
        await page.keyboard.press('Enter');
        await settleLayout(page);
        await page.locator('#search-box').fill('');
        await page.evaluate(() => document.activeElement && document.activeElement.blur());
        for (const key of ['Control+f', 'Escape', 'Control+b', 'Control+b', 'Alt+2', 'Alt+3', 'Alt+1', 'Shift+F', 'Shift+F', '+', '-', '0', 'Control+0', 'Control+z', '?', 'Escape', 'Control+k', 'Escape']) {
          if (key !== 'Control+f') await page.evaluate(() => document.activeElement && document.activeElement !== document.body && document.activeElement.blur());
          await page.keyboard.press(key);
          await page.waitForTimeout(150);
        }
        await page.evaluate(() => { cy.elements().unselect(); cy.getElementById('a110').select(); });
        await page.keyboard.press('Delete');
        await page.keyboard.press('Control+z');
        await page.keyboard.press('Control+p');
        await page.waitForTimeout(1500);
        await page.evaluate(() => window.dispatchEvent(new Event('afterprint')));

        const state = await cspState(page);
        const tables = await page.evaluate(() => ({ click: Object.keys(ER_CLICK_ACTIONS), change: Object.keys(ER_CHANGE_ACTIONS), input: Object.keys(ER_INPUT_ACTIONS), keydown: Object.keys(ER_KEYDOWN_ACTIONS) }));
        const missing = Object.fromEntries(Object.entries(tables).map(([type, names]) => [type, names.filter((name) => !state.exercised[type].includes(name))]).filter(([, names]) => names.length));
        await page.screenshot({ path: path.join(OUT, 'csp-after-all-actions.png'), animations: 'disabled' });
        const problems = [...viewer.errors, ...viewer.blocked];
        await viewer.context.close();
        assert.deepEqual(state.violations, [], 'CSP の違反があります');
        assert.deepEqual(state.inlineAttributes, [], 'イベント属性・javascript の URL を持つ要素が現れました');
        assert.deepEqual(missing, {}, '押していない操作があります');
        assert.deepEqual(problems, []);
        assert.equal(fs.readFileSync(pngFile).subarray(1, 4).toString('ascii'), 'PNG');
        const total = Object.values(state.exercised).reduce((sum, names) => sum + names.length, 0);
        return `操作 ${total} 種類（押す ${state.exercised.click.length}・選ぶ ${state.exercised.change.length}・入力 ${state.exercised.input.length}・キー ${state.exercised.keydown.length}）・ダウンロード ${downloads.length} 件・違反 0 件`;
      });

      await check('csp: 保存した編集済みHTMLは同じ CSP のまま開き直せ、編集の状態は実行しない JSON として入る（保存し直しても同じ）', async () => {
        assert.ok(savedEdited, '前の検査で編集済みHTMLを保存できていません');
        const html = fs.readFileSync(savedEdited, 'utf8');
        assert.equal(cspOf(html), cspOf(generated.business.html), '保存した HTML の CSP が元の図と違います');
        expectHashOnlyCsp(html, '編集済みHTML');
        assert.ok(!html.includes('window.__ER_EDIT_STATE__='), '編集の状態を実行するスクリプトとして保存しています');
        const state = JSON.parse(savedEditStateJson(html));
        assert.equal(state.stateVersion, 2);
        assert.ok(html.indexOf('<script id="er-edit-state"') < html.indexOf('<script id="er-main"'), '編集の状態が図の本体の後ろにあります');
        const reopened = await openViewer(browser, savedEdited);
        const restored = await reopened.page.evaluate(() => ({ customApps: APPS.filter((a) => a.isCustom).map((a) => a.name), notes: cy.nodes('.note-node').map((n) => n.data('label')), accent: cy.getElementById('a113').data('accent') }));
        await reopened.page.evaluate(() => { cy.elements().unselect(); cy.getElementById('a113').select(); });
        const again = path.join(OUT, 'csp-edited-again.html');
        const downloadPromise = reopened.page.waitForEvent('download', { timeout: 60000 });
        await reopened.page.evaluate(() => window.exportEditedHtml());
        await (await downloadPromise).saveAs(again);
        const firstCsp = await cspState(reopened.page);
        const problems = [...reopened.errors, ...reopened.blocked];
        await reopened.context.close();
        const againHtml = fs.readFileSync(again, 'utf8');
        assert.equal(cspOf(againHtml), cspOf(generated.business.html));
        assert.equal((againHtml.match(/<script id="er-edit-state"/g) || []).length, 1, '保存し直すと編集の状態が重なります');
        const third = await openViewer(browser, again);
        const restoredAgain = await third.page.evaluate(() => ({ customApps: APPS.filter((a) => a.isCustom).map((a) => a.name), notes: cy.nodes('.note-node').map((n) => n.data('label')), accent: cy.getElementById('a113').data('accent') }));
        const thirdCsp = await cspState(third.page);
        const thirdProblems = [...third.errors, ...third.blocked];
        await third.context.close();
        assert.deepEqual(restored, savedState, '開き直すと編集が戻りません');
        assert.deepEqual(restoredAgain, savedState, '保存し直して開くと編集が戻りません');
        assert.deepEqual([...firstCsp.violations, ...thirdCsp.violations], [], 'CSP の違反があります');
        assert.deepEqual([...problems, ...thirdProblems], []);
        return `手動のアプリ ${restored.customApps.length}・メモ ${restored.notes.length}・違反 0 件`;
      });

      await check('csp: 共有 URL（表示状態のハッシュ）で開いても、違反なしに表示状態が戻る', async () => {
        const viewer = await openViewer(browser, generated.business.file);
        const hash = await viewer.page.evaluate(async () => {
          setLayout('grid');
          toggleRelationKind('REF');
          await showAroundApp(101);
          return '#' + encodeState();
        });
        await viewer.context.close();
        const shared = await openViewer(browser, generated.business.file, { hash });
        await shared.page.waitForTimeout(800);
        const state = await shared.page.evaluate(() => ({ layout: ER_OPTIONS.layoutName, ref: relationKindState.REF, scope: viewScope.mode, roots: viewScope.roots.slice() }));
        const csp = await cspState(shared.page);
        const problems = [...shared.errors, ...shared.blocked];
        await shared.context.close();
        assert.deepEqual(state, { layout: 'grid', ref: false, scope: 'around', roots: ['101'] });
        assert.deepEqual(csp.violations, []);
        assert.deepEqual(problems, []);
      });

      await check('csp: 差し込まれたイベント属性・javascript の URL・script は動かず、違反として記録される', async () => {
        const viewer = await openViewer(browser, generated.business.file);
        const { page } = viewer;
        await page.evaluate(() => {
          document.body.insertAdjacentHTML('beforeend', '<img id="csp-probe-img" src="data:," onerror="window.__ER_PWNED__=1"><a id="csp-probe-link" href="javascript:window.__ER_PWNED__=2">x</a>');
          const script = document.createElement('script');
          script.textContent = 'window.__ER_PWNED__=3';
          document.body.appendChild(script);
        });
        await page.locator('#csp-probe-link').click();
        await page.waitForTimeout(500);
        const state = await page.evaluate(() => ({ pwned: window.__ER_PWNED__, directives: window.__ER_CSP__.violations.map((v) => v.directive) }));
        await viewer.context.close();
        assert.equal(state.pwned, undefined, '差し込んだスクリプトが動きました');
        for (const directive of ['script-src-attr', 'script-src-elem']) assert.ok(state.directives.includes(directive), `${directive} の違反が記録されていません: ${state.directives.join(', ')}`);
        return state.directives.join(', ');
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
