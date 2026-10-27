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
    stdin: { contents: `export * from './src/entries/litePanelTheme.ts'; export * from './src/entries/appSearchControl.ts'; export { apiGet } from './src/api.ts'; export { activeRun } from './src/runControl.ts'; export { installLiteWorkflow } from './src/entries/liteWorkflow.ts';`, resolveDir: TOOL },
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

    // 対象アプリ表は「×」などの操作列を含めて横にはみ出さない（行が複数あっても同じ）
    await page.evaluate(() => window.table.setApps([{ appId: '303', guestId: '7' }, { appId: '1234567890', guestId: '12345' }]));
    for (const width of [1440, 1024, 768, 430, 390, 320]) {
      await page.setViewportSize({ width, height: 900 });
      await page.screenshot({ path: path.join(OUT, `shared-${width}.png`) });
      const rect = await page.locator('#shared-test').boundingBox();
      assert.ok(rect.x >= -1 && rect.x + rect.width <= width + 1, '共通パネルが画面幅に収まる');
      const overflow = await page.evaluate(() => {
        const scroll = window.table.element.querySelector('.kus-lp__apptable-scroll');
        const table = scroll.querySelector('table');
        const del = Array.from(scroll.querySelectorAll('tbody tr:first-child button')).find(button => button.textContent === '×');
        const box = del.getBoundingClientRect();
        const area = scroll.getBoundingClientRect();
        const input = scroll.querySelector('tbody tr:first-child input').getBoundingClientRect();
        return { inputWidth: input.width, scrollWidth: scroll.scrollWidth, clientWidth: scroll.clientWidth, tableScrollWidth: table.scrollWidth, tableClientWidth: table.clientWidth, delRight: box.right, areaRight: area.right };
      });
      assert.ok(overflow.scrollWidth <= overflow.clientWidth, `対象アプリ表が横にはみ出さない (${width}px): ${JSON.stringify(overflow)}`);
      assert.ok(overflow.tableScrollWidth <= overflow.tableClientWidth, `対象アプリ表の内側もはみ出さない (${width}px): ${JSON.stringify(overflow)}`);
      assert.ok(overflow.inputWidth >= 60, `アプリID入力欄が使える幅を保つ (${width}px): ${JSON.stringify(overflow)}`);
      assert.ok(overflow.delRight <= overflow.areaRight + 0.5, `「×」が表の外にはみ出さない (${width}px): ${JSON.stringify(overflow)}`);
    }
    await page.evaluate(() => window.table.setApps([{ appId: '303', guestId: '7' }]));
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
    // 中止ボタン・前回の所要時間・ログ保存・再起動時の位置引き継ぎ
    await page.evaluate(() => {
      window.cancelPanel = Shared.createLitePanel({ id: 'cancel-test', title: '中止テスト', accent: 'settings' });
      window.apiCalls.length = 0;
      window.pendingApi.length = 0;
    });
    const cancelButton = page.locator('#cancel-test .kus-lp__cancel');
    const cancelClose = page.locator('#cancel-test .kus-lp__close');
    const cancelElapsed = page.locator('#cancel-test .kus-lp__elapsed');
    const cancelStatus = page.locator('#cancel-test .kus-lp__status');
    assert.equal(await cancelButton.isHidden(), true, '待機中は中止ボタンを出さない');
    assert.equal(await cancelButton.getAttribute('aria-label'), '処理を中止');
    await page.evaluate(() => {
      // 1 件目の取得のあと、書き込み中を模した待機（中断できない処理）を挟んでから 2 件目を取得する
      window.cancelRun = Shared.liteRun(window.cancelPanel, '取得中', async () => {
        await Shared.apiGet('/k/v1', '/app.json', { id: 1 });
        await new Promise(resolve => { window.releaseGate = resolve; });
        await Shared.apiGet('/k/v1', '/app/views.json', { app: 1 });
      });
    });
    await cancelButton.waitFor({ state: 'visible' });
    assert.equal(await cancelButton.innerText(), '中止');
    assert.equal(await cancelButton.isEnabled(), true);
    assert.equal(await cancelClose.isDisabled(), true, '実行中は閉じるを無効にする');
    assert.equal(await page.evaluate(() => Shared.activeRun() !== null && !Shared.activeRun().cancelled), true);
    assert.equal(await page.evaluate(() => window.apiCalls.length), 1);
    await page.evaluate(() => window.pendingApi.shift().resolve({ id: 1 }));
    await page.waitForFunction(() => typeof window.releaseGate === 'function');
    await cancelButton.click();
    assert.equal(await cancelButton.innerText(), '中止中…');
    assert.equal(await cancelButton.isDisabled(), true, '中止の要求は一度だけ');
    assert.match(await cancelStatus.innerText(), /中止しています/);
    assert.equal(await page.evaluate(() => window.cancelPanel.isCancelRequested()), true);
    assert.equal(await page.evaluate(() => window.cancelPanel.requestCancel()), false, '二重の中止要求は受け付けない');
    await page.evaluate(() => window.releaseGate());
    await page.waitForFunction(() => document.querySelector('#cancel-test').getAttribute('aria-busy') === 'false');
    await page.evaluate(() => window.cancelRun);
    assert.equal(await cancelStatus.getAttribute('data-tone'), 'warn');
    assert.match(await cancelStatus.innerText(), /中止しました/);
    assert.equal(await page.evaluate(() => window.apiCalls.length), 1, '中止後は次のリクエストを送らない');
    // 読み取り中の中止: 応答を待たずに打ち切り、2 件目は送らない
    await page.evaluate(() => {
      window.pendingApi.length = 0;
      window.apiCalls.length = 0;
      window.cancelRun = Shared.liteRun(window.cancelPanel, '取得中', async () => {
        await Shared.apiGet('/k/v1', '/app.json', { id: 1 });
        await Shared.apiGet('/k/v1', '/app/views.json', { app: 1 });
      });
    });
    await cancelButton.waitFor({ state: 'visible' });
    await cancelButton.click();
    await page.waitForFunction(() => document.querySelector('#cancel-test').getAttribute('aria-busy') === 'false');
    await page.evaluate(() => window.cancelRun);
    assert.equal(await cancelStatus.getAttribute('data-tone'), 'warn');
    assert.match(await cancelStatus.innerText(), /中止しました/);
    assert.equal(await page.evaluate(() => window.apiCalls.length), 1, '読み取り中の中止でも次のリクエストを送らない');
    assert.equal(await cancelClose.isEnabled(), true, '中止後は閉じるを戻す');
    assert.equal(await cancelButton.isHidden(), true, '中止後は中止ボタンを隠す');
    assert.equal(await page.evaluate(() => Shared.activeRun()), null);
    assert.match(await cancelElapsed.textContent(), /^前回 /);
    assert.equal(await cancelElapsed.evaluate(element => element.classList.contains('kus-lp__elapsed--done') && !element.hidden && element.getAttribute('aria-hidden') === 'true'), true, '完了後も所要時間を残す');
    assert.equal(await cancelElapsed.evaluate(element => getComputedStyle(element, '::before').display), 'none', '完了後はスピナーを出さない');
    await page.evaluate(() => {
      window.pendingApi.length = 0;
      window.cancelRun = Shared.liteRun(window.cancelPanel, '次の取得中', async () => { await Shared.apiGet('/k/v1', '/app.json', { id: 2 }); });
    });
    assert.match(await cancelElapsed.textContent(), /^処理中 /, '次の処理を始めたら処理中の表示へ戻す');
    assert.equal(await cancelElapsed.evaluate(element => element.classList.contains('kus-lp__elapsed--done')), false);
    assert.equal(await cancelButton.isVisible(), true);
    await page.evaluate(() => window.pendingApi.shift().resolve({ id: 2 }));
    await page.evaluate(() => window.cancelRun);
    assert.equal(await cancelButton.isHidden(), true);
    assert.equal(await cancelStatus.getAttribute('data-tone'), 'ok', '中止していない処理は通常どおり完了する');
    await page.evaluate(() => window.cancelPanel.setResult('abc'));
    assert.equal(await page.getByRole('button', { name: 'ログをコピー', exact: true }).count(), 1);
    assert.equal(await page.getByRole('button', { name: 'ログをファイルに保存', exact: true }).count(), 1);
    assert.equal(await page.locator('#cancel-test .kus-lp__result > .kus-lp__result-tools > .kus-lp__result-copy').count(), 1);
    // ダウンロードの実体はアンカー経由。クリックを捕まえてファイル名と本文を確認する（実際の保存は行わない）。
    await page.evaluate(() => {
      window.savedLogs = [];
      document.addEventListener('click', event => {
        const anchor = event.target instanceof HTMLAnchorElement && event.target.download ? event.target : null;
        if (!anchor) return;
        event.preventDefault();
        fetch(anchor.href).then(response => response.text()).then(text => window.savedLogs.push({ name: anchor.download, text }));
      }, true);
    });
    await page.getByRole('button', { name: 'ログをファイルに保存', exact: true }).click();
    await page.waitForFunction(() => window.savedLogs.length === 1);
    const savedLog = await page.evaluate(() => window.savedLogs[0]);
    assert.match(savedLog.name, /^中止テスト_ログ_\d{8}_\d{6}\.txt$/);
    assert.equal(savedLog.text, 'abc', 'ログ本文だけを保存する（コピー／保存ボタンの文字を含めない）');
    assert.equal(await page.getByRole('button', { name: 'ログをファイルに保存', exact: true }).innerText(), '保存済み');
    results.push('中止: 実行中だけ表示・要求後は次のリクエストを送らない・警告で終了・閉じるの復帰・前回の所要時間を残す・ログのコピー／ファイル保存');

    await page.evaluate(() => window.cancelPanel.setCollapsed(true));
    const dragHero = page.locator('#cancel-test .kus-lp__title');
    const heroBox = await dragHero.boundingBox();
    await page.mouse.move(heroBox.x + 4, heroBox.y + 4);
    await page.mouse.down();
    await page.mouse.move(heroBox.x - 200, heroBox.y + 160, { steps: 5 });
    await page.mouse.up();
    const placed = await page.evaluate(() => { const style = document.querySelector('#cancel-test').style; return { left: style.left, top: style.top }; });
    assert.ok(placed.left && placed.top, 'ドラッグで位置を指定する');
    await page.evaluate(() => { window.cancelPanel = Shared.createLitePanel({ id: 'cancel-test', title: '中止テスト', accent: 'settings' }); });
    assert.deepEqual(await page.evaluate(() => { const style = document.querySelector('#cancel-test').style; return { left: style.left, top: style.top }; }), placed, '再起動しても動かした位置を保つ');
    assert.equal(await page.locator('#cancel-test.kus-lp--collapsed').count(), 0, '折りたたみ状態は引き継がない');
    await page.evaluate(() => window.cancelPanel.resetPosition());
    await page.evaluate(() => { window.cancelPanel = Shared.createLitePanel({ id: 'cancel-test', title: '中止テスト', accent: 'settings' }); });
    assert.equal(await page.evaluate(() => document.querySelector('#cancel-test').style.left), '', '位置を戻した後の再起動では引き継がない');
    await page.evaluate(() => window.cancelPanel.close());
    assert.equal(await page.locator('#cancel-test').count(), 0);
    results.push('再起動: ドラッグで動かした位置を引き継ぎ・折りたたみは引き継がない・位置リセット後は右上');

    // ===== ポップアップ: 詳細設定・ほかの操作・カードの「?」ヘルプ =====
    await page.evaluate(() => {
      const panel = Shared.createLitePanel({ id: 'popup-test', title: 'ポップアップ確認', accent: 'settings', badges: [{ label: '読み取り専用', tone: 'read' }] });
      window.popupPanel = panel;
      const card = Shared.makeCard({ title: '対象', number: 1 });
      card.body.appendChild(Shared.makeRow(Shared.makeInput({ placeholder: 'アプリID', value: '12', ariaLabel: 'ポップアップ用アプリID' }), { label: 'アプリ' }));
      card.body.appendChild(Shared.makeNote('これは補足説明です。', 'help'));
      card.body.appendChild(Shared.makeNote('これは警告です。', 'warn'));
      const adv = Shared.makeCard({ title: '出力形式', soft: true });
      const select = Shared.makeSelect([['a', '形式A'], ['b', '形式B']], 'a');
      select.setAttribute('aria-label', '形式');
      adv.body.appendChild(Shared.makeRow(select, { label: '形式' }));
      adv.body.appendChild(Shared.makeNote('形式の説明。', 'help'));
      window.popupCalls = 0;
      const make = id => { const button = Shared.makeButton(id); button.addEventListener('click', () => Shared.liteRun(panel, '処理中', async () => { window.popupCalls += 1; }, '完了')); return button; };
      Shared.installLiteWorkflow(panel, { setup: [card.card], advanced: [adv.card], advancedCopy: '出力形式はここから。',
        actions: ['A', 'B', 'C', 'D', 'E'].map(id => ({ id, label: `操作${id}`, description: `${id} の説明。`, button: make(id), validate: () => '', summary: () => [['対象', '#12'], ['形式', select.value]] })) });
    });
    const popupPanel = page.locator('#popup-test');
    assert.equal(await page.getByRole('radio').filter({ visible: true }).count(), 3, '表面に出す操作は3つまで');
    const moreButton = page.getByRole('button', { name: /ほかの操作…/ });
    await moreButton.click();
    assert.equal(await page.locator('#popup-test-more-actions').evaluate(dialog => dialog.open), true, 'ほかの操作のポップアップが開く');
    await page.getByRole('radio', { name: '操作D' }).check();
    assert.equal(await page.locator('#popup-test-more-actions').evaluate(dialog => dialog.open), false, '選ぶと閉じる');
    assert.equal(await page.getByRole('button', { name: /操作D/ }).getAttribute('aria-pressed'), 'true', '選んだ操作を表面に示す');
    await page.getByRole('button', { name: '詳細設定…' }).click();
    const advancedDialog = page.locator('#popup-test-advanced');
    assert.equal(await advancedDialog.evaluate(dialog => dialog.open), true, '詳細設定のポップアップが開く');
    assert.equal(await advancedDialog.getByText('形式の説明。').isVisible(), false, '補足説明は閉じている');
    await advancedDialog.getByRole('button', { name: '「出力形式」の説明を表示' }).click();
    assert.equal(await advancedDialog.getByText('形式の説明。').isVisible(), true, '「?」で補足説明を開く');
    await page.keyboard.press('Escape');
    assert.equal(await advancedDialog.getByText('形式の説明。').isVisible(), false, '「?」が開いているときの Esc は吹き出しだけを閉じる');
    assert.equal(await advancedDialog.evaluate(dialog => dialog.open), true);
    await page.keyboard.press('Escape');
    assert.equal(await advancedDialog.evaluate(dialog => dialog.open), false, 'Esc はポップアップだけを閉じる');
    assert.equal(await popupPanel.count(), 1, 'パネルは閉じない');
    await page.getByRole('button', { name: '詳細設定…' }).click();
    await advancedDialog.getByRole('combobox', { name: '形式' }).selectOption('b');
    await advancedDialog.getByRole('button', { name: '詳細設定を閉じる' }).click();
    await page.getByRole('button', { name: '内容を確認する' }).click();
    assert.match(await popupPanel.locator('.kus-wf-summary').innerText(), /形式[\s\S]*b/, 'ポップアップの設定が確認画面に出る');
    await page.getByRole('button', { name: '操作D' }).click();
    await page.waitForFunction(() => document.querySelector('#popup-test').getAttribute('aria-busy') !== 'true');
    assert.equal(await page.evaluate(() => window.popupCalls), 1, 'ほかの操作で選んだ操作を実行する');
    await page.getByRole('tab', { name: /1 対象と操作/ }).click();
    assert.equal(await page.getByText('これは補足説明です。').isVisible(), false);
    assert.equal(await page.getByText('これは警告です。').isVisible(), true, '警告は表面に残す');
    await page.getByRole('button', { name: '「対象」の説明を表示' }).click();
    assert.equal(await page.getByText('これは補足説明です。').isVisible(), true);
    for (const width of [320, 768]) {
      await page.setViewportSize({ width, height: 700 });
      await page.getByRole('button', { name: '詳細設定…' }).click();
      const box = await advancedDialog.boundingBox();
      assert.ok(box && box.x >= 0 && box.x + box.width <= width + 1, `ポップアップが画面内に収まる (${width})`);
      await page.screenshot({ path: path.join(OUT, `popup-${width}.png`) });
      await page.keyboard.press('Escape');
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.evaluate(() => window.popupPanel.close());
    assert.equal(await popupPanel.count(), 0);
    results.push('ポップアップ: 詳細設定・ほかの操作・「?」ヘルプ・Esc の扱い・確認画面への反映・320/768px');

    await page.locator('#launcher').focus();
    await page.evaluate(() => {
      window.firstPanel = Shared.createLitePanel({ id: 'escape-first', title: '一つ目', accent: 'settings' });
      const input = Shared.makeInput({ ariaLabel: '一つ目の入力' });
      window.firstPanel.body.append(input);
    });
    await page.getByRole('textbox', { name: '一つ目の入力', exact: true }).focus();
    await page.evaluate(() => {
      window.secondPanel = Shared.createLitePanel({ id: 'escape-second', title: '二つ目', accent: 'settings' });
      const input = Shared.makeInput({ ariaLabel: '二つ目の入力' });
      window.secondPanel.body.append(input);
    });
    const secondInput = page.getByRole('textbox', { name: '二つ目の入力', exact: true });
    await secondInput.focus();
    await page.locator('#launcher').focus();
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('.kus-lp').count(), 2, 'kintone側のEscでツールを閉じない');
    await secondInput.focus();
    await secondInput.dispatchEvent('keydown', { key: 'Escape', isComposing: true });
    assert.equal(await page.locator('.kus-lp').count(), 2, '日本語変換の取消でツールを閉じない');
    await secondInput.evaluate(input => input.addEventListener('keydown', event => event.preventDefault(), { once: true }));
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('.kus-lp').count(), 2, '子コントロールが処理したEscを横取りしない');
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#escape-second').count(), 0);
    assert.equal(await page.locator('#escape-first').count(), 1, '操作していない別ツールを閉じない');
    assert.equal(await page.getByRole('textbox', { name: '一つ目の入力', exact: true }).evaluate(input => document.activeElement === input), true);
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('.kus-lp').count(), 0);
    assert.equal(await page.evaluate(() => document.activeElement.id), 'launcher');
    results.push('Esc: 操作中のパネルのみ閉じる・日本語変換と子操作を優先・kintone側操作を保持');
    assert.deepEqual(errors, []);
    results.push('320〜1440px・実行中の閉じる防止・フォーカス復帰・再起動の後始末');
  } finally {
    await browser.close();
    fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(results, null, 2));
  }
  console.log(JSON.stringify({ passed: results.length, results }, null, 2));
}
main().catch(error => { console.error(error); process.exitCode = 1; });
