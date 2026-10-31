# AI Agent ガイド — kintone 統合ツール

## 重要: ビルド生成物を直接編集しないこと

`tools/` 直下の以下のファイルは **`npm run build` (esbuild)** で自動生成されます。
**絶対に手編集しないでください。** 次回ビルドで上書きされます。

### 生成ファイル一覧

| 生成ファイル (tools/) | ソースエントリ (src/entries/) | 機能の正規実装 (src/tabs/) |
|---|---|---|
| `差分比較.js` | `diff-lite-entry.ts` | `tabs/diff-standalone.ts` |
| `設計書作成.js` | `design-lite-entry.ts` | `tabs/design-standalone.ts`, `tabs/design-xlsx.ts` |
| `kintoneJS取得.js` | `jsconfig-lite-entry.ts` | `tabs/jsconfig-standalone.ts` |
| `設定取得.js` | `settings-export-lite-entry.ts` | `tabs/settings-export-standalone.ts` |
| `ER図.js` | `er-lite-entry.ts` | `tabs/er.ts`, `tabs/er-standalone.ts` |
| `プロセス実行.js` | `process-lite-entry.ts` | `tabs/process-standalone.ts` |
| `プレビュー反映.js` | `reflect-lite-entry.ts` | `tabs/reflect-standalone.ts` |
| `フィールド追加.js` | `field-lite-entry.ts` | `tabs/field-standalone.ts` |
| `kintoneレコード取得.js` | `record-lite-entry.ts` | `tabs/record-standalone.ts` |
| `CSV出力.js` | `csv-export-lite-entry.ts` | `tabs/record-standalone.ts` |
| `単機能スクリプト棚卸し.md` | — | — |

### バンドル種別

全単機能スクリプトは **軽量 lite バンドル** です。
`*-standalone.ts` + `*-lite-ui.ts` + `litePanelTheme.ts`（共通パネル UI）で自己完結する軽量パネルを提供します。
各 lite エントリ（`*-lite-entry.ts`）は `kintoneGuard.ts` の `runOnKintonePage()` で kintone 画面判定してから起動します。

統合版（`統合ツール.js`）は廃止済みです。ビルドでは生成せず、既存ファイルがあれば削除します。旧統合版のソース（`boot.ts`・`handlers.ts`・`tabs/record.ts`・`reflect/apply.ts` など）も削除済みです。lite 版を正規の公開エントリポイントとします。

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
│   ├── featureDefs.mjs        # エントリ一覧（STANDALONE_LAUNCH_ENTRIES）
│   ├── constants.ts           # 定数
│   ├── state.ts               # グローバル state
│   ├── api.ts                 # kintone REST API ラッパー（書き込みガード / revision 競合判定 / レコード全件取得 / 中止・応答待ち上限）
│   ├── runControl.ts          # 実行の中止（パネルの「中止」ボタン → API 層が次のリクエスト前で停止、読み取りは打ち切り）
│   ├── jszipLoader.ts         # lite 版共通の JSZip 動的ローダ
│   ├── utils.ts               # 汎用ユーティリティ
│   ├── kintoneGuard.ts        # kintone 画面ガード（全エントリ・boot 共通）
│   ├── entries/               # esbuild エントリポイント
│   │   ├── *-lite-entry.ts    # 軽量単機能エントリ（kintoneGuard で起動）
│   │   ├── *-lite-ui.ts       # 軽量単機能の UI パネル
│   │   ├── litePanelTheme.ts  # lite 版共通パネル UI（createLitePanel/makeRow 等）
│   │   └── appSearchControl.ts # アプリ名検索コントロール（lite 共通）
│   ├── tabs/                  # 各タブの正規実装
│   │   ├── *.ts               # 共通タブロジック
│   │   ├── record-query.ts    # レコード取得クエリ / CSV / ZIP 命名 / 分割書き込みの純粋ヘルパー
│   │   └── *-standalone.ts    # lite 版用に統合 UI 依存を外した関数群
│   ├── diff/                  # 差分エンジン
│   ├── reflect/               # プレビュー反映エンジン
│   ├── handlers/              # 差分行のフォーカス移動
│   └── ui/                    # UI 層（ダイアログ・共通コンポーネント）
└── tools/                     # ← 親ディレクトリ（生成物の出力先）
    ├── 差分比較.js             # lite 生成物
    └── ...                    # 他の生成物
