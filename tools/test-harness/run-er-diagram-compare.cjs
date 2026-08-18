#!/usr/bin/env node
'use strict';

/**
 * ER図.js のコミット済み版（before）と作業ツリー版（after）を、
 * 同じモック kintone REST API 上で生成・表示して比較する Playwright ハーネス。
 *
 * 既定で before は `git show HEAD:tools/ER図.js`、after は作業ツリーの
 * `tools/ER図.js` から読み込む。各版の生成 HTML、デスクトップ/モバイル
 * スクリーンショット、検査結果 JSON、比較用 index.html を出力する。
 *
 * Usage:
 *   node tools/test-harness/run-er-diagram-compare.cjs
 *
 * Options:
 *   --before-ref <ref>   before の Git ref（既定: HEAD）
 *   --before-file <path> Git ではなく指定ファイルを before に使う
 *   --after-file <path>  after のファイル（既定: tools/ER図.js）
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
const GIT_BUNDLE_PATH = 'tools/ER図.js';
const DEFAULT_AFTER = path.resolve(ROOT, 'tools', 'ER図.js');
const DEFAULT_OUT = path.resolve(ROOT, '.iter-shots', 'er-diagram-compare');
const SOURCE_APP_ID = '101';
const TARGET_APP_ID = '202';
const OPTIONAL_FIELD_LABEL = '任意メモ（詳細で再表示）';
const UNKNOWN_LAYOUT = 'unknown-layout-from-shared-url';
const KNOWN_LAYOUTS = ['dagre', 'breadthfirst', 'cose', 'concentric', 'grid', 'circle'];
// Browser zoom is emulated on a fixed 1440x900 physical surface by inversely
// scaling the CSS viewport and matching devicePixelRatio (e.g. 200% => 720x450 @ DPR 2).
const DIAGRAM_ZOOM_LEVELS = [25, 50, 75, 100, 125, 150, 200];
const BROWSER_ZOOM_LEVELS = [80, 125, 150, 200];
const BROWSER_ZOOM_BASE_VIEWPORT = { width: 1440, height: 900 };
const RESPONSIVE_VIEWPORTS = [
  { width: 320, height: 568 },
  { width: 390, height: 844 },
  { width: 720, height: 900 },
  { width: 900, height: 900 },
  { width: 1024, height: 768 },
  { width: 1440, height: 900 }
];
const ZOOM_RESET_SELECTOR = 'button[aria-label="表示倍率を100%にリセット"][onclick="zoomReset()"]';
const MALICIOUS_APP_NAME = '攻撃テスト</title><img id="er-xss-image" src="x" onerror="window.__ER_XSS_EXECUTED__=1"><script id="er-xss-script">window.__ER_XSS_EXECUTED__=2</script>';

function argValue(name, fallback = '') {
  const index = process.argv.indexOf(name);
  if (index < 0 || index + 1 >= process.argv.length) return fallback;
  return process.argv[index + 1];
}

function hasFlag(name) {
  return process.argv.includes(name);
}

function printHelp() {
  console.log(`Usage: node tools/test-harness/run-er-diagram-compare.cjs [options]

Options:
  --before-ref <ref>   Git ref for before bundle (default: HEAD)
  --before-file <path> Read before bundle from a file instead of Git
  --after-file <path>  Worktree bundle (default: tools/ER図.js)
  --out <dir>          Output directory
  --browser <name>     chrome, msedge, chromium, or an executable path (default: chrome)
  --headed             Run with a visible browser
  --help               Show this help`);
}

function resolveFromRoot(value, fallback = '') {
  const raw = value || fallback;
  return path.isAbsolute(raw) ? raw : path.resolve(ROOT, raw);
}

function readBeforeBundle(beforeRef, beforeFile) {
  if (beforeFile) return fs.readFileSync(resolveFromRoot(beforeFile), 'utf8');
  return execFileSync('git', ['show', `${beforeRef}:${GIT_BUNDLE_PATH}`], {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
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
        '/app.json': {
          appId: SOURCE_APP_ID,
          name: MALICIOUS_APP_NAME,
          description: 'セキュリティ回帰テスト用の起点アプリ',
          spaceId: '55',
          createdAt: '2026-08-01T00:00:00Z',
          modifiedAt: '2026-08-18T00:00:00Z'
        },
        '/app/form/fields.json': {
          properties: {
            record_number: field('RECORD_NUMBER', 'record_number', 'レコード番号'),
            customer_code: field('SINGLE_LINE_TEXT', 'customer_code', '顧客コード', { required: true, unique: true }),
            target_lookup: field('SINGLE_LINE_TEXT', 'target_lookup', '取引先参照', {
              lookup: {
                relatedApp: { app: TARGET_APP_ID },
                relatedKeyField: 'company_code',
                fieldMappings: [],
                lookupPickerFields: [],
                filterCond: '',
                sort: ''
              }
            }),
            status: field('DROP_DOWN', 'status', '対応状況', {
              required: true,
              options: {
                '未対応': { label: '未対応', index: '0' },
                '完了': { label: '完了', index: '1' }
              }
            }),
            optional_notes: field('MULTI_LINE_TEXT', 'optional_notes', OPTIONAL_FIELD_LABEL, { required: false })
          },
          revision: '17'
        },
        '/app/actions.json': { actions: {}, revision: '17' }
      },
      [TARGET_APP_ID]: {
        '/app.json': {
          appId: TARGET_APP_ID,
          name: '取引先マスタ',
          description: '参照先アプリ',
          spaceId: '55',
          createdAt: '2026-08-01T00:00:00Z',
          modifiedAt: '2026-08-17T00:00:00Z'
        },
        '/app/form/fields.json': {
          properties: {
            record_number: field('RECORD_NUMBER', 'record_number', 'レコード番号'),
            company_code: field('SINGLE_LINE_TEXT', 'company_code', '取引先コード', { required: true, unique: true }),
            company_name: field('SINGLE_LINE_TEXT', 'company_name', '取引先名', { required: true }),
            company_notes: field('MULTI_LINE_TEXT', 'company_notes', '取引先備考', { required: false })
          },
          revision: '9'
        },
        '/app/actions.json': { actions: {}, revision: '9' }
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
    window.__ER_XSS_EXECUTED__ = 0;
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
      // Clipboard is not needed by the regression flow.
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

async function launchBrowser(browserName, headed) {
  const requested = String(browserName || 'chrome');
  const options = { headless: !headed };
  if (path.isAbsolute(requested) || fs.existsSync(resolveFromRoot(requested))) {
    options.executablePath = path.isAbsolute(requested) ? requested : resolveFromRoot(requested);
  } else if (requested !== 'chromium') {
    options.channel = requested;
  }
  try {
    return await chromium.launch(options);
  } catch (error) {
    if (!options.channel && !options.executablePath) throw error;
    console.warn(`[ER compare] ${requested} を起動できないため bundled Chromium を使います: ${error.message}`);
    return chromium.launch({ headless: !headed });
  }
}

function discoverLocalVendors() {
  const searchRoots = [
    path.join(ROOT, 'node_modules'),
    path.join(ROOT, 'tools', '統合ツール', 'node_modules')
  ];
  const candidates = {
    cytoscape: [path.join('cytoscape', 'dist', 'cytoscape.min.js')],
    dagre: [path.join('dagre', 'dist', 'dagre.min.js')],
    cytoscapeDagre: [
      path.join('cytoscape-dagre', 'cytoscape-dagre.js'),
      path.join('cytoscape-dagre', 'dist', 'cytoscape-dagre.js')
    ]
  };
  const result = {};
  for (const [key, relativePaths] of Object.entries(candidates)) {
    for (const root of searchRoots) {
      const hit = relativePaths.map((relativePath) => path.join(root, relativePath)).find((file) => fs.existsSync(file));
      if (hit) {
        result[key] = fs.readFileSync(hit, 'utf8');
        break;
      }
    }
  }
  return result;
}

function isLibraryCdnUrl(url) {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host === 'cdnjs.cloudflare.com' || host === 'cdn.jsdelivr.net' || host === 'unpkg.com';
  } catch (_) {
    return false;
  }
}

function vendorKeyForUrl(url) {
  const lower = url.toLowerCase();
  if (lower.includes('cytoscape-dagre')) return 'cytoscapeDagre';
  if (lower.includes('cytoscape')) return 'cytoscape';
  if (/(?:^|[\/.-])dagre(?:[\/@.-]|$)/.test(lower)) return 'dagre';
  return '';
}

async function configureViewerRoutes(page, localVendors, blockLibraries) {
  await page.route('**/*', async (route) => {
    const url = route.request().url();
    if (!isLibraryCdnUrl(url)) {
      await route.continue();
      return;
    }
    if (blockLibraries) {
      const contentType = /\.css(?:\?|$)/i.test(url) ? 'text/css; charset=utf-8' : 'application/javascript; charset=utf-8';
      await route.fulfill({ status: 200, contentType, body: '' });
      return;
    }
    const key = vendorKeyForUrl(url);
    if (key && localVendors[key]) {
      await route.fulfill({ status: 200, contentType: 'application/javascript; charset=utf-8', body: localVendors[key] });
      return;
    }
    await route.continue();
  });
}

