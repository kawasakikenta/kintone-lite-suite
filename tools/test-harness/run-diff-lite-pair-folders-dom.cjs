#!/usr/bin/env node
'use strict';

/**
 * 差分比較 lite の「ペア一括比較 > 設定フォルダ取込」DOM 回帰ハーネス。
 *
 * webkitRelativePath を持つ左右の FileList を実ブラウザへ渡し、次を検証する。
 *
 *   - 一意なアプリ名だけを自動対応し、曖昧な名前は未対応のままにする
 *   - 未対応の手動指定とフォルダ順候補化を確認してからペア表へ反映する
 *   - 同じ endpoint の変更前・変更後を含む全ペアを、フォルダ内 JSON だけで比較する
 *   - A旧→B新 / B旧→C新のような連鎖でも左右のバンドルを混同しない
 *   - 結果順、HTML / Excel 保存導線、390px 幅、片側選択・解除時の停止を保つ
 *
 * 実行:
 *   node tools/test-harness/run-diff-lite-pair-folders-dom.cjs
 */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..', '..');
const TOOL_ROOT = path.resolve(ROOT, 'tools', '統合ツール');
const DEFAULT_OUT = path.resolve(ROOT, '.iter-shots', 'diff-lite-pair-folders-dom');

const EXPECTED_PAIRS = [
  { sourceAppId: '101', targetAppId: '202', sourceMarker: 'A-old', targetMarker: 'B-new' },
  { sourceAppId: '202', targetAppId: '303', sourceMarker: 'B-old', targetMarker: 'C-new' },
  { sourceAppId: '404', targetAppId: '404', sourceMarker: 'same-old', targetMarker: 'same-new' },
  { sourceAppId: '401', targetAppId: '501', sourceMarker: 'ambiguous-1-old', targetMarker: 'ambiguous-1-new' },
  { sourceAppId: '402', targetAppId: '502', sourceMarker: 'ambiguous-2-old', targetMarker: 'ambiguous-2-new' }
];

function argValue(name, fallback = '') {
  const index = process.argv.indexOf(name);
  return index >= 0 && index + 1 < process.argv.length ? process.argv[index + 1] : fallback;
}

function hasFlag(name) {
  return process.argv.includes(name);
}

function resolveFromRoot(value, fallback) {
  const raw = value || fallback;
  return path.isAbsolute(raw) ? raw : path.resolve(ROOT, raw);
}

function printHelp() {
  console.log(`Usage: node tools/test-harness/run-diff-lite-pair-folders-dom.cjs [options]

Options:
  --out <dir>       Output directory
  --browser <name>  chrome, msedge, or chromium (default: chrome)
  --headed          Run with a visible browser
  --help            Show this help`);
}

function settingsBundle(appId, appName, marker, options = {}) {
  return {
    appId: String(appId),
    guestId: String(options.guestId || ''),
    preview: options.preview === true,
    fetchedAt: '2026-08-25T00:00:00.000Z',
    meta: { appName, fixtureMarker: marker },
    sections: {
      appSettings: { name: appName },
      fieldSettings: {
        properties: {
          FolderMarker: {
            type: 'SINGLE_LINE_TEXT',
            code: 'FolderMarker',
            label: marker
          }
        }
      }
    }
  };
}

function folderFile(rootName, order, fileName, bundle) {
  return {
    name: fileName,
    relativePath: `${rootName}/apps/${String(order).padStart(2, '0')}-${fileName}`,
    text: JSON.stringify(bundle)
  };
}

const SOURCE_FILES = [
  folderFile('before-settings', 1, 'chain-a.json', settingsBundle('101', '連鎖A', 'A-old')),
  folderFile('before-settings', 2, 'chain-b.json', settingsBundle('202', '連鎖B', 'B-old')),
  folderFile('before-settings', 3, 'same.json', settingsBundle('404', '同一アプリ', 'same-old', { guestId: '7', preview: true })),
  folderFile('before-settings', 4, 'ambiguous-1.json', settingsBundle('401', '重複名', 'ambiguous-1-old')),
  folderFile('before-settings', 5, 'ambiguous-2.json', settingsBundle('402', '重複名', 'ambiguous-2-old'))
];

const TARGET_FILES = [
  folderFile('after-settings', 1, 'chain-b.json', settingsBundle('202', '連鎖A', 'B-new', { guestId: '9', preview: true })),
  folderFile('after-settings', 2, 'chain-c.json', settingsBundle('303', '連鎖B', 'C-new')),
  folderFile('after-settings', 3, 'same.json', settingsBundle('404', '同一アプリ（変更後）', 'same-new', { guestId: '7', preview: true })),
  folderFile('after-settings', 4, 'ambiguous-1.json', settingsBundle('501', '重複名', 'ambiguous-1-new')),
  folderFile('after-settings', 5, 'ambiguous-2.json', settingsBundle('502', '重複名', 'ambiguous-2-new'))
];

function withFolderRoot(files, rootName) {
  return files.map((item) => ({
    ...item,
    relativePath: item.relativePath.replace(/^[^/]+/, rootName)
  }));
}

const SLOW_SOURCE_FILES = withFolderRoot(SOURCE_FILES, 'before-settings-slow');
const FAST_SOURCE_FILES = withFolderRoot(SOURCE_FILES, 'before-settings-fast');
const INVALID_SOURCE_FILES = [{
  name: 'broken.json',
  relativePath: 'before-settings-invalid/apps/broken.json',
  text: '{ broken json'
}];

