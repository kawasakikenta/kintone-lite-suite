'use strict';

// 差分比較の通し検証（diff-explore.cjs）で使う、業務アプリに近い合成設定。
// 開発用アプリ（比較元 #101）と本番用アプリ（比較先 #202）、それぞれの参照先マスタ（#301・#401）を作る。
// 全 18 セクションに、実務で起きる差と、差ではない違い（環境固有 ID・表記ゆれ・ファイルの再アップロード）を入れてある。
// 入れた差は EXPECTED_DIFFS、差ではないはずのものは EXPECTED_NO_DIFF に、セクション・内容で書き出す。
// このファイルは Node 側の純粋なデータ作りで、ブラウザには JSON で渡す。

const clone = (value) => JSON.parse(JSON.stringify(value));

const f = {
  text: (code, label, extra = {}) => ({ type: 'SINGLE_LINE_TEXT', code, label, noLabel: false, required: false, minLength: '', maxLength: '', expression: '', hideExpression: false, unique: false, defaultValue: '', ...extra }),
  memo: (code, label, extra = {}) => ({ type: 'MULTI_LINE_TEXT', code, label, noLabel: false, required: false, defaultValue: '', ...extra }),
  rich: (code, label, extra = {}) => ({ type: 'RICH_TEXT', code, label, noLabel: false, required: false, defaultValue: '', ...extra }),
  number: (code, label, extra = {}) => ({ type: 'NUMBER', code, label, noLabel: false, required: false, minValue: '', maxValue: '', digit: false, unique: false, defaultValue: '', displayScale: '', unit: '', unitPosition: 'BEFORE', ...extra }),
  calc: (code, label, expression, extra = {}) => ({ type: 'CALC', code, label, noLabel: false, required: false, expression, format: 'NUMBER', displayScale: '', hideExpression: false, digit: false, unit: '', unitPosition: 'BEFORE', ...extra }),
  choice: (type, code, label, names, defaultValue, extra = {}) => ({ type, code, label, noLabel: false, required: false, options: Object.fromEntries(names.map((name, index) => [name, { label: name, index: String(index) }])), defaultValue, ...(type === 'DROP_DOWN' ? {} : { align: 'HORIZONTAL' }), ...extra }),
  date: (code, label, extra = {}) => ({ type: 'DATE', code, label, noLabel: false, required: false, unique: false, defaultValue: '', defaultNowValue: false, ...extra }),
  time: (code, label, extra = {}) => ({ type: 'TIME', code, label, noLabel: false, required: false, defaultValue: '', defaultNowValue: false, ...extra }),
  datetime: (code, label, extra = {}) => ({ type: 'DATETIME', code, label, noLabel: false, required: false, unique: false, defaultValue: '', defaultNowValue: false, ...extra }),
  link: (code, label, protocol, extra = {}) => ({ type: 'LINK', code, label, noLabel: false, required: false, protocol, minLength: '', maxLength: '', unique: false, defaultValue: '', ...extra }),
  file: (code, label, extra = {}) => ({ type: 'FILE', code, label, noLabel: false, required: false, thumbnailSize: '150', ...extra }),
  user: (code, label, extra = {}) => ({ type: 'USER_SELECT', code, label, noLabel: false, required: false, entities: [], defaultValue: [], ...extra }),
  org: (code, label, extra = {}) => ({ type: 'ORGANIZATION_SELECT', code, label, noLabel: false, required: false, entities: [], defaultValue: [], ...extra }),
  groupSel: (code, label, extra = {}) => ({ type: 'GROUP_SELECT', code, label, noLabel: false, required: false, entities: [], defaultValue: [], ...extra }),
  group: (code, label, extra = {}) => ({ type: 'GROUP', code, label, noLabel: false, openGroup: true, ...extra }),
  label: (code, text) => ({ type: 'LABEL', code, label: text }),
  table: (code, fields, extra = {}) => ({ type: 'SUBTABLE', code, noLabel: false, fields: Object.fromEntries(fields.map((field) => [field.code, field])), ...extra }),
  lookup: (code, label, relatedApp, mappings, extra = {}) => ({
    ...f.text(code, label),
    lookup: {
      relatedApp: { app: String(relatedApp), code: '' },
      relatedKeyField: 'code',
      fieldMappings: mappings,
      lookupPickerFields: ['code', 'name'],
      filterCond: '',
      sort: 'code asc'
    },
    ...extra
  }),
  reference: (code, label, relatedApp, extra = {}) => ({
    type: 'REFERENCE_TABLE', code, label, noLabel: false,
    referenceTable: { relatedApp: { app: String(relatedApp), code: '' }, condition: { field: 'customer_code', relatedField: 'code' }, filterCond: '', displayFields: ['code', 'name'], sort: 'code asc', size: '5' },
    ...extra
  }),
  system: () => [
    { type: 'RECORD_NUMBER', code: 'record_no', label: 'レコード番号', noLabel: false },
    { type: 'CREATOR', code: 'creator', label: '作成者', noLabel: false },
    { type: 'CREATED_TIME', code: 'created', label: '作成日時', noLabel: false },
    { type: 'MODIFIER', code: 'modifier', label: '更新者', noLabel: false },
    { type: 'UPDATED_TIME', code: 'updated', label: '更新日時', noLabel: false }
  ]
};

