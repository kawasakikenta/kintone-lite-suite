#!/usr/bin/env node
'use strict';

/**
 * 差分比較 lite の「ペア一括比較」DOM 経路に対する回帰ハーネス。
 *
 * 現行 TypeScript を esbuild で一時的にブラウザ向けへ束ね、比較処理を
 * 決定的なスタブへ差し替えて次の契約を実ブラウザ DOM 上で確認する。
 *
 *   - 3件の1対1ペアを登録順かつ逐次（同時実行数1）で処理する
 *   - app / guest / preview が完全一致する接続先だけバンドルを再利用する
 *   - 中間の失敗後も後続ペアを処理し、実行中の二重クリックを無視する
 *   - 結果表は比較元・比較先を登録順に示し、成功行だけ保存導線を持つ
 *   - 入力変更時は古い結果と保存導線を破棄する
 *   - 片側欠落、比較元重複、比較先重複、自己比較を実行前に行単位で止める
 *
 * 実行:
 *   node tools/test-harness/run-diff-lite-pairs-dom.cjs
 */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..', '..');
const TOOL_ROOT = path.resolve(ROOT, 'tools', '統合ツール');
const DEFAULT_OUT = path.resolve(ROOT, '.iter-shots', 'diff-lite-pairs-dom');

const PAIRS = [
  {
    source: { appId: '101', guestId: '11', preview: false },
    target: { appId: '202', guestId: '22', preview: true }
  },
  {
    source: { appId: '202', guestId: '22', preview: true },
    target: { appId: '303', guestId: '33', preview: false }
  },
  {
    // App ID は2件目の比較元と同じだが、guest / preview が違うため別接続先。
    source: { appId: '202', guestId: '99', preview: false },
    target: { appId: '404', guestId: '44', preview: true }
  }
];

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
  console.log(`Usage: node tools/test-harness/run-diff-lite-pairs-dom.cjs [options]

Options:
  --out <dir>       Output directory
  --browser <name>  chrome, msedge, or chromium (default: chrome)
  --headed          Run with a visible browser
  --help            Show this help`);
}

function endpointKey(endpoint) {
  return JSON.stringify([
    String(endpoint?.appId || ''),
    String(endpoint?.guestId || ''),
    endpoint?.preview === true
  ]);
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
    name: 'pairs-dom-js-to-ts',
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
    globalName: 'DiffLitePairsHarness',
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
    console.warn(`[pairs-dom] browser channel fallback: ${browserName}: ${String(error.message || error).split('\n')[0]}`);
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
    window.__downloadCount = 0;
    window.__downloadNames = [];
    window.__downloadBlobs = [];
    let blobSequence = 0;
    const blobUrls = new Map();
    URL.createObjectURL = (blob) => {
      const url = `blob:pairs-dom-${++blobSequence}`;
      blobUrls.set(url, blob);
      return url;
    };
    URL.revokeObjectURL = (url) => { blobUrls.delete(url); };
    const nativeAnchorClick = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function click() {
      if (this.download) {
        window.__downloadCount += 1;
        window.__downloadNames.push(this.download);
        window.__downloadBlobs.push(blobUrls.get(this.getAttribute('href') || this.href) || null);
        return;
      }
      return nativeAnchorClick.call(this);
    };
  });
}

