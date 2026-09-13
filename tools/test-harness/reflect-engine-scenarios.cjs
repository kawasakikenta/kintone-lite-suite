'use strict';
const assert = require('node:assert/strict');
const path = require('node:path');

// The production UI and engine run together. Only the kintone transport is synthetic.
module.exports = async function verifyReflectEngine({ page, esbuild, tool, out }) {
  const bundle = await esbuild.build({ absWorkingDir: tool, entryPoints: ['src/entries/reflect-lite-ui.ts'], bundle: true, write: false, format: 'iife', globalName: 'ReflectActual', platform: 'browser', target: ['chrome110'], logLevel: 'silent' });
  const button = name => page.getByRole('button', { name, exact: true });
  const tab = name => page.getByRole('tab', { name: new RegExp(name) });
  const final = () => button('最終確認に進む');
  const run = () => page.getByRole('button', { name: /^確認した .* 項目をプレビューへ反映/ });
  const writes = () => page.evaluate(() => window.__actual.writes);
  const idle = () => page.waitForFunction(() => document.querySelector('#kus-reflect-lite').getAttribute('aria-busy') !== 'true');
  async function reset(mode = '') {
    await page.setContent('<!doctype html><html lang="ja"><meta charset="utf-8"><body></body></html>');
    await page.evaluate(mode => {
      const field = (code, label = code) => ({ type: 'SINGLE_LINE_TEXT', code, label, required: false });
      const view = (name, fields, index = '0') => ({ type: 'LIST', name, fields, index, filterCond: '', sort: '' });
      const row = fields => ({ type: 'ROW', fields: fields.map(code => ({ type: 'SINGLE_LINE_TEXT', code })) });
      const state = window.__actual = { mode, sourceRevision: 10, targetRevision: 20, writes: [], events: [], blobs: [],
        source: { fieldSettings: { properties: { name: field('name', '顧客名'), tag: field('tag', '担当部署') } }, layoutSettings: { layout: [row(['name', 'tag'])] }, viewSettings: { views: { All: view('All', mode === 'destructive' ? ['name'] : ['name', 'tag']) } } },
        target: { fieldSettings: { properties: { name: field('name', '取引先'), local: field('local', '営業所メモ') } }, layoutSettings: { layout: [row(['name', 'local'])] }, viewSettings: { views: { All: view('All', ['name']), '営業所専用': view('営業所専用', ['local'], '1') } } }
      };
      const endpoints = { '/app/form/fields.json': 'fieldSettings', '/app/form/layout.json': 'layoutSettings', '/app/views.json': 'viewSettings' };
      const api = async (url, method, body) => {
        state.events.push(method + ':' + url);
        if (url.endsWith('/app.json')) return { appId: mode === 'wrong-identity' ? '999' : body.id, name: body.id === '101' ? '営業テンプレート' : '東京営業所', code: '' };
        const key = Object.entries(endpoints).find(([endpoint]) => url.endsWith(endpoint))?.[1];
        if (!key) throw Error('Unexpected API ' + url);
        if (method === 'GET') {
          if (mode === 'incomplete' && body.app === '202' && key === 'viewSettings') throw Error('設定を取得できません');
          return { ...structuredClone(body.app === '101' ? state.source[key] : state.target[key]), revision: String(body.app === '101' ? state.sourceRevision : state.targetRevision) };
        }
        state.writes.push({ url, method, body });
        if (!url.includes('/preview/') || body.app !== '202') throw Error('Wrong write destination');
        if (body.revision !== String(state.targetRevision)) throw { code: 'GAIA_CO02', message: 'revision mismatch' };
        state.targetRevision++;
        return { revision: String(state.targetRevision) };
      };
      api.url = value => value;
      window.kintone = { app: { getId: () => 202 }, api };
      const create = URL.createObjectURL.bind(URL);
      URL.createObjectURL = blob => { state.blobs.push(blob); return create(blob); };
      HTMLAnchorElement.prototype.click = function () { state.events.push('download:' + this.download); };
    }, mode);
    await page.addScriptTag({ content: bundle.outputFiles[0].text });
    await page.evaluate(() => ReflectActual.mountReflectLitePanel());
    await page.getByRole('textbox', { name: '比較元アプリID', exact: true }).fill('101');
  }
  async function compare() { await button('差分を確認する').click(); await idle(); }
  async function acknowledge() {
    await final().click(); assert.equal(await run().isDisabled(), true);
    assert.match(await page.locator('#kus-rl-stage-confirm').innerText(), /東京営業所.*202/);
    await page.getByRole('checkbox', { name: '反映内容の確認', exact: true }).check();
    const id = page.getByRole('textbox', { name: '確認用の反映先アプリID', exact: true });
    if (await id.isVisible()) {
      await id.fill('101'); assert.equal(await run().isDisabled(), true);
      await id.fill('202'); await id.press('Enter'); assert.equal((await writes()).length, 0);
    }
  }

  await reset();
  assert.equal(await page.getByRole('combobox', { name: '反映元の取得環境' }).inputValue(), 'production');
  await compare();
  assert.equal((await writes()).length, 0); assert.equal(await final().isEnabled(), true);
  await page.locator('.kus-rl-changes summary').first().click();
  await page.getByText('取引先', { exact: true }).waitFor();
  assert.match(await page.locator('#kus-rl-stage-review').innerText(), /取引先/);
  await button('反映計画JSONを保存').click();
  const exported = await page.evaluate(async () => JSON.parse(await window.__actual.blobs[0].text()));
  assert.equal(exported.identities.target.name, '東京営業所');
  assert.equal(exported.entries.find(entry => entry.sectionKey === 'viewSettings').operations[0].body.views['営業所専用'].name, '営業所専用');
  await acknowledge();
  await button('差分に戻る').click();
  await final().click(); assert.equal(await page.getByRole('checkbox', { name: '反映内容の確認', exact: true }).isChecked(), false, '戻る操作で同意を解除');
  await button('差分に戻る').click(); await acknowledge();
  await page.screenshot({ path: path.join(out, 'confirm-actual-desktop.png') });
  await page.setViewportSize({ width: 320, height: 640 });
  await page.screenshot({ path: path.join(out, 'confirm-actual-mobile.png') });
  assert.ok(await page.locator('.kus-rl-canvas').evaluate(element => element.scrollWidth - element.clientWidth <= 1));
  assert.ok(await page.locator('.kus-rl-canvas').evaluate(element => element.clientHeight >= 220), 'small-screen confirmation must leave enough room to read changes');
  await page.setViewportSize({ width: 1440, height: 1000 });
  await run().evaluate(button => { button.click(); button.click(); }); await idle();
  const successfulWrites = await writes();
  assert.equal(successfulWrites.length, 4, '追加・更新・配置・一覧を順に書き込む。二重クリックで増えない');
  assert.deepEqual(successfulWrites.map(item => [item.method, item.body.revision]), [['POST', '20'], ['PUT', '21'], ['PUT', '22'], ['PUT', '23']]);
  assert.ok(successfulWrites.every(item => item.url.includes('/preview/') && item.body.app === '202'));
  assert.ok(successfulWrites[3].body.views['営業所専用']);
  const safety = await page.evaluate(async () => ({ events: window.__actual.events, backup: JSON.parse(await window.__actual.blobs[1].text()) }));
  assert.ok(safety.events.findIndex(event => event.startsWith('download:反映前バックアップ')) < safety.events.findIndex(event => event.startsWith('POST:')));
  assert.equal(safety.backup.bundle.sections.fieldSettings.properties.name.label, '取引先');

  for (const side of ['source', 'target']) {
    await reset(); await compare(); await acknowledge();
    await page.evaluate(side => { window.__actual[side + 'Revision']++; }, side);
    await run().click(); await idle();
    assert.equal((await writes()).length, 0, side + ' revision changed: no writes');
    assert.equal(await page.evaluate(() => window.__actual.blobs.length), 0, 'no misleading backup after stale comparison');
    assert.match(await page.locator('.kus-lp__status').innerText(), /変更されたため反映を中止/);
  }
  await reset(); await button('全解除').click(); await page.getByRole('checkbox', { name: 'ビュー設定', exact: true }).check(); await compare();
  assert.equal(await final().isDisabled(), true); assert.match(await page.locator('#kus-rl-stage-review').innerText(), /tag.*反映先にありません/);
  await reset('incomplete'); await compare(); assert.equal(await final().isDisabled(), true); assert.equal((await writes()).length, 0);
  await reset('wrong-identity'); await compare(); assert.match(await page.locator('.kus-lp__status').innerText(), /名前とIDを確認できません/); assert.equal((await writes()).length, 0);

  await reset('destructive'); await button('全解除').click(); await page.getByRole('checkbox', { name: 'ビュー設定', exact: true }).check();
  await page.getByRole('checkbox', { name: '反映先だけの一覧・グラフ・アクションを保持する', exact: true }).uncheck();
  await compare(); await acknowledge();
  assert.match(await page.locator('#kus-rl-stage-confirm').innerText(), /削除・置換される設定が 1 件/);
  await run().click(); await idle(); assert.deepEqual(Object.keys((await writes())[0].body.views), ['All']);

  await reset(); await page.getByRole('textbox', { name: '比較元アプリID', exact: true }).fill('202');
  await page.getByRole('combobox', { name: '反映元の取得環境' }).selectOption('preview');
  assert.equal(await button('差分を確認する').isDisabled(), true, 'same preview is not a valid route');
  await page.getByRole('combobox', { name: '反映元の取得環境' }).selectOption('production');
  assert.equal(await button('差分を確認する').isEnabled(), true, 'same app production to preview is allowed');
  console.log('PASS reflect production engine + UI: preserved settings, exact payload/revisions, backup, identity, dependencies, stale-state stop, destructive confirmation, no double/Enter writes');
};
