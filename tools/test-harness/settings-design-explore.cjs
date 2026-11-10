#!/usr/bin/env node
'use strict';

// 設定取得（tools/設定取得.js）と設計書作成（tools/設計書作成.js）の通し検証。
// 配布物をそのままページに読み込み、window.kintone.api と window.fetch を業務アプリに近い合成 kintone
// （settings-design-world.cjs: 顧客・案件・見積・受注・商品マスタなど 10 アプリ。ゲストスペース・一部セクションの取得失敗・
// プロセス管理が無効・フィールド 0・記号や改行を含む名前、プラグイン・JS/CSS を含む）に差し替えて、利用者と同じ操作で出力し、
// 出力されたファイル（JSON・ZIP・Markdown・AI向けMarkdown・Excel）の中身を確かめる。実際の kintone には通信しない。
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const { installSyntheticKintone } = require('./settings-design-synthetic.cjs');
const { buildWorld } = require('./settings-design-world.cjs');

const ROOT = path.resolve(__dirname, '../..');
const OUT = path.join(ROOT, '.iter-shots/settings-design-explore');
const SETTINGS_TOOL = path.join(ROOT, 'tools/設定取得.js');
const DESIGN_TOOL = path.join(ROOT, 'tools/設計書作成.js');

function printHelp() {
  console.log(`Usage: node tools/test-harness/settings-design-explore.cjs [options]

設定取得・設計書作成（配布物）を、業務アプリに近い合成 kintone につないで、出力ファイルの中身まで通しに検証します。
実際の kintone には通信しません。

Options:
  --browser <name>      chrome または chromium（既定: chrome）
  --executable <path>   ブラウザの実行ファイル（環境変数 KUS_PLAYWRIGHT_EXECUTABLE でも指定できます）
  --libs <dir>          jszip.min.js / xlsx.min.js を置いたディレクトリ（環境変数 KUS_HARNESS_LIBS でも指定できます）。
                        配布物が ZIP・Excel の部品を CDN から読み込む版のときだけ必要です（通信を遮断しているため）
  --skip-scale          50 アプリの規模・中止のシナリオを省きます
  --help                このヘルプを表示

日本語のダウンロード名を扱うため、ロケールが C/POSIX の環境では LANG=C.UTF-8 LC_ALL=C.UTF-8 を付けて実行してください。
画面・出力ファイル: .iter-shots/settings-design-explore/`);
}
const argValue = (name, fallback) => (process.argv.includes(name) ? process.argv[process.argv.indexOf(name) + 1] : fallback);

