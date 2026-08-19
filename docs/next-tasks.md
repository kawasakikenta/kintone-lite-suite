# 次にやる作業（kintone-tools）

更新: 2026-08-20。前提と検証方法は `CLAUDE.md` を先に確認してください。プラグイン側のタスクは分割後の `kintone-plugins` で管理します。

## T1. GitHub Actionsの追加

新しいGitHubリポジトリ作成後、Node.jsのサポート対象バージョンで次を実行するCIを追加します。

1. ルートで `npm ci`
2. `npm run setup`
3. `npm run check`
4. ビルド後に `git diff --exit-code -- tools/*.js tools/単機能スクリプト棚卸し.md`

生成物の更新漏れをCIで検出し、lockfileを使わない導入は禁止します。

## T2. Playwright比較ハーネスのCI分離

差分比較とER図のbefore/afterハーネスは実行時間とブラウザ依存が大きいため、通常の型検査・ユニットテストとは別ジョブにします。

- `npm run test:diff-multi-dom` は通常PRで実行
- `npm run test:diff-compare` と `npm run test:er-compare` はUI変更時または手動実行
- `.iter-shots/` の比較HTML・JSON・PNGはCI artifactとして保存し、Gitには追加しない
- ChromeがないrunnerではPlaywright Chromiumを明示的に導入する

## T3. standalone資産の自動検査

`tools/standalone/` は手書き資産と生成資産が混在しています。各ファイルの正規ソース、生成コマンド、最低限の構文検査を一覧化し、生成済みファイルの更新漏れを検出できるようにします。

完了条件:

- `tools/standalone/README.md` から全資産の正規ソースを追跡できる
- 個人PCの絶対パスを含まない
- 生成スクリプトをクリーンcloneから実行できる
- 構文検査またはスモークテストをルートコマンドから実行できる
