#!/usr/bin/env node
'use strict';

// 本番反映（lite）の画面と操作契約を、エンジンだけを合成エンジンに差し替えて検証する。
// 続けて、bundle('real') で tabs/deploy-standalone.ts をそのまま束ねた画面を、合成 kintone API につないで検証する
// （deploy-engine-scenarios.cjs。run-reflect-lite-dom.cjs の reflect-engine-scenarios.cjs と同じ作り）。
// 「反映元アプリから本番へ」は deploy-source-engine-scenarios.cjs が、同じ実エンジンの画面を合成 kintone API につないで検証する。
// 実アプリ・外部 API への通信や書き込みは行わない。結果と画面は .iter-shots/deploy-lite-dom/（Git 管理外）に保存する。
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '../..');
const TOOL = path.join(ROOT, 'tools/統合ツール');
const OUT = path.join(ROOT, '.iter-shots/deploy-lite-dom');

function printHelp() {
  console.log(`Usage: node tools/test-harness/run-deploy-lite-dom.cjs [options]

本番反映の画面を、合成エンジンで検証します（実アプリには通信しません）。

Options:
  --browser <name>  chrome または chromium（既定: chrome）
  --help            このヘルプを表示

環境変数 KUS_PLAYWRIGHT_EXECUTABLE でブラウザの実行ファイルを指定できます。

日本語のダウンロード名を検証するため、ロケールが C/POSIX の環境では LANG=C.UTF-8 LC_ALL=C.UTF-8 を付けて実行してください。
結果と画面: .iter-shots/deploy-lite-dom/`);
}

const argValue = (name, fallback) => (process.argv.includes(name) ? process.argv[process.argv.indexOf(name) + 1] : fallback);

// ---------------------------------------------------------------------------
// 合成エンジン（tabs/deploy-standalone.ts の 3 関数と同じ署名）
// ---------------------------------------------------------------------------
const mockEngine = `
  import { isCancelRequested, RunCancelledError } from ${JSON.stringify(path.join(TOOL, 'src/runControl.ts'))};
  function delay(ms) { return new Promise(function (resolve) { setTimeout(resolve, ms); }); }
  // mock.stepMode のとき、テストが advance() するまで止める（進捗の途中表示を 1 手ずつ確認するため）。
  async function step() {
    var mock = window.__deployMock;
    if (mock.stepMode) await new Promise(function (resolve) { mock.waiting = resolve; });
    else await delay(mock.delay || 0);
  }
  function section(key, label, status, counts, items) {
    return { sectionKey: key, label: label, status: status, items: items || [], counts: counts || { added: 0, changed: 0, removed: 0 } };
  }
  function appFor(appId) {
    var mock = window.__deployMock;
    if (mock.apps[appId]) return mock.apps[appId];
    if (mock.bulk && Number(appId) >= mock.bulk.from && Number(appId) < mock.bulk.from + mock.bulk.count) {
      return { name: '一括アプリ' + appId, state: 'changes', prod: '3', prev: '4', sections: [section('fieldSettings', 'フィールド設定', 'change', { added: 1, changed: 0, removed: 0 }, [{ kind: '追加', name: '備考（memo）', details: ['種類: 文字列（1行）'] }])] };
    }
    return null;
  }
  export function validateDeployTargets(targets, batchMode) {
    if (!targets.length) return '対象アプリを入力してください。';
    var seen = {};
    for (var i = 0; i < targets.length; i++) {
      var t = targets[i];
      if (!/^[1-9][0-9]*$/.test(t.appId)) return 'アプリID「' + t.appId + '」は数字で入力してください。';
      var key = t.guestId + '/' + t.appId;
      if (seen[key]) return 'アプリID ' + t.appId + ' が重複しています。';
      seen[key] = true;
    }
    if (batchMode === 'atomic') {
      if (targets.length > 300) return 'まとめて反映は最大 300 件です（現在 ' + targets.length + ' 件）。';
      var guests = {}; targets.forEach(function (t) { guests[t.guestId] = true; });
      if (Object.keys(guests).length > 1) return 'まとめて反映は、同じゲストスペースのアプリだけ選べます。';
    }
    return '';
  }
  export async function inspectDeployTargetsStandalone(opts) {
    var mock = window.__deployMock;
    mock.inspects.push(opts.targets.map(function (t) { return t.guestId + '/' + t.appId; }));
    var apps = [];
    var counts = { changes: 0, clean: 0, error: 0, processing: 0 };
    for (var i = 0; i < opts.targets.length; i++) {
      var t = opts.targets[i];
      if (mock.inspectStep) await new Promise(function (resolve) { mock.inspectWaiting = resolve; }); else await delay(mock.delay || 0);
      if (isCancelRequested()) throw new RunCancelledError();
      var def = appFor(t.appId);
      var base = { appId: t.appId, guestId: t.guestId, name: def ? def.name || t.name || '' : t.name || '', productionRevision: '', previewRevision: '', sections: [], removedFields: [], warnings: [], inspectedAt: new Date().toISOString() };
      var app;
      if (!def) app = Object.assign(base, { state: 'error', error: 'アプリの設定を取得できませんでした（GAIA_AP01: 指定したアプリが見つかりません）' });
      else if (def.state === 'error') app = Object.assign(base, { state: 'error', error: def.error || '取得に失敗しました。' });
      else if (def.state === 'processing') app = Object.assign(base, { state: 'processing', error: def.error || 'kintone がアプリの更新を処理中です。完了してから確認し直してください。', productionRevision: def.prod || '', previewRevision: def.prev || '' });
      else if (def.state === 'clean') app = Object.assign(base, { state: 'clean', productionRevision: def.prod, previewRevision: def.prev });
      else app = Object.assign(base, { state: 'changes', productionRevision: def.prod, previewRevision: def.prev, sections: def.sections || [], removedFields: def.removedFields || [], warnings: def.warnings || [], contentSame: !!def.contentSame, productionBundle: { appId: t.appId }, previewBundle: { appId: t.appId } });
      counts[app.state] += 1;
      apps.push(app);
      if (opts.onProgress) opts.onProgress(i + 1, opts.targets.length, app.name);
      if (mock.bulk && i % 100 === 99) await delay(0);
    }
    return { apps: apps, inspectedAt: new Date().toISOString(), counts: counts };
  }
  export async function runDeployStandalone(opts) {
    var mock = window.__deployMock;
    mock.runs.push({ mode: opts.mode, batchMode: opts.batchMode, stopOnError: opts.stopOnError, targets: opts.targets.map(function (t) { return t.guestId + '/' + t.appId; }) });
    var run = mock.run || {};
    var startedAt = new Date().toISOString();
    var apps = opts.targets.map(function (t) { return { appId: t.appId, guestId: t.guestId, name: t.name, status: 'waiting', productionRevisionBefore: t.productionRevision, previewRevision: t.previewRevision }; });
    var done = function (extra) { return Object.assign({ mode: opts.mode, batchMode: opts.batchMode, startedAt: startedAt, finishedAt: new Date().toISOString(), apps: apps, logs: ['[mock] 合成エンジンのログです。実アプリには通信していません。'] }, extra); };
    function notify(app, status, message) { app.status = status; if (message !== undefined) app.message = message; opts.onUpdate && opts.onUpdate({ appId: app.appId, guestId: app.guestId, status: status, message: message }); }
    await delay(mock.delay || 0);
    if (run.throws) throw new Error(run.throws);
    if (run.blocked) {
      apps.forEach(function (app) { app.status = 'pending'; app.message = '反映前の確認で止めたため実行していません。'; });
      return done({ blocked: run.blocked });
    }
    opts.setStatus && opts.setStatus('反映前の設定をバックアップ中…');
    var backup = run.noBackup ? undefined : { fileName: (opts.mode === 'revert' ? '変更の中止前バックアップ_' : '本番反映前バックアップ_') + apps.length + 'アプリ_20260101_000000.json', appCount: apps.length, generatedAt: new Date().toISOString(), environment: opts.mode === 'revert' ? 'preview' : 'production', unavailableFiles: run.unavailableFiles || [] };
    var plan = run.plan || {};
    var stopped = false, cancelled = false;
    if (opts.batchMode === 'atomic') {
      for (var j = 0; j < apps.length; j++) notify(apps[j], 'deploying');
      await step();
      var failed = apps.filter(function (app) { return plan[app.appId] === 'fail'; });
      apps.forEach(function (app) {
        if (failed.length) {
          if (plan[app.appId] === 'fail') notify(app, 'failed', '権限がありません（GAIA_NO01）');
          else notify(app, 'cancelled', 'ほかのアプリの失敗のため、kintone が取り消しました。');
        } else { app.productionRevisionAfter = String(Number(app.previewRevision || 0) + 1); app.verified = true; notify(app, 'success'); }
      });
      return done({ backup: backup });
    }
    for (var i = 0; i < apps.length; i++) {
      var app = apps[i];
      if (stopped) { notify(app, 'pending', cancelled ? '中止したため実行していません。' : '前のアプリの失敗のため実行していません。'); continue; }
      notify(app, 'checking');
      await step();
      if (isCancelRequested()) { cancelled = true; stopped = true; notify(app, 'pending', '中止したため実行していません。'); continue; }
      notify(app, 'deploying');
      await step();
      var outcome = plan[app.appId] || 'success';
      if (outcome === 'fail') { notify(app, 'failed', '権限がありません（GAIA_NO01）\\n[API] POST /k/v1/preview/app/deploy.json'); if (opts.stopOnError) stopped = true; }
      else if (outcome === 'conflict') { notify(app, 'conflict', '確認後にプレビューが更新されたため、依頼していません。'); if (opts.stopOnError) stopped = true; }
      else if (outcome === 'unknown') { notify(app, 'unknown', '完了を確認できませんでした。kintone 側で処理が続いている可能性があります。'); if (opts.stopOnError) stopped = true; }
      else {
        app.productionRevisionAfter = (run.unverified || []).indexOf(app.appId) >= 0 ? app.productionRevisionBefore : String(Number(app.previewRevision || 0) + 1);
        app.verified = (run.unverified || []).indexOf(app.appId) < 0;
        notify(app, 'success');
      }
      if (mock.bulk && i % 50 === 49) await delay(0);
    }
    return done({ backup: backup, ...(cancelled ? { cancelled: true } : {}) });
  }
`;

