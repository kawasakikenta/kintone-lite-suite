// ==========================================================================
// 設定取得.js  —  自動生成ファイル（手編集禁止）
// ==========================================================================
// このファイルは tools/統合ツール/ の npm run build (esbuild) で生成されます。
// ソース: tools/統合ツール/src/entries/settings-export-lite-entry.js
//         tools/統合ツール/src/tabs/settings-export.js  ← 機能の正規実装
//
// ■ 修正する場合は tools/統合ツール/src/ 配下のソースを編集し、
//   cd tools/統合ツール && npm run build で再生成してください。
// ■ このファイルを直接編集しても次回ビルドで上書きされます。
// ==========================================================================
"use strict";
(() => {
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __esm = (fn, res) => function __init() {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  };

  // src/featureDefs.mjs
  var ICONS, FEATURE_DEFS, TAB_TO_FEATURE;
  var init_featureDefs = __esm({
    "src/featureDefs.mjs"() {
      "use strict";
      ICONS = Object.freeze({
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
        apiTester: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 1 0-1.1 1.6L5 19l-2 2"/><path d="M15 7h6"/><path d="M18 4v6"/></svg>',
        analyze: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/><path d="M11 8v6"/><path d="M8 11h6"/></svg>'
      });
      FEATURE_DEFS = [
        {
          key: "diff",
          group: "change",
          groupLabel: "変更・反映",
          icon: ICONS.diff,
          label: "差分比較",
          desc: "2アプリの設定差分を確認します。",
          tabs: ["diff"],
          tab: "diff",
          diffSubTab: "conditions",
          focusSelector: "#u_headerDiffSuite",
          priority: "high",
          riskLevel: "safe",
          recommendedFor: ["最初に確認", "変更前チェック"],
          usageOrder: 1,
          onboardingOrder: 1,
          badge: { tone: "recommended", label: "初回推奨", icon: "1" }
        },
        {
          key: "reflect",
          group: "change",
          groupLabel: "変更・反映",
          icon: ICONS.reflect,
          label: "プレビュー反映",
          desc: "差分を見ながら比較先プレビューへ反映します。",
          tabs: ["reflect"],
          tab: "reflect",
          subTab: "settings",
          focusSelector: "#u_reflectAssist",
          priority: "high",
          riskLevel: "warning",
          recommendedFor: ["差分確認後", "本番反映前の検証"],
          usageOrder: 2,
          onboardingOrder: 2,
          badge: { tone: "caution", label: "要確認", icon: "2" }
        },
        {
          key: "field",
          group: "change",
          groupLabel: "変更・反映",
          icon: ICONS.field,
          label: "フィールド追加",
          desc: "フィールド定義の追加・編集とコード変換用JSONの作成を行います。",
          tabs: ["field"],
          tab: "field",
          subTab: "json",
          focusSelector: "#u_fieldJson",
          priority: "medium",
          riskLevel: "warning",
          recommendedFor: ["項目追加", "定義の一括修正"],
          usageOrder: 4,
          onboardingOrder: 4,
          badge: { tone: "caution", label: "要注意", icon: "!" }
        },
        {
          key: "jsconfig",
          group: "change",
          groupLabel: "変更・反映",
          icon: ICONS.jsconfig,
          label: "JS/CSS設定",
          desc: "単一アプリの customize.json 編集と JS/CSS 実ファイル取得を行います。",
          tabs: ["jsconfig"],
          tab: "jsconfig",
          subTab: "editor",
          focusSelector: "#u_jsconfigJson",
          priority: "medium",
          riskLevel: "warning",
          recommendedFor: ["カスタマイズ配布", "環境同期"],
          usageOrder: 5,
          onboardingOrder: 5,
          badge: { tone: "caution", label: "要注意", icon: "!" }
        },
        {
          key: "design",
          group: "vis",
          groupLabel: "可視化・出力",
          icon: ICONS.design,
          label: "設計書",
          desc: "設計書や差分レポートを出力します。",
          tabs: ["design"],
          tab: "design",
          focusSelector: '[data-act="exportDesignMd"]',
          priority: "medium",
          riskLevel: "safe",
          recommendedFor: ["変更記録", "レビュー資料作成"],
          usageOrder: 3,
          onboardingOrder: 3,
          badge: { tone: "safe", label: "安全", icon: "OK" }
        },
        {
          key: "settingsExport",
          group: "vis",
          groupLabel: "可視化・出力",
          icon: ICONS.settingsExport,
          label: "設定一括取得",
          desc: "複数アプリの設定JSONをまとめて保存します（データ・添付は除く）。",
          tabs: ["settingsExport"],
          tab: "settingsExport",
          subTab: "export",
          focusSelector: "#u_settingsExportAppIds",
          priority: "medium",
          riskLevel: "safe",
          recommendedFor: ["バックアップ", "棚卸し"],
          usageOrder: 6,
          onboardingOrder: 6,
          badge: { tone: "safe", label: "安全", icon: "OK" }
        },
        {
          key: "er",
          group: "vis",
          groupLabel: "可視化・出力",
          icon: ICONS.er,
          label: "ER図",
          desc: "関連アプリの構造を ER 図で確認します。",
          tabs: ["er"],
          tab: "er",
          subTab: "diagram",
          focusSelector: "#u_erLayout",
          priority: "medium",
          riskLevel: "safe",
          recommendedFor: ["現状把握", "依存関係確認"],
          usageOrder: 7,
          onboardingOrder: 7,
          badge: { tone: "safe", label: "安全", icon: "OK" }
        },
        {
          key: "processFlow",
          group: "vis",
          groupLabel: "可視化・出力",
          icon: ICONS.processFlow,
          label: "プロセス図",
          desc: "プロセス管理をフロー図で確認します。",
          tabs: ["processFlow"],
          tab: "processFlow",
          focusSelector: '[data-act="renderProcessFlow"]',
          priority: "medium",
          riskLevel: "safe",
          recommendedFor: ["状態遷移確認", "運用レビュー"],
          usageOrder: 8,
          onboardingOrder: 8,
          badge: { tone: "safe", label: "安全", icon: "OK" }
        },
        {
          key: "recordMgr",
          group: "data",
          groupLabel: "データ・保守",
          icon: ICONS.recordMgr,
          label: "レコード管理",
          desc: "レコードデータのCSV・添付・コメント・状態更新を扱います。",
          tabs: ["recordMgr"],
          tab: "recordMgr",
          subTab: "status",
          focusSelector: '[data-act="runBatchProcess"]',
          priority: "low",
          riskLevel: "warning",
          recommendedFor: ["保守作業", "テストデータ操作"],
          usageOrder: 9,
          onboardingOrder: 9,
          badge: { tone: "caution", label: "要注意", icon: "!" }
        },
        {
          key: "sql",
          group: "data",
          groupLabel: "データ・保守",
          icon: ICONS.sql,
          label: "SQL実行",
          desc: "kintoneデータをSQLライクに参照します。",
          tabs: ["sql"],
          tab: "sql",
          focusSelector: '[data-act="launchKintoneSql"]',
          priority: "low",
          riskLevel: "warning",
          recommendedFor: ["調査", "データ確認"],
          usageOrder: 10,
          onboardingOrder: 10,
          badge: { tone: "caution", label: "要注意", icon: "!" }
        },
        {
          key: "apiTester",
          group: "data",
          groupLabel: "データ・保守",
          icon: ICONS.apiTester,
          label: "APIテスター",
          desc: "REST APIを直接試します。",
          tabs: ["apiTester"],
          tab: "apiTester",
          focusSelector: "#u_apiTesterMethod",
          priority: "low",
          riskLevel: "warning",
          recommendedFor: ["調査", "レスポンス確認"],
          usageOrder: 11,
          onboardingOrder: 11,
          badge: { tone: "caution", label: "上級者向け", icon: "!" }
        },
        {
          key: "analyze",
          group: "vis",
          groupLabel: "可視化・出力",
          icon: ICONS.analyze,
          label: "分析",
          desc: "影響分析、依存グラフ、通知/権限、レイアウト確認を集約しています。",
          tabs: ["analyze"],
          tab: "analyze",
          subTab: "fieldImpact",
          focusSelector: '[data-act="runFieldImpactAnalysis"]',
          priority: "medium",
          riskLevel: "safe",
          recommendedFor: ["影響調査", "依存確認", "セキュリティ監査"],
          usageOrder: 7.5,
          onboardingOrder: 7.5,
          badge: { tone: "safe", label: "安全", icon: "OK" }
        }
      ];
      TAB_TO_FEATURE = {};
      FEATURE_DEFS.forEach((f) => f.tabs.forEach((t) => {
        if (!TAB_TO_FEATURE[t]) TAB_TO_FEATURE[t] = f.key;
      }));
    }
  });

  // src/constants.js
  var TOOL_ID, EXTERNAL_LIBRARIES, DEFAULT_APP_ID, DIALOG_STATE_KEY, DIFF_SELECTION_SETS_KEY, DIFF_ONBOARDING_DISMISSED_KEY, REFLECT_PRESETS_KEY, SECTION_DEFS, SETTINGS_EXPORT_SCOPE_DEFS, META_KEYS, DEFAULT_SUBTAB_STATE, GUIDED_TOUR_STEPS;
  var init_constants = __esm({
    "src/constants.js"() {
      "use strict";
      init_featureDefs();
      TOOL_ID = "kintone-unified-suite-v2";
      EXTERNAL_LIBRARIES = Object.freeze({
        jszip: Object.freeze({
          version: "3.10.1",
          cdnUrl: "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"
        }),
        alasql: Object.freeze({
          version: "4",
          cdnCandidates: Object.freeze([
            "https://cdn.jsdelivr.net/npm/alasql@4/dist/alasql.min.js",
            "https://unpkg.com/alasql@4/dist/alasql.min.js",
            "https://cdn.jsdelivr.net/npm/alasql@4"
          ])
        }),
        cytoscape: Object.freeze({
          version: "3.28.1",
          cdnUrl: "https://cdnjs.cloudflare.com/ajax/libs/cytoscape/3.28.1/cytoscape.min.js",
          altVersion: "3.26.0",
          altCdnUrl: "https://cdn.jsdelivr.net/npm/cytoscape@3.26.0/dist/cytoscape.min.js"
        }),
        dagre: Object.freeze({
          version: "0.8.5",
          cdnUrl: "https://cdn.jsdelivr.net/npm/dagre@0.8.5/dist/dagre.min.js"
        }),
        cytoscapeDagre: Object.freeze({
          version: "2.5.0",
          cdnUrl: "https://cdn.jsdelivr.net/npm/cytoscape-dagre@2.5.0/cytoscape-dagre.min.js",
          altCdnUrl: "https://cdn.jsdelivr.net/npm/cytoscape-dagre@2.5.0/cytoscape-dagre.js"
        }),
        googleFontsDmSansMono: Object.freeze({
          cdnUrl: "https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,600;0,9..40,700;1,9..40,400&family=DM+Mono:wght@400;500&display=swap"
        }),
        jsoneditor: Object.freeze({
          version: "9.10.3",
          cdnUrl: "https://cdnjs.cloudflare.com/ajax/libs/jsoneditor/9.10.3/jsoneditor.min.js",
          cssUrl: "https://cdnjs.cloudflare.com/ajax/libs/jsoneditor/9.10.3/jsoneditor.min.css"
        }),
        toastify: Object.freeze({
          version: "1.12.0",
          cdnUrl: "https://cdn.jsdelivr.net/npm/toastify-js",
          cssUrl: "https://cdn.jsdelivr.net/npm/toastify-js/src/toastify.min.css"
        }),
        driver: Object.freeze({
          version: "1.3.1",
          cdnUrl: "https://cdn.jsdelivr.net/npm/driver.js@1.3.1/dist/driver.js.iife.js",
          cssUrl: "https://cdn.jsdelivr.net/npm/driver.js@1.3.1/dist/driver.css"
        })
      });
      DEFAULT_APP_ID = String(kintone.app.getId() || "");
      DIALOG_STATE_KEY = `${TOOL_ID}:dialogState`;
      DIFF_SELECTION_SETS_KEY = `${TOOL_ID}:diffSelectionSets`;
      DIFF_ONBOARDING_DISMISSED_KEY = `${TOOL_ID}:diffOnboardingDismissed`;
      REFLECT_PRESETS_KEY = `${TOOL_ID}:reflectPresets`;
      SECTION_DEFS = [
        { key: "appSettings", label: "アプリ設定", endpoint: "/app/settings.json", put: false },
        { key: "fieldSettings", label: "フィールド設定", endpoint: "/app/form/fields.json", put: true, putBuilder: (d) => ({ properties: d.properties || d }) },
        { key: "layoutSettings", label: "レイアウト設定", endpoint: "/app/form/layout.json", put: true, putBuilder: (d) => ({ layout: d.layout || d }) },
        { key: "formSettings", label: "フォーム設定", endpoint: "/form.json", put: false },
        { key: "viewSettings", label: "ビュー設定", endpoint: "/app/views.json", put: true, putBuilder: (d) => ({ views: d.views || d }) },
        { key: "reportSettings", label: "グラフ設定", endpoint: "/app/reports.json", put: true, putBuilder: (d) => ({ reports: d.reports || d }) },
        { key: "processSettings", label: "プロセス管理", endpoint: "/app/status.json", put: true, putBuilder: (d) => ({ enable: !!d.enable, states: d.states || {}, actions: d.actions || [] }) },
        { key: "pluginSettings", label: "プラグイン(※)", endpoint: "/app/plugins.json", put: true, putBuilder: (d) => ({ pluginIds: (d.plugins || []).map((p) => p.id) }) },
        { key: "customizeSettings", label: "JS/CSS設定", endpoint: "/app/customize.json", put: true, putBuilder: (d) => ({ desktop: d.desktop || {}, mobile: d.mobile || {} }) },
        { key: "actionSettings", label: "アクション設定", endpoint: "/app/actions.json", put: true, putBuilder: (d) => ({ actions: d.actions || d }) },
        { key: "appAcl", label: "アプリ権限", endpoint: "/app/acl.json", put: true, putBuilder: (d) => ({ rights: d.rights || d }) },
        { key: "fieldAcl", label: "フィールド権限", endpoint: "/field/acl.json", put: true, putBuilder: (d) => ({ rights: d.rights || d }) },
        { key: "recordPermissions", label: "レコード権限", endpoint: "/record/acl.json", put: true, putBuilder: (d) => ({ rights: d.rights || d }) },
        { key: "notifications", label: "通知設定", endpoint: "/app/notifications/general.json", put: true, putBuilder: (d) => ({ notifications: d.notifications || d }) },
        { key: "perRecordNotifications", label: "レコード条件通知", endpoint: "/app/notifications/perRecord.json", put: true, putBuilder: (d) => ({ notifications: d.notifications || d }) },
        { key: "reminderNotifications", label: "リマインダー通知", endpoint: "/app/notifications/reminder.json", put: true, putBuilder: (d) => ({ notifications: d.notifications || d }) },
        { key: "categories", label: "カテゴリ設定", endpoint: "/app/categories.json", put: true, putBuilder: (d) => ({ categories: d.categories || d }) }
      ];
      SETTINGS_EXPORT_SCOPE_DEFS = SECTION_DEFS;
      META_KEYS = /* @__PURE__ */ new Set(["revision", "creator", "createdAt", "modifier", "modifiedAt"]);
      DEFAULT_SUBTAB_STATE = Object.freeze({
        diff: "conditions",
        reflect: "settings",
        field: "json",
        jsconfig: "editor",
        recordMgr: "status",
        er: "diagram",
        settingsExport: "export",
        analyze: "fieldImpact"
      });
      GUIDED_TOUR_STEPS = Object.freeze([
        {
          tab: "diff",
          diffSubTab: "conditions",
          path: "ヘッダー > 比較条件",
          selector: "#u_sourceApp",
          title: "1. 比較元 / 比較先を決める",
          body: "上部の接続パネルで比較元・比較先のアプリIDとゲストIDを入力します。次のステップのプリセットで、それぞれ本番APIとプレビューAPIのどちらから設定を読むかを決めます。"
        },
        {
          tab: "diff",
          diffSubTab: "conditions",
          path: "ヘッダー > 比較条件",
          selector: '[data-act="openDiffScopePicker"]',
          title: "3. 比較対象セクションを選ぶ",
          body: "「比較対象を選ぶ」からポップアップを開き、差分比較で確認したい設定だけを選びます。まずはフィールド、レイアウト、ビュー、プロセス管理あたりから始めるのが見やすいです。"
        },
        {
          tab: "diff",
          diffSubTab: "conditions",
          path: "ヘッダー > 比較条件",
          selector: "#u_ignoreKeyInput",
          title: "4. ノイズ差分を減らす",
          body: "無視キーや正規化プリセットを使うと、順序違い・メタ情報の差分を抑えられます。比較が荒れるときはここを先に調整します。"
        },
        {
          tab: "diff",
          diffSubTab: "conditions",
          path: "ヘッダー > 比較条件",
          selector: "#u_runDiffPrimary",
          title: "5. 差分比較を実行する",
          body: "条件が決まったら差分比較を実行します。必要ならこのまま JSON / HTML / Excel / パッチJSON として保存できます。"
        },
        {
          tab: "diff",
          diffSubTab: "conditions",
          path: "ヘッダー > 差分結果の整理",
          selector: "#u_diffSearch",
          title: "6. 結果を絞り込んで確認する",
          body: "差分比較後は「差分結果の整理・出力」を開くと、セクション、種別、重要度、検索で絞り込めます。ここで反映対象を見極めてから次のステップへ進みます。"
        },
        {
          tab: "reflect",
          path: "プレビュー反映",
          selector: "#u_footerPlan",
          title: "7. 反映プランを先に確認する",
          body: "画面下の固定バーから「実行前プラン確認」を押し、API リクエスト内容や対象セクションを確認します。要約はメイン欄のプラン欄にも表示されます。"
        },
        {
          tab: "reflect",
          path: "プレビュー反映",
          selector: "#u_footerApply",
          title: "8. 比較先プレビューへ反映する",
          body: "固定バーの「プレビューへ反映」で比較先プレビューへ書き込みます。本番へのデプロイはkintone管理画面から手動で行います（ツールからのデプロイAPIは無効です）。"
        },
        {
          tab: "design",
          subTab: "export",
          path: "設計書 > 設計書出力",
          selector: '[data-act="exportDesignMd"]',
          title: "9. 最後に記録を残す",
          body: "作業後は設計書や差分レポートを出力して、変更内容を残します。複数アプリをまとめて保存したい場合は「設定一括取得」も使えます。"
        }
      ]);
    }
  });

  // src/state.js
  var state;
  var init_state = __esm({
    "src/state.js"() {
      "use strict";
      init_constants();
      state = {
        activeTab: "reflect",
        activeFeatureKey: "",
        activeSubTabs: { ...DEFAULT_SUBTAB_STATE },
        launcherSortMode: "onboarding",
        lastSourceBundle: null,
        lastTargetBundle: null,
        lastDiffRows: [],
        lastFetchIssues: [],
        lastDiffAt: null,
        lastDiffSignature: "",
        lastApplyPlan: null,
        lastApplyCompletedAt: null,
        lastApplyCompletedMode: "",
        lastApplyCompletedHadError: false,
        lastApplyCompletedAppId: "",
        lastPreviewBackupPayload: null,
        lastPreviewBackupFilename: "",
        diffViewTheme: "light",
        diffCollapsedSections: /* @__PURE__ */ new Set(),
        diffSectionVisibleCounts: {},
        diffSelectedIds: /* @__PURE__ */ new Set(),
        diffFavoritePaths: /* @__PURE__ */ new Set(),
        diffFavoritesOnly: false,
        diffViewedKeys: /* @__PURE__ */ new Set(),
        diffHideViewed: false,
        diffFocusedRowId: "",
        diffExcludeSections: null,
        diffSelectionAnchorId: "",
        diffIncludeSame: true,
        diffFilterSection: "",
        diffFilterType: "",
        diffFilterSeverity: "",
        diffFilterTableOnly: false,
        diffFilterTableKeyword: "",
        diffSearchFieldName: false,
        diffExportMode: "all",
        diffExportContent: "diffOnly",
        diffIgnoreSuggestions: [],
        reflectRows: [],
        reflectSelectedIds: /* @__PURE__ */ new Set(),
        reflectNodeModes: {},
        reflectUndoStack: [],
        reflectRedoStack: [],
        reflectPropertyFilters: /* @__PURE__ */ new Set(),
        reflectPropertyPanelOpen: false,
        reflectActiveSidebarSection: null,
        reflectActiveNodeId: "",
        reflectDetailTab: "diff",
        importedSourceBundle: null,
        importedTargetBundle: null,
        importedSourceName: "",
        importedTargetName: "",
        patchJsonPanelOpen: false,
        importedPatchPayload: null,
        guidedTourActive: false,
        guidedTourIndex: 0,
        running: false
      };
    }
  });

  // src/utils.js
  function esc(s) {
    return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function normalize(v) {
    if (Array.isArray(v)) return v.map(normalize);
    if (v && typeof v === "object") {
      const o = {};
      Object.keys(v).sort().forEach((k) => {
        if (META_KEYS.has(k)) return;
        o[k] = normalize(v[k]);
      });
      return o;
    }
    return v;
  }
  function compactForLog(value, max = 220) {
    try {
      const raw = typeof value === "string" ? value : JSON.stringify(value);
      if (!raw) return "";
      return raw.length > max ? `${raw.slice(0, max)}...` : raw;
    } catch (e) {
      const raw = String(value ?? "");
      return raw.length > max ? `${raw.slice(0, max)}...` : raw;
    }
  }
  function apiErrorWithContext(err, meta) {
    if (err && err.__apiDiag) return err;
    const method = meta?.method || "GET";
    const prefix = meta?.prefix || "";
    const path = meta?.path || "";
    const bodyOrParams = meta?.payload;
    const app = bodyOrParams?.app ?? bodyOrParams?.id ?? bodyOrParams?.apps?.[0] ?? "";
    const bodySummary = compactForLog(bodyOrParams);
    const endpoint = `${prefix}${path}`;
    const contextLine = `[API] ${method} ${endpoint}${app ? ` app=${app}` : ""}${bodySummary ? ` payload=${bodySummary}` : ""}`;
    const baseMessage = err?.message || String(err);
    const wrapped = new Error(`${baseMessage}
${contextLine}`);
    wrapped.__apiDiag = true;
    wrapped.original = err;
    if (err?.code) wrapped.code = err.code;
    if (err?.id) wrapped.id = err.id;
    if (err?.stack) wrapped.stack = err.stack;
    return wrapped;
  }
  function nowStamp() {
    const d = /* @__PURE__ */ new Date();
    const p = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}`;
  }
  function downloadText(filename, text, type) {
    const blob = new Blob([text], { type: type || "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  }
  function downloadBlob(filename, blob) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  }
  function selectedScopeKeys(container) {
    return [...container.querySelectorAll('input[type="checkbox"]:checked')].map((x) => x.value);
  }
  var init_utils = __esm({
    "src/utils.js"() {
      "use strict";
      init_constants();
    }
  });

  // src/diff/engine.js
  var init_engine = __esm({
    "src/diff/engine.js"() {
      "use strict";
      init_constants();
      init_state();
      init_utils();
    }
  });

  // src/api.js
  function buildApiPrefix(guestId, preview) {
    const g = String(guestId || "").trim();
    if (g) return `/k/guest/${g}/v1${preview ? "/preview" : ""}`;
    return `/k/v1${preview ? "/preview" : ""}`;
  }
  function normalizeApiGetOptions(optionsOrRetries) {
    if (typeof optionsOrRetries === "number") return { retries: optionsOrRetries };
    if (!optionsOrRetries || typeof optionsOrRetries !== "object") return {};
    return optionsOrRetries;
  }
  function resolveHttpStatus(error) {
    const direct = Number(error?.status ?? error?.statusCode ?? error?.response?.status);
    if (Number.isFinite(direct) && direct > 0) return direct;
    const text = String(error?.message || "");
    const matched = text.match(/\b([45]\d{2})\b/);
    return matched ? Number(matched[1]) : 0;
  }
  function isRetriableApiError(error) {
    if (!error) return false;
    const status = resolveHttpStatus(error);
    if (RETRIABLE_STATUS_CODES.has(status)) return true;
    const code = String(error?.code || "").toUpperCase();
    if (code && (code.includes("NETWORK") || code.includes("TIMEOUT") || code === "ECONNRESET")) return true;
    const message = String(error?.message || "").toLowerCase();
    return message.includes("network") || message.includes("timeout");
  }
  function computeRetryDelayMs(attempt, baseDelayMs, maxDelayMs) {
    const expDelay = Math.min(maxDelayMs, baseDelayMs * 2 ** attempt);
    const jitter = Math.random() * Math.min(200, baseDelayMs);
    return Math.round(expDelay + jitter);
  }
  function touchApiPathMetric(path, field) {
    const key = String(path || "");
    const row2 = apiGetMetrics.byPath[key] || { calls: 0, retries: 0, failures: 0, lastError: "" };
    row2[field] += 1;
    apiGetMetrics.byPath[key] = row2;
    return row2;
  }
  async function apiGet(prefix, path, params, optionsOrRetries) {
    const options = normalizeApiGetOptions(optionsOrRetries);
    const retries = Number.isFinite(options.retries) ? Math.max(1, Number(options.retries)) : DEFAULT_API_GET_RETRIES;
    const baseDelayMs = Number.isFinite(options.baseDelayMs) ? Math.max(1, Number(options.baseDelayMs)) : DEFAULT_RETRY_BASE_DELAY_MS;
    const maxDelayMs = Number.isFinite(options.maxDelayMs) ? Math.max(baseDelayMs, Number(options.maxDelayMs)) : DEFAULT_RETRY_MAX_DELAY_MS;
    let err;
    const startAt = Date.now();
    apiGetMetrics.calls += 1;
    touchApiPathMetric(path, "calls");
    for (let i = 0; i < retries; i++) {
      try {
        const res = await kintone.api(`${prefix}${path}`, "GET", params);
        apiGetMetrics.lastLatencyMs = Date.now() - startAt;
        apiGetMetrics.lastError = "";
        return res;
      } catch (e) {
        err = e;
        const retriable = isRetriableApiError(e);
        if (i < retries - 1 && retriable) {
          apiGetMetrics.retries += 1;
          touchApiPathMetric(path, "retries");
          const waitMs = computeRetryDelayMs(i, baseDelayMs, maxDelayMs);
          await new Promise((r) => setTimeout(r, waitMs));
          continue;
        }
        break;
      }
    }
    apiGetMetrics.failures += 1;
    const pathMetric = touchApiPathMetric(path, "failures");
    const lastError = err?.message || String(err);
    pathMetric.lastError = lastError;
    apiGetMetrics.lastError = lastError;
    apiGetMetrics.lastLatencyMs = Date.now() - startAt;
    throw apiErrorWithContext(err, { method: "GET", prefix, path, payload: params });
  }
  function extractSectionRevision(res) {
    if (!res || typeof res !== "object") return "";
    const candidates = [res.revision, res.appRevision, res.revisionNo, res.app?.revision];
    for (const value of candidates) {
      if (value == null || value === "") continue;
      return String(value);
    }
    return "";
  }
  async function fetchBundle({ appId, guestId, preview, sections, onProgress }) {
    const prefix = buildApiPrefix(guestId, preview);
    const app = String(appId || "").trim();
    if (!app) throw new Error("アプリIDが必要です");
    const bundle = {
      appId: app,
      guestId: String(guestId || "").trim(),
      preview: !!preview,
      fetchedAt: (/* @__PURE__ */ new Date()).toISOString(),
      meta: { sectionRevisions: {} },
      sections: {}
    };
    for (let i = 0; i < sections.length; i++) {
      const sec = sections[i];
      const def = SECTION_DEFS.find((x) => x.key === sec);
      if (!def) continue;
      try {
        const res = await apiGet(prefix, def.endpoint, { app });
        const revision = extractSectionRevision(res);
        if (revision) bundle.meta.sectionRevisions[sec] = revision;
        bundle.sections[sec] = normalize(res);
      } catch (e) {
        bundle.sections[sec] = { _fetchError: e.message || String(e) };
      }
      if (onProgress) onProgress((i + 1) / sections.length, def.label);
    }
    return bundle;
  }
  var DEFAULT_API_GET_RETRIES, DEFAULT_RETRY_BASE_DELAY_MS, DEFAULT_RETRY_MAX_DELAY_MS, RETRIABLE_STATUS_CODES, apiGetMetrics;
  var init_api = __esm({
    "src/api.js"() {
      "use strict";
      init_constants();
      init_utils();
      init_state();
      DEFAULT_API_GET_RETRIES = 3;
      DEFAULT_RETRY_BASE_DELAY_MS = 500;
      DEFAULT_RETRY_MAX_DELAY_MS = 3e3;
      RETRIABLE_STATUS_CODES = /* @__PURE__ */ new Set([408, 409, 425, 429, 500, 502, 503, 504]);
      apiGetMetrics = {
        calls: 0,
        retries: 0,
        failures: 0,
        lastLatencyMs: 0,
        lastError: "",
        byPath: {}
      };
    }
  });

  // src/diff/enrich.js
  var init_enrich = __esm({
    "src/diff/enrich.js"() {
      "use strict";
      init_constants();
      init_state();
      init_utils();
      init_engine();
    }
  });

  // src/diff/export.js
  var init_export = __esm({
    "src/diff/export.js"() {
      init_constants();
      init_utils();
      init_state();
      init_engine();
      init_enrich();
      init_filter();
      init_api();
    }
  });

  // src/diff/filter.js
  var init_filter = __esm({
    "src/diff/filter.js"() {
      "use strict";
      init_constants();
      init_state();
      init_engine();
      init_api();
      init_export();
    }
  });

  // src/reflect/nodeModeUi.js
  var init_nodeModeUi = __esm({
    "src/reflect/nodeModeUi.js"() {
      "use strict";
      init_state();
    }
  });

  // src/ui/dialog.js
  function setRootElement(el) {
    root = el;
  }
  var root;
  var init_dialog = __esm({
    "src/ui/dialog.js"() {
      "use strict";
      init_constants();
      init_state();
      init_utils();
      root = null;
    }
  });

  // src/oss_integrations.js
  var init_oss_integrations = __esm({
    "src/oss_integrations.js"() {
      "use strict";
      init_utils();
    }
  });

  // src/ui/components.js
  function setComponentUi(uiRefs) {
    ui2 = uiRefs;
  }
  function setStatus(msg, isError) {
    if (!ui2.status) return;
    ui2.status.textContent = msg;
    ui2.status.style.background = "";
    ui2.status.style.color = "";
    ui2.status.classList.remove("status--neutral", "status--error");
    ui2.status.classList.add(isError ? "status--error" : "status--neutral");
    const bar = ui2.status.closest?.(".status-bar");
    if (bar) bar.classList.toggle("status-bar--error", !!isError);
  }
  var ui2, SCOPE_PICKER_META;
  var init_components = __esm({
    "src/ui/components.js"() {
      "use strict";
      init_constants();
      init_state();
      init_utils();
      init_filter();
      init_engine();
      init_enrich();
      init_nodeModeUi();
      init_dialog();
      init_oss_integrations();
      ui2 = {};
      SCOPE_PICKER_META = Object.freeze({
        diff: Object.freeze({
          title: "比較対象セクション",
          sub: "差分比較で取得する API 設定を選びます。"
        }),
        reflect: Object.freeze({
          title: "反映するセクション",
          sub: "プレビュー反映でまとめて適用するセクションを選びます。"
        }),
        settingsExport: Object.freeze({
          title: "取得対象セクション",
          sub: "設定一括取得で保存する API 設定を、JS/CSS設定も含めて選びます。"
        })
      });
    }
  });

  // src/tabs/preview-compare.js
  var init_preview_compare = __esm({
    "src/tabs/preview-compare.js"() {
      "use strict";
    }
  });

  // src/tabs/diff.js
  var init_diff = __esm({
    "src/tabs/diff.js"() {
      "use strict";
      init_constants();
      init_state();
      init_utils();
      init_api();
      init_engine();
      init_enrich();
      init_filter();
      init_export();
      init_export();
      init_components();
      init_dialog();
      init_preview_compare();
      init_nodeModeUi();
    }
  });

  // src/entries/settings-export-lite-ui.js
  init_constants();
  init_components();

  // src/tabs/settings-export-standalone.js
  init_constants();
  init_utils();
  init_api();

  // src/tabs/record.js
  init_constants();
  init_state();
  init_utils();
  init_api();
  init_components();
  init_diff();
  init_dialog();
  async function loadJSZip() {
    if (typeof globalThis.JSZip !== "undefined") return globalThis.JSZip;
    setStatus("JSZipを動的ロード中...");
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = EXTERNAL_LIBRARIES.jszip.cdnUrl;
      script.onload = () => {
        if (typeof globalThis.JSZip === "undefined") {
          reject(new Error("JSZipのロード後もグローバル変数が見つかりません"));
          return;
        }
        setStatus("JSZipのロード完了");
        resolve(globalThis.JSZip);
      };
      script.onerror = () => {
        reject(new Error("JSZipの読み込みに失敗しました"));
      };
      document.head.appendChild(script);
    });
  }

  // src/tabs/settings-export-standalone.js
  function parseAppIdList(text) {
    const tokens = String(text || "").split(/[\s,]+/).map((s) => s.trim()).filter(Boolean);
    const out = [];
    const seen = /* @__PURE__ */ new Set();
    for (const tk of tokens) {
      if (!/^\d+$/.test(tk)) continue;
      if (seen.has(tk)) continue;
      seen.add(tk);
      out.push(tk);
    }
    return out;
  }
  function renderSettingsExportSummaryHtml(rows, scopes) {
    const labels = scopes.map((k) => SECTION_DEFS.find((s) => s.key === k)?.label || k).join(", ");
    const body = rows.map(
      (r) => `<tr>
    <td>${esc(r.appId)}</td>
    <td>${esc(String(r.okCount))}</td>
    <td>${esc(String(r.ngCount))}</td>
    <td>${esc(r.note || "-")}</td>
  </tr>`
    ).join("");
    return `
    <div style="padding:8px 10px;border-bottom:1px solid #e2e8f0;font-size:11px;background:#f8fafc">対象セクション: ${esc(labels || "-")}</div>
    <table style="width:100%;font-size:11px;border-collapse:collapse">
      <thead><tr><th style="text-align:left;padding:4px">アプリID</th><th>取得OK</th><th>取得NG</th><th>メモ</th></tr></thead>
      <tbody>${body || '<tr><td colspan="4">結果なし</td></tr>'}</tbody>
    </table>
  `;
  }
  function renderSettingsExportSearchResultsHtml(apps) {
    const list = Array.isArray(apps) ? apps : [];
    if (!list.length) {
      return '<div style="padding:10px;font-size:12px;color:#64748b">検索結果なし</div>';
    }
    const rows = list.map(
      (app) => `<tr>
    <td>${esc(String(app.appId || ""))}</td>
    <td title="${esc(String(app.name || ""))}">${esc(String(app.name || ""))}</td>
    <td style="text-align:right"><button type="button" class="kus-se-add" data-app="${esc(String(app.appId || ""))}" data-name="${esc(String(app.name || ""))}" style="padding:4px 8px;font-size:10px;border:1px solid #e2e8f0;border-radius:4px;background:#f8fafc;cursor:pointer">追加</button></td>
  </tr>`
    ).join("");
    return `<table style="width:100%;font-size:11px;border-collapse:collapse">
    <thead><tr><th style="width:90px">アプリID</th><th>アプリ名</th><th style="width:70px"></th></tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
  }
  async function runSettingsExportSearchStandalone(keyword, guestId, setStatus2) {
    const kw = String(keyword || "").trim();
    const guest = String(guestId || "").trim();
    const prefix = buildApiPrefix(guest, false);
    const params = { limit: 100 };
    if (kw) params.name = kw;
    setStatus2("アプリ検索中...");
    const res = await apiGet(prefix, "/apps.json", params);
    const apps = (res.apps || []).map((a) => ({ appId: String(a.appId || ""), name: String(a.name || "") })).filter((a) => /^\d+$/.test(a.appId)).sort((a, b) => Number(a.appId) - Number(b.appId));
    setStatus2(`アプリ検索完了: ${apps.length}件`);
    return apps;
  }
  async function runSettingsExportStandalone(mode, opts, setStatus2) {
    const appIds = parseAppIdList(opts.appIdsText);
    if (!appIds.length) throw new Error("対象アプリIDを1件以上入力してください");
    const scopes = selectedScopeKeys(opts.scopeRoot);
    if (!scopes.length) throw new Error("取得対象セクションを選択してください");
    const guestId = String(opts.guestId || "").trim();
    const preview = !!opts.preview;
    const bundles = [];
    const rows = [];
    for (let i = 0; i < appIds.length; i++) {
      const appId = appIds[i];
      setStatus2(`設定取得中 ${i + 1}/${appIds.length}: アプリ ${appId}`);
      const bundle = await fetchBundle({
        appId,
        guestId,
        preview,
        sections: scopes,
        onProgress: (p, l) => setStatus2(`設定取得中 ${i + 1}/${appIds.length}: アプリ ${appId} ${Math.round(p * 100)}% (${l})`)
      });
      bundles.push(bundle);
      let okCount = 0;
      let ngCount = 0;
      for (const key of scopes) {
        const sec = bundle.sections[key];
        if (sec && sec._fetchError) ngCount += 1;
        else okCount += 1;
      }
      rows.push({ appId, okCount, ngCount, note: ngCount ? "一部セクション取得失敗あり" : "OK" });
    }
    const scopeLabels = scopes.map((k) => SECTION_DEFS.find((s) => s.key === k)?.label || k);
    const payload = {
      generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
      guestId: guestId || "",
      preview,
      scopes,
      scopeLabels,
      apps: bundles
    };
    if (mode === "zip") {
      const JSZipCtor = await loadJSZip();
      const zip = new JSZipCtor();
      zip.file(
        "manifest.json",
        JSON.stringify(
          {
            generatedAt: payload.generatedAt,
            guestId: payload.guestId,
            preview: payload.preview,
            scopes: payload.scopes,
            appCount: bundles.length
          },
          null,
          2
        )
      );
      for (const bundle of bundles) {
        const suffix = `${guestId ? `_guest_${guestId}` : ""}${preview ? "_preview" : "_live"}`;
        const name = `app_${bundle.appId}${suffix}.json`;
        zip.file(name, JSON.stringify(bundle, null, 2));
      }
      const zipBlob = await zip.generateAsync({ type: "blob" });
      downloadBlob(`settings_export_${bundles.length}apps_${nowStamp()}.zip`, zipBlob);
      setStatus2(`設定一括取得ZIPを保存しました（${bundles.length} apps）`);
      return { summaryHtml: renderSettingsExportSummaryHtml(rows, scopes) };
    }
    downloadText(`settings_export_${bundles.length}apps_${nowStamp()}.json`, JSON.stringify(payload, null, 2), "application/json");
    setStatus2(`設定一括取得JSONを保存しました（${bundles.length}アプリ）`);
    return { summaryHtml: renderSettingsExportSummaryHtml(rows, scopes) };
  }

  // src/entries/liteMount.js
  init_components();
  init_dialog();
  var PANEL_STYLE = "position:fixed;z-index:999999;top:max(16px,2vh);right:max(16px,2vw);width:min(440px,94vw);max-height:min(92vh,880px);overflow:hidden;display:flex;flex-direction:column;background:#fff;border:1px solid #e2e8f0;border-radius:14px;box-shadow:0 12px 40px rgba(15,23,42,.2);font:12px/1.5 system-ui,sans-serif;";
  function mountKusLitePanel(opts) {
    const { id, title, note } = opts;
    const old = document.getElementById(id);
    if (old) old.remove();
    const root2 = document.createElement("div");
    root2.id = id;
    root2.style.cssText = PANEL_STYLE;
    const head = document.createElement("div");
    head.style.cssText = "flex-shrink:0;display:flex;align-items:center;justify-content:space-between;gap:8px;padding:12px 14px;background:linear-gradient(125deg,#1d4ed8,#2563eb);color:#fff";
    const t = document.createElement("div");
    t.textContent = title;
    t.style.cssText = "font-weight:700;font-size:14px";
    const close = document.createElement("button");
    close.type = "button";
    close.textContent = "閉じる";
    close.style.cssText = "padding:5px 10px;font-size:11px;border:1px solid rgba(255,255,255,.5);border-radius:8px;background:rgba(255,255,255,.15);color:#fff;cursor:pointer;font-weight:600";
    close.addEventListener("click", () => {
      root2.remove();
      setRootElement(null);
    });
    head.appendChild(t);
    head.appendChild(close);
    root2.appendChild(head);
    const scroll = document.createElement("div");
    scroll.style.cssText = "padding:12px 14px 14px;overflow-y:auto;flex:1;min-height:0";
    if (note) {
      const n = document.createElement("div");
      n.style.cssText = "color:#64748b;font-size:11px;line-height:1.5;margin-bottom:10px;padding:8px 10px;background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0";
      n.textContent = note;
      scroll.appendChild(n);
    }
    const status = document.createElement("div");
    status.style.cssText = "padding:8px 10px;font-size:11px;background:#f1f5f9;border-radius:8px;margin-bottom:8px;min-height:1.2em;color:#0f172a";
    const bodySlot = document.createElement("div");
    scroll.appendChild(status);
    scroll.appendChild(bodySlot);
    const result = document.createElement("div");
    result.style.cssText = "margin-top:8px;max-height:180px;overflow:auto;font-size:11px;border:1px solid #e2e8f0;border-radius:8px;background:#fafafa;display:none";
    scroll.appendChild(result);
    const busyText = document.createElement("span");
    setComponentUi({ status, result, busyText });
    setRootElement(root2);
    root2.appendChild(scroll);
    document.body.appendChild(root2);
    return { root: root2, status, bodySlot, result };
  }

  // src/entries/settings-export-lite-ui.js
  function row(labelText, child) {
    const wrap = document.createElement("div");
    wrap.style.cssText = "margin-bottom:10px";
    if (labelText) {
      const lab = document.createElement("div");
      lab.style.cssText = "font-size:11px;font-weight:700;color:#475569;margin-bottom:4px";
      lab.textContent = labelText;
      wrap.appendChild(lab);
    }
    wrap.appendChild(child);
    return wrap;
  }
  function mountSettingsExportLitePanel() {
    const { bodySlot, result } = mountKusLitePanel({
      id: "kus-settings-export-lite",
      title: "設定一括取得",
      note: "複数アプリの設定を JSON または ZIP で保存します。統合ツール.js は不要です。"
    });
    const appTa = document.createElement("textarea");
    appTa.rows = 3;
    appTa.placeholder = "アプリID（カンマ・改行区切り）";
    appTa.style.cssText = "width:100%;box-sizing:border-box;padding:8px 10px;border:1px solid #e2e8f0;border-radius:8px;font-size:12px;resize:vertical";
    const searchKw = document.createElement("input");
    searchKw.type = "text";
    searchKw.placeholder = "アプリ名の一部";
    searchKw.style.cssText = "flex:1;min-width:120px;padding:6px 10px;border:1px solid #e2e8f0;border-radius:8px;font-size:12px";
    const searchRow = document.createElement("div");
    searchRow.style.cssText = "display:flex;gap:8px;flex-wrap:wrap;align-items:center";
    const searchBtn = document.createElement("button");
    searchBtn.type = "button";
    searchBtn.textContent = "検索";
    searchBtn.style.cssText = "padding:6px 12px;font-size:12px;font-weight:600;border:1px solid #cbd5e1;border-radius:8px;background:#f8fafc;cursor:pointer";
    searchRow.appendChild(searchKw);
    searchRow.appendChild(searchBtn);
    const searchOut = document.createElement("div");
    searchOut.style.cssText = "max-height:140px;overflow:auto;border:1px solid #e2e8f0;border-radius:8px;margin-top:6px;background:#fff";
    const guestInp = document.createElement("input");
    guestInp.type = "text";
    guestInp.placeholder = "ゲストID（任意）";
    guestInp.style.cssText = "width:min(140px,44vw);padding:6px 10px;border:1px solid #e2e8f0;border-radius:8px;font-size:12px";
    const prev = document.createElement("label");
    prev.style.cssText = "font-size:12px;color:#475569;display:inline-flex;align-items:center;gap:6px;cursor:pointer";
    const prevCb = document.createElement("input");
    prevCb.type = "checkbox";
    prev.appendChild(prevCb);
    prev.appendChild(document.createTextNode("プレビュー"));
    const scopeRoot = document.createElement("div");
    scopeRoot.style.cssText = "display:flex;flex-wrap:wrap;gap:6px 10px;padding:8px 0";
    for (const s of SETTINGS_EXPORT_SCOPE_DEFS) {
      const lab = document.createElement("label");
      lab.style.cssText = "font-size:11px;color:#334155;display:inline-flex;align-items:center;gap:4px;cursor:pointer";
      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.value = s.key;
      cb.checked = true;
      lab.appendChild(cb);
      lab.appendChild(document.createTextNode(s.label));
      scopeRoot.appendChild(lab);
    }
    const scopeActions = document.createElement("div");
    scopeActions.style.cssText = "display:flex;gap:8px;flex-wrap:wrap;margin:4px 0 8px";
    const selectAllBtn = document.createElement("button");
    selectAllBtn.type = "button";
    selectAllBtn.textContent = "全選択";
    selectAllBtn.style.cssText = "padding:6px 12px;font-size:12px;font-weight:600;border:1px solid #cbd5e1;border-radius:8px;background:#f8fafc;cursor:pointer";
    const clearAllBtn = document.createElement("button");
    clearAllBtn.type = "button";
    clearAllBtn.textContent = "全解除";
    clearAllBtn.style.cssText = "padding:6px 12px;font-size:12px;font-weight:600;border:1px solid #cbd5e1;border-radius:8px;background:#fff;cursor:pointer";
    scopeActions.appendChild(selectAllBtn);
    scopeActions.appendChild(clearAllBtn);
    const btnJson = document.createElement("button");
    btnJson.type = "button";
    btnJson.textContent = "JSON で保存";
    btnJson.style.cssText = "width:100%;margin-top:8px;padding:10px 14px;font-size:13px;font-weight:700;border:none;border-radius:10px;background:linear-gradient(180deg,#3b82f6,#2563eb);color:#fff;cursor:pointer";
    const btnZip = document.createElement("button");
    btnZip.type = "button";
    btnZip.textContent = "ZIP で保存";
    btnZip.style.cssText = "width:100%;margin-top:8px;padding:10px 14px;font-size:13px;font-weight:700;border:none;border-radius:10px;background:linear-gradient(180deg,#64748b,#475569);color:#fff;cursor:pointer";
    bodySlot.appendChild(row("対象アプリID", appTa));
    bodySlot.appendChild(row("アプリ検索", searchRow));
    bodySlot.appendChild(searchOut);
    bodySlot.appendChild(row("ゲスト / 環境", (() => {
      const w = document.createElement("div");
      w.style.cssText = "display:flex;flex-wrap:wrap;gap:10px;align-items:center";
      w.appendChild(guestInp);
      w.appendChild(prev);
      return w;
    })()));
    bodySlot.appendChild(row("取得セクション", (() => {
      const w = document.createElement("div");
      w.appendChild(scopeActions);
      w.appendChild(scopeRoot);
      return w;
    })()));
    bodySlot.appendChild(btnJson);
    bodySlot.appendChild(btnZip);
    function opts() {
      return {
        appIdsText: appTa.value,
        guestId: guestInp.value.trim(),
        preview: prevCb.checked,
        scopeRoot
      };
    }
    searchBtn.addEventListener("click", async () => {
      try {
        const apps = await runSettingsExportSearchStandalone(
          searchKw.value,
          guestInp.value.trim(),
          (m, e) => setStatus(m, e)
        );
        searchOut.innerHTML = renderSettingsExportSearchResultsHtml(apps);
      } catch (e) {
        setStatus(e.message || String(e), true);
      }
    });
    searchOut.addEventListener("click", (ev) => {
      const t = ev.target;
      if (!(t instanceof HTMLElement)) return;
      const btn = t.closest(".kus-se-add");
      if (!btn) return;
      const id = btn.getAttribute("data-app");
      if (!id) return;
      const cur = appTa.value.trim();
      const next = cur ? `${cur}
${id}` : id;
      appTa.value = next;
    });
    selectAllBtn.addEventListener("click", () => {
      scopeRoot.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
        cb.checked = true;
      });
    });
    clearAllBtn.addEventListener("click", () => {
      scopeRoot.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
        cb.checked = false;
      });
    });
    btnJson.addEventListener("click", async () => {
      try {
        result.style.display = "block";
        const { summaryHtml } = await runSettingsExportStandalone("json", opts(), (m, e) => setStatus(m, e));
        result.innerHTML = summaryHtml;
      } catch (e) {
        setStatus(e.message || String(e), true);
      }
    });
    btnZip.addEventListener("click", async () => {
      try {
        result.style.display = "block";
        const { summaryHtml } = await runSettingsExportStandalone("zip", opts(), (m, e) => setStatus(m, e));
        result.innerHTML = summaryHtml;
      } catch (e) {
        setStatus(e.message || String(e), true);
      }
    });
  }

  // src/entries/settings-export-lite-entry.js
  if (!window.kintone?.api || !window.kintone?.app) {
    alert("kintone画面で実行してください");
  } else {
    mountSettingsExportLitePanel();
  }
})();
