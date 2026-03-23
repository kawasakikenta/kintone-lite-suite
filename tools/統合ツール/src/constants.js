'use strict';

export const TOOL_ID = 'kintone-unified-suite-v2';
export const TOOL_VERSION = '2.5.0';

export const DEFAULT_APP_ID = String(kintone.app.getId() || '');
export const DIALOG_STATE_KEY = `${TOOL_ID}:dialogState`;
export const DIFF_SNAPSHOT_STATE_KEY = `${TOOL_ID}:diffSnapshots`;
export const MAX_DIFF_SNAPSHOTS = 12;

export const DIALOG_MARGIN = 16;
export const DIALOG_MIN_WIDTH = 560;
export const DIALOG_MIN_HEIGHT = 360;
export const DIALOG_DEFAULT_WIDTH = 980;
export const DIALOG_DEFAULT_HEIGHT = 860;
export const DIALOG_LARGE_WIDTH = 1240;
export const DIALOG_LARGE_HEIGHT = 940;

export const SECTION_DEFS = [
  { key: 'appSettings', label: 'アプリ設定', endpoint: '/app/settings.json', put: false },
  { key: 'fieldSettings', label: 'フィールド設定', endpoint: '/app/form/fields.json', put: true, putBuilder: (d) => ({ properties: d.properties || d }) },
  { key: 'layoutSettings', label: 'レイアウト設定', endpoint: '/app/form/layout.json', put: true, putBuilder: (d) => ({ layout: d.layout || d }) },
  { key: 'formSettings', label: 'フォーム設定', endpoint: '/form.json', put: false },
  { key: 'viewSettings', label: 'ビュー設定', endpoint: '/app/views.json', put: true, putBuilder: (d) => ({ views: d.views || d }) },
  { key: 'reportSettings', label: 'レポート設定', endpoint: '/app/reports.json', put: true, putBuilder: (d) => ({ reports: d.reports || d }) },
  { key: 'processSettings', label: 'プロセス管理', endpoint: '/app/status.json', put: true, putBuilder: (d) => ({ enable: !!d.enable, states: d.states || {}, actions: d.actions || [] }) },
  { key: 'pluginSettings', label: 'プラグイン(※)', endpoint: '/app/plugins.json', put: true, putBuilder: (d) => ({ pluginIds: (d.plugins || []).map(p => p.id) }) },
  { key: 'customizeSettings', label: 'JS/CSS設定', endpoint: '/app/customize.json', put: true, putBuilder: (d) => ({ desktop: d.desktop || {}, mobile: d.mobile || {} }) },
  { key: 'actionSettings', label: 'アクション設定', endpoint: '/app/actions.json', put: true, putBuilder: (d) => ({ actions: d.actions || d }) },
  { key: 'appAcl', label: 'アプリ権限', endpoint: '/app/acl.json', put: true, putBuilder: (d) => ({ rights: d.rights || d }) },
  { key: 'fieldAcl', label: 'フィールド権限', endpoint: '/field/acl.json', put: true, putBuilder: (d) => ({ rights: d.rights || d }) },
  { key: 'recordPermissions', label: 'レコード権限', endpoint: '/record/acl.json', put: true, putBuilder: (d) => ({ rights: d.rights || d }) },
  { key: 'notifications', label: '通知設定', endpoint: '/app/notifications/general.json', put: true, putBuilder: (d) => ({ notifications: d.notifications || d }) },
  { key: 'perRecordNotifications', label: 'レコード条件通知', endpoint: '/app/notifications/perRecord.json', put: true, putBuilder: (d) => ({ notifications: d.notifications || d }) },
  { key: 'reminderNotifications', label: 'リマインダー通知', endpoint: '/app/notifications/reminder.json', put: true, putBuilder: (d) => ({ notifications: d.notifications || d }) },
  { key: 'categories', label: 'カテゴリ設定', endpoint: '/app/categories.json', put: true, putBuilder: (d) => ({ categories: d.categories || d }) }
];

