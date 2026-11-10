# 技術構成・ライブラリ一覧・設計資料

この文書は、`kintone-lite-suite` の保守担当者が、利用技術、外部依存、ソースと配布物の関係、主要な実行フローを一か所で把握するための資料です。バージョンの正本は各 `package.json` / `package-lock.json` と `tools/統合ツール/src/constants.ts` です。

## 1. システム概要

本リポジトリは、kintone の設定比較、プレビュー環境への設定反映、本番への反映、設計書・ER図の出力、レコード運用を支援する **12 本の単機能 lite ツール**を管理します。利用者はビルド済み JavaScript を kintone ページ上で実行し、各ツールのパネルから kintone REST API を呼び出します。

| 項目 | 内容 |
| --- | --- |
| 実行環境 | kintone の同一オリジン上で動作するブラウザ JavaScript |
| 開発言語 | TypeScript（設定は `tools/統合ツール/tsconfig*.json`） |
| 配布形式 | esbuild で生成した ES2020 向け IIFE、機能ごとの単一 `.js` ファイル |
| 正規ソース | `tools/統合ツール/src/` |
| 配布物 | `tools/` 直下の 12 本の `.js` |
| 外部接続 | kintone REST API、およびプロセス図（Mermaid）を読み込む CDN。ER 図 HTML の描画ライブラリ、ZIP 作成、設計書 Excel の書き出しは bundle（ER 図は生成する HTML）に含め、通信しない |
| 対応開発環境 | Node.js 20 以上、npm 10 以上 |

統合版 `tools/統合ツール.js` は廃止済みです。各 lite エントリは、実行場所が kintone ページであることを確認してから、必要な UI と機能だけを起動します。

## 2. 全体アーキテクチャ

```mermaid
flowchart LR
  Developer[開発者] --> Source[正規ソース<br/>tools/統合ツール/src]
  Source --> Build[build.js + esbuild]
  Build --> Bundle[配布用 lite bundle<br/>tools/*.js]
  Bundle --> Browser[kintone ページのブラウザ]
  Browser --> Panel[単機能パネル]
  Panel --> Api[kintone REST API]
  Panel -. 必要時に動的読込 .-> CDN[外部 CDN ライブラリ]
  Source --> Unit[Vitest 単体テスト]
  Bundle --> Harness[Playwright DOM / 出力ハーネス]
```

### レイヤーと責務

| レイヤー | 主な場所 | 責務 |
| --- | --- | --- |
| 起動・エントリ | `src/entries/*-lite-entry.ts` | kintone ページ判定、対応する lite UI の起動 |
| lite UI | `src/entries/*-lite-ui.ts` | 入力、確認、進捗、結果表示。共通パネル部品を利用 |
| 機能ロジック | `src/tabs/` | 設定比較、設計書、ER図、レコード処理などのユースケース |
| 差分エンジン | `src/diff/` | 正規化、比較、レビュー、HTML / XLSX 出力 |
| 反映エンジン | `src/reflect/` | 反映計画、事前検査、適用、結果と履歴の集約 |
| API・共通処理 | `src/api.ts`, `src/runControl.ts`, `src/utils.ts`, `src/kintone-query.ts` | REST API、ページング、書込ガード、中止と応答待ち上限、共通変換・ダウンロード |
| 共通 UI | `src/entries/litePanelTheme.ts`, `src/ui/` | パネル、部品、スタイル、ダイアログ |
| 型定義 | `src/types/`, `src/kintone-enums.ts` | kintone、外部グローバル、UI 参照の型 |
| ビルド | `build.js`, `src/featureDefs.mjs` | エントリ定義、CSS インライン化、IIFE 生成、棚卸し生成 |
| テスト | `tests/`, `tools/test-harness/` | 純粋ロジックの単体テスト、ブラウザ操作と成果物の回帰検証 |

## 3. 配布ツール一覧

| 機能 | 配布ファイル | lite エントリ | 主な正規実装 |
| --- | --- | --- | --- |
| 差分比較 | `tools/差分比較.js` | `entries/diff-lite-entry.ts` | `tabs/diff*.ts`, `diff/` |
| プレビュー反映 | `tools/プレビュー反映.js` | `entries/reflect-lite-entry.ts` | `tabs/reflect*.ts`, `reflect/` |
| フィールド追加 | `tools/フィールド追加.js` | `entries/field-lite-entry.ts` | `tabs/field*.ts` |
| JS/CSS 設定 | `tools/kintoneJS取得.js` | `entries/jsconfig-lite-entry.ts` | `tabs/jsconfig*.ts` |
| 設定一括取得 | `tools/設定取得.js` | `entries/settings-export-lite-entry.ts` | `tabs/settings-export*.ts` |
| 設計書 | `tools/設計書作成.js` | `entries/design-lite-entry.ts` | `tabs/design*.ts` |
| ER図 | `tools/ER図.js` | `entries/er-lite-entry.ts` | `tabs/er*.ts`, `tabs/er-model.ts`, `tabs/er-analysis.ts` |
| プロセス図 | `tools/プロセス実行.js` | `entries/process-lite-entry.ts` | `tabs/process*.ts` |
| レコード管理 | `tools/kintoneレコード取得.js` | `entries/record-lite-entry.ts` | `tabs/record*.ts` |
| CSV出力 | `tools/CSV出力.js` | `entries/csv-export-lite-entry.ts` | `tabs/record-csv-export.ts`, `tabs/record-standalone.ts` |
| データ品質チェック | `tools/データ品質チェック.js` | `entries/record-quality-lite-entry.ts` | `tabs/record-quality*.ts`, `tabs/record-template.ts` |

