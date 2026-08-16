#!/usr/bin/env node
'use strict';

/**
 * 差分比較.js のコミット済み版（before）と作業ツリー版（after）を、同じ
 * モック kintone REST API 上で起動して比較する Playwright ハーネス。
 *
 * 前提:
 *   1. tools/統合ツール で npm run build を実行し、tools/差分比較.js を更新する
 *   2. リポジトリ直下で次を実行する
 *
 *     node tools/test-harness/run-diff-lite-compare.cjs
 *
 * 既定では before を `git show HEAD:tools/差分比較.js`、after を作業ツリーの
 * `tools/差分比較.js` から読み込む。スクリーンショット、ダウンロードされた
 * HTML レポート、after版のExcel一覧、DOM 検証結果 JSON、比較用 index.html を .iter-shots 配下へ保存する。
 *
 * 主なオプション:
 *   --before-ref <ref>   before の Git ref（既定: HEAD）
 *   --before-file <path> Git ではなく指定ファイルを before に使う
 *   --after-file <path>  after のファイル（既定: tools/差分比較.js）
 *   --out <dir>          出力先ディレクトリ
 *   --browser <name>     chrome / msedge / chromium（既定: chrome）
 *   --headed             ブラウザを表示する
 */

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..', '..');
const DEFAULT_AFTER = path.resolve(ROOT, 'tools', '差分比較.js');
const DEFAULT_OUT = path.resolve(ROOT, '.iter-shots', 'diff-lite-compare');
const GIT_BUNDLE_PATH = 'tools/差分比較.js';
const SOURCE_APP_ID = '101';
const TARGET_APP_ID = '202';

function argValue(name, fallback = '') {
  const index = process.argv.indexOf(name);
  if (index < 0 || index + 1 >= process.argv.length) return fallback;
  return process.argv[index + 1];
}

function hasFlag(name) {
  return process.argv.includes(name);
}

function printHelp() {
  console.log(`Usage: node tools/test-harness/run-diff-lite-compare.cjs [options]

Options:
  --before-ref <ref>   Git ref for before bundle (default: HEAD)
  --before-file <path> Read before bundle from a file instead of Git
  --after-file <path>  Worktree bundle (default: tools/差分比較.js)
  --out <dir>          Output directory
  --browser <name>     chrome, msedge, or chromium (default: chrome)
  --headed             Run with a visible browser
  --help               Show this help`);
}

function resolveFromRoot(value, fallback) {
  const raw = value || fallback;
  return path.isAbsolute(raw) ? raw : path.resolve(ROOT, raw);
}

function readBeforeBundle(beforeRef, beforeFile) {
  if (beforeFile) return fs.readFileSync(resolveFromRoot(beforeFile), 'utf8');
  const spec = `${beforeRef}:${GIT_BUNDLE_PATH}`;
  return execFileSync('git', ['show', spec], {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
    windowsHide: true
  });
}

