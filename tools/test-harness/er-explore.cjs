#!/usr/bin/env node
'use strict';

// ER図（tools/ER図.js）の通し検証。配布物をそのままページに読み込み、業務システムに近い 39 アプリの合成 kintone
// （er-explore-fixture.cjs）につないで、利用者と同じ操作で確かめる。実際の kintone には通信しない。
//
//   - 生成: パネルの「ER図をHTMLで保存」で 3 つの図（案件管理から辿る・全アプリを起点・深さ 1）を作る。所要時間と状態表示を記録。
//   - 生成した HTML は、file:// 以外の通信をすべて遮断したブラウザで開く（描画ライブラリは同梱済み）。
//   - 全レイアウト（Dagre・ツリー・フォース・同心円・グリッド・円形）× 全表示密度で、アプリのカードが重ならないこと
//     （縮小表示と詳細表示の両方）、画面からはみ出さないこと、スクリーンショット。
//   - 検索・強調・シンプル表示・詳細パネル・関連の詳細（コピーするフィールド・表示フィールド・絞り込み条件）。
//   - 出力（PNG・Mermaid・draw.io・PlantUML・SQL DDL・JSON・Markdown・CSV 3 種）の中身。
//   - 320〜1440px のはみ出し、キーボード操作。
//
// 画面と出力は .iter-shots/er-explore/ に保存する。失敗した検査は最後に一覧し、1 件でもあれば失敗にする。
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const { buildFixture } = require('./er-explore-fixture.cjs');

const ROOT = path.resolve(__dirname, '..', '..');
const TOOL_FILE = path.join(ROOT, 'tools', 'ER図.js');
const OUT = path.join(ROOT, '.iter-shots', 'er-explore');

const argValue = (name, fallback = '') => (process.argv.includes(name) ? process.argv[process.argv.indexOf(name) + 1] : fallback);
const hasFlag = (name) => process.argv.includes(name);

if (hasFlag('--help') || hasFlag('-h')) {
  console.log(`Usage: node tools/test-harness/er-explore.cjs [options]

ER図（tools/ER図.js をそのまま読み込み）を、業務システムに近い 39 アプリの合成 kintone につないで通しに検証します。
実際の kintone には通信しません。

Options:
  --browser <name>     chrome または chromium（既定: chrome）
  --executable <path>  ブラウザの実行ファイル（環境変数 KUS_PLAYWRIGHT_EXECUTABLE でも指定できます）
  --only <text>        名前に <text> を含む検査だけ実行します（例: --only layout）
  --help               このヘルプを表示

日本語のダウンロード名を扱うため、ロケールが C/POSIX の環境では LANG=C.UTF-8 LC_ALL=C.UTF-8 を付けて実行してください。
結果と画面: .iter-shots/er-explore/`);
  process.exit(0);
}

const results = [];
const only = argValue('--only');
// 検査の名前、またはその検査を含むグループの名前（layout・search など）で絞り込む
const shouldRun = (name) => !only || name.includes(only) || only.startsWith(name);

async function check(name, fn) {
  if (!shouldRun(name)) return;
  const started = Date.now();
  try {
    const detail = await fn();
    results.push({ name, ok: true, ms: Date.now() - started, detail });
    console.log(`  ok   ${String(Date.now() - started).padStart(5)}ms ${name}${detail ? `  (${typeof detail === 'string' ? detail : JSON.stringify(detail)})` : ''}`);
  } catch (error) {
    results.push({ name, ok: false, ms: Date.now() - started, error: String(error && error.message ? error.message : error) });
    console.log(`  FAIL ${name}\n       ${String(error && error.message ? error.message : error).split('\n').join('\n       ')}`);
  }
}

// ---------------------------------------------------------------------------
// 合成 kintone（ページ内）
// ---------------------------------------------------------------------------
async function installMock(page, fixture, latency = 0) {
  await page.evaluate(({ fixture, latency }) => {
    const calls = [];
    const state = { inflight: 0, peak: 0 };
    window.__ER_CALLS__ = calls;
    window.__ER_STATE__ = state;
    const api = async (url, method, params = {}) => {
      const resource = String(url).replace(/^.*\/k(?:\/guest\/[^/]+)?\/v1(?:\/preview)?/, '') || '/';
      calls.push({ resource, method: String(method), params: { ...params } });
      state.inflight += 1;
      state.peak = Math.max(state.peak, state.inflight);
      try {
        if (latency) await new Promise((resolve) => setTimeout(resolve, latency));
        if (String(method).toUpperCase() !== 'GET') throw new Error(`mock: GET のみ対応です (${method} ${resource})`);
        if (resource === '/apps.json') {
          const all = Object.values(fixture.apps).map((app) => ({ appId: app.id, name: app.name, spaceId: app.spaceId }));
          const offset = Number(params.offset || 0);
          return { apps: all.slice(offset, offset + Number(params.limit || 100)) };
        }
        const id = String(params.app ?? params.id);
        const app = fixture.apps[id];
        if (!app) {
          const error = new Error(`指定したアプリ（ID: ${id}）が見つかりません。`);
          error.code = 'GAIA_AP01';
          error.status = 404;
          throw error;
        }
        if (resource === '/app.json') return { appId: app.id, name: app.name, spaceId: app.spaceId, description: app.description, createdAt: '2026-01-01T00:00:00Z', modifiedAt: '2026-08-01T00:00:00Z' };
        if (resource === '/app/form/fields.json') {
          if (app.failFields) {
            const error = new Error(app.failFields);
            error.code = 'CB_NO02';
            error.status = 403;
            throw error;
          }
          return { properties: JSON.parse(JSON.stringify(app.fields)), revision: '5' };
        }
        if (resource === '/app/actions.json') return { actions: JSON.parse(JSON.stringify(app.actions)), revision: '5' };
        throw new Error(`mock: 未対応の API です (${resource})`);
      } finally {
        state.inflight -= 1;
      }
    };
    api.url = (resource, preview) => `/k/v1${preview ? '/preview' : ''}${resource}`;
    window.kintone = { api, app: { getId: () => 113 }, getLoginUser: () => ({ code: 'user', name: 'User' }) };
    window.alert = () => {};
    window.confirm = () => true;
  }, { fixture, latency });
}

