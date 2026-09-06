'use strict';

import { EXTERNAL_LIBRARIES } from './constants.js';

/**
 * lite 版共通の JSZip 動的ローダ。
 * 旧統合 UI の tabs/record.ts にある loadJSZip はポップアウト用 document を参照するため、
 * lite バンドルからは本モジュールを使い、UI 層への依存を持ち込まない。
 */
let loadPromise: Promise<any> | null = null;
const failedScripts = new WeakSet<HTMLScriptElement>();
const JSZIP_LOAD_TIMEOUT_MS = 30_000;

export function loadJSZipLite(): Promise<any> {
  const w = window as any;
  if (w.JSZip) return Promise.resolve(w.JSZip);
  if (loadPromise) return loadPromise;
  const src = EXTERNAL_LIBRARIES.jszip.cdnUrl || '';
  loadPromise = new Promise((resolve, reject) => {
    // 他機能が読み込み中の要素は共有する。既に失敗を観測した要素は再利用しない。
    const existing = Array.from(document.querySelectorAll<HTMLScriptElement>(`script[src="${src}"]`))
      .find((script) => !failedScripts.has(script));
    const script = existing || document.createElement('script');
    let settled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const cleanup = () => {
      if (timer !== undefined) clearTimeout(timer);
      script.removeEventListener('load', settle);
      script.removeEventListener('error', onError);
    };
    const fail = (error: Error) => {
      if (settled) return;
      settled = true;
      cleanup();
      failedScripts.add(script);
      // 自前の失敗要素だけを取り除き、他機能の要素やハンドラは維持する。
      if (!existing) script.remove();
      reject(error);
    };
    const settle = () => {
      if (settled) return;
      const ctor = w.JSZip;
      if (!ctor) {
        fail(new Error('JSZipのロード後もグローバル変数が見つかりません'));
        return;
      }
      settled = true;
      cleanup();
      resolve(ctor);
    };
    const onError = () => fail(new Error(`JSZipの読み込みに失敗しました（${src}）。CSP やネットワーク制限を確認してください`));
    script.addEventListener('load', settle, { once: true });
    script.addEventListener('error', onError, { once: true });
    timer = setTimeout(() => {
      if (w.JSZip) settle();
      else fail(new Error('JSZipの読み込みが30秒以内に完了しませんでした。CSP やネットワーク制限を確認して再試行してください'));
    }, JSZIP_LOAD_TIMEOUT_MS);
    if (!existing) {
      try {
        script.src = src;
        script.async = true;
        document.head.appendChild(script);
      } catch (error) {
        fail(error instanceof Error ? error : new Error(String(error)));
      }
    }
  }).catch((error) => {
    loadPromise = null;
    throw error;
  });
  return loadPromise;
}