async function mountWithControlledDiff(page, options = {}) {
  await page.evaluate(({ failTargetAppId }) => {
    const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    const normalizeEndpoint = (endpoint) => ({
      appId: String(endpoint?.appId || ''),
      guestId: String(endpoint?.guestId || ''),
      preview: endpoint?.preview === true
    });
    const keyOf = (endpoint) => JSON.stringify([
      String(endpoint?.appId || ''),
      String(endpoint?.guestId || ''),
      endpoint?.preview === true
    ]);
    const bundleFor = (endpoint) => ({
      appId: endpoint.appId,
      guestId: endpoint.guestId,
      preview: endpoint.preview,
      fetchedAt: '2026-08-25T00:00:00.000Z',
      meta: { sectionRevisions: {}, connectionKey: keyOf(endpoint) },
      sections: {}
    });
    const probe = {
      calls: [],
      activeCalls: 0,
      maxConcurrentCalls: 0,
      disabledAfterFirstDispatch: null,
      disabledAfterSecondDispatch: null
    };
    window.__pairsProbe = probe;

    const mountDiffLitePanel = window.DiffLitePairsHarness?.mountDiffLitePanel;
    if (typeof mountDiffLitePanel !== 'function') throw new Error('mountDiffLitePanel export が見つかりません');
    mountDiffLitePanel(async (rawOptions) => {
      const source = normalizeEndpoint(rawOptions?.source);
      const target = normalizeEndpoint(rawOptions?.target);
      const importedSource = rawOptions?.importedSourceBundle || null;
      const importedTarget = rawOptions?.importedTargetBundle || null;
      const callIndex = probe.calls.length;
      probe.calls.push({
        source,
        target,
        importedSourceKey: importedSource?.meta?.connectionKey || '',
        importedTargetKey: importedTarget?.meta?.connectionKey || ''
      });
      probe.activeCalls += 1;
      probe.maxConcurrentCalls = Math.max(probe.maxConcurrentCalls, probe.activeCalls);
      try {
        // 1件目を長めに保ち、実行中の二重クリックを確実に再現する。
        await wait(callIndex === 0 ? 220 : 35);
        const sourceBundle = importedSource || bundleFor(source);
        if (!importedSource && typeof rawOptions?.onSourceBundle === 'function') {
          rawOptions.onSourceBundle(sourceBundle);
        }
        const targetBundle = importedTarget || bundleFor(target);
        if (target.appId === failTargetAppId) {
          throw new Error(`synthetic pair failure: App ${target.appId}`);
        }
        return {
          rows: [{ section: 'form', path: 'properties.Sample', type: 'changed', before: 'before', after: 'after' }],
          fetchIssues: [],
          partialIssues: [],
          sourceBundle,
          targetBundle,
          truncation: null,
          summary: {
            text: `差分比較完了: App ${source.appId} → App ${target.appId}`,
            counts: { added: 0, removed: 0, changed: 1, moved: 0, same: 0 }
          }
        };
      } finally {
        probe.activeCalls -= 1;
      }
    });
  }, { failTargetAppId: String(options.failTargetAppId || '') });
}

async function createMountedPage(context, browserBundle, options = {}) {
  const page = await context.newPage();
  const pageErrors = collectPageErrors(page);
  await page.setContent('<!doctype html><html lang="ja"><head><meta charset="utf-8"><title>diff lite pairs DOM</title></head><body></body></html>');
  await installBrowserFixtures(page);
  await page.addScriptTag({ content: browserBundle });
  await mountWithControlledDiff(page, options);
  await page.waitForSelector('#kus-diff-lite');
  await page.getByRole('button', { name: 'ペア一括比較', exact: true }).click();
  assert.equal(await page.locator('#kus-diff-lite').getAttribute('data-kus-dl-mode'), 'pairs', 'ペア一括比較モードへ切り替わりません');
  assert.equal(await page.locator('[data-kus-dl-pair-list]').isVisible(), true, 'ペア入力表が表示されていません');
  return { page, pageErrors };
}

async function ensurePairRowCount(page, count) {
  while (await page.locator('[data-kus-dl-pair-row]').count() < count) {
    await page.locator('[data-kus-dl-pair-add]').click();
  }
  assert.equal(await page.locator('[data-kus-dl-pair-row]').count(), count, `ペア行を ${count} 件にできません`);
}

async function fillEndpoint(page, rowNumber, side, endpoint) {
  const sideLabel = side === 'source' ? '比較元' : '比較先';
  await page.getByLabel(`ペア${rowNumber}${sideLabel}アプリID`, { exact: true }).fill(String(endpoint.appId || ''));
  await page.getByLabel(`ペア${rowNumber}${sideLabel}ゲストスペースID`, { exact: true }).fill(String(endpoint.guestId || ''));
  const preview = page.getByLabel(`ペア${rowNumber}${sideLabel}をプレビュー環境から取得`, { exact: true });
  if (endpoint.preview) await preview.check();
  else await preview.uncheck();
}

async function fillPair(page, rowNumber, pair) {
  await fillEndpoint(page, rowNumber, 'source', pair.source);
  await fillEndpoint(page, rowNumber, 'target', pair.target);
}

async function configureMainPairs(page) {
  await ensurePairRowCount(page, PAIRS.length);
  for (let index = 0; index < PAIRS.length; index += 1) {
    await fillPair(page, index + 1, PAIRS[index]);
  }
}