async function bundle(engine = 'mock') {
  const esbuild = require(path.join(TOOL, 'node_modules/esbuild'));
  const result = await esbuild.build({
    absWorkingDir: TOOL, entryPoints: ['src/entries/deploy-lite-ui.ts'], bundle: true, write: false,
    format: 'iife', globalName: 'DeployHarness', platform: 'browser', target: ['chrome110'], logLevel: 'silent',
    plugins: engine === 'real' ? [] : [{ name: 'deploy-fixtures', setup(build) {
      build.onResolve({ filter: /deploy-standalone\.js$/ }, () => ({ path: 'deploy-engine', namespace: 'fixture' }));
      build.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({ contents: mockEngine, loader: 'js', resolveDir: TOOL }));
    } }]
  });
  return result.outputFiles[0].text;
}

const fixture = `
window.section = function (key, label, status, counts, items) { return { sectionKey: key, label: label, status: status, items: items || [], counts: counts || { added: 0, changed: 0, removed: 0 } }; };
window.__deployMock = { inspects: [], runs: [], delay: 0, run: {}, opened: [], catalog: [],
  apps: {
    '101': { name: '営業管理', state: 'changes', prod: '12', prev: '15',
      sections: [
        section('fieldSettings', 'フィールド設定', 'change', { added: 1, changed: 1, removed: 1 }, [
          { kind: '削除', name: '旧項目（old_code）', details: ['フィールドを削除します'] },
          { kind: '変更', name: '顧客名（customer）', details: ['表示名: 取引先 → 顧客名', '必須: いいえ → はい'] },
          { kind: '追加', name: '備考<b>（memo）', details: ['種類: 文字列（1行）'] }]),
        section('viewSettings', 'ビュー設定', 'change', { added: 0, changed: 1, removed: 0 }, [{ kind: '変更', name: '一覧（全件）', details: ['並び順: 更新日時'] }]),
        section('layoutSettings', 'レイアウト設定', 'same')],
      removedFields: [{ code: 'old_code', label: '旧項目', type: 'SINGLE_LINE_TEXT', possibleRename: 'new_code' }, { code: 'row_note', label: '明細メモ', type: 'SINGLE_LINE_TEXT', table: 'items' }],
      warnings: ['プレビューに以前からの未公開の変更があります。'] },
    '102': { name: '顧客管理', state: 'changes', prod: '7', prev: '9',
      sections: [section('layoutSettings', 'レイアウト設定', 'change', { added: 0, changed: 2, removed: 0 }, [{ kind: '変更', name: '行 2', details: ['フィールドの並び順を変更'] }])] },
    '103': { name: '在庫', state: 'clean', prod: '8', prev: '8' },
    '104': { name: '', state: 'error', error: 'プレビューの設定を取得できませんでした（GAIA_NO01: 権限がありません）' },
    '105': { name: '受注', state: 'processing', prod: '4', prev: '5' },
    '106': { name: '請求', state: 'changes', prod: '20', prev: '21', contentSame: true,
      sections: [section('fieldSettings', 'フィールド設定', 'same')] },
    '107': { name: '発注', state: 'changes', prod: '30', prev: '32',
      sections: [section('processSettings', 'プロセス管理', 'change', { added: 1, changed: 0, removed: 0 }, [{ kind: '追加', name: 'ステータス: 承認待ち', details: [] }])] }
  } };
window.kintone = { app: { getId: () => 202 }, api: Object.assign(async (url, method, params) => {
  const mock = window.__deployMock;
  if (/\\/apps\\.json$/.test(url)) {
    const offset = Number(params.offset || 0), limit = Number(params.limit || 100);
    return { apps: mock.catalog.slice(offset, offset + limit) };
  }
  return {};
}, { url: p => p }) };
window.open = function (url) { window.__deployMock.opened.push(String(url)); return null; };
`;