`tools/*.js` と `tools/単機能スクリプト棚卸し.md` は生成物です。修正は正規ソースへ行い、ビルドで再生成します。

## 4. ライブラリ一覧

### 4.1 npm の直接依存

bundle へ同梱して実行時に使うパッケージは、`xlsx-js-style`（`設計書作成.js` にだけ）と、ER 図の描画ライブラリ `cytoscape`・`dagre`・`cytoscape-dagre`（`ER図.js` にだけ。下表）です。そのほかは、ビルド、型検査、テストで使用する **開発時依存**です。

| パッケージ | 宣言バージョン | 配置 | 用途 |
| --- | --- | --- | --- |
| `@playwright/mcp` | `0.0.70` | ルート | Playwright MCP とブラウザ自動操作基盤。ハーネスでは同依存が導入する Playwright を利用 |
| `@types/node` | `^22.9.0` | 統合ツール | Node.js API の TypeScript 型定義 |
| `esbuild` | `^0.25.0` | 統合ツール | TypeScript と CSS を機能別 IIFE に bundle |
| `typescript` | `^5.6.3` | 統合ツール | 通常および strict の静的型検査 |
| `vitest` | `^4.1.7` | 統合ツール | 単体テストランナー |
| `cytoscape` | `3.28.1` | 統合ツール | ER 図 HTML のグラフ描画。ビルド時に `ER図.js` へ同梱し、生成する HTML へインラインで埋め込む（4.2.1） |
| `dagre` | `0.8.5` | 統合ツール | ER 図の階層レイアウト。同上 |
| `cytoscape-dagre` | `2.5.0` | 統合ツール | Cytoscape で Dagre を使うプラグイン。同上 |
| `xlsx-js-style` | `1.2.0` | 統合ツール | 設計書 Excel のスタイル付き生成（SheetJS 0.18.5 + セル書式、Apache-2.0）。`設計書作成.js` にだけ同梱 |

間接依存を含む厳密な解決バージョンと整合性ハッシュは `package-lock.json` および `tools/統合ツール/package-lock.json` を正本とし、この文書へ重複転記しません。

### 4.2 実行時に CDN から読み込む依存

これらは bundle へ同梱されず、該当機能を使うときにブラウザから読み込みます。そのため、kintone 環境の Content Security Policy、プロキシ、ネットワーク制限の影響を受けます。

kintone の画面へ読み込む外部スクリプトは、管理者のセッションで実行されます（このツール群は設定の書き込みや本番反映もできます）。そのため、**固定版 + `integrity`（SRI）+ `crossorigin="anonymous"` で検証できるものだけ**を読み込みます。内容を検証できない URL は候補に入れません。

**同梱していて通信しないもの**

- ZIP 作成: 自前実装（`src/archive/lite-zip.ts`）。以前の JSZip（cdnjs）は廃止しました。`loadJSZipLite()`（`src/jszipLoader.ts`）が返し、ページに既にある `window.JSZip` は使いません。UTF-8 のファイル名、CRC-32、フォルダ、後勝ちの上書き、`remove`、空の ZIP に対応します。圧縮はブラウザに `CompressionStream('deflate-raw')` があれば DEFLATE（縮まないものは STORE）、無ければ STORE です。classic ZIP の上限（1 エントリ・全体とも 4GB 未満、65,535 件）を超える場合は、壊れた ZIP を作らずエラーにします。
- ER 図の描画ライブラリ: Cytoscape.js・Dagre・cytoscape-dagre の固定版を `ER図.js` に取り込み、生成する HTML へインラインで埋め込みます（4.2.1）。
- 設計書 Excel: xlsx-js-style 1.2.0（`src/tabs/sheetLib.ts`）。`設計書作成.js` にだけ入ります。配布物は UMD のため、`build.js` が `module` などを隠して CDN のブラウザ版と同じ形で取り込みます（文字コード表 `cpexcel` は含めません）。以前のフォールバック（SheetJS 0.18.5）は廃止しました。

