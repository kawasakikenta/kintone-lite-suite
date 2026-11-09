'use strict';

/**
 * ER図の通し検証（er-explore.cjs）で使う、業務システムに近い 40 アプリの合成 kintone データ。
 * 公式 API の応答形式（/app.json・/app/form/fields.json・/app/actions.json・/apps.json）で返す。
 *
 * 含むもの:
 *   - ルックアップ（コピーするフィールドの対応つき）・関連レコード一覧（表示フィールド・絞り込み条件つき）・アプリアクション
 *   - サブテーブル内のルックアップ、同じアプリへの複数のルックアップ、自分自身への参照
 *   - 循環参照（案件 ⇄ 見積 ⇄ 受注、循環 A → B → C → A）
 *   - 孤立アプリ、取得失敗のアプリ（権限なし）、存在しない参照先（削除済み）
 *   - 長いアプリ名・フィールド名、日本語のフィールドコード
 *   - 1 アプリから多数の関連（全社マスタ連携ハブ 14 件、案件管理 13 件）
 */

const APPS = {};

const text = (code, label, extra = {}) => ({ type: 'SINGLE_LINE_TEXT', code, label, ...extra });
const num = (code, label, extra = {}) => ({ type: 'NUMBER', code, label, ...extra });
const date = (code, label, extra = {}) => ({ type: 'DATE', code, label, ...extra });
const memo = (code, label, extra = {}) => ({ type: 'MULTI_LINE_TEXT', code, label, ...extra });
const drop = (code, label, options, extra = {}) => ({
  type: 'DROP_DOWN', code, label, options: Object.fromEntries(options.map((name, i) => [name, { label: name, index: String(i) }])), ...extra
});
const calc = (code, label, expression) => ({ type: 'CALC', code, label, expression });
const recordNumber = () => ({ type: 'RECORD_NUMBER', code: 'レコード番号', label: 'レコード番号' });

/** ルックアップ。mappings は [コピー先フィールド, 取得元フィールド] の組。 */
const lookup = (code, label, toApp, keyField, mappings = [], extra = {}) => ({
  type: 'SINGLE_LINE_TEXT',
  code,
  label,
  lookup: {
    relatedApp: { app: String(toApp), code: '' },
    relatedKeyField: keyField,
    fieldMappings: mappings.map(([field, relatedField]) => ({ field, relatedField })),
    lookupPickerFields: [keyField],
    filterCond: extra.filterCond || '',
    sort: extra.sort || `${keyField} asc`
  },
  ...(extra.required ? { required: true } : {})
});

/** 関連レコード一覧。field は自アプリの結合元、relatedField は参照先の結合先。 */
const reference = (code, label, toApp, field, relatedField, extra = {}) => ({
  type: 'REFERENCE_TABLE',
  code,
  label,
  referenceTable: {
    relatedApp: { app: String(toApp), code: '' },
    condition: { field, relatedField },
    filterCond: extra.filterCond || '',
    displayFields: extra.displayFields || [],
    sort: extra.sort || '',
    size: String(extra.size || 5)
  }
});

const table = (code, label, fields) => ({
  type: 'SUBTABLE',
  code,
  label,
  fields: Object.fromEntries(fields.map((field) => [field.code, field]))
});

const action = (name, toApp, mappings = [], extra = {}) => ({
  name,
  id: String(extra.id || 1),
  index: String(extra.index || 0),
  destApp: { app: String(toApp), code: '' },
  mappings: mappings.map(([srcField, destField]) => ({ srcType: 'FIELD', srcField, destType: 'FIELD', destField })),
  entities: [{ type: 'CREATOR', code: null }],
  filterCond: extra.filterCond || ''
});

function define(id, name, fields, actions = [], extra = {}) {
  APPS[id] = {
    id: String(id),
    name,
    spaceId: extra.spaceId || null,
    fields: Object.fromEntries([recordNumber(), ...fields].map((field) => [field.code, field])),
    actions: Object.fromEntries(actions.map((item, i) => [`action${i + 1}`, { ...item, index: String(i) }])),
    failFields: extra.failFields || '',
    description: extra.description || ''
  };
}