async function generateDiagramHtml(browser, variant, bundleSource, fixture, outDir) {
  const context = await browser.newContext({
    acceptDownloads: true,
    viewport: { width: 1200, height: 900 }
  });
  const page = await context.newPage();
  const errors = collectPageErrors(page, `${variant}-generator`);
  await page.route('https://mock.cybozu.com/**', (route) => route.fulfill({
    status: 200,
    contentType: 'text/html; charset=utf-8',
    body: '<!doctype html><html lang="ja"><head><meta charset="utf-8"><title>Mock kintone</title></head><body><main id="mock-kintone"></main></body></html>'
  }));
  await page.goto(`https://mock.cybozu.com/k/${SOURCE_APP_ID}/`, { waitUntil: 'domcontentloaded' });
  await installMockKintone(page, fixture);
  await page.addScriptTag({ content: bundleSource });
  const root = page.locator('#kus-er-lite');
  await root.waitFor({ state: 'visible', timeout: 15000 });

  const startRow = root.locator('.kus-lp__row').filter({ hasText: '起点ID' }).first();
  await startRow.locator('input').first().fill(SOURCE_APP_ID);

  const advanced = root.locator('details').filter({ hasText: '詳細オプション' }).first();
  if (await advanced.count()) await advanced.evaluate((element) => { element.open = true; });
  const densitySelect = advanced.locator('select').filter({ has: page.locator('option[value="full"]') });
  if (await densitySelect.count()) await densitySelect.first().selectOption('standard');

  const htmlFile = path.join(outDir, `${variant}-er-diagram.html`);
  const downloadPromise = page.waitForEvent('download', { timeout: 45000 });
  await root.getByRole('button', { name: /HTML\s*保存/ }).click();
  const download = await downloadPromise;
  const downloadFailure = await download.failure();
  if (downloadFailure) throw new Error(`${variant}: HTML 保存に失敗しました: ${downloadFailure}`);
  await download.saveAs(htmlFile);
  await page.waitForTimeout(100);
  const apiCalls = await page.evaluate(() => JSON.parse(JSON.stringify(window.__KUS_MOCK_CALLS__ || [])));
  await context.close();
  return { htmlFile, errors, apiCalls };
}

async function waitForDiagram(page) {
  await page.waitForSelector('#topbar', { state: 'attached', timeout: 15000 });
  const canvasReady = await page.locator('#cy canvas').first().waitFor({ state: 'attached', timeout: 30000 })
    .then(() => true)
    .catch(() => false);
  await page.waitForTimeout(canvasReady ? 900 : 300);
  return canvasReady;
}

async function inspectSecurity(page) {
  return page.evaluate(() => ({
    maliciousImageCount: document.querySelectorAll('#er-xss-image').length,
    maliciousScriptCount: document.querySelectorAll('script#er-xss-script').length,
    totalImageCount: document.images.length,
    markerValue: Number(window.__ER_XSS_EXECUTED__ || 0)
  }));
}

async function inspectPanelOverlap(page) {
  return page.evaluate(() => {
    const visible = (element) => {
      if (!element) return false;
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return rect.width > 0 && rect.height > 0 && style.display !== 'none'
        && style.visibility !== 'hidden' && Number(style.opacity || 1) > 0;
    };
    const overlap = (a, b) => {
      const width = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
      const height = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
      return width > 1 && height > 1;
    };
    const topbar = document.getElementById('topbar');
    const topbarRect = topbar?.getBoundingClientRect();
    const selectors = ['#overview', '#banner', '#sidebar', '#detail', '#analysis-panel', '#pathfinder', '#legend'];
    const visiblePanels = selectors
      .map((selector) => ({ selector, element: document.querySelector(selector) }))
      .filter((item) => visible(item.element));
    const overlaps = !topbarRect ? ['#topbar:not-found'] : visiblePanels
      .filter((item) => overlap(topbarRect, item.element.getBoundingClientRect()))
      .map((item) => item.selector);
    return {
      topbarHeight: topbarRect?.height || 0,
      visiblePanels: visiblePanels.map((item) => item.selector),
      overlaps,
      noTopbarPanelOverlap: overlaps.length === 0,
      horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 2
        || document.body.scrollWidth > document.body.clientWidth + 2
    };
  });
}

