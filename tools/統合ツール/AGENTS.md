# AI Agent ガイド — kintone 統合ツール

## 重要: ビルド生成物を直接編集しないこと

`tools/` 直下の以下のファイルは **`npm run build` (esbuild)** で自動生成されます。
**絶対に手編集しないでください。** 次回ビルドで上書きされます。

### 生成ファイル一覧

| 生成ファイル (tools/) | ソースエントリ (src/entries/) | 機能の正規実装 (src/tabs/) |
|---|---|---|
| `統合ツール.js` | `src/index.js` | 全タブ |
| `差分比較.js` | `diff-lite-entry.js` | `tabs/diff.js`, `tabs/diff-standalone.js` |
| `設計書作成.js` | `design-lite-entry.js` | `tabs/design.js`, `tabs/design-standalone.js`, `tabs/design-xlsx.js` |
| `kintoneJS取得.js` | `jsconfig-lite-entry.js` | `tabs/jsconfig.js`, `tabs/jsconfig-standalone.js` |
| `設定取得.js` | `settings-export-lite-entry.js` | `tabs/settings-export.js`, `tabs/settings-export-standalone.js` |
| `kintoneSQL.js` | `sql-lite-entry.js` | `tabs/sql.js` |
| `ER図.js` | `er-lite-entry.js` | `tabs/er.js`, `tabs/er-standalone.js` |
| `プロセス実行.js` | `process-lite-entry.js` | `tabs/process.js`, `tabs/process-standalone.js` |
| `プレビュー反映.js` | `reflect-lite-entry.js` | `tabs/reflect.js`, `tabs/reflect-standalone.js` |
| `フィールド追加.js` | `field-lite-entry.js` | `tabs/field.js`, `tabs/field-standalone.js` |
| `kintoneレコード取得.js` | `record-lite-entry.js` | `tabs/record.js`, `tabs/record-standalone.js` |
| `単機能スクリプト棚卸し.md` | — | — |

### バンドル種別

全単機能スクリプトは **軽量 lite バンドル** です。`boot.js`（統合ツールのフル UI）を含まず、
`*-standalone.js` + `*-lite-ui.js` + `liteMount.js` で自己完結する軽量パネルを提供します。

統合版（`統合ツール.js`）はフル UI バンドルで全タブ機能を含みます（~830KB）。
lite 版は必要な機能のみバンドルするため、各ファイル 30〜170KB 程度です。

## 修正ワークフロー

1. **ソースを編集**: `tools/統合ツール/src/` 配下のファイルを変更する
2. **再ビルド**: `cd tools/統合ツール && npm run build`
3. ソース 1 箇所の変更が **最大 11 本の生成 JS** に波及する

## ディレクトリ構成

```
tools/統合ツール/
├── build.js                   # ビルドスクリプト（esbuild）
├── src/
│   ├── index.js               # 統合版エントリ
│   ├── boot.js                # 統合版の起動・UI 構築
│   ├── featureDefs.mjs        # エントリ一覧（STANDALONE_LAUNCH_ENTRIES）
│   ├── register-api.js        # window.__KUS__ 公開 API
│   ├── constants.js           # 定数
│   ├── state.js               # グローバル state
│   ├── api.js                 # kintone REST API ラッパー
│   ├── utils.js               # 汎用ユーティリティ
│   ├── handlers.js            # イベント委譲
│   ├── entries/               # esbuild エントリポイント
│   │   ├── *-lite-entry.js    # 軽量単機能エントリ
│   │   ├── *-lite-ui.js       # 軽量単機能の UI パネル
│   │   └── liteMount.js       # lite 版共通パネルマウント
│   ├── tabs/                  # 各タブの正規実装
│   │   ├── *.js               # 統合版で使うタブロジック
│   │   └── *-standalone.js    # lite 版用に統合 UI 依存を外した関数群
│   ├── diff/                  # 差分エンジン
│   ├── reflect/               # プレビュー反映エンジン
│   └── ui/                    # UI 層（テンプレート・スタイル・コンポーネント）
└── tools/                     # ← 親ディレクトリ（生成物の出力先）
    ├── 統合ツール.js           # 生成物
    ├── 差分比較.js             # 生成物
    └── ...                    # 他の生成物
```

## 共有モジュールの注意点

- `tabs/design-xlsx.js` は `tabs/design.js`（統合版）と `tabs/design-standalone.js`（lite 版）の**両方**からインポートされる。変更時は両方に影響する。
- `tabs/er.js` の `crawl`/`buildHTML` は統合版と `tabs/er-standalone.js`（lite 版）の両方から使用される。
- `entries/liteMount.js` は全 lite 系パネルの共通基盤。変更時は軽量バンドル全体に影響する。
- `diff/export.js` の `bundleToMarkdown` は統合版・設計書 lite・差分 lite から参照される。