async function buildDomHarnessBundle() {
  const esbuildModule = path.join(TOOL_ROOT, 'node_modules', 'esbuild');
  let esbuild;
  try {
    esbuild = require(esbuildModule);
  } catch (error) {
    throw new Error(`esbuild を読み込めません。tools/統合ツール で npm install を実行してください: ${error.message}`);
  }
  const jsToTsResolver = {
    name: 'pair-folders-dom-js-to-ts',
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
    globalName: 'DiffLitePairFoldersHarness',
    platform: 'browser',
    target: ['chrome110'],
    plugins: [jsToTsResolver],
    logLevel: 'silent'
  });
  assert.equal(result.outputFiles.length, 1, 'DOM ハーネス用バンドルの生成結果が不正です');
  return result.outputFiles[0].text;
}

async function launchBrowser(browserName, headed) {
  const options = { headless: !headed };
  if (browserName && browserName !== 'chromium') options.channel = browserName;
  try {
    return await chromium.launch(options);
  } catch (error) {
    if (!options.channel) throw error;
    console.warn(`[pair-folders-dom] browser channel fallback: ${browserName}: ${String(error.message || error).split('\n')[0]}`);
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
    window.__folderProbe = {
      apiCalls: 0,
      compareCalls: [],
      downloadCount: 0,
      downloadNames: []
    };
    window.__folderDownloadBlobs = [];
    const api = async () => {
      window.__folderProbe.apiCalls += 1;
      return {};
    };
    api.url = (resource, preview) => `/k/v1${preview ? '/preview' : ''}${resource}`;
    window.kintone = {
      api,
      app: { getId: () => 101 },
      mobile: { app: { getId: () => 101 } },
      getLoginUser: () => ({ code: 'mock-user', name: 'Mock User' })
    };
    window.alert = () => {};
    window.confirm = () => true;
    window.prompt = () => '';
    let blobSequence = 0;
    URL.createObjectURL = (blob) => {
      window.__folderDownloadBlobs.push(blob);
      return `blob:pair-folders-dom-${++blobSequence}`;
    };
    URL.revokeObjectURL = () => {};
    const nativeAnchorClick = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function click() {
      if (this.download) {
        window.__folderProbe.downloadCount += 1;
        window.__folderProbe.downloadNames.push(this.download);
        return;
      }
      return nativeAnchorClick.call(this);
    };
  });
}

async function mountWithFolderDiffProbe(page) {
  await page.evaluate(() => {
    const markerOf = (bundle) => bundle?.sections?.fieldSettings?.properties?.FolderMarker?.label || '';
    const endpointOf = (value) => ({
      appId: String(value?.appId || ''),
      guestId: String(value?.guestId || ''),
      preview: value?.preview === true
    });
    const mountDiffLitePanel = window.DiffLitePairFoldersHarness?.mountDiffLitePanel;
    if (typeof mountDiffLitePanel !== 'function') throw new Error('mountDiffLitePanel export が見つかりません');
    mountDiffLitePanel(async (options) => {
      const sourceBundle = options?.importedSourceBundle || null;
      const targetBundle = options?.importedTargetBundle || null;
      window.__folderProbe.compareCalls.push({
        source: endpointOf(options?.source),
        target: endpointOf(options?.target),
        sourceMarker: markerOf(sourceBundle),
        targetMarker: markerOf(targetBundle),
        hasSourceBundle: !!sourceBundle,
        hasTargetBundle: !!targetBundle
      });
      if (!sourceBundle || !targetBundle) {
        throw new Error('フォルダ比較で読込済みバンドルが不足しています');
      }
      if (typeof options?.onSourceBundle === 'function') options.onSourceBundle(sourceBundle);
      const before = markerOf(sourceBundle);
      const after = markerOf(targetBundle);
      return {
        rows: [{ section: 'fieldSettings', path: 'properties.FolderMarker.label', type: 'changed', left: before, right: after }],
        fetchIssues: [],
        partialIssues: [],
        sourceBundle,
        targetBundle,
        truncation: null,
        summary: {
          text: `差分比較完了: ${before} → ${after}`,
          counts: { added: 0, removed: 0, changed: 1, moved: 0, same: 0 }
        }
      };
    });
  });
}

async function createMountedPage(context, browserBundle) {
  const page = await context.newPage();
  const pageErrors = collectPageErrors(page);
  await page.setContent('<!doctype html><html lang="ja"><head><meta charset="utf-8"><title>diff lite pair folders DOM</title></head><body></body></html>');
  await installBrowserFixtures(page);
  await page.addScriptTag({ content: browserBundle });
  await mountWithFolderDiffProbe(page);
  await page.waitForSelector('#kus-diff-lite');
  await page.getByRole('button', { name: 'ペア一括比較', exact: true }).click();
  assert.equal(await page.locator('#kus-diff-lite').getAttribute('data-kus-dl-mode'), 'pairs', 'ペア一括比較モードへ切り替わりません');
  return { page, pageErrors };
}

