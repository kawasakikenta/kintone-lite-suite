'use strict';

// フィールド追加（tools/フィールド追加.js）の通し検証のシナリオ。field-jsconfig-explore.cjs から読み込まれる。
const assert = require('node:assert/strict');

module.exports = function (scenario, c) {
  const { page, button, radio, label, idle, statusText, statusTone, panelText, stage, shot, snapshot, appState, reset, assertNoViolations, noOverflow, chooseAction, toSetup, dialogs, finding, ok, world } = c;
  const fieldBox = () => page.getByRole('textbox', { name: '反映するフィールド定義JSON', exact: true });
  const lookupBox = () => page.getByRole('textbox', { name: '参照アプリID変換JSON', exact: true });
  const openAdvanced = async () => { await button('詳細設定…').click(); assert.equal(await page.locator('dialog[open]').count(), 1); };
  const closeAdvanced = async () => { await page.getByRole('button', { name: '詳細設定を閉じる', exact: true }).click(); };
  const codesOf = fields => Object.keys(fields).filter(code => !['record_no', 'creator', 'created', 'modifier', 'updated'].includes(code));
  const allCodes = fields => { const out = []; for (const [code, def] of Object.entries(fields)) { out.push(code); if (def.type === 'SUBTABLE') out.push(...Object.keys(def.fields)); } return out; };
  const fieldsOf = (snap, id, guest = '') => appState(snap, id, guest).preview.fields;

  /** 「反映元からフィールドを選んでマージ」で、反映元 #src のフィールドを選んで JSON に入れる。 */
  async function pickFromSource(src, codes, { guest = '' } = {}) {
    await toSetup();
    await label('反映元アプリID').fill(src);
    await label('反映元ゲストスペースID').fill(guest);
    await openAdvanced();
    await button('反映元フィールド一覧を取得').click();
    await page.getByRole('checkbox', { name: new RegExp(`^${codes[0]}( |$)`) }).waitFor({ timeout: 20000 });
    for (const code of codes) await page.getByRole('checkbox', { name: new RegExp(`^${code}( |$)`) }).check();
    await button('選択したフィールドを JSON に挿入（マージ）').click();
    await closeAdvanced();
  }
  async function fieldApply(target, { guest = '', overwrite = false, lookupMap = '' } = {}) {
    await toSetup();
    await chooseAction('反映先プレビューへ反映');
    await label('反映先アプリID').fill(target);
    await label('反映先ゲストスペースID').fill(guest);
    await openAdvanced();
    const box = page.getByRole('checkbox', { name: '既存フィールドを上書き更新', exact: true });
    if (overwrite) await box.check(); else await box.uncheck();
    await lookupBox().fill(lookupMap);
    await closeAdvanced();
    await button('内容を確認する').click();
  }
  const fieldRun = async () => { await button('反映先プレビューへ反映').click(); await idle(); };
  const tableRows = () => page.locator('.kus-lp__apptable tbody tr');
  async function fieldMulti(targets, opts = {}) {
    await toSetup();
    await chooseAction('複数の反映先プレビューへ反映');
    const first = page.locator('.kus-lp__apptable input[aria-label="アプリID"]:visible').first();
    await first.fill(targets.map(item => (typeof item === 'string' ? item : item.app)).join(','));
    await first.dispatchEvent('change');
    for (const [index, item] of targets.entries()) {
      if (typeof item === 'object' && item.guest) await tableRows().nth(index).locator('input[aria-label="ゲストスペースID"]').fill(item.guest);
    }
    await openAdvanced();
    const box = page.getByRole('checkbox', { name: '既存フィールドを上書き更新', exact: true });
    if (opts.overwrite) await box.check(); else await box.uncheck();
    await lookupBox().fill(opts.lookupMap || '');
    await closeAdvanced();
    await button('内容を確認する').click();
  }
  const fieldRunMulti = async () => { await button('複数の反映先プレビューへ反映').click(); await idle(); };

  scenario('フィールド追加: 比較元から選んで追加（ルックアップの参照先変換・テーブル・関連レコード一覧・計算を含む）', async () => {
    await reset('field');
    // 反映先 #202 には「顧客名」「金額」しかない。計算の参照先・コピー先・テーブルの中も合わせて選ぶ。
    await pickFromSource('101', ['cust_name', 'cust_tel', 'customer_code', 'tax_rate', 'shipping', 'total', 'items', 'rel', 'priority', 'tags']);
    const json = JSON.parse(await fieldBox().inputValue());
    assert.deepEqual(Object.keys(json.properties).sort(), ['cust_name', 'cust_tel', 'customer_code', 'items', 'priority', 'rel', 'shipping', 'tags', 'tax_rate', 'total']);
    ok('反映元から選んだフィールドが JSON に入る');
    await fieldApply('202', { lookupMap: '{"301":"302"}' });
    const review = await stage(1).innerText();
    assert.match(review, /フィールド[\s\S]*10 件/);
    assert.match(review, /参照先変換[\s\S]*301/);
    await shot('field-pick-review');
    await fieldRun();
    const text = dialogs[0];
    assert.match(text, /追加 10件 \/ 更新 0件 \/ スキップ 0件 \/ 参照先AppID変換 3件/);
    const snap = await assertNoViolations('フィールド 比較元から追加', { allowedWrites: ['/202'] });
    assert.equal(snap.writes.length, 1);
    assert.equal(snap.writes[0].method, 'POST');
    assert.equal(snap.writes[0].url, '/k/v1/preview/app/form/fields.json');
    assert.equal(snap.writes[0].body.revision, '4');
    const sent = snap.writes[0].body.properties;
    // 確認画面の件数と実際の送信内容が一致する
    assert.equal(Object.keys(sent).length, 10);
    assert.equal(sent.customer_code.lookup.relatedApp.app, '302', 'ルックアップの参照先を変換');
    assert.equal(sent.items.fields.item_code.lookup.relatedApp.app, '302', 'テーブルの中のルックアップも変換');
    assert.equal(sent.rel.referenceTable.relatedApp.app, '302', '関連レコード一覧の参照先も変換');
    assert.equal(sent.customer_code.lookup.relatedApp.code, undefined, '変換したらアプリコードは外す');
    assert.ok(!('id' in sent.items.fields.qty), 'サブテーブルの新規行に id を含めない');
    const after = fieldsOf(snap, '202');
    assert.ok(after.total && after.items.fields.subtotal && after.rel, '追加された');
    assert.match(await statusText(), /フィールド反映完了: 追加 10/);
    ok('比較元から追加（参照先変換を含む）');
  });

  scenario('フィールド追加: 選んだフィールドが参照するほかのフィールドが無いとき（計算・ルックアップのコピー先）は、最終確認で足りないコードを示す', async () => {
    await reset('field');
    // 計算 total は amount / tax_rate / shipping を、ルックアップ customer_code は cust_name / cust_tel を参照する。#202 には amount しかない。
    await pickFromSource('101', ['total', 'customer_code']);
    await fieldApply('202');
    // 「いいえ」を選べば何も書き込まない
    c.setPolicy('dismiss');
    await fieldRun();
    let snap = await assertNoViolations('フィールド 参照先が無い（いいえ）', { allowedWrites: [] });
    const confirmText = dialogs[0] || '';
    assert.match(confirmText, /反映後のフォームに無いフィールドを参照しています/);
    assert.match(confirmText, /・total（計算式）: tax_rate、shipping/, '計算式の参照先は、反映先にある amount を除いて示す');
    assert.match(confirmText, /・customer_code（ルックアップのコピー先）: cust_name、cust_tel/);
    assert.equal(snap.writes.length, 0, '「いいえ」なら書き込まない');
    ok('参照先が無いフィールドを最終確認で示す');
    // 利用者が続けるなら、kintone の判断に任せる（拒否されれば何も追加されない）
    c.setPolicy('accept');
    dialogs.length = 0;
    await toSetup();
    await button('内容を確認する').click();
    await fieldRun();
    snap = await assertNoViolations('フィールド 参照先が無い（はい）', { allowedWrites: ['/202'] });
    assert.deepEqual(Object.keys(fieldsOf(snap, '202')).filter(code => ['total', 'customer_code'].includes(code)), [], 'kintone に拒否され何も追加されない');
    assert.equal(await statusTone(), 'err');
    // 参照先も一緒に選べば、確認画面に警告は出ず、反映できる
    dialogs.length = 0;
    await pickFromSource('101', ['total', 'customer_code', 'tax_rate', 'shipping', 'cust_name', 'cust_tel']);
    await fieldApply('202');
    await fieldRun();
    assert.doesNotMatch(dialogs[0], /反映後のフォームに無いフィールドを参照/);
    snap = await assertNoViolations('フィールド 参照先も選ぶ', { allowedWrites: ['/202'] });
    assert.ok(fieldsOf(snap, '202').total && fieldsOf(snap, '202').customer_code, '追加された');
    ok('参照先のフィールドも選べば警告なしで反映できる');
  });

  scenario('フィールド追加: 一括整備（プレフィックスを付けて既存フィールドのコードを変更する）', async () => {
    await reset('field');
    await toSetup();
    await label('反映先アプリID').fill('206');
    await openAdvanced();
    await page.getByPlaceholder('例: dev_', { exact: true }).fill('dev_');
    await page.getByRole('button', { name: 'リネーム結果を JSON にセット', exact: true }).click();
    await idle();
    await closeAdvanced();
    const json = JSON.parse(await fieldBox().inputValue());
    const keys = Object.keys(json.properties);
    assert.ok(keys.includes('amount') && json.properties.amount.code === 'dev_amount', 'キーは変更前、code は変更後');
    assert.ok(!keys.includes('record_no'), 'システムフィールドは対象外');
    assert.ok(json.properties.items.fields.qty.code === 'dev_qty', 'テーブルの中も変える');
    // 参照している式・コピー先も新しいコードに合っているか
    const expr = json.properties.total.expression;
    const lookupMappings = json.properties.customer_code.lookup.fieldMappings.map(item => item.field);
    const refCond = json.properties.rel.referenceTable.condition.field;
    const subExpr = json.properties.items.fields.subtotal.expression;
    await fieldApply('206', { overwrite: true });
    await fieldRun();
    const snap = await assertNoViolations('フィールド 一括整備', { allowedWrites: ['/206'] });
    const status = await statusText();
    c.__rename = { expr, lookupMappings, refCond, subExpr, status, ok: snap.writes.every(write => !write.rejected) };
    assert.ok(c.__rename.ok, `kintone に拒否された: ${snap.writes.map(write => write.error).join(' / ')}`);
    // 計算式・ルックアップのコピー先・関連レコード一覧の条件も新しいコードに合わせて書き換える
    assert.equal(expr, 'dev_amount * (1 + dev_tax_rate / 100) + dev_shipping');
    assert.deepEqual(lookupMappings, ['dev_cust_name', 'dev_cust_tel']);
    assert.equal(refCond, 'dev_customer_code');
    assert.equal(subExpr, 'dev_qty * dev_unit_price');
    assert.doesNotMatch(dialogs[0], /反映後のフォームに無いフィールドを参照/, '整備した JSON は参照が合っているので警告しない');
    const after = fieldsOf(snap, '206');
    assert.ok(after.dev_amount && !after.amount, 'コードが変わった');
    assert.equal(snap.writes.filter(write => write.method === 'POST').length, 0, '既存フィールドのコード変更は追加として送らない');
    ok('一括整備（プレフィックス付与）で既存フィールドのコードを変更できる');
  });

  scenario('フィールド追加: 既存フィールドの上書き更新と、種類の違い・コード重複', async () => {
    await reset('field');
    await toSetup();
    await label('反映元アプリID').fill('101');
    await button('反映元から読込').click();
    await idle();
    const loaded = JSON.parse(await fieldBox().inputValue());
    assert.ok(Object.keys(loaded.properties).length >= 60, `業務アプリ相当のフィールド数: ${Object.keys(loaded.properties).length}`);
    ok('反映元の全フィールド（60 以上）を JSON に読み込む');
    // 全フィールドを #201（一部だけある）へ。上書きなし: 既存はスキップ。
    await fieldApply('201');
    const review = await stage(1).innerText();
    assert.match(review, /既存フィールドはスキップ/);
    await fieldRun();
    let snap = await assertNoViolations('フィールド 全フィールド', { allowedWrites: ['/201'] });
    const dialog = dialogs[0];
    const added = /追加 (\d+)件 \/ 更新 (\d+)件 \/ スキップ (\d+)件/.exec(dialog);
    assert.ok(added, dialog);
    const post = snap.writes.find(write => write.method === 'POST');
    assert.equal(Object.keys(post.body.properties).length, Number(added[1]), '確認画面の追加件数と送信内容が一致する');
    assert.equal(snap.writes.filter(write => write.rejected).length, 0, `kintone に拒否された: ${snap.writes.map(write => write.error).join(' / ')}`);
    assert.ok(!post.body.properties.record_no, 'システムフィールドは送らない');
    ok('全フィールドの追加（既存はスキップ）');
    // 上書き更新: memo の種類が違う（SINGLE_LINE_TEXT と MULTI_LINE_TEXT）→ 何も書き込まずに止まる
    dialogs.length = 0;
    await fieldApply('201', { overwrite: true });
    await fieldRun();
    snap = await snapshot();
    const status = await statusText();
    assert.match(status, /memo.*type が一致しません|type が一致しません/);
    assert.equal(snap.writes.length, 1, '種類が違うときは書き込まない（前回の追加だけ）');
    assert.equal(dialogs.length, 0, '確認ダイアログまで進まない');
    ok('種類が違う既存フィールドの上書きは書き込む前に止める');
  });

  scenario('フィールド追加: 複数の反映先（成功・競合・失敗・存在しないアプリ・ゲストスペース）', async () => {
    await reset('field', world({ failWrites: { '/205/app/form/fields.json': { code: 'GAIA_CO02', message: '指定したrevisionは最新ではありません。他のユーザーによってアプリの設定が更新されています。' } } }));
    await toSetup();
    await chooseAction('複数の反映先プレビューへ反映');
    await label('反映元アプリID').fill('101');
    await openAdvanced();
    await button('反映元フィールド一覧を取得').click();
    await page.getByRole('checkbox', { name: /^priority( |$)/ }).waitFor({ timeout: 20000 });
    await page.getByRole('checkbox', { name: /^priority( |$)/ }).check();
    await page.getByRole('checkbox', { name: /^tags( |$)/ }).check();
    await page.getByRole('checkbox', { name: /^memo( |$)/ }).check();
    await button('選択したフィールドを JSON に挿入（マージ）').click();
    await closeAdvanced();
    await fieldMulti(['202', '204', '205', '201', '999', { app: '401', guest: '7' }], { overwrite: true });
    await shot('field-multi-review');
    await fieldRunMulti();
    const text = dialogs[0];
    assert.equal(dialogs.length, 1, '最終確認は 1 回');
    const snap = await assertNoViolations('フィールド 複数の反映先', { allowedWrites: ['/202', '/204', '/205', '/201', '7/401'] });
    const result = await panelText();
    for (const [app, expected] of [['202', '成功'], ['204', '成功'], ['205', '競合'], ['201', '失敗'], ['999', '失敗'], ['401', '成功']]) {
      const line = result.split('\n').find(row => new RegExp(`App ${app}\\b`).test(row) && !/反映先:/.test(row));
      assert.ok(line && new RegExp(expected).test(line), `App ${app}: ${expected} / ${line}`);
    }
    assert.equal(fieldsOf(snap, '202').priority.type, 'RADIO_BUTTON');
    assert.ok(!fieldsOf(snap, '205').priority, '競合した反映先は変えない');
    assert.ok(!fieldsOf(snap, '201').priority, '事前確認で止まった反映先は書き込まない（memo の種類が違う）');
    assert.equal(fieldsOf(snap, '401', '7').tags.type, 'CHECK_BOX');
    assert.equal(await statusTone(), 'warn');
    ok('成功・競合・失敗・存在しないアプリ・ゲストスペースが混在しても残りを続ける');
    await shot('field-multi-result');
  });

  scenario('フィールド追加: 複数の反映先で中止すると、残りは未実行になる', async () => {
    await reset('field');
    await toSetup();
    await label('反映元アプリID').fill('101');
    await openAdvanced();
    await button('反映元フィールド一覧を取得').click();
    await page.getByRole('checkbox', { name: /^priority( |$)/ }).waitFor({ timeout: 20000 });
    await page.getByRole('checkbox', { name: /^priority( |$)/ }).check();
    await button('選択したフィールドを JSON に挿入（マージ）').click();
    await closeAdvanced();
    await fieldMulti(['202', '204', '205']);
    await page.evaluate(() => { window.__k.holdWrites = true; });
    await button('複数の反映先プレビューへ反映').click();
    await page.waitForFunction(() => window.__k.heldWrites > 0, null, { timeout: 20000 });
    await page.getByRole('button', { name: '処理を中止', exact: true }).click();
    await page.evaluate(() => window.__k.release());
    await idle();
    const snap = await assertNoViolations('フィールド 中止', { allowedWrites: ['/202', '/204', '/205'] });
    const result = await panelText();
    assert.match(result, /未実行（中止）/);
    assert.equal(snap.writes.length, 1, '中止後は次の反映先へ書き込まない');
    ok('中止すると残りは未実行（中止）');
  });

  scenario('フィールド追加: 二重クリックと入力の誤り', async () => {
    await reset('field');
    await pickFromSource('101', ['priority']);
    await fieldApply('202');
    await button('反映先プレビューへ反映').evaluate(b => { b.click(); b.click(); });
    await idle();
    const snap = await assertNoViolations('フィールド 二重クリック', { allowedWrites: ['/202'] });
    assert.equal(snap.writes.length, 1);
    assert.equal(dialogs.length, 1);
    ok('二重クリックは 1 回だけ実行する');
    await toSetup();
    await label('反映先アプリID').fill('abc');
    assert.equal(await button('内容を確認する').isDisabled(), true);
    await label('反映先アプリID').fill('202');
    for (const bad of ['', '{', '[]', '{"properties":{"x":{"label":"a"}}}', '{"properties":{}}']) {
      await fieldBox().fill(bad);
      assert.equal(await button('内容を確認する').isDisabled(), true, `不正な JSON を確認前に止める: ${bad}`);
    }
    await fieldBox().fill('{"properties":{"x":{"type":"SINGLE_LINE_TEXT","label":"a"}}}');
    await openAdvanced();
    await lookupBox().fill('{');
    await closeAdvanced();
    assert.equal(await button('内容を確認する').isDisabled(), true, '参照先変換の JSON が壊れている');
    ok('入力の誤りは確認前に止める');
  });

  scenario('フィールド追加: 画面幅 320〜1440px でもはみ出さない', async () => {
    await reset('field');
    await pickFromSource('101', ['cust_name', 'customer_code', 'total', 'items', 'rel']);
    await fieldMulti(['202', '204', '205']);
    for (const [width, height] of [[1440, 1000], [1024, 900], [768, 900], [390, 844], [320, 640]]) {
      await page.setViewportSize({ width, height });
      await noOverflow(`フィールド 確認画面 ${width}`);
      await shot(`field-multi-review-${width}`);
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    await fieldRunMulti();
    for (const [width, height] of [[1024, 900], [390, 844], [320, 640]]) {
      await page.setViewportSize({ width, height });
      await noOverflow(`フィールド 結果 ${width}`);
    }
    ok('320〜1440px でもはみ出さない');
  });
};
