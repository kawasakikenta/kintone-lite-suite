// Bundle the harness entry with esbuild, eval in a node sandbox, then call
// each pure builder with synthetic kintone bundles. Saves outputs under
// `outputs/` for manual inspection.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import vm from 'node:vm';
import esbuild from '../統合ツール/node_modules/esbuild/lib/main.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(__dirname, 'outputs');
mkdirSync(outDir, { recursive: true });

// ------------ build a one-off IIFE bundle that exposes the builders ----------
const toolsRoot = resolve(__dirname, '../統合ツール');

const jsToTsResolver = {
  name: 'js-to-ts',
  setup(build) {
    build.onResolve({ filter: /\.js$/ }, async (args) => {
      if (!args.path.startsWith('./') && !args.path.startsWith('../')) return null;
      const fs = await import('node:fs/promises');
      const baseAbs = resolve(args.resolveDir, args.path);
      try { await fs.access(baseAbs); return null; } catch (_) {}
      for (const ext of ['.ts', '.tsx']) {
        const cand = baseAbs.replace(/\.js$/, ext);
        try { await fs.access(cand); return { path: cand }; } catch (_) {}
      }
      return null;
    });
  }
};

const cssPlugin = {
  name: 'inline-css',
  setup(build) {
    build.onLoad({ filter: /\.css$/ }, async (args) => {
      const fs = await import('node:fs/promises');
      const css = await fs.readFile(args.path, 'utf8');
      const escaped = css.replace(/`/g, '\\`').replace(/\$/g, '\\$');
      return { contents: `export default \`${escaped}\`;`, loader: 'js' };
    });
  }
};

console.log('[harness] bundling output-layouts-entry.ts ...');
const result = await esbuild.build({
  absWorkingDir: toolsRoot,
  entryPoints: [resolve(__dirname, 'output-layouts-entry.ts')],
  bundle: true,
  format: 'iife',
  write: false,
  charset: 'utf8',
  target: ['es2020'],
  plugins: [jsToTsResolver, cssPlugin],
  logLevel: 'silent'
});
const bundle = result.outputFiles[0].text;
console.log(`[harness] bundle size: ${(bundle.length / 1024).toFixed(1)} KB`);

// ------------ minimal browser-ish sandbox so the IIFE can register window ----
const noop = () => {};
const sandbox = {};
const fakeElement = () => ({
  style: {}, dataset: {}, classList: { add: noop, remove: noop, toggle: noop, contains: () => false },
  setAttribute: noop, removeAttribute: noop, getAttribute: () => null,
  appendChild: noop, removeChild: noop, addEventListener: noop, removeEventListener: noop,
  querySelector: () => null, querySelectorAll: () => [],
  children: [], childNodes: [], parentNode: null, innerHTML: '', textContent: ''
});
const fakeWindow = {
  __KUS__: undefined,
  __KUS_AUTOBOOT__: false,
  navigator: { clipboard: { writeText: () => Promise.resolve() }, userAgent: 'node-harness' },
  location: { href: '' },
  setTimeout, clearTimeout, setInterval, clearInterval,
  alert: noop, confirm: () => true, prompt: () => '',
  open: () => null,
};
sandbox.window = fakeWindow;
sandbox.globalThis = sandbox;
sandbox.self = fakeWindow;
sandbox.document = {
  createElement: () => fakeElement(),
  createElementNS: () => fakeElement(),
  body: fakeElement(),
  head: fakeElement(),
  documentElement: fakeElement(),
  getElementById: () => null,
  querySelector: () => null,
  querySelectorAll: () => [],
  addEventListener: noop, removeEventListener: noop,
  defaultView: fakeWindow
};
sandbox.location = fakeWindow.location;
sandbox.localStorage = { getItem: () => null, setItem: noop, removeItem: noop };
sandbox.sessionStorage = { getItem: () => null, setItem: noop, removeItem: noop };
sandbox.console = console;
sandbox.kintone = { api: () => Promise.resolve({}), app: { getId: () => 1 } };
sandbox.URL = URL; sandbox.Blob = class { constructor(parts){this.parts=parts;} };

vm.createContext(sandbox);
vm.runInContext(bundle, sandbox, { filename: 'output-layouts.iife.js' });

const api = sandbox.window.__OUT__;
if (!api) throw new Error('window.__OUT__ not registered');

// ------------ synthetic source / target bundles ------------------------------
const isoNow = '2026-05-02T09:00:00.000Z';

function makeBundle(appId, opts) {
  return {
    appId,
    guestId: '',
    preview: false,
    fetchedAt: isoNow,
    meta: {
      sectionRevisions: { fieldSettings: '5', viewSettings: '2', notifications: '1' }
    },
    sections: {
      appSettings: {
        name: opts.name,
        description: opts.description || '',
        icon: { type: 'PRESET', key: 'APP44' },
        theme: 'WHITE',
        revision: '12'
      },
      fieldSettings: {
        revision: '5',
        properties: {
          顧客名: { code: '顧客名', type: 'SINGLE_LINE_TEXT', label: '顧客名', required: true, unique: false },
          金額: { code: '金額', type: 'NUMBER', label: '金額', required: false, unit: '円', unitPosition: 'AFTER' },
          ステータス: { code: 'ステータス', type: 'DROP_DOWN', label: 'ステータス',
            options: opts.statusOptions || { '見込': { label: '見込', index: '0' }, '商談中': { label: '商談中', index: '1' }, '受注': { label: '受注', index: '2' } }
          },
          ...(opts.extraField ? { 担当者メモ: { code: '担当者メモ', type: 'MULTI_LINE_TEXT', label: '担当者メモ', required: false } } : {})
        }
      },
      viewSettings: {
        revision: '2',
        views: {
          一覧: { name: '一覧', type: 'LIST', index: '0', fields: ['顧客名', '金額', 'ステータス'] }
        }
      },
      notifications: {
        revision: '1',
        notifications: [
          { entity: { type: 'USER', code: 'admin' }, includeSubs: false, recordAdded: true, recordEdited: true, commentAdded: true, statusChanged: false, fileImported: false }
        ],
        notifyToCommenter: true
      }
    }
  };
}

const sourceBundle = makeBundle('100', { name: '営業案件管理(開発)', description: '開発環境' });
const targetBundle = makeBundle('200', {
  name: '営業案件管理(本番)', description: '本番環境', extraField: true,
  statusOptions: { '見込': { label: '見込', index: '0' }, '商談中': { label: '商談中', index: '1' }, '受注': { label: '受注', index: '2' }, '失注': { label: '失注', index: '3' } }
});

// ------------ 1) compute diff rows ------------------------------------------
const scopes = ['appSettings', 'fieldSettings', 'viewSettings', 'notifications'];
const diffResult = api.computeDiffRows(sourceBundle, targetBundle, scopes, '', { includeSame: true });
const rows = api.enrichDiffRows(diffResult.rows, sourceBundle, targetBundle);
console.log(`[harness] diff rows: ${rows.length}`);

// ------------ 2) Diff HTML ---------------------------------------------------
const html = api.buildDiffHtml(sourceBundle, targetBundle, rows, scopes, '', {
  fetchIssues: [],
  exportMode: 'all',
  exportLabel: '全差分（同一含む）',
  exportContentMode: 'diffOnly',
  exportContentLabel: '差分のみ',
  normalizationState: {},
  warning: { threshold: 0, diffCount: rows.length, issueCount: 0, total: rows.length, exceeded: false }
});
writeFileSync(resolve(outDir, 'diff-report.html'), html, 'utf8');
console.log(`[harness] wrote diff-report.html (${(html.length / 1024).toFixed(1)} KB)`);

// ------------ 3) Patch JSON --------------------------------------------------
const patch = api.buildPatchPayload(rows, sourceBundle, targetBundle);
writeFileSync(resolve(outDir, 'diff-patch.json'), JSON.stringify(patch, null, 2), 'utf8');
console.log(`[harness] wrote diff-patch.json (${rows.length} rows)`);

// ------------ 4) Design Markdown --------------------------------------------
const md = api.bundleToMarkdown(targetBundle);
writeFileSync(resolve(outDir, 'design-doc.md'), md, 'utf8');
console.log(`[harness] wrote design-doc.md (${(md.length / 1024).toFixed(1)} KB)`);

// ------------ 5) ER HTML viewer ---------------------------------------------
const erApps = [
  { id: '100', name: '営業案件管理', recordCount: 1240,
    fields: [
      { code: 'rec', label: 'レコード番号', type: 'RECORD_NUMBER', isPK: true, required: true },
      { code: '顧客名', label: '顧客名', type: 'SINGLE_LINE_TEXT', required: true },
      { code: '担当顧客', label: '担当顧客', type: 'LOOKUP', isLookup: true },
      { code: '商品', label: '商品明細', type: 'SUBTABLE', inSubtable: false },
      { code: '商品名', label: '商品名', type: 'SINGLE_LINE_TEXT', inSubtable: true }
    ],
    relations: [
      { toApp: '101', kind: 'LOOKUP', fromLabel: '顧客マスタ参照' },
      { toApp: '102', kind: 'REFERENCE_TABLE', fromLabel: '対応履歴' }
    ],
    lookupCount: 1, refCount: 1, requiredCount: 2
  },
  { id: '101', name: '顧客マスタ', recordCount: 320,
    fields: [
      { code: 'rec', label: 'レコード番号', type: 'RECORD_NUMBER', isPK: true, required: true },
      { code: '会社名', label: '会社名', type: 'SINGLE_LINE_TEXT', required: true }
    ], relations: [], lookupCount: 0, refCount: 0, requiredCount: 1 },
  { id: '102', name: '対応履歴', recordCount: 5800,
    fields: [
      { code: 'rec', label: 'レコード番号', type: 'RECORD_NUMBER', isPK: true, required: true },
      { code: '案件', label: '案件参照', type: 'LOOKUP', isLookup: true }
    ],
    relations: [{ toApp: '100', kind: 'LOOKUP', fromLabel: '案件参照' }],
    lookupCount: 1, refCount: 0, requiredCount: 1 }
];
const erHtml = api.buildErHtml(erApps, { startAppId: '100', layoutName: 'dagre', fieldDensity: 'standard' });
writeFileSync(resolve(outDir, 'er-diagram.html'), erHtml, 'utf8');
console.log(`[harness] wrote er-diagram.html (${(erHtml.length / 1024).toFixed(1)} KB)`);

// ------------ 5b) ER HTML viewer: スペース指定（スペース内アプリ二重枠表現） --
const erSpaceApps = erApps.map((a) => (
  a.id === '102' ? a : { ...a, spaceId: '9' }
));
const erSpaceHtml = api.buildErHtml(erSpaceApps, {
  startAppId: '100',
  startAppIds: ['100', '101'],
  layoutName: 'dagre',
  fieldDensity: 'standard',
  spaceId: '9',
  spaceAppIds: ['100', '101']
});
writeFileSync(resolve(outDir, 'er-diagram-space.html'), erSpaceHtml, 'utf8');
console.log(`[harness] wrote er-diagram-space.html (${(erSpaceHtml.length / 1024).toFixed(1)} KB)`);

// ------------ 6) Records CSV (replicated builder; private in record.ts) -----
function escapeCsvCell(value) {
  if (value === null || value === undefined) return '';
  const s = String(value);
  if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}
function extractCsvFieldValue(rec, key) {
  const f = rec[key];
  if (!f || f.value === null || f.value === undefined) return '';
  if (Array.isArray(f.value)) {
    if (!f.value.length) return '';
    if (typeof f.value[0] === 'object') return JSON.stringify(f.value);
    return f.value.join(', ');
  }
  if (typeof f.value === 'object') return JSON.stringify(f.value);
  return f.value;
}
function buildRecordsCsvString(records, propKeys) {
  const lines = [propKeys.map(escapeCsvCell).join(',')];
  for (const rec of records) lines.push(propKeys.map(k => escapeCsvCell(extractCsvFieldValue(rec, k))).join(','));
  return '﻿' + lines.join('\n');
}
const sampleRecords = [
  { $id: { type: '__ID__', value: '1' }, レコード番号: { type: 'RECORD_NUMBER', value: '1' },
    顧客名: { type: 'SINGLE_LINE_TEXT', value: '株式会社サンプル' },
    金額: { type: 'NUMBER', value: '1234567' },
    ステータス: { type: 'DROP_DOWN', value: '商談中' },
    関係者: { type: 'USER_SELECT', value: [{ code: 'taro', name: '山田太郎' }] }
  },
  { $id: { type: '__ID__', value: '2' }, レコード番号: { type: 'RECORD_NUMBER', value: '2' },
    顧客名: { type: 'SINGLE_LINE_TEXT', value: 'テスト商事, 合同会社' },
    金額: { type: 'NUMBER', value: '50000' },
    ステータス: { type: 'DROP_DOWN', value: '受注' },
    関係者: { type: 'USER_SELECT', value: [] }
  }
];
const csv = buildRecordsCsvString(sampleRecords, ['$id', 'レコード番号', '顧客名', '金額', 'ステータス', '関係者']);
writeFileSync(resolve(outDir, 'records.csv'), csv, 'utf8');
console.log(`[harness] wrote records.csv`);

// ------------ 7) Process Mermaid (string template only, no DOM) -------------
const pfStates = { '受付': {}, '一次対応中': {}, '完了': {}, '却下': {} };
const pfActions = [
  { from: '受付', to: '一次対応中', name: '対応開始' },
  { from: '一次対応中', to: '完了', name: '完了' },
  { from: '一次対応中', to: '却下', name: '却下' }
];
const safeStateName = (n) => String(n == null ? '' : n).replace(/[*_~\[\]()]/g, '');
const safeActionName = (n) => String(n == null ? '' : n).replace(/[*_~\[\]()"]/g, '');
let mmd = 'stateDiagram-v2\n';
const startSet = new Set(Object.keys(pfStates));
for (const a of pfActions) startSet.delete(a.to);
for (const s of startSet) mmd += `    [*] --> ${safeStateName(s)}\n`;
for (const a of pfActions) mmd += `    ${safeStateName(a.from)} --> ${safeStateName(a.to)} : ${safeActionName(a.name)}\n`;
writeFileSync(resolve(outDir, 'process-flow.mmd'), mmd, 'utf8');
console.log(`[harness] wrote process-flow.mmd`);

// ------------ 8) Bundle JSON (raw kintone settings export) ------------------
writeFileSync(resolve(outDir, 'bundle.json'),
  JSON.stringify({ generatedAt: isoNow, source: sourceBundle, target: targetBundle }, null, 2), 'utf8');
console.log(`[harness] wrote bundle.json`);

console.log('\n[harness] DONE — outputs/ contains:');
console.log('  diff-report.html  (差分HTML)');
console.log('  diff-patch.json   (差分パッチ JSON)');
console.log('  bundle.json       (比較バンドル JSON)');
console.log('  design-doc.md     (設計書 Markdown)');
console.log('  er-diagram.html   (ER図ビューア)');
console.log('  records.csv       (レコード CSV)');
console.log('  process-flow.mmd  (プロセス図 Mermaid)');
