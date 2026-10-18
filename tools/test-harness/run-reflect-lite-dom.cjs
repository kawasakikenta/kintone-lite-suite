#!/usr/bin/env node
'use strict';

// UI と操作契約を、反映エンジンだけを差し替えた合成データで検証する。
// 実アプリ・外部 API への通信や書き込みは行わない。
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '../..');
const TOOL = path.join(ROOT, 'tools/統合ツール');
const OUT = path.join(ROOT, '.iter-shots/reflect-lite-dom');
const esbuild = require(path.join(TOOL, 'node_modules/esbuild'));
const mockEngine = `
  export function reflectConnectionError(opts) { return !opts.targetAppId || (!opts.sourceAppId && !opts.sourceBundle) ? 'アプリIDが未入力です' : ''; }
  export async function resolveReflectAppsStandalone(opts) {
    return { source: { appId: opts.sourceAppId, name: '営業テンプレート', guestId: opts.sourceGuestId || '' }, target: { appId: opts.targetAppId, name: '東京営業所', guestId: opts.targetGuestId || '' } };
  }
  export async function previewReflectStandalone(opts, progress) {
    const mock = window.__reflectMock;
    mock.previews.push(opts);
    progress('サンプルデータを比較中…');
    await new Promise(resolve => setTimeout(resolve, 160));
    if (mock.mode === 'preview-failure') throw new Error('サンプル取得エラー');
    const names = { fieldSettings: 'フィールド設定', layoutSettings: 'レイアウト設定', viewSettings: 'ビュー設定' };
    const entries = opts.scopes.map((sectionKey, i) => {
      const status = mock.mode === 'same' ? 'same' : sectionKey === 'layoutSettings' ? 'same' : sectionKey === 'viewSettings' ? 'error' : 'change';
      return { sectionKey, label: names[sectionKey] || sectionKey, status,
        behavior: '追加・更新', blockers: status === 'error' ? ['反映先の取得失敗'] : [], warnings: [], operations: [], requiredFields: [],
        changes: status === 'change' ? [{kind: '変更', path: 'フィールド / 顧客名 / 必須', before: 'false', after: 'true'}] : [], changeCount: status === 'change' ? 1 : 0, removalCount: 0,
        message: status === 'change' ? '入力欄のラベルと必須設定が変更されています。' : status === 'same' ? '設定は一致しています。' : '反映先の取得に失敗しました。アクセス権を確認してください。',
        ...(sectionKey === 'fieldSettings' ? { fieldStats: { add: 2, update: 3, tgtOnly: 1 } } : {}) };
    });
    return { sourceFieldCodes: [], targetFieldCodes: [], baseline: { connection: 'sample-' + opts.targetAppId, source: {}, target: {} }, entries, totalSections: entries.length, changedSections: entries.filter(e => e.status === 'change').length,
      sameSections: entries.filter(e => e.status === 'same').length, errorSections: entries.filter(e => e.status === 'error').length };
  }
  export async function preflightLookupMapStandalone() { return { ok: true, missing: [] }; }
  export async function runApplyPreviewStandalone(opts, status, progress) {
    const mock = window.__reflectMock;
    mock.applies.push(opts);
    await new Promise(resolve => setTimeout(resolve, 100));
    const longToken = 'X'.repeat(260);
    const sections = opts.scopes.map((sectionKey, i) => ({ sectionKey, label: sectionKey,
      status: mock.mode === 'partial' ? i === 0 ? 'ng' : 'pending' : 'ok',
      ...(mock.mode === 'partial' && i === 0 ? { message: 'フィールド「顧客コード」が見つかりません（GAIA_IL26）\\n再実行前に確認してください。\\n' + longToken } : {}) }));
    progress(['サンプルの反映ログです。実アプリには書き込んでいません。']);
    return { sections, logs: [] };
  }
`;

async function bundle() {
  const result = await esbuild.build({
    absWorkingDir: TOOL, entryPoints: ['src/entries/reflect-lite-ui.ts'], bundle: true, write: false,
    format: 'iife', globalName: 'ReflectHarness', platform: 'browser', target: ['chrome110'], logLevel: 'silent',
    plugins: [{ name: 'reflect-fixtures', setup(build) {
      build.onResolve({ filter: /reflect-standalone\.js$/ }, () => ({ path: 'reflect-engine', namespace: 'fixture' }));
      build.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({
        contents: `export { reflectResultMatchesOptions } from ${JSON.stringify(path.join(TOOL, 'src/tabs/reflect-standalone.ts'))};\n` + mockEngine,
        loader: 'js', resolveDir: TOOL
      }));
    } }]
  });
  return result.outputFiles[0].text;
}

