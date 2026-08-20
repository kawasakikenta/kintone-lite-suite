# CLAUDE.md — kintone-lite-suite 開発ガイド

このリポジトリは、kintone 向け単機能 lite bundle と、その正規ソース・回帰ハーネスだけを管理します。

## 最初に守ること

- 既存テキストの CRLF を維持する。
- ブラウザプロファイル、認証情報、ダウンロードデータ、スクリーンショット、`outputs/` をコミットしない。
- `tools/*.js` と `tools/単機能スクリプト棚卸し.md` は生成物。直接編集しない。
- 正規実装は `tools/統合ツール/src/` に置く。

## セットアップと必須検証

```bash
npm ci
npm run setup
npm run check
git diff --exit-code
```

UI または出力レイアウトを変更した場合は、`tools/test-harness/README.md` に従って対応する Playwright ハーネスも実行します。

## kintone REST API の基本制約

- レコード取得 `limit` は最大 500。
- 10,000 件を超える offset 前提の処理は cursor API または `$id` シークを使う。
- 一括更新は 1 リクエスト 100 レコード以下に分割する。
- 書き戻しでは revision を送り、競合を利用者へ通知する。
- 添付ファイル取得時の `fileKey` を更新 payload に流用しない。
- サブテーブルの新規行に `id` キーを含めない。

取得失敗、処理上限、部分成功は隠さず利用者に表示します。反映操作では対象、方向、削除件数を最終確認に示します。

内部構成は `tools/統合ツール/AGENTS.md`、次の作業は `docs/next-tasks.md` を参照してください。
