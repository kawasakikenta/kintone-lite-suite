'use strict';

const ICONS = Object.freeze({
  diff: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/></svg>',
  reflect: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>',
  field: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>',
  jsconfig: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>',
  er: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="6" cy="6" rx="3" ry="2"/><ellipse cx="18" cy="6" rx="3" ry="2"/><ellipse cx="12" cy="18" rx="3" ry="2"/><path d="M8.5 7.5l2 7"/><path d="M15.5 7.5l-2 7"/><path d="M9 6h6"/></svg>',
  processFlow: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="7" height="5" rx="1"/><rect x="14" y="4" width="7" height="5" rx="1"/><rect x="8.5" y="15" width="7" height="5" rx="1"/><path d="M10 6.5h4"/><path d="M17.5 9v2.5h-11V9"/><path d="M12 11.5V15"/></svg>',
  design: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6"/><path d="M8 13h8"/><path d="M8 17h5"/></svg>',
  settingsExport: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5"/><path d="M12 15V3"/></svg>',
  recordMgr: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5"/><path d="M4 11v8c0 1.7 3.6 3 8 3s8-1.3 8-3v-8"/></svg>',
  sql: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5h16"/><path d="M4 12h10"/><path d="M4 19h7"/><path d="M17 15l3 4 3-4"/></svg>',
  apiTester: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 1 0-1.1 1.6L5 19l-2 2"/><path d="M15 7h6"/><path d="M18 4v6"/></svg>'
});

/**
 * ランチャー用の機能定義。
 * 1カード=1つの作業に寄せ、押したときの着地点が分かるようにする。
 */
export const FEATURE_DEFS = [
  {
    key: 'diff',
    group: 'change',
    groupLabel: '変更・反映',
    icon: ICONS.diff,
    label: '差分比較',
    desc: '2アプリの設定差分を確認します。',
    tabs: ['reflect'],
    tab: 'reflect',
    diffSubTab: 'conditions',
    focusSelector: '#u_headerDiffSuite',
    priority: 'high',
    riskLevel: 'safe',
    recommendedFor: ['最初に確認', '変更前チェック'],
    usageOrder: 1,
    onboardingOrder: 1,
    badge: { tone: 'recommended', label: '初回推奨', icon: '1' }
  },
  {
    key: 'reflect',
    group: 'change',
    groupLabel: '変更・反映',
    icon: ICONS.reflect,
    label: 'プレビュー反映',
    desc: '差分を見ながら比較先プレビューへ反映します。',
    tabs: ['reflect'],
    tab: 'reflect',
    subTab: 'section',
    focusSelector: '#u_reflectAssist',
    priority: 'high',
    riskLevel: 'warning',
    recommendedFor: ['差分確認後', '本番反映前の検証'],
    usageOrder: 2,
    onboardingOrder: 2,
    badge: { tone: 'caution', label: '要確認', icon: '2' }
  },
  {
    key: 'field',
    group: 'change',
    groupLabel: '変更・反映',
    icon: ICONS.field,
    label: 'フィールド追加',
    desc: 'フィールド定義を追加・編集します。',
    tabs: ['field'],
    tab: 'field',
    subTab: 'json',
    focusSelector: '#u_fieldJson',
    priority: 'medium',
    riskLevel: 'warning',
    recommendedFor: ['項目追加', '定義の一括修正'],
    usageOrder: 4,
    onboardingOrder: 4,
    badge: { tone: 'caution', label: '要注意', icon: '!' }
  },
  {
    key: 'jsconfig',
    group: 'change',
    groupLabel: '変更・反映',
    icon: ICONS.jsconfig,
    label: 'JS/CSS設定',
    desc: 'カスタマイズ設定の取得・反映を行います。',
    tabs: ['jsconfig'],
    tab: 'jsconfig',
    subTab: 'editor',
    focusSelector: '#u_jsconfigJson',
    priority: 'medium',
    riskLevel: 'warning',
    recommendedFor: ['カスタマイズ配布', '環境同期'],
    usageOrder: 5,
    onboardingOrder: 5,
    badge: { tone: 'caution', label: '要注意', icon: '!' }
  },
  {
    key: 'design',
    group: 'vis',
    groupLabel: '可視化・出力',
    icon: ICONS.design,
    label: '設計書',
    desc: '設計書や差分レポートを出力します。',
    tabs: ['design'],
    tab: 'design',
    focusSelector: '[data-act="exportDesignMd"]',
    priority: 'medium',
    riskLevel: 'safe',
    recommendedFor: ['変更記録', 'レビュー資料作成'],
    usageOrder: 3,
    onboardingOrder: 3,
    badge: { tone: 'safe', label: '安全', icon: 'OK' }
  },
  {
    key: 'settingsExport',
    group: 'vis',
    groupLabel: '可視化・出力',
    icon: ICONS.settingsExport,
    label: '設定一括取得',
    desc: '複数アプリの設定をまとめて保存します。',
    tabs: ['settingsExport'],
    tab: 'settingsExport',
    subTab: 'export',
    focusSelector: '#u_settingsExportAppIds',
    priority: 'medium',
    riskLevel: 'safe',
    recommendedFor: ['バックアップ', '棚卸し'],
    usageOrder: 6,
    onboardingOrder: 6,
    badge: { tone: 'safe', label: '安全', icon: 'OK' }
  },
  {
    key: 'er',
    group: 'vis',
    groupLabel: '可視化・出力',
    icon: ICONS.er,
    label: 'ER図',
    desc: '関連アプリや参照関係を図で確認します。',
    tabs: ['er'],
    tab: 'er',
    subTab: 'diagram',
    focusSelector: '#u_erLayout',
    priority: 'medium',
    riskLevel: 'safe',
    recommendedFor: ['現状把握', '依存関係確認'],
    usageOrder: 7,
    onboardingOrder: 7,
    badge: { tone: 'safe', label: '安全', icon: 'OK' }
  },
  {
    key: 'processFlow',
    group: 'vis',
    groupLabel: '可視化・出力',
    icon: ICONS.processFlow,
    label: 'プロセス図',
    desc: 'プロセス管理をフロー図で確認します。',
    tabs: ['processFlow'],
    tab: 'processFlow',
    focusSelector: '[data-act="renderProcessFlow"]',
    priority: 'medium',
    riskLevel: 'safe',
    recommendedFor: ['状態遷移確認', '運用レビュー'],
    usageOrder: 8,
    onboardingOrder: 8,
    badge: { tone: 'safe', label: '安全', icon: 'OK' }
  },
  {
    key: 'recordMgr',
    group: 'data',
    groupLabel: 'データ・保守',
    icon: ICONS.recordMgr,
    label: 'レコード管理',
    desc: 'CSV、添付DL、ステータス更新などを行います。',
    tabs: ['recordMgr'],
    tab: 'recordMgr',
    subTab: 'status',
    focusSelector: '[data-act="runBatchProcess"]',
    priority: 'low',
    riskLevel: 'warning',
    recommendedFor: ['保守作業', 'テストデータ操作'],
    usageOrder: 9,
    onboardingOrder: 9,
    badge: { tone: 'caution', label: '要注意', icon: '!' }
  },
  {
    key: 'sql',
    group: 'data',
    groupLabel: 'データ・保守',
    icon: ICONS.sql,
    label: 'SQL実行',
    desc: 'kintoneデータをSQLライクに参照します。',
    tabs: ['sql'],
    tab: 'sql',
    focusSelector: '[data-act="launchKintoneSql"]',
    priority: 'low',
    riskLevel: 'warning',
    recommendedFor: ['調査', 'データ確認'],
    usageOrder: 10,
    onboardingOrder: 10,
    badge: { tone: 'caution', label: '要注意', icon: '!' }
  },
  {
    key: 'apiTester',
    group: 'data',
    groupLabel: 'データ・保守',
    icon: ICONS.apiTester,
    label: 'APIテスター',
    desc: 'REST APIを直接試します。',
    tabs: ['apiTester'],
    tab: 'apiTester',
    focusSelector: '#u_apiTesterMethod',
    priority: 'low',
    riskLevel: 'warning',
    recommendedFor: ['調査', 'レスポンス確認'],
    usageOrder: 11,
    onboardingOrder: 11,
    badge: { tone: 'caution', label: '上級者向け', icon: '!' }
  }
];