const fixture = `
window.__reflectMock = { previews: [], applies: [], mode: 'mixed', lookups: [], lookupDelay: {},
  apps: { '101': { name: '営業テンプレート', code: 'sales' }, '202': { name: '東京営業所', code: '' }, '303': { name: '旧名称アプリ' }, '404': { name: '検証環境アプリ' }, '505': { name: '大阪営業所' } } };
window.kintone = { app: { getId: () => 202 }, api: Object.assign(async (url, method, params) => {
  const mock = window.__reflectMock;
  if (/\\/app\\.json$/.test(url)) {
    mock.lookups.push({ url, method, params });
    const delay = mock.lookupDelay[params.id] || 0;
    if (delay) await new Promise(resolve => setTimeout(resolve, delay));
    const app = mock.apps[params.id];
    if (!app) throw Object.assign(new Error('アプリが見つかりません'), { code: 'GAIA_AP01' });
    return { appId: String(params.id), name: app.name, code: app.code || '' };
  }
  return {};
}, { url: p => p }) };
`;

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const script = await bundle();
  const demo = '<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>プレビュー反映 · 操作デモ</title><body style="background:#e8edf3"><script>' + fixture + script.replace(/<\/script/gi, '<\\/script') + '\nReflectHarness.mountReflectLitePanel();document.querySelector(".kus-lp__subtitle").textContent="操作デモ · サンプルデータのみ。実アプリへの通信・書き込みは行いません。";const demoSource=document.querySelector("[aria-label=反映元アプリID]");demoSource.value="101";demoSource.dispatchEvent(new Event("input"));Array.from(document.querySelectorAll("button")).find(b=>b.textContent==="フォームのみ").click();</script></body></html>';
  fs.writeFileSync(path.join(OUT, 'demo.html'), demo);
  const browserName = process.argv.includes('--browser') ? process.argv[process.argv.indexOf('--browser') + 1] : 'chrome';
  const browser = await chromium.launch({ headless: true, ...(browserName === 'chromium' ? {} : { channel: browserName }) });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/*', route => route.abort());
  async function reset(mode = 'mixed') {
    await page.setContent('<!doctype html><html lang="ja"><meta charset="utf-8"><body style="background:#e8edf3"></body></html>');
    await page.evaluate(fixture);
    await page.evaluate(mode => { window.__reflectMock.mode = mode; }, mode);
    await page.addScriptTag({ content: script });
    await page.evaluate(() => ReflectHarness.mountReflectLitePanel());
  }
  const button = name => page.getByRole('button', { name, exact: true });
  const tab = name => page.getByRole('tab', { name: new RegExp(name) });
  const run = () => button('最終確認に進む');
  const applyButton = () => page.getByRole('button', { name: /^確認した .* 項目をプレビューへ反映/ });
  async function execute() {
    await run().click();
    assert.equal(await applyButton().isDisabled(), true, '確認前は書き込み不可');
    await page.getByRole('checkbox', { name: '反映内容の確認', exact: true }).check();
    const idCheck = page.getByRole('textbox', { name: '確認用の反映先アプリID', exact: true });
    if (await idCheck.isVisible()) {
      await idCheck.fill('wrong'); assert.equal(await applyButton().isDisabled(), true);
      await idCheck.fill(await page.evaluate(() => document.querySelector('[aria-label="反映先アプリID"]').value));
      const count = await page.evaluate(() => window.__reflectMock.applies.length);
      await idCheck.press('Enter'); assert.equal(await page.evaluate(() => window.__reflectMock.applies.length), count, '確認IDのEnterで書き込まない');
    }
    // 反映中に再起動しても実行中のパネルを置き換えない（結果を見失わせない）。
    await applyButton().evaluate(button => {
      button.click(); button.click();
      window.__runningPanel = document.getElementById('kus-reflect-lite');
      ReflectHarness.mountReflectLitePanel();
    });
    await idle();
    assert.equal(await page.evaluate(() => document.getElementById('kus-reflect-lite') === window.__runningPanel), true, '反映中の再起動で実行中のパネルを残す');
  }
  async function idle() { await page.waitForFunction(() => document.querySelector('#kus-reflect-lite').getAttribute('aria-busy') !== 'true'); }
  // この画面の利用者向け表示（文言・aria-label・placeholder・title）に「比較元／比較先」が残っていないこと。
  async function assertNoLegacyTerms(where) {
    const found = await page.evaluate(() => {
      const root = document.querySelector('#kus-reflect-lite');
      const texts = [root.textContent];
      root.querySelectorAll('[aria-label],[placeholder],[title]').forEach(el => texts.push(el.getAttribute('aria-label') || '', el.getAttribute('placeholder') || '', el.getAttribute('title') || ''));
      return texts.join('\n').match(/比較[元先]/g) || [];
    });
    assert.deepEqual(found, [], `${where}に「比較元／比較先」が残っている`);
  }
  const noteText = index => page.locator('.kus-rl-app-note').nth(index).innerText();
  async function noteIs(index, pattern, message) {
    try { await page.waitForFunction(([i, source]) => new RegExp(source).test(document.querySelectorAll('.kus-rl-app-note')[i].textContent), [index, pattern.source], { timeout: 4000 }); }
    catch (error) { assert.fail(`${message || 'アプリ名の表示'}: ${pattern} / 実際: ${await noteText(index)}`); }
  }
  const lookupLog = () => page.evaluate(() => window.__reflectMock.lookups.map(item => `${item.url}?id=${item.params.id}`));
  async function setup() {
    await page.getByRole('textbox', { name: '反映元アプリID', exact: true }).fill('101');
    await button('フォームのみ').click();
  }
  async function compare() { await button('差分を確認する').click(); await idle(); }
  try {
    await reset();
    assert.equal(await button('差分を確認する').isDisabled(), true);
    assert.match(await page.locator('.kus-rl-dock-copy').innerText(), /次に進むには：アプリIDが未入力です/, '進めない理由を表示する');
    assert.equal(await run().count(), 0, '設定時に反映ボタンを見せない');
    assert.equal(await page.getByRole('textbox', { name: '反映元ゲストスペースID', exact: true }).count(), 0);
    await tab('反映結果').click();
    assert.match(await page.locator('#kus-rl-stage-result').innerText(), /まだ反映していません/);
    await tab('対象を選ぶ').click();
    const sourceInput = page.getByRole('textbox', { name: '反映元アプリID', exact: true });
    await sourceInput.fill('https://example.cybozu.com/k/guest/7/101/?view=20');
    await sourceInput.press('Tab');
    assert.equal(await sourceInput.inputValue(), '101', 'URLからアプリIDを読み取る');
    const sourceGuest = page.getByRole('textbox', { name: '反映元ゲストスペースID', exact: true });
    assert.equal(await sourceGuest.inputValue(), '7', 'URLからゲストスペースIDを読み取る');
    await sourceInput.fill('https://example.cybozu.com/k/101/');
    await sourceInput.press('Tab');
    assert.equal(await sourceGuest.inputValue(), '', '通常スペースのURLでは以前のゲストスペースIDを残さない');
    await sourceGuest.fill('');
    await button('全解除').click();
    assert.match(await page.locator('.kus-rl-dock-copy').innerText(), /項目を 1 つ以上選んでください/, '項目未選択の理由を表示する');
    await setup();
    await page.getByText('詳細設定 · 自動バックアップ / 参照先変換', { exact: true }).click();
    await page.getByText('Lookup AppID マッピング（任意）', { exact: true }).click();
    const lookup = page.getByRole('textbox', { name: 'ルックアップの参照アプリID変換', exact: true });
    await lookup.fill('abc');
    assert.equal(await button('差分を確認する').isDisabled(), true, '参照先変換の誤りでは進めない');
    assert.match(await page.locator('.kus-rl-dock-copy').innerText(), /参照先変換/, '参照先変換の誤りを理由として表示する');
    await lookup.fill('10 → 20');
    assert.match(await page.locator('.kus-rl-lookup-status').innerText(), /参照先変換 1 件/, '行形式の参照先変換を件数で示す');
    assert.equal(await button('差分を確認する').isEnabled(), true);
    await page.getByText('よく使う設定を保存・読み込み', { exact: true }).click();
    assert.equal(await button('現在の設定を保存').isDisabled(), true, '名前なしでは保存できない');
    await page.getByRole('textbox', { name: 'プリセット名', exact: true }).fill('営業所展開');
    await button('現在の設定を保存').click();
    const presetSelect = page.getByRole('combobox', { name: '保存済みプリセット', exact: true });
    assert.equal(await presetSelect.inputValue(), '営業所展開');
    const presetDownloadPromise = page.waitForEvent('download');
    await button('JSONで書き出し').click();
    const presetDownload = await presetDownloadPromise;
    assert.match(presetDownload.suggestedFilename(), /^プレビュー反映プリセット_/);
    const exportedPresets = JSON.parse(await fs.promises.readFile(await presetDownload.path(), 'utf8'));
    assert.equal(exportedPresets.kind, 'reflect-presets');
    assert.equal(exportedPresets.presets[0].name, '営業所展開');
    assert.equal(exportedPresets.presets[0].lookupMap, '10 → 20');
    assert.equal(exportedPresets.presets[0].preserveTargetOnly, true);
    await page.getByLabel('プリセットJSON', { exact: true }).setInputFiles({ name: 'presets.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ kind: 'reflect-presets', presets: [{ name: '検証環境', source: { appId: '101' }, target: { appId: '404' }, scopes: ['fieldSettings', 'viewSettings'], lookupMap: '', preserveTargetOnly: false }] })) });
    await idle();
    await presetSelect.selectOption('検証環境');
    await button('読み込み').click();
    assert.equal(await page.getByRole('textbox', { name: '反映先アプリID', exact: true }).inputValue(), '404', 'JSONから読み込んだプリセットを適用する');
    assert.equal(await page.getByRole('checkbox', { name: '反映先だけの一覧・グラフ・アクションを保持する', exact: true }).isChecked(), false, 'プリセットの保持設定を適用する');
    await presetSelect.selectOption('営業所展開');
    await button('読み込み').click();
    assert.equal(await page.getByRole('textbox', { name: '反映先アプリID', exact: true }).inputValue(), '202', '保存したプリセットで条件を戻せる');
    assert.equal(await lookup.inputValue(), '10 → 20');
    await button('差分を確認する').evaluate(b => { b.click(); b.click(); });
    assert.equal(await page.getByRole('textbox', { name: '反映元アプリID', exact: true }).isDisabled(), true);
    await idle();
    assert.equal(await page.evaluate(() => window.__reflectMock.previews.length), 1, '二重比較を防ぐ');
    assert.deepEqual(await page.evaluate(() => window.__reflectMock.previews[0].lookupMap), { '10': '20' }, '行形式の参照先変換を比較に渡す');
    assert.equal(await page.evaluate(() => window.__reflectMock.applies.length), 0, '差分確認では書き込まない');
    assert.equal(await run().isDisabled(), true, '取得失敗は暗黙に除外せず確認を止める');
    assert.equal(await button('閉じる').isEnabled(), true, '比較完了後はパネルを閉じられる');
    assert.match(await page.locator('#kus-rl-stage-review').innerText(), /取得失敗/);
    await assertNoLegacyTerms('差分確認画面');
    const filter = page.getByRole('combobox', { name: '差分の状態で絞り込み' });
    await filter.selectOption('error');
    assert.equal(await page.getByRole('checkbox', { name: 'ビュー設定を反映候補に含める', exact: true }).count(), 1);
    assert.equal(await page.getByRole('checkbox', { name: 'フィールド設定を反映候補に含める', exact: true }).count(), 0);
    await page.getByRole('checkbox', { name: 'ビュー設定を反映候補に含める', exact: true }).uncheck();
    await filter.selectOption('change');
    const field = page.getByRole('checkbox', { name: 'フィールド設定を反映候補に含める', exact: true });
    await field.uncheck();
    assert.equal(await run().isDisabled(), true, '0件では反映できない');
    assert.equal(await field.evaluate(e => e === document.activeElement), true, '再描画後もフォーカスを保つ');
    await field.check();
    assert.equal(await run().isEnabled(), true, '比較済みの範囲で選び直せる');
    assert.equal(await page.evaluate(() => window.__reflectMock.previews.length), 1);
    await page.getByRole('searchbox', { name: '差分を検索' }).fill('設定');
    await page.getByRole('searchbox', { name: '差分を検索' }).press('Enter');
    assert.equal(await page.evaluate(() => window.__reflectMock.applies.length), 0, '検索Enterで反映しない');
    await page.getByRole('searchbox', { name: '差分を検索' }).fill('');
    await filter.selectOption('all');
    await page.screenshot({ path: path.join(OUT, 'review-desktop.png') });
    await button('差分ありだけ選択').click();
    assert.equal(await run().isEnabled(), true);
    await button('対象を変更').click();
    await page.getByRole('textbox', { name: '反映先アプリID', exact: true }).fill('303');
    await tab('差分を確認').click();
    assert.equal(await run().isDisabled(), true, '接続変更で確認済み状態を解除');
    await button('差分を再取得').click();
    await idle();
    page.on('dialog', async dialog => { await dialog.accept(dialog.type() === 'prompt' ? dialog.message().match(/「(\d+)」/)?.[1] : undefined); });
    await execute();
    await idle();
    assert.equal(await page.evaluate(() => window.__reflectMock.applies.length), 1);
    assert.equal(await page.evaluate(() => window.__reflectMock.applies[0].targetAppId), '303');
    assert.equal(await page.evaluate(() => window.__reflectMock.applies[0].doDeploy), false);
    assert.equal(await page.evaluate(() => window.__reflectMock.applies[0].reviewBaseline.connection), 'sample-303', '確認した比較結果の基準を反映処理へ渡す');
    assert.match(await page.locator('#kus-rl-stage-result').innerText(), /全成功/);
    await assertNoLegacyTerms('反映結果画面');
    const successItems = page.locator('#kus-rl-stage-result .kus-rl-result-item');
    assert.equal(await successItems.count(), 1, '反映結果にセクション別の一覧を出す');
    assert.match(await successItems.first().innerText(), /成功[\s\S]*フィールド設定/, '成功した項目を文字と項目名で示す');
    assert.match(await page.locator('#kus-rl-stage-result').innerText(), /取り消す場合: .*『変更を中止』.*『設定JSONから取得』/, '反映後の取り消し方を案内する');
    assert.equal(await button('反映先の設定画面を開く').isVisible(), true);
    assert.equal(await button('比較先の設定画面を開く').count(), 0);
    const downloadPromise = page.waitForEvent('download');
    await button('実行結果JSONを保存').click();
    const resultDownload = await downloadPromise;
    assert.match(resultDownload.suggestedFilename(), /^プレビュー反映結果_App303_/);
    const resultReport = JSON.parse(await fs.promises.readFile(await resultDownload.path(), 'utf8'));
    assert.deepEqual(resultReport.summary, { ok: 1, ng: 0, pending: 0 });
    assert.equal(resultReport.target.appId, '303');
    assert.equal(resultReport.target.environment, 'preview');
    assert.deepEqual(resultReport.scopes, ['fieldSettings']);
    assert.equal(resultReport.sections[0].status, 'ok');
    await tab('差分を確認').click();
    assert.equal(await run().isDisabled(), true, '反映後に古い差分を再実行しない');
    await tab('反映結果').click();
    await page.evaluate(() => { window.__reflectMock.mode = 'same'; });
    await button('反映後の差分を再確認').click(); await idle();
    assert.equal(await tab('差分を確認').getAttribute('aria-selected'), 'true', '再確認後は差分画面を表示する');
    assert.match(await page.locator('#kus-rl-stage-review').innerText(), /1 項目はすべて反映元と一致/, '反映後の再確認で一致を表示する');
    assert.equal(await page.evaluate(() => window.__reflectMock.applies.length), 1, '再確認では書き込まない');
    assert.equal(await run().isDisabled(), true);

    await tab('対象を選ぶ').click();
    await page.getByRole('textbox', { name: '反映先アプリID', exact: true }).fill('404');
    await tab('反映結果').click();
    assert.match(await page.locator('.kus-lp__status').innerText(), /まだ反映していません/, '対象変更後は現在の条件で再確認が必要と案内する');
    assert.doesNotMatch(await page.locator('#kus-rl-stage-result').innerText(), /全成功|サンプルの反映ログ|実行ログ/, '旧対象の成功結果と実行ログを表示しない');
    assert.notEqual(await page.locator('.kus-lp__status').getAttribute('data-tone'), 'ok', '旧対象の確認成功ステータスを残さない');
    assert.equal(await button('実行結果JSONを保存').isVisible(), false, '別対象の結果を現在の結果として保存させない');
    assert.equal(await page.evaluate(() => window.__reflectMock.applies.length), 1, '対象変更や結果表示では書き込まない');

    await reset('same'); await setup(); await compare();
    assert.equal(await run().isDisabled(), true);
    await reset('partial'); await setup();
    await page.getByRole('checkbox', { name: 'プロセス管理', exact: true }).check();
    await compare(); await button('差分ありだけ選択').click(); await execute(); await idle();
    assert.match(await page.locator('#kus-rl-stage-result').innerText(), /一部エラー/);
    const partialItems = page.locator('#kus-rl-stage-result .kus-rl-result-item');
    assert.equal(await partialItems.count(), 2, '失敗と未実行をセクション別に示す');
    const failedItem = partialItems.first();
    assert.match(await failedItem.innerText(), /失敗/);
    assert.match(await failedItem.innerText(), /フィールド設定/, 'セクションキーではなく項目名を示す');
    assert.match(await failedItem.locator('.kus-rl-result-item__message').innerText(), /顧客コード.*見つかりません[\s\S]*再実行前に確認してください/, '失敗メッセージを改行を保って示す');
    assert.equal(await failedItem.locator('.kus-rl-result-item__message').evaluate(el => getComputedStyle(el).whiteSpace), 'pre-wrap');
    assert.match(await failedItem.locator('.kus-rl-result-item__hint').innerText(), /ヒント: 反映先に存在しないフィールドを参照しています/, '失敗には対処のヒントを付ける');
    assert.match(await partialItems.nth(1).innerText(), /未実行[\s\S]*プロセス管理/);
    assert.equal(await partialItems.nth(1).locator('.kus-rl-result-item__hint').count(), 0, '未実行にはヒントを付けない');
    for (const [width, height] of [[1440, 1000], [390, 844], [320, 640]]) {
      await page.setViewportSize({ width, height });
      await page.screenshot({ path: path.join(OUT, `result-${width}.png`) });
      const overflow = await page.evaluate(() => ({ canvas: document.querySelector('.kus-rl-canvas').scrollWidth - document.querySelector('.kus-rl-canvas').clientWidth,
        item: Math.max(...Array.from(document.querySelectorAll('.kus-rl-result-item')).map(el => el.scrollWidth - el.clientWidth)) }));
      assert.ok(overflow.canvas <= 1 && overflow.item <= 1, `${width}pxで長い失敗メッセージがはみ出す: ${JSON.stringify(overflow)}`);
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    assert.equal(await button('失敗・未実行だけ選択').isVisible(), true);
    await button('失敗・未実行だけ選択').click();
    assert.equal(await tab('対象を選ぶ').getAttribute('aria-selected'), 'true');

    await reset(); await setup();
    await page.getByRole('combobox', { name: '反映元の取得方法' }).selectOption('json');
    assert.equal(await button('差分を確認する').isDisabled(), true, 'JSON未読込では以前のアプリIDで比較しない');
    await page.getByLabel('反映元の設定JSON', { exact: true }).setInputFiles({ name: 'settings.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ appId: '901', sections: { fieldSettings: { properties: {} } } })) });
    await idle();
    assert.equal(await page.getByLabel('反映元の設定JSON', { exact: true }).evaluate(input => input.files.length), 0, '同じJSONを編集して選び直せるよう選択状態を空に戻す');
    assert.match(await page.getByText(/反映元JSON読み込み済み/).first().innerText(), /settings\.json/, '読み込んだファイル名を表示する');
    assert.equal(await button('差分を確認する').isEnabled(), true);
    await compare();
    assert.equal(await page.evaluate(() => window.__reflectMock.previews[0].sourceBundle.appId), '901');
    await button('差分ありだけ選択').click(); await execute(); await idle();
    assert.match(await page.locator('#kus-rl-stage-result').innerText(), /全成功/);
    await tab('対象を選ぶ').click();
    await page.getByLabel('反映元の設定JSON', { exact: true }).setInputFiles({ name: 'replacement.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ appId: '901', sections: { fieldSettings: { properties: { updated: { type: 'SINGLE_LINE_TEXT', code: 'updated' } } } } })) });
    await idle();
    await tab('反映結果').click();
    assert.equal(await button('実行結果JSONを保存').isVisible(), false, '同じアプリの別JSONに差し替えても古い実行結果を保存させない');
    assert.doesNotMatch(await page.locator('#kus-rl-stage-result').innerText(), /全成功|サンプルの反映ログ/, '同じアプリのJSON差替えで旧結果とログを消す');
    assert.equal(await page.evaluate(() => window.__reflectMock.applies.length), 1, 'JSON差替えだけでは書き込まない');
    await tab('対象を選ぶ').click();
    await page.getByLabel('反映元の設定JSON', { exact: true }).setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{bad') });
    await idle();
    assert.equal(await button('差分を確認する').isDisabled(), true, '不正なJSONの読込失敗後に古いJSONを使用しない');
    assert.match(await page.locator('.kus-lp__status-text').first().innerText(), /JSON形式が不正/, '不正なJSONは日本語で理由を示す');
    await page.getByLabel('反映元の設定JSON', { exact: true }).setInputFiles({ name: 'apps.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ apps: [{ appId: '901', sections: {} }, { appId: '902', sections: {} }] })) });
    await idle();
    await page.getByRole('combobox', { name: '設定JSON内の反映元アプリ', exact: true }).selectOption('1');
    await compare();
    assert.equal(await page.evaluate(() => window.__reflectMock.previews.at(-1).sourceBundle.appId), '902', '複数アプリJSONから明示的に反映元を選べる');

    await reset('preview-failure'); await setup(); await compare();
    assert.match(await page.locator('.kus-lp__status').innerText(), /サンプル取得エラー/);
    assert.equal(await button('差分を確認する').isEnabled(), true, '取得失敗後も再試行できる');

    await reset(); await setup(); await compare();
    await page.evaluate(() => { window.__reflectMock.mode = 'preview-failure'; });
    await button('差分を再取得').click(); await idle();
    assert.equal(await run().isDisabled(), true, '再取得失敗後に過去の差分で反映しない');

    // ---- 入力中のアプリ名確認（進行はブロックしない） ----
    await reset();
    await assertNoLegacyTerms('対象を選ぶ画面');
    const sourceId = page.getByRole('textbox', { name: '反映元アプリID', exact: true });
    assert.equal(await page.locator('.kus-rl-app-note').nth(0).getAttribute('aria-live'), 'polite', '反映元の確認結果を読み上げ対象にする');
    assert.equal(await page.locator('.kus-rl-app-note').nth(1).getAttribute('aria-live'), 'polite', '反映先の確認結果を読み上げ対象にする');
    assert.match(await noteText(1), /· 開いているアプリ|✓ 東京営業所 · 開いているアプリ/, '開いているアプリを示す');
    await noteIs(1, /✓ 東京営業所 · 開いているアプリ/, '開いているアプリでも名前を確認する');
    assert.equal(await noteText(0), '', '未入力の反映元には何も出さない');
    await sourceId.fill('505');
    assert.match(await noteText(0), /確認中…/, '問い合わせ中は「確認中…」を示す');
    await noteIs(0, /^✓ 大阪営業所$/, 'コードが無ければ名前だけ示す');
    assert.deepEqual((await lookupLog()).filter(entry => entry.endsWith('id=505')), ['/k/v1/app.json?id=505'], '本番側のアプリ情報を問い合わせる');
    await sourceId.fill('101');
    await noteIs(0, /✓ 営業テンプレート（コード: sales）/, 'アプリ名とコードを示す');
    assert.equal(await page.locator('.kus-rl-app-note').nth(0).evaluate(el => el.classList.contains('kus-rl-app-note--ok')), true);
    // 続けて入力しても、確定した ID だけを問い合わせる。確認に失敗しても進行はブロックしない。
    await sourceId.fill('9'); await sourceId.fill('99'); await sourceId.fill('909');
    await noteIs(0, /アプリを確認できません。ID・ゲストスペース・閲覧権限を確認してください。/, '確認できないIDを警告する');
    assert.equal(await page.locator('.kus-rl-app-note').nth(0).evaluate(el => el.classList.contains('kus-rl-app-note--warn')), true, '警告色で示す');
    assert.deepEqual((await lookupLog()).filter(entry => /id=(9|99|909)$/.test(entry)), ['/k/v1/app.json?id=909'], '入力途中の値を問い合わせない');
    assert.equal(await button('差分を確認する').isEnabled(), true, '確認失敗は進行をブロックしない');
    // 同じIDはキャッシュから即時に表示し、再度問い合わせない。
    const lookupsBefore = (await lookupLog()).length;
    await sourceId.fill('101');
    assert.match(await noteText(0), /✓ 営業テンプレート/, 'キャッシュ済みのIDは待たずに表示する');
    await page.waitForTimeout(600);
    assert.equal((await lookupLog()).length, lookupsBefore, '同じIDを再度問い合わせない');
    // 入力が変わった後に返ってきた古い応答は捨てる。
    await page.evaluate(() => { window.__reflectMock.lookupDelay = { '303': 900 }; });
    await sourceId.fill('303'); await page.waitForTimeout(550);
    await sourceId.fill('404'); await noteIs(0, /✓ 検証環境アプリ/, '新しい入力の結果を示す');
    await page.waitForTimeout(1000);
    assert.match(await noteText(0), /検証環境アプリ/);
    assert.doesNotMatch(await noteText(0), /旧名称アプリ/, '古い応答で表示を上書きしない');
    // ゲストスペースを指定した問い合わせ
    await page.getByText('ゲストスペースを指定', { exact: true }).first().click();
    await sourceId.fill('101');
    await page.getByRole('textbox', { name: '反映元ゲストスペースID', exact: true }).fill('7');
    await noteIs(0, /✓ 営業テンプレート/);
    assert.ok((await lookupLog()).includes('/k/guest/7/v1/app.json?id=101'), 'ゲストスペースのAPIで問い合わせる');
    // 反映元が設定JSONのときは反映元側の表示を出さず、問い合わせない。
    const lookupsInJson = (await lookupLog()).length;
    await page.getByRole('combobox', { name: '反映元の取得方法' }).selectOption('json');
    assert.equal(await page.locator('.kus-rl-app-note').nth(0).evaluate(el => el.textContent), '');
    assert.equal(await page.locator('.kus-rl-app-note').nth(0).isVisible(), false);
    await page.waitForTimeout(500);
    assert.equal((await lookupLog()).length, lookupsInJson);
    await page.getByRole('combobox', { name: '反映元の取得方法' }).selectOption('app');
    await noteIs(0, /✓ 営業テンプレート/, 'アプリ取得へ戻すと確認を再開する');
    // フッターの経路表示にも名前を出す。
    await page.getByRole('textbox', { name: '反映元ゲストスペースID', exact: true }).fill('');
    await noteIs(0, /✓ 営業テンプレート/);
    assert.match(await page.locator('.kus-rl-dock-copy').innerText(), /反映元: 営業テンプレート（#101）\s*→\s*反映先: 東京営業所（#202）\s*\/\s*プレビュー/, 'フッターに名前付きの経路を示す');
    await page.screenshot({ path: path.join(OUT, 'setup-app-names.png') });

    // ---- 反映する項目：説明・置換の目印・フィールド設定の注意 ----
    await reset();
    const chipOf = name => page.locator('label.kus-lp__chip', { has: page.getByRole('checkbox', { name, exact: true }) });
    const checkbox = name => page.getByRole('checkbox', { name, exact: true });
    assert.match(await chipOf('フィールド設定').getAttribute('title'), /不足しているフィールドを追加し.*反映先だけのフィールドは保持/);
    assert.match(await chipOf('レイアウト設定').getAttribute('title'), /配置を反映元に合わせます.*末尾に保持/);
    assert.match(await chipOf('ビュー設定').getAttribute('title'), /一覧を追加・更新.*「保持」の設定に従います/);
    assert.match(await chipOf('プラグイン(※)').getAttribute('title'), /まだ無いプラグインだけ追加.*設定値はコピーしません/);
    assert.match(await chipOf('JS/CSS設定').getAttribute('title'), /適用範囲.*ファイル一覧を更新/);
    assert.match(await chipOf('アプリ権限').getAttribute('title'), /反映元の内容で置き換えます/);
    for (const name of ['アプリ権限', 'フィールド権限', 'レコード権限', '通知設定', 'レコード条件通知', 'リマインダー通知', 'プロセス管理']) {
      assert.equal(await chipOf(name).locator('.kus-rl-chip__badge').innerText(), '置換', `${name}に「置換」の目印を付ける`);
    }
    for (const name of ['フィールド設定', 'レイアウト設定', 'ビュー設定', 'グラフ設定', 'アクション設定', 'プラグイン(※)', 'JS/CSS設定', 'カテゴリ設定']) {
      assert.equal(await chipOf(name).locator('.kus-rl-chip__badge').count(), 0, `${name}には「置換」の目印を付けない`);
    }
    assert.match(await checkbox('プロセス管理').evaluate(el => document.getElementById(el.getAttribute('aria-describedby')).textContent), /置換型の項目。.*運用中の申請/, '説明を支援技術へも伝える');
    assert.equal(await page.locator('.kus-rl-scope-help dt', { hasText: 'プロセス管理' }).locator('.kus-rl-chip__badge').count(), 1, '各項目の反映方法の一覧にも置換を示す');
    await page.getByText('各項目の反映方法', { exact: true }).click();
    assert.match(await page.locator('.kus-rl-scope-help').innerText(), /プラグイン\(※\)[\s\S]*設定値はコピーしません/);
    assert.equal(await page.evaluate(() => {
      const groups = document.querySelector('.kus-rl-scope-groups'), option = document.querySelector('.kus-rl-scope-option');
      return !!(groups.compareDocumentPosition(option) & Node.DOCUMENT_POSITION_FOLLOWING);
    }), true, '「保持」の設定は項目グループの下に置く');
    assert.equal(await page.locator('.kus-rl-scope-option').getByRole('checkbox', { name: '反映先だけの一覧・グラフ・アクションを保持する', exact: true }).count(), 1);
    const fieldNotice = page.locator('.kus-rl-scope-notice');
    const noticeText = 'フィールド設定を含めない場合、反映先に無いフィールドを参照していると差分確認で停止します。';
    assert.equal(await fieldNotice.isHidden(), true, '既定（フィールド設定を含む）では注意を出さない');
    await checkbox('フィールド設定').uncheck();
    assert.equal(await fieldNotice.innerText(), noticeText, 'フィールド設定を外すと注意を出す');
    await button('全解除').click();
    assert.equal(await fieldNotice.isHidden(), true, '何も選んでいなければ注意しない');
    await checkbox('アクション設定').check();
    assert.equal(await fieldNotice.isVisible(), true, 'アクション設定だけでも注意する');
    await checkbox('グラフ設定').check(); await checkbox('アクション設定').uncheck();
    assert.equal(await fieldNotice.isVisible(), true);
    await checkbox('フィールド設定').check();
    assert.equal(await fieldNotice.isHidden(), true, 'フィールド設定を選ぶと注意が消える');
    await button('全解除').click(); await checkbox('アプリ権限').check();
    assert.equal(await fieldNotice.isHidden(), true, 'フィールドを参照しない項目だけなら注意しない');
    await button('フォームのみ').click();
    assert.equal(await fieldNotice.isHidden(), true);
    await button('権限のみ').click();
    assert.equal(await fieldNotice.isHidden(), true);
    await button('ビュー+グラフ').click();
    assert.equal(await fieldNotice.isVisible(), true, 'プリセット適用にも追従する');
    assert.match(await page.locator('.kus-rl-scope-option__help').innerText(), /削除せず残します/);
    await checkbox('反映先だけの一覧・グラフ・アクションを保持する').uncheck();
    assert.match(await page.locator('.kus-rl-scope-option__help').innerText(), /反映先から削除します/, '保持をOFFにすると削除されることを示す');
    await button('権限のみ').click();
    assert.match(await page.locator('.kus-rl-scope-option__help').innerText(), /今の選択.*では使われません/);
    await button('ビュー+グラフ').click();
    // 項目の選び方の全体を撮るため、縦に長い画面で撮影する。
    for (const [width, height] of [[1440, 1500], [390, 2000], [320, 2000]]) {
      await page.setViewportSize({ width, height });
      await page.locator('.kus-rl-scope-groups').scrollIntoViewIfNeeded();
      await page.getByText('各項目の反映方法', { exact: true }).scrollIntoViewIfNeeded();
      await page.screenshot({ path: path.join(OUT, `setup-scope-${width}.png`) });
      assert.ok(await page.locator('.kus-rl-canvas').evaluate(e => e.scrollWidth - e.clientWidth <= 1), `${width}pxで項目の選び方が横にはみ出す`);
    }
    await page.setViewportSize({ width: 1440, height: 1000 });

    // ---- 差分確認：全項目の要約表と詳細への移動 ----
    await reset(); await setup(); await compare();
    const summaryTable = page.locator('.kus-rl-summary');
    const summaryRows = summaryTable.locator('tbody tr');
    assert.equal(await summaryRows.count(), 3, '取得した全項目を要約表に出す');
    assert.deepEqual(await summaryTable.locator('thead th').allInnerTexts(), ['項目', '状態', '変更', '削除', '保持', '反映方法', '選択']);
    assert.deepEqual(await summaryRows.nth(0).locator('td').allInnerTexts(), ['フィールド設定', '差分あり', '1', '0', '0', '追加・更新', '選択中']);
    assert.deepEqual(await summaryRows.nth(1).locator('td').allInnerTexts(), ['レイアウト設定', '一致', '0', '0', '0', '追加・更新', '選択中']);
    assert.deepEqual(await summaryRows.nth(2).locator('td').allInnerTexts(), ['ビュー設定', '確認が必要', '－', '－', '－', '－', '選択中']);
    await summaryRows.nth(0).getByRole('button', { name: 'フィールド設定', exact: true }).evaluate(b => b.click());
    await page.waitForFunction(() => {
      const row = document.querySelector('[data-reflect-entry="fieldSettings"]'), canvas = document.querySelector('.kus-rl-canvas');
      const r = row.getBoundingClientRect(), c = canvas.getBoundingClientRect();
      return row.querySelector('details.kus-rl-changes').open && r.top >= c.top - 2 && r.top < c.bottom - 40;
    });
    assert.equal(await page.evaluate(() => document.activeElement?.dataset?.reflectEntry), 'fieldSettings', '移動先の項目へフォーカスを移す');
    await summaryRows.nth(1).locator('td').nth(2).click();
    await page.waitForFunction(() => {
      const row = document.querySelector('[data-reflect-entry="layoutSettings"]'), group = row.closest('details.kus-rl-preview-group');
      const r = row.getBoundingClientRect(), c = document.querySelector('.kus-rl-canvas').getBoundingClientRect();
      return (!group || group.open) && r.top >= c.top - 2 && r.top < c.bottom - 40;
    });
    // 絞り込みで隠れている項目は、絞り込みを解除して移動する。
    await page.getByRole('combobox', { name: '差分の状態で絞り込み' }).selectOption('error');
    assert.equal(await page.locator('[data-reflect-entry="fieldSettings"]').count(), 0);
    assert.equal(await page.locator('.kus-rl-summary tbody tr').count(), 3, '要約表は絞り込みに関わらず全項目を示す');
    await page.locator('.kus-rl-summary tbody tr').nth(0).getByRole('button', { name: 'フィールド設定', exact: true }).press('Enter');
    assert.equal(await page.getByRole('combobox', { name: '差分の状態で絞り込み' }).inputValue(), 'all', '隠れた項目へ移動するときは絞り込みを解除する');
    await page.waitForFunction(() => document.querySelector('[data-reflect-entry="fieldSettings"] details.kus-rl-changes')?.open);
    assert.equal(await page.evaluate(() => window.__reflectMock.applies.length), 0, '要約表の操作で書き込まない');
    await page.evaluate(() => { document.querySelector('.kus-rl-summary').scrollIntoView({ block: 'start' }); });
    await page.screenshot({ path: path.join(OUT, 'review-summary-1440.png') });
    for (const [width, height] of [[1024, 768], [720, 900], [390, 844], [320, 640]]) {
      await page.setViewportSize({ width, height });
      await page.evaluate(() => { document.querySelector('.kus-rl-summary').scrollIntoView({ block: 'start' }); });
      await page.screenshot({ path: path.join(OUT, `review-summary-${width}.png`) });
      const geometry = await page.evaluate(() => {
        const canvas = document.querySelector('.kus-rl-canvas'), table = document.querySelector('.kus-rl-summary__table'), row = table.querySelector('tbody tr');
        return { overflow: canvas.scrollWidth - canvas.clientWidth, tableOverflow: table.scrollWidth - table.parentElement.clientWidth, rowDisplay: getComputedStyle(row).display, headVisible: table.querySelector('thead').getBoundingClientRect().width > 4 };
      });
      assert.ok(geometry.overflow <= 1 && geometry.tableOverflow <= 1, `${width}pxで要約表が横にはみ出す: ${JSON.stringify(geometry)}`);
      if (width <= 390) assert.deepEqual([geometry.rowDisplay, geometry.headVisible], ['grid', false], `${width}pxでは要約表を縦積みにする`);
    }
    await page.setViewportSize({ width: 1440, height: 1000 });

    await reset(); await setup();
    const sizes = [[1440, 1000], [1024, 768], [720, 450], [390, 844], [320, 640]];
    for (const [width, height] of sizes) {
      await page.setViewportSize({ width, height });
      await tab('対象を選ぶ').click();
      await page.screenshot({ path: path.join(OUT, `setup-${width}.png`) });
      const geometry = await page.evaluate(() => {
        const root = document.querySelector('#kus-reflect-lite');
        const canvas = document.querySelector('.kus-rl-canvas');
        const dock = document.querySelector('.kus-rl-action-dock').getBoundingClientRect();
        const rect = root.getBoundingClientRect();
        return { overflow: canvas.scrollWidth - canvas.clientWidth, left: rect.left, right: rect.right, bottom: rect.bottom,
          dockTop: dock.top, canvasBottom: canvas.getBoundingClientRect().bottom, canvasHeight: canvas.clientHeight };
      });
      assert.ok(geometry.overflow <= 1, `${width}pxで横はみ出し: ${JSON.stringify(geometry)}`);
      assert.ok(geometry.left >= 0 && geometry.right <= width + 1 && geometry.bottom <= height + 1);
      assert.ok(geometry.canvasBottom <= geometry.dockTop + 1 && geometry.canvasHeight > 80, '固定フッターが本文を覆わない');
      const hit = await button('差分を確認する').evaluate(e => { const r = e.getBoundingClientRect(); return e.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)); });
      assert.equal(hit, true, '主操作が他要素に覆われない');
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    await compare();
    for (const [width, height] of sizes) {
      await page.setViewportSize({ width, height });
      await page.screenshot({ path: path.join(OUT, `review-${width}.png`) });
      assert.ok(await page.locator('.kus-rl-canvas').evaluate(e => e.scrollWidth - e.clientWidth <= 1), `${width}px差分画面で横はみ出し`);
      assert.ok(await run().evaluate(e => e.getBoundingClientRect().height < 65), '反映ボタンが狭い列で縦長にならない');
    }
    await tab('対象を選ぶ').focus();
    await page.keyboard.press('End');
    assert.equal(await tab('反映結果').getAttribute('aria-selected'), 'true');
    await page.keyboard.press('Home');
    assert.equal(await tab('対象を選ぶ').getAttribute('aria-selected'), 'true');
    await page.setViewportSize({ width: 1200, height: 900 });
    await page.setContent(demo);
    assert.equal(await page.getByRole('textbox', { name: '反映元アプリID', exact: true }).inputValue(), '101');
    await compare();
    await button('差分ありだけ選択').click();
    assert.equal(await run().isEnabled(), true, '配布する操作デモも単独で動作する');
    await require('./reflect-engine-scenarios.cjs')({ page, esbuild, tool: TOOL, out: OUT });
    assert.deepEqual(errors, []);
    fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify({ passed: true, sizes, checks: ['guided workflow', 'setup blockers', 'app URL input', 'lookup map lines', 'preset export and import', 'no write on compare', 'busy lock', 'scope reuse', 'freshness', 'search and status filters', 'keyboard focus', 'JSON source and errors', 'partial results and retry', 'result report export', 'post-apply verification', 'result invalidation on target change', 'result invalidation on JSON replacement', 'terminology (反映元/反映先)', 'app name lookup', 'scope descriptions and replace badges', 'field settings notice', 'summary table navigation', 'per-section results and undo guidance', 'responsive geometry'], pageErrors: errors }, null, 2));
    console.log('PASS reflect-lite: workflow, terminology, app names, scope hints, summary table, setup blockers, URL input, lookup lines, presets, freshness, filters, JSON, partial results, per-section results, result export, post-apply check, keyboard, 5 viewport sizes');
    console.log(`Artifacts: ${OUT}`);
  } catch (error) {
    await page.screenshot({ path: path.join(OUT, 'failure.png') });
    console.error(await page.locator('#kus-reflect-lite').innerText());
    console.error('Browser errors:', errors);
    throw error;
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
