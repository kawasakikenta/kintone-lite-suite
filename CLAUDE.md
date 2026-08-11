# CLAUDE.md — このリポジトリで作業するときの前提

kintone プラグイン 10 本 + 単機能ツール群のモノレポ。
このファイルは Claude Code / VS Code の AI に読ませる前提で書いています。

---

## 1. まず守ってほしいこと

### 改行コード
作業ツリーのほとんどのファイルが **CRLF** です。LF で書き戻すとファイル全体が差分になり、
レビューが不可能になります。**編集時は既存の改行コードを維持**してください。

```js
// ファイルを書き換えるスクリプトを書く場合のテンプレート
const raw = fs.readFileSync(p, 'utf8');
const crlf = raw.includes('\r\n');
let s = raw.split('\r\n').join('\n');
// ... s に対して LF 前提で置換 ...
fs.writeFileSync(p, crlf ? s.split('\n').join('\r\n') : s);
```

> できれば `.gitattributes` に `* text=auto eol=lf` を入れて一度正規化したいところですが、
> 未コミット変更が大量にあるため未実施です。着手する場合は必ず単独のコミットにしてください。

### 生成物を直接編集しない

| 生成物 | 生成元 | 生成コマンド |
| --- | --- | --- |
| `plugins/KintoneCalendar/js/desktop.js` / `desktop.css` | `plugins/KintoneCalendar/src/**` | `npm run build:kintone-calendar` |
| `plugins/SimpleTaskBoard/js/desktop.js` | リポジトリ直下 `simple-kanban-person-board-updated.js` | `npm run build:simple-task-board` |
| `plugins/FieldFocusInput/js/*` | `src/**` | `npm run build:field-focus-input` |
| `plugins/FieldTransfer/js/*` | `src/**` | `npm run build:field-transfer` |
| `plugins/KintoneLookupFilter/js/*` | `src/**` | `npm run build:kintone-lookup-filter` |
| `plugins/KintoneExcelPivotViewer-ng/dist` | `src/**` | `npm run build:excel-pivot-ng` |

`KintoneDataFlow` / `ManualPlugin` / `AttachmentNameGuard` / `CommentReplyLabel` は
**`js/` が原本**です（ビルドなし）。

### 検証してから終わる
- ビルド不要なもの: `npm run check:all`
- KintoneCalendar: `npm run check:kintone-calendar && npm run test:kintone-calendar`
- FieldFocusInput / FieldTransfer / KintoneLookupFilter / Excel-ng: それぞれ `npm run test:*`

`git diff --ignore-cr-at-eol --stat` で**意図した範囲だけが変わっている**ことを必ず確認してください。

---

## 2. kintone REST API の制約（過去に何度も踏んでいます）

| 制約 | 内容 |
| --- | --- |
| `limit` 上限 | レコード取得は **500**。設定値をそのまま渡さないこと |
| `offset` 上限 | **10,000**。超える可能性があるなら cursor API か `$id` シーク方式に |
| コメント API `limit` | **10**（レコード取得と違う） |
| 一括更新 | 1 リクエスト **100 レコード**。必ずチャンク分割する |
| 一覧イベント | `event.records` は**表示中ページ分だけ**（最大 100 件）。全件が要るなら REST で取り直す |
| 楽観ロック | 更新は `revision` を送る。`GAIA_CO02` を検出したら上書きせず再読込を促す |
| 添付ファイル | **レコード取得 API の `fileKey` を更新 API に送り返さない**（既存添付が失われる）。既存行は `id` だけ送れば内容は保持される |
| サブテーブル新規行 | `id` キー自体を持たせない（`id: null` は 400 の原因） |

多値型（`CHECK_BOX` / `MULTI_SELECT`）とユーザー選択系（`USER_SELECT` / `ORGANIZATION_SELECT` /
`GROUP_SELECT`）は、書き戻すとき配列・`[{code}]` へ戻す必要があります。
表示用に `"A, B"` の文字列へ潰す実装が各所にあるので注意。

---

## 3. 「無音で失敗しない」方針

このリポジトリで繰り返し直してきた不具合は、ほぼすべて**失敗が黙って握りつぶされる**ことでした。

- 設定のフィールドコードが見つからない → `return` せず、画面に「見つかりません」と出す
- 正規表現が不正 → `console.warn` で終わらせず、設定画面と実行時の両方に出す
- 取得件数が上限で切れた → 「N 件で打ち切りました」と必ず言う
- 非同期の失敗 → `.catch(() => {})` で消さない。理由をユーザーに見せる
- `kintone.plugin.app.setConfig` は**成功時しかコールバックしない**。
  ボタンの二重押下を止め、10 秒応答がなければ「応答がありません」と出す

---

## 4. プラグイン一覧

| プラグイン | 構成 | テスト | 備考 |
| --- | --- | --- | --- |
| KintoneCalendar | Vite + ESM | node --test 30件 | `src/calendar-workbench-core.js` が **約10,000行** |
| KintoneExcelPivotViewer-ng | Angular 17 | *.spec.ts | `root.component.ts` が **3,100行** |
| SimpleTaskBoard | 連結ビルド | なし | 生成元はリポジトリ直下 |
| KintoneDataFlow | ビルドなし | なし | `js/desktop.js` が **5,100行** |
| ManualPlugin | ビルドなし | なし | **外部 CDN 7 本**に依存（要対応・§5参照） |
| KintoneLookupFilter | Svelte + esbuild | 1件 | |
| FieldFocusInput | React + esbuild | 8件 | |
| FieldTransfer | Vue3 + Vite | 4件 | |
| AttachmentNameGuard | 素の JS | 構文チェックのみ | |
| CommentReplyLabel | 素の JS | 構文チェックのみ | |

---

## 5. UI の見た目を変えるときの確認方法（KintoneCalendar）

ブラウザで実物を動かして確認できます。ビルドは不要です。

```bash
# tests/preview-gantt-dev.html を任意の静的サーバで開く
npx --yes serve plugins/KintoneCalendar   # など
# → http://localhost:xxxx/tests/preview-gantt-dev.html
```

`src/desktop.css` と `src/calendar-workbench-core.js` を**直接**読むので、
編集して再読込するだけで反映されます。`?big=200` を付けると自動生成レコードが増え、
大量データ時の見え方（軽量モード）を確認できます。

**見た目を変えたら、必ずスクリーンショットを撮って before/after を比較してください。**
「たぶん良くなった」で終わらせないこと。

### デザインの方針（2026-08 に合意済み）
- **色は「状態」に予約する。** 遅延・今日・担当重複・未保存だけが色を持つ。
  タグ / 大カテゴリ / 取得元アプリのような属性チップは無彩色 + 小さな色ドット
- 情報の重複を作らない。同じ数字を 2 か所に出さない
- 何も起きていないときは、行ごと消す（`:empty` で消える設計にしてある）

---

## 6. 参考ドキュメント

- `docs/next-tasks.md` — 次にやる作業の指示書（優先度つき）
- 各プラグインの `README.md`