async function inspectScaleState(page, browserZoomPercent = 100) {
  return page.evaluate(({ browserZoomPercent, zoomResetSelector }) => {
    const visible = (element) => {
      if (!element) return false;
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return rect.width > 0 && rect.height > 0 && style.display !== 'none'
        && style.visibility !== 'hidden' && Number(style.opacity || 1) > 0;
    };
    const rectValue = (element) => {
      const rect = element.getBoundingClientRect();
      return {
        left: Math.round(rect.left * 10) / 10,
        top: Math.round(rect.top * 10) / 10,
        right: Math.round(rect.right * 10) / 10,
        bottom: Math.round(rect.bottom * 10) / 10,
        width: Math.round(rect.width * 10) / 10,
        height: Math.round(rect.height * 10) / 10
      };
    };
    const withinViewport = (rect) => rect.left >= -1 && rect.top >= -1
      && rect.right <= innerWidth + 1 && rect.bottom <= innerHeight + 1;
    const overlaps = (first, second) => {
      const width = Math.max(0, Math.min(first.right, second.right) - Math.max(first.left, second.left));
      const height = Math.max(0, Math.min(first.bottom, second.bottom) - Math.max(first.top, second.top));
      return width > 1 && height > 1;
    };
    const firstVisible = (selector) => [...document.querySelectorAll(selector)].find(visible) || null;
    const controlSelectors = {
      zoomIn: 'button[aria-label="拡大"]',
      zoomReset: zoomResetSelector,
      zoomOut: 'button[aria-label="縮小"]',
      fit: 'button[aria-label="図全体を表示"]'
    };
    const controls = Object.fromEntries(Object.entries(controlSelectors).map(([name, selector]) => {
      const element = firstVisible(selector);
      if (!element) return [name, { present: false, withinViewport: false, hitTarget: false, targetAtLeast30px: false }];
      const rect = rectValue(element);
      const pointX = Math.max(0, Math.min(innerWidth - 1, (rect.left + rect.right) / 2));
      const pointY = Math.max(0, Math.min(innerHeight - 1, (rect.top + rect.bottom) / 2));
      const hit = document.elementFromPoint(pointX, pointY);
      return [name, {
        present: true,
        rect,
        withinViewport: withinViewport(rect),
        hitTarget: hit === element || !!element.contains(hit),
        targetAtLeast30px: rect.width >= 30 && rect.height >= 30
      }];
    }));

    const fixedItems = ['#topbar', '#zoom-ctrl', '#legend', '#fab-mobile']
      .map((selector) => ({ selector, element: document.querySelector(selector) }))
      .filter((item) => visible(item.element))
      .map((item) => {
        const rect = rectValue(item.element);
        return { selector: item.selector, rect, withinViewport: withinViewport(rect) };
      });
    const fixedOverlaps = [];
    for (let first = 0; first < fixedItems.length; first += 1) {
      for (let second = first + 1; second < fixedItems.length; second += 1) {
        if (overlaps(fixedItems[first].rect, fixedItems[second].rect)) {
          fixedOverlaps.push(`${fixedItems[first].selector} × ${fixedItems[second].selector}`);
        }
      }
    }

    let graphZoom = 0;
    let graphMinZoom = 0;
    let graphMaxZoom = 0;
    let nodeCount = 0;
    let baseLabelPx = 0;
    let graphFitsCanvas = false;
    try {
      const graph = typeof cy !== 'undefined' ? cy : window.cy;
      if (graph && typeof graph.nodes === 'function') {
        const nodes = graph.nodes().filter((node) => node.visible());
        graphZoom = Number(graph.zoom() || 0);
        graphMinZoom = Number(graph.minZoom() || 0);
        graphMaxZoom = Number(graph.maxZoom() || 0);
        nodeCount = nodes.length;
        if (nodes.length) baseLabelPx = parseFloat(String(nodes.first().style('font-size') || '0')) || 0;
        const box = nodes.renderedBoundingBox({ includeLabels: true, includeOverlays: false });
        graphFitsCanvas = box.x1 >= -2 && box.y1 >= -2
          && box.x2 <= graph.width() + 2 && box.y2 <= graph.height() + 2;
      }
    } catch (_) {
      // Individual metrics stay zero so the JSON explains what could not be observed.
    }
    const effectiveLabelPx = baseLabelPx * graphZoom * (browserZoomPercent / 100);
    const labelReadability = effectiveLabelPx >= 9
      ? 'comfortable'
      : (effectiveLabelPx >= 6 ? 'small' : 'overview-only');
    const zoomText = String(document.getElementById('zoom-level')?.textContent || '').trim();
    const zoomPercentMatch = zoomText.match(/(-?\d+(?:\.\d+)?)\s*%/);
    const zoomPercent = zoomPercentMatch ? Number(zoomPercentMatch[1]) : null;
    const pageHorizontalOverflow = document.documentElement.scrollWidth > document.documentElement.clientWidth + 2
      || document.body.scrollWidth > document.body.clientWidth + 2;

    return {
      browserZoomPercent,
      viewport: { width: innerWidth, height: innerHeight },
      devicePixelRatio: Number(window.devicePixelRatio || 0),
      graphZoom: Math.round(graphZoom * 10000) / 10000,
      graphMinZoom,
      graphMaxZoom,
      zoomText,
      zoomPercent,
      nodeCount,
      baseLabelPx,
      effectiveLabelPx: Math.round(effectiveLabelPx * 10) / 10,
      labelReadability,
      labelReadable: effectiveLabelPx >= 6,
      graphFitsCanvas,
      controls,
      controlsUsable: Object.values(controls).every((control) => control.present && control.withinViewport
        && control.hitTarget && control.targetAtLeast30px),
      fixedItems,
      fixedItemsWithinViewport: fixedItems.every((item) => item.withinViewport),
      fixedOverlaps,
      noFixedControlOverlap: fixedOverlaps.length === 0,
      pageHorizontalOverflow
    };
  }, { browserZoomPercent, zoomResetSelector: ZOOM_RESET_SELECTOR });
}

