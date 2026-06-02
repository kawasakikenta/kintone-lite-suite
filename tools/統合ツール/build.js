const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

const watch = process.argv.includes('--watch');

const toolsDir = path.resolve(__dirname, '..');
const outfile = path.resolve(toolsDir, '統合ツール.js');
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

function createStandaloneSource(item) {
  const tab = item.tab;
  const displayLabel = item.label || 'ツール';
  const subTab = item.subTab || '';
  const subTabParent = item.subTabParent || item.tab || '';
  return `(function (global) {
  'use strict';

  const LABEL = ${JSON.stringify(displayLabel)};
  const TAB = ${JSON.stringify(tab)};
  const SUBTAB = ${JSON.stringify(subTab)};
  const SUBTAB_PARENT = ${JSON.stringify(subTabParent)};

  function showLoader() {
    if (global.document.getElementById('kus-standalone-loader')) return;
    var wrap = global.document.createElement('div');
    wrap.id = 'kus-standalone-loader';
    wrap.style.cssText = 'position:fixed;z-index:999997;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(15,23,42,.48);backdrop-filter:blur(6px);font:14px system-ui,sans-serif;';
    var box = global.document.createElement('div');
    box.style.cssText = 'background:linear-gradient(165deg,#1e293b,#0f172a);color:#f8fafc;padding:22px 28px;border-radius:14px;box-shadow:0 20px 50px rgba(0,0,0,.4);max-width:min(400px,90vw);text-align:center;line-height:1.45;border:1px solid #334155';
    var title = global.document.createElement('div');
    title.style.cssText = 'font-size:16px;font-weight:700;margin-bottom:8px';
    title.textContent = LABEL;
    var sub = global.document.createElement('div');
    sub.style.cssText = 'font-size:13px;color:#cbd5e1';
    sub.textContent = '統合ツール.js を読み込み、該当タブのみ前面に表示します…';
    box.appendChild(title);
    box.appendChild(sub);
    wrap.appendChild(box);
    global.document.body.appendChild(wrap);
  }

  function hideLoader() {
    var el = global.document.getElementById('kus-standalone-loader');
    if (el) el.remove();
  }

  const 統合ツール候補パス = [
    './統合ツール.js',
    './tools/統合ツール.js'
  ];

  function 切替対象を開く() {
    const 別ウィンドウ = global.__KUS_TOOL_WINDOW__;
    const rootDoc = (別ウィンドウ && !別ウィンドウ.closed && 別ウィンドウ.document) ? 別ウィンドウ.document : document;
    const ランチャー = rootDoc.querySelector('[data-launch-feature][data-launch-tab="' + TAB + '"]');
    if (ランチャー) {
      ランチャー.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    } else {
      const タブ = rootDoc.querySelector('.tab[data-tab="' + TAB + '"]');
      if (!タブ) return false;
      タブ.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    }
    if (!SUBTAB) return true;
    const サブタブ = rootDoc.querySelector('.subtab[data-subtab-parent="' + SUBTAB_PARENT + '"][data-subtab="' + SUBTAB + '"]');
    if (!サブタブ) return false;
    サブタブ.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    return true;
  }

  function タブ起動待機(retries) {
    if (切替対象を開く()) return;
    if (retries <= 0) {
      console.warn('[統合ツール] 画面切り替えに失敗しました:', TAB, SUBTAB);
      return;
    }
    setTimeout(() => タブ起動待機(retries - 1), 200);
  }

  function 統合ツール本体を読み込む(onLoaded) {
    if (global.__KUS_BUNDLE_LOADING__) {
      setTimeout(() => 統合ツール本体を読み込む(onLoaded), 120);
      return;
    }

    if (global.__KUS_TOOL_WINDOW__ && !global.__KUS_TOOL_WINDOW__.closed) {
      onLoaded();
      return;
    }

    const existing = document.querySelector('script[data-kus-bundle="1"]');
    if (existing) {
      existing.addEventListener('load', onLoaded, { once: true });
      return;
    }

    global.__KUS_BUNDLE_LOADING__ = true;
    const script = document.createElement('script');
    script.dataset.kusBundle = '1';
    script.src = 統合ツール候補パス[0];
    script.onload = () => {
      global.__KUS_BUNDLE_LOADING__ = false;
      onLoaded();
    };
    script.onerror = () => {
      const fallback = document.createElement('script');
      fallback.dataset.kusBundle = '1';
      fallback.src = 統合ツール候補パス[1];
      fallback.onload = () => {
        global.__KUS_BUNDLE_LOADING__ = false;
        onLoaded();
      };
      fallback.onerror = () => {
        global.__KUS_BUNDLE_LOADING__ = false;
        hideLoader();
        alert('統合ツール本体を読み込めませんでした。統合版ブックマークレットを先に実行してください。');
      };
      document.head.appendChild(fallback);
    };
    document.head.appendChild(script);
  }

  showLoader();
  統合ツール本体を読み込む(function () {
    hideLoader();
    タブ起動待機(25);
  });
})(window);
`;
}