// ---- マスタ -----------------------------------------------------------------
define(101, '顧客マスタ', [
  text('顧客コード', '顧客コード', { required: true, unique: true }),
  text('顧客名', '顧客名', { required: true }),
  lookup('担当営業', '担当営業', 111, '社員コード', [['担当営業名', '社員名']]),
  text('担当営業名', '担当営業名'),
  lookup('親会社', '親会社', 101, '顧客コード', [['親会社名', '顧客名']]),
  text('親会社名', '親会社名'),
  lookup('業種', '業種', 103, '業種コード', [['業種名', '業種名']]),
  text('業種名', '業種名'),
  reference('取引履歴', '取引履歴（受注）', 116, '顧客コード', '顧客コード', { displayFields: ['受注番号', '受注日', '受注金額'], filterCond: 'ステータス not in ("キャンセル")', sort: '受注日 desc', size: 10 })
]);
define(102, '顧客担当者マスタ', [
  text('担当者コード', '担当者コード', { required: true, unique: true }),
  text('担当者名', '担当者名', { required: true }),
  lookup('顧客', '顧客', 101, '顧客コード', [['顧客名', '顧客名']], { required: true }),
  text('顧客名', '顧客名'),
  text('メール', 'メールアドレス')
]);
define(103, '業種マスタ', [text('業種コード', '業種コード', { required: true, unique: true }), text('業種名', '業種名')]);
define(104, '商品マスタ', [
  text('商品コード', '商品コード', { required: true, unique: true }),
  text('商品名', '商品名', { required: true }),
  num('単価', '標準単価'),
  lookup('カテゴリ', 'カテゴリ', 105, 'カテゴリコード', [['カテゴリ名', 'カテゴリ名']]),
  text('カテゴリ名', 'カテゴリ名'),
  lookup('仕入先', '主な仕入先', 106, '仕入先コード', [['仕入先名', '仕入先名']]),
  text('仕入先名', '仕入先名')
]);
define(105, '商品カテゴリマスタ', [text('カテゴリコード', 'カテゴリコード', { required: true, unique: true }), text('カテゴリ名', 'カテゴリ名')]);
define(106, '仕入先マスタ', [text('仕入先コード', '仕入先コード', { required: true, unique: true }), text('仕入先名', '仕入先名', { required: true }), text('支払条件', '支払条件')]);
define(107, '倉庫マスタ', [
  text('倉庫コード', '倉庫コード', { required: true, unique: true }),
  text('倉庫名', '倉庫名'),
  lookup('拠点', '所在拠点', 108, '拠点コード', [['拠点名', '拠点名']]),
  text('拠点名', '拠点名')
]);
define(108, '拠点マスタ', [text('拠点コード', '拠点コード', { required: true, unique: true }), text('拠点名', '拠点名')]);
define(109, '部署マスタ', [text('部署コード', '部署コード', { required: true, unique: true }), text('部署名', '部署名')]);
define(110, '勘定科目マスタ', [text('科目コード', '科目コード', { required: true, unique: true }), text('科目名', '科目名')]);
define(111, '社員マスタ', [
  text('社員コード', '社員コード', { required: true, unique: true }),
  text('社員名', '社員名', { required: true }),
  lookup('所属部署', '所属部署', 109, '部署コード', [['部署名', '部署名']]),
  text('部署名', '部署名'),
  lookup('上長', '上長', 111, '社員コード', [['上長名', '社員名']]),
  text('上長名', '上長名')
]);
define(112, '税率マスタ', [text('税区分', '税区分', { required: true, unique: true }), num('税率', '税率')]);

