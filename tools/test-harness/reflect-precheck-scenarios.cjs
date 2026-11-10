'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// 「全反映先の事前確認」（続けて反映する反映先の差分を、書き込まずに先に一覧にする）と、
// 差分確認画面の「参照先変換の候補」を、反映エンジン側だけを差し替えた合成データで実ブラウザ上に検証する。
// エンジン側（実エンジン＋合成 kintone）の検証は reflect-engine-scenarios.cjs / reflect-explore.cjs が行う。
module.exports = async function verifyRolloutPrecheck({ page, script, fixture, out, errors }) {
  const button = name => page.getByRole('button', { name, exact: true });
  const tab = name => page.getByRole('tab', { name: new RegExp(name) });
  const card = () => page.locator('[data-precheck="card"]');
  const rows = () => page.locator('[data-precheck-row]');
  const rowStates = () => page.locator('[data-precheck-row]').evaluateAll(nodes => nodes.map(node => [node.dataset.precheckRow, node.dataset.state]));
  const note = () => page.locator('[data-precheck-note]');
  const runButton = () => page.locator('[data-precheck-run]');
  const dropButton = () => page.locator('[data-precheck-drop]');
  const retryButton = () => page.locator('[data-precheck-retry]');
  const filterSelect = () => page.getByRole('combobox', { name: '一括確認の結果を状態で絞り込み' });
  const detailDialog = () => page.locator('#kus-rl-detail');
  const status = () => page.locator('.kus-lp__status').innerText();
  const idle = () => page.waitForFunction(() => document.querySelector('#kus-reflect-lite').getAttribute('aria-busy') !== 'true');
  const mock = fn => page.evaluate(fn);
  const downloadOf = async name => {
    const promise = page.waitForEvent('download');
    await button(name).click();
    const file = await promise;
    return { name: file.suggestedFilename(), text: await fs.promises.readFile(await file.path(), 'utf8') };
  };
  async function reset(extra = {}) {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.setContent('<!doctype html><html lang="ja"><meta charset="utf-8"><body style="background:#e8edf3"></body></html>');
    await page.evaluate(fixture);
    await page.evaluate(extra => { window.__reflectMock.mode = 'mixed'; Object.assign(window.__reflectMock, extra); }, extra);
    await page.addScriptTag({ content: script });
    await page.evaluate(() => ReflectHarness.mountReflectLitePanel());
    await page.getByRole('textbox', { name: '反映元アプリID', exact: true }).fill('101');
    await button('フォームのみ').click();
  }
  // 「詳細設定…」は第1画面にある。ほかの画面から呼んだときは、第1画面で操作してから元の画面へ戻る。
  async function inDetail(action) {
    const selected = await page.locator('[role="tab"][aria-selected="true"]').getAttribute('id');
    if (!(await button('詳細設定…').isVisible())) await tab('対象を選ぶ').click();
    await button('詳細設定…').click();
    try { return await action(); } finally {
      await button('詳細設定を閉じる').click();
      if (selected && selected !== 'kus-rl-tab-setup') await page.locator(`#${selected}`).click();
    }
  }
  const setQueue = text => inDetail(() => page.locator('textarea[aria-label="続けて反映する反映先"]').fill(text));
  const queueText = () => page.locator('textarea[aria-label="続けて反映する反映先"]').inputValue();
  const setLookup = text => inDetail(() => page.locator('textarea[aria-label="ルックアップの参照アプリID変換"]').fill(text));
  const lookupText = () => page.locator('textarea[aria-label="ルックアップの参照アプリID変換"]').inputValue();
  const setPreserve = checked => inDetail(() => (checked ? page.locator('label.kus-lp__check', { hasText: '反映先だけの一覧・グラフ・アクションを保持する' }).locator('input').check() : page.locator('label.kus-lp__check', { hasText: '反映先だけの一覧・グラフ・アクションを保持する' }).locator('input').uncheck()));
  const prechecks = () => page.evaluate(() => window.__reflectMock.prechecks.map(item => item.targets.map(target => target.appId)));
  const noWrites = async where => {
    assert.equal(await page.evaluate(() => window.__reflectMock.applies.length), 0, `${where}: 書き込まない`);
  };
  const run = async () => { await runButton().click(); await idle(); };

  // ===== 1. 表示の条件：続けて反映する反映先が無いときは出さない =====
  await reset();
  assert.equal(await card().isVisible(), false, '続けて反映する反映先が無いときは事前確認を出さない');
  await setQueue('203');
  assert.equal(await card().isVisible(), true, '続けて反映する反映先を指定すると出す');
  assert.equal(await card().locator('.kus-lp__card-title').innerText(), '全反映先の事前確認');
  assert.equal(await runButton().innerText(), '全反映先の差分を一括確認');
  assert.match(await note().innerText(), /現在の反映先と続けて反映する反映先、合わせて 2 件の差分を先に取得します。書き込みは行いません。/);
  assert.equal(await page.locator('[data-precheck-result]').isVisible(), false, '実行前は結果の欄を出さない');
  await setQueue('203 abc');
  assert.equal(await runButton().isDisabled(), true, '反映先の指定に誤りがあるときは押せない');
  assert.match(await note().innerText(), /一括確認するには：続けて反映する反映先を読み取れません。「abc」をアプリIDとして読み取れません/);
  await setQueue('');
  assert.equal(await card().isVisible(), false);

  // ===== 2. 一括確認：状態・差分のある項目・未公開の変更・参照先変換の候補 =====
  await reset({ precheckPlan: {
    '203': { state: 'same', changedLabels: [], changeCount: 0 },
    '204': { state: 'error', changedLabels: [], changeCount: 0, pending: '', reason: '反映先 #204: 指定したアプリ（ID: 204）が見つかりません。' },
    '205': { state: 'attention', attentionLabels: ['フィールド設定'], reason: 'フィールド設定: customer: 種類が異なります（NUMBER → SINGLE_LINE_TEXT）。', changedLabels: ['ビュー設定'], changeCount: 1 },
    '206': { pending: 'pending', pendingLabels: ['ビュー設定'], removalCount: 1, lookupCandidates: 1 },
    '207': { state: 'same', changedLabels: [], changeCount: 0 }
  } });
  await setQueue('203\n204\n205\n206\n207');
  assert.match(await note().innerText(), /合わせて 6 件/, '現在の反映先も含めて数える');
  const previewsBefore = await page.evaluate(() => window.__reflectMock.previews.length);
  await runButton().click();
  await idle();
  assert.deepEqual(await prechecks(), [['202', '203', '204', '205', '206', '207']], '現在の反映先と続けて反映する反映先を、入力欄の順に渡す');
  const passed = await page.evaluate(() => window.__reflectMock.prechecks[0].options);
  assert.equal(passed.sourceAppId, '101');
  assert.deepEqual(passed.scopes.sort(), ['fieldSettings', 'layoutSettings', 'viewSettings'], '選んだ項目を渡す');
  assert.equal('targetAppId' in passed, false, '反映先のIDは反映先ごとに指定する');
  assert.equal(await page.evaluate(() => window.__reflectMock.previews.length), previewsBefore, '一括確認は画面の差分確認（lastPreview）を作らない');
  await noWrites('一括確認');
  assert.deepEqual(await rowStates(), [['202', 'diff'], ['203', 'same'], ['204', 'error'], ['205', 'attention'], ['206', 'diff'], ['207', 'same']]);
  assert.match(await status(), /6 件を確認しました（差分あり 2 \/ 差分なし 2 \/ 確認が必要 1 \/ 取得失敗 1）。取得失敗・確認が必要な反映先を確認してください（まだ書き込んでいません）。/);
  assert.equal(await page.locator('.kus-lp__status').getAttribute('data-tone'), 'warn', '取得失敗・確認が必要があるときは警告色');
  assert.equal(await runButton().innerText(), '全反映先を確認し直す');
  const row = id => page.locator(`[data-precheck-row="${id}"]`);
  assert.match(await row('202').innerText(), /差分あり[\s\S]*#202 営業所202[\s\S]*現在の反映先[\s\S]*差分のある項目: フィールド設定、ビュー設定（変更 3 件 \/ 削除 0 件）[\s\S]*反映先プレビューの未公開の変更: なし/);
  assert.match(await row('203').innerText(), /差分なし（一致）[\s\S]*選んだ項目は反映元と一致しています。/);
  assert.match(await row('204').innerText(), /取得失敗[\s\S]*反映先 #204: 指定したアプリ（ID: 204）が見つかりません。/, '取得失敗は理由を示し、差分なしと表示しない');
  assert.doesNotMatch(await row('204').innerText(), /一致しています/);
  assert.match(await row('205').innerText(), /確認が必要[\s\S]*確認が必要な項目: フィールド設定（フィールド設定: customer: 種類が異なります[\s\S]*差分のある項目: ビュー設定/);
  assert.match(await row('206').innerText(), /反映先プレビューの未公開の変更: あり（ビュー設定）[\s\S]*参照先変換の候補があります/, '未公開の変更と参照先変換の候補を示す');
  assert.match(await row('206').innerText(), /変更 3 件 \/ 削除 1 件/);
  assert.match(await page.locator('[data-precheck-summary]').innerText(), /差分あり 2[\s\S]*差分なし（一致） 2[\s\S]*確認が必要 1[\s\S]*取得失敗 1[\s\S]*6 件/);
  assert.match(await note().innerText(), /1 件の反映先プレビューに、以前からの未公開の変更があります。/);
  assert.equal(await dropButton().innerText(), '差分のない反映先を外す（2 件）');
  assert.equal(await retryButton().innerText(), '取得失敗だけ確認し直す（1 件）');
  await page.screenshot({ path: path.join(out, 'precheck-1440.png') });

  // 状態での絞り込み
  await filterSelect().selectOption('error');
  assert.deepEqual(await rowStates(), [['204', 'error']]);
  assert.deepEqual(await filterSelect().locator('option').allInnerTexts(), ['すべての状態（6）', '差分あり（2）', '差分なし（一致）（2）', '確認が必要（1）', '取得失敗（1）']);
  await filterSelect().selectOption('all');

  // ===== 3. 取得失敗だけ確認し直す =====
  await page.evaluate(() => { window.__reflectMock.precheckPlan['204'] = { state: 'diff' }; });
  await retryButton().click();
  await idle();
  assert.deepEqual((await prechecks()).slice(1), [['204']], '取得失敗の反映先だけを確認し直す');
  assert.deepEqual(await rowStates(), [['202', 'diff'], ['203', 'same'], ['204', 'diff'], ['205', 'attention'], ['206', 'diff'], ['207', 'same']], '行の順序を保ち、確認し直した行だけ更新する');
  assert.match(await status(), /1 件を確認し直しました。6 件を確認しました（差分あり 3 \/ 差分なし 2 \/ 確認が必要 1）。/);
  assert.equal(await retryButton().isDisabled(), true, '取得失敗が無ければ確認し直す操作は押せない');
  assert.equal(await retryButton().innerText(), '取得失敗だけ確認し直す（0 件）');
  await noWrites('取得失敗の確認し直し');

  // ===== 4. 結果を Markdown で保存・コピーする（承認依頼に使える形。設定値の生 JSON は含めない） =====
  await page.evaluate(() => {
    window.__copied = [];
    document.execCommand = () => false;
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async text => { window.__copied.push(text); } } });
  });
  await page.locator('[data-precheck-result] summary').click();
  const md = await downloadOf('事前確認をMarkdownで保存');
  assert.match(md.name, /^プレビュー反映事前確認_.*\.md$/);
  assert.match(md.text, /^# プレビュー反映 一括事前確認/);
  assert.match(md.text, /- 反映元: .*\(?App 101/);
  assert.match(md.text, /- 反映する項目: フィールド設定、レイアウト設定、ビュー設定/);
  assert.match(md.text, /読み取りだけの確認です。反映先のプレビューにも書き込んでいません。/);
  assert.match(md.text, /\| 差分あり \| 3 \|[\s\S]*\| 差分なし（一致） \| 2 \|[\s\S]*\| 確認が必要 \| 1 \|[\s\S]*\| 合計 \| 6 \|/);
  assert.match(md.text, /\| #205 \| 営業所205 \| 確認が必要 \| ビュー設定 \| 1 \| 0 \| なし \| .*種類が異なります/);
  assert.match(md.text, /\| #206 \| 営業所206 \| 差分あり \| フィールド設定、ビュー設定 \| 3 \| 1 \| あり（ビュー設定） \| 参照先変換の候補あり \|/);
  assert.doesNotMatch(md.text, /SINGLE_LINE_TEXT|\{"|比較元|比較先/);
  assert.match(await status(), /事前確認の結果を プレビュー反映事前確認_.*\.md に保存しました。/);
  await button('事前確認のMarkdownをコピー').click();
  await page.waitForFunction(() => window.__copied.length === 1);
  const stripStamp = text => text.replace(/^- 作成日時: .*$/m, '');
  assert.equal(stripStamp(await page.evaluate(() => window.__copied[0])), stripStamp(md.text), 'コピーした内容は保存した内容と同じ');

  // ===== 5. 差分のない反映先を、続けて反映から外す（現在の反映先は外さない） =====
  await dropButton().click();
  assert.equal(await queueText(), '204\n205\n206', '差分なしの反映先だけを入力欄から取り除く');
  assert.deepEqual(await rowStates(), [['202', 'diff'], ['204', 'diff'], ['205', 'attention'], ['206', 'diff']], '外した反映先の行は一覧から消える');
  assert.match(await status(), /差分のない反映先 2 件を、続けて反映する反映先から外しました（残り 3 件）。/);
  assert.equal(await dropButton().isDisabled(), true, '外す反映先が無ければ押せない');
  assert.equal(await dropButton().innerText(), '差分のない反映先を外す（0 件）');
  assert.match(await page.locator('.kus-rl-detail-summary').innerText(), /続けて反映 3 件/);
  const md2 = await downloadOf('事前確認をMarkdownで保存');
  assert.match(md2.text, /## 差分がないため続けて反映から外した反映先（2 件）\n\n#203 営業所203、#207 営業所207/, '外した反映先は記録に残す');
  assert.doesNotMatch(md2.text, /\| #203 \|/, '外した反映先は結果の表に載せない');
  await noWrites('差分のない反映先を外す');

  // ===== 6. 行から、その反映先の差分確認（通常の段階 2）へ進む。書き込みは行わない =====
  await page.evaluate(() => { window.__reflectMock.mode = 'mixed'; });
  await page.locator('[data-precheck-open="205"]').click();
  await idle();
  assert.equal(await page.locator('input[aria-label="反映先アプリID"]').inputValue(), '205', '選んだ反映先を現在の反映先にする');
  assert.equal(await queueText(), '204\n202\n206', 'これまでの反映先は、選んだ反映先と入れ替えて続けて反映する反映先へ戻す（反映先の数は変えない）');
  assert.equal(await tab('差分を確認').getAttribute('aria-selected'), 'true', '通常の差分確認へ進む');
  const lastPreview = await page.evaluate(() => window.__reflectMock.previews.at(-1));
  assert.equal(lastPreview.targetAppId, '205');
  await noWrites('行からの差分確認');
  assert.match(await status(), /反映先 #205 の差分を取得しました。内容を確認してから反映してください（まだ書き込んでいません）。/);
  // 最終確認と、反映先ごとの確認は今までどおり必要
  assert.equal(await button('最終確認に進む').isVisible(), true);
  await tab('対象を選ぶ').click();
  assert.deepEqual(await rowStates(), [['205', 'attention'], ['204', 'diff'], ['202', 'diff'], ['206', 'diff']], '反映先を入れ替えても、確認済みの結果は引き続き使える（現在の反映先 → 続けて反映する順）');
  assert.equal(await page.locator('[data-precheck-row="205"]').getByText('現在の反映先').count(), 1, '現在の反映先を示す');

  // ===== 7. 入力を変えたら古い結果として扱う =====
  const staleNote = page.locator('[data-precheck-stale]');
  assert.equal(await staleNote.isHidden(), true);
  await setPreserve(false);
  assert.equal(await staleNote.isVisible(), true, '保持の設定を変えると古い結果として示す');
  assert.match(await staleNote.innerText(), /この結果は古くなっています/);
  for (const control of [dropButton(), retryButton(), button('事前確認をMarkdownで保存'), button('事前確認のMarkdownをコピー')]) assert.equal(await control.isDisabled(), true, '古い結果では外す・確認し直す・記録の操作を使えない');
  assert.equal(await runButton().isEnabled(), true, '全反映先の確認し直しはできる');
  await setPreserve(true);
  assert.equal(await staleNote.isHidden(), true, '入力を戻すと結果を使える');
  await page.getByRole('checkbox', { name: 'プロセス管理', exact: true }).check();
  assert.equal(await staleNote.isVisible(), true, '反映する項目を変えると古い結果として示す');
  await page.getByRole('checkbox', { name: 'プロセス管理', exact: true }).uncheck();
  assert.equal(await staleNote.isHidden(), true);
  await setLookup('101 → 201');
  assert.equal(await staleNote.isVisible(), true, '参照先変換を変えると古い結果として示す');
  await setLookup('');
  await page.getByRole('textbox', { name: '反映元アプリID', exact: true }).fill('105');
  assert.equal(await staleNote.isVisible(), true, '反映元を変えると古い結果として示す');
  await page.getByRole('textbox', { name: '反映元アプリID', exact: true }).fill('101');
  assert.equal(await staleNote.isHidden(), true);
  await setQueue('204\n202\n206\n208');
  assert.equal(await staleNote.isHidden(), true, '反映先を足しただけでは結果を捨てない');
  assert.match(await note().innerText(), /未確認の反映先が 1 件あります/, '確認していない反映先の数を示す');
  assert.match(await note().innerText(), /4 件を確認しました/);

  // ===== 8. 中止：確認できた分は残し、以降は「未実行（中止）」（取得失敗にしない） =====
  await reset({ precheckDelay: 120 });
  await setQueue('203\n204\n205\n206\n207\n208');
  await runButton().click();
  await page.waitForFunction(() => /全反映先の差分を確認中… [1-9]\/7 件/.test(document.querySelector('.kus-lp__status').textContent));
  await page.locator('.kus-lp__cancel').click();
  await idle();
  const cancelledStates = (await rowStates()).map(item => item[1]);
  assert.ok(cancelledStates.includes('notrun') && cancelledStates.includes('diff'), `途中の中止では確認できた行と未実行の行が並ぶ: ${cancelledStates}`);
  assert.equal(cancelledStates.includes('error'), false, '1 件の中止を失敗にしない');
  assert.match(await status(), /中止しました（\d\/7 件を確認、\d 件は未実行（中止））。確認できた分の結果は一覧にあります。書き込みは行っていません。/);
  assert.match(await page.locator('[data-precheck-summary]').innerText(), /未実行（中止） \d/);
  assert.match(await retryButton().innerText(), /^取得失敗・未実行だけ確認し直す（\d 件）$/);
  await page.evaluate(() => { window.__reflectMock.precheckDelay = 5; });
  await retryButton().click();
  await idle();
  assert.equal((await rowStates()).every(item => item[1] === 'diff'), true, '未実行だった反映先を確認し直せる');
  await noWrites('中止');

  // ===== 9. 反映元を取得できないなど、確認そのものが失敗したとき：結果を作らずエラーを示す =====
  await reset({ precheckThrows: '反映元 #101: 指定したアプリが見つかりません。' });
  await setQueue('203');
  await runButton().click();
  await idle();
  assert.match(await status(), /エラー: 反映元 #101: 指定したアプリが見つかりません。/);
  assert.equal(await page.locator('[data-precheck-result]').isVisible(), false, '反映先の取得失敗として並べない');

  // ===== 10. 1000 件でも固まらない：行は要約だけで、一覧は 50 件ずつ描画する =====
  await reset({ precheckDelay: 0, precheckPlan: Object.fromEntries(Array.from({ length: 1001 }, (_, i) => [String(2000 + i), i % 7 === 0 ? { state: 'same', changedLabels: [], changeCount: 0 } : i % 11 === 0 ? { state: 'error', reason: '権限がありません', changedLabels: [], pending: '' } : {}])) });
  await setQueue(Array.from({ length: 1000 }, (_, i) => String(2001 + i)).join('\n'));
  const started = Date.now();
  await runButton().click();
  await idle();
  const elapsed = Date.now() - started;
  assert.ok(elapsed < 30000, `1000 件の一括確認が長すぎる: ${elapsed}ms`);
  assert.match(await note().innerText(), /^1001 件を確認しました/);
  assert.equal(await rows().count(), 50, '一覧は全件を一度に描画しない');
  assert.equal(await page.locator('[data-precheck-more]').innerText(), 'さらに 50 件を表示（残り 951 件）');
  await page.locator('[data-precheck-more]').click();
  assert.equal(await rows().count(), 100);
  await filterSelect().selectOption('error');
  assert.ok(await rows().count() <= 50);
  assert.equal(await page.evaluate(() => document.querySelectorAll('#kus-reflect-lite *').length < 6000), true, 'DOM の要素数が抑えられている');
  await filterSelect().selectOption('all');
  await page.locator('[data-precheck-result] summary').click();
  const big = await downloadOf('事前確認をMarkdownで保存');
  assert.ok(big.text.split('\n').length < 1200, '1000 件の Markdown は 1 反映先 1 行');
  assert.match(big.text, /\| 合計 \| 1001 \|/);

  // ===== 11. 画面幅：320〜1440px で横にはみ出さず、操作が重ならない =====
  await reset({ precheckDelay: 0, precheckPlan: {
    '203': { state: 'same', changedLabels: [] },
    '204': { state: 'error', reason: '反映先 #204: 権限がありません。反映先のアプリ管理権限を確認してください。'.repeat(2), changedLabels: [], pending: '' },
    '205': { state: 'attention', attentionLabels: ['フィールド設定', 'レイアウト設定'], reason: 'フィールド設定: customer: 種類が異なります（NUMBER → SINGLE_LINE_TEXT）。既存項目の種類はこの反映では変更できません。', changedLabels: ['ビュー設定'], pending: 'pending', pendingLabels: ['フィールド設定', 'ビュー設定', 'JS/CSS設定', 'プロセス管理'] }
  } });
  await setQueue('203\n204\n205');
  await runButton().click();
  await idle();
  for (const [width, height] of [[1440, 1000], [1024, 768], [720, 450], [390, 844], [320, 640]]) {
    await page.setViewportSize({ width, height });
    await tab('対象を選ぶ').click();
    await card().evaluate(el => { const canvas = el.closest('.kus-rl-canvas'); canvas.scrollTop = canvas.scrollTop + el.getBoundingClientRect().top - canvas.getBoundingClientRect().top - 8; });
    await page.screenshot({ path: path.join(out, `precheck-card-${width}.png`) });
    const geometry = await page.evaluate(() => {
      const canvas = document.querySelector('.kus-rl-canvas'), box = document.querySelector('[data-precheck="card"]').getBoundingClientRect();
      const inside = Array.from(document.querySelectorAll('[data-precheck="card"] button, [data-precheck="card"] select, [data-precheck-row]')).filter(el => el.offsetParent).map(el => el.getBoundingClientRect());
      const buttons = Array.from(document.querySelectorAll('[data-precheck="card"] > .kus-lp__card-body button, [data-precheck-result] button')).filter(el => el.offsetParent).map(el => el.getBoundingClientRect());
      const overlap = buttons.some((a, i) => buttons.some((b, j) => i < j && a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1));
      return { overflow: canvas.scrollWidth - canvas.clientWidth, outside: inside.some(r => r.right > box.right + 1 || r.left < box.left - 1), overlap, rowOverflow: Math.max(...Array.from(document.querySelectorAll('[data-precheck-row]')).map(el => el.scrollWidth - el.clientWidth)) };
    });
    assert.ok(geometry.overflow <= 1 && !geometry.outside && !geometry.overlap && geometry.rowOverflow <= 1, `${width}pxで全反映先の事前確認が崩れる: ${JSON.stringify(geometry)}`);
  }
  // キーボードだけで、一覧から差分確認へ進める
  await page.setViewportSize({ width: 1440, height: 1000 });
  await tab('対象を選ぶ').click();
  await page.locator('[data-precheck-open="205"]').focus();
  await page.keyboard.press('Enter');
  await idle();
  assert.equal(await page.locator('input[aria-label="反映先アプリID"]').inputValue(), '205', 'キーボードの Enter で行の操作を実行できる');

  // ===== 12. 参照先変換の候補（差分確認） =====
  const candidates = {
    candidates: [{ from: '101', to: '201', total: 3, sources: ['ルックアップ「customer」', '関連レコード一覧「rel」', 'アクション「コピー」'] }],
    conflicts: [{ from: '102', targets: [{ to: '202', total: 1, sources: ['ルックアップ「a」'] }, { to: '203', total: 2, sources: ['ルックアップ「b」', 'ルックアップ「c」'] }] }]
  };
  await reset({ lookupCandidates: candidates });
  await page.evaluate(() => { window.__reflectMock.apps['201'] = { name: '本番マスタ' }; });
  await button('差分を確認する').click();
  await idle();
  const box = page.locator('[data-lookup-candidates]');
  assert.equal(await box.count(), 1, '参照先変換の候補を差分確認に示す');
  assert.match(await box.innerText(), /参照先変換の候補があります/);
  assert.match(await box.innerText(), /参照先変換に入れずに反映すると、反映先の参照先が反映元のアプリに書き換わります。/);
  await page.waitForFunction(() => /101（営業テンプレート） → 201（本番マスタ）/.test(document.querySelector('[data-lookup-candidates]').textContent));
  assert.match(await box.locator('[data-lookup-candidate="101>201"]').innerText(), /^101（営業テンプレート） → 201（本番マスタ）（ルックアップ「customer」、関連レコード一覧「rel」、アクション「コピー」）$/);
  assert.match(await box.locator('[data-lookup-conflict="102"]').innerText(), /^102 → 202（東京営業所） または 203：反映先の参照先が一致していません（202: ルックアップ「a」 \/ 203: ルックアップ「b」、ルックアップ「c」）。自動では入れません。参照先変換に自分で入力してください。$/, '食い違いは自動では入れない');
  assert.equal(await page.evaluate(() => window.__reflectMock.applies.length), 0);
  await page.screenshot({ path: path.join(out, 'lookup-candidates-1440.png') });
  // 利用者が既に入れた変換は上書きしない。候補を加えて差分を取り直す
  await setLookup('10 → 20\n102 = 999');
  assert.equal(await box.count(), 0, '参照先変換を変えると古い差分は使えない');
  await button('差分を再取得').click();
  await idle();
  assert.equal(await box.locator('[data-lookup-conflict]').count(), 0, '利用者が入れた旧IDは候補にも食い違いにもしない');
  assert.equal(await box.locator('[data-lookup-candidate="101>201"]').count(), 1);
  await box.getByRole('button', { name: '候補を参照先変換に追加して差分を取り直す', exact: true }).click();
  await idle();
  assert.equal(await lookupText(), '10 → 20\n102 = 999\n101 → 201', '入力済みの行を残して、候補を行で加える');
  assert.deepEqual(await page.evaluate(() => window.__reflectMock.previews.at(-1).lookupMap), { 10: '20', 102: '999', 101: '201' }, '取り直しには追加した変換を使う');
  assert.equal(await box.count(), 0, '追加すると候補は出ない');
  assert.match(await status(), /参照先変換に候補 1 件を追加して、差分を取り直しました。内容を確認してから反映してください（まだ書き込んでいません）。/);
  assert.equal(await page.evaluate(() => window.__reflectMock.applies.length), 0);

  // 食い違いだけが残るときは追加ボタンを出さず、最終確認では反映先IDの入力を求める
  await reset({ lookupCandidates: { candidates: [], conflicts: candidates.conflicts }, targetPending: undefined });
  await button('差分を確認する').click();
  await idle();
  assert.equal(await page.locator('[data-lookup-candidates]').count(), 1);
  assert.equal(await page.locator('[data-lookup-apply]').count(), 0, '加えられる候補が無ければ追加の操作を出さない');
  await page.getByRole('checkbox', { name: 'ビュー設定を反映候補に含める', exact: true }).uncheck().catch(() => {});
  await button('差分ありだけ選択').click();
  await button('最終確認に進む').click();
  assert.equal(await page.locator('#kus-rl-stage-confirm [data-lookup-candidates]').count(), 1, '最終確認にも参照先の違いを示す');
  assert.match(await page.locator('#kus-rl-stage-confirm').innerText(), /参照先変換に入れていない、参照先アプリの違いがあります（反映元の参照先アプリが、そのまま反映先に書き込まれます）。確認のため、反映先アプリIDを入力してください。/);
  await page.getByRole('checkbox', { name: '反映内容の確認', exact: true }).check();
  assert.equal(await page.getByRole('button', { name: /^確認した .* 項目を反映先プレビューへ反映/ }).isDisabled(), true, '反映先IDを入力するまで反映できない');
  await page.getByRole('textbox', { name: '確認用の反映先アプリID', exact: true }).fill('202');
  assert.equal(await page.getByRole('button', { name: /^確認した .* 項目を反映先プレビューへ反映/ }).isEnabled(), true);

  // 計画の Markdown にも注意として載せる
  await button('差分に戻る').click();
  const planMd = await downloadOf('計画をMarkdownで保存');
  assert.match(planMd.text, /## 注意: 参照先変換の候補[\s\S]*食い違い（自動では入れません）: 102 → 202 \/ 203/);

  // 候補が無ければ何も出さない
  await reset();
  await button('差分を確認する').click();
  await idle();
  assert.equal(await page.locator('[data-lookup-candidates]').count(), 0);

  // 320px でも崩れない
  await reset({ lookupCandidates: candidates });
  await button('差分を確認する').click();
  await idle();
  for (const [width, height] of [[1024, 768], [390, 844], [320, 640]]) {
    await page.setViewportSize({ width, height });
    await page.locator('[data-lookup-candidates]').evaluate(el => { const canvas = el.closest('.kus-rl-canvas'); canvas.scrollTop = canvas.scrollTop + el.getBoundingClientRect().top - canvas.getBoundingClientRect().top - 8; });
    await page.screenshot({ path: path.join(out, `lookup-candidates-${width}.png`) });
    const geometry = await page.evaluate(() => {
      const canvas = document.querySelector('.kus-rl-canvas'), box = document.querySelector('[data-lookup-candidates]').getBoundingClientRect();
      const button = document.querySelector('[data-lookup-apply]').getBoundingClientRect();
      return { overflow: canvas.scrollWidth - canvas.clientWidth, outside: button.right > box.right + 1 || button.left < box.left - 1, items: Math.max(...Array.from(document.querySelectorAll('[data-lookup-candidates] li')).map(el => el.scrollWidth - el.clientWidth)) };
    });
    assert.ok(geometry.overflow <= 1 && !geometry.outside && geometry.items <= 1, `${width}pxで参照先変換の候補が崩れる: ${JSON.stringify(geometry)}`);
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  // ===== 13. 閉じて開き直したとき（スクリプトを読み込み直す）：入力・続けて反映する反映先・事前確認の結果・プリセットを引き継ぐ =====
  await reset({ precheckPlan: { '204': { state: 'error', reason: '権限がありません', changedLabels: [] } } });
  await setQueue('203\n204');
  await inDetail(async () => {
    await page.locator('input[aria-label="プリセット名"]').fill('営業所展開');
    await button('現在の設定を保存').click();
  });
  await runButton().click();
  await idle();
  assert.deepEqual(await rowStates(), [['202', 'diff'], ['203', 'diff'], ['204', 'error']]);
  await button('閉じる').click();
  assert.equal(await page.locator('#kus-reflect-lite').count(), 0, '閉じるとパネルが消える');
  await page.addScriptTag({ content: script });
  await page.evaluate(() => ReflectHarness.mountReflectLitePanel());
  assert.equal(await page.getByRole('textbox', { name: '反映元アプリID', exact: true }).inputValue(), '101', 'スクリプトを読み込み直しても、反映元の入力を引き継ぐ');
  assert.equal(await queueText(), '203\n204', '続けて反映する反映先を引き継ぐ');
  assert.deepEqual(await rowStates(), [['202', 'diff'], ['203', 'diff'], ['204', 'error']], '事前確認の結果を引き継ぐ');
  assert.equal(await page.locator('[data-precheck-stale]').isHidden(), true, '入力が同じなら結果は古くならない');
  await inDetail(async () => { assert.equal(await page.locator('select[aria-label="保存済みプリセット"]').inputValue(), '営業所展開', 'プリセットを引き継ぐ'); });
  assert.deepEqual(errors, [], 'ブラウザのエラーが出ていない');
};
