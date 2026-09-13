#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '../..');
const TOOL = path.join(ROOT, 'tools/統合ツール');
const OUT = path.join(ROOT, '.iter-shots/record-metadata');
const esbuild = require(path.join(TOOL, 'node_modules/esbuild'));
const metadata = require(path.join(TOOL, 'tests/fixtures/api-metadata.json'));

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
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/*', route => route.abort());
    await page.setContent('<!doctype html><html lang="ja"><meta charset="utf-8"><body></body></html>');
    await page.evaluate(data => {
      window.metadata = data; window.calls = []; window.defer = false; window.fail = false;
      window.kintone = { app: { getId: () => 7 }, api: Object.assign(async (url, method, params) => {
        window.calls.push({ url, method, params });
        if (method !== 'GET') throw new Error('書き込みは許可しないテストです');
        if (window.fail) throw new Error('権限不足のサンプル');
        if (window.defer) return new Promise(resolve => { window.resolveApi = resolve; });
        if (url.endsWith('/app/views.json')) return window.metadata.views;
        if (url.endsWith('/app/status.json')) return window.metadata.process;
        if (url.endsWith('/app/form/fields.json')) return params.app === window.badCsvApp ? { properties: {} } : window.metadata.fields;
        throw new Error('想定外のAPI: ' + url);
      }, { url: value => value }) };
    }, metadata);
    await page.addScriptTag({ content: build.outputFiles[0].text });
    await page.evaluate(() => RecordUI.mountRecordLitePanel());
    const button = name => page.getByRole('button', { name, exact: true });
    const app = page.getByRole('textbox', { name: '対象アプリID', exact: true });
    const guest = page.getByPlaceholder('ゲストID（任意）', { exact: true }).first();
    const view = page.getByRole('combobox', { name: '取得した一覧', exact: true });
    const active = page.locator('.kus-lp__tab-panel:not([hidden])');
    const query = active.locator('input').first();
    const idle = () => page.waitForFunction(() => document.querySelector('#kus-record-lite').getAttribute('aria-busy') === 'false');
    await app.fill('7,8'); await guest.fill('9');
    await button('一覧読込').click(); await idle();
    assert.deepEqual(await page.evaluate(() => window.calls.at(-1)), { url: '/k/guest/9/v1/app/views.json', method: 'GET', params: { app: '7', lang: 'user' } });
    assert.deepEqual(await view.locator('option').evaluateAll(options => options.map(o => o.value)), ['', '300', '301', '302', '310']);
    await view.selectOption('310'); await button('▼ 一覧から').click();
    assert.equal(await query.inputValue(), 'amount > 1000 order by due asc, $id desc');
    assert.equal(await page.getByText(/カレンダーの表示月による絞り込みは含みません/).isVisible(), true);
    await view.selectOption('302'); await button('▼ 一覧から').click();
    assert.equal(await query.inputValue(), 'amount > 1000 order by title asc', '同じ絞り込みでも一覧ごとの並び順を維持する');
    assert.equal(await page.getByText(/カスタマイズ画面の独自処理は含みません/).isVisible(), true);
    await view.selectOption('300'); await button('▼ 一覧から').click();
    assert.equal(await query.inputValue(), '', '全件を適用したら以前の条件を消す');
    await view.selectOption('301'); await button('▼ 一覧から').click();
    assert.equal(await query.inputValue(), '作業者 in (LOGINUSER()) order by $id desc');
    results.push('一覧: 全形式・表示順・同一条件と異なるソート・全件への解除・作業者一覧');

    await app.fill('8');
    assert.equal(await view.locator('option').count(), 1);
    await query.fill('title = "手入力"'); await button('▼ 一覧から').click();
    assert.equal(await query.inputValue(), 'title = "手入力"', '候補未選択時はクエリを変えない');
    await page.evaluate(() => { window.defer = true; });
    await button('一覧読込').click();
    await page.evaluate(() => {
      const input = document.querySelector('input[aria-label="対象アプリID"]');
      input.value = '9'; input.dispatchEvent(new Event('input', { bubbles: true }));
      window.defer = false; window.resolveApi(window.metadata.views);
    });
    await idle(); assert.equal(await view.locator('option').count(), 1);
    await button('一覧読込').click(); await idle();
    await page.evaluate(() => { window.fail = true; });
    await button('一覧読込').click(); await idle();
    assert.equal(await view.locator('option').count(), 1, '読込失敗時に過去の候補を残さない');
    await page.evaluate(() => { window.fail = false; });
    results.push('一覧: 対象変更時の無効化・遅れて届く応答の破棄・取得失敗からの復帰');

    await page.getByRole('radio', { name: '添付ファイルを保存', exact: true }).check();
    const fields = page.getByRole('combobox', { name: '取得した添付フィールド', exact: true });
    const fileCode = page.getByRole('textbox', { name: '添付フィールドコード', exact: true });
    const tableCode = page.getByRole('textbox', { name: '添付のテーブルコード', exact: true });
    await button('添付フィールド読込').click(); await idle();
    assert.deepEqual(await page.evaluate(() => window.calls.at(-1)), { url: '/k/guest/9/v1/app/form/fields.json', method: 'GET', params: { app: '9', lang: 'user' } });
    assert.match(await fields.locator('option').last().textContent(), /書類明細［documents］.*証跡ファイル［evidence］/);
    await fields.selectOption('1');
    assert.equal(await fileCode.inputValue(), 'evidence'); assert.equal(await tableCode.inputValue(), 'documents');
    assert.equal(await button('内容を確認する').isEnabled(), true);
    await button('内容を確認する').click();
    assert.match(await page.locator('.kus-wf-stage').nth(1).innerText(), /documents \/ evidence/);
    await button('対象・条件を変更').click();
    await fields.selectOption('0'); assert.equal(await tableCode.inputValue(), '');
    await fileCode.fill('manual'); assert.equal(await fields.inputValue(), '');
    await guest.fill(''); assert.equal(await fields.locator('option').count(), 1);
    await button('添付フィールド読込').click(); await idle();
    assert.equal(await page.evaluate(() => window.calls.at(-1).url), '/k/v1/app/form/fields.json');
    results.push('添付: 名称/コード表示・テーブル選択・確認画面への反映・手入力・ゲスト切替');

    await fields.selectOption('1');
    for (const width of [1440, 390, 320]) {
      await page.setViewportSize({ width, height: 900 });
      await fields.scrollIntoViewIfNeeded();
      await page.screenshot({ path: path.join(OUT, `attachment-${width}.png`) });
      const overflow = await page.locator('.kus-wf-canvas').evaluate(el => el.scrollWidth - el.clientWidth);
      assert.ok(overflow <= 1, '添付設定の横はみ出し: ' + width);
    }

    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.getByRole('radio', { name: 'ステータスを一括更新', exact: true }).check();
    const actions = page.getByRole('combobox', { name: '取得したプロセスアクション', exact: true });
    await button('アクション読込').click(); await idle();
    assert.equal(await actions.locator('option').count(), 6, '遷移元が違う同名アクションも候補に残す');
    assert.equal(await actions.locator('option[value="2"]').isDisabled(), true);
    assert.equal(await actions.locator('option[value="3"]').isDisabled(), true);
    await actions.selectOption('0');
    assert.equal(await active.getByPlaceholder('アクション名', { exact: true }).inputValue(), '進める');
    assert.equal(await page.getByText(/次の作業者: 候補から1人を選択.*reviewer/s).isVisible(), true);
    await button('選択アクションの対象条件を入力').click();
    assert.equal(await query.inputValue(), 'workflow_status in ("新規") and (amount >= 1000)');
    await actions.selectOption('1');
    assert.equal(await button('内容を確認する').isDisabled(), true, '前のアクション用に生成したクエリの取り違えを防ぐ');
    await button('選択アクションの対象条件を入力').click();
    assert.equal(await button('内容を確認する').isEnabled(), true);
    assert.equal(await query.inputValue(), 'workflow_status in ("確認中")');
    await actions.selectOption('4');
    assert.equal(await page.getByText(/実行者: 組織: approval_team（下位組織を含む）/).isVisible(), true);
    await button('選択アクションの対象条件を入力').click();
    await actions.scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(OUT, 'process-action-1440.png') });
    await guest.fill('3'); assert.equal(await actions.locator('option').count(), 1);
    results.push('プロセス: 同名アクションの遷移元区別・APIで指定できない重複の表示・実行条件・作業者と組織・対象クエリ');

    await page.getByRole('radio', { name: 'CSVからレコードを追加', exact: true }).check();
    await app.fill('7,8');
    const csvInput = page.getByLabel('取込CSV', { exact: true });
    const csvResult = page.getByLabel('CSV事前検査結果', { exact: true });
    let dialogs = 0;
    page.on('dialog', async dialog => { dialogs++; await dialog.dismiss(); });
    const upload = csv => csvInput.setInputFiles({ name: 'data.csv', mimeType: 'text/csv', buffer: Buffer.from(csv) });
    await upload('title,amount,priority\n件名A,abc,中');
    await button('CSVを事前検査').click(); await idle();
    assert.match(await csvResult.innerText(), /App 7.*2行目・金額［amount］.*数値.*App 8/s);
    assert.match(await csvResult.innerText(), /優先度［priority］: 選択肢にありません: 中/);
    await button('内容を確認する').click(); await button('CSVからレコードを追加').click(); await idle();
    assert.equal(dialogs, 0, '不正CSVでは実行確認・書き込み前に止める');
    assert.match(await page.locator('.kus-wf-stage').nth(2).innerText(), /全対象アプリへの書き込みを中止/);
    await button('対象・条件を変更').click();
    await upload('title,amount,priority\n件名A,100,高');
    assert.equal(await csvResult.isVisible(), false, 'ファイル変更で古い検査結果を消す');
    await page.evaluate(() => { window.badCsvApp = '8'; });
    await button('CSVを事前検査').click(); await idle();
    assert.match(await csvResult.innerText(), /App 7.*検出した問題 0件.*App 8.*存在しないフィールド/s);
    await page.evaluate(() => { window.badCsvApp = ''; });
    await upload('title,amount,priority\n<img src=x onerror=alert(1)>,100,高');
    await button('CSVを事前検査').click(); await idle();
    assert.equal(await csvResult.locator('img').count(), 0, 'CSVの内容をHTMLとして実行しない');
    assert.match(await csvResult.innerText(), /App 7.*App 8/s);
    for (const width of [1440, 390, 320]) {
      await page.setViewportSize({ width, height: 900 }); await csvResult.scrollIntoViewIfNeeded();
      await page.screenshot({ path: path.join(OUT, `csv-preflight-${width}.png`) });
      assert.ok(await page.locator('.kus-wf-canvas').evaluate(el => el.scrollWidth - el.clientWidth) <= 1, 'CSV検査結果の横はみ出し: ' + width);
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    await button('内容を確認する').click();
    assert.match(await page.locator('.kus-wf-stage').nth(1).innerText(), /2アプリを検査 \/ 問題あり 0アプリ/);
    await button('CSVからレコードを追加').click(); await idle();
    assert.equal(dialogs, 1, '複数アプリの実行確認は1回');
    assert.match(await page.locator('.kus-lp__status').innerText(), /キャンセルしました/);
    assert.equal(await page.locator('.kus-lp__status').getAttribute('data-tone'), 'warn');
    await button('対象・条件を変更').click();
    await page.evaluate(() => { window.defer = true; window.resolveApi = null; });
    await button('CSVを事前検査').click();
    await page.waitForFunction(() => typeof window.resolveApi === 'function');
    await page.evaluate(() => {
      const input = document.querySelector('input[aria-label="対象アプリID"]');
      input.value = '9'; input.dispatchEvent(new Event('input', { bubbles: true }));
      window.defer = false; window.resolveApi(window.metadata.fields);
    });
    await idle();
    assert.equal(await csvResult.isVisible(), false, '対象変更後の古い検査応答は表示しない');
    results.push('CSV: 全アプリ事前検査・行/フィールド別エラー・差異のあるスキーマ・先頭行プレビュー・安全な文字表示・書込前停止・再検査・キャンセル・320〜1440px');
    assert.deepEqual(errors, []);
    assert.equal(await page.evaluate(() => window.calls.every(call => call.method === 'GET')), true);
    results.push('320〜1440px・画面例外なし・すべて読み取りAPI');
  } finally {
    await browser.close();
    fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(results, null, 2));
  }
  console.log(JSON.stringify({ passed: results.length, results }, null, 2));
}
main().catch(error => { console.error(error); process.exitCode = 1; });
