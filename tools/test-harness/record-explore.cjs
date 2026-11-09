#!/usr/bin/env node
'use strict';

// レコード管理・CSV出力・データ品質チェック・プロセス図の通し検証。配布物（tools/*.js）をそのままページに読み込み（esbuild で作り直さない）、
// window.kintone.api と window.fetch を、状態を持つ合成 kintone（record-explore-kintone.cjs）に差し替えて、利用者と同じ操作で確かめる。
// 画面の表示と、合成 kintone が受け取った送信内容・作られたレコードの両方を確認する。実際の kintone には通信しない。
//
// 直した問題は通常の検査（失敗させるもの）にしてある。まだ直していない製品の不具合・使いにくさだけを「既知の問題（findings）」として記録する。
// 既知の問題は失敗させずに一覧で出し（severity が critical のものだけ失敗にする）、.iter-shots/record-explore/results.json に保存する。
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { readZip: readZipEntries } = require('./zip-reader.cjs');
const { installRecordKintone } = require('./record-explore-kintone.cjs');

const ROOT = path.resolve(__dirname, '../..');
const TOOLS = {
  record: { file: path.join(ROOT, 'tools/kintoneレコード取得.js'), panel: '#kus-record-lite' },
  csv: { file: path.join(ROOT, 'tools/CSV出力.js'), panel: '#kus-csv-export-lite' },
  quality: { file: path.join(ROOT, 'tools/データ品質チェック.js'), panel: '#kus-record-quality-lite' },
  process: { file: path.join(ROOT, 'tools/プロセス実行.js'), panel: '#kus-process-lite' }
};
const OUT = path.join(ROOT, '.iter-shots/record-explore');

function printHelp() {
  console.log(`Usage: node tools/test-harness/record-explore.cjs [options]

レコード管理・CSV出力・データ品質チェック・プロセス図の配布物（tools/*.js）を、状態を持つ合成 kintone につないで、利用者と同じ操作で通しに検証します。
実際の kintone には通信しません。事前に npm run build で配布物を作ってください。

Options:
  --browser <name>      chrome または chromium（既定: chrome）
  --executable <path>   ブラウザの実行ファイル（環境変数 KUS_PLAYWRIGHT_EXECUTABLE でも指定できます）
  --only <text>         名前に <text> を含むシナリオだけ実行します（例: --only zip）
  --skip-slow           時間のかかるシナリオ（無応答の書き込みを 10 秒待つ、など）を省きます
  --mermaid <path>      Mermaid の mermaid.min.js のパス（環境変数 KUS_MERMAID_PATH でも指定できます）。指定すると、プロセス図が実際の図として描画されることを確かめます
  --help                このヘルプを表示

日本語のダウンロード名を扱うため、ロケールが C/POSIX の環境では LANG=C.UTF-8 LC_ALL=C.UTF-8 を付けて実行してください。
結果と画面: .iter-shots/record-explore/（results.json に既知の問題）`);
}
const argValue = (name, fallback) => (process.argv.includes(name) ? process.argv[process.argv.indexOf(name) + 1] : fallback);