const entity = (type, code) => ({ type, code });
const cell = (field, width = '200') => ({ type: field.type, code: field.code, size: { width } });
const row = (...fields) => ({ type: 'ROW', fields: fields.map((field) => (field.type === 'LABEL' || field.type === 'SPACER' || field.type === 'HR' ? field : cell(field))) });

/** 一括フィールド（f01〜f{count}）。種類を順に振り分け、業務アプリの「その他の項目」に当たる。 */
function bulkFields(count, variant, changesPerField = 0) {
  const out = [];
  for (let i = 1; i <= count; i += 1) {
    const n = String(i).padStart(2, '0');
    const code = `item_${n}`;
    const label = `項目${n}`;
    switch (i % 6) {
      case 0: out.push(f.text(code, label)); break;
      case 1: out.push(f.number(code, label, { unit: i % 4 === 1 ? '円' : '', unitPosition: 'AFTER' })); break;
      case 2: out.push(f.date(code, label)); break;
      case 3: out.push(f.memo(code, label)); break;
      case 4: out.push(f.choice('DROP_DOWN', code, label, ['A', 'B', 'C'], 'A')); break;
      default: out.push(f.user(code, label)); break;
    }
  }
  // 差ではない違い・差のある変更（件数が多いアプリでも埋もれず検出されること）
  const byCode = (code) => out.find((field) => field.code === code);
  if (variant === 'dev') {
    byCode('item_06').label = '項目06（改称）'; // 差: ラベル変更
    byCode('item_12').required = true; // 差: 必須化
    byCode('item_24').maxLength = '100'; // 表記だけの違い: '100'（開発）と 100（本番）。型が違うので差として出るが「表記のみ」の注記が付く
    byCode('item_18').defaultValue = null; // 空の違い: ''（本番）と null（開発）
  } else {
    byCode('item_24').maxLength = 100;
    byCode('item_18').defaultValue = '';
  }
  // 規模の検証用: 全フィールドに同じ数の変更を入れる（開発側だけ変える）
  if (variant === 'dev' && changesPerField > 0) {
    out.forEach((field) => {
      if (changesPerField >= 1) field.label = `${field.label}（改）`;
      if (changesPerField >= 2) field.required = true;
      if (changesPerField >= 3) field.noLabel = true;
    });
  }
  return out;
}

/**
 * 業務アプリ 1 件分の全セクション。variant: 'dev'（比較元 #101）、'prod'（比較先 #202）。
 * masterId は参照先マスタの ID（開発 301 / 本番 401 と、環境で違う）。
 */
