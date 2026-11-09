'use strict';

// 設定取得・設計書作成の通し検証（settings-design-explore.cjs）が使う、業務アプリに近い合成設定。
// 実際の kintone の応答の形に合わせた「顧客・案件・見積・受注・商品マスタ」などの 10 アプリ前後と、規模検証用の多数アプリを作る。
// 実際の kintone には通信しない。

const clone = value => JSON.parse(JSON.stringify(value));

const entity = (type, code) => ({ type, code });
const f = {
  text: (code, label, extra = {}) => ({ type: 'SINGLE_LINE_TEXT', code, label, noLabel: false, required: false, unique: false, maxLength: '', minLength: '', defaultValue: '', expression: '', hideExpression: false, ...extra }),
  memo: (code, label, extra = {}) => ({ type: 'MULTI_LINE_TEXT', code, label, noLabel: false, required: false, defaultValue: '', ...extra }),
  rich: (code, label, extra = {}) => ({ type: 'RICH_TEXT', code, label, noLabel: false, required: false, defaultValue: '', ...extra }),
  number: (code, label, extra = {}) => ({ type: 'NUMBER', code, label, noLabel: false, required: false, unique: false, minValue: '', maxValue: '', digit: false, displayScale: '', unit: '', unitPosition: 'BEFORE', defaultValue: '', ...extra }),
  calc: (code, label, expression, extra = {}) => ({ type: 'CALC', code, label, noLabel: false, required: false, expression, format: 'NUMBER', displayScale: '', hideExpression: false, unit: '', unitPosition: 'BEFORE', ...extra }),
  choice: (type, code, label, names, defaultValue, extra = {}) => ({ type, code, label, noLabel: false, required: false, options: Object.fromEntries(names.map((name, index) => [name, { label: name, index: String(index) }])), defaultValue, ...(type === 'DROP_DOWN' ? {} : { align: 'HORIZONTAL' }), ...extra }),
  date: (code, label, extra = {}) => ({ type: 'DATE', code, label, noLabel: false, required: false, unique: false, defaultValue: '', defaultNowValue: false, ...extra }),
  time: (code, label, extra = {}) => ({ type: 'TIME', code, label, noLabel: false, required: false, defaultValue: '', defaultNowValue: false, ...extra }),
  datetime: (code, label, extra = {}) => ({ type: 'DATETIME', code, label, noLabel: false, required: false, unique: false, defaultValue: '', defaultNowValue: false, ...extra }),
  link: (code, label, protocol = 'WEB', extra = {}) => ({ type: 'LINK', code, label, noLabel: false, required: false, unique: false, maxLength: '', minLength: '', defaultValue: '', protocol, ...extra }),
  file: (code, label, extra = {}) => ({ type: 'FILE', code, label, noLabel: false, required: false, thumbnailSize: '150', ...extra }),
  user: (code, label, extra = {}) => ({ type: 'USER_SELECT', code, label, noLabel: false, required: false, entities: [], defaultValue: [], ...extra }),
  org: (code, label, extra = {}) => ({ type: 'ORGANIZATION_SELECT', code, label, noLabel: false, required: false, entities: [], defaultValue: [], ...extra }),
  groupSel: (code, label, extra = {}) => ({ type: 'GROUP_SELECT', code, label, noLabel: false, required: false, entities: [], defaultValue: [], ...extra }),
  group: (code, label, extra = {}) => ({ type: 'GROUP', code, label, noLabel: false, openGroup: true, ...extra }),
  label: (label, extra = {}) => ({ type: 'LABEL', label, noLabel: false, ...extra }),
  table: (code, fields, extra = {}) => ({ type: 'SUBTABLE', code, noLabel: false, fields: Object.fromEntries(fields.map(field => [field.code, field])), ...extra }),
  lookup: (code, label, relatedApp, keyField, mappings, extra = {}) => ({
    ...f.text(code, label),
    lookup: { relatedApp: { app: String(relatedApp), code: '' }, relatedKeyField: keyField, fieldMappings: mappings, lookupPickerFields: [keyField], filterCond: '', sort: `${keyField} asc` },
    ...extra
  }),
  reference: (code, label, relatedApp, condition, displayFields, extra = {}) => ({
    type: 'REFERENCE_TABLE', code, label, noLabel: false,
    referenceTable: { relatedApp: { app: String(relatedApp), code: '' }, condition, filterCond: '', displayFields, sort: '$id desc', size: '5' },
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
const props = fields => Object.fromEntries(fields.map(field => [field.code, clone(field)]));
const cell = (field, width = '200') => (field.type === 'LABEL' ? { type: 'LABEL', label: field.label, size: { width } } : { type: field.type, code: field.code, size: { width } });
const row = (...fields) => ({ type: 'ROW', fields: fields.map(field => cell(field)) });
const view = {
  list: (name, index, fields, filterCond = '', sort = 'record_no desc', extra = {}) => ({ type: 'LIST', name, index: String(index), fields, filterCond, sort, device: 'ANY', ...extra }),
  calendar: (name, index, date, title, filterCond = '') => ({ type: 'CALENDAR', name, index: String(index), date, title, filterCond, sort: '', device: 'ANY' }),
  custom: (name, index, html) => ({ type: 'CUSTOM', name, index: String(index), html, pager: true, device: 'DESKTOP', filterCond: '', sort: '' })
};

const SELECT_CYCLE = ['SINGLE_LINE_TEXT', 'NUMBER', 'DROP_DOWN', 'DATE', 'CHECK_BOX', 'MULTI_LINE_TEXT', 'RADIO_BUTTON', 'USER_SELECT', 'LINK', 'MULTI_SELECT', 'TIME', 'DATETIME', 'FILE', 'ORGANIZATION_SELECT', 'GROUP_SELECT', 'RICH_TEXT'];

/** 項目数を増やすための汎用フィールド（種類を順に変える）。 */
function fillerFields(prefix, count) {
  const out = [];
  for (let i = 1; i <= count; i += 1) {
    const type = SELECT_CYCLE[i % SELECT_CYCLE.length];
    const code = `${prefix}_${String(i).padStart(2, '0')}`;
    const label = `${prefix === 'x' ? '追加項目' : prefix}${i}`;
    switch (type) {
      case 'NUMBER': out.push(f.number(code, label, { unit: '件', unitPosition: 'AFTER' })); break;
      case 'DROP_DOWN': out.push(f.choice('DROP_DOWN', code, label, ['A', 'B', 'C'], 'A')); break;
      case 'DATE': out.push(f.date(code, label)); break;
      case 'CHECK_BOX': out.push(f.choice('CHECK_BOX', code, label, ['項目1', '項目2'], [])); break;
      case 'MULTI_LINE_TEXT': out.push(f.memo(code, label)); break;
      case 'RADIO_BUTTON': out.push(f.choice('RADIO_BUTTON', code, label, ['はい', 'いいえ'], 'はい')); break;
      case 'USER_SELECT': out.push(f.user(code, label)); break;
      case 'LINK': out.push(f.link(code, label, i % 2 ? 'WEB' : 'MAIL')); break;
      case 'MULTI_SELECT': out.push(f.choice('MULTI_SELECT', code, label, ['X', 'Y', 'Z'], ['X'])); break;
      case 'TIME': out.push(f.time(code, label)); break;
      case 'DATETIME': out.push(f.datetime(code, label)); break;
      case 'FILE': out.push(f.file(code, label)); break;
      case 'ORGANIZATION_SELECT': out.push(f.org(code, label)); break;
      case 'GROUP_SELECT': out.push(f.groupSel(code, label)); break;
      case 'RICH_TEXT': out.push(f.rich(code, label)); break;
      default: out.push(f.text(code, label, { maxLength: String(20 + i) }));
    }
  }
  return out;
}

const STATUS_SYSTEM = [
  { type: 'STATUS', code: 'ステータス', label: 'ステータス', enabled: true },
  { type: 'STATUS_ASSIGNEE', code: '作業者', label: '作業者', enabled: true },
  { type: 'CATEGORY', code: 'カテゴリー', label: 'カテゴリー', enabled: true }
];

const defaultAppSettings = (name, extra = {}) => ({
  name, description: `${name}の説明`, icon: { type: 'PRESET', key: 'APP01' }, theme: 'WHITE', titleField: { selectionMode: 'AUTO' },
  enableThumbnails: true, enableBulkDeletion: true, enableComments: true, enableDuplicateRecord: true, enableInlineRecordEditing: true,
  numberPrecision: { digits: '16', decimalPlaces: '4', roundingMode: 'HALF_EVEN' }, firstMonthOfFiscalYear: '4', ...extra
});

const emptySections = name => ({
  appSettings: defaultAppSettings(name),
  fieldSettings: { properties: {} },
  layoutSettings: { layout: [] },
  viewSettings: { views: {} },
  reportSettings: { reports: {} },
  processSettings: { enable: false, states: {}, actions: [] },
  pluginSettings: { plugins: [] },
  customizeSettings: { scope: 'ALL', desktop: { js: [], css: [] }, mobile: { js: [], css: [] } },
  actionSettings: { actions: {} },
  appAcl: { rights: [{ entity: entity('USER', 'admin'), includeSubs: false, appEditable: true, recordViewable: true, recordAddable: true, recordEditable: true, recordDeletable: true, recordImportable: true, recordExportable: true }] },
  fieldAcl: { rights: [] },
  recordPermissions: { rights: [] },
  notifications: { notifications: [], notifyToCommenter: false },
  perRecordNotifications: { notifications: [] },
  reminderNotifications: { notifications: [], timezone: 'Asia/Tokyo' },
  categories: { enabled: false, categories: {} },
  formSettings: { properties: [] }
});

const PLUGINS = [
  { id: 'abcdefghijklmnopabcdefghijklmnop', name: 'カレンダー拡張プラグイン', enabled: true, config: { apiToken: 'sk-live-EXAMPLE-SECRET-0001', endpoint: 'https://api.example.com/v1', showWeekend: 'true' } },
  { id: 'qrstuvwxqrstuvwxqrstuvwxqrstuvwx', name: 'チャット通知（Webhook）', enabled: true, config: { webhookUrl: 'https://hooks.example.com/services/T000/B000/SECRETSECRET', channel: '#sales' } },
  { id: 'plugin3plugin3plugin3plugin3plugin3', name: '一括更新ツール', enabled: false, config: { mode: 'safe' } }
];

function buildBusinessApp(spec) {
  const { id, name, kind, fillers = 20, peers = {} } = spec;
  const sections = emptySections(name);
  const sys = f.system();
  let fields = [];
  let layout = [];
  let views = {};
  let reports = {};
  let process = { enable: false, states: {}, actions: [] };
  const actions = {};
  let fieldAclRights = [];
  let recordRights = [];

  if (kind === 'customer') {
    const code = f.text('customer_code', '顧客コード', { required: true, unique: true, maxLength: '10' });
    const nm = f.text('customer_name', '顧客名', { required: true });
    const kana = f.text('kana', 'フリガナ');
    const rank = f.choice('RADIO_BUTTON', 'rank', 'ランク', ['A', 'B', 'C'], 'B');
    const industry = f.choice('DROP_DOWN', 'industry', '業種', ['製造', '小売', '金融', '公共', 'その他'], '');
    const owner = f.user('owner', '営業担当', { entities: [entity('GROUP', 'sales')] });
    const tel = f.link('tel', '電話番号', 'CALL');
    const mail = f.link('mail', 'メール', 'MAIL');
    const web = f.link('web', 'WebサイトURL', 'WEB');
    const memo = f.memo('memo', '備考');
    const contacts = f.table('contacts', [f.text('contact_name', '担当者名'), f.text('contact_dept', '部署'), f.link('contact_mail', 'メール', 'MAIL'), f.choice('CHECK_BOX', 'contact_roles', '役割', ['窓口', '決裁', '技術'], [])]);
    const basic = f.group('grp_basic', '基本情報');
    const contact = f.group('grp_contact', '連絡先', { openGroup: false });
    fields = [...sys, basic, code, nm, kana, rank, industry, owner, contact, tel, mail, web, memo, contacts, ...fillerFields('x', fillers)];
    layout = [
      { type: 'GROUP', code: 'grp_basic', layout: [row(code, nm), row(kana, rank), row(industry, owner)] },
      { type: 'GROUP', code: 'grp_contact', layout: [row(tel, mail), row(web)] },
      row(memo),
      { type: 'SUBTABLE', code: 'contacts', fields: Object.values(contacts.fields).map(c => cell(c, '150')) },
      { type: 'ROW', fields: [{ type: 'LABEL', label: '<b>補足</b>: 追加項目は下に並びます', size: { width: '400' } }] },
      ...fields.filter(field => field.code.startsWith('x_')).map(field => row(field))
    ];
    views = { '一覧': view.list('一覧', 0, ['customer_code', 'customer_name', 'rank', 'owner'], '', 'customer_code asc'), 'ランクA': view.list('ランクA', 1, ['customer_code', 'customer_name', 'industry'], 'rank in ("A")', 'updated desc') };
    reports = { 'ランク別': { chartType: 'PIE', chartMode: 'NORMAL', name: 'ランク別', index: '0', groups: [{ code: 'rank' }], aggregations: [{ type: 'COUNT' }], filterCond: '', sort: 'TOTAL_DESC', periodicReport: null } };
    sections.formSettings = { properties: [] };
    recordRights = [{ filterCond: 'rank in ("A")', entities: [{ entity: entity('GROUP', 'sales'), viewable: true, editable: false, deletable: false, includeSubs: false }] }];
    fieldAclRights = [{ code: 'rank', entities: [{ accessibility: 'READ', entity: entity('GROUP', 'everyone'), includeSubs: false }, { accessibility: 'WRITE', entity: entity('GROUP', 'sales'), includeSubs: false }] }];
  } else if (kind === 'product') {
    const code = f.text('product_code', '商品コード', { required: true, unique: true });
    const nm = f.text('product_name', '商品名', { required: true });
    const price = f.number('unit_price', '標準単価', { unit: '円', unitPosition: 'AFTER', required: true });
    const cost = f.number('cost', '原価', { unit: '円', unitPosition: 'AFTER' });
    const margin = f.calc('margin', '粗利率', 'IF(unit_price = 0, 0, (unit_price - cost) / unit_price * 100)', { unit: '%', unitPosition: 'AFTER', displayScale: '1' });
    const cat = f.choice('DROP_DOWN', 'category', '分類', ['ハード', 'ソフト', 'サービス'], 'ハード');
    const stock = f.choice('RADIO_BUTTON', 'stock_flag', '在庫管理', ['する', 'しない'], 'する');
    const img = f.file('image', '商品画像');
    const memo = f.rich('desc', '商品説明');
    fields = [...sys, code, nm, price, cost, margin, cat, stock, img, memo, ...fillerFields('x', fillers)];
    layout = [row(code, nm), row(price, cost, margin), row(cat, stock), row(img), row(memo), ...fields.filter(field => field.code.startsWith('x_')).map(field => row(field))];
    views = { '商品一覧': view.list('商品一覧', 0, ['product_code', 'product_name', 'unit_price', 'category'], '', 'product_code asc'), 'ソフト': view.list('ソフト', 1, ['product_code', 'product_name'], 'category in ("ソフト")') };
    reports = { '分類別平均単価': { chartType: 'BAR', chartMode: 'NORMAL', name: '分類別平均単価', index: '0', groups: [{ code: 'category' }], aggregations: [{ type: 'AVERAGE', code: 'unit_price' }], filterCond: '', sort: 'GROUP1_ASC', periodicReport: null } };
  } else if (kind === 'deal') {
    const title = f.text('deal_title', '案件名', { required: true });
    const cust = f.lookup('customer_code', '顧客コード', peers.customer, 'customer_code', [{ field: 'customer_name', relatedField: 'customer_name' }, { field: 'cust_rank', relatedField: 'rank' }], { required: true });
    const custName = f.text('customer_name', '顧客名');
    const rank = f.text('cust_rank', '顧客ランク');
    const amount = f.number('amount', '見込金額', { unit: '円', unitPosition: 'AFTER', digit: true, minValue: '0' });
    const prob = f.number('probability', '確度', { unit: '%', unitPosition: 'AFTER', minValue: '0', maxValue: '100' });
    const weighted = f.calc('weighted', '加重金額', 'amount * probability / 100', { unit: '円', unitPosition: 'AFTER', displayScale: '0' });
    const phase = f.choice('DROP_DOWN', 'phase', 'フェーズ', ['リード', '商談中', '提案済', '受注', '失注'], 'リード', { required: true });
    const close = f.date('close_date', '受注予定日');
    const owner = f.user('owner', '担当者');
    const dept = f.org('dept', '担当部署');
    const memo = f.memo('memo', '商談メモ');
    const quotes = f.reference('quotes', '関連する見積', peers.quote, { field: 'customer_code', relatedField: 'customer_code' }, ['quote_no', 'quote_total', 'valid_until'], { filterCond: 'quote_status not in ("失効")' });
    const tasks = f.table('tasks', [f.text('task_name', 'タスク'), f.date('task_due', '期限'), f.user('task_owner', '担当'), f.choice('DROP_DOWN', 'task_state', '状態', ['未着手', '進行中', '完了'], '未着手'), f.number('task_hours', '工数', { unit: 'h', unitPosition: 'AFTER' }), f.lookup('task_product', '関連商品', peers.product, 'product_code', [{ field: 'task_product_name', relatedField: 'product_name' }]), f.text('task_product_name', '商品名')]);
    const basic = f.group('grp_basic', '案件情報');
    const money = f.group('grp_money', '金額');
    fields = [...sys, basic, title, cust, custName, rank, phase, close, owner, dept, money, amount, prob, weighted, memo, quotes, tasks, ...fillerFields('x', fillers)];
    layout = [
      { type: 'GROUP', code: 'grp_basic', layout: [row(title), row(cust, custName, rank), row(phase, close), row(owner, dept)] },
      { type: 'GROUP', code: 'grp_money', layout: [row(amount, prob, weighted)] },
      row(memo), row(quotes),
      { type: 'SUBTABLE', code: 'tasks', fields: Object.values(tasks.fields).map(c => cell(c, '140')) },
      ...fields.filter(field => field.code.startsWith('x_')).map(field => row(field))
    ];
    views = {
      '進行中の案件': view.list('進行中の案件', 0, ['deal_title', 'customer_name', 'phase', 'amount', 'close_date'], 'phase not in ("受注", "失注")', 'close_date asc', { device: 'ANY' }),
      '自分の案件': view.list('自分の案件', 1, ['deal_title', 'phase', 'amount'], 'owner in (LOGIN_USER())', 'amount desc'),
      '受注予定カレンダー': view.calendar('受注予定カレンダー', 2, 'close_date', 'deal_title', 'phase in ("提案済")'),
      'ボード': view.custom('ボード', 3, '<div id="board"></div>')
    };
    reports = {
      'フェーズ別金額': { chartType: 'BAR', chartMode: 'NORMAL', name: 'フェーズ別金額', index: '0', groups: [{ code: 'phase' }], aggregations: [{ type: 'SUM', code: 'amount' }], filterCond: '', sort: 'GROUP1_ASC', periodicReport: null },
      '月別受注': { chartType: 'LINE', chartMode: 'NORMAL', name: '月別受注', index: '1', groups: [{ code: 'close_date', per: 'MONTH' }], aggregations: [{ type: 'SUM', code: 'weighted' }, { type: 'COUNT' }], filterCond: 'phase in ("受注")', sort: 'GROUP1_ASC', periodicReport: { active: true, period: { every: 'MONTH', dayOfMonth: '1', time: '09:00' } } }
    };
    const st = n => ({ name: n, index: '0', assignee: { type: 'ONE', entities: [] } });
    process = {
      enable: true,
      states: {
        '未着手': { ...st('未着手'), index: '0' },
        '商談中': { name: '商談中', index: '1', assignee: { type: 'ONE', entities: [{ entity: entity('FIELD_ENTITY', 'owner'), includeSubs: false }] } },
        '見積提出': { name: '見積提出', index: '2', assignee: { type: 'ALL', entities: [{ entity: entity('FIELD_ENTITY', 'owner'), includeSubs: false }, { entity: entity('USER', 'manager'), includeSubs: false }] } },
        '承認待ち': { name: '承認待ち', index: '3', assignee: { type: 'ANY', entities: [{ entity: entity('GROUP', 'managers'), includeSubs: false }] } },
        '受注': { ...st('受注'), index: '4' },
        '失注': { ...st('失注'), index: '5' }
      },
      actions: [
        { name: '商談開始', from: '未着手', to: '商談中', filterCond: '' },
        { name: '見積提出', from: '商談中', to: '見積提出', filterCond: 'amount > 0' },
        { name: '承認申請', from: '見積提出', to: '承認待ち', filterCond: 'amount >= 1000000' },
        { name: '受注確定', from: '承認待ち', to: '受注', filterCond: '' },
        { name: '失注にする', from: '商談中', to: '失注', filterCond: '' }
      ]
    };
    actions['見積を作成'] = { name: '見積を作成', index: '0', destApp: { app: String(peers.quote), code: '' }, mappings: [{ srcType: 'FIELD', srcField: 'customer_code', destField: 'customer_code' }, { srcType: 'FIELD', srcField: 'deal_title', destField: 'quote_subject' }, { srcType: 'RECORD_URL', destField: 'deal_url' }], entities: [entity('GROUP', 'sales'), entity('USER', 'admin')], filterCond: 'phase in ("商談中", "提案済")' };
    fieldAclRights = [
      { code: 'amount', entities: [{ accessibility: 'READ', entity: entity('GROUP', 'everyone'), includeSubs: false }, { accessibility: 'WRITE', entity: entity('GROUP', 'managers'), includeSubs: true }] },
      { code: 'probability', entities: [{ accessibility: 'NONE', entity: entity('GROUP', 'partners'), includeSubs: false }] }
    ];
    recordRights = [
      { filterCond: 'owner in (LOGIN_USER())', entities: [{ entity: entity('GROUP', 'sales'), viewable: true, editable: true, deletable: false, includeSubs: false }] },
      { filterCond: '', entities: [{ entity: entity('GROUP', 'managers'), viewable: true, editable: true, deletable: true, includeSubs: true }] }
    ];
  } else if (kind === 'quote') {
    const no = f.text('quote_no', '見積番号', { required: true, unique: true });
    const subject = f.text('quote_subject', '件名');
    const cust = f.lookup('customer_code', '顧客コード', peers.customer, 'customer_code', [{ field: 'customer_name', relatedField: 'customer_name' }]);
    const custName = f.text('customer_name', '顧客名');
    const date = f.date('quote_date', '見積日', { defaultNowValue: true });
    const valid = f.date('valid_until', '有効期限');
    const status = f.choice('DROP_DOWN', 'quote_status', '見積状況', ['作成中', '提出済', '承諾', '失効'], '作成中');
    const sub = f.calc('quote_sub', '小計', 'SUM(line_total)', { unit: '円', unitPosition: 'AFTER' });
    const tax = f.calc('quote_tax', '消費税', 'ROUNDDOWN(quote_sub * 0.1, 0)', { unit: '円', unitPosition: 'AFTER' });
    const total = f.calc('quote_total', '合計', 'quote_sub + quote_tax', { unit: '円', unitPosition: 'AFTER' });
    const dealUrl = f.link('deal_url', '案件URL', 'WEB');
    const lines = f.table('lines', [
      f.lookup('line_product', '商品コード', peers.product, 'product_code', [{ field: 'line_name', relatedField: 'product_name' }, { field: 'line_price', relatedField: 'unit_price' }]),
      f.text('line_name', '商品名'), f.number('line_price', '単価', { unit: '円', unitPosition: 'AFTER' }), f.number('line_qty', '数量', { required: true, minValue: '1' }),
      f.number('line_discount', '値引率', { unit: '%', unitPosition: 'AFTER' }),
      f.calc('line_total', '金額', 'line_price * line_qty * (100 - line_discount) / 100', { unit: '円', unitPosition: 'AFTER' })
    ]);
    const basic = f.group('grp_basic', '見積情報');
    fields = [...sys, basic, no, subject, cust, custName, date, valid, status, dealUrl, lines, sub, tax, total, ...fillerFields('x', fillers)];
    layout = [{ type: 'GROUP', code: 'grp_basic', layout: [row(no, subject), row(cust, custName), row(date, valid, status), row(dealUrl)] }, { type: 'SUBTABLE', code: 'lines', fields: Object.values(lines.fields).map(c => cell(c, '120')) }, row(sub, tax, total), ...fields.filter(field => field.code.startsWith('x_')).map(field => row(field))];
    views = { '見積一覧': view.list('見積一覧', 0, ['quote_no', 'customer_name', 'quote_total', 'quote_status'], '', 'quote_date desc'), '有効な見積': view.list('有効な見積', 1, ['quote_no', 'quote_total', 'valid_until'], 'quote_status not in ("失効") and valid_until >= TODAY()', 'valid_until asc') };
    reports = { '状況別': { chartType: 'PIE', chartMode: 'NORMAL', name: '状況別', index: '0', groups: [{ code: 'quote_status' }], aggregations: [{ type: 'COUNT' }], filterCond: '', sort: 'TOTAL_DESC', periodicReport: null } };
    process = {
      enable: true,
      states: { '作成中': { name: '作成中', index: '0', assignee: { type: 'ONE', entities: [] } }, '承認待ち': { name: '承認待ち', index: '1', assignee: { type: 'ONE', entities: [{ entity: entity('ORGANIZATION', 'sales-mgr'), includeSubs: true }] } }, '承認済み': { name: '承認済み', index: '2', assignee: { type: 'ONE', entities: [] } } },
      actions: [{ name: '承認申請', from: '作成中', to: '承認待ち', filterCond: '' }, { name: '承認', from: '承認待ち', to: '承認済み', filterCond: '' }, { name: '差し戻し', from: '承認待ち', to: '作成中', filterCond: '' }]
    };
    actions['受注に変換'] = { name: '受注に変換', index: '0', destApp: { app: String(peers.order), code: '' }, mappings: [{ srcType: 'FIELD', srcField: 'customer_code', destField: 'customer_code' }, { srcType: 'FIELD', srcField: 'quote_no', destField: 'quote_ref' }, { srcType: 'FIELD', srcField: 'quote_total', destField: 'order_total' }], entities: [entity('GROUP', 'sales')], filterCond: 'quote_status in ("承諾")' };
  } else if (kind === 'order') {
    const no = f.text('order_no', '受注番号', { required: true, unique: true });
    const cust = f.lookup('customer_code', '顧客コード', peers.customer, 'customer_code', [{ field: 'customer_name', relatedField: 'customer_name' }]);
    const custName = f.text('customer_name', '顧客名');
    const quoteRef = f.text('quote_ref', '見積番号');
    const total = f.number('order_total', '受注金額', { unit: '円', unitPosition: 'AFTER', digit: true });
    const delivery = f.date('delivery_date', '納期');
    const status = f.choice('RADIO_BUTTON', 'order_status', '受注状況', ['受注', '出荷準備', '出荷済', '請求済'], '受注');
    const items = f.table('items', [f.lookup('item_product', '商品コード', peers.product, 'product_code', [{ field: 'item_name', relatedField: 'product_name' }]), f.text('item_name', '商品名'), f.number('item_qty', '数量'), f.number('item_price', '単価'), f.calc('item_amount', '金額', 'item_qty * item_price')]);
    const hist = f.reference('quote_history', '元の見積', peers.quote, { field: 'quote_ref', relatedField: 'quote_no' }, ['quote_no', 'quote_total']);
    fields = [...sys, no, cust, custName, quoteRef, total, delivery, status, items, hist, ...fillerFields('x', fillers)];
    layout = [row(no, quoteRef), row(cust, custName), row(total, delivery, status), { type: 'SUBTABLE', code: 'items', fields: Object.values(items.fields).map(c => cell(c, '120')) }, row(hist), ...fields.filter(field => field.code.startsWith('x_')).map(field => row(field))];
    views = { '受注一覧': view.list('受注一覧', 0, ['order_no', 'customer_name', 'order_total', 'order_status'], '', 'order_no desc') };
    reports = {};
    process = {
      enable: true,
      states: { '受付': { name: '受付', index: '0', assignee: { type: 'ONE', entities: [] } }, '出荷': { name: '出荷', index: '1', assignee: { type: 'ONE', entities: [{ entity: entity('USER', 'logistics'), includeSubs: false }] } }, '完了': { name: '完了', index: '2', assignee: { type: 'ONE', entities: [] } } },
      actions: [{ name: '出荷指示', from: '受付', to: '出荷', filterCond: '' }, { name: '出荷完了', from: '出荷', to: '完了', filterCond: '' }]
    };
  } else if (kind === 'daily') {
    const date = f.date('report_date', '日付', { required: true, defaultNowValue: true });
    const author = f.user('author', '報告者');
    const place = f.text('place', '訪問先');
    const body = f.memo('body', '内容');
    const mood = f.choice('RADIO_BUTTON', 'mood', '体調', ['良い', '普通', '悪い'], '普通');
    fields = [...sys, date, author, place, body, mood, ...fillerFields('x', fillers)];
    layout = [row(date, author), row(place), row(body), row(mood), ...fields.filter(field => field.code.startsWith('x_')).map(field => row(field))];
    views = { '日報一覧': view.list('日報一覧', 0, ['report_date', 'author', 'place'], '', 'report_date desc') };
  } else if (kind === 'messy') {
    // 長い名前・記号・改行・|・< を含む名前（Markdown や Excel を壊しやすい）
    const a = f.text('code_a', '種別|区分 <重要>');
    const b = f.text('code_b', '改行\nを含む\nラベル');
    const c = f.text('code_c', '='.repeat(5) + '先頭が=のラベル');
    const d = f.text('code_d', '非常に長いフィールド名'.repeat(12));
    const e = f.choice('DROP_DOWN', 'code_e', '選択肢に記号', ['A|B', '<C>', '行1\n行2', '`code`', '*強調*', '[リンク](http://x)', '& 記号 &amp;'], 'A|B');
    const g = f.calc('code_g', '計算 | 式', 'IF(code_a = "x|y", 1, 0)');
    fields = [...sys, a, b, c, d, e, g, ...fillerFields('x', fillers)];
    layout = [row(a, b), row(c, d), row(e, g), ...fields.filter(field => field.code.startsWith('x_')).map(field => row(field))];
    views = { 'A|B <ビュー>\n改行': view.list('A|B <ビュー>\n改行', 0, ['code_a', 'code_b'], 'code_a = "x|y"', 'record_no desc') };
    reports = { '<script>alert(1)</script>|グラフ': { chartType: 'PIE', chartMode: 'NORMAL', name: '<script>alert(1)</script>|グラフ', index: '0', groups: [{ code: 'code_e' }], aggregations: [{ type: 'COUNT' }], filterCond: '', sort: 'TOTAL_DESC', periodicReport: null } };
    sections.appSettings = defaultAppSettings(name, { description: '説明に | と <b>タグ</b> と\n改行を含む' });
  }

  const staticFields = fields.filter(field => field.type !== 'LABEL');
  sections.fieldSettings = { properties: props([...staticFields, ...(process.enable ? STATUS_SYSTEM.slice(0, 2) : [])]) };
  if (kind === 'messy') {
    // LABEL はフィールドコードを持たない。レイアウトにだけ置く。
    layout.push({ type: 'ROW', fields: [{ type: 'LABEL', label: 'ラベル | <i>斜体</i>', size: { width: '300' } }] });
  }
  sections.layoutSettings = { layout };
  sections.viewSettings = { views };
  sections.reportSettings = { reports };
  sections.processSettings = process;
  sections.actionSettings = { actions };
  sections.fieldAcl = { rights: fieldAclRights };
  sections.recordPermissions = { rights: recordRights };
  sections.formSettings = { properties: staticFields.map(field => ({ type: field.type, code: field.code, label: field.label || '' })) };
  if (kind === 'deal' || kind === 'quote') {
    sections.appAcl = {
      rights: [
        { entity: entity('GROUP', 'everyone'), includeSubs: false, appEditable: false, recordViewable: true, recordAddable: false, recordEditable: false, recordDeletable: false, recordImportable: false, recordExportable: false },
        { entity: entity('GROUP', 'sales'), includeSubs: false, appEditable: false, recordViewable: true, recordAddable: true, recordEditable: true, recordDeletable: false, recordImportable: false, recordExportable: true },
        { entity: entity('ORGANIZATION', 'sales-mgr'), includeSubs: true, appEditable: true, recordViewable: true, recordAddable: true, recordEditable: true, recordDeletable: true, recordImportable: true, recordExportable: true },
        { entity: entity('USER', 'admin'), includeSubs: false, appEditable: true, recordViewable: true, recordAddable: true, recordEditable: true, recordDeletable: true, recordImportable: true, recordExportable: true }
      ]
    };
    sections.notifications = { notifications: [{ entity: entity('USER', 'admin'), includeSubs: false, recordAdded: true, recordEdited: false, commentAdded: true, statusChanged: true, fileImported: false }, { entity: entity('GROUP', 'sales'), includeSubs: true, recordAdded: true, recordEdited: true, commentAdded: false, statusChanged: false, fileImported: false }], notifyToCommenter: true };
    sections.perRecordNotifications = { notifications: [{ filterCond: 'amount > 1000000 or quote_total > 1000000', title: '高額案件の登録（<要確認> | 100万円超）', targets: [{ entity: entity('GROUP', 'managers'), includeSubs: false }] }] };
    sections.reminderNotifications = { notifications: [{ filterCond: 'phase not in ("受注", "失注")', title: '受注予定日が近づいています', timing: { code: 'close_date', daysLater: '-3', hoursLater: '0', time: '09:00' }, targets: [{ entity: entity('FIELD_ENTITY', 'owner'), includeSubs: false }] }], timezone: 'Asia/Tokyo' };
    sections.categories = { enabled: true, categories: { '東日本': { label: '東日本', index: '0', parent: null }, '関東': { label: '関東', index: '1', parent: '東日本' }, '西日本': { label: '西日本', index: '2', parent: null } } };
  }
  return { sections, definition: spec };
}

/**
 * 世界を組み立てる。
 * apps[]: { id, guest, name, code, spaceId, production, preview, files, failures: { 'GET /app/views.json': {code,message} }, pluginConfigFail: [pluginId], forbidden }
 */
function buildWorld(options = {}) {
  const apps = [];
  const files = {};
  const add = (spec, extra = {}) => {
    const built = buildBusinessApp(spec);
    const def = { id: String(spec.id), guest: spec.guest || '', name: spec.name, code: `app${spec.id}`, spaceId: spec.spaceId || null, sections: built.sections, ...extra };
    apps.push(def);
    return def;
  };
  const ids = { customer: '301', product: '302', deal: '401', quote: '402', order: '403' };
  const peers = ids;

  add({ id: 301, name: '顧客マスタ', kind: 'customer', fillers: 30, spaceId: '10' });
  add({ id: 302, name: '商品マスタ', kind: 'product', fillers: 30, spaceId: '10' });
  const deal = add({ id: 401, name: '案件管理', kind: 'deal', fillers: 55, peers, spaceId: '10' });
  const quote = add({ id: 402, name: '見積管理', kind: 'quote', fillers: 35, peers, spaceId: '10' });
  const order = add({ id: 403, name: '受注管理', kind: 'order', fillers: 25, peers, spaceId: '10' });
  const daily = add({ id: 501, guest: '7', name: '営業日報（ゲスト）', kind: 'daily', fillers: 30, spaceId: '90' });
  const partial = add({ id: 601, name: '取得に一部失敗するアプリ', kind: 'order', fillers: 35, peers, spaceId: '10' });
  partial.failures = {
    '/app/views.json': { code: 'GAIA_NO01', message: '権限がありません。一覧の設定を取得できません。' },
    '/field/acl.json': { code: 'CB_NO02', message: 'フィールドの権限を取得する権限がありません。' },
    '/app/notifications/reminder.json': { code: 'GAIA_IL23', message: 'リマインダー通知の取得で内部エラーが発生しました。' }
  };
  const noProc = add({ id: 602, name: 'プロセス管理が無効のアプリ', kind: 'order', fillers: 30, peers });
  noProc.sections.processSettings = { enable: false, states: {}, actions: [] };
  delete noProc.sections.fieldSettings.properties['ステータス'];
  delete noProc.sections.fieldSettings.properties['作業者'];
  const empty = add({ id: 603, name: 'フィールドが0のアプリ', kind: 'daily', fillers: 0 });
  empty.sections.fieldSettings = { properties: {} };
  empty.sections.layoutSettings = { layout: [] };
  empty.sections.viewSettings = { views: {} };
  empty.sections.formSettings = { properties: [] };
  const messy = add({ id: 604, name: '長い名前|記号 <テスト>\n改行入り' + '〇'.repeat(45), kind: 'messy', fillers: 12 });

  // 案件管理: プラグイン・JS/CSS（FILE と URL、PC とモバイル）
  deal.sections.pluginSettings = { plugins: PLUGINS.map(({ id, name, enabled }) => ({ id, name, enabled })) };
  deal.pluginConfigs = Object.fromEntries(PLUGINS.map(plugin => [plugin.id, plugin.config]));
  deal.sections.customizeSettings = {
    scope: 'ALL',
    desktop: {
      js: [
        { type: 'URL', url: 'https://cdn.example.com/libs/chart.min.js' },
        { type: 'FILE', file: { fileKey: 'deal-core-js', name: 'core.js', contentType: 'text/javascript', size: '120' } },
        { type: 'FILE', file: { fileKey: 'deal-board-js', name: 'board/main.js', contentType: 'text/javascript', size: '90' } },
        { type: 'FILE', file: { fileKey: 'deal-core-js-2', name: 'core.js', contentType: 'text/javascript', size: '60' } }
      ],
      css: [{ type: 'FILE', file: { fileKey: 'deal-style', name: 'style.css', contentType: 'text/css', size: '40' } }]
    },
    mobile: {
      js: [{ type: 'FILE', file: { fileKey: 'deal-mobile-js', name: 'mobile.js', contentType: 'text/javascript', size: '30' } }],
      css: [{ type: 'URL', url: 'https://cdn.example.com/mobile.css' }]
    }
  };
  Object.assign(files, {
    'deal-core-js': '(function(){ "use strict"; const API_TOKEN = "tok_live_SECRET_in_js_body"; kintone.events.on("app.record.index.show", () => {}); })();\n',
    'deal-board-js': '(function(){ /* board */ })();\n',
    'deal-core-js-2': '(function(){ /* second core */ })();\n',
    'deal-style': '.board { color: #333; }\n',
    'deal-mobile-js': '(function(){ /* mobile */ })();\n'
  });
  quote.sections.customizeSettings = {
    scope: 'ALL',
    desktop: { js: [{ type: 'FILE', file: { fileKey: 'quote-js', name: 'quote.js', contentType: 'text/javascript', size: '20' } }, { type: 'FILE', file: { fileKey: 'quote-missing', name: 'missing.js', contentType: 'text/javascript', size: '10' } }], css: [] },
    mobile: { js: [], css: [] }
  };
  files['quote-js'] = '(function(){})();\n';
  quote.sections.pluginSettings = { plugins: [{ id: PLUGINS[0].id, name: PLUGINS[0].name, enabled: true }] };
  quote.pluginConfigs = { [PLUGINS[0].id]: PLUGINS[0].config };
  order.sections.customizeSettings = { scope: 'ADMIN', desktop: { js: [], css: [] }, mobile: { js: [], css: [] } };
  messy.sections.customizeSettings = {
    scope: 'ALL',
    desktop: { js: [{ type: 'FILE', file: { fileKey: 'messy-js', name: '../a|b<c>.js', contentType: 'text/javascript', size: '10' } }, { type: 'FILE', file: { fileKey: 'messy-js2', name: 'a|b<c>.js', contentType: 'text/javascript', size: '10' } }], css: [] },
    mobile: { js: [], css: [] }
  };
  files['messy-js'] = '/* messy 1 */\n';
  files['messy-js2'] = '/* messy 2 */\n';

  // プレビュー（本番と少し違う設定）
  for (const app of apps) {
    app.preview = clone(app.sections);
    app.production = app.sections;
    delete app.sections;
  }
  const dealPreview = apps.find(app => app.id === '401').preview;
  dealPreview.fieldSettings.properties.preview_only_field = f.text('preview_only_field', 'プレビューだけの項目');
  dealPreview.appSettings.name = '案件管理（プレビュー）';

  // 規模検証用（既定では作らない）
  if (options.bulk) {
    for (let i = 0; i < options.bulk; i += 1) {
      const id = 1000 + i;
      const built = buildBusinessApp({ id, name: `一括アプリ${i + 1}`, kind: i % 2 ? 'order' : 'deal', fillers: 45, peers });
      apps.push({ id: String(id), guest: '', name: `一括アプリ${i + 1}`, code: `bulk${id}`, spaceId: '20', production: built.sections, preview: clone(built.sections) });
    }
  }
  return { apps, files };
}

module.exports = { buildWorld, clone };
