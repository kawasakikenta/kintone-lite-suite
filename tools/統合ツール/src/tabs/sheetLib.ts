'use strict';

/**
 * 設計書 Excel 用のスプレッドシートライブラリ（xlsx-js-style 1.2.0 = SheetJS 0.18.5 + セル書式）。
 *
 * 以前は jsDelivr から kintone の画面へ読み込んでいたが、社内ネットワークで CDN が遮断されると設計書 Excel が出せず、
 * 内容を検証していないスクリプトを管理者のセッションで実行することにもなっていた。今は `設計書作成.js` に同梱する
 * （`build.js` が配布物をブラウザ版のスクリプトと同じ形で取り込む）。ページ側の `window.XLSX` は使わず、書き換えもしない。
 */

let loading: Promise<any> | null = null;

/** 同梱のライブラリを返す。初回の呼び出しまでは評価しない。 */
export function loadSheetLib(): Promise<any> {
  if (!loading) {
    loading = import('xlsx-js-style/dist/xlsx.min.js').then((mod: any) => mod?.default ?? mod).catch((error) => {
      loading = null;
      throw error;
    });
  }
  return loading;
}
