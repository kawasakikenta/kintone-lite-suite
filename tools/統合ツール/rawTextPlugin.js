'use strict';

const fs = require('fs');
const path = require('path');

/**
 * `import text from 'pkg/file.js?raw'` でファイルの中身を文字列として取り込む esbuild プラグイン。
 * vitest（Vite）の `?raw` と同じ書き方にそろえてあり、単体テストとビルドで同じソースを使える。
 * ER図 HTML へ同梱するライブラリ（Cytoscape・Dagre・cytoscape-dagre）の配布ファイルとライセンス文の取り込みに使う。
 *
 * esbuild は取り込んだファイルのパスを、生成物のコメント（`// raw-text:...`）に書く。ここで絶対パスを渡すと、
 * ビルドした場所が生成物に残り、別の場所（CI など）でのビルド結果と一致しなくなる。
 * そのため esbuild にはこのファイルからの相対パスを渡し、読み込みに使う絶対パスは pluginData で受け渡す。
 */
const rawTextPlugin = {
  name: 'raw-text',
  setup(build) {
    build.onResolve({ filter: /\?raw$/ }, async (args) => {
      const target = args.path.replace(/\?raw$/, '');
      const resolved = await build.resolve(target, {
        kind: 'import-statement',
        resolveDir: args.resolveDir
      });
      if (resolved.errors.length) return { errors: resolved.errors };
      const relative = path.relative(__dirname, resolved.path).split(path.sep).join('/');
      return { path: relative, namespace: 'raw-text', pluginData: { file: resolved.path } };
    });
    build.onLoad({ filter: /.*/, namespace: 'raw-text' }, async (args) => ({
      contents: await fs.promises.readFile(args.pluginData.file, 'utf8'),
      loader: 'text'
    }));
  }
};

module.exports = { rawTextPlugin };
