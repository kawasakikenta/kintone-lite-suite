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
        message: status === 'change' ? '入力欄のラベルと必須設定が変更されています。' : status === 'same' ? '設定は一致しています。' : '比較先の取得に失敗しました。アクセス権を確認してください。',
        ...(sectionKey === 'fieldSettings' ? { fieldStats: { add: 2, update: 3, tgtOnly: 1 } } : {}) };
    });
    return { entries, totalSections: entries.length, changedSections: entries.filter(e => e.status === 'change').length,
      sameSections: entries.filter(e => e.status === 'same').length, errorSections: entries.filter(e => e.status === 'error').length };
  }
  export async function preflightLookupMapStandalone() { return { ok: true, missing: [] }; }
  export async function runApplyPreviewStandalone(opts, status, progress) {
    const mock = window.__reflectMock;
    mock.applies.push(opts);
    await new Promise(resolve => setTimeout(resolve, 100));
    const sections = opts.scopes.map((sectionKey, i) => ({ sectionKey, label: sectionKey,
      status: mock.mode === 'partial' ? i === 0 ? 'ng' : 'pending' : 'ok' }));
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
      build.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({ contents: mockEngine, loader: 'js' }));
    } }]
  });
  return result.outputFiles[0].text;
}

const fixture = `
window.__reflectMock = { previews: [], applies: [], mode: 'mixed' };
window.kintone = { app: { getId: () => 202 }, api: Object.assign(async () => ({}), { url: p => p }) };
`;

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const script = await bundle();
  const demo = '<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>プレビュー反映 · 操作デモ</title><body style="background:#e8edf3"><script>' + fixture + script.replace(/<\/script/gi, '<\\/script') + '\nReflectHarness.mountReflectLitePanel();document.querySelector(".kus-lp__subtitle").textContent="操作デモ · サンプルデータのみ。実アプリへの通信・書き込みは行いません。";const demoSource=document.querySelector("[aria-label=比較元アプリID]");demoSource.value="101";demoSource.dispatchEvent(new Event("input"));Array.from(document.querySelectorAll("button")).find(b=>b.textContent==="フォームのみ").click();</script></body></html>';
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
  const run = () => page.getByRole('button', { name: /^プレビュー反映を実行/ });
  async function idle() { await page.waitForFunction(() => document.querySelector('#kus-reflect-lite').getAttribute('aria-busy') !== 'true'); }
  async function setup() {
    await page.getByRole('textbox', { name: '比較元アプリID', exact: true }).fill('101');
    await button('フォームのみ').click();
  }
  async function compare() { await button('差分を確認する').click(); await idle(); }
  try {
    await reset();
    assert.equal(await button('差分を確認する').isDisabled(), true);
    assert.equal(await run().count(), 0, '設定時に反映ボタンを見せない');
    assert.equal(await page.getByRole('textbox', { name: '比較元ゲストスペースID', exact: true }).count(), 0);
    await tab('反映結果').click();
    assert.match(await page.locator('#kus-rl-stage-result').innerText(), /まだ反映していません/);
    await tab('対象を選ぶ').click();
    await setup();
    await button('差分を確認する').evaluate(b => { b.click(); b.click(); });
    assert.equal(await page.getByRole('textbox', { name: '比較元アプリID', exact: true }).isDisabled(), true);
    await idle();
    assert.equal(await page.evaluate(() => window.__reflectMock.previews.length), 1, '二重比較を防ぐ');
    assert.equal(await page.evaluate(() => window.__reflectMock.applies.length), 0, '差分確認では書き込まない');
    assert.equal(await run().isEnabled(), true);
    assert.equal(await button('閉じる').isEnabled(), true, '比較完了後はパネルを閉じられる');
    assert.match(await page.locator('#kus-rl-stage-review').innerText(), /取得失敗/);
    const filter = page.getByRole('combobox', { name: '差分の状態で絞り込み' });
    await filter.selectOption('error');
    assert.equal(await page.getByRole('checkbox', { name: 'ビュー設定を反映候補に含める', exact: true }).count(), 1);
    assert.equal(await page.getByRole('checkbox', { name: 'フィールド設定を反映候補に含める', exact: true }).count(), 0);
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
    await page.getByRole('textbox', { name: '比較先アプリID', exact: true }).fill('303');
    await tab('差分を確認').click();
    assert.equal(await run().isDisabled(), true, '接続変更で確認済み状態を解除');
    await button('差分を再取得').click();
    await idle();
    page.on('dialog', async dialog => { await dialog.accept(dialog.type() === 'prompt' ? dialog.message().match(/「(\d+)」/)?.[1] : undefined); });
    await run().click();
    await idle();
    assert.equal(await page.evaluate(() => window.__reflectMock.applies.length), 1);
    assert.equal(await page.evaluate(() => window.__reflectMock.applies[0].targetAppId), '303');
    assert.equal(await page.evaluate(() => window.__reflectMock.applies[0].doDeploy), false);
    assert.match(await page.locator('#kus-rl-stage-result').innerText(), /全成功/);
    await tab('差分を確認').click();
    assert.equal(await run().isDisabled(), true, '反映後に古い差分を再実行しない');

    await reset('same'); await setup(); await compare();
    assert.equal(await run().isDisabled(), true);
    await reset('partial'); await setup();
    await page.getByRole('checkbox', { name: 'プロセス管理', exact: true }).check();
    await compare(); await run().click(); await idle();
    assert.match(await page.locator('#kus-rl-stage-result').innerText(), /一部エラー/);
    assert.equal(await button('失敗・未実行だけ選択').isVisible(), true);
    await button('失敗・未実行だけ選択').click();
    assert.equal(await tab('対象を選ぶ').getAttribute('aria-selected'), 'true');

    await reset(); await setup();
    await page.getByRole('combobox', { name: '比較元の取得方法' }).selectOption('json');
    assert.equal(await button('差分を確認する').isDisabled(), true, 'JSON未読込では以前のアプリIDで比較しない');
    await page.getByLabel('比較元の設定JSON', { exact: true }).setInputFiles({ name: 'settings.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ appId: '901', sections: { fieldSettings: { properties: {} } } })) });
    await idle();
    assert.equal(await button('差分を確認する').isEnabled(), true);
    await compare();
    assert.equal(await page.evaluate(() => window.__reflectMock.previews[0].sourceBundle.appId), '901');
    await button('対象を変更').click();
    await page.getByLabel('比較元の設定JSON', { exact: true }).setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{bad') });
    await idle();
    assert.equal(await button('差分を確認する').isDisabled(), true, '不正なJSONの読込失敗後に古いJSONを使用しない');
    await page.getByLabel('比較元の設定JSON', { exact: true }).setInputFiles({ name: 'apps.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ apps: [{ appId: '901', sections: {} }, { appId: '902', sections: {} }] })) });
    await idle();
    await page.getByRole('combobox', { name: '設定JSON内の比較元アプリ', exact: true }).selectOption('1');
    await compare();
    assert.equal(await page.evaluate(() => window.__reflectMock.previews.at(-1).sourceBundle.appId), '902', '複数アプリJSONから明示的に比較元を選べる');

    await reset('preview-failure'); await setup(); await compare();
    assert.match(await page.locator('.kus-lp__status').innerText(), /サンプル取得エラー/);
    assert.equal(await button('差分を確認する').isEnabled(), true, '取得失敗後も再試行できる');

    await reset(); await setup(); await compare();
    await page.evaluate(() => { window.__reflectMock.mode = 'preview-failure'; });
    await button('差分を再取得').click(); await idle();
    assert.equal(await run().isDisabled(), true, '再取得失敗後に過去の差分で反映しない');

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
    assert.equal(await page.getByRole('textbox', { name: '比較元アプリID', exact: true }).inputValue(), '101');
    await compare();
    assert.equal(await run().isEnabled(), true, '配布する操作デモも単独で動作する');
    assert.deepEqual(errors, []);
    fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify({ passed: true, sizes, checks: ['guided workflow', 'no write on compare', 'busy lock', 'scope reuse', 'freshness', 'search and status filters', 'keyboard focus', 'JSON source and errors', 'partial results and retry', 'responsive geometry'], pageErrors: errors }, null, 2));
    console.log('PASS reflect-lite: workflow, freshness, filters, JSON, partial results, keyboard, 5 viewport sizes');
    console.log(`Artifacts: ${OUT}`);
  } catch (error) {
    await page.screenshot({ path: path.join(OUT, 'failure.png') });
    console.error(await page.locator('#kus-reflect-lite').innerText());
    console.error('Browser errors:', errors);
    throw error;
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