export const SETTINGS_EXPORT_SCOPE_DEFS = SECTION_DEFS.filter((s) => s.key !== 'customizeSettings');

export const FEATURE_DEFS = [
  { key: 'diff', label: '差分比較', desc: '設定の差分を確認・比較', tabs: ['diff'] },
  { key: 'reflect', label: 'プレビュー反映', desc: '比較元の設定を比較先プレビューへ反映', tabs: ['reflect'] },
  { key: 'field', label: 'フィールド追加', desc: 'フィールド定義の追加・編集', tabs: ['field'] },
  { key: 'jsconfig', label: 'JS/CSS設定', desc: 'カスタマイズ設定の取得・反映', tabs: ['jsconfig'] },
  { key: 'vis', label: '可視化・出力', desc: 'ER図 / プロセス図 / 設計書 / 設定一括取得', tabs: ['er', 'processFlow', 'design', 'settingsExport'] },
  { key: 'data', label: 'データ・保守', desc: 'レコード管理 / SQL実行 / APIテスター', tabs: ['recordMgr', 'sql', 'apiTester'] }
];

export const TAB_TO_FEATURE = {};
FEATURE_DEFS.forEach((f) => f.tabs.forEach((t) => { TAB_TO_FEATURE[t] = f.key; }));

export const META_KEYS = new Set(['revision', 'creator', 'createdAt', 'modifier', 'modifiedAt']);

export const SYSTEM_FIELD_TYPES = new Set([
  'STATUS',
  'STATUS_ASSIGNEE',
  'CREATED_TIME',
  'UPDATED_TIME',
  'CREATOR',
  'MODIFIER',
  'RECORD_NUMBER',
  'CATEGORY'
]);

export const DEFAULT_SUBTAB_STATE = Object.freeze({
  diff: 'conditions',
  field: 'json',
  design: 'export',
  jsconfig: 'editor',
  recordMgr: 'status',
  er: 'diagram',
  settingsExport: 'export'
});

export const GUIDED_TOUR_STEPS = Object.freeze([
  {
    tab: 'diff',
    subTab: 'conditions',
    path: '差分比較 > 比較条件',
    selector: '#u_sourceApp',
    title: '1. 比較元 / 比較先を決める',
    body: '最初に上部の共通設定で、比較元と比較先のアプリID、ゲストID、プレビュー / 本番を確認します。通常は「比較元=開発」「比較先=プレビュー」から始めます。'
  },
  {
    tab: 'diff',
    subTab: 'conditions',
    path: '差分比較 > 比較条件',
    selector: '#u_envProfileSelect',
    title: '2. 環境セットを保存する',
    body: 'よく使う接続先の組み合わせは環境プロファイルとして保存できます。開発 / 検証 / 本番を頻繁に切り替える場合はここを使うと楽です。'
  },
  {
    tab: 'diff',
    subTab: 'conditions',
    path: '差分比較 > 比較条件',
    selector: '#u_diffScopes',
    title: '3. 比較対象セクションを選ぶ',
    body: '差分比較で確認したい設定だけを選びます。まずはフィールド、レイアウト、ビュー、プロセス管理あたりから始めるのが見やすいです。'
  },
  {
    tab: 'diff',
    subTab: 'conditions',
    path: '差分比較 > 比較条件',
    selector: '#u_ignoreKeyInput',
    title: '4. ノイズ差分を減らす',
    body: '無視キーや正規化プリセットを使うと、順序違い・メタ情報の差分を抑えられます。比較が荒れるときはここを先に調整します。'
  },
  {
    tab: 'diff',
    subTab: 'conditions',
    path: '差分比較 > 比較条件',
    selector: '[data-act="runDiff"]',
    title: '5. 差分比較を実行する',
    body: '条件が決まったら差分比較を実行します。必要ならこのまま JSON / HTML / Excel / パッチJSON として保存できます。'
  },
  {
    tab: 'diff',
    subTab: 'view',
    path: '差分比較 > 結果整理',
    selector: '#u_diffSearch',
    title: '6. 結果を絞り込んで確認する',
    body: '比較結果はセクション、種別、重要度、検索で絞り込めます。ここで反映対象を見極めてから次のステップへ進みます。'
  },
  {
    tab: 'reflect',
    path: 'プレビュー反映',
    selector: '[data-act="previewApplyPlan"]',
    title: '7. 反映プランを先に確認する',
    body: 'いきなり反映せず、まずは反映プラン確認で API リクエスト内容や対象セクションを確認します。安全確認のための重要ステップです。'
  },
  {
    tab: 'reflect',
    path: 'プレビュー反映',
    selector: '[data-act="applyPreview"]',
    title: '8. 比較先プレビューへ反映する',
    body: 'プランに問題がなければ、比較元の設定を比較先プレビューへ反映します。必要に応じてバックアップや反映後デプロイも併用します。'
  },
  {
    tab: 'design',
    subTab: 'export',
    path: '設計書 > 設計書出力',
    selector: '[data-act="exportDesignMd"]',
    title: '9. 最後に記録を残す',
    body: '作業後は設計書や差分レポートを出力して、変更内容を残します。複数アプリをまとめて保存したい場合は「設定一括取得」も使えます。'
  }
]);