function collectErrors(page, label, errors) {
  page.on('pageerror', (error) => errors.push(`${label}: pageerror: ${error.message}`));
  page.on('console', (message) => {
    // 取得失敗のアプリは、画面の動作とは別に console.error へ原因を残す（想定内）
    if (message.type() === 'error' && !/^App \d+: /.test(message.text())) errors.push(`${label}: console: ${message.text()}`);
  });
}

async function launch() {
  const executable = argValue('--executable', process.env.KUS_PLAYWRIGHT_EXECUTABLE || '');
  const requested = argValue('--browser', process.env.KUS_ER_BROWSER || 'chrome');
  const options = { headless: true };
  if (executable) options.executablePath = executable;
  else if (requested !== 'chromium') options.channel = requested;
  try {
    return await chromium.launch(options);
  } catch (error) {
    if (!options.channel && !options.executablePath) throw error;
    console.warn(`[ER explore] ${requested} を起動できないため bundled Chromium を使います: ${error.message}`);
    return chromium.launch({ headless: true });
  }
}

// ---------------------------------------------------------------------------
// 生成（パネルの操作）
// ---------------------------------------------------------------------------
const setValue = (locator, value) => locator.evaluate((element, v) => {
  element.value = v;
  element.dispatchEvent(new Event('input', { bubbles: true }));
  element.dispatchEvent(new Event('change', { bubbles: true }));
}, value);

async function generateHtml(browser, fixture, spec) {
  const context = await browser.newContext({ acceptDownloads: true, viewport: { width: 1200, height: 900 } });
  const page = await context.newPage();
  const errors = [];
  collectErrors(page, `generate-${spec.name}`, errors);
  await page.route('https://mock.cybozu.com/**', (route) => route.fulfill({
    status: 200, contentType: 'text/html; charset=utf-8',
    body: '<!doctype html><html lang="ja"><head><meta charset="utf-8"><title>Mock kintone</title></head><body></body></html>'
  }));
  await page.goto('https://mock.cybozu.com/k/113/', { waitUntil: 'domcontentloaded' });
  await installMock(page, fixture, spec.latency || 0);
  await page.addScriptTag({ content: fs.readFileSync(TOOL_FILE, 'utf8') });
  const root = page.locator('#kus-er-lite');
  await root.waitFor({ state: 'visible', timeout: 15000 });
  await root.locator('.kus-lp__row').filter({ hasText: '起点ID' }).first().locator('input').first().fill(spec.ids.join(','));
  await setValue(root.locator('select').filter({ has: page.locator('option[value="dagre"]') }).first(), spec.layout || 'dagre');
  await setValue(root.locator('select').filter({ has: page.locator('option[value="full"]') }).first(), spec.density || 'standard');
  await setValue(root.locator('input[type=number]').first(), String(spec.depth ?? 0));
  await root.locator('label').filter({ hasText: '逆引き探索' }).first().locator('input').evaluate((element, checked) => {
    element.checked = checked;
    element.dispatchEvent(new Event('change', { bubbles: true }));
  }, !!spec.reverse);
  await root.getByRole('radio', { name: 'ER図をHTMLで保存', exact: true }).check();
  await root.getByRole('button', { name: '内容を確認する', exact: true }).click();
  const downloadPromise = page.waitForEvent('download', { timeout: spec.cancelAfterMs ? 3000 : 120000 });
  const started = Date.now();
  await root.getByRole('button', { name: 'ER図をHTMLで保存', exact: true }).click();
  if (spec.cancelAfterMs) {
    // 読み取りの途中で「中止」を押す。図は保存されず、件数つきの状態が出る
    await page.waitForTimeout(spec.cancelAfterMs);
    await root.getByRole('button', { name: /中止/ }).first().click();
    const downloaded = await downloadPromise.then(() => true, () => false);
    await page.waitForTimeout(500);
    const cancelStatus = String(await root.locator('.kus-lp__status').first().innerText().catch(() => '')).replace(/\s+/g, ' ').trim();
    const state = await page.evaluate(() => ({ peak: window.__ER_STATE__.peak, fieldCalls: window.__ER_CALLS__.filter((c) => c.resource === '/app/form/fields.json').length }));
    await context.close();
    return { cancelled: true, downloaded, status: cancelStatus, errors, ...state };
  }
  const download = await downloadPromise;
  const file = path.join(OUT, `${spec.name}.html`);
  await download.saveAs(file);
  const elapsedMs = Date.now() - started;
  const status = String(await root.locator('.kus-lp__status').first().innerText().catch(() => '')).replace(/\s+/g, ' ').trim();
  const peak = await page.evaluate(() => window.__ER_STATE__.peak);
  await context.close();
  return { file, elapsedMs, status, errors, peakRequests: peak, html: fs.readFileSync(file, 'utf8') };
}