| ライブラリ | バージョン | 主な用途 | 読込元・備考 |
| --- | --- | --- | --- |
| Mermaid | 10.6.1 | プロセス図の描画 | jsDelivr → unpkg の順で試行し、どちらも SRI（sha384）で検証。30 秒で次の候補へ。読み込めない・検証に失敗した場合は簡易 HTML 表示（状態と遷移の表）。cdnjs は同じ内容と確かめられないため候補から外した |

実行時に CDN から読み込むのは Mermaid だけで、候補 URL とハッシュの正本は `src/tabs/mermaid-loader.ts` です（以前の `src/constants.ts` の `EXTERNAL_LIBRARIES` は廃止しました）。ハッシュは npm の `mermaid@10.6.1` の `dist/mermaid.min.js` から計算した値で、jsDelivr（`/npm/`）と unpkg は npm の配布物をそのまま配るため同じ値で検証できます。バージョンを上げるときは、新しい配布物から `openssl dgst -sha384 -binary mermaid.min.js | openssl base64 -A` で計算し直します。

`window.mermaid` が既にあるときは再読み込みせずに使います。それは、このツールが検証付きで読み込んだ固定版か、このページで既に実行されている別のスクリプト（kintone のカスタマイズなど）が読み込んだものです。後者はこのツールが新たに外部スクリプトを実行するわけではありませんが、内容は検証できません。どちらでも `securityLevel: 'strict'` で初期化します。

### 4.2.1 ビルド時に同梱する依存（ER 図）

ER 図の HTML は、Cytoscape.js 3.28.1・Dagre 0.8.5・cytoscape-dagre 2.5.0 を実行時に読み込まず、HTML の中へインラインの script として埋め込みます。社内ネットワークで CDN が遮断されていても、図を表示できます。

| 項目 | 内容 |
| --- | --- |
| 版の固定 | `tools/統合ツール/package.json` の devDependencies（`package-lock.json` の整合性ハッシュで固定）。`tests/er-html.test.ts` が、同梱する版と package.json・node_modules の版の一致を検査する |
| 同梱の仕組み | `src/tabs/er-libraries.ts` が `cytoscape.min.js`・`dagre.min.js`・`cytoscape-dagre.js` を `?raw` で取り込む。`build.js` は `rawTextPlugin.js`（esbuild プラグイン）で、単体テスト（Vitest）は標準の `?raw` で同じ書き方を解決する |
| ライセンス | 3 本とも MIT。`cytoscape.min.js` の著作権コメントはそのまま残す。`dagre.min.js` は graphlib・lodash を含むため、dagre・graphlib・lodash・cytoscape-dagre の LICENSE の全文を、各ライブラリの前のコメントに付ける |
| 取り込む先 | `ER図.js` だけ（他の 11 本には入らない）。サイズは 約 0.47 MB → 約 1.1 MB。生成する HTML は 約 0.67 MB 増える |
| CSP | `script-src 'unsafe-inline'`（外部ホストなし）。インラインに埋め込む文字列は `</script` を無害にしてから入れる（`escapeInlineScriptSource`） |
| 保存し直し | 図の画面の「出力 → 編集済みHTMLを保存」は、画面の DOM を複製して保存するため、同梱したライブラリも保存した HTML に入り、そのまま単体で開ける |
| 初期化に失敗したとき | ブラウザの制限などで描画ライブラリが使えないときは、取得済みのアプリ一覧の表を出す（CDN は前提にしない） |

### 4.3 プラットフォーム API とブラウザ標準機能

- kintone JavaScript API / REST API: アプリ設定、フォーム、レコード、ファイル、プロセス管理などを取得・更新します。
- Fetch、DOM、Blob、FileReader、URL、Clipboard API: 通信、パネル表示、成果物保存、コピーに使用します。
- Node.js 標準モジュール: ビルドとハーネスで `fs`、`path`、`url`、`crypto`、`assert`、`child_process`、`vm` などを使用します。

## 5. 主要なデータフロー

### 5.1 読み取り・出力系

1. 利用者が接続先、App ID、対象範囲を入力する。
2. lite UI が入力を検証し、`api.ts` のラッパーを介して kintone REST API を呼ぶ。
3. 機能ロジックが取得結果を正規化・集約する。
4. HTML、Markdown、JSON、CSV、XLSX、ZIP または Mermaid ソースをブラウザ内で生成する。
5. Blob URL などを使って利用者端末へ保存する。取得失敗や部分成功は結果に明示する。

### 5.2 設定反映・レコード更新系

