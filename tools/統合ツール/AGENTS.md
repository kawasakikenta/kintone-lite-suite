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
| `本番反映.js` | `deploy-lite-entry.ts` | `tabs/deploy-standalone.ts`・`tabs/deploy-source-standalone.ts`（取り決めの型は `deploy/types.ts`・`deploy/sourceTypes.ts`・`reflect/selectionTypes.ts`、画面は `entries/deploy-lite-ui.ts`・`entries/deploy-source-ui.ts`） |
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
│   ├── jszipLoader.ts         # lite 版共通の ZIP 作成の入口（loadJSZipLite は自前実装 archive/lite-zip.ts を返す。通信しない）
│   ├── archive/               # ZIP 実装（lite-zip.ts: JSZip 互換の最小 API・DEFLATE/STORE・classic ZIP の上限検査 / stored-zip.ts: 差分比較用の STORE 専用・決定的 / crc32.ts）
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
│   │   ├── record-zip-split.ts # 添付保存・バックアップで ZIP を分ける位置の計画（レコード単位・上限は archive/lite-zip.ts の定数）
│   │   └── *-standalone.ts    # lite 版用に統合 UI 依存を外した関数群
│   ├── diff/                  # 差分エンジン
│   ├── reflect/               # プレビュー反映エンジン
│   ├── deploy/                # 本番反映（types.ts・sourceTypes.ts: エンジンと画面の取り決め / display.ts・report.ts・sourceDisplay.ts・sourceReport.ts: 表示・Markdown・結果 JSON の純粋関数 / sourceSession.ts: 差分の選択・修正の状態と、抽出し直したときの引き継ぎ / sourceSelectionFile.ts: 選んだ変更と修正の保存ファイル（組み立て・検証・照合・現在の抽出結果への当てはめ） / sourceVerify.ts: 「反映後の内容を確認する」（選んだ変更の期待する値の組み立て・判定・文言） / sourceRestore.ts: 「バックアップから戻す」（戻す内容の選び方・段階 1 へ設定する内容） / sections.ts・inspect.ts: エンジン）
│   ├── handlers/              # 差分行のフォーカス移動
│   └── ui/                    # UI 層（ダイアログ・共通コンポーネント）
└── tools/                     # ← 親ディレクトリ（生成物の出力先）
    ├── 差分比較.js             # lite 生成物
    └── ...                    # 他の生成物