async function dispatchFolderFiles(page, side, files, options = {}) {
  await page.evaluate(({ side, files, options }) => {
    const input = document.querySelector(`[data-kus-dl-pair-folder-input="${side}"]`);
    if (!(input instanceof HTMLInputElement)) throw new Error(`${side} folder input が見つかりません`);
    const transfer = new DataTransfer();
    files.forEach((item) => {
      const file = new File([item.text], item.name, { type: 'application/json', lastModified: options.lastModified || 1 });
      Object.defineProperty(file, 'webkitRelativePath', {
        configurable: true,
        enumerable: true,
        value: item.relativePath
      });
      if (options.delayMs) {
        Object.defineProperty(file, 'text', {
          configurable: true,
          value: () => new Promise((resolve) => window.setTimeout(() => resolve(item.text), options.delayMs))
        });
      }
      transfer.items.add(file);
    });
    input.files = transfer.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }, { side, files, options });
}

async function setFolderFiles(page, side, files) {
  await dispatchFolderFiles(page, side, files);
  await page.waitForFunction(({ side, count }) => {
    const summary = document.querySelector(`[data-kus-dl-pair-folder-summary="${side}"]`);
    return (summary?.textContent || '').includes(`${count}アプリ`);
  }, { side, count: files.length }, { timeout: 10000 });
}

async function verifyDirectoryInputs(page) {
  const inputs = page.locator('[data-kus-dl-pair-folder-input]');
  assert.equal(await inputs.count(), 2, '左右のフォルダ入力が揃っていません');
  for (const side of ['source', 'target']) {
    const input = page.locator(`[data-kus-dl-pair-folder-input="${side}"]`);
    assert.equal(await input.getAttribute('type'), 'file', `${side}: file input ではありません`);
    assert.notEqual(await input.getAttribute('webkitdirectory'), null, `${side}: webkitdirectory 属性がありません`);
    assert.notEqual(await input.getAttribute('directory'), null, `${side}: directory 属性がありません`);
    assert.notEqual(await input.getAttribute('multiple'), null, `${side}: multiple 属性がありません`);
  }
  assert.equal(await page.getByRole('button', { name: '比較元（変更前）フォルダを選択', exact: true }).count(), 1, '比較元フォルダ選択のアクセシブル名が不正です');
  assert.equal(await page.getByRole('button', { name: '比較先（変更後）フォルダを選択', exact: true }).count(), 1, '比較先フォルダ選択のアクセシブル名が不正です');
  assert.equal(await page.getByRole('region', { name: '比較元（変更前）フォルダ', exact: true }).count(), 1, '比較元フォルダ領域に名前がありません');
  assert.equal(await page.getByRole('region', { name: '比較先（変更後）フォルダ', exact: true }).count(), 1, '比較先フォルダ領域に名前がありません');
}

async function startSlowFolderReload(page, side, files, delayMs = 600) {
  await dispatchFolderFiles(page, side, files, { delayMs, lastModified: 2 });
}

async function inspectAndResolveMappings(page, outDir = '') {
  const mapping = page.getByRole('region', { name: 'フォルダ内アプリの対応確認', exact: true });
  await mapping.waitFor({ state: 'visible' });
  const rows = mapping.locator('tbody tr');
  assert.equal(await rows.count(), 5, '対応確認表が比較元の5アプリ順ではありません');

  const initialBadges = await rows.locator('.kus-dl-pair-folder__badge').allTextContents();
  assert.deepEqual(initialBadges, [
    'アプリ名一致',
    'アプリ名一致',
    'App ID一致・要確認',
    '未対応',
    '未対応'
  ], '一意なアプリ名と曖昧な重複名の自動対応結果が不正です');
  assert.match((await rows.nth(0).textContent()) || '', /App 101[\s\S]*App 202/, 'A旧→B新の自動対応が不正です');
  assert.match((await rows.nth(1).textContent()) || '', /App 202[\s\S]*App 303/, 'B旧→C新の自動対応が不正です');
  assert.match((await rows.nth(2).textContent()) || '', /App 404[\s\S]*App 404/, '同一 endpoint の新旧対応が不正です');
  if (outDir) {
    await mapping.screenshot({ path: path.join(outDir, 'pair-folders-mapping-desktop-initial.png'), animations: 'disabled' });
  }

  const apply = page.locator('[data-kus-dl-pair-folder-apply]');
  assert.equal(await apply.isDisabled(), true, '曖昧な未対応が残るのにペア表へ反映できます');
  assert.equal(await page.locator('[data-kus-dl-pair-row]').count(), 1, '未対応解消前にペア表が書き換わりました');
  await page.locator('[data-kus-dl-run-pairs]').click();
  assert.match((await page.locator('#kus-diff-lite .kus-lp__status').textContent()) || '', /確認済みペアで現在の表を置き換える/, '未対応時の実行案内が現在のボタン名と一致しません');
  assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('data-kus-dl-folder-confirm')), '2', '未対応時の実行案内から最初の要確認操作へ移動しません');

  const includeFirst = page.locator('[data-kus-dl-folder-include="0"]');
  const ignoreUnused = page.locator('[data-kus-dl-folder-ignore-unused]');
  await ignoreUnused.check();
  await includeFirst.uncheck();
  assert.equal(await page.locator('[data-kus-dl-folder-ignore-unused]').isChecked(), false, '対象変更で増えた未使用比較先の確認が自動継承されました');
  assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('data-kus-dl-folder-include')), '0', '対象変更後に同じcheckboxへフォーカスが戻りません');
  await includeFirst.check();

  const fourthSelect = page.locator('[data-kus-dl-folder-target="3"]');
  const app501Value = await fourthSelect.locator('option').evaluateAll((options) => {
    const match = options.find((option) => (option.textContent || '').includes('App 501'));
    return match?.value || '';
  });
  assert.ok(app501Value, '手動対応用の App 501 が選択肢にありません');
  await fourthSelect.selectOption(app501Value);
  assert.equal(await rows.nth(3).locator('.kus-dl-pair-folder__badge').textContent(), '手動指定', '手動選択を対応根拠として表示していません');
  assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('data-kus-dl-folder-target')), '3', '対応先変更後に同じselectへフォーカスが戻りません');
  assert.equal(await apply.isDisabled(), true, 'もう1件の未対応が残るのに反映できます');

  const orderButton = page.locator('[data-kus-dl-pair-folder-order]');
  assert.equal(await orderButton.isDisabled(), false, '残りをフォルダ順で候補化できません');
  await orderButton.click();
  assert.equal(await rows.nth(4).locator('.kus-dl-pair-folder__badge').textContent(), 'フォルダ順・要確認', 'フォルダ順候補の表示がありません');
  assert.equal(await apply.isDisabled(), true, 'フォルダ順の要確認を確認せずにペア表へ反映できます');
  const appIdConfirmation = page.locator('[data-kus-dl-folder-confirm="2"]');
  const positionConfirmation = page.locator('[data-kus-dl-folder-confirm="4"]');
  assert.equal(await appIdConfirmation.count(), 1, 'App ID一致行の確認チェックがありません');
  assert.equal(await positionConfirmation.count(), 1, 'フォルダ順候補行の確認チェックがありません');
  await appIdConfirmation.check();
  assert.equal(await apply.isDisabled(), true, 'フォルダ順候補が未確認なのにペア表へ反映できます');
  await positionConfirmation.check();
  assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('data-kus-dl-folder-confirm')), '4', '確認チェック後にフォーカスが失われました');
  assert.equal(await apply.isDisabled(), false, '要確認行を確認してもペア表へ反映できません');
  if (outDir) {
    await mapping.screenshot({ path: path.join(outDir, 'pair-folders-mapping-desktop-confirmed.png'), animations: 'disabled' });
  }
  return { initialBadges };
}

