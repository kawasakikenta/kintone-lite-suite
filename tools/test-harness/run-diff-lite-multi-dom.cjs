#!/usr/bin/env node
'use strict';

/**
 * 差分比較 lite の「全比較先を順に比較」DOM 経路に対する回帰ハーネス。
 *
 * 現行 TypeScript を esbuild で一時的にブラウザ向けへ束ね、比較処理だけを
 * 決定的なスタブへ差し替える。以下を実ブラウザ DOM 上で検証する。
 *
 *   1. 比較元バンドルの取得は最初の1回だけで、後続比較へ再利用される
 *   2. 中間の比較先が例外になっても、最後の比較先まで処理が継続する
 *   3. 実行中の二重クリックで比較処理が重複起動しない
 *
 * 実行:
 *   node tools/test-harness/run-diff-lite-multi-dom.cjs
 */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..', '..');
const TOOL_ROOT = path.resolve(ROOT, 'tools', '統合ツール');
const DEFAULT_OUT = path.resolve(ROOT, '.iter-shots', 'diff-lite-multi-dom');

function argValue(name, fallback = '') {
  const index = process.argv.indexOf(name);
  if (index < 0 || index + 1 >= process.argv.length) return fallback;
  return process.argv[index + 1];
}

function hasFlag(name) {
  return process.argv.includes(name);
}

function resolveFromRoot(value, fallback) {
  const raw = value || fallback;
  return path.isAbsolute(raw) ? raw : path.resolve(ROOT, raw);
}

function printHelp() {
  console.log(`Usage: node tools/test-harness/run-diff-lite-multi-dom.cjs [options]

Options:
  --out <dir>       Output directory
  --browser <name>  chrome, msedge, or chromium (default: chrome)
  --headed          Run with a visible browser
  --help            Show this help`);
}

async function buildDomHarnessBundle() {
  const esbuildModule = path.join(TOOL_ROOT, 'node_modules', 'esbuild');
  let esbuild;
  try {
    esbuild = require(esbuildModule);
  } catch (error) {
    throw new Error(`esbuild を読み込めません。tools/統合ツール で npm install を実行してください: ${error.message}`);
  }
  const jsToTsResolver = {
    name: 'multi-dom-js-to-ts',
    setup(build) {
      build.onResolve({ filter: /\.js$/ }, (args) => {
        if (!args.path.startsWith('./') && !args.path.startsWith('../')) return null;
        const base = path.resolve(args.resolveDir, args.path);
        if (fs.existsSync(base)) return null;
        for (const extension of ['.ts', '.tsx']) {
          const candidate = base.replace(/\.js$/, extension);
          if (fs.existsSync(candidate)) return { path: candidate };
        }
        return null;
      });
    }
  };
  const result = await esbuild.build({
    absWorkingDir: TOOL_ROOT,
    entryPoints: [path.resolve(TOOL_ROOT, 'src', 'entries', 'diff-lite-ui.ts')],
    bundle: true,
    write: false,
    format: 'iife',
    globalName: 'DiffLiteHarness',
    platform: 'browser',
    target: ['chrome110'],
    plugins: [jsToTsResolver],
    logLevel: 'silent'
  });
  assert.equal(result.outputFiles.length, 1, 'DOMハーネス用バンドルの生成結果が不正です');
  return result.outputFiles[0].text;
}

async function launchBrowser(browserName, headed) {
  const options = { headless: !headed };
  if (browserName && browserName !== 'chromium') options.channel = browserName;
  try {
    return await chromium.launch(options);
  } catch (error) {
    if (!options.channel) throw error;
    console.warn(`[multi-dom] browser channel fallback: ${browserName}: ${String(error.message || error).split('\n')[0]}`);
    return chromium.launch({ headless: !headed });
  }
}

