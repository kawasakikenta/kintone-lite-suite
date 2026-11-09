'use strict';
const assert = require('node:assert/strict');
const path = require('node:path');

// 本番反映の画面（deploy-lite-ui.ts）と実エンジン（tabs/deploy-standalone.ts・deploy/*.ts・api.ts）を束ね、
// kintone の通信だけを合成する。画面の表示と、合成 kintone が受け取った送信内容の両方を確かめる。
// 書き込みは「プレビューの deploy.json への POST」だけを受け付け、それ以外（本番・プレビューへの PUT/POST、想定外の URL）は
// 例外にして violations に残す。各シナリオの最後に violations が空で、POST 以外の書き込みが無いことを確認する。
//
// script は run-deploy-lite-dom.cjs の bundle('real')（実エンジンを束ねた画面）。
// 内部の待ち時間は、画面がエンジンへ渡す poll の既定（初回 1 秒、以後 1.5 倍）のまま、合成 API が 1〜2 回目の状態確認で完了を返す。
module.exports = async function verifyDeployEngine({ page, script, out }) {
  const checks = [];
  const ok = name => { checks.push(name); };
  const ROOT_SEL = '#kus-deploy-lite';
  const button = name => page.getByRole('button', { name, exact: true });
  const tab = name => page.getByRole('tab', { name: new RegExp(name) });
  const idle = () => page.waitForFunction(() => document.querySelector('#kus-deploy-lite').getAttribute('aria-busy') !== 'true');
  const statusText = () => page.locator('.kus-lp__status-text').innerText();
  const dockText = () => page.locator('.kus-dp-dock-copy').innerText();
  const runButton = () => page.getByRole('button', { name: /^確認した .* アプリ(を本番へ反映|の変更を中止)$/ });
  const ackBox = () => page.getByRole('checkbox', { name: '上記の内容を確認しました', exact: true });
  const confirmBox = () => page.locator('input[aria-label^="確認用の対象アプリ"]');
  const rowsOf = () => page.locator('.kus-lp__apptable tbody tr');
  const appInput = i => rowsOf().nth(i).locator('input[aria-label="アプリID"]');
  const guestInput = i => rowsOf().nth(i).locator('input[aria-label="ゲストID"]');
  const reviewRow = id => page.locator(`tr.kus-dp-row[data-deploy-app="${id}"]`);
  const resultItem = id => page.locator(`.kus-dp-result-item[data-deploy-app="${id}"]`);
  const facts = key => page.locator(`[data-confirm="${key}"]`);
  const engine = fn => page.evaluate(fn);
  const shot = name => page.screenshot({ path: path.join(out, `engine-${name}.png`) });

  // -------------------------------------------------------------------------
  // 合成 kintone（ページ内で動く）。page.evaluate に関数として渡すため、外側の変数は参照しない。
  // -------------------------------------------------------------------------
  function installSyntheticKintone(config) {
    const clone = value => JSON.parse(JSON.stringify(value));
    // DEPLOY_COMPARE_SECTION_KEYS の全項目の GET 先
    const ENDPOINTS = {
      '/app/settings.json': 'appSettings', '/app/form/fields.json': 'fieldSettings', '/app/form/layout.json': 'layoutSettings',
      '/app/views.json': 'viewSettings', '/app/reports.json': 'reportSettings', '/app/status.json': 'processSettings',
      '/app/plugins.json': 'pluginSettings', '/app/customize.json': 'customizeSettings', '/app/actions.json': 'actionSettings',
      '/app/acl.json': 'appAcl', '/field/acl.json': 'fieldAcl', '/record/acl.json': 'recordPermissions',
      '/app/notifications/general.json': 'notifications', '/app/notifications/perRecord.json': 'perRecordNotifications',
      '/app/notifications/reminder.json': 'reminderNotifications', '/app/categories.json': 'categories'
    };
    const defaults = name => ({
      appSettings: { name, description: '', icon: { type: 'PRESET', key: 'APP01' }, theme: 'WHITE', titleField: { selectionMode: 'AUTO' }, enableThumbnails: true, enableBulkDeletion: true, enableComments: true, enableDuplicateRecord: true, enableInlineRecordEditing: true, numberPrecision: { digits: '16', decimalPlaces: '4', roundingMode: 'HALF_EVEN' }, firstMonthOfFiscalYear: '1' },
      fieldSettings: { properties: {} }, layoutSettings: { layout: [] }, viewSettings: { views: {} }, reportSettings: { reports: {} },
      processSettings: { enable: false, states: {}, actions: [] }, pluginSettings: { plugins: [] },
      customizeSettings: { scope: 'ALL', desktop: { js: [], css: [] }, mobile: { js: [], css: [] } },
      actionSettings: { actions: {} }, appAcl: { rights: [] }, fieldAcl: { rights: [] }, recordPermissions: { rights: [] },
      notifications: { notifications: [], notifyToCommenter: false }, perRecordNotifications: { notifications: [] },
      reminderNotifications: { notifications: [], timezone: 'Asia/Tokyo' }, categories: { enabled: false, categories: {} }
    });
    const state = window.__engine = {
      seq: 0, calls: [], posts: [], violations: [], downloads: [], fetches: [], statusGets: 0,
      files: clone(config.files || {}), failApps: config.failApps || [], neverFinish: !!config.neverFinish,
      bumpOnPost: config.bumpOnPost || {}, rejectPost: config.rejectPost || {},
      pollsToFinish: config.pollsToFinish || 1, holdSettings: false, held: 0, heldResolvers: [], apps: {}
    };
    for (const def of config.apps) {
      state.apps[def.id] = {
        id: def.id, guest: def.guest || '', name: def.name, status: null, group: null,
        prodRevision: String(def.prodRevision), previewRevision: String(def.previewRevision),
        production: { ...defaults(def.name), ...clone(def.shared || {}), ...clone(def.production || {}) },
        preview: { ...defaults(def.name), ...clone(def.shared || {}), ...clone(def.preview || {}) }
      };
    }
    const violation = message => { state.violations.push(message); return new Error(message); };
    const finalize = group => {
      group.done = true;
      const failed = group.ids.filter(id => state.failApps.includes(id));
      for (const id of group.ids) {
        const app = state.apps[id];
        if (failed.length) { app.status = failed.includes(id) ? 'FAIL' : 'CANCEL'; continue; }
        app.status = 'SUCCESS';
        if (group.revert) { app.preview = clone(app.production); app.previewRevision = app.prodRevision; }
        else { app.production = clone(app.preview); app.prodRevision = app.previewRevision; }
      }
    };
    state.bumpPreview = id => {
      const app = state.apps[id];
      app.previewRevision = String(Number(app.previewRevision) + 1);
      app.preview.fieldSettings = { properties: { ...app.preview.fieldSettings.properties, late_added: { type: 'SINGLE_LINE_TEXT', code: 'late_added', label: '後から追加', required: false } } };
    };
    state.release = () => { state.holdSettings = false; state.heldResolvers.splice(0).forEach(resolve => resolve()); };
    const api = async (url, method, params) => {
      const call = { seq: ++state.seq, url, method, params: clone(params ?? {}) };
      state.calls.push(call);
      const match = /^\/k(?:\/guest\/(\d+))?\/v1(\/preview)?(\/.*)$/.exec(url);
      if (!match) throw violation(`想定外の URL: ${method} ${url}`);
      const guest = match[1] || '', preview = !!match[2], path = match[3];
      const appOf = id => {
        const app = state.apps[String(id)];
        if (!app) throw violation(`未登録のアプリ: ${id} (${method} ${url})`);
        if (app.guest !== guest) throw violation(`URL のゲストスペースがアプリと合いません: App ${id} は guest='${app.guest}'、URL は ${url}`);
        return app;
      };
      if (method === 'GET') {
        if (path === '/app/deploy.json') {
          if (!preview) throw violation(`deploy.json の GET は preview prefix のみ: ${url}`);
          state.statusGets += 1;
          const ids = params.apps.map(String);
          const groups = new Set(ids.map(id => appOf(id).group).filter(group => group && !group.done));
          for (const group of groups) {
            if (state.neverFinish) continue;
            group.polls -= 1;
            if (group.polls <= 0) finalize(group);
          }
          // 依頼していないアプリは完了済み（kintone は未反映のアプリにも SUCCESS を返す）。
          return { apps: ids.map(id => ({ app: id, status: appOf(id).status || 'SUCCESS' })) };
        }
        const key = ENDPOINTS[path];
        if (!key) throw violation(`想定外の GET: ${url}`);
        const app = appOf(params.app);
        if (state.holdSettings && path === '/app/settings.json') {
          state.held += 1;
          await new Promise(resolve => state.heldResolvers.push(resolve));
        }
        const side = preview ? app.preview : app.production;
        return { ...clone(side[key]), revision: preview ? app.previewRevision : app.prodRevision };
      }
      if (method === 'POST' && preview && path === '/app/deploy.json') {
        const body = clone(params);
        const record = { seq: call.seq, url, body, rejected: false };
        state.posts.push(record);
        for (const row of body.apps) {
          const app = appOf(row.app);
          if (row.revision !== undefined && row.revision !== app.previewRevision) {
            record.rejected = true;
            throw Object.assign(new Error('リビジョンが最新ではありません。'), { code: 'GAIA_CO02' });
          }
        }
        for (const row of body.apps) {
          const rejection = state.rejectPost[row.app];
          if (rejection) { record.rejected = true; throw Object.assign(new Error(rejection.message), { code: rejection.code, status: rejection.status }); }
        }
        // 別の利用者の更新を再現する（この依頼を受け付けた直後に、別のアプリのプレビューが更新される）。
        for (const row of body.apps) if (state.bumpOnPost[row.app]) state.bumpPreview(state.bumpOnPost[row.app]);
        const group = { ids: body.apps.map(row => String(row.app)), revert: body.revert === true, polls: state.pollsToFinish, done: false };
        for (const id of group.ids) { const app = state.apps[id]; app.status = 'PROCESSING'; app.group = group; }
        return {};
      }
      throw violation(`想定外の書き込み: ${method} ${url}`);
    };
    api.url = value => value;
    window.kintone = { app: { getId: () => 202 }, api };
    // ファイル本体の取得（GET /k/v1/file.json?fileKey=）。ほかの fetch は想定外。
    window.fetch = async (url, init = {}) => {
      state.fetches.push({ seq: ++state.seq, url: String(url), method: init.method || 'GET' });
      const match = /^\/k(?:\/guest\/(\d+))?\/v1\/file\.json\?fileKey=([^&]+)$/.exec(String(url));
      if (!match || (init.method && init.method !== 'GET')) throw violation(`想定外の fetch: ${init.method || 'GET'} ${url}`);
      const key = decodeURIComponent(match[2]);
      if (state.files[key] === undefined) return new Response('', { status: 404 });
      return new Response(new Blob([state.files[key]], { type: 'text/javascript' }));
    };
    // バックアップのダウンロードは実ファイルにせず、名前と中身を記録する。
    if (!window.__anchorPatched) {
      window.__anchorPatched = true;
      const create = URL.createObjectURL.bind(URL), blobs = new Map();
      URL.createObjectURL = blob => { const url = create(blob); blobs.set(url, blob); return url; };
      HTMLAnchorElement.prototype.click = function () {
        const current = window.__engine;
        if (current) current.downloads.push({ seq: ++current.seq, name: this.download, blob: blobs.get(this.href) });
      };
    }
  }

  async function reset(config) {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.setContent('<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><body style="background:#e8edf3"></body></html>');
    await page.evaluate(installSyntheticKintone, config);
    await page.addScriptTag({ content: script });
    await page.evaluate(() => DeployHarness.mountDeployLitePanel());
  }

  // -------------------------------------------------------------------------
  // 設定の組み立て（Node 側）
  // -------------------------------------------------------------------------
  const field = (code, label = code, extra = {}) => ({ type: 'SINGLE_LINE_TEXT', code, label, required: false, ...extra });
  const props = (...fields) => ({ properties: Object.fromEntries(fields.map(item => [item.code, item])) });
  const jsFile = (fileKey, name) => ({ type: 'FILE', file: { fileKey, name, contentType: 'text/javascript', size: '20' } });
  const customize = js => ({ scope: 'ALL', desktop: { js, css: [] }, mobile: { js: [], css: [] } });
  /** 本番とプレビューでフィールドが 1 つ異なるだけのアプリ（追加）。 */
  const addedApp = (id, name, extra = {}) => ({
    id, name, prodRevision: '10', previewRevision: '12',
    production: { fieldSettings: props(field('name', '名前')) },
    preview: { fieldSettings: props(field('name', '名前'), field(`added_${id}`, '追加項目')) },
    ...extra
  });
  const encode = text => Buffer.from(text, 'utf8').toString('base64');

  // -------------------------------------------------------------------------
  // 操作
  // -------------------------------------------------------------------------
  async function setTargets(ids, guests = {}) {
    await page.evaluate(() => { document.querySelectorAll('.kus-lp__apptable tbody tr button').forEach(b => { if (b.textContent === '×') b.click(); }); });
    await appInput(0).fill(ids.join(','));
    await appInput(0).press('Tab');
    assert.equal(await rowsOf().count(), ids.length);
    for (const [index, id] of ids.entries()) {
      if (guests[id]) await guestInput(index).fill(guests[id]);
    }
  }
  async function chooseDetail(...labels) {
    await button('詳細設定…').click();
    for (const label of labels) await page.getByRole('radio', { name: label, exact: true }).check();
    await page.getByRole('button', { name: '詳細設定を閉じる', exact: true }).click();
  }
  async function inspect() { await button('未公開の変更を確認する').click(); await idle(); }
  async function toConfirm() {
    await button('最終確認に進む').click();
    assert.equal(await tab('最終確認').getAttribute('aria-selected'), 'true');
  }
  async function arm(value) {
    await ackBox().check();
    await confirmBox().fill(String(value));
    assert.equal(await runButton().isEnabled(), true, '確認後は実行できる');
  }
  async function confirmAndRun(value) { await arm(value); await runButton().click(); await idle(); }
  const state = () => page.evaluate(() => {
    const s = window.__engine;
    return {
      calls: s.calls.map(({ seq, url, method, params }) => ({ seq, url, method, params })),
      posts: s.posts, violations: s.violations, downloads: s.downloads.map(({ seq, name }) => ({ seq, name })),
      fetches: s.fetches, statusGets: s.statusGets,
      apps: Object.fromEntries(Object.values(s.apps).map(app => [app.id, { prodRevision: app.prodRevision, previewRevision: app.previewRevision, status: app.status, production: app.production, preview: app.preview }]))
    };
  });
  const backupJson = index => page.evaluate(async i => JSON.parse(await window.__engine.downloads[i].blob.text()), index);
  /** 書き込みは deploy.json の POST だけ（レコード・本番・プレビューの設定、ファイルのアップロードは一切無い）。 */
  async function assertOnlyDeployWrites(where) {
    const snapshot = await state();
    assert.deepEqual(snapshot.violations, [], `${where}: 合成 kintone が想定外の通信を受けた`);
    const writes = snapshot.calls.filter(call => call.method !== 'GET');
    for (const write of writes) {
      assert.equal(write.method, 'POST', `${where}: POST 以外の書き込み ${write.method} ${write.url}`);
      assert.match(write.url, /^\/k(\/guest\/\d+)?\/v1\/preview\/app\/deploy\.json$/, `${where}: deploy.json 以外への書き込み ${write.url}`);
    }
    assert.equal(writes.length, snapshot.posts.length, `${where}: 書き込みの数と記録した POST の数が一致する`);
    assert.ok(snapshot.fetches.every(item => item.method === 'GET'), `${where}: fetch は読み取りだけ`);
    return snapshot;
  }
  const SECTION_PATHS = ['/app/settings.json', '/app/form/fields.json', '/app/form/layout.json', '/app/views.json', '/app/reports.json', '/app/status.json', '/app/plugins.json', '/app/customize.json', '/app/actions.json', '/app/acl.json', '/field/acl.json', '/record/acl.json', '/app/notifications/general.json', '/app/notifications/perRecord.json', '/app/notifications/reminder.json', '/app/categories.json'];
  const getsOf = (snapshot, filter) => snapshot.calls.filter(call => call.method === 'GET' && filter(call));

  // =========================================================================
  // 1. 1 アプリの本番反映（削除フィールドを含む差分 → 最終確認 → 実行）
  // =========================================================================
  await reset({
    pollsToFinish: 2,
    apps: [{
      id: '101', name: '営業管理', prodRevision: '12', previewRevision: '15',
      production: {
        fieldSettings: props(field('name', '顧客名'), field('old_code', '旧項目'), field('obsolete', '廃止項目'), field('tag', '担当部署')),
        layoutSettings: { layout: [{ type: 'ROW', fields: [{ type: 'SINGLE_LINE_TEXT', code: 'name' }, { type: 'SINGLE_LINE_TEXT', code: 'old_code' }] }] }
      },
      preview: {
        fieldSettings: props(field('name', '顧客名', { required: true }), field('new_code', '旧項目'), field('tag', '担当部署'), field('memo', '備考')),
        layoutSettings: { layout: [{ type: 'ROW', fields: [{ type: 'SINGLE_LINE_TEXT', code: 'name' }, { type: 'SINGLE_LINE_TEXT', code: 'new_code' }] }] }
      }
    }]
  });
  await setTargets(['101']);
  await inspect();
  {
    const afterInspect = await assertOnlyDeployWrites('1 差分確認');
    assert.equal(afterInspect.posts.length, 0, '差分確認では何も依頼しない');
    for (const side of ['/k/v1', '/k/v1/preview']) {
      const urls = getsOf(afterInspect, call => call.params.app === '101').map(call => call.url);
      for (const sectionPath of SECTION_PATHS) assert.ok(urls.includes(`${side}${sectionPath}`), `差分確認で ${side}${sectionPath} を取得する`);
    }
    assert.ok(getsOf(afterInspect, call => call.url === '/k/v1/preview/app/deploy.json').length >= 1, '差分確認で処理中でないかを確かめる');
  }
  assert.equal(await tab('変更を確認').getAttribute('aria-selected'), 'true');
  assert.match(await reviewRow('101').innerText(), /変更あり[\s\S]*フィールド設定[\s\S]*本番 12 → プレビュー 15/);
  assert.match(await reviewRow('101').innerText(), /3 件 \/ フィールド 2 件（値も削除）/, '削除の件数（フィールドは別に示す）');
  await reviewRow('101').getByRole('button', { name: '詳細を表示' }).click();
  {
    const detail = await page.locator('tr.kus-dp-detail-tr').filter({ has: page.locator('[data-deploy-section]') }).first().innerText();
    assert.match(detail, /削除されるフィールド（2 件）/);
    assert.match(detail, /本番へ反映すると、このフィールドのレコードの値も削除され、元に戻せません。/, '削除フィールドの警告');
    assert.match(detail, /旧項目（old_code）[\s\S]*フィールドコードを変えただけなら値は残る可能性があります（プレビューの『new_code』）/);
    assert.match(detail, /廃止項目（obsolete）/);
  }
  await shot('review-1app');
  await toConfirm();
  assert.match(await facts('removed-fields').innerText(), /削除されるフィールド（2 件）[\s\S]*レコードの値も削除され、元に戻せません[\s\S]*営業管理（#101）: 旧項目（old_code）[\s\S]*廃止項目（obsolete）/);
  assert.match(await facts('backup').innerText(), /反映前の本番設定（1 アプリ分/);
  assert.equal(await confirmBox().getAttribute('aria-label'), '確認用の対象アプリID');
  await ackBox().check();
  await confirmBox().fill('102');
  assert.equal(await runButton().isDisabled(), true, 'IDが違うと実行できない');
  await confirmBox().fill('101');
  await confirmBox().press('Enter');
  assert.equal((await state()).posts.length, 0, '確認入力の Enter では依頼しない');
  await shot('confirm-1app');
  await runButton().click();
  await idle();
  {
    const run = await assertOnlyDeployWrites('1 本番反映');
    assert.equal(run.posts.length, 1, 'deploy.json への依頼は 1 回');
    assert.equal(run.posts[0].url, '/k/v1/preview/app/deploy.json');
    assert.deepEqual(run.posts[0].body, { apps: [{ app: '101', revision: '15' }] }, '確認時のプレビュー revision を添え、revert は付けない');
    assert.equal(run.downloads.length, 1, 'バックアップは 1 回だけ保存する');
    assert.match(run.downloads[0].name, /^本番反映前バックアップ_営業管理\(app101\)_\d{8}_\d{6}\.json$/);
    assert.ok(run.downloads[0].seq < run.posts[0].seq, 'バックアップの保存が反映の依頼より前');
    const backup = await backupJson(0);
    assert.equal(backup.kind, 'kintone-deploy-backup');
    assert.equal(backup.version, 1);
    assert.equal(backup.mode, 'deploy');
    assert.equal(backup.environment, 'production');
    assert.equal(backup.bundles.length, 1);
    assert.equal(backup.bundles[0].appId, '101');
    assert.equal(backup.bundles[0].preview, false, 'バックアップは反映前の本番');
    assert.deepEqual(Object.keys(backup.bundles[0].sections.fieldSettings.properties), ['name', 'old_code', 'obsolete', 'tag'], '本番の設定（削除されるフィールドを含む）');
    assert.equal(backup.bundles[0].sections.fieldSettings.properties.name.required, false);
    assert.equal(backup.bundles[0].sections.appSettings.name, '営業管理');
    assert.ok(backup.scopes.includes('fieldSettings') && backup.scopes.includes('customizeSettings'));
    // 反映後: 本番がプレビューと同じになり、revision も一致する
    const app = run.apps['101'];
    assert.equal(app.prodRevision, '15');
    assert.equal(app.previewRevision, '15');
    assert.deepEqual(Object.keys(app.production.fieldSettings.properties), ['name', 'new_code', 'tag', 'memo']);
    assert.ok(run.statusGets >= 3, '完了まで状態を確認する（検査 1 回 + 反映 2 回）');
  }
  assert.equal(await tab('結果').getAttribute('aria-selected'), 'true');
  assert.match(await statusText(), /^1 アプリを本番へ反映しました。$/);
  assert.equal(await page.locator('.kus-lp__status').getAttribute('data-tone'), 'ok');
  assert.match(await resultItem('101').innerText(), /成功/);
  assert.match(await resultItem('101').innerText(), /本番のrevision: 12 → 15（プレビュー 15）[\s\S]*反映後の確認: 本番とプレビューが一致/, '本番とプレビューの revision が一致した旨');
  assert.match(await page.locator('[data-deploy-backup="saved"]').innerText(), /バックアップ: 本番反映前バックアップ_営業管理\(app101\)_\d{8}_\d{6}\.json（1 アプリ分・反映前の本番設定）/);
  assert.equal(await page.locator('[data-deploy-unverified]').count(), 0);
  await shot('result-1app');
  ok('engine: single app deploy');

  // =========================================================================
  // 2. 未公開の変更なし（revision 一致）は選べず、設定本体を取得しない
  // =========================================================================
  await reset({ apps: [addedApp('201', '変更あり'), { id: '202', name: '変更なし', prodRevision: '8', previewRevision: '8', shared: { fieldSettings: props(field('name', '名前')) } }] });
  await setTargets(['201', '202']);
  await inspect();
  {
    const snapshot = await assertOnlyDeployWrites('2 未公開の変更なし');
    assert.deepEqual(await page.locator('.kus-dp-pills .kus-dp-pill').allInnerTexts(), ['変更あり 1', '未公開の変更なし 1', '取得失敗 0', '反映処理中 0']);
    assert.equal(await reviewRow('202').locator('input[type="checkbox"]').isDisabled(), true, '未公開の変更なしは選べない');
    assert.equal(await reviewRow('202').locator('input[type="checkbox"]').isChecked(), false);
    assert.equal(await reviewRow('201').locator('input[type="checkbox"]').isChecked(), true);
    const of202 = getsOf(snapshot, call => call.params.app === '202').map(call => call.url);
    assert.deepEqual(of202.sort(), ['/k/v1/app/settings.json', '/k/v1/preview/app/settings.json'], '一致したアプリは revision の取得（一般設定）だけで、設定本体を取得しない');
    const of201 = getsOf(snapshot, call => call.params.app === '201').map(call => call.url);
    for (const side of ['/k/v1', '/k/v1/preview']) assert.ok(of201.includes(`${side}/app/form/fields.json`), '変更ありのアプリは設定本体を本番とプレビューで取得する');
    assert.equal(snapshot.posts.length, 0);
  }
  assert.match(await reviewRow('202').innerText(), /未公開の変更なし/);
  await toConfirm();
  assert.match(await facts('targets').innerText(), /対象アプリ（1 アプリ）[\s\S]*変更あり（#201）/);
  assert.doesNotMatch(await facts('targets').innerText(), /#202/, '未公開の変更なしのアプリは対象に入らない');
  await arm(201);
  await runButton().click();
  await idle();
  {
    const run = await assertOnlyDeployWrites('2 実行');
    assert.deepEqual(run.posts.map(post => post.body.apps.map(row => row.app)), [['201']], '一致したアプリへは依頼しない');
  }
  ok('engine: clean app is not selectable');

  // =========================================================================
  // 3. 確認後にプレビューが更新された → 何も依頼せず、バックアップも保存しない
  // =========================================================================
  await reset({ apps: [addedApp('301', '更新される'), addedApp('302', '更新されない')] });
  await setTargets(['301', '302']);
  await inspect();
  await toConfirm();
  await arm(2);
  await page.evaluate(() => window.__engine.bumpPreview('301'));
  await runButton().click();
  await idle();
  {
    const snapshot = await assertOnlyDeployWrites('3 確認後に更新');
    assert.equal(snapshot.posts.length, 0, '何も依頼しない');
    assert.equal(snapshot.downloads.length, 0, 'バックアップも保存しない');
    assert.equal(snapshot.apps['301'].prodRevision, '10', '本番は変わらない');
  }
  assert.match(await statusText(), /^反映前の確認で止めました。まだ本番へは反映していません。確認した後に設定が更新されたアプリがあります（App 301（更新される））。何も反映していません。差分を確認し直してください。$/);
  assert.equal(await page.locator('.kus-lp__status').getAttribute('data-tone'), 'warn');
  assert.match(await resultItem('301').innerText(), /確認後に更新[\s\S]*プレビュー（revision 12 → 13）の設定が更新されました/);
  assert.match(await resultItem('302').innerText(), /未実行[\s\S]*まだ何も反映していません/);
  assert.match(await page.locator('[data-deploy-backup="none"]').innerText(), /バックアップは保存していません。/);
  await shot('result-updated-after-review');
  ok('engine: preview updated after review');

  // 3b. 実行の途中（1 件目の完了待ちの間）に 2 件目のプレビューが更新された → 2 件目は依頼せず「確認後に更新」、3 件目は未実行
  await reset({ bumpOnPost: { '321': '322' }, apps: [addedApp('321', 'A'), addedApp('322', 'B'), addedApp('323', 'C')] });
  await setTargets(['321', '322', '323']);
  await inspect(); await toConfirm(); await confirmAndRun(3);
  {
    const run = await assertOnlyDeployWrites('3b 実行の途中で更新');
    assert.deepEqual(run.posts.map(post => post.body), [{ apps: [{ app: '321', revision: '12' }] }], '1 件目だけ依頼する');
    assert.equal(run.apps['321'].prodRevision, '12');
    assert.equal(run.apps['322'].prodRevision, '10');
  }
  assert.match(await resultItem('321').innerText(), /成功/);
  assert.match(await resultItem('322').innerText(), /確認後に更新[\s\S]*プレビュー（revision 12 → 13）の設定が更新されました/);
  assert.match(await resultItem('323').innerText(), /未実行/);
  assert.match(await statusText(), /^3 アプリ中 1 アプリを反映しました。確認後に更新 1 アプリ、未実行 1 アプリ（App 322: 確認した後にプレビュー（revision 12 → 13）の設定が更新されました。差分を確認し直してください。）。/);
  ok('engine: preview updated during the run');

  // =========================================================================
  // 4. 1 アプリずつ: 2 件目が FAIL → 1 件目成功・2 件目失敗・3 件目未実行
  // =========================================================================
  await reset({ failApps: ['402'], apps: [addedApp('401', 'A'), addedApp('402', 'B'), addedApp('403', 'C')] });
  await setTargets(['401', '402', '403']);
  await inspect();
  await toConfirm();
  assert.match(await facts('method').innerText(), /1アプリずつ反映（失敗したら残りを実行しない）/);
  await confirmAndRun(3);
  {
    const run = await assertOnlyDeployWrites('4 2 件目が失敗');
    assert.deepEqual(run.posts.map(post => post.body), [{ apps: [{ app: '401', revision: '12' }] }, { apps: [{ app: '402', revision: '12' }] }], '1 件ずつ依頼し、3 件目は依頼しない');
    assert.equal(run.downloads.length, 1);
    assert.equal((await backupJson(0)).bundles.length, 3, 'バックアップは対象 3 アプリ分');
    assert.ok(run.downloads[0].seq < run.posts[0].seq);
    assert.equal(run.apps['401'].prodRevision, '12');
    assert.equal(run.apps['402'].prodRevision, '10', '失敗したアプリの本番は変わらない');
    assert.equal(run.apps['403'].prodRevision, '10');
  }
  assert.match(await resultItem('401').innerText(), /成功/);
  assert.match(await resultItem('402').innerText(), /失敗[\s\S]*kintone が反映に失敗しました/);
  assert.match(await resultItem('403').innerText(), /未実行[\s\S]*前のアプリで問題があったため未実行/);
  assert.deepEqual(await page.locator('.kus-dp-pills .kus-dp-pill').allInnerTexts(), ['成功 1', '失敗 1', '未実行 1']);
  assert.match(await statusText(), /^3 アプリ中 1 アプリを反映しました。失敗 1 アプリ、未実行 1 アプリ（App 402: kintone が反映に失敗しました。アプリの設定画面で「アプリを更新」を押すと理由を確認できます。）。「失敗・未実行だけ選び直す」から確認し直してください。$/);
  assert.equal(await page.locator('.kus-lp__status').getAttribute('data-tone'), 'warn');
  await shot('result-sequential-failure');
  ok('engine: sequential failure stops the rest');

  // 4b. 依頼が権限エラーで拒否された → 失敗（受け付けられなかったと言い切れる）。残りは未実行
  await reset({ rejectPost: { '411': { message: 'このアプリを更新する権限がありません。', code: 'CB_NO02', status: 403 } }, apps: [addedApp('411', 'A'), addedApp('412', 'B')] });
  await setTargets(['411', '412']);
  await inspect(); await toConfirm(); await confirmAndRun(2);
  {
    const run = await assertOnlyDeployWrites('4b 依頼の拒否');
    assert.deepEqual(run.posts.map(post => [post.body.apps[0].app, post.rejected]), [['411', true]]);
    assert.equal(run.apps['411'].prodRevision, '10');
  }
  assert.match(await resultItem('411').innerText(), /失敗[\s\S]*kintone が反映の依頼を受け付けませんでした（このアプリを更新する権限がありません。）/);
  assert.match(await resultItem('412').innerText(), /未実行/);
  ok('engine: rejected request');

  // =========================================================================
  // 5. まとめて反映で 1 件 FAIL → 他は取り消し。依頼は 1 回で apps に全件
  // =========================================================================
  await reset({ failApps: ['502'], apps: [addedApp('501', 'A'), addedApp('502', 'B', { previewRevision: '14' }), addedApp('503', 'C')] });
  await setTargets(['501', '502', '503']);
  await chooseDetail('まとめて反映');
  await inspect();
  await toConfirm();
  assert.match(await facts('method').innerText(), /まとめて反映（すべて成功したときだけ本番へ反映）（1件でも失敗するとすべて取り消されます）/);
  await confirmAndRun(3);
  {
    const run = await assertOnlyDeployWrites('5 まとめて反映');
    assert.equal(run.posts.length, 1, '依頼は 1 回');
    assert.deepEqual(run.posts[0].body, { apps: [{ app: '501', revision: '12' }, { app: '502', revision: '14' }, { app: '503', revision: '12' }] }, 'apps に全件と、それぞれの確認時の revision');
    for (const id of ['501', '502', '503']) assert.equal(run.apps[id].prodRevision, '10', `App ${id} の本番は変わらない`);
    assert.equal(run.apps['501'].status, 'CANCEL');
    assert.equal(run.apps['502'].status, 'FAIL');
  }
  assert.match(await resultItem('501').innerText(), /取り消し（ほかのアプリの失敗）[\s\S]*ほかのアプリの反映が失敗したため、kintone が取り消しました/);
  assert.match(await resultItem('502').innerText(), /失敗/);
  assert.match(await resultItem('503').innerText(), /取り消し（ほかのアプリの失敗）/);
  assert.match(await statusText(), /^3 アプリ中、反映できたアプリはありません。失敗 1 アプリ、取り消し 2 アプリ（App 502: kintone が反映に失敗しました/);
  assert.equal(await page.locator('.kus-lp__status').getAttribute('data-tone'), 'err');
  ok('engine: atomic failure cancels the others');

  // =========================================================================
  // 6. 変更を中止（revert）
  // =========================================================================
  await reset({ apps: [addedApp('601', '中止するアプリ', { prodRevision: '10', previewRevision: '13' })] });
  await page.getByRole('radio', { name: '変更を中止（プレビューを本番に戻す）', exact: true }).check();
  await setTargets(['601']);
  await inspect();
  await reviewRow('601').getByRole('button', { name: '詳細を表示' }).click();
  assert.match(await page.locator('tr.kus-dp-detail-tr').first().innerText(), /破棄される変更/);
  await toConfirm();
  assert.match(await facts('backup').innerText(), /中止前のプレビューの設定（1 アプリ分）をJSONで保存してから、変更を中止します。/);
  assert.equal(await runButton().innerText(), '確認した 1 アプリの変更を中止');
  await confirmAndRun(601);
  {
    const run = await assertOnlyDeployWrites('6 変更を中止');
    assert.equal(run.posts.length, 1);
    assert.deepEqual(run.posts[0].body, { apps: [{ app: '601', revision: '13' }], revert: true });
    assert.equal(run.downloads.length, 1);
    assert.match(run.downloads[0].name, /^変更中止前バックアップ_中止するアプリ\(app601\)_\d{8}_\d{6}\.json$/);
    assert.ok(run.downloads[0].seq < run.posts[0].seq, 'バックアップが中止の依頼より前');
    const backup = await backupJson(0);
    assert.equal(backup.mode, 'revert');
    assert.equal(backup.environment, 'preview', '中止前のプレビューを保存する');
    assert.equal(backup.bundles[0].preview, true);
    assert.deepEqual(Object.keys(backup.bundles[0].sections.fieldSettings.properties), ['name', 'added_601'], '中止前のプレビューの設定（破棄される変更を含む）');
    const app = run.apps['601'];
    assert.equal(app.previewRevision, '10', 'プレビューが本番に戻る');
    assert.equal(app.prodRevision, '10');
    assert.deepEqual(Object.keys(app.preview.fieldSettings.properties), ['name']);
    assert.deepEqual(Object.keys(app.production.fieldSettings.properties), ['name'], '本番は変わらない');
  }
  assert.match(await statusText(), /^1 アプリのプレビューの変更を中止しました。$/, '中止の文言');
  assert.match(await page.locator('[data-deploy-backup="saved"]').innerText(), /変更中止前バックアップ.*（1 アプリ分・中止前のプレビューの設定）/);
  assert.match(await page.locator('#kus-dp-stage-result').innerText(), /破棄した変更は、バックアップJSONをプレビュー反映で読み込むと戻せます。/);
  ok('engine: revert');

  // =========================================================================
  // 7. JS/CSS: 外れるファイルの本体を取得できない → 依頼せず止める。取得できればバックアップに埋め込む
  // =========================================================================
  const jsApp = (id, extra = {}) => ({
    id, name: 'JSあり', prodRevision: '10', previewRevision: '12',
    production: { customizeSettings: customize([jsFile('keyA', 'a.js'), jsFile('keyB', 'b.js')]) },
    preview: { customizeSettings: customize([jsFile('keyA', 'a.js')]) },
    ...extra
  });
  // 7a. 本番にあってプレビューで外れる b.js の本体が 404
  await reset({ apps: [jsApp('701')], files: { keyA: 'console.log("a")' } });
  await setTargets(['701']);
  await inspect();
  await reviewRow('701').getByRole('button', { name: '詳細を表示' }).click();
  assert.match(await page.locator('[data-deploy-section="customizeSettings"]').innerText(), /JS\/CSS設定[\s\S]*b\.js/, 'JS/CSS の削除を要約に示す');
  await toConfirm();
  await confirmAndRun(701);
  {
    const snapshot = await assertOnlyDeployWrites('7a 本体を取得できない');
    assert.equal(snapshot.posts.length, 0, '反映を依頼しない');
    assert.equal(snapshot.downloads.length, 0, 'バックアップも保存しない');
    assert.ok(snapshot.fetches.some(item => item.url === '/k/v1/file.json?fileKey=keyB'), '外れるファイルの本体を取得しようとする');
    assert.equal(snapshot.apps['701'].prodRevision, '10');
  }
  assert.match(await statusText(), /^反映前の確認で止めました。まだ本番へは反映していません。反映で設定から外れる JS\/CSS ファイルの本体をバックアップに保存できないため、反映を依頼していません（App 701「b\.js」: ファイルを取得できません（HTTP 404））。時間をおいて差分を確認し直すか、対象から外してください。$/);
  assert.match(await resultItem('701').innerText(), /未実行/);
  // 7b. 取得できる場合はバックアップに本体を埋め込む
  await reset({ apps: [jsApp('702')], files: { keyA: 'console.log("a")', keyB: 'console.log("b")' } });
  await setTargets(['702']);
  await inspect(); await toConfirm(); await confirmAndRun(702);
  {
    const run = await assertOnlyDeployWrites('7b 本体を取得できる');
    assert.equal(run.posts.length, 1);
    assert.deepEqual(run.posts[0].body, { apps: [{ app: '702', revision: '12' }] });
    assert.ok(run.downloads[0].seq < run.posts[0].seq);
    const backup = await backupJson(0);
    const files = backup.bundles[0].sections.customizeSettings.desktop.js;
    assert.deepEqual(files.map(item => item.file.name), ['a.js', 'b.js'], 'バックアップは反映前の本番（b.js を含む）');
    assert.equal(Buffer.from(files[1].file._content.base64, 'base64').toString('utf8'), 'console.log("b")', 'ファイル本体を埋め込む');
    assert.equal(files[1].file._content.byteSize, 'console.log("b")'.length);
    assert.equal(files[1].file._content.contentType, 'text/javascript');
    assert.equal(files[0].file._content.base64, encode('console.log("a")'));
    assert.deepEqual(run.apps['702'].production.customizeSettings.desktop.js.map(item => item.file.name), ['a.js'], '本番の設定は反映される');
  }
  assert.match(await statusText(), /^1 アプリを本番へ反映しました。$/);
  assert.equal(await page.locator('[data-deploy-backup-files]').count(), 0);
  // 7c. 反映後も残る a.js の本体が取得できなくても、外れる b.js が保存できていれば反映し、結果に一覧で示す
  await reset({ apps: [jsApp('703')], files: { keyB: 'console.log("b")' } });
  await setTargets(['703']);
  await inspect(); await toConfirm(); await confirmAndRun(703);
  {
    const run = await assertOnlyDeployWrites('7c 残るファイルの本体を取得できない');
    assert.equal(run.posts.length, 1);
    const files = (await backupJson(0)).bundles[0].sections.customizeSettings.desktop.js;
    assert.match(files[0].file._contentUnavailable, /HTTP 404/);
    assert.ok(files[1].file._content);
  }
  assert.match(await page.locator('[data-deploy-backup-files]').innerText(), /本体を保存できなかったファイル（1 件）[\s\S]*App 703 \/ a\.js（ファイルを取得できません（HTTP 404））/);
  ok('engine: customize file bodies');

  // =========================================================================
  // 8. ゲストスペースのアプリ
  // =========================================================================
  await reset({
    apps: [
      { ...jsApp('801'), guest: '9', name: 'ゲストのアプリ' },
      addedApp('802', '通常のアプリ')
    ],
    files: { keyA: 'console.log("a")', keyB: 'console.log("b")' }
  });
  await setTargets(['801', '802'], { 801: '9' });
  assert.equal(await guestInput(0).inputValue(), '9');
  await inspect();
  await toConfirm();
  await confirmAndRun(2);
  {
    const run = await assertOnlyDeployWrites('8 ゲストスペース');
    const guestCalls = run.calls.filter(call => call.params.app === '801' || (call.params.apps || []).includes('801'));
    assert.ok(guestCalls.length > 0);
    assert.ok(guestCalls.every(call => call.url.startsWith('/k/guest/9/v1/')), `ゲストスペースのアプリは /k/guest/9/v1/ だけを使う: ${JSON.stringify(guestCalls.map(call => call.url).filter(url => !url.startsWith('/k/guest/9/v1/')))}`);
    assert.ok(guestCalls.some(call => call.url === '/k/guest/9/v1/preview/app/settings.json'));
    assert.ok(guestCalls.some(call => call.url === '/k/guest/9/v1/app/customize.json') && guestCalls.some(call => call.url === '/k/guest/9/v1/preview/app/customize.json'), '設定の取得も本番・プレビューともゲスト用の URL');
    const normalCalls = run.calls.filter(call => call.params.app === '802' || (call.params.apps || []).includes('802'));
    assert.ok(normalCalls.every(call => call.url.startsWith('/k/v1/')), '通常スペースのアプリは /k/v1/ だけを使う');
    assert.deepEqual(run.posts.map(post => [post.url, post.body]), [
      ['/k/guest/9/v1/preview/app/deploy.json', { apps: [{ app: '801', revision: '12' }] }],
      ['/k/v1/preview/app/deploy.json', { apps: [{ app: '802', revision: '12' }] }]
    ], 'ゲストスペースのアプリはゲスト用の URL に依頼する');
    assert.deepEqual(run.fetches.map(item => item.url).sort(), ['/k/guest/9/v1/file.json?fileKey=keyA', '/k/guest/9/v1/file.json?fileKey=keyB'], 'ファイル本体もゲスト用の URL で取得する');
    assert.deepEqual(run.apps['801'].production.customizeSettings.desktop.js.map(item => item.file.name), ['a.js']);
  }
  assert.match(await statusText(), /^2 アプリを本番へ反映しました。$/);
  ok('engine: guest space');

  // =========================================================================
  // 9. 実行中の「中止」
  // =========================================================================
  // 9a. 依頼の前（直前の確認の読み取り中）に中止 → 依頼なし・未実行
  await reset({ apps: [addedApp('901', 'A'), addedApp('902', 'B')] });
  await setTargets(['901', '902']);
  await inspect(); await toConfirm(); await arm(2);
  await page.evaluate(() => { window.__engine.holdSettings = true; });
  await runButton().click();
  await page.waitForFunction(() => window.__engine.held >= 1);
  await page.getByRole('button', { name: '処理を中止', exact: true }).click();
  await idle();
  await page.evaluate(() => window.__engine.release());
  {
    const snapshot = await assertOnlyDeployWrites('9a 依頼前に中止');
    assert.equal(snapshot.posts.length, 0, '依頼しない');
    assert.equal(snapshot.downloads.length, 0, 'バックアップも保存しない');
    assert.equal(snapshot.apps['901'].prodRevision, '10');
  }
  assert.match(await statusText(), /^中止しました（0\/2 アプリを反映、残り 2 アプリは未実行）。「失敗・未実行だけ選び直す」から確認し直してください。$/);
  assert.match(await resultItem('901').innerText(), /未実行/);
  assert.match(await resultItem('902').innerText(), /未実行/);
  // 9b. ポーリング中に中止 → 完了を確認できない
  await reset({ neverFinish: true, apps: [addedApp('911', 'A'), addedApp('912', 'B')] });
  await setTargets(['911', '912']);
  await inspect(); await toConfirm(); await arm(2);
  await runButton().click();
  await page.waitForFunction(() => window.__engine.posts.length === 1);
  await page.getByRole('button', { name: '処理を中止', exact: true }).click();
  await idle();
  {
    const snapshot = await assertOnlyDeployWrites('9b ポーリング中に中止');
    assert.equal(snapshot.posts.length, 1, '依頼済みの 1 件だけ');
    assert.deepEqual(snapshot.posts[0].body, { apps: [{ app: '911', revision: '12' }] });
    assert.equal(snapshot.downloads.length, 1, 'バックアップは依頼の前に保存済み');
    assert.equal(snapshot.apps['911'].status, 'PROCESSING', 'kintone 側では処理が続いている');
    assert.equal(snapshot.apps['911'].prodRevision, '10');
  }
  assert.match(await resultItem('911').innerText(), /完了を確認できない[\s\S]*反映を依頼しましたが、完了を確認する前に中止しました。kintone 側で処理が続いている可能性があります/);
  assert.match(await resultItem('912').innerText(), /未実行/);
  assert.match(await statusText(), /^中止しました（0\/2 アプリを反映、完了を確認できない 1 アプリ、残り 1 アプリは未実行）。依頼済みのアプリは kintone 側で処理が続く場合があります。「失敗・未実行だけ選び直す」から確認し直してください。$/);
  assert.equal(await page.locator('.kus-lp__status').getAttribute('data-tone'), 'warn');
  await shot('result-cancelled-polling');
  ok('engine: cancel before request and while polling');

  return checks;
};