async function applyMappingsAndInspectRows(page) {
  await page.locator('[data-kus-dl-pair-folder-apply]').click();
  const rows = page.locator('[data-kus-dl-pair-row]');
  assert.equal(await rows.count(), EXPECTED_PAIRS.length, 'フォルダ対応をペア表へ反映できません');
  const values = [];
  for (let index = 0; index < EXPECTED_PAIRS.length; index += 1) {
    const rowNumber = index + 1;
    values.push({
      sourceAppId: await page.getByLabel(`ペア${rowNumber}比較元アプリID`, { exact: true }).inputValue(),
      targetAppId: await page.getByLabel(`ペア${rowNumber}比較先アプリID`, { exact: true }).inputValue()
    });
    assert.match((await rows.nth(index).locator('.kus-dl-pair-row__match').textContent()) || '', /フォルダ取込/, `${rowNumber}行目のフォルダ対応根拠がありません`);
    assert.equal(await page.getByLabel(`ペア${rowNumber}比較元アプリID`, { exact: true }).getAttribute('readonly'), '', `${rowNumber}行目の比較元が固定されていません`);
    assert.equal(await page.getByLabel(`ペア${rowNumber}比較先アプリID`, { exact: true }).getAttribute('readonly'), '', `${rowNumber}行目の比較先が固定されていません`);
  }
  assert.deepEqual(values, EXPECTED_PAIRS.map(({ sourceAppId, targetAppId }) => ({ sourceAppId, targetAppId })), 'ペア表の対応・登録順が不正です');
  assert.equal(await rows.nth(0).getByRole('button', { name: 'ペア1を削除', exact: true }).isDisabled(), true, 'フォルダ反映後に確認済みペアを表から削除できます');
  assert.equal(await page.getByLabel('ペア1比較元ゲストスペースID', { exact: true }).inputValue(), '', '比較元の通常スペース環境が不正です');
  assert.equal(await page.getByLabel('ペア1比較元をプレビュー環境から取得', { exact: true }).isChecked(), false, '比較元の運用環境が不正です');
  assert.equal(await page.getByLabel('ペア1比較先ゲストスペースID', { exact: true }).inputValue(), '9', '比較先のGuest IDがペア表へ反映されていません');
  assert.equal(await page.getByLabel('ペア1比較先をプレビュー環境から取得', { exact: true }).isChecked(), true, '比較先のプレビュー環境がペア表へ反映されていません');
  assert.equal(await page.getByLabel('ペア3比較元をプレビュー環境から取得', { exact: true }).isChecked(), true, '同一 endpoint 行の比較元環境が不正です');
  assert.equal(await page.getByLabel('ペア3比較先をプレビュー環境から取得', { exact: true }).isChecked(), true, '同一 endpoint 行の比較先環境が不正です');
  return values;
}

function resultTable(page) {
  return page.getByRole('table', { name: 'ペア一括比較の結果（登録順）', exact: true });
}

async function inspectStoredZipDownload(page, downloadIndex) {
  return page.evaluate(async (index) => {
    const blob = window.__folderDownloadBlobs[index];
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
      filename: window.__folderProbe.downloadNames[index] || '',
      type: blob.type,
      size: blob.size,
      entries
    };
  }, downloadIndex);
}

