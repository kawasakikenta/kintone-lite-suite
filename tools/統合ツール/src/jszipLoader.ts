'use strict';

import { EXTERNAL_LIBRARIES } from './constants.js';

/**
 * lite 版共通の JSZip 動的ローダ。
 * 旧統合 UI の tabs/record.ts にある loadJSZip はポップアウト用 document を参照するため、
 * lite バンドルからは本モジュールを使い、UI 層への依存を持ち込まない。
 */
let loadPromise: Promise<any> | null = null;

export function loadJSZipLite(): Promise<any> {
  const w = window as any;
  if (w.JSZip) return Promise.resolve(w.JSZip);
  if (loadPromise) return loadPromise;
  const src = EXTERNAL_LIBRARIES.jszip.cdnUrl || '';
  loadPromise = new Promise((resolve, reject) => {
    const settle = () => {
      const ctor = (window as any).JSZip;
      if (ctor) resolve(ctor);
      else reject(new Error('JSZipのロード後もグローバル変数が見つかりません'));
    };
    const fail = () => reject(new Error(`JSZipの読み込みに失敗しました（${src}）。CSP やネットワーク制限を確認してください`));
    const existing = document.querySelector(`script[src="${src}"]`) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener('load', settle, { once: true });
      existing.addEventListener('error', fail, { once: true });
      return;
    }
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.onload = settle;
    s.onerror = fail;
    document.head.appendChild(s);
  }).catch((error) => {
    loadPromise = null;
    throw error;
  });
  return loadPromise;
}
