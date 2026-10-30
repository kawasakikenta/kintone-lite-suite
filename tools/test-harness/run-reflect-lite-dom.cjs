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
  const NAMES = { fieldSettings: 'フィールド設定', layoutSettings: 'レイアウト設定', viewSettings: 'ビュー設定', appSettings: '一般設定', customizeSettings: 'JS/CSS設定', processSettings: 'プロセス管理' };
  // 変更の要約（items）のサンプル。mock.itemsMode で切り替える。
  function sampleItems(sectionKey, mode) {
    if (!mode || sectionKey !== 'fieldSettings') return undefined;
    if (mode === 'basic') return [
      { kind: '保持', name: '営業所メモ<b>（local）', details: ['反映先だけのフィールドなので保持します'] },
      { kind: '追加', name: '件名（subject）', details: ['種類: 文字列（1行）', '必須: はい'] },
      { kind: '削除', name: '旧項目（old）', details: ['フィールドを削除します'] },
      { kind: '変更', name: '顧客名（name）', details: ['表示名: 取引先 → 顧客名', '必須: いいえ → はい'] }
    ];
    if (mode === 'many') return Array.from({ length: 27 }, (_, i) => ({ kind: '追加', name: '追加項目' + (i + 1) + '（add' + (i + 1) + '）', details: ['種類: 文字列（1行）'] }));
    if (mode === 'keepOnly') return [{ kind: '保持', name: '営業所メモ（local）', details: ['反映先だけのフィールドなので保持します'] }];
    return undefined;
  }
  export async function previewReflectStandalone(opts, progress) {
    const mock = window.__reflectMock;
    mock.previews.push(opts);
    progress('サンプルデータを比較中…');
    await new Promise(resolve => setTimeout(resolve, 160));
    if (mock.mode === 'preview-failure') throw new Error(mock.previewError || 'サンプル取得エラー');
    const entries = opts.scopes.map((sectionKey, i) => {
      const status = mock.mode === 'same' ? 'same' : sectionKey === 'layoutSettings' ? 'same' : sectionKey === 'viewSettings' ? (mock.fetchFailure ? 'tgt-missing' : 'error') : 'change';
      const items = status === 'change' ? sampleItems(sectionKey, mock.itemsMode) : undefined;
      const rawRemoval = status === 'change' && sectionKey === 'fieldSettings' && (mock.itemsMode === 'basic' || mock.itemsMode === 'raw-removal');
      const uploads = status === 'change' && sectionKey === 'customizeSettings' && mock.uploads ? [
        { platform: 'desktop', kind: 'js', index: 0, sourceFileKey: 'key-app-js', name: 'app.js', byteSize: 12288 },
        { platform: 'mobile', kind: 'js', index: 0, sourceFileKey: 'key-app-js', name: 'app.js', byteSize: 12288 },
        { platform: 'desktop', kind: 'css', index: 0, sourceFileKey: 'key-app-css', name: 'app.css', byteSize: 2048 }
      ] : undefined;
      return { sectionKey, label: NAMES[sectionKey] || sectionKey, status,
        behavior: '追加・更新', blockers: status === 'error' || status === 'tgt-missing' ? ['反映先の取得失敗'] : [], warnings: uploads ? ['2 件のファイル（合計 14 KB）を反映先へアップロードしてから設定します。'] : [], operations: [], requiredFields: [],
        changes: status === 'change' ? [{ kind: '変更', path: 'フィールド / 顧客名 / 必須', before: 'false', after: 'true' }].concat(rawRemoval ? [{ kind: '削除', path: 'フィールド / 旧項目', before: '{"type":"SINGLE_LINE_TEXT","code":"old","label":"旧項目"}', after: '（なし）' }] : []) : [],
        changeCount: status === 'change' ? 1 + (rawRemoval ? 1 : 0) : 0, removalCount: rawRemoval ? 1 : 0,
        message: status === 'change' ? '入力欄のラベルと必須設定が変更されています。' : status === 'same' ? '設定は一致しています。' : '反映先の取得に失敗しました。アクセス権を確認してください。',
        ...(mock.requiredFields && mock.requiredFields[sectionKey] ? { requiredFields: mock.requiredFields[sectionKey] } : {}),
        ...(sectionKey === 'fieldSettings' ? { fieldStats: { add: 2, update: 3, tgtOnly: 1 } } : {}),
        ...(items ? { items } : {}), ...(uploads ? { fileUploads: uploads } : {}) };
    });
    return { sourceFieldCodes: mock.sourceFieldCodes || [], targetFieldCodes: mock.targetFieldCodes || [], sourceSystemFieldCodes: mock.sourceSystemFieldCodes || [], baseline: { connection: 'sample-' + opts.targetAppId, source: {}, target: {} }, entries, totalSections: entries.length, changedSections: entries.filter(e => e.status === 'change').length,
      sameSections: entries.filter(e => e.status === 'same').length, errorSections: entries.filter(e => !['change', 'same'].includes(e.status)).length,
      ...(mock.targetPending ? { targetPending: mock.targetPending } : {}) };
  }
  export async function preflightLookupMapStandalone() { return { ok: true, missing: [] }; }
  export async function runApplyPreviewStandalone(opts, status, progress) {
    const mock = window.__reflectMock;
    mock.applies.push(opts);
    // 実エンジンは書き込み前の検査（照合・バックアップ）でだけ例外を投げる。その経路の再現用。
    if (mock.applyThrows) { await new Promise(resolve => setTimeout(resolve, 50)); throw new Error(mock.applyThrows); }
    // mock.stepMode のとき、通知の前でテストが advance() するまで止める（進捗表示を 1 手ずつ確認するため）。
    const step = async () => { if (mock.stepMode) await new Promise(resolve => { mock.waiting = resolve; }); };
    const notify = update => { if (opts.onSectionUpdate) opts.onSectionUpdate(update); };
    await new Promise(resolve => setTimeout(resolve, 100));
    const longToken = 'X'.repeat(260);
    const sections = [];
    let stopped = false, cancelled = false;
    for (const [i, sectionKey] of opts.scopes.entries()) {
      const label = NAMES[sectionKey] || sectionKey;
      if (stopped) { await step(); notify({ sectionKey, label, status: 'pending', message: '中断のため未実行' }); sections.push({ sectionKey, label: sectionKey, status: 'pending' }); continue; }
      await step(); notify({ sectionKey, label, status: 'running' });
      await step();
      if (mock.mode === 'cancelled' && i === 0) {
        const message = '中止しました（この項目では フィールド追加 まで書き込み済みで、残りは送信していません。差分を取得し直して現在の状態を確認してください）';
        notify({ sectionKey, label, status: 'ng', message, stopped: true }); sections.push({ sectionKey, label: sectionKey, status: 'ng', message, stopped: true }); stopped = true; cancelled = true;
      } else if (mock.mode === 'api-failure' && i === 0) {
        const message = '指定したアプリが見つかりません（GAIA_AP01）\\n[API] PUT /k/v1/preview/app/views.json app=202 payload={"app":"202"}';
        notify({ sectionKey, label, status: 'ng', message }); sections.push({ sectionKey, label: sectionKey, status: 'ng', message }); stopped = true;
      } else if (mock.mode === 'partial' && i === 0) {
        const message = 'フィールド「顧客コード」が見つかりません（GAIA_IL26）\\n再実行前に確認してください。\\n' + longToken;
        notify({ sectionKey, label, status: 'ng', message }); sections.push({ sectionKey, label: sectionKey, status: 'ng', message }); stopped = true;
      } else { notify({ sectionKey, label, status: 'ok' }); sections.push({ sectionKey, label: sectionKey, status: 'ok' }); }
    }
    progress(['サンプルの反映ログです。実アプリには書き込んでいません。']);
    // 反映前に保存したバックアップと同じ形（反映先の反映前の設定）。
    const backup = mock.noBackup ? undefined : { generatedAt: '2026-01-01T00:00:00.000Z', scopes: opts.scopes.slice(), bundle: { appId: opts.targetAppId, guestId: opts.targetGuestId || '', preview: true, sections: Object.fromEntries(opts.scopes.map(key => [key, { marker: 'before-' + key }])) } };
    return { sections, logs: [], finalRevision: mock.finalRevision || '9', ...(cancelled ? { cancelled: true } : {}), ...(backup ? { backup } : {}) };
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
  async function reset(mode = 'mixed', extra = {}) {
    await page.setContent('<!doctype html><html lang="ja"><meta charset="utf-8"><body style="background:#e8edf3"></body></html>');
    await page.evaluate(fixture);
    await page.evaluate(([mode, extra]) => { window.__reflectMock.mode = mode; Object.assign(window.__reflectMock, extra); }, [mode, extra]);
    await page.addScriptTag({ content: script });
    await page.evaluate(() => ReflectHarness.mountReflectLitePanel());
  }
  // 「詳細設定…」のポップアップの中の操作は、操作の直前に開き、直後に閉じる（呼び出し側は開閉を意識しない）。
  // 値の読み取りは、閉じたままでも読める CSS の指定で行う。
  const DETAIL_ACTIONS = new Set(['fill', 'check', 'uncheck', 'press', 'click', 'selectOption', 'setInputFiles', 'isDisabled', 'isEnabled']);
  function inDetail(locator) {
    return new Proxy(locator, { get(target, prop) {
      const value = target[prop];
      if (typeof value !== 'function') return value;
      if (!DETAIL_ACTIONS.has(prop)) return value.bind(target);
      return async (...args) => { await openDetail(); try { return await value.apply(target, args); } finally { await closeDetail(); } };
    } });
  }
  const DETAIL_BUTTONS = new Set(['現在の設定を保存', '読み込み', 'JSONで書き出し', 'JSONを読み込み']);
  const button = name => DETAIL_BUTTONS.has(name) ? inDetail(page.getByRole('button', { name, exact: true })) : page.getByRole('button', { name, exact: true });
  const presetNameBox = () => inDetail(page.locator('input[aria-label="プリセット名"]'));
  const presetSelectBox = () => inDetail(page.locator('select[aria-label="保存済みプリセット"]'));
  const presetFileBox = () => inDetail(page.locator('input[aria-label="プリセットJSON"]'));
  const preserveBox = () => inDetail(page.locator('label.kus-lp__check', { hasText: '反映先だけの一覧・グラフ・アクションを保持する' }).locator('input'));
  const lookupBox = () => inDetail(page.locator('textarea[aria-label="ルックアップの参照アプリID変換"]'));
  const rolloutBox = () => inDetail(page.locator('textarea[aria-label="続けて反映する反映先"]'));
  const tab = name => page.getByRole('tab', { name: new RegExp(name) });
  const run = () => button('最終確認に進む');
  // 「詳細設定…」のポップアップ（反映時の動作・参照先変換・プリセット・続けて反映）。操作の前に開き、続きの操作の前に閉じる。
  const detailDialog = () => page.locator('#kus-rl-detail');
  async function openDetail() {
    if (await detailDialog().evaluate(el => el.open)) return;
    // 「詳細設定…」は第1画面にある。ほかの画面にいる間の読み書きは、画面を切り替えずに同じポップアップを開く。
    if (await button('詳細設定…').isVisible()) await button('詳細設定…').click(); else await detailDialog().evaluate(el => el.showModal());
  }
  async function closeDetail() { if (await detailDialog().evaluate(el => el.open)) await button('詳細設定を閉じる').click(); }
  // カードの「?」ボタンで補足説明を開く（開いていれば何もしない）。吹き出しの要素を返す。
  async function openHelp(cardTitle) {
    const help = page.getByRole('button', { name: `「${cardTitle}」の説明を表示`, exact: true });
    if ((await help.getAttribute('aria-expanded')) !== 'true') await help.click();
    return help.locator('xpath=ancestor::*[contains(concat(" ", normalize-space(@class), " "), " kus-lp__card ")][1]').locator('.kus-lp__help-pop');
  }
  const applyButton = () => page.getByRole('button', { name: /^確認した .* 項目を反映先プレビューへ反映/ });
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
    assert.equal(await page.getByText('ルックアップの参照アプリID変換（任意）', { exact: true }).isVisible(), false, '参照先変換は第1画面に出さず、詳細設定のポップアップへ置く');
    assert.equal(await presetNameBox().isVisible(), false, 'プリセットは第1画面に出さない');
    assert.equal(await preserveBox().isVisible(), false, '保持の設定は第1画面に出さない');
    assert.match(await page.locator('.kus-rl-detail-summary').innerText(), /反映先だけの一覧・グラフ・アクションは保持/, '詳細設定の要点は第1画面にも一行で示す');
    await button('詳細設定…').click();
    assert.equal(await detailDialog().evaluate(el => el.matches(':modal')), true, '詳細設定はモーダルで開く');
    assert.deepEqual(await detailDialog().locator('.kus-lp__card-title').allInnerTexts(), ['反映時の動作', 'ルックアップの参照アプリID変換（任意）', 'プリセット（接続先と反映項目）', '続けて反映する反映先（複数アプリへ展開）'], '詳細設定に置く設定');
    await page.keyboard.press('Escape');
    assert.equal(await detailDialog().evaluate(el => el.open), false, 'Escapeで詳細設定だけを閉じる');
    assert.equal(await page.locator('#kus-reflect-lite').count(), 1, 'Escapeでパネル自体は閉じない');
    assert.equal(await page.evaluate(() => document.activeElement?.textContent), '詳細設定…', '閉じたら「詳細設定…」へフォーカスを戻す');
    await button('詳細設定…').click();
    await detailDialog().locator('.kus-lp__dialog-title').click();
    assert.equal(await detailDialog().evaluate(el => el.open), true, 'ポップアップの内側を押しても閉じない');
    await page.mouse.click(5, 5);
    assert.equal(await detailDialog().evaluate(el => el.open), false, '背景を押すと閉じる');
    const lookup = lookupBox();
    await lookup.fill('abc');
    assert.equal(await button('差分を確認する').isDisabled(), true, '参照先変換の誤りでは進めない');
    assert.match(await page.locator('.kus-rl-dock-copy').innerText(), /参照先変換/, '参照先変換の誤りを理由として表示する');
    await lookup.fill('10 → 20');
    assert.match(await page.locator('.kus-rl-lookup-status').innerText(), /参照先変換 1 件/, '行形式の参照先変換を件数で示す');
    assert.equal(await button('差分を確認する').isEnabled(), true);
    assert.equal(await button('現在の設定を保存').isDisabled(), true, '名前なしでは保存できない');
    await presetNameBox().fill('営業所展開');
    await button('現在の設定を保存').click();
    const presetSelect = presetSelectBox();
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
    await presetFileBox().setInputFiles({ name: 'presets.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ kind: 'reflect-presets', presets: [{ name: '検証環境', source: { appId: '101' }, target: { appId: '404' }, scopes: ['fieldSettings', 'viewSettings'], lookupMap: '', preserveTargetOnly: false }] })) });
    await idle();
    await presetSelect.selectOption('検証環境');
    await button('読み込み').click();
    assert.equal(await page.getByRole('textbox', { name: '反映先アプリID', exact: true }).inputValue(), '404', 'JSONから読み込んだプリセットを適用する');
    assert.equal(await preserveBox().isChecked(), false, 'プリセットの保持設定を適用する');
    await presetSelect.selectOption('営業所展開');
    await button('読み込み').click();
    assert.equal(await page.getByRole('textbox', { name: '反映先アプリID', exact: true }).inputValue(), '202', '保存したプリセットで条件を戻せる');
    assert.equal(await lookup.inputValue(), '10 → 20');
    assert.match(await page.locator('.kus-rl-detail-summary').innerText(), /参照先変換 1 件/, '参照先変換の件数を第1画面にも示す');
    await openDetail(); await button('詳細設定を閉じる').click();
    assert.equal(await detailDialog().evaluate(el => el.open), false, '閉じるでポップアップが閉じる');
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
    assert.match(await page.locator('#kus-rl-stage-result').innerText(), /1 項目を反映しました/);
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
    assert.match(await page.locator('.kus-lp__status').innerText(), /直近の反映結果は現在の対象と異なるため表示していません。対象を戻すと表示されます。/, '対象変更後は直近の結果を表示していないことと戻し方を案内する');
    assert.doesNotMatch(await page.locator('#kus-rl-stage-result').innerText(), /項目を反映しました|サンプルの反映ログ|実行ログ/, '旧対象の成功結果と実行ログを表示しない');
    assert.notEqual(await page.locator('.kus-lp__status').getAttribute('data-tone'), 'ok', '旧対象の確認成功ステータスを残さない');
    assert.equal(await button('実行結果JSONを保存').isVisible(), false, '別対象の結果を現在の結果として保存させない');
    assert.equal(await page.evaluate(() => window.__reflectMock.applies.length), 1, '対象変更や結果表示では書き込まない');

    await reset('same'); await setup(); await compare();
    assert.equal(await run().isDisabled(), true);
    await reset('partial'); await setup();
    await page.getByRole('checkbox', { name: 'プロセス管理', exact: true }).check();
    await compare(); await button('差分ありだけ選択').click(); await execute(); await idle();
    assert.match(await page.locator('#kus-rl-stage-result').innerText(), /一部の項目を反映できませんでした/);
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
    assert.match(await page.getByText(/設定JSONを読み込み済み/).first().innerText(), /settings\.json/, '読み込んだファイル名を表示する');
    assert.equal(await button('差分を確認する').isEnabled(), true);
    await compare();
    assert.equal(await page.evaluate(() => window.__reflectMock.previews[0].sourceBundle.appId), '901');
    await button('差分ありだけ選択').click(); await execute(); await idle();
    assert.match(await page.locator('#kus-rl-stage-result').innerText(), /1 項目を反映しました/);
    await tab('対象を選ぶ').click();
    await page.getByLabel('反映元の設定JSON', { exact: true }).setInputFiles({ name: 'replacement.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ appId: '901', sections: { fieldSettings: { properties: { updated: { type: 'SINGLE_LINE_TEXT', code: 'updated' } } } } })) });
    await idle();
    await tab('反映結果').click();
    assert.equal(await button('実行結果JSONを保存').isVisible(), false, '同じアプリの別JSONに差し替えても古い実行結果を保存させない');
    assert.doesNotMatch(await page.locator('#kus-rl-stage-result').innerText(), /項目を反映しました|サンプルの反映ログ/, '同じアプリのJSON差替えで旧結果とログを消す');
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
    assert.match(await chipOf('JS/CSS設定').getAttribute('title'), /適用範囲.*反映元の内容に置き換えます.*反映先だけのファイル・URLは外れます/);
    assert.match(await chipOf('アプリ権限').getAttribute('title'), /反映元の内容で置き換えます/);
    for (const name of ['アプリ権限', 'フィールド権限', 'レコード権限', '通知設定', 'レコード条件通知', 'リマインダー通知', 'プロセス管理']) {
      assert.equal(await chipOf(name).locator('.kus-rl-chip__badge').innerText(), '置換', `${name}に「置換」の目印を付ける`);
    }
    for (const name of ['フィールド設定', 'レイアウト設定', 'ビュー設定', 'グラフ設定', 'アクション設定', 'プラグイン(※)', 'JS/CSS設定', 'カテゴリ設定']) {
      assert.equal(await chipOf(name).locator('.kus-rl-chip__badge').count(), 0, `${name}には「置換」の目印を付けない`);
    }
    assert.match(await checkbox('プロセス管理').evaluate(el => document.getElementById(el.getAttribute('aria-describedby')).textContent), /置換型の項目。.*運用中の申請/, '説明を支援技術へも伝える');
    assert.equal(await page.locator('.kus-rl-scope-help dt', { hasText: 'プロセス管理' }).locator('.kus-rl-chip__badge').count(), 1, '各項目の反映方法の一覧にも置換を示す');
    assert.equal(await page.locator('.kus-rl-scope-help').isVisible(), false, '各項目の反映方法は「?」を押すまで出さない');
    const scopeHelpPop = await openHelp('反映する項目');
    assert.match(await scopeHelpPop.innerText(), /目的に近いセットを選び、必要な項目を調整できます。/, '項目の選び方の説明も「?」に入れる');
    assert.match(await page.locator('.kus-rl-scope-help').innerText(), /プラグイン\(※\)[\s\S]*設定値はコピーしません/);
    assert.equal(await page.locator('.kus-rl-scope-option').evaluate(el => ({ inDetail: !!el.closest('#kus-rl-detail'), card: el.closest('.kus-lp__card').querySelector('.kus-lp__card-title').textContent.trim() })).then(JSON.stringify), JSON.stringify({ inDetail: true, card: '反映時の動作' }), '「保持」の設定は詳細設定の「反映時の動作」に置く');
    assert.equal(await page.locator('.kus-rl-scope-option input[aria-label], .kus-rl-scope-option label.kus-lp__check').filter({ hasText: '反映先だけの一覧・グラフ・アクションを保持する' }).count(), 1);
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
    await button('ビューとグラフ').click();
    assert.equal(await fieldNotice.isVisible(), true, '項目のセット選択にも追従する');
    await openDetail();
    assert.match(await page.locator('.kus-rl-scope-option__help').innerText(), /削除せず残します/);
    await checkbox('反映先だけの一覧・グラフ・アクションを保持する').uncheck();
    assert.match(await page.locator('.kus-rl-scope-option__help').innerText(), /反映先から削除します/, '保持をOFFにすると削除されることを示す');
    assert.match(await page.locator('.kus-rl-detail-summary').innerText(), /反映先だけの一覧・グラフ・アクションを削除/, '保持をOFFにしたことは第1画面にも示す');
    assert.equal(await page.locator('.kus-rl-detail-summary--warn').count(), 1, '削除する設定は警告色で示す');
    await closeDetail();
    await button('権限のみ').click();
    await openDetail();
    assert.match(await page.locator('.kus-rl-scope-option__help').innerText(), /今の選択.*使われません/);
    await closeDetail();
    await button('ビューとグラフ').click();
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
    assert.deepEqual(await summaryRows.nth(2).locator('td').allInnerTexts(), ['ビュー設定', '取得失敗', '－', '－', '－', '－', '選択中']);
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
    await page.evaluate(() => { const canvas = document.querySelector('.kus-rl-canvas'); canvas.scrollTop += document.querySelector('.kus-rl-summary').getBoundingClientRect().top - canvas.getBoundingClientRect().top - 8; });
    await page.screenshot({ path: path.join(OUT, 'review-summary-1440.png') });
    for (const [width, height] of [[1024, 768], [720, 900], [390, 844], [320, 640]]) {
      await page.setViewportSize({ width, height });
      await page.evaluate(() => { const canvas = document.querySelector('.kus-rl-canvas'); canvas.scrollTop += document.querySelector('.kus-rl-summary').getBoundingClientRect().top - canvas.getBoundingClientRect().top - 8; });
      await page.screenshot({ path: path.join(OUT, `review-summary-${width}.png`) });
      const geometry = await page.evaluate(() => {
        const canvas = document.querySelector('.kus-rl-canvas'), table = document.querySelector('.kus-rl-summary__table'), row = table.querySelector('tbody tr');
        return { overflow: canvas.scrollWidth - canvas.clientWidth, tableOverflow: table.scrollWidth - table.parentElement.clientWidth, rowDisplay: getComputedStyle(row).display, headVisible: table.querySelector('thead').getBoundingClientRect().width > 4 };
      });
      assert.ok(geometry.overflow <= 1 && geometry.tableOverflow <= 1, `${width}pxで要約表が横にはみ出す: ${JSON.stringify(geometry)}`);
      if (width <= 390) assert.deepEqual([geometry.rowDisplay, geometry.headVisible], ['grid', false], `${width}pxでは要約表を縦積みにする`);
    }
    await page.setViewportSize({ width: 1440, height: 1000 });

    // =========================================================================
    // 第2段階: エンジン機能の画面統合（一般設定・変更の要約・未公開の変更・アップロード予定・進捗・取り消し・バックアップから戻す）
    // =========================================================================
    const statusOf = text => ['待機中', '実行中…', '成功', '失敗', '変更なし', '未実行'].find(label => text.includes(label)) || text;
    const progressStates = () => page.locator('#kus-rl-stage-result .kus-rl-progress [data-progress-section] .kus-rl-result-state').evaluateAll(nodes => nodes.map(node => node.textContent));
    const progressLabels = () => page.locator('#kus-rl-stage-result .kus-rl-progress [data-progress-section] strong').allInnerTexts();
    async function advance() {
      await page.waitForFunction(() => window.__reflectMock.waiting);
      await page.evaluate(() => { const resume = window.__reflectMock.waiting; window.__reflectMock.waiting = null; resume(); });
    }
    // 反映エンジンを 1 手ずつ進め、止まるたびに進捗一覧の状態を記録する。
    async function stepThrough(snapshot) {
      const seen = [];
      for (;;) {
        await page.waitForFunction(() => window.__reflectMock.waiting || document.querySelector('#kus-reflect-lite').getAttribute('aria-busy') !== 'true');
        if (!(await page.evaluate(() => !!window.__reflectMock.waiting))) break;
        seen.push(await snapshot());
        await advance();
      }
      return seen;
    }
    async function confirmAndStart() {
      await run().click();
      await page.getByRole('checkbox', { name: '反映内容の確認', exact: true }).check();
      const idCheck = page.getByRole('textbox', { name: '確認用の反映先アプリID', exact: true });
      if (await idCheck.isVisible()) await idCheck.fill(await page.evaluate(() => document.querySelector('[aria-label="反映先アプリID"]').value));
      await applyButton().click();
    }
    const cleanPending = { state: 'clean', productionRevision: '8', previewRevision: '8', sectionKeys: [], message: '反映先プレビューに未公開の変更はありません。' };
    const pendingPending = { state: 'pending', productionRevision: '5', previewRevision: '8', sectionKeys: ['fieldSettings'], message: '反映先プレビューには未公開の変更があります（フィールド設定）。公開すると今回の反映と一緒に本番へ反映されます。' };
    const unknownPending = { state: 'unknown', productionRevision: '', previewRevision: '8', sectionKeys: [], message: '反映先プレビューに未公開の変更があるか確認できませんでした（本番のrevisionがありません）。' };

    // ---- 一般設定を反映する項目に含める。全選択・クイック選択でも正しく扱う ----
    await reset();
    assert.equal(await checkbox('一般設定').isChecked(), false, '既定では一般設定を選ばない');
    assert.equal(await page.locator('.kus-rl-scope-group', { hasText: '動作・カスタマイズ' }).locator('label.kus-lp__chip', { hasText: '一般設定' }).count(), 1, '一般設定は動作・カスタマイズに入る');
    assert.match(await chipOf('一般設定').getAttribute('title'), /テーマ.*レコードのタイトル.*サムネイル表示.*一括削除.*コメント機能.*レコードの再利用.*インライン編集.*数値の桁数と丸め.*年度の開始月.*アプリ名・説明・アイコンは変えません/, '一般設定の説明は実際の動作に合わせる');
    assert.equal(await chipOf('一般設定').locator('.kus-rl-chip__badge').count(), 0, '一般設定は置換型ではない');
    await button('すべての項目').click();
    assert.equal(await checkbox('一般設定').isChecked(), true, 'すべての項目に一般設定を含める');
    assert.equal(await page.evaluate(() => document.querySelectorAll('label.kus-lp__chip input:checked').length === document.querySelectorAll('label.kus-lp__chip input').length), true, 'すべての項目で全チップが選択される');
    await button('権限・通知を除外').click();
    assert.equal(await checkbox('一般設定').isChecked(), true, '権限・通知を除外しても一般設定は残る');
    assert.equal(await checkbox('アプリ権限').isChecked(), false);
    await button('フォームのみ').click();
    assert.equal(await checkbox('一般設定').isChecked(), false, 'フォームのみには含めない');
    await button('全解除').click(); await checkbox('一般設定').check();
    assert.equal(await page.locator('.kus-rl-scope-notice').isVisible(), true, '一般設定だけを選ぶときも、フィールド設定の注意を出す');
    assert.match(await page.locator('.kus-rl-scope-help').evaluate(el => el.textContent), /一般設定.*テーマ/, '各項目の反映方法にも一般設定を出す');
    await page.getByRole('textbox', { name: '反映元アプリID', exact: true }).fill('101'); await compare();
    assert.deepEqual(await page.evaluate(() => window.__reflectMock.previews.at(-1).scopes), ['appSettings'], '一般設定だけを比較に渡す');
    assert.deepEqual(await page.locator('.kus-rl-summary tbody tr').nth(0).locator('td').allInnerTexts(), ['一般設定', '差分あり', '1', '0', '0', '追加・更新', '選択中'], '要約表に「一般設定」を表示する');

    // ---- 変更の要約：種類のバッジ・項目名・内容を、設定値の内訳より上に示す ----
    await reset('mixed', { itemsMode: 'basic' }); await setup(); await compare();
    const fieldRow = page.locator('[data-reflect-entry="fieldSettings"]');
    const itemsBox = fieldRow.locator('.kus-rl-items');
    assert.equal(await itemsBox.count(), 1, '差分の項目に変更の要約を出す');
    assert.deepEqual(await itemsBox.locator('.kus-rl-item').evaluateAll(rows => rows.map(row => row.dataset.kind)), ['削除', '変更', '追加', '保持'], '削除・変更・追加・保持の順に並べる');
    assert.deepEqual(await itemsBox.locator('.kus-rl-kind').allInnerTexts(), ['削除', '変更', '追加', '保持'], '種類は色だけでなく文字でも示す');
    const kindColors = await itemsBox.locator('.kus-rl-kind').evaluateAll(nodes => nodes.map(node => getComputedStyle(node).backgroundColor));
    assert.equal(new Set(kindColors).size, 4, '種類ごとに色を分ける');
    assert.match(await itemsBox.innerText(), /変更の要約[\s\S]*旧項目（old）[\s\S]*フィールドを削除します[\s\S]*顧客名（name）[\s\S]*表示名: 取引先 → 顧客名[\s\S]*必須: いいえ → はい/, '項目名と内容を示す');
    assert.deepEqual(await itemsBox.locator('.kus-rl-item').nth(1).locator('.kus-rl-item__details li').allInnerTexts(), ['表示名: 取引先 → 顧客名', '必須: いいえ → はい'], '内容は箇条で示す');
    assert.equal(await itemsBox.locator('b').count(), 0, '項目名はテキストとして描画する');
    assert.match(await itemsBox.innerText(), /営業所メモ<b>（local）/);
    assert.equal(await itemsBox.evaluate(el => !!(el.compareDocumentPosition(el.parentElement.querySelector('details.kus-rl-changes')) & Node.DOCUMENT_POSITION_FOLLOWING)), true, '要約は設定値の内訳より上に置く');
    assert.equal(await fieldRow.locator('details.kus-rl-changes').evaluate(el => el.open), false, '設定値の内訳は折りたたんだまま');
    assert.match(await fieldRow.locator('details.kus-rl-changes > summary').innerText(), /設定値の内訳/);
    assert.equal(await page.locator('[data-reflect-entry="layoutSettings"] .kus-rl-items').count(), 0, '要約が無い項目には何も出さない');
    // 多いときは先頭 20 件だけ表示し、続きを出せる。
    await reset('mixed', { itemsMode: 'many' }); await setup(); await compare();
    const manyBox = page.locator('[data-reflect-entry="fieldSettings"] .kus-rl-items');
    assert.equal(await manyBox.locator('.kus-rl-item').count(), 20, '先頭20件だけ表示する');
    assert.equal(await manyBox.getByRole('button', { name: '残り 7 件を表示', exact: true }).isVisible(), true);
    await manyBox.getByRole('button', { name: '残り 7 件を表示', exact: true }).click();
    assert.equal(await manyBox.locator('.kus-rl-item').count(), 27, '残りを表示する');
    assert.equal(await manyBox.locator('.kus-rl-items__more').isHidden(), true);
    // 保持だけの項目は折りたたんで控えめに示す。
    await reset('mixed', { itemsMode: 'keepOnly' }); await setup(); await compare();
    const keepBox = page.locator('[data-reflect-entry="fieldSettings"] details.kus-rl-items--quiet');
    assert.equal(await keepBox.count(), 1);
    assert.equal(await keepBox.evaluate(el => el.open), false, '保持だけの要約は閉じて示す');
    assert.match(await keepBox.locator('summary').innerText(), /反映先だけの設定を保持（1 件）/);
    await keepBox.locator('summary').click();
    await keepBox.locator('.kus-rl-item').first().waitFor();
    assert.match(await keepBox.innerText(), /営業所メモ（local）[\s\S]*反映先だけのフィールドなので保持します/);
    // 画面幅が狭くても、要約が横にはみ出さない。
    await reset('mixed', { itemsMode: 'basic' }); await setup(); await compare();
    for (const [width, height] of [[1440, 1000], [390, 844], [320, 640]]) {
      await page.setViewportSize({ width, height });
      await page.locator('[data-reflect-entry="fieldSettings"] .kus-rl-items').evaluate(el => { const canvas = el.closest('.kus-rl-canvas'); canvas.scrollTop = canvas.scrollTop + el.getBoundingClientRect().top - canvas.getBoundingClientRect().top - 12; });
      await page.screenshot({ path: path.join(OUT, `review-items-${width}.png`) });
      assert.ok(await page.locator('.kus-rl-canvas').evaluate(e => e.scrollWidth - e.clientWidth <= 1), `${width}pxで変更の要約が横にはみ出す`);
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    // 最終確認：削除される設定は項目名＋内容で示し、変更の要約と設定値の内訳を項目ごとに出す。
    await button('差分ありだけ選択').click(); await run().click();
    const removalList = page.locator('#kus-rl-stage-confirm [data-reflect-removals]');
    assert.deepEqual(await removalList.locator('li').allInnerTexts(), ['フィールド設定 / 旧項目（old）：フィールドを削除します'], '削除される設定を要約（項目名＋内容）で示す');
    assert.doesNotMatch(await removalList.innerText(), /SINGLE_LINE_TEXT|\{"type"/, '生の設定値（JSON）を並べない');
    assert.match(await page.locator('#kus-rl-stage-confirm').innerText(), /削除・置換される設定（1 件）/);
    const confirmEntry = page.locator('#kus-rl-stage-confirm [data-reflect-confirm-entry="fieldSettings"]');
    assert.deepEqual(await confirmEntry.locator('.kus-rl-kind').allInnerTexts(), ['削除', '変更', '追加', '保持'], '最終確認でも項目ごとに要約を示す');
    assert.match(await confirmEntry.locator('details.kus-rl-changes > summary').innerText(), /設定値の内訳/);
    await page.screenshot({ path: path.join(OUT, 'confirm-items-1440.png') });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: path.join(OUT, 'confirm-items-390.png') });
    assert.ok(await page.locator('.kus-rl-canvas').evaluate(e => e.scrollWidth - e.clientWidth <= 1), '390pxの最終確認で横にはみ出す');
    await page.setViewportSize({ width: 1440, height: 1000 });
    // 要約が無い項目は、従来の表示（設定値の抜粋）にフォールバックする。
    await reset('mixed', { itemsMode: 'raw-removal' }); await setup(); await compare(); await button('差分ありだけ選択').click(); await run().click();
    assert.match(await page.locator('#kus-rl-stage-confirm [data-reflect-removals] li').first().innerText(), /^フィールド設定 \/ フィールド \/ 旧項目：\{"type":"SINGLE_LINE_TEXT"/, '要約が無いときは従来の表示で削除を示す');

    // ---- 反映先の未公開の変更 ----
    await reset('mixed', { targetPending: pendingPending }); await setup(); await compare();
    const pendingNote = page.locator('#kus-rl-stage-review [data-target-pending]');
    assert.equal(await pendingNote.getAttribute('data-target-pending'), 'pending');
    assert.match(await pendingNote.innerText(), /以前からの未公開の変更があります[\s\S]*フィールド設定/, '未公開の変更があることを文字で示す');
    assert.equal(await pendingNote.evaluate(el => el.classList.contains('kus-rl-next--warn')), true, '未公開の変更は警告色で示す');
    await page.screenshot({ path: path.join(OUT, 'review-target-pending.png') });
    await button('差分ありだけ選択').click(); await run().click();
    assert.equal(await page.getByRole('textbox', { name: '確認用の反映先アプリID', exact: true }).isVisible(), true, '未公開の変更があるときは反映先IDの入力を求める');
    assert.match(await page.locator('#kus-rl-stage-confirm').innerText(), /反映先プレビューに以前からの未公開の変更があります。確認のため、反映先アプリIDを入力してください/);
    await page.getByRole('checkbox', { name: '反映内容の確認', exact: true }).check();
    assert.equal(await applyButton().isDisabled(), true, '反映先IDを入力するまで反映できない');
    await page.getByRole('textbox', { name: '確認用の反映先アプリID', exact: true }).fill('202');
    assert.equal(await applyButton().isEnabled(), true);
    await reset('mixed', { targetPending: cleanPending }); await setup(); await compare();
    assert.equal(await page.locator('#kus-rl-stage-review [data-target-pending]').getAttribute('data-target-pending'), 'clean');
    assert.match(await page.locator('#kus-rl-stage-review [data-target-pending]').innerText(), /✓ 未公開の変更なし[\s\S]*未公開の変更はありません/);
    assert.equal(await page.locator('#kus-rl-stage-review [data-target-pending]').evaluate(el => el.classList.contains('kus-rl-next--warn')), false, '確認済みは警告色にしない');
    await button('差分ありだけ選択').click(); await run().click();
    assert.equal(await page.getByRole('textbox', { name: '確認用の反映先アプリID', exact: true }).isVisible(), false, '未公開の変更が無く、ほかに理由が無ければ反映先IDは求めない');
    await reset('mixed', { targetPending: unknownPending }); await setup(); await compare();
    assert.equal(await page.locator('#kus-rl-stage-review [data-target-pending]').getAttribute('data-target-pending'), 'unknown');
    assert.match(await page.locator('#kus-rl-stage-review [data-target-pending]').innerText(), /未公開の変更は未確認[\s\S]*確認できませんでした/);
    await button('差分ありだけ選択').click(); await run().click();
    assert.equal(await page.getByRole('textbox', { name: '確認用の反映先アプリID', exact: true }).isVisible(), false, '確認できない場合は反映を止めない');
    await reset(); await setup(); await compare();
    assert.equal(await page.locator('[data-target-pending]').count(), 0, '判定が無いときは何も出さない');

    // ---- JS/CSS：アップロードするファイルを示す ----
    await reset('mixed', { uploads: true }); await setup(); await checkbox('JS/CSS設定').check(); await compare();
    const uploadRow = page.locator('[data-reflect-entry="customizeSettings"]');
    assert.deepEqual(await uploadRow.locator('[data-reflect-uploads] li').allInnerTexts(), ['PC JS・モバイル JS / app.js（12 KB）', 'PC CSS / app.css（2 KB）'], '差分確認にアップロードするファイルを示す（同じファイルは1回）');
    assert.match(await uploadRow.innerText(), /2 件のファイル（合計 14 KB）を反映先へアップロードしてから設定します/);
    await button('差分ありだけ選択').click(); await run().click();
    assert.equal(await page.locator('#kus-rl-stage-confirm [data-reflect-uploads]').count(), 1, '最終確認ではアップロード予定を1つの一覧にまとめる');
    assert.deepEqual(await page.locator('#kus-rl-stage-confirm [data-reflect-uploads] li').allInnerTexts(), ['PC JS・モバイル JS / app.js（12 KB）', 'PC CSS / app.css（2 KB）']);
    assert.match(await page.locator('#kus-rl-stage-confirm [data-reflect-uploads]').innerText(), /反映先へアップロードするファイル（2 件）/);
    await page.screenshot({ path: path.join(OUT, 'confirm-uploads-1440.png') });

    // ---- 実行中の進捗：待機中 → 実行中… → 成功（失敗・未実行も文字で示す） ----
    const selectThree = async () => {
      await page.getByRole('textbox', { name: '反映元アプリID', exact: true }).fill('101');
      await button('全解除').click();
      for (const name of ['フィールド設定', '一般設定', 'プロセス管理']) await checkbox(name).check();
      await compare();
    };
    await reset('mixed', { stepMode: true }); await selectThree(); await confirmAndStart();
    const normalSeen = await stepThrough(async () => ({ states: (await progressStates()).map(statusOf), summary: await page.locator('#kus-rl-stage-result .kus-rl-progress__summary').innerText(), labels: await progressLabels() }));
    assert.deepEqual(normalSeen.map(item => item.states), [
      ['待機中', '待機中', '待機中'], ['実行中…', '待機中', '待機中'], ['成功', '待機中', '待機中'],
      ['成功', '実行中…', '待機中'], ['成功', '成功', '待機中'], ['成功', '成功', '実行中…']
    ], '実行予定の全項目を待機中で並べ、通知に合わせて 実行中… → 成功 に更新する');
    assert.deepEqual(normalSeen[0].labels, ['フィールド設定', '一般設定', 'プロセス管理'], '反映エンジンの処理順に並べる');
    assert.match(normalSeen[0].summary, /^0 \/ 3 項目が完了/);
    assert.match(normalSeen[3].summary, /^1 \/ 3 項目が完了。実行中: 一般設定/);
    assert.equal(await page.locator('#kus-rl-stage-result .kus-rl-progress [aria-live="polite"]').count(), 1, '進捗は aria-live で読み上げる');
    assert.equal(await page.locator('#kus-rl-stage-result .kus-rl-progress').isHidden(), true, '完了後は進捗の一覧を結果一覧に置き換える');
    const finalItems = page.locator('#kus-rl-stage-result .kus-rl-result-item');
    assert.deepEqual(await finalItems.locator('.kus-rl-result-state').evaluateAll(nodes => nodes.map(node => node.textContent)).then(list => list.map(statusOf)), ['成功', '成功', '成功'], '結果一覧と進捗が矛盾しない');
    // 進捗の途中の見た目（狭い画面を含む）。
    await reset('mixed', { stepMode: true }); await selectThree(); await confirmAndStart();
    for (const [width, height] of [[1440, 1000], [390, 844], [320, 640]]) {
      await page.setViewportSize({ width, height });
      await page.waitForFunction(() => window.__reflectMock.waiting);
      if (width === 1440) await advance();
      await page.waitForFunction(() => window.__reflectMock.waiting);
      await page.screenshot({ path: path.join(OUT, `progress-${width}.png`) });
      assert.ok(await page.locator('.kus-rl-canvas').evaluate(e => e.scrollWidth - e.clientWidth <= 1), `${width}pxの進捗表示で横にはみ出す`);
      assert.equal(await page.locator('#kus-reflect-lite').getAttribute('aria-busy'), 'true');
      assert.equal(await page.getByRole('button', { name: 'バックアップから戻す（差分を確認）' }).isHidden(), true, '反映中は戻す操作を出さない');
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    await stepThrough(async () => 0);
    // 失敗したときは、失敗と未実行を文字で示す。
    await reset('partial', { stepMode: true }); await selectThree(); await confirmAndStart();
    const partialSeen = await stepThrough(async () => (await progressStates()).map(statusOf));
    assert.deepEqual(partialSeen, [
      ['待機中', '待機中', '待機中'], ['実行中…', '待機中', '待機中'], ['失敗', '待機中', '待機中'], ['失敗', '未実行', '待機中']
    ], '失敗の後、残りは未実行にする');
    assert.deepEqual(await page.locator('#kus-rl-stage-result .kus-rl-result-item .kus-rl-result-state').evaluateAll(nodes => nodes.map(node => node.textContent)).then(list => list.map(statusOf)), ['失敗', '未実行', '未実行'], '完了後の結果一覧と矛盾しない');
    assert.match(await page.locator('#kus-rl-stage-result .kus-rl-result-item').first().innerText(), /顧客コード.*見つかりません/);

    // ---- 取り消しの案内：反映前の未公開の変更に合わせて出し分ける ----
    const undoCases = [
      [cleanPending, 'clean', /反映前、反映先プレビューに未公開の変更はありませんでした。アプリの設定画面で『変更を中止』を押すと、今回の反映をすべて取り消せます。/],
      [pendingPending, 'pending', /反映前から未公開の変更があったため、『変更を中止』ではそれらも破棄されます。今回の反映だけを戻す場合は『バックアップから戻す』を使ってください。/],
      [unknownPending, 'unknown', /取り消す場合: .*『変更を中止』.*『設定JSONから取得』/],
      [undefined, 'unknown', /取り消す場合: .*『変更を中止』.*『設定JSONから取得』/]
    ];
    for (const [pending, state, pattern] of undoCases) {
      await reset('mixed', { targetPending: pending }); await setup(); await compare(); await button('差分ありだけ選択').click(); await execute(); await idle();
      const undo = page.locator('#kus-rl-stage-result .kus-rl-undo');
      assert.match(await undo.innerText(), pattern, `取り消しの案内（${state}）`);
      assert.equal(await undo.getAttribute('data-undo-state'), state);
      const openState = await button('反映先の設定画面を開く').evaluate(el => el.classList.contains('kus-lp__btn--primary'));
      assert.equal(openState, pending?.state === 'clean', '未公開の変更が無いときだけ、設定画面を開く操作を目立たせる');
      if (pending?.state === 'pending') assert.equal(await undo.evaluate(el => el.classList.contains('kus-rl-next--warn')), true);
    }
    await reset('mixed', { targetPending: cleanPending }); await setup(); await compare(); await button('差分ありだけ選択').click(); await execute(); await idle();
    await page.screenshot({ path: path.join(OUT, 'result-undo-clean-1440.png') });
    const undoDownloadPromise = page.waitForEvent('download');
    await button('実行結果JSONを保存').click();
    const undoReportText = await fs.promises.readFile(await (await undoDownloadPromise).path(), 'utf8');
    assert.equal(JSON.parse(undoReportText).targetPending.state, 'clean', '実行結果JSONに反映前の未公開の変更の判定を含める');
    assert.doesNotMatch(undoReportText, /before-fieldSettings|"backup"/, 'バックアップの内容は実行結果JSONに含めない');
    // 日時は日本語の形式で示す。
    const resultText = await page.locator('#kus-rl-stage-result').innerText();
    assert.match(resultText, /\d{4}\/\d{1,2}\/\d{1,2} \d{1,2}:\d{2}:\d{2}/, '結果の日時を日本語形式（年/月/日 時:分:秒）で示す');
    assert.doesNotMatch(resultText, /\b(AM|PM)\b/);

    // ---- 直前の反映分は「以前からの未公開の変更」と扱わない ----
    await reset('mixed', { targetPending: cleanPending, finalRevision: '9' }); await setup(); await compare(); await button('差分ありだけ選択').click(); await execute(); await idle();
    // 反映後、プレビューの revision は自分の反映で 9 になり本番 8 と異なる。再確認ではこれを自分の反映分と判定する。
    await page.evaluate(() => { window.__reflectMock.targetPending = { state: 'pending', productionRevision: '8', previewRevision: '9', sectionKeys: ['fieldSettings'], message: '反映先プレビューには未公開の変更があります（フィールド設定）。' }; });
    await button('反映後の差分を再確認').click(); await idle();
    assert.equal(await page.locator('#kus-rl-stage-review [data-target-pending]').getAttribute('data-target-pending'), 'own', '自分の反映分だけの未公開の変更は own と判定する');
    assert.match(await page.locator('#kus-rl-stage-review [data-target-pending="own"]').innerText(), /このツールの反映分だけ/);
    await run().click();
    assert.equal(await page.getByRole('textbox', { name: '確認用の反映先アプリID', exact: true }).isVisible(), false, '自分の反映分だけなら反映先IDの再入力を求めない');
    await button('差分に戻る').click();
    // 別の反映先（記録の無い反映先）や revision が進んだ場合は従来どおり pending。
    await page.evaluate(() => { window.__reflectMock.targetPending = { state: 'pending', productionRevision: '8', previewRevision: '10', sectionKeys: ['fieldSettings'], message: '反映先プレビューには未公開の変更があります（フィールド設定）。' }; });
    await button('差分を再取得').click(); await idle();
    assert.equal(await page.locator('#kus-rl-stage-review [data-target-pending]').getAttribute('data-target-pending'), 'pending', '自分の反映の後に revision が進んでいれば以前からの変更として扱う');
    // own のまま反映すると、取り消し案内は「変更を中止」で戻せる旨になる。
    await page.evaluate(() => { window.__reflectMock.targetPending = { state: 'pending', productionRevision: '8', previewRevision: '9', sectionKeys: ['fieldSettings'], message: '未公開あり' }; });
    await button('差分を再取得').click(); await idle();
    await button('差分ありだけ選択').click(); await execute(); await idle();
    assert.equal(await page.locator('#kus-rl-stage-result .kus-rl-undo').getAttribute('data-undo-state'), 'own');
    assert.match(await page.locator('#kus-rl-stage-result .kus-rl-undo').innerText(), /変更を中止/);

    // ---- 書き込み前の停止では、直前の結果（バックアップから戻す導線）を失わない ----
    await reset('mixed', { targetPending: cleanPending }); await setup(); await compare(); await button('差分ありだけ選択').click(); await execute(); await idle();
    assert.equal(await button('バックアップから戻す（差分を確認）').isVisible(), true);
    await page.evaluate(() => { window.__reflectMock.applyThrows = '確認済みの差分と反映条件が一致しません。差分を取得し直してから再実行してください。'; });
    await tab('差分を確認').click(); await button('差分を再取得').click(); await idle(); await button('差分ありだけ選択').click(); await execute(); await idle();
    assert.match(await page.locator('.kus-lp__status').innerText(), /反映条件が一致しません/, '書き込み前の停止は理由を表示する');
    assert.equal(await tab('差分を確認').getAttribute('aria-selected'), 'true', '書き込み前の停止では、空の実行ログを出した反映結果の画面ではなく差分の確認へ戻す');
    assert.equal(await button('差分を再取得').isEnabled(), true, '差分を取得し直せる');
    assert.equal(await page.locator('#kus-rl-stage-result [data-progress-section]').count(), 0);
    await tab('反映結果').click();
    assert.equal(await button('バックアップから戻す（差分を確認）').isVisible(), true, '書き込み前に止まった場合は直前の反映のバックアップから戻す導線を残す');
    assert.equal(await button('実行結果JSONを保存').isVisible(), true, '直前の結果を残す');
    assert.equal(await page.locator('#kus-rl-stage-result [data-progress-section]').count(), 0, '進捗の一覧を残さない');
    await page.evaluate(() => { window.__reflectMock.applyThrows = ''; });

    // ---- バックアップから戻す ----
    const restoreButton = () => button('バックアップから戻す（差分を確認）');
    assert.equal(await restoreButton().isVisible(), true, 'バックアップがあるときだけ戻す操作を出す');
    const busyProbe = await page.evaluate(() => {
      const restore = Array.from(document.querySelectorAll('button')).find(node => node.textContent === 'バックアップから戻す（差分を確認）');
      Array.from(document.querySelectorAll('button')).find(node => node.textContent === '反映後の差分を再確認').click();
      return { busy: document.querySelector('#kus-reflect-lite').getAttribute('aria-busy'), disabled: restore.disabled };
    });
    assert.deepEqual(busyProbe, { busy: 'true', disabled: true }, '処理中は戻す操作を押せない');
    await idle();
    await tab('反映結果').click();
    assert.equal(await restoreButton().count() > 0, true);
    // 再確認で結果が差し替わるため、改めて反映してから戻す。
    await reset('mixed', { targetPending: pendingPending }); await setup(); await compare(); await button('差分ありだけ選択').click();
    await execute(); await idle();
    const appliesBefore = await page.evaluate(() => window.__reflectMock.applies.length);
    await restoreButton().click(); await idle();
    assert.equal(await tab('差分を確認').getAttribute('aria-selected'), 'true', '戻す内容の差分確認へ進む');
    assert.equal(await page.locator('select[aria-label="反映元の取得方法"]').inputValue(), 'json', '反映元を設定JSON（バックアップ）に切り替える');
    assert.equal(await page.locator('input[aria-label="フィールド設定"]').isChecked(), true);
    assert.equal(await page.locator('input[aria-label="レイアウト設定"]').isChecked(), false, '直前に実行した項目だけを選ぶ');
    assert.equal(await page.locator('label.kus-lp__check', { hasText: '反映先だけの一覧・グラフ・アクションを保持する' }).locator('input').isChecked(), false, '反映で追加された一覧などを消せるよう、保持はOFFにする');
    assert.equal(await page.locator('input[aria-label="反映先アプリID"]').inputValue(), '202', '反映先は直前の反映先のまま');
    const restorePreview = await page.evaluate(() => { const last = window.__reflectMock.previews.at(-1); return { scopes: last.scopes, bundleApp: last.sourceBundle.appId, marker: last.sourceBundle.sections.fieldSettings.marker, preserve: last.preserveTargetOnly, target: last.targetAppId, source: last.sourceAppId }; });
    assert.deepEqual(restorePreview, { scopes: ['fieldSettings'], bundleApp: '202', marker: 'before-fieldSettings', preserve: false, target: '202', source: '202' }, 'バックアップの内容を反映元にして差分を取得する');
    assert.equal(await page.evaluate(() => window.__reflectMock.applies.length), appliesBefore, 'バックアップから戻す操作では書き込まない');
    assert.match(await page.locator('#kus-rl-stage-review [data-restore-notice]').innerText(), /バックアップから戻しています。反映で追加したフィールドは削除されません（保持として表示）/, '差分確認に注意を出す');
    assert.match(await page.locator('#kus-rl-stage-setup .kus-lp__small', { hasText: '設定JSONを読み込み済み' }).first().evaluate(el => el.textContent), /反映前バックアップ（\d{4}\/\d{1,2}\/\d{1,2} \d{1,2}:\d{2}:\d{2}）/, '手でファイルを選んだときと同じ表示にする');
    await page.screenshot({ path: path.join(OUT, 'review-restore-1440.png') });
    await button('差分ありだけ選択').click(); await run().click();
    assert.equal(await page.locator('#kus-rl-stage-confirm [data-restore-notice]').count(), 1, '最終確認にも注意を出す');
    assert.equal(await page.evaluate(() => window.__reflectMock.applies.length), appliesBefore, '確認の途中でも書き込まない');
    await page.getByRole('checkbox', { name: '反映内容の確認', exact: true }).check();
    await page.getByRole('textbox', { name: '確認用の反映先アプリID', exact: true }).fill('202');
    await applyButton().click(); await idle();
    const restoreApply = await page.evaluate(() => { const last = window.__reflectMock.applies.at(-1); return { count: window.__reflectMock.applies.length, marker: last.sourceBundle.sections.fieldSettings.marker, preserve: last.preserveTargetOnly, scopes: last.scopes }; });
    assert.deepEqual(restoreApply, { count: appliesBefore + 1, marker: 'before-fieldSettings', preserve: false, scopes: ['fieldSettings'] }, '確認を経て反映すると、バックアップの内容で反映する');
    // 反映元を手で変えたら、戻している間の注意を解除する。
    await restoreButton().click(); await idle();
    assert.equal(await page.locator('#kus-rl-stage-review [data-restore-notice]').count(), 1);
    await button('対象を変更').click();
    await page.getByRole('combobox', { name: '反映元の取得方法' }).selectOption('app');
    await page.getByRole('textbox', { name: '反映元アプリID', exact: true }).fill('101');
    await compare();
    assert.equal(await page.locator('#kus-rl-stage-review [data-restore-notice]').count(), 0, '反映元を手で変えたら注意を解除する');
    // バックアップが無い結果には戻す操作を出さない。
    await reset('mixed', { noBackup: true }); await setup(); await compare(); await button('差分ありだけ選択').click(); await execute(); await idle();
    assert.equal(await restoreButton().isHidden(), true, 'バックアップが無いときは戻す操作を出さない');

    // =========================================================================
    // 第3段階: Markdown 出力・複数アプリへの順次展開・バックアップから戻す間の反映元表示
    // =========================================================================
    const downloadOf = async name => {
      const promise = page.waitForEvent('download');
      await button(name).click();
      const file = await promise;
      return { name: file.suggestedFilename(), text: await fs.promises.readFile(await file.path(), 'utf8') };
    };
    const stubClipboard = async (fail = false) => page.evaluate(fail => {
      window.__copied = [];
      document.execCommand = () => false;
      Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async text => { if (fail) throw new Error('denied'); window.__copied.push(text); } } });
    }, fail);
    const withoutStamp = text => text.replace(/^- 作成日時: .*$/m, '');
    const statusText = () => page.locator('.kus-lp__status').innerText();
    const rolloutStatus = () => page.locator('.kus-rl-rollout__status');
    const rolloutCard = () => page.locator('.kus-rl-rollout-card');
    const nextRolloutButton = () => page.locator('[data-rollout-next]');
    const rolloutEntries = () => page.locator('[data-rollout-entry]').evaluateAll(nodes => nodes.map(node => node.dataset.rolloutEntry));
    async function openRollout() { return rolloutBox(); }
    const targetValue = () => page.locator('input[aria-label="反映先アプリID"]').inputValue();
    const appliesCount = () => page.evaluate(() => window.__reflectMock.applies.length);
    const previewsCount = () => page.evaluate(() => window.__reflectMock.previews.length);

    // ---- Markdown：反映計画 ----
    await reset('mixed', { itemsMode: 'basic', targetPending: pendingPending }); await setup(); await stubClipboard();
    await tab('差分を確認').click();
    assert.equal(await button('計画をMarkdownで保存').isDisabled(), true, '差分が無いときは計画のMarkdown保存を無効にする');
    assert.equal(await button('計画のMarkdownをコピー').isDisabled(), true, '差分が無いときはMarkdownのコピーを無効にする');
    await tab('対象を選ぶ').click(); await compare();
    assert.equal(await button('計画をMarkdownで保存').isEnabled(), true);
    assert.equal(await button('計画のMarkdownをコピー').isEnabled(), true);
    const planMd = await downloadOf('計画をMarkdownで保存');
    assert.match(planMd.name, /^プレビュー反映計画_.*202.*\.md$/, '計画のMarkdownは反映先の名前とIDを付けて保存する');
    assert.match(planMd.text, /^# プレビュー反映の計画/);
    assert.match(planMd.text, /- 反映元: 営業テンプレート（App 101 \/ 通常スペース \/ 本番設定）/, '経路（反映元と環境）を含める');
    assert.match(planMd.text, /- 反映先: 東京営業所（App 202 \/ 通常スペース \/ プレビュー）/, '経路（反映先）を含める');
    assert.match(planMd.text, /- 反映先だけの一覧・グラフ・アクション: 保持する/, '保持の設定を含める');
    assert.match(planMd.text, /- 反映先の未公開の変更: 反映先プレビューには未公開の変更があります（フィールド設定）/, '反映先の未公開の変更を含める');
    assert.match(planMd.text, /\| フィールド設定 \| 差分あり \|/, '差分ありの項目を含める');
    assert.match(planMd.text, /\| レイアウト設定 \| 一致 \|/, '一致した項目も含める');
    assert.match(planMd.text, /\| ビュー設定 \| 確認が必要 \|/, '確認が必要な項目も含める');
    assert.match(planMd.text, /- \*\*削除\*\* 旧項目（old）\n {2}- フィールドを削除します/, '変更の要約（削除）を含める');
    assert.match(planMd.text, /- \*\*変更\*\* 顧客名（name）\n {2}- 表示名: 取引先 → 顧客名/, '変更の要約（変更）を含める');
    assert.ok(planMd.text.includes('営業所メモ\\<b\\>（local）'), '項目名のHTMLらしい記号は退避する');
    assert.doesNotMatch(planMd.text, /SINGLE_LINE_TEXT|\{"|反映先の現在/, '設定値の生JSONを含めない');
    assert.match(await statusText(), /反映計画を プレビュー反映計画_.*\.md に保存しました/, '保存の結果をステータスに示す');
    await button('計画のMarkdownをコピー').click();
    await page.waitForFunction(() => window.__copied.length === 1);
    assert.equal(withoutStamp(await page.evaluate(() => window.__copied[0])), withoutStamp(planMd.text), 'コピーした内容は保存した内容と同じ');
    assert.match(await statusText(), /反映計画のMarkdownをコピーしました/, 'コピーの成功をステータスに示す');
    await stubClipboard(true);
    await button('計画のMarkdownをコピー').click();
    await page.waitForFunction(() => /コピーできませんでした/.test(document.querySelector('.kus-lp__status').textContent));
    assert.equal(await page.locator('.kus-lp__status').getAttribute('data-tone'), 'warn', 'コピーの失敗は注意として示す');
    assert.equal(await page.evaluate(() => window.__copied.length), 0);
    await page.getByRole('checkbox', { name: 'ビュー設定を反映候補に含める', exact: true }).uncheck();
    const narrowedMd = await downloadOf('計画をMarkdownで保存');
    assert.doesNotMatch(narrowedMd.text, /## ビュー設定|\| ビュー設定 \|/, '選択から外した項目は含めない');
    assert.match(narrowedMd.text, /## レイアウト設定/);
    assert.equal(await appliesCount(), 0, 'Markdownの出力では書き込まない');
    for (const [width, height] of [[1440, 1000], [390, 844], [320, 640]]) {
      await page.setViewportSize({ width, height });
      await page.locator('#kus-rl-stage-review .kus-lp__card-actions').first().evaluate(el => { const canvas = el.closest('.kus-rl-canvas'); canvas.scrollTop = canvas.scrollTop + el.getBoundingClientRect().top - canvas.getBoundingClientRect().top - 12; });
      await page.screenshot({ path: path.join(OUT, `review-markdown-${width}.png`) });
      const geometry = await page.evaluate(() => {
        const canvas = document.querySelector('.kus-rl-canvas'), card = document.querySelector('#kus-rl-stage-review .kus-lp__card').getBoundingClientRect();
        const boxes = Array.from(document.querySelectorAll('#kus-rl-stage-review .kus-lp__card-actions button')).map(b => b.getBoundingClientRect());
        const overlap = boxes.some((a, i) => boxes.some((b, j) => i < j && a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1));
        return { overflow: canvas.scrollWidth - canvas.clientWidth, outside: boxes.some(b => b.right > card.right + 1 || b.left < card.left - 1), overlap, count: boxes.length };
      });
      assert.ok(geometry.overflow <= 1 && !geometry.outside && !geometry.overlap && geometry.count >= 4, `${width}pxで差分確認の操作ボタンが崩れる: ${JSON.stringify(geometry)}`);
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    await tab('対象を選ぶ').click();
    await page.getByRole('textbox', { name: '反映先アプリID', exact: true }).fill('303');
    await tab('差分を確認').click();
    assert.equal(await button('計画をMarkdownで保存').isDisabled(), true, '条件が変わって差分が古いときはMarkdown出力を無効にする');
    assert.equal(await button('計画のMarkdownをコピー').isDisabled(), true);

    // ---- Markdown：反映記録（成功と失敗の結果を含める） ----
    await reset('partial'); await setup(); await stubClipboard();
    await page.getByRole('checkbox', { name: 'プロセス管理', exact: true }).check();
    await compare(); await button('差分ありだけ選択').click(); await execute(); await idle();
    const recordMd = await downloadOf('記録をMarkdownで保存');
    assert.match(recordMd.name, /^プレビュー反映記録_.*202.*\.md$/, '記録のMarkdownは反映先の名前とIDを付けて保存する');
    assert.match(recordMd.text, /^# プレビュー反映の記録/);
    assert.match(recordMd.text, /- 実行日時: /);
    assert.match(recordMd.text, /- 反映元: 営業テンプレート（App 101 \/ 通常スペース \/ 本番設定）/);
    assert.match(recordMd.text, /\| フィールド設定 \| 失敗 \|/, '失敗した項目を結果に含める');
    assert.match(recordMd.text, /\| プロセス管理 \| 未実行 \|/, '未実行の項目を結果に含める');
    assert.match(recordMd.text, /詳細: フィールド「顧客コード」が見つかりません（GAIA\\_IL26）/, '失敗の詳細を含める');
    assert.doesNotMatch(recordMd.text, /## レイアウト設定|## ビュー設定/, '実行した項目だけを記録する');
    assert.doesNotMatch(recordMd.text, /SINGLE_LINE_TEXT|\{"|反映先の現在/, '記録にも設定値の生JSONを含めない');
    await button('記録のMarkdownをコピー').click();
    await page.waitForFunction(() => window.__copied.length === 1);
    assert.equal(await page.evaluate(() => window.__copied[0]), recordMd.text, 'コピーした記録は保存した記録と同じ');
    assert.match(await statusText(), /反映記録のMarkdownをコピーしました/);
    const partialJsonPromise = page.waitForEvent('download');
    await button('実行結果JSONを保存').click();
    const partialJson = JSON.parse(await fs.promises.readFile(await (await partialJsonPromise).path(), 'utf8'));
    assert.equal('entries' in partialJson || 'planned' in partialJson, false, '実行結果JSONには計画の差分（entries）を入れない');

    // ---- 続けて反映する反映先：入力の解析と誤りの表示 ----
    await reset(); await setup(); await openRollout();
    await openDetail();
    assert.equal(await page.locator('.kus-rl-rollout .kus-lp__help-pop').isVisible(), false, '続けて反映の説明は「?」を押すまで出さない');
    assert.match(await (await openHelp('続けて反映する反映先（複数アプリへ展開）')).innerText(), /同じ反映元・項目・設定で、ほかのアプリにも順番に反映します（反映先ごとに差分確認と最終確認を行います）。数字だけのIDは通常スペースのアプリを指すため、ゲストスペースのアプリはURLで指定してください。/);
    assert.equal(await rolloutStatus().innerText(), '', '未入力のときは何も出さない');
    await rolloutBox().fill('202\n203, 204、https://example.cybozu.com/k/guest/5/206/\n203');
    assert.equal(await rolloutStatus().innerText(), '3 件: #203、#204、#206（ゲスト 5）', '現在の反映先と重複を除いて件数と一覧を示す');
    await page.getByRole('textbox', { name: '反映先アプリID', exact: true }).fill('203');
    assert.equal(await rolloutStatus().innerText(), '3 件: #202、#204、#206（ゲスト 5）', '反映先を変えると、新しい反映先を除いて表示する');
    await page.getByRole('textbox', { name: '反映先アプリID', exact: true }).fill('202');
    await rolloutBox().fill('203 abc');
    assert.match(await rolloutStatus().innerText(), /「abc」をアプリIDとして読み取れません。数字のID、またはアプリのURLを入力してください。/, '誤りを具体的に示す');
    assert.equal(await rolloutStatus().evaluate(el => el.classList.contains('kus-rl-rollout__status--err')), true);
    assert.equal(await button('差分を確認する').isEnabled(), true, '誤りがあっても今の反映先の差分確認は止めない');
    const beforeEnter = await appliesCount();
    await rolloutBox().press('Enter');
    assert.equal(await appliesCount(), beforeEnter, '入力欄のEnterで書き込まない');
    await compare();
    assert.equal(await previewsCount(), 1, '誤りがあっても今の反映先の差分を取得できる');
    assert.equal(await appliesCount(), 0);
    await tab('反映結果').click();
    assert.equal(await rolloutCard().isVisible(), false, 'まだ反映していないときは「続けて反映」を出さない');
    await tab('対象を選ぶ').click();
    await rolloutBox().fill(Array.from({ length: 1001 }, (_, i) => String(1000 + i)).join('\n'));
    assert.match(await rolloutStatus().innerText(), /1000 件までです（1001 件）/, '多すぎる指定を示す');
    await rolloutBox().fill('202');
    assert.match(await rolloutStatus().innerText(), /反映先はありません（現在の反映先は除いています）/, '現在の反映先だけのときは次が無いことを示す');

    // ---- 続けて反映：反映結果画面のカードと順次展開 ----
    await reset(); await setup(); await stubClipboard(); await openRollout();
    await rolloutBox().fill('203\n204\nhttps://example.cybozu.com/k/guest/5/206/');
    await compare(); await button('差分ありだけ選択').click(); await execute(); await idle();
    assert.equal(await rolloutCard().isVisible(), true, '反映結果に「続けて反映」を出す');
    assert.equal(await rolloutCard().locator('.kus-lp__card-title').innerText(), '続けて反映');
    assert.match(await rolloutCard().innerText(), /次の反映先: #203（残り 2 件）/);
    assert.equal(await nextRolloutButton().innerText(), '次の反映先 #203 の差分を確認');
    assert.equal(await page.locator('[data-rollout-note="warn"]').isHidden(), true, '全成功なら失敗の注意を出さない');
    assert.equal(await page.locator('[data-rollout-note="error"]').isHidden(), true);
    assert.deepEqual(await rolloutEntries(), ['202'], '反映が終わるたびに記録する');
    assert.match(await rolloutCard().innerText(), /これまでの反映先（1 件）[\s\S]*成功\s*#202 東京営業所[\s\S]*成功 1 \/ 失敗 0 \/ 未実行 0/);
    assert.match((await downloadOf('記録をMarkdownで保存')).text, /\| フィールド設定 \| 成功 \|/, '成功した記録をMarkdownに含める');
    await assertNoLegacyTerms('「続けて反映」のある反映結果画面');
    const appliesAfterFirst = await appliesCount();
    const previewsBefore = await previewsCount();
    const nextProbe = await page.evaluate(() => {
      const next = document.querySelector('[data-rollout-next]');
      next.click(); next.click();
      return { busy: document.querySelector('#kus-reflect-lite').getAttribute('aria-busy'), disabled: next.disabled };
    });
    assert.deepEqual(nextProbe, { busy: 'true', disabled: true }, '処理中は次の反映先へ進む操作を押せない');
    await idle();
    assert.equal(await previewsCount(), previewsBefore + 1, '二重に差分を取得しない');
    assert.equal(await appliesCount(), appliesAfterFirst, '次の反映先へ進んでも書き込まない');
    assert.equal(await tab('差分を確認').getAttribute('aria-selected'), 'true', '次の反映先の差分確認へ進む');
    assert.equal(await targetValue(), '203', '反映先が次へ切り替わる');
    const secondPreview = await page.evaluate(() => { const last = window.__reflectMock.previews.at(-1); return { target: last.targetAppId, guest: last.targetGuestId, source: last.sourceAppId, scopes: last.scopes, preserve: last.preserveTargetOnly, lookup: last.lookupMap }; });
    assert.deepEqual(secondPreview, { target: '203', guest: '', source: '101', scopes: ['fieldSettings'], preserve: true, lookup: {} }, '反映元・項目・保持・参照先変換はそのまま');
    assert.match(await statusText(), /次の反映先 #203 の差分を取得しました。内容を確認してから反映してください（まだ書き込んでいません）/);
    assert.match(await page.locator('.kus-rl-dock-copy').innerText(), /反映元: 営業テンプレート（#101）\s*→\s*反映先: 東京営業所（#203）/, 'フッターも次の反映先を示す');
    assert.equal(await run().isEnabled(), true, '次の反映先でも最終確認が必要');
    await tab('対象を選ぶ').click();
    assert.equal(await rolloutBox().inputValue(), '204\n/k/guest/5/206/', '反映先にした分を入力欄から取り除く');
    assert.equal(await rolloutStatus().innerText(), '2 件: #204、#206（ゲスト 5）');
    await page.screenshot({ path: path.join(OUT, 'rollout-setup-1440.png') });
    await tab('差分を確認').click();
    await button('差分ありだけ選択').click(); await execute(); await idle();
    assert.match(await rolloutCard().innerText(), /次の反映先: #204（残り 1 件）/);
    assert.deepEqual(await rolloutEntries(), ['202', '203'], '反映先を切り替えても記録を続ける');
    // 失敗した反映先があっても進める（注意を出す）。
    await page.evaluate(() => { window.__reflectMock.mode = 'partial'; });
    await nextRolloutButton().click(); await idle();
    assert.equal(await targetValue(), '204');
    await button('差分ありだけ選択').click(); await execute(); await idle();
    assert.match(await page.locator('[data-rollout-note="warn"]').innerText(), /直前の反映先に失敗・未実行の項目があります/, '失敗・未実行があるときは注意を出す');
    assert.equal(await page.locator('[data-rollout-note="warn"]').isVisible(), true);
    assert.equal(await nextRolloutButton().innerText(), '次の反映先 #206（ゲスト 5） の差分を確認');
    assert.equal(await nextRolloutButton().isEnabled(), true, '失敗があっても次へ進める');
    assert.match(await rolloutCard().innerText(), /次の反映先: #206（ゲスト 5）（最後の反映先）/);
    assert.deepEqual(await rolloutEntries(), ['202', '203', '204']);
    assert.match(await page.locator('[data-rollout-entry="204"]').innerText(), /失敗あり[\s\S]*成功 0 \/ 失敗 1 \/ 未実行 0/, '失敗した反映先には文字で目印を付ける');
    assert.equal(await page.locator('[data-rollout-entry="204"]').evaluate(el => el.classList.contains('kus-rl-rollout-item--ng')), true);
    for (const [width, height] of [[1440, 1000], [390, 844], [320, 640]]) {
      await page.setViewportSize({ width, height });
      await rolloutCard().evaluate(el => { const canvas = el.closest('.kus-rl-canvas'); canvas.scrollTop = canvas.scrollTop + el.getBoundingClientRect().top - canvas.getBoundingClientRect().top - 8; });
      await page.screenshot({ path: path.join(OUT, `rollout-result-${width}.png`) });
      const geometry = await page.evaluate(() => {
        const canvas = document.querySelector('.kus-rl-canvas'), card = document.querySelector('.kus-rl-rollout-card').getBoundingClientRect();
        const button = document.querySelector('[data-rollout-next]').getBoundingClientRect();
        return { overflow: canvas.scrollWidth - canvas.clientWidth, buttonOutside: button.right > card.right + 1 || button.left < card.left - 1, items: Math.max(...Array.from(document.querySelectorAll('[data-rollout-entry]')).map(el => el.scrollWidth - el.clientWidth)) };
      });
      assert.ok(geometry.overflow <= 1 && !geometry.buttonOutside && geometry.items <= 1, `${width}pxで「続けて反映」がはみ出す: ${JSON.stringify(geometry)}`);
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.evaluate(() => { window.__reflectMock.mode = 'mixed'; });
    await nextRolloutButton().click(); await idle();
    assert.equal(await targetValue(), '206');
    assert.equal(await page.locator('input[aria-label="反映先ゲストスペースID"]').inputValue(), '5', 'ゲストスペースのアプリも切り替える');
    assert.equal(await page.evaluate(() => window.__reflectMock.previews.at(-1).targetGuestId), '5');
    await button('差分ありだけ選択').click(); await execute(); await idle();
    assert.equal(await page.evaluate(() => { const last = window.__reflectMock.applies.at(-1); return [last.targetAppId, last.targetGuestId]; }).then(String), '206,5');
    assert.deepEqual(await rolloutEntries(), ['202', '203', '204', '5:206']);
    assert.equal(await nextRolloutButton().isVisible(), false, '最後の反映先の後は次へ進む操作を出さない');
    assert.doesNotMatch(await rolloutCard().innerText(), /次の反映先:/);
    assert.match(await rolloutCard().innerText(), /これまでの反映先（4 件）/, '展開の記録は最後まで残す');
    await tab('対象を選ぶ').click();
    assert.equal(await rolloutBox().inputValue(), '', '展開が終わると入力欄は空になる');
    // 再実行などで反映項目を選び直しても記録は残し、反映元・保持設定などの条件が変わったら引き継がない。
    await rolloutBox().fill('999');
    await checkbox('レイアウト設定').check();
    await tab('反映結果').click();
    assert.equal(await rolloutCard().isVisible(), true);
    assert.deepEqual(await rolloutEntries(), ['202', '203', '204', '5:206'], '反映項目の選び直しでは展開の記録を消さない');
    await tab('対象を選ぶ').click();
    await preserveBox().uncheck();
    await tab('反映結果').click();
    assert.deepEqual(await rolloutEntries(), [], '保持設定が変わったら展開の記録をリセットする');
    assert.equal(await appliesCount(), 4);

    // ---- 続けて反映：バックアップから戻している間は出さない／反映元の表示 ----
    await reset('mixed', { targetPending: cleanPending }); await setup(); await stubClipboard(); await openRollout();
    await rolloutBox().fill('303');
    await compare(); await button('差分ありだけ選択').click(); await execute(); await idle();
    assert.equal(await rolloutCard().isVisible(), true);
    await restoreButton().click(); await idle();
    const restoreRoute = page.locator('#kus-rl-stage-review .kus-rl-confirm-route > div');
    assert.match(await restoreRoute.nth(0).innerText(), /反映前のバックアップ（東京営業所・\d{4}\/\d{1,2}\/\d{1,2} \d{1,2}:\d{2}:\d{2}）/, '復元中の反映元は「反映前のバックアップ」と示す');
    assert.doesNotMatch(await restoreRoute.nth(0).innerText(), /設定JSON|営業テンプレート|ID: 202/, '復元中の反映元に「設定JSON（ID: 202）」を出さない');
    assert.match(await restoreRoute.nth(1).innerText(), /東京営業所（ID: 202） \/ 通常スペース \/ プレビュー/, '反映先の表示は変えない');
    assert.match(await page.locator('.kus-rl-dock-copy').innerText(), /反映元: 反映前のバックアップ（東京営業所・.*）\s*→\s*反映先: 東京営業所（#202）\s*\/\s*プレビュー/, 'フッターも「反映前のバックアップ」と示す');
    assert.doesNotMatch(await page.locator('.kus-rl-dock-copy').innerText(), /設定JSON/);
    const restorePlanMd = await downloadOf('計画をMarkdownで保存');
    assert.match(restorePlanMd.text, /- 反映元: 反映前のバックアップ（東京営業所・/, 'Markdownの計画にも「反映前のバックアップ」と示す');
    await page.screenshot({ path: path.join(OUT, 'review-restore-label-1440.png') });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: path.join(OUT, 'review-restore-label-390.png') });
    assert.ok(await page.locator('.kus-rl-canvas').evaluate(e => e.scrollWidth - e.clientWidth <= 1), '390pxで復元中の経路表示が横にはみ出す');
    await page.setViewportSize({ width: 1440, height: 1000 });
    await button('差分ありだけ選択').click(); await run().click();
    assert.match(await page.locator('#kus-rl-stage-confirm .kus-rl-confirm-route > div').nth(0).innerText(), /反映前のバックアップ（東京営業所・/, '最終確認でも「反映前のバックアップ」と示す');
    await page.getByRole('checkbox', { name: '反映内容の確認', exact: true }).check();
    const restoreIdCheck = page.getByRole('textbox', { name: '確認用の反映先アプリID', exact: true });
    if (await restoreIdCheck.isVisible()) await restoreIdCheck.fill('202');
    await applyButton().click(); await idle();
    assert.equal(await page.locator('#kus-rl-stage-result').getByText(/項目を反映しました/).first().isVisible(), true);
    assert.equal(await rolloutCard().isVisible(), false, 'バックアップから戻した直後は「続けて反映」を出さない');
    assert.match((await downloadOf('記録をMarkdownで保存')).text, /- 反映元: 反映前のバックアップ（東京営業所・/, '復元の記録にも「反映前のバックアップ」と示す');
    assert.deepEqual(await rolloutEntries(), ['202'], '復元は展開の記録に加えない（それまでの記録は消さない）');

    // ---- 続けて反映：プリセットでの保存・読み込み・JSON書き出し ----
    await reset(); await setup(); await openRollout();
    await rolloutBox().fill('203\n/k/guest/5/204/');
    await presetNameBox().fill('営業所へ展開');
    await button('現在の設定を保存').click();
    await rolloutBox().fill('');
    assert.equal(await rolloutStatus().innerText(), '');
    await button('読み込み').click();
    assert.equal(await rolloutBox().inputValue(), '203\n/k/guest/5/204/', 'プリセットの読み込みで反映先の一覧を戻す');
    assert.equal(await rolloutStatus().innerText(), '2 件: #203、#204（ゲスト 5）');
    const rolloutPresetDownload = await downloadOf('JSONで書き出し');
    assert.equal(JSON.parse(rolloutPresetDownload.text).presets[0].rolloutQueue, '203\n/k/guest/5/204/', 'プリセットのJSONに反映先の一覧を含める');
    await presetFileBox().setInputFiles({ name: 'presets.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ kind: 'reflect-presets', presets: [{ name: '旧形式', source: { appId: '101' }, target: { appId: '202' }, scopes: ['fieldSettings'] }, { name: '展開付き', source: { appId: '101' }, target: { appId: '202' }, scopes: ['fieldSettings'], rolloutQueue: '404\n505' }] })) });
    await idle();
    await presetSelectBox().selectOption('展開付き');
    await button('読み込み').click();
    assert.equal(await rolloutBox().inputValue(), '404\n505', 'JSONから読み込んだプリセットの反映先の一覧を適用する');
    await presetSelectBox().selectOption('旧形式');
    await button('読み込み').click();
    assert.equal(await rolloutBox().inputValue(), '', '反映先の一覧が無い古いプリセットでは空にする');

    // =========================================================================
    // 第4段階: バックアップから戻す（復元の終了と入力の復元）・続けて反映の安全性・アプリ名確認の更新
    // =========================================================================
    // 画面が切り替わっていても読めるよう、役割ではなく要素で指す。
    const openAllDetails = () => page.evaluate(() => document.querySelectorAll('#kus-reflect-lite details').forEach(item => { item.open = true; }));
    const sourceModeValue = () => page.locator('select[aria-label="反映元の取得方法"]').inputValue();
    const sourceIdValue = () => page.locator('input[aria-label="反映元アプリID"]').inputValue();
    const rolloutValue = () => page.locator('textarea[aria-label="続けて反映する反映先"]').inputValue();
    const targetInput = () => page.locator('input[aria-label="反映先アプリID"]');
    const selectedScopeKeys = () => page.evaluate(() => Array.from(document.querySelectorAll('.kus-rl-scope-group input:checked')).map(input => input.value).sort());
    const restoreNotices = stage => page.locator(`#kus-rl-stage-${stage} [data-restore-notice]`).count();
    const RESTORE_ENDED = /バックアップからの復元を終了しました。保持設定・参照先変換などを復元前の値に戻しました。/;
    const lastPreviewOptions = () => page.evaluate(() => { const last = window.__reflectMock.previews.at(-1); return { preserve: last.preserveTargetOnly, lookup: last.lookupMap, scopes: last.scopes.slice().sort(), bundle: !!last.sourceBundle, source: last.sourceAppId, target: last.targetAppId }; });
    /** 復元前の入力は「反映元101・保持ON・参照先変換 10 → 20・項目はフィールド+レイアウト」。反映してから、反映結果の画面で復元を始める。 */
    async function applyThenRestore(extra = {}) {
      await reset('mixed', { targetPending: cleanPending, ...extra }); await setup();
      await openAllDetails(); await lookupBox().fill('10 → 20');
      await compare(); await button('差分ありだけ選択').click(); await execute(); await idle();
      await tab('対象を選ぶ').click(); await checkbox('レイアウト設定').check();
      await tab('反映結果').click();
      await restoreButton().click(); await idle();
      assert.equal(await restoreNotices('review'), 1, '復元の差分には注意を出す');
      assert.equal(await preserveBox().isChecked(), false);
      assert.equal(await lookupBox().inputValue(), '');
      assert.deepEqual(await selectedScopeKeys(), ['fieldSettings']);
    }
    const EXPECT_BEFORE_RESTORE = { source: '101', mode: 'app', preserve: true, lookup: '10 → 20', scopes: ['fieldSettings', 'layoutSettings'] };
    const currentInputs = async () => ({ source: await sourceIdValue(), mode: await sourceModeValue(), preserve: await preserveBox().isChecked(), lookup: await lookupBox().inputValue(), scopes: await selectedScopeKeys() });

    // ---- 復元：保持を手で変えたら復元を終え、復元用の差分と注意を残さず、変えていない入力は復元前へ戻す ----
    await applyThenRestore();
    await tab('対象を選ぶ').click();
    await preserveBox().check();
    assert.match(await statusText(), RESTORE_ENDED, '復元を終えたことと、入力を戻したことを知らせる');
    assert.deepEqual(await currentInputs(), EXPECT_BEFORE_RESTORE, '利用者が変えていない取得方法・反映元ID・参照先変換・項目は復元前へ戻す（保持は利用者が選んだONのまま）');
    await tab('差分を確認').click();
    assert.equal(await restoreNotices('review'), 0, '復元を終えたら注意を出さない');
    assert.match(await page.locator('#kus-rl-stage-review .kus-rl-review').innerText(), /対象を指定して差分を取得してください。/, '復元用に取得した差分は使えない');
    assert.equal(await button('差分ありだけ選択').isDisabled(), true);
    assert.equal(await run().isDisabled(), true, '復元用の差分のまま最終確認へ進めない');
    assert.equal(await page.locator('#kus-rl-stage-review .kus-rl-confirm-route').count(), 0, '復元用の経路表示も残さない');
    await page.getByRole('button', { name: '差分を再取得', exact: true }).click(); await idle();
    assert.deepEqual(await lastPreviewOptions(), { preserve: true, lookup: { 10: '20' }, scopes: ['fieldSettings', 'layoutSettings'], bundle: false, source: '101', target: '202' }, '復元を終えた後の差分は通常の入力で取得する');
    assert.equal(await restoreNotices('review'), 0);
    await button('差分ありだけ選択').click(); await run().click();
    assert.equal(await restoreNotices('confirm'), 0);

    // ---- 復元：参照先変換を手で入力したら復元を終える（入力は上書きしない） ----
    await applyThenRestore();
    await tab('対象を選ぶ').click();
    await lookupBox().fill('7 → 8');
    assert.match(await statusText(), RESTORE_ENDED);
    assert.deepEqual(await currentInputs(), { ...EXPECT_BEFORE_RESTORE, lookup: '7 → 8' }, '利用者が入力した参照先変換は残し、保持などは復元前へ戻す');
    await tab('差分を確認').click();
    assert.equal(await restoreNotices('review'), 0);
    assert.equal(await run().isDisabled(), true);

    // ---- 復元：復元する項目の範囲を超えて項目を足したら復元を終える ----
    await applyThenRestore();
    await tab('対象を選ぶ').click();
    await checkbox('プロセス管理').check();
    assert.match(await statusText(), /バックアップからの復元を終了しました。/);
    assert.deepEqual(await currentInputs(), { ...EXPECT_BEFORE_RESTORE, scopes: ['fieldSettings', 'processSettings'] }, '利用者が選んだ項目は残す');
    await tab('差分を確認').click();
    assert.equal(await restoreNotices('review'), 0);

    // ---- 復元：差分ありだけ選択のように項目を絞っても復元のまま ----
    await applyThenRestore();
    await button('差分ありだけ選択').click();
    assert.equal(await restoreNotices('review'), 1, '項目を絞るだけでは復元を終えない');
    assert.equal(await preserveBox().isChecked(), false);

    // ---- 復元：反映先を変えて戻しても復元用の差分は使えず、入力は復元前に戻る ----
    await applyThenRestore();
    await tab('対象を選ぶ').click();
    await targetInput().fill('2020');
    assert.match(await statusText(), /バックアップからの復元を終了しました。/);
    await targetInput().fill('202');
    assert.deepEqual(await currentInputs(), EXPECT_BEFORE_RESTORE);
    await tab('差分を確認').click();
    assert.equal(await restoreNotices('review'), 0, '反映先を変えて戻しても、復元の注意が消えたまま反映できる状態にしない');
    assert.equal(await button('差分ありだけ選択').isDisabled(), true);
    assert.equal(await run().isDisabled(), true);

    // ---- 復元：「アプリから取得」に戻したら、反映元IDも復元前の値へ戻る ----
    await applyThenRestore();
    await button('対象を変更').click();
    await page.getByRole('combobox', { name: '反映元の取得方法' }).selectOption('app');
    assert.deepEqual(await currentInputs(), EXPECT_BEFORE_RESTORE, '反映元IDが復元時の値（202）のままなら変更前の101へ戻す');
    assert.match(await statusText(), RESTORE_ENDED);
    // 戻した後に利用者が入力した反映元IDは尊重する。
    await page.getByRole('textbox', { name: '反映元アプリID', exact: true }).fill('505');
    assert.equal(await sourceIdValue(), '505');
    assert.equal(await preserveBox().isChecked(), true);

    // ---- 復元：差分の取得に失敗しても復元のまま、もう一度「差分を確認する」で再取得できる ----
    await reset('mixed', { targetPending: cleanPending }); await setup(); await compare(); await button('差分ありだけ選択').click(); await execute(); await idle();
    await page.evaluate(() => { window.__reflectMock.mode = 'preview-failure'; });
    await restoreButton().click(); await idle();
    assert.match(await statusText(), /サンプル取得エラー/, '復元の差分取得の失敗を表示する');
    await tab('対象を選ぶ').click();
    assert.equal(await sourceModeValue(), 'json', '失敗しても復元のまま');
    assert.equal(await preserveBox().isChecked(), false);
    await page.evaluate(() => { window.__reflectMock.mode = 'mixed'; });
    await compare();
    assert.equal(await restoreNotices('review'), 1, '再取得すると復元の注意つきで差分を確認できる');
    assert.equal(await page.evaluate(() => window.__reflectMock.previews.at(-1).sourceBundle.sections.fieldSettings.marker), 'before-fieldSettings');
    await page.getByRole('button', { name: '差分を再取得', exact: true }).click(); await idle();
    assert.equal(await restoreNotices('review'), 1, '「差分を再取得」でも復元のまま');
    await button('差分ありだけ選択').click(); await run().click();
    assert.equal(await restoreNotices('confirm'), 1, '最終確認にも復元の注意を出す');

    // ---- 復元：展開の記録は復元で消えず、復元を終えて入力が戻れば引き継ぐ ----
    await reset('mixed', { targetPending: cleanPending }); await setup(); await openRollout();
    await rolloutBox().fill('303\n404');
    await compare(); await button('差分ありだけ選択').click(); await execute(); await idle();
    assert.deepEqual(await rolloutEntries(), ['202']);
    await restoreButton().click(); await idle();
    assert.deepEqual(await rolloutEntries(), ['202'], '復元を始めても展開の記録を初期化しない');
    await tab('対象を選ぶ').click();
    await targetInput().fill('303');
    assert.match(await statusText(), RESTORE_ENDED);
    assert.equal(await preserveBox().isChecked(), true);
    await compare(); await button('差分ありだけ選択').click(); await execute(); await idle();
    assert.deepEqual(await rolloutEntries(), ['202', '303'], '復元を終えて入力が戻った後は、展開の記録を引き継ぐ');

    // ---- 次の反映先：反映項目が0件・JSON反映元が未読込なら、切り替えず理由を示す ----
    await reset(); await setup(); await openRollout();
    await rolloutBox().fill('303\n404');
    await compare(); await button('差分ありだけ選択').click(); await execute(); await idle();
    await tab('対象を選ぶ').click(); await button('全解除').click();
    await tab('反映結果').click();
    let previewsBeforeBlocked = await previewsCount();
    await nextRolloutButton().click(); await idle();
    assert.equal(await targetValue(), '202', '反映項目が無いときは反映先を切り替えない');
    assert.equal(await rolloutValue(), '303\n404', '入力欄から取り除かない');
    assert.match(await statusText(), /次の反映先 #303 へ進めません。反映する項目を 1 つ以上選んでください。/);
    assert.equal(await previewsCount(), previewsBeforeBlocked, '差分取得も始めない');
    assert.equal(await rolloutCard().isVisible(), true, '結果と「続けて反映」は残す');
    await reset(); await setup(); await openRollout();
    await rolloutBox().fill('303\n404');
    await compare(); await button('差分ありだけ選択').click(); await execute(); await idle();
    await tab('対象を選ぶ').click();
    await page.getByRole('combobox', { name: '反映元の取得方法' }).selectOption('json');
    await tab('反映結果').click();
    assert.equal(await rolloutCard().isVisible(), true);
    previewsBeforeBlocked = await previewsCount();
    await nextRolloutButton().click(); await idle();
    assert.equal(await targetValue(), '202', '設定JSONが未読込のときは反映先を切り替えない');
    assert.equal(await rolloutValue(), '303\n404');
    assert.match(await statusText(), /次の反映先 #303 へ進めません。反映元の設定JSONを読み込んでください。/);
    assert.equal(await previewsCount(), previewsBeforeBlocked);

    // ---- 同じ反映先へ再実行：古い「続けて反映」を残さず、記録は重複せず最新の結果にする ----
    await reset('partial'); await setup(); await openRollout();
    await rolloutBox().fill('303\n404');
    await compare(); await button('差分ありだけ選択').click(); await execute(); await idle();
    assert.equal(await rolloutCard().isVisible(), true);
    assert.match(await page.locator('[data-rollout-entry="202"]').innerText(), /失敗あり[\s\S]*成功 0 \/ 失敗 1 \/ 未実行 0/);
    await button('失敗・未実行だけ選択').click();
    await page.evaluate(() => { window.__reflectMock.mode = 'mixed'; window.__reflectMock.stepMode = true; });
    await compare();
    await run().click();
    await page.getByRole('checkbox', { name: '反映内容の確認', exact: true }).check();
    const rerunIdCheck = page.getByRole('textbox', { name: '確認用の反映先アプリID', exact: true });
    if (await rerunIdCheck.isVisible()) await rerunIdCheck.fill('202');
    await applyButton().click();
    await page.waitForFunction(() => !!window.__reflectMock.waiting);
    assert.equal(await rolloutCard().isVisible(), false, '再実行中は前の結果に対する失敗の注意・次へ進む操作を残さない');
    assert.equal(await nextRolloutButton().isVisible(), false);
    for (let i = 0; i < 8; i++) { await page.waitForTimeout(150); await page.evaluate(() => { const waiting = window.__reflectMock.waiting; if (waiting) { window.__reflectMock.waiting = null; waiting(); } }); }
    await idle();
    assert.deepEqual(await rolloutEntries(), ['202'], '同じ反映先の記録を重複させない');
    assert.match(await page.locator('[data-rollout-entry="202"]').innerText(), /成功\s*#202[\s\S]*成功 1 \/ 失敗 0 \/ 未実行 0/, '最新の結果で置き換える');
    assert.equal(await page.locator('[data-rollout-note="warn"]').isHidden(), true, '成功した再実行の後は失敗の注意を消す');
    // 先に反映した順序は保つ（途中の反映先を再実行しても末尾へ移さない）。
    await page.evaluate(() => { window.__reflectMock.stepMode = false; });
    await nextRolloutButton().click(); await idle();
    await button('差分ありだけ選択').click(); await execute(); await idle();
    assert.deepEqual(await rolloutEntries(), ['202', '303']);
    await tab('対象を選ぶ').click();
    await targetInput().fill('202');
    await compare(); await button('差分ありだけ選択').click(); await execute(); await idle();
    assert.deepEqual(await rolloutEntries(), ['202', '303'], '途中の反映先を再実行しても記録の順序は変えない');

    // ---- 続けて反映は参照先変換をすべての反映先に使う：注意を出す ----
    await reset(); await setup(); await openRollout();
    const lookupSetupNote = page.locator('[data-rollout-lookup-note="setup"]');
    assert.equal(await lookupSetupNote.isHidden(), true, '参照先変換が無いときは注意を出さない');
    await openAllDetails(); await lookupBox().fill('10 → 20\n11 → 21');
    await openDetail();
    assert.equal(await lookupSetupNote.isVisible(), true);
    assert.equal(await lookupSetupNote.innerText(), '参照先変換（2 件）を、すべての反映先に同じように使います。反映先ごとに変換先が違う場合は、反映先を切り替えた後に参照先変換を直してください。', '入力欄の説明に注意を出す');
    await rolloutBox().fill('303\n404');
    await compare(); await button('差分ありだけ選択').click(); await execute(); await idle();
    const lookupCardNote = page.locator('[data-rollout-lookup-note="card"]');
    assert.equal(await lookupCardNote.isVisible(), true);
    assert.match(await lookupCardNote.innerText(), /^参照先変換（2 件）を、すべての反映先に同じように使います。/, '結果画面のカードにも注意を出す');
    await assertNoLegacyTerms('参照先変換の注意のある反映結果画面');
    await reset(); await setup(); await openRollout();
    await rolloutBox().fill('303\n404');
    await compare(); await button('差分ありだけ選択').click(); await execute(); await idle();
    assert.equal(await page.locator('[data-rollout-lookup-note="card"]').isHidden(), true, '参照先変換が無ければカードにも出さない');

    // ---- 入力中のアプリ名確認：差分取得で確認できた名前で更新し、失敗は欄の change で確認し直す ----
    await reset();
    const targetField = page.getByRole('textbox', { name: '反映先アプリID', exact: true });
    await targetField.fill('303');
    await noteIs(1, /✓ 旧名称アプリ/, '入力中の確認で名前を表示する');
    await page.getByRole('textbox', { name: '反映元アプリID', exact: true }).fill('101');
    await button('フォームのみ').click();
    await compare();
    await tab('対象を選ぶ').click();
    await noteIs(1, /✓ 東京営業所/, '差分取得で確認できた名前（API）へ入力欄の下の表示を更新する');
    const lookupsAfterCompare = (await lookupLog()).length;
    await targetField.fill('505'); await noteIs(1, /✓ 大阪営業所/);
    await targetField.fill('303');
    await noteIs(1, /✓ 東京営業所/, '同じ値へ戻したときも、更新した名前を使う');
    assert.equal((await lookupLog()).length, lookupsAfterCompare + 1, '更新した名前は確認キャッシュにも反映し、再確認しない');
    await targetField.fill('999');
    await noteIs(1, /アプリを確認できません/, '確認できない値は警告を出す');
    await page.evaluate(() => { window.__reflectMock.apps['999'] = { name: '回復したアプリ' }; });
    const lookupsBeforeChange = (await lookupLog()).length;
    await page.waitForTimeout(500);
    assert.equal((await lookupLog()).length, lookupsBeforeChange, '値が同じままでは確認し直さない');
    await targetField.dispatchEvent('change');
    await noteIs(1, /✓ 回復したアプリ/, '失敗した欄は、フォーカスを外したとき（change）に確認し直す');
    assert.equal((await lookupLog()).length, lookupsBeforeChange + 1);
    await targetField.dispatchEvent('change');
    await page.waitForTimeout(500);
    assert.equal((await lookupLog()).length, lookupsBeforeChange + 1, '成功している欄は change で確認し直さない');

    // =========================================================================
    // 第5段階: 結果の保持・復元中の安全性・通知・操作性
    // =========================================================================
    const STALE = /直近の反映結果は現在の対象と異なるため表示していません。対象を戻すと表示されます。/;
    const resultStage = () => page.locator('#kus-rl-stage-result');
    const resultJsonShown = () => button('実行結果JSONを保存').isVisible();
    const dockResult = () => page.locator('.kus-lp__result');
    const sourceEnvSelect = () => page.getByRole('combobox', { name: '反映元の取得環境' });
    const previewFilterSelect = () => page.getByRole('combobox', { name: '差分の状態で絞り込み' });
    async function applyOnce(extra = {}) {
      await reset('mixed', { targetPending: cleanPending, ...extra }); await setup();
      await compare(); await button('差分ありだけ選択').click(); await execute(); await idle();
    }

    // ---- 直近の結果は、入力の一時的な編集だけでは失われない（戻すと復帰する） ----
    await applyOnce();
    assert.equal(await resultJsonShown(), true);
    await tab('対象を選ぶ').click();
    await targetInput().fill('2020');
    assert.match(await statusText(), STALE, '結果を表示しない理由と戻し方を知らせる');
    await tab('反映結果').click();
    assert.equal(await resultJsonShown(), false, '対象が違う間は結果を表示しない');
    assert.match(await resultStage().innerText(), STALE, '「まだ反映していません」とは言わない');
    assert.doesNotMatch(await resultStage().innerText(), /まだ反映していません|項目を反映しました|サンプルの反映ログ/);
    await tab('対象を選ぶ').click();
    await targetInput().fill('202');
    await tab('反映結果').click();
    assert.equal(await resultJsonShown(), true, '反映先IDを元に戻すと結果が戻る');
    assert.match(await resultStage().innerText(), /項目を反映しました/);
    assert.match(await resultStage().innerText(), /サンプルの反映ログ/, '実行ログも戻る');
    assert.equal(await restoreButton().isVisible(), true, 'バックアップから戻す導線も戻る');
    assert.doesNotMatch(await resultStage().innerText(), STALE);
    // 保持・参照先変換・取得環境の一時的な編集でも同じ。
    await tab('対象を選ぶ').click();
    await preserveBox().uncheck();
    await tab('反映結果').click(); assert.equal(await resultJsonShown(), false);
    await tab('対象を選ぶ').click(); await preserveBox().check();
    await tab('反映結果').click(); assert.equal(await resultJsonShown(), true, '保持を元に戻すと結果が戻る');
    await tab('対象を選ぶ').click(); await openAllDetails(); await lookupBox().fill('1 → 2');
    await tab('反映結果').click(); assert.equal(await resultJsonShown(), false);
    await tab('対象を選ぶ').click(); await lookupBox().fill('');
    await tab('反映結果').click(); assert.equal(await resultJsonShown(), true, '参照先変換を消すと結果が戻る');
    await tab('対象を選ぶ').click(); await sourceEnvSelect().selectOption('preview');
    await tab('反映結果').click(); assert.equal(await resultJsonShown(), false);
    await tab('対象を選ぶ').click(); await sourceEnvSelect().selectOption('production');
    await tab('反映結果').click(); assert.equal(await resultJsonShown(), true, '取得環境を戻すと結果が戻る');
    const savedResult = await downloadOf('実行結果JSONを保存');
    assert.deepEqual(JSON.parse(savedResult.text).summary, { ok: 1, ng: 0, pending: 0 }, '戻した結果は実行結果JSONとして保存できる');

    // ---- 表示を外している間にパネルを開き直しても、入力が戻れば結果が復帰する ----
    await tab('対象を選ぶ').click(); await targetInput().fill('2020');
    await page.evaluate(() => ReflectHarness.mountReflectLitePanel());
    assert.equal(await targetValue(), '2020');
    await tab('反映結果').click();
    assert.equal(await resultJsonShown(), false);
    assert.match(await resultStage().innerText(), STALE);
    await tab('対象を選ぶ').click(); await targetInput().fill('202');
    await tab('反映結果').click();
    assert.equal(await resultJsonShown(), true, '開き直した後も、入力が戻れば結果が復帰する');
    // 新しい反映が完了したら、表示を外していた前の結果は破棄する。
    await tab('対象を選ぶ').click(); await targetInput().fill('2020');
    await compare(); await button('差分ありだけ選択').click(); await execute(); await idle();
    assert.equal(await resultJsonShown(), true);
    assert.match(await resultStage().innerText(), /反映先 #2020/);
    await tab('対象を選ぶ').click(); await targetInput().fill('202');
    await tab('反映結果').click();
    assert.equal(await resultJsonShown(), false, '新しい反映の後は、前の結果を戻さない');
    assert.match(await resultStage().innerText(), STALE);

    // ---- バックアップから戻す：差分取得の失敗や中止で、直近の結果を失わない ----
    await applyOnce();
    await page.evaluate(() => { window.__reflectMock.mode = 'preview-failure'; });
    await restoreButton().click(); await idle();
    assert.match(await statusText(), /サンプル取得エラー/);
    await tab('反映結果').click();
    assert.equal(await resultJsonShown(), false);
    assert.match(await resultStage().innerText(), STALE, '復元の差分取得に失敗しても「まだ反映していません」とは言わない');
    assert.doesNotMatch(await resultStage().innerText(), /まだ反映していません/);
    await tab('対象を選ぶ').click(); await preserveBox().check();
    assert.match(await statusText(), RESTORE_ENDED);
    await tab('反映結果').click();
    assert.equal(await resultJsonShown(), true, '復元をやめて入力が戻れば、結果が復帰する');
    assert.equal(await restoreButton().isVisible(), true, 'バックアップから戻す導線も復帰する');
    assert.deepEqual(JSON.parse((await downloadOf('実行結果JSONを保存')).text).summary, { ok: 1, ng: 0, pending: 0 });
    // 復元の差分を取得できた後に中止しても同じ。
    await page.evaluate(() => { window.__reflectMock.mode = 'mixed'; });
    await restoreButton().click(); await idle();
    assert.equal(await restoreNotices('review'), 1);
    await tab('対象を選ぶ').click(); await preserveBox().check();
    await tab('反映結果').click();
    assert.equal(await resultJsonShown(), true, '復元の差分を取得した後に中止しても、結果が復帰する');

    // ---- 復元中にパネルを閉じて開き直したら、復元用に設定した値ではなく復元前の値で、通常の状態で開く ----
    await applyThenRestore();
    await page.evaluate(() => ReflectHarness.mountReflectLitePanel());
    await openAllDetails();
    assert.deepEqual(await currentInputs(), EXPECT_BEFORE_RESTORE, '開き直したら復元前の値（反映元・保持・参照先変換・項目）で開く');
    assert.equal(await targetValue(), '202');
    assert.equal(await restoreNotices('review'), 0, '復元の状態は引き継がない');
    assert.equal(await tab('反映結果').getAttribute('aria-selected'), 'true', '結果が復帰するため反映結果の画面で開く');
    assert.equal(await resultJsonShown(), true);
    await tab('差分を確認').click();
    assert.equal(await run().isDisabled(), true, '復元用の差分は鮮度が無く、最終確認へ進めない');
    assert.match(await page.locator('#kus-rl-stage-review .kus-rl-review').innerText(), /対象を指定して差分を取得してください。/);

    // ---- 復元中は「フィールド設定も反映対象に含めて再取得」を出さない ----
    const fieldRefs = { requiredFields: { appSettings: ['code_x'] }, sourceFieldCodes: ['code_x'] };
    await reset('mixed', { targetPending: cleanPending, ...fieldRefs }); await setup();
    await button('全解除').click(); await checkbox('一般設定').check(); await compare();
    assert.equal(await button('フィールド設定も反映対象に含めて再取得').count(), 1, '通常は不足フィールドの解消ボタンを出す');
    await reset('mixed', { targetPending: cleanPending }); await setup();
    await button('全解除').click(); await checkbox('一般設定').check(); await compare();
    await button('差分ありだけ選択').click(); await execute(); await idle();
    await page.evaluate(refs => Object.assign(window.__reflectMock, refs), fieldRefs);
    await restoreButton().click(); await idle();
    assert.equal(await restoreNotices('review'), 1);
    assert.equal(await button('フィールド設定も反映対象に含めて再取得').count(), 0, '復元中は解消ボタンを出さない');
    assert.match(await page.locator('#kus-rl-stage-review [data-reflect-fix-note="restore"]').innerText(), /バックアップから戻している間はフィールド設定を追加できません/);
    assert.equal(await sourceModeValue(), 'json', '復元のまま');
    assert.equal((await selectedScopeKeys()).includes('fieldSettings'), false, 'フィールド設定を足さない');

    // ---- 反映元のシステムフィールドを参照する一覧：反映先で合わせる案内を出し、フィールド設定の追加は案内しない ----
    const systemRef = { requiredFields: { appSettings: ['Record_number'] }, sourceSystemFieldCodes: ['Record_number'], targetFieldCodes: ['レコード番号'] };
    for (const sourceFieldCodes of [[], ['code_x']]) {
      await reset('mixed', { targetPending: cleanPending, sourceFieldCodes, ...systemRef }); await setup();
      await button('全解除').click(); await checkbox('一般設定').check(); await compare();
      const reviewText = await page.locator('#kus-rl-stage-review').innerText();
      assert.match(reviewText, /参照するフィールド「Record_number」は反映元のシステムフィールド/, `システムフィールドのコード違いを区別して案内する（反映元のフィールド ${JSON.stringify(sourceFieldCodes)}）`);
      assert.doesNotMatch(reviewText, /「Record_number」が反映先にありません/);
      assert.equal(await button('フィールド設定も反映対象に含めて再取得').count(), 0, 'システムフィールドの不足ではフィールド設定の追加を案内しない');
      assert.equal(await run().isDisabled(), true, '確認できない項目が選択されている間は最終確認へ進めない');
    }
    // 通常のフィールドが不足するときは従来どおり案内する。
    await reset('mixed', { targetPending: cleanPending, requiredFields: { appSettings: ['code_x'] }, sourceFieldCodes: ['code_x'], sourceSystemFieldCodes: ['Record_number'] }); await setup();
    await button('全解除').click(); await checkbox('一般設定').check(); await compare();
    assert.match(await page.locator('#kus-rl-stage-review').innerText(), /参照するフィールド「code_x」が反映先にありません/);
    assert.equal(await button('フィールド設定も反映対象に含めて再取得').count(), 1);

    // ---- 前の失敗の詳細ログ（ドック下部）を、次の操作の結果として残さない ----
    await reset('preview-failure', { previewError: '一時的な通信エラー\n詳細1: 接続を確認してください\n詳細2: 再試行してください' });
    await setup(); await compare();
    assert.equal(await dockResult().isVisible(), true, '複数行のエラーは詳細ログを出す');
    assert.match(await dockResult().innerText(), /詳細1: 接続を確認してください/);
    await page.evaluate(() => { window.__reflectMock.mode = 'mixed'; });
    await compare();
    assert.equal(await dockResult().isVisible(), false, '次の差分取得の開始時に詳細ログを消す');
    assert.equal(await dockResult().innerText(), '');
    await page.evaluate(() => { window.__reflectMock.applyThrows = '確認が一致しません\n詳細A: 差分を取り直してください\n詳細B'; });
    await button('差分ありだけ選択').click(); await execute(); await idle();
    assert.equal(await dockResult().isVisible(), true, '書き込み前の停止の詳細ログを出す');
    await page.evaluate(() => { window.__reflectMock.applyThrows = ''; });
    await button('差分を再取得').click();
    assert.equal(await dockResult().isVisible(), false);
    await idle();
    await page.evaluate(() => { window.__reflectMock.applyThrows = '確認が一致しません\n詳細A\n詳細B'; });
    await button('差分ありだけ選択').click(); await execute(); await idle();
    assert.equal(await dockResult().isVisible(), true);
    await page.evaluate(() => { window.__reflectMock.applyThrows = ''; });
    await button('差分を再取得').click(); await idle();
    await button('差分ありだけ選択').click(); await execute(); await idle();
    assert.equal(await dockResult().isVisible(), false, '反映の成功後に前の詳細ログを残さない');
    await page.evaluate(() => { window.__reflectMock.mode = 'preview-failure'; });
    await tab('反映結果').click(); await button('反映後の差分を再確認').click(); await idle();
    assert.equal(await dockResult().isVisible(), true);
    await page.evaluate(() => { window.__reflectMock.mode = 'mixed'; });
    await button('反映後の差分を再確認').click();
    assert.equal(await dockResult().isVisible(), false, '再確認の開始時にも詳細ログを消す');
    await idle();
    // 反映の開始時にも消す（書き込み前の停止の詳細ログが、次の反映に残らない）。
    await page.evaluate(() => { window.__reflectMock.mode = 'preview-failure'; });
    await tab('差分を確認').click(); await button('差分を再取得').click(); await idle();
    assert.equal(await dockResult().isVisible(), true);
    // プリセットJSONの読み込みでも消す。
    await presetFileBox().setInputFiles({ name: 'p.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ kind: 'reflect-presets', presets: [{ name: 'A', source: { appId: '101' }, target: { appId: '202' }, scopes: ['fieldSettings'] }] })) });
    await idle();
    assert.equal(await dockResult().isVisible(), false, 'プリセットJSONの読み込み開始時にも詳細ログを消す');

    // ---- 復元の終了通知は、同じ操作の後続のステータス（項目のセット選択など）で上書きしない ----
    await applyThenRestore();
    await tab('対象を選ぶ').click();
    await button('すべての項目').click();
    const noticeStatus = await statusText();
    assert.match(noticeStatus, /バックアップからの復元を終了しました。/, '復元の終了通知を残す');
    assert.match(noticeStatus, /「すべての項目」を選びました/, '後続の通知も表示する');
    assert.ok(noticeStatus.indexOf('バックアップからの復元を終了しました。') < noticeStatus.indexOf('「すべての項目」を選びました'), '終了通知を先頭に置く');
    await button('フォームのみ').click();
    assert.doesNotMatch(await statusText(), /バックアップからの復元を終了しました。/, '通知は1回だけ付ける');

    // ---- プリセットの選択は、処理後の再構築で先頭へ戻らない。読み込み時の通知 ----
    const presetPick = () => presetSelectBox();
    await reset(); await setup(); await openAllDetails();
    const settingsBundle = { name: 'settings.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ appId: '901', sections: { fieldSettings: { properties: {} } } })) };
    await presetFileBox().setInputFiles({ name: 'presets.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ kind: 'reflect-presets', presets: [
      { name: '一件目', source: { appId: '101' }, target: { appId: '202' }, scopes: ['fieldSettings'] },
      { name: '二件目', source: { appId: '101' }, target: { appId: '303' }, scopes: ['fieldSettings', 'legacyScope', 'futureScope'], lookupMap: 'abc', rolloutQueue: 'not an app' }
    ] })) });
    await idle();
    await presetPick().selectOption('二件目');
    await compare();
    assert.equal(await presetPick().inputValue(), '二件目', '処理後に選択したプリセットを保つ');
    await tab('対象を選ぶ').click();
    await page.getByRole('combobox', { name: '反映元の取得方法' }).selectOption('json');
    await page.getByLabel('反映元の設定JSON', { exact: true }).setInputFiles(settingsBundle); await idle();
    assert.match(await page.locator('.kus-lp__small', { hasText: '設定JSONを読み込み済み' }).first().evaluate(el => el.textContent), /アプリ #901/);
    await openAllDetails();
    await presetPick().selectOption('二件目');
    await button('読み込み').click();
    const loadStatus = await statusText();
    assert.equal(await page.locator('.kus-lp__status').getAttribute('data-tone'), 'warn', '読み込みで落ちた内容があれば警告にする');
    assert.match(loadStatus, /プリセット「二件目」を読み込みました。/);
    assert.match(loadStatus, /読み込み済みの反映元JSONは破棄しました/);
    assert.match(loadStatus, /未対応の項目 2 件（legacyScope、futureScope）は選択できませんでした/);
    assert.match(loadStatus, /参照先変換を読み取れません。/);
    assert.match(loadStatus, /続けて反映する反映先を読み取れません。/);
    await presetPick().selectOption('一件目');
    await button('読み込み').click();
    assert.equal(await page.locator('.kus-lp__status').getAttribute('data-tone'), 'ok', '問題が無い読み込みは通常どおり成功にする');
    assert.doesNotMatch(await statusText(), /破棄|未対応|読み取れません/);

    // ---- 差分一覧を再描画しても、開いていた details を閉じない ----
    await reset('mixed', { itemsMode: 'many', targetPending: cleanPending }); await setup(); await compare();
    const previewFieldRow = '[data-reflect-entry="fieldSettings"]';
    await page.locator(`${previewFieldRow} .kus-rl-items__more`).click();
    assert.equal(await page.locator(`${previewFieldRow} .kus-rl-items__list > li`).count(), 27, '変更の要約の続きを表示した');
    await page.locator(`${previewFieldRow} details.kus-rl-changes > summary`).click();
    await page.locator('details[data-reflect-details="group:same"] > summary').click();
    assert.equal(await page.locator('details[data-reflect-details="fieldSettings:changes"]').evaluate(node => node.open), true);
    assert.equal(await page.locator('details[data-reflect-details="group:same"]').evaluate(node => node.open), true);
    await page.locator('input[data-reflect-scope="fieldSettings"]').uncheck();
    await page.locator('input[data-reflect-scope="fieldSettings"]').check();
    assert.equal(await page.locator('details[data-reflect-details="fieldSettings:changes"]').evaluate(node => node.open), true, '設定値の内訳は開いたままにする');
    assert.equal(await page.locator('details[data-reflect-details="group:same"]').evaluate(node => node.open), true, '差分なしのグループは開いたままにする');
    assert.equal(await page.locator(`${previewFieldRow} .kus-rl-items__list > li`).count(), 27, '変更の要約の続きも表示したままにする');
    await previewFilterSelect().selectOption('change');
    await previewFilterSelect().selectOption('all');
    assert.equal(await page.locator('details[data-reflect-details="fieldSettings:changes"]').evaluate(node => node.open), true, '絞り込みを戻しても開いていた内訳を保つ');
    // 新しく差分を取得し直したときは、前の開閉状態を引き継がない。
    await button('差分を再取得').click(); await idle();
    assert.equal(await page.locator('details[data-reflect-details="fieldSettings:changes"]').evaluate(node => node.open), false, '再取得した差分は閉じた状態から始める');

    // ---- 「最終確認」が無効でも、矢印キーは次の有効な段階へ移る ----
    await reset(); await setup();
    await tab('対象を選ぶ').focus();
    await page.keyboard.press('ArrowRight');
    assert.equal(await tab('差分を確認').getAttribute('aria-selected'), 'true');
    assert.equal(await tab('最終確認').isDisabled(), true);
    await page.keyboard.press('ArrowRight');
    assert.equal(await tab('反映結果').getAttribute('aria-selected'), 'true', '無効な「最終確認」を飛ばして反映結果へ移る');
    await page.keyboard.press('ArrowLeft');
    assert.equal(await tab('差分を確認').getAttribute('aria-selected'), 'true', '戻るときも無効な段階を飛ばす');
    await tab('対象を選ぶ').click(); await compare();
    await button('差分ありだけ選択').click();
    await tab('差分を確認').focus();
    await page.keyboard.press('ArrowRight');
    assert.equal(await tab('最終確認').getAttribute('aria-selected'), 'true', '有効なら最終確認へ進める');

    // ---- パネルを閉じた後は、待機中のアプリ名確認を行わない ----
    await reset();
    await page.waitForTimeout(700);
    const lookupsBeforeClose = (await lookupLog()).length;
    await page.getByRole('textbox', { name: '反映先アプリID', exact: true }).fill('303');
    await page.locator('#kus-reflect-lite .kus-lp__close').click();
    await page.waitForTimeout(800);
    assert.equal(await page.locator('#kus-reflect-lite').count(), 0);
    assert.equal((await lookupLog()).length, lookupsBeforeClose, '閉じた後に /app.json を呼ばない');
    await reset();
    await page.waitForTimeout(700);
    const lookupsBeforeReplace = (await lookupLog()).length;
    await page.getByRole('textbox', { name: '反映先アプリID', exact: true }).fill('404');
    await page.evaluate(() => { const root = document.getElementById('kus-reflect-lite'); root.dispatchEvent(new Event('kus-lite-dispose')); root.remove(); });
    await page.waitForTimeout(800);
    assert.equal((await lookupLog()).length, lookupsBeforeReplace, '置き換え・破棄の後も /app.json を呼ばない');

    // ---- 後処理が例外を出しても処理中の表示を止める。処理中の二重呼び出しで無効化の記録を壊さない ----
    await reset(); await setup();
    await page.evaluate(() => {
      Object.defineProperty(document.querySelector('select[aria-label="保存済みプリセット"]'), 'innerHTML', { configurable: true, set() { throw new Error('再計算の失敗'); } });
    });
    const errorsBefore = errors.length;
    await button('差分を確認する').click();
    await page.waitForFunction(() => document.querySelector('#kus-reflect-lite').style.cursor !== 'progress');
    await page.waitForTimeout(200);
    assert.equal(await page.locator('#kus-reflect-lite .kus-lp__elapsed').evaluate(element => element.classList.contains('kus-lp__elapsed--done') && /^前回 /.test(element.textContent || '')), true, '後処理が失敗しても経過時間のカウントを止め、所要時間を「前回」として残す');
    assert.equal(await page.locator('#kus-reflect-lite .kus-lp__close').isEnabled(), true, '閉じるボタンを戻す');
    const injectedErrors = errors.splice(errorsBefore);
    assert.ok(injectedErrors.length >= 1 && injectedErrors.every(message => /再計算の失敗/.test(message)), '注入した後処理の例外だけが起きる: ' + injectedErrors.join(' / '));
    await reset(); await setup();
    await page.evaluate(() => {
      const start = Array.from(document.querySelectorAll('button')).find(node => node.textContent.includes('差分を確認する'));
      start.click();
      // 処理中に別の処理が始まっても（二重呼び出し）、元の無効化状態の記録を上書きしない。
      document.querySelector('input[aria-label="反映元の設定JSON"]').dispatchEvent(new Event('change'));
    });
    await idle();
    assert.equal(await checkbox('一般設定').isEnabled(), true, '二重呼び出しの後に、項目の選択が無効のまま残らない');
    assert.equal(await button('全選択').isEnabled(), true);
    assert.equal(await page.getByRole('textbox', { name: '反映先アプリID', exact: true }).isEnabled(), true);

    // ---- 続けて反映：入力欄の見た目（5つの幅） ----
    await reset(); await setup(); await openRollout();
    await rolloutBox().fill('203\n204\nhttps://example.cybozu.com/k/guest/5/206/');
    // 入力欄は「詳細設定」のポップアップの中にある。どの幅・高さでもポップアップが画面に収まり、中で縦にスクロールできること。
    await openDetail();
    for (const [width, height] of [[1440, 1000], [1024, 768], [720, 450], [390, 844], [320, 640], [320, 320]]) {
      await page.setViewportSize({ width, height });
      await page.locator('.kus-rl-rollout').evaluate(el => el.scrollIntoView({ block: 'nearest' }));
      await page.screenshot({ path: path.join(OUT, `rollout-input-${width}x${height}.png`) });
      const geometry = await page.evaluate(() => {
        const dialog = document.querySelector('#kus-rl-detail'), body = dialog.querySelector('.kus-lp__dialog-body'), head = dialog.querySelector('.kus-lp__dialog-head'), foot = dialog.querySelector('.kus-lp__dialog-foot');
        const box = document.querySelector('.kus-rl-rollout').getBoundingClientRect(), ta = document.querySelector('.kus-rl-rollout__input').getBoundingClientRect(), d = dialog.getBoundingClientRect(), b = body.getBoundingClientRect();
        const cards = Array.from(dialog.querySelectorAll('.kus-lp__dialog-body > .kus-lp__card')).map(card => card.getBoundingClientRect());
        return { overflow: body.scrollWidth - body.clientWidth, outside: ta.right > box.right + 1 || ta.left < box.left - 1, taWidth: ta.width,
          dialogFits: d.left >= -1 && d.top >= -1 && d.right <= innerWidth + 1 && d.bottom <= innerHeight + 1, cardsFit: cards.every(c => c.left >= b.left - 1 && c.right <= b.right + 1),
          headVisible: head.getBoundingClientRect().height > 20, footVisible: foot.getBoundingClientRect().bottom <= innerHeight + 1, bodyHeight: Math.round(b.height), cards: cards.length };
      });
      assert.ok(geometry.overflow <= 1 && !geometry.outside && geometry.taWidth > 150 && geometry.dialogFits && geometry.cardsFit && geometry.headVisible && geometry.footVisible && geometry.cards === 4 && geometry.bodyHeight >= 60, `${width}x${height}pxで詳細設定のポップアップが崩れる: ${JSON.stringify(geometry)}`);
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    await closeDetail();

    // ---- スクロールはパネル内の本文領域だけに限定する（パネル外枠が動いて見出しが消えない） ----
    const panelGeometry = () => page.evaluate(() => {
      const root = document.querySelector('#kus-reflect-lite'), canvas = document.querySelector('.kus-rl-canvas');
      const hero = root.querySelector('.kus-lp__hero').getBoundingClientRect(), dock = document.querySelector('.kus-rl-action-dock').getBoundingClientRect(), rect = root.getBoundingClientRect();
      return { rootScroll: root.scrollTop, bodyScroll: root.querySelector('.kus-lp__body').scrollTop, heroTop: Math.round(hero.top - rect.top), heroHeight: Math.round(hero.height), dockBottom: Math.round(rect.bottom - dock.bottom), canvasScroll: Math.round(canvas.scrollTop) };
    });
    await reset(); await setup(); await page.setViewportSize({ width: 320, height: 640 }); await compare();
    await page.locator('.kus-rl-summary tbody tr').nth(0).getByRole('button', { name: 'フィールド設定', exact: true }).evaluate(b => b.click());
    await page.waitForFunction(() => document.querySelector('[data-reflect-entry="fieldSettings"] details.kus-rl-changes')?.open);
    await page.waitForTimeout(900);
    let scrolled = await panelGeometry();
    assert.deepEqual([scrolled.rootScroll, scrolled.bodyScroll, scrolled.heroTop <= 2, scrolled.dockBottom <= 2], [0, 0, true, true], '要約表から移動してもパネル外枠は動かず、見出しと固定フッターが元の位置に残る');
    assert.ok(scrolled.heroHeight > 20 && scrolled.canvasScroll > 0, '本文領域だけがスクロールする: ' + JSON.stringify(scrolled));
    await page.screenshot({ path: path.join(OUT, 'review-navigate-320.png') });
    await page.setViewportSize({ width: 1440, height: 1000 });
    await reset('partial'); await setup(); await page.getByRole('checkbox', { name: 'プロセス管理', exact: true }).check();
    await compare(); await button('差分ありだけ選択').click(); await execute(); await idle();
    await page.setViewportSize({ width: 320, height: 640 });
    await button('失敗・未実行だけ選択').click();
    await page.waitForTimeout(900);
    scrolled = await panelGeometry();
    assert.deepEqual([scrolled.rootScroll, scrolled.bodyScroll, scrolled.heroTop <= 2, scrolled.dockBottom <= 2], [0, 0, true, true], '「失敗・未実行だけ選択」でもパネル外枠は動かない');
    assert.ok(scrolled.heroHeight > 20, '見出しが画面内に残る');
    await page.screenshot({ path: path.join(OUT, 'result-retry-320.png') });
    await page.setViewportSize({ width: 1440, height: 1000 });

    // ---- 失敗の表示：利用者向けの文を先に示し、内部の通信情報（[API] …）は結果カードに出さない ----
    await reset('api-failure'); await setup();
    await page.getByRole('checkbox', { name: 'プロセス管理', exact: true }).check();
    await compare(); await button('差分ありだけ選択').click(); await execute(); await idle();
    const apiFailedItem = page.locator('#kus-rl-stage-result .kus-rl-result-item').first();
    assert.match(await apiFailedItem.locator('.kus-rl-result-item__message').innerText(), /^指定したアプリが見つかりません（GAIA_AP01）$/, '失敗の理由は利用者向けの 1 行目を示す');
    assert.doesNotMatch(await page.locator('#kus-rl-stage-result').innerText(), /\[API\]|payload=|\/k\/v1\//, '内部の通信情報を結果カードに出さない');

    // ---- 中止後の表示：途中で止まった項目は「失敗」ではなく「途中で停止」、残りは「未実行」で統一する ----
    await reset('cancelled'); await setup();
    await page.getByRole('checkbox', { name: 'プロセス管理', exact: true }).check();
    await compare(); await button('差分ありだけ選択').click(); await execute(); await idle();
    const cancelledResult = page.locator('#kus-rl-stage-result');
    const cancelledItems = cancelledResult.locator('.kus-rl-result-item');
    assert.equal(await cancelledItems.count(), 2);
    assert.match(await cancelledItems.nth(0).locator('.kus-rl-result-state').innerText(), /途中で停止/, '一覧でも「途中で停止」と示す');
    assert.doesNotMatch(await cancelledItems.nth(0).locator('.kus-rl-result-state').innerText(), /失敗/);
    assert.match(await cancelledItems.nth(1).locator('.kus-rl-result-state').innerText(), /未実行/);
    assert.equal(await cancelledItems.nth(0).locator('.kus-rl-result-item__hint').count(), 0, '途中で停止した項目に失敗のヒントを付けない');
    const cancelledText = await cancelledResult.innerText();
    assert.match(cancelledText, /成功 0 \/ 失敗 0 \/ 途中で停止 1 \/ 未実行 1/, '見出しの件数は失敗に数えない');
    assert.match(cancelledText, /途中で停止: \S+/, '概要の行も「途中で停止」と示す');
    assert.doesNotMatch(cancelledText, /失敗: /, '中止で止まった項目を「失敗:」に並べない');
    assert.match(await page.locator('.kus-lp__status').innerText(), /1 件は途中で停止/);

    // ---- 取得に失敗した項目があるとき、差分取得の完了は警告色で件数を示す。最終確認へ進むと段階に合った案内にする ----
    await reset('mixed', { fetchFailure: true }); await setup();
    await page.getByRole('checkbox', { name: 'ビュー設定', exact: true }).check();
    await compare();
    assert.equal(await page.locator('.kus-lp__status').getAttribute('data-tone'), 'warn', '取得失敗があるときは成功の緑にしない');
    assert.match(await page.locator('.kus-lp__status').innerText(), /1 項目は設定を取得できませんでした/);
    await button('差分ありだけ選択').click(); await run().click();
    assert.equal(await page.locator('.kus-lp__status').getAttribute('data-tone'), 'info', '最終確認では中立の案内にする');
    assert.doesNotMatch(await page.locator('.kus-lp__status').innerText(), /差分を取得しました/, '差分取得の完了メッセージを最終確認に持ち越さない');

    // ---- 低い画面の最終確認：見出し・案内・ステップ・フッターを詰めて、書き込み先と変更内容に高さを回す ----
    await reset('mixed', { itemsMode: 'basic', targetPending: cleanPending }); await setup(); await compare(); await button('差分ありだけ選択').click(); await run().click();
    for (const [width, height, minimum] of [[1024, 400, 190], [320, 420, 160], [390, 480, 210], [1440, 500, 280]]) {
      await page.setViewportSize({ width, height });
      await tab('最終確認').click();
      const geometry = await page.evaluate(() => {
        const canvas = document.querySelector('.kus-rl-canvas'), box = canvas.getBoundingClientRect();
        const target = document.querySelector('#kus-rl-stage-confirm .kus-rl-confirm-route > div:last-child').getBoundingClientRect();
        const dock = document.querySelector('.kus-rl-action-dock').getBoundingClientRect(), root = document.querySelector('#kus-reflect-lite').getBoundingClientRect();
        canvas.scrollTop = 0;
        return { canvasHeight: Math.round(canvas.clientHeight), dockHeight: Math.round(dock.height), rootHeight: Math.round(root.height), overflow: canvas.scrollWidth - canvas.clientWidth,
          targetTop: Math.round(target.top - box.top), targetBottom: Math.round(target.bottom - box.top), hintVisible: !!document.querySelector('.kus-lp__hint')?.offsetParent };
      });
      assert.ok(geometry.canvasHeight >= minimum && geometry.dockHeight <= geometry.rootHeight * 0.4 && geometry.overflow <= 1 && !geometry.hintVisible, `${width}×${height}（最終確認）で本文の領域が足りない: ${JSON.stringify(geometry)}`);
      if (width >= 1024) assert.ok(geometry.targetBottom <= geometry.canvasHeight, `${width}×${height}で書き込み先がスクロールしないと見えない: ${JSON.stringify(geometry)}`);
      else assert.ok(geometry.targetTop < geometry.canvasHeight, `${width}×${height}で書き込み先が見えない: ${JSON.stringify(geometry)}`);
      await page.screenshot({ path: path.join(OUT, `lowheight-confirm-${width}x${height}.png`) });
    }
    await page.setViewportSize({ width: 1440, height: 1000 });

    // ---- 低い画面でも本文の領域を十分に残す（固定フッターが本文を圧迫しない） ----
    await reset('mixed', { itemsMode: 'basic', targetPending: cleanPending }); await setup();
    for (const [width, height, minimum] of [[320, 640, 280], [1024, 600, 260], [720, 450, 200], [1024, 720, 340]]) {
      await page.setViewportSize({ width, height });
      for (const stage of ['対象を選ぶ', '差分を確認']) {
        if (stage === '差分を確認' && await button('差分を確認する').isVisible()) { await compare(); }
        await tab(stage).click();
        const geometry = await page.evaluate(() => {
          const canvas = document.querySelector('.kus-rl-canvas'), dock = document.querySelector('.kus-rl-action-dock').getBoundingClientRect(), root = document.querySelector('#kus-reflect-lite').getBoundingClientRect();
          return { canvasHeight: Math.round(canvas.clientHeight), dockHeight: Math.round(dock.height), rootHeight: Math.round(root.height) };
        });
        assert.ok(geometry.canvasHeight >= minimum && geometry.dockHeight <= geometry.rootHeight * 0.42, `${width}×${height}（${stage}）で本文の領域が足りない: ${JSON.stringify(geometry)}`);
      }
      await page.screenshot({ path: path.join(OUT, `lowheight-${width}x${height}.png`) });
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
    fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify({ passed: true, sizes, checks: ['guided workflow', 'setup blockers', 'app URL input', 'lookup map lines', 'preset export and import', 'no write on compare', 'busy lock', 'scope reuse', 'freshness', 'search and status filters', 'keyboard focus', 'JSON source and errors', 'partial results and retry', 'result report export', 'post-apply verification', 'result invalidation on target change', 'result invalidation on JSON replacement', 'terminology (反映元/反映先)', 'app name lookup', 'scope descriptions and replace badges', 'field settings notice', 'summary table navigation', 'per-section results and undo guidance', 'responsive geometry', 'markdown plan and record', 'rollout queue', 'rollout result card and log', 'rollout presets', 'restore source label'], pageErrors: errors }, null, 2));
    console.log('PASS reflect-lite: workflow, terminology, app names, scope hints, summary table, setup blockers, URL input, lookup lines, presets, freshness, filters, JSON, partial results, per-section results, result export, markdown plan/record, rollout to multiple apps, restore source label, post-apply check, keyboard, 5 viewport sizes');
    console.log(`Artifacts: ${OUT}`);
  } catch (error) {
    await page.screenshot({ path: path.join(OUT, 'failure.png') });
    console.error(await page.locator('#kus-reflect-lite').innerText());
    console.error('Browser errors:', errors);
    throw error;
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