```

## 共有モジュールの注意点

- `api.ts` の `apiPost` は、第 4 引数（試行回数の上限、省略時は従来どおり 3）を受け取る。応答だけ届かなかった塊を再送すると二重に登録されるレコード追加（CSV取込・コピーの `POST /records.json`）だけが `1` を渡して自動再送を止める。ほかの呼び出し（設定の PUT/POST、本番反映の deploy.json は従来どおり自動再試行なし）は引数を渡さず、動作は変わらない。
- 添付ファイル保存・バックアップの ZIP は、`tabs/record-zip-split.ts` が取得の前にレコード単位で分け（1 つ分を取得するたびに保存して Blob を手放す）、上限は `archive/lite-zip.ts` の `LITE_ZIP_MAX_BYTES`・`LITE_ZIP_MAX_ENTRIES` を使う（見積もりは STORE の大きさで、DEFLATE で縮んでも上限を超えない）。
- `tabs/design-xlsx.ts` は `tabs/design-standalone.ts`（lite 版）からインポートされる。
- `tabs/er.ts` の `crawl`/`buildHTML` は `tabs/er-standalone.ts`（lite 版）から使用される。`crawl` は深さごとに同時 `ER_DEFAULTS.concurrency`（4）アプリまで読み取り、結果は見つけた順に取り込む（`runOrdered`。並び・深さ・関連は直列のときと同じ。中止の件数は読み取りを終えたアプリを数える）。
- ER図 HTML の描画ライブラリ（Cytoscape・Dagre・cytoscape-dagre）は `tabs/er-libraries.ts` が `?raw` で取り込み、`buildHTML` が head へインラインで埋め込む。`build.js` は `rawTextPlugin.js`（`?raw` を文字列として取り込む esbuild プラグイン。`tools/test-harness/run-output-layouts.mjs` も使う）、単体テスト（Vitest）は標準の `?raw` で解決する。版は `package.json` の devDependencies で固定し、`tests/er-html.test.ts` が同梱版との一致を検査する。`EXTERNAL_LIBRARIES`（`constants.ts`）に ER図のライブラリは無い。同梱するのは `ER図.js` だけで、ほかの bundle に入らないことをサイズで確認する。図の本体（`er-main`）は `type="text/plain"` の script で、起動用の script が `window.cytoscape` の有無を見て実行する。
- ER図の関連（`ErRelation`）は、キーと結合条件に加えて `copyFields`（コピーするフィールドの対応）・`displayFields`・`filterCond` を持つ。説明文は `er-model.ts` の `describeErRelationCopy`・`describeErRelationDisplay`・`describeErRelationFilter` が正で、図の画面（`er.ts` の埋め込みスクリプトの `relCopyText` ほか）は同じ結果にする（`tests/er-relation-details.test.ts` で照合）。
- `entries/litePanelTheme.ts` の `createLitePanel`／`makeRow` 等は全 lite 系パネルの共通 UI 基盤。変更時は軽量バンドル全体に影響する。
- `kintoneGuard.ts` の `isKintonePage`／`runOnKintonePage` は全 lite エントリ共通の kintone 画面ガード。文言・判定を変えると全エントリに波及する。
- `diff/export.ts` の `bundleToMarkdown` は設計書 lite（`tabs/design-standalone.ts`）から参照される。
- 1対多・ペア一括の結果は保存のためにメモリへ保持する。保持する前に `diff/retention.ts` の `stripComparisonScratchForRetention` で、JS/CSS の本文（`_bodyText`・`_bodyHash`）とプラグイン設定の取得結果（`_config`）を取り除く（出力は読まない。比較先が数百件で保持量の大半だった）。一部未検証の判定（`collectPartialComparisonIssues`）は本文の有無を見るため、必ず取り除く前に行う。
- 「並び順を無視」の正規化を適用したセクションの差分行は `_orderNormalized` を持つ。path の添字が並べ替え後の位置を指すため、元の設定の同じ添字から要素を引いて名前を付けない（`enrich.ts` の `layoutFieldCaption`、`xlsx-export.ts` の `customerLayoutItemParts`）。入れ子の配列の行は外側の識別子を `parentArrayKey` / `parentArrayKeyValue` に持つ（フィールド権限の宛先ごとの行が対象のフィールドを示す）。
- 業務アプリに近い合成設定での通し検証は `tools/test-harness/diff-explore.cjs`（`npm run test:diff-explore`）。合成設定は `diff-explore-world.cjs`。差分比較の判定・見出し・出力を変えたら実行する。
- フィールドの設定項目名は `diff/label-dict.ts` の `FIELD_SETTING_LABELS`、path からの項目名の解決は `diff/enrich.ts` の `fieldSettingIdentity` に統一する（差分の画面・Excel・Markdown が共用）。フィールドの表示名は `buildFieldLabelResolver` で比較元・比較先の設定から引く。差分行の値（`left` / `right`）がフィールド定義なのはフィールド全体の行だけで、選択肢の行の `label` は選択肢名。
- レコード取得は `api.ts` の `fetchRecordsByQuery`（order by 無し: `$id` シーク / あり: cursor API）に統一する。
- 利用者向けの文言（タイトル・ヒント・注記・操作の説明・ステータス）は `docs/ui-writing-guide.md` に従う。見出しのバッジは影響範囲（`tone: 'read' | 'preview' | 'production'`）を 1 つだけ付ける。
- 環境内の全アプリの一覧は `api.ts` の `fetchAllApps(guestId?)`（`/apps.json` を 100 件ずつ最後まで取得。ゲストスペースは別に取得）。`entries/appSearchControl.ts` の「環境内の全アプリ」が使い、割り当て先に `applyAll` を持たせると「候補 N 件をすべて追加」ボタンが出る。複数アプリを受け付ける入力欄だけに `applyAll` を付ける（比較元・反映元など単一の入力には付けない）。アプリ表への一括投入は `makeAppTable().putApps()`（変更通知 1 回）を使う。
- 確認画面・確認ダイアログで対象アプリを列挙するときは `utils.ts` の `summarizeList`（先頭 20 件＋「…ほか N 件（合計 M 件）」。`liteWorkflow.ts` からも再公開）を使い、全アプリ指定で数千行にしない。カンマ区切りの対象アプリ欄（レコード管理・データ品質チェック・ER図）は `entries/recordTargetApps.ts` を使う。アプリごとにネイティブの確認を出す本番書き込み（ステータス更新・コピー）は `PER_APP_CONFIRM_APP_LIMIT`（50）で件数を制限している。
- 複数の反映先へ書き込む処理（フィールド追加 `runFieldApplyMultiStandalone`、JS/CSS `runApplyJsConfigMultiStandalone`）は、全対象の事前確認 → 最終確認 1 回 → 事前確認の revision を送って 1 件ずつ反映（競合は上書きしない、失敗後も続行、中止後は「未実行（中止）」）の順に揃える。
- 設定取得の「プラグインの設定値を含めない」は、`fetchBundle` の `skipPluginConfig`（設定値を取得しない）と、`pluginConfigMarker.ts` の `markPluginConfigOmitted`（プラグインのセクションに `_partial` 種類 `pluginConfigOmitted` を付ける。設計書の取得状態では部分取得に数えない）で実現する。設計書（`tabs/design-standalone.ts`・`design/ai-markdown.ts`）は `design/sanitize.ts` の `stripSensitiveSupplements` で、プラグインの `_config` と JS/CSS の `_bodyText` / `_bodyHash` を Markdown・AI向けMarkdown に載せない。Markdown は `fetchBundle` の `skipPluginConfig` / `skipCustomizeBodies` で取得もしない。 読む側は、差分比較が `diff/engine.ts` で両側から設定値と目印を外して一覧だけを比べ（`collectPartialComparisonIssues` が一部未検証として示す）、プレビュー反映・本番反映が `tabs/reflect-standalone.ts` の `importedReflectSource` で目印を外す（プラグイン固有の設定値はコピーしないため）。
- `runControl.ts` は全 lite パネル共通の中止基盤。`createLitePanel` の `setBusy(true)` が `beginRun()`、「中止」ボタンが `requestCancel()`、`api.ts` が各リクエスト前に `throwIfCancelled()` を呼ぶ。読み取り（GET / fetch）は `activeAbortSignal()` で進行中でも打ち切るが、書き込みは進行中のリクエストを待ってから止める。複数件を順に処理するループは `isRunCancelledError` で中止を見分け、残りを「未実行（中止）」として報告する（1 件の中止を N 件の失敗にしない）。
- `api.ts` の `assertAllowsMutatingRestCall` は本番 prefix への書き込みを原則拒否する。例外はレコード API、`/records/cursor.json`（読み取り用ハンドル）、プレビュー反映と JS/CSS 設定が別アプリの JS/CSS を渡すための `POST /file.json`（一時ファイルのアップロード。パスの完全一致のみ）、本番反映ツールの `/app/deploy.json` への POST（preview prefix・完全一致・自動再試行なし）。
- プレビュー反映（`entries/reflect-lite-ui.ts`）の「続けて反映する反映先」の一括事前確認は、`tabs/reflect-rollout-standalone.ts` の `precheckRolloutTargetsStandalone`（反映元を `prepareReflectSourceStandalone` で 1 回だけ取得し、反映先ごとに `previewReflectStandalone(…, { source })` と `resolveReflectTargetStandalone`。読み取りだけ。中止は `runControl.ts` で「未実行（中止）」）と、DOM 非依存の `reflect/rolloutPrecheck.ts`（行は要約だけ。状態の決め方・並行実行・外す／確認し直すの対象・Markdown）が持つ。参照先変換の候補は `reflect/lookupCandidates.ts`（`previewReflectStandalone` の結果に `lookupCandidates` として載る。追加専用の項目）。`tabs/reflect-standalone.ts` と `reflect/` は本番反映（`deploy-*`）のエンジンでもあるため、公開している関数・型は互換を保ち、変更は追加だけにする。画面の入力・直前の結果・展開の記録は、`entries/deployMemory.ts` の `sharedMemory('reflect', …)`（`document.documentElement` に載せる。同じ状態オブジェクトを書き換え続ける）で持ち、閉じて開き直しても引き継ぐ。
- プレビュー反映で反映できる項目と実行順は `reflect/sections.ts` の `REFLECT_SECTION_KEYS` が正規の一覧（一般設定 `appSettings` を含む）。共有の `SECTION_DEFS` の `put` は他ツールにも波及するため、反映項目を増やすときはこちらを変更する。
- 設定の書き戻し（フィールド追加 / JS/CSS 設定）は GET の `revision` を送り、`decorateRevisionConflict` で競合を利用者へ通知する。
- JS/CSS 設定の FILE 形式（別アプリへの反映）は、`reflect/customizeFiles.ts` の `resolveCustomizeFiles` を `tabs/jsconfig-standalone.ts` の `planJsConfigFiles` から使い、反映先の同じ枠のキーはそのまま・同名同内容は再利用・それ以外は書き込み直前に `uploadJsConfigFiles` でアップロードする。取得元（`JsConfigFileSource`。UI が取得時に覚える）に無い fileKey は推測で取得せず止める。複数の反映先では取得元の本体を `cache` で共有し、反映先ごとにアップロードする。
- 本番反映（`entries/deploy-lite-ui.ts`）は、エンジンを `tabs/deploy-standalone.ts` の `validateDeployTargets`・`inspectDeployTargetsStandalone`・`runDeployStandalone` と `deploy/types.ts` の型だけで使う。状態の表示名・件数の集計・ステータス文は `deploy/display.ts`、計画・記録の Markdown と結果 JSON は `deploy/report.ts`（どちらも DOM 非依存）に置く。差分確認後に対象・操作・詳細設定が変わったら、確認は差分確認からやり直す（署名の比較）。取得失敗・反映処理中のアプリは自動で除外せず、選択している間は先へ進めない。数百件を超える結果は全行を描画せず、要約と問題のある行だけ出す。
- 本番反映パネルは、上部の「操作」で 2 つの流れを切り替える（既定は「反映元アプリから本番へ」。実行中は切り替え不可。見えない流れの DOM は外し、ステータス欄・主操作は見えている流れだけが持つ）。「反映元アプリから本番へ」（`entries/deploy-source-ui.ts`）は 5 段階（対象を選ぶ → 差分を選ぶ → 内容を修正 → 最終確認 → 結果）で、段階 2 は `entries/deploy-source-select.ts`、段階 3 は `entries/deploy-source-edit.ts`、共通の実行状況の一覧は `entries/deployProgressView.ts`、スタイルは `entries/deploy-source-style.ts`。エンジンは `tabs/reflect-standalone.ts`（`previewReflectStandalone`・`composeReflectSelectionStandalone`・`resolveReflectAppsStandalone`・`reflectConnectionError`）、`reflect/selection.ts`、`tabs/deploy-source-standalone.ts` の `runSourceToProductionStandalone` と、`reflect/selectionTypes.ts`・`deploy/sourceTypes.ts` の型だけで使う。選択・修正の状態と作り直しは `deploy/sourceSession.ts`（DOM 非依存）、表示用の純粋関数は `deploy/sourceDisplay.ts`、記録と結果 JSON は `deploy/sourceReport.ts`。抽出結果は入力の署名（`buildSourceSetupSignature`。項目は含めず、抽出時の項目の部分集合なら使い続ける）と結び付け、段階 1〜3 の変更（選択・修正・JSON・目標）のたびに確認を解除する。実行には、選んだ変更がある項目だけを `reflect.scopes` に、項目ごとの送る設定を `composed` に渡す（`composed` に無い項目は既定の計画どおり書き込まれる）。反映先プレビューの未公開の変更が clean・own 以外（pending・unknown・未指定）のとき、最終確認で了承を必須にして `allowPendingChanges: true` を渡す。数千件の変更は、項目を畳み、開いたときにグループ単位で描画する。書き込み前の検査で止まったとき（まだ何も書き込んでいない）は、抽出結果を古いものとして扱い（`extractionStale`）、段階 2〜4 の主ボタンを無効にして「差分を抽出し直す」へ案内する。抽出し直すと、同じ入力なら前回の選択（同じ change.id）と入力欄の修正（同じ pointer）を `carryOverSession` で引き継ぎ、引き継げなかった件数を示す。JSON で直した項目の入力欄には JSON の値を表示して無効にする（`deploy-source-edit.ts` の `jsonValueAt`）。プラグイン（`pluginSettings`）は、反映先に無い ID ごとの追加（`/plugins/{ID}`、whole）に分け、反映先のプラグインを外す変更は出さない（`selectionModel.ts` の `emitPluginAdditions`・`selectionCompose.ts`）。「バックアップから戻す」は、結果の「バックアップから戻す」（どちらの流れの結果にもある。「プレビューの変更を公開」の結果は `switchFlow('source')` のあと `SourceFlow.startRestore`）と、段階 1 の設定JSONで読み込んだ本番反映のバックアップファイル（`kind: 'kintone-deploy-backup'`）から始まる。バックアップ JSON 本体は `DeployBackupInfo.content`（`runDeployStandalone` が返す。`buildDeployResultJson` は含めない）と `apply.backup` から取り、反映元＝そのバックアップ、反映先＝そのアプリ、保持 OFF、参照先変換なし、目標は反映前の本番なら本番まで・反映前のプレビューならプレビューまでにする。反映元・反映先・保持・参照先変換・項目を変えると戻す状態を終え、自動で設定した値のうち変えていないものを戻す前の値に戻す。戻している間の入力は `memory` へ書かず、戻す前の入力を控える。閉じて開き直したときの `memory`（段階 1 の入力と直前の結果。公開側の対象・操作・直前の結果も）は、スクリプトを読み込み直しても残るよう `entries/deployMemory.ts` の `sharedMemory`（`document.documentElement` に載せる。メモリだけで、ページを読み込み直すと消える）で持つ。差分の抽出結果は引き継がない。差分の抽出は `previewReflectStandalone(..., { checkTargetDeployStatus: true })` で反映先の反映状況（`targetDeployStatus`）も確認し、`processing` なら `collectSelectionBlockers` の `processing` で先へ進めない（確認の失敗は注意だけ）。計算式（`expression`）と条件（`filterCond`・`sort`）が参照するフィールドは、反映元・反映先のどちらかに実在するコードと一致した語だけを参照とみなし（`kintone-query.ts` の `extractQueryFieldCodes` / `extractExpressionFieldCodes`）、`reflectRequiredFields(key, after, knownFieldCodes)` が `requiredFields` に加える。反映先に無く追加される参照先のフィールドの追加は、`reflect/selectionRequires.ts` の `attachFieldAdditionRequires`（`createSourceSession` が呼ぶ）が項目をまたいで `requires` に付ける。選択肢を持つフィールドの初期値と計算式の参照の検査は `reflect/selectionPlan.ts` の `checkFieldSettings`（compose と実行時の `buildPlanFromComposedAfter` の両方）。本番へ反映しなかったときの反映先プレビューの言い分けは `reflect/applyOutcome.ts` の `previewWriteState`（none / partial / all）。各段階の先頭の「主な操作へ移動」は `deployProgressView.ts` の `makeSkipLink`。参照先変換の候補（`previewReflectStandalone` の `lookupCandidates`。求め方・入力欄への追加は `reflect/lookupCandidates.ts` を共用）は、文言・食い違いの 1 行・表示する条件を `deploy/sourceLookup.ts`、段階 2 と最終確認の表示を `deploy-source-select.ts` の `renderLookupCandidates` に置く。「候補を参照先変換に追加して差分を取り直す」は `startExtract(carryFrom)` に前回のセッションを渡し、選択・入力欄の修正を `carryOverSession` で引き継ぐ。実行時の候補は `RunContext.lookupCandidates` に控え、記録の Markdown と結果 JSON に残す。段階 2・3 の「選択と修正を保存」「選択と修正を読み込む」は `sourceSelectionFile.ts`（`buildSelectionFile`・`parseSelectionFile`・`describeSelectionFileMismatch`・`applySelectionFile`。読み込みは `carryOverSession` と同じ規則で当てはめ、JSON での修正は土台にした反映先の設定の指紋（`settingsFingerprint`）が同じ項目だけ当てはめる。読み込みは `bump()` で確認を解除するので、最終確認は必ずやり直しになる）。結果の「反映後の内容を確認する」は、実行時に `buildVerifyExpectations`（選んだ変更の場所と、送る設定の同じ場所の値。JSON で直した項目は反映先の現在の値と違う場所）を控え、`tabs/deploy-source-standalone.ts` の `verifySourceDeployStandalone`（`fetchBundle` の読み取りと、差分の抽出と同じ `buildReflectSectionPlan` で PUT 形にする。書き込まない）の結果を `compareVerifyExpectations`（期待した値の部分集合で比べる。JS/CSS はファイル名だけ）で判定する。確認結果は `SourceRunSnapshot.verification`（メモリだけ）で持ち、記録の Markdown と結果 JSON に含める。