async function exerciseZoomControls(page) {
  const clickVisible = async (selector) => {
    const control = page.locator(`${selector}:visible`).first();
    if (!(await control.count())) return false;
    await control.click();
    await page.waitForTimeout(100);
    return true;
  };
  const resetClicked = await clickVisible(ZOOM_RESET_SELECTOR);
  const reset = await inspectScaleState(page);
  const zoomInClicked = await clickVisible('button[aria-label="拡大"]');
  const zoomIn = await inspectScaleState(page);
  const zoomOutClicked = await clickVisible('button[aria-label="縮小"]');
  const zoomOut = await inspectScaleState(page);
  const fitClicked = await clickVisible('button[aria-label="図全体を表示"]');
  const fit = await inspectScaleState(page);
  return {
    resetClicked,
    zoomInClicked,
    zoomOutClicked,
    fitClicked,
    reset,
    zoomIn,
    zoomOut,
    fit,
    resetReached100: Math.abs(reset.graphZoom - 1) <= 0.01 && reset.zoomPercent === 100,
    zoomInAdvanced: zoomIn.graphZoom > reset.graphZoom && zoomIn.zoomPercent > reset.zoomPercent,
    zoomOutReturned: Math.abs(zoomOut.graphZoom - reset.graphZoom) <= 0.01,
    fitShowsWholeGraph: fit.graphFitsCanvas
  };
}

async function inspectDiagramZoom(browser, variant, htmlFile, localVendors, outDir) {
  const context = await browser.newContext({ viewport: BROWSER_ZOOM_BASE_VIEWPORT });
  const page = await context.newPage();
  const errors = collectPageErrors(page, `${variant}-diagram-zoom`);
  await configureViewerRoutes(page, localVendors, false);
  await page.goto(pathToFileURL(htmlFile).href, { waitUntil: 'load' });
  const canvasReady = await waitForDiagram(page);
  const levels = [];
  for (const percent of DIAGRAM_ZOOM_LEVELS) {
    await page.evaluate((target) => {
      const graph = typeof cy !== 'undefined' ? cy : window.cy;
      if (!graph || typeof graph.zoom !== 'function') return;
      graph.zoom({
        level: target / 100,
        renderedPosition: { x: graph.width() / 2, y: graph.height() / 2 }
      });
    }, percent);
    await page.waitForTimeout(100);
    const state = await inspectScaleState(page);
    const overlap = await inspectPanelOverlap(page);
    const screenshot = path.join(outDir, `${variant}-diagram-zoom-${String(percent).padStart(3, '0')}.png`);
    await page.screenshot({ path: screenshot, fullPage: false, animations: 'disabled' });
    levels.push({
      percent,
      screenshot: path.basename(screenshot),
      zoomReached: Math.abs(state.graphZoom - percent / 100) <= 0.01 && state.zoomPercent === percent,
      state,
      overlap
    });
  }
  const controls = await exerciseZoomControls(page);
  await context.close();
  return { canvasReady, errors, levels, controls };
}

async function inspectBrowserZoom(browser, variant, htmlFile, localVendors, outDir) {
  const levels = [];
  for (const percent of BROWSER_ZOOM_LEVELS) {
    const scale = percent / 100;
    const viewport = {
      width: Math.round(BROWSER_ZOOM_BASE_VIEWPORT.width / scale),
      height: Math.round(BROWSER_ZOOM_BASE_VIEWPORT.height / scale)
    };
    const context = await browser.newContext({
      viewport,
      screen: BROWSER_ZOOM_BASE_VIEWPORT,
      deviceScaleFactor: scale
    });
    const page = await context.newPage();
    const errors = collectPageErrors(page, `${variant}-browser-zoom-${percent}`);
    await configureViewerRoutes(page, localVendors, false);
    await page.goto(pathToFileURL(htmlFile).href, { waitUntil: 'load' });
    const canvasReady = await waitForDiagram(page);
    const state = await inspectScaleState(page, percent);
    const overlap = await inspectPanelOverlap(page);
    const screenshot = path.join(outDir, `${variant}-browser-zoom-${String(percent).padStart(3, '0')}.png`);
    await page.screenshot({ path: screenshot, fullPage: false, animations: 'disabled' });
    levels.push({
      percent,
      cssViewport: viewport,
      screenshot: path.basename(screenshot),
      canvasReady,
      emulationReached: Math.abs(state.devicePixelRatio - scale) <= 0.02
        && state.viewport.width === viewport.width && state.viewport.height === viewport.height,
      errors,
      state,
      overlap
    });
    await context.close();
  }
  return { physicalViewport: BROWSER_ZOOM_BASE_VIEWPORT, levels };
}

async function exerciseFullDensity(page, screenshotFile) {
  const select = page.locator('#density-select');
  if (!(await select.count())) {
    return { controlFound: false, selectedValue: '', pillText: '', searchMeta: '', graphContainsOptional: false, optionalFieldFound: false };
  }
  await select.selectOption('full');
  await page.waitForTimeout(150);
  const search = page.locator('#search-box');
  if (await search.count()) await search.fill(OPTIONAL_FIELD_LABEL);
  await page.waitForTimeout(150);
  const graphContainsOptional = await page.evaluate((label) => {
    try {
      const graph = typeof cy !== 'undefined' ? cy : window.cy;
      if (!graph || typeof graph.nodes !== 'function') return false;
      return graph.nodes().some((node) => String(node.data('label') || '').includes(label));
    } catch (_) {
      return false;
    }
  }, OPTIONAL_FIELD_LABEL);
  const pillText = await page.locator('#density-pill').textContent().catch(() => '');
  const searchMeta = await page.locator('#search-meta').textContent().catch(() => '');
  await page.screenshot({ path: screenshotFile, fullPage: false, animations: 'disabled' });
  return {
    controlFound: true,
    selectedValue: await select.inputValue(),
    pillText: String(pillText || '').replace(/\s+/g, ' ').trim(),
    searchMeta: String(searchMeta || '').replace(/\s+/g, ' ').trim(),
    graphContainsOptional,
    optionalFieldFound: graphContainsOptional || /(?:^|\D)[1-9]\d*\s*件/.test(String(searchMeta || ''))
  };
}

