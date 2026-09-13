#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '../..');
const TOOL = path.join(ROOT, 'tools/統合ツール');
const OUT = path.join(ROOT, '.iter-shots/lite-shared');
const esbuild = require(path.join(TOOL, 'node_modules/esbuild'));
const metadata = require(path.join(TOOL, 'tests/fixtures/api-metadata.json'));

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const build = await esbuild.build({ absWorkingDir: TOOL, bundle: true, write: false,
    stdin: { contents: `export * from './src/entries/litePanelTheme.ts'; export * from './src/entries/appSearchControl.ts';`, resolveDir: TOOL },
    format: 'iife', globalName: 'Shared', platform: 'browser', target: ['chrome110'], logLevel: 'silent' });
  const browserName = process.argv.includes('--browser') ? process.argv[process.argv.indexOf('--browser') + 1] : 'chrome';
  const browser = await chromium.launch({ headless: true, ...(browserName === 'chromium' ? {} : { channel: browserName }) });
  const results = [];
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/*', route => route.abort());
    await page.setContent('<!doctype html><html lang="ja"><meta charset="utf-8"><body><button id="launcher">ツールを開く</button></body></html>');
    await page.addScriptTag({ content: build.outputFiles[0].text });
    await page.evaluate(() => {
      document.querySelector('#launcher').focus();
      window.apiCalls = [];
      window.pendingApi = [];
      window.kintone = { api: (url, method, params) => {
        window.apiCalls.push({ url, method, params });
        return new Promise((resolve, reject) => window.pendingApi.push({ resolve, reject }));
      } };
      window.panel = Shared.createLitePanel({ id: 'shared-test', title: '共通操作テスト', accent: 'settings' });
      window.guestTarget = Shared.makeInput({ ariaLabel: '対象ゲスト' });
      window.guestTarget.value = '9';
      window.picks = [];
      window.search = Shared.createAppSearchControl(window.panel, { open: true, guestEl: window.guestTarget,
        targets: [{ apply: (...args) => { window.picks.push(args); } }] });
      window.panel.body.prepend(window.search);
      window.table = Shared.makeAppTable({ initial: [{ appId: '202', guestId: '7' }] });
      window.panel.body.append(window.table.element);
      const tabs = Shared.makeTabs(['A', 'B', 'C'].map(id => ({ id, label: id, build: element => { element.textContent = id + ' の内容'; } })), { initial: 'missing' });
      window.panel.body.append(tabs.bar, tabs.panels);
    });
    const keyword = page.getByPlaceholder('アプリ名 / アプリID / URL', { exact: true });
    const guest = page.getByPlaceholder('ゲストID（任意）', { exact: true });
    const searchButton = page.getByRole('button', { name: '検索', exact: true });
    const more = page.getByRole('button', { name: 'さらに100件を取得', exact: true });
    const rows = page.locator('.kus-as__table tbody tr');
    const idle = () => page.waitForFunction(() => !document.querySelector('.kus-as__result') || document.querySelector('.kus-as__result').getAttribute('aria-busy') === 'false');
    const resolve = async response => { await page.evaluate(data => window.pendingApi.shift().resolve(data), response); await idle(); };

    await keyword.fill('顧客');
    await guest.fill('7');
    await keyword.dispatchEvent('keydown', { key: 'Enter', isComposing: true });
    assert.equal(await page.evaluate(() => window.apiCalls.length), 0);
    await searchButton.evaluate(button => { button.click(); button.click(); });
    await keyword.press('Enter');
    assert.equal(await page.evaluate(() => window.apiCalls.length), 1, '連打とEnterで検索を重複しない');
    assert.deepEqual(await page.evaluate(() => window.apiCalls[0]), { url: '/k/guest/7/v1/apps.json', method: 'GET', params: { limit: 100, offset: 0, name: '顧客' } });
    await resolve({ apps: Array.from({ length: 100 }, (_, i) => ({ appId: String(i + 1), name: `候補 ${i + 1}` })) });
    assert.equal(await rows.count(), 100);
    assert.equal(await more.isVisible(), true);
    await more.click();
    await page.evaluate(() => window.pendingApi.shift().reject(new Error('権限を確認してください')));
    await idle();
    assert.equal(await rows.count(), 100, '追加取得の失敗で取得済み候補を失わない');
    assert.equal(await more.isEnabled(), true);
    await more.click();
    await resolve({ apps: [{ appId: '100', name: '候補 100' }, { appId: '101', name: '候補 101' }] });
    assert.equal(await rows.count(), 101, '重複を除き101件目を表示する');
    assert.deepEqual(await page.evaluate(() => window.apiCalls.map(call => call.params.offset)), [0, 100, 100]);
    assert.equal(await more.isVisible(), false);
    results.push('検索: 100件超・ページ再試行・重複除去・二重実行防止・IME');

    await keyword.fill('古い条件');
    await searchButton.click();
    await keyword.fill('新しい条件');
    await resolve({ apps: [{ appId: '888', name: '古い応答' }] });
    assert.equal(await rows.count(), 0, '条件変更後に古い応答を表示しない');
    await keyword.fill('https://example.cybozu.com/k/guest/8/42/');
    await searchButton.click();
    assert.equal(await page.evaluate(() => window.apiCalls.at(-1).url), '/k/guest/8/v1/app.json');
    await resolve({ name: 'ゲストのアプリ' });
    await page.getByRole('button', { name: '選択', exact: true }).click();
    assert.deepEqual(await page.evaluate(() => window.picks.at(-1)), ['42', 'ゲストのアプリ', '8']);
    assert.equal(await page.evaluate(() => window.guestTarget.value), '8');
    await keyword.fill('https://example.cybozu.com/k/43/');
    await searchButton.click();
    await resolve({ name: '通常のアプリ' });
    await page.getByRole('button', { name: '選択', exact: true }).click();
    assert.equal(await page.evaluate(() => window.guestTarget.value), '');
    await guest.fill('3');
    assert.equal(await rows.count(), 0, 'ゲスト変更で候補を無効化する');
    await keyword.fill('処理前の検索');
    await searchButton.click();
    await page.evaluate(() => { window.panel.setBusy(true); window.panel.setStatus('設定を取得中', 'busy'); });
    await resolve({ apps: [{ appId: '999', name: '古い検索結果' }] });
    assert.equal(await rows.count(), 0);
    assert.equal(await searchButton.isDisabled(), true);
    assert.match(await page.locator('.kus-lp__status').innerText(), /設定を取得中/);
    await page.evaluate(() => { window.panel.setStatus('設定の取得完了', 'ok'); window.panel.setBusy(false); });
    assert.equal(await searchButton.isEnabled(), true, '本処理完了後に検索を再開できる');
    results.push('検索: 古い応答の破棄・URLのゲスト優先・通常スペースへの切り替え');

    const mode = page.getByRole('combobox', { name: '検索方法', exact: true });
    const space = page.getByRole('textbox', { name: '検索対象スペースID', exact: true });
    await guest.fill('');
    await mode.selectOption('code');
    const code = page.getByPlaceholder('アプリコード（完全一致）', { exact: true });
    await code.fill('ClientB'); await space.fill('18'); await searchButton.click();
    assert.deepEqual(await page.evaluate(() => window.apiCalls.at(-1)), { url: '/k/v1/apps.json', method: 'GET', params: { limit: 100, offset: 0, codes: ['ClientB'], spaceIds: ['18'] } });
    await resolve({ apps: [metadata.apps.apps[0]] });
    assert.match(await rows.innerText(), /コード: ClientB.*スペース: 18.*更新:.*更新担当/s);
    await code.fill('123'); await searchButton.click();
    assert.deepEqual(await page.evaluate(() => window.apiCalls.at(-1).params.codes), ['123'], '数字だけのコードをアプリIDと誤認しない');
    await resolve({ apps: [] });
    await mode.selectOption('name'); await keyword.fill('顧客台帳'); await space.fill(''); await searchButton.click();
    await resolve(metadata.apps);
    assert.equal(await rows.nth(0).locator('td').first().innerText(), '9223372036854775806', '64bit IDを丸めずに並べる');
    assert.match(await rows.nth(0).innerText(), /スペース外/);
    assert.equal(await page.locator('.kus-as__result img').count(), 0, 'APIの名前をHTMLとして実行しない');
    await space.fill('21'); assert.equal(await rows.count(), 0, '所属スペースの変更で古い候補を消す');
    const beforeInvalid = await page.evaluate(() => window.apiCalls.length);
    await space.fill('invalid'); await searchButton.click();
    await space.fill(''); await keyword.fill('名'.repeat(65)); await searchButton.click();
    await mode.selectOption('code'); await code.fill(''); await searchButton.click();
    assert.equal(await page.evaluate(() => window.apiCalls.length), beforeInvalid, '入力制限に違反した検索をAPIに送らない');
    await mode.selectOption('name'); await keyword.fill('42'); await searchButton.click();
    await page.evaluate(() => window.pendingApi.shift().reject(new Error('アプリ情報を取得できません'))); await idle();
    assert.match(await rows.innerText(), /ID指定（名称未取得）.*コード未取得.*所属スペース未取得/s);
    results.push('検索: コード完全一致・スペース絞り込み・所属/更新情報・64bit ID・安全な文字表示・入力制限');

    const tabs = page.getByRole('tab');
    assert.equal(await tabs.nth(0).getAttribute('aria-selected'), 'true');
    await tabs.nth(0).focus();
    await page.keyboard.press('End');
    assert.equal(await tabs.nth(2).getAttribute('aria-selected'), 'true');
    assert.equal(await tabs.nth(2).evaluate(element => document.activeElement === element), true);
    await page.keyboard.press('ArrowRight');
    assert.equal(await tabs.nth(0).getAttribute('aria-selected'), 'true');
    assert.equal(await page.locator('[role=tab][tabindex="0"]').count(), 1);
    const pasted = await page.evaluate(() => {
      const input = window.table.element.querySelector('input');
      input.focus(); input.select();
      const clipboardData = new DataTransfer(); clipboardData.setData('text/plain', '303,404');
      input.dispatchEvent(new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData }));
      return window.table.getApps();
    });
    assert.deepEqual(pasted, [{ appId: '303', guestId: '7' }, { appId: '404', guestId: '7' }]);
    assert.deepEqual(await page.evaluate(() => {
      window.table.setApps([{ appId: '', guestId: '7' }]);
      window.table.putApp('42', '');
      return window.table.getApps();
    }), [{ appId: '42', guestId: '' }], '通常スペースの候補に空行のゲストIDを流用しない');
    const bulk = await page.evaluate(() => {
      const start = performance.now();
      window.table.setApps(Array.from({ length: 1000 }, (_, i) => ({ appId: String(i + 1), guestId: '' })));
      return { count: window.table.count(), rows: window.table.element.querySelectorAll('tbody tr').length, durationMs: performance.now() - start };
    });
    assert.equal(bulk.count, 1000); assert.equal(bulk.rows, 1000);
    results.push({ name: 'キーボードタブ操作・選択範囲への貼り付け・1000行一括入力', ...bulk });
    await page.evaluate(() => window.table.setApps([{ appId: '303', guestId: '7' }]));

    await page.evaluate(async () => {
      await Shared.liteRun(window.panel, '処理中', async () => window.panel.setStatus('一部取得できませんでした', 'warn'), '成功');
    });
    assert.equal(await page.locator('.kus-lp__status').getAttribute('data-tone'), 'warn');
    assert.match(await page.locator('.kus-lp__status').innerText(), /一部取得できませんでした/);
    assert.equal(await page.locator('.kus-lp__status').getAttribute('aria-live'), 'polite');
    await page.evaluate(async () => {
      await Shared.liteRun(window.panel, '処理中', async () => { throw new Error('保存に失敗\n対象アプリ: 42'); });
    });
    assert.equal(await page.locator('.kus-lp__status').getAttribute('data-tone'), 'err');
    assert.match(await page.locator('.kus-lp__result').innerText(), /対象アプリ: 42/);
    assert.equal(await page.locator('#shared-test').getAttribute('aria-busy'), 'false');
    results.push('部分成功の警告保持・エラー詳細・処理中状態の復帰・ステータス読み上げ');

    for (const width of [1440, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 900 });
      await page.screenshot({ path: path.join(OUT, `shared-${width}.png`) });
      const rect = await page.locator('#shared-test').boundingBox();
      assert.ok(rect.x >= -1 && rect.x + rect.width <= width + 1, '共通パネルが画面幅に収まる');
    }
    await page.evaluate(() => { window.panel.setBusy(true); window.panel.close(); });
    assert.equal(await page.locator('#shared-test').count(), 1);
    await page.evaluate(() => { window.panel.setBusy(false); window.search.querySelector('input').focus(); window.panel.close(); });
    assert.equal(await page.evaluate(() => document.activeElement.id), 'launcher');
    const listenerCount = await page.evaluate(() => {
      const listeners = new Set();
      const add = document.addEventListener.bind(document);
      const remove = document.removeEventListener.bind(document);
      document.addEventListener = (type, fn, options) => { if (type === 'keydown') listeners.add(fn); add(type, fn, options); };
      document.removeEventListener = (type, fn, options) => { if (type === 'keydown') listeners.delete(fn); remove(type, fn, options); };
      for (let i = 0; i < 5; i++) window.panel = Shared.createLitePanel({ id: 'repeat-test', title: '再起動', accent: 'settings' });
      window.panel.close();
      return listeners.size;
    });
    assert.equal(listenerCount, 0, '再起動でdocumentのリスナーを残さない');
    assert.deepEqual(errors, []);
    results.push('320〜1440px・実行中の閉じる防止・フォーカス復帰・再起動の後始末');
  } finally {
    await browser.close();
    fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(results, null, 2));
  }
  console.log(JSON.stringify({ passed: results.length, results }, null, 2));
}
main().catch(error => { console.error(error); process.exitCode = 1; });
