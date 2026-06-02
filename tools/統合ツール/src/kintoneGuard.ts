'use strict';

/**
 * 全エントリポイント共通の kintone 実行コンテキストガード。
 *
 * kintone の REST API / app コンテキストが利用できる画面でのみツールを起動する。
 * それ以外の画面では案内のアラートを表示し、起動処理は実行しない。
 */

const NOT_KINTONE_PAGE_MESSAGE = 'kintone画面で実行してください';

/** kintone の REST API / app コンテキストが利用可能かどうか。 */
export function isKintonePage(): boolean {
  return Boolean(window.kintone?.api && window.kintone?.app);
}

/**
 * kintone 画面でのみ `run` を実行する。
 * kintone 画面でない場合は案内アラートを表示して何もしない。
 */
export function runOnKintonePage(run: () => void): void {
  if (!isKintonePage()) {
    alert(NOT_KINTONE_PAGE_MESSAGE);
    return;
  }
  run();
}
