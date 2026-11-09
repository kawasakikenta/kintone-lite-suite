# test-harness

現行の単機能liteバンドルと出力レイアウトを確認するための補助ハーネスです。廃止済みの `tools/統合ツール.js` は使用しません。

## 前提

リポジトリ直下で依存を導入し、生成物を更新します。

```bash
npm ci
npm run setup
npm run build
```

Playwrightハーネスは既定でChromeを使用します。ダウンロード名（日本語）を検証するため、ロケールが C/POSIX の環境では `LANG=C.UTF-8 LC_ALL=C.UTF-8` を付けて実行してください（Chromium が非 ASCII のファイル名を `download` に置き換えるため）。`--browser chromium` を指定する場合は、Playwright Chromiumも導入してください。出力先の `.iter-shots/` と `tools/test-harness/outputs/` はGit管理外です。

## ハーネス一覧

全機能をまとめて検証する場合は `npm run test:all` を実行します。型検査・単体テスト・ビルドに続けて全ハーネスを実行し、結果を `.iter-shots/all-tests/results.json` に保存します。Chromium を使用する場合は `npm run test:all -- --browser chromium` を指定してください。

| コマンド | 確認内容 |
| --- | --- |
| `npm run test:lite-shared` | 共通検索の100件超・再試行・重複防止・古い応答の破棄・ゲスト切り替え、「環境内の全アプリ」の全ページ取得・二重実行防止・失敗後の再試行・「すべて追加」と重複防止・2000件の一括追加、タブのキーボード操作、選択範囲への一括貼り付け、1000行入力、警告保持・失敗復帰、実行中の「中止」（次のリクエストを送らない・閉じるの復帰・前回の所要時間）、結果ログのコピー／保存、詳細設定・ほかの操作のポップアップと「?」ヘルプ、320〜1440px、パネル再起動と位置の引き継ぎを実ブラウザで検証 |
| `npm run test:record-metadata` | 公式API形式の合成応答で一覧の条件・並び順・全件への解除・対象変更時の無効化、添付フィールド名からの選択・テーブルコード・確認画面・ゲスト切替・320〜1440pxを実ブラウザで検証。`.iter-shots/record-metadata/` に画面と結果を保存 |
| `npm run test:output-layouts` | HTML、通常の設計書Markdown・AI向けMarkdown、CSV、Mermaidなどを合成データで生成。親CSV・複数テーブルの明細CSVは `outputs/record-subtables/` に保存し、ID・件数・空テーブル・値の保持も検証 |
| `npm run test:diff-multi-dom` | 複数比較先、途中失敗、二重実行防止、成功行ごとの Markdown 内容（比較方向・別比較先の混入防止）を実ブラウザDOMで検証 |
| `npm run test:diff-pairs-dom` | 1対1ペア一括の入力検証、接続先別キャッシュ、途中失敗、結果対応、成功ペアの Markdown スナップショット（方向・不完全状態）と出力導線を実ブラウザDOMで検証 |
| `npm run test:diff-pair-folders-dom` | 複数対複数のフォルダ取込、安全な自動対応、明示的な対応確認、JSONだけの比較、ペア別 Markdown スナップショットと出力導線を実ブラウザDOMで検証 |
| `npm run test:diff-compare` | `tools/差分比較.js` のHEAD版と作業ツリー版を比較。作業ツリー版は意味・操作契約、完全／不完全、差分0件、レビュー、出力（フィルタ済み／全件 Markdown を含む）、技術情報とモバイル差分値の初期折りたたみ、完了後CTA、画面幅・倍率相当も検証 |
| `npm run test:er-compare` | `tools/ER図.js` のHEAD版と作業ツリー版を倍率・画面幅別に比較 |
| `npm run test:reflect-dom` | プレビュー反映の4ステップ、用語、進めない理由の表示、URL貼り付けからのID読み取り、入力中のアプリ名確認、項目の説明と「置換」の目印、要約表と変更の要約、参照フィールド不足からの再取得、一般設定、JS/CSSのアップロードとバックアップへの埋め込み、未公開の変更の表示、実行中の進捗、取り消しの案内とバックアップから戻す、計画・記録のMarkdown、続けて反映する反映先、参照先変換の行形式、プリセットのJSON書き出し・読み込み、実エンジン＋合成APIで送信内容・revision・バックアップ順序・外部更新時の停止・削除確認・参照不足、二重実行防止、差分の鮮度、対象選択、JSON読込、部分失敗・再試行、反映後の再確認、キーボード操作、320〜1440pxの5サイズを合成データで検証。実アプリには通信せず、`.iter-shots/reflect-lite-dom/` に画面・結果・操作デモを保存 |
| `npm run test:deploy-dom` | 本番反映の操作の切り替え（反映元アプリから本番へ／プレビューの変更を公開）と、「プレビューの変更を公開」の4段階、進めない理由、対象の入力（URL・カンマ区切り・環境内の全アプリ）、詳細設定、差分確認の表示（変更あり・未公開の変更なし・取得失敗・反映処理中・削除フィールドとコード変更の可能性・revision だけが異なるアプリ）、取得失敗・処理中を選んだままでは進めないこと、取得失敗・処理中だけの再確認と対象から外す操作、計画のMarkdown、最終確認（ID・件数の入力、Enter で実行しない、前の段階・選択・条件変更での確認解除）、変更を中止の表示、実行中の状態更新と二重実行防止、成功・部分失敗・まとめて反映の失敗・確認後に更新・完了を確認できない・blocked・revision 不一致・例外・中止の表示、結果JSON・記録Markdownの保存、失敗・未実行だけ選び直す、1000件の確認と実行（全行を描画しない）、320〜1440pxの横はみ出しを、エンジンだけを合成エンジンに差し替えて検証。続けて `deploy-engine-scenarios.cjs` が、実エンジンを束ねた画面を合成 kintone API（本番・プレビューの全項目の GET、`POST /k/v1/preview/app/deploy.json` の revision 照合と PROCESSING → SUCCESS／FAIL／CANCEL、ゲストスペースの URL、ファイル本体の取得）につなぎ、1 アプリの本番反映（削除フィールドの警告・バックアップが依頼より前・本番とプレビューの revision 一致）、未公開の変更なしのアプリの除外と設定本体を取得しないこと、確認後・実行の途中にプレビューが更新されたときの停止、1 アプリずつの失敗で残りを実行しないこと、依頼の拒否、まとめて反映の失敗（依頼は 1 回で全件）、変更を中止（`revert: true`・中止前のプレビューのバックアップ）、JS/CSS 本体の取得失敗での停止とバックアップへの埋め込み、ゲストスペースの URL、依頼前・完了待ちの途中の「中止」を、画面の表示と送信内容の両方で検証し、各シナリオで deploy.json の POST 以外の書き込みが無いことを確認。さらに `deploy-source-scenarios.cjs` が、「反映元アプリから本番へ」の5段階（対象を選ぶ・差分を選ぶ・内容を修正・最終確認・結果）を、差分の抽出・選択の作り直し・連続反映のエンジンだけを合成エンジンに差し替えて検証する。進めない理由、差分の選択（行・グループ・すべて・requires の連動・絞り込み・取得失敗で進めない・選択の組み合わせの問題の表示・3000 件の変更を畳んで描画）、修正（入力欄と元に戻す・JSON の適用・誤り・取り消し）、最終確認（未公開の変更の了承と、確認できなかったときの了承・ID 入力・Enter で実行しない・条件変更での解除・目標がプレビューまでのとき）、`runSourceToProductionStandalone` に渡る内容（composed・goal・allowPendingChanges・scopes・baseline）、結果（成功・プレビューまで・本番へ反映しなかった・書き込みの失敗・本番への反映の失敗・revision 不一致・中止・書き込み前の停止・実行中の例外）、結果JSON・記録Markdown、二重実行と実行中の操作の切り替えの防止、320〜1440pxの横はみ出し無しを確認する。実アプリには通信せず、`.iter-shots/deploy-lite-dom/` に画面・結果を保存。`KUS_PLAYWRIGHT_EXECUTABLE` でブラウザの実行ファイルを指定できる |
| `npm run test:lite-workflows` | 設計書・設定取得・ER図・プロセス図・CSV出力・フィールド・JS/CSS・レコードの操作選択、確認、実行、二重実行防止、入力検証、失敗復帰、320〜1440pxの4サイズを合成データで検証。複数アプリ向けの操作（フィールド追加・JS/CSSの「複数の反映先プレビューへ反映」、プロセス図の ZIP 一括保存）の表示・確認・実行と、JS/CSS で FILE 形式を含む JSON を止めることも検証。`.iter-shots/lite-workflows/` に画面・結果・操作デモを保存 |