1. 対象、方向、入力 JSON、削除を伴う変更を事前検査する。
2. 実行計画と確認画面を提示する。
3. 必要なバックアップを作成してから、プレビュー用 API またはレコード API を呼ぶ。
4. 設定更新では取得した `revision` を送り、外部更新との競合を検出する。
5. レコード一括更新は 100 件以下へ分割する。
6. 成功、失敗、未実行、再試行対象を利用者へ返す。

### 5.3 大量レコード取得

- API の1回の取得上限は 500 件です。
- `order by` がないクエリは `$id` シーク、並び順があるクエリは cursor API を使い、10,000 件超の offset 依存を避けます。
- 処理上限、取得失敗、部分取得を成功扱いで隠しません。

## 6. 設計上の重要な判断

### 軽量な単機能 bundle

1つの巨大な統合 UI ではなく、目的ごとのエントリから必要なコードだけを bundle します。配布と起動が単純になり、利用者が誤って別機能を実行する範囲を抑えます。

### 生成物と正規ソースの分離

配布用 JavaScript と棚卸し Markdown は `build.js` が生成します。生成物を直接修正せず、TypeScript またはエントリ定義を修正することで、再ビルド可能性を維持します。

### ブラウザ内処理

取得データと成果物は原則としてブラウザ内で処理します。別のアプリケーションサーバーは持ちません。ただし、動的ライブラリの取得先 CDN（ER 図を除く）と kintone REST API への通信は発生します。

### 安全な書き込み

設定の書き込みは原則プレビュー環境に限定し、レコード API など明示した例外以外の本番 prefix への更新をガードします。revision 競合、削除件数、比較方向、部分失敗を明示し、無言の上書きを避けます。

### 外部依存の縮退動作

CDN 依存（Mermaid）が取得できない可能性を前提に、代替 CDN、簡易表示、明示的なエラーのいずれかを用意します。ZIP 作成、設計書 Excel、差分比較 XLSX、ER 図 HTML（描画ライブラリを同梱）は外部 CDN に依存せず、CDN が遮断された環境でも使えます。Mermaid は、読み込めない・SRI の検証に失敗したときに簡易表示へ切り替え、理由を状態表示とログに残します（SRI の不一致はブラウザ上で通信失敗と区別できないため、どちらも同じ扱いです）。

## 7. ビルドと検証

```bash
npm ci
npm run setup
npm run check
git diff --exit-code
```

`npm run check` は、ブラウザストレージ禁止検査、通常型検査、strict 型検査、Vitest、全 lite bundle のビルドを順に実行します。UI または成果物レイアウトを変更した場合は、`tools/test-harness/README.md` から対応する Playwright ハーネスも実行します。

| 変更対象 | 最低限の追加確認 |
| --- | --- |
| 共通 UI / 検索 | `npm run test:lite-shared` |
| 設計書、設定取得、ER図、プロセス図、CSV等の操作 | `npm run test:lite-workflows` |
| 出力レイアウト | `npm run test:output-layouts` |
| 差分比較 | 対象に応じた `test:diff-*` |
| プレビュー反映 | `npm run test:reflect-dom` |
| ER 図 | `npm run test:er-compare` |
| 全機能 | `npm run test:all` |

## 8. 依存更新時のチェックリスト

1. `package.json` または外部ライブラリ URL のバージョンを更新する。
2. npm 依存なら対応する lockfile を `npm install` で更新する。
3. CDN 依存なら、グローバル変数名、CSS、代替 URL、CSP の許可先が一致するか確認する。固定版の `integrity`（sha384）と `crossorigin="anonymous"` を付け、ハッシュは npm の配布物から計算する（検証できない URL は候補に入れない）。同梱できるものは同梱を優先する。
4. `npm run check` を実行し、生成物の差分もレビューする。
5. 関連する Playwright ハーネスで通常経路と CDN 遮断時の挙動を確認する。同梱する依存（ER 図）は、ネットワークをすべて遮断した状態で描画できること（`npm run test:er-compare`）を確認する。
6. この一覧と、必要に応じて `tools/統合ツール/README.md` を更新する。

## 9. 関連資料

- `README.md`: リポジトリの入口、セットアップ、利用上の注意
- `tools/統合ツール/README.md`: 統合ツールの開発・ビルド詳細
- `tools/統合ツール/AGENTS.md`: 生成物、正規ソース、共有モジュールの保守ルール
- `tools/統合ツール_機能説明.md`: 利用者向けの機能説明
- `tools/test-harness/README.md`: ブラウザ・成果物ハーネス
- `docs/diff-comparison-logic.md`: 差分比較の詳細設計
- `docs/core-design-and-diff-judgment.md`: 核心設計・安全性設計と、差分比較の実装側の判定条件
- `docs/preview-reflection.md`: プレビュー反映の安全設計
- `docs/api-response-improvements.md`: API レスポンスを利用する補助機能
- `docs/record-quality-and-template.md`: データ品質検査と CSV ひな形