async function dispatchDoubleRun(page) {
  await page.evaluate(() => {
    const runPairs = document.querySelector('[data-kus-dl-run-pairs]');
    if (!(runPairs instanceof HTMLButtonElement)) throw new Error('ペア一括比較ボタンが見つかりません');
    runPairs.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    window.__pairsProbe.disabledAfterFirstDispatch = runPairs.disabled;
    runPairs.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    window.__pairsProbe.disabledAfterSecondDispatch = runPairs.disabled;
  });
}

function pairResultTable(page) {
  return page.getByRole('table', { name: 'ペア一括比較の結果（登録順）', exact: true });
}

async function inspectStoredZipDownload(page, downloadIndex) {
  return page.evaluate(async (index) => {
    const blob = window.__downloadBlobs[index];
    if (!(blob instanceof Blob)) throw new Error(`ダウンロード ${index + 1} のBlobが見つかりません`);
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const decoder = new TextDecoder('utf-8');
    const entries = [];
    let offset = 0;
    while (offset + 4 <= bytes.length && view.getUint32(offset, true) === 0x04034b50) {
      const method = view.getUint16(offset + 8, true);
      const size = view.getUint32(offset + 18, true);
      const nameLength = view.getUint16(offset + 26, true);
      const extraLength = view.getUint16(offset + 28, true);
      const nameStart = offset + 30;
      const dataStart = nameStart + nameLength + extraLength;
      entries.push({
        name: decoder.decode(bytes.slice(nameStart, nameStart + nameLength)),
        method,
        size,
        prefix: Array.from(bytes.slice(dataStart, dataStart + 4))
      });
      offset = dataStart + size;
    }
    return {
      filename: window.__downloadNames[index] || '',
      type: blob.type,
      size: blob.size,
      entries
    };
  }, downloadIndex);
}

async function inspectMainResult(page) {
  return page.evaluate(() => {
    const root = document.getElementById('kus-diff-lite');
    const status = root?.querySelector('.kus-lp__status');
    const table = [...(root?.querySelectorAll('table') || [])]
      .find((candidate) => (candidate.querySelector('caption')?.textContent || '').includes('ペア一括比較の結果'));
    const rows = [...(table?.querySelectorAll('tbody tr') || [])].map((row) => ({
      cells: [...row.querySelectorAll('td')].map((cell) => cell.textContent.replace(/\s+/g, ' ').trim()),
      htmlButtons: row.querySelectorAll('[data-kus-dl-multi-html]').length,
      xlsxButtons: row.querySelectorAll('[data-kus-dl-multi-xlsx]').length
    }));
    const runPairs = root?.querySelector('[data-kus-dl-run-pairs]');
    const batchButton = root?.querySelector('[data-kus-dl-multi-xlsx-all]');
    const resultScroll = root?.querySelector('.kus-dl-table-scroll');
    return {
      statusTone: status?.getAttribute('data-tone') || '',
      statusText: status?.textContent?.replace(/\s+/g, ' ').trim() || '',
      rows,
      runPairsDisabled: !!runPairs?.disabled,
      batchButtonCount: batchButton ? 1 : 0,
      batchButtonText: batchButton?.textContent?.replace(/\s+/g, ' ').trim() || '',
      batchButtonOutsideScroll: !!batchButton && !!resultScroll && !resultScroll.contains(batchButton),
      downloads: Number(window.__downloadCount || 0),
      probe: JSON.parse(JSON.stringify(window.__pairsProbe))
    };
  });
}