function bundleHash(source) {
  return crypto.createHash('sha256').update(source).digest('hex').slice(0, 12);
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function buildMockFixture() {
  const field = (type, code, label, extra = {}) => ({ type, code, label, ...extra });
  return {
    apps: {
      [SOURCE_APP_ID]: {
        '/app/settings.json': {
          name: '顧客管理（開発）', description: '開発環境の設定', icon: { type: 'PRESET', key: 'APP72' }, revision: '31'
        },
        '/app/form/fields.json': {
          properties: {
            customer_name: field('SINGLE_LINE_TEXT', 'customer_name', '顧客名', { required: true, unique: true, defaultValue: '' }),
            amount: field('NUMBER', 'amount', '見積金額', { required: false, digit: true, unit: '円', unitPosition: 'AFTER' }),
            notes: field('MULTI_LINE_TEXT', 'notes', '備考', { required: false, defaultValue: '' })
          },
          revision: '31'
        },
        '/app/form/layout.json': {
          layout: [
            { type: 'ROW', fields: [{ type: 'SINGLE_LINE_TEXT', code: 'customer_name', size: { width: '300' } }] },
            { type: 'ROW', fields: [{ type: 'NUMBER', code: 'amount', size: { width: '180' } }] },
            { type: 'ROW', fields: [{ type: 'MULTI_LINE_TEXT', code: 'notes', size: { width: '500', innerHeight: '100' } }] }
          ],
          revision: '31'
        },
        '/app/views.json': {
          views: {
            '案件一覧': {
              type: 'LIST', name: '案件一覧', index: '0', fields: ['customer_name', 'amount'],
              filterCond: 'amount > 0', sort: 'amount desc'
            }
          },
          revision: '31'
        },
        '/app/status.json': {
          enable: true,
          states: {
            '未対応': { name: '未対応', index: '0', assignee: { type: 'ONE', entities: [] } },
            '対応中': { name: '対応中', index: '1', assignee: { type: 'ONE', entities: [] } },
            '完了': { name: '完了', index: '2', assignee: { type: 'ONE', entities: [] } }
          },
          actions: [
            { name: '着手', from: '未対応', to: '対応中', filterCond: '' },
            { name: '完了する', from: '対応中', to: '完了', filterCond: 'amount > 0' }
          ],
          revision: '31'
        },
        '/app.json': { appId: SOURCE_APP_ID, name: '顧客管理（開発）', description: '開発環境の設定' }
      },
      [TARGET_APP_ID]: {
        '/app/settings.json': {
          name: '顧客管理（本番）', description: '本番環境の設定', icon: { type: 'PRESET', key: 'APP72' }, revision: '44'
        },
        '/app/form/fields.json': {
          properties: {
            customer_name: field('SINGLE_LINE_TEXT', 'customer_name', '取引先名', { required: false, unique: true, defaultValue: '' }),
            priority: field('DROP_DOWN', 'priority', '優先度', {
              required: true,
              defaultValue: '通常',
              options: { '高': { label: '高', index: '0' }, '通常': { label: '通常', index: '1' } }
            }),
            notes: field('MULTI_LINE_TEXT', 'notes', '備考', { required: false, defaultValue: '引継ぎ事項を記入' })
          },
          revision: '44'
        },
        '/app/form/layout.json': {
          layout: [
            { type: 'ROW', fields: [{ type: 'SINGLE_LINE_TEXT', code: 'customer_name', size: { width: '360' } }] },
            { type: 'ROW', fields: [{ type: 'DROP_DOWN', code: 'priority', size: { width: '180' } }] },
            { type: 'ROW', fields: [{ type: 'MULTI_LINE_TEXT', code: 'notes', size: { width: '500', innerHeight: '140' } }] }
          ],
          revision: '44'
        },
        '/app/views.json': {
          views: {
            '案件一覧': {
              type: 'LIST', name: '案件一覧', index: '0', fields: ['priority', 'customer_name'],
              filterCond: 'priority in ("高")', sort: 'customer_name asc'
            },
            '優先案件': {
              type: 'LIST', name: '優先案件', index: '1', fields: ['customer_name', 'priority'],
              filterCond: 'priority in ("高")', sort: 'customer_name asc'
            }
          },
          revision: '44'
        },
        '/app/status.json': {
          enable: true,
          states: {
            '未対応': { name: '未対応', index: '0', assignee: { type: 'ONE', entities: [] } },
            '対応中': { name: '対応中', index: '1', assignee: { type: 'ONE', entities: [] } },
            '完了': { name: '完了', index: '2', assignee: { type: 'ONE', entities: [] } }
          },
          actions: [
            { name: '着手', from: '未対応', to: '対応中', filterCond: 'priority in ("高", "通常")' },
            { name: '完了する', from: '対応中', to: '完了', filterCond: '' }
          ],
          revision: '44'
        },
        '/app.json': { appId: TARGET_APP_ID, name: '顧客管理（本番）', description: '本番環境の設定' }
      }
    }
  };
}

async function installMockKintone(page, fixture) {
  await page.evaluate(({ mock, currentAppId }) => {
    const calls = [];
    const api = async (url, method, params = {}) => {
      const rawUrl = String(url || '');
      const resource = rawUrl.replace(/^.*\/k(?:\/guest\/[^/]+)?\/v1(?:\/preview)?/, '') || '/';
      const appId = String(params.app ?? params.id ?? currentAppId);
      calls.push({ url: rawUrl, resource, method: String(method || ''), appId, params: { ...params } });
      if (String(method || '').toUpperCase() !== 'GET') {
        const error = new Error(`mock API は GET のみ対応です: ${method} ${resource}`);
        error.code = 'MOCK_METHOD';
        throw error;
      }
      const response = mock.apps?.[appId]?.[resource];
      if (response === undefined) {
        const error = new Error(`mock response 未定義: App ${appId} ${resource}`);
        error.code = 'MOCK_NOT_FOUND';
        throw error;
      }
      return JSON.parse(JSON.stringify(response));
    };
    api.url = (resource, preview) => `/k/v1${preview ? '/preview' : ''}${resource}`;

    window.__KUS_MOCK_CALLS__ = calls;
    window.kintone = {
      api,
      app: { getId: () => Number(currentAppId) },
      mobile: { app: { getId: () => Number(currentAppId) } },
      getLoginUser: () => ({ code: 'mock-user', name: 'Mock User' })
    };
    window.alert = (message) => { window.__KUS_LAST_ALERT__ = String(message || ''); };
    window.confirm = () => true;
    window.prompt = () => '';
    try {
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: { writeText: async () => {} }
      });
    } catch (_) {
      // Clipboard is not needed for the main comparison flow.
    }
  }, { mock: fixture, currentAppId: SOURCE_APP_ID });
}

