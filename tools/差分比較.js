// ==========================================================================
// 差分比較.js  —  自動生成ファイル（手編集禁止）
// ==========================================================================
// このファイルは tools/統合ツール/ の npm run build (esbuild) で生成されます。
// ソース: tools/統合ツール/src/entries/diff-lite-entry.js
//         tools/統合ツール/src/tabs/diff.js  ← 機能の正規実装
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
  var ICONS, FEATURE_DEFS;
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
          groupLabel: "可視化・分析",
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
          groupLabel: "可視化・分析",
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
          key: "apiTester",
          group: "data",
          groupLabel: "API・検証",
          icon: ICONS.apiTester,
          label: "APIテスター",
          desc: "REST APIを直接試します。",
          tabs: ["apiTester"],
          tab: "apiTester",
          focusSelector: "#u_apiTesterMethod",
          priority: "low",
          riskLevel: "warning",
          recommendedFor: ["調査", "レスポンス確認"],
          usageOrder: 10,
          onboardingOrder: 10,
          badge: { tone: "caution", label: "上級者向け", icon: "!" }
        },
        {
          key: "analyze",
          group: "vis",
          groupLabel: "可視化・分析",
          icon: ICONS.analyze,
          label: "分析",
          desc: "影響分析、依存グラフ、通知/権限、レイアウト確認を集約しています。",
          tabs: ["analyze"],
          tab: "analyze",
          subTab: "dashboard",
          focusSelector: '[data-act="runAnalyzeDashboard"]',
          priority: "medium",
          riskLevel: "safe",
          recommendedFor: ["影響調査", "依存確認", "セキュリティ監査"],
          usageOrder: 7.5,
          onboardingOrder: 7.5,
          badge: { tone: "safe", label: "安全", icon: "OK" }
        }
      ];
    }
  });

  // src/constants.ts
  function resolveDefaultAppId() {
    try {
      if (typeof kintone !== "undefined" && kintone?.app?.getId) {
        return String(kintone.app.getId() || "");
      }
    } catch (e) {
    }
    return "";
  }
  var TOOL_ID, EXTERNAL_LIBRARIES, DEFAULT_APP_ID, DIALOG_STATE_KEY, SECTION_DEFS, META_KEYS, DEFAULT_SUBTAB_STATE, TOUR_STEP_CONNECTION, TOUR_STEP_SCOPE, TOUR_STEP_NOISE, TOUR_STEP_RUN_DIFF, TOUR_STEP_REVIEW, TOUR_STEP_CATEGORY_VIEW, TOUR_STEP_PLAN, TOUR_STEP_APPLY, TOUR_STEP_RECORD, GUIDED_TOUR_COURSES, GUIDED_TOUR_STEPS, DIFF_IMPACT_REF_LIMIT, FIELD_REF_EXACT_KEYS, FIELD_REF_ARRAY_KEYS, FIELD_REF_TOKEN_KEYS, DIFF_NORMALIZATION_PRESETS, LINE_DIFF_MAX_CELLS, CHAR_DIFF_MAX_CELLS, DEFAULT_IGNORE_KEYS;
  var init_constants = __esm({
    "src/constants.ts"() {
      "use strict";
      init_featureDefs();
      TOOL_ID = "kintone-unified-suite-v2";
      EXTERNAL_LIBRARIES = Object.freeze({
        jszip: Object.freeze({
          version: "3.10.1",
          cdnUrl: "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"
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
      DEFAULT_APP_ID = resolveDefaultAppId();
      DIALOG_STATE_KEY = `${TOOL_ID}:dialogState`;
      SECTION_DEFS = [
        { key: "appSettings", label: "アプリ設定", endpoint: "/app/settings.json", put: false },
        { key: "appInfo", label: "アプリ情報(ラベル)", endpoint: "/app.json", put: false, previewEndpoint: false, paramBuilder: (app) => ({ id: app }) },
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
        // PUT /app/notifications/reminder.json は notifications に加え timezone を必須的に要求するためソース側の値を引き継ぐ。
        { key: "reminderNotifications", label: "リマインダー通知", endpoint: "/app/notifications/reminder.json", put: true, putBuilder: (d) => {
          const body = { notifications: d?.notifications || (Array.isArray(d) ? d : []) };
          if (d && typeof d === "object" && typeof d.timezone === "string" && d.timezone) {
            body.timezone = d.timezone;
          }
          return body;
        } },
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
        analyze: "dashboard"
      });
      TOUR_STEP_CONNECTION = {
        tab: "diff",
        diffSubTab: "conditions",
        path: "ヘッダー > 比較条件",
        selector: "#u_sourceApp",
        title: "比較元 / 比較先を決める",
        body: "上部の接続パネルで比較元・比較先のアプリIDとゲストIDを入力します。プレビュー/本番の切替もここで行います。"
      };
      TOUR_STEP_SCOPE = {
        tab: "diff",
        diffSubTab: "conditions",
        path: "ヘッダー > 比較条件",
        selector: '[data-act="openDiffScopePicker"]',
        title: "比較対象セクションを選ぶ",
        body: "「比較対象を選ぶ」から、差分比較で確認したい設定だけを選びます。まずはフィールド・レイアウト・ビュー・プロセス管理あたりが見やすいです。"
      };
      TOUR_STEP_NOISE = {
        tab: "diff",
        diffSubTab: "conditions",
        path: "ヘッダー > 比較条件",
        selector: "#u_ignoreKeyInput",
        title: "ノイズ差分を減らす",
        body: "無視キーや正規化プリセットを使うと、順序違い・メタ情報の差分を抑えられます。比較が荒れるときはここを先に調整します。"
      };
      TOUR_STEP_RUN_DIFF = {
        tab: "diff",
        diffSubTab: "conditions",
        path: "ヘッダー > 比較条件",
        selector: "#u_runDiffPrimary",
        title: "差分比較を実行する",
        body: "条件が決まったら差分比較を実行します。必要ならこのまま JSON / HTML / Excel / パッチJSON として保存できます。"
      };
      TOUR_STEP_REVIEW = {
        tab: "diff",
        diffSubTab: "conditions",
        path: "ヘッダー > 差分結果の整理",
        selector: "#u_diffSearch",
        title: "結果を絞り込んで確認する",
        body: "差分比較後は「差分結果の整理・出力」から、セクション・種別・重要度・検索で絞り込めます。ここで反映対象を見極めます。"
      };
      TOUR_STEP_CATEGORY_VIEW = {
        tab: "diff",
        diffSubTab: "conditions",
        path: "ヘッダー > 差分結果の整理",
        selector: '[data-act="setDiffViewMode"][data-mode="category"]',
        title: "セクション別ビューで読み取る",
        body: "権限・プロセス・通知などフィールド以外の差分は「🗂 セクション別」表示が見やすいです。カテゴリ別タブ + マトリクスや遷移図で差分が直感的に把握できます（V キーで切替）。"
      };
      TOUR_STEP_PLAN = {
        tab: "reflect",
        path: "プレビュー反映",
        selector: "#u_footerPlan",
        title: "反映プランを先に確認する",
        body: "画面下の固定バーから「実行前プラン確認」を押し、API リクエスト内容や対象セクションを確認します。"
      };
      TOUR_STEP_APPLY = {
        tab: "reflect",
        path: "プレビュー反映",
        selector: "#u_footerApply",
        title: "比較先プレビューへ反映する",
        body: "固定バーの「プレビューへ反映」で比較先プレビューへ書き込みます。本番デプロイは kintone 管理画面から手動で実施します。"
      };
      TOUR_STEP_RECORD = {
        tab: "design",
        subTab: "export",
        path: "設計書 > 設計書出力",
        selector: '[data-act="exportDesignMd"]',
        title: "最後に記録を残す",
        body: "作業後は設計書や差分レポートを出力して、変更内容を記録します。複数アプリをまとめて保存したい場合は「設定一括取得」も使えます。"
      };
      GUIDED_TOUR_COURSES = Object.freeze({
        full: {
          label: "初回（全工程）",
          description: "接続から記録出力までを順番に案内します（推奨）",
          steps: [TOUR_STEP_CONNECTION, TOUR_STEP_SCOPE, TOUR_STEP_NOISE, TOUR_STEP_RUN_DIFF, TOUR_STEP_REVIEW, TOUR_STEP_CATEGORY_VIEW, TOUR_STEP_PLAN, TOUR_STEP_APPLY, TOUR_STEP_RECORD]
        },
        diff: {
          label: "差分のみ確認",
          description: "差分比較とレビューに絞った短縮コース",
          steps: [TOUR_STEP_CONNECTION, TOUR_STEP_SCOPE, TOUR_STEP_NOISE, TOUR_STEP_RUN_DIFF, TOUR_STEP_REVIEW, TOUR_STEP_CATEGORY_VIEW]
        },
        apply: {
          label: "反映まで実施",
          description: "差分確認からプレビュー反映までをガイド",
          steps: [TOUR_STEP_RUN_DIFF, TOUR_STEP_REVIEW, TOUR_STEP_PLAN, TOUR_STEP_APPLY]
        }
      });
      GUIDED_TOUR_STEPS = Object.freeze(GUIDED_TOUR_COURSES.full.steps);
      DIFF_IMPACT_REF_LIMIT = 6;
      FIELD_REF_EXACT_KEYS = /* @__PURE__ */ new Set([
        "code",
        "field",
        "entity",
        "targetField",
        "sortField",
        "groupFieldCode"
      ]);
      FIELD_REF_ARRAY_KEYS = /* @__PURE__ */ new Set([
        "fields",
        "displayFields",
        "columns"
      ]);
      FIELD_REF_TOKEN_KEYS = /* @__PURE__ */ new Set([
        "condition",
        "filterCond",
        "expression",
        "formula",
        "sort"
      ]);
      DIFF_NORMALIZATION_PRESETS = {
        viewOrder: {
          label: "ビュー/グラフ/アクション順序",
          sections: /* @__PURE__ */ new Set(["viewSettings", "reportSettings", "actionSettings"]),
          ignoreKeys: /* @__PURE__ */ new Set(["index", "no", "order"]),
          unorderedArrays: true
        },
        permissionOrder: {
          label: "権限/通知/カテゴリ順序",
          sections: /* @__PURE__ */ new Set(["appAcl", "fieldAcl", "recordPermissions", "notifications", "perRecordNotifications", "reminderNotifications", "categories"]),
          ignoreKeys: /* @__PURE__ */ new Set(["index", "no", "order"]),
          unorderedArrays: true
        },
        generalArrayOrder: {
          label: "すべて（プロセス等含む）の配列順序",
          sections: /* @__PURE__ */ new Set(["fieldSettings", "processSettings", "layoutSettings", "actionSettings", "appAcl", "fieldAcl", "recordPermissions", "viewSettings", "reportSettings", "customizeSettings", "notifications", "perRecordNotifications", "reminderNotifications", "categories"]),
          ignoreKeys: /* @__PURE__ */ new Set(["index", "no", "order"]),
          unorderedArrays: true
        }
      };
      LINE_DIFF_MAX_CELLS = 9e4;
      CHAR_DIFF_MAX_CELLS = 2e4;
      DEFAULT_IGNORE_KEYS = /* @__PURE__ */ new Set([
        "id",
        "appid",
        "revision",
        "createdat",
        "creator",
        "modifiedat",
        "modifier"
      ]);
    }
  });

  // src/utils.ts
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
  function esc(s) {
    return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function decodeHtmlEntities(value) {
    let text = String(value ?? "");
    if (!text.includes("&")) return text;
    for (let i = 0; i < 3; i += 1) {
      const next = text.replace(/&(#(\d+)|#x([0-9a-f]+)|[a-z][a-z0-9]+);/gi, (match, token, dec, hex) => {
        if (dec) {
          const codePoint = Number(dec);
          return Number.isFinite(codePoint) && codePoint >= 0 && codePoint <= 1114111 ? String.fromCodePoint(codePoint) : match;
        }
        if (hex) {
          const codePoint = Number.parseInt(hex, 16);
          return Number.isFinite(codePoint) && codePoint >= 0 && codePoint <= 1114111 ? String.fromCodePoint(codePoint) : match;
        }
        const named = HTML_ENTITY_NAMES[String(token).toLowerCase()];
        return named ?? match;
      });
      if (next === text) break;
      text = next;
    }
    return text;
  }
  function stripHtmlToText(value) {
    let text = decodeHtmlEntities(value);
    if (!/[<>]/.test(text)) return text;
    text = text.replace(/<\s*br\s*\/?\s*>/gi, "\n").replace(/<\s*\/\s*(p|div|li|tr|h[1-6])\s*>/gi, "\n").replace(/<\s*\/?\s*[a-z][^>]*>/gi, "");
    return decodeHtmlEntities(text).replace(/\n{3,}/g, "\n\n").trim();
  }
  function safeJsonForScript(v) {
    return JSON.stringify(v).replace(/</g, "\\u003c").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
  }
  function deepClone(v) {
    return v == null ? v : JSON.parse(JSON.stringify(v));
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
  function stableStringify(v) {
    return JSON.stringify(normalize(v));
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
    return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
  }
  function sanitizeFilenamePart(value, fallback = "不明") {
    const text = String(value || "").trim();
    const cleaned = text.replace(/[\\/:*?"<>|]/g, " ").replace(/\s+/g, " ").trim();
    return cleaned || fallback;
  }
  function extractAppNameFromBundle(bundle) {
    const appSettings = bundle?.sections?.appSettings;
    const candidates = [
      appSettings?.name,
      appSettings?.app?.name,
      appSettings?.general?.name,
      bundle?.meta?.appName,
      bundle?.appName
    ];
    const found = candidates.find((item) => String(item || "").trim());
    return found ? String(found).trim() : "";
  }
  function buildAppFilenameLabel(appId, appName) {
    const id = String(appId || "").trim();
    const name = String(appName || "").trim();
    if (name && id) return `${sanitizeFilenamePart(name)}(app${sanitizeFilenamePart(id)})`;
    if (name) return sanitizeFilenamePart(name);
    if (id) return `app${sanitizeFilenamePart(id)}`;
    return "";
  }
  function appLabelFromBundle(bundle) {
    return buildAppFilenameLabel(bundle?.appId, extractAppNameFromBundle(bundle));
  }
  function buildExportFilename(baseLabel, ext, options = {}) {
    const normalizedExt = String(ext || "").replace(/^\./, "").trim() || "txt";
    const base = sanitizeFilenamePart(baseLabel, "出力");
    const stamp = options.timestamp || nowStamp();
    const appLabel2 = String(options.appLabel || "").trim();
    const suffix = String(options.suffix || "").trim();
    const parts = [base];
    if (appLabel2) parts.push(sanitizeFilenamePart(appLabel2));
    if (suffix) parts.push(sanitizeFilenamePart(suffix));
    parts.push(sanitizeFilenamePart(stamp, nowStamp()));
    return `${parts.join("_")}.${normalizedExt}`;
  }
  function getIssueSideLabel(side) {
    if (side === "source") return "比較元";
    if (side === "target") return "比較先";
    if (side === "both") return "両方";
    return String(side || "-");
  }
  function getDiffTypeDisplayLabel(type, options = {}) {
    const map = {
      added: "追加",
      removed: "削除",
      changed: "変更",
      moved: "移動",
      same: "同一"
    };
    const base = map[type] || String(type || "-");
    return options.moved && type !== "moved" ? `${base}(移動)` : base;
  }
  function getSeverityDisplayLabel(severity) {
    if (severity === "high") return "高";
    if (severity === "medium") return "中";
    if (severity === "low") return "低";
    return String(severity || "-");
  }
  function triggerDownload(filename, blob) {
    const doc = getToolDocumentSafe();
    const win = getToolWindowSafe();
    const url = URL.createObjectURL(blob);
    const a = doc.createElement("a");
    a.href = url;
    a.download = filename;
    a.style.display = "none";
    doc.body.appendChild(a);
    a.click();
    win.setTimeout(() => {
      try {
        URL.revokeObjectURL(url);
      } catch (e) {
      }
      try {
        a.remove();
      } catch (e) {
      }
    }, 0);
  }
  function downloadText(filename, text, type) {
    triggerDownload(filename, new Blob([text], { type: type || "text/plain" }));
  }
  function downloadBlob(filename, blob) {
    triggerDownload(filename, blob);
  }
  var HTML_ENTITY_NAMES;
  var init_utils = __esm({
    "src/utils.ts"() {
      "use strict";
      init_constants();
      HTML_ENTITY_NAMES = {
        amp: "&",
        lt: "<",
        gt: ">",
        quot: '"',
        apos: "'",
        nbsp: " "
      };
    }
  });

  // src/api.ts
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
    const row = apiGetMetrics.byPath[key] || { calls: 0, retries: 0, failures: 0, lastError: "" };
    row[field] += 1;
    apiGetMetrics.byPath[key] = row;
    return row;
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
  function sanitizeBundleMeta(meta) {
    const out = { sectionRevisions: {} };
    const revisions = meta?.sectionRevisions;
    if (!revisions || typeof revisions !== "object") return out;
    Object.keys(revisions).forEach((key) => {
      const value = revisions[key];
      if (value == null || value === "") return;
      out.sectionRevisions[key] = String(value);
    });
    return out;
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
  function ensureBundleShape(bundle) {
    if (!bundle || typeof bundle !== "object") throw new Error("バンドル形式が不正です");
    if (!bundle.sections || typeof bundle.sections !== "object") throw new Error("sections がありません");
    return {
      appId: String(bundle.appId || ""),
      guestId: String(bundle.guestId || ""),
      preview: !!bundle.preview,
      fetchedAt: bundle.fetchedAt || (/* @__PURE__ */ new Date()).toISOString(),
      meta: sanitizeBundleMeta(bundle.meta),
      sections: normalize(bundle.sections)
    };
  }
  function pickBundleSections(bundle, sections) {
    const picked = {
      appId: String(bundle.appId || ""),
      guestId: String(bundle.guestId || ""),
      preview: !!bundle.preview,
      fetchedAt: bundle.fetchedAt || (/* @__PURE__ */ new Date()).toISOString(),
      meta: { sectionRevisions: {} },
      sections: {}
    };
    for (const sec of sections) {
      if (Object.prototype.hasOwnProperty.call(bundle.sections || {}, sec)) {
        picked.sections[sec] = deepClone(bundle.sections[sec]);
      } else {
        picked.sections[sec] = { _fetchError: "bundleに該当セクションなし" };
      }
      const revision = bundle?.meta?.sectionRevisions?.[sec];
      if (revision != null && revision !== "") picked.meta.sectionRevisions[sec] = String(revision);
    }
    return picked;
  }
  function fnv1aHashString(text) {
    let h = 2166136261;
    for (let i = 0; i < text.length; i++) {
      h ^= text.charCodeAt(i);
      h = h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24)) >>> 0;
    }
    return h.toString(16).padStart(8, "0");
  }
  async function fetchTextFileBody(prefix, fileKey) {
    if (!fileKey) return null;
    const url = `${prefix}/file.json?fileKey=${encodeURIComponent(fileKey)}`;
    const headers = { "X-Requested-With": "XMLHttpRequest" };
    try {
      const resp = await fetch(url, { method: "GET", headers });
      if (!resp.ok) return null;
      const blob = await resp.blob();
      if (blob.size > CUSTOMIZE_BODY_MAX_BYTES) return null;
      return await blob.text();
    } catch {
      return null;
    }
  }
  async function fetchCustomizeFileBodies(customizeSection, prefix) {
    const stats = { fetched: 0, skipped: 0, failed: 0 };
    if (!customizeSection || typeof customizeSection !== "object") return stats;
    const tasks = [];
    for (const platform of ["desktop", "mobile"]) {
      for (const kind of ["js", "css"]) {
        const arr = customizeSection?.[platform]?.[kind];
        if (!Array.isArray(arr)) continue;
        for (const item of arr) {
          if (!item || typeof item !== "object" || item.type !== "FILE") continue;
          const fileKey = item?.file?.fileKey;
          const fileName = String(item?.file?.name || "");
          if (!fileKey) {
            stats.skipped += 1;
            continue;
          }
          if (fileName && !TEXT_LIKE_EXT.test(fileName)) {
            stats.skipped += 1;
            continue;
          }
          tasks.push((async () => {
            const text = await fetchTextFileBody(prefix, fileKey);
            if (text == null) {
              stats.failed += 1;
              return;
            }
            item._bodyText = text;
            item._bodyHash = fnv1aHashString(text);
            stats.fetched += 1;
          })());
        }
      }
    }
    await Promise.all(tasks);
    return stats;
  }
  async function fetchPluginConfigs(pluginSection, prefix, appId) {
    const stats = { fetched: 0, skipped: 0, failed: 0 };
    if (!pluginSection || typeof pluginSection !== "object") return stats;
    const plugins = Array.isArray(pluginSection.plugins) ? pluginSection.plugins : [];
    if (!plugins.length) return stats;
    const tasks = [];
    for (const plugin of plugins) {
      if (!plugin || typeof plugin !== "object") continue;
      const id = String(plugin.id || "").trim();
      if (!id) {
        stats.skipped += 1;
        continue;
      }
      tasks.push((async () => {
        try {
          const res = await apiGet(prefix, "/app/plugin/config.json", { app: appId, id }, 1);
          if (res && typeof res === "object") {
            plugin._config = res?.config != null ? res.config : res;
            stats.fetched += 1;
          } else {
            stats.skipped += 1;
          }
        } catch {
          stats.failed += 1;
        }
      })());
    }
    await Promise.all(tasks);
    return stats;
  }
  async function fetchBundle({ appId, guestId, preview, sections, onProgress }) {
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
        const sectionPreview = def.previewEndpoint === false ? false : preview;
        const prefix = buildApiPrefix(guestId, sectionPreview);
        const params = typeof def.paramBuilder === "function" ? def.paramBuilder(app) : { app };
        const res = await apiGet(prefix, def.endpoint, params);
        const revision = extractSectionRevision(res);
        if (revision) bundle.meta.sectionRevisions[sec] = revision;
        bundle.sections[sec] = normalize(res);
      } catch (e) {
        bundle.sections[sec] = { _fetchError: e?.message || String(e) };
      }
      if (onProgress) onProgress((i + 1) / sections.length, def.label);
    }
    try {
      if (sections.includes("customizeSettings")) {
        const cust = bundle.sections.customizeSettings;
        if (cust && !cust._fetchError) {
          const prefix = buildApiPrefix(guestId, false);
          cust._bodyFetchStats = await fetchCustomizeFileBodies(cust, prefix);
        }
      }
    } catch {
    }
    try {
      if (sections.includes("pluginSettings")) {
        const plug = bundle.sections.pluginSettings;
        if (plug && !plug._fetchError) {
          const prefix = buildApiPrefix(guestId, false);
          plug._configFetchStats = await fetchPluginConfigs(plug, prefix, app);
        }
      }
    } catch {
    }
    return bundle;
  }
  function resolveBundleRevision(bundle) {
    const revisions = bundle?.meta?.sectionRevisions || {};
    for (const key of ["appSettings", "fieldSettings", "layoutSettings", "viewSettings", "processSettings"]) {
      const revision = revisions[key];
      if (revision != null && revision !== "") return String(revision);
    }
    const first = Object.values(revisions).find((value) => value != null && value !== "");
    return first != null ? String(first) : "";
  }
  var DEFAULT_API_GET_RETRIES, DEFAULT_RETRY_BASE_DELAY_MS, DEFAULT_RETRY_MAX_DELAY_MS, RETRIABLE_STATUS_CODES, apiGetMetrics, CUSTOMIZE_BODY_MAX_BYTES, TEXT_LIKE_EXT;
  var init_api = __esm({
    "src/api.ts"() {
      "use strict";
      init_constants();
      init_utils();
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
      CUSTOMIZE_BODY_MAX_BYTES = 1 * 1024 * 1024;
      TEXT_LIKE_EXT = /\.(js|css|mjs|ts|jsx|tsx|json|txt|html|md)$/i;
    }
  });

  // src/state.ts
  function loadReflectApplyHistory() {
    return [];
  }
  function loadWorkHistory() {
    return [];
  }
  function loadConnectionPresets() {
    return [];
  }
  var state, REFLECT_APPLY_HISTORY_KEY, WORK_HISTORY_KEY, CONNECTION_PRESETS_KEY, ui;
  var init_state = __esm({
    "src/state.ts"() {
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
        workHistory: [],
        workHistoryOpen: true,
        connectionPresets: [],
        reflectPlanPreviewKeyword: "",
        reflectPlanPreviewChangedOnly: false,
        reflectApplyChecklist: { diff: false, plan: false, preview: false, target: false },
        reflectPreviewOpened: false,
        reflectPreviewOpenedFor: "",
        lastPreviewBackupPayload: null,
        lastPreviewBackupFilename: "",
        diffViewTheme: "light",
        diffViewMode: "table",
        diffCategoryView: "",
        diffCollapsedSections: /* @__PURE__ */ new Set(),
        diffSectionVisibleCounts: {},
        diffSelectedIds: /* @__PURE__ */ new Set(),
        diffFavoritePaths: /* @__PURE__ */ new Set(),
        diffFavoritesOnly: false,
        diffViewedKeys: /* @__PURE__ */ new Set(),
        diffReviewMeta: {},
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
        lastSettingsExportBundles: [],
        patchJsonPanelOpen: false,
        importedPatchPayload: null,
        reflectPreviewProdDiff: null,
        guidedTourActive: false,
        guidedTourIndex: 0,
        running: false,
        runningStartedAt: null,
        runningTaskLabel: "",
        runningWatchdogId: null,
        lastResultByTab: {}
      };
      REFLECT_APPLY_HISTORY_KEY = `${TOOL_ID}:reflectApplyHistory`;
      WORK_HISTORY_KEY = `${TOOL_ID}:workHistory`;
      CONNECTION_PRESETS_KEY = `${TOOL_ID}:connectionPresets`;
      state.reflectApplyHistory = loadReflectApplyHistory();
      state.workHistory = loadWorkHistory();
      state.connectionPresets = loadConnectionPresets();
      ui = {};
    }
  });

  // src/diff/engine.ts
  function fieldAclLevelIndex(value) {
    if (value == null) return -1;
    return FIELD_ACL_LEVEL_ORDER.indexOf(String(value).toUpperCase());
  }
  function detectRowSeverity(row) {
    const sec = row?.sectionKey || "";
    const rawPath = String(row?.path || "");
    const pathLower = rawPath.toLowerCase();
    const leafMatch = rawPath.match(/([^[.\]]+)(?:\[\d+\])?$/);
    const leaf = leafMatch ? leafMatch[1] : "";
    if (row?.moved && row?.type === "changed") return "low";
    if (row?.notationOnly || row?.emptyOnly) return "low";
    if (LOW_PRIORITY_LEAF_KEYS.has(leaf) && row?.type === "changed") return "low";
    if ((sec === "appAcl" || sec === "recordPermissions") && ACL_GRANT_FLAG_KEYS.has(leaf) && row?.type === "changed") {
      if (row?.left === true && row?.right === false) return "high";
      if (row?.left === false && row?.right === true) return "medium";
    }
    if (sec === "fieldAcl" && leaf === "accessibility" && row?.type === "changed") {
      const lIdx = fieldAclLevelIndex(row?.left);
      const rIdx = fieldAclLevelIndex(row?.right);
      if (lIdx >= 0 && rIdx >= 0) {
        if (rIdx < lIdx) return "high";
        if (rIdx > lIdx) return "medium";
      }
    }
    if (sec === "processSettings" && leaf === "enable" && row?.type === "changed") {
      if (row?.left === true && row?.right === false) return "high";
      if (row?.left === false && row?.right === true) return "medium";
    }
    if (sec === "pluginSettings") {
      if (/^pluginSettings\.plugins\[\d+\]$/.test(rawPath)) {
        if (row?.type === "removed") return "high";
        if (row?.type === "added") return "medium";
      }
      if (leaf === "enabled" && row?.type === "changed") {
        if (row?.left === true && row?.right === false) return "high";
        if (row?.left === false && row?.right === true) return "medium";
      }
      if (leaf === "version" && row?.type === "changed") return "medium";
    }
    if (sec === "customizeSettings" && row?.type === "removed" && /^customizeSettings\.(?:desktop|mobile)\.(?:js|css)\[\d+\]$/.test(rawPath)) {
      return "high";
    }
    if (row?.type === "removed" && rawPath === sec) return "high";
    if (row?.type === "removed") {
      if (HIGH_IMPACT_SECTIONS.has(sec)) return "high";
      if (MEDIUM_IMPACT_SECTIONS.has(sec)) return "medium";
      return "low";
    }
    if (HIGH_IMPACT_SECTIONS.has(sec)) return "high";
    if (pathLower.includes("lookup") || pathLower.includes("relatedapp") || pathLower.includes("condition")) return "high";
    if (MEDIUM_IMPACT_SECTIONS.has(sec)) return "medium";
    return "low";
  }
  function isPlainObject(v) {
    return !!v && typeof v === "object" && !Array.isArray(v);
  }
  function isEmptyLikeValue(v) {
    if (v == null) return true;
    if (typeof v === "string") return v.trim() === "";
    if (Array.isArray(v)) return v.length === 0;
    if (isPlainObject(v)) return Object.keys(v).length === 0;
    return false;
  }
  function isNotationOnlyChange(a, b) {
    const isPrim = (v) => v != null && (typeof v === "string" || typeof v === "number" || typeof v === "boolean");
    if (!isPrim(a) || !isPrim(b)) return false;
    if (a === b) return false;
    const sa = String(a).trim();
    const sb = String(b).trim();
    if (sa === sb) return true;
    if (sa !== "" && sb !== "" && !Number.isNaN(Number(sa)) && !Number.isNaN(Number(sb)) && Number(sa) === Number(sb)) return true;
    const la = sa.toLowerCase();
    const lb = sb.toLowerCase();
    if ((la === "true" || la === "false") && la === lb) return true;
    return false;
  }
  function classifyChangedValuePair(a, b) {
    if (isEmptyLikeValue(a) && isEmptyLikeValue(b)) return { emptyOnly: true };
    if (isNotationOnlyChange(a, b)) return { notationOnly: true };
    return null;
  }
  function getPathLeafKey(path) {
    const m = String(path || "").match(/([^[.\]]+)(?:\[\d+\])?$/);
    return m ? m[1] : "";
  }
  function normalizeIgnoreToken(token) {
    return String(token || "").replace(/[\u200b\u200c\u200d\ufeff]/g, "").replace(/^[\s\u3000]+|[\s\u3000]+$/g, "").toLowerCase();
  }
  function tokenLooksLikePath(token) {
    return token.includes(".") || token.includes("[");
  }
  function tokenHasWildcard(token) {
    return token.includes("*");
  }
  function compileWildcardRegex(token) {
    const escaped = token.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
    return new RegExp(`^${escaped}$`);
  }
  function parseIgnoreRules(text) {
    const keySet = new Set(DEFAULT_IGNORE_KEYS);
    const pathSet = /* @__PURE__ */ new Set();
    const keyPatterns = [];
    const pathPatterns = [];
    String(text || "").split(/[\n\r,、，;；\s\u3000]+/).map(normalizeIgnoreToken).filter(Boolean).forEach((token) => {
      const isPath = tokenLooksLikePath(token);
      const cleaned = isPath ? token.replace(/\s+/g, "") : token;
      if (tokenHasWildcard(cleaned)) {
        try {
          const re = compileWildcardRegex(cleaned);
          if (isPath) pathPatterns.push(re);
          else keyPatterns.push(re);
        } catch {
        }
        return;
      }
      if (isPath) pathSet.add(cleaned);
      else keySet.add(cleaned);
    });
    return { keySet, pathSet, keyPatterns, pathPatterns };
  }
  function matchAnyPattern(patterns, value) {
    if (!Array.isArray(patterns) || !patterns.length || !value) return false;
    for (const re of patterns) {
      if (re.test(value)) return true;
    }
    return false;
  }
  function isIgnoredKey(ignoreRules, key) {
    const normalized = normalizeIgnoreToken(key);
    if (!normalized) return false;
    if (ignoreRules.keySet.has(normalized)) return true;
    return matchAnyPattern(ignoreRules.keyPatterns, normalized);
  }
  function isIgnoredPath(ignoreRules, path) {
    const normalizedPath = normalizeIgnoreToken(path).replace(/\s+/g, "");
    if (!normalizedPath) return false;
    if (ignoreRules.pathSet.has(normalizedPath)) return true;
    if (matchAnyPattern(ignoreRules.pathPatterns, normalizedPath)) return true;
    const leaf = getPathLeafKey(normalizedPath);
    if (!leaf) return false;
    if (ignoreRules.keySet.has(leaf)) return true;
    return matchAnyPattern(ignoreRules.keyPatterns, leaf);
  }
  function pushDiffRow(out, row, ignoreRules) {
    if (!row) return false;
    if (isIgnoredPath(ignoreRules, row.path)) return false;
    if (row.type === "same") {
      const sameCount = Number(out?.__sameCount || 0);
      if (sameCount >= SAME_ROW_LIMIT) return false;
      if (out) out.__sameCount = sameCount + 1;
      out.push(row);
      return true;
    }
    const diffCount = Number(out?.__diffCount || 0);
    if (diffCount >= ARRAY_DIFF_LIMIT) return false;
    if (out) out.__diffCount = diffCount + 1;
    out.push(row);
    return true;
  }
  function getCollectedDiffCount(rows) {
    if (!Array.isArray(rows)) return 0;
    const count = Number(rows.__diffCount);
    if (Number.isFinite(count)) return count;
    return rows.filter((row) => row?.type !== "same").length;
  }
  function canCollectSameRows(rows) {
    if (!Array.isArray(rows)) return false;
    if (!rows.__includeSame) return false;
    const count = Number(rows.__sameCount);
    if (Number.isFinite(count)) return count < SAME_ROW_LIMIT;
    return rows.filter((row) => row?.type === "same").length < SAME_ROW_LIMIT;
  }
  function normalizeForCompare(v, ignoreRules) {
    if (Array.isArray(v)) return v.map((x) => normalizeForCompare(x, ignoreRules));
    if (v && typeof v === "object") {
      const o = {};
      Object.keys(v).sort().forEach((k) => {
        if (META_KEYS.has(k) || isIgnoredKey(ignoreRules, k)) return;
        o[k] = normalizeForCompare(v[k], ignoreRules);
      });
      return o;
    }
    return v;
  }
  function makeArrayItemSignature(v, ignoreRules) {
    return JSON.stringify(normalizeForCompare(v, ignoreRules));
  }
  function hasUniquePrimitiveKey(arr, key) {
    const seen = /* @__PURE__ */ new Set();
    for (const obj of arr) {
      if (!isPlainObject(obj) || !Object.prototype.hasOwnProperty.call(obj, key)) return false;
      const val = obj[key];
      if (val == null || typeof val === "object") return false;
      if (typeof val === "boolean") return false;
      const sig = `${typeof val}:${String(val)}`;
      if (seen.has(sig)) return false;
      seen.add(sig);
    }
    return true;
  }
  function detectArrayObjectKey(a, b, ignoreRules) {
    if (!a.length || !b.length) return null;
    if (!a.every(isPlainObject) || !b.every(isPlainObject)) return null;
    const firstA = a.find(isPlainObject) || {};
    const firstB = b.find(isPlainObject) || {};
    const fallback = Object.keys(firstA).filter((k) => Object.prototype.hasOwnProperty.call(firstB, k));
    const candidates = [...ARRAY_KEY_CANDIDATES, ...fallback.filter((k) => !ARRAY_KEY_CANDIDATES.includes(k))];
    for (const key of candidates) {
      if (isIgnoredKey(ignoreRules, key)) continue;
      if (hasUniquePrimitiveKey(a, key) && hasUniquePrimitiveKey(b, key)) return key;
    }
    return null;
  }
  function buildArrayKeyMap(arr, key) {
    const map = /* @__PURE__ */ new Map();
    for (let i = 0; i < arr.length; i++) {
      const item = arr[i];
      const val = item?.[key];
      const sig = `${typeof val}:${String(val)}`;
      map.set(sig, { idx: i, item });
    }
    return map;
  }
  function collectArrayDiffsByObjectKey(a, b, path, out, ignoreRules) {
    const key = detectArrayObjectKey(a, b, ignoreRules);
    if (!key) return false;
    const mapA = buildArrayKeyMap(a, key);
    const mapB = buildArrayKeyMap(b, key);
    const ordered = [];
    const seen = /* @__PURE__ */ new Set();
    for (const item of a) {
      const sig = `${typeof item[key]}:${String(item[key])}`;
      if (seen.has(sig)) continue;
      seen.add(sig);
      ordered.push(sig);
    }
    for (const item of b) {
      const sig = `${typeof item[key]}:${String(item[key])}`;
      if (seen.has(sig)) continue;
      seen.add(sig);
      ordered.push(sig);
    }
    for (const sig of ordered) {
      if (getCollectedDiffCount(out) >= ARRAY_DIFF_LIMIT) return true;
      const left = mapA.get(sig);
      const right = mapB.get(sig);
      if (!left && right) {
        pushDiffRow(out, {
          type: "added",
          path: `${path}[${right.idx}]`,
          left: void 0,
          right: right.item,
          arrayKey: key,
          arrayKeyValue: right.item?.[key]
        }, ignoreRules);
        continue;
      }
      if (left && !right) {
        pushDiffRow(out, {
          type: "removed",
          path: `${path}[${left.idx}]`,
          left: left.item,
          right: void 0,
          arrayKey: key,
          arrayKeyValue: left.item?.[key]
        }, ignoreRules);
        continue;
      }
      if (!left || !right) continue;
      const leftSig = makeArrayItemSignature(left.item, ignoreRules);
      const rightSig = makeArrayItemSignature(right.item, ignoreRules);
      if (leftSig === rightSig) {
        if (left.idx !== right.idx) {
          pushDiffRow(out, {
            type: "changed",
            path: `${path}[${right.idx}]`,
            left: left.item,
            right: right.item,
            moved: true,
            movedFrom: left.idx,
            movedTo: right.idx,
            arrayKey: key,
            arrayKeyValue: right.item?.[key]
          }, ignoreRules);
        } else if (canCollectSameRows(out)) {
          pushDiffRow(out, {
            type: "same",
            path: `${path}[${right.idx}]`,
            left: left.item,
            right: right.item,
            severity: "low",
            arrayKey: key,
            arrayKeyValue: right.item?.[key]
          }, ignoreRules);
        }
        continue;
      }
      const start = out.length;
      collectDeepDiffs(left.item, right.item, `${path}[${right.idx}]`, out, ignoreRules);
      const keyVal = right.item?.[key] != null ? right.item[key] : left.item?.[key];
      for (let oi = start; oi < out.length; oi++) {
        if (!out[oi].arrayKey) out[oi].arrayKey = key;
        if (out[oi].arrayKeyValue === void 0) out[oi].arrayKeyValue = keyVal;
      }
      if (getCollectedDiffCount(out) >= ARRAY_DIFF_LIMIT) return true;
    }
    return true;
  }
  function entityIdentitySig(entity) {
    if (!entity || typeof entity !== "object") return null;
    const type = entity.type != null ? String(entity.type) : "";
    const code = entity.code != null ? String(entity.code) : entity.login != null ? String(entity.login) : "";
    if (!type && !code) return null;
    return `${type}:${code}`;
  }
  function findCompositeArrayRule(path) {
    const p = String(path || "");
    for (const rule of COMPOSITE_ARRAY_RULES) {
      if (rule.pattern.test(p)) return rule;
    }
    return null;
  }
  function collectArrayDiffsByCompositeKey(a, b, path, out, ignoreRules) {
    const rule = findCompositeArrayRule(path);
    if (!rule) return false;
    if (!a.length && !b.length) return false;
    if (!a.every(isPlainObject) || !b.every(isPlainObject)) return false;
    if (rule.applies && !rule.applies(a, b)) return false;
    const buildMap = (arr) => {
      const map = /* @__PURE__ */ new Map();
      for (let i = 0; i < arr.length; i++) {
        const sig = rule.makeSig(arr[i]);
        if (sig == null) return null;
        if (map.has(sig)) return null;
        map.set(sig, { idx: i, item: arr[i] });
      }
      return map;
    };
    const mapA = buildMap(a);
    const mapB = buildMap(b);
    if (!mapA || !mapB) return false;
    const ordered = [];
    const seen = /* @__PURE__ */ new Set();
    for (const sig of mapA.keys()) {
      if (!seen.has(sig)) {
        seen.add(sig);
        ordered.push(sig);
      }
    }
    for (const sig of mapB.keys()) {
      if (!seen.has(sig)) {
        seen.add(sig);
        ordered.push(sig);
      }
    }
    for (const sig of ordered) {
      if (getCollectedDiffCount(out) >= ARRAY_DIFF_LIMIT) return true;
      const left = mapA.get(sig);
      const right = mapB.get(sig);
      if (!left && right) {
        pushDiffRow(out, {
          type: "added",
          path: `${path}[${right.idx}]`,
          left: void 0,
          right: right.item,
          arrayKey: rule.arrayKey,
          arrayKeyValue: rule.keyValue(right.item)
        }, ignoreRules);
        continue;
      }
      if (left && !right) {
        pushDiffRow(out, {
          type: "removed",
          path: `${path}[${left.idx}]`,
          left: left.item,
          right: void 0,
          arrayKey: rule.arrayKey,
          arrayKeyValue: rule.keyValue(left.item)
        }, ignoreRules);
        continue;
      }
      if (!left || !right) continue;
      const leftSig = makeArrayItemSignature(left.item, ignoreRules);
      const rightSig = makeArrayItemSignature(right.item, ignoreRules);
      if (leftSig === rightSig) {
        if (left.idx !== right.idx) {
          pushDiffRow(out, {
            type: "changed",
            path: `${path}[${right.idx}]`,
            left: left.item,
            right: right.item,
            moved: true,
            movedFrom: left.idx,
            movedTo: right.idx,
            arrayKey: rule.arrayKey,
            arrayKeyValue: rule.keyValue(right.item)
          }, ignoreRules);
        } else if (canCollectSameRows(out)) {
          pushDiffRow(out, {
            type: "same",
            path: `${path}[${right.idx}]`,
            left: left.item,
            right: right.item,
            severity: "low",
            arrayKey: rule.arrayKey,
            arrayKeyValue: rule.keyValue(right.item)
          }, ignoreRules);
        }
        continue;
      }
      const start = out.length;
      collectDeepDiffs(left.item, right.item, `${path}[${right.idx}]`, out, ignoreRules);
      const keyVal = rule.keyValue(right.item) !== void 0 ? rule.keyValue(right.item) : rule.keyValue(left.item);
      for (let oi = start; oi < out.length; oi++) {
        if (!out[oi].arrayKey) out[oi].arrayKey = rule.arrayKey;
        if (out[oi].arrayKeyValue === void 0) out[oi].arrayKeyValue = keyVal;
      }
      if (getCollectedDiffCount(out) >= ARRAY_DIFF_LIMIT) return true;
    }
    return true;
  }
  function collectArrayDiffsByPureReorder(a, b, path, out, ignoreRules) {
    if (a.length !== b.length || a.length < 2) return false;
    const sigA = a.map((x) => makeArrayItemSignature(x, ignoreRules));
    const sigB = b.map((x) => makeArrayItemSignature(x, ignoreRules));
    if ([...sigA].sort().join("\0") !== [...sigB].sort().join("\0")) return false;
    const used = new Array(a.length).fill(false);
    for (let j = 0; j < b.length; j++) {
      if (getCollectedDiffCount(out) >= ARRAY_DIFF_LIMIT) return true;
      let from = -1;
      for (let i = 0; i < a.length; i++) {
        if (!used[i] && sigA[i] === sigB[j]) {
          from = i;
          break;
        }
      }
      if (from < 0) continue;
      used[from] = true;
      if (from === j) {
        if (canCollectSameRows(out)) {
          pushDiffRow(out, { type: "same", path: `${path}[${j}]`, left: a[from], right: b[j], severity: "low" }, ignoreRules);
        }
        continue;
      }
      pushDiffRow(out, {
        type: "changed",
        path: `${path}[${j}]`,
        left: a[from],
        right: b[j],
        moved: true,
        movedFrom: from,
        movedTo: j
      }, ignoreRules);
    }
    return true;
  }
  function escapeRegExpLiteral(s) {
    return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
  function mergeAddRemovePairsAsMoved(out, startIdx, path, ignoreRules) {
    const childRe = new RegExp(`^${escapeRegExpLiteral(path)}\\[(\\d+)\\]$`);
    const removedBySig = /* @__PURE__ */ new Map();
    for (let i = startIdx; i < out.length; i++) {
      const row = out[i];
      if (!row || row.type !== "removed") continue;
      if (!childRe.test(String(row.path || ""))) continue;
      const sig = makeArrayItemSignature(row.left, ignoreRules);
      if (!removedBySig.has(sig)) removedBySig.set(sig, []);
      removedBySig.get(sig).push(i);
    }
    if (!removedBySig.size) return;
    const consumed = /* @__PURE__ */ new Set();
    let merged = 0;
    for (let i = startIdx; i < out.length; i++) {
      const row = out[i];
      if (!row || row.type !== "added") continue;
      const toMatch = childRe.exec(String(row.path || ""));
      if (!toMatch) continue;
      const sig = makeArrayItemSignature(row.right, ignoreRules);
      const bucket = removedBySig.get(sig);
      if (!bucket || !bucket.length) continue;
      const removedIdx = bucket.shift();
      const removedRow = out[removedIdx];
      const fromMatch = childRe.exec(String(removedRow.path || ""));
      out[i] = {
        ...row,
        type: "changed",
        left: removedRow.left,
        moved: true,
        movedFrom: fromMatch ? Number(fromMatch[1]) : void 0,
        movedTo: Number(toMatch[1])
      };
      consumed.add(removedIdx);
      merged += 1;
    }
    if (!merged) return;
    for (let i = out.length - 1; i >= startIdx; i--) {
      if (consumed.has(i)) out.splice(i, 1);
    }
    const diffCount = Number(out.__diffCount);
    if (Number.isFinite(diffCount)) out.__diffCount = Math.max(0, diffCount - merged);
  }
  function collectArrayDiffsByLcs(a, b, path, out, ignoreRules) {
    const n = a.length;
    const m = b.length;
    if (!n && !m) return true;
    if (!n) {
      for (let j2 = 0; j2 < m; j2++) {
        if (getCollectedDiffCount(out) >= ARRAY_DIFF_LIMIT) return true;
        pushDiffRow(out, { type: "added", path: `${path}[${j2}]`, left: void 0, right: b[j2] }, ignoreRules);
      }
      return true;
    }
    if (!m) {
      for (let i2 = 0; i2 < n; i2++) {
        if (getCollectedDiffCount(out) >= ARRAY_DIFF_LIMIT) return true;
        pushDiffRow(out, { type: "removed", path: `${path}[${i2}]`, left: a[i2], right: void 0 }, ignoreRules);
      }
      return true;
    }
    if (n * m > ARRAY_LCS_MAX_CELLS) return false;
    const sigA = a.map((x) => makeArrayItemSignature(x, ignoreRules));
    const sigB = b.map((x) => makeArrayItemSignature(x, ignoreRules));
    const dp = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
    for (let i2 = n - 1; i2 >= 0; i2--) {
      for (let j2 = m - 1; j2 >= 0; j2--) {
        dp[i2][j2] = sigA[i2] === sigB[j2] ? dp[i2 + 1][j2 + 1] + 1 : Math.max(dp[i2 + 1][j2], dp[i2][j2 + 1]);
      }
    }
    const mergeStart = out.length;
    let i = 0;
    let j = 0;
    while (i < n || j < m) {
      if (getCollectedDiffCount(out) >= ARRAY_DIFF_LIMIT) break;
      if (i < n && j < m && sigA[i] === sigB[j]) {
        if (canCollectSameRows(out)) {
          pushDiffRow(out, {
            type: "same",
            path: `${path}[${j}]`,
            left: a[i],
            right: b[j],
            severity: "low"
          }, ignoreRules);
        }
        i += 1;
        j += 1;
        continue;
      }
      if (i < n && j < m) {
        const sameType = Object.prototype.toString.call(a[i]) === Object.prototype.toString.call(b[j]);
        if (sameType && dp[i + 1][j + 1] >= dp[i + 1][j] && dp[i + 1][j + 1] >= dp[i][j + 1]) {
          collectDeepDiffs(a[i], b[j], `${path}[${j}]`, out, ignoreRules);
          i += 1;
          j += 1;
          continue;
        }
      }
      const down = i < n ? dp[i + 1][j] : -1;
      const right = j < m ? dp[i][j + 1] : -1;
      if (j < m && (i >= n || right >= down)) {
        pushDiffRow(out, { type: "added", path: `${path}[${j}]`, left: void 0, right: b[j] }, ignoreRules);
        j += 1;
      } else if (i < n) {
        pushDiffRow(out, { type: "removed", path: `${path}[${i}]`, left: a[i], right: void 0 }, ignoreRules);
        i += 1;
      } else {
        break;
      }
    }
    mergeAddRemovePairsAsMoved(out, mergeStart, path, ignoreRules);
    return true;
  }
  function collectArrayDiffs(a, b, path, out, ignoreRules) {
    if (collectArrayDiffsByCompositeKey(a, b, path, out, ignoreRules)) return;
    if (collectArrayDiffsByObjectKey(a, b, path, out, ignoreRules)) return;
    if (collectArrayDiffsByPureReorder(a, b, path, out, ignoreRules)) return;
    if (collectArrayDiffsByLcs(a, b, path, out, ignoreRules)) return;
    const max = Math.max(a.length, b.length);
    for (let i = 0; i < max; i++) {
      if (getCollectedDiffCount(out) >= ARRAY_DIFF_LIMIT) return;
      const p = `${path}[${i}]`;
      if (i >= a.length) pushDiffRow(out, { type: "added", path: p, left: void 0, right: b[i] }, ignoreRules);
      else if (i >= b.length) pushDiffRow(out, { type: "removed", path: p, left: a[i], right: void 0 }, ignoreRules);
      else collectDeepDiffs(a[i], b[i], p, out, ignoreRules);
    }
  }
  function collectDeepDiffs(a, b, path, out, ignoreRules) {
    if (getCollectedDiffCount(out) >= ARRAY_DIFF_LIMIT) return;
    if (isIgnoredPath(ignoreRules, path)) return;
    if (a === b) {
      if (canCollectSameRows(out)) {
        pushDiffRow(out, { type: "same", path, left: a, right: b, severity: "low" }, ignoreRules);
      }
      return;
    }
    const ta = Object.prototype.toString.call(a);
    const tb = Object.prototype.toString.call(b);
    if (ta !== tb) {
      pushDiffRow(out, { type: "changed", path, left: a, right: b, ...classifyChangedValuePair(a, b) || {} }, ignoreRules);
      return;
    }
    if (a == null || b == null) {
      pushDiffRow(out, { type: "changed", path, left: a, right: b, ...classifyChangedValuePair(a, b) || {} }, ignoreRules);
      return;
    }
    if (Array.isArray(a)) {
      if (makeArrayItemSignature(a, ignoreRules) === makeArrayItemSignature(b, ignoreRules)) {
        if (canCollectSameRows(out)) {
          pushDiffRow(out, { type: "same", path, left: a, right: b, severity: "low" }, ignoreRules);
        }
        return;
      }
      collectArrayDiffs(a, b, path, out, ignoreRules);
      return;
    }
    if (typeof a === "object") {
      if (makeArrayItemSignature(a, ignoreRules) === makeArrayItemSignature(b, ignoreRules)) {
        if (canCollectSameRows(out)) {
          pushDiffRow(out, { type: "same", path, left: a, right: b, severity: "low" }, ignoreRules);
        }
        return;
      }
      const keys = [.../* @__PURE__ */ new Set([...Object.keys(a), ...Object.keys(b)])].sort();
      for (const k of keys) {
        if (META_KEYS.has(k) || isIgnoredKey(ignoreRules, k)) continue;
        const p = path ? `${path}.${k}` : k;
        if (!Object.prototype.hasOwnProperty.call(b, k)) pushDiffRow(out, { type: "removed", path: p, left: a[k], right: void 0, ...isEmptyLikeValue(a[k]) ? { emptyOnly: true } : {} }, ignoreRules);
        else if (!Object.prototype.hasOwnProperty.call(a, k)) pushDiffRow(out, { type: "added", path: p, left: void 0, right: b[k], ...isEmptyLikeValue(b[k]) ? { emptyOnly: true } : {} }, ignoreRules);
        else collectDeepDiffs(a[k], b[k], p, out, ignoreRules);
        if (getCollectedDiffCount(out) >= ARRAY_DIFF_LIMIT) return;
      }
      return;
    }
    pushDiffRow(out, { type: "changed", path, left: a, right: b, ...classifyChangedValuePair(a, b) || {} }, ignoreRules);
  }
  function preprocessCustomizePairForDiff(src, tgt) {
    const sClone = src && typeof src === "object" ? deepClone(src) : src;
    const tClone = tgt && typeof tgt === "object" ? deepClone(tgt) : tgt;
    const injectName = (bundle) => {
      if (!bundle || typeof bundle !== "object") return;
      for (const platform of ["desktop", "mobile"]) {
        for (const kind of ["js", "css"]) {
          const arr = bundle?.[platform]?.[kind];
          if (!Array.isArray(arr)) continue;
          for (const item of arr) {
            if (!item || typeof item !== "object" || item.name) continue;
            if (item.type === "FILE") {
              item.name = String(item?.file?.name || item?.file?.fileKey || "(ファイル未設定)");
            } else if (item.type === "URL") {
              item.name = String(item.url || "(URL未設定)");
            }
          }
        }
      }
    };
    injectName(sClone);
    injectName(tClone);
    const swapBodyOrCleanup = (item, counterpart) => {
      if (!item || typeof item !== "object") return;
      const sBody = item._bodyText;
      const cBody = counterpart?._bodyText;
      if (item.type === "FILE" && item.file && typeof item.file === "object" && sBody != null && cBody != null) {
        const newFile = { ...item.file };
        newFile._body = String(sBody);
        delete newFile.fileKey;
        item.file = newFile;
      }
      if ("_bodyText" in item) delete item._bodyText;
      if ("_bodyHash" in item) delete item._bodyHash;
    };
    for (const platform of ["desktop", "mobile"]) {
      for (const kind of ["js", "css"]) {
        const sArr = sClone?.[platform]?.[kind];
        const tArr = tClone?.[platform]?.[kind];
        const sList = Array.isArray(sArr) ? sArr : [];
        const tList = Array.isArray(tArr) ? tArr : [];
        const tByName = /* @__PURE__ */ new Map();
        tList.forEach((it) => {
          if (it && typeof it === "object" && it.name) tByName.set(String(it.name), it);
        });
        const sByName = /* @__PURE__ */ new Map();
        sList.forEach((it) => {
          if (it && typeof it === "object" && it.name) sByName.set(String(it.name), it);
        });
        sList.forEach((it) => swapBodyOrCleanup(it, tByName.get(String(it?.name || ""))));
        tList.forEach((it) => swapBodyOrCleanup(it, sByName.get(String(it?.name || ""))));
      }
    }
    return { source: sClone, target: tClone };
  }
  function preprocessPluginSettingsForDiff(value) {
    if (!value || typeof value !== "object") return value;
    const cloned = deepClone(value);
    if (!Array.isArray(cloned.plugins)) return cloned;
    cloned.plugins.forEach((p) => {
      if (!p || typeof p !== "object") return;
      if (p._config !== void 0) {
        p.config = p._config;
        delete p._config;
      }
    });
    return cloned;
  }
  function stripStateBodyForRenameMatch(value) {
    const drop = /* @__PURE__ */ new Set(["name", "index"]);
    const walk = (v) => {
      if (Array.isArray(v)) return v.map(walk);
      if (v && typeof v === "object") {
        const o = {};
        Object.keys(v).sort().forEach((k) => {
          if (drop.has(k)) return;
          o[k] = walk(v[k]);
        });
        return o;
      }
      return v;
    };
    return walk(value);
  }
  function detectProcessStateRenames(sourceProcess, targetProcess) {
    const out = /* @__PURE__ */ new Map();
    if (!sourceProcess || !targetProcess) return out;
    const srcStates = sourceProcess.states && typeof sourceProcess.states === "object" ? sourceProcess.states : {};
    const tgtStates = targetProcess.states && typeof targetProcess.states === "object" ? targetProcess.states : {};
    const onlyInSrc = Object.keys(srcStates).filter((k) => !Object.prototype.hasOwnProperty.call(tgtStates, k));
    const onlyInTgt = Object.keys(tgtStates).filter((k) => !Object.prototype.hasOwnProperty.call(srcStates, k));
    if (!onlyInSrc.length || !onlyInTgt.length) return out;
    const candidates = [];
    onlyInSrc.forEach((from) => {
      onlyInTgt.forEach((to) => {
        const lhs = srcStates[from];
        const rhs = tgtStates[to];
        const sigL = stableStringify(stripStateBodyForRenameMatch(lhs));
        const sigR = stableStringify(stripStateBodyForRenameMatch(rhs));
        let score = 0;
        if (sigL === sigR) score += 5;
        const aL = lhs?.assignee;
        const aR = rhs?.assignee;
        if (aL && aR && aL.type === aR.type) score += 1;
        if (Array.isArray(aL?.entities) && Array.isArray(aR?.entities) && stableStringify(aL.entities) === stableStringify(aR.entities)) score += 1;
        if (score < 5) return;
        candidates.push({ from, to, score });
      });
    });
    candidates.sort((a, b) => b.score - a.score);
    const usedFrom = /* @__PURE__ */ new Set();
    const usedTo = /* @__PURE__ */ new Set();
    candidates.forEach((c) => {
      if (usedFrom.has(c.from) || usedTo.has(c.to)) return;
      usedFrom.add(c.from);
      usedTo.add(c.to);
      out.set(c.from, c.to);
    });
    return out;
  }
  function applyProcessStateRenamesToSource(sourceProcess, renameMap) {
    if (!sourceProcess || !renameMap || !renameMap.size) return sourceProcess;
    const cloned = deepClone(sourceProcess);
    if (cloned.states && typeof cloned.states === "object" && !Array.isArray(cloned.states)) {
      const newStates = {};
      Object.keys(cloned.states).forEach((k) => {
        const newKey = renameMap.get(k) || k;
        const obj = cloned.states[k];
        if (obj && typeof obj === "object" && obj.name === k && renameMap.has(k)) {
          obj.name = newKey;
        }
        newStates[newKey] = obj;
      });
      cloned.states = newStates;
    }
    if (Array.isArray(cloned.actions)) {
      cloned.actions.forEach((act) => {
        if (!act || typeof act !== "object") return;
        if (typeof act.from === "string" && renameMap.has(act.from)) act.from = renameMap.get(act.from);
        if (typeof act.to === "string" && renameMap.has(act.to)) act.to = renameMap.get(act.to);
      });
    }
    return cloned;
  }
  function computeDiffRows(sourceBundle, targetBundle, sections, ignoreKeysText, options = {}) {
    const ignoreRules = parseIgnoreRules(ignoreKeysText);
    const presetState = options.normalizationPresetState || {};
    const includeSame = !!options.includeSame;
    const rows = [];
    rows.__diffCount = 0;
    rows.__sameCount = 0;
    rows.__includeSame = includeSame;
    const fetchIssues = [];
    for (const sec of sections) {
      const label = (SECTION_DEFS.find((x) => x.key === sec) || {}).label || sec;
      const s = sourceBundle.sections[sec];
      const t = targetBundle.sections[sec];
      if (s && s._fetchError || t && t._fetchError) {
        const sourceError = s?._fetchError ? String(s._fetchError) : "";
        const targetError = t?._fetchError ? String(t._fetchError) : "";
        const side = sourceError && targetError ? "both" : sourceError ? "source" : "target";
        fetchIssues.push({
          _id: `fetch:${sec}:${side}`,
          sectionKey: sec,
          section: label,
          side,
          sourceError,
          targetError,
          message: side === "both" ? `比較元: ${sourceError}
比較先: ${targetError}` : sourceError || targetError
        });
        continue;
      }
      if (!s && t) {
        pushDiffRow(rows, { sectionKey: sec, section: label, type: "added", path: sec, left: void 0, right: t }, ignoreRules);
        continue;
      }
      if (s && !t) {
        pushDiffRow(rows, { sectionKey: sec, section: label, type: "removed", path: sec, left: s, right: void 0 }, ignoreRules);
        continue;
      }
      if (!s && !t) continue;
      let sourceForSection = s;
      let targetForSection = t;
      let stateRenames = null;
      if (sec === "processSettings") {
        stateRenames = detectProcessStateRenames(s, t);
        if (stateRenames && stateRenames.size) {
          sourceForSection = applyProcessStateRenamesToSource(s, stateRenames);
        }
      } else if (sec === "customizeSettings") {
        const pair = preprocessCustomizePairForDiff(s, t);
        sourceForSection = pair.source;
        targetForSection = pair.target;
      } else if (sec === "pluginSettings") {
        sourceForSection = preprocessPluginSettingsForDiff(s);
        targetForSection = preprocessPluginSettingsForDiff(t);
      }
      const sourceForDiff = normalizeSectionForCompare(sec, sourceForSection, presetState);
      const targetForDiff = normalizeSectionForCompare(sec, targetForSection, presetState);
      if (stableStringify(sourceForDiff) === stableStringify(targetForDiff)) {
        if (includeSame) {
          pushDiffRow(rows, { sectionKey: sec, section: label, type: "same", path: sec, left: sourceForDiff, right: targetForDiff, severity: "low" }, ignoreRules);
        }
        continue;
      }
      const start = rows.length;
      collectDeepDiffs(sourceForDiff, targetForDiff, sec, rows, ignoreRules);
      for (let i = start; i < rows.length; i++) {
        if (!rows[i].section) rows[i].section = label;
        if (!rows[i].sectionKey) rows[i].sectionKey = sec;
        if (!rows[i].severity) rows[i].severity = detectRowSeverity(rows[i]);
      }
      if (sec === "processSettings" && stateRenames && stateRenames.size) {
        stateRenames.forEach((to, from) => {
          pushDiffRow(rows, {
            sectionKey: sec,
            section: label,
            type: "changed",
            path: `${sec}.states.__rename__`,
            left: { name: from },
            right: { name: to },
            severity: "low",
            _displayOnly: true,
            _stateRenameNotice: true,
            renameCandidate: {
              id: `state-rename:${from}:${to}`,
              fromCode: from,
              toCode: to,
              entityKind: "state",
              sectionKey: sec,
              score: 99,
              matchedBy: "process-state-cascade-suppressed"
            },
            reasonSummary: `ステータス改名：${from} → ${to}（参照を自動補正）`
          }, ignoreRules);
        });
      }
    }
    for (const row of rows) {
      if (!row.severity) row.severity = detectRowSeverity(row);
    }
    return {
      rows: rows.map((row, idx) => ({ ...row, _id: `d${idx}` })),
      fetchIssues
    };
  }
  function summarizeRows(rows) {
    const s = { total: rows.length, added: 0, removed: 0, changed: 0, moved: 0, same: 0 };
    for (const r of rows) {
      if (r.type === "same") s.same += 1;
      else if (r.type === "added") s.added += 1;
      else if (r.type === "removed") s.removed += 1;
      else {
        s.changed += 1;
        if (r.moved) s.moved += 1;
      }
    }
    return s;
  }
  function getActualDiffRows(rows) {
    return (rows || []).filter((row) => row && row.type !== "same" && !row._displayOnly);
  }
  function countActualDiffRows(rows) {
    return getActualDiffRows(rows).length;
  }
  function getDiffNormalizationPresetState() {
    return {
      viewOrder: !!ui.diffNormalizeViewOrder?.checked,
      permissionOrder: !!ui.diffNormalizePermissionOrder?.checked,
      generalArrayOrder: !!ui.diffNormalizeGeneralArrayOrder?.checked
    };
  }
  function getActiveDiffNormalizationConfig(sectionKey, presetState) {
    const stateMap = presetState || getDiffNormalizationPresetState();
    const active = [];
    Object.keys(DIFF_NORMALIZATION_PRESETS).forEach((key) => {
      if (!stateMap[key]) return;
      const preset = DIFF_NORMALIZATION_PRESETS[key];
      if (!preset?.sections?.has(sectionKey)) return;
      active.push(preset);
    });
    if (!active.length) return null;
    const ignoreKeys = /* @__PURE__ */ new Set();
    let unorderedArrays = false;
    active.forEach((preset) => {
      preset.ignoreKeys?.forEach((key) => ignoreKeys.add(normalizeIgnoreToken(key)));
      if (preset.unorderedArrays) unorderedArrays = true;
    });
    return { ignoreKeys, unorderedArrays };
  }
  function normalizeArrayForSectionCompare(arr, config) {
    const list = arr.map((item) => normalizeSectionValueForCompare(item, config));
    if (!config?.unorderedArrays) return list;
    return list.slice().sort((a, b) => {
      const sa = JSON.stringify(a);
      const sb = JSON.stringify(b);
      if (sa === sb) return 0;
      return sa < sb ? -1 : 1;
    });
  }
  function normalizeSectionValueForCompare(value, config) {
    if (Array.isArray(value)) return normalizeArrayForSectionCompare(value, config);
    if (value && typeof value === "object") {
      const out = {};
      Object.keys(value).sort().forEach((key) => {
        if (META_KEYS.has(key)) return;
        if (config?.ignoreKeys?.has(normalizeIgnoreToken(key))) return;
        out[key] = normalizeSectionValueForCompare(value[key], config);
      });
      return out;
    }
    return value;
  }
  function normalizeSectionForCompare(sectionKey, value, presetState) {
    const config = getActiveDiffNormalizationConfig(sectionKey, presetState);
    if (!config) return value;
    return normalizeSectionValueForCompare(value, config);
  }
  function getActiveDiffNormalizationLabels(presetState) {
    const stateMap = presetState || getDiffNormalizationPresetState();
    return Object.keys(DIFF_NORMALIZATION_PRESETS).filter((key) => !!stateMap[key]).map((key) => DIFF_NORMALIZATION_PRESETS[key].label);
  }
  function tokenizeForExpansion(path) {
    if (!path) return [];
    const out = [];
    const re = /([^[.\]]+)|\[(\d+)\]/g;
    let m;
    while ((m = re.exec(path)) !== null) {
      if (m[1] != null) out.push(m[1]);
      else out.push(Number(m[2]));
    }
    return out;
  }
  function aclEntityLabel(entity) {
    if (!entity || typeof entity !== "object") return "";
    const code = String(entity.code || "").trim();
    const type = String(entity.type || "").trim();
    if (!code) return type ? `(${type})` : "";
    return type ? `${code} (${type})` : code;
  }
  function enumerateNamedMap(obj, basePath, kind, kindLabel) {
    if (!obj || typeof obj !== "object" || Array.isArray(obj)) return [];
    return Object.keys(obj).map((name) => ({
      path: `${basePath}.${name}`,
      payload: obj[name],
      entityKind: kind,
      entityLabel: name,
      entityCode: name,
      reasonNoun: kindLabel
    }));
  }
  function enumerateArray(arr, basePath, kind, kindLabel, options = {}) {
    if (!Array.isArray(arr)) return [];
    return arr.map((item, idx) => {
      let label = "";
      let code = "";
      const keyField = options.keyField;
      if (item && typeof item === "object") {
        if (kind === "aclEntry" || kind === "recordAclEntry") {
          label = aclEntityLabel(item.entity);
          code = String(item.entity?.code || "");
        } else if (kind === "fieldAclEntry") {
          label = String(item.code || "");
          code = label;
        } else if (kind === "plugin") {
          const id = String(item.id || "");
          const name = String(item.name || "");
          label = name ? id ? `${name} (${id})` : name : id;
          code = id;
        } else if (kind === "jsCss") {
          const fileKey = item.file?.fileKey || item.fileKey || "";
          const url = item.url || "";
          label = url || (fileKey ? `ファイル(${String(fileKey).slice(0, 8)}…)` : "");
          code = String(fileKey || url || "");
        } else if (kind === "layoutRow") {
          const t = String(item.type || "").toUpperCase();
          if (t === "GROUP" && item.code) label = `グループ「${item.code}」`;
          else if (t === "SUBTABLE" && item.code) label = `テーブル「${item.code}」`;
          else label = `行 #${idx} (${t || "ROW"})`;
          code = String(item.code || "");
        } else if (kind === "notification" || kind === "perRecordNotification" || kind === "reminderNotification") {
          label = String(item.name || item.title || "").trim();
          if (!label && Array.isArray(item.recipients) && item.recipients.length) {
            const first = item.recipients[0];
            const rc = first?.entity?.code || first?.code || "";
            label = rc ? `${rc}${item.recipients.length > 1 ? " 他" : ""}` : "";
          }
          code = String(item.name || "");
        } else if (keyField) {
          label = String(item[keyField] || "");
          code = label;
        }
      }
      if (!label) {
        label = options.fallbackLabel ? options.fallbackLabel(item, idx) : `${kindLabel} #${idx}`;
      }
      return {
        path: `${basePath}[${idx}]`,
        payload: item,
        entityKind: kind,
        entityLabel: label,
        entityCode: code,
        reasonNoun: kindLabel
      };
    });
  }
  function computeSectionWideEntityChildren(sectionKey, payload) {
    if (!payload || typeof payload !== "object") return [];
    switch (sectionKey) {
      case "viewSettings":
        return enumerateNamedMap(payload.views, `${sectionKey}.views`, "view", "ビュー");
      case "reportSettings":
        return enumerateNamedMap(payload.reports, `${sectionKey}.reports`, "report", "グラフ");
      case "processSettings": {
        const out = [];
        out.push(...enumerateNamedMap(payload.states, `${sectionKey}.states`, "state", "ステータス"));
        out.push(...enumerateArray(payload.actions, `${sectionKey}.actions`, "action", "遷移アクション", { keyField: "name" }));
        return out;
      }
      case "actionSettings":
        return enumerateArray(payload.actions, `${sectionKey}.actions`, "appAction", "アクション", { keyField: "name" });
      case "appAcl":
        return enumerateArray(payload.rights, `${sectionKey}.rights`, "aclEntry", "権限エントリー");
      case "recordPermissions":
        return enumerateArray(payload.rights, `${sectionKey}.rights`, "recordAclEntry", "レコード権限エントリー");
      case "fieldAcl":
        return enumerateArray(payload.rights, `${sectionKey}.rights`, "fieldAclEntry", "フィールド権限");
      case "notifications":
        return enumerateArray(payload.notifications, `${sectionKey}.notifications`, "notification", "通知");
      case "perRecordNotifications":
        return enumerateArray(payload.notifications, `${sectionKey}.notifications`, "perRecordNotification", "レコード条件通知");
      case "reminderNotifications":
        return enumerateArray(payload.notifications, `${sectionKey}.notifications`, "reminderNotification", "リマインダー通知");
      case "categories":
        return enumerateNamedMap(payload.categories, `${sectionKey}.categories`, "category", "カテゴリ");
      case "pluginSettings":
        return enumerateArray(payload.plugins, `${sectionKey}.plugins`, "plugin", "プラグイン", { keyField: "id" });
      case "customizeSettings": {
        const out = [];
        ["desktop", "mobile"].forEach((platform) => {
          ["js", "css"].forEach((kind) => {
            const arr = payload?.[platform]?.[kind];
            if (Array.isArray(arr)) {
              const platLabel = platform === "desktop" ? "デスクトップ" : "モバイル";
              const kindLabel = kind.toUpperCase();
              out.push(...enumerateArray(arr, `${sectionKey}.${platform}.${kind}`, "jsCss", `${platLabel}/${kindLabel}`).map((spec) => ({
                ...spec,
                entityLabel: `${platLabel}/${kindLabel}: ${spec.entityLabel}`
              })));
            }
          });
        });
        return out;
      }
      case "layoutSettings":
        return enumerateArray(payload.layout, `${sectionKey}.layout`, "layoutRow", "レイアウト行");
      default:
        return [];
    }
  }
  function expandEntityRowsForDisplay(rows) {
    if (!Array.isArray(rows) || !rows.length) return rows || [];
    const out = [];
    rows.forEach((row, idx) => {
      out.push(row);
      if (!row || row._displayOnly) return;
      if (row.sectionKey === "fieldSettings") return;
      const isAdded = row.type === "added";
      const isRemoved = row.type === "removed";
      if (!isAdded && !isRemoved) return;
      const sectionKey = String(row.sectionKey || "");
      if (!sectionKey) return;
      const path = String(row.path || "");
      const tokens = tokenizeForExpansion(path);
      const isSectionWide = path === sectionKey;
      if (!isSectionWide) return;
      const payload = isAdded ? row.right : row.left;
      let children = computeSectionWideEntityChildren(sectionKey, payload);
      if (!children.length) return;
      if (children.length > ENTITY_EXPAND_LIMIT) children = children.slice(0, ENTITY_EXPAND_LIMIT);
      const parentId = row._id || `d${idx}`;
      let childIdx = 0;
      children.forEach((spec) => {
        out.push({
          ...row,
          _id: `${parentId}::echild::${childIdx++}`,
          _parentRowId: parentId,
          _expandedFromEntity: true,
          _displayOnly: true,
          path: spec.path,
          left: isRemoved ? spec.payload : void 0,
          right: isAdded ? spec.payload : void 0,
          type: row.type,
          moved: false,
          entityKind: spec.entityKind,
          entityLabel: spec.entityLabel,
          entityCode: spec.entityCode || "",
          entityPropLabel: "",
          reasonSummary: isAdded ? `${spec.reasonNoun}追加：${spec.entityLabel}` : `${spec.reasonNoun}削除：${spec.entityLabel}`,
          renameCandidate: null,
          impactCount: 0,
          impactRefs: [],
          impactSummary: ""
        });
      });
    });
    return out;
  }
  function expandSubtableRowsForDisplay(rows) {
    if (!Array.isArray(rows) || !rows.length) return rows || [];
    const out = [];
    rows.forEach((row, idx) => {
      out.push(row);
      if (!row || row._displayOnly) return;
      if (row.sectionKey !== "fieldSettings") return;
      const isAdded = row.type === "added";
      const isRemoved = row.type === "removed";
      if (!isAdded && !isRemoved) return;
      const pathMatch = SUBTABLE_ROOT_PATH_RE.exec(String(row.path || ""));
      if (!pathMatch) return;
      const payload = isAdded ? row.right : row.left;
      if (!payload || typeof payload !== "object" || Array.isArray(payload)) return;
      if (payload.type !== "SUBTABLE") return;
      const inner = payload.fields;
      if (!inner || typeof inner !== "object" || Array.isArray(inner)) return;
      const tableLabel = String(payload.label || payload.name || pathMatch[1]);
      const parentId = row._id || `d${idx}`;
      let childIdx = 0;
      Object.keys(inner).forEach((code) => {
        const field = inner[code];
        if (!field || typeof field !== "object" || Array.isArray(field)) return;
        const childPath = `${row.path}.fields.${code}`;
        const childLabel = String(field.label || field.name || field.code || code);
        const reason = isAdded ? `テーブル「${tableLabel}」内のフィールド追加 (${childLabel})` : `テーブル「${tableLabel}」内のフィールド削除 (${childLabel})`;
        out.push({
          ...row,
          _id: `${parentId}::tchild::${code}::${childIdx++}`,
          _parentRowId: parentId,
          _expandedFromTable: true,
          _displayOnly: true,
          path: childPath,
          left: isRemoved ? field : void 0,
          right: isAdded ? field : void 0,
          type: row.type,
          moved: false,
          reasonSummary: reason,
          severity: row.severity || "medium",
          renameCandidate: null,
          impactCount: 0,
          impactRefs: [],
          impactSummary: ""
        });
      });
    });
    return out;
  }
  var HIGH_IMPACT_SECTIONS, MEDIUM_IMPACT_SECTIONS, ARRAY_DIFF_LIMIT, SAME_ROW_LIMIT, ARRAY_LCS_MAX_CELLS, ARRAY_KEY_CANDIDATES, LOW_PRIORITY_LEAF_KEYS, ACL_GRANT_FLAG_KEYS, FIELD_ACL_LEVEL_ORDER, COMPOSITE_ARRAY_RULES, SUBTABLE_ROOT_PATH_RE, ENTITY_EXPAND_LIMIT;
  var init_engine = __esm({
    "src/diff/engine.ts"() {
      "use strict";
      init_constants();
      init_state();
      init_utils();
      HIGH_IMPACT_SECTIONS = /* @__PURE__ */ new Set([
        "fieldSettings",
        "processSettings",
        "actionSettings",
        "appAcl",
        "fieldAcl",
        "recordPermissions"
      ]);
      MEDIUM_IMPACT_SECTIONS = /* @__PURE__ */ new Set([
        "layoutSettings",
        "viewSettings",
        "reportSettings",
        "customizeSettings",
        "notifications",
        "perRecordNotifications",
        "reminderNotifications",
        "categories"
      ]);
      ARRAY_DIFF_LIMIT = 1e3;
      SAME_ROW_LIMIT = 3e3;
      ARRAY_LCS_MAX_CELLS = 6e4;
      ARRAY_KEY_CANDIDATES = [
        "code",
        "id",
        "name",
        "entity",
        "field",
        "status",
        "state",
        "app",
        "from",
        "to",
        "key"
      ];
      LOW_PRIORITY_LEAF_KEYS = /* @__PURE__ */ new Set([
        "width",
        "x",
        "y",
        "index",
        "no",
        "order",
        "paginationStyle",
        "pager",
        "description",
        "minWidth",
        "maxWidth",
        "thumbnailSize"
      ]);
      ACL_GRANT_FLAG_KEYS = /* @__PURE__ */ new Set([
        "recordViewable",
        "recordAddable",
        "recordEditable",
        "recordDeletable",
        "recordImportable",
        "recordExportable",
        "appEditable",
        "viewable",
        "editable",
        "deletable"
      ]);
      FIELD_ACL_LEVEL_ORDER = ["NONE", "READ", "READ_WRITE"];
      COMPOSITE_ARRAY_RULES = [
        // アプリ権限：エンティティが識別子
        {
          pattern: /^appAcl\.rights$/,
          arrayKey: "entity",
          makeSig: (item) => entityIdentitySig(item?.entity),
          keyValue: (item) => item?.entity
        },
        // フィールド権限・レコード権限のエンティティ配列
        {
          pattern: /^(?:fieldAcl|recordPermissions)\.rights\[\d+\]\.entities$/,
          arrayKey: "entity",
          makeSig: (item) => entityIdentitySig(item?.entity),
          keyValue: (item) => item?.entity
        },
        // 一般通知：宛先エンティティが識別子
        {
          pattern: /^notifications\.notifications$/,
          arrayKey: "entity",
          makeSig: (item) => entityIdentitySig(item?.entity),
          keyValue: (item) => item?.entity
        },
        // レコード条件通知・リマインダー通知：タイトル（無題はマッチ対象外）
        {
          pattern: /^(?:perRecordNotifications|reminderNotifications)\.notifications$/,
          arrayKey: "title",
          makeSig: (item) => {
            const t = item?.title != null ? String(item.title).trim() : "";
            return t || null;
          },
          keyValue: (item) => item?.title
        },
        // プロセス遷移・アプリアクション：name が重複していても from/to で識別。
        // name がユニークな場合は objectKey マッチ（name 単独）の方が from/to の
        // 変更を changed としてペアリングできるため、そちらに委ねる。
        {
          pattern: /^(?:processSettings|actionSettings)\.actions$/,
          arrayKey: "name",
          makeSig: (item) => {
            const name = item?.name != null ? String(item.name).trim() : "";
            if (!name) return null;
            return `${name}|${item?.from != null ? String(item.from) : ""}|${item?.to != null ? String(item.to) : ""}`;
          },
          keyValue: (item) => item?.name,
          applies: (a, b) => !(hasUniquePrimitiveKey(a, "name") && hasUniquePrimitiveKey(b, "name"))
        }
      ];
      SUBTABLE_ROOT_PATH_RE = /^fieldSettings\.properties\.([^.[\]]+)$/;
      ENTITY_EXPAND_LIMIT = 200;
    }
  });

  // src/diff/enrich.ts
  function relativePathFromRow(path, secKey) {
    if (!path) return "";
    if (path === secKey) return "";
    if (path.startsWith(`${secKey}.`)) return path.slice(secKey.length + 1);
    if (path.startsWith(`${secKey}[`)) return path.slice(secKey.length);
    return null;
  }
  function tokenizePath(path) {
    if (!path) return [];
    const out = [];
    const re = /([^[.\]]+)|\[(\d+)\]/g;
    let m;
    while ((m = re.exec(path)) !== null) {
      if (m[1] != null) out.push(m[1]);
      else out.push(Number(m[2]));
    }
    return out;
  }
  function getPathLeafKey2(path) {
    const m = String(path || "").match(/([^[.\]]+)(?:\[\d+\])?$/);
    return m ? m[1] : "";
  }
  function normalizeIgnoreToken2(token) {
    return String(token || "").replace(/[\u200b\u200c\u200d\ufeff]/g, "").replace(/^[\s\u3000]+|[\s\u3000]+$/g, "").toLowerCase();
  }
  function summarizeSeverity(rows) {
    const out = { high: 0, medium: 0, low: 0 };
    (rows || []).forEach((r) => {
      if (!r || r.type === "same") return;
      const sev = r?.severity || "low";
      if (sev === "high") out.high += 1;
      else if (sev === "medium") out.medium += 1;
      else out.low += 1;
    });
    return out;
  }
  function normalizeLooseText(value) {
    return String(value || "").trim().toLowerCase();
  }
  function tokenizeLooseText(value) {
    return normalizeLooseText(value).split(/[^a-z0-9_]+/).filter((token) => token.length >= 2);
  }
  function scoreTokenOverlap(a, b) {
    const setA = new Set(tokenizeLooseText(a));
    const setB = new Set(tokenizeLooseText(b));
    if (!setA.size || !setB.size) return 0;
    let common = 0;
    setA.forEach((token) => {
      if (setB.has(token)) common += 1;
    });
    return common / Math.max(setA.size, setB.size);
  }
  function normalizeFieldDefForRename(value, options = {}) {
    if (Array.isArray(value)) return value.map((item) => normalizeFieldDefForRename(item, options));
    if (!value || typeof value !== "object") return value;
    const out = {};
    Object.keys(value).sort().forEach((key) => {
      if (META_KEYS.has(key)) return;
      if (["code", "id", "appid", "index", "no", "order"].includes(key)) return;
      if (options.dropPresentation && ["label", "name"].includes(key)) return;
      out[key] = normalizeFieldDefForRename(value[key], options);
    });
    return out;
  }
  function extractFieldPathInfo(path) {
    const rel = relativePathFromRow(path, "fieldSettings");
    if (!rel) return null;
    const tokens = tokenizePath(rel);
    if (tokens[0] !== "properties" || typeof tokens[1] !== "string") return null;
    const rootCode = tokens[1];
    const isSubField = tokens[2] === "fields" && typeof tokens[3] === "string";
    const subFieldCode = isSubField ? tokens[3] : "";
    const tailTokens = tokens.slice(isSubField ? 4 : 2);
    return {
      rootCode,
      subFieldCode,
      activeCode: subFieldCode || rootCode,
      isSubField,
      tailTokens,
      leafKey: tailTokens.length ? String(tailTokens[tailTokens.length - 1]) : "",
      isFieldRoot: !isSubField && tailTokens.length === 0,
      isSubFieldRoot: isSubField && tailTokens.length === 0,
      rootPath: isSubField ? `fieldSettings.properties.${rootCode}.fields.${subFieldCode}` : `fieldSettings.properties.${rootCode}`
    };
  }
  function getFieldRowPayload(row) {
    if (!row || row.sectionKey !== "fieldSettings") return null;
    const info = extractFieldPathInfo(row.path);
    if (!info) return null;
    if (row.type === "added") return row.right;
    if (row.type === "removed") return row.left;
    return row.right || row.left || null;
  }
  function scoreFieldRenameCandidate(removedRow, addedRow) {
    const leftDef = getFieldRowPayload(removedRow);
    const rightDef = getFieldRowPayload(addedRow);
    if (!leftDef || !rightDef) return null;
    if (String(leftDef.type || "") !== String(rightDef.type || "")) return null;
    const reasons = [];
    let score = 0;
    const exactSigLeft = stableStringify(normalizeFieldDefForRename(leftDef));
    const exactSigRight = stableStringify(normalizeFieldDefForRename(rightDef));
    const coreSigLeft = stableStringify(normalizeFieldDefForRename(leftDef, { dropPresentation: true }));
    const coreSigRight = stableStringify(normalizeFieldDefForRename(rightDef, { dropPresentation: true }));
    const leftLabel = normalizeLooseText(leftDef.label || leftDef.name || "");
    const rightLabel = normalizeLooseText(rightDef.label || rightDef.name || "");
    const leftCode = normalizeLooseText(leftDef.code || extractFieldPathInfo(removedRow.path)?.activeCode || "");
    const rightCode = normalizeLooseText(rightDef.code || extractFieldPathInfo(addedRow.path)?.activeCode || "");
    let hasStrongMatch = false;
    score += 3;
    reasons.push(`type:${leftDef.type || "-"}`);
    if (exactSigLeft === exactSigRight) {
      score += 6;
      reasons.push("same-structure");
      hasStrongMatch = true;
    } else if (coreSigLeft === coreSigRight) {
      score += 5;
      reasons.push("same-core");
      hasStrongMatch = true;
    }
    if (leftLabel && rightLabel && leftLabel === rightLabel) {
      score += 3;
      reasons.push("same-label");
      hasStrongMatch = true;
    } else if (scoreTokenOverlap(leftLabel, rightLabel) >= 0.6) {
      score += 1;
      reasons.push("label-similar");
      hasStrongMatch = true;
    }
    const codeOverlap = scoreTokenOverlap(leftCode, rightCode);
    if (codeOverlap >= 0.5) {
      score += 1;
      reasons.push("code-similar");
    }
    if (!hasStrongMatch && codeOverlap >= 0.7) {
      score += 2;
      reasons.push("code-strong");
      hasStrongMatch = true;
    }
    if (leftDef.required === rightDef.required) {
      score += 1;
      reasons.push("same-required");
    }
    if (!!leftDef.lookup === !!rightDef.lookup) {
      score += 1;
      reasons.push("same-lookup");
    }
    if (!hasStrongMatch) return null;
    if (score < 6) return null;
    return {
      score,
      matchedBy: reasons.join(", ")
    };
  }
  function detectFieldRenameCandidates(rows) {
    const removedRows = (rows || []).filter((row) => row.sectionKey === "fieldSettings" && row.type === "removed" && extractFieldPathInfo(row.path)?.isFieldRoot);
    const addedRows = (rows || []).filter((row) => row.sectionKey === "fieldSettings" && row.type === "added" && extractFieldPathInfo(row.path)?.isFieldRoot);
    const candidates = [];
    removedRows.forEach((removedRow) => {
      addedRows.forEach((addedRow) => {
        const scored = scoreFieldRenameCandidate(removedRow, addedRow);
        if (!scored) return;
        candidates.push({
          removedRow,
          addedRow,
          score: scored.score,
          matchedBy: scored.matchedBy
        });
      });
    });
    candidates.sort((a, b) => b.score - a.score);
    const usedRemoved = /* @__PURE__ */ new Set();
    const usedAdded = /* @__PURE__ */ new Set();
    const out = /* @__PURE__ */ new Map();
    candidates.forEach((candidate) => {
      if (usedRemoved.has(candidate.removedRow._id) || usedAdded.has(candidate.addedRow._id)) return;
      usedRemoved.add(candidate.removedRow._id);
      usedAdded.add(candidate.addedRow._id);
      const fromCode = extractFieldPathInfo(candidate.removedRow.path)?.activeCode || "";
      const toCode = extractFieldPathInfo(candidate.addedRow.path)?.activeCode || "";
      const renameInfo = {
        id: `rename:${fromCode}:${toCode}`,
        fromCode,
        toCode,
        score: candidate.score,
        matchedBy: candidate.matchedBy
      };
      out.set(candidate.removedRow._id, renameInfo);
      out.set(candidate.addedRow._id, renameInfo);
    });
    return out;
  }
  function collectFieldDefinitions(properties, out = {}) {
    if (!properties || typeof properties !== "object") return out;
    Object.entries(properties).forEach(([code, field]) => {
      if (!field || typeof field !== "object") return;
      out[code] = field;
      if (field.type === "SUBTABLE" && field.fields && typeof field.fields === "object") {
        collectFieldDefinitions(field.fields, out);
      }
    });
    return out;
  }
  function addFieldImpactRef(index, code, ref) {
    const fieldCode = String(code || "").trim();
    if (!fieldCode) return;
    if (!index.has(fieldCode)) index.set(fieldCode, []);
    const bucket = index.get(fieldCode);
    const sig = [ref.sectionKey, ref.kind, ref.path, ref.label].join("|");
    if (bucket.some((item) => [item.sectionKey, item.kind, item.path, item.label].join("|") === sig)) return;
    bucket.push(ref);
  }
  function collectExpressionFieldRefs(text, codeSet) {
    const matches = /* @__PURE__ */ new Set();
    const re = /[A-Za-z_][A-Za-z0-9_]*/g;
    let match;
    while ((match = re.exec(String(text || ""))) !== null) {
      if (codeSet.has(match[0])) matches.add(match[0]);
    }
    return [...matches];
  }
  function collectFieldRefsFromFieldSettings(fieldSettings, codeSet, index) {
    const props = fieldSettings?.properties || fieldSettings || {};
    const walk = (fields, parentPath) => {
      Object.entries(fields || {}).forEach(([code, field]) => {
        if (!field || typeof field !== "object") return;
        const pathBase = `${parentPath}.${code}`;
        const label = field.label || field.name || code;
        if (field.lookup && Array.isArray(field.lookup.fieldMappings)) {
          field.lookup.fieldMappings.forEach((mapping, idx) => {
            const localField = String(mapping?.field || "").trim();
            if (!localField || !codeSet.has(localField)) return;
            addFieldImpactRef(index, localField, {
              sectionKey: "fieldSettings",
              section: SECTION_DEFS.find((item) => item.key === "fieldSettings")?.label || "fieldSettings",
              kind: "ルックアップコピー",
              label,
              path: `${pathBase}.lookup.fieldMappings[${idx}].field`
            });
          });
        }
        if (field.expression) {
          collectExpressionFieldRefs(field.expression, codeSet).forEach((refCode) => {
            addFieldImpactRef(index, refCode, {
              sectionKey: "fieldSettings",
              section: SECTION_DEFS.find((item) => item.key === "fieldSettings")?.label || "fieldSettings",
              kind: "計算式参照",
              label,
              path: `${pathBase}.expression`
            });
          });
        }
        if (field.type === "SUBTABLE" && field.fields && typeof field.fields === "object") {
          walk(field.fields, `${pathBase}.fields`);
        }
      });
    };
    walk(props, "fieldSettings.properties");
  }
  function collectLayoutFieldRefs(layoutSettings, codeSet, index) {
    const walkRows = (rows, path) => {
      (Array.isArray(rows) ? rows : []).forEach((row, rowIdx) => {
        const rowPath = `${path}[${rowIdx}]`;
        if (row?.type === "GROUP" && Array.isArray(row.layout)) {
          walkRows(row.layout, `${rowPath}.layout`);
          return;
        }
        const items = Array.isArray(row?.fields) ? row.fields : [];
        items.forEach((item, itemIdx) => {
          if (!item || typeof item !== "object") return;
          const itemPath = `${rowPath}.fields[${itemIdx}]`;
          const fieldCode = String(item.code || "").trim();
          if (fieldCode && codeSet.has(fieldCode)) {
            addFieldImpactRef(index, fieldCode, {
              sectionKey: "layoutSettings",
              section: SECTION_DEFS.find((entry) => entry.key === "layoutSettings")?.label || "layoutSettings",
              kind: "レイアウト配置",
              label: item.label || fieldCode,
              path: `${itemPath}.code`
            });
          }
          if (item.type === "GROUP" && Array.isArray(item.layout)) {
            walkRows(item.layout, `${itemPath}.layout`);
          }
          if (item.type === "SUBTABLE" && Array.isArray(item.fields)) {
            item.fields.forEach((subItem, subIdx) => {
              const subCode = String(subItem?.code || "").trim();
              if (!subCode || !codeSet.has(subCode)) return;
              addFieldImpactRef(index, subCode, {
                sectionKey: "layoutSettings",
                section: SECTION_DEFS.find((entry) => entry.key === "layoutSettings")?.label || "layoutSettings",
                kind: "テーブル配置",
                label: subItem.label || subCode,
                path: `${itemPath}.fields[${subIdx}].code`
              });
            });
          }
        });
      });
    };
    walkRows(layoutSettings?.layout || [], "layoutSettings.layout");
  }
  function scanSectionForFieldRefs(sectionKey, value, codeSet, index, path = sectionKey, parentKey = "") {
    if (Array.isArray(value)) {
      if (FIELD_REF_ARRAY_KEYS.has(parentKey)) {
        value.forEach((item, idx) => {
          const fieldCode = String(item || "").trim();
          if (!codeSet.has(fieldCode)) return;
          addFieldImpactRef(index, fieldCode, {
            sectionKey,
            section: SECTION_DEFS.find((entry) => entry.key === sectionKey)?.label || sectionKey,
            kind: "配列参照",
            label: parentKey,
            path: `${path}[${idx}]`
          });
        });
      }
      value.forEach((item, idx) => {
        scanSectionForFieldRefs(sectionKey, item, codeSet, index, `${path}[${idx}]`, parentKey);
      });
      return;
    }
    if (value && typeof value === "object") {
      Object.keys(value).forEach((key) => {
        scanSectionForFieldRefs(sectionKey, value[key], codeSet, index, `${path}.${key}`, key);
      });
      return;
    }
    if (typeof value !== "string") return;
    const text = value.trim();
    if (!text) return;
    if (FIELD_REF_EXACT_KEYS.has(parentKey) && codeSet.has(text)) {
      addFieldImpactRef(index, text, {
        sectionKey,
        section: SECTION_DEFS.find((entry) => entry.key === sectionKey)?.label || sectionKey,
        kind: "フィールド参照",
        label: parentKey,
        path
      });
      return;
    }
    if (!FIELD_REF_TOKEN_KEYS.has(parentKey)) return;
    collectExpressionFieldRefs(text, codeSet).forEach((fieldCode) => {
      addFieldImpactRef(index, fieldCode, {
        sectionKey,
        section: SECTION_DEFS.find((entry) => entry.key === sectionKey)?.label || sectionKey,
        kind: parentKey === "expression" ? "式参照" : "条件参照",
        label: parentKey,
        path
      });
    });
  }
  function buildCombinedFieldImpactIndex(sourceBundle, targetBundle = null) {
    const sourceFields = collectFieldDefinitions(sourceBundle?.sections?.fieldSettings?.properties || sourceBundle?.sections?.fieldSettings || {});
    const targetFields = collectFieldDefinitions(targetBundle?.sections?.fieldSettings?.properties || targetBundle?.sections?.fieldSettings || {});
    const codeSet = /* @__PURE__ */ new Set([...Object.keys(sourceFields), ...Object.keys(targetFields)]);
    const index = /* @__PURE__ */ new Map();
    if (!codeSet.size) return index;
    [sourceBundle, targetBundle].forEach((bundle) => {
      if (!bundle?.sections) return;
      collectFieldRefsFromFieldSettings(bundle.sections.fieldSettings, codeSet, index);
      collectLayoutFieldRefs(bundle.sections.layoutSettings, codeSet, index);
      [
        "viewSettings",
        "reportSettings",
        "processSettings",
        "actionSettings",
        "notifications",
        "perRecordNotifications",
        "reminderNotifications",
        // 権限系：fieldAcl.rights[].code / recordPermissions の FIELD_ENTITY・filterCond が
        // フィールドコードを参照する（フィールド削除・改名の影響範囲に含める）
        "fieldAcl",
        "recordPermissions"
      ].forEach((sectionKey) => {
        scanSectionForFieldRefs(sectionKey, bundle.sections[sectionKey], codeSet, index, sectionKey, "");
      });
    });
    return index;
  }
  function buildStatusImpactIndex(sourceBundle, targetBundle = null) {
    const index = /* @__PURE__ */ new Map();
    const sectionLabel = SECTION_DEFS.find((entry) => entry.key === "processSettings")?.label || "processSettings";
    const add = (stateName, ref) => {
      const name = String(stateName || "").trim();
      if (!name) return;
      if (!index.has(name)) index.set(name, []);
      const bucket = index.get(name);
      const sig = [ref.sectionKey, ref.kind, ref.path, ref.label].join("|");
      if (bucket.some((item) => [item.sectionKey, item.kind, item.path, item.label].join("|") === sig)) return;
      bucket.push(ref);
    };
    [sourceBundle, targetBundle].forEach((bundle) => {
      const proc = bundle?.sections?.processSettings;
      if (!proc || typeof proc !== "object") return;
      const actions = Array.isArray(proc.actions) ? proc.actions : [];
      actions.forEach((act, idx) => {
        if (!act || typeof act !== "object") return;
        const label = String(act.name || `遷移 #${idx}`);
        if (typeof act.from === "string" && act.from) {
          add(act.from, {
            sectionKey: "processSettings",
            section: sectionLabel,
            kind: "遷移元参照",
            label,
            path: `processSettings.actions[${idx}].from`
          });
        }
        if (typeof act.to === "string" && act.to) {
          add(act.to, {
            sectionKey: "processSettings",
            section: sectionLabel,
            kind: "遷移先参照",
            label,
            path: `processSettings.actions[${idx}].to`
          });
        }
      });
    });
    return index;
  }
  function extractStateNameFromRow(row) {
    if (String(row?.sectionKey || "") !== "processSettings") return "";
    const tokens = tokenizePath(String(row?.path || ""));
    if (tokens[1] === "states" && typeof tokens[2] === "string") return tokens[2];
    return "";
  }
  function resolveRowImpactRefs(row, impactIndex, statusImpactIndex = null) {
    const codes = /* @__PURE__ */ new Set();
    const fieldInfo = extractFieldPathInfo(row.path);
    if (fieldInfo?.activeCode) codes.add(fieldInfo.activeCode);
    if (row.renameCandidate?.fromCode) codes.add(row.renameCandidate.fromCode);
    if (row.renameCandidate?.toCode) codes.add(row.renameCandidate.toCode);
    const stateNames = /* @__PURE__ */ new Set();
    if (statusImpactIndex && statusImpactIndex.size) {
      const stateName = extractStateNameFromRow(row);
      if (stateName) stateNames.add(stateName);
      if (row.renameCandidate?.entityKind === "state") {
        if (row.renameCandidate.fromCode) stateNames.add(String(row.renameCandidate.fromCode));
        if (row.renameCandidate.toCode) stateNames.add(String(row.renameCandidate.toCode));
      }
    }
    if (!codes.size && !stateNames.size) return [];
    const refs = [];
    const seen = /* @__PURE__ */ new Set();
    codes.forEach((code) => {
      (impactIndex.get(code) || []).forEach((ref) => {
        const sig = [ref.sectionKey, ref.kind, ref.path, ref.label].join("|");
        if (seen.has(sig)) return;
        seen.add(sig);
        refs.push(ref);
      });
    });
    stateNames.forEach((name) => {
      (statusImpactIndex?.get(name) || []).forEach((ref) => {
        const sig = [ref.sectionKey, ref.kind, ref.path, ref.label].join("|");
        if (seen.has(sig)) return;
        seen.add(sig);
        refs.push(ref);
      });
    });
    const order = new Map(SECTION_DEFS.map((entry, idx) => [entry.key, idx]));
    refs.sort((a, b) => {
      const ao = order.has(a.sectionKey) ? order.get(a.sectionKey) ?? 999 : 999;
      const bo = order.has(b.sectionKey) ? order.get(b.sectionKey) ?? 999 : 999;
      if (ao !== bo) return ao - bo;
      return String(a.path || "").localeCompare(String(b.path || ""));
    });
    return refs;
  }
  function summarizeImpactRefs(refs) {
    if (!refs.length) return "";
    const sectionCounts = /* @__PURE__ */ new Map();
    refs.forEach((ref) => {
      const key = ref.section || ref.sectionKey || "-";
      sectionCounts.set(key, (sectionCounts.get(key) || 0) + 1);
    });
    const head = [...sectionCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([section, count]) => `${section}:${count}`).join(" / ");
    return head || `影響 ${refs.length}件`;
  }
  function isEntityRootRow(row) {
    if (!row || row.sectionKey === "fieldSettings") return false;
    if (row._displayOnly) return false;
    if (!row.entityKind || !RENAMABLE_ENTITY_KINDS.has(row.entityKind)) return false;
    const tokens = tokenizePath(String(row.path || ""));
    const sectionKey = String(row.sectionKey || "");
    if ((sectionKey === "viewSettings" || sectionKey === "reportSettings" || sectionKey === "categories") && tokens.length === 3) return true;
    if (sectionKey === "processSettings" && tokens[1] === "states" && tokens.length === 3) return true;
    if ((sectionKey === "processSettings" || sectionKey === "actionSettings") && tokens[1] === "actions" && tokens.length === 3) return true;
    if ((sectionKey === "appAcl" || sectionKey === "recordPermissions" || sectionKey === "fieldAcl") && tokens[1] === "rights" && tokens.length === 3) return true;
    if (["notifications", "perRecordNotifications", "reminderNotifications"].includes(sectionKey) && tokens[1] === "notifications" && tokens.length === 3) return true;
    if (sectionKey === "pluginSettings" && tokens[1] === "plugins" && tokens.length === 3) return true;
    if (sectionKey === "layoutSettings" && tokens[1] === "layout" && tokens.length === 3) return true;
    if (sectionKey === "customizeSettings" && tokens.length === 4) return true;
    return false;
  }
  function entityPayload(row) {
    return row?.right || row?.left || null;
  }
  function normalizeEntityBodyForRename(value, sectionKey, dropPresentation = false) {
    const dropKeys = /* @__PURE__ */ new Set(["id", "index", "no", "order", "revision", "createdAt", "creator", "modifiedAt", "modifier"]);
    if (dropPresentation) {
      if (sectionKey === "viewSettings" || sectionKey === "reportSettings") dropKeys.add("name");
      if (sectionKey === "processSettings" || sectionKey === "actionSettings") dropKeys.add("name");
      if (sectionKey === "pluginSettings") dropKeys.add("name");
      if (["notifications", "perRecordNotifications", "reminderNotifications"].includes(sectionKey)) {
        dropKeys.add("name");
        dropKeys.add("title");
      }
    }
    const walk = (v) => {
      if (Array.isArray(v)) return v.map(walk);
      if (v && typeof v === "object") {
        const out = {};
        Object.keys(v).sort().forEach((k) => {
          if (dropKeys.has(k)) return;
          out[k] = walk(v[k]);
        });
        return out;
      }
      return v;
    };
    return walk(value);
  }
  function scoreEntityRenameCandidate(removedRow, addedRow) {
    if (removedRow.sectionKey !== addedRow.sectionKey) return null;
    if (removedRow.entityKind !== addedRow.entityKind) return null;
    const left = entityPayload(removedRow);
    const right = entityPayload(addedRow);
    if (!left || !right || typeof left !== "object" || typeof right !== "object") return null;
    const lType = left.type;
    const rType = right.type;
    if (lType != null && rType != null && String(lType) !== String(rType)) return null;
    const sectionKey = removedRow.sectionKey;
    const exactSigLeft = stableStringify(normalizeEntityBodyForRename(left, sectionKey));
    const exactSigRight = stableStringify(normalizeEntityBodyForRename(right, sectionKey));
    const coreSigLeft = stableStringify(normalizeEntityBodyForRename(left, sectionKey, true));
    const coreSigRight = stableStringify(normalizeEntityBodyForRename(right, sectionKey, true));
    const reasons = [];
    let score = 0;
    let strong = false;
    if (lType && rType) {
      score += 1;
      reasons.push(`type:${lType}`);
    }
    if (exactSigLeft === exactSigRight) {
      score += 6;
      reasons.push("same-body");
      strong = true;
    } else if (coreSigLeft === coreSigRight) {
      score += 5;
      reasons.push("same-core");
      strong = true;
    }
    const leftLabel = normalizeLooseText(String(removedRow.entityLabel || ""));
    const rightLabel = normalizeLooseText(String(addedRow.entityLabel || ""));
    if (leftLabel && rightLabel) {
      if (leftLabel === rightLabel) {
        score += 2;
        reasons.push("same-label");
      } else if (scoreTokenOverlap(leftLabel, rightLabel) >= 0.6) {
        score += 1;
        reasons.push("label-similar");
      }
    }
    if (!strong) return null;
    if (score < 6) return null;
    return { score, matchedBy: reasons.join(", ") };
  }
  function detectEntityRenameCandidates(rows) {
    const eligible = (rows || []).filter(isEntityRootRow);
    const removedRows = eligible.filter((r) => r.type === "removed");
    const addedRows = eligible.filter((r) => r.type === "added");
    if (!removedRows.length || !addedRows.length) return /* @__PURE__ */ new Map();
    const candidates = [];
    removedRows.forEach((rr) => {
      addedRows.forEach((ar) => {
        const scored = scoreEntityRenameCandidate(rr, ar);
        if (!scored) return;
        candidates.push({ removedRow: rr, addedRow: ar, score: scored.score, matchedBy: scored.matchedBy });
      });
    });
    candidates.sort((a, b) => b.score - a.score);
    const usedRemoved = /* @__PURE__ */ new Set();
    const usedAdded = /* @__PURE__ */ new Set();
    const out = /* @__PURE__ */ new Map();
    candidates.forEach((cand) => {
      if (usedRemoved.has(cand.removedRow._id) || usedAdded.has(cand.addedRow._id)) return;
      usedRemoved.add(cand.removedRow._id);
      usedAdded.add(cand.addedRow._id);
      const fromCode = String(cand.removedRow.entityCode || cand.removedRow.entityLabel || "");
      const toCode = String(cand.addedRow.entityCode || cand.addedRow.entityLabel || "");
      const renameInfo = {
        id: `entity-rename:${cand.removedRow.sectionKey}:${fromCode}:${toCode}`,
        fromCode,
        toCode,
        score: cand.score,
        matchedBy: cand.matchedBy,
        entityKind: cand.removedRow.entityKind,
        sectionKey: cand.removedRow.sectionKey
      };
      out.set(cand.removedRow._id, renameInfo);
      out.set(cand.addedRow._id, renameInfo);
    });
    return out;
  }
  function getSectionPropLabel(sectionKey, leaf) {
    const map = SECTION_PROP_LABELS[sectionKey];
    if (!map) return "";
    return map[leaf] || "";
  }
  function describeAclEntity(entity) {
    if (!entity || typeof entity !== "object") return "";
    const code = String(entity.code || "").trim();
    const type = String(entity.type || "").trim();
    if (!code) return type ? `(${type})` : "";
    return type ? `${code} (${type})` : code;
  }
  function extractEntityContext(row) {
    const sectionKey = String(row?.sectionKey || "");
    const path = String(row?.path || "");
    const tokens = tokenizePath(path);
    const leaf = getPathLeafKey2(path);
    const propLabel = getSectionPropLabel(sectionKey, leaf);
    const empty = { entityKind: "", entityLabel: "", entityCode: "", propLabel };
    if (sectionKey === "fieldSettings") return empty;
    const payload = row?.right || row?.left || null;
    switch (sectionKey) {
      case "viewSettings": {
        if (tokens[1] === "views" && typeof tokens[2] === "string") {
          return { entityKind: "view", entityLabel: tokens[2], entityCode: tokens[2], propLabel };
        }
        return empty;
      }
      case "reportSettings": {
        if (tokens[1] === "reports" && typeof tokens[2] === "string") {
          return { entityKind: "report", entityLabel: tokens[2], entityCode: tokens[2], propLabel };
        }
        return empty;
      }
      case "processSettings": {
        if (tokens[1] === "states" && typeof tokens[2] === "string") {
          return { entityKind: "state", entityLabel: tokens[2], entityCode: tokens[2], propLabel };
        }
        if (tokens[1] === "actions" && typeof tokens[2] === "number") {
          const name = row?.arrayKey === "name" && row?.arrayKeyValue != null ? String(row.arrayKeyValue) : String(payload && typeof payload === "object" && payload.name || "");
          const label = name || `遷移 #${tokens[2]}`;
          return { entityKind: "action", entityLabel: label, entityCode: name, propLabel };
        }
        return empty;
      }
      case "actionSettings": {
        if (tokens[1] === "actions" && typeof tokens[2] === "number") {
          const name = row?.arrayKey === "name" && row?.arrayKeyValue != null ? String(row.arrayKeyValue) : String(payload && typeof payload === "object" && payload.name || "");
          const label = name || `アクション #${tokens[2]}`;
          return { entityKind: "appAction", entityLabel: label, entityCode: name, propLabel };
        }
        return empty;
      }
      case "appAcl":
      case "recordPermissions": {
        if (tokens[1] === "rights" && typeof tokens[2] === "number") {
          let entityRef = row?.arrayKey === "entity" && row?.arrayKeyValue && typeof row.arrayKeyValue === "object" ? row.arrayKeyValue : null;
          if (!entityRef) entityRef = payload && typeof payload === "object" ? payload.entity : null;
          const label = describeAclEntity(entityRef) || `エントリー #${tokens[2]}`;
          const code = String(entityRef?.code || "");
          const kind = sectionKey === "appAcl" ? "aclEntry" : "recordAclEntry";
          return { entityKind: kind, entityLabel: label, entityCode: code, propLabel };
        }
        return empty;
      }
      case "fieldAcl": {
        if (tokens[1] === "rights" && typeof tokens[2] === "number") {
          const fc = row?.arrayKey === "code" && row?.arrayKeyValue != null ? String(row.arrayKeyValue) : String(payload && typeof payload === "object" && payload.code || "");
          if (tokens[3] === "entities") {
            let ent = row?.arrayKey === "entity" && row?.arrayKeyValue && typeof row.arrayKeyValue === "object" ? row.arrayKeyValue : null;
            if (!ent && payload && typeof payload === "object" && payload.entity) ent = payload.entity;
            const entLabel = describeAclEntity(ent);
            if (entLabel) {
              const label2 = fc ? `${fc} › ${entLabel}` : entLabel;
              return { entityKind: "fieldAclEntry", entityLabel: label2, entityCode: fc || String(ent?.code || ""), propLabel };
            }
          }
          const label = fc || `エントリー #${tokens[2]}`;
          return { entityKind: "fieldAclEntry", entityLabel: label, entityCode: fc, propLabel };
        }
        return empty;
      }
      case "notifications":
      case "perRecordNotifications":
      case "reminderNotifications": {
        if (tokens[1] === "notifications" && typeof tokens[2] === "number") {
          const obj = payload && typeof payload === "object" ? payload : {};
          let label = String(obj.name || obj.title || "").trim();
          if (!label && obj.entity && typeof obj.entity === "object") {
            label = describeAclEntity(obj.entity);
          }
          if (!label) {
            const recipients = obj.recipients;
            if (Array.isArray(recipients) && recipients.length) {
              const first = recipients[0];
              const code = first?.entity?.code || first?.code || "";
              label = code ? `${code}${recipients.length > 1 ? " 他" : ""}` : "";
            }
          }
          if (!label && row?.arrayKey === "name" && row?.arrayKeyValue != null) {
            label = String(row.arrayKeyValue);
          }
          if (!label && row?.arrayKey === "entity" && row?.arrayKeyValue && typeof row.arrayKeyValue === "object") {
            label = describeAclEntity(row.arrayKeyValue);
          }
          if (!label && row?.arrayKey === "title" && row?.arrayKeyValue != null) {
            label = String(row.arrayKeyValue);
          }
          if (!label) label = `通知 #${tokens[2]}`;
          const kind = sectionKey === "perRecordNotifications" ? "perRecordNotification" : sectionKey === "reminderNotifications" ? "reminderNotification" : "notification";
          return { entityKind: kind, entityLabel: label, entityCode: String(obj.name || ""), propLabel };
        }
        return empty;
      }
      case "categories": {
        if (tokens[1] === "categories" && typeof tokens[2] === "string") {
          return { entityKind: "category", entityLabel: tokens[2], entityCode: tokens[2], propLabel };
        }
        return empty;
      }
      case "pluginSettings": {
        if (tokens[1] === "plugins" && typeof tokens[2] === "number") {
          const id = row?.arrayKey === "id" && row?.arrayKeyValue != null ? String(row.arrayKeyValue) : String(payload && typeof payload === "object" && payload.id || "");
          const name = String(payload && typeof payload === "object" && payload.name || "");
          const label = name ? id ? `${name} (${id})` : name : id || `プラグイン #${tokens[2]}`;
          return { entityKind: "plugin", entityLabel: label, entityCode: id, propLabel };
        }
        return empty;
      }
      case "customizeSettings": {
        if ((tokens[1] === "desktop" || tokens[1] === "mobile") && (tokens[2] === "js" || tokens[2] === "css") && typeof tokens[3] === "number") {
          const platform = tokens[1] === "desktop" ? "デスクトップ" : "モバイル";
          const kind = String(tokens[2]).toUpperCase();
          const obj = payload && typeof payload === "object" ? payload : {};
          const fileKey = obj?.file?.fileKey || obj?.fileKey || "";
          const url = obj?.url || "";
          const ref = url ? url : fileKey ? `ファイル(${String(fileKey).slice(0, 8)}…)` : `#${tokens[3]}`;
          return {
            entityKind: "jsCss",
            entityLabel: `${platform}/${kind}: ${ref}`,
            entityCode: String(fileKey || url || ""),
            propLabel
          };
        }
        return empty;
      }
      case "layoutSettings": {
        if (tokens[1] === "layout" && typeof tokens[2] === "number") {
          const obj = payload && typeof payload === "object" ? payload : {};
          const t = String(obj.type || "").toUpperCase();
          let label = `行 #${tokens[2]}`;
          if (t === "GROUP" && obj.code) label = `グループ「${obj.code}」`;
          else if (t === "SUBTABLE" && obj.code) label = `テーブル「${obj.code}」`;
          else if (t === "ROW") label = `行 #${tokens[2]}`;
          return { entityKind: "layoutRow", entityLabel: label, entityCode: String(obj.code || ""), propLabel };
        }
        return empty;
      }
      default:
        return empty;
    }
  }
  function buildDiffReasonSummary(row) {
    const sectionKey = row.sectionKey || "";
    const sectionLabel = SECTION_DEFS.find((entry) => entry.key === sectionKey)?.label || sectionKey || "差分";
    const fieldInfo = extractFieldPathInfo(row.path);
    const leafKey = normalizeIgnoreToken2(getPathLeafKey2(row.path));
    if (row.moved) {
      const from = Number(row.movedFrom);
      const to = Number(row.movedTo);
      const posNote = Number.isFinite(from) && Number.isFinite(to) ? `（${from + 1}番目 → ${to + 1}番目）` : "";
      if (sectionKey === "layoutSettings") return `レイアウト順序変更${posNote}`;
      if (sectionKey === "categories") return `カテゴリ順序変更${posNote}`;
      return `順序変更${posNote}`;
    }
    if (sectionKey === "fieldSettings" && fieldInfo) {
      const noun = fieldInfo.isSubField ? "サブフィールド" : "フィールド";
      if (fieldInfo.isFieldRoot || fieldInfo.isSubFieldRoot) {
        if (row.type === "added") return `${noun}追加`;
        if (row.type === "removed") return `${noun}削除`;
        return `${noun}定義変更`;
      }
      if (fieldInfo.leafKey === "label" || fieldInfo.leafKey === "name") return `${noun}名変更`;
      if (fieldInfo.leafKey === "type") return `${noun}型変更`;
      if (fieldInfo.leafKey === "required") return "必須設定変更";
      if (fieldInfo.leafKey === "expression") return "計算式変更";
      if (fieldInfo.leafKey === "unique") return "重複禁止設定変更";
      if (String(row.path || "").includes(".lookup.")) return "ルックアップ設定変更";
      return `${noun}設定変更`;
    }
    const entity = row && (row.entityLabel || row.entityKind) ? { entityKind: String(row.entityKind || ""), entityLabel: String(row.entityLabel || ""), propLabel: String(row.entityPropLabel || "") } : extractEntityContext(row);
    const kindLabel = entity.entityKind ? ENTITY_KIND_LABELS[entity.entityKind] || "" : "";
    const propLabel = entity.propLabel || "";
    const isEntityRoot = !!entity.entityKind && !propLabel && (() => {
      const tokens = tokenizePath(String(row.path || ""));
      if (sectionKey === "viewSettings" || sectionKey === "reportSettings" || sectionKey === "categories") {
        return tokens.length === 3;
      }
      if (sectionKey === "processSettings" && tokens[1] === "states") return tokens.length === 3;
      if ((sectionKey === "processSettings" || sectionKey === "actionSettings") && tokens[1] === "actions") return tokens.length === 3;
      if ((sectionKey === "appAcl" || sectionKey === "recordPermissions" || sectionKey === "fieldAcl") && tokens[1] === "rights") return tokens.length === 3;
      if (["notifications", "perRecordNotifications", "reminderNotifications"].includes(sectionKey) && tokens[1] === "notifications") return tokens.length === 3;
      if (sectionKey === "pluginSettings" && tokens[1] === "plugins") return tokens.length === 3;
      if (sectionKey === "layoutSettings" && tokens[1] === "layout") return tokens.length === 3;
      if (sectionKey === "customizeSettings") return tokens.length === 4;
      return false;
    })();
    if (entity.entityKind && isEntityRoot) {
      if (row.type === "added") return `${kindLabel}追加：${entity.entityLabel}`;
      if (row.type === "removed") return `${kindLabel}削除：${entity.entityLabel}`;
      return `${kindLabel}変更：${entity.entityLabel}`;
    }
    if (entity.entityKind) {
      const detail = propLabel || (leafKey || "");
      const head = `${kindLabel}「${entity.entityLabel}」`;
      if (row.type === "added") return detail ? `${head} / ${detail} 追加` : `${head} 追加`;
      if (row.type === "removed") return detail ? `${head} / ${detail} 削除` : `${head} 削除`;
      return detail ? `${head} / ${detail} 変更` : `${head} 変更`;
    }
    if (sectionKey === "appSettings") {
      const sp = getSectionPropLabel("appSettings", leafKey);
      return sp ? `アプリ設定変更：${sp}` : "アプリ設定変更";
    }
    if (sectionKey === "appInfo") {
      const sp = getSectionPropLabel("appInfo", leafKey);
      return sp ? `アプリ情報変更：${sp}` : "アプリ情報変更";
    }
    if (sectionKey === "formSettings") return "フォーム設定変更";
    return row.type === "added" ? `${sectionLabel}追加` : row.type === "removed" ? `${sectionLabel}削除` : `${sectionLabel}変更`;
  }
  function enrichDiffRows(rows, sourceBundle, targetBundle) {
    const seeded = (rows || []).map((row) => {
      if (!row || row.sectionKey === "fieldSettings") return row;
      const ctx = extractEntityContext(row);
      if (!ctx.entityKind) return row;
      return {
        ...row,
        entityKind: ctx.entityKind,
        entityLabel: ctx.entityLabel,
        entityCode: ctx.entityCode,
        entityPropLabel: ctx.propLabel
      };
    });
    const renameMap = detectFieldRenameCandidates(seeded);
    const entityRenameMap = detectEntityRenameCandidates(seeded);
    const impactIndex = buildCombinedFieldImpactIndex(sourceBundle, targetBundle);
    const statusImpactIndex = buildStatusImpactIndex(sourceBundle, targetBundle);
    return seeded.map((row) => {
      const next = { ...row };
      const renameCandidate = renameMap.get(row._id) || entityRenameMap.get(row._id);
      if (renameCandidate) next.renameCandidate = renameCandidate;
      if (renameCandidate && (next.severity === "high" || next.severity === "medium")) {
        next.severity = "low";
      }
      const reason = buildDiffReasonSummary(next);
      if (reason) {
        const suffixes = [];
        if (renameCandidate) suffixes.push(renameCandidate.entityKind ? "改名候補" : "コード変更候補");
        if (next.notationOnly) suffixes.push("表記のみ（実質同値）");
        if (next.emptyOnly) suffixes.push("空値の差のみ");
        next.reasonSummary = suffixes.length ? `${reason} / ${suffixes.join(" / ")}` : reason;
      }
      const impactRefs = resolveRowImpactRefs(next, impactIndex, statusImpactIndex);
      if (impactRefs.length) {
        next.impactRefs = impactRefs.slice(0, DIFF_IMPACT_REF_LIMIT);
        next.impactCount = impactRefs.length;
        next.impactSummary = summarizeImpactRefs(impactRefs);
      } else {
        next.impactRefs = [];
        next.impactCount = 0;
        next.impactSummary = "";
      }
      return next;
    });
  }
  var RENAMABLE_ENTITY_KINDS, SECTION_PROP_LABELS, ENTITY_KIND_LABELS;
  var init_enrich = __esm({
    "src/diff/enrich.ts"() {
      "use strict";
      init_constants();
      init_utils();
      RENAMABLE_ENTITY_KINDS = /* @__PURE__ */ new Set([
        "view",
        "report",
        "state",
        "category",
        "action",
        "appAction",
        "aclEntry",
        "recordAclEntry",
        "fieldAclEntry",
        "notification",
        "perRecordNotification",
        "reminderNotification",
        "plugin",
        "jsCss",
        "layoutRow"
      ]);
      SECTION_PROP_LABELS = {
        viewSettings: {
          name: "ビュー名",
          type: "ビュー種別",
          filterCond: "絞り込み条件",
          sort: "ソート",
          fields: "表示フィールド",
          pager: "ページャー",
          paginationStyle: "ページャー表示",
          builtinType: "組み込みビュー種別",
          html: "カスタムHTML",
          index: "表示順",
          customView: "カスタマイズビュー",
          date: "日付フィールド",
          title: "タイトルフィールド",
          description: "説明",
          id: "ビューID"
        },
        reportSettings: {
          name: "グラフ名",
          chartType: "グラフ種別",
          chartMode: "グラフモード",
          groups: "グループ化",
          aggregations: "集計",
          filterCond: "絞り込み条件",
          sorts: "ソート",
          periodicReport: "定期実行",
          index: "表示順",
          id: "グラフID"
        },
        processSettings: {
          enable: "プロセス管理 有効/無効",
          name: "名称",
          index: "表示順",
          assignee: "作業者",
          from: "遷移元",
          to: "遷移先",
          condition: "実行条件",
          actions: "遷移アクション",
          states: "ステータス",
          filterCond: "実行条件",
          revisions: "リビジョン"
        },
        actionSettings: {
          name: "アクション名",
          link: "リンク先",
          params: "パラメータ",
          targetApp: "転送先アプリ",
          index: "表示順",
          mappings: "項目マッピング",
          targetAppId: "転送先アプリID",
          filterCond: "実行条件",
          id: "アクションID"
        },
        appAcl: {
          appEditable: "アプリ管理権限",
          recordViewable: "レコード閲覧",
          recordAddable: "レコード追加",
          recordEditable: "レコード編集",
          recordDeletable: "レコード削除",
          recordImportable: "レコード読み込み",
          recordExportable: "レコード書き出し",
          entity: "エンティティ",
          includeSubs: "配下を含む",
          code: "エンティティコード",
          type: "エンティティ種別"
        },
        fieldAcl: {
          accessibility: "アクセス権",
          code: "フィールドコード",
          entity: "エンティティ",
          includeSubs: "配下を含む",
          viewable: "閲覧",
          editable: "編集"
        },
        recordPermissions: {
          filterCond: "対象レコード条件",
          viewable: "閲覧",
          editable: "編集",
          deletable: "削除",
          includeSubs: "配下を含む",
          entity: "エンティティ",
          code: "エンティティコード",
          type: "エンティティ種別"
        },
        notifications: {
          recipients: "宛先",
          includeSubs: "配下を含む",
          appAdmin: "アプリ管理者",
          onUserAccess: "アクセス権変更通知",
          notifyToCommenter: "コメント通知",
          code: "エンティティコード",
          type: "エンティティ種別",
          entity: "エンティティ"
        },
        perRecordNotifications: {
          name: "通知名",
          filterCond: "通知対象条件",
          title: "タイトル",
          body: "本文",
          recipients: "宛先",
          includeSubs: "配下を含む",
          code: "エンティティコード",
          type: "エンティティ種別",
          entity: "エンティティ"
        },
        reminderNotifications: {
          name: "通知名",
          timing: "タイミング",
          filterCond: "通知対象条件",
          title: "タイトル",
          body: "本文",
          recipients: "宛先",
          daysLater: "日数後",
          hoursLater: "時間後",
          baseDate: "基準日"
        },
        categories: {
          enable: "カテゴリ管理 有効/無効",
          name: "カテゴリ名",
          index: "表示順",
          code: "カテゴリコード"
        },
        customizeSettings: {
          type: "種別",
          url: "URL",
          file: "ファイル",
          fileKey: "ファイルキー",
          js: "JavaScript",
          css: "CSS",
          desktop: "デスクトップ",
          mobile: "モバイル",
          scope: "スコープ",
          resources: "リソース",
          _body: "JS/CSS本文",
          name: "ファイル名"
        },
        pluginSettings: {
          plugins: "プラグイン一覧",
          id: "プラグインID",
          name: "プラグイン名",
          enabled: "有効/無効",
          version: "バージョン",
          config: "プラグイン設定",
          code: "プラグインコード"
        },
        layoutSettings: {
          type: "種別",
          code: "フィールドコード",
          fields: "フィールド",
          elementId: "要素ID",
          label: "ラベル",
          value: "初期値",
          layout: "レイアウト",
          size: "サイズ",
          width: "横幅",
          height: "高さ"
        },
        appSettings: {
          name: "アプリ名",
          description: "説明",
          icon: "アイコン",
          theme: "テーマ",
          titleField: "タイトルフィールド",
          enableThumbnails: "サムネイル表示",
          enableBulkDeletion: "一括削除",
          enableComments: "コメント",
          enableDuplicateRecord: "レコード複製",
          enableInlineRecordEditing: "インライン編集",
          numberPrecision: "数値精度",
          firstMonthOfFiscalYear: "会計年度開始月",
          revision: "リビジョン"
        },
        appInfo: {
          name: "アプリ名",
          code: "アプリコード",
          description: "説明",
          threadId: "スレッドID",
          spaceId: "スペースID",
          createdAt: "作成日時",
          modifiedAt: "更新日時"
        },
        formSettings: {
          name: "フォーム名",
          layout: "レイアウト",
          revision: "リビジョン"
        }
      };
      ENTITY_KIND_LABELS = {
        view: "ビュー",
        report: "グラフ",
        state: "ステータス",
        action: "遷移アクション",
        appAction: "アクション",
        aclEntry: "権限エントリー",
        fieldAclEntry: "フィールド権限",
        recordAclEntry: "レコード権限",
        notification: "通知",
        perRecordNotification: "レコード条件通知",
        reminderNotification: "リマインダー通知",
        category: "カテゴリ",
        plugin: "プラグイン",
        jsCss: "JS/CSS",
        layoutRow: "レイアウト行"
      };
    }
  });

  // src/diff/filter.ts
  var SECTION_LABEL_BY_KEY;
  var init_filter = __esm({
    "src/diff/filter.ts"() {
      "use strict";
      init_constants();
      init_state();
      init_engine();
      init_api();
      init_export();
      SECTION_LABEL_BY_KEY = new Map(
        SECTION_DEFS.map((s) => [s.key, s.label])
      );
    }
  });

  // src/ui/dialog.ts
  function setRootElement(el) {
    root = el;
  }
  var root;
  var init_dialog = __esm({
    "src/ui/dialog.ts"() {
      "use strict";
      init_constants();
      init_state();
      root = null;
    }
  });

  // src/diff/label-dict.ts
  var init_label_dict = __esm({
    "src/diff/label-dict.ts"() {
      "use strict";
    }
  });

  // src/diff/path-decoder.ts
  var init_path_decoder = __esm({
    "src/diff/path-decoder.ts"() {
      "use strict";
      init_label_dict();
    }
  });

  // src/diff/category-view.ts
  var DIFF_CATEGORIES, SECTION_TO_CATEGORY;
  var init_category_view = __esm({
    "src/diff/category-view.ts"() {
      "use strict";
      init_utils();
      init_state();
      init_label_dict();
      init_path_decoder();
      DIFF_CATEGORIES = [
        { key: "fields", label: "フィールド", hint: "フィールド定義の追加・変更", sections: ["fieldSettings"], icon: "🔤" },
        { key: "layout", label: "レイアウト", hint: "フォーム配置の差分", sections: ["layoutSettings"], icon: "🧩" },
        { key: "views", label: "ビュー・グラフ", hint: "一覧表示とレポート", sections: ["viewSettings", "reportSettings"], icon: "📊" },
        { key: "process", label: "プロセス・アクション", hint: "ステータス遷移とアクション", sections: ["processSettings", "actionSettings"], icon: "🔁" },
        { key: "notify", label: "通知", hint: "通知ルールとリマインダー", sections: ["notifications", "perRecordNotifications", "reminderNotifications"], icon: "🔔" },
        { key: "acl", label: "権限", hint: "アプリ・フィールド・レコード権限", sections: ["appAcl", "fieldAcl", "recordPermissions"], icon: "🔐" },
        { key: "customize", label: "JS/CSS・プラグイン", hint: "カスタマイズと配布資産", sections: ["customizeSettings", "pluginSettings"], icon: "🧪" },
        { key: "app", label: "アプリ設定", hint: "基本情報・フォーム・カテゴリ", sections: ["appSettings", "appInfo", "formSettings", "categories"], icon: "⚙" }
      ];
      SECTION_TO_CATEGORY = (() => {
        const m = {};
        for (const cat of DIFF_CATEGORIES) for (const sec of cat.sections) m[sec] = cat.key;
        return m;
      })();
    }
  });

  // src/diff/export.ts
  function stringifyForDiff(value) {
    if (value === void 0) return "（未定義）";
    const out = JSON.stringify(value, null, 2);
    return out == null ? String(value) : out;
  }
  function isSubtableFieldMap(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return false;
    const entries = Object.values(value);
    if (!entries.length) return false;
    return entries.every((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return false;
      return "code" in item || "type" in item || "label" in item;
    });
  }
  function formatSubtableChildLine(child, idx) {
    const label = child?.label ?? child?.name ?? child?.code ?? "（未設定）";
    const typeLabel = child?.type ? String(child.type) : "フィールド";
    const code = child?.code ?? "-";
    return `${idx + 1}. ${label} / ${typeLabel} / ${code}`;
  }
  function formatSubtableChildrenText(fields) {
    const entries = Object.values(fields || {});
    if (!entries.length) return "（項目なし）";
    return entries.map(formatSubtableChildLine).join("\n");
  }
  function formatSubtableSnapshotText(value) {
    const head = [
      `フィールド名: ${value.label ?? value.name ?? "（未設定）"}`,
      `フィールドコード: ${value.code ?? "-"}`,
      "フィールド型: テーブル (SUBTABLE)"
    ];
    return `${head.join("\n")}
----
テーブル内の項目:
${formatSubtableChildrenText(value.fields)}`;
  }
  function isSubtableFieldsPath(path) {
    return typeof path === "string" && /^fieldSettings\.properties\.[^.[\]]+\.fields(?:\.[^.[\]]+)?$/.test(path);
  }
  function isSubtableFieldRootPath(path) {
    return typeof path === "string" && /^fieldSettings\.properties\.[^.[\]]+$/.test(path);
  }
  function stripLabelHtmlTags(text) {
    return stripHtmlToText(text);
  }
  function sanitizeHtmlBearingProps(value) {
    if (value == null || typeof value !== "object") return value;
    if (Array.isArray(value)) {
      return value.map((item) => sanitizeHtmlBearingProps(item));
    }
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      if (typeof v === "string" && (k === "label" || k === "name")) {
        out[k] = stripLabelHtmlTags(v);
      } else if (v && typeof v === "object") {
        out[k] = sanitizeHtmlBearingProps(v);
      } else {
        out[k] = v;
      }
    }
    return out;
  }
  function stringifyRowValueForDiff(value, path) {
    if (value === void 0) return "（未定義）";
    if (typeof value === "string" && /customizeSettings\..+\.file\._body$/.test(String(path || ""))) {
      return value;
    }
    if (value && typeof value === "object" && !Array.isArray(value)) {
      if (value.type === "SUBTABLE" && value.fields && typeof value.fields === "object") {
        return formatSubtableSnapshotText(sanitizeHtmlBearingProps(value));
      }
      if (isSubtableFieldsPath(path) && isSubtableFieldMap(value)) {
        return `テーブル内の項目:
${formatSubtableChildrenText(sanitizeHtmlBearingProps(value))}`;
      }
      if (isSubtableFieldRootPath(path) && isSubtableFieldMap(value)) {
        return `テーブル内の項目:
${formatSubtableChildrenText(sanitizeHtmlBearingProps(value))}`;
      }
      if (typeof value.label === "string" && value.label.includes("<")) {
        return stringifyForDiff(sanitizeHtmlBearingProps(value));
      }
    }
    if (typeof path === "string" && path.startsWith("layoutSettings")) {
      return stringifyForDiff(sanitizeHtmlBearingProps(value));
    }
    if (typeof value === "string" && typeof path === "string" && (/\.label$/.test(path) || /^layoutSettings\b/.test(path))) {
      return stripLabelHtmlTags(value);
    }
    return stringifyForDiff(value);
  }
  function getDiffExportContentLabel(mode) {
    return mode === "withCompared" ? "行データ + 比較設定" : "行データのみ";
  }
  function shouldIncludeComparedContent(mode) {
    return mode === "withCompared";
  }
  function buildCharDiffHtml(leftText, rightText) {
    const segmentGraphemes = (text) => {
      const normalized = String(text ?? "");
      if (!normalized) return [];
      const IntlAny = Intl;
      if (typeof IntlAny !== "undefined" && typeof IntlAny.Segmenter === "function") {
        try {
          const segmenter = new IntlAny.Segmenter("ja", { granularity: "grapheme" });
          return Array.from(segmenter.segment(normalized), (seg) => seg.segment);
        } catch (_) {
        }
      }
      return Array.from(normalized);
    };
    const a = segmentGraphemes(leftText);
    const b = segmentGraphemes(rightText);
    if (!a.length || !b.length) return null;
    if (a.length * b.length > CHAR_DIFF_MAX_CELLS) return null;
    const dp = Array.from({ length: a.length + 1 }, () => new Uint16Array(b.length + 1));
    for (let i2 = 1; i2 <= a.length; i2++) {
      for (let j2 = 1; j2 <= b.length; j2++) {
        dp[i2][j2] = a[i2 - 1] === b[j2 - 1] ? dp[i2 - 1][j2 - 1] + 1 : Math.max(dp[i2 - 1][j2], dp[i2][j2 - 1]);
      }
    }
    const ops = [];
    let i = a.length;
    let j = b.length;
    while (i > 0 || j > 0) {
      if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
        ops.push({ type: "same", ch: a[i - 1] });
        i -= 1;
        j -= 1;
      } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
        ops.push({ type: "add", ch: b[j - 1] });
        j -= 1;
      } else if (i > 0) {
        ops.push({ type: "del", ch: a[i - 1] });
        i -= 1;
      } else {
        break;
      }
    }
    ops.reverse();
    let left = "";
    let right = "";
    for (const op of ops) {
      if (op.type === "same") {
        const ch = esc(op.ch);
        left += ch;
        right += ch;
      } else if (op.type === "del") {
        left += `<mark class="diff-char-del">${esc(op.ch)}</mark>`;
      } else {
        right += `<mark class="diff-char-add">${esc(op.ch)}</mark>`;
      }
    }
    return { left, right };
  }
  function buildDiffExportComparedBundles(sourceBundle, targetBundle, scopes) {
    const compareScopes = [...new Set((scopes || []).filter(Boolean))];
    return {
      scopes: compareScopes,
      sourceBundle: pickBundleSections(sourceBundle, compareScopes),
      targetBundle: pickBundleSections(targetBundle, compareScopes)
    };
  }
  function getSectionLabel(sectionKeyOrLabel) {
    const raw = String(sectionKeyOrLabel || "").trim();
    if (!raw) return "-";
    return SECTION_DEFS.find((item) => item.key === raw || item.label === raw)?.label || raw;
  }
  function getSectionOrder(sectionKeyOrLabel) {
    const raw = String(sectionKeyOrLabel || "").trim();
    const index = SECTION_DEFS.findIndex((item) => item.key === raw || item.label === raw);
    return index >= 0 ? index : 9999;
  }
  function getRelativeDiffPath(row) {
    const path = String(row?.path || "").trim();
    const secKey = String(row?.sectionKey || "").trim();
    if (!path) return "";
    if (!secKey) return path;
    if (path === secKey) return "（セクション全体）";
    if (path.startsWith(`${secKey}.`)) return path.slice(secKey.length + 1);
    if (path.startsWith(`${secKey}[`)) return path.slice(secKey.length);
    return path;
  }
  function compactDiffValuePreview(value, maxLength = 140) {
    const raw = stringifyForDiff(value).replace(/\s+/g, " ").trim();
    if (!raw) return "";
    return raw.length > maxLength ? `${raw.slice(0, maxLength)}...` : raw;
  }
  function getBundleExportMeta(bundle) {
    return {
      appId: String(bundle?.appId || ""),
      guestId: String(bundle?.guestId || ""),
      preview: !!bundle?.preview,
      revision: resolveBundleRevision(bundle) || "",
      fetchedAt: bundle?.fetchedAt || "",
      sectionCount: Object.keys(bundle?.sections || {}).length
    };
  }
  function buildDiffTypeSummary(rows) {
    const summarized = summarizeRows(rows || []);
    return {
      totalRows: summarized.total,
      diffCount: countActualDiffRows(rows || []),
      sameCount: summarized.same,
      added: summarized.added,
      removed: summarized.removed,
      changed: summarized.changed,
      moved: summarized.moved
    };
  }
  function buildCompactFetchIssue(issue) {
    return {
      sectionKey: String(issue?.sectionKey || ""),
      sectionLabel: getSectionLabel(issue?.sectionKey || issue?.section),
      side: String(issue?.side || ""),
      message: String(issue?.message || ""),
      sourceError: String(issue?.sourceError || ""),
      targetError: String(issue?.targetError || "")
    };
  }
  function buildCompactDiffRow(row) {
    return {
      sectionKey: String(row?.sectionKey || ""),
      sectionLabel: getSectionLabel(row?.sectionKey || row?.section),
      type: String(row?.type || ""),
      severity: String(row?.severity || "low"),
      path: String(row?.path || ""),
      relativePath: getRelativeDiffPath(row),
      moved: !!row?.moved,
      reasonSummary: String(row?.reasonSummary || ""),
      impactCount: Number(row?.impactCount || 0),
      impactSummary: String(row?.impactSummary || ""),
      renameCandidate: row?.renameCandidate || null,
      preview: {
        source: compactDiffValuePreview(row?.left),
        target: compactDiffValuePreview(row?.right)
      }
    };
  }
  function buildDiffSectionSummaries(rows, fetchIssues = []) {
    const groupedRows = /* @__PURE__ */ new Map();
    const issueKeys = /* @__PURE__ */ new Set();
    (rows || []).forEach((row) => {
      const key = String(row?.sectionKey || row?.section || "").trim() || "未分類";
      if (!groupedRows.has(key)) groupedRows.set(key, []);
      groupedRows.get(key).push(row);
    });
    (fetchIssues || []).forEach((issue) => {
      const key = String(issue?.sectionKey || issue?.section || "").trim();
      if (key) issueKeys.add(key);
    });
    const keys = [.../* @__PURE__ */ new Set([...groupedRows.keys(), ...issueKeys])];
    keys.sort((a, b) => {
      const ao = getSectionOrder(a);
      const bo = getSectionOrder(b);
      if (ao !== bo) return ao - bo;
      return String(getSectionLabel(a)).localeCompare(String(getSectionLabel(b)));
    });
    return keys.map((sectionKey) => {
      const sectionRows = groupedRows.get(sectionKey) || [];
      const diffRows = getActualDiffRows(sectionRows);
      const typeSummary = buildDiffTypeSummary(sectionRows);
      const severity = summarizeSeverity(sectionRows);
      const issueCount = (fetchIssues || []).filter((issue) => String(issue?.sectionKey || issue?.section || "").trim() === sectionKey).length;
      const reasonCounts = /* @__PURE__ */ new Map();
      diffRows.forEach((row) => {
        const reason = String(row?.reasonSummary || "").trim();
        if (!reason) return;
        reasonCounts.set(reason, (reasonCounts.get(reason) || 0) + 1);
      });
      const topReasons = [...reasonCounts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 3).map(([reason, count]) => ({ reason, count }));
      const samplePaths = [...new Set(diffRows.map((row) => getRelativeDiffPath(row)).filter(Boolean))].slice(0, 3);
      return {
        sectionKey,
        sectionLabel: getSectionLabel(sectionKey),
        ...typeSummary,
        fetchIssueCount: issueCount,
        severity,
        topReasons,
        samplePaths
      };
    });
  }
  function buildDiffHighlightRows(rows, limit = 8) {
    const severityWeight = { high: 300, medium: 200, low: 100 };
    return getActualDiffRows(rows || []).map((row, index) => {
      let score = severityWeight[row?.severity] || 0;
      if (row?.type === "removed") score += 30;
      else if (row?.type === "added") score += 18;
      else score += 12;
      if (row?.renameCandidate) score += 12;
      if (row?.moved) score += 6;
      score += Math.min(40, Number(row?.impactCount || 0) * 4);
      return { row, index, score };
    }).sort((a, b) => b.score - a.score || a.index - b.index).slice(0, limit).map(({ row }) => ({
      ...buildCompactDiffRow(row),
      impactRefs: Array.isArray(row?.impactRefs) ? row.impactRefs.slice(0, 3) : []
    }));
  }
  function buildCompactRowsBySection(rows) {
    const grouped = {};
    (rows || []).forEach((row) => {
      const key = String(row?.sectionKey || row?.section || "").trim() || "未分類";
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(buildCompactDiffRow(row));
    });
    return grouped;
  }
  function buildDiffExportPayload({
    sourceBundle,
    targetBundle,
    rows,
    fetchIssues,
    ignoreKeys,
    exportMode,
    exportLabel,
    exportContentMode,
    exportContentLabel,
    normalizationState,
    warning,
    compareScopes,
    compareSourceBundle,
    compareTargetBundle
  } = {}) {
    const safeRows = Array.isArray(rows) ? rows : [];
    const safeIssues = Array.isArray(fetchIssues) ? fetchIssues : [];
    const stateMap = normalizationState || {};
    const sectionSummaries = buildDiffSectionSummaries(safeRows, safeIssues);
    const typeSummary = buildDiffTypeSummary(safeRows);
    const compared = shouldIncludeComparedContent(exportContentMode) && Array.isArray(compareScopes) && compareScopes.length ? {
      scopes: [...new Set(compareScopes.filter(Boolean))],
      sourceBundle: compareSourceBundle || null,
      targetBundle: compareTargetBundle || null
    } : null;
    return {
      generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
      export: {
        mode: exportMode || "all",
        label: exportLabel || "全差分",
        contentMode: exportContentMode || "diffOnly",
        contentLabel: exportContentLabel || getDiffExportContentLabel(exportContentMode),
        ignoreKeys: String(ignoreKeys || ""),
        normalizationState: stateMap,
        normalizationLabels: getActiveDiffNormalizationLabels(stateMap)
      },
      source: getBundleExportMeta(sourceBundle),
      target: getBundleExportMeta(targetBundle),
      summary: {
        ...typeSummary,
        fetchIssueCount: safeIssues.length,
        sectionCount: sectionSummaries.length,
        sectionsWithDiff: sectionSummaries.filter((item) => item.diffCount > 0).length,
        severity: summarizeSeverity(safeRows),
        warning: warning || {
          threshold: 0,
          diffCount: typeSummary.diffCount,
          issueCount: safeIssues.length,
          total: typeSummary.diffCount + safeIssues.length,
          exceeded: false
        }
      },
      sectionSummaries,
      highlights: buildDiffHighlightRows(safeRows),
      fetchIssues: safeIssues.map(buildCompactFetchIssue),
      details: {
        rows: safeRows,
        rowsCompact: safeRows.map(buildCompactDiffRow),
        rowsBySection: buildCompactRowsBySection(safeRows)
      },
      compared
    };
  }
  function buildPatchPayload(rows, sourceBundle, targetBundle) {
    const grouped = {};
    const diffRows = getActualDiffRows(rows);
    for (const r of diffRows) {
      const section = r.section || "未分類";
      if (!grouped[section]) grouped[section] = [];
      grouped[section].push({
        type: r.type,
        path: r.path,
        sourceValue: r.left,
        targetValue: r.right,
        moved: !!r.moved,
        movedFrom: r.movedFrom,
        movedTo: r.movedTo,
        arrayKey: r.arrayKey,
        arrayKeyValue: r.arrayKeyValue,
        reasonSummary: r.reasonSummary || "",
        renameCandidate: r.renameCandidate || null,
        impactCount: r.impactCount || 0,
        impactRefs: r.impactRefs || []
      });
    }
    const byType = { added: 0, removed: 0, changed: 0, moved: 0 };
    diffRows.forEach((row) => {
      if (row?.type === "added") byType.added += 1;
      else if (row?.type === "removed") byType.removed += 1;
      else byType.changed += 1;
      if (row?.moved) byType.moved += 1;
    });
    const sectionsMeta = Object.entries(grouped).map(([sectionLabel, sectionRows]) => {
      const sectionKey = SECTION_DEFS.find((item) => item.label === sectionLabel || item.key === sectionLabel)?.key || sectionLabel;
      const sectionTypeSummary = { totalRows: sectionRows.length, diffCount: sectionRows.length, sameCount: 0, added: 0, removed: 0, changed: 0, moved: 0 };
      sectionRows.forEach((row) => {
        if (row?.type === "added") sectionTypeSummary.added += 1;
        else if (row?.type === "removed") sectionTypeSummary.removed += 1;
        else sectionTypeSummary.changed += 1;
        if (row?.moved) sectionTypeSummary.moved += 1;
      });
      return {
        sectionKey,
        sectionLabel: getSectionLabel(sectionKey),
        ...sectionTypeSummary
      };
    }).sort((a, b) => getSectionOrder(a.sectionKey) - getSectionOrder(b.sectionKey) || a.sectionLabel.localeCompare(b.sectionLabel));
    return {
      generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
      source: getBundleExportMeta(sourceBundle),
      target: getBundleExportMeta(targetBundle),
      summary: {
        diffCount: diffRows.length,
        sectionCount: sectionsMeta.length,
        byType
      },
      sectionsMeta,
      sections: grouped
    };
  }
  function buildDiffHtml(sourceBundle, targetBundle, rows, scopes, ignoreKeys, options = {}) {
    const withSameSections = (() => {
      const baseRows = Array.isArray(rows) ? [...rows] : [];
      const scopeList = Array.isArray(scopes) ? scopes.filter(Boolean) : [];
      if (!scopeList.length || !sourceBundle?.sections || !targetBundle?.sections) return baseRows;
      const issueSectionSet = new Set((Array.isArray(options.fetchIssues) ? options.fetchIssues : []).map((issue) => issue?.sectionKey).filter(Boolean));
      const rowSectionSet = new Set(baseRows.map((row) => row?.sectionKey).filter(Boolean));
      const presetState = options.normalizationState || {};
      for (const sec of scopeList) {
        if (rowSectionSet.has(sec) || issueSectionSet.has(sec)) continue;
        const sourceSec = sourceBundle.sections?.[sec];
        const targetSec = targetBundle.sections?.[sec];
        if (!sourceSec || !targetSec) continue;
        const normalizedSource = normalizeSectionForCompare(sec, sourceSec, presetState);
        const normalizedTarget = normalizeSectionForCompare(sec, targetSec, presetState);
        if (JSON.stringify(normalizedSource) !== JSON.stringify(normalizedTarget)) continue;
        const sectionLabel = (SECTION_DEFS.find((def) => def.key === sec) || {}).label || sec;
        baseRows.push({
          _id: `same:${sec}`,
          sectionKey: sec,
          section: sectionLabel,
          type: "same",
          path: sec,
          left: normalizedSource,
          right: normalizedTarget,
          severity: "low"
        });
        rowSectionSet.add(sec);
      }
      return baseRows;
    })();
    const summary = summarizeRows(withSameSections);
    const sectionText = (scopes || []).map((k) => SECTION_DEFS.find((d) => d.key === k)?.label || k).join(", ");
    const sectionLabelMap = Object.fromEntries(SECTION_DEFS.map((d) => [d.key, d.label]));
    const entityKindLabelMap = {
      view: "ビュー",
      report: "グラフ",
      state: "ステータス",
      action: "遷移アクション",
      appAction: "アクション",
      aclEntry: "権限エントリー",
      fieldAclEntry: "フィールド権限",
      recordAclEntry: "レコード権限",
      notification: "通知",
      perRecordNotification: "レコード条件通知",
      reminderNotification: "リマインダー通知",
      category: "カテゴリ",
      plugin: "プラグイン",
      jsCss: "JS/CSS",
      layoutRow: "レイアウト行"
    };
    const MAX_EXPORT_ROWS = 2e3;
    const displayRows = expandSubtableRowsForDisplay(expandEntityRowsForDisplay(withSameSections));
    const exportRows = displayRows.slice(0, MAX_EXPORT_ROWS);
    const fetchIssues = Array.isArray(options.fetchIssues) ? options.fetchIssues : [];
    const warning = options.warning || { threshold: 0, exceeded: false, total: withSameSections.length + fetchIssues.length };
    const exportContentMode = options.exportContentMode || "diffOnly";
    const exportContentLabel = options.exportContentLabel || getDiffExportContentLabel(exportContentMode);
    const compareScopes = Array.isArray(options.compareScopes) ? options.compareScopes : [];
    const compareSourceBundle = options.compareSourceBundle || null;
    const compareTargetBundle = options.compareTargetBundle || null;
    const KUC_REPORT_VERSION = "1.24.0";
    const exportPayload = buildDiffExportPayload({
      sourceBundle,
      targetBundle,
      rows: withSameSections,
      fetchIssues,
      ignoreKeys,
      exportMode: options.exportMode || "all",
      exportLabel: options.exportLabel || "全差分",
      exportContentMode,
      exportContentLabel,
      normalizationState: options.normalizationState || {},
      warning,
      compareScopes,
      compareSourceBundle,
      compareTargetBundle
    });
    const reportMeta = {
      generatedAt: exportPayload.generatedAt,
      scopes: scopes || [],
      sectionText,
      ignoreKeys: exportPayload.export.ignoreKeys,
      exportMode: exportPayload.export.mode,
      exportLabel: exportPayload.export.label,
      exportContentMode: exportPayload.export.contentMode,
      exportContentLabel: exportPayload.export.contentLabel,
      normalizationLabels: exportPayload.export.normalizationLabels,
      warning: exportPayload.summary.warning,
      source: exportPayload.source,
      target: exportPayload.target,
      summary,
      diffOverview: exportPayload.summary,
      sectionSummaries: exportPayload.sectionSummaries,
      highlights: exportPayload.highlights,
      fetchIssues,
      totalRows: withSameSections.length,
      renderedRows: exportRows.length,
      truncated: withSameSections.length > exportRows.length,
      compareScopes
    };
    const sectionSummaryRowsHtml = reportMeta.sectionSummaries.map((item) => `<tr>
        <td>
          <div class="sum-table-name">${esc(item.sectionLabel)}</div>
          <div class="sum-table-sub">${esc(
      item.topReasons.length ? item.topReasons.map((reason) => `${reason.reason} (${reason.count})`).join(" / ") : item.samplePaths.join(" / ") || "-"
    )}</div>
        </td>
        <td>${item.diffCount}</td>
        <td>${item.added}</td>
        <td>${item.removed}</td>
        <td>${item.changed}</td>
        <td>${item.sameCount}</td>
        <td>${item.fetchIssueCount}</td>
        <td>${item.severity.high} / ${item.severity.medium} / ${item.severity.low}</td>
      </tr>`).join("");
    const sectionSummaryHtml = reportMeta.sectionSummaries.length ? `<section class="panel">
            <h3>セクション別サマリー</h3>
            <div class="sum-table-wrap">
              <table class="sum-table">
                <thead><tr><th>セクション</th><th>差分</th><th>追加</th><th>削除</th><th>変更</th><th>同一</th><th>取得失敗</th><th>高 / 中 / 低</th></tr></thead>
                <tbody>${sectionSummaryRowsHtml}</tbody>
              </table>
            </div>
          </section>` : `<section class="panel"><h3>セクション別サマリー</h3><div class="muted-note">対象セクションはありません。</div></section>`;
    const highlightCardsHtml = reportMeta.highlights.map((item) => `<article class="highlight-card">
        <div class="highlight-top">
          <span class="meta-tag reason">${esc(getDiffTypeDisplayLabel(item.type, { moved: item.moved }))}</span>
          <span class="meta-tag impact">重要度 ${esc(getSeverityDisplayLabel(item.severity))}</span>
        </div>
        <div class="highlight-title">${esc(item.sectionLabel)} / ${esc(item.relativePath || item.path || "-")}</div>
        <div class="highlight-sub">${esc(item.reasonSummary || "-")}</div>
        ${item.impactSummary ? `<div class="highlight-sub">影響: ${esc(item.impactSummary)}</div>` : ""}
        ${item.renameCandidate ? `<div class="highlight-sub">名称変更候補: ${esc(item.renameCandidate.fromCode || "-")} → ${esc(item.renameCandidate.toCode || "-")}</div>` : ""}
        <div class="highlight-preview">
          <div class="highlight-pane"><span class="highlight-pane-label">比較元</span>${esc(item.preview.source || "（なし）")}</div>
          <div class="highlight-pane"><span class="highlight-pane-label">比較先</span>${esc(item.preview.target || "（なし）")}</div>
        </div>
      </article>`).join("");
    const highlightSummaryHtml = reportMeta.highlights.length ? `<section class="panel">
            <h3>注目差分</h3>
            <div class="highlight-list">${highlightCardsHtml}</div>
          </section>` : `<section class="panel"><h3>注目差分</h3><div class="muted-note">注目差分はありません。</div></section>`;
    const diffTotal = summary.added + summary.removed + summary.changed;
    const diffRate = summary.total ? Math.round(diffTotal / summary.total * 100) : 0;
    const severitySummary = reportMeta.diffOverview?.severity || { high: 0, medium: 0, low: 0 };
    const compareSectionsHtml = shouldIncludeComparedContent(exportContentMode) && compareScopes.length ? compareScopes.map((secKey) => {
      const label = sectionLabelMap[secKey] || secKey;
      const sourceValue = compareSourceBundle?.sections?.[secKey];
      const targetValue = compareTargetBundle?.sections?.[secKey];
      const sourceRevision = compareSourceBundle?.meta?.sectionRevisions?.[secKey] || "-";
      const targetRevision = compareTargetBundle?.meta?.sectionRevisions?.[secKey] || "-";
      return `<section class="compare-sec">
          <div class="compare-head">
            <span>${esc(label)}</span>
            <span class="compare-head-meta">比較元 rev ${esc(sourceRevision)} / 比較先 rev ${esc(targetRevision)}</span>
          </div>
          <div class="compare-grid">
            <div class="compare-card">
              <div class="compare-title">比較元</div>
              <pre class="compare-pre">${esc(stringifyForDiff(sourceValue))}</pre>
            </div>
            <div class="compare-card">
              <div class="compare-title">比較先</div>
              <pre class="compare-pre">${esc(stringifyForDiff(targetValue))}</pre>
            </div>
          </div>
        </section>`;
    }).join("") : "";
    const compareHtml = compareSectionsHtml ? `<section class="compare-box">
      <div class="compare-box-head">比較対象設定 (${compareScopes.length}セクション)</div>
      ${compareSectionsHtml}
    </section>` : "";
    const srcFieldProps = (() => {
      const s = sourceBundle?.sections?.fieldSettings;
      if (!s || typeof s !== "object" || Array.isArray(s)) return {};
      if (s.properties && typeof s.properties === "object" && !Array.isArray(s.properties)) return s.properties;
      return s;
    })();
    const tgtFieldProps = (() => {
      const s = targetBundle?.sections?.fieldSettings;
      if (!s || typeof s !== "object" || Array.isArray(s)) return {};
      if (s.properties && typeof s.properties === "object" && !Array.isArray(s.properties)) return s.properties;
      return s;
    })();
    const logicScript = `
(() => {
  const REPORT_ROWS = ${safeJsonForScript(exportRows)};
  const SECTION_LABEL_MAP = ${safeJsonForScript(sectionLabelMap)};
  const ENTITY_KIND_LABEL_MAP = ${safeJsonForScript(entityKindLabelMap)};
  const REPORT_META = ${safeJsonForScript(reportMeta)};
  const THEME_KEY = '${TOOL_ID}:diffReportTheme';
  const ACTIVE_TAB_KEY = '${TOOL_ID}:diffReportActiveTab';
  const LINE_DIFF_MAX_CELLS = ${LINE_DIFF_MAX_CELLS};
  const CHAR_DIFF_MAX_CELLS = ${CHAR_DIFF_MAX_CELLS};
  const collapsed = new Set();
  const KUC_SEMVER = '${KUC_REPORT_VERSION}';
  const FIELD_PROPS_SRC = ${safeJsonForScript(srcFieldProps)};
  const FIELD_PROPS_TGT = ${safeJsonForScript(tgtFieldProps)};
  const LAYOUT_ROWS_SRC = ${safeJsonForScript(sourceBundle?.sections?.layoutSettings?.layout || [])};
  const LAYOUT_ROWS_TGT = ${safeJsonForScript(targetBundle?.sections?.layoutSettings?.layout || [])};
  const FLAT_FIELD_PROPS_SRC = collectFlatFieldMap(FIELD_PROPS_SRC);
  const FLAT_FIELD_PROPS_TGT = collectFlatFieldMap(FIELD_PROPS_TGT);
  let activeFieldCode = '';
  let detailModalOpen = false;
  const reportMemory = new Map();

  function safeStorageGet(key) {
    return reportMemory.has(key) ? reportMemory.get(key) : null;
  }

  function safeStorageSet(key, value) {
    reportMemory.set(key, String(value));
  }

  function escHtml(v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function safeText(v) {
    if (v === undefined) return '（未定義）';
    const out = JSON.stringify(v, null, 2);
    return out == null ? String(v) : out;
  }

  function diffTypeLabel(type, moved) {
    const map = { added: '追加', removed: '削除', changed: '変更', moved: '移動', same: '同一' };
    const base = map[type] || String(type || '-');
    return moved && type !== 'moved' ? base + '(移動)' : base;
  }

  function issueSideLabel(side) {
    if (side === 'source') return '比較元';
    if (side === 'target') return '比較先';
    if (side === 'both') return '両方';
    return String(side || '-');
  }

  function rowMatches(row, keyword) {
    if (!keyword) return true;
    const text = [
      row.section || '',
      row.sectionKey || '',
      row.path || '',
      row.reasonSummary || '',
      row.renameCandidate ? (row.renameCandidate.fromCode || '') + ' ' + (row.renameCandidate.toCode || '') : '',
      row.impactSummary || '',
      ...((row.impactRefs || []).map((ref) => (ref.section || '') + ' ' + (ref.kind || '') + ' ' + (ref.path || ''))),
      safeText(row.left),
      safeText(row.right)
    ].join('\\n').toLowerCase();
    return text.includes(keyword);
  }

  function buildLineDiffOps(leftLines, rightLines) {
    const n = leftLines.length;
    const m = rightLines.length;
    if (n * m > LINE_DIFF_MAX_CELLS) return null;
    const dp = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
    for (let i = n - 1; i >= 0; i--) {
      for (let j = m - 1; j >= 0; j--) {
        dp[i][j] = leftLines[i] === rightLines[j]
          ? dp[i + 1][j + 1] + 1
          : Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
    }
    const ops = [];
    let i = 0;
    let j = 0;
    while (i < n || j < m) {
      if (i < n && j < m && leftLines[i] === rightLines[j]) {
        ops.push({ type: 'same', left: leftLines[i], right: rightLines[j] });
        i += 1;
        j += 1;
        continue;
      }
      const down = i < n ? dp[i + 1][j] : -1;
      const right = j < m ? dp[i][j + 1] : -1;
      const diag = (i < n && j < m) ? dp[i + 1][j + 1] : -1;
      if (i < n && j < m && diag >= down && diag >= right) {
        ops.push({ type: 'replace', left: leftLines[i], right: rightLines[j] });
        i += 1;
        j += 1;
        continue;
      }
      if (j < m && (i >= n || right >= down)) {
        ops.push({ type: 'add', right: rightLines[j] });
        j += 1;
      } else if (i < n) {
        ops.push({ type: 'del', left: leftLines[i] });
        i += 1;
      } else {
        break;
      }
    }
    return ops;
  }

  function buildCharDiff(leftText, rightText) {
    const a = [...String(leftText || '')];
    const b = [...String(rightText || '')];
    if (!a.length || !b.length) return null;
    if (a.length * b.length > CHAR_DIFF_MAX_CELLS) return null;
    const dp = Array.from({ length: a.length + 1 }, () => new Uint16Array(b.length + 1));
    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        dp[i][j] = a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1] + 1
          : Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
    const ops = [];
    let i = a.length;
    let j = b.length;
    while (i > 0 || j > 0) {
      if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
        ops.push({ t: 'same', c: a[i - 1] });
        i -= 1;
        j -= 1;
      } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
        ops.push({ t: 'add', c: b[j - 1] });
        j -= 1;
      } else if (i > 0) {
        ops.push({ t: 'del', c: a[i - 1] });
        i -= 1;
      } else {
        break;
      }
    }
    ops.reverse();
    let left = '';
    let right = '';
    for (const op of ops) {
      if (op.t === 'same') {
        const c = escHtml(op.c);
        left += c;
        right += c;
      } else if (op.t === 'del') {
        left += '<mark class="cdel">' + escHtml(op.c) + '</mark>';
      } else {
        right += '<mark class="cadd">' + escHtml(op.c) + '</mark>';
      }
    }
    return { left, right };
  }

  function renderChangedCells(row, useCharDiff) {
    const leftText = safeText(row.left);
    const rightText = safeText(row.right);
    const leftLines = leftText.split('\\n');
    const rightLines = rightText.split('\\n');
    const ops = buildLineDiffOps(leftLines, rightLines);
    if (!ops) {
      return {
        left: '<pre class="blk del">' + escHtml(leftText) + '</pre>',
        right: '<pre class="blk add">' + escHtml(rightText) + '</pre>'
      };
    }

    let leftHtml = '';
    let rightHtml = '';
    let leftNo = 0;
    let rightNo = 0;
    for (const op of ops) {
      if (op.type === 'same') {
        leftNo += 1;
        rightNo += 1;
        leftHtml += '<div class="line"><span class="ln">' + leftNo + '</span>' + escHtml(op.left || '') + '</div>';
        rightHtml += '<div class="line"><span class="ln">' + rightNo + '</span>' + escHtml(op.right || '') + '</div>';
      } else if (op.type === 'replace') {
        leftNo += 1;
        rightNo += 1;
        const cd = useCharDiff ? buildCharDiff(op.left, op.right) : null;
        leftHtml += '<div class="line del"><span class="ln">' + leftNo + '</span>' + (cd ? cd.left : escHtml(op.left || '')) + '</div>';
        rightHtml += '<div class="line add"><span class="ln">' + rightNo + '</span>' + (cd ? cd.right : escHtml(op.right || '')) + '</div>';
      } else if (op.type === 'del') {
        leftNo += 1;
        leftHtml += '<div class="line del"><span class="ln">' + leftNo + '</span>' + escHtml(op.left || '') + '</div>';
        rightHtml += '<div class="line pad"><span class="ln"></span></div>';
      } else {
        rightNo += 1;
        leftHtml += '<div class="line pad"><span class="ln"></span></div>';
        rightHtml += '<div class="line add"><span class="ln">' + rightNo + '</span>' + escHtml(op.right || '') + '</div>';
      }
    }
    return {
      left: '<div class="scroll">' + leftHtml + '</div>',
      right: '<div class="scroll">' + rightHtml + '</div>'
    };
  }

  function renderRowCells(row, useCharDiff) {
    if (row.type === 'same') {
      return {
        left: '<pre class="blk same">' + escHtml(safeText(row.left)) + '</pre>',
        right: '<pre class="blk same-note">（同一）</pre>'
      };
    }
    if (row.type === 'added') {
      return {
        left: '<pre class="blk empty">（なし）</pre>',
        right: '<pre class="blk add">' + escHtml(safeText(row.right)) + '</pre>'
      };
    }
    if (row.type === 'removed') {
      return {
        left: '<pre class="blk del">' + escHtml(safeText(row.left)) + '</pre>',
        right: '<pre class="blk empty">（なし）</pre>'
      };
    }
    return renderChangedCells(row, useCharDiff);
  }

  function renderRowMeta(row) {
    const tags = [];
    if (row.reasonSummary) tags.push('<span class="meta-tag reason">' + escHtml(row.reasonSummary) + '</span>');
    if (row.renameCandidate) {
      const renameTip = '名称変更候補: ' + String(row.renameCandidate.fromCode || '-') + ' → ' + String(row.renameCandidate.toCode || '-')
        + (row.renameCandidate.matchedBy ? ' / 判定: ' + String(row.renameCandidate.matchedBy) : '');
      tags.push('<span class="meta-tag rename" title="' + escHtml(renameTip) + '">名称変更候補</span>');
    }
    if (row.impactCount) {
      const impactText = (row.impactRefs || [])
        .map((ref) => (ref.section || ref.sectionKey || '-') + ':' + (ref.kind || '-'))
        .join(' / ');
      tags.push('<span class="meta-tag impact" title="' + escHtml(String(row.impactCount)) + '件">影響</span>');
    }
    if (!tags.length) return '';
    return '<div class="meta-wrap">' +
      (tags.length ? '<div class="meta-tags">' + tags.join('') + '</div>' : '') +
      '</div>';
  }

  function groupBySection(rows) {
    const order = {};
    const defs = ${safeJsonForScript(SECTION_DEFS.map((d, i) => ({ key: d.key, label: d.label, order: i })))};
    defs.forEach((d) => { order[d.key] = d.order; });
    const map = new Map();
    for (const row of rows) {
      const key = row.sectionKey || row.section || '未分類';
      const label = SECTION_LABEL_MAP[key] || row.section || key;
      if (!map.has(key)) map.set(key, { key, label, rows: [] });
      map.get(key).rows.push(row);
    }
    return [...map.values()].sort((a, b) => {
      const oa = Object.prototype.hasOwnProperty.call(order, a.key) ? order[a.key] : 9999;
      const ob = Object.prototype.hasOwnProperty.call(order, b.key) ? order[b.key] : 9999;
      if (oa !== ob) return oa - ob;
      return String(a.label).localeCompare(String(b.label));
    });
  }

  function collapseFieldRowsForDiffTable(rows) {
    const groups = new Map();
    const passthrough = [];
    (rows || []).forEach((row) => {
      if (row.sectionKey !== FIELD_SECTION_KEY) {
        passthrough.push(row);
        return;
      }
      const info = extractFieldPathInfo(row.path);
      if (!info?.rootPath) {
        passthrough.push(row);
        return;
      }
      if (!groups.has(info.rootPath)) groups.set(info.rootPath, []);
      groups.get(info.rootPath).push(row);
    });

    const collapsed = [];
    groups.forEach((bucket, rootPath) => {
      if (!bucket.length) return;
      const rootRow = bucket.find((row) => {
        const info = extractFieldPathInfo(row.path);
        return !!info && (info.isFieldRoot || info.isSubFieldRoot);
      }) || bucket[0];
      if (bucket.length === 1) {
        collapsed.push(rootRow);
        return;
      }
      const impactRefMap = new Map();
      let impactCount = 0;
      bucket.forEach((row) => {
        impactCount = Math.max(impactCount, Number(row.impactCount || 0));
        (row.impactRefs || []).forEach((ref) => {
          const key = [ref.sectionKey || ref.section || '', ref.kind || '', ref.path || '', ref.label || ''].join('|');
          if (!impactRefMap.has(key)) impactRefMap.set(key, ref);
        });
      });
      const impactRefs = [...impactRefMap.values()];
      impactCount = Math.max(impactCount, impactRefs.length);
      const reasonSummary = 'フィールド単位に集約（設定差分 ' + bucket.length + '件）';
      collapsed.push({
        ...rootRow,
        path: rootPath,
        left: rootRow.left,
        right: rootRow.right,
        reasonSummary,
        renameCandidate: bucket.find((row) => row.renameCandidate)?.renameCandidate || rootRow.renameCandidate || null,
        impactCount,
        impactRefs,
        impactSummary: bucket.find((row) => row.impactSummary)?.impactSummary || rootRow.impactSummary || '',
        __fieldRowCount: bucket.length
      });
    });
    return [...passthrough, ...collapsed];
  }

  function relativePathLabel(row) {
    const path = String(row?.path || '');
    const secKey = String(row?.sectionKey || '');
    if (!path) return '-';
    if (!secKey) return path;
    if (path === secKey) return '（セクション全体）';
    if (path.startsWith(secKey + '.')) return path.slice(secKey.length + 1);
    if (path.startsWith(secKey + '[')) return path.slice(secKey.length);
    return path;
  }

  function summarizeGroupRows(rows) {
    const out = { total: rows.length, diffCount: 0, added: 0, removed: 0, changed: 0, moved: 0, same: 0 };
    rows.forEach((row) => {
      if (row.type === 'same') {
        out.same += 1;
        return;
      }
      out.diffCount += 1;
      if (row.type === 'added') out.added += 1;
      else if (row.type === 'removed') out.removed += 1;
      else out.changed += 1;
      if (row.moved) out.moved += 1;
    });
    return out;
  }

  function groupSummaryLabel(rows) {
    const s = summarizeGroupRows(rows);
    const parts = ['差分 ' + s.diffCount];
    if (s.added) parts.push('追加 ' + s.added);
    if (s.removed) parts.push('削除 ' + s.removed);
    if (s.changed) parts.push('変更 ' + s.changed);
    if (s.moved) parts.push('移動 ' + s.moved);
    if (s.same) parts.push('同一 ' + s.same);
    return parts.join(' / ');
  }

  function renderPathCell(row) {
    const fullPath = String(row?.path || '-');
    const relPath = relativePathLabel(row);
    let pathMain = relPath || fullPath;
    if (row?.sectionKey === FIELD_SECTION_KEY) {
      const info = extractFieldPathInfo(fullPath);
      if (info) {
        const code = info.activeCode || '';
        const field = getFieldRowPayload(row) || getFieldDefinition(code, 'source') || getFieldDefinition(code, 'target') || ({});
        const fieldLabel = String(field.label || field.name || code || 'フィールド');
        const propTitle = fieldChangePropTitle(info, row);
        pathMain = fieldLabel + (code ? ' (' + code + ')' : '') + (propTitle ? ' / ' + propTitle : '');
      }
    } else if (row?.entityLabel || row?.entityKind) {
      const sectionLabel = SECTION_LABEL_MAP[row?.sectionKey || ''] || row?.section || '';
      const kindLabel = ENTITY_KIND_LABEL_MAP[row?.entityKind || ''] || '';
      const parts = [];
      if (sectionLabel) parts.push(sectionLabel);
      if (row?.entityLabel) parts.push((kindLabel ? kindLabel + '「' + row.entityLabel + '」' : row.entityLabel));
      if (row?.entityPropLabel) parts.push(row.entityPropLabel);
      pathMain = parts.join(' / ') || pathMain;
    }
    let html = '<div class="path-main">' + escHtml(pathMain) + '</div>';
    if (relPath && relPath !== fullPath && row?.sectionKey !== FIELD_SECTION_KEY) {
      html += '<div class="path-sub">' + escHtml(fullPath) + '</div>';
    }
    return html + renderRowMeta(row);
  }

  function settingsTone(row) {
    if (row.type === 'same') return 'same';
    if (row.type === 'removed') return 'src';
    if (row.type === 'added') return 'tgt';
    return 'chg';
  }

  const FIELD_SECTION_KEY = 'fieldSettings';

  function relativePathFromRow(path, secKey) {
    if (!path) return '';
    if (path === secKey) return '';
    if (path.startsWith(secKey + '.')) return path.slice(secKey.length + 1);
    if (path.startsWith(secKey + '[')) return path.slice(secKey.length);
    return null;
  }

  function tokenizePath(path) {
    if (!path) return [];
    const out = [];
    const re = /([^[.\\]]+)|\\[(\\d+)\\]/g;
    let m;
    while ((m = re.exec(path)) !== null) {
      if (m[1] != null) out.push(m[1]);
      else out.push(Number(m[2]));
    }
    return out;
  }

  function extractFieldPathInfo(path) {
    const rel = relativePathFromRow(path, FIELD_SECTION_KEY);
    if (rel == null) return null;
    const tokens = tokenizePath(rel);
    if (tokens[0] !== 'properties' || typeof tokens[1] !== 'string') return null;
    const rootCode = tokens[1];
    const isSubField = tokens[2] === 'fields' && typeof tokens[3] === 'string';
    const subFieldCode = isSubField ? tokens[3] : '';
    const tailTokens = tokens.slice(isSubField ? 4 : 2);
    return {
      rootCode,
      subFieldCode,
      activeCode: subFieldCode || rootCode,
      isSubField,
      tailTokens,
      leafKey: tailTokens.length ? String(tailTokens[tailTokens.length - 1]) : '',
      isFieldRoot: !isSubField && tailTokens.length === 0,
      isSubFieldRoot: isSubField && tailTokens.length === 0,
      rootPath: isSubField
        ? FIELD_SECTION_KEY + '.properties.' + rootCode + '.fields.' + subFieldCode
        : FIELD_SECTION_KEY + '.properties.' + rootCode
    };
  }

  function getFieldRowPayload(row) {
    if (!row || row.sectionKey !== FIELD_SECTION_KEY) return null;
    const info = extractFieldPathInfo(row.path);
    if (!info) return null;
    if (row.type === 'added') return row.right;
    if (row.type === 'removed') return row.left;
    return row.right != null ? row.right : row.left;
  }

  function isSubtableFieldsMap(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    const entries = Object.values(value);
    if (!entries.length) return false;
    return entries.every((item) => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) return false;
      return ('code' in item) || ('type' in item) || ('label' in item);
    });
  }

  function renderSubtableFieldsTableHtml(fields) {
    if (!fields || typeof fields !== 'object') {
      return '<div class="sl-empty">（なし）</div>';
    }
    const entries = Object.values(fields);
    if (!entries.length) return '<div class="sl-empty">（項目なし）</div>';
    const headerHtml = '<thead><tr>' +
      '<th class="st-col-no">#</th>' +
      '<th class="st-col-label">フィールド名</th>' +
      '<th class="st-col-type">フィールド型</th>' +
      '<th class="st-col-code">フィールドコード</th>' +
      '<th class="st-col-req">必須</th>' +
      '</tr></thead>';
    const bodyHtml = '<tbody>' + entries.map((child, idx) => {
      const label = String(child?.label || child?.name || child?.code || '（未設定）');
      const typeCode = String(child?.type || '').trim();
      const typeLabel = fieldTypeDisplayLabel(typeCode);
      const code = String(child?.code || '-');
      const required = !!child?.required;
      return '<tr>' +
        '<td class="st-col-no">' + String(idx + 1) + '</td>' +
        '<td class="st-col-label">' + escHtml(label) + '</td>' +
        '<td class="st-col-type"><span class="st-type-chip" data-type="' + escHtml(typeCode) + '">' + escHtml(typeLabel) + '</span></td>' +
        '<td class="st-col-code"><code>' + escHtml(code) + '</code></td>' +
        '<td class="st-col-req">' + (required ? '<span class="st-req">必須</span>' : '') + '</td>' +
      '</tr>';
    }).join('') + '</tbody>';
    return '<div class="st-wrap"><table class="st-fields">' + headerHtml + bodyHtml + '</table></div>';
  }

  function renderSubtableFieldCardHtml(field) {
    const typeLabel = fieldTypeDisplayLabel(field?.type);
    const label = String(field?.label || field?.name || field?.code || '（未設定）');
    const code = String(field?.code || '-');
    const head = '<div class="st-card-head">' +
      '<span class="st-card-kind">' + escHtml(typeLabel) + '</span>' +
      '<span class="st-card-title">' + escHtml(label) + '</span>' +
      '<code class="st-card-code">' + escHtml(code) + '</code>' +
    '</div>';
    const body = renderSubtableFieldsTableHtml(field?.fields);
    return '<div class="st-card">' + head + body + '</div>';
  }

  function formatFieldValueBrief(val, _maxLen) {
    if (val === undefined) return '<span class="sl-empty">（なし）</span>';
    if (val === null) return escHtml('null');
    const t = typeof val;
    if (t === 'string' || t === 'number' || t === 'boolean') {
      // 単独の API ENUM 文字列（"CREATOR" / "BAR" 等）を日本語ラベルに置換
      const s = String(val);
      const labeled = FIELD_TYPE_LABELS[s] || s;
      return escHtml(labeled);
    }
    if (Array.isArray(val)) {
      let j;
      try { j = JSON.stringify(val); } catch (e) { j = String(val); }
      return '<span class="sl-val-mono">' + escHtml(localizeJsonEnums(j)) + '</span>';
    }
    if (t === 'object') {
      // SUBTABLE 全体: テーブル情報 + 内部フィールドを表形式でレンダリング
      if (val.type === 'SUBTABLE' && val.fields && typeof val.fields === 'object') {
        return renderSubtableFieldCardHtml(val);
      }
      // テーブルの fields マップ: 直接表形式でレンダリング
      if (isSubtableFieldsMap(val)) {
        return renderSubtableFieldsTableHtml(val);
      }
      const keys = Object.keys(val);
      if (keys.length && keys.length <= 10) {
        const rows = keys.slice(0, 10).map((k) => {
          const v = val[k];
          let cell;
          if (v === null || v === undefined || typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
            // type/フィールド型を持つ key の場合は値を ENUM ラベルに置換
            const stringified = v === undefined ? '（未定義）' : JSON.stringify(v);
            cell = escHtml(localizeJsonEnums(stringified));
          } else if (k === 'fields' && isSubtableFieldsMap(v)) {
            cell = renderSubtableFieldsTableHtml(v);
          } else {
            let j;
            try { j = JSON.stringify(v); } catch (e) { j = String(v); }
            cell = escHtml(localizeJsonEnums(j));
          }
          return '<tr><th>' + escHtml(k) + '</th><td>' + cell + '</td></tr>';
        }).join('');
        return '<table class="sl-mini-table">' + rows + '</table>';
      }
    }
    let j;
    try { j = JSON.stringify(val); } catch (e) { j = String(val); }
    return '<span class="sl-val-mono">' + escHtml(localizeJsonEnums(j)) + '</span>';
  }

  function formatFieldValuePlain(val, maxLen) {
    const n = maxLen == null ? 8000 : maxLen;
    if (val === undefined) return '（なし）';
    if (val === null) return 'null';
    const t = typeof val;
    if (t === 'string' || t === 'number' || t === 'boolean') {
      const s = String(val);
      return s.length > n ? s.slice(0, n) + '…' : s;
    }
    let j;
    try {
      j = JSON.stringify(val, null, 2);
    } catch (e) {
      j = String(val);
    }
    return j.length > n ? j.slice(0, n) + '…' : j;
  }

  const FIELD_TYPE_LABELS = {
    SINGLE_LINE_TEXT: '文字列（1行）',
    MULTI_LINE_TEXT: '文字列（複数行）',
    RICH_TEXT: 'リッチテキスト',
    NUMBER: '数値',
    CALC: '計算',
    CHECK_BOX: 'チェックボックス',
    RADIO_BUTTON: 'ラジオボタン',
    DROP_DOWN: 'ドロップダウン',
    MULTI_SELECT: '複数選択',
    DATE: '日付',
    TIME: '時刻',
    DATETIME: '日時',
    LINK: 'リンク',
    FILE: '添付ファイル',
    USER_SELECT: 'ユーザー選択',
    ORGANIZATION_SELECT: '組織選択',
    GROUP_SELECT: 'グループ選択',
    CATEGORY: 'カテゴリー',
    STATUS: 'ステータス',
    STATUS_ASSIGNEE: '作業者',
    SUBTABLE: 'テーブル',
    REFERENCE_TABLE: '関連レコード一覧',
    RECORD_NUMBER: 'レコード番号',
    CREATOR: '作成者',
    CREATED_TIME: '作成日時',
    MODIFIER: '更新者',
    UPDATED_TIME: '更新日時',
    SPACER: 'スペース',
    HR: '罫線',
    LABEL: 'ラベル',
    GROUP: 'グループ',
    LOOKUP: 'ルックアップ'
  };

  const FIELD_SETTING_LABELS = {
    label: 'フィールド名',
    name: 'フィールド名',
    code: 'フィールドコード',
    noLabel: 'フィールド名を表示しない',
    required: '必須項目にする',
    unique: '重複禁止にする',
    defaultValue: '初期値',
    defaultNowValue: '現在日時を初期値にする',
    description: '説明',
    minLength: '最小文字数',
    maxLength: '最大文字数',
    minValue: '最小値',
    maxValue: '最大値',
    expression: '計算式',
    hideExpression: '計算式を表示しない',
    options: '項目と順番',
    protocol: 'プロトコル',
    displayScale: '小数点以下の表示桁数',
    digit: '桁区切りを表示する',
    unit: '単位記号',
    unitPosition: '単位記号の位置',
    align: '並び',
    format: '表示形式',
    entities: '選択候補',
    fields: 'テーブル内の項目',
    referenceTable: '関連レコード一覧設定',
    lookup: 'ルックアップ設定'
  };

  const FIELD_ALIGN_LABELS = Object.freeze({
    horizontal: '横',
    vertical: '縦',
    HORIZONTAL: '横',
    VERTICAL: '縦'
  });

  const FIELD_UNIT_POSITION_LABELS = Object.freeze({
    BEFORE: '前に付ける',
    AFTER: '後ろに付ける'
  });

  const CALC_FORMAT_LABELS = Object.freeze({
    NUMBER: '数値（例: 1000）',
    NUMBER_DIGIT: '数値（例: 1,000）',
    DATETIME: '日時（例: 2012-08-06 2:03）',
    DATE: '日付（例: 2012-08-06）',
    TIME: '時刻（例: 2:03）',
    HOUR_MINUTE: '時間（例: 26時間3分）',
    DAY_HOUR_MINUTE: '時間（例: 1日2時間3分）'
  });

  function fieldTypeDisplayLabel(type) {
    const key = String(type || '').trim();
    return FIELD_TYPE_LABELS[key] || key || 'フィールド';
  }

  // diff HTML の値セル内 JSON 文字列に含まれる kintone API ENUM トークンを日本語ラベルへ置換する。
  // 「フィールド型 / ACL エンティティ型 / ビュー / グラフ / 通知タイミング / Webhook イベント」などを網羅。
  function localizeJsonEnums(jsonStr) {
    if (!jsonStr || typeof jsonStr !== 'string') return jsonStr;
    let out = jsonStr;
    const dictionaries = [
      FIELD_TYPE_LABELS,
      // 重複は longer-key first ソートで解消されるため一括連結する
      Object.freeze({
        // ACL / 通知の対象エンティティ
        USER: 'ユーザー', ORGANIZATION: '組織', FIELD_ENTITY: 'フィールド値',
        LOGIN_USER: 'ログインユーザー', ALL: '全員',
        CUSTOM_FIELD: 'カスタムフィールド',
        // Chart / Aggregation
        BAR: '横棒グラフ', COLUMN: '縦棒グラフ', LINE: '折れ線グラフ', PIE: '円グラフ',
        PIVOT_TABLE: 'クロス集計表', AREA: '面グラフ', SPLINE: 'スプライン',
        SPLINE_AREA: 'スプライン面', SCATTER: '散布図',
        COUNT: '件数', SUM: '合計', AVG: '平均', MAX: '最大値', MIN: '最小値',
        NORMAL: '通常', STACKED: '積み上げ', PERCENTAGE: '100%積み上げ',
        // Process assignee
        ONE: '1人選出', ANYONE: '候補の誰でも',
        // Customize / scope
        URL: 'URL指定', ADMIN: '管理者のみ', NONE: '無効',
        // Notification timing
        CREATION: 'レコード作成時', DAYS_OF_WEEK: '曜日指定', WEEKLY: '毎週', MONTHLY: '毎月',
        // Webhook events
        ADD_RECORD: 'レコード追加', UPDATE_RECORD: 'レコード編集',
        DELETE_RECORD: 'レコード削除', UPDATE_STATUS: 'ステータス変更',
        ADD_COMMENT: 'コメント追加', DELETE_COMMENT: 'コメント削除',
        // View kind
        LIST: '一覧', CALENDAR: 'カレンダー', CUSTOM: 'カスタマイズ',
        // Date grouping unit
        YEAR: '年', QUARTER: '四半期', MONTH: '月', WEEK: '週', DAY: '日',
        HOUR: '時', MINUTE: '分'
      })
    ];
    const merged = {};
    dictionaries.forEach((d) => Object.assign(merged, d));
    const keys = Object.keys(merged).sort((a, b) => b.length - a.length);
    for (const key of keys) {
      const jp = merged[key];
      // クォート付きトークン: "ENUM" → "JP"
      out = out.split('"' + key + '"').join('"' + jp + '"');
    }
    return out;
  }

  function fieldAlignDisplayLabel(align) {
    const key = String(align || '').trim();
    return FIELD_ALIGN_LABELS[key] || (key || '（未設定）');
  }

  function fieldUnitPositionDisplayLabel(unitPosition) {
    const key = String(unitPosition || '').trim() || 'BEFORE';
    return FIELD_UNIT_POSITION_LABELS[key] || key;
  }

  function calcFormatDisplayLabel(format) {
    const key = String(format || '').trim() || 'NUMBER';
    return CALC_FORMAT_LABELS[key] || key;
  }

  function hasMeaningfulFieldValue(value) {
    if (value === undefined || value === null) return false;
    if (typeof value === 'string') return value !== '';
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === 'object') return Object.keys(value).length > 0;
    return true;
  }

  function collectFieldOptionLabels(options) {
    if (!options || typeof options !== 'object') return '';
    return Object.keys(options).map((key) => {
      const option = options[key];
      if (!option || typeof option !== 'object') return String(key);
      return String(option.label || key);
    }).join(' / ');
  }

  function collectSortedFieldOptions(options) {
    if (!options || typeof options !== 'object') return [];
    return Object.keys(options)
      .map((key) => {
        const option = options[key];
        return {
          label: String(option?.label || key),
          index: Number(option?.index ?? Number.MAX_SAFE_INTEGER)
        };
      })
      .sort((a, b) => a.index - b.index || a.label.localeCompare(b.label))
      .map((item) => item.label);
  }

  function formatFieldOptionLines(options) {
    const items = collectSortedFieldOptions(options);
    if (!items.length) return '（なし）';
    return items.map((label, idx) => String(idx + 1) + '. ' + label).join('\\\\n');
  }

  function formatSubtableFieldLines(fields) {
    if (!fields || typeof fields !== 'object') return '（なし）';
    const lines = Object.values(fields).map((child, idx) => {
      const label = String(child?.label || child?.name || child?.code || '（未設定）');
      const typeLabel = fieldTypeDisplayLabel(child?.type);
      const code = String(child?.code || '-');
      return String(idx + 1) + '. ' + label + ' / ' + typeLabel + ' / ' + code;
    });
    return lines.length ? lines.join('\\\\n') : '（なし）';
  }

  function formatFieldSettingValue(value, options = {}) {
    if (options.html) {
      return (value == null || value === '')
        ? '<span class="sl-empty">（なし）</span>'
        : String(value);
    }
    if (options.subtableFields) {
      return renderSubtableFieldsTableHtml(value);
    }
    if (options.boolLabel) return value ? 'ON' : 'OFF';
    if (Array.isArray(value) || (value && typeof value === 'object')) return formatFieldValueBrief(value, options.maxLen || 240);
    if (value === undefined || value === null || value === '') return '（なし）';
    return escHtml(String(value));
  }

  function renderFieldToggleRow(label, checked) {
    return '<div class="kf-toggle' + (checked ? ' is-on' : '') + '">' +
      '<span class="kf-toggle-box" aria-hidden="true"></span>' +
      '<span class="kf-toggle-label">' + escHtml(label) + '</span>' +
    '</div>';
  }

  function renderFieldFormRow(label, value, options = {}) {
    const valueCls = 'kf-value'
      + (options.textarea ? ' kf-value--textarea' : '')
      + ((options.html || options.subtableFields) ? ' kf-value--rich' : '');
    return '<section class="kf-row' + (options.full ? ' kf-row--full' : '') + '">' +
      '<div class="kf-label">' + escHtml(label) + (options.required ? ' <span class="kf-required">*</span>' : '') + '</div>' +
      '<div class="' + valueCls + '">' + formatFieldSettingValue(value, options) + '</div>' +
    '</section>';
  }

  function renderFieldBlock(title, innerHtml) {
    return '<div class="kf-extra">' +
      '<div class="kf-extra-title">' + escHtml(title) + '</div>' +
      innerHtml +
    '</div>';
  }

  function renderFieldUnitBlock(field) {
    return renderFieldBlock(
      '単位記号',
      '<div class="kf-extra-grid">' +
        renderFieldFormRow('記号', field.unit || '') +
        renderFieldFormRow('位置', fieldUnitPositionDisplayLabel(field.unitPosition)) +
      '</div>'
    );
  }

  function renderFieldLimitsBlock(field) {
    return renderFieldBlock(
      '値の制限（整数で指定）',
      '<div class="kf-extra-grid">' +
        renderFieldFormRow('最小', field.minValue) +
        renderFieldFormRow('最大', field.maxValue) +
      '</div>'
    );
  }

  function buildFieldExtraRows(field) {
    const rows = [];
    const push = (label, value, options = {}) => {
      if (!hasMeaningfulFieldValue(value)) return;
      rows.push({ label, value, options });
    };
    push('タイプ', fieldTypeDisplayLabel(field.type));
    push('説明', field.description, { textarea: true, maxLen: 600 });
    push('最小文字数', field.minLength);
    push('最大文字数', field.maxLength);
    push('最小値', field.minValue);
    push('最大値', field.maxValue);
    push('プロトコル', field.protocol);
    if (field.digit !== undefined) push('桁区切りを表示する', field.digit, { boolLabel: true });
    push('小数点以下の表示桁数', field.displayScale);
    push('単位記号', field.unit);
    if (field.unitPosition) push('単位記号の位置', fieldUnitPositionDisplayLabel(field.unitPosition));
    if (field.align) push('並び', fieldAlignDisplayLabel(field.align));
    if (field.format) push('表示形式', calcFormatDisplayLabel(field.format));
    if (field.hideExpression !== undefined) push('計算式を表示しない', field.hideExpression, { boolLabel: true });
    if (field.options) push('項目と順番', formatFieldOptionLines(field.options), { textarea: true, maxLen: 600 });
    if (field.entities) push('選択候補', Array.isArray(field.entities) ? field.entities.join(' / ') : field.entities, { textarea: true, maxLen: 600 });
    if (field.expression) push('計算式', field.expression, { textarea: true, maxLen: 600 });
    if (field.lookup) push('ルックアップ設定', field.lookup, { textarea: true, maxLen: 600 });
    if (field.referenceTable) push('関連レコード一覧設定', field.referenceTable, { textarea: true, maxLen: 600 });
    if (field.fields) push('テーブル内の項目', field.fields, { subtableFields: true, full: true });
    if (field.__parentTableCode) push('テーブル', field.__parentTableLabel || field.__parentTableCode);
    return rows;
  }

  function renderGenericFieldSnapshotBody(field) {
    const extras = buildFieldExtraRows(field);
    const toggleRows = [
      renderFieldToggleRow('フィールド名を表示しない', !!field.noLabel),
      renderFieldToggleRow('必須項目にする', !!field.required)
    ];
    if (field.unique !== undefined) toggleRows.push(renderFieldToggleRow('重複禁止にする', !!field.unique));
    if (field.defaultNowValue !== undefined) toggleRows.push(renderFieldToggleRow('現在日時を初期値にする', !!field.defaultNowValue));
    return renderFieldFormRow('フィールド名', field.label || field.name || '（未設定）', { required: true }) +
      '<div class="kf-toggle-list">' + toggleRows.join('') + '</div>' +
      renderFieldFormRow('初期値', field.defaultNowValue ? '現在日時を使用' : field.defaultValue, { textarea: true, full: true, maxLen: 600 }) +
      renderFieldFormRow('フィールドコード', field.code || '-', { required: true, full: true }) +
      (extras.length ? '<div class="kf-extra"><div class="kf-extra-title">その他の設定</div><div class="kf-extra-grid">' + extras.map((item) => renderFieldFormRow(item.label, item.value, item.options)).join('') + '</div></div>' : '');
  }

  function renderRadioFieldSnapshotBody(field) {
    return renderFieldFormRow('フィールド名', field.label || field.name || '（未設定）', { required: true }) +
      '<div class="kf-toggle-list">' +
        renderFieldToggleRow('フィールド名を表示しない', !!field.noLabel) +
      '</div>' +
      renderFieldFormRow('項目と順番', formatFieldOptionLines(field.options), { textarea: true, full: true, maxLen: 1200 }) +
      renderFieldFormRow('並び', fieldAlignDisplayLabel(field.align), { full: true }) +
      renderFieldFormRow('初期値', field.defaultValue, { full: true }) +
      renderFieldFormRow('フィールドコード', field.code || '-', { required: true, full: true });
  }

  function renderNumberFieldSnapshotBody(field) {
    return renderFieldFormRow('フィールド名', field.label || field.name || '（未設定）', { required: true }) +
      '<div class="kf-toggle-list">' +
        renderFieldToggleRow('フィールド名を表示しない', !!field.noLabel) +
        renderFieldToggleRow('桁区切りを表示する', !!field.digit) +
        renderFieldToggleRow('必須項目にする', !!field.required) +
        renderFieldToggleRow('値の重複を禁止する', !!field.unique) +
      '</div>' +
      renderFieldLimitsBlock(field) +
      renderFieldFormRow('初期値', field.defaultValue, { full: true }) +
      renderFieldFormRow('小数点以下の表示桁数', field.displayScale, { full: true }) +
      renderFieldUnitBlock(field) +
      renderFieldFormRow('フィールドコード', field.code || '-', { required: true, full: true });
  }

  function renderCalcFieldSnapshotBody(field) {
    return renderFieldFormRow('フィールド名', field.label || field.name || '（未設定）', { required: true }) +
      '<div class="kf-toggle-list">' +
        renderFieldToggleRow('フィールド名を表示しない', !!field.noLabel) +
      '</div>' +
      renderFieldFormRow('計算式', field.expression, { required: true, textarea: true, full: true, maxLen: 1200 }) +
      '<div class="kf-toggle-list">' +
        renderFieldToggleRow('計算式を表示しない', !!field.hideExpression) +
      '</div>' +
      renderFieldFormRow('表示形式', calcFormatDisplayLabel(field.format), { full: true }) +
      renderFieldFormRow('小数点以下の表示桁数', field.displayScale, { full: true }) +
      renderFieldUnitBlock(field) +
      renderFieldFormRow('フィールドコード', field.code || '-', { required: true, full: true });
  }

  function renderSubtableFieldSnapshotBody(field) {
    return renderFieldFormRow('フィールド名', field.label || field.name || '（未設定）', { required: true }) +
      '<div class="kf-toggle-list">' +
        renderFieldToggleRow('フィールド名を表示しない', !!field.noLabel) +
      '</div>' +
      renderFieldFormRow('テーブル内の項目', field.fields, { subtableFields: true, full: true }) +
      renderFieldFormRow('フィールドコード', field.code || '-', { required: true, full: true });
  }

  function renderFieldSnapshotCard(sideLabel, field, tone) {
    if (!field) {
      return '<section class="fd-snapshot fd-snapshot--' + tone + '"><div class="fd-pane-label">' + escHtml(sideLabel) + '</div><div class="fd-empty">この側にはフィールドがありません。</div></section>';
    }
    const typeLabel = fieldTypeDisplayLabel(field.type);
    const bodyHtml =
      field.type === 'RADIO_BUTTON' ? renderRadioFieldSnapshotBody(field)
      : field.type === 'NUMBER' ? renderNumberFieldSnapshotBody(field)
      : field.type === 'CALC' ? renderCalcFieldSnapshotBody(field)
      : field.type === 'SUBTABLE' ? renderSubtableFieldSnapshotBody(field)
      : renderGenericFieldSnapshotBody(field);
    return '<section class="fd-snapshot fd-snapshot--' + tone + '">' +
      '<div class="kf-modal">' +
        '<div class="kf-modal-head">' +
          '<div class="kf-modal-title"><span class="kf-type-icon" aria-hidden="true"></span><strong>' + escHtml(typeLabel) + ' の設定</strong></div>' +
          '<span class="kf-side kf-side--' + tone + '">' + escHtml(sideLabel) + '</span>' +
        '</div>' +
        '<div class="kf-modal-body">' +
          bodyHtml +
        '</div>' +
      '</div>' +
    '</section>';
  }

  function fieldChangePropTitle(info, row) {
    if (!info) return row.path || '-';
    if (info.isFieldRoot || info.isSubFieldRoot) return '';
    if (!info.tailTokens.length) return row.path || '-';
    if (FIELD_SETTING_LABELS[info.leafKey]) return FIELD_SETTING_LABELS[info.leafKey];
    if (String(row?.path || '').includes('.lookup.')) return 'ルックアップ設定';
    if (String(row?.path || '').includes('.referenceTable.')) return '関連レコード一覧設定';
    if (String(row?.path || '').includes('.options.')) return '項目と順番';
    if (String(row?.path || '').includes('.fields.')) return 'テーブル内の項目';
    return info.tailTokens.map((t) => (typeof t === 'number' ? '[' + t + ']' : String(t))).join('.');
  }

  function collectFlatFieldMap(properties, out) {
    const dest = out || ({});
    function walk(props, parentMeta) {
      Object.entries(props || ({})).forEach(([code, field]) => {
        if (!field || typeof field !== 'object' || Array.isArray(field)) return;
        const normalizedCode = String(field.code || code);
        const next = { ...field, code: normalizedCode };
        if (parentMeta) {
          next.__parentTableCode = parentMeta.code;
          next.__parentTableLabel = parentMeta.label;
        }
        dest[normalizedCode] = next;
        if (field.type === 'SUBTABLE' && field.fields && typeof field.fields === 'object') {
          walk(field.fields, {
            code: normalizedCode,
            label: String(field.label || field.name || normalizedCode)
          });
        }
      });
    }
    walk(properties, null);
    return dest;
  }

  function getFieldDefinition(code, side) {
    if (!code) return null;
    return side === 'target' ? (FLAT_FIELD_PROPS_TGT[code] || null) : (FLAT_FIELD_PROPS_SRC[code] || null);
  }

  function collectLayoutItemCodes(value, out) {
    const bucket = out || [];
    if (Array.isArray(value)) {
      value.forEach((item) => collectLayoutItemCodes(item, bucket));
      return bucket;
    }
    if (!value || typeof value !== 'object') return bucket;
    if (value.code) bucket.push(String(value.code));
    if (Array.isArray(value.fields)) collectLayoutItemCodes(value.fields, bucket);
    if (Array.isArray(value.layout)) collectLayoutItemCodes(value.layout, bucket);
    return bucket;
  }

  function collectLayoutFieldCodes(rows, out) {
    return collectLayoutItemCodes(rows || [], out || []);
  }

  function getValueAtTokens(root, tokens) {
    let cur = root;
    for (const token of tokens || []) {
      if (cur == null) return undefined;
      cur = cur[token];
    }
    return cur;
  }

  function findLayoutFieldCodeByPath(path) {
    const rel = relativePathFromRow(path, 'layoutSettings');
    if (rel == null) return '';
    const tokens = tokenizePath(rel);
    const roots = [{ layout: LAYOUT_ROWS_SRC }, { layout: LAYOUT_ROWS_TGT }];
    for (const root of roots) {
      for (let i = tokens.length; i > 0; i--) {
        const value = getValueAtTokens(root, tokens.slice(0, i));
        if (value && typeof value === 'object' && !Array.isArray(value) && value.code) {
          return String(value.code);
        }
      }
    }
    return '';
  }

  function resolveLayoutRowCodes(row) {
    const codes = new Set();
    const rel = relativePathFromRow(row?.path, 'layoutSettings');
    const tokens = tokenizePath(rel);
    const leaf = tokens.length ? tokens[tokens.length - 1] : '';
    if ((leaf === 'code' || leaf === 'fieldCode') && typeof row?.left === 'string') codes.add(String(row.left));
    if ((leaf === 'code' || leaf === 'fieldCode') && typeof row?.right === 'string') codes.add(String(row.right));
    collectLayoutItemCodes(row?.left, []).forEach((code) => codes.add(String(code)));
    collectLayoutItemCodes(row?.right, []).forEach((code) => codes.add(String(code)));
    const byPath = findLayoutFieldCodeByPath(row?.path || '');
    if (byPath) codes.add(byPath);
    return [...codes].filter(Boolean);
  }

  function fieldStatusLabel(status) {
    if (status === 'added') return '追加';
    if (status === 'removed') return '削除';
    if (status === 'modified') return '変更';
    return '同一';
  }

  function fieldStatusTone(status) {
    if (status === 'added') return 'added';
    if (status === 'removed') return 'removed';
    if (status === 'modified') return 'changed';
    return 'same';
  }

  function collectAllFieldCodes() {
    const codes = new Set([...Object.keys(FLAT_FIELD_PROPS_SRC || ({})), ...Object.keys(FLAT_FIELD_PROPS_TGT || ({}))]);
    REPORT_ROWS.forEach((row) => {
      if (!row) return;
      if (row.sectionKey === FIELD_SECTION_KEY) {
        const info = extractFieldPathInfo(row.path);
        const code = info?.activeCode || getFieldRowPayload(row)?.code || '';
        if (code) codes.add(String(code));
        return;
      }
      if (row.sectionKey === 'layoutSettings') {
        resolveLayoutRowCodes(row).forEach((code) => codes.add(String(code)));
      }
    });
    return [...codes];
  }

  function buildFieldReviewModel() {
    const sourceLayoutOrder = [...new Set(collectLayoutFieldCodes(LAYOUT_ROWS_SRC, []))];
    const targetLayoutOrder = [...new Set(collectLayoutFieldCodes(LAYOUT_ROWS_TGT, []))];
    const sourceOrderMap = new Map(sourceLayoutOrder.map((code, idx) => [code, idx]));
    const targetOrderMap = new Map(targetLayoutOrder.map((code, idx) => [code, idx]));
    const groupMap = new Map();

    function ensureGroup(code) {
      const safeCode = String(code || '').trim();
      if (!safeCode) return null;
      if (!groupMap.has(safeCode)) {
        groupMap.set(safeCode, {
          code: safeCode,
          sourceField: FLAT_FIELD_PROPS_SRC[safeCode] || null,
          targetField: FLAT_FIELD_PROPS_TGT[safeCode] || null,
          fieldRows: [],
          layoutRows: []
        });
      }
      return groupMap.get(safeCode);
    }

    collectAllFieldCodes().forEach((code) => ensureGroup(code));

    REPORT_ROWS.forEach((row) => {
      if (!row) return;
      if (row.sectionKey === FIELD_SECTION_KEY) {
        const info = extractFieldPathInfo(row.path);
        const code = info?.activeCode || getFieldRowPayload(row)?.code || '';
        const group = ensureGroup(code);
        if (group) group.fieldRows.push(row);
        return;
      }
      if (row.sectionKey === 'layoutSettings') {
        resolveLayoutRowCodes(row).forEach((code) => {
          const group = ensureGroup(code);
          if (group) group.layoutRows.push(row);
        });
      }
    });

    const statusOrder = { modified: 0, added: 1, removed: 2, unchanged: 3 };
    const groups = [...groupMap.values()].map((group) => {
      const field = group.targetField || group.sourceField || { code: group.code };
      const label = String(field.label || field.name || group.code);
      const type = String(field.type || group.sourceField?.type || group.targetField?.type || '-');
      const diffFieldRows = group.fieldRows.filter((row) => row.type !== 'same');
      const diffLayoutRows = group.layoutRows.filter((row) => row.type !== 'same');
      const diffRows = [...diffFieldRows];
      const allRows = [...group.fieldRows, ...group.layoutRows];
      const impactRefs = [];
      const impactSeen = new Set();
      allRows.forEach((row) => {
        (row.impactRefs || []).forEach((ref) => {
          const sig = [ref.sectionKey, ref.kind, ref.path, ref.label].join('|');
          if (impactSeen.has(sig)) return;
          impactSeen.add(sig);
          impactRefs.push(ref);
        });
      });
      const status = !group.sourceField && group.targetField
        ? 'added'
        : group.sourceField && !group.targetField
          ? 'removed'
          : diffFieldRows.length
            ? 'modified'
            : 'unchanged';
      const layoutIndex = sourceOrderMap.has(group.code)
        ? sourceOrderMap.get(group.code)
        : targetOrderMap.has(group.code)
          ? targetOrderMap.get(group.code) + 10000
          : 999999;
      return {
        ...group,
        label,
        type,
        status,
        diffCount: diffRows.length,
        settingDiffCount: diffFieldRows.length,
        layoutDiffCount: diffLayoutRows.length,
        impactCount: impactRefs.length,
        impactRefs,
        rows: diffRows,
        allRows,
        parentTableCode: String(field.__parentTableCode || ''),
        parentTableLabel: String(field.__parentTableLabel || ''),
        layoutIndex
      };
    }).sort((a, b) => {
      const ao = statusOrder[a.status] ?? 9;
      const bo = statusOrder[b.status] ?? 9;
      if (ao !== bo) return ao - bo;
      if (a.layoutIndex !== b.layoutIndex) return a.layoutIndex - b.layoutIndex;
      return String(a.code).localeCompare(String(b.code));
    });

    return {
      groups,
      groupMap: new Map(groups.map((group) => [group.code, group])),
      sourceLayoutOrder,
      targetLayoutOrder
    };
  }

  function fieldGroupSearchText(group) {
    return [
      group.code,
      group.label,
      group.type,
      group.parentTableCode,
      group.parentTableLabel,
      ...group.allRows.map((row) => row.path || ''),
      ...group.allRows.map((row) => row.reasonSummary || ''),
      ...group.allRows.map((row) => safeText(row.left)),
      ...group.allRows.map((row) => safeText(row.right))
    ].join('\\n').toLowerCase();
  }

  function fieldGroupMatchesKeyword(group, keyword) {
    if (!keyword) return true;
    return fieldGroupSearchText(group).includes(keyword);
  }

  function ensureActiveFieldCode(groups, options) {
    const preserveMissing = !!options?.preserveMissing;
    if (!groups.length) {
      if (!preserveMissing) activeFieldCode = '';
      return activeFieldCode;
    }
    if (activeFieldCode && groups.some((group) => group.code === activeFieldCode)) return activeFieldCode;
    if (preserveMissing && activeFieldCode) return activeFieldCode;
    const preferred = groups.find((group) => group.diffCount > 0) || groups[0];
    activeFieldCode = preferred.code;
    return activeFieldCode;
  }

  function updateStatsFromCounts(counts) {
    document.getElementById('stat-total').textContent = String(counts.total || 0);
    document.getElementById('stat-added').textContent = String(counts.added || 0);
    document.getElementById('stat-removed').textContent = String(counts.removed || 0);
    document.getElementById('stat-changed').textContent = String(counts.changed || 0);
    document.getElementById('stat-moved').textContent = String(counts.moved || 0);
    document.getElementById('stat-same').textContent = String(counts.same || 0);
  }

  function updateStatsFromFieldGroups(groups) {
    const counts = { total: groups.length, added: 0, removed: 0, changed: 0, moved: 0, same: 0 };
    groups.forEach((group) => {
      if (group.status === 'added') counts.added += 1;
      else if (group.status === 'removed') counts.removed += 1;
      else if (group.status === 'modified') counts.changed += 1;
      else counts.same += 1;
      if (group.allRows.some((row) => !!row.moved)) counts.moved += 1;
    });
    updateStatsFromCounts(counts);
  }

  function renderFieldSummaryChips(group, options) {
    const includeLayout = !!options?.includeLayout;
    const chips = [];
    if (group.settingDiffCount) chips.push('<span class="fc-chip">設定 ' + group.settingDiffCount + '</span>');
    if (includeLayout && group.layoutDiffCount) chips.push('<span class="fc-chip">配置 ' + group.layoutDiffCount + '</span>');
    if (group.impactCount) chips.push('<span class="fc-chip">影響 ' + group.impactCount + '</span>');
    if (group.parentTableCode) chips.push('<span class="fc-chip fc-chip--muted">テーブル ' + escHtml(group.parentTableLabel || group.parentTableCode) + '</span>');
    if (!chips.length) chips.push('<span class="fc-chip fc-chip--muted">差分なし</span>');
    return chips.join('');
  }

  function buildFieldDetailEntries(group, hideSame) {
    const entries = [];
    group.fieldRows.forEach((row) => {
      if (hideSame && row.type === 'same') return;
      entries.push({
        area: 'フィールド設定',
        title: fieldChangePropTitle(extractFieldPathInfo(row.path), row),
        row
      });
    });
    const typeOrder = { removed: 0, added: 1, changed: 2, same: 3 };
    return entries.sort((a, b) => {
      if (a.area !== b.area) return a.area === 'フィールド設定' ? -1 : 1;
      const ao = typeOrder[a.row.type] ?? 9;
      const bo = typeOrder[b.row.type] ?? 9;
      if (ao !== bo) return ao - bo;
      return String(a.row.path || '').localeCompare(String(b.row.path || ''));
    });
  }

  function renderFieldDetailPanel(code, model, options) {
    const group = model.groupMap.get(code || '');
    if (!group) {
      return '<section class="fd-panel"><div class="fd-empty">対象のフィールドが現在の表示条件に含まれていません。検索条件か「同一項目を隠す」を見直してから、もう一度「設定差分を開く」を押してください。</div></section>';
    }
    const entries = buildFieldDetailEntries(group, !!options?.hideSame);
    const tone = fieldStatusTone(group.status);
    return '<section class="fd-panel">' +
      '<div class="fd-head">' +
        '<div>' +
          '<div class="fd-title">' + escHtml(group.label) + '</div>' +
          '<div class="fd-sub">code: <code>' + escHtml(group.code) + '</code> / type: ' + escHtml(group.type || '-') + (group.parentTableCode ? ' / テーブル: ' + escHtml(group.parentTableLabel || group.parentTableCode) : '') + '</div>' +
        '</div>' +
        '<span class="fd-status fd-status--' + tone + '">' + escHtml(fieldStatusLabel(group.status)) + '</span>' +
      '</div>' +
      '<div class="fc-chip-row">' + renderFieldSummaryChips(group) + '</div>' +
      '<div class="fd-snapshots">' +
        renderFieldSnapshotCard('比較元', group.sourceField, 'src') +
        renderFieldSnapshotCard('比較先', group.targetField, 'tgt') +
      '</div>' +
      (entries.length ? (
        '<div class="fd-section">' +
          '<h3>設定差分</h3>' +
          '<div class="fd-entry-list">' +
            entries.map((entry) => {
              const row = entry.row;
              const rowTone = row.type === 'added' ? 'added' : row.type === 'removed' ? 'removed' : row.type === 'same' ? 'same' : 'changed';
              return '<article class="fd-entry fd-entry--' + rowTone + '">' +
                '<div class="fd-entry-top">' +
                  '<span class="fd-entry-area">' + escHtml(entry.area) + '</span>' +
                  '<span class="fd-entry-type">' + escHtml(diffTypeLabel(row.type, row.moved)) + '</span>' +
                  '<strong>' + escHtml(entry.title || relativePathLabel(row)) + '</strong>' +
                '</div>' +
                '<div class="fd-path">' + escHtml(row.path || '-') + '</div>' +
                renderRowMeta(row) +
                '<div class="fd-entry-grid">' +
                  '<div class="fd-entry-col"><div class="fd-pane-label">比較元</div><div class="fd-entry-body">' + formatFieldValueBrief(row.left, 280) + '</div></div>' +
                  '<div class="fd-entry-col"><div class="fd-pane-label">比較先</div><div class="fd-entry-body">' + formatFieldValueBrief(row.right, 280) + '</div></div>' +
                '</div>' +
              '</article>';
            }).join('') +
          '</div>' +
        '</div>'
      ) : '<div class="fd-empty">このフィールドに表示対象の差分はありません。</div>') +
    '</section>';
  }

  function closeFieldDetailModal() {
    detailModalOpen = false;
    const modal = document.getElementById('fieldDetailModal');
    const body = document.getElementById('fieldDetailModalBody');
    if (modal) modal.hidden = true;
    if (body) body.innerHTML = '';
    document.body.classList.remove('has-modal-open');
  }

  function syncFieldDetailModal(model, options) {
    const modal = document.getElementById('fieldDetailModal');
    const body = document.getElementById('fieldDetailModalBody');
    const title = document.getElementById('fieldDetailModalTitle');
    const sub = document.getElementById('fieldDetailModalSub');
    if (!modal || !body || !title || !sub) return;
    if (!detailModalOpen) {
      closeFieldDetailModal();
      return;
    }
    const group = model?.groupMap?.get(activeFieldCode || '');
    if (!group) {
      closeFieldDetailModal();
      return;
    }
    title.textContent = group.label || group.code || 'フィールド詳細';
    sub.textContent = 'code: ' + (group.code || '-') + ' / type: ' + (group.type || '-') + (group.parentTableCode ? ' / テーブル: ' + (group.parentTableLabel || group.parentTableCode) : '');
    body.innerHTML = renderFieldDetailPanel(activeFieldCode, model, options);
    modal.hidden = false;
    document.body.classList.add('has-modal-open');
  }

  function openFieldDetail(code, rerender) {
    const safeCode = String(code || '').trim();
    if (!safeCode) return;
    activeFieldCode = safeCode;
    detailModalOpen = true;
    if (typeof rerender === 'function') rerender();
  }

  function bindFieldSelectionButtons(root, rerender) {
    if (!root) return;
    root.querySelectorAll('[data-field-select]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const code = String(btn.getAttribute('data-field-select') || '').trim();
        if (!code) return;
        openFieldDetail(code, rerender);
      });
    });
  }

  function renderSettingsLikeView() {
    const root = document.getElementById('settingsLikeRoot');
    if (!root) return;
    const nav = document.getElementById('nav');
    if (nav) nav.innerHTML = '';
    const hideSame = !!(document.getElementById('hideSame')).checked;
    const keyword = String((document.getElementById('search')).value || '').trim().toLowerCase();
    const model = buildFieldReviewModel();
    const groups = model.groups.filter((group) => {
      if (!group.fieldRows.length && group.layoutDiffCount > 0) return false;
      if (hideSame && group.status === 'unchanged') return false;
      if (!fieldGroupMatchesKeyword(group, keyword)) return false;
      return true;
    });
    updateStatsFromFieldGroups(groups);
    if (!groups.length) {
      closeFieldDetailModal();
      root.innerHTML = '<div class="no-diff">表示対象のフィールドがありません。検索条件か「同一項目を隠す」を見直してください。</div>';
      return;
    }
    ensureActiveFieldCode(groups, { preserveMissing: detailModalOpen });
    const modelForView = { groupMap: new Map(groups.map((group) => [group.code, group])) };
    root.innerHTML = '<div class="sl-board">' +
      '<div class="sl-legend" role="note">' +
        '<span><strong>フィールド単位</strong>で、フィールドごとの設定差分をまとめて確認できます。</span>' +
        '<span><i class="sl-dot sl-dot--src"></i> 比較元のみ</span>' +
        '<span><i class="sl-dot sl-dot--tgt"></i> 比較先のみ</span>' +
        '<span><i class="sl-dot sl-dot--chg"></i> 差分あり</span>' +
        '<span>「設定差分を開く」でポップアップ表示</span>' +
        (!hideSame ? '<span><i class="sl-dot sl-dot--same"></i> 同一</span>' : '') +
      '</div>' +
      '<div class="fc-shell">' +
        '<div class="fc-list">' +
          groups.map((group, idx) => {
            const tone = fieldStatusTone(group.status);
            const isActive = group.code === activeFieldCode;
            return '<article class="fc-card fc-card--' + tone + (isActive ? ' is-active' : '') + '" id="field_card_' + idx + '">' +
              '<div class="fc-card-head">' +
                '<span class="fd-status fd-status--' + tone + '">' + escHtml(fieldStatusLabel(group.status)) + '</span>' +
                '<span class="fc-code">' + escHtml(group.code) + '</span>' +
              '</div>' +
              '<div class="fc-title">' + escHtml(group.label) + '</div>' +
              '<div class="fc-sub">' + escHtml(group.type || '-') + (group.parentTableCode ? ' / サブテーブル: ' + escHtml(group.parentTableLabel || group.parentTableCode) : '') + '</div>' +
              '<div class="fc-chip-row">' + renderFieldSummaryChips(group) + '</div>' +
              '<button type="button" class="btn' + (isActive ? ' primary' : '') + '" data-field-select="' + escHtml(group.code) + '">' + escHtml(group.diffCount ? '設定差分を開く' : '設定を開く') + '</button>' +
            '</article>';
          }).join('') +
        '</div>' +
      '</div>' +
    '</div>';
    if (nav) {
      groups.forEach((group, idx) => {
        const navItem = document.createElement('div');
        navItem.className = 'nav-item' + (group.code === activeFieldCode ? ' active' : '');
        navItem.innerHTML = '<span>' + escHtml(group.code) + '</span><span class="badge">' + String(group.diffCount || 0) + '</span>';
        navItem.onclick = () => {
          activeFieldCode = group.code;
          renderSettingsLikeView();
          const el = document.getElementById('field_card_' + idx);
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        };
        nav.appendChild(navItem);
      });
    }
    bindFieldSelectionButtons(root, renderSettingsLikeView);
    syncFieldDetailModal(modelForView, { hideSame });
  }

  function getActiveReportTab() {
    const btn = document.querySelector('.settings-tab:not(.passive)[data-report-tab]');
    return btn ? btn.getAttribute('data-report-tab') : 'summary';
  }

  function renderSettingsLikeViewLegacy() {
    const root = document.getElementById('settingsLikeRoot');
    if (!root) return;
    const hideSame = !!(document.getElementById('hideSame')).checked;
    const keyword = String((document.getElementById('search')).value || '').trim().toLowerCase();
    const filtered = REPORT_ROWS.filter((row) => {
      if (hideSame && row.type === 'same') return false;
      return rowMatches(row, keyword);
    });
    const fieldRows = filtered.filter((row) => row.sectionKey === FIELD_SECTION_KEY);
    updateStats(fieldRows);
    const nav = document.getElementById('nav');
    if (nav) nav.innerHTML = '';
    if (!fieldRows.length) {
      root.innerHTML = '<div class="no-diff">フィールド設定の差分がありません。比較対象セクションに「フィールド設定」を含めて出力するか、検索・「同一を隠す」を調整してください。</div>';
      return;
    }
    const groups = groupFieldSettingsRows(fieldRows);
    const Kuc = getKuc();
    const useKuc = !!Kuc && !document.body.classList.contains('dark');

    function buildLegendHtml(kucOn) {
      let h = '<div class="sl-legend" role="note">';
      if (kucOn) {
        h += '<span><strong>フィールド設定のみ</strong> · kintone UI Component（KUC）' + KUC_SEMVER + ' の FieldGroup / TextArea で、管理画面のフォームに近い見た目にしています（CDN読込が必要です）。</span>';
      } else {
        h += '<span><strong>フィールド設定のみ</strong> · フィールド単位で項目ごとに比較します。KUC が読み込めない環境・ダークテーマ時はこのレイアウトになります。</span>';
      }
      h += '<span><i class="sl-dot sl-dot--src"></i> 比較元のみ（青）</span>';
      h += '<span><i class="sl-dot sl-dot--tgt"></i> 比較先のみ（緑）</span>';
      h += '<span><i class="sl-dot sl-dot--chg"></i> 変更・移動（黄）</span>';
      if (!hideSame) h += '<span><i class="sl-dot sl-dot--same"></i> 同一</span>';
      h += '</div>';
      return h;
    }

    if (useKuc) {
      root.innerHTML = '';
      const board = document.createElement('div');
      board.className = 'sl-board sl-board--kuc';
      board.innerHTML = buildLegendHtml(true);
      groups.forEach((g, idx) => {
        const info0 = g.info;
        const headLine = info0 ? summarizeFieldGroupHeader(g.rows, info0) : 'その他（パス単位）';
        const navLabel = info0 ? info0.activeCode : 'その他';
        const inner = document.createElement('div');
        inner.className = 'sl-kuc-fg-inner';
        g.rows.forEach((row) => {
          const info = extractFieldPathInfo(row.path);
          const tone = settingsTone(row);
          const badge = diffTypeLabel(row.type, row.moved);
          const propTitle = fieldChangePropTitle(info, row);
          const wrap = document.createElement('div');
          wrap.className = 'sl-kuc-row sl-item--' + tone;
          const top = document.createElement('div');
          top.className = 'sl-kuc-row-head';
          const b = document.createElement('span');
          b.className = 'sl-badge';
          b.textContent = badge;
          const title = document.createElement('span');
          title.className = 'sl-prop-name';
          title.title = row.path || '';
          title.textContent = propTitle;
          top.appendChild(b);
          top.appendChild(title);
          wrap.appendChild(top);
          const sub = document.createElement('div');
          sub.className = 'sl-path sl-path--sub';
          sub.title = row.path || '';
          sub.textContent = row.path || '-';
          wrap.appendChild(sub);
          const metaHost = document.createElement('div');
          metaHost.className = 'sl-kuc-meta';
          metaHost.innerHTML = renderRowMeta(row);
          wrap.appendChild(metaHost);
          const pair = document.createElement('div');
          pair.className = 'sl-kuc-pair';
          const leftTa = new Kuc.TextArea({
            label: '比較元',
            value: formatFieldValuePlain(row.left),
            disabled: true,
            requiredIcon: false
          });
          const rightTa = new Kuc.TextArea({
            label: '比較先',
            value: formatFieldValuePlain(row.right),
            disabled: true,
            requiredIcon: false
          });
          pair.appendChild(leftTa);
          pair.appendChild(rightTa);
          wrap.appendChild(pair);
          inner.appendChild(wrap);
        });
        const fg = new Kuc.FieldGroup({
          label: headLine + '（' + g.rows.length + ' 件）',
          expanded: true,
          content: inner
        });
        fg.id = 'slg_' + idx;
        fg.className = 'sl-kuc-field-group';
        board.appendChild(fg);
        if (nav) {
          const navItem = document.createElement('div');
          navItem.className = 'nav-item';
          navItem.innerHTML = '<span>' + escHtml(navLabel) + '</span><span class="badge">' + g.rows.length + '</span>';
          navItem.onclick = () => {
            const el = document.getElementById('slg_' + idx);
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          };
          nav.appendChild(navItem);
        }
      });
      root.appendChild(board);
      return;
    }

    let html = '<div class="sl-board">';
    html += buildLegendHtml(false);
    groups.forEach((g, idx) => {
      const info0 = g.info;
      const headLine = info0 ? summarizeFieldGroupHeader(g.rows, info0) : 'その他（パス単位）';
      const navLabel = info0 ? info0.activeCode : 'その他';
      html += '<section class="sl-group" id="slg_' + idx + '">';
      html += '<header class="sl-group-head"><span class="sl-group-title">' + escHtml(headLine) + '</span>';
      html += '<span class="sl-group-count">' + g.rows.length + ' 件</span></header>';
      html += '<div class="sl-items">';
      g.rows.forEach((row) => {
        const info = extractFieldPathInfo(row.path);
        const tone = settingsTone(row);
        const badge = diffTypeLabel(row.type, row.moved);
        const propTitle = fieldChangePropTitle(info, row);
        html += '<article class="sl-item sl-item--' + tone + ' sl-item--prop">';
        html += '<div class="sl-item-top">';
        html += '<span class="sl-badge">' + escHtml(badge) + '</span>';
        html += '<div class="sl-prop-name" title="' + escHtml(row.path || '-') + '">' + escHtml(propTitle) + '</div>';
        html += '</div>';
        html += '<div class="sl-path sl-path--sub" title="' + escHtml(row.path || '-') + '">' + escHtml(row.path || '-') + '</div>';
        html += renderRowMeta(row);
        html += '<div class="sl-pair">';
        html += '<div class="sl-pair-col"><div class="sl-pane-h">比較元</div><div class="sl-pane sl-pane--src sl-pane--kv">' + formatFieldValueBrief(row.left) + '</div></div>';
        html += '<div class="sl-pair-col"><div class="sl-pane-h">比較先</div><div class="sl-pane sl-pane--tgt sl-pane--kv">' + formatFieldValueBrief(row.right) + '</div></div>';
        html += '</div></article>';
      });
      html += '</div></section>';
      if (nav) {
        const navItem = document.createElement('div');
        navItem.className = 'nav-item';
        navItem.innerHTML = '<span>' + escHtml(navLabel) + '</span><span class="badge">' + g.rows.length + '</span>';
        navItem.onclick = () => {
          const el = document.getElementById('slg_' + idx);
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        };
        nav.appendChild(navItem);
      }
    });
    html += '</div>';
    root.innerHTML = html;
  }

  function updateStats(rows) {
    let added = 0;
    let removed = 0;
    let changed = 0;
    let moved = 0;
    let same = 0;
    for (const row of rows) {
      if (row.type === 'same') same += 1;
      else if (row.type === 'added') added += 1;
      else if (row.type === 'removed') removed += 1;
      else {
        changed += 1;
        if (row.moved) moved += 1;
      }
    }
    document.getElementById('stat-total').textContent = String(rows.length);
    document.getElementById('stat-added').textContent = String(added);
    document.getElementById('stat-removed').textContent = String(removed);
    document.getElementById('stat-changed').textContent = String(changed);
    document.getElementById('stat-moved').textContent = String(moved);
    document.getElementById('stat-same').textContent = String(same);
  }

  function setActiveTab(tabName) {
    const KNOWN_TABS = ['summary', 'diff', 'settingsLike', 'compare'];
    const nextTab = KNOWN_TABS.indexOf(tabName) >= 0 ? tabName : 'summary';
    document.querySelectorAll('[data-report-tab]').forEach((btn) => {
      const active = btn.getAttribute('data-report-tab') === nextTab;
      btn.classList.toggle('passive', !active);
      btn.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    document.querySelectorAll('[data-report-pane]').forEach((pane) => {
      pane.hidden = pane.getAttribute('data-report-pane') !== nextTab;
    });
    const navWrap = document.getElementById('navWrap');
    if (navWrap) navWrap.hidden = (nextTab !== 'diff' && nextTab !== 'settingsLike');
    if (nextTab !== 'settingsLike') closeFieldDetailModal();
    safeStorageSet(ACTIVE_TAB_KEY, nextTab);
    if (nextTab === 'settingsLike') renderSettingsLikeView();
    else if (nextTab === 'diff') render();
    else {
      const hideSame = !!(document.getElementById('hideSame')).checked;
      const kw = String((document.getElementById('search')).value || '').trim().toLowerCase();
      const allFiltered = REPORT_ROWS.filter((row) => {
        if (hideSame && row.type === 'same') return false;
        return rowMatches(row, kw);
      });
      updateStats(allFiltered);
    }
  }

  function onReportFilterChange() {
    render();
    if (getActiveReportTab() === 'settingsLike') renderSettingsLikeView();
  }

  function render() {
    const hideSame = !!(document.getElementById('hideSame')).checked;
    const useCharDiff = !!(document.getElementById('charDiff')).checked;
    const keyword = String((document.getElementById('search')).value || '').trim().toLowerCase();
    const filtered = REPORT_ROWS.filter((row) => {
      if (hideSame && row.type === 'same') return false;
      return rowMatches(row, keyword);
    });
    updateStats(filtered);
    if (getActiveReportTab() !== 'diff') return;

    const nav = document.getElementById('nav');
    const main = document.getElementById('main');
    nav.innerHTML = '';
    main.innerHTML = '';

    if (!filtered.length) {
      main.innerHTML = '<div class="no-diff">表示対象の差分がありません。</div>';
      return;
    }

    const groups = groupBySection(filtered);
    groups.forEach((g, idx) => {
      const secId = 'sec_' + idx;
      const collapsedNow = collapsed.has(g.key);
      const groupSummary = summarizeGroupRows(g.rows);
      const navItem = document.createElement('div');
      navItem.className = 'nav-item';
      navItem.innerHTML = '<span>' + escHtml(g.label) + '</span><span class="badge">' + groupSummary.diffCount + '</span>';
      navItem.onclick = () => {
        collapsed.delete(g.key);
        render();
        setTimeout(() => {
          const el = document.getElementById(secId);
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 20);
      };
      nav.appendChild(navItem);

      const sec = document.createElement('section');
      sec.id = secId;
      sec.className = 'sec';
      const head = document.createElement('div');
      head.className = 'sec-head';
      head.innerHTML = '<span>' + (collapsedNow ? '▶' : '▼') + ' ' + escHtml(g.label) + '</span><span class="sec-meta">' + escHtml(groupSummaryLabel(g.rows)) + '</span>';
      head.onclick = () => {
        if (collapsed.has(g.key)) collapsed.delete(g.key);
        else collapsed.add(g.key);
        render();
      };
      sec.appendChild(head);

      if (!collapsedNow) {
        const displayRows = g.key === FIELD_SECTION_KEY ? collapseFieldRowsForDiffTable(g.rows) : g.rows;
        const list = document.createElement('div');
        list.className = 'diff-card-list';
        displayRows.forEach((row) => {
          const typeLabel = diffTypeLabel(row.type, row.moved);
          const cells = renderRowCells(row, useCharDiff);
          const typeClass = row.type === 'same' ? 'same' : (row.type === 'added' ? 'added' : (row.type === 'removed' ? 'removed' : 'changed'));
          const card = document.createElement('article');
          const sevToken = String(row.severity || 'low').toLowerCase();
          const sevCls = sevToken === 'high' ? ' sev-high' : sevToken === 'medium' ? ' sev-medium' : ' sev-low';
          const reviewedCls = '';
          card.className = 'diff-card diff-card--' + typeClass + sevCls + reviewedCls;
          card.innerHTML =
            '<div class="diff-card-head">' +
              '<span class="type-chip type-chip--' + typeClass + '">' + escHtml(typeLabel) + '</span>' +
              '<div class="diff-card-path path" title="' + escHtml(row.path || '-') + '">' + renderPathCell(row) + '</div>' +
            '</div>' +
            '<div class="diff-pane-grid">' +
              '<section class="diff-pane"><div class="diff-pane-title">比較元</div><div class="cell">' + cells.left + '</div></section>' +
              '<section class="diff-pane"><div class="diff-pane-title">比較先</div><div class="cell">' + cells.right + '</div></section>' +
            '</div>';
          list.appendChild(card);
        });
        sec.appendChild(list);
      }
      main.appendChild(sec);
    });
  }

  function syncThemeButtonLabel() {
    const btn = document.getElementById('themeBtn');
    if (!btn) return;
    btn.textContent = document.body.classList.contains('dark') ? 'ライトに切替' : 'ダークに切替';
  }

  function toggleTheme() {
    document.body.classList.toggle('dark');
    safeStorageSet(THEME_KEY, document.body.classList.contains('dark') ? 'dark' : 'light');
    syncThemeButtonLabel();
    if (getActiveReportTab() === 'settingsLike') renderSettingsLikeView();
  }

  function collapseAll() {
    if (getActiveReportTab() !== 'diff') return;
    for (const row of REPORT_ROWS) collapsed.add(row.sectionKey || row.section || '未分類');
    render();
  }

  function expandAll() {
    if (getActiveReportTab() !== 'diff') return;
    collapsed.clear();
    render();
  }

  function exportPatch() {
    const patchRows = REPORT_ROWS.filter((row) => row.type !== 'same');
    if (!patchRows.length) {
      window.alert('出力できる差分がありません');
      return;
    }
    const grouped = {};
    patchRows.forEach((row) => {
      const key = row.sectionKey || row.section || '未分類';
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push({
        type: row.type,
        path: row.path,
        sourceValue: row.left,
        targetValue: row.right,
        moved: !!row.moved,
        movedFrom: row.movedFrom,
        movedTo: row.movedTo,
        arrayKey: row.arrayKey,
        arrayKeyValue: row.arrayKeyValue,
        reasonSummary: row.reasonSummary || '',
        renameCandidate: row.renameCandidate || null,
        impactCount: row.impactCount || 0,
        impactRefs: row.impactRefs || []
      });
    });
    const payload = {
      generatedAt: new Date().toISOString(),
      source: REPORT_META.source,
      target: REPORT_META.target,
      sections: grouped
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = '反映パッチ_app' + REPORT_META.source.appId + '_vs_app' + REPORT_META.target.appId + '.json';
    a.click();
    URL.revokeObjectURL(a.href);
  }

  window.__diffReport = { render, toggleTheme, collapseAll, expandAll, exportPatch, setActiveTab };

  document.getElementById('hideSame').onchange = onReportFilterChange;
  document.getElementById('charDiff').onchange = onReportFilterChange;
  document.getElementById('search').oninput = onReportFilterChange;
  document.getElementById('themeBtn').onclick = toggleTheme;
  document.getElementById('collapseBtn').onclick = collapseAll;
  document.getElementById('expandBtn').onclick = expandAll;
  document.getElementById('patchBtn').onclick = exportPatch;
  document.querySelectorAll('[data-report-tab]').forEach((btn) => {
    btn.onclick = () => setActiveTab(btn.getAttribute('data-report-tab'));
  });

  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
      e.preventDefault();
      document.getElementById('search').focus();
    }
    if (e.key === 'Escape') {
      if (detailModalOpen) {
        e.preventDefault();
        closeFieldDetailModal();
        return;
      }
      (document.getElementById('search')).value = '';
      onReportFilterChange();
    }
  });

  const detailModal = document.getElementById('fieldDetailModal');
  if (detailModal) {
    detailModal.addEventListener('click', (e) => {
      if (e.target === detailModal || e.target?.closest('[data-modal-close]')) {
        closeFieldDetailModal();
      }
    });
  }

  if (safeStorageGet(THEME_KEY) === 'dark') document.body.classList.add('dark');
  syncThemeButtonLabel();
  setActiveTab(safeStorageGet(ACTIVE_TAB_KEY) || 'summary');
  render();
  if (getActiveReportTab() === 'settingsLike') renderSettingsLikeView();
})();
`;
    return `<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>kintone差分レポート</title>
  <style>
    :root{
      --bg:#f1f5f9;--fg:#0f172a;--card:#ffffff;--card-soft:#f8fafc;--border:#e2e8f0;--sidebar:#eef2f7;--sidebar-fg:#334155;
      --accent:#2563eb;--accent-strong:#1d4ed8;--accent-soft:#dbeafe;--header:#ffffff;--header-border:#e2e8f0;
      --add:#ecfdf5;--add-fg:#047857;--del:#fef2f2;--del-fg:#b91c1c;--pad:#f1f5f9;--muted:#64748b;
      --mark-add:#86efac;--mark-del:#fca5a5;--shadow:0 4px 6px -1px rgba(15,23,42,.06),0 12px 24px -4px rgba(15,23,42,.08);
      --pill-total:#475569;--pill-add:#15803d;--pill-del:#b91c1c;--pill-chg:#b45309;--pill-move:#7c3aed;--pill-same:#0d9488;--pill-err:#c2410c;
      --focus:0 0 0 3px rgba(37,99,235,.35);
    }
    body.dark{
      color-scheme:dark;
      --bg:#0c1222;--fg:#e2e8f0;--card:#111827;--card-soft:#1e293b;--border:#334155;--sidebar:#0f172a;--sidebar-fg:#cbd5e1;
      --accent:#3b82f6;--accent-strong:#60a5fa;--accent-soft:#1e3a5f;--header:#111827;--header-border:#334155;
      --add:#064e3b;--add-fg:#6ee7b7;--del:#450a0a;--del-fg:#fca5a5;--pad:#1e293b;--muted:#94a3b8;
      --mark-add:#134e4a;--mark-del:#7f1d1d;--shadow:0 4px 24px rgba(0,0,0,.35);
      --pill-total:#94a3b8;--pill-add:#4ade80;--pill-del:#f87171;--pill-chg:#fbbf24;--pill-move:#c4b5fd;--pill-same:#2dd4bf;--pill-err:#fb923c;
      --focus:0 0 0 3px rgba(96,165,250,.4);
    }
    *{box-sizing:border-box}
    html,body{height:100%}
    html{scroll-behavior:smooth}
    body{
      margin:0;font-family:"Noto Sans JP","Hiragino Kaku Gothic ProN",Meiryo,sans-serif;background:var(--bg);color:var(--fg);
      display:flex;min-height:100vh;-webkit-font-smoothing:antialiased;
      background-image:radial-gradient(ellipse 120% 80% at 100% -20%,rgba(37,99,235,.07),transparent 50%),
        radial-gradient(ellipse 100% 60% at 0% 100%,rgba(14,165,233,.06),transparent 45%);
    }
    body.dark{
      background-image:radial-gradient(ellipse 120% 80% at 100% -20%,rgba(59,130,246,.12),transparent 50%),
        radial-gradient(ellipse 100% 60% at 0% 100%,rgba(6,182,212,.08),transparent 45%);
    }
    aside{
      width:300px;min-width:280px;background:var(--sidebar);color:var(--sidebar-fg);display:flex;flex-direction:column;
      border-right:1px solid var(--border);position:sticky;top:0;align-self:flex-start;height:100vh;max-height:100vh;z-index:2;
      backdrop-filter:saturate(1.1) blur(8px);
    }
    main{flex:1;overflow:auto;padding:28px 32px 40px;min-width:0}
    .sb-head{padding:20px 18px 16px;border-bottom:1px solid var(--border);background:linear-gradient(165deg,var(--card) 0%,var(--card-soft) 100%)}
    .sb-kicker{display:inline-flex;align-items:center;gap:6px;padding:5px 11px;border-radius:999px;background:var(--accent-soft);color:var(--accent-strong);font-size:10px;font-weight:800;letter-spacing:.06em;text-transform:uppercase}
    .sb-title{margin-top:12px;font-size:21px;font-weight:800;color:var(--fg);letter-spacing:-.02em}
    .sb-meta{font-size:11px;color:var(--muted);margin-top:10px;line-height:1.75}
    .sb-panel{margin:12px 14px;border:1px solid var(--border);border-radius:16px;background:var(--card);box-shadow:var(--shadow)}
    .sb-stats{padding:14px 16px;font-size:12px;line-height:1.9}
    .sb-stat-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px 14px}
    .sb-stat{display:flex;justify-content:space-between;gap:8px;padding:8px 0;border-bottom:1px dashed var(--border)}
    .sb-stat:nth-last-child(-n+2){border-bottom:none}
    .sb-stat b{font-weight:800;color:var(--fg);font-variant-numeric:tabular-nums}
    .sb-ctrl{padding:16px}
    .sb-ctrl .field-label{display:block;font-size:10px;font-weight:800;letter-spacing:.04em;color:var(--muted);text-transform:uppercase;margin-bottom:6px}
    .sb-ctrl label.chk{display:flex;align-items:center;gap:10px;font-size:12px;margin-bottom:10px;color:var(--fg);cursor:pointer}
    .sb-ctrl input[type="checkbox"]{width:16px;height:16px;accent-color:var(--accent);cursor:pointer}
    .sb-ctrl input[type="text"]{width:100%;padding:10px 12px;border:1px solid var(--border);border-radius:10px;background:var(--card-soft);color:var(--fg);font-size:12px;transition:border-color .15s,box-shadow .15s}
    .sb-ctrl input[type="text"]:focus{outline:none;border-color:var(--accent);box-shadow:var(--focus)}
    .search-hint{margin:8px 0 0;font-size:10px;color:var(--muted);line-height:1.5}
    .kbd{display:inline-block;padding:2px 6px;border-radius:6px;border:1px solid var(--border);background:var(--card-soft);font-size:10px;font-weight:700;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;color:var(--fg)}
    .sb-btns{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:14px}
    .btn{border:1px solid var(--border);background:var(--card-soft);color:var(--fg);border-radius:10px;padding:9px 11px;font-size:11px;font-weight:700;cursor:pointer;transition:background .15s,border-color .15s,transform .1s,box-shadow .15s}
    .btn:hover{background:var(--card);border-color:var(--muted)}
    .btn:active{transform:scale(.98)}
    .btn:focus-visible{outline:none;box-shadow:var(--focus)}
    .btn.primary{background:linear-gradient(180deg,#3b82f6,var(--accent));color:#fff;border-color:#1d4ed8;box-shadow:0 2px 8px rgba(37,99,235,.35)}
    .btn.primary:hover{filter:brightness(1.06)}
    body.dark .btn.primary{background:linear-gradient(180deg,#60a5fa,var(--accent));border-color:#2563eb}
    #navWrap{flex:1;min-height:0;display:flex;flex-direction:column;border-top:1px solid var(--border);margin-top:4px;padding-top:8px}
    .nav-label{padding:4px 18px 8px;font-size:10px;font-weight:800;letter-spacing:.05em;color:var(--muted);text-transform:uppercase}
    #nav{flex:1;overflow:auto;padding:0 10px 20px;scrollbar-width:thin;scrollbar-color:var(--border) transparent}
    #nav::-webkit-scrollbar{width:6px}
    #nav::-webkit-scrollbar-thumb{background:var(--border);border-radius:999px}
    .nav-item{display:flex;justify-content:space-between;align-items:center;padding:11px 14px;font-size:12px;cursor:pointer;border-radius:12px;margin:3px 4px;color:var(--fg);border:1px solid transparent;transition:background .15s,border-color .15s,transform .1s}
    .nav-item:hover{background:var(--card);border-color:var(--border);box-shadow:var(--shadow)}
    .nav-item:active{transform:scale(.99)}
    .badge{display:inline-block;min-width:26px;text-align:center;padding:3px 9px;border-radius:999px;background:var(--accent-soft);color:var(--accent-strong);font-size:10px;font-weight:800;font-variant-numeric:tabular-nums}
    .topbar{
      display:flex;align-items:flex-start;justify-content:space-between;gap:20px;padding:22px 24px;border:1px solid var(--header-border);
      border-radius:20px;background:linear-gradient(135deg,var(--header) 0%,var(--card-soft) 100%);box-shadow:var(--shadow);position:relative;overflow:hidden
    }
    .topbar::before{content:"";position:absolute;left:0;top:0;right:0;height:3px;background:linear-gradient(90deg,var(--accent),#06b6d4,var(--accent-strong))}
    .topbar-main{display:flex;flex-direction:column;gap:12px;min-width:0}
    .topbar-title{font-size:clamp(1.15rem,2.5vw,1.5rem);font-weight:800;line-height:1.35;letter-spacing:-.02em;color:var(--fg)}
    .topbar-desc{font-size:13px;color:var(--muted);line-height:1.75;max-width:62ch}
    .header-actions{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end}
    .header-badge{display:inline-flex;align-items:center;gap:6px;border:1px solid var(--border);background:var(--card-soft);border-radius:999px;padding:7px 12px;font-size:11px;font-weight:600;color:var(--muted)}
    .settings-shell{margin-top:20px;border:1px solid var(--border);border-radius:20px;overflow:hidden;background:var(--card);box-shadow:var(--shadow)}
    .settings-tabs{display:flex;gap:6px;align-items:center;flex-wrap:wrap;padding:14px 18px;border-bottom:1px solid var(--border);background:linear-gradient(180deg,var(--card-soft) 0%,var(--card) 100%)}
    .settings-tab{
      padding:10px 18px;border-radius:999px;background:var(--accent-soft);color:var(--accent-strong);font-size:12px;font-weight:800;
      border:1px solid transparent;cursor:pointer;transition:background .15s,border-color .15s,color .15s,transform .1s
    }
    .settings-tab.passive{background:transparent;color:var(--muted);border-color:var(--border);font-weight:700}
    .settings-tab.passive:hover{border-color:var(--accent-soft);color:var(--fg)}
    .settings-tab:focus-visible{outline:none;box-shadow:var(--focus)}
    .settings-tab:active:not(.passive){transform:scale(.98)}
    .tab-pane[hidden]{display:none!important}
    .app-compare{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;padding:18px;border-bottom:1px solid var(--border);background:var(--card-soft)}
    .app-card{border:1px solid var(--border);border-radius:16px;background:var(--card);padding:16px;position:relative;overflow:hidden;transition:box-shadow .2s}
    .app-card:hover{box-shadow:0 8px 24px -6px rgba(15,23,42,.1)}
    body.dark .app-card:hover{box-shadow:0 8px 28px -6px rgba(0,0,0,.4)}
    .app-card::before{content:"";position:absolute;inset:0 auto 0 0;width:4px;background:linear-gradient(180deg,var(--accent),#06b6d4);border-radius:4px 0 0 4px}
    .app-card.target::before{background:linear-gradient(180deg,#64748b,#475569)}
    .app-role{display:inline-flex;align-items:center;gap:6px;padding:5px 11px;border-radius:999px;background:var(--accent-soft);color:var(--accent-strong);font-size:11px;font-weight:800}
    .app-card.target .app-role{background:#e2e8f0;color:#475569}
    body.dark .app-card.target .app-role{background:#1e293b;color:#cbd5e1}
    .app-title{margin-top:12px;font-size:20px;font-weight:800;letter-spacing:-.02em}
    .app-meta-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:14px}
    .meta-card{padding:11px 13px;border-radius:12px;background:var(--card-soft);border:1px solid var(--border);transition:border-color .15s}
    .meta-card:hover{border-color:var(--accent-soft)}
    .meta-card .label{display:block;font-size:10px;font-weight:700;color:var(--muted);margin-bottom:5px;letter-spacing:.02em}
    .meta-card .value{display:block;font-size:12px;font-weight:800;color:var(--fg);word-break:break-word}
    .summary-strip{display:grid;grid-template-columns:repeat(auto-fit,minmax(148px,1fr));gap:12px;padding:18px;border-bottom:1px solid var(--border);background:var(--card)}
    .metric-card{position:relative;overflow:hidden;border:1px solid var(--border);border-radius:14px;background:linear-gradient(180deg,var(--card-soft),var(--card));padding:14px 16px;min-height:104px;box-shadow:0 8px 22px -16px rgba(15,23,42,.5)}
    .metric-card::before{content:"";position:absolute;left:0;top:0;bottom:0;width:4px;background:var(--muted)}
    .metric-card--total::before{background:var(--pill-total)}
    .metric-card--diff::before,.metric-card--changed::before{background:var(--pill-chg)}
    .metric-card--added::before{background:var(--pill-add)}
    .metric-card--removed::before{background:var(--pill-del)}
    .metric-card--severity::before{background:#dc2626}
    .metric-label{font-size:10px;font-weight:800;color:var(--muted);letter-spacing:.04em;text-transform:uppercase}
    .metric-value{margin-top:8px;font-size:28px;line-height:1;font-weight:800;color:var(--fg);font-variant-numeric:tabular-nums}
    .metric-sub{margin-top:10px;font-size:11px;line-height:1.45;color:var(--muted)}
    .pill{display:inline-flex;align-items:center;gap:8px;border:1px solid var(--border);border-radius:999px;padding:8px 14px;font-size:11px;background:var(--card-soft);font-weight:700;transition:border-color .15s,transform .1s}
    .pill:hover{border-color:var(--muted)}
    .pill .count{font-size:13px;font-weight:800;font-variant-numeric:tabular-nums}
    .pill--total .count{color:var(--pill-total)}
    .pill--added .count{color:var(--pill-add)}
    .pill--removed .count{color:var(--pill-del)}
    .pill--changed .count{color:var(--pill-chg)}
    .pill--moved .count{color:var(--pill-move)}
    .pill--same .count{color:var(--pill-same)}
    .pill--err .count{color:var(--pill-err)}
    .info-grid{display:grid;grid-template-columns:1.35fr .95fr;gap:18px;padding:18px;border-bottom:1px solid var(--border);background:var(--card)}
    .panel{border:1px solid var(--border);border-radius:16px;background:var(--card-soft);padding:16px 18px;position:relative}
    .panel::before{content:"";position:absolute;left:18px;top:0;width:36px;height:3px;background:linear-gradient(90deg,var(--accent),transparent);border-radius:0 0 3px 3px}
    .panel h3{margin:0 0 14px;font-size:12px;font-weight:800;letter-spacing:.04em;color:var(--fg);text-transform:uppercase}
    .detail-list{display:grid;gap:10px}
    .detail-row{display:flex;justify-content:space-between;gap:14px;padding-bottom:10px;border-bottom:1px dashed var(--border);font-size:12px;line-height:1.5}
    .detail-row:last-child{padding-bottom:0;border-bottom:none}
    .detail-key{color:var(--muted);font-weight:600;flex-shrink:0}
    .warn{font-size:11px;color:#b45309;margin-top:10px;padding:10px 12px;border-radius:10px;background:#fffbeb;border:1px solid #fde68a;line-height:1.6}
    body.dark .warn{color:#fbbf24;background:#422006;border-color:#92400e}
    .muted-note{font-size:12px;color:var(--muted);line-height:1.7}
    .sum-table-wrap{overflow:auto}
    .sum-table{width:100%;border-collapse:collapse;font-size:11px}
    .sum-table th,.sum-table td{padding:10px 12px;border-bottom:1px solid var(--border);text-align:left;vertical-align:top}
    .sum-table th{font-size:10px;text-transform:uppercase;letter-spacing:.04em;color:var(--muted);white-space:nowrap}
    .sum-table-name{font-weight:800;color:var(--fg);margin-bottom:4px}
    .sum-table-sub{font-size:10px;line-height:1.5;color:var(--muted)}
    .highlight-list{display:grid;gap:10px}
    .highlight-card{border:1px solid var(--border);border-radius:14px;padding:12px 14px;background:var(--card);box-shadow:var(--shadow)}
    .highlight-top{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px}
    .highlight-title{font-size:12px;font-weight:800;color:var(--fg);line-height:1.45}
    .highlight-sub{font-size:10px;line-height:1.6;color:var(--muted);margin-top:4px}
    .highlight-preview{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}
    .highlight-pane{border:1px solid var(--border);border-radius:10px;padding:8px 10px;background:var(--card-soft);font-size:10px;line-height:1.5;color:var(--fg);word-break:break-word}
    .highlight-pane-label{display:block;font-size:9px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;color:var(--muted);margin-bottom:4px}
    @media (max-width:900px){.highlight-preview{grid-template-columns:1fr}}
    .issue-box{margin:18px;border:1px solid #fdba74;border-radius:16px;background:#fff7ed;padding:16px 18px;box-shadow:0 4px 16px -4px rgba(180,83,9,.15)}
    body.dark .issue-box{background:#1c1410;border-color:#78350f}
    .issue-box h3{margin:0 0 12px;font-size:13px;font-weight:800;color:#9a3412}
    body.dark .issue-box h3{color:#fb923c}
    .issue-box table{width:100%;border-collapse:collapse;font-size:11px}
    .issue-box th,.issue-box td{border-bottom:1px solid var(--border);padding:10px 12px;text-align:left;vertical-align:top}
    .issue-box th{font-size:10px;text-transform:uppercase;letter-spacing:.04em;color:var(--muted)}
    .issue-box .msg{white-space:pre-wrap;word-break:break-word;font-family:ui-monospace,SFMono-Regular,Menlo,monospace}
    .content{padding:18px}
    .sec{border:1px solid var(--border);border-radius:16px;overflow:hidden;background:var(--card);margin-bottom:16px;box-shadow:var(--shadow)}
    .sec-head{display:flex;justify-content:space-between;align-items:center;padding:14px 16px;background:linear-gradient(180deg,var(--card-soft) 0%,var(--card) 100%);font-size:13px;font-weight:800;cursor:pointer;user-select:none;transition:filter .15s}
    .sec-head:hover{filter:brightness(.985)}
    body.dark .sec-head:hover{filter:brightness(1.08)}
    .sec-meta{font-size:10px;font-weight:700;color:var(--muted)}
    .diff-card-list{display:flex;flex-direction:column;gap:12px;padding:14px;background:var(--card-soft)}
    .diff-card{border:1px solid var(--border);border-left:5px solid var(--border);border-radius:14px;background:var(--card);box-shadow:0 8px 20px -16px rgba(15,23,42,.45);overflow:hidden}
    .diff-card--added{border-left-color:#16a34a}
    .diff-card--removed{border-left-color:#dc2626}
    .diff-card--changed{border-left-color:#ca8a04}
    .diff-card--same{border-left-color:#0d9488}
    .diff-card-head{display:grid;grid-template-columns:auto minmax(0,1fr);gap:12px;align-items:flex-start;padding:12px 14px;border-bottom:1px solid var(--border);background:linear-gradient(180deg,var(--card),var(--card-soft))}
    .type-chip{display:inline-flex;align-items:center;justify-content:center;min-width:62px;padding:5px 10px;border-radius:999px;font-size:11px;font-weight:800;border:1px solid transparent;white-space:nowrap}
    .type-chip--added{background:#dcfce7;color:#166534;border-color:#86efac}
    .type-chip--removed{background:#fee2e2;color:#991b1b;border-color:#fca5a5}
    .type-chip--changed{background:#fef3c7;color:#92400e;border-color:#fcd34d}
    .type-chip--same{background:#ccfbf1;color:#0f766e;border-color:#5eead4}
    body.dark .type-chip--added{background:#14532d;color:#bbf7d0;border-color:#166534}
    body.dark .type-chip--removed{background:#450a0a;color:#fecaca;border-color:#991b1b}
    body.dark .type-chip--changed{background:#78350f;color:#fde68a;border-color:#b45309}
    body.dark .type-chip--same{background:#134e4a;color:#99f6e4;border-color:#0f766e}
    .diff-card-path{min-width:0}
    .diff-pane-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;padding:12px 14px 14px}
    .diff-pane{min-width:0;border:1px solid var(--border);border-radius:12px;background:var(--card);overflow:hidden}
    .diff-pane-title{padding:8px 11px;border-bottom:1px solid var(--border);background:var(--pad);font-size:10px;font-weight:800;color:var(--muted);letter-spacing:.05em;text-transform:uppercase}
    .diff-pane .cell{display:block}
    .diff-table{width:100%;border-collapse:collapse;table-layout:fixed;font-size:11px}
    .diff-table th,.diff-table td{border-bottom:1px solid var(--border);padding:10px 12px;vertical-align:top;text-align:left}
    .diff-table th{position:sticky;top:0;background:var(--card);z-index:1;font-size:10px;font-weight:800;letter-spacing:.05em;color:var(--muted);text-transform:uppercase}
    .type{font-weight:800}
    .type.added{color:#15803d}
    .type.removed{color:#b91c1c}
    .type.changed{color:#b45309}
    .type.same{color:#0d9488}
    .path{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;word-break:break-all;color:var(--muted);font-size:11px}
    .path-main{font-size:11px;font-weight:700;color:var(--fg);margin-bottom:4px;word-break:break-all}
    .path-sub{font-size:10px;line-height:1.45;color:var(--muted);word-break:break-all}
    .meta-wrap{margin-top:8px;font-family:"Noto Sans JP","Hiragino Kaku Gothic ProN",Meiryo,sans-serif}
    .meta-tags{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:6px}
    .meta-tag{display:inline-flex;align-items:center;padding:3px 8px;border-radius:999px;border:1px solid var(--border);background:var(--pad);font-size:10px;font-weight:600;color:var(--fg)}
    .meta-tag.reason{background:#fff7ed;color:#9a3412;border-color:#fdba74}
    .meta-tag.rename{background:#ecfdf5;color:#15803d;border-color:#86efac}
    .meta-tag.impact{background:#eff6ff;color:#1d4ed8;border-color:#93c5fd}
    .meta-line{font-size:10px;line-height:1.5;color:var(--muted)}
    .meta-line strong{color:var(--fg)}
    .cell{padding:0;overflow:hidden}
    .scroll{max-height:300px;overflow:auto;scrollbar-width:thin;scrollbar-color:var(--border) transparent}
    .scroll::-webkit-scrollbar{width:6px;height:6px}
    .scroll::-webkit-scrollbar-thumb{background:var(--border);border-radius:999px}
    .line{display:flex;min-height:1.6em;line-height:1.6;padding:0 8px;white-space:pre-wrap;word-break:break-word}
    .line.add{background:var(--add);color:var(--add-fg)}
    .line.del{background:var(--del);color:var(--del-fg)}
    .line.pad{background:var(--pad);opacity:.75}
    .ln{min-width:36px;display:inline-block;text-align:right;margin-right:8px;padding-right:6px;border-right:1px solid var(--border);font-size:10px;color:var(--muted);user-select:none;flex-shrink:0}
    .blk{margin:0;padding:12px;white-space:pre-wrap;word-break:break-word;font-size:11px;line-height:1.55}
    .blk.add{background:var(--add);color:var(--add-fg)}
    .blk.del{background:var(--del);color:var(--del-fg)}
    .blk.same{color:var(--muted);font-style:italic}
    .blk.same-note{color:#0d9488;font-style:italic;font-weight:600}
    .blk.empty{font-style:italic;color:var(--muted)}
    mark.cadd{background:var(--mark-add);color:var(--add-fg);border-radius:3px;padding:0 2px}
    mark.cdel{background:var(--mark-del);color:var(--del-fg);border-radius:3px;padding:0 2px}
    .compare-box{margin:0 18px 18px;border:1px solid var(--border);border-radius:18px;background:var(--card);overflow:hidden;box-shadow:var(--shadow)}
    .compare-box-head{padding:14px 18px;background:linear-gradient(180deg,var(--accent-soft) 0%,var(--card) 100%);color:var(--accent-strong);font-size:13px;font-weight:800;border-bottom:1px solid var(--border)}
    .compare-sec{border-bottom:1px solid var(--border)}
    .compare-sec:last-child{border-bottom:none}
    .compare-head{display:flex;justify-content:space-between;gap:12px;align-items:center;padding:12px 14px;background:var(--pad);font-size:12px;font-weight:800}
    .compare-head-meta{font-size:10px;color:var(--muted);font-weight:600}
    .compare-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;padding:14px}
    .compare-card{border:1px solid var(--border);border-radius:12px;overflow:hidden;background:var(--card)}
    .compare-title{padding:9px 12px;background:var(--pad);font-size:11px;font-weight:800}
    .compare-pre{margin:0;padding:12px;max-height:340px;overflow:auto;white-space:pre-wrap;word-break:break-word;font-size:11px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;line-height:1.5}
    .no-diff{text-align:center;font-size:14px;font-weight:600;padding:36px 24px;color:#0d9488;background:linear-gradient(180deg,var(--card-soft),var(--card));border:1px dashed var(--border);border-radius:16px}
    body.dark .no-diff{color:#5eead4}
    body.has-modal-open{overflow:hidden}
    .sl-root{padding:16px 18px 28px;background:var(--card-soft);min-height:320px}
    .sl-board{display:flex;flex-direction:column;gap:18px;max-width:1280px;margin:0 auto}
    .sl-legend{display:flex;flex-wrap:wrap;gap:12px 18px;margin-bottom:4px;padding:12px 14px;border-radius:12px;background:var(--card);border:1px solid var(--border);font-size:11px;font-weight:600;color:var(--fg);box-shadow:var(--shadow)}
    .sl-legend span{display:inline-flex;align-items:center;gap:8px}
    .sl-dot{display:inline-block;width:10px;height:10px;border-radius:50%;flex-shrink:0}
    .sl-dot--src{background:#2563eb;box-shadow:0 0 0 2px rgba(37,99,235,.25)}
    .sl-dot--tgt{background:#16a34a;box-shadow:0 0 0 2px rgba(22,163,74,.25)}
    .sl-dot--chg{background:#ca8a04;box-shadow:0 0 0 2px rgba(202,138,4,.3)}
    .sl-dot--same{background:#64748b;box-shadow:0 0 0 2px rgba(100,116,139,.25)}
    .sl-group{border:1px solid var(--border);border-radius:14px;overflow:hidden;background:var(--card);box-shadow:var(--shadow)}
    .sl-group-head{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:12px 16px;background:linear-gradient(180deg,#f8fafc 0%,#eef2f7 100%);border-bottom:1px solid var(--border)}
    body.dark .sl-group-head{background:linear-gradient(180deg,#1e293b 0%,#162032 100%)}
    .sl-group-title{font-size:13px;font-weight:800;color:var(--fg);letter-spacing:.02em}
    .sl-group-count{font-size:11px;font-weight:700;color:var(--muted)}
    .sl-items{display:flex;flex-direction:column;gap:12px;padding:14px 16px 18px}
    .sl-item{border-radius:12px;padding:12px 14px 14px;border:1px solid var(--border);border-left:5px solid var(--border);font-size:12px;line-height:1.55}
    .sl-item--src{background:rgba(37,99,235,.09);border-left-color:#2563eb}
    .sl-item--tgt{background:rgba(22,163,74,.1);border-left-color:#16a34a}
    .sl-item--chg{background:rgba(234,179,8,.16);border-left-color:#ca8a04}
    .sl-item--same{background:var(--card-soft);border-left-color:#94a3b8;opacity:.95}
    body.dark .sl-item--src{background:rgba(59,130,246,.14)}
    body.dark .sl-item--tgt{background:rgba(34,197,94,.14)}
    body.dark .sl-item--chg{background:rgba(234,179,8,.12)}
    .sl-item-top{display:flex;flex-wrap:wrap;gap:8px 12px;align-items:flex-start;margin-bottom:6px}
    .sl-badge{font-size:10px;font-weight:800;padding:4px 10px;border-radius:999px;flex-shrink:0}
    .sl-item--src .sl-badge{background:#dbeafe;color:#1e40af}
    .sl-item--tgt .sl-badge{background:#dcfce7;color:#166534}
    .sl-item--chg .sl-badge{background:#fef08a;color:#854d0e}
    .sl-item--same .sl-badge{background:#e2e8f0;color:#475569}
    body.dark .sl-item--src .sl-badge{background:#1e3a5f;color:#93c5fd}
    body.dark .sl-item--tgt .sl-badge{background:#14532d;color:#86efac}
    body.dark .sl-item--chg .sl-badge{background:#713f12;color:#fde047}
    body.dark .sl-item--same .sl-badge{background:#334155;color:#cbd5e1}
    .sl-path{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11px;word-break:break-all;color:var(--muted);flex:1;min-width:0}
    .sl-pair{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:10px}
    .sl-pair-col{min-width:0}
    @media (max-width:900px){.sl-pair{grid-template-columns:1fr}}
    .sl-pane-h{font-size:9px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);margin-bottom:6px}
    .sl-pane{margin:0;padding:10px 11px;border-radius:8px;font-size:10px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;white-space:pre-wrap;word-break:break-word;max-height:200px;overflow:auto;line-height:1.45}
    .sl-pane--kv{font-family:"Noto Sans JP","Hiragino Kaku Gothic ProN",Meiryo,sans-serif;font-size:11px;line-height:1.5}
    .sl-prop-name{font-size:12px;font-weight:800;color:var(--fg);flex:1;min-width:0}
    .sl-path--sub{font-size:10px;margin:0 0 8px;opacity:.9}
    .sl-empty{font-style:italic;color:var(--muted)}
    .sl-val-mono{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:10px;word-break:break-word}
    .sl-mini-table{width:100%;border-collapse:collapse;font-size:10px;margin:0}
    .sl-mini-table th,.sl-mini-table td{border:1px solid var(--border);padding:6px 8px;text-align:left;vertical-align:top}
    .sl-mini-table th{width:38%;font-weight:700;color:var(--muted);background:var(--card-soft)}
    .st-wrap{width:100%;overflow-x:auto;border:1px solid var(--border);border-radius:10px;background:var(--card)}
    .st-fields{width:100%;border-collapse:collapse;font-size:11px;margin:0;table-layout:fixed}
    .st-fields thead{background:var(--card-soft)}
    .st-fields th{font-size:10px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;color:var(--muted);padding:8px 10px;text-align:left;border-bottom:1px solid var(--border);white-space:nowrap}
    .st-fields td{padding:8px 10px;border-bottom:1px solid var(--border);vertical-align:middle;word-break:break-word}
    .st-fields tbody tr:last-child td{border-bottom:none}
    .st-fields tbody tr:hover{background:var(--card-soft)}
    .st-fields .st-col-no{width:38px;font-variant-numeric:tabular-nums;color:var(--muted);text-align:right}
    .st-fields .st-col-label{font-weight:600;color:var(--fg)}
    .st-fields .st-col-type{width:120px}
    .st-fields .st-col-code{width:180px}
    .st-fields .st-col-code code{font-size:10px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;background:var(--card-soft);border:1px solid var(--border);padding:2px 6px;border-radius:6px;color:var(--fg);word-break:break-all}
    .st-fields .st-col-req{width:60px;text-align:center}
    .st-type-chip{display:inline-block;padding:2px 8px;border-radius:999px;background:#e0e7ff;color:#3730a3;font-size:10px;font-weight:700;border:1px solid #c7d2fe}
    body.dark .st-type-chip{background:#1e293b;color:#a5b4fc;border-color:#334155}
    .st-req{display:inline-block;background:#dc2626;color:#fff;font-size:10px;font-weight:700;padding:1px 7px;border-radius:999px}
    .st-card{border:1px solid var(--border);border-radius:12px;background:var(--card);overflow:hidden;box-shadow:var(--shadow)}
    .st-card-head{display:flex;align-items:center;gap:10px;padding:10px 14px;background:var(--card-soft);border-bottom:1px solid var(--border);flex-wrap:wrap}
    .st-card-kind{display:inline-block;padding:3px 9px;border-radius:999px;background:#e0e7ff;color:#3730a3;font-size:10px;font-weight:800;border:1px solid #c7d2fe;flex-shrink:0}
    body.dark .st-card-kind{background:#1e293b;color:#a5b4fc;border-color:#334155}
    .st-card-title{font-size:13px;font-weight:700;color:var(--fg);flex:1;min-width:0;word-break:break-word}
    .st-card-code{font-size:10px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;background:var(--card);border:1px solid var(--border);padding:2px 6px;border-radius:6px;color:var(--muted);flex-shrink:0}
    .st-card .st-wrap{border:none;border-radius:0;background:transparent}
    .kf-value--rich{padding:10px;min-height:0;display:block}
    body.dark .kf-value--rich{background:#0b1320}
    @media (max-width:720px){
      .st-fields .st-col-type{width:auto}
      .st-fields .st-col-code{width:auto}
    }
    .sl-item--prop{padding-bottom:12px}
    .sl-board--kuc .sl-legend{margin-bottom:8px}
    #settingsLikeRoot:has(.sl-board--kuc){background:#f7f9fa}
    body.dark #settingsLikeRoot:has(.sl-board--kuc){background:transparent}
    .sl-kuc-field-group{display:block;width:100%;max-width:100%;box-sizing:border-box}
    .sl-kuc-fg-inner{display:flex;flex-direction:column;gap:14px;padding:4px 0 8px;min-width:0}
    .sl-kuc-row{border:1px solid var(--border);border-radius:8px;padding:12px 14px;background:var(--card-soft);border-left-width:5px;min-width:0}
    .sl-kuc-row-head{display:flex;flex-wrap:wrap;gap:8px 12px;align-items:center;margin-bottom:6px}
    .sl-kuc-meta{margin-bottom:8px}
    .sl-kuc-pair{display:grid;grid-template-columns:1fr 1fr;gap:14px;align-items:start;min-width:0}
    @media (max-width:900px){.sl-kuc-pair{grid-template-columns:1fr}}
    .sl-kuc-pair kuc-textarea-1-24-0{display:block;min-width:0;width:100%}
    .sl-pane--src{background:rgba(37,99,235,.06);border:1px solid rgba(37,99,235,.22)}
    .sl-pane--tgt{background:rgba(22,163,74,.07);border:1px solid rgba(22,163,74,.28)}
    body.dark .sl-pane--src{background:rgba(59,130,246,.08);border-color:rgba(59,130,246,.35)}
    body.dark .sl-pane--tgt{background:rgba(34,197,94,.08);border-color:rgba(34,197,94,.35)}
    @media (max-width:1080px){
      body{display:block}
      aside{position:relative;height:auto;max-height:none;width:auto;border-right:none;border-bottom:1px solid var(--border)}
      main{padding:18px 16px 28px}
      .app-compare,.info-grid,.compare-grid{grid-template-columns:1fr}
      .header-actions{justify-content:flex-start}
    }
    .nav-item.active{background:var(--card);border-color:var(--accent-soft);box-shadow:var(--shadow)}
    .fc-shell{display:flex;flex-direction:column;gap:16px}
    .fc-list{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:12px}
    .fc-card{border:1px solid var(--border);border-radius:16px;padding:14px 16px;background:var(--card);box-shadow:var(--shadow);display:flex;flex-direction:column;gap:10px}
    .fc-card.is-active{border-color:var(--accent);box-shadow:0 0 0 1px rgba(37,99,235,.18),var(--shadow)}
    .fc-card--added{border-left:5px solid #16a34a}
    .fc-card--removed{border-left:5px solid #dc2626}
    .fc-card--changed{border-left:5px solid #ca8a04}
    .fc-card--same{border-left:5px solid #94a3b8}
    .fc-card-head{display:flex;justify-content:space-between;align-items:center;gap:12px}
    .fc-code{font-size:11px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;color:var(--muted)}
    .fc-title{font-size:15px;font-weight:800;line-height:1.4;color:var(--fg)}
    .fc-sub{font-size:11px;color:var(--muted);line-height:1.6}
    .fc-chip-row{display:flex;flex-wrap:wrap;gap:8px}
    .fc-chip-row--compact{margin-top:2px}
    .fc-chip{display:inline-flex;align-items:center;padding:4px 9px;border-radius:999px;background:var(--card-soft);border:1px solid var(--border);font-size:10px;font-weight:700;color:var(--fg)}
    .fc-chip--muted{color:var(--muted)}
    .fd-overlay{position:fixed;inset:0;z-index:80;display:flex;align-items:center;justify-content:center;padding:24px;background:rgba(15,23,42,.48);backdrop-filter:blur(6px)}
    .fd-overlay[hidden]{display:none!important}
    .fd-overlay-dialog{width:min(1240px,100%);max-height:calc(100vh - 48px);display:flex;flex-direction:column;border:1px solid var(--border);border-radius:24px;background:var(--card);box-shadow:0 24px 64px rgba(15,23,42,.28);overflow:hidden}
    .fd-overlay-head{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;padding:18px 20px;border-bottom:1px solid var(--border);background:linear-gradient(180deg,var(--card-soft) 0%,var(--card) 100%)}
    .fd-overlay-title{font-size:20px;font-weight:800;line-height:1.35;color:var(--fg)}
    .fd-overlay-sub{margin-top:6px;font-size:11px;line-height:1.7;color:var(--muted);word-break:break-word}
    .fd-overlay-actions{display:flex;align-items:center;gap:10px}
    .fd-overlay-hint{font-size:10px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--muted)}
    .fd-overlay-body{padding:18px;background:var(--card-soft);overflow:auto}
    .fd-overlay-body .fd-panel{border:none;box-shadow:none;padding:0;background:transparent}
    .fd-overlay-body .fd-empty{background:var(--card)}
    .fd-panel{border:1px solid var(--border);border-radius:18px;background:var(--card);box-shadow:var(--shadow);padding:18px}
    .fd-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:12px}
    .fd-title{font-size:18px;font-weight:800;line-height:1.35;color:var(--fg)}
    .fd-sub{margin-top:4px;font-size:11px;color:var(--muted);line-height:1.7}
    .fd-sub code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace}
    .fd-status{display:inline-flex;align-items:center;justify-content:center;padding:5px 10px;border-radius:999px;font-size:10px;font-weight:800;border:1px solid transparent;white-space:nowrap}
    .fd-status--added{background:#dcfce7;color:#166534;border-color:#86efac}
    .fd-status--removed{background:#fee2e2;color:#991b1b;border-color:#fca5a5}
    .fd-status--changed{background:#fef3c7;color:#92400e;border-color:#fcd34d}
    .fd-status--same{background:#e2e8f0;color:#475569;border-color:#cbd5e1}
    body.dark .fd-status--added{background:#14532d;color:#bbf7d0;border-color:#166534}
    body.dark .fd-status--removed{background:#450a0a;color:#fecaca;border-color:#991b1b}
    body.dark .fd-status--changed{background:#78350f;color:#fde68a;border-color:#b45309}
    body.dark .fd-status--same{background:#334155;color:#cbd5e1;border-color:#475569}
    .fd-snapshots{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:14px 0 18px}
    .fd-snapshot{border:1px solid var(--border);border-radius:18px;padding:0;background:#fff;overflow:hidden}
    .fd-snapshot--src{box-shadow:0 10px 24px -18px rgba(37,99,235,.4)}
    .fd-snapshot--tgt{box-shadow:0 10px 24px -18px rgba(22,163,74,.4)}
    body.dark .fd-snapshot{background:#0f172a}
    .fd-pane-label{font-size:10px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;color:var(--muted);margin-bottom:8px}
    .fd-mini-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
    .fd-mini-cell{padding:9px 10px;border-radius:10px;background:var(--card);border:1px solid var(--border);min-width:0}
    .fd-mini-cell span{display:block;font-size:9px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;color:var(--muted);margin-bottom:4px}
    .fd-mini-value{font-size:11px;line-height:1.5;color:var(--fg);word-break:break-word}
    .fd-section h3{margin:0 0 12px;font-size:12px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;color:var(--fg)}
    .fd-entry-list{display:flex;flex-direction:column;gap:12px}
    .fd-entry{border:1px solid var(--border);border-radius:14px;padding:12px 14px;background:var(--card-soft)}
    .fd-entry--added{border-left:5px solid #16a34a}
    .fd-entry--removed{border-left:5px solid #dc2626}
    .fd-entry--changed{border-left:5px solid #ca8a04}
    .fd-entry--same{border-left:5px solid #94a3b8}
    .fd-entry-top{display:flex;flex-wrap:wrap;align-items:center;gap:8px 10px;margin-bottom:6px}
    .fd-entry-area,.fd-entry-type{display:inline-flex;align-items:center;padding:3px 8px;border-radius:999px;font-size:10px;font-weight:700;border:1px solid var(--border);background:var(--card)}
    .fd-entry-top strong{font-size:13px;color:var(--fg)}
    .fd-path{font-size:10px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;color:var(--muted);margin-bottom:8px;word-break:break-all}
    .fd-entry-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:10px}
    .fd-entry-col{min-width:0}
    .fd-entry-body{padding:10px 11px;border-radius:10px;border:1px solid var(--border);background:var(--card);font-size:11px;line-height:1.55;word-break:break-word}
    .fd-empty{padding:18px;border:1px dashed var(--border);border-radius:12px;background:var(--card-soft);font-size:12px;line-height:1.7;color:var(--muted)}
    .kf-modal{display:flex;flex-direction:column;background:#fff}
    body.dark .kf-modal{background:#0f172a}
    .kf-modal-head{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:16px 18px;border-bottom:1px solid #d7dde6;background:#fbfcfd}
    body.dark .kf-modal-head{border-bottom-color:#243245;background:#162032}
    .kf-modal-title{display:flex;align-items:center;gap:10px;min-width:0;color:#1f2a44}
    body.dark .kf-modal-title{color:#e5eefb}
    .kf-modal-title strong{font-size:15px;line-height:1.4;font-weight:700}
    .kf-type-icon{width:20px;height:24px;border:2px solid #8d99ae;border-radius:3px;display:inline-block;position:relative;background:linear-gradient(180deg,#fff,#f2f5f9);flex-shrink:0}
    .kf-type-icon::before,.kf-type-icon::after{content:"";position:absolute;left:4px;right:4px;height:2px;background:#8d99ae;border-radius:999px}
    .kf-type-icon::before{top:6px}
    .kf-type-icon::after{top:12px}
    body.dark .kf-type-icon{border-color:#8fb3e0;background:linear-gradient(180deg,#20314a,#162032)}
    body.dark .kf-type-icon::before,body.dark .kf-type-icon::after{background:#8fb3e0}
    .kf-side{display:inline-flex;align-items:center;padding:5px 10px;border-radius:999px;font-size:10px;font-weight:800;border:1px solid transparent;white-space:nowrap}
    .kf-side--src{background:#eff6ff;color:#1d4ed8;border-color:#bfdbfe}
    .kf-side--tgt{background:#ecfdf5;color:#15803d;border-color:#bbf7d0}
    body.dark .kf-side--src{background:#172554;color:#bfdbfe;border-color:#1d4ed8}
    body.dark .kf-side--tgt{background:#052e16;color:#bbf7d0;border-color:#15803d}
    .kf-modal-body{display:flex;flex-direction:column;gap:16px;padding:18px}
    .kf-row{display:flex;flex-direction:column;gap:8px}
    .kf-row--full{grid-column:1 / -1}
    .kf-label{font-size:11px;font-weight:700;color:#24324a}
    body.dark .kf-label{color:#dbe7f6}
    .kf-required{color:#dc2626;font-weight:800}
    .kf-value{border:1px solid #d5dce5;border-radius:10px;background:#fff;min-height:46px;padding:12px 14px;font-size:13px;line-height:1.6;color:#1f2937;display:flex;align-items:flex-start;word-break:break-word;box-shadow:inset 0 1px 2px rgba(15,23,42,.04)}
    .kf-value--textarea{min-height:96px;white-space:pre-wrap}
    body.dark .kf-value{border-color:#31435b;background:#0b1320;color:#e2e8f0;box-shadow:none}
    .kf-toggle-list{display:flex;flex-direction:column;gap:10px}
    .kf-toggle{display:flex;align-items:center;gap:12px;font-size:13px;color:#1f2937}
    body.dark .kf-toggle{color:#e2e8f0}
    .kf-toggle-box{width:22px;height:22px;border-radius:4px;border:2px solid #d5dce5;background:#fff;position:relative;flex-shrink:0}
    .kf-toggle.is-on .kf-toggle-box{border-color:#4c97d2;background:#4c97d2}
    .kf-toggle.is-on .kf-toggle-box::after{content:"";position:absolute;left:6px;top:1px;width:6px;height:12px;border-right:3px solid #fff;border-bottom:3px solid #fff;transform:rotate(45deg)}
    body.dark .kf-toggle-box{border-color:#31435b;background:#0b1320}
    .kf-extra{display:flex;flex-direction:column;gap:10px}
    .kf-extra-title{font-size:11px;font-weight:800;color:var(--muted);letter-spacing:.05em;text-transform:uppercase}
    .kf-extra-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
    @media (max-width:900px){
      .fd-overlay{padding:12px}
      .fd-overlay-head,.kf-modal-head{flex-direction:column;align-items:flex-start}
      .fd-overlay-actions{width:100%;justify-content:space-between}
      .fd-snapshots,.fd-entry-grid,.fd-mini-grid,.kf-extra-grid,.diff-pane-grid{grid-template-columns:1fr}
      .diff-card-head{grid-template-columns:1fr}
    }
    @media print{
      aside,.header-actions,.sb-panel .btn,.settings-tabs,.search-hint{display:none!important}
      body{display:block;background:#fff}
      main{padding:0}
      .settings-shell,.sec,.compare-box,.topbar{box-shadow:none}
    }
  </style>
</head>
<body>
  <aside>
    <div class="sb-head">
      <div class="sb-kicker">Visual Diff / Settings Review</div>
      <div class="sb-title">差分レポート</div>
      <div class="sb-meta">
        生成日時: ${esc(reportMeta.generatedAt)}<br>
        対象: ${esc(sectionText || "-")}<br>
        出力対象: ${esc(reportMeta.exportLabel || "全差分")}<br>
        出力内容: ${esc(reportMeta.exportContentLabel || "行データのみ")}
      </div>
    </div>
    <div class="sb-panel sb-stats">
      <div class="sb-stat-grid">
        <div class="sb-stat"><span>総件数</span><b id="stat-total">${summary.total}</b></div>
        <div class="sb-stat"><span>追加</span><b id="stat-added">${summary.added}</b></div>
        <div class="sb-stat"><span>削除</span><b id="stat-removed">${summary.removed}</b></div>
        <div class="sb-stat"><span>変更</span><b id="stat-changed">${summary.changed}</b></div>
        <div class="sb-stat"><span>移動</span><b id="stat-moved">${summary.moved}</b></div>
        <div class="sb-stat"><span>同一</span><b id="stat-same">${summary.same}</b></div>
      </div>
      <div style="margin-top:10px;font-size:11px;color:var(--muted)">取得失敗: <b>${fetchIssues.length}</b></div>
    </div>
    <div class="sb-panel sb-ctrl">
      <label class="chk"><input type="checkbox" id="hideSame"> 同一項目を隠す</label>
      <label class="chk"><input type="checkbox" id="charDiff" checked> 文字単位ハイライト</label>
      <span class="field-label">検索</span>
      <input type="text" id="search" placeholder="パス・値・理由・フィールド名で絞り込み" aria-label="差分の検索" autocomplete="off">
      <p class="search-hint"><kbd class="kbd">Ctrl</kbd>+<kbd class="kbd">F</kbd> / <kbd class="kbd">⌘</kbd>+<kbd class="kbd">F</kbd> でフォーカス · <kbd class="kbd">Esc</kbd> でクリア</p>
      <div class="sb-btns">
        <button type="button" class="btn" id="collapseBtn">全折畳</button>
        <button type="button" class="btn" id="expandBtn">全展開</button>
        <button type="button" class="btn" id="themeBtn">ダークに切替</button>
        <button type="button" class="btn primary" id="patchBtn" style="grid-column:span 2">パッチJSON出力</button>
      </div>
    </div>
    <div id="navWrap" hidden>
      <div class="nav-label">セクションへジャンプ</div>
      <div id="nav"></div>
    </div>
  </aside>
  <main>
    <div class="topbar">
      <div class="topbar-main">
        <div class="sb-kicker">Field Diff Review</div>
        <div class="topbar-title">フィールド単位で、設定差分をまとめてレビュー</div>
        <div class="topbar-desc">フィールドごとの差分を1項目ずつ整理し、「設定差分を開く」からポップアップで詳細を確認できます。値の差分一覧と合わせて、一覧領域を広く使いながら確認できます。</div>
      </div>
      <div class="header-actions">
        <span class="header-badge">セクション ${esc(String((scopes || []).length || 0))}</span>
        <span class="header-badge">出力 ${esc(reportMeta.exportContentLabel || "行データのみ")}</span>
        <span class="header-badge">警告 ${warning.threshold ? esc(String(warning.total)) : "OFF"}</span>
      </div>
    </div>

    <div class="settings-shell">
      <div class="settings-tabs" role="tablist" aria-label="レポート表示切替">
        <button type="button" role="tab" class="settings-tab" data-report-tab="summary" aria-selected="true">サマリー</button>
        <button type="button" role="tab" class="settings-tab passive" data-report-tab="diff" aria-selected="false">差分一覧</button>
        <button type="button" role="tab" class="settings-tab passive" data-report-tab="settingsLike" aria-selected="false">フィールド単位</button>
        <button type="button" role="tab" class="settings-tab passive" data-report-tab="compare" aria-selected="false">比較対象設定</button>
      </div>

      <section class="tab-pane" data-report-pane="summary">
        <div class="app-compare">
          <section class="app-card source">
            <div class="app-role">比較元 Source</div>
            <div class="app-title">アプリ ${esc(reportMeta.source.appId || "-")}</div>
            <div class="app-meta-grid">
              <div class="meta-card"><span class="label">ゲストスペース</span><span class="value">${esc(reportMeta.source.guestId || "(通常空間)")}</span></div>
              <div class="meta-card"><span class="label">モード</span><span class="value">${reportMeta.source.preview ? "プレビュー" : "本番"}</span></div>
              <div class="meta-card"><span class="label">Revision</span><span class="value">${esc(reportMeta.source.revision || "-")}</span></div>
              <div class="meta-card"><span class="label">比較対象</span><span class="value">${esc(sectionText || "-")}</span></div>
            </div>
          </section>
          <section class="app-card target">
            <div class="app-role">比較先 Target</div>
            <div class="app-title">アプリ ${esc(reportMeta.target.appId || "-")}</div>
            <div class="app-meta-grid">
              <div class="meta-card"><span class="label">ゲストスペース</span><span class="value">${esc(reportMeta.target.guestId || "(通常空間)")}</span></div>
              <div class="meta-card"><span class="label">モード</span><span class="value">${reportMeta.target.preview ? "プレビュー" : "本番"}</span></div>
              <div class="meta-card"><span class="label">Revision</span><span class="value">${esc(reportMeta.target.revision || "-")}</span></div>
              <div class="meta-card"><span class="label">正規化</span><span class="value">${esc(reportMeta.normalizationLabels.join(", ") || "-")}</span></div>
            </div>
          </section>
        </div>

        <div class="summary-strip" aria-label="差分サマリー">
          <article class="metric-card metric-card--total"><div class="metric-label">総件数</div><div class="metric-value">${summary.total}</div><div class="metric-sub">表示対象に含まれる行数</div></article>
          <article class="metric-card metric-card--diff"><div class="metric-label">差分</div><div class="metric-value">${diffTotal}</div><div class="metric-sub">全体の ${diffRate}% が変更対象</div></article>
          <article class="metric-card metric-card--added"><div class="metric-label">追加</div><div class="metric-value">${summary.added}</div><div class="metric-sub">比較先に追加された設定</div></article>
          <article class="metric-card metric-card--removed"><div class="metric-label">削除</div><div class="metric-value">${summary.removed}</div><div class="metric-sub">比較先から無くなった設定</div></article>
          <article class="metric-card metric-card--changed"><div class="metric-label">変更 / 移動</div><div class="metric-value">${summary.changed}</div><div class="metric-sub">移動 ${summary.moved} / 同一 ${summary.same}</div></article>
          <article class="metric-card metric-card--severity"><div class="metric-label">重要度</div><div class="metric-value">${severitySummary.high}</div><div class="metric-sub">高 / 中 ${severitySummary.medium} / 低 ${severitySummary.low} / 取得失敗 ${fetchIssues.length}</div></article>
        </div>

        <div class="info-grid">
          <section class="panel">
            <h3>比較条件</h3>
            <div class="detail-list">
              <div class="detail-row"><span class="detail-key">無視キー</span><span>${esc(reportMeta.ignoreKeys || "-")}</span></div>
              <div class="detail-row"><span class="detail-key">出力対象</span><span>${esc(reportMeta.exportLabel || "全差分")}</span></div>
              <div class="detail-row"><span class="detail-key">出力内容</span><span>${esc(reportMeta.exportContentLabel || "行データのみ")}</span></div>
              <div class="detail-row"><span class="detail-key">セクション</span><span>${esc(sectionText || "-")}</span></div>
            </div>
            ${warning.threshold ? `<div class="warn">警告しきい値: ${warning.threshold} / 合計 ${warning.total}${warning.exceeded ? " (超過)" : ""}</div>` : ""}
            ${reportMeta.truncated ? `<div class="warn">※ 出力負荷を抑えるため、先頭 ${reportMeta.renderedRows} 件のみをレポートに含めています（元件数 ${reportMeta.totalRows} 件）。</div>` : ""}
          </section>
          <section class="panel">
            <h3>レビュー補助</h3>
            <div class="detail-list">
              <div class="detail-row"><span class="detail-key">文字差分</span><span>行内ハイライト対応</span></div>
              <div class="detail-row"><span class="detail-key">検索</span><span>パス / 値 / 理由 / フィールド名</span></div>
              <div class="detail-row"><span class="detail-key">ナビゲーション</span><span>左ペインからセクション / フィールド移動</span></div>
              <div class="detail-row"><span class="detail-key">出力</span><span>Patch JSON / フィールド詳細レビュー</span></div>
            </div>
          </section>
        </div>

        <div class="info-grid info-grid--review">
          ${sectionSummaryHtml}
          ${highlightSummaryHtml}
        </div>

        ${fetchIssues.length ? `<div class="issue-box">
          <h3>API取得失敗 ${fetchIssues.length}件</h3>
          <table>
            <thead><tr><th style="width:200px">セクション</th><th style="width:90px">対象</th><th>内容</th></tr></thead>
            <tbody>${fetchIssues.map((issue) => `<tr><td>${esc(issue.section || issue.sectionKey || "-")}</td><td>${esc(getIssueSideLabel(issue.side))}</td><td><div class="msg">${esc(issue.message || "-")}</div></td></tr>`).join("")}</tbody>
          </table>
        </div>` : ""}
      </section>

      <section class="tab-pane" data-report-pane="diff" hidden>
        <div class="content">
          <div id="main"></div>
        </div>
      </section>

      <section class="tab-pane" data-report-pane="settingsLike" hidden>
        <div class="content" style="padding:0">
          <p class="muted" style="margin:0;padding:12px 18px 0;font-size:11px;line-height:1.6"><strong>フィールド単位</strong>で、フィールドごとの設定差分と影響範囲を1つの項目にまとめて確認します。左の検索と「同一項目を隠す」が連動し、カードのボタンから詳細をポップアップ表示できます。</p>
          <div id="settingsLikeRoot" class="sl-root"></div>
        </div>
      </section>

      <section class="tab-pane" data-report-pane="compare" hidden>
        ${compareHtml || '<div class="content"><div class="no-diff">比較対象設定の出力はありません。</div></div>'}
      </section>
    </div>

    <div id="fieldDetailModal" class="fd-overlay" hidden>
      <div class="fd-overlay-dialog" role="dialog" aria-modal="true" aria-labelledby="fieldDetailModalTitle">
        <div class="fd-overlay-head">
          <div>
            <div class="sb-kicker">Field Detail Popup</div>
            <div id="fieldDetailModalTitle" class="fd-overlay-title">フィールド詳細</div>
            <div id="fieldDetailModalSub" class="fd-overlay-sub">code: - / type: -</div>
          </div>
          <div class="fd-overlay-actions">
            <span class="fd-overlay-hint">Esc で閉じる</span>
            <button type="button" class="btn" data-modal-close>閉じる</button>
          </div>
        </div>
        <div id="fieldDetailModalBody" class="fd-overlay-body"></div>
      </div>
    </div>
  </main>
  <script>${logicScript}<\/script>
</body>
</html>`;
  }
  var init_export = __esm({
    "src/diff/export.ts"() {
      init_constants();
      init_utils();
      init_state();
      init_engine();
      init_enrich();
      init_filter();
      init_api();
      init_dialog();
      init_category_view();
      init_path_decoder();
    }
  });

  // src/kintoneGuard.ts
  var NOT_KINTONE_PAGE_MESSAGE = "kintone画面で実行してください";
  function isKintonePage() {
    return Boolean(window.kintone?.api && window.kintone?.app);
  }
  function runOnKintonePage(run) {
    if (!isKintonePage()) {
      alert(NOT_KINTONE_PAGE_MESSAGE);
      return;
    }
    run();
  }

  // src/tabs/diff-standalone.ts
  init_api();

  // src/settingsBundleImport.ts
  init_api();
  function unwrapBundleCandidates(raw, side) {
    if (!raw || typeof raw !== "object") return [];
    if (raw.source && raw.target) return unwrapBundleCandidates(side === "target" ? raw.target : raw.source, side);
    if (raw.bundle) return unwrapBundleCandidates(raw.bundle, side);
    if (Array.isArray(raw.apps)) return raw.apps;
    if (Array.isArray(raw.bundles)) return raw.bundles;
    if (raw.sections && raw.appId != null) return [raw];
    return [raw];
  }
  function pickSettingsBundle(raw, options = {}) {
    const side = options.side || "source";
    const appId = String(options.appId || "").trim();
    const candidates = unwrapBundleCandidates(raw, side).map((item) => {
      try {
        return ensureBundleShape(item);
      } catch {
        return null;
      }
    }).filter(Boolean);
    if (!candidates.length) throw new Error("設定JSON内にアプリ設定バンドルが見つかりません");
    if (appId) {
      const matched = candidates.find((b) => String(b?.appId || "") === appId);
      if (matched) return matched;
      if (candidates.length > 1) throw new Error(`設定JSON内に App ${appId} のバンドルが見つかりません`);
    }
    return candidates[0];
  }
  async function readSettingsBundleFile(file, options = {}) {
    const text = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(String(e.target.result || ""));
      reader.onerror = () => reject(new Error("ファイルの読み取りに失敗しました"));
      reader.readAsText(file);
    });
    return pickSettingsBundle(JSON.parse(text), options);
  }

  // src/tabs/diff-standalone.ts
  init_engine();
  init_enrich();
  init_utils();
  function warningInfoForStandalone(rows, fetchIssues) {
    const diffCount = countActualDiffRows(rows || []);
    const issueCount = (fetchIssues || []).length;
    const total = diffCount + issueCount;
    return { threshold: 0, diffCount, issueCount, total, exceeded: false };
  }
  async function runDiffStandalone(opts) {
    const onStatus = typeof opts.onStatus === "function" ? opts.onStatus : () => {
    };
    const onProgress = typeof opts.onProgress === "function" ? opts.onProgress : () => {
    };
    const source = opts.source || {};
    const target = opts.target || {};
    const scopes = opts.scopes || [];
    const ignoreKeys = opts.ignoreKeys != null ? String(opts.ignoreKeys) : "";
    const includeSame = !!opts.includeSame;
    const normalizationPresetState = opts.normalizationPresetState || {
      viewOrder: false,
      permissionOrder: false,
      generalArrayOrder: false
    };
    if (!scopes.length) throw new Error("比較セクションを選択してください");
    if (!opts.importedSourceBundle && !String(source.appId || "").trim()) {
      throw new Error("比較元アプリIDを入力してください");
    }
    if (!opts.importedTargetBundle && !String(target.appId || "").trim()) {
      throw new Error("比較先アプリIDを入力してください");
    }
    async function resolveSide(side) {
      const imported = side === "source" ? opts.importedSourceBundle : opts.importedTargetBundle;
      const params = side === "source" ? source : target;
      if (imported) return pickSettingsBundle(imported, { side, appId: String(params.appId || "").trim() });
      return fetchBundle({
        appId: String(params.appId || "").trim(),
        guestId: String(params.guestId || "").trim(),
        preview: !!params.preview,
        sections: scopes,
        onProgress: onProgress ? (progress, label) => {
          onProgress(side, progress, label);
        } : void 0
      });
    }
    onStatus("比較元を取得中...");
    const sourceBundle = deepClone(await resolveSide("source"));
    onStatus("比較先を取得中...");
    const targetBundle = deepClone(await resolveSide("target"));
    onStatus("差分計算中...");
    const diffResult = computeDiffRows(sourceBundle, targetBundle, scopes, ignoreKeys, {
      normalizationPresetState,
      includeSame
    });
    const rows = enrichDiffRows(diffResult.rows, sourceBundle, targetBundle);
    const fetchIssues = diffResult.fetchIssues || [];
    const s = summarizeRows(rows);
    const sev = summarizeSeverity(rows);
    const warning = warningInfoForStandalone(rows, fetchIssues);
    const statusLine = `差分比較完了: 差分 ${countActualDiffRows(rows)}件 / 同一 ${s.same}件 / 取得失敗 ${fetchIssues.length}件${warning.exceeded ? ` / 警告 ${warning.total}>=${warning.threshold}` : ""} (追加:${s.added} / 削除:${s.removed} / 変更:${s.changed} / 移動:${s.moved} / 高:${sev.high} / 中:${sev.medium} / 低:${sev.low})`;
    onStatus(statusLine);
    return {
      rows,
      fetchIssues,
      sourceBundle,
      targetBundle,
      summary: {
        text: statusLine,
        counts: s,
        severity: sev,
        warning
      }
    };
  }

  // src/entries/diff-lite-ui.ts
  init_constants();
  init_export();
  init_utils();

  // src/tabs/diff-export-standalone.ts
  init_utils();
  init_engine();
  init_export();
  function shouldIncludeComparedContent2(mode) {
    return mode === "withCompared";
  }
  function comparedScopesForExport(exportInfo, scopes, fetchIssues) {
    const fallback = [...new Set((scopes || []).filter(Boolean))];
    if ((exportInfo?.mode || "all") === "all") return fallback;
    const rowScopes = [...new Set((exportInfo?.rows || []).map((r) => r.sectionKey).filter(Boolean))];
    if (rowScopes.length) return rowScopes;
    const issueScopes = [...new Set((fetchIssues || []).map((i) => i.sectionKey).filter(Boolean))];
    return issueScopes.length ? issueScopes : fallback;
  }
  function warningInfoLite(rows, fetchIssues) {
    const diffCount = countActualDiffRows(rows || []);
    const issueCount = (fetchIssues || []).length;
    const total = diffCount + issueCount;
    return { threshold: 0, diffCount, issueCount, total, exceeded: false };
  }
  function diffPairLabel(sourceBundle, targetBundle) {
    const src = appLabelFromBundle(sourceBundle);
    const tgt = appLabelFromBundle(targetBundle);
    if (src && tgt) return `${src}_vs_${tgt}`;
    return src || tgt || "";
  }
  function runExportDiffJsonStandalone(ctx) {
    const rows = ctx.rows || [];
    const fetchIssues = ctx.fetchIssues || [];
    const exportInfo = { mode: "all", label: "全差分", rows };
    const exportContentMode = ctx.exportContentMode || "diffOnly";
    const compareInfo = shouldIncludeComparedContent2(exportContentMode) ? buildDiffExportComparedBundles(
      ctx.sourceBundle,
      ctx.targetBundle,
      comparedScopesForExport(exportInfo, ctx.scopes, fetchIssues)
    ) : null;
    if (!rows.length && !fetchIssues.length && !compareInfo?.scopes?.length) {
      throw new Error("出力できる比較結果がありません");
    }
    const payload = buildDiffExportPayload({
      sourceBundle: ctx.sourceBundle,
      targetBundle: ctx.targetBundle,
      rows,
      fetchIssues,
      ignoreKeys: ctx.ignoreKeys || "",
      exportMode: exportInfo.mode,
      exportLabel: exportInfo.label,
      exportContentMode,
      exportContentLabel: getDiffExportContentLabel(exportContentMode),
      normalizationState: ctx.normalizationPresetState || {},
      warning: warningInfoLite(rows, fetchIssues),
      compareScopes: compareInfo?.scopes || [],
      compareSourceBundle: compareInfo?.sourceBundle || null,
      compareTargetBundle: compareInfo?.targetBundle || null
    });
    downloadText(buildExportFilename("差分", "json", { appLabel: diffPairLabel(ctx.sourceBundle, ctx.targetBundle) }), JSON.stringify(payload, null, 2), "application/json");
  }
  function runExportDiffHtmlStandalone(ctx) {
    const rows = ctx.rows || [];
    const fetchIssues = ctx.fetchIssues || [];
    const scopes = ctx.scopes || [];
    const exportInfo = { mode: "all", label: "全差分", rows };
    const exportContentMode = ctx.exportContentMode || "diffOnly";
    const compareInfo = shouldIncludeComparedContent2(exportContentMode) ? buildDiffExportComparedBundles(
      ctx.sourceBundle,
      ctx.targetBundle,
      comparedScopesForExport(exportInfo, scopes, fetchIssues)
    ) : null;
    if (!rows.length && !fetchIssues.length && !compareInfo?.scopes?.length) {
      throw new Error("出力できる比較結果がありません");
    }
    const html = buildDiffHtml(ctx.sourceBundle, ctx.targetBundle, rows, scopes, ctx.ignoreKeys || "", {
      fetchIssues,
      exportMode: exportInfo.mode,
      exportLabel: exportInfo.label,
      exportContentMode,
      exportContentLabel: getDiffExportContentLabel(exportContentMode),
      compareScopes: compareInfo?.scopes || [],
      compareSourceBundle: compareInfo?.sourceBundle || null,
      compareTargetBundle: compareInfo?.targetBundle || null,
      normalizationState: ctx.normalizationPresetState || {},
      warning: warningInfoLite(rows, fetchIssues)
    });
    downloadText(buildExportFilename("差分", "html", { appLabel: diffPairLabel(ctx.sourceBundle, ctx.targetBundle) }), html, "text/html");
  }
  function runExportBundleJsonStandalone(sourceBundle, targetBundle) {
    if (!sourceBundle || !targetBundle) throw new Error("先に差分比較を実行してください");
    const payload = {
      generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
      source: sourceBundle,
      target: targetBundle
    };
    downloadText(buildExportFilename("比較バンドル", "json", { appLabel: diffPairLabel(sourceBundle, targetBundle) }), JSON.stringify(payload, null, 2), "application/json");
  }
  function runExportPatchJsonStandalone(rows, sourceBundle, targetBundle) {
    if (!countActualDiffRows(rows || [])) throw new Error("出力できる差分がありません");
    const payload = buildPatchPayload(rows, sourceBundle, targetBundle);
    downloadText(buildExportFilename("反映パッチ", "json", { appLabel: diffPairLabel(sourceBundle, targetBundle) }), JSON.stringify(payload, null, 2), "application/json");
  }

  // src/diff/xlsx-export.ts
  init_constants();
  init_utils();
  init_export();

  // src/diff/xlsx-builder.ts
  var XML_HEADER = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
  var crcTable = null;
  function crc32(bytes) {
    if (!crcTable) {
      const t = new Uint32Array(256);
      for (let i = 0; i < 256; i++) {
        let c = i;
        for (let k = 0; k < 8; k++) c = c & 1 ? 3988292384 ^ c >>> 1 : c >>> 1;
        t[i] = c >>> 0;
      }
      crcTable = t;
    }
    let crc = 4294967295;
    for (let i = 0; i < bytes.length; i++) crc = (crcTable[(crc ^ bytes[i]) & 255] ^ crc >>> 8) >>> 0;
    return (crc ^ 4294967295) >>> 0;
  }
  function buildStoredZip(entries) {
    const parts = [];
    const central = [];
    let offset = 0;
    const DOS_TIME = 0;
    const DOS_DATE = 2020 - 1980 << 9 | 1 << 5 | 1;
    const enc = new TextEncoder();
    for (const e of entries) {
      const nameBytes = enc.encode(e.name);
      const data = e.data;
      const crc = crc32(data);
      const size = data.length;
      const lfh = new Uint8Array(30 + nameBytes.length);
      const dv = new DataView(lfh.buffer);
      dv.setUint32(0, 67324752, true);
      dv.setUint16(4, 20, true);
      dv.setUint16(6, 2048, true);
      dv.setUint16(8, 0, true);
      dv.setUint16(10, DOS_TIME, true);
      dv.setUint16(12, DOS_DATE, true);
      dv.setUint32(14, crc, true);
      dv.setUint32(18, size, true);
      dv.setUint32(22, size, true);
      dv.setUint16(26, nameBytes.length, true);
      dv.setUint16(28, 0, true);
      lfh.set(nameBytes, 30);
      parts.push(lfh, data);
      const cdh = new Uint8Array(46 + nameBytes.length);
      const cdv = new DataView(cdh.buffer);
      cdv.setUint32(0, 33639248, true);
      cdv.setUint16(4, 20, true);
      cdv.setUint16(6, 20, true);
      cdv.setUint16(8, 2048, true);
      cdv.setUint16(10, 0, true);
      cdv.setUint16(12, DOS_TIME, true);
      cdv.setUint16(14, DOS_DATE, true);
      cdv.setUint32(16, crc, true);
      cdv.setUint32(20, size, true);
      cdv.setUint32(24, size, true);
      cdv.setUint16(28, nameBytes.length, true);
      cdv.setUint16(30, 0, true);
      cdv.setUint16(32, 0, true);
      cdv.setUint16(34, 0, true);
      cdv.setUint16(36, 0, true);
      cdv.setUint32(38, 0, true);
      cdv.setUint32(42, offset, true);
      cdh.set(nameBytes, 46);
      central.push(cdh);
      offset += lfh.length + data.length;
    }
    const cdStart = offset;
    let cdSize = 0;
    for (const c of central) {
      parts.push(c);
      cdSize += c.length;
    }
    const eocd = new Uint8Array(22);
    const edv = new DataView(eocd.buffer);
    edv.setUint32(0, 101010256, true);
    edv.setUint16(4, 0, true);
    edv.setUint16(6, 0, true);
    edv.setUint16(8, central.length, true);
    edv.setUint16(10, central.length, true);
    edv.setUint32(12, cdSize, true);
    edv.setUint32(16, cdStart, true);
    edv.setUint16(20, 0, true);
    parts.push(eocd);
    return new Blob(parts, { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  }
  function escapeXml(s) {
    return String(s ?? "").replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
  }
  function colRef(n) {
    let s = "";
    let v = n;
    while (v > 0) {
      const r = (v - 1) % 26;
      s = String.fromCharCode(65 + r) + s;
      v = Math.floor((v - 1) / 26);
    }
    return s;
  }
  function sanitizeSheetName(name, index, used) {
    let n = String(name || `Sheet${index + 1}`).replace(/[\\\/\?\*\[\]:]/g, "_");
    if (n.length > 31) n = n.slice(0, 31);
    if (!n) n = `Sheet${index + 1}`;
    let candidate = n;
    let i = 2;
    while (used.has(candidate)) {
      const suffix = `_${i++}`;
      candidate = (n.length + suffix.length > 31 ? n.slice(0, 31 - suffix.length) : n) + suffix;
    }
    used.add(candidate);
    return candidate;
  }
  var MIN_COL_W = 10;
  var MAX_COL_W = 60;
  function estimateColWidth(rows, col) {
    let max = MIN_COL_W;
    const limit = Math.min(rows.length, 500);
    for (let r = 0; r < limit; r++) {
      const v = rows[r] ? rows[r][col] : void 0;
      if (v == null) continue;
      const text = String(v);
      let maxLine = 0;
      for (const line of text.split("\n")) {
        let w = 0;
        for (let i = 0; i < line.length; i++) {
          const code = line.charCodeAt(i);
          w += code > 127 || code === 0 ? 2 : 1;
        }
        if (w > maxLine) maxLine = w;
      }
      if (maxLine > max) max = maxLine;
    }
    return Math.min(MAX_COL_W, max + 2);
  }
  function buildSheetXml(sheet) {
    const rows = sheet.rows || [];
    const maxCols = rows.reduce((n, r) => Math.max(n, r ? r.length : 0), 0);
    const widths = sheet.colWidths && sheet.colWidths.length ? sheet.colWidths : Array.from({ length: maxCols }, (_, i) => estimateColWidth(rows, i));
    const out = [];
    out.push(XML_HEADER);
    out.push('<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">');
    const freeze = sheet.freezeHeader !== false && rows.length > 0;
    if (freeze) {
      out.push('<sheetViews><sheetView workbookViewId="0">');
      out.push('<pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/>');
      out.push("</sheetView></sheetViews>");
    }
    out.push('<sheetFormatPr defaultRowHeight="16"/>');
    if (widths.length) {
      out.push("<cols>");
      widths.forEach((w, i) => {
        const cw = Math.max(MIN_COL_W, Math.min(MAX_COL_W, Number(w) || MIN_COL_W));
        out.push(`<col min="${i + 1}" max="${i + 1}" width="${cw}" customWidth="1"/>`);
      });
      out.push("</cols>");
    }
    out.push("<sheetData>");
    for (let r = 0; r < rows.length; r++) {
      const row = rows[r] || [];
      const cells = [];
      for (let c = 0; c < row.length; c++) {
        const v = row[c];
        if (v === null || v === void 0 || v === "") continue;
        const ref = `${colRef(c + 1)}${r + 1}`;
        const styleAttr = r === 0 ? ' s="1"' : ' s="2"';
        if (typeof v === "number" && Number.isFinite(v)) {
          cells.push(`<c r="${ref}"${styleAttr}><v>${v}</v></c>`);
        } else if (typeof v === "boolean") {
          cells.push(`<c r="${ref}"${styleAttr} t="b"><v>${v ? 1 : 0}</v></c>`);
        } else {
          cells.push(`<c r="${ref}"${styleAttr} t="inlineStr"><is><t xml:space="preserve">${escapeXml(v)}</t></is></c>`);
        }
      }
      out.push(`<row r="${r + 1}">${cells.join("")}</row>`);
    }
    out.push("</sheetData>");
    if (sheet.autoFilter !== false && rows.length > 1 && maxCols > 0) {
      out.push(`<autoFilter ref="A1:${colRef(maxCols)}${rows.length}"/>`);
    }
    out.push("</worksheet>");
    return out.join("");
  }
  function buildWorkbookXml(sheets) {
    const items = sheets.map((s, i) => `<sheet name="${escapeXml(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join("");
    return `${XML_HEADER}<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${items}</sheets></workbook>`;
  }
  function buildWorkbookRels(sheets) {
    const items = sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join("");
    return `${XML_HEADER}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${items}</Relationships>`;
  }
  function buildContentTypes(sheets) {
    const overrides = sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("");
    return `${XML_HEADER}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>` + overrides + "</Types>";
  }
  function buildRootRels() {
    return `${XML_HEADER}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`;
  }
  function buildStylesXml() {
    return `${XML_HEADER}<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Meiryo"/></font><font><b/><sz val="11"/><name val="Meiryo"/><color rgb="FF0F172A"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFE0F2FE"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment vertical="center" horizontal="left" wrapText="1"/></xf><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;
  }
  function buildXlsxBlob(sheets) {
    const enc = new TextEncoder();
    const used = /* @__PURE__ */ new Set();
    const safe = sheets.map((s, i) => ({ ...s, name: sanitizeSheetName(s.name, i, used) }));
    const entries = [
      { name: "[Content_Types].xml", data: enc.encode(buildContentTypes(safe)) },
      { name: "_rels/.rels", data: enc.encode(buildRootRels()) },
      { name: "xl/workbook.xml", data: enc.encode(buildWorkbookXml(safe)) },
      { name: "xl/_rels/workbook.xml.rels", data: enc.encode(buildWorkbookRels(safe)) },
      { name: "xl/styles.xml", data: enc.encode(buildStylesXml()) }
    ];
    safe.forEach((s, i) => {
      entries.push({ name: `xl/worksheets/sheet${i + 1}.xml`, data: enc.encode(buildSheetXml(s)) });
    });
    return buildStoredZip(entries);
  }

  // src/diff/xlsx-export.ts
  var SECTION_LABEL_BY_KEY2 = new Map(SECTION_DEFS.map((d) => [d.key, d.label]));
  var SECTION_ORDER_BY_KEY = new Map(SECTION_DEFS.map((d, i) => [d.key, i]));
  function sectionLabelOf(key) {
    return SECTION_LABEL_BY_KEY2.get(key) || key || "(未分類)";
  }
  function groupRowsBySection(rows) {
    const map = /* @__PURE__ */ new Map();
    for (const r of rows) {
      const key = r.sectionKey || "(その他)";
      let list = map.get(key);
      if (!list) {
        list = [];
        map.set(key, list);
      }
      list.push(r);
    }
    const ordered = /* @__PURE__ */ new Map();
    const known = [...map.keys()].filter((k) => SECTION_ORDER_BY_KEY.has(k)).sort((a, b) => SECTION_ORDER_BY_KEY.get(a) - SECTION_ORDER_BY_KEY.get(b));
    const unknown = [...map.keys()].filter((k) => !SECTION_ORDER_BY_KEY.has(k));
    for (const k of [...known, ...unknown]) ordered.set(k, map.get(k));
    return ordered;
  }
  function appLabel(bundle) {
    if (!bundle) return "";
    const name = bundle.meta?.appName ? String(bundle.meta.appName) : "";
    const id = bundle.appId != null ? String(bundle.appId) : "";
    if (name && id) return `${name} (App ${id})`;
    return name || (id ? `App ${id}` : "");
  }
  var HEADER = ["種別", "重要度", "パス", "項目", "比較元 (旧)", "比較先 (新)"];
  var COL_WIDTHS = [10, 8, 38, 28, 48, 48];
  function buildSummarySheet(ctx, grouped) {
    const rows = ctx.rows || [];
    const issues = ctx.fetchIssues || [];
    const typeCounts = { added: 0, removed: 0, changed: 0, moved: 0, same: 0 };
    const sevCounts = { high: 0, medium: 0, low: 0 };
    for (const r of rows) {
      if (typeCounts[r.type] != null) typeCounts[r.type] += 1;
      const sev = String(r.severity || "").toLowerCase();
      if (sevCounts[sev] != null) sevCounts[sev] += 1;
    }
    const diffCount = typeCounts.added + typeCounts.removed + typeCounts.changed + typeCounts.moved;
    const sheet = {
      name: "概要",
      autoFilter: false,
      freezeHeader: false,
      colWidths: [22, 60],
      rows: [
        ["項目", "値"],
        ["生成日時", (/* @__PURE__ */ new Date()).toISOString()],
        ["比較元アプリ", appLabel(ctx.sourceBundle)],
        ["比較元ゲストID", String(ctx.sourceBundle?.guestId || "")],
        ["比較元プレビュー", ctx.sourceBundle?.preview ? "はい" : "いいえ"],
        ["比較先アプリ", appLabel(ctx.targetBundle)],
        ["比較先ゲストID", String(ctx.targetBundle?.guestId || "")],
        ["比較先プレビュー", ctx.targetBundle?.preview ? "はい" : "いいえ"],
        ["出力内容", getDiffExportContentLabel(ctx.exportContentMode || "diffOnly")],
        ["無視キー", String(ctx.ignoreKeys || "")],
        ["", ""],
        ["集計", "件数"],
        ["全行数", String(rows.length)],
        ["差分件数 (追加/削除/変更/移動)", String(diffCount)],
        ["  追加", String(typeCounts.added)],
        ["  削除", String(typeCounts.removed)],
        ["  変更", String(typeCounts.changed)],
        ["  移動", String(typeCounts.moved)],
        ["  同一", String(typeCounts.same)],
        ["重要度: 高", String(sevCounts.high)],
        ["重要度: 中", String(sevCounts.medium)],
        ["重要度: 低", String(sevCounts.low)],
        ["取得時の問題", String(issues.length)],
        ["", ""],
        ["セクション", "件数"]
      ]
    };
    for (const [key, list] of grouped) {
      sheet.rows.push([sectionLabelOf(key), String(list.length)]);
    }
    return sheet;
  }
  function buildSectionSheet(label, list) {
    const rows = [HEADER];
    for (const r of list) {
      const type = getDiffTypeDisplayLabel(r.type, { moved: !!r.moved });
      const sev = getSeverityDisplayLabel(r.severity || "low");
      const left = r.left === void 0 || r.type === "added" ? "" : stringifyRowValueForDiff(r.left, r.path);
      const right = r.right === void 0 || r.type === "removed" ? "" : stringifyRowValueForDiff(r.right, r.path);
      rows.push([type, sev, r.path || "", r.label || "", left, right]);
    }
    return { name: label, rows, colWidths: COL_WIDTHS };
  }
  function buildIssuesSheet(issues) {
    const rows = [["セクション", "対象", "メッセージ"]];
    for (const i of issues) {
      rows.push([sectionLabelOf(i.sectionKey || ""), getIssueSideLabel(i.side || ""), String(i.message || "")]);
    }
    return { name: "取得時の問題", rows, colWidths: [22, 12, 80] };
  }
  function buildDiffXlsxBlob(ctx) {
    const rows = ctx.rows || [];
    const issues = ctx.fetchIssues || [];
    if (!rows.length && !issues.length) throw new Error("出力できる比較結果がありません");
    const grouped = groupRowsBySection(rows);
    const sheets = [buildSummarySheet(ctx, grouped)];
    for (const [key, list] of grouped) {
      sheets.push(buildSectionSheet(sectionLabelOf(key), list));
    }
    if (issues.length) sheets.push(buildIssuesSheet(issues));
    return buildXlsxBlob(sheets);
  }
  function runExportDiffXlsx(ctx) {
    const blob = buildDiffXlsxBlob(ctx);
    const src = buildAppFilenameLabel(ctx.sourceBundle?.appId, ctx.sourceBundle?.meta?.appName);
    const tgt = buildAppFilenameLabel(ctx.targetBundle?.appId, ctx.targetBundle?.meta?.appName);
    const pairLabel = src && tgt ? `${src}_vs_${tgt}` : src || tgt || "";
    const filename = ctx.filename || buildExportFilename("差分", "xlsx", { appLabel: pairLabel });
    downloadBlob(filename, blob);
  }

  // src/ui/components.ts
  init_constants();
  init_state();
  init_utils();
  init_filter();

  // src/diff/ignore-presets.ts
  init_state();

  // src/ui/components.ts
  init_engine();
  init_enrich();

  // src/reflect/nodeModeUi.ts
  init_state();

  // src/reflect/applyHistorySummary.ts
  var APPLY_HISTORY_MODE_LABELS = Object.freeze({
    section: "まとめ反映",
    nodes: "差分選択",
    patch: "JSONパッチ",
    retry: "再反映",
    restore: "復元"
  });

  // src/ui/components.ts
  init_constants();
  init_dialog();

  // src/oss_integrations.ts
  init_utils();
  init_dialog();

  // src/ui/components.ts
  var ui2 = {};
  function setComponentUi(uiRefs) {
    ui2 = uiRefs;
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

  // src/entries/litePanelTheme.ts
  init_dialog();
  var STYLE_ID = "kus-lp-theme-styles";
  var ACCENTS = {
    diff: { from: "#1d4ed8", via: "#2563eb", to: "#0ea5e9", chip: "#dbeafe", ring: "rgba(37,99,235,.16)" },
    reflect: { from: "#b91c1c", via: "#dc2626", to: "#f97316", chip: "#fee2e2", ring: "rgba(220,38,38,.18)" },
    field: { from: "#6d28d9", via: "#7c3aed", to: "#a855f7", chip: "#ede9fe", ring: "rgba(124,58,237,.18)" },
    jsconfig: { from: "#0f766e", via: "#0d9488", to: "#22d3ee", chip: "#ccfbf1", ring: "rgba(13,148,136,.18)" },
    settings: { from: "#0369a1", via: "#0284c7", to: "#22d3ee", chip: "#e0f2fe", ring: "rgba(2,132,199,.18)" },
    design: { from: "#854d0e", via: "#a16207", to: "#facc15", chip: "#fef9c3", ring: "rgba(161,98,7,.18)" },
    er: { from: "#0f766e", via: "#15803d", to: "#84cc16", chip: "#dcfce7", ring: "rgba(21,128,61,.18)" },
    process: { from: "#9a3412", via: "#ea580c", to: "#f59e0b", chip: "#ffedd5", ring: "rgba(234,88,12,.18)" },
    record: { from: "#1e293b", via: "#334155", to: "#64748b", chip: "#e2e8f0", ring: "rgba(51,65,85,.18)" }
  };
  var THEME_CSS = `
@keyframes kus-lp-spin { to { transform: rotate(360deg); } }
@keyframes kus-lp-fade-in { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }

.kus-lp{
  --c-bg:#ffffff;
  --c-surface:#f8fafc;
  --c-surface-2:#f1f5f9;
  --c-border:#e2e8f0;
  --c-border-strong:#cbd5e1;
  --c-text:#0f172a;
  --c-text-2:#334155;
  --c-muted:#64748b;
  --c-link:#2563eb;
  --c-ok-bg:#ecfdf5;
  --c-ok-fg:#065f46;
  --c-ok-bd:#a7f3d0;
  --c-err-bg:#fef2f2;
  --c-err-fg:#991b1b;
  --c-err-bd:#fecaca;
  --c-warn-bg:#fffbeb;
  --c-warn-fg:#92400e;
  --c-warn-bd:#fde68a;
  --c-info-bg:#eff6ff;
  --c-info-fg:#1e3a8a;
  --c-info-bd:#bfdbfe;
  --c-accent-from:#1d4ed8;
  --c-accent-via:#2563eb;
  --c-accent-to:#0ea5e9;
  --c-accent-chip:#dbeafe;
  --c-accent-ring:rgba(37,99,235,.16);

  position:fixed;
  z-index:999999;
  top:max(16px,2vh);
  right:max(16px,2vw);
  width:min(520px,96vw);
  max-height:min(92vh,920px);
  overflow:hidden;
  display:flex;
  flex-direction:column;
  background:var(--c-bg);
  border:1px solid var(--c-border);
  border-radius:18px;
  box-shadow:0 4px 6px -1px rgba(15,23,42,.08),0 28px 60px -12px rgba(15,23,42,.30);
  font:13px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI","Hiragino Sans","Noto Sans JP",sans-serif;
  color:var(--c-text);
  animation:kus-lp-fade-in .18s ease-out;
}

.kus-lp__hero{
  flex-shrink:0;
  position:relative;
  padding:16px 18px 18px;
  color:#fff;
  background:linear-gradient(125deg,var(--c-accent-from) 0%,var(--c-accent-via) 45%,var(--c-accent-to) 100%);
  display:flex;
  align-items:flex-start;
  justify-content:space-between;
  gap:12px;
}
.kus-lp__hero-main{min-width:0;flex:1}
.kus-lp__title{margin:0;font-size:17px;font-weight:700;line-height:1.25;letter-spacing:.01em;display:flex;align-items:center;gap:8px}
.kus-lp__title-icon{display:inline-flex;width:22px;height:22px;align-items:center;justify-content:center;background:rgba(255,255,255,.22);border-radius:7px}
.kus-lp__subtitle{margin:4px 0 0;font-size:12px;color:rgba(255,255,255,.85);line-height:1.45}
.kus-lp__badge-row{margin-top:8px;display:flex;flex-wrap:wrap;gap:5px}
.kus-lp__badge{
  display:inline-flex;align-items:center;gap:4px;
  font-size:10.5px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;
  background:rgba(255,255,255,.22);padding:3px 9px;border-radius:999px;color:#fff;
}
.kus-lp__close{
  flex-shrink:0;border:1px solid rgba(255,255,255,.45);background:rgba(255,255,255,.12);
  color:#fff;border-radius:10px;padding:6px 12px;font-size:12px;font-weight:600;cursor:pointer;
  transition:background .12s ease;
}
.kus-lp__close:hover{background:rgba(255,255,255,.24)}

.kus-lp__body{padding:16px 18px 18px;overflow-y:auto;flex:1;min-height:0}
.kus-lp__body::-webkit-scrollbar{width:10px;height:10px}
.kus-lp__body::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:8px;border:2px solid transparent;background-clip:padding-box}
.kus-lp__body::-webkit-scrollbar-thumb:hover{background:#94a3b8;background-clip:padding-box;border:2px solid transparent}

.kus-lp__hint{
  font-size:12px;color:var(--c-muted);line-height:1.55;margin:0 0 14px;
  padding:10px 12px;background:var(--c-surface);border-radius:10px;border:1px solid var(--c-border);
}
.kus-lp__hint strong{color:var(--c-text-2)}

/* ===== Tab bar (lite 内タブ) ===== */
.kus-lp__tabs{
  display:flex;flex-wrap:wrap;gap:4px;border-bottom:1px solid var(--c-border);
  margin:0 0 14px;padding:0;
}
.kus-lp__tab{
  position:relative;background:transparent;border:none;cursor:pointer;
  padding:8px 12px 9px;font-size:12px;font-weight:600;color:var(--c-muted);
  border-radius:8px 8px 0 0;
}
.kus-lp__tab:hover{color:var(--c-text-2);background:var(--c-surface)}
.kus-lp__tab[aria-selected="true"]{color:var(--c-accent-via);background:transparent}
.kus-lp__tab[aria-selected="true"]::after{
  content:'';position:absolute;left:8px;right:8px;bottom:-1px;height:2px;border-radius:2px;
  background:linear-gradient(90deg,var(--c-accent-via),var(--c-accent-to));
}
.kus-lp__tab-panel[hidden]{display:none}

/* ===== Card ===== */
.kus-lp__card{
  background:var(--c-bg);
  border:1px solid var(--c-border);
  border-radius:12px;
  padding:14px 16px;
  margin-bottom:12px;
}
.kus-lp__card--soft{background:var(--c-surface)}
.kus-lp__card-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:-2px 0 10px;padding-bottom:8px;border-bottom:1px solid var(--c-border)}
.kus-lp__card-title{font-size:11.5px;font-weight:700;color:var(--c-text-2);text-transform:uppercase;letter-spacing:.06em;margin:0;display:flex;align-items:center;gap:6px}
.kus-lp__card-num{
  display:inline-flex;width:18px;height:18px;align-items:center;justify-content:center;
  background:var(--c-accent-chip);color:var(--c-accent-via);font-size:11px;font-weight:700;border-radius:999px;
}
.kus-lp__card-actions{display:flex;gap:6px}

/* ===== Row (label + control) ===== */
.kus-lp__row{display:flex;flex-wrap:wrap;align-items:center;gap:8px 10px;margin-bottom:10px}
.kus-lp__row:last-child{margin-bottom:0}
.kus-lp__row--block{display:block}
.kus-lp__row--block > .kus-lp__label{display:block;margin-bottom:5px}
.kus-lp__label{font-size:12px;font-weight:600;color:var(--c-text-2);min-width:5em}

/* ===== Inputs ===== */
.kus-lp__input,.kus-lp__textarea,.kus-lp__select{
  appearance:none;
  border:1px solid var(--c-border);
  border-radius:8px;padding:7px 10px;font-size:12.5px;
  background:var(--c-bg);color:var(--c-text);
  outline:none;transition:border-color .15s,box-shadow .15s;
  font-family:inherit;
}
.kus-lp__input:focus,.kus-lp__textarea:focus,.kus-lp__select:focus{
  border-color:var(--c-accent-via);box-shadow:0 0 0 3px var(--c-accent-ring);
}
.kus-lp__input--id{width:min(120px,36vw)}
.kus-lp__input--guest{width:min(110px,32vw)}
.kus-lp__input--narrow{width:min(120px,40vw)}
.kus-lp__input--medium{width:min(180px,52vw)}
.kus-lp__input--wide{flex:1;min-width:160px}
.kus-lp__input--full{width:100%;box-sizing:border-box}
.kus-lp__textarea{width:100%;box-sizing:border-box;min-height:60px;resize:vertical}
.kus-lp__textarea--code{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:11.5px;background:var(--c-surface)}
.kus-lp__file{font-size:12px;padding:5px 0}

/* ===== Checkbox / chip ===== */
.kus-lp__check{font-size:12px;color:var(--c-text-2);display:inline-flex;align-items:center;gap:6px;cursor:pointer;user-select:none}
.kus-lp__check input{width:14px;height:14px;accent-color:var(--c-accent-via);margin:0}
.kus-lp__check-grid{display:flex;flex-wrap:wrap;gap:8px 12px;margin-bottom:10px}

.kus-lp__chips{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px}
.kus-lp__chip{
  display:inline-flex;align-items:center;gap:6px;
  font-size:11.5px;color:var(--c-text-2);
  background:var(--c-bg);border:1px solid var(--c-border-strong);
  border-radius:999px;padding:4px 10px 4px 7px;cursor:pointer;user-select:none;
  transition:background .12s,border-color .12s;
}
.kus-lp__chip:hover{background:var(--c-surface);border-color:#94a3b8}
.kus-lp__chip input{accent-color:var(--c-accent-via);width:13px;height:13px;margin:0}
.kus-lp__chip:has(input:checked){background:var(--c-accent-chip);border-color:var(--c-accent-via);color:var(--c-accent-from);font-weight:600}

/* ===== Buttons ===== */
.kus-lp__btn{
  appearance:none;border:1px solid transparent;border-radius:10px;
  font-family:inherit;font-size:12.5px;font-weight:600;cursor:pointer;
  padding:8px 14px;display:inline-flex;align-items:center;justify-content:center;gap:6px;
  transition:filter .12s,transform .04s,background .12s,border-color .12s;
}
.kus-lp__btn:active{transform:scale(.98)}
.kus-lp__btn[disabled],.kus-lp__btn:disabled{opacity:.55;cursor:not-allowed}

.kus-lp__btn--primary{background:linear-gradient(180deg,var(--c-accent-via),var(--c-accent-from));color:#fff;box-shadow:0 2px 4px var(--c-accent-ring)}
.kus-lp__btn--primary:hover:not(:disabled){filter:brightness(1.06)}

.kus-lp__btn--run{width:100%;padding:11px 16px;font-size:13px;font-weight:700;background:linear-gradient(180deg,var(--c-accent-via),var(--c-accent-from));color:#fff;box-shadow:0 2px 6px var(--c-accent-ring)}
.kus-lp__btn--run:hover:not(:disabled){filter:brightness(1.07)}

.kus-lp__btn--ghost{background:var(--c-surface);color:var(--c-text-2);border-color:var(--c-border-strong)}
.kus-lp__btn--ghost:hover:not(:disabled){background:#fff;border-color:#94a3b8}

.kus-lp__btn--sub{background:linear-gradient(180deg,#fff,var(--c-surface-2));color:var(--c-text-2);border-color:var(--c-border-strong);font-size:11.5px;padding:7px 10px}
.kus-lp__btn--sub:hover:not(:disabled){background:#fff;border-color:#94a3b8}

.kus-lp__btn--danger{background:linear-gradient(180deg,#ef4444,#b91c1c);color:#fff;box-shadow:0 2px 4px rgba(220,38,38,.25)}
.kus-lp__btn--danger:hover:not(:disabled){filter:brightness(1.05)}

.kus-lp__btn-row{display:flex;flex-wrap:wrap;gap:8px;margin-top:4px}
.kus-lp__btn-row--stack{flex-direction:column}
.kus-lp__btn-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
@media(max-width:380px){.kus-lp__btn-grid{grid-template-columns:1fr}}

/* ===== Status ===== */
.kus-lp__status{
  margin-top:12px;padding:10px 12px;border-radius:10px;font-size:12px;line-height:1.5;
  border:1px solid var(--c-border);background:var(--c-surface-2);color:var(--c-text-2);
  min-height:2.6em;display:flex;align-items:flex-start;gap:8px;
}
.kus-lp__status--ok{background:var(--c-ok-bg);color:var(--c-ok-fg);border-color:var(--c-ok-bd)}
.kus-lp__status--err{background:var(--c-err-bg);color:var(--c-err-fg);border-color:var(--c-err-bd)}
.kus-lp__status--warn{background:var(--c-warn-bg);color:var(--c-warn-fg);border-color:var(--c-warn-bd)}
.kus-lp__status--info{background:var(--c-info-bg);color:var(--c-info-fg);border-color:var(--c-info-bd)}
.kus-lp__status--busy{background:#eff6ff;color:#1e40af;border-color:#bfdbfe}
.kus-lp__status-icon{font-size:14px;line-height:1.2}
.kus-lp__status-busy::before{
  content:'';display:inline-block;width:10px;height:10px;border-radius:50%;
  border:2px solid var(--c-muted);border-top-color:transparent;animation:kus-lp-spin .8s linear infinite;
}

/* ===== Result / Log ===== */
.kus-lp__result{
  margin-top:10px;padding:11px 13px;background:#0f172a;color:#e2e8f0;border-radius:10px;
  font:11.5px/1.5 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
  white-space:pre-wrap;word-break:break-word;max-height:240px;overflow:auto;
  border:1px solid #1e293b;
}
.kus-lp__result--empty{display:none}
.kus-lp__panel-html{
  margin-top:10px;border:1px solid var(--c-border);border-radius:10px;
  background:var(--c-surface);max-height:240px;overflow:auto;font-size:11.5px;
}
.kus-lp__panel-html--empty{display:none}
.kus-lp__panel-html table{border-collapse:collapse;width:100%}
.kus-lp__panel-html th,.kus-lp__panel-html td{padding:6px 8px;border-bottom:1px solid var(--c-border);text-align:left}
.kus-lp__panel-html th{background:var(--c-surface-2);font-weight:600;font-size:11px;color:var(--c-text-2)}

/* ===== Misc ===== */
.kus-lp__note{font-size:11.5px;color:var(--c-muted);line-height:1.5;margin:-4px 0 10px}
.kus-lp__note--warn{color:var(--c-warn-fg);padding:7px 10px;background:var(--c-warn-bg);border:1px solid var(--c-warn-bd);border-radius:8px;margin:6px 0}
.kus-lp__divider{margin:12px 0;border:none;border-top:1px solid var(--c-border)}
.kus-lp__small{font-size:11px;color:var(--c-muted)}
.kus-lp__kbd{display:inline-block;padding:1px 6px;border:1px solid var(--c-border-strong);border-radius:4px;background:var(--c-surface);font:11px ui-monospace,monospace;color:var(--c-text-2)}

/* セクション折りたたみ (details) */
.kus-lp__details{
  border:1px solid var(--c-border);border-radius:10px;background:var(--c-bg);
  margin-bottom:10px;overflow:hidden;
}
.kus-lp__details > summary{
  list-style:none;cursor:pointer;padding:10px 14px;
  font-size:12.5px;font-weight:600;color:var(--c-text-2);
  display:flex;align-items:center;gap:8px;
}
.kus-lp__details > summary::-webkit-details-marker{display:none}
.kus-lp__details > summary::before{
  content:'';width:8px;height:8px;border-right:2px solid var(--c-muted);border-bottom:2px solid var(--c-muted);
  transform:rotate(-45deg);transition:transform .15s;display:inline-block;
}
.kus-lp__details[open] > summary::before{transform:rotate(45deg)}
.kus-lp__details > summary:hover{background:var(--c-surface)}
.kus-lp__details-body{padding:0 14px 12px}

/* Wide variant (一部 lite 用に幅広にしたい場合) */
.kus-lp--wide{width:min(640px,96vw)}

/* ===== App table (複数アプリ × per-app ゲストスペース入力) ===== */
.kus-lp__apptable{border:1px solid var(--c-border);border-radius:10px;overflow:hidden;background:var(--c-bg)}
.kus-lp__apptable-scroll{max-height:220px;overflow:auto}
.kus-lp__apptable table{width:100%;border-collapse:collapse;table-layout:fixed}
.kus-lp__apptable th{background:var(--c-surface-2);font-size:11px;font-weight:600;color:var(--c-text-2);text-align:left;padding:6px 8px;border-bottom:1px solid var(--c-border)}
.kus-lp__apptable-scroll th{position:sticky;top:0;z-index:1}
.kus-lp__apptable td{padding:5px 8px;border-bottom:1px solid var(--c-border);vertical-align:middle}
.kus-lp__apptable tbody tr:last-child td{border-bottom:none}
.kus-lp__apptable .kus-lp__input{width:100%;box-sizing:border-box}
.kus-lp__apptable-name{min-height:1.35em;margin-top:3px;color:var(--c-muted);font-size:10.5px;line-height:1.35;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.kus-lp__apptable-name:not(.kus-lp__apptable-name--empty)::before{content:'アプリ名: ';color:var(--c-text-2);font-weight:600}
.kus-lp__apptable-no{width:30px;text-align:center;color:var(--c-muted);font-size:11px;font-variant-numeric:tabular-nums}
.kus-lp__apptable-acts-h{width:128px}
.kus-lp__apptable-acts{white-space:nowrap}
.kus-lp__apptable-acts .kus-lp__btn{padding:4px 7px;font-size:11px;border-radius:7px}
.kus-lp__apptable-acts .kus-lp__btn + .kus-lp__btn{margin-left:4px}
.kus-lp__apptable-foot{display:flex;flex-wrap:wrap;align-items:center;gap:8px;padding:8px;background:var(--c-surface);border-top:1px solid var(--c-border)}
.kus-lp__apptable-count{font-size:11px;color:var(--c-muted);margin-left:auto;font-weight:600}
.kus-lp__apptable-hint{font-size:11px;line-height:1.5;color:var(--c-muted);padding:6px 10px;border-top:1px solid var(--c-border);background:var(--c-surface)}
@media(max-width:420px){
  .kus-lp__apptable table,.kus-lp__apptable thead,.kus-lp__apptable tbody,.kus-lp__apptable th,.kus-lp__apptable td,.kus-lp__apptable tr{display:block}
  .kus-lp__apptable thead{display:none}
  .kus-lp__apptable tbody tr{border-bottom:1px solid var(--c-border);padding:6px 4px}
  .kus-lp__apptable td{border:none;padding:3px 6px}
  .kus-lp__apptable-no{text-align:left;font-weight:600}
}
`;
  function ensureThemeStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const s = document.createElement("style");
    s.id = STYLE_ID;
    s.textContent = THEME_CSS;
    document.head.appendChild(s);
  }
  function applyAccentVars(root2, accentKey) {
    const a = ACCENTS[accentKey] || ACCENTS.diff;
    root2.style.setProperty("--c-accent-from", a.from);
    root2.style.setProperty("--c-accent-via", a.via);
    root2.style.setProperty("--c-accent-to", a.to);
    root2.style.setProperty("--c-accent-chip", a.chip);
    root2.style.setProperty("--c-accent-ring", a.ring);
  }
  function createLitePanel(opts) {
    ensureThemeStyles();
    const old = document.getElementById(opts.id);
    if (old) old.remove();
    const root2 = document.createElement("div");
    root2.id = opts.id;
    root2.className = `kus-lp${opts.wide ? " kus-lp--wide" : ""}`;
    root2.setAttribute("role", "dialog");
    root2.setAttribute("aria-modal", "false");
    applyAccentVars(root2, opts.accent);
    const hero = document.createElement("div");
    hero.className = "kus-lp__hero";
    const heroMain = document.createElement("div");
    heroMain.className = "kus-lp__hero-main";
    const titleId = `${opts.id}-title`;
    const titleEl = document.createElement("h1");
    titleEl.className = "kus-lp__title";
    titleEl.id = titleId;
    titleEl.textContent = opts.title;
    root2.setAttribute("aria-labelledby", titleId);
    heroMain.appendChild(titleEl);
    if (opts.subtitle) {
      const subEl = document.createElement("p");
      subEl.className = "kus-lp__subtitle";
      subEl.textContent = opts.subtitle;
      heroMain.appendChild(subEl);
    }
    const badgesEl = document.createElement("div");
    badgesEl.className = "kus-lp__badge-row";
    const badges = opts.badges || [{ label: "Lite" }];
    for (const b of badges) {
      const span = document.createElement("span");
      span.className = "kus-lp__badge";
      span.textContent = b.label;
      badgesEl.appendChild(span);
    }
    heroMain.appendChild(badgesEl);
    const closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "kus-lp__close";
    closeBtn.textContent = "閉じる";
    hero.appendChild(heroMain);
    hero.appendChild(closeBtn);
    root2.appendChild(hero);
    const body = document.createElement("div");
    body.className = "kus-lp__body";
    if (opts.hint) {
      const hint = document.createElement("div");
      hint.className = "kus-lp__hint";
      hint.innerHTML = opts.hint;
      body.appendChild(hint);
    }
    const status = document.createElement("div");
    status.className = "kus-lp__status";
    status.dataset.tone = "neutral";
    status.innerHTML = '<span class="kus-lp__status-icon">·</span><span class="kus-lp__status-text">準備完了</span>';
    const result = document.createElement("pre");
    result.className = "kus-lp__result kus-lp__result--empty";
    root2.appendChild(body);
    document.body.appendChild(root2);
    body.appendChild(status);
    body.appendChild(result);
    function setStatus(msg, tone = "neutral") {
      status.dataset.tone = tone;
      status.className = "kus-lp__status" + (tone !== "neutral" ? ` kus-lp__status--${tone}` : "");
      const icon = tone === "ok" ? "✓" : tone === "err" ? "⚠" : tone === "warn" ? "!" : tone === "info" ? "i" : tone === "busy" ? "" : "·";
      const iconCls = tone === "busy" ? "kus-lp__status-icon kus-lp__status-busy" : "kus-lp__status-icon";
      status.innerHTML = `<span class="${iconCls}">${icon}</span><span class="kus-lp__status-text"></span>`;
      status.querySelector(".kus-lp__status-text").textContent = msg || "";
    }
    function setResult(text) {
      if (!text) {
        result.textContent = "";
        result.classList.add("kus-lp__result--empty");
        return;
      }
      result.textContent = text;
      result.classList.remove("kus-lp__result--empty");
    }
    function setResultHtml(html) {
      if (!html) {
        result.innerHTML = "";
        result.classList.add("kus-lp__result--empty");
        return;
      }
      result.innerHTML = html;
      result.classList.remove("kus-lp__result--empty");
    }
    function setBusy(busy) {
      closeBtn.disabled = busy;
      root2.style.cursor = busy ? "progress" : "";
    }
    function close() {
      document.removeEventListener("keydown", onDocKeydown, true);
      root2.remove();
      setRootElement(null);
    }
    closeBtn.addEventListener("click", close);
    let primaryBtn = null;
    function setPrimaryAction(btn) {
      primaryBtn = btn;
    }
    function triggerPrimary() {
      if (primaryBtn && !primaryBtn.disabled) primaryBtn.click();
    }
    body.addEventListener("keydown", (e) => {
      if (e.key !== "Enter" || e.isComposing || e.keyCode === 229) return;
      const t = e.target;
      if (!t) return;
      const tag = t.tagName;
      if (tag === "TEXTAREA") {
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          triggerPrimary();
        }
        return;
      }
      if (tag === "INPUT") {
        const type = t.type;
        if (type === "checkbox" || type === "radio" || type === "file" || type === "button") return;
        if (t.hasAttribute("data-lp-no-submit") || type === "search") return;
        e.preventDefault();
        triggerPrimary();
      }
    });
    function onDocKeydown(e) {
      if (e.key === "Escape" && !closeBtn.disabled && document.body.contains(root2)) {
        e.preventDefault();
        e.stopPropagation();
        close();
      }
    }
    document.addEventListener("keydown", onDocKeydown, true);
    setRootElement(root2);
    setComponentUi({ status, result, busyText: document.createElement("span") });
    requestAnimationFrame(() => {
      const first = body.querySelector(
        "input:not([type=hidden]):not([disabled]),select:not([disabled]),textarea:not([disabled])"
      );
      try {
        first?.focus({ preventScroll: true });
      } catch {
      }
    });
    return { root: root2, body, status, result, setStatus, setResult, setResultHtml, setBusy, close, setPrimaryAction };
  }
  function makeRow(child, opts = {}) {
    const wrap = document.createElement("div");
    wrap.className = "kus-lp__row" + (opts.block ? " kus-lp__row--block" : "");
    if (opts.label) {
      const lab = document.createElement("span");
      lab.className = "kus-lp__label";
      lab.textContent = opts.label;
      wrap.appendChild(lab);
    }
    if (Array.isArray(child)) child.forEach((c) => wrap.appendChild(c));
    else wrap.appendChild(child);
    if (opts.help) {
      const h = document.createElement("div");
      h.className = "kus-lp__small";
      h.style.width = "100%";
      h.textContent = opts.help;
      wrap.appendChild(h);
    }
    return wrap;
  }
  function makeInput(opts = {}) {
    const inp = document.createElement("input");
    inp.type = opts.type || "text";
    if (opts.placeholder) inp.placeholder = opts.placeholder;
    if (opts.value) inp.value = opts.value;
    if (opts.ariaLabel) inp.setAttribute("aria-label", opts.ariaLabel);
    if (opts.noSubmit) inp.setAttribute("data-lp-no-submit", "");
    inp.className = "kus-lp__input" + (opts.width ? ` kus-lp__input--${opts.width}` : "");
    return inp;
  }
  function makeTextarea(opts = {}) {
    const t = document.createElement("textarea");
    t.className = "kus-lp__textarea" + (opts.code ? " kus-lp__textarea--code" : "");
    if (opts.rows) t.rows = opts.rows;
    if (opts.placeholder) t.placeholder = opts.placeholder;
    if (opts.value) t.value = opts.value;
    return t;
  }
  function makeSelect(options, defaultValue) {
    const sel = document.createElement("select");
    sel.className = "kus-lp__select";
    for (const [v, t] of options) {
      const o = document.createElement("option");
      o.value = v;
      o.textContent = t;
      if (defaultValue !== void 0 && v === defaultValue) o.selected = true;
      sel.appendChild(o);
    }
    return sel;
  }
  function makeButton(label, variant = "primary", opts = {}) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = `kus-lp__btn kus-lp__btn--${variant}`;
    if (opts.icon) {
      const i = document.createElement("span");
      i.textContent = opts.icon;
      i.style.cssText = "font-size:14px;line-height:1";
      b.appendChild(i);
    }
    const t = document.createElement("span");
    t.textContent = label;
    b.appendChild(t);
    return b;
  }
  function makeCheck(opts) {
    const lab = document.createElement("label");
    lab.className = "kus-lp__check";
    const cb = document.createElement("input");
    cb.type = "checkbox";
    if (opts.checked) cb.checked = true;
    if (opts.value !== void 0) cb.value = opts.value;
    lab.appendChild(cb);
    lab.appendChild(document.createTextNode(opts.label));
    if (opts.help) lab.title = opts.help;
    return { label: lab, checkbox: cb };
  }
  function makeChip(opts) {
    const lab = document.createElement("label");
    lab.className = "kus-lp__chip";
    const cb = document.createElement("input");
    cb.type = "checkbox";
    if (opts.checked) cb.checked = true;
    if (opts.value !== void 0) cb.value = opts.value;
    lab.appendChild(cb);
    lab.appendChild(document.createTextNode(opts.label));
    if (opts.help) lab.title = opts.help;
    return { label: lab, checkbox: cb };
  }
  function makeCard(opts = {}) {
    const card = document.createElement("div");
    card.className = "kus-lp__card" + (opts.soft ? " kus-lp__card--soft" : "");
    const head = document.createElement("div");
    head.className = "kus-lp__card-head";
    if (opts.title || opts.number) {
      const t = document.createElement("div");
      t.className = "kus-lp__card-title";
      if (opts.number) {
        const n = document.createElement("span");
        n.className = "kus-lp__card-num";
        n.textContent = String(opts.number);
        t.appendChild(n);
      }
      if (opts.title) t.appendChild(document.createTextNode(opts.title));
      head.appendChild(t);
    }
    const actions = document.createElement("div");
    actions.className = "kus-lp__card-actions";
    head.appendChild(actions);
    card.appendChild(head);
    const body = document.createElement("div");
    card.appendChild(body);
    if (opts.subtitle) {
      const s = document.createElement("div");
      s.className = "kus-lp__small";
      s.style.cssText = "margin:-4px 0 8px";
      s.textContent = opts.subtitle;
      body.appendChild(s);
    }
    return { card, body, actions };
  }
  function makeNote(text, kind = "plain") {
    const n = document.createElement("div");
    n.className = kind === "warn" ? "kus-lp__note--warn" : "kus-lp__note";
    n.textContent = text;
    return n;
  }
  function makeDetails(title, opts = {}) {
    const d = document.createElement("details");
    d.className = "kus-lp__details";
    if (opts.open) d.open = true;
    const s = document.createElement("summary");
    s.textContent = title;
    const b = document.createElement("div");
    b.className = "kus-lp__details-body";
    d.appendChild(s);
    d.appendChild(b);
    return { details: d, body: b };
  }
  async function liteRun(panel, busyMsg, fn, okMsg) {
    panel.setStatus(busyMsg, "busy");
    panel.setBusy(true);
    try {
      const out = await fn();
      if (okMsg) panel.setStatus(okMsg, "ok");
      return out;
    } catch (e) {
      panel.setStatus(`エラー: ${e?.message || String(e)}`, "err");
      return void 0;
    } finally {
      panel.setBusy(false);
    }
  }

  // src/entries/appSearchControl.ts
  init_api();

  // src/handlers/diffFocus.ts
  init_state();
  init_dialog();
  function extractAppIdFromInput(value) {
    const raw = String(value || "").trim();
    if (!raw) return "";
    if (/^\d+$/.test(raw)) return raw;
    let decoded = raw;
    try {
      decoded = decodeURIComponent(raw);
    } catch (e) {
    }
    const queryMatch = decoded.match(/[?&]app=(\d+)(?:[&#]|$)/i);
    if (queryMatch) return queryMatch[1];
    const guestPathMatch = decoded.match(/\/k\/guest\/\d+\/(\d+)(?:[/?#]|$)/i);
    if (guestPathMatch) return guestPathMatch[1];
    const pathMatch = decoded.match(/\/k\/(\d+)(?:[/?#]|$)/i);
    if (pathMatch) return pathMatch[1];
    return "";
  }
  function extractGuestIdFromInput(value) {
    const raw = String(value || "").trim();
    if (!raw) return "";
    let decoded = raw;
    try {
      decoded = decodeURIComponent(raw);
    } catch (e) {
    }
    const guestPathMatch = decoded.match(/\/k\/guest\/(\d+)(?:\/|[?#]|$)/i);
    return guestPathMatch ? guestPathMatch[1] : "";
  }

  // src/entries/appSearchControl.ts
  init_utils();
  var RESULT_CSS_ID = "kus-app-search-styles";
  var RESULT_CSS = `
.kus-as__result{margin-top:6px;border:1px solid var(--c-border);border-radius:8px;overflow:hidden;max-height:240px;overflow-y:auto}
.kus-as__result--empty{display:none}
.kus-as__head{padding:6px 10px;background:var(--c-surface-2);font-size:11px;font-weight:600;color:var(--c-text-2);position:sticky;top:0}
.kus-as__table{border-collapse:collapse;width:100%;font-size:11.5px}
.kus-as__table th,.kus-as__table td{padding:5px 8px;border-bottom:1px solid var(--c-border);text-align:left;vertical-align:top}
.kus-as__table th{background:var(--c-surface);font-weight:600;color:var(--c-text-2);font-size:11px}
.kus-as__table tr:last-child td{border-bottom:none}
.kus-as__id{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;color:var(--c-text-2);white-space:nowrap}
.kus-as__name{color:var(--c-text);word-break:break-all}
.kus-as__assign{display:flex;flex-wrap:wrap;gap:4px;justify-content:flex-end}
.kus-as__assign .kus-lp__btn{padding:4px 8px;font-size:10.5px}
.kus-as__assign .kus-as__picked{background:var(--c-ok-bg);border-color:var(--c-ok-bd);color:var(--c-ok-fg)}
`;
  function ensureStyles() {
    if (document.getElementById(RESULT_CSS_ID)) return;
    const st = document.createElement("style");
    st.id = RESULT_CSS_ID;
    st.textContent = RESULT_CSS;
    document.head.appendChild(st);
  }
  function createAppSearchControl(panel, opts) {
    ensureStyles();
    const { details, body } = makeDetails(opts.title || "アプリ名で検索", { open: !!opts.open });
    const keyword = makeInput({ placeholder: "アプリ名 / アプリID / URL", width: "wide", noSubmit: true });
    const guest = makeInput({ placeholder: "ゲストID（任意）", width: "guest", noSubmit: true });
    if (opts.guestEl?.value.trim()) guest.value = opts.guestEl.value.trim();
    const searchBtn = makeButton("検索", "sub", { icon: "🔍" });
    body.appendChild(makeRow([keyword, guest, searchBtn], { label: "検索語" }));
    body.appendChild(makeNote("スペース内のアプリを名前で検索します。アプリIDや一覧画面のURLを貼り付けると直接候補にできます。"));
    const resultBox = document.createElement("div");
    resultBox.className = "kus-as__result kus-as__result--empty";
    body.appendChild(resultBox);
    function renderResults(apps) {
      if (!apps.length) {
        resultBox.className = "kus-as__result";
        resultBox.innerHTML = '<div class="kus-as__head">検索結果なし</div>';
        return;
      }
      const single = opts.targets.length <= 1;
      const rowsHtml = apps.map((app, idx) => {
        const buttons = opts.targets.map((t, ti) => {
          const label = single ? "選択" : `${t.label || "設定"}へ`;
          return `<button type="button" class="kus-lp__btn kus-lp__btn--sub" data-as-pick="${idx}" data-as-target="${ti}">${esc(label)}</button>`;
        }).join("");
        return `<tr>
        <td class="kus-as__id">${esc(app.appId)}</td>
        <td class="kus-as__name" title="${esc(app.name)}">${esc(app.name)}</td>
        <td><div class="kus-as__assign">${buttons}</div></td>
      </tr>`;
      }).join("");
      resultBox.className = "kus-as__result";
      resultBox.innerHTML = `<div class="kus-as__head">${apps.length}件の候補</div>
      <table class="kus-as__table">
        <thead><tr><th style="width:74px">アプリID</th><th>アプリ名</th><th style="width:1%"></th></tr></thead>
        <tbody>${rowsHtml}</tbody>
      </table>`;
      resultBox.querySelectorAll("button[data-as-pick]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const app = apps[Number(btn.dataset.asPick)];
          const target = opts.targets[Number(btn.dataset.asTarget)];
          if (!app || !target) return;
          const searchGuest = guest.value.trim();
          const outcome = target.apply(app.appId, app.name, searchGuest) || {};
          if (searchGuest && opts.guestEl && !opts.guestEl.value.trim()) opts.guestEl.value = searchGuest;
          const where = opts.targets.length > 1 && target.label ? `（${target.label}）` : "";
          btn.classList.add("kus-as__picked");
          btn.setAttribute("aria-pressed", "true");
          btn.textContent = outcome.pickedLabel || (opts.targets.length > 1 && target.label ? `${target.label}済み` : "設定済み");
          panel.setStatus(
            outcome.message || `App ${app.appId}${app.name ? ` (${app.name})` : ""} を設定しました${where}`,
            outcome.tone || "ok"
          );
        });
      });
    }
    async function runSearch() {
      const raw = keyword.value.trim();
      const urlGuestId = extractGuestIdFromInput(raw);
      if (urlGuestId && !guest.value.trim()) guest.value = urlGuestId;
      const guestId = guest.value.trim() || urlGuestId || "";
      const prefix = buildApiPrefix(guestId, false);
      const directAppId = extractAppIdFromInput(raw);
      if (directAppId) {
        panel.setStatus("アプリIDを確認中…", "busy");
        let name = "";
        try {
          const info = await apiGet(prefix, "/app.json", { id: directAppId });
          name = String(info?.name || "").trim();
        } catch {
          name = "ID指定（名称未取得）";
        }
        renderResults([{ appId: directAppId, name: name || "ID指定" }]);
        panel.setStatus(`アプリID ${directAppId}${guestId ? ` / ゲスト ${guestId}` : ""} を候補に表示しました`, "ok");
        return;
      }
      const params = { limit: 100 };
      if (raw) params.name = raw;
      panel.setStatus("アプリ検索中…", "busy");
      try {
        const res = await apiGet(prefix, "/apps.json", params);
        const apps = (res?.apps || []).map((a) => ({ appId: String(a.appId || "").trim(), name: String(a.name || "") })).filter((a) => /^\d+$/.test(a.appId)).sort((a, b) => Number(a.appId) - Number(b.appId));
        renderResults(apps);
        panel.setStatus(`アプリ検索完了: ${apps.length}件`, apps.length ? "ok" : "info");
      } catch (e) {
        resultBox.className = "kus-as__result kus-as__result--empty";
        resultBox.innerHTML = "";
        panel.setStatus(`アプリ検索エラー: ${e?.message || String(e)}`, "err");
      }
    }
    searchBtn.addEventListener("click", () => {
      void runSearch();
    });
    keyword.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.isComposing && e.keyCode !== 229) {
        e.preventDefault();
        void runSearch();
      }
    });
    return details;
  }

  // src/entries/diff-lite-ui.ts
  var SCOPE_OPTS = [
    ["fieldSettings", "フィールド", true],
    ["layoutSettings", "レイアウト", true],
    ["viewSettings", "ビュー", true],
    ["reportSettings", "グラフ", false],
    ["processSettings", "プロセス", true],
    ["appSettings", "アプリ設定", false],
    ["formSettings", "フォーム", false],
    ["customizeSettings", "JS/CSS", false],
    ["pluginSettings", "プラグイン", false],
    ["actionSettings", "アクション", false],
    ["appAcl", "アプリ権限", false],
    ["fieldAcl", "フィールド権限", false],
    ["recordPermissions", "レコード権限", false],
    ["notifications", "通知", false],
    ["perRecordNotifications", "レコード条件通知", false],
    ["reminderNotifications", "リマインダー", false],
    ["categories", "カテゴリ", false]
  ];
  var TYPE_LABEL = { added: "追加", removed: "削除", changed: "変更", moved: "移動", same: "同一" };
  var SEVERITY_LABEL = { high: "高", medium: "中", low: "低" };
  var RESULT_CSS_ID2 = "kus-diff-lite-result-styles";
  var RESULT_CSS2 = `
.kus-dl-result{font:12px/1.5 ui-monospace,Menlo,monospace;color:#0f172a}
.kus-dl-result__summary{margin:0 0 6px;font-family:-apple-system,Segoe UI,sans-serif;font-size:11.5px;color:#475569;display:flex;flex-wrap:wrap;gap:6px 12px}
.kus-dl-result__summary strong{color:#0f172a}
.kus-dl-section{border:1px solid #e2e8f0;border-radius:8px;margin-bottom:8px;overflow:hidden;background:#fff}
.kus-dl-section>summary{padding:6px 10px;background:#f8fafc;font:600 12px/1.4 -apple-system,Segoe UI,sans-serif;cursor:pointer;list-style:none;display:flex;justify-content:space-between;gap:8px}
.kus-dl-section>summary::-webkit-details-marker{display:none}
.kus-dl-section>summary::before{content:"▸";display:inline-block;margin-right:6px;color:#64748b;transition:transform .15s}
.kus-dl-section[open]>summary::before{transform:rotate(90deg)}
.kus-dl-section__count{color:#64748b;font-weight:400}
.kus-dl-section__body{padding:6px}
.kus-dl-row{border-bottom:1px solid #f1f5f9;padding:6px 8px;font-family:-apple-system,Segoe UI,sans-serif;font-size:11.5px}
.kus-dl-row:last-child{border-bottom:none}
.kus-dl-row__head{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-bottom:4px}
.kus-dl-row__path{font-family:ui-monospace,Menlo,monospace;color:#334155;word-break:break-all;flex:1;min-width:120px}
.kus-dl-row__cols{display:grid;grid-template-columns:1fr 1fr;gap:6px;font-family:ui-monospace,Menlo,monospace;font-size:11px}
.kus-dl-pre{margin:0;padding:6px 8px;background:#f8fafc;border-radius:6px;border:1px solid #e2e8f0;white-space:pre-wrap;word-break:break-all;max-height:300px;overflow:auto}
.kus-dl-pre.del{background:#fef2f2;border-color:#fecaca;color:#7f1d1d}
.kus-dl-pre.add{background:#f0fdf4;border-color:#bbf7d0;color:#14532d}
.kus-dl-pre.empty{color:#94a3b8;font-style:italic}
.kus-dl-badge{display:inline-block;padding:1px 6px;border-radius:4px;font:600 10.5px/1.4 -apple-system,Segoe UI,sans-serif;letter-spacing:.02em}
.kus-dl-badge--added{background:#dcfce7;color:#166534}
.kus-dl-badge--removed{background:#fee2e2;color:#991b1b}
.kus-dl-badge--changed{background:#dbeafe;color:#1d4ed8}
.kus-dl-badge--moved{background:#fef3c7;color:#92400e}
.kus-dl-badge--same{background:#e2e8f0;color:#475569}
.kus-dl-sev{display:inline-block;padding:0 5px;border-radius:3px;font:600 10px/1.4 -apple-system,Segoe UI,sans-serif}
.kus-dl-sev--high{background:#fee2e2;color:#991b1b}
.kus-dl-sev--medium{background:#fef3c7;color:#92400e}
.kus-dl-sev--low{background:#e0f2fe;color:#0c4a6e}
.kus-dl-empty{padding:14px;text-align:center;color:#64748b;font-size:12px;background:#f8fafc;border-radius:8px}
.kus-dl-reason{display:inline-block;padding:1px 6px;border-radius:999px;background:#fff7ed;color:#9a3412;border:1px solid #fdba74;font:500 10px/1.4 -apple-system,Segoe UI,sans-serif}
.kus-dl-flag{display:inline-block;padding:1px 6px;border-radius:999px;background:#f5f3ff;color:#5b21b6;border:1px solid #c4b5fd;font:500 10px/1.4 -apple-system,Segoe UI,sans-serif}
.kus-dl-result mark.diff-char-del{background:#fecaca;color:#7f1d1d;border-radius:2px;padding:0 1px;text-decoration:line-through}
.kus-dl-result mark.diff-char-add{background:#bbf7d0;color:#14532d;border-radius:2px;padding:0 1px}
.kus-dl-target-field{display:flex;flex:1 1 180px;min-width:180px;flex-direction:column}
.kus-dl-target-field .kus-lp__input{width:100%;box-sizing:border-box}
.kus-dl-target-name{min-height:1.35em;margin-top:3px;color:#64748b;font-size:10.5px;line-height:1.35;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.kus-dl-target-name:not(.kus-dl-target-name--empty)::before{content:'アプリ名: ';color:#334155;font-weight:600}
`;
  function ensureResultStyles() {
    if (document.getElementById(RESULT_CSS_ID2)) return;
    const st = document.createElement("style");
    st.id = RESULT_CSS_ID2;
    st.textContent = RESULT_CSS2;
    document.head.appendChild(st);
  }
  function rowSearchText(row) {
    const safe = (v) => {
      try {
        return v === void 0 ? "" : JSON.stringify(v);
      } catch {
        return String(v);
      }
    };
    return [row.section || "", row.sectionKey || "", row.severity || "", row.path || "", row.label || "", safe(row.left), safe(row.right)].join("\n").toLowerCase();
  }
  function rowMatchesFilters(row, filters) {
    if (filters.section && row.sectionKey !== filters.section) return false;
    if (filters.type) {
      if (filters.type === "moved") {
        if (!row.moved) return false;
      } else if (row.type !== filters.type) {
        return false;
      }
    }
    if (filters.severity && String(row.severity || "low") !== filters.severity) return false;
    if (filters.keyword && !rowSearchText(row).includes(filters.keyword)) return false;
    return true;
  }
  function rowColumnsHtml(row, useCharDiff) {
    const leftStr = stringifyRowValueForDiff(row.left, row.path);
    const rightStr = stringifyRowValueForDiff(row.right, row.path);
    if (row.type === "added") {
      return { left: '<pre class="kus-dl-pre empty">（なし）</pre>', right: `<pre class="kus-dl-pre add">${esc(rightStr)}</pre>` };
    }
    if (row.type === "removed") {
      return { left: `<pre class="kus-dl-pre del">${esc(leftStr)}</pre>`, right: '<pre class="kus-dl-pre empty">（なし）</pre>' };
    }
    if (row.type === "same") {
      return { left: `<pre class="kus-dl-pre empty">${esc(leftStr)}</pre>`, right: '<pre class="kus-dl-pre empty">（同一）</pre>' };
    }
    if (useCharDiff) {
      const charDiff = buildCharDiffHtml(leftStr, rightStr);
      if (charDiff) {
        return { left: `<pre class="kus-dl-pre del">${charDiff.left}</pre>`, right: `<pre class="kus-dl-pre add">${charDiff.right}</pre>` };
      }
    }
    return { left: `<pre class="kus-dl-pre del">${esc(leftStr)}</pre>`, right: `<pre class="kus-dl-pre add">${esc(rightStr)}</pre>` };
  }
  function renderRowsHtml(rows, useCharDiff, summary) {
    if (!rows.length) return `<div class="kus-dl-empty">該当する差分はありません${summary ? ` — ${summary}` : ""}</div>`;
    const bySection = /* @__PURE__ */ new Map();
    for (const r of rows) {
      const key = r.sectionKey || "(その他)";
      if (!bySection.has(key)) bySection.set(key, []);
      bySection.get(key).push(r);
    }
    const orderedKeys = [];
    for (const def of SECTION_DEFS) if (bySection.has(def.key)) orderedKeys.push(def.key);
    for (const k of bySection.keys()) if (!orderedKeys.includes(k)) orderedKeys.push(k);
    const parts = [];
    parts.push(`<div class="kus-dl-result__summary">${summary}</div>`);
    for (const k of orderedKeys) {
      const list = bySection.get(k);
      const label = SECTION_DEFS.find((d) => d.key === k)?.label || k;
      parts.push(`<details class="kus-dl-section" open><summary>${esc(label)} <span class="kus-dl-section__count">${list.length}件</span></summary><div class="kus-dl-section__body">`);
      for (const r of list) {
        const cols = rowColumnsHtml(r, useCharDiff);
        const typeKey = r.moved ? "moved" : r.type || "same";
        const typeBadge = `<span class="kus-dl-badge kus-dl-badge--${esc(typeKey)}">${esc(TYPE_LABEL[typeKey] || typeKey)}</span>`;
        const sevBadge = r.severity ? `<span class="kus-dl-sev kus-dl-sev--${esc(r.severity)}">${esc(SEVERITY_LABEL[r.severity] || r.severity)}</span>` : "";
        const labelHtml = r.label ? `<span style="color:#475569">${esc(r.label)}</span>` : "";
        const reasonHtml = r.reasonSummary ? `<span class="kus-dl-reason">${esc(r.reasonSummary)}</span>` : "";
        const flagHtml = [
          r.notationOnly ? '<span class="kus-dl-flag" title="型・表記だけが異なり、値としては同じです（例: &quot;100&quot; と 100）">表記のみ</span>' : "",
          r.emptyOnly ? '<span class="kus-dl-flag" title="空文字・null・空配列など、空値同士の差です">空値ゆれ</span>' : ""
        ].join("");
        parts.push(`<div class="kus-dl-row"><div class="kus-dl-row__head">${typeBadge}${sevBadge}<span class="kus-dl-row__path">${esc(r.path || "")}</span>${reasonHtml}${flagHtml}${labelHtml}</div><div class="kus-dl-row__cols">${cols.left}${cols.right}</div></div>`);
      }
      parts.push("</div></details>");
    }
    return parts.join("");
  }
  function mountDiffLitePanel(runDiffStandalone2) {
    ensureResultStyles();
    const panel = createLitePanel({
      id: "kus-diff-lite",
      title: "差分比較",
      subtitle: "2 アプリの設定差分を取得し、JSON / HTML / Excel / バンドル / パッチで保存",
      accent: "diff",
      badges: [{ label: "Lite" }, { label: "出力対応" }],
      hint: "API 取得・差分計算・出力をこのスクリプトに同梱しています。<strong>統合ツール.js は不要</strong>。",
      wide: true
    });
    const srcApp = makeInput({ placeholder: "アプリID", width: "id" });
    const srcGuest = makeInput({ placeholder: "ゲストID", width: "guest" });
    const srcPrev = makeCheck({ label: "プレビューで取得" });
    const tgtApp = makeInput({ placeholder: "アプリID（カンマ区切り可）", width: "medium" });
    const tgtGuest = makeInput({ placeholder: "ゲストID", width: "guest" });
    const tgtPrev = makeCheck({ label: "プレビューで取得" });
    const cardApp = makeCard({ title: "アプリと環境", number: 1 });
    cardApp.body.appendChild(makeRow([srcApp, srcGuest, srcPrev.label], { label: "比較元" }));
    const makeTargetName = () => {
      const el = document.createElement("div");
      el.className = "kus-dl-target-name kus-dl-target-name--empty";
      return el;
    };
    const makeTargetField = (app, name) => {
      const wrap = document.createElement("div");
      wrap.className = "kus-dl-target-field";
      wrap.appendChild(app);
      wrap.appendChild(name);
      return wrap;
    };
    const setTargetName = (entry, appName) => {
      entry.appName = String(appName || "").trim();
      entry.name.textContent = entry.appName;
      entry.name.title = entry.appName ? `アプリ名: ${entry.appName}` : "";
      entry.name.classList.toggle("kus-dl-target-name--empty", !entry.appName);
    };
    const tgtName = makeTargetName();
    const firstTargetRow = makeRow([makeTargetField(tgtApp, tgtName), tgtGuest, tgtPrev.label], { label: "比較先 1" });
    cardApp.body.appendChild(firstTargetRow);
    const targetList = document.createElement("div");
    targetList.style.display = "grid";
    targetList.style.gap = "6px";
    targetList.style.marginTop = "6px";
    targetList.style.maxHeight = "180px";
    targetList.style.overflowY = "auto";
    targetList.style.paddingRight = "2px";
    const targetRows = [{ app: tgtApp, guest: tgtGuest, row: firstTargetRow, name: tgtName, appName: "" }];
    const relabelTargetRows = () => targetRows.forEach((r, idx) => {
      const label = r.row?.querySelector?.(".kus-lp__label");
      if (label) label.textContent = `比較先 ${idx + 1}`;
    });
    const addTargetRow = (appId = "", guestId = "", appName = "") => {
      const app = makeInput({ placeholder: "アプリID（カンマ区切り可）", width: "medium" });
      const guest = makeInput({ placeholder: "ゲストID", width: "guest" });
      const name = makeTargetName();
      app.value = appId;
      guest.value = guestId;
      const copy = makeButton("行コピー", "sub");
      const remove = makeButton("削除", "ghost");
      const row = makeRow([makeTargetField(app, name), guest, copy, remove], { label: `比較先 ${targetRows.length + 1}` });
      const entry = { app, guest, row, name, appName: "" };
      setTargetName(entry, appName);
      copy.addEventListener("click", async () => {
        const text = [`比較先 ${targetRows.indexOf(entry) + 1}`, app.value.trim(), guest.value.trim()].join("	");
        try {
          await navigator.clipboard.writeText(text);
          panel.setStatus("比較先行をコピーしました", "info");
        } catch {
          panel.setStatus(text, "info");
        }
      });
      remove.addEventListener("click", () => {
        row.remove();
        const idx = targetRows.indexOf(entry);
        if (idx >= 0) targetRows.splice(idx, 1);
        relabelTargetRows();
      });
      app.addEventListener("input", () => {
        if (entry.appName) setTargetName(entry, "");
      });
      targetRows.push(entry);
      targetList.appendChild(row);
      attachTargetSplit(entry);
      return entry;
    };
    const attachTargetSplit = (entry) => {
      const distribute = () => {
        const raw = entry.app.value;
        if (!/[,、\s]/.test(raw)) return;
        const tokens = raw.split(/[,、\s]+/).map((t) => t.trim()).filter(Boolean);
        if (tokens.length <= 1) {
          entry.app.value = tokens[0] || "";
          setTargetName(entry, "");
          return;
        }
        entry.app.value = tokens[0];
        setTargetName(entry, "");
        const guestVal = entry.guest.value.trim();
        for (let k = 1; k < tokens.length; k += 1) addTargetRow(tokens[k], guestVal);
        panel.setStatus(`比較先を ${tokens.length} 件に分割しました`, "info");
      };
      entry.app.addEventListener("change", distribute);
      entry.app.addEventListener("paste", (ev) => {
        const text = ev.clipboardData?.getData("text") || "";
        if (!/[,、\s]/.test(text)) return;
        ev.preventDefault();
        entry.app.value = [entry.app.value.trim(), text].filter(Boolean).join(",");
        distribute();
      });
    };
    tgtApp.addEventListener("input", () => {
      if (targetRows[0]?.appName) setTargetName(targetRows[0], "");
    });
    attachTargetSplit(targetRows[0]);
    const addTargetBtn = makeButton("比較先行を追加", "sub");
    addTargetBtn.addEventListener("click", () => {
      addTargetRow();
      panel.setStatus("比較先行を追加しました", "info");
    });
    const copyFirstBtn = makeButton("比較先1を複製", "sub");
    copyFirstBtn.addEventListener("click", () => addTargetRow(tgtApp.value.trim(), tgtGuest.value.trim(), targetRows[0]?.appName || ""));
    cardApp.body.appendChild(makeRow([addTargetBtn, copyFirstBtn], { label: "複数比較" }));
    cardApp.body.appendChild(createAppSearchControl(panel, {
      targets: [
        { label: "比較元", apply: (id, _name, guestId) => {
          srcApp.value = id;
          if (guestId && !srcGuest.value.trim()) srcGuest.value = guestId;
        } },
        { label: "比較先", apply: (id, name, guestId) => {
          const empty = targetRows.find((r) => !r.app.value.trim()) || addTargetRow();
          empty.app.value = id;
          setTargetName(empty, name);
          if (guestId && !empty.guest.value.trim()) empty.guest.value = guestId;
        } }
      ]
    }));
    cardApp.body.appendChild(targetList);
    panel.body.insertBefore(cardApp.card, panel.status);
    const cardScope = makeCard({ title: "比較セクション", number: 2 });
    const chipBox = document.createElement("div");
    chipBox.className = "kus-lp__chips";
    const chips = SCOPE_OPTS.map(([key, label, def]) => makeChip({ label, value: key, checked: def }));
    chips.forEach((c) => chipBox.appendChild(c.label));
    cardScope.body.appendChild(chipBox);
    const allBtn = makeButton("全選択", "sub");
    const noneBtn = makeButton("全解除", "sub");
    cardScope.actions.appendChild(allBtn);
    cardScope.actions.appendChild(noneBtn);
    allBtn.addEventListener("click", () => chips.forEach((c) => {
      c.checkbox.checked = true;
    }));
    noneBtn.addEventListener("click", () => chips.forEach((c) => {
      c.checkbox.checked = false;
    }));
    panel.body.insertBefore(cardScope.card, panel.status);
    const cardImport = makeCard({ title: "設定JSON読込（任意）", soft: true });
    cardImport.body.appendChild(makeNote("設定出力で保存した単体JSON、設定一括取得JSON（apps 配列）、差分バンドルJSONを指定できます。指定した側はAPI取得せずJSONを使用します。"));
    const srcFile = document.createElement("input");
    srcFile.type = "file";
    srcFile.accept = ".json,application/json";
    srcFile.className = "kus-lp__file";
    const tgtFile = document.createElement("input");
    tgtFile.type = "file";
    tgtFile.accept = ".json,application/json";
    tgtFile.className = "kus-lp__file";
    const clearImportBtn = makeButton("読込解除", "ghost");
    cardImport.body.appendChild(makeRow(srcFile, { label: "比較元JSON" }));
    cardImport.body.appendChild(makeRow(tgtFile, { label: "比較先JSON" }));
    cardImport.body.appendChild(makeRow(clearImportBtn));
    panel.body.insertBefore(cardImport.card, panel.status);
    const advDetails = makeDetails("詳細オプション");
    const ignTa = makeTextarea({ rows: 2, code: true, placeholder: "無視キー（カンマ区切り）" });
    advDetails.body.appendChild(makeRow(ignTa, { label: "無視キー", block: true }));
    const includeSame = makeCheck({ label: "同一行も差分行に含める" });
    const nView = makeCheck({ label: "ビュー順序を正規化", checked: false });
    const nPerm = makeCheck({ label: "権限順序を正規化", checked: false });
    const nAll = makeCheck({ label: "配列順序を無視", checked: false });
    const normGrid = document.createElement("div");
    normGrid.className = "kus-lp__check-grid";
    normGrid.appendChild(includeSame.label);
    normGrid.appendChild(nView.label);
    normGrid.appendChild(nPerm.label);
    normGrid.appendChild(nAll.label);
    advDetails.body.appendChild(normGrid);
    panel.body.insertBefore(advDetails.details, panel.status);
    const runBtn = makeButton("差分比較を実行", "run", { icon: "◎" });
    const runAllBtn = makeButton("全比較先を順に比較", "sub", { icon: "◎" });
    panel.body.insertBefore(makeRow([runBtn, runAllBtn]), panel.status);
    panel.setPrimaryAction(runBtn);
    const cardFilter = makeCard({ title: "結果の絞り込み", soft: true });
    cardFilter.card.style.display = "none";
    const filterSection = makeSelect([["", "全セクション"]]);
    const filterType = makeSelect([
      ["", "全種別"],
      ["added", "追加"],
      ["removed", "削除"],
      ["changed", "変更"],
      ["moved", "移動"],
      ["same", "同一"]
    ]);
    const filterSeverity = makeSelect([
      ["", "全重要度"],
      ["high", "高"],
      ["medium", "中"],
      ["low", "低"]
    ]);
    const filterSearch = makeInput({ placeholder: "パス・値・ラベルで検索", width: "wide", noSubmit: true });
    const filterClear = makeButton("クリア", "ghost");
    cardFilter.body.appendChild(makeRow([filterSection, filterType, filterSeverity, filterClear], { label: "フィルタ" }));
    cardFilter.body.appendChild(makeRow(filterSearch, { label: "検索" }));
    const charDiffCb = makeCheck({ label: "文字単位ハイライト", checked: true, help: "変更行で「どこが変わったか」を文字単位で強調表示します" });
    cardFilter.body.appendChild(makeRow(charDiffCb.label));
    filterClear.addEventListener("click", () => {
      filterSection.value = "";
      filterType.value = "";
      filterSeverity.value = "";
      filterSearch.value = "";
      rerender();
    });
    [filterSection, filterType, filterSeverity].forEach((el) => el.addEventListener("change", () => rerender()));
    filterSearch.addEventListener("input", () => rerender());
    charDiffCb.checkbox.addEventListener("change", () => rerender());
    panel.body.insertBefore(cardFilter.card, panel.status);
    const cardResult = makeCard({ title: "結果", soft: true });
    cardResult.card.style.display = "none";
    const resultBox = document.createElement("div");
    resultBox.className = "kus-dl-result";
    cardResult.body.appendChild(resultBox);
    panel.body.insertBefore(cardResult.card, panel.status);
    const cardOut = makeCard({ title: "ファイル出力", number: 3, soft: true });
    cardOut.body.appendChild(makeNote("比較完了後に利用できます。レポートに生設定を含めるか、出力対象を絞るかを選べます。"));
    const expRange = makeSelect([
      ["all", "全件"],
      ["filtered", "表示中（フィルタ適用後）"]
    ], "all");
    const expMode = makeSelect([
      ["diffOnly", "行データのみ"],
      ["withCompared", "行データ + 比較セクションの設定"]
    ], "diffOnly");
    cardOut.body.appendChild(makeRow([expRange, expMode], { label: "範囲 / 内容" }));
    const grid = document.createElement("div");
    grid.className = "kus-lp__btn-grid";
    const bJson = makeButton("差分 JSON", "sub", { icon: "↓" });
    const bHtml = makeButton("差分 HTML", "sub", { icon: "↓" });
    const bXlsx = makeButton("差分 Excel", "sub", { icon: "↓" });
    const bBundle = makeButton("バンドル JSON", "sub", { icon: "↓" });
    const bPatch = makeButton("パッチ JSON", "sub", { icon: "↓" });
    grid.appendChild(bJson);
    grid.appendChild(bHtml);
    grid.appendChild(bXlsx);
    grid.appendChild(bBundle);
    grid.appendChild(bPatch);
    cardOut.body.appendChild(grid);
    panel.body.insertBefore(cardOut.card, cardResult.card);
    let cache = null;
    let summaryText = "";
    let importedSourceBundle = null;
    let importedTargetBundle = null;
    srcFile.addEventListener("change", () => liteRun(panel, "比較元JSONを読み込み中…", async () => {
      const file = srcFile.files?.[0];
      if (!file) return;
      importedSourceBundle = await readSettingsBundleFile(file, { side: "source", appId: srcApp.value.trim() });
      if (!srcApp.value.trim() && importedSourceBundle?.appId) srcApp.value = String(importedSourceBundle.appId);
      panel.setStatus(`比較元JSONを読み込みました: App ${importedSourceBundle?.appId || "-"}`, "ok");
    }));
    tgtFile.addEventListener("change", () => liteRun(panel, "比較先JSONを読み込み中…", async () => {
      const file = tgtFile.files?.[0];
      if (!file) return;
      importedTargetBundle = await readSettingsBundleFile(file, { side: "target", appId: tgtApp.value.trim() });
      if (!tgtApp.value.trim() && importedTargetBundle?.appId) tgtApp.value = String(importedTargetBundle.appId);
      panel.setStatus(`比較先JSONを読み込みました: App ${importedTargetBundle?.appId || "-"}`, "ok");
    }));
    clearImportBtn.addEventListener("click", () => {
      importedSourceBundle = null;
      importedTargetBundle = null;
      srcFile.value = "";
      tgtFile.value = "";
      panel.setStatus("設定JSONの読込を解除しました", "info");
    });
    function readTargets() {
      const seen = /* @__PURE__ */ new Set();
      return targetRows.map((r) => ({ appId: r.app.value.trim(), guestId: r.guest.value.trim(), preview: tgtPrev.checkbox.checked })).filter((t) => t.appId).filter((t) => {
        const key = `${t.appId}::${t.guestId}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    }
    function readForm() {
      return {
        source: { appId: srcApp.value.trim(), guestId: srcGuest.value.trim(), preview: srcPrev.checkbox.checked },
        target: { appId: tgtApp.value.trim(), guestId: tgtGuest.value.trim(), preview: tgtPrev.checkbox.checked },
        scopes: chips.filter((c) => c.checkbox.checked).map((c) => c.checkbox.value),
        ignoreKeys: ignTa.value,
        includeSame: includeSame.checkbox.checked,
        normalizationPresetState: {
          viewOrder: nView.checkbox.checked,
          permissionOrder: nPerm.checkbox.checked,
          generalArrayOrder: nAll.checkbox.checked
        }
      };
    }
    function currentFilters() {
      return {
        section: filterSection.value,
        type: filterType.value,
        severity: filterSeverity.value,
        keyword: filterSearch.value.trim().toLowerCase()
      };
    }
    function filteredRows() {
      if (!cache) return [];
      const f = currentFilters();
      return cache.rows.filter((r) => rowMatchesFilters(r, f));
    }
    function refreshFilterSectionOptions() {
      if (!cache) return;
      const set = new Set(cache.rows.map((r) => r.sectionKey).filter(Boolean));
      const prev = filterSection.value;
      filterSection.innerHTML = "";
      const optAll = document.createElement("option");
      optAll.value = "";
      optAll.textContent = "全セクション";
      filterSection.appendChild(optAll);
      for (const def of SECTION_DEFS) {
        if (set.has(def.key)) {
          const o = document.createElement("option");
          o.value = def.key;
          o.textContent = def.label;
          filterSection.appendChild(o);
        }
      }
      if ([...filterSection.options].some((o) => o.value === prev)) filterSection.value = prev;
    }
    function rerender() {
      if (!cache) {
        resultBox.innerHTML = "";
        cardResult.card.style.display = "none";
        cardFilter.card.style.display = "none";
        return;
      }
      const rows = filteredRows();
      const summary = `<strong>${rows.length}</strong>件 表示中 / 全 <strong>${cache.rows.length}</strong>件 ・ ${summaryText}`;
      resultBox.innerHTML = renderRowsHtml(rows, charDiffCb.checkbox.checked, summary);
      cardResult.card.style.display = "block";
      cardFilter.card.style.display = "block";
    }
    function exportCtx(forceAll = false) {
      if (!cache) throw new Error("先に差分比較を実行してください");
      const rows = forceAll || expRange.value === "all" ? cache.rows : filteredRows();
      return {
        ...cache,
        rows,
        exportContentMode: expMode.value || "diffOnly"
      };
    }
    runAllBtn.addEventListener("click", () => {
      const targets = readTargets();
      if (!targets.length) {
        panel.setStatus("比較先アプリIDを 1 件以上入力してください", "warn");
        return;
      }
      liteRun(panel, "全比較先を比較中…", async () => {
        const base = readForm();
        const rows = [];
        for (let i = 0; i < targets.length; i += 1) {
          const t = targets[i];
          panel.setStatus(`比較中 (${i + 1}/${targets.length}) App:${t.appId}${t.guestId ? ` / Guest:${t.guestId}` : ""}`, "busy");
          const out = await runDiffStandalone2({
            source: base.source,
            target: t,
            scopes: base.scopes,
            ignoreKeys: base.ignoreKeys,
            includeSame: base.includeSame,
            normalizationPresetState: base.normalizationPresetState,
            importedSourceBundle,
            onStatus: (m) => panel.setStatus(m, "busy")
          });
          rows.push(`<tr><td>${esc(t.appId)}</td><td>${esc(t.guestId || "通常")}</td><td>${(out.rows || []).filter((r) => r.type !== "same").length}</td><td>${(out.fetchIssues || []).length}</td></tr>`);
        }
        cardResult.card.style.display = "";
        resultBox.innerHTML = `<div class="kus-dl-result"><table><thead><tr><th>比較先App</th><th>ゲストID</th><th>差分</th><th>取得失敗</th></tr></thead><tbody>${rows.join("")}</tbody></table></div>`;
        panel.setStatus(`全比較先の比較が完了しました (${targets.length}件)`, "ok");
      });
    });
    runBtn.addEventListener("click", () => {
      cache = null;
      summaryText = "";
      resultBox.innerHTML = "";
      cardResult.card.style.display = "none";
      cardFilter.card.style.display = "none";
      const f = readForm();
      if (!f.scopes.length) {
        panel.setStatus("比較セクションを 1 つ以上選択してください", "warn");
        return;
      }
      liteRun(panel, "差分比較を実行中…", async () => {
        const out = await runDiffStandalone2({
          source: f.source,
          target: f.target,
          scopes: f.scopes,
          ignoreKeys: f.ignoreKeys,
          includeSame: f.includeSame,
          normalizationPresetState: f.normalizationPresetState,
          importedSourceBundle,
          importedTargetBundle,
          onStatus: (m) => panel.setStatus(m, "busy")
        });
        cache = {
          rows: out.rows,
          fetchIssues: out.fetchIssues || [],
          sourceBundle: out.sourceBundle,
          targetBundle: out.targetBundle,
          scopes: f.scopes,
          ignoreKeys: f.ignoreKeys,
          normalizationPresetState: f.normalizationPresetState
        };
        summaryText = out.summary?.text || "完了";
        refreshFilterSectionOptions();
        rerender();
        panel.setStatus(`${summaryText} — フィルタで絞り込み、ファイル出力ボタンから保存できます`, "ok");
      });
    });
    bJson.addEventListener("click", () => {
      try {
        runExportDiffJsonStandalone(exportCtx());
        panel.setStatus(`差分 JSON をダウンロードしました（${expRange.value === "all" ? "全件" : "表示中"}）`, "ok");
      } catch (e) {
        panel.setStatus(`エラー: ${e?.message || String(e)}`, "err");
      }
    });
    bHtml.addEventListener("click", () => {
      try {
        runExportDiffHtmlStandalone(exportCtx());
        panel.setStatus(`差分 HTML をダウンロードしました（${expRange.value === "all" ? "全件" : "表示中"}）`, "ok");
      } catch (e) {
        panel.setStatus(`エラー: ${e?.message || String(e)}`, "err");
      }
    });
    bXlsx.addEventListener("click", () => {
      try {
        runExportDiffXlsx(exportCtx());
        panel.setStatus(`差分 Excel をダウンロードしました（${expRange.value === "all" ? "全件" : "表示中"}）`, "ok");
      } catch (e) {
        panel.setStatus(`エラー: ${e?.message || String(e)}`, "err");
      }
    });
    bBundle.addEventListener("click", () => {
      try {
        if (!cache) throw new Error("先に差分比較を実行してください");
        runExportBundleJsonStandalone(cache.sourceBundle, cache.targetBundle);
        panel.setStatus("バンドル JSON をダウンロードしました", "ok");
      } catch (e) {
        panel.setStatus(`エラー: ${e?.message || String(e)}`, "err");
      }
    });
    bPatch.addEventListener("click", () => {
      try {
        if (!cache) throw new Error("先に差分比較を実行してください");
        const rows = expRange.value === "all" ? cache.rows : filteredRows();
        runExportPatchJsonStandalone(rows, cache.sourceBundle, cache.targetBundle);
        panel.setStatus(`パッチ JSON をダウンロードしました（${expRange.value === "all" ? "全件" : "表示中"}）`, "ok");
      } catch (e) {
        panel.setStatus(`エラー: ${e?.message || String(e)}`, "err");
      }
    });
  }

  // src/entries/diff-lite-entry.ts
  runOnKintonePage(() => mountDiffLitePanel(runDiffStandalone));
})();
