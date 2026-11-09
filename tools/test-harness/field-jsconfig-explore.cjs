#!/usr/bin/env node
'use strict';

// フィールド追加（tools/フィールド追加.js）と JS/CSS 設定（tools/kintoneJS取得.js）の通し検証。
// 配布物をそのままページに読み込み（esbuild で作り直さない）、window.kintone.api と window.fetch を、状態を持つ合成 kintone
// （field-jsconfig-synthetic.cjs）に差し替えて、利用者と同じ操作で確かめる。画面の表示と、合成 kintone が受け取った送信内容の両方を確認する。
// 実際の kintone には通信しない。
//
// 直した問題は通常の検査（失敗させるもの）にしてある。まだ直していない製品の不具合・使いにくさだけを「既知の問題（findings）」として
// 記録する（失敗させず、一覧で出す。severity が critical のものだけ失敗にする）。結果と画面は .iter-shots/field-jsconfig-explore/ に保存する。
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { installSyntheticKintone, businessFields, masterFields, f, props, clone } = require('./field-jsconfig-synthetic.cjs');
const { readZip } = require('./zip-reader.cjs');

const ROOT = path.resolve(__dirname, '../..');
const OUT = path.join(ROOT, '.iter-shots/field-jsconfig-explore');
const JS_TOOL = path.join(ROOT, 'tools/kintoneJS取得.js');
const FIELD_TOOL = path.join(ROOT, 'tools/フィールド追加.js');

const argValue = (name, fallback) => (process.argv.includes(name) ? process.argv[process.argv.indexOf(name) + 1] : fallback);
function printHelp() {
  console.log(`Usage: node tools/test-harness/field-jsconfig-explore.cjs [options]

フィールド追加と JS/CSS 設定（tools/*.js をそのまま読み込み）を、状態を持つ合成 kintone につないで、利用者と同じ操作で通しに検証します。
実際の kintone には通信しません。

Options:
  --browser <name>      chrome または chromium（既定: chrome）
  --executable <path>   ブラウザの実行ファイル（環境変数 KUS_PLAYWRIGHT_EXECUTABLE でも指定できます）
  --only <text>         名前に <text> を含むシナリオだけ実行します
  --help                このヘルプを表示

結果と画面: .iter-shots/field-jsconfig-explore/（results.json に既知の問題）`);
}

const findings = [];
const checks = [];
function finding(id, severity, title, detail = {}) {
  if (findings.some(item => item.id === id)) return;
  findings.push({ id, severity, title, ...detail });
  console.log(`  [既知の問題 ${severity}] ${id}: ${title}`);
}
const ok = name => { checks.push(name); console.log(`  OK ${name}`); };

