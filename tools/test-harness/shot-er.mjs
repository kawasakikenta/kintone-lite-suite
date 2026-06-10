// Screenshot + interaction test for the generated ER diagram HTML.
// Inlines local copies of the CDN libs so it runs offline.
//
// 前提:
//   - tools/統合ツール に cytoscape / dagre / cytoscape-dagre をインストール済み
//     (npm i --no-save cytoscape@3.28.1 dagre@0.8.5 cytoscape-dagre@2.5.0)
//   - playwright と chromium のパスは環境に合わせて下記2か所を変更すること
// 使い方:
//   node shot-er.mjs outputs/er-diagram.html outputs/er.png [plain|manual-add]
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const toolsRoot = resolve(__dirname, '../統合ツール');
const { chromium } = await import('/opt/node22/lib/node_modules/playwright/index.mjs');

const input = process.argv[2] || resolve(__dirname, 'outputs/er-diagram.html');
const output = process.argv[3] || resolve(__dirname, 'outputs/er-diagram.png');
const mode = process.argv[4] || 'plain'; // plain | manual-add | save-reload

let html = readFileSync(input, 'utf8');
const lib = (p) => readFileSync(resolve(toolsRoot, 'node_modules', p), 'utf8');
html = html.replace(/<script src="[^"]*cytoscape[^"]*dagre[^"]*"[^>]*><\/script>/i, () => `<script>${lib('cytoscape-dagre/cytoscape-dagre.js')}<\/script>`);
html = html.replace(/<script src="[^"]*cdnjs[^"]*cytoscape[^"]*"[^>]*><\/script>/i, () => `<script>${lib('cytoscape/dist/cytoscape.min.js')}<\/script>`);
html = html.replace(/<script src="[^"]*dagre@0\.8\.5[^"]*"[^>]*><\/script>/i, () => `<script>${lib('dagre/dist/dagre.min.js')}<\/script>`);
html = html.replace(/@import url\([^)]*\);/g, '');
const tmp = resolve(__dirname, 'outputs/_er-local.html');
writeFileSync(tmp, html, 'utf8');

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const page = await browser.newPage({ viewport: { width: 1480, height: 940 } });
page.on('pageerror', (e) => console.error('[pageerror]', e.message));
await page.goto('file://' + tmp);
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
  const savedPath = resolve(__dirname, 'outputs/_er-saved.html');
  await download.saveAs(savedPath);
  console.log('saved edited html:', download.suggestedFilename());

  const page2 = await browser.newPage({ viewport: { width: 1480, height: 940 } });
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