export const HIGH_IMPACT_SECTIONS = new Set([
  'fieldSettings',
  'processSettings',
  'actionSettings',
  'appAcl',
  'fieldAcl',
  'recordPermissions'
]);

export const MEDIUM_IMPACT_SECTIONS = new Set([
  'layoutSettings',
  'viewSettings',
  'reportSettings',
  'customizeSettings',
  'notifications',
  'perRecordNotifications',
  'reminderNotifications',
  'categories'
]);

export const DIFF_IMPACT_REF_LIMIT = 6;

export const FIELD_REF_EXACT_KEYS = new Set([
  'code',
  'field',
  'entity',
  'targetField',
  'sortField',
  'groupFieldCode'
]);

export const FIELD_REF_ARRAY_KEYS = new Set([
  'fields',
  'displayFields',
  'columns'
]);

export const FIELD_REF_TOKEN_KEYS = new Set([
  'condition',
  'filterCond',
  'expression',
  'formula',
  'sort'
]);

export const IGNORE_PRESET_KEYS = {
  fieldOrder: ['index', 'no', 'order'],
  meta: ['revision', 'createdAt', 'creator', 'modifiedAt', 'modifier', 'updatedAt', 'updatedBy'],
  labelName: ['name', 'label']
};

export const DIFF_NORMALIZATION_PRESETS = {
  viewOrder: {
    label: 'ビュー/グラフ/アクション順序',
    sections: new Set(['viewSettings', 'reportSettings', 'actionSettings']),
    ignoreKeys: new Set(['index', 'no', 'order']),
    unorderedArrays: true
  },
  permissionOrder: {
    label: '権限/通知/カテゴリ順序',
    sections: new Set(['appAcl', 'fieldAcl', 'recordPermissions', 'notifications', 'perRecordNotifications', 'reminderNotifications', 'categories']),
    ignoreKeys: new Set(['index', 'no', 'order']),
    unorderedArrays: true
  }
};

export const ARRAY_LCS_MAX_CELLS = 60000;
export const LINE_DIFF_MAX_CELLS = 90000;
export const CHAR_DIFF_MAX_CELLS = 20000;

export const ARRAY_KEY_CANDIDATES = [
  'code',
  'id',
  'name',
  'entity',
  'field',
  'status',
  'state',
  'app',
  'from',
  'to',
  'key'
];

export const DEFAULT_IGNORE_KEYS = new Set([
  'id',
  'appid',
  'revision',
  'createdat',
  'creator',
  'modifiedat',
  'modifier'
]);
