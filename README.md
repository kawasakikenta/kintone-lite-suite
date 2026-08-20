# kintone-lite-suite

kintone の設定比較、プレビュー反映、設計書・ER図出力、レコード運用を、用途ごとの単機能 JavaScript として提供するリポジトリです。

## 収録ツール

`tools/` 直下の次のファイルが配布用 bundle です。

- `差分比較.js`
- `プレビュー反映.js`
- `フィールド追加.js`
- `kintoneJS取得.js`
- `設定取得.js`
- `設計書作成.js`
- `ER図.js`
- `プロセス実行.js`
- `kintoneレコード取得.js`
- `CSV出力.js`

正規ソースは `tools/統合ツール/src/` にあります。配布用 bundle と `tools/単機能スクリプト棚卸し.md` はビルド生成物なので、直接編集しないでください。

## セットアップと検証

Node.js 20 以上、npm 10 以上を使用します。

```bash
npm ci
npm run setup
npm run check
```

`npm run check` はブラウザストレージ検査、通常・strict 型検査、Vitest、ビルドを実行します。ビルド後に Git 差分が残る場合は生成物の更新漏れです。

Playwright の比較・出力ハーネスは `tools/test-harness/README.md` を参照してください。

```bash
npm run test:output-layouts
npm run test:diff-multi-dom
npm run test:diff-compare
npm run test:er-compare
```

## 安全上の注意

反映・追加・更新を行うツールは kintone の設定やデータを変更します。対象環境、App ID、処理方向を確認し、必要なバックアップを取得してから実行してください。

独立した Excel、FreeBoard、スケジュール、データ加工ツールは、それぞれ別リポジトリで管理します。