function collectPageErrors(page, label) {
  const errors = [];
  page.on('pageerror', (error) => errors.push(`${label}: pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`${label}: console: ${message.text()}`);
  });
  return errors;
}

async function fillComparisonForm(page) {
  const root = page.locator('#kus-diff-lite');
  const sourceLabel = root.locator('.kus-lp__label').filter({ hasText: /^比較元$/ }).first();
  const targetLabel = root.locator('.kus-lp__label').filter({ hasText: /^比較先\s*1$/ }).first();
  await sourceLabel.locator('..').locator('input[type="text"]').first().fill(SOURCE_APP_ID);
  await targetLabel.locator('..').locator('input[type="text"]').first().fill(TARGET_APP_ID);

  // アプリ名も比較結果に含めるため、既定4セクションにアプリ設定を追加する。
  const appSettings = root.locator('.kus-lp__chip input[value="appSettings"]');
  if (!(await appSettings.isChecked())) await appSettings.check();

  const advanced = root.locator('details.kus-lp__details').filter({ hasText: '詳細オプション' }).first();
  await advanced.evaluate((element) => { element.open = true; });
  const showResult = advanced.locator('label')
    .filter({ hasText: /画面に(?:比較結果一覧|差分明細)を表示/ })
    .locator('input[type="checkbox"]');
  if (!(await showResult.isChecked())) await showResult.check();
}

async function inspectPanel(page) {
  return page.locator('#kus-diff-lite').evaluate((root) => {
    const body = root.querySelector('.kus-lp__body');
    const status = root.querySelector('.kus-lp__status');
    return {
      title: root.querySelector('.kus-lp__title')?.textContent?.trim() || '',
      statusTone: status?.dataset?.tone || '',
      statusText: root.querySelector('.kus-lp__status-text')?.textContent?.trim() || '',
      resultRows: root.querySelectorAll('.kus-dl-row').length,
      resultSections: root.querySelectorAll('.kus-dl-section').length,
      hasOverview: !!root.querySelector('.kus-dl-overview'),
      overviewText: root.querySelector('.kus-dl-overview')?.textContent?.replace(/\s+/g, ' ').trim() || '',
      visibleTypeBadges: [...root.querySelectorAll('.kus-dl-badge')].map((element) => element.textContent?.trim() || ''),
      horizontalOverflow: root.scrollWidth > root.clientWidth + 2,
      bodyHorizontalOverflow: !!body && body.scrollWidth > body.clientWidth + 2
    };
  });
}

async function inspectReport(page) {
  return page.evaluate(() => ({
    total: Number(document.getElementById('stat-total')?.textContent || 0),
    added: Number(document.getElementById('stat-added')?.textContent || 0),
    removed: Number(document.getElementById('stat-removed')?.textContent || 0),
    changed: Number(document.getElementById('stat-changed')?.textContent || 0),
    moved: Number(document.getElementById('stat-moved')?.textContent || 0),
    appHeader: document.querySelector('.topbar-apps')?.textContent?.replace(/\s+/g, ' ').trim() || '',
    tabs: [...document.querySelectorAll('[data-report-tab]')].map((element) => element.textContent?.trim() || ''),
    sections: document.querySelectorAll('#main .sec').length,
    rows: document.querySelectorAll('#main .drow').length,
    hasViewSideControl: !!document.querySelector('input[name="viewSide"]'),
    horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 2
  }));
}

async function captureReport(context, variant, reportFile, outDir) {
  const page = await context.newPage();
  await page.setViewportSize({ width: 1440, height: 1000 });
  const errors = collectPageErrors(page, `${variant}-report`);
  await page.goto(pathToFileURL(reportFile).href, { waitUntil: 'load' });
  await page.waitForSelector('#main .sec', { timeout: 15000 });
  await page.waitForTimeout(150);
  const dom = await inspectReport(page);
  assert.ok(dom.total > 0, `${variant}: HTMLレポートの差分件数が0です`);
  assert.ok(dom.sections > 0, `${variant}: HTMLレポートにセクションがありません`);
  assert.match(dom.appHeader, new RegExp(SOURCE_APP_ID), `${variant}: 比較元App IDがレポート見出しにありません`);
  assert.match(dom.appHeader, new RegExp(TARGET_APP_ID), `${variant}: 比較先App IDがレポート見出しにありません`);
  await page.screenshot({ path: path.join(outDir, `${variant}-report.png`), fullPage: false, animations: 'disabled' });

  const fieldTab = page.locator('[data-report-tab="settingsLike"]');
  if (await fieldTab.count()) {
    await fieldTab.click();
    await page.waitForSelector('#settingsLikeRoot', { state: 'visible', timeout: 10000 });
    await page.waitForTimeout(150);
    await page.screenshot({ path: path.join(outDir, `${variant}-report-fields.png`), fullPage: false, animations: 'disabled' });
    dom.fieldCards = await page.locator('#settingsLikeRoot .sl-item').count();
  }

  await page.close();
  assert.deepEqual(errors, [], `${variant}: HTMLレポートでブラウザエラーが発生しました`);
  return { ...dom, errors };
}

async function runVariant(browser, variant, bundleSource, fixture, outDir) {
  const context = await browser.newContext({
    viewport: { width: 1365, height: 900 },
    deviceScaleFactor: 1,
    acceptDownloads: true
  });
  const page = await context.newPage();
  const errors = collectPageErrors(page, `${variant}-panel`);
  await page.setContent('<!doctype html><html lang="ja"><head><meta charset="utf-8"><title>Mock kintone</title></head><body><main id="mock-kintone-portal"></main></body></html>');
  await installMockKintone(page, fixture);
  await page.addScriptTag({ content: bundleSource });
  await page.waitForSelector('#kus-diff-lite', { timeout: 15000 });
  await fillComparisonForm(page);

  const downloadPromise = page.waitForEvent('download', { timeout: 30000 });
  await page.getByRole('button', { name: /差分比較を実行/ }).click();
  const download = await downloadPromise;
  await page.waitForFunction(() => {
    const status = document.querySelector('#kus-diff-lite .kus-lp__status');
    return status && ['ok', 'warn', 'err'].includes(status.dataset.tone || '');
  }, null, { timeout: 30000 });

  const reportFile = path.join(outDir, `${variant}-report.html`);
  await download.saveAs(reportFile);
  const result = page.locator('#kus-diff-lite .kus-dl-result');
  await result.scrollIntoViewIfNeeded();
  await page.waitForTimeout(150);
  await page.locator('#kus-diff-lite').screenshot({
    path: path.join(outDir, `${variant}-panel.png`),
    animations: 'disabled'
  });

  const panelDom = await inspectPanel(page);
  const apiCalls = await page.evaluate(() => window.__KUS_MOCK_CALLS__ || []);
  assert.equal(panelDom.title, '差分比較', `${variant}: liteパネルが正しく起動していません`);
  assert.equal(panelDom.statusTone, 'ok', `${variant}: 差分比較が正常完了していません: ${panelDom.statusText}`);
  assert.ok(panelDom.resultRows > 0, `${variant}: 画面内の差分行が0件です`);
  assert.match(panelDom.statusText, /取得失敗\s*0件/, `${variant}: モックAPIの取得失敗があります`);
  assert.ok(apiCalls.length >= 10, `${variant}: 想定よりAPI呼び出しが少なすぎます`);
  assert.deepEqual(errors, [], `${variant}: liteパネルでブラウザエラーが発生しました`);

  let xlsx = null;
  if (variant === 'after') {
    const xlsxButton = page.getByRole('button', { name: /差分一覧を Excel 保存/ });
    assert.equal(await xlsxButton.count(), 1, 'after: Excel保存ボタンが見つかりません');
    assert.equal(await xlsxButton.isEnabled(), true, 'after: 比較完了後もExcel保存ボタンが無効です');
    const xlsxDownloadPromise = page.waitForEvent('download', { timeout: 30000 });
    await xlsxButton.click();
    const xlsxDownload = await xlsxDownloadPromise;
    const xlsxFile = path.join(outDir, 'after-diff-list.xlsx');
    await xlsxDownload.saveAs(xlsxFile);
    const xlsxBytes = fs.readFileSync(xlsxFile);
    assert.ok(xlsxBytes.length > 1000, 'after: Excelファイルが小さすぎます');
    assert.equal(xlsxBytes.readUInt32LE(0), 0x04034b50, 'after: ExcelファイルがZIP形式ではありません');
    assert.match(xlsxDownload.suggestedFilename(), /\.xlsx$/i, 'after: Excelの拡張子が.xlsxではありません');
    await page.waitForFunction(() => {
      const status = document.querySelector('#kus-diff-lite .kus-lp__status-text');
      return /Excel/.test(status?.textContent || '');
    }, null, { timeout: 10000 });
    xlsx = {
      suggestedFilename: xlsxDownload.suggestedFilename(),
      bytes: xlsxBytes.length,
      file: path.basename(xlsxFile)
    };
  }

  const reportDom = await captureReport(context, variant, reportFile, outDir);
  await context.close();
  return {
    hash: bundleHash(bundleSource),
    bytes: Buffer.byteLength(bundleSource),
    downloadSuggestedFilename: download.suggestedFilename(),
    panel: panelDom,
    report: reportDom,
    xlsx,
    apiCalls,
    errors
  };
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function writeComparisonIndex(outDir, summary) {
  const json = escapeHtml(JSON.stringify(summary, null, 2));
  const html = `<!doctype html>
<html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>差分比較.js before / after</title><style>
body{margin:0;padding:24px;background:#eef2f7;color:#0f172a;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
h1{margin:0 0 8px;font-size:24px}.meta{margin:0 0 20px;color:#475569}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px;margin-bottom:22px}
article{min-width:0;padding:14px;border:1px solid #cbd5e1;border-radius:14px;background:#fff;box-shadow:0 8px 24px rgba(15,23,42,.08)}
h2{margin:0 0 10px;font-size:17px}img{display:block;width:100%;height:auto;border:1px solid #e2e8f0;border-radius:8px;background:#fff}
pre{overflow:auto;padding:14px;border-radius:10px;background:#0f172a;color:#e2e8f0;font:12px/1.5 ui-monospace,Consolas,monospace}
@media(max-width:900px){.grid{grid-template-columns:1fr}}
</style></head><body><h1>差分比較.js before / after</h1>
<p class="meta">同じモック kintone API（App ${SOURCE_APP_ID} → App ${TARGET_APP_ID}）で取得・比較した結果です。</p>
<div class="grid"><article><h2>Before: パネル</h2><img src="before-panel.png" alt="変更前パネル"></article><article><h2>After: パネル</h2><img src="after-panel.png" alt="変更後パネル"></article></div>
<div class="grid"><article><h2>Before: HTMLレポート</h2><img src="before-report.png" alt="変更前レポート"></article><article><h2>After: HTMLレポート</h2><img src="after-report.png" alt="変更後レポート"></article></div>
<div class="grid"><article><h2>Before: フィールド単位</h2><img src="before-report-fields.png" alt="変更前フィールド単位"></article><article><h2>After: フィールド単位</h2><img src="after-report-fields.png" alt="変更後フィールド単位"></article></div>
<h2>DOM検証結果</h2><pre>${json}</pre></body></html>`;
  fs.writeFileSync(path.join(outDir, 'index.html'), html, 'utf8');
}

async function launchBrowser(browserName, headed) {
  const options = { headless: !headed };
  if (browserName && browserName !== 'chromium') options.channel = browserName;
  try {
    return await chromium.launch(options);
  } catch (error) {
    if (!options.channel) throw error;
    console.warn(`[harness] browser channel fallback: ${browserName}: ${String(error.message || error).split('\n')[0]}`);
    return chromium.launch({ headless: !headed });
  }
}

async function main() {
  if (hasFlag('--help')) {
    printHelp();
    return;
  }

  const beforeRef = argValue('--before-ref', 'HEAD');
  const beforeFile = argValue('--before-file', '');
  const afterFile = resolveFromRoot(argValue('--after-file', ''), DEFAULT_AFTER);
  const outDir = resolveFromRoot(argValue('--out', ''), DEFAULT_OUT);
  const browserName = argValue('--browser', process.env.KUS_DIFF_BROWSER || 'chrome');
  const headed = hasFlag('--headed');

  const beforeBundle = readBeforeBundle(beforeRef, beforeFile);
  const afterBundle = fs.readFileSync(afterFile, 'utf8');
  assert.ok(beforeBundle.includes('kus-diff-lite'), 'before bundle が差分比較 lite バンドルではありません');
  assert.ok(afterBundle.includes('kus-diff-lite'), 'after bundle が差分比較 lite バンドルではありません。先に npm run build を実行してください');

  fs.mkdirSync(outDir, { recursive: true });
  const beforeHash = bundleHash(beforeBundle);
  const afterHash = bundleHash(afterBundle);
  console.log(`[harness] before ${beforeRef}:${GIT_BUNDLE_PATH} ${beforeHash} (${Buffer.byteLength(beforeBundle)} bytes)`);
  console.log(`[harness] after  ${path.relative(ROOT, afterFile)} ${afterHash} (${Buffer.byteLength(afterBundle)} bytes)`);
  if (beforeHash === afterHash) console.warn('[harness] before / after bundle hashes are identical');

  const browser = await launchBrowser(browserName, headed);
  let summary;
  try {
    const fixture = buildMockFixture();
    const before = await runVariant(browser, 'before', beforeBundle, clone(fixture), outDir);
    const after = await runVariant(browser, 'after', afterBundle, clone(fixture), outDir);
    summary = {
      generatedAt: new Date().toISOString(),
      beforeSource: beforeFile ? path.relative(ROOT, resolveFromRoot(beforeFile)) : `${beforeRef}:${GIT_BUNDLE_PATH}`,
      afterSource: path.relative(ROOT, afterFile),
      fixture: { sourceAppId: SOURCE_APP_ID, targetAppId: TARGET_APP_ID },
      before,
      after
    };
  } finally {
    await browser.close();
  }

  fs.writeFileSync(path.join(outDir, 'diff-lite-comparison.json'), JSON.stringify(summary, null, 2), 'utf8');
  writeComparisonIndex(outDir, summary);
  console.log(`[harness] output: ${outDir}`);
  console.log(`[harness] comparison: ${path.join(outDir, 'index.html')}`);
}

main().catch((error) => {
  console.error(error.stack || error.message || error);
  process.exitCode = 1;
});
