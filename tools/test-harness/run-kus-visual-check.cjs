'use strict';

const path = require('path');
const { chromium } = require('playwright');

const OUT = path.resolve(__dirname, 'outputs');
const BASE = process.env.KUS_HARNESS_URL || 'http://127.0.0.1:8765/suite-harness.html';
const WIN_CHROME = '/mnt/c/Program Files/Google/Chrome/Application/chrome.exe';

async function boot(page) {
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await page.click('#boot');
  await page.waitForSelector('#kintone-unified-suite-v2', { timeout: 10000 });
  await page.waitForTimeout(1200);
}

async function main() {
  const launchOptions = process.env.KUS_PLAYWRIGHT_EXECUTABLE
    ? { executablePath: process.env.KUS_PLAYWRIGHT_EXECUTABLE, headless: true }
    : (process.platform === 'win32'
      ? { channel: 'chrome', headless: true }
      : { executablePath: WIN_CHROME, headless: true });
  const browser = await chromium.launch(launchOptions);
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') errors.push(`${m.type()}: ${m.text()}`);
  });

  await boot(page);
  await page.screenshot({ path: path.join(OUT, 'kus-playwright-launcher.png'), fullPage: true });
  const launcher = await page.locator('#kintone-unified-suite-v2').evaluate((root) => ({
    box: root.getBoundingClientRect().toJSON(),
    cards: [...root.querySelectorAll('.feature-card')].map((x) => x.textContent.trim()),
    hasHiddenBad: [...root.querySelectorAll('.feature-card')].some((x) => /JS\/CSS設定|設計書|設定一括取得|レコード管理/.test(x.textContent || '')),
    overflowX: root.scrollWidth > root.clientWidth + 2
  }));

  await page.click('[data-feature="reflect"]');
  await page.waitForSelector('[data-pane="reflect"].active', { timeout: 5000 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(OUT, 'kus-playwright-reflect.png'), fullPage: true });
  const reflect = await page.locator('#kintone-unified-suite-v2').evaluate((root) => {
    const pane = root.querySelector('[data-pane="reflect"]');
    const hero = pane && pane.querySelector('.reflect-hero-card');
    const danger = pane && pane.querySelector('.reflect-danger-zone');
    const checklist = pane && pane.querySelector('.reflect-apply-checklist__items');
    const rootRect = root.getBoundingClientRect();
    const dangerRect = danger && danger.getBoundingClientRect();
    return {
      activeTab: root.querySelector('.tab.active')?.textContent?.trim() || '',
      heroHeight: hero ? Math.round(hero.getBoundingClientRect().height) : 0,
      checklistColumns: checklist ? getComputedStyle(checklist).gridTemplateColumns : '',
      dangerVisibleInViewport: !!dangerRect && dangerRect.top >= rootRect.top && dangerRect.bottom <= rootRect.bottom,
      dangerTop: dangerRect ? Math.round(dangerRect.top - rootRect.top) : null,
      overflowX: root.scrollWidth > root.clientWidth + 2
    };
  });
  await page.click('[data-act="openReflectScopePicker"]');
  await page.waitForSelector('#u_scopePickerModal:not([hidden])', { timeout: 5000 });
  const reflectScopePickerBefore = await page.locator('#u_scopePickerModal').evaluate((modal) => ({
    hidden: modal.hidden,
    rowCount: modal.querySelectorAll('[data-sidebar-sec]').length
  }));
  await page.locator('#u_scopePickerModal [data-sidebar-sec]').first().click();
  await page.waitForTimeout(200);
  const reflectScopePickerAfterRow = await page.locator('#u_scopePickerModal').evaluate((modal) => ({
    hidden: modal.hidden,
    active: modal.querySelector('[data-sidebar-sec].active')?.textContent?.trim() || ''
  }));
  await page.locator('#u_scopePickerModal .kus-scope-tree-filter [data-act="kusScopeNone"]').click();
  await page.waitForTimeout(200);
  const reflectScopePickerAfterBulk = await page.locator('#u_scopePickerModal').evaluate((modal) => ({
    hidden: modal.hidden,
    checkedCount: modal.querySelectorAll('#u_reflectSidebarSections [data-apply-scope]:checked').length,
    applyDiffOnly: modal.querySelector('#u_applyDiffOnly')?.checked ?? null
  }));
  reflect.scopePicker = {
    before: reflectScopePickerBefore,
    afterRow: reflectScopePickerAfterRow,
    afterBulk: reflectScopePickerAfterBulk
  };
  await page.click('#u_scopePickerModal .scope-picker-close');
  await page.waitForFunction(() => document.querySelector('#u_scopePickerModal')?.hidden === true, null, { timeout: 5000 });

  await page.click('.h-back');
  await page.waitForSelector('#kintone-unified-suite-v2.screen-launcher', { timeout: 5000 });
  await page.click('[data-feature="field"]');
  await page.waitForSelector('[data-pane="field"].active', { timeout: 5000 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(OUT, 'kus-playwright-field.png'), fullPage: true });
  const field = await page.locator('#kintone-unified-suite-v2').evaluate((root) => {
    const pane = root.querySelector('[data-pane="field"]');
    const body = pane && pane.querySelector('.diff-fold--field-json .diff-fold-body');
    return {
      notice: body ? getComputedStyle(body, '::before').content : '',
      overflowX: root.scrollWidth > root.clientWidth + 2,
      activeTab: root.querySelector('.tab.active')?.textContent?.trim() || ''
    };
  });

  await page.click('.h-back');
  await page.waitForSelector('#kintone-unified-suite-v2.screen-launcher', { timeout: 5000 });
  await page.click('[data-act="setLauncherGroup"][data-group="data"]');
  await page.waitForTimeout(300);
  await page.click('[data-feature="apiTester"]');
  await page.waitForSelector('[data-pane="apiTester"].active', { timeout: 5000 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(OUT, 'kus-playwright-api.png'), fullPage: true });
  const api = await page.locator('#kintone-unified-suite-v2').evaluate((root) => {
    const layout = root.querySelector('.api-tester-layout');
    return {
      layout: layout ? getComputedStyle(layout).gridTemplateColumns : '',
      sideVisible: !!root.querySelector('.api-tester-side'),
      overflowX: root.scrollWidth > root.clientWidth + 2,
      activeTab: root.querySelector('.tab.active')?.textContent?.trim() || ''
    };
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await boot(page);
  await page.screenshot({ path: path.join(OUT, 'kus-playwright-mobile-launcher.png'), fullPage: true });
  const mobile = await page.locator('#kintone-unified-suite-v2').evaluate((root) => {
    const actions = root.querySelector('.h-actions');
    const cmdRow = root.querySelector('.launcher-command-row');
    return {
      box: root.getBoundingClientRect().toJSON(),
      overflowX: root.scrollWidth > root.clientWidth + 2,
      bodyOverflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth + 2,
      hActionsFlexWrap: actions ? getComputedStyle(actions).flexWrap : '',
      hActionsOverflowX: actions ? getComputedStyle(actions).overflowX : '',
      cmdRowDirection: cmdRow ? getComputedStyle(cmdRow).flexDirection : ''
    };
  });

  await page.click('[data-feature="reflect"]');
  await page.waitForSelector('[data-pane="reflect"].active', { timeout: 5000 });
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(OUT, 'kus-playwright-reflect-mobile.png'), fullPage: true });

  await browser.close();
  console.log(JSON.stringify({ launcher, reflect, field, api, mobile, errors }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
