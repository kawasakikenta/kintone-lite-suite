# AI Agent ガイド — kintone 統合ツール

## 重要: ビルド生成物を直接編集しないこと

`tools/` 直下の以下のファイルは **`npm run build` (esbuild)** で自動生成されます。
**絶対に手編集しないでください。** 次回ビルドで上書きされます。

### 生成ファイル一覧

| 生成ファイル (tools/) | ソースエントリ (src/entries/) | 機能の正規実装 (src/tabs/) |
|---|---|---|
| `統合ツール.js` | `src/index.ts` | 全タブ |
| `差分比較.js` | `diff-lite-entry.ts` | `tabs/diff.ts`, `tabs/diff-standalone.ts` |
| `設計書作成.js` | `design-lite-entry.ts` | `tabs/design.ts`, `tabs/design-standalone.ts`, `tabs/design-xlsx.ts` |
| `kintoneJS取得.js` | `jsconfig-lite-entry.ts` | `tabs/jsconfig.ts`, `tabs/jsconfig-standalone.ts` |
| `設定取得.js` | `settings-export-lite-entry.ts` | `tabs/settings-export.ts`, `tabs/settings-export-standalone.ts` |
| `ER図.js` | `er-lite-entry.ts` | `tabs/er.ts`, `tabs/er-standalone.ts` |
| `プロセス実行.js` | `process-lite-entry.ts` | `tabs/process.ts`, `tabs/process-standalone.ts` |
| `プレビュー反映.js` | `reflect-lite-entry.ts` | `tabs/reflect.ts`, `tabs/reflect-standalone.ts` |
| `フィールド追加.js` | `field-lite-entry.ts` | `tabs/field.ts`, `tabs/field-standalone.ts` |
| `kintoneレコード取得.js` | `record-lite-entry.ts` | `tabs/record.ts`, `tabs/record-standalone.ts` |
| `単機能スクリプト棚卸し.md` | — | — |

### バンドル種別

全単機能スクリプトは **軽量 lite バンドル** です。`boot.ts`（統合ツールのフル UI）を含まず、
`*-standalone.ts` + `*-lite-ui.ts` + `liteMount.ts` で自己完結する軽量パネルを提供します。

統合版（`統合ツール.js`）はフル UI バンドルで全タブ機能を含みます（現在は約 2MB）。
lite 版は必要な機能のみバンドルするため、各ファイルは機能ごとに数十〜数百KB程度です。

## 修正ワークフロー

1. **ソースを編集**: `tools/統合ツール/src/` 配下のファイルを変更する
2. **再ビルド**: `cd tools/統合ツール && npm run build`
3. ソース 1 箇所の変更が **最大 10 本の生成 JS** に波及する

## ディレクトリ構成

```
tools/統合ツール/
├── build.js                   # ビルドスクリプト（esbuild）
├── src/
│   ├── index.ts               # 統合版エントリ
│   ├── boot.ts                # 統合版の起動・UI 構築
│   ├── featureDefs.mjs        # エントリ一覧（STANDALONE_LAUNCH_ENTRIES）
│   ├── register-api.ts        # window.__KUS__ 公開 API
│   ├── constants.ts           # 定数
│   ├── state.ts               # グローバル state
│   ├── api.ts                 # kintone REST API ラッパー
│   ├── utils.ts               # 汎用ユーティリティ
│   ├── handlers.ts            # イベント委譲
│   ├── entries/               # esbuild エントリポイント
│   │   ├── *-lite-entry.ts    # 軽量単機能エントリ
│   │   ├── *-lite-ui.ts       # 軽量単機能の UI パネル
│   │   └── liteMount.ts       # lite 版共通パネルマウント
│   ├── tabs/                  # 各タブの正規実装
│   │   ├── *.ts               # 統合版で使うタブロジック
│   │   └── *-standalone.ts    # lite 版用に統合 UI 依存を外した関数群
│   ├── diff/                  # 差分エンジン
│   ├── reflect/               # プレビュー反映エンジン
│   └── ui/                    # UI 層（テンプレート・スタイル・コンポーネント）
└── tools/                     # ← 親ディレクトリ（生成物の出力先）
    ├── 統合ツール.js           # 生成物
    ├── 差分比較.js             # 生成物
    └── ...                    # 他の生成物
```

## 共有モジュールの注意点

- `tabs/design-xlsx.ts` は `tabs/design.ts`（統合版）と `tabs/design-standalone.ts`（lite 版）の**両方**からインポートされる。変更時は両方に影響する。
- `tabs/er.ts` の `crawl`/`buildHTML` は統合版と `tabs/er-standalone.ts`（lite 版）の両方から使用される。
- `entries/liteMount.ts` は全 lite 系パネルの共通基盤。変更時は軽量バンドル全体に影響する。
- `diff/export.ts` の `bundleToMarkdown` は統合版・設計書 lite・差分 lite から参照される。
