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
    stdin: { contents: `export * from './src/entries/litePanelTheme.ts'; export * from './src/entries/appSearchControl.ts'; export * from './src/entries/appNameHint.ts';`, resolveDir: TOOL },
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

    // ---- 入力中のアプリ名確認: 対象アプリ表の行 ----
    await page.evaluate(() => {
      window.lookupLog = [];
      window.lookupNames = { '|303': '受注管理', '7|404': 'ゲストの案件', '|505': '顧客管理' };
      window.lookup = async (appId, guestId) => {
        const key = `${guestId}|${appId}`;
        window.lookupLog.push(key);
        await new Promise(resolve => setTimeout(resolve, 40));
        return window.lookupNames[key]
          ? { ok: true, appId, name: window.lookupNames[key], code: key === '|505' ? 'customer' : '' }
          : { ok: false, message: 'アプリを確認できません。ID・ゲストスペース・閲覧権限を確認してください。' };
      };
      window.summaryChanges = 0;
      window.panel.root.addEventListener('kus-lite-summary-change', () => { window.summaryChanges += 1; });
      window.lookupTable = Shared.makeAppTable({ initial: [{ appId: '303', guestId: '' }], lookupAppName: window.lookup });
      window.lookupTable.element.id = 'lookup-table';
      window.panel.body.append(window.lookupTable.element);
    });
    const lookupName = n => page.locator('#lookup-table .kus-lp__apptable-name').nth(n);
    const lookupInput = n => page.locator('#lookup-table input[aria-label="アプリID"]').nth(n);
    const lookupGuest = n => page.locator('#lookup-table input[aria-label="ゲストID"]').nth(n);
    await page.waitForFunction(() => window.lookupTable.getApps()[0]?.appName === '受注管理');
    assert.equal(await lookupName(0).innerText(), '受注管理', '初期行のアプリ名を表示する');
    assert.deepEqual(await page.evaluate(() => window.lookupLog), ['|303'], '初期行のアプリ名を本番側で確認する');
    assert.ok(await page.evaluate(() => window.summaryChanges) >= 1, '名前が決まったら要約の更新を通知する');
    await lookupInput(0).fill('999');
    await lookupInput(0).dispatchEvent('change');
    await page.waitForFunction(() => document.querySelector('#lookup-table .kus-lp__apptable-name').dataset.lookup === 'failed');
    assert.match(await lookupName(0).innerText(), /確認できません/, '確認できない ID を警告する');
    assert.equal(await page.evaluate(() => window.lookupTable.getApps()[0].appName), undefined, '確認できない ID に名前を付けない');
    await lookupGuest(0).fill('7');
    await lookupInput(0).fill('404');
    await lookupInput(0).dispatchEvent('change');
    await page.waitForFunction(() => window.lookupTable.getApps()[0]?.appName === 'ゲストの案件');
    assert.equal(await page.evaluate(() => window.lookupLog.at(-1)), '7|404', 'ゲストスペースの接続先で問い合わせる');
    await page.evaluate(() => window.lookupTable.putApp('303', '', { appName: '検索で設定した名前' }));
    await page.evaluate(() => window.lookupTable.addRow('505', ''));
    await page.waitForFunction(() => window.lookupTable.getApps()[2]?.appName === '顧客管理');
    assert.equal(await page.evaluate(() => window.lookupLog.filter(entry => entry === '|303').length), 1, '名前付きで追加した行は問い合わせない');
    assert.equal(await page.evaluate(() => window.lookupTable.getApps().map(row => row.appName).join('/')), 'ゲストの案件/検索で設定した名前/顧客管理');
    const clearAll = page.locator('#lookup-table').getByRole('button', { name: '全行を消去', exact: true });
    await page.evaluate(() => { window.confirmCalls = []; window.confirm = message => { window.confirmCalls.push(message); return false; }; });
    await clearAll.click();
    assert.equal(await page.evaluate(() => window.lookupTable.count()), 3, '確認で取り消したら消さない');
    assert.match(await page.evaluate(() => window.confirmCalls[0]), /3 件をすべて消去/);
    await page.evaluate(() => { window.confirm = () => true; });
    await clearAll.click();
    assert.equal(await page.evaluate(() => window.lookupTable.count()), 0, '全行を消去する');
    assert.equal(await page.locator('#lookup-table tbody tr').count(), 1, '空の 1 行を残す');
    assert.equal(await clearAll.isDisabled(), true, '空の表では無効');
    results.push('表のアプリ名確認: 初期行・失敗の警告・ゲスト変更・名前付き追加は問い合わせない・全行を消去');

    // ---- 入力中のアプリ名確認: 単一ID欄・複数ID欄 ----
    await page.evaluate(() => {
      window.lookupLog = [];
      window.hintApp = Shared.makeInput({ ariaLabel: 'ヒント用アプリID' });
      window.hintGuest = Shared.makeInput({ ariaLabel: 'ヒント用ゲストID' });
      window.hint = Shared.createAppNameHint({ panel: window.panel, appInput: window.hintApp, guestInput: window.hintGuest, lookup: window.lookup });
      window.hintMulti = Shared.makeInput({ ariaLabel: 'ヒント用複数ID' });
      window.hintM = Shared.createAppNameHint({ panel: window.panel, appInput: window.hintMulti, multiple: true, lookup: window.lookup });
      window.panel.body.append(window.hintApp, window.hintGuest, window.hint.element, window.hintMulti, window.hintM.element);
    });
    const hintApp = page.getByRole('textbox', { name: 'ヒント用アプリID', exact: true });
    const hintGuest = page.getByRole('textbox', { name: 'ヒント用ゲストID', exact: true });
    const hintMulti = page.getByRole('textbox', { name: 'ヒント用複数ID', exact: true });
    assert.equal(await page.evaluate(() => window.hint.element.hidden), true, '未入力では何も出さない');
    assert.equal(await page.evaluate(() => window.hint.element.getAttribute('aria-live')), 'polite');
    await hintApp.fill('5'); await hintApp.fill('50'); await hintApp.fill('505');
    await page.waitForFunction(() => /✓/.test(window.hint.element.textContent));
    assert.equal(await page.evaluate(() => window.hint.element.textContent), '✓ 顧客管理（コード: customer）');
    assert.deepEqual(await page.evaluate(() => window.lookupLog), ['|505'], '入力途中の値を問い合わせない');
    assert.equal(await page.evaluate(() => window.hint.name()), '顧客管理');
    assert.equal(await page.evaluate(() => window.hint.label()), '#505 顧客管理');
    await hintGuest.fill('7');
    await page.waitForFunction(() => /確認できません/.test(window.hint.element.textContent));
    assert.equal(await page.evaluate(() => window.hint.element.classList.contains('kus-lp__app-note--warn')), true, '確認できない接続先を警告色で示す');
    assert.equal(await page.evaluate(() => window.hint.name()), '', '確認できないときは名前を返さない');
    assert.equal(await page.evaluate(() => window.hint.label()), '#505（ゲスト 7）');
    const lookupsBeforeRecheck = await page.evaluate(() => window.lookupLog.length);
    await hintGuest.dispatchEvent('change');
    await page.waitForFunction(count => window.lookupLog.length > count, lookupsBeforeRecheck);
    assert.equal(await page.evaluate(() => window.lookupLog.at(-1)), '7|505', '確定（change）で失敗した確認をやり直す');
    await hintMulti.fill('303, 999 404');
    await page.waitForFunction(() => /#404/.test(window.hintM.element.textContent) && !/確認中/.test(window.hintM.element.textContent));
    assert.match(await page.evaluate(() => window.hintM.element.textContent), /#303 受注管理 \/ #999 確認できません \/ #404 確認できません/, '複数 ID を並べて示す');
    assert.equal(await page.evaluate(() => window.hintM.label()), '#303 受注管理、#999、#404');
    assert.equal(await page.evaluate(() => window.hintM.names().size), 1);
    await hintMulti.fill('303');
    await page.waitForFunction(() => window.hintM.element.textContent === '#303 受注管理');
    assert.equal(await page.evaluate(() => window.hintM.element.classList.contains('kus-lp__app-note--ok')), true);
    await hintMulti.fill('abc');
    assert.equal(await page.evaluate(() => window.hintM.element.hidden), true, '問い合わせできない形の ID では何も出さない');
    results.push('アプリ名の確認: 入力途中は問い合わせない・警告色・確定で再確認・複数 ID 欄');

    // ---- 拡大表示 ----
    const maximize = page.locator('#shared-test').getByRole('button', { name: '拡大表示', exact: true });
    await maximize.click();
    const maxRect = await page.locator('#shared-test').boundingBox();
    const viewport = page.viewportSize();
    assert.ok(Math.abs(maxRect.width - (viewport.width - 24)) <= 2 && maxRect.x <= 13 && maxRect.y <= 13, '拡大表示で画面いっぱいに広げる ' + JSON.stringify(maxRect));
    const restore = page.locator('#shared-test').getByRole('button', { name: '元の大きさに戻す', exact: true });
    assert.equal(await restore.getAttribute('aria-pressed'), 'true');
    await page.evaluate(() => {
      const hero = document.querySelector('#shared-test .kus-lp__hero');
      const rect = hero.getBoundingClientRect();
      const init = (type, dx, dy) => new PointerEvent(type, { bubbles: true, button: 0, pointerId: 1, clientX: rect.left + 40 + dx, clientY: rect.top + 10 + dy });
      hero.dispatchEvent(init('pointerdown', 0, 0));
      hero.dispatchEvent(init('pointermove', 200, 200));
      hero.dispatchEvent(init('pointerup', 200, 200));
    });
    const afterDrag = await page.locator('#shared-test').boundingBox();
    assert.ok(Math.abs(afterDrag.x - maxRect.x) <= 1 && Math.abs(afterDrag.y - maxRect.y) <= 1, '拡大中はドラッグしても位置が変わらない');
    await restore.click();
    const restored = await page.locator('#shared-test').boundingBox();
    assert.ok(restored.width < maxRect.width - 100, '元の大きさに戻す');
    assert.equal(await maximize.getAttribute('aria-pressed'), 'false');
    results.push('拡大表示: 画面いっぱい・ドラッグ固定・元の大きさに戻す');

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
