# 次にやる作業（優先度順）

作成: 2026-08-11 ／ 前提は `CLAUDE.md` を先に読むこと。

各タスクは**独立して着手できる**ように書いています。上から順にやる必要はありませんが、
番号が小さいほど効果が大きい想定です。**1タスク = 1コミット**にしてください。

---

## T1. ガントの縦仮想化（最優先）

### 現状
`plugins/KintoneCalendar/src/calendar-workbench-core.js` の `renderGanttView()` は、
表示対象の全行を DOM に生成しています。仮想化のコードは存在しません。

実測（2026-08-11、実データ）:
- 487 行のガント描画に **十数秒**
- 208 行の合成データで **約 3.6 秒**、`.ktc-gantt-grid` 配下の DOM ノード **約 8,950**

120 行超で自動的に装飾を落とす「軽量モード」（`state.ganttLightweight`）を入れて
描画量は減らしましたが、**行そのものは全部作っている**ので根本解決ではありません。

### やること
`.ktc-gantt-grid` の行描画を、可視範囲 + 前後バッファのみに絞る。

1. 行の高さは密度クラス（`is-row-ultra` / `is-row-compact` / 既定 / `is-row-comfortable`）ごとに
   固定値が決まるので、**行高を定数化**して総スクロール高を計算できるようにする
2. スクロールコンテナ（`.ktc-gantt-host`）の `scroll` を購読し、
   可視範囲の行インデックスを算出して**その範囲だけ**行要素を生成
3. 上下にスペーサー要素を置いて総高を維持する
4. グループ行（`ktc-gantt-group-row`）と親子の折り畳み状態を壊さないこと
5. 既存の機能を壊さないこと: バーのドラッグ／リサイズ、行の並べ替え（`reorderEnabled`）、
   依存矢印の描画（`drawDependencyArrows`）、`scrollIntoView` 系の「今日へ」

### 注意
- 依存矢印は行の実座標を使っているので、仮想化すると**画面外の行に矢印が引けなくなります**。
  可視範囲外の端点はグリッド端でクリップする実装にしてください。
- `getGanttRows()` の戻り値（行モデル）と DOM 生成を分離すると素直に書けます。

### 完了条件
- 500 行で初回描画 **2 秒以内**、スクロールがカクつかないこと
- `npm run test:kintone-calendar` が通ること
- `tests/preview-gantt-dev.html?big=500` で before/after のスクリーンショットを撮り、
  見た目が変わっていないことを確認すること

---

## T2. ManualPlugin の外部 CDN をローカル同梱にする

### 現状
`plugins/ManualPlugin/manifest.json` の `desktop.js` が **外部 CDN 7 本**を指しています。

```
sweetalert2@11 / swiper@11 / html2canvas 1.4.1 / fabric.js 5.3.1 /
sortablejs@latest / quill 1.3.6 / jspdf 2.5.1
```

問題:
- `sortablejs@latest` は**完全に非固定**。上流の破壊的変更で本番が壊れる
- kintone の manifest は `integrity`（SRI）を指定できないので**改竄検知が原理的に不可能**
- 閉域網・プロキシ許可リスト運用の環境では**プラグインが丸ごと機能しない**
- 合計 1.2〜1.5MB を、FAB を一度も触らないユーザーを含め**全画面で無条件ロード**

読み込み失敗の検知は入れてあります（`MP.missingLibs()` → FAB が赤くなり「⚠ 読込失敗」と表示）。
これは対症療法なので、根治してください。

### やること
1. 7 本を `plugins/ManualPlugin/js/vendor/` に**バージョン完全固定**で同梱する
2. `manifest.json` の `desktop.js` は `js/utils.js` と `js/desktop.js` **だけ**にする
3. `js/utils.js` に `loadLib(name)` を追加し、動的 `<script>` 挿入で遅延ロードする
   - 「📖 閲覧」→ swiper + sweetalert2
   - 「📸 キャプチャ」→ html2canvas + fabric
   - 「📄 PDF」→ jspdf
   - 「⚙️ 整理」→ quill + sortable
4. 読み込み失敗時はネイティブ `alert` にフォールバック（`showError` は実装済み）
5. `css` 側（swiper / quill snow）も同様に同梱・遅延化

### 注意
グローバル汚染にも配慮してください。現状 `Swal` / `Swiper` / `html2canvas` / `fabric` /
`Sortable` / `Quill` / `window.jspdf` の 7 つを全アプリ画面に注入しており、
同じアプリの別プラグインが違うバージョンを読むと後勝ちで壊れます。

### 完了条件
- ネットワークを外部遮断した状態で全機能が動くこと
- `npm run check:manual-plugin` が通ること
- zip サイズを README に記録すること

---

## T3. 共通ライブラリの切り出し

### 現状
同じ処理が複数実装されています。

