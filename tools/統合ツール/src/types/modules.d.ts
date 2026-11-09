declare module '*.css' {
  const content: string;
  export default content;
}

// 設計書 Excel 用に同梱する xlsx-js-style（配布物の UMD。build.js が取り込み方を決める）
declare module 'xlsx-js-style/dist/xlsx.min.js';

declare const specialCells: any;
