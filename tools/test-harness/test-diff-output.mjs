// Quick smoke test: ensure the diff core actually produces rows.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import vm from 'node:vm';

const __dirname = dirname(fileURLToPath(import.meta.url));
const bundlePath = resolve(__dirname, '../統合ツール.js');
const bundle = readFileSync(bundlePath, 'utf-8');

// Minimal browser-ish sandbox so the IIFE can register window.__KUS__.
const sandbox = {};
const ctx = vm.createContext(sandbox);
const noop = () => {};
const fakeWindow = {
  __KUS__: undefined,
  __KUS_AUTOBOOT__: false,                 // stop boot.ts from running runKintoneUnifiedSuite
  navigator: { clipboard: { writeText: () => Promise.resolve() } },
  alert: noop,
  prompt: () => '',
  confirm: () => true,
  setTimeout, clearTimeout, setInterval, clearInterval,
  open: () => null,
};
sandbox.window = fakeWindow;
sandbox.globalThis = sandbox;
sandbox.self = fakeWindow;
sandbox.document = {
  createElement: () => ({ style: {}, setAttribute: noop, appendChild: noop, addEventListener: noop, classList: { add: noop, remove: noop, toggle: noop } }),
  body: { appendChild: noop, removeChild: noop, classList: { add: noop, remove: noop, toggle: noop } },
  head: { appendChild: noop },
  getElementById: () => null,
  defaultView: fakeWindow,
};
sandbox.location = { href: '' };
sandbox.localStorage = { getItem: () => null, setItem: noop, removeItem: noop };
sandbox.sessionStorage = { getItem: () => null, setItem: noop, removeItem: noop };
sandbox.console = console;
sandbox.kintone = { api: () => Promise.resolve({}), app: { getId: () => 1 } };

vm.runInContext(bundle, ctx, { filename: '統合ツール.js' });

const kus = sandbox.window.__KUS__;
if (!kus || typeof kus.runDiffStandalone !== 'function') {
  console.error('[FAIL] window.__KUS__.runDiffStandalone not registered');
  process.exit(1);
}

const importedSourceBundle = {
  appId: '1', guestId: '', preview: false, fetchedAt: new Date().toISOString(),
  meta: { sectionRevisions: { fieldSettings: '5' } },
  sections: {
    fieldSettings: {
      properties: {
        field_a: { code: 'field_a', type: 'SINGLE_LINE_TEXT', label: '名前(旧)', required: true },
        field_b: { code: 'field_b', type: 'NUMBER', label: '金額', required: false },
      },
    },
  },
};
const importedTargetBundle = {
  appId: '2', guestId: '', preview: false, fetchedAt: new Date().toISOString(),
  meta: { sectionRevisions: { fieldSettings: '6' } },
  sections: {
    fieldSettings: {
      properties: {
        field_a: { code: 'field_a', type: 'SINGLE_LINE_TEXT', label: '名前(新)', required: true },
        field_b: { code: 'field_b', type: 'NUMBER', label: '金額', required: true },
        field_c: { code: 'field_c', type: 'DROP_DOWN', label: '区分', required: false },
      },
    },
  },
};

const log = [];
try {
  const result = await kus.runDiffStandalone({
    source: { appId: '1', guestId: '', preview: false },
    target: { appId: '2', guestId: '', preview: false },
    scopes: ['fieldSettings'],
    ignoreKeys: '',
    includeSame: false,
    importedSourceBundle,
    importedTargetBundle,
    onStatus: (m) => log.push(['status', m]),
    onProgress: (side, p, label) => log.push(['progress', side, p, label]),
  });
  console.log('[OK] runDiffStandalone returned. summary text:');
  console.log('  ', result.summary.text);
  console.log('rows:', result.rows.length);
  for (const r of result.rows.slice(0, 6)) {
    console.log('  -', r.type, r.severity, r.path);
  }
  if (!result.rows.length) {
    console.error('[FAIL] expected diff rows but got 0');
    process.exit(2);
  }
  console.log('\n[STATUS LOG]');
  for (const entry of log) console.log(' ', entry.join(' | '));
  process.exit(0);
} catch (e) {
  console.error('[FAIL] runDiffStandalone threw:', e && e.message || e);
  console.error(e && e.stack || '');
  process.exit(3);
}
