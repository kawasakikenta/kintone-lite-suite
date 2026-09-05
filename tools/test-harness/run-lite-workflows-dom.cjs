#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '../..');
const TOOL = path.join(ROOT, 'tools/統合ツール');
const OUT = path.join(ROOT, '.iter-shots/lite-workflows');
const esbuild = require(path.join(TOOL, 'node_modules/esbuild'));

const MODULES = {
  design: ['runDesignCopyMdStandalone', 'runDesignDiffMdStandalone', 'runDesignExportStandalone', 'runDesignExportXlsxStandalone', 'runBatchDesignExportXlsxZipStandalone'],
  'settings-export': ['runSettingsExportSearchStandalone', 'runSettingsExportStandalone', 'runSettingsExportListSpaceAppsStandalone'],
  er: ['runGenerateERDiagramStandalone', 'runExportERDiagramHtmlStandalone'],
  process: ['runRenderProcessFlowStandalone'],
  field: ['runFieldApplyStandalone', 'runLoadFieldsStandalone', 'runBulkRenameFieldStandalone'],
  jsconfig: ['runApplyJsConfigStandalone', 'runFetchJsConfigStandalone', 'runBatchJsConfigDownloadStandalone'],
  record: ['runCsvExportBatchStandalone', 'runCsvImportStandalone', 'runBatchProcessStandalone', 'runRecordCopyStandalone', 'runAttachmentDownloadStandalone', 'runRecordBackupStandalone', 'runLoadStatusActionsStandalone', 'runLoadViewsStandalone']
};
const CASES = [
  ['design', 'mountDesignLitePanel', '設計書', 'Excel設計書を保存'],
  ['settings-export', 'mountSettingsExportLitePanel', '設定取得', '設定をJSONで保存'],
  ['er', 'mountErLitePanel', 'ER図', 'ER図を開く'],
  ['process', 'mountProcessLitePanel', 'プロセス図', 'プロセス図を表示'],
  ['csv-export', 'mountCsvExportLitePanel', 'CSV出力', 'CSVを出力'],
  ['field', 'mountFieldLitePanel', 'フィールド追加', '比較先プレビューへ反映'],
  ['jsconfig', 'mountJsconfigLitePanel', 'JS/CSS設定', 'JS/CSS設定を取得'],
  ['record', 'mountRecordLitePanel', 'レコード管理', 'CSVを出力']
];

function fixtures() {
  const config = { desktop: { js: [{ type: 'URL', url: 'https://example.invalid/app.js' }], css: [] }, mobile: { js: [], css: [] }, scope: 'ALL' };
  window.__workflowFixture = {
    calls: [], fail: false,
    async invoke(name, args) {
      this.calls.push({ name, input: args[0] });
      const status = args.find(arg => typeof arg === 'function');
      status?.('サンプルデータを処理中…');
      await new Promise(resolve => setTimeout(resolve, 130));
      if (this.fail) throw new Error('サンプル取得失敗');
      if (name === 'runFetchJsConfigStandalone') {
        args[2].setJson(JSON.stringify(config, null, 2));
        args[2].setCustomizeHtml('<p>サンプルのJSファイルが1件あります。</p>');
      }
      if (name === 'runRenderProcessFlowStandalone') {
        const ui = args[2];
        ui.textEl.value = 'graph LR; 新規 --> 完了';
        ui.viewEl.innerHTML = '<div style="padding:24px;text-align:center;font-size:20px">新規 → 確認中 → 完了</div>';
        ui.simUi.container.style.display = 'block';
        ui.simUi.current.textContent = '新規';
        ui.simUi.select.innerHTML = '<option value="done">完了にする</option>';
        ui.simUi.startBtn.onclick = () => { ui.simUi.current.textContent = '新規'; };
        ui.simUi.execBtn.onclick = () => { ui.simUi.current.textContent = '完了'; };
      }
      status?.('サンプル処理が完了しました。実アプリへの書き込みはありません。', false);
      if (name === 'runLoadFieldsStandalone') return { memo: { type: 'SINGLE_LINE_TEXT', code: 'memo', label: 'メモ' } };
      if (name === 'runFieldApplyStandalone') return ['サンプル: フィールド1件の反映が完了'];
      if (name === 'runApplyJsConfigStandalone') args[2]('<p>サンプル: JS/CSS反映が完了</p>');
      if (name === 'runSettingsExportStandalone') return { summaryHtml: '<p>対象1アプリの設定取得が完了しました。</p>' };
      if (name === 'runRenderProcessFlowStandalone') return { states: { new: {}, done: {} }, actions: [{ name: '完了' }] };
      if (name === 'runBulkRenameFieldStandalone') return { properties: { renamed: { type: 'SINGLE_LINE_TEXT' } }, renamePairs: [{ from: 'memo', to: 'renamed' }] };
      if (name === 'runLoadStatusActionsStandalone') return { actions: [{ name: '完了にする', from: '新規', to: '完了' }] };
      if (name === 'runLoadViewsStandalone') return [{ name: '全件', filter: '' }];
      if (name.includes('Search') || name.includes('Space')) return [];
      return {};
    }
  };
  window.kintone = { app: { getId: () => 202 }, api: Object.assign(async () => ({}), { url: p => p }) };
}