async function main() {
  if (process.argv.includes('--help')) { printHelp(); return; }
  const { chromium } = require('playwright');
  fs.mkdirSync(OUT, { recursive: true });
  const script = await bundle('mock');
  const browserName = argValue('--browser', 'chrome');
  const executablePath = process.env.KUS_PLAYWRIGHT_EXECUTABLE;
  const browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : browserName === 'chromium' ? {} : { channel: browserName }) });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.context().grantPermissions([], {}).catch(() => {});
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/*', route => route.abort());
  const checks = [];
  const ok = name => { checks.push(name); };

  // 既定は「反映元アプリから本番へ」。従来の流れ（プレビューの変更を公開）を検証する reset は、操作を切り替えてから始める。
  const flowRadio = name => page.getByRole('radio', { name, exact: true });
  async function reset(extra = {}, flow = 'publish') {
    await page.setContent('<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><body style="background:#e8edf3"></body></html>');
    await page.evaluate(fixture);
    if (Object.keys(extra).length) await page.evaluate(extra => Object.assign(window.__deployMock, extra), extra);
    await page.addScriptTag({ content: script });
    await page.evaluate(() => DeployHarness.mountDeployLitePanel());
    if (flow === 'publish') await flowRadio('プレビューの変更を公開').check();
  }
  const ROOT_SEL = '#kus-deploy-lite';
  const button = name => page.getByRole('button', { name, exact: true });
  const tab = name => page.getByRole('tab', { name: new RegExp(name) });
  const idle = () => page.waitForFunction(() => document.querySelector('#kus-deploy-lite').getAttribute('aria-busy') !== 'true');
  const dockText = () => page.locator('.kus-dp-dock-copy').innerText();
  const statusText = () => page.locator('.kus-lp__status-text').innerText();
  const mockGet = fn => page.evaluate(fn);
  const runButton = () => page.getByRole('button', { name: /^確認した .* アプリ(を本番へ反映|の変更を中止)$/ });
  const ackBox = () => page.getByRole('checkbox', { name: '上記の内容を確認しました', exact: true });
  const confirmBox = () => page.locator('input[aria-label^="確認用の対象アプリ"]');
  const rowsOf = () => page.locator('.kus-lp__apptable tbody tr');
  const appInput = i => rowsOf().nth(i).locator('input[aria-label="アプリID"]');
  const guestInput = i => rowsOf().nth(i).locator('input[aria-label="ゲストID"]');
  async function setTargets(ids) {
    await page.evaluate(() => { document.querySelectorAll('.kus-lp__apptable tbody tr button').forEach(b => { if (b.textContent === '×') b.click(); }); });
    const first = appInput(0);
    await first.fill(ids.join(','));
    await first.press('Tab');
  }
  async function inspect() { await button('未公開の変更を確認する').click(); await idle(); }
  const reviewRow = id => page.locator(`tr.kus-dp-row[data-deploy-app="${id}"]`);
  const resultItem = id => page.locator(`.kus-dp-result-item[data-deploy-app="${id}"]`);
  const stubClipboard = () => page.evaluate(() => {
    window.__copied = [];
    document.execCommand = () => false;
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async text => { window.__copied.push(text); } } });
  });
  const downloadOf = async name => {
    const promise = page.waitForEvent('download');
    await button(name).click();
    const file = await promise;
    return { name: file.suggestedFilename(), text: await fs.promises.readFile(await file.path(), 'utf8') };
  };
  async function toConfirm() {
    await button('最終確認に進む').click();
    assert.equal(await tab('最終確認').getAttribute('aria-selected'), 'true');
  }
  async function confirmAndRun(value) {
    await ackBox().check();
    await confirmBox().fill(String(value));
    assert.equal(await runButton().isEnabled(), true, '確認後は実行できる');
    await runButton().click();
    await idle();
  }
  async function overflowOf(where) {
    const geometry = await page.evaluate(() => {
      const canvas = document.querySelector('.kus-dp-canvas'); const root = document.querySelector('#kus-deploy-lite').getBoundingClientRect();
      const dock = document.querySelector('.kus-dp-action-dock').getBoundingClientRect();
      return { overflow: canvas.scrollWidth - canvas.clientWidth, left: root.left, right: root.right, bottom: root.bottom, vw: window.innerWidth, vh: window.innerHeight,
        canvasBottom: canvas.getBoundingClientRect().bottom, dockTop: dock.top, canvasHeight: canvas.clientHeight, docOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth };
    });
    assert.ok(geometry.overflow <= 1, `${where}: 本文が横にはみ出す ${JSON.stringify(geometry)}`);
    assert.ok(geometry.left >= -1 && geometry.right <= geometry.vw + 1 && geometry.bottom <= geometry.vh + 1, `${where}: パネルが画面外 ${JSON.stringify(geometry)}`);
    assert.ok(geometry.canvasBottom <= geometry.dockTop + 1 && geometry.canvasHeight > 60, `${where}: 固定フッターが本文を覆う ${JSON.stringify(geometry)}`);
    assert.ok(geometry.docOverflow <= 1, `${where}: ページが横にはみ出す ${JSON.stringify(geometry)}`);
  }
  async function assertNoLegacyTerms(where) {
    const found = await page.evaluate(() => {
      // 操作の切り替え（反映元アプリから本番へ）は新しい流れの名前なので対象外にする
      const root = document.querySelector('#kus-deploy-lite').cloneNode(true);
      root.querySelectorAll('.kus-ds-flowbar').forEach(node => node.remove());
      const texts = [root.textContent];
      root.querySelectorAll('[aria-label],[placeholder],[title]').forEach(el => texts.push(el.getAttribute('aria-label') || '', el.getAttribute('placeholder') || '', el.getAttribute('title') || ''));
      // 取り消し方の案内は、プレビュー反映の入力名「反映元（設定JSON）」をそのまま示す
      return texts.join('\n').replaceAll('プレビュー反映の反映元（設定JSON）', '').match(/比較[元先]|反映先|反映元|スキップ|キャンセル/g) || [];
    });
    assert.deepEqual(found, [], `${where}に使わない用語が残っている`);
  }

  try {
    // =======================================================================
    // 1. 初期表示・進めない理由・4 段階の移動
    // =======================================================================
    await reset();
    assert.equal(await page.locator(ROOT_SEL).count(), 1);
    assert.equal(await page.locator('.kus-lp__title').innerText(), '本番反映');
    assert.equal(await page.locator('.kus-lp__subtitle').innerText(), 'プレビューの未公開の変更を確認してから、本番へ反映します。');
    assert.equal(await page.locator('.kus-lp__badge').allInnerTexts().then(list => list.join('|')), '本番の設定を変更', '影響範囲のバッジは 1 つ');
    assert.ok(await page.locator('.kus-lp__badge--production').isVisible());
    assert.match(await page.locator('.kus-lp__hint').innerText(), /^本番のアプリ設定を変更します。/, 'ヒントは本番を変更することから始める');
    const tabTexts = await page.getByRole('tab').allInnerTexts();
    assert.equal(tabTexts.length, 4, '4 段階のタブ');
    ['対象を選ぶ', '変更を確認', '最終確認', '結果'].forEach((label, index) => assert.ok(tabTexts[index].includes(label), `タブ ${index + 1}: ${label}`));
    assert.equal(await button('未公開の変更を確認する').isDisabled(), true);
    assert.match(await dockText(), /次に進むには：対象アプリを入力してください。/, '進めない理由を表示する');
    assert.equal(await button('最終確認に進む').isHidden(), true, '設定の段階では最終確認の操作を出さない');
    assert.equal(await tab('変更を確認').isDisabled(), true);
    assert.equal(await tab('最終確認').isDisabled(), true);
    await tab('結果').click();
    assert.match(await page.locator('#kus-dp-stage-result').innerText(), /まだ実行していません/);
    await tab('対象を選ぶ').click();
    await assertNoLegacyTerms('第1画面');
    // 操作の選択
    assert.equal(await page.getByRole('radio', { name: '本番へ反映（アプリを更新）', exact: true }).isChecked(), true, '既定は本番へ反映');
    assert.match(await page.locator('.kus-dp-choice', { hasText: '変更を中止' }).innerText(), /プレビューの未公開の変更を破棄します/);
    assert.match(await page.locator('.kus-dp-detail-summary').innerText(), /^詳細設定: 1アプリずつ反映 \/ 失敗したら残りを実行しない$/, '詳細設定の現在値を 1 行で示す');
    ok('initial state and blockers');

    // 対象の入力: 非数字、URL 貼り付け、カンマ区切り、現在のアプリ
    await appInput(0).fill('abc');
    assert.match(await dockText(), /次に進むには：アプリID「abc」は数字で入力してください。/, 'エンジンの検証結果を進めない理由に使う');
    await appInput(0).fill('https://example.cybozu.com/k/guest/7/101/?view=20');
    await appInput(0).press('Tab');
    assert.equal(await appInput(0).inputValue(), '101', 'URL からアプリIDを読み取る');
    assert.equal(await guestInput(0).inputValue(), '7', 'URL からゲストスペースIDを読み取る');
    await guestInput(0).fill('');
    await setTargets(['101', '102', '103']);
    assert.equal(await rowsOf().count(), 3, 'カンマ区切りで行に分割する');
    assert.match(await page.locator('.kus-dp-count').innerText(), /^3 アプリ（最大 1000）$/);
    await button('現在のアプリ').click();
    assert.equal(await appInput(3).inputValue(), '202', '現在のアプリを追加する');
    await rowsOf().nth(3).getByRole('button', { name: '×' }).click();
    assert.equal(await button('未公開の変更を確認する').isEnabled(), true);
    assert.match(await dockText(), /3 アプリの本番とプレビューを比べます。書き込みは行いません。/);
    ok('target input');

    // 環境内の全アプリから一括追加
    await reset({ catalog: Array.from({ length: 7 }, (_, i) => ({ appId: String(101 + i), name: 'カタログ' + (101 + i), code: '' })) });
    await page.getByText('アプリを検索（名前・コード・ID）').click();
    await button('環境内の全アプリ').click();
    await page.waitForFunction(() => [...document.querySelectorAll('button')].some(b => /候補 7 件をすべて対象アプリに追加/.test(b.textContent)));
    await page.getByRole('button', { name: '候補 7 件をすべて対象アプリに追加' }).click();
    assert.equal(await rowsOf().count(), 7, '全アプリを対象アプリの表へ追加する');
    assert.match(await page.locator('.kus-dp-count').innerText(), /^7 アプリ/);
    ok('all apps applyAll');

    // 詳細設定のポップアップ
    await button('詳細設定…').click();
    assert.equal(await page.locator('#kus-dp-detail').evaluate(el => el.matches(':modal')), true);
    assert.deepEqual(await page.locator('#kus-dp-detail .kus-lp__card-title').allInnerTexts(), ['反映の方法', '失敗したとき']);
    await page.getByRole('radio', { name: 'まとめて反映', exact: true }).check();
    assert.equal(await page.getByRole('radio', { name: '残りも続ける', exact: true }).isDisabled(), true, 'まとめて反映では失敗時の動作を選べない');
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#kus-dp-detail').evaluate(el => el.open), false);
    assert.match(await page.locator('.kus-dp-detail-summary').innerText(), /^詳細設定: まとめて反映（すべて成功したときだけ。最大 300 件・同じゲストスペース）$/);
    await setTargets(['101', '102']);
    await guestInput(1).fill('3');
    assert.match(await dockText(), /次に進むには：まとめて反映は、同じゲストスペースのアプリだけ選べます。/, 'まとめて反映の条件を進めない理由に使う');
    await guestInput(1).fill('');
    await button('詳細設定…').click();
    await page.getByRole('radio', { name: '1アプリずつ反映（既定）', exact: true }).check();
    await page.getByRole('radio', { name: '残りも続ける', exact: true }).check();
    await page.getByRole('button', { name: '詳細設定を閉じる', exact: true }).click();
    assert.match(await page.locator('.kus-dp-detail-summary').innerText(), /失敗しても残りを続ける/);
    assert.ok(await page.locator('.kus-dp-detail-summary--warn').count(), '既定から外れた設定は目立たせる');
    await button('詳細設定…').click();
    await page.getByRole('radio', { name: '残りを実行しない（既定）', exact: true }).check();
    await page.getByRole('button', { name: '詳細設定を閉じる', exact: true }).click();
    ok('detail dialog');

    // =======================================================================
    // 2. 差分確認（書き込みなし）の表示
    // =======================================================================
    await reset({ inspectStep: true });
    await setTargets(['101', '102', '103', '104', '105', '106']);
    await button('未公開の変更を確認する').click();
    await page.waitForFunction(() => window.__deployMock.inspectWaiting);
    assert.match(await statusText(), /未公開の変更を確認中/);
    for (let i = 0; i < 6; i += 1) {
      await page.waitForFunction(() => window.__deployMock.inspectWaiting);
      if (i === 2) assert.match(await statusText(), /（2\/6 アプリ/, '進捗を N/M アプリで示す');
      await page.evaluate(() => { const w = window.__deployMock.inspectWaiting; window.__deployMock.inspectWaiting = null; w(); });
      await page.waitForTimeout(20);
    }
    await idle();
    await page.evaluate(() => { window.__deployMock.inspectStep = false; });
    assert.equal(await tab('変更を確認').getAttribute('aria-selected'), 'true', '確認後は段階 2 へ進む');
    assert.equal(await page.evaluate(() => window.__deployMock.runs.length), 0, '差分確認では書き込みを依頼しない');
    const pills = (await page.locator('.kus-dp-pills .kus-dp-pill').allInnerTexts()).join('|');
    assert.equal(pills, '変更あり 3|未公開の変更なし 1|取得失敗 1|反映処理中 1', '状態ごとの件数');
    assert.match(await page.locator('.kus-dp-next').first().innerText(), /3 アプリに未公開の変更があります（未公開の変更なし 1、取得失敗 1、反映処理中 1）/);
    // 表の並び: 取得失敗 → 反映処理中 → 変更あり → 未公開の変更なし
    assert.deepEqual(await page.locator('tr.kus-dp-row').evaluateAll(rows => rows.map(row => row.dataset.deployApp)), ['104', '105', '101', '102', '106', '103'], '問題のあるアプリを先に出す');
    const checkOf = id => reviewRow(id).locator('input[type="checkbox"]');
    assert.equal(await checkOf('101').isChecked(), true, '変更ありは既定で選択');
    assert.equal(await checkOf('103').isDisabled(), true, '未公開の変更なしは選択できない');
    assert.equal(await checkOf('103').isChecked(), false);
    assert.equal(await checkOf('104').isChecked(), true, '取得失敗は選択したまま');
    assert.equal(await checkOf('105').isChecked(), true, '反映処理中は選択したまま');
    assert.match(await reviewRow('104').innerText(), /権限がありません[\s\S]*取得失敗/);
    assert.match(await reviewRow('101').innerText(), /フィールド設定、ビュー設定/, '変更のある項目名');
    assert.match(await reviewRow('101').innerText(), /1 件 \/ フィールド 2 件（値も削除）/, '削除の件数（フィールドは別に示す）');
    assert.match(await reviewRow('101').innerText(), /本番 12 → プレビュー 15/, 'revision');
    assert.match(await reviewRow('106').innerText(), /設定の内容は同じです（revision だけが異なります）/);
    assert.equal(await button('最終確認に進む').isDisabled(), true, '取得失敗・処理中を選んだままでは進めない');
    assert.match(await page.locator('.kus-dp-issues').innerText(), /取得失敗のアプリが 1 件選択されています[\s\S]*反映処理中のアプリが 1 件選択されています/);
    assert.match(await dockText(), /次に進むには：取得失敗のアプリが 1 件選択されています/);
    assert.equal(await tab('最終確認').isDisabled(), true);
    await page.screenshot({ path: path.join(OUT, 'review-1440.png') });
    ok('review table');

    // 詳細（開いたときに描画）
    assert.equal(await page.locator('[data-deploy-section]').count(), 0, '詳細は開くまで描画しない');
    await reviewRow('101').getByRole('button', { name: '詳細を表示' }).click();
    const detail = page.locator('tr.kus-dp-detail-tr').filter({ has: page.locator('[data-deploy-section]') }).first();
    assert.match(await detail.innerText(), /削除されるフィールド（2 件）/);
    assert.match(await detail.innerText(), /本番へ反映すると、このフィールドのレコードの値も削除され、元に戻せません。/);
    assert.match(await detail.innerText(), /旧項目（old_code）[\s\S]*フィールドコードを変えただけなら値は残る可能性があります（プレビューの『new_code』）/, 'possibleRename を添える');
    assert.match(await detail.innerText(), /明細メモ（row_note）（テーブル items 内）/);
    assert.match(await detail.innerText(), /プレビューに以前からの未公開の変更があります。/, 'warnings を表示する');
    assert.match(await detail.locator('[data-deploy-section="fieldSettings"]').innerText(), /フィールド設定（追加 1・変更 1・削除 1）[\s\S]*変更の要約[\s\S]*削除[\s\S]*旧項目（old_code）[\s\S]*変更[\s\S]*顧客名（customer）/);
    assert.equal(await detail.locator('b').count(), 0, '項目名は textContent で描画する（HTML を解釈しない）');
    assert.match(await detail.innerText(), /変更のない項目: レイアウト設定/);
    assert.ok(await detail.locator('.kus-dp-danger').evaluate(el => getComputedStyle(el).color !== getComputedStyle(document.body).color), '削除フィールドは警告色');
    await reviewRow('101').getByRole('button', { name: '詳細を閉じる' }).click();
    ok('review detail');

    // 取得失敗・処理中だけ確認し直す / 対象から外す
    await reviewRow('104').getByRole('button', { name: '対象から外す' }).click();
    assert.equal(await reviewRow('104').count(), 0, '対象から外した行は消える');
    assert.equal(await rowsOf().count(), 5, '対象アプリの表からも外れる');
    assert.equal(await tab('変更を確認').getAttribute('aria-selected'), 'true', '外しても差分確認は有効のまま');
    await page.evaluate(() => { window.__deployMock.apps['105'].state = 'changes'; window.__deployMock.apps['105'].sections = [section('fieldSettings', 'フィールド設定', 'change', { added: 1, changed: 0, removed: 0 }, [{ kind: '追加', name: '受注番号', details: [] }])]; });
    await button('取得失敗・処理中だけ確認し直す').click(); await idle();
    assert.deepEqual(await page.evaluate(() => window.__deployMock.inspects.at(-1)), ['/105'], '取得失敗・処理中だけを確認し直す');
    assert.equal(await reviewRow('105').getAttribute('data-deploy-state'), 'changes');
    assert.equal(await checkOf('105').isChecked(), true);
    assert.equal(await checkOf('101').isChecked(), true, '確認し直しても他の選択は保つ');
    assert.equal(await button('最終確認に進む').isEnabled(), true);
    assert.equal(await button('取得失敗・処理中だけ確認し直す').isHidden(), true);
    // 取得失敗・処理中が残っていても、選択を外せば進める
    await reset();
    await setTargets(['101', '104']);
    await inspect();
    assert.equal(await button('最終確認に進む').isDisabled(), true);
    await checkOf('104').uncheck();
    assert.equal(await button('最終確認に進む').isEnabled(), true, '選択を外すと進める');
    assert.match(await dockText(), /1 アプリの内容を確認し、最終確認へ進んでください。/);
    await checkOf('101').uncheck();
    assert.match(await dockText(), /次に進むには：反映するアプリ（変更あり）を選んでください。/);
    await button('変更ありをすべて選択').click();
    assert.equal(await checkOf('101').isChecked(), true);
    ok('recheck problems and drop');

    // 計画の Markdown
    await stubClipboard();
    const planMd = await downloadOf('計画をMarkdownで保存');
    assert.match(planMd.name, /^本番反映計画_営業管理\(app101\)_\d{8}_\d{6}\.md$/, '計画のファイル名');
    assert.match(planMd.text, /^# 本番反映の計画/);
    assert.match(planMd.text, /- 方向: プレビュー → 本番/);
    assert.match(planMd.text, /- 対象: 1 アプリ（確認した 2 アプリのうち）/);
    assert.match(planMd.text, /\| 営業管理（#101） \| 変更あり \| 対象 \| フィールド設定、ビュー設定 \| 1 \| 12 → 15 \|/);
    assert.match(planMd.text, /## 削除されるフィールド/);
    assert.match(planMd.text, /旧項目（old\\_code）.*new\\_code/);
    assert.match(planMd.text, /- \*\*削除\*\* 旧項目（old\\_code）/);
    assert.match(planMd.text, /備考\\<b\\>/, 'HTML 風の文字は退避する');
    assert.doesNotMatch(planMd.text, /productionBundle|previewBundle/, '取得した設定本体は含めない');
    await button('計画のMarkdownをコピー').click();
    await page.waitForFunction(() => window.__copied.length === 1);
    assert.equal(await page.evaluate(() => window.__copied[0].startsWith('# 本番反映の計画')), true);
    ok('plan markdown');

    // =======================================================================
    // 3. 最終確認
    // =======================================================================
    await reset();
    await setTargets(['101', '102', '106']);
    await inspect();
    await page.screenshot({ path: path.join(OUT, 'review-mixed.png') });
    await toConfirm();
    const facts = key => page.locator(`[data-confirm="${key}"]`);
    assert.match(await facts('direction').innerText(), /プレビュー → 本番/);
    assert.match(await facts('targets').innerText(), /対象アプリ（3 アプリ）[\s\S]*営業管理（#101）[\s\S]*顧客管理（#102）[\s\S]*請求（#106）/);
    assert.match(await facts('method').innerText(), /1アプリずつ反映（失敗したら残りを実行しない）/);
    assert.match(await facts('changes').innerText(), /フィールド設定 1 件（合計 1 件）/, '削除される設定の件数（項目別）');
    assert.match(await facts('removed-fields').innerText(), /削除されるフィールド（2 件）[\s\S]*レコードの値も削除され、元に戻せません[\s\S]*営業管理（#101）: 旧項目（old_code）/);
    assert.match(await facts('backup').innerText(), /反映前の本番設定（3 アプリ分。変更のあるJS\/CSSはファイル本体も含む）をJSONで保存してから反映します。/);
    assert.match(await facts('undo').innerText(), /本番への反映は取り消せません。戻すときは、結果画面の「バックアップから戻す」で、反映前のバックアップとの差分を確認してから、本番へ反映します。削除したフィールドの値は戻りません。/);
    assert.equal(await runButton().innerText(), '確認した 3 アプリを本番へ反映');
    assert.equal(await runButton().isDisabled(), true, '確認前は実行できない');
    assert.equal(await confirmBox().getAttribute('aria-label'), '確認用の対象アプリ数');
    await ackBox().check();
    assert.equal(await runButton().isDisabled(), true, 'チェックだけでは実行できない');
    await confirmBox().fill('2');
    assert.equal(await runButton().isDisabled(), true, '件数が違うと実行できない');
    const runsBefore = () => page.evaluate(() => window.__deployMock.runs.length);
    await confirmBox().fill('3');
    await confirmBox().press('Enter');
    assert.equal(await runsBefore(), 0, '確認入力の Enter では実行しない');
    await page.screenshot({ path: path.join(OUT, 'confirm-1440.png') });
    await assertNoLegacyTerms('最終確認');
    // 前の段階へ戻ると確認は解除される
    await button('変更の確認に戻る').click();
    await toConfirm();
    assert.equal(await ackBox().isChecked(), false, '前の段階へ戻ったら確認を解除する');
    assert.equal(await confirmBox().inputValue(), '');
    assert.equal(await runButton().isDisabled(), true);
    // 選択を変えると確認は解除される
    await ackBox().check(); await confirmBox().fill('3');
    assert.equal(await runButton().isEnabled(), true);
    await tab('変更を確認').click();
    await reviewRow('102').locator('input[type="checkbox"]').uncheck();
    await toConfirm();
    assert.match(await facts('targets').innerText(), /対象アプリ（2 アプリ）/);
    assert.equal(await ackBox().isChecked(), false, '選択を変えたら確認を解除する');
    // 操作を変えると差分確認からやり直し
    await tab('対象を選ぶ').click();
    await page.getByRole('radio', { name: '変更を中止（プレビューを本番に戻す）', exact: true }).check();
    assert.equal(await tab('変更を確認').isDisabled(), true, '操作を変えたら差分確認からやり直し');
    assert.equal(await button('確認済みの結果へ進む').count(), 0);
    assert.equal(await button('未公開の変更を確認する').isEnabled(), true);
    await page.getByRole('radio', { name: '本番へ反映（アプリを更新）', exact: true }).check();
    assert.equal(await button('確認済みの結果へ進む').isEnabled(), true, '条件を戻せば確認済みの結果を使える');
    await button('詳細設定…').click();
    await page.getByRole('radio', { name: '残りも続ける', exact: true }).check();
    await page.getByRole('button', { name: '詳細設定を閉じる', exact: true }).click();
    assert.equal(await button('確認済みの結果へ進む').count(), 0, '詳細設定を変えたら差分確認からやり直し');
    ok('confirm stage');

    // 1 件のときは ID を入力する
    await reset();
    await setTargets(['101']);
    await inspect(); await toConfirm();
    assert.equal(await confirmBox().getAttribute('aria-label'), '確認用の対象アプリID');
    await ackBox().check(); await confirmBox().fill('3');
    assert.equal(await runButton().isDisabled(), true);
    await confirmBox().fill('101');
    assert.equal(await runButton().isEnabled(), true);
    ok('confirm app id');

    // 変更を中止（revert）の表示
    await reset();
    await page.getByRole('radio', { name: '変更を中止（プレビューを本番に戻す）', exact: true }).check();
    await setTargets(['101', '102']);
    await inspect();
    await reviewRow('101').getByRole('button', { name: '詳細を表示' }).click();
    assert.match(await page.locator('tr.kus-dp-detail-tr').first().innerText(), /破棄される変更/, 'revert の見出しは「破棄される変更」');
    assert.doesNotMatch(await page.locator('tr.kus-dp-detail-tr').first().innerText(), /元に戻せません/, 'revert では値の削除警告を出さない');
    await toConfirm();
    assert.match(await facts('direction').innerText(), /プレビューの変更を破棄して本番の設定に戻す/);
    assert.match(await facts('backup').innerText(), /中止前のプレビューの設定（2 アプリ分）をJSONで保存してから、変更を中止します。/);
    assert.match(await facts('undo').innerText(), /破棄した変更は、結果画面の「バックアップから戻す」で、プレビューに戻せます。/);
    assert.equal(await facts('removed-fields').count(), 0, 'revert では削除されるフィールドの項目を出さない');
    assert.equal(await runButton().innerText(), '確認した 2 アプリの変更を中止');
    ok('revert mode');

    // =======================================================================
    // 4. 実行・結果
    // =======================================================================
    // 成功（進捗を 1 手ずつ確認し、実行中の再起動と二重実行を防ぐ）
    await reset({ stepMode: true });
    await setTargets(['101', '102']);
    await inspect(); await toConfirm();
    await ackBox().check(); await confirmBox().fill('2');
    await runButton().evaluate(node => {
      node.click(); node.click();
      window.__runningPanel = document.getElementById('kus-deploy-lite');
      DeployHarness.mountDeployLitePanel();
    });
    await page.waitForFunction(() => window.__deployMock.waiting);
    assert.equal(await page.evaluate(() => window.__deployMock.runs.length), 1, '二重実行を防ぐ');
    assert.equal(await page.evaluate(() => document.getElementById('kus-deploy-lite') === window.__runningPanel), true, '実行中の再起動で実行中のパネルを残す');
    assert.equal(await tab('結果').getAttribute('aria-selected'), 'true', '実行すると結果の段階へ移る');
    assert.equal(await page.locator('.kus-dp-result-item').count(), 2, '対象を一覧に並べる');
    assert.equal(await button('結果JSONを保存').count(), 0, '実行中は結果の保存を出さない');
    assert.match(await dockText(), /実行中です。/, '実行中は固定フッターにも示す');
    const advance = async () => { await page.waitForFunction(() => window.__deployMock.waiting); await page.evaluate(() => { const w = window.__deployMock.waiting; window.__deployMock.waiting = null; w(); }); await page.waitForTimeout(150); };
    await page.waitForTimeout(150);
    assert.match(await resultItem('102').innerText(), /待機中/);
    assert.match(await resultItem('101').innerText(), /確認中…/, '直前の確認中を表示する');
    await advance();
    assert.match(await resultItem('101').innerText(), /反映中…/);
    assert.match(await page.locator('.kus-dp-progress__summary').innerText(), /^0\/2 アプリが完了$/);
    await page.screenshot({ path: path.join(OUT, 'result-running.png') });
    await advance();
    assert.match(await resultItem('101').innerText(), /成功/);
    assert.match(await page.locator('.kus-dp-progress__summary').innerText(), /^1\/2 アプリが完了（成功 1）$/);
    await advance(); await advance();
    await idle();
    await page.evaluate(() => { window.__deployMock.stepMode = false; });
    assert.match(await statusText(), /^2 アプリを本番へ反映しました。$/, '成功の文言');
    assert.equal(await page.locator('.kus-lp__status').getAttribute('data-tone'), 'ok');
    assert.match(await page.locator('.kus-dp-result-head').innerText(), /2 アプリを本番へ反映しました。/);
    assert.match(await page.locator('[data-deploy-backup="saved"]').innerText(), /バックアップ: 本番反映前バックアップ_2アプリ_20260101_000000\.json（2 アプリ分・反映前の本番設定）/);
    assert.match(await page.locator('#kus-dp-stage-result').innerText(), /本番への反映は取り消せません。/);
    assert.match(await resultItem('101').innerText(), /本番のrevision: 12 → 16（プレビュー 15）[\s\S]*反映後の確認: 本番とプレビューが一致/);
    assert.equal(await button('失敗・未実行だけ選び直す').count(), 0, '全件成功なら選び直しを出さない');
    assert.equal(await button('アプリの設定画面を開く').count() === 0 || await button('アプリの設定画面を開く').isHidden(), true, '複数件では設定画面を開く操作を出さない');
    assert.equal(await page.evaluate(() => window.__deployMock.runs[0].stopOnError), true);
    assert.equal(await page.evaluate(() => window.__deployMock.runs[0].batchMode), 'sequential');
    assert.match(await page.locator('.kus-lp__result').innerText(), /\[mock\] 合成エンジンのログ/, '実行ログは下の領域に残す');
    // 結果の保存
    await stubClipboard();
    const resultJson = await downloadOf('結果JSONを保存');
    assert.match(resultJson.name, /^本番反映結果_\d{8}_\d{6}\.json$/);
    const parsed = JSON.parse(resultJson.text);
    assert.equal(parsed.kind, 'kintone-deploy-result');
    assert.deepEqual(parsed.summary.success, 2);
    assert.equal(parsed.apps.length, 2);
    assert.equal(parsed.backup.appCount, 2);
    assert.doesNotMatch(resultJson.text, /productionBundle|previewBundle/);
    const recordMd = await downloadOf('記録をMarkdownで保存');
    assert.match(recordMd.name, /^本番反映記録_\d{8}_\d{6}\.md$/);
    assert.match(recordMd.text, /^# 本番反映の記録/);
    assert.match(recordMd.text, /\| 営業管理（#101） \| 成功 \| － \| 12 → 16 \| 15 \| 一致 \|/);
    assert.match(recordMd.text, /- バックアップ: `本番反映前バックアップ_2アプリ_20260101_000000\.json`/);
    assert.match(recordMd.text, /## 削除を依頼したフィールド/);
    await button('記録をコピー').click();
    await page.waitForFunction(() => window.__copied.length === 1);
    assert.equal(await page.evaluate(() => window.__copied[0].startsWith('# 本番反映の記録')), true);
    // 実行後は差分確認を引き継がない
    assert.equal(await tab('変更を確認').isDisabled(), true, '実行後は古い差分確認を再使用しない');
    await page.screenshot({ path: path.join(OUT, 'result-success.png') });
    ok('run success, exports, double run');

    // 部分失敗（残りを実行しない）→ 失敗・未実行だけ選び直す
    await reset({ run: { plan: { '102': 'fail' } } });
    await setTargets(['101', '102', '106', '107']);
    await inspect(); await toConfirm(); await confirmAndRun(4);
    assert.match(await statusText(), /^4 アプリ中 1 アプリを反映しました。失敗 1 アプリ、未実行 2 アプリ（App 102: 権限がありません（GAIA_NO01））。「失敗・未実行だけ選び直す」から確認し直してください。$/, '成功数・失敗数・理由の順');
    assert.equal(await page.locator('.kus-lp__status').getAttribute('data-tone'), 'warn');
    assert.match(await resultItem('102').innerText(), /失敗[\s\S]*権限がありません（GAIA_NO01）/);
    assert.doesNotMatch(await resultItem('102').innerText(), /\[API\]/, '一覧には通信の内部情報を出さない');
    assert.match(await resultItem('106').innerText(), /未実行/);
    assert.deepEqual(await page.locator('.kus-dp-pills .kus-dp-pill').allInnerTexts(), ['成功 1', '失敗 1', '未実行 2']);
    await button('失敗・未実行だけ選び直す').click();
    assert.equal(await tab('対象を選ぶ').getAttribute('aria-selected'), 'true', '選び直しは段階 1 に戻す');
    assert.deepEqual(await rowsOf().evaluateAll(rows => rows.map(row => row.querySelector('input[aria-label="アプリID"]').value)), ['102', '106', '107']);
    assert.match(await statusText(), /失敗・未実行の 3 アプリを対象に選び直しました。未公開の変更を確認し直してください。/);
    assert.equal(await tab('変更を確認').isDisabled(), true, '確認し直しを促す');
    ok('partial failure retry');

    // 残りも続ける
    await reset({ run: { plan: { '102': 'fail' } } });
    await setTargets(['101', '102', '106']);
    await button('詳細設定…').click(); await page.getByRole('radio', { name: '残りも続ける', exact: true }).check(); await page.getByRole('button', { name: '詳細設定を閉じる', exact: true }).click();
    await inspect(); await toConfirm(); await confirmAndRun(3);
    assert.equal(await page.evaluate(() => window.__deployMock.runs[0].stopOnError), false, '詳細設定をエンジンへ渡す');
    assert.match(await resultItem('106').innerText(), /成功/, '失敗しても残りを続ける');
    assert.match(await statusText(), /^3 アプリ中 2 アプリを反映しました。失敗 1 アプリ（App 102: 権限がありません（GAIA_NO01））。/);
    ok('continue on error');

    // まとめて反映（1 件失敗 → すべて取り消し）
    await reset({ run: { plan: { '107': 'fail' } } });
    await setTargets(['101', '102', '107']);
    await button('詳細設定…').click(); await page.getByRole('radio', { name: 'まとめて反映', exact: true }).check(); await page.getByRole('button', { name: '詳細設定を閉じる', exact: true }).click();
    await inspect(); await toConfirm();
    assert.match(await facts('method').innerText(), /まとめて反映（すべて成功したときだけ本番へ反映）（1件でも失敗するとすべて取り消されます）/);
    await confirmAndRun(3);
    assert.equal(await page.evaluate(() => window.__deployMock.runs[0].batchMode), 'atomic');
    assert.match(await resultItem('101').innerText(), /取り消し（ほかのアプリの失敗）/);
    assert.match(await resultItem('107').innerText(), /失敗/);
    assert.match(await statusText(), /^3 アプリ中、反映できたアプリはありません。失敗 1 アプリ、取り消し 2 アプリ/);
    assert.equal(await page.locator('.kus-lp__status').getAttribute('data-tone'), 'err');
    ok('atomic failure');

    // 確認後に更新 / 完了を確認できない
    await reset({ run: { plan: { '101': 'conflict', '102': 'unknown' } }, });
    await setTargets(['101', '102']);
    await button('詳細設定…').click(); await page.getByRole('radio', { name: '残りも続ける', exact: true }).check(); await page.getByRole('button', { name: '詳細設定を閉じる', exact: true }).click();
    await inspect(); await toConfirm(); await confirmAndRun(2);
    assert.match(await resultItem('101').innerText(), /確認後に更新/);
    assert.match(await resultItem('102').innerText(), /完了を確認できない/);
    assert.match(await statusText(), /確認後に更新 1 アプリ、完了を確認できない 1 アプリ/);
    assert.match(await statusText(), /kintone 側で処理が続く場合があります。/);
    ok('conflict and unknown');

    // blocked
    await reset({ run: { blocked: 'バックアップを保存できませんでした。', noBackup: true } });
    await setTargets(['101', '102']);
    await inspect(); await toConfirm(); await confirmAndRun(2);
    assert.match(await statusText(), /^反映前の確認で止めました。まだ本番へは反映していません。バックアップを保存できませんでした。$/);
    assert.equal(await page.locator('.kus-lp__status').getAttribute('data-tone'), 'warn');
    assert.match(await page.locator('[data-deploy-backup="none"]').innerText(), /バックアップは保存していません。/);
    ok('blocked');

    // revision 不一致・保存できなかったファイル
    await reset({ run: { unverified: ['102'], unavailableFiles: [{ appId: '101', name: 'app.js', reason: '取得できませんでした' }] } });
    await setTargets(['101', '102']);
    await inspect(); await toConfirm(); await confirmAndRun(2);
    assert.equal(await page.locator('.kus-lp__status').getAttribute('data-tone'), 'warn');
    assert.match(await statusText(), /1 アプリは反映後の状態（revision）が本番とプレビューで一致しませんでした/);
    assert.match(await page.locator('[data-deploy-unverified]').innerText(), /注意: 1 アプリは反映後の状態（revision）が本番とプレビューで一致しませんでした（App 102）/);
    assert.match(await page.locator('[data-deploy-backup-files]').innerText(), /本体を保存できなかったファイル（1 件）[\s\S]*App 101 \/ app\.js（取得できませんでした）/);
    assert.match(await resultItem('102').innerText(), /本番とプレビューのrevisionが一致しません/);
    ok('unverified and unavailable files');

    // 1 件: 設定画面を開く
    await reset();
    await setTargets(['106']);
    await inspect(); await toConfirm(); await confirmAndRun(106);
    await button('アプリの設定画面を開く').click();
    assert.match(await page.evaluate(() => window.__deployMock.opened[0]), /\/k\/admin\/app\/flow\?app=106$/);
    const singleMd = await downloadOf('記録をMarkdownで保存');
    assert.match(singleMd.name, /^本番反映記録_請求\(app106\)_/, '1 件ならファイル名にアプリ名を入れる');
    ok('single app');

    // 想定外の例外（依頼済みかもしれないアプリは完了を確認できない扱い）
    await reset({ run: { throws: 'ネットワークに接続できません' } });
    await setTargets(['101', '102']);
    await inspect(); await toConfirm(); await confirmAndRun(2);
    assert.match(await statusText(), /^エラー: 実行中にエラーが発生しました。本番の状態をアプリの設定画面で確認してください。/);
    assert.match(await resultItem('101').innerText(), /未実行/);
    assert.equal(await button('結果JSONを保存').isEnabled(), true, '例外でも結果を保存できる');
    ok('engine exception');

    // 実行中の中止
    await reset({ stepMode: true });
    await setTargets(['101', '102', '106']);
    await inspect(); await toConfirm();
    await ackBox().check(); await confirmBox().fill('3');
    await runButton().click();
    await page.waitForFunction(() => window.__deployMock.waiting);
    await advance(); // 101: 確認中 → 反映中
    await advance(); // 101: 成功 → 102: 確認中
    await page.getByRole('button', { name: '処理を中止', exact: true }).click();
    await advance(); // 102: 中止を受けて未実行
    await idle();
    await page.evaluate(() => { window.__deployMock.stepMode = false; });
    assert.match(await statusText(), /^中止しました（1\/3 アプリを反映、残り 2 アプリは未実行）。反映済みの分は本番に残っています。「失敗・未実行だけ選び直す」から確認し直してください。$/, '中止の文言');
    assert.match(await resultItem('102').innerText(), /未実行/);
    ok('cancel');

    // 変更を中止の実行
    await reset();
    await page.getByRole('radio', { name: '変更を中止（プレビューを本番に戻す）', exact: true }).check();
    await setTargets(['101']);
    await inspect(); await toConfirm(); await confirmAndRun(101);
    assert.match(await statusText(), /^1 アプリのプレビューの変更を中止しました。$/);
    assert.equal(await page.evaluate(() => window.__deployMock.runs[0].mode), 'revert');
    assert.match(await page.locator('[data-deploy-backup="saved"]').innerText(), /変更の中止前バックアップ.*中止前のプレビューの設定/);
    const revertMd = await downloadOf('記録をMarkdownで保存');
    assert.match(revertMd.name, /^変更の中止記録_/);
    assert.match(revertMd.text, /^# 変更の中止の記録/);
    ok('revert run');

    // 閉じて開き直すと、直近の結果を残す
    await page.evaluate(() => DeployHarness.mountDeployLitePanel());
    assert.equal(await tab('結果').getAttribute('aria-selected'), 'true', '開き直したときは直近の結果から始める');
    assert.equal(await button('結果JSONを保存').isEnabled(), true);
    ok('remount keeps last result');

    // =======================================================================
    // 5. 数千件でも固まらない
    // =======================================================================
    await reset({ bulk: { from: 5000, count: 1000 }, catalog: Array.from({ length: 1000 }, (_, i) => ({ appId: String(5000 + i), name: '一括' + i, code: '' })), run: { plan: { '5003': 'fail', '5500': 'fail' } } });
    await page.getByText('アプリを検索（名前・コード・ID）').click();
    await button('環境内の全アプリ').click();
    await page.getByRole('button', { name: '候補 1000 件をすべて対象アプリに追加' }).waitFor();
    await page.getByRole('button', { name: '候補 1000 件をすべて対象アプリに追加' }).click();
    assert.match(await page.locator('.kus-dp-count').innerText(), /^1000 アプリ（最大 1000）$/);
    await button('詳細設定…').click(); await page.getByRole('radio', { name: '残りも続ける', exact: true }).check(); await page.getByRole('button', { name: '詳細設定を閉じる', exact: true }).click();
    const t0 = Date.now();
    await inspect();
    assert.equal(await page.locator('tr.kus-dp-row').count(), 200, '表は先頭 200 件だけ描画する');
    assert.match(await button('さらに表示（残り 800 アプリ）').innerText(), /残り 800 アプリ/);
    await button('さらに表示（残り 800 アプリ）').click();
    assert.equal(await page.locator('tr.kus-dp-row').count(), 400);
    await toConfirm();
    assert.match(await facts('targets').innerText(), /…ほか 980 件（合計 1000 件）/, '対象は先頭 20 件＋件数');
    assert.equal(await confirmBox().getAttribute('aria-label'), '確認用の対象アプリ数');
    await confirmAndRun(1000);
    const elapsed = Date.now() - t0;
    assert.ok(await page.locator('.kus-dp-result-item').count() <= 220, `件数が多いときは全行を描画しない（${await page.locator('.kus-dp-result-item').count()} 行）`);
    assert.equal(await page.locator('.kus-dp-result-item[data-deploy-status="failed"]').count(), 2, '問題のある行は優先して表示する');
    assert.match(await page.locator('.kus-dp-progress__summary').innerText(), /^1000\/1000 アプリが完了（成功 998・失敗 2）$/);
    assert.match(await page.locator('.kus-dp-progress__omitted').innerText(), /ほか 998 アプリは一覧に表示していません/);
    assert.ok(elapsed < 60000, `1000 件の確認から実行までが長すぎる: ${elapsed}ms`);
    const bigJson = JSON.parse((await downloadOf('結果JSONを保存')).text);
    assert.equal(bigJson.apps.length, 1000, '結果JSONには全件を入れる');
    ok('1000 apps');

    // =======================================================================
    // 6. 画面幅
    // =======================================================================
    const sizes = [[320, 700], [390, 844], [768, 900], [1024, 900], [1440, 1000]];
    await reset({ run: { plan: { '102': 'fail' } } });
    await setTargets(['101', '102', '103', '104', '105', '106']);
    for (const [width, height] of sizes) {
      await page.setViewportSize({ width, height });
      await overflowOf(`${width}px 対象を選ぶ`);
      await page.screenshot({ path: path.join(OUT, `setup-${width}.png`) });
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    await inspect();
    await reviewRow('101').getByRole('button', { name: '詳細を表示' }).click();
    for (const [width, height] of sizes) {
      await page.setViewportSize({ width, height });
      await overflowOf(`${width}px 変更を確認`);
      await page.screenshot({ path: path.join(OUT, `review-${width}.png`) });
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    await reviewRow('104').getByRole('button', { name: '対象から外す' }).click();
    await reviewRow('105').getByRole('button', { name: '対象から外す' }).click();
    await toConfirm();
    for (const [width, height] of sizes) {
      await page.setViewportSize({ width, height });
      await overflowOf(`${width}px 最終確認`);
      await page.screenshot({ path: path.join(OUT, `confirm-${width}.png`) });
      const hit = await page.getByRole('button', { name: /^確認した/ }).evaluate(e => { const r = e.getBoundingClientRect(); return r.height < 120 && r.width > 0; });
      assert.equal(hit, true, `${width}pxで実行ボタンが縦長にならない`);
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    await confirmAndRun(3);
    for (const [width, height] of sizes) {
      await page.setViewportSize({ width, height });
      await overflowOf(`${width}px 結果`);
      await page.screenshot({ path: path.join(OUT, `result-${width}.png`) });
    }
    ok('widths 320-1440');

    // 低い画面でもフッターが本文を覆わない
    await page.setViewportSize({ width: 800, height: 520 });
    await overflowOf('800x520 結果');
    await page.setViewportSize({ width: 1440, height: 1000 });

    // キーボード操作
    await reset();
    await setTargets(['101']);
    await inspect();
    await tab('変更を確認').focus();
    await page.keyboard.press('Home');
    assert.equal(await tab('対象を選ぶ').getAttribute('aria-selected'), 'true');
    await page.keyboard.press('ArrowRight');
    assert.equal(await tab('変更を確認').getAttribute('aria-selected'), 'true');
    ok('keyboard');

    // 反映元アプリから本番へ（合成エンジン。続けて実エンジンとの結合は deploy-engine-scenarios.cjs の側で扱う）
    const sourceScenarios = require('./deploy-source-scenarios.cjs');
    const sourceScript = await sourceScenarios.bundle({ esbuild: require(path.join(TOOL, 'node_modules/esbuild')), deployMock: mockEngine });
    for (const name of await sourceScenarios.run({ page, script: sourceScript, out: OUT })) ok(`source: ${name}`);

    // 実エンジン＋合成 kintone API（画面の表示と、合成 kintone が受け取った送信内容の両方を確かめる）
    const realScript = await bundle('real');
    for (const name of await require('./deploy-engine-scenarios.cjs')({ page, script: realScript, out: OUT })) ok(name);
    // 「反映元アプリから本番へ」の画面＋実エンジン＋合成 kintone API（deploy-source-engine-scenarios.cjs）
    for (const name of await require('./deploy-source-engine-scenarios.cjs')({ page, script: realScript, out: OUT })) ok(name);

    assert.deepEqual(errors, []);
    fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify({ passed: true, sizes, checks }, null, 2));
    console.log(`PASS deploy-lite: ${checks.join(', ')}`);
    console.log(`Artifacts: ${OUT}`);
  } catch (error) {
    await page.screenshot({ path: path.join(OUT, 'failure.png') }).catch(() => {});
    console.error(await page.locator(ROOT_SEL).innerText().catch(() => '(パネルなし)'));
    console.error('Browser errors:', errors);
    throw error;
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
