const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const { rawTextPlugin } = require('./rawTextPlugin.js');

const watch = process.argv.includes('--watch');

const toolsDir = path.resolve(__dirname, '..');
const inventoryFile = path.resolve(toolsDir, '単機能スクリプト棚卸し.md');

async function loadStandaloneLaunchEntries() {
  const href = pathToFileURL(path.resolve(__dirname, 'src', 'featureDefs.mjs')).href;
  const mod = await import(href);
  const { FEATURE_DEFS, STANDALONE_LAUNCH_ENTRIES } = mod;
  const allowedTabs = new Set(FEATURE_DEFS.flatMap((f) => f.tabs));
  for (const e of STANDALONE_LAUNCH_ENTRIES) {
    if (!allowedTabs.has(e.tab)) {
      console.warn(`[build] STANDALONE_LAUNCH_ENTRIES: tab "${e.tab}" is not listed in FEATURE_DEFS`);
    }
    if (!e.bundleEntry) {
      throw new Error(`[build] STANDALONE_LAUNCH_ENTRIES: ${e.file} must define bundleEntry because the full bundle is deprecated`);
    }
  }
  return STANDALONE_LAUNCH_ENTRIES;
}

const cssPlugin = {
  name: 'inline-css',
  setup(build) {
    build.onLoad({ filter: /\.css$/ }, async (args) => {
      const css = await fs.promises.readFile(args.path, 'utf8');
      const escaped = css.replace(/`/g, '\\`').replace(/\$/g, '\\$');
      return {
        contents: `export default \`${escaped}\`;`,
        loader: 'js'
      };
    });
  }
};

// xlsx-js-style（設計書作成.js へ同梱する Excel ライブラリ）をブラウザ版のスクリプトと同じ形で取り込むプラグイン。
// 配布物は UMD で、CommonJS として取り込むと ./cpexcel.js（約 470KB の文字コード表）まで巻き込み、
// window.XLSX の書き換えも行う。module・exports・require・define・window を隠した関数で包み、
// CDN から読み込んでいたとき（<script> のグローバル版）と同じ動作・同じ大きさにする。
// ライセンス（Apache-2.0）の表記は同梱物の先頭に残す。
const xlsxStyleBrowserPlugin = {
  name: 'xlsx-js-style-browser',
  setup(build) {
    build.onLoad({ filter: /xlsx-js-style[\\/]dist[\\/]xlsx\.min\.js$/ }, async (args) => {
      const source = await fs.promises.readFile(args.path, 'utf8');
      const body = source.replace(/^\/\/# sourceMappingURL=.*$/m, '');
      const notice = '/*! xlsx-js-style 1.2.0 (SheetJS Community Edition 0.18.5 + cell styles). Apache-2.0. '
        + 'Copyright (C) 2012-present SheetJS LLC, (C) gitbrent. https://github.com/gitbrent/xlsx-js-style */';
      return {
        loader: 'js',
        contents: `${notice}\nmodule.exports = (function (module, exports, require, define, window) {\n${body}\nreturn XLSX;\n})();\n`
      };
    });
  }
};

// .js インポートを .ts/.tsx に解決するプラグイン (TS 段階移行用)
// import './foo.js' と書かれていて foo.js が存在せず foo.ts/.tsx が存在する場合に
// 自動でそちらへフォールバックする。
const jsToTsResolver = {
  name: 'js-to-ts',
  setup(build) {
    build.onResolve({ filter: /\.js$/ }, async (args) => {
      if (args.kind !== 'import-statement' && args.kind !== 'require-call' && args.kind !== 'dynamic-import') {
        return null;
      }
      if (!args.path.startsWith('./') && !args.path.startsWith('../')) return null;
      const baseAbs = path.resolve(args.resolveDir, args.path);
      try {
        await fs.promises.access(baseAbs);
        return null;
      } catch (e) {
        for (const ext of ['.ts', '.tsx']) {
          const candidate = baseAbs.replace(/\.js$/, ext);
          try {
            await fs.promises.access(candidate);
            return { path: candidate };
          } catch (e2) { /* try next */ }
        }
        return null;
      }
    });
  }
};

function describeStandaloneKind(item) {
  const e = item.bundleEntry;
  if (e === 'diff-lite-entry.js') {
    return '軽量 esbuild 同梱（\`diff-lite-ui.js\` 等・\`統合ツール.js\` 不要）';
  }
  return `軽量 esbuild 同梱（\`src/entries/${e}\`・\`統合ツール.js\` 不要）`;
}

function createInventorySource(entries) {
  const mappingRows = entries
    .map((item) => {
      const kind = describeStandaloneKind(item);
      return `| \`${item.file}\` | \`${item.module}\` | ${kind} | ビルドで自動生成 |`;
    })
    .join('\n');

  const featureRows = entries
    .map((item) => `| ${item.label} | \`tools/統合ツール/src/${item.module}\` | \`tools/${item.file}\` |`)
    .join('\n');

  return `# tools/ 単機能スクリプト棚卸し（lite 版正規）

lite 版を正規の公開エントリポイントとし、廃止済みの統合版（\`tools/統合ツール.js\`）は生成・配布しません。

各単機能スクリプトは \`STANDALONE_LAUNCH_ENTRIES\` の \`bundleEntry\`（\`src/entries/*-lite-entry.js\`）から esbuild で生成される**軽量 lite バンドル**です。その機能に必要なコードのみを単一スクリプトに同梱し、\`統合ツール.js\` を別途読み込みません。

## マッピング表

| 単機能スクリプト | 統合側モジュール | 判定 | 対応方針 |
|---|---|---|---|
${mappingRows}

## 運用ルール

- 単機能スクリプトはすべて \`npm run build\` で再生成する（エントリ一覧は \`tools/統合ツール/src/featureDefs.mjs\` の \`STANDALONE_LAUNCH_ENTRIES\`）。
- \`STANDALONE_LAUNCH_ENTRIES\` の各項目は必ず \`bundleEntry\` を持ち、lite バンドルとして esbuild される。
- \`tools/*.js\` は手編集せず、\`tools/統合ツール/src/tabs/*.js\` 側を修正する。
- 単体で実行しても対象機能へ直接遷移することを前提とする。

## 機能一覧表

| 機能名 | 正規モジュール | 単機能スクリプト |
|---|---|---|
${featureRows}
`;
}

async function cleanManagedStandaloneFiles(entries) {
  let removedCount = 0;
  for (const item of entries) {
    const file = path.resolve(toolsDir, item.file);
    if (fs.existsSync(file)) {
      await fs.promises.unlink(file);
      removedCount += 1;
    }
  }
  return removedCount;
}

function buildBanner(item) {
  const lines = [
    `// ==========================================================================`,
    `// ${item.file}  —  自動生成ファイル（手編集禁止）`,
    `// ==========================================================================`,
    `// このファイルは tools/統合ツール/ の npm run build (esbuild) で生成されます。`,
    `// ソース: tools/統合ツール/src/entries/${item.bundleEntry}`,
    `//         tools/統合ツール/src/${item.module}  ← 機能の正規実装`,
    `//`,
    `// ■ 修正する場合は tools/統合ツール/src/ 配下のソースを編集し、`,
    `//   cd tools/統合ツール && npm run build で再生成してください。`,
    `// ■ このファイルを直接編集しても次回ビルドで上書きされます。`,
    `// ==========================================================================`,
  ];
  return lines.join('\n');
}

async function buildStandaloneBundles(entries) {
  const lite = entries.filter((e) => e.bundleEntry);
  for (const item of lite) {
    const outAbs = path.resolve(toolsDir, item.file);
    await esbuild.build({
      absWorkingDir: path.resolve(__dirname),
      entryPoints: [path.resolve(__dirname, 'src', 'entries', item.bundleEntry)],
      bundle: true,
      format: 'iife',
      outfile: outAbs,
      charset: 'utf8',
      target: ['es2020'],
      minify: false,
      plugins: [jsToTsResolver, cssPlugin, rawTextPlugin, xlsxStyleBrowserPlugin],
      banner: { js: buildBanner(item) },
      logLevel: 'info'
    });
    const st = fs.statSync(outAbs);
    console.log(`Built standalone bundle: ${item.file} (${(st.size / 1024).toFixed(1)} KB)`);
  }
}

async function writeInventory(entries) {
  await fs.promises.writeFile(inventoryFile, createInventorySource(entries), 'utf8');
  console.log('Generated lite inventory');
}

async function run() {
  const standaloneEntries = await loadStandaloneLaunchEntries();
  const fullBundle = path.resolve(toolsDir, '統合ツール.js');

  if (fs.existsSync(fullBundle)) {
    await fs.promises.unlink(fullBundle);
    console.log('Removed deprecated full bundle: 統合ツール.js');
  }

  const removed = await cleanManagedStandaloneFiles(standaloneEntries);
  console.log(`Removed managed standalone files: ${removed}`);

  await buildStandaloneBundles(standaloneEntries);
  await writeInventory(standaloneEntries);

  if (watch) {
    console.log('Watch mode for lite bundles is not enabled; rerun npm run build after changes.');
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
