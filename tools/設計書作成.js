// ==========================================================================
// 設計書作成.js  —  自動生成ファイル（手編集禁止）
// ==========================================================================
// このファイルは tools/統合ツール/ の npm run build (esbuild) で生成されます。
// ソース: tools/統合ツール/src/entries/design-lite-entry.js
//         tools/統合ツール/src/tabs/design.js  ← 機能の正規実装
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
  var TOOL_ID, EXTERNAL_LIBRARIES, DEFAULT_APP_ID, DIALOG_STATE_KEY, DIFF_SELECTION_SETS_KEY, DIFF_ONBOARDING_DISMISSED_KEY, REFLECT_PRESETS_KEY, SECTION_DEFS, META_KEYS, DEFAULT_SUBTAB_STATE, GUIDED_TOUR_STEPS;
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
  function loadReflectApplyHistory() {
    try {
      const raw = sessionStorage.getItem(REFLECT_APPLY_HISTORY_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  var state, REFLECT_APPLY_HISTORY_KEY;
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
        lastApplyReport: null,
        reflectApplyHistory: [],
        reflectApplyHistoryOpen: false,
        reflectPlanPreviewKeyword: "",
        reflectPlanPreviewChangedOnly: false,
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
      REFLECT_APPLY_HISTORY_KEY = `${TOOL_ID}:reflectApplyHistory`;
      state.reflectApplyHistory = loadReflectApplyHistory();
    }
  });

  // src/utils.js
  function getToolWindowSafe() {
    try {
      const popWin = window.__KUS_TOOL_WINDOW__;
      if (popWin && !popWin.closed && popWin.document) return popWin;
    } catch (e) {
    }
    return window;
  }
  function getToolDocumentSafe() {
    try {
      return getToolWindowSafe().document || document;
    } catch (e) {
      return document;
    }
  }
  function getToolRootSafe() {
    try {
      const doc = getToolDocumentSafe();
      return doc.getElementById(TOOL_ID) || null;
    } catch (e) {
      return null;
    }
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
  async function showToast(message, type = "info") {
    try {
      const doc = getToolDocumentSafe();
      const win = getToolWindowSafe();
      const root2 = getToolRootSafe() || doc.body;
      if (!root2) {
        console.log(`[Toast ${type}] ${message}`);
        return;
      }
      let container = doc.getElementById("u_toastContainer");
      if (!container) {
        container = doc.createElement("div");
        container.id = "u_toastContainer";
        container.className = "kus-toast-container";
        root2.appendChild(container);
      }
      const toast = doc.createElement("div");
      toast.className = `kus-toast kus-toast--${type}`;
      toast.setAttribute("role", type === "error" || type === "warn" ? "alert" : "status");
      const msg = doc.createElement("span");
      msg.className = "kus-toast-msg";
      msg.textContent = String(message ?? "");
      toast.appendChild(msg);
      const closeBtn = doc.createElement("button");
      closeBtn.type = "button";
      closeBtn.className = "kus-toast-close";
      closeBtn.setAttribute("aria-label", "閉じる");
      closeBtn.textContent = "×";
      toast.appendChild(closeBtn);
      container.appendChild(toast);
      const duration = type === "error" ? 5e3 : 3e3;
      let dismissTimer = 0;
      const dismiss = () => {
        if (dismissTimer) {
          try {
            win.clearTimeout(dismissTimer);
          } catch (e) {
          }
          dismissTimer = 0;
        }
        toast.classList.add("kus-toast--leaving");
        try {
          win.setTimeout(() => {
            try {
              toast.remove();
            } catch (e) {
            }
          }, 220);
        } catch (e) {
          try {
            toast.remove();
          } catch (e2) {
          }
        }
      };
      closeBtn.addEventListener("click", dismiss);
      try {
        dismissTimer = win.setTimeout(dismiss, duration);
      } catch (e) {
      }
    } catch (err) {
      console.log(`[Toast ${type}] ${message}`);
    }
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
  function bundleToMarkdown(bundle) {
    const lines = [];
    lines.push("# kintone 設計書");
    lines.push("");
    lines.push(`- アプリID: ${bundle.appId}`);
    lines.push(`- ゲストスペースID: ${bundle.guestId || "(通常空間)"}`);
    lines.push(`- プレビュー取得: ${bundle.preview ? "はい" : "いいえ"}`);
    lines.push(`- 取得日時: ${bundle.fetchedAt}`);
    lines.push("");
    for (const def of SECTION_DEFS) {
      const sec = bundle.sections[def.key];
      if (!sec) continue;
      lines.push(`## ${def.label}`);
      lines.push("");
      lines.push("```json");
      lines.push(JSON.stringify(sec, null, 2));
      lines.push("```");
      lines.push("");
    }
    return lines.join("\n");
  }
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

  // src/ui/dialog.js
  function getToolDocument() {
    return root?.ownerDocument || document;
  }
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

  // src/entries/design-lite-ui.js
  init_constants();

  // src/ui/components.js
  init_constants();
  init_state();
  init_utils();
  init_filter();
  init_engine();
  init_enrich();

  // src/reflect/nodeModeUi.js
  init_state();

  // src/ui/components.js
  init_constants();
  init_dialog();

  // src/oss_integrations.js
  init_utils();

  // src/ui/components.js
  var ui2 = {};
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
  var SCOPE_PICKER_META = Object.freeze({
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

  // src/tabs/design-standalone.js
  init_constants();
  init_state();
  init_utils();
  init_api();
  init_export();

  // src/tabs/design-xlsx.js
  init_constants();
  init_dialog();
  init_utils();
  async function runAdvancedDesignExporter(params = {}) {
    const sourceAppId = Number(params.appId);
    if (!sourceAppId) throw new Error("有効な比較元アプリIDが指定されませんでした。");
    const sourceGuestId = String(params.guestId || "").trim();
    const CONFIG = {
      SHEETLIB_PRIMARY_URL: "https://cdn.jsdelivr.net/npm/xlsx-js-style@1.2.0/dist/xlsx.min.js",
      SHEETLIB_FALLBACK_URL: "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js",
      MAX_RETRIES: 3,
      RETRY_DELAY: 1e3,
      API_CONCURRENCY: 4,
      FONT_NAME: "Meiryo",
      STYLES: {
        ENABLE_BORDER: true,
        ENABLE_HEADER_FILL: true,
        ENABLE_ZEBRA: true,
        ENABLE_AUTOFILTER: true,
        FREEZE_HEADER: true,
        ENABLE_TITLE_STYLING: true,
        ENABLE_CONDITIONAL_FORMAT: true,
        ENABLE_OUTLINE: true
      },
      DEFAULT_COL_WIDTH: 12,
      MAX_COL_WIDTH: 80,
      MIN_COL_WIDTH: 8,
      COLORS: {
        HEADER_BG: "FF4A90E2",
        HEADER_TEXT: "FFFFFFFF",
        TITLE_BG: "FF2E5C8A",
        TITLE_TEXT: "FFFFFFFF",
        ZEBRA_EVEN: "FFF8F9FA",
        ZEBRA_ODD: "FFFFFFFF",
        BORDER: "FF666666",
        SECTION_BG: "FFECF0F1",
        REQUIRED_BG: "FFFFF2CC",
        WARNING_BG: "FFFFC000",
        SUCCESS_BG: "FFC6EFCE",
        DANGER_BG: "FFF8CBAD",
        INFO_BG: "FFD9E1F2",
        SUBTABLE_BG: "FFE8EAF6",
        DEPENDENCY_BG: "FFFCE4EC"
      },
      SANITIZE_LABEL_HTML_IN_LAYOUT: true
    };
    const FIELD_TYPE = {
      "LABEL": "ラベル",
      "HR": "罫線",
      "SPACER": "スペース",
      "GROUP": "グループ",
      "FILE": "添付ファイル",
      "LINK": "リンク",
      "REFERENCE_TABLE": "関連レコード一覧",
      "SINGLE_LINE_TEXT": "文字列(1行)",
      "MULTI_LINE_TEXT": "文字列(複数行)",
      "RICH_TEXT": "リッチエディター",
      "NUMBER": "数値",
      "CALC": "計算",
      "RADIO_BUTTON": "ラジオボタン",
      "CHECK_BOX": "チェックボックス",
      "DROP_DOWN": "ドロップダウン",
      "MULTI_SELECT": "複数選択",
      "DATE": "日付",
      "DATETIME": "日時",
      "TIME": "時刻",
      "USER_SELECT": "ユーザー選択",
      "ORGANIZATION_SELECT": "組織選択",
      "GROUP_SELECT": "グループ選択",
      "LOOKUP": "ルックアップ",
      "SUBTABLE": "テーブル",
      "RECORD_NUMBER": "レコード番号",
      "CREATOR": "作成者",
      "CREATED_TIME": "作成日時",
      "MODIFIER": "更新者",
      "UPDATED_TIME": "更新日時",
      "STATUS": "ステータス",
      "CATEGORY": "カテゴリー",
      "STATUS_ASSIGNEE": "作業者"
    };
    const SYSTEM_FIELDS = /* @__PURE__ */ new Set(["$id", "$revision", "status", "category", "assignee"]);
    class Semaphore {
      constructor(max) {
        this.max = max;
        this.current = 0;
        this.queue = [];
      }
      acquire() {
        return new Promise((resolve) => {
          if (this.current < this.max) {
            this.current++;
            resolve();
          } else this.queue.push(resolve);
        });
      }
      release() {
        this.current--;
        if (this.queue.length > 0) {
          this.current++;
          this.queue.shift()();
        }
      }
      async run(fn) {
        await this.acquire();
        try {
          return await fn();
        } finally {
          this.release();
        }
      }
    }
    const apiSemaphore = new Semaphore(CONFIG.API_CONCURRENCY);
    function getExporterOverlayZIndex() {
      const main = getToolDocument().getElementById(TOOL_ID);
      const raw = main ? Number(window.getComputedStyle(main).zIndex) : NaN;
      const base = Number.isFinite(raw) ? raw : 2147483646;
      return String(Math.min(2147483647, Math.max(2e9, base + 1)));
    }
    const UI = {
      id: "kintone-exporter-overlay",
      totalSteps: 0,
      currentStep: 0,
      failedAPIs: [],
      show(msg, totalSteps = 10) {
        UI.totalSteps = totalSteps;
        UI.currentStep = 0;
        UI.failedAPIs = [];
        const doc = getToolDocument();
        let el = doc.getElementById(UI.id);
        if (!el) {
          el = doc.createElement("div");
          el.id = UI.id;
          Object.assign(el.style, { position: "fixed", top: "0", left: "0", width: "100%", height: "100%", backgroundColor: "rgba(0,0,0,0.7)", zIndex: getExporterOverlayZIndex(), display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", color: "#fff", fontSize: "16px", fontFamily: '"Meiryo", sans-serif' });
          doc.body.appendChild(el);
        }
        el.style.zIndex = getExporterOverlayZIndex();
        el.innerHTML = `<div style="background:rgba(255,255,255,0.1);border-radius:12px;padding:32px 48px;text-align:center;min-width:400px;"><div style="font-size:20px;font-weight:bold;margin-bottom:16px;">📊 kintone 設計書エクスポーター v2.0</div><div id="kex-status" style="margin-bottom:12px;font-size:14px;color:#ccc;">${msg}</div><div style="background:rgba(255,255,255,0.2);border-radius:8px;height:24px;overflow:hidden;margin-bottom:8px;"><div id="kex-progress-bar" style="height:100%;width:0%;background:linear-gradient(90deg,#4A90E2,#7B68EE);border-radius:8px;transition:width 0.3s ease;"></div></div><div id="kex-percent" style="font-size:12px;color:#aaa;">0%</div><div id="kex-errors" style="font-size:11px;color:#f99;margin-top:8px;max-height:60px;overflow-y:auto;"></div></div>`;
      },
      update(msg, step) {
        if (step !== void 0) UI.currentStep = step;
        else UI.currentStep++;
        const pct = Math.min(100, Math.round(UI.currentStep / UI.totalSteps * 100));
        const doc = getToolDocument();
        const statusEl = doc.getElementById("kex-status");
        const barEl = doc.getElementById("kex-progress-bar");
        const pctEl = doc.getElementById("kex-percent");
        if (statusEl) statusEl.textContent = msg;
        if (barEl) barEl.style.width = `${pct}%`;
        if (pctEl) pctEl.textContent = `${pct}%`;
      },
      logError(apiName, error) {
        UI.failedAPIs.push({ name: apiName, error: error?.message || String(error) });
        const errEl = getToolDocument().getElementById("kex-errors");
        if (errEl) errEl.textContent = `⚠ ${UI.failedAPIs.length}件のAPI取得に失敗`;
      },
      hide() {
        const doc = getToolDocument();
        const el = doc.getElementById(UI.id);
        if (el) doc.body.removeChild(el);
      }
    };
    const UtilsX = {
      pad: (n) => n.toString().padStart(2, "0"),
      dt: (d = /* @__PURE__ */ new Date()) => {
        const p = UtilsX.pad;
        return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
      },
      toJST: (isoString) => {
        if (!isoString) return "-";
        try {
          return new Date(isoString).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" });
        } catch {
          return isoString;
        }
      },
      safeGet: (obj, path, def = "") => {
        try {
          if (!obj || typeof obj !== "object") return def;
          const v = path.split(".").reduce((o, k) => o && o[k] !== void 0 ? o[k] : void 0, obj);
          return v === void 0 ? def : v;
        } catch (e) {
          return def;
        }
      },
      ensureArray: (v) => Array.isArray(v) ? v : [],
      safeJoin: (arr, sep = "、") => Array.isArray(arr) ? arr.filter((v) => v !== "" && v != null).join(sep) : "",
      sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
      calculateCellWidth: (text) => {
        if (!text) return CONFIG.MIN_COL_WIDTH;
        const str = String(text);
        let width = 0;
        for (const line of str.split("\n")) {
          let lw = 0;
          for (const ch of line) lw += /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\uFF00-\uFFEF]/.test(ch) ? 2 : 1;
          if (lw > width) width = lw;
        }
        return Math.max(CONFIG.MIN_COL_WIDTH, Math.min(CONFIG.MAX_COL_WIDTH, width + 2));
      },
      colToA1: (n) => {
        let s = "";
        while (n > 0) {
          const m = (n - 1) % 26;
          s = String.fromCharCode(65 + m) + s;
          n = (n - 1) / 26 | 0;
        }
        return s;
      },
      a1: (r, c) => `${UtilsX.colToA1(c)}${r}`,
      escapeRegExp: (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      stripHtml: (html) => String(html || "").replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&"),
      formatBoolean: (val) => val ? "○" : "-",
      formatEntity: (entity) => {
        if (!entity) return "-";
        if (Array.isArray(entity)) return entity.map((e2) => UtilsX.formatEntity(e2)).join("\n");
        const e = entity.entity || entity;
        const t = (e.type || "").toString().toUpperCase();
        const typeMap = { USER: "ユーザー", GROUP: "グループ", ORGANIZATION: "組織", FIELD_ENTITY: "フィールド値", CREATOR: "作成者", MODIFIER: "更新者", LOGIN_USER: "ログインユーザー", ALL: "全員" };
        const typeJP = typeMap[t] || e.type || "不明";
        if (e.name) return `${typeJP}:${e.name}`;
        if (e.code) return `${typeJP}:${e.code}`;
        return typeJP;
      },
      formatEntityDetailed: (entity) => {
        if (!entity) return "-";
        if (Array.isArray(entity)) return entity.map((e2) => UtilsX.formatEntityDetailed(e2)).join("\n");
        const e = entity.entity || entity;
        const t = (e.type || "").toString().toUpperCase();
        const typeMap = { USER: "ユーザー", GROUP: "グループ", ORGANIZATION: "組織", FIELD_ENTITY: "フィールド値", CREATOR: "作成者", MODIFIER: "更新者", LOGIN_USER: "ログインユーザー", ALL: "全員" };
        const typeJP = typeMap[t] || e.type || "不明";
        const parts = [typeJP];
        if (e.name) parts.push(e.name);
        else if (e.code) parts.push(`コード:${e.code}`);
        if (entity.includeSubs) parts.push("(サブ組織含)");
        return parts.join(": ");
      },
      formatSort: (sortStr) => {
        if (!sortStr) return "-";
        return String(sortStr).replace(/\basc\b/gi, "昇順").replace(/\bdesc\b/gi, "降順");
      },
      formatFilterCond: (condStr) => {
        if (!condStr) return "-";
        let r = String(condStr);
        r = r.replace(/\s*,\s*/g, ", ");
        return r;
      },
      formatFieldFormat: (f) => {
        if (!f || typeof f !== "object") return "";
        const parts = [];
        if (f.digit !== void 0) parts.push(`桁区切り: ${f.digit ? "あり" : "なし"}`);
        if (f.displayScale !== void 0) parts.push(`小数点: ${f.displayScale}桁`);
        if (f.unit) parts.push(`単位: ${f.unit}`);
        return parts.join("、");
      },
      formatDefaultValue: (dv) => {
        if (dv == null) return "";
        if (Array.isArray(dv)) {
          if (dv.length > 0 && typeof dv[0] === "object") return dv.map((i) => i.name || i.code || JSON.stringify(i)).join("、");
          return dv.join("、");
        }
        if (typeof dv === "object") {
          if (dv.type === "NUMBER") return String(dv.value || "");
          return dv.name || dv.code || JSON.stringify(dv);
        }
        return String(dv);
      },
      safeJSONStringify: (obj) => {
        try {
          return JSON.stringify(obj, null, 2);
        } catch (e) {
          return String(obj);
        }
      }
    };
    async function loadSheetLib() {
      if (typeof window.XLSX !== "undefined") return { styled: true };
      const loadScriptLocal = (src, timeout = 15e3) => new Promise((resolve, reject) => {
        const s = document.createElement("script");
        s.src = src;
        s.async = true;
        let done = false;
        const timer = setTimeout(() => {
          if (!done) {
            done = true;
            reject(new Error(`Timeout: ${src}`));
          }
        }, timeout);
        s.onload = () => {
          if (!done) {
            done = true;
            clearTimeout(timer);
            resolve(true);
          }
        };
        s.onerror = () => {
          if (!done) {
            done = true;
            clearTimeout(timer);
            reject(new Error(`Failed: ${src}`));
          }
        };
        document.head.appendChild(s);
      });
      try {
        await loadScriptLocal(CONFIG.SHEETLIB_PRIMARY_URL);
        return { styled: true };
      } catch {
        await loadScriptLocal(CONFIG.SHEETLIB_FALLBACK_URL);
        return { styled: false };
      }
    }
    async function retry(fn, max = CONFIG.MAX_RETRIES) {
      for (let i = 0; i < max; i++) {
        try {
          return await fn();
        } catch (e) {
          if (i === max - 1) throw e;
          await UtilsX.sleep(CONFIG.RETRY_DELAY * (i + 1));
        }
      }
    }
    async function fetchJob(name, promiseFn) {
      try {
        return await apiSemaphore.run(() => retry(promiseFn));
      } catch (e) {
        console.warn(`[${name}] Failed:`, e);
        UI.logError(name, e);
        return null;
      }
    }
    function showExportOptionsDialog() {
      return new Promise((resolve) => {
        const overlay = getToolDocument().createElement("div");
        Object.assign(overlay.style, { position: "fixed", top: "0", left: "0", width: "100%", height: "100%", backgroundColor: "rgba(0,0,0,0.6)", zIndex: getExporterOverlayZIndex(), display: "flex", justifyContent: "center", alignItems: "center", fontFamily: '"Meiryo", sans-serif' });
        const sheets = [
          { key: "summary", label: "サマリー", default: true, required: true },
          { key: "fields", label: "項目定義", default: true },
          { key: "layout", label: "フォームレイアウト", default: true },
          { key: "views", label: "一覧", default: true },
          { key: "reports", label: "グラフ", default: true },
          { key: "status", label: "プロセス管理", default: true },
          { key: "statusMatrix", label: "遷移マトリクス", default: true },
          { key: "appAcl", label: "アプリ権限", default: true },
          { key: "recordAcl", label: "レコード権限", default: true },
          { key: "fieldAcl", label: "フィールド権限", default: true },
          { key: "customize", label: "JS/CSSカスタマイズ", default: true },
          { key: "actions", label: "アクション", default: true },
          { key: "plugins", label: "プラグイン", default: true },
          { key: "genNotif", label: "通知（一般）", default: true },
          { key: "recNotif", label: "通知（レコード）", default: true },
          { key: "remNotif", label: "通知（リマインダー）", default: true },
          { key: "webhook", label: "Webhook", default: true },
          { key: "adminNotes", label: "管理者メモ", default: true },
          { key: "dependencies", label: "フィールド依存関係", default: true }
        ];
        const checkboxes = sheets.map((s) => `<label style="display:block;margin:3px 0;font-size:13px;cursor:${s.required ? "default" : "pointer"};"><input type="checkbox" value="${s.key}" ${s.default ? "checked" : ""} ${s.required ? "disabled" : ""} style="margin-right:6px;">${s.label}${s.required ? " (必須)" : ""}</label>`).join("");
        overlay.innerHTML = `<div style="background:#fff;border-radius:12px;padding:28px;min-width:360px;max-width:460px;max-height:80vh;overflow-y:auto;box-shadow:0 4px 24px rgba(0,0,0,0.3);"><div style="font-size:18px;font-weight:bold;color:#2E5C8A;margin-bottom:16px;">📊 エクスポート設定</div><div style="font-size:12px;color:#666;margin-bottom:12px;">出力するシートを選択してください</div><div style="display:flex;gap:8px;margin-bottom:12px;"><button id="kex-select-all" style="font-size:11px;padding:4px 10px;border:1px solid #ccc;border-radius:4px;background:#f5f5f5;cursor:pointer;">全選択</button><button id="kex-select-none" style="font-size:11px;padding:4px 10px;border:1px solid #ccc;border-radius:4px;background:#f5f5f5;cursor:pointer;">全解除</button></div><div id="kex-sheet-options" style="max-height:340px;overflow-y:auto;padding:8px;background:#fafafa;border-radius:6px;border:1px solid #eee;">${checkboxes}</div><div style="display:flex;gap:10px;justify-content:flex-end;margin-top:18px;"><button id="kex-cancel" style="padding:8px 20px;border:1px solid #ccc;border-radius:6px;background:#fff;cursor:pointer;font-size:13px;">キャンセル</button><button id="kex-export" style="padding:8px 20px;border:none;border-radius:6px;background:#4A90E2;color:#fff;cursor:pointer;font-size:13px;font-weight:bold;">エクスポート</button></div></div>`;
        getToolDocument().body.appendChild(overlay);
        overlay.querySelector("#kex-select-all").onclick = () => {
          overlay.querySelectorAll('#kex-sheet-options input[type="checkbox"]').forEach((cb) => cb.checked = true);
        };
        overlay.querySelector("#kex-select-none").onclick = () => {
          overlay.querySelectorAll('#kex-sheet-options input[type="checkbox"]:not([disabled])').forEach((cb) => cb.checked = false);
        };
        overlay.querySelector("#kex-cancel").onclick = () => {
          getToolDocument().body.removeChild(overlay);
          resolve(null);
        };
        overlay.querySelector("#kex-export").onclick = () => {
          const selected = /* @__PURE__ */ new Set();
          overlay.querySelectorAll('#kex-sheet-options input[type="checkbox"]:checked').forEach((cb) => selected.add(cb.value));
          getToolDocument().body.removeChild(overlay);
          resolve(selected);
        };
      });
    }
    try {
      const APP_ID = Number(sourceAppId);
      if (!APP_ID) throw new Error("有効な比較元アプリIDが指定されませんでした。");
      const selectedSheets = await showExportOptionsDialog();
      if (!selectedSheets) return false;
      UI.show("ライブラリ読み込み中...", 12);
      const { styled } = await loadSheetLib();
      const api = kintone.api;
      const apiUrl = (path) => {
        let p = String(path || "");
        if (sourceGuestId) {
          p = p.replace("/k/v1/preview/", `/k/guest/${sourceGuestId}/v1/preview/`).replace("/k/v1/", `/k/guest/${sourceGuestId}/v1/`);
        }
        return kintone.api.url(p, true);
      };
      UI.update("基本情報を取得中...");
      const appSettings = await fetchJob("App", () => api(apiUrl("/k/v1/app.json"), "GET", { id: APP_ID }));
      const generalSettings = await fetchJob("Settings", () => api(apiUrl("/k/v1/app/settings.json"), "GET", { app: APP_ID }));
      UI.update("フィールド・レイアウトを取得中...");
      let fieldResp = await fetchJob("FieldsPrev", () => api(apiUrl("/k/v1/preview/app/form/fields.json"), "GET", { app: APP_ID }));
      if (!fieldResp) fieldResp = await fetchJob("FieldsProd", () => api(apiUrl("/k/v1/app/form/fields.json"), "GET", { app: APP_ID }));
      let layout = await fetchJob("LayoutPrev", () => api(apiUrl("/k/v1/preview/app/form/layout.json"), "GET", { app: APP_ID }));
      if (!layout) layout = await fetchJob("LayoutProd", () => api(apiUrl("/k/v1/app/form/layout.json"), "GET", { app: APP_ID }));
      const filterUserFields = (fields2) => {
        const filtered = {};
        for (const [code, field] of Object.entries(fields2)) {
          if (SYSTEM_FIELDS.has(code) || SYSTEM_FIELDS.has(field.code)) continue;
          if (["STATUS", "CATEGORY", "STATUS_ASSIGNEE"].includes(field.type)) continue;
          filtered[code] = field;
        }
        return filtered;
      };
      const fields = filterUserFields(fieldResp?.properties || {});
      UI.update("レコード件数を取得中...");
      let recordCount = null;
      try {
        const countResp = await fetchJob("RecordCount", () => api(apiUrl("/k/v1/records.json"), "GET", { app: APP_ID, query: "limit 1", totalCount: true }));
        recordCount = countResp?.totalCount ?? null;
      } catch (e) {
      }
      UI.update("一覧・権限・通知設定を取得中...");
      const [views, reports, status, appAcl, recordAcl, fieldAcl, customize, actionsResp, pluginsResp, adminNotes, webhooksResp, genNotif, recNotif, remNotif] = await Promise.all([
        fetchJob("Views", () => api(apiUrl("/k/v1/app/views.json"), "GET", { app: APP_ID })),
        fetchJob("Reports", () => api(apiUrl("/k/v1/app/reports.json"), "GET", { app: APP_ID })),
        fetchJob("Status", () => api(apiUrl("/k/v1/app/status.json"), "GET", { app: APP_ID })),
        fetchJob("アプリ権限", () => api(apiUrl("/k/v1/app/acl.json"), "GET", { app: APP_ID })),
        fetchJob("レコード権限", () => api(apiUrl("/k/v1/record/acl.json"), "GET", { app: APP_ID })),
        fetchJob("フィールド権限", () => api(apiUrl("/k/v1/field/acl.json"), "GET", { app: APP_ID })),
        fetchJob("Customize", () => api(apiUrl("/k/v1/app/customize.json"), "GET", { app: APP_ID })),
        fetchJob("Actions", () => api(apiUrl("/k/v1/preview/app/actions.json"), "GET", { app: APP_ID })),
        fetchJob("Plugins", () => api(apiUrl("/k/v1/app/plugins.json"), "GET", { app: APP_ID })),
        fetchJob("AdminNotes", () => api(apiUrl("/k/v1/app/adminNotes.json"), "GET", { app: APP_ID })),
        fetchJob("Webhooks", () => api(apiUrl("/k/v1/app/webhook.json"), "GET", { app: APP_ID })),
        fetchJob("GenNotif", () => api(apiUrl("/k/v1/app/notifications/general.json"), "GET", { app: APP_ID })),
        fetchJob("RecNotif", () => api(apiUrl("/k/v1/app/notifications/perRecord.json"), "GET", { app: APP_ID })),
        fetchJob("RemNotif", () => api(apiUrl("/k/v1/app/notifications/reminder.json"), "GET", { app: APP_ID }))
      ]);
      const actions = UtilsX.safeGet(actionsResp, "actions", {});
      UI.update("関連アプリ名を解決中...");
      const referencedAppIds = /* @__PURE__ */ new Set();
      const scanField = (f) => {
        if (f.lookup?.relatedApp?.app) referencedAppIds.add(f.lookup.relatedApp.app);
        if (f.referenceTable?.relatedApp?.app) referencedAppIds.add(f.referenceTable.relatedApp.app);
      };
      Object.values(fields).forEach((f) => {
        scanField(f);
        if (f.type === "SUBTABLE" && f.fields) Object.values(f.fields).forEach(scanField);
      });
      Object.values(actions).forEach((a) => {
        if (a.destApp?.app) referencedAppIds.add(a.destApp.app);
      });
      const appNames = {};
      const refPromises = [...referencedAppIds].map(
        (id) => fetchJob(`RefApp_${id}`, () => api(apiUrl("/k/v1/app.json"), "GET", { id })).then((info) => {
          appNames[id] = info?.name || `(ID:${id})`;
        })
      );
      await Promise.all(refPromises);
      UI.update("Excelファイルを生成中...", 10);
      const wb = XLSX.utils.book_new();
      const makeSafeSheetName = (raw, existingNames) => {
        let name = String(raw ?? "").trim() || "Sheet";
        name = name.replace(/[:\\/\?\*\[\]]/g, "_").replace(/[\u0000-\u001F]/g, "").replace(/^'+|'+$/g, "");
        if (!name) name = "Sheet";
        if (name.length > 31) name = name.slice(0, 31);
        const existing = existingNames || /* @__PURE__ */ new Set();
        if (!existing.has(name)) return name;
        let i = 2;
        while (true) {
          const suffix = `(${i})`;
          const base = name.length > 31 - suffix.length ? name.slice(0, 31 - suffix.length) : name;
          const candidate = base + suffix;
          if (!existing.has(candidate)) return candidate;
          i++;
        }
      };
      const appendSheet = (name, data) => {
        if (!data || !Array.isArray(data.aoa) || data.aoa.length === 0) return;
        const ws = XLSX.utils.aoa_to_sheet(data.aoa);
        const safeName = makeSafeSheetName(name, new Set(wb.SheetNames));
        XLSX.utils.book_append_sheet(wb, ws, safeName);
      };
      const buildSimpleAOA = (title, headers, rows) => ({
        aoa: [title ? [title] : [], headers, ...rows],
        options: { headerRowIndex: title ? 1 : 0, titleRows: title ? [0] : [] }
      });
      if (selectedSheets.has("summary")) {
        const summaryRows = [
          ["アプリID", APP_ID],
          ["アプリ名", appSettings?.name || ""],
          ["説明", UtilsX.stripHtml(appSettings?.description || generalSettings?.description || "")],
          ["アイコン", appSettings?.icon?.key || appSettings?.icon?.type || ""],
          ["テーマ", generalSettings?.theme || ""],
          ["スペースID", appSettings?.spaceId || ""],
          ["スレッドID", appSettings?.threadId || ""],
          ["作成日時", UtilsX.toJST(appSettings?.createdAt)],
          ["作成者", appSettings?.creator?.name || ""],
          ["更新日時", UtilsX.toJST(appSettings?.modifiedAt)],
          ["更新者", appSettings?.modifier?.name || ""],
          ["出力日時", UtilsX.dt()],
          ["フィールド数", Object.keys(fields).length],
          ["ビュー数", Object.keys(views?.views || {}).length],
          ["グラフ数", Object.keys(reports?.reports || {}).length],
          ["プロセス管理", status?.enable ? "有効" : "無効"],
          ["プラグイン数", (pluginsResp?.plugins || []).length],
          ["レコード件数", recordCount != null ? recordCount : "-"]
        ];
        appendSheet("サマリー", buildSimpleAOA("kintone アプリ設計書", ["項目", "値"], summaryRows));
      }
      const resolveAppName = (appRef) => {
        if (!appRef) return "";
        const id = appRef.app || appRef;
        const nm = appNames[id] || appRef.name;
        return nm ? `${nm}(ID:${id})` : `(ID:${id})`;
      };
      const describeFieldOptions = (f) => {
        if (!f?.options || typeof f.options !== "object") return "";
        return Object.values(f.options).sort((a, b) => (Number(a.index) || 0) - (Number(b.index) || 0)).map((opt) => opt.label || opt.name || "").filter(Boolean).join("、");
      };
      const describeLookup = (f) => {
        if (!f?.lookup) return "";
        const lk = f.lookup;
        const parts = [];
        parts.push(`参照元: ${resolveAppName(lk.relatedApp)}`);
        if (lk.relatedKeyField) parts.push(`キー: ${lk.relatedKeyField}`);
        if (Array.isArray(lk.fieldMappings) && lk.fieldMappings.length) {
          const maps = lk.fieldMappings.map((m) => `${m.relatedField || "-"}→${m.field || "-"}`).join(", ");
          parts.push(`マッピング: ${maps}`);
        }
        return parts.join(" / ");
      };
      const describeReference = (f) => {
        if (!f?.referenceTable) return "";
        const ref = f.referenceTable;
        const parts = [];
        parts.push(`参照先: ${resolveAppName(ref.relatedApp)}`);
        if (ref.condition) parts.push(`条件: ${ref.condition.relatedField || "-"}=${ref.condition.field || "-"}`);
        if (ref.displayFields?.length) parts.push(`表示: ${ref.displayFields.join(", ")}`);
        if (ref.sort) parts.push(`並べ替え: ${UtilsX.formatSort(ref.sort)}`);
        return parts.join(" / ");
      };
      const buildFieldRow = (f, parentTable) => [
        parentTable || "",
        f.label || "",
        f.code || "",
        FIELD_TYPE[f.type] || f.type || "",
        UtilsX.formatBoolean(f.required),
        UtilsX.formatBoolean(f.unique),
        UtilsX.formatBoolean(f.noLabel),
        UtilsX.formatDefaultValue(f.defaultValue),
        UtilsX.formatFieldFormat(f),
        describeFieldOptions(f),
        f.expression || f.formula || "",
        describeLookup(f),
        describeReference(f),
        UtilsX.stripHtml(f.description || "")
      ];
      if (selectedSheets.has("fields")) {
        const fieldHeaders = ["テーブル", "フィールド名", "コード", "タイプ", "必須", "重複禁止", "ラベル非表示", "初期値", "書式", "選択肢", "計算式", "ルックアップ", "関連レコード", "説明"];
        const fieldRows = [];
        Object.values(fields).forEach((f) => {
          fieldRows.push(buildFieldRow(f, ""));
          if (f.type === "SUBTABLE" && f.fields) {
            Object.values(f.fields).forEach((sub) => fieldRows.push(buildFieldRow(sub, f.code || f.label || "")));
          }
        });
        appendSheet("項目定義", buildSimpleAOA("項目定義", fieldHeaders, fieldRows));
      }
      if (selectedSheets.has("layout") && Array.isArray(layout?.layout)) {
        const layoutRows = [];
        const pushLayoutRow = (section, idx, type, code, label, extra) => {
          layoutRows.push([section, idx, type, code || "", label || "", extra || ""]);
        };
        const describeLayoutField = (item) => {
          if (!item) return { code: "", label: "", extra: "" };
          const code = item.code || "";
          const def = code ? fields[code] || null : null;
          const label = def?.label || item.label || (item.elementId || "");
          const extras = [];
          if (item.size?.width) extras.push(`幅:${item.size.width}`);
          if (item.size?.height) extras.push(`高:${item.size.height}`);
          if (item.elementId) extras.push(`elementId:${item.elementId}`);
          return { code, label, extra: extras.join(", ") };
        };
        layout.layout.forEach((section, i) => {
          const sectionName = section.type === "GROUP" ? `GROUP:${section.code || ""}` : (section.type || "ROW") + (section.code ? `:${section.code}` : "");
          if (section.type === "GROUP") {
            pushLayoutRow(sectionName, i + 1, "GROUP", section.code || "", fields[section.code]?.label || "", "");
            const gLayout = Array.isArray(section.layout) ? section.layout : [];
            gLayout.forEach((row2, ri) => {
              (row2.fields || []).forEach((fld, fi) => {
                const info = describeLayoutField(fld);
                pushLayoutRow(sectionName, `${i + 1}-${ri + 1}-${fi + 1}`, fld.type || "", info.code, info.label, info.extra);
              });
            });
          } else {
            const rowFields = Array.isArray(section.fields) ? section.fields : [];
            if (rowFields.length === 0) {
              pushLayoutRow(sectionName, i + 1, section.type || "ROW", "", "", "");
            } else {
              rowFields.forEach((fld, fi) => {
                const info = describeLayoutField(fld);
                pushLayoutRow(sectionName, `${i + 1}-${fi + 1}`, fld.type || "", info.code, info.label, info.extra);
              });
            }
          }
        });
        appendSheet("フォームレイアウト", buildSimpleAOA("フォームレイアウト", ["セクション", "位置", "タイプ", "コード", "ラベル", "補足"], layoutRows));
      }
      if (selectedSheets.has("views") && views?.views) {
        const headers = ["ビュー名", "種別", "インデックス", "フィルター条件", "ソート", "表示フィールド", "ページング", "メモ"];
        const rows = Object.entries(views.views).sort(([, a], [, b]) => (Number(a.index) || 0) - (Number(b.index) || 0)).map(([name, v]) => [
          name,
          v.type || "",
          v.index || "",
          UtilsX.formatFilterCond(v.filterCond),
          UtilsX.formatSort(v.sort),
          Array.isArray(v.fields) ? v.fields.join(", ") : "",
          v.paginationType || "",
          UtilsX.stripHtml(v.customView || v.html || v.builtinType || "")
        ]);
        appendSheet("一覧", buildSimpleAOA("一覧(ビュー)", headers, rows));
      }
      if (selectedSheets.has("reports") && reports?.reports) {
        const headers = ["グラフ名", "種別", "集計対象", "集計方法", "グループ化", "ソート", "フィルター"];
        const rows = Object.entries(reports.reports).sort(([, a], [, b]) => (Number(a.index) || 0) - (Number(b.index) || 0)).map(([name, r]) => [
          name,
          r.chartType || r.type || "",
          Array.isArray(r.aggregations) ? r.aggregations.map((a) => `${a.type || ""}:${a.code || ""}`).join("\n") : "",
          r.chartMode || "",
          Array.isArray(r.groups) ? r.groups.map((g) => `${g.code || ""}${g.per ? `(${g.per})` : ""}`).join("、") : "",
          UtilsX.formatSort(Array.isArray(r.sorts) ? r.sorts.map((s) => `${s.by || ""} ${s.order || ""}`).join(", ") : ""),
          UtilsX.formatFilterCond(r.filterCond)
        ]);
        appendSheet("グラフ", buildSimpleAOA("グラフ", headers, rows));
      }
      if (selectedSheets.has("status") && status) {
        const headers = ["種別", "名前", "番号/From", "To", "作業者", "条件"];
        const rows = [];
        rows.push(["有効/無効", status.enable ? "有効" : "無効", "", "", "", ""]);
        Object.entries(status.states || {}).forEach(([name, st]) => {
          const asgn = st.assignee ? `${st.assignee.type || ""}${Array.isArray(st.assignee.entities) ? ":" + st.assignee.entities.map(UtilsX.formatEntityDetailed).join(" / ") : ""}` : "";
          rows.push(["ステータス", name, st.index || "", "", asgn, ""]);
        });
        (status.actions || []).forEach((a) => {
          rows.push(["アクション", a.name || "", a.from || "", a.to || "", "", a.filterCond || ""]);
        });
        appendSheet("プロセス管理", buildSimpleAOA("プロセス管理", headers, rows));
      }
      if (selectedSheets.has("statusMatrix") && status?.states && Array.isArray(status?.actions)) {
        const stateNames = Object.entries(status.states || {}).sort(([, a], [, b]) => (Number(a.index) || 0) - (Number(b.index) || 0)).map(([n]) => n);
        const headers = ["From \\ To", ...stateNames];
        const rows = stateNames.map((from) => {
          const cells = stateNames.map((to) => {
            const found = status.actions.filter((a) => a.from === from && a.to === to).map((a) => a.name || "●");
            return found.join(" / ");
          });
          return [from, ...cells];
        });
        appendSheet("遷移マトリクス", buildSimpleAOA("遷移マトリクス", headers, rows));
      }
      const renderAclRights = (title, name, rights) => {
        const list = Array.isArray(rights) ? rights : [];
        if (!list.length) return null;
        const headers = ["対象", "閲覧", "追加", "編集", "削除", "インポート", "エクスポート", "フィルター条件"];
        const rows = list.map((r) => [
          UtilsX.formatEntityDetailed(r.entity || r),
          UtilsX.formatBoolean(r.viewable),
          UtilsX.formatBoolean(r.addable ?? r.creatable),
          UtilsX.formatBoolean(r.editable),
          UtilsX.formatBoolean(r.deletable),
          UtilsX.formatBoolean(r.importable),
          UtilsX.formatBoolean(r.exportable),
          UtilsX.formatFilterCond(r.filterCond)
        ]);
        return buildSimpleAOA(title, headers, rows);
      };
      if (selectedSheets.has("appAcl")) {
        const data = renderAclRights("アプリ権限", "", appAcl?.rights);
        if (data) appendSheet("アプリ権限", data);
      }
      if (selectedSheets.has("recordAcl")) {
        const list = Array.isArray(recordAcl?.rights) ? recordAcl.rights : [];
        const rows = [];
        list.forEach((group) => {
          const cond = UtilsX.formatFilterCond(group.filterCond);
          (group.entities || []).forEach((ent) => {
            rows.push([
              cond,
              UtilsX.formatEntityDetailed(ent.entity || ent),
              UtilsX.formatBoolean(ent.viewable),
              UtilsX.formatBoolean(ent.editable),
              UtilsX.formatBoolean(ent.deletable),
              UtilsX.formatBoolean(ent.includeSubs)
            ]);
          });
        });
        if (rows.length) {
          appendSheet("レコード権限", buildSimpleAOA("レコード権限", ["フィルター条件", "対象", "閲覧", "編集", "削除", "サブ組織含"], rows));
        }
      }
      if (selectedSheets.has("fieldAcl")) {
        const list = Array.isArray(fieldAcl?.rights) ? fieldAcl.rights : [];
        const rows = [];
        list.forEach((r) => {
          const code = r.code || r.field || "";
          (r.entities || []).forEach((ent) => {
            rows.push([
              code,
              fields[code]?.label || "",
              UtilsX.formatEntityDetailed(ent.entity || ent),
              UtilsX.formatBoolean(ent.viewable),
              UtilsX.formatBoolean(ent.editable)
            ]);
          });
        });
        if (rows.length) {
          appendSheet("フィールド権限", buildSimpleAOA("フィールド権限", ["フィールドコード", "フィールド名", "対象", "閲覧", "編集"], rows));
        }
      }
      if (selectedSheets.has("customize") && customize) {
        const renderScope = (scope, obj) => {
          const list = [];
          ["js", "css"].forEach((kind) => {
            (obj?.[kind] || []).forEach((entry, i) => {
              list.push([scope, kind.toUpperCase(), i + 1, entry.type || "", entry.file?.name || entry.url || "", entry.file?.fileKey || ""]);
            });
          });
          return list;
        };
        const rows = [
          ...renderScope("PC", customize.desktop),
          ...renderScope("モバイル", customize.mobile)
        ];
        if (rows.length) {
          appendSheet("JS/CSSカスタマイズ", buildSimpleAOA("JS/CSSカスタマイズ", ["スコープ", "種別", "No", "参照方法", "名前/URL", "fileKey"], rows));
        }
      }
      if (selectedSheets.has("actions") && actions) {
        const entries = Array.isArray(actions) ? actions : Object.values(actions);
        const headers = ["アクション名", "実行先アプリ", "フィルター条件", "ソート", "フィールドマッピング"];
        const rows = entries.map((a) => [
          a.name || "",
          resolveAppName(a.destApp),
          UtilsX.formatFilterCond(a.filterCond),
          UtilsX.formatSort(a.sort),
          Array.isArray(a.mappings) ? a.mappings.map((m) => `${m.srcField || m.sourceField || "-"}→${m.destField || "-"}`).join("\n") : ""
        ]);
        if (rows.length) appendSheet("アクション", buildSimpleAOA("アクション", headers, rows));
      }
      if (selectedSheets.has("plugins") && pluginsResp?.plugins) {
        const headers = ["プラグインID", "名前", "状態"];
        const rows = pluginsResp.plugins.map((p) => [p.id || "", p.name || "", p.enabled === false ? "無効" : "有効"]);
        if (rows.length) appendSheet("プラグイン", buildSimpleAOA("プラグイン", headers, rows));
      }
      const renderNotifSheet = (title, payload) => {
        const list = Array.isArray(payload?.notifications) ? payload.notifications : [];
        if (!list.length) return;
        const headers = ["対象", "条件/タイミング", "レコード作成", "編集", "コメント", "ステータス", "本文/備考"];
        const rows = list.map((n) => [
          UtilsX.formatEntityDetailed(n.entity || n),
          UtilsX.formatFilterCond(n.filterCond || n.timing || ""),
          UtilsX.formatBoolean(n.recordAdded ?? n.notifyOnCreate),
          UtilsX.formatBoolean(n.recordEdited ?? n.notifyOnEdit),
          UtilsX.formatBoolean(n.commentAdded ?? n.notifyOnComment),
          UtilsX.formatBoolean(n.statusChanged ?? n.notifyOnStatusChange),
          UtilsX.stripHtml(n.title || n.body || "")
        ]);
        appendSheet(title, buildSimpleAOA(title, headers, rows));
      };
      if (selectedSheets.has("genNotif")) renderNotifSheet("通知(一般)", genNotif);
      if (selectedSheets.has("recNotif")) renderNotifSheet("通知(レコード)", recNotif);
      if (selectedSheets.has("remNotif")) renderNotifSheet("通知(リマインダー)", remNotif);
      if (selectedSheets.has("webhook")) {
        const list = Array.isArray(webhooksResp?.webhooks) ? webhooksResp.webhooks : [];
        if (list.length) {
          const headers = ["ID", "URL", "イベント", "説明", "有効"];
          const rows = list.map((w) => [
            w.id || "",
            w.url || w.notifyUrl || "",
            Array.isArray(w.notificationEvents || w.events) ? (w.notificationEvents || w.events).join(", ") : "",
            UtilsX.stripHtml(w.description || ""),
            UtilsX.formatBoolean(w.enabled !== false)
          ]);
          appendSheet("Webhook", buildSimpleAOA("Webhook", headers, rows));
        }
      }
      if (selectedSheets.has("adminNotes") && adminNotes) {
        const content = UtilsX.stripHtml(adminNotes.content || adminNotes.note || "");
        if (content) {
          const rows = content.split("\n").map((line, i) => [i + 1, line]);
          appendSheet("管理者メモ", buildSimpleAOA("管理者メモ", ["行", "内容"], rows));
        }
      }
      if (selectedSheets.has("dependencies")) {
        const headers = ["フィールドコード", "フィールド名", "種別", "参照先アプリ", "詳細"];
        const rows = [];
        const pushDeps = (f, parent) => {
          const label = `${parent ? parent + " > " : ""}${f.label || ""}`;
          if (f.lookup?.relatedApp?.app) {
            rows.push([f.code || "", label, "ルックアップ", resolveAppName(f.lookup.relatedApp), describeLookup(f)]);
          }
          if (f.referenceTable?.relatedApp?.app) {
            rows.push([f.code || "", label, "関連レコード一覧", resolveAppName(f.referenceTable.relatedApp), describeReference(f)]);
          }
        };
        Object.values(fields).forEach((f) => {
          pushDeps(f, "");
          if (f.type === "SUBTABLE" && f.fields) {
            Object.values(f.fields).forEach((sub) => pushDeps(sub, f.code || f.label || ""));
          }
        });
        Object.values(actions || {}).forEach((a) => {
          if (a?.destApp?.app) {
            rows.push(["(アクション)", a.name || "", "アクション", resolveAppName(a.destApp), ""]);
          }
        });
        if (rows.length) {
          appendSheet("フィールド依存関係", buildSimpleAOA("フィールド依存関係", headers, rows));
        }
      }
      UI.update("ダウンロード中...", 12);
      const safeAppName = String(appSettings?.name || `App${APP_ID}`).replace(/[\\/:*?"<>|]/g, "_");
      const downloadExcel = (wb2, filename) => {
        const out = XLSX.write(wb2, { bookType: "xlsx", type: "array", cellStyles: true });
        const blob = new Blob([out], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
        const a = getToolDocument().createElement("a");
        const url = URL.createObjectURL(blob);
        a.href = url;
        a.download = filename;
        getToolDocument().body.appendChild(a);
        a.click();
        getToolDocument().body.removeChild(a);
        URL.revokeObjectURL(url);
      };
      downloadExcel(wb, `${safeAppName}_設計書_v2.xlsx`);
      UI.hide();
      const errorMsg = UI.failedAPIs.length > 0 ? `
⚠ ${UI.failedAPIs.length}件のAPI取得に失敗しました` : "";
      showToast(`✅ エクスポート完了${errorMsg}`, UI.failedAPIs.length > 0 ? "warn" : "success");
      return true;
    } catch (e) {
      UI.hide();
      console.error("kintone設計書エクスポートエラー:", e);
      showToast(`❌ エラーが発生しました: ${e.message}`, "error");
      throw e;
    }
  }

  // src/tabs/design-standalone.js
  async function runDesignExportStandalone(kind, source, setStatus2) {
    const appId = String(source.appId || "").trim();
    if (!appId) throw new Error("アプリIDを入力してください");
    const guestId = String(source.guestId || "").trim();
    const preview = !!source.preview;
    const scopes = SECTION_DEFS.map((s) => s.key);
    setStatus2("設計情報を取得中...");
    const bundle = await fetchBundle({
      appId,
      guestId,
      preview,
      sections: scopes,
      onProgress: (p, l) => setStatus2(`取得中 ${Math.round(p * 100)}% (${l})`)
    });
    state.lastSourceBundle = bundle;
    if (kind === "json") {
      downloadText(`design_${bundle.appId}_${nowStamp()}.json`, JSON.stringify(bundle, null, 2), "application/json");
    } else {
      downloadText(`design_${bundle.appId}_${nowStamp()}.md`, bundleToMarkdown(bundle), "text/markdown");
    }
    setStatus2(`設計書出力完了（App ${bundle.appId}）`);
  }
  async function runDesignCopyMdStandalone(source, setStatus2) {
    const appId = String(source.appId || "").trim();
    if (!appId) throw new Error("アプリIDを入力してください");
    const guestId = String(source.guestId || "").trim();
    const preview = !!source.preview;
    const scopes = SECTION_DEFS.map((s) => s.key);
    setStatus2("設計情報を取得中...");
    const bundle = await fetchBundle({
      appId,
      guestId,
      preview,
      sections: scopes,
      onProgress: (p, l) => setStatus2(`取得中 ${Math.round(p * 100)}% (${l})`)
    });
    state.lastSourceBundle = bundle;
    const md = bundleToMarkdown(bundle);
    try {
      await navigator.clipboard.writeText(md);
      setStatus2("設計書Markdownをクリップボードにコピーしました");
    } catch (e) {
      throw new Error(`クリップボードへのコピーに失敗しました: ${e.message}`);
    }
  }
  async function runDesignExportXlsxStandalone(source, setStatus2) {
    const appId = String(source.appId || "").trim();
    if (!appId) throw new Error("アプリIDを入力してください");
    const guestId = String(source.guestId || "").trim();
    setStatus2("設計書Excel出力を開始...");
    const done = await runAdvancedDesignExporter({ appId, guestId });
    if (done === false) {
      setStatus2("設計書Excel出力をキャンセルしました");
      return;
    }
    setStatus2("設計書Excel出力完了");
  }

  // src/entries/liteMount.js
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

  // src/entries/design-lite-ui.js
  function row(labelHtml, child) {
    const wrap = document.createElement("div");
    wrap.style.cssText = "display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-bottom:10px";
    const lab = document.createElement("span");
    lab.style.cssText = "font-size:12px;font-weight:600;color:#334155;min-width:5em";
    lab.innerHTML = labelHtml;
    wrap.appendChild(lab);
    wrap.appendChild(child);
    return wrap;
  }
  function mountDesignLitePanel() {
    const { bodySlot } = mountKusLitePanel({
      id: "kus-design-lite",
      title: "設計書",
      note: "アプリ設定を取得し、Markdown または JSON で保存します。統合ツール.js は不要です。"
    });
    const appInp = document.createElement("input");
    appInp.type = "text";
    appInp.placeholder = "アプリID";
    appInp.value = DEFAULT_APP_ID || "";
    appInp.style.cssText = "width:min(120px,40vw);padding:6px 10px;border:1px solid #e2e8f0;border-radius:8px;font-size:12px";
    const guestInp = document.createElement("input");
    guestInp.type = "text";
    guestInp.placeholder = "ゲストID（任意）";
    guestInp.style.cssText = "width:min(120px,40vw);padding:6px 10px;border:1px solid #e2e8f0;border-radius:8px;font-size:12px";
    const prev = document.createElement("label");
    prev.style.cssText = "font-size:12px;color:#475569;display:inline-flex;align-items:center;gap:6px;cursor:pointer";
    const prevCb = document.createElement("input");
    prevCb.type = "checkbox";
    prev.appendChild(prevCb);
    prev.appendChild(document.createTextNode("プレビュー環境"));
    bodySlot.appendChild(row("アプリID", appInp));
    bodySlot.appendChild(row("ゲスト", guestInp));
    bodySlot.appendChild(row("", prev));
    const btnRow = document.createElement("div");
    btnRow.style.cssText = "display:flex;flex-direction:column;gap:8px;margin-top:12px";
    function source() {
      return {
        appId: appInp.value.trim(),
        guestId: guestInp.value.trim(),
        preview: prevCb.checked
      };
    }
    function mkBtn(text) {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = text;
      b.style.cssText = "padding:10px 14px;font-size:13px;font-weight:700;border:none;border-radius:10px;background:linear-gradient(180deg,#3b82f6,#2563eb);color:#fff;cursor:pointer";
      return b;
    }
    const bMd = mkBtn("Markdown を保存");
    bMd.addEventListener("click", async () => {
      try {
        await runDesignExportStandalone("md", source(), (m, e) => setStatus(m, e));
      } catch (e) {
        setStatus(e.message || String(e), true);
      }
    });
    const bJson = mkBtn("JSON を保存");
    bJson.style.background = "linear-gradient(180deg,#64748b,#475569)";
    bJson.addEventListener("click", async () => {
      try {
        await runDesignExportStandalone("json", source(), (m, e) => setStatus(m, e));
      } catch (e) {
        setStatus(e.message || String(e), true);
      }
    });
    const bCopy = mkBtn("Markdown をクリップボードへ");
    bCopy.style.background = "linear-gradient(180deg,#0ea5e9,#0284c7)";
    bCopy.addEventListener("click", async () => {
      try {
        await runDesignCopyMdStandalone(source(), (m, e) => setStatus(m, e));
      } catch (e) {
        setStatus(e.message || String(e), true);
      }
    });
    const bXlsx = mkBtn("Excel (.xlsx) を保存");
    bXlsx.style.background = "linear-gradient(180deg,#16a34a,#15803d)";
    bXlsx.addEventListener("click", async () => {
      try {
        await runDesignExportXlsxStandalone(source(), (m, e) => setStatus(m, e));
      } catch (e) {
        setStatus(e.message || String(e), true);
      }
    });
    btnRow.appendChild(bMd);
    btnRow.appendChild(bJson);
    btnRow.appendChild(bCopy);
    btnRow.appendChild(bXlsx);
    bodySlot.appendChild(btnRow);
  }

  // src/entries/design-lite-entry.js
  if (!window.kintone?.api || !window.kintone?.app) {
    alert("kintone画面で実行してください");
  } else {
    mountDesignLitePanel();
  }
})();
