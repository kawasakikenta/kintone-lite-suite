'use strict';

import { LiteZip } from './archive/lite-zip.js';

/**
 * lite 版共通の ZIP コンストラクタを返す。
 *
 * 以前は JSZip を CDN から kintone の画面へ読み込んでいたが、社内ネットワークで CDN が遮断されると
 * ZIP 保存が使えず、内容を検証していないスクリプトを管理者のセッションで実行することにもなっていた。
 * 今は自前実装（`archive/lite-zip.ts`）を返す。通信はせず、ページに既にある `window.JSZip` も使わない。
 * 呼び出し元が `const Zip = await loadJSZipLite(); const zip = new Zip();` の形で使うため、名前と形は変えない。
 */
export function loadJSZipLite(): Promise<any> {
  return Promise.resolve(LiteZip);
}