async function captureViewport(browser, variant, htmlFile, viewport, localVendors, outDir, options = {}) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  const label = `${variant}-${viewport.width}x${viewport.height}`;
  const errors = collectPageErrors(page, label);
  await configureViewerRoutes(page, localVendors, false);
  await page.addInitScript(() => { window.__ER_XSS_EXECUTED__ = 0; });
  await page.goto(pathToFileURL(htmlFile).href, { waitUntil: 'load' });
  const canvasReady = await waitForDiagram(page);
  const kind = viewport.width <= 480 ? 'mobile' : 'desktop';
  const screenshotFile = path.join(outDir, `${variant}-${kind}-${viewport.width}x${viewport.height}.png`);
  await page.screenshot({ path: screenshotFile, fullPage: false, animations: 'disabled' });
  const security = await inspectSecurity(page);
  const overlap = await inspectPanelOverlap(page);
  const scaleState = await inspectScaleState(page);
  let fullDensity = null;
  if (kind === 'desktop' && options.includeFullDensity !== false) {
    fullDensity = await exerciseFullDensity(page, path.join(outDir, `${variant}-desktop-full.png`));
  }
  await context.close();
  return {
    viewport,
    screenshot: path.basename(screenshotFile),
    canvasReady,
    errors,
    security,
    overlap,
    scaleState,
    fullDensity
  };
}

async function inspectResponsiveViewports(browser, variant, htmlFile, localVendors, outDir, existingResults) {
  const viewports = [];
  for (const viewport of RESPONSIVE_VIEWPORTS) {
    const key = `${viewport.width}x${viewport.height}`;
    const reused = existingResults.get(key);
    const result = reused || await captureViewport(
      browser,
      variant,
      htmlFile,
      viewport,
      localVendors,
      outDir,
      { includeFullDensity: false }
    );
    viewports.push({ ...result, reused: !!reused });
  }
  return { viewports };
}

function unknownLayoutHash() {
  return Buffer.from(JSON.stringify({ l: UNKNOWN_LAYOUT }), 'utf8').toString('base64');
}

async function inspectUnknownLayout(browser, variant, htmlFile, localVendors, outDir) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const errors = collectPageErrors(page, `${variant}-unknown-layout`);
  await configureViewerRoutes(page, localVendors, false);
  await page.goto(`${pathToFileURL(htmlFile).href}#${unknownLayoutHash()}`, { waitUntil: 'load' });
  const canvasReady = await waitForDiagram(page);
  await page.waitForTimeout(500);
  const dom = await page.evaluate(({ unknown, known }) => {
    const activeButton = document.querySelector('[data-layout-btn].active');
    let runtimeLayout = '';
    try {
      runtimeLayout = typeof ER_OPTIONS !== 'undefined' ? String(ER_OPTIONS.layoutName || '') : '';
    } catch (_) {
      runtimeLayout = '';
    }
    const pillText = String(document.getElementById('layout-pill')?.textContent || '').replace(/\s+/g, ' ').trim();
    const activeLayout = String(activeButton?.getAttribute('data-layout-btn') || '');
    return {
      runtimeLayout,
      activeLayout,
      pillText,
      unknownLeaked: runtimeLayout === unknown || activeLayout === unknown || pillText.includes(unknown),
      normalized: ![runtimeLayout, activeLayout].filter(Boolean).some((value) => !known.includes(value))
        && known.includes(activeLayout || runtimeLayout)
        && !pillText.includes(unknown)
    };
  }, { unknown: UNKNOWN_LAYOUT, known: KNOWN_LAYOUTS });
  await page.screenshot({ path: path.join(outDir, `${variant}-unknown-layout.png`), fullPage: false, animations: 'disabled' });
  await context.close();
  return { canvasReady, errors, ...dom };
}

async function inspectCdnFallback(browser, variant, htmlFile, localVendors, outDir) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const errors = collectPageErrors(page, `${variant}-cdn-blocked`);
  await configureViewerRoutes(page, localVendors, true);
  await page.goto(pathToFileURL(htmlFile).href, { waitUntil: 'load' });
  await page.waitForSelector('#topbar', { state: 'attached', timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(700);
  const fallback = await page.evaluate(() => {
    const visible = (element) => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return rect.width > 0 && rect.height > 0 && style.display !== 'none'
        && style.visibility !== 'hidden' && Number(style.opacity || 1) > 0;
    };
    const messagePattern = /(?:ER図|Cytoscape|描画|外部|ライブラリ|CDN).*(?:表示でき|読み込|取得|利用でき|失敗|再読み込み)|(?:読み込|取得).*(?:ライブラリ|Cytoscape).*(?:失敗|でき)/i;
    const preferred = [
      '#er-library-fallback', '#er-runtime-fallback', '#er-load-error',
      '[data-er-fallback]', '[data-er-runtime-error]', '#cy [role="alert"]',
      '#cy .fallback', '#cy .error', '[role="alert"]', '#cy'
    ];
    const candidates = [...new Set(preferred.flatMap((selector) => [...document.querySelectorAll(selector)]))];
    const hit = candidates.find((element) => visible(element) && messagePattern.test(String(element.textContent || '')));
    return {
      visible: !!hit,
      selector: hit ? preferred.find((selector) => {
        try { return hit.matches(selector); } catch (_) { return false; }
      }) || hit.tagName.toLowerCase() : '',
      text: String(hit?.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 500)
    };
  });
  const screenshotFile = path.join(outDir, `${variant}-cdn-fallback.png`);
  await page.screenshot({ path: screenshotFile, fullPage: false, animations: 'disabled' });
  await context.close();
  // CDN遮断テストは空の代替レスポンスを返す。SRIが正しく有効な場合に限り
  // Chromiumが出すdigest不一致は、フォールバックを起動させる期待イベント。
  const unexpectedErrors = errors.filter((message) => !/Failed to find a valid digest in the 'integrity' attribute/.test(message));
  return { ...fallback, errors: unexpectedErrors, screenshot: path.basename(screenshotFile) };
}

