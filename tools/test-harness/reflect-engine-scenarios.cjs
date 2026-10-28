'use strict';
const assert = require('node:assert/strict');
const path = require('node:path');

// The production UI and engine run together. Only the kintone transport is synthetic.
module.exports = async function verifyReflectEngine({ page, esbuild, tool, out }) {
  const bundle = await esbuild.build({ absWorkingDir: tool, entryPoints: ['src/entries/reflect-lite-ui.ts'], bundle: true, write: false, format: 'iife', globalName: 'ReflectActual', platform: 'browser', target: ['chrome110'], logLevel: 'silent' });
  const button = name => page.getByRole('button', { name, exact: true });
  const tab = name => page.getByRole('tab', { name: new RegExp(name) });
  const final = () => button('最終確認に進む');
  const run = () => page.getByRole('button', { name: /^確認した .* 項目を反映先プレビューへ反映/ });
  const writes = () => page.evaluate(() => window.__actual.writes);
  const idle = () => page.waitForFunction(() => document.querySelector('#kus-reflect-lite').getAttribute('aria-busy') !== 'true');
  async function reset(mode = '') {
    await page.setContent('<!doctype html><html lang="ja"><meta charset="utf-8"><body></body></html>');
    await page.evaluate(mode => {
      const field = (code, label = code) => ({ type: 'SINGLE_LINE_TEXT', code, label, required: false });
      const view = (name, fields, index = '0') => ({ type: 'LIST', name, fields, index, filterCond: '', sort: '' });
      const row = fields => ({ type: 'ROW', fields: fields.map(code => ({ type: 'SINGLE_LINE_TEXT', code })) });
      const settings = extra => ({ titleField: { selectionMode: 'AUTO' }, enableBulkDeletion: true, enableComments: true, enableInlineRecordEditing: true, ...extra });
      const file = (fileKey, name) => ({ type: 'FILE', file: { fileKey, name, contentType: 'text/javascript', size: '20' } });
      const customize = js => ({ scope: 'ALL', desktop: { js, css: [] }, mobile: { js: [], css: [] } });
      const state = window.__actual = { mode, sourceRevision: 10, targetRevision: 20, productionRevision: mode === 'pending' ? 5 : 20, writes: [], events: [], blobs: [], files: [], uploads: [],
        bodies: { src1: 'console.log("src1")', tgt1: 'console.log("tgt1")' },
        source: { fieldSettings: { properties: { name: field('name', '顧客名'), tag: field('tag', '担当部署') } }, layoutSettings: { layout: [row(['name', 'tag'])] },
          viewSettings: { views: { All: view('All', mode === 'destructive' ? ['name'] : mode === 'ghost' ? ['name', 'ghost'] : ['name', 'tag']), ...(mode === 'added-view' ? { '新規一覧': view('新規一覧', ['name'], '2') } : {}) } },
          appSettings: settings({ name: '営業テンプレート', description: 'テンプレート用の説明', icon: { type: 'PRESET', key: 'APP99' }, theme: 'BLUE', enableThumbnails: false, enableDuplicateRecord: true, numberPrecision: { digits: '8', decimalPlaces: '2', roundingMode: 'DOWN' }, firstMonthOfFiscalYear: '4' }),
          customizeSettings: customize([file('src1', 'app.js')]) },
        target: { fieldSettings: { properties: { name: field('name', '取引先'), local: field('local', '営業所メモ') } }, layoutSettings: { layout: [row(['name', 'local'])] }, viewSettings: { views: { All: view('All', ['name']), '営業所専用': view('営業所専用', ['local'], '1') } },
          appSettings: settings({ name: '東京営業所', description: '東京の説明', icon: { type: 'PRESET', key: 'APP01' }, theme: 'WHITE', enableThumbnails: true, enableDuplicateRecord: false, numberPrecision: { digits: '16', decimalPlaces: '4', roundingMode: 'HALF_EVEN' }, firstMonthOfFiscalYear: '1' }),
          customizeSettings: customize([file('tgt1', 'old.js')]) }
      };
      // 本番（運用中）の設定。未公開の変更があるときは、プレビューにだけある一覧を持たない。
      if (mode === 'pending') state.production = { ...structuredClone(state.target), viewSettings: { views: { All: view('All', ['name']) } } };
      if (mode === 'files') {
        window.fetch = async (url, init = {}) => {
          if (init.method === 'POST') {
            const form = init.body, upload = form.get('file'), text = await upload.text(), fileKey = 'new-key-' + (state.uploads.length + 1);
            state.uploads.push({ url, token: form.get('__REQUEST_TOKEN__'), name: upload.name, text, fileKey }); state.bodies[fileKey] = text; state.events.push('UPLOAD:' + upload.name);
            return new Response(JSON.stringify({ fileKey }));
          }
          const key = new URL(url, 'https://x.example').searchParams.get('fileKey'); state.files.push(url);
          return key in state.bodies ? new Response(new Blob([state.bodies[key]], { type: 'text/javascript' })) : new Response('', { status: 404 });
        };
      }
      const endpoints = { '/app/form/fields.json': 'fieldSettings', '/app/form/layout.json': 'layoutSettings', '/app/views.json': 'viewSettings', '/app/settings.json': 'appSettings', '/app/customize.json': 'customizeSettings' };
      const api = async (url, method, body) => {
        state.events.push(method + ':' + url);
        if (url.endsWith('/app.json')) return { appId: mode === 'wrong-identity' ? '999' : body.id, name: body.id === '101' ? '営業テンプレート' : '東京営業所', code: '' };
        const key = Object.entries(endpoints).find(([endpoint]) => url.endsWith(endpoint))?.[1];
        if (!key) throw Error('Unexpected API ' + url);
        if (method === 'GET') {
          if (mode === 'incomplete' && body.app === '202' && key === 'viewSettings') throw Error('設定を取得できません');
          const preview = url.includes('/preview/');
          const data = body.app === '101' ? state.source[key] : !preview && state.production ? state.production[key] : state.target[key];
          return { ...structuredClone(data), revision: String(body.app === '101' ? state.sourceRevision : preview ? state.targetRevision : state.productionRevision) };
        }
        // 書き込みを 1 件ずつ止めて、進捗の表示を確認できるようにする。
        if (state.stepWrites) await new Promise(resolve => { state.waiting = resolve; });
        state.writes.push({ url, method, body });
        if (!url.includes('/preview/') || body.app !== '202') throw Error('Wrong write destination');
        if (body.revision !== String(state.targetRevision)) throw { code: 'GAIA_CO02', message: 'revision mismatch' };
        if (mode === 'fail-layout' && key === 'layoutSettings') throw { code: 'GAIA_IL26', message: '指定したフィールドが存在しません。' };
        // 書き込んだ内容を反映先プレビューの状態へ反映する（反映後の再取得・バックアップから戻す操作の確認用）。
        const { app: _app, revision: _revision, ...rest } = structuredClone(body);
        if (key === 'fieldSettings') { for (const [code, definition] of Object.entries(rest.properties)) state.target.fieldSettings.properties[code] = method === 'POST' ? definition : { ...state.target.fieldSettings.properties[code], ...definition }; }
        else if (key === 'layoutSettings') state.target.layoutSettings = { layout: rest.layout };
        else if (key === 'viewSettings') state.target.viewSettings = { views: rest.views };
        else if (key === 'appSettings') Object.assign(state.target.appSettings, rest);
        else if (key === 'customizeSettings') state.target.customizeSettings = rest;
        state.targetRevision++;
        return { revision: String(state.targetRevision) };
      };
      api.url = value => value;
      window.kintone = { app: { getId: () => 202 }, api, ...(mode === 'files' ? { getRequestToken: () => 'TOKEN' } : {}) };
      const create = URL.createObjectURL.bind(URL);
      URL.createObjectURL = blob => { state.blobs.push(blob); return create(blob); };
      HTMLAnchorElement.prototype.click = function () { state.events.push('download:' + this.download); };
    }, mode);
    await page.addScriptTag({ content: bundle.outputFiles[0].text });
    await page.evaluate(() => ReflectActual.mountReflectLitePanel());
    await page.getByRole('textbox', { name: '反映元アプリID', exact: true }).fill('101');
  }
  async function compare() { await button('差分を確認する').click(); await idle(); }
  async function acknowledge() {
    const writesBefore = (await writes()).length;
    await final().click(); assert.equal(await run().isDisabled(), true);
    assert.match(await page.locator('#kus-rl-stage-confirm').innerText(), /東京営業所.*202/);
    await page.getByRole('checkbox', { name: '反映内容の確認', exact: true }).check();
    const id = page.getByRole('textbox', { name: '確認用の反映先アプリID', exact: true });
    if (await id.isVisible()) {
      await id.fill('101'); assert.equal(await run().isDisabled(), true);
      await id.fill('202'); await id.press('Enter'); assert.equal((await writes()).length, writesBefore, 'IDの入力中のEnterでは書き込まない');
    }
  }

  async function assertNoLegacyTerms(where) {
    const found = await page.evaluate(() => {
      const root = document.querySelector('#kus-reflect-lite');
      const texts = [root.textContent];
      root.querySelectorAll('[aria-label],[placeholder],[title]').forEach(el => texts.push(el.getAttribute('aria-label') || '', el.getAttribute('placeholder') || '', el.getAttribute('title') || ''));
      return texts.join('\n').match(/比較[元先]/g) || [];
    });
    assert.deepEqual(found, [], `${where}に「比較元／比較先」が残っている`);
  }

  await reset();
  assert.equal(await page.getByRole('combobox', { name: '反映元の取得環境' }).inputValue(), 'production');
  // 実エンジンでも、入力中にアプリ名を確認する（本番側の app.json を問い合わせ、書き込みはしない）。
  await page.waitForFunction(() => /✓ 営業テンプレート/.test(document.querySelectorAll('.kus-rl-app-note')[0].textContent));
  assert.match(await page.locator('.kus-rl-app-note').nth(1).innerText(), /✓ 東京営業所 · 開いているアプリ/);
  assert.equal((await writes()).length, 0);
  await compare();
  assert.equal((await writes()).length, 0); assert.equal(await final().isEnabled(), true);
  assert.equal(await page.locator('.kus-rl-summary tbody tr').count(), 3, '実エンジンの差分にも要約表を出す');
  assert.deepEqual(await page.locator('.kus-rl-summary tbody tr').nth(0).locator('td').allInnerTexts(), ['フィールド設定', '差分あり', '2', '0', '1', '追加・更新（反映先だけの項目は保持）', '選択中']);
  await assertNoLegacyTerms('実エンジンの差分確認画面');
  // JSON の値は 2 スペースで整形して読みやすく示す。
  await page.locator('.kus-rl-summary tbody tr').nth(2).getByRole('button', { name: 'ビュー設定', exact: true }).click();
  await page.waitForFunction(() => document.querySelector('[data-reflect-entry="viewSettings"] details.kus-rl-changes')?.open);
  await page.locator('[data-reflect-entry="viewSettings"] .kus-rl-change[data-kind="保持"] pre').first().waitFor();
  assert.match(await page.locator('[data-reflect-entry="viewSettings"] .kus-rl-change[data-kind="保持"] pre').first().innerText(), /^\{\n  "type": "LIST",\n  "name": "営業所専用"/, '内訳のJSON値を2スペースで整形する');
  await page.locator('.kus-rl-changes summary').first().click();
  await page.getByText('取引先', { exact: true }).waitFor();
  assert.match(await page.locator('#kus-rl-stage-review').innerText(), /取引先/);
  await button('反映計画JSONを保存').click();
  const exported = await page.evaluate(async () => JSON.parse(await window.__actual.blobs[0].text()));
  assert.equal(exported.identities.target.name, '東京営業所');
  assert.equal(exported.entries.find(entry => entry.sectionKey === 'viewSettings').operations[0].body.views['営業所専用'].name, '営業所専用');
  await acknowledge();
  await assertNoLegacyTerms('実エンジンの最終確認画面');
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
    // revision はアプリ単位のため、選択した項目の内容が同じなら項目名は挙げず、アプリの設定が更新されたことだけを示す。
    const staleMessage = await page.locator('.kus-lp__status').innerText();
    assert.match(staleMessage, new RegExp((side === 'source' ? '反映元' : '反映先') + 'アプリの設定が確認後に更新されました（revision \\d+ → \\d+）'));
    assert.doesNotMatch(staleMessage, /フィールド設定|一覧|レイアウト/, '内容が同じ項目の名前を挙げない');
  }
  await reset(); await button('全解除').click(); await page.getByRole('checkbox', { name: 'ビュー設定', exact: true }).check(); await compare();
  assert.equal(await final().isDisabled(), true); assert.match(await page.locator('#kus-rl-stage-review').innerText(), /tag.*反映先にありません/);
  // 反映先に無いフィールドの参照で止まったときは、フィールド設定も含めて再取得できる（requiredFields と取得済みのフィールドコードから構造的に判定）。
  const includeFields = button('フィールド設定も反映対象に含めて再取得');
  assert.equal(await includeFields.isVisible(), true, 'フィールド設定が未選択なら再取得の操作を出す');
  // 反映元のフィールド情報：フィールド設定を選んでいなくても、反映元にあるフィールドかどうかを具体的に案内する。
  assert.match(await page.locator('.kus-rl-fix__note').innerText(), /反映元にある 1 件のフィールド（tag）を、フィールド設定の反映で追加します/, '反映元のフィールドコードを取得して案内を具体的にする');
  assert.equal(await page.evaluate(() => document.querySelector('input[aria-label="フィールド設定"]').checked), false);
  await page.screenshot({ path: path.join(out, 'review-missing-fields-desktop.png') });
  await page.setViewportSize({ width: 320, height: 900 });
  await page.screenshot({ path: path.join(out, 'review-missing-fields-320.png') });
  assert.ok(await page.locator('.kus-rl-canvas').evaluate(element => element.scrollWidth - element.clientWidth <= 1), '320pxで再取得の案内がはみ出さない');
  await page.setViewportSize({ width: 1440, height: 1000 });
  const eventsBefore = await page.evaluate(() => window.__actual.events.length);
  const busyState = await includeFields.evaluate(node => {
    node.click();
    return { busy: document.querySelector('#kus-reflect-lite').getAttribute('aria-busy'), locked: document.querySelector('input[aria-label="ビュー設定"]').disabled };
  });
  assert.deepEqual(busyState, { busy: 'true', locked: true }, '再取得中は操作を受け付けない');
  await idle();
  assert.equal(await page.evaluate(() => document.querySelector('input[aria-label="フィールド設定"]').checked), true, 'フィールド設定が反映対象に加わる');
  assert.ok(await page.evaluate(() => window.__actual.events.length) > eventsBefore, '差分を取得し直す');
  assert.equal(await includeFields.count(), 0, '解消したら再取得の操作を消す');
  assert.equal(await final().isEnabled(), true, 'フィールド設定を含めた差分で最終確認に進める');
  assert.match(await page.locator('.kus-rl-summary').innerText(), /フィールド設定[\s\S]*ビュー設定/, '要約表にフィールド設定が加わる');
  assert.equal((await writes()).length, 0, '再取得では書き込まない');
  await reset('ghost'); await button('全解除').click(); await page.getByRole('checkbox', { name: 'ビュー設定', exact: true }).check(); await compare();
  assert.equal(await final().isDisabled(), true);
  assert.match(await page.locator('#kus-rl-stage-review').innerText(), /ghost.*反映先にありません/);
  assert.equal(await button('フィールド設定も反映対象に含めて再取得').count(), 0, '反映元にも無いフィールドは、フィールド設定を含めても解消しないので案内しない');

  // ---- 一般設定（実エンジン）：名前・説明・アイコンは送らない ----
  await reset(); await button('全解除').click(); await page.getByRole('checkbox', { name: '一般設定', exact: true }).check(); await compare();
  assert.equal((await writes()).length, 0);
  assert.equal(await page.locator('.kus-rl-summary tbody tr').count(), 1);
  assert.deepEqual((await page.locator('.kus-rl-summary tbody tr').nth(0).locator('td').allInnerTexts()).slice(0, 2), ['一般設定', '差分あり']);
  const appSettingsItems = await page.locator('[data-reflect-entry="appSettings"] .kus-rl-items').innerText();
  for (const expected of ['テーマ', 'サムネイル表示', 'レコードの再利用', '数値の桁数と丸め', '年度の開始月']) assert.match(appSettingsItems, new RegExp(expected), `一般設定の変更の要約に「${expected}」を示す`);
  assert.doesNotMatch(appSettingsItems, /アプリ名|説明|アイコン|東京営業所/, '名前・説明・アイコンは変更の要約に出さない');
  assert.equal(await page.locator('#kus-rl-stage-review [data-target-pending]').getAttribute('data-target-pending'), 'clean', '本番とプレビューのrevisionが同じなら未公開の変更なしと示す');
  await acknowledge(); await run().click(); await idle();
  const settingsWrites = await writes();
  assert.equal(settingsWrites.length, 1, '一般設定は PUT 1回で反映する');
  assert.equal(settingsWrites[0].method, 'PUT'); assert.equal(settingsWrites[0].url, '/k/v1/preview/app/settings.json');
  assert.equal(settingsWrites[0].body.revision, '20', '確認したrevisionを送る');
  assert.equal(settingsWrites[0].body.theme, 'BLUE'); assert.deepEqual(settingsWrites[0].body.numberPrecision, { digits: '8', decimalPlaces: '2', roundingMode: 'DOWN' });
  for (const key of ['name', 'description', 'icon']) assert.equal(key in settingsWrites[0].body, false, `一般設定の反映で ${key} を送らない`);
  assert.equal(await page.evaluate(() => window.__actual.target.appSettings.name), '東京営業所');
  assert.match(await page.locator('#kus-rl-stage-result').innerText(), /反映前、反映先プレビューに未公開の変更はありませんでした。アプリの設定画面で『変更を中止』を押すと/);

  // ---- 反映先に以前からの未公開の変更がある（実エンジン） ----
  await reset('pending'); await compare();
  const pendingNote = page.locator('#kus-rl-stage-review [data-target-pending="pending"]');
  assert.match(await pendingNote.innerText(), /以前からの未公開の変更があります[\s\S]*ビュー設定/, '本番とプレビューのrevisionが違うときは警告する');
  await final().click();
  assert.equal(await page.getByRole('textbox', { name: '確認用の反映先アプリID', exact: true }).isVisible(), true, '最終確認で反映先IDの入力を求める');
  assert.match(await page.locator('#kus-rl-stage-confirm').innerText(), /反映先プレビューに以前からの未公開の変更があります。確認のため、反映先アプリIDを入力してください/);
  await button('差分に戻る').click(); await acknowledge(); await run().click(); await idle();
  assert.match(await page.locator('#kus-rl-stage-result .kus-rl-undo').innerText(), /反映前から未公開の変更があったため、『変更を中止』ではそれらも破棄されます。今回の反映だけを戻す場合は『バックアップから戻す』を使ってください/, '未公開の変更があったときは取り消しの案内を切り替える');
  assert.equal(await page.locator('#kus-rl-stage-result .kus-rl-undo').getAttribute('data-undo-state'), 'pending');

  // ---- 実行中の進捗と部分失敗（実エンジン） ----
  const progressStates = () => page.locator('#kus-rl-stage-result .kus-rl-progress [data-progress-section] .kus-rl-result-state').evaluateAll(nodes => nodes.map(node => node.textContent.replace(/^[^\p{L}]+/u, '')));
  const resultStates = () => page.locator('#kus-rl-stage-result .kus-rl-result-item .kus-rl-result-state').evaluateAll(nodes => nodes.map(node => node.textContent.replace(/^[^\p{L}]+/u, '')));
  await reset(); await compare(); await acknowledge();
  await page.evaluate(() => { window.__actual.stepWrites = true; });
  await run().click();
  const seen = [];
  for (;;) {
    await page.waitForFunction(() => window.__actual.waiting || document.querySelector('#kus-reflect-lite').getAttribute('aria-busy') !== 'true');
    if (!(await page.evaluate(() => !!window.__actual.waiting))) break;
    seen.push(await progressStates());
    if (seen.length === 3) await page.screenshot({ path: path.join(out, 'progress-actual-desktop.png') });
    await page.evaluate(() => { const resume = window.__actual.waiting; window.__actual.waiting = null; resume(); });
  }
  assert.deepEqual(seen, [
    ['実行中…', '待機中', '待機中'], ['実行中…', '待機中', '待機中'], ['成功', '実行中…', '待機中'], ['成功', '成功', '実行中…']
  ], '書き込みの進行に合わせて 待機中 → 実行中… → 成功 を更新する');
  assert.deepEqual(await resultStates(), ['成功', '成功', '成功'], '完了後の結果一覧と進捗が一致する');
  assert.equal(await page.locator('#kus-rl-stage-result .kus-rl-progress').isHidden(), true);
  assert.equal((await writes()).length, 4);

  await reset('fail-layout'); await compare(); await acknowledge(); await run().click(); await idle();
  assert.deepEqual(await resultStates(), ['成功', '失敗', '未実行'], '失敗と未実行を文字で示す');
  assert.match(await page.locator('#kus-rl-stage-result .kus-rl-result-item').nth(1).innerText(), /レイアウト設定[\s\S]*指定したフィールドが存在しません/);
  assert.equal((await writes()).filter(item => item.url.endsWith('/views.json')).length, 0, '失敗した項目の後は書き込まない');
  assert.equal(await button('失敗・未実行だけ選択').isVisible(), true);
  assert.equal(await button('バックアップから戻す（差分を確認）').isVisible(), true, '一部だけ反映されたときも、バックアップから戻せる');
  await page.setViewportSize({ width: 320, height: 640 });
  await page.screenshot({ path: path.join(out, 'result-partial-actual-320.png') });
  assert.ok(await page.locator('.kus-rl-canvas').evaluate(element => element.scrollWidth - element.clientWidth <= 1), '320pxの部分失敗の結果で横にはみ出す');
  await page.setViewportSize({ width: 1440, height: 1000 });

  // ---- バックアップから戻す（実エンジン）：反映で追加された一覧は削除し、書き込みは確認後だけ ----
  await reset('added-view'); await compare(); await acknowledge(); await run().click(); await idle();
  assert.equal((await writes()).length, 4);
  assert.ok((await writes())[3].body.views['新規一覧'], '反映で一覧が追加される');
  const restoreButton = button('バックアップから戻す（差分を確認）');
  await restoreButton.click(); await idle();
  assert.equal((await writes()).length, 4, 'バックアップから戻す操作では書き込まない');
  assert.equal(await tab('差分を確認').getAttribute('aria-selected'), 'true');
  const restoreSetup = await page.evaluate(() => ({
    mode: document.querySelector('select[aria-label="反映元の取得方法"]').value,
    preserve: Array.from(document.querySelectorAll('label.kus-lp__check')).find(label => /反映先だけの一覧/.test(label.textContent)).querySelector('input').checked,
    scopes: Array.from(document.querySelectorAll('label.kus-lp__chip input:checked')).map(input => input.value),
    source: document.querySelector('[aria-label="反映元アプリID"]').value, target: document.querySelector('[aria-label="反映先アプリID"]').value,
    note: Array.from(document.querySelectorAll('.kus-lp__small')).map(node => node.textContent).find(text => /設定JSONを読み込み済み/.test(text))
  }));
  assert.deepEqual({ ...restoreSetup, note: undefined }, { mode: 'json', preserve: false, scopes: ['fieldSettings', 'layoutSettings', 'viewSettings'], source: '202', target: '202', note: undefined }, '反映元を設定JSON（バックアップ）にし、保持はOFF、同じ項目で差分確認に進む');
  assert.match(restoreSetup.note, /反映前バックアップ（\d{4}\/\d{1,2}\/\d{1,2} \d{1,2}:\d{2}:\d{2}））: アプリ #202/);
  const restoreReview = await page.locator('#kus-rl-stage-review').innerText();
  assert.match(restoreReview, /バックアップから戻しています。反映で追加したフィールドは削除されません（保持として表示）/);
  // 反映前は未公開の変更が無く、その後にこの画面が書き込んだだけなので、未公開の変更は自分の反映分と判定する。
  assert.match(restoreReview, /未公開の変更はこのツールの反映分だけ/, '反映した直後の再確認では、未公開の変更を自分の反映分として示す');
  assert.doesNotMatch(restoreReview, /以前からの未公開の変更があります/);
  await page.screenshot({ path: path.join(out, 'review-restore-actual-desktop.png') });
  const viewRow = page.locator('.kus-rl-summary tbody tr', { hasText: 'ビュー設定' });
  assert.equal((await viewRow.locator('td').allInnerTexts())[3], '2', '反映で追加した一覧と、一覧の表示フィールドの削除を示す');
  await final().click();
  assert.match(await page.locator('#kus-rl-stage-confirm [data-reflect-removals]').innerText(), /ビュー設定 \/ .*新規一覧/, '最終確認で、削除される一覧を項目名で示す');
  assert.doesNotMatch(await page.locator('#kus-rl-stage-confirm [data-reflect-removals]').innerText(), /"type":"LIST"/, '削除される一覧を、設定値（JSON）ではなく項目名で示す');
  assert.equal(await page.locator('#kus-rl-stage-confirm [data-restore-notice]').count(), 1);
  assert.equal((await writes()).length, 4, '最終確認でも書き込まない');
  await button('差分に戻る').click(); await acknowledge();
  await page.screenshot({ path: path.join(out, 'confirm-restore-actual-desktop.png') });
  await run().click(); await idle();
  const restoredWrites = (await writes()).slice(4);
  assert.ok(restoredWrites.length >= 2 && restoredWrites.every(item => item.url.includes('/preview/') && item.body.app === '202'));
  assert.equal(restoredWrites[0].body.revision, '24', '反映後のrevisionから続けて書き込む');
  const restoredViews = restoredWrites.find(item => item.url.endsWith('/views.json')).body.views;
  assert.deepEqual(Object.keys(restoredViews).sort(), ['All', '営業所専用'], '反映で追加した一覧を取り除く');
  assert.deepEqual(restoredViews.All.fields, ['name'], '反映前の一覧の内容へ戻す');
  const restoredState = await page.evaluate(() => ({ label: window.__actual.target.fieldSettings.properties.name.label, tag: !!window.__actual.target.fieldSettings.properties.tag, views: Object.keys(window.__actual.target.viewSettings.views).sort() }));
  assert.deepEqual(restoredState, { label: '取引先', tag: true, views: ['All', '営業所専用'] }, '反映前の値へ戻り、追加したフィールドは削除されない');
  assert.match(await page.locator('#kus-rl-stage-result').innerText(), /項目を反映しました/);

  // ---- JS/CSS：別アプリのファイルを反映先へアップロードする（実エンジン） ----
  await reset('files'); await button('全解除').click(); await page.getByRole('checkbox', { name: 'JS/CSS設定', exact: true }).check(); await compare();
  assert.deepEqual(await page.locator('[data-reflect-entry="customizeSettings"] [data-reflect-uploads] li').allInnerTexts(), ['PC JS / app.js（1 KB）'], '差分確認にアップロード予定を示す');
  assert.match(await page.locator('[data-reflect-entry="customizeSettings"] .kus-rl-items').innerText(), /app\.js/, '変更の要約にファイル名を示す');
  assert.equal(await page.evaluate(() => window.__actual.uploads.length), 0, '差分確認ではアップロードしない');
  assert.ok(await page.evaluate(() => window.__actual.files.some(url => url.startsWith('/k/v1/file.json?fileKey=src1'))), '反映元のファイル本体を取得して内容を確認する');
  assert.equal((await writes()).length, 0);
  await acknowledge();
  assert.deepEqual(await page.locator('#kus-rl-stage-confirm [data-reflect-uploads] li').allInnerTexts(), ['PC JS / app.js（1 KB）'], '最終確認にもアップロード予定を示す');
  await page.screenshot({ path: path.join(out, 'confirm-uploads-actual-desktop.png') });
  await run().click(); await idle();
  const fileState = await page.evaluate(() => ({ events: window.__actual.events, uploads: window.__actual.uploads, writes: window.__actual.writes }));
  const at = prefix => fileState.events.findIndex(event => event.startsWith(prefix));
  assert.ok(at('download:反映前バックアップ') >= 0 && at('download:反映前バックアップ') < at('UPLOAD:app.js') && at('UPLOAD:app.js') < at('PUT:/k/v1/preview/app/customize.json'), 'バックアップ → アップロード → 設定の順に実行する');
  assert.deepEqual(fileState.uploads.map(upload => [upload.url, upload.token, upload.name, upload.text]), [['/k/v1/file.json', 'TOKEN', 'app.js', 'console.log("src1")']], '反映元のファイルを反映先へアップロードする');
  assert.equal(fileState.writes.length, 1);
  assert.equal(fileState.writes[0].body.desktop.js[0].file.fileKey, 'new-key-1', 'アップロードで得た新しいキーで設定する');
  assert.doesNotMatch(JSON.stringify(fileState.writes[0].body), /src1|_content/);
  const fileBackup = await page.evaluate(async () => JSON.parse(await window.__actual.blobs.at(-1).text()));
  const embedded = fileBackup.bundle.sections.customizeSettings.desktop.js[0].file;
  assert.equal(embedded.fileKey, 'tgt1');
  assert.equal(Buffer.from(embedded._content.base64, 'base64').toString('utf8'), 'console.log("tgt1")', 'バックアップに反映先のファイル本体を埋め込む');
  // バックアップから戻すと、埋め込んだ本体を再アップロードして JS/CSS も元に戻る。
  await restoreButton.click(); await idle();
  assert.deepEqual(await page.locator('#kus-rl-stage-review [data-reflect-uploads] li').allInnerTexts(), ['PC JS / old.js（1 KB）'], '戻す内容のアップロード予定を示す');
  assert.equal((await writes()).length, 1, '戻す内容の確認では書き込まない');
  await final().click(); await button('差分に戻る').click(); await acknowledge(); await run().click(); await idle();
  const fileUploads = await page.evaluate(() => window.__actual.uploads.map(upload => [upload.name, upload.text, upload.fileKey]));
  assert.deepEqual(fileUploads, [['app.js', 'console.log("src1")', 'new-key-1'], ['old.js', 'console.log("tgt1")', 'new-key-2']], 'バックアップに埋め込んだ本体をアップロードして戻す');
  assert.equal(await page.evaluate(() => window.__actual.target.customizeSettings.desktop.js[0].file.fileKey), 'new-key-2');
  assert.equal((await writes()).at(-1).body.revision, '21');
  await reset('incomplete'); await compare(); assert.equal(await final().isDisabled(), true); assert.equal((await writes()).length, 0);
  await reset('wrong-identity'); await compare(); assert.match(await page.locator('.kus-lp__status').innerText(), /名前とIDを確認できません/); assert.equal((await writes()).length, 0);

  await reset('destructive'); await button('全解除').click(); await page.getByRole('checkbox', { name: 'ビュー設定', exact: true }).check();
  // 保持の設定は「詳細設定…」のポップアップの中にある。開いて切り替え、閉じてから差分を取得する。
  await page.getByRole('button', { name: '詳細設定…', exact: true }).click();
  await page.getByRole('checkbox', { name: '反映先だけの一覧・グラフ・アクションを保持する', exact: true }).uncheck();
  await page.getByRole('button', { name: '詳細設定を閉じる', exact: true }).click();
  await compare(); await acknowledge();
  assert.match(await page.locator('#kus-rl-stage-confirm').innerText(), /削除・置換される設定が 1 件/);
  await run().click(); await idle(); assert.deepEqual(Object.keys((await writes())[0].body.views), ['All']);

  await reset(); await page.getByRole('textbox', { name: '反映元アプリID', exact: true }).fill('202');
  await page.getByRole('combobox', { name: '反映元の取得環境' }).selectOption('preview');
  assert.equal(await button('差分を確認する').isDisabled(), true, 'same preview is not a valid route');
  await page.getByRole('combobox', { name: '反映元の取得環境' }).selectOption('production');
  assert.equal(await button('差分を確認する').isEnabled(), true, 'same app production to preview is allowed');
  console.log('PASS reflect production engine + UI: app names, summary table, pretty JSON, field-settings refetch, preserved settings, exact payload/revisions, backup, identity, dependencies, stale-state stop, destructive confirmation, no double/Enter writes');
};
