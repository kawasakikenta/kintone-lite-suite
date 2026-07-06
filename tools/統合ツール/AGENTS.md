# AI Agent ガイド — kintone 統合ツール

## 重要: ビルド生成物を直接編集しないこと

`tools/` 直下の以下のファイルは **`npm run build` (esbuild)** で自動生成されます。
**絶対に手編集しないでください。** 次回ビルドで上書きされます。

### 生成ファイル一覧

| 生成ファイル (tools/) | ソースエントリ (src/entries/) | 機能の正規実装 (src/tabs/) |
|---|---|---|
| `差分比較.js` | `diff-lite-entry.ts` | `tabs/diff.ts`, `tabs/diff-standalone.ts` |
| `設計書作成.js` | `design-lite-entry.ts` | `tabs/design.ts`, `tabs/design-standalone.ts`, `tabs/design-xlsx.ts` |
| `kintoneJS取得.js` | `jsconfig-lite-entry.ts` | `tabs/jsconfig.ts`, `tabs/jsconfig-standalone.ts` |
| `設定取得.js` | `settings-export-lite-entry.ts` | `tabs/settings-export.ts`, `tabs/settings-export-standalone.ts` |
| `ER図.js` | `er-lite-entry.ts` | `tabs/er.ts`, `tabs/er-standalone.ts` |
| `プロセス実行.js` | `process-lite-entry.ts` | `tabs/process.ts`, `tabs/process-standalone.ts` |
| `プレビュー反映.js` | `reflect-lite-entry.ts` | `tabs/reflect.ts`, `tabs/reflect-standalone.ts` |
| `フィールド追加.js` | `field-lite-entry.ts` | `tabs/field.ts`, `tabs/field-standalone.ts` |
| `kintoneレコード取得.js` | `record-lite-entry.ts` | `tabs/record.ts`, `tabs/record-standalone.ts` |
| `CSV出力.js` | `csv-export-lite-entry.ts` | `tabs/record-standalone.ts` |
| `単機能スクリプト棚卸し.md` | — | — |

### バンドル種別

全単機能スクリプトは **軽量 lite バンドル** です。`boot.ts`（廃止済み統合版のフル UI）を含まず、
`*-standalone.ts` + `*-lite-ui.ts` + `litePanelTheme.ts`（共通パネル UI）で自己完結する軽量パネルを提供します。
各 lite エントリ（`*-lite-entry.ts`）は `kintoneGuard.ts` の `runOnKintonePage()` で kintone 画面判定してから起動します。

統合版（`統合ツール.js`）は廃止済みです。ビルドでは生成せず、既存ファイルがあれば削除します。lite 版を正規の公開エントリポイントとします。

## 修正ワークフロー

1. **ソースを編集**: `tools/統合ツール/src/` 配下のファイルを変更する
2. **検証**: `cd tools/統合ツール && npm run check`
   （ブラウザストレージ検査 → typecheck（通常/strict） → vitest → ビルドを一括実行）
3. **再ビルドのみ**: `npm run build`
4. ソース 1 箇所の変更が **最大 10 本の生成 JS** に波及する

## ディレクトリ構成

```
tools/統合ツール/
├── build.js                   # ビルドスクリプト（esbuild）
├── src/
│   ├── index.ts               # 廃止済み統合版の旧エントリ（ビルド対象外）
│   ├── boot.ts                # 廃止済み統合版の旧起動処理（ビルド対象外）
│   ├── featureDefs.mjs        # エントリ一覧（STANDALONE_LAUNCH_ENTRIES）
│   ├── register-api.ts        # window.__KUS__ 公開 API
│   ├── constants.ts           # 定数
│   ├── state.ts               # グローバル state
│   ├── api.ts                 # kintone REST API ラッパー
│   ├── utils.ts               # 汎用ユーティリティ
│   ├── kintoneGuard.ts        # kintone 画面ガード（全エントリ・boot 共通）
│   ├── handlers.ts            # イベント委譲
│   ├── entries/               # esbuild エントリポイント
│   │   ├── *-lite-entry.ts    # 軽量単機能エントリ（kintoneGuard で起動）
│   │   ├── *-lite-ui.ts       # 軽量単機能の UI パネル
│   │   ├── litePanelTheme.ts  # lite 版共通パネル UI（createLitePanel/makeRow 等）
│   │   └── appSearchControl.ts # アプリ名検索コントロール（lite 共通）
│   ├── tabs/                  # 各タブの正規実装
│   │   ├── *.ts               # 共通・旧統合 UI 用タブロジック
│   │   └── *-standalone.ts    # lite 版用に統合 UI 依存を外した関数群
│   ├── diff/                  # 差分エンジン
│   ├── reflect/               # プレビュー反映エンジン
│   ├── handlers/              # handlers.ts から分割したイベント系モジュール
│   └── ui/                    # UI 層（テンプレート・styles/*.css・コンポーネント）
└── tools/                     # ← 親ディレクトリ（生成物の出力先）
    ├── 差分比較.js             # lite 生成物
    └── ...                    # 他の生成物
```

## 共有モジュールの注意点

- `tabs/design-xlsx.ts` は `tabs/design.ts` と `tabs/design-standalone.ts`（lite 版）の**両方**からインポートされる。変更時は両方に影響する。
- `tabs/er.ts` の `crawl`/`buildHTML` は `tabs/er-standalone.ts`（lite 版）から使用される。
- `entries/litePanelTheme.ts` の `createLitePanel`／`makeRow` 等は全 lite 系パネルの共通 UI 基盤。変更時は軽量バンドル全体に影響する。
- `kintoneGuard.ts` の `isKintonePage`／`runOnKintonePage` は全 lite エントリ（9 本）と `boot.ts` 共通の kintone 画面ガード。文言・判定を変えると全エントリに波及する。
- `diff/export.ts` の `bundleToMarkdown` は設計書 lite（`tabs/design-standalone.ts`）から参照される。