export const TAB_TO_FEATURE = {};
FEATURE_DEFS.forEach((f) => f.tabs.forEach((t) => {
  if (!TAB_TO_FEATURE[t]) TAB_TO_FEATURE[t] = f.key;
}));

/**
 * 単機能ブックマークレット（tools/*.js）1 本につき 1 エントリ。
 * tab は FEATURE_DEFS の tabs に含まれること。
 *
 * - bundleEntry あり: esbuild で IIFE 1 ファイルに同梱。`統合ツール.js` を別途読み込まない。
 *   - 全エントリが軽量 lite（`*-lite-entry.js` + standalone ロジック）
 */
export const STANDALONE_LAUNCH_ENTRIES = [
  {
    tab: 'reflect',
    module: 'tabs/diff.js',
    file: '差分比較.js',
    label: '差分比較',
    bundleEntry: 'diff-lite-entry.js'
  },
  {
    tab: 'reflect',
    module: 'tabs/reflect.js',
    file: 'プレビュー反映.js',
    label: 'プレビュー反映',
    bundleEntry: 'reflect-lite-entry.js'
  },
  {
    tab: 'field',
    module: 'tabs/field.js',
    file: 'フィールド追加.js',
    label: 'フィールド追加',
    bundleEntry: 'field-lite-entry.js'
  },
  {
    tab: 'jsconfig',
    module: 'tabs/jsconfig.js',
    file: 'kintoneJS取得.js',
    label: 'JS/CSS設定',
    bundleEntry: 'jsconfig-lite-entry.js'
  },
  {
    tab: 'settingsExport',
    module: 'tabs/settings-export.js',
    file: '設定取得.js',
    label: '設定一括取得',
    bundleEntry: 'settings-export-lite-entry.js'
  },
  {
    tab: 'design',
    module: 'tabs/design.js',
    file: '設計書作成.js',
    label: '設計書',
    bundleEntry: 'design-lite-entry.js'
  },
  {
    tab: 'er',
    module: 'tabs/er.js',
    file: 'ER図.js',
    label: 'ER図',
    bundleEntry: 'er-lite-entry.js'
  },
  {
    tab: 'processFlow',
    module: 'tabs/process.js',
    file: 'プロセス実行.js',
    label: 'プロセス図',
    bundleEntry: 'process-lite-entry.js'
  },
  {
    tab: 'recordMgr',
    module: 'tabs/record.js',
    file: 'kintoneレコード取得.js',
    label: 'レコード管理',
    bundleEntry: 'record-lite-entry.js'
  },
  {
    tab: 'sql',
    module: 'tabs/sql.js',
    file: 'kintoneSQL.js',
    label: 'SQL実行',
    bundleEntry: 'sql-lite-entry.js'
  }
];
