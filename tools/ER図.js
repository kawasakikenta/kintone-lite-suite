// ==========================================================================
// ER図.js  —  自動生成ファイル（手編集禁止）
// ==========================================================================
// このファイルは tools/統合ツール/ の npm run build (esbuild) で生成されます。
// ソース: tools/統合ツール/src/entries/er-lite-entry.js
//         tools/統合ツール/src/tabs/er.js  ← 機能の正規実装
//
// ■ 修正する場合は tools/統合ツール/src/ 配下のソースを編集し、
//   cd tools/統合ツール && npm run build で再生成してください。
// ■ このファイルを直接編集しても次回ビルドで上書きされます。
// ==========================================================================
"use strict";
(() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __esm = (fn, res) => function __init() {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  };
  var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

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
  function sanitizeCustomizeResourceList(value) {
    if (!Array.isArray(value)) return [];
    const resources = [];
    for (const item of value) {
      if (!item || typeof item !== "object") continue;
      const type = String(item.type || "").toUpperCase();
      if (type === "FILE") {
        const fileKey = item?.file?.fileKey;
        if (fileKey == null || String(fileKey) === "") continue;
        resources.push({ type: "FILE", file: { fileKey: String(fileKey) } });
        continue;
      }
      if (type === "URL") {
        const url = item.url;
        if (url == null || String(url) === "") continue;
        resources.push({ type: "URL", url: String(url) });
      }
    }
    return resources;
  }
  function buildCustomizeSettingsPutPayload(value) {
    const source = value && typeof value === "object" ? value : {};
    const buildPlatform = (platform) => ({
      js: sanitizeCustomizeResourceList(source?.[platform]?.js),
      css: sanitizeCustomizeResourceList(source?.[platform]?.css)
    });
    return {
      desktop: buildPlatform("desktop"),
      mobile: buildPlatform("mobile")
    };
  }
  var TOOL_ID, EXTERNAL_LIBRARIES, DEFAULT_APP_ID, DIALOG_STATE_KEY, SECTION_DEFS, DEFAULT_SUBTAB_STATE, TOUR_STEP_CONNECTION, TOUR_STEP_SCOPE, TOUR_STEP_NOISE, TOUR_STEP_RUN_DIFF, TOUR_STEP_REVIEW, TOUR_STEP_CATEGORY_VIEW, TOUR_STEP_PLAN, TOUR_STEP_APPLY, TOUR_STEP_RECORD, GUIDED_TOUR_COURSES, GUIDED_TOUR_STEPS;
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
        { key: "customizeSettings", label: "JS/CSS設定", endpoint: "/app/customize.json", put: true, putBuilder: buildCustomizeSettingsPutPayload },
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
        body: "差分比較後は「差分結果の整理・出力」から、セクション・種別・検索で絞り込めます。ここで反映対象を見極めます。"
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
  var state, REFLECT_APPLY_HISTORY_KEY, WORK_HISTORY_KEY, CONNECTION_PRESETS_KEY;
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
        lastPartialIssues: [],
        lastDiffTruncation: null,
        lastDiffAt: null,
        lastDiffSignature: "",
        lastDiffSnapshotContext: null,
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
  function safeJsonForScript(v) {
    return JSON.stringify(v).replace(/</g, "\\u003c").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
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
  function buildAppFilenameLabel(appId, appName) {
    const id = String(appId || "").trim();
    const name = String(appName || "").trim();
    if (name && id) return `${sanitizeFilenamePart(name)}(app${sanitizeFilenamePart(id)})`;
    if (name) return sanitizeFilenamePart(name);
    if (id) return `app${sanitizeFilenamePart(id)}`;
    return "";
  }
  function buildExportFilename(baseLabel, ext, options = {}) {
    const normalizedExt = String(ext || "").replace(/^\./, "").trim() || "txt";
    const base = sanitizeFilenamePart(baseLabel, "出力");
    const stamp = options.timestamp || nowStamp();
    const appLabel = String(options.appLabel || "").trim();
    const suffix = String(options.suffix || "").trim();
    const parts = [base];
    if (appLabel) parts.push(sanitizeFilenamePart(appLabel));
    if (suffix) parts.push(sanitizeFilenamePart(suffix));
    parts.push(sanitizeFilenamePart(stamp, nowStamp()));
    return `${parts.join("_")}.${normalizedExt}`;
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
  var init_utils = __esm({
    "src/utils.ts"() {
      "use strict";
      init_constants();
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
    const matched = text.match(/\b(?:HTTP(?:\/\d+(?:\.\d+)?)?(?:\s+status(?:\s+code)?)?|status(?:\s+code)?)\s*(?::|=|-)?\s*([45]\d{2})\b/i);
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
  async function fetchAppsInSpace(spaceId, guestId) {
    const sid = String(spaceId || "").trim();
    if (!/^\d+$/.test(sid)) throw new Error("スペースIDは数値で入力してください");
    const prefix = buildApiPrefix(guestId, false);
    const apps = [];
    const seen = /* @__PURE__ */ new Set();
    const limit = 100;
    for (let offset = 0; ; offset += limit) {
      const resp = await apiGet(prefix, "/apps.json", { spaceIds: [sid], limit, offset });
      const chunk = Array.isArray(resp?.apps) ? resp.apps : [];
      for (const a of chunk) {
        const appId = String(a?.appId || "").trim();
        if (!/^\d+$/.test(appId) || seen.has(appId)) continue;
        seen.add(appId);
        apps.push({ appId, name: String(a?.name || ""), spaceId: String(a?.spaceId || sid) });
      }
      if (chunk.length < limit) break;
    }
    apps.sort((a, b) => Number(a.appId) - Number(b.appId));
    return apps;
  }
  var DEFAULT_API_GET_RETRIES, DEFAULT_RETRY_BASE_DELAY_MS, DEFAULT_RETRY_MAX_DELAY_MS, RETRIABLE_STATUS_CODES, apiGetMetrics, CUSTOMIZE_BODY_MAX_BYTES;
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
    }
  });

  // src/reflect/applyOutcome.ts
  var init_applyOutcome = __esm({
    "src/reflect/applyOutcome.ts"() {
      "use strict";
    }
  });

  // src/diff/engine.ts
  var init_engine = __esm({
    "src/diff/engine.ts"() {
      "use strict";
      init_constants();
      init_state();
      init_utils();
    }
  });

  // src/diff/enrich.ts
  var init_enrich = __esm({
    "src/diff/enrich.ts"() {
      "use strict";
      init_constants();
      init_utils();
    }
  });

  // src/ui/dialog.ts
  function getToolDocument() {
    return root?.ownerDocument || document;
  }
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

  // src/kintone-enums.ts
  var init_kintone_enums = __esm({
    "src/kintone-enums.ts"() {
      "use strict";
    }
  });

  // src/diff/label-dict.ts
  var init_label_dict = __esm({
    "src/diff/label-dict.ts"() {
      "use strict";
      init_kintone_enums();
    }
  });

  // src/diff/path-decoder.ts
  var init_path_decoder = __esm({
    "src/diff/path-decoder.ts"() {
      "use strict";
      init_label_dict();
      init_kintone_enums();
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

  // src/diff/export-safety.ts
  var init_export_safety = __esm({
    "src/diff/export-safety.ts"() {
      "use strict";
    }
  });

  // src/diff/export.ts
  var DIFF_HTML_REVIEW_STATE_MAX_BYTES;
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
      init_export_safety();
      DIFF_HTML_REVIEW_STATE_MAX_BYTES = 2 * 1024 * 1024;
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

  // src/diff/ignore-presets.ts
  var init_ignore_presets = __esm({
    "src/diff/ignore-presets.ts"() {
      "use strict";
      init_state();
    }
  });

  // src/reflect/nodeModeUi.ts
  var init_nodeModeUi = __esm({
    "src/reflect/nodeModeUi.ts"() {
      "use strict";
      init_state();
    }
  });

  // src/reflect/footerLabel.ts
  var init_footerLabel = __esm({
    "src/reflect/footerLabel.ts"() {
      "use strict";
    }
  });

  // src/reflect/applyHistorySummary.ts
  var APPLY_HISTORY_MODE_LABELS;
  var init_applyHistorySummary = __esm({
    "src/reflect/applyHistorySummary.ts"() {
      "use strict";
      APPLY_HISTORY_MODE_LABELS = Object.freeze({
        section: "まとめ反映",
        nodes: "差分選択",
        patch: "JSONパッチ",
        retry: "再反映",
        restore: "復元"
      });
    }
  });

  // src/oss_integrations.ts
  var init_oss_integrations = __esm({
    "src/oss_integrations.ts"() {
      "use strict";
      init_utils();
      init_dialog();
    }
  });

  // src/ui/components.ts
  function setComponentUi(uiRefs) {
    ui2 = uiRefs;
  }
  var ui2, SCOPE_PICKER_META;
  var init_components = __esm({
    "src/ui/components.ts"() {
      "use strict";
      init_constants();
      init_state();
      init_applyOutcome();
      init_utils();
      init_filter();
      init_ignore_presets();
      init_engine();
      init_enrich();
      init_nodeModeUi();
      init_footerLabel();
      init_applyHistorySummary();
      init_constants();
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

  // src/ui/psychology.ts
  var init_psychology = __esm({
    "src/ui/psychology.ts"() {
      "use strict";
      init_utils();
      init_dialog();
    }
  });

  // src/ui/appTargetTable.ts
  var init_appTargetTable = __esm({
    "src/ui/appTargetTable.ts"() {
      "use strict";
    }
  });

  // src/settingsBundleImport.ts
  var init_settingsBundleImport = __esm({
    "src/settingsBundleImport.ts"() {
      "use strict";
      init_api();
    }
  });

  // src/tabs/diff-standalone.ts
  var init_diff_standalone = __esm({
    "src/tabs/diff-standalone.ts"() {
      "use strict";
      init_api();
      init_settingsBundleImport();
      init_engine();
      init_enrich();
      init_utils();
      init_constants();
    }
  });

  // src/tabs/preview-compare.ts
  var init_preview_compare = __esm({
    "src/tabs/preview-compare.ts"() {
      "use strict";
    }
  });

  // src/tabs/diff.ts
  var init_diff = __esm({
    "src/tabs/diff.ts"() {
      "use strict";
      init_constants();
      init_state();
      init_psychology();
      init_appTargetTable();
      init_utils();
      init_api();
      init_settingsBundleImport();
      init_engine();
      init_enrich();
      init_diff_standalone();
      init_filter();
      init_export();
      init_export();
      init_components();
      init_dialog();
      init_preview_compare();
      init_nodeModeUi();
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

  // src/entries/er-lite-ui.ts
  init_constants();

  // src/tabs/er.ts
  init_constants();
  init_state();
  init_utils();
  init_api();
  init_components();
  init_dialog();
  init_diff();

  // src/tabs/er-analysis.ts
  var ER_HIGH_CONNECTION_THRESHOLD = 3;
  var idOf = (value) => String(value ?? "").trim();
  var appNameOf = (app, appId) => String(app?.name || `アプリ ${appId}`);
  var retrievalStatusOf = (app) => {
    const declared = idOf(app?.status).toLowerCase();
    if (app?.ok === false || declared === "failed") return "failed";
    if (declared === "partial" || Array.isArray(app?.issues) && app.issues.length > 0 || app?._fetchError) {
      return "partial";
    }
    return "complete";
  };
  var compareIds = (a, b) => a.localeCompare(b, "ja", { numeric: true });
  function analyzeErDependencies(rawApps) {
    const apps = (Array.isArray(rawApps) ? rawApps : []).filter((app) => idOf(app?.id));
    const appById = new Map(apps.map((app) => [idOf(app.id), app]));
    const adjacency = /* @__PURE__ */ new Map();
    const incoming = /* @__PURE__ */ new Map();
    const outgoing = /* @__PURE__ */ new Map();
    const seenEdges = /* @__PURE__ */ new Set();
    const unresolvedTargets = [];
    const selfReferences = [];
    let resolvedRelationCount = 0;
    for (const id of appById.keys()) adjacency.set(id, /* @__PURE__ */ new Set());
    for (const app of apps) {
      const fromId = idOf(app.id);
      for (const relation of Array.isArray(app?.relations) ? app.relations : []) {
        if (!relation || typeof relation !== "object") continue;
        const toId = idOf(relation.toApp);
        const kind = idOf(relation.kind) || "UNKNOWN";
        const field = idOf(
          relation.fromPath || relation.from || relation.fromLabel || relation.controlField || relation.sourceJoinField
        );
        if (!toId && kind === "UNKNOWN" && !field) continue;
        const edgeKey = `${fromId}\0${toId}\0${kind}\0${field}`;
        if (seenEdges.has(edgeKey)) continue;
        seenEdges.add(edgeKey);
        outgoing.set(fromId, (outgoing.get(fromId) || 0) + 1);
        if (!toId || !appById.has(toId)) {
          unresolvedTargets.push({
            fromAppId: fromId,
            fromAppName: appNameOf(app, fromId),
            toAppId: toId,
            kind,
            field,
            reason: toId ? "outside-diagram" : "missing-target"
          });
          continue;
        }
        resolvedRelationCount += 1;
        incoming.set(toId, (incoming.get(toId) || 0) + 1);
        adjacency.get(fromId)?.add(toId);
        if (fromId === toId) {
          selfReferences.push({
            appId: fromId,
            appName: appNameOf(app, fromId),
            kind,
            field
          });
        }
      }
    }
    let nextIndex = 0;
    const indexes = /* @__PURE__ */ new Map();
    const lowLinks = /* @__PURE__ */ new Map();
    const stack = [];
    const onStack = /* @__PURE__ */ new Set();
    const components = [];
    const visit = (id) => {
      indexes.set(id, nextIndex);
      lowLinks.set(id, nextIndex);
      nextIndex += 1;
      stack.push(id);
      onStack.add(id);
      for (const next of adjacency.get(id) || []) {
        if (!indexes.has(next)) {
          visit(next);
          lowLinks.set(id, Math.min(lowLinks.get(id), lowLinks.get(next)));
        } else if (onStack.has(next)) {
          lowLinks.set(id, Math.min(lowLinks.get(id), indexes.get(next)));
        }
      }
      if (lowLinks.get(id) !== indexes.get(id)) return;
      const component = [];
      let current = "";
      do {
        current = stack.pop();
        onStack.delete(current);
        component.push(current);
      } while (current !== id);
      components.push(component);
    };
    for (const id of appById.keys()) if (!indexes.has(id)) visit(id);
    const cycles = components.filter((ids) => ids.length > 1).map((ids) => {
      const appIds = ids.slice().sort(compareIds);
      return {
        appIds,
        appNames: appIds.map((id) => appNameOf(appById.get(id), id))
      };
    }).sort((a, b) => b.appIds.length - a.appIds.length || compareIds(a.appIds[0], b.appIds[0]));
    const cycleIds = new Set(cycles.flatMap((cycle) => cycle.appIds));
    const selfReferenceIds = new Set(selfReferences.map((relation) => relation.appId));
    const appStats = apps.map((app) => {
      const appId = idOf(app.id);
      const inCount = incoming.get(appId) || 0;
      const outCount = outgoing.get(appId) || 0;
      return {
        appId,
        name: appNameOf(app, appId),
        incoming: inCount,
        outgoing: outCount,
        total: inCount + outCount,
        isolated: inCount === 0 && outCount === 0,
        inCycle: cycleIds.has(appId),
        hasSelfReference: selfReferenceIds.has(appId),
        retrievalStatus: retrievalStatusOf(app)
      };
    }).sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, "ja"));
    const isolatedAppIds = appStats.filter((stat) => stat.isolated).map((stat) => stat.appId);
    const hubs = appStats.filter((stat) => stat.total >= ER_HIGH_CONNECTION_THRESHOLD).map(({ appId, name, incoming: inCount, outgoing: outCount, total }) => ({
      appId,
      name,
      incoming: inCount,
      outgoing: outCount,
      total
    }));
    const completeAppIds = appStats.filter((stat) => stat.retrievalStatus === "complete").map((stat) => stat.appId);
    const partialAppIds = appStats.filter((stat) => stat.retrievalStatus === "partial").map((stat) => stat.appId);
    const failedAppIds = appStats.filter((stat) => stat.retrievalStatus === "failed").map((stat) => stat.appId);
    return {
      appCount: apps.length,
      edgeCount: seenEdges.size,
      isolatedAppIds,
      unresolvedTargets,
      cycles,
      selfReferences,
      hubs,
      highConnectionThreshold: ER_HIGH_CONNECTION_THRESHOLD,
      appStats,
      completeAppIds,
      partialAppIds,
      failedAppIds,
      counts: {
        apps: apps.length,
        relations: seenEdges.size,
        resolvedRelations: resolvedRelationCount,
        unresolvedRelations: unresolvedTargets.length,
        cycleCandidates: cycles.length,
        selfReferences: selfReferences.length,
        appsWithNoRelations: isolatedAppIds.length,
        highConnectionApps: hubs.length,
        retrievalComplete: completeAppIds.length,
        retrievalPartial: partialAppIds.length,
        retrievalFailed: failedAppIds.length
      }
    };
  }

  // src/tabs/er-model.ts
  var SKIPPED_FIELD_TYPES = /* @__PURE__ */ new Set(["GROUP", "SPACER", "HR", "LABEL"]);
  function isRecord(value) {
    return !!value && typeof value === "object" && !Array.isArray(value);
  }
  function normalizeAppId(rawAppId) {
    const appId = Number(rawAppId);
    if (!Number.isFinite(appId) || appId <= 0) {
      throw new TypeError(`Invalid kintone app id: ${String(rawAppId)}`);
    }
    return appId;
  }
  function errorMessage(error, fallback) {
    if (error instanceof Error && error.message) return error.message;
    if (isRecord(error) && typeof error.message === "string" && error.message) return error.message;
    if (typeof error === "string" && error) return error;
    return fallback;
  }
  function fallbackAppName(appId) {
    return `アプリ ${appId}`;
  }
  function readAppName(response, appId) {
    return isRecord(response) && typeof response.name === "string" && response.name.trim() ? response.name : fallbackAppName(appId);
  }
  function hasOwn(record, key) {
    return Object.prototype.hasOwnProperty.call(record, key);
  }
  function positiveAppId(value) {
    const id = Number(value);
    return Number.isFinite(id) && id > 0 ? id : null;
  }
  var ErFieldsUnavailableError = class extends Error {
    constructor(appId, error) {
      super(errorMessage(error, `アプリ ${appId} のフィールド設定を取得できません`));
      __publicField(this, "appId");
      __publicField(this, "originalError");
      this.name = "ErFieldsUnavailableError";
      this.appId = appId;
      this.originalError = error;
    }
  };
  function fieldIssue(scope, code, message, fieldCode, fieldPath) {
    return { scope, code, message, fieldCode, fieldPath };
  }
  function buildErAppModel(input) {
    const appId = normalizeAppId(input.appId);
    const fieldResponse = input.fieldsResponse;
    if (!isRecord(fieldResponse) || !isRecord(fieldResponse.properties)) {
      throw new ErFieldsUnavailableError(appId, isRecord(fieldResponse) ? fieldResponse._fetchError : fieldResponse);
    }
    const issues = [];
    const appInfo = isRecord(input.appInfoResponse) ? input.appInfoResponse : null;
    const appInfoFetchError = input.appInfoError ?? appInfo?._fetchError;
    if (appInfoFetchError !== void 0 && appInfoFetchError !== null) {
      issues.push({
        scope: "metadata",
        code: "metadata_fetch_failed",
        message: errorMessage(appInfoFetchError, `アプリ ${appId} のメタデータを取得できません`)
      });
    } else if (!appInfo || typeof appInfo.name !== "string" || !appInfo.name.trim()) {
      issues.push({
        scope: "metadata",
        code: "metadata_response_invalid",
        message: `アプリ ${appId} のメタデータ応答が不完全です`
      });
    }
    const fields = [];
    const relations = [];
    const walk = (properties, parentTable = "", parentTableLabel = "") => {
      for (const [propertyKey, rawField] of Object.entries(properties)) {
        if (!isRecord(rawField)) continue;
        const type = typeof rawField.type === "string" ? rawField.type : "";
        if (SKIPPED_FIELD_TYPES.has(type)) continue;
        const code = typeof rawField.code === "string" && rawField.code ? rawField.code : propertyKey;
        const label = typeof rawField.label === "string" && rawField.label ? rawField.label : code;
        const path = parentTable ? `${parentTable}.${code}` : code;
        const displayPath = parentTableLabel ? `${parentTableLabel} > ${label}` : label;
        if (type === "SUBTABLE") {
          fields.push({
            code,
            label,
            type,
            required: false,
            unique: false,
            isPK: false,
            isLookup: false,
            isRef: false,
            sub: true,
            inSubtable: !!parentTable,
            tableCode: parentTable,
            tableLabel: parentTableLabel,
            path,
            displayPath
          });
          if (isRecord(rawField.fields)) {
            walk(rawField.fields, code, label);
          } else {
            issues.push({
              scope: "fields",
              code: "subtable_fields_invalid",
              message: `サブテーブル「${label}」の内部フィールドを読み取れません`,
              fieldCode: code,
              fieldPath: path
            });
          }
          continue;
        }
        const lookupWasNull = hasOwn(rawField, "lookup") && rawField.lookup === null;
        const hasLookup = isRecord(rawField.lookup);
        const isReferenceTable = type === "REFERENCE_TABLE";
        fields.push({
          code,
          label,
          type,
          required: !!rawField.required,
          unique: !!rawField.unique,
          // コード名は利用者が変更・再利用できるため、標準のレコード番号型だけを主キー扱いする。
          isPK: type === "RECORD_NUMBER",
          isLookup: hasLookup,
          isRef: isReferenceTable,
          inSubtable: !!parentTable,
          tableCode: parentTable,
          tableLabel: parentTableLabel,
          path,
          displayPath
        });
        if (lookupWasNull) {
          issues.push(fieldIssue(
            "lookup",
            "lookup_null",
            `フィールド「${label}」のルックアップ設定が null です`,
            code,
            path
          ));
        }
        if (hasLookup) {
          const targetAppId = positiveAppId(rawField.lookup.relatedApp?.app);
          const toField = typeof rawField.lookup.relatedKeyField === "string" ? rawField.lookup.relatedKeyField : "";
          if (targetAppId) {
            relations.push({
              from: code,
              fromPath: path,
              fromLabel: label,
              fromDisplay: displayPath,
              fromTableCode: parentTable,
              fromTableLabel: parentTableLabel,
              toApp: targetAppId,
              toField,
              kind: "LOOKUP"
            });
            if (!toField) {
              issues.push(fieldIssue(
                "lookup",
                "lookup_related_key_missing",
                `フィールド「${label}」のルックアップ先キーが不明です`,
                code,
                path
              ));
            }
          } else {
            issues.push(fieldIssue(
              "lookup",
              "lookup_related_app_missing",
              `フィールド「${label}」のルックアップ先アプリが不明です`,
              code,
              path
            ));
          }
        }
        if (isReferenceTable) {
          if (rawField.referenceTable === null || !isRecord(rawField.referenceTable)) {
            issues.push(fieldIssue(
              "referenceTable",
              "reference_table_null",
              `関連レコード一覧「${label}」の設定が null または不正です`,
              code,
              path
            ));
            continue;
          }
          const referenceTable = rawField.referenceTable;
          const targetAppId = positiveAppId(referenceTable.relatedApp?.app);
          const condition = isRecord(referenceTable.condition) ? referenceTable.condition : null;
          const sourceJoinField = condition && typeof condition.field === "string" ? condition.field : "";
          const toField = condition && typeof condition.relatedField === "string" ? condition.relatedField : "";
          if (targetAppId && sourceJoinField) {
            relations.push({
              // kintone 公式仕様: condition.field が元アプリの結合フィールド。
              from: sourceJoinField,
              fromPath: sourceJoinField,
              fromLabel: sourceJoinField,
              fromDisplay: sourceJoinField,
              fromTableCode: "",
              fromTableLabel: "",
              toApp: targetAppId,
              toField,
              kind: "REF",
              // 表示部品の code は結合元と混同しないよう別で保持する。
              controlField: code,
              controlFieldPath: path,
              controlFieldLabel: label,
              sourceJoinField
            });
            if (!toField) {
              issues.push(fieldIssue(
                "referenceTable",
                "reference_table_related_field_missing",
                `関連レコード一覧「${label}」の参照先結合フィールドが不明です`,
                code,
                path
              ));
            }
          } else {
            issues.push(fieldIssue(
              "referenceTable",
              "reference_table_condition_invalid",
              `関連レコード一覧「${label}」の参照先アプリまたは結合条件が不明です`,
              code,
              path
            ));
          }
        }
      }
    };
    walk(fieldResponse.properties);
    const fieldsByCode = /* @__PURE__ */ new Map();
    for (const field of fields) {
      if (!fieldsByCode.has(field.code)) fieldsByCode.set(field.code, field);
      fieldsByCode.set(field.path, field);
    }
    for (const relation of relations) {
      if (relation.kind !== "REF" || !relation.sourceJoinField) continue;
      const source = fieldsByCode.get(relation.sourceJoinField);
      if (!source) continue;
      relation.fromPath = source.path;
      relation.fromLabel = source.label;
      relation.fromDisplay = source.displayPath;
      relation.fromTableCode = source.tableCode;
      relation.fromTableLabel = source.tableLabel;
    }
    const actionResponse = isRecord(input.actionsResponse) ? input.actionsResponse : null;
    const actionFetchError = input.actionsError ?? actionResponse?._fetchError;
    if (actionFetchError !== void 0 && actionFetchError !== null) {
      issues.push({
        scope: "actions",
        code: "actions_fetch_failed",
        message: errorMessage(actionFetchError, `アプリ ${appId} のアプリアクションを取得できません`)
      });
    } else if (!actionResponse || !isRecord(actionResponse.actions)) {
      issues.push({
        scope: "actions",
        code: "actions_response_invalid",
        message: `アプリ ${appId} のアプリアクション応答が不完全です`
      });
    } else {
      Object.entries(actionResponse.actions).forEach(([actionName, rawAction], index) => {
        if (!isRecord(rawAction)) return;
        const targetAppId = positiveAppId(rawAction.destApp?.app ?? rawAction.app?.app);
        if (!targetAppId) {
          issues.push({
            scope: "actions",
            code: "action_destination_invalid",
            message: `アプリアクション「${actionName}」の移動先アプリが不明です`
          });
          return;
        }
        const name = typeof rawAction.name === "string" && rawAction.name ? rawAction.name : actionName;
        relations.push({
          from: `__ACTION__${index}`,
          fromLabel: name || `アクション${index + 1}`,
          toApp: targetAppId,
          toField: "",
          kind: "ACTION"
        });
      });
    }
    const lookupCount = relations.filter((relation) => relation.kind === "LOOKUP").length;
    const refCount = relations.filter((relation) => relation.kind === "REF").length;
    const actionCount = relations.filter((relation) => relation.kind === "ACTION").length;
    const appName = readAppName(appInfo, appId);
    const allFields = fields.slice();
    return {
      id: appId,
      name: appName,
      spaceId: appInfo?.spaceId ?? null,
      threadId: appInfo?.threadId ?? null,
      fields: allFields.slice(),
      allFields,
      totalFieldCount: allFields.filter((field) => field.type !== "SUBTABLE").length,
      relations,
      status: issues.length ? "partial" : "complete",
      issues,
      ok: true,
      createdAt: typeof appInfo?.createdAt === "string" ? appInfo.createdAt : void 0,
      modifiedAt: typeof appInfo?.modifiedAt === "string" ? appInfo.modifiedAt : void 0,
      requiredCount: allFields.filter((field) => field.type !== "SUBTABLE" && field.required).length,
      lookupCount,
      refCount,
      actionCount,
      relationCount: relations.length,
      sourceGuestId: input.sourceGuestId == null ? "" : String(input.sourceGuestId)
    };
  }
  function buildFailedErAppModel(rawAppId, error, context = {}) {
    const appId = normalizeAppId(rawAppId);
    const appInfo = isRecord(context.appInfoResponse) ? context.appInfoResponse : null;
    const message = errorMessage(error, `アプリ ${appId} のフィールド設定を取得できません`);
    return {
      id: appId,
      name: readAppName(appInfo, appId),
      spaceId: appInfo?.spaceId ?? null,
      threadId: appInfo?.threadId ?? null,
      fields: [],
      allFields: [],
      totalFieldCount: 0,
      relations: [],
      status: "failed",
      issues: [{ scope: "fields", code: "fields_fetch_failed", message }],
      ok: false,
      createdAt: typeof appInfo?.createdAt === "string" ? appInfo.createdAt : void 0,
      modifiedAt: typeof appInfo?.modifiedAt === "string" ? appInfo.modifiedAt : void 0,
      requiredCount: 0,
      lookupCount: 0,
      refCount: 0,
      actionCount: 0,
      relationCount: 0,
      sourceGuestId: context.sourceGuestId == null ? "" : String(context.sourceGuestId)
    };
  }

  // src/tabs/er.ts
  var ER_DEFAULTS = {
    maxFields: 220,
    sleepMs: 80,
    layoutName: "dagre",
    fieldDensity: "standard",
    maxDepth: 0,
    includeSubtableFields: true,
    includeReverseLookup: false
  };
  var ER_TRAVERSE_RELATION_KINDS = /* @__PURE__ */ new Set(["LOOKUP", "REF", "ACTION"]);
  function buildScriptTag(src, fallbackSrc = "", integrity = "", fallbackIntegrity = "") {
    const safeSrc = esc(src || "");
    const safeFallback = esc(fallbackSrc || "");
    const safeIntegrity = esc(integrity || "");
    const safeFallbackIntegrity = esc(fallbackIntegrity || "");
    const integrityAttr = safeIntegrity ? ` integrity="${safeIntegrity}" crossorigin="anonymous"` : "";
    const fallback = safeFallback ? ` onerror="this.onerror=null;this.integrity='${safeFallbackIntegrity}';this.crossOrigin='anonymous';this.src='${safeFallback}'"` : "";
    return `<script src="${safeSrc}"${integrityAttr}${fallback}><\/script>`;
  }
  function formatErLayoutLabel(layoutName) {
    const map = {
      dagre: "Dagre",
      breadthfirst: "ツリー",
      cose: "フォース",
      concentric: "同心円",
      grid: "グリッド",
      circle: "円形"
    };
    return map[layoutName] || layoutName || "-";
  }
  function summarizeErStartIds(ids, maxShown = 5) {
    const list = (Array.isArray(ids) ? ids : []).map((v) => String(v)).filter(Boolean);
    if (!list.length) return "-";
    if (list.length <= maxShown) return list.join(", ");
    return `${list.slice(0, maxShown).join(", ")} 他${list.length - maxShown}件 (計${list.length})`;
  }
  var progressUi = /* @__PURE__ */ (() => {
    let el, bar, msg;
    const removeEl = () => {
      if (el && el.parentNode) el.parentNode.removeChild(el);
      el = null;
      bar = null;
      msg = null;
    };
    return {
      init() {
        removeEl();
        const doc = (() => {
          try {
            return getToolDocument();
          } catch (_) {
            return document;
          }
        })();
        el = doc.createElement("div");
        Object.assign(el.style, {
          position: "fixed",
          top: "20px",
          right: "20px",
          width: "320px",
          padding: "16px",
          background: "rgba(10,10,18,0.94)",
          color: "#fff",
          borderRadius: "12px",
          zIndex: "999999",
          fontFamily: "sans-serif",
          boxShadow: "0 8px 32px rgba(0,0,0,0.5)"
        });
        el.innerHTML = `
      <div style="font-weight:700;margin-bottom:10px;font-size:14px;">📊 ER図を生成中...</div>
      <div style="background:#333;height:8px;border-radius:4px;overflow:hidden;">
        <div id="_eb" style="width:0%;height:100%;background:linear-gradient(90deg,#00d4ff,#7b61ff);transition:width .3s;border-radius:4px;"></div>
      </div>
      <div id="_em" style="font-size:12px;margin-top:8px;color:#aaa;">準備中...</div>`;
        (doc.body || doc.documentElement).appendChild(el);
        bar = el.querySelector("#_eb");
        msg = el.querySelector("#_em");
        if (bar) bar.style.background = "linear-gradient(90deg,#00d4ff,#7b61ff)";
      },
      update(p, t) {
        if (bar) bar.style.width = p + "%";
        if (msg) msg.textContent = t;
      },
      close() {
        if (!el) return;
        this.update(100, "完了！");
        const target = el;
        setTimeout(() => {
          if (target) target.style.opacity = "0";
          setTimeout(() => {
            if (target && target.parentNode) target.parentNode.removeChild(target);
            if (el === target) {
              el = null;
              bar = null;
              msg = null;
            }
          }, 600);
        }, 2e3);
      },
      error(e) {
        if (!el) return;
        this.update(100, "エラー: " + e);
        if (bar) bar.style.background = "#f44";
        const target = el;
        setTimeout(() => {
          if (target && target.parentNode) target.parentNode.removeChild(target);
          if (el === target) {
            el = null;
            bar = null;
            msg = null;
          }
        }, 6e3);
      },
      dismiss() {
        removeEl();
      }
    };
  })();
  var sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  var fetchAllApps = async (options) => {
    const prefix = buildApiPrefix(options?.source?.guestId, false);
    const apps = [];
    const limit = 100;
    for (let offset = 0; ; offset += limit) {
      const resp = await apiGet(prefix, "/apps.json", { limit, offset });
      const chunk = Array.isArray(resp?.apps) ? resp.apps : [];
      apps.push(...chunk);
      if (chunk.length < limit) break;
    }
    return apps;
  };
  var getSchema = async (rawAppId, options, cache) => {
    const appId = Number(rawAppId);
    if (cache.has(appId)) return cache.get(appId);
    const prefix = buildApiPrefix(options?.source?.guestId, !!options?.source?.preview);
    const appInfoPrefix = buildApiPrefix(options?.source?.guestId, false);
    const [fieldsResult, appInfoResult, actionsResult] = await Promise.allSettled([
      apiGet(prefix, "/app/form/fields.json", { app: appId }),
      apiGet(appInfoPrefix, "/app.json", { id: appId }),
      apiGet(prefix, "/app/actions.json", { app: appId })
    ]);
    const appInfoResponse = appInfoResult.status === "fulfilled" ? appInfoResult.value : void 0;
    let model;
    if (fieldsResult.status === "rejected") {
      console.error(`App ${appId}:`, fieldsResult.reason);
      model = buildFailedErAppModel(appId, fieldsResult.reason, {
        appInfoResponse,
        sourceGuestId: options?.source?.guestId || ""
      });
    } else {
      model = buildErAppModel({
        appId,
        fieldsResponse: fieldsResult.value,
        appInfoResponse,
        actionsResponse: actionsResult.status === "fulfilled" ? actionsResult.value : void 0,
        appInfoError: appInfoResult.status === "rejected" ? appInfoResult.reason : void 0,
        actionsError: actionsResult.status === "rejected" ? actionsResult.reason : void 0,
        sourceGuestId: options?.source?.guestId || ""
      });
    }
    cache.set(appId, model);
    return model;
  };
  var crawl = async (startIds, options) => {
    const cache = /* @__PURE__ */ new Map();
    const visited = /* @__PURE__ */ new Set();
    let reverseLookupIndex = null;
    const enqueueIfNeeded = (queue, appId, depth) => {
      if (!Number.isFinite(appId) || appId <= 0) return;
      if (visited.has(appId) || queue.some((item) => item.id === appId)) return;
      queue.push({ id: appId, depth });
    };
    const seeds = [...new Set((Array.isArray(startIds) ? startIds : [startIds]).map((v) => Number(v)).filter((v) => Number.isFinite(v) && v > 0))];
    const q = seeds.map((id) => ({ id, depth: 0 }));
    const apps = [];
    if (options?.includeReverseLookup) {
      progressUi.update(3, "逆引き探索用に全アプリを走査中...");
      const allApps = await fetchAllApps(options);
      reverseLookupIndex = /* @__PURE__ */ new Map();
      for (let i = 0; i < allApps.length; i += 1) {
        const appId = Number(allApps[i]?.appId);
        if (!appId) continue;
        const schema = await getSchema(appId, options, cache);
        for (const rel of schema.relations || []) {
          if (!ER_TRAVERSE_RELATION_KINDS.has(rel.kind)) continue;
          const targetId = Number(rel.toApp);
          if (!targetId) continue;
          const set = reverseLookupIndex.get(targetId) || /* @__PURE__ */ new Set();
          set.add(appId);
          reverseLookupIndex.set(targetId, set);
        }
        if (i % 20 === 0) progressUi.update(3 + Math.min(20, Math.floor(i / Math.max(1, allApps.length) * 20)), `逆引き探索インデックス作成中... ${i + 1}/${allApps.length}`);
        if (i % 25 === 0) await sleep(Math.max(10, Math.floor((options.sleepMs || ER_DEFAULTS.sleepMs) / 2)));
      }
    }
    while (q.length) {
      const current = q.shift();
      const id = current?.id;
      const depth = current?.depth || 0;
      if (visited.has(id)) continue;
      visited.add(id);
      const a = await getSchema(id, options, cache);
      a.depth = depth;
      apps.push(a);
      progressUi.update(Math.min(90, apps.length / Math.max(1, apps.length + q.length) * 100 | 0), `解析: ${a.name} / 深さ ${depth}`);
      if (options?.maxDepth > 0 && depth >= options.maxDepth) {
        await sleep(options.sleepMs || ER_DEFAULTS.sleepMs);
        continue;
      }
      for (const r of a.relations) {
        if (!ER_TRAVERSE_RELATION_KINDS.has(r.kind)) continue;
        enqueueIfNeeded(q, Number(r.toApp), depth + 1);
      }
      if (reverseLookupIndex && reverseLookupIndex.has(id)) {
        const reverseRefs = Array.from(reverseLookupIndex.get(id));
        for (const srcId of reverseRefs) {
          enqueueIfNeeded(q, Number(srcId), depth + 1);
        }
      }
      await sleep(options.sleepMs || ER_DEFAULTS.sleepMs);
    }
    return apps;
  };
  var buildHTML = (apps, options = {}) => {
    const safeApps = Array.isArray(apps) ? apps : [];
    const serializedApps = safeApps.map((app) => {
      if (!app || !Array.isArray(app.allFields)) return app;
      const { fields: _legacyDensityFields, ...rest } = app;
      return rest;
    });
    const data = safeJsonForScript(serializedApps);
    const diagramOptions = safeJsonForScript({
      startAppId: options.startAppId || "",
      startAppIds: Array.isArray(options.startAppIds) ? options.startAppIds : [options.startAppId || ""],
      layoutName: options.layoutName || ER_DEFAULTS.layoutName,
      fieldDensity: options.fieldDensity || ER_DEFAULTS.fieldDensity,
      maxFields: Number(options.maxFields) || ER_DEFAULTS.maxFields,
      maxDepth: options.maxDepth || 0,
      includeSubtableFields: !!options.includeSubtableFields,
      includeReverseLookup: !!options.includeReverseLookup,
      spaceId: options.spaceId || "",
      spaceAppIds: Array.isArray(options.spaceAppIds) ? options.spaceAppIds.map((v) => String(v)) : [],
      sourceGuestId: options.source?.guestId || "",
      sourcePreview: !!options.source?.preview
    });
    const dependencyAnalysis = analyzeErDependencies(safeApps);
    const dependencyAnalysisData = safeJsonForScript(dependencyAnalysis);
    const densityLabelMap = { none: "結合のみ", compact: "コンパクト", standard: "標準", full: "詳細" };
    const summary = safeApps.reduce((acc, app) => {
      acc.relations += Array.isArray(app?.relations) ? app.relations.length : 0;
      acc.lookups += Number(app?.lookupCount || 0);
      acc.refs += Number(app?.refCount || 0);
      acc.actions += (app?.relations || []).filter((rel) => rel?.kind === "ACTION").length;
      acc.required += Number(app?.requiredCount || 0);
      return acc;
    }, { relations: 0, lookups: 0, refs: 0, actions: 0, required: 0 });
    const startAppIdList = (Array.isArray(options.startAppIds) ? options.startAppIds : [options.startAppId || ""]).map((v) => String(v)).filter(Boolean);
    const startAppText = summarizeErStartIds(startAppIdList);
    const startAppFullText = startAppIdList.join(", ");
    const erSpaceId = String(options.spaceId || "");
    const spaceAppIdSet = new Set((Array.isArray(options.spaceAppIds) ? options.spaceAppIds : []).map((v) => String(v)));
    const spaceAppCount = erSpaceId ? safeApps.filter((app) => spaceAppIdSet.has(String(app?.id)) || String(app?.spaceId || "") === erSpaceId).length : 0;
    const spacePill = erSpaceId ? `<span class="meta-pill" title="このスペースに属するアプリは二重枠で表示されます"><b>スペース</b> #${esc(erSpaceId)} (${esc(String(spaceAppCount))}アプリ)</span>` : "";
    const densityLabel = densityLabelMap[options.fieldDensity || ER_DEFAULTS.fieldDensity] || String(options.fieldDensity || ER_DEFAULTS.fieldDensity || "-");
    const cytoscapeScript = buildScriptTag(
      EXTERNAL_LIBRARIES.cytoscape.cdnUrl,
      EXTERNAL_LIBRARIES.cytoscape.altCdnUrl,
      "sha384-J7Q85oZE4GJ/e7+n2aOQsLXfDwwfnA8S2nZAL5BpFsfpCF84zQD7LroZ/dMnLgex",
      "sha384-+4PsOx8pfCvP2QccNj+4PHhCkQFmbi69UlEi43BHbHopL1unxFMpqiPXNscfoiM5"
    );
    const dagreScript = buildScriptTag(
      EXTERNAL_LIBRARIES.dagre.cdnUrl,
      "",
      "sha384-2IH3T69EIKYC4c+RXZifZRvaH5SRUdacJW7j6HtE5rQbvLhKKdawxq6vpIzJ7j9M"
    );
    const cytoscapeDagreScript = buildScriptTag(
      EXTERNAL_LIBRARIES.cytoscapeDagre.cdnUrl,
      EXTERNAL_LIBRARIES.cytoscapeDagre.altCdnUrl,
      "sha384-EHCdyFVbhtbpgI+4x7ETlZUvJwOkxJublmhTpH114NSk3fqfiUgcLl6pQm8JQwg9",
      "sha384-u69h9ebXeSjlg6q/rb1zKTRAGu/h8deCl0409xpS/QJctMKnc4M9Fzkm01VOQdeF"
    );
    const runtimeFallbackRows = safeApps.map((app) => `<tr><td>${esc(String(app?.id || "-"))}</td><td>${esc(String(app?.name || `アプリ ${app?.id || "-"}`))}</td><td>${esc(String(app?.totalFieldCount ?? app?.allFields?.length ?? app?.fields?.length ?? 0))}</td><td>${esc(String(app?.relations?.length || 0))}</td><td>${esc(app?.status === "partial" ? "一部取得" : app?.ok === false ? "取得失敗" : "取得完了")}</td></tr>`).join("");
    return (
      /*html*/
      `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline' https://cdnjs.cloudflare.com https://cdn.jsdelivr.net; style-src 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src data: blob:; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-src 'none'">
<title>kintone ER図 v3</title>
${cytoscapeScript}
${dagreScript}
${cytoscapeDagreScript}
<style>
@import url('${EXTERNAL_LIBRARIES.googleFontsDmSansMono.cdnUrl}');

*{margin:0;padding:0;box-sizing:border-box;}

:root{
  --bg:#08090d;--surface:#11131a;--surface2:#181c27;--border:#262d3d;
  --text:#d8dee9;--dim:#636e83;--accent:#5eead4;--accent2:#818cf8;
  --lookup:#60a5fa;--ref:#34d399;--pk:#fbbf24;--req:#f87171;--action:#f59e0b;
  --radius:10px;
  --topbar-h:52px;
  --bottom-safe:16px;
  --pathfinder-lift:0px;
  --legend-stack-height:50px;
  --shadow-sm:0 2px 6px rgba(0,0,0,0.18);
  --shadow-md:0 10px 28px rgba(0,0,0,0.28);
}
[data-theme="light"]{
  --bg:#f0f2f5;--surface:#ffffff;--surface2:#f7f8fa;--border:#d8dce6;
  --text:#1a1c23;--dim:#6b7280;--accent:#0d9488;--accent2:#6366f1;
  --lookup:#2563eb;--ref:#059669;--pk:#d97706;--req:#dc2626;--action:#d97706;
  --shadow-sm:0 1px 3px rgba(15,23,42,0.08);
  --shadow-md:0 12px 28px rgba(15,23,42,0.14);
}

body{font-family:'DM Sans',sans-serif;background:
  radial-gradient(circle at top left, rgba(94,234,212,0.08), transparent 28%),
  radial-gradient(circle at top right, rgba(129,140,248,0.08), transparent 26%),
  var(--bg);
  color:var(--text);overflow:hidden;height:100vh;}

/* ── Command Palette ── */
#cmd-overlay{display:none;position:fixed;inset:0;z-index:500;background:rgba(0,0,0,0.55);backdrop-filter:blur(6px);justify-content:center;align-items:flex-start;padding-top:12vh;}
#cmd-overlay.open{display:flex;}
#cmd-box{width:min(540px,92vw);background:var(--surface);border:1px solid var(--border);border-radius:14px;overflow:hidden;box-shadow:var(--shadow-md);}
#cmd-input{width:100%;padding:16px 20px;border:none;background:transparent;color:var(--text);font-size:15px;font-family:inherit;outline:none;border-bottom:1px solid var(--border);}
#cmd-input::placeholder{color:var(--dim);}
#cmd-results{max-height:min(340px,60vh);overflow-y:auto;}
.cmd-item{width:100%;padding:10px 20px;cursor:pointer;display:flex;align-items:center;gap:10px;font-size:13px;border:0;border-bottom:1px solid var(--border);background:transparent;color:var(--text);font:inherit;text-align:left;}
.cmd-item:hover,.cmd-item.active{background:var(--surface2);}
.cmd-item .kbd{margin-left:auto;font-size:10px;padding:2px 7px;background:var(--surface2);border:1px solid var(--border);border-radius:4px;font-family:'DM Mono',monospace;color:var(--dim);}

/* ── Top Bar ── */
#topbar{
  position:fixed;top:0;left:0;right:0;z-index:100;
  display:flex;align-items:center;gap:6px;padding:8px 14px;
  min-height:var(--topbar-h);
  background:linear-gradient(180deg,var(--bg) 82%,rgba(8,9,13,0.92));
  backdrop-filter:blur(12px);
  border-bottom:1px solid var(--border);
  flex-wrap:wrap;overflow:visible;white-space:normal;
}
#topbar::-webkit-scrollbar{display:none;}
#topbar h1{font-size:14px;font-weight:700;margin-right:6px;white-space:nowrap;
  background:linear-gradient(135deg,var(--accent),var(--accent2));-webkit-background-clip:text;-webkit-text-fill-color:transparent;}
.tb{padding:6px 12px;border:1px solid var(--border);border-radius:var(--radius);background:var(--surface);color:var(--text);font-size:11px;cursor:pointer;transition:.15s;font-family:inherit;white-space:nowrap;flex:0 0 auto;display:inline-flex;align-items:center;gap:4px;min-height:30px;}
.tb:hover{border-color:var(--accent);color:var(--accent);}
.tb.active{background:var(--accent);color:#000;border-color:var(--accent);font-weight:600;}
.tb-icon{padding:6px 9px;font-size:13px;}
.tb-group{display:inline-flex;align-items:center;gap:4px;padding:2px 4px;border:1px solid var(--border);border-radius:var(--radius);background:var(--surface2);flex-wrap:nowrap;}
.tb-group .tb{border:1px solid transparent;background:transparent;padding:4px 8px;}
.tb-group .tb:hover{background:var(--surface);border-color:var(--border);color:var(--accent);}
.tb-group .tb.active{background:var(--accent);color:#000;border-color:var(--accent);}
.tb-group-label{font-size:10px;color:var(--dim);padding:0 4px;font-weight:600;letter-spacing:0.02em;}
.meta-pill{display:inline-flex;align-items:center;gap:4px;padding:4px 10px;border:1px solid var(--border);border-radius:999px;background:var(--surface2);font-size:10px;color:var(--dim);max-width:100%;overflow:hidden;}
.meta-pill b{color:var(--text);font-weight:700;}
.meta-pill .pill-val{max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
#topbar select.tb-select{padding:5px 8px;border:1px solid var(--border);border-radius:var(--radius);background:var(--surface2);color:var(--text);font-size:11px;font-family:inherit;outline:none;flex:0 0 auto;min-height:30px;}
#topbar select.tb-select:focus{border-color:var(--accent);}
.sep{width:1px;height:20px;background:var(--border);margin:0 4px;}
#search-box{padding:6px 10px;border:1px solid var(--border);border-radius:var(--radius);background:var(--surface2);color:var(--text);font-size:11px;width:200px;font-family:inherit;outline:none;min-height:30px;}
#search-box:focus{border-color:var(--accent);}
#search-box::placeholder{color:var(--dim);}
#search-meta{min-width:84px;justify-content:center;}
.spacer{flex:1 1 16px;}

/* ── Dropdown menu ── */
.tb-menu{position:relative;}
.tb-menu > .tb-menu-btn::after{content:"▾";margin-left:4px;font-size:9px;opacity:0.7;}
.tb-menu-panel{display:none;position:absolute;top:calc(100% + 6px);right:0;min-width:200px;max-height:min(70vh,480px);overflow-y:auto;background:var(--surface);border:1px solid var(--border);border-radius:12px;box-shadow:var(--shadow-md);padding:6px;z-index:120;}
.tb-menu.open .tb-menu-panel{display:flex;flex-direction:column;gap:2px;}
.tb-menu-panel .tb{background:transparent;border:1px solid transparent;justify-content:flex-start;width:100%;padding:7px 10px;font-size:12px;}
.tb-menu-panel .tb:hover{background:var(--surface2);border-color:var(--border);}
.tb-menu-panel hr{border:none;border-top:1px solid var(--border);margin:4px 2px;}

/* mobile menu button (hidden on desktop) */
#mobile-menu-btn{display:none;}

@media (max-width: 1280px){
  #topbar{padding:6px 10px;row-gap:6px;}
  #topbar .sep{display:none;}
  #search-box{width:min(220px,100%);flex:1 1 200px;}
  #search-meta{min-width:0;}
  .tb-group-label{display:none;}
}
@media (max-width: 900px){
  #topbar{padding:6px 8px;gap:4px;}
  #topbar h1{font-size:12px;margin-right:2px;}
  #mobile-menu-btn{display:inline-flex;}
  #topbar > .meta-group,
  #topbar > .tb-group[data-group="view"],
  #topbar > .tb-group[data-group="layout"],
  #topbar > .tb-group[data-group="focus"],
  #topbar > .tb-group[data-group="edit"],
  #topbar > #density-select,
  #topbar > #overview-toggle-btn,
  #topbar > .tb[data-mobile="hide"],
  #topbar > .tb-menu[data-mobile="hide"]{display:none;}
  #topbar.mobile-open > .meta-group,
  #topbar.mobile-open > .tb-group,
  #topbar.mobile-open > #density-select,
  #topbar.mobile-open > #overview-toggle-btn,
  #topbar.mobile-open > .tb[data-mobile="hide"],
  #topbar.mobile-open > .tb-menu[data-mobile="hide"]{display:inline-flex;}
  #topbar.mobile-open{padding-bottom:10px;}
  #search-box{flex:1 1 120px;width:100%;}
  #overview{top:calc(var(--topbar-h, 52px) + 58px);width:calc(100vw - 24px);left:12px;}
  .ov-grid{grid-template-columns:repeat(2,minmax(0,1fr));}
  #detail{width:min(96vw,420px);top:calc(var(--topbar-h, 52px) + 6px);}
  #analysis-panel{width:min(380px,94vw);top:calc(var(--topbar-h, 52px) + 6px);}
  #banner{top:calc(var(--topbar-h, 52px) + 6px);}
  #sidebar{top:calc(var(--topbar-h, 52px) + 2px);width:min(300px,92vw);}
  #legend{font-size:9px;padding:6px 10px;gap:8px;flex-wrap:wrap;max-width:calc(100vw - 92px);}
  .tb-menu-panel{position:fixed;left:8px;right:8px;top:var(--topbar-h,52px);max-height:calc(100vh - var(--topbar-h,52px) - 16px);}
}
@media (max-width: 640px){
  :root{--bottom-safe:8px;}
  #detail{width:100vw;right:0;top:0;max-height:100vh;border-radius:0;}
  #detail.open{top:0;}
  #analysis-panel{width:100vw;right:0;top:0;max-height:100vh;border-radius:0;}
  #sidebar{width:100vw;top:0;padding-top:22px;}
  #overview{top:calc(var(--topbar-h, 52px) + 40px);}
  .ov-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:6px;}
  .ov-card{padding:8px;min-height:58px;}
  .ov-kpi{font-size:16px;}
  #legend{bottom:8px;right:8px;font-size:9px;padding:5px 8px;gap:6px;max-width:calc(100vw - 16px);}
  #minimap{display:none !important;}
  #pathfinder{left:8px;right:8px;transform:none;padding:8px 10px;flex-wrap:wrap;}
  #path-result{max-width:100%;white-space:normal;}
  #toast{bottom:80px;font-size:11px;padding:7px 14px;}
  #banner{top:calc(var(--topbar-h, 52px) + 4px);left:8px;max-width:calc(100vw - 16px);}
  .meta-pill{font-size:9px;padding:3px 7px;}
  #zoom-ctrl{bottom:calc(var(--bottom-safe) + var(--pathfinder-lift) + var(--legend-stack-height));right:8px;}
  #fab-mobile{display:flex;}
}

/* Floating action button for mobile */
#fab-mobile{display:none;position:fixed;bottom:16px;left:16px;z-index:110;flex-direction:column;gap:8px;}
#fab-mobile button{width:44px;height:44px;border-radius:50%;border:1px solid var(--border);background:var(--surface);color:var(--text);font-size:16px;cursor:pointer;box-shadow:var(--shadow-md);}
#fab-mobile button:hover{color:var(--accent);border-color:var(--accent);}

/* ── Zoom controls ── */
#zoom-ctrl{position:fixed;bottom:calc(var(--bottom-safe) + var(--pathfinder-lift) + var(--legend-stack-height));right:16px;z-index:105;display:flex;flex-direction:column;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);overflow:visible;box-shadow:var(--shadow-sm);}
#zoom-ctrl > button{width:38px;min-height:32px;border:none;background:transparent;color:var(--text);cursor:pointer;font-size:13px;font-family:inherit;border-bottom:1px solid var(--border);transition:.12s;}
#zoom-ctrl > button:first-child{border-radius:var(--radius) var(--radius) 0 0;}
#zoom-ctrl > button:last-of-type{border-bottom:none;border-radius:0 0 var(--radius) var(--radius);}
#zoom-ctrl button:hover{background:var(--surface2);color:var(--accent);}
#zoom-level{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;font-size:9px;color:var(--dim);text-align:center;padding:4px 1px;font-family:'DM Mono',monospace;line-height:1.15;}
#zoom-level[aria-expanded="true"]{background:var(--surface2);color:var(--accent);}
#zoom-mode{font-family:'DM Sans',sans-serif;font-size:8px;font-weight:700;color:var(--action);}
#zoom-mode:empty{display:none;}
#zoom-presets{display:none;position:absolute;right:calc(100% + 8px);bottom:0;width:170px;grid-template-columns:repeat(3,minmax(0,1fr));gap:4px;padding:6px;background:var(--surface);border:1px solid var(--border);border-radius:12px;box-shadow:var(--shadow-md);}
#zoom-presets.open{display:grid;}
#zoom-presets button{min-width:0;height:32px;border:1px solid var(--border);border-radius:7px;background:var(--surface2);color:var(--text);font:600 10px 'DM Mono',monospace;cursor:pointer;}
#zoom-presets button[aria-pressed="true"]{background:var(--accent);border-color:var(--accent);color:#000;}

/* ── Sidebar ── */
#sidebar{
  position:fixed;top:48px;left:0;bottom:0;width:280px;z-index:90;
  background:var(--surface);border-right:1px solid var(--border);
  transform:translateX(-100%);transition:transform .25s;overflow-y:auto;
  padding:14px;font-size:12px;
}
#sidebar.open{transform:translateX(0);}
#sidebar .sidebar-head{position:sticky;top:-14px;z-index:2;display:flex;align-items:center;justify-content:space-between;gap:8px;margin:-14px -14px 8px;padding:14px;background:var(--surface);border-bottom:1px solid var(--border);}
#sidebar .sidebar-head h3{margin:0;}
#sidebar-close{display:inline-flex;align-items:center;justify-content:center;width:34px;height:34px;border:1px solid var(--border);border-radius:8px;background:var(--surface2);color:var(--text);font:inherit;cursor:pointer;}
#sidebar-close:hover{color:var(--accent);border-color:var(--accent);}
#sidebar h3{font-size:13px;margin:14px 0 8px;color:var(--accent);font-weight:600;}
#sidebar h3:first-child{margin-top:0;}
.stat-row{display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid var(--border);}
.stat-val{font-weight:600;font-family:'DM Mono',monospace;color:var(--accent2);}
.app-list-item{display:block;width:100%;padding:6px 8px;cursor:pointer;border:1px solid transparent;border-radius:6px;margin:2px 0;transition:.1s;background:transparent;color:var(--text);text-align:left;font:inherit;}
.app-list-group{margin:12px 0 4px;padding-bottom:3px;border-bottom:1px solid var(--border);font-size:10px;font-weight:700;color:var(--dim);letter-spacing:0.04em;}
.app-list-group:first-child{margin-top:2px;}
.app-list-item:hover{background:var(--surface2);}
.app-list-item.highlighted{background:rgba(94,234,212,0.12);border:1px solid var(--accent);}
.app-list-item.active-app{background:rgba(129,140,248,0.12);border:1px solid var(--accent2);}
.filter-chip{display:inline-block;padding:3px 8px;margin:2px;border:1px solid var(--border);border-radius:20px;font-size:10px;cursor:pointer;transition:.1s;}
.filter-chip:hover,.filter-chip.active{background:var(--accent);color:#000;border-color:var(--accent);}

/* ── Architecture analysis ── */
#analysis-panel{
  position:fixed;top:54px;right:0;width:360px;max-height:calc(100vh - 62px);
  overflow-y:auto;z-index:96;background:var(--surface);border-left:1px solid var(--border);
  padding:20px;display:none;box-shadow:-18px 0 36px rgba(0,0,0,0.22);
}
#analysis-panel.open{display:block;}
.analysis-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:14px;}
.analysis-head h2{font-size:15px;color:var(--accent);}
.analysis-head p{font-size:10px;line-height:1.5;color:var(--dim);margin-top:3px;}
.analysis-score{display:grid;grid-template-columns:84px 1fr;gap:12px;align-items:center;padding:12px;border:1px solid var(--border);border-radius:14px;background:var(--surface2);}
.analysis-score__value{width:72px;height:72px;border-radius:50%;display:flex;flex-direction:column;align-items:center;justify-content:center;border:5px solid var(--accent);background:var(--surface);font-family:'DM Mono',monospace;}
.analysis-score__value strong{font-size:22px;line-height:1;}
.analysis-score__value span{font-size:9px;color:var(--dim);margin-top:3px;}
.analysis-score__copy strong{display:block;font-size:13px;margin-bottom:4px;}
.analysis-score__copy span{font-size:10px;line-height:1.5;color:var(--dim);}
.analysis-facts{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;padding:10px;border:1px solid var(--border);border-radius:14px;background:var(--surface2);}
.analysis-fact{padding:8px;border-radius:10px;background:var(--surface);text-align:center;}
.analysis-fact strong{display:block;font:700 20px/1.1 'DM Mono',monospace;color:var(--accent);}
.analysis-fact span{display:block;margin-top:5px;font-size:9px;color:var(--dim);}
.analysis-section{margin-top:18px;}
.analysis-section h3{font-size:11px;color:var(--text);margin-bottom:7px;display:flex;justify-content:space-between;gap:8px;}
.analysis-count{color:var(--dim);font-family:'DM Mono',monospace;}
.analysis-empty{padding:10px;border:1px dashed var(--border);border-radius:10px;color:var(--dim);font-size:10px;line-height:1.5;}
.analysis-item{width:100%;text-align:left;padding:9px 10px;margin:4px 0;border:1px solid var(--border);border-radius:10px;background:var(--surface2);color:var(--text);cursor:pointer;font-family:inherit;transition:.12s;}
.analysis-item:hover{border-color:var(--accent);transform:translateY(-1px);}
.analysis-item strong{display:block;font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.analysis-item span{display:block;font-size:9px;color:var(--dim);margin-top:3px;line-height:1.45;}
.analysis-item--warn{border-left:3px solid var(--action);}
.analysis-item--risk{border-left:3px solid var(--req);}
.analysis-note{margin-top:14px;padding:9px 10px;border-radius:10px;background:rgba(129,140,248,0.1);color:var(--dim);font-size:9px;line-height:1.55;}

/* ── Detail Panel ── */
#detail{
  position:fixed;top:54px;right:0;width:390px;max-height:calc(100vh - 62px);
  overflow-y:auto;z-index:90;background:var(--surface);border-left:1px solid var(--border);
  padding:20px;display:none;box-shadow:-18px 0 36px rgba(0,0,0,0.18);
}
#detail.open{display:block;}
#detail h2{font-size:15px;margin-bottom:4px;color:var(--accent);}
#detail .app-meta{font-size:11px;color:var(--dim);margin-bottom:12px;}
.detail-chip-row{display:flex;gap:6px;flex-wrap:wrap;margin:8px 0 12px;}
.close-btn{position:absolute;top:12px;right:14px;background:none;border:none;color:var(--dim);font-size:16px;cursor:pointer;}
.field-group-title{font-size:11px;font-weight:600;color:var(--dim);margin:12px 0 6px;text-transform:uppercase;letter-spacing:.05em;}
.field-row{display:flex;align-items:flex-start;gap:8px;padding:7px 8px;border-radius:8px;font-size:11px;border-bottom:1px solid var(--border);}
.field-row:hover{background:var(--surface2);}
.detail-relation-button{width:100%;background:transparent;color:inherit;text-align:left;font:inherit;cursor:pointer;}
.field-icon{width:18px;text-align:center;flex-shrink:0;}
.field-main{flex:1;min-width:0;}
.field-name{display:flex;align-items:center;gap:4px;flex-wrap:wrap;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:600;}
.field-sub{margin-top:2px;font-size:10px;color:var(--dim);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-family:'DM Mono',monospace;}
.field-type{color:var(--dim);font-size:10px;flex-shrink:0;}
.tag{display:inline-block;padding:1px 5px;border-radius:3px;font-size:9px;font-weight:600;margin-left:4px;}
.tag-pk{background:rgba(251,191,36,0.15);color:var(--pk);}
.tag-fk{background:rgba(96,165,250,0.15);color:var(--lookup);}
.tag-ref{background:rgba(52,211,153,0.15);color:var(--ref);}
.tag-req{background:rgba(248,113,113,0.12);color:var(--req);}
.tag-sub{background:rgba(99,110,131,0.15);color:var(--dim);}
.row-del{flex-shrink:0;align-self:center;width:20px;height:20px;border:1px solid transparent;border-radius:6px;background:transparent;color:var(--dim);font-size:11px;line-height:1;cursor:pointer;opacity:0;transition:.12s;}
.field-row:hover .row-del{opacity:1;}
.row-del:hover{color:var(--req);border-color:var(--border);background:var(--surface2);}
.row-del--restore{opacity:1;color:var(--accent);}
.row-del--restore:hover{color:var(--accent);}
.field-row--hidden{opacity:0.45;}
.meta-pill--btn{cursor:pointer;color:var(--accent);border-color:var(--accent);background:transparent;font-family:inherit;}
.meta-pill--btn:hover{background:var(--surface2);}

/* ── Path Finder ── */
#pathfinder{
  position:fixed;bottom:var(--bottom-safe);left:50%;transform:translateX(-50%);z-index:100;
  background:var(--surface);border:1px solid var(--border);border-radius:12px;
  padding:10px 16px;display:none;align-items:center;gap:8px;font-size:12px;
  box-shadow:0 8px 30px rgba(0,0,0,0.4);
}
#pathfinder.open{display:flex;}
#pathfinder select{padding:4px 8px;border:1px solid var(--border);border-radius:6px;background:var(--surface2);color:var(--text);font-size:11px;font-family:inherit;}
#pathfinder button{padding:4px 12px;border-radius:6px;}
#path-result{font-size:11px;color:var(--accent);max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}

/* ── Legend ── */
#legend{
  position:fixed;bottom:calc(var(--bottom-safe) + var(--pathfinder-lift));right:16px;z-index:100;
  display:flex;gap:14px;padding:8px 14px;
  background:var(--surface);border:1px solid var(--border);
  border-radius:var(--radius);font-size:10px;box-shadow:var(--shadow-sm);
}
#legend span,#legend button{display:flex;align-items:center;gap:4px;}
#legend button{appearance:none;background:transparent;color:inherit;font:inherit;line-height:inherit;}
#legend i{display:inline-block;width:9px;height:9px;border-radius:2px;}
#legend .legend-toggle{cursor:pointer;padding:2px 6px;border:1px solid transparent;border-radius:8px;transition:.12s;}
#legend .legend-toggle:hover{background:var(--surface2);border-color:var(--border);}
#legend .legend-toggle.off{opacity:0.35;text-decoration:line-through;}

/* ── Help / Shortcut modal ── */
#help-overlay{display:none;position:fixed;inset:0;z-index:320;background:rgba(0,0,0,0.6);backdrop-filter:blur(4px);justify-content:center;align-items:center;padding:16px;}
#help-overlay.open{display:flex;}
#help-box{background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:22px;width:min(640px,100%);max-height:85vh;overflow-y:auto;box-shadow:var(--shadow-md);}
#help-box h2{font-size:16px;margin-bottom:4px;color:var(--accent);}
#help-box .help-sub{font-size:11px;color:var(--dim);margin-bottom:14px;}
.help-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:14px;}
.help-section h3{font-size:12px;font-weight:700;margin-bottom:6px;color:var(--text);text-transform:uppercase;letter-spacing:0.04em;}
.help-row{display:flex;justify-content:space-between;align-items:center;padding:5px 0;border-bottom:1px dashed var(--border);gap:10px;}
.help-row:last-child{border-bottom:none;}
.help-row span:first-child{font-size:11px;color:var(--text);}
.help-row kbd{background:var(--surface2);border:1px solid var(--border);border-radius:4px;padding:2px 7px;font-size:10px;color:var(--accent2);font-family:'DM Mono',monospace;white-space:nowrap;}
#help-box .close-row{margin-top:16px;display:flex;justify-content:flex-end;}
#help-box .close-row button{padding:7px 14px;border:1px solid var(--border);border-radius:8px;background:var(--surface);color:var(--text);cursor:pointer;font-family:inherit;font-size:12px;}

/* ── Minimap ── */
#minimap{
  position:fixed;bottom:52px;right:16px;z-index:100;
  width:180px;height:130px;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);
  overflow:hidden;display:none;
}
#minimap.open{display:block;}
#minimap canvas{width:100%;height:100%;}

/* ── Cy ── */
#cy{width:100vw;height:100vh;}

/* ── Modal ── */
#modal-overlay{display:none;position:fixed;inset:0;z-index:300;background:rgba(0,0,0,0.6);backdrop-filter:blur(4px);justify-content:center;align-items:center;}
#modal-overlay.open{display:flex;}
#modal{background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:24px;width:min(600px,calc(100vw - 24px));max-height:80vh;overflow-y:auto;}
#modal h2{margin-bottom:10px;font-size:15px;}
#modal pre{background:var(--bg);padding:12px;border-radius:8px;font-size:11px;overflow-x:auto;white-space:pre-wrap;font-family:'DM Mono',monospace;color:var(--dim);max-height:400px;overflow-y:auto;border:1px solid var(--border);}
#modal .actions{margin-top:12px;display:flex;gap:8px;}
#modal .actions button{padding:7px 14px;border:1px solid var(--border);border-radius:8px;background:var(--surface);color:var(--text);cursor:pointer;font-family:inherit;font-size:12px;}
#modal .actions button.primary{background:var(--accent);color:#000;border-color:var(--accent);font-weight:600;}

/* ── Manual add editor ── */
#editor-overlay{display:none;position:fixed;inset:0;z-index:310;background:rgba(0,0,0,0.6);backdrop-filter:blur(4px);justify-content:center;align-items:center;padding:16px;}
#editor-overlay.open{display:flex;}
#editor{background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:22px;width:min(440px,100%);max-height:85vh;overflow-y:auto;box-shadow:var(--shadow-md);}
#editor h2{font-size:15px;margin-bottom:4px;color:var(--accent);}
#editor-sub{font-size:11px;color:var(--dim);margin-bottom:14px;line-height:1.5;}
.ed-row{display:flex;flex-direction:column;gap:4px;margin-bottom:12px;}
.ed-row label{font-size:11px;color:var(--dim);font-weight:600;}
.ed-row input,.ed-row select,.ed-row textarea{padding:8px 10px;border:1px solid var(--border);border-radius:8px;background:var(--surface2);color:var(--text);font-size:12px;font-family:inherit;outline:none;}
.ed-row input:focus,.ed-row select:focus,.ed-row textarea:focus{border-color:var(--accent);}
.ed-row textarea{min-height:84px;resize:vertical;}
.ed-hint{font-size:10px;color:var(--dim);line-height:1.5;}
#editor .actions{margin-top:14px;display:flex;gap:8px;justify-content:flex-end;}
#editor .actions button{padding:7px 14px;border:1px solid var(--border);border-radius:8px;background:var(--surface);color:var(--text);cursor:pointer;font-family:inherit;font-size:12px;}
#editor .actions button.primary{background:var(--accent);color:#000;border-color:var(--accent);font-weight:600;}
#editor .actions button.danger{color:var(--req);border-color:var(--req);margin-right:auto;}
.ed-swatches{display:flex;gap:8px;flex-wrap:wrap;}
.ed-swatch{width:26px;height:26px;border-radius:8px;border:2px solid var(--border);cursor:pointer;padding:0;transition:.12s;}
.ed-swatch:hover{transform:scale(1.08);}
.ed-swatch.selected{border-color:var(--text);box-shadow:0 0 0 2px var(--surface),0 0 0 4px var(--accent);}
.ed-swatch--none{background:linear-gradient(135deg,var(--surface2) 44%,var(--req) 47%,var(--req) 53%,var(--surface2) 56%);}
.detail-filter{width:100%;margin:10px 0 2px;padding:7px 10px;border:1px solid var(--border);border-radius:8px;background:var(--surface2);color:var(--text);font-size:11px;font-family:inherit;outline:none;}
.detail-filter:focus{border-color:var(--accent);}
.detail-filter::placeholder{color:var(--dim);}
.row-edit{flex-shrink:0;align-self:center;width:20px;height:20px;border:1px solid transparent;border-radius:6px;background:transparent;color:var(--dim);font-size:11px;line-height:1;cursor:pointer;opacity:0;transition:.12s;}
.field-row:hover .row-edit{opacity:1;}
.row-edit:hover{color:var(--accent);border-color:var(--border);background:var(--surface2);}

/* ── Empty / Banner ── */
#banner{
  position:fixed;top:48px;left:16px;z-index:95;display:flex;gap:8px;flex-wrap:wrap;max-width:min(900px,calc(100vw - 32px));
  pointer-events:none;
}
#banner .meta-pill{pointer-events:auto;box-shadow:0 8px 20px rgba(0,0,0,0.18);}

/* ── Overview ── */
#overview{
  position:fixed;top:94px;left:16px;z-index:94;width:min(460px,calc(100vw - 32px));
  background:var(--surface);
  border:1px solid var(--border);border-radius:16px;padding:16px 16px 14px;
  box-shadow:0 18px 40px rgba(0,0,0,0.22);backdrop-filter:blur(12px);
}
#overview.collapsed .ov-sub,#overview.collapsed .ov-grid,#overview.collapsed .ov-tip-row{display:none;}
#overview.hidden{display:none;}
.ov-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:12px;}
.ov-close{flex:0 0 auto;background:none;border:1px solid transparent;color:var(--dim);font-size:14px;line-height:1;cursor:pointer;padding:4px 8px;border-radius:8px;transition:.12s;}
.ov-close:hover{background:var(--surface2);border-color:var(--border);color:var(--text);}
.ov-title{font-size:14px;font-weight:700;color:var(--text);}
.ov-sub{margin-top:4px;font-size:11px;line-height:1.6;color:var(--dim);}
.ov-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;}
.ov-card{padding:10px 12px;border:1px solid var(--border);border-radius:12px;background:var(--surface2);display:flex;flex-direction:column;gap:4px;min-height:72px;}
.ov-card--action{cursor:pointer;transition:.15s;text-align:left;color:inherit;font-family:inherit;}
.ov-card--action:hover{border-color:var(--accent);transform:translateY(-1px);box-shadow:var(--shadow-sm);}
.ov-card--risk{border-color:rgba(248,113,113,0.55);}
.ov-card--warn{border-color:rgba(245,158,11,0.55);}
.ov-kpi{font-size:18px;font-weight:700;line-height:1;color:var(--text);}
.ov-label{font-size:10px;color:var(--dim);}
.ov-tip-row{display:flex;gap:6px;flex-wrap:wrap;margin-top:10px;}
.ov-tip-row span{padding:5px 8px;border-radius:999px;background:var(--surface2);border:1px solid var(--border);font-size:10px;color:var(--dim);max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}

/* ── Toast ── */
#toast{position:fixed;bottom:60px;left:50%;transform:translateX(-50%) translateY(20px);z-index:600;padding:8px 20px;background:var(--accent);color:#000;border-radius:8px;font-size:12px;font-weight:600;opacity:0;transition:.3s;pointer-events:none;}
#toast.show{opacity:1;transform:translateX(-50%) translateY(0);}

button:focus-visible,input:focus-visible,select:focus-visible,[tabindex]:focus-visible{outline:3px solid var(--accent);outline-offset:2px;}
@media (prefers-reduced-motion:reduce){*,*::before,*::after{scroll-behavior:auto!important;transition-duration:.01ms!important;animation-duration:.01ms!important;animation-iteration-count:1!important;}}
#banner{top:calc(var(--topbar-h,52px) + 6px);}
#overview{top:calc(var(--topbar-h,52px) + 48px);}
#sidebar{top:var(--topbar-h,52px);}
#detail,#analysis-panel{top:calc(var(--topbar-h,52px) + 6px);max-height:calc(100vh - var(--topbar-h,52px) - 14px);}
.field-row:focus-within .row-edit,.field-row:focus-within .row-del{opacity:1;}
@media (max-width:640px){
  #detail,#analysis-panel,#sidebar{top:0;max-height:100vh;width:100vw;border-radius:0;z-index:180;}
  #overview{top:calc(var(--topbar-h,52px) + 42px);}
  #legend{bottom:calc(var(--bottom-safe) + var(--pathfinder-lift));flex-wrap:nowrap;overflow-x:auto;overscroll-behavior-x:contain;white-space:nowrap;}
  #zoom-ctrl{right:8px;}
  #fab-mobile{display:flex;bottom:calc(var(--bottom-safe) + var(--pathfinder-lift) + 50px);}
  .row-edit,.row-del{opacity:1;width:30px;height:30px;}
  .tb-menu-panel{position:fixed;left:8px;right:8px;top:var(--topbar-h,52px);max-height:calc(100vh - var(--topbar-h,52px) - 16px);}
  #sidebar .sidebar-head{top:0;margin:-14px -14px 8px;}
}
@media (max-width:420px){
  #modal,#editor,#help-box{padding:16px;}
  #modal .actions,#editor .actions{flex-wrap:wrap;}
  #modal .actions button,#editor .actions button{flex:1 1 112px;min-height:44px;}
  #editor .actions button.danger{margin-right:0;}
  .help-grid{grid-template-columns:minmax(0,1fr);}
  .help-row{align-items:flex-start;flex-wrap:wrap;}
  #zoom-ctrl > button,#zoom-level{width:42px;min-height:40px;}
  #sidebar-close{width:44px;height:44px;}
}

/* scrollbar */
::-webkit-scrollbar{width:5px;}::-webkit-scrollbar-track{background:transparent;}::-webkit-scrollbar-thumb{background:var(--border);border-radius:3px;}
</style>
</head>
<body>

<!-- Command Palette -->
<div id="cmd-overlay" onclick="if(event.target===this)closeCmd()">
  <div id="cmd-box" role="dialog" aria-modal="true" aria-label="コマンドパレット">
    <input id="cmd-input" placeholder="コマンドを入力... (アプリ検索、エクスポート、レイアウト変更...)" oninput="filterCmd(this.value)">
    <div id="cmd-results"></div>
  </div>
</div>

<!-- Top Bar -->
<div id="topbar">
  <button class="tb tb-icon" id="mobile-menu-btn" onclick="toggleMobileMenu()" title="メニュー" aria-label="メニュー" aria-expanded="false">☰</button>
  <h1>⬡ kintone ER図</h1>

  <div class="meta-group" style="display:inline-flex;gap:4px;flex-wrap:wrap;">
    <span class="meta-pill" title="開始: ${esc(startAppFullText)}"><b>開始</b> <span class="pill-val">${esc(startAppText)}</span></span>
    <span class="meta-pill" id="layout-pill"><b>配置</b> ${esc(formatErLayoutLabel(options.layoutName))}</span>
    <span class="meta-pill" id="density-pill"><b>密度</b> ${esc(densityLabel)}</span>
    <span class="meta-pill"><b>深さ</b> ${esc(String(options.maxDepth || 0))}</span>
    ${spacePill}
  </div>

  <div class="sep"></div>

  <div class="tb-group" data-group="view">
    <span class="tb-group-label">表示</span>
    <button class="tb" id="sidebar-toggle-btn" onclick="toggleSidebar(undefined,this)" title="統計パネル (Ctrl+B)" aria-controls="sidebar" aria-expanded="false">📊</button>
    <button class="tb" id="analysis-toggle-btn" onclick="toggleAnalysisPanel()" title="構造チェック: 取得状態・循環候補・接続数を確認">🩺 チェック</button>
    <button class="tb" id="overview-toggle-btn" onclick="toggleOverview()" title="ガイドパネル">🧭</button>
    <button class="tb" onclick="togglePathFinder()" title="経路探索">🛣</button>
    <button class="tb" onclick="toggleMinimap()" title="ミニマップ">🗺</button>
    <button class="tb" onclick="toggleFullscreen()" id="fs-btn" title="フルスクリーン (F11)">⛶</button>
  </div>

  <div class="tb-group" data-group="layout">
    <span class="tb-group-label">配置</span>
    <button class="tb" data-layout-btn="dagre" onclick="setLayout('dagre')" title="Dagre (推奨)">Dagre</button>
    <button class="tb" data-layout-btn="cose" onclick="setLayout('cose')" title="自動配置">自動</button>
    <button class="tb" data-layout-btn="breadthfirst" onclick="setLayout('breadthfirst')" title="ツリー">🌳</button>
    <button class="tb" data-layout-btn="concentric" onclick="setLayout('concentric')" title="同心円">◎</button>
    <button class="tb" data-layout-btn="grid" onclick="setLayout('grid')" title="グリッド">⊞</button>
    <button class="tb" data-layout-btn="circle" onclick="setLayout('circle')" title="円形">◯</button>
    <button class="tb active" id="separate-nolink-btn" onclick="toggleSeparateNoLink()" title="紐づき（関連線）のないアプリを下の別枠にまとめて配置">🗂 分離</button>
  </div>

  <select id="density-select" class="tb-select" onchange="setDensity(this.value)" title="表示密度">
    <option value="none">⬡ 結合のみ</option>
    <option value="compact">🪶 コンパクト</option>
    <option value="standard">📄 標準</option>
    <option value="full">🧾 詳細</option>
  </select>

  <button class="tb" id="simple-mode-btn" onclick="toggleSimpleMode()" title="項目を隠してアプリ同士の結合関係だけを表示（重複する線もまとめます）">⬡ シンプル</button>

  <div class="sep"></div>

  <input id="search-box" placeholder="🔎 アプリ・フィールド検索 (Ctrl+F / Enterで移動)" oninput="searchGraph(this.value)" onkeydown="if(event.key==='Enter'){event.preventDefault();focusNextSearchMatch();}">
  <span class="meta-pill" id="search-meta"><b>検索</b> すべて</span>

  <div class="tb-group" data-group="focus">
    <span class="tb-group-label">強調</span>
    <button class="tb active" id="focus-toggle-btn" onclick="toggleFocusMode()" title="関連強調 (Shift+F)">🎯 ON</button>
    <select id="focus-depth" class="tb-select" onchange="updateFocusOptions()" title="強調する深さ">
      <option value="1">深さ1</option>
      <option value="2">深さ2</option>
      <option value="3">深さ3</option>
    </select>
    <select id="focus-direction" class="tb-select" onchange="updateFocusOptions()" title="強調の方向">
      <option value="both">双方向</option>
      <option value="out">出方向</option>
      <option value="in">入方向</option>
    </select>
    <button class="tb" onclick="clearFocus()" title="強調解除">✕</button>
  </div>

  <div class="tb-group" data-group="edit">
    <span class="tb-group-label">線</span>
    <button class="tb active" id="rel-lookup-btn" onclick="toggleRelationKind('LOOKUP')" title="ルックアップ線">🔗</button>
    <button class="tb active" id="rel-ref-btn" onclick="toggleRelationKind('REF')" title="関連レコード線">📋</button>
    <button class="tb active" id="rel-action-btn" onclick="toggleRelationKind('ACTION')" title="アクション線">⚡</button>
    <button class="tb active" id="rel-label-btn" onclick="toggleRelationLabels()" title="線ラベル">🏷</button>
  </div>

  <div class="tb-menu" id="add-menu" data-mobile="hide">
    <button class="tb tb-menu-btn" onclick="toggleMenu('add-menu')" title="要素を手動追加">➕ 追加</button>
    <div class="tb-menu-panel">
      <button class="tb" onclick="openAddApp();closeAllMenus()">⬡ アプリ(エンティティ)を追加</button>
      <button class="tb" onclick="openAddField();closeAllMenus()">📝 アプリに項目を追加</button>
      <button class="tb" onclick="openAddRelation();closeAllMenus()">🔗 関連線を追加</button>
      <hr>
      <button class="tb" onclick="openAddNote();closeAllMenus()">🗒 メモ(付箋)を追加</button>
    </div>
  </div>

  <div class="tb-menu" id="edit-menu" data-mobile="hide">
    <button class="tb tb-menu-btn" onclick="toggleMenu('edit-menu')" title="編集">✏</button>
    <div class="tb-menu-panel">
      <button class="tb" onclick="undoLast();closeAllMenus()">↩ 元に戻す (Ctrl+Z)</button>
      <hr>
      <button class="tb" onclick="openEditApp();closeAllMenus()">✏ アプリを編集（名前・枠色）</button>
      <button class="tb" onclick="autoColorByDepth();closeAllMenus()">🎨 深さごとに色分け</button>
      <button class="tb" onclick="clearNodeColors();closeAllMenus()">🧼 色分けを解除</button>
      <hr>
      <button class="tb" onclick="alignSelected('x');closeAllMenus()">⇤ 選択ノードを左揃え</button>
      <button class="tb" onclick="alignSelected('y');closeAllMenus()">⇞ 選択ノードを上揃え</button>
      <button class="tb" onclick="distributeSelected('x');closeAllMenus()">⇶ 選択ノードを横に等間隔</button>
      <button class="tb" onclick="distributeSelected('y');closeAllMenus()">⇩ 選択ノードを縦に等間隔</button>
      <hr>
      <button class="tb" onclick="removeSelectedRelations();closeAllMenus()">🗑 選択した関連線を削除 (Delete)</button>
      <button class="tb" onclick="restoreRemovedRelations();closeAllMenus()">↺ 削除した関連線を復元</button>
      <hr>
      <button class="tb" onclick="removeSelectedApps();closeAllMenus()">🗑 選択したアプリを削除 (Delete)</button>
      <button class="tb" onclick="restoreRemovedApps();closeAllMenus()">↺ 削除したアプリを復元</button>
      <hr>
      <button class="tb" onclick="restoreAllHiddenFields();closeAllMenus()">↺ 非表示にした項目をすべて復元</button>
      <hr>
      <button class="tb" onclick="togglePinFromSelection();closeAllMenus()">📌 選択ノードを固定/解除 (Shift+P)</button>
      <button class="tb" onclick="clearPins();closeAllMenus()">📍 固定を全解除</button>
    </div>
  </div>

  <div class="spacer"></div>

  <button class="tb" onclick="fit()" title="全体表示 (Ctrl+0)" aria-label="図全体を表示">📐</button>

  <div class="tb-menu" id="export-menu">
    <button class="tb tb-menu-btn" onclick="toggleMenu('export-menu')">💾 出力</button>
    <div class="tb-menu-panel">
      <button class="tb" onclick="exportEditedHtml();closeAllMenus()">💾 編集済みHTMLを保存</button>
      <hr>
      <button class="tb" onclick="exportPNG();closeAllMenus()">🖼 PNG 画像</button>
      <hr>
      <button class="tb" onclick="showMermaid();closeAllMenus()">🧜 Mermaid</button>
      <button class="tb" onclick="showDrawio();closeAllMenus()">📊 draw.io XML</button>
      <button class="tb" onclick="showPlantUML();closeAllMenus()">🌱 PlantUML</button>
      <button class="tb" onclick="showSQL();closeAllMenus()">🗄 SQL DDL</button>
      <hr>
      <button class="tb" onclick="showJSON();closeAllMenus()">{} ERモデル JSON</button>
      <button class="tb" onclick="showMarkdown();closeAllMenus()">📝 Markdown 仕様書</button>
      <button class="tb" onclick="showCSVApps();closeAllMenus()">📑 CSV (アプリ一覧)</button>
      <button class="tb" onclick="showCSVFields();closeAllMenus()">📑 CSV (フィールド)</button>
      <button class="tb" onclick="showCSVRelations();closeAllMenus()">📑 CSV (関連)</button>
      <hr>
      <button class="tb" onclick="copyShareUrl();closeAllMenus()">🔗 表示状態のURLをコピー</button>
      <button class="tb" onclick="printDiagram();closeAllMenus()">🖨 印刷</button>
    </div>
  </div>

  <button class="tb tb-icon" id="theme-btn" onclick="toggleTheme()" title="テーマ切替" aria-label="テーマを切り替え">🌙</button>
  <button class="tb tb-icon" onclick="openHelp()" title="ヘルプ (?)" aria-label="ヘルプを開く">❓</button>
  <button class="tb tb-icon" onclick="openCmd()" title="コマンド (Ctrl+K)" aria-label="コマンドパレットを開く">⌘K</button>
</div>

<!-- Floating action buttons for mobile -->
<div id="fab-mobile">
  <button onclick="fit()" title="全体表示" aria-label="図全体を表示">📐</button>
  <button id="sidebar-fab-btn" onclick="toggleSidebar(undefined,this)" title="統計" aria-label="統計パネルを開閉" aria-controls="sidebar" aria-expanded="false">📊</button>
</div>

<!-- Zoom controls -->
<div id="zoom-ctrl" role="group" aria-label="表示倍率">
  <button type="button" onclick="zoomIn()" title="拡大 (+)" aria-label="拡大">＋</button>
  <button type="button" id="zoom-level" onclick="toggleZoomPresets()" title="倍率を選択" aria-label="現在の表示倍率。倍率プリセットを開く" aria-haspopup="true" aria-expanded="false"><span id="zoom-value" aria-live="polite">100%</span><span id="zoom-mode"></span></button>
  <button type="button" onclick="zoomReset()" title="100%にリセット (0)" aria-label="表示倍率を100%にリセット">◎</button>
  <button type="button" onclick="zoomOut()" title="縮小 (-)" aria-label="縮小">－</button>
  <div id="zoom-presets" role="group" aria-label="倍率プリセット">
    <button type="button" class="zoom-preset" data-zoom="50" aria-pressed="false" onclick="setZoomPercent(50)">50%</button>
    <button type="button" class="zoom-preset" data-zoom="75" aria-pressed="false" onclick="setZoomPercent(75)">75%</button>
    <button type="button" class="zoom-preset" data-zoom="100" aria-pressed="true" onclick="setZoomPercent(100)">100%</button>
    <button type="button" class="zoom-preset" data-zoom="125" aria-pressed="false" onclick="setZoomPercent(125)">125%</button>
    <button type="button" class="zoom-preset" data-zoom="150" aria-pressed="false" onclick="setZoomPercent(150)">150%</button>
    <button type="button" class="zoom-preset" data-zoom="200" aria-pressed="false" onclick="setZoomPercent(200)">200%</button>
  </div>
</div>

<div id="banner">
  <span class="meta-pill"><b>アプリ数</b> ${apps.length}</span>
  <span class="meta-pill"><b>ゲスト</b> ${esc(options.source?.guestId ? `ゲスト ${String(options.source.guestId)}` : "通常空間")}</span>
  <span class="meta-pill"><b>モード</b> ${options.source?.preview ? "プレビュー" : "本番"}</span>
  <span class="meta-pill"><b>サブテーブル</b> ${options.includeSubtableFields ? "ON" : "OFF"}</span>
</div>

<div id="overview" class="collapsed">
  <div class="ov-head">
    <div>
      <div class="ov-title">取得・関連サマリー</div>
      <div class="ov-sub">取得できた設定と関連の事実を表示します。良否は判定せず、数値を選ぶと該当箇所を確認できます。</div>
    </div>
    <button class="ov-close" onclick="hideOverview()" title="ガイドを閉じる（🧭 で再表示）" aria-label="ガイドを閉じる">✕</button>
  </div>
  <div class="ov-grid">
    <button class="ov-card ov-card--action${dependencyAnalysis.counts.retrievalPartial + dependencyAnalysis.counts.retrievalFailed ? " ov-card--warn" : ""}" onclick="toggleAnalysisPanel(true)"><span class="ov-kpi">${dependencyAnalysis.counts.retrievalPartial + dependencyAnalysis.counts.retrievalFailed}</span><span class="ov-label">取得に注意が必要</span></button>
    <button class="ov-card ov-card--action${dependencyAnalysis.cycles.length ? " ov-card--risk" : ""}" onclick="toggleAnalysisPanel(true)"><span class="ov-kpi">${dependencyAnalysis.cycles.length}</span><span class="ov-label">循環グループ</span></button>
    <button class="ov-card ov-card--action${dependencyAnalysis.isolatedAppIds.length ? " ov-card--warn" : ""}" onclick="toggleAnalysisPanel(true)"><span class="ov-kpi">${dependencyAnalysis.isolatedAppIds.length}</span><span class="ov-label">孤立アプリ</span></button>
    <button class="ov-card ov-card--action" onclick="toggleAnalysisPanel(true)"><span class="ov-kpi">${dependencyAnalysis.selfReferences.length}</span><span class="ov-label">自己参照</span></button>
    <button class="ov-card ov-card--action${dependencyAnalysis.unresolvedTargets.length ? " ov-card--warn" : ""}" onclick="toggleAnalysisPanel(true)"><span class="ov-kpi">${dependencyAnalysis.unresolvedTargets.length}</span><span class="ov-label">未取得の参照先</span></button>
    <div class="ov-card"><span class="ov-kpi">${summary.relations}</span><span class="ov-label">総関連</span></div>
  </div>
  <div class="ov-tip-row">
    <span title="開始: ${esc(startAppFullText)}">開始: ${esc(startAppText || "-")}</span>
    <span>Lookup: ${summary.lookups}</span>
    <span>関連レコード: ${summary.refs}</span>
    <span>アクション: ${summary.actions}</span>
    <span>必須項目: ${summary.required}</span>
    <span>開始アプリの周辺はクリック・検索・関連強調で絞り込めます</span>
  </div>
</div>

<!-- Architecture Analysis -->
<aside id="analysis-panel" aria-label="ER図の構造分析">
  <div class="analysis-head">
    <div><h2>🩺 構造チェック</h2><p>取得状態、循環候補、自己参照、関連のないアプリなどの事実を確認します。</p></div>
    <button class="close-btn" onclick="toggleAnalysisPanel(false)" aria-label="構造分析を閉じる">✕</button>
  </div>
  <div class="analysis-facts" aria-label="取得状態の件数">
    <div class="analysis-fact"><strong>${dependencyAnalysis.counts.retrievalComplete}</strong><span>取得完了</span></div>
    <div class="analysis-fact"><strong>${dependencyAnalysis.counts.retrievalPartial}</strong><span>一部取得</span></div>
    <div class="analysis-fact"><strong>${dependencyAnalysis.counts.retrievalFailed}</strong><span>取得失敗</span></div>
  </div>
  <div id="analysis-content"></div>
  <div class="analysis-note">ここでは良否を判定しません。「接続数が多い」は入出力の関連が ${dependencyAnalysis.highConnectionThreshold} 件以上のアプリを機械的に列挙しています。</div>
</aside>

<!-- Sidebar -->
<div id="sidebar" role="region" aria-label="統計・フィルター" aria-hidden="true" inert>
  <div class="sidebar-head"><h3>📊 統計サマリー</h3><button type="button" id="sidebar-close" onclick="closeSidebar()" aria-label="統計パネルを閉じる">✕</button></div>
  <div id="stats-summary"></div>
  <h3>🏷 フィールドタイプフィルター</h3>
  <div id="type-filters"></div>
  <h3>📱 アプリ一覧</h3>
  <div id="app-list"></div>
</div>

<!-- Cytoscape -->
<div id="cy"></div>

<!-- Detail Panel -->
<div id="detail" role="complementary" aria-label="選択したアプリの詳細">
  <button class="close-btn" onclick="closeDetail()">✕</button>
  <h2 id="detail-title"></h2>
  <div class="app-meta" id="detail-meta"></div>
  <div id="detail-relations"></div>
  <div id="detail-fields"></div>
</div>

<!-- Path Finder -->
<div id="pathfinder">
  <span>経路:</span>
  <select id="pf-from" aria-label="経路の起点アプリ"></select>
  <span>→</span>
  <select id="pf-to" aria-label="経路の終点アプリ"></select>
  <button class="tb active" onclick="findPath()">検索</button>
  <button class="tb" onclick="clearPath()">クリア</button>
  <span id="path-result"></span>
</div>

<!-- Legend -->
<div id="legend">
  <span><i style="background:var(--pk)"></i>PK</span>
  <span><i style="background:var(--lookup)"></i>ルックアップ</span>
  <span><i style="background:var(--ref)"></i>関連</span>
  <span><i style="background:var(--req)"></i>必須</span>
  <span><i style="background:#f59e0b"></i>アクション</span>
  <span><i style="background:transparent;border:2px dashed var(--action)"></i>一部取得</span>
  <span><i style="background:transparent;border:2px solid var(--req)"></i>取得失敗</span>
  <span><i style="background:transparent;border:2px dashed var(--dim)"></i>未取得の参照先</span>
  <button type="button" class="legend-toggle" id="legend-lookup-edge" aria-pressed="true" onclick="toggleRelationKind('LOOKUP')"><i style="border:2px solid var(--lookup)"></i>ルックアップ線</button>
  <button type="button" class="legend-toggle" id="legend-ref-edge" aria-pressed="true" onclick="toggleRelationKind('REF')"><i style="border:2px dashed var(--ref)"></i>関連線</button>
  <button type="button" class="legend-toggle" id="legend-action-edge" aria-pressed="true" onclick="toggleRelationKind('ACTION')"><i style="border:2px dotted #f59e0b"></i>アクション線</button>
</div>

<!-- Minimap -->
<div id="minimap"><canvas id="minimap-canvas"></canvas></div>

<!-- Modal -->
<div id="modal-overlay" onclick="if(event.target===this)closeModal()">
  <div id="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><h2 id="modal-title"></h2><pre id="modal-content"></pre>
    <div class="actions">
      <button class="primary" onclick="copyModal()">📋 コピー</button>
      <button onclick="downloadModal()">💾 ダウンロード</button>
      <button onclick="closeModal()">閉じる</button>
    </div>
  </div>
</div>

<!-- Manual add editor -->
<div id="editor-overlay" onclick="if(event.target===this)closeEditor()">
  <div id="editor" role="dialog" aria-modal="true" aria-labelledby="editor-title">
    <h2 id="editor-title"></h2>
    <div id="editor-sub"></div>
    <div id="editor-body"></div>
    <div class="actions">
      <button class="danger" id="editor-delete" style="display:none" onclick="deleteFromEditor()">🗑 削除</button>
      <button class="primary" id="editor-submit" onclick="submitEditor()">追加</button>
      <button onclick="closeEditor()">キャンセル</button>
    </div>
  </div>
</div>

<!-- Help / Shortcut modal -->
<div id="help-overlay" onclick="if(event.target===this)closeHelp()">
  <div id="help-box" role="dialog" aria-modal="true" aria-labelledby="help-title">
    <h2 id="help-title">❓ キーボードショートカット ＆ 使い方</h2>
    <div class="help-sub">クリック: 詳細表示 / 右クリック: 固定 / Alt+右クリック: 非表示 / ドラッグ: 移動</div>
    <div class="help-grid">
      <div class="help-section">
        <h3>表示・ナビゲーション</h3>
        <div class="help-row"><span>コマンドパレット</span><kbd>Ctrl/⌘ + K</kbd></div>
        <div class="help-row"><span>アプリ・項目を検索</span><kbd>Ctrl/⌘ + F</kbd></div>
        <div class="help-row"><span>全体表示 (フィット)</span><kbd>Ctrl/⌘ + 0</kbd></div>
        <div class="help-row"><span>拡大 / 縮小</span><kbd>+ / -</kbd></div>
        <div class="help-row"><span>統計パネル</span><kbd>Ctrl/⌘ + B</kbd></div>
        <div class="help-row"><span>ヘルプを開閉</span><kbd>?</kbd></div>
        <div class="help-row"><span>閉じる / 強調解除</span><kbd>Esc</kbd></div>
      </div>
      <div class="help-section">
        <h3>操作・編集</h3>
        <div class="help-row"><span>元に戻す</span><kbd>Ctrl/⌘ + Z</kbd></div>
        <div class="help-row"><span>選択した要素を削除</span><kbd>Delete</kbd></div>
        <div class="help-row"><span>複数ノードを選択</span><kbd>Shift + ドラッグ / クリック</kbd></div>
        <div class="help-row"><span>関連強調 ON/OFF</span><kbd>Shift + F</kbd></div>
        <div class="help-row"><span>固定 / 固定解除</span><kbd>Shift + P</kbd></div>
        <div class="help-row"><span>名前・項目・線の編集</span><kbd>詳細パネルの ✎</kbd></div>
        <div class="help-row"><span>項目・関連線の個別削除</span><kbd>詳細パネルの ✕</kbd></div>
        <div class="help-row"><span>メモ(付箋)の編集</span><kbd>メモをクリック</kbd></div>
        <div class="help-row"><span>フルスクリーン</span><kbd>F11</kbd></div>
        <div class="help-row"><span>背景をクリック</span><kbd>強調解除</kbd></div>
        <div class="help-row"><span>ノードをダブルクリック</span><kbd>近隣のみ表示</kbd></div>
        <div class="help-row"><span>背景をダブルクリック</span><kbd>エンティティ追加</kbd></div>
        <div class="help-row"><span>右クリック (ノード)</span><kbd>固定/解除</kbd></div>
        <div class="help-row"><span>Alt + 右クリック</span><kbd>非表示</kbd></div>
      </div>
    </div>
    <div class="close-row"><button onclick="closeHelp()">閉じる</button></div>
  </div>
</div>

<div id="toast" role="status" aria-live="polite" aria-atomic="true"></div>

<script id="er-main" type="text/plain">
const APPS = ${data};
const ER_OPTIONS = ${diagramOptions};
const ER_ANALYSIS = ${dependencyAnalysisData};
const appMap = new Map(APPS.map(a=>[a.id,a]));
const ER_LAYOUT_NAMES = new Set(["dagre","breadthfirst","cose","concentric","grid","circle"]);
const ER_DENSITY_NAMES = new Set(["none","compact","standard","full"]);
const ER_DAGRE_READY = typeof window.cytoscapeDagre === "function" && !!(window.dagre && window.dagre.graphlib && window.dagre.graphlib.Graph);
function normalizeLayoutName(name){
  const normalized=String(name||"").trim();
  const selected=ER_LAYOUT_NAMES.has(normalized)?normalized:"dagre";
  return selected==="dagre"&&!ER_DAGRE_READY?"cose":selected;
}
function normalizeDensityName(name){
  const normalized=String(name||"").trim();
  return ER_DENSITY_NAMES.has(normalized)?normalized:"standard";
}
// 「編集済みHTMLを保存」で埋め込まれた編集状態（手動追加・配置・表示設定）
const ER_EDIT_STATE = window.__ER_EDIT_STATE__ || null;
if(ER_EDIT_STATE && ER_EDIT_STATE.options){
  if(ER_EDIT_STATE.options.layoutName) ER_OPTIONS.layoutName = normalizeLayoutName(ER_EDIT_STATE.options.layoutName);
  if(ER_EDIT_STATE.options.fieldDensity) ER_OPTIONS.fieldDensity = normalizeDensityName(ER_EDIT_STATE.options.fieldDensity);
}
ER_OPTIONS.layoutName=normalizeLayoutName(ER_OPTIONS.layoutName);
ER_OPTIONS.fieldDensity=normalizeDensityName(ER_OPTIONS.fieldDensity);
if (ER_DAGRE_READY) cytoscape.use(window.cytoscapeDagre);

// ─── Toast ───
function toast(msg){const t=document.getElementById("toast");t.textContent=msg;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),2000);}
function escapeHtml(value){
  return String(value == null ? "" : value)
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;")
    .replace(/'/g,"&#39;");
}

// ─── Theme ───
let isDark = true;
function readCssVar(name, fallback){
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}
function currentPalette(){
  return {
    text: readCssVar("--text", isDark ? "#d8dee9" : "#1a1c23"),
    dim: readCssVar("--dim", isDark ? "#636e83" : "#6b7280"),
    accent: readCssVar("--accent", isDark ? "#5eead4" : "#0d9488"),
    accent2: readCssVar("--accent2", isDark ? "#818cf8" : "#6366f1"),
    lookup: readCssVar("--lookup", isDark ? "#60a5fa" : "#2563eb"),
    ref: readCssVar("--ref", isDark ? "#34d399" : "#059669"),
    pk: readCssVar("--pk", isDark ? "#fbbf24" : "#d97706"),
    req: readCssVar("--req", isDark ? "#f87171" : "#dc2626"),
    action: readCssVar("--action", isDark ? "#f59e0b" : "#d97706"),
    bg: readCssVar("--bg", isDark ? "#08090d" : "#f0f2f5"),
    surface: readCssVar("--surface", isDark ? "#11131a" : "#ffffff"),
    surface2: readCssVar("--surface2", isDark ? "#181c27" : "#f7f8fa"),
    border: readCssVar("--border", isDark ? "#262d3d" : "#d8dce6")
  };
}
function formatFieldDensityLabel(density){
  const map = { none:"結合のみ", compact:"コンパクト", standard:"標準", full:"詳細" };
  return map[density] || density || "-";
}
function fieldIconForLabel(f){
  if(f.isPK) return "🔑";
  if(f.isLookup) return "🔗";
  if(f.isRef) return "📋";
  if(f.unique) return "🔒";
  if(f.type==="SUBTABLE") return "📦";
  if(f.inSubtable) return "↳";
  if(f.required) return "•";
  return "·";
}
// kintone API のフィールド ENUM を日本語化（ER 図側パネル表示用）
const FIELD_TYPE_JP_LABEL = {
  SINGLE_LINE_TEXT:"文字列(1行)", MULTI_LINE_TEXT:"文字列(複数行)", RICH_TEXT:"リッチエディター",
  NUMBER:"数値", CALC:"計算", RADIO_BUTTON:"ラジオボタン", CHECK_BOX:"チェックボックス",
  DROP_DOWN:"ドロップダウン", MULTI_SELECT:"複数選択", DATE:"日付", TIME:"時刻", DATETIME:"日時",
  USER_SELECT:"ユーザー選択", ORGANIZATION_SELECT:"組織選択", GROUP_SELECT:"グループ選択",
  LOOKUP:"ルックアップ", SUBTABLE:"テーブル", REFERENCE_TABLE:"関連レコード一覧",
  RECORD_NUMBER:"レコード番号", CREATOR:"作成者", CREATED_TIME:"作成日時",
  MODIFIER:"更新者", UPDATED_TIME:"更新日時", STATUS:"ステータス", STATUS_ASSIGNEE:"作業者",
  CATEGORY:"カテゴリー", FILE:"添付ファイル", LINK:"リンク",
  LABEL:"ラベル", SPACER:"スペース", HR:"罫線", GROUP:"グループ"
};
function fieldTypeJpLabel(type){
  if(!type) return "-";
  const key = String(type).trim().toUpperCase();
  return FIELD_TYPE_JP_LABEL[key] || type;
}
// 手動で非表示にした項目キーの集合（"アプリID::path|code"）
const hiddenFieldKeys = new Set();
function fieldHideKey(app, field){
  return String(app.id) + "::" + String(field.path || field.code || field.label || "");
}
function isFieldHidden(app, field){
  return hiddenFieldKeys.has(fieldHideKey(app, field));
}
function hiddenFieldCount(app){
  return allFieldsForApp(app).filter(f=>isFieldHidden(app, f)).length;
}
function allFieldsForApp(app){
  const fields = Array.isArray(app&&app.allFields) ? app.allFields : (Array.isArray(app&&app.fields) ? app.fields : []);
  return fields.filter(f=>f&&f.type!=="SUBTABLE"&&(ER_OPTIONS.includeSubtableFields||!f.inSubtable));
}
function fieldsForDensity(app){
  if(ER_OPTIONS.fieldDensity==="none") return [];
  const candidates=allFieldsForApp(app);
  const linked=new Set();
  (app.relations||[]).forEach(r=>{
    if(r.kind!=="LOOKUP"&&r.kind!=="REF") return;
    [r.fromPath,r.from,r.controlFieldPath,r.controlField].forEach(v=>{const key=String(v||"").trim();if(key) linked.add(key);});
  });
  const essential=f=>f.isPK||f.unique||f.isLookup||f.isRef||linked.has(String(f.path||""))||linked.has(String(f.code||""));
  let selected;
  if(ER_OPTIONS.fieldDensity==="full") selected=candidates;
  else if(ER_OPTIONS.fieldDensity==="standard"){
    selected=candidates.filter(f=>essential(f)||f.required);
    if(!selected.length) selected=candidates.slice(0,6);
  }else{
    selected=candidates.filter(essential);
    if(!selected.length) selected=candidates.slice(0,6);
  }
  const limit=Math.max(0,Number(ER_OPTIONS.maxFields)||220);
  return selected.slice(0,limit);
}
function visibleFieldsForNode(app){
  return fieldsForDensity(app).filter(f=>!isFieldHidden(app, f));
}
function buildFieldDisplayName(field){
  if(!field) return "";
  if(field.inSubtable && field.tableLabel) return field.tableLabel + " > " + (field.label || field.code || "");
  return field.label || field.code || field.path || "";
}
function fieldPrefixForNodeLabel(field){
  if(field.isPK) return "🔑";
  if(field.isLookup) return "🔗";
  if(field.isRef) return "📋";
  if(field.required) return "✱";
  if(field.type === "SUBTABLE") return "▤";
  if(field.inSubtable) return "↳";
  return "・";
}
function buildFieldPreviewLine(field){
  const label = buildFieldDisplayName(field).trim();
  const code = String(field.code || "").trim();
  const type = String(field.type || "").trim();
  const prefix = fieldPrefixForNodeLabel(field);
  if(ER_OPTIONS.fieldDensity === "compact"){
    return prefix + " " + label;
  }
  if(ER_OPTIONS.fieldDensity === "full"){
    const extras = [];
    if(code && code !== label) extras.push("[" + code + "]");
    if(type) extras.push(fieldTypeJpLabel(type));
    return prefix + " " + label + (extras.length ? " • " + extras.join(" • ") : "");
  }
  return prefix + " " + label + (code && code !== label ? " [" + code + "]" : "");
}
function estimateLabelLineUnits(line){
  let units = 0;
  for(const ch of String(line || "")) units += ch.codePointAt(0) > 0xFF ? 1 : 0.55;
  return units;
}
function buildNodeLabel(app){
  const limits = { none: 0, compact: 6, standard: 10, full: 16 };
  const maxLines = limits[ER_OPTIONS.fieldDensity] !== undefined ? limits[ER_OPTIONS.fieldDensity] : limits.standard;
  const fields = visibleFieldsForNode(app);
  const ordered = fields.slice().sort((a,b)=>{
    const score = (f)=> (f.isPK ? 0 : (f.isLookup ? 1 : (f.isRef ? 2 : (f.required ? 3 : (f.inSubtable ? 5 : 4)))));
    const diff = score(a) - score(b);
    if(diff !== 0) return diff;
    return String(buildFieldDisplayName(a) || a.code || '').localeCompare(String(buildFieldDisplayName(b) || b.code || ''));
  });
  const preview = maxLines > 0 ? ordered.slice(0, maxLines).map((f)=>buildFieldPreviewLine(f)) : [];
  if(maxLines > 0 && ordered.length > maxLines) preview.push("… 他 " + (ordered.length - maxLines) + " 項目");
  const totalFieldCount = typeof app.totalFieldCount === "number" ? app.totalFieldCount : fields.length;
  const fieldCountText = totalFieldCount > fields.length
    ? fields.length + "/" + totalFieldCount + "項目"
    : fields.length + "項目";
  const metaParts = [app.isCustom ? "手動追加" : "App " + app.id, fieldCountText, app.relations.length + "関連"];
  if((app.depth || 0) > 0) metaParts.push("深さ" + app.depth);
  const meta = metaParts.join(" ・ ");
  const isStart = (ER_OPTIONS.startAppIds || []).map(String).includes(String(app.id));
  const statusPrefix = app.ok === false || app.status === "failed"
    ? "⚠ 取得失敗 "
    : (app.status === "partial" ? "△ 一部取得 " : "");
  const title = statusPrefix + (isStart ? "★ " : "") + app.name;
  if(!preview.length) return [title, meta].join("\\n");
  const bodyLines = [title, meta, ...preview];
  const maxUnits = bodyLines.reduce((max, line)=>Math.max(max, estimateLabelLineUnits(line)), 0);
  const divider = "─".repeat(Math.min(32, Math.max(10, Math.round(maxUnits * 1.4))));
  return [title, meta, divider, ...preview].join("\\n");
}
function buildSemanticNodeLabel(app){
  const fields = allFieldsForApp(app).filter(f=>!isFieldHidden(app, f));
  const totalFieldCount = typeof app.totalFieldCount === "number" ? app.totalFieldCount : fields.length;
  const isStart = (ER_OPTIONS.startAppIds || []).map(String).includes(String(app.id));
  const statusPrefix = app.ok === false || app.status === "failed"
    ? "⚠ 取得失敗 "
    : (app.status === "partial" ? "△ 一部取得 " : "");
  const title = statusPrefix + (isStart ? "★ " : "") + app.name;
  return [title, "App " + app.id + " ・ " + totalFieldCount + "項目 ・ " + app.relations.length + "関連"].join("\\n");
}
function detailFieldGroups(app){
  const groups={pk:[],lookup:[],ref:[],required:[],subtable:[],normal:[]};
  visibleFieldsForNode(app).forEach(f=>{
    if(f.isPK) groups.pk.push(f);
    else if(f.isLookup) groups.lookup.push(f);
    else if(f.isRef) groups.ref.push(f);
    else if(f.type==="SUBTABLE") groups.subtable.push(f);
    else if(f.required) groups.required.push(f);
    else groups.normal.push(f);
  });
  return groups;
}
function layoutDisplayName(name){
  const map = { dagre:"Dagre", breadthfirst:"ツリー", cose:"フォース", concentric:"同心円", grid:"グリッド", circle:"円形" };
  return map[name] || name || "-";
}
function buildLayoutOptions(name, initial){
  const base = { padding: 80, animate: !initial, animationDuration: initial ? 0 : 550, fit: true };
  if(name === "dagre" && ER_DAGRE_READY){
    return Object.assign(base, { name: "dagre", rankDir: "LR", rankSep: 170, nodeSep: 48, edgeSep: 24, spacingFactor: 1.1 });
  }
  if(name === "grid") return Object.assign(base, { name: "grid", rows: Math.ceil(Math.sqrt(APPS.length || 1)) });
  if(name === "circle") return Object.assign(base, { name: "circle" });
  if(name === "breadthfirst") return Object.assign(base, { name: "breadthfirst", directed: true, spacingFactor: 1.6, circle: false });
  if(name === "concentric") return Object.assign(base, { name: "concentric", concentric: n => (n.data("relCount") || 0) + 1, levelWidth: () => 2 });
  return Object.assign(base, { name: "cose", nodeRepulsion: 900000, idealEdgeLength: 280, gravity: 0.22, numIter: 1400 });
}
function densityNodeMetrics(){
  if(ER_OPTIONS.fieldDensity === "none") return { maxWidth:"240px", fontSize:"11px", padding:"14px", lineHeight:"1.35" };
  if(ER_OPTIONS.fieldDensity === "compact") return { maxWidth:"230px", fontSize:"9px", padding:"12px", lineHeight:"1.22" };
  if(ER_OPTIONS.fieldDensity === "full") return { maxWidth:"320px", fontSize:"10.5px", padding:"18px", lineHeight:"1.35" };
  return { maxWidth:"280px", fontSize:"10px", padding:"15px", lineHeight:"1.3" };
}
function buildCyStyle(palette){
  const nodeMetrics = densityNodeMetrics();
  return [
    {selector:"node",style:{
      "shape":"round-rectangle","label":"data(label)","text-valign":"center","text-halign":"center",
      "text-justification":"left",
      "text-wrap":"wrap","text-max-width":nodeMetrics.maxWidth,"font-size":nodeMetrics.fontSize,"line-height":nodeMetrics.lineHeight,"min-zoomed-font-size":6.5,
      "font-family":"'DM Sans','Hiragino Sans','Yu Gothic UI',sans-serif","font-weight":600,"color":palette.text,
      "text-outline-color":palette.surface,"text-outline-width":"1px",
      "background-color":palette.surface,"border-width":2,"border-color":palette.border,"padding":nodeMetrics.padding,"width":"label","height":"label"
    }},
    {selector:"node.no-link",style:{"border-style":"dashed","opacity":0.92}},
    {selector:"node[?isError]",style:{"border-color":palette.req,"background-color":isDark ? "#220b12" : "#fff1f2"}},
    {selector:"node[?isPartial]",style:{"border-color":palette.action,"border-style":"dashed","background-color":isDark ? "#211708" : "#fffbeb"}},
    {selector:"node[?isGhost]",style:{"border-color":palette.dim,"border-style":"dashed","background-color":palette.surface2,"color":palette.dim,"font-style":"italic"}},
    {selector:"node.semantic-low",style:{"font-size":"18px","font-weight":700,"line-height":"1.35","text-max-width":"300px","min-zoomed-font-size":6,"padding":"16px","width":"label","height":"label"}},
    {selector:"node[?isCustom]",style:{"border-style":"dashed","border-color":palette.accent2}},
    {selector:"node[?isStart]",style:{"border-color":palette.accent2,"border-width":4,"background-color":isDark ? "#11162d" : "#eef2ff"}},
    {selector:"node[?inSpace]",style:{"border-color":"#0ea5a4","border-width":4,"border-style":"double","background-color":isDark ? "#06231f" : "#ecfdf5"}},
    {selector:"node[?accent]",style:{"border-color":"data(accent)","border-width":3}},
    {selector:"node:selected",style:{"border-color":palette.accent,"border-width":4,"overlay-color":"transparent"}},
    {selector:"node.highlighted",style:{"border-color":palette.pk,"border-width":3,"background-color":isDark ? "#1a1805" : "#fffbeb"}},
    {selector:"node.analysis-hit",style:{"border-color":palette.req,"border-width":5,"background-color":isDark ? "#2a0b16" : "#fff1f2","z-index":1000}},
    {selector:"node.analysis-dim",style:{"opacity":0.1}},
    {selector:"node.path-node",style:{"border-color":"#f472b6","border-width":4,"background-color":isDark ? "#1a0a12" : "#fdf2f8"}},
    {selector:"node.focus-root",style:{"border-color":palette.accent,"border-width":4,"background-color":isDark ? "#042525" : "#ecfeff","z-index":999}},
    {selector:"node.focus-neighbor",style:{"border-color":"#67e8f9","border-width":3,"background-color":isDark ? "#061d2a" : "#ecfeff"}},
    {selector:"node.pinned-node",style:{"border-color":palette.pk,"border-width":4,"background-color":isDark ? "#2a1f05" : "#fff7ed"}},
    {selector:"node.note-node",style:{
      "shape":"round-rectangle","background-color":"data(noteColor)","background-opacity":0.96,
      "border-width":1,"border-color":"#8a8a8a","color":"#1f2430",
      "text-outline-width":0,"font-size":"11px","font-weight":500,
      "text-wrap":"wrap","text-max-width":"230px","text-valign":"center","text-halign":"center",
      "padding":"12px","width":"label","height":"label","line-height":"1.4","z-index":5
    }},
    {selector:"node.note-node:selected",style:{"border-color":palette.accent,"border-width":3}},
    {selector:"node.isolated-by-filter",style:{"opacity":0.35}},
    {selector:"node.focus-dim",style:{"opacity":0.08}},
    {selector:"node.dimmed",style:{"opacity":0.14}},
    {selector:"node.app-manual-hidden",style:{"display":"none"}},
    {selector:"edge",style:{
      "curve-style":"bezier","arrow-scale":1.15,
      "label":"data(label)","font-size":"10px","font-weight":600,"min-zoomed-font-size":7,
      "font-family":"'DM Sans','Hiragino Sans','Yu Gothic UI',sans-serif",
      "text-background-color":palette.surface,"text-background-opacity":0.92,
      "text-background-padding":"4px","text-background-shape":"roundrectangle",
      "text-border-color":palette.border,"text-border-width":1,"text-border-opacity":0.6
    }},
    {selector:'edge[kind="LOOKUP"]',style:{
      "width":2.5,"line-color":palette.lookup,"target-arrow-color":palette.lookup,"target-arrow-shape":"triangle",
      "source-arrow-shape":"circle","source-arrow-color":palette.lookup,"color":palette.lookup
    }},
    {selector:'edge[kind="REF"]',style:{
      "width":2,"line-color":palette.ref,"line-style":"dashed","target-arrow-color":palette.ref,
      "target-arrow-shape":"triangle","source-arrow-shape":"diamond","source-arrow-color":palette.ref,"color":palette.ref
    }},
    {selector:'edge[kind="ACTION"]',style:{
      "width":2.2,"line-color":palette.action,"line-style":"dotted","target-arrow-color":palette.action,
      "target-arrow-shape":"triangle","source-arrow-shape":"none","color":palette.action
    }},
    {selector:"edge[?isUnresolved]",style:{"line-style":"dashed","opacity":0.75}},
    {selector:"edge.label-hidden",style:{"text-opacity":0,"text-background-opacity":0,"text-border-opacity":0}},
    {selector:"edge.edge-hover",style:{"width":4,"z-index":997,"text-opacity":1,"text-background-opacity":0.95,"text-border-opacity":0.9}},
    {selector:"edge.path-edge",style:{"width":4,"line-color":"#f472b6","target-arrow-color":"#f472b6","source-arrow-color":"#f472b6","z-index":999}},
    {selector:"edge.focus-edge",style:{"width":4,"line-color":palette.accent,"target-arrow-color":palette.accent,"source-arrow-color":palette.accent,"z-index":998}},
    {selector:"edge.semantic-low",style:{"text-opacity":0,"text-background-opacity":0,"text-border-opacity":0}},
    {selector:"edge.rel-hidden",style:{"display":"none"}},
    {selector:"edge.rel-manual-hidden",style:{"display":"none"}},
    {selector:"edge.edge-collapsed",style:{"display":"none"}},
    {selector:"edge.focus-dim",style:{"opacity":0.04}},
    {selector:"edge.dimmed",style:{"opacity":0.08}}
  ];
}
function applyTheme(){
  document.documentElement.setAttribute("data-theme",isDark?"":"light");
  document.getElementById("theme-btn").textContent=isDark?"🌙":"☀️";
}
function toggleTheme(){
  isDark=!isDark;
  applyTheme();
  applyCyTheme();
  toast(isDark?"ダークモード":"ライトモード");
}
applyTheme();

// ─── 手動追加のデータ層（編集済みHTMLの復元でも使用） ───
let customAppSeq=0, customRelSeq=0, customFieldSeq=0;

function findApp(id){
  if(appMap.has(id)) return appMap.get(id);
  const n=Number(id);
  if(appMap.has(n)) return appMap.get(n);
  const s=String(id);
  return appMap.has(s) ? appMap.get(s) : null;
}
function registerManualApp(app){
  app.relations = Array.isArray(app.relations) ? app.relations : [];
  app.fields = Array.isArray(app.fields) ? app.fields : [];
  app.allFields = Array.isArray(app.allFields) ? app.allFields : app.fields.slice();
  app.isCustom = true;
  if(app.ok === undefined) app.ok = true;
  APPS.push(app);
  appMap.set(app.id, app);
}
function applyManualFieldData(app, field){
  app.fields.push(field);
  if(Array.isArray(app.allFields)) app.allFields.push(field);
  if(typeof app.totalFieldCount === "number") app.totalFieldCount += 1;
  if(field.required) app.requiredCount = (app.requiredCount||0)+1;
}
function applyManualRelationData(app, rel){
  app.relations.push(rel);
  if(rel.kind === "LOOKUP") app.lookupCount = (app.lookupCount||0)+1;
  if(rel.kind === "REF") app.refCount = (app.refCount||0)+1;
}
// ─── 上書き編集のデータ層（アプリ名/枠色・項目・関連線。編集済みHTMLで永続化） ───
const appOverrides=(ER_EDIT_STATE&&ER_EDIT_STATE.appOverrides)||{};
const fieldOverrides=(ER_EDIT_STATE&&ER_EDIT_STATE.fieldOverrides)||{};
const relationOverrides=(ER_EDIT_STATE&&ER_EDIT_STATE.relationOverrides)||{};
function findFieldByKey(app,key){
  const prefix=String(app.id)+"::";
  if(String(key).indexOf(prefix)!==0) return null;
  const suffix=String(key).slice(prefix.length);
  const match=(f)=>String(f.path||f.code||f.label||"")===suffix;
  return (app.allFields||[]).find(match)||(app.fields||[]).find(match)||null;
}
function parseEdgeId(edgeId){
  const m=/^e_(-?\\d+)_(\\d+)$/.exec(String(edgeId||""));
  if(!m) return null;
  return {appId:Number(m[1]),ri:Number(m[2])};
}
function appAccentColor(app){
  const o=appOverrides[app.id]||appOverrides[String(app.id)];
  return (o&&o.color)||"";
}
function applyDataOverrides(){
  Object.keys(appOverrides).forEach(id=>{
    const o=appOverrides[id];
    const app=findApp(id);
    if(app&&o&&o.name) app.name=o.name;
  });
  Object.keys(fieldOverrides).forEach(key=>{
    const app=findApp(String(key).split("::")[0]);
    if(!app) return;
    const field=findFieldByKey(app,key);
    if(field) Object.assign(field,fieldOverrides[key]);
  });
  Object.keys(relationOverrides).forEach(edgeId=>{
    const ref=parseEdgeId(edgeId);
    if(!ref) return;
    const app=findApp(ref.appId);
    const rel=app&&(app.relations||[])[ref.ri];
    if(rel) Object.assign(rel,relationOverrides[edgeId]);
  });
}

// 編集済みHTMLからの復元: 手動追加データを描画前に再適用する
if(ER_EDIT_STATE){
  try{
    (ER_EDIT_STATE.customApps||[]).forEach(raw=>{ if(raw && raw.id !== undefined && !appMap.has(raw.id)) registerManualApp(raw); });
    (ER_EDIT_STATE.customFields||[]).forEach(item=>{ const app=findApp(item && item.appId); if(app && item.field) applyManualFieldData(app, item.field); });
    (ER_EDIT_STATE.customRelations||[]).forEach(item=>{ const app=findApp(item && item.fromAppId); if(app && item.rel) applyManualRelationData(app, item.rel); });
    if(ER_EDIT_STATE.seq){
      customAppSeq=Number(ER_EDIT_STATE.seq.app)||0;
      customRelSeq=Number(ER_EDIT_STATE.seq.rel)||0;
      customFieldSeq=Number(ER_EDIT_STATE.seq.field)||0;
    }
  }catch(err){ console.error("[ER] 編集状態の復元に失敗", err); }
}
try{ applyDataOverrides(); }catch(err){ console.error("[ER] 上書き編集の復元に失敗", err); }

// ─── Cytoscape Init ───
const startAppIdSet = new Set((ER_OPTIONS.startAppIds || []).map((id)=>String(id)));
const spaceAppIdSet = new Set((ER_OPTIONS.spaceAppIds || []).map((id)=>String(id)));
const erSpaceId = String(ER_OPTIONS.spaceId || "");
const isInSpaceApp = (app)=> !!erSpaceId && (spaceAppIdSet.has(String(app.id)) || String(app.spaceId || "") === erSpaceId);
const savedPositions=(ER_EDIT_STATE && ER_EDIT_STATE.view && ER_EDIT_STATE.view.positions) || null;
const elements=[];
APPS.forEach(app=>{
  const el={data:{
    id:"a"+app.id,
    label:buildNodeLabel(app),
    appId:app.id,
    isError:!app.ok,
    isPartial:app.status==="partial",
    isStart:startAppIdSet.has(String(app.id)),
    inSpace:isInSpaceApp(app),
    isCustom:!!app.isCustom,
    accent:appAccentColor(app),
    fieldCount:visibleFieldsForNode(app).length,
    relCount:app.relations.length,
    depth:app.depth || 0
  }};
  const sp=savedPositions && savedPositions["a"+app.id];
  if(sp && typeof sp.x === "number" && typeof sp.y === "number") el.position={x:sp.x,y:sp.y};
  elements.push(el);
});
function edgeDisplayLabel(text){
  const s=String(text||"");
  return s.length > 24 ? s.slice(0, 23) + "…" : s;
}
// エッジIDは「e_アプリID_リレーション順」で安定化（編集済みHTML復元時に削除状態を引き継ぐため）
const ghostNodeIds=new Set();
APPS.forEach(app=>{
  app.relations.forEach((r,ri)=>{
    const hasTarget=appMap.has(r.toApp);
    const targetId=hasTarget?"a"+r.toApp:"g"+String(r.toApp||"unknown").replace(/[^0-9A-Za-z_-]/g,"_");
    if(!hasTarget&&r.toApp&&!ghostNodeIds.has(targetId)){
      ghostNodeIds.add(targetId);
      elements.push({data:{id:targetId,label:"未取得の参照先\\nApp "+r.toApp,appId:null,targetAppId:r.toApp,isGhost:true,fieldCount:0,relCount:0,depth:(app.depth||0)+1}});
    }
    if(hasTarget||r.toApp){
      const fullLabel = r.fromDisplay || r.fromLabel || (r.kind==="LOOKUP"?"ルックアップ":(r.kind==="REF"?"関連":"アクション"));
      elements.push({data:{id:"e_"+app.id+"_"+ri,source:"a"+app.id,target:targetId,kind:r.kind,label:edgeDisplayLabel(fullLabel),fromLabel:r.fromLabel,fromDisplay:r.fromDisplay || r.fromLabel || "",isCustom:!!r.isCustom,isUnresolved:!hasTarget}});
    }
  });
});

const hasSavedLayout=!!savedPositions;
// 初期配置は preset で置き、後段の runLayout()（紐づきなし分離対応）で配置する
const cy=cytoscape({
  container:document.getElementById("cy"),
  elements,
  style: buildCyStyle(currentPalette()),
  layout: {name:"preset",fit:false},
  minZoom:0.05,maxZoom:4,wheelSensitivity:0.25,
  boxSelectionEnabled:true,
});

function applyCyTheme(){
  cy.style().fromJson(buildCyStyle(currentPalette())).update();
}
const semanticZoomLabelBackup=new Map();
let semanticZoomActive=false;
function applySemanticZoom(zoom, force){
  const low=Number(zoom)<0.7;
  if(low===semanticZoomActive&&!force) return;
  semanticZoomActive=low;
  if(low){
    cy.nodes().not(".note-node").forEach(node=>{
      if(!node.hasClass("semantic-low")) semanticZoomLabelBackup.set(node.id(),String(node.data("label")||""));
      const app=appMap.get(node.data("appId"));
      if(app) node.data("label",buildSemanticNodeLabel(app));
      node.addClass("semantic-low");
    });
    cy.edges().addClass("semantic-low");
    return;
  }
  cy.nodes(".semantic-low").forEach(node=>{
    if(semanticZoomLabelBackup.has(node.id())) node.data("label",semanticZoomLabelBackup.get(node.id()));
    node.removeClass("semantic-low");
  });
  cy.edges().removeClass("semantic-low");
  semanticZoomLabelBackup.clear();
}
function syncLayoutButtons(name){
  document.querySelectorAll("[data-layout-btn]").forEach((btn)=>{
    btn.classList.toggle("active", btn.dataset.layoutBtn === name);
  });
}
function refreshNodeLabels(){
  APPS.forEach((app)=>{
    const node = cy.getElementById("a"+app.id);
    if(!node.length) return;
    const fullLabel=buildNodeLabel(app);
    if(semanticZoomActive){
      semanticZoomLabelBackup.set(node.id(),fullLabel);
      node.data("label",buildSemanticNodeLabel(app));
      node.addClass("semantic-low");
    }else{
      node.data("label",fullLabel);
    }
  });
}
function syncDensityControl(){
  const select = document.getElementById("density-select");
  if(select) select.value = ER_OPTIONS.fieldDensity || "standard";
  const pill = document.getElementById("density-pill");
  if(pill) pill.innerHTML = "<b>密度</b> " + formatFieldDensityLabel(ER_OPTIONS.fieldDensity);
}
function setDensity(value){
  const next = ["none","compact","standard","full"].includes(String(value)) ? String(value) : "standard";
  ER_OPTIONS.fieldDensity = next;
  // シンプルモード中に「結合のみ」以外へ変更したら、シンプルモードを解除する
  if(simpleMode && next !== "none") setSimpleMode(false, true);
  refreshNodeLabels();
  applyCyTheme();
  syncDensityControl();
  toast("表示密度: " + formatFieldDensityLabel(next));
}
function hideOverview(){
  const panel = document.getElementById("overview");
  const btn = document.getElementById("overview-toggle-btn");
  if(!panel) return;
  panel.classList.add("hidden");
  if(btn){
    btn.classList.remove("active");
    btn.title = "ガイドを開く";
  }
}
function toggleOverview(){
  const panel = document.getElementById("overview");
  const btn = document.getElementById("overview-toggle-btn");
  if(!panel) return;
  if(panel.classList.contains("hidden")){
    panel.classList.remove("hidden","collapsed");
    if(btn){ btn.classList.add("active"); btn.title = "ガイドを隠す"; }
    return;
  }
  const nextCollapsed = !panel.classList.contains("collapsed");
  panel.classList.toggle("collapsed", nextCollapsed);
  if(btn){
    btn.classList.toggle("active", !nextCollapsed);
    btn.title = nextCollapsed ? "ガイドを開く" : "ガイドを隠す";
  }
}
function updateSearchMeta(query, matched){
  const pill = document.getElementById("search-meta");
  if(!pill) return;
  const normalized = String(query || "").trim();
  if(!normalized){
    pill.innerHTML = "<b>検索</b> すべて";
    pill.title = "";
    return;
  }
  pill.innerHTML = "<b>検索</b> " + matched + "件";
  pill.title = normalized;
}

function fit(){closeZoomPresets();cy.fit(undefined,60);updateZoomLabel();}

// ─── 紐づきなしアプリの分離配置 ───
// レイアウト適用時、関連線を持たないアプリを本体グラフの下の別枠（グリッド）にまとめる
let separateNoLink = true;

function nodeHasVisibleLink(n){
  return n.connectedEdges().some(e=>{
    if(e.hasClass("rel-hidden") || e.hasClass("rel-manual-hidden")) return false;
    const other = e.source().id() === n.id() ? e.target() : e.source();
    return !other.hasClass("app-manual-hidden");
  });
}
function refreshNoLinkClasses(){
  const nodes = cy.nodes().filter(n=>!n.hasClass("app-manual-hidden") && !n.hasClass("note-node"));
  const linked = nodes.filter(n=>nodeHasVisibleLink(n));
  const isolated = nodes.not(linked);
  cy.nodes().removeClass("no-link");
  isolated.addClass("no-link");
  return { linked, isolated };
}
function appNameForNode(n){
  const app = appMap.get(n.data("appId"));
  return app ? String(app.name || "") : String(n.data("label") || "");
}
function placeNoLinkGrid(linked, isolated, animate){
  const bb = linked.boundingBox();
  let cellW = 0, cellH = 0;
  isolated.forEach(n=>{
    cellW = Math.max(cellW, n.outerWidth());
    cellH = Math.max(cellH, n.outerHeight());
  });
  cellW += 46; cellH += 42;
  const cols = Math.max(1, Math.min(isolated.length, Math.max(Math.floor(bb.w / cellW), Math.ceil(Math.sqrt(isolated.length)))));
  const startX = bb.x1 + cellW / 2;
  const startY = bb.y2 + 170 + cellH / 2;
  const sorted = isolated.sort((a,b)=>appNameForNode(a).localeCompare(appNameForNode(b), "ja"));
  sorted.forEach((n,i)=>{
    const pos = { x: startX + (i % cols) * cellW, y: startY + Math.floor(i / cols) * cellH };
    if(animate) n.animate({position:pos},{duration:380});
    else n.position(pos);
  });
}
function runLayout(name, initial){
  const parts = refreshNoLinkClasses();
  if(!separateNoLink || !parts.isolated.length || !parts.linked.length){
    // メモ(付箋)はレイアウトの対象外にして、手で置いた位置を保つ
    const lay = cy.elements().not(".note-node").layout(buildLayoutOptions(name, initial));
    if(initial) lay.one("layoutstop",()=>setTimeout(fit,200));
    lay.run();
    return;
  }
  const opts = buildLayoutOptions(name, initial);
  opts.fit = false;
  const visibleEdges = parts.linked.edgesWith(parts.linked).filter(e=>!e.hasClass("rel-hidden") && !e.hasClass("rel-manual-hidden"));
  const lay = parts.linked.union(visibleEdges).layout(opts);
  lay.one("layoutstop",()=>{
    placeNoLinkGrid(parts.linked, parts.isolated, !initial);
    setTimeout(fit, initial ? 150 : 450);
  });
  lay.run();
}
function syncSeparateNoLinkButton(){
  const btn = document.getElementById("separate-nolink-btn");
  if(btn) btn.classList.toggle("active", separateNoLink);
}
function toggleSeparateNoLink(){
  separateNoLink = !separateNoLink;
  syncSeparateNoLinkButton();
  runLayout(ER_OPTIONS.layoutName || "dagre", false);
  toast(separateNoLink ? "紐づきなしアプリを別枠にまとめました" : "分離配置を解除しました");
}

if(hasSavedLayout){
  refreshNoLinkClasses();
  if(ER_EDIT_STATE.view && typeof ER_EDIT_STATE.view.zoom === "number" && ER_EDIT_STATE.view.pan){
    cy.viewport({zoom:ER_EDIT_STATE.view.zoom, pan:ER_EDIT_STATE.view.pan});
  }else{
    setTimeout(fit,100);
  }
}else{
  runLayout(ER_OPTIONS.layoutName || "dagre", true);
}
syncLayoutButtons(ER_OPTIONS.layoutName || "dagre");
syncDensityControl();
updateSearchMeta("", 0);

// ─── Layout Switching ───
function setLayout(name){
  name=normalizeLayoutName(name);
  ER_OPTIONS.layoutName = name;
  syncLayoutButtons(name);
  const pill = document.getElementById("layout-pill");
  if(pill){pill.replaceChildren();const label=document.createElement("b");label.textContent="配置";pill.append(label," "+layoutDisplayName(name));}
  runLayout(name, false);
  toast("レイアウト: " + layoutDisplayName(name));
}

const relationKindState = { LOOKUP: true, REF: true, ACTION: true };
let relationLabelVisible = true;
let focusMode = true;
let focusDepth = 1;
let focusDirection = "both";
let currentFocusNodeId = "";
let lastTappedNodeId = "";
let activeAppId = 0;
const pinnedNodeIds = new Set();

// ─── シンプルモード（項目非表示 + 重複線の集約） ───
let simpleMode = false;
let simpleModeRestore = null; // { density, labels }
const collapsedEdgeLabelBackup = new Map(); // 代表エッジの元ラベル退避

function collapseParallelEdges(on){
  // いったん全解除
  cy.edges().removeClass("edge-collapsed");
  collapsedEdgeLabelBackup.forEach((label, id)=>{
    const e = cy.getElementById(id);
    if(e.length) e.data("label", label);
  });
  collapsedEdgeLabelBackup.clear();
  if(!on) return;
  // 同じ「起点→宛先→種類」の可視エッジを1本に集約し、線種の意味を保つ
  const groups = new Map();
  cy.edges().forEach(e=>{
    if(e.hasClass("rel-manual-hidden") || e.hasClass("rel-hidden")) return;
    const key = e.source().id() + "→" + e.target().id() + "→" + e.data("kind");
    const list = groups.get(key) || [];
    list.push(e);
    groups.set(key, list);
  });
  groups.forEach(list=>{
    if(list.length < 2) return;
    list.slice(1).forEach(e=>e.addClass("edge-collapsed"));
    const rep = list[0];
    collapsedEdgeLabelBackup.set(rep.id(), rep.data("label") || "");
    rep.data("label", list.length + "本の" + relationKindJp(rep.data("kind")));
  });
}

function syncSimpleModeButton(){
  const btn = document.getElementById("simple-mode-btn");
  if(btn) btn.classList.toggle("active", simpleMode);
}

function setSimpleMode(on, keepDensity){
  if(simpleMode === !!on) { syncSimpleModeButton(); return; }
  simpleMode = !!on;
  if(simpleMode){
    simpleModeRestore = { density: ER_OPTIONS.fieldDensity, labels: relationLabelVisible };
    ER_OPTIONS.fieldDensity = "none";
    relationLabelVisible = false;
    collapseParallelEdges(true);
  }else{
    if(!keepDensity) ER_OPTIONS.fieldDensity = (simpleModeRestore && simpleModeRestore.density && simpleModeRestore.density !== "none") ? simpleModeRestore.density : "standard";
    relationLabelVisible = simpleModeRestore ? !!simpleModeRestore.labels : true;
    simpleModeRestore = null;
    collapseParallelEdges(false);
  }
  refreshNodeLabels();
  applyCyTheme();
  syncDensityControl();
  applyRelationLabelVisibility();
  syncSimpleModeButton();
}

function toggleSimpleMode(){
  setSimpleMode(!simpleMode);
  toast(simpleMode ? "シンプルモード ON: アプリの結合関係のみ表示" : "シンプルモード OFF");
}

function syncLegendState(){
  const lookup = document.getElementById("legend-lookup-edge");
  const ref = document.getElementById("legend-ref-edge");
  const action = document.getElementById("legend-action-edge");
  if(lookup){ lookup.classList.toggle("off", !relationKindState.LOOKUP); lookup.setAttribute("aria-pressed", String(!!relationKindState.LOOKUP)); }
  if(ref){ ref.classList.toggle("off", !relationKindState.REF); ref.setAttribute("aria-pressed", String(!!relationKindState.REF)); }
  if(action){ action.classList.toggle("off", !relationKindState.ACTION); action.setAttribute("aria-pressed", String(!!relationKindState.ACTION)); }
}
function syncRelationLabelButton(){
  const btn = document.getElementById("rel-label-btn");
  if(!btn) return;
  btn.classList.toggle("active", relationLabelVisible);
  btn.textContent = relationLabelVisible ? "線ラベル" : "線ラベル OFF";
}
function applyRelationLabelVisibility(){
  cy.edges().toggleClass("label-hidden", !relationLabelVisible);
  syncRelationLabelButton();
}
function toggleRelationLabels(){
  relationLabelVisible = !relationLabelVisible;
  applyRelationLabelVisibility();
  toast(relationLabelVisible ? "線ラベルを表示" : "線ラベルを非表示");
}
function setActiveApp(appId){
  activeAppId = Number(appId) || 0;
  refreshAppList();
}

function applyRelationFilter(){
  const partialFilter = !relationKindState.LOOKUP || !relationKindState.REF || !relationKindState.ACTION;
  cy.edges().forEach(e=>{
    const visible = !!relationKindState[e.data("kind")];
    e.toggleClass("rel-hidden", !visible);
  });
  cy.nodes().forEach(n=>{
    const visibleEdgeCount = n.connectedEdges().filter(e=>!e.hasClass("rel-hidden") && !e.hasClass("rel-manual-hidden")).length;
    n.toggleClass("isolated-by-filter", partialFilter && visibleEdgeCount === 0);
  });
  if(simpleMode) collapseParallelEdges(true);
  refreshNoLinkClasses();
  syncLegendState();
}

function collectFocusSet(rootNode, depth, direction){
  let nodes = cy.collection(rootNode);
  let edges = cy.collection();
  let frontier = cy.collection(rootNode);
  const visited = new Set([rootNode.id()]);

  for(let i=0;i<depth;i++){
    let next = cy.collection();
    frontier.forEach(n=>{
      let candidateEdges = n.connectedEdges().filter(e=>!e.hasClass("rel-hidden") && !e.hasClass("rel-manual-hidden"));
      if(direction==="out") candidateEdges = candidateEdges.filter(e=>e.source().id()===n.id());
      if(direction==="in") candidateEdges = candidateEdges.filter(e=>e.target().id()===n.id());

      candidateEdges.forEach(e=>{
        edges = edges.union(e);
        let linked = cy.collection();
        if(direction==="out") linked = linked.union(e.target());
        else if(direction==="in") linked = linked.union(e.source());
        else linked = linked.union(e.connectedNodes().difference(n));

        linked.forEach(nn=>{
          if(visited.has(nn.id())) return;
          visited.add(nn.id());
          nodes = nodes.union(nn);
          next = next.union(nn);
        });
      });
    });
    frontier = next;
    if(frontier.length===0) break;
  }

  return { nodes, edges };
}

function applyFocusToNode(node, silent){
  cy.elements().removeClass("focus-root focus-neighbor focus-edge focus-dim");
  if(!focusMode || !node || !node.length) return;

  const depth = Math.max(1, Number(focusDepth) || 1);
  const result = collectFocusSet(node, depth, focusDirection);
  cy.elements().not(".note-node").addClass("focus-dim");
  result.nodes.removeClass("focus-dim").addClass("focus-neighbor");
  result.edges.removeClass("focus-dim").addClass("focus-edge");
  node.removeClass("focus-neighbor").addClass("focus-root");
  currentFocusNodeId = node.id();

  if(!silent){
    const relatedCount = Math.max(0, result.nodes.length - 1);
    toast("関連強調: "+relatedCount+"アプリ");
  }
}

function clearFocus(silent){
  currentFocusNodeId = "";
  cy.elements().removeClass("focus-root focus-neighbor focus-edge focus-dim");
  if(!silent) toast("関連強調を解除");
}

function syncFocusButton(){
  const btn = document.getElementById("focus-toggle-btn");
  if(!btn) return;
  btn.classList.toggle("active", focusMode);
  btn.textContent = focusMode ? "🎯 ON" : "🎯 OFF";
}
function syncRelationKindButtons(){
  ["LOOKUP","REF","ACTION"].forEach(kind=>{
    const btn = document.getElementById(kind==="LOOKUP" ? "rel-lookup-btn" : (kind==="REF" ? "rel-ref-btn" : "rel-action-btn"));
    if(btn) btn.classList.toggle("active", !!relationKindState[kind]);
  });
}
function toggleFocusMode(){
  focusMode = !focusMode;
  syncFocusButton();
  if(!focusMode) clearFocus(true);
  else if(currentFocusNodeId) applyFocusToNode(cy.getElementById(currentFocusNodeId), true);
  toast(focusMode ? "関連強調 ON" : "関連強調 OFF");
}

function updateFocusOptions(){
  focusDepth = Number(document.getElementById("focus-depth")?.value || 1);
  focusDirection = document.getElementById("focus-direction")?.value || "both";
  if(focusMode && currentFocusNodeId) applyFocusToNode(cy.getElementById(currentFocusNodeId), true);
}


// ─── 元に戻す (Undo) ───
const undoStack = [];
function pushUndo(label, fn){
  undoStack.push({label, fn});
  if(undoStack.length > 60) undoStack.shift();
}
function undoLast(){
  const entry = undoStack.pop();
  if(!entry){toast("元に戻す操作はありません");return;}
  try{ entry.fn(); }catch(err){ console.error("[ER] undo failed", err); }
  toast("元に戻す: "+entry.label);
}

const manuallyRemovedEdgeIds = new Set();
const manuallyRemovedNodeIds = new Set();
const nodeHiddenEdgeIds = new Set();

function hideRelationEdges(edges){
  const ids = edges.map(e=>e.id());
  edges.forEach((e)=>{ manuallyRemovedEdgeIds.add(e.id()); e.addClass("rel-manual-hidden"); });
  pushUndo("関連線削除 "+ids.length+"件", ()=>{
    ids.forEach(id=>{
      manuallyRemovedEdgeIds.delete(id);
      const e = cy.getElementById(id);
      if(e.length) e.removeClass("rel-manual-hidden");
    });
    applyRelationFilter();
    if(focusMode && currentFocusNodeId) applyFocusToNode(cy.getElementById(currentFocusNodeId), true);
  });
}

function removeSelectedRelations(){
  const edges = cy.edges(":selected");
  if(!edges.length){toast("削除対象の関連線を選択してください");return;}
  hideRelationEdges(edges);
  if(focusMode && currentFocusNodeId) applyFocusToNode(cy.getElementById(currentFocusNodeId), true);
  applyRelationFilter();
  toast("関連線を手動削除: "+edges.length+"件");
}

function restoreRemovedRelations(){
  let restored = 0;
  manuallyRemovedEdgeIds.forEach((id)=>{
    const edge = cy.getElementById(id);
    if(edge.length){ edge.removeClass("rel-manual-hidden"); restored += 1; }
  });
  manuallyRemovedEdgeIds.clear();
  if(focusMode && currentFocusNodeId) applyFocusToNode(cy.getElementById(currentFocusNodeId), true);
  applyRelationFilter();
  toast(restored ? ("手動削除した関連線を復元: "+restored+"件") : "復元対象がありません");
}

function hideAppNodes(nodes){
  const nodeIds = [], newEdgeIds = [];
  let edgeCount = 0;
  nodes.forEach((node)=>{
    manuallyRemovedNodeIds.add(node.id());
    nodeIds.push(node.id());
    node.addClass("app-manual-hidden");
    node.connectedEdges().forEach((edge)=>{
      if(!nodeHiddenEdgeIds.has(edge.id()) && !manuallyRemovedEdgeIds.has(edge.id())) newEdgeIds.push(edge.id());
      nodeHiddenEdgeIds.add(edge.id());
      if(!edge.hasClass("rel-manual-hidden")) edgeCount += 1;
      edge.addClass("rel-manual-hidden");
    });
  });
  pushUndo("アプリ削除 "+nodeIds.length+"件", ()=>{
    nodeIds.forEach(id=>{
      manuallyRemovedNodeIds.delete(id);
      const n = cy.getElementById(id);
      if(n.length) n.removeClass("app-manual-hidden");
    });
    newEdgeIds.forEach(id=>{
      nodeHiddenEdgeIds.delete(id);
      const e = cy.getElementById(id);
      if(e.length) e.removeClass("rel-manual-hidden");
    });
    applyRelationFilter();
    refreshAppList();
    if(focusMode && currentFocusNodeId) applyFocusToNode(cy.getElementById(currentFocusNodeId), true);
  });
  return edgeCount;
}

function removeSelectedApps(){
  let nodes = cy.nodes(":selected").not(".app-manual-hidden").not(".note-node");
  if(!nodes.length && lastTappedNodeId){
    const n = cy.getElementById(lastTappedNodeId);
    if(n.length && !n.hasClass("app-manual-hidden") && !n.hasClass("note-node")) nodes = nodes.union(n);
  }
  if(!nodes.length){toast("削除対象のアプリを選択してください");return;}
  const edgeCount = hideAppNodes(nodes);
  applyRelationFilter();
  refreshAppList();
  if(focusMode && currentFocusNodeId) applyFocusToNode(cy.getElementById(currentFocusNodeId), true);
  toast("アプリを手動削除: "+nodes.length+"件 / 関連線 "+edgeCount+"件");
}

function restoreRemovedApps(){
  let restoredNodes = 0;
  manuallyRemovedNodeIds.forEach((id)=>{
    const node = cy.getElementById(id);
    if(node.length){
      node.removeClass("app-manual-hidden");
      restoredNodes += 1;
    }
  });
  let restoredEdges = 0;
  nodeHiddenEdgeIds.forEach((id)=>{
    const edge = cy.getElementById(id);
    if(!edge.length) return;
    if(manuallyRemovedEdgeIds.has(id)) return;
    edge.removeClass("rel-manual-hidden");
    restoredEdges += 1;
  });
  manuallyRemovedNodeIds.clear();
  nodeHiddenEdgeIds.clear();
  applyRelationFilter();
  refreshAppList();
  if(focusMode && currentFocusNodeId) applyFocusToNode(cy.getElementById(currentFocusNodeId), true);
  toast(restoredNodes ? ("手動削除したアプリを復元: "+restoredNodes+"件 / 関連線 "+restoredEdges+"件") : "復元対象のアプリがありません");
}
function toggleRelationKind(kind){
  relationKindState[kind] = !relationKindState[kind];
  const btn = document.getElementById(kind==="LOOKUP" ? "rel-lookup-btn" : (kind==="REF" ? "rel-ref-btn" : "rel-action-btn"));
  if(btn) btn.classList.toggle("active", !!relationKindState[kind]);
  applyRelationFilter();
  if(focusMode && currentFocusNodeId) applyFocusToNode(cy.getElementById(currentFocusNodeId), true);
  const label = kind === "LOOKUP" ? "ルックアップ" : (kind === "REF" ? "関連" : "アクション");
  toast(label + "線: " + (relationKindState[kind] ? "表示" : "非表示"));
}

function pinNode(node,silent){
  if(!node || !node.length) return;
  node.lock();
  node.addClass("pinned-node");
  pinnedNodeIds.add(node.id());
  if(!silent) toast("固定: "+(appMap.get(node.data("appId"))?.name || node.id()));
}

function unpinNode(node,silent){
  if(!node || !node.length) return;
  node.unlock();
  node.removeClass("pinned-node");
  pinnedNodeIds.delete(node.id());
  if(!silent) toast("固定解除: "+(appMap.get(node.data("appId"))?.name || node.id()));
}

function togglePinFromSelection(){
  let nodes = cy.nodes(":selected");
  if(!nodes.length && lastTappedNodeId){
    const n = cy.getElementById(lastTappedNodeId);
    if(n.length) nodes = nodes.union(n);
  }
  if(!nodes.length){toast("固定対象ノードを選択してください");return;}
  const allPinned = nodes.every(n=>pinnedNodeIds.has(n.id()));
  nodes.forEach(n=>{if(allPinned) unpinNode(n,true); else pinNode(n,true);});
  toast(allPinned ? "選択ノードの固定を解除" : "選択ノードを固定");
}

function clearPins(){
  [...pinnedNodeIds].forEach(id=>{
    const n = cy.getElementById(id);
    if(n.length) n.unlock().removeClass("pinned-node");
  });
  pinnedNodeIds.clear();
  toast("固定を全解除");
}

applyRelationFilter();
applyRelationLabelVisibility();
updateFocusOptions();

// ─── Manual additions (アプリ / 項目 / 関連線の手動追加 UI) ───
let editorMode="";
let pendingNodePos=null;

function appOptionsHtml(selectedId){
  return APPS.map(a=>'<option value="'+escapeHtml(String(a.id))+'"'+(String(a.id)===String(selectedId)?" selected":"")+'>'+escapeHtml(a.name)+(a.isCustom?"（手動）":" (App "+escapeHtml(String(a.id))+")")+'</option>').join("");
}
const MANUAL_FIELD_TYPES=[["SINGLE_LINE_TEXT","文字列(1行)"],["MULTI_LINE_TEXT","文字列(複数行)"],["NUMBER","数値"],["CALC","計算"],["DATE","日付"],["DATETIME","日時"],["DROP_DOWN","ドロップダウン"],["CHECK_BOX","チェックボックス"],["USER_SELECT","ユーザー選択"],["FILE","添付ファイル"],["LINK","リンク"],["RECORD_NUMBER","レコード番号"]];
function openEditor(mode, title, sub, bodyHtml, opts){
  const o=opts||{};
  editorMode=mode;
  document.getElementById("editor-title").textContent=title;
  document.getElementById("editor-sub").textContent=sub;
  document.getElementById("editor-body").innerHTML=bodyHtml;
  const submitBtn=document.getElementById("editor-submit");
  if(submitBtn) submitBtn.textContent=o.submitLabel||"追加";
  const delBtn=document.getElementById("editor-delete");
  if(delBtn) delBtn.style.display=o.showDelete?"":"none";
  document.getElementById("editor-overlay").classList.add("open");
  const first=document.querySelector("#editor-body input,#editor-body select,#editor-body textarea");
  if(first) setTimeout(()=>{try{first.focus();}catch(_){}},50);
}
function closeEditor(){
  editorMode=""; pendingNodePos=null; editingNoteId=""; editingAppId=""; editingFieldRef=null; editingRelRef=null;
  document.getElementById("editor-overlay").classList.remove("open");
}
function submitEditor(){
  if(editorMode==="app") addCustomApp();
  else if(editorMode==="field") addCustomField();
  else if(editorMode==="rel") addCustomRelation();
  else if(editorMode==="note-add") submitNoteAdd();
  else if(editorMode==="note-edit") submitNoteEdit();
  else if(editorMode==="edit-app") submitEditApp();
  else if(editorMode==="edit-field") submitEditField();
  else if(editorMode==="edit-rel") submitEditRelation();
}
function deleteFromEditor(){
  if(editorMode==="note-edit"){
    const node=cy.getElementById(editingNoteId);
    if(node.length) deleteNoteNodes(node);
    closeEditor();
    toast("メモを削除しました");
  }
}
function currentTargetAppId(){
  if(activeAppId) return activeAppId;
  if(lastTappedNodeId){
    const n=cy.getElementById(lastTappedNodeId);
    if(n.length) return n.data("appId");
  }
  return APPS.length ? APPS[0].id : "";
}
function openAddApp(pos){
  pendingNodePos=pos||null;
  openEditor("app","⬡ アプリ(エンティティ)を追加","図にだけ存在する手動エンティティを追加します（kintone上には作成されません）",
    '<div class="ed-row"><label>アプリ名 *</label><input id="ed-app-name" placeholder="例: 外部システム / 顧客マスタ(構想)"></div>'
    +'<div class="ed-row"><label>初期項目（任意・1行に1項目）</label><textarea id="ed-app-fields" placeholder="顧客名&#10;!顧客コード&#10;*金額"></textarea>'
    +'<div class="ed-hint">行頭の記号で区分を指定できます: <b>!</b> 主キー 🔑 / <b>*</b> 必須 ✱ / 無印 通常項目。項目は後から「項目を追加」でも足せます。</div></div>');
}
function openAddField(){
  if(!APPS.length){toast("追加先のアプリがありません");return;}
  openEditor("field","📝 アプリに項目を追加","選択したアプリのノード表示・詳細パネル・各エクスポートに項目を追加します",
    '<div class="ed-row"><label>対象アプリ</label><select id="ed-field-app">'+appOptionsHtml(currentTargetAppId())+'</select></div>'
    +'<div class="ed-row"><label>項目名 *</label><input id="ed-field-name" placeholder="例: 承認ステータス"></div>'
    +'<div class="ed-row"><label>フィールドコード（任意）</label><input id="ed-field-code" placeholder="未入力なら自動採番"></div>'
    +'<div class="ed-row"><label>種類</label><select id="ed-field-type">'+MANUAL_FIELD_TYPES.map(t=>'<option value="'+t[0]+'">'+t[1]+'</option>').join("")+'</select></div>'
    +'<div class="ed-row"><label>区分</label><select id="ed-field-kind"><option value="">通常</option><option value="pk">主キー 🔑</option><option value="required">必須 ✱</option><option value="lookup">ルックアップ 🔗</option><option value="ref">関連レコード 📋</option></select></div>');
}
function openAddRelation(){
  if(APPS.length<2){toast("関連線を引くにはアプリが2つ以上必要です");return;}
  openEditor("rel","🔗 関連線を追加","2つのアプリ間に手動で関連線を引きます（リレーション一覧・各エクスポートにも反映）",
    '<div class="ed-row"><label>起点アプリ</label><select id="ed-rel-from">'+appOptionsHtml(currentTargetAppId())+'</select></div>'
    +'<div class="ed-row"><label>宛先アプリ</label><select id="ed-rel-to">'+appOptionsHtml("")+'</select></div>'
    +'<div class="ed-row"><label>種類</label><select id="ed-rel-kind"><option value="LOOKUP">ルックアップ線 🔗</option><option value="REF">関連レコード線 📋</option><option value="ACTION">アクション線 ⚡</option></select></div>'
    +'<div class="ed-row"><label>ラベル（任意）</label><input id="ed-rel-label" placeholder="例: 顧客参照"></div>');
}
function parseManualFieldLines(text){
  return String(text||"").split(/\\n+/).map(l=>l.trim()).filter(Boolean).slice(0,30).map(line=>{
    const isPK=line.charAt(0)==="!";
    const required=line.charAt(0)==="*";
    const label=line.replace(/^[!*]\\s*/,"").trim();
    customFieldSeq+=1;
    return {code:"manual_"+customFieldSeq,label:label||("項目"+customFieldSeq),type:isPK?"RECORD_NUMBER":"SINGLE_LINE_TEXT",required:required||isPK,isPK,unique:isPK,isCustom:true};
  });
}
function addCustomApp(){
  const name=(document.getElementById("ed-app-name").value||"").trim();
  if(!name){toast("アプリ名を入力してください");return;}
  const fields=parseManualFieldLines(document.getElementById("ed-app-fields").value);
  customAppSeq+=1;
  const id=-customAppSeq;
  const app={id,name,fields,totalFieldCount:fields.length,relations:[],ok:true,depth:0,isCustom:true,
    requiredCount:fields.filter(f=>f.required).length,lookupCount:0,refCount:0};
  registerManualApp(app);
  const ext=cy.extent();
  const pos=pendingNodePos||{x:(ext.x1+ext.x2)/2+(Math.random()*60-30),y:(ext.y1+ext.y2)/2+(Math.random()*60-30)};
  const node=cy.add({group:"nodes",data:{id:"a"+id,label:buildNodeLabel(app),appId:id,isError:false,isStart:false,inSpace:false,isCustom:true,accent:"",fieldCount:fields.length,relCount:0,depth:0},position:pos});
  if(semanticZoomActive) applySemanticZoom(cy.zoom(),true);
  commands.push({label:"アプリ: "+app.name+" (手動追加)",icon:"⬡",appId:id,action:()=>focusApp(id)});
  pushUndo("エンティティ追加",()=>{
    const n=cy.getElementById("a"+id);
    if(n.length) cy.remove(n);
    const idx=APPS.indexOf(app);
    if(idx>=0) APPS.splice(idx,1);
    appMap.delete(app.id);
    refreshSidebar();
    if(String(activeAppId)===String(app.id)) closeDetail();
  });
  refreshSidebar();
  closeEditor();
  node.select();
  renderAppDetail(app);
  toast("エンティティを追加: "+name);
}
function addCustomField(){
  const app=findApp(document.getElementById("ed-field-app").value);
  if(!app){toast("対象アプリが見つかりません");return;}
  const name=(document.getElementById("ed-field-name").value||"").trim();
  if(!name){toast("項目名を入力してください");return;}
  const codeInput=(document.getElementById("ed-field-code").value||"").trim();
  const type=document.getElementById("ed-field-type").value||"SINGLE_LINE_TEXT";
  const kind=document.getElementById("ed-field-kind").value;
  customFieldSeq+=1;
  const field={code:codeInput||("manual_"+customFieldSeq),label:name,type,
    required:kind==="required"||kind==="pk",isPK:kind==="pk",unique:kind==="pk",
    isLookup:kind==="lookup",isRef:kind==="ref",isCustom:true};
  applyManualFieldData(app,field);
  pushUndo("項目追加",()=>{
    const fi=app.fields.indexOf(field); if(fi>=0) app.fields.splice(fi,1);
    const ai=(app.allFields||[]).indexOf(field); if(ai>=0) app.allFields.splice(ai,1);
    if(typeof app.totalFieldCount==="number") app.totalFieldCount=Math.max(0,app.totalFieldCount-1);
    if(field.required) app.requiredCount=Math.max(0,(app.requiredCount||0)-1);
    afterFieldVisibilityChange(app);
  });
  const node=cy.getElementById("a"+app.id);
  if(node.length){
    node.data("label",buildNodeLabel(app));
    node.data("fieldCount",visibleFieldsForNode(app).length);
  }
  refreshSidebar();
  if(String(activeAppId)===String(app.id)) renderAppDetail(app);
  closeEditor();
  toast("項目を追加: "+name+" → "+app.name);
}
function addCustomRelation(){
  const from=findApp(document.getElementById("ed-rel-from").value);
  const to=findApp(document.getElementById("ed-rel-to").value);
  if(!from||!to){toast("アプリを選択してください");return;}
  if(String(from.id)===String(to.id)){toast("起点と宛先が同じアプリです");return;}
  const kind=document.getElementById("ed-rel-kind").value||"LOOKUP";
  const kindLabel=kind==="LOOKUP"?"ルックアップ":(kind==="REF"?"関連":"アクション");
  const label=(document.getElementById("ed-rel-label").value||"").trim()||(kindLabel+"(手動)");
  customRelSeq+=1;
  const rel={from:"__MANUAL__"+customRelSeq,fromLabel:label,fromDisplay:label,toApp:to.id,toField:"",kind,isCustom:true};
  const relIndex=from.relations.length;
  applyManualRelationData(from,rel);
  cy.add({group:"edges",data:{id:"e_"+from.id+"_"+relIndex,source:"a"+from.id,target:"a"+to.id,kind,label:edgeDisplayLabel(label),fromLabel:label,fromDisplay:label,isCustom:true}});
  if(semanticZoomActive) applySemanticZoom(cy.zoom(),true);
  pushUndo("関連線追加",()=>{
    const ri=from.relations.indexOf(rel); if(ri>=0) from.relations.splice(ri,1);
    if(kind==="LOOKUP") from.lookupCount=Math.max(0,(from.lookupCount||0)-1);
    if(kind==="REF") from.refCount=Math.max(0,(from.refCount||0)-1);
    const e=cy.getElementById("e_"+from.id+"_"+relIndex);
    if(e.length) cy.remove(e);
    const n=cy.getElementById("a"+from.id);
    if(n.length){ n.data("relCount",from.relations.length); n.data("label",buildNodeLabel(from)); }
    applyRelationFilter();
    refreshSidebar();
    if(String(activeAppId)===String(from.id)) renderAppDetail(from);
  });
  const node=cy.getElementById("a"+from.id);
  if(node.length){
    node.data("relCount",from.relations.length);
    node.data("label",buildNodeLabel(from));
  }
  applyRelationFilter();
  applyRelationLabelVisibility();
  refreshSidebar();
  if(String(activeAppId)===String(from.id)) renderAppDetail(from);
  closeEditor();
  toast("関連線を追加: "+from.name+" → "+to.name);
}
document.getElementById("editor").addEventListener("keydown",e=>{
  if(e.key==="Enter"&&e.target&&e.target.tagName!=="TEXTAREA"){e.preventDefault();submitEditor();}
});

// ─── 色スウォッチ（アプリ枠色・メモ色の選択UI） ───
const APP_ACCENT_COLORS=[["","なし(既定)"],["#818cf8","藍"],["#60a5fa","青"],["#2dd4bf","青緑"],["#34d399","緑"],["#fbbf24","黄"],["#f87171","赤"],["#f472b6","桃"],["#a78bfa","紫"]];
const NOTE_COLORS=[["#fef08a","黄"],["#fbcfe8","桃"],["#bae6fd","青"],["#bbf7d0","緑"],["#fed7aa","橙"],["#e9d5ff","紫"]];
function swatchesHtml(colors,selected){
  return '<div class="ed-swatches">'+colors.map(c=>{
    const col=c[0];
    const cls="ed-swatch"+(col?"":" ed-swatch--none")+(String(selected||"")===String(col)?" selected":"");
    return '<button type="button" class="'+cls+'" data-color="'+escapeHtml(col)+'" title="'+escapeHtml(c[1])+'"'+(col?' style="background:'+escapeHtml(col)+'"':'')+' onclick="selectSwatch(this)"></button>';
  }).join("")+'</div>';
}
function selectSwatch(btn){
  btn.parentNode.querySelectorAll(".ed-swatch").forEach(b=>b.classList.remove("selected"));
  btn.classList.add("selected");
}
function selectedSwatchColor(){
  const sel=document.querySelector("#editor-body .ed-swatch.selected");
  return sel?String(sel.dataset.color||""):"";
}

// ─── アプリの編集（表示名・枠色） ───
let editingAppId="";
function openEditApp(appId){
  const app=findApp(appId!==undefined&&appId!==""?appId:currentTargetAppId());
  if(!app){toast("編集対象のアプリがありません（ノードをクリックして選択）");return;}
  editingAppId=app.id;
  openEditor("edit-app","✏ アプリを編集","図上の表示名とノードの枠色を変更します（kintone上のアプリ名は変わりません）",
    '<div class="ed-row"><label>表示名 *</label><input id="ed-eapp-name"></div>'
    +'<div class="ed-row"><label>枠色（グループ分けに便利）</label>'+swatchesHtml(APP_ACCENT_COLORS,appAccentColor(app))+'</div>',
    {submitLabel:"保存"});
  document.getElementById("ed-eapp-name").value=app.name||"";
}
function applyAppOverride(app,name,color){
  app.name=name;
  appOverrides[app.id]=Object.assign({},appOverrides[app.id],{name:name,color:color||""});
  const node=cy.getElementById("a"+app.id);
  if(node.length){
    node.data("accent",color||"");
    node.data("label",buildNodeLabel(app));
  }
  commands.forEach(c=>{ if(c.appId!==undefined&&String(c.appId)===String(app.id)) c.label="アプリ: "+name+" (ID:"+app.id+")"; });
  refreshSidebar();
  if(String(activeAppId)===String(app.id)) renderAppDetail(app);
}
function submitEditApp(){
  const app=findApp(editingAppId);
  if(!app){closeEditor();return;}
  const name=(document.getElementById("ed-eapp-name").value||"").trim();
  if(!name){toast("表示名を入力してください");return;}
  const old={name:app.name,color:appAccentColor(app)};
  applyAppOverride(app,name,selectedSwatchColor());
  pushUndo("アプリ編集",()=>{applyAppOverride(app,old.name,old.color);});
  closeEditor();
  toast("アプリを更新: "+name);
}

// ─── 項目の編集（表示名・種類・区分） ───
let editingFieldRef=null;
function openEditFieldRow(btn){
  const app=findApp(btn.dataset.app);
  if(!app) return;
  const key=decodeURIComponent(btn.dataset.key||"");
  const field=findFieldByKey(app,key);
  if(!field){toast("対象の項目が見つかりません");return;}
  editingFieldRef={appId:app.id,key};
  const currentKind=field.isPK?"pk":(field.isLookup?"lookup":(field.isRef?"ref":(field.required?"required":"")));
  const typeOptions=MANUAL_FIELD_TYPES.some(t=>t[0]===field.type)?MANUAL_FIELD_TYPES:[[field.type,fieldTypeJpLabel(field.type)]].concat(MANUAL_FIELD_TYPES);
  openEditor("edit-field","✎ 項目を編集","図上の表示名・種類・区分を変更します（kintone上の設定は変わりません）",
    '<div class="ed-row"><label>項目名 *</label><input id="ed-efield-name"></div>'
    +'<div class="ed-row"><label>種類</label><select id="ed-efield-type">'+typeOptions.map(t=>'<option value="'+escapeHtml(t[0])+'"'+(t[0]===field.type?" selected":"")+'>'+escapeHtml(t[1])+'</option>').join("")+'</select></div>'
    +'<div class="ed-row"><label>区分</label><select id="ed-efield-kind">'
      +'<option value=""'+(currentKind===""?" selected":"")+'>通常</option>'
      +'<option value="pk"'+(currentKind==="pk"?" selected":"")+'>主キー 🔑</option>'
      +'<option value="required"'+(currentKind==="required"?" selected":"")+'>必須 ✱</option>'
      +'<option value="lookup"'+(currentKind==="lookup"?" selected":"")+'>ルックアップ 🔗</option>'
      +'<option value="ref"'+(currentKind==="ref"?" selected":"")+'>関連レコード 📋</option>'
    +'</select></div>'
    +'<div class="ed-hint">フィールドコード: <b>'+escapeHtml(field.code||"-")+'</b>（コードは変更できません）</div>',
    {submitLabel:"保存"});
  document.getElementById("ed-efield-name").value=field.label||"";
}
function fieldPatchFromKind(kind){
  return {isPK:kind==="pk",unique:kind==="pk",required:kind==="required"||kind==="pk",isLookup:kind==="lookup",isRef:kind==="ref"};
}
function applyFieldOverride(app,key,patch){
  const field=findFieldByKey(app,key);
  if(!field) return;
  Object.assign(field,patch);
  fieldOverrides[key]=Object.assign({},fieldOverrides[key],patch);
  afterFieldVisibilityChange(app);
}
function submitEditField(){
  if(!editingFieldRef){closeEditor();return;}
  const appId=editingFieldRef.appId, key=editingFieldRef.key;
  const app=findApp(appId);
  const field=app&&findFieldByKey(app,key);
  if(!field){closeEditor();return;}
  const name=(document.getElementById("ed-efield-name").value||"").trim();
  if(!name){toast("項目名を入力してください");return;}
  const old={label:field.label,type:field.type,isPK:!!field.isPK,unique:!!field.unique,required:!!field.required,isLookup:!!field.isLookup,isRef:!!field.isRef};
  const patch=Object.assign({label:name,type:document.getElementById("ed-efield-type").value||field.type},fieldPatchFromKind(document.getElementById("ed-efield-kind").value));
  applyFieldOverride(app,key,patch);
  pushUndo("項目編集",()=>{const a=findApp(appId);if(a)applyFieldOverride(a,key,old);});
  closeEditor();
  toast("項目を更新: "+name);
}

// ─── 関連線の編集（ラベル・種類） ───
let editingRelRef=null;
function openEditRelationRow(btn){
  const edgeId=String(btn.dataset.edge||"");
  const ref=parseEdgeId(edgeId);
  const app=ref&&findApp(ref.appId);
  const rel=app&&(app.relations||[])[ref.ri];
  if(!rel){toast("対象の関連線が見つかりません");return;}
  editingRelRef={appId:app.id,edgeId,ri:ref.ri};
  openEditor("edit-rel","✎ 関連線を編集","図上のラベルと線の種類を変更します（kintone上の設定は変わりません）",
    '<div class="ed-row"><label>ラベル</label><input id="ed-erel-label"></div>'
    +'<div class="ed-row"><label>種類</label><select id="ed-erel-kind">'
      +'<option value="LOOKUP"'+(rel.kind==="LOOKUP"?" selected":"")+'>ルックアップ線 🔗</option>'
      +'<option value="REF"'+(rel.kind==="REF"?" selected":"")+'>関連レコード線 📋</option>'
      +'<option value="ACTION"'+(rel.kind==="ACTION"?" selected":"")+'>アクション線 ⚡</option>'
    +'</select></div>',
    {submitLabel:"保存"});
  document.getElementById("ed-erel-label").value=rel.fromDisplay||rel.fromLabel||"";
}
function applyRelationOverride(app,edgeId,ri,patch){
  const rel=(app.relations||[])[ri];
  if(!rel) return;
  Object.assign(rel,patch);
  relationOverrides[edgeId]=Object.assign({},relationOverrides[edgeId],patch);
  const edge=cy.getElementById(edgeId);
  if(edge.length){
    edge.data("kind",rel.kind);
    edge.data("label",edgeDisplayLabel(rel.fromDisplay||rel.fromLabel||""));
    edge.data("fromLabel",rel.fromLabel);
    edge.data("fromDisplay",rel.fromDisplay||rel.fromLabel||"");
  }
  applyRelationFilter();
  refreshSidebar();
  if(String(activeAppId)===String(app.id)) renderAppDetail(app);
}
function submitEditRelation(){
  if(!editingRelRef){closeEditor();return;}
  const appId=editingRelRef.appId, edgeId=editingRelRef.edgeId, ri=editingRelRef.ri;
  const app=findApp(appId);
  const rel=app&&(app.relations||[])[ri];
  if(!rel){closeEditor();return;}
  const label=(document.getElementById("ed-erel-label").value||"").trim()||rel.fromLabel||"関連";
  const kind=document.getElementById("ed-erel-kind").value||rel.kind;
  const old={fromLabel:rel.fromLabel,fromDisplay:rel.fromDisplay,kind:rel.kind};
  applyRelationOverride(app,edgeId,ri,{fromLabel:label,fromDisplay:label,kind});
  pushUndo("関連線編集",()=>{const a=findApp(appId);if(a)applyRelationOverride(a,edgeId,ri,old);});
  closeEditor();
  toast("関連線を更新しました");
}

// ─── メモ（付箋）ノード ───
let noteSeq=(ER_EDIT_STATE&&ER_EDIT_STATE.seq&&Number(ER_EDIT_STATE.seq.note))||0;
let editingNoteId="";
function addNoteElement(data){
  return cy.add({group:"nodes",classes:"note-node",data:{id:data.id,label:data.text,noteColor:data.color||"#fef08a",isNote:true},position:{x:Number(data.x)||0,y:Number(data.y)||0}});
}
if(ER_EDIT_STATE&&Array.isArray(ER_EDIT_STATE.notes)){
  try{ ER_EDIT_STATE.notes.forEach(n=>{ if(n&&n.id&&!cy.getElementById(n.id).length) addNoteElement(n); }); }
  catch(err){ console.error("[ER] メモの復元に失敗", err); }
}
function openAddNote(pos){
  pendingNodePos=pos||null;
  openEditor("note-add","🗒 メモ(付箋)を追加","図の好きな位置に補足メモを置けます。エクスポートには含まれず、編集済みHTML保存では復元されます",
    '<div class="ed-row"><label>メモ内容 *</label><textarea id="ed-note-text" placeholder="例: このアプリ群は受注フロー"></textarea></div>'
    +'<div class="ed-row"><label>色</label>'+swatchesHtml(NOTE_COLORS,"#fef08a")+'</div>');
}
function openEditNote(id){
  const node=cy.getElementById(id);
  if(!node.length) return;
  editingNoteId=id;
  openEditor("note-edit","🗒 メモを編集","内容と色を変更できます。ドラッグで移動、ここから削除もできます",
    '<div class="ed-row"><label>メモ内容 *</label><textarea id="ed-note-text"></textarea></div>'
    +'<div class="ed-row"><label>色</label>'+swatchesHtml(NOTE_COLORS,node.data("noteColor"))+'</div>',
    {submitLabel:"保存",showDelete:true});
  document.getElementById("ed-note-text").value=node.data("label")||"";
}
function submitNoteAdd(){
  const text=(document.getElementById("ed-note-text").value||"").trim();
  if(!text){toast("メモ内容を入力してください");return;}
  noteSeq+=1;
  const ext=cy.extent();
  const pos=pendingNodePos||{x:(ext.x1+ext.x2)/2,y:(ext.y1+ext.y2)/2};
  const data={id:"note_"+noteSeq,text,color:selectedSwatchColor()||"#fef08a",x:pos.x,y:pos.y};
  const node=addNoteElement(data);
  pushUndo("メモ追加",()=>{const n=cy.getElementById(data.id);if(n.length)cy.remove(n);});
  closeEditor();
  node.select();
  toast("メモを追加しました（クリックで編集・ドラッグで移動）");
}
function submitNoteEdit(){
  const node=cy.getElementById(editingNoteId);
  if(!node.length){closeEditor();return;}
  const text=(document.getElementById("ed-note-text").value||"").trim();
  if(!text){toast("メモ内容を入力してください");return;}
  const noteId=node.id();
  const old={text:node.data("label"),color:node.data("noteColor")};
  node.data("label",text);
  node.data("noteColor",selectedSwatchColor()||old.color);
  pushUndo("メモ編集",()=>{const n=cy.getElementById(noteId);if(n.length){n.data("label",old.text);n.data("noteColor",old.color);}});
  closeEditor();
  toast("メモを更新しました");
}
function deleteNoteNodes(nodes){
  const saved=[];
  nodes.forEach(n=>{const p=n.position();saved.push({id:n.id(),text:n.data("label"),color:n.data("noteColor"),x:p.x,y:p.y});});
  cy.remove(nodes);
  if(saved.length) pushUndo("メモ削除 "+saved.length+"件",()=>{saved.forEach(d=>{if(!cy.getElementById(d.id).length) addNoteElement(d);});});
}

// ─── 整列ツール（複数選択ノードの位置合わせ） ───
function selectedMovableNodes(){
  return cy.nodes(":selected").not(".app-manual-hidden");
}
function pushPositionsUndo(nodes,label){
  const saved=nodes.map(n=>({id:n.id(),x:n.position("x"),y:n.position("y")}));
  pushUndo(label,()=>{saved.forEach(p=>{const n=cy.getElementById(p.id);if(n.length)n.position({x:p.x,y:p.y});});});
}
function alignSelected(axis){
  const nodes=selectedMovableNodes();
  if(nodes.length<2){toast("2つ以上のノードを選択してください（Shift+ドラッグ / Shift+クリック）");return;}
  pushPositionsUndo(nodes,"整列");
  if(axis==="x"){
    const v=Math.min.apply(null,nodes.map(n=>n.position("x")));
    nodes.forEach(n=>n.animate({position:{x:v,y:n.position("y")}},{duration:220}));
    toast("選択ノードを左揃えしました");
  }else{
    const v=Math.min.apply(null,nodes.map(n=>n.position("y")));
    nodes.forEach(n=>n.animate({position:{x:n.position("x"),y:v}},{duration:220}));
    toast("選択ノードを上揃えしました");
  }
}
function distributeSelected(axis){
  const nodes=selectedMovableNodes();
  if(nodes.length<3){toast("3つ以上のノードを選択してください");return;}
  pushPositionsUndo(nodes,"等間隔配置");
  const arr=nodes.sort((a,b)=>a.position(axis)-b.position(axis));
  const first=arr[0].position(axis), last=arr[arr.length-1].position(axis);
  const step=(last-first)/(arr.length-1);
  arr.forEach((n,i)=>{
    const pos={x:n.position("x"),y:n.position("y")};
    pos[axis]=first+step*i;
    n.animate({position:pos},{duration:220});
  });
  toast(axis==="x"?"横に等間隔配置しました":"縦に等間隔配置しました");
}

// ─── 深さごとの色分け ───
function setAppAccent(app,color){
  appOverrides[app.id]=Object.assign({},appOverrides[app.id],{name:app.name,color:color||""});
  const n=cy.getElementById("a"+app.id);
  if(n.length) n.data("accent",color||"");
}
function snapshotAccents(){
  const map={};
  APPS.forEach(app=>{map[app.id]=appAccentColor(app);});
  return map;
}
function restoreAccents(map){
  APPS.forEach(app=>{setAppAccent(app,map[app.id]||"");});
}
function autoColorByDepth(){
  const palette=["#818cf8","#60a5fa","#34d399","#fbbf24","#f87171","#f472b6","#a78bfa","#2dd4bf"];
  const old=snapshotAccents();
  APPS.forEach(app=>{setAppAccent(app,palette[(app.depth||0)%palette.length]);});
  pushUndo("深さで色分け",()=>restoreAccents(old));
  toast("探索深さごとにノード枠を色分けしました（深さ0=藍）");
}
function clearNodeColors(){
  const old=snapshotAccents();
  APPS.forEach(app=>{setAppAccent(app,"");});
  pushUndo("色分け解除",()=>restoreAccents(old));
  toast("ノードの色分けを解除しました");
}

// ─── 項目・関連線の個別削除/復元（詳細パネルから操作） ───
function afterFieldVisibilityChange(app){
  const node = cy.getElementById("a"+app.id);
  if(node.length){
    node.data("label", buildNodeLabel(app));
    node.data("fieldCount", visibleFieldsForNode(app).length);
  }
  refreshSidebar();
  renderAppDetail(app);
}
function hideFieldFromRow(btn){
  const app = findApp(btn.dataset.app);
  if(!app) return;
  const key = decodeURIComponent(btn.dataset.key || "");
  if(!key) return;
  hiddenFieldKeys.add(key);
  pushUndo("項目非表示",()=>{
    hiddenFieldKeys.delete(key);
    const a=findApp(app.id);
    if(a) afterFieldVisibilityChange(a);
  });
  afterFieldVisibilityChange(app);
  toast("項目を図から非表示にしました（詳細パネルから復元できます）");
}
function restoreHiddenFields(appId){
  const app = findApp(appId);
  if(!app) return;
  const prefix = String(app.id) + "::";
  let restored = 0;
  [...hiddenFieldKeys].forEach(key=>{
    if(key.indexOf(prefix) === 0){ hiddenFieldKeys.delete(key); restored += 1; }
  });
  afterFieldVisibilityChange(app);
  toast(restored ? ("非表示項目を復元: "+restored+"件") : "復元対象がありません");
}
function restoreAllHiddenFields(){
  const count = hiddenFieldKeys.size;
  hiddenFieldKeys.clear();
  refreshNodeLabels();
  refreshSidebar();
  if(activeAppId){
    const app = findApp(activeAppId);
    if(app) renderAppDetail(app);
  }
  toast(count ? ("全アプリの非表示項目を復元: "+count+"件") : "復元対象がありません");
}
function toggleRelationEdgeFromRow(btn){
  const edgeId = String(btn.dataset.edge || "");
  const edge = cy.getElementById(edgeId);
  if(!edge.length){ toast("対応する関連線が見つかりません"); return; }
  if(edge.hasClass("rel-manual-hidden")){
    manuallyRemovedEdgeIds.delete(edgeId);
    nodeHiddenEdgeIds.delete(edgeId);
    edge.removeClass("rel-manual-hidden");
    toast("関連線を復元しました");
  }else{
    manuallyRemovedEdgeIds.add(edgeId);
    edge.addClass("rel-manual-hidden");
    toast("関連線を削除しました（同じボタンで復元）");
  }
  applyRelationFilter();
  if(focusMode && currentFocusNodeId) applyFocusToNode(cy.getElementById(currentFocusNodeId), true);
  const app = findApp(btn.dataset.app);
  if(app) renderAppDetail(app);
}

// ─── Search & Highlight ───
function searchGraph(q){
  cy.elements().removeClass("highlighted dimmed");
  if(!q.trim()){
    updateSearchMeta("", 0);
    searchMatchNodes=[];searchMatchIndex=-1;
    return;
  }
  const low=q.toLowerCase();
  const matched=cy.nodes().not(".app-manual-hidden").filter(n=>{
    const app=appMap.get(n.data("appId"));
    if(!app) return false;
    if(app.name.toLowerCase().includes(low) || String(app.id).includes(low)) return true;
    return visibleFieldsForNode(app).some(f=>buildFieldDisplayName(f).toLowerCase().includes(low)||(f.code||"").toLowerCase().includes(low)||String(f.path||"").toLowerCase().includes(low));
  });
  updateSearchMeta(q, matched.length);
  searchMatchNodes=matched.sort((a,b)=>String(appMap.get(a.data("appId"))?.name||"").localeCompare(String(appMap.get(b.data("appId"))?.name||""))).toArray();
  searchMatchIndex=-1;
  if(matched.length){
    matched.addClass("highlighted");
    const visibleEdges = matched.connectedEdges().filter(e=>!e.hasClass("rel-hidden") && !e.hasClass("rel-manual-hidden"));
    cy.elements().not(matched).not(visibleEdges).not(".note-node").addClass("dimmed");
  }
}
let searchMatchNodes=[],searchMatchIndex=-1;
function focusNextSearchMatch(){
  if(!searchMatchNodes.length){toast("検索に一致するアプリがありません");return;}
  searchMatchIndex=(searchMatchIndex+1)%searchMatchNodes.length;
  const n=searchMatchNodes[searchMatchIndex];
  cy.animate({center:{eles:n},zoom:Math.max(cy.zoom(),1.1)},{duration:300});
  toast("一致 "+(searchMatchIndex+1)+"/"+searchMatchNodes.length+": "+(appMap.get(n.data("appId"))?.name||""));
}

// ─── Click Detail ───
function renderAppDetail(app){
  const visibleFields = visibleFieldsForNode(app);
  const fieldGroups = detailFieldGroups(app);
  const panel = document.getElementById("detail");
  document.getElementById("detail-title").textContent = app.name;
  const realFieldTotal = typeof app.totalFieldCount === "number" ? app.totalFieldCount : visibleFields.length;
  const fieldPillText = realFieldTotal > visibleFields.length
    ? '項目 ' + visibleFields.length + '/<small>' + realFieldTotal + '</small>'
    : '<b>項目</b> ' + visibleFields.length;
  const hiddenCnt = hiddenFieldCount(app);
  document.getElementById("detail-meta").innerHTML = (app.isCustom ? "手動追加エンティティ" : "ID: " + escapeHtml(app.id))
    + (app.createdAt ? " | 作成: " + escapeHtml(new Date(app.createdAt).toLocaleDateString()) : "")
    + (app.modifiedAt ? " | 更新: " + escapeHtml(new Date(app.modifiedAt).toLocaleDateString()) : "")
    + '<div class="detail-chip-row">'
    + '<span class="meta-pill" title="表示中 / 総数（表示数は密度設定に依存）">' + fieldPillText + '</span>'
    + '<span class="meta-pill"><b>ルックアップ</b> ' + fieldGroups.lookup.length + '</span>'
    + '<span class="meta-pill"><b>関連</b> ' + fieldGroups.ref.length + '</span>'
    + '<span class="meta-pill"><b>必須</b> ' + fieldGroups.required.length + '</span>'
    + '<span class="meta-pill"><b>深さ</b> ' + (app.depth || 0) + '</span>'
    + '<button type="button" class="meta-pill meta-pill--btn" title="図上の表示名とノード枠色を変更（kintone上は変わりません）" data-app="' + escapeHtml(String(app.id)) + '" onclick="openEditApp(this.dataset.app)">✏ 名前・色を編集</button>'
    + (hiddenCnt ? '<button type="button" class="meta-pill meta-pill--btn" title="このアプリで非表示にした項目をすべて戻します" data-app="' + escapeHtml(String(app.id)) + '" onclick="restoreHiddenFields(this.dataset.app)">↺ 非表示項目 ' + hiddenCnt + ' を復元</button>' : '')
    + '</div>'
    + ((app.issues||[]).length?'<div class="analysis-note" role="status"><strong>'+(app.status==="failed"?'取得失敗':'一部取得')+'</strong><br>'+(app.issues||[]).map(issue=>escapeHtml(issue.message||issue.code||"取得上の注意")).join('<br>')+'</div>':'');

  const relationGroups = [
    { key:"LOOKUP", label:"ルックアップ", icon:"🔗" },
    { key:"REF", label:"関連レコード", icon:"📋" },
    { key:"ACTION", label:"アクション", icon:"⚡" }
  ];
  let relHtml = "";
  const inboundRelations = [];
  APPS.forEach((sourceApp)=>{
    (sourceApp.relations || []).forEach((rel)=>{
      if(String(rel.toApp) === String(app.id)) inboundRelations.push({ sourceApp, rel });
    });
  });
  if(inboundRelations.length){
    relHtml += '<div class="field-group-title">このアプリを参照している関連 (' + inboundRelations.length + ')</div>';
    inboundRelations
      .slice()
      .sort((a,b)=>String(a.sourceApp.name || a.sourceApp.id).localeCompare(String(b.sourceApp.name || b.sourceApp.id)))
      .forEach((item)=>{
        const rel=item.rel;
        const kindLabel=rel.kind==="LOOKUP"?"ルックアップ":(rel.kind==="REF"?"関連レコード":"アクション");
        const sourceLabel=(item.sourceApp.name || ("アプリ "+item.sourceApp.id)) + " (App " + item.sourceApp.id + ")";
        const relationName=rel.fromDisplay || rel.fromLabel || rel.from || kindLabel;
        const meta=[];
        meta.push(kindLabel + ": " + relationName);
        if(rel.toField) meta.push((rel.kind==="REF"?"結合先: ":"接続先項目: ") + rel.toField);
        relHtml += '<button type="button" class="field-row detail-relation-button" data-app="' + escapeHtml(String(item.sourceApp.id)) + '" onclick="focusApp(this.dataset.app)">'
          + '<span class="field-icon">↙</span>'
          + '<div class="field-main"><div class="field-name">' + escapeHtml(sourceLabel) + '</div><div class="field-sub">' + escapeHtml(meta.join(" / ")) + '</div></div>'
          + '<span class="field-type">被参照</span></button>';
      });
  }
  relationGroups.forEach((group)=>{
    const items = (app.relations || []).map((rel, ri)=>({ rel, ri })).filter((item)=>item.rel.kind === group.key);
    if(!items.length) return;
    relHtml += '<div class="field-group-title">' + group.label + ' (' + items.length + ')</div>';
    items
      .slice()
      .sort((a,b)=>String(a.rel.fromDisplay || a.rel.fromLabel || a.rel.from || '').localeCompare(String(b.rel.fromDisplay || b.rel.fromLabel || b.rel.from || '')))
      .forEach((item)=>{
        const rel = item.rel;
        const targetApp = appMap.get(rel.toApp);
        const targetName = targetApp ? targetApp.name : "アプリ " + rel.toApp;
        const targetLabel = targetName + " (App " + rel.toApp + ")";
        const relationLabel = rel.fromDisplay || rel.fromLabel || rel.from || group.label;
        const relationMeta = [];
        if(rel.kind==="REF"&&rel.controlFieldLabel) relationMeta.push("関連レコード一覧: "+rel.controlFieldLabel);
        if(rel.fromPath && rel.fromPath !== rel.from) relationMeta.push("path: " + rel.fromPath);
        relationMeta.push("接続先: " + targetLabel);
        if(rel.toField) relationMeta.push((rel.kind==="REF"?"結合: "+(rel.sourceJoinField||rel.from||"?")+" → ":"to: ") + rel.toField);
        const edgeId = "e_" + app.id + "_" + item.ri;
        const edge = cy.getElementById(edgeId);
        const edgeHidden = edge.length && edge.hasClass("rel-manual-hidden");
        const relEditBtn = '<button type="button" class="row-edit" title="この関連線を編集（ラベル・種類）" data-edge="' + escapeHtml(edgeId) + '" data-app="' + escapeHtml(String(app.id)) + '" onclick="openEditRelationRow(this);event.stopPropagation();">✎</button>';
        const edgeBtn = edge.length
          ? relEditBtn + '<button type="button" class="row-del' + (edgeHidden ? ' row-del--restore' : '') + '" title="' + (edgeHidden ? 'この関連線を復元' : 'この関連線を図から削除') + '" data-edge="' + escapeHtml(edgeId) + '" data-app="' + escapeHtml(String(app.id)) + '" onclick="toggleRelationEdgeFromRow(this);event.stopPropagation();">' + (edgeHidden ? '↺' : '✕') + '</button>'
          : '';
        relHtml += '<div class="field-row' + (edgeHidden ? ' field-row--hidden' : '') + '" style="cursor:pointer" onclick="focusApp(' + rel.toApp + ')">'
          + '<span class="field-icon">' + group.icon + '</span>'
          + '<div class="field-main">'
          + '<div class="field-name" title="' + escapeHtml(relationLabel + ' → ' + targetLabel) + '">' + escapeHtml(relationLabel) + ' → ' + escapeHtml(targetLabel) + '</div>'
          + '<div class="field-sub">' + escapeHtml(relationMeta.join(' / ') || '接続先をクリックで移動') + '</div>'
          + '</div>'
          + '<span class="field-type">' + escapeHtml(group.key === "ACTION" ? "ACTION" : group.key) + '</span>'
          + edgeBtn
          + '</div>';
      });
  });
  document.getElementById("detail-relations").innerHTML = relHtml || '<div class="field-group-title">リレーション</div><div class="field-sub">関連はありません。</div>';

  let fieldHtml = "";
  const renderGroup = (title, fields, tagClass, tagLabel) => {
    if(!fields.length) return;
    fieldHtml += '<div class="field-group-title">' + title + ' (' + fields.length + ')</div>';
    fields.forEach((field)=>{
      let tags = "";
      if(tagLabel) tags += '<span class="tag ' + tagClass + '">' + tagLabel + '</span>';
      if(field.required && tagLabel !== "必須") tags += '<span class="tag tag-req">必須</span>';
      if(field.inSubtable) tags += '<span class="tag tag-sub">表</span>';
      if(field.unique) tags += '<span class="tag tag-pk">重複不可</span>';
      const fieldName = buildFieldDisplayName(field);
      const meta = ["code: " + (field.code || "-")];
      if(field.path && field.path !== field.code) meta.push("path: " + field.path);
      if(field.tableLabel) meta.push("table: " + field.tableLabel);
      fieldHtml += '<div class="field-row" title="' + escapeHtml(fieldName) + '">'
        + '<span class="field-icon">' + fieldIconForLabel(field) + '</span>'
        + '<div class="field-main">'
        + '<div class="field-name">' + escapeHtml(fieldName) + tags + '</div>'
        + '<div class="field-sub">' + escapeHtml(meta.join(' / ')) + '</div>'
        + '</div>'
        + '<span class="field-type">' + escapeHtml(fieldTypeJpLabel(field.type)) + '</span>'
        + '<button type="button" class="row-edit" title="この項目を編集（名前・種類・区分）" data-app="' + escapeHtml(String(app.id)) + '" data-key="' + escapeHtml(encodeURIComponent(fieldHideKey(app, field))) + '" onclick="openEditFieldRow(this);event.stopPropagation();">✎</button>'
        + '<button type="button" class="row-del" title="この項目を図から非表示" data-app="' + escapeHtml(String(app.id)) + '" data-key="' + escapeHtml(encodeURIComponent(fieldHideKey(app, field))) + '" onclick="hideFieldFromRow(this);event.stopPropagation();">✕</button>'
        + '</div>';
    });
  };
  renderGroup("主キー", fieldGroups.pk, "tag-pk", "PK");
  renderGroup("ルックアップ (FK)", fieldGroups.lookup, "tag-fk", "FK");
  renderGroup("関連レコード", fieldGroups.ref, "tag-ref", "REF");
  renderGroup("必須フィールド", fieldGroups.required, "tag-req", "必須");
  renderGroup("サブテーブル", fieldGroups.subtable, "tag-sub", "Table");
  renderGroup("その他フィールド", fieldGroups.normal, "", "");
  const fieldFilterHtml = visibleFields.length > 8
    ? '<input class="detail-filter" placeholder="🔎 パネル内の項目を絞り込み..." oninput="filterDetailFields(this.value)">'
    : '';
  document.getElementById("detail-fields").innerHTML = fieldFilterHtml + (fieldHtml || '<div class="field-group-title">フィールド</div><div class="field-sub">表示できるフィールドはありません。</div>');

  panel.classList.add("open");
  setActiveApp(app.id);
}
function renderGhostDetail(node){
  const targetAppId=node.data("targetAppId")||"不明";
  const inbound=[];
  APPS.forEach((sourceApp)=>{
    (sourceApp.relations||[]).forEach((rel)=>{
      if(String(rel.toApp)===String(targetAppId)) inbound.push({sourceApp,rel});
    });
  });
  const panel=document.getElementById("detail");
  document.getElementById("detail-title").textContent="未取得の参照先";
  document.getElementById("detail-meta").innerHTML='App '+escapeHtml(String(targetAppId))
    +'<div class="analysis-note" role="status"><strong>図の外にある参照先です</strong><br>探索深さ・取得権限・削除済みアプリなどにより設定本体を取得できません。下記は取得済みアプリ側に残っている参照情報です。</div>';
  let relationHtml='<div class="field-group-title">この参照先へ向かう関連 ('+inbound.length+')</div>';
  inbound.forEach((item)=>{
    relationHtml+='<button type="button" class="field-row detail-relation-button" data-app="'+escapeHtml(String(item.sourceApp.id))+'" onclick="focusApp(this.dataset.app)">'
      +'<span class="field-icon">↖</span><div class="field-main"><div class="field-name">'+escapeHtml(item.sourceApp.name+' (App '+item.sourceApp.id+')')+'</div>'
      +'<div class="field-sub">'+escapeHtml(exportRelationLabel(item.rel))+'</div></div><span class="field-type">'+escapeHtml(item.rel.kind||"関連")+'</span></button>';
  });
  document.getElementById("detail-relations").innerHTML=relationHtml;
  document.getElementById("detail-fields").innerHTML='<div class="field-group-title">項目</div><div class="field-sub">参照先アプリを取得できていないため、項目情報は表示できません。</div>';
  panel.classList.add("open");
  setActiveApp(0);
}
cy.on("tap","node",e=>{
  if(e.target.hasClass("note-node")){ openEditNote(e.target.id()); return; }
  lastTappedNodeId = e.target.id();
  const app=appMap.get(e.target.data("appId"));
  if(!app){ if(e.target.data("isGhost")) renderGhostDetail(e.target); return; }
  renderAppDetail(app);
  if(focusMode) applyFocusToNode(e.target);
});
cy.on("cxttap","node",e=>{
  const n = e.target;
  if(n.hasClass("note-node")){ deleteNoteNodes(n); toast("メモを削除しました (Ctrl+Zで復元)"); return; }
  const oe = e.originalEvent || ({});
  if(oe.altKey || oe.metaKey){
    hideAppNodes(n);
    applyRelationFilter();
    refreshAppList();
    if(focusMode && currentFocusNodeId) applyFocusToNode(cy.getElementById(currentFocusNodeId), true);
    toast("アプリを手動削除 (Ctrl+Zで復元)");
    return;
  }
  if(pinnedNodeIds.has(n.id())) unpinNode(n);
  else pinNode(n);
});
cy.on("cxttap","edge",e=>{
  const edge = e.target;
  hideRelationEdges(edge);
  applyRelationFilter();
  if(focusMode && currentFocusNodeId) applyFocusToNode(cy.getElementById(currentFocusNodeId), true);
  toast("関連線を手動削除 (Ctrl+Zで復元)");
});
cy.on("tap",e=>{if(e.target===cy){closeDetail();cy.elements().removeClass("highlighted dimmed path-node path-edge");clearFocus(true);clearAnalysisHighlight();}});

function closeDetail(){
  document.getElementById("detail").classList.remove("open");
  setActiveApp(0);
}

// 詳細パネル内の項目絞り込み（大きいアプリで目的の項目を探しやすくする）
function filterDetailFields(q){
  const low=String(q||"").trim().toLowerCase();
  document.querySelectorAll("#detail-fields .field-row").forEach(row=>{
    row.style.display=!low||row.textContent.toLowerCase().includes(low)?"":"none";
  });
  document.querySelectorAll("#detail-fields .field-group-title").forEach(title=>{
    let el=title.nextElementSibling, any=false;
    while(el&&el.classList&&el.classList.contains("field-row")){
      if(el.style.display!=="none") any=true;
      el=el.nextElementSibling;
    }
    title.style.display=!low||any?"":"none";
  });
}

function focusApp(id){
  const n=cy.getElementById("a"+id);
  if(n.length && !n.hasClass("app-manual-hidden")){
    cy.animate({center:{eles:n},zoom:1.5},{ duration:400 });
    n.select();
    const app = appMap.get(Number(id)) || appMap.get(id);
    if(app) renderAppDetail(app);
    if(focusMode) applyFocusToNode(n, true);
  }
}

// ─── Architecture analysis ───
function analysisItem(title, meta, ids, tone){
  const safeIds=(ids||[]).map(id=>String(id).replace(/[^0-9]/g,"")).filter(Boolean).join(",");
  return '<button type="button" class="analysis-item'+(tone?' analysis-item--'+tone:'')+'" data-analysis-ids="'+safeIds+'" onclick="focusAnalysisApps(this.dataset.analysisIds)"><strong>'+escapeHtml(title)+'</strong><span>'+escapeHtml(meta)+'</span></button>';
}
function renderAnalysisPanel(){
  const host=document.getElementById("analysis-content");
  if(!host) return;
  const cycles=ER_ANALYSIS.cycles||[];
  const selfReferences=ER_ANALYSIS.selfReferences||[];
  const isolated=ER_ANALYSIS.isolatedAppIds||[];
  const hubs=ER_ANALYSIS.hubs||[];
  const unresolved=ER_ANALYSIS.unresolvedTargets||[];
  const partialIds=ER_ANALYSIS.partialAppIds||[];
  const failedIds=ER_ANALYSIS.failedAppIds||[];
  let html='<section class="analysis-section"><h3><span>取得に注意が必要</span><span class="analysis-count">'+(partialIds.length+failedIds.length)+'</span></h3>';
  html+=partialIds.concat(failedIds).length?partialIds.concat(failedIds).map(id=>{const app=appMap.get(Number(id))||appMap.get(id);const status=failedIds.includes(id)?'取得失敗':'一部取得';const messages=(app&&app.issues||[]).map(issue=>issue.message).filter(Boolean);return analysisItem((app&&app.name)||('アプリ '+id),status+(messages.length?' / '+messages.slice(0,2).join(' / '):''),[id],failedIds.includes(id)?'risk':'warn');}).join(''):'<div class="analysis-empty">取得上の注意は記録されていません。</div>';
  html+='</section><section class="analysis-section"><h3><span>複数アプリの循環候補</span><span class="analysis-count">'+cycles.length+'</span></h3>';
  html+=cycles.length?cycles.map((cycle,i)=>analysisItem('候補 '+(i+1)+': '+cycle.appNames.join(' → '),cycle.appIds.length+'アプリ間で相互に到達できます',cycle.appIds,'risk')).join(''):'<div class="analysis-empty">複数アプリの循環候補は検出されませんでした。</div>';
  html+='</section><section class="analysis-section"><h3><span>自己参照</span><span class="analysis-count">'+selfReferences.length+'</span></h3>';
  html+=selfReferences.length?selfReferences.map(item=>analysisItem(item.appName+' (App '+item.appId+')',(item.kind||'関連')+(item.field?' / '+item.field:''),[item.appId],'')).join(''):'<div class="analysis-empty">自己参照はありません。</div>';
  html+='</section><section class="analysis-section"><h3><span>接続数が多いアプリ（'+(ER_ANALYSIS.highConnectionThreshold||3)+'件以上）</span><span class="analysis-count">'+hubs.length+'</span></h3>';
  html+=hubs.length?hubs.map(hub=>analysisItem(hub.name+' (App '+hub.appId+')','入 '+hub.incoming+' / 出 '+hub.outgoing+' / 合計 '+hub.total,[hub.appId],'')).join(''):'<div class="analysis-empty">該当するアプリはありません。</div>';
  html+='</section><section class="analysis-section"><h3><span>図内で関連のないアプリ</span><span class="analysis-count">'+isolated.length+'</span></h3>';
  html+=isolated.length?isolated.map(id=>{const stat=(ER_ANALYSIS.appStats||[]).find(s=>String(s.appId)===String(id));return analysisItem((stat&&stat.name)||('アプリ '+id),'図内に入出力の関連がありません',[id],'');}).join(''):'<div class="analysis-empty">該当するアプリはありません。</div>';
  html+='</section><section class="analysis-section"><h3><span>未取得の参照先</span><span class="analysis-count">'+unresolved.length+'</span></h3>';
  html+=unresolved.length?unresolved.slice(0,20).map(item=>analysisItem(item.fromAppName+' → App '+item.toAppId,(item.kind||'関連')+(item.field?' / '+item.field:''),[item.fromAppId],'warn')).join(''):'<div class="analysis-empty">参照先はすべて図内に取得されています。</div>';
  if(unresolved.length>20) html+='<div class="analysis-empty">ほか '+(unresolved.length-20)+' 件</div>';
  html+='</section>';
  host.innerHTML=html;
}
function clearAnalysisHighlight(){
  cy.elements().removeClass("analysis-hit analysis-dim");
}
function focusAnalysisApps(csv){
  const ids=String(csv||"").split(",").filter(Boolean);
  clearAnalysisHighlight();
  const nodes=ids.map(id=>cy.getElementById("a"+id)).filter(node=>node.length&&!node.hasClass("app-manual-hidden"));
  if(!nodes.length){toast("対象アプリは現在の図にありません");return;}
  const collection=nodes.reduce((all,node)=>all.union(node),cy.collection());
  cy.nodes().not(".note-node").not(collection).addClass("analysis-dim");
  collection.addClass("analysis-hit");
  if(collection.length===1) focusApp(ids[0]);
  else cy.animate({fit:{eles:collection,padding:100}},{duration:450});
  toast(collection.length+"アプリを強調しました（背景クリックで解除）");
}
function toggleAnalysisPanel(force){
  const panel=document.getElementById("analysis-panel");
  const open=typeof force==="boolean"?force:!panel.classList.contains("open");
  panel.classList.toggle("open",open);
  document.getElementById("analysis-toggle-btn")?.classList.toggle("active",open);
  if(open){closeSidebar();closeDetail();}
}
renderAnalysisPanel();

// ─── Sidebar ───
let sidebarReturnFocus=null;
function syncSidebarTriggerState(open){
  ["sidebar-toggle-btn","sidebar-fab-btn"].forEach(id=>{
    document.getElementById(id)?.setAttribute("aria-expanded",String(open));
  });
}
function toggleSidebar(force, trigger){
  const sidebar=document.getElementById("sidebar");
  const wasOpen=sidebar.classList.contains("open");
  const open=typeof force==="boolean"?force:!sidebar.classList.contains("open");
  if(open&&!wasOpen){
    const active=document.activeElement;
    sidebarReturnFocus=trigger&&typeof trigger.focus==="function"
      ? trigger
      : (active&&active.matches?.("#sidebar-toggle-btn,#sidebar-fab-btn") ? active : document.getElementById("sidebar-toggle-btn"));
  }
  sidebar.classList.toggle("open",open);
  sidebar.setAttribute("aria-hidden",String(!open));
  sidebar.inert=!open;
  syncSidebarTriggerState(open);
  if(open){
    toggleAnalysisPanel(false);
    closeDetail();
    document.getElementById("sidebar-close")?.focus();
  }else if(wasOpen){
    const restore=sidebarReturnFocus;
    sidebarReturnFocus=null;
    if(restore&&document.contains(restore)) restore.focus();
  }
}
function closeSidebar(){toggleSidebar(false);}

// Build stats
function refreshSidebar(){
  const activeTypes=new Set([...document.querySelectorAll(".filter-chip.active")].map(e=>e.dataset.type));
  const visibleFieldsTotal=APPS.reduce((s,a)=>s+visibleFieldsForNode(a).length,0);
  const totalFieldsAcrossApps=APPS.reduce((s,a)=>s+(typeof a.totalFieldCount==="number"?a.totalFieldCount:visibleFieldsForNode(a).length),0);
  const totalRels=APPS.reduce((s,a)=>s+a.relations.length,0);
  const lookups=APPS.reduce((s,a)=>s+a.relations.filter(r=>r.kind==="LOOKUP").length,0);
  const actions=APPS.reduce((s,a)=>s+a.relations.filter(r=>r.kind==="ACTION").length,0);
  const refs=totalRels-lookups-actions;
  const typeCount={};
  APPS.forEach(a=>visibleFieldsForNode(a).forEach(f=>{typeCount[f.type]=(typeCount[f.type]||0)+1;}));

  let html='<div class="stat-row"><span>アプリ数</span><span class="stat-val">'+APPS.length+'</span></div>';
  html+='<div class="stat-row"><span>総フィールド数</span><span class="stat-val">'+totalFieldsAcrossApps+'</span></div>';
  if(visibleFieldsTotal!==totalFieldsAcrossApps){
    html+='<div class="stat-row"><span>表示中フィールド</span><span class="stat-val">'+visibleFieldsTotal+'</span></div>';
  }
  html+='<div class="stat-row"><span>ルックアップ数</span><span class="stat-val">'+lookups+'</span></div>';
  html+='<div class="stat-row"><span>関連レコード数</span><span class="stat-val">'+refs+'</span></div>';
  html+='<div class="stat-row"><span>アクション線数</span><span class="stat-val">'+actions+'</span></div>';
  html+='<div class="stat-row"><span>総リレーション</span><span class="stat-val">'+totalRels+'</span></div>';
  html+='<div class="stat-row"><span>取得完了</span><span class="stat-val">'+APPS.filter(a=>(a.status||"complete")==="complete"&&a.ok!==false).length+'</span></div>';
  html+='<div class="stat-row"><span>一部取得</span><span class="stat-val">'+APPS.filter(a=>a.status==="partial").length+'</span></div>';
  html+='<div class="stat-row"><span>取得失敗</span><span class="stat-val">'+APPS.filter(a=>a.status==="failed"||a.ok===false).length+'</span></div>';
  document.getElementById("stats-summary").innerHTML=html;

  // type filters
  const filterHost=document.getElementById("type-filters");
  filterHost.replaceChildren();
  Object.entries(typeCount).sort((a,b)=>b[1]-a[1]).forEach(([t,c])=>{
    const button=document.createElement("button");
    button.type="button";
    button.className="filter-chip"+(activeTypes.has(t)?" active":"");
    button.dataset.type=t;
    button.textContent=t+" ("+c+")";
    button.setAttribute("aria-pressed",activeTypes.has(t)?"true":"false");
    button.addEventListener("click",()=>filterByType(button,t));
    filterHost.appendChild(button);
  });

  refreshAppList();
}
refreshSidebar();

function refreshAppList(){
  const sorted = APPS
    .slice()
    .sort((a,b)=>{
      const aStart = startAppIdSet.has(String(a.id)) ? 0 : 1;
      const bStart = startAppIdSet.has(String(b.id)) ? 0 : 1;
      if(aStart !== bStart) return aStart - bStart;
      if((a.depth || 0) !== (b.depth || 0)) return (a.depth || 0) - (b.depth || 0);
      return String(a.name || "").localeCompare(String(b.name || ""));
    });
  const renderItem = (a)=>{
    const visibleCount = visibleFieldsForNode(a).length;
    const node = cy.getElementById('a'+a.id);
    const hidden = node.length && node.hasClass('app-manual-hidden');
    const activeCls = Number(activeAppId) === Number(a.id) ? ' active-app' : '';
    const hiddenCls = hidden ? ' highlighted' : '';
    const startMeta = startAppIdSet.has(String(a.id)) ? ' / 開始' : '';
    const hiddenMeta = hidden ? ' / 非表示' : '';
    return '<button type="button" class="app-list-item'+activeCls+hiddenCls+'" onclick="focusApp('+a.id+')">'+escapeHtml(a.name)+' <span style="color:var(--dim);font-size:10px">('+visibleCount+' 項目 / '+a.relations.length+' 関連 / 深さ '+(a.depth || 0)+startMeta+hiddenMeta+')</span></button>';
  };
  // 紐づき（可視の関連線）があるアプリと無いアプリを別グループで表示する
  const linkedApps=[], noLinkApps=[];
  sorted.forEach(a=>{
    const node = cy.getElementById('a'+a.id);
    const hasLink = node.length ? nodeHasVisibleLink(node) : (a.relations || []).length > 0;
    (hasLink ? linkedApps : noLinkApps).push(a);
  });
  let aHtml="";
  if(noLinkApps.length && linkedApps.length){
    aHtml += '<div class="app-list-group">🔗 紐づきあり ('+linkedApps.length+')</div>';
    linkedApps.forEach(a=>{ aHtml += renderItem(a); });
    aHtml += '<div class="app-list-group">⬜ 紐づきなし ('+noLinkApps.length+')</div>';
    noLinkApps.forEach(a=>{ aHtml += renderItem(a); });
  }else{
    sorted.forEach(a=>{ aHtml += renderItem(a); });
  }
  document.getElementById("app-list").innerHTML=aHtml;
}

function filterByType(el,type){
  el.classList.toggle("active");
  el.setAttribute("aria-pressed",el.classList.contains("active")?"true":"false");
  const active=[...document.querySelectorAll(".filter-chip.active")].map(e=>e.dataset.type);
  cy.elements().removeClass("highlighted dimmed");
  if(!active.length) return;
  const matched=cy.nodes().not(".app-manual-hidden").filter(n=>{
    const app=appMap.get(n.data("appId"));
    return app&&visibleFieldsForNode(app).some(f=>active.includes(f.type));
  });
  matched.addClass("highlighted");
  const visibleEdges = matched.connectedEdges().filter(e=>!e.hasClass("rel-hidden") && !e.hasClass("rel-manual-hidden"));
  cy.elements().not(matched).not(visibleEdges).not(".note-node").addClass("dimmed");
}

// ─── Path Finder ───
function togglePathFinder(){
  const pf=document.getElementById("pathfinder");
  pf.classList.toggle("open");
  if(pf.classList.contains("open")){
    const apps=APPS.filter(a=>{ const n = cy.getElementById("a"+a.id); return n.length && !n.hasClass("app-manual-hidden"); });
    ["pf-from","pf-to"].forEach(id=>{
      const select=document.getElementById(id);
      select.replaceChildren();
      apps.forEach(app=>{const option=document.createElement("option");option.value="a"+app.id;option.textContent=String(app.name||("アプリ "+app.id));select.appendChild(option);});
    });
  }
  requestAnimationFrame(syncBottomUiOffsets);
}

function findPath(){
  clearPath();
  const from=document.getElementById("pf-from").value;
  const to=document.getElementById("pf-to").value;
  if(from===to){toast("同じアプリです");return;}
  const dijkstra=cy.elements().not(".rel-hidden").not(".rel-manual-hidden").not(".app-manual-hidden").dijkstra({root:"#"+from,directed:false});
  const path=dijkstra.pathTo(cy.getElementById(to));
  if(!path||path.length===0){document.getElementById("path-result").textContent="経路なし";return;}
  path.addClass("path-node path-edge");
  cy.elements().not(path).not(".note-node").addClass("dimmed");
  const names=path.nodes().map(n=>appMap.get(n.data("appId"))?.name||"?").join(" → ");
  document.getElementById("path-result").textContent=names;
  toast("経路: "+path.nodes().length+"アプリ");
}

function clearPath(){
  cy.elements().removeClass("path-node path-edge dimmed highlighted");
  document.getElementById("path-result").textContent="";
}

// ─── Minimap ───
let minimapOpen=false,minimapTimer;
function toggleMinimap(){
  minimapOpen=!minimapOpen;
  document.getElementById("minimap").classList.toggle("open",minimapOpen);
  if(minimapOpen) startMinimap(); else clearInterval(minimapTimer);
}
function startMinimap(){
  const canvas=document.getElementById("minimap-canvas");
  const ctx=canvas.getContext("2d");
  const render=()=>{
    canvas.width=180;canvas.height=130;
    ctx.fillStyle=getComputedStyle(document.documentElement).getPropertyValue("--surface").trim()||"#11131a";
    ctx.fillRect(0,0,180,130);
    const bb=cy.elements().boundingBox();
    if(bb.w===0) return;
    const sx=170/bb.w,sy=120/bb.h,s=Math.min(sx,sy);
    const ox=(180-bb.w*s)/2,oy=(130-bb.h*s)/2;
    cy.edges().filter(e=>!e.hasClass("rel-hidden") && !e.hasClass("rel-manual-hidden")).forEach(e=>{
      const sp=e.sourceEndpoint(),tp=e.targetEndpoint();
      ctx.strokeStyle=e.data("kind")==="LOOKUP"?"#60a5fa":(e.data("kind")==="REF"?"#34d399":"#f59e0b");
      ctx.lineWidth=0.5;ctx.beginPath();
      ctx.moveTo((sp.x-bb.x1)*s+ox,(sp.y-bb.y1)*s+oy);
      ctx.lineTo((tp.x-bb.x1)*s+ox,(tp.y-bb.y1)*s+oy);
      ctx.stroke();
    });
    cy.nodes().forEach(n=>{
      const p=n.position();
      if(n.hasClass("pinned-node")) ctx.fillStyle="#fbbf24";
      else if(n.hasClass("focus-root")) ctx.fillStyle="#5eead4";
      else if(n.hasClass("focus-neighbor")) ctx.fillStyle="#67e8f9";
      else if(n.hasClass("path-node")) ctx.fillStyle="#f472b6";
      else if(n.hasClass("highlighted")) ctx.fillStyle="#fbbf24";
      else ctx.fillStyle="#5eead4";
      ctx.globalAlpha=(n.hasClass("dimmed")||n.hasClass("focus-dim"))?0.12:0.8;
      ctx.fillRect((p.x-bb.x1)*s+ox-2,(p.y-bb.y1)*s+oy-2,4,4);
      ctx.globalAlpha=1;
    });
    // viewport rect
    const ext=cy.extent();
    ctx.strokeStyle="#fff";ctx.lineWidth=1;ctx.globalAlpha=0.5;
    ctx.strokeRect((ext.x1-bb.x1)*s+ox,(ext.y1-bb.y1)*s+oy,(ext.x2-ext.x1)*s,(ext.y2-ext.y1)*s);
    ctx.globalAlpha=1;
  };
  minimapTimer=setInterval(render,500);
  render();
}

// ─── Command Palette ───
const commands=[
  {label:"全体表示",icon:"📐",action:fit,keys:"Ctrl+0"},
  {label:"Dagre レイアウト",icon:"⬡",action:()=>setLayout("dagre")},
  {label:"自動配置 (Cose)",icon:"🔄",action:()=>setLayout("cose")},
  {label:"グリッド レイアウト",icon:"⊞",action:()=>setLayout("grid")},
  {label:"円形 レイアウト",icon:"◯",action:()=>setLayout("circle")},
  {label:"ツリー レイアウト",icon:"🌳",action:()=>setLayout("breadthfirst")},
  {label:"紐づきなしアプリの分離 ON/OFF",icon:"🗂",action:toggleSeparateNoLink},
  {label:"同心円 レイアウト",icon:"◎",action:()=>setLayout("concentric")},
  {label:"シンプルモード ON/OFF（結合のみ表示）",icon:"⬡",action:toggleSimpleMode},
  {label:"表示密度: 結合のみ（項目非表示）",icon:"⬡",action:()=>setDensity("none")},
  {label:"表示密度: コンパクト",icon:"🪶",action:()=>setDensity("compact")},
  {label:"表示密度: 標準",icon:"📄",action:()=>setDensity("standard")},
  {label:"表示密度: 詳細",icon:"🧾",action:()=>setDensity("full")},
  {label:"統計パネル",icon:"📊",action:toggleSidebar,keys:"Ctrl+B"},
  {label:"構造チェック（取得状態・循環候補・接続数）",icon:"🩺",action:()=>toggleAnalysisPanel(true)},
  {label:"ガイドパネル 表示/非表示",icon:"🧭",action:toggleOverview},
  {label:"経路探索",icon:"🔍",action:togglePathFinder},
  {label:"関連強調 ON/OFF",icon:"🎯",action:toggleFocusMode,keys:"Shift+F"},
  {label:"関連強調解除",icon:"🧹",action:()=>clearFocus()},
  {label:"ルックアップ線 ON/OFF",icon:"🔗",action:()=>toggleRelationKind("LOOKUP")},
  {label:"関連線 ON/OFF",icon:"📋",action:()=>toggleRelationKind("REF")},
  {label:"アクション線 ON/OFF",icon:"⚡",action:()=>toggleRelationKind("ACTION")},
  {label:"線ラベル ON/OFF",icon:"🏷",action:toggleRelationLabels},
  {label:"元に戻す",icon:"↩",action:undoLast,keys:"Ctrl+Z"},
  {label:"アプリ(エンティティ)を追加",icon:"⬡",action:()=>openAddApp()},
  {label:"アプリに項目を追加",icon:"📝",action:()=>openAddField()},
  {label:"関連線を追加",icon:"🔗",action:()=>openAddRelation()},
  {label:"メモ(付箋)を追加",icon:"🗒",action:()=>openAddNote()},
  {label:"アプリを編集（名前・枠色）",icon:"✏",action:()=>openEditApp()},
  {label:"深さごとに色分け",icon:"🎨",action:autoColorByDepth},
  {label:"色分けを解除",icon:"🧼",action:clearNodeColors},
  {label:"選択ノードを左揃え",icon:"⇤",action:()=>alignSelected("x")},
  {label:"選択ノードを上揃え",icon:"⇞",action:()=>alignSelected("y")},
  {label:"選択ノードを横に等間隔",icon:"⇶",action:()=>distributeSelected("x")},
  {label:"選択ノードを縦に等間隔",icon:"⇩",action:()=>distributeSelected("y")},
  {label:"選択関連を削除",icon:"🗑",action:removeSelectedRelations,keys:"Delete"},
  {label:"削除関連を復元",icon:"↺",action:restoreRemovedRelations},
  {label:"選択アプリを削除",icon:"🗑📱",action:removeSelectedApps,keys:"Delete"},
  {label:"削除アプリを復元",icon:"↺📱",action:restoreRemovedApps},
  {label:"非表示にした項目をすべて復元",icon:"↺📝",action:restoreAllHiddenFields},
  {label:"選択ノード 固定/解除",icon:"📌",action:togglePinFromSelection,keys:"Shift+P"},
  {label:"固定を全解除",icon:"📍",action:clearPins},
  {label:"ミニマップ",icon:"🗺",action:toggleMinimap},
  {label:"テーマ切替",icon:"🌓",action:toggleTheme},
  {label:"編集済みHTMLを保存",icon:"💾",action:exportEditedHtml},
  {label:"PNG エクスポート",icon:"🖼",action:exportPNG},
  {label:"Mermaid エクスポート",icon:"🧜",action:showMermaid},
  {label:"draw.io エクスポート",icon:"📊",action:showDrawio},
  {label:"SQL DDL エクスポート",icon:"🗄",action:showSQL},
  {label:"PlantUML エクスポート",icon:"🌱",action:showPlantUML},
  {label:"ERモデル JSON エクスポート",icon:"{}",action:showJSON},
  {label:"Markdown 仕様書エクスポート",icon:"📝",action:showMarkdown},
  {label:"CSV (アプリ一覧) エクスポート",icon:"📑",action:showCSVApps},
  {label:"CSV (フィールド) エクスポート",icon:"📑",action:showCSVFields},
  {label:"CSV (リレーション) エクスポート",icon:"📑",action:showCSVRelations},
  {label:"印刷プレビュー",icon:"🖨",action:printDiagram},
  {label:"表示状態のURLをコピー",icon:"🔗",action:copyShareUrl},
  {label:"フルスクリーン",icon:"⛶",action:toggleFullscreen,keys:"F11"},
  {label:"ズームイン",icon:"➕",action:zoomIn,keys:"+"},
  {label:"ズームアウト",icon:"➖",action:zoomOut,keys:"-"},
  {label:"ズームリセット",icon:"◎",action:zoomReset,keys:"0"},
  {label:"ヘルプ",icon:"❓",action:openHelp,keys:"?"},
  {label:"ハイライト解除",icon:"✨",action:()=>{cy.elements().removeClass("highlighted dimmed path-node path-edge");document.getElementById("search-box").value="";clearFocus(true);}},
];

// Add app-focus commands
APPS.forEach(a=>{
  commands.push({label:"アプリ: "+a.name+" (ID:"+a.id+")",icon:"📱",appId:a.id,action:()=>focusApp(a.id)});
});

function openCmd(){
  document.getElementById("cmd-overlay").classList.add("open");
  const inp=document.getElementById("cmd-input");inp.value="";inp.focus();
  filterCmd("");
}
function closeCmd(){document.getElementById("cmd-overlay").classList.remove("open");}

function filterCmd(q){
  const low=q.toLowerCase();
  const filtered=q?commands.filter(c=>c.label.toLowerCase().includes(low)):commands.slice(0,12);
  const box=document.getElementById("cmd-results");
  box.replaceChildren();
  filtered.forEach((command,index)=>{
    const item=document.createElement("button");
    item.type="button";
    item.className="cmd-item"+(index===0?" active":"");
    const icon=document.createElement("span");icon.textContent=String(command.icon||"");
    const label=document.createElement("span");label.textContent=String(command.label||"");
    item.append(icon,label);
    if(command.keys){const keys=document.createElement("span");keys.className="kbd";keys.textContent=String(command.keys);item.appendChild(keys);}
    item.addEventListener("click",()=>runCmd(commands.indexOf(command)));
    box.appendChild(item);
  });
}

function runCmd(idx){commands[idx].action();closeCmd();}

// ─── Keyboard Shortcuts ───
function isTypingTarget(el){
  if(!el) return false;
  const tag=(el.tagName||"").toUpperCase();
  return tag==="INPUT"||tag==="TEXTAREA"||tag==="SELECT"||el.isContentEditable;
}
function isInteractiveShortcutTarget(el){
  if(isTypingTarget(el)) return true;
  return !!(el && typeof el.closest === "function" && el.closest("button,a,summary,[role='button']"));
}
document.addEventListener("keydown",e=>{
  if(e.key==="k"&&(e.ctrlKey||e.metaKey)){e.preventDefault();openCmd();}
  if(e.key==="b"&&(e.ctrlKey||e.metaKey)){e.preventDefault();toggleSidebar();}
  if(e.key==="f"&&(e.ctrlKey||e.metaKey)){e.preventDefault();document.getElementById("search-box").focus();}
  if(e.key==="F"&&e.shiftKey&&!e.isComposing&&!e.repeat&&!isInteractiveShortcutTarget(e.target)){e.preventDefault();toggleFocusMode();}
  if(e.key==="P"&&e.shiftKey&&!e.isComposing&&!e.repeat&&!isInteractiveShortcutTarget(e.target)){e.preventDefault();togglePinFromSelection();}
  if(e.key==="0"&&(e.ctrlKey||e.metaKey)){e.preventDefault();fit();}
  if((e.key==="z"||e.key==="Z")&&(e.ctrlKey||e.metaKey)&&!e.shiftKey&&!isTypingTarget(e.target)){e.preventDefault();undoLast();}
  if(e.key==="Escape"){closeCmd();closeDetail();closeModal();closeHelp();closeEditor();closeAllMenus();closeZoomPresets();closeSidebar();toggleAnalysisPanel(false);clearFocus(true);clearAnalysisHighlight();closeMobileMenu();}
  if((e.key==="Delete"||e.key==="Backspace")&&!isTypingTarget(e.target)){
    const selEdges=cy.edges(":selected");
    const selNotes=cy.nodes(".note-node:selected");
    const selNodes=cy.nodes(":selected").not(".app-manual-hidden").not(".note-node");
    if(selEdges.length||selNodes.length||selNotes.length){
      e.preventDefault();
      if(selEdges.length) removeSelectedRelations();
      if(selNodes.length) removeSelectedApps();
      if(selNotes.length){ deleteNoteNodes(selNotes); toast("メモを削除: "+selNotes.length+"件 (Ctrl+Zで復元)"); }
    }
  }
  if(!isTypingTarget(e.target)){
    if(e.key==="?"||(e.key==="/"&&e.shiftKey)){e.preventDefault();openHelp();}
    if(e.key==="+"||e.key==="="){e.preventDefault();zoomIn();}
    if(e.key==="-"||e.key==="_"){e.preventDefault();zoomOut();}
    if(e.key==="0"&&!e.ctrlKey&&!e.metaKey){e.preventDefault();zoomReset();}
    if(e.key==="F11"){e.preventDefault();toggleFullscreen();}
  }
  // cmd palette navigation
  if(document.getElementById("cmd-overlay").classList.contains("open")){
    const items=[...document.querySelectorAll(".cmd-item")];
    const ai=items.findIndex(i=>i.classList.contains("active"));
    if(e.key==="ArrowDown"){e.preventDefault();items[ai]?.classList.remove("active");items[Math.min(ai+1,items.length-1)]?.classList.add("active");}
    if(e.key==="ArrowUp"){e.preventDefault();items[ai]?.classList.remove("active");items[Math.max(ai-1,0)]?.classList.add("active");}
    if(e.key==="Enter"){e.preventDefault();items[ai]?.click();}
  }
});

// ─── Exports ───
function exportPNG(){
  try{
    const a=document.createElement("a");
    a.href=cy.png({bg:isDark?"#08090d":"#f0f2f5",full:true,scale:2});
    a.download="kintone_erd.png";a.click();toast("PNG ダウンロード");
  }catch(err){
    console.error("[ER] exportPNG failed", err);
    toast("PNG出力に失敗: "+((err&&err.message)||err));
  }
}
function exportSVG(){
  try{
    if(typeof cy.svg !== "function"){
      toast("SVGエクスポートは未対応のためPNGを出力します");
      exportPNG();
      return;
    }
    const blob=new Blob([cy.svg({full:true,bg:isDark?"#08090d":"#f0f2f5"})],{type:"image/svg+xml"});
    const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="kintone_erd.svg";a.click();toast("SVG ダウンロード");
  }catch(err){
    console.error("[ER] exportSVG failed", err);
    toast("SVG出力に失敗: "+((err&&err.message)||err));
  }
}

// ─── 編集済みHTMLの保存 / 復元 ───
function captureEditState(){
  const customApps=APPS.filter(a=>a.isCustom).map(a=>({
    id:a.id,name:a.name,
    fields:exportFieldsForApp(a).map(f=>Object.assign({},f)),
    totalFieldCount:a.totalFieldCount,
    requiredCount:a.requiredCount||0,
    lookupCount:a.lookupCount||0,
    refCount:a.refCount||0,
    depth:a.depth||0,
    ok:true,isCustom:true
  }));
  const customFields=[];
  APPS.filter(a=>!a.isCustom).forEach(a=>exportFieldsForApp(a).forEach(f=>{
    if(f.isCustom) customFields.push({appId:a.id,field:Object.assign({},f)});
  }));
  const customRelations=[];
  APPS.forEach(a=>(a.relations||[]).forEach(r=>{
    if(r.isCustom) customRelations.push({fromAppId:a.id,rel:Object.assign({},r)});
  }));
  const positions={};
  cy.nodes().forEach(n=>{
    if(n.hasClass("note-node")) return;
    const p=n.position();
    positions[n.id()]={x:Math.round(p.x*100)/100,y:Math.round(p.y*100)/100};
  });
  const notes=cy.nodes(".note-node").map(n=>{
    const p=n.position();
    return {id:n.id(),text:n.data("label"),color:n.data("noteColor"),x:Math.round(p.x*100)/100,y:Math.round(p.y*100)/100};
  });
  return {
    savedAt:new Date().toISOString(),
    options:{layoutName:ER_OPTIONS.layoutName,fieldDensity:ER_OPTIONS.fieldDensity},
    seq:{app:customAppSeq,rel:customRelSeq,field:customFieldSeq,note:noteSeq},
    appOverrides,fieldOverrides,relationOverrides,notes,
    customApps,customFields,customRelations,
    view:{
      positions,
      zoom:cy.zoom(),
      pan:cy.pan(),
      removedEdgeIds:[...manuallyRemovedEdgeIds],
      removedNodeIds:[...manuallyRemovedNodeIds],
      nodeHiddenEdgeIds:[...nodeHiddenEdgeIds],
      pinnedNodeIds:[...pinnedNodeIds],
      hiddenFieldKeys:[...hiddenFieldKeys],
      simpleMode,
      relationKinds:Object.assign({},relationKindState),
      relationLabels:relationLabelVisible,
      focusMode,focusDepth,focusDirection,
      theme:isDark?"d":"l",
      overviewHidden:document.getElementById("overview").classList.contains("hidden")
    }
  };
}
function exportEditedHtml(){
  try{
    const payload=captureEditState();
    const clone=document.documentElement.cloneNode(true);
    const cyHost=clone.querySelector("#cy");
    if(cyHost) cyHost.innerHTML="";
    const tip=clone.querySelector("#er-tooltip");
    if(tip && tip.parentNode) tip.parentNode.removeChild(tip);
    ["#cmd-overlay","#modal-overlay","#editor-overlay","#help-overlay","#detail","#minimap","#sidebar"].forEach(sel=>{
      const el=clone.querySelector(sel);
      if(el) el.classList.remove("open");
    });
    const toastEl=clone.querySelector("#toast");
    if(toastEl) toastEl.classList.remove("show");
    clone.querySelectorAll(".tb-menu.open").forEach(el=>el.classList.remove("open"));
    const oldState=clone.querySelector("#er-edit-state");
    if(oldState && oldState.parentNode) oldState.parentNode.removeChild(oldState);
    const liveRuntime=clone.querySelector("#er-runtime");
    if(liveRuntime && liveRuntime.parentNode) liveRuntime.parentNode.removeChild(liveRuntime);
    const main=clone.querySelector("#er-main");
    if(!main){toast("保存に失敗: 本体スクリプトが見つかりません");return;}
    const stateScript=document.createElement("script");
    stateScript.id="er-edit-state";
    const stateJson=JSON.stringify(payload)
      .replace(/</g,"\\\\u003c")
      .replace(/>/g,"\\\\u003e")
      .replace(/&/g,"\\\\u0026")
      .replace(/\\u2028/g,"\\\\u2028")
      .replace(/\\u2029/g,"\\\\u2029");
    stateScript.textContent="window.__ER_EDIT_STATE__="+stateJson+";";
    main.parentNode.insertBefore(stateScript,main);
    const html="<!DOCTYPE html>\\n"+clone.outerHTML;
    const blob=new Blob([html],{type:"text/html"});
    const a=document.createElement("a");
    const stamp=new Date().toISOString().slice(0,16).replace(/[-:]/g,"").replace("T","_");
    a.href=URL.createObjectURL(blob);
    a.download="ER図_編集済み_"+stamp+".html";
    a.style.display="none";
    document.body.appendChild(a);
    a.click();
    setTimeout(()=>{URL.revokeObjectURL(a.href);if(a.parentNode)a.parentNode.removeChild(a);},30000);
    toast("編集済みHTMLを保存しました（開き直すと編集状態を復元）");
  }catch(err){
    console.error("[ER] exportEditedHtml failed",err);
    toast("編集済みHTMLの保存に失敗: "+((err&&err.message)||err));
  }
}
function applySavedViewState(){
  if(!ER_EDIT_STATE || !ER_EDIT_STATE.view) return;
  const view=ER_EDIT_STATE.view;
  try{
    (view.removedEdgeIds||[]).forEach(id=>{
      const e=cy.getElementById(id);
      if(e.length){manuallyRemovedEdgeIds.add(id);e.addClass("rel-manual-hidden");}
    });
    (view.removedNodeIds||[]).forEach(id=>{
      const n=cy.getElementById(id);
      if(n.length){manuallyRemovedNodeIds.add(id);n.addClass("app-manual-hidden");}
    });
    (view.nodeHiddenEdgeIds||[]).forEach(id=>{
      const e=cy.getElementById(id);
      if(e.length){nodeHiddenEdgeIds.add(id);e.addClass("rel-manual-hidden");}
    });
    (view.pinnedNodeIds||[]).forEach(id=>{
      const n=cy.getElementById(id);
      if(n.length) pinNode(n,true);
    });
    (view.hiddenFieldKeys||[]).forEach(key=>hiddenFieldKeys.add(String(key)));
    if((view.hiddenFieldKeys||[]).length) refreshNodeLabels();
    if(view.relationKinds){
      ["LOOKUP","REF","ACTION"].forEach(k=>{relationKindState[k]=view.relationKinds[k]!==false;});
    }
    if(typeof view.relationLabels==="boolean") relationLabelVisible=view.relationLabels;
    if(typeof view.focusMode==="boolean") focusMode=view.focusMode;
    if(view.focusDepth){const sel=document.getElementById("focus-depth");if(sel)sel.value=String(view.focusDepth);}
    if(view.focusDirection){const sel=document.getElementById("focus-direction");if(sel)sel.value=view.focusDirection;}
    updateFocusOptions();
    syncFocusButton();
    syncRelationKindButtons();
    applyRelationFilter();
    applyRelationLabelVisibility();
    if(view.theme==="l"&&isDark){isDark=false;applyTheme();applyCyTheme();}
    if(view.overviewHidden) hideOverview();
    if(view.simpleMode) setSimpleMode(true);
    syncSimpleModeButton();
    refreshSidebar();
  }catch(err){console.error("[ER] 表示状態の復元に失敗",err);}
}

let _md={text:"",filename:""};
function openModal(t,text,fn){_md={text,filename:fn};document.getElementById("modal-title").textContent=t;document.getElementById("modal-content").textContent=text;document.getElementById("modal-overlay").classList.add("open");}
function closeModal(){document.getElementById("modal-overlay").classList.remove("open");}
function copyModal(){navigator.clipboard.writeText(_md.text).then(()=>toast("コピーしました！"));}
function downloadModal(){const b=new Blob([_md.text],{type:"text/plain"});const a=document.createElement("a");a.href=URL.createObjectURL(b);a.download=_md.filename;a.click();toast("ダウンロード: "+_md.filename);}

// safe name helper
const sn=s=>String(s==null?"":s).replace(/[^a-zA-Z0-9_\\u3000-\\u9FFF\\uF900-\\uFAFF]/g,"_").replace(/^_+|_+$/g,"")||"unnamed";
const entityAlias=app=>"app_"+String(app&&app.id||"unknown").replace(/[^0-9A-Za-z_]/g,"_");
const exportFieldsForApp=app=>allFieldsForApp(app);
const oneLineLabel=value=>String(value==null?"":value).replace(/[\\r\\n]+/g," ").replace(/"/g,"'");
const sqlIdentifier=value=>String.fromCharCode(96)+String(value==null?"":value).replace(/\`/g,"\`\`")+String.fromCharCode(96);
const exportStatusLabel=app=>app.status==="partial"?"一部取得":((app.status==="failed"||app.ok===false)?"取得失敗":"取得完了");
const exportIssueText=app=>(app.issues||[]).map(issue=>oneLineLabel(issue.message||issue.code||"取得上の注意")).filter(Boolean).join(" / ");
const exportRelationLabel=rel=>{
  const base=oneLineLabel(rel.fromDisplay||rel.fromLabel||rel.from||rel.kind);
  if(rel.kind==="REF"&&(rel.sourceJoinField||rel.from||rel.toField)) return base+" [結合: "+oneLineLabel(rel.sourceJoinField||rel.from||"?")+" → "+oneLineLabel(rel.toField||"?")+"]";
  return base;
};
function exportProvenanceEntries(){
  return [
    ["生成日時",new Date().toLocaleString("ja-JP")],
    ["起点アプリ",(ER_OPTIONS.startAppIds||[]).join(", ")||"-"],
    ["探索深さ",ER_OPTIONS.maxDepth?String(ER_OPTIONS.maxDepth):"無制限"],
    ["逆引き探索",ER_OPTIONS.includeReverseLookup?"ON":"OFF"],
    ["サブテーブル",ER_OPTIONS.includeSubtableFields!==false?"ON":"OFF"],
    ["項目範囲","取得済み全項目（図の表示密度とは独立）"],
    ["接続",(ER_OPTIONS.sourceGuestId?("ゲスト "+ER_OPTIONS.sourceGuestId):"通常空間")+"/"+(ER_OPTIONS.sourcePreview?"プレビュー":"本番")],
    ["取得状態","完了 "+ER_ANALYSIS.counts.retrievalComplete+" / 一部 "+ER_ANALYSIS.counts.retrievalPartial+" / 失敗 "+ER_ANALYSIS.counts.retrievalFailed],
    ["未取得の参照先",String((ER_ANALYSIS.unresolvedTargets||[]).length)],
    ["手動編集",(hiddenFieldKeys.size||manuallyRemovedEdgeIds.size||manuallyRemovedNodeIds.size||APPS.some(a=>a.isCustom))?"あり":"なし"]
  ];
}
const exportProvenanceLines=prefix=>exportProvenanceEntries().map(([key,value])=>(prefix?prefix+" ":"")+key+": "+oneLineLabel(value));

function showMermaid(){
  let m=exportProvenanceLines("%%").join("\\n")+"\\nerDiagram\\n";
  APPS.forEach(a=>{
    const n=entityAlias(a);
    m+="  %% "+n+": "+oneLineLabel(a.name)+" (App "+a.id+")\\n";
    m+="  %% 取得状態: "+exportStatusLabel(a)+(exportIssueText(a)?" / "+exportIssueText(a):"")+"\\n";
    const subtableFieldCount=exportFieldsForApp(a).filter(f=>f.inSubtable).length;
    if(subtableFieldCount) m+="  %% サブテーブル内 "+subtableFieldCount+"項目は親エンティティへ平坦化せず省略（ERモデルJSONに所属表を収録）\\n";
    const visibleName=(exportStatusLabel(a)==="取得完了"?"":("["+exportStatusLabel(a)+"] "))+oneLineLabel(a.name)+" (App "+a.id+")";
    m+="  "+n+'["'+visibleName+'"] {\\n';
    exportFieldsForApp(a).forEach(f=>{
      if(f.type==="SUBTABLE"||f.inSubtable) return;
      let com=""; if(f.isPK) com=" PK"; else if(f.isLookup) com=" FK";
      m+="    "+f.type.replace(/[^a-zA-Z0-9_]/g,"")+" "+sn(f.code)+com+"\\n";
    });
    m+="  }\\n";
  });
  const mermaidExternalIds=new Set();
  APPS.forEach(a=>(a.relations||[]).forEach(r=>{
    if(appMap.has(r.toApp)||mermaidExternalIds.has(String(r.toApp))) return;
    mermaidExternalIds.add(String(r.toApp));
    const alias=entityAlias({id:r.toApp});
    m+="  %% "+alias+": 未取得の参照先 (App "+oneLineLabel(r.toApp)+")\\n";
    m+="  "+alias+'["未取得の参照先 (App '+oneLineLabel(r.toApp)+')"] {\\n    string __unresolved\\n  }\\n';
  }));
  APPS.forEach(a=>{
    a.relations.forEach(r=>{
      const t=appMap.get(r.toApp)||{id:r.toApp};
      const label=exportRelationLabel(r);
      if(r.kind==="ACTION") m+="  %% ACTION "+entityAlias(a)+" -> "+entityAlias(t)+": "+label+"\\n";
      else m+="  "+entityAlias(a)+(r.kind==="LOOKUP"?" }o--o| ":" }o--o{ ")+entityAlias(t)+' : "'+label+'"\\n';
    });
  });
  openModal("Mermaid ER図",m,"ER図.mmd");
}

function showDrawio(){
  const esc=s=>String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
  const nodeId=id=>"A"+String(id==null?"unknown":id).replace(/[^0-9A-Za-z_]/g,"_");
  const drawioProvenance=exportProvenanceLines("").join(" | ").replace(/--/g,"—");
  let x='<!-- '+esc(drawioProvenance)+' --><mxfile host="app.diagrams.net"><diagram name="ER"><mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/>';
  const externalIds=[];
  APPS.forEach(a=>(a.relations||[]).forEach(r=>{
    if(!appMap.has(r.toApp)&&!externalIds.some(id=>String(id)===String(r.toApp))) externalIds.push(r.toApp);
  }));
  const drawioApps=APPS.map(a=>({app:a,external:false})).concat(externalIds.map(id=>({app:{id,name:"未取得の参照先 (App "+id+")",relations:[],allFields:[],fields:[],status:"failed",ok:false,issues:[{message:"図の探索範囲外または取得権限外"}]},external:true})));
  const colCount=3,boxWidth=330,rowGap=96,colGap=100;
  let rowY=0;
  for(let rowStart=0;rowStart<drawioApps.length;rowStart+=colCount){
    const row=drawioApps.slice(rowStart,rowStart+colCount);
    const heights=row.map(item=>Math.max(58,34+exportFieldsForApp(item.app).filter(f=>f.type!=="SUBTABLE").length*28));
    const rowHeight=Math.max(...heights,58);
    row.forEach((item,colIndex)=>{
      const a=item.app;
      const exportFields=exportFieldsForApp(a).filter(f=>f.type!=="SUBTABLE");
      const nid=nodeId(a.id),px=colIndex*(boxWidth+colGap),h=heights[colIndex];
      const status=exportStatusLabel(a);
      const issue=exportIssueText(a);
      const header=(status==="取得完了"?"":("["+status+"] "))+(a.name||("App "+a.id))+(issue?("&#xa;"+issue):"");
      const fill=item.external?"#F3F4F6":(status==="取得失敗"?"#FEE2E2":(status==="一部取得"?"#FEF3C7":"#EDE9FE"));
      x+='<mxCell id="'+nid+'" value="'+esc(header).replace(/&amp;#xa;/g,"&#xa;")+'" style="shape=table;startSize=34;container=1;childLayout=tableLayout;fillColor='+fill+';rounded=1;'+(item.external?'dashed=1;':'')+'" vertex="1" parent="1"><mxGeometry x="'+px+'" y="'+rowY+'" width="'+boxWidth+'" height="'+h+'" as="geometry"/></mxCell>';
      exportFields.forEach((f,fi)=>{
        let c="#FFF";if(f.isPK)c="#FFD700";else if(f.isLookup)c="#DBEAFE";else if(f.isRef)c="#D1FAE5";else if(f.inSubtable)c="#F3F4F6";else if(f.required)c="#FFE4E6";
        const tablePrefix=f.inSubtable?("["+String(f.tableLabel||f.tableCode||"サブテーブル")+"] "):"";
        const label=(f.isPK?"🔑 ":f.isLookup?"🔗 ":f.isRef?"📋 ":"")+tablePrefix+(f.label||f.code)+" ["+f.code+"]";
        const rid=nid+"_R"+fi;
        x+='<mxCell id="'+rid+'" value="" style="shape=tableRow;horizontal=0;startSize=0;swimlaneHead=0;" vertex="1" parent="'+nid+'"><mxGeometry y="'+(34+fi*28)+'" width="'+boxWidth+'" height="28" as="geometry"/></mxCell>';
        x+='<mxCell id="'+nid+"_F"+fi+'" value="'+esc(label)+'" style="shape=partialRectangle;fillColor='+c+';align=left;spacingLeft=6;strokeColor=#d0d0d0;" vertex="1" parent="'+rid+'"><mxGeometry width="'+boxWidth+'" height="28" as="geometry"/></mxCell>';
      });
    });
    rowY+=rowHeight+rowGap;
  }
  let ec=0;
  APPS.forEach(a=>a.relations.forEach(r=>{
    const st=r.kind==="LOOKUP"?"edgeStyle=orthogonalEdgeStyle;rounded=1;endArrow=classic;startArrow=oval;strokeColor=#0066CC;strokeWidth=2;":(r.kind==="REF"?"edgeStyle=orthogonalEdgeStyle;rounded=1;endArrow=classic;startArrow=diamond;dashed=1;strokeColor=#2E8B57;strokeWidth=2;":"edgeStyle=orthogonalEdgeStyle;rounded=1;endArrow=classic;dashed=1;strokeColor=#D97706;strokeWidth=2;");
    const label=(r.kind==="LOOKUP"?"ルックアップ":(r.kind==="REF"?"関連レコード":"アクション"))+": "+exportRelationLabel(r);
    x+='<mxCell id="E'+(ec++)+'" value="'+esc(label)+'" style="'+st+'" edge="1" parent="1" source="'+nodeId(a.id)+'" target="'+nodeId(r.toApp)+'"><mxGeometry relative="1" as="geometry"/></mxCell>';
  }));
  x+="</root></mxGraphModel></diagram></mxfile>";
  openModal("draw.io 用XML",x,"ER図.drawio");
}

function showSQL(){
  let sql="-- kintone ER図 → SQL DDL\\n"+exportProvenanceLines("--").join("\\n")+"\\n\\n";
  const typeMap={SINGLE_LINE_TEXT:"VARCHAR(256)",MULTI_LINE_TEXT:"TEXT",NUMBER:"DECIMAL(18,4)",CALC:"DECIMAL(18,4)",
    RICH_TEXT:"TEXT",CHECK_BOX:"TEXT",RADIO_BUTTON:"VARCHAR(128)",DROP_DOWN:"VARCHAR(128)",MULTI_SELECT:"TEXT",
    DATE:"DATE",TIME:"TIME",DATETIME:"DATETIME",LINK:"VARCHAR(512)",FILE:"TEXT",
    USER_SELECT:"TEXT",ORGANIZATION_SELECT:"TEXT",GROUP_SELECT:"TEXT",
    RECORD_NUMBER:"INT AUTO_INCREMENT",CREATOR:"VARCHAR(128)",MODIFIER:"VARCHAR(128)",
    CREATED_TIME:"DATETIME",UPDATED_TIME:"DATETIME",STATUS:"VARCHAR(64)",
    STATUS_ASSIGNEE:"TEXT",CATEGORY:"TEXT",LOOKUP:"VARCHAR(256)",REFERENCE_TABLE:"-- ref"};

  const sqlTableInfo=new Map();
  APPS.forEach(a=>{
    const tbl=entityAlias(a);
    sql+="-- "+oneLineLabel(a.name)+" (App "+a.id+")\\n";
    sql+="-- 取得状態: "+exportStatusLabel(a)+(exportIssueText(a)?" / "+exportIssueText(a):"")+"\\n";
    const cols=[];
    const columnByCode=new Map();
    const usedColumnNames=new Set();
    let omittedSubtableFields=0;
    exportFieldsForApp(a).forEach(f=>{
      if(f.inSubtable){omittedSubtableFields++;return;}
      if(f.type==="SUBTABLE"||f.type==="REFERENCE_TABLE") return;
      const baseCol=sn(f.code);
      let col=baseCol;
      let suffix=2;
      while(usedColumnNames.has(col)) col=baseCol+"_"+(suffix++);
      usedColumnNames.add(col);
      columnByCode.set(String(f.code||""),col);
      const dt=typeMap[f.type]||"TEXT";
      if(dt.startsWith("--")) return;
      let line="  "+sqlIdentifier(col)+" "+dt;
      if(f.isPK) line+=" PRIMARY KEY";
      else{
        if(f.required) line+=" NOT NULL";
        if(f.unique) line+=" UNIQUE";
      }
      cols.push(line);
    });
    sqlTableInfo.set(String(a.id),{table:tbl,columnByCode,emitted:cols.length>0});
    if(omittedSubtableFields) sql+="-- サブテーブル内の項目 "+omittedSubtableFields+"件は親テーブルへ平坦化せず省略しました。ERモデルJSONで所属表を確認してください。\\n";
    if(!cols.length){
      sql+="-- SQLへ変換できる取得済みフィールドがないため CREATE TABLE を省略しました。\\n\\n";
      return;
    }
    sql+="CREATE TABLE "+sqlIdentifier(tbl)+" (\\n"+cols.join(",\\n")+"\\n);\\n\\n";
  });

  // Foreign keys
  APPS.forEach(a=>{
    a.relations.filter(r=>r.kind==="LOOKUP"&&appMap.has(r.toApp)).forEach(r=>{
      const t=appMap.get(r.toApp);
      const sourceInfo=sqlTableInfo.get(String(a.id));
      const targetInfo=sqlTableInfo.get(String(t.id));
      const sourceColumn=sourceInfo&&sourceInfo.columnByCode.get(String(r.from||""));
      const targetColumn=targetInfo&&targetInfo.columnByCode.get(String(r.toField||""));
      if(!sourceInfo?.emitted||!targetInfo?.emitted||!sourceColumn||!targetColumn){
        sql+="-- Lookupの結合フィールドをSQLへ変換できません: "+oneLineLabel(a.name)+" → "+oneLineLabel(t.name)+"\\n";
        return;
      }
      sql+="ALTER TABLE "+sqlIdentifier(sourceInfo.table)+" ADD CONSTRAINT "+sqlIdentifier("fk_"+entityAlias(a)+"_"+sourceColumn)+" FOREIGN KEY ("+sqlIdentifier(sourceColumn)+") REFERENCES "+sqlIdentifier(targetInfo.table)+"("+sqlIdentifier(targetColumn)+");\\n";
    });
  });
  APPS.forEach(a=>(a.relations||[]).filter(r=>r.kind==="REF").forEach(r=>{
    sql+="-- 関連レコード（参照表示）: "+oneLineLabel(a.name)+" / "+exportRelationLabel(r)+" / App "+oneLineLabel(r.toApp)+"\\n";
  }));
  APPS.forEach(a=>(a.relations||[]).filter(r=>r.kind==="ACTION").forEach(r=>{
    sql+="-- アプリアクション（画面遷移）: "+oneLineLabel(a.name)+" / "+exportRelationLabel(r)+" / App "+oneLineLabel(r.toApp)+"\\n";
  }));
  APPS.forEach(a=>(a.relations||[]).filter(r=>!appMap.has(r.toApp)).forEach(r=>{
    sql+="-- 未取得の参照先: "+oneLineLabel(a.name)+" / "+exportRelationLabel(r)+" / App "+oneLineLabel(r.toApp)+"\\n";
  }));
  openModal("SQL DDL",sql,"ER図.sql");
}

function showPlantUML(){
  let p="@startuml\\n"+exportProvenanceLines("'").join("\\n")+"\\n!theme cerulean\\nskinparam linetype ortho\\n\\n";
  APPS.forEach(a=>{
    const n=entityAlias(a);
    p+="' 取得状態: "+exportStatusLabel(a)+(exportIssueText(a)?" / "+exportIssueText(a):"")+"\\n";
    const visibleName=(exportStatusLabel(a)==="取得完了"?"":("["+exportStatusLabel(a)+"] "))+oneLineLabel(a.name);
    p+='entity "'+visibleName+' (App '+a.id+')" as '+n+' {\\n';
    const subtableFieldCount=exportFieldsForApp(a).filter(f=>f.inSubtable).length;
    if(subtableFieldCount) p+="' サブテーブル内 "+subtableFieldCount+"項目は親エンティティへ平坦化せず省略（ERモデルJSONに所属表を収録）\\n";
    exportFieldsForApp(a).forEach(f=>{
      if(f.type==="SUBTABLE"||f.type==="REFERENCE_TABLE"||f.inSubtable) return;
      let prefix="  ";
      if(f.isPK) prefix="  * ";
      else if(f.isLookup) prefix="  # ";
      p+=prefix+sn(f.code)+" : "+f.type+(f.required?" <<required>>":"")+"\\n";
      if(f.isPK) p+="  --\\n";
    });
    p+="}\\n\\n";
  });
  const plantExternalIds=new Set();
  APPS.forEach(a=>(a.relations||[]).forEach(r=>{
    if(appMap.has(r.toApp)||plantExternalIds.has(String(r.toApp))) return;
    plantExternalIds.add(String(r.toApp));
    p+='entity "未取得の参照先 (App '+oneLineLabel(r.toApp)+')" as '+entityAlias({id:r.toApp})+' <<external>>\\n';
  }));
  APPS.forEach(a=>{
    a.relations.forEach(r=>{
      const t=appMap.get(r.toApp)||{id:r.toApp};
      const label=exportRelationLabel(r);
      if(r.kind==="LOOKUP") p+=entityAlias(a)+' }o--o| '+entityAlias(t)+' : "'+label+'"\\n';
      else if(r.kind==="REF") p+=entityAlias(a)+' }o--o{ '+entityAlias(t)+' : "'+label+'"\\n';
      else p+=entityAlias(a)+' ..> '+entityAlias(t)+' : "ACTION: '+label+'"\\n';
    });
  });
  p+="@enduml";
  openModal("PlantUML",p,"ER図.puml");
}

function showJSON(){
  const schema={
    kind:"kintone-er-model",
    schemaVersion:1,
    title:"kintone ERモデル",
    generated:new Date().toISOString(),
    options:{startAppIds:ER_OPTIONS.startAppIds||[],maxDepth:ER_OPTIONS.maxDepth||0,includeSubtableFields:ER_OPTIONS.includeSubtableFields!==false},
    completeness:{complete:ER_ANALYSIS.counts.retrievalComplete,partial:ER_ANALYSIS.counts.retrievalPartial,failed:ER_ANALYSIS.counts.retrievalFailed,unresolvedTargets:ER_ANALYSIS.unresolvedTargets||[]},
    apps:APPS.map(a=>({
      id:a.id,name:a.name,
      status:a.status|| (a.ok===false?"failed":"complete"),issues:a.issues||[],
      fields:exportFieldsForApp(a).map(f=>({code:f.code,label:f.label,type:f.type,path:f.path||f.code||"",required:f.required||false,unique:f.unique||false,isPrimaryKey:f.isPK||false,isLookup:f.isLookup||false,isRelatedRecord:f.isRef||false,inSubtable:f.inSubtable||false,tableCode:f.tableCode||"",tableLabel:f.tableLabel||""})),
      relations:a.relations.map(r=>({label:r.fromDisplay||r.fromLabel||r.from||r.kind,fromField:r.from,sourceJoinField:r.sourceJoinField||r.from||"",controlField:r.controlField||"",controlFieldLabel:r.controlFieldLabel||"",toApp:r.toApp,toField:r.toField,type:r.kind})),
    })),
  };
  openModal("ERモデル JSON",JSON.stringify(schema,null,2),"ERモデル.json");
}

// ─── CSV exports ───
function csvCell(v){
  const raw=String(v==null?"":v);
  const s=/^[\\t\\r\\n ]*[=+\\-@]/.test(raw)?"'"+raw:raw;
  return /[",\\n\\r]/.test(s) ? '"'+s.replace(/"/g,'""')+'"' : s;
}
function csvLine(arr){return arr.map(csvCell).join(",");}
function showCSVApps(){
  const rows=[["アプリID","アプリ名","項目数","項目範囲","リレーション数","Lookup数","関連レコード数","アクション数","必須項目数","深さ","開始点","取得状態","取得上の注意"]];
  APPS.forEach(a=>{
    const lookups=(a.relations||[]).filter(r=>r.kind==="LOOKUP").length;
    const refs=(a.relations||[]).filter(r=>r.kind==="REF").length;
    const acts=(a.relations||[]).filter(r=>r.kind==="ACTION").length;
    rows.push([a.id,a.name,exportFieldsForApp(a).length,"取得済み全項目",a.relations.length,lookups,refs,acts,a.requiredCount||0,a.depth||0,startAppIdSet.has(String(a.id))?"1":"0",exportStatusLabel(a),exportIssueText(a)]);
  });
  openModal("CSV (アプリ一覧)","\\ufeff"+rows.map(csvLine).join("\\n"),"ER図_アプリ一覧.csv");
}
function showCSVFields(){
  const rows=[["アプリID","アプリ名","取得状態","取得上の注意","項目範囲","現在の図に表示","フィールドコード","フィールド名","種類","必須","重複禁止","主キー","ルックアップ","関連","サブテーブル内","テーブルコード","テーブル名","技術パス"]];
  APPS.forEach(a=>{
    const visibleFieldSet=new Set(visibleFieldsForNode(a));
    exportFieldsForApp(a).forEach(f=>{
      rows.push([a.id,a.name,exportStatusLabel(a),exportIssueText(a),"取得済み全項目",visibleFieldSet.has(f)?"1":"0",f.code||"",buildFieldDisplayName(f),f.type||"",f.required?"1":"0",f.unique?"1":"0",f.isPK?"1":"0",f.isLookup?"1":"0",f.isRef?"1":"0",f.inSubtable?"1":"0",f.tableCode||"",f.tableLabel||"",f.path||f.code||""]);
    });
  });
  openModal("CSV (フィールド一覧)","\\ufeff"+rows.map(csvLine).join("\\n"),"ER図_フィールド一覧.csv");
}
function showCSVRelations(){
  const rows=[["種類","関連名","起点アプリID","起点アプリ名","起点の取得状態","起点の取得上の注意","表示部品","結合元フィールド","宛先アプリID","宛先アプリ名","宛先の取得状態","宛先フィールド"]];
  APPS.forEach(a=>{
    a.relations.forEach(r=>{
      const t=appMap.get(r.toApp);
      rows.push([r.kind,r.fromDisplay||r.fromLabel||r.from||r.kind,a.id,a.name,exportStatusLabel(a),exportIssueText(a),r.controlFieldLabel||r.controlField||"",r.kind==="ACTION"?"":(r.sourceJoinField||r.from||""),r.toApp,t?t.name:"未取得の参照先",t?exportStatusLabel(t):"未取得",r.toField||""]);
    });
  });
  openModal("CSV (リレーション一覧)","\\ufeff"+rows.map(csvLine).join("\\n"),"ER図_リレーション一覧.csv");
}

// ─── Markdown spec ───
function mdEsc(s){return String(s==null?"":s).replace(/\\|/g,"\\\\|").replace(/\\n/g," ");}
function showMarkdown(){
  const lines=[];
  lines.push("# kintone ER図 仕様書");
  lines.push("");
  lines.push("- 生成日時: " + new Date().toLocaleString("ja-JP"));
  lines.push("- 起点アプリ: " + ((ER_OPTIONS.startAppIds||[]).join(", ") || "-"));
  lines.push("- 探索深さ: " + (ER_OPTIONS.maxDepth||"無制限"));
  lines.push("- 逆引き探索: " + (ER_OPTIONS.includeReverseLookup?"ON":"OFF"));
  lines.push("- サブテーブル: " + (ER_OPTIONS.includeSubtableFields!==false?"ON":"OFF"));
  lines.push("- 項目範囲: 取得済み全項目（図の表示密度とは独立）");
  lines.push("- 接続: " + (ER_OPTIONS.sourceGuestId?("ゲスト "+ER_OPTIONS.sourceGuestId):"通常空間") + " / " + (ER_OPTIONS.sourcePreview?"プレビュー":"本番"));
  lines.push("- アプリ数: " + APPS.length);
  lines.push("- 総リレーション: " + APPS.reduce((s,a)=>s+a.relations.length,0));
  lines.push("- 取得完了: " + ER_ANALYSIS.counts.retrievalComplete);
  lines.push("- 一部取得: " + ER_ANALYSIS.counts.retrievalPartial);
  lines.push("- 取得失敗: " + ER_ANALYSIS.counts.retrievalFailed);
  lines.push("- 複数アプリの循環候補: " + ER_ANALYSIS.cycles.length);
  lines.push("- 自己参照: " + ER_ANALYSIS.selfReferences.length);
  lines.push("- 図内で関連のないアプリ: " + ER_ANALYSIS.isolatedAppIds.length);
  lines.push("- 未取得の参照先: " + ER_ANALYSIS.unresolvedTargets.length);
  lines.push("");
  lines.push("## 構造チェック（事実ベース）");
  lines.push("");
  if(ER_ANALYSIS.cycles.length){
    lines.push("### 複数アプリの循環候補");
    ER_ANALYSIS.cycles.forEach((cycle,i)=>lines.push("- 候補 "+(i+1)+": "+cycle.appNames.map(mdEsc).join(" → ")));
    lines.push("");
  }
  if(ER_ANALYSIS.hubs.length){
    lines.push("### 接続数が多いアプリ（"+ER_ANALYSIS.highConnectionThreshold+"件以上）");
    ER_ANALYSIS.hubs.forEach(hub=>lines.push("- "+mdEsc(hub.name)+" (App "+hub.appId+"): 入 "+hub.incoming+" / 出 "+hub.outgoing+" / 合計 "+hub.total));
    lines.push("");
  }
  lines.push("## アプリ一覧");
  lines.push("");
  lines.push("| アプリID | アプリ名 | 項目数 | 関連数 | 深さ | 状態 |");
  lines.push("|---:|---|---:|---:|---:|---|");
  APPS.forEach(a=>{
    lines.push("| "+a.id+" | "+mdEsc(a.name)+" | "+exportFieldsForApp(a).length+" | "+a.relations.length+" | "+(a.depth||0)+" | "+(a.status==="partial"?"一部取得":(a.ok?"取得完了":"取得失敗"))+" |");
  });
  lines.push("");
  APPS.forEach(a=>{
    lines.push("## "+mdEsc(a.name)+" (App "+a.id+")");
    lines.push("");
    lines.push("- 取得状態: "+exportStatusLabel(a));
    if(exportIssueText(a)) lines.push("- 取得上の注意: "+mdEsc(exportIssueText(a)));
    lines.push("");
    const vf=exportFieldsForApp(a);
    if(vf.length){
      lines.push("### フィールド");
      lines.push("");
      lines.push("| コード | 名称 | 種類 | 必須 | 主キー | Lookup | 関連 | サブテーブル |");
      lines.push("|---|---|---|:---:|:---:|:---:|:---:|:---:|");
      vf.forEach(f=>{
        lines.push("| "+mdEsc(f.code||"")+" | "+mdEsc(buildFieldDisplayName(f))+" | "+mdEsc(f.type||"")+" | "+(f.required?"✓":"")+" | "+(f.isPK?"✓":"")+" | "+(f.isLookup?"✓":"")+" | "+(f.isRef?"✓":"")+" | "+(f.inSubtable?"✓":"")+" |");
      });
      lines.push("");
    }
    if(a.relations && a.relations.length){
      lines.push("### リレーション");
      lines.push("");
      lines.push("| 種類 | 関連名 | 表示部品 | 結合元フィールド | 宛先アプリ | 宛先フィールド |");
      lines.push("|---|---|---|---|---|---|");
      a.relations.forEach(r=>{
        const t=appMap.get(r.toApp);
        lines.push("| "+r.kind+" | "+mdEsc(r.fromDisplay||r.fromLabel||r.from||r.kind)+" | "+mdEsc(r.controlFieldLabel||r.controlField||"")+" | "+mdEsc(r.kind==="ACTION"?"":(r.sourceJoinField||r.from||""))+" | "+mdEsc(t?t.name+" (App "+r.toApp+")":"未取得 (App "+r.toApp+")")+" | "+mdEsc(r.toField||"")+" |");
      });
      lines.push("");
    }
  });
  openModal("Markdown 仕様書",lines.join("\\n"),"ER図仕様書.md");
}

// ─── Zoom controls ───
function closeZoomPresets(){
  const presets=document.getElementById("zoom-presets");
  const trigger=document.getElementById("zoom-level");
  const restoreFocus=!!(presets&&presets.contains(document.activeElement));
  presets?.classList.remove("open");
  trigger?.setAttribute("aria-expanded","false");
  if(restoreFocus) trigger?.focus();
}
function toggleZoomPresets(){
  const presets=document.getElementById("zoom-presets");
  const trigger=document.getElementById("zoom-level");
  if(!presets||!trigger) return;
  const open=!presets.classList.contains("open");
  presets.classList.toggle("open",open);
  trigger.setAttribute("aria-expanded",String(open));
  if(open){
    const current=presets.querySelector('[aria-pressed="true"]')||presets.querySelector("button");
    current?.focus();
  }
}
function updateZoomLabel(){
  const percent=Math.round(cy.zoom()*100);
  applySemanticZoom(cy.zoom());
  const value=document.getElementById("zoom-value");
  const mode=document.getElementById("zoom-mode");
  const trigger=document.getElementById("zoom-level");
  if(value) value.textContent=percent+"%";
  if(mode) mode.textContent=cy.zoom()<0.35?"構造":(cy.zoom()<0.7?"概要":"");
  if(trigger){
    trigger.setAttribute("aria-label","現在の表示倍率 "+percent+"%。倍率プリセットを開く");
    trigger.title=cy.zoom()<0.35
      ? "低倍率のため文字を隠した構造表示です。クリックして倍率を選択"
      : cy.zoom()<0.7
      ? "アプリ名と件数に絞った概要表示です。クリックして倍率を選択"
      : "倍率を選択";
  }
  document.querySelectorAll(".zoom-preset").forEach(button=>{
    button.setAttribute("aria-pressed",String(Number(button.dataset.zoom)===percent));
  });
}
function setZoomLevel(level){
  cy.zoom({level:Math.max(cy.minZoom(),Math.min(level,cy.maxZoom())),renderedPosition:{x:cy.width()/2,y:cy.height()/2}});
  updateZoomLabel();
}
function setZoomPercent(percent){setZoomLevel(Number(percent)/100);closeZoomPresets();document.getElementById("zoom-level")?.focus();}
function zoomIn(){closeZoomPresets();setZoomLevel(cy.zoom()*1.25);}
function zoomOut(){closeZoomPresets();setZoomLevel(cy.zoom()/1.25);}
function zoomReset(){closeZoomPresets();cy.zoom(1);cy.center();updateZoomLabel();}
cy.on("zoom", updateZoomLabel);
setTimeout(updateZoomLabel, 300);

// ─── Fullscreen ───
function toggleFullscreen(){
  const doc=document;
  const el=doc.documentElement;
  try{
    if(!doc.fullscreenElement){
      (el.requestFullscreen||el.webkitRequestFullscreen||el.msRequestFullscreen).call(el);
    }else{
      (doc.exitFullscreen||doc.webkitExitFullscreen||doc.msExitFullscreen).call(doc);
    }
  }catch(_){ toast("フルスクリーンに対応していません"); }
}
document.addEventListener("fullscreenchange",()=>{
  const btn=document.getElementById("fs-btn");
  if(btn) btn.textContent = document.fullscreenElement ? "⛔" : "⛶";
});

// ─── Dropdown menus ───
function toggleMenu(id){
  const m=document.getElementById(id);
  if(!m) return;
  const willOpen=!m.classList.contains("open");
  closeAllMenus();
  if(willOpen) m.classList.add("open");
}
function closeAllMenus(){ document.querySelectorAll(".tb-menu.open").forEach(x=>x.classList.remove("open")); }
document.addEventListener("click",(e)=>{
  const inside=e.target.closest(".tb-menu");
  if(!inside) closeAllMenus();
  if(!e.target.closest("#zoom-ctrl")) closeZoomPresets();
});

// ─── Mobile menu toggle ───
function toggleMobileMenu(){
  const topbar=document.getElementById("topbar");
  const open=!topbar.classList.contains("mobile-open");
  topbar.classList.toggle("mobile-open",open);
  document.getElementById("mobile-menu-btn")?.setAttribute("aria-expanded",String(open));
  requestAnimationFrame(syncTopbarHeight);
}
function closeMobileMenu(){
  document.getElementById("topbar")?.classList.remove("mobile-open");
  document.getElementById("mobile-menu-btn")?.setAttribute("aria-expanded","false");
  requestAnimationFrame(syncTopbarHeight);
}
function syncTopbarHeight(){
  const topbar=document.getElementById("topbar");
  if(!topbar) return;
  const height=Math.max(52,Math.ceil(topbar.getBoundingClientRect().height));
  document.documentElement.style.setProperty("--topbar-h",height+"px");
}
function syncBottomUiOffsets(){
  const root=document.documentElement;
  const legend=document.getElementById("legend");
  const pathfinder=document.getElementById("pathfinder");
  const legendHeight=legend?Math.ceil(legend.getBoundingClientRect().height)+8:50;
  const shouldStackPath=!!pathfinder?.classList.contains("open");
  const pathfinderLift=shouldStackPath?Math.ceil(pathfinder.getBoundingClientRect().height)+12:0;
  root.style.setProperty("--legend-stack-height",legendHeight+"px");
  root.style.setProperty("--pathfinder-lift",pathfinderLift+"px");
}
const erTopbar=document.getElementById("topbar");
if(erTopbar&&typeof ResizeObserver==="function") new ResizeObserver(syncTopbarHeight).observe(erTopbar);
const erBottomResizeObserver=typeof ResizeObserver==="function"?new ResizeObserver(syncBottomUiOffsets):null;
erBottomResizeObserver?.observe(document.getElementById("legend"));
erBottomResizeObserver?.observe(document.getElementById("pathfinder"));
window.addEventListener("resize",()=>{syncTopbarHeight();syncBottomUiOffsets();},{passive:true});
syncTopbarHeight();
syncBottomUiOffsets();
if(window.matchMedia&&window.matchMedia("(max-width:640px)").matches){
  document.getElementById("overview")?.classList.add("collapsed");
}

// ─── Help modal ───
function openHelp(){ document.getElementById("help-overlay").classList.add("open"); }
function closeHelp(){ document.getElementById("help-overlay").classList.remove("open"); }

// ─── Share URL (encodes current state in hash) ───
function encodeState(){
  const state={
    l: ER_OPTIONS.layoutName,
    d: ER_OPTIONS.fieldDensity,
    f: focusMode ? 1 : 0,
    fd: focusDepth,
    fdir: focusDirection,
    rl: relationLabelVisible ? 1 : 0,
    rk: (relationKindState.LOOKUP?"L":"") + (relationKindState.REF?"R":"") + (relationKindState.ACTION?"A":""),
    t: isDark ? "d" : "l"
  };
  return btoa(unescape(encodeURIComponent(JSON.stringify(state))));
}
function applyStateFromHash(){
  try{
    const h=location.hash.replace(/^#/,"");
    if(!h) return;
    const state=JSON.parse(decodeURIComponent(escape(atob(h))));
    if(state.l) setLayout(normalizeLayoutName(state.l));
    if(state.d) setDensity(normalizeDensityName(state.d));
    if(typeof state.f === "number"){ if(!!state.f !== focusMode) toggleFocusMode(); }
    if(state.fd){ const sel=document.getElementById("focus-depth"); if(sel) sel.value=String(state.fd); }
    if(state.fdir){ const sel=document.getElementById("focus-direction"); if(sel) sel.value=state.fdir; }
    if(state.rk){
      if(relationKindState.LOOKUP !== state.rk.includes("L")) toggleRelationKind("LOOKUP");
      if(relationKindState.REF !== state.rk.includes("R")) toggleRelationKind("REF");
      if(relationKindState.ACTION !== state.rk.includes("A")) toggleRelationKind("ACTION");
    }
    if(typeof state.rl === "number" && !!state.rl !== relationLabelVisible) toggleRelationLabels();
    if(state.t === "l" && isDark) toggleTheme();
    if(state.t === "d" && !isDark) toggleTheme();
    updateFocusOptions();
  }catch(_){ /* ignore */ }
}
function copyShareUrl(){
  const url=location.origin+location.pathname+"#"+encodeState();
  try{
    navigator.clipboard.writeText(url).then(()=>toast("表示状態のURLをコピーしました"));
  }catch(_){
    prompt("URLをコピーしてください", url);
  }
}
setTimeout(applyStateFromHash, 350);

// ─── Print ───
function printDiagram(){
  const data=cy.png({ full:true, scale:2, bg: currentPalette().bg });
  const w=window.open("","_blank");
  if(!w){ toast("別タブを開けませんでした"); return; }
  try{w.opener=null;}catch(_){}
  w.document.write('<title>kintone ER図 印刷</title><body style="margin:0;padding:0;text-align:center;"><img src="'+data+'" style="max-width:100%;height:auto"/></body>');
  w.document.close();
  setTimeout(()=>{ try{ w.focus(); w.print(); }catch(_){} }, 500);
}

// ─── Double-click to isolate ───
cy.on("dbltap","node",e=>{
  const n=e.target;
  if(n.hasClass("note-node")) return;
  const neighborhood=n.closedNeighborhood();
  cy.elements().not(".note-node").addClass("dimmed");
  neighborhood.removeClass("dimmed").addClass("highlighted");
  toast("ダブルクリック: 接続アプリのみ表示（背景クリックで解除）");
});

// ─── Double-click background to add an entity at that position ───
cy.on("dbltap",e=>{
  if(e.target===cy) openAddApp({x:e.position.x,y:e.position.y});
});

// ─── Hover tooltip（ノード / 関連線） ───
let tipEl;
function ensureTip(){
  if(tipEl) return tipEl;
  tipEl=document.createElement("div");
  tipEl.id="er-tooltip";
  Object.assign(tipEl.style,{position:"fixed",zIndex:"999",background:"var(--surface)",border:"1px solid var(--border)",borderRadius:"8px",padding:"8px 12px",fontSize:"11px",fontFamily:"'DM Mono',monospace",pointerEvents:"none",boxShadow:"0 4px 16px rgba(0,0,0,0.3)",maxWidth:"300px"});
  document.body.appendChild(tipEl);
  return tipEl;
}
function relationKindJp(kind){
  return kind==="LOOKUP"?"ルックアップ":(kind==="REF"?"関連レコード":"アクション");
}
cy.on("mouseover","node",e=>{
  if(e.target.hasClass("note-node")) return;
  const app=appMap.get(e.target.data("appId"));
  if(!app) return;
  ensureTip();
  const _v = visibleFieldsForNode(app).length;
  const _t = typeof app.totalFieldCount === "number" ? app.totalFieldCount : _v;
  const _itemText = _t > _v ? (_v + "/" + _t) : _v;
  tipEl.innerHTML="<b>"+escapeHtml(app.name)+"</b> "+(app.isCustom?"(手動追加)":"(ID:"+escapeHtml(String(app.id))+")")+"<br>項目: "+_itemText+" | 関連: "+app.relations.length+" | 深さ: "+(app.depth || 0);
  tipEl.style.display="block";
});
cy.on("mouseout","node",()=>{if(tipEl) tipEl.style.display="none";});
// 線にマウスを乗せると強調 + ラベル非表示中でも内容をその場で確認できる
cy.on("mouseover","edge",e=>{
  const edge=e.target;
  if(edge.hasClass("rel-hidden")||edge.hasClass("rel-manual-hidden")||edge.hasClass("edge-collapsed")) return;
  edge.addClass("edge-hover");
  const src=appMap.get(edge.source().data("appId"));
  const dst=appMap.get(edge.target().data("appId"));
  ensureTip();
  tipEl.innerHTML="<b>"+escapeHtml(edge.data("fromDisplay")||edge.data("fromLabel")||relationKindJp(edge.data("kind")))+"</b><br>"
    +escapeHtml(src?src.name:"?")+" → "+escapeHtml(dst?dst.name:"?")
    +"<br>種類: "+relationKindJp(edge.data("kind"))+(edge.data("isCustom")?"（手動追加）":"");
  tipEl.style.display="block";
});
cy.on("mouseout","edge",e=>{
  e.target.removeClass("edge-hover");
  if(tipEl) tipEl.style.display="none";
});
cy.on("mousemove",e=>{if(tipEl&&tipEl.style.display==="block"){tipEl.style.left=(e.originalEvent.clientX+14)+"px";tipEl.style.top=(e.originalEvent.clientY+14)+"px";}});

// ─── 編集済みHTMLの表示状態を復元（全初期化の最後に実行） ───
applySavedViewState();
<\/script>
<script>
(function(){
  const source=document.getElementById("er-main");
  if(typeof window.cytoscape==="function"){
    const runtime=document.createElement("script");
    runtime.id="er-runtime";
    runtime.textContent=source.textContent||"";
    source.after(runtime);
    return;
  }
  document.getElementById("topbar")?.setAttribute("hidden","");
  document.getElementById("overview")?.setAttribute("hidden","");
  document.getElementById("legend")?.setAttribute("hidden","");
  const host=document.getElementById("cy");
  host.style.cssText="position:fixed;inset:0;overflow:auto;padding:32px;background:#f8fafc;color:#0f172a;font:14px/1.65 sans-serif";
  host.innerHTML='<main style="max-width:960px;margin:auto"><h1 style="font-size:22px;margin-bottom:8px">ER図ライブラリを読み込めませんでした</h1><p>ネットワークまたはCDNの制限により図を描画できません。接続を確認して再読み込みしてください。取得済みのアプリ一覧は下表で確認できます。</p><table style="width:100%;margin-top:20px;border-collapse:collapse"><thead><tr><th>アプリID</th><th>アプリ名</th><th>項目数</th><th>関連数</th><th>取得状態</th></tr></thead><tbody>${runtimeFallbackRows}</tbody></table></main>';
})();
<\/script>
</body>
</html>`
    );
  };

  // src/tabs/er-standalone.ts
  init_api();
  init_utils();
  async function applySpaceToErOptions(opts, options, setStatus2) {
    const spaceId = String(opts.spaceId || "").trim();
    if (!/^\d+$/.test(spaceId)) return;
    let apps = Array.isArray(opts.spaceApps) ? opts.spaceApps : null;
    if (!apps) {
      setStatus2(`スペース ${spaceId} のアプリ一覧を取得中...`);
      apps = await fetchAppsInSpace(spaceId, opts.guestId);
    }
    const spaceIds = apps.map((a) => String(a.appId));
    options.spaceId = spaceId;
    options.spaceAppIds = spaceIds;
    const spaceIdSet = new Set(spaceIds);
    const selected = Array.isArray(opts.spaceSelectedAppIds) ? opts.spaceSelectedAppIds.map((v) => String(v)).filter((v) => spaceIdSet.has(v)) : null;
    const additions = selected ?? spaceIds;
    options.startAppIds = [...options.startAppIds, ...additions].filter(
      (v, i, a) => /^\d+$/.test(String(v)) && a.indexOf(v) === i
    );
  }
  function buildErCrawlOptions(opts) {
    const appId = String(opts?.appId || "").trim();
    const primaryAppIds = Array.isArray(opts?.appIds) && opts.appIds.length ? opts.appIds : [appId];
    const startAppIds = [...primaryAppIds, ...opts?.extraAppIds || []].map((v) => String(v || "").trim()).filter((v, i, a) => /^\d+$/.test(v) && a.indexOf(v) === i);
    const maxDepthRaw = Number(opts?.maxDepth);
    return {
      startAppId: startAppIds[0] || appId,
      startAppIds,
      layoutName: opts?.layoutName || ER_DEFAULTS.layoutName,
      fieldDensity: opts?.fieldDensity || ER_DEFAULTS.fieldDensity,
      maxDepth: Number.isFinite(maxDepthRaw) && maxDepthRaw >= 0 ? Math.floor(maxDepthRaw) : 0,
      includeSubtableFields: opts?.includeSubtableFields !== false,
      includeReverseLookup: !!opts?.includeReverseLookup,
      maxFields: ER_DEFAULTS.maxFields,
      sleepMs: ER_DEFAULTS.sleepMs,
      source: { guestId: opts?.guestId || "", preview: !!opts?.preview }
    };
  }
  async function resolveErOptions(opts, setStatus2) {
    const appId = String(opts.appId || "").trim();
    const spaceId = String(opts.spaceId || "").trim();
    if (!appId && !spaceId) throw new Error("アプリID または スペースID を入力してください");
    const options = buildErCrawlOptions(opts);
    await applySpaceToErOptions(opts, options, setStatus2);
    if (!options.startAppIds.length) throw new Error("対象アプリが見つかりませんでした");
    return options;
  }
  function summarizeCrawl(apps) {
    const partialCount = apps.filter((app) => app?.status === "partial").length;
    const failedCount = apps.filter((app) => app?.status === "failed" || app?.ok === false).length;
    return { partialCount, failedCount, note: partialCount || failedCount ? `（一部取得 ${partialCount} / 取得失敗 ${failedCount}）` : "" };
  }
  async function runGenerateERDiagramStandalone(opts, setStatus2) {
    const options = await resolveErOptions(opts, setStatus2);
    const popup = window.open("", "_blank");
    if (!popup) throw new Error("別タブを開けませんでした。ポップアップブロックを確認してください");
    try {
      popup.opener = null;
    } catch (_) {
    }
    popup.document.write('<title>ER図</title><body style="font-family:sans-serif;padding:24px">ER図を生成中...</body>');
    setStatus2(`ER図を生成中... 起点 ${options.startAppIds.join(",")}`);
    progressUi.init();
    progressUi.update(4, `開始: 起点 ${options.startAppIds.join(",")}`);
    try {
      const apps = await crawl(options.startAppIds, options);
      progressUi.update(94, "HTML生成中...");
      const html = buildHTML(apps, options);
      const blob = new Blob([html], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      popup.location.href = url;
      progressUi.close();
      const summary = summarizeCrawl(apps);
      setStatus2(summary.note ? `ER図を生成しました: ${apps.length}アプリ${summary.note}` : `ER図の生成完了: ${apps.length}アプリを別タブ表示しました`, !!summary.failedCount);
      setTimeout(() => URL.revokeObjectURL(url), 60 * 1e3);
    } catch (e) {
      try {
        popup.close();
      } catch (_) {
      }
      progressUi.error(e.message || String(e));
      throw e;
    }
  }
  async function runExportERDiagramHtmlStandalone(opts, setStatus2) {
    const appId = String(opts.appId || "").trim();
    const spaceId = String(opts.spaceId || "").trim();
    const options = await resolveErOptions(opts, setStatus2);
    setStatus2(`ER図HTMLを生成中... 起点 ${options.startAppIds.join(",")}`);
    progressUi.init();
    progressUi.update(4, `開始: 起点 ${options.startAppIds.join(",")}`);
    try {
      const apps = await crawl(options.startAppIds, options);
      progressUi.update(94, "HTML保存データ生成中...");
      const html = buildHTML(apps, options);
      const baseName = options.startAppIds[0] || appId || `space${spaceId}`;
      const suffix = `${opts.guestId ? `guest${opts.guestId}_` : ""}${opts.preview ? "プレビュー" : "本番"}`;
      downloadText(
        buildExportFilename("ER図", "html", { appLabel: buildAppFilenameLabel(baseName, ""), suffix }),
        html,
        "text/html"
      );
      progressUi.close();
      const summary = summarizeCrawl(apps);
      setStatus2(summary.note ? `ER図HTMLを保存しました: ${apps.length}アプリ${summary.note}` : `ER図HTMLを保存しました (${apps.length}アプリ)`, !!summary.failedCount);
    } catch (e) {
      progressUi.error(e.message || String(e));
      throw e;
    }
  }

  // src/entries/er-lite-ui.ts
  init_api();

  // src/entries/litePanelTheme.ts
  init_components();
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
    function setStatus2(msg, tone = "neutral") {
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
    function setBusy2(busy) {
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
    return { root: root2, body, status, result, setStatus: setStatus2, setResult, setResultHtml, setBusy: setBusy2, close, setPrimaryAction };
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

  // src/entries/er-lite-ui.ts
  function mountErLitePanel() {
    const panel = createLitePanel({
      id: "kus-er-lite",
      title: "ER 図",
      subtitle: "起点アプリからルックアップ／関連レコードを辿り ER 図を生成します。",
      accent: "er",
      badges: [{ label: "Lite" }, { label: "可視化" }],
      hint: "Cytoscape を CDN から動的読込します。生成後の HTML 出力でレポートに添付できます。"
    });
    const cardMain = makeCard({ title: "起点アプリ", number: 1 });
    const appInp = makeInput({ placeholder: "アプリID（複数はカンマ区切り）", value: DEFAULT_APP_ID || "", width: "wide" });
    const guestInp = makeInput({ placeholder: "ゲストID（任意）", width: "guest" });
    cardMain.body.appendChild(makeRow([appInp, guestInp], { label: "起点ID" }));
    cardMain.body.appendChild(createAppSearchControl(panel, {
      guestEl: guestInp,
      targets: [{ apply: (id, _name) => {
        appInp.value = id;
      } }]
    }));
    const bOpen = makeButton("ER 図を開く", "primary", { icon: "◉" });
    const bSave = makeButton("HTML 保存", "ghost", { icon: "↓" });
    const btnRow = makeRow([bOpen, bSave]);
    btnRow.style.marginTop = "6px";
    cardMain.body.appendChild(btnRow);
    panel.body.insertBefore(cardMain.card, panel.status);
    const presetCard = makeCard({ title: "プリセット", soft: true });
    const presetRow = document.createElement("div");
    presetRow.className = "kus-lp__btn-row";
    const ER_PRESETS = {
      current: { label: "現在のみ", layout: "dagre", density: "standard", depth: "1", subtable: true, reverse: false },
      neighborhood: { label: "周辺 (深さ2)", layout: "dagre", density: "standard", depth: "2", subtable: true, reverse: false },
      reverse: { label: "逆引きあり", layout: "dagre", density: "standard", depth: "2", subtable: true, reverse: true },
      full: { label: "すべて辿る", layout: "cose", density: "standard", depth: "0", subtable: true, reverse: true },
      space: { label: "スペース全体", layout: "dagre", density: "standard", depth: "2", subtable: true, reverse: false, focusSpace: true }
    };
    for (const [key, p] of Object.entries(ER_PRESETS)) {
      const btn = makeButton(p.label, "sub");
      btn.addEventListener("click", () => {
        layoutSel.value = p.layout;
        densitySel.value = p.density;
        depthInp.value = p.depth;
        subtableCb.checkbox.checked = p.subtable;
        reverseCb.checkbox.checked = p.reverse;
        details.details.open = true;
        if (p.focusSpace) {
          try {
            spaceInp.focus();
            spaceInp.scrollIntoView({ behavior: "smooth", block: "center" });
          } catch {
          }
        }
        panel.setStatus(`ER プリセット「${p.label}」を適用しました`, "info");
      });
      presetRow.appendChild(btn);
    }
    presetCard.body.appendChild(presetRow);
    presetCard.body.appendChild(makeNote("クリックで「探索深さ／密度／レイアウト／逆引き」を一括設定します。あとから詳細オプションで微調整できます。"));
    panel.body.insertBefore(presetCard.card, panel.status);
    const details = makeDetails("詳細オプション");
    const extra = makeInput({ placeholder: "カンマ区切り (例: 100, 120)", width: "wide" });
    const spaceInp = makeInput({ placeholder: "スペースID", width: "narrow" });
    const layoutSel = makeSelect([
      ["dagre", "Dagre（推奨）"],
      ["breadthfirst", "ツリー"],
      ["cose", "フォース"],
      ["concentric", "同心円"],
      ["grid", "グリッド"],
      ["circle", "円形"]
    ], "dagre");
    const densitySel = makeSelect([
      ["standard", "標準"],
      ["compact", "コンパクト"],
      ["full", "詳細"],
      ["none", "結合のみ（項目非表示）"]
    ], "standard");
    const depthInp = makeInput({ placeholder: "0=無制限", value: "0", type: "number", width: "narrow" });
    depthInp.setAttribute("min", "0");
    const subtableCb = makeCheck({ label: "サブテーブル展開", checked: true });
    const reverseCb = makeCheck({ label: "逆引き探索", checked: false });
    const spaceLoadBtn = makeButton("スペース内アプリを読込", "sub");
    const spacePickerHost = document.createElement("div");
    Object.assign(spacePickerHost.style, {
      display: "none",
      width: "100%",
      maxHeight: "200px",
      overflowY: "auto",
      border: "1px solid #e2e8f0",
      borderRadius: "8px",
      background: "#f8fafc",
      padding: "8px",
      marginTop: "4px"
    });
    let spaceAppsCache = null;
    const spaceCacheKey = () => `${spaceInp.value.trim()}|${guestInp.value.trim()}`;
    function renderSpacePicker(spaceId, apps) {
      spacePickerHost.innerHTML = "";
      spacePickerHost.dataset.spaceId = spaceId;
      spacePickerHost.style.display = "block";
      if (!apps.length) {
        spacePickerHost.textContent = "このスペースにアプリが見つかりませんでした。";
        return;
      }
      const head = document.createElement("div");
      Object.assign(head.style, { display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px", marginBottom: "6px", flexWrap: "wrap" });
      const lbl = document.createElement("span");
      lbl.textContent = `スペース #${spaceId} のアプリ（${apps.length}件）— 起点にするアプリを選択`;
      Object.assign(lbl.style, { fontSize: "11px", fontWeight: "700", color: "#334155" });
      const btns = document.createElement("span");
      for (const [text, on] of [["全選択", true], ["全解除", false]]) {
        const b = makeButton(text, "sub");
        b.addEventListener("click", () => {
          spacePickerHost.querySelectorAll("input[data-space-app]").forEach((c) => {
            c.checked = on;
          });
        });
        btns.appendChild(b);
      }
      head.appendChild(lbl);
      head.appendChild(btns);
      spacePickerHost.appendChild(head);
      for (const a of apps) {
        const item = document.createElement("label");
        Object.assign(item.style, { display: "flex", alignItems: "center", gap: "6px", padding: "3px 4px", fontSize: "11px", cursor: "pointer" });
        const cb = document.createElement("input");
        cb.type = "checkbox";
        cb.checked = true;
        cb.dataset.spaceApp = String(a.appId);
        const name = document.createElement("span");
        name.textContent = `${a.name || `アプリ ${a.appId}`} (#${a.appId})`;
        Object.assign(name.style, { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" });
        item.appendChild(cb);
        item.appendChild(name);
        spacePickerHost.appendChild(item);
      }
    }
    async function loadSpaceApps() {
      const spaceId = spaceInp.value.trim();
      if (!/^\d+$/.test(spaceId)) throw new Error("スペースIDを数値で入力してください");
      const key = spaceCacheKey();
      let apps;
      if (spaceAppsCache && spaceAppsCache.key === key) {
        apps = spaceAppsCache.apps;
      } else {
        apps = await fetchAppsInSpace(spaceId, guestInp.value.trim());
        spaceAppsCache = { key, apps };
      }
      renderSpacePicker(spaceId, apps);
      panel.setStatus(`スペース ${spaceId} のアプリ ${apps.length}件を読み込みました。起点にするアプリを選択してください`, "info");
    }
    spaceLoadBtn.addEventListener("click", () => liteRun(panel, "スペース内アプリを取得中…", loadSpaceApps));
    details.body.appendChild(makeRow(extra, { label: "追加起点" }));
    details.body.appendChild(makeRow([spaceInp, spaceLoadBtn], { label: "スペースID" }));
    details.body.appendChild(spacePickerHost);
    details.body.appendChild(makeRow(layoutSel, { label: "レイアウト" }));
    details.body.appendChild(makeRow(densitySel, { label: "表示密度" }));
    details.body.appendChild(makeRow(depthInp, { label: "探索深さ" }));
    details.body.appendChild(makeRow([subtableCb.label, reverseCb.label]));
    details.body.appendChild(makeNote("起点ID / 追加起点はいずれもカンマ区切りで複数指定できます。追加起点は最初の起点と統合して同一グラフに描画されます。スペースIDを入れて「スペース内アプリを読込」を押すと、任意のアプリだけを選んで起点にできます（重複するアプリは自動で1回だけ取得されます）。"));
    function parseAppIds(value) {
      return String(value || "").split(/[\s,，]+/).map((v) => v.trim()).filter(Boolean);
    }
    panel.body.insertBefore(details.details, panel.status);
    function source() {
      const spaceId = spaceInp.value.trim();
      const cacheHit = !!(spaceAppsCache && spaceAppsCache.key === spaceCacheKey());
      const pickerMatches = cacheHit && spacePickerHost.dataset.spaceId === spaceId && spacePickerHost.style.display !== "none";
      const selectedIds = pickerMatches ? Array.from(spacePickerHost.querySelectorAll("input[data-space-app]")).filter((c) => c.checked).map((c) => String(c.dataset.spaceApp || "")) : null;
      return {
        appId: appInp.value.trim(),
        appIds: parseAppIds(appInp.value),
        guestId: guestInp.value.trim(),
        preview: false,
        layoutName: layoutSel.value,
        fieldDensity: densitySel.value,
        maxDepth: Number(depthInp.value) || 0,
        includeSubtableFields: subtableCb.checkbox.checked,
        includeReverseLookup: reverseCb.checkbox.checked,
        extraAppIds: parseAppIds(extra.value),
        spaceId,
        spaceApps: cacheHit ? spaceAppsCache.apps : void 0,
        spaceSelectedAppIds: selectedIds ?? void 0
      };
    }
    bOpen.addEventListener("click", () => liteRun(panel, "ER 図を生成中…", async () => {
      await runGenerateERDiagramStandalone(source(), (m, e) => panel.setStatus(m, e ? "err" : "busy"));
    }));
    bSave.addEventListener("click", () => liteRun(panel, "HTML 生成中…", async () => {
      await runExportERDiagramHtmlStandalone(source(), (m, e) => panel.setStatus(m, e ? "err" : "busy"));
    }));
  }

  // src/entries/er-lite-entry.ts
  runOnKintonePage(mountErLitePanel);
})();