```

## 共有モジュールの注意点

- `tabs/design-xlsx.ts` は `tabs/design-standalone.ts`（lite 版）からインポートされる。
- `tabs/er.ts` の `crawl`/`buildHTML` は `tabs/er-standalone.ts`（lite 版）から使用される。
- `entries/litePanelTheme.ts` の `createLitePanel`／`makeRow` 等は全 lite 系パネルの共通 UI 基盤。変更時は軽量バンドル全体に影響する。
- `kintoneGuard.ts` の `isKintonePage`／`runOnKintonePage` は全 lite エントリ共通の kintone 画面ガード。文言・判定を変えると全エントリに波及する。
- `diff/export.ts` の `bundleToMarkdown` は設計書 lite（`tabs/design-standalone.ts`）から参照される。
- フィールドの設定項目名は `diff/label-dict.ts` の `FIELD_SETTING_LABELS`、path からの項目名の解決は `diff/enrich.ts` の `fieldSettingIdentity` に統一する（差分の画面・Excel・Markdown が共用）。フィールドの表示名は `buildFieldLabelResolver` で比較元・比較先の設定から引く。差分行の値（`left` / `right`）がフィールド定義なのはフィールド全体の行だけで、選択肢の行の `label` は選択肢名。
- レコード取得は `api.ts` の `fetchRecordsByQuery`（order by 無し: `$id` シーク / あり: cursor API）に統一する。
- 利用者向けの文言（タイトル・ヒント・注記・操作の説明・ステータス）は `docs/ui-writing-guide.md` に従う。見出しのバッジは影響範囲（`tone: 'read' | 'preview' | 'production'`）を 1 つだけ付ける。
- 環境内の全アプリの一覧は `api.ts` の `fetchAllApps(guestId?)`（`/apps.json` を 100 件ずつ最後まで取得。ゲストスペースは別に取得）。`entries/appSearchControl.ts` の「環境内の全アプリ」が使い、割り当て先に `applyAll` を持たせると「候補 N 件をすべて追加」ボタンが出る。複数アプリを受け付ける入力欄だけに `applyAll` を付ける（比較元・反映元など単一の入力には付けない）。アプリ表への一括投入は `makeAppTable().putApps()`（変更通知 1 回）を使う。
- 確認画面・確認ダイアログで対象アプリを列挙するときは `utils.ts` の `summarizeList`（先頭 20 件＋「…ほか N 件（合計 M 件）」。`liteWorkflow.ts` からも再公開）を使い、全アプリ指定で数千行にしない。カンマ区切りの対象アプリ欄（レコード管理・データ品質チェック・ER図）は `entries/recordTargetApps.ts` を使う。アプリごとにネイティブの確認を出す本番書き込み（ステータス更新・コピー）は `PER_APP_CONFIRM_APP_LIMIT`（50）で件数を制限している。
- 複数の反映先へ書き込む処理（フィールド追加 `runFieldApplyMultiStandalone`、JS/CSS `runApplyJsConfigMultiStandalone`）は、全対象の事前確認 → 最終確認 1 回 → 事前確認の revision を送って 1 件ずつ反映（競合は上書きしない、失敗後も続行、中止後は「未実行（中止）」）の順に揃える。
- `runControl.ts` は全 lite パネル共通の中止基盤。`createLitePanel` の `setBusy(true)` が `beginRun()`、「中止」ボタンが `requestCancel()`、`api.ts` が各リクエスト前に `throwIfCancelled()` を呼ぶ。読み取り（GET / fetch）は `activeAbortSignal()` で進行中でも打ち切るが、書き込みは進行中のリクエストを待ってから止める。複数件を順に処理するループは `isRunCancelledError` で中止を見分け、残りを「未実行（中止）」として報告する（1 件の中止を N 件の失敗にしない）。
- `api.ts` の `assertAllowsMutatingRestCall` は本番 prefix への書き込みを原則拒否する。例外はレコード API、`/records/cursor.json`（読み取り用ハンドル）、プレビュー反映が別アプリの JS/CSS を渡すための `POST /file.json`（一時ファイルのアップロード。パスの完全一致のみ）。
- プレビュー反映で反映できる項目と実行順は `reflect/sections.ts` の `REFLECT_SECTION_KEYS` が正規の一覧（一般設定 `appSettings` を含む）。共有の `SECTION_DEFS` の `put` は他ツールにも波及するため、反映項目を増やすときはこちらを変更する。
- 設定の書き戻し（フィールド追加 / JS/CSS 設定）は GET の `revision` を送り、`decorateRevisionConflict` で競合を利用者へ通知する。
