const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

const watch = process.argv.includes('--watch');

const toolsDir = path.resolve(__dirname, '..');
const outfile = path.resolve(toolsDir, '統合ツール_差分反映追加設計書.js');
const launcherFile = path.resolve(toolsDir, '統合ツール起動.js');
const inventoryFile = path.resolve(toolsDir, '単機能スクリプト棚卸し.md');

const LEGACY_ENTRYPOINTS = [
  { feature: '差分比較', module: 'tabs/diff.js', file: '差分比較.js', tab: 'diff' },
  { feature: 'プレビュー反映', module: 'tabs/reflect.js', file: 'プレビュー反映.js', tab: 'reflect' },
  { feature: 'フィールド追加', module: 'tabs/field.js', file: 'フィールド追加.js', tab: 'field' },
  { feature: 'JS/CSS設定', module: 'tabs/jsconfig.js', file: 'kintoneJS取得.js', tab: 'jsconfig' },
  { feature: '設定一括取得', module: 'tabs/settings-export.js', file: '設定取得.js', tab: 'settingsExport' },
  { feature: '設計書', module: 'tabs/design.js', file: '設計書作成.js', tab: 'design' },
  { feature: 'ER図', module: 'tabs/er.js', file: 'ER図.js', tab: 'er' },
  { feature: 'プロセス図', module: 'tabs/process.js', file: 'プロセス実行.js', tab: 'processFlow' },
  { feature: 'レコード管理', module: 'tabs/record.js', file: 'kintoneレコード取得.js', tab: 'recordMgr' },
  { feature: 'SQL実行', module: 'tabs/sql.js', file: 'kintoneSQL.js', tab: 'sql' }
];

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

function createLauncherSource() {
  return `(function (global) {
  'use strict';

  const 統合ツール候補パス = [
    './統合ツール_差分反映追加設計書.js',
    './tools/統合ツール_差分反映追加設計書.js'
  ];

  function タブを開く(tabKey) {
    const 別ウィンドウ = global.__KUS_TOOL_WINDOW__;
    const rootDoc = (別ウィンドウ && !別ウィンドウ.closed && 別ウィンドウ.document) ? 別ウィンドウ.document : document;
    const ランチャー = rootDoc.querySelector(\`[data-launch-feature][data-launch-tab="\${tabKey}"]\`);
    if (ランチャー) {
      ランチャー.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      return true;
    }
    const タブ = rootDoc.querySelector(\`.tab[data-tab="\${tabKey}"]\`);
    if (タブ) {
      タブ.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      return true;
    }
    return false;
  }

  function タブ起動待機(tabKey, retries) {
    if (タブを開く(tabKey)) return;
    if (retries <= 0) {
      console.warn('[統合ツール] タブ切り替えに失敗しました:', tabKey);
      return;
    }
    setTimeout(() => タブ起動待機(tabKey, retries - 1), 200);
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
        alert('統合ツール本体を読み込めませんでした。統合版ブックマークレットを先に実行してください。');
      };
      document.head.appendChild(fallback);
    };
    document.head.appendChild(script);
  }

  global.__統合ツールを開く = function (tabKey) {
    統合ツール本体を読み込む(() => タブ起動待機(tabKey, 25));
  };

  global.__openUnifiedToolTab = global.__openUnifiedToolTab || global.__統合ツールを開く;
})(window);
`;
}

function createLegacyWrapperSource(tab) {
  return `(function () {
  'use strict';

  function open() {
    if (typeof window.__統合ツールを開く === 'function') {
      window.__統合ツールを開く('${tab}');
      return;
    }

    const loader = document.createElement('script');
    loader.src = './tools/統合ツール起動.js';
    loader.onload = () => window.__統合ツールを開く?.('${tab}');
    loader.onerror = () => alert('統合ツール起動スクリプトの読み込みに失敗しました。統合ツールを直接実行してください。');
    document.head.appendChild(loader);
  }

  open();
})();
`;
}

function createInventorySource() {
  const mappingRows = LEGACY_ENTRYPOINTS
    .map((item) => `| \`${item.file}\` | \`${item.module}\` | 統合版が上位互換 | 互換維持の薄いエントリポイントに置換 |`)
    .join('\n');

  const featureRows = LEGACY_ENTRYPOINTS
    .map((item) => `| ${item.feature} | \`tools/統合ツール/src/${item.module}\` | \`tools/${item.file}\` |`)
    .join('\n');

  return `# tools/ 単機能スクリプト棚卸し（統合ツール対応）

統合方針: \`tools/統合ツール/src/tabs/\` を**正規実装**とし、\`tools/*.js\` は互換用途の公開エントリのみを残す。

互換エントリの共通起動は \`tools/統合ツール起動.js\`（公開関数: \`window.__統合ツールを開く(tabKey)\`）を利用する。

## マッピング表

| 単機能スクリプト | 統合側モジュール | 判定 | 対応方針 |
|---|---|---|---|
${mappingRows}

## 削除対象の分類

- 上記 ${LEGACY_ENTRYPOINTS.length} 本は全て「統合版が上位互換」に分類済み。
- 互換エントリはビルド時に既存ファイルを削除してから再生成し、重複実装を残さない。
- そのため \`tools/*.js\` の単機能エントリは手編集せず、\`npm run build\` の自動生成結果を利用する。

## 運用ルール（機能一覧表）

| 機能名 | 正規モジュール | 公開エントリ |
|---|---|---|
${featureRows}
`;
}

async function generateLegacyEntrypoints() {
  const managedFiles = [
    launcherFile,
    ...LEGACY_ENTRYPOINTS.map((item) => path.resolve(toolsDir, item.file))
  ];

  let removedCount = 0;
  for (const file of managedFiles) {
    if (fs.existsSync(file)) {
      await fs.promises.unlink(file);
      removedCount += 1;
    }
  }

  await fs.promises.writeFile(launcherFile, createLauncherSource(), 'utf8');
  for (const item of LEGACY_ENTRYPOINTS) {
    const target = path.resolve(toolsDir, item.file);
    await fs.promises.writeFile(target, createLegacyWrapperSource(item.tab), 'utf8');
  }
  await fs.promises.writeFile(inventoryFile, createInventorySource(), 'utf8');
  console.log(`Removed duplicate legacy files: ${removedCount}`);
  console.log(`Generated legacy entrypoints: ${LEGACY_ENTRYPOINTS.length} files + launcher + inventory`);
}

async function run() {
  const ctx = await esbuild.context({
    entryPoints: [path.resolve(__dirname, 'src', 'index.js')],
    bundle: true,
    format: 'iife',
    outfile,
    charset: 'utf8',
    target: ['es2020'],
    minify: false,
    plugins: [cssPlugin],
    logLevel: 'info'
  });

  if (watch) {
    await ctx.watch();
    await generateLegacyEntrypoints();
    console.log('Watching for changes...');
  } else {
    await ctx.rebuild();
    await ctx.dispose();
    await generateLegacyEntrypoints();
    const stat = fs.statSync(outfile);
    console.log(`Built: ${outfile} (${(stat.size / 1024).toFixed(1)} KB)`);
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
