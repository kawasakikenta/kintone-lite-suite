(function (global) {
  'use strict';

  const LABEL = "プレビュー反映";
  const TAB = "reflect";
  const SUBTAB = "sectionPreview";
  const SUBTAB_PARENT = "reflect";

  function showLoader() {
    if (global.document.getElementById('kus-standalone-loader')) return;
    var wrap = global.document.createElement('div');
    wrap.id = 'kus-standalone-loader';
    wrap.style.cssText = 'position:fixed;z-index:999997;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(15,23,42,.48);backdrop-filter:blur(6px);font:14px system-ui,sans-serif;';
    var box = global.document.createElement('div');
    box.style.cssText = 'background:linear-gradient(165deg,#1e293b,#0f172a);color:#f8fafc;padding:22px 28px;border-radius:14px;box-shadow:0 20px 50px rgba(0,0,0,.4);max-width:min(400px,90vw);text-align:center;line-height:1.45;border:1px solid #334155';
    var title = global.document.createElement('div');
    title.style.cssText = 'font-size:16px;font-weight:700;margin-bottom:8px';
    title.textContent = LABEL;
    var sub = global.document.createElement('div');
    sub.style.cssText = 'font-size:13px;color:#cbd5e1';
    sub.textContent = '統合ツール.js を読み込み、該当タブのみ前面に表示します…';
    box.appendChild(title);
    box.appendChild(sub);
    wrap.appendChild(box);
    global.document.body.appendChild(wrap);
  }

  function hideLoader() {
    var el = global.document.getElementById('kus-standalone-loader');
    if (el) el.remove();
  }

  const 統合ツール候補パス = [
    './統合ツール.js',
    './tools/統合ツール.js'
  ];

  function 切替対象を開く() {
    const 別ウィンドウ = global.__KUS_TOOL_WINDOW__;
    const rootDoc = (別ウィンドウ && !別ウィンドウ.closed && 別ウィンドウ.document) ? 別ウィンドウ.document : document;
    const ランチャー = rootDoc.querySelector('[data-launch-feature][data-launch-tab="' + TAB + '"]');
    if (ランチャー) {
      ランチャー.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    } else {
      const タブ = rootDoc.querySelector('.tab[data-tab="' + TAB + '"]');
      if (!タブ) return false;
      タブ.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    }
    if (!SUBTAB) return true;
    const サブタブ = rootDoc.querySelector('.subtab[data-subtab-parent="' + SUBTAB_PARENT + '"][data-subtab="' + SUBTAB + '"]');
    if (!サブタブ) return false;
    サブタブ.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    return true;
  }

  function タブ起動待機(retries) {
    if (切替対象を開く()) return;
    if (retries <= 0) {
      console.warn('[統合ツール] 画面切り替えに失敗しました:', TAB, SUBTAB);
      return;
    }
    setTimeout(() => タブ起動待機(retries - 1), 200);
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
        hideLoader();
        alert('統合ツール本体を読み込めませんでした。統合版ブックマークレットを先に実行してください。');
      };
      document.head.appendChild(fallback);
    };
    document.head.appendChild(script);
  }

  showLoader();
  統合ツール本体を読み込む(function () {
    hideLoader();
    タブ起動待機(25);
  });
})(window);