// ---------------------------------------------------------------------------
// 業務に近いアプリ（各フィールドの種類・テーブル・ユーザー選択・添付・ステータス）
// ---------------------------------------------------------------------------
const PROJECT_FIELDS = {
  title: { type: 'SINGLE_LINE_TEXT', label: '件名', required: true, maxLength: '40' },
  code: { type: 'SINGLE_LINE_TEXT', label: '案件番号', required: true, unique: true },
  amount: { type: 'NUMBER', label: '金額', minValue: '-1000', maxValue: '1000000000' },
  memo: { type: 'MULTI_LINE_TEXT', label: 'メモ' },
  due: { type: 'DATE', label: '期限' },
  startAt: { type: 'DATETIME', label: '開始日時' },
  meet: { type: 'TIME', label: '打合せ時刻' },
  category: { type: 'DROP_DOWN', label: '区分', options: { 新規: { label: '新規', index: '0' }, 継続: { label: '継続', index: '1' }, 終了: { label: '終了', index: '2' } } },
  priority: { type: 'RADIO_BUTTON', label: '優先度', required: true, defaultValue: '中', options: { 高: { label: '高', index: '0' }, 中: { label: '中', index: '1' }, 低: { label: '低', index: '2' } } },
  tags: { type: 'CHECK_BOX', label: 'タグ', options: { A: { label: 'A', index: '0' }, B: { label: 'B', index: '1' }, C: { label: 'C', index: '2' } } },
  skills: { type: 'MULTI_SELECT', label: 'スキル', options: { JS: { label: 'JS', index: '0' }, TS: { label: 'TS', index: '1' }, Go: { label: 'Go', index: '2' } } },
  owner: { type: 'USER_SELECT', label: '担当者' },
  dept: { type: 'ORGANIZATION_SELECT', label: '担当組織' },
  url: { type: 'LINK', label: '関連URL', protocol: 'WEB' },
  attach: { type: 'FILE', label: '添付' },
  detail: { type: 'SUBTABLE', label: '明細', fields: { item: { type: 'SINGLE_LINE_TEXT', label: '品名' }, qty: { type: 'NUMBER', label: '数量' }, remark: { type: 'SINGLE_LINE_TEXT', label: '備考' }, doc: { type: 'FILE', label: '資料' } } },
  レコード番号: { type: 'RECORD_NUMBER', label: 'レコード番号' },
  作成者: { type: 'CREATOR', label: '作成者' },
  作成日時: { type: 'CREATED_TIME', label: '作成日時' },
  更新者: { type: 'MODIFIER', label: '更新者' },
  更新日時: { type: 'UPDATED_TIME', label: '更新日時' },
  ステータス: { type: 'STATUS', label: 'ステータス' },
  作業者: { type: 'STATUS_ASSIGNEE', label: '作業者' },
  total: { type: 'CALC', label: '合計', expression: 'amount * 1.1' }
};
const PROJECT_PROCESS = {
  enable: true,
  states: {
    未処理: { name: '未処理', index: '0', assignee: { type: 'ONE', entities: [] } },
    申請中: { name: '申請中', index: '1', assignee: { type: 'ONE', entities: [{ entity: { type: 'USER', code: 'reviewer' }, includeSubs: false }, { entity: { type: 'USER', code: 'approver' }, includeSubs: false }] } },
    承認済: { name: '承認済', index: '2', assignee: { type: 'ONE', entities: [{ entity: { type: 'USER', code: 'approver' }, includeSubs: false }] } },
    完了: { name: '完了', index: '3', assignee: { type: 'ONE', entities: [] } }
  },
  actions: [
    { name: '申請', from: '未処理', to: '申請中', filterCond: '', type: 'PRIMARY' },
    { name: '承認', from: '申請中', to: '承認済', filterCond: 'amount >= 1000', type: 'PRIMARY' },
    { name: '差し戻し', from: '申請中', to: '未処理', filterCond: '', type: 'PRIMARY' },
    { name: '差し戻し', from: '承認済', to: '申請中', filterCond: '', type: 'SECONDARY' },
    { name: '完了', from: '承認済', to: '完了', filterCond: '', type: 'PRIMARY' },
    { name: '確認', from: '未処理', to: '申請中', filterCond: '', type: 'PRIMARY' },
    { name: '確認', from: '未処理', to: '承認済', filterCond: '', type: 'PRIMARY' }
  ]
};
const COPY_TARGET_FIELDS = {
  title: PROJECT_FIELDS.title,
  code: { type: 'SINGLE_LINE_TEXT', label: '案件番号' },
  amount: PROJECT_FIELDS.amount,
  category: { type: 'SINGLE_LINE_TEXT', label: '区分' },
  priority: PROJECT_FIELDS.priority,
  tags: PROJECT_FIELDS.tags,
  due: PROJECT_FIELDS.due,
  owner: PROJECT_FIELDS.owner,
  attach: PROJECT_FIELDS.attach,
  detail: { type: 'SUBTABLE', label: '明細', fields: { item: { type: 'SINGLE_LINE_TEXT', label: '品名' }, qty: { type: 'SINGLE_LINE_TEXT', label: '数量' } } },
  レコード番号: PROJECT_FIELDS.レコード番号
};
const BIG_FIELDS = {
  title: { type: 'SINGLE_LINE_TEXT', label: '件名' },
  code: { type: 'SINGLE_LINE_TEXT', label: '案件番号', unique: true },
  amount: { type: 'NUMBER', label: '金額' },
  category: PROJECT_FIELDS.category,
  tags: PROJECT_FIELDS.tags,
  レコード番号: PROJECT_FIELDS.レコード番号
};
const ATTACH_FIELDS = {
  title: { type: 'SINGLE_LINE_TEXT', label: '件名' },
  attach: { type: 'FILE', label: '添付' },
  detail: { type: 'SUBTABLE', label: '明細', fields: { item: { type: 'SINGLE_LINE_TEXT', label: '品名' }, doc: { type: 'FILE', label: '資料' } } }
};
const APPS = [
  { id: 101, name: '案件管理', fields: PROJECT_FIELDS, process: PROJECT_PROCESS },
  { id: 102, name: '案件コピー先', fields: COPY_TARGET_FIELDS },
  { id: 103, name: '大量データ', fields: BIG_FIELDS },
  { id: 104, name: '添付の多いアプリ', fields: ATTACH_FIELDS },
  { id: 105, name: '案件の取込先', fields: Object.fromEntries(Object.entries(PROJECT_FIELDS).filter(([, def]) => !['SUBTABLE', 'FILE', 'CALC', 'STATUS', 'STATUS_ASSIGNEE', 'CREATOR', 'MODIFIER', 'CREATED_TIME', 'UPDATED_TIME', 'RECORD_NUMBER'].includes(def.type))) }
];

