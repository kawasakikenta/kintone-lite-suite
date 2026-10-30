// ==========================================================================
// プレビュー反映.js  —  自動生成ファイル（手編集禁止）
// ==========================================================================
// このファイルは tools/統合ツール/ の npm run build (esbuild) で生成されます。
// ソース: tools/統合ツール/src/entries/reflect-lite-entry.js
//         tools/統合ツール/src/tabs/reflect.js  ← 機能の正規実装
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
  function guestIdFromKintonePath(pathname) {
    const match = /^\/k\/guest\/(\d+)\//.exec(String(pathname || ""));
    return match ? match[1] : "";
  }
  function resolveDefaultGuestId() {
    try {
      return typeof window === "undefined" ? "" : guestIdFromKintonePath(window.location?.pathname);
    } catch (e) {
      return "";
    }
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
  var TOOL_ID, EXTERNAL_LIBRARIES, DEFAULT_APP_ID, DEFAULT_GUEST_ID, DIALOG_STATE_KEY, SECTION_DEFS, META_KEYS, SYSTEM_FIELD_TYPES, DEFAULT_SUBTAB_STATE, TOUR_STEP_CONNECTION, TOUR_STEP_SCOPE, TOUR_STEP_NOISE, TOUR_STEP_RUN_DIFF, TOUR_STEP_REVIEW, TOUR_STEP_CATEGORY_VIEW, TOUR_STEP_PLAN, TOUR_STEP_APPLY, TOUR_STEP_RECORD, GUIDED_TOUR_COURSES, GUIDED_TOUR_STEPS;
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
      DEFAULT_GUEST_ID = DEFAULT_APP_ID ? resolveDefaultGuestId() : "";
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
      META_KEYS = /* @__PURE__ */ new Set(["revision", "creator", "createdAt", "modifier", "modifiedAt"]);
      SYSTEM_FIELD_TYPES = /* @__PURE__ */ new Set([
        "STATUS",
        "STATUS_ASSIGNEE",
        "CREATED_TIME",
        "UPDATED_TIME",
        "CREATOR",
        "MODIFIER",
        "RECORD_NUMBER",
        "CATEGORY"
      ]);
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
  function deepClone(v) {
    return v == null ? v : JSON.parse(JSON.stringify(v));
  }
  function normalizeSettingsSection(value) {
    const sortValue = (current, responseRoot = false) => {
      if (Array.isArray(current)) return current.map((item) => sortValue(item));
      if (current && typeof current === "object") {
        return Object.fromEntries(Object.keys(current).sort().filter((key) => !responseRoot || !META_KEYS.has(key)).map((key) => [key, sortValue(current[key])]));
      }
      return current;
    };
    return sortValue(value, true);
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
  function readTextFile(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result || ""));
      r.onerror = () => reject(r.error || new Error("ファイル読み込みに失敗しました"));
      r.readAsText(file, "utf-8");
    });
  }
  function legacyCopy(text) {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.setAttribute("aria-hidden", "true");
    ta.style.cssText = "position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;pointer-events:none";
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try {
      ok = document.execCommand("copy");
    } catch {
      ok = false;
    }
    ta.remove();
    return ok;
  }
  async function copyTextToClipboard(text) {
    if (!text) return false;
    const clip2 = typeof navigator !== "undefined" ? navigator.clipboard : void 0;
    if (clip2 && typeof clip2.writeText === "function") {
      try {
        await clip2.writeText(text);
        return true;
      } catch {
      }
    }
    return legacyCopy(text);
  }
  var init_utils = __esm({
    "src/utils.ts"() {
      "use strict";
      init_constants();
    }
  });

  // src/kintone-query.ts
  var init_kintone_query = __esm({
    "src/kintone-query.ts"() {
      "use strict";
    }
  });

  // src/runControl.ts
  function beginRun() {
    const token = { id: nextId++, controller: new AbortController(), cancelled: false, cancelledAt: 0, writes: 0 };
    active = token;
    return token;
  }
  function endRun(token) {
    if (token && active === token) active = null;
  }
  function requestCancel(token) {
    const target = token || active;
    if (!target || target.cancelled) return false;
    target.cancelled = true;
    target.cancelledAt = Date.now();
    try {
      target.controller.abort(new RunCancelledError());
    } catch {
    }
    return true;
  }
  function isCancelRequested() {
    return !!active && active.cancelled;
  }
  function activeRun() {
    return active;
  }
  function noteWrite() {
    if (active) active.writes += 1;
  }
  function throwIfCancelled() {
    if (active && active.cancelled) throw new RunCancelledError();
  }
  function activeAbortSignal() {
    return active ? active.controller.signal : void 0;
  }
  function isRunCancelledError(error) {
    let current = error;
    for (let depth = 0; current && depth < 4; depth++) {
      if (current instanceof RunCancelledError || current.name === "RunCancelledError") return true;
      if (current.name === "AbortError" && isCancelRequested()) return true;
      current = current.original;
    }
    return false;
  }
  function sleepUnlessCancelled(ms) {
    const signal = activeAbortSignal();
    return new Promise((resolve) => {
      if (signal?.aborted) {
        resolve();
        return;
      }
      const timer = setTimeout(() => {
        signal?.removeEventListener("abort", onAbort);
        resolve();
      }, ms);
      function onAbort() {
        clearTimeout(timer);
        resolve();
      }
      signal?.addEventListener("abort", onAbort, { once: true });
    });
  }
  function raceWithCancel(promise, opts = {}) {
    const signal = activeAbortSignal();
    const timeoutMs = Number(opts.timeoutMs) > 0 ? Number(opts.timeoutMs) : 0;
    if (!signal && !timeoutMs) return promise;
    return new Promise((resolve, reject) => {
      let settled = false;
      let timer = 0;
      const finish = (fn) => {
        if (settled) return;
        settled = true;
        if (timer) clearTimeout(timer);
        signal?.removeEventListener("abort", onAbort);
        fn();
      };
      function onAbort() {
        finish(() => reject(new RunCancelledError()));
      }
      timer = timeoutMs ? setTimeout(() => finish(() => {
        const error = new Error(opts.timeoutMessage || `応答待ちが ${Math.round(timeoutMs / 1e3)} 秒を超えました（timeout）`);
        error.code = "TIMEOUT";
        reject(error);
      }), timeoutMs) : 0;
      if (signal?.aborted) {
        onAbort();
        return;
      }
      signal?.addEventListener("abort", onAbort, { once: true });
      promise.then((value) => finish(() => resolve(value)), (error) => finish(() => reject(error)));
    });
  }
  function createRequestSignal(timeoutMs) {
    const controller = new AbortController();
    const runSignal = activeAbortSignal();
    let timedOut = false;
    const onAbort = () => {
      try {
        controller.abort(new RunCancelledError());
      } catch {
      }
    };
    if (runSignal?.aborted) onAbort();
    else runSignal?.addEventListener("abort", onAbort, { once: true });
    const timer = Number(timeoutMs) > 0 ? setTimeout(() => {
      timedOut = true;
      const error = new Error(`応答待ちが ${Math.round(Number(timeoutMs) / 1e3)} 秒を超えました（timeout）`);
      error.code = "TIMEOUT";
      try {
        controller.abort(error);
      } catch {
      }
    }, Number(timeoutMs)) : 0;
    return {
      signal: controller.signal,
      release: () => {
        if (timer) clearTimeout(timer);
        runSignal?.removeEventListener("abort", onAbort);
      },
      timedOut: () => timedOut
    };
  }
  var RUN_CANCELLED_MESSAGE, RunCancelledError, nextId, active;
  var init_runControl = __esm({
    "src/runControl.ts"() {
      "use strict";
      RUN_CANCELLED_MESSAGE = "利用者の操作で中止しました";
      RunCancelledError = class extends Error {
        constructor(message = RUN_CANCELLED_MESSAGE) {
          super(message);
          __publicField(this, "cancelled", true);
          this.name = "RunCancelledError";
        }
      };
      nextId = 1;
      active = null;
    }
  });

  // src/api.ts
  function buildApiPrefix(guestId, preview) {
    const g = String(guestId || "").trim();
    if (g) return `/k/guest/${g}/v1${preview ? "/preview" : ""}`;
    return `/k/v1${preview ? "/preview" : ""}`;
  }
  function isPreviewRestPrefix(prefix) {
    return String(prefix || "").includes("/v1/preview");
  }
  function normalizeApiResourcePath(path) {
    const raw = String(path || "").replace(/\\/g, "/").split("?")[0];
    const match = raw.match(/\/k(?:\/guest\/[^/]+)?\/v1(?:\/preview)?(\/.*)$/);
    const resource = match ? match[1] : raw;
    return resource.startsWith("/") ? resource : `/${resource}`;
  }
  function isRecordDataMutationPath(path) {
    return RECORD_DATA_MUTATION_PATHS.has(normalizeApiResourcePath(path));
  }
  function assertAllowsMutatingRestCall(prefix, path, method) {
    const m = String(method || "").toUpperCase();
    if (m === "GET" || m === "HEAD" || m === "OPTIONS") return;
    if (m !== "POST" && m !== "PUT" && m !== "DELETE" && m !== "PATCH") return;
    const rel = String(path || "").replace(/\\/g, "/");
    if (rel.includes(DEPLOY_PATH_SNIPPET)) {
      throw new Error(ERR_NO_DEPLOY_API);
    }
    if (normalizeApiResourcePath(rel) === RECORD_CURSOR_PATH && (m === "POST" || m === "DELETE")) {
      if (isPreviewRestPrefix(prefix)) throw new Error(ERR_NO_RECORD_PREVIEW_API);
      return;
    }
    if (isRecordDataMutationPath(rel)) {
      if (isPreviewRestPrefix(prefix)) throw new Error(ERR_NO_RECORD_PREVIEW_API);
      return;
    }
    if (path === FILE_UPLOAD_PATH && m === "POST" && !isPreviewRestPrefix(prefix)) return;
    if (!isPreviewRestPrefix(prefix)) {
      throw new Error(ERR_NO_PROD_WRITE);
    }
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
  function isRetriableMutation(method, error) {
    if (!error) return false;
    const m = String(method || "").toUpperCase();
    const status = resolveHttpStatus(error);
    if (status >= 400 && status < 500) {
      if (m === "PUT" && (status === 408 || status === 429)) return true;
      return false;
    }
    if (status >= 500 && status < 600) return true;
    return isRetriableApiError(error);
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
      throwIfCancelled();
      try {
        const res = await raceWithCancel(
          Promise.resolve(kintone.api(`${prefix}${path}`, "GET", params)),
          { timeoutMs: options.timeoutMs === 0 ? 0 : Number(options.timeoutMs) > 0 ? Number(options.timeoutMs) : API_GET_TIMEOUT_MS }
        );
        apiGetMetrics.lastLatencyMs = Date.now() - startAt;
        apiGetMetrics.lastError = "";
        return res;
      } catch (e) {
        if (isRunCancelledError(e)) throw e;
        err = e;
        const retriable = isRetriableApiError(e);
        if (i < retries - 1 && retriable) {
          apiGetMetrics.retries += 1;
          touchApiPathMetric(path, "retries");
          const waitMs = computeRetryDelayMs(i, baseDelayMs, maxDelayMs);
          await sleepUnlessCancelled(waitMs);
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
  async function executeMutatingApiWithRetry(method, prefix, path, body, retries = DEFAULT_API_GET_RETRIES) {
    assertAllowsMutatingRestCall(prefix, path, method);
    const maxAttempts = Math.max(1, retries);
    let lastErr;
    for (let i = 0; i < maxAttempts; i++) {
      throwIfCancelled();
      try {
        noteWrite();
        return await kintone.api(`${prefix}${path}`, method, body);
      } catch (e) {
        if (isRunCancelledError(e)) throw e;
        lastErr = e;
        if (i < maxAttempts - 1 && isRetriableMutation(method, e)) {
          const waitMs = computeRetryDelayMs(i, DEFAULT_RETRY_BASE_DELAY_MS, DEFAULT_RETRY_MAX_DELAY_MS);
          await sleepUnlessCancelled(waitMs);
          continue;
        }
        break;
      }
    }
    throw apiErrorWithContext(lastErr, { method, prefix, path, payload: body });
  }
  async function apiPut(prefix, path, body) {
    return executeMutatingApiWithRetry("PUT", prefix, path, body);
  }
  async function apiPost(prefix, path, body) {
    return executeMutatingApiWithRetry("POST", prefix, path, body);
  }
  function isRevisionConflictError(error) {
    if (!error) return false;
    const codes = [error?.code, error?.original?.code, error?.original?.error?.code].map((c) => String(c || "").toUpperCase()).filter(Boolean);
    if (codes.some((c) => REVISION_CONFLICT_CODES.has(c))) return true;
    const text = String(error?.message || "");
    return /GAIA_CO02|リビジョン.*(最新|一致|異な)|revision.*(latest|mismatch|conflict)/i.test(text);
  }
  function decorateRevisionConflict(error, subject) {
    if (!isRevisionConflictError(error)) return error;
    const base = error?.message != null ? String(error.message) : String(error);
    const wrapped = new Error(
      `${subject}は取得後に別の更新が入ったため中止しました（revision 競合）。最新の設定を取得し直してから再実行してください。
${base}`
    );
    wrapped.revisionConflict = true;
    wrapped.original = error;
    if (error?.code) wrapped.code = error.code;
    return wrapped;
  }
  function pickRevision(res) {
    const value = res?.revision;
    if (value == null || value === "") return "";
    return String(value);
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
  function ensureBundleShape(bundle, rawSettings = false) {
    if (!bundle || typeof bundle !== "object") throw new Error("バンドル形式が不正です");
    if (!bundle.sections || typeof bundle.sections !== "object") throw new Error("sections がありません");
    return {
      appId: String(bundle.appId || ""),
      guestId: String(bundle.guestId || ""),
      preview: !!bundle.preview,
      fetchedAt: bundle.fetchedAt || (/* @__PURE__ */ new Date()).toISOString(),
      meta: sanitizeBundleMeta(bundle.meta),
      sections: rawSettings ? deepClone(bundle.sections) : Object.fromEntries(
        Object.keys(bundle.sections).sort().map((key) => [key, normalizeSettingsSection(bundle.sections[key])])
      )
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
  function wasCancelled(error, signal) {
    return isRunCancelledError(error) || isRunCancelledError(signal.reason);
  }
  function timeoutDetail(signal, timeoutMs) {
    const reason = signal.reason;
    const message = reason instanceof Error ? reason.message : "";
    return message || `応答待ちが ${Math.round(timeoutMs / 1e3)} 秒を超えました（timeout）`;
  }
  async function fetchTextFileBody(prefix, fileKey) {
    if (!fileKey) return { ok: false, reason: "error", detail: "fileKey がありません" };
    const url = `${prefix}/file.json?fileKey=${encodeURIComponent(fileKey)}`;
    const headers = { "X-Requested-With": "XMLHttpRequest" };
    throwIfCancelled();
    const request = createRequestSignal(FILE_TEXT_FETCH_TIMEOUT_MS);
    try {
      const resp = await fetch(url, { method: "GET", headers, signal: request.signal });
      if (!resp.ok) {
        return {
          ok: false,
          reason: "http",
          status: Number(resp.status || 0),
          detail: `HTTP ${resp.status || "error"}`
        };
      }
      const contentLengthText = resp.headers?.get?.("content-length") || "";
      const contentLength = Number(contentLengthText);
      if (Number.isFinite(contentLength) && contentLength > CUSTOMIZE_BODY_MAX_BYTES) {
        return {
          ok: false,
          reason: "oversize",
          byteSize: contentLength,
          detail: `本文サイズが上限 ${CUSTOMIZE_BODY_MAX_BYTES} bytes を超えています`
        };
      }
      const blob = await resp.blob();
      if (blob.size > CUSTOMIZE_BODY_MAX_BYTES) {
        return {
          ok: false,
          reason: "oversize",
          byteSize: blob.size,
          detail: `本文サイズが上限 ${CUSTOMIZE_BODY_MAX_BYTES} bytes を超えています`
        };
      }
      return { ok: true, text: await blob.text(), byteSize: blob.size };
    } catch (error) {
      if (wasCancelled(error, request.signal)) throw new RunCancelledError();
      return {
        ok: false,
        reason: "error",
        detail: request.timedOut() ? timeoutDetail(request.signal, FILE_TEXT_FETCH_TIMEOUT_MS) : error instanceof Error ? error.message : String(error)
      };
    } finally {
      request.release();
    }
  }
  async function downloadKintoneFile(guestId, fileKey, opts = {}) {
    if (!fileKey) throw new Error("fileKey がありません。");
    const maxBytes = Number.isFinite(opts.maxBytes) && Number(opts.maxBytes) > 0 ? Number(opts.maxBytes) : FILE_DOWNLOAD_DEFAULT_MAX_BYTES;
    const limitText = `${Math.round(maxBytes / (1024 * 1024))}MB`;
    const url = `${buildApiPrefix(guestId, false)}/file.json?fileKey=${encodeURIComponent(fileKey)}`;
    throwIfCancelled();
    const request = createRequestSignal(FILE_DOWNLOAD_TIMEOUT_MS);
    const toFetchError = (error) => {
      if (wasCancelled(error, request.signal)) return new RunCancelledError();
      if (request.timedOut()) return new Error(`ファイルを取得できません（応答待ちが ${Math.round(FILE_DOWNLOAD_TIMEOUT_MS / 1e3)} 秒を超えました）`);
      return new Error(`ファイルを取得できません（${error instanceof Error ? error.message : String(error)}）`);
    };
    try {
      let resp;
      try {
        resp = await fetch(url, { method: "GET", headers: { "X-Requested-With": "XMLHttpRequest" }, signal: request.signal });
      } catch (error) {
        throw toFetchError(error);
      }
      if (!resp.ok) throw new Error(`ファイルを取得できません（HTTP ${resp.status || "error"}）`);
      const contentLength = Number(resp.headers?.get?.("content-length") || "");
      if (Number.isFinite(contentLength) && contentLength > maxBytes) throw new Error(`ファイルが大きすぎます（上限 ${limitText}）`);
      let blob;
      try {
        blob = await resp.blob();
      } catch (error) {
        throw toFetchError(error);
      }
      if (blob.size > maxBytes) throw new Error(`ファイルが大きすぎます（上限 ${limitText}）`);
      return blob;
    } finally {
      request.release();
    }
  }
  async function uploadKintoneFile(guestId, blob, fileName) {
    const prefix = buildApiPrefix(guestId, false);
    assertAllowsMutatingRestCall(prefix, FILE_UPLOAD_PATH, "POST");
    const token = typeof kintone !== "undefined" ? kintone?.getRequestToken?.() : "";
    if (!token) throw new Error("リクエストトークンを取得できないため、ファイルをアップロードできません。");
    const form = new FormData();
    form.append("__REQUEST_TOKEN__", String(token));
    form.append("file", blob, fileName);
    throwIfCancelled();
    const request = createRequestSignal(0);
    try {
      let resp;
      try {
        resp = await fetch(`${prefix}${FILE_UPLOAD_PATH}`, { method: "POST", headers: { "X-Requested-With": "XMLHttpRequest" }, body: form, signal: request.signal });
      } catch (error) {
        if (wasCancelled(error, request.signal)) throw new RunCancelledError();
        throw new Error(`ファイルをアップロードできません（${error instanceof Error ? error.message : String(error)}）`);
      }
      let data = null;
      try {
        data = await resp.json();
      } catch (error) {
        if (wasCancelled(error, request.signal)) throw new RunCancelledError();
        data = null;
      }
      if (!resp.ok) {
        const detail = [data?.code, data?.message].filter(Boolean).join(" ");
        throw new Error(`ファイルをアップロードできません（HTTP ${resp.status || "error"}${detail ? `: ${detail}` : ""}）`);
      }
      const fileKey = data?.fileKey;
      if (typeof fileKey !== "string" || !fileKey) throw new Error("アップロード応答にfileKeyがありません。");
      return fileKey;
    } finally {
      request.release();
    }
  }
  async function fetchTextFileBodyWithRetry(prefix, fileKey) {
    let result = await fetchTextFileBody(prefix, fileKey);
    if (result.ok === true) return result;
    if (result.reason === "oversize") return result;
    throwIfCancelled();
    result = await fetchTextFileBody(prefix, fileKey);
    return result;
  }
  async function runTaskFactoriesWithConcurrency(tasks, concurrency) {
    if (!tasks.length) return;
    const limit = Math.max(1, Math.min(tasks.length, Math.floor(concurrency) || 1));
    let nextIndex = 0;
    await Promise.all(Array.from({ length: limit }, async () => {
      while (nextIndex < tasks.length) {
        const index = nextIndex++;
        await tasks[index]();
      }
    }));
  }
  async function fetchCustomizeFileBodies(customizeSection, prefix) {
    const stats = { fetched: 0, skipped: 0, failed: 0, skippedFiles: [], failedFiles: [] };
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
            item._bodyUnavailable = "missing-key";
            stats.skipped += 1;
            stats.skippedFiles.push({ fileName, fileKey: "", reason: "missing-key", detail: "fileKey がありません" });
            continue;
          }
          if (fileName && !TEXT_LIKE_EXT.test(fileName)) {
            item._bodyUnavailable = "unsupported";
            stats.skipped += 1;
            stats.skippedFiles.push({ fileName, fileKey, reason: "unsupported", detail: "テキスト形式ではないため本文比較を省略しました" });
            continue;
          }
          tasks.push(async () => {
            const result = await fetchTextFileBodyWithRetry(prefix, fileKey);
            if (result.ok === false) {
              item._bodyUnavailable = result.reason;
              const issue = {
                fileName,
                fileKey,
                reason: result.reason,
                detail: result.detail,
                ...result.byteSize === void 0 ? {} : { byteSize: result.byteSize }
              };
              if (result.reason === "oversize") {
                stats.skipped += 1;
                stats.skippedFiles.push(issue);
              } else {
                stats.failed += 1;
                stats.failedFiles.push(issue);
              }
              return;
            }
            item._bodyText = result.text;
            item._bodyHash = fnv1aHashString(result.text);
            stats.fetched += 1;
          });
        }
      }
    }
    await runTaskFactoriesWithConcurrency(tasks, CUSTOMIZE_BODY_FETCH_CONCURRENCY);
    return stats;
  }
  function setAuxiliaryFetchError(section, label, failed, error, files = []) {
    if (!section || typeof section !== "object") return;
    const countText = failed > 0 ? `（${failed}件）` : "";
    const detail = error instanceof Error ? error.message : error == null ? "" : String(error);
    const fileText = files.length ? ` [${files.slice(0, 3).map((item) => `${item.fileName || item.fileKey || "(名称不明)"}${item.detail ? `: ${item.detail}` : ""}`).join(", ")}${files.length > 3 ? ", …" : ""}]` : "";
    section._fetchError = `${label}の取得に失敗したため、このセクションは比較できません${countText}${fileText}${detail ? `: ${detail}` : ""}`;
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
      tasks.push(async () => {
        try {
          const res = await apiGet(prefix, "/app/plugin/config.json", { app: appId, id });
          if (res && typeof res === "object") {
            plugin._config = res?.config != null ? res.config : res;
            stats.fetched += 1;
          } else {
            stats.skipped += 1;
          }
        } catch (e) {
          if (isRunCancelledError(e)) throw e;
          stats.failed += 1;
        }
      });
    }
    await runTaskFactoriesWithConcurrency(tasks, CUSTOMIZE_BODY_FETCH_CONCURRENCY);
    return stats;
  }
  async function fetchBundle({ appId, guestId, preview, sections, onProgress, rawSettings = false }) {
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
    const defs = [...new Set(sections)].flatMap((sec) => {
      const def = SECTION_DEFS.find((x) => x.key === sec);
      return def ? [def] : [];
    });
    const results = new Array(defs.length);
    let completed = 0;
    await runTaskFactoriesWithConcurrency(defs.map((def, index) => async () => {
      try {
        const sectionPreview = def.previewEndpoint === false ? false : preview;
        const prefix = buildApiPrefix(guestId, sectionPreview);
        const params = typeof def.paramBuilder === "function" ? def.paramBuilder(app) : { app };
        const res = await apiGet(prefix, def.endpoint, params);
        const revision = extractSectionRevision(res);
        results[index] = { value: rawSettings ? deepClone(res) : normalizeSettingsSection(res), revision };
      } catch (e) {
        if (isRunCancelledError(e)) throw e;
        results[index] = { value: { _fetchError: e?.message || String(e) }, revision: "" };
      }
      completed += 1;
      onProgress?.(completed / defs.length, def.label);
    }), BUNDLE_FETCH_CONCURRENCY);
    defs.forEach((def, index) => {
      const { value, revision } = results[index];
      bundle.sections[def.key] = value;
      if (revision) bundle.meta.sectionRevisions[def.key] = revision;
    });
    if (!rawSettings && sections.includes("customizeSettings")) {
      const cust = bundle.sections.customizeSettings;
      if (cust && !cust._fetchError) {
        try {
          const prefix = buildApiPrefix(guestId, false);
          const stats = await fetchCustomizeFileBodies(cust, prefix);
          if (stats.skippedFiles.length) {
            cust._partial = {
              kind: "customizeBody",
              message: "一部ファイルは本文比較を省略し、fileKey で比較します",
              files: stats.skippedFiles
            };
          }
          if (stats.failed > 0) {
            setAuxiliaryFetchError(cust, "JS/CSSファイル本文", stats.failed, void 0, stats.failedFiles);
          }
        } catch (e) {
          if (isRunCancelledError(e)) throw e;
          setAuxiliaryFetchError(cust, "JS/CSSファイル本文", 0, e);
        }
      }
    }
    if (!rawSettings && sections.includes("pluginSettings")) {
      const plug = bundle.sections.pluginSettings;
      if (plug && !plug._fetchError) {
        try {
          const prefix = buildApiPrefix(guestId, preview);
          const stats = await fetchPluginConfigs(plug, prefix, app);
          const unavailable = stats.failed + stats.skipped;
          if (unavailable > 0) setAuxiliaryFetchError(plug, "プラグイン設定", unavailable);
        } catch (e) {
          if (isRunCancelledError(e)) throw e;
          setAuxiliaryFetchError(plug, "プラグイン設定", 0, e);
        }
      }
    }
    return bundle;
  }
  async function fetchAllApps(guestId, onProgress) {
    const prefix = buildApiPrefix(guestId, false);
    const byId = /* @__PURE__ */ new Map();
    for (let offset = 0; ; offset += APPS_PAGE_LIMIT) {
      const resp = await apiGet(prefix, "/apps.json", { limit: APPS_PAGE_LIMIT, offset });
      if (!Array.isArray(resp?.apps)) throw new Error("アプリ一覧の応答が不正です。もう一度取得してください");
      for (const app of resp.apps) {
        const appId = String(app?.appId || "").trim();
        if (/^\d+$/.test(appId) && !byId.has(appId)) byId.set(appId, app);
      }
      onProgress?.(byId.size);
      if (resp.apps.length < APPS_PAGE_LIMIT) break;
    }
    return [...byId.entries()].sort(([a], [b]) => BigInt(a) < BigInt(b) ? -1 : BigInt(a) > BigInt(b) ? 1 : 0).map(([, app]) => app);
  }
  var DEPLOY_PATH_SNIPPET, ERR_NO_PROD_WRITE, ERR_NO_DEPLOY_API, ERR_NO_RECORD_PREVIEW_API, DEFAULT_API_GET_RETRIES, DEFAULT_RETRY_BASE_DELAY_MS, DEFAULT_RETRY_MAX_DELAY_MS, API_GET_TIMEOUT_MS, FILE_TEXT_FETCH_TIMEOUT_MS, FILE_DOWNLOAD_TIMEOUT_MS, RETRIABLE_STATUS_CODES, RECORD_DATA_MUTATION_PATHS, RECORD_CURSOR_PATH, FILE_UPLOAD_PATH, apiGetMetrics, REVISION_CONFLICT_CODES, CUSTOMIZE_BODY_MAX_BYTES, CUSTOMIZE_BODY_FETCH_CONCURRENCY, TEXT_LIKE_EXT, FILE_DOWNLOAD_DEFAULT_MAX_BYTES, BUNDLE_FETCH_CONCURRENCY, APPS_PAGE_LIMIT;
  var init_api = __esm({
    "src/api.ts"() {
      "use strict";
      init_constants();
      init_kintone_query();
      init_utils();
      init_runControl();
      DEPLOY_PATH_SNIPPET = "app/deploy.json";
      ERR_NO_PROD_WRITE = "本番APIへの追加・更新・削除は無効です。プレビューAPIへの書き込みのみ可能です。本番への反映はkintone管理画面から手動でデプロイしてください。";
      ERR_NO_DEPLOY_API = "デプロイAPIの実行は無効です。本番への反映はkintone管理画面から手動でデプロイしてください。";
      ERR_NO_RECORD_PREVIEW_API = "レコードAPIにはプレビュー用の追加・更新・削除エンドポイントがありません。レコード操作は本番REST APIを明示的な確認付きで実行します。";
      DEFAULT_API_GET_RETRIES = 3;
      DEFAULT_RETRY_BASE_DELAY_MS = 500;
      DEFAULT_RETRY_MAX_DELAY_MS = 3e3;
      API_GET_TIMEOUT_MS = 12e4;
      FILE_TEXT_FETCH_TIMEOUT_MS = 6e4;
      FILE_DOWNLOAD_TIMEOUT_MS = 12e4;
      RETRIABLE_STATUS_CODES = /* @__PURE__ */ new Set([408, 409, 425, 429, 500, 502, 503, 504]);
      RECORD_DATA_MUTATION_PATHS = /* @__PURE__ */ new Set([
        "/record.json",
        "/records.json",
        "/record/status.json",
        "/records/status.json"
      ]);
      RECORD_CURSOR_PATH = "/records/cursor.json";
      FILE_UPLOAD_PATH = "/file.json";
      apiGetMetrics = {
        calls: 0,
        retries: 0,
        failures: 0,
        lastLatencyMs: 0,
        lastError: "",
        byPath: {}
      };
      REVISION_CONFLICT_CODES = /* @__PURE__ */ new Set(["GAIA_CO02"]);
      CUSTOMIZE_BODY_MAX_BYTES = 1 * 1024 * 1024;
      CUSTOMIZE_BODY_FETCH_CONCURRENCY = 6;
      TEXT_LIKE_EXT = /\.(js|css|mjs|ts|jsx|tsx|json|txt|html|md)$/i;
      FILE_DOWNLOAD_DEFAULT_MAX_BYTES = 20 * 1024 * 1024;
      BUNDLE_FETCH_CONCURRENCY = 3;
      APPS_PAGE_LIMIT = 100;
    }
  });

  // src/kintone-enums.ts
  function lookupEnum(map, value) {
    if (value == null || value === "") return "";
    const key = String(value).trim().toUpperCase();
    return map[key] || String(value);
  }
  function describeReminderOffset(kind, value) {
    const raw = String(value ?? "").trim();
    if (!/^[+-]?\d+$/.test(raw)) return null;
    const n = Number(raw);
    const unit = kind === "days" ? "日" : "時間";
    if (n === 0) return kind === "days" ? "当日" : "同時刻";
    return n < 0 ? `${-n}${unit}前` : `${n}${unit}後`;
  }
  function describePeriodicReport(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    const report = value;
    if (typeof report.active !== "boolean" && !report.period) return null;
    const period = report.period && typeof report.period === "object" ? report.period : {};
    const schedule = [
      lookupEnum(PERIODIC_REPORT_EVERY_JP, period.every),
      period.month != null && period.month !== "" ? `${period.month}月` : "",
      period.dayOfMonth != null && period.dayOfMonth !== "" ? `${period.dayOfMonth}日` : "",
      lookupEnum(DAY_OF_WEEK_JP, period.dayOfWeek),
      period.time != null && period.time !== "" ? String(period.time) : ""
    ].filter(Boolean).join(" ");
    const state3 = report.active === false ? "無効" : "有効";
    return schedule ? `${state3}（${schedule}）` : state3;
  }
  var FIELD_TYPE_JP, ENTITY_TYPE_JP, VIEW_TYPE_JP, VIEW_BUILTIN_TYPE_JP, VIEW_DEVICE_JP, CHART_TYPE_JP, CHART_MODE_JP, AGGREGATION_TYPE_JP, GROUP_PER_JP, REPORT_SORT_BY_JP, REPORT_SORT_ORDER_JP, PERIODIC_REPORT_EVERY_JP, DAY_OF_WEEK_JP, PROCESS_ASSIGNEE_TYPE_JP, RESOURCE_TYPE_JP, CUSTOMIZE_SCOPE_JP, ICON_TYPE_JP, APP_THEME_JP, TITLE_SELECTION_JP, ROUNDING_MODE_JP, NUMBER_FORMAT_JP, ALIGN_JP, UNIT_POSITION_JP, LINK_PROTOCOL_JP;
  var init_kintone_enums = __esm({
    "src/kintone-enums.ts"() {
      "use strict";
      FIELD_TYPE_JP = {
        SINGLE_LINE_TEXT: "文字列(1行)",
        MULTI_LINE_TEXT: "文字列(複数行)",
        RICH_TEXT: "リッチエディター",
        NUMBER: "数値",
        CALC: "計算",
        CHECK_BOX: "チェックボックス",
        RADIO_BUTTON: "ラジオボタン",
        DROP_DOWN: "ドロップダウン",
        MULTI_SELECT: "複数選択",
        DATE: "日付",
        TIME: "時刻",
        DATETIME: "日時",
        LINK: "リンク",
        FILE: "添付ファイル",
        USER_SELECT: "ユーザー選択",
        ORGANIZATION_SELECT: "組織選択",
        GROUP_SELECT: "グループ選択",
        CATEGORY: "カテゴリー",
        STATUS: "ステータス",
        STATUS_ASSIGNEE: "作業者",
        SUBTABLE: "テーブル",
        REFERENCE_TABLE: "関連レコード一覧",
        RECORD_NUMBER: "レコード番号",
        CREATOR: "作成者",
        CREATED_TIME: "作成日時",
        MODIFIER: "更新者",
        UPDATED_TIME: "更新日時",
        SPACER: "スペース",
        HR: "罫線",
        LABEL: "ラベル",
        GROUP: "グループ",
        LOOKUP: "ルックアップ"
      };
      ENTITY_TYPE_JP = {
        USER: "ユーザー",
        GROUP: "グループ",
        ORGANIZATION: "組織",
        FIELD_ENTITY: "フィールド値",
        CREATOR: "作成者",
        MODIFIER: "更新者",
        LOGIN_USER: "ログインユーザー",
        ALL: "全員",
        CUSTOM_FIELD: "カスタムフィールド"
      };
      VIEW_TYPE_JP = {
        LIST: "表形式",
        CALENDAR: "カレンダー形式",
        CUSTOM: "カスタマイズ"
      };
      VIEW_BUILTIN_TYPE_JP = {
        ASSIGNEE: "作業者ビュー",
        UNDONE: "未完了レコード",
        ACTIVE_BY_USER: "自分が処理すべきレコード",
        RECORDS_OF_USER: "自分が関わるレコード"
      };
      VIEW_DEVICE_JP = {
        ANY: "PC・モバイル両方",
        DESKTOP: "PC版のみ"
      };
      CHART_TYPE_JP = {
        BAR: "横棒グラフ",
        COLUMN: "縦棒グラフ",
        LINE: "折れ線グラフ",
        PIE: "円グラフ",
        PIVOT_TABLE: "クロス集計表",
        TABLE: "表",
        AREA: "面グラフ",
        SPLINE: "曲線グラフ",
        SPLINE_AREA: "曲線面グラフ",
        SCATTER: "散布図"
      };
      CHART_MODE_JP = {
        NORMAL: "通常",
        STACKED: "積み上げ",
        PERCENTAGE: "100%積み上げ"
      };
      AGGREGATION_TYPE_JP = {
        COUNT: "レコード数",
        SUM: "合計",
        AVG: "平均",
        MAX: "最大値",
        MIN: "最小値"
      };
      GROUP_PER_JP = {
        YEAR: "年",
        QUARTER: "四半期",
        MONTH: "月",
        WEEK: "週",
        DAY: "日",
        HOUR: "時",
        MINUTE: "分"
      };
      REPORT_SORT_BY_JP = {
        TOTAL: "集計値",
        GROUP1: "分類1",
        GROUP2: "分類2",
        GROUP3: "分類3"
      };
      REPORT_SORT_ORDER_JP = {
        ASC: "小さい順",
        DESC: "大きい順"
      };
      PERIODIC_REPORT_EVERY_JP = {
        YEAR: "毎年",
        QUARTER: "四半期ごと",
        MONTH: "毎月",
        WEEK: "毎週",
        DAY: "毎日",
        HOUR: "毎時"
      };
      DAY_OF_WEEK_JP = {
        SUNDAY: "日曜日",
        MONDAY: "月曜日",
        TUESDAY: "火曜日",
        WEDNESDAY: "水曜日",
        THURSDAY: "木曜日",
        FRIDAY: "金曜日",
        SATURDAY: "土曜日"
      };
      PROCESS_ASSIGNEE_TYPE_JP = {
        ONE: "候補から作業者を1人選ぶ",
        ANY: "候補のうち誰か1人が作業する",
        ANYONE: "候補のうち誰か1人が作業する",
        ALL: "候補の全員が作業する"
      };
      RESOURCE_TYPE_JP = {
        URL: "URL指定",
        FILE: "ファイル指定"
      };
      CUSTOMIZE_SCOPE_JP = {
        ALL: "全ユーザー",
        ADMIN: "管理者のみ",
        NONE: "無効"
      };
      ICON_TYPE_JP = {
        PRESET: "プリセット",
        FILE: "アップロードファイル"
      };
      APP_THEME_JP = {
        WHITE: "ホワイト",
        RED: "レッド",
        BLUE: "ブルー",
        GREEN: "グリーン",
        YELLOW: "イエロー",
        BLACK: "ブラック",
        CLIPBOARD: "クリップボード",
        BINDER: "バインダー",
        PENCIL: "ペンシル",
        CLIPS: "クリップ"
      };
      TITLE_SELECTION_JP = {
        AUTO: "自動選択",
        MANUAL: "手動指定"
      };
      ROUNDING_MODE_JP = {
        HALF_EVEN: "四捨五入（偶数丸め）",
        UP: "切り上げ",
        DOWN: "切り捨て"
      };
      NUMBER_FORMAT_JP = {
        NUMBER: "数値",
        NUMBER_DIGIT: "数値（桁区切り）",
        PERCENT: "パーセント",
        CURRENCY: "通貨",
        DATE: "日付",
        TIME: "時刻",
        DATETIME: "日時",
        HOUR_MINUTE: "時:分",
        HOUR_MINUTE_SECOND: "時:分:秒"
      };
      ALIGN_JP = {
        HORIZONTAL: "横並び",
        VERTICAL: "縦並び"
      };
      UNIT_POSITION_JP = {
        BEFORE: "前につける",
        AFTER: "後につける"
      };
      LINK_PROTOCOL_JP = {
        WEB: "Webサイトのアドレス",
        CALL: "電話番号",
        MAIL: "メールアドレス"
      };
    }
  });

  // src/diff/label-dict.ts
  function labelOfProp(key) {
    if (!key) return "";
    return PROP_LABELS[key]?.label || String(key);
  }
  function labelOfBool(value, propKey) {
    if (propKey && PERMISSION_KEYS.has(propKey)) {
      return value ? "許可" : "不許可";
    }
    if (propKey === "enable" || propKey === "enabled" || propKey === "active") {
      return value ? "有効" : "無効";
    }
    if (propKey === "pager") {
      return value ? "表示する" : "表示しない";
    }
    if (propKey === "notifyToCommenter" || propKey === "notifyToMentioned" || propKey === "notifyOnUpdate") {
      return value ? "通知する" : "通知しない";
    }
    return value ? "はい" : "いいえ";
  }
  var VALUE_LABELS, PROP_LABELS, PERMISSION_KEYS;
  var init_label_dict = __esm({
    "src/diff/label-dict.ts"() {
      "use strict";
      init_kintone_enums();
      VALUE_LABELS = {
        // entity.type
        "entity.type": {
          USER: "👤 ユーザー",
          GROUP: "👥 グループ",
          ORGANIZATION: "🏢 部署",
          DEPARTMENT: "🏢 部署",
          DEPT: "🏢 部署",
          CREATOR: "✏️ 作成者",
          MODIFIER: "✏️ 更新者",
          FUNCTION: "⚙ 関数",
          LOGIN_USER: "👤 ログインユーザー",
          ALL: "🌐 全員",
          FIELD_ENTITY: "🔗 フィールド",
          EVERYONE: "🌐 全員",
          CUSTOM_FIELD: "🔗 ユーザー選択フィールド"
        },
        // field acl level
        accessibility: {
          NONE: "不可",
          READ: "閲覧のみ",
          WRITE: "閲覧・編集可",
          READ_WRITE: "閲覧・編集可"
        },
        // 一覧の表示形式（kintone の一覧設定画面の選択肢名）
        "view.type": {
          LIST: "表形式",
          CALENDAR: "カレンダー形式",
          CUSTOM: "カスタマイズ"
        },
        // グラフ種別（kintone のグラフ設定画面の名称）
        "chart.type": {
          BAR: "横棒グラフ",
          COLUMN: "縦棒グラフ",
          PIE: "円グラフ",
          LINE: "折れ線グラフ",
          PIVOT_TABLE: "クロス集計表",
          TABLE: "表",
          AREA: "面グラフ",
          AREA_STACKED: "積み上げ面グラフ",
          SPLINE: "曲線グラフ",
          SPLINE_AREA: "曲線面グラフ",
          BUBBLE: "バブル",
          BAR_STACKED: "積み上げ横棒",
          FUNNEL: "ファネル"
        },
        // ページ送り
        paginationStyle: {
          NORMAL: "通常",
          NUMBER: "ページ番号",
          INFINITE: "無限スクロール"
        },
        // 通知トリガ
        recordTrigger: {
          APP: "アプリ全体",
          RECORD: "レコード単位"
        },
        // アプリアクションのフィールド関連付けのコピー元／コピー先の種類
        // （actionSettings 文脈で参照。表記は xlsx 出力の customerTypeLabel と揃える）
        srcType: {
          FIELD: "フィールド",
          RECORD_URL: "レコードのURL"
        },
        destType: {
          FIELD: "フィールド",
          RECORD_URL: "レコードのURL"
        },
        // ここから下はセクション文脈込みで参照するスコープ（path-decoder が
        // sectionKey を見て選択する）。kintone-enums の共通辞書を単一ソースとする。
        "assignee.type": PROCESS_ASSIGNEE_TYPE_JP,
        "icon.type": ICON_TYPE_JP,
        "aggregation.type": AGGREGATION_TYPE_JP,
        "resource.type": RESOURCE_TYPE_JP,
        builtinType: VIEW_BUILTIN_TYPE_JP,
        device: VIEW_DEVICE_JP,
        chartMode: CHART_MODE_JP,
        scope: CUSTOMIZE_SCOPE_JP,
        theme: APP_THEME_JP,
        selectionMode: TITLE_SELECTION_JP,
        roundingMode: ROUNDING_MODE_JP,
        per: GROUP_PER_JP,
        by: REPORT_SORT_BY_JP,
        order: REPORT_SORT_ORDER_JP,
        every: PERIODIC_REPORT_EVERY_JP,
        dayOfWeek: DAY_OF_WEEK_JP
      };
      PROP_LABELS = {
        // appAcl 操作権限（kintone のアクセス権設定画面の列名）
        appEditable: { label: "アプリ管理", icon: "⚙" },
        recordViewable: { label: "レコード閲覧", icon: "👁" },
        recordAddable: { label: "レコード追加", icon: "➕" },
        recordEditable: { label: "レコード編集", icon: "✏️" },
        recordDeletable: { label: "レコード削除", icon: "🗑" },
        recordImportable: { label: "ファイル読み込み", icon: "📥" },
        recordExportable: { label: "ファイル書き出し", icon: "📤" },
        // recordPermissions の権限
        viewable: { label: "閲覧", icon: "👁" },
        editable: { label: "編集", icon: "✏️" },
        deletable: { label: "削除", icon: "🗑" },
        // 共通
        filterCond: { label: "絞込条件", icon: "🔍" },
        includeSubs: { label: "配下を含む" },
        entities: { label: "エンティティ" },
        entity: { label: "対象" },
        rights: { label: "権限エントリー" },
        accessibility: { label: "アクセス権" },
        // viewSettings（kintone の一覧設定画面の項目名）
        fields: { label: "表示するフィールド", icon: "📋" },
        sort: { label: "ソート", icon: "↕" },
        index: { label: "表示順", icon: "🔢" },
        paginationStyle: { label: "ページ送り", icon: "📄" },
        defaultView: { label: "既定ビュー" },
        view: { label: "ビュー" },
        views: { label: "ビュー一覧" },
        builtinType: { label: "標準一覧の種類" },
        device: { label: "表示するデバイス" },
        pager: { label: "ページ送りの表示" },
        date: { label: "日付の基準フィールド" },
        // reportSettings（kintone のグラフ設定画面の項目名）
        groups: { label: "分類", icon: "📊" },
        aggregations: { label: "集計", icon: "🧮" },
        chartType: { label: "グラフ種別" },
        chartMode: { label: "モード" },
        reports: { label: "グラフ一覧" },
        periodicReports: { label: "定期レポート" },
        periodicReport: { label: "定期レポート" },
        period: { label: "実行スケジュール" },
        every: { label: "間隔" },
        dayOfWeek: { label: "曜日" },
        dayOfMonth: { label: "日" },
        per: { label: "分類の時間単位" },
        by: { label: "ソートの基準" },
        order: { label: "ソートの順序" },
        active: { label: "有効状態" },
        // notifications（kintone の通知設定画面の項目名）
        recordAdded: { label: "レコードの追加" },
        recordEdited: { label: "レコードの編集" },
        commentAdded: { label: "コメントの書き込み" },
        statusChanged: { label: "ステータスの更新" },
        fileImported: { label: "ファイルの読み込み" },
        recipients: { label: "通知先" },
        targets: { label: "通知先" },
        notifications: { label: "通知ルール" },
        timing: { label: "通知するタイミング" },
        daysLater: { label: "通知する日" },
        hoursLater: { label: "通知する時間" },
        time: { label: "時刻" },
        notifyToCommenter: { label: "コメントを書き込んだユーザーへの通知" },
        notifyToMentioned: { label: "コメントの宛先ユーザーへの通知" },
        notifyOnUpdate: { label: "更新時に通知" },
        timezone: { label: "タイムゾーン" },
        perRecordNotifications: { label: "レコード条件通知" },
        reminderNotifications: { label: "リマインダー通知" },
        title: { label: "タイトル" },
        body: { label: "本文" },
        // processSettings（kintone のプロセス管理設定画面の項目名）
        enable: { label: "プロセス管理の有効化" },
        states: { label: "ステータス" },
        actions: { label: "アクション" },
        from: { label: "実行前のステータス" },
        to: { label: "実行後のステータス" },
        assignee: { label: "作業者" },
        type: { label: "種別" },
        settings: { label: "設定" },
        // actionSettings（kintone API の mappings[] キーは srcField/srcType/destField。
        // sourceField は旧形式データの別名。xlsx 出力の「コピー元/コピー先」表記に揃える）
        app: { label: "対象アプリ" },
        mappings: { label: "フィールド対応" },
        srcField: { label: "コピー元フィールド" },
        sourceField: { label: "コピー元フィールド" },
        srcType: { label: "コピー元の種類" },
        destField: { label: "コピー先フィールド" },
        destType: { label: "コピー先の種類" },
        destApp: { label: "先アプリ" },
        // customizeSettings
        desktop: { label: "デスクトップ" },
        mobile: { label: "モバイル" },
        js: { label: "JS" },
        css: { label: "CSS" },
        file: { label: "ファイル" },
        scope: { label: "適用範囲" },
        url: { label: "URL" },
        // pluginSettings
        plugins: { label: "プラグイン一覧" },
        version: { label: "バージョン" },
        id: { label: "ID" },
        enabled: { label: "有効状態" },
        // appSettings / appInfo（kintone のアプリ設定画面の項目名）
        name: { label: "名前" },
        description: { label: "説明" },
        theme: { label: "デザインテーマ" },
        titleField: { label: "レコードのタイトル" },
        selectionMode: { label: "選択方法" },
        icon: { label: "アイコン" },
        enableThumbnails: { label: "サムネイルの表示" },
        enableBulkDeletion: { label: "レコードの一括削除" },
        enableComments: { label: "レコードのコメント機能" },
        enableDuplicateRecord: { label: "レコードの再利用" },
        enableInlineRecordEditing: { label: "一覧でのレコードのインライン編集" },
        numberPrecision: { label: "数値や計算の精度" },
        digits: { label: "全体の桁数" },
        decimalPlaces: { label: "小数部の桁数" },
        roundingMode: { label: "数値の丸めかた" },
        firstMonthOfFiscalYear: { label: "第1四半期の開始月" },
        appId: { label: "アプリID" },
        spaceId: { label: "スペースID" },
        threadId: { label: "スレッドID" },
        code: { label: "コード" },
        label: { label: "ラベル" },
        // categories
        categories: { label: "カテゴリ" },
        // layoutSettings
        layout: { label: "レイアウト" },
        row: { label: "行" },
        width: { label: "横幅" },
        height: { label: "高さ" },
        innerHeight: { label: "入力欄の高さ" },
        // fieldSettings: 関連レコード一覧（referenceTable）/ ルックアップ（lookup）
        // kintone のフィールド設定画面の項目名に合わせる。
        referenceTable: { label: "関連レコード一覧設定" },
        lookup: { label: "ルックアップ設定" },
        condition: { label: "表示するレコードの条件" },
        displayFields: { label: "表示するフィールド" },
        relatedApp: { label: "参照するアプリ" },
        relatedField: { label: "参照するアプリのフィールド" },
        relatedKeyField: { label: "コピー元のフィールド" },
        fieldMappings: { label: "ほかのフィールドのコピー" },
        lookupPickerFields: { label: "コピー元のレコード選択時に表示するフィールド" },
        size: { label: "一度に表示する最大レコード数" }
      };
      PERMISSION_KEYS = /* @__PURE__ */ new Set([
        "appEditable",
        "recordViewable",
        "recordAddable",
        "recordEditable",
        "recordDeletable",
        "recordImportable",
        "recordExportable",
        "viewable",
        "editable",
        "deletable",
        "includeSubs"
      ]);
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

  // src/diff/engine.ts
  var ENTITY_PATH_SEGMENT, ENTITY_IDENTIFIER_PATH_PATTERNS;
  var init_engine = __esm({
    "src/diff/engine.ts"() {
      "use strict";
      init_constants();
      init_state();
      init_utils();
      ENTITY_PATH_SEGMENT = String.raw`(?:\.[^.[\]]+|\["(?:[^"\\]|\\.)*"\])`;
      ENTITY_IDENTIFIER_PATH_PATTERNS = [
        new RegExp(`^(?:fieldsettings\\.properties|viewsettings\\.views|reportsettings\\.reports|processsettings\\.states|categories\\.categories|actionsettings\\.actions)${ENTITY_PATH_SEGMENT}$`),
        new RegExp(`^fieldsettings\\.properties${ENTITY_PATH_SEGMENT}\\.fields${ENTITY_PATH_SEGMENT}$`),
        // 選択肢のキーもラベルを識別子とする名前付きマップ。
        new RegExp(`^fieldsettings\\.properties${ENTITY_PATH_SEGMENT}(?:\\.fields${ENTITY_PATH_SEGMENT})?\\.options${ENTITY_PATH_SEGMENT}$`)
      ];
    }
  });

  // src/diff/enrich.ts
  var init_enrich = __esm({
    "src/diff/enrich.ts"() {
      "use strict";
      init_constants();
      init_utils();
      init_label_dict();
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

  // src/design/snapshot.ts
  var init_snapshot = __esm({
    "src/design/snapshot.ts"() {
      "use strict";
      init_constants();
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
      init_snapshot();
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
    try {
      run();
    } catch (error) {
      if (error?.panelBusy === true) return;
      throw error;
    }
  }

  // src/entries/reflect-lite-ui.ts
  init_constants();

  // src/tabs/reflect-standalone.ts
  init_utils();
  init_api();

  // src/reflect/sections.ts
  init_constants();
  var REFLECT_SECTION_KEYS = (() => {
    const keys = SECTION_DEFS.filter((def) => def.put).map((def) => def.key).filter((key) => key !== "appSettings");
    const anchor = Math.max(keys.indexOf("layoutSettings"), keys.indexOf("fieldSettings"));
    keys.splice(anchor + 1, 0, "appSettings");
    return keys;
  })();
  var APP_SETTINGS_REFLECT_KEYS = ["theme", "titleField", "enableThumbnails", "enableBulkDeletion", "enableComments", "enableDuplicateRecord", "enableInlineRecordEditing", "numberPrecision", "firstMonthOfFiscalYear"];
  var APP_SETTINGS_LABELS = {
    theme: "テーマ",
    titleField: "レコードのタイトル",
    enableThumbnails: "サムネイル表示",
    enableBulkDeletion: "一括削除",
    enableComments: "コメント機能",
    enableDuplicateRecord: "レコードの再利用",
    enableInlineRecordEditing: "一覧でのインライン編集",
    numberPrecision: "数値の桁数と丸め",
    firstMonthOfFiscalYear: "年度の開始月"
  };
  function reflectSectionLabel(key) {
    return key === "appSettings" ? "一般設定" : SECTION_DEFS.find((def) => def.key === key)?.label || key;
  }

  // src/reflect/standalonePreflight.ts
  function stableReflectStringify(value) {
    const sort = (input) => Array.isArray(input) ? input.map(sort) : input && typeof input === "object" ? Object.fromEntries(Object.keys(input).sort().map((key) => [key, sort(input[key])])) : input;
    return JSON.stringify(sort(value));
  }
  function connectionKey(opts) {
    return stableReflectStringify({
      sourceAppId: String(opts.sourceAppId || "").trim(),
      sourceGuestId: String(opts.sourceGuestId || "").trim(),
      sourcePreview: !!opts.sourcePreview,
      sourceMode: opts.sourceBundle ? "json" : "api",
      targetAppId: String(opts.targetAppId || "").trim(),
      targetGuestId: String(opts.targetGuestId || "").trim(),
      lookupMap: opts.lookupMap || {},
      preserveTargetOnly: opts.preserveTargetOnly !== false
    });
  }
  function isCompleteReflectSection(section) {
    return !!section && typeof section === "object" && !Array.isArray(section) && !section._fetchError && !section._partial;
  }
  var withoutTopLevelRevision = (section) => {
    if (!section || typeof section !== "object" || Array.isArray(section) || !Object.prototype.hasOwnProperty.call(section, "revision")) return section;
    const { revision: _revision, ...rest } = section;
    return rest;
  };
  function captureSections(bundle, scopes) {
    return Object.fromEntries(scopes.map((key) => {
      const section = bundle?.sections?.[key];
      return [key, {
        content: stableReflectStringify(withoutTopLevelRevision(section)) ?? "",
        revision: String(bundle?.meta?.sectionRevisions?.[key] ?? section?.revision ?? ""),
        complete: isCompleteReflectSection(section)
      }];
    }));
  }
  function captureReflectBaseline(opts, source, target) {
    return {
      connection: connectionKey(opts),
      source: captureSections(source, opts.scopes),
      target: captureSections(target, opts.scopes)
    };
  }
  function assertCompleteReflectBackup(bundle, scopes) {
    const incomplete = scopes.filter((key) => !isCompleteReflectSection(bundle?.sections?.[key]));
    if (!incomplete.length) return;
    const labels2 = incomplete.map(reflectSectionLabel);
    throw new Error(`バックアップを完全に取得できなかったため反映を中止しました。対象: ${labels2.join("、")}。差分を取得し直してから再実行してください。`);
  }
  function assertReflectBaselineMatches(baseline, opts, source, target) {
    if (!baseline || baseline.connection !== connectionKey(opts)) {
      throw new Error("確認済みの差分と反映条件が一致しません。差分を取得し直してから再実行してください。");
    }
    const current = captureReflectBaseline({ ...opts, scopes: [.../* @__PURE__ */ new Set([...opts.scopes, ...opts.targetDependencies || []])] }, source, target);
    for (const side of ["source", "target"]) {
      const label = side === "source" ? "反映元" : "反映先プレビュー";
      const revisions = /* @__PURE__ */ new Set();
      const requireRevision = side === "target" || !opts.sourceBundle;
      const checkedScopes = side === "source" ? opts.scopes : [.../* @__PURE__ */ new Set([...opts.scopes, ...opts.targetDependencies || []])];
      const changedLabels = [];
      let revisionChange = null;
      for (const key of checkedScopes) {
        const before = baseline[side]?.[key];
        const after = current[side][key];
        const sectionLabel = reflectSectionLabel(key);
        if (!before?.complete || !after.complete) {
          throw new Error(`${label}の${sectionLabel}を完全に確認できないため反映を中止しました。差分を取得し直してください。`);
        }
        if (requireRevision && (!/^\d+$/.test(before.revision) || !/^\d+$/.test(after.revision))) {
          throw new Error(`${label}の${sectionLabel}のrevisionを確認できないため反映を中止しました。差分を取得し直してください。`);
        }
        if (before.content !== after.content) changedLabels.push(sectionLabel);
        else if (before.revision !== after.revision && !revisionChange) revisionChange = { from: before.revision, to: after.revision };
        if (requireRevision) revisions.add(after.revision);
      }
      if (changedLabels.length) {
        throw new Error(`差分確認後に${label}の${changedLabels.join("、")}が変更されたため反映を中止しました。差分を取得し直して、変更内容を再確認してください。`);
      }
      if (revisionChange) {
        const { from, to } = revisionChange;
        throw new Error(`${side === "source" ? "反映元" : "反映先"}アプリの設定が確認後に更新されました（revision ${from || "不明"} → ${to || "不明"}）。選択した項目の内容は同じでしたが、安全のため反映を中止しました。差分を取得し直してください。`);
      }
      if (requireRevision && revisions.size !== 1) {
        throw new Error(`${label}の取得中に設定が更新された可能性があるため反映を中止しました。差分を取得し直してください。`);
      }
    }
    return current.target[opts.scopes[0]].revision;
  }
  var SYSTEM_REF_FIELDS = /* @__PURE__ */ new Set(["$id", "$revision"]);
  function findUnmappedActionDestApps(sourceActions, lookupMap, targetActions) {
    if (!sourceActions || typeof sourceActions !== "object") return [];
    const map = lookupMap || {};
    const unmapped = [];
    for (const [actionName, action] of Object.entries(sourceActions)) {
      const rawApp = action?.destApp?.app;
      if (rawApp == null) continue;
      const destAppId = String(rawApp).trim();
      if (!destAppId || map[destAppId]) continue;
      const targetAppId = String(targetActions?.[actionName]?.destApp?.app ?? "").trim();
      if (targetAppId && targetAppId === destAppId) continue;
      unmapped.push({ actionName, destAppId });
    }
    return unmapped;
  }
  function extractActionRequiredFields(actions) {
    if (!actions || typeof actions !== "object") return [];
    const codes = [];
    for (const action of Object.values(actions)) {
      if (!Array.isArray(action?.mappings)) continue;
      for (const mapping of action.mappings) {
        if (mapping?.srcType === "FIELD" && typeof mapping.srcField === "string" && mapping.srcField.trim()) {
          const code = mapping.srcField.trim();
          if (!SYSTEM_REF_FIELDS.has(code)) codes.push(code);
        }
      }
    }
    return [...new Set(codes)];
  }
  function extractReportRequiredFields(reports) {
    if (!reports || typeof reports !== "object") return [];
    const codes = [];
    for (const report of Object.values(reports)) {
      if (Array.isArray(report?.groups)) {
        for (const group of report.groups) {
          if (typeof group?.code === "string" && group.code.trim()) {
            const code = group.code.trim();
            if (!SYSTEM_REF_FIELDS.has(code)) codes.push(code);
          }
        }
      }
      if (Array.isArray(report?.aggregations)) {
        for (const agg of report.aggregations) {
          if (agg?.type !== "COUNT" && typeof agg?.code === "string" && agg.code.trim()) {
            const code = agg.code.trim();
            if (!SYSTEM_REF_FIELDS.has(code)) codes.push(code);
          }
        }
      }
    }
    return [...new Set(codes)];
  }

  // src/reflect/customizeFiles.ts
  init_api();
  init_runControl();
  init_utils();
  function customizeSlotKey(platform, kind, fileKey) {
    return `${platform}/${kind}/${fileKey}`;
  }
  var PLATFORMS = ["desktop", "mobile"];
  var KINDS = ["js", "css"];
  var DOWNLOAD_CONCURRENCY = 4;
  var isObject = (value) => !!value && typeof value === "object" && !Array.isArray(value);
  var dict = () => /* @__PURE__ */ Object.create(null);
  var messageOf = (error) => error instanceof Error ? error.message : String(error);
  function listFileEntries(section) {
    const entries = [];
    for (const platform of PLATFORMS) for (const kind of KINDS) {
      const list2 = section?.[platform]?.[kind];
      if (!Array.isArray(list2)) continue;
      for (const item of list2) {
        const fileKey = item?.type === "FILE" ? item?.file?.fileKey : void 0;
        if (typeof fileKey === "string" && fileKey) entries.push({ item, fileKey, name: String(item.file.name || ""), platform, kind });
      }
    }
    return entries;
  }
  function customizeFileNames(...sections) {
    const names = dict();
    for (const section of sections) for (const entry of listFileEntries(section)) if (entry.name && names[entry.fileKey] === void 0) names[entry.fileKey] = entry.name;
    return names;
  }
  function bytesToBase64(bytes) {
    let binary = "";
    for (let offset = 0; offset < bytes.length; offset += 32768) binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(offset, offset + 32768)));
    return btoa(binary);
  }
  function base64ToBytes(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index);
    return bytes;
  }
  async function blobBytes(blob) {
    return new Uint8Array(await blob.arrayBuffer());
  }
  function fallbackHash(bytes) {
    let a = 2166136261, b = 16777619 ^ 2654435769;
    for (const byte of bytes) {
      a = Math.imul(a ^ byte, 16777619) >>> 0;
      b = Math.imul(b ^ byte, 2246822507) >>> 0;
      b = (b ^ b >>> 13) >>> 0;
    }
    return `fnv1a:${a.toString(16).padStart(8, "0")}${b.toString(16).padStart(8, "0")}${bytes.length.toString(16)}`;
  }
  async function hashBytes(bytes) {
    try {
      const subtle = globalThis.crypto?.subtle;
      if (subtle?.digest) {
        const digest = new Uint8Array(await subtle.digest("SHA-256", bytes));
        return Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join("");
      }
    } catch {
    }
    return fallbackHash(bytes);
  }
  function guessContentType(name) {
    return /\.css$/i.test(name) ? "text/css" : /\.js$/i.test(name) ? "text/javascript" : "";
  }
  var defaultDownload = async (guestId, fileKey) => {
    try {
      return await downloadKintoneFile(guestId, fileKey);
    } catch (error) {
      if (isRunCancelledError(error)) throw error;
      if (/大きすぎ|HTTP 4\d\d/.test(messageOf(error))) throw error;
      return downloadKintoneFile(guestId, fileKey);
    }
  };
  async function pool(items, worker) {
    let next = 0;
    await Promise.all(Array.from({ length: Math.min(DOWNLOAD_CONCURRENCY, items.length) }, async () => {
      while (next < items.length) await worker(items[next++]);
    }));
  }
  async function loadBody(entry, guestId, download, allowEmbedded) {
    const embedded = allowEmbedded ? entry.item.file?._content : void 0;
    let blob;
    if (isObject(embedded) && typeof embedded.base64 === "string") {
      let bytes;
      try {
        bytes = base64ToBytes(embedded.base64);
      } catch {
        throw new Error("バックアップに保存されたファイル本体を読み取れません");
      }
      blob = new Blob([bytes], { type: typeof embedded.contentType === "string" ? embedded.contentType : "" });
    } else blob = await download(guestId, entry.fileKey);
    return { blob, hash: await hashBytes(await blobBytes(blob)) };
  }
  async function resolveCustomizeFiles(sourceSection, targetSection, opts) {
    const download = opts.download || defaultDownload;
    const resolution = { files: dict(), hashes: dict(), blobs: /* @__PURE__ */ new Map(), targetBlobs: /* @__PURE__ */ new Map(), targetUnavailable: [] };
    const slotOf = (entry) => customizeSlotKey(entry.platform, entry.kind, entry.fileKey);
    const targetEntries = listFileEntries(targetSection);
    const targetSlots = new Set(targetEntries.map(slotOf));
    const pending = [];
    for (const entry of listFileEntries(sourceSection)) {
      if (targetSlots.has(slotOf(entry))) resolution.files[slotOf(entry)] = { status: "existing" };
      else if (!pending.some((item) => slotOf(item) === slotOf(entry))) pending.push(entry);
    }
    if (!pending.length) return resolution;
    const sourceBodies = /* @__PURE__ */ new Map(), sourceErrors = /* @__PURE__ */ new Map();
    const sourceByKey = /* @__PURE__ */ new Map();
    for (const entry of pending) if (!sourceByKey.has(entry.fileKey)) sourceByKey.set(entry.fileKey, entry);
    await pool([...sourceByKey.values()], async (entry) => {
      try {
        sourceBodies.set(entry.fileKey, await loadBody(entry, opts.sourceGuestId, download, true));
      } catch (error) {
        if (isRunCancelledError(error)) throw error;
        sourceErrors.set(entry.fileKey, messageOf(error));
      }
    });
    const targetByKey = /* @__PURE__ */ new Map();
    for (const entry of targetEntries) if (!targetByKey.has(entry.fileKey)) targetByKey.set(entry.fileKey, entry);
    const targetBodies = /* @__PURE__ */ new Map();
    if (sourceBodies.size) await pool([...targetByKey.values()], async (entry) => {
      try {
        targetBodies.set(entry.fileKey, await loadBody(entry, opts.targetGuestId, download, false));
      } catch (error) {
        if (isRunCancelledError(error)) throw error;
        resolution.targetUnavailable.push({ fileKey: entry.fileKey, name: entry.name || entry.fileKey, reason: messageOf(error) });
      }
    });
    for (const [key, body] of targetBodies) {
      resolution.hashes[key] = body.hash;
      resolution.targetBlobs.set(key, body.blob);
    }
    const reusedTargetSlots = /* @__PURE__ */ new Set();
    for (const entry of pending) {
      const slot = slotOf(entry), body = sourceBodies.get(entry.fileKey);
      if (!body) {
        resolution.files[slot] = { status: "unavailable", reason: sourceErrors.get(entry.fileKey) || "本体を取得できません" };
        continue;
      }
      resolution.hashes[entry.fileKey] = body.hash;
      resolution.blobs.set(entry.fileKey, body.blob);
      const reused = entry.name ? targetEntries.find((candidate) => candidate.platform === entry.platform && candidate.kind === entry.kind && candidate.name === entry.name && targetBodies.get(candidate.fileKey)?.hash === body.hash && !reusedTargetSlots.has(slotOf(candidate))) : void 0;
      if (reused) reusedTargetSlots.add(slotOf(reused));
      resolution.files[slot] = reused ? { status: "reuse", targetFileKey: reused.fileKey, hash: body.hash, byteSize: body.blob.size } : { status: "upload", hash: body.hash, byteSize: body.blob.size, contentType: body.blob.type || String(entry.item.file?.contentType || "") || guessContentType(entry.name) };
    }
    return resolution;
  }
  function comparableCustomizePayload(payload, resolution, names) {
    const result = deepClone(payload);
    for (const platform of PLATFORMS) for (const kind of KINDS) {
      const list2 = result?.[platform]?.[kind];
      if (!Array.isArray(list2)) continue;
      result[platform][kind] = list2.map((item) => {
        if (item?.type !== "FILE") return item;
        const fileKey = item.file?.fileKey, name = names[fileKey], hash = resolution?.hashes[fileKey];
        return { type: "FILE", file: { ...name !== void 0 ? { name } : {}, ...hash ? { contentHash: hash } : { fileKey } } };
      });
    }
    return result;
  }
  async function embedCustomizeFileContents(section, opts) {
    const download = async (guestId, fileKey) => opts.cached?.get(fileKey) || (opts.download || defaultDownload)(guestId, fileKey);
    const copy = deepClone(section);
    const entries = listFileEntries(copy);
    const results = /* @__PURE__ */ new Map();
    const unique = /* @__PURE__ */ new Map();
    for (const entry of entries) if (!unique.has(entry.fileKey)) unique.set(entry.fileKey, entry);
    await pool([...unique.values()], async (entry) => {
      try {
        const blob = await download(opts.guestId, entry.fileKey);
        results.set(entry.fileKey, { content: { base64: bytesToBase64(await blobBytes(blob)), contentType: blob.type || String(entry.item.file?.contentType || "") || guessContentType(entry.name), byteSize: blob.size } });
      } catch (error) {
        if (isRunCancelledError(error)) throw error;
        results.set(entry.fileKey, { reason: messageOf(error) });
      }
    });
    const unavailable = [], reported = /* @__PURE__ */ new Set();
    for (const entry of entries) {
      const result = results.get(entry.fileKey);
      if ("content" in result) entry.item.file._content = { ...result.content };
      else {
        entry.item.file._contentUnavailable = result.reason;
        if (!reported.has(entry.fileKey)) {
          reported.add(entry.fileKey);
          unavailable.push({ fileKey: entry.fileKey, name: entry.name || entry.fileKey, reason: result.reason });
        }
      }
    }
    return { section: copy, unavailable };
  }

  // src/reflect/changeSummary.ts
  init_kintone_enums();
  init_label_dict();
  var MAX_VALUE = 80;
  var MAX_DETAILS = 8;
  var own = (target, key) => Object.prototype.hasOwnProperty.call(target, key);
  var isObj = (value) => !!value && typeof value === "object" && !Array.isArray(value);
  var dictGet = (dict2, key) => dict2 && own(dict2, key) ? dict2[key] : void 0;
  var get = (target, key) => isObj(target) && own(target, key) ? target[key] : void 0;
  var list = (value) => Array.isArray(value) ? value : [];
  function stable(value) {
    const sort = (input) => Array.isArray(input) ? input.map(sort) : isObj(input) ? Object.fromEntries(Object.keys(input).sort().map((key) => [key, sort(input[key])])) : input;
    return JSON.stringify(sort(value)) ?? "undefined";
  }
  var same = (a, b) => stable(a) === stable(b);
  function clip(text, max = MAX_VALUE) {
    if (text.length <= max) return text;
    const chars = Array.from(text);
    return chars.length <= max ? text : chars.slice(0, max - 1).join("") + "…";
  }
  var ENUM_BY_KEY = {
    theme: APP_THEME_JP,
    roundingMode: ROUNDING_MODE_JP,
    selectionMode: TITLE_SELECTION_JP,
    scope: CUSTOMIZE_SCOPE_JP,
    chartType: CHART_TYPE_JP,
    chartMode: CHART_MODE_JP,
    per: GROUP_PER_JP,
    by: REPORT_SORT_BY_JP,
    order: REPORT_SORT_ORDER_JP,
    every: PERIODIC_REPORT_EVERY_JP,
    dayOfWeek: DAY_OF_WEEK_JP,
    builtinType: VIEW_BUILTIN_TYPE_JP,
    device: VIEW_DEVICE_JP,
    paginationStyle: VALUE_LABELS.paginationStyle,
    accessibility: VALUE_LABELS.accessibility,
    recordTrigger: VALUE_LABELS.recordTrigger,
    format: NUMBER_FORMAT_JP,
    align: ALIGN_JP,
    unitPosition: UNIT_POSITION_JP,
    protocol: LINK_PROTOCOL_JP
  };
  var FIELD_ATTR_LABELS = {
    label: "表示名",
    required: "必須",
    unique: "重複禁止",
    defaultValue: "初期値",
    maxLength: "最大文字数",
    minLength: "最小文字数",
    maxValue: "最大値",
    minValue: "最小値",
    digit: "桁区切り",
    displayScale: "小数点以下の表示桁数",
    unit: "単位",
    unitPosition: "単位記号の位置",
    format: "表示形式",
    expression: "計算式",
    hideExpression: "計算式を非表示",
    noLabel: "ラベルを非表示",
    align: "選択肢の並び",
    protocol: "入力値の種類",
    rows: "表示行数",
    defaultNowValue: "初期値を現在日時にする",
    options: "選択肢",
    type: "種類",
    code: "フィールドコード",
    thumbnailSize: "サムネイルの大きさ",
    openGroup: "グループを開いた状態にする",
    entities: "選択できる対象"
  };
  var VIEW_ATTR_LABELS = {
    fields: "表示フィールド",
    sort: "並び順",
    filterCond: "絞り込み条件",
    type: "種類",
    index: "表示順",
    date: "日付フィールド",
    title: "タイトルフィールド",
    html: "HTML",
    pager: "ページャー",
    name: "名前"
  };
  var REPORT_ATTR_LABELS = {
    chartType: "グラフの種類",
    chartMode: "モード",
    groups: "分類",
    aggregations: "集計",
    sorts: "並び順",
    filterCond: "絞り込み条件",
    periodicReport: "定期レポート",
    index: "表示順",
    name: "名前"
  };
  var ACTION_ATTR_LABELS = {
    filterCond: "実行条件",
    entities: "実行できる対象",
    destApp: "コピー先アプリ",
    mappings: "フィールド対応",
    index: "表示順",
    name: "名前"
  };
  var PROCESS_ACTION_LABELS = { filterCond: "条件", executableUser: "実行者", type: "種類", name: "アクション名" };
  var LAYOUT_ATTR_LABELS = { label: "ラベル", openGroup: "初期状態で開く", width: "幅", height: "高さ", innerHeight: "入力欄の高さ" };
  var APP_SETTING_LABELS = APP_SETTINGS_LABELS;
  var LAYOUT_PLAIN_LABELS = { LABEL: "ラベル", SPACER: "スペース", HR: "罫線" };
  var labelFor = (key, over) => dictGet(over, key) ?? labelOfProp(key);
  function fmt(value, key = "", typeDict) {
    if (value === void 0 || value === null) return "（なし）";
    if (typeof value === "boolean") {
      if (key === "includeSubs") return value ? "はい" : "いいえ";
      if (/^enable[A-Z]/.test(key)) return value ? "有効" : "無効";
      return labelOfBool(value, key);
    }
    if (typeof value === "number") return String(value);
    if (typeof value === "string") {
      if (value === "") return "（空）";
      const translated = dictGet(key === "type" ? typeDict : ENUM_BY_KEY[own(ENUM_BY_KEY, key) ? key : ""], value);
      return clip(translated ?? value);
    }
    if (Array.isArray(value)) return clip(value.map((item) => isObj(item) || Array.isArray(item) ? stable(item) : String(item)).join("、"));
    return clip(stable(value));
  }
  function labelOnly(code, hint, labels2) {
    if (typeof hint === "string" && hint) return hint;
    return dictGet(labels2, code) || code;
  }
  function fieldName(code, labels2, hint) {
    const label = labelOnly(code, hint, labels2);
    return label && label !== code ? `${label}（${code}）` : code;
  }
  function entityOf(element) {
    return isObj(element) && isObj(element.entity) ? element.entity : element;
  }
  function entityText(entity, labels2) {
    if (!isObj(entity)) return typeof entity === "string" ? entity : "（不明）";
    const type = String(entity.type || ""), code = String(entity.code ?? entity.login ?? "");
    const name = String(entity.name || "");
    if (type === "FUNCTION") {
      const known = { "LOGINUSER()": "ログインユーザー", "PRIMARY_ORGANIZATION()": "優先する組織" }[code.trim().toUpperCase()];
      return known || `関数「${code}」`;
    }
    if (type === "ALL" || type === "EVERYONE") return "全員";
    if (type === "LOGIN_USER") return "ログインユーザー";
    if (type === "CREATOR" || type === "MODIFIER") return code ? `${dictGet(ENTITY_TYPE_JP, type)}「${code}」` : dictGet(ENTITY_TYPE_JP, type);
    if (type === "FIELD_ENTITY" || type === "CUSTOM_FIELD") return `フィールド値「${fieldName(code, labels2)}」`;
    const typeText = type === "DEPARTMENT" || type === "DEPT" ? "組織" : dictGet(ENTITY_TYPE_JP, type) ?? (type || "対象");
    const display = name && code && name !== code ? `${name}（${code}）` : name || code || "（未設定）";
    return `${typeText}「${display}」`;
  }
  var entityKey = (element) => {
    const entity = entityOf(element);
    return isObj(entity) ? `${entity.type ?? ""}\0${entity.code ?? ""}` : stable(entity);
  };
  var ordinal = (value) => {
    if (value === void 0 || value === null || value === "") return "（なし）";
    const number = Number(value);
    return Number.isFinite(number) ? `${number + 1}番目` : fmt(value);
  };
  var listText = (items) => {
    const joined = items.join("、"), text = clip(joined);
    return text !== joined && items.length > 1 ? `${text}（計 ${items.length} 件）` : text;
  };
  function elementText(key, element, labels2, section) {
    if (!isObj(element)) {
      const text = String(element);
      return key === "fields" && section === "viewSettings" ? fieldName(text, labels2) : clip(text);
    }
    if (key === "groups") return `${fieldName(String(element.code ?? ""), labels2)}${element.per ? ` ${dictGet(GROUP_PER_JP, String(element.per)) ?? element.per}単位` : ""}`;
    if (key === "aggregations") return `${dictGet(AGGREGATION_TYPE_JP, String(element.type)) ?? element.type ?? ""}${element.code ? ` ${fieldName(String(element.code), labels2)}` : ""}`.trim();
    if (key === "sorts") return `${dictGet(REPORT_SORT_BY_JP, String(element.by)) ?? element.by ?? ""} ${dictGet(REPORT_SORT_ORDER_JP, String(element.order)) ?? element.order ?? ""}`.trim();
    if (key === "mappings") {
      const from = element.srcType === "RECORD_URL" ? "レコードのURL" : element.srcField ?? element.sourceField ?? "";
      const to = element.destType === "RECORD_URL" ? "レコードのURL" : element.destField ?? "";
      return `${from} → ${to}`;
    }
    if (key === "fieldMappings") return `${element.field ?? ""} ← ${element.relatedField ?? ""}`;
    if (isObj(element.entity) || element.type && own(element, "code") && !element.name) return entityText(entityOf(element), labels2);
    return clip(String(element.name ?? element.code ?? element.id ?? stable(element)));
  }
  function arrayLine(key, label, before, after, labels2, section) {
    const pool2 = /* @__PURE__ */ new Map();
    for (const element of before) {
      const k = stable(element);
      pool2.set(k, (pool2.get(k) || 0) + 1);
    }
    const added = [];
    for (const element of after) {
      const k = stable(element), count = pool2.get(k) || 0;
      if (count) pool2.set(k, count - 1);
      else added.push(element);
    }
    const left = new Map(pool2);
    const removed = before.filter((element) => {
      const k = stable(element), count = left.get(k) || 0;
      if (count) {
        left.set(k, count - 1);
        return true;
      }
      return false;
    });
    const text = (items) => listText(items.map((element) => elementText(key, element, labels2, section)));
    if (!added.length && !removed.length) return `${label}: 並び順のみ変更`;
    const parts = [];
    if (added.length) parts.push(`追加 ${text(added)}`);
    if (removed.length) parts.push(`削除 ${text(removed)}`);
    return `${label}: ${parts.join(" / ")}`;
  }
  function optionNames(options) {
    if (Array.isArray(options)) return options.map((item) => isObj(item) ? String(item.label ?? item.name ?? "") : String(item));
    if (!isObj(options)) return [];
    const keys = Object.keys(options);
    const position = (key) => {
      const n = Number(get(options[key], "index"));
      return Number.isFinite(n) ? n : Number.MAX_SAFE_INTEGER;
    };
    return keys.map((key, i) => ({ key, i })).sort((a, b) => position(a.key) - position(b.key) || a.i - b.i).map((item) => item.key);
  }
  function optionLines(before, after, label) {
    const b = optionNames(before), a = optionNames(after);
    const added = a.filter((name) => !b.includes(name)), removed = b.filter((name) => !a.includes(name));
    if (!added.length && !removed.length) return [`${label}: 並び順のみ変更`];
    const parts = [];
    if (added.length) parts.push(`追加 ${listText(added)}`);
    if (removed.length) parts.push(`削除 ${listText(removed)}`);
    return [`${label}: ${parts.join(" / ")}`];
  }
  function entityListLines(label, beforeList, afterList, labels2) {
    const permissionText = (element) => {
      if (!isObj(element)) return "";
      const on = [];
      for (const [key, value] of Object.entries(element)) {
        if (key === "entity" || key === "type" || key === "code" || key === "name" || key === "includeSubs") continue;
        if (value === true) on.push(labelOfProp(key));
        else if (key === "accessibility" && typeof value === "string") on.push(fmt(value, key));
      }
      if (element.includeSubs === true) on.push("配下を含む");
      return on.length ? `（${on.join("・")}）` : "";
    };
    const queues = /* @__PURE__ */ new Map();
    afterList.forEach((element) => {
      const k = entityKey(element);
      const queue = queues.get(k);
      if (queue) queue.push(element);
      else queues.set(k, [element]);
    });
    const removed = [], changed = [];
    const matched = /* @__PURE__ */ new Set();
    for (const element of beforeList) {
      const peer = queues.get(entityKey(element))?.shift();
      if (peer === void 0) {
        removed.push(entityText(entityOf(element), labels2));
        continue;
      }
      matched.add(peer);
      if (same(element, peer)) continue;
      const keys = /* @__PURE__ */ new Set([...Object.keys(isObj(element) ? element : {}), ...Object.keys(isObj(peer) ? peer : {})]);
      const diffs = [...keys].filter((key) => !["entity", "type", "code", "name"].includes(key) && !same(get(element, key), get(peer, key))).map((key) => `${labelOfProp(key)} ${fmt(get(element, key), key)} → ${fmt(get(peer, key), key)}`);
      if (diffs.length) changed.push(`${label} ${entityText(entityOf(element), labels2)}: ${diffs.join("、")}`);
    }
    const added = afterList.filter((element) => !matched.has(element)).map((element) => `${entityText(entityOf(element), labels2)}${permissionText(element)}`);
    const lines = [];
    const parts = [];
    if (added.length) parts.push(`追加 ${listText(added)}`);
    if (removed.length) parts.push(`削除 ${listText(removed)}`);
    if (parts.length) lines.push(`${label}: ${parts.join(" / ")}`);
    if (!parts.length && !changed.length && !same(beforeList, afterList)) lines.push(`${label}: 並び順のみ変更`);
    return [...lines, ...changed];
  }
  function attrLines(before, after, options) {
    const b = isObj(before) ? before : {}, a = isObj(after) ? after : {};
    const prefix = options.prefix || [];
    const lines = [];
    for (const key of /* @__PURE__ */ new Set([...Object.keys(b), ...Object.keys(a)])) {
      if (options.ignore?.has(key)) continue;
      const bv = get(b, key), av = get(a, key);
      if (same(bv, av)) continue;
      const name = labelFor(key, options.over), label = [...prefix, name].join(" / ");
      const special = options.special && own(options.special, key) ? options.special[key] : void 0;
      if (special) {
        lines.push(...special(bv, av, label));
        continue;
      }
      if (key === "periodicReport") {
        const x2 = describePeriodicReport(bv), y2 = describePeriodicReport(av);
        if (x2 !== null || y2 !== null) {
          lines.push(`${label}: ${x2 ?? "（なし）"} → ${y2 ?? "（なし）"}`);
          continue;
        }
      }
      if ((Array.isArray(bv) || bv === void 0) && (Array.isArray(av) || av === void 0) && (bv !== void 0 || av !== void 0)) {
        lines.push(arrayLine(key, label, list(bv), list(av), options.labels, options.section || ""));
        continue;
      }
      if (isObj(bv) && isObj(av)) {
        lines.push(...attrLines(bv, av, { labels: options.labels, section: options.section, prefix: [...prefix, name], over: options.over }));
        continue;
      }
      const x = fmt(bv, key, options.typeDict), y = fmt(av, key, options.typeDict);
      if (x !== y) lines.push(`${label}: ${x} → ${y}`);
      else if (!same(bv, av)) lines.push(`${label}: 内容を変更（長いため省略）`);
    }
    return lines;
  }
  var entitiesSpecial = (labels2) => (before, after, label) => entityListLines(label, list(before), list(after), labels2);
  function fieldBrief(definition) {
    if (!isObj(definition)) return [];
    const out = [];
    if (definition.type) out.push(`種類: ${dictGet(FIELD_TYPE_JP, String(definition.type)) ?? definition.type}`);
    if (definition.type === "SUBTABLE" && isObj(definition.fields)) out.push(`テーブル内フィールド ${Object.keys(definition.fields).length}件`);
    else if (definition.required === true) out.push("必須");
    else if (definition.unique === true) out.push("重複禁止");
    else if (isObj(definition.options) && Object.keys(definition.options).length) out.push(`選択肢 ${Object.keys(definition.options).length}件`);
    return out.slice(0, 2);
  }
  function fieldItems(before, after, labels2, push) {
    const bp = get(before, "properties"), ap = get(after, "properties");
    if (!isObj(bp) || !isObj(ap)) throw new Error("フィールド設定の形式が不正です。");
    const walk = (b, a, parentLabel) => {
      for (const code of [...Object.keys(a), ...Object.keys(b).filter((key) => !own(a, key))]) {
        const bd = get(b, code), ad = get(a, code), definition = ad ?? bd;
        const label = labelOnly(code, get(definition, "label"), labels2);
        const withCode = label !== code ? `${label}（${code}）` : code;
        const name = parentLabel ? `${parentLabel} / ${withCode}` : withCode;
        if (bd === void 0 || ad === void 0) {
          push(ad === void 0 ? "削除" : "追加", name, fieldBrief(definition));
          continue;
        }
        const ignore = /* @__PURE__ */ new Set(["fields"]);
        const bc = get(bd, "code"), ac = get(ad, "code");
        if (bc === void 0 || ac === void 0 || bc === ac) ignore.add("code");
        const lines = attrLines(bd, ad, { ignore, over: FIELD_ATTR_LABELS, typeDict: FIELD_TYPE_JP, labels: labels2, section: "fieldSettings", special: { options: (x, y, l) => optionLines(x, y, l) } });
        if (lines.length) push("変更", name, lines);
        if (isObj(bd.fields) || isObj(ad.fields)) walk(isObj(bd.fields) ? bd.fields : {}, isObj(ad.fields) ? ad.fields : {}, label);
      }
    };
    walk(bp, ap, null);
  }
  function scanLayout(layout, labels2) {
    const placed = /* @__PURE__ */ new Map();
    const plain = /* @__PURE__ */ new Map();
    const place = (node, where) => {
      const code = String(node.code);
      if (!placed.has(code)) placed.set(code, { code, where, node });
    };
    const addPlain = (node) => {
      const type = String(node?.type ?? "不明");
      const items = plain.get(type);
      if (items) items.push(node);
      else plain.set(type, [node]);
    };
    const walk = (nodes, container) => {
      nodes.forEach((node, i) => {
        if (!isObj(node)) return;
        const prefix = container ? `${container}内の` : "";
        if (node.type === "ROW") {
          list(node.fields).forEach((child, j) => {
            if (isObj(child) && typeof child.code === "string" && child.code) place(child, `${prefix}${i + 1}行目の${j + 1}番目`);
            else if (isObj(child)) addPlain(child);
          });
        } else if (node.type === "GROUP" && typeof node.code === "string") {
          place(node, `${prefix}${i + 1}行目`);
          walk(list(node.layout), `グループ「${fieldName(node.code, labels2, node.label)}」`);
        } else if (node.type === "SUBTABLE" && typeof node.code === "string") {
          place(node, `${prefix}${i + 1}行目`);
          const table = `テーブル「${fieldName(node.code, labels2)}」`;
          list(node.fields).forEach((child, j) => {
            if (isObj(child) && typeof child.code === "string" && child.code) place(child, `${table}の${j + 1}番目`);
            else if (isObj(child)) addPlain(child);
          });
        }
      });
    };
    walk(list(layout), "");
    return { placed, plain };
  }
  function layoutItems(before, after, labels2, push) {
    const bl = get(before, "layout"), al = get(after, "layout");
    if (!Array.isArray(bl) || !Array.isArray(al)) throw new Error("レイアウトの形式が不正です。");
    const b = scanLayout(bl, labels2), a = scanLayout(al, labels2);
    let count = 0;
    const emit = (kind, name, details) => {
      count += 1;
      push(kind, name, details);
    };
    for (const [code, now] of a.placed) {
      const nameOf = (placed) => fieldName(code, labels2, placed.node.type === "GROUP" ? placed.node.label : void 0);
      const prev = b.placed.get(code);
      if (!prev) {
        emit("追加", nameOf(now), [`配置: ${now.where}`]);
        continue;
      }
      const lines = [];
      if (prev.where !== now.where) lines.push(`位置: ${prev.where} → ${now.where}`);
      const px = (value) => value === void 0 ? "（自動）" : /^\d+$/.test(String(value)) ? `${value}px` : String(value);
      const sizes = /* @__PURE__ */ new Set([...Object.keys(isObj(prev.node.size) ? prev.node.size : {}), ...Object.keys(isObj(now.node.size) ? now.node.size : {})]);
      for (const key of sizes) {
        const x = get(prev.node.size, key), y = get(now.node.size, key);
        if (String(x ?? "") !== String(y ?? "")) lines.push(`${labelFor(key, LAYOUT_ATTR_LABELS)}: ${px(x)} → ${px(y)}`);
      }
      lines.push(...attrLines(prev.node, now.node, { ignore: /* @__PURE__ */ new Set(["code", "type", "size", "layout", "fields", "elementId"]), over: LAYOUT_ATTR_LABELS, labels: labels2 }));
      if (lines.length) emit("変更", nameOf(now), lines);
    }
    for (const [code, prev] of b.placed) if (!a.placed.has(code)) emit("削除", fieldName(code, labels2, prev.node.type === "GROUP" ? prev.node.label : void 0), [`配置: ${prev.where} → なし`]);
    const plainLines = { 削除: [], 追加: [], 変更: [] };
    for (const type of /* @__PURE__ */ new Set([...b.plain.keys(), ...a.plain.keys()])) {
      const x = b.plain.get(type) || [], y = a.plain.get(type) || [], name = dictGet(LAYOUT_PLAIN_LABELS, type) ?? type;
      if (x.length !== y.length) {
        plainLines[x.length > y.length ? "削除" : "追加"].push(`${name}: ${x.length}個 → ${y.length}個`);
        continue;
      }
      const texts = (items) => items.map((item) => String(item.label ?? ""));
      if (type === "LABEL" && !same(texts(x), texts(y))) plainLines.変更.push(arrayLine("label", `${name}の内容`, texts(x), texts(y), labels2, "layoutSettings"));
      const sizes = (items) => items.map((item) => stable(item.size ?? null));
      if (!same(sizes(x), sizes(y))) plainLines.変更.push(`${name}の大きさを変更`);
    }
    for (const kind of ["削除", "変更", "追加"]) if (plainLines[kind].length) emit(kind, "ラベル・スペース・罫線", plainLines[kind]);
    if (!count && !same(bl, al)) emit("変更", "レイアウト", ["行や要素の並びを変更"]);
  }
  function namedItems(sectionKey, before, after, labels2, push) {
    const property = sectionKey === "viewSettings" ? "views" : sectionKey === "reportSettings" ? "reports" : "actions";
    const bm = get(before, property), am = get(after, property);
    if (!isObj(bm) || !isObj(am)) throw new Error("設定の形式が不正です。");
    const over = sectionKey === "viewSettings" ? VIEW_ATTR_LABELS : sectionKey === "reportSettings" ? REPORT_ATTR_LABELS : ACTION_ATTR_LABELS;
    const special = {
      index: (x, y, label) => [`${label}: ${ordinal(x)} → ${ordinal(y)}`],
      entities: entitiesSpecial(labels2),
      destApp: (x, y, label) => [
        ...same(get(x, "app"), get(y, "app")) ? [] : [`${label}: ${fmt(get(x, "app"))} → ${fmt(get(y, "app"))}`],
        ...same(get(x, "code"), get(y, "code")) ? [] : [`${label}のアプリコード: ${fmt(get(x, "code"))} → ${fmt(get(y, "code"))}`]
      ]
    };
    const brief = (value) => {
      if (!isObj(value)) return [];
      if (sectionKey === "viewSettings") {
        const out2 = [`種類: ${dictGet(VIEW_TYPE_JP, String(value.type)) ?? value.type ?? "（不明）"}`];
        if (Array.isArray(value.fields)) out2.push(`表示フィールド ${value.fields.length}件`);
        return out2;
      }
      if (sectionKey === "reportSettings") return [`種類: ${dictGet(CHART_TYPE_JP, String(value.chartType)) ?? value.chartType ?? "（不明）"}`];
      const out = [];
      if (value.destApp?.app !== void 0) out.push(`コピー先アプリ: ${value.destApp.app}`);
      if (Array.isArray(value.mappings)) out.push(`フィールド対応 ${value.mappings.length}件`);
      return out;
    };
    for (const name of [...Object.keys(am), ...Object.keys(bm).filter((key) => !own(am, key))]) {
      const bv = get(bm, name), av = get(am, name);
      if (bv === void 0 || av === void 0) {
        push(av === void 0 ? "削除" : "追加", name, brief(av ?? bv));
        continue;
      }
      const ignore = /* @__PURE__ */ new Set(["id"]);
      if (get(bv, "name") === void 0 || get(av, "name") === void 0 || get(bv, "name") === get(av, "name")) ignore.add("name");
      const lines = attrLines(bv, av, { ignore, over, typeDict: VIEW_TYPE_JP, labels: labels2, section: sectionKey, special });
      if (lines.length) push("変更", name, lines);
    }
  }
  function ruleItems(beforeRules, afterRules, options, push) {
    const keysOf = (rules) => rules.map((rule) => isObj(rule) ? options.key(rule) : null);
    const bk = keysOf(beforeRules), ak = keysOf(afterRules);
    if (bk.some((key) => key === null) || ak.some((key) => key === null)) {
      if (same(beforeRules, afterRules)) return;
      push("変更", options.sectionName, [beforeRules.length === afterRules.length ? `ルールの内容を変更（${afterRules.length}件）` : `ルール: ${beforeRules.length}件 → ${afterRules.length}件`]);
      return;
    }
    const queues = /* @__PURE__ */ new Map();
    ak.forEach((key, i) => {
      const queue = queues.get(key);
      if (queue) queue.push(i);
      else queues.set(key, [i]);
    });
    const matched = /* @__PURE__ */ new Set(), pairs = [];
    beforeRules.forEach((rule, i) => {
      const j = queues.get(bk[i])?.shift();
      if (j === void 0) {
        push("削除", options.name(rule), options.brief(rule));
        return;
      }
      matched.add(j);
      pairs.push([i, j]);
      const lines = options.diff(rule, afterRules[j]);
      if (lines.length) push("変更", options.name(afterRules[j]), lines);
    });
    afterRules.forEach((rule, j) => {
      if (!matched.has(j)) push("追加", options.name(rule), options.brief(rule));
    });
    const order = pairs.map(([, j]) => j);
    if (order.some((j, i) => i > 0 && j < order[i - 1])) push("変更", options.orderName || `${options.sectionName}の並び`, ["並び順のみ変更"]);
  }
  function permissionBrief(rule, extra = []) {
    if (!isObj(rule)) return [];
    const on = Object.keys(rule).filter((key) => key !== "includeSubs" && rule[key] === true).map((key) => labelOfProp(key));
    if (rule.includeSubs === true) on.push("配下を含む");
    return [on.length ? `許可: ${listText(on)}` : "許可: なし", ...extra];
  }
  function processItems(before, after, labels2, push) {
    if (!isObj(before) || !isObj(after)) throw new Error("プロセス管理の形式が不正です。");
    if (before.enable !== after.enable) push("変更", "プロセス管理", [`有効化: ${fmt(before.enable, "enable")} → ${fmt(after.enable, "enable")}`]);
    const assignee = (x, y) => {
      const lines = [];
      if (get(x, "type") !== get(y, "type")) lines.push(`作業者の選択方式: ${fmt(get(x, "type"), "type", PROCESS_ASSIGNEE_TYPE_JP)} → ${fmt(get(y, "type"), "type", PROCESS_ASSIGNEE_TYPE_JP)}`);
      return [...lines, ...entityListLines("作業者", list(get(x, "entities")), list(get(y, "entities")), labels2)];
    };
    const bs = isObj(before.states) ? before.states : {}, as = isObj(after.states) ? after.states : {};
    const stateBrief = (state3) => {
      const out = ["種類: 状態"];
      const entities = list(get(get(state3, "assignee"), "entities"));
      if (entities.length) out.push(`作業者: ${listText(entities.map((entity) => entityText(entityOf(entity), labels2)))}`);
      return out;
    };
    for (const name of [...Object.keys(as), ...Object.keys(bs).filter((key) => !own(as, key))]) {
      const bv = get(bs, name), av = get(as, name);
      if (bv === void 0 || av === void 0) {
        push(av === void 0 ? "削除" : "追加", name, stateBrief(av ?? bv));
        continue;
      }
      const lines = attrLines(bv, av, { ignore: /* @__PURE__ */ new Set(["name"]), over: { index: "表示順", assignee: "作業者" }, labels: labels2, section: "processSettings", special: { index: (x, y, label) => [`${label}: ${ordinal(x)} → ${ordinal(y)}`], assignee } });
      if (lines.length) push("変更", name, lines);
    }
    const actionKey = (action) => `${action.name ?? ""}\0${action.from ?? ""}\0${action.to ?? ""}`;
    const actionName = (action) => `${action.name ?? "（名称なし）"}（${action.from ?? "?"} → ${action.to ?? "?"}）`;
    const actionSpecial = { executableUser: (x, y) => entityListLines("実行者", list(get(x, "entities")), list(get(y, "entities")), labels2) };
    ruleItems(list(before.actions), list(after.actions), {
      key: actionKey,
      name: actionName,
      sectionName: "アクション",
      orderName: "アクションの並び",
      brief: (action) => ["種類: アクション", ...action.filterCond ? [`条件: ${fmt(action.filterCond)}`] : []],
      diff: (x, y) => attrLines(x, y, { ignore: /* @__PURE__ */ new Set(["name", "from", "to"]), over: PROCESS_ACTION_LABELS, labels: labels2, section: "processSettings", special: actionSpecial })
    }, push);
  }
  function aclItems(sectionKey, before, after, labels2, push) {
    const br = get(before, "rights"), ar = get(after, "rights");
    if (!Array.isArray(br) || !Array.isArray(ar)) throw new Error("権限の形式が不正です。");
    const special = { entities: entitiesSpecial(labels2) };
    if (sectionKey === "appAcl") {
      ruleItems(br, ar, {
        sectionName: "アプリ権限",
        key: (rule) => entityKey(rule),
        name: (rule) => entityText(entityOf(rule), labels2),
        brief: (rule) => permissionBrief(rule),
        diff: (x, y) => attrLines(x, y, { ignore: /* @__PURE__ */ new Set(["entity"]), labels: labels2, section: sectionKey })
      }, push);
    } else if (sectionKey === "recordPermissions") {
      ruleItems(br, ar, {
        sectionName: "レコード権限",
        key: (rule) => String(rule.filterCond ?? ""),
        name: (rule) => rule.filterCond ? `条件「${clip(String(rule.filterCond), 60)}」` : "条件なし（すべてのレコード）",
        brief: (rule) => rule.entities?.length ? entityListLines("対象", [], list(rule.entities), labels2) : ["対象なし"],
        diff: (x, y) => attrLines(x, y, { ignore: /* @__PURE__ */ new Set(["filterCond"]), labels: labels2, section: sectionKey, special, over: { entities: "対象" } })
      }, push);
    } else {
      ruleItems(br, ar, {
        sectionName: "フィールド権限",
        key: (rule) => typeof rule.code === "string" && rule.code ? rule.code : null,
        name: (rule) => fieldName(String(rule.code), labels2),
        brief: (rule) => rule.entities?.length ? entityListLines("対象", [], list(rule.entities), labels2) : ["対象なし"],
        diff: (x, y) => attrLines(x, y, { ignore: /* @__PURE__ */ new Set(["code"]), labels: labels2, section: sectionKey, special, over: { entities: "対象" } })
      }, push);
    }
    extraItems(before, after, /* @__PURE__ */ new Set(["rights"]), push);
  }
  function timingText(timing, labels2) {
    if (!isObj(timing)) return fmt(timing);
    const parts = [];
    if (timing.code) parts.push(fieldName(String(timing.code), labels2));
    if (timing.daysLater !== void 0 && timing.daysLater !== "") parts.push(describeReminderOffset("days", timing.daysLater) ?? `${timing.daysLater}日`);
    if (timing.hoursLater !== void 0 && timing.hoursLater !== "") parts.push(describeReminderOffset("hours", timing.hoursLater) ?? `${timing.hoursLater}時間`);
    if (timing.time) parts.push(String(timing.time));
    return parts.join(" ") || "（なし）";
  }
  function extraItems(before, after, skip, push) {
    const b = isObj(before) ? before : {}, a = isObj(after) ? after : {};
    for (const key of /* @__PURE__ */ new Set([...Object.keys(b), ...Object.keys(a)])) {
      if (skip.has(key)) continue;
      const bv = get(b, key), av = get(a, key);
      if (same(bv, av)) continue;
      push("変更", labelOfProp(key), [`${fmt(bv, key)} → ${fmt(av, key)}`]);
    }
  }
  function notificationItems(sectionKey, before, after, labels2, push) {
    const bn = get(before, "notifications"), an = get(after, "notifications");
    if (!Array.isArray(bn) || !Array.isArray(an)) throw new Error("通知の形式が不正です。");
    const targets = entitiesSpecial(labels2);
    if (sectionKey === "notifications") {
      ruleItems(bn, an, {
        sectionName: "通知",
        key: (rule) => entityKey(rule),
        name: (rule) => entityText(entityOf(rule), labels2),
        brief: (rule) => {
          const on = Object.keys(rule).filter((key) => key !== "entity" && key !== "includeSubs" && rule[key] === true).map((key) => labelOfProp(key));
          return [on.length ? `通知する: ${listText(on)}` : "通知する条件なし"];
        },
        diff: (x, y) => attrLines(x, y, { ignore: /* @__PURE__ */ new Set(["entity"]), labels: labels2, section: sectionKey })
      }, push);
    } else {
      const reminder = sectionKey === "reminderNotifications";
      ruleItems(bn, an, {
        sectionName: reminder ? "リマインダー通知" : "レコード条件通知",
        key: (rule) => typeof rule.title === "string" && rule.title ? rule.title : null,
        name: (rule) => String(rule.title),
        brief: (rule) => [
          ...reminder ? [`通知するタイミング: ${timingText(rule.timing, labels2)}`] : [],
          ...rule.filterCond ? [`絞り込み条件: ${fmt(rule.filterCond)}`] : [],
          ...list(rule.targets).length ? entityListLines("通知先", [], list(rule.targets), labels2) : ["通知先なし"]
        ],
        diff: (x, y) => attrLines(x, y, {
          ignore: /* @__PURE__ */ new Set(["title"]),
          labels: labels2,
          section: sectionKey,
          over: { targets: "通知先", filterCond: "絞り込み条件", timing: "通知するタイミング" },
          special: { targets, timing: (p, q, label) => [`${label}: ${timingText(p, labels2)} → ${timingText(q, labels2)}`] }
        })
      }, push);
    }
    extraItems(before, after, /* @__PURE__ */ new Set(["notifications"]), push);
  }
  function categoryPaths(categories) {
    const out = /* @__PURE__ */ new Map();
    const walk = (node, trail) => {
      const children = (value) => Array.isArray(value) ? value.map((child, i) => [String(isObj(child) ? child.name ?? child.label ?? child.code ?? i + 1 : child), child]) : isObj(value) ? Object.entries(value) : [];
      for (const [name, child] of children(node)) {
        const path = [...trail, name];
        out.set(path.join(" / "), child);
        if (isObj(child)) {
          for (const key of ["children", "subCategories", "categories"]) if (own(child, key)) walk(child[key], path);
        }
      }
    };
    walk(categories, []);
    return out;
  }
  function categoryItems(before, after, labels2, push) {
    if (!isObj(before) || !isObj(after)) throw new Error("カテゴリーの形式が不正です。");
    if (before.enabled !== after.enabled) push("変更", "カテゴリー機能", [`有効状態: ${fmt(before.enabled, "enabled")} → ${fmt(after.enabled, "enabled")}`]);
    const b = categoryPaths(before.categories), a = categoryPaths(after.categories);
    const strip = (node) => isObj(node) ? Object.fromEntries(Object.entries(node).filter(([key]) => !["children", "subCategories", "categories"].includes(key))) : node;
    for (const [path, node] of a) {
      if (!b.has(path)) {
        push("追加", path, ["カテゴリーを追加"]);
        continue;
      }
      const lines = attrLines(strip(b.get(path)), strip(node), { over: { index: "表示順", name: "名前", label: "名前" }, labels: labels2, special: { index: (x, y, label) => [`${label}: ${ordinal(x)} → ${ordinal(y)}`] } });
      if (lines.length) push("変更", path, lines);
    }
    for (const path of b.keys()) if (!a.has(path)) push("削除", path, ["カテゴリーを削除"]);
    extraItems(before, after, /* @__PURE__ */ new Set(["enabled", "categories"]), push);
  }
  function pluginItems(before, after, push) {
    const idOf = (item) => typeof item === "string" ? item : String(get(item, "id") ?? "");
    const bp = list(get(before, "plugins")).map(idOf), ap = list(get(after, "plugins")).map(idOf);
    for (const id of ap) if (!bp.includes(id)) push("追加", id, ["プラグインを追加（固有の設定はコピーしません）"]);
    for (const id of bp) if (!ap.includes(id)) push("削除", id, ["プラグインを外す"]);
  }
  function customizeItems(before, after, push) {
    if (!isObj(before) || !isObj(after)) throw new Error("JS/CSS設定の形式が不正です。");
    if (before.scope !== after.scope) push("変更", "適用範囲", [`適用範囲: ${fmt(before.scope, "scope")} → ${fmt(after.scope, "scope")}`]);
    const fileOf = (item) => get(item, "file");
    const nameOf = (item) => {
      if (get(item, "type") === "URL") return clip(String(item.url ?? ""));
      const file = fileOf(item);
      return clip(String(get(file, "name") || get(file, "fileKey") || "（名称なし）"));
    };
    const idOf = (item) => {
      if (get(item, "type") === "URL") return `U|${item.url}`;
      const file = fileOf(item);
      if (get(file, "contentHash")) return `H|${file.contentHash}|${get(file, "name") ?? ""}`;
      return get(file, "fileKey") ? `K|${file.fileKey}` : `N|${get(file, "name") ?? ""}`;
    };
    const kindText = (item) => dictGet(RESOURCE_TYPE_JP, String(get(item, "type"))) ?? String(get(item, "type") ?? "不明");
    for (const [platform, platformText] of [["desktop", "PC"], ["mobile", "モバイル"]]) for (const [kind, kindLabel] of [["js", "JS"], ["css", "CSS"]]) {
      const bl = list(get(get(before, platform), kind)), al = list(get(get(after, platform), kind));
      const prefix = `${platformText} ${kindLabel}`;
      const queues = /* @__PURE__ */ new Map();
      al.forEach((item, i) => {
        const key = idOf(item);
        const queue = queues.get(key);
        if (queue) queue.push(i);
        else queues.set(key, [i]);
      });
      const matched = /* @__PURE__ */ new Set(), pairs = [], removed = [];
      bl.forEach((item) => {
        const j = queues.get(idOf(item))?.shift();
        if (j === void 0) removed.push(item);
        else {
          matched.add(j);
          pairs.push(j);
        }
      });
      let added = al.map((item, i) => ({ item, i })).filter((entry) => !matched.has(entry.i));
      const left = [];
      for (const item of removed) {
        const index = get(item, "type") === "FILE" ? added.findIndex((entry2) => get(entry2.item, "type") === "FILE" && nameOf(entry2.item) === nameOf(item)) : -1;
        if (index < 0) {
          left.push(item);
          continue;
        }
        const [entry] = added.splice(index, 1);
        push("変更", `${prefix} / ${nameOf(item)}`, ["ファイルの内容を差し替え", `読み込み順: ${entry.i + 1}番目`]);
      }
      for (const item of left) push("削除", `${prefix} / ${nameOf(item)}`, [`種類: ${kindText(item)}`]);
      for (const entry of added) push("追加", `${prefix} / ${nameOf(entry.item)}`, [`種類: ${kindText(entry.item)}`, `読み込み順: ${entry.i + 1}番目`]);
      if (pairs.some((j, i) => i > 0 && j < pairs[i - 1])) {
        const commonBefore = bl.filter((item) => al.some((other) => idOf(other) === idOf(item))), commonAfter = al.filter((item) => bl.some((other) => idOf(other) === idOf(item)));
        push("変更", `${prefix} の読み込み順`, [`読み込み順: ${listText(commonBefore.map(nameOf))} → ${listText(commonAfter.map(nameOf))}`]);
      }
    }
  }
  function appSettingsItems(before, after, labels2, push) {
    if (!isObj(before) || !isObj(after)) throw new Error("アプリ設定の形式が不正です。");
    const order = Object.keys(APP_SETTING_LABELS);
    const keys = [...order, ...[.../* @__PURE__ */ new Set([...Object.keys(before), ...Object.keys(after)])].filter((key) => !order.includes(key) && key !== "revision")];
    const kv = (label, x, y, text = (value) => fmt(value)) => same(x, y) ? [] : [`${label}: ${text(x)} → ${text(y)}`];
    for (const key of keys) {
      const bv = get(before, key), av = get(after, key);
      if (same(bv, av)) continue;
      const name = labelFor(key, APP_SETTING_LABELS);
      let details;
      if (key === "titleField") {
        details = [
          ...kv("選択方法", get(bv, "selectionMode"), get(av, "selectionMode"), (value) => fmt(value, "selectionMode")),
          ...kv("フィールド", get(bv, "code"), get(av, "code"), (value) => value ? fieldName(String(value), labels2) : "（なし）")
        ];
      } else if (key === "numberPrecision") {
        details = [
          ...kv("全体の桁数", get(bv, "digits"), get(av, "digits")),
          ...kv("小数部の桁数", get(bv, "decimalPlaces"), get(av, "decimalPlaces")),
          ...kv("丸めかた", get(bv, "roundingMode"), get(av, "roundingMode"), (value) => fmt(value, "roundingMode"))
        ];
      } else if (key === "firstMonthOfFiscalYear") {
        details = [`${bv === void 0 ? "（なし）" : `${bv}月`} → ${av === void 0 ? "（なし）" : `${av}月`}`];
      } else if (isObj(bv) && isObj(av)) {
        details = attrLines(bv, av, { labels: labels2 });
      } else details = [`${fmt(bv, key)} → ${fmt(av, key)}`];
      push("変更", name, details.length ? details : [`${fmt(bv, key)} → ${fmt(av, key)}`]);
    }
  }
  function genericItems(before, after, labels2, push) {
    if (!isObj(before) && !isObj(after)) {
      if (!same(before, after)) push("変更", "設定", [`${fmt(before)} → ${fmt(after)}`]);
      return;
    }
    const b = isObj(before) ? before : {}, a = isObj(after) ? after : {};
    for (const key of /* @__PURE__ */ new Set([...Object.keys(b), ...Object.keys(a)])) {
      const bv = get(b, key), av = get(a, key);
      if (same(bv, av)) continue;
      const name = labelOfProp(key);
      const arrayish = (value) => Array.isArray(value) || value === void 0;
      const lines = arrayish(bv) && arrayish(av) ? [arrayLine(key, name, list(bv), list(av), labels2, "")] : isObj(bv) && isObj(av) ? attrLines(bv, av, { labels: labels2 }) : [`${fmt(bv, key)} → ${fmt(av, key)}`];
      push(bv === void 0 ? "追加" : av === void 0 ? "削除" : "変更", name, lines.length ? lines : ["内容を変更"]);
    }
  }
  var KIND_ORDER = { 削除: 0, 変更: 1, 追加: 2, 保持: 3 };
  function summarizeReflectItems(sectionKey, before, after, context = {}) {
    const labels2 = context.fieldLabels;
    const run = (build) => {
      const items2 = [];
      const push = (kind, name, details) => {
        const clean = details.filter(Boolean);
        items2.push({ kind, name, details: clean.length > MAX_DETAILS ? [...clean.slice(0, MAX_DETAILS - 1), `ほか ${clean.length - (MAX_DETAILS - 1)} 件`] : clean });
      };
      build(push);
      return items2;
    };
    const specific = (push) => {
      switch (sectionKey) {
        case "fieldSettings":
          return fieldItems(before, after, labels2, push);
        case "layoutSettings":
          return layoutItems(before, after, labels2, push);
        case "viewSettings":
        case "reportSettings":
        case "actionSettings":
          return namedItems(sectionKey, before, after, labels2, push);
        case "processSettings":
          return processItems(before, after, labels2, push);
        case "appAcl":
        case "recordPermissions":
        case "fieldAcl":
          return aclItems(sectionKey, before, after, labels2, push);
        case "notifications":
        case "perRecordNotifications":
        case "reminderNotifications":
          return notificationItems(sectionKey, before, after, labels2, push);
        case "categories":
          return categoryItems(before, after, labels2, push);
        case "pluginSettings":
          return pluginItems(before, after, push);
        case "customizeSettings":
          return customizeItems(before, after, push);
        case "appSettings":
          return appSettingsItems(before, after, labels2, push);
        default:
          return genericItems(before, after, labels2, push);
      }
    };
    let items;
    try {
      items = run(specific);
    } catch {
      try {
        items = run((push) => genericItems(before, after, labels2, push));
      } catch {
        items = [];
      }
    }
    const names = new Set(items.map((item) => item.name));
    for (const name of context.retained || []) {
      if (names.has(name)) continue;
      names.add(name);
      items.push({ kind: "保持", name, details: ["反映先だけにあるため、そのまま残します"] });
    }
    return items.map((item, index) => ({ item, index })).sort((x, y) => KIND_ORDER[x.item.kind] - KIND_ORDER[y.item.kind] || x.index - y.index).map((entry) => entry.item);
  }
  function inventoryLayout(nodes) {
    const inventory = { codes: /* @__PURE__ */ new Set(), plain: /* @__PURE__ */ Object.create(null) };
    const visit = (node) => {
      if (!isObj(node)) return;
      if (typeof node.code === "string" && node.code) inventory.codes.add(node.code);
      else if (node.type !== "ROW") {
        const type = String(node.type ?? "不明");
        inventory.plain[type] = (inventory.plain[type] || 0) + 1;
      }
      for (const child of [...list(node.fields), ...list(node.layout)]) visit(child);
    };
    for (const node of Array.isArray(nodes) ? nodes : [nodes]) visit(node);
    return inventory;
  }
  function describeLayoutNode(node, fieldLabels) {
    if (!isObj(node)) return "不明な要素";
    const names = (nodes) => {
      const codes = [...inventoryLayout(nodes).codes];
      return { count: codes.length, text: codes.slice(0, 4).map((code) => fieldName(code, fieldLabels)).join("、") + (codes.length > 4 ? "…" : "") };
    };
    if (node.type === "ROW") {
      const inside = names(list(node.fields));
      return inside.count ? `フィールド ${inside.count} 個の行（${inside.text}）` : "ラベル・スペース・罫線だけの行";
    }
    if (node.type === "GROUP") {
      const inside = names(list(node.layout));
      return `グループ「${fieldName(String(node.code ?? ""), fieldLabels, node.label)}」${inside.count ? `（中のフィールド ${inside.count} 個）` : ""}`;
    }
    if (node.type === "SUBTABLE") return `テーブル「${fieldName(String(node.code ?? ""), fieldLabels)}」`;
    return typeof node.code === "string" && node.code ? `フィールド「${fieldName(node.code, fieldLabels)}」` : "配置の要素";
  }
  function reclassifyLayoutRemovals(changes, beforeLayout, afterLayout, fieldLabels) {
    const kept = inventoryLayout(afterLayout), old = inventoryLayout(beforeLayout);
    for (const change of changes) {
      if (change.kind !== "削除" || !/^配置 \/ \d+件目$/.test(change.path)) continue;
      let node;
      try {
        node = JSON.parse(change.before);
      } catch {
        continue;
      }
      if (!isObj(node)) continue;
      const inside = inventoryLayout(node);
      const lostCode = [...inside.codes].some((code) => !kept.codes.has(code));
      const lostPlain = Object.keys(inside.plain).some((type) => (kept.plain[type] || 0) < (old.plain[type] || 0));
      const description = describeLayoutNode(node, fieldLabels);
      if (lostCode || lostPlain) change.summary = description;
      else {
        change.kind = "変更";
        change.after = "別の位置の行・グループに含まれます（フィールドは残ります）";
        change.summary = `${description}を並べ替え・移動`;
      }
    }
  }
  function retainedItemNames(sectionKey, changes, fieldLabels) {
    const names = [];
    for (const change of changes) {
      if (change.kind !== "保持") continue;
      const separator = change.path.indexOf(" / ");
      const rest = separator < 0 ? change.path : change.path.slice(separator + 3);
      if (sectionKey === "fieldSettings") {
        const parts = rest.split(" / ");
        names.push(parts.length >= 2 ? `${labelOnly(parts[0], void 0, fieldLabels)} / ${fieldName(parts[1], fieldLabels)}` : fieldName(rest, fieldLabels));
      } else if (sectionKey === "layoutSettings") names.push(fieldName(rest, fieldLabels));
      else names.push(rest);
    }
    return names;
  }
  function reflectFieldLabels(...bundles) {
    const labels2 = /* @__PURE__ */ Object.create(null);
    const collect = (properties) => {
      if (!isObj(properties)) return;
      for (const [code, definition] of Object.entries(properties)) {
        if (!isObj(definition)) continue;
        if (typeof definition.label === "string" && definition.label) labels2[code] = definition.label;
        if (definition.type === "SUBTABLE") collect(definition.fields);
      }
    };
    for (const bundle of bundles) collect(bundle?.sections?.fieldSettings?.properties);
    return labels2;
  }

  // src/reflect/standalonePlan.ts
  init_constants();
  init_utils();
  init_runControl();
  var formatBytes = (bytes) => bytes >= 1048576 ? `${(bytes / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.ceil(bytes / 1024))} KB`;
  var namedSections = { viewSettings: "views", reportSettings: "reports", actionSettings: "actions" };
  var own2 = (object2, key) => Object.prototype.hasOwnProperty.call(object2, key);
  var object = (value) => !!value && typeof value === "object" && !Array.isArray(value);
  var equal = (a, b) => stableReflectStringify(a) === stableReflectStringify(b);
  var valueText = (value) => value === void 0 ? "（なし）" : typeof value === "string" ? value : JSON.stringify(value);
  var labels = { properties: "フィールド", layout: "配置", views: "一覧", reports: "グラフ", actions: "アクション", rights: "アクセス権", notifications: "通知", categories: "カテゴリー", label: "表示名", required: "必須", unique: "重複禁止", options: "選択肢", defaultValue: "初期値", type: "種類", index: "表示順", filterCond: "絞り込み", sort: "並び順", enable: "有効", states: "状態", scope: "適用範囲", fields: "フィールド", desktop: "PC", mobile: "モバイル" };
  var nameKeyedContainers = /* @__PURE__ */ new Set(["properties", "fields", "views", "reports", "actions", "states", "categories", "options"]);
  function diffValues(before, after, path, output, keysAreNames = false) {
    if (equal(before, after)) return;
    if (object(before) && object(after)) {
      for (const key of /* @__PURE__ */ new Set([...Object.keys(before), ...Object.keys(after)])) diffValues(own2(before, key) ? before[key] : void 0, own2(after, key) ? after[key] : void 0, [...path, !keysAreNames && own2(labels, key) ? labels[key] : key], output, !keysAreNames && nameKeyedContainers.has(key));
    } else if (Array.isArray(before) && Array.isArray(after)) {
      const queues = /* @__PURE__ */ new Map(), taken = /* @__PURE__ */ new Set();
      after.forEach((value, index) => {
        const key = stableReflectStringify(value);
        const queue = queues.get(key);
        if (queue) queue.push(index);
        else queues.set(key, [index]);
      });
      const beforeKeys = before.map((value) => stableReflectStringify(value));
      for (const [index, value] of before.entries()) {
        const found = queues.get(beforeKeys[index])?.shift();
        if (found !== void 0) taken.add(found);
        else output.push({ kind: "削除", path: [...path, `${index + 1}件目`].join(" / "), before: valueText(value), after: "（なし）" });
      }
      const remaining = after.filter((_value, index) => !taken.has(index));
      for (const value of remaining) output.push({ kind: "追加", path: path.join(" / "), before: "（なし）", after: valueText(value) });
      if (!remaining.length && before.length === after.length && beforeKeys.every((key) => queues.has(key))) {
        output.push({ kind: "変更", path: path.join(" / ") + " / 順序", before: valueText(before), after: valueText(after) });
      }
    } else output.push({ kind: before === void 0 ? "追加" : after === void 0 ? "削除" : "変更", path: path.join(" / "), before: valueText(before), after: valueText(after) });
  }
  function fieldDefinitions(section) {
    const properties = section?.properties;
    if (!object(properties)) throw new Error("フィールド設定の properties を取得できません。");
    return properties;
  }
  function mergeFields(source, target, lookupMap, path, plan) {
    const after = Object.assign(/* @__PURE__ */ Object.create(null), deepClone(target));
    for (const [code, def] of Object.entries(source)) {
      if (!object(def) || !def.type) {
        plan.blockers.push(`${[...path, code].join(" / ")}: フィールドの種類がありません。`);
        continue;
      }
      if (SYSTEM_FIELD_TYPES.has(def.type)) continue;
      const current = own2(target, code) ? target[code] : void 0;
      if (current && current.type !== def.type) {
        plan.blockers.push(`${[...path, code].join(" / ")}: 種類が異なります（${current.type} → ${def.type}）。既存項目の種類はこの反映では変更できません。`);
        continue;
      }
      const next = { code, ...deepClone(current || {}), ...deepClone(def) };
      if (!current && next.label === void 0) next.label = code;
      if (next.code && next.code !== code) plan.blockers.push(`${code}: フィールドコードの変更を含みます。フィールド追加ツールで確認してください。`);
      for (const holder of ["lookup", "referenceTable"]) {
        const mapped = next[holder]?.relatedApp?.app && lookupMap[String(next[holder].relatedApp.app)];
        if (!mapped) continue;
        const currentRelated = current?.[holder]?.relatedApp;
        if (object(currentRelated) && String(currentRelated.app) === String(mapped)) next[holder].relatedApp = deepClone(currentRelated);
        else {
          next[holder].relatedApp.app = mapped;
          delete next[holder].relatedApp.code;
        }
      }
      for (const holder of ["lookup", "referenceTable"]) {
        if (current && object(current[holder]) && !own2(def, holder)) plan.warnings.push(`${[...path, code].join(" / ")}: 反映先では${holder === "lookup" ? "ルックアップ" : "関連レコード一覧"}の設定がありますが、反映元にはありません。この反映では設定を外さず、反映先の設定を残します。`);
      }
      if (def.type === "SUBTABLE") {
        if (!object(def.fields)) throw new Error(`${code}: テーブル内のフィールド定義がありません。`);
        next.fields = mergeFields(def.fields, current?.fields || {}, lookupMap, [...path, code], plan);
      }
      after[code] = next;
    }
    for (const [code, def] of Object.entries(target)) if (!own2(source, code) && !SYSTEM_FIELD_TYPES.has(def?.type)) {
      plan.changes.push({ kind: "保持", path: [...path, code].join(" / "), before: valueText(def), after: "反映先の設定を保持" });
    }
    return after;
  }
  function namedPayload(section, property) {
    if (!object(section?.[property])) throw new Error(`${property} の設定を取得できません。`);
    return Object.fromEntries(Object.entries(section[property]).map(([key, raw]) => {
      if (!object(raw)) throw new Error(`${key}: 設定の形式が不正です。`);
      const value = deepClone(raw);
      delete value.id;
      return [key, value];
    }));
  }
  function mergeLayout(source, target, plan) {
    const result = deepClone(source), locations = /* @__PURE__ */ new Map();
    const collect = (nodes) => {
      for (const node of nodes) {
        if (!object(node)) throw new Error("レイアウトに不正な項目があります。");
        if (node.code) {
          if (locations.has(node.code)) throw new Error(`配置が重複しています: ${node.code}`);
          locations.set(node.code, node);
        }
        if (Array.isArray(node.fields)) collect(node.fields);
        if (Array.isArray(node.layout)) collect(node.layout);
      }
    };
    collect(result);
    const retain = (field) => {
      if (!field.code || locations.has(field.code)) return false;
      locations.set(field.code, field);
      plan.changes.push({ kind: "保持", path: `配置 / ${field.code}`, before: valueText(field), after: "既存の配置を末尾に保持" });
      return true;
    };
    const appendMissing = (nodes, destination) => {
      for (const node of deepClone(nodes)) {
        if (node.type === "ROW") {
          node.fields = (node.fields || []).filter(retain);
          if (node.fields.length) destination.push(node);
        } else if (node.type === "GROUP") {
          const existing = locations.get(node.code);
          if (existing) appendMissing(node.layout || [], existing.layout || (existing.layout = []));
          else {
            retain(node);
            const children = node.layout || [];
            node.layout = [];
            appendMissing(children, node.layout);
            destination.push(node);
          }
        } else if (node.type === "SUBTABLE") {
          const existing = locations.get(node.code);
          const fields = (node.fields || []).filter(retain);
          if (existing) existing.fields.push(...fields);
          else {
            retain(node);
            node.fields = fields;
            destination.push(node);
          }
        }
      }
    };
    appendMissing(target, result);
    return result;
  }
  function reflectInspectionScopes(scopes) {
    return [.../* @__PURE__ */ new Set([...scopes, ...scopes.some((key) => ["layoutSettings", "viewSettings", "reportSettings", "actionSettings", "appSettings"].includes(key)) ? ["fieldSettings"] : []])];
  }
  function reflectSelectionBlockers(entries, scopes, sourceFields, targetFields, sourceSystemFields = []) {
    const selected = entries.filter((entry) => scopes.includes(entry.sectionKey));
    const available = /* @__PURE__ */ new Set([...targetFields, ...scopes.includes("fieldSettings") && !selected.find((entry) => entry.sectionKey === "fieldSettings")?.blockers.length ? sourceFields : []]);
    const system = new Set(sourceSystemFields);
    const issues = selected.flatMap((entry) => entry.blockers.map((message) => `${entry.label}: ${message}`));
    for (const entry of selected) for (const code of entry.requiredFields || []) {
      if (available.has(code)) continue;
      if (system.has(code)) issues.push(`${entry.label}: 参照するフィールド「${code}」は反映元のシステムフィールド（レコード番号・ステータス・カテゴリーなど）ですが、反映先に同じコードがありません。反映先でフィールドコードを合わせる、またはプロセス管理・カテゴリーを有効にしてから再取得するか、この項目を除外してください。`);
      else issues.push(`${entry.label}: 参照するフィールド「${code}」が反映先にありません。フィールド設定も反映対象に含めるか、この項目を除外してください。`);
    }
    return [...new Set(issues)];
  }
  var settingValue = (value) => typeof value === "number" ? String(value) : Array.isArray(value) ? value.map(settingValue) : object(value) ? Object.fromEntries(Object.entries(value).map(([name, item]) => [name, settingValue(item)])) : value;
  function buildAppSettingsPlan(plan, source, target, options) {
    try {
      if (own2(source, "titleField") && !object(source.titleField)) throw new Error("レコードのタイトルの設定形式が不正です。");
      plan.behavior = "動作・表示の設定を更新（アプリ名・説明・アイコンは対象外）";
      const pick = (section) => Object.fromEntries(APP_SETTINGS_REFLECT_KEYS.filter((name) => own2(source, name) && own2(section, name)).map((name) => [name, name === "titleField" && object(section[name]) && section[name].selectionMode === "AUTO" ? { selectionMode: "AUTO" } : settingValue(section[name])]));
      const before = pick(target), after = pick(source);
      if (!Object.keys(after).length) throw new Error("反映元に比較できる一般設定がありません（古い設定JSONの可能性があります）。");
      if (after.titleField?.selectionMode === "MANUAL") {
        if (typeof after.titleField.code !== "string" || !after.titleField.code) throw new Error("レコードのタイトルに使うフィールドが指定されていません。");
        plan.requiredFields = [after.titleField.code];
      }
      diffValues(before, after, [], plan.changes);
      for (const change of plan.changes) if (change.kind === "削除") change.kind = "変更";
      try {
        plan.items = summarizeReflectItems("appSettings", before, after, { fieldLabels: options.fieldLabels });
      } catch {
        plan.items = [];
      }
      for (const change of plan.changes) {
        const [head, ...rest] = change.path.split(" / ");
        change.path = [APP_SETTINGS_LABELS[head] || head, ...rest].join(" / ");
      }
      plan.changeCount = plan.changes.filter((change) => change.kind !== "保持").length;
      plan.removalCount = plan.changes.filter((change) => change.kind === "削除").length;
      if (plan.changeCount) plan.operations.push({ method: "PUT", endpoint: SECTION_DEFS.find((item) => item.key === "appSettings")?.endpoint || "/app/settings.json", body: after, label: plan.label });
      plan.status = plan.operations.length ? "change" : "same";
      plan.message = plan.operations.length ? `変更 ${plan.changeCount}件 / 削除 ${plan.removalCount}件 / ${plan.behavior}` : "書き込み不要（一致）";
    } catch (error) {
      if (isRunCancelledError(error)) throw error;
      plan.status = "error";
      plan.blockers.push(error.message || String(error));
      plan.message = plan.blockers.join("\n");
    }
    return plan;
  }
  function buildReflectSectionPlan(key, source, target, options = {}) {
    const def = SECTION_DEFS.find((item) => item.key === key);
    const plan = { sectionKey: key, label: reflectSectionLabel(key), status: "same", message: "", behavior: "全置換", changes: [], changeCount: 0, removalCount: 0, warnings: [], blockers: [], operations: [] };
    const fail = (side, section) => {
      plan.status = side === "src" ? "src-missing" : "tgt-missing";
      const partial = section?._partial?.kind === "customizeBody" ? "JS/CSSファイルの本文が一部取得できていない設定JSONです。設定取得をやり直すか、アプリから取得してください" : section?._partial?.message;
      plan.message = `${side === "src" ? "反映元" : "反映先"}を完全に取得できません: ${section?._fetchError || partial || "設定がありません"}`;
      plan.blockers.push(plan.message);
      return plan;
    };
    if (!isCompleteReflectSection(source)) return fail("src", source);
    if (!isCompleteReflectSection(target)) return fail("tgt", target);
    if (key === "appSettings") return buildAppSettingsPlan(plan, source, target, options);
    if (!def?.put || !def.putBuilder) {
      plan.status = "error";
      plan.blockers.push("この項目は反映に対応していません。");
      return plan;
    }
    try {
      let before, after, comparable2;
      const uploads = [];
      if (key === "fieldSettings") {
        plan.behavior = "追加・更新（反映先だけの項目は保持）";
        const sourceProps = fieldDefinitions(source), targetProps = fieldDefinitions(target);
        const positions = (props) => {
          const map = /* @__PURE__ */ new Map();
          const add = (code, parent) => {
            if (map.has(code)) throw new Error(`フィールドコードが重複しています: ${code}`);
            map.set(code, parent);
          };
          for (const [code, field] of Object.entries(props)) {
            add(code, "フォーム");
            if (field?.type === "SUBTABLE") for (const child of Object.keys(field.fields || {})) add(child, code);
          }
          return map;
        };
        const sourcePositions = positions(sourceProps), targetPositions = positions(targetProps);
        for (const [code, parent] of sourcePositions) if (targetPositions.has(code) && parent !== targetPositions.get(code)) plan.blockers.push(`${code}: フォームとテーブル間、またはテーブル間の移動には対応していません。`);
        const merged = mergeFields(sourceProps, targetProps, options.lookupMap || {}, ["フィールド"], plan);
        const adds = /* @__PURE__ */ Object.create(null), updates = /* @__PURE__ */ Object.create(null);
        for (const [code, value] of Object.entries(merged)) {
          if (!own2(sourceProps, code) || SYSTEM_FIELD_TYPES.has(value?.type)) continue;
          if (!own2(targetProps, code)) adds[code] = value;
          else if (value.type === "SUBTABLE") {
            const current = targetProps[code], addedFields = Object.fromEntries(Object.entries(value.fields).filter(([child]) => !own2(current.fields || {}, child)));
            if (Object.keys(addedFields).length) adds[code] = { type: "SUBTABLE", code, fields: addedFields };
            const updatedFields = Object.fromEntries(Object.entries(value.fields).filter(([child, childDef]) => own2(current.fields || {}, child) && !equal(childDef, current.fields[child])));
            const { fields: _nextFields, ...nextTable } = value, { fields: _currentFields, ...currentTable } = current;
            if (Object.keys(updatedFields).length || !equal(nextTable, currentTable)) updates[code] = { ...nextTable, fields: updatedFields };
          } else if (!equal(value, targetProps[code])) updates[code] = value;
        }
        const fieldCounts = { add: Object.keys(adds).length, update: Object.keys(updates).length, tgtOnly: Object.keys(targetProps).filter((code) => !own2(sourceProps, code) && !SYSTEM_FIELD_TYPES.has(targetProps[code]?.type)).length };
        plan.fieldStats = fieldCounts;
        if (fieldCounts.add) plan.operations.push({ method: "POST", endpoint: def.endpoint, body: { properties: adds }, label: "フィールド追加" });
        if (fieldCounts.update) plan.operations.push({ method: "PUT", endpoint: def.endpoint, body: { properties: updates }, label: "フィールド更新" });
        before = { properties: targetProps };
        after = { properties: merged };
      } else if (namedSections[key]) {
        const property = namedSections[key];
        const from = namedPayload(source, property), to = namedPayload(target, property);
        if (key === "actionSettings") {
          for (const unmapped of findUnmappedActionDestApps(from, options.lookupMap, to)) {
            plan.warnings.push(`アクション「${unmapped.actionName}」のコピー先アプリID (${unmapped.destAppId}) が参照先変換に未指定のため、そのままのIDで反映します。`);
          }
        }
        for (const name of Object.keys(from)) {
          if (own2(to, name) && (!from[name].type || !to[name].type || from[name].type === to[name].type)) from[name] = { ...to[name], ...from[name] };
          if (key === "actionSettings" && from[name]?.destApp?.app != null) {
            const mappedApp = options.lookupMap?.[String(from[name].destApp.app)];
            if (mappedApp) {
              const currentDest = to[name]?.destApp;
              if (object(currentDest) && String(currentDest.app) === String(mappedApp)) from[name].destApp = { ...currentDest };
              else {
                from[name].destApp = { ...from[name].destApp, app: mappedApp };
                delete from[name].destApp.code;
              }
            }
          }
        }
        const preserve = options.preserveTargetOnly !== false;
        const combined = preserve ? { ...to, ...from } : from;
        const ordered = [...Object.keys(from).sort((a, b) => Number(from[a].index || 0) - Number(from[b].index || 0)), ...preserve ? Object.keys(to).filter((name) => !own2(from, name)).sort((a, b) => Number(to[a].index || 0) - Number(to[b].index || 0)) : []];
        for (const [index, name] of ordered.entries()) combined[name] = { ...combined[name], index: String(index) };
        if (key === "viewSettings") for (const [name, view] of Object.entries(combined)) {
          if (!["LIST", "CALENDAR", "CUSTOM"].includes(view.type)) throw new Error(`${name}: 一覧の種類を取得できません。`);
          if (view.type === "LIST" && (!Array.isArray(view.fields) || view.fields.some((code) => typeof code !== "string"))) throw new Error(`${name}: 一覧のフィールド定義が不完全です。`);
          if (view.type === "CUSTOM" && typeof view.html !== "string") throw new Error(`${name}: カスタマイズ一覧のHTMLを取得できません。`);
        }
        for (const item of Object.values(to)) if (item.index !== void 0) item.index = String(item.index);
        before = { [property]: to };
        after = { [property]: combined };
        plan.behavior = preserve ? "追加・更新（反映先だけの設定は保持）" : "全置換（反映元にない設定を削除）";
        if (preserve) for (const name of Object.keys(to).filter((name2) => !own2(from, name2))) plan.changes.push({ kind: "保持", path: `${labels[property]} / ${name}`, before: valueText(to[name]), after: "内容を保持（表示順は反映元の後）" });
        if (key === "viewSettings") plan.requiredFields = [...new Set(Object.values(combined).flatMap((view) => view.type === "LIST" ? view.fields || [] : view.type === "CALENDAR" ? [view.date, view.title].filter(Boolean) : []).filter((code) => !["$id", "$revision"].includes(code)))];
        if (key === "actionSettings") plan.requiredFields = extractActionRequiredFields(combined);
        if (key === "reportSettings") plan.requiredFields = extractReportRequiredFields(combined);
      } else if (key === "pluginSettings") {
        if (!Array.isArray(source.plugins) || !Array.isArray(target.plugins)) throw new Error("プラグイン一覧の形式が不正です。");
        const existing = new Set(target.plugins.map((item) => item.id));
        const additions = source.plugins.filter((item) => !existing.has(item.id));
        if (additions.some((item) => typeof item.id !== "string" || !item.id)) throw new Error("プラグインIDがありません。");
        plan.behavior = "未追加のプラグインを追加（設定値は対象外）";
        plan.warnings.push("プラグイン本体はkintoneシステム管理に導入済みである必要があります。プラグイン固有の設定はコピーしません。");
        before = { plugins: target.plugins.map((item) => item.id) };
        after = { plugins: [...before.plugins, ...additions.map((item) => item.id)] };
        if (additions.length) plan.operations.push({ method: "POST", endpoint: def.endpoint, body: { ids: additions.map((item) => item.id) }, label: "プラグイン追加" });
      } else {
        for (const section of [source, target]) {
          const arrayKey = ["appAcl", "fieldAcl", "recordPermissions"].includes(key) ? "rights" : ["notifications", "perRecordNotifications", "reminderNotifications"].includes(key) ? "notifications" : "";
          if (arrayKey && !Array.isArray(section[arrayKey])) throw new Error(`${arrayKey} の設定がありません。空の設定で上書きしないため、反映を停止します。`);
          if (key === "reminderNotifications" && (typeof section.timezone !== "string" || !section.timezone)) throw new Error("リマインダー通知のタイムゾーンを取得できません。");
          if (key === "categories" && (typeof section.enabled !== "boolean" || !object(section.categories))) throw new Error("カテゴリーの enabled / categories を取得できません。");
          if (key === "processSettings" && (typeof section.enable !== "boolean" || section.enable && (!object(section.states) || !Array.isArray(section.actions)))) throw new Error("プロセス管理の enable / states / actions を取得できません。");
          if (key === "customizeSettings") {
            if (!["ALL", "ADMIN", "NONE"].includes(section.scope)) throw new Error("JS/CSSの適用範囲を取得できません。");
            for (const platform of ["desktop", "mobile"]) for (const kind of ["js", "css"]) {
              const list2 = section[platform]?.[kind];
              if (!Array.isArray(list2) || list2.some((item) => !item || (item.type === "URL" ? typeof item.url !== "string" || !item.url : item.type === "FILE" ? typeof item.file?.fileKey !== "string" || !item.file.fileKey : true))) throw new Error(`${platform}/${kind}: JS/CSS一覧が不完全です。`);
            }
          }
        }
        before = def.putBuilder(target);
        after = def.putBuilder(source);
        if (key === "categories") {
          before.enabled = target.enabled;
          after.enabled = source.enabled;
        }
        if (key === "notifications") {
          if (typeof target.notifyToCommenter === "boolean") before.notifyToCommenter = after.notifyToCommenter = target.notifyToCommenter;
          if (typeof source.notifyToCommenter === "boolean") after.notifyToCommenter = source.notifyToCommenter;
        }
        if (key === "customizeSettings") {
          if (source.scope !== void 0) after.scope = source.scope;
          if (target.scope !== void 0) before.scope = target.scope;
          const resolution = options.customizeFiles, names = customizeFileNames(source, target);
          comparable2 = (value) => comparableCustomizePayload(value, resolution, names);
          const currentKeys = new Set(["desktop", "mobile"].flatMap((platform) => ["js", "css"].flatMap((kind) => (target[platform]?.[kind] || []).map((item) => item.file?.fileKey).filter(Boolean))));
          for (const platform of ["desktop", "mobile"]) for (const kind of ["js", "css"]) for (const [index, item] of after[platform][kind].entries()) {
            if (item.type !== "FILE") continue;
            const fileKey = item.file.fileKey, name = names[fileKey] || "", state3 = resolution?.files[customizeSlotKey(platform, kind, fileKey)];
            const shown = name || "アップロードファイル";
            if (state3?.status === "reuse") item.file.fileKey = state3.targetFileKey;
            else if (state3?.status === "upload") {
              if (!name) plan.blockers.push(`${platform}/${kind}: 反映元のファイル（${fileKey}）にファイル名がありません。反映元のJS/CSS設定を確認してください。`);
              else uploads.push({ platform, kind, index, sourceFileKey: fileKey, name, byteSize: state3.byteSize });
            } else if (state3?.status === "unavailable") plan.blockers.push(`${platform}/${kind}: 「${shown}」を反映元から取得できません（${state3.reason}）。反映元でファイルを確認してください。`);
            else if (!state3 && !currentKeys.has(fileKey)) plan.blockers.push(`${platform}/${kind}: 「${shown}」は反映先に存在せず、反映元のファイル本体を確認できません。`);
          }
          if (uploads.length) plan.warnings.push(`${uploads.length} 件のファイル（合計 ${formatBytes(uploads.reduce((sum, upload) => sum + upload.byteSize, 0))}）を反映先へアップロードしてから設定します。`);
          if (uploads.length && resolution?.targetUnavailable.length) plan.warnings.push(`反映先の ${resolution.targetUnavailable.map((item) => `「${item.name}」（${item.reason}）`).join("、")} の本体を確認できなかったため、同じ内容のファイルがあっても再利用せずアップロードします。`);
        }
        if (key === "fieldAcl") plan.requiredFields = [...new Set((after.rights || []).map((right) => String(right?.code || "")).filter((code) => code && !["$id", "$revision"].includes(code)))];
        if (key === "reminderNotifications") plan.requiredFields = [...new Set((after.notifications || []).map((item) => String(item?.timing?.code || "")).filter((code) => !!code))];
        if (key === "processSettings" && object(after.states)) plan.requiredFields = [...new Set(Object.values(after.states).flatMap((state3) => (state3?.assignee?.entities || []).filter((item) => item?.entity?.type === "FIELD_ENTITY").map((item) => String(item.entity.code || ""))).filter((code) => !!code))];
        if (key === "layoutSettings") {
          if (!Array.isArray(source.layout) || !Array.isArray(target.layout)) throw new Error("レイアウトの形式が不正です。");
          after.layout = mergeLayout(source.layout, target.layout, plan);
          plan.behavior = "配置を更新（反映先だけのフィールド配置は保持）";
          const codes = [];
          const walk = (nodes) => {
            for (const node of nodes) {
              if (node.code) codes.push(String(node.code));
              if (Array.isArray(node.fields)) walk(node.fields);
              if (Array.isArray(node.layout)) walk(node.layout);
            }
          };
          walk(after.layout);
          plan.requiredFields = [...new Set(codes)];
        }
      }
      const shownBefore = comparable2 ? comparable2(before) : before, shownAfter = comparable2 ? comparable2(after) : after;
      diffValues(shownBefore, shownAfter, [], plan.changes);
      if (key === "layoutSettings") reclassifyLayoutRemovals(plan.changes, shownBefore?.layout, shownAfter?.layout, options.fieldLabels);
      try {
        plan.items = summarizeReflectItems(key, shownBefore, shownAfter, { fieldLabels: options.fieldLabels, retained: retainedItemNames(key, plan.changes, options.fieldLabels) });
      } catch {
        plan.items = [];
      }
      plan.changeCount = plan.changes.filter((change) => change.kind !== "保持").length;
      plan.removalCount = plan.changes.filter((change) => change.kind === "削除").length;
      if (key !== "fieldSettings" && key !== "pluginSettings" && plan.changeCount) plan.operations.push({ method: "PUT", endpoint: def.endpoint, body: after, label: def.label, ...uploads.length ? { uploads } : {} });
      if (uploads.length && plan.changeCount) plan.fileUploads = uploads;
      if (plan.blockers.length) plan.status = "error";
      else plan.status = plan.operations.length ? "change" : "same";
      plan.message = plan.blockers.length ? plan.blockers.join("\n") : plan.operations.length ? `変更 ${plan.changeCount}件 / 削除 ${plan.removalCount}件 / ${plan.behavior}` : `書き込み不要${plan.changes.some((change) => change.kind === "保持") ? "（反映先だけの設定は保持）" : "（一致）"}`;
    } catch (error) {
      if (isRunCancelledError(error)) throw error;
      plan.status = "error";
      plan.blockers.push(error.message || String(error));
      plan.message = plan.blockers.join("\n");
    }
    return plan;
  }
  function listReflectSystemFieldCodes(bundle) {
    const props = bundle?.sections?.fieldSettings?.properties;
    if (!object(props)) return [];
    return Object.entries(props).filter(([, def]) => SYSTEM_FIELD_TYPES.has(def?.type)).map(([code]) => code);
  }
  function listReflectFieldCodes(bundle, writableOnly = false) {
    const props = bundle?.sections?.fieldSettings?.properties;
    if (!object(props)) return [];
    return Object.entries(props).filter(([, def]) => !writableOnly || !SYSTEM_FIELD_TYPES.has(def?.type)).flatMap(([code, def]) => [code, ...Object.keys(def?.type === "SUBTABLE" ? def.fields || {} : {})]);
  }

  // src/settingsBundleImport.ts
  init_api();
  function preserveImportedMetadata(bundle, raw, preserve) {
    if (!preserve || !bundle || !raw || typeof raw !== "object") return bundle;
    bundle.fetchedAt = Object.prototype.hasOwnProperty.call(raw, "fetchedAt") ? raw.fetchedAt : null;
    if (Object.prototype.hasOwnProperty.call(raw, "guestId")) bundle.guestId = raw.guestId;
    else delete bundle.guestId;
    if (Object.prototype.hasOwnProperty.call(raw, "preview")) bundle.preview = raw.preview;
    else delete bundle.preview;
    if (raw.meta && typeof raw.meta === "object" && !Array.isArray(raw.meta)) {
      bundle.meta = {
        ...raw.meta,
        sectionRevisions: bundle.meta?.sectionRevisions || {}
      };
    }
    return bundle;
  }
  function limitImportedBundleToSections(bundle, sections, raw, preserveMetadata = false) {
    if (!Array.isArray(sections) || !sections.length) return preserveImportedMetadata(bundle, raw, preserveMetadata);
    const sourceSections = bundle?.sections || {};
    const picked = pickBundleSections(bundle, sections);
    sections.forEach((sectionKey) => {
      if (Object.prototype.hasOwnProperty.call(sourceSections, sectionKey)) return;
      picked.sections[sectionKey] = {
        _fetchError: "読み込んだ設定JSONに比較対象セクションが含まれていません"
      };
    });
    return preserveImportedMetadata(picked, raw, preserveMetadata);
  }
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
        return { bundle: ensureBundleShape(item, options.rawSettings), raw: item };
      } catch {
        return null;
      }
    }).filter(Boolean);
    if (!candidates.length) throw new Error("設定JSON内にアプリ設定バンドルが見つかりません");
    if (appId) {
      const matched = candidates.find((entry) => String(entry?.bundle?.appId || "") === appId) || (candidates.length === 1 && !String(candidates[0]?.bundle?.appId || "") ? candidates[0] : void 0);
      if (matched) return limitImportedBundleToSections(matched.bundle, options.sections, matched.raw, !!options.preserveMetadata);
      throw new Error(`設定JSON内に App ${appId} のバンドルが見つかりません`);
    }
    return limitImportedBundleToSections(candidates[0].bundle, options.sections, candidates[0].raw, !!options.preserveMetadata);
  }
  function pickAllSettingsBundles(raw, side, rawSettings = false, preserveMetadata = false) {
    const candidates = unwrapBundleCandidates(raw, side).map((item) => {
      try {
        return preserveImportedMetadata(ensureBundleShape(item, rawSettings), item, preserveMetadata);
      } catch {
        return null;
      }
    }).filter(Boolean);
    if (!candidates.length) throw new Error("設定JSON内にアプリ設定バンドルが見つかりません");
    return candidates;
  }

  // src/reflect/targetPending.ts
  init_api();
  init_runControl();
  function reconcileOwnPendingChanges(pending, lastRun, target) {
    if (!pending || pending.state !== "pending" || !lastRun) return pending;
    if (lastRun.targetAppId !== target.appId || (lastRun.targetGuestId || "") !== (target.guestId || "")) return pending;
    if (!/^\d+$/.test(lastRun.finalRevision) || lastRun.finalRevision !== pending.previewRevision) return pending;
    if (lastRun.priorState !== "clean" && lastRun.priorState !== "own") return pending;
    return { ...pending, state: "own", message: `反映先プレビューの未公開の変更は、このツールの直前の反映によるものだけです（設定の更新番号 revision は 本番 ${pending.productionRevision} / プレビュー ${pending.previewRevision}）。アプリの設定画面の「変更を中止」で取り消せます。` };
  }
  var comparableResources = (list2) => Array.isArray(list2) ? list2.map((item) => item?.type === "FILE" ? { type: "FILE", name: item.file?.name ?? "", size: String(item.file?.size ?? "") } : item) : list2;
  var comparable = (key, section) => {
    if (!section || typeof section !== "object" || Array.isArray(section)) return stableReflectStringify(section);
    const { revision: _revision, ...rest } = section;
    if (key === "customizeSettings") {
      for (const platform of ["desktop", "mobile"]) if (rest[platform] && typeof rest[platform] === "object") rest[platform] = { ...rest[platform], js: comparableResources(rest[platform].js), css: comparableResources(rest[platform].css) };
    }
    return stableReflectStringify(rest);
  };
  async function inspectTargetPendingChanges(opts, targetPreviewBundle) {
    const unknown = (productionRevision2, previewRevision2, reason) => ({ state: "unknown", productionRevision: productionRevision2, previewRevision: previewRevision2, sectionKeys: [], message: `反映先プレビューに未公開の変更があるか確認できませんでした（${reason}）。` });
    let productionRevision = "", previewRevision = "";
    try {
      const incomplete = opts.scopes.find((key) => !isCompleteReflectSection(targetPreviewBundle?.sections?.[key]));
      if (incomplete) return unknown("", "", `反映先プレビューの${reflectSectionLabel(incomplete)}を取得できません`);
      const revisions = new Set(opts.scopes.map((key) => String(targetPreviewBundle?.meta?.sectionRevisions?.[key] ?? targetPreviewBundle?.sections?.[key]?.revision ?? "")));
      if (revisions.size !== 1) return unknown("", "", "取得中に反映先プレビューが更新された可能性があります");
      previewRevision = [...revisions][0];
      if (!/^\d+$/.test(previewRevision)) return unknown("", "", "反映先プレビューのrevisionがありません");
      const response = await apiGet(buildApiPrefix(opts.targetGuestId || "", false), "/app/settings.json", { app: opts.targetAppId });
      productionRevision = String(response?.revision ?? "");
      if (!/^\d+$/.test(productionRevision)) return unknown("", previewRevision, "本番のrevisionがありません");
      if (productionRevision === previewRevision) return { state: "clean", productionRevision, previewRevision, sectionKeys: [], message: "反映先プレビューに未公開の変更はありません。" };
      const production = await fetchBundle({ appId: opts.targetAppId, guestId: opts.targetGuestId || "", preview: false, sections: opts.scopes, rawSettings: true });
      const sectionKeys = [];
      for (const key of opts.scopes) {
        const before = production.sections?.[key], after = targetPreviewBundle?.sections?.[key];
        if (!isCompleteReflectSection(before) || !isCompleteReflectSection(after)) return unknown(productionRevision, previewRevision, `${reflectSectionLabel(key)}を取得できません`);
        if (comparable(key, before) !== comparable(key, after)) sectionKeys.push(key);
      }
      const customizeNote = opts.scopes.includes("customizeSettings") ? "。JS/CSSのファイルは名前とサイズだけで比べています" : "";
      const message = sectionKeys.length ? `反映先プレビューには未公開の変更があります（${sectionKeys.map(reflectSectionLabel).join("、")}）。公開すると今回の反映と一緒に本番へ反映されます。` : `選択した項目には未公開の変更はありませんが、ほかの設定に未公開の変更がある可能性があります（設定の更新番号 revision が 本番 ${productionRevision} とプレビュー ${previewRevision} で異なります${customizeNote}）。`;
      return { state: "pending", productionRevision, previewRevision, sectionKeys, message };
    } catch (error) {
      if (isRunCancelledError(error)) throw error;
      return unknown(productionRevision, previewRevision, error?.message || String(error));
    }
  }

  // src/reflect/applyOutcome.ts
  var ERROR_HINT_RULES = [
    {
      pattern: /CB_NO02|権限がありません|Forbidden|アクセスが拒否/i,
      hint: "反映先アプリのアプリ管理権限があるユーザーで実行しているか確認してください。"
    },
    {
      pattern: /GAIA_AP01|アプリ.*(見つかりません|存在しません)|指定したアプリ/,
      hint: "反映先アプリID・ゲストスペースIDが正しいか確認してください。"
    },
    {
      pattern: /ルックアップ|lookup|relatedApp|関連レコード/i,
      hint: "参照先アプリが反映先環境に存在しない可能性があります。「Lookup AppID マッピング」で参照先を変換してください。"
    },
    {
      pattern: /フィールド.*(見つかりません|存在しません)|GAIA_IL26/,
      hint: "反映先に存在しないフィールドを参照しています。先に「フィールド設定」を反映してから、このセクションを再実行してください。"
    },
    {
      pattern: /プロセス管理|GAIA_RE/,
      hint: "プロセス管理の有効/無効や、作業者に指定したユーザー・組織が反映先環境に存在するか確認してください。"
    },
    {
      pattern: /Failed to fetch|NetworkError|ネットワーク|タイムアウト|timeout/i,
      hint: "通信エラーの可能性があります。時間をおいて「失敗・未実行だけ選択」から再実行してください。"
    }
  ];
  function buildReflectErrorHint(message) {
    const text = String(message || "");
    if (!text) return "";
    for (const rule of ERROR_HINT_RULES) {
      if (rule.pattern.test(text)) return rule.hint;
    }
    return "";
  }
  function pushReflectErrorLog(logs, line, errorMessage) {
    logs.push(line);
    const hint = buildReflectErrorHint(errorMessage);
    if (!hint) return;
    const hintLine = `   ヒント: ${hint}`;
    if (logs.slice(-3).includes(hintLine)) return;
    logs.push(hintLine);
  }
  function describeReflectFailure(message) {
    const lines = String(message || "").split("\n").filter((line) => !/^\s*\[API\]\s/.test(line));
    return lines.join("\n").trim().replace("（revision 競合）", "（ほかの更新と重なったため。revision 競合）");
  }
  function collectRetrySectionKeys(sections) {
    return (sections || []).filter((s) => s.status === "ng" || s.status === "pending").map((s) => s.sectionKey);
  }
  function summarizeApplyOutcome(sections) {
    const out = { ok: 0, ng: 0, stopped: 0, pending: 0, skip: 0 };
    for (const s of sections || []) {
      if (s.status === "ok") out.ok += 1;
      else if (s.status === "ng") out[s.stopped ? "stopped" : "ng"] += 1;
      else if (s.status === "pending") out.pending += 1;
      else out.skip += 1;
    }
    return out;
  }

  // src/tabs/reflect-standalone.ts
  init_runControl();
  function reflectResultMatchesOptions(report, options) {
    if (!report?.source || !report.target) return false;
    const sourceBundleAppId = String(options.sourceBundle?.appId || "");
    const sourceAppId = sourceBundleAppId || String(options.sourceAppId || "");
    const sourceEnvironment = options.sourceBundle ? "json" : options.sourcePreview ? "preview" : "production";
    const sortScopes = (values) => [...values || []].map(String).sort();
    const mapSignature = (map) => Object.entries(map || {}).map(([from, to]) => [String(from), String(to)]).sort(([a], [b]) => a.localeCompare(b)).map(([from, to]) => `${from}\0${to}`).join("");
    return String(report.source.appId || "") === sourceAppId && String(report.source.guestId || "") === String(options.sourceBundle ? "" : options.sourceGuestId || "") && String(report.source.environment || "") === sourceEnvironment && String(report.target.appId || "") === String(options.targetAppId || "") && String(report.target.guestId || "") === String(options.targetGuestId || "") && String(report.target.environment || "") === "preview" && report.preserveTargetOnly === (options.preserveTargetOnly !== false) && JSON.stringify(sortScopes(report.scopes)) === JSON.stringify(sortScopes(options.scopes)) && mapSignature(report.lookupMap) === mapSignature(options.lookupMap);
  }
  function reflectConnectionError(opts) {
    for (const [label, value, optional] of [
      ["反映元アプリID", opts.sourceAppId, !!opts.sourceBundle],
      ["反映先アプリID", opts.targetAppId, false],
      ["反映元ゲストスペースID", opts.sourceGuestId, true],
      ["反映先ゲストスペースID", opts.targetGuestId, true]
    ]) {
      if (optional && !value) continue;
      if (!/^[1-9]\d*$/.test(String(value || ""))) return `${label}には正の整数を入力してください。`;
    }
    if (!opts.sourceBundle && opts.sourcePreview && opts.sourceAppId === opts.targetAppId && (opts.sourceGuestId || "") === (opts.targetGuestId || "")) return "反映元と反映先が同じプレビューです。別のアプリ、または反映元の本番設定を選んでください。";
    return "";
  }
  async function resolveReflectAppsStandalone(opts) {
    const invalid = reflectConnectionError(opts);
    if (invalid) throw new Error(invalid);
    const resolve = async (role, appId, guestId = "") => {
      let info;
      try {
        info = await apiGet(buildApiPrefix(guestId, false), "/app.json", { id: appId });
      } catch (error) {
        if (isRunCancelledError(error)) throw error;
        const prefixed = new Error(`${role} #${appId}: ${error?.message != null ? String(error.message) : String(error)}`);
        prefixed.original = error;
        if (error?.code) prefixed.code = error.code;
        throw prefixed;
      }
      if (String(info?.appId) !== appId || typeof info?.name !== "string" || !info.name) throw new Error(`${role} #${appId} の名前とIDを確認できません。入力と閲覧権限を確認してください。`);
      return { appId, guestId, name: info.name, code: String(info.code || "") };
    };
    const target = await resolve("反映先", opts.targetAppId, opts.targetGuestId);
    const jsonAppName = opts.sourceBundle ? extractAppNameFromBundle(opts.sourceBundle) : "";
    const source = opts.sourceBundle ? { appId: opts.sourceAppId, guestId: "", name: jsonAppName ? `設定JSON（${jsonAppName}）` : "設定JSON", code: "" } : await resolve("反映元", opts.sourceAppId, opts.sourceGuestId);
    return { source, target };
  }
  function usesLookupMap(opts, scopes) {
    return Object.keys(opts.lookupMap || {}).length > 0 && scopes.some((key) => key === "fieldSettings" || key === "actionSettings");
  }
  function orderedScopes(scopes) {
    if (!scopes?.length) throw new Error("反映する項目を選択してください。");
    if (scopes.some((key) => !REFLECT_SECTION_KEYS.includes(key))) throw new Error("反映に対応していない項目が含まれています。");
    return REFLECT_SECTION_KEYS.filter((key) => scopes.includes(key));
  }
  async function withAppPrefix(role, appId, run) {
    try {
      return await run();
    } catch (error) {
      if (isRunCancelledError(error)) throw error;
      const prefixed = new Error(`${role} #${appId}: ${error?.message != null ? String(error.message) : String(error)}`);
      prefixed.original = error;
      if (error?.code) prefixed.code = error.code;
      throw prefixed;
    }
  }
  async function getReflectBundles(opts, scopes, setStatus) {
    setStatus(opts.sourceBundle ? "反映元の設定JSONを読み込み中..." : "反映元の設定を取得中...");
    const source = opts.sourceBundle ? importedReflectSource(opts) : await withAppPrefix("反映元", opts.sourceAppId, () => fetchBundle({
      rawSettings: true,
      // フィールド設定を選んでいなくても、参照するフィールドの有無と表示名を示せるよう反映先と同じ範囲を取得する。
      appId: opts.sourceAppId,
      guestId: opts.sourceGuestId || "",
      preview: !!opts.sourcePreview,
      sections: reflectInspectionScopes(scopes),
      onProgress: (p, label) => setStatus(`反映元取得 ${Math.round(p * 100)}% (${label})`)
    }));
    setStatus("反映先プレビューの設定を確認中...");
    const target = await withAppPrefix("反映先", opts.targetAppId, () => fetchBundle({
      rawSettings: true,
      appId: opts.targetAppId,
      guestId: opts.targetGuestId || "",
      preview: true,
      sections: reflectInspectionScopes(scopes),
      onProgress: (p, label) => setStatus(`反映先取得 ${Math.round(p * 100)}% (${label})`)
    }));
    return { source, target };
  }
  function importedReflectSource(opts) {
    const bundle = pickSettingsBundle(opts.sourceBundle, { side: "source", appId: String(opts.sourceAppId || "").trim(), rawSettings: true });
    const customize = bundle.sections?.customizeSettings;
    if (customize && typeof customize === "object" && customize._partial?.kind === "customizeBody" && !customize._fetchError) delete customize._partial;
    return bundle;
  }
  async function resolveReflectCustomizeFiles(opts, scopes, source, target, setStatus) {
    if (!scopes.includes("customizeSettings")) return void 0;
    const sourceSection = source.sections?.customizeSettings, targetSection = target.sections?.customizeSettings;
    if (!isCompleteReflectSection(sourceSection) || !isCompleteReflectSection(targetSection)) return void 0;
    setStatus("JS/CSSファイルを確認中…");
    const sourceGuestId = opts.sourceBundle ? String(opts.sourceBundle?.guestId || "") : opts.sourceGuestId || "";
    return resolveCustomizeFiles(sourceSection, targetSection, { sourceGuestId, targetGuestId: opts.targetGuestId || "" });
  }
  async function previewReflectStandalone(opts, setStatus) {
    const invalid = reflectConnectionError(opts);
    if (invalid) throw new Error(invalid);
    const scopes = orderedScopes(opts.scopes);
    const { source, target } = await getReflectBundles(opts, scopes, setStatus);
    setStatus("反映先の未公開の変更を確認中…");
    const targetPending = await inspectTargetPendingChanges({ targetAppId: opts.targetAppId, targetGuestId: opts.targetGuestId, scopes: reflectInspectionScopes(scopes) }, target);
    const customizeFiles = await resolveReflectCustomizeFiles(opts, scopes, source, target, setStatus);
    const fieldLabels = reflectFieldLabels(target, source);
    const entries = scopes.map((key) => buildReflectSectionPlan(key, source.sections?.[key], target.sections?.[key], { ...opts, customizeFiles, fieldLabels }));
    const baseline = captureReflectBaseline({ ...opts, scopes: reflectInspectionScopes(scopes) }, source, target);
    for (const entry of entries.filter((entry2) => !entry2.blockers.length)) {
      try {
        assertReflectBaselineMatches(baseline, { ...opts, scopes: [entry.sectionKey], targetDependencies: entry.requiredFields?.length ? ["fieldSettings"] : [] }, source, target);
      } catch (error) {
        if (isRunCancelledError(error)) throw error;
        entry.status = "error";
        entry.blockers.push(error.message);
        entry.message = error.message;
      }
    }
    if (usesLookupMap(opts, scopes)) {
      const lookup = await preflightLookupMapStandalone(opts.lookupMap, { targetGuestId: opts.targetGuestId });
      if (!lookup.ok) {
        const lookupErr = `ルックアップ変換先を確認できません: ${lookup.missing.map((item) => `${item.from} → ${item.to}: ${item.reason}`).join(" / ")}`;
        const affected = entries.filter((entry) => entry.sectionKey === "fieldSettings" || entry.sectionKey === "actionSettings");
        for (const entry of affected.length ? affected : entries.slice(0, 1)) {
          entry.status = "error";
          entry.blockers.push(lookupErr);
          entry.message = entry.blockers.join("\n");
        }
      }
    }
    return {
      totalSections: entries.length,
      changedSections: entries.filter((entry) => entry.status === "change").length,
      sameSections: entries.filter((entry) => entry.status === "same").length,
      errorSections: entries.filter((entry) => !["change", "same"].includes(entry.status)).length,
      entries,
      sourceFieldCodes: listReflectFieldCodes(source, true),
      targetFieldCodes: listReflectFieldCodes(target),
      sourceSystemFieldCodes: listReflectSystemFieldCodes(source),
      baseline,
      targetPending
    };
  }
  async function runApplyPreviewStandalone(opts, setStatus, onProgress) {
    if (!opts.reviewBaseline) throw new Error("反映前に差分を取得して確認してください。");
    if (opts.doDeploy) throw new Error("この機能はプレビューへの反映専用です。本番公開には対応していません。");
    const invalid = reflectConnectionError(opts);
    if (invalid) throw new Error(invalid);
    const scopes = orderedScopes(opts.scopes);
    const { source, target } = await getReflectBundles(opts, scopes, setStatus);
    if (opts.doBackup) assertCompleteReflectBackup(target, scopes);
    let revision = assertReflectBaselineMatches(opts.reviewBaseline, { ...opts, scopes }, source, target);
    const customizeFiles = await resolveReflectCustomizeFiles(opts, scopes, source, target, setStatus);
    const fieldLabels = reflectFieldLabels(target, source);
    const plans = scopes.map((key) => buildReflectSectionPlan(key, source.sections?.[key], target.sections?.[key], { ...opts, customizeFiles, fieldLabels }));
    const issues = reflectSelectionBlockers(plans, scopes, listReflectFieldCodes(source, true), listReflectFieldCodes(target), listReflectSystemFieldCodes(source));
    if (issues.length) throw new Error(`反映前の検査で停止しました。まだ書き込んでいません。
${issues.join("\n")}`);
    if (plans.some((plan) => plan.requiredFields?.length)) revision = assertReflectBaselineMatches(opts.reviewBaseline, { ...opts, scopes, targetDependencies: ["fieldSettings"] }, source, target);
    if (usesLookupMap(opts, scopes)) {
      const lookup = await preflightLookupMapStandalone(opts.lookupMap, { targetGuestId: opts.targetGuestId });
      if (!lookup.ok) throw new Error(`ルックアップ変換先を確認できないため反映を中止しました。
${lookup.missing.map((item) => `${item.from} → ${item.to}: ${item.reason}`).join("\n")}`);
    }
    const logs = [];
    let backup;
    if (opts.doBackup && plans.some((plan) => plan.operations.length)) {
      let bundle = target;
      if (plans.some((plan) => plan.sectionKey === "customizeSettings" && plan.operations.length)) {
        setStatus("バックアップ用にJS/CSSファイルを取得中…");
        const embedded = await embedCustomizeFileContents(target.sections.customizeSettings, { guestId: opts.targetGuestId || "", cached: customizeFiles?.targetBlobs });
        bundle = { ...target, sections: { ...target.sections, customizeSettings: embedded.section } };
        const keptKeys = new Set(plans.filter((plan) => plan.sectionKey === "customizeSettings").flatMap((plan) => plan.operations).flatMap((operation) => ["desktop", "mobile"].flatMap((platform) => ["js", "css"].flatMap((kind) => (operation.body?.[platform]?.[kind] || []).map((item) => item?.file?.fileKey).filter(Boolean)))));
        const lost = embedded.unavailable.filter((item) => !keptKeys.has(item.fileKey));
        if (lost.length) throw new Error(`反映先のJS/CSSファイルの本体をバックアップに保存できないため、反映を中止しました。まだ書き込んでいません。
${lost.map((item) => `「${item.name}」: ${item.reason}`).join("\n")}
時間をおいて差分を取得し直すか、JS/CSS設定を反映対象から外してください。`);
        for (const item of embedded.unavailable) logs.push(`警告: JS/CSSファイル「${item.name}」の本体をバックアップに保存できませんでした（${item.reason}）。この反映では外さないため、設定には残ります`);
      }
      backup = { generatedAt: (/* @__PURE__ */ new Date()).toISOString(), scopes, bundle };
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = buildExportFilename("反映前バックアップ", "json", { appLabel: buildAppFilenameLabel(opts.targetAppId, extractAppNameFromBundle(target)) });
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5e3);
      logs.push("バックアップ取得完了（保存を開始しました）");
    }
    const prefix = buildApiPrefix(opts.targetGuestId || "", true);
    const bodyWithUploads = async (operation) => {
      if (!operation.uploads?.length) return operation.body;
      const body = deepClone(operation.body);
      for (const upload of operation.uploads) {
        const blob = customizeFiles?.blobs.get(upload.sourceFileKey);
        if (!blob) throw new Error(`「${upload.name}」のファイル本体がないためアップロードできません。`);
        let fileKey;
        try {
          fileKey = await uploadKintoneFile(opts.targetGuestId || "", blob, upload.name);
        } catch (error) {
          if (isRunCancelledError(error)) throw error;
          throw new Error(`「${upload.name}」のアップロードに失敗しました（${error.message || String(error)}）。${operation.label}は書き込んでいません。`);
        }
        logs.push(`  OK ファイルアップロード: ${upload.name}（${upload.platform === "desktop" ? "PC" : "モバイル"} ${upload.kind.toUpperCase()}）`);
        const item = body[upload.platform]?.[upload.kind]?.[upload.index];
        if (item?.file?.fileKey !== upload.sourceFileKey) throw new Error(`「${upload.name}」の反映位置を特定できません。${operation.label}は書き込んでいません。`);
        item.file.fileKey = fileKey;
      }
      return body;
    };
    const bodies = /* @__PURE__ */ new Map();
    if (plans.some((plan) => plan.operations.some((operation) => operation.uploads?.length))) setStatus("JS/CSSファイルを反映先へアップロード中…");
    for (const plan of plans) for (const operation of plan.operations) {
      try {
        bodies.set(operation, await bodyWithUploads(operation));
      } catch (error) {
        if (isRunCancelledError(error)) throw error;
        throw new Error(`${error.message || String(error)}
まだ何も書き込んでいません。`);
      }
    }
    const write = async (operation, body) => {
      try {
        const response = await (operation.method === "POST" ? apiPost : apiPut)(prefix, operation.endpoint, { ...body, app: opts.targetAppId, revision });
        const next = pickRevision(response);
        if (!/^\d+$/.test(next)) {
          const error = new Error(`${operation.label}の書き込みは完了しましたが、更新後のrevisionを確認できません。以降の反映を中止します。差分を取得し直して状態を確認してください。`);
          error.stopReflection = true;
          throw error;
        }
        revision = next;
      } catch (error) {
        throw decorateRevisionConflict(error, operation.label);
      }
    };
    logs.push(`反映元: ${opts.sourceBundle ? "設定JSON" : opts.sourceAppId} → 反映先(プレビュー): ${opts.targetAppId}`);
    const sections = [];
    let cancelled = false;
    const notify = (plan, status, message, stopped = false) => {
      try {
        opts.onSectionUpdate?.({ sectionKey: plan.sectionKey, label: plan.label, status, ...message ? { message } : {}, ...stopped ? { stopped: true } : {} });
      } catch {
      }
    };
    for (const [index, plan] of plans.entries()) {
      const outcome = { sectionKey: plan.sectionKey, label: plan.label };
      if (!plan.operations.length) {
        sections.push({ ...outcome, status: "skip", message: "変更なし（書き込み不要）" });
        notify(plan, "skip", "変更なし（書き込み不要）");
        logs.push(`SKIP ${plan.label}: 書き込み不要`);
        onProgress(logs);
        continue;
      }
      setStatus(`反映中 ${index + 1}/${plans.length}: ${plan.label}`);
      notify(plan, "running");
      const written = [];
      try {
        for (const operation of plan.operations) {
          await write(operation, bodies.get(operation) || operation.body);
          written.push(operation.label);
          logs.push(`  OK ${operation.label}`);
        }
        sections.push({ ...outcome, status: "ok" });
        notify(plan, "ok");
        logs.push(`OK ${plan.label}`);
      } catch (error) {
        if (isRunCancelledError(error)) {
          cancelled = true;
          if (written.length) {
            const message2 = `${RUN_CANCELLED_MESSAGE}（この項目では ${written.join("・")} まで書き込み済みで、残りは送信していません。差分を取得し直して現在の状態を確認してください）`;
            sections.push({ ...outcome, status: "ng", message: message2, stopped: true });
            notify(plan, "ng", message2, true);
            logs.push(`中止 ${plan.label}: ${written.join("・")} まで書き込み済み（途中で停止）`);
          } else {
            sections.push({ ...outcome, status: "pending", message: "中止のため未実行" });
            notify(plan, "pending", "中止のため未実行");
            logs.push(`中止 ${plan.label}: 書き込み前に停止（未実行）`);
          }
          for (const rest of plans.slice(index + 1)) {
            if (!rest.operations.length) {
              sections.push({ sectionKey: rest.sectionKey, label: rest.label, status: "skip", message: "変更なし（書き込み不要）" });
              notify(rest, "skip", "変更なし（書き込み不要）");
              continue;
            }
            sections.push({ sectionKey: rest.sectionKey, label: rest.label, status: "pending", message: "中止のため未実行" });
            notify(rest, "pending", "中止のため未実行");
          }
          logs.push(`${RUN_CANCELLED_MESSAGE}（反映済み ${sections.filter((item) => item.status === "ok").length} 件 / 未実行 ${sections.filter((item) => item.status === "pending").length} 件）`);
          break;
        }
        const message = `${error.message || String(error)}${written.length ? `
（この項目では ${written.join("・")} まで書き込み済みです。差分を取得し直して現在の状態を確認してください）` : ""}`;
        sections.push({ ...outcome, status: "ng", message });
        notify(plan, "ng", message);
        pushReflectErrorLog(logs, `NG ${plan.label}: ${message}`, message);
        if (opts.stopOnError !== false || error.stopReflection || isRevisionConflictError(error)) {
          for (const pending of plans.slice(index + 1)) {
            sections.push({ sectionKey: pending.sectionKey, label: pending.label, status: "pending", message: "中断のため未実行" });
            notify(pending, "pending", "中断のため未実行");
          }
          logs.push(`中断（未実行 ${plans.length - index - 1} 件）`);
          break;
        }
      }
      onProgress(logs);
    }
    const count = (status) => sections.filter((section) => section.status === status).length;
    const stoppedCount = sections.filter((section) => section.status === "ng" && section.stopped).length, failedCount = count("ng") - stoppedCount;
    logs.push(`=== 完了: OK ${count("ok")} / NG ${failedCount}${stoppedCount ? ` / 途中で停止 ${stoppedCount}` : ""} / 未実行 ${count("pending")} / 変更なし ${count("skip")} ===`);
    onProgress(logs);
    if (cancelled) setStatus(`反映を中止しました（反映済み ${count("ok")} / 途中で停止 ${stoppedCount} / 未実行 ${count("pending")}）。反映先プレビューは一部だけ更新されている可能性があります。`, true);
    else setStatus(failedCount ? "反映完了（一部エラーあり）" : "反映完了");
    return { logs, sections, backup, finalRevision: revision, ...cancelled ? { cancelled: true } : {} };
  }
  async function preflightLookupMapStandalone(lookupMap, opts = {}) {
    const missing = [];
    for (const [from, to] of Object.entries(lookupMap || {})) {
      if (!/^[1-9]\d*$/.test(from) || !/^[1-9]\d*$/.test(String(to))) {
        missing.push({ from, to, reason: "AppID形式が不正" });
        continue;
      }
      try {
        const info = await apiGet(buildApiPrefix(opts.targetGuestId || "", false), "/app.json", { id: to });
        if (String(info?.appId) !== to) throw new Error("応答のアプリIDが一致しません");
      } catch (error) {
        if (isRunCancelledError(error)) throw error;
        missing.push({ from, to, reason: `取得失敗: ${error.message || String(error)}` });
      }
    }
    return { ok: !missing.length, missing };
  }

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
  init_runControl();
  init_utils();
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
@keyframes kus-lp-indeterminate { from { transform: translateX(-100%); } to { transform: translateX(350%); } }

.kus-lp{
  --c-bg:#ffffff;
  --c-surface:#f8fafc;
  --c-surface-2:#f1f5f9;
  --c-border:#e2e8f0;
  --c-border-strong:#cbd5e1;
  --c-text:#0f172a;
  --c-text-2:#334155;
  --c-muted:#475569;
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
  box-sizing:border-box;
  width:min(560px,calc(100vw - max(32px,4vw)));
  max-height:min(92vh,920px);
  overflow:hidden;
  display:flex;
  flex-direction:column;
  background:var(--c-bg);
  border:1px solid var(--c-border);
  border-radius:18px;
  box-shadow:0 4px 6px -1px rgba(15,23,42,.08),0 28px 60px -12px rgba(15,23,42,.30);
  font:14px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI","Hiragino Sans","Noto Sans JP",sans-serif;
  color:var(--c-text);
  animation:kus-lp-fade-in .18s ease-out;
}
/* ドラッグ移動中は文字選択とアニメーションを止める */
.kus-lp--dragging{user-select:none;animation:none;transition:none}
.kus-lp--dragging .kus-lp__hero{cursor:grabbing}
/* 最小化: ヒーローだけ残して本文を畳む（kintone 画面を確認しやすくする） */
.kus-lp--collapsed .kus-lp__body{display:none!important}
.kus-lp--collapsed .kus-lp__hero{padding-bottom:16px}

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
  cursor:grab;
  touch-action:none;
}
.kus-lp__hero-main{min-width:0;flex:1}
.kus-lp__hero-actions{display:flex;align-items:center;gap:6px;flex-shrink:0;cursor:auto}
/* 狭い画面では経過時間の文字を隠し（スピナーは残す）ボタンを詰めて、タイトルが 1 文字ずつ折り返すのを防ぐ */
@media(max-width:560px){.kus-lp__elapsed{font-size:0;gap:0}.kus-lp__hero-actions{gap:4px}.kus-lp__close,.kus-lp__toggle,.kus-lp__cancel{padding:6px 8px;font-size:12px}.kus-lp__toggle{min-width:30px}}
.kus-lp__elapsed{
  font-size:12.5px;font-weight:600;color:rgba(255,255,255,.9);white-space:nowrap;
  font-variant-numeric:tabular-nums;display:inline-flex;align-items:center;gap:5px;
}
.kus-lp__elapsed::before{
  content:'';display:inline-block;width:9px;height:9px;border-radius:50%;
  border:2px solid rgba(255,255,255,.85);border-top-color:transparent;animation:kus-lp-spin .8s linear infinite;
}
.kus-lp__elapsed--done{font-weight:500;color:rgba(255,255,255,.8)}
/* 完了後の「前回 …」表示ではスピナーを出さない */
.kus-lp__elapsed--done::before{display:none;animation:none}
/* 実行中の進捗ストリップ（ヒーロー下端） */
.kus-lp__progress{position:absolute;left:0;right:0;bottom:0;height:3px;overflow:hidden;background:rgba(255,255,255,.22);display:none;z-index:1}
.kus-lp[aria-busy="true"] .kus-lp__progress{display:block}
.kus-lp__progress::after{content:'';position:absolute;top:0;bottom:0;left:0;width:30%;background:#fff;opacity:.95;animation:kus-lp-indeterminate 1.4s ease-in-out infinite}
.kus-lp__title{margin:0;font-size:18px;font-weight:700;line-height:1.25;letter-spacing:.01em;display:flex;align-items:center;gap:8px}
.kus-lp__title-icon{display:inline-flex;width:22px;height:22px;align-items:center;justify-content:center;background:rgba(255,255,255,.22);border-radius:7px}
.kus-lp__subtitle{margin:4px 0 0;font-size:13px;color:rgba(255,255,255,.85);line-height:1.45}
.kus-lp__badge-row{margin-top:8px;display:flex;flex-wrap:wrap;gap:5px}
.kus-lp__badge{
  display:inline-flex;align-items:center;gap:4px;
  font-size:12px;font-weight:700;letter-spacing:.02em;
  background:rgba(255,255,255,.22);padding:3px 9px;border-radius:999px;color:#fff;
}
/* 影響範囲のバッジ: 読み取り専用（緑）/ プレビューへ書き込み（橙）/ 本番データを変更（赤） */
.kus-lp__badge--read{background:#047857;border:1px solid rgba(255,255,255,.35)}
.kus-lp__badge--preview{background:#c2410c;border:1px solid rgba(255,255,255,.35)}
.kus-lp__badge--production{background:#b91c1c;border:1px solid rgba(255,255,255,.45)}
.kus-lp__close,.kus-lp__toggle,.kus-lp__cancel{
  flex-shrink:0;border:1px solid rgba(255,255,255,.45);background:rgba(255,255,255,.12);
  color:#fff;border-radius:10px;padding:6px 12px;font-size:13px;font-weight:600;cursor:pointer;
  font-family:inherit;line-height:1.3;
  transition:background .12s ease;
}
.kus-lp__toggle{padding:6px 9px;min-width:34px}
.kus-lp__cancel{background:rgba(254,202,202,.30);border-color:rgba(254,226,226,.85)}
.kus-lp__close:hover,.kus-lp__toggle:hover{background:rgba(255,255,255,.24)}
.kus-lp__cancel:hover{background:rgba(254,202,202,.48)}
.kus-lp__close:disabled,.kus-lp__toggle:disabled,.kus-lp__cancel:disabled{opacity:.55;cursor:not-allowed}

/* キーボード操作の現在位置をすべての lite パネルで見えるようにする */
.kus-lp :is(button,input,select,textarea,summary,a,[tabindex]):focus-visible{outline:3px solid var(--c-accent-via);outline-offset:2px}
.kus-lp__hero :is(button):focus-visible{outline-color:#fff}
@media(prefers-reduced-motion:reduce){
  .kus-lp,.kus-lp *,.kus-lp *::before,.kus-lp *::after{animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important}
  .kus-lp__progress::after{width:100%;opacity:.6}
}

.kus-lp__body{padding:16px 18px 18px;overflow-y:auto;flex:1;min-height:0}
.kus-lp__body::-webkit-scrollbar{width:10px;height:10px}
.kus-lp__body::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:8px;border:2px solid transparent;background-clip:padding-box}
.kus-lp__body::-webkit-scrollbar-thumb:hover{background:#94a3b8;background-clip:padding-box;border:2px solid transparent}

.kus-lp__hint{
  font-size:13px;color:var(--c-muted);line-height:1.55;margin:0 0 14px;
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
  padding:8px 12px 9px;font-size:13px;font-weight:600;color:var(--c-muted);
  border-radius:8px 8px 0 0;
}
.kus-lp__tab:hover{color:var(--c-text-2);background:var(--c-surface)}
.kus-lp__tab[aria-selected="true"]{color:var(--c-accent-via);background:transparent}
.kus-lp__tab[aria-selected="true"]::after{
  content:'';position:absolute;left:8px;right:8px;bottom:-1px;height:2px;border-radius:2px;
  background:linear-gradient(90deg,var(--c-accent-via),var(--c-accent-to));
}
.kus-lp [hidden]{display:none!important}

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
.kus-lp__card-title{font-size:13px;font-weight:700;color:var(--c-text-2);text-transform:uppercase;letter-spacing:.06em;margin:0;display:flex;align-items:center;gap:6px}
.kus-lp__card-num{
  display:inline-flex;width:18px;height:18px;align-items:center;justify-content:center;
  background:var(--c-accent-chip);color:var(--c-accent-via);font-size:12.5px;font-weight:700;border-radius:999px;
}
.kus-lp__card-actions{display:flex;gap:6px}

/* ===== Row (label + control) ===== */
.kus-lp__row{display:flex;flex-wrap:wrap;align-items:center;gap:8px 10px;margin-bottom:10px}
.kus-lp__row:last-child{margin-bottom:0}
.kus-lp__row--block{display:block}
.kus-lp__row--block > .kus-lp__label{display:block;margin-bottom:5px}
.kus-lp__label{font-size:13px;font-weight:600;color:var(--c-text-2);min-width:5em}

/* ===== Inputs ===== */
.kus-lp__input,.kus-lp__textarea,.kus-lp__select{
  appearance:none;
  border:1px solid var(--c-border);
  border-radius:8px;padding:7px 10px;font-size:14px;
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
.kus-lp__textarea--code{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:13px;background:var(--c-surface)}
.kus-lp__file{font-size:13px;padding:5px 0}

/* ===== Checkbox / chip ===== */
.kus-lp__check{font-size:13px;color:var(--c-text-2);display:inline-flex;align-items:center;gap:6px;cursor:pointer;user-select:none}
.kus-lp__check input{width:14px;height:14px;accent-color:var(--c-accent-via);margin:0}
.kus-lp__check-grid{display:flex;flex-wrap:wrap;gap:8px 12px;margin-bottom:10px}

.kus-lp__chips{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px}
.kus-lp__chip{
  display:inline-flex;align-items:center;gap:6px;
  font-size:13px;color:var(--c-text-2);
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
  font-family:inherit;font-size:14px;font-weight:600;cursor:pointer;
  padding:8px 14px;display:inline-flex;align-items:center;justify-content:center;gap:6px;
  transition:filter .12s,transform .04s,background .12s,border-color .12s;
}
.kus-lp__btn:active{transform:scale(.98)}
.kus-lp__btn[disabled],.kus-lp__btn:disabled{opacity:.55;cursor:not-allowed}

.kus-lp__btn--primary{background:linear-gradient(180deg,var(--c-accent-via),var(--c-accent-from));color:#fff;box-shadow:0 2px 4px var(--c-accent-ring)}
.kus-lp__btn--primary:hover:not(:disabled){filter:brightness(1.06)}

.kus-lp__btn--run{width:100%;padding:11px 16px;font-size:14px;font-weight:700;background:linear-gradient(180deg,var(--c-accent-via),var(--c-accent-from));color:#fff;box-shadow:0 2px 6px var(--c-accent-ring)}
.kus-lp__btn--run:hover:not(:disabled){filter:brightness(1.07)}

.kus-lp__btn--ghost{background:var(--c-surface);color:var(--c-text-2);border-color:var(--c-border-strong)}
.kus-lp__btn--ghost:hover:not(:disabled){background:#fff;border-color:#94a3b8}

.kus-lp__btn--sub{background:linear-gradient(180deg,#fff,var(--c-surface-2));color:var(--c-text-2);border-color:var(--c-border-strong);font-size:13px;padding:7px 10px}
.kus-lp__btn--sub:hover:not(:disabled){background:#fff;border-color:#94a3b8}

.kus-lp__btn--danger{background:linear-gradient(180deg,#ef4444,#b91c1c);color:#fff;box-shadow:0 2px 4px rgba(220,38,38,.25)}
.kus-lp__btn--danger:hover:not(:disabled){filter:brightness(1.05)}

.kus-lp__btn-row{display:flex;flex-wrap:wrap;gap:8px;margin-top:4px}
.kus-lp__btn-row--stack{flex-direction:column}
.kus-lp__btn-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
@media(max-width:380px){.kus-lp__btn-grid{grid-template-columns:1fr}}

/* ===== Status ===== */
.kus-lp__status{
  margin-top:12px;padding:10px 12px;border-radius:10px;font-size:13px;line-height:1.5;
  border:1px solid var(--c-border);background:var(--c-surface-2);color:var(--c-text-2);
  min-height:2.6em;display:flex;align-items:flex-start;gap:8px;
}
.kus-lp__status--ok{background:var(--c-ok-bg);color:var(--c-ok-fg);border-color:var(--c-ok-bd)}
.kus-lp__status--err{background:var(--c-err-bg);color:var(--c-err-fg);border-color:var(--c-err-bd)}
.kus-lp__status--warn{background:var(--c-warn-bg);color:var(--c-warn-fg);border-color:var(--c-warn-bd)}
.kus-lp__status--info{background:var(--c-info-bg);color:var(--c-info-fg);border-color:var(--c-info-bd)}
.kus-lp__status--busy{background:#eff6ff;color:#1e40af;border-color:#bfdbfe}
.kus-lp__status-icon{font-size:14px;line-height:1.2;flex:0 0 auto}
/* 部分成功や API コンテキストなど複数行のメッセージを改行のまま表示する */
.kus-lp__status-text{min-width:0;white-space:pre-wrap;word-break:break-word}
.kus-lp__status-busy::before{
  content:'';display:inline-block;width:10px;height:10px;border-radius:50%;
  border:2px solid var(--c-muted);border-top-color:transparent;animation:kus-lp-spin .8s linear infinite;
}

/* ===== Result / Log ===== */
.kus-lp__result{
  margin-top:10px;padding:11px 13px;background:#0f172a;color:#e2e8f0;border-radius:10px;
  font:12.5px/1.6 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
  white-space:pre-wrap;word-break:break-word;max-height:240px;overflow:auto;
  border:1px solid #1e293b;
}
.kus-lp__result--empty{display:none}
/* ログ右上に貼り付くコピー／保存操作（ログ本文の選択・スクロールを妨げない） */
.kus-lp__result-tools{float:right;position:sticky;top:0;margin:-4px -6px 4px 8px;display:flex;gap:4px}
.kus-lp__result-copy,.kus-lp__result-save{
  padding:3px 8px;font:600 12px/1.4 -apple-system,BlinkMacSystemFont,"Segoe UI","Hiragino Sans","Noto Sans JP",sans-serif;
  color:#cbd5e1;background:rgba(30,41,59,.92);border:1px solid #334155;border-radius:7px;cursor:pointer;white-space:nowrap;
}
.kus-lp__result-copy:hover,.kus-lp__result-save:hover{color:#fff;background:#334155}
.kus-lp__result-copy[data-copied="true"],.kus-lp__result-save[data-copied="true"]{color:#bbf7d0;border-color:#166534}
.kus-lp__panel-html{
  margin-top:10px;border:1px solid var(--c-border);border-radius:10px;
  background:var(--c-surface);max-height:240px;overflow:auto;font-size:13px;
}
.kus-lp__panel-html--empty{display:none}
.kus-lp__panel-html table{border-collapse:collapse;width:100%}
.kus-lp__panel-html th,.kus-lp__panel-html td{padding:6px 8px;border-bottom:1px solid var(--c-border);text-align:left}
.kus-lp__panel-html th{background:var(--c-surface-2);font-weight:600;font-size:12.5px;color:var(--c-text-2)}

/* ===== Misc ===== */
.kus-lp__note{font-size:13px;color:var(--c-muted);line-height:1.5;margin:-4px 0 10px}
.kus-lp__note--warn{color:var(--c-warn-fg);padding:7px 10px;background:var(--c-warn-bg);border:1px solid var(--c-warn-bd);border-radius:8px;margin:6px 0}
/* ===== カードの「?」ヘルプ（補足説明の吹き出し） ===== */
.kus-lp__help-btn{flex-shrink:0;width:26px;height:26px;border-radius:50%;border:1px solid var(--c-border-strong);background:#fff;color:var(--c-text-2);font:700 13px/1 inherit;font-family:inherit;cursor:pointer;display:inline-flex;align-items:center;justify-content:center}
.kus-lp__help-btn:hover,.kus-lp__help-btn--open{background:var(--c-accent-chip);border-color:var(--c-accent-via);color:var(--c-accent-from)}
.kus-lp__help-pop{margin:-4px 0 12px;padding:10px 12px;border:1px solid var(--c-info-bd);background:var(--c-info-bg);border-radius:10px;color:var(--c-text-2);font-size:13px;line-height:1.55;animation:kus-lp-fade-in .12s ease-out}
.kus-lp__help-pop[hidden]{display:none}
.kus-lp__help-item{margin:0 0 6px;color:var(--c-text-2);font-size:13px;line-height:1.55}
.kus-lp__help-item:last-child{margin-bottom:0}
/* ===== ポップアップ（詳細設定・ほかの操作） ===== */
.kus-lp__dialog{box-sizing:border-box;width:min(640px,calc(100vw - 32px));max-height:min(88vh,860px);padding:0;border:1px solid var(--c-border);border-radius:16px;background:var(--c-bg);color:var(--c-text);box-shadow:0 28px 60px -12px rgba(15,23,42,.45);font:14px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI","Hiragino Sans","Noto Sans JP",sans-serif;display:none;flex-direction:column;overflow:hidden}
.kus-lp__dialog[open]{display:flex}
.kus-lp__dialog--wide{width:min(880px,calc(100vw - 32px))}
.kus-lp__dialog::backdrop{background:rgba(15,23,42,.45)}
.kus-lp__dialog-head{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:14px 18px;border-bottom:1px solid var(--c-border);background:var(--c-surface)}
.kus-lp__dialog-title{margin:0;font-size:16px;font-weight:700;color:var(--c-text)}
.kus-lp__dialog-close{flex-shrink:0;white-space:nowrap;border:1px solid var(--c-border-strong);background:#fff;color:var(--c-text-2);border-radius:9px;padding:6px 12px;font:600 13px/1.3 inherit;font-family:inherit;cursor:pointer}
.kus-lp__dialog-close:hover{background:var(--c-surface-2)}
.kus-lp__dialog-body{padding:16px 18px;overflow:auto;min-height:0;flex:1}
.kus-lp__dialog-body>.kus-lp__card{margin-bottom:12px}
.kus-lp__dialog-foot{display:flex;justify-content:flex-end;gap:8px;padding:12px 18px;border-top:1px solid var(--c-border);background:var(--c-surface)}
.kus-lp__dialog :is(button,input,select,textarea,summary):focus-visible{outline:3px solid var(--c-accent-via);outline-offset:2px}
@media(max-width:720px){.kus-lp__dialog{width:calc(100vw - 16px);max-height:calc(100dvh - 16px)}.kus-lp__dialog-body{padding:12px}}
.kus-lp__divider{margin:12px 0;border:none;border-top:1px solid var(--c-border)}
.kus-lp__small{font-size:12.5px;color:var(--c-muted)}
.kus-lp__kbd{display:inline-block;padding:1px 6px;border:1px solid var(--c-border-strong);border-radius:4px;background:var(--c-surface);font:11px ui-monospace,monospace;color:var(--c-text-2)}

/* ===== Toolbar / Count / Pill ===== */
.kus-lp__toolbar{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin:0 0 8px}
.kus-lp__toolbar-spacer{flex:1;min-width:8px}
.kus-lp__count{
  display:inline-flex;align-items:center;gap:4px;font-size:12.5px;font-weight:700;white-space:nowrap;
  color:var(--c-accent-from);background:var(--c-accent-chip);padding:2px 9px;border-radius:999px;font-variant-numeric:tabular-nums;
}
.kus-lp__pill{
  display:inline-flex;align-items:center;gap:6px;padding:4px 11px;font-size:13px;font-weight:600;border-radius:999px;
  background:var(--c-surface-2);color:var(--c-text);border:1px solid var(--c-border);line-height:1.4;max-width:100%;
}
.kus-lp__pill--ok{background:var(--c-ok-bg);color:var(--c-ok-fg);border-color:var(--c-ok-bd)}
.kus-lp__pill--accent{background:var(--c-accent-chip);color:var(--c-accent-from);border-color:transparent}

/* ===== Pick list（絞り込み付きチェック一覧） ===== */
.kus-lp__picklist{border:1px solid var(--c-border);border-radius:10px;background:var(--c-bg);overflow:hidden}
.kus-lp__picklist-head{
  display:flex;flex-wrap:wrap;align-items:center;gap:6px;padding:7px 8px;
  background:var(--c-surface);border-bottom:1px solid var(--c-border);
}
.kus-lp__picklist-head .kus-lp__input{flex:1;min-width:120px;padding:5px 8px;font-size:13px}
.kus-lp__picklist-head .kus-lp__btn{padding:4px 8px;font-size:12.5px;border-radius:7px}
.kus-lp__picklist-body{max-height:220px;overflow:auto;padding:4px}
.kus-lp__picklist-item{
  display:flex;align-items:center;gap:8px;padding:5px 7px;border-radius:7px;font-size:13px;color:var(--c-text);
  cursor:pointer;user-select:none;min-width:0;
}
.kus-lp__picklist-item:hover{background:var(--c-surface)}
.kus-lp__picklist-item:has(input:checked){background:var(--c-accent-chip)}
.kus-lp__picklist-item input{accent-color:var(--c-accent-via);width:14px;height:14px;margin:0;flex-shrink:0}
.kus-lp__picklist-main{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.kus-lp__picklist-sub{flex-shrink:0;max-width:45%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--c-muted);font-size:12.5px;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
.kus-lp__picklist-empty{padding:10px 8px;color:var(--c-muted);font-size:13px}
.kus-lp__picklist-foot{padding:6px 8px;border-top:1px solid var(--c-border);background:var(--c-surface);font-size:12.5px;color:var(--c-muted);line-height:1.5;overflow-wrap:anywhere}

/* セクション折りたたみ (details) */
.kus-lp__details{
  border:1px solid var(--c-border);border-radius:10px;background:var(--c-bg);
  margin-bottom:10px;overflow:hidden;
}
.kus-lp__details > summary{
  list-style:none;cursor:pointer;padding:10px 14px;
  font-size:14px;font-weight:600;color:var(--c-text-2);
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
.kus-lp--wide{width:min(640px,calc(100vw - max(32px,4vw)))}

/* ===== App table (複数アプリ × per-app ゲストスペース入力) ===== */
.kus-lp__apptable{border:1px solid var(--c-border);border-radius:10px;overflow:hidden;background:var(--c-bg)}
.kus-lp__apptable-scroll{max-height:220px;overflow:auto}
.kus-lp__apptable table{width:100%;border-collapse:collapse;table-layout:fixed}
.kus-lp__apptable th{background:var(--c-surface-2);font-size:12.5px;font-weight:600;color:var(--c-text-2);text-align:left;padding:6px 8px;border-bottom:1px solid var(--c-border)}
.kus-lp__apptable-scroll th{position:sticky;top:0;z-index:1}
.kus-lp__apptable td{padding:5px 8px;border-bottom:1px solid var(--c-border);vertical-align:middle}
.kus-lp__apptable tbody tr:last-child td{border-bottom:none}
.kus-lp__apptable .kus-lp__input{width:100%;box-sizing:border-box}
.kus-lp__apptable-name{min-height:1.35em;margin-top:3px;color:var(--c-muted);font-size:12px;line-height:1.35;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.kus-lp__apptable-name:not(.kus-lp__apptable-name--empty)::before{content:'アプリ名: ';color:var(--c-text-2);font-weight:600}
.kus-lp__apptable-no{width:36px;padding-left:4px;padding-right:4px;text-align:center;color:var(--c-muted);font-size:12.5px;font-variant-numeric:tabular-nums}
.kus-lp__apptable-acts-h{width:136px}
.kus-lp__apptable th.kus-lp__apptable-acts-h,.kus-lp__apptable td.kus-lp__apptable-acts{padding-left:4px;padding-right:4px}
.kus-lp__apptable-acts{white-space:nowrap}
.kus-lp__apptable-acts .kus-lp__btn{padding:4px 6px;font-size:12.5px;border-radius:7px}
.kus-lp__apptable-acts .kus-lp__btn + .kus-lp__btn{margin-left:3px}
.kus-lp__apptable-foot{display:flex;flex-wrap:wrap;align-items:center;gap:8px;padding:8px;background:var(--c-surface);border-top:1px solid var(--c-border)}
.kus-lp__apptable-count{font-size:12.5px;color:var(--c-muted);margin-left:auto;font-weight:600}
.kus-lp__apptable-hint{font-size:12.5px;line-height:1.5;color:var(--c-muted);padding:6px 10px;border-top:1px solid var(--c-border);background:var(--c-surface)}
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
  var LitePanelBusyError = class extends Error {
    constructor(id) {
      super(`パネル ${id} は実行中のため再起動しません`);
      __publicField(this, "panelBusy", true);
      this.name = "LitePanelBusyError";
    }
  };
  function createLitePanel(opts) {
    ensureThemeStyles();
    const old = document.getElementById(opts.id);
    if (old instanceof HTMLElement && old.getAttribute("aria-busy") === "true") {
      old.classList.remove("kus-lp--collapsed");
      const statusText = old.querySelector(".kus-lp__status-text");
      const hint = "実行中のため再起動しません。終わるのを待つか、「中止」を押してください。";
      if (statusText && !statusText.textContent?.includes(hint)) statusText.textContent = `${hint} ${statusText.textContent || ""}`.trim();
      try {
        old.querySelector(".kus-lp__cancel")?.focus({ preventScroll: true });
      } catch {
      }
      throw new LitePanelBusyError(opts.id);
    }
    let carriedPosition = null;
    if (old instanceof HTMLElement && old.dataset.kusPlaced === "1") {
      const left = parseFloat(old.style.left);
      const top = parseFloat(old.style.top);
      if (Number.isFinite(left) && Number.isFinite(top)) carriedPosition = { left, top };
    }
    if (old) {
      old.dispatchEvent(new Event("kus-lite-dispose"));
      old.remove();
    }
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
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
    const badges = opts.badges || [];
    if (!badges.length) badgesEl.hidden = true;
    for (const b of badges) {
      const span = document.createElement("span");
      span.className = `kus-lp__badge${b.tone === "read" || b.tone === "preview" || b.tone === "production" ? ` kus-lp__badge--${b.tone}` : ""}`;
      span.textContent = b.label;
      badgesEl.appendChild(span);
    }
    heroMain.appendChild(badgesEl);
    const closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "kus-lp__close";
    closeBtn.textContent = "閉じる";
    const elapsedEl = document.createElement("span");
    elapsedEl.className = "kus-lp__elapsed";
    elapsedEl.setAttribute("aria-hidden", "true");
    elapsedEl.hidden = true;
    const cancelBtn = document.createElement("button");
    cancelBtn.type = "button";
    cancelBtn.className = "kus-lp__cancel";
    cancelBtn.textContent = "中止";
    cancelBtn.setAttribute("aria-label", "処理を中止");
    cancelBtn.title = "次のリクエストの前で処理を止めます（送信済みの書き込みは取り消しません）";
    cancelBtn.hidden = true;
    const bodyId = `${opts.id}-body`;
    const toggleBtn = document.createElement("button");
    toggleBtn.type = "button";
    toggleBtn.className = "kus-lp__toggle";
    toggleBtn.setAttribute("aria-controls", bodyId);
    toggleBtn.setAttribute("aria-expanded", "true");
    toggleBtn.setAttribute("aria-label", "折りたたむ");
    toggleBtn.title = "折りたたむ（ヒーローだけ残して kintone 画面を確認）";
    toggleBtn.textContent = "－";
    const heroActions = document.createElement("div");
    heroActions.className = "kus-lp__hero-actions";
    heroActions.appendChild(elapsedEl);
    heroActions.appendChild(cancelBtn);
    heroActions.appendChild(toggleBtn);
    heroActions.appendChild(closeBtn);
    const progress = document.createElement("div");
    progress.className = "kus-lp__progress";
    progress.setAttribute("aria-hidden", "true");
    hero.appendChild(heroMain);
    hero.appendChild(heroActions);
    hero.appendChild(progress);
    root2.appendChild(hero);
    const body = document.createElement("div");
    body.className = "kus-lp__body";
    body.id = bodyId;
    if (opts.hint) {
      const hint = document.createElement("div");
      hint.className = "kus-lp__hint";
      hint.innerHTML = opts.hint;
      body.appendChild(hint);
    }
    const status = document.createElement("div");
    status.className = "kus-lp__status";
    status.dataset.tone = "neutral";
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");
    status.setAttribute("aria-atomic", "true");
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
    const copyBtn = document.createElement("button");
    copyBtn.type = "button";
    copyBtn.className = "kus-lp__result-copy";
    copyBtn.textContent = "コピー";
    copyBtn.setAttribute("aria-label", "ログをコピー");
    const saveBtn = document.createElement("button");
    saveBtn.type = "button";
    saveBtn.className = "kus-lp__result-save";
    saveBtn.textContent = "保存";
    saveBtn.setAttribute("aria-label", "ログをファイルに保存");
    const resultTools = document.createElement("span");
    resultTools.className = "kus-lp__result-tools";
    resultTools.appendChild(copyBtn);
    resultTools.appendChild(saveBtn);
    let copyResetTimer = 0;
    let saveResetTimer = 0;
    function resultText() {
      const clone = result.cloneNode(true);
      clone.querySelector(".kus-lp__result-tools")?.remove();
      return (clone.innerText || clone.textContent || "").replace(/^\s+|\s+$/g, "");
    }
    function flashCopy(label, copied) {
      copyBtn.textContent = label;
      copyBtn.dataset.copied = String(copied);
      window.clearTimeout(copyResetTimer);
      copyResetTimer = window.setTimeout(() => {
        copyBtn.textContent = "コピー";
        delete copyBtn.dataset.copied;
      }, 1600);
    }
    function flashSave(label, saved) {
      saveBtn.textContent = label;
      saveBtn.dataset.copied = String(saved);
      window.clearTimeout(saveResetTimer);
      saveResetTimer = window.setTimeout(() => {
        saveBtn.textContent = "保存";
        delete saveBtn.dataset.copied;
      }, 1600);
    }
    copyBtn.addEventListener("click", () => {
      const text = resultText();
      if (!text) return;
      void copyTextToClipboard(text).then((ok) => flashCopy(ok ? "コピー済み" : "コピー失敗", ok));
    });
    saveBtn.addEventListener("click", () => {
      const text = resultText();
      if (!text) return;
      try {
        downloadText(`${sanitizeFilenamePart(opts.title)}_ログ_${nowStamp()}.txt`, text, "text/plain;charset=utf-8");
        flashSave("保存済み", true);
      } catch {
        flashSave("保存失敗", false);
      }
    });
    function setResult(text) {
      if (!text) {
        result.textContent = "";
        result.classList.add("kus-lp__result--empty");
        return;
      }
      result.textContent = text;
      result.prepend(resultTools);
      result.classList.remove("kus-lp__result--empty");
    }
    function setResultHtml(html) {
      if (!html) {
        result.innerHTML = "";
        result.classList.add("kus-lp__result--empty");
        return;
      }
      result.innerHTML = html;
      result.prepend(resultTools);
      result.classList.remove("kus-lp__result--empty");
    }
    let busyTimer = 0;
    let busyStartedAt = 0;
    function formatElapsed(ms) {
      const total = Math.max(0, Math.floor(ms / 1e3));
      const m = Math.floor(total / 60);
      const s = total % 60;
      return m ? `${m}分${s}秒` : `${s}秒`;
    }
    function tickElapsed() {
      elapsedEl.textContent = `処理中 ${formatElapsed(Date.now() - busyStartedAt)}`;
    }
    function startElapsed() {
      busyStartedAt = Date.now();
      elapsedEl.classList.remove("kus-lp__elapsed--done");
      tickElapsed();
      elapsedEl.hidden = false;
      busyTimer = window.setInterval(tickElapsed, 1e3);
    }
    function stopElapsed(keepLast) {
      const wasRunning = !!busyTimer;
      if (busyTimer) window.clearInterval(busyTimer);
      busyTimer = 0;
      if (keepLast && wasRunning) {
        elapsedEl.classList.add("kus-lp__elapsed--done");
        elapsedEl.textContent = `前回 ${formatElapsed(Date.now() - busyStartedAt)}`;
        elapsedEl.hidden = false;
      } else if (!keepLast) {
        elapsedEl.classList.remove("kus-lp__elapsed--done");
        elapsedEl.hidden = true;
        elapsedEl.textContent = "";
      }
    }
    let runToken = null;
    function requestCancel2() {
      if (!runToken) return false;
      const accepted = requestCancel(runToken);
      if (accepted) {
        cancelBtn.disabled = true;
        cancelBtn.textContent = "中止中…";
        handle.setStatus("中止しています。実行中のリクエストが終わり次第、次のリクエストの前で止めます…", "busy");
      }
      return accepted;
    }
    function isCancelRequested2() {
      return !!runToken && runToken.cancelled;
    }
    cancelBtn.addEventListener("click", () => {
      requestCancel2();
    });
    function setBusy(busy) {
      closeBtn.disabled = busy;
      root2.setAttribute("aria-busy", String(busy));
      root2.style.cursor = busy ? "progress" : "";
      if (busy) {
        if (!runToken) {
          runToken = beginRun();
          cancelBtn.textContent = "中止";
          cancelBtn.disabled = false;
          runToken.controller.signal.addEventListener("abort", () => {
            if (!cancelBtn.hidden && !cancelBtn.disabled) {
              cancelBtn.disabled = true;
              cancelBtn.textContent = "中止中…";
              handle.setStatus("中止しています。実行中のリクエストが終わり次第、次のリクエストの前で止めます…", "busy");
            }
          }, { once: true });
        } else if (!runToken.cancelled) {
          cancelBtn.disabled = false;
        }
        cancelBtn.hidden = false;
        if (!busyTimer) startElapsed();
      } else {
        endRun(runToken);
        runToken = null;
        cancelBtn.hidden = true;
        cancelBtn.disabled = false;
        cancelBtn.textContent = "中止";
        stopElapsed(true);
      }
      root2.dispatchEvent(new Event("kus-lite-busy-change"));
    }
    function setCollapsed(collapsed) {
      root2.classList.toggle("kus-lp--collapsed", collapsed);
      toggleBtn.setAttribute("aria-expanded", String(!collapsed));
      toggleBtn.setAttribute("aria-label", collapsed ? "展開する" : "折りたたむ");
      toggleBtn.title = collapsed ? "展開する" : "折りたたむ（ヒーローだけ残して kintone 画面を確認）";
      toggleBtn.textContent = collapsed ? "＋" : "－";
      if (!collapsed) clampIntoViewport();
    }
    toggleBtn.addEventListener("click", () => setCollapsed(!root2.classList.contains("kus-lp--collapsed")));
    let customPlaced = false;
    function clampIntoViewport() {
      if (!customPlaced || !root2.isConnected) return;
      const rect = root2.getBoundingClientRect();
      place(rect.left, rect.top);
    }
    function place(left, top) {
      const w = root2.offsetWidth;
      const h = root2.offsetHeight;
      const maxLeft = Math.max(0, window.innerWidth - w);
      const maxTop = Math.max(0, window.innerHeight - h);
      const nextLeft = Math.min(Math.max(0, left), maxLeft);
      const nextTop = Math.min(Math.max(0, top), maxTop);
      root2.style.left = `${Math.round(nextLeft)}px`;
      root2.style.top = `${Math.round(nextTop)}px`;
      root2.style.right = "auto";
      customPlaced = true;
      root2.dataset.kusPlaced = "1";
    }
    function resetPosition() {
      customPlaced = false;
      delete root2.dataset.kusPlaced;
      root2.style.left = "";
      root2.style.top = "";
      root2.style.right = "";
    }
    let drag = null;
    hero.addEventListener("pointerdown", (e) => {
      if (e.button !== 0) return;
      const target = e.target;
      if (!target || target.closest("button,a,input,select,textarea,[contenteditable]")) return;
      const rect = root2.getBoundingClientRect();
      drag = { pointerId: e.pointerId, x: e.clientX, y: e.clientY, left: rect.left, top: rect.top, moved: false };
      try {
        hero.setPointerCapture(e.pointerId);
      } catch {
      }
    });
    hero.addEventListener("pointermove", (e) => {
      if (!drag || e.pointerId !== drag.pointerId) return;
      const dx = e.clientX - drag.x;
      const dy = e.clientY - drag.y;
      if (!drag.moved) {
        if (Math.hypot(dx, dy) < 4) return;
        drag.moved = true;
        root2.classList.add("kus-lp--dragging");
      }
      e.preventDefault();
      place(drag.left + dx, drag.top + dy);
    });
    function endDrag(e) {
      if (!drag || e.pointerId !== drag.pointerId) return;
      drag = null;
      root2.classList.remove("kus-lp--dragging");
      try {
        hero.releasePointerCapture(e.pointerId);
      } catch {
      }
    }
    hero.addEventListener("pointerup", endDrag);
    hero.addEventListener("pointercancel", endDrag);
    hero.addEventListener("dblclick", (e) => {
      const target = e.target;
      if (target && target.closest("button,a,input,select,textarea")) return;
      resetPosition();
    });
    const onWindowResize = () => clampIntoViewport();
    window.addEventListener("resize", onWindowResize);
    if (carriedPosition) place(carriedPosition.left, carriedPosition.top);
    function dispose() {
      if (runToken && !runToken.cancelled) requestCancel(runToken);
      document.removeEventListener("keydown", onDocKeydown);
      window.removeEventListener("resize", onWindowResize);
      stopElapsed(false);
      endRun(runToken);
      runToken = null;
      window.clearTimeout(copyResetTimer);
      window.clearTimeout(saveResetTimer);
    }
    function close() {
      if (closeBtn.disabled) return;
      const restoreFocus = root2.contains(document.activeElement);
      dispose();
      root2.remove();
      setRootElement(null);
      if (restoreFocus && previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
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
      if (e.key !== "Escape" || e.defaultPrevented || e.isComposing || e.keyCode === 229) return;
      if (closeBtn.disabled || !root2.isConnected || !(e.target instanceof Node) || !root2.contains(e.target)) return;
      if (root2.querySelector("dialog[open]")) return;
      e.preventDefault();
      e.stopPropagation();
      close();
    }
    document.addEventListener("keydown", onDocKeydown);
    root2.addEventListener("kus-lite-dispose", dispose, { once: true });
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
    const handle = { root: root2, body, status, result, setStatus, setResult, setResultHtml, setBusy, close, setCollapsed, resetPosition, setPrimaryAction, requestCancel: requestCancel2, isCancelRequested: isCancelRequested2 };
    return handle;
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
      i.setAttribute("aria-hidden", "true");
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
    n.className = kind === "warn" ? "kus-lp__note--warn" : kind === "help" ? "kus-lp__note kus-lp__note--help" : "kus-lp__note";
    n.textContent = text;
    return n;
  }
  function attachCardHelp(scope) {
    const cards = Array.from(scope.querySelectorAll(".kus-lp__card"));
    if (scope instanceof HTMLElement && scope.classList.contains("kus-lp__card")) cards.unshift(scope);
    for (const card of cards) {
      const notes = Array.from(card.querySelectorAll(".kus-lp__note--help")).filter((note) => note.closest(".kus-lp__card") === card);
      if (!notes.length) continue;
      const head = card.querySelector(":scope > .kus-lp__card-head");
      if (!head) continue;
      let pop = card.querySelector(":scope > .kus-lp__help-pop");
      let btn = head.querySelector(".kus-lp__help-btn");
      if (!pop) {
        pop = document.createElement("div");
        pop.className = "kus-lp__help-pop";
        pop.hidden = true;
        pop.setAttribute("role", "note");
        head.insertAdjacentElement("afterend", pop);
      }
      if (!btn) {
        btn = document.createElement("button");
        btn.type = "button";
        btn.className = "kus-lp__help-btn";
        btn.textContent = "?";
        const titleEl = head.querySelector(".kus-lp__card-title");
        const title = titleEl ? Array.from(titleEl.childNodes).filter((node) => !(node instanceof HTMLElement && node.classList.contains("kus-lp__card-num"))).map((node) => node.textContent || "").join("").trim() : "";
        btn.setAttribute("aria-label", `${title ? `「${title}」の` : ""}説明を表示`);
        btn.title = "説明を表示";
        btn.setAttribute("aria-expanded", "false");
        const popEl = pop;
        const setOpen = (next) => {
          popEl.hidden = !next;
          btn.setAttribute("aria-expanded", String(next));
          btn.classList.toggle("kus-lp__help-btn--open", next);
        };
        btn.addEventListener("click", () => setOpen(popEl.hidden));
        const onEsc = (e) => {
          if (e.key !== "Escape" || popEl.hidden || e.isComposing) return;
          e.preventDefault();
          e.stopPropagation();
          setOpen(false);
          try {
            btn.focus({ preventScroll: true });
          } catch {
          }
        };
        btn.addEventListener("keydown", onEsc);
        const actions = head.querySelector(".kus-lp__card-actions");
        if (actions) actions.insertAdjacentElement("afterbegin", btn);
        else head.appendChild(btn);
      }
      for (const note of notes) {
        note.classList.remove("kus-lp__note--help");
        note.classList.add("kus-lp__help-item");
        pop.appendChild(note);
      }
    }
  }
  function makeDialog(opts) {
    const dialog = document.createElement("dialog");
    dialog.className = `kus-lp__dialog${opts.wide ? " kus-lp__dialog--wide" : ""}`;
    if (opts.id) dialog.id = opts.id;
    const titleId = `${opts.id || `kus-dialog-${Math.random().toString(36).slice(2, 8)}`}-title`;
    dialog.setAttribute("aria-labelledby", titleId);
    const head = document.createElement("div");
    head.className = "kus-lp__dialog-head";
    const title = document.createElement("h2");
    title.className = "kus-lp__dialog-title";
    title.id = titleId;
    title.textContent = opts.title;
    const closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "kus-lp__dialog-close";
    closeBtn.textContent = "閉じる";
    closeBtn.setAttribute("aria-label", `${opts.title}を閉じる`);
    head.append(title, closeBtn);
    const body = document.createElement("div");
    body.className = "kus-lp__dialog-body";
    const foot = document.createElement("div");
    foot.className = "kus-lp__dialog-foot";
    const doneBtn = document.createElement("button");
    doneBtn.type = "button";
    doneBtn.className = "kus-lp__btn kus-lp__btn--sub";
    doneBtn.textContent = "閉じる";
    foot.appendChild(doneBtn);
    dialog.append(head, body, foot);
    let opener = null;
    function close() {
      if (!dialog.open) return;
      dialog.close();
    }
    function open() {
      if (dialog.open) return;
      opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      if (typeof dialog.showModal === "function") dialog.showModal();
      else dialog.setAttribute("open", "");
      const first = body.querySelector("input:not([type=hidden]):not([disabled]),select:not([disabled]),textarea:not([disabled]),button:not([disabled])");
      try {
        (first || closeBtn).focus({ preventScroll: true });
      } catch {
      }
    }
    closeBtn.addEventListener("click", close);
    doneBtn.addEventListener("click", close);
    let pressedOnBackdrop = false;
    dialog.addEventListener("pointerdown", (e) => {
      pressedOnBackdrop = e.target === dialog;
    });
    dialog.addEventListener("click", (e) => {
      if (e.target === dialog && pressedOnBackdrop) close();
      pressedOnBackdrop = false;
    });
    dialog.addEventListener("close", () => {
      if (opener?.isConnected) {
        try {
          opener.focus({ preventScroll: true });
        } catch {
        }
      }
    });
    return { dialog, body, open, close };
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
    const token = activeRun();
    try {
      const out = await fn();
      const tone = panel.status.dataset.tone;
      const currentText = panel.status.querySelector(".kus-lp__status-text")?.textContent || "";
      const cancelled = /キャンセルしました/.test(currentText);
      if (cancelled && (tone === "busy" || tone === "ok")) {
        panel.setStatus(currentText, "info");
      } else if (okMsg && tone !== "err" && tone !== "warn" && tone !== "info") {
        panel.setStatus(okMsg, "ok");
      } else if (tone === "busy") {
        panel.setStatus(currentText || "完了", "ok");
      }
      if (token?.cancelled && !cancelled && panel.status.dataset.tone !== "err") {
        let base = panel.status.querySelector(".kus-lp__status-text")?.textContent || "";
        if (/^中止しています/.test(base)) base = okMsg || "処理が終わりました";
        panel.setStatus(/中止/.test(base) ? base : `${base}（中止を要求したため、途中で止めた項目があるかもしれません。結果を確認してください）`, "warn");
      }
      return out;
    } catch (e) {
      if (isRunCancelledError(e)) {
        panel.setStatus(token && token.writes > 0 ? "中止しました。次のリクエストの前で止めました。途中まで書き込んだ内容は取り消していません。" : "中止しました。次のリクエストの前で止めました（書き込みは行っていません）。", "warn");
        return void 0;
      }
      const message = String(e?.message || e || "不明なエラー");
      const lines = message.split("\n").map((line) => line.trim()).filter(Boolean);
      const [first, ...rest] = lines.length ? lines : [message];
      if (e?.partialSuccess === true) {
        const logNote = rest.length ? /[）)]$/.test(first) ? "。詳細は下のログを確認してください" : "（詳細は下のログ）" : "";
        panel.setStatus(`${first}${logNote}`, "warn");
        if (rest.length) panel.setResult(lines.join("\n"));
        return void 0;
      }
      if (token?.cancelled && (e?.cancelReport === true || /^中止しました/.test(first))) {
        panel.setStatus(`${first}${rest.length ? "（詳細は下のログ）" : ""}`, "warn");
        if (rest.length) panel.setResult(lines.join("\n"));
        return void 0;
      }
      if (token?.cancelled) {
        panel.setStatus(`エラー: ${first}（中止の要求後に失敗しました${rest.length ? "。詳細は下のログ" : ""}）`, "err");
        if (rest.length) panel.setResult(lines.join("\n"));
        return void 0;
      }
      panel.setStatus(`エラー: ${first}${rest.length ? "（詳細は下のログ）" : ""}`, "err");
      if (rest.length) panel.setResult(lines.join("\n"));
      return void 0;
    } finally {
      panel.setBusy(false);
    }
  }

  // src/entries/appSearchControl.ts
  init_api();
  init_utils();
  var RESULT_CSS_ID = "kus-app-search-styles";
  var RESULT_CSS = `
.kus-as__result{margin-top:6px;border:1px solid var(--c-border);border-radius:8px;overflow:hidden;max-height:240px;overflow-y:auto}
.kus-as__result--empty{display:none}
.kus-as__head{padding:6px 10px;background:var(--c-surface-2);font-size:12.5px;font-weight:600;color:var(--c-text-2);position:sticky;top:0}
.kus-as__table{border-collapse:collapse;width:100%;font-size:13px}
.kus-as__table th,.kus-as__table td{padding:5px 8px;border-bottom:1px solid var(--c-border);text-align:left;vertical-align:top}
.kus-as__table th{background:var(--c-surface);font-weight:600;color:var(--c-text-2);font-size:12.5px}
.kus-as__table tr:last-child td{border-bottom:none}
.kus-as__id{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;color:var(--c-text-2);white-space:nowrap}
.kus-as__name{color:var(--c-text);word-break:break-all}
.kus-as__meta{margin-top:3px;color:var(--c-text-2);font-size:12px;line-height:1.5}
.kus-as__assign{display:flex;flex-wrap:wrap;gap:4px;justify-content:flex-end}
.kus-as__assign .kus-lp__btn{padding:4px 8px;font-size:12px}
.kus-as__assign .kus-as__picked{background:var(--c-ok-bg);border-color:var(--c-ok-bd);color:var(--c-ok-fg)}
.kus-as__bulk{display:flex;flex-wrap:wrap;align-items:center;gap:6px;padding:6px 10px;border-bottom:1px solid var(--c-border);background:var(--c-surface)}
.kus-as__bulk .kus-lp__btn{padding:4px 10px;font-size:12.5px}
.kus-as__bulk .kus-as__picked{background:var(--c-ok-bg);border-color:var(--c-ok-bd);color:var(--c-ok-fg)}
`;
  function ensureStyles() {
    if (document.getElementById(RESULT_CSS_ID)) return;
    const st = document.createElement("style");
    st.id = RESULT_CSS_ID;
    st.textContent = RESULT_CSS;
    document.head.appendChild(st);
  }
  function appCandidate(info, appId) {
    return {
      appId,
      name: String(info?.name || ""),
      code: info?.code == null ? void 0 : String(info.code),
      spaceId: info?.spaceId === null ? null : info?.spaceId === void 0 ? void 0 : String(info.spaceId),
      modifiedAt: String(info?.modifiedAt || ""),
      modifierName: String(info?.modifier?.name || info?.modifier?.code || "")
    };
  }
  function candidateDetails(app) {
    const parts = [
      app.code === void 0 ? "コード未取得" : app.code ? `コード: ${app.code}` : "コード未設定",
      app.spaceId === null ? "スペース外" : app.spaceId ? `スペース: ${app.spaceId}` : "所属スペース未取得"
    ];
    if (app.modifiedAt) {
      const date = new Date(app.modifiedAt);
      const time = Number.isNaN(date.getTime()) ? app.modifiedAt : date.toLocaleString("ja-JP");
      parts.push(`更新: ${time}${app.modifierName ? ` / ${app.modifierName}` : ""}`);
    }
    return parts.join(" · ");
  }
  function createAppSearchControl(panel, opts) {
    ensureStyles();
    const { details, body } = makeDetails(opts.title || "アプリを検索（名前・コード・ID）", { open: !!opts.open });
    const keyword = makeInput({ placeholder: "アプリ名 / アプリID / URL", width: "wide", noSubmit: true });
    const guest = makeInput({ placeholder: "ゲストID（任意）", width: "guest", noSubmit: true });
    if (opts.guestEl?.value.trim()) guest.value = opts.guestEl.value.trim();
    const searchBtn = makeButton("検索", "sub", { icon: "🔍" });
    const allBtn = makeButton("環境内の全アプリ", "sub");
    allBtn.title = "接続先で閲覧できるアプリをすべて候補に表示します（検索語とスペースIDは使いません）";
    const searchMode = makeSelect([["name", "名前 / ID / URL"], ["code", "アプリコード（完全一致）"]]);
    searchMode.setAttribute("aria-label", "検索方法");
    const space = makeInput({ placeholder: "スペースID（任意）", width: "guest", noSubmit: true, ariaLabel: "検索対象スペースID" });
    body.appendChild(makeRow([searchMode, space], { label: "検索方法" }));
    body.appendChild(makeRow([keyword, guest, searchBtn], { label: "検索語" }));
    body.appendChild(makeRow([allBtn], { label: "全アプリ" }));
    body.appendChild(makeNote("閲覧できるアプリを名前（部分一致）またはコード（大文字・小文字を区別する完全一致）で検索します。スペースIDで検索範囲を絞れます。ID / URL の直接指定ではスペースIDの絞り込みは使いません。"));
    const allTargets = opts.targets.filter((t) => typeof t.applyAll === "function");
    body.appendChild(makeNote(`「環境内の全アプリ」は、閲覧できるアプリをすべて候補に表示します${allTargets.length ? "（候補の上の「すべて…」でまとめて設定できます）" : ""}。ゲストスペースのアプリは含まれないため、ゲストスペースIDを入れてゲストスペースごとに取得してください。`));
    const resultBox = document.createElement("div");
    resultBox.className = "kus-as__result kus-as__result--empty";
    body.appendChild(resultBox);
    const moreBtn = makeButton("さらに100件を取得", "sub");
    moreBtn.hidden = true;
    body.appendChild(moreBtn);
    let generation = 0;
    let running = false;
    let candidates = [];
    let nextOffset = 0;
    let resultGuest = "";
    let resultIsAll = false;
    function invalidate() {
      generation += 1;
      candidates = [];
      nextOffset = 0;
      resultIsAll = false;
      resultBox.replaceChildren();
      resultBox.className = "kus-as__result kus-as__result--empty";
      moreBtn.hidden = true;
    }
    keyword.addEventListener("input", invalidate);
    guest.addEventListener("input", invalidate);
    space.addEventListener("input", invalidate);
    searchMode.addEventListener("change", () => {
      keyword.placeholder = searchMode.value === "code" ? "アプリコード（完全一致）" : "アプリ名 / アプリID / URL";
      invalidate();
    });
    function syncBusyControls() {
      const busy = panel.root.getAttribute("aria-busy") === "true";
      searchBtn.disabled = running || busy;
      allBtn.disabled = running || busy;
      moreBtn.disabled = running || busy;
    }
    panel.root.addEventListener("kus-lite-busy-change", () => {
      if (running && panel.root.getAttribute("aria-busy") === "true") invalidate();
      syncBusyControls();
    });
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
        <td class="kus-as__name"><div>${esc(app.name)}</div><div class="kus-as__meta">${esc(candidateDetails(app))}</div></td>
        <td><div class="kus-as__assign">${buttons}</div></td>
      </tr>`;
      }).join("");
      const bulkHtml = allTargets.length ? `<div class="kus-as__bulk">${allTargets.map((t) => {
        const ti = opts.targets.indexOf(t);
        const label = t.applyAllLabel ? t.applyAllLabel(apps.length) : single || !t.label ? `候補 ${apps.length} 件をすべて追加` : `候補 ${apps.length} 件をすべて${t.label}へ`;
        return `<button type="button" class="kus-lp__btn kus-lp__btn--sub" data-as-all="${ti}">${esc(label)}</button>`;
      }).join("")}</div>` : "";
      resultBox.className = "kus-as__result";
      resultBox.innerHTML = `<div class="kus-as__head">${resultIsAll ? `環境内のアプリ ${apps.length}件${resultGuest ? `（ゲストスペース ${esc(resultGuest)}）` : ""}` : `${apps.length}件の候補`}</div>${bulkHtml}
      <table class="kus-as__table">
        <thead><tr><th style="width:74px">アプリID</th><th>アプリ名</th><th style="width:1%"></th></tr></thead>
        <tbody>${rowsHtml}</tbody>
      </table>`;
      resultBox.querySelectorAll("button[data-as-pick]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const app = apps[Number(btn.dataset.asPick)];
          const target = opts.targets[Number(btn.dataset.asTarget)];
          if (!app || !target) return;
          if (running || panel.root.getAttribute("aria-busy") === "true") return;
          const searchGuest = resultGuest;
          const outcome = target.apply(app.appId, app.name, searchGuest) || {};
          if (opts.guestEl && opts.guestEl.value.trim() !== searchGuest) {
            opts.guestEl.value = searchGuest;
            opts.guestEl.dispatchEvent(new Event("input", { bubbles: true }));
            opts.guestEl.dispatchEvent(new Event("change", { bubbles: true }));
          }
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
      resultBox.querySelectorAll("button[data-as-all]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const target = opts.targets[Number(btn.dataset.asAll)];
          if (!target?.applyAll || !apps.length) return;
          if (running || panel.root.getAttribute("aria-busy") === "true") return;
          const searchGuest = resultGuest;
          const outcome = target.applyAll(apps.map((app) => ({ appId: app.appId, appName: app.name })), searchGuest) || {};
          if (opts.guestEl && opts.guestEl.value.trim() !== searchGuest) {
            opts.guestEl.value = searchGuest;
            opts.guestEl.dispatchEvent(new Event("input", { bubbles: true }));
            opts.guestEl.dispatchEvent(new Event("change", { bubbles: true }));
          }
          const where = opts.targets.length > 1 && target.label ? `（${target.label}）` : "";
          btn.classList.add("kus-as__picked");
          btn.setAttribute("aria-pressed", "true");
          btn.textContent = outcome.pickedLabel || `${apps.length} 件を設定済み`;
          panel.setStatus(outcome.message || `候補 ${apps.length} 件を設定しました${where}`, outcome.tone || "ok");
        });
      });
    }
    async function runSearch(append = false) {
      if (running || panel.root.getAttribute("aria-busy") === "true") return;
      if (!append) invalidate();
      const raw = keyword.value.trim();
      const codeSearch = searchMode.value === "code";
      const directAppId = codeSearch ? "" : extractAppIdFromInput(raw);
      if (!directAppId && ([...raw].length > 64 || codeSearch && !raw)) {
        panel.setStatus(codeSearch ? "アプリコードを1〜64文字で入力してください" : "アプリ名は64文字以内で入力してください", "warn");
        return;
      }
      const spaceId = space.value.trim();
      if (!directAppId && spaceId && !/^[1-9]\d*$/.test(spaceId)) {
        panel.setStatus("スペースIDは正の数値で入力してください", "warn");
        return;
      }
      const urlGuestId = codeSearch ? "" : extractGuestIdFromInput(raw);
      if (urlGuestId) guest.value = urlGuestId;
      else if (!codeSearch && /\/k\/\d+(?:[/?#]|$)/i.test(raw)) guest.value = "";
      const guestId = guest.value.trim() || urlGuestId || "";
      if (guestId && !/^\d+$/.test(guestId)) {
        panel.setStatus("ゲストIDは数値で入力してください", "warn");
        return;
      }
      const requestGeneration = generation;
      const isCurrent = () => requestGeneration === generation && panel.root.isConnected && panel.root.getAttribute("aria-busy") !== "true";
      const prefix = buildApiPrefix(guestId, false);
      running = true;
      syncBusyControls();
      resultBox.setAttribute("aria-busy", "true");
      try {
        if (directAppId) {
          panel.setStatus("アプリIDを確認中…", "busy");
          let candidate = { appId: directAppId, name: "ID指定（名称未取得）" };
          try {
            const info = await apiGet(prefix, "/app.json", { id: directAppId });
            candidate = appCandidate(info, directAppId);
          } catch {
          }
          if (!isCurrent()) return;
          resultGuest = guestId;
          renderResults([candidate]);
          panel.setStatus(`アプリID ${directAppId}${guestId ? ` / ゲスト ${guestId}` : ""} を候補に表示しました`, "ok");
          return;
        }
        const params = { limit: 100, offset: append ? nextOffset : 0 };
        if (raw) {
          if (codeSearch) params.codes = [raw];
          else params.name = raw;
        }
        if (spaceId) params.spaceIds = [spaceId];
        panel.setStatus("アプリ検索中…", "busy");
        const res = await apiGet(prefix, "/apps.json", params);
        if (!isCurrent()) return;
        if (!Array.isArray(res?.apps)) throw new Error("アプリ一覧の応答が不正です。再検索してください");
        const byId = new Map(candidates.map((app) => [app.appId, app]));
        for (const app of res.apps) {
          const appId = String(app?.appId || "").trim();
          if (/^\d+$/.test(appId)) byId.set(appId, appCandidate(app, appId));
        }
        candidates = [...byId.values()].sort((a, b) => BigInt(a.appId) < BigInt(b.appId) ? -1 : BigInt(a.appId) > BigInt(b.appId) ? 1 : 0);
        nextOffset = Number(params.offset) + 100;
        resultGuest = guestId;
        renderResults(candidates);
        moreBtn.hidden = res.apps.length < 100;
        panel.setStatus(`アプリ検索完了: ${candidates.length}件${moreBtn.hidden ? "" : "。続きは「さらに100件を取得」で表示できます"}`, candidates.length ? "ok" : "info");
      } catch (e) {
        if (!isCurrent()) return;
        panel.setStatus(`アプリ検索エラー: ${e?.message || String(e)}`, "err");
      } finally {
        running = false;
        syncBusyControls();
        resultBox.setAttribute("aria-busy", "false");
        if (!isCurrent() && panel.root.isConnected && panel.root.getAttribute("aria-busy") !== "true" && panel.status.dataset.tone === "busy") {
          panel.setStatus("検索条件が変わりました。もう一度検索してください", "info");
        }
      }
    }
    async function runAll() {
      if (running || panel.root.getAttribute("aria-busy") === "true") return;
      invalidate();
      const guestId = guest.value.trim();
      if (guestId && !/^\d+$/.test(guestId)) {
        panel.setStatus("ゲストIDは数値で入力してください", "warn");
        return;
      }
      const requestGeneration = generation;
      const isCurrent = () => requestGeneration === generation && panel.root.isConnected && panel.root.getAttribute("aria-busy") !== "true";
      running = true;
      syncBusyControls();
      resultBox.setAttribute("aria-busy", "true");
      try {
        panel.setStatus("環境内の全アプリを取得中…", "busy");
        const apps = await fetchAllApps(guestId, (fetched) => {
          if (isCurrent()) panel.setStatus(`環境内の全アプリを取得中…（${fetched}件）`, "busy");
        });
        if (!isCurrent()) return;
        candidates = apps.map((app) => appCandidate(app, String(app.appId)));
        resultGuest = guestId;
        resultIsAll = true;
        renderResults(candidates);
        const where = guestId ? `ゲストスペース ${guestId}` : "通常スペース・スペース外";
        panel.setStatus(
          candidates.length ? `環境内のアプリ ${candidates.length}件を表示しました（${where}のアプリ）${allTargets.length ? "。「すべて…」でまとめて設定できます" : ""}` : `閲覧できるアプリがありません（${where}）`,
          candidates.length ? "ok" : "info"
        );
      } catch (e) {
        if (!isCurrent()) return;
        panel.setStatus(`全アプリの取得エラー: ${e?.message || String(e)}`, "err");
      } finally {
        running = false;
        syncBusyControls();
        resultBox.setAttribute("aria-busy", "false");
        if (!isCurrent() && panel.root.isConnected && panel.root.getAttribute("aria-busy") !== "true" && panel.status.dataset.tone === "busy") {
          panel.setStatus("取得条件が変わりました。もう一度取得してください", "info");
        }
      }
    }
    searchBtn.addEventListener("click", () => {
      void runSearch();
    });
    allBtn.addEventListener("click", () => {
      void runAll();
    });
    moreBtn.addEventListener("click", () => {
      void runSearch(true);
    });
    const onEnterKey = (e) => {
      if (e.key === "Enter" && !e.isComposing && e.keyCode !== 229) {
        e.preventDefault();
        void runSearch();
      }
    };
    keyword.addEventListener("keydown", onEnterKey);
    guest.addEventListener("keydown", onEnterKey);
    space.addEventListener("keydown", onEnterKey);
    return details;
  }

  // src/entries/reflect-lite-ui.ts
  init_runControl();

  // src/reflect/planReport.ts
  var ENVIRONMENT_LABELS = { production: "本番設定", preview: "プレビュー設定", json: "設定JSON" };
  var STATUS_LABELS = { change: "差分あり", same: "一致", "src-missing": "確認が必要", "tgt-missing": "確認が必要", error: "確認が必要" };
  var OUTCOME_LABELS = { ok: "成功", ng: "失敗", skip: "変更なし", pending: "未実行" };
  var STOPPED_LABEL = "途中で停止";
  var KIND_ORDER2 = ["削除", "変更", "追加", "保持"];
  var outcomeLabel = (outcome) => outcome.status === "ng" && outcome.stopped ? STOPPED_LABEL : OUTCOME_LABELS[outcome.status] || outcome.status;
  var listOf = (value) => Array.isArray(value) ? value : [];
  function escapeReflectMarkdown(value) {
    return String(value ?? "").replace(/[\r\n]+/g, " ").replace(/([\\`*_[\]<>|~])/g, "\\$1");
  }
  function cell(value) {
    return escapeReflectMarkdown(value) || "－";
  }
  function appLine(app, environment) {
    const parts = [`App ${app.appId || "－"}`, app.guestId ? `ゲストスペース ${app.guestId}` : "通常スペース", environment];
    if (app.code) parts.splice(1, 0, `コード ${app.code}`);
    return `${escapeReflectMarkdown(app.name || "（名前なし）")}（${parts.map(escapeReflectMarkdown).join(" / ")}）`;
  }
  function formatStamp(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? String(value || "") : date.toLocaleString("ja-JP", { hour12: false });
  }
  function buildReflectReportMarkdown(input) {
    const lines = [];
    const record = !!input.outcome;
    lines.push(`# プレビュー反映の${record ? "記録" : "計画"}`, "");
    lines.push(`- ${record ? "実行日時" : "作成日時"}: ${escapeReflectMarkdown(formatStamp(record ? input.outcome.executedAt : input.generatedAt))}`);
    lines.push(`- 反映元: ${appLine(input.source, ENVIRONMENT_LABELS[input.sourceEnvironment] || input.sourceEnvironment)}`);
    lines.push(`- 反映先: ${appLine(input.target, "プレビュー")}`);
    lines.push(`- 反映先だけの一覧・グラフ・アクション: ${input.preserveTargetOnly ? "保持する" : "削除する"}`);
    const lookupPairs = Object.entries(input.lookupMap || {});
    if (lookupPairs.length) lines.push(`- 参照先変換: ${lookupPairs.map(([from, to]) => `${escapeReflectMarkdown(from)} → ${escapeReflectMarkdown(to)}`).join("、")}`);
    if (input.targetPending) lines.push(`- 反映先の未公開の変更: ${escapeReflectMarkdown(input.targetPending.message)}`);
    lines.push("- 書き込み先はプレビューです。本番への公開はアプリの設定画面で行います。", "");
    lines.push("## 概要", "");
    const outcomeOf = (key) => input.outcome?.sections.find((section) => section.sectionKey === key);
    lines.push(record ? "| 項目 | 結果 | 変更 | 削除 | 反映方法 |" : "| 項目 | 状態 | 変更 | 削除 | 保持 | 反映方法 |");
    lines.push(record ? "| --- | --- | ---: | ---: | --- |" : "| --- | --- | ---: | ---: | ---: | --- |");
    for (const entry of input.entries) {
      const kept = listOf(entry.changes).filter((change) => change.kind === "保持").length;
      const outcome = outcomeOf(entry.sectionKey);
      lines.push(record ? `| ${cell(entry.label)} | ${cell(outcome ? outcomeLabel(outcome) : "対象外")} | ${entry.changeCount} | ${entry.removalCount} | ${cell(entry.behavior)} |` : `| ${cell(entry.label)} | ${cell(STATUS_LABELS[entry.status] || entry.status)} | ${entry.changeCount} | ${entry.removalCount} | ${kept} | ${cell(entry.behavior)} |`);
    }
    lines.push("");
    for (const entry of input.entries) {
      lines.push(`## ${escapeReflectMarkdown(entry.label)}`, "");
      const outcome = outcomeOf(entry.sectionKey);
      if (outcome) {
        lines.push(`- 結果: ${outcomeLabel(outcome)}`);
        if (outcome.message) lines.push(`- 詳細: ${escapeReflectMarkdown(describeReflectFailure(outcome.message))}`);
      }
      lines.push(`- 状態: ${escapeReflectMarkdown(entry.message || STATUS_LABELS[entry.status] || entry.status)}`);
      for (const blocker of listOf(entry.blockers)) lines.push(`- 停止理由: ${escapeReflectMarkdown(blocker)}`);
      for (const warning of listOf(entry.warnings)) lines.push(`- 注意: ${escapeReflectMarkdown(warning)}`);
      for (const upload of entry.fileUploads || []) lines.push(`- アップロードするファイル: ${upload.platform === "desktop" ? "PC" : "モバイル"} ${upload.kind.toUpperCase()} / ${escapeReflectMarkdown(upload.name)}`);
      const items = [...entry.items || []].sort((a, b) => KIND_ORDER2.indexOf(a.kind) - KIND_ORDER2.indexOf(b.kind));
      if (items.length) {
        lines.push("", "### 変更の要約", "");
        for (const item of items) {
          lines.push(`- **${item.kind}** ${escapeReflectMarkdown(item.name)}`);
          for (const detail of item.details) lines.push(`  - ${escapeReflectMarkdown(detail)}`);
        }
      } else if (entry.status === "change") {
        lines.push("", `変更 ${entry.changeCount} 件（要約を作成できませんでした。詳細は反映計画JSONで確認してください）`);
      }
      lines.push("");
    }
    return lines.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd() + "\n";
  }

  // src/reflect/appReference.ts
  function parseAppReference(text) {
    const raw = String(text || "").trim();
    if (!raw) return null;
    if (/^[1-9]\d*$/.test(raw)) return { appId: raw, guestId: "" };
    const appId = extractAppIdFromInput(raw);
    if (!/^[1-9]\d*$/.test(appId)) return null;
    return { appId, guestId: extractGuestIdFromInput(raw) };
  }
  function guestIdFromPagePath(pathname) {
    return extractGuestIdFromInput(String(pathname || ""));
  }
  function needsAppReferenceParse(text) {
    const raw = String(text || "").trim();
    return !!raw && !/^\d+$/.test(raw);
  }

  // src/reflect/rolloutQueue.ts
  var ROLLOUT_QUEUE_LIMIT = 1e3;
  var keyOf = (ref) => `${ref.guestId || ""}:${ref.appId}`;
  function rolloutLimitMessage(count) {
    return `続けて反映する反映先は ${ROLLOUT_QUEUE_LIMIT} 件までです（${count} 件）。${ROLLOUT_QUEUE_LIMIT} 件を超える場合は、いくつかに分けて実行してください。`;
  }
  function parseRolloutQueue(text, excluded = []) {
    const tokens = String(text || "").split(/[\s,、，]+/).map((token) => token.trim()).filter(Boolean);
    const seen = new Set(excluded.map(keyOf));
    const targets = [];
    for (const token of tokens) {
      const ref = parseAppReference(token);
      if (!ref) return { ok: false, error: `「${Array.from(token).length > 40 ? Array.from(token).slice(0, 39).join("") + "…" : token}」をアプリIDとして読み取れません。数字のID、またはアプリのURLを入力してください。` };
      if (seen.has(keyOf(ref))) continue;
      seen.add(keyOf(ref));
      targets.push(ref);
    }
    if (targets.length > ROLLOUT_QUEUE_LIMIT) return { ok: false, error: rolloutLimitMessage(targets.length) };
    return { ok: true, targets };
  }
  function formatRolloutTarget(target) {
    return `#${target.appId}${target.guestId ? `（ゲスト ${target.guestId}）` : ""}`;
  }
  var ROLLOUT_LOG_LIMIT = ROLLOUT_QUEUE_LIMIT + 1;
  function upsertRolloutLog(log, entry, limit = ROLLOUT_LOG_LIMIT) {
    const index = log.findIndex((item) => keyOf(item) === keyOf(entry));
    const next = index >= 0 ? log.map((item, i) => i === index ? entry : item) : [...log, entry];
    return next.slice(-limit);
  }
  function countRolloutLogDropped(log, entry, limit = ROLLOUT_LOG_LIMIT) {
    const exists = log.some((item) => keyOf(item) === keyOf(entry));
    return Math.max(0, log.length + (exists ? 0 : 1) - limit);
  }
  function describeRolloutLookupNotice(lookupCount) {
    return lookupCount > 0 ? `参照先変換（${lookupCount} 件）を、すべての反映先に同じように使います。反映先ごとに変換先が違う場合は、反映先を切り替えた後に参照先変換を直してください。` : "";
  }
  function serializeRolloutQueue(targets) {
    return targets.map((target) => target.guestId ? `/k/guest/${target.guestId}/${target.appId}/` : target.appId).join("\n");
  }
  function mergeRolloutTargets(currentText, picks, excluded = []) {
    const existing = parseRolloutQueue(currentText);
    if ("error" in existing) return { ok: false, error: `入力済みの反映先を読み取れないため追加できません。${existing.error}` };
    const seen = new Set(existing.targets.map(keyOf));
    const blocked = new Set(excluded.map(keyOf));
    const targets = [...existing.targets];
    let added = 0;
    let duplicates = 0;
    let excludedCount = 0;
    const handled = /* @__PURE__ */ new Set();
    for (const pick of picks) {
      const key = keyOf(pick);
      if (handled.has(key)) continue;
      handled.add(key);
      if (blocked.has(key)) {
        excludedCount++;
        continue;
      }
      if (seen.has(key)) {
        duplicates++;
        continue;
      }
      seen.add(key);
      targets.push({ appId: pick.appId, guestId: pick.guestId || "" });
      added++;
    }
    if (targets.length > ROLLOUT_QUEUE_LIMIT) {
      return { ok: false, error: `${rolloutLimitMessage(targets.length)}入力欄は変更していません。` };
    }
    return { ok: true, text: serializeRolloutQueue(targets), added, duplicates, excluded: excludedCount, total: targets.length };
  }

  // src/reflect/liteSetup.ts
  var LOOKUP_PAIR_SEPARATOR = /\s*(?:→|->|=>|=|:|,|\t)\s*|\s+/;
  function parseLookupMapText(text) {
    const trimmed = String(text || "").trim();
    if (!trimmed) return { ok: true, value: {}, count: 0 };
    const pairs = [];
    if (trimmed.startsWith("{")) {
      let parsed;
      try {
        parsed = JSON.parse(trimmed);
      } catch {
        return { ok: false, error: '参照先変換の JSON が壊れています。{"旧AppID":"新AppID"} 形式か、1 行ずつ「旧ID → 新ID」で入力してください。' };
      }
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return { ok: false, error: '参照先変換は {"旧AppID":"新AppID"} 形式のJSONを入力してください。' };
      for (const [key, value] of Object.entries(parsed)) pairs.push([key, String(value)]);
    } else {
      for (const [index, line] of trimmed.split(/\r?\n/).entries()) {
        const body = line.trim();
        if (!body || body.startsWith("#")) continue;
        const parts = body.split(LOOKUP_PAIR_SEPARATOR).filter(Boolean);
        if (parts.length !== 2) return { ok: false, error: `参照先変換の ${index + 1} 行目を読み取れません。「旧ID → 新ID」の形式で入力してください。` };
        pairs.push([parts[0], parts[1]]);
      }
    }
    const out = /* @__PURE__ */ Object.create(null);
    for (const [from, to] of pairs) {
      if (!/^[1-9]\d*$/.test(from) || !/^[1-9]\d*$/.test(to)) return { ok: false, error: `参照先変換のアプリIDには正の整数を指定してください（${from} → ${to}）。` };
      if (out[from] !== void 0 && out[from] !== to) return { ok: false, error: `参照先変換で旧ID ${from} が複数の変換先（${out[from]}, ${to}）に指定されています。` };
      out[from] = to;
    }
    return { ok: true, value: out, count: Object.keys(out).length };
  }
  function lookupMapError(result) {
    return "error" in result ? result.error : "";
  }
  function lookupMapValue(result) {
    return "value" in result ? result.value : {};
  }
  function describeReflectSetupBlocker(input) {
    if (input.sourceMode === "json" && !input.hasSourceBundle) return "反映元の設定JSONを読み込んでください。";
    if (input.connectionError) return input.connectionError;
    if (!input.scopeCount) return "反映する項目を 1 つ以上選んでください。";
    if (input.lookupError) return `詳細設定の参照先変換に誤りがあります。${input.lookupError}`;
    return "";
  }
  function summarizePostApplyCheck(input) {
    const list2 = (labels2) => labels2.slice(0, 5).join("、") + (labels2.length > 5 ? ` ほか ${labels2.length - 5} 件` : "");
    if (input.errorLabels.length) return { tone: "warn", message: `反映後の再確認：${input.errorLabels.length} 項目を取得できませんでした（${list2(input.errorLabels)}）。取得し直して確認してください。` };
    if (input.changedLabels.length) return { tone: "warn", message: `反映後の再確認：${input.changedLabels.length} 項目に差分が残っています（${list2(input.changedLabels)}）。内容を確認して再反映してください。` };
    return { tone: "ok", message: `反映後の再確認：${input.scopeCount} 項目はすべて反映元と一致しています。本番への公開は反映先の設定画面で行います。` };
  }
  var REFLECT_SCOPE_GROUPS = [
    { id: "form", label: "フォーム・表示", keys: ["fieldSettings", "layoutSettings", "viewSettings", "reportSettings", "categories"] },
    { id: "behavior", label: "動作・カスタマイズ", keys: ["appSettings", "processSettings", "actionSettings", "pluginSettings", "customizeSettings"] },
    { id: "access", label: "権限・通知", keys: ["appAcl", "fieldAcl", "recordPermissions", "notifications", "perRecordNotifications", "reminderNotifications"] }
  ];
  var REFLECT_OTHER_SCOPE_GROUP = { id: "other", label: "その他", keys: [] };
  var REFLECT_SCOPE_HINTS = {
    appSettings: "テーマ、レコードのタイトル、サムネイル表示、一括削除、コメント機能、レコードの再利用、一覧でのインライン編集、数値の桁数と丸め、年度の開始月を反映元に合わせます。アプリ名・説明・アイコンは変えません。",
    fieldSettings: "不足しているフィールドを追加し、変更のある定義だけ更新します。反映先だけのフィールドは保持します。",
    layoutSettings: "配置を反映元に合わせます。反映先だけのフィールドは、フォーム・グループ・テーブルの末尾に保持します。",
    viewSettings: "一覧を追加・更新します。反映先だけの一覧は「保持」の設定に従います。",
    reportSettings: "グラフを追加・更新します。反映先だけのグラフは「保持」の設定に従います。",
    actionSettings: "アクションを追加・更新します。反映先だけのアクションは「保持」の設定に従います。",
    pluginSettings: "反映先にまだ無いプラグインだけ追加します。プラグインの設定値はコピーしません。",
    customizeSettings: "適用範囲と、PC・モバイルのJS/CSSファイル一覧を反映元の内容に置き換えます。反映先だけのファイル・URLは外れます。別アプリのファイルは反映先へアップロードして設定します。",
    processSettings: "反映元の内容で置き換えます。状態・アクション・作業者が変わり、運用中の申請に影響することがあります。",
    appAcl: "反映元の内容で置き換えます。反映先だけの権限は削除されます。",
    fieldAcl: "反映元の内容で置き換えます。反映先だけの権限は削除されます。",
    recordPermissions: "反映元の内容で置き換えます。反映先だけの権限は削除されます。",
    notifications: "反映元の内容で置き換えます。反映先だけの通知は削除されます。",
    perRecordNotifications: "反映元の内容で置き換えます。反映先だけの通知は削除されます。",
    reminderNotifications: "反映元の内容で置き換えます。タイムゾーンも反映元に合わせます。",
    categories: "反映元の内容で置き換えます。カテゴリーの有効状態も反映元に合わせます。"
  };
  function describeReflectScope(key) {
    return REFLECT_SCOPE_HINTS[key] || "";
  }
  function groupReflectScopes(availableKeys) {
    const available = new Set(availableKeys);
    const placed = /* @__PURE__ */ new Set();
    const groups = REFLECT_SCOPE_GROUPS.map((group) => {
      const keys = group.keys.filter((key) => available.has(key));
      keys.forEach((key) => placed.add(key));
      return { ...group, keys };
    });
    const rest = availableKeys.filter((key) => !placed.has(key));
    if (rest.length) groups.push({ ...REFLECT_OTHER_SCOPE_GROUP, keys: [...rest] });
    return groups.filter((group) => group.keys.length > 0);
  }
  function shouldWarnMissingFieldSettings(scopes) {
    if (scopes.includes("fieldSettings")) return false;
    return reflectInspectionScopes([...scopes]).includes("fieldSettings");
  }
  var FIELD_SETTINGS_OMITTED_NOTICE = "フィールド設定を含めない場合、反映先に無いフィールドを参照していると差分確認で停止します。";
  function findMissingFieldReferences(entries, scopes, sourceFieldCodes, targetFieldCodes, sourceSystemFieldCodes = []) {
    const selected = entries.filter((entry) => scopes.includes(entry.sectionKey));
    const fieldEntry = selected.find((entry) => entry.sectionKey === "fieldSettings");
    const sourceCodes = new Set(sourceFieldCodes);
    const systemCodes = new Set(sourceSystemFieldCodes);
    const available = /* @__PURE__ */ new Set([...targetFieldCodes, ...scopes.includes("fieldSettings") && !fieldEntry?.blockers.length ? sourceFieldCodes : []]);
    const out = [];
    for (const entry of selected) {
      for (const code of entry.requiredFields || []) {
        if (!available.has(code)) out.push({ sectionKey: entry.sectionKey, label: entry.label, code, inSource: systemCodes.has(code) ? false : sourceCodes.size ? sourceCodes.has(code) : void 0 });
      }
    }
    return out;
  }
  function canResolveByIncludingFieldSettings(missing, scopes) {
    return !scopes.includes("fieldSettings") && missing.some((item) => item.inSource !== false);
  }
  function describeApplySectionStatus(status, stopped = false) {
    if (status === "ng" && stopped) return { icon: "■", text: "途中で停止", tone: "ng" };
    if (status === "ok") return { icon: "✓", text: "成功", tone: "ok" };
    if (status === "ng") return { icon: "✕", text: "失敗", tone: "ng" };
    if (status === "skip") return { icon: "－", text: "変更なし", tone: "skip" };
    return { icon: "○", text: "未実行", tone: "pending" };
  }
  function normalizeApplySections(sections) {
    if (!Array.isArray(sections)) return [];
    const out = [];
    for (const item of sections) {
      if (!item || typeof item !== "object") continue;
      const raw = item;
      const sectionKey = typeof raw.sectionKey === "string" ? raw.sectionKey : "";
      const label = typeof raw.label === "string" ? raw.label : "";
      if (!sectionKey && !label) continue;
      const status = raw.status === "ok" || raw.status === "ng" || raw.status === "skip" || raw.status === "pending" ? raw.status : "pending";
      out.push({ sectionKey, label, status, ...typeof raw.message === "string" && raw.message ? { message: raw.message } : {}, ...status === "ng" && raw.stopped === true ? { stopped: true } : {} });
    }
    return out;
  }
  var REFLECT_UNDO_GUIDANCE = "取り消す場合: 反映前に反映先プレビューへ未公開の変更が無ければ、アプリの設定画面の『変更を中止』で今回の反映を含む未公開の変更をすべて破棄できます。または自動保存したバックアップJSONを『設定JSONから取得』で反映元に読み込み、差分を確認して戻せます（追加したフィールドは削除されません）。";

  // src/reflect/applyProgress.ts
  function describeApplyProgressStatus(status, stopped = false) {
    if (status === "ng" && stopped) return { icon: "■", text: "途中で停止", tone: "ng" };
    if (status === "running") return { icon: "…", text: "実行中…", tone: "running" };
    if (status === "ok") return { icon: "✓", text: "成功", tone: "ok" };
    if (status === "ng") return { icon: "✕", text: "失敗", tone: "ng" };
    if (status === "skip") return { icon: "－", text: "変更なし", tone: "skip" };
    if (status === "pending") return { icon: "○", text: "未実行", tone: "pending" };
    return { icon: "○", text: "待機中", tone: "waiting" };
  }
  function createApplyProgressRows(sectionKeys, labelOf) {
    const order = (key) => {
      const index = REFLECT_SECTION_KEYS.indexOf(key);
      return index < 0 ? REFLECT_SECTION_KEYS.length : index;
    };
    return [...new Set(sectionKeys)].sort((a, b) => order(a) - order(b)).map((sectionKey) => ({ sectionKey, label: labelOf(sectionKey), status: "waiting" }));
  }
  function applyProgressUpdate(rows, update) {
    return rows.map((row) => row.sectionKey === update.sectionKey ? { sectionKey: row.sectionKey, label: row.label, status: update.status, ...update.message ? { message: update.message } : {}, ...update.status === "ng" && update.stopped ? { stopped: true } : {} } : row);
  }
  function summarizeApplyProgress(rows) {
    if (!rows.length) return "";
    const settled = rows.filter((row) => ["ok", "ng", "skip"].includes(row.status)).length;
    const failed = rows.filter((row) => row.status === "ng" && !row.stopped).length;
    const stopped = rows.filter((row) => row.status === "ng" && row.stopped).length;
    const skipped = rows.filter((row) => row.status === "pending").length;
    const running = rows.find((row) => row.status === "running");
    return `${settled} / ${rows.length} 項目が完了${failed ? `（失敗 ${failed}）` : ""}${stopped ? `（途中で停止 ${stopped}）` : ""}${skipped ? `、未実行 ${skipped}` : ""}${running ? `。実行中: ${running.label}` : ""}`;
  }
  function describeUndoGuidance(targetPending) {
    if (targetPending?.state === "clean") {
      return { tone: "ok", openSettings: true, text: "反映前、反映先プレビューに未公開の変更はありませんでした。アプリの設定画面で『変更を中止』を押すと、今回の反映をすべて取り消せます。" };
    }
    if (targetPending?.state === "own") {
      return { tone: "ok", openSettings: true, text: "反映前の未公開の変更は、このツールによる反映分だけでした。アプリの設定画面で『変更を中止』を押すと、それらを含む未公開の変更をすべて取り消せます。" };
    }
    if (targetPending?.state === "pending") {
      return { tone: "warn", openSettings: false, text: "反映前から未公開の変更があったため、『変更を中止』ではそれらも破棄されます。今回の反映だけを戻す場合は『バックアップから戻す』を使ってください。" };
    }
    return { tone: "info", openSettings: false, text: REFLECT_UNDO_GUIDANCE };
  }
  var RESTORE_MODE_NOTICE = "バックアップから戻しています。反映で追加したフィールドは削除されません（保持として表示）。参照先変換は使いません。";
  var TARGET_PENDING_REASON = "反映先プレビューに以前からの未公開の変更があります";
  var platformLabel = (platform) => platform === "mobile" ? "モバイル" : "PC";
  function formatUploadList(uploads) {
    const grouped = /* @__PURE__ */ new Map();
    for (const upload of uploads || []) {
      const slot = `${platformLabel(upload.platform)} ${upload.kind === "css" ? "CSS" : "JS"}`;
      const entry = grouped.get(upload.sourceFileKey);
      if (!entry) grouped.set(upload.sourceFileKey, { slots: [slot], name: upload.name, byteSize: upload.byteSize });
      else if (!entry.slots.includes(slot)) entry.slots.push(slot);
    }
    return [...grouped.values()].map((entry) => `${entry.slots.join("・")} / ${entry.name}（${formatBytes(entry.byteSize)}）`);
  }
  function collectUploadLabels(plans) {
    return [...new Set(plans.flatMap((plan) => formatUploadList(plan.fileUploads)))];
  }
  var REFLECT_ITEM_KIND_ORDER = ["削除", "変更", "追加", "保持"];
  function orderReflectItems(items) {
    const valid = (items || []).filter((item) => item && REFLECT_ITEM_KIND_ORDER.includes(item.kind) && typeof item.name === "string");
    return REFLECT_ITEM_KIND_ORDER.flatMap((kind) => valid.filter((item) => item.kind === kind));
  }
  function countReflectItemKinds(items) {
    const counts = { 削除: 0, 変更: 0, 追加: 0, 保持: 0 };
    for (const item of items || []) if (item && item.kind in counts) counts[item.kind] += 1;
    return counts;
  }
  function describeRemovedItem(sectionLabel, item) {
    const details = (item.details || []).filter(Boolean);
    return `${sectionLabel} / ${item.name}${details.length ? `：${details.join("、")}` : ""}`;
  }
  function describeRemovedChange(sectionLabel, change) {
    if (change.summary) return `${sectionLabel} / ${change.path.replace(/ \/ \d+件目$/, "")}：${change.summary}`;
    return `${sectionLabel} / ${change.path}：${change.before.slice(0, 180)}${change.before.length > 180 ? "…" : ""}`;
  }
  function formatReflectDateTime(at) {
    return new Date(at).toLocaleString("ja-JP");
  }
  function formatReflectTime(at) {
    return new Date(at).toLocaleTimeString("ja-JP");
  }

  // src/entries/reflectPlanView.ts
  var PRETTY_JSON_PARSE_LIMIT = 2e5;
  function formatReflectChangeValue(value) {
    const text = String(value ?? "");
    const head = text.trimStart()[0];
    if (head !== "{" && head !== "[" || text.length > PRETTY_JSON_PARSE_LIMIT) return text;
    try {
      const parsed = JSON.parse(text);
      return parsed && typeof parsed === "object" ? JSON.stringify(parsed, null, 2) : text;
    } catch {
      return text;
    }
  }
  function extractChangedJsonKeys(beforeText, afterText) {
    const bTrim = String(beforeText || "").trim();
    const aTrim = String(afterText || "").trim();
    if (!bTrim.startsWith("{") || !aTrim.startsWith("{")) return [];
    try {
      const bObj = JSON.parse(bTrim);
      const aObj = JSON.parse(aTrim);
      if (!bObj || typeof bObj !== "object" || Array.isArray(bObj)) return [];
      if (!aObj || typeof aObj !== "object" || Array.isArray(aObj)) return [];
      const keys = [.../* @__PURE__ */ new Set([...Object.keys(bObj), ...Object.keys(aObj)])];
      return keys.filter((key) => JSON.stringify(bObj[key]) !== JSON.stringify(aObj[key]));
    } catch {
      return [];
    }
  }
  var ITEM_KIND_CLASS = { 削除: "delete", 変更: "change", 追加: "add", 保持: "keep" };
  var ITEMS_INITIAL = 20;
  var ITEMS_STEP = 50;
  function buildReflectItem(item) {
    const row = document.createElement("li");
    row.className = `kus-rl-item kus-rl-item--${ITEM_KIND_CLASS[item.kind]}`;
    row.dataset.kind = item.kind;
    const badge = document.createElement("span");
    badge.className = `kus-rl-kind kus-rl-kind--${ITEM_KIND_CLASS[item.kind]}`;
    badge.textContent = item.kind;
    const name = document.createElement("span");
    name.className = "kus-rl-item__name";
    name.textContent = item.name;
    row.append(badge, name);
    const details = (item.details || []).filter(Boolean);
    if (details.length) {
      const list2 = document.createElement("ul");
      list2.className = "kus-rl-item__details";
      for (const detail of details) {
        const li = document.createElement("li");
        li.textContent = detail;
        list2.appendChild(li);
      }
      row.appendChild(list2);
    }
    return row;
  }
  function appendReflectItems(host, plan) {
    const items = orderReflectItems(plan.items);
    if (!items.length) return;
    const counts = countReflectItemKinds(items);
    const onlyKept = counts.保持 === items.length;
    const root2 = document.createElement(onlyKept ? "details" : "section");
    root2.className = `kus-rl-items${onlyKept ? " kus-rl-items--quiet" : ""}`;
    root2.dataset.reflectItems = "true";
    if (plan.sectionKey) {
      root2.dataset.reflectSection = plan.sectionKey;
      if (onlyKept) root2.dataset.reflectDetails = `${plan.sectionKey}:kept`;
    }
    const countText = REFLECT_ITEM_KIND_ORDER.filter((kind) => counts[kind]).map((kind) => `${kind} ${counts[kind]}`).join("・");
    const list2 = document.createElement("ul");
    list2.className = "kus-rl-items__list";
    let shown = 0;
    const more = document.createElement("button");
    more.type = "button";
    more.className = "kus-lp__btn kus-lp__btn--sub kus-rl-items__more";
    const showNext = (limit) => {
      for (const item of items.slice(shown, shown + limit)) list2.appendChild(buildReflectItem(item));
      shown = Math.min(items.length, shown + limit);
      more.hidden = shown >= items.length;
      more.textContent = `残り ${items.length - shown} 件を表示`;
    };
    more.addEventListener("click", () => showNext(ITEMS_STEP));
    if (onlyKept) {
      const head = document.createElement("summary");
      head.textContent = `${plan.label}：反映先だけの設定を保持（${counts.保持} 件）`;
      root2.appendChild(head);
      root2.addEventListener("toggle", () => {
        if (root2.open && !shown) showNext(ITEMS_INITIAL);
      });
    } else {
      const head = document.createElement("div");
      head.className = "kus-rl-items__title";
      const title = document.createElement("strong");
      title.textContent = "変更の要約";
      const total = document.createElement("span");
      total.textContent = countText;
      head.append(title, total);
      root2.appendChild(head);
      showNext(ITEMS_INITIAL);
    }
    root2.append(list2, more);
    more.hidden = onlyKept || shown >= items.length;
    host.appendChild(root2);
  }
  function appendReflectUploads(host, plan) {
    const labels2 = formatUploadList(plan.fileUploads);
    if (!labels2.length) return;
    const box = document.createElement("div");
    box.className = "kus-rl-uploads";
    box.dataset.reflectUploads = "true";
    const title = document.createElement("strong");
    title.textContent = `反映先へアップロードするファイル（${labels2.length} 件）`;
    const list2 = document.createElement("ul");
    for (const label of labels2) {
      const li = document.createElement("li");
      li.textContent = label;
      list2.appendChild(li);
    }
    box.append(title, list2);
    host.appendChild(box);
  }
  function appendReflectChanges(host, plan, options = {}) {
    for (const warning of plan.warnings) {
      const note = document.createElement("p");
      note.className = "kus-rl-next kus-rl-next--warn";
      note.textContent = warning;
      host.appendChild(note);
    }
    appendReflectItems(host, plan);
    if (options.uploads !== false) appendReflectUploads(host, plan);
    if (!plan.changes.length) return;
    const details = document.createElement("details");
    details.className = "kus-rl-changes";
    if (plan.sectionKey) details.dataset.reflectDetails = `${plan.sectionKey}:changes`;
    const summary = document.createElement("summary");
    summary.textContent = `${plan.label}：設定値の内訳（変更 ${plan.changeCount}件・保持 ${plan.changes.length - plan.changeCount}件）`;
    details.appendChild(summary);
    host.appendChild(details);
    let activeKind = "すべて";
    let rendered = 0;
    const filteredChanges = () => activeKind === "すべて" ? plan.changes : plan.changes.filter((change) => change.kind === activeKind);
    if (plan.changes.length > 1) {
      const filterBar = document.createElement("div");
      filterBar.className = "kus-rl-change-filters";
      const filterButtons = [];
      for (const kind of ["すべて", "削除", "変更", "追加"]) {
        const count = kind === "すべて" ? plan.changes.length : plan.changes.filter((c) => c.kind === kind).length;
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "kus-lp__btn kus-lp__btn--sub";
        btn.dataset.filterKind = kind;
        btn.setAttribute("aria-pressed", kind === activeKind ? "true" : "false");
        btn.textContent = `${kind} (${count})`;
        btn.disabled = kind !== "すべて" && count === 0;
        btn.addEventListener("click", () => {
          activeKind = kind;
          for (const b of filterButtons) {
            b.setAttribute("aria-pressed", b.dataset.filterKind === activeKind ? "true" : "false");
          }
          rendered = 0;
          list2.replaceChildren();
          append();
        });
        filterButtons.push(btn);
        filterBar.appendChild(btn);
      }
      details.appendChild(filterBar);
    }
    const list2 = document.createElement("div");
    details.appendChild(list2);
    const more = document.createElement("button");
    more.type = "button";
    more.className = "kus-lp__btn kus-lp__btn--sub";
    more.textContent = "続きを50件表示";
    const append = () => {
      const sourceChanges = filteredChanges();
      for (const change of sourceChanges.slice(rendered, rendered + 50)) {
        const row = document.createElement("div");
        row.className = "kus-rl-change";
        row.dataset.kind = change.kind;
        const title = document.createElement("strong");
        title.textContent = `${change.kind} · ${change.path}`;
        row.appendChild(title);
        const changedKeys = extractChangedJsonKeys(change.before, change.after);
        if (changedKeys.length) {
          const keyNote = document.createElement("span");
          keyNote.className = "kus-rl-change__keys";
          keyNote.textContent = `変更キー: ${changedKeys.join(", ")}`;
          row.appendChild(keyNote);
        }
        const grid = document.createElement("div");
        grid.className = "kus-rl-change__values";
        for (const [label, raw] of [["反映先の現在", change.before], ["反映後", change.after]]) {
          const value = formatReflectChangeValue(raw);
          const cell2 = document.createElement("div"), caption = document.createElement("span"), content = document.createElement("pre");
          caption.textContent = label;
          content.textContent = value.length > 1600 ? value.slice(0, 1600) + "\n…（全内容は計画JSONで確認できます）" : value;
          cell2.append(caption, content);
          grid.appendChild(cell2);
        }
        row.appendChild(grid);
        list2.appendChild(row);
      }
      rendered = Math.min(rendered + 50, sourceChanges.length);
      more.hidden = rendered >= sourceChanges.length;
    };
    more.addEventListener("click", append);
    details.appendChild(more);
    details.addEventListener("toggle", () => {
      if (details.open && !rendered) append();
    });
  }
  function reflectIdentityLabel(identities, side, sourceEnvironment) {
    const app = identities[side];
    return `${app.name}${app.appId ? `（ID: ${app.appId}）` : ""} / ${app.guestId ? `ゲストスペース ${app.guestId}` : "通常スペース"} / ${side === "target" ? "プレビュー" : sourceEnvironment}`;
  }
  function renderReflectRoute(host, identities, environment, options = {}) {
    const route = document.createElement("div");
    route.className = "kus-rl-confirm-route";
    for (const side of ["source", "target"]) {
      const block = document.createElement("div"), label = document.createElement("span"), name = document.createElement("strong");
      label.textContent = side === "source" ? "反映元 ↓" : "書き込み先（反映先）";
      name.textContent = side === "source" && options.sourceLabel ? options.sourceLabel : reflectIdentityLabel(identities, side, environment);
      block.append(label, name);
      route.appendChild(block);
    }
    host.appendChild(route);
  }
  var SUMMARY_STATUS = {
    change: { text: "差分あり", pill: "change" },
    same: { text: "一致", pill: "same" },
    error: { text: "取得失敗", pill: "error" }
  };
  function renderReflectSummaryTable(host, entries, options) {
    const wrap = document.createElement("section");
    wrap.className = "kus-rl-summary";
    wrap.setAttribute("aria-label", `取得した全 ${entries.length} 項目の要約`);
    const title = document.createElement("div");
    title.className = "kus-rl-summary__title";
    const heading = document.createElement("strong");
    heading.textContent = `取得した全 ${entries.length} 項目`;
    title.append(heading);
    const table = document.createElement("table");
    table.className = "kus-rl-summary__table";
    table.setAttribute("role", "table");
    const thead = document.createElement("thead");
    thead.setAttribute("role", "rowgroup");
    const headRow = document.createElement("tr");
    headRow.setAttribute("role", "row");
    const columns = [["name", "項目"], ["status", "状態"], ["num", "変更"], ["num", "削除"], ["num", "保持"], ["how", "反映方法"], ["sel", "選択"]];
    for (const [kind, text] of columns) {
      const th = document.createElement("th");
      th.scope = "col";
      th.setAttribute("role", "columnheader");
      th.className = `kus-rl-summary__${kind}`;
      th.textContent = text;
      headRow.appendChild(th);
    }
    thead.appendChild(headRow);
    const tbody = document.createElement("tbody");
    tbody.setAttribute("role", "rowgroup");
    for (const entry of entries) {
      const tone = entry.status === "change" || entry.status === "same" ? entry.status : "error";
      const computed = tone !== "error";
      const tr = document.createElement("tr");
      tr.setAttribute("role", "row");
      tr.dataset.reflectSummary = entry.sectionKey;
      const cell2 = (kind, label) => {
        const td = document.createElement("td");
        td.setAttribute("role", "cell");
        td.className = `kus-rl-summary__${kind}`;
        td.dataset.label = label;
        tr.appendChild(td);
        return td;
      };
      const nameButton = document.createElement("button");
      nameButton.type = "button";
      nameButton.className = "kus-rl-summary__link";
      nameButton.textContent = entry.label;
      nameButton.title = `${entry.label}の詳細へ移動`;
      cell2("name", "項目").appendChild(nameButton);
      const pill = document.createElement("span");
      pill.className = `kus-rl-pill kus-rl-pill--${SUMMARY_STATUS[tone].pill}`;
      pill.textContent = SUMMARY_STATUS[tone].text;
      cell2("status", "状態").appendChild(pill);
      const kept = Math.max(0, entry.changes.length - entry.changeCount);
      cell2("num", "変更").textContent = computed ? String(entry.changeCount) : "－";
      cell2("num", "削除").textContent = computed ? String(entry.removalCount) : "－";
      cell2("num", "保持").textContent = computed ? String(kept) : "－";
      cell2("how", "反映方法").textContent = computed ? entry.behavior : "－";
      const selected = options.selectedScopes.has(entry.sectionKey);
      const mark = document.createElement("span");
      mark.className = "kus-rl-preview-mini";
      mark.textContent = selected ? "選択中" : "未選択";
      cell2("sel", "選択").appendChild(mark);
      tr.addEventListener("click", () => options.onNavigate(entry.sectionKey));
      tbody.appendChild(tr);
    }
    table.append(thead, tbody);
    wrap.append(title, table);
    host.appendChild(wrap);
  }
  function renderApplySectionResults(host, rawSections) {
    host.replaceChildren();
    const sections = normalizeApplySections(rawSections);
    if (!sections.length) return;
    const heading = document.createElement("div");
    heading.className = "kus-rl-result-heading";
    heading.textContent = "項目ごとの結果";
    const list2 = document.createElement("ul");
    list2.className = "kus-rl-result-list";
    for (const section of sections) {
      const display = describeApplySectionStatus(section.status, section.stopped);
      const item = document.createElement("li");
      item.className = `kus-rl-result-item kus-rl-result-item--${display.tone}`;
      const head = document.createElement("div");
      head.className = "kus-rl-result-item__head";
      const state3 = document.createElement("span");
      state3.className = `kus-rl-result-state kus-rl-result-state--${display.tone}`;
      const icon = document.createElement("span");
      icon.setAttribute("aria-hidden", "true");
      icon.textContent = display.icon;
      state3.append(icon, document.createTextNode(display.text));
      const name = document.createElement("strong");
      name.textContent = section.label && section.label !== section.sectionKey ? section.label : reflectSectionLabel(section.sectionKey);
      head.append(state3, name);
      item.appendChild(head);
      if (section.message) {
        const message = document.createElement("div");
        message.className = "kus-rl-result-item__message";
        message.textContent = describeReflectFailure(section.message);
        item.appendChild(message);
      }
      const hint = section.status === "ng" && !section.stopped ? buildReflectErrorHint(section.message || "") : "";
      if (hint) {
        const hintNode = document.createElement("div");
        hintNode.className = "kus-rl-result-item__hint";
        hintNode.textContent = `ヒント: ${hint}`;
        item.appendChild(hintNode);
      }
      list2.appendChild(item);
    }
    host.append(heading, list2);
  }
  function createApplyProgressView(host, initial) {
    host.replaceChildren();
    host.setAttribute("aria-live", "polite");
    host.setAttribute("aria-atomic", "false");
    let rows = [...initial];
    const summary = document.createElement("div");
    summary.className = "kus-rl-progress__summary";
    const list2 = document.createElement("ul");
    list2.className = "kus-rl-result-list";
    const nodes = /* @__PURE__ */ new Map();
    for (const row of rows) {
      const item = document.createElement("li");
      item.dataset.progressSection = row.sectionKey;
      const head = document.createElement("div");
      head.className = "kus-rl-result-item__head";
      const state3 = document.createElement("span");
      const icon = document.createElement("span");
      icon.setAttribute("aria-hidden", "true");
      const text = document.createTextNode("");
      state3.append(icon, text);
      const name = document.createElement("strong");
      name.textContent = row.label;
      head.append(state3, name);
      const message = document.createElement("div");
      message.className = "kus-rl-result-item__message";
      item.append(head, message);
      list2.appendChild(item);
      nodes.set(row.sectionKey, { item, state: state3, icon, text, message });
    }
    const paint = (row) => {
      const node = nodes.get(row.sectionKey);
      if (!node) return;
      const display = describeApplyProgressStatus(row.status, row.stopped);
      node.item.className = `kus-rl-result-item kus-rl-result-item--${display.tone}`;
      node.state.className = `kus-rl-result-state kus-rl-result-state--${display.tone}`;
      node.icon.textContent = display.icon;
      node.text.data = display.text;
      const shownMessage = describeReflectFailure(row.message);
      node.message.textContent = shownMessage;
      node.message.hidden = !shownMessage;
    };
    const paintSummary = () => {
      summary.textContent = summarizeApplyProgress(rows);
    };
    rows.forEach(paint);
    paintSummary();
    host.append(summary, list2);
    return {
      update(update) {
        rows = applyProgressUpdate(rows, update);
        const row = rows.find((candidate) => candidate.sectionKey === update.sectionKey);
        if (row) paint(row);
        paintSummary();
      },
      rows: () => rows.map((row) => ({ ...row }))
    };
  }

  // src/reflect/appLookup.ts
  init_api();
  var REFLECT_APP_LOOKUP_FAILURE = "アプリを確認できません。ID・ゲストスペース・閲覧権限を確認してください。";
  var POSITIVE_INTEGER = /^[1-9]\d*$/;
  function isLookupableReflectApp(appId, guestId) {
    const id = String(appId || "").trim();
    const guest = String(guestId || "").trim();
    return POSITIVE_INTEGER.test(id) && (!guest || POSITIVE_INTEGER.test(guest));
  }
  async function lookupReflectApp(appId, guestId) {
    const id = String(appId || "").trim();
    const guest = String(guestId || "").trim();
    const failure = { ok: false, message: REFLECT_APP_LOOKUP_FAILURE };
    if (!isLookupableReflectApp(id, guest)) return failure;
    try {
      const response = await apiGet(buildApiPrefix(guest, false), "/app.json", { id }, { retries: 1 });
      if (String(response?.appId ?? "") !== id) return failure;
      return { ok: true, appId: id, name: String(response?.name ?? ""), code: String(response?.code ?? "") };
    } catch {
      return failure;
    }
  }
  function createReflectAppLookupCache(lookup = lookupReflectApp) {
    const done = /* @__PURE__ */ new Map();
    const pending = /* @__PURE__ */ new Map();
    const keyOf2 = (appId, guestId) => `${String(guestId || "").trim()}|${String(appId || "").trim()}`;
    return {
      peek(appId, guestId) {
        return done.get(keyOf2(appId, guestId));
      },
      remember(info, guestId) {
        done.set(keyOf2(info.appId, guestId), { ok: true, appId: String(info.appId).trim(), name: info.name, code: info.code });
      },
      get(appId, guestId) {
        const key = keyOf2(appId, guestId);
        const cached = done.get(key);
        if (cached) return Promise.resolve(cached);
        const inFlight = pending.get(key);
        if (inFlight) return inFlight;
        const request = lookup(String(appId || "").trim(), String(guestId || "").trim()).catch(() => ({ ok: false, message: REFLECT_APP_LOOKUP_FAILURE })).then((result) => {
          pending.delete(key);
          if (!result.ok) return result;
          const kept = done.get(key);
          if (kept) return kept;
          done.set(key, result);
          return result;
        });
        pending.set(key, request);
        return request;
      }
    };
  }
  function formatReflectAppName(info) {
    const name = info.name || `アプリ #${info.appId}`;
    return info.code ? `${name}（コード: ${info.code}）` : name;
  }

  // src/reflect/presetIo.ts
  var REFLECT_PRESETS_EXPORT_KIND = "reflect-presets";
  function normalizeEndpoint(raw) {
    const obj = raw && typeof raw === "object" ? raw : {};
    return {
      appId: String(obj.appId == null ? "" : obj.appId).trim(),
      guestId: String(obj.guestId == null ? "" : obj.guestId).trim(),
      preview: !!obj.preview
    };
  }
  function normalizeScopes(raw) {
    if (!Array.isArray(raw)) return [];
    const seen = /* @__PURE__ */ new Set();
    const out = [];
    for (const item of raw) {
      const key = String(item == null ? "" : item).trim();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push(key);
    }
    return out;
  }
  function normalizeReflectPreset(raw) {
    if (!raw || typeof raw !== "object") return null;
    const name = String(raw.name == null ? "" : raw.name).trim();
    if (!name) return null;
    const createdAt = typeof raw.createdAt === "string" && raw.createdAt ? raw.createdAt : (/* @__PURE__ */ new Date()).toISOString();
    return {
      name,
      createdAt,
      source: normalizeEndpoint(raw.source),
      target: normalizeEndpoint(raw.target),
      scopes: normalizeScopes(raw.scopes),
      applyDiffOnly: !!raw.applyDiffOnly,
      lookupMap: String(raw.lookupMap == null ? "" : raw.lookupMap),
      preserveTargetOnly: raw.preserveTargetOnly === void 0 ? true : !!raw.preserveTargetOnly,
      rolloutQueue: String(raw.rolloutQueue == null ? "" : raw.rolloutQueue)
    };
  }
  function buildReflectPresetsExport(presets) {
    const normalized = (Array.isArray(presets) ? presets : []).map(normalizeReflectPreset).filter((p) => p !== null);
    return {
      kind: REFLECT_PRESETS_EXPORT_KIND,
      exportedAt: (/* @__PURE__ */ new Date()).toISOString(),
      count: normalized.length,
      presets: normalized
    };
  }
  function normalizeImportedReflectPresets(parsed) {
    let rawList;
    if (Array.isArray(parsed)) {
      rawList = parsed;
    } else if (parsed && typeof parsed === "object") {
      if (parsed.kind && parsed.kind !== REFLECT_PRESETS_EXPORT_KIND) {
        return { presets: [], error: `この形式は反映プリセットとして認識できません（kind="${REFLECT_PRESETS_EXPORT_KIND}" を想定）` };
      }
      rawList = Array.isArray(parsed.presets) ? parsed.presets : null;
    } else {
      rawList = null;
    }
    if (!Array.isArray(rawList)) {
      return { presets: [], error: "プリセットJSONの形式が不正です（presets 配列が見つかりません）" };
    }
    const presets = rawList.map(normalizeReflectPreset).filter((p) => p !== null);
    return { presets };
  }
  function mergeReflectPresets(existing, incoming, limit = 30) {
    const base = (Array.isArray(existing) ? existing : []).map(normalizeReflectPreset).filter((p) => p !== null);
    const seenIncoming = /* @__PURE__ */ new Set();
    const incomingList = (Array.isArray(incoming) ? incoming : []).map(normalizeReflectPreset).filter((p) => p !== null).filter((p) => !seenIncoming.has(p.name) && !!seenIncoming.add(p.name));
    const incomingNames = new Set(incomingList.map((p) => p.name));
    let replaced = 0;
    const kept = [];
    for (const preset of base) {
      if (incomingNames.has(preset.name)) {
        replaced += 1;
        continue;
      }
      kept.push(preset);
    }
    const all = [...incomingList, ...kept];
    const merged = all.slice(0, Math.max(0, limit));
    return {
      presets: merged,
      added: incomingList.length - replaced,
      replaced,
      dropped: all.length - merged.length
    };
  }

  // src/entries/reflect-lite-ui.ts
  init_utils();
  var REFLECT_PRESET_LIMIT = 30;
  var STALE_RESULT_NOTICE = "直近の反映結果は現在の対象と異なるため表示していません。対象を戻すと表示されます。";
  var RESTORE_FIELD_SETTINGS_NOTE = "バックアップから戻している間はフィールド設定を追加できません。この項目を対象から外してください。";
  var memoryState = {
    presets: []
  };
  var SCOPE_QUICK_PRESETS = [
    { id: "all", label: "すべての項目", hint: "反映できる項目をすべて選びます" },
    {
      id: "formOnly",
      label: "フォームのみ",
      hint: "フィールド設定・レイアウト設定・ビュー設定を選びます",
      scopes: ["fieldSettings", "layoutSettings", "viewSettings"]
    },
    {
      id: "viewsOnly",
      label: "ビューとグラフ",
      hint: "ビュー設定とグラフ設定だけを選びます",
      scopes: ["viewSettings", "reportSettings"]
    },
    {
      id: "permsOnly",
      label: "権限のみ",
      hint: "アプリ・フィールド・レコードの権限だけを選びます",
      scopes: ["appAcl", "fieldAcl", "recordPermissions"]
    },
    {
      id: "notificationsOnly",
      label: "通知のみ",
      hint: "一般・条件・リマインダーの通知だけを選びます",
      scopes: ["notifications", "perRecordNotifications", "reminderNotifications"]
    },
    {
      id: "noPerms",
      label: "権限・通知を除外",
      hint: "権限と通知を除いた、すべての項目を選びます",
      exclude: ["appAcl", "fieldAcl", "recordPermissions", "notifications", "perRecordNotifications", "reminderNotifications"]
    }
  ];
  var RISKY_SCOPE_KEYS = /* @__PURE__ */ new Set([
    "appAcl",
    "fieldAcl",
    "recordPermissions",
    "notifications",
    "perRecordNotifications",
    "reminderNotifications",
    "processSettings"
  ]);
  var REFLECT_LITE_STYLE_ID = "kus-reflect-lite-styles";
  var REFLECT_LITE_CSS = `
#kus-reflect-lite.kus-lp--wide{width:min(960px,calc(100vw - 32px));max-height:calc(100dvh - 32px);top:16px;right:16px;border-radius:18px;border-color:#cbd5e1}
#kus-reflect-lite .kus-lp__hero{padding:16px 24px;background:#172033}
#kus-reflect-lite .kus-lp__title{font-size:22px;letter-spacing:-.01em;word-break:keep-all}
#kus-reflect-lite .kus-lp__card pre:empty{display:none!important}
#kus-reflect-lite .kus-lp__subtitle{font-size:14px;max-width:560px}
#kus-reflect-lite .kus-lp__body{padding:0;background:#f4f6f8;display:flex;flex-direction:column;overflow:hidden}
#kus-reflect-lite .kus-lp__hint{margin:0;padding:11px 24px;border:0;border-bottom:1px solid #e2e8f0;border-radius:0;background:#fff7ed;color:#9a3412}
#kus-reflect-lite .kus-lp__hint strong{color:#7c2d12}
#kus-reflect-lite .kus-lp__card{border-radius:16px;padding:16px 18px;box-shadow:0 1px 2px rgba(15,23,42,.04)}
#kus-reflect-lite .kus-lp__card-head{border:0;margin:0 0 12px;padding:0}
#kus-reflect-lite .kus-lp__card-title{font-size:13px;text-transform:none;letter-spacing:.01em;color:#172033}
#kus-reflect-lite .kus-lp__card-num{background:#172033;color:#fff}
#kus-reflect-lite .kus-rl-workspace{display:flex;flex-direction:column;min-height:0;flex:1}
#kus-reflect-lite .kus-rl-canvas{min-width:0;min-height:0;overflow:auto;padding:20px 24px;scroll-padding:16px}
#kus-reflect-lite .kus-rl-setup-grid{display:grid;grid-template-columns:minmax(0,1fr);gap:14px}
#kus-reflect-lite .kus-rl-setup-grid>.kus-lp__card{margin:0}
#kus-reflect-lite .kus-rl-setup-grid>.kus-rl-card--route,#kus-reflect-lite .kus-rl-setup-grid>.kus-rl-card--preset{grid-column:1/-1}
#kus-reflect-lite .kus-rl-route{display:grid;grid-template-columns:minmax(0,1fr) 48px minmax(0,1fr);align-items:stretch;gap:10px}
#kus-reflect-lite .kus-rl-endpoint{padding:13px;border:1px solid #e2e8f0;border-radius:13px;background:#f8fafc}
#kus-reflect-lite .kus-rl-endpoint--target{background:#fff7ed;border-color:#fed7aa}
#kus-reflect-lite .kus-rl-endpoint__eyebrow{margin-bottom:8px;font-size:12px;font-weight:800;letter-spacing:.08em;color:#64748b;text-transform:uppercase}
#kus-reflect-lite .kus-rl-endpoint--target .kus-rl-endpoint__eyebrow{color:#c2410c}
#kus-reflect-lite .kus-rl-endpoint .kus-lp__row{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,.8fr);gap:7px;margin:0}
#kus-reflect-lite .kus-rl-endpoint .kus-lp__input{width:100%;min-width:0;box-sizing:border-box}
#kus-reflect-lite .kus-rl-endpoint .kus-lp__select{width:100%;margin-bottom:8px}
#kus-reflect-lite .kus-rl-endpoint__note{font-size:12.5px;color:#9a3412;min-height:33px;margin-bottom:8px}
#kus-reflect-lite .kus-rl-field{display:flex;flex-direction:column;gap:4px;font-size:12.5px;font-weight:600;margin:8px 0}
#kus-reflect-lite .kus-rl-field .kus-lp__input{min-height:40px;font-size:14px}
#kus-reflect-lite .kus-rl-endpoint .kus-lp__file{width:100%;min-width:0;box-sizing:border-box;margin:12px 0}
#kus-reflect-lite .kus-rl-endpoint .kus-lp__check{margin:10px 0}
#kus-reflect-lite .kus-rl-scope-groups{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-top:14px}
#kus-reflect-lite .kus-rl-scope-group{min-width:0;margin:0;padding:10px;border:1px solid #e2e8f0;border-radius:10px}
#kus-reflect-lite .kus-rl-scope-group legend{font-size:12.5px;font-weight:700;color:#475569;padding:0 4px}
#kus-reflect-lite .kus-rl-scope-group .kus-lp__chips{display:flex;flex-direction:column;align-items:stretch}
#kus-reflect-lite .kus-rl-scope-group .kus-lp__chip{border-radius:6px;white-space:normal;min-height:32px}
#kus-reflect-lite .kus-rl-detail-row{display:flex;flex-wrap:wrap;align-items:center;gap:8px 12px}
#kus-reflect-lite .kus-rl-detail-summary{flex:1 1 220px;min-width:0;overflow-wrap:anywhere;font-size:13px;line-height:1.5;color:#475569}
#kus-reflect-lite .kus-rl-detail-summary--warn{color:#9a3412;font-weight:700}
#kus-reflect-lite .kus-rl-detail-status[hidden]{display:none}
#kus-reflect-lite .kus-lp__dialog .kus-lp__card--soft{box-shadow:none}
#kus-reflect-lite [hidden]{display:none!important}
#kus-reflect-lite :is(button,input,select,summary):focus-visible{outline:3px solid #2563eb;outline-offset:3px}
#kus-reflect-lite .kus-rl-route-arrow{display:flex;align-items:center;justify-content:center;color:#dc2626;font-size:22px;font-weight:800}
#kus-reflect-lite .kus-rl-route-utility{margin-top:10px!important;padding-top:10px;border-top:1px dashed #e2e8f0}
#kus-reflect-lite .kus-rl-review{display:flex;flex-direction:column;gap:10px}
#kus-reflect-lite .kus-rl-review-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
#kus-reflect-lite .kus-rl-stat{padding:10px 12px;border:1px solid #e2e8f0;border-radius:10px;background:#fff}
#kus-reflect-lite .kus-rl-stat__label{font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px}
#kus-reflect-lite .kus-rl-stat__value{font-size:14px;font-weight:700;color:#0f172a;word-break:break-word}
#kus-reflect-lite .kus-rl-stat__meta{margin-top:4px;font-size:12.5px;line-height:1.5;color:#64748b}
#kus-reflect-lite .kus-rl-pills{display:flex;flex-wrap:wrap;gap:6px}
#kus-reflect-lite .kus-rl-pill{display:inline-flex;align-items:center;gap:4px;padding:3px 8px;border-radius:999px;font-size:12.5px;font-weight:700;border:1px solid #e2e8f0;background:#fff;color:#334155}
#kus-reflect-lite .kus-rl-pill--change{background:#fff7ed;border-color:#fdba74;color:#9a3412}
#kus-reflect-lite .kus-rl-pill--same{background:#ecfdf5;border-color:#a7f3d0;color:#065f46}
#kus-reflect-lite .kus-rl-pill--error{background:#fef2f2;border-color:#fca5a5;color:#991b1b}
#kus-reflect-lite .kus-rl-pill--stale{background:#eff6ff;border-color:#93c5fd;color:#1d4ed8}
#kus-reflect-lite .kus-rl-next{padding:10px 12px;border-radius:10px;font-size:13px;line-height:1.6;border:1px solid #e2e8f0;background:#fff;overflow-wrap:anywhere}
#kus-reflect-lite .kus-rl-next strong{display:block;margin-bottom:2px}
#kus-reflect-lite .kus-rl-next--ok{background:#ecfdf5;border-color:#a7f3d0;color:#065f46}
#kus-reflect-lite .kus-rl-next--info{background:#eff6ff;border-color:#bfdbfe;color:#1e3a8a}
#kus-reflect-lite .kus-rl-next--warn{background:#fffbeb;border-color:#fde68a;color:#92400e}
#kus-reflect-lite .kus-rl-issues{margin:0;padding-left:18px;font-size:13px;line-height:1.6;color:#92400e;overflow-wrap:anywhere}
#kus-reflect-lite .kus-rl-issues li+li{margin-top:3px}
#kus-reflect-lite .kus-rl-quiet{font-size:13px;color:#64748b}
#kus-reflect-lite .kus-rl-lookup-status{margin-top:6px;font-size:13px;color:#475569}
#kus-reflect-lite .kus-rl-lookup-status--err{color:#b91c1c;font-weight:700}
#kus-reflect-lite .kus-rl-preset-name{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:6px;align-items:center;margin-bottom:8px}
#kus-reflect-lite .kus-rl-preset-name .kus-lp__input{width:100%;min-width:0;box-sizing:border-box}
#kus-reflect-lite .kus-rl-dock-reason{color:#9a3412;font-weight:600}
#kus-reflect-lite .kus-rl-preview-summary{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px}
#kus-reflect-lite .kus-rl-preview-tools{display:flex;flex-direction:column;gap:8px;margin-bottom:10px}
#kus-reflect-lite .kus-rl-preview-tools__actions{display:flex;flex-wrap:wrap;gap:6px}
#kus-reflect-lite .kus-rl-preview-empty{padding:14px 12px;border:1px dashed #cbd5e1;border-radius:10px;background:#f8fafc;font-size:13px;color:#64748b}
#kus-reflect-lite .kus-rl-preview-group{border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;background:#fff;margin-bottom:10px}
#kus-reflect-lite .kus-rl-preview-group__head{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:9px 12px;background:#f8fafc;border-bottom:1px solid #e2e8f0;font-size:13px;font-weight:700;color:#334155}
#kus-reflect-lite .kus-rl-preview-list{display:flex;flex-direction:column;gap:8px;padding:10px}
#kus-reflect-lite .kus-rl-preview-row{border:1px solid #e2e8f0;border-radius:10px;padding:10px;background:#fff;overflow-wrap:anywhere}
#kus-reflect-lite .kus-rl-preview-row--change{border-color:#fdba74;background:#fffaf0}
#kus-reflect-lite .kus-rl-preview-row--same{border-color:#bbf7d0;background:#f0fdf4}
#kus-reflect-lite .kus-rl-preview-row--error{border-color:#fca5a5;background:#fff5f5}
#kus-reflect-lite .kus-rl-preview-row__head{display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:6px}
#kus-reflect-lite .kus-rl-preview-row__title{font-size:13px;font-weight:700;color:#0f172a}
#kus-reflect-lite .kus-rl-preview-row__detail{font-size:13px;line-height:1.6;color:#475569}
#kus-reflect-lite .kus-rl-preview-row__meta{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}
#kus-reflect-lite .kus-rl-preview-row__actions{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}
#kus-reflect-lite .kus-rl-preview-row__state{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}
#kus-reflect-lite .kus-rl-preview-mini{display:inline-flex;align-items:center;padding:2px 7px;border-radius:999px;background:#fff;border:1px solid #e2e8f0;font-size:12px;font-weight:700;color:#475569}
#kus-reflect-lite .kus-rl-nav{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;padding:10px 24px;background:#fff;border-bottom:1px solid #e2e8f0;flex-shrink:0}
#kus-reflect-lite .kus-rl-nav__btn{appearance:none;width:100%;border:1px solid transparent;border-radius:10px;background:transparent;color:#64748b;padding:10px;cursor:pointer;font-family:inherit;font-size:13px;font-weight:700;display:grid;grid-template-columns:24px 1fr;align-items:center;gap:9px;text-align:left}
#kus-reflect-lite .kus-rl-nav__btn:hover{background:#f1f5f9;color:#172033}
#kus-reflect-lite .kus-rl-nav__btn[aria-selected="true"]{background:#fff7ed;color:#9a3412;border-color:#fed7aa}
#kus-reflect-lite .kus-rl-nav__num{display:inline-flex;width:19px;height:19px;align-items:center;justify-content:center;border-radius:50%;background:#e2e8f0;color:#475569;font-size:11.5px}
#kus-reflect-lite .kus-rl-nav__btn[aria-selected="true"] .kus-rl-nav__num{background:#fee2e2;color:#b91c1c}
#kus-reflect-lite .kus-rl-nav__copy{display:block;font-size:11px;font-weight:500;color:#94a3b8;margin-top:2px}
#kus-reflect-lite .kus-rl-nav__btn[aria-selected="true"] .kus-rl-nav__copy{color:#64748b}
#kus-reflect-lite .kus-rl-stage[hidden]{display:none}
#kus-reflect-lite .kus-rl-stage-head{margin:0 2px 16px}
#kus-reflect-lite .kus-rl-stage-head h2{margin:0;font-size:20px;letter-spacing:-.02em;color:#0f172a}
#kus-reflect-lite .kus-rl-stage-head p{margin:4px 0 0;font-size:13px;color:#64748b}
#kus-reflect-lite .kus-rl-action-dock{flex-shrink:0;padding:12px 24px;background:#fff;border-top:1px solid #e2e8f0}
#kus-reflect-lite .kus-rl-dock-row{display:flex;align-items:center;gap:10px}
#kus-reflect-lite .kus-rl-dock-copy{flex:1;min-width:0;font-size:13px;color:#475569;overflow-wrap:anywhere}
#kus-reflect-lite .kus-rl-dock-copy strong{display:block;color:#0f172a}
#kus-reflect-lite .kus-rl-dock-msg{display:block}
#kus-reflect-lite .kus-rl-dock-actions{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end}
#kus-reflect-lite .kus-rl-dock-actions .kus-lp__btn{min-height:42px}
#kus-reflect-lite .kus-rl-action-dock .kus-lp__result{max-height:80px;overflow:auto}
#kus-reflect-lite .kus-rl-action-dock .kus-lp__status-text{max-height:48px;overflow:auto}
#kus-reflect-lite .kus-rl-action-dock .kus-lp__status{margin-top:8px}
#kus-reflect-lite .kus-rl-stage .kus-lp__card:last-child{margin-bottom:0}
#kus-reflect-lite .kus-rl-confirm-route{display:grid;gap:8px;margin-bottom:12px}
#kus-reflect-lite .kus-rl-confirm-route>div{padding:12px;border-radius:10px;border:1px solid #cbd5e1;background:#f8fafc;overflow-wrap:anywhere}
#kus-reflect-lite .kus-rl-confirm-route>div:last-child{border:2px solid #ea580c;background:#fff7ed}
#kus-reflect-lite .kus-rl-confirm-route span{display:block;font-size:12.5px;color:#64748b;margin-bottom:4px}
#kus-reflect-lite .kus-rl-changes{margin-top:10px;font-size:13px;min-width:0}
#kus-reflect-lite .kus-rl-changes summary{cursor:pointer;padding:8px 0;font-weight:700}
#kus-reflect-lite .kus-rl-change{border-top:1px solid #cbd5e1;padding:10px 0;overflow-wrap:anywhere}
#kus-reflect-lite .kus-rl-change[data-kind="削除"]>strong{color:#b91c1c}
#kus-reflect-lite .kus-rl-change__values{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:8px}
#kus-reflect-lite .kus-rl-change__values>div{min-width:0;background:#fff;border:1px solid #e2e8f0;border-radius:6px;padding:8px}
#kus-reflect-lite .kus-rl-change__values span{font-size:11.5px;color:#64748b}
#kus-reflect-lite .kus-rl-change__values pre{margin:4px 0 0;white-space:pre-wrap;overflow-wrap:anywhere;font:12.5px/1.6 ui-monospace,monospace}
#kus-reflect-lite .kus-rl-nav__btn:disabled{opacity:.45;cursor:not-allowed}
#kus-reflect-lite .kus-rl-app-note{margin:-2px 0 8px;min-height:18px;font-size:13px;line-height:1.5;color:#64748b;overflow-wrap:anywhere}
#kus-reflect-lite .kus-rl-app-note--ok{color:#065f46;font-weight:600}
#kus-reflect-lite .kus-rl-app-note--warn{color:#b91c1c;font-weight:700}
#kus-reflect-lite .kus-rl-scope-group .kus-lp__chip{display:flex;align-items:center;gap:6px}
#kus-reflect-lite .kus-rl-chip__badge{margin-left:auto;flex:none;padding:0 6px;border:1px solid #fb923c;border-radius:4px;background:#fff7ed;color:#9a3412;font-size:11.5px;font-weight:800;line-height:16px;letter-spacing:.04em}
#kus-reflect-lite .kus-rl-scope-notice{margin:10px 0 0}
#kus-reflect-lite .kus-rl-scope-option{margin-top:12px;padding:10px 12px;border:1px solid #e2e8f0;border-radius:10px;background:#f8fafc}
#kus-reflect-lite .kus-rl-scope-option__title{margin-bottom:6px;font-size:12.5px;font-weight:700;color:#475569}
#kus-reflect-lite .kus-rl-scope-option .kus-lp__check{margin:0}
#kus-reflect-lite .kus-rl-scope-option__help{margin:4px 0 0 22px;font-size:13px;line-height:1.5;color:#475569}
#kus-reflect-lite .kus-rl-scope-option__help--warn{color:#9a3412;font-weight:700}
#kus-reflect-lite .kus-rl-scope-help{margin:6px 0 0;display:grid;gap:8px;font-size:13px;line-height:1.55}
#kus-reflect-lite .kus-rl-scope-help dt{display:flex;flex-wrap:wrap;align-items:center;gap:6px;font-weight:700;color:#0f172a}
#kus-reflect-lite .kus-rl-scope-help dd{margin:2px 0 0;color:#475569}
#kus-reflect-lite .kus-rl-fix{display:flex;flex-direction:column;align-items:flex-start;gap:6px}
#kus-reflect-lite .kus-rl-fix__note{font-size:13px;color:#475569}
#kus-reflect-lite .kus-rl-summary{margin:0 0 12px;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;background:#fff}
#kus-reflect-lite .kus-rl-summary__title{display:flex;flex-wrap:wrap;align-items:baseline;gap:4px 10px;padding:9px 12px;background:#f8fafc;border-bottom:1px solid #e2e8f0;font-size:13px;color:#475569}
#kus-reflect-lite .kus-rl-summary__title strong{color:#0f172a}
#kus-reflect-lite .kus-rl-summary__table{width:100%;border-collapse:collapse;font-size:13px}
#kus-reflect-lite .kus-rl-summary__table th{padding:7px 10px;text-align:left;font-size:12.5px;font-weight:700;color:#475569;background:#fff;border-bottom:1px solid #e2e8f0;white-space:nowrap}
#kus-reflect-lite .kus-rl-summary__table td{padding:8px 10px;border-top:1px solid #f1f5f9;vertical-align:middle;overflow-wrap:anywhere}
#kus-reflect-lite .kus-rl-summary__table tbody tr{cursor:pointer}
#kus-reflect-lite .kus-rl-summary__table tbody tr:hover{background:#f8fafc}
#kus-reflect-lite .kus-rl-summary__table th.kus-rl-summary__num,#kus-reflect-lite .kus-rl-summary__table td.kus-rl-summary__num{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}
#kus-reflect-lite .kus-rl-summary__link{appearance:none;border:0;background:none;padding:2px 0;font:inherit;font-weight:700;color:#1d4ed8;text-align:left;text-decoration:underline;cursor:pointer}
#kus-reflect-lite .kus-rl-preview-row{scroll-margin-top:8px}
#kus-reflect-lite .kus-rl-preview-row--focus{box-shadow:0 0 0 3px #93c5fd}
#kus-reflect-lite .kus-rl-result-heading{margin-top:10px;font-size:12.5px;font-weight:700;color:#475569}
#kus-reflect-lite .kus-rl-result-list{list-style:none;margin:6px 0 0;padding:0;display:flex;flex-direction:column;gap:6px}
#kus-reflect-lite .kus-rl-result-item{min-width:0;padding:8px 10px;border:1px solid #e2e8f0;border-radius:10px;background:#fff;overflow-wrap:anywhere}
#kus-reflect-lite .kus-rl-result-item--ok{border-color:#a7f3d0}
#kus-reflect-lite .kus-rl-result-item--ng{border-color:#fca5a5;background:#fff5f5}
#kus-reflect-lite .kus-rl-result-item--pending{border-color:#fde68a;background:#fffbeb}
#kus-reflect-lite .kus-rl-result-item__head{display:flex;flex-wrap:wrap;align-items:center;gap:4px 8px;font-size:13px}
#kus-reflect-lite .kus-rl-result-state{display:inline-flex;align-items:center;gap:4px;padding:1px 8px;border:1px solid #cbd5e1;border-radius:999px;background:#f8fafc;font-size:12.5px;font-weight:700;color:#475569}
#kus-reflect-lite .kus-rl-result-state--ok{border-color:#a7f3d0;background:#ecfdf5;color:#065f46}
#kus-reflect-lite .kus-rl-result-state--ng{border-color:#fca5a5;background:#fef2f2;color:#991b1b}
#kus-reflect-lite .kus-rl-result-state--pending{border-color:#fde68a;background:#fffbeb;color:#92400e}
#kus-reflect-lite .kus-rl-result-item__message{margin-top:6px;font-size:13px;line-height:1.6;color:#334155;white-space:pre-wrap;overflow-wrap:anywhere}
#kus-reflect-lite .kus-rl-result-item__hint{margin-top:4px;font-size:13px;line-height:1.5;font-weight:600;color:#9a3412}
#kus-reflect-lite .kus-rl-undo{margin:10px 0 0}
#kus-reflect-lite .kus-rl-items{margin:8px 0 6px;padding:10px 12px;border:1px solid #e2e8f0;border-radius:10px;background:#fff}
#kus-reflect-lite .kus-rl-items__title{display:flex;flex-wrap:wrap;align-items:baseline;gap:2px 10px;margin-bottom:8px;font-size:13px;color:#475569}
#kus-reflect-lite .kus-rl-items__title strong{font-size:13px;color:#0f172a}
#kus-reflect-lite .kus-rl-items__list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:7px}
#kus-reflect-lite .kus-rl-item{display:grid;grid-template-columns:auto minmax(0,1fr);column-gap:8px;row-gap:2px;align-items:baseline;font-size:13px;line-height:1.55;overflow-wrap:anywhere}
#kus-reflect-lite .kus-rl-item__name{min-width:0;font-weight:700;color:#0f172a}
#kus-reflect-lite .kus-rl-item__details{grid-column:2;margin:0;padding-left:16px;font-size:13px;color:#475569}
#kus-reflect-lite .kus-rl-item--keep .kus-rl-item__name{font-weight:600;color:#475569}
#kus-reflect-lite .kus-rl-kind{display:inline-block;min-width:36px;padding:0 6px;border:1px solid #cbd5e1;border-radius:4px;background:#f1f5f9;color:#475569;font-size:12px;font-weight:800;line-height:18px;letter-spacing:.04em;text-align:center}
#kus-reflect-lite .kus-rl-kind--delete{border-color:#fca5a5;background:#fef2f2;color:#991b1b}
#kus-reflect-lite .kus-rl-kind--change{border-color:#fdba74;background:#fff7ed;color:#9a3412}
#kus-reflect-lite .kus-rl-kind--add{border-color:#86efac;background:#f0fdf4;color:#166534}
#kus-reflect-lite .kus-rl-items--quiet{padding:0 12px;border-style:dashed;background:#f8fafc}
#kus-reflect-lite .kus-rl-items--quiet>summary{cursor:pointer;padding:8px 0;font-size:13px;font-weight:700;color:#64748b}
#kus-reflect-lite .kus-rl-items--quiet[open]>summary{margin-bottom:6px}
#kus-reflect-lite .kus-rl-items--quiet .kus-rl-items__list{padding-bottom:10px}
#kus-reflect-lite .kus-rl-items__more{margin-top:8px}
#kus-reflect-lite .kus-rl-uploads{margin:8px 0 6px;padding:9px 12px;border:1px solid #bfdbfe;border-radius:10px;background:#eff6ff;font-size:13px;line-height:1.55;color:#1e3a8a;overflow-wrap:anywhere}
#kus-reflect-lite .kus-rl-uploads ul{margin:4px 0 0;padding-left:18px}
#kus-reflect-lite .kus-rl-pending{display:flex;flex-wrap:wrap;gap:2px 8px;margin:0;padding:8px 12px;border-radius:10px;font-size:13px;line-height:1.55;overflow-wrap:anywhere}
#kus-reflect-lite .kus-rl-pending--clean{border:1px solid #bbf7d0;background:#f0fdf4;color:#065f46}
#kus-reflect-lite .kus-rl-pending--unknown{border:1px dashed #cbd5e1;background:#f8fafc;color:#475569}
#kus-reflect-lite .kus-rl-restore-notice{margin:0}
#kus-reflect-lite .kus-rl-progress__summary{margin:0 0 6px;font-size:13px;font-weight:700;color:#334155}
#kus-reflect-lite .kus-rl-result-item--running{border-color:#93c5fd;background:#eff6ff}
#kus-reflect-lite .kus-rl-result-state--running{border-color:#93c5fd;background:#dbeafe;color:#1e40af}
#kus-reflect-lite .kus-rl-confirm-entry{margin-top:12px;padding-top:10px;border-top:1px solid #cbd5e1}
#kus-reflect-lite .kus-rl-confirm-entry h3{margin:0 0 6px;font-size:14px;color:#0f172a}
#kus-reflect-lite .kus-rl-confirm-heading{margin:10px 0 4px;font-size:13px;font-weight:700;color:#991b1b}
#kus-reflect-lite .kus-rl-rollout__input{width:100%;min-width:0;box-sizing:border-box;min-height:84px}
#kus-reflect-lite .kus-rl-rollout__status{margin-top:6px;font-size:13px;line-height:1.5;color:#475569;overflow-wrap:anywhere}
#kus-reflect-lite .kus-rl-rollout__status--err{color:#b91c1c;font-weight:700}
#kus-reflect-lite .kus-rl-rollout-card .kus-rl-next{margin-bottom:8px}
#kus-reflect-lite .kus-rl-rollout-heading{margin-top:12px;font-size:12.5px;font-weight:700;color:#475569}
#kus-reflect-lite .kus-rl-rollout-list{list-style:none;margin:6px 0 0;padding:0;display:flex;flex-direction:column;gap:6px;max-height:min(420px,50vh);overflow-y:auto}
#kus-reflect-lite .kus-rl-rollout-item{min-width:0;padding:8px 10px;border:1px solid #e2e8f0;border-radius:10px;background:#fff;overflow-wrap:anywhere}
#kus-reflect-lite .kus-rl-rollout-item--ng{border-color:#fca5a5;background:#fff5f5}
#kus-reflect-lite .kus-rl-rollout-item--pending{border-color:#fde68a;background:#fffbeb}
#kus-reflect-lite .kus-rl-rollout-item__head{display:flex;flex-wrap:wrap;align-items:center;gap:4px 8px;font-size:13px}
#kus-reflect-lite .kus-rl-rollout-card .kus-rl-next[hidden]{display:none}
@media(max-width:760px){
  #kus-reflect-lite .kus-rl-summary__table,#kus-reflect-lite .kus-rl-summary__table tbody{display:block}
  #kus-reflect-lite .kus-rl-summary__table thead{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
  #kus-reflect-lite .kus-rl-summary__table tbody tr{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:4px 8px;padding:10px 12px;border-top:1px solid #e2e8f0}
  #kus-reflect-lite .kus-rl-summary__table tbody tr:first-child{border-top:0}
  #kus-reflect-lite .kus-rl-summary__table td{display:block;padding:0;border:0;min-width:0}
  #kus-reflect-lite .kus-rl-summary__table td.kus-rl-summary__name{grid-column:1/5}
  #kus-reflect-lite .kus-rl-summary__table td.kus-rl-summary__status{grid-column:5/7;justify-self:end}
  #kus-reflect-lite .kus-rl-summary__table td.kus-rl-summary__num{grid-column:span 2;text-align:left}
  #kus-reflect-lite .kus-rl-summary__table td.kus-rl-summary__how,#kus-reflect-lite .kus-rl-summary__table td.kus-rl-summary__sel{grid-column:1/-1}
  #kus-reflect-lite .kus-rl-summary__table td.kus-rl-summary__num::before,#kus-reflect-lite .kus-rl-summary__table td.kus-rl-summary__how::before{content:attr(data-label) " ";font-size:12px;font-weight:700;color:#64748b}
}
@media(max-width:720px){
  #kus-reflect-lite .kus-rl-change__values{grid-template-columns:1fr}
  #kus-reflect-lite .kus-rl-nav__num{display:none}

  #kus-reflect-lite.kus-lp--wide{width:calc(100vw - 16px);right:8px;top:8px;max-height:calc(100dvh - 16px)}
  #kus-reflect-lite .kus-lp__hero{padding:12px 16px}
  #kus-reflect-lite .kus-lp__hint,#kus-reflect-lite .kus-lp__badge-row{display:none}
  #kus-reflect-lite .kus-rl-nav{padding:8px;gap:4px}
  #kus-reflect-lite .kus-rl-nav::before,#kus-reflect-lite .kus-rl-nav__copy{display:none}
  #kus-reflect-lite .kus-rl-nav__btn{display:flex;justify-content:center;text-align:center;padding:8px 4px;font-size:12.5px}
  #kus-reflect-lite .kus-rl-nav__btn+.kus-rl-nav__btn{margin:0}
  #kus-reflect-lite .kus-rl-canvas{padding:18px 16px 8px}
  #kus-reflect-lite .kus-rl-setup-grid{grid-template-columns:1fr}
  #kus-reflect-lite .kus-rl-setup-grid>*{grid-column:1!important}
  #kus-reflect-lite .kus-rl-route{grid-template-columns:1fr}
  #kus-reflect-lite .kus-rl-route-arrow{height:24px;transform:rotate(90deg)}
  #kus-reflect-lite .kus-rl-action-dock{padding:12px 16px 15px}
  #kus-reflect-lite .kus-rl-review-grid{grid-template-columns:1fr}
  #kus-reflect-lite .kus-rl-scope-groups{grid-template-columns:1fr}
  #kus-reflect-lite .kus-rl-dock-row{align-items:stretch;flex-direction:column;gap:8px}
  #kus-reflect-lite .kus-rl-dock-actions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px}
  #kus-reflect-lite .kus-rl-dock-actions .kus-lp__btn{min-width:0;white-space:normal}
  #kus-reflect-lite .kus-rl-dock-actions .kus-lp__btn--danger,#kus-reflect-lite .kus-rl-dock-actions .kus-lp__btn--primary{grid-column:1/-1}
  #kus-reflect-lite .kus-lp__card{padding:12px}
  #kus-reflect-lite .kus-lp__card-head{flex-wrap:wrap}
  #kus-reflect-lite .kus-lp__select{min-width:0!important;max-width:100%}
}
/* 幅が狭いとき、経過時間の表示がタイトルを折り返させないよう省く（処理中は上端のバーと下のステータスで分かる）。 */
@media(max-width:400px){#kus-reflect-lite .kus-lp__elapsed{display:none}}
/* 低い画面（スマートフォンの横向き・小さなノート PC など）では、固定フッターと見出しを詰めて本文の領域を確保する。 */
@media(max-height:720px){
  #kus-reflect-lite .kus-lp__hero{padding:8px 16px}
  #kus-reflect-lite .kus-lp__title{font-size:17px}
  #kus-reflect-lite .kus-lp__subtitle{display:none}
  #kus-reflect-lite .kus-rl-nav{padding:6px 12px}
  #kus-reflect-lite .kus-rl-nav__btn{padding:6px 4px}
  #kus-reflect-lite .kus-rl-nav__copy{display:none}
  #kus-reflect-lite .kus-rl-canvas{padding:12px 16px 8px}
  #kus-reflect-lite .kus-rl-stage-head{margin-bottom:10px}
  #kus-reflect-lite .kus-rl-stage-head h2{font-size:17px}
  #kus-reflect-lite .kus-rl-stage-head p{display:none}
  #kus-reflect-lite .kus-rl-action-dock{padding:8px 16px 10px}
  #kus-reflect-lite .kus-rl-dock-row{gap:6px}
  #kus-reflect-lite .kus-rl-dock-copy{font-size:12.5px;line-height:1.4}
  #kus-reflect-lite .kus-rl-dock-copy strong,#kus-reflect-lite .kus-rl-dock-msg{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden}
  #kus-reflect-lite .kus-rl-dock-actions{gap:4px 6px}
  #kus-reflect-lite .kus-rl-dock-actions .kus-lp__btn{min-height:36px;padding:6px 10px}
  #kus-reflect-lite .kus-rl-action-dock .kus-lp__status{margin-top:6px;padding:6px 10px;min-height:0;line-height:1.4}
  #kus-reflect-lite .kus-rl-action-dock .kus-lp__status-text{max-height:2.9em}
  #kus-reflect-lite .kus-rl-action-dock .kus-lp__result{max-height:48px}
}
/* 低くて幅のある画面（横向きのタブレットなど）では、フッターの説明と操作を 1 行に並べて高さを節約する。 */
@media(max-height:720px) and (min-width:560px){
  #kus-reflect-lite .kus-rl-dock-row{flex-direction:row;align-items:center;gap:10px}
  #kus-reflect-lite .kus-rl-dock-actions{display:flex;flex-wrap:nowrap;justify-content:flex-end;flex:none}
  #kus-reflect-lite .kus-rl-dock-actions .kus-lp__btn{white-space:nowrap}
}
/* とても低い画面（高さ 560px 以下。横向きのスマートフォン・小さなウィンドウ）では、見出し・案内・ステップ・フッターを 1 行ずつに詰めて、本文（最終確認の書き込み先と変更内容など）に高さを回す。 */
@media(max-height:560px){
  #kus-reflect-lite .kus-lp__hero{padding:5px 12px}
  #kus-reflect-lite .kus-lp__hero-main{display:flex;flex-wrap:wrap;align-items:center;gap:2px 10px}
  #kus-reflect-lite .kus-lp__title{font-size:15px}
  #kus-reflect-lite .kus-lp__badge-row{margin-top:0}
  #kus-reflect-lite .kus-lp__badge{padding:1px 8px;font-size:11.5px}
  #kus-reflect-lite .kus-lp__hint{display:none}
  #kus-reflect-lite .kus-rl-nav{padding:3px 12px;gap:4px}
  #kus-reflect-lite .kus-rl-nav__btn{padding:3px 4px;font-size:12px;line-height:1.3;white-space:nowrap}
  #kus-reflect-lite .kus-rl-nav__num{display:none}
  #kus-reflect-lite .kus-rl-canvas{padding:8px 12px 6px}
  #kus-reflect-lite .kus-lp__card{padding:10px 12px}
  #kus-reflect-lite .kus-rl-confirm-route{gap:4px;margin-bottom:8px}
  #kus-reflect-lite .kus-rl-confirm-route>div{padding:6px 10px}
  #kus-reflect-lite .kus-rl-confirm-route span{display:inline;margin:0 8px 0 0;font-size:12px}
  #kus-reflect-lite .kus-rl-stage-head{margin:0 2px 8px}
  #kus-reflect-lite .kus-rl-stage-head h2{font-size:15px}
  #kus-reflect-lite .kus-rl-action-dock{padding:5px 12px 6px}
  #kus-reflect-lite .kus-rl-dock-row{gap:4px}
  #kus-reflect-lite .kus-rl-dock-copy{font-size:12px;line-height:1.35}
  #kus-reflect-lite .kus-rl-dock-copy strong,#kus-reflect-lite .kus-rl-dock-msg{-webkit-line-clamp:1}
  #kus-reflect-lite .kus-rl-dock-actions .kus-lp__btn{min-height:32px;padding:4px 10px}
  #kus-reflect-lite .kus-rl-action-dock .kus-lp__status{margin-top:4px;padding:3px 8px;font-size:12px;line-height:1.35}
  #kus-reflect-lite .kus-rl-action-dock .kus-lp__status-text{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:1;overflow:hidden;max-height:none}
  #kus-reflect-lite .kus-rl-action-dock .kus-lp__status--warn .kus-lp__status-text,#kus-reflect-lite .kus-rl-action-dock .kus-lp__status--err .kus-lp__status-text{-webkit-line-clamp:2}
}
/* 低くて幅の狭い画面では、操作ボタンを折り返しながら詰めて並べる（主操作だけが全幅の行を取らない）。 */
@media(max-height:560px) and (max-width:559px){
  #kus-reflect-lite .kus-rl-dock-actions{display:flex;flex-wrap:wrap;justify-content:stretch;gap:4px}
  #kus-reflect-lite .kus-rl-dock-actions .kus-lp__btn{flex:0 1 auto;grid-column:auto;min-width:0;font-size:12.5px;line-height:1.3}
  #kus-reflect-lite .kus-rl-dock-actions .kus-lp__btn--primary,#kus-reflect-lite .kus-rl-dock-actions .kus-lp__btn--danger{flex:1 1 140px}
  #kus-reflect-lite .kus-rl-nav__btn{font-size:11.5px;padding:3px 2px}
}
@media(prefers-reduced-motion:reduce){#kus-reflect-lite{animation:none}#kus-reflect-lite *{scroll-behavior:auto!important}}
`;
  function ensureReflectLiteStyles() {
    if (document.getElementById(REFLECT_LITE_STYLE_ID)) return;
    const st = document.createElement("style");
    st.id = REFLECT_LITE_STYLE_ID;
    st.textContent = REFLECT_LITE_CSS;
    document.head.appendChild(st);
  }
  function mountReflectLitePanel() {
    const running = document.getElementById("kus-reflect-lite");
    if (running?.getAttribute("aria-busy") === "true") {
      running.setAttribute("tabindex", "-1");
      running.focus({ preventScroll: true });
      return;
    }
    ensureReflectLiteStyles();
    if (memoryState.lastPreview?.restore) memoryState.lastPreview = null;
    const panel = createLitePanel({
      id: "kus-reflect-lite",
      title: "プレビュー反映",
      subtitle: "反映元アプリの設定を、反映先アプリのプレビューへまとめて反映します。",
      accent: "reflect",
      badges: [{ label: "プレビューへ書き込み", tone: "preview" }],
      hint: "<strong>反映先のプレビューだけを変更します。</strong>本番への公開は kintone の設定画面で行います。差分を確認してから反映します。",
      wide: true
    });
    let pendingNotice = "";
    const rawSetStatus = panel.setStatus;
    const detailStatus = document.createElement("div");
    detailStatus.className = "kus-lp__note kus-rl-detail-status";
    detailStatus.setAttribute("role", "status");
    detailStatus.setAttribute("aria-live", "polite");
    detailStatus.setAttribute("aria-atomic", "true");
    detailStatus.hidden = true;
    panel.setStatus = (msg, tone) => {
      const notice = pendingNotice;
      pendingNotice = "";
      const text = notice && msg ? `${notice} ${msg}` : msg;
      rawSetStatus(text, tone);
      detailStatus.textContent = text || "";
      detailStatus.className = `${tone === "warn" || tone === "err" ? "kus-lp__note--warn" : "kus-lp__note"} kus-rl-detail-status`;
      detailStatus.hidden = !text;
    };
    function holdNoticeForNextStatus(notice) {
      pendingNotice = notice;
      window.setTimeout(() => {
        if (pendingNotice === notice) pendingNotice = "";
      }, 0);
    }
    const runLite = (busyMsg, fn, okMsg) => liteRun(panel, busyMsg, async () => {
      panel.setResult("");
      return fn();
    }, okMsg);
    let showWorkflowStage = () => {
    };
    let refreshWorkflow = () => {
    };
    let busy = false;
    let sourceMode = "app";
    let restoreMode = null;
    const srcApp = makeInput({ placeholder: "反映元アプリID", value: memoryState.sourceAppId || "", width: "id" });
    const srcGuest = makeInput({ placeholder: "ゲストID", value: memoryState.sourceGuestId || "", width: "guest" });
    const pageGuestId = () => guestIdFromPagePath(window.location?.pathname || "");
    const defaultsToCurrentApp = !memoryState.targetAppId && !!DEFAULT_APP_ID;
    const tgtApp = makeInput({ placeholder: "反映先アプリID", value: memoryState.targetAppId || DEFAULT_APP_ID || "", width: "id" });
    const tgtGuest = makeInput({ placeholder: "ゲストID", value: defaultsToCurrentApp ? pageGuestId() : memoryState.targetGuestId || "", width: "guest" });
    const appLookupCache = createReflectAppLookupCache();
    const APP_LOOKUP_DELAY_MS = 350;
    function createAppNote(appInput, guestInput, isActive, onResolved) {
      const el = document.createElement("div");
      el.className = "kus-rl-app-note";
      el.setAttribute("aria-live", "polite");
      let key = "\0";
      let seq = 0;
      let timer;
      let known = null;
      let failed = false;
      const paint = (text, tone = "") => {
        el.textContent = text;
        el.classList.toggle("kus-rl-app-note--ok", tone === "ok");
        el.classList.toggle("kus-rl-app-note--warn", tone === "warn");
      };
      const show = (info, open) => {
        known = info;
        failed = false;
        paint(`✓ ${formatReflectAppName(info)}${open ? " · 開いているアプリ" : ""}`, "ok");
        onResolved();
      };
      function refresh() {
        const appId = appInput.value.trim();
        const guest = guestInput.value.trim();
        const active2 = isActive() && isLookupableReflectApp(appId, guest);
        const nextKey = active2 ? `${guest}|${appId}` : "";
        if (nextKey === key) return;
        key = nextKey;
        seq += 1;
        known = null;
        failed = false;
        window.clearTimeout(timer);
        if (!active2) {
          paint("");
          return;
        }
        const open = !!DEFAULT_APP_ID && appId === DEFAULT_APP_ID && guest === pageGuestId();
        const cached = appLookupCache.peek(appId, guest);
        if (cached) {
          show(cached, open);
          return;
        }
        paint(open ? "· 開いているアプリ" : "確認中…");
        const mine = seq;
        timer = window.setTimeout(async () => {
          if (!panel.root.isConnected) return;
          const result = await appLookupCache.get(appId, guest);
          if (mine !== seq || !panel.root.isConnected) return;
          if (result.ok) show(result, open);
          else {
            failed = true;
            if (!open) paint("message" in result ? result.message : REFLECT_APP_LOOKUP_FAILURE, "warn");
          }
        }, APP_LOOKUP_DELAY_MS);
      }
      function adopt(info) {
        const appId = appInput.value.trim();
        const guest = guestInput.value.trim();
        if (!isActive() || info.appId !== appId || !isLookupableReflectApp(appId, guest)) return;
        const open = !!DEFAULT_APP_ID && appId === DEFAULT_APP_ID && guest === pageGuestId();
        key = `${guest}|${appId}`;
        seq += 1;
        window.clearTimeout(timer);
        show(info, open);
      }
      function recheck() {
        if (!failed) return;
        key = "\0";
        refresh();
      }
      appInput.addEventListener("change", recheck);
      guestInput.addEventListener("change", recheck);
      function stop() {
        seq += 1;
        window.clearTimeout(timer);
      }
      return { el, refresh, known: () => known, adopt, stop };
    }
    const sourceNote = createAppNote(srcApp, srcGuest, () => sourceMode === "app", () => refreshWorkflow());
    const targetNote = createAppNote(tgtApp, tgtGuest, () => true, () => refreshWorkflow());
    panel.root.addEventListener("kus-lite-dispose", () => {
      sourceNote.stop();
      targetNote.stop();
    }, { once: true });
    srcApp.setAttribute("aria-label", "反映元アプリID");
    srcGuest.setAttribute("aria-label", "反映元ゲストスペースID");
    tgtApp.setAttribute("aria-label", "反映先アプリID");
    tgtGuest.setAttribute("aria-label", "反映先ゲストスペースID");
    let sourceBundleFromJson = null;
    let sourceJsonBundles = [];
    let sourceBundleToken = "";
    let sourceBundleFileName = "";
    const srcJsonFile = document.createElement("input");
    srcJsonFile.type = "file";
    srcJsonFile.accept = ".json,application/json";
    srcJsonFile.className = "kus-lp__file";
    const sourceJsonAppSelect = document.createElement("select");
    sourceJsonAppSelect.className = "kus-lp__select";
    sourceJsonAppSelect.setAttribute("aria-label", "設定JSON内の反映元アプリ");
    sourceJsonAppSelect.hidden = true;
    function renderJsonAppSelect() {
      sourceJsonAppSelect.replaceChildren(...sourceJsonBundles.map((bundle, index) => {
        const option = document.createElement("option");
        option.value = String(index);
        const appName = extractAppNameFromBundle(bundle);
        option.textContent = `アプリ #${bundle.appId}${appName ? ` (${appName})` : ""}`;
        return option;
      }));
    }
    const srcJsonClearBtn = makeButton("クリア", "ghost");
    srcJsonClearBtn.style.display = "none";
    const srcJsonNote = document.createElement("div");
    srcJsonNote.className = "kus-lp__small";
    srcJsonNote.style.display = "none";
    const currentSrcBtn = makeButton("現在のアプリを反映元", "sub");
    const copyBtn = makeButton("反映元のIDを反映先へコピー", "sub");
    const currentBtn = makeButton("現在のアプリを反映先", "sub");
    const swapBtn = makeButton("反映元と反映先を入れ替え", "sub");
    const cardApp = makeCard({ title: "反映元と反映先のアプリ", number: 1 });
    cardApp.card.classList.add("kus-rl-card--route");
    const route = document.createElement("div");
    route.className = "kus-rl-route";
    const sourceEndpoint = document.createElement("section");
    sourceEndpoint.className = "kus-rl-endpoint";
    sourceEndpoint.innerHTML = '<div class="kus-rl-endpoint__eyebrow">反映元 · 設定を読み取る</div>';
    const sourceModeSelect = document.createElement("select");
    sourceModeSelect.className = "kus-lp__select";
    sourceModeSelect.setAttribute("aria-label", "反映元の取得方法");
    sourceModeSelect.innerHTML = '<option value="app">アプリから取得</option><option value="json">設定JSONから取得</option>';
    sourceEndpoint.appendChild(sourceModeSelect);
    const sourceAppFields = document.createElement("div");
    function labeledInput(input, caption) {
      const label = document.createElement("label");
      label.className = "kus-rl-field";
      const text = document.createElement("span");
      text.textContent = caption;
      label.append(text, input);
      input.inputMode = "numeric";
      return label;
    }
    sourceAppFields.appendChild(labeledInput(srcApp, "アプリID"));
    sourceAppFields.appendChild(sourceNote.el);
    const sourceGuestDetails = makeDetails("ゲストスペースを指定", { open: !!srcGuest.value });
    sourceGuestDetails.body.appendChild(labeledInput(srcGuest, "ゲストスペースID（任意）"));
    sourceAppFields.append(sourceGuestDetails.details, currentSrcBtn);
    sourceEndpoint.appendChild(sourceAppFields);
    const sourceJsonFields = document.createElement("div");
    sourceJsonFields.hidden = true;
    srcJsonFile.setAttribute("aria-label", "反映元の設定JSON");
    sourceJsonFields.append(srcJsonFile, sourceJsonAppSelect, srcJsonClearBtn, srcJsonNote);
    sourceEndpoint.appendChild(sourceJsonFields);
    const routeArrow = document.createElement("div");
    routeArrow.className = "kus-rl-route-arrow";
    routeArrow.setAttribute("aria-hidden", "true");
    routeArrow.textContent = "→";
    const targetEndpoint = document.createElement("section");
    targetEndpoint.className = "kus-rl-endpoint kus-rl-endpoint--target";
    targetEndpoint.innerHTML = '<div class="kus-rl-endpoint__eyebrow">反映先 · 設定を書き込む</div><div class="kus-rl-endpoint__note">書き込むのは反映先のプレビューだけです</div>';
    targetEndpoint.appendChild(labeledInput(tgtApp, "アプリID"));
    targetEndpoint.appendChild(targetNote.el);
    const targetGuestDetails = makeDetails("ゲストスペースを指定", { open: !!tgtGuest.value });
    targetGuestDetails.body.appendChild(labeledInput(tgtGuest, "ゲストスペースID（任意）"));
    targetEndpoint.append(targetGuestDetails.details, currentBtn);
    route.appendChild(sourceEndpoint);
    route.appendChild(routeArrow);
    route.appendChild(targetEndpoint);
    cardApp.body.appendChild(route);
    const quickRow = makeRow([swapBtn, copyBtn]);
    quickRow.classList.add("kus-rl-route-utility");
    cardApp.body.appendChild(quickRow);
    function refreshSrcJsonNote() {
      sourceAppFields.hidden = sourceMode === "json";
      sourceJsonFields.hidden = sourceMode !== "json";
      sourceModeSelect.value = sourceMode;
      swapBtn.disabled = sourceMode === "json";
      copyBtn.disabled = sourceMode === "json";
      sourceJsonAppSelect.hidden = sourceJsonBundles.length < 2;
      if (sourceBundleFromJson) {
        const appName = extractAppNameFromBundle(sourceBundleFromJson);
        srcJsonNote.textContent = `設定JSONを読み込み済み${sourceBundleFileName ? `（${sourceBundleFileName}）` : ""}: アプリ #${sourceBundleFromJson?.appId || "-"}${appName ? ` (${appName})` : ""}。反映元はこのJSONから取得し、アプリからは取得しません。`;
        srcJsonNote.style.display = "block";
        srcJsonClearBtn.style.display = "";
      } else {
        srcJsonNote.style.display = "none";
        srcJsonClearBtn.style.display = "none";
      }
    }
    sourceModeSelect.addEventListener("change", () => {
      sourceMode = sourceModeSelect.value === "json" ? "json" : "app";
      sourceBundleFromJson = null;
      sourceJsonBundles = [];
      sourceBundleToken = "";
      srcJsonFile.value = "";
      refreshSrcJsonNote();
      refreshSameConnBanner();
      refreshReviewCard();
    });
    srcJsonFile.addEventListener("change", () => runLite("反映元の設定JSONを読み込み中…", async () => {
      const file = srcJsonFile.files?.[0];
      if (!file) return;
      srcJsonFile.value = "";
      sourceBundleFromJson = null;
      sourceJsonBundles = [];
      sourceBundleToken = "";
      sourceBundleFileName = "";
      let parsed;
      try {
        parsed = JSON.parse(await file.text());
      } catch {
        throw new Error("設定JSONの読み込みに失敗しました（JSON形式が不正です）");
      }
      sourceJsonBundles = pickAllSettingsBundles(parsed, "source", true);
      renderJsonAppSelect();
      sourceBundleFromJson = sourceJsonBundles[0];
      sourceBundleToken = `${file.name}:${file.size}:${file.lastModified}:${Date.now()}`;
      sourceBundleFileName = file.name;
      if (sourceBundleFromJson?.appId) srcApp.value = String(sourceBundleFromJson.appId);
      panel.setStatus(`反映元の設定JSONを読み込みました（アプリ #${sourceBundleFromJson?.appId || "-"}）。`, "ok");
      saveState();
      refreshSrcJsonNote();
      refreshSameConnBanner();
      refreshReviewCard();
    }));
    sourceJsonAppSelect.addEventListener("change", () => {
      sourceBundleFromJson = sourceJsonBundles[Number(sourceJsonAppSelect.value)];
      srcApp.value = String(sourceBundleFromJson.appId);
      saveState();
      refreshSrcJsonNote();
      refreshReviewCard();
    });
    srcJsonClearBtn.addEventListener("click", () => {
      sourceBundleFromJson = null;
      sourceJsonBundles = [];
      sourceBundleToken = "";
      srcJsonFile.value = "";
      refreshSrcJsonNote();
      refreshSameConnBanner();
      refreshReviewCard();
      panel.setStatus("読み込んだ設定JSONをクリアしました。設定JSONを選び直してください。", "info");
    });
    const sameConnBanner = document.createElement("div");
    sameConnBanner.className = "kus-lp__note--warn";
    sameConnBanner.style.display = "none";
    sameConnBanner.textContent = "反映元と反映先が同じアプリです。";
    cardApp.body.appendChild(sameConnBanner);
    cardApp.body.appendChild(createAppSearchControl(panel, {
      targets: [
        { label: "反映元", apply: (id, _name, guestId) => {
          sourceModeSelect.value = "app";
          sourceModeSelect.dispatchEvent(new Event("change"));
          srcApp.value = id;
          srcGuest.value = guestId || "";
          saveState();
          refreshSameConnBanner();
          refreshReviewCard();
        } },
        { label: "反映先", apply: (id, _name, guestId) => {
          tgtApp.value = id;
          tgtGuest.value = guestId || "";
          saveState();
          refreshSameConnBanner();
          refreshReviewCard();
        } },
        {
          label: "続けて反映",
          apply: (id, _name, guestId) => addRolloutTargets([{ appId: id, guestId: guestId || "" }]),
          applyAll: (apps, guestId) => addRolloutTargets(apps.map((app) => ({ appId: app.appId, guestId }))),
          applyAllLabel: (count) => `候補 ${count} 件を続けて反映する反映先に追加`
        }
      ]
    }));
    panel.body.insertBefore(cardApp.card, panel.status);
    function refreshSameConnBanner() {
      sourceNote.refresh();
      targetNote.refresh();
      if (srcGuest.value) sourceGuestDetails.details.open = true;
      if (tgtGuest.value) targetGuestDetails.details.open = true;
      const same2 = sourceMode === "app" && !!srcApp.value.trim() && srcApp.value.trim() === tgtApp.value.trim() && srcGuest.value.trim() === tgtGuest.value.trim();
      sameConnBanner.style.display = same2 ? "block" : "none";
      sameConnBanner.textContent = sourceEnvironment.value === "preview" ? "同じプレビュー同士は反映できません。反映元の取得環境かアプリIDを変更してください。" : "同じアプリの本番の設定でプレビューを更新します。プレビューにある未公開の変更は上書きされる場合があります（次の画面で確認できます）。";
    }
    currentSrcBtn.addEventListener("click", () => {
      srcApp.value = DEFAULT_APP_ID || "";
      srcGuest.value = DEFAULT_APP_ID ? pageGuestId() : srcGuest.value;
      saveState();
      refreshSameConnBanner();
      refreshReviewCard();
      panel.setStatus("現在のアプリを反映元にセットしました。", "info");
    });
    copyBtn.addEventListener("click", () => {
      tgtApp.value = srcApp.value.trim();
      tgtGuest.value = srcGuest.value.trim();
      saveState();
      refreshSameConnBanner();
      refreshReviewCard();
      panel.setStatus("反映元のIDを反映先へコピーしました。", "info");
    });
    currentBtn.addEventListener("click", () => {
      tgtApp.value = DEFAULT_APP_ID || "";
      tgtGuest.value = DEFAULT_APP_ID ? pageGuestId() : tgtGuest.value;
      saveState();
      refreshSameConnBanner();
      refreshReviewCard();
      panel.setStatus("現在のアプリを反映先にセットしました。", "info");
    });
    swapBtn.addEventListener("click", () => {
      const sa = srcApp.value;
      const sg = srcGuest.value;
      srcApp.value = tgtApp.value;
      srcGuest.value = tgtGuest.value;
      tgtApp.value = sa;
      tgtGuest.value = sg;
      saveState();
      refreshSameConnBanner();
      refreshReviewCard();
      panel.setStatus("反映元と反映先を入れ替えました。", "info");
    });
    [srcApp, srcGuest, tgtApp, tgtGuest].forEach((el) => {
      el.addEventListener("input", () => {
        saveState();
        refreshSameConnBanner();
        refreshReviewCard();
      });
    });
    function adoptAppReference(appInput, guestInput, guestDetails, sideLabel, text = appInput.value) {
      if (!needsAppReferenceParse(text)) return false;
      const reference = parseAppReference(text);
      if (!reference) {
        panel.setStatus(`${sideLabel}のアプリIDを読み取れません。数字のID、またはアプリのURLを入力してください。`, "warn");
        return false;
      }
      const clearedGuest = !reference.guestId && !!guestInput.value.trim();
      appInput.value = reference.appId;
      guestInput.value = reference.guestId;
      if (reference.guestId) guestDetails.open = true;
      saveState();
      refreshSameConnBanner();
      refreshReviewCard();
      panel.setStatus(`URLから${sideLabel}のアプリID ${reference.appId}${reference.guestId ? `（ゲストスペース ${reference.guestId}）` : ""}を読み取りました。${clearedGuest ? "ゲストスペースIDは空にしました。" : ""}`, "ok");
      return true;
    }
    for (const [appInput, guestInput, guestDetails, sideLabel] of [
      [srcApp, srcGuest, sourceGuestDetails.details, "反映元"],
      [tgtApp, tgtGuest, targetGuestDetails.details, "反映先"]
    ]) {
      appInput.addEventListener("paste", (event) => {
        const pasted = event.clipboardData?.getData("text") || "";
        if (!needsAppReferenceParse(pasted)) return;
        if (adoptAppReference(appInput, guestInput, guestDetails, sideLabel, pasted)) event.preventDefault();
      });
      appInput.addEventListener("change", () => {
        adoptAppReference(appInput, guestInput, guestDetails, sideLabel);
      });
    }
    const cardScope = makeCard({ title: "反映する項目", number: 2 });
    cardScope.body.appendChild(makeNote("目的に近いセットを選び、必要な項目を調整できます。", "help"));
    const putSections = REFLECT_SECTION_KEYS.map((key) => ({ key, label: reflectSectionLabel(key) }));
    const initialSelected = new Set(
      Array.isArray(memoryState.selectedScopes) ? memoryState.selectedScopes : ["fieldSettings", "layoutSettings", "viewSettings"]
    );
    const chips = putSections.map((d) => {
      const chip = makeChip({ label: d.label, checked: initialSelected.has(d.key), value: d.key });
      const hint2 = describeReflectScope(d.key);
      chip.checkbox.setAttribute("aria-label", d.label);
      if (hint2) {
        chip.label.title = `${d.label}: ${hint2}`;
        const description = document.createElement("span");
        description.id = `kus-rl-scope-hint-${d.key}`;
        description.hidden = true;
        description.textContent = `${RISKY_SCOPE_KEYS.has(d.key) ? "置換型の項目。" : ""}${hint2}`;
        chip.label.appendChild(description);
        chip.checkbox.setAttribute("aria-describedby", description.id);
      }
      if (RISKY_SCOPE_KEYS.has(d.key)) {
        const badge = document.createElement("span");
        badge.className = "kus-rl-chip__badge";
        badge.setAttribute("aria-hidden", "true");
        badge.textContent = "置換";
        chip.label.appendChild(badge);
      }
      return chip;
    });
    const chipBox = document.createElement("div");
    chipBox.className = "kus-rl-scope-groups";
    groupReflectScopes(putSections.map((d) => d.key)).forEach((group) => {
      const fieldset = document.createElement("fieldset");
      fieldset.className = "kus-rl-scope-group";
      const legend = document.createElement("legend");
      legend.textContent = group.label;
      fieldset.appendChild(legend);
      const list2 = document.createElement("div");
      list2.className = "kus-lp__chips";
      group.keys.forEach((key) => {
        const chip = chips.find((c) => c.checkbox.value === key);
        if (chip) list2.appendChild(chip.label);
      });
      fieldset.appendChild(list2);
      chipBox.appendChild(fieldset);
    });
    cardScope.body.appendChild(chipBox);
    const fieldSettingsNotice = document.createElement("p");
    fieldSettingsNotice.className = "kus-rl-next kus-rl-next--warn kus-rl-scope-notice";
    fieldSettingsNotice.textContent = FIELD_SETTINGS_OMITTED_NOTICE;
    fieldSettingsNotice.hidden = true;
    cardScope.body.appendChild(fieldSettingsNotice);
    const preserve = makeCheck({ label: "反映先だけの一覧・グラフ・アクションを保持する", checked: memoryState.preserveTargetOnly !== false, help: "標準はON（保持）です。OFFにすると、反映元にない一覧・グラフ・アクションを削除します。" });
    const preserveBox = document.createElement("div");
    preserveBox.className = "kus-rl-scope-option";
    const preserveTitle = document.createElement("div");
    preserveTitle.className = "kus-rl-scope-option__title";
    preserveTitle.textContent = "一覧・グラフ・アクションの扱い";
    const preserveHelp = document.createElement("p");
    preserveHelp.className = "kus-rl-scope-option__help";
    preserveHelp.setAttribute("aria-live", "polite");
    preserveBox.append(preserveTitle, preserve.label, preserveHelp);
    const scopeCountLabel = document.createElement("div");
    scopeCountLabel.className = "kus-lp__small";
    scopeCountLabel.style.marginTop = "8px";
    cardScope.body.appendChild(scopeCountLabel);
    const scopeHelpNote = document.createElement("div");
    scopeHelpNote.className = "kus-lp__note kus-lp__note--help";
    const scopeHelpTitle = document.createElement("strong");
    scopeHelpTitle.textContent = "各項目の反映方法";
    const scopeHelpList = document.createElement("dl");
    scopeHelpList.className = "kus-rl-scope-help";
    putSections.forEach((d) => {
      const hint2 = describeReflectScope(d.key);
      if (!hint2) return;
      const term = document.createElement("dt");
      term.textContent = d.label;
      if (RISKY_SCOPE_KEYS.has(d.key)) {
        const badge = document.createElement("span");
        badge.className = "kus-rl-chip__badge";
        badge.textContent = "置換";
        term.appendChild(badge);
      }
      const desc = document.createElement("dd");
      desc.textContent = hint2;
      const item = document.createElement("div");
      item.append(term, desc);
      scopeHelpList.appendChild(item);
    });
    scopeHelpNote.append(scopeHelpTitle, scopeHelpList);
    cardScope.body.appendChild(scopeHelpNote);
    function collectSelectedScopes() {
      return chips.filter((c) => c.checkbox.checked).map((c) => c.checkbox.value);
    }
    function refreshScopeNotices() {
      const selected = collectSelectedScopes();
      fieldSettingsNotice.hidden = !shouldWarnMissingFieldSettings(selected);
      const keeps = preserve.checkbox.checked;
      const usesNamedSections = ["viewSettings", "reportSettings", "actionSettings"].some((key) => selected.includes(key));
      preserveHelp.classList.toggle("kus-rl-scope-option__help--warn", !keeps);
      preserveHelp.textContent = !usesNamedSections ? "今の選択には一覧・グラフ・アクションがないため、この設定は使われません。フィールドは常に保持します。" : keeps ? "反映先だけの一覧・グラフ・アクションは削除せず残します（標準）。フィールドは常に保持します。" : "反映元にない一覧・グラフ・アクションを反映先から削除します。フィールドは常に保持します。";
    }
    function refreshScopeCount() {
      const sel = collectSelectedScopes().length;
      scopeCountLabel.textContent = `選択中: ${sel} / ${chips.length} 項目`;
      refreshScopeNotices();
    }
    function setSelectedScopes(scopeKeys) {
      const target = new Set(scopeKeys);
      chips.forEach((c) => {
        c.checkbox.checked = target.has(c.checkbox.value);
      });
      refreshScopeCount();
      saveState();
      refreshReviewCard();
    }
    chips.forEach((c) => c.checkbox.addEventListener("change", () => {
      refreshScopeCount();
      saveState();
      refreshReviewCard();
    }));
    refreshScopeCount();
    const presetRow = document.createElement("div");
    presetRow.className = "kus-lp__btn-row";
    presetRow.style.margin = "8px 0 10px";
    for (const preset of SCOPE_QUICK_PRESETS) {
      const btn = makeButton(preset.label, "sub");
      btn.title = preset.hint;
      btn.addEventListener("click", () => {
        applyScopePreset(preset);
        panel.setStatus(`「${preset.label}」を選びました（${collectSelectedScopes().length} 項目）。`, "info");
      });
      presetRow.appendChild(btn);
    }
    cardScope.body.prepend(presetRow);
    const allBtn = makeButton("全選択", "sub");
    const noneBtn = makeButton("全解除", "sub");
    cardScope.actions.appendChild(allBtn);
    cardScope.actions.appendChild(noneBtn);
    allBtn.addEventListener("click", () => {
      chips.forEach((c) => {
        c.checkbox.checked = true;
      });
      refreshScopeCount();
      saveState();
      refreshReviewCard();
    });
    noneBtn.addEventListener("click", () => {
      chips.forEach((c) => {
        c.checkbox.checked = false;
      });
      refreshScopeCount();
      saveState();
      refreshReviewCard();
    });
    function applyScopePreset(preset) {
      if (preset.id === "all") {
        chips.forEach((c) => {
          c.checkbox.checked = true;
        });
      } else if (preset.scopes) {
        const target = new Set(preset.scopes);
        chips.forEach((c) => {
          c.checkbox.checked = target.has(c.checkbox.value);
        });
      } else if (preset.exclude) {
        const excluded = new Set(preset.exclude);
        chips.forEach((c) => {
          c.checkbox.checked = !excluded.has(c.checkbox.value);
        });
      }
      refreshScopeCount();
      saveState();
      refreshReviewCard();
    }
    panel.body.insertBefore(cardScope.card, panel.status);
    const cardOpt = makeCard({ title: "反映時の動作", soft: true });
    const sourceEnvironment = document.createElement("select");
    sourceEnvironment.className = "kus-lp__select";
    sourceEnvironment.setAttribute("aria-label", "反映元の取得環境");
    sourceEnvironment.innerHTML = '<option value="production">本番の設定を取得</option><option value="preview">プレビューの設定（未公開）を取得</option>';
    sourceEnvironment.value = memoryState.sourcePreview ? "preview" : "production";
    sourceAppFields.insertBefore(sourceEnvironment, sourceGuestDetails.details);
    cardOpt.body.appendChild(makeNote("反映前の設定を自動でバックアップします。変更のない項目は書き込まず、エラーが起きたら以降の項目を実行せず中断します。", "help"));
    cardOpt.body.appendChild(preserveBox);
    const cardLookup = makeCard({ title: "ルックアップの参照アプリID変換（任意）", soft: true });
    const lookupTa = makeTextarea({
      rows: 3,
      code: true,
      placeholder: "旧アプリID → 新アプリID（1行に1組）\n例: 101 → 202",
      value: memoryState.lookupMapText || ""
    });
    lookupTa.setAttribute("aria-label", "ルックアップの参照アプリID変換");
    cardLookup.body.appendChild(lookupTa);
    const lookupStatus = document.createElement("div");
    lookupStatus.className = "kus-rl-lookup-status";
    lookupStatus.setAttribute("aria-live", "polite");
    cardLookup.body.appendChild(lookupStatus);
    cardLookup.body.appendChild(makeNote('ルックアップの参照先アプリIDを置き換えて反映します（差分にも反映し、実行前に変換先アプリの存在を確認します）。1行に「旧ID → 新ID」（→ / = / : / カンマ区切り）か、{"旧アプリID":"新アプリID"} のJSONで入力します。', "help"));
    function refreshLookupStatus() {
      const parsed = parseLookupMapText(lookupTa.value);
      lookupStatus.classList.toggle("kus-rl-lookup-status--err", !parsed.ok);
      lookupStatus.textContent = "error" in parsed ? parsed.error : parsed.count ? `参照先変換 ${parsed.count} 件を適用します。` : "";
    }
    refreshLookupStatus();
    [sourceEnvironment, preserve.checkbox].forEach((cb) => {
      cb.addEventListener("change", () => {
        refreshScopeNotices();
        saveState();
        refreshSameConnBanner();
        refreshReviewCard();
      });
    });
    lookupTa.addEventListener("input", () => {
      saveState();
      refreshLookupStatus();
      refreshReviewCard();
    });
    const cardPreset = makeCard({ title: "プリセット（接続先と反映項目）", soft: true });
    cardPreset.card.classList.add("kus-rl-card--preset");
    const presetSelect = document.createElement("select");
    presetSelect.className = "kus-lp__select";
    presetSelect.style.minWidth = "180px";
    presetSelect.setAttribute("aria-label", "保存済みプリセット");
    const presetName = makeInput({ placeholder: "例: 本番テンプレ → 東京営業所", width: "wide", noSubmit: true });
    presetName.setAttribute("aria-label", "プリセット名");
    presetName.maxLength = 60;
    const saveBtn = makeButton("現在の設定を保存", "sub");
    const loadBtn = makeButton("読み込み", "sub");
    const delBtn = makeButton("削除", "sub");
    const exportPresetsBtn = makeButton("JSONで書き出し", "sub");
    exportPresetsBtn.title = "保存済みプリセットをJSONファイルに書き出します。次回はこのファイルを読み込んで再利用できます。";
    const importPresetsBtn = makeButton("JSONを読み込み", "sub");
    importPresetsBtn.title = "書き出したプリセットJSONを読み込みます。同名のプリセットは読み込んだ内容で置き換えます。";
    const importPresetsFile = document.createElement("input");
    importPresetsFile.type = "file";
    importPresetsFile.accept = ".json,application/json";
    importPresetsFile.hidden = true;
    importPresetsFile.setAttribute("aria-label", "プリセットJSON");
    const presetNameRow = document.createElement("div");
    presetNameRow.className = "kus-rl-preset-name";
    presetNameRow.append(presetName, saveBtn);
    cardPreset.body.appendChild(presetNameRow);
    cardPreset.body.appendChild(makeRow([presetSelect, loadBtn, delBtn], { label: "保存済み" }));
    cardPreset.body.appendChild(makeRow([exportPresetsBtn, importPresetsBtn, importPresetsFile]));
    cardPreset.body.appendChild(makeNote("プリセットはこのタブを閉じると消えます。次回も使う場合は「JSONで書き出し」で保存し、「JSONを読み込み」で復元してください。", "help"));
    function refreshPresetSelect() {
      const keep = presetSelect.value;
      presetSelect.innerHTML = "";
      const presets = memoryState.presets || [];
      if (!presets.length) {
        const opt = document.createElement("option");
        opt.value = "";
        opt.textContent = "(プリセットなし)";
        presetSelect.appendChild(opt);
        presetSelect.disabled = true;
        loadBtn.disabled = true;
        delBtn.disabled = true;
        return;
      }
      presetSelect.disabled = false;
      loadBtn.disabled = false;
      delBtn.disabled = false;
      for (const p of presets) {
        const opt = document.createElement("option");
        opt.value = p.name;
        opt.textContent = `${p.name}（反映元 #${p.source.appId} → 反映先 #${p.target.appId}）`;
        presetSelect.appendChild(opt);
      }
      if (keep && presets.some((p) => p.name === keep)) presetSelect.value = keep;
    }
    function refreshPresetButtons() {
      exportPresetsBtn.disabled = busy || !(memoryState.presets || []).length;
      importPresetsBtn.disabled = busy;
      saveBtn.disabled = busy || !presetName.value.trim();
    }
    refreshPresetSelect();
    refreshPresetButtons();
    presetName.addEventListener("input", refreshPresetButtons);
    saveBtn.addEventListener("click", () => {
      const trimmed = presetName.value.trim();
      if (!trimmed) {
        panel.setStatus("プリセット名を入力してください。", "warn");
        presetName.focus();
        return;
      }
      const preset = {
        name: trimmed,
        createdAt: (/* @__PURE__ */ new Date()).toISOString(),
        source: {
          appId: srcApp.value.trim(),
          guestId: srcGuest.value.trim(),
          preview: sourceEnvironment.value === "preview"
        },
        target: {
          appId: tgtApp.value.trim(),
          guestId: tgtGuest.value.trim(),
          preview: false
        },
        scopes: collectSelectedScopes(),
        applyDiffOnly: false,
        lookupMap: lookupTa.value,
        preserveTargetOnly: preserve.checkbox.checked,
        rolloutQueue: rolloutTa.value
      };
      const replaced = (memoryState.presets || []).some((p) => p.name === trimmed);
      const saved = mergeReflectPresets(memoryState.presets, [preset], REFLECT_PRESET_LIMIT);
      memoryState.presets = saved.presets;
      refreshPresetSelect();
      refreshPresetButtons();
      presetSelect.value = trimmed;
      presetName.value = "";
      refreshPresetButtons();
      panel.setStatus(`プリセット「${trimmed}」を${replaced ? "上書き保存" : "保存"}しました。${saved.dropped ? `上限 ${REFLECT_PRESET_LIMIT} 件のため古いプリセット ${saved.dropped} 件を削除しました。` : ""}次回も使う場合は「JSONで書き出し」で保存してください。`, saved.dropped ? "warn" : "ok");
    });
    exportPresetsBtn.addEventListener("click", () => {
      const payload = buildReflectPresetsExport(memoryState.presets);
      if (!payload.count) {
        panel.setStatus("書き出せるプリセットがありません。", "warn");
        return;
      }
      const filename = buildExportFilename("プレビュー反映プリセット", "json");
      downloadText(filename, JSON.stringify(payload, null, 2), "application/json");
      panel.setStatus(`プリセット ${payload.count} 件を ${filename} に書き出しました。`, "ok");
    });
    importPresetsBtn.addEventListener("click", () => importPresetsFile.click());
    importPresetsFile.addEventListener("change", () => runLite("プリセットJSONを読み込み中…", async () => {
      const file = importPresetsFile.files?.[0];
      importPresetsFile.value = "";
      if (!file) return;
      let parsed;
      try {
        parsed = JSON.parse(await readTextFile(file));
      } catch {
        throw new Error("プリセットJSONの読み込みに失敗しました（JSON形式が不正です）");
      }
      const { presets, error } = normalizeImportedReflectPresets(parsed);
      if (error) throw new Error(error);
      if (!presets.length) throw new Error("取り込めるプリセットが見つかりませんでした");
      const merged = mergeReflectPresets(memoryState.presets, presets, REFLECT_PRESET_LIMIT);
      memoryState.presets = merged.presets;
      refreshPresetSelect();
      refreshPresetButtons();
      presetSelect.value = presets[0].name;
      panel.setStatus(`プリセットを読み込みました（追加 ${merged.added} 件 / 上書き ${merged.replaced} 件 / 合計 ${merged.presets.length} 件）。${merged.dropped ? `上限 ${REFLECT_PRESET_LIMIT} 件を超えた ${merged.dropped} 件は保持できませんでした。` : ""}「読み込み」で適用できます。`, merged.dropped ? "warn" : "ok");
    }));
    loadBtn.addEventListener("click", () => {
      const name = presetSelect.value;
      const preset = (memoryState.presets || []).find((p) => p.name === name);
      if (!preset) return;
      const discardsLoadedJson = !restoreMode && !!sourceBundleFromJson;
      sourceModeSelect.value = "app";
      sourceModeSelect.dispatchEvent(new Event("change"));
      srcApp.value = preset.source.appId;
      srcGuest.value = preset.source.guestId;
      tgtApp.value = preset.target.appId;
      tgtGuest.value = preset.target.guestId;
      sourceEnvironment.value = preset.source.preview ? "preview" : "production";
      preserve.checkbox.checked = preset.preserveTargetOnly !== false;
      lookupTa.value = preset.lookupMap || "";
      refreshLookupStatus();
      rolloutTa.value = preset.rolloutQueue || "";
      setSelectedScopes(preset.scopes || []);
      refreshSameConnBanner();
      saveState();
      refreshReviewCard();
      const dropped = (preset.scopes || []).filter((key) => !REFLECT_SECTION_KEYS.includes(key));
      const notes = [];
      if (dropped.length) notes.push(`未対応の項目 ${dropped.length} 件（${dropped.slice(0, 5).join("、")}${dropped.length > 5 ? " ほか" : ""}）は選択できませんでした。`);
      if (discardsLoadedJson) notes.push("読み込み済みの反映元JSONは破棄しました。");
      const presetLookupError = lookupMapError(parseLookupMapText(lookupTa.value));
      if (presetLookupError) notes.push(`参照先変換を読み取れません。${presetLookupError}`);
      const presetRollout = currentRollout();
      if ("error" in presetRollout) notes.push(`続けて反映する反映先を読み取れません。${presetRollout.error}`);
      panel.setStatus([`プリセット「${name}」を読み込みました。`, ...notes].join(" "), notes.length ? "warn" : "ok");
    });
    delBtn.addEventListener("click", () => {
      const name = presetSelect.value;
      if (!name) return;
      if (!window.confirm(`プリセット「${name}」を削除しますか？`)) return;
      memoryState.presets = (memoryState.presets || []).filter((p) => p.name !== name);
      refreshPresetSelect();
      refreshPresetButtons();
      panel.setStatus(`プリセット「${name}」を削除しました。`, "info");
    });
    const rolloutSetupCard = makeCard({ title: "続けて反映する反映先（複数アプリへ展開）", soft: true });
    rolloutSetupCard.card.classList.add("kus-rl-rollout");
    const rolloutHelp = makeNote("同じ反映元・項目・設定で、ほかのアプリにも順番に反映します（反映先ごとに差分確認と最終確認を行います）。数字だけのIDは通常スペースのアプリを指すため、ゲストスペースのアプリはURLで指定してください。", "help");
    const rolloutAllHelp = makeNote(`最大 ${ROLLOUT_QUEUE_LIMIT} 件まで指定できます。アプリ検索の「環境内の全アプリ」から、全アプリをまとめて追加できます（反映元のアプリは加えません）。`, "help");
    const rolloutTa = makeTextarea({ rows: 4, code: true, placeholder: "1行に1件（改行・カンマ区切りも可）\n例: 203\nhttps://example.cybozu.com/k/guest/5/204/", value: memoryState.rolloutQueueText || "" });
    rolloutTa.classList.add("kus-rl-rollout__input");
    rolloutTa.setAttribute("aria-label", "続けて反映する反映先");
    const rolloutStatus = document.createElement("div");
    rolloutStatus.className = "kus-rl-rollout__status";
    rolloutStatus.setAttribute("aria-live", "polite");
    const rolloutLookupSetupNote = document.createElement("p");
    rolloutLookupSetupNote.className = "kus-rl-next kus-rl-next--warn";
    rolloutLookupSetupNote.dataset.rolloutLookupNote = "setup";
    rolloutLookupSetupNote.hidden = true;
    rolloutSetupCard.body.append(rolloutHelp, rolloutAllHelp, rolloutTa, rolloutStatus, rolloutLookupSetupNote);
    rolloutTa.addEventListener("input", () => {
      saveState();
      refreshReviewCard();
    });
    function currentRollout() {
      const appId = tgtApp.value.trim();
      return parseRolloutQueue(rolloutTa.value, appId ? [{ appId, guestId: tgtGuest.value.trim() }] : []);
    }
    function rolloutConditionKey() {
      const lookup = parseLookupMapText(lookupTa.value);
      return JSON.stringify({
        source: sourceMode === "json" ? ["json", sourceBundleToken, String(sourceBundleFromJson?.appId || "")] : ["app", srcApp.value.trim(), srcGuest.value.trim(), sourceEnvironment.value],
        // 反映項目は「失敗・未実行だけ選択」などの再実行で変わるため、展開の記録を引き継ぐ条件には含めない。
        preserve: preserve.checkbox.checked,
        lookup: lookup.ok ? Object.entries(lookup.value).sort() : lookupTa.value.trim()
      });
    }
    function addRolloutTargets(picks) {
      const sourceApp = sourceMode === "app" ? srcApp.value.trim() : "";
      const excluded = sourceApp ? [{ appId: sourceApp, guestId: srcGuest.value.trim() }] : [];
      const merged = mergeRolloutTargets(rolloutTa.value, picks, excluded);
      if ("error" in merged) return { message: merged.error, tone: "warn", pickedLabel: "追加できません" };
      rolloutTa.value = merged.text;
      saveState();
      refreshReviewCard();
      const queue = currentRollout();
      const skipped = [merged.duplicates ? `入力済みの ${merged.duplicates} 件は重複のため` : "", merged.excluded ? `反映元の ${merged.excluded} 件は` : ""].filter(Boolean);
      const skippedNote = skipped.length ? `${skipped.join("、")}加えていません。` : "";
      const total = queue.ok ? `現在の反映先を除いて合計 ${queue.targets.length} 件です。` : "";
      if (!merged.added) return { message: `追加できる反映先がありませんでした。${skippedNote}${total}`, tone: "warn", pickedLabel: "追加済み" };
      return {
        message: `続けて反映する反映先に ${merged.added} 件を追加しました。${skippedNote}${total}反映先ごとに差分確認と最終確認を行います（まだ書き込んでいません）。`,
        tone: "ok",
        pickedLabel: "追加済み"
      };
    }
    function recordRolloutResult(entry) {
      const key = rolloutConditionKey();
      const log = memoryState.rolloutKey === key ? memoryState.rolloutLog || [] : [];
      memoryState.rolloutLogDropped = (memoryState.rolloutKey === key ? memoryState.rolloutLogDropped || 0 : 0) + countRolloutLogDropped(log, entry);
      memoryState.rolloutKey = key;
      memoryState.rolloutLog = upsertRolloutLog(log, entry);
    }
    const rolloutCard = makeCard({ title: "続けて反映", soft: true });
    rolloutCard.card.classList.add("kus-rl-rollout-card");
    rolloutCard.card.style.display = "none";
    const rolloutNote = document.createElement("div");
    rolloutNote.className = "kus-rl-next kus-rl-next--info";
    rolloutNote.dataset.rolloutNote = "next";
    const rolloutWarn = document.createElement("div");
    rolloutWarn.className = "kus-rl-next kus-rl-next--warn";
    rolloutWarn.dataset.rolloutNote = "warn";
    const rolloutError = document.createElement("div");
    rolloutError.className = "kus-rl-next kus-rl-next--warn";
    rolloutError.dataset.rolloutNote = "error";
    const rolloutNextBtn = makeButton("次の反映先の差分を確認", "primary");
    rolloutNextBtn.dataset.rolloutNext = "true";
    const rolloutNextRow = document.createElement("div");
    rolloutNextRow.className = "kus-lp__btn-row";
    rolloutNextRow.appendChild(rolloutNextBtn);
    const rolloutLogBox = document.createElement("div");
    rolloutLogBox.dataset.rolloutLog = "true";
    const rolloutLookupNote = document.createElement("div");
    rolloutLookupNote.className = "kus-rl-next kus-rl-next--warn";
    rolloutLookupNote.dataset.rolloutLookupNote = "card";
    rolloutCard.body.append(rolloutNote, rolloutLookupNote, rolloutWarn, rolloutError, rolloutNextRow, rolloutLogBox);
    const lookupCountOf = (state3) => state3.ok ? state3.count : 0;
    function renderRollout() {
      const text = rolloutTa.value.trim();
      const queue = currentRollout();
      rolloutStatus.classList.toggle("kus-rl-rollout__status--err", !queue.ok);
      if (!text) rolloutStatus.textContent = "";
      else if ("error" in queue) rolloutStatus.textContent = queue.error;
      else if (!queue.targets.length) rolloutStatus.textContent = "続けて反映する反映先はありません（現在の反映先は除いています）。";
      else {
        const shown = queue.targets.slice(0, 10).map(formatRolloutTarget).join("、");
        rolloutStatus.textContent = `${queue.targets.length} 件: ${shown}${queue.targets.length > 10 ? ` ほか ${queue.targets.length - 10} 件` : ""}`;
      }
      const lookupNotice = describeRolloutLookupNotice(lookupCountOf(parseLookupMapText(lookupTa.value)));
      rolloutLookupSetupNote.hidden = !lookupNotice;
      rolloutLookupSetupNote.textContent = lookupNotice;
      const last = memoryState.lastResult;
      const log = memoryState.rolloutLog || [];
      const next = queue.ok ? queue.targets[0] : void 0;
      const show = !!last && !restoreMode && (!queue.ok || !!next || log.length >= 2);
      rolloutCard.card.style.display = show ? "block" : "none";
      renderRolloutLog(rolloutLogBox, log, memoryState.rolloutLogDropped || 0);
      if (!show) return;
      rolloutNote.hidden = !next;
      rolloutLookupNote.hidden = !next || !lookupNotice;
      rolloutLookupNote.textContent = lookupNotice;
      if (next) {
        const rest = queue.ok ? queue.targets.length - 1 : 0;
        rolloutNote.replaceChildren();
        const head = document.createElement("strong");
        head.textContent = `次の反映先: ${formatRolloutTarget(next)}（${rest ? `残り ${rest} 件` : "最後の反映先"}）`;
        const body = document.createElement("span");
        body.textContent = "同じ反映元・項目・設定で差分を取得するだけで、まだ書き込みません。反映先ごとに差分確認と最終確認を行います。";
        rolloutNote.append(head, body);
      }
      rolloutWarn.hidden = !(last && (last.ng > 0 || last.stopped > 0 || last.pending > 0));
      rolloutWarn.textContent = last?.cancelled ? "直前の反映先は中止したため、一部の項目だけ反映されている可能性があります。結果を確認してから進んでください。" : "直前の反映先に失敗・未実行の項目があります。結果を確認してから進んでください。";
      rolloutError.hidden = queue.ok;
      rolloutError.textContent = "error" in queue ? `続けて反映する反映先を読み取れません。${queue.error}` : "";
      rolloutNextRow.hidden = !next && queue.ok;
      setButtonText(rolloutNextBtn, next ? `次の反映先 ${formatRolloutTarget(next)} の差分を確認` : "次の反映先の差分を確認");
      rolloutNextBtn.disabled = busy || !next;
    }
    rolloutNextBtn.addEventListener("click", () => {
      startNextRollout();
    });
    function startNextRollout() {
      if (busy || restoreMode) return;
      const queue = currentRollout();
      if (!queue.ok || !queue.targets.length) return;
      const [next, ...rest] = queue.targets;
      const blocker = describeReflectSetupBlocker({
        connectionError: reflectConnectionError({ ...currentOptions(), targetAppId: next.appId, targetGuestId: next.guestId }),
        sourceMode,
        hasSourceBundle: !!sourceBundleFromJson,
        scopeCount: collectSelectedScopes().length,
        lookupError: lookupMapError(parseLookupMapText(lookupTa.value))
      });
      if (blocker) {
        panel.setStatus(`次の反映先 ${formatRolloutTarget(next)} へ進めません。${blocker}`, "warn");
        return;
      }
      tgtApp.value = next.appId;
      tgtGuest.value = next.guestId;
      rolloutTa.value = serializeRolloutQueue(rest);
      saveState();
      refreshSameConnBanner();
      refreshReviewCard();
      return startPreview(`次の反映先 ${formatRolloutTarget(next)} の差分を取得しました。内容を確認してから反映してください（まだ書き込んでいません）。`);
    }
    const previewBtn = makeButton("差分を再取得", "primary");
    const changedOnlyBtn = makeButton("差分ありだけ選択", "sub");
    const reviewCard = makeCard({ title: "反映予定を確認", soft: true });
    reviewCard.actions.style.flexWrap = "wrap";
    reviewCard.actions.appendChild(changedOnlyBtn);
    reviewCard.actions.appendChild(previewBtn);
    const reviewBody = document.createElement("div");
    reviewBody.className = "kus-rl-review";
    reviewCard.body.appendChild(reviewBody);
    panel.body.insertBefore(reviewCard.card, panel.status);
    const previewCard = makeCard({ title: "項目ごとの差分" });
    previewCard.card.style.display = "none";
    previewCard.body.appendChild(makeNote("項目名を押すと、下の詳細へ移動します。", "help"));
    const previewTools = document.createElement("div");
    previewTools.className = "kus-rl-preview-tools";
    const previewSearch = makeInput({ placeholder: "項目名や内容で検索", width: "wide" });
    previewSearch.setAttribute("aria-label", "差分を検索");
    previewSearch.type = "search";
    const previewFilter = document.createElement("select");
    previewFilter.className = "kus-lp__select";
    previewFilter.setAttribute("aria-label", "差分の状態で絞り込み");
    previewFilter.innerHTML = '<option value="all">すべての状態</option><option value="change">差分あり</option><option value="error">取得失敗</option><option value="same">一致</option>';
    previewFilter.addEventListener("change", () => rerenderPreviewCard());
    const previewActions = document.createElement("div");
    previewActions.className = "kus-rl-preview-tools__actions";
    const previewKeepShownBtn = makeButton("表示中だけ選択", "sub");
    const previewAddShownBtn = makeButton("表示中を追加", "sub");
    const previewRemoveShownBtn = makeButton("表示中を除外", "sub");
    const previewRiskyBtn = makeButton("高リスクだけ選択", "sub");
    previewActions.appendChild(previewKeepShownBtn);
    previewActions.appendChild(previewAddShownBtn);
    previewActions.appendChild(previewRemoveShownBtn);
    previewActions.appendChild(previewRiskyBtn);
    previewTools.appendChild(makeRow([previewFilter, previewSearch]));
    const selectionDetails = makeDetails("表示中の項目をまとめて選択");
    selectionDetails.body.appendChild(previewActions);
    previewTools.appendChild(selectionDetails.details);
    const previewBody = document.createElement("div");
    previewCard.body.appendChild(previewTools);
    previewCard.body.appendChild(previewBody);
    panel.body.insertBefore(previewCard.card, panel.status);
    function saveState() {
      const before = restoreMode?.before;
      memoryState = {
        ...memoryState,
        sourceAppId: (before ? before.sourceAppId : srcApp.value).trim(),
        sourceGuestId: (before ? before.sourceGuestId : srcGuest.value).trim(),
        targetAppId: tgtApp.value.trim(),
        targetGuestId: tgtGuest.value.trim(),
        sourcePreview: sourceEnvironment.value === "preview",
        selectedScopes: before ? [...before.scopes] : collectSelectedScopes(),
        lookupMapText: before ? before.lookupText : lookupTa.value,
        rolloutQueueText: rolloutTa.value,
        preserveTargetOnly: before ? before.preserve : preserve.checkbox.checked
      };
    }
    function currentOptions(scopes = collectSelectedScopes()) {
      return {
        sourceAppId: srcApp.value.trim(),
        sourceGuestId: srcGuest.value.trim(),
        sourcePreview: sourceEnvironment.value === "preview",
        sourceBundle: sourceBundleFromJson,
        targetAppId: tgtApp.value.trim(),
        targetGuestId: tgtGuest.value.trim(),
        scopes,
        lookupMap: lookupMapValue(parseLookupMapText(lookupTa.value)),
        preserveTargetOnly: preserve.checkbox.checked
      };
    }
    function getPreviewState(scopes = collectSelectedScopes(), lookupState = parseLookupMapText(lookupTa.value)) {
      const preview = memoryState.lastPreview || null;
      const coveredScopes = preview?.scopes || scopes;
      const signature = lookupState.ok ? buildPreviewSignature({
        sourceAppId: srcApp.value.trim(),
        sourceGuestId: srcGuest.value.trim(),
        sourcePreview: sourceEnvironment.value === "preview",
        sourceBundleToken,
        targetAppId: tgtApp.value.trim(),
        targetGuestId: tgtGuest.value.trim(),
        scopes: coveredScopes,
        lookupMap: lookupState.value,
        preserveTargetOnly: preserve.checkbox.checked
      }) : "";
      const fresh = !!preview && !!signature && preview.signature === signature && scopes.every((key) => coveredScopes.includes(key)) && (sourceMode !== "json" || !!sourceBundleFromJson) && (preview.restore || "") === (restoreMode?.token || "");
      return { scopes, lookupState, signature, preview, fresh };
    }
    function getExecutionPlan(scopes, previewResult) {
      const selectedSet = new Set(scopes);
      if (!previewResult) {
        return {
          effectiveScopes: [...selectedSet],
          changedScopes: [],
          sameScopes: [],
          errorScopes: [],
          skippedSameScopes: [],
          skippedErrorScopes: []
        };
      }
      const changedSet = /* @__PURE__ */ new Set();
      const sameSet = /* @__PURE__ */ new Set();
      const errorSet = /* @__PURE__ */ new Set();
      for (const entry of previewResult.entries) {
        if (!selectedSet.has(entry.sectionKey)) continue;
        if (entry.status === "change") changedSet.add(entry.sectionKey);
        else if (entry.status === "same") sameSet.add(entry.sectionKey);
        else errorSet.add(entry.sectionKey);
      }
      const effective = [...selectedSet].filter((key) => changedSet.has(key));
      const skippedSameScopes = [...sameSet];
      const skippedErrorScopes = [];
      return {
        effectiveScopes: effective,
        changedScopes: [...changedSet],
        sameScopes: [...sameSet],
        errorScopes: [...errorSet],
        skippedSameScopes,
        skippedErrorScopes
      };
    }
    let renderedPreviewResult = null;
    function captureDisclosure() {
      const open = /* @__PURE__ */ new Set();
      previewBody.querySelectorAll("details[data-reflect-details]").forEach((node) => {
        if (node.open && node.dataset.reflectDetails) open.add(node.dataset.reflectDetails);
      });
      const shown = /* @__PURE__ */ new Map();
      previewBody.querySelectorAll("[data-reflect-items][data-reflect-section]").forEach((node) => {
        if (node.dataset.reflectSection) shown.set(node.dataset.reflectSection, node.querySelectorAll(".kus-rl-items__list > li").length);
      });
      return { open, shown };
    }
    function restoreDisclosure(state3) {
      previewBody.querySelectorAll("[data-reflect-items][data-reflect-section]").forEach((node) => {
        const want = state3.shown.get(node.dataset.reflectSection || "") || 0;
        const more = node.querySelector(".kus-rl-items__more");
        while (more && !more.hidden && node.querySelectorAll(".kus-rl-items__list > li").length < want) more.click();
      });
      previewBody.querySelectorAll("details[data-reflect-details]").forEach((node) => {
        if (state3.open.has(node.dataset.reflectDetails || "")) node.open = true;
      });
    }
    function rerenderPreviewCard() {
      const previewResult = memoryState.lastPreview?.result || null;
      if (!previewResult) {
        renderedPreviewResult = null;
        previewCard.card.style.display = "none";
        [previewKeepShownBtn, previewAddShownBtn, previewRemoveShownBtn, previewRiskyBtn].forEach((btn) => {
          btn.disabled = true;
        });
        return;
      }
      const selectedScopes = collectSelectedScopes();
      const { fresh } = getPreviewState();
      const plan = fresh ? getExecutionPlan(selectedScopes, previewResult) : null;
      const filteredEntries = filterPreviewEntries(previewResult.entries, previewSearch.value.trim().toLowerCase(), previewFilter.value);
      const filteredScopeKeys = uniqueSectionKeys(filteredEntries);
      const currentSelected = new Set(selectedScopes);
      previewKeepShownBtn.disabled = filteredScopeKeys.length === 0;
      previewAddShownBtn.disabled = filteredScopeKeys.every((key) => currentSelected.has(key));
      previewRemoveShownBtn.disabled = filteredScopeKeys.every((key) => !currentSelected.has(key));
      previewRiskyBtn.disabled = !previewResult.entries.some((entry) => RISKY_SCOPE_KEYS.has(entry.sectionKey));
      const disclosure = renderedPreviewResult === previewResult ? captureDisclosure() : null;
      renderPreviewResult(previewBody, previewResult, {
        selectedScopes,
        plan,
        searchKeyword: previewSearch.value.trim().toLowerCase(),
        statusFilter: previewFilter.value,
        fresh,
        onAdd: (sectionKey) => setSelectedScopes([.../* @__PURE__ */ new Set([...collectSelectedScopes(), sectionKey])]),
        onRemove: (sectionKey) => setSelectedScopes(collectSelectedScopes().filter((key) => key !== sectionKey)),
        onShowAll: () => {
          previewSearch.value = "";
          previewFilter.value = "all";
          rerenderPreviewCard();
        }
      });
      renderedPreviewResult = previewResult;
      if (disclosure) restoreDisclosure(disclosure);
      previewCard.card.style.display = "block";
    }
    function adoptResolvedAppNames(identities, sourceIsJson) {
      for (const [side, note] of [["source", sourceNote], ["target", targetNote]]) {
        if (side === "source" && sourceIsJson) continue;
        const identity = identities[side];
        if (!identity?.appId || !identity.name) continue;
        const guestId = identity.guestId || "";
        const info = { ok: true, appId: identity.appId, name: identity.name, code: identity.code ?? appLookupCache.peek(identity.appId, guestId)?.code ?? "" };
        appLookupCache.remember(info, guestId);
        note.adopt(info);
      }
    }
    async function runPreview(scopes, lookupMap, postApplyCheck = false) {
      memoryState.lastPreview = null;
      clearConfirmation();
      const options = { ...currentOptions(scopes), lookupMap };
      const signature = buildPreviewSignature({ ...options, sourceBundleToken });
      panel.setStatus("アプリ名と接続先を確認中…", "busy");
      const identities = await resolveReflectAppsStandalone(options);
      adoptResolvedAppNames(identities, !!options.sourceBundle);
      const result = await previewReflectStandalone(options, (message) => panel.setStatus(message, "busy"));
      result.targetPending = reconcileOwnPendingChanges(result.targetPending, memoryState.lastWrite, { appId: options.targetAppId, guestId: options.targetGuestId || "" });
      memoryState.lastPreview = { signature, scopes: [...scopes], at: Date.now(), result, identities, ...restoreMode ? { restore: restoreMode.token } : {}, ...postApplyCheck ? { postApplyCheck: { scopeCount: scopes.length } } : {} };
      rerenderPreviewCard();
      refreshReviewCard();
      showWorkflowStage("review");
      return result;
    }
    function postApplySummary() {
      const { scopes, preview, fresh } = getPreviewState();
      if (!fresh || !preview?.postApplyCheck) return null;
      const entries = preview.result.entries.filter((entry) => scopes.includes(entry.sectionKey));
      return summarizePostApplyCheck({
        scopeCount: entries.length,
        changedLabels: entries.filter((entry) => entry.status === "change").map((entry) => entry.label),
        errorLabels: entries.filter((entry) => !["change", "same"].includes(entry.status)).map((entry) => entry.label)
      });
    }
    function selectionIssues(result, scopes) {
      return result ? reflectSelectionBlockers(result.entries, scopes, result.sourceFieldCodes, result.targetFieldCodes, result.sourceSystemFieldCodes) : [];
    }
    function refreshReviewCard() {
      const restoreEndNote = restoreMode && !restoreStillApplies(restoreMode) ? endRestoreMode() : "";
      if (!restoreMode && memoryState.rolloutLog?.length && memoryState.rolloutKey !== rolloutConditionKey()) {
        memoryState.rolloutLog = [];
        memoryState.rolloutLogDropped = 0;
        memoryState.rolloutKey = "";
      }
      let staleNote = "";
      const currentSourceBundleToken = sourceMode === "json" ? sourceBundleToken : "";
      const resultMatchesInputs = (candidate) => reflectResultMatchesOptions(candidate.report, currentOptions(candidate.report.scopes)) && (candidate.sourceBundleToken || "") === currentSourceBundleToken;
      const shownResult = memoryState.lastResult;
      if (shownResult && !resultMatchesInputs(shownResult)) {
        memoryState.staleResult = { result: shownResult, log: logPre.textContent || "" };
        memoryState.lastResult = null;
        if (memoryState.lastPreview?.postApplyCheck) {
          memoryState.lastPreview = { ...memoryState.lastPreview, postApplyCheck: void 0 };
        }
        logCard.card.style.display = "none";
        logPre.style.display = "none";
        logPre.textContent = "";
        renderLastResult();
        staleNote = STALE_RESULT_NOTICE;
      } else if (!shownResult && !busy && memoryState.staleResult && resultMatchesInputs(memoryState.staleResult.result)) {
        const { result: restored, log } = memoryState.staleResult;
        memoryState.lastResult = restored;
        memoryState.staleResult = null;
        logPre.textContent = log;
        logPre.style.display = log ? "block" : "none";
        logCard.card.style.display = log ? "block" : "none";
        renderLastResult();
      }
      if (restoreEndNote || staleNote) {
        panel.setStatus([restoreEndNote, staleNote].filter(Boolean).join(" "), "info");
        if (restoreEndNote) holdNoticeForNextStatus(restoreEndNote);
      }
      const { scopes, lookupState, preview, fresh } = getPreviewState();
      const invalid = reflectConnectionError(currentOptions());
      const result = preview?.result;
      const plan = getExecutionPlan(scopes, fresh ? result : null);
      const blockers = fresh ? selectionIssues(result, scopes) : [];
      const canCompare = !invalid && !!scopes.length && lookupState.ok && (sourceMode !== "json" || !!sourceBundleFromJson);
      previewBtn.disabled = busy || !canCompare;
      changedOnlyBtn.disabled = busy || !fresh || !result?.changedSections;
      confirmBtn.disabled = busy || !canCompare || !fresh || !plan.effectiveScopes.length || !!blockers.length;
      const token = confirmationToken();
      if (confirmedToken && confirmedToken !== token) clearConfirmation();
      runBtn.disabled = busy || !confirmationReady();
      setButtonText(runBtn, `確認した ${plan.effectiveScopes.length} 項目を反映先プレビューへ反映`);
      let message = invalid || lookupMapError(lookupState) || (!scopes.length ? "反映する項目を選んでください。" : "変更前と変更後を確認し、最終確認に進んでください。");
      if (!preview) message = "対象を指定して差分を取得してください。";
      else if (!fresh) message = "条件が変わりました。差分を再取得してください。";
      else if (blockers.length) message = "確認できない項目が選択されています。問題を解決して再取得するか、対象から外してください。";
      else if (!plan.effectiveScopes.length) message = "書き込みが必要な項目はありません。反映先だけの項目を保持した場合も書き込み不要です。";
      const postApply = postApplySummary();
      if (postApply && !blockers.length) message = postApply.message;
      reviewBody.innerHTML = "";
      if (preview?.identities && fresh) renderReflectRoute(reviewBody, preview.identities, sourceMode === "json" ? "設定JSON" : sourceEnvironment.value === "preview" ? "プレビュー" : "本番", restoreRouteOptions(preview.identities));
      if (fresh && restoreMode) appendRestoreNotice(reviewBody);
      if (fresh && result) appendTargetPendingNotice(reviewBody, result.targetPending);
      const info = document.createElement("div");
      info.className = "kus-rl-next " + (blockers.length ? "kus-rl-next--warn" : postApply ? `kus-rl-next--${postApply.tone}` : "kus-rl-next--info");
      info.textContent = message;
      reviewBody.appendChild(info);
      const summary = document.createElement("p");
      summary.className = "kus-rl-quiet";
      summary.textContent = fresh ? `反映予定 ${plan.effectiveScopes.length} 項目 / 変更なし ${plan.sameScopes.length} 項目 / 取得失敗 ${plan.errorScopes.length} 項目 · ${formatPreviewStamp(preview.at)}` : "この段階では書き込みません。";
      reviewBody.appendChild(summary);
      if (blockers.length) {
        const list2 = document.createElement("ul");
        list2.className = "kus-rl-issues";
        for (const message2 of blockers) {
          const item = document.createElement("li");
          item.textContent = message2;
          list2.appendChild(item);
        }
        reviewBody.appendChild(list2);
        const missing = result ? findMissingFieldReferences(result.entries, scopes, result.sourceFieldCodes, result.targetFieldCodes, result.sourceSystemFieldCodes) : [];
        if (canResolveByIncludingFieldSettings(missing, scopes)) {
          const fix = document.createElement("div");
          fix.className = "kus-rl-fix";
          if (restoreMode) {
            const restoreNote = document.createElement("span");
            restoreNote.className = "kus-rl-fix__note";
            restoreNote.dataset.reflectFixNote = "restore";
            restoreNote.textContent = RESTORE_FIELD_SETTINGS_NOTE;
            fix.appendChild(restoreNote);
          } else {
            const fixBtn = makeButton("フィールド設定も反映対象に含めて再取得", "sub");
            fixBtn.dataset.reflectFix = "include-field-settings";
            fixBtn.disabled = busy;
            fixBtn.addEventListener("click", () => {
              includeFieldSettingsAndRefetch();
            });
            const candidates = missing.filter((item) => item.inSource !== false);
            const codes = [...new Set(candidates.map((item) => item.code))];
            const codeList = `${codes.slice(0, 5).join("、")}${codes.length > 5 ? " ほか" : ""}`;
            const fixNote = document.createElement("span");
            fixNote.className = "kus-rl-fix__note";
            fixNote.textContent = candidates.every((item) => item.inSource) ? `反映元にある ${codes.length} 件のフィールド（${codeList}）を、フィールド設定の反映で追加します。差分を取得し直してから確認してください。` : `不足しているフィールド（${codeList}）が反映元にあれば、フィールド設定の反映で追加できます。反映元にも無い場合は、再取得後も停止します。`;
            fix.append(fixBtn, fixNote);
          }
          reviewBody.appendChild(fix);
        }
      }
      exportPlanBtn.disabled = busy || !fresh;
      exportPlanMdBtn.disabled = busy || !fresh;
      copyPlanMdBtn.disabled = busy || !fresh;
      renderRollout();
      rerenderPreviewCard();
      refreshWorkflow();
    }
    previewSearch.addEventListener("input", () => {
      rerenderPreviewCard();
    });
    previewKeepShownBtn.addEventListener("click", () => {
      const previewResult = memoryState.lastPreview?.result || null;
      if (!previewResult) {
        panel.setStatus("先に差分を取得してください。", "warn");
        return;
      }
      const scopeKeys = uniqueSectionKeys(filterPreviewEntries(previewResult.entries, previewSearch.value.trim().toLowerCase(), previewFilter.value));
      setSelectedScopes(scopeKeys);
      panel.setStatus(`表示中の ${scopeKeys.length} 項目だけを選択しました。`, scopeKeys.length ? "ok" : "info");
    });
    previewAddShownBtn.addEventListener("click", () => {
      const previewResult = memoryState.lastPreview?.result || null;
      if (!previewResult) {
        panel.setStatus("先に差分を取得してください。", "warn");
        return;
      }
      const scopeKeys = uniqueSectionKeys(filterPreviewEntries(previewResult.entries, previewSearch.value.trim().toLowerCase(), previewFilter.value));
      setSelectedScopes([.../* @__PURE__ */ new Set([...collectSelectedScopes(), ...scopeKeys])]);
      panel.setStatus(`表示中の ${scopeKeys.length} 項目を選択に追加しました。`, scopeKeys.length ? "ok" : "info");
    });
    previewRemoveShownBtn.addEventListener("click", () => {
      const previewResult = memoryState.lastPreview?.result || null;
      if (!previewResult) {
        panel.setStatus("先に差分を取得してください。", "warn");
        return;
      }
      const scopeKeys = new Set(uniqueSectionKeys(filterPreviewEntries(previewResult.entries, previewSearch.value.trim().toLowerCase(), previewFilter.value)));
      setSelectedScopes(collectSelectedScopes().filter((key) => !scopeKeys.has(key)));
      panel.setStatus(`表示中の ${scopeKeys.size} 項目を選択から外しました。`, scopeKeys.size ? "ok" : "info");
    });
    previewRiskyBtn.addEventListener("click", () => {
      const previewResult = memoryState.lastPreview?.result || null;
      if (!previewResult) {
        panel.setStatus("先に差分を取得してください。", "warn");
        return;
      }
      const riskyScopes = uniqueSectionKeys(previewResult.entries.filter((entry) => RISKY_SCOPE_KEYS.has(entry.sectionKey)));
      setSelectedScopes(riskyScopes);
      panel.setStatus(`高リスクの ${riskyScopes.length} 項目だけを選択しました。`, riskyScopes.length ? "warn" : "info");
    });
    function startPreview(okMessage) {
      if (busy || previewBtn.disabled) return;
      const { scopes, lookupState } = getPreviewState();
      const lookupError = lookupMapError(lookupState);
      const lookupMap = lookupMapValue(lookupState);
      if (!scopes.length) {
        panel.setStatus("反映する項目を選んでください。", "warn");
        return;
      }
      if (lookupError) {
        panel.setStatus(lookupError, "warn");
        return;
      }
      return runLite("差分を取得中…", async () => {
        const result = await runPreview(scopes, lookupMap);
        const failed = result.entries.filter((entry) => scopes.includes(entry.sectionKey) && (entry.status === "src-missing" || entry.status === "tgt-missing")).length;
        if (failed) panel.setStatus(`差分を取得しました（${scopes.length} 項目中 ${failed} 項目は設定を取得できませんでした）。取得し直すか、その項目を対象から外してください。まだ書き込んでいません。`, "warn");
      }, okMessage || `差分を取得しました（${scopes.length} 項目を比較。まだ書き込んでいません）。`);
    }
    previewBtn.addEventListener("click", () => {
      startPreview();
    });
    function includeFieldSettingsAndRefetch() {
      if (busy || restoreMode) return;
      const chip = chips.find((c) => c.checkbox.value === "fieldSettings");
      if (!chip) return;
      chip.checkbox.checked = true;
      refreshScopeCount();
      saveState();
      refreshReviewCard();
      return startPreview("フィールド設定も反映対象に含めて差分を再取得しました。");
    }
    changedOnlyBtn.addEventListener("click", () => {
      const { preview, fresh } = getPreviewState();
      if (!fresh || !preview?.result) {
        panel.setStatus("先に最新の差分を取得してください。", "warn");
        return;
      }
      const changedScopes = preview.result.entries.filter((entry) => entry.status === "change").map((entry) => entry.sectionKey);
      setSelectedScopes(changedScopes);
      panel.setStatus(`差分あり ${changedScopes.length} 項目だけを選択しました。`, changedScopes.length ? "ok" : "info");
    });
    const confirmBtn = makeButton("最終確認に進む", "primary");
    const confirmCard = makeCard({ title: "この内容を反映先のプレビューへ反映します" });
    const confirmBody = document.createElement("div");
    confirmCard.body.appendChild(confirmBody);
    const acknowledged = makeCheck({ label: "反映先と変更・削除の内容を確認しました", checked: false });
    acknowledged.checkbox.setAttribute("aria-label", "反映内容の確認");
    const targetCheck = makeInput({ placeholder: "反映先アプリIDを入力", width: "wide" });
    targetCheck.setAttribute("aria-label", "確認用の反映先アプリID");
    targetCheck.setAttribute("data-lp-no-submit", "");
    targetCheck.inputMode = "numeric";
    targetCheck.autocomplete = "off";
    const targetCheckRow = makeRow([targetCheck], { label: "反映先アプリIDの再確認" });
    const confirmStatus = document.createElement("p");
    confirmStatus.className = "kus-rl-quiet";
    confirmStatus.setAttribute("aria-live", "polite");
    confirmCard.body.append(acknowledged.label, targetCheckRow, confirmStatus);
    let confirmedToken = "";
    function confirmationToken() {
      const state3 = getPreviewState();
      return state3.fresh ? JSON.stringify([state3.preview.signature, state3.preview.at, [...state3.scopes].sort(), state3.preview.restore || ""]) : "";
    }
    function clearConfirmation() {
      confirmedToken = "";
      acknowledged.checkbox.checked = false;
      targetCheck.value = "";
      confirmStatus.textContent = "書き込み先と変更内容を確認して、チェックを入れてください。";
    }
    function highImpactReasons() {
      const { preview, scopes } = getPreviewState();
      const entries = preview?.result.entries.filter((entry) => scopes.includes(entry.sectionKey) && entry.status === "change") || [];
      const reasons = [];
      const removals = entries.reduce((sum, entry) => sum + entry.removalCount, 0);
      if (removals) reasons.push(`削除・置換される設定が ${removals} 件あります`);
      if (entries.some((entry) => RISKY_SCOPE_KEYS.has(entry.sectionKey))) reasons.push("権限・通知・プロセス管理の変更を含みます");
      if (preview?.result.targetPending?.state === "pending") reasons.push(TARGET_PENDING_REASON);
      if (!sourceBundleFromJson && srcApp.value.trim() === tgtApp.value.trim() && srcGuest.value.trim() === tgtGuest.value.trim()) reasons.push("同じアプリの本番の設定でプレビューを更新します");
      return reasons;
    }
    function confirmationReady() {
      const state3 = getPreviewState();
      return !!confirmedToken && confirmedToken === confirmationToken() && acknowledged.checkbox.checked && !selectionIssues(state3.preview?.result, state3.scopes).length && (!highImpactReasons().length || targetCheck.value.trim() === tgtApp.value.trim());
    }
    function openConfirmation() {
      if (busy || confirmBtn.disabled) return;
      clearConfirmation();
      confirmedToken = confirmationToken();
      const state3 = getPreviewState();
      if (!confirmedToken || !state3.preview) return;
      confirmBody.innerHTML = "";
      renderReflectRoute(confirmBody, state3.preview.identities, sourceMode === "json" ? "設定JSON" : sourceEnvironment.value === "preview" ? "プレビュー" : "本番", restoreRouteOptions(state3.preview.identities));
      if (restoreMode) appendRestoreNotice(confirmBody);
      const entries = state3.preview.result.entries.filter((entry) => state3.scopes.includes(entry.sectionKey) && entry.status === "change");
      const changeTotal = entries.reduce((sum, entry) => sum + entry.changeCount, 0);
      const removalTotal = entries.reduce((sum, entry) => sum + entry.removalCount, 0);
      const summary = document.createElement("p");
      summary.dataset.confirmSummary = "changes";
      summary.textContent = `${entries.length} 項目を変更します：${entries.map((entry) => entry.label).join("、")}（設定の変更 ${changeTotal} 件${removalTotal ? `、うち削除・置換 ${removalTotal} 件` : ""}）`;
      confirmBody.appendChild(summary);
      const removals = [];
      for (const entry of entries) {
        const removedItems = (entry.items || []).filter((item) => item.kind === "削除" || item.kind === "変更" && item.details.some((detail2) => detail2.includes("削除")));
        if (removedItems.length || !entry.removalCount) removals.push(...removedItems.map((item) => describeRemovedItem(entry.label, item)));
        else removals.push(...entry.changes.filter((change) => change.kind === "削除").map((change) => describeRemovedChange(entry.label, change)));
      }
      if (removals.length) {
        const heading = document.createElement("p");
        heading.className = "kus-rl-confirm-heading";
        heading.textContent = `削除・置換される設定（${removals.length} 件）`;
        confirmBody.appendChild(heading);
        const list2 = document.createElement("ul");
        list2.className = "kus-rl-issues";
        list2.dataset.reflectRemovals = "true";
        for (const text of removals.slice(0, 30)) {
          const item = document.createElement("li");
          item.textContent = text;
          list2.appendChild(item);
        }
        if (removals.length > 30) {
          const item = document.createElement("li");
          item.textContent = `ほか ${removals.length - 30} 件。下の各項目の変更の要約・設定値の内訳、または反映計画JSONで全件を確認してください。`;
          list2.appendChild(item);
        }
        confirmBody.appendChild(list2);
      } else {
        const none = document.createElement("p");
        none.className = "kus-rl-quiet";
        none.dataset.reflectRemovals = removalTotal ? "unlisted" : "none";
        none.textContent = removalTotal ? `削除・置換される設定が ${removalTotal} 件あります。下の各項目の設定値の内訳で確認してください。` : "この反映で削除・置換される設定はありません。";
        confirmBody.appendChild(none);
      }
      const undo = document.createElement("p");
      undo.className = "kus-rl-quiet";
      undo.dataset.confirmUndo = state3.preview.result.targetPending?.state || "unknown";
      undo.textContent = describeConfirmUndo(state3.preview.result.targetPending);
      confirmBody.appendChild(undo);
      const policy = document.createElement("p");
      policy.className = "kus-rl-quiet";
      policy.textContent = "実行直前に設定を再取得し、確認後に別の変更があれば中止します。途中でエラーが起きたら、以降の項目を実行せず中断します。";
      confirmBody.appendChild(policy);
      appendTargetPendingNotice(confirmBody, state3.preview.result.targetPending);
      const reasons = highImpactReasons();
      targetCheckRow.hidden = !reasons.length;
      if (reasons.length) {
        const note = document.createElement("p");
        note.className = "kus-rl-next kus-rl-next--warn";
        note.textContent = reasons.join("。") + "。確認のため、反映先アプリIDを入力してください。";
        confirmBody.appendChild(note);
      }
      const uploadLabels = collectUploadLabels(entries);
      if (uploadLabels.length) {
        const box = document.createElement("div");
        box.className = "kus-rl-uploads";
        box.dataset.reflectUploads = "true";
        const title = document.createElement("strong");
        title.textContent = `反映先へアップロードするファイル（${uploadLabels.length} 件）`;
        const list2 = document.createElement("ul");
        for (const label of uploadLabels) {
          const item = document.createElement("li");
          item.textContent = label;
          list2.appendChild(item);
        }
        box.append(title, list2);
        confirmBody.appendChild(box);
      }
      for (const entry of entries) {
        const block = document.createElement("section");
        block.className = "kus-rl-confirm-entry";
        block.dataset.reflectConfirmEntry = entry.sectionKey;
        const heading = document.createElement("h3");
        heading.textContent = entry.label;
        block.appendChild(heading);
        appendReflectChanges(block, entry, { uploads: false });
        confirmBody.appendChild(block);
      }
      showWorkflowStage("confirm");
      refreshReviewCard();
      panel.setStatus("反映先と変更内容を確認してください。まだ書き込んでいません。", "info");
    }
    confirmBtn.addEventListener("click", openConfirmation);
    for (const control of [acknowledged.checkbox, targetCheck]) control.addEventListener("input", () => {
      runBtn.disabled = busy || !confirmationReady();
      confirmStatus.textContent = confirmationReady() ? "確認できました。下の反映ボタンで実行してください。" : "確認のチェックと、入力欄が表示されている場合は反映先アプリIDの入力が必要です。";
    });
    const exportPlanBtn = makeButton("反映計画JSONを保存", "sub");
    reviewCard.actions.appendChild(exportPlanBtn);
    exportPlanBtn.addEventListener("click", () => {
      const state3 = getPreviewState();
      if (!state3.fresh || !state3.preview) return;
      const payload = {
        generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
        identities: state3.preview.identities,
        sourceEnvironment: sourceMode === "json" ? "json" : sourceEnvironment.value,
        preserveTargetOnly: preserve.checkbox.checked,
        scopes: state3.scopes,
        targetPending: state3.preview.result.targetPending,
        entries: state3.preview.result.entries.filter((entry) => state3.scopes.includes(entry.sectionKey)),
        baseline: state3.preview.result.baseline
      };
      const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }));
      const appLabel = buildAppFilenameLabel(tgtApp.value.trim(), state3.preview.identities?.target?.name || "");
      const link = document.createElement("a");
      link.href = url;
      link.download = buildExportFilename("プレビュー反映計画", "json", { appLabel });
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 5e3);
    });
    const exportPlanMdBtn = makeButton("計画をMarkdownで保存", "sub");
    exportPlanMdBtn.title = "選択中の項目の計画（反映元と反映先・変更の要約・未公開の変更）をMarkdownで保存します";
    const copyPlanMdBtn = makeButton("計画のMarkdownをコピー", "sub");
    copyPlanMdBtn.title = "選択中の項目の計画をMarkdownとしてクリップボードへコピーします";
    reviewCard.actions.append(exportPlanMdBtn, copyPlanMdBtn);
    function buildPlanMarkdown() {
      const state3 = getPreviewState();
      if (!state3.fresh || !state3.preview) return null;
      const identities = reportIdentities(state3.preview.identities);
      const text = buildReflectReportMarkdown({
        generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
        source: identities.source,
        target: identities.target,
        sourceEnvironment: sourceMode === "json" ? "json" : sourceEnvironment.value === "preview" ? "preview" : "production",
        preserveTargetOnly: preserve.checkbox.checked,
        lookupMap: lookupMapValue(state3.lookupState),
        entries: state3.preview.result.entries.filter((entry) => state3.scopes.includes(entry.sectionKey)),
        targetPending: state3.preview.result.targetPending
      });
      return { text, appLabel: buildAppFilenameLabel(tgtApp.value.trim(), identities.target.name) };
    }
    async function copyMarkdown(text, what) {
      if (!text) {
        panel.setStatus(`${what}を作成できません。最新の差分を取得してください。`, "warn");
        return;
      }
      const copied = await copyTextToClipboard(text);
      panel.setStatus(copied ? `${what}のMarkdownをコピーしました。` : `コピーできませんでした。ブラウザの権限を確認するか、Markdownで保存してください。`, copied ? "ok" : "warn");
    }
    exportPlanMdBtn.addEventListener("click", () => {
      const built = buildPlanMarkdown();
      if (!built) {
        panel.setStatus("反映計画を作成できません。最新の差分を取得してください。", "warn");
        return;
      }
      const filename = buildExportFilename("プレビュー反映計画", "md", { appLabel: built.appLabel });
      downloadText(filename, built.text, "text/markdown");
      panel.setStatus(`反映計画を ${filename} に保存しました。`, "ok");
    });
    copyPlanMdBtn.addEventListener("click", () => {
      void copyMarkdown(buildPlanMarkdown()?.text, "反映計画");
    });
    const runBtn = makeButton("反映先プレビューへ反映", "run");
    runBtn.classList.add("kus-lp__btn--danger");
    runBtn.classList.remove("kus-lp__btn--run");
    runBtn.style.cssText = "";
    runBtn.classList.add("kus-lp__btn--danger");
    runBtn.style.padding = "11px 16px";
    runBtn.style.fontSize = "13px";
    runBtn.style.fontWeight = "700";
    panel.body.insertBefore(runBtn, panel.status);
    const logCard = makeCard({ title: "実行ログ", soft: true });
    const logPre = document.createElement("pre");
    logPre.style.cssText = "margin:0;padding:8px 10px;font:12.5px/1.6 ui-monospace,monospace;background:#0f172a;color:#e2e8f0;border-radius:8px;max-height:240px;overflow:auto;white-space:pre-wrap;display:none";
    logCard.body.appendChild(logPre);
    logCard.card.style.display = "none";
    panel.body.insertBefore(logCard.card, panel.status);
    const progressCard = makeCard({ title: "反映の進捗", soft: true });
    progressCard.card.classList.add("kus-rl-progress");
    progressCard.card.style.display = "none";
    const progressHost = document.createElement("div");
    progressCard.body.appendChild(progressHost);
    let progressView = null;
    panel.body.insertBefore(progressCard.card, panel.status);
    const lastResultCard = makeCard({ title: "直近の実行結果", soft: true });
    const lastResultBody = document.createElement("div");
    lastResultBody.className = "kus-lp__small";
    lastResultCard.body.appendChild(lastResultBody);
    const lastResultSections = document.createElement("div");
    lastResultCard.body.appendChild(lastResultSections);
    const undoNote = document.createElement("p");
    undoNote.className = "kus-rl-next kus-rl-next--info kus-rl-undo";
    undoNote.textContent = describeUndoGuidance(null).text;
    lastResultCard.body.appendChild(undoNote);
    const lastResultActions = document.createElement("div");
    lastResultActions.className = "kus-lp__btn-row";
    lastResultActions.style.marginTop = "8px";
    const retryFailedBtn = makeButton("失敗・未実行だけ選択", "sub");
    retryFailedBtn.title = "失敗または中断で未実行のセクションだけを反映対象に選び直します";
    const openTargetBtn = makeButton("反映先の設定画面を開く", "sub");
    openTargetBtn.title = "反映先アプリの設定画面を新しいタブで開きます（本番への公開はそこから行えます）";
    const restoreBtn = makeButton("バックアップから戻す（差分を確認）", "sub");
    restoreBtn.title = "反映前に自動保存したバックアップを反映元にして、反映先との差分を確認します（この操作では書き込みません）";
    restoreBtn.dataset.reflectRestore = "backup";
    const exportResultBtn = makeButton("実行結果JSONを保存", "sub");
    exportResultBtn.title = "実行時の対象、セクション別結果、ログを監査用JSONとして保存します";
    const verifyResultBtn = makeButton("反映後の差分を再確認", "primary");
    verifyResultBtn.title = "反映した項目を同じ条件で再取得し、反映先が反映元と一致したかを確認します（書き込みは行いません）";
    lastResultActions.appendChild(verifyResultBtn);
    lastResultActions.appendChild(retryFailedBtn);
    lastResultActions.appendChild(restoreBtn);
    lastResultActions.appendChild(exportResultBtn);
    const exportResultMdBtn = makeButton("記録をMarkdownで保存", "sub");
    exportResultMdBtn.title = "実行した項目の計画と結果（成功・失敗）をMarkdownの反映記録として保存します";
    const copyResultMdBtn = makeButton("記録のMarkdownをコピー", "sub");
    copyResultMdBtn.title = "反映記録をMarkdownとしてクリップボードへコピーします";
    lastResultActions.append(exportResultMdBtn, copyResultMdBtn);
    lastResultActions.appendChild(openTargetBtn);
    verifyResultBtn.addEventListener("click", () => {
      if (busy) return;
      const scopes = memoryState.lastResult?.report.scopes || [];
      if (!scopes.length) return;
      const lookupState = parseLookupMapText(lookupTa.value);
      const invalid = reflectConnectionError(currentOptions(scopes)) || lookupMapError(lookupState) || (sourceMode === "json" && !sourceBundleFromJson ? "反映元の設定JSONを読み込んでください。" : "");
      if (invalid) {
        panel.setStatus(`再確認できません。${invalid}`, "warn");
        return;
      }
      setSelectedScopes(scopes);
      return runLite("反映後の差分を再取得中…", async () => {
        await runPreview(scopes, lookupMapValue(lookupState), true);
        const summary = postApplySummary();
        if (summary) panel.setStatus(summary.message, summary.tone);
      });
    });
    lastResultCard.body.appendChild(lastResultActions);
    lastResultCard.card.style.display = "none";
    panel.body.insertBefore(lastResultCard.card, panel.status);
    function startRestoreFromBackup() {
      const last = memoryState.lastResult;
      if (busy || !last?.backup) return;
      let bundles;
      try {
        bundles = pickAllSettingsBundles(last.backup, "source", true);
      } catch (error) {
        panel.setStatus(`バックアップを読み込めません。${error?.message || String(error)}`, "err");
        return;
      }
      const bundle = bundles[0];
      const scopes = last.report.scopes.filter((key) => REFLECT_SECTION_KEYS.includes(key));
      if (!bundle?.appId || !scopes.length) {
        panel.setStatus("バックアップに戻せる内容が見つかりません。", "err");
        return;
      }
      const targetAppId = last.appId;
      const targetGuestId = last.guestId;
      const before = restoreMode ? restoreMode.before : {
        sourceMode,
        sourceAppId: srcApp.value,
        sourceGuestId: srcGuest.value,
        preserve: preserve.checkbox.checked,
        lookupText: lookupTa.value,
        scopes: collectSelectedScopes(),
        bundle: sourceBundleFromJson,
        bundles: sourceJsonBundles,
        bundleIndex: Math.max(0, sourceJsonBundles.indexOf(sourceBundleFromJson)),
        bundleToken: sourceBundleToken,
        bundleFileName: sourceBundleFileName
      };
      sourceMode = "json";
      sourceModeSelect.value = "json";
      sourceJsonBundles = bundles;
      renderJsonAppSelect();
      sourceBundleFromJson = bundle;
      sourceBundleToken = `backup:${last.at}:${Date.now()}`;
      sourceBundleFileName = `反映前バックアップ（${formatReflectDateTime(last.at)}）`;
      srcJsonFile.value = "";
      srcApp.value = String(bundle.appId);
      srcGuest.value = "";
      tgtApp.value = targetAppId;
      tgtGuest.value = targetGuestId;
      preserve.checkbox.checked = false;
      lookupTa.value = "";
      refreshLookupStatus();
      const restoreScopes = new Set(scopes);
      chips.forEach((chip) => {
        chip.checkbox.checked = restoreScopes.has(chip.checkbox.value);
      });
      refreshScopeCount();
      restoreMode = { token: sourceBundleToken, targetAppId, targetGuestId, at: last.at, scopes: collectSelectedScopes(), sourceAppId: srcApp.value, sourceGuestId: srcGuest.value, before };
      saveState();
      refreshSrcJsonNote();
      refreshSameConnBanner();
      refreshReviewCard();
      return startPreview("バックアップから戻す内容の差分を取得しました。反映前の状態に戻る内容を確認してください。");
    }
    restoreBtn.addEventListener("click", () => {
      startRestoreFromBackup();
    });
    function restoreStillApplies(mode) {
      return sourceMode === "json" && sourceBundleToken === mode.token && tgtApp.value.trim() === mode.targetAppId && tgtGuest.value.trim() === mode.targetGuestId && !preserve.checkbox.checked && lookupTa.value === "" && collectSelectedScopes().every((key) => mode.scopes.includes(key));
    }
    function endRestoreMode() {
      const mode = restoreMode;
      if (!mode) return "";
      restoreMode = null;
      const before = mode.before;
      let reverted = false;
      if (sourceMode === "json" && sourceBundleToken === mode.token) {
        sourceMode = before.sourceMode;
        sourceModeSelect.value = before.sourceMode;
        sourceBundleFromJson = before.bundle;
        sourceJsonBundles = before.bundles;
        sourceBundleToken = before.bundleToken;
        sourceBundleFileName = before.bundleFileName;
        renderJsonAppSelect();
        if (before.bundles.length) sourceJsonAppSelect.value = String(before.bundleIndex);
        srcJsonFile.value = "";
        srcApp.value = before.sourceAppId;
        srcGuest.value = before.sourceGuestId;
        reverted = true;
      } else if (sourceMode === "app" && srcApp.value.trim() === mode.sourceAppId && srcGuest.value.trim() === mode.sourceGuestId) {
        srcApp.value = before.sourceAppId;
        srcGuest.value = before.sourceGuestId;
        reverted = true;
      }
      if (!preserve.checkbox.checked && before.preserve) {
        preserve.checkbox.checked = true;
        reverted = true;
      }
      if (lookupTa.value === "" && before.lookupText !== "") {
        lookupTa.value = before.lookupText;
        reverted = true;
      }
      const selected = collectSelectedScopes();
      if (selected.length === mode.scopes.length && selected.every((key) => mode.scopes.includes(key)) && !(before.scopes.length === selected.length && before.scopes.every((key) => selected.includes(key)))) {
        const restoredScopes = new Set(before.scopes);
        chips.forEach((chip) => {
          chip.checkbox.checked = restoredScopes.has(chip.checkbox.value);
        });
        reverted = true;
      }
      refreshLookupStatus();
      refreshScopeCount();
      refreshSrcJsonNote();
      refreshSameConnBanner();
      saveState();
      memoryState.lastPreview = null;
      clearConfirmation();
      return reverted ? "バックアップからの復元を終了しました。保持設定・参照先変換などを復元前の値に戻しました。" : "バックアップからの復元を終了しました。";
    }
    function restoreSourceLabel(targetName) {
      return `反映前のバックアップ（${[targetName, restoreMode ? formatReflectDateTime(restoreMode.at) : ""].filter(Boolean).join("・")}）`;
    }
    function restoreRouteOptions(identities) {
      return restoreMode ? { sourceLabel: restoreSourceLabel(identities.target.name) } : {};
    }
    function reportIdentities(identities) {
      return restoreMode ? { ...identities, source: { ...identities.source, name: restoreSourceLabel(identities.target.name) } } : identities;
    }
    retryFailedBtn.addEventListener("click", () => {
      const retryScopes = memoryState.lastResult?.retryScopes || [];
      if (!retryScopes.length) return;
      setSelectedScopes(retryScopes);
      showWorkflowStage("setup");
      panel.setStatus(`失敗・未実行の ${retryScopes.length} 項目を選択しました。差分を取得して確認してから再実行してください。`, "info");
      scrollWithinCanvas(cardScope.card);
    });
    openTargetBtn.addEventListener("click", () => {
      const last = memoryState.lastResult;
      if (!last?.appId) return;
      const base = last.guestId ? `/k/guest/${encodeURIComponent(last.guestId)}` : "/k";
      const url = `${window.location.origin}${base}/admin/app/flow?app=${encodeURIComponent(last.appId)}`;
      window.open(url, "_blank", "noopener");
      panel.setStatus(`反映先アプリ #${last.appId} の設定画面を開きました。`, "info");
    });
    exportResultBtn.addEventListener("click", () => {
      const last = memoryState.lastResult;
      if (!last) return;
      const payload = {
        schemaVersion: 1,
        executedAt: new Date(last.at).toISOString(),
        summary: { ok: last.ok, ng: last.ng, ...last.stopped ? { stopped: last.stopped } : {}, pending: last.pending, ...last.cancelled ? { cancelled: true } : {} },
        ...last.report
      };
      const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = buildExportFilename("プレビュー反映結果", "json", { appLabel: `App${last.appId}` });
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 5e3);
    });
    function buildResultMarkdown() {
      const last = memoryState.lastResult;
      if (!last?.planned) return null;
      const { identities, entries } = last.planned;
      const built = buildReflectReportMarkdown({
        generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
        source: identities.source,
        target: identities.target,
        sourceEnvironment: last.report.source.environment,
        preserveTargetOnly: last.report.preserveTargetOnly,
        lookupMap: last.report.lookupMap,
        entries,
        targetPending: last.report.targetPending,
        outcome: { executedAt: new Date(last.at).toISOString(), sections: normalizeApplySections(last.report.sections) }
      });
      const text = last.cancelled ? built.replace("\n- 反映元:", `
- 実行状況: ${RUN_CANCELLED_MESSAGE}（途中で止まった項目は書き込み済みの分が反映先に残っています）
- 反映元:`) : built;
      return { text, appLabel: buildAppFilenameLabel(last.appId, identities.target.name) };
    }
    exportResultMdBtn.addEventListener("click", () => {
      const built = buildResultMarkdown();
      if (!built) {
        panel.setStatus("反映記録を作成できません。", "warn");
        return;
      }
      const filename = buildExportFilename("プレビュー反映記録", "md", { appLabel: built.appLabel });
      downloadText(filename, built.text, "text/markdown");
      panel.setStatus(`反映記録を ${filename} に保存しました。`, "ok");
    });
    copyResultMdBtn.addEventListener("click", () => {
      void copyMarkdown(buildResultMarkdown()?.text, "反映記録");
    });
    function renderLastResult() {
      const last = memoryState.lastResult;
      if (!last) {
        lastResultCard.card.style.display = "none";
        return;
      }
      const stamp = formatReflectDateTime(last.at);
      const hasIssue = last.ng > 0 || last.stopped > 0 || last.pending > 0;
      const tone = hasIssue ? "color:#9a3412" : "color:#065f46";
      const labelSummary = (title, labels2) => labels2.length ? `<div>${title}: ${escapeHtml(labels2.slice(0, 5).join(" / "))}${labels2.length > 5 ? ` ほか ${labels2.length - 5} 件` : ""}</div>` : "";
      const failedSummary = labelSummary("失敗", last.failedLabels) + labelSummary("途中で停止", last.stoppedLabels);
      lastResultBody.innerHTML = `<div style="${tone};font-weight:600">${last.cancelled ? "⚠ 中止しました。書き込み済みの分は反映先に残っています" : hasIssue ? "⚠ 一部の項目を反映できませんでした" : `✓ ${last.ok} 項目を反映しました`}</div><div>反映先 #${escapeHtml(last.appId || "-")} / 成功 ${last.ok} / 失敗 ${last.ng}${last.stopped ? ` / 途中で停止 ${last.stopped}` : ""}${last.pending ? ` / 未実行 ${last.pending}` : ""}</div>` + failedSummary + `<div>${stamp}</div>` + (hasIssue ? `<div style="margin-top:4px">${last.cancelled ? "差分を取得し直して現在の状態を確認してから、" : ""}「失敗・未実行だけ選択」で対象を絞って再実行してください。</div>` : '<div style="margin-top:4px">変わったのは反映先のプレビューだけです。本番へ公開するには、反映先の設定画面で公開してください。</div>');
      renderApplySectionResults(lastResultSections, last.report.sections);
      const guidance = describeUndoGuidance(last.report.targetPending);
      undoNote.textContent = guidance.text;
      undoNote.className = `kus-rl-next kus-rl-next--${guidance.tone} kus-rl-undo`;
      undoNote.dataset.undoState = last.report.targetPending?.state || "unknown";
      openTargetBtn.classList.toggle("kus-lp__btn--primary", guidance.openSettings);
      openTargetBtn.classList.toggle("kus-lp__btn--sub", !guidance.openSettings);
      restoreBtn.style.display = last.backup ? "" : "none";
      retryFailedBtn.style.display = last.retryScopes.length ? "" : "none";
      verifyResultBtn.style.display = last.report.scopes.length ? "" : "none";
      exportResultBtn.style.display = "";
      exportResultMdBtn.style.display = last.planned ? "" : "none";
      copyResultMdBtn.style.display = last.planned ? "" : "none";
      openTargetBtn.style.display = last.appId ? "" : "none";
      lastResultCard.card.style.display = "block";
    }
    renderLastResult();
    runBtn.addEventListener("click", async () => {
      if (busy || runBtn.disabled || activeStage !== "confirm" || !confirmationReady()) return;
      const { scopes, lookupState } = getPreviewState();
      const lookupError = lookupMapError(lookupState);
      const lookupMap = lookupMapValue(lookupState);
      if (!scopes.length) {
        panel.setStatus("反映する項目を選んでください。", "warn");
        return;
      }
      if (lookupError) {
        panel.setStatus(lookupError, "warn");
        return;
      }
      saveState();
      const outcome = await runLite("反映先プレビューへ書き込み中…", async () => {
        let previewState = getPreviewState(scopes, lookupState);
        let previewResult = previewState.fresh ? previewState.preview?.result || null : null;
        if (!previewResult) {
          panel.setStatus("差分を再取得して、変更内容を確認してください。", "warn");
          return { cancelled: true };
        }
        const plan = getExecutionPlan(scopes, previewResult);
        if (!plan.effectiveScopes.length) {
          if (!previewResult.changedSections) {
            throw new Error("変更が必要な項目がないため、反映は実行しません。");
          }
          throw new Error(`実行する項目がありません（${buildSkipSummary(plan)}）。`);
        }
        if (selectionIssues(previewResult, scopes).length) throw new Error("確認できない項目が含まれています。差分確認へ戻ってください。");
        const plannedSnapshot = { identities: reportIdentities(previewState.preview.identities), entries: previewResult.entries.filter((entry) => plan.effectiveScopes.includes(entry.sectionKey)) };
        const wasRestoreMode = !!restoreMode;
        const progressRows = createApplyProgressRows(plan.effectiveScopes, (key) => previewResult.entries.find((entry) => entry.sectionKey === key)?.label || reflectSectionLabel(key));
        const applyOptions = {
          ...currentOptions(plan.effectiveScopes),
          reviewBaseline: previewResult.baseline,
          doDeploy: false,
          doBackup: true,
          stopOnError: true,
          onSectionUpdate: (update) => {
            progressView?.update(update);
            if (update.status === "running") {
              const item = progressHost.querySelector(`[data-progress-section="${update.sectionKey}"]`);
              if (item) keepVisibleWithinCanvas(item);
            }
          }
        };
        const targetPendingAtApply = previewResult.targetPending;
        clearConfirmation();
        const previous = { result: memoryState.lastResult, log: logPre.textContent || "", logVisible: logCard.card.style.display !== "none" };
        logCard.card.style.display = "block";
        logPre.style.display = "block";
        logPre.textContent = "";
        showWorkflowStage("result");
        memoryState.lastPreview = null;
        memoryState.lastResult = null;
        renderLastResult();
        renderRollout();
        progressView = createApplyProgressView(progressHost, progressRows);
        progressCard.card.style.display = "block";
        let applyOutcome;
        try {
          applyOutcome = await runApplyPreviewStandalone(
            applyOptions,
            (m, e) => panel.setStatus(m, e ? "err" : "busy"),
            (logsArr) => {
              logPre.textContent = logsArr.join("\n");
              logPre.scrollTop = logPre.scrollHeight;
            }
          );
        } catch (error) {
          memoryState.lastResult = previous.result;
          logPre.textContent = previous.log;
          logPre.style.display = previous.log ? "block" : "none";
          logCard.card.style.display = previous.logVisible ? "block" : "none";
          renderLastResult();
          renderRollout();
          showWorkflowStage("review");
          throw error;
        } finally {
          progressCard.card.style.display = "none";
          progressHost.replaceChildren();
          progressView = null;
        }
        const counts = summarizeApplyOutcome(applyOutcome.sections);
        memoryState.lastResult = {
          ok: counts.ok,
          ng: counts.ng,
          stopped: counts.stopped,
          pending: counts.pending,
          at: Date.now(),
          appId: applyOptions.targetAppId,
          guestId: applyOptions.targetGuestId,
          retryScopes: collectRetrySectionKeys(applyOutcome.sections),
          failedLabels: applyOutcome.sections.filter((s) => s.status === "ng" && !s.stopped).map((s) => s.label),
          stoppedLabels: applyOutcome.sections.filter((s) => s.status === "ng" && s.stopped).map((s) => s.label),
          sourceBundleToken: sourceMode === "json" ? sourceBundleToken : "",
          ...applyOutcome.cancelled ? { cancelled: true } : {},
          ...applyOutcome.backup ? { backup: applyOutcome.backup } : {},
          ...applyOutcome.finalRevision ? { finalRevision: applyOutcome.finalRevision } : {},
          planned: plannedSnapshot,
          report: {
            source: {
              appId: applyOptions.sourceBundle ? String(applyOptions.sourceBundle?.appId || "") : applyOptions.sourceAppId,
              guestId: applyOptions.sourceBundle ? "" : applyOptions.sourceGuestId || "",
              environment: sourceMode === "json" ? "json" : applyOptions.sourcePreview ? "preview" : "production"
            },
            target: { appId: applyOptions.targetAppId, guestId: applyOptions.targetGuestId || "", environment: "preview" },
            preserveTargetOnly: !!applyOptions.preserveTargetOnly,
            scopes: plan.effectiveScopes.slice(),
            lookupMap: { ...applyOptions.lookupMap || {} },
            ...targetPendingAtApply ? { targetPending: targetPendingAtApply } : {},
            sections: applyOutcome.sections,
            logs: applyOutcome.logs.slice()
          }
        };
        memoryState.staleResult = null;
        if (applyOutcome.finalRevision) memoryState.lastWrite = { targetAppId: applyOptions.targetAppId, targetGuestId: applyOptions.targetGuestId || "", finalRevision: applyOutcome.finalRevision, priorState: targetPendingAtApply?.state };
        if (!wasRestoreMode) recordRolloutResult({ appId: applyOptions.targetAppId, guestId: applyOptions.targetGuestId || "", name: plannedSnapshot.identities.target.name, ok: counts.ok, ng: counts.ng, ...counts.stopped ? { stopped: counts.stopped } : {}, pending: counts.pending, at: memoryState.lastResult.at, ...applyOutcome.cancelled ? { cancelled: true } : {} });
        renderLastResult();
        showWorkflowStage("result");
        return { cancelled: false, hadError: counts.ng > 0 || counts.stopped > 0 || counts.pending > 0, counts, failureNote: describeFirstFailure(applyOutcome.sections), stopped: counts.ng + counts.stopped + counts.pending > 0 && !!applyOutcome.cancelled ? { ok: counts.ok, ng: counts.ng, stopped: counts.stopped, pending: counts.pending } : null };
      });
      if (!outcome) return;
      if (outcome.cancelled) {
        panel.setStatus("反映を実行しませんでした（書き込みはありません）。差分を取得し直してください。", "info");
        return;
      }
      if (outcome.stopped) {
        const { ok, ng, stopped, pending } = outcome.stopped;
        const total = ok + ng + stopped + pending;
        const queue = currentRollout();
        const queued = queue.ok ? queue.targets.length : 0;
        panel.setStatus(
          `中止しました（${ok}/${total} 件を反映${stopped ? `、${stopped} 件は途中で停止` : ""}${ng ? `、${ng} 件は失敗` : ""}、残り ${pending} 件は未実行）。書き込み済みの分は反映先プレビューに残っています。${queued ? `続けて反映する ${queued} 件の反映先は未実行です。` : ""}差分を取得し直して現在の状態を確認してください。`,
          "warn"
        );
        return;
      }
      if (!outcome.counts) return;
      if (outcome.hadError) {
        const { ok, ng, pending } = outcome.counts;
        panel.setStatus(`${ok + ng + outcome.counts.stopped + pending} 項目中 ${ok} 項目を反映しました。失敗 ${ng} 項目${pending ? `、未実行 ${pending} 項目` : ""}${outcome.failureNote ? `（${outcome.failureNote}）` : ""}。「失敗・未実行だけ選択」で再実行してください。`, "warn");
        return;
      }
      panel.setStatus(`${outcome.counts.ok} 項目を反映先プレビューへ反映しました。本番へ公開するには、「反映先の設定画面を開く」から kintone の設定画面で公開してください。`, "ok");
    });
    const nav = document.createElement("nav");
    nav.className = "kus-rl-nav";
    nav.setAttribute("aria-label", "プレビュー反映の手順");
    nav.setAttribute("role", "tablist");
    const stageDefs = [
      { id: "setup", number: "1", label: "対象を選ぶ", copy: "反映元・反映先・項目を選ぶ" },
      { id: "review", number: "2", label: "差分を確認", copy: "変更前後を見て項目を絞る" },
      { id: "confirm", number: "3", label: "最終確認", copy: "書き込み先と件数を確かめる" },
      { id: "result", number: "4", label: "反映結果", copy: "結果を見て次の操作を選ぶ" }
    ];
    const stages = {};
    const navButtons = {};
    for (const def of stageDefs) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "kus-rl-nav__btn";
      button.id = `kus-rl-tab-${def.id}`;
      button.setAttribute("role", "tab");
      button.setAttribute("aria-controls", `kus-rl-stage-${def.id}`);
      button.innerHTML = `<span class="kus-rl-nav__num">${def.number}</span><span>${def.label}<small class="kus-rl-nav__copy">${def.copy}</small></span>`;
      nav.appendChild(button);
      navButtons[def.id] = button;
      const stage = document.createElement("section");
      stage.className = "kus-rl-stage";
      stage.id = `kus-rl-stage-${def.id}`;
      stage.dataset.stage = def.id;
      stage.setAttribute("role", "tabpanel");
      stage.setAttribute("aria-labelledby", button.id);
      stages[def.id] = stage;
      button.addEventListener("click", () => def.id === "confirm" ? openConfirmation() : showWorkflowStage(def.id));
      button.addEventListener("keydown", (event) => {
        if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
        event.preventDefault();
        const count = stageDefs.length;
        const current = stageDefs.findIndex((item) => item.id === def.id);
        const enabledAt = (index) => !navButtons[stageDefs[index].id].disabled;
        let nextIndex = -1;
        if (event.key === "Home" || event.key === "End") {
          const order = stageDefs.map((_, index) => event.key === "Home" ? index : count - 1 - index);
          nextIndex = order.find(enabledAt) ?? -1;
        } else {
          const direction = event.key === "ArrowRight" ? 1 : -1;
          for (let step = 1; step < count; step += 1) {
            const index = (current + direction * step + count) % count;
            if (enabledAt(index)) {
              nextIndex = index;
              break;
            }
          }
        }
        if (nextIndex < 0 || nextIndex === current) return;
        const next = stageDefs[nextIndex];
        if (next.id === "confirm") openConfirmation();
        else showWorkflowStage(next.id);
      });
    }
    stages.setup.innerHTML = '<header class="kus-rl-stage-head"><h2>どの設定を、どこへ反映しますか？</h2><p>反映元（読み取り）と反映先（書き込み・プレビュー）のアプリを指定し、反映する項目を選びます。</p></header>';
    stages.review.innerHTML = '<header class="kus-rl-stage-head"><h2>変更前後を確認して、反映する項目を決める</h2><p>差分のある項目と注意点を確認します。この画面では書き込みません。</p></header>';
    stages.confirm.innerHTML = '<header class="kus-rl-stage-head"><h2>書き込み先と内容の最終確認</h2><p>書き込み先・変更件数・削除・取り消し方を確認してから反映します。</p></header>';
    stages.confirm.appendChild(confirmCard.card);
    stages.result.innerHTML = '<header class="kus-rl-stage-head"><h2>実行結果と次の操作</h2><p>成功・失敗と、再実行が必要な項目を確認します。</p></header>';
    const setupGrid = document.createElement("div");
    setupGrid.className = "kus-rl-setup-grid";
    [cardApp.card, cardScope.card].forEach((node) => setupGrid.appendChild(node));
    const detail = makeDialog({ title: "詳細設定", id: "kus-rl-detail" });
    detail.body.append(detailStatus, cardOpt.card, cardLookup.card, cardPreset.card, rolloutSetupCard.card);
    detail.dialog.addEventListener("close", () => {
      detailStatus.hidden = true;
      detailStatus.textContent = "";
    });
    panel.root.appendChild(detail.dialog);
    const detailBtn = makeButton("詳細設定…", "sub");
    detailBtn.setAttribute("aria-haspopup", "dialog");
    detailBtn.addEventListener("click", () => detail.open());
    const detailSummary = document.createElement("span");
    detailSummary.className = "kus-rl-detail-summary";
    const detailRow = document.createElement("div");
    detailRow.className = "kus-rl-detail-row";
    detailRow.append(detailBtn, detailSummary);
    setupGrid.appendChild(detailRow);
    function refreshDetailSummary() {
      const parts = [preserve.checkbox.checked ? "反映先だけの一覧・グラフ・アクションは保持" : "反映先だけの一覧・グラフ・アクションを削除"];
      let warn = !preserve.checkbox.checked;
      const lookup = parseLookupMapText(lookupTa.value);
      if (!lookup.ok) {
        parts.push("参照先変換に誤りがあります");
        warn = true;
      } else if (lookup.count) parts.push(`参照先変換 ${lookup.count} 件`);
      if (rolloutTa.value.trim()) {
        const queue = currentRollout();
        if (!queue.ok) {
          parts.push("続けて反映する反映先に誤りがあります");
          warn = true;
        } else if (queue.targets.length) parts.push(`続けて反映 ${queue.targets.length} 件`);
      }
      detailSummary.textContent = `詳細設定: ${parts.join(" / ")}`;
      detailSummary.classList.toggle("kus-rl-detail-summary--warn", warn);
    }
    stages.setup.appendChild(setupGrid);
    [reviewCard.card, previewCard.card].forEach((node) => stages.review.appendChild(node));
    [progressCard.card, lastResultCard.card, rolloutCard.card, logCard.card].forEach((node) => stages.result.appendChild(node));
    const resultEmpty = document.createElement("div");
    resultEmpty.className = "kus-rl-preview-empty";
    const RESULT_EMPTY_TEXT = "まだ反映していません。対象を選び、差分を確認してから反映してください。";
    resultEmpty.textContent = RESULT_EMPTY_TEXT;
    stages.result.appendChild(resultEmpty);
    const dock = document.createElement("div");
    dock.className = "kus-rl-action-dock";
    const dockRow = document.createElement("div");
    dockRow.className = "kus-rl-dock-row";
    const dockCopy = document.createElement("div");
    dockCopy.className = "kus-rl-dock-copy";
    dockCopy.setAttribute("aria-live", "polite");
    const dockActions = document.createElement("div");
    dockActions.className = "kus-rl-dock-actions";
    const backBtn = makeButton("対象を変更", "sub");
    backBtn.addEventListener("click", () => showWorkflowStage(activeStage === "confirm" ? "review" : "setup"));
    const nextBtn = makeButton("差分を確認する", "primary");
    nextBtn.addEventListener("click", () => {
      if (getPreviewState().fresh) showWorkflowStage("review");
      else previewBtn.click();
    });
    dockActions.append(backBtn, previewBtn, nextBtn, confirmBtn, runBtn);
    dockRow.append(dockCopy, dockActions);
    dock.appendChild(dockRow);
    dock.appendChild(panel.status);
    dock.appendChild(panel.result);
    const hint = panel.body.querySelector(".kus-lp__hint");
    const workspace = document.createElement("div");
    workspace.className = "kus-rl-workspace";
    const canvas = document.createElement("main");
    canvas.className = "kus-rl-canvas";
    workspace.appendChild(nav);
    stageDefs.forEach((def) => canvas.appendChild(stages[def.id]));
    workspace.appendChild(canvas);
    hint?.insertAdjacentElement("afterend", workspace);
    panel.body.appendChild(dock);
    [stages.setup, stages.review, stages.confirm, stages.result, detail.body].forEach((scope) => attachCardHelp(scope));
    let activeStage = "setup";
    const noInputSubmit = document.createElement("button");
    noInputSubmit.disabled = true;
    function dockEndpointLabel(side, identities) {
      const role = side === "source" ? "反映元" : "反映先";
      if (side === "source" && restoreMode) return `${role}: ${restoreSourceLabel(identities?.target.name || targetNote.known()?.name || "")}`;
      let id;
      let name = "";
      let guest;
      if (identities) {
        ({ appId: id, name, guestId: guest } = identities[side]);
      } else if (side === "source" && sourceMode === "json") {
        id = String(sourceBundleFromJson?.appId || srcApp.value.trim());
        name = sourceBundleFromJson ? extractAppNameFromBundle(sourceBundleFromJson) : "";
        guest = "";
      } else {
        id = (side === "source" ? srcApp : tgtApp).value.trim();
        guest = (side === "source" ? srcGuest : tgtGuest).value.trim();
        name = (side === "source" ? sourceNote : targetNote).known()?.name || "";
      }
      const head = name ? `${role}: ${name}（#${id}）` : `${role}: ${id ? `#${id}` : "未入力"}`;
      const tail = [
        guest ? `ゲストスペース ${guest}` : "",
        side === "target" ? "プレビュー" : sourceMode === "json" ? "設定JSON" : sourceEnvironment.value === "preview" ? "プレビュー設定" : ""
      ].filter(Boolean);
      return tail.length ? `${head} / ${tail.join(" / ")}` : head;
    }
    refreshWorkflow = () => {
      const { scopes, fresh, preview } = getPreviewState();
      const plan = fresh ? getExecutionPlan(scopes, preview?.result) : null;
      backBtn.hidden = activeStage === "setup";
      nextBtn.hidden = activeStage !== "setup";
      previewBtn.hidden = activeStage !== "review";
      confirmBtn.hidden = activeStage !== "review";
      runBtn.hidden = activeStage !== "confirm";
      backBtn.disabled = busy;
      nextBtn.disabled = previewBtn.disabled || busy;
      navButtons.confirm.disabled = confirmBtn.disabled;
      setButtonText(backBtn, activeStage === "confirm" ? "差分に戻る" : "対象を変更");
      setButtonText(nextBtn, fresh ? "取得済みの差分へ進む" : "差分を確認する");
      setButtonText(previewBtn, "差分を再取得");
      previewBtn.classList.toggle("kus-lp__btn--primary", !fresh);
      previewBtn.classList.toggle("kus-lp__btn--sub", fresh);
      resultEmpty.hidden = !!memoryState.lastResult || logCard.card.style.display !== "none";
      resultEmpty.textContent = !memoryState.lastResult && memoryState.staleResult ? STALE_RESULT_NOTICE : RESULT_EMPTY_TEXT;
      const setupBlocker = activeStage === "setup" ? describeReflectSetupBlocker({
        connectionError: reflectConnectionError(currentOptions()),
        sourceMode,
        hasSourceBundle: !!sourceBundleFromJson,
        scopeCount: scopes.length,
        lookupError: lookupMapError(parseLookupMapText(lookupTa.value))
      }) : "";
      let message = setupBlocker ? `次に進むには：${setupBlocker}` : `${scopes.length} 項目を比較します。書き込みは行いません。`;
      const postApply = activeStage === "review" ? postApplySummary() : null;
      if (activeStage === "review") message = !fresh ? "差分を取得してください。" : postApply ? postApply.message : confirmBtn.disabled ? "反映できる項目がないか、確認できない項目が選択されています。内容を確認してください。" : `${plan?.effectiveScopes.length} 項目の内容を確認し、最終確認へ進んでください。`;
      if (activeStage === "confirm") message = fresh && confirmedToken ? "反映前に自動でバックアップします。エラー時は中断し、本番へは公開しません。" : "条件が変わりました。差分の取得と最終確認をやり直してください。";
      if (activeStage === "result") message = "結果を確認してください。再実行には差分の再取得が必要です。";
      const sourceLabel = dockEndpointLabel("source", fresh ? preview?.identities : null);
      const targetLabel = dockEndpointLabel("target", fresh ? preview?.identities : null);
      dockCopy.innerHTML = activeStage === "confirm" && fresh && preview?.identities ? `<strong>書き込み先（反映先） #${escapeHtml(preview.identities.target.appId)} · プレビュー</strong><span class="kus-rl-dock-msg">${escapeHtml(confirmedToken ? "内容を確認してから反映してください。" : "条件が変わりました。差分を再取得してください。")}</span>` : `<strong>${escapeHtml(sourceLabel)} → ${escapeHtml(targetLabel)}</strong><span class="kus-rl-dock-msg${setupBlocker ? " kus-rl-dock-reason" : ""}">${escapeHtml(message)}</span>`;
      panel.result.hidden = activeStage === "confirm";
      refreshDetailSummary();
      panel.setPrimaryAction(activeStage === "setup" ? nextBtn : activeStage === "review" ? fresh ? confirmBtn : previewBtn : noInputSubmit);
    };
    showWorkflowStage = (active2) => {
      if (active2 === "confirm" && !confirmedToken) return;
      if (activeStage === "confirm" && active2 !== "confirm") clearConfirmation();
      activeStage = active2;
      stageDefs.forEach((def) => {
        const selected = def.id === active2;
        stages[def.id].hidden = !selected;
        navButtons[def.id].setAttribute("aria-selected", String(selected));
        navButtons[def.id].tabIndex = selected ? 0 : -1;
      });
      navButtons[active2].focus({ preventScroll: true });
      canvas.scrollTo({ top: 0 });
      refreshWorkflow();
    };
    const setPanelBusy = panel.setBusy;
    const disabledBefore = /* @__PURE__ */ new Map();
    panel.setBusy = (value) => {
      busy = value;
      panel.root.setAttribute("aria-busy", String(value));
      nav.inert = value;
      stageDefs.forEach((def) => {
        stages[def.id].inert = value && def.id !== "result";
      });
      if (value) {
        panel.root.querySelectorAll("input,button,select,textarea").forEach((control) => {
          if (control.classList.contains("kus-lp__cancel") || control.classList.contains("kus-lp__toggle")) return;
          if (!disabledBefore.has(control)) disabledBefore.set(control, control.disabled);
          control.disabled = true;
        });
        setPanelBusy(value);
        return;
      }
      try {
        disabledBefore.forEach((disabled, control) => {
          control.disabled = disabled;
        });
        disabledBefore.clear();
        refreshSrcJsonNote();
        refreshPresetSelect();
        refreshPresetButtons();
        refreshReviewCard();
        navButtons[activeStage].focus({ preventScroll: true });
      } finally {
        setPanelBusy(value);
      }
    };
    refreshSameConnBanner();
    refreshReviewCard();
    showWorkflowStage(memoryState.lastResult ? "result" : memoryState.lastPreview ? "review" : "setup");
  }
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (ch) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[ch]);
  }
  function appendRestoreNotice(host) {
    const note = document.createElement("p");
    note.className = "kus-rl-next kus-rl-next--info kus-rl-restore-notice";
    note.dataset.restoreNotice = "true";
    note.textContent = RESTORE_MODE_NOTICE;
    host.appendChild(note);
  }
  function appendTargetPendingNotice(host, pending) {
    if (!pending) return;
    const box = document.createElement("div");
    box.dataset.targetPending = pending.state;
    const text = document.createElement("span");
    text.textContent = pending.message;
    if (pending.state === "pending") {
      box.className = "kus-rl-next kus-rl-next--warn";
      const title = document.createElement("strong");
      title.textContent = "反映先に以前からの未公開の変更があります";
      box.append(title, text);
    } else {
      box.className = `kus-rl-pending kus-rl-pending--${pending.state === "clean" || pending.state === "own" ? "clean" : "unknown"}`;
      const mark = document.createElement("strong");
      mark.textContent = pending.state === "clean" ? "✓ 未公開の変更なし" : pending.state === "own" ? "✓ 未公開の変更はこのツールの反映分だけ" : "ⓘ 未公開の変更は未確認";
      box.append(mark, text);
    }
    host.appendChild(box);
  }
  function describeConfirmUndo(pending) {
    if (pending?.state === "clean" || pending?.state === "own") {
      return "取り消し方：反映後に、kintone のアプリ設定画面で「変更を中止」を押すと取り消せます。反映前の設定は自動でバックアップされ、「バックアップから戻す」でも戻せます。";
    }
    if (pending?.state === "pending") {
      return "取り消し方：反映先に未公開の変更があるため、「変更を中止」を押すとそれらも破棄されます。今回の反映だけを戻すには、反映後に「バックアップから戻す」を使ってください。";
    }
    return "取り消し方：反映前の設定は自動でバックアップされ、反映後に「バックアップから戻す」で戻せます。未公開の変更を確認できなかったため、「変更を中止」では他の未公開の変更も破棄される場合があります。";
  }
  function describeFirstFailure(sections) {
    const failed = sections.find((section) => section.status === "ng" && !section.stopped);
    if (!failed) return "";
    const label = failed.label && failed.label !== failed.sectionKey ? failed.label : reflectSectionLabel(failed.sectionKey || "");
    const reason = String(failed.message || "").split("\n")[0].trim();
    return reason ? `${label}: ${reason.length > 80 ? `${reason.slice(0, 80)}…` : reason}` : label;
  }
  function formatPreviewStamp(at) {
    const diffSec = Math.max(0, Math.floor((Date.now() - at) / 1e3));
    if (diffSec < 60) return `たった今 (${formatReflectTime(at)})`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}分前 (${formatReflectTime(at)})`;
    return formatReflectDateTime(at);
  }
  function buildSkipSummary(plan) {
    const parts = [];
    if (plan.skippedSameScopes.length > 0) parts.push(`一致除外 ${plan.skippedSameScopes.length}件`);
    if (plan.skippedErrorScopes.length > 0) parts.push(`失敗除外 ${plan.skippedErrorScopes.length}件`);
    return parts.length ? parts.join(" / ") : "除外なし";
  }
  function renderRolloutLog(host, log, dropped = 0) {
    host.replaceChildren();
    if (!log.length) return;
    const heading = document.createElement("div");
    heading.className = "kus-rl-rollout-heading";
    heading.textContent = `これまでの反映先（${log.length} 件）`;
    const list2 = document.createElement("ul");
    list2.className = "kus-rl-rollout-list";
    for (const entry of log) {
      const tone = entry.ng > 0 || (entry.stopped || 0) > 0 ? "ng" : entry.pending > 0 ? "pending" : "ok";
      const item = document.createElement("li");
      item.className = `kus-rl-rollout-item kus-rl-rollout-item--${tone}`;
      item.dataset.rolloutEntry = `${entry.guestId ? `${entry.guestId}:` : ""}${entry.appId}`;
      const head = document.createElement("div");
      head.className = "kus-rl-rollout-item__head";
      const state3 = document.createElement("span");
      state3.className = `kus-rl-result-state kus-rl-result-state--${tone}`;
      const icon = document.createElement("span");
      icon.setAttribute("aria-hidden", "true");
      icon.textContent = tone === "ok" ? "✓" : "⚠";
      state3.append(icon, document.createTextNode(entry.cancelled ? "中止" : tone === "ok" ? "成功" : entry.ng > 0 ? "失敗あり" : tone === "ng" ? "途中で停止あり" : "未実行あり"));
      const name = document.createElement("strong");
      name.textContent = `${formatRolloutTarget(entry)}${entry.name ? ` ${entry.name}` : ""}`;
      head.append(state3, name);
      const meta = document.createElement("div");
      meta.className = "kus-rl-quiet";
      meta.textContent = `成功 ${entry.ok} / 失敗 ${entry.ng}${entry.stopped ? ` / 途中で停止 ${entry.stopped}` : ""} / 未実行 ${entry.pending}${entry.cancelled ? " · 中止" : ""} · ${formatReflectDateTime(entry.at)}`;
      item.append(head, meta);
      list2.appendChild(item);
    }
    host.append(heading);
    if (dropped > 0) {
      const droppedNote = document.createElement("div");
      droppedNote.className = "kus-rl-quiet";
      droppedNote.dataset.rolloutLogDropped = String(dropped);
      droppedNote.textContent = `記録の上限を超えたため、古い反映先 ${dropped} 件の記録は省略しています。`;
      host.append(droppedNote);
    }
    host.append(list2);
  }
  function setButtonText(button, text) {
    const spans = button.querySelectorAll("span");
    const label = spans[spans.length - 1];
    if (label) label.textContent = text;
    else button.textContent = text;
  }
  function buildPreviewSignature(args) {
    const lookupPairs = Object.keys(args.lookupMap || {}).sort().map((key) => [key, args.lookupMap[key]]);
    return JSON.stringify({
      sourceAppId: args.sourceAppId,
      sourceGuestId: args.sourceGuestId,
      sourcePreview: !!args.sourcePreview,
      sourceBundleToken: args.sourceBundleToken || "",
      targetAppId: args.targetAppId,
      targetGuestId: args.targetGuestId,
      scopes: [...args.scopes || []].sort(),
      lookupPairs,
      preserveTargetOnly: args.preserveTargetOnly
    });
  }
  function filterPreviewEntries(entries, keyword, status = "all") {
    entries = entries.filter((entry) => status === "all" || (status === "error" ? !["change", "same"].includes(entry.status) : entry.status === status));
    if (!keyword) return entries;
    return entries.filter((entry) => {
      const hay = [entry.label, entry.message, entry.sectionKey, ...entry.changes.map((change) => [change.path, change.before, change.after].join(" "))].filter(Boolean).join("\n").toLowerCase();
      return hay.includes(keyword);
    });
  }
  function uniqueSectionKeys(entries) {
    return [...new Set(entries.map((entry) => entry.sectionKey).filter(Boolean))];
  }
  function scrollWithinCanvas(target) {
    const canvas = target.closest(".kus-rl-canvas");
    if (!canvas) return;
    const padding = Number.parseFloat(window.getComputedStyle(canvas).scrollPaddingTop) || 0;
    const top = canvas.scrollTop + (target.getBoundingClientRect().top - canvas.getBoundingClientRect().top) - padding;
    const reduceMotion = typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    canvas.scrollTo({ top: Math.max(0, top), behavior: reduceMotion ? "auto" : "smooth" });
  }
  function keepVisibleWithinCanvas(target) {
    const canvas = target.closest(".kus-rl-canvas");
    if (!canvas) return;
    const area = canvas.getBoundingClientRect();
    const box = target.getBoundingClientRect();
    if (box.top < area.top || box.bottom > area.bottom) scrollWithinCanvas(target);
  }
  function revealPreviewEntry(host, sectionKey, opts) {
    const find = () => Array.from(host.querySelectorAll("[data-reflect-entry]")).find((node) => node.dataset.reflectEntry === sectionKey);
    let row = find();
    if (!row) {
      opts.onShowAll?.();
      row = find();
    }
    if (!row) return;
    const group = row.closest("details.kus-rl-preview-group");
    if (group) group.open = true;
    const changes = row.querySelector("details.kus-rl-changes");
    if (changes) changes.open = true;
    scrollWithinCanvas(row);
    row.focus({ preventScroll: true });
    row.classList.add("kus-rl-preview-row--focus");
    window.setTimeout(() => row?.classList.remove("kus-rl-preview-row--focus"), 1800);
  }
  function renderPreviewResult(host, result, opts = {}) {
    host.innerHTML = "";
    const filteredEntries = filterPreviewEntries(result.entries, String(opts.searchKeyword || "").trim().toLowerCase(), opts.statusFilter);
    const selectedSet = new Set(opts.selectedScopes || []);
    const plan = opts.plan || null;
    const effectiveSet = new Set(plan?.effectiveScopes || []);
    const skippedSameSet = new Set(plan?.skippedSameScopes || []);
    const skippedErrorSet = new Set(plan?.skippedErrorScopes || []);
    const summary = document.createElement("div");
    summary.className = "kus-rl-preview-summary";
    summary.innerHTML = `<span class="kus-rl-pill kus-rl-pill--change">差分 ${result.changedSections}</span><span class="kus-rl-pill kus-rl-pill--same">一致 ${result.sameSections}</span>` + (result.errorSections > 0 ? `<span class="kus-rl-pill kus-rl-pill--error">取得失敗 ${result.errorSections}</span>` : "") + `<span class="kus-rl-pill">${result.totalSections} 項目</span>` + (opts.searchKeyword ? `<span class="kus-rl-pill kus-rl-pill--stale">検索一致 ${filteredEntries.length}</span>` : "");
    host.appendChild(summary);
    if (result.entries.length) {
      renderReflectSummaryTable(host, result.entries, {
        selectedScopes: selectedSet,
        onNavigate: (sectionKey) => revealPreviewEntry(host, sectionKey, opts)
      });
    }
    if (!result.entries.length) {
      const empty = document.createElement("div");
      empty.className = "kus-rl-preview-empty";
      empty.textContent = "対象の項目がありません。";
      host.appendChild(empty);
      return;
    }
    if (!filteredEntries.length) {
      const empty = document.createElement("div");
      empty.className = "kus-rl-preview-empty";
      empty.textContent = `検索条件に一致する項目がありません${opts.searchKeyword ? `: ${opts.searchKeyword}` : ""}`;
      host.appendChild(empty);
      return;
    }
    const groups = [
      { title: "差分あり", tone: "change", entries: filteredEntries.filter((entry) => entry.status === "change") },
      { title: "差分なし", tone: "same", entries: filteredEntries.filter((entry) => entry.status === "same") },
      {
        title: "取得失敗",
        tone: "error",
        entries: filteredEntries.filter((entry) => entry.status === "src-missing" || entry.status === "tgt-missing" || entry.status === "error")
      }
    ];
    groups.sort((a, b) => ["error", "change", "same"].indexOf(a.tone) - ["error", "change", "same"].indexOf(b.tone));
    for (const group of groups) {
      if (!group.entries.length) continue;
      const collapsed = group.tone === "same" && opts.statusFilter === "all" && !opts.searchKeyword;
      const wrap = document.createElement(collapsed ? "details" : "section");
      wrap.className = "kus-rl-preview-group";
      if (collapsed) wrap.dataset.reflectDetails = `group:${group.tone}`;
      const headTag = collapsed ? "summary" : "div";
      wrap.innerHTML = `<${headTag} class="kus-rl-preview-group__head"><span>${escapeHtml(group.title)}${collapsed ? " · 開いて確認" : ""}</span><span>${group.entries.length} 件</span></${headTag}>`;
      const list2 = document.createElement("div");
      list2.className = "kus-rl-preview-list";
      for (const entry of group.entries) {
        const row = document.createElement("div");
        row.className = `kus-rl-preview-row kus-rl-preview-row--${group.tone}`;
        row.dataset.reflectEntry = entry.sectionKey;
        row.tabIndex = -1;
        const statusLabel = group.tone === "change" ? "差分あり" : group.tone === "same" ? "一致" : "取得失敗";
        const metaPills = [];
        const statePills = [];
        if (entry.fieldStats) {
          metaPills.push(`<span class="kus-rl-preview-mini">追加 ${entry.fieldStats.add}</span>`);
          metaPills.push(`<span class="kus-rl-preview-mini">更新 ${entry.fieldStats.update}</span>`);
          metaPills.push(`<span class="kus-rl-preview-mini">反映先のみ ${entry.fieldStats.tgtOnly}</span>`);
        }
        if (selectedSet.has(entry.sectionKey)) statePills.push('<span class="kus-rl-preview-mini">選択中</span>');
        else statePills.push('<span class="kus-rl-preview-mini">未選択</span>');
        if (effectiveSet.has(entry.sectionKey)) statePills.push('<span class="kus-rl-preview-mini">実行予定</span>');
        if (!opts.fresh) statePills.push('<span class="kus-rl-preview-mini">再取得が必要</span>');
        if (skippedSameSet.has(entry.sectionKey)) statePills.push('<span class="kus-rl-preview-mini">一致のため除外</span>');
        if (skippedErrorSet.has(entry.sectionKey)) statePills.push('<span class="kus-rl-preview-mini">取得失敗のため除外</span>');
        if (RISKY_SCOPE_KEYS.has(entry.sectionKey)) statePills.push('<span class="kus-rl-preview-mini">高リスク</span>');
        row.innerHTML = `<div class="kus-rl-preview-row__head">  <div class="kus-rl-preview-row__title">${escapeHtml(entry.label)}</div>  <span class="kus-rl-pill kus-rl-pill--${group.tone}">${statusLabel}</span></div><div class="kus-rl-preview-row__detail">${escapeHtml(entry.message)}</div>` + (statePills.length ? `<div class="kus-rl-preview-row__state">${statePills.join("")}</div>` : "") + (metaPills.length ? `<div class="kus-rl-preview-row__meta">${metaPills.join("")}</div>` : "");
        if (opts.onAdd && opts.onRemove) {
          const selection = makeCheck({ label: "反映候補に含める", checked: selectedSet.has(entry.sectionKey) });
          selection.checkbox.setAttribute("aria-label", `${entry.label}を反映候補に含める`);
          selection.checkbox.dataset.reflectScope = entry.sectionKey;
          selection.checkbox.addEventListener("change", () => {
            if (selection.checkbox.checked) opts.onAdd?.(entry.sectionKey);
            else opts.onRemove?.(entry.sectionKey);
            Array.from(host.querySelectorAll("input[data-reflect-scope]")).find((input) => input.dataset.reflectScope === entry.sectionKey)?.focus({ preventScroll: true });
          });
          row.appendChild(selection.label);
        }
        appendReflectChanges(row, entry);
        list2.appendChild(row);
      }
      wrap.appendChild(list2);
      host.appendChild(wrap);
    }
  }

  // src/entries/reflect-lite-entry.ts
  runOnKintonePage(mountReflectLitePanel);
})();