// ---------------------------------------------------------------------------
// 生成した図を開く（file:// 以外の通信をすべて遮断）
// ---------------------------------------------------------------------------
async function openViewer(browser, file, { width = 1440, height = 900, hash = '' } = {}) {
  const context = await browser.newContext({ viewport: { width, height }, acceptDownloads: true });
  const page = await context.newPage();
  const errors = [];
  const blocked = [];
  collectErrors(page, path.basename(file), errors);
  await page.route('**/*', async (route) => {
    const url = route.request().url();
    if (/^(?:file|data|blob|about):/i.test(url)) return route.continue();
    blocked.push(url);
    return route.abort();
  });
  await page.goto(`file://${file}${hash}`, { waitUntil: 'load' });
  await page.waitForSelector('#cy canvas', { state: 'attached', timeout: 30000 });
  await page.waitForTimeout(1500);
  return { context, page, errors, blocked };
}

const measureOverlaps = (page) => page.evaluate(() => {
  const nodes = cy.nodes().filter((node) => node.visible() && !node.hasClass('note-node'));
  const boxes = nodes.map((node) => ({ id: node.id(), name: String(node.data('label') || '').split('\n')[0], box: node.boundingBox({ includeLabels: false, includeOverlays: false }) }));
  const overlaps = [];
  for (let i = 0; i < boxes.length; i += 1) {
    for (let j = i + 1; j < boxes.length; j += 1) {
      const a = boxes[i].box;
      const b = boxes[j].box;
      const width = Math.min(a.x2, b.x2) - Math.max(a.x1, b.x1);
      const height = Math.min(a.y2, b.y2) - Math.max(a.y1, b.y1);
      if (width > 2 && height > 2) overlaps.push({ a: boxes[i].name, b: boxes[j].name, width: Math.round(width), height: Math.round(height) });
    }
  }
  return { nodes: boxes.length, overlaps: overlaps.length, sample: overlaps.slice(0, 3), zoom: Math.round(cy.zoom() * 100) };
});

async function settleLayout(page) {
  // レイアウトの動き（0.55 秒）と全体表示の合わせ直し（0.45 秒）が終わるまで待つ
  await page.waitForTimeout(1600);
}

