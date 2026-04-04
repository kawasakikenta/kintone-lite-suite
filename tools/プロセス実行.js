(function () {
  'use strict';

  function open() {
    if (typeof window.__統合ツールを開く === 'function') {
      window.__統合ツールを開く('processFlow');
      return;
    }

    const loader = document.createElement('script');
    loader.src = './tools/統合ツール起動.js';
    loader.onload = () => window.__統合ツールを開く?.('processFlow');
    loader.onerror = () => alert('統合ツール起動スクリプトの読み込みに失敗しました。統合ツールを直接実行してください。');
    document.head.appendChild(loader);
  }

  open();
})();
