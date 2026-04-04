# kintone 統合ツール

kintone アプリ設定の差分比較・プレビュー反映・設計書出力・レコード運用・可視化・API 試験を 1 つにまとめた統合運用ブックマークレットです。

## セットアップ

```bash
cd tools/統合ツール
npm install
```

## ビルド

```bash
npm run build
```

`tools/統合ツール_差分反映追加設計書.js` に単一 IIFE として出力されます。


> `npm run build` 実行時に、互換用の個別エントリポイント（`tools/*.js`）と共通ランチャー（`tools/統合ツール起動.js`）も自動生成されます。


開発時はファイル変更を監視して自動ビルドできます。

```bash
npm run watch
```

## 使い方

1. `npm run build` で出力された JS ファイルの内容をブラウザのブックマークレットとして登録
2. kintone の画面上でブックマークレットを実行
3. フローティングダイアログが表示される

### 画面の使い方（UI）

- **ランチャー**: 比較元・比較先の入力を確認したうえで、カードをクリックして機能エリアへ入ります（**Enter / Space** でも選択可）。
- **接続・共通設定**: 上部の折りたたみパネルにまとまっています。**機能を開いたあとも常に表示**されるので、アプリIDの変更や共通データ取得が可能です（閉じて作業領域を広げられます）。
- **タブ**: 機能画面ではタブバーが**スクロール時に上部に固定**され、切り替えやすくなっています。
- **戻る**: ヘッダーの「← 戻る」でランチャーに戻ります。

## プロジェクト構成

```
tools/統合ツール/
├── src/
│   ├── index.js              # エントリポイント（環境チェック → DOM生成 → 初期化）
│   ├── constants.js          # 定数定義（TOOL_ID, SECTION_DEFS, META_KEYS 等）
│   ├── state.js              # グローバルstate, localStorage永続化, ui参照
│   ├── api.js                # kintone API ラッパー（GET/PUT/POST, fetchBundle）
│   ├── utils.js              # 汎用ユーティリティ（escape, clone, normalize, download等）
│   ├── handlers.js           # イベント委譲ディスパッチ（data-act, キーボードショートカット）
│   │
│   ├── diff/                 # 差分エンジン
│   │   ├── engine.js         # コア差分アルゴリズム（deepDiff, LCS, objectKey比較）
│   │   ├── enrich.js         # 差分行の補強（重要度, リネーム検出, 影響分析）
│   │   ├── filter.js         # フィルタリング, エクスポート条件解決
│   │   └── export.js         # HTML/Excel/Markdown/パッチ出力, 差分表示レンダリング
│   │
│   ├── reflect/              # プレビュー反映
│   │   ├── plan.js           # 反映プラン構築, 確認UI, セクション別差分計画
│   │   ├── apply.js          # 反映実行, バックアップ, デプロイ
│   │   └── helpers.js        # 反映共通ヘルパー（進捗表示, スコープ解決等）
│   │
│   ├── ui/                   # UI層
│   │   ├── styles.css        # 全CSS（カスタムプロパティでテーマ管理, ライト/ダーク対応）
│   │   ├── template.js       # メインHTML構築（buildRoot）
│   │   ├── dialog.js         # ダイアログ制御（ドラッグ, リサイズ, 位置記憶）
│   │   ├── components.js     # 共通UIコンポーネント（ステータス, チップ, サイドバー等）
│   │   └── tour.js           # ガイドツアー機能
│   │
│   └── tabs/                 # タブ別ロジック
│       ├── diff.js           # 差分比較タブ
│       ├── reflect.js        # プレビュー反映タブ
│       ├── field.js          # フィールド追加タブ
│       ├── jsconfig.js       # JS/CSS設定タブ
│       ├── design.js         # 設計書タブ
│       ├── er.js             # ER図タブ
│       ├── process.js        # プロセス図タブ
│       ├── settings-export.js# 設定一括取得タブ
│       ├── record.js         # レコード管理タブ
│       ├── sql.js            # SQL実行タブ
│       └── api-tester.js     # APIテスタータブ
│
├── build.js                  # esbuild バンドルスクリプト
├── package.json
└── README.md
```

## ビルドシステム

[esbuild](https://esbuild.github.io/) でモジュールを単一 IIFE にバンドルします。

- エントリポイント: `src/index.js`
- 出力形式: IIFE（即時実行関数）
- CSS: カスタム esbuild プラグインで `.css` ファイルを JS 文字列としてインライン化し、実行時に `<style>` タグとして注入
- ターゲット: ES2020
- 外部依存: なし（JSZip, Cytoscape は実行時に動的ロード）

## 機能一覧

| タブ | 概要 |
|------|------|
| 差分比較 | 2アプリ間の設定差分を比較。セクション選択・無視キー・正規化プリセット対応 |
| プレビュー反映 | 差分をもとに比較先プレビューへ設定を反映。セクション/ノード単位選択、バックアップ、デプロイ |
| フィールド追加 | フィールドJSON編集・比較元から追加・フィールドコード一括整備 |
| JS/CSS設定 | JS/CSSカスタマイズの取得・反映・一括ZIPダウンロード |
| ER図 | ルックアップ/関連レコードを辿ったER図生成、フィールド依存関係マップ |
| プロセス図 | プロセス管理のMermaidフロー図生成・状態遷移シミュレーション |
| 設計書 | 設計書JSON/Markdown/Excel出力、差分レポート |
| 設定一括取得 | 複数アプリの設定をまとめてJSON/ZIP出力、テンプレート管理 |
| レコード管理 | テストデータ生成・一括削除・ステータス更新・添付DL・CSV・アプリ間コピー |
| SQL実行 | kintoneデータへのSQLライク実行画面 |
| APIテスター | kintone REST APIの直接実行（GET/POST/PUT/DELETE） |

## 典型的な利用フロー

1. 比較元（開発環境）と比較先（本番環境）のアプリIDを設定
2. 差分比較タブで設定差分を確認
3. 反映プランを確認し、問題なければプレビュー反映を実行
4. デプロイして本番に適用
5. 設計書や差分レポートを出力して記録を残す


## 正規実装と公開エントリ

統合後の運用では、機能ロジックは `src/tabs/*.js` を正規実装とし、`tools/*.js` は互換用の公開エントリポイントとして管理します。

| 機能名 | 正規モジュール | 公開エントリ |
|---|---|---|
| 差分比較 | `src/tabs/diff.js` | `../差分比較.js` |
| プレビュー反映 | `src/tabs/reflect.js` | `../プレビュー反映.js` |
| フィールド追加 | `src/tabs/field.js` | `../フィールド追加.js` |
| JS/CSS設定 | `src/tabs/jsconfig.js` | `../kintoneJS取得.js` |
| 設定一括取得 | `src/tabs/settings-export.js` | `../設定取得.js` |
| 設計書 | `src/tabs/design.js` | `../設計書作成.js` |
| ER図 | `src/tabs/er.js` | `../ER図.js` |
| プロセス図 | `src/tabs/process.js` | `../プロセス実行.js` |
| レコード管理 | `src/tabs/record.js` | `../kintoneレコード取得.js` |
| SQL実行 | `src/tabs/sql.js` | `../kintoneSQL.js` |

詳細な棚卸し・削除対象分類は `../単機能スクリプト棚卸し.md` を参照してください。

## 注意事項

- 反映系処理は比較先プレビューまたは本番データに影響します
- 全レコード削除・CSVインポート・アプリ間コピーは実データ変更を伴います
- 反映前にバックアップ取得を推奨します