async function runVariant(browser, variant, bundleSource, fixture, localVendors, outDir, includeScaleMatrix = false) {
  console.log(`[ER compare] ${variant}: HTML 生成中...`);
  const generated = await generateDiagramHtml(browser, variant, bundleSource, fixture, outDir);
  const desktop = await captureViewport(
    browser,
    variant,
    generated.htmlFile,
    { width: 1440, height: 900 },
    localVendors,
    outDir
  );
  const mobile = await captureViewport(
    browser,
    variant,
    generated.htmlFile,
    { width: 390, height: 844 },
    localVendors,
    outDir
  );
  const unknownLayout = await inspectUnknownLayout(browser, variant, generated.htmlFile, localVendors, outDir);
  const cdnFallback = await inspectCdnFallback(browser, variant, generated.htmlFile, localVendors, outDir);
  const diagramZoom = includeScaleMatrix
    ? await inspectDiagramZoom(browser, variant, generated.htmlFile, localVendors, outDir)
    : null;
  const browserZoom = includeScaleMatrix
    ? await inspectBrowserZoom(browser, variant, generated.htmlFile, localVendors, outDir)
    : null;
  const responsive = includeScaleMatrix
    ? await inspectResponsiveViewports(
      browser,
      variant,
      generated.htmlFile,
      localVendors,
      outDir,
      new Map([
        [`${mobile.viewport.width}x${mobile.viewport.height}`, mobile],
        [`${desktop.viewport.width}x${desktop.viewport.height}`, desktop]
      ])
    )
    : null;
  return {
    html: path.basename(generated.htmlFile),
    generatorErrors: generated.errors,
    apiCalls: generated.apiCalls,
    desktop,
    mobile,
    unknownLayout,
    cdnFallback,
    diagramZoom,
    browserZoom,
    responsive
  };
}

function runtimeErrors(result) {
  return [...new Set([
    ...result.generatorErrors,
    ...result.desktop.errors,
    ...result.mobile.errors,
    ...result.unknownLayout.errors,
    ...result.cdnFallback.errors,
    ...(result.diagramZoom?.errors || []),
    ...(result.browserZoom?.levels || []).flatMap((level) => level.errors || []),
    ...(result.responsive?.viewports || []).flatMap((viewport) => viewport.errors || [])
  ])];
}

