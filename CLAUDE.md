# CLAUDE.md — kintone-tools 開発ガイド

このリポジトリは、kintone向けの単機能liteバンドルと独立ツールを管理します。プラグイン本体は別リポジトリ `kintone-plugins` の責務です。

## 1. 最初に守ること

### 改行コード

作業ツリーの既存テキストは原則 **CRLF** です。編集時は既存の改行コードを維持し、終了前に次を確認してください。

```bash
git diff --ignore-cr-at-eol --stat
```

### 秘密情報と一時成果物

秘密鍵、認証済みブラウザプロファイル、ダウンロードしたデータ、テストスクリーンショットをコミットしないでください。対象は `.gitignore` にも登録していますが、コミット前に `git status --short` で必ず確認します。

## 2. ソースと生成物の境界

`tools/統合ツール/src/` が統合系liteツールの正規実装です。`npm run build` が次を生成します。

- `tools/差分比較.js`
- `tools/プレビュー反映.js`
- `tools/フィールド追加.js`
- `tools/kintoneJS取得.js`
- `tools/設定取得.js`
- `tools/設計書作成.js`
- `tools/ER図.js`
- `tools/プロセス実行.js`
- `tools/kintoneレコード取得.js`
- `tools/CSV出力.js`
- `tools/単機能スクリプト棚卸し.md`

これらを直接編集してはいけません。`tools/standalone/` は統合ビルドとは独立した手書き資産で、各READMEの指示を優先します。

## 3. セットアップと検証

```bash
npm ci
npm run setup
npm run check
```

`npm run check` は `tools/統合ツール/` のブラウザストレージ検査、通常/strict型検査、Vitest、esbuildを順に実行します。短い確認には次を使います。

```bash
npm test
npm run typecheck
npm run build
```

UIや出力レイアウトを変更した場合は、対象に応じて `tools/test-harness/README.md` のPlaywrightハーネスを実行し、スクリーンショットや生成ファイルを目視確認します。

## 4. kintone REST APIの制約

| 制約 | 実装上の扱い |
| --- | --- |
| レコード取得 `limit` | 最大500。設定値をそのままAPIへ渡さない |
| `offset` | 10,000超を想定する処理はcursor APIまたは `$id` シークを使う |
| コメント取得 `limit` | 最大10。レコード取得と混同しない |
| 一括更新 | 1リクエスト100レコード以下に分割する |
| 一覧イベント | `event.records` は表示ページ分のみ。全件処理はRESTで再取得する |
| 楽観ロック | `revision` を送り、競合時は上書きせず再読込を促す |
| 添付ファイル | 取得した `fileKey` を更新APIへ送り返さない |
| サブテーブル新規行 | `id` キー自体を含めない |

多値型とユーザー選択系は、書き戻し時に配列または `[{code}]` のAPI形式へ戻します。表示文字列へ変換した値を更新payloadに流用しないでください。

## 5. 失敗を利用者に見せる

- 必須設定がない場合は黙って `return` せず、何が不足しているか表示する
- 正規表現・JSON・APIのエラー理由を画面に表示する
- 上限で処理を打ち切った場合は件数と未処理の存在を表示する
- 部分成功を全件成功として扱わない
- 反映系操作では対象、方向、削除件数を最終確認に出す

## 6. 参照先

- `docs/next-tasks.md` — ツール側の次タスク
- `tools/統合ツール/AGENTS.md` — 生成ファイルと内部モジュールの詳細
- `tools/統合ツール/README.md` — 機能・設計・利用フロー
- `tools/test-harness/README.md` — 回帰ハーネスの使い方
