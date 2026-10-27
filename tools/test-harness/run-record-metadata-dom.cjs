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
  const csvBuild = await esbuild.build({ absWorkingDir: TOOL, bundle: true, write: false,
    entryPoints: ['src/entries/csv-export-lite-ui.ts'], format: 'iife', globalName: 'CsvUI',
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
    await page.addScriptTag({ content: csvBuild.outputFiles[0].text });
    await page.evaluate(() => RecordUI.mountRecordLitePanel());
    const button = name => page.getByRole('button', { name, exact: true });
    const app = page.getByRole('textbox', { name: '対象アプリID', exact: true });
    const guest = page.getByPlaceholder('ゲストID（任意）', { exact: true }).first();
    const view = page.getByRole('combobox', { name: '取得した一覧', exact: true });
    const active = page.locator('.kus-lp__tab-panel:not([hidden])');
    const query = active.locator('input').first();
    const idle = () => page.waitForFunction(() => document.querySelector('#kus-record-lite').getAttribute('aria-busy') === 'false');
    // 3 件を超える操作は「ほかの操作…」のポップアップにある。開いて選ぶと、ポップアップは自動で閉じる。
    const pickAction = async label => {
      const radio = page.getByRole('radio', { name: label, exact: true });
      if (!await radio.isVisible()) await page.locator('.kus-wf-action--more').click();
      await radio.check();
    };
    // 操作ごとのオプションは「オプション…」のポップアップにある。開いて操作し、「閉じる」で戻る。
    const withOptions = async (tab, fn) => {
      await active.getByRole('button', { name: 'オプション…', exact: true }).click();
      const dialog = page.locator('#kus-record-lite-options-' + tab);
      assert.equal(await dialog.isVisible(), true);
      await fn(dialog);
      await dialog.getByRole('button', { name: '閉じる', exact: true }).click();
      assert.equal(await dialog.isVisible(), false);
    };
    // 補足説明はカードの「?」を押すと開く。
    const helpText = async title => {
      const helpButton = page.getByRole('button', { name: `「${title}」の説明を表示`, exact: true });
      await helpButton.click();
      const text = await page.locator('.kus-lp__help-pop:visible').innerText();
      await helpButton.click();
      return text;
    };
    await app.fill('7,8'); await guest.fill('9');
    assert.match(await helpText('対象アプリ'), /カンマ・改行・空白で区切ります.*10,000 件を超えても全件取得します/s);
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

    await pickAction('添付ファイルを保存');
    const fields = page.getByRole('combobox', { name: '取得した添付フィールド', exact: true });
    const fileCode = page.getByRole('textbox', { name: '添付フィールドコード', exact: true });
    const tableCode = page.getByRole('textbox', { name: '添付のテーブルコード', exact: true });
    assert.equal(await tableCode.isVisible(), false, 'テーブル・フォルダ・ZIP名は表面に出さない');
    assert.match(await helpText('添付ファイル保存'), /download_errors\.txt.*manifest\.json/s);
    await button('添付フィールド読込').click(); await idle();
    assert.deepEqual(await page.evaluate(() => window.calls.at(-1)), { url: '/k/guest/9/v1/app/form/fields.json', method: 'GET', params: { app: '9', lang: 'user' } });
    assert.match(await fields.locator('option').last().textContent(), /書類明細［documents］.*証跡ファイル［evidence］/);
    await fields.selectOption('1');
    assert.equal(await fileCode.inputValue(), 'evidence');
    await withOptions('attach', async dialog => assert.equal(await dialog.getByRole('textbox', { name: '添付のテーブルコード', exact: true }).inputValue(), 'documents'));
    assert.equal(await button('内容を確認する').isEnabled(), true);
    await button('内容を確認する').click();
    assert.match(await page.locator('.kus-wf-stage').nth(1).innerText(), /documents \/ evidence/);
    await button('対象・条件を変更').click();
    await fields.selectOption('0');
    await withOptions('attach', async dialog => assert.equal(await dialog.getByRole('textbox', { name: '添付のテーブルコード', exact: true }).inputValue(), ''));
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
    await pickAction('ステータスを一括更新');
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
    await withOptions('status', async dialog => {
      await dialog.getByPlaceholder('次の作業者ログイン名（必要な場合）', { exact: true }).fill('reviewer');
    });
    await actions.selectOption('');
    await active.getByPlaceholder('アクション名', { exact: true }).fill('進める');
    await button('内容を確認する').click();
    assert.match(await page.locator('.kus-wf-stage').nth(1).innerText(), /次の作業者\s*reviewer/, 'ポップアップ内の次の作業者を確認画面に反映する');
    await button('対象・条件を変更').click();
    results.push('プロセス: 同名アクションの遷移元区別・APIで指定できない重複の表示・実行条件・作業者と組織・対象クエリ');

    await pickAction('バックアップを保存');
    const settingsToggle = page.getByRole('checkbox', { name: 'アプリ設定も保存', exact: true });
    assert.equal(await settingsToggle.isVisible(), false, 'バックアップのオプションは表面に出さない');
    await app.fill('7');
    await withOptions('backup', async dialog => {
      const scopes = dialog.locator('.kus-lp__chips input[type=checkbox]');
      await settingsToggle.check();
      for (let i = 0; i < await scopes.count(); i++) await scopes.nth(i).uncheck();
      await scopes.first().check();
      await scopes.first().uncheck();
    });
    assert.equal(await button('内容を確認する').isDisabled(), true, '設定の保存範囲が空のまま設定なしで成功させない');
    await withOptions('backup', async dialog => { await dialog.locator('.kus-lp__chips input[type=checkbox]').first().check(); });
    assert.equal(await button('内容を確認する').isEnabled(), true);
    await button('内容を確認する').click();
    assert.match(await page.locator('.kus-wf-stage').nth(1).innerText(), /アプリ設定（/);
    await button('対象・条件を変更').click();
    await withOptions('backup', async () => { await settingsToggle.uncheck(); });
    results.push('バックアップ: アプリ設定の保存範囲が空なら確認へ進めない・確認画面に範囲を表示');

    await pickAction('CSVを出力');
    const csvFileName = page.getByPlaceholder('空欄で自動命名（CSV / テーブルあり・複数アプリはZIP）', { exact: true });
    assert.equal(await csvFileName.isVisible(), false, 'CSV出力のオプションは表面に出さない');
    await withOptions('csv-export', async dialog => {
      await dialog.getByPlaceholder('空欄で自動命名（CSV / テーブルあり・複数アプリはZIP）', { exact: true }).fill('月次');
    });
    await button('内容を確認する').click();
    assert.match(await page.locator('.kus-wf-stage').nth(1).innerText(), /ファイル名\s*月次/);
    await button('対象・条件を変更').click();
    results.push('オプション: 操作ごとのポップアップで設定でき、変更が確認画面に反映される');

    await pickAction('CSVからレコードを追加');
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

    // The standalone CSV panel has its own view lookup state. Verify that it
    // keeps sort clauses, can clear an existing query with an all-records view,
    // and never applies options returned for a different lookup app.
    await page.locator('#kus-record-lite .kus-lp__close').click();
    await page.evaluate(() => CsvUI.mountCsvExportLitePanel());
    const csvPanel = page.locator('#kus-csv-export-lite');
    const csvSourceApp = csvPanel.getByPlaceholder('一覧取得元アプリID', { exact: true });
    const csvSourceGuest = csvPanel.getByPlaceholder('ゲストID（任意）', { exact: true }).last();
    const csvViews = csvPanel.getByRole('combobox', { name: '一覧の条件', exact: true });
    const csvQuery = csvPanel.getByRole('textbox', { name: '全対象アプリの絞り込み条件', exact: true });
    const csvLoadViews = csvPanel.getByRole('button', { name: '一覧読込', exact: true });
    const csvUseView = csvPanel.getByRole('button', { name: '▼ 条件へ反映', exact: true });
    const csvIdle = () => page.waitForFunction(() => document.querySelector('#kus-csv-export-lite').getAttribute('aria-busy') === 'false');
    // 出力形式（ファイル名・ヘッダー・改行・Excel保護）は「詳細設定…」のポップアップにある。
    const csvFilename = csvPanel.getByRole('textbox', { name: '出力ファイル名', exact: true });
    assert.equal(await csvFilename.isVisible(), false, '出力形式は表面に出さない');
    await csvPanel.getByRole('button', { name: '詳細設定…', exact: true }).click();
    await csvFilename.fill('売上');
    await csvPanel.getByRole('combobox', { name: '改行コード', exact: true }).selectOption('crlf');
    await csvPanel.getByRole('button', { name: '詳細設定を閉じる', exact: true }).click();
    await csvPanel.getByRole('button', { name: '「出力条件」の説明を表示', exact: true }).click();
    assert.match(await csvPanel.locator('.kus-lp__help-pop:visible').innerText(), /10,000 件を超えても全件取得します.*manifest\.txt/s);
    await csvPanel.getByRole('button', { name: '「出力条件」の説明を表示', exact: true }).click();
    await csvPanel.getByRole('button', { name: '内容を確認する', exact: true }).click();
    assert.match(await csvPanel.locator('.kus-wf-stage').nth(1).innerText(), /CRLF[\s\S]*売上/, '詳細設定の変更を確認画面に反映する');
    await csvPanel.getByRole('button', { name: '対象・条件を変更', exact: true }).click();
    await csvPanel.locator('details').filter({ hasText: '一覧の条件を利用する' }).locator('summary').click({ force: true });
    await csvSourceApp.scrollIntoViewIfNeeded();
    await csvSourceApp.fill('7', { force: true }); await csvSourceGuest.fill('9', { force: true });
    await csvLoadViews.click({ force: true }); await csvIdle();
    assert.deepEqual(await csvViews.locator('option').evaluateAll(options => options.map(o => o.value)), ['', '300', '301', '302', '310']);
    await csvQuery.fill('stale = "query"', { force: true });
    await csvViews.selectOption('310', { force: true }); await csvUseView.click({ force: true });
    assert.equal(await csvQuery.inputValue(), 'amount > 1000 order by due asc, $id desc', 'CSV一覧は並び順込みで反映する');
    await csvViews.selectOption('300', { force: true }); await csvUseView.click({ force: true });
    assert.equal(await csvQuery.inputValue(), '', 'CSVの全件一覧は以前の条件を消す');
    await csvSourceApp.fill('8', { force: true });
    assert.equal(await csvViews.locator('option').count(), 1, 'CSVの取得元変更で古い候補を消す');
    await csvQuery.fill('manual = "keep"', { force: true });
    await csvUseView.click({ force: true });
    assert.equal(await csvQuery.inputValue(), 'manual = "keep"', 'CSV候補未選択時は手入力条件を変えない');
    await page.evaluate(() => { window.defer = true; window.resolveApi = null; });
    await csvSourceApp.fill('7', { force: true }); await csvLoadViews.click({ force: true });
    await page.waitForFunction(() => typeof window.resolveApi === 'function');
    await page.evaluate(() => {
      const input = document.querySelector('#kus-csv-export-lite input[placeholder="一覧取得元アプリID"]');
      input.value = '8'; input.dispatchEvent(new Event('input', { bubbles: true }));
      window.defer = false; window.resolveApi(window.metadata.views);
    });
    await csvIdle(); assert.equal(await csvViews.locator('option').count(), 1, '遅れて届いたCSV一覧応答を破棄する');
    await page.evaluate(() => { window.fail = true; });
    await csvLoadViews.click({ force: true }); await csvIdle();
    assert.match(await csvPanel.innerText(), /一覧を取得できませんでした.*もう一度/);
    await page.evaluate(() => { window.fail = false; });
    results.push('CSV一覧: 全件解除・並び順保持・取得元変更/遅延応答の無効化・取得失敗からの再試行');
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
