'use strict';

// ER図 HTML へ同梱する描画ライブラリ。
// package.json の devDependencies に固定した版の配布ファイルをビルド時に取り込み（`?raw`）、
// 生成する HTML へインラインで埋め込む。実行時に CDN へ接続しないため、社内ネットワークでも図を描画できる。
import cytoscapeSource from 'cytoscape/dist/cytoscape.min.js?raw';
import dagreSource from 'dagre/dist/dagre.min.js?raw';
import cytoscapeDagreSource from 'cytoscape-dagre/cytoscape-dagre.js?raw';
import dagreLicense from 'dagre/LICENSE?raw';
import graphlibLicense from 'graphlib/LICENSE?raw';
import lodashLicense from 'lodash/LICENSE?raw';
import cytoscapeDagreLicense from 'cytoscape-dagre/LICENSE?raw';

export interface ErBundledLibrary {
  /** script 要素の id（`er-lib-` + 名前） */
  id: string;
  name: string;
  /** package.json に固定している版（テストで配布ファイルの版と照合する） */
  version: string;
  /** 読み込み後に window に現れる名前 */
  globalName: string;
  /** 配布ファイルの内容（先頭にライセンス表記を付ける） */
  source: string;
  license: string;
}

/** `*\/` がコメントを閉じないよう分ける。 */
function toBlockComment(text: string): string {
  return `/*!\n${String(text).trim().replace(/\*\//g, '* /')}\n*/\n`;
}

/** 配布ファイル自体が著作権コメントを持たない（または依存ライブラリの表記が落ちている）ものにだけ、LICENSE の全文を前置する。 */
const dagreNotice = toBlockComment([
  'dagre 0.8.5 (dagre.min.js) - https://github.com/dagrejs/dagre',
  'This file also bundles graphlib and lodash, which are distributed under the MIT License.',
  '',
  '--- dagre ---',
  dagreLicense,
  '--- graphlib ---',
  graphlibLicense,
  '--- lodash ---',
  lodashLicense
].join('\n'));

const cytoscapeDagreNotice = toBlockComment([
  'cytoscape-dagre 2.5.0 - https://github.com/cytoscape/cytoscape.js-dagre',
  '',
  cytoscapeDagreLicense
].join('\n'));

/** 読み込む順。cytoscape-dagre は cytoscape と dagre の後に評価される必要がある。 */
export const ER_BUNDLED_LIBRARIES: readonly ErBundledLibrary[] = Object.freeze([
  // cytoscape.min.js は先頭に MIT の著作権コメントを持つため、そのまま使う。
  { id: 'er-lib-cytoscape', name: 'cytoscape', version: '3.28.1', globalName: 'cytoscape', source: cytoscapeSource, license: 'MIT' },
  { id: 'er-lib-dagre', name: 'dagre', version: '0.8.5', globalName: 'dagre', source: dagreNotice + dagreSource, license: 'MIT' },
  { id: 'er-lib-cytoscape-dagre', name: 'cytoscape-dagre', version: '2.5.0', globalName: 'cytoscapeDagre', source: cytoscapeDagreNotice + cytoscapeDagreSource, license: 'MIT' }
]);

/** インラインの script 要素を閉じてしまう文字列だけを無害にする（`safeJsonForScript` と同じ考え方）。 */
export function escapeInlineScriptSource(source: string): string {
  return String(source).replace(/<\/(script)/gi, '<\\/$1');
}

/** 生成 HTML の head へ置く、ライブラリを埋め込んだ script 要素の並び。 */
export function buildErLibraryScripts(): string {
  return ER_BUNDLED_LIBRARIES
    .map((lib) => `<script id="${lib.id}">${escapeInlineScriptSource(lib.source)}\n<\/script>`)
    .join('\n');
}
