# 次にやる作業（kintone-lite-suite）

更新: 2026-09-06。前提と検証方法は `CLAUDE.md` を先に確認してください。

## T1. Playwright 比較ハーネスの CI 分離（実装済み）

- 通常 PR と main 更新で複数比較先・ペア・フォルダペア・プレビュー反映・lite 操作の DOM ハーネスを実行する。
- 重い `test:diff-compare` と `test:er-compare` は対応する UI／出力ソース・生成物・共通依存・ハーネスの変更時、または `workflow_dispatch` で実行する。
- PR は比較元ブランチの SHA、main 更新は push 前の SHA を比較基準にする。詳細は `tools/test-harness/README.md` を参照。
- 比較 HTML、JSON、PNG などは 7 日間の Actions artifact とし、Git へ追加しない。

## T2. ER 図の外部依存固定

生成 HTML が実行時 CDN 応答へ依存しないよう、Cytoscape、Dagre などを固定版で同梱する。難しい場合は SRI と厳格な CSP を適用し、供給網リスクを明示する。

## T3. Excel 差分出力の安全共有

共有用マスキング、暗号学的な内容識別子、出力サイズ上限、レビュー結果の再取込を段階的に追加する。人向けレビュー表と技術明細の役割分離は維持する。