async function makeBundle(entry) {
  const result = await esbuild.build({
    absWorkingDir: TOOL, entryPoints: [`src/entries/${entry}-lite-ui.ts`], bundle: true, write: false,
    format: 'iife', globalName: 'ToolHarness', platform: 'browser', target: ['chrome110'], logLevel: 'silent',
    plugins: [{ name: 'workflow-mocks', setup(build) {
      build.onResolve({ filter: /tabs\/[\w-]+-standalone\.js$/ }, args => {
        const key = args.path.match(/\/([\w-]+)-standalone\.js$/)[1];
        return MODULES[key] ? { path: key, namespace: 'fixture' } : null;
      });
      build.onLoad({ filter: /.*/, namespace: 'fixture' }, args => {
        let contents = MODULES[args.path].map(name => `export const ${name} = (...args) => window.__workflowFixture.invoke('${name}', args);`).join('\n');
        if (args.path === 'settings-export') contents += '\nexport function renderSettingsExportSearchResultsHtml(){ return ""; }';
        if (args.path === 'jsconfig') contents += '\nexport function runExportJsConfigStandalone(text, app, status){window.__workflowFixture.calls.push({name:"runExportJsConfigStandalone",input:text});status("JSON保存完了");}';
        if (args.path === 'record') contents += `
          export function parseRecordAppIds(value){const ids=String(value).split(/[\\s,、]+/).filter(Boolean);if(ids.some(id=>!/^\\d+$/.test(id)))throw new Error('アプリIDは数値で指定してください。');return [...new Set(ids)];}
          export async function runRecordAppBatchStandalone(value, fn, status){for(const id of parseRecordAppIds(value))await fn(id);status('全アプリの処理が完了しました。');}
        `;
        return { contents, loader: 'js' };
      });
    } }]
  });
  return result.outputFiles[0].text;
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true, channel: process.argv.includes('--browser') ? process.argv[process.argv.indexOf('--browser') + 1] : 'chrome' });
  const results = [];
  try {
    for (const [id, mount, title, defaultAction] of CASES) {
      const script = await makeBundle(id);
      const demo = '<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' + title + ' · 操作デモ</title><body style="background:#e8edf3"><script>(' + fixtures.toString() + ')();\n' + script.replace(/<\/script/gi, '<\\/script') + `\nToolHarness.${mount}();document.querySelector('.kus-lp__subtitle').textContent='操作デモ · サンプルデータのみ。実アプリには通信しません。';</script></body></html>`;
      fs.writeFileSync(path.join(OUT, id + '-demo.html'), demo);
      const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
      await page.route('**/*', route => route.abort());
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      const button = name => page.getByRole('button', { name, exact: true });
      const stage = n => page.locator('.kus-wf-stage').nth(n);
      const idle = () => page.waitForFunction(() => document.querySelector('.kus-wf')?.getAttribute('aria-busy') !== 'true');
      try {
        await page.setContent(demo);
        assert.equal(await stage(0).isVisible(), true, id + ': 初期状態');
        assert.equal(await page.evaluate(() => window.__workflowFixture.calls.length), 0);
        if (id === 'field') {
          assert.equal(await button('内容を確認する').isDisabled(), true);
          await page.getByRole('textbox', { name: '比較先アプリID', exact: true }).fill('303');
          await button('比較元から読込').click(); await idle();
          assert.equal(await stage(0).isVisible(), true, '補助取得で勝手に結果画面へ進まない');
          assert.equal(await button('内容を確認する').isEnabled(), true);
          await page.evaluate(() => { window.__workflowFixture.calls = []; });
        }
        for (const [width, height] of [[1440,1000],[390,844],[320,640],[720,450]]) {
          await page.setViewportSize({width,height});
          await page.screenshot({path:path.join(OUT, `${id}-setup-${width}.png`)});
          const geometry = await page.evaluate(() => {
            const canvas = document.querySelector('.kus-wf-canvas');
            const root = document.querySelector('.kus-wf').getBoundingClientRect();
            const footer = document.querySelector('.kus-wf-footer').getBoundingClientRect();
            return {overflow:canvas.scrollWidth-canvas.clientWidth,left:root.left,right:root.right,bottom:root.bottom,canvasHeight:canvas.clientHeight,canvasBottom:canvas.getBoundingClientRect().bottom,footerTop:footer.top};
          });
          assert.ok(geometry.overflow <= 1, id + ': 横はみ出し ' + width + ' ' + JSON.stringify(geometry));
          assert.ok(geometry.left >= 0 && geometry.right <= width+1 && geometry.bottom <= height+1);
          assert.ok(geometry.canvasBottom <= geometry.footerTop+1 && geometry.canvasHeight > 50);
        }
        await page.setViewportSize({width:1440,height:1000});
        await button('内容を確認する').click();
        assert.equal(await stage(1).isVisible(), true);
        assert.equal(await page.evaluate(() => window.__workflowFixture.calls.length), 0, '確認操作ではエンジンを呼ばない');
        assert.match(await stage(1).innerText(), /#202|#303/);
        await page.screenshot({path:path.join(OUT, `${id}-review.png`)});
        await button(defaultAction).evaluate(b => { b.click(); b.click(); });
        await idle();
        assert.equal(await page.evaluate(() => window.__workflowFixture.calls.length), 1, id + ': 二重実行を防ぐ');
        assert.equal(await stage(2).isVisible(), true);
        assert.match(await stage(2).innerText(), /完了/);
        assert.equal(await page.locator('.kus-lp__close').isEnabled(), true);
        await page.screenshot({path:path.join(OUT, `${id}-result.png`)});
        if (id === 'process') {
          await page.getByRole('button', { name: /アクション実行/ }).click();
          assert.match(await stage(2).innerText(), /完了/);
        }
        if (id === 'jsconfig') {
          await button('対象・条件を変更').click();
          await page.getByRole('radio', {name:'比較先プレビューへ反映',exact:true}).check();
          assert.equal(await button('内容を確認する').isDisabled(), true);
          await page.getByRole('textbox', { name: '反映先アプリID', exact: true }).fill('303');
          const jsonInput = page.getByRole('textbox', {name:'カスタマイズJSON',exact:true});
          const validJson = await jsonInput.inputValue();
          for (const invalidJson of ['null', '[]', '{']) {
            await jsonInput.fill(invalidJson);
            assert.equal(await button('内容を確認する').isDisabled(), true);
          }
          await jsonInput.fill(validJson);
          await button('内容を確認する').click();
          assert.match(await stage(1).innerText(), /全置換/);
          const before = await page.evaluate(() => window.__workflowFixture.calls.length);
          await page.getByRole('button', {name:'比較先プレビューへ反映',exact:true}).click(); await idle();
          assert.equal(await page.evaluate(() => window.__workflowFixture.calls.length), before+1);
        }
        if (id === 'settings-export') {
          await button('対象・条件を変更').click(); await button('全解除').click();
          assert.equal(await button('内容を確認する').isDisabled(), true, '設定0件では実行しない');
          await button('全選択').click();
        }
        if (id === 'design') {
          await button('対象・条件を変更').click();
          await page.getByRole('radio', {name:'2アプリの設計差分を保存',exact:true}).check();
          assert.equal(await button('内容を確認する').isDisabled(), true);
          await page.getByRole('radio', {name:'全対象をExcel ZIPで保存',exact:true}).check();
          await page.getByRole('checkbox', {name:'プレビュー環境から取得（単一出力・2アプリ差分）',exact:true}).check();
          await button('内容を確認する').click();
          assert.match(await stage(1).innerText(), /#202 · 本番/);
          await button('対象・条件を変更').click();
          await page.getByRole('radio', {name:defaultAction,exact:true}).check();
        }
        if (id === 'record') {
          for (const action of ['CSVからレコードを追加','ステータスを一括更新','添付ファイルを保存','レコードをコピー','バックアップを保存']) {
            await button('対象・条件を変更').click();
            await page.getByRole('radio', {name:action,exact:true}).check();
            const fields = page.locator('.kus-lp__tab-panel:not([hidden])');
            if (action.includes('CSVから')) await fields.locator('input[type=file]').setInputFiles({name:'sample.csv',mimeType:'text/csv',buffer:Buffer.from('memo\nhello')});
            if (action.includes('ステータス')) await fields.getByPlaceholder('アクション名',{exact:true}).fill('完了にする');
            if (action.includes('添付')) await fields.getByPlaceholder('例: attached_file',{exact:true}).fill('files');
            if (action.includes('コピー')) await fields.getByPlaceholder('コピー元アプリID',{exact:true}).fill('101');
            await button('内容を確認する').click();
            const before = await page.evaluate(() => window.__workflowFixture.calls.length);
            await button(action).click(); await idle();
            assert.equal(await page.evaluate(() => window.__workflowFixture.calls.length), before+1, action);
            assert.equal(await stage(2).isVisible(), true);
          }
        }
        if (await stage(2).isVisible()) await button('対象・条件を変更').click();
        await button('内容を確認する').click();
        await page.evaluate(() => { const input=document.querySelector('.kus-wf-stage input:not([type=radio])'); if(input){input.value='999';input.dispatchEvent(new Event('input',{bubbles:true}));} });
        await page.waitForTimeout(0);
        assert.equal(await page.locator('.kus-wf-footer-buttons button').last().isDisabled(), true, '確認後の変更は再確認が必要');
        await button('対象・条件を変更').click();
        await button('内容を確認する').click();
        await page.evaluate(() => { window.__workflowFixture.fail = true; });
        await page.locator('.kus-wf-footer-buttons button').last().click(); await idle();
        assert.equal(await stage(2).isVisible(), true);
        assert.match(await stage(2).innerText(), /サンプル取得失敗/);
        assert.doesNotMatch(await stage(2).innerText(), /サンプル: .*反映が完了|対象1アプリの設定取得が完了/);
        if (id === 'process') assert.equal(await page.locator('textarea[aria-label="プロセス図のMermaidソース"]').inputValue(), '');
        assert.equal(await page.locator('.kus-lp__close').isEnabled(), true);
        assert.deepEqual(errors, []);
        results.push({id,title,passed:true});
        console.log('PASS ' + title);
      } catch(error) {
        await page.screenshot({path:path.join(OUT,id+'-failure.png')});
        console.error(id, await page.locator('.kus-lp').innerText());
        console.error('pageerrors',errors);
        throw error;
      } finally { await page.close(); }
    }
    fs.writeFileSync(path.join(OUT,'results.json'),JSON.stringify({passed:true,viewports:[1440,390,320,720],tools:results},null,2));
    console.log('PASS all 8 workflows; read-only review, duplicate guard, validation, JSON, record modes, failure recovery, responsive layout');
  } finally { await browser.close(); }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
