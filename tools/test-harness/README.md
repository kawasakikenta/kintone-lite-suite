# test-harness

現行の単機能liteバンドルと出力レイアウトを確認するための補助ハーネスです。廃止済みの `tools/統合ツール.js` は使用しません。

## 前提

リポジトリ直下で依存を導入し、生成物を更新します。

```bash
npm ci
npm run setup
npm run build
```

Playwrightハーネスは既定でChromeを使用します。`--browser chromium` を指定する場合は、Playwright Chromiumも導入してください。出力先の `.iter-shots/` と `tools/test-harness/outputs/` はGit管理外です。

## ハーネス一覧

| コマンド | 確認内容 |
| --- | --- |
| `npm run test:output-layouts` | HTML、Markdown、CSV、Mermaidなどの出力を合成データで生成 |
| `npm run test:diff-multi-dom` | 複数比較先、途中失敗、二重実行防止を実ブラウザDOMで検証 |
| `npm run test:diff-compare` | `tools/差分比較.js` のHEAD版と作業ツリー版を比較。作業ツリー版は意味・操作契約、完全／不完全、差分0件、レビュー、出力、技術情報とモバイル差分値の初期折りたたみ、完了後CTA、画面幅・倍率相当も検証 |
| `npm run test:er-compare` | `tools/ER図.js` のHEAD版と作業ツリー版を倍率・画面幅別に比較 |

before/after比較は、作業ツリーの生成物を更新してから実行します。`--before-ref`、`--before-file`、`--after-file`、`--out`、`--browser` などの詳細は各スクリプトの `--help` を参照してください。

差分比較ハーネスは、見た目のCSSクラスではなく、ARIA名と `data-kus-dl-*` / `data-report-*` の公開操作契約を優先して操作します。作業ツリー版では320 / 390 / 768 / 1024 / 1440pxと、固定1440×900画面に対する80 / 100 / 125 / 150 / 200%相当を撮影し、横はみ出し、固定UI同士の重なり、操作要素の被覆、フォーカス喪失を検査します。画像・HTML・Excel・JSONはGit管理外の `.iter-shots/` にだけ保存します。

## ER図HTMLの単体撮影

`shot-er.mjs` はER図HTML内のCytoscape関連CDNをローカル依存へ差し替えて撮影します。

```bash
node tools/test-harness/shot-er.mjs \
  tools/test-harness/outputs/er-diagram.html \
  tools/test-harness/outputs/er-diagram.png \
  plain
```

第3引数は `plain`、`manual-add`、`save-reload` のいずれかです。ブラウザは `KUS_PLAYWRIGHT_EXECUTABLE` または `KUS_PLAYWRIGHT_BROWSER` で上書きできます。

## 手動モック画面

`harness.html` はkintone APIを呼ばない最小モックページです。単機能バンドルをブラウザ開発者ツールから読み込むときの土台として使用します。