function validateAfter(after) {
  const failures = [];
  const errors = runtimeErrors(after);
  if (errors.length) failures.push(`pageerror/console error が ${errors.length}件あります:\n    ${errors.join('\n    ')}`);
  if (!after.desktop.canvasReady || !after.mobile.canvasReady) failures.push('デスクトップまたはモバイルで ER 図 canvas が生成されません');

  const full = after.desktop.fullDensity || {};
  if (!full.controlFound || full.selectedValue !== 'full' || !/詳細/.test(full.pillText || '')) {
    failures.push('表示密度を「詳細」へ切り替えられません');
  }
  if (!full.optionalFieldFound) failures.push(`標準密度で省略された「${OPTIONAL_FIELD_LABEL}」が詳細密度で再表示されません`);

  for (const [kind, result] of [['desktop', after.desktop], ['mobile', after.mobile]]) {
    const security = result.security;
    if (security.markerValue !== 0 || security.maliciousImageCount !== 0 || security.maliciousScriptCount !== 0 || security.totalImageCount !== 0) {
      failures.push(`${kind}: 悪意のあるアプリ名から img/script 要素が生成または実行されました`);
    }
    if (!result.overlap.noTopbarPanelOverlap) {
      failures.push(`${kind}: topbar と ${result.overlap.overlaps.join(', ')} が重なっています`);
    }
    if (result.overlap.horizontalOverflow) failures.push(`${kind}: ビューポート横方向へはみ出しています`);
  }

  if (!after.unknownLayout.normalized) failures.push('未知の hash レイアウトが既知の安全なレイアウトへ正規化されません');
  if (!after.cdnFallback.visible) failures.push('CDN 不通時の表示可能なフォールバック案内が見つかりません');

  const diagramZoom = after.diagramZoom;
  if (!diagramZoom?.canvasReady || diagramZoom.levels.length !== DIAGRAM_ZOOM_LEVELS.length) {
    failures.push(`図ズーム ${DIAGRAM_ZOOM_LEVELS.join('/')}% の検証を完了できません`);
  } else {
    for (const level of diagramZoom.levels) {
      if (!level.zoomReached) failures.push(`図ズーム ${level.percent}% に到達せず、倍率表示も一致しません`);
      if (!level.state.controlsUsable) failures.push(`図ズーム ${level.percent}% でズーム/全体表示ボタンを操作できません`);
      if (!level.state.noFixedControlOverlap) failures.push(`図ズーム ${level.percent}% で固定UIが重なります: ${level.state.fixedOverlaps.join(', ')}`);
      if (!level.overlap.noTopbarPanelOverlap) failures.push(`図ズーム ${level.percent}% で topbar とパネルが重なります`);
      if (level.state.pageHorizontalOverflow || level.overlap.horizontalOverflow) failures.push(`図ズーム ${level.percent}% でページが横方向へはみ出します`);
      if (level.percent >= 100 && !level.state.labelReadable) failures.push(`図ズーム ${level.percent}% でノードラベルが読める大きさを下回ります`);
    }
    const controls = diagramZoom.controls || {};
    if (!controls.resetClicked || !controls.zoomInClicked || !controls.zoomOutClicked || !controls.fitClicked) {
      failures.push('ズームイン/アウト、リセット、全体表示のいずれかをクリックできません');
    }
    if (!controls.resetReached100) failures.push('ズームリセットで 100% に戻りません');
    if (!controls.zoomInAdvanced || !controls.zoomOutReturned) failures.push('ズームイン/アウトの倍率遷移が不正です');
    if (!controls.fitShowsWholeGraph) failures.push('全体表示後もノードがキャンバス内に収まりません');
  }

  const browserZoom = after.browserZoom;
  if (!browserZoom || browserZoom.levels.length !== BROWSER_ZOOM_LEVELS.length) {
    failures.push('ブラウザ倍率 80/125/150/200% の検証を完了できません');
  } else {
    for (const level of browserZoom.levels) {
      if (!level.canvasReady) failures.push(`ブラウザ倍率 ${level.percent}% でER図を描画できません`);
      if (!level.emulationReached) failures.push(`ブラウザ倍率 ${level.percent}% のCSS viewport/DPRを再現できません`);
      if (!level.state.controlsUsable) failures.push(`ブラウザ倍率 ${level.percent}% でズーム/全体表示ボタンを操作できません`);
      if (!level.state.noFixedControlOverlap) failures.push(`ブラウザ倍率 ${level.percent}% で固定UIが重なります: ${level.state.fixedOverlaps.join(', ')}`);
      if (!level.overlap.noTopbarPanelOverlap) failures.push(`ブラウザ倍率 ${level.percent}% で topbar とパネルが重なります`);
      if (level.state.pageHorizontalOverflow || level.overlap.horizontalOverflow) failures.push(`ブラウザ倍率 ${level.percent}% でページが横方向へはみ出します`);
      if (!level.state.labelReadable) failures.push(`ブラウザ倍率 ${level.percent}% でノードラベルが読める大きさを下回ります`);
    }
  }

  const responsive = after.responsive;
  if (!responsive || responsive.viewports.length !== RESPONSIVE_VIEWPORTS.length) {
    failures.push(`レスポンシブ幅 ${RESPONSIVE_VIEWPORTS.map((viewport) => viewport.width).join('/')}px の検証を完了できません`);
  } else {
    for (const result of responsive.viewports) {
      const label = `${result.viewport.width}x${result.viewport.height}`;
      if (!result.canvasReady) failures.push(`レスポンシブ ${label}: ER図を描画できません`);
      if (!result.scaleState.controlsUsable) failures.push(`レスポンシブ ${label}: ズーム/全体表示ボタンを操作できません`);
      if (!result.scaleState.fixedItemsWithinViewport) failures.push(`レスポンシブ ${label}: 固定UIが画面外にはみ出します`);
      if (!result.scaleState.noFixedControlOverlap) failures.push(`レスポンシブ ${label}: 固定UIが重なります: ${result.scaleState.fixedOverlaps.join(', ')}`);
      if (!result.overlap.noTopbarPanelOverlap) failures.push(`レスポンシブ ${label}: topbar とパネルが重なります`);
      if (result.scaleState.pageHorizontalOverflow || result.overlap.horizontalOverflow) failures.push(`レスポンシブ ${label}: ページが横方向へはみ出します`);
    }
  }

  assert.equal(failures.length, 0, `after ER 図回帰検査に失敗しました:\n - ${failures.join('\n - ')}`);
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function passMark(value) {
  if (value === null || value === undefined) return '<span class="na">未実施</span>';
  return value ? '<span class="pass">PASS</span>' : '<span class="fail">FAIL</span>';
}

function comparisonHtml(summary) {
  const metric = (result) => ({
    errors: runtimeErrors(result).length === 0,
    desktopCanvas: result.desktop.canvasReady,
    mobileCanvas: result.mobile.canvasReady,
    fullDensity: !!result.desktop.fullDensity?.optionalFieldFound,
    safeName: result.desktop.security.markerValue === 0
      && result.desktop.security.maliciousImageCount === 0
      && result.desktop.security.maliciousScriptCount === 0,
    layout: result.unknownLayout.normalized,
    desktopOverlap: result.desktop.overlap.noTopbarPanelOverlap,
    mobileOverlap: result.mobile.overlap.noTopbarPanelOverlap,
    fallback: result.cdnFallback.visible,
    diagramZoom: result.diagramZoom
      ? result.diagramZoom.levels.every((level) => level.zoomReached && level.state.controlsUsable)
      : null,
    browserZoom: result.browserZoom
      ? result.browserZoom.levels.every((level) => level.canvasReady && level.state.controlsUsable
        && level.state.noFixedControlOverlap && !level.state.pageHorizontalOverflow)
      : null,
    responsive: result.responsive
      ? result.responsive.viewports.every((viewport) => viewport.canvasReady
        && viewport.scaleState.controlsUsable && viewport.scaleState.fixedItemsWithinViewport
        && viewport.scaleState.noFixedControlOverlap && viewport.overlap.noTopbarPanelOverlap
        && !viewport.scaleState.pageHorizontalOverflow && !viewport.overlap.horizontalOverflow)
      : null
  });
  const before = metric(summary.before);
  const after = metric(summary.after);
  const rows = [
    ['pageerror / console.error 0', 'errors'],
    ['Desktop canvas', 'desktopCanvas'],
    ['Mobile canvas', 'mobileCanvas'],
    ['詳細密度で任意項目を再表示', 'fullDensity'],
    ['悪意のあるアプリ名を無害化', 'safeName'],
    ['未知の hash レイアウトを正規化', 'layout'],
    ['Desktop topbar / panel 非重複', 'desktopOverlap'],
    ['Mobile topbar / panel 非重複', 'mobileOverlap'],
    ['CDN ブロック時の案内', 'fallback'],
    [`図ズーム ${DIAGRAM_ZOOM_LEVELS.join(' / ')}% と fit/reset`, 'diagramZoom'],
    ['ブラウザ倍率 80〜200%', 'browserZoom'],
    [`レスポンシブ幅 ${RESPONSIVE_VIEWPORTS.map((viewport) => viewport.width).join(' / ')}px`, 'responsive']
  ].map(([label, key]) => `<tr><th>${escapeHtml(label)}</th><td>${passMark(before[key])}</td><td>${passMark(after[key])}</td></tr>`).join('');
  const shot = (variant, kind, width, height) => `${variant}-${kind}-${width}x${height}.png`;
  const diagramZoomLevels = summary.after.diagramZoom?.levels || [];
  const browserZoomLevels = summary.after.browserZoom?.levels || [];
  const responsiveViewports = summary.after.responsive?.viewports || [];
  const scaleRows = [
    ...diagramZoomLevels.map((level) => ({ type: '図', percent: level.percent, state: level.state, screenshot: level.screenshot })),
    ...browserZoomLevels.map((level) => ({ type: 'ブラウザ', percent: level.percent, state: level.state, screenshot: level.screenshot }))
  ].map((level) => `<tr><th>${escapeHtml(level.type)} ${level.percent}%</th><td>${escapeHtml(level.state.zoomText || '-')}</td><td>${escapeHtml(level.state.effectiveLabelPx)}px</td><td>${escapeHtml(level.state.labelReadability)}</td><td>${passMark(level.state.controlsUsable)}</td><td>${passMark(level.state.noFixedControlOverlap)}</td><td>${passMark(!level.state.pageHorizontalOverflow)}</td></tr>`).join('');
  const scaleCards = (levels, label) => levels.map((level) => `<section class="card"><h2>${escapeHtml(label)} ${level.percent}%</h2><img src="${escapeHtml(level.screenshot)}" alt="${escapeHtml(label)} ${level.percent}%"></section>`).join('');
  const responsiveRows = responsiveViewports.map((result) => `<tr><th>${result.viewport.width} × ${result.viewport.height}</th><td>${passMark(result.canvasReady)}</td><td>${passMark(result.scaleState.controlsUsable)}</td><td>${passMark(result.scaleState.fixedItemsWithinViewport && result.scaleState.noFixedControlOverlap && result.overlap.noTopbarPanelOverlap)}</td><td>${passMark(!result.scaleState.pageHorizontalOverflow && !result.overlap.horizontalOverflow)}</td></tr>`).join('');
  const responsiveCards = responsiveViewports.map((result) => `<section class="card"><h2>${result.viewport.width} × ${result.viewport.height}</h2><img src="${escapeHtml(result.screenshot)}" alt="レスポンシブ ${result.viewport.width} × ${result.viewport.height}"></section>`).join('');
  const details = escapeHtml(JSON.stringify(summary, null, 2));
  return `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>ER図 before / after 比較</title>
<style>
body{margin:0;padding:24px;background:#f4f7fb;color:#172033;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","Noto Sans JP",sans-serif}
main{max-width:1500px;margin:auto}h1{font-size:24px;margin:0 0 8px}.lead{color:#5b6475;margin:0 0 20px}
table{width:100%;border-collapse:collapse;background:#fff;border:1px solid #dfe5ee;border-radius:12px;overflow:hidden;margin-bottom:22px}
th,td{padding:10px 12px;border-bottom:1px solid #e9edf3;text-align:left}thead th{background:#eef3f8}.pass{color:#08783d;font-weight:800}.fail{color:#bd2130;font-weight:800}.na{color:#6b7280;font-weight:700}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin:12px 0 28px}.scale-grid{grid-template-columns:repeat(auto-fit,minmax(260px,1fr))}.card{background:#fff;border:1px solid #dfe5ee;border-radius:14px;padding:12px;min-width:0}.card h2{font-size:16px;margin:0 0 10px}.card img{display:block;width:100%;height:auto;border:1px solid #e2e7ef;border-radius:8px}
.mobile img{width:min(390px,100%);margin:auto}details{background:#fff;border:1px solid #dfe5ee;border-radius:12px;padding:12px}pre{white-space:pre-wrap;overflow-wrap:anywhere;font-size:11px}
@media(max-width:760px){body{padding:12px}.grid{grid-template-columns:1fr}th,td{padding:8px;font-size:12px}}
</style>
</head>
<body><main>
<h1>ER図 before / after 比較</h1>
<p class="lead">before ${escapeHtml(summary.beforeHash)} / after ${escapeHtml(summary.afterHash)}</p>
<table><thead><tr><th>回帰項目</th><th>Before</th><th>After</th></tr></thead><tbody>${rows}</tbody></table>
<h2>Desktop 1440 × 900</h2>
<div class="grid"><section class="card"><h2>Before</h2><img src="${shot('before', 'desktop', 1440, 900)}" alt="Before desktop"></section><section class="card"><h2>After</h2><img src="${shot('after', 'desktop', 1440, 900)}" alt="After desktop"></section></div>
<h2>Mobile 390 × 844</h2>
<div class="grid mobile"><section class="card"><h2>Before</h2><img src="${shot('before', 'mobile', 390, 844)}" alt="Before mobile"></section><section class="card"><h2>After</h2><img src="${shot('after', 'mobile', 390, 844)}" alt="After mobile"></section></div>
<h2>倍率別の操作性・可読性</h2>
<table><thead><tr><th>条件</th><th>図の実倍率</th><th>実効文字サイズ</th><th>可読性</th><th>操作可能</th><th>固定UI非重複</th><th>横はみ出しなし</th></tr></thead><tbody>${scaleRows}</tbody></table>
<h2>図ズーム ${DIAGRAM_ZOOM_LEVELS.join(' / ')}%</h2>
<div class="grid scale-grid">${scaleCards(diagramZoomLevels, '図ズーム')}</div>
<h2>ブラウザ倍率 80 / 125 / 150 / 200%</h2>
<div class="grid scale-grid">${scaleCards(browserZoomLevels, 'ブラウザ倍率')}</div>
<h2>レスポンシブ表示</h2>
<table><thead><tr><th>Viewport</th><th>描画</th><th>操作</th><th>固定UI</th><th>横はみ出しなし</th></tr></thead><tbody>${responsiveRows}</tbody></table>
<div class="grid scale-grid">${responsiveCards}</div>
<h2>CDN ブロック時</h2>
<div class="grid"><section class="card"><h2>Before</h2><img src="before-cdn-fallback.png" alt="Before CDN fallback"></section><section class="card"><h2>After</h2><img src="after-cdn-fallback.png" alt="After CDN fallback"></section></div>
<details><summary>検査結果 JSON</summary><pre>${details}</pre></details>
</main></body></html>`;
}

async function main() {
  if (hasFlag('--help') || hasFlag('-h')) {
    printHelp();
    return;
  }

  const beforeRef = argValue('--before-ref', 'HEAD');
  const beforeFile = argValue('--before-file');
  const afterFile = resolveFromRoot(argValue('--after-file'), DEFAULT_AFTER);
  const outDir = resolveFromRoot(argValue('--out'), DEFAULT_OUT);
  const browserName = argValue('--browser', process.env.KUS_ER_BROWSER || 'chrome');
  const headed = hasFlag('--headed');

  const beforeSource = readBeforeBundle(beforeRef, beforeFile);
  const afterSource = fs.readFileSync(afterFile, 'utf8');
  fs.mkdirSync(outDir, { recursive: true });

  const fixture = buildMockFixture();
  const localVendors = discoverLocalVendors();
  console.log(`[ER compare] local vendor: ${Object.keys(localVendors).join(', ') || 'なし（CDN を使用）'}`);
  const browser = await launchBrowser(browserName, headed);
  let summary;
  try {
    const before = await runVariant(browser, 'before', beforeSource, clone(fixture), localVendors, outDir, false);
    const after = await runVariant(browser, 'after', afterSource, clone(fixture), localVendors, outDir, true);
    summary = {
      generatedAt: new Date().toISOString(),
      beforeRef: beforeFile ? resolveFromRoot(beforeFile) : beforeRef,
      afterFile,
      browser: browserName,
      beforeHash: bundleHash(beforeSource),
      afterHash: bundleHash(afterSource),
      localVendors: Object.keys(localVendors),
      before,
      after
    };
  } finally {
    await browser.close();
  }

  const resultFile = path.join(outDir, 'er-diagram-comparison.json');
  fs.writeFileSync(resultFile, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  fs.writeFileSync(path.join(outDir, 'index.html'), comparisonHtml(summary), 'utf8');
  console.log(`[ER compare] 比較結果: ${path.join(outDir, 'index.html')}`);
  console.log(`[ER compare] 検査 JSON: ${resultFile}`);

  // before の既知不具合は比較材料として記録し、回帰の合否は after だけで決める。
  validateAfter(summary.after);
  console.log('[ER compare] after の回帰検査はすべて PASS しました。');
}

main().catch((error) => {
  console.error(error && error.stack ? error.stack : error);
  process.exitCode = 1;
});