// 業務アプリに近い世界。#101 = 反映元（全部入り・JS/CSS は URL 2 + FILE 3）、#201 = 反映先（フィールドが一部だけ）、#202 = 空、
// #203 = 反映元と同じ名前・内容のファイルを別のキーで持つ、#301 = 取引先マスタ、ゲストスペース 7 に #401。
const SRC_CUSTOMIZE = () => ({
  scope: 'ALL',
  desktop: {
    js: [{ type: 'URL', url: 'https://cdn.example.com/lib.js' }, { type: 'FILE', file: { fileKey: 'src-main', name: 'main.js', contentType: 'text/javascript', size: '40' } }, { type: 'FILE', file: { fileKey: 'src-util', name: 'util.js', contentType: 'text/javascript', size: '30' } }],
    css: [{ type: 'FILE', file: { fileKey: 'src-css', name: 'style.css', contentType: 'text/css', size: '20' } }]
  },
  mobile: { js: [{ type: 'FILE', file: { fileKey: 'src-main', name: 'main.js', contentType: 'text/javascript', size: '40' } }], css: [] }
});
const FILES = { 'src-main': '(function(){ console.log("main"); })();', 'src-util': '(function(){ console.log("util"); })();', 'src-css': '.app { color: #333; }', 'tgt203-main': '(function(){ console.log("main"); })();', 'tgt-old': '(function(){ console.log("old"); })();' };
const world = (extra = {}) => ({
  apps: [
    { id: '101', name: '営業管理（開発）', prodRevision: 20, fields: businessFields('src'), customize: SRC_CUSTOMIZE() },
    { id: '201', name: '営業管理A', prodRevision: 10, fields: businessFields('tgt'), customize: { scope: 'ALL', desktop: { js: [{ type: 'FILE', file: { fileKey: 'tgt-old', name: 'old.js', contentType: 'text/javascript', size: '30' } }], css: [] }, mobile: { js: [], css: [] } } },
    { id: '202', name: '営業管理B', prodRevision: 4, fields: businessFields('empty') },
    { id: '203', name: '営業管理C', prodRevision: 6, fields: businessFields('empty'), customize: { scope: 'ALL', desktop: { js: [{ type: 'FILE', file: { fileKey: 'tgt203-main', name: 'main.js', contentType: 'text/javascript', size: '40' } }], css: [] }, mobile: { js: [], css: [] } } },
    { id: '204', name: '営業管理D', prodRevision: 3, fields: businessFields('empty') },
    { id: '205', name: '営業管理E', prodRevision: 3, fields: businessFields('empty') },
    { id: '206', name: '営業管理F（整備用）', prodRevision: 12, fields: businessFields('src') },
    { id: '301', name: '取引先マスタ', prodRevision: 3, fields: masterFields() },
    { id: '302', name: '取引先マスタ（新）', prodRevision: 3, fields: masterFields() },
    { id: '401', guest: '7', name: 'ゲスト営業管理', prodRevision: 8, fields: businessFields('empty', '402') },
    { id: '402', guest: '7', name: 'ゲスト取引先マスタ', prodRevision: 3, fields: masterFields() }
  ],
  files: FILES,
  fileOwner: { 'src-main': '/101', 'src-util': '/101', 'src-css': '/101', 'tgt203-main': '/203', 'tgt-old': '/201' },
  ...extra
});