// ---- 営業の流れ（案件 ⇄ 見積 ⇄ 受注 ⇄ 請求 ⇄ 入金）---------------------------------
define(113, '案件管理', [
  text('案件番号', '案件番号', { required: true, unique: true }),
  text('案件名', '案件名', { required: true }),
  lookup('顧客', '顧客', 101, '顧客コード', [['顧客名', '顧客名'], ['顧客業種', '業種名']], { required: true }),
  text('顧客名', '顧客名'),
  text('顧客業種', '顧客業種'),
  lookup('担当', '営業担当', 111, '社員コード', [['担当名', '社員名'], ['担当部署', '部署名']]),
  text('担当名', '担当名'),
  text('担当部署', '担当部署'),
  lookup('商材', '主な商材', 104, '商品コード', [['商材名', '商品名']]),
  text('商材名', '商材名'),
  lookup('担当者', '先方担当者', 102, '担当者コード', [['担当者名', '担当者名']]),
  text('担当者名', '担当者名'),
  drop('フェーズ', 'フェーズ', ['見込み', '提案', '見積', '受注', '失注']),
  reference('見積一覧', '見積書一覧', 114, '案件番号', '案件番号', { displayFields: ['見積番号', '見積日', '見積金額'], sort: '見積日 desc' }),
  reference('受注一覧', '受注一覧', 116, '案件番号', '案件番号', { displayFields: ['受注番号', '受注日', '受注金額'] }),
  reference('問い合わせ一覧', '問い合わせ一覧', 124, '案件番号', '案件番号', { displayFields: ['問い合わせ番号', '件名'], filterCond: 'ステータス != "完了"' })
], [
  action('見積書を作成', 114, [['案件番号', '案件番号'], ['顧客コード', '顧客']]),
  action('受注を登録', 116, [['案件番号', '案件番号']]),
  action('外部連携ログへ記録', 133, [['案件番号', '案件番号']])
]);
define(114, '見積書', [
  text('見積番号', '見積番号', { required: true, unique: true }),
  lookup('案件', '案件', 113, '案件番号', [['案件名', '案件名']], { required: true }),
  text('案件名', '案件名'),
  lookup('顧客', '顧客', 101, '顧客コード', [['顧客名', '顧客名']]),
  text('顧客名', '顧客名'),
  date('見積日', '見積日'),
  table('見積明細', '見積明細', [
    lookup('商品', '商品', 104, '商品コード', [['商品名', '商品名'], ['単価', '標準単価']]),
    text('商品名', '商品名'),
    num('単価', '単価'),
    num('数量', '数量'),
    lookup('税区分', '税区分', 112, '税区分', [['税率', '税率']]),
    num('税率', '税率'),
    calc('小計', '小計', '単価 * 数量')
  ]),
  calc('見積金額', '見積金額', 'SUM(小計)')
], [action('受注へ変換', 116, [['見積番号', '見積番号'], ['案件', '案件']])]);
define(116, '受注管理', [
  text('受注番号', '受注番号', { required: true, unique: true }),
  lookup('見積', '元の見積', 114, '見積番号', [['見積金額', '見積金額']]),
  num('見積金額', '見積金額'),
  lookup('案件', '案件', 113, '案件番号', [['案件名', '案件名']]),
  text('案件名', '案件名'),
  lookup('顧客', '顧客', 101, '顧客コード', [['顧客名', '顧客名']]),
  text('顧客名', '顧客名'),
  drop('ステータス', 'ステータス', ['受注', '出荷済', 'キャンセル']),
  table('受注明細', '受注明細', [
    lookup('商品', '商品', 104, '商品コード', [['商品名', '商品名']]),
    text('商品名', '商品名'),
    num('数量', '数量')
  ]),
  reference('請求一覧', '請求一覧', 118, '受注番号', '受注番号', { displayFields: ['請求番号', '請求日', '請求金額'] })
], [action('請求書を作成', 118, [['受注番号', '受注番号']]), action('出荷を登録', 117, [['受注番号', '受注番号']])]);
define(117, '出荷管理', [
  text('出荷番号', '出荷番号', { required: true, unique: true }),
  lookup('受注', '受注', 116, '受注番号', [['顧客名', '顧客名']]),
  text('顧客名', '顧客名'),
  lookup('出荷倉庫', '出荷倉庫', 107, '倉庫コード', [['倉庫名', '倉庫名']]),
  text('倉庫名', '倉庫名'),
  table('出荷明細', '出荷明細', [
    lookup('商品', '商品', 104, '商品コード', [['商品名', '商品名']]),
    text('商品名', '商品名'),
    lookup('在庫倉庫', '在庫倉庫', 107, '倉庫コード', [['在庫倉庫名', '倉庫名']]),
    text('在庫倉庫名', '在庫倉庫名'),
    num('数量', '数量')
  ])
]);
define(118, '請求管理', [
  text('請求番号', '請求番号', { required: true, unique: true }),
  lookup('受注', '受注', 116, '受注番号', [['受注金額', '見積金額']]),
  num('受注金額', '受注金額'),
  lookup('顧客', '顧客', 101, '顧客コード', [['顧客名', '顧客名']]),
  text('顧客名', '顧客名'),
  lookup('科目', '売上科目', 110, '科目コード', [['科目名', '科目名']]),
  text('科目名', '科目名'),
  date('請求日', '請求日'),
  num('請求金額', '請求金額'),
  reference('入金一覧', '入金一覧', 119, '請求番号', '請求番号', { displayFields: ['入金番号', '入金日', '入金額'] })
]);
define(119, '入金管理', [
  text('入金番号', '入金番号', { required: true, unique: true }),
  lookup('請求', '請求', 118, '請求番号', [['請求金額', '請求金額']]),
  num('請求金額', '請求金額'),
  lookup('顧客', '顧客', 101, '顧客コード', [['顧客名', '顧客名']]),
  text('顧客名', '顧客名'),
  date('入金日', '入金日'),
  num('入金額', '入金額')
]);

