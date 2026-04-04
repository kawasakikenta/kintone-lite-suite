# kintone

## Snippets

- 画像一括ダウンロード: `image_bulk_download.js`
  - 登録情報: `snippets_registry.json`

### コードスニペットを一発生成して実行する

```bash
# コンソール貼り付け用の1行スニペットを出力
npm run snippet -- tools/画像一括ダウンロード.js

# ブックマークレット形式で出力
npm run snippet -- tools/画像一括ダウンロード.js bookmarklet
```

- `console` モード（デフォルト）は、出力されたコードをブラウザ開発者ツールの Console に貼り付けてそのまま実行できます。
- `bookmarklet` モードは `javascript:` で始まる文字列を出力します。ブラウザのブックマーク URL に設定してワンクリック実行できます。

## ツール統合方針

- `tools/統合ツール/build.js` 実行時に、統合版本体に加えて個別ツールの互換エントリ (`tools/*.js`) も自動生成します。
- 単機能エントリの対応は `tools/統合ツール/src/featureDefs.mjs` の `STANDALONE_LAUNCH_ENTRIES`（タブ ID は同ファイルの `FEATURE_DEFS` と整合）で管理します。
- `tools/統合ツール/src/tabs/` を機能実装の正規場所とします。
- `tools/*.js` の旧単機能スクリプトは、互換維持の公開エントリポイント（薄いラッパー）として扱います。
- 単機能スクリプトの棚卸し・対応関係・運用ルールは `tools/単機能スクリプト棚卸し.md` を参照してください。
