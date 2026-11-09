'use strict';

const fs = require('fs');

/**
 * `import text from 'pkg/file.js?raw'` でファイルの中身を文字列として取り込む esbuild プラグイン。
 * vitest（Vite）の `?raw` と同じ書き方にそろえてあり、単体テストとビルドで同じソースを使える。
 * ER図 HTML へ同梱するライブラリ（Cytoscape・Dagre・cytoscape-dagre）の配布ファイルとライセンス文の取り込みに使う。
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
      return { path: resolved.path, namespace: 'raw-text' };
    });
    build.onLoad({ filter: /.*/, namespace: 'raw-text' }, async (args) => ({
      contents: await fs.promises.readFile(args.path, 'utf8'),
      loader: 'text'
    }));
  }
};

module.exports = { rawTextPlugin };