// ---- 仕入・在庫 -------------------------------------------------------------
define(120, '発注管理', [
  text('発注番号', '発注番号', { required: true, unique: true }),
  lookup('仕入先', '仕入先', 106, '仕入先コード', [['仕入先名', '仕入先名']]),
  text('仕入先名', '仕入先名'),
  lookup('担当', '発注担当', 111, '社員コード', [['担当名', '社員名']]),
  text('担当名', '担当名'),
  table('発注明細', '発注明細', [
    lookup('商品', '商品', 104, '商品コード', [['商品名', '商品名']]),
    text('商品名', '商品名'),
    num('数量', '数量')
  ])
], [action('入荷を登録', 121, [['発注番号', '発注番号']])]);
define(121, '入荷管理', [
  text('入荷番号', '入荷番号', { required: true, unique: true }),
  lookup('発注', '発注', 120, '発注番号', [['仕入先名', '仕入先名']]),
  text('仕入先名', '仕入先名'),
  lookup('倉庫', '入荷倉庫', 107, '倉庫コード', [['倉庫名', '倉庫名']]),
  text('倉庫名', '倉庫名')
]);
define(122, '在庫管理', [
  text('在庫キー', '在庫キー', { unique: true }),
  lookup('商品', '商品', 104, '商品コード', [['商品名', '商品名']]),
  text('商品名', '商品名'),
  lookup('倉庫', '倉庫', 107, '倉庫コード', [['倉庫名', '倉庫名']]),
  text('倉庫名', '倉庫名'),
  num('在庫数', '在庫数')
]);
define(123, '在庫移動', [
  text('移動番号', '移動番号', { required: true, unique: true }),
  lookup('出庫倉庫', '出庫倉庫', 107, '倉庫コード', [['出庫倉庫名', '倉庫名']]),
  text('出庫倉庫名', '出庫倉庫名'),
  lookup('入庫倉庫', '入庫倉庫', 107, '倉庫コード', [['入庫倉庫名', '倉庫名']]),
  text('入庫倉庫名', '入庫倉庫名'),
  lookup('商品', '商品', 104, '商品コード', [['商品名', '商品名']]),
  text('商品名', '商品名'),
  num('数量', '数量')
]);