function businessApp(variant, { bulk = 40, masterId, changesPerField = 0 } = {}) {
  const dev = variant === 'dev';
  const master = masterId || (dev ? '301' : '401');

  // ---- フィールド ----
  const customerCode = dev ? 'customer_name' : 'cust_name'; // 差: フィールドコードの変更
  const customer = f.text(customerCode, '顧客名', { required: true, maxLength: dev ? '100' : '64' });
  const customerLookup = f.lookup(
    'customer_code', '取引先コード', master,
    dev
      ? [{ field: 'cust_tel', relatedField: 'tel' }, { field: 'cust_addr', relatedField: 'address' }, { field: 'cust_mail', relatedField: 'email' }] // 差: コピー項目が 1 つ増える
      : [{ field: 'cust_tel', relatedField: 'tel' }, { field: 'cust_addr', relatedField: 'address' }]
  );
  const custTel = f.text('cust_tel', '電話番号');
  const custAddr = f.text('cust_addr', '住所');
  const custMail = f.link('cust_mail', 'メール', 'MAIL');
  const status = f.choice('DROP_DOWN', 'status_sel', '案件状況',
    dev ? ['新規', '対応中', '保留', '完了'] : ['未対応', '対応中', '完了'], // 差: 改名（未対応→新規）・追加（保留）
    dev ? '新規' : '未対応', { required: true });
  const priority = f.choice('RADIO_BUTTON', 'priority', '優先度', dev ? ['低', '中', '高'] : ['高', '中', '低'], '中'); // 差: 並べ替え
  const tags = f.choice('CHECK_BOX', 'tags', 'タグ', ['新規顧客', '既存顧客', '要注意'], dev ? ['新規顧客', '要注意'] : ['新規顧客']);
  const regions = f.choice('MULTI_SELECT', 'regions', '対象地域', ['北海道', '東北', '関東', '中部', '関西', '九州'], []);
  const due = f.date('due', '納期', { required: dev });
  const startTime = f.time('start_time', '開始時刻');
  const scheduled = f.datetime('scheduled', '訪問予定');
  const amount = f.number('amount', '金額', { unit: dev ? '千円' : '円', unitPosition: 'AFTER', displayScale: dev ? '2' : '0', digit: true });
  const taxRate = f.number('tax_rate', '税率', { defaultValue: dev ? '10' : '8' });
  const shipping = f.number('shipping', '送料');
  const total = f.calc('total', '合計', dev ? 'amount * (1 + tax_rate / 100) + shipping' : 'amount * (1 + tax_rate / 100)');
  const owner = f.user('owner', '担当者', { entities: [entity('USER', 'admin')] });
  const dept = f.org('dept', '担当部署');
  const grp = f.groupSel('review_group', '確認グループ');
  const memo = f.memo('memo', '備考', { defaultValue: dev ? '' : '特記事項なし' });
  const notes = f.rich('notes', '詳細メモ');
  const attach = f.file('attach', '添付ファイル');
  const website = f.link('website', '会社サイト', 'WEB');
  const phone = f.link('phone', '連絡先電話', 'CALL');
  const itemRows = [
    f.text('item_name', '品名'),
    f.number('qty', '数量', { required: dev }),
    f.number('unit_price', '単価'),
    ...(dev ? [f.number('discount', '値引き')] : []),
    f.calc('subtotal', '小計', 'qty * unit_price'),
    f.choice('DROP_DOWN', 'item_kind', '種別', dev ? ['物品', '役務', '値引き'] : ['物品', '役務'], '物品')
  ];
  const items = f.table('items', itemRows);
  const visits = f.table('visits', [f.date('visit_date', '訪問日'), f.user('visit_by', '訪問者'), f.memo('visit_note', '内容')]);
  const rel = f.reference('rel_orders', '取引先の関連案件', master, dev ? { referenceTable: { relatedApp: { app: master, code: '' }, condition: { field: 'customer_code', relatedField: 'code' }, filterCond: 'status = "有効"', displayFields: ['code', 'name', 'rank'], sort: 'code asc', size: '10' } } : {});
  const legacy = f.text('legacy_flag', '旧区分'); // 差: 本番だけにある
  const basic = f.group('basic', '基本情報');
  const detailGroup = f.group('detail', '詳細情報', { openGroup: dev });
  const bulkList = bulkFields(bulk, variant, changesPerField);

  const fields = [
    ...f.system(), basic, customer, customerLookup, custTel, custAddr, custMail,
    status, priority, tags, regions, due, startTime, scheduled, amount, taxRate, ...(dev ? [shipping] : []), total,
    owner, dept, grp, memo, notes, attach, website, phone, detailGroup, items, visits, rel,
    ...(dev ? [] : [legacy]), ...bulkList,
    { type: 'STATUS', code: 'ステータス', label: 'ステータス', enabled: true },
    { type: 'STATUS_ASSIGNEE', code: '作業者', label: '作業者', enabled: true },
    { type: 'CATEGORY', code: 'カテゴリー', label: 'カテゴリー', enabled: dev }
  ];
  const properties = Object.fromEntries(fields.map((field) => [field.code, clone(field)]));

  // ---- レイアウト ----
  const layoutRows = [
    { type: 'GROUP', code: 'basic', layout: [row(customer, customerLookup), row(custTel, custAddr, custMail)] },
    { type: 'ROW', fields: [{ type: 'LABEL', label: dev ? '<b>案件情報</b>' : '案件情報', size: { width: '400' }, elementId: 'lbl_case' }] },
    row(status, priority),
    row(tags, regions),
    row(due, startTime, scheduled),
    dev ? row(amount, taxRate, shipping, total) : row(amount, taxRate, total), // 差: 送料の追加
    row(owner, dept, grp),
    { type: 'ROW', fields: [{ type: 'HR', size: { width: '800' }, elementId: 'hr_1' }] },
    { type: 'ROW', fields: [{ type: 'SPACER', size: { width: '100', height: '20' }, elementId: 'sp_1' }] },
    dev ? row(notes) : row(memo), // 差: 並び・配置の変更
    dev ? row(memo) : row(notes),
    row(attach, website, phone),
    { type: 'GROUP', code: 'detail', layout: [row(...bulkList.slice(0, 12).map((x) => x))] },
    { type: 'SUBTABLE', code: 'items', fields: itemRows.map((x) => cell(x, '120')) },
    { type: 'SUBTABLE', code: 'visits', fields: Object.values(visits.fields).map((x) => cell(x, '160')) },
    row(rel),
    ...(dev ? [] : [row(legacy)]),
    ...chunk(bulkList.slice(12), 3).map((fieldsInRow) => row(...fieldsInRow))
  ];

  // ---- 一覧（10） ----
  const baseList = ['record_no', customerCode, 'amount', 'status_sel', 'due', 'owner'];
  const viewList = (name, index, fieldsOfView, filterCond, sort, extra = {}) => ({ type: 'LIST', name, id: String(dev ? 5000 + index : 8000 + index), index: String(index), fields: fieldsOfView, filterCond, sort, device: 'ANY', ...extra });
  const views = {
    '全件': viewList('全件', 0, dev ? [...baseList, 'priority'] : baseList, dev ? 'amount > 0' : '', dev ? 'amount desc' : 'record_no desc'), // 差: 条件・並び・列の追加
    '未完了': viewList('未完了', 1, ['record_no', customerCode, 'status_sel', 'due'], dev ? 'status_sel not in ("完了", "保留")' : 'status_sel not in ("完了")', 'due asc'),
    '自分の担当': viewList('自分の担当', 2, ['record_no', customerCode, 'due'], 'owner in (LOGIN_USER())', 'due asc'),
    '今月納期': viewList('今月納期', 3, ['record_no', customerCode, 'due'], 'due = THIS_MONTH()', 'due asc'),
    '要注意': viewList('要注意', 4, ['record_no', customerCode, 'tags'], 'tags in ("要注意")', 'updated desc'),
    '高額案件': viewList('高額案件', 5, ['record_no', customerCode, 'amount'], 'amount >= 1000000', 'amount desc'),
    ...(dev ? { '担当別': viewList('担当別', 6, ['record_no', 'owner', 'amount'], 'owner in (LOGIN_USER())', 'amount desc') } : {}), // 差: 開発だけ
    '月次カレンダー': { type: 'CALENDAR', name: '月次カレンダー', id: String(dev ? 5100 : 8100), index: dev ? '7' : '6', date: 'due', title: dev ? 'customer_name' : 'cust_name', filterCond: '', sort: '', device: 'ANY' }, // 差: タイトルのコード
    '訪問カレンダー': { type: 'CALENDAR', name: '訪問カレンダー', id: String(dev ? 5101 : 8101), index: dev ? '8' : '7', date: 'scheduled', title: 'owner', filterCond: '', sort: '', device: 'DESKTOP' },
    'ダッシュボード': { type: 'CUSTOM', name: 'ダッシュボード', id: String(dev ? 5102 : 8102), index: dev ? '9' : '8', html: dev ? '<div id="dash2"></div>' : '<div id="dash"></div>', pager: true, device: 'DESKTOP', filterCond: '', sort: '' }, // 差: HTML
    '一覧(旧)': { type: 'CUSTOM', name: '一覧(旧)', id: String(dev ? 5103 : 8103), index: dev ? '10' : '9', html: '<div>old</div>', pager: false, device: 'ANY', filterCond: '', sort: '' }
  };
  if (!dev) {
    // 差: 並び順の入れ替え（一覧の順番だけの違い）
    views['今月納期'].index = '4';
    views['要注意'].index = '3';
  } else {
    views['今月納期'].index = '3';
    views['要注意'].index = '4';
  }

  // ---- グラフ ----
  const reports = {
    '状況別件数': { chartType: 'PIE', chartMode: 'NORMAL', name: '状況別件数', id: String(dev ? 6000 : 9000), index: '0', groups: [{ code: 'status_sel' }], aggregations: [{ type: 'COUNT' }], filterCond: '', sort: 'TOTAL_DESC', periodicReport: null },
    '月別売上': { chartType: dev ? 'COLUMN' : 'BAR', chartMode: 'NORMAL', name: '月別売上', id: String(dev ? 6001 : 9001), index: '1', groups: [{ code: 'due', per: 'MONTH' }], aggregations: [{ type: dev ? 'AVERAGE' : 'SUM', code: 'amount' }], filterCond: '', sort: 'GROUP1_ASC', periodicReport: null },
    '担当別売上': { chartType: 'BAR', chartMode: 'NORMAL', name: '担当別売上', id: String(dev ? 6002 : 9002), index: '2', groups: [{ code: 'owner' }], aggregations: [{ type: 'SUM', code: 'amount' }], filterCond: 'status_sel != "完了"', sort: 'TOTAL_DESC', periodicReport: null },
    ...(dev ? { '地域別': { chartType: 'PIE', chartMode: 'NORMAL', name: '地域別', id: '6003', index: '3', groups: [{ code: 'regions' }], aggregations: [{ type: 'COUNT' }], filterCond: '', sort: 'TOTAL_DESC', periodicReport: null } } : {})
  };

  // ---- プロセス管理 ----
  const states = {
    '未対応': { name: '未対応', index: '0', assignee: { type: 'ONE', entities: [] } },
    [dev ? '処理中' : '対応中']: { name: dev ? '処理中' : '対応中', index: '1', assignee: { type: 'ONE', entities: [{ entity: entity('FIELD_ENTITY', 'owner'), includeSubs: false }] } }, // 差: 改名（対応中→処理中）
    ...(dev ? { '保留': { name: '保留', index: '2', assignee: { type: 'ALL', entities: [{ entity: entity('GROUP', 'managers'), includeSubs: false }] } } } : {}),
    '完了': { name: '完了', index: dev ? '3' : '2', assignee: { type: 'ONE', entities: dev ? [{ entity: entity('USER', 'admin'), includeSubs: false }] : [] } } // 差: 作業者の変更
  };
  const mid = dev ? '処理中' : '対応中';
  const processSettings = {
    enable: true, states,
    actions: [
      { name: '着手', from: '未対応', to: mid, filterCond: '', type: 'PRIMARY' },
      ...(dev ? [{ name: '保留にする', from: mid, to: '保留', filterCond: '', type: 'SECONDARY' }, { name: '再開', from: '保留', to: mid, filterCond: '', type: 'PRIMARY' }] : []),
      { name: '完了にする', from: mid, to: '完了', filterCond: dev ? 'amount > 0' : '', type: 'PRIMARY' }
    ]
  };

  // ---- プラグイン ----
  const pluginSettings = {
    plugins: [
      { id: 'plugin-calendar', name: 'カレンダープラグイン', enabled: true },
      { id: 'plugin-chart', name: 'チャートプラグイン', enabled: true },
      ...(dev ? [{ id: 'plugin-extra', name: '追加プラグイン', enabled: true }] : [])
    ]
  };

  // ---- JS/CSS ----
  const fileEntry = (fileKey, name, size, type = 'text/javascript') => ({ type: 'FILE', file: { fileKey, name, contentType: type, size: String(size) } });
  const customizeSettings = {
    scope: 'ALL',
    desktop: {
      js: [
        { type: 'URL', url: 'https://cdn.example.com/lib.js' },
        { type: 'URL', url: dev ? 'https://cdn.example.com/chart-4.4.js' : 'https://cdn.example.com/chart-3.9.js' }, // 差: URL のバージョン
        fileEntry(dev ? 'dev-main-js' : 'prod-main-js', 'main.js', JS_FILES.main.length), // 内容が同じ再アップロード（差ではない）
        fileEntry(dev ? 'dev-util-js' : 'prod-util-js', 'util.js', dev ? JS_FILES.utilDev.length : JS_FILES.utilProd.length), // 差: 内容違い
        ...(dev ? [fileEntry('dev-extra-js', 'extra.js', JS_FILES.extra.length)] : []) // 差: 開発だけ
      ],
      css: [fileEntry(dev ? 'dev-style-css' : 'prod-style-css', 'style.css', JS_FILES.style.length, 'text/css')]
    },
    mobile: { js: [fileEntry(dev ? 'dev-mobile-js' : 'prod-mobile-js', 'mobile.js', JS_FILES.mobile.length)], css: [] }
  };

  // ---- アクション ----
  const actionSettings = {
    actions: {
      '受注コピー': { name: '受注コピー', id: dev ? '7000' : '7500', index: '0', destApp: { app: master, code: '' }, mappings: [{ srcType: 'FIELD', srcField: customerCode, destField: 'name' }, ...(dev ? [{ srcType: 'FIELD', srcField: 'amount', destField: 'budget' }] : [])], entities: [entity('USER', 'admin'), entity('GROUP', 'everyone')], filterCond: '' },
      '請求書作成': { name: '請求書作成', id: dev ? '7001' : '7501', index: '1', destApp: { app: dev ? '302' : '402', code: '' }, mappings: [{ srcType: 'FIELD', srcField: 'total', destField: 'invoice_total' }], entities: [entity('GROUP', 'accounting')], filterCond: 'status_sel in ("完了")' },
      '見積複製': { name: '見積複製', id: dev ? '7002' : '7502', index: '2', destApp: { app: dev ? '101' : '202', code: '' }, mappings: [], entities: [entity('USER', 'admin')], filterCond: '' } // 自アプリへのコピー（環境固有 ID）
    }
  };

  // ---- 権限 ----
  const appRight = (e, over = {}) => ({ entity: e, includeSubs: false, appEditable: false, recordViewable: true, recordAddable: true, recordEditable: true, recordDeletable: false, recordImportable: false, recordExportable: true, ...over });
  const appRights = dev
    ? [appRight(entity('USER', 'admin'), { appEditable: true, recordDeletable: true, recordImportable: true }), appRight(entity('GROUP', 'everyone'), { recordEditable: false }), appRight(entity('ORGANIZATION', 'sales'), { includeSubs: true }), appRight(entity('GROUP', 'accounting'), { recordViewable: true, recordAddable: false, recordEditable: false })]
    : [appRight(entity('GROUP', 'everyone')), appRight(entity('USER', 'admin'), { appEditable: true, recordDeletable: true, recordImportable: true }), appRight(entity('ORGANIZATION', 'sales'), { includeSubs: true })]; // 差: 順序の入れ替え・追加・権限の変更
  const fieldAcl = {
    rights: [
      { code: 'amount', entities: [{ accessibility: dev ? 'READ' : 'WRITE', entity: entity('GROUP', 'everyone'), includeSubs: false }, { accessibility: 'WRITE', entity: entity('USER', 'admin'), includeSubs: false }] },
      ...(dev ? [{ code: 'shipping', entities: [{ accessibility: 'READ', entity: entity('GROUP', 'everyone'), includeSubs: false }] }] : [])
    ]
  };
  const recordPermissions = {
    rights: [
      { filterCond: dev ? 'owner in (LOGIN_USER()) or status_sel in ("保留")' : 'owner in (LOGIN_USER())', entities: [{ entity: entity('GROUP', 'everyone'), viewable: true, editable: true, deletable: false, includeSubs: false }] },
      { filterCond: '', entities: [{ entity: entity('USER', 'admin'), viewable: true, editable: true, deletable: true, includeSubs: false }] }
    ]
  };

  // ---- 通知 ----
  const notifyEntity = (e, over = {}) => ({ entity: e, includeSubs: false, recordAdded: true, recordEdited: false, commentAdded: true, statusChanged: true, fileImported: false, appEdited: false, ...over });
  const notifications = {
    notifications: [
      notifyEntity(entity('USER', 'admin')),
      dev ? notifyEntity(entity('GROUP', 'managers'), { recordEdited: true }) : notifyEntity(entity('GROUP', 'everyone')) // 差: 宛先の変更
    ],
    notifyToCommenter: dev
  };
  const perRecordNotifications = {
    notifications: [
      { filterCond: 'amount > 1000000', title: '高額案件です', targets: [{ entity: entity('USER', 'admin'), includeSubs: false }, ...(dev ? [{ entity: entity('GROUP', 'managers'), includeSubs: false }] : [])] },
      { filterCond: 'status_sel in ("保留")', title: '保留になりました', targets: [{ entity: entity('FIELD_ENTITY', 'owner'), includeSubs: false }] }
    ]
  };
  const reminderNotifications = {
    timezone: 'Asia/Tokyo',
    notifications: [
      { filterCond: 'status_sel != "完了"', title: '納期が近づいています', timing: { code: 'due', daysLater: dev ? '-3' : '-1', hoursLater: '0', time: '09:00' }, targets: [{ entity: entity('FIELD_ENTITY', 'owner'), includeSubs: false }] }
    ]
  };

  // ---- カテゴリー ----
  const categories = {
    enabled: dev,
    categories: dev ? { '東日本': { label: '東日本', index: '0', parent: null }, '西日本': { label: '西日本', index: '1', parent: null } } : {}
  };

  // ---- アプリ設定・アプリ情報 ----
  const appSettings = {
    name: dev ? '営業案件管理（開発）' : '営業案件管理',
    description: dev ? '開発版' : '本番運用中',
    icon: { type: 'PRESET', key: dev ? 'APP12' : 'APP01' },
    theme: dev ? 'BLUE' : 'WHITE',
    titleField: { selectionMode: 'AUTO' },
    enableThumbnails: true,
    enableBulkDeletion: !dev,
    enableComments: true,
    enableDuplicateRecord: true,
    enableInlineRecordEditing: true,
    numberPrecision: { digits: dev ? 16 : '16', decimalPlaces: '4', roundingMode: 'HALF_EVEN' }, // 表記だけの違い: 16 と '16'
    firstMonthOfFiscalYear: dev ? '4' : '1'
  };
  const appInfo = {
    appId: dev ? '101' : '202',
    code: dev ? 'sales_dev' : 'sales',
    name: appSettings.name,
    description: appSettings.description,
    spaceId: dev ? '11' : '21',
    threadId: dev ? '11' : '21',
    createdAt: dev ? '2026-03-01T01:00:00Z' : '2025-04-01T01:00:00Z',
    creator: { code: 'admin', name: '管理者' },
    modifiedAt: dev ? '2026-11-08T05:00:00Z' : '2026-10-01T05:00:00Z',
    modifier: { code: 'admin', name: '管理者' }
  };

  return {
    '/app.json': appInfo,
    '/app/settings.json': appSettings,
    '/app/form/fields.json': { properties },
    '/app/form/layout.json': { layout: layoutRows },
    '/form.json': { properties: Object.values(properties) },
    '/app/views.json': { views },
    '/app/reports.json': { reports },
    '/app/status.json': processSettings,
    '/app/plugins.json': pluginSettings,
    '/app/customize.json': customizeSettings,
    '/app/actions.json': actionSettings,
    '/app/acl.json': { rights: appRights },
    '/field/acl.json': fieldAcl,
    '/record/acl.json': recordPermissions,
    '/app/notifications/general.json': notifications,
    '/app/notifications/perRecord.json': perRecordNotifications,
    '/app/notifications/reminder.json': reminderNotifications,
    '/app/categories.json': categories
  };
}

