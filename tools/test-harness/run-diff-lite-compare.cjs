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

function containsObjectKey(value, forbiddenKeys) {
  if (!value || typeof value !== 'object') return false;
  if (Array.isArray(value)) return value.some((item) => containsObjectKey(item, forbiddenKeys));
  return Object.keys(value).some((key) => forbiddenKeys.has(key) || containsObjectKey(value[key], forbiddenKeys));
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

async function firstVisibleLocator(locator) {
  const count = await locator.count();
  for (let index = 0; index < count; index += 1) {
    const candidate = locator.nth(index);
    if (await candidate.isVisible().catch(() => false)) return candidate;
  }
  return null;
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
    appHeader: document.querySelector('.topbar-apps,[data-compare-header],.topbar')?.textContent?.replace(/\s+/g, ' ').trim() || '',
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

  if (variant === 'after') {
    const reportTopbar = await firstVisibleLocator(page.locator('[data-compare-header],.topbar'));
    assert.ok(reportTopbar, 'after: 比較コンテキストの topbar が見つかりません');
    const desktopHeader = await reportTopbar.evaluate((topbar, ids) => {
      const visible = (element) => {
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
      };
      const descendants = [...topbar.querySelectorAll('*')].filter(visible);
      const lane = (side, english, ownId, otherId) => {
        const explicit = topbar.querySelector(
          '[data-compare-side="' + side + '"],[data-compare-lane="' + side + '"],.topbar-lane--' + side
        );
        const explicitText = String(explicit?.textContent || '').replace(/\s+/g, ' ').trim();
        if (explicit && visible(explicit) && explicitText.includes(ownId) && !explicitText.includes(otherId)) return explicit;
        return descendants.find((element) => {
          const text = String(element.textContent || '').replace(/\s+/g, ' ').trim();
          return text.includes(english) && text.includes(ownId) && !text.includes(otherId);
        });
      };
      const before = lane('before', 'BEFORE', ids.source, ids.target);
      const after = lane('after', 'AFTER', ids.target, ids.source);
      return {
        before: !!before,
        after: !!after,
        order: !!before && !!after && (before.compareDocumentPosition(after) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0
      };
    }, { source: SOURCE_APP_ID, target: TARGET_APP_ID });
    assert.equal(desktopHeader.before, true, 'after: topbar に構造化された BEFORE 比較元レーンがありません');
    assert.equal(desktopHeader.after, true, 'after: topbar に構造化された AFTER 比較先レーンがありません');
    assert.equal(desktopHeader.order, true, 'after: topbar の BEFORE/AFTER 順序が逆です');

    const progressbar = await firstVisibleLocator(page.locator('[role="progressbar"]'));
    assert.ok(progressbar, 'after: レビュー進捗の progressbar が見つかりません');
    const initialProgress = {
      now: Number(await progressbar.getAttribute('aria-valuenow')),
      max: Number(await progressbar.getAttribute('aria-valuemax'))
    };
    assert.ok(Number.isFinite(initialProgress.now) && initialProgress.now >= 0, 'after: progressbar の aria-valuenow が不正です');
    assert.ok(Number.isFinite(initialProgress.max) && initialProgress.max > 0, 'after: progressbar の aria-valuemax が不正です');

    const firstDesktopRow = await firstVisibleLocator(page.locator('#main [data-diff-row-key], #main .drow'));
    assert.ok(firstDesktopRow, 'after: デスクトップ初期表示に差分行がありません');
    const firstDesktopRowInViewport = await firstDesktopRow.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return rect.top < window.innerHeight && rect.bottom > 0;
    });
    assert.equal(firstDesktopRowInViewport, true, 'after: デスクトップ初期viewportで最初の差分行が見えません');
    await page.screenshot({ path: path.join(outDir, 'after-report-v3.png'), fullPage: false, animations: 'disabled' });

    // 0件になっても適用条件を画面内から解除でき、一覧へ復帰できること。
    const searchInput = await firstVisibleLocator(page.locator('#search,[role="searchbox"],input[type="search"]'));
    assert.ok(searchInput, 'after: HTMLレポートの検索欄が見つかりません');
    const filterStatus = page.locator('#reportFilterStatus');
    assert.equal(await filterStatus.count(), 1, 'after: 永続的な検索結果live regionがありません');
    await page.evaluate(() => {
      const main = document.getElementById('main');
      const input = document.getElementById('search');
      window.__codexReportRenderBatches = 0;
      if (window.__codexReportObserver) window.__codexReportObserver.disconnect();
      window.__codexReportObserver = new MutationObserver(() => { window.__codexReportRenderBatches += 1; });
      window.__codexReportObserver.observe(main, { childList: true });
      const finalValue = '__codex_no_matching_diff__';
      for (let index = 1; index <= finalValue.length; index += 1) {
        input.value = finalValue.slice(0, index);
        input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: finalValue[index - 1] }));
      }
    });
    await page.waitForFunction(() => document.getElementById('main')?.getAttribute('aria-busy') === 'false'
      && /^表示 0件、/.test(document.getElementById('reportFilterStatus')?.textContent || ''), null, { timeout: 5000 });
    const renderBatches = await page.evaluate(() => window.__codexReportRenderBatches);
    assert.ok(renderBatches >= 1 && renderBatches <= 2, `after: 連続検索入力が${renderBatches}回のDOM再描画を発生させました`);
    await page.waitForFunction(() => ![...document.querySelectorAll('#main [data-diff-row-key],#main .drow')].some((element) => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
    }), null, { timeout: 5000 });
    const noResultClear = await firstVisibleLocator(page.locator('[data-clear-filter="search"],[data-clear-filter="all"]'))
      || await firstVisibleLocator(page.getByRole('button', { name: /検索.*解除|一覧条件.*解除|条件.*解除|すべて解除/ }));
    assert.ok(noResultClear, 'after: 0件表示から条件を解除する操作がありません');
    await noResultClear.click();
    await page.waitForFunction(() => [...document.querySelectorAll('#main [data-diff-row-key],#main .drow')].some((element) => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
    }), null, { timeout: 5000 });
    assert.equal(await searchInput.inputValue(), '', 'after: 条件解除後も検索語が残っています');
    assert.match(await filterStatus.textContent(), /^表示 \d+件、全体 \d+件、未確認 \d+件$/, 'after: 条件解除後のlive region文言が不正です');

    // レビュー対象へ移動して「確認して次へ」が確認済み化とフォーカス移動を同時に行うこと。
    let focusedRow = await firstVisibleLocator(page.locator('#main [data-diff-row-key][aria-current="true"],#main .drow--focus'));
    if (!focusedRow) {
      const startReview = await firstVisibleLocator(page.getByRole('button', { name: /レビューを開始|レビュー開始|確認を開始|最初の差分へ/ }));
      if (startReview) {
        await startReview.click();
      } else {
        const nextReview = await firstVisibleLocator(page.locator('[data-review-start],[data-diff-nav="next"]'))
          || await firstVisibleLocator(page.getByRole('button', { name: /次の差分|最初の差分へ/ }));
        assert.ok(nextReview, 'after: レビュー対象へ移動する操作がありません');
        await nextReview.click();
      }
      await page.waitForFunction(() => !!document.querySelector('#main [data-diff-row-key][aria-current="true"],#main .drow--focus'), null, { timeout: 5000 });
      focusedRow = await firstVisibleLocator(page.locator('#main [data-diff-row-key][aria-current="true"],#main .drow--focus'));
    }
    assert.ok(focusedRow, 'after: レビュー開始後も現在行が設定されません');
    let confirmNext = await firstVisibleLocator(focusedRow.locator('[data-review-next]'))
      || await firstVisibleLocator(focusedRow.getByRole('button', { name: /確認して次へ/ }));
    if (!confirmNext) confirmNext = await firstVisibleLocator(page.getByRole('button', { name: /確認して次へ/ }));
    assert.ok(confirmNext, 'after: 「確認して次へ」操作が見つかりません');
    const reviewActionRow = confirmNext.locator('xpath=ancestor::*[@data-diff-row-key or contains(concat(" ", normalize-space(@class), " "), " drow ")][1]');
    const focusedKeyBefore = await reviewActionRow.getAttribute('data-diff-row-key');
    assert.ok(focusedKeyBefore, 'after: 「確認して次へ」の対象行に安定した data-diff-row-key がありません');
    const reviewedStat = page.locator('[data-reviewed-count],#stat-reviewed').first();
    assert.equal(await reviewedStat.count(), 1, 'after: 確認済み件数の表示が見つかりません');
    const reviewedBefore = Number(await reviewedStat.textContent()) || 0;
    const progressBeforeConfirm = Number(await progressbar.getAttribute('aria-valuenow')) || 0;
    await confirmNext.click();
    await page.waitForFunction(({ key, reviewed }) => {
      const current = document.querySelector('#main [data-diff-row-key][aria-current="true"],#main .drow--focus');
      const previous = [...document.querySelectorAll('#main [data-diff-row-key],#main .drow')]
        .find((element) => element.getAttribute('data-diff-row-key') === key);
      const previousReviewed = !!previous && (
        previous.classList.contains('drow--reviewed') ||
        !!previous.querySelector('[data-review-toggle]:checked,[aria-checked="true"]')
      );
      const reviewedCount = Number(document.querySelector('[data-reviewed-count],#stat-reviewed')?.textContent || 0);
      return previousReviewed && reviewedCount > reviewed && current?.getAttribute('data-diff-row-key') !== key;
    }, { key: focusedKeyBefore, reviewed: reviewedBefore }, { timeout: 5000 });
    const focusedKeyAfter = await page.locator('#main [data-diff-row-key][aria-current="true"],#main .drow--focus').first().getAttribute('data-diff-row-key');
    assert.notEqual(focusedKeyAfter, focusedKeyBefore, 'after: 「確認して次へ」で次の行へ移動しません');
    assert.ok((Number(await progressbar.getAttribute('aria-valuenow')) || 0) >= progressBeforeConfirm, 'after: 確認後にレビュー進捗が後退しました');

    // 確認状態をJSONへ保存し、解除後に読み戻せること。別レポート用JSONは原子的に拒否すること。
    const reviewStateSave = page.locator('#reviewStateSaveBtn');
    const reviewStateFile = page.locator('#reviewStateFile');
    assert.equal(await reviewStateSave.count(), 1, 'after: レビュー状態JSON保存ボタンがありません');
    assert.equal(await reviewStateFile.count(), 1, 'after: レビュー状態JSON読込inputがありません');
    const savedReviewCount = Number(await reviewedStat.textContent()) || 0;
    assert.ok(savedReviewCount > 0, 'after: レビュー状態保存前の確認済み件数が0です');
    const reviewStatePath = path.join(outDir, 'after-review-state.json');
    const reviewDownloadPromise = page.waitForEvent('download', { timeout: 10000 });
    await reviewStateSave.click();
    const reviewDownload = await reviewDownloadPromise;
    await reviewDownload.saveAs(reviewStatePath);
    const reviewPayload = JSON.parse(fs.readFileSync(reviewStatePath, 'utf8'));
    assert.equal(reviewPayload.kind, 'kintone-diff-review-state', 'after: レビュー状態JSONのkindが不正です');
    assert.equal(reviewPayload.version, 1, 'after: レビュー状態JSONのversionが不正です');
    assert.equal(reviewPayload.reviewedKeys.length, savedReviewCount, 'after: レビュー状態JSONの確認済み件数が画面と一致しません');
    assert.ok(reviewPayload.reviewedKeys.every((key) => /^review-v1-/.test(key) && !/^d\d+$/.test(key)), 'after: レビュー状態JSONが順番依存_idを保存しています');

    const checkedReview = page.locator('#main [data-review-toggle]:checked').first();
    assert.equal(await checkedReview.count(), 1, 'after: 保存後に解除できる確認済み行がありません');
    await checkedReview.click();
    await page.waitForFunction((count) => Number(document.querySelector('#stat-reviewed')?.textContent || 0) < count, savedReviewCount, { timeout: 5000 });
    await reviewStateFile.setInputFiles(reviewStatePath);
    await page.waitForFunction((count) => Number(document.querySelector('#stat-reviewed')?.textContent || 0) === count, savedReviewCount, { timeout: 5000 });
    await page.waitForFunction(() => /読み込みました/.test(document.querySelector('#reviewStateStatus')?.textContent || ''), null, { timeout: 5000 });

    const mismatchPath = path.join(outDir, 'after-review-state-mismatch.json');
    fs.writeFileSync(mismatchPath, JSON.stringify({ ...reviewPayload, reportFingerprint: `${reviewPayload.reportFingerprint}-mismatch` }, null, 2));
    await reviewStateFile.setInputFiles(mismatchPath);
    await page.waitForFunction(() => /別の差分レポート/.test(document.querySelector('#reviewStateStatus')?.textContent || ''), null, { timeout: 5000 });
    assert.equal(Number(await reviewedStat.textContent()) || 0, savedReviewCount, 'after: 不一致JSONで現在のレビュー状態が変更されました');
    await reviewStateFile.setInputFiles(reviewStatePath);
    await page.waitForFunction(() => /読み込みました/.test(document.querySelector('#reviewStateStatus')?.textContent || ''), null, { timeout: 5000 });
    await page.waitForFunction(() => !document.querySelector('#reportToast.is-visible'), null, { timeout: 5000 });

    // 集中表示は現在行だけへ絞り、解除すると一覧へ戻ること。
    const focusToggle = await firstVisibleLocator(page.getByRole('button', { name: /集中表示/ }));
    assert.ok(focusToggle, 'after: 集中表示の切替が見つかりません');
    const visibleRowsBeforeFocus = await page.locator('#main [data-diff-row-key]:visible,#main .drow:visible').count();
    await focusToggle.click();
    await page.waitForTimeout(50);
    const focusState = await page.evaluate(() => {
      const control = [...document.querySelectorAll('button,[role="button"]')].find((element) => /集中表示|一覧表示/.test(element.textContent || ''));
      const root = document.querySelector('#main')?.closest('[data-focus-mode],.focus-mode,.is-focus-mode') || document.body;
      const context = document.querySelector('.focus-context');
      const contextRect = context?.getBoundingClientRect();
      const contextStyle = context ? getComputedStyle(context) : null;
      return {
        pressed: control?.getAttribute('aria-pressed') || '',
        marker: `${root.getAttribute('data-focus-mode') || ''} ${root.className || ''}`,
        contextVisible: !!context && !!contextRect && contextRect.width > 0 && contextRect.height > 0
          && contextStyle?.display !== 'none' && contextStyle?.visibility !== 'hidden',
        contextText: String(context?.textContent || '').replace(/\s+/g, ' ').trim(),
        visibleRows: [...document.querySelectorAll('#main [data-diff-row-key],#main .drow')].filter((element) => {
          const rect = element.getBoundingClientRect();
          const style = getComputedStyle(element);
          return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
        }).length
      };
    });
    assert.ok(focusState.pressed === 'true' || /focus|集中|true/i.test(focusState.marker), 'after: 集中表示を有効にしても状態がDOMへ反映されません');
    assert.equal(focusState.contextVisible, true, 'after: 集中表示で比較対象の文脈帯が見えません');
    assert.match(focusState.contextText, /→/, 'after: 集中表示の文脈帯に比較方向がありません');
    assert.ok(focusState.visibleRows >= 1 && focusState.visibleRows < visibleRowsBeforeFocus, 'after: 集中表示で現在行へ絞られません');
    await page.screenshot({ path: path.join(outDir, 'after-report-v3-focus.png'), fullPage: false, animations: 'disabled' });
    const focusExit = await firstVisibleLocator(page.getByRole('button', { name: /一覧表示|集中表示を終了|集中表示/ }));
    assert.ok(focusExit, 'after: 集中表示を解除する操作がありません');
    await focusExit.click();
    await page.waitForFunction((minimum) => [...document.querySelectorAll('#main [data-diff-row-key],#main .drow')].filter((element) => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
    }).length >= minimum, Math.min(2, visibleRowsBeforeFocus), { timeout: 5000 });

    // 表示密度を compact へ切り替え、行の余白またはDOM状態が縮小側へ変わること。
    const densitySelect = await firstVisibleLocator(page.getByRole('combobox', { name: /密度/ }));
    const firstRowForDensity = page.locator('#main [data-diff-row-key],#main .drow').first();
    const paddingBeforeDensity = await firstRowForDensity.evaluate((element) => parseFloat(getComputedStyle(element).paddingTop) || 0);
    let restoreDensity = async () => {};
    let compactControl = null;
    if (densitySelect) {
      const originalDensity = await densitySelect.inputValue();
      const compactValue = await densitySelect.locator('option').evaluateAll((options) => {
        const option = options.find((item) => /compact|コンパクト/i.test(`${item.value} ${item.textContent || ''}`));
        return option?.value || '';
      });
      assert.ok(compactValue, 'after: 密度選択にコンパクト設定がありません');
      await densitySelect.selectOption(compactValue);
      restoreDensity = async () => { await densitySelect.selectOption(originalDensity); };
    } else {
      const compactButton = await firstVisibleLocator(page.locator('[data-density-toggle],[data-density="compact"]'))
        || await firstVisibleLocator(page.getByRole('button', { name: /密度.*(?:標準|コンパクト)|コンパクト/ }));
      assert.ok(compactButton, 'after: コンパクト密度へ切り替える操作がありません');
      compactControl = compactButton;
      await compactButton.click();
      restoreDensity = async () => {
        if (await compactButton.isVisible().catch(() => false)) await compactButton.click();
      };
    }
    await page.waitForTimeout(50);
    const compactState = await page.evaluate(() => `${document.body.getAttribute('data-density') || ''} ${document.body.className || ''} ${document.querySelector('#main')?.className || ''}`);
    const paddingAfterDensity = await firstRowForDensity.evaluate((element) => parseFloat(getComputedStyle(element).paddingTop) || 0);
    const compactPressed = compactControl ? await compactControl.getAttribute('aria-pressed') : '';
    assert.ok(compactPressed === 'true' || /compact|コンパクト/i.test(compactState) || paddingAfterDensity < paddingBeforeDensity, 'after: コンパクト密度がDOMまたは行余白へ反映されません');
    await page.screenshot({ path: path.join(outDir, 'after-report-v3-compact.png'), fullPage: false, animations: 'disabled' });
    await restoreDensity();

    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(100);
    const mobileReport = await page.evaluate(() => {
      const toggle = document.querySelector('#mobileSidebarToggle');
      const panels = document.querySelector('#sidebarPanels');
      const lanes = document.querySelector('.val-inline--lanes');
      const header = [...document.querySelectorAll('[data-mobile-header],aside .sb-head,.topbar')].find((element) => {
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
      });
      const badge = [...document.querySelectorAll('[data-section-badge],.header-badge')].find((element) => {
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
      });
      const badgeRect = badge?.getBoundingClientRect();
      const badgeStyle = badge ? getComputedStyle(badge) : null;
      const firstSection = document.querySelector('#main .sec-head');
      const firstSectionRect = firstSection?.getBoundingClientRect();
      const toast = document.querySelector('#reportToast.is-visible');
      const toastRect = toast?.getBoundingClientRect();
      const toggleRect = toggle?.getBoundingClientRect();
      const overlaps = (a, b) => !!a && !!b && a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
      const aboveFoldCandidates = [
        ...document.querySelectorAll('#main .path-main,#main [data-row-heading],#main .drow-title'),
        ...[...document.querySelectorAll('button')].filter((button) => /レビューを開始|レビュー開始|確認を開始/.test(button.textContent || ''))
      ];
      return {
        toggleVisible: !!toggle && getComputedStyle(toggle).display !== 'none',
        expanded: toggle?.getAttribute('aria-expanded') || '',
        panelsVisible: !!panels && (() => {
          const rect = panels.getBoundingClientRect();
          const style = getComputedStyle(panels);
          return rect.width > 0 && rect.height > 0 && rect.right > 0 && rect.left < window.innerWidth
            && rect.bottom > 0 && rect.top < window.innerHeight
            && style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity || 1) > 0;
        })(),
        laneColumns: lanes ? getComputedStyle(lanes).gridTemplateColumns : '',
        headerHeight: header?.getBoundingClientRect().height || 0,
        badgeHorizontal: !!badge && !!badgeRect && badgeRect.width > badgeRect.height && badgeStyle?.whiteSpace === 'nowrap',
        firstSectionVisible: !!firstSectionRect && firstSectionRect.top < window.innerHeight && firstSectionRect.bottom > 0,
        toastOverlapsHeaderControl: overlaps(toastRect, toggleRect),
        firstReviewTargetVisible: aboveFoldCandidates.some((element) => {
          const rect = element.getBoundingClientRect();
          const style = getComputedStyle(element);
          return rect.top < window.innerHeight && rect.bottom > 0 && rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
        }),
        horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 2 || document.body.scrollWidth > document.body.clientWidth + 2
      };
    });
    // Keep a visual artifact even when a responsive assertion below fails.
    await page.screenshot({ path: path.join(outDir, 'after-report-mobile.png'), fullPage: false, animations: 'disabled' });
    await page.screenshot({ path: path.join(outDir, 'after-report-v3-mobile.png'), fullPage: false, animations: 'disabled' });
    assert.equal(mobileReport.toggleVisible, true, 'after: mobile filter/output toggle is not visible');
    assert.equal(mobileReport.expanded, 'false', 'after: mobile sidebar starts expanded');
    assert.equal(mobileReport.panelsVisible, false, 'after: mobile drawer is visually open initially');
    assert.ok(mobileReport.headerHeight > 0 && mobileReport.headerHeight <= 160, `after: mobile header is not compact: ${mobileReport.headerHeight}px`);
    assert.equal(mobileReport.badgeHorizontal, true, 'after: mobile section badge wraps vertically');
    assert.equal(mobileReport.firstSectionVisible, true, 'after: mobile初期viewportに最初のセクション見出しがありません');
    assert.equal(mobileReport.toastOverlapsHeaderControl, false, 'after: mobileトーストが絞り込み操作を覆っています');
    assert.equal(mobileReport.firstReviewTargetVisible, true, 'after: mobile初期viewportに最初の行見出しまたはレビュー開始CTAがありません');
    assert.equal(mobileReport.horizontalOverflow, false, 'after: mobile HTML report has horizontal overflow');
    if (mobileReport.laneColumns) assert.ok(!mobileReport.laneColumns.includes(' '), `after: mobile comparison values are not single-column: ${mobileReport.laneColumns}`);
    await page.evaluate(() => window.scrollTo(0, Math.min(120, document.documentElement.scrollHeight - window.innerHeight)));
    await page.waitForTimeout(50);
    const contentFrameBeforeDrawer = await page.locator('.settings-shell').evaluate((element) => ({
      top: element.getBoundingClientRect().top,
      scrollY: window.scrollY,
      innerWidth: window.innerWidth,
      clientWidth: document.documentElement.clientWidth
    }));
    const mobileDrawerToggle = page.locator('#mobileSidebarToggle');
    await mobileDrawerToggle.evaluate((element) => element.click());
    await page.waitForFunction(() => document.querySelector('#mobileSidebarToggle')?.getAttribute('aria-expanded') === 'true');
    const drawerState = await page.evaluate(() => {
      const panels = document.querySelector('#sidebarPanels');
      let drawer = panels?.closest('[role="dialog"],[data-mobile-drawer],.mobile-drawer,aside') || panels;
      for (let candidate = panels; candidate; candidate = candidate.parentElement) {
        if (getComputedStyle(candidate).position === 'fixed') {
          drawer = candidate;
          break;
        }
      }
      const rect = drawer?.getBoundingClientRect();
      const style = drawer ? getComputedStyle(drawer) : null;
      const toast = document.querySelector('#reportToast.is-visible');
      const toastZ = toast ? Number(getComputedStyle(toast).zIndex || 0) : 0;
      const drawerZ = drawer ? Number(style?.zIndex || 0) : 0;
      return {
        overlay: !!drawer && style?.position === 'fixed' && !!rect && rect.width > 0 && rect.height > 0
          && rect.left < window.innerWidth && rect.right > 0 && rect.top < window.innerHeight && rect.bottom > 0,
        coversViewportEdge: !!rect && rect.top <= 1 && rect.right >= window.innerWidth - 1,
        horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 2 || document.body.scrollWidth > document.body.clientWidth + 2,
        toastAboveDrawer: !!toast && toastZ >= drawerZ
      };
    });
    const contentFrameAfterDrawer = await page.locator('.settings-shell').evaluate((element) => ({
      top: element.getBoundingClientRect().top,
      scrollY: window.scrollY,
      innerWidth: window.innerWidth,
      clientWidth: document.documentElement.clientWidth
    }));
    await page.waitForTimeout(100);
    await page.screenshot({ path: path.join(outDir, 'after-report-v3-mobile-drawer.png'), fullPage: false, animations: 'disabled' });
    assert.equal(drawerState.overlay, true, 'after: mobile sidebar is not a fixed overlay/drawer');
    assert.equal(drawerState.coversViewportEdge, true, 'after: mobile drawer does not cover the viewport edge');
    assert.equal(drawerState.toastAboveDrawer, false, 'after: mobileトーストが開いたドロワーより前面に出ています');
    assert.equal(drawerState.horizontalOverflow, false, 'after: opened mobile drawer creates horizontal overflow');
    const drawerContentShift = contentFrameAfterDrawer.top - contentFrameBeforeDrawer.top;
    assert.ok(Math.abs(drawerContentShift) <= 2, `after: drawer open moved report content by ${drawerContentShift}px (${JSON.stringify({ before: contentFrameBeforeDrawer, after: contentFrameAfterDrawer })})`);
    const mobileDrawerClose = await firstVisibleLocator(page.locator('#mobileSidebarToggle'))
      || await firstVisibleLocator(page.getByRole('button', { name: /絞り込みを閉じる|閉じる/ }));
    assert.ok(mobileDrawerClose, 'after: mobile drawer を閉じる操作がありません');
    await mobileDrawerClose.evaluate((element) => element.click());
    await page.waitForFunction(() => document.querySelector('#mobileSidebarToggle')?.getAttribute('aria-expanded') === 'false');
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.waitForTimeout(100);
    dom.v3 = {
      structuredHeader: desktopHeader,
      progressMax: initialProgress.max,
      confirmNext: true,
      reviewStateRoundTrip: true,
      focusMode: true,
      compactDensity: true,
      mobileHeaderHeight: mobileReport.headerHeight,
      mobileDrawerOverlay: drawerState.overlay
    };
  }

  const fieldTab = page.locator('[data-report-tab="settingsLike"]');
  if ((await fieldTab.count()) && (await fieldTab.isEnabled())) {
    await fieldTab.click();
    await page.waitForSelector('#settingsLikeRoot', { state: 'visible', timeout: 10000 });
    await page.waitForTimeout(150);
    await page.screenshot({ path: path.join(outDir, `${variant}-report-fields.png`), fullPage: false, animations: 'disabled' });
    dom.fieldCards = await page.locator('#settingsLikeRoot .sl-item').count();
  } else {
    // 安全共有向け(diffOnly)ではフィールド単位タブを意図的に収録しない。
    // 比較indexの画像参照を切らさないため、現在の安全モード画面を代替保存する。
    await page.screenshot({ path: path.join(outDir, `${variant}-report-fields.png`), fullPage: false, animations: 'disabled' });
    dom.fieldCards = 0;
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
  let profile = null;
  if (variant === 'after') {
    const contextHeader = page.locator('#kus-diff-lite .kus-dl-contextbar');
    assert.equal(await contextHeader.count(), 1, 'after: 固定比較コンテキストが見つかりません');
    assert.match(await contextHeader.textContent(), /BEFORE[\s\S]*AFTER/, 'after: BEFORE/AFTER の比較方向が固定部に表示されません');
    const panelBox = await page.locator('#kus-diff-lite').boundingBox();
    assert.ok(panelBox && panelBox.width >= 600 && panelBox.width <= 660, `after: デスクトップパネル幅が想定外です: ${panelBox?.width}`);
    assert.equal(await page.locator('#kus-diff-lite .kus-dl-sticky').evaluate((element) => getComputedStyle(element).position), 'sticky', 'after: 比較コンテキストが sticky ではありません');

    const typeFilter = page.locator('#kus-diff-lite select[aria-label="結果の種別絞り込み"]');
    await typeFilter.selectOption('changed');
    const changedFilterChip = page.locator('#kus-diff-lite [data-kus-dl-clear-filter="type"]');
    assert.equal(await changedFilterChip.count(), 1, 'after: 有効な種別フィルタが解除可能なチップになっていません');
    assert.match(await changedFilterChip.textContent(), /変更/, 'after: フィルタチップに現在の条件が表示されません');
    await changedFilterChip.click();
    assert.equal(await typeFilter.inputValue(), '', 'after: フィルタチップの1クリック解除が反映されません');
    assert.match(await page.locator('#kus-diff-lite .kus-dl-filter-empty').textContent(), /フィルタなし/, 'after: フィルタ解除後の状態が明示されません');

    const technicalPath = page.locator('#kus-diff-lite details.kus-dl-row__technical').first();
    assert.equal(await technicalPath.count(), 1, 'after: 内部パスの折りたたみ詳細が見つかりません');
    assert.equal(await technicalPath.getAttribute('open'), null, 'after: 内部パスが初期状態で展開されています');
    const longValueToggle = page.locator('#kus-diff-lite [data-kus-dl-value-toggle]').first();
    assert.equal(await longValueToggle.count(), 1, 'after: 長い値の明示的な全文展開ボタンが見つかりません');
    const longValueWrapper = longValueToggle.locator('xpath=../..');
    const collapsedHeight = (await longValueWrapper.boundingBox())?.height || 0;
    await longValueToggle.click();
    assert.equal(await longValueToggle.getAttribute('aria-expanded'), 'true', 'after: 長い値の展開状態が支援技術へ伝わりません');
    assert.match(await longValueToggle.textContent(), /プレビューに戻す/, 'after: 展開後の戻す操作が表示されません');
    const expandedHeight = (await longValueWrapper.boundingBox())?.height || 0;
    assert.ok(expandedHeight > collapsedHeight, 'after: 全文展開後も値領域の高さが増えていません');
    await page.locator('#kus-diff-lite').screenshot({
      path: path.join(outDir, 'after-panel-long-value.png'),
      animations: 'disabled'
    });
    await longValueToggle.click();

    const nextDiffButton = page.getByRole('button', { name: /次の差分 \(J\)/ });
    assert.equal(await nextDiffButton.count(), 1, 'after: 次の差分ナビゲーションが見つかりません');
    await nextDiffButton.click();
    await page.waitForFunction(() => {
      const active = document.activeElement;
      return !!active?.matches?.('#kus-diff-lite .kus-dl-row.is-current[aria-current="true"]');
    }, null, { timeout: 5000 });
    const focusedDiff = await page.evaluate(() => ({
      current: document.querySelectorAll('#kus-diff-lite .kus-dl-row.is-current').length,
      activeIsRow: document.activeElement?.classList.contains('kus-dl-row') || false,
      counter: document.querySelector('#kus-diff-lite .kus-dl-reviewbar__count')?.getAttribute('aria-label') || ''
    }));
    assert.equal(focusedDiff.current, 1, 'after: 現在差分が1行に絞られていません');
    assert.equal(focusedDiff.activeIsRow, true, 'after: 差分移動後に行へ実フォーカスされていません');
    assert.match(focusedDiff.counter, /^1 \/ 全\d+件目/, 'after: 差分位置カウンタが更新されていません');

    await page.getByRole('button', { name: 'すべて折りたたむ' }).click();
    assert.equal(await page.locator('#kus-diff-lite details.kus-dl-section[open]').count(), 0, 'after: 全セクションを折りたためません');
    await page.waitForFunction(() => document.activeElement?.getAttribute('data-kus-dl-sections') === 'collapse', null, { timeout: 5000 });
    await page.keyboard.press('j');
    await page.waitForFunction(() => /^2 \/ 全\d+件目/.test(document.querySelector('#kus-diff-lite .kus-dl-reviewbar__count')?.getAttribute('aria-label') || ''), null, { timeout: 5000 });
    assert.ok(await page.locator('#kus-diff-lite details.kus-dl-section[open]').count() >= 1, 'after: 差分移動先のセクションが自動展開されません');

    await page.getByRole('button', { name: 'すべて展開' }).click();
    const currentIgnore = page.locator('#kus-diff-lite [data-kus-dl-ignore-path]:visible').first();
    const ignoredPath = await currentIgnore.getAttribute('data-kus-dl-ignore-path');
    assert.ok(ignoredPath, 'after: 安定パスを持つ差分に無視操作がありません');
    await currentIgnore.click();
    const ignoreTextarea = page.locator('#kus-diff-lite textarea').first();
    assert.ok((await ignoreTextarea.inputValue()).includes(ignoredPath || ''), 'after: 行の完全パスが無視ルールへ追加されません');

    const density = page.locator('#kus-diff-lite select[aria-label="差分一覧の表示密度"]');
    await density.selectOption('comfortable');
    assert.ok(await result.evaluate((element) => element.classList.contains('kus-dl-result--comfortable')), 'after: 表示密度が結果へ反映されません');
    const layout = page.locator('#kus-diff-lite select[aria-label="差分一覧の比較レイアウト"]');
    await layout.selectOption('stacked');
    assert.ok(await result.evaluate((element) => element.classList.contains('kus-dl-result--stacked')), 'after: 上下比較レイアウトが結果へ反映されません');
    assert.equal(await page.locator('#kus-diff-lite select[aria-label*="影響度"]').count(), 1, 'after: 影響度フィルタが見つかりません');

    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(100);
    const mobileLayout = await page.evaluate(() => {
      const before = document.querySelector('#kus-diff-lite .kus-dl-contextlane--before')?.getBoundingClientRect();
      const after = document.querySelector('#kus-diff-lite .kus-dl-contextlane--after')?.getBoundingClientRect();
      const progress = document.querySelector('#kus-diff-lite .kus-dl-progress')?.getBoundingClientRect();
      const valueColumns = document.querySelector('#kus-diff-lite .kus-dl-row__cols');
      return {
        beforeY: before?.y || 0,
        afterY: after?.y || 0,
        progressY: progress?.y || 0,
        valueGrid: valueColumns ? getComputedStyle(valueColumns).gridTemplateColumns : ''
      };
    });
    assert.ok(Math.abs(mobileLayout.beforeY - mobileLayout.afterY) < 2, 'after: 狭幅で BEFORE/AFTER レーンが同じ段に揃いません');
    assert.ok(mobileLayout.progressY > mobileLayout.beforeY, 'after: 狭幅で進捗が比較レーンの下へ整理されません');
    assert.ok(!mobileLayout.valueGrid.includes(' '), `after: 狭幅で値が1列表示になりません: ${mobileLayout.valueGrid}`);
    await page.locator('#kus-diff-lite').screenshot({
      path: path.join(outDir, 'after-panel-mobile.png'),
      animations: 'disabled'
    });
    await page.setViewportSize({ width: 1365, height: 900 });

    const profileName = page.locator('#kus-diff-lite input[aria-label="比較条件プロファイル名"]');
    await profileName.fill('レビュー用');
    const profileDownloadPromise = page.waitForEvent('download', { timeout: 10000 });
    await page.getByRole('button', { name: '比較条件を保存' }).click();
    const profileDownload = await profileDownloadPromise;
    const profileFile = path.join(outDir, 'after-comparison-profile.json');
    await profileDownload.saveAs(profileFile);
    const profilePayload = JSON.parse(fs.readFileSync(profileFile, 'utf8'));
    assert.equal(profilePayload.kind, 'kintone-diff-comparison-profile', 'after: 比較条件プロファイル種別が不正です');
    assert.equal(profilePayload.name, 'レビュー用', 'after: 比較条件名が保存されません');
    assert.equal(profilePayload.display.density, 'comfortable', 'after: 表示密度がプロファイルへ保存されません');
    assert.equal(profilePayload.display.layout, 'stacked', 'after: 比較レイアウトがプロファイルへ保存されません');
    assert.equal(Object.prototype.hasOwnProperty.call(profilePayload, 'source'), false, 'after: 比較条件に比較元情報が混入しています');
    assert.equal(containsObjectKey(profilePayload, new Set(['appId', 'guestId', 'source', 'target', 'sourceBundle', 'targetBundle', 'sections', 'rows'])), false, 'after: 比較条件にアプリ・設定情報が混入しています');
    profile = { suggestedFilename: profileDownload.suggestedFilename(), file: path.basename(profileFile) };

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

    const profileInput = page.locator('#kus-diff-lite input[type="file"][hidden][accept*="application/json"]');
    assert.equal(await profileInput.count(), 1, 'after: 比較条件プロファイル読込inputが見つかりません');
    await profileInput.setInputFiles(profileFile);
    await page.waitForFunction(() => /再比較してください/.test(document.querySelector('#kus-diff-lite .kus-lp__status-text')?.textContent || ''), null, { timeout: 10000 });
    assert.equal(await layout.inputValue(), 'stacked', 'after: 比較条件読込で比較レイアウトが復元されません');
    assert.equal(await page.locator('#kus-diff-lite .kus-dl-row').count(), 0, 'after: プロファイル読込後に古い差分結果が残っています');
    assert.equal(await xlsxButton.isDisabled(), true, 'after: プロファイル読込後も古い結果をExcel出力できます');
    assert.deepEqual(errors, [], 'after: 新規レビュー/プロファイル/Excel操作でブラウザエラーが発生しました');
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
    profile,
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