// ---------------------------------------------------------------------------
// 検査の部品
// ---------------------------------------------------------------------------
const findings = [];
const checks = [];
function finding(id, severity, title, detail = {}) {
  if (findings.some(item => item.id === id)) return;
  findings.push({ id, severity, title, ...detail });
  console.log(`  [既知の問題 ${severity}] ${id}: ${title}`);
}
const ok = name => { checks.push(name); console.log(`  OK ${name}`); };
const sleepNode = ms => new Promise(resolve => setTimeout(resolve, ms));

/** ダウンロードされた ZIP の中身を、作成側とは別の実装（zip-reader.cjs）で読み戻す。ファイル名 → Buffer。 */
function readZip(buffer) {
  return new Map([...readZipEntries(buffer)].map(([name, entry]) => [name, entry.data]));
}
/** 引用符・改行・カンマを含む CSV を行の配列にする（BOM は除く）。 */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  const src = text.replace(/^﻿/, '');
  for (let i = 0; i < src.length; i += 1) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') { cell += '"'; i += 1; } else if (ch === '"') quoted = false; else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { row.push(cell); cell = ''; } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i += 1;
      row.push(cell); rows.push(row); row = []; cell = '';
    } else cell += ch;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  return rows;
}
const csvLine = cells => cells.map(cell => (/[",\n\r]/.test(cell) ? `"${cell.replace(/"/g, '""')}"` : cell)).join(',');

async function main() {
  if (process.argv.includes('--help')) { printHelp(); return; }
  for (const tool of Object.values(TOOLS)) if (!fs.existsSync(tool.file)) throw new Error(`配布物が見つかりません: ${tool.file}（npm run build で生成してください）`);
  const { chromium } = require('playwright');
  fs.mkdirSync(OUT, { recursive: true });
  const only = argValue('--only', '');
  const skipSlow = process.argv.includes('--skip-slow');
  const mermaidPath = argValue('--mermaid', process.env.KUS_MERMAID_PATH || '');
  const scripts = Object.fromEntries(Object.entries(TOOLS).map(([key, tool]) => [key, fs.readFileSync(tool.file, 'utf8')]));
  const browserName = argValue('--browser', 'chrome');
  const executablePath = argValue('--executable', process.env.KUS_PLAYWRIGHT_EXECUTABLE);
  const browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : browserName === 'chromium' ? {} : { channel: browserName }) });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  page.on('console', message => { if (message.type() === 'error' && !/Failed to load resource/.test(message.text())) pageErrors.push(`console.error: ${message.text()}`); });
  const routeBlocked = [];
  await page.route('**/*', route => {
    const url = route.request().url();
    if (mermaidPath && /mermaid/.test(url) && /\.js(\?|$)/.test(url)) return route.fulfill({ contentType: 'application/javascript', headers: { 'access-control-allow-origin': '*' }, body: fs.readFileSync(mermaidPath) });
    if (!/^(about:|data:|blob:)/.test(url)) routeBlocked.push(url);
    return route.abort();
  });
  const dialogs = [];
  let dialogAnswer = true;
  page.on('dialog', async dialog => { dialogs.push({ type: dialog.type(), message: dialog.message() }); await (dialogAnswer ? dialog.accept() : dialog.dismiss()); });

  // ---- 画面の部品 ----
  let current = 'record';
  const panel = () => page.locator(TOOLS[current].panel);
  const button = name => page.getByRole('button', { name, exact: true });
  const idle = () => page.waitForFunction(selector => document.querySelector(selector)?.getAttribute('aria-busy') !== 'true', TOOLS[current].panel, { timeout: 300000 });
  const statusText = async () => (await page.locator('.kus-lp__status-text').innerText()).trim();
  const statusTone = () => page.locator('.kus-lp__status').getAttribute('data-tone');
  const logText = async () => (await page.locator('.kus-lp__result').innerText()).trim();
  const panelText = () => panel().innerText();
  const stage = n => page.locator('.kus-wf-stage').nth(n);
  const pickAction = async label => {
    const radio = page.getByRole('radio', { name: label, exact: true });
    if (!(await radio.isVisible())) await page.locator('.kus-wf-action--more').click();
    await radio.check();
  };
  const appInput = () => page.getByRole('textbox', { name: '対象アプリID', exact: true });
  const activeTab = () => page.locator('.kus-lp__tab-panel:not([hidden])');
  const withOptions = async (tab, fn) => {
    await activeTab().getByRole('button', { name: 'オプション…', exact: true }).click();
    const dialog = page.locator(`#kus-record-lite-options-${tab}`);
    await fn(dialog);
    await dialog.getByRole('button', { name: '閉じる', exact: true }).click();
  };
  const shot = name => page.screenshot({ path: path.join(OUT, `${name}.png`) });
  const K = fn => page.evaluate(fn);
  const state = () => page.evaluate(() => {
    const s = window.__k;
    return {
      writes: s.writes.map(({ seq, method, path: p, body, rejected, createdIds, updated, hung, injectedFailure }) => ({ seq, method, path: p, body, rejected, createdIds, updated, hung, injectedFailure })),
      violations: s.violations, downloads: s.downloads.map(d => ({ name: d.name, size: d.blob ? d.blob.size : -1 })),
      fetches: s.fetches.length, calls: s.calls.length,
      callUrls: s.calls.map(c => `${c.method} ${c.url}`),
      counts: Object.fromEntries(Object.values(s.apps).map(app => [app.id, app.records.length]))
    };
  });
  const recordsOf = appId => page.evaluate(id => window.__k.apps[String(id)].records.map(rec => JSON.parse(JSON.stringify(rec))), appId);
  const downloadBytes = async index => Buffer.from(await page.evaluate(async i => {
    const ab = await window.__k.downloads[i].blob.arrayBuffer();
    const bytes = new Uint8Array(ab);
    let text = '';
    for (let j = 0; j < bytes.length; j += 0x8000) text += String.fromCharCode.apply(null, bytes.subarray(j, j + 0x8000));
    return btoa(text);
  }, index), 'base64');
  const downloadZip = async index => readZip(await downloadBytes(index));
  const downloadNames = () => page.evaluate(() => window.__k.downloads.map(d => d.name));

  /** ページを作り直し、合成 kintone を入れ、配布物を読み込む（配布物は読み込み時に自動で起動する）。 */
  async function reset(config, { tool = 'record', width = 1440, height = 1000 } = {}) {
    current = tool;
    dialogAnswer = true;
    dialogs.length = 0;
    await page.setViewportSize({ width, height });
    await page.setContent('<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><body style="background:#e8edf3"></body></html>');
    await page.evaluate(installRecordKintone, { apps: APPS, ...config });
    pageErrors.length = 0;
    await page.addScriptTag({ content: scripts[tool] });
    await page.waitForSelector(TOOLS[tool].panel);
  }
  /** 確認画面を開いて、その操作の実行ボタンを押す。 */
  async function confirmAndRun(label) {
    await button('内容を確認する').click();
    await button(label).click();
    await idle();
  }

  const scenarios = [];
  const scenario = (name, fn, { slow = false } = {}) => scenarios.push({ name, fn, slow });
  const ctx = {
    page, button, idle, statusText, statusTone, logText, panelText, stage, pickAction, appInput, activeTab, withOptions, shot, K, state, recordsOf,
    downloadBytes, downloadZip, downloadNames, reset, confirmAndRun, dialogs, setDialogAnswer: value => { dialogAnswer = value; }, pageErrors, panel,
    finding, ok, sleepNode, readZip, parseCsv, csvLine, APPS, PROJECT_FIELDS, mermaidPath, setCurrent: tool => { current = tool; },
    scripts, TOOLS, OUT, routeBlocked
  };
  for (const register of require('./record-explore-scenarios.cjs')) register(scenario, ctx);

  let failed = 0;
  for (const item of scenarios) {
    if (only && !item.name.includes(only)) continue;
    if (skipSlow && item.slow) { console.log(`- ${item.name}（省略: --skip-slow）`); continue; }
    console.log(`- ${item.name}`);
    const started = Date.now();
    try {
      await item.fn();
      assert.deepEqual(pageErrors, [], `${item.name}: 画面の例外`);
      console.log(`  (${((Date.now() - started) / 1000).toFixed(1)}s)`);
    } catch (error) {
      failed += 1;
      console.error(`  NG ${item.name}: ${error && error.stack ? error.stack.split('\n').slice(0, 6).join('\n') : error}`);
      try {
        await shot(`failure-${failed}`);
        console.error(`  状態: ${(await statusText()).slice(0, 400)}\n  ログ: ${(await logText()).slice(0, 800)}`);
      } catch (shotError) { /* 無視 */ }
    }
  }
  await browser.close();
  const critical = findings.filter(item => item.severity === 'critical');
  fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify({ checks, findings }, null, 2));
  console.log(`\n確認 ${checks.length} 件 / 既知の問題 ${findings.length} 件（critical ${critical.length}）/ 失敗 ${failed} 件`);
  if (failed || critical.length) process.exitCode = 1;
}
main().catch(error => { console.error(error); process.exitCode = 1; });
