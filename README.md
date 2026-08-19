# kintone-tools

kintone の設定差分比較、プレビュー反映、設計書・ER図出力、レコード運用などを支援するブラウザツール集です。プラグイン本体は分割後の別リポジトリ `kintone-plugins` で管理します。

## 構成

| パス | 役割 |
| --- | --- |
| `tools/統合ツール/src/` | lite ツールの正規ソース |
| `tools/統合ツール/tests/` | Vitest のユニットテスト |
| `tools/*.js` | ビルドで生成する単機能 lite バンドル |
| `tools/standalone/` | 統合ビルドから独立した手書きツール |
| `tools/test-harness/` | Playwright・出力レイアウトの回帰ハーネス |
| `scripts/` | リポジトリ共通の補助スクリプト |

統合版本体の `tools/統合ツール.js` は廃止済みです。利用・配布する入口は `tools/*.js` の単機能バンドルです。

## セットアップ

Node.js 20 以上と npm 10 以上を使用します。

```bash
npm ci
npm run setup
```

1つ目のコマンドはルートの Playwright 関連依存、2つ目は `tools/統合ツール/` のビルド・テスト依存を固定済みlockから導入します。

## よく使うコマンド

```bash
npm run check              # ストレージ検査、型検査、ユニットテスト、ビルド
npm run build              # tools/*.js を再生成
npm test                   # ユニットテストのみ
npm run test:output-layouts # HTML/Markdown/CSV等の確認用成果物を生成
npm run verify:playwright-mcp
```

Playwrightの比較ハーネスは必要に応じて個別に実行します。

```bash
npm run test:diff-multi-dom
npm run test:diff-compare
npm run test:er-compare
```

Chrome/Edgeがない環境でChromiumを使う場合は、事前にPlaywright用ブラウザを導入してください。比較ハーネスの詳細と出力先は `tools/test-harness/README.md` を参照してください。

## 生成物の扱い

`tools/統合ツール/build.js` は `src/featureDefs.mjs` の `STANDALONE_LAUNCH_ENTRIES` を基に、`tools/*.js` と `tools/単機能スクリプト棚卸し.md` を生成します。これらは直接編集せず、`tools/統合ツール/src/` を修正して `npm run build` を実行してください。

独立ツールは `tools/standalone/README.md` に従って管理します。統合ビルドの生成物とstandaloneの手書きファイルを混同しないでください。

## スニペット生成

JavaScriptをブラウザコンソール用の1行形式、またはブックマークレット形式に変換できます。

```bash
npm run snippet -- tools/差分比較.js
npm run snippet -- tools/standalone/kintone-data-flow.js bookmarklet
```

## 安全上の注意

- プレビュー反映、フィールド追加、レコード更新などはkintone上のデータや設定を変更します。対象環境・App ID・方向を確認し、バックアップを取得してから実行してください。
- 秘密鍵、プラグインZIP、ブラウザプロファイル、テスト出力はコミットしません。
- 失敗を握りつぶさず、処理上限・部分成功・APIエラーを利用者に表示します。

詳しい開発ルールは `CLAUDE.md`、統合ツールの内部構成は `tools/統合ツール/README.md` を参照してください。
