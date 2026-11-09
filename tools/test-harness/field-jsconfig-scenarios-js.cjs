'use strict';

// JS/CSS 設定（tools/kintoneJS取得.js）の通し検証のシナリオ。field-jsconfig-explore.cjs から読み込まれる。
const assert = require('node:assert/strict');

module.exports = function (scenario, c) {
  const { page, button, radio, label, idle, statusText, statusTone, panelText, stage, shot, snapshot, appState, reset, assertNoViolations, noOverflow, chooseAction, toSetup, jsonBox, jsFetch, jsApply, jsRunApply, jsMulti, jsRunMulti, dialogs, finding, ok, world } = c;
  const fileNames = (customize, platform, kind) => (customize[platform][kind] || []).map(item => (item.type === 'FILE' ? item.file.name : item.url));
  const fileKeys = (customize, platform, kind) => (customize[platform][kind] || []).filter(item => item.type === 'FILE').map(item => item.file.fileKey);
  const bodyOf = (snap, key) => snap.files[key];

  scenario('JS/CSS: 取得 → 編集 → 別アプリへ反映（FILE を取得元から取得して反映先へアップロード）', async () => {
    await reset('js');
    await jsFetch('101');
    await toSetup();
    const fetched = JSON.parse(await jsonBox().inputValue());
    assert.equal(fetched.desktop.js.length, 3);
    assert.equal(fetched.mobile.js[0].file.fileKey, 'src-main');
    assert.match(await page.locator('.kus-lp__panel-html').first().innerText(), /FILE:4/, '取得結果プレビューに FILE の件数');
    ok('取得した JSON と取得結果の一覧を表示する');
    // 編集: URL を 1 件外し、適用範囲を ADMIN にする
    const edited = clone(fetched);
    edited.desktop.js.shift();
    edited.scope = 'ADMIN';
    await jsApply('201', { baseJson: JSON.stringify(edited, null, 2) });
    const review = await stage(1).innerText();
    assert.match(review, /JSONの取得元[\s\S]*#101[\s\S]*取得後に編集あり/);
    assert.match(review, /ファイル（FILE）[\s\S]*3件|ファイル（FILE）[\s\S]*4件/);
    assert.doesNotMatch(review, /取得元が分からないファイル/);
    await shot('js-apply-review');
    await jsRunApply();
    assert.equal(dialogs.length, 1, '最終確認は 1 回');
    const text = dialogs[0];
    assert.match(text, /App 201 のプレビューへ JS\/CSS 設定を反映します/);
    assert.match(text, /反映先へアップロードする: 4件/);
    assert.match(text, /PC JS: main\.js/); assert.match(text, /PC JS: util\.js/); assert.match(text, /PC CSS: style\.css/); assert.match(text, /モバイル JS: main\.js/);
    assert.match(text, /外れる現在の設定: 1件/);
    const snap = await assertNoViolations('JS/CSS 別アプリへ反映', { allowedWrites: ['/201'] });
    // 確認画面の内容と実際の送信内容が一致する
    assert.equal(snap.uploads.length, 4, '確認画面のアップロード件数と実際のアップロード数が一致する');
    assert.deepEqual(snap.uploads.map(item => item.name).sort(), ['main.js', 'main.js', 'style.css', 'util.js']);
    const puts = snap.writes.filter(write => write.method === 'PUT');
    assert.equal(puts.length, 1);
    assert.equal(puts[0].url, '/k/v1/preview/app/customize.json');
    assert.equal(puts[0].body.revision, '10');
    assert.equal(puts[0].body.scope, 'ADMIN');
    assert.ok(JSON.stringify(puts[0].body).indexOf('src-') < 0, '取得元の fileKey を送らない');
    const uploadSeq = Math.max(...snap.uploads.map(item => item.seq)), putSeq = puts[0].seq;
    assert.ok(uploadSeq < putSeq, 'アップロードは設定の書き込みより前');
    const after = appState(snap, '201').preview.customize;
    assert.deepEqual(fileNames(after, 'desktop', 'js'), ['main.js', 'util.js']);
    assert.deepEqual(fileNames(after, 'desktop', 'css'), ['style.css']);
    assert.deepEqual(fileNames(after, 'mobile', 'js'), ['main.js']);
    assert.equal(after.scope, 'ADMIN');
    assert.equal(bodyOf(snap, fileKeys(after, 'desktop', 'js')[0]), '(function(){ console.log("main"); })();', 'ファイルの中身が同じ');
    assert.equal(new Set([...fileKeys(after, 'desktop', 'js'), ...fileKeys(after, 'desktop', 'css'), ...fileKeys(after, 'mobile', 'js')]).size, 4, 'アップロードしたキーは枠ごとに別');
    assert.equal(appState(snap, '201').previewRev, '11');
    assert.equal(appState(snap, '101').previewRev, '20', '取得元は変えない');
    ok('FILE を含む JSON を別アプリへ反映（確認画面・アップロード・書き込みが一致）');
    assert.match(await statusText(), /反映完了/);
    assert.match(await page.locator('.kus-lp__panel-html, pre').last().innerText().catch(() => ''), /アップロード 4件 \/ 再利用 0件/);
  });

  scenario('JS/CSS: 取得元の本番から取得して同じアプリのプレビューへ戻す（同じキーならアップロードしない）', async () => {
    await reset('js');
    await jsFetch('101');
    await jsApply('101');
    await jsRunApply();
    const snap = await assertNoViolations('JS/CSS 同じアプリへ戻す', { allowedWrites: ['/101'] });
    assert.match(dialogs[0], /そのまま使う: 4件/);
    assert.doesNotMatch(dialogs[0], /反映先へアップロードする/);
    assert.equal(snap.uploads.length, 0);
    assert.equal(snap.fileFetches.length, 0, '同じアプリへ戻すときはファイルを取得しない');
    assert.deepEqual(fileKeys(appState(snap, '101').preview.customize, 'desktop', 'js'), ['src-main', 'src-util']);
    ok('同じアプリへ戻すときは取得もアップロードもしない');
  });

  scenario('JS/CSS: 反映先に同名・同内容のファイルがあれば再利用し、無ければアップロードする', async () => {
    await reset('js');
    await jsFetch('101');
    await jsApply('203');
    await jsRunApply();
    const snap = await assertNoViolations('JS/CSS 再利用', { allowedWrites: ['/203'] });
    assert.match(dialogs[0], /同名・同内容のファイルを使う: 1件/);
    assert.match(dialogs[0], /反映先へアップロードする: 3件/);
    const after = appState(snap, '203').preview.customize;
    assert.equal(fileKeys(after, 'desktop', 'js')[0], 'tgt203-main', '同名・同内容のファイルのキーを再利用');
    assert.equal(snap.uploads.length, 3);
    assert.equal(fileKeys(after, 'mobile', 'js').length, 1);
    ok('同名・同内容は再利用、それ以外はアップロード');
  });

  scenario('JS/CSS: 取得後に反映先が更新されたら上書きしない（競合）', async () => {
    await reset('js');
    await jsFetch('101');
    await jsApply('201');
    // 反映先の現在の設定を取得した直後に、別の利用者が更新した状況
    await page.evaluate(() => { window.__k.bumpOnGet = { app: '/201', path: '/app/customize.json' }; });
    await jsRunApply();
    const snap = await assertNoViolations('JS/CSS 競合', { allowedWrites: ['/201'] });
    const text = await statusText();
    assert.match(text, /競合/, `競合を示す: ${text}`);
    assert.equal(await statusTone(), 'err');
    assert.deepEqual(fileNames(appState(snap, '201').preview.customize, 'desktop', 'js'), ['old.js'], '上書きしない');
    ok('競合は上書きせず利用者へ示す');
  });

  scenario('JS/CSS: アップロードが 1 件失敗したら設定を書き込まない', async () => {
    await reset('js', world({ failUpload: { 'util.js': { status: 413, code: 'GAIA_FL02', message: 'ファイルサイズが大きすぎます。' } } }));
    await jsFetch('101');
    await jsApply('202');
    await jsRunApply();
    const snap = await assertNoViolations('JS/CSS アップロード失敗', { allowedWrites: ['/202'] });
    assert.equal(snap.writes.filter(write => write.method === 'PUT').length, 0, '設定は書き込まない');
    const text = await statusText();
    assert.match(text, /util\.js/);
    assert.match(text, /書き込んでいません/);
    assert.equal(await statusTone(), 'err');
    assert.deepEqual(appState(snap, '202').preview.customize.desktop.js, []);
    ok('アップロード失敗では何も書き込まない');
    await shot('js-upload-failed');
  });

  scenario('JS/CSS: 取得元が分からない JSON は理由と次の操作を示して止める', async () => {
    await reset('js');
    const manual = JSON.stringify({ scope: 'ALL', desktop: { js: [{ type: 'FILE', file: { fileKey: 'src-main', name: 'main.js' } }], css: [] }, mobile: { js: [], css: [] } });
    await jsApply('202', { baseJson: manual });
    const review = await stage(1).innerText();
    assert.match(review, /取得元が分からないファイル[\s\S]*main\.js[\s\S]*取得元アプリで「取得」してから反映してください/, '確認画面で警告する');
    await jsRunApply();
    const snap = await assertNoViolations('JS/CSS 取得元不明', { allowedWrites: [] });
    assert.deepEqual(snap.fileFetches, [], '推測でファイルを取得しない');
    assert.equal(snap.uploads.length, 0);
    assert.equal(snap.writes.length, 0);
    assert.equal(dialogs.length, 0, '確認ダイアログまで進まない');
    const text = await statusText();
    assert.match(text, /取得元が分からないファイル/);
    assert.match(text, /取得元アプリで「取得」してから反映してください/);
    ok('取得元が分からない JSON は止める');
    // 取得後に追加した fileKey も止める（取得した JSON に無いキー）
    await jsFetch('101');
    await toSetup();
    const edited = JSON.parse(await jsonBox().inputValue());
    edited.desktop.js.push({ type: 'FILE', file: { fileKey: 'someone-elses', name: 'other.js' } });
    await jsApply('202', { baseJson: JSON.stringify(edited) });
    await jsRunApply();
    const snap2 = await assertNoViolations('JS/CSS 取得後に追加した fileKey', { allowedWrites: [] });
    assert.ok(!snap2.fileFetches.some(item => item.key === 'someone-elses'), '取得元の JSON に無い fileKey は取得しない');
    assert.match(await panelText(), /other\.js/, '対象のファイル名をログに示す');
    assert.equal(snap2.writes.length, 0);
    ok('取得後に追加した fileKey は止める');
  });

  scenario('JS/CSS: 同じアプリの自分のキーなら、取得元が分からなくても反映できる（手入力）', async () => {
    await reset('js');
    const manual = JSON.stringify({ scope: 'ALL', desktop: { js: [{ type: 'FILE', file: { fileKey: 'tgt-old', name: 'old.js' } }], css: [] }, mobile: { js: [], css: [] } });
    await jsApply('201', { baseJson: manual });
    await jsRunApply();
    const snap = await assertNoViolations('JS/CSS 同じ枠のキー', { allowedWrites: ['/201'] });
    assert.equal(snap.uploads.length, 0);
    assert.equal(snap.writes.length, 1);
    assert.match(dialogs[0], /そのまま使う: 1件/);
    ok('反映先がすでに同じ枠で使っているキーは取得元が分からなくても反映できる');
  });

  scenario('JS/CSS: ゲストスペース（取得元と反映先で別）の URL を使う', async () => {
    await reset('js');
    await jsFetch('101');
    await jsApply('401', { guest: '7' });
    await jsRunApply();
    const snap = await assertNoViolations('JS/CSS ゲストスペース', { allowedWrites: ['7/401'] });
    assert.deepEqual([...new Set(snap.fileFetches.map(item => item.guest))], [''], '取得元（通常スペース）から取得');
    assert.ok(snap.uploads.every(item => item.url === '/k/guest/7/v1/file.json'), '反映先のゲストスペースへアップロード');
    assert.equal(snap.writes[0].url, '/k/guest/7/v1/preview/app/customize.json');
    assert.equal(snap.uploads.length, 4);
    ok('ゲストスペースの URL を正しく使う');
  });

  scenario('JS/CSS: 複数の反映先（成功・再利用・競合・失敗・存在しないアプリ・ゲストスペースの混在）', async () => {
    await reset('js', world({
      failUploadNth: [], failWrites: { '/204/app/customize.json': { code: 'GAIA_CO02', message: '指定したrevisionは最新ではありません。他のユーザーによってアプリの設定が更新されています。' }, '/205/app/customize.json': { code: 'CB_VA01', message: '入力内容が正しくありません。' } }
    }));
    await jsFetch('101');
    await jsMulti(['202', '203', '204', '205', '999', { app: '401', guest: '7' }]);
    const review = await stage(1).innerText();
    assert.match(review, /ファイル（FILE）/);
    await jsRunMulti();
    assert.equal(dialogs.length, 1, '最終確認は 1 回');
    const text = dialogs[0];
    assert.match(text, /5件の反映先プレビュー/);
    assert.match(text, /FILE 形式のファイルは、反映先ごとに次のとおり扱います/);
    assert.match(text, /同名・同内容のファイルを使う: 1件/);
    assert.match(text, /現在の設定を確認できなかった 1件は反映しません[\s\S]*App 999/);
    const snap = await assertNoViolations('JS/CSS 複数の反映先', { allowedWrites: ['/202', '/203', '/204', '/205', '7/401'] });
    const result = await panelText();
    assert.match(result, /成功[\s\S]*202|App 202[\s\S]*成功/);
    for (const [app, expected] of [['202', '成功'], ['203', '成功'], ['204', '競合'], ['205', '失敗'], ['999', '失敗'], ['401', '成功']]) {
      const row = page.locator('tr', { hasText: `App ${app}` }).last();
      assert.match(await row.innerText(), new RegExp(expected), `App ${app}: ${expected}`);
    }
    assert.equal(appState(snap, '202').preview.customize.desktop.js.length, 3);
    assert.equal(appState(snap, '203').preview.customize.desktop.js[1].file.fileKey, 'tgt203-main');
    assert.equal(appState(snap, '204').preview.customize.desktop.js.length, 0, '競合した反映先は上書きしない');
    assert.equal(appState(snap, '401', '7').preview.customize.desktop.js.length, 3);
    // 取得元の本体は反映先ごとに取得し直さない
    const fetched = snap.fileFetches.filter(item => item.key === 'src-main').length;
    assert.equal(fetched, 1, `取得元のファイルは 1 回だけ取得する（実際 ${fetched} 回）`);
    // 確認画面のアップロード件数 = 実際のアップロード件数（失敗した反映先の分を含む）
    const stated = /アップロードする: 合計 (\d+)件/.exec(text);
    assert.ok(stated, '確認画面にアップロード件数');
    assert.equal(snap.uploads.length, Number(stated[1]), '確認画面のアップロード件数と実際が一致する');
    assert.match(await statusText(), /6件中 3件を反映しました|件中 3件/);
    assert.equal(await statusTone(), 'warn');
    await shot('js-multi-mixed');
    ok('成功・再利用・競合・失敗・事前確認の失敗・ゲストスペースが混在しても残りを続け、結果を反映先ごとに示す');
  });

  scenario('JS/CSS: 複数の反映先でアップロードが失敗した反映先だけを失敗にして残りを続ける', async () => {
    // アップロード通算 4 回目（2 件目の反映先の最初のアップロード）を失敗させる。1 件の反映先は 4 件アップロードする。
    await reset('js', world({ failUploadNth: [5] }));
    await jsFetch('101');
    await jsMulti(['202', '204', '205']);
    await jsRunMulti();
    const snap = await assertNoViolations('JS/CSS アップロード失敗の混在', { allowedWrites: ['/202', '/204', '/205'] });
    const puts = snap.writes.filter(write => write.method === 'PUT').map(write => write.appKey);
    assert.deepEqual(puts, ['/202', '/205'], 'アップロードに失敗した反映先には書き込まない');
    const row = page.locator('tr', { hasText: 'App 204' }).last();
    assert.match(await row.innerText(), /失敗[\s\S]*アップロードに失敗しました[\s\S]*書き込んでいません/);
    assert.deepEqual(appState(snap, '204').preview.customize.desktop.js, []);
    ok('アップロード失敗の反映先は書き込まず、残りを続ける');
  });

  scenario('JS/CSS: 複数の反映先で、アップロード中に中止したら書き込まず未実行にする', async () => {
    await reset('js');
    await jsFetch('101');
    await jsMulti(['202', '203', '204']);
    await page.evaluate(() => { window.__k.holdUploads = true; });
    await button('複数の反映先プレビューへ反映').click();
    await page.waitForFunction(() => window.__k.heldUploads > 0, null, { timeout: 20000 });
    await page.getByRole('button', { name: '処理を中止', exact: true }).click();
    await page.evaluate(() => window.__k.release());
    await idle();
    const snap = await assertNoViolations('JS/CSS 中止', { allowedWrites: [] });
    assert.equal(snap.writes.length, 0, '中止したら設定を書き込まない');
    const text = await statusText();
    assert.match(text, /中止/);
    const result = await panelText();
    assert.match(result, /未実行（中止）/);
    assert.match(result, /書き込んでいません|何も反映していません/);
    await shot('js-multi-cancelled');
    ok('アップロード中の中止は書き込まず、「未実行（中止）」と示す');
  });

  scenario('JS/CSS: 反映先から読み込んで編集し、読み込み後に更新されていたら上書きしない', async () => {
    await reset('js');
    await toSetup();
    await chooseAction('反映先プレビューへ反映');
    await label('反映先アプリID').fill('201');
    await page.getByText('JSONの読込・整形・保存').click();
    await button('反映先から読込').click();
    await idle();
    const loaded = JSON.parse(await jsonBox().inputValue());
    assert.equal(loaded.desktop.js[0].file.fileKey, 'tgt-old');
    loaded.desktop.js.push({ type: 'URL', url: 'https://cdn.example.com/added.js' });
    await jsonBox().fill(JSON.stringify(loaded));
    // 読み込んだ後に別の利用者が更新した
    await page.evaluate(() => window.__k.bumpPreview('201'));
    await button('内容を確認する').click();
    await jsRunApply();
    const snap = await assertNoViolations('JS/CSS 読み込み後の更新', { allowedWrites: [] });
    assert.equal(snap.writes.length, 0);
    assert.match(await statusText(), /revision.*異なります|競合/);
    assert.equal(dialogs.length, 0, '確認の前に止める');
    ok('反映先から読み込んだ後に更新されていたら確認の前に止める');
    // 読み込み直して反映できる。FILE は反映先のキーなので、アップロードしない
    await button('対象・条件を変更').click();
    if (!(await button('反映先から読込').isVisible())) await page.getByText('JSONの読込・整形・保存').click();
    await button('反映先から読込').click();
    await idle();
    await button('内容を確認する').click();
    await jsRunApply();
    const snap2 = await assertNoViolations('JS/CSS 読み込み直し', { allowedWrites: ['/201'] });
    assert.equal(snap2.uploads.length, 0);
    assert.equal(snap2.writes.length, 1);
    assert.match(dialogs.at(-1), /そのまま使う: 1件/);
  });

  scenario('JS/CSS: 全アプリの JS/CSS ファイルを ZIP で一括取得', async () => {
    await reset('js');
    await toSetup();
    await chooseAction('全アプリのJS/CSSをZIP保存');
    await button('内容を確認する').click();
    await button('全アプリのJS/CSSをZIP保存').click();
    await idle();
    const snap = await assertNoViolations('JS/CSS ZIP', { allowedWrites: [] });
    assert.equal(snap.zips.length, 1);
    const names = snap.zips[0];
    assert.ok(names.some(name => /manifest\.json$/.test(name)), 'manifest.json');
    const files = names.filter(name => !/manifest\.json|INDEX\.md|download_errors/.test(name));
    // #101 は FILE 4 件（main.js が PC とモバイルの両方）、#201 は 1 件、#203 は 1 件
    assert.equal(files.length, 6, `ファイル数: ${files.join(', ')}`);
    const text = await panelText();
    assert.match(text, /走査アプリ数: 9件 \/ 取得ファイル数: 6件/);
    ok('全アプリの ZIP 一括取得');
  });

  scenario('JS/CSS: 二重クリックと入力の誤り', async () => {
    await reset('js');
    await jsFetch('101');
    await jsApply('202');
    await button('反映先プレビューへ反映').evaluate(b => { b.click(); b.click(); });
    await idle();
    const snap = await assertNoViolations('JS/CSS 二重クリック', { allowedWrites: ['/202'] });
    assert.equal(snap.writes.filter(write => write.method === 'PUT').length, 1, '二重クリックでも 1 回だけ書き込む');
    assert.equal(dialogs.length, 1);
    ok('二重クリックは 1 回だけ実行する');
    // 入力の誤り
    await toSetup();
    await chooseAction('反映先プレビューへ反映');
    await label('反映先アプリID').fill('abc');
    assert.equal(await button('内容を確認する').isDisabled(), true, 'アプリIDが数字でない');
    await label('反映先アプリID').fill('202');
    await label('反映先ゲストスペースID').fill('x1');
    assert.equal(await button('内容を確認する').isDisabled(), true, 'ゲストスペースIDが数字でない');
    await label('反映先ゲストスペースID').fill('');
    for (const bad of ['', '{', '[]', '{"desktop":{"js":"a.js"}}', '{"desktop":{"js":[{"type":"FILE","file":{}}]}}']) {
      await jsonBox().fill(bad);
      assert.equal(await button('内容を確認する').isDisabled(), true, `不正な JSON を確認前に止める: ${bad}`);
    }
    ok('入力の誤りは確認前に止める');
  });

  scenario('JS/CSS: 画面幅 320〜1440px（FILE を含む確認画面・結果）でもはみ出さない', async () => {
    await reset('js');
    await jsFetch('101');
    await jsMulti(['202', '203', '204']);
    for (const [width, height] of [[1440, 1000], [1024, 900], [768, 900], [390, 844], [320, 640]]) {
      await page.setViewportSize({ width, height });
      await noOverflow(`JS/CSS 確認画面 ${width}`);
      await shot(`js-multi-review-${width}`);
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    await jsRunMulti();
    for (const [width, height] of [[1024, 900], [390, 844], [320, 640]]) {
      await page.setViewportSize({ width, height });
      await noOverflow(`JS/CSS 結果 ${width}`);
      await shot(`js-multi-result-${width}`);
    }
    ok('320〜1440px でもはみ出さない');
  });

  function clone(value) { return JSON.parse(JSON.stringify(value)); }
};