| 処理 | 実装箇所 |
| --- | --- |
| フォーム定義取得 | FieldTransfer `shared/api.ts` / KintoneLookupFilter `shared/kintoneClient.ts` / FieldFocusInput は desktop と config で**二重実装** |
| クエリのエスケープ | FieldTransfer `escapeQueryValue` / LookupFilter `escapeForQuery` / 同 `quote`（**`\` を見落とし・未使用**） |
| 表示文字列への変換 | 4 実装（`stringifyRecordValue` / `extractDisplay` / `fieldText` / `normalizeRecordValue`）。優先順位が微妙に違う |
| `SYSTEM_TYPES` | FieldFocusInput と LookupFilter で同一内容を二重定義 |
| ID 生成 | 3 実装 |

そして **500 件ページングを正しく扱う実装は 3 プラグインとも存在しません**。

### やること
`packages/kintone-shared/`（または `shared/`）を作り、以下を集約する。

- `fetchAllRecords(appId, query, fields)` — `limit 500` + offset、10,000 超は `$id` シークへ自動切替
- `fetchFormFields(appId)` — アプリ単位キャッシュつき
- `getAppId()` — デスクトップ / モバイル分岐
- `isGuestSpace()` — `/k/m/guest/` にも対応（現状の FieldFocusInput の正規表現はモバイル非対応）
- `escapeQueryLiteral(s)` / `quoteLiteral(s)` / `assertFieldCode(code)`
- `fieldTypes.ts` — `SYSTEM_TYPES` / `MULTI_VALUE_TYPES`（`in` が必要な型）/ `WRITABLE_TYPES` / `TEXT_QUERYABLE_TYPES`
- `toDisplayText(value, fieldType)` / `toQueryOperands(value, fieldType)`
- `types/kintone.d.ts` — `@kintone/dts-gen` の出力ベース

`MULTI_VALUE_TYPES` は下の T4 と T5 の修正に必要です。先に作ってください。

### 完了条件
- 3 プラグインが共有パッケージを参照し、重複実装が消えていること
- 各プラグインの `npm run test:*` が通ること

---

## T4. KintoneLookupFilter の条件生成バグ

`plugins/KintoneLookupFilter/src/shared/queryBuilder.ts`

1. **`:99-100`** — `isEmpty` / `isNotEmpty` が無条件に `= ""` / `!= ""` を生成している。
   多値型（CHECK_BOX / MULTI_SELECT / USER_SELECT / ORGANIZATION_SELECT / GROUP_SELECT /
   FILE / CATEGORY / STATUS_ASSIGNEE）は **`in ()` / `not in ()`** でないと実行時エラー。
   `ConditionRow.svelte` の `ALL_OPS` も型で絞り込むこと。
2. **`:41-57`** — `normalizeRecordValue` が配列を `join(',')` で潰すため、
   `eq` / `ne` / `like` では**存在しない値**で比較され常に 0 件。
3. **`shared/kintoneClient.ts:53-66`** — サブテーブル内フィールドを「編集側フィールド」候補に
   出しているが、`resolveOperand` はトップレベルしか見ないため**条件が黙って無効化**される。
   候補から `inSubtable === true` を除外する。
4. **`src/desktop/entry.ts:241,262`** — `offset` を無制限に増やすため 51 回目の
   「もっと読み込む」で必ず API エラー。`$id` カーソル方式に切り替える。

### 完了条件
`npm run test:kintone-lookup-filter` に上記 4 件の回帰テストを追加して通すこと。

---

## T5. KintoneExcelPivotViewer-ng の性能（P0 4件）

`plugins/KintoneExcelPivotViewer-ng/`

1. **`grid.component.ts:1074-1077`** — `@HostListener('document:mousemove')` を常時登録しており、
   ページ上の全マウス移動が変更検知を起動する。`fillDragActive()` が true の間だけ
   `document.addEventListener` するか、`NgZone.runOutsideAngular` に逃がす。
   `<td>` 個別の `(mousemove)` も wrap 要素 1 箇所への委譲に置換。
2. **`root.component.ts:1586,304`** — `refresh()` のたびに全行を `JSON.stringify(..., 2)` して
   `<details><pre>` に流している。`<details>` が閉じていても DOM は生成される。
   開いたときだけ生成するか、デバッグ API に一本化して UI から外す。
3. **`grid.component.ts:415-518`** — 1 セルにつき `evaluateFormula()` が 4 回、
   CF ルール走査が複数回。`Map<uid:code, {value,error}>` の評価キャッシュを
   `inputsVersion` 単位で持つ。`renderCell()` が毎回新しい `SafeHtml` 参照を返すのも直す
   （参照比較なので毎 CD で innerHTML が再設定される）。
4. **`formula.service.ts:452-466`** — `expandRange()` に上限がなく、`=SUM(A1:ZZ99999)` で固まる。
   `rows.length × visibleFields.length` でクランプし、超えたら `#REF!`。

### 完了条件
1,000 行 × 30 列で 1 打鍵あたりの再計算が体感で引っかからないこと。
`npm run test:excel-pivot-ng` が通ること。

---

## T6. ガントの WBS 列の表示選択

左ペインの幅は変えられるようになりました（列見出し右端のハンドル）。
まだ**どの列を出すか**は選べません。

`plugins/KintoneCalendar/src/calendar-workbench-core.js` の
`buildGanttTableHeadCells()` / `buildGanttTableCells()` が
担当 / 開始 / 終了 / 日数 / 進捗 の 5 列を固定で出しています。

`state.ganttTableColumns: string[]` を追加して ⚙表示設定 から選べるようにし、
`--ktc-gantt-table-cols` を選択列に応じて組み立ててください。
既存設定（列の指定なし）は 5 列すべて表示として扱うこと。

---

## 参考: 直近で入れた変更

- 診断レポートと 3 ラウンドの修正内容は、依頼元にレポート（HTML）があります
- KintoneCalendar は **version 100** として本番導入済み（アプリ60・実データ487件で確認）
- 「無音で失敗しない」方針で AttachmentNameGuard / CommentReplyLabel の設定画面を刷新済み
- SimpleTaskBoard / KintoneDataFlow / ManualPlugin のデータ破損経路は修正済み
  （ManualPlugin の添付まわりだけ**実機での再確認が未完了**）