// ---------------------------------------------------------------------------
// 出力ファイルの読み取り（ZIP・xlsx。外部の部品に頼らず、Node の zlib だけで読む）
// ---------------------------------------------------------------------------
function readZip(buffer) {
  let eocd = -1;
  for (let i = buffer.length - 22; i >= 0; i -= 1) { if (buffer.readUInt32LE(i) === 0x06054b50) { eocd = i; break; } }
  assert.ok(eocd >= 0, 'ZIP の末尾が見つかりません');
  const count = buffer.readUInt16LE(eocd + 10);
  let offset = buffer.readUInt32LE(eocd + 16);
  const entries = new Map();
  for (let n = 0; n < count; n += 1) {
    assert.equal(buffer.readUInt32LE(offset), 0x02014b50, 'ZIP の中央ディレクトリが壊れています');
    const flags = buffer.readUInt16LE(offset + 8), method = buffer.readUInt16LE(offset + 10);
    const compressedSize = buffer.readUInt32LE(offset + 20);
    const nameLength = buffer.readUInt16LE(offset + 28), extraLength = buffer.readUInt16LE(offset + 30), commentLength = buffer.readUInt16LE(offset + 32);
    const localOffset = buffer.readUInt32LE(offset + 42);
    const name = buffer.subarray(offset + 46, offset + 46 + nameLength).toString(flags & 0x800 ? 'utf8' : 'utf8');
    const localNameLength = buffer.readUInt16LE(localOffset + 26), localExtraLength = buffer.readUInt16LE(localOffset + 28);
    const start = localOffset + 30 + localNameLength + localExtraLength;
    const raw = buffer.subarray(start, start + compressedSize);
    const data = method === 0 ? raw : zlib.inflateRawSync(raw);
    entries.set(name, data);
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}
const decodeXml = text => String(text).replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code))).replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16))).replace(/&amp;/g, '&');
/** xlsx（SheetJS の出力）を { シート名: 行の配列 } にする。セルは文字列。 */
function readXlsx(buffer) {
  const zip = readZip(buffer);
  const text = name => zip.get(name)?.toString('utf8') || '';
  const strings = [...text('xl/sharedStrings.xml').matchAll(/<si>([\s\S]*?)<\/si>/g)].map(match => decodeXml([...match[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map(part => part[1]).join('')));
  const workbook = text('xl/workbook.xml');
  const rels = text('xl/_rels/workbook.xml.rels');
  const sheets = {};
  for (const match of workbook.matchAll(/<sheet [^>]*name="([^"]*)"[^>]*r:id="([^"]*)"/g)) {
    const target = (rels.match(new RegExp(`<Relationship [^>]*Id="${match[2]}"[^>]*Target="([^"]*)"`)) || rels.match(new RegExp(`<Relationship [^>]*Target="([^"]*)"[^>]*Id="${match[2]}"`)) || [])[1];
    const xml = text(`xl/${String(target).replace(/^\/?(xl\/)?/, '')}`);
    const rows = [];
    for (const rowMatch of xml.matchAll(/<row [^>]*r="(\d+)"[^>]*>([\s\S]*?)<\/row>/g)) {
      const row = [];
      for (const cellMatch of rowMatch[2].matchAll(/<c ([^>/]*)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
        const ref = /r="([A-Z]+)\d+"/.exec(cellMatch[1])[1];
        const column = [...ref].reduce((sum, char) => sum * 26 + char.charCodeAt(0) - 64, 0) - 1;
        const type = (/t="([^"]*)"/.exec(cellMatch[1]) || [])[1];
        const body = cellMatch[2] || '';
        const value = (/<v(?: [^>]*)?>([\s\S]*?)<\/v>/.exec(body) || [])[1];
        let cell = '';
        if (type === 's') cell = strings[Number(value)] ?? '';
        else if (type === 'inlineStr') cell = decodeXml([...body.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map(part => part[1]).join(''));
        else if (value !== undefined) cell = decodeXml(value);
        row[column] = cell;
      }
      rows[Number(rowMatch[1]) - 1] = row;
    }
    sheets[decodeXml(match[1])] = rows.map(row => row || []);
  }
  return sheets;
}

// ---------------------------------------------------------------------------
// 検証の枠組み
// ---------------------------------------------------------------------------
const findings = [];
const checks = [];
const metrics = {};
function finding(id, severity, title, detail = {}) {
  if (findings.some(item => item.id === id)) return;
  findings.push({ id, severity, title, ...detail });
  console.log(`  [既知の問題 ${severity}] ${id}: ${title}`);
}
const ok = name => { checks.push(name); console.log(`  OK ${name}`); };
const ALL_IDS = '301, 302, 401, 402, 403, 601, 602, 603, 604';
const SECRETS = ['sk-live-EXAMPLE-SECRET-0001', 'SECRETSECRET', 'tok_live_SECRET_in_js_body'];
const hasSecret = text => SECRETS.filter(secret => String(text).includes(secret));
const hasPluginSecret = text => hasSecret(text).filter(secret => !secret.startsWith('tok_live'));

async function main() {
  if (process.argv.includes('--help')) { printHelp(); return; }
  for (const file of [SETTINGS_TOOL, DESIGN_TOOL]) if (!fs.existsSync(file)) throw new Error(`配布物が見つかりません: ${file}（npm run build で生成してください）`);
  const { chromium } = require('playwright');
  fs.mkdirSync(OUT, { recursive: true });
  const skipScale = process.argv.includes('--skip-scale');
  const browserName = argValue('--browser', 'chrome');
  const executablePath = argValue('--executable', process.env.KUS_PLAYWRIGHT_EXECUTABLE);
  const libsDir = argValue('--libs', process.env.KUS_HARNESS_LIBS || '');
  const libScripts = ['jszip.min.js', 'xlsx.min.js'].map(name => (libsDir && fs.existsSync(path.join(libsDir, name)) ? fs.readFileSync(path.join(libsDir, name), 'utf8') : '')).filter(Boolean);
  const needsLibs = [SETTINGS_TOOL, DESIGN_TOOL].some(file => /cdnjs\.cloudflare\.com\/ajax\/libs\/jszip|xlsx-js-style@/.test(fs.readFileSync(file, 'utf8')));
  if (needsLibs && libScripts.length < 2) throw new Error('この配布物は ZIP・Excel の部品を CDN から読み込みます。--libs <jszip.min.js と xlsx.min.js を置いたディレクトリ> を指定してください');
  const browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : browserName === 'chromium' ? {} : { channel: browserName }) });
  const world = buildWorld();

  /** ツールを新しいページで開く。合成 kintone を入れてから配布物を読み込む。 */
  async function openTool(toolFile, panelId, config = {}, { width = 1440, height = 1000 } = {}) {
    const context = await browser.newContext({ viewport: { width, height }, acceptDownloads: true });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(`console.error: ${message.text()}`); });
    await page.route('**/*', route => route.abort());
    await page.setContent('<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><body style="background:#e8edf3"></body></html>');
    await page.evaluate(installSyntheticKintone, { ...world, currentAppId: 401, ...config });
    for (const script of libScripts) await page.addScriptTag({ content: script });
    await page.addScriptTag({ content: fs.readFileSync(toolFile, 'utf8') });
    await page.waitForSelector(`#${panelId}`);
    const tool = {
      page, errors, context,
      button: name => page.getByRole('button', { name, exact: true }),
      idle: () => page.waitForFunction(id => document.querySelector(`#${id}`)?.getAttribute('aria-busy') !== 'true', panelId, { timeout: 300000 }),
      status: () => page.locator('.kus-lp__status-text').innerText(),
      stage: n => page.locator('.kus-wf-stage').nth(n),
      async chooseAction(name) {
        const radio = page.getByRole('radio', { name, exact: true });
        if (!(await radio.isVisible())) await page.locator('.kus-wf-action--more').click();
        await radio.check();
      },
      async setApps(text, extra = []) {
        const first = page.locator('.kus-lp__apptable input[aria-label="アプリID"]').first();
        await first.fill(text); await first.dispatchEvent('change');
        for (const [app, guest] of extra) {
          await tool.button('＋ 行を追加').click();
          const rows = page.locator('.kus-lp__apptable tbody tr');
          const last = rows.nth((await rows.count()) - 1);
          await last.locator('input[aria-label="アプリID"]').fill(app);
          await last.locator('input[aria-label="ゲストスペースID"]').fill(guest);
        }
      },
      /** 操作を選び、内容を確認して実行する。完了まで待ち、ステータスを返す。 */
      async run(action, { dialog = false, before } = {}) {
        await tool.chooseAction(action);
        if (before) await before();
        await tool.button('内容を確認する').click();
        const confirm = await tool.stage(1).innerText();
        await tool.button(action).click();
        if (dialog) { await page.waitForTimeout(300); await tool.button('エクスポート').click(); }
        await tool.idle();
        const status = await tool.status();
        await tool.button('対象・条件を変更').click();
        return { status, confirm };
      },
      async files() {
        const raw = await page.evaluate(async () => Promise.all(window.__k.downloads.map(async download => ({ name: download.name, b64: await new Promise(resolve => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).split(',')[1]); reader.readAsDataURL(download.blob); }) }))));
        return raw.map(item => ({ name: item.name, buffer: Buffer.from(item.b64, 'base64') }));
      },
      async clearFiles() { await page.evaluate(() => { window.__k.downloads.length = 0; }); },
      violations: () => page.evaluate(() => window.__k.violations),
      calls: () => page.evaluate(() => window.__k.calls.map(call => `${call.method} ${call.url}`)),
      shot: name => page.screenshot({ path: path.join(OUT, `${name}.png`) }),
      close: () => context.close()
    };
    return tool;
  }
  const zipText = (zip, name) => zip.get([...zip.keys()].find(key => key === name || key.endsWith(`/${name}`)))?.toString('utf8');
  const jsonEntries = zip => [...zip.keys()].filter(key => key.endsWith('.json') && key !== 'manifest.json' && key !== '_manifest.json');

  console.log('== 設定取得 ==');
  const settings = await openTool(SETTINGS_TOOL, 'kus-settings-export-lite');
  await settings.setApps(ALL_IDS, [['501', '7']]);
  await settings.shot('settings-target');
  // ---- 既定の確認画面: 機微な値を含むことを示す ----
  await settings.chooseAction('設定とJS/CSSファイルをZIPで保存');
  await settings.button('内容を確認する').click();
  const confirmText = await settings.stage(1).innerText();
  assert.match(confirmText, /プラグインの設定値\s*含める（API キーなどの機微な値を含む場合があります）/, '確認画面: プラグインの設定値を含めることを示す');
  assert.match(confirmText, /JS\/CSSファイルの本文\s*JSON に含める（API トークンなどが書かれている場合があります）/, '確認画面: JS/CSS の本文が JSON に入ることを示す');
  assert.match(confirmText, /#501（ゲスト 7） · 本番/, '確認画面: ゲストスペースを示す');
  ok('設定取得: 既定の確認画面に、プラグインの設定値・JS/CSS本文を含むことを示す');
  await settings.button('設定とJS/CSSファイルをZIPで保存').click();
  await settings.idle();
  let status = await settings.status();
  assert.match(status, /設定一括取得ZIPを保存しました（10アプリ・JS\/CSSファイル 8件）/);
  assert.match(status, /2アプリ・4セクションの取得に失敗しています/, '取得失敗は件数で示す');
  assert.match(status, /JS\/CSSファイル 1件は取得できませんでした/);
  await settings.shot('settings-zip-result');
  const resultText = await settings.page.locator('.kus-lp__panel-html').innerText();
  assert.match(resultText, /プラグインの設定値を含みます/, '結果表: 設定値を含むことを示す');
  assert.match(resultText, /取得NG[\s\S]*601[\s\S]*一部セクション取得失敗あり: ビュー設定、フィールド権限、リマインダー通知/, '結果表: 取得失敗のセクションを示す');
  const zipFile = (await settings.files()).find(file => file.name.endsWith('.zip'));
  const settingsZip = readZip(zipFile.buffer);
  const manifest = JSON.parse(zipText(settingsZip, 'manifest.json'));
  assert.equal(manifest.appCount, 10); assert.equal(manifest.failedAppCount, 2); assert.equal(manifest.environment, 'production'); assert.equal(manifest.pluginConfig, 'included');
  assert.deepEqual(manifest.guestIds, ['7']);
  const app402 = manifest.apps.find(app => app.appId === '402');
  assert.deepEqual(app402.failedSections.map(section => section.key), ['customizeSettings']);
  assert.equal(app402.customizeFiles.failed, 1, 'JS/CSS: 取得できなかったファイルを manifest に残す');
  const app601 = manifest.apps.find(app => app.appId === '601');
  assert.deepEqual(app601.failedSections.map(section => section.key).sort(), ['fieldAcl', 'reminderNotifications', 'viewSettings']);
  assert.equal(app601.sections.ng, 3);
  assert.equal(manifest.apps.find(app => app.appId === '501').guestId, '7');
  ok('設定取得: manifest に件数・環境・ゲストスペース・取得失敗のセクション・JS/CSSファイルの失敗を残す');
  const index = zipText(settingsZip, 'INDEX.md');
  assert.match(index, /プラグインの設定値: プラグインの設定値を含みます（API キーなどの機微な値を含む場合があります）。共有する前に内容を確認してください/);
  assert.match(index, /JS\/CSSファイルの本文: 各アプリの JSON に含みます/);
  assert.match(index, /\| 601 \| 取得に一部失敗するアプリ \|[^\n]*取得失敗: ビュー設定、フィールド権限、リマインダー通知/);
  assert.match(index, /\| 501 \| 営業日報（ゲスト） \| guest:7 \|/);
  ok('設定取得: INDEX.md に機微な値の注意・取得失敗・ゲストスペースを書く');
  const jsFolder = [...settingsZip.keys()].filter(key => key.startsWith('案件管理(app401)_本番_JS_CSS/') && !key.endsWith('/'));
  assert.deepEqual(jsFolder.sort(), ['案件管理(app401)_本番_JS_CSS/desktop/css/style.css', '案件管理(app401)_本番_JS_CSS/desktop/js/board_main.js', '案件管理(app401)_本番_JS_CSS/desktop/js/core.js', '案件管理(app401)_本番_JS_CSS/desktop/js/core_2.js', '案件管理(app401)_本番_JS_CSS/mobile/js/mobile.js'].sort(), 'JS/CSS: PC/モバイル・JS/CSS 別のフォルダ。同名は _2 を付けて残す。URL 指定は含まない');
  assert.ok(settingsZip.get('案件管理(app401)_本番_JS_CSS/desktop/js/core.js').toString('utf8').includes('tok_live_SECRET_in_js_body'), 'JS/CSS: ファイル本体が取得元と同じ内容');
  ok('設定取得: JS/CSS ファイルをフォルダ分けして保存（同名は別名、URL 指定は含まない）');
  const bundle401 = JSON.parse(zipText(settingsZip, '案件管理(app401)_本番.json'));
  assert.deepEqual(bundle401.sections.pluginSettings.plugins.map(plugin => [plugin.id.slice(0, 6), plugin.enabled, !!plugin._config]), [['abcdef', true, true], ['qrstuv', true, true], ['plugin', false, true]], 'プラグイン: 一覧（ID・有効状態）と設定値を含む');
  assert.ok(bundle401.sections.customizeSettings.desktop.js.find(item => item.file?.name === 'core.js')._bodyText.includes('API_TOKEN'), 'JS/CSS 本文も JSON に入る（確認画面で示している）');
  assert.deepEqual(Object.keys(JSON.parse(zipText(settingsZip, '長い名前'.length ? [...settingsZip.keys()].find(key => key.includes('(app604)_本番.json')) : '')).sections.fieldSettings.properties).slice(0, 3), ['code_a', 'code_b', 'code_c'], '名前に記号・改行があっても設定は壊れない');
  assert.equal(JSON.parse(zipText(settingsZip, '取得に一部失敗するアプリ(app601)_本番.json')).sections.viewSettings._fetchError.split('\n')[0], '権限がありません。一覧の設定を取得できません。', '取得失敗は「0 件」にせず、理由を残す');
  assert.ok([...settingsZip.keys()].every(key => !/[<>:"|?*\\]/.test(key.replace(/\/$/, ''))), 'ZIP 内のファイル名に使えない文字を含まない');
  ok('設定取得: JSON の中身（プラグイン・JS/CSS 本文・取得失敗の理由・長い名前）');

  // ---- プラグインの設定値を含めない ----
  await settings.clearFiles();
  await settings.button('対象・条件を変更').click();
  await settings.button('詳細設定…').click();
  const excludeBox = settings.page.getByRole('checkbox', { name: 'プラグインの設定値を含めない', exact: true });
  assert.equal(await excludeBox.isChecked(), false, '既定は従来どおり含める');
  assert.match(await settings.page.locator('dialog[open]').textContent(), /機微な値の扱い[\s\S]*プラグインの設定値には API キーなどが含まれる場合があります[\s\S]*JS\/CSS設定を取得すると、ファイルの本文も保存します/, '詳細設定: 機微な値の注意');
  await excludeBox.focus(); await settings.page.keyboard.press('Space');
  assert.equal(await excludeBox.isChecked(), true, 'キーボードだけで切り替えられる');
  await settings.shot('settings-advanced-sensitive');
  await settings.page.getByRole('button', { name: '詳細設定を閉じる', exact: true }).click();
  const omitted = await settings.run('設定をJSONで保存');
  assert.match(omitted.confirm, /プラグインの設定値\s*含めない（プラグインの一覧だけを保存）/, '確認画面: 含めないことを示す');
  assert.match(omitted.status, /設定一括取得JSONを保存しました（10アプリ）[\s\S]*プラグインの設定値は含めていません/);
  const omittedJson = JSON.parse((await settings.files())[0].buffer.toString('utf8'));
  assert.equal(omittedJson.pluginConfig, 'omitted');
  assert.deepEqual(hasSecret(JSON.stringify(omittedJson.apps.map(app => app.sections.pluginSettings))), [], 'プラグインの設定値が入らない');
  const omittedPlugins = omittedJson.apps.find(app => app.appId === '401').sections.pluginSettings;
  assert.deepEqual(omittedPlugins.plugins.map(plugin => [plugin.name, plugin.enabled]), [['カレンダー拡張プラグイン', true], ['チャット通知（Webhook）', true], ['一括更新ツール', false]], '一覧（ID・名前・有効状態）は残る');
  assert.equal(omittedPlugins._partial.kind, 'pluginConfigOmitted');
  assert.equal(omittedJson.failedAppCount, 2, '含めない選択は取得失敗に数えない（取得失敗は従来どおり 2 アプリ）');
  assert.equal(omittedJson.summary.find(app => app.appId === '401').omittedPluginConfigs, 3);
  ok('設定取得: プラグインの設定値を含めない選択（確認画面・出力・manifest・取得失敗に数えない）');
  const pluginConfigCallsBefore = await settings.page.evaluate(() => window.__k.calls.filter(call => /plugin\/config\.json/.test(call.url)).length);
  await settings.clearFiles();
  const zipOmitted = await settings.run('設定をZIPで保存');
  const omittedZip = readZip((await settings.files()).find(file => file.name.endsWith('.zip')).buffer);
  assert.equal(JSON.parse(zipText(omittedZip, 'manifest.json')).pluginConfig, 'omitted');
  assert.match(zipText(omittedZip, 'INDEX.md'), /プラグインの設定値: プラグインの設定値は含めていません（プラグインの一覧だけを保存）/);
  assert.match(zipText(omittedZip, 'INDEX.md'), /プラグインの設定値は含めず 3件/);
  assert.equal(await settings.page.evaluate(() => window.__k.calls.filter(call => /plugin\/config\.json/.test(call.url)).length), pluginConfigCallsBefore, '設定値を含めないときは、プラグインの設定値を取得しない');
  assert.deepEqual(hasPluginSecret([...omittedZip.values()].map(buffer => buffer.toString('utf8')).join('\n')), []);
  assert.ok(zipOmitted.status.includes('2アプリ・4セクションの取得に失敗しています') || zipOmitted.status.includes('2アプリ・3セクションの取得に失敗しています'));
  ok('設定取得: ZIP にも、含めないことを manifest・INDEX.md に記録');
  assert.deepEqual(await settings.violations(), [], '書き込みを送らない');
  assert.deepEqual(settings.errors, []);
  const settingsJsonAll = omittedJson;
  await settings.close();

  // 取得した設定 JSON（全アプリ・含める）を、設計書の「設定JSON読込」へ
  const settingsFull = await openTool(SETTINGS_TOOL, 'kus-settings-export-lite');
  await settingsFull.setApps(ALL_IDS, [['501', '7']]);
  await settingsFull.run('設定をJSONで保存');
  const fullJsonFile = (await settingsFull.files())[0];
  await settingsFull.close();

  console.log('== 設計書（kintone から取得） ==');
  const design = await openTool(DESIGN_TOOL, 'kus-design-lite');
  // 1 行目（401）が単一出力の対象、全行が ZIP の対象
  await design.setApps('401, 301, 302, 402, 403, 601, 602, 603, 604', [['501', '7']]);
  const md = await design.run('Markdown設計書を保存');
  assert.match(md.status, /設計書出力完了（App 401）$/, '取得失敗が無ければ注記を付けない');
  const aiMd = await design.run('AI向けMarkdownを保存');
  assert.match(aiMd.status, /AI向けMarkdown出力完了（App 401）（原文取得。JS\/CSS本文・プラグイン個別設定の補助取得なし）/);
  const jsonOut = await design.run('設計書JSONを保存');
  const xlsxOut = await design.run('Excel設計書を保存', { dialog: true });
  assert.match(xlsxOut.status, /設計書Excel出力完了/);
  const single = await design.files();
  const mdText = single.find(file => file.name.startsWith('設計書_案件管理') && file.name.endsWith('.md')).buffer.toString('utf8');
  const aiText = single.find(file => file.name.startsWith('設計書_AI向けMarkdown_') && file.name.endsWith('.md')).buffer.toString('utf8');
  const jsonText = single.find(file => file.name.startsWith('設計書_案件管理') && file.name.endsWith('.json')).buffer.toString('utf8');
  const xlsxFile = single.find(file => file.name.endsWith('.xlsx'));
  assert.deepEqual(hasSecret(mdText), [], 'Markdown の原文 JSON にも、プラグインの設定値・JS/CSS 本文を載せない');
  assert.deepEqual(hasSecret(aiText), [], 'AI向けMarkdown にも載せない');
  assert.deepEqual(hasSecret(jsonText).length > 0, true, '設計書JSON は設定の写しとして従来どおり含める（設定取得の JSON と同じ）');
  ok('設計書: Markdown・AI向けMarkdown にプラグインの設定値・JS/CSS 本文を載せない');
  // ---- Markdown 設計書の内容（Excel・取得状態と一致するか） ----
  const mdRow = (text, key) => text.split('\n').find(line => line.startsWith('| ') && line.includes(`| ${key} |`));
  const statusPart = mdText.slice(mdText.indexOf('## 取得状態'), mdText.indexOf('## 目次'));
  const outputPart = mdText.slice(mdText.indexOf('## 出力セクション'), mdText.indexOf('## アプリ設定'));
  for (const key of ['customizeSettings', 'categories', 'layoutSettings', 'pluginSettings', 'fieldSettings', 'processSettings']) {
    const statusCount = mdRow(statusPart, key).split('|')[4].trim();
    assert.equal(mdRow(outputPart, key).split('|')[3].trim(), statusCount === '不明' ? '-' : statusCount, `Markdown: 出力セクションの件数が取得状態と同じ（${key}）`);
  }
  assert.match(mdText, /\| ルックアップ数 \| 2 \|/, 'Markdown: ルックアップ数はテーブル内を含み、Excel と同じ');
  assert.match(mdText, /\| plugin3plugin3plugin3plugin3plugin3 \| 一括更新ツール \| 無効 \|/, 'Markdown: プラグインの有効状態');
  assert.match(mdText, /\| 承認待ち \| 3 \| 候補の誰でも（先着） \|/, 'Markdown: 作業者の選び方 ANY');
  assert.match(mdText, /\| 月別受注 \| 折れ線グラフ \| 通常 \| close_date（月） \| 合計（weighted） \/ 件数 \|/, 'Markdown: グラフの分類の期間と件数');
  assert.match(mdText, /日付: `close_date` \/ タイトル: `deal_title`/, 'Markdown: カレンダー一覧の日付・タイトル');
  assert.match(mdText, /- グループ: `grp_basic` — 案件情報/, 'Markdown: レイアウトのグループ名');
  assert.match(mdText, /#### テーブル: `tasks`\n/, 'Markdown: 名前の無いテーブル見出しに「 — 」を付けない');
  assert.match(mdText, /転記 2項目（`customer_name` ← `customer_name`、`cust_rank` ← `rank`）/, 'Markdown: ルックアップのコピー項目');
  assert.match(mdText, /`customer_code` → `customer_code`<br>`deal_title` → `quote_subject`<br>レコードのURL → `deal_url`/, 'Markdown: アクションのコピー項目');
  ok('設計書 Markdown: 件数が取得状態・Excel と一致、プラグイン有効状態、ANY、グラフの期間と件数、カレンダー、グループ名、コピー項目');
  const sheets = readXlsx(xlsxFile.buffer);
  const defRows = sheets['項目定義'];
  assert.equal(defRows.find(row => row[3] === 'grp_basic')[2], '案件情報', '項目定義: グループの名前（コードでなく表示名）');
  assert.equal(defRows.find(row => row[3] === 'deal_title')[1], '案件情報', '項目定義: 所属グループは表示名');
  assert.match(String(defRows.find(row => row[3] === 'customer_code')[14]), /参照アプリ: 顧客マスタ/, 'ルックアップ: 参照先アプリ名');
  assert.match(defRows.find(row => row[3] === 'customer_code')[14], /customer_name ← customer_name[\s\S]*cust_rank ← rank/, 'ルックアップ: コピー項目');
  assert.match(defRows.find(row => row[3] === 'quotes')[15], /参照アプリ: 見積管理[\s\S]*条件: customer_code = customer_code[\s\S]*表示フィールド: quote_no, quote_total, valid_until/, '関連レコード一覧: 参照先アプリ名・条件・表示フィールド');
  assert.match(defRows.find(row => row[3] === 'task_product')[14], /参照アプリ: 商品マスタ/, 'テーブル内のルックアップ');
  assert.equal(defRows.filter(row => /^\d+$/.test(String(row[0]))).length, 83, '項目定義: 取りこぼし無し（システム項目を除く 78 + テーブル内 7 - ステータス系 2）');
  assert.match(sheets['アクション'][2][4], /customer_code→customer_code[\s\S]*deal_title→quote_subject[\s\S]*レコードのURL→deal_url/, 'アクション: コピー元→コピー先');
  assert.match(sheets['アクション'][2][2], /見積管理\(ID:402\)/, 'アクション: 実行先アプリ名');
  assert.deepEqual(sheets['プラグイン'].slice(2).map(row => row[2]), ['有効', '有効', '無効'], 'プラグイン: 有効状態');
  assert.match(sheets['プロセス管理'].map(row => row.join('|')).join('\n'), /承認待ち\|候補の誰でも（先着）\|/, 'プロセス: ANY の作業者の選び方を日本語にする');
  ok('設計書 Excel: 項目定義（グループ名・ルックアップのコピー項目・関連レコード一覧・テーブル内）、アクション、プラグイン、プロセス');
  const summaryRows = sheets['サマリー'].map(row => `${row[0]}|${row[1]}`);
  assert.ok(summaryRows.includes('プラグイン数|3') && summaryRows.includes('ステータス数|6') && summaryRows.includes('JS/CSSカスタマイズ件数|7'));
  await design.shot('design-single');
  // ---- 複数アプリの ZIP（kintone から取得） ----
  await design.clearFiles();
  const mdZip = await design.run('全対象をMarkdown ZIPで保存');
  assert.match(mdZip.status, /一部セクション未取得・失敗あり 1件/, 'Markdown ZIP: 取得失敗のあるアプリは 601 だけ（402 の JS/CSS 本文は使わないので失敗にしない）');
  const zips = await design.files();
  const mdZipEntries = readZip(zips[0].buffer);
  const overview = zipText(mdZipEntries, 'overview.md');
  assert.match(overview, /対象アプリ数: 10件（成功 10 \/ 失敗 0）/);
  assert.match(overview, /\| 601 \| 取得に一部失敗するアプリ \| \(通常空間\) \| API \| 一部未取得・失敗あり \|[^\n]*取得失敗: ビュー設定, フィールド権限, リマインダー通知/);
  assert.match(overview, /\| 402 \| 見積管理 \| \(通常空間\) \| API \| 成功 \|/, 'JS/CSS 本文を使わない Markdown では、本文の取得失敗を取得失敗にしない');
  const mdManifest = JSON.parse(zipText(mdZipEntries, '_manifest.json'));
  assert.equal(mdManifest.successCount, 10);
  const app601Md = [...mdZipEntries.keys()].find(key => key.includes('(app601)'));
  const app601Text = mdZipEntries.get(app601Md).toString('utf8');
  assert.match(app601Text, /ビュー設定 \| viewSettings \| fetch-error/, '個別の設計書にも取得失敗を残す（0 件にしない）');
  assert.match(app601Text, /> ⚠ 取得できませんでした: 権限がありません。一覧の設定を取得できません。/);
  ok('設計書 Markdown ZIP: 取得失敗を overview・manifest・個別の設計書に残し、使わない補助情報の失敗は失敗にしない');
  await design.clearFiles();
  await design.run('全対象をExcel ZIPで保存', { dialog: true });
  const xlsxZip = readZip((await design.files())[0].buffer);
  const xlsxManifest = JSON.parse(zipText(xlsxZip, '_manifest.json'));
  assert.equal(xlsxManifest.successCount, 10); assert.equal(xlsxManifest.environment, 'production'); assert.equal(xlsxManifest.preview, false);
  assert.deepEqual(xlsxManifest.failedApis.map(item => `${item.app}:${item.name}`).sort(), ['App 601:ビュー設定', 'App 601:フィールド権限', 'App 601:リマインダー通知'].sort(), 'Excel ZIP: 取得に失敗した項目を記録（Markdown の取得失敗と同じ 3 件）');
  const xl601 = readXlsx(xlsxZip.get([...xlsxZip.keys()].find(key => key.includes('(app601)'))));
  assert.deepEqual(xl601['取得状況'].filter(row => row[1] === '取得失敗').map(row => row[0]), ['ビュー設定', 'フィールド権限', 'リマインダー通知'], 'Excel の取得状況シート: Markdown と同じセクション');
  const xl603 = readXlsx(xlsxZip.get([...xlsxZip.keys()].find(key => key.includes('(app603)'))));
  assert.equal(xl603['項目定義'].filter(row => /^\d+$/.test(String(row[0]))).length, 0, 'フィールド 0 のアプリでも出力できる');
  ok('設計書 Excel ZIP: 取得失敗の記録が Markdown と一致、フィールド 0 のアプリも出力');
  assert.deepEqual(await design.violations(), []);
  // 取得環境（プレビュー）: Excel ZIP もプレビューから取得し、ZIP の名前と manifest に残す
  await design.clearFiles();
  await design.page.evaluate(() => { window.__k.calls.length = 0; });
  const previewBox = design.page.getByRole('checkbox', { name: 'プレビュー環境から取得', exact: true });
  await previewBox.check();
  const previewRun = await design.run('全対象をExcel ZIPで保存', { dialog: true });
  assert.match(previewRun.confirm, /取得環境\s*プレビューから取得します/, '確認画面: Excel ZIP もプレビューから取得すると示す');
  const previewFiles = await design.files();
  assert.match(previewFiles[0].name, /^kintone設計書_\d+件_プレビュー_/, 'ZIP の名前にプレビューを示す');
  const previewManifest = JSON.parse(zipText(readZip(previewFiles[0].buffer), '_manifest.json'));
  assert.equal(previewManifest.environment, 'preview');
  const previewCalls = await design.calls();
  assert.ok(previewCalls.some(call => call.includes('/preview/app/form/fields.json')) && !previewCalls.some(call => /\/k\/v1\/app\/form\/fields\.json/.test(call) && !call.includes('/preview/')), 'Excel ZIP: フィールドなどはプレビューから取得');
  ok('設計書 Excel ZIP: 「プレビュー環境から取得」に従い、確認画面・ZIP の名前・manifest に環境を示す');
  await previewBox.uncheck();
  assert.deepEqual(design.errors, []);
  await design.close();

  console.log('== 設定JSON読込（往復） ==');
  const roundtrip = await openTool(DESIGN_TOOL, 'kus-design-lite');
  await roundtrip.page.evaluate(() => { window.__k.rejectAll = true; });
  await roundtrip.button('詳細設定…').click();
  await roundtrip.page.locator('input.kus-lp__file').setInputFiles({ name: fullJsonFile.name, mimeType: 'application/json', buffer: fullJsonFile.buffer });
  await roundtrip.page.waitForTimeout(600);
  assert.match(await roundtrip.status(), /10件のアプリ設定を読み込みました（対象アプリ表に新規追加 9件）。読み込んだアプリは kintone から取得しません/, '設定取得の JSON をそのまま読み込める');
  await roundtrip.page.getByRole('button', { name: '詳細設定を閉じる', exact: true }).click();
  await roundtrip.run('全対象をMarkdown ZIPで保存');
  await roundtrip.run('全対象をAI向けMarkdown ZIPで保存');
  await roundtrip.run('全対象をExcel ZIPで保存', { dialog: true });
  const rtFiles = await roundtrip.files();
  const rtMdZip = readZip(rtFiles[0].buffer), rtAiZip = readZip(rtFiles[1].buffer), rtXlsxZip = readZip(rtFiles[2].buffer);
  assert.equal((await roundtrip.calls()).length, 0, '読み込んだアプリは kintone から取得しない');
  assert.match(zipText(rtMdZip, 'overview.md'), /\| 501 \| 営業日報（ゲスト） \| 7 \| 設定JSON \| 成功 \|/);
  assert.match(zipText(rtMdZip, 'overview.md'), /\| 402 \| 見積管理 \| \(通常空間\) \| 設定JSON \| 一部未取得・失敗あり \|[^\n]*取得失敗: JS\/CSS設定/, '設定JSONの取得失敗は設計書にも残る（設定取得の結果表と同じ）');
  assert.deepEqual(hasSecret([...rtMdZip.values(), ...rtAiZip.values()].map(buffer => buffer.toString('utf8')).join('\n')), [], '設定JSON由来でも、Markdown・AI向けMarkdown にプラグインの設定値・JS/CSS 本文を載せない');
  const rtAi401 = rtAiZip.get([...rtAiZip.keys()].find(key => key.includes('(app401)'))).toString('utf8');
  assert.match(rtAi401, /## 除外した補助情報[\s\S]*プラグインの設定値（3件）、JS\/CSSファイルの本文（5件）/, 'AI向けMarkdown: 除いたことを書く');
  const mdZipNames = [...rtMdZip.keys()].filter(key => key.endsWith('.md') && key !== 'overview.md').map(key => key.replace(/^設計書_|\.md$/g, '')).sort();
  const liveNames = [...mdZipEntries.keys()].filter(key => key.endsWith('.md') && key !== 'overview.md').map(key => key.replace(/^設計書_|\.md$/g, '')).sort();
  assert.deepEqual(mdZipNames, liveNames, 'アプリ名・ID・ゲストの表記が、取得した設計書と設定JSONから作った設計書で同じ');
  const rt401 = readXlsx(rtXlsxZip.get([...rtXlsxZip.keys()].find(key => key.includes('(app401)'))));
  assert.equal(rt401['項目定義'].find(row => row[3] === 'grp_basic')[2], '案件情報');
  assert.deepEqual(rt401['プラグイン'].slice(2).map(row => row[2]), ['有効', '有効', '無効']);
  const countsOf = sheetsOf => ['プラグイン数', 'ステータス数', 'JS/CSSカスタマイズ件数', 'ビュー数', 'グラフ数'].map(label => sheetsOf['サマリー'].find(row => row[0] === label)?.[1]);
  assert.deepEqual(countsOf(rt401), countsOf(xl601 && readXlsx(xlsxZip.get([...xlsxZip.keys()].find(key => key.includes('(app401)'))))), '件数が、取得した設計書と設定JSONから作った設計書で同じ');
  ok('往復: 設定取得の JSON を設計書へ読み込み、Markdown・AI向け・Excel の件数・名前・取得失敗が取得した設計書と一致する');
  // プラグインの設定値を含めない JSON も、そのまま読み込める
  await roundtrip.page.getByRole('button', { name: '詳細設定…', exact: true }).click();
  await roundtrip.page.locator('input.kus-lp__file').setInputFiles({ name: 'omitted.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(settingsJsonAll)) });
  await roundtrip.page.waitForTimeout(600);
  assert.match(await roundtrip.status(), /10件のアプリ設定を読み込みました/);
  await roundtrip.page.getByRole('button', { name: '詳細設定を閉じる', exact: true }).click();
  await roundtrip.clearFiles();
  const rtOmitted = await roundtrip.run('全対象をExcel ZIPで保存', { dialog: true });
  assert.doesNotMatch(rtOmitted.status, /プラグイン/, '設定値を含めない JSON は、設計書で部分取得や失敗として扱わない');
  const rtOmittedXlsx = readXlsx(readZip((await roundtrip.files())[0].buffer).get([...readZip((await roundtrip.files())[0].buffer).keys()].find(key => key.includes('(app401)'))));
  assert.deepEqual(rtOmittedXlsx['プラグイン'].slice(2).map(row => row[2]), ['有効', '有効', '無効']);
  ok('往復: プラグインの設定値を含めない JSON も設計書へ読み込める（一覧・有効状態は残り、部分取得にならない）');
  // 設計書の差分レポート（本番とプレビューの設定JSON）
  const prodBundle = JSON.parse(fullJsonFile.buffer.toString('utf8')).apps.find(app => app.appId === '401');
  const previewBundle = JSON.parse(JSON.stringify(prodBundle));
  previewBundle.preview = true;
  previewBundle.sections.appSettings.name = '案件管理（プレビュー）';
  previewBundle.sections.fieldSettings.properties.preview_only_field = { type: 'SINGLE_LINE_TEXT', code: 'preview_only_field', label: 'プレビューだけの項目', required: false };
  assert.deepEqual(await roundtrip.violations(), []);
  assert.deepEqual(roundtrip.errors, []);
  await roundtrip.close();
  const dt = await openTool(DESIGN_TOOL, 'kus-design-lite');
  await dt.page.evaluate(() => { window.__k.rejectAll = true; });
  await dt.button('詳細設定…').click();
  await dt.page.locator('input.kus-lp__file').setInputFiles({ name: 'diff.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ source: previewBundle, target: prodBundle })) });
  await dt.page.waitForTimeout(600);
  await dt.page.getByRole('button', { name: '詳細設定を閉じる', exact: true }).click();
  await dt.clearFiles();
  const diffRun = await dt.run('2アプリの設計差分を保存');
  assert.match(diffRun.status, /設計書差分レポートを出力しました/);
  const report = (await dt.files())[0].buffer.toString('utf8');
  assert.match(report, /\| 生成日時 \| \d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} \|/, '生成日時は読める形');
  assert.match(report, /\| 差分行数 \| 追加 \d+ 行 \/ 削除 \d+ 行 \|/);
  assert.match(report, /^\+ \| preview_only_field \| プレビューだけの項目 \|/m, '追加したフィールドが差分に出る');
  assert.match(report, /^@@ フィールド設定（省略 \d+ 行）@@$/m, '変更の前後だけを残し、区切りにセクション名を出す');
  assert.ok(report.split('\n').length < 150, `業務アプリ規模でも、差分レポートが変更の前後だけになる（${report.split('\n').length} 行。全文は 2000 行超）`);
  ok('設計書の差分レポート: 変更の前後だけを残し、セクション名で区切る（業務アプリ規模）');
  assert.deepEqual(await dt.violations(), []);
  assert.deepEqual(dt.errors, []);
  await dt.close();

  console.log('== 画面（320〜1440px・キーボード） ==');
  for (const [toolFile, panelId, name] of [[SETTINGS_TOOL, 'kus-settings-export-lite', 'settings'], [DESIGN_TOOL, 'kus-design-lite', 'design']]) {
    for (const width of [320, 390, 768, 1024, 1440]) {
      const tool = await openTool(toolFile, panelId, {}, { width, height: 900 });
      await tool.setApps('401');
      const overflow = async () => tool.page.evaluate(() => {
        const panel = document.querySelector('.kus-lp');
        const rect = panel.getBoundingClientRect();
        const wide = [...panel.querySelectorAll('*')].filter(node => { const r = node.getBoundingClientRect(); return r.width > 0 && r.right > Math.min(window.innerWidth, rect.right) + 1 && getComputedStyle(node).position !== 'fixed' && !node.closest('.kus-lp__apptable-scroll, .kus-lp__panel-html'); }).slice(0, 3).map(node => node.className || node.tagName);
        return { scrollWidth: document.documentElement.scrollWidth, innerWidth: window.innerWidth, panelRight: Math.round(rect.right), wide };
      });
      let measured = await overflow();
      assert.ok(measured.scrollWidth <= measured.innerWidth + 1 && measured.wide.length === 0, `${name} ${width}px: 横にはみ出さない ${JSON.stringify(measured)}`);
      if (name === 'settings') {
        await tool.button('詳細設定…').click();
        measured = await tool.page.evaluate(() => { const dialog = document.querySelector('dialog[open]'); const r = dialog.getBoundingClientRect(); return { left: Math.round(r.left), right: Math.round(r.right), width: window.innerWidth, scroll: dialog.scrollWidth - dialog.clientWidth }; });
        assert.ok(measured.left >= 0 && measured.right <= measured.width + 1 && measured.scroll <= 1, `settings ${width}px: 詳細設定のポップアップがはみ出さない ${JSON.stringify(measured)}`);
        if (width === 320 || width === 1440) await tool.shot(`settings-advanced-${width}`);
      } else if (width === 320 || width === 1440) await tool.shot(`design-${width}`);
      await tool.close();
    }
  }
  ok('設定取得・設計書: 320 / 390 / 768 / 1024 / 1440px で横にはみ出さない（詳細設定のポップアップを含む）');

  if (!skipScale) {
    console.log('== 規模（50 アプリ）と中止 ==');
    const bulkWorld = buildWorld({ bulk: 50 });
    const ids = Array.from({ length: 50 }, (_, index) => String(1000 + index)).join(', ');
    const heap = page => page.evaluate(() => (performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : -1));
    const big = await openTool(SETTINGS_TOOL, 'kus-settings-export-lite', { ...bulkWorld, latency: 5 });
    await big.setApps(ids);
    let started = Date.now();
    const bigRun = await big.run('設定をZIPで保存');
    metrics.settingsZip50 = { ms: Date.now() - started, heapMB: await heap(big.page) };
    assert.match(bigRun.status, /設定一括取得ZIPを保存しました（50アプリ）/);
    assert.ok(metrics.settingsZip50.ms < 60000);
    await big.clearFiles();
    await big.page.evaluate(() => { window.__k.latency = 60; });
    await big.chooseAction('設定をJSONで保存');
    await big.button('内容を確認する').click();
    await big.button('設定をJSONで保存').click();
    await big.page.waitForTimeout(1500);
    await big.page.getByRole('button', { name: '処理を中止', exact: true }).click();
    await big.idle();
    const cancelled = await big.status();
    assert.match(cancelled, /^中止しました（\d+\/50 件を処理、残り \d+ 件は未実行）。取得済みの \d+アプリだけを保存しました/, '中止: 処理済み・未実行の件数と、保存した範囲を示す');
    const cancelFiles = await big.files();
    assert.equal(cancelFiles.length, 1);
    assert.equal(JSON.parse(cancelFiles[0].buffer.toString('utf8')).cancelled, true, '中止したことを JSON に残す');
    assert.deepEqual(await big.violations(), []);
    await big.close();
    ok(`設定取得 50 アプリ: ZIP ${metrics.settingsZip50.ms}ms（ヒープ ${metrics.settingsZip50.heapMB}MB）、中止で取得済みだけを保存`);
    const bigDesign = await openTool(DESIGN_TOOL, 'kus-design-lite', { ...bulkWorld, latency: 5 });
    await bigDesign.setApps(ids);
    started = Date.now();
    const bigXlsx = await bigDesign.run('全対象をExcel ZIPで保存', { dialog: true });
    metrics.designXlsxZip50 = { ms: Date.now() - started, heapMB: await heap(bigDesign.page) };
    assert.match(bigXlsx.status, /設計書ZIP出力完了（50件）/);
    started = Date.now();
    await bigDesign.run('全対象をMarkdown ZIPで保存');
    metrics.designMdZip50 = { ms: Date.now() - started, heapMB: await heap(bigDesign.page) };
    assert.ok(metrics.designXlsxZip50.ms < 120000 && metrics.designMdZip50.ms < 60000);
    await bigDesign.close();
    ok(`設計書 50 アプリ: Excel ZIP ${metrics.designXlsxZip50.ms}ms・Markdown ZIP ${metrics.designMdZip50.ms}ms（ヒープ ${metrics.designXlsxZip50.heapMB}MB）`);
  }

  fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify({ checks, metrics, findings }, null, 2));
  console.log(`\n${checks.length} 件の検査が成功しました。既知の問題 ${findings.length} 件（${OUT}/results.json）`);
  await browser.close();
}

main().catch(error => { console.error(error); process.exit(1); });
