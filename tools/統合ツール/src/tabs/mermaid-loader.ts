'use strict';

/**
 * プロセス図の描画に使う Mermaid の読み込み。
 *
 * Mermaid は約 3MB あるため同梱せず、固定版を CDN から読み込む。kintone の画面の中で実行するスクリプトなので、
 * 配布物のハッシュ（SRI: `integrity`）と `crossorigin="anonymous"` を付け、内容が一致しないものは実行させない。
 * ハッシュは npm の `mermaid@10.6.1` の `dist/mermaid.min.js` から計算した値。jsDelivr の `/npm/` と unpkg は
 * npm の配布物をそのまま配るため同じ値で検証できる。cdnjs は同じバイト列と確かめられないため候補に入れない。
 * 読み込めない・検証に失敗したときは、呼び出し元が簡易表示（状態と遷移の表）に切り替える。
 */

export const MERMAID_VERSION = '10.6.1';
export const MERMAID_INTEGRITY = 'sha384-+NGfjU8KzpDLXRHduEqW+ZiJr2rIg+cidUVk7B51R5xK7cHwMKQfrdFwGdrq1Bcz';

export interface MermaidScriptSource {
  url: string;
  integrity: string;
}

/** 試す順。どちらも同じ配布物（npm の dist/mermaid.min.js）を同じハッシュで検証する。 */
export const MERMAID_SCRIPT_SOURCES: readonly MermaidScriptSource[] = Object.freeze([
  Object.freeze({ url: `https://cdn.jsdelivr.net/npm/mermaid@${MERMAID_VERSION}/dist/mermaid.min.js`, integrity: MERMAID_INTEGRITY }),
  Object.freeze({ url: `https://unpkg.com/mermaid@${MERMAID_VERSION}/dist/mermaid.min.js`, integrity: MERMAID_INTEGRITY })
]);

/** 1 つの読み込み先を待つ上限。応答が返らない回線で、図の表示がいつまでも待たされないようにする。 */
export const MERMAID_LOAD_TIMEOUT_MS = 30_000;

/** 図の描画ライブラリを読み込めなかったときに利用者へ見せる文言（読み込み先の URL などは出さずログへ回す）。 */
export const MERMAID_LOAD_FAILURE_MESSAGE = '図の描画ライブラリ（Mermaid）を読み込めないか、内容を検証できませんでした。ネットワークやブラウザの制限を確認してください。';

let mermaidLoadPromise: Promise<void> | null = null;

function loadScript(source: MermaidScriptSource): Promise<void> {
  const { url, integrity } = source;
  return new Promise<void>((resolve, reject) => {
    let cspViolation: any = null;
    const onPolicyViolation = (ev: any) => {
      const blocked = String(ev.blockedURI || '');
      if (blocked === url || blocked.includes('mermaid')) {
        cspViolation = ev;
      }
    };
    // 他の機能やページ側が同じ URL を読み込んでいても、検証付きでないものは信用しない（同じ integrity の要素だけ共有する）。
    const existing = Array.from(document.querySelectorAll<HTMLScriptElement>(`script[src="${url}"]`))
      .find((script) => script.getAttribute('integrity') === integrity && script.dataset.failed !== '1') || null;
    if (existing) {
      if (existing.dataset.loaded === '1') {
        resolve();
      } else {
        existing.addEventListener('load', () => resolve(), { once: true });
        existing.addEventListener('error', () => reject(new Error(`スクリプト読み込み失敗: ${url}`)), { once: true });
      }
      return;
    }
    const s = document.createElement('script');
    s.src = url;
    s.integrity = integrity;
    s.crossOrigin = 'anonymous';
    s.async = true;
    document.addEventListener('securitypolicyviolation', onPolicyViolation as any, false);
    let settled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const finish = () => {
      settled = true;
      if (timer !== undefined) clearTimeout(timer);
      document.removeEventListener('securitypolicyviolation', onPolicyViolation as any, false);
    };
    s.onload = () => {
      if (settled) return;
      finish();
      s.dataset.loaded = '1';
      resolve();
    };
    s.onerror = () => {
      if (settled) return;
      finish();
      s.dataset.failed = '1';
      // ネットワークの失敗と SRI の不一致は error イベントでは区別できない（ブラウザのコンソールに理由が出る）
      if (cspViolation) {
        reject(new Error(
          `スクリプト読み込み失敗(CSP): ${url} / directive=${cspViolation.effectiveDirective || 'unknown'} / blocked=${cspViolation.blockedURI || 'unknown'}`
        ));
        return;
      }
      reject(new Error(`スクリプト読み込み失敗（通信できないか、内容が固定版と一致しません）: ${url}`));
    };
    timer = setTimeout(() => {
      if (settled) return;
      finish();
      s.dataset.failed = '1';
      reject(new Error(`スクリプト読み込みが ${MERMAID_LOAD_TIMEOUT_MS / 1000} 秒以内に完了しませんでした: ${url}`));
    }, MERMAID_LOAD_TIMEOUT_MS);
    document.head.appendChild(s);
  });
}

async function loadFirstAvailable(sources: readonly MermaidScriptSource[]): Promise<void> {
  // すべての読み込み先の失敗理由をログに残せるよう、最後の 1 件だけでなく全件をまとめる
  const failures: string[] = [];
  for (const source of sources) {
    try {
      await loadScript(source);
      return;
    } catch (e) {
      failures.push(e instanceof Error ? e.message : String(e));
    }
  }
  throw new Error(failures.join('\n') || 'Mermaid.js の読み込みに失敗しました');
}

/** 固定版の Mermaid を検証付きで読み込む（読み込み中は 1 つの Promise を共有し、失敗したら次回やり直せる）。 */
export function loadMermaidScript(): Promise<void> {
  if (!mermaidLoadPromise) {
    mermaidLoadPromise = loadFirstAvailable(MERMAID_SCRIPT_SOURCES).catch((err) => {
      mermaidLoadPromise = null;
      throw err;
    });
  }
  return mermaidLoadPromise;
}