function chunk(list, size) {
  const out = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

const JS_FILES = {
  main: '(function () {\n  "use strict";\n  kintone.events.on("app.record.index.show", function () { console.log("main"); });\n})();\n',
  utilDev: '(function () {\n  window.util = { version: 2, fmt: function (x) { return String(x).padStart(3, "0"); } };\n})();\n',
  utilProd: '(function () {\n  window.util = { version: 1, fmt: function (x) { return String(x); } };\n})();\n',
  extra: '(function () { console.log("extra only in dev"); })();\n',
  style: '.kus-sample { color: #333; }\n',
  mobile: '(function () { console.log("mobile"); })();\n'
};

const FILES_BY_KEY = {
  'dev-main-js': JS_FILES.main, 'prod-main-js': JS_FILES.main,
  'dev-util-js': JS_FILES.utilDev, 'prod-util-js': JS_FILES.utilProd,
  'dev-extra-js': JS_FILES.extra,
  'dev-style-css': JS_FILES.style, 'prod-style-css': JS_FILES.style,
  'dev-mobile-js': JS_FILES.mobile, 'prod-mobile-js': JS_FILES.mobile
};

function masterApp(id, name, variant) {
  const props = Object.fromEntries([...f.system(), f.text('code', '取引先コード'), f.text('name', '取引先名'), f.text('tel', '電話'), f.text('address', '住所'), f.text('email', 'メール'), f.text('rank', 'ランク')].map((x) => [x.code, x]));
  return {
    '/app.json': { appId: id, code: `master${id}`, name, description: '', spaceId: null, threadId: null },
    '/app/settings.json': { name, description: '', icon: { type: 'PRESET', key: 'APP05' }, theme: 'WHITE', titleField: { selectionMode: 'AUTO' }, numberPrecision: { digits: '16', decimalPlaces: '4', roundingMode: 'HALF_EVEN' }, firstMonthOfFiscalYear: '1' },
    '/app/form/fields.json': { properties: props },
    '/app/form/layout.json': { layout: [] }
  };
}

/** プラグイン設定（GET /app/plugin/config.json の応答の config）。環境固有 ID（参照先アプリ）を含む。 */
function pluginConfigs() {
  return {
    dev: {
      'plugin-calendar': { color: '#3498db', startHour: '8', sourceApp: '301' }, // 差: 色
      'plugin-chart': { type: 'bar', source: '301' },
      'plugin-extra': { enabled: 'true' }
    },
    prod: {
      'plugin-calendar': { color: '#e74c3c', startHour: '8', sourceApp: '401' },
      'plugin-chart': { type: 'bar', source: '401' } // 環境固有 ID だけの違い（参照先 301/401）
    }
  };
}

/**
 * 入れた差。section は比較項目のキー、needles は、そのセクションの出力（Markdown）に現れるはずの語（すべて含む行が 1 つ以上）。
 * 差の取りこぼしを調べるときに使う。
 */
const EXPECTED_DIFFS = [
  { id: 'field-code', section: 'fieldSettings', needles: ['customer_name'], note: 'フィールドコードの変更（cust_name → customer_name）' },
  { id: 'field-code-old', section: 'fieldSettings', needles: ['cust_name'], note: '旧コードの行' },
  { id: 'field-options-added', section: 'fieldSettings', needles: ['保留'], note: '選択肢の追加' },
  { id: 'field-options-renamed', section: 'fieldSettings', needles: ['新規'], note: '選択肢の改名（未対応 → 新規）' },
  { id: 'field-options-order', section: 'fieldSettings', needles: ['priority'], note: '選択肢の並べ替え' },
  { id: 'lookup-mapping', section: 'fieldSettings', needles: ['cust_mail'], note: 'ルックアップのコピー項目の追加' },
  { id: 'lookup-app', section: 'fieldSettings', needles: ['401'], note: '参照先アプリ ID（環境差）' },
  { id: 'table-field-added', section: 'fieldSettings', needles: ['discount'], note: 'サブテーブルの項目追加' },
  { id: 'field-shipping', section: 'fieldSettings', needles: ['shipping'], note: '開発だけのフィールド' },
  { id: 'field-legacy', section: 'fieldSettings', needles: ['legacy_flag'], note: '本番だけのフィールド' },
  { id: 'calc-expression', section: 'fieldSettings', needles: ['shipping'], note: '計算式の変更' },
  { id: 'bulk-label', section: 'fieldSettings', needles: ['item_06'], note: '一括フィールドのラベル変更' },
  { id: 'bulk-required', section: 'fieldSettings', needles: ['item_12'], note: '必須化' },
  { id: 'layout-shipping', section: 'layoutSettings', needles: ['shipping'], note: 'レイアウトへの送料の追加' },
  { id: 'layout-label', section: 'layoutSettings', needles: ['案件情報'], note: 'ラベル要素の文言' },
  { id: 'view-filter', section: 'viewSettings', needles: ['全件'], note: '一覧の条件・並び・列' },
  { id: 'view-added', section: 'viewSettings', needles: ['担当別'], note: '開発だけの一覧' },
  { id: 'view-calendar-title', section: 'viewSettings', needles: ['月次カレンダー'], note: 'カレンダーのタイトル' },
  { id: 'view-custom-html', section: 'viewSettings', needles: ['ダッシュボード'], note: 'カスタム一覧の HTML' },
  { id: 'view-status', section: 'viewSettings', needles: ['未完了'], note: '一覧の条件（状況の値）' },
  { id: 'report-chart', section: 'reportSettings', needles: ['月別売上'], note: 'グラフの種類と集計' },
  { id: 'report-added', section: 'reportSettings', needles: ['地域別'], note: '開発だけのグラフ' },
  { id: 'process-rename', section: 'processSettings', needles: ['処理中'], note: 'ステータス名の変更' },
  { id: 'process-added', section: 'processSettings', needles: ['保留'], note: 'ステータスの追加' },
  { id: 'process-assignee', section: 'processSettings', needles: ['完了'], note: '作業者の変更' },
  { id: 'process-action-added', section: 'processSettings', needles: ['保留にする'], note: 'アクションの追加' },
  { id: 'plugin-added', section: 'pluginSettings', needles: ['plugin-extra'], note: 'プラグインの追加' },
  { id: 'plugin-config', section: 'pluginSettings', needles: ['#3498db'], note: 'プラグイン設定の変更' },
  { id: 'customize-url', section: 'customizeSettings', needles: ['chart-4.4'], note: 'URL の変更' },
  { id: 'customize-util', section: 'customizeSettings', needles: ['util.js'], note: '内容違いの JS' },
  { id: 'customize-extra', section: 'customizeSettings', needles: ['extra.js'], note: '開発だけの JS' },
  { id: 'action-mapping', section: 'actionSettings', needles: ['budget'], note: 'アクションのコピー項目' },
  { id: 'action-dest', section: 'actionSettings', needles: ['請求書作成'], note: '宛先アプリ（環境差）' },
  { id: 'acl-added', section: 'appAcl', needles: ['accounting'], note: '権限行の追加' },
  { id: 'acl-changed', section: 'appAcl', needles: ['everyone'], note: '権限の変更' },
  { id: 'field-acl', section: 'fieldAcl', needles: ['shipping'], note: 'フィールド権限の追加' },
  { id: 'record-acl', section: 'recordPermissions', needles: ['保留'], note: 'レコード権限の条件' },
  { id: 'notify-general', section: 'notifications', needles: ['managers'], note: '宛先の変更' },
  { id: 'notify-record', section: 'perRecordNotifications', needles: ['managers'], note: '条件通知の宛先追加' },
  { id: 'notify-reminder', section: 'reminderNotifications', needles: ['-3'], note: 'リマインダーのタイミング' },
  { id: 'category', section: 'categories', needles: ['東日本'], note: 'カテゴリーの追加' },
  { id: 'settings-name', section: 'appSettings', needles: ['営業案件管理'], note: 'アプリ名' },
  { id: 'settings-theme', section: 'appSettings', needles: ['BLUE'], note: 'テーマ' },
  { id: 'settings-fiscal', section: 'appSettings', needles: ['firstMonthOfFiscalYear'], note: '年度の開始月' }
];

module.exports = { businessApp, masterApp, pluginConfigs, FILES_BY_KEY, JS_FILES, EXPECTED_DIFFS, f, clone };