function describeStandaloneKind(item) {
  if (!item.bundleEntry) {
    return '薄いラッパー（\`統合ツール.js\` 読み込み）';
  }
  const e = item.bundleEntry;
  if (e === 'diff-lite-entry.js') {
    return '軽量 esbuild 同梱（\`diff-lite-ui.js\` 等・\`統合ツール.js\` 不要）';
  }
  if (e.startsWith('suite-tab-')) {
    return `フル UI esbuild 同梱（\`src/entries/${e}\` → \`boot.js\`・ファイルサイズ大・\`統合ツール.js\` 不要）`;
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

  return `# tools/ 単機能スクリプト棚卸し（統合ツール対応）

統合方針: \`tools/統合ツール/src/tabs/\` を**正規実装**とし、\`tools/*.js\` は**単機能スタンドアロン実行スクリプト**として管理する。

各単機能スクリプトは \`STANDALONE_LAUNCH_ENTRIES\` の \`bundleEntry\`（\`src/entries/*-lite-entry.js\`）から esbuild で生成される**軽量 lite バンドル**で、その機能に必要なコードのみを単一スクリプトに同梱する（\`統合ツール.js\` 不要・全機能の重複同梱なし）。\`bundleEntry\` を持たないエントリを追加した場合のみ、\`統合ツール.js\` を読み込んで該当タブを開く**薄いラッパー**として生成される。

## マッピング表

| 単機能スクリプト | 統合側モジュール | 判定 | 対応方針 |
|---|---|---|---|
${mappingRows}

## 運用ルール

- 単機能スクリプトはすべて \`npm run build\` で再生成する（エントリ一覧は \`tools/統合ツール/src/featureDefs.mjs\` の \`STANDALONE_LAUNCH_ENTRIES\`）。
- \`STANDALONE_LAUNCH_ENTRIES\` の各項目は \`bundleEntry\` で esbuild される。\`window.__KUS__.runDiffStandalone\` は \`register-api.js\`（統合版・フル単機バンドル双方に含まれる場合あり）で公開。
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

function buildMainBundleBanner() {
  return [
    `// ==========================================================================`,
    `// 統合ツール.js  —  自動生成ファイル（手編集禁止）`,
    `// ==========================================================================`,
    `// このファイルは tools/統合ツール/ の npm run build (esbuild) で生成されます。`,
    `// エントリ: tools/統合ツール/src/index.js`,
    `//`,
    `// ■ 修正する場合は tools/統合ツール/src/ 配下のソースを編集し、`,
    `//   cd tools/統合ツール && npm run build で再生成してください。`,
    `// ■ このファイルを直接編集しても次回ビルドで上書きされます。`,
    `// ==========================================================================`,
  ].join('\n');
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
      plugins: [jsToTsResolver, cssPlugin],
      banner: { js: buildBanner(item) },
      logLevel: 'info'
    });
    const st = fs.statSync(outAbs);
    console.log(`Built standalone bundle: ${item.file} (${(st.size / 1024).toFixed(1)} KB)`);
  }
}

async function writeThinStandaloneTools(entries) {
  let written = 0;
  for (const item of entries) {
    if (item.bundleEntry) continue;
    const target = path.resolve(toolsDir, item.file);
    await fs.promises.writeFile(target, createStandaloneSource(item), 'utf8');
    written += 1;
  }
  await fs.promises.writeFile(inventoryFile, createInventorySource(entries), 'utf8');
  console.log(`Generated thin standalone wrappers: ${written} files + inventory`);
}

async function run() {
  const standaloneEntries = await loadStandaloneLaunchEntries();

  const removed = await cleanManagedStandaloneFiles(standaloneEntries);
  console.log(`Removed managed standalone files: ${removed}`);

  const ctx = await esbuild.context({
    entryPoints: [path.resolve(__dirname, 'src', 'index.js')],
    bundle: true,
    format: 'iife',
    outfile,
    charset: 'utf8',
    target: ['es2020'],
    minify: false,
    plugins: [jsToTsResolver, cssPlugin],
    banner: { js: buildMainBundleBanner() },
    logLevel: 'info'
  });

  if (watch) {
    await ctx.watch();
    await buildStandaloneBundles(standaloneEntries);
    await writeThinStandaloneTools(standaloneEntries);
    console.log('Watching for changes...');
  } else {
    await ctx.rebuild();
    await ctx.dispose();
    await buildStandaloneBundles(standaloneEntries);
    await writeThinStandaloneTools(standaloneEntries);
    const stat = fs.statSync(outfile);
    console.log(`Built: ${outfile} (${(stat.size / 1024).toFixed(1)} KB)`);
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