// ---- 顧客対応・社内 ---------------------------------------------------------
define(124, '問い合わせ管理', [
  text('問い合わせ番号', '問い合わせ番号', { required: true, unique: true }),
  text('案件番号', '案件番号'),
  text('件名', '件名'),
  lookup('顧客', '顧客', 101, '顧客コード', [['顧客名', '顧客名']]),
  text('顧客名', '顧客名'),
  lookup('先方担当', '先方担当者', 102, '担当者コード', [['先方担当名', '担当者名']]),
  text('先方担当名', '先方担当名'),
  lookup('担当', '社内担当', 111, '社員コード', [['担当名', '社員名']]),
  text('担当名', '担当名')
], [action('案件を登録', 113, [['案件番号', '案件番号'], ['顧客', '顧客']])]);
define(125, '営業日報', [
  text('日報番号', '日報番号', { required: true, unique: true }),
  lookup('社員', '報告者', 111, '社員コード', [['社員名', '社員名']]),
  text('社員名', '社員名'),
  table('活動', '訪問・活動', [
    lookup('顧客', '顧客', 101, '顧客コード', [['顧客名', '顧客名']]),
    text('顧客名', '顧客名'),
    lookup('案件', '案件', 113, '案件番号', [['案件名', '案件名']]),
    text('案件名', '案件名'),
    memo('内容', '活動内容')
  ])
]);
define(126, '経費申請', [
  text('申請番号', '申請番号', { required: true, unique: true }),
  lookup('申請者', '申請者', 111, '社員コード', [['申請者名', '社員名']]),
  text('申請者名', '申請者名'),
  lookup('部署', '申請部署', 109, '部署コード', [['部署名', '部署名']]),
  text('部署名', '部署名'),
  table('経費明細', '経費明細', [
    lookup('科目', '勘定科目', 110, '科目コード', [['科目名', '科目名']]),
    text('科目名', '科目名'),
    num('金額', '金額')
  ])
]);
define(127, '勤怠管理', [
  text('勤怠キー', '勤怠キー', { unique: true }),
  lookup('社員', '社員', 111, '社員コード', [['社員名', '社員名']]),
  text('社員名', '社員名'),
  date('勤務日', '勤務日')
]);
define(128, '契約管理', [
  text('契約番号', '契約番号', { required: true, unique: true }),
  lookup('顧客', '顧客', 101, '顧客コード', [['顧客名', '顧客名']]),
  text('顧客名', '顧客名'),
  lookup('案件', '案件', 113, '案件番号', [['案件名', '案件名']]),
  text('案件名', '案件名'),
  lookup('商品', '契約商品', 104, '商品コード', [['商品名', '商品名']]),
  text('商品名', '商品名'),
  reference('保守履歴一覧', '保守履歴', 129, '契約番号', '契約番号', { displayFields: ['保守番号', '対応日'], size: 20 })
]);
define(129, '保守履歴', [
  text('保守番号', '保守番号', { required: true, unique: true }),
  lookup('契約', '契約', 128, '契約番号', [['顧客名', '顧客名']]),
  text('顧客名', '顧客名'),
  lookup('担当', '対応者', 111, '社員コード', [['担当名', '社員名']]),
  text('担当名', '担当名'),
  date('対応日', '対応日')
]);
define(130, '資産台帳', [
  text('資産番号', '資産番号', { required: true, unique: true }),
  lookup('管理部署', '管理部署', 109, '部署コード', [['部署名', '部署名']]),
  text('部署名', '部署名'),
  lookup('管理者', '管理者', 111, '社員コード', [['管理者名', '社員名']]),
  text('管理者名', '管理者名'),
  lookup('科目', '資産科目', 110, '科目コード', [['科目名', '科目名']]),
  text('科目名', '科目名')
]);
define(131, '備品貸出', [
  text('貸出番号', '貸出番号', { required: true, unique: true }),
  lookup('資産', '資産', 130, '資産番号', [['部署名', '部署名']]),
  text('部署名', '部署名'),
  lookup('借用者', '借用者', 111, '社員コード', [['借用者名', '社員名']]),
  text('借用者名', '借用者名')
]);