function verifyMainResult(result, pageErrors) {
  assert.deepEqual(result.probe.calls.map((call) => call.source), PAIRS.map((pair) => pair.source), '比較元の app / guest / preview が登録順に伝達されていません');
  assert.deepEqual(result.probe.calls.map((call) => call.target), PAIRS.map((pair) => pair.target), '比較先の app / guest / preview が登録順に伝達されていません');
  assert.equal(result.probe.calls.length, 3, '二重実行、または中間失敗による中断が発生しました');
  assert.deepEqual(result.probe.calls.map((call) => call.importedSourceKey), [
    '',
    endpointKey(PAIRS[0].target),
    ''
  ], 'app / guest / preview が完全一致する接続先だけが比較元へ再利用されていません');
  assert.deepEqual(result.probe.calls.map((call) => call.importedTargetKey), ['', '', ''], '未取得の比較先にバンドルが誤って再利用されました');
  assert.equal(result.probe.maxConcurrentCalls, 1, 'ペア比較が並行実行されました');
  assert.equal(result.probe.disabledAfterFirstDispatch, true, '実行開始時にペア一括ボタンが無効化されませんでした');
  assert.equal(result.probe.disabledAfterSecondDispatch, true, '二重クリック時にペア一括ボタンが有効へ戻りました');
  assert.equal(result.rows.length, 3, 'ペア結果表の行数が不正です');
  assert.match(result.rows[0].cells[1], /App 101.*ゲスト 11.*運用/, '1件目の比較元表示が不正です');
  assert.match(result.rows[0].cells[2], /App 202.*ゲスト 22.*プレビュー/, '1件目の比較先表示が不正です');
  assert.match(result.rows[1].cells[1], /App 202.*ゲスト 22.*プレビュー/, '2件目の比較元表示が登録順ではありません');
  assert.match(result.rows[1].cells[2], /App 303.*ゲスト 33.*運用/, '2件目の比較先表示が登録順ではありません');
  assert.match(result.rows[1].cells[3], /失敗.*synthetic pair failure/, '中間失敗が結果表へ表示されていません');
  assert.match(result.rows[2].cells[1], /App 202.*ゲスト 99.*運用/, '中間失敗後の比較元が表示されていません');
  assert.match(result.rows[2].cells[2], /App 404.*ゲスト 44.*プレビュー/, '中間失敗後の比較先が表示されていません');
  assert.deepEqual(result.rows.map((row) => row.htmlButtons), [1, 0, 1], '成功行以外にHTML保存ボタンが表示されています');
  assert.deepEqual(result.rows.map((row) => row.xlsxButtons), [1, 0, 1], '成功行以外にExcel保存ボタンが表示されています');
  assert.equal(result.batchButtonCount, 1, '成功ペアの一括Excel保存ボタンがありません');
  assert.match(result.batchButtonText, /Excelをまとめて保存（2件・ZIP）/, '一括Excel保存ボタンの成功件数が不正です');
  assert.equal(result.batchButtonOutsideScroll, true, '一括Excel保存ボタンが結果表の横スクロール内にあります');
  assert.match(result.statusText, /ペア一括比較が完了.*成功 2\/3件.*失敗 1件/, '一部失敗を含む完了ステータスが不正です');
  assert.equal(result.statusTone, 'warn', '一部失敗時のステータスが警告になっていません');
  assert.equal(result.downloads, 0, 'ペア完了時に意図しない自動ダウンロードが発生しました');
  assert.equal(result.runPairsDisabled, false, '完了後もペア一括ボタンが無効です');
  assert.deepEqual(pageErrors, [], 'ペア一括比較中にブラウザエラーが発生しました');
}

async function verifyStaleResultInvalidation(page) {
  await page.getByLabel('ペア1比較元ゲストスペースID', { exact: true }).fill('12');
  assert.equal(await pairResultTable(page).count(), 0, 'ペア入力変更後も古い結果表が残っています');
  assert.equal(await page.locator('[data-kus-dl-multi-html]').count(), 0, 'ペア入力変更後も古いHTML保存導線が残っています');
  assert.equal(await page.locator('[data-kus-dl-multi-xlsx]').count(), 0, 'ペア入力変更後も古いExcel保存導線が残っています');
  assert.equal(await page.locator('[data-kus-dl-multi-xlsx-all]').count(), 0, 'ペア入力変更後も古い一括Excel保存導線が残っています');
  assert.equal(await page.locator('[data-kus-dl-export="html"]').isDisabled(), true, 'ペア入力変更後も全体HTML出力が有効です');
  assert.equal(await page.locator('[data-kus-dl-export="xlsx"]').isDisabled(), true, 'ペア入力変更後も全体Excel出力が有効です');
  assert.equal(await page.locator('[data-kus-dl-completion="xlsx"]').isVisible(), false, 'ペア入力変更後も完了時のExcel保存導線が表示されています');
  assert.equal(await page.getByText(/比較ペアを変更したため、前回の一括結果と保存機能を無効にしました/).isVisible(), true, 'ペア入力変更後に再比較を求める警告がありません');
}