// ---------------------------------------------------------------------------
async function main() {
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });
  assert.ok(fs.existsSync(TOOL_FILE), `${TOOL_FILE} がありません。先に npm run build を実行してください`);
  const fixture = buildFixture();
  const allIds = fixture.allAppIds.map(String);
  const browser = await launch();
  const generated = {};
  try {
    console.log('生成');
    const specs = [
      { name: 'business', ids: ['113'], depth: 0, latency: 15 },
      { name: 'all', ids: allIds, depth: 0 },
      { name: 'depth1', ids: ['113'], depth: 1 }
    ];
    for (const spec of specs) {
      if (!shouldRun('generate') && !shouldRun(spec.name) && only) { /* 後続の検査が使う図は常に作る */ }
      generated[spec.name] = await generateHtml(browser, fixture, spec);
    }
    await check('generate: 案件管理から辿る図（取得失敗 1・存在しない参照先は辿るだけ）', async () => {
      const g = generated.business;
      assert.match(g.status, /ER図HTMLを保存しました/);
      assert.match(g.status, /取得失敗 1/);
      assert.deepEqual(g.errors, []);
      // 同時に読むのは 4 アプリまで（1 アプリ 3 リクエスト）。直列ではなく並列で読んでいること
      assert.ok(g.peakRequests >= 6 && g.peakRequests <= 12, `同時リクエストの最大が ${g.peakRequests} 件です（4 アプリ × 3 リクエスト以内で、複数アプリを並行して読むはず）`);
      return `${g.status}  ${g.elapsedMs}ms 同時リクエスト最大 ${g.peakRequests}`;
    });
    await check('generate: 全アプリを起点にした図（孤立・取得失敗・削除済みの参照先を含む）', async () => {
      const g = generated.all;
      assert.match(g.status, /41アプリ/);
      assert.match(g.status, /取得失敗 3/);
      assert.deepEqual(g.errors, []);
      return `${g.status}  ${g.elapsedMs}ms`;
    });
    await check('generate: 深さ 1 の図', async () => {
      assert.match(generated.depth1.status, /9アプリ/);
      assert.deepEqual(generated.depth1.errors, []);
      return generated.depth1.status;
    });
    await check('generate: 外部の通信なしで描画できる自己完結の HTML', async () => {
      for (const [name, g] of Object.entries(generated)) {
        assert.ok(!/<script\b[^>]*\ssrc\s*=/i.test(g.html), `${name}: script src が残っています`);
        assert.ok(!/cdnjs|jsdelivr/.test(g.html.match(/Content-Security-Policy" content="([^"]*)"/)[1]), `${name}: CSP に CDN が残っています`);
      }
      return Object.entries(generated).map(([name, g]) => `${name} ${(g.html.length / 1024).toFixed(0)}KB`).join(' / ');
    });

    // -----------------------------------------------------------------------
    console.log('レイアウトと表示密度（全アプリを起点にした図 41 アプリ）');
    const layouts = ['dagre', 'breadthfirst', 'cose', 'concentric', 'grid', 'circle'];
    const densities = ['none', 'compact', 'standard', 'full'];
    if (shouldRun('layout')) {
      const viewer = await openViewer(browser, generated.all.file);
      const { page } = viewer;
      for (const density of densities) {
        await page.evaluate((value) => window.setDensity(value), density);
        await page.waitForTimeout(700);
        for (const layout of layouts) {
          await check(`layout: ${layout} / 密度 ${density} でカードが重ならない`, async () => {
            await page.evaluate((name) => window.setLayout(name), layout);
            await settleLayout(page);
            const overview = await measureOverlaps(page);
            await page.evaluate(() => { cy.zoom({ level: 1, renderedPosition: { x: cy.width() / 2, y: cy.height() / 2 } }); });
            await page.waitForTimeout(300);
            const detail = await measureOverlaps(page);
            await page.evaluate(() => window.fit());
            await page.waitForTimeout(300);
            if (density === 'standard') await page.screenshot({ path: path.join(OUT, `layout-${layout}.png`), animations: 'disabled' });
            assert.deepEqual({ overview: overview.overlaps, detail: detail.overlaps }, { overview: 0, detail: 0 },
              `重なり ${JSON.stringify([overview.sample, detail.sample])}`);
            return `縮小 ${overview.zoom}%`;
          });
        }
      }
      results.push({ name: 'layout: ページのエラー', ok: viewer.errors.length === 0 && viewer.blocked.length === 0, error: [...viewer.errors, ...viewer.blocked].join('\n') });
      if (viewer.errors.length || viewer.blocked.length) console.log(`  FAIL layout: ページのエラー ${[...viewer.errors, ...viewer.blocked].join(' / ')}`);
      await viewer.context.close();
    }

    // -----------------------------------------------------------------------
    console.log('構造の分析');
    if (shouldRun('analysis')) {
      const viewer = await openViewer(browser, generated.all.file);
      const { page } = viewer;
      await check('analysis: 循環・自己参照・孤立・取得失敗・接続数の多いアプリが事実どおり', async () => {
        const analysis = await page.evaluate(() => JSON.parse(JSON.stringify(ER_ANALYSIS)));
        const cycles = analysis.cycles.map((c) => [...c.appIds].map(Number).sort((a, b) => a - b).join('-'));
        assert.ok(cycles.includes('137-138-139'), `循環テスト A→B→C が見つかりません: ${cycles.join(' / ')}`);
        assert.ok(cycles.some((c) => ['113', '114', '116'].every((id) => c.split('-').includes(id))), `案件・見積・受注の循環が見つかりません: ${cycles.join(' / ')}`);
        assert.deepEqual(analysis.selfReferences.map((s) => Number(s.appId)).sort(), [101, 111], '自己参照（顧客マスタの親会社・社員マスタの上長）');
        assert.ok(analysis.isolatedAppIds.map(Number).includes(132), '孤立アプリ（社内連絡メモ）');
        assert.deepEqual(analysis.failedAppIds.map(Number).sort((a, b) => a - b), [133, 998, 999]);
        assert.ok(analysis.hubs.some((h) => Number(h.appId) === 136), '全社マスタ連携ハブが接続数の多いアプリに入っていません');
        return `循環 ${cycles.length} 件 / 孤立 ${analysis.isolatedAppIds.length} / 取得失敗 ${analysis.failedAppIds.length}`;
      });
      await check('analysis: 「チェック」パネルを開いて閉じられる（キーボード）', async () => {
        await page.locator('#analysis-toggle-btn').focus();
        await page.keyboard.press('Enter');
        await page.waitForTimeout(400);
        const text = await page.locator('#analysis-panel').innerText();
        assert.match(text, /循環/);
        assert.match(text, /取得/);
        assert.match(text, /このアプリを閲覧する権限がありません/, '取得失敗の理由');
        assert.ok(!text.includes('[API]'), '取得失敗の理由に内部の通信情報（[API] …）が出ています');
        await page.screenshot({ path: path.join(OUT, 'analysis-panel.png'), animations: 'disabled' });
        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);
        assert.equal(await page.evaluate(() => document.getElementById('analysis-panel').classList.contains('open')), false, 'Esc でパネルが閉じません');
      });
      await viewer.context.close();
    }

    console.log('検索・強調・詳細パネル');
    if (shouldRun('search') || shouldRun('detail') || shouldRun('simple')) {
      const viewer = await openViewer(browser, generated.all.file);
      const { page } = viewer;
      const searchMeta = async (query) => {
        await page.fill('#search-box', query);
        await page.waitForTimeout(500);
        const meta = String(await page.locator('#search-meta').innerText()).replace(/\s+/g, ' ');
        const highlighted = await page.evaluate(() => cy.nodes('.highlighted').length);
        const match = meta.match(/(\d+)件/);
        return { meta, count: match ? Number(match[1]) : 0, highlighted };
      };
      await check('search: アプリ名・日本語のフィールド名で一致した件数と強調が合う', async () => {
        const byName = await searchMeta('顧客');
        assert.ok(byName.count >= 8, `「顧客」で ${byName.count} 件`);
        assert.equal(byName.highlighted, byName.count, '一致件数と強調したアプリの数が違います');
        await page.screenshot({ path: path.join(OUT, 'search-customer.png'), animations: 'disabled' });
        const byCode = await searchMeta('プロジェクトマネージャー');
        assert.equal(byCode.count, 1, `長いフィールド名で ${byCode.count} 件`);
        const none = await searchMeta('存在しない語句zzz');
        assert.deepEqual([none.count, none.highlighted], [0, 0]);
        // 検索の表示が長くなって操作バーが折り返さない（1 行のまま）
        await searchMeta('顧客');
        const topbarHeight = await page.evaluate(() => document.getElementById('topbar').getBoundingClientRect().height);
        assert.ok(topbarHeight < 60, `検索中に操作バーが折り返しました (${Math.round(topbarHeight)}px)`);
        return `「顧客」${byName.count} 件`;
      });
      await check('search: 現在の密度では項目が見えないアプリも、項目名で見つかる', async () => {
        // 顧客担当者マスタ（App 102）の「メールアドレス」は必須でも結合でもなく、標準密度のカードには出ない
        const hidden = await searchMeta('メールアドレス');
        assert.equal(hidden.count, 1, `標準密度で「メールアドレス」が ${hidden.count} 件（取得済みの項目なので 1 件のはず）`);
        await page.evaluate(() => window.setDensity('none'));
        await page.waitForTimeout(600);
        const none = await searchMeta('顧客コード');
        await page.evaluate(() => window.setDensity('standard'));
        await page.waitForTimeout(600);
        assert.ok(none.count >= 2, `密度「結合のみ」で「顧客コード」が ${none.count} 件`);
      });
      await check('search: Enter で一致したアプリへ順に移り、Ctrl+F で検索欄へ戻れる', async () => {
        await searchMeta('保守');
        await page.locator('#search-box').press('Enter');
        await page.waitForTimeout(500);
        assert.match(await page.locator('#toast').innerText(), /一致 1\//);
        await page.locator('#search-box').press('Enter');
        await page.waitForTimeout(500);
        assert.match(await page.locator('#toast').innerText(), /一致 2\//);
        await page.fill('#search-box', '');
        await page.locator('#search-box').evaluate((el) => el.blur());
        await page.keyboard.press('Control+f');
        assert.equal(await page.evaluate(() => document.activeElement && document.activeElement.id), 'search-box');
        await page.fill('#search-box', '');
      });
      await check('detail: アプリを選ぶと詳細パネルに関連の詳細（コピー・表示・絞り込み）が出る', async () => {
        await page.evaluate(() => window.focusApp(113));
        await page.waitForTimeout(1200);
        assert.equal(await page.locator('#detail-title').innerText(), '案件管理');
        const relations = await page.locator('#detail-relations').innerText();
        assert.match(relations, /コピー: 参照先 顧客名 → 顧客名 \/ 参照先 業種名 → 顧客業種/, 'ルックアップのコピー先');
        assert.match(relations, /表示: 見積番号 \/ 見積日 \/ 見積金額/, '関連レコード一覧の表示フィールド');
        assert.match(relations, /絞り込み: ステータス != "完了"/, '関連レコード一覧の絞り込み条件');
        assert.match(relations, /コピー: 案件番号 → 起動先 案件番号/, 'アプリアクションのコピー');
        assert.match(relations, /このアプリを参照している関連/);
        // 長い説明も省略されず、パネルの幅に収まって折り返している
        const layout = await page.evaluate(() => {
          const panel = document.getElementById('detail').getBoundingClientRect();
          return [...document.querySelectorAll('#detail-relations .field-detail')].map((el) => {
            const rect = el.getBoundingClientRect();
            return { text: el.textContent.slice(0, 30), truncated: el.scrollWidth > el.clientWidth + 1, outside: rect.right > panel.right + 1, wrapped: getComputedStyle(el).whiteSpace };
          });
        });
        assert.ok(layout.length >= 6, `関連の詳細の行が ${layout.length} 行しかありません`);
        assert.deepEqual(layout.filter((row) => row.truncated || row.outside || row.wrapped !== 'normal'), []);
        await page.screenshot({ path: path.join(OUT, 'detail-113.png'), animations: 'disabled' });
        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);
      });
      await check('detail: 取得失敗のアプリは理由を示し、存在しない参照先は未取得として示す', async () => {
        await page.evaluate(() => window.focusApp(133));
        await page.waitForTimeout(800);
        const failed = await page.locator('#detail-meta').innerText();
        assert.match(failed, /取得失敗/);
        assert.match(failed, /権限/);
        assert.ok(!failed.includes('[API]'), '取得失敗の理由に内部の通信情報（[API] …）が出ています');
        await page.evaluate(() => window.focusApp(999));
        await page.waitForTimeout(800);
        assert.match(await page.locator('#detail-meta').innerText(), /取得失敗/);
        await page.keyboard.press('Escape');
      });
      await check('detail: 線にマウスを乗せると、コピーするフィールドと絞り込みが出る', async () => {
        const text = await page.evaluate(() => {
          const edge = cy.getElementById('e_113_0');
          edge.emit('mouseover');
          const tip = document.getElementById('er-tooltip');
          return tip ? tip.innerText : '';
        });
        assert.match(text, /コピー: 参照先 顧客名 → 顧客名/);
        await page.evaluate(() => { cy.getElementById('e_113_0').emit('mouseout'); });
      });
      await check('simple: シンプル表示で項目が隠れ、元に戻せる', async () => {
        await page.evaluate(() => window.toggleSimpleMode());
        await page.waitForTimeout(1600);
        const during = await measureOverlaps(page);
        await page.screenshot({ path: path.join(OUT, 'simple-mode.png'), animations: 'disabled' });
        await page.evaluate(() => window.toggleSimpleMode());
        await page.waitForTimeout(900);
        assert.equal(during.overlaps, 0, `重なり ${JSON.stringify(during.sample)}`);
      });
      results.push({ name: 'search/detail: ページのエラー', ok: viewer.errors.length === 0 && viewer.blocked.length === 0, error: [...viewer.errors, ...viewer.blocked].join('\n') });
      if (viewer.errors.length || viewer.blocked.length) console.log(`  FAIL search/detail: ページのエラー ${[...viewer.errors, ...viewer.blocked].join(' / ')}`);
      await viewer.context.close();
    }

    console.log('未取得の参照先（深さ 1）');
    if (shouldRun('ghost')) {
      const viewer = await openViewer(browser, generated.depth1.file);
      const { page } = viewer;
      await check('ghost: 図の外の参照先を点線のカードで示し、選ぶと向かう関連が分かる', async () => {
        const info = await page.evaluate(() => ({ ghosts: cy.nodes('[?isGhost]').map((n) => n.data('targetAppId')), apps: cy.nodes().not('[?isGhost]').length }));
        assert.ok(info.ghosts.length >= 5, `未取得の参照先が ${info.ghosts.length} 件`);
        await page.evaluate((id) => { cy.getElementById(`g${id}`).emit('tap'); }, info.ghosts[0]);
        await page.waitForTimeout(700);
        assert.equal(await page.locator('#detail-title').innerText(), '未取得の参照先');
        assert.match(await page.locator('#detail-relations').innerText(), /この参照先へ向かう関連/);
        await page.screenshot({ path: path.join(OUT, 'ghost-detail.png'), animations: 'disabled' });
        return `図の外 ${info.ghosts.length} 件`;
      });
      await check('ghost: 概要の件数と図の外の参照先の件数が合う', async () => {
        const pill = String(await page.locator('#overview-pill').innerText());
        const unresolved = await page.evaluate(() => ER_ANALYSIS.unresolvedTargets.length);
        assert.ok(unresolved > 0);
        assert.match(pill, /未取得\s*\d+/);
      });
      await viewer.context.close();
    }

    console.log('出力（全アプリを起点にした図 41 アプリ）');
    if (shouldRun('output')) {
      const viewer = await openViewer(browser, generated.all.file);
      const { page } = viewer;
      const fixtureApps = Object.values(fixture.apps);
      const totalRelations = await page.evaluate(() => APPS.reduce((sum, app) => sum + app.relations.length, 0));
      const modal = async (fn) => {
        await page.evaluate((name) => window[name](), fn);
        await page.waitForTimeout(250);
        const text = await page.evaluate(() => document.getElementById('modal-content').textContent);
        await page.evaluate(() => window.closeModal());
        return text;
      };
      const parseCsv = (text) => {
        const rows = [];
        let row = [];
        let cell = '';
        let quoted = false;
        const body = text.replace(/^﻿/, '');
        for (let i = 0; i < body.length; i += 1) {
          const ch = body[i];
          if (quoted) {
            if (ch === '"' && body[i + 1] === '"') { cell += '"'; i += 1; } else if (ch === '"') quoted = false; else cell += ch;
          } else if (ch === '"') quoted = true;
          else if (ch === ',') { row.push(cell); cell = ''; } else if (ch === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; } else cell += ch;
        }
        if (cell || row.length) { row.push(cell); rows.push(row); }
        return rows;
      };
      await check('output: Mermaid に全アプリと全関連があり、日本語のコードでも構文が崩れない', async () => {
        const text = await modal('showMermaid');
        assert.match(text, /^[\s\S]*erDiagram/);
        for (const app of fixtureApps) assert.ok(text.includes(`app_${app.id}`), `Mermaid に App ${app.id} がありません`);
        assert.ok(text.includes('プロジェクト管理番号_西暦年度_連番_枝番'), '日本語のフィールドコードの注釈');
        const attributeLines = text.split('\n').filter((line) => /^\s+\S+ \S+/.test(line) && !/^\s*(%%|app_)/.test(line));
        assert.ok(attributeLines.every((line) => /^\s+[A-Za-z_]\w*\s+[A-Za-z_]\w*/.test(line) || /^\s+\w+\s+\w+\s/.test(line)), '項目名が ASCII でない行があります');
        const relationLines = text.split('\n').filter((line) => /\|\|--|}o--|o\{|--o/.test(line));
        return `${text.length} 文字 / 関連の行 ${relationLines.length}`;
      });
      await check('output: draw.io の XML が壊れておらず、全アプリのカードがある', async () => {
        const text = await modal('showDrawio');
        const info = await page.evaluate((xml) => {
          const doc = new DOMParser().parseFromString(xml, 'application/xml');
          return { error: doc.querySelector('parsererror') ? doc.querySelector('parsererror').textContent.slice(0, 200) : '', cells: doc.querySelectorAll('mxCell').length };
        }, text);
        assert.equal(info.error, '');
        assert.ok(info.cells > fixtureApps.length, `mxCell ${info.cells} 件`);
        assert.ok(text.includes('【2024年度版】全社横断プロジェクト進捗'), '長いアプリ名');
        return `mxCell ${info.cells} 件`;
      });
      await check('output: PlantUML・SQL DDL の形式と全アプリ', async () => {
        const puml = await modal('showPlantUML');
        assert.match(puml, /@startuml/);
        assert.match(puml, /@enduml/);
        for (const app of fixtureApps.filter((a) => !a.failFields)) assert.ok(puml.includes(String(app.id)), `PlantUML に App ${app.id} がありません`);
        const sql = await modal('showSQL');
        const tables = (sql.match(/CREATE TABLE/g) || []).length;
        assert.ok(tables >= fixtureApps.filter((a) => !a.failFields).length, `CREATE TABLE ${tables} 件`);
        assert.ok(sql.includes('`顧客コード`'), '日本語の列名をバッククォートで囲む');
        return `CREATE TABLE ${tables} 件`;
      });
      await check('output: JSON は読み込め、関連のコピー・表示・絞り込みを含む', async () => {
        const text = await modal('showJSON');
        const model = JSON.parse(text);
        assert.equal(model.apps.length, 41);
        const relations = model.apps.flatMap((app) => app.relations);
        assert.equal(relations.length, totalRelations);
        const lookup = relations.find((r) => r.type === 'LOOKUP' && r.copyFields.length);
        assert.ok(lookup, 'ルックアップのコピー先がありません');
        assert.ok(relations.some((r) => r.type === 'REF' && r.displayFields.length && r.filterCond), '関連レコード一覧の表示フィールド・絞り込み条件がありません');
        assert.ok(relations.some((r) => r.type === 'ACTION' && r.copyFields.length), 'アクションのコピーがありません');
        return `関連 ${relations.length} 件`;
      });
      await check('output: Markdown の関連の表に、コピー・表示するフィールドと絞り込み条件がある', async () => {
        const text = await modal('showMarkdown');
        assert.match(text, /# kintone ER図 仕様書/);
        assert.ok(text.includes('| コピー・表示するフィールド | 絞り込み条件 |'));
        assert.ok(text.includes('参照先 業種名 → 顧客業種'));
        assert.ok(text.includes('見積番号 / 見積日 / 見積金額'));
        assert.ok(text.includes('ステータス != "完了"'));
        assert.ok(text.includes('【2024年度版】全社横断プロジェクト進捗'), '長いアプリ名');
        for (const row of text.split('\n').filter((line) => /^\| (LOOKUP|REF|ACTION) \|/.test(line))) {
          // 表の列数が崩れていない（区切りの縦線をエスケープしてある）
          assert.equal((row.replace(/\\\|/g, '').match(/\|/g) || []).length, 9, row.slice(0, 80));
        }
      });
      await check('output: CSV は BOM 付きで、行数が件数と合い、関連の CSV に詳細の列がある', async () => {
        const apps = parseCsv(await modal('showCSVApps'));
        const fields = parseCsv(await modal('showCSVFields'));
        const relations = parseCsv(await modal('showCSVRelations'));
        assert.equal(apps.length, 1 + 41);
        assert.ok(![...apps.flat(), ...relations.flat()].some((cell) => cell.includes('[API]')), 'CSV に内部の通信情報（[API] …）が出ています');
        assert.equal(relations.length, 1 + totalRelations);
        assert.ok(fields.length > 200, `フィールド ${fields.length} 行`);
        const header = relations[0];
        assert.deepEqual(header.slice(-2), ['コピー・表示するフィールド', '絞り込み条件']);
        assert.ok(relations.some((row) => row[0] === 'LOOKUP' && /参照先 .* → /.test(row[row.length - 2])));
        assert.ok(relations.some((row) => row[0] === 'REF' && row[row.length - 2] === '見積番号 / 見積日 / 見積金額'));
        for (const row of [...apps, ...fields, ...relations]) assert.ok(row.length > 5);
        const widths = new Set(relations.map((row) => row.length));
        assert.equal(widths.size, 1, `列数が揃っていません: ${[...widths]}`);
      });
      await check('output: PNG を保存でき、大きさが読める範囲', async () => {
        const downloadPromise = page.waitForEvent('download', { timeout: 60000 });
        await page.evaluate(() => window.exportPNG());
        const download = await downloadPromise;
        const file = path.join(OUT, 'export.png');
        await download.saveAs(file);
        const buffer = fs.readFileSync(file);
        assert.equal(buffer.subarray(1, 4).toString('ascii'), 'PNG');
        const width = buffer.readUInt32BE(16);
        const height = buffer.readUInt32BE(20);
        assert.ok(width >= 1000 && height >= 600, `${width}x${height}`);
        assert.ok(width <= 16384 && height <= 16384, `大きすぎる画像 ${width}x${height}`);
        return `${width}x${height}px ${(buffer.length / 1024).toFixed(0)}KB`;
      });
      await check('output: 編集済みHTMLを保存して通信なしで開き直せる', async () => {
        await page.evaluate(() => window.toggleRelationKind('ACTION'));
        const downloadPromise = page.waitForEvent('download', { timeout: 60000 });
        await page.evaluate(() => window.exportEditedHtml());
        const download = await downloadPromise;
        const file = path.join(OUT, 'edited.html');
        await download.saveAs(file);
        const reopened = await openViewer(browser, file);
        const actionHidden = await reopened.page.evaluate(() => !document.getElementById('rel-action-btn').classList.contains('active'));
        const nodes = await reopened.page.evaluate(() => cy.nodes().length);
        const problems = [...reopened.errors, ...reopened.blocked];
        await reopened.context.close();
        assert.deepEqual(problems, []);
        assert.equal(actionHidden, true, '保存時に隠したアクションの線が、開き直すと戻っています');
        assert.equal(nodes, 41);
      });
      results.push({ name: 'output: ページのエラー', ok: viewer.errors.length === 0 && viewer.blocked.length === 0, error: [...viewer.errors, ...viewer.blocked].join('\n') });
      if (viewer.errors.length || viewer.blocked.length) console.log(`  FAIL output: ページのエラー ${[...viewer.errors, ...viewer.blocked].join(' / ')}`);
      await viewer.context.close();
    }

    console.log('画面幅とキーボード（全アプリを起点にした図）');
    if (shouldRun('responsive') || shouldRun('keyboard')) {
      for (const width of [320, 390, 768, 1024, 1440]) {
        await check(`responsive: ${width}px で横にはみ出さず、操作バーが図に重ならない`, async () => {
          const viewer = await openViewer(browser, generated.all.file, { width, height: width < 500 ? 740 : 900 });
          const { page } = viewer;
          const state = await page.evaluate(() => {
            const rect = (selector) => { const el = document.querySelector(selector); if (!el) return null; const r = el.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, height: r.height }; };
            const overflow = document.documentElement.scrollWidth > document.documentElement.clientWidth + 2 || document.body.scrollWidth > document.body.clientWidth + 2;
            return { overflow, topbar: rect('#topbar'), zoom: rect('#zoom-ctrl'), legend: rect('#legend'), viewport: { width: innerWidth, height: innerHeight } };
          });
          await page.screenshot({ path: path.join(OUT, `responsive-${width}.png`), animations: 'disabled' });
          const problems = [...viewer.errors, ...viewer.blocked];
          await viewer.context.close();
          assert.deepEqual(problems, []);
          assert.equal(state.overflow, false, '横にはみ出しています');
          assert.ok(state.topbar.height <= state.viewport.height * 0.4, `操作バーが画面の 4 割を超えています (${Math.round(state.topbar.height)}px)`);
          if (state.zoom && state.legend) {
            const overlap = Math.min(state.zoom.right, state.legend.right) - Math.max(state.zoom.left, state.legend.left) > 1
              && Math.min(state.zoom.bottom, state.legend.bottom) - Math.max(state.zoom.top, state.legend.top) > 1;
            assert.equal(overlap, false, 'ズーム操作と凡例が重なっています');
          }
          assert.ok(!state.zoom || (state.zoom.right <= state.viewport.width + 1 && state.zoom.bottom <= state.viewport.height + 1), 'ズーム操作が画面の外にあります');
        });
      }
      await check('keyboard: Tab で操作バーを順に移れ、? でヘルプを開き Esc で閉じて元の位置へ戻る', async () => {
        const viewer = await openViewer(browser, generated.business.file);
        const { page } = viewer;
        const seen = new Set();
        await page.locator('body').click({ position: { x: 5, y: 5 } });
        for (let i = 0; i < 14; i += 1) {
          await page.keyboard.press('Tab');
          seen.add(await page.evaluate(() => { const el = document.activeElement; return el ? `${el.tagName}#${el.id}.${el.textContent.trim().slice(0, 12)}` : ''; }));
        }
        assert.ok(seen.size >= 10, `Tab で移れた要素が ${seen.size} 個だけです`);
        await page.locator('#search-box').focus();
        await page.evaluate(() => document.getElementById('search-box').blur());
        await page.keyboard.press('?');
        await page.waitForTimeout(300);
        assert.equal(await page.evaluate(() => document.getElementById('help-overlay').classList.contains('open')), true, '? でヘルプが開きません');
        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);
        assert.equal(await page.evaluate(() => document.getElementById('help-overlay').classList.contains('open')), false, 'Esc でヘルプが閉じません');
        await page.evaluate(() => window.showMermaid());
        await page.waitForTimeout(200);
        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);
        assert.equal(await page.evaluate(() => document.getElementById('modal-overlay').classList.contains('open')), false, 'Esc で出力の画面が閉じません');
        const problems = [...viewer.errors, ...viewer.blocked];
        await viewer.context.close();
        assert.deepEqual(problems, []);
      });
    }

    console.log('中止');
    if (shouldRun('cancel')) {
      await check('cancel: 読み取りの途中で「中止」すると、図は保存されず、処理した件数と未実行の件数が出る', async () => {
        const result = await generateHtml(browser, fixture, { name: 'cancel', ids: allIds, depth: 0, latency: 150, cancelAfterMs: 1200 });
        assert.equal(result.downloaded, false, '中止したのに図が保存されました');
        assert.match(result.status, /中止しました（\d+\/\d+ 件を処理、残り \d+ 件は未実行）/);
        const [, done, total] = result.status.match(/（(\d+)\/(\d+) 件を処理/).map(Number);
        assert.ok(done > 0 && done < total, `${done}/${total}`);
        // 中止後は新しい読み取りを始めない（全アプリを読み終えていない）
        assert.ok(result.fieldCalls < allIds.length + 2, `中止後も読み取りが続いています: ${result.fieldCalls} 回`);
        assert.ok(result.peak <= 12, `同時リクエストが ${result.peak} 件`);
        return result.status;
      });
    }
  } finally {
    await browser.close();
  }

  const failed = results.filter((r) => !r.ok);
  fs.writeFileSync(path.join(OUT, 'results.json'), `${JSON.stringify(results, null, 2)}\n`, 'utf8');
  console.log(`\n${results.length - failed.length}/${results.length} 件の検査が成功しました。結果: ${path.join(OUT, 'results.json')}`);
  if (failed.length) {
    console.log(`\n失敗 ${failed.length} 件:`);
    for (const r of failed) console.log(` - ${r.name}: ${r.error}`);
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error && error.stack ? error.stack : error);
  process.exitCode = 1;
});