async function runFolderComparison(page, pageErrors) {
  await page.locator('[data-kus-dl-run-pairs]').click();
  await page.waitForFunction(() => {
    const status = document.querySelector('#kus-diff-lite .kus-lp__status');
    return (status?.textContent || '').includes('ペア一括比較が完了');
  }, null, { timeout: 15000 });

  const probe = await page.evaluate(() => JSON.parse(JSON.stringify(window.__folderProbe)));
  assert.equal(probe.apiCalls, 0, 'フォルダ比較で kintone API スタブが呼び出されました');
  assert.equal(probe.compareCalls.length, EXPECTED_PAIRS.length, 'フォルダペアの比較件数が不正です');
  assert.equal(probe.compareCalls.every((call) => call.hasSourceBundle && call.hasTargetBundle), true, '読込済みバンドルのみで比較していません');
  assert.deepEqual(probe.compareCalls.map((call) => ({
    sourceAppId: call.source.appId,
    targetAppId: call.target.appId,
    sourceMarker: call.sourceMarker,
    targetMarker: call.targetMarker
  })), EXPECTED_PAIRS, 'A旧→B新 / B旧→C新を含む左右バンドルが混線しました');
  assert.deepEqual(probe.compareCalls[0].source, { appId: '101', guestId: '', preview: false }, '左右非対称ペアの比較元環境が不正です');
  assert.deepEqual(probe.compareCalls[0].target, { appId: '202', guestId: '9', preview: true }, '左右非対称ペアの比較先環境が不正です');
  assert.deepEqual(probe.compareCalls[2].source, { appId: '404', guestId: '7', preview: true }, '同一 endpoint の比較元が不正です');
  assert.deepEqual(probe.compareCalls[2].target, { appId: '404', guestId: '7', preview: true }, '同一 endpoint の比較先が不正です');

  const table = resultTable(page);
  const rows = table.locator('tbody tr');
  assert.equal(await rows.count(), EXPECTED_PAIRS.length, '結果表がペアの登録順ではありません');
  for (let index = 0; index < EXPECTED_PAIRS.length; index += 1) {
    const text = (await rows.nth(index).textContent()) || '';
    assert.match(text, new RegExp(`App ${EXPECTED_PAIRS[index].sourceAppId}[\\s\\S]*App ${EXPECTED_PAIRS[index].targetAppId}`), `${index + 1}行目の結果対応が不正です`);
    assert.equal(await rows.nth(index).locator('[data-kus-dl-multi-html]').count(), 1, `${index + 1}行目のHTML保存導線がありません`);
    assert.equal(await rows.nth(index).locator('[data-kus-dl-multi-xlsx]').count(), 1, `${index + 1}行目のExcel保存導線がありません`);
  }
  const batchButton = page.locator('[data-kus-dl-multi-xlsx-all]');
  assert.equal(await batchButton.count(), 1, 'フォルダ比較の一括Excel保存ボタンがありません');
  assert.match((await batchButton.textContent()) || '', /Excelをまとめて保存（5件・ZIP）/,
    'フォルダ比較の一括Excel保存ボタン件数が不正です');
  assert.equal(await batchButton.evaluate((button) => !button.closest('.kus-dl-table-scroll')), true,
    'フォルダ比較の一括Excel保存ボタンが結果表の横スクロール内にあります');
  assert.deepEqual(pageErrors, [], 'フォルダ比較中にブラウザエラーが発生しました');
  return probe;
}