function collectPageErrors(page) {
  const errors = [];
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`);
  });
  return errors;
}

async function installBrowserFixtures(page) {
  await page.evaluate(() => {
    window.kintone = {
      api: Object.assign(async () => ({}), { url: (resource, preview) => `/k/v1${preview ? '/preview' : ''}${resource}` }),
      app: { getId: () => 101 },
      mobile: { app: { getId: () => 101 } },
      getLoginUser: () => ({ code: 'mock-user', name: 'Mock User' })
    };
    window.alert = () => {};
    window.confirm = () => true;
    window.prompt = () => '';

    // HTMLレポート生成は実行しつつ、回帰テストでは実ファイルをダウンロードしない。
    window.__downloadCount = 0;
    let blobSequence = 0;
    URL.createObjectURL = () => `blob:multi-dom-${++blobSequence}`;
    URL.revokeObjectURL = () => {};
    const nativeAnchorClick = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function click() {
      if (this.download) {
        window.__downloadCount += 1;
        return;
      }
      return nativeAnchorClick.call(this);
    };
  });
}

async function mountWithControlledDiff(page) {
  await page.evaluate(() => {
    const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    const probe = {
      calls: [],
      freshSourceFetches: 0,
      activeCalls: 0,
      maxConcurrentCalls: 0,
      disabledAfterFirstDispatch: null,
      disabledAfterSecondDispatch: null
    };
    window.__multiProbe = probe;

    const makeBundle = (appId) => ({
      appId: String(appId),
      guestId: '',
      preview: false,
      fetchedAt: '2026-08-16T00:00:00.000Z',
      meta: { sectionRevisions: {} },
      sections: {}
    });

    const mountDiffLitePanel = window.DiffLiteHarness?.mountDiffLitePanel;
    if (typeof mountDiffLitePanel !== 'function') throw new Error('mountDiffLitePanel export が見つかりません');
    mountDiffLitePanel(async (opts) => {
      const targetAppId = String(opts?.target?.appId || '');
      const importedSource = opts?.importedSourceBundle || null;
      probe.calls.push({ targetAppId, reusedSource: !!importedSource });
      probe.activeCalls += 1;
      probe.maxConcurrentCalls = Math.max(probe.maxConcurrentCalls, probe.activeCalls);
      try {
        let sourceBundle = importedSource;
        if (!sourceBundle) {
          probe.freshSourceFetches += 1;
          await wait(40);
          sourceBundle = makeBundle(opts?.source?.appId || '101');
          if (typeof opts?.onSourceBundle === 'function') opts.onSourceBundle(sourceBundle);
        }

        // 最初の処理を長めに保ち、実行中の二重クリックを確実に再現する。
        await wait(targetAppId === '202' ? 220 : 35);
        if (targetAppId === '303') throw new Error('synthetic target failure: App 303');

        return {
          rows: [],
          fetchIssues: [],
          sourceBundle,
          targetBundle: makeBundle(targetAppId),
          truncation: null,
          summary: {
            text: `差分比較完了: App ${targetAppId}`,
            counts: { added: 0, removed: 0, changed: 0, moved: 0, same: 0 }
          }
        };
      } finally {
        probe.activeCalls -= 1;
      }
    });
  });
}

async function configureThreeTargets(page) {
  await page.getByLabel('比較元アプリID').fill('101');
  const firstTarget = page.getByLabel('比較先1アプリID');
  await firstTarget.fill('202,303,404');
  await firstTarget.evaluate((element) => element.dispatchEvent(new Event('change', { bubbles: true })));
  await page.waitForFunction(() => document.querySelectorAll('[aria-label^="比較先"][aria-label$="アプリID"]').length === 3);
  const values = await page.locator('[aria-label^="比較先"][aria-label$="アプリID"]').evaluateAll(
    (elements) => elements.map((element) => element.value)
  );
  assert.deepEqual(values, ['202', '303', '404'], '比較先のカンマ分割に失敗しました');
}

async function dispatchDoubleRun(page) {
  await page.evaluate(() => {
    const buttons = [...document.querySelectorAll('#kus-diff-lite button')];
    const runOne = buttons.find((button) => button.textContent.includes('差分比較を実行'));
    const runAll = buttons.find((button) => button.textContent.includes('全比較先を順に比較'));
    if (!runOne || !runAll) throw new Error('比較実行ボタンが見つかりません');
    runAll.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    window.__multiProbe.disabledAfterFirstDispatch = { runOne: runOne.disabled, runAll: runAll.disabled };
    runAll.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    window.__multiProbe.disabledAfterSecondDispatch = { runOne: runOne.disabled, runAll: runAll.disabled };
  });
}

async function inspectResult(page) {
  return page.evaluate(() => {
    const root = document.getElementById('kus-diff-lite');
    const status = root?.querySelector('.kus-lp__status');
    const buttons = [...(root?.querySelectorAll('button') || [])];
    const runOne = buttons.find((button) => button.textContent.includes('差分比較を実行'));
    const runAll = buttons.find((button) => button.textContent.includes('全比較先を順に比較'));
    const rows = [...(root?.querySelectorAll('.kus-dl-multi tbody tr') || [])].map((row) =>
      [...row.querySelectorAll('td')].map((cell) => cell.textContent.replace(/\s+/g, ' ').trim())
    );
    const excelButtons = [...(root?.querySelectorAll('[data-kus-dl-multi-xlsx]') || [])];
    return {
      statusTone: status?.dataset?.tone || '',
      statusText: root?.querySelector('.kus-lp__status-text')?.textContent?.trim() || '',
      rows,
      runOneDisabled: !!runOne?.disabled,
      runAllDisabled: !!runAll?.disabled,
      excelButtonCount: excelButtons.length,
      excelButtonsEnabled: excelButtons.every((button) => !button.disabled),
      downloads: Number(window.__downloadCount || 0),
      probe: JSON.parse(JSON.stringify(window.__multiProbe))
    };
  });
}

function verifyResult(result, pageErrors) {
  assert.deepEqual(result.probe.calls.map((call) => call.targetAppId), ['202', '303', '404'],
    '二重実行、または途中失敗による中断が発生しました');
  assert.equal(result.probe.freshSourceFetches, 1, '比較元が複数回取得されています');
  assert.deepEqual(result.probe.calls.map((call) => call.reusedSource), [false, true, true],
    '比較元バンドルが後続比較へ再利用されていません');
  assert.equal(result.probe.maxConcurrentCalls, 1, '比較処理が並行・二重実行されました');
  assert.deepEqual(result.probe.disabledAfterFirstDispatch, { runOne: true, runAll: true },
    '実行開始時に比較ボタンが無効化されませんでした');
  assert.deepEqual(result.probe.disabledAfterSecondDispatch, { runOne: true, runAll: true },
    '二重クリック時に比較ボタンが有効へ戻っています');
  assert.equal(result.rows.length, 3, '複数比較の結果行数が不正です');
  assert.match(result.rows[1].join(' '), /App 303.*失敗.*synthetic target failure/, '中間失敗が結果表へ表示されていません');
  assert.match(result.rows[2].join(' '), /App 404.*完了/, '中間失敗後の比較先が処理されていません');
  assert.equal(result.excelButtonCount, 2, '成功した比較先ごとのExcel保存ボタン数が不正です');
  assert.equal(result.excelButtonsEnabled, true, '複数比較のExcel保存ボタンが無効です');
  assert.match(result.statusText, /全比較先の比較が完了/, '複数比較が完了状態になっていません');
  assert.match(result.statusText, /失敗\s*1件/, '完了ステータスに失敗件数がありません');
  assert.equal(result.statusTone, 'warn', '一部失敗時のステータスが警告になっていません');
  assert.equal(result.downloads, 2, '成功した比較先のHTML出力回数が不正です');
  assert.equal(result.runOneDisabled, false, '完了後も単一比較ボタンが無効です');
  assert.equal(result.runAllDisabled, false, '完了後も複数比較ボタンが無効です');
  assert.deepEqual(pageErrors, [], 'ブラウザ実行中にエラーが発生しました');
}

async function main() {
  if (hasFlag('--help')) {
    printHelp();
    return;
  }
  const outDir = resolveFromRoot(argValue('--out', ''), DEFAULT_OUT);
  const browserName = argValue('--browser', process.env.KUS_DIFF_BROWSER || 'chrome');
  const headed = hasFlag('--headed');
  fs.mkdirSync(outDir, { recursive: true });

  const browserBundle = await buildDomHarnessBundle();
  const browser = await launchBrowser(browserName, headed);
  let result;
  try {
    const context = await browser.newContext({ viewport: { width: 1365, height: 900 } });
    const page = await context.newPage();
    const pageErrors = collectPageErrors(page);
    await page.setContent('<!doctype html><html lang="ja"><head><meta charset="utf-8"><title>diff lite multi DOM</title></head><body></body></html>');
    await installBrowserFixtures(page);
    await page.addScriptTag({ content: browserBundle });
    await mountWithControlledDiff(page);
    await page.waitForSelector('#kus-diff-lite');
    await configureThreeTargets(page);
    await dispatchDoubleRun(page);
    await page.waitForFunction(() => {
      const text = document.querySelector('#kus-diff-lite .kus-lp__status-text')?.textContent || '';
      return text.includes('全比較先の比較が完了');
    }, null, { timeout: 15000 });
    result = await inspectResult(page);
    verifyResult(result, pageErrors);
    const showDetails = page.locator('#kus-diff-lite label')
      .filter({ hasText: /画面に(?:比較結果一覧|差分明細)を表示/ })
      .locator('input[type="checkbox"]');
    await showDetails.evaluate((checkbox) => {
      checkbox.checked = false;
      checkbox.dispatchEvent(new Event('change', { bubbles: true }));
    });
    assert.equal(await page.locator('.kus-dl-multi tbody tr').count(), 3,
      '複数比較後の表示設定変更で結果表が消えました');
    assert.equal(await page.locator('[data-kus-dl-multi-xlsx]').count(), 2,
      '複数比較後の表示設定変更でExcel保存ボタンが消えました');
    await showDetails.evaluate((checkbox) => {
      checkbox.checked = true;
      checkbox.dispatchEvent(new Event('change', { bubbles: true }));
    });
    const firstExcelButton = page.locator('[data-kus-dl-multi-xlsx]').first();
    await firstExcelButton.click();
    await page.waitForTimeout(100);
    await firstExcelButton.evaluate((button) => {
      button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    await page.waitForFunction(() => {
      const text = document.querySelector('#kus-diff-lite .kus-lp__status-text')?.textContent || '';
      return text.includes('差分一覧 Excel のダウンロードを開始しました');
    }, null, { timeout: 10000 });
    await page.waitForTimeout(400);
    result.downloadsAfterExcel = await page.evaluate(() => Number(window.__downloadCount || 0));
    assert.equal(result.downloadsAfterExcel, 3, 'Excel保存の二重クリックで重複ダウンロードされました');
    assert.deepEqual(pageErrors, [], 'Excel保存時にブラウザエラーが発生しました');

    const runAll = page.getByRole('button', { name: /全比較先を順に比較/ });
    await runAll.click();
    result.rowsImmediatelyAfterRerun = await page.locator('.kus-dl-multi tbody tr').count();
    result.excelButtonsImmediatelyAfterRerun = await page.locator('[data-kus-dl-multi-xlsx]').count();
    assert.equal(result.rowsImmediatelyAfterRerun, 0, '複数比較の再実行開始時に古い結果表が残っています');
    assert.equal(result.excelButtonsImmediatelyAfterRerun, 0, '複数比較の再実行開始時に古いExcel保存ボタンが残っています');
    await page.waitForFunction(() => {
      const text = document.querySelector('#kus-diff-lite .kus-lp__status-text')?.textContent || '';
      return text.includes('全比較先の比較が完了') && window.__multiProbe.calls.length === 6;
    }, null, { timeout: 15000 });
    result.downloadsAfterRerun = await page.evaluate(() => Number(window.__downloadCount || 0));
    assert.equal(result.downloadsAfterRerun, 5, '再実行後のHTML出力回数が不正です');
    assert.deepEqual(pageErrors, [], '複数比較の再実行中にブラウザエラーが発生しました');
    await page.locator('#kus-diff-lite').screenshot({
      path: path.join(outDir, 'multi-dom-panel.png'),
      animations: 'disabled'
    });
    await context.close();
  } finally {
    await browser.close();
  }

  const report = { generatedAt: new Date().toISOString(), assertions: 'passed', ...result };
  fs.writeFileSync(path.join(outDir, 'multi-dom-result.json'), JSON.stringify(report, null, 2), 'utf8');
  console.log('[multi-dom] PASS: source reuse / failure continuation / duplicate-run guard / Excel / rerun reset');
  console.log(`[multi-dom] output: ${outDir}`);
}

main().catch((error) => {
  console.error(error.stack || error.message || error);
  process.exitCode = 1;
});