`test:record-metadata` は、CSVの全アプリ事前検査・行/フィールド別エラー・構成の異なるアプリ・先頭行プレビュー・不正CSVの書込前停止・実行時再検査・キャンセルも検証します。プロセスでは同名アクションの遷移元区別、実行できない同名重複、次の作業者、SECONDARYアクション、生成クエリの取り違え防止を検証します。

before/after比較は、作業ツリーの生成物を更新してから実行します。`--before-ref`、`--before-file`、`--after-file`、`--out`、`--browser` などの詳細は各スクリプトの `--help` を参照してください。

ER図のレイアウト検証では、CDNをローカル依存に置き換えるため、検証専用HTMLのSRIを差し替えた実体から再計算します。生成HTMLの原本は保持し、CDN遮断時のフォールバックは原本で検証します。

差分比較ハーネスは、見た目のCSSクラスではなく、ARIA名と `data-kus-dl-*` / `data-report-*` の公開操作契約を優先して操作します。作業ツリー版では320 / 390 / 768 / 1024 / 1440pxと、固定1440×900画面に対する80 / 100 / 125 / 150 / 200%相当を撮影し、横はみ出し、固定UI同士の重なり、操作要素の被覆、フォーカス喪失を検査します。画像・HTML・Excel・JSONはGit管理外の `.iter-shots/` にだけ保存します。

## CIでの実行

通常の PR と main への push では、基本検証の後に `browser-dom` ジョブで複数比較先・ペア・フォルダペア・プレビュー反映・本番反映・lite 操作の DOM ハーネスを実行します。ブラウザはロック済みの Playwright に対応する Chromium を導入し、各コマンドへ `--browser chromium` を指定します。

`browser-compare` は差分比較／ER図の対応する UI・出力ソース、生成バンドル、ハーネス、共通 UI・依存・CI 設定の変更時に対象だけを実行します。GitHub Actions の `Run workflow`（`workflow_dispatch`）では両方を実行します。比較元は PR の base SHA、push 前の SHA、手動実行では直前コミットです。基準コミットを取得できない場合は直前コミット、履歴がない場合は現在のコミットを使います。現在のコミットを基準とした場合も現行版の操作・レイアウト検査は行いますが、変更前後の差はありません。

ハーネスは合成データを使用し、実際の kintone アプリには通信しません。HTML・JSON・PNG・Excel などは成功／失敗時とも `.iter-shots/` から Actions artifact として 7 日間保存し、Git には追加しません。GitHub Actions 上の初回実行結果は、ワークフロー反映後に確認してください。

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
