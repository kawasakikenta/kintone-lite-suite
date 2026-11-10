'use strict';
const assert = require('node:assert/strict');
const path = require('node:path');

// 本番反映の「反映元アプリから本番へ」の画面（deploy-source-ui.ts・deploy-source-select.ts・deploy-source-edit.ts）と、
// 実エンジン（tabs/reflect-standalone.ts・reflect/selection*.ts・tabs/deploy-source-standalone.ts・tabs/deploy-standalone.ts・api.ts）を束ね、
// kintone の通信だけを合成する。画面の表示と、合成 kintone が受け取った送信内容の両方を確かめる。
//
// 合成 kintone は、反映元（#101）と反映先（#202）の本番・プレビューの全項目の GET、GET /app.json、
// 反映先プレビューへの設定の書き込み（PUT / POST。revision を照合して GAIA_CO02、成功で revision を進めて内容を反映）、
// プレビューの deploy.json の POST / GET（PROCESSING → SUCCESS / FAIL、SUCCESS で本番 = プレビュー）、ファイルの取得・アップロードを受け付ける。
// 想定外の URL、本番・反映元への設定の書き込みは例外にして violations に残し、各シナリオの最後に violations が空であることを確かめる。
//
// script は run-deploy-lite-dom.cjs の bundle('real')（実エンジンを束ねた画面）。
module.exports = async function verifyDeploySourceEngine({ page, script, out, only }) {
  const checks = [];
  const ok = name => { checks.push(name); };
  const ROOT_SEL = '#kus-deploy-lite';
  const button = name => page.getByRole('button', { name, exact: true });
  const tab = name => page.getByRole('tab', { name: new RegExp(name) });
  const idle = () => page.waitForFunction(() => document.querySelector('#kus-deploy-lite').getAttribute('aria-busy') !== 'true');
  const statusText = () => page.locator('.kus-lp__status-text').innerText();
  const dockText = () => page.locator('.kus-dp-dock-copy').innerText();
  const shot = name => page.screenshot({ path: path.join(out, `source-engine-${name}.png`) });
  const row = id => page.locator(`.kus-ds-row[data-change-id="${id}"]`);
  const rowCheck = id => row(id).locator('input[type="checkbox"]');
  const card = key => page.locator(`[data-select-section="${key}"]`);
  const selectCount = key => page.locator(`[data-select-count="${key}"]`);
  const editCard = key => page.locator(`[data-edit-section="${key}"]`);
  const editRow = (key, pointer) => editCard(key).locator(`.kus-ds-edit[data-edit-pointer="${pointer}"]`);
  const fact = key => page.locator(`[data-confirm="${key}"]`);
  const ackBox = () => page.getByRole('checkbox', { name: '上記の内容を確認しました', exact: true });
  const pendingBox = () => page.getByRole('checkbox', { name: '未公開の変更も一緒に本番へ反映されることを了承する', exact: true });
  const idBox = () => page.locator('input[aria-label="確認用の反映先アプリID"]');
  const runButton = () => page.getByRole('button', { name: /^確認した内容を反映先(へ書き込み、本番へ反映|プレビューへ反映)$/ });
  const chip = label => page.getByRole('checkbox', { name: label, exact: true });
  const resultItem = id => page.locator(`.kus-dp-result-item[data-deploy-app="${id}"]`);
  const progress = key => page.locator(`[data-progress-section="${key}"]`);

  // -------------------------------------------------------------------------
  // 合成 kintone（ページ内で動く）。page.evaluate に関数として渡すため、外側の変数は参照しない。
  // -------------------------------------------------------------------------
  function installSyntheticKintone(config) {
    const clone = value => JSON.parse(JSON.stringify(value));
    // 全項目の GET 先（と、書き込める項目の PUT / POST 先）
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
      seq: 0, calls: [], writes: [], posts: [], violations: [], downloads: [], fetches: [], uploads: [], statusGets: 0,
      files: clone(config.files || {}), failApps: config.failApps || [], neverFinish: !!config.neverFinish,
      failWrites: config.failWrites || {}, rejectPost: config.rejectPost || {}, writableApps: config.writableApps || ['202'],
      pollsToFinish: config.pollsToFinish || 1, holdWrites: false, heldWrites: 0, writeResolvers: [], apps: {},
      // 合成 kintone が書き込みの一部の値を受け取らない状況（フィールド定義の指定したキーを捨てる）と、設定の GET の失敗（パスの一覧）を再現する
      discardFieldKeys: config.discardFieldKeys || [], failGets: config.failGets || []
    };
    for (const def of config.apps) {
      state.apps[def.id] = {
        id: def.id, guest: def.guest || '', name: def.name, status: null, group: null,
        prodRevision: String(def.prodRevision), previewRevision: String(def.previewRevision),
        production: { ...defaults(def.name), ...clone(def.shared || {}), ...clone(def.production || {}) },
        preview: { ...defaults(def.name), ...clone(def.shared || {}), ...clone(def.preview || def.production || {}) }
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
    // 別の利用者が、差分を抽出した後に反映先のプレビューを更新した状況を再現する。
    state.bumpPreview = id => {
      const app = state.apps[id];
      app.previewRevision = String(Number(app.previewRevision) + 1);
      app.preview.fieldSettings = { properties: { ...app.preview.fieldSettings.properties, late_added: { type: 'SINGLE_LINE_TEXT', code: 'late_added', label: '後から追加', required: false } } };
    };
    state.release = () => { state.holdWrites = false; state.writeResolvers.splice(0).forEach(resolve => resolve()); };
    const sameKey = (a, b) => JSON.stringify(a) === JSON.stringify(b);
    // プレビューの設定の書き込みを、保存している設定へ反映する。
    const applyWrite = (app, key, method, body) => {
      const { app: _app, revision: _revision, ...rest } = clone(body);
      const section = app.preview[key];
      if (key === 'fieldSettings') {
        for (const [code, rawDefinition] of Object.entries(rest.properties || {})) {
          const definition = { ...rawDefinition };
          for (const dropped of state.discardFieldKeys) delete definition[dropped];
          const exists = Object.prototype.hasOwnProperty.call(section.properties, code);
          if (method === 'POST' && exists) throw Object.assign(new Error(`フィールドコード「${code}」は既に使われています。`), { code: 'GAIA_FC03' });
          if (method === 'PUT' && !exists) throw Object.assign(new Error(`フィールド「${code}」が存在しません。`), { code: 'GAIA_FC01' });
          section.properties[code] = method === 'PUT' ? { ...section.properties[code], ...definition } : definition;
        }
      } else if (key === 'pluginSettings') section.plugins = [...section.plugins, ...(rest.ids || rest.pluginIds || []).map(id => ({ id }))];
      else if (key === 'layoutSettings' || key === 'viewSettings') app.preview[key] = rest;
      else app.preview[key] = { ...section, ...rest };
    };
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
        if (path === '/app.json') {
          if (preview) throw violation(`app.json に preview prefix は無い: ${url}`);
          const app = appOf(params.id);
          return { appId: app.id, name: app.name, code: `app${app.id}` };
        }
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
        if (state.failGets.includes(path)) throw Object.assign(new Error('権限がありません。'), { code: 'CB_NO02' });
        const app = appOf(params.app);
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
        const group = { ids: body.apps.map(row => String(row.app)), revert: body.revert === true, polls: state.pollsToFinish, done: false };
        for (const id of group.ids) { const app = state.apps[id]; app.status = 'PROCESSING'; app.group = group; }
        return {};
      }
      if ((method === 'PUT' || method === 'POST') && ENDPOINTS[path]) {
        // 設定の書き込みは、反映先アプリのプレビューだけに許す（本番・反映元への書き込みは違反）。
        if (!preview) throw violation(`本番への設定の書き込み: ${method} ${url}`);
        const app = appOf(params.app);
        if (!state.writableApps.includes(app.id)) throw violation(`書き込み対象外のアプリへの書き込み: ${method} ${url} (App ${app.id})`);
        const record = { seq: call.seq, url, method, body: clone(params), rejected: false, revisionBefore: app.previewRevision };
        state.writes.push(record);
        if (state.holdWrites) {
          state.heldWrites += 1;
          await new Promise(resolve => state.writeResolvers.push(resolve));
        }
        const failure = state.failWrites[ENDPOINTS[path]];
        if (failure) { record.rejected = true; throw Object.assign(new Error(failure.message), { code: failure.code }); }
        if (params.revision === undefined || String(params.revision) !== app.previewRevision) {
          record.rejected = true;
          throw Object.assign(new Error('リビジョンが最新ではありません。'), { code: 'GAIA_CO02' });
        }
        try { applyWrite(app, ENDPOINTS[path], method, params); } catch (error) { record.rejected = true; throw error; }
        app.previewRevision = String(Number(app.previewRevision) + 1);
        record.revisionAfter = app.previewRevision;
        return { revision: app.previewRevision };
      }
      throw violation(`想定外の書き込み: ${method} ${url}`);
    };
    api.url = value => value;
    window.kintone = { app: { getId: () => 202 }, getRequestToken: () => 'TOKEN', api };
    // ファイル本体の取得（GET /k/v1/file.json?fileKey=）とアップロード（POST /k/v1/file.json）。ほかの fetch は想定外。
    window.fetch = async (url, init = {}) => {
      const method = init.method || 'GET';
      state.fetches.push({ seq: ++state.seq, url: String(url), method });
      if (method === 'POST') {
        if (!/^\/k(?:\/guest\/(\d+))?\/v1\/file\.json$/.test(String(url))) throw violation(`想定外の fetch: POST ${url}`);
        const upload = init.body.get('file'), fileKey = `uploaded-${state.uploads.length + 1}`;
        state.uploads.push({ seq: state.seq, url: String(url), name: upload.name, fileKey });
        state.files[fileKey] = await upload.text();
        return new Response(JSON.stringify({ fileKey }));
      }
      const match = /^\/k(?:\/guest\/(\d+))?\/v1\/file\.json\?fileKey=([^&]+)$/.exec(String(url));
      if (!match || method !== 'GET') throw violation(`想定外の fetch: ${method} ${url}`);
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
    // 既定は「反映元アプリから本番へ」
    assert.equal(await page.getByRole('radio', { name: '反映元アプリから本番へ', exact: true }).isChecked(), true);
  }

  // -------------------------------------------------------------------------
  // 設定の組み立て（Node 側）
  // -------------------------------------------------------------------------
  const text = (code, label, extra = {}) => ({ type: 'SINGLE_LINE_TEXT', code, label, noLabel: false, required: false, unique: false, maxLength: '64', minLength: '', defaultValue: '', expression: '', hideExpression: false, ...extra });
  const memoField = { type: 'MULTI_LINE_TEXT', code: 'memo', label: '備考', noLabel: false, required: false, defaultValue: '' };
  const props = (...fields) => ({ properties: Object.fromEntries(fields.map(item => [item.code, item])) });
  const rowOf = (...codes) => ({ type: 'ROW', fields: codes.map(code => ({ type: code === 'memo' ? 'MULTI_LINE_TEXT' : 'SINGLE_LINE_TEXT', code, size: { width: '200' } })) });
  const list = (name, index, fields, filterCond = '', sort = '') => ({ type: 'LIST', name, index: String(index), fields, filterCond, sort });
  const stripUndefined = value => JSON.parse(JSON.stringify(value));

  /** 反映元 #101: 顧客名は必須・重複禁止。備考（memo）は反映先に無い。 */
  const sourceApp = (extra = {}) => ({
    id: '101', name: '営業管理（開発）', prodRevision: '5', previewRevision: '5',
    production: stripUndefined({
      fieldSettings: props(text('name', '顧客名', { required: true, unique: true }), memoField),
      layoutSettings: { layout: [rowOf('name'), rowOf('memo')] },
      viewSettings: { views: { '全件': list('全件', 0, ['name', 'memo'], 'name != ""', '更新日時 desc'), 'メモ一覧': list('メモ一覧', 1, ['memo']) } }
    }),
    ...extra
  });
  /** 反映先 #202: 本番とプレビューが同じ（未公開の変更なし）。 */
  const targetApp = (extra = {}) => ({
    id: '202', name: '営業管理', prodRevision: '10', previewRevision: '10',
    production: stripUndefined({
      fieldSettings: props(text('name', '取引先')),
      layoutSettings: { layout: [rowOf('name')] },
      viewSettings: { views: { '全件': list('全件', 0, ['name'], '', '') } }
    }),
    ...extra
  });
  const world = (config = {}) => ({ apps: [sourceApp(), targetApp(config.target)], ...config });

  // -------------------------------------------------------------------------
  // 操作
  // -------------------------------------------------------------------------
  async function extract({ scopes = [], without = [], source = '101', target = '202' } = {}) {
    await page.getByLabel('反映元アプリID', { exact: true }).fill(source);
    await page.getByLabel('反映先アプリID', { exact: true }).fill(target);
    for (const label of scopes) await chip(label).check();
    for (const label of without) await chip(label).uncheck();
    await button('差分を抽出する').click();
    await idle();
    assert.equal(await tab('差分を選ぶ').getAttribute('aria-selected'), 'true', `差分を選ぶ段階へ進む: ${await statusText()}`);
  }
  const toEdit = async () => { await button('内容の修正へ').click(); assert.equal(await tab('内容を修正').getAttribute('aria-selected'), 'true'); };
  const toConfirm = async () => { await button('最終確認に進む').click(); assert.equal(await tab('最終確認').getAttribute('aria-selected'), 'true'); };
  async function selectNone(key) { await card(key).locator('[data-action="select-none"]').click(); }
  async function arm(id = '202', { ackPending = false } = {}) {
    await ackBox().check();
    if (ackPending) await pendingBox().check();
    await idBox().fill(id);
    assert.equal(await runButton().isEnabled(), true, '確認後は実行できる');
  }
  async function run(id = '202', options = {}) { await arm(id, options); await runButton().click(); await idle(); }
  const snapshot = () => page.evaluate(() => {
    const s = window.__engine;
    return {
      calls: s.calls.map(({ seq, url, method, params }) => ({ seq, url, method, params })),
      writes: s.writes, posts: s.posts, violations: s.violations, downloads: s.downloads.map(({ seq, name }) => ({ seq, name })),
      fetches: s.fetches, uploads: s.uploads, statusGets: s.statusGets,
      apps: Object.fromEntries(Object.values(s.apps).map(app => [app.id, { prodRevision: app.prodRevision, previewRevision: app.previewRevision, status: app.status, production: app.production, preview: app.preview }]))
    };
  });
  const backupJson = index => page.evaluate(async i => JSON.parse(await window.__engine.downloads[i].blob.text()), index);
  /**
   * 書き込みは「反映先 #202 のプレビューへの設定の書き込み」と「プレビューの deploy.json の POST」だけ。
   * 本番・反映元への設定の書き込み、レコード、想定外の URL・fetch は一切無い（合成 kintone が違反として記録する）。
   */
  async function assertOnlyAllowedWrites(where) {
    const now = await snapshot();
    assert.deepEqual(now.violations, [], `${where}: 合成 kintone が想定外の通信を受けた`);
    const writes = now.calls.filter(call => call.method !== 'GET');
    for (const write of writes) {
      assert.match(write.url, /^\/k(\/guest\/\d+)?\/v1\/preview\/app\/(deploy|form\/fields|form\/layout|views|settings|reports|status|plugins|customize|actions|acl|notifications\/[a-zA-Z]+|categories)\.json$|^\/k\/v1\/preview\/(field|record)\/acl\.json$/, `${where}: 想定外の書き込み先 ${write.method} ${write.url}`);
    }
    const deployWrites = writes.filter(call => /\/deploy\.json$/.test(call.url));
    assert.equal(deployWrites.length, now.posts.length, `${where}: deploy.json への書き込みの数と記録した POST の数が一致する`);
    assert.equal(writes.length - deployWrites.length, now.writes.length, `${where}: 設定の書き込みの数と記録した数が一致する`);
    assert.ok(now.writes.every(write => write.body.app === '202'), `${where}: 設定の書き込みは反映先 #202 だけ`);
    assert.ok(now.fetches.every(item => item.method === 'GET' || item.method === 'POST'), `${where}: fetch はファイルの取得・アップロードだけ`);
    return now;
  }
  const writeLabels = now => now.writes.map(write => `${write.method} ${write.url.replace('/k/v1/preview', '')}`);
  const wanted = name => !only || name.includes(only);


  /** 反映先のプレビューに、以前からの未公開の変更（一般設定の説明）がある反映先。本番 8・プレビュー 10。 */
  const pendingTarget = () => {
    const base = targetApp();
    const settings = { name: '営業管理', description: '', icon: { type: 'PRESET', key: 'APP01' }, theme: 'WHITE', titleField: { selectionMode: 'AUTO' }, enableThumbnails: true, enableBulkDeletion: true, enableComments: true, enableDuplicateRecord: true, enableInlineRecordEditing: true, numberPrecision: { digits: '16', decimalPlaces: '4', roundingMode: 'HALF_EVEN' }, firstMonthOfFiscalYear: '1' };
    return { ...base, prodRevision: '8', previewRevision: '10', production: { ...base.production, appSettings: settings }, preview: { ...base.production, appSettings: { ...settings, description: '以前からの未公開の説明' } } };
  };
  /** 「顧客名」の必須だけを選ぶ（ほかの項目の変更はすべて外す）。 */
  async function selectOnlyRequired() {
    await selectNone('layoutSettings');
    await selectNone('viewSettings');
    await selectNone('fieldSettings');
    await rowCheck('fieldSettings:/properties/name/required').check();
    assert.match(await selectCount('fieldSettings').innerText(), /^選んだ変更 1\/4$/);
  }

  // =========================================================================
  // a. 必須だけ選ぶ → 反映先プレビューへの PUT の body は必須だけが反映元の値。追加フィールドは選ばないので POST は無い。
  //    続けて deploy.json に 1 回依頼し、本番が更新される。バックアップは 2 つ（反映前のプレビュー・本番反映前の本番）で、それぞれ書き込み・依頼より前。
  // =========================================================================
  if (wanted('a')) {
    await reset(world());
    await extract();
    assert.match(await statusText(), /差分のある項目 3・差分なし 0（変更 9 件）。反映する変更を選んでください。まだ書き込んでいません。/);
    assert.equal(await page.locator('[data-target-pending="clean"]').count(), 1, '反映先に未公開の変更は無い');
    assert.deepEqual((await assertOnlyAllowedWrites('a 抽出')).writes, [], '抽出では何も書き込まない');
    await shot('a-select');
    await selectOnlyRequired();
    await toEdit();
    assert.deepEqual(await page.locator('[data-edit-section]').evaluateAll(list => list.map(node => node.getAttribute('data-edit-section'))), ['fieldSettings'], '選んだ変更がある項目だけ修正の画面に出る');
    await toConfirm();
    assert.match(await fact('route').innerText(), /営業管理（開発）（#101・本番設定） → 営業管理（#202）のプレビュー → 営業管理（#202）の本番/);
    assert.match(await fact('sections').innerText(), /反映する項目（1 項目）[\s\S]*フィールド設定[\s\S]*選んだ変更 1\/4[\s\S]*修正した値 0/, '選んだ項目だけを最終確認に示す');
    assert.equal(await page.locator('[data-confirm-section]').count(), 1);
    assert.equal(await fact('backup').locator('li').count(), 2, 'バックアップは反映前のプレビューと反映前の本番の 2 つ');
    await shot('a-confirm');
    await ackBox().check();
    await idBox().fill('201');
    assert.equal(await runButton().isDisabled(), true, 'ID が違うと実行できない');
    await idBox().fill('202');
    await idBox().press('Enter');
    assert.equal((await snapshot()).writes.length, 0, '確認入力の Enter では書き込まない');
    await runButton().click();
    await idle();
    const done = await assertOnlyAllowedWrites('a 実行');
    assert.deepEqual(writeLabels(done), ['PUT /app/form/fields.json'], '書き込みは反映先プレビューのフィールドの PUT 1 回だけ（POST も、レイアウト・一覧の書き込みも無い）');
    const [write] = done.writes;
    assert.equal(write.body.revision, '10', '抽出時の反映先プレビューの revision を添える');
    assert.deepEqual(Object.keys(write.body.properties), ['name'], '選んでいない追加フィールド（memo）は送らない');
    assert.deepEqual(write.body.properties.name, text('name', '取引先', { required: true }), '必須だけが反映元の値。表示名（取引先）と重複禁止（false）は反映先のまま');
    assert.equal(done.posts.length, 1, 'deploy.json への依頼は 1 回');
    assert.deepEqual(done.posts[0].body, { apps: [{ app: '202', revision: '11' }] }, '書き込み後のプレビューの revision を添え、revert は付けない');
    const app = done.apps['202'];
    assert.equal(app.prodRevision, '11');
    assert.equal(app.previewRevision, '11', '本番とプレビューの revision が一致する');
    assert.deepEqual(app.production.fieldSettings.properties.name, text('name', '取引先', { required: true }), '本番が更新される');
    assert.deepEqual(Object.keys(app.production.fieldSettings.properties), ['name']);
    assert.deepEqual(app.production.layoutSettings, { layout: [rowOf('name')] }, 'レイアウトは変わらない');
    assert.deepEqual(app.production.viewSettings.views['全件'], list('全件', 0, ['name'], '', ''), '一覧は変わらない');
    // バックアップ 2 つ: 反映前のプレビュー（最初の書き込みより前）、本番へ反映する前の本番（deploy.json の依頼より前）
    assert.equal(done.downloads.length, 2);
    assert.match(done.downloads[0].name, /^反映前バックアップ_app202_\d{8}_\d{6}\.json$/);
    assert.match(done.downloads[1].name, /^本番反映前バックアップ_営業管理\(app202\)_\d{8}_\d{6}\.json$/);
    assert.ok(done.downloads[0].seq < done.writes[0].seq, '反映前のプレビューのバックアップが最初の書き込みより前');
    assert.ok(done.downloads[1].seq < done.posts[0].seq, '本番反映前の本番のバックアップが依頼より前');
    assert.ok(done.downloads[1].seq > done.writes[0].seq, '本番のバックアップは書き込みのあと（本番へ反映する直前）');
    const previewBackup = await backupJson(0);
    assert.deepEqual(previewBackup.scopes, ['fieldSettings'], '書き込む項目だけをバックアップする');
    assert.equal(previewBackup.bundle.sections.fieldSettings.properties.name.required, false, '反映前のプレビューの設定');
    assert.equal(previewBackup.bundle.appId, '202');
    const productionBackup = await backupJson(1);
    assert.equal(productionBackup.mode, 'deploy');
    assert.equal(productionBackup.environment, 'production');
    assert.equal(productionBackup.bundles[0].preview, false, '反映前の本番');
    assert.equal(productionBackup.bundles[0].sections.fieldSettings.properties.name.required, false);
    // 結果の表示
    assert.equal(await tab('結果').getAttribute('aria-selected'), 'true');
    assert.equal(await statusText(), '1 項目を反映先プレビューへ反映し、1 アプリを本番へ反映しました。');
    assert.equal(await page.locator('.kus-lp__status').getAttribute('data-tone'), 'ok');
    assert.match(await progress('fieldSettings').innerText(), /成功[\s\S]*フィールド設定/);
    assert.equal(await page.locator('[data-progress-section]').count(), 1);
    assert.match(await resultItem('202').innerText(), /成功/);
    assert.match(await page.locator('[data-backup-preview="saved"]').innerText(), /バックアップ（反映前のプレビュー）: 保存しました（項目: フィールド設定）/);
    assert.match(await page.locator('[data-backup-production="saved"]').innerText(), /バックアップ（本番へ反映する前の本番）: 本番反映前バックアップ_営業管理\(app202\)_\d{8}_\d{6}\.json/);
    assert.equal(await page.locator('[data-deploy-unverified]').count(), 0, '本番とプレビューの revision が一致している');
    await shot('a-result');
    ok('source engine: only 必須 is written, then deployed once');
  }

  // =========================================================================
  // b. 段階 3 で表示名を入力欄で直す → 送信内容がその値。元に戻すで既定へ
  // =========================================================================
  if (wanted('b')) {
    await reset(world());
    await extract();
    await selectNone('layoutSettings');
    await selectNone('viewSettings');
    await selectNone('fieldSettings');
    await rowCheck('fieldSettings:/properties/name/label').check();
    await rowCheck('fieldSettings:/properties/name/required').check();
    await toEdit();
    const label = editRow('fieldSettings', '/properties/name/label');
    assert.equal(await label.locator('input').inputValue(), '顧客名', '既定は反映元の表示名');
    assert.match(await label.locator('.kus-ds-edit__default').innerText(), /^既定: 顧客名$/);
    assert.equal(await label.locator('[data-action="edit-reset"]').isHidden(), true, '直す前は「元に戻す」を出さない');
    await label.locator('input').fill('お客様名');
    assert.equal(await label.getAttribute('data-changed'), 'true');
    assert.equal(await label.locator('[data-action="edit-reset"]').isVisible(), true);
    // 必須の既定は真偽値。「true / false」ではなく「はい / いいえ」で示す
    const required = editRow('fieldSettings', '/properties/name/required');
    assert.match(await required.locator('.kus-ds-edit__default').innerText(), /^既定: はい$/, '真偽値の既定は「はい」');
    await toConfirm();
    assert.match(await fact('sections').innerText(), /選んだ変更 2\/4[\s\S]*修正した値 1/);
    await shot('b-confirm');
    await run();
    const edited = await assertOnlyAllowedWrites('b 表示名を直す');
    assert.deepEqual(writeLabels(edited), ['PUT /app/form/fields.json']);
    assert.deepEqual(edited.writes[0].body.properties.name, text('name', 'お客様名', { required: true }), '送信内容は入力欄の値（お客様名）と反映元の必須');
    assert.equal(edited.apps['202'].production.fieldSettings.properties.name.label, 'お客様名', '本番にも反映される');
    assert.match(await statusText(), /^1 項目を反映先プレビューへ反映し、1 アプリを本番へ反映しました。$/);

    // 元に戻す → 既定（反映元の表示名）で送る
    await reset(world());
    await extract();
    await selectNone('layoutSettings');
    await selectNone('viewSettings');
    await selectNone('fieldSettings');
    await rowCheck('fieldSettings:/properties/name/label').check();
    await toEdit();
    await label.locator('input').fill('お客様名');
    await label.locator('[data-action="edit-reset"]').click();
    assert.equal(await label.locator('input').inputValue(), '顧客名', '元に戻すと既定の値');
    assert.equal(await label.getAttribute('data-changed'), 'false');
    assert.equal(await label.locator('[data-action="edit-reset"]').isHidden(), true);
    assert.match(await editCard('fieldSettings').locator('[data-edit-count]').innerText(), /修正した値 0/);
    await toConfirm();
    assert.match(await fact('sections').innerText(), /修正した値 0/);
    await run();
    const restored = await assertOnlyAllowedWrites('b 元に戻す');
    assert.deepEqual(restored.writes[0].body.properties.name, text('name', '顧客名'), '元に戻すと反映元の値（顧客名）を送る。必須・重複禁止は反映先のまま');
    ok('source engine: edited display name and reset');
  }

  // =========================================================================
  // c. 一覧の JSON 編集 → 送信内容が JSON のとおり。JSON の誤り（構文・フィールドの種類の変更・フィールドの削除）は最終確認へ進めない
  // =========================================================================
  if (wanted('c')) {
    await reset(world());
    await extract();
    await selectNone('layoutSettings');
    await selectNone('fieldSettings');
    await selectNone('viewSettings');
    await rowCheck('viewSettings:/views/全件/filterCond').check();
    await toEdit();
    await editCard('viewSettings').locator('[data-action="json-toggle"]').click();
    const json = editCard('viewSettings').locator('[data-json-area] textarea');
    const initial = JSON.parse(await json.inputValue());
    assert.equal(initial.views['全件'].filterCond, 'name != ""', '送る設定は反映先の一覧に、選んだ filterCond だけを反映元の値にしたもの');
    assert.deepEqual(initial.views['全件'].fields, ['name'], '選んでいない値（表示フィールド）は反映先のまま');
    const edited = { views: { '全件': { ...initial.views['全件'], filterCond: 'name like "山" and name != ""' } } };
    // 構文の誤り → 適用できない（直前の内容のまま）
    await json.fill(JSON.stringify(edited).slice(0, -3));
    await editCard('viewSettings').locator('[data-action="json-apply"]').click();
    assert.match(await editCard('viewSettings').locator('.kus-ds-json__error').innerText(), /^JSONの形式が正しくありません/);
    assert.equal(await editCard('viewSettings').locator('[data-json-active]').isHidden(), true, '構文の誤りは適用されない');
    assert.equal(await button('最終確認に進む').isDisabled(), true, '構文の誤りを直さないまま最終確認に進めない');
    assert.equal(await tab('最終確認').isDisabled(), true);
    assert.match(await dockText(), /次に進むには：ビュー設定のJSONの変更がまだ適用されていません。「JSONを適用」を押すか、「JSONの編集を閉じる」で取り消してください。/);
    assert.deepEqual((await assertOnlyAllowedWrites('c 構文の誤り')).writes, []);
    // 正しい JSON を入力しても、適用するまでは進めない（適用しないまま進むと、直した内容が送られない）
    await json.fill(JSON.stringify(edited, null, 2));
    assert.equal(await button('最終確認に進む').isDisabled(), true, '適用していない JSON の変更があるうちは進めない');
    await editCard('viewSettings').locator('[data-action="json-apply"]').click();
    assert.equal(await button('最終確認に進む').isEnabled(), true, '適用すると進める');
    assert.equal(await editCard('viewSettings').locator('[data-json-active]').isVisible(), true, 'JSON で修正中の表示');
    assert.match(await editCard('viewSettings').locator('[data-edit-count]').innerText(), /修正した値 1/);
    await shot('c-json');
    // 適用済みの JSON を直し始めて適用せずに閉じると、適用済みの内容のまま進める
    await json.fill('{ "views": ');
    assert.equal(await button('最終確認に進む').isDisabled(), true);
    await editCard('viewSettings').locator('[data-action="json-toggle"]').click();
    assert.equal(await button('最終確認に進む').isEnabled(), true, '編集を閉じると、適用していない変更は捨てて進める');
    assert.equal(await editCard('viewSettings').locator('[data-json-active]').isVisible(), true, '適用済みの JSON はそのまま');
    await toConfirm();
    await run();
    const done = await assertOnlyAllowedWrites('c JSON');
    assert.deepEqual(writeLabels(done), ['PUT /app/views.json']);
    assert.deepEqual(done.writes[0].body, { ...edited, app: '202', revision: '10' }, '送信内容は JSON のとおり');
    assert.equal(done.apps['202'].production.viewSettings.views['全件'].filterCond, 'name like "山" and name != ""');
    assert.match(await statusText(), /^1 項目を反映先プレビューへ反映し、1 アプリを本番へ反映しました。$/);

    // フィールドの JSON の誤り（種類の変更・フィールドの削除）は最終確認へ進めない
    const blocked = async (edit, expected, name) => {
      await reset(world());
      await extract();
      await selectNone('layoutSettings');
      await selectNone('viewSettings');
      await selectNone('fieldSettings');
      await rowCheck('fieldSettings:/properties/name/required').check();
      await toEdit();
      await editCard('fieldSettings').locator('[data-action="json-toggle"]').click();
      const area = editCard('fieldSettings').locator('[data-json-area] textarea');
      const body = JSON.parse(await area.inputValue());
      edit(body);
      await area.fill(JSON.stringify(body, null, 2));
      await editCard('fieldSettings').locator('[data-action="json-apply"]').click();
      assert.match(await editCard('fieldSettings').locator('[data-edit-errors]').innerText(), expected, `${name}: 問題をカードに示す`);
      assert.equal(await button('最終確認に進む').isDisabled(), true, `${name}: 最終確認に進めない`);
      assert.equal(await tab('最終確認').isDisabled(), true);
      assert.match(await dockText(), /次に進むには：フィールド設定: /, `${name}: 進めない理由を示す`);
      assert.match(await page.locator('[data-edit-blockers]').innerText(), expected, `${name}: 画面下にもまとめる`);
      assert.equal((await assertOnlyAllowedWrites(`c ${name}`)).writes.length, 0, `${name}: 書き込みなし`);
      // JSON での修正を取り消すと進める
      await editCard('fieldSettings').locator('[data-action="json-cancel"]').click();
      assert.equal(await button('最終確認に進む').isEnabled(), true, `${name}: 取り消すと進める`);
      return shot(`c-${name}`);
    };
    await blocked(body => { body.properties.name.type = 'NUMBER'; }, /name/, '種類の変更');
    await blocked(body => { delete body.properties.name; }, /name/, 'フィールドの削除');
    ok('source engine: JSON edit and JSON errors');
  }

  // =========================================================================
  // d. 選ばなかった追加フィールド（備考）を参照する一覧を選ぶ → 進めない理由を示し、書き込まない
  // =========================================================================
  if (wanted('d')) {
    await reset(world());
    await extract();
    await selectNone('layoutSettings');
    await selectNone('fieldSettings');
    await rowCheck('fieldSettings:/properties/name/required').check();
    await selectNone('viewSettings');
    await rowCheck('viewSettings:/views/メモ一覧').check();
    const reasonPattern = /ビュー設定: 参照するフィールド「memo」が反映先にありません。反映元にあるフィールドなので、フィールド設定で「memo」の追加も選ぶか、この項目を除外してください。/;
    assert.match(await page.locator('[data-select-blockers]').innerText(), reasonPattern, 'フィールド設定は反映対象に含まれているので、追加の変更を選ぶよう案内する');
    assert.doesNotMatch(await page.locator('[data-select-blockers]').innerText(), /フィールド設定も反映対象に含めるか/);
    assert.match(await page.locator('[data-select-blockers]').innerText(), /次へ進む前に解消が必要です/);
    assert.match(await dockText(), /次に進むには：/, '進めない理由をフッターに示す');
    assert.match(await dockText(), reasonPattern);
    assert.equal(await button('内容の修正へ').isDisabled(), true);
    assert.equal(await tab('内容を修正').isDisabled(), true);
    assert.equal(await tab('最終確認').isDisabled(), true);
    await shot('d-blocked');
    assert.deepEqual((await assertOnlyAllowedWrites('d 進めない')).writes, [], '書き込みなし');
    // 備考の追加も選ぶと進める
    await rowCheck('fieldSettings:/properties/memo').check();
    assert.equal(await button('内容の修正へ').isEnabled(), true, '参照するフィールドの追加も選ぶと進める');
    await toEdit(); await toConfirm(); await run();
    const done = await assertOnlyAllowedWrites('d 解消して実行');
    assert.deepEqual(writeLabels(done), ['POST /app/form/fields.json', 'PUT /app/form/fields.json', 'PUT /app/views.json'], '追加フィールド → 更新 → 一覧の順');
    assert.deepEqual(Object.keys(done.writes[0].body.properties), ['memo']);
    assert.ok(done.apps['202'].production.viewSettings.views['メモ一覧'], '本番に一覧が追加される');
    ok('source engine: view referencing an unselected added field blocks');
  }

  // =========================================================================
  // e. 項目の一部だけに変更を選ぶ → 書き込みは選んだ項目だけ。baseline の照合で止まらない
  // =========================================================================
  if (wanted('e')) {
    // フィールド・レイアウト・一覧を抽出し、一覧の変更を全部外す
    await reset(world());
    await extract();
    await selectNone('viewSettings');
    assert.match(await selectCount('viewSettings').innerText(), /^選んだ変更 0\//);
    await toEdit();
    assert.equal(await editCard('viewSettings').count(), 0, '選んだ変更が無い一覧は修正の画面に出さない');
    await toConfirm();
    assert.match(await fact('sections').innerText(), /反映する項目（2 項目）[\s\S]*フィールド設定[\s\S]*レイアウト設定/);
    assert.equal(await page.locator('[data-confirm-section="viewSettings"]').count(), 0, '一覧は最終確認に出さない');
    await run();
    const partial = await assertOnlyAllowedWrites('e 一覧を外す');
    assert.deepEqual(writeLabels(partial), ['POST /app/form/fields.json', 'PUT /app/form/fields.json', 'PUT /app/form/layout.json'], '書き込みは選んだ項目（フィールド・レイアウト）だけ。一覧は書き込まない');
    assert.deepEqual(partial.writes.map(write => write.body.revision), ['10', '11', '12'], '書き込みごとに revision を引き継ぐ');
    assert.deepEqual(partial.writes[2].body.layout, [rowOf('name'), rowOf('memo')]);
    assert.equal(await page.locator('[data-progress-section]').count(), 2, '結果にも選んだ項目だけ');
    assert.deepEqual(partial.posts.map(post => post.body), [{ apps: [{ app: '202', revision: '13' }] }]);
    assert.deepEqual(partial.apps['202'].production.viewSettings.views['全件'], list('全件', 0, ['name'], '', ''), '一覧は反映先のまま');
    assert.deepEqual(Object.keys(partial.apps['202'].production.fieldSettings.properties), ['name', 'memo']);
    assert.equal(partial.apps['202'].production.fieldSettings.properties.name.label, '顧客名');
    assert.equal(await statusText(), '2 項目を反映先プレビューへ反映し、1 アプリを本番へ反映しました。');

    // 一覧だけを選ぶ（フィールド・レイアウトは外す。一覧が参照するフィールドは反映先にある）。照合はフィールドの確認も含めて通る
    await reset(world());
    await extract();
    await selectNone('fieldSettings');
    await selectNone('layoutSettings');
    await selectNone('viewSettings');
    await rowCheck('viewSettings:/views/全件/sort').check();
    await toEdit(); await toConfirm();
    assert.match(await fact('sections').innerText(), /反映する項目（1 項目）[\s\S]*ビュー設定/);
    await run();
    const onlyViews = await assertOnlyAllowedWrites('e 一覧だけ');
    assert.deepEqual(writeLabels(onlyViews), ['PUT /app/views.json']);
    assert.equal(onlyViews.writes[0].body.views['全件'].sort, '更新日時 desc');
    assert.deepEqual(onlyViews.writes[0].body.views['全件'].fields, ['name'], '選んでいない一覧の値は反映先のまま');
    assert.equal(onlyViews.apps['202'].production.viewSettings.views['全件'].sort, '更新日時 desc');
    assert.deepEqual(onlyViews.apps['202'].production.layoutSettings, { layout: [rowOf('name')] });
    ok('source engine: only the sections with selected changes are written');
  }

  // =========================================================================
  // f. 目標「プレビューまで」 → deploy.json の依頼なし、結果の文言
  // =========================================================================
  if (wanted('f')) {
    await reset(world());
    await page.getByRole('radio', { name: 'プレビューまで（本番へは反映しない）', exact: true }).check();
    await extract();
    await selectOnlyRequired();
    await toEdit(); await toConfirm();
    assert.match(await fact('goal').innerText(), /プレビューまで（本番へは反映しません）/);
    assert.equal(await fact('backup').locator('li').count(), 1, 'バックアップは反映前のプレビューだけ');
    assert.equal(await runButton().innerText(), '確認した内容を反映先プレビューへ反映');
    await run();
    const done = await assertOnlyAllowedWrites('f プレビューまで');
    assert.deepEqual(writeLabels(done), ['PUT /app/form/fields.json']);
    assert.equal(done.posts.length, 0, 'deploy.json の依頼なし');
    assert.equal(done.downloads.length, 1, 'バックアップは反映前のプレビューだけ');
    assert.equal(done.apps['202'].prodRevision, '10', '本番は変わらない');
    assert.equal(done.apps['202'].production.fieldSettings.properties.name.required, false);
    assert.equal(done.apps['202'].preview.fieldSettings.properties.name.required, true, 'プレビューには書き込む');
    assert.equal(done.apps['202'].previewRevision, '11');
    assert.equal(await statusText(), '1 項目を反映先プレビューへ反映しました。本番へは反映していません。');
    assert.equal(await page.locator('.kus-lp__status').getAttribute('data-tone'), 'ok');
    assert.equal(await page.locator('[data-deploy-skipped]').count(), 0, 'プレビューまでのときは本番の欄を出さない');
    assert.equal(await page.locator('[data-backup-production]').count(), 0);
    assert.match(await page.locator('#kus-ds-stage-result').innerText(), /アプリの設定画面で『変更を中止』を押すと、今回の反映をすべて取り消せます。/, '取り消し方の案内');
    await shot('f-result');
    ok('source engine: goal preview does not deploy');
  }

  // =========================================================================
  // g. 反映先に以前からの未公開の変更（本番とプレビューの revision が違う）→ 最終確認で了承が必須。了承して実行すると本番へ反映される
  // =========================================================================
  if (wanted('g')) {
    await reset(world({ target: pendingTarget() }));
    await extract();
    assert.equal(await page.locator('[data-target-pending="pending"]').count(), 1);
    assert.match(await page.locator('[data-target-pending="pending"]').innerText(), /反映先に以前からの未公開の変更があります[\s\S]*本番 8[\s\S]*プレビュー 10/);
    await selectOnlyRequired();
    await toEdit(); await toConfirm();
    assert.match(await fact('pending').innerText(), /反映先に以前からの未公開の変更があります[\s\S]*一緒に本番へ反映されます/);
    await ackBox().check();
    await idBox().fill('202');
    assert.equal(await runButton().isDisabled(), true, '未公開の変更の了承なしでは実行できない');
    assert.match(await page.locator('.kus-dp-quiet[aria-live]').last().innerText(), /未公開の変更の了承が必要です。/);
    assert.match(await dockText(), /確認のチェック、未公開の変更の了承、入力をすると、実行できます。/, 'フッターにも未公開の変更の了承が要ることを示す');
    await runButton().click({ force: true }).catch(() => {});
    assert.equal((await snapshot()).writes.length, 0, '了承なしでは何も書き込まない');
    await shot('g-confirm');
    await pendingBox().check();
    assert.equal(await runButton().isEnabled(), true);
    await runButton().click();
    await idle();
    const done = await assertOnlyAllowedWrites('g 了承して実行');
    assert.deepEqual(writeLabels(done), ['PUT /app/form/fields.json']);
    assert.equal(done.writes[0].body.revision, '10', '反映先プレビューの revision（本番とは違う）を添える');
    assert.deepEqual(done.posts.map(post => post.body), [{ apps: [{ app: '202', revision: '11' }] }]);
    const app = done.apps['202'];
    assert.equal(app.prodRevision, '11', '本番へ反映される');
    assert.equal(app.production.appSettings.description, '以前からの未公開の説明', '以前からの未公開の変更も一緒に本番へ反映される');
    assert.equal(app.production.fieldSettings.properties.name.required, true);
    assert.equal(await statusText(), '1 項目を反映先プレビューへ反映し、1 アプリを本番へ反映しました。');
    ok('source engine: pending changes need an acknowledgement');
  }

  // =========================================================================
  // h. 差分の抽出の後に反映先プレビューが更新された → 書き込み前に停止（反映前の検査）。書き込み・依頼なし。差分は残る
  // =========================================================================
  if (wanted('h')) {
    await reset(world());
    await extract();
    // 表示名と必須を選び、表示名を入力欄で直しておく（抽出し直した後に引き継がれることを確かめる）
    await selectNone('layoutSettings');
    await selectNone('viewSettings');
    await selectNone('fieldSettings');
    await rowCheck('fieldSettings:/properties/name/label').check();
    await rowCheck('fieldSettings:/properties/name/required').check();
    await toEdit();
    await editRow('fieldSettings', '/properties/name/label').locator('input').fill('お客様名');
    await toConfirm();
    await arm();
    await page.evaluate(() => window.__engine.bumpPreview('202'));
    await runButton().click();
    await idle();
    const stopped = await assertOnlyAllowedWrites('h 抽出後の更新');
    assert.deepEqual(stopped.writes, [], '書き込まない');
    assert.deepEqual(stopped.posts, [], '依頼しない');
    assert.equal(stopped.downloads.length, 0, 'バックアップも保存しない');
    assert.equal(stopped.apps['202'].prodRevision, '10', '本番は変わらない');
    assert.equal(await page.locator('.kus-lp__status').getAttribute('data-tone'), 'err');
    assert.match(await statusText(), /^エラー: 差分確認後に反映先プレビューのフィールド設定が変更されたため反映を中止しました。差分を取得し直して、変更内容を再確認してください。/);
    assert.equal(await tab('内容を修正').getAttribute('aria-selected'), 'true', '修正の画面へ戻る');
    assert.equal(await editCard('fieldSettings').count(), 1, '選んだ差分は残る');
    // 抽出結果は古いものとして扱う: 段階 2〜4 の主ボタンは使えず、「差分を抽出し直す」へ案内する
    assert.equal(await button('最終確認に進む').isDisabled(), true, '最終確認へ進めない');
    assert.equal(await tab('最終確認').isDisabled(), true, '最終確認のタブも使えない');
    assert.equal(await button('差分を抽出し直す').isEnabled(), true, '差分を抽出し直せる');
    assert.match(await page.locator('[data-stale-extraction="edit"]').innerText(), /抽出結果が古くなりました\n書き込み前の確認で止めたため、まだ何も書き込んでいません（差分確認後に反映先プレビューのフィールド設定が変更されたため反映を中止しました。差分を取得し直して、変更内容を再確認してください）。「差分を抽出し直す」を押してください。選択と入力欄の修正は、抽出し直した後もできるだけ引き継ぎます。/);
    assert.match(await dockText(), /次に進むには：反映先が更新されたため、抽出結果は古くなりました。「差分を抽出し直す」を押してください。/);
    await tab('結果').click();
    assert.match(await page.locator('#kus-ds-stage-result').innerText(), /まだ実行していません/, '書き込んでいないので結果は出さない');
    assert.equal(await page.locator('#kus-ds-stage-result [data-progress-section]:visible').count(), 0);
    await tab('差分を選ぶ').click();
    assert.equal(await page.locator('[data-stale-extraction="select"]').isVisible(), true, '差分を選ぶ画面にも案内を出す');
    assert.equal(await button('内容の修正へ').isDisabled(), true, '内容の修正へ進めない');
    await shot('h-stopped');
    // 抽出し直すと、更新後の反映先に対する差分になる。選択と入力欄の修正は引き継がれる
    await button('差分を抽出し直す').click();
    await idle();
    assert.equal(await tab('差分を選ぶ').getAttribute('aria-selected'), 'true');
    assert.equal(await page.locator('[data-stale-extraction="select"]').isHidden(), true, '抽出し直すと案内は消える');
    assert.match(await page.locator('[data-target-pending="pending"]').innerText(), /反映先に以前からの未公開の変更があります/, '別の利用者の更新は、以前からの未公開の変更として示す');
    assert.equal(await page.locator('[data-carry-over]').innerText(), '前回の選択 2 件・入力欄の修正 1 件を引き継ぎました。');
    assert.match(await statusText(), /前回の選択 2 件・入力欄の修正 1 件を引き継ぎました。/);
    assert.match(await selectCount('fieldSettings').innerText(), /^選んだ変更 2\/4$/, '同じ change.id の選択を引き継ぐ');
    assert.equal(await selectCount('layoutSettings').innerText(), '選んだ変更 0/1', '外した項目も外したまま');
    assert.equal(await rowCheck('fieldSettings:/properties/name/unique').isChecked(), false);
    await toEdit();
    assert.equal(await editRow('fieldSettings', '/properties/name/label').locator('input').inputValue(), 'お客様名', '同じ pointer の入力欄の修正を引き継ぐ');
    await toConfirm();
    assert.match(await fact('pending').innerText(), /一緒に本番へ反映されます/);
    await run('202', { ackPending: true });
    const retried = await assertOnlyAllowedWrites('h 抽出し直して実行');
    assert.deepEqual(retried.writes.map(write => write.body.revision), ['11'], '更新後の revision で書き込む');
    assert.equal(retried.writes[0].body.properties.name.label, 'お客様名', '引き継いだ修正が送信内容になる');
    assert.equal(retried.writes[0].body.properties.name.required, true);
    assert.equal(retried.writes[0].body.properties.name.unique, false, '選ばなかった重複禁止は反映先のまま');
    assert.ok(retried.apps['202'].production.fieldSettings.properties.late_added, '別の利用者が追加したフィールドは、反映先だけの設定として保持され、了承のうえ一緒に本番へ反映される');
    assert.equal(retried.apps['202'].production.fieldSettings.properties.name.required, true);
    ok('source engine: preview updated after extraction stops before writing; re-extract keeps selection and edits');
  }

  // =========================================================================
  // h2. 抽出し直した後に消えた差分は、引き継げなかった件数として示す
  // =========================================================================
  if (wanted('h2')) {
    await reset(world());
    await extract();
    await selectNone('layoutSettings');
    await selectNone('viewSettings');
    await selectNone('fieldSettings');
    await rowCheck('fieldSettings:/properties/name/label').check();
    await rowCheck('fieldSettings:/properties/name/required').check();
    await toEdit();
    await editRow('fieldSettings', '/properties/name/label').locator('input').fill('お客様名');
    await toConfirm();
    await arm();
    // 別の利用者が、表示名を反映元と同じ「顧客名」にしてから保存した（表示名の差分が無くなる）
    await page.evaluate(() => { const app = window.__engine.apps['202']; app.previewRevision = String(Number(app.previewRevision) + 1); app.preview.fieldSettings.properties.name.label = '顧客名'; });
    await runButton().click();
    await idle();
    assert.deepEqual((await assertOnlyAllowedWrites('h2 抽出後の更新')).writes, []);
    await button('差分を抽出し直す').click();
    await idle();
    assert.equal(await page.locator('[data-carry-over]').innerText(), '前回の選択 1 件を引き継ぎました。引き継げなかったもの: 選択 1 件・入力欄の修正 1 件（更新後の差分に無い、または JSON のため）。選び直してください。');
    assert.match(await selectCount('fieldSettings').innerText(), /^選んだ変更 1\/3$/, '残った差分（必須）だけ選んだまま');
    assert.equal(await rowCheck('fieldSettings:/properties/name/required').isChecked(), true);
    assert.equal(await row('fieldSettings:/properties/name/label').count(), 0, '表示名の差分は無くなった');
    await shot('h2-carry-lost');
    ok('source engine: carry-over reports what could not be kept');
  }

  // =========================================================================
  // i. 書き込みの途中で失敗（レイアウトの PUT が拒否）→ 本番へは反映しない（deploySkipped の表示）。依頼なし
  // =========================================================================
  if (wanted('i')) {
    await reset(world({ failWrites: { layoutSettings: { code: 'GAIA_IL26', message: '指定したフィールドが存在しません。' } } }));
    await extract();
    await toEdit(); await toConfirm(); await run();
    const failed = await assertOnlyAllowedWrites('i 書き込みの失敗');
    assert.deepEqual(writeLabels(failed), ['POST /app/form/fields.json', 'PUT /app/form/fields.json', 'PUT /app/form/layout.json'], 'レイアウトで止まり、一覧は書き込まない');
    assert.deepEqual(failed.writes.map(write => write.rejected), [false, false, true]);
    assert.deepEqual(failed.posts, [], 'deploy.json の依頼なし');
    assert.equal(failed.apps['202'].prodRevision, '10', '本番は変わらない');
    assert.deepEqual(Object.keys(failed.apps['202'].preview.fieldSettings.properties), ['name', 'memo'], 'フィールドは書き込み済み（プレビューは一部だけ更新される）');
    assert.equal(failed.downloads.length, 1, 'バックアップは反映前のプレビューだけ（本番へは反映しない）');
    assert.equal(await page.locator('.kus-lp__status').getAttribute('data-tone'), 'warn');
    assert.match(await statusText(), /^3 項目中 1 項目を反映先プレビューへ反映しました。失敗 1 項目、未実行 1 項目（レイアウト設定: .*指定したフィールドが存在しません。.*）。本番へは反映していません。$/);
    assert.match(await progress('fieldSettings').innerText(), /成功/);
    assert.match(await progress('layoutSettings').innerText(), /失敗[\s\S]*指定したフィールドが存在しません。/);
    assert.match(await progress('viewSettings').innerText(), /未実行/);
    assert.match(await page.locator('[data-deploy-skipped]').innerText(), /本番へは反映していません[\s\S]*反映先プレビューへの書き込みが完了しなかった項目があるため（レイアウト設定: 失敗、ビュー設定: 未実行）/);
    // フィールド設定は書き込めた（レイアウト設定で失敗）ので、一部だけ書き込まれていると示す（「書き込み済み」「続けて本番へ反映できます」とは言わない）
    assert.match(await page.locator('[data-deploy-skipped-note]').innerText(), /反映先プレビューには一部だけ書き込まれています。差分を取得し直して現在の状態を確認してください。/);
    assert.doesNotMatch(await page.locator('[data-deploy-skipped-note]').innerText(), /書き込み済みです|続けて本番へ反映できます/);
    assert.match(await page.locator('[data-backup-production="none"]').innerText(), /保存していません/);
    await shot('i-write-failed');
    ok('source engine: write failure skips the deploy');
  }

  // =========================================================================
  // j. 本番への反映が FAIL → 結果の表示
  // =========================================================================
  if (wanted('j')) {
    await reset(world({ failApps: ['202'] }));
    await extract();
    await selectOnlyRequired();
    await toEdit(); await toConfirm(); await run();
    const failed = await assertOnlyAllowedWrites('j 本番への反映の失敗');
    assert.deepEqual(writeLabels(failed), ['PUT /app/form/fields.json']);
    assert.deepEqual(failed.posts.map(post => post.body), [{ apps: [{ app: '202', revision: '11' }] }]);
    assert.equal(failed.apps['202'].status, 'FAIL');
    assert.equal(failed.apps['202'].prodRevision, '10', '本番は変わらない');
    assert.equal(failed.apps['202'].preview.fieldSettings.properties.name.required, true, 'プレビューには書き込み済み');
    assert.equal(failed.downloads.length, 2, '依頼の前に本番のバックアップを保存している');
    assert.equal(await page.locator('.kus-lp__status').getAttribute('data-tone'), 'warn');
    assert.match(await statusText(), /^1 項目を反映先プレビューへ反映し、1 アプリ中、反映できたアプリはありません。失敗 1 アプリ（App 202: kintone が反映に失敗しました/);
    assert.match(await resultItem('202').innerText(), /失敗[\s\S]*kintone が反映に失敗しました/);
    assert.match(await page.locator('[data-backup-production="saved"]').innerText(), /本番反映前バックアップ_営業管理/);
    await shot('j-deploy-failed');
    ok('source engine: deploy FAIL');
  }

  // =========================================================================
  // k. 中止（書き込み中・本番反映の完了待ち中）
  // =========================================================================
  if (wanted('k')) {
    // 書き込み中: 最初の書き込み（フィールド追加）を保留して中止 → その書き込みは完了し、次の書き込みの前で止まる。本番へは反映しない
    await reset(world());
    await extract();
    await toEdit(); await toConfirm();
    await arm();
    await page.evaluate(() => { window.__engine.holdWrites = true; });
    await runButton().click();
    await page.waitForFunction(() => window.__engine.heldWrites >= 1);
    await page.getByRole('button', { name: '処理を中止', exact: true }).click();
    await page.evaluate(() => window.__engine.release());
    await idle();
    const cancelledWriting = await assertOnlyAllowedWrites('k 書き込み中に中止');
    assert.deepEqual(writeLabels(cancelledWriting), ['POST /app/form/fields.json'], '送信済みの書き込みだけ。次の書き込みは送らない');
    assert.deepEqual(cancelledWriting.posts, [], '本番へは依頼しない');
    assert.equal(cancelledWriting.apps['202'].prodRevision, '10');
    assert.equal(cancelledWriting.downloads.length, 1, '本番のバックアップは保存しない');
    assert.equal(await page.locator('.kus-lp__status').getAttribute('data-tone'), 'warn');
    assert.match(await statusText(), /^中止しました（0\/3 項目を反映先プレビューへ反映、1 項目は途中で停止、残り 2 項目は未実行）。書き込み済みの分は反映先プレビューに残っています。本番へは反映していません。$/);
    assert.match(await progress('fieldSettings').innerText(), /途中で停止[\s\S]*フィールド追加 まで書き込み済み/);
    assert.match(await progress('layoutSettings').innerText(), /未実行/);
    assert.match(await progress('viewSettings').innerText(), /未実行/);
    assert.equal(await page.locator('[data-deploy-skipped]').count(), 1, '本番へ反映していない表示');
    await shot('k-cancel-writing');

    // 本番反映の完了待ち中: 依頼は済んでいる。完了を確認できない
    await reset(world({ neverFinish: true }));
    await extract();
    await selectOnlyRequired();
    await toEdit(); await toConfirm();
    await arm();
    await runButton().click();
    await page.waitForFunction(() => window.__engine.posts.length === 1);
    await page.getByRole('button', { name: '処理を中止', exact: true }).click();
    await idle();
    const cancelledPolling = await assertOnlyAllowedWrites('k 完了待ちで中止');
    assert.deepEqual(writeLabels(cancelledPolling), ['PUT /app/form/fields.json']);
    assert.equal(cancelledPolling.posts.length, 1, '依頼済みの 1 回だけ');
    assert.equal(cancelledPolling.downloads.length, 2, '本番のバックアップは依頼の前に保存済み');
    assert.equal(cancelledPolling.apps['202'].status, 'PROCESSING', 'kintone 側では処理が続いている');
    assert.equal(cancelledPolling.apps['202'].prodRevision, '10');
    assert.match(await resultItem('202').innerText(), /完了を確認できない[\s\S]*反映を依頼しましたが、完了を確認する前に中止しました。kintone 側で処理が続いている可能性があります/);
    assert.equal(await page.locator('.kus-lp__status').getAttribute('data-tone'), 'warn');
    assert.match(await statusText(), /^1 項目を反映先プレビューへ反映し、/);
    await shot('k-cancel-polling');
    ok('source engine: cancel while writing and while waiting for the deploy');
  }

  // =========================================================================
  // l. JSON で直した項目: 入力欄に JSON の値を出し（入力欄は無効）、JSON の修正を取り消すと入力欄の修正（なければ既定）に戻る
  // =========================================================================
  if (wanted('l')) {
    await reset(world());
    await extract();
    await selectNone('layoutSettings');
    await selectNone('viewSettings');
    await selectNone('fieldSettings');
    await rowCheck('fieldSettings:/properties/name/label').check();
    await rowCheck('fieldSettings:/properties/name/required').check();
    await toEdit();
    const label = editRow('fieldSettings', '/properties/name/label');
    const required = editRow('fieldSettings', '/properties/name/required');
    await label.locator('input').fill('お客様名');
    await editCard('fieldSettings').locator('[data-action="json-toggle"]').click();
    const area = editCard('fieldSettings').locator('[data-json-area] textarea');
    const body = JSON.parse(await area.inputValue());
    assert.equal(body.properties.name.label, 'お客様名', '送る設定の JSON には入力欄の修正が入っている');
    body.properties.name.label = 'JSONの表示名';
    body.properties.name.required = false;
    await area.fill(JSON.stringify(body, null, 2));
    await editCard('fieldSettings').locator('[data-action="json-apply"]').click();
    // 入力欄は JSON の値を表示し、使えない（JSON 優先）
    assert.equal(await label.locator('input').inputValue(), 'JSONの表示名', '入力欄に JSON の値を表示する');
    assert.equal(await label.locator('input').isDisabled(), true, 'JSON 優先の間は入力欄を使えない');
    assert.equal(await label.getAttribute('data-json-locked'), 'true');
    assert.equal(await label.getAttribute('data-changed'), 'true', '既定と違う値は強調する');
    assert.equal(await label.locator('[data-action="edit-reset"]').isHidden(), true, 'JSON 優先の間は「元に戻す」を出さない');
    assert.equal(await required.locator('input').isChecked(), false, '必須も JSON の値（いいえ）');
    assert.equal(await required.locator('input').isDisabled(), true);
    assert.match(await required.locator('.kus-ds-edit__default').innerText(), /^既定: はい$/, '「既定」は反映元の値のまま');
    await shot('l-json-locked');
    // JSON での修正を取り消すと、入力欄の修正（表示名はお客様名）と既定（必須ははい）に戻り、直せる
    await editCard('fieldSettings').locator('[data-action="json-cancel"]').click();
    assert.equal(await label.locator('input').inputValue(), 'お客様名', '入力欄の修正に戻る');
    assert.equal(await label.locator('input').isEnabled(), true);
    assert.equal(await label.getAttribute('data-json-locked'), 'false');
    assert.equal(await required.locator('input').isChecked(), true, '既定の値に戻る');
    assert.equal(await required.locator('input').isEnabled(), true);
    assert.equal(await required.getAttribute('data-changed'), 'false');
    // もう一度 JSON を適用して実行 → 送信内容は JSON のとおり
    await editCard('fieldSettings').locator('[data-action="json-toggle"]').click();
    const again = JSON.parse(await area.inputValue());
    again.properties.name.label = 'JSONの表示名';
    again.properties.name.required = false;
    await area.fill(JSON.stringify(again, null, 2));
    await editCard('fieldSettings').locator('[data-action="json-apply"]').click();
    assert.equal(await label.locator('input').inputValue(), 'JSONの表示名');
    await toConfirm();
    await run();
    const done = await assertOnlyAllowedWrites('l JSON の入力欄');
    assert.deepEqual(writeLabels(done), ['PUT /app/form/fields.json']);
    assert.equal(done.writes[0].body.properties.name.label, 'JSONの表示名');
    assert.equal(done.writes[0].body.properties.name.required, false);
    ok('source engine: JSON-edited items show the JSON values in locked inputs');
  }

  // =========================================================================
  // m. プラグインを 1 つずつ選ぶ（反映先に無い ID ごとの追加。反映先のプラグインを外す変更は出ない）
  // =========================================================================
  if (wanted('m')) {
    const sourceWithPlugins = sourceApp();
    sourceWithPlugins.production = { ...sourceWithPlugins.production, pluginSettings: { plugins: [{ id: 'plg-a' }, { id: 'plg-b' }, { id: 'plg-local' }] } };
    const targetWithPlugins = targetApp();
    targetWithPlugins.production = { ...targetWithPlugins.production, pluginSettings: { plugins: [{ id: 'plg-local' }, { id: 'plg-only-target' }] } };
    await reset({ apps: [sourceWithPlugins, targetWithPlugins] });
    await extract({ scopes: ['プラグイン(※)'], without: ['フィールド設定', 'レイアウト設定', 'ビュー設定'] });
    assert.match(await selectCount('pluginSettings').innerText(), /^選んだ変更 2\/2$/, '反映先に無いプラグインが 1 つずつ変更になる（反映先のプラグインを外す変更は無い）');
    assert.equal(await row('pluginSettings:/plugins/plg-a').count(), 1);
    assert.equal(await row('pluginSettings:/plugins/plg-b').count(), 1);
    assert.equal(await row('pluginSettings:/plugins/plg-local').count(), 0, '反映先にあるプラグインは変更にならない');
    assert.match(await row('pluginSettings:/plugins/plg-b').innerText(), /追加[\s\S]*plg-b/);
    await selectNone('pluginSettings');
    await rowCheck('pluginSettings:/plugins/plg-b').check();
    assert.match(await selectCount('pluginSettings').innerText(), /^選んだ変更 1\/2$/);
    await toEdit();
    await toConfirm();
    await run();
    const done = await assertOnlyAllowedWrites('m プラグイン');
    assert.deepEqual(writeLabels(done), ['POST /app/plugins.json'], '書き込みはプラグインの追加だけ');
    assert.deepEqual(done.writes[0].body.ids, ['plg-b'], '選んだプラグインだけを追加する');
    assert.deepEqual(done.apps['202'].production.pluginSettings.plugins.map(plugin => plugin.id), ['plg-local', 'plg-only-target', 'plg-b'], '反映先のプラグインは外れない');
    ok('source engine: plugins are selected one by one');
  }

  // =========================================================================
  // n. バックアップから戻す（結果画面のボタン）: 反映 → 戻す → 本番が反映前と同じ内容になる（追加したフィールドを除く）
  // =========================================================================
  /** 既定の選択（すべて）で反映し、結果画面にする。反映前の本番・プレビューを返す。 */
  async function reflectAll({ goalPreview = false } = {}) {
    await reset(world());
    const before = (await snapshot()).apps['202'];
    if (goalPreview) await page.getByRole('radio', { name: 'プレビューまで（本番へは反映しない）', exact: true }).check();
    await extract();
    await toEdit(); await toConfirm(); await run();
    const done = await assertOnlyAllowedWrites('反映');
    assert.ok(done.apps['202'].preview.fieldSettings.properties.memo, '備考（memo）を追加した');
    return { before, done };
  }
  const restoreButton = () => page.locator('[data-source-restore]');
  /** レイアウトは反映前のとおり。ただし、削除しない追加フィールド（備考）の配置は、kintone がすべてのフィールドの配置を求めるため末尾に残る。 */
  function assertLayoutRestored(actual, expected, name) {
    assert.deepEqual(actual.layout.slice(0, expected.layout.length), expected.layout, `${name}は反映前の配置に戻る`);
    assert.deepEqual(actual.layout.slice(expected.layout.length).flatMap(row => row.fields.map(field => field.code)), ['memo'], `${name}の末尾に残るのは、追加したフィールド（備考）だけ`);
  }
  const checkedScopes = () => page.locator('.kus-ds-scope-group input:checked').evaluateAll(list => list.map(node => node.getAttribute('aria-label')));
  const detailSummary = () => page.locator('.kus-dp-detail-summary').innerText();
  if (wanted('n')) {
    const { before, done: reflected } = await reflectAll();
    assert.equal(reflected.apps['202'].production.fieldSettings.properties.name.required, true, '本番へ反映した');
    assert.equal(reflected.downloads.length, 2);
    assert.equal(await restoreButton().isVisible(), true, '結果画面に「バックアップから戻す」');
    // 結果 JSON にはバックアップ本体（bundles）を含めない
    await button('結果JSONを保存').click();
    const savedJson = await page.evaluate(async () => { const list = window.__engine.downloads; return list[list.length - 1].blob.text(); });
    assert.doesNotMatch(savedJson, /"bundles"|"content"/, '結果JSONにバックアップ本体は含めない');
    assert.match(JSON.parse(savedJson).deploy.backup.fileName, /^本番反映前バックアップ_/);
    await shot('n-result');

    await restoreButton().click();
    // 段階 1: 反映元 = バックアップ、反映先 = そのアプリ、保持 OFF、参照先変換なし、目標 = 本番まで
    assert.equal(await tab('対象を選ぶ').getAttribute('aria-selected'), 'true', '段階 1 を表示する');
    assert.equal(await page.locator('select[data-source-kind]').inputValue(), 'json', '反映元は設定JSON（バックアップ）');
    assert.match(await page.locator('.kus-ds-endpoint:not(.kus-ds-endpoint--target) .kus-lp__small').innerText(), /設定JSONを読み込み済み（反映前のバックアップ（営業管理・[^）]*）[^）]*）: アプリ #202/);
    assert.equal(await page.getByLabel('反映先アプリID', { exact: true }).inputValue(), '202');
    assert.match(await detailSummary(), /^詳細設定: 反映先だけの一覧・グラフ・アクションを削除 \/ 参照先変換なし$/);
    assert.equal(await page.getByRole('radio', { name: '本番まで反映', exact: true }).isChecked(), true, '目標は本番まで');
    const scopes = await checkedScopes();
    for (const label of ['フィールド設定', 'レイアウト設定', 'ビュー設定']) assert.ok(scopes.includes(label), `項目: ${label}`);
    assert.ok(scopes.length >= 3, 'バックアップにある反映可能な項目');
    const notice = page.locator('[data-restore-notice="setup"]');
    assert.equal(await notice.isVisible(), true, '戻している間の表示');
    assert.match(await notice.innerText(), /バックアップから戻しています[\s\S]*反映で追加したフィールドは残ります。削除したフィールドの値は戻りません。/);
    assert.match(await page.locator('.kus-dp-dock-copy strong').innerText(), /^反映元 バックアップ → 反映先 #202 · 本番まで反映$/);
    assert.match(await statusText(), /^バックアップから戻す設定にしました（アプリ #202）。「差分を抽出する」で戻す内容を確認してください。まだ書き込んでいません。$/);
    await shot('n-restore-setup');

    await button('差分を抽出する').click();
    await idle();
    assert.equal(await tab('差分を選ぶ').getAttribute('aria-selected'), 'true', `差分を選ぶ段階: ${await statusText()}`);
    assert.equal(await page.locator('[data-restore-notice="select"]').isVisible(), true);
    const label = row('fieldSettings:/properties/name/label');
    assert.match(await label.innerText(), /変更[\s\S]*顧客名[\s\S]*取引先/, '表示名を反映前に戻す差分');
    assert.equal(await row('fieldSettings:/properties/memo').count(), 0, '反映で追加したフィールドは差分にならない（削除しない）');
    assert.match(await row('viewSettings:/views/メモ一覧').innerText(), /削除/, '反映で追加した一覧は外す（保持OFF）');
    await toEdit();
    assert.equal(await page.locator('[data-restore-notice="edit"]').isVisible(), true);
    await toConfirm();
    assert.equal(await page.locator('[data-restore-notice="confirm"]').isVisible(), true, '最終確認にも注意を出す');
    assert.match(await fact('route').innerText(), /反映前のバックアップ（営業管理・[^）]*） → 営業管理（#202）のプレビュー → 営業管理（#202）の本番/);
    await shot('n-restore-confirm');
    await run();
    const restored = await assertOnlyAllowedWrites('n 戻す');
    const restoreWrites = { ...restored, writes: restored.writes.slice(reflected.writes.length) };
    assert.equal(restoreWrites.writes.filter(write => write.method === 'POST').length, 0, '戻すときにフィールドを追加しない');
    assert.deepEqual(writeLabels(restoreWrites).filter(item => !/fields\.json|layout\.json|views\.json/.test(item)), [], '書き込みはフィールド・レイアウト・一覧だけ');
    assert.equal(restored.posts.length, 2, '本番への依頼は反映と戻しの 2 回');
    assert.equal(restored.downloads.length, 5, '戻す操作でも、反映前のプレビューと本番のバックアップを保存する（結果JSONの保存を含めて 5）');
    const prod = restored.apps['202'].production;
    const { memo, ...restFields } = prod.fieldSettings.properties;
    assert.ok(memo, '追加したフィールド（備考）は残る');
    assert.deepEqual({ properties: restFields }, before.production.fieldSettings, 'フィールド設定は反映前に戻る（追加したフィールドを除く）');
    assertLayoutRestored(prod.layoutSettings, before.production.layoutSettings, 'レイアウト');
    assert.deepEqual(prod.viewSettings, before.production.viewSettings, '一覧は反映前に戻る（追加した一覧は外れる）');
    for (const key of Object.keys(before.production).filter(item => !['fieldSettings', 'layoutSettings', 'viewSettings'].includes(item))) assert.deepEqual(prod[key], before.production[key], `${key} は変わらない`);
    assert.equal(restored.apps['202'].prodRevision, restored.apps['202'].previewRevision, '本番とプレビューの revision が一致する');
    assert.equal(restoreWrites.writes.length, 2, '差分のあるフィールド設定と一覧だけを書き込む（レイアウトは反映先に残る備考を保持するため差分なし）');
    assert.match(await statusText(), /^2 項目を反映先プレビューへ反映し、1 アプリを本番へ反映しました。$/);
    assert.equal(await restoreButton().isVisible(), true, '続けて戻すこともできる');
    await shot('n-restored');
    ok('source engine: restore from backup returns production to the state before the reflection');
  }

  // =========================================================================
  // o. 設定JSONから取得で、本番反映が保存したバックアップファイルを読み込む（アプリを選ぶと反映先も合わせる。変えると戻す状態を終える）
  // =========================================================================
  if (wanted('o')) {
    const { before } = await reflectAll();
    const backupText = await page.evaluate(async () => window.__engine.downloads[1].blob.text());
    const backup = JSON.parse(backupText);
    assert.equal(backup.kind, 'kintone-deploy-backup');
    const fileInput = () => page.locator('input[type="file"][aria-label="反映元の設定JSON"]');
    const load = async text => { await fileInput().setInputFiles({ name: '本番反映前バックアップ.json', mimeType: 'application/json', buffer: Buffer.from(text, 'utf8') }); await idle(); };
    await tab('対象を選ぶ').click();
    // 戻す前の入力（反映元はアプリ #101 の本番設定、保持 ON）
    await page.getByLabel('反映元アプリID', { exact: true }).fill('101');
    await page.getByLabel('反映先アプリID', { exact: true }).fill('999');
    assert.match(await detailSummary(), /反映先だけの一覧・グラフ・アクションを保持/);
    await page.locator('select[data-source-kind]').selectOption('json');
    // 2 アプリ分のバックアップ（2 つ目は別のアプリ #303 を装う）
    const twoApps = { ...backup, bundles: [backup.bundles[0], { ...backup.bundles[0], appId: '303' }] };
    await load(JSON.stringify(twoApps));
    assert.match(await statusText(), /^本番反映のバックアップを読み込みました（アプリ #202）。バックアップから戻す設定にしました。/);
    assert.equal(await page.locator('[data-restore-notice="setup"]').isVisible(), true);
    assert.equal(await page.getByLabel('反映先アプリID', { exact: true }).inputValue(), '202', '反映先をバックアップのアプリに合わせる');
    assert.match(await detailSummary(), /反映先だけの一覧・グラフ・アクションを削除 \/ 参照先変換なし/, '保持はOFF');
    assert.equal(await page.getByRole('radio', { name: '本番まで反映', exact: true }).isChecked(), true);
    const appSelect = page.locator('select[aria-label="設定JSON内の反映元アプリ"]');
    assert.equal(await appSelect.isVisible(), true, '複数アプリのバックアップはアプリを選べる');
    await appSelect.selectOption({ index: 1 });
    assert.equal(await page.getByLabel('反映先アプリID', { exact: true }).inputValue(), '303', 'アプリを選ぶと反映先も合わせる');
    assert.equal(await page.locator('[data-restore-notice="setup"]').isVisible(), true, 'アプリを選び直しても戻す状態のまま');
    await appSelect.selectOption({ index: 0 });
    assert.equal(await page.getByLabel('反映先アプリID', { exact: true }).inputValue(), '202');
    // 反映先を変えると、戻す状態を終える（戻す前の入力に戻る）
    await page.getByLabel('反映先アプリID', { exact: true }).fill('999');
    assert.equal(await page.locator('[data-restore-notice="setup"]').isHidden(), true, '反映先を変えると戻す表示を外す');
    assert.match(await statusText(), /^バックアップから戻す設定を終了しました。反映元・保持・参照先変換・項目・目標のうち、変えていないものを戻す前の値に戻しました。$/);
    // 戻す前は「設定JSONから取得」を選んだだけでファイルは未読込だった。そのとおりに戻る。
    assert.equal(await page.locator('select[data-source-kind]').inputValue(), 'json');
    assert.match(await dockText(), /次に進むには：反映元の設定JSONを読み込んでください。/, '読み込んだバックアップは外れる');
    await page.locator('select[data-source-kind]').selectOption('production');
    assert.equal(await page.getByLabel('反映元アプリID', { exact: true }).inputValue(), '101', '反映元のアプリIDを戻す前の入力に戻す');
    assert.match(await detailSummary(), /反映先だけの一覧・グラフ・アクションを保持/, '保持を戻す前の値（ON）に戻す');
    assert.equal(await page.getByLabel('反映先アプリID', { exact: true }).inputValue(), '999', '利用者が入力した反映先は変えない');
    // もう一度読み込み、保持をONにしても終える
    await page.locator('select[data-source-kind]').selectOption('json');
    await load(backupText);
    assert.equal(await page.locator('[data-restore-notice="setup"]').isVisible(), true);
    await page.getByRole('button', { name: '詳細設定…', exact: true }).click();
    await page.getByRole('checkbox', { name: '反映先だけの一覧・グラフ・アクションを保持する', exact: true }).check();
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('[data-restore-notice="setup"]').isHidden(), true, '保持をONにすると戻す状態を終える');
    // 読み込み直して、そのまま戻す
    await page.locator('select[data-source-kind]').selectOption('json');
    await load(backupText);
    await button('差分を抽出する').click();
    await idle();
    assert.equal(await tab('差分を選ぶ').getAttribute('aria-selected'), 'true', `差分を選ぶ段階: ${await statusText()}`);
    await toEdit(); await toConfirm(); await run();
    const restored = await assertOnlyAllowedWrites('o ファイルから戻す');
    const prod = restored.apps['202'].production;
    assertLayoutRestored(prod.layoutSettings, before.production.layoutSettings, 'レイアウト');
    assert.deepEqual(prod.viewSettings, before.production.viewSettings);
    assert.equal(prod.fieldSettings.properties.name.label, '取引先', 'ファイルからでも戻せる');
    assert.equal(prod.fieldSettings.properties.name.required, false);
    ok('source engine: load a deploy backup file as the restore source');
  }

  // =========================================================================
  // p. プレビューまで反映した結果からも戻せる（反映前のプレビューのバックアップ。目標はプレビューまで）
  // =========================================================================
  if (wanted('p')) {
    const { before, done: reflected } = await reflectAll({ goalPreview: true });
    assert.equal(reflected.apps['202'].prodRevision, '10', '本番へは反映していない');
    assert.equal(reflected.posts.length, 0);
    await restoreButton().click();
    assert.equal(await page.getByRole('radio', { name: 'プレビューまで（本番へは反映しない）', exact: true }).isChecked(), true, '反映前のプレビューを戻すときの目標はプレビューまで');
    await button('差分を抽出する').click();
    await idle();
    await toEdit(); await toConfirm();
    assert.match(await fact('route').innerText(), /（本番へは反映しません）/);
    await run();
    const restored = await assertOnlyAllowedWrites('p プレビューを戻す');
    assert.equal(restored.posts.length, 0, '本番へは反映しない');
    const preview = restored.apps['202'].preview;
    assertLayoutRestored(preview.layoutSettings, before.preview.layoutSettings, 'レイアウト');
    assert.deepEqual(preview.viewSettings, before.preview.viewSettings);
    assert.equal(restored.apps['202'].prodRevision, '10');
    ok('source engine: restore a preview-only reflection');
  }

  // =========================================================================
  // q. 選んだ変更と修正の保存 → ページを読み込み直す → 抽出 → 読み込み（承認を待つ間や別の担当者への受け渡し）
  // =========================================================================
  if (wanted('q')) {
    const lastDownload = () => page.evaluate(async () => {
      const list = window.__engine.downloads, item = list[list.length - 1];
      return item ? { name: item.name, text: await item.blob.text(), count: list.length } : null;
    });
    const stageFile = stage => page.locator(`#kus-ds-stage-${stage} [data-selection-file]`);
    const loadFile = (stage, content, name = '選択と修正.json') => stageFile(stage).setInputFiles({ name, mimeType: 'application/json', buffer: Buffer.isBuffer(content) ? content : Buffer.from(content) });
    const fileNote = stage => page.locator(`[data-selection-file-note="${stage}"]`);
    const noWrites = async where => assert.deepEqual((await assertOnlyAllowedWrites(where)).writes, [], `${where}: 書き込みなし`);
    const chooseOnly = async (...ids) => {
      for (const key of ['layoutSettings', 'viewSettings', 'fieldSettings']) await selectNone(key);
      for (const id of ids) await rowCheck(id).check();
    };
    const sourceWithoutMemo = () => sourceApp({
      production: stripUndefined({
        fieldSettings: props(text('name', '顧客名', { required: true, unique: true })),
        layoutSettings: { layout: [rowOf('name')] },
        viewSettings: { views: { '全件': list('全件', 0, ['name'], 'name != ""', '更新日時 desc') } }
      })
    });

    // --- 保存（段階 3）→ 読み込み直し → 抽出 → 読み込み（段階 2）で、選択と入力欄の修正が戻る
    await reset(world());
    await extract();
    assert.equal(await page.locator('#kus-ds-stage-select').getByRole('button', { name: '選択と修正を保存', exact: true }).isEnabled(), true, '抽出後は保存できる');
    await chooseOnly('fieldSettings:/properties/name/label', 'fieldSettings:/properties/name/required');
    await toEdit();
    await editRow('fieldSettings', '/properties/name/label').locator('input').fill('お客様名');
    await button('選択と修正を保存').click();
    const saved = await lastDownload();
    assert.match(saved.name, /^選択と修正_反映元-営業管理（開発）\(app101\)_反映先-営業管理\(app202\)_.+\.json$/, 'ファイル名に反映元・反映先・日時が入る');
    assert.match(await statusText(), /^選択と修正を保存しました（選んだ変更 2 件・入力欄の修正 1 件）。JS\/CSS の本文は含みません。/);
    const file = JSON.parse(saved.text);
    assert.equal(file.kind, 'kintone-source-deploy-selection');
    assert.equal(file.version, 1);
    assert.deepEqual(file.source, { appId: '101', guestId: '', name: '営業管理（開発）', environment: 'production' });
    assert.deepEqual(file.target, { appId: '202', guestId: '', name: '営業管理' });
    assert.deepEqual(file.scopes, ['fieldSettings', 'layoutSettings', 'viewSettings']);
    assert.equal(file.goal, 'production');
    const savedFields = file.sections.find(section => section.sectionKey === 'fieldSettings');
    assert.deepEqual(savedFields.selected, ['fieldSettings:/properties/name/label', 'fieldSettings:/properties/name/required']);
    assert.deepEqual(savedFields.overrides, [{ pointer: '/properties/name/label', value: 'お客様名' }]);
    assert.doesNotMatch(saved.text, /_content|fileKey|bundles/, '機微な内容を含めない');
    await noWrites('q 保存');

    // ページの読み込み直し（reset で別のページになる）→ 抽出 → 読み込み
    await reset(world());
    await extract();
    assert.equal(await selectCount('fieldSettings').innerText(), '選んだ変更 4/4', '読み込み前は既定どおりすべて選ぶ');
    const [chooser] = await Promise.all([page.waitForEvent('filechooser'), button('選択と修正を読み込む').click()]);
    await chooser.setFiles({ name: saved.name, mimeType: 'application/json', buffer: Buffer.from(saved.text) });
    await idle();
    assert.equal(await selectCount('fieldSettings').innerText(), '選んだ変更 2/4', '選択が戻る');
    assert.equal(await selectCount('layoutSettings').innerText(), '選んだ変更 0/1');
    assert.equal(await rowCheck('fieldSettings:/properties/name/label').isChecked(), true);
    assert.equal(await rowCheck('fieldSettings:/properties/name/unique').isChecked(), false);
    assert.equal(await fileNote('select').getAttribute('class'), 'kus-ds-note kus-ds-note--ok');
    assert.match(await fileNote('select').innerText(), /^選択と修正を読み込みました（保存した日時: .+）。当てはめたもの: 選択 2 件・入力欄の修正 1 件。最終確認は、あらためて必要です。$/);
    assert.match(await statusText(), /^選択と修正を読み込みました/);
    assert.equal(await page.locator('.kus-lp__status').getAttribute('data-tone'), 'ok');
    await shot('q-loaded');
    // キーボードだけで読み込める（ボタンへ focus して Enter でファイルの選択が開く）。320〜1440px で横にはみ出さない
    // ファイル選択の横取りは、filechooser の待ち受けを登録してから有効になるまでに間がある。登録と同時に Enter を送ると、
    // 有効になる前にキーが届いてイベントが来ないことがある（クリックは前処理の分だけ遅いので起きない）。待ち受けを先に登録しておく。
    const keepChooserIntercepted = () => {};
    page.on('filechooser', keepChooserIntercepted);
    try {
      await button('選択と修正を読み込む').click({ trial: true });
      await button('選択と修正を読み込む').focus();
      assert.equal(await button('選択と修正を読み込む').evaluate(el => document.activeElement === el), true, '「選択と修正を読み込む」へフォーカスを移せる');
      const [keyboardChooser] = await Promise.all([page.waitForEvent('filechooser'), page.keyboard.press('Enter')]);
      await keyboardChooser.setFiles({ name: saved.name, mimeType: 'application/json', buffer: Buffer.from(saved.text) });
    } finally {
      page.off('filechooser', keepChooserIntercepted);
    }
    await idle();
    assert.match(await fileNote('select').innerText(), /当てはめたもの: 選択 2 件・入力欄の修正 1 件/);
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      const overflow = await page.evaluate(() => { const canvas = document.querySelector('.kus-dp-canvas'); return canvas.scrollWidth - canvas.clientWidth; });
      assert.ok(overflow <= 1, `${width}px: 選択と修正の保存・読み込みが横にはみ出す（${overflow}px）`);
      if (width === 320) await shot('q-loaded-320');
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    await toEdit();
    assert.equal(await editRow('fieldSettings', '/properties/name/label').locator('input').inputValue(), 'お客様名', '入力欄の修正が戻る');
    assert.match(await fileNote('edit').innerText(), /当てはめたもの: 選択 2 件・入力欄の修正 1 件/, '段階 3 にも結果を示す');
    // 読み込みで確認が済んだことにはならない: 最終確認のチェックと反映先ID の入力が必要
    await toConfirm();
    assert.equal(await ackBox().isChecked(), false);
    assert.equal(await runButton().isDisabled(), true, '読み込んだだけでは実行できない');
    await arm();
    // 確認を済ませたあとで段階 3 へ戻って読み込み直すと、確認はやり直しになる
    await button('内容の修正に戻る').click();
    await loadFile('edit', saved.text);
    await idle();
    await toConfirm();
    assert.equal(await ackBox().isChecked(), false, '読み込み後は確認のチェックがやり直し');
    assert.equal(await idBox().inputValue(), '', '反映先ID の入力もやり直し');
    assert.equal(await runButton().isDisabled(), true);
    await run('202');
    const done = await assertOnlyAllowedWrites('q 読み込んで実行');
    assert.deepEqual(writeLabels(done), ['PUT /app/form/fields.json'], '選んだ変更がある項目だけ書き込む');
    assert.equal(done.writes[0].body.properties.name.label, 'お客様名');
    assert.equal(done.writes[0].body.properties.name.required, true);
    assert.equal(done.writes[0].body.properties.name.unique, false, '外した重複禁止は反映先のまま');

    // --- 別のアプリのファイルは読み込まない（現在の選択と修正は変えない）
    const withOther = { apps: [sourceApp(), targetApp(), { ...targetApp(), id: '203', name: '営業管理B' }] };
    await reset(world(withOther));
    await extract({ target: '203' });
    await loadFile('select', saved.text);
    await idle();
    assert.equal(await selectCount('fieldSettings').innerText(), '選んだ変更 4/4', '選択は変わらない');
    assert.equal(await fileNote('select').getAttribute('class'), 'kus-ds-note kus-ds-note--warn');
    assert.match(await fileNote('select').innerText(), /^このファイルは、いまの反映元・反映先のものではないため読み込めません。反映先のアプリが違います（保存時: 営業管理（#202）、現在: 営業管理B（#203））。 現在の選択と修正は変えていません。$/);
    assert.equal(await page.locator('.kus-lp__status').getAttribute('data-tone'), 'warn');
    await shot('q-other-app');
    // 壊れたファイル・別種の JSON・大きすぎるファイルも、理由を示して拒否する
    const rejects = [
      ['壊れた JSON', '{ not json', /JSON として読み込めませんでした/],
      ['別種の JSON', JSON.stringify({ kind: 'kintone-deploy-backup', version: 1, bundles: [] }), /選択と修正のファイルではありません（種類: kintone-deploy-backup）/],
      ['新しすぎる版', JSON.stringify({ ...file, version: 2 }), /版（2）は読み込めません/],
      ['必須の項目が無い', JSON.stringify({ ...file, source: undefined }), /ファイルの内容が壊れています（反映元の情報がありません）/],
      ['大きすぎるファイル', Buffer.alloc(21 * 1024 * 1024, 32), /ファイルが大きすぎるため読み込めません（21\.0 MB。上限は 20\.0 MB）/]
    ];
    for (const [name, content, pattern] of rejects) {
      await loadFile('select', content);
      await idle();
      assert.match(await fileNote('select').innerText(), pattern, `${name}: 理由を示す`);
      assert.match(await fileNote('select').innerText(), /現在の選択と修正は変えていません。$/, `${name}: 現在の状態を変えない`);
      assert.equal(await selectCount('fieldSettings').innerText(), '選んだ変更 4/4', `${name}: 選択は変わらない`);
    }
    await noWrites('q 拒否');

    // --- 現在の差分に無い選択・修正は、当てはまらなかった件数として示す
    await reset(world());
    await extract();
    await toEdit();
    await editRow('fieldSettings', '/properties/memo/label').locator('input').fill('備考（修正）');
    await button('選択と修正を保存').click();
    const withMemo = await lastDownload();
    await reset(world({ apps: [sourceWithoutMemo(), targetApp()] }));
    await extract();
    await loadFile('select', withMemo.text);
    await idle();
    assert.equal(await fileNote('select').getAttribute('class'), 'kus-ds-note kus-ds-note--warn');
    assert.match(await fileNote('select').innerText(), /当てはまらなかったもの: 選択 4 件・入力欄の修正 1 件（現在の差分に無いため）。選び直してください。/);
    assert.equal(await page.locator('.kus-lp__status').getAttribute('data-tone'), 'warn');
    assert.equal(await rowCheck('fieldSettings:/properties/name/label').isChecked(), true, '当てはまった選択は戻る');
    await shot('q-lost');

    // --- JSON での修正は、反映先の設定が保存時と同じときだけ当てはめる
    await reset(world());
    await extract();
    await chooseOnly('viewSettings:/views/全件/filterCond');
    await toEdit();
    await editCard('viewSettings').locator('[data-action="json-toggle"]').click();
    const area = editCard('viewSettings').locator('[data-json-area] textarea');
    const initial = JSON.parse(await area.inputValue());
    const edited = { views: { '全件': { ...initial.views['全件'], filterCond: 'name like "山" and name != ""' } } };
    await area.fill(JSON.stringify(edited, null, 2));
    await editCard('viewSettings').locator('[data-action="json-apply"]').click();
    await button('選択と修正を保存').click();
    const withJson = await lastDownload();
    assert.match(await statusText(), /^選択と修正を保存しました（選んだ変更 1 件・入力欄の修正 0 件・JSON での修正 1 項目）/);
    assert.deepEqual(JSON.parse(withJson.text).sections.find(section => section.sectionKey === 'viewSettings').json.value, edited);
    // 反映先が同じ → 当てはめる
    await reset(world());
    await extract();
    await loadFile('select', withJson.text);
    await idle();
    assert.match(await fileNote('select').innerText(), /JSON での修正 1 項目/);
    assert.match(await fileNote('select').innerText(), /JSON での修正は、反映先の設定が保存時と同じだったため当てはめました。/);
    assert.equal(await page.locator('#kus-ds-stage-select [data-json-active="viewSettings"]').isVisible(), true, 'JSON で修正中の表示');
    await toEdit(); await toConfirm(); await run();
    const jsonDone = await assertOnlyAllowedWrites('q JSON');
    assert.deepEqual(jsonDone.writes[0].body.views, edited.views, '送信内容は JSON のとおり');
    // 反映先の一覧が保存時から変わっている → 当てはめない
    const changedTarget = targetApp();
    changedTarget.production = { ...changedTarget.production, viewSettings: { views: { '全件': list('全件', 0, ['name'], '', ''), '後から追加': list('後から追加', 1, ['name']) } } };
    await reset(world({ apps: [sourceApp(), changedTarget] }));
    await extract();
    await loadFile('select', withJson.text);
    await idle();
    assert.match(await fileNote('select').innerText(), /JSON での修正（ビュー設定）は、反映先の設定が保存時から変わった（または現在の差分に無い）ため当てはめていません。JSON で直し直してください。/);
    assert.equal(await fileNote('select').getAttribute('class'), 'kus-ds-note kus-ds-note--warn');
    assert.equal(await page.locator('#kus-ds-stage-select [data-json-active="viewSettings"]').isHidden(), true, 'JSON は当てはめない');
    await noWrites('q JSON 反映先が変わった');
    ok('source engine: save and load the selection and edits as a file');
  }

  // =========================================================================
  // r. 反映後の内容を確認する（読み取りだけ。選んだ変更が意図した値で入っているか。選ばなかった変更は問題に数えない）
  // =========================================================================
  if (wanted('r')) {
    const lastDownload = () => page.evaluate(async () => {
      const list = window.__engine.downloads, item = list[list.length - 1];
      return item ? { name: item.name, text: await item.blob.text(), count: list.length } : null;
    });
    const verifyButton = () => page.getByRole('button', { name: /^反映後の内容を確認(する|し直す)$/ });
    const verifyResult = () => page.locator('[data-verify-result]');
    const lastSeq = async () => { const calls = (await snapshot()).calls; return calls[calls.length - 1].seq; };
    const callsAfter = async seq => (await snapshot()).calls.filter(call => call.seq > seq);
    const chooseOnly = async (...ids) => {
      for (const key of ['layoutSettings', 'viewSettings', 'fieldSettings']) await selectNone(key);
      for (const id of ids) await rowCheck(id).check();
    };
    /** 表示名と必須を選び、表示名を入力欄で直して実行する。 */
    const reflectLabelAndRequired = async () => {
      await extract();
      await chooseOnly('fieldSettings:/properties/name/label', 'fieldSettings:/properties/name/required');
      await toEdit();
      await editRow('fieldSettings', '/properties/name/label').locator('input').fill('お客様名');
      await toConfirm();
      await run();
    };

    // --- 選んだ変更がすべて反映されている（修正した値を含む）
    await reset(world());
    await reflectLabelAndRequired();
    const reflected = await assertOnlyAllowedWrites('r 反映');
    assert.equal(reflected.apps['202'].production.fieldSettings.properties.name.label, 'お客様名');
    assert.deepEqual(reflected.apps['202'].production.layoutSettings, { layout: [rowOf('name')] }, '選ばなかったレイアウトは反映先のまま');
    assert.equal(await verifyButton().isVisible(), true, '本番まで反映が成功した結果に出す');
    assert.match(await page.locator('.kus-ds-verify__intro').innerText(), /^本番の設定を読み取り、選んだ 2 件の変更が、選んだ値（修正した値を含む）で入っているか確かめます。読み取りだけで、書き込みません。選ばなかった変更は確認しません。$/);
    assert.equal(await verifyResult().count(), 0, '確認するまで結果は出さない');
    const seq = await lastSeq();
    await verifyButton().click();
    await idle();
    const reads = await callsAfter(seq);
    assert.deepEqual(reads.map(call => `${call.method} ${call.url}`), ['GET /k/v1/app/form/fields.json'], '本番の、選んだ項目だけを読み取る（書き込みなし）');
    assert.equal(await verifyResult().getAttribute('data-verify-result'), 'all');
    assert.match(await verifyResult().innerText(), /^✓ 選んだ 2 件はすべて反映されています（本番の設定を確認しました。修正した値 1 件も、その値になっています）。\n確認した日時: .+$/);
    assert.equal(await statusText(), '選んだ 2 件はすべて反映されています（本番の設定を確認しました。修正した値 1 件も、その値になっています）。');
    assert.equal(await page.locator('.kus-lp__status').getAttribute('data-tone'), 'ok');
    assert.equal(await verifyButton().innerText(), '反映後の内容を確認し直す');
    await shot('r-verified');
    await assertOnlyAllowedWrites('r 確認');
    // 記録の Markdown と結果 JSON に、確認した日時と結果を残す
    await button('記録をMarkdownで保存').click();
    const record = await lastDownload();
    assert.match(record.text, /## 反映後の内容の確認\r?\n\r?\n- 確認した日時: .+\r?\n- 確認した設定: 本番\r?\n- 結果: 選んだ 2 件はすべて反映されています/);
    assert.match(record.text, /件数: 選んだ変更 2・意図した値で反映 2・反映されていない 0・確認できない 0（修正した値 1 件のうち 1 件が反映）/);
    assert.match(record.text, /選ばなかった変更が反映先に残っているのは正常なため、確認の対象にしていません。/);
    await button('結果JSONを保存').click();
    const resultJson = JSON.parse((await lastDownload()).text);
    assert.equal(resultJson.verification.state, 'all');
    assert.equal(resultJson.verification.side, 'production');
    assert.equal(resultJson.verification.total, 2);
    assert.equal(resultJson.verification.reflected, 2);
    assert.match(resultJson.verification.checkedAt, /^\d{4}-\d{2}-\d{2}T/);

    // --- 確認する前の記録には「確認していません」と残す
    await reset(world());
    await reflectLabelAndRequired();
    await button('記録をMarkdownで保存').click();
    assert.match((await lastDownload()).text, /## 反映後の内容の確認\r?\n\r?\n- 確認していません/);
    await button('結果JSONを保存').click();
    assert.equal(JSON.parse((await lastDownload()).text).verification, undefined);

    // --- 合成 kintone が一部の値（必須）を受け取らない → 反映されていない変更として、場所・期待した値・現在の値を示す
    await reset(world({ discardFieldKeys: ['required'] }));
    await reflectLabelAndRequired();
    assert.match(await statusText(), /^1 項目を反映先プレビューへ反映し、1 アプリを本番へ反映しました。$/, '書き込み自体は成功したように見える');
    await verifyButton().click();
    await idle();
    assert.equal(await verifyResult().getAttribute('data-verify-result'), 'mismatch');
    assert.match(await verifyResult().innerText(), /^! 反映されていない変更 1 件（選んだ 2 件中。本番の設定を確認しました）。/);
    assert.equal(await page.locator('.kus-lp__status').getAttribute('data-tone'), 'err');
    const mismatchList = page.locator('[data-verify-list="mismatch"]');
    assert.match(await mismatchList.innerText(), /反映されていない変更（1 件）/);
    assert.match(await mismatchList.innerText(), /フィールド設定 \/ .*name.* \/ .*必須.*: 期待した値 はい、現在の値 いいえ/);
    assert.doesNotMatch(await mismatchList.innerText(), /お客様名/, '反映された修正した値は、反映されていない変更に含めない');
    await shot('r-mismatch');
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      const overflow = await page.evaluate(() => { const canvas = document.querySelector('.kus-dp-canvas'); return canvas.scrollWidth - canvas.clientWidth; });
      assert.ok(overflow <= 1, `${width}px: 反映後の内容の確認が横にはみ出す（${overflow}px）`);
      if (width === 320) await shot('r-mismatch-320');
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    await button('記録をMarkdownで保存').click();
    const mismatchRecord = (await lastDownload()).text;
    assert.match(mismatchRecord, /### 反映されていない変更\r?\n\r?\n\| 場所 \| 期待した値 \| 現在の値 \|/);
    assert.match(mismatchRecord, /\| フィールド設定 \/ .*必須.* \| はい \| いいえ \|/);
    await button('結果JSONを保存').click();
    const mismatchJson = JSON.parse((await lastDownload()).text).verification;
    assert.equal(mismatchJson.state, 'mismatch');
    assert.equal(mismatchJson.mismatches.length, 1);
    assert.deepEqual([mismatchJson.mismatches[0].expectedText, mismatchJson.mismatches[0].currentText], ['はい', 'いいえ']);
    await assertOnlyAllowedWrites('r 反映されていない');

    // --- 設定を取得できない → 「確認できません」（「反映されています」とは言わない）
    await reset(world());
    await reflectLabelAndRequired();
    await page.evaluate(() => { window.__engine.failGets = ['/app/form/fields.json']; });
    await verifyButton().click();
    await idle();
    assert.equal(await verifyResult().getAttribute('data-verify-result'), 'unknown');
    assert.match(await verifyResult().innerText(), /^ⓘ 確認できません。選んだ 2 件のうち 2 件の内容を確認できませんでした（確認できた 0 件は反映されています）。/);
    assert.doesNotMatch(await verifyResult().innerText(), /すべて反映されています/);
    assert.match(await page.locator('[data-verify-list="unknown"]').innerText(), /確認できなかった変更（1 件）[\s\S]*フィールド設定: 2 件（権限がありません。）/);
    assert.equal(await page.locator('.kus-lp__status').getAttribute('data-tone'), 'warn');
    await shot('r-unknown');
    // 取得できるようになったら、確認し直せる
    await page.evaluate(() => { window.__engine.failGets = []; });
    await verifyButton().click();
    await idle();
    assert.equal(await verifyResult().getAttribute('data-verify-result'), 'all');

    // --- 目標がプレビューまでのときは、反映先のプレビューを読み取る
    await reset(world());
    await page.getByRole('radio', { name: 'プレビューまで（本番へは反映しない）', exact: true }).check();
    await reflectLabelAndRequired();
    const previewSeq = await lastSeq();
    await verifyButton().click();
    await idle();
    assert.deepEqual((await callsAfter(previewSeq)).map(call => `${call.method} ${call.url}`), ['GET /k/v1/preview/app/form/fields.json']);
    assert.match(await verifyResult().innerText(), /^✓ 選んだ 2 件はすべて反映されています（反映先のプレビューの設定を確認しました。/);

    // --- 本番へ反映できなかった結果（FAIL）には出さない
    await reset(world({ failApps: ['202'] }));
    await reflectLabelAndRequired();
    assert.equal(await verifyButton().count(), 0, '本番へ反映できなかった結果には出さない');
    ok('source engine: verify the reflected content after the run');
  }

  return checks;
};