async function verifyExports(page) {
  const firstRow = resultTable(page).locator('tbody tr').first();
  await firstRow.locator('[data-kus-dl-multi-html]').click();
  await page.waitForFunction(() => window.__folderProbe.downloadCount === 1, null, { timeout: 10000 });
  await firstRow.locator('[data-kus-dl-multi-xlsx]').click();
  await page.waitForFunction(() => window.__folderProbe.downloadCount === 2, null, { timeout: 10000 });
  const exported = await page.evaluate(async () => ({
    names: [...window.__folderProbe.downloadNames],
    artifacts: await Promise.all(window.__folderDownloadBlobs.map(async (blob) => ({
      type: blob.type,
      size: blob.size,
      prefix: Array.from(new Uint8Array(await blob.slice(0, 4).arrayBuffer())),
      text: await blob.text()
    })))
  }));
  const { names, artifacts } = exported;
  assert.match(names[0], /\.html$/i, 'フォルダ比較のHTML出力名が不正です');
  assert.match(names[1], /\.xlsx$/i, 'フォルダ比較のExcel出力名が不正です');
  assert.equal(artifacts.length, 2, '出力されたBlobの件数が不正です');
  assert.match(artifacts[0].type, /html/i, 'HTML出力のMIME typeが不正です');
  assert.match(artifacts[0].text, /アプリ\s*101/, '選択した1件目の比較元App IDがHTMLにありません');
  assert.match(artifacts[0].text, /アプリ\s*202/, '選択した1件目の比較先App IDがHTMLにありません');
  assert.match(artifacts[0].text, /A-old/, '選択した1件目の変更前値がHTMLにありません');
  assert.match(artifacts[0].text, /B-new/, '選択した1件目の変更後値がHTMLにありません');
  assert.doesNotMatch(artifacts[0].text, /B-old|C-new/, '別ペアのキャッシュが1件目のHTMLへ混入しました');
  assert.ok(artifacts[1].size > 1000, 'Excel出力のBlobが空または小さすぎます');
  assert.deepEqual(artifacts[1].prefix, [0x50, 0x4b, 0x03, 0x04], 'Excel出力がZIP形式のXLSXではありません');
  assert.match(artifacts[1].text, /A-old/, '選択した1件目の変更前値がExcel内部XMLにありません');
  assert.match(artifacts[1].text, /B-new/, '選択した1件目の変更後値がExcel内部XMLにありません');
  assert.doesNotMatch(artifacts[1].text, /B-old|C-new/, '別ペアのキャッシュが1件目のExcelへ混入しました');
  await page.waitForTimeout(400);
  const downloadsBeforeBulk = await page.evaluate(() => window.__folderProbe.downloadCount);
  await page.locator('[data-kus-dl-multi-xlsx-all]').evaluate((button) => {
    button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
  await page.waitForFunction((count) => window.__folderProbe.downloadCount === count + 1, downloadsBeforeBulk, { timeout: 20000 });
  await page.waitForTimeout(500);
  assert.equal(await page.evaluate(() => window.__folderProbe.downloadCount), downloadsBeforeBulk + 1,
    'フォルダ比較の一括Excel二重クリックでZIPが重複ダウンロードされました');
  const bulkZip = await inspectStoredZipDownload(page, downloadsBeforeBulk);
  assert.match(bulkZip.filename, /\.zip$/i, 'フォルダ比較の一括Excelダウンロード名がZIPではありません');
  assert.match(bulkZip.type, /zip/i, 'フォルダ比較の一括Excel MIME typeがZIPではありません');
  assert.equal(bulkZip.entries.length, EXPECTED_PAIRS.length + 1,
    '一括比較結果とフォルダ比較の成功Excelが一括ZIPへ全件収録されていません');
  assert.equal(bulkZip.entries[0]?.name, '000_一括比較結果.xlsx',
    '一括比較結果がフォルダ比較の一括ZIP先頭にありません');
  const individualEntries = bulkZip.entries.slice(1);
  assert.deepEqual(individualEntries.map((entry) => entry.name.slice(0, 4)),
    EXPECTED_PAIRS.map((_, index) => `${String(index + 1).padStart(3, '0')}_`),
    'フォルダ比較の成功ブックに登録順の連番がありません');
  assert.equal(bulkZip.entries.every((entry) => /\.xlsx$/i.test(entry.name)), true,
    'フォルダ比較の一括ZIPにXLSX以外のファイルが含まれています');
  assert.equal(bulkZip.entries.every((entry) => entry.method === 0), true,
    'フォルダ比較の一括ZIPが想定外の圧縮方式です');
  assert.equal(bulkZip.entries.every((entry) => entry.prefix.join(',') === '80,75,3,4'), true,
    'フォルダ比較の一括ZIP内に正しいXLSXではないエントリがあります');
  return {
    names,
    artifacts: artifacts.map(({ type, size, prefix }) => ({ type, size, prefix })),
    bulkZip
  };
}

async function verifyMobileGeometry(page, outDir = '') {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(50);
  const geometry = await page.evaluate(() => {
    const body = document.querySelector('#kus-diff-lite .kus-lp__body');
    const workflow = document.querySelector('#kus-diff-lite .kus-dl-workflow');
    const folder = document.querySelector('#kus-diff-lite .kus-dl-pair-folder');
    const mappingScroll = document.querySelector('#kus-diff-lite .kus-dl-pair-folder__mapping-scroll');
    const resultScroll = document.querySelector('#kus-diff-lite .kus-dl-table-scroll');
    const batchButton = document.querySelector('#kus-diff-lite [data-kus-dl-multi-xlsx-all]');
    if (!body || !workflow || !folder || !mappingScroll || !resultScroll || !batchButton) throw new Error('モバイル幅の計測対象が見つかりません');
    resultScroll.scrollLeft = resultScroll.scrollWidth;
    const saveButton = resultScroll.querySelector('[data-kus-dl-multi-xlsx]');
    const resultRect = resultScroll.getBoundingClientRect();
    const buttonRect = saveButton?.getBoundingClientRect();
    return {
      bodyClientWidth: body.clientWidth,
      bodyScrollWidth: body.scrollWidth,
      workflowClientWidth: workflow.clientWidth,
      workflowScrollWidth: workflow.scrollWidth,
      folderClientWidth: folder.clientWidth,
      folderScrollWidth: folder.scrollWidth,
      mappingClientWidth: mappingScroll.clientWidth,
      mappingScrollWidth: mappingScroll.scrollWidth,
      resultClientWidth: resultScroll.clientWidth,
      resultScrollWidth: resultScroll.scrollWidth,
      saveButtonInside: !!buttonRect && buttonRect.left >= resultRect.left - 1 && buttonRect.right <= resultRect.right + 1,
      batchButtonOutsideResultScroll: !resultScroll.contains(batchButton),
      batchButtonVisible: batchButton.getBoundingClientRect().width > 0 && batchButton.getBoundingClientRect().height > 0
    };
  });
  assert.ok(geometry.bodyScrollWidth <= geometry.bodyClientWidth + 1, '390px幅でパネル本文全体が横にはみ出しています');
  assert.ok(geometry.workflowScrollWidth <= geometry.workflowClientWidth + 1, '390px幅でワークフロー全体が横にはみ出しています');
  assert.ok(geometry.folderScrollWidth <= geometry.folderClientWidth + 1, '390px幅でフォルダ取込カード全体が横にはみ出しています');
  assert.ok(geometry.mappingScrollWidth <= geometry.mappingClientWidth + 1, '390px幅の対応確認が横スクロールで分断されています');
  assert.ok(geometry.resultScrollWidth > geometry.resultClientWidth, '結果表の専用横スクロール領域がありません');
  assert.equal(geometry.saveButtonInside, true, '結果表を横スクロールしても保存ボタンへ到達できません');
  assert.equal(geometry.batchButtonOutsideResultScroll, true, '一括Excel保存ボタンが結果表の横スクロール内にあります');
  assert.equal(geometry.batchButtonVisible, true, '390px幅で一括Excel保存ボタンが表示されていません');
  if (outDir) {
    await page.locator('.kus-dl-pair-folder').screenshot({ path: path.join(outDir, 'pair-folders-mapping-mobile.png'), animations: 'disabled' });
  }
  return geometry;
}

async function verifyReloadRaceStop(page) {
  const compareCountBefore = await page.evaluate(() => window.__folderProbe.compareCalls.length);
  await startSlowFolderReload(page, 'source', SLOW_SOURCE_FILES);
  const summary = page.locator('[data-kus-dl-pair-folder-summary="source"]');
  await page.waitForFunction(() => (document.querySelector('[data-kus-dl-pair-folder-summary="source"]')?.textContent || '').includes('読み込み中'));
  assert.equal(await page.locator('[data-kus-dl-run-pairs]').isDisabled(), true, 'フォルダ再読込中も一括比較ボタンが有効です');
  assert.equal(await resultTable(page).count(), 0, 'フォルダ再読込開始時に旧結果が残っています');
  assert.equal(await page.locator('[data-kus-dl-multi-html],[data-kus-dl-multi-xlsx],[data-kus-dl-multi-xlsx-all]').count(), 0, 'フォルダ再読込開始時に旧保存導線が残っています');
  await page.locator('[data-kus-dl-run-pairs]').evaluate((button) => button.dispatchEvent(new MouseEvent('click', { bubbles: true })));
  assert.equal(await page.evaluate(() => window.__folderProbe.compareCalls.length), compareCountBefore, 'フォルダ再読込中に旧ペアの比較が始まりました');
  await dispatchFolderFiles(page, 'source', FAST_SOURCE_FILES, { lastModified: 3 });
  await page.waitForFunction(() => {
    const text = document.querySelector('[data-kus-dl-pair-folder-summary="source"]')?.textContent || '';
    return text.includes('before-settings-fast') && text.includes('読み込み中');
  }, null, { timeout: 10000 });
  assert.equal(await page.locator('[data-kus-dl-run-pairs]').isDisabled(), true, '後発フォルダの反映後も先発読込の完了前に一括比較できます');
  await page.waitForFunction(() => {
    const text = document.querySelector('[data-kus-dl-pair-folder-summary="source"]')?.textContent || '';
    return text.includes('before-settings-fast') && text.includes('5アプリ') && !text.includes('読み込み中');
  }, null, { timeout: 10000 });
  assert.match((await summary.textContent()) || '', /before-settings-fast[\s\S]*5アプリ/, '遅い先発フォルダが後発フォルダを上書きしました');
  const mappingText = (await page.getByRole('region', { name: 'フォルダ内アプリの対応確認', exact: true }).textContent()) || '';
  assert.match(mappingText, /before-settings-fast/, '後発フォルダのパスが対応確認表へ反映されていません');
  assert.doesNotMatch(mappingText, /before-settings-slow/, '遅い先発フォルダのパスが対応確認表へ残りました');
  await page.locator('[data-kus-dl-run-pairs]').click();
  assert.match((await page.locator('#kus-diff-lite .kus-lp__status').textContent()) || '', /対応付けを確認/, '再読込後に対応表の再反映を要求していません');
  assert.equal(await page.evaluate(() => window.__folderProbe.compareCalls.length), compareCountBefore, '再反映前に旧ペアを比較しました');
  return { compareCountBefore, finalSummary: await summary.textContent() };
}

async function verifyInvalidReselectStop(context, browserBundle) {
  const { page, pageErrors } = await createMountedPage(context, browserBundle);
  try {
    await setFolderFiles(page, 'source', SOURCE_FILES);
    await setFolderFiles(page, 'target', TARGET_FILES);
    await inspectAndResolveMappings(page);
    await applyMappingsAndInspectRows(page);
    await runFolderComparison(page, pageErrors);
    const compareCountBefore = await page.evaluate(() => window.__folderProbe.compareCalls.length);

    await dispatchFolderFiles(page, 'source', INVALID_SOURCE_FILES, { lastModified: 4 });
    const alert = page.locator('.kus-dl-pair-folder__error[role="alert"]');
    await alert.waitFor({ state: 'visible' });
    await page.waitForFunction(() => !(document.querySelector('[data-kus-dl-pair-folder-summary="source"]')?.textContent || '').includes('読み込み中'));
    assert.match((await alert.textContent()) || '', /取り込めません|JSON/, '無効な再選択のエラーをフォルダ領域に表示していません');
    assert.equal(await resultTable(page).count(), 0, '無効な再選択開始時に旧結果が残っています');
    assert.equal(await page.locator('[data-kus-dl-multi-html],[data-kus-dl-multi-xlsx],[data-kus-dl-multi-xlsx-all]').count(), 0, '無効な再選択後に旧保存導線が残っています');
    assert.equal(await page.locator('[data-kus-dl-pair-row]').count(), EXPECTED_PAIRS.length, '無効な再選択で確認済みペア表まで失われました');

    await page.locator('[data-kus-dl-run-pairs]').click();
    assert.match((await page.locator('#kus-diff-lite .kus-lp__status').textContent()) || '', /対応付けを確認/, '無効な再選択後に旧対応の再確認を要求していません');
    assert.equal(await page.evaluate(() => window.__folderProbe.compareCalls.length), compareCountBefore, '無効な再選択後に旧スナップショットを暗黙再実行しました');

    const apply = page.locator('[data-kus-dl-pair-folder-apply]');
    assert.equal(await apply.isDisabled(), false, '旧対応を明示的に再承認できません');
    await apply.click();
    await page.locator('[data-kus-dl-run-pairs]').click();
    const expectedCount = compareCountBefore + EXPECTED_PAIRS.length;
    await page.waitForFunction((count) => window.__folderProbe.compareCalls.length === count, expectedCount, { timeout: 15000 });
    assert.equal(await page.evaluate(() => window.__folderProbe.compareCalls.length), expectedCount, '明示的な再承認後も旧対応を比較できません');
    assert.equal(await page.evaluate(() => window.__folderProbe.apiCalls), 0, '無効な再選択後にAPIへ切り替わりました');
    assert.deepEqual(pageErrors, [], '無効な再選択の停止確認中にブラウザエラーが発生しました');
    return { compareCountBefore, compareCountAfterReapply: expectedCount };
  } finally {
    await page.close();
  }
}

async function verifyIncompleteAndClearedFolderStop(context, browserBundle) {
  const { page, pageErrors } = await createMountedPage(context, browserBundle);
  try {
    await setFolderFiles(page, 'source', SOURCE_FILES);
    await page.locator('[data-kus-dl-run-pairs]').click();
    const oneSideStatus = (await page.locator('#kus-diff-lite .kus-lp__status').textContent()) || '';
    assert.match(oneSideStatus, /比較元と比較先の両フォルダ/, '片側フォルダだけで実行した際の案内が不正です');
    assert.equal(await page.evaluate(() => window.__folderProbe.compareCalls.length), 0, '片側フォルダだけで比較が実行されました');

    await setFolderFiles(page, 'target', TARGET_FILES);
    await inspectAndResolveMappings(page);
    await applyMappingsAndInspectRows(page);
    await page.locator('[data-kus-dl-pair-folder-clear="target"]').click();
    assert.match((await page.locator('[data-kus-dl-pair-folder-summary="target"]').textContent()) || '', /未選択/, '比較先フォルダの解除状態が表示されません');
    await page.locator('[data-kus-dl-run-pairs]').click();
    const clearedStatus = (await page.locator('#kus-diff-lite .kus-lp__status').textContent()) || '';
    assert.match(clearedStatus, /比較元と比較先の両フォルダ/, '片側フォルダ解除後の実行停止案内が不正です');
    const probe = await page.evaluate(() => JSON.parse(JSON.stringify(window.__folderProbe)));
    assert.equal(probe.compareCalls.length, 0, '片側フォルダ解除後に比較が実行されました');
    assert.equal(probe.apiCalls, 0, '片側フォルダ時に API へ自動切替されました');
    assert.deepEqual(pageErrors, [], '片側フォルダの実行停止確認中にブラウザエラーが発生しました');
    return probe;
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
  let report;
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 960 } });
    const { page, pageErrors } = await createMountedPage(context, browserBundle);
    await verifyDirectoryInputs(page);
    await setFolderFiles(page, 'source', SOURCE_FILES);
    await setFolderFiles(page, 'target', TARGET_FILES);
    const mappings = await inspectAndResolveMappings(page, outDir);
    const appliedRows = await applyMappingsAndInspectRows(page);
    const comparison = await runFolderComparison(page, pageErrors);
    await page.locator('#kus-diff-lite').screenshot({
      path: path.join(outDir, 'pair-folders-dom-panel.png'),
      animations: 'disabled'
    });
    const exportDownloads = await verifyExports(page);
    const mobileGeometry = await verifyMobileGeometry(page, outDir);
    const reloadRace = await verifyReloadRaceStop(page);
    assert.deepEqual(pageErrors, [], '出力・モバイル確認中にブラウザエラーが発生しました');
    await page.close();

    const invalidReselect = await verifyInvalidReselectStop(context, browserBundle);
    const stopped = await verifyIncompleteAndClearedFolderStop(context, browserBundle);
    await context.close();
    report = {
      generatedAt: new Date().toISOString(),
      assertions: 'passed',
      mappings,
      appliedRows,
      comparison,
      exportDownloads,
      mobileGeometry,
      reloadRace,
      invalidReselect,
      stopped
    };
  } finally {
    await browser.close();
  }

  fs.writeFileSync(path.join(outDir, 'pair-folders-dom-result.json'), JSON.stringify(report, null, 2), 'utf8');
  console.log('[pair-folders-dom] PASS: directory inputs / deterministic mapping / explicit review / folder-only bundles / asymmetric environments / chained endpoints / export contents / mobile / overlapping reload / invalid reselect / incomplete-stop');
  console.log(`[pair-folders-dom] output: ${outDir}`);
}

main().catch((error) => {
  console.error(error.stack || error.message || error);
  process.exitCode = 1;
});
