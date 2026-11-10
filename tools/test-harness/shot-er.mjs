// Screenshot + interaction test for the generated ER diagram HTML.
// 生成 HTML は描画ライブラリ（Cytoscape・Dagre・cytoscape-dagre）を同梱しているため、
// file:// 以外の通信をすべて遮断した状態で開く（遮断中に通信を試みたら失敗にする）。
//
// 前提:
//   - リポジトリ直下で npm ci を実行済み
// 使い方:
//   node shot-er.mjs outputs/er-diagram.html outputs/er.png [plain|manual-add|save-reload]
import { mkdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { chromium } from 'playwright';

const __dirname = dirname(fileURLToPath(import.meta.url));

const input = resolve(process.argv[2] || resolve(__dirname, 'outputs/er-diagram.html'));
const output = resolve(process.argv[3] || resolve(__dirname, 'outputs/er-diagram.png'));
const mode = process.argv[4] || 'plain'; // plain | manual-add | save-reload
mkdirSync(dirname(output), { recursive: true });

if (/<script\b[^>]*\ssrc\s*=/i.test(readFileSync(input, 'utf8'))) {
  console.error('このHTMLは外部の script を読み込みます。描画ライブラリを同梱した版のHTMLを指定してください');
  process.exit(1);
}

const executablePath = process.env.KUS_PLAYWRIGHT_EXECUTABLE;
const browserName = process.env.KUS_PLAYWRIGHT_BROWSER || 'chrome';
const launchOptions = executablePath
  ? { executablePath, headless: true }
  : (browserName === 'chromium'
    ? { headless: true }
    : { channel: browserName, headless: true });
const browser = await chromium.launch(launchOptions);
const blocked = [];
const blockNetwork = async (target) => {
  await target.route('**/*', async (route) => {
    const url = route.request().url();
    if (/^(?:file|data|blob|about):/i.test(url)) { await route.continue(); return; }
    blocked.push(url);
    await route.abort();
  });
};
const page = await browser.newPage({ viewport: { width: 1480, height: 940 } });
await blockNetwork(page);
page.on('pageerror', (e) => console.error('[pageerror]', e.message));
await page.goto('file://' + input);
await page.waitForTimeout(2500);

if (mode === 'manual-add' || mode === 'save-reload') {
  // 1) add a custom entity with initial fields
  await page.evaluate(() => {
    window.hideOverview();
    window.openAddApp();
    document.getElementById('ed-app-name').value = '外部システム(構想)';
    document.getElementById('ed-app-fields').value = '!連携キー\n*連携日時\nステータス';
  });
  await page.waitForTimeout(200);
  await page.screenshot({ path: output.replace(/\.png$/, '-editor.png') });
  await page.evaluate(() => window.submitEditor());
  await page.waitForTimeout(300);
  // 2) add a field to the custom entity (it is the active app now)
  await page.evaluate(() => {
    window.openAddField();
    document.getElementById('ed-field-name').value = 'エラーメッセージ';
    document.getElementById('ed-field-type').value = 'MULTI_LINE_TEXT';
    window.submitEditor();
  });
  await page.waitForTimeout(300);
  // 3) add a manual relation: custom entity -> app 100
  await page.evaluate(() => {
    window.openAddRelation();
    document.getElementById('ed-rel-from').value = '-1';
    document.getElementById('ed-rel-to').value = '100';
    document.getElementById('ed-rel-kind').value = 'ACTION';
    document.getElementById('ed-rel-label').value = 'API連携';
    window.submitEditor();
  });
  await page.waitForTimeout(500);
  // verify exports include the manual additions
  const checks = await page.evaluate(() => {
    window.showMermaid();
    const mermaid = document.getElementById('modal-content').textContent;
    window.showCSVRelations();
    const csvRel = document.getElementById('modal-content').textContent;
    window.showMarkdown();
    const md = document.getElementById('modal-content').textContent;
    window.closeModal();
    return {
      mermaidHasEntity: mermaid.includes('外部システム'),
      mermaidHasRel: mermaid.includes('API連携'),
      csvHasRel: csvRel.includes('API連携'),
      mdHasField: md.includes('エラーメッセージ'),
      mdHasEntity: md.includes('外部システム'),
    };
  });
  console.log('export checks:', JSON.stringify(checks));
  await page.evaluate(() => { window.closeDetail(); window.fit(); });
  await page.waitForTimeout(600);
}

if (mode === 'save-reload') {
  // exercise some view state too: hide one relation kind + move custom node
  await page.evaluate(() => {
    window.toggleRelationKind('REF');
    window.hideOverview();
  });
  const downloadPromise = page.waitForEvent('download');
  await page.evaluate(() => window.exportEditedHtml());
  const download = await downloadPromise;
  const savedPath = output.replace(/\.png$/, '-saved.html');
  await download.saveAs(savedPath);
  console.log('saved edited html:', download.suggestedFilename());

  const page2 = await browser.newPage({ viewport: { width: 1480, height: 940 } });
  await blockNetwork(page2);
  page2.on('pageerror', (e) => console.error('[pageerror2]', e.message));
  await page2.goto('file://' + savedPath);
  await page2.waitForTimeout(2000);
  const checks = await page2.evaluate(() => {
    const appList = document.getElementById('app-list').textContent;
    window.showCSVRelations();
    const csvRel = document.getElementById('modal-content').textContent;
    window.showMarkdown();
    const md = document.getElementById('modal-content').textContent;
    window.closeModal();
    const refBtnOff = !document.getElementById('rel-ref-btn').classList.contains('active');
    return {
      appListHasCustom: appList.includes('外部システム'),
      csvHasManualRel: csvRel.includes('API連携'),
      mdHasManualField: md.includes('エラーメッセージ'),
      refKindStillHidden: refBtnOff,
      overviewStillHidden: document.getElementById('overview').classList.contains('hidden'),
    };
  });
  console.log('reload checks:', JSON.stringify(checks));
  await page2.screenshot({ path: output.replace(/\.png$/, '-reloaded.png') });
  await page2.close();
}

await page.screenshot({ path: output });
await browser.close();
console.log('wrote', output);
if (blocked.length) {
  console.error('通信を遮断した状態で外部への通信が試みられました:', [...new Set(blocked)].join(', '));
  process.exit(1);
}
