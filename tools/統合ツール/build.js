const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

const watch = process.argv.includes('--watch');

const toolsDir = path.resolve(__dirname, '..');
const outfile = path.resolve(toolsDir, '統合ツール_差分反映追加設計書.js');
const inventoryFile = path.resolve(toolsDir, '単機能スクリプト棚卸し.md');

const STANDALONE_TOOLS = [
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

function createStandaloneSource(tab) {
  return `(function (global) {
  'use strict';

  const 統合ツール候補パス = [
    './統合ツール_差分反映追加設計書.js',
    './tools/統合ツール_差分反映追加設計書.js'
  ];

  function タブを開く() {
    const 別ウィンドウ = global.__KUS_TOOL_WINDOW__;
    const rootDoc = (別ウィンドウ && !別ウィンドウ.closed && 別ウィンドウ.document) ? 別ウィンドウ.document : document;
    const ランチャー = rootDoc.querySelector('[data-launch-feature][data-launch-tab="${tab}"]');
    if (ランチャー) {
      ランチャー.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      return true;
    }
    const タブ = rootDoc.querySelector('.tab[data-tab="${tab}"]');
    if (タブ) {
      タブ.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      return true;
    }
    return false;
  }

  function タブ起動待機(retries) {
    if (タブを開く()) return;
    if (retries <= 0) {
      console.warn('[統合ツール] タブ切り替えに失敗しました:', '${tab}');
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
        alert('統合ツール本体を読み込めませんでした。統合版ブックマークレットを先に実行してください。');
      };
      document.head.appendChild(fallback);
    };
    document.head.appendChild(script);
  }

  統合ツール本体を読み込む(() => タブ起動待機(25));
})(window);
`;
}

function createInventorySource() {
  const mappingRows = STANDALONE_TOOLS
    .map((item) => `| \`${item.file}\` | \`${item.module}\` | 単機能スタンドアロン | タブを直接起動する専用ツールとして自動生成 |`)
    .join('\n');

  const featureRows = STANDALONE_TOOLS
    .map((item) => `| ${item.feature} | \`tools/統合ツール/src/${item.module}\` | \`tools/${item.file}\` |`)
    .join('\n');

  return `# tools/ 単機能スクリプト棚卸し（統合ツール対応）

統合方針: \`tools/統合ツール/src/tabs/\` を**正規実装**とし、\`tools/*.js\` は**単機能スタンドアロン実行スクリプト**として管理する。

各スクリプトは統合バンドルを読み込み後、対象タブを自動で開く。\`tools/統合ツール起動.js\` のような共通エントリは作成しない。

## マッピング表

| 単機能スクリプト | 統合側モジュール | 判定 | 対応方針 |
|---|---|---|---|
${mappingRows}

## 運用ルール

- 単機能スクリプトはすべて \`npm run build\` で再生成する。
- \`tools/*.js\` は手編集せず、\`tools/統合ツール/src/tabs/*.js\` 側を修正する。
- 単体で実行しても対象機能へ直接遷移することを前提とする。

## 機能一覧表

| 機能名 | 正規モジュール | 単機能スクリプト |
|---|---|---|
${featureRows}
`;
}

async function generateStandaloneTools() {
  const managedFiles = STANDALONE_TOOLS.map((item) => path.resolve(toolsDir, item.file));

  let removedCount = 0;
  for (const file of managedFiles) {
    if (fs.existsSync(file)) {
      await fs.promises.unlink(file);
      removedCount += 1;
    }
  }

  for (const item of STANDALONE_TOOLS) {
    const target = path.resolve(toolsDir, item.file);
    await fs.promises.writeFile(target, createStandaloneSource(item.tab), 'utf8');
  }
  await fs.promises.writeFile(inventoryFile, createInventorySource(), 'utf8');
  console.log(`Removed managed standalone files: ${removedCount}`);
  console.log(`Generated standalone single-purpose tools: ${STANDALONE_TOOLS.length} files + inventory`);
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
    await generateStandaloneTools();
    console.log('Watching for changes...');
  } else {
    await ctx.rebuild();
    await ctx.dispose();
    await generateStandaloneTools();
    const stat = fs.statSync(outfile);
    console.log(`Built: ${outfile} (${(stat.size / 1024).toFixed(1)} KB)`);
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