// ---- 孤立・取得失敗・削除済みの参照先・長い名前・ハブ・循環 ------------------------------
define(132, '社内連絡メモ', [text('件名', '件名'), memo('本文', '本文')]);
define(133, '外部連携ログ', [text('案件番号', '案件番号'), memo('ログ', 'ログ')], [], { failFields: 'CB_NO02 このアプリを閲覧する権限がありません。' });
define(134, '旧顧客台帳（移行前）', [
  text('旧顧客コード', '旧顧客コード', { unique: true }),
  lookup('新顧客', '移行先の顧客', 101, '顧客コード', [['新顧客名', '顧客名']]),
  text('新顧客名', '新顧客名'),
  lookup('旧取引先', '旧システムの取引先', 999, '取引先コード', [['旧取引先名', '取引先名']]),
  text('旧取引先名', '旧取引先名'),
  lookup('旧担当', '旧システムの担当者', 998, '担当者コード')
]);
const LONG_APP_NAME = '【2024年度版】全社横断プロジェクト進捗・予実管理・リスク対応記録（旧：プロジェクト管理_最新_確定版_v3）';
const LONG_FIELD_LABEL = '予実差異が閾値を超えた場合の是正措置と責任者への報告期限（営業日換算・祝日を除く）';
define(135, LONG_APP_NAME, [
  text('プロジェクト管理番号_西暦年度_連番_枝番', 'プロジェクト管理番号（西暦年度＋連番＋枝番）', { required: true, unique: true }),
  text('予実差異是正措置', LONG_FIELD_LABEL),
  lookup('主管部署', '主管部署', 109, '部署コード', [['主管部署名', '部署名']]),
  text('主管部署名', '主管部署名'),
  lookup('プロジェクトマネージャー社員コード参照', 'プロジェクトマネージャー（社員マスタから選択）', 111, '社員コード', [['プロジェクトマネージャー社員名', '社員名']]),
  text('プロジェクトマネージャー社員名', 'プロジェクトマネージャー社員名'),
  lookup('関連案件', '関連する案件', 113, '案件番号', [['関連案件名', '案件名']])
]);
define(136, '全社マスタ連携ハブ', [
  text('ハブキー', 'ハブキー', { required: true, unique: true }),
  ...[[101, '顧客', '顧客コード'], [102, '顧客担当者', '担当者コード'], [103, '業種', '業種コード'], [104, '商品', '商品コード'], [105, 'カテゴリ', 'カテゴリコード'],
    [106, '仕入先', '仕入先コード'], [107, '倉庫', '倉庫コード'], [108, '拠点', '拠点コード'], [109, '部署', '部署コード'], [110, '勘定科目', '科目コード'],
    [111, '社員', '社員コード'], [112, '税率', '税区分'], [113, '案件', '案件番号'], [128, '契約', '契約番号']]
    .map(([to, label, key]) => lookup(`連携_${label}`, `連携：${label}`, to, key, [[`連携_${label}名`, key]]))
]);
define(137, '循環テスト A', [text('キー', 'キー', { unique: true }), lookup('次', '次のアプリ', 138, 'キー', [['次の名', 'キー']])]);
define(138, '循環テスト B', [text('キー', 'キー', { unique: true }), lookup('次', '次のアプリ', 139, 'キー', [['次の名', 'キー']])]);
define(139, '循環テスト C', [text('キー', 'キー', { unique: true }), lookup('次', '次のアプリ', 137, 'キー', [['次の名', 'キー']])]);
define(140, '備品棚卸', [text('棚卸番号', '棚卸番号', { unique: true })], [action('資産台帳を確認', 130, [['棚卸番号', '資産番号']])]);

const ALL_APP_IDS = Object.keys(APPS).map(Number).sort((a, b) => a - b);

/** 案件管理から辿れるアプリ（関連の向きを問わず、案件から順方向に辿れるもの）の件数などの期待値は、探索結果から計算する。 */
function buildFixture() {
  return { apps: APPS, allAppIds: ALL_APP_IDS, longAppName: LONG_APP_NAME, longFieldLabel: LONG_FIELD_LABEL };
}

module.exports = { buildFixture, ALL_APP_IDS, LONG_APP_NAME, LONG_FIELD_LABEL };