async function main() {
  if (process.argv.includes('--help')) { printHelp(); return; }
  for (const file of [JS_TOOL, FIELD_TOOL]) if (!fs.existsSync(file)) throw new Error(`配布物が見つかりません: ${file}（npm run build で生成してください）`);
  const { chromium } = require('playwright');
  fs.mkdirSync(OUT, { recursive: true });
  const only = argValue('--only', '');
  const browserName = argValue('--browser', 'chrome');
  const executablePath = argValue('--executable', process.env.KUS_PLAYWRIGHT_EXECUTABLE);
  const browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : browserName === 'chromium' ? {} : { channel: browserName }) });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') pageErrors.push(`console.error: ${message.text()}`); });
  await page.route('**/*', route => route.abort());
  // 確認ダイアログ（window.confirm）は内容を記録して、方針に従って答える。
  const dialogs = [];
  let dialogPolicy = 'accept';
  let onDialog = null;
  page.on('dialog', async dialog => {
    dialogs.push(dialog.message());
    if (onDialog) await onDialog(dialog);
    if (dialogPolicy === 'accept') await dialog.accept(); else await dialog.dismiss();
  });

  const toolScripts = { js: fs.readFileSync(JS_TOOL, 'utf8'), field: fs.readFileSync(FIELD_TOOL, 'utf8') };
  const PANEL = { js: '#kus-jsconfig-lite', field: '#kus-field-lite' };
  let current = 'js';

  const button = name => page.getByRole('button', { name, exact: true });
  const radio = name => page.getByRole('radio', { name, exact: true });
  const label = name => page.getByLabel(name, { exact: true });
  const idle = () => page.waitForFunction(() => document.querySelector('.kus-wf')?.getAttribute('aria-busy') !== 'true', null, { timeout: 120000 });
  const statusText = () => page.locator('.kus-lp__status-text').innerText();
  const statusTone = () => page.locator('.kus-lp__status').getAttribute('data-tone');
  const panelText = () => page.locator(PANEL[current]).innerText();
  const stage = n => page.locator('.kus-wf-stage').nth(n);
  const shot = async name => { await page.screenshot({ path: path.join(OUT, `${name}.png`) }); };
  const K = fn => page.evaluate(fn);
  const snapshot = async () => {
    const snap = await page.evaluate(async () => {
      const s = window.__k;
      // 保存された ZIP（製品の自前実装が作った実物）は、バイト列のまま Node 側へ渡して読み戻す。
      const zipFiles = [];
      for (const download of s.downloads) {
        if (!/\.zip$/i.test(download.name || '') || !download.blob) continue;
        const bytes = new Uint8Array(await download.blob.arrayBuffer());
        let binary = '';
        for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
        zipFiles.push(btoa(binary));
      }
      return {
        calls: s.calls.map(({ seq, url, method, params, fetch }) => ({ seq, url, method, params, fetch })), writes: s.writes, uploads: s.uploads, fileFetches: s.fileFetches, violations: s.violations, zipFiles,
        apps: Object.fromEntries(Object.values(s.apps).map(app => [`${app.guest}/${app.id}`, { prodRev: String(app.prodRev), previewRev: String(app.previewRev), prod: app.prod, preview: app.preview }])),
        files: s.files
      };
    });
    // zips: ZIP ごとの、フォルダを除いたファイル名の一覧（中央ディレクトリ・展開・CRC-32 を zip-reader.cjs が検査する）
    const { zipFiles, ...rest } = snap;
    return { ...rest, zips: zipFiles.map(base64 => Array.from(readZip(Buffer.from(base64, 'base64')).entries()).filter(([, entry]) => !entry.isFolder).map(([name]) => name)) };
  };
  const appState = (snap, id, guest = '') => snap.apps[`${guest}/${id}`];

  /** ページを作り直し、合成 kintone を入れ、配布物を読み込む。 */
  async function reset(tool, config = world(), { width = 1440, height = 1000 } = {}) {
    current = tool;
    dialogs.length = 0; dialogPolicy = 'accept'; onDialog = null;
    await page.setViewportSize({ width, height });
    await page.setContent('<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><body style="background:#e8edf3"></body></html>');
    await page.evaluate(installSyntheticKintone, config);
    pageErrors.length = 0;
    await page.addScriptTag({ content: toolScripts[tool] });
    await page.waitForSelector(PANEL[tool]);
  }
  /** 想定外の通信（本番・取得元への書き込み、想定外の URL）が無いこと。 */
  async function assertNoViolations(where, { allowedWrites = null } = {}) {
    const snap = await snapshot();
    assert.deepEqual(snap.violations, [], `${where}: 合成 kintone が想定外の通信を受けた`);
    for (const call of snap.calls.filter(item => item.method !== 'GET')) {
      assert.match(call.url, /^\/k(\/guest\/\d+)?\/v1(\/preview\/app\/(form\/fields|customize)\.json|\/file\.json)$/, `${where}: 想定外の書き込み先 ${call.method} ${call.url}`);
    }
    if (allowedWrites) assert.ok(snap.writes.every(write => allowedWrites.includes(write.appKey)), `${where}: 書き込みは ${allowedWrites.join('・')} だけ`);
    return snap;
  }
  const noOverflow = async (where) => {
    const geometry = await page.evaluate(() => {
      const canvas = document.querySelector('.kus-wf-canvas');
      const root = document.querySelector('.kus-wf').getBoundingClientRect();
      return { overflow: canvas ? canvas.scrollWidth - canvas.clientWidth : 0, left: root.left, right: root.right, width: window.innerWidth };
    });
    assert.ok(geometry.overflow <= 1, `${where}: 横はみ出し ${JSON.stringify(geometry)}`);
    assert.ok(geometry.left >= 0 && geometry.right <= geometry.width + 1, `${where}: パネルが画面からはみ出している ${JSON.stringify(geometry)}`);
  };

  // ---- JS/CSS 設定の操作 ----
  const chooseAction = async name => {
    const target = radio(name);
    if (!(await target.isVisible())) await page.locator('.kus-wf-action--more').click();
    await target.check();
  };
  const toSetup = async () => { const back = button('対象・条件を変更'); if (await back.isVisible()) await back.click(); };
  const jsonBox = () => page.getByRole('textbox', { name: 'カスタマイズJSON', exact: true });
  async function jsFetch(app, { guest = '', preview = false } = {}) {
    await toSetup();
    await chooseAction('JS/CSS設定を取得');
    await label('取得元アプリID').fill(app);
    await label('取得元ゲストスペースID').fill(guest);
    const check = page.getByRole('checkbox', { name: 'プレビュー環境から取得', exact: true });
    if (preview) await check.check(); else await check.uncheck();
    await button('内容を確認する').click();
    await button('JS/CSS設定を取得').click();
    await idle();
  }
  async function jsApply(target, { guest = '', baseJson = null } = {}) {
    await toSetup();
    await chooseAction('反映先プレビューへ反映');
    await label('反映先アプリID').fill(target);
    await label('反映先ゲストスペースID').fill(guest);
    if (baseJson !== null) await jsonBox().fill(baseJson);
    await button('内容を確認する').click();
  }
  const jsRunApply = async () => { await button('反映先プレビューへ反映').click(); await idle(); };
  const multiRows = () => page.locator('.kus-lp__apptable tbody tr');
  async function jsMulti(targets) {
    await toSetup();
    await chooseAction('複数の反映先プレビューへ反映');
    const first = page.locator('.kus-lp__apptable input[aria-label="アプリID"]:visible').first();
    await first.fill(targets.map(item => (typeof item === 'string' ? item : item.app)).join(','));
    await first.dispatchEvent('change');
    // ゲストスペースの行は、行ごとにゲストスペースIDを入れる
    for (const [index, item] of targets.entries()) {
      if (typeof item === 'object' && item.guest) await multiRows().nth(index).locator('input[aria-label="ゲストスペースID"]').fill(item.guest);
    }
    await button('内容を確認する').click();
  }
  const jsRunMulti = async () => { await button('複数の反映先プレビューへ反映').click(); await idle(); };

  const scenarios = [];
  const scenario = (name, fn) => scenarios.push({ name, fn });
  const ctx = { page, button, radio, label, idle, statusText, statusTone, panelText, stage, shot, K, snapshot, appState, reset, assertNoViolations, noOverflow, chooseAction, toSetup, jsonBox, jsFetch, jsApply, jsRunApply, jsMulti, jsRunMulti, multiRows, dialogs, finding, ok, world, pageErrors, setPolicy: value => { dialogPolicy = value; }, setOnDialog: fn => { onDialog = fn; } };
  require('./field-jsconfig-scenarios-js.cjs')(scenario, ctx);
  require('./field-jsconfig-scenarios-field.cjs')(scenario, ctx);

  let failed = 0;
  for (const item of scenarios) {
    if (only && !item.name.includes(only)) continue;
    console.log(`\n# ${item.name}`);
    try {
      await item.fn();
      assert.deepEqual(pageErrors.filter(message => !/Failed to load resource/.test(message)), [], `${item.name}: ページでエラーが出た`);
    } catch (error) {
      failed += 1;
      console.log(`  NG ${item.name}: ${error.message.split('\n').slice(0, 6).join('\n     ')}`);
      try { await page.screenshot({ path: path.join(OUT, `NG-${item.name.replace(/[^\p{L}\p{N}]+/gu, '_')}.png`) }); } catch { /* 無視 */ }
    }
  }
  fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify({ checks, findings, failed }, null, 2));
  await browser.close();
  const critical = findings.filter(item => item.severity === 'critical');
  console.log(`\n${failed ? 'NG' : 'PASS'} ${checks.length} checks / ${failed} failed / 既知の問題 ${findings.length} 件（critical ${critical.length}）`);
  if (failed || critical.length) process.exit(1);
}

main().catch(error => { console.error(error); process.exit(1); });