async function verifySuccessfulPairExports(page) {
  const firstRow = pairResultTable(page).locator('tbody tr').first();
  await firstRow.locator('[data-kus-dl-multi-html]').click();
  await page.waitForFunction(() => window.__downloadCount === 1, null, { timeout: 10000 });
  await firstRow.locator('[data-kus-dl-multi-xlsx]').click();
  await page.waitForFunction(() => window.__downloadCount === 2, null, { timeout: 10000 });
  const names = await page.evaluate(() => [...window.__downloadNames]);
  assert.equal(names.length, 2, '成功ペアのHTML/Excel保存件数が不正です');
  assert.match(names[0], /\.html$/i, '成功ペアのHTMLファイル名が不正です');
  assert.match(names[1], /\.xlsx$/i, '成功ペアのExcelファイル名が不正です');
  assert.match(names[0], /101.*202|202.*101/, 'HTMLファイル名が選択したペアに対応していません');
  await page.waitForTimeout(400);
  const downloadsBeforeBulk = await page.evaluate(() => Number(window.__downloadCount || 0));
  await page.locator('[data-kus-dl-multi-xlsx-all]').evaluate((button) => {
    button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
  await page.waitForFunction((count) => window.__downloadCount === count + 1, downloadsBeforeBulk, { timeout: 15000 });
  await page.waitForTimeout(500);
  assert.equal(await page.evaluate(() => Number(window.__downloadCount || 0)), downloadsBeforeBulk + 1,
    'ペア一括Excelの二重クリックでZIPが重複ダウンロードされました');
  const bulkZip = await inspectStoredZipDownload(page, downloadsBeforeBulk);
  assert.match(bulkZip.filename, /\.zip$/i, 'ペア一括Excelのダウンロード名がZIPではありません');
  assert.match(bulkZip.type, /zip/i, 'ペア一括ExcelのMIME typeがZIPではありません');
  assert.equal(bulkZip.entries.length, 3, '一括比較結果と、失敗ペアを除いた成功2件がZIPへ収録されていません');
  assert.equal(bulkZip.entries[0]?.name, '000_一括比較結果.xlsx',
    '一括比較結果がペア一括ZIPの先頭にありません');
  const individualEntries = bulkZip.entries.slice(1);
  assert.deepEqual(individualEntries.map((entry) => entry.name.slice(0, 4)), ['001_', '002_'],
    'ペア一括Excelの成功ブックに登録順の連番がありません');
  assert.equal(bulkZip.entries.every((entry) => /\.xlsx$/i.test(entry.name)), true,
    'ペア一括ExcelのZIPにXLSX以外のファイルが含まれています');
  assert.equal(bulkZip.entries.every((entry) => entry.method === 0), true,
    'ペア一括ExcelのZIPが想定外の圧縮方式です');
  assert.equal(bulkZip.entries.every((entry) => entry.prefix.join(',') === '80,75,3,4'), true,
    'ペア一括ExcelのZIP内に正しいXLSXではないエントリがあります');
  assert.equal(individualEntries.some((entry) => /303/.test(entry.name)), false,
    '比較失敗した App 303 のExcelがペア一括ZIPへ混入しました');
  return { names, bulkZip };
}

async function verifyMobileResultGeometry(page) {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(50);
  const geometry = await page.evaluate(() => {
    const body = document.querySelector('#kus-diff-lite .kus-lp__body');
    const workflow = document.querySelector('#kus-diff-lite .kus-dl-workflow');
    const wrapper = document.querySelector('#kus-diff-lite .kus-dl-table-scroll');
    const batchButton = document.querySelector('#kus-diff-lite [data-kus-dl-multi-xlsx-all]');
    if (!body || !workflow || !wrapper || !batchButton) throw new Error('モバイル幅の計測対象が見つかりません');
    wrapper.scrollLeft = wrapper.scrollWidth;
    const saveButton = wrapper.querySelector('[data-kus-dl-multi-xlsx]');
    const wrapperRect = wrapper.getBoundingClientRect();
    const buttonRect = saveButton?.getBoundingClientRect();
    return {
      bodyClientWidth: body.clientWidth,
      bodyScrollWidth: body.scrollWidth,
      workflowClientWidth: workflow.clientWidth,
      workflowScrollWidth: workflow.scrollWidth,
      wrapperClientWidth: wrapper.clientWidth,
      wrapperScrollWidth: wrapper.scrollWidth,
      saveButtonInsideWrapper: !!buttonRect && buttonRect.left >= wrapperRect.left - 1 && buttonRect.right <= wrapperRect.right + 1,
      batchButtonOutsideWrapper: !wrapper.contains(batchButton),
      batchButtonVisible: batchButton.getBoundingClientRect().width > 0 && batchButton.getBoundingClientRect().height > 0
    };
  });
  assert.ok(geometry.bodyScrollWidth <= geometry.bodyClientWidth + 1, 'モバイル幅でパネル本文全体が横にはみ出しています');
  assert.ok(geometry.workflowScrollWidth <= geometry.workflowClientWidth + 1, 'モバイル幅でワークフロー全体が横にはみ出しています');
  assert.ok(geometry.wrapperScrollWidth > geometry.wrapperClientWidth, '結果表専用の横スクロール領域がありません');
  assert.equal(geometry.saveButtonInsideWrapper, true, '横スクロール後も保存ボタンへ到達できません');
  assert.equal(geometry.batchButtonOutsideWrapper, true, '一括Excel保存ボタンが結果表の横スクロール内にあります');
  assert.equal(geometry.batchButtonVisible, true, 'モバイル幅で一括Excel保存ボタンが表示されていません');
  return geometry;
}

async function verifyFourColumnBulkPasteWithEmptyGuests(context, browserBundle) {
  const { page, pageErrors } = await createMountedPage(context, browserBundle);
  try {
    const bulk = page.locator('.kus-dl-pair-bulk');
    await bulk.locator('summary').click();
    await page.getByLabel('一括登録する比較ペア', { exact: true }).fill('701\t\t801\t\n702\t72\t802\t82');
    await page.getByRole('button', { name: '入力したペアを追加', exact: true }).click();

    assert.equal(await page.locator('[data-kus-dl-pair-row]').count(), 2,
      '4列一括貼付の空Guest IDを含む2行が2ペアとして登録されません');
    const values = [];
    for (let rowNumber = 1; rowNumber <= 2; rowNumber += 1) {
      values.push({
        sourceAppId: await page.getByLabel(`ペア${rowNumber}比較元アプリID`, { exact: true }).inputValue(),
        sourceGuestId: await page.getByLabel(`ペア${rowNumber}比較元ゲストスペースID`, { exact: true }).inputValue(),
        targetAppId: await page.getByLabel(`ペア${rowNumber}比較先アプリID`, { exact: true }).inputValue(),
        targetGuestId: await page.getByLabel(`ペア${rowNumber}比較先ゲストスペースID`, { exact: true }).inputValue()
      });
    }
    assert.deepEqual(values, [
      { sourceAppId: '701', sourceGuestId: '', targetAppId: '801', targetGuestId: '' },
      { sourceAppId: '702', sourceGuestId: '72', targetAppId: '802', targetGuestId: '82' }
    ], '4列一括貼付で空Guest ID列が欠落し、後続列がずれました');
    assert.equal(await bulk.getAttribute('open'), null, '一括登録成功後も貼付パネルが閉じていません');
    assert.equal(await page.getByText('2 件の比較ペアを追加しました', { exact: true }).isVisible(), true,
      '空Guest ID列を含む4列一括登録の成功ステータスがありません');
    assert.equal(await page.evaluate(() => window.__pairsProbe.calls.length), 0,
      '一括登録操作だけで比較処理が実行されました');
    assert.deepEqual(pageErrors, [], '4列一括貼付でブラウザエラーが発生しました');
    return values;
  } finally {
    await page.close();
  }
}

async function verifyIndependentRowValidationState(context, browserBundle) {
  const { page, pageErrors } = await createMountedPage(context, browserBundle);
  try {
    await ensurePairRowCount(page, 2);
    await fillPair(page, 1, {
      source: { appId: '501', guestId: '51', preview: false },
      target: { appId: '', guestId: '', preview: false }
    });
    await fillPair(page, 2, {
      source: { appId: '601', guestId: '61', preview: true },
      target: { appId: '601', guestId: '61', preview: true }
    });
    await page.locator('[data-kus-dl-run-pairs]').click();

    const row1 = page.locator('[data-kus-dl-pair-row="1"]');
    const row2 = page.locator('[data-kus-dl-pair-row="2"]');
    const row1Error = row1.locator('.kus-dl-pair-row__error');
    const row2Error = row2.locator('.kus-dl-pair-row__error');
    assert.equal(await row1Error.isVisible(), true, '2行同時エラーの1行目が表示されません');
    assert.equal(await row2Error.isVisible(), true, '2行同時エラーの2行目が表示されません');
    assert.match((await row1Error.textContent()) || '', /比較先のアプリIDを入力/,
      '1行目の片側欠落エラーが不正です');
    assert.match((await row2Error.textContent()) || '', /比較元と比較先が同じ接続先/,
      '2行目の自己比較エラーが不正です');
    assert.deepEqual(await row1.locator('[aria-invalid="true"]').evaluateAll(
      (elements) => elements.map((element) => element.getAttribute('aria-label'))
    ), ['ペア1比較先アプリID'], '1行目の aria-invalid が不正です');
    assert.deepEqual(await row2.locator('[aria-invalid="true"]').evaluateAll(
      (elements) => elements.map((element) => element.getAttribute('aria-label'))
    ), ['ペア2比較元アプリID', 'ペア2比較先アプリID'], '2行目の aria-invalid が不正です');

    // 1行目だけを修正し、未修正の2行目の状態が消えないことを確認する。
    await page.getByLabel('ペア1比較先アプリID', { exact: true }).fill('502');
    assert.equal(await row1Error.isVisible(), false, '修正済みの1行目エラーが残っています');
    assert.equal(await row1.evaluate((row) => row.classList.contains('is-invalid')), false,
      '修正済みの1行目が無効状態のままです');
    assert.equal(await row1.locator('[aria-invalid="true"]').count(), 0,
      '修正済みの1行目に aria-invalid が残っています');
    assert.equal(await row2Error.isVisible(), true, '他行の編集で未修正の2行目エラーが消えました');
    assert.equal(await row2.evaluate((row) => row.classList.contains('is-invalid')), true,
      '他行の編集で未修正の2行目が有効状態に戻りました');
    assert.deepEqual(await row2.locator('[aria-invalid="true"]').evaluateAll(
      (elements) => elements.map((element) => element.getAttribute('aria-label'))
    ), ['ペア2比較元アプリID', 'ペア2比較先アプリID'],
    '他行の編集で未修正の2行目から aria-invalid が消えました');
    assert.match((await row2Error.textContent()) || '', /比較元と比較先が同じ接続先/,
      '他行の編集で未修正の2行目エラー内容が失われました');
    assert.equal(await page.evaluate(() => window.__pairsProbe.calls.length), 0,
      '複数行バリデーションで比較処理が実行されました');
    assert.deepEqual(pageErrors, [], '複数行バリデーションでブラウザエラーが発生しました');
    return {
      correctedRowInvalidCount: await row1.locator('[aria-invalid="true"]').count(),
      untouchedRowInvalidCount: await row2.locator('[aria-invalid="true"]').count()
    };
  } finally {
    await page.close();
  }
}

const VALIDATION_CASES = [
  {
    name: '片側欠落',
    pairs: [{ source: { appId: '501', guestId: '51', preview: false }, target: { appId: '', guestId: '', preview: false } }],
    rowNumber: 1,
    message: /比較先のアプリIDを入力/,
    focusedLabel: 'ペア1比較先アプリID',
    invalidLabels: ['ペア1比較先アプリID']
  },
  {
    name: '比較元重複',
    pairs: [
      { source: { appId: '501', guestId: '51', preview: false }, target: { appId: '601', guestId: '61', preview: false } },
      { source: { appId: '501', guestId: '51', preview: false }, target: { appId: '602', guestId: '62', preview: true } }
    ],
    rowNumber: 2,
    message: /比較元がペア 1 と重複/,
    focusedLabel: 'ペア2比較元アプリID',
    invalidLabels: ['ペア2比較元アプリID']
  },
  {
    name: '比較先重複',
    pairs: [
      { source: { appId: '501', guestId: '51', preview: false }, target: { appId: '601', guestId: '61', preview: true } },
      { source: { appId: '502', guestId: '52', preview: true }, target: { appId: '601', guestId: '61', preview: true } }
    ],
    rowNumber: 2,
    message: /比較先がペア 1 と重複/,
    focusedLabel: 'ペア2比較先アプリID',
    invalidLabels: ['ペア2比較先アプリID']
  },
  {
    name: '自己比較',
    pairs: [{
      source: { appId: '501', guestId: '51', preview: true },
      target: { appId: '501', guestId: '51', preview: true }
    }],
    rowNumber: 1,
    message: /比較元と比較先が同じ接続先/,
    focusedLabel: 'ペア1比較元アプリID',
    invalidLabels: ['ペア1比較元アプリID', 'ペア1比較先アプリID']
  },
  {
    name: 'Guest ID形式',
    pairs: [{ source: { appId: '501', guestId: '51', preview: false }, target: { appId: '601', guestId: 'guest', preview: false } }],
    rowNumber: 1,
    message: /比較先ゲストIDは半角数字/,
    focusedLabel: 'ペア1比較先ゲストスペースID',
    invalidLabels: ['ペア1比較先ゲストスペースID']
  }
];

async function verifyValidationCase(context, browserBundle, testCase) {
  const { page, pageErrors } = await createMountedPage(context, browserBundle);
  try {
    await ensurePairRowCount(page, testCase.pairs.length);
    for (let index = 0; index < testCase.pairs.length; index += 1) {
      await fillPair(page, index + 1, testCase.pairs[index]);
    }
    await page.locator('[data-kus-dl-run-pairs]').click();
    const error = page.locator(`[data-kus-dl-pair-row="${testCase.rowNumber}"] .kus-dl-pair-row__error`);
    assert.equal(await error.isVisible(), true, `${testCase.name}: 対象行にエラーが表示されません`);
    assert.match((await error.textContent()) || '', testCase.message, `${testCase.name}: 行エラーの内容が不正です`);
    assert.equal(await page.locator(`[data-kus-dl-pair-row="${testCase.rowNumber}"]`).evaluate((row) => row.classList.contains('is-invalid')), true, `${testCase.name}: 対象行が無効状態になっていません`);
    const focusedLabel = await page.evaluate(() => document.activeElement?.getAttribute('aria-label') || '');
    assert.equal(focusedLabel, testCase.focusedLabel, `${testCase.name}: 最初の問題入力へフォーカスしていません`);
    const invalidLabels = await page.locator(`[data-kus-dl-pair-row="${testCase.rowNumber}"] [aria-invalid="true"]`).evaluateAll(
      (elements) => elements.map((element) => element.getAttribute('aria-label'))
    );
    assert.deepEqual(invalidLabels, testCase.invalidLabels, `${testCase.name}: 問題のない入力まで無効扱いになっています`);
    const callCount = await page.evaluate(() => window.__pairsProbe.calls.length);
    assert.equal(callCount, 0, `${testCase.name}: 入力エラーがあるのに比較処理が実行されました`);
    assert.deepEqual(pageErrors, [], `${testCase.name}: ブラウザエラーが発生しました`);
  } finally {
    await page.close();
  }
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
  let mainResult;
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 960 } });
    const { page, pageErrors } = await createMountedPage(context, browserBundle, { failTargetAppId: '303' });
    await configureMainPairs(page);
    await dispatchDoubleRun(page);
    await page.waitForFunction(() => {
      const status = document.querySelector('#kus-diff-lite .kus-lp__status');
      return (status?.textContent || '').includes('ペア一括比較が完了');
    }, null, { timeout: 15000 });
    mainResult = await inspectMainResult(page);
    verifyMainResult(mainResult, pageErrors);
    await page.locator('#kus-diff-lite').screenshot({
      path: path.join(outDir, 'pairs-dom-panel.png'),
      animations: 'disabled'
    });
    mainResult.mobileGeometry = await verifyMobileResultGeometry(page);
    mainResult.exportDownloads = await verifySuccessfulPairExports(page);
    await verifyStaleResultInvalidation(page);
    assert.deepEqual(pageErrors, [], '入力変更時にブラウザエラーが発生しました');
    await page.close();

    for (const testCase of VALIDATION_CASES) {
      await verifyValidationCase(context, browserBundle, testCase);
    }
    mainResult.bulkPasteWithEmptyGuests = await verifyFourColumnBulkPasteWithEmptyGuests(context, browserBundle);
    mainResult.independentRowValidation = await verifyIndependentRowValidationState(context, browserBundle);
    await context.close();
  } finally {
    await browser.close();
  }

  const report = {
    generatedAt: new Date().toISOString(),
    assertions: 'passed',
    validationCases: VALIDATION_CASES.map((testCase) => testCase.name),
    ...mainResult
  };
  fs.writeFileSync(path.join(outDir, 'pairs-dom-result.json'), JSON.stringify(report, null, 2), 'utf8');
  console.log('[pairs-dom] PASS: exact-key bundle reuse / sequential continuation / duplicate-run guard / result actions / invalidation / validation / bulk paste / independent row errors');
  console.log(`[pairs-dom] output: ${outDir}`);
}

main().catch((error) => {
  console.error(error.stack || error.message || error);
  process.exitCode = 1;
});
