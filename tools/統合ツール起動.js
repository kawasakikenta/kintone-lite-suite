(function (global) {
  'use strict';

  const 統合ツール候補パス = [
    './統合ツール_差分反映追加設計書.js',
    './tools/統合ツール_差分反映追加設計書.js'
  ];

  function タブを開く(tabKey) {
    const 別ウィンドウ = global.__KUS_TOOL_WINDOW__;
    const rootDoc = (別ウィンドウ && !別ウィンドウ.closed && 別ウィンドウ.document) ? 別ウィンドウ.document : document;
    const ランチャー = rootDoc.querySelector(`[data-launch-feature][data-launch-tab="${tabKey}"]`);
    if (ランチャー) {
      ランチャー.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      return true;
    }
    const タブ = rootDoc.querySelector(`.tab[data-tab="${tabKey}"]`);
    if (タブ) {
      タブ.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      return true;
    }
    return false;
  }

  function タブ起動待機(tabKey, retries) {
    if (タブを開く(tabKey)) return;
    if (retries <= 0) {
      console.warn('[統合ツール] タブ切り替えに失敗しました:', tabKey);
      return;
    }
    setTimeout(() => タブ起動待機(tabKey, retries - 1), 200);
  }

  function 統合ツール本体を読み込む(onLoaded) {
    if (global.__KUS_BUNDLE_LOADING__) {
      setTimeout(() => 統合ツール本体を読み込む(onLoaded), 120);
      return;
    }

    if (global.__KUS_TOOL_WINDOW__ && !global.__KUS_TOOL_WINDOW__.closed) {
      onLoaded();
      return;
    }

    const existing = document.querySelector('script[data-kus-bundle="1"]');
    if (existing) {
      existing.addEventListener('load', onLoaded, { once: true });
      return;
    }

    global.__KUS_BUNDLE_LOADING__ = true;
    const script = document.createElement('script');
    script.dataset.kusBundle = '1';
    script.src = 統合ツール候補パス[0];
    script.onload = () => {
      global.__KUS_BUNDLE_LOADING__ = false;
      onLoaded();
    };
    script.onerror = () => {
      const fallback = document.createElement('script');
      fallback.dataset.kusBundle = '1';
      fallback.src = 統合ツール候補パス[1];
      fallback.onload = () => {
        global.__KUS_BUNDLE_LOADING__ = false;
        onLoaded();
      };
      fallback.onerror = () => {
        global.__KUS_BUNDLE_LOADING__ = false;
        alert('統合ツール本体を読み込めませんでした。統合版ブックマークレットを先に実行してください。');
      };
      document.head.appendChild(fallback);
    };
    document.head.appendChild(script);
  }

  global.__統合ツールを開く = function (tabKey) {
    統合ツール本体を読み込む(() => タブ起動待機(tabKey, 25));
  };

  global.__openUnifiedToolTab = global.__openUnifiedToolTab || global.__統合ツールを開く;
})(window);
