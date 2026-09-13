#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '../..');
const TOOL = path.join(ROOT, 'tools/統合ツール');
const OUT = path.join(ROOT, '.iter-shots/record-quality');
const esbuild = require(path.join(TOOL, 'node_modules/esbuild'));

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const build = await esbuild.build({ absWorkingDir: TOOL, bundle: true, write: false,
    entryPoints: ['src/entries/record-lite-ui.ts'], format: 'iife', globalName: 'RecordUI',
    platform: 'browser', target: ['chrome110'], logLevel: 'silent' });
  const browserName = process.argv.includes('--browser') ? process.argv[process.argv.indexOf('--browser') + 1] : 'chrome';
  const browser = await chromium.launch({ headless: true, ...(browserName === 'chromium' ? {} : { channel: browserName }) });
  const results = [];
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.route('**/*', route => route.request().isNavigationRequest() ? route.fulfill({ contentType: 'text/html', body: '<!doctype html><html lang="ja"><meta charset="utf-8"><body></body></html>' }) : route.abort());
    await page.goto('https://example.cybozu.com/k/7/');
    await page.evaluate(() => {
      const f = (type, value) => ({ type, value });
      window.calls = []; window.defer = false; window.failFields = false; window.cursorOffset = 0;
      window.records = Array.from({ length: 10001 }, (_, i) => ({ $id: f('__ID__', String(i + 1)), title: f('SINGLE_LINE_TEXT', i < 60 || i === 10000 ? '=1+1' : '案件 ' + i), amount: f('NUMBER', '1') }));
      window.records[60].title.value = ''; delete window.records[61].title;
      window.records[62].title.value = '<img src=x onerror=alert(1)>'; window.records[62].amount.value = '';
      window.properties = {
        title: { type: 'SINGLE_LINE_TEXT', label: '件名', required: true }, amount: { type: 'NUMBER', label: '金額' },
        tags: { type: 'CHECK_BOX', label: '分類', options: { A: { index: '0' } } }, date: { type: 'DATE', label: '日付' },
        due: { type: 'DATETIME', label: '期限' }, link: { type: 'LINK', label: 'リンク' },
        file: { type: 'FILE', label: '添付' }, table: { type: 'SUBTABLE', fields: { child: { type: 'SINGLE_LINE_TEXT' } } }
      };
      window.kintone = { app: { getId: () => 7 }, api: Object.assign(async (url, method, params) => {
        window.calls.push({ url, method, params });
        if (method !== 'GET' && !url.endsWith('/records/cursor.json')) throw new Error('レコード書き込み禁止');
        if (url.endsWith('/app/form/fields.json')) {
          if (window.failFields || params.app === '8') throw new Error('サンプル: 設定を取得できません');
          if (window.defer) return new Promise(resolve => { window.resolveApi = resolve; });
          return { properties: window.properties };
        }
        if (url.endsWith('/records.json')) {
          const lastId = Number(/\$id > (\d+)/.exec(params.query)[1]);
          return { records: window.records.slice(lastId, lastId + 500) };
        }
        if (url.endsWith('/records/cursor.json')) {
          if (method === 'POST') { window.cursorOffset = 0; return { id: 'sample-cursor', totalCount: String(window.records.length) }; }
          if (method === 'DELETE') return {};
          const start = window.cursorOffset; window.cursorOffset += 500;
          return { records: window.records.slice(start, start + 500), next: window.cursorOffset < window.records.length };
        }
        throw new Error('想定外のAPI: ' + url);
      }, { url: value => value }) };
      // Capture the Blob at the real download boundary; the browser need not write into the user's downloads.
      window.downloads = []; window.blobs = new Map();
      const create = URL.createObjectURL;
      URL.createObjectURL = blob => { const url = create(blob); window.blobs.set(url, blob); return url; };
      document.addEventListener('click', event => {
        const anchor = event.target.closest('a[download]');
        if (anchor) { event.preventDefault(); window.downloads.push({ filename: anchor.download, blob: window.blobs.get(anchor.href) }); }
      });
      // JSZip's file collection is inspected separately from its unchanged encoding implementation.
      window.zipFiles = {};
      window.JSZip = class {
        constructor() { window.zipFiles = {}; }
        file(name, value) { window.zipFiles[name] = value; return this; }
        async generateAsync() { return new Blob(['synthetic zip']); }
      };
    });
    await page.addScriptTag({ content: build.outputFiles[0].text });
    await page.evaluate(() => RecordUI.mountRecordLitePanel());
    const button = name => page.getByRole('button', { name, exact: true });
    const app = page.getByRole('textbox', { name: '対象アプリID', exact: true });
    const guest = page.getByRole('textbox', { name: '対象のゲストスペースID', exact: true });
    const fields = page.getByRole('group', { name: '検査するフィールド', exact: true });
    const output = page.getByLabel('データ検査結果', { exact: true });
    const idle = () => page.waitForFunction(() => document.querySelector('#kus-record-lite').getAttribute('aria-busy') === 'false');
    const run = async label => { await button('内容を確認する').click(); await button(label).click(); await idle(); };
    await page.getByRole('radio', { name: '重複・未入力を検査', exact: true }).check();
    await app.fill('7,8'); await guest.fill('9');
    assert.equal(await button('内容を確認する').isDisabled(), true);
    await button('検査フィールド読込').click(); await idle();
    assert.equal(await fields.getByRole('checkbox').count(), 6);
    await fields.getByRole('checkbox', { name: '件名［title］ / SINGLE_LINE_TEXT', exact: true }).check();
    await fields.getByRole('checkbox', { name: '金額［amount］ / NUMBER', exact: true }).check();
    const search = page.getByLabel('検査フィールド検索', { exact: true });
    await search.fill('title'); assert.equal(await fields.getByRole('checkbox').count(), 1);
    await search.fill(''); assert.equal(await fields.getByRole('checkbox', { name: '金額［amount］ / NUMBER', exact: true }).isChecked(), true);
    for (const index of [2, 3, 4]) await fields.getByRole('checkbox').nth(index).check();
    await fields.getByRole('checkbox').nth(5).click();
    assert.equal(await fields.getByRole('checkbox').nth(5).isChecked(), false);
    for (const index of [2, 3, 4]) await fields.getByRole('checkbox').nth(index).uncheck();
    results.push('フィールド名検索・複数選択保持・5項目上限・未選択の実行防止');

    await run('重複・未入力を検査');
    assert.equal(await output.isVisible(), true, '検査結果を結果ステップに表示する');
    assert.match(await output.innerText(), /10001件を検査 \/ 重複 1組・61件 \/ 未入力 2件 \/ 取得不可 1件/);
    assert.match(await output.innerText(), /App 8: 検査失敗/);
    assert.equal(await output.locator('li').count(), 50);
    assert.equal(await output.locator('img').count(), 0);
    assert.equal(await output.getByRole('link').first().getAttribute('href'), '/k/guest/9/7/show#record=61');
    assert.equal(await output.getByRole('link').first().getAttribute('rel'), 'noopener noreferrer');
    await button('検査結果をCSVで保存').click();
    const csv = await page.evaluate(() => window.downloads.at(-1).blob.text());
    assert.match(csv, /https:\/\/example.cybozu.com\/k\/guest\/9\/7\/show#record=10001/);
    assert.match(csv, /'=1\+1/);
    assert.match(csv, /取得不可/);
    assert.match(csv, /エラー/);
    assert.equal(await page.evaluate(() => window.calls.filter(call => call.url.endsWith('/records.json')).length), 21);
    assert.equal(await page.evaluate(() => window.calls.filter(call => call.url.endsWith('/records.json')).every(call => JSON.stringify(call.params.fields) === JSON.stringify(['$id', 'title', 'amount']))), true);
    for (const width of [1440, 390, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      await output.scrollIntoViewIfNeeded(); await page.screenshot({ path: path.join(OUT, `quality-${width}.png`) });
      assert.ok(await page.locator('.kus-wf-canvas').evaluate(el => el.scrollWidth - el.clientWidth) <= 1, `検査結果の横はみ出し ${width}`);
    }
    results.push('10,001件の検査・選択フィールドだけ取得・重複/未入力/取得不可・部分失敗・全結果CSV・安全なリンクとHTML表示・画面幅320〜1440');

    await page.setViewportSize({ width: 1440, height: 1000 });
    await button('対象・条件を変更').click();
    const query = page.getByLabel('データ検査のクエリ', { exact: true });
    await query.fill('order by title asc');
    assert.equal(await output.innerText(), '', '条件を変更すると古い結果は破棄される');
    await app.fill('7'); await button('検査フィールド読込').click(); await idle();
    await fields.getByRole('checkbox').first().check();
    await run('重複・未入力を検査');
    assert.equal(await page.evaluate(() => window.calls.some(call => call.method === 'POST' && call.url.endsWith('/records/cursor.json') && call.params.query === 'order by title asc')), true);
    results.push('order by 指定時のcursor全件取得・条件/対象変更時の結果破棄');

    await button('対象・条件を変更').click();
    await page.evaluate(() => { window.defer = true; });
    await button('検査フィールド読込').click();
    await page.evaluate(() => { const input = document.querySelector('[aria-label="対象アプリID"]'); input.value = '9'; input.dispatchEvent(new Event('input', { bubbles: true })); window.defer = false; window.resolveApi({ properties: window.properties }); });
    await idle(); assert.equal(await fields.getByRole('checkbox').count(), 0);
    await page.evaluate(() => { window.failFields = true; });
    await button('検査フィールド読込').click(); await idle();
    assert.equal(await fields.getByRole('checkbox').count(), 0);
    await page.evaluate(() => { window.failFields = false; });
    results.push('対象変更後に遅れて届く応答を破棄・読込失敗時に古い候補を残さない');

    await app.fill('7,8');
    await page.getByRole('radio', { name: 'CSV取込ひな形を作成', exact: true }).check();
    await run('CSV取込ひな形を作成');
    assert.equal(await output.isVisible(), false, '別操作の結果に古い検査を表示しない');
    const zip = await page.evaluate(() => window.zipFiles);
    assert.equal(zip['app_7/import.csv'], '\uFEFFtitle,amount,tags,date,due,link\r\n');
    assert.match(zip['app_7/fields.csv'], /必須/);
    assert.match(zip['app_7/excluded.csv'], /SUBTABLE/);
    assert.equal(JSON.parse(zip['manifest.json']).failures.length, 1);
    assert.match(await page.locator('.kus-lp__status').innerText(), /失敗 1アプリ/);
    await page.screenshot({ path: path.join(OUT, 'template-result.png') });
    results.push('CSVひな形/必須・選択肢ガイド/除外項目/使い方の同梱・複数アプリ部分失敗の維持');
    assert.deepEqual(errors, []);
    assert.equal(await page.evaluate(() => window.calls.every(call => call.method === 'GET' || call.url.endsWith('/records/cursor.json'))), true);
    fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify({ passed: true, results }, null, 2));
    console.log('PASS record quality and CSV template workflows; ' + results.length + ' groups');
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
