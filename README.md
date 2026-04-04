# kintone

## Snippets

- 画像一括ダウンロード: `image_bulk_download.js`
  - 登録情報: `snippets_registry.json`

## ツール統合方針

- `tools/統合ツール/build.js` 実行時に、統合版本体に加えて個別ツールの互換エントリ (`tools/*.js`) も自動生成します。
- `tools/統合ツール/src/tabs/` を機能実装の正規場所とします。
- `tools/*.js` の旧単機能スクリプトは、互換維持の公開エントリポイント（薄いラッパー）として扱います。
- 単機能スクリプトの棚卸し・対応関係・運用ルールは `tools/単機能スクリプト棚卸し.md` を参照してください。

