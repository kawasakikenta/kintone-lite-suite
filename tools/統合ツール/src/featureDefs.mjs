'use strict';

/**
 * ランチャー・タブ連携の機能定義（UI の機能カードと同一モデル）
 */
export const FEATURE_DEFS = [
  { key: 'diff', icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/></svg>', label: '差分比較', desc: '設定の差分を確認・比較', tabs: ['diff'] },
  { key: 'reflect', icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>', label: 'プレビュー反映', desc: '比較元の設定を比較先プレビューへ反映', tabs: ['reflect'] },
  { key: 'field', icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>', label: 'フィールド追加', desc: 'フィールド定義の追加・編集', tabs: ['field'] },
  { key: 'jsconfig', icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>', label: 'JS/CSS設定', desc: 'カスタマイズ設定の取得・反映', tabs: ['jsconfig'] },
  { key: 'vis', icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>', label: '可視化・出力', desc: 'ER図 / プロセス図 / 設計書 / 設定一括取得', tabs: ['er', 'processFlow', 'design', 'settingsExport'] },
  { key: 'data', icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>', label: 'データ・保守', desc: 'レコード管理 / SQL実行 / APIテスター', tabs: ['recordMgr', 'sql', 'apiTester'] }
];

export const TAB_TO_FEATURE = {};
FEATURE_DEFS.forEach((f) => f.tabs.forEach((t) => { TAB_TO_FEATURE[t] = f.key; }));

/**
 * 単機能ブックマークレット（tools/*.js）1 本につき 1 エントリ。
 * tab は FEATURE_DEFS の tabs に含まれること。
 *
 * - bundleEntry あり: esbuild で IIFE 1 ファイルに同梱。`統合ツール.js` を別途読み込まない。
 *   - 全エントリが軽量 lite（`*-lite-entry.js` + standalone ロジック）
 */
export const STANDALONE_LAUNCH_ENTRIES = [
  {
    tab: 'diff',
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
