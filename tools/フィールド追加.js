// ==========================================================================
// フィールド追加.js  —  自動生成ファイル（手編集禁止）
// ==========================================================================
// このファイルは tools/統合ツール/ の npm run build (esbuild) で生成されます。
// ソース: tools/統合ツール/src/entries/field-lite-entry.js
//         tools/統合ツール/src/tabs/field.js  ← 機能の正規実装
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
  var TOOL_ID, EXTERNAL_LIBRARIES, DEFAULT_APP_ID, DEFAULT_GUEST_ID, DIALOG_STATE_KEY, SECTION_DEFS, SYSTEM_FIELD_TYPES, DEFAULT_SUBTAB_STATE, TOUR_STEP_CONNECTION, TOUR_STEP_SCOPE, TOUR_STEP_NOISE, TOUR_STEP_RUN_DIFF, TOUR_STEP_REVIEW, TOUR_STEP_CATEGORY_VIEW, TOUR_STEP_PLAN, TOUR_STEP_APPLY, TOUR_STEP_RECORD, GUIDED_TOUR_COURSES, GUIDED_TOUR_STEPS;
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

  // src/reflect/applyOutcome.ts
  var init_applyOutcome = __esm({
    "src/reflect/applyOutcome.ts"() {
      "use strict";
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
  function kusConfirm(message) {
    try {
      return getToolWindowSafe().confirm(message);
    } catch (e) {
      return window.confirm(message);
    }
  }
  function esc(s) {
    return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function deepClone(v) {
    return v == null ? v : JSON.parse(JSON.stringify(v));
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
    const clip = typeof navigator !== "undefined" ? navigator.clipboard : void 0;
    if (clip && typeof clip.writeText === "function") {
      try {
        await clip.writeText(text);
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

  // src/kintone-query.ts
  var init_kintone_query = __esm({
    "src/kintone-query.ts"() {
      "use strict";
    }
  });

  // src/runControl.ts
  function beginRun() {
    const token = { id: nextId++, controller: new AbortController(), cancelled: false, cancelledAt: 0 };
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
  function throwIfCancelled() {
    if (active && active.cancelled) throw new RunCancelledError();
  }
  function activeAbortSignal() {
    return active ? active.controller.signal : void 0;
  }
  function isRunCancelledError(error) {
    let current = error;
    for (let depth = 0; current && depth < 4; depth++) {
      if (current instanceof RunCancelledError || current.cancelled === true || current.name === "RunCancelledError") return true;
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
          { timeoutMs: API_GET_TIMEOUT_MS }
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
  var DEPLOY_PATH_SNIPPET, ERR_NO_PROD_WRITE, ERR_NO_DEPLOY_API, ERR_NO_RECORD_PREVIEW_API, DEFAULT_API_GET_RETRIES, DEFAULT_RETRY_BASE_DELAY_MS, DEFAULT_RETRY_MAX_DELAY_MS, API_GET_TIMEOUT_MS, RETRIABLE_STATUS_CODES, RECORD_DATA_MUTATION_PATHS, RECORD_CURSOR_PATH, FILE_UPLOAD_PATH, apiGetMetrics, REVISION_CONFLICT_CODES, CUSTOMIZE_BODY_MAX_BYTES, FILE_DOWNLOAD_DEFAULT_MAX_BYTES;
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
      FILE_DOWNLOAD_DEFAULT_MAX_BYTES = 20 * 1024 * 1024;
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

  // src/tabs/field.ts
  function collectFieldValidationIssues(props) {
    const issues = [];
    const seenCodes = /* @__PURE__ */ new Set();
    const visit = (fieldMap, path) => {
      for (const [key, def] of Object.entries(fieldMap || {})) {
        const code = String(def?.code || key || "").trim();
        const label = String(def?.label || "").trim();
        const type = String(def?.type || "").trim();
        const fieldPath = path ? `${path}.${key}` : key;
        if (!code) issues.push(`${fieldPath}: code が空です`);
        if (code && seenCodes.has(code)) issues.push(`${fieldPath}: code "${code}" が重複しています`);
        if (code) seenCodes.add(code);
        if (code && String(key) !== code) issues.push(`${fieldPath}: JSONキー "${key}" と code "${code}" が一致していません`);
        if (!type) issues.push(`${fieldPath}: type がありません`);
        if (!label && type !== "SPACER" && type !== "HR" && type !== "LABEL") issues.push(`${fieldPath}: label がありません`);
        if (def?.lookup && !def.lookup.relatedApp?.app) issues.push(`${fieldPath}: lookup.relatedApp.app がありません`);
        if (def?.referenceTable && !def.referenceTable.relatedApp?.app) issues.push(`${fieldPath}: referenceTable.relatedApp.app がありません`);
        if (type === "SUBTABLE" && (!def.fields || typeof def.fields !== "object")) issues.push(`${fieldPath}: SUBTABLE に fields がありません`);
        if (type === "SUBTABLE") visit(def.fields, fieldPath);
      }
    };
    visit(props, "");
    return issues;
  }
  function summarizeFieldProps(props) {
    const byType = {};
    let total = 0;
    let system = 0;
    let writable = 0;
    let subtable = 0;
    let lookup = 0;
    let calc = 0;
    for (const [, def] of Object.entries(props || {})) {
      if (!def || typeof def !== "object") continue;
      total += 1;
      const type = String(def.type || "").trim();
      byType[type] = (byType[type] || 0) + 1;
      if (SYSTEM_FIELD_TYPES.has(type)) system += 1;
      else writable += 1;
      if (type === "SUBTABLE") subtable += 1;
      if (def.lookup) lookup += 1;
      if (type === "CALC" || def.expression) calc += 1;
    }
    return { total, system, writable, subtable, lookup, calc, byType };
  }
  function collectFormulaRefs(expression) {
    const refs = /* @__PURE__ */ new Set();
    String(expression || "").replace(/\b[A-Za-z_][A-Za-z0-9_]*\b/g, (token) => {
      if (!FORMULA_WORDS.has(token.toUpperCase())) refs.add(token);
      return token;
    });
    return [...refs];
  }
  function collectFieldApplyWarnings(incomingProps, currentProps, lookupMap = {}) {
    const warnings = [];
    const currentCodes = new Set(Object.keys(currentProps || {}));
    const incomingCodes = new Set(Object.keys(incomingProps || {}));
    const allCodes = /* @__PURE__ */ new Set([...currentCodes, ...incomingCodes]);
    const addSubtableChildCodes = (propsMap) => {
      for (const [key, def] of Object.entries(propsMap || {})) {
        if (def?.code) allCodes.add(String(def.code));
        if (def?.type === "SUBTABLE" && def?.fields && typeof def.fields === "object") {
          for (const [ck, cdef] of Object.entries(def.fields)) {
            allCodes.add(ck);
            if (cdef?.code) allCodes.add(String(cdef.code));
          }
        } else {
          void key;
        }
      }
    };
    addSubtableChildCodes(currentProps);
    addSubtableChildCodes(incomingProps);
    const conflicts = [...incomingCodes].filter((code) => currentCodes.has(code));
    if (conflicts.length) {
      warnings.push(`既存フィールドと同じ code が ${conflicts.length} 件あります: ${conflicts.slice(0, 12).join(", ")}${conflicts.length > 12 ? " ..." : ""}`);
    }
    const converted = [];
    const unconvertedRefs = [];
    const walk = (fieldMap, parent = "") => {
      for (const [key, def] of Object.entries(fieldMap || {})) {
        const label = parent ? `${parent}.${key}` : key;
        const relatedApp = def?.lookup?.relatedApp?.app ?? def?.referenceTable?.relatedApp?.app;
        if (relatedApp != null) {
          const before = String(relatedApp);
          if (lookupMap[before]) converted.push(`${label}: ${before} -> ${lookupMap[before]}`);
          else unconvertedRefs.push(`${label}: ${before}`);
        }
        if (def?.expression) {
          const missing = collectFormulaRefs(def.expression).filter((code) => !allCodes.has(code));
          if (missing.length) warnings.push(`${label}: 計算式の参照候補が見つかりません: ${missing.join(", ")}`);
        }
        if (def?.type === "SUBTABLE") walk(def.fields, label);
      }
    };
    walk(incomingProps);
    if (converted.length) warnings.push(`参照先アプリID変換: ${converted.slice(0, 8).join(" / ")}${converted.length > 8 ? " ..." : ""}`);
    if (unconvertedRefs.length) warnings.push(`変換されない参照先アプリIDがあります: ${unconvertedRefs.slice(0, 8).join(" / ")}${unconvertedRefs.length > 8 ? " ..." : ""}`);
    if ([...incomingCodes].some((code) => !currentCodes.has(code))) {
      warnings.push("新規追加フィールドはフォームレイアウトには自動配置されません。必要に応じてkintoneのフォーム設定で配置してください。");
    }
    return warnings;
  }
  var FORMULA_WORDS;
  var init_field = __esm({
    "src/tabs/field.ts"() {
      "use strict";
      init_constants();
      init_state();
      init_utils();
      init_api();
      init_components();
      init_diff();
      init_dialog();
      FORMULA_WORDS = /* @__PURE__ */ new Set([
        "IF",
        "AND",
        "OR",
        "NOT",
        "SUM",
        "ROUND",
        "ROUNDDOWN",
        "ROUNDUP",
        "DATE_FORMAT",
        "DATE",
        "TIME",
        "DATETIME_FORMAT",
        "CONTAINS",
        "NUMBER",
        "VALUE",
        "TRUE",
        "FALSE"
      ]);
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

  // src/entries/litePanelTheme.ts
  init_components();
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
.kus-lp__dialog-close{border:1px solid var(--c-border-strong);background:#fff;color:var(--c-text-2);border-radius:9px;padding:6px 12px;font:600 13px/1.3 inherit;font-family:inherit;cursor:pointer}
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
.kus-lp__apptable-no{width:30px;text-align:center;color:var(--c-muted);font-size:12.5px;font-variant-numeric:tabular-nums}
.kus-lp__apptable-acts-h{width:128px}
.kus-lp__apptable-acts{white-space:nowrap}
.kus-lp__apptable-acts .kus-lp__btn{padding:4px 7px;font-size:12.5px;border-radius:7px}
.kus-lp__apptable-acts .kus-lp__btn + .kus-lp__btn{margin-left:4px}
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
  function createLitePanel(opts) {
    ensureThemeStyles();
    const old = document.getElementById(opts.id);
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
    cancelBtn.title = "次のリクエストの前で処理を止めます（途中まで実行した内容は取り消しません）";
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
    function setStatus2(msg, tone = "neutral") {
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
    function setBusy2(busy) {
      closeBtn.disabled = busy;
      root2.setAttribute("aria-busy", String(busy));
      root2.style.cursor = busy ? "progress" : "";
      if (busy) {
        if (!runToken) {
          runToken = beginRun();
          cancelBtn.textContent = "中止";
          cancelBtn.disabled = false;
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
    const handle = { root: root2, body, status, result, setStatus: setStatus2, setResult, setResultHtml, setBusy: setBusy2, close, setCollapsed, resetPosition, setPrimaryAction, requestCancel: requestCancel2, isCancelRequested: isCancelRequested2 };
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
        btn.addEventListener("click", () => {
          const next = popEl.hidden;
          popEl.hidden = !next;
          btn.setAttribute("aria-expanded", String(next));
          btn.classList.toggle("kus-lp__help-btn--open", next);
        });
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
    dialog.addEventListener("click", (e) => {
      if (e.target === dialog) close();
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
  function makePickList(opts) {
    const wrap = document.createElement("div");
    wrap.className = "kus-lp__picklist";
    wrap.hidden = true;
    const head = document.createElement("div");
    head.className = "kus-lp__picklist-head";
    const filter = opts.filterPlaceholder === "" ? null : makeInput({ placeholder: opts.filterPlaceholder || "名前・コードで絞り込み", noSubmit: true, ariaLabel: `${opts.ariaLabel}の絞り込み` });
    if (filter) head.appendChild(filter);
    const count = document.createElement("span");
    count.className = "kus-lp__count";
    head.appendChild(count);
    const allBtn = makeButton("全選択", "sub");
    const noneBtn = makeButton("全解除", "sub");
    if (opts.bulk !== false) {
      head.appendChild(allBtn);
      head.appendChild(noneBtn);
    }
    const list = document.createElement("div");
    list.className = "kus-lp__picklist-body";
    list.setAttribute("role", "group");
    list.setAttribute("aria-label", opts.ariaLabel);
    const foot = document.createElement("div");
    foot.className = "kus-lp__picklist-foot";
    wrap.appendChild(head);
    wrap.appendChild(list);
    wrap.appendChild(foot);
    let items = [];
    const checked = /* @__PURE__ */ new Set();
    let visible = [];
    function selected() {
      return items.filter((item) => checked.has(item.value)).map((item) => item.value);
    }
    function refreshSummary() {
      const n = selected().length;
      count.textContent = `選択 ${n} / ${items.length}`;
      foot.textContent = opts.footer ? opts.footer(n, items.length) : `${items.length}件中 ${n}件を選択${filter && filter.value.trim() ? `（表示 ${visible.length}件）` : ""}`;
      allBtn.disabled = !visible.length;
      noneBtn.disabled = !visible.length;
    }
    function emit() {
      refreshSummary();
      opts.onChange?.(selected());
    }
    function render() {
      const q = (filter?.value || "").trim().toLowerCase();
      visible = q ? items.filter((item) => `${item.label} ${item.sub || ""} ${item.value}`.toLowerCase().includes(q)) : items.slice();
      list.replaceChildren();
      if (!visible.length) {
        const empty = document.createElement("div");
        empty.className = "kus-lp__picklist-empty";
        empty.textContent = items.length ? "一致する項目がありません。絞り込みの語を変えてください。" : opts.emptyText || "項目がありません。";
        list.appendChild(empty);
      }
      for (const item of visible) {
        const lab = document.createElement("label");
        lab.className = "kus-lp__picklist-item";
        const cb = document.createElement("input");
        cb.type = "checkbox";
        cb.value = item.value;
        cb.checked = checked.has(item.value);
        cb.setAttribute("aria-label", item.sub ? `${item.label} ${item.sub}` : item.label);
        cb.addEventListener("change", () => {
          if (cb.checked) checked.add(item.value);
          else checked.delete(item.value);
          emit();
        });
        const main = document.createElement("span");
        main.className = "kus-lp__picklist-main";
        main.textContent = item.label;
        main.title = item.label;
        lab.appendChild(cb);
        lab.appendChild(main);
        if (item.sub) {
          const sub = document.createElement("span");
          sub.className = "kus-lp__picklist-sub";
          sub.textContent = item.sub;
          sub.title = item.sub;
          lab.appendChild(sub);
        }
        list.appendChild(lab);
      }
      refreshSummary();
    }
    filter?.addEventListener("input", render);
    function setAllVisible(on) {
      for (const item of visible) {
        if (on) checked.add(item.value);
        else checked.delete(item.value);
      }
      list.querySelectorAll("input[type=checkbox]").forEach((cb) => {
        cb.checked = on;
      });
      emit();
    }
    allBtn.addEventListener("click", () => setAllVisible(true));
    noneBtn.addEventListener("click", () => setAllVisible(false));
    return {
      element: wrap,
      setItems(next) {
        items = next.slice();
        checked.clear();
        for (const item of items) if (item.checked) checked.add(item.value);
        if (filter) filter.value = "";
        wrap.hidden = false;
        render();
        opts.onChange?.(selected());
      },
      selected,
      setAllVisible,
      clear() {
        items = [];
        visible = [];
        checked.clear();
        list.replaceChildren();
        wrap.hidden = true;
        refreshSummary();
      },
      count: () => items.length
    };
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
        panel.setStatus("中止しました。次のリクエストの前で止めました。途中まで実行した内容は取り消していません。", "warn");
        return void 0;
      }
      const message = String(e?.message || e || "不明なエラー");
      const lines = message.split("\n").map((line) => line.trim()).filter(Boolean);
      const [first, ...rest] = lines.length ? lines : [message];
      if (token?.cancelled) {
        const headline = /^中止しました/.test(first) ? first : `中止しました: ${first}`;
        panel.setStatus(`${headline}${rest.length ? "（詳細は下のログ）" : ""}`, "warn");
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

  // src/entries/liteWorkflow.ts
  var CSS2 = `
.kus-wf.kus-lp{width:min(920px,calc(100vw - 32px));max-height:calc(100dvh - 32px);top:16px;right:16px;border-radius:18px}
.kus-wf .kus-lp__hero{background:#172033;padding:16px 22px}
.kus-wf .kus-lp__badge-row{margin-top:6px}
.kus-wf .kus-lp__body{padding:0;display:flex;flex-direction:column;overflow:hidden;min-height:0;background:#f5f7fa}
.kus-wf .kus-lp__hint{margin:0;padding:10px 22px;border-radius:0;flex-shrink:0}
.kus-wf [hidden]{display:none!important}
.kus-wf .kus-lp__card{padding:16px;border-radius:14px;min-width:0}
.kus-wf .kus-lp__card-head{flex-wrap:wrap}
.kus-wf .kus-lp__row{min-width:0;flex-wrap:wrap}
.kus-wf :is(input,select,textarea){max-width:100%;box-sizing:border-box}
.kus-wf .kus-lp__input{min-width:0}
.kus-wf .kus-lp__file{min-width:0;width:100%}
.kus-wf .kus-lp__btn{white-space:normal}
.kus-wf .kus-lp__tab-panel{min-width:0}
.kus-wf .kus-lp__note{overflow-wrap:anywhere}
.kus-wf :is(button,input,select,textarea,summary):focus-visible,.kus-wf-nav button:focus-visible{outline:3px solid #2563eb;outline-offset:3px}
.kus-wf-nav{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;padding:10px 22px;background:#fff;border-bottom:1px solid #e2e8f0;flex-shrink:0}
.kus-wf-nav button{font-family:inherit;font-size:13.5px;font-weight:600;line-height:1.4;border:2px solid #e2e8f0;padding:9px 10px;border-radius:9px;background:#fff;color:#475569;cursor:pointer;position:relative}
/* 段階の状態: 現在（濃い青・太字）、済み（緑・左端に印）、これから（灰色） */
.kus-wf-nav button[aria-selected=true],.kus-wf-nav button[aria-current=step]{background:#1d4ed8;border-color:#1d4ed8;color:#fff;font-weight:700;box-shadow:0 2px 8px rgba(29,78,216,.28)}
.kus-wf-nav button[data-state=done]{background:#ecfdf5;border-color:#a7f3d0;color:#065f46}
.kus-wf-nav button[data-state=done]::before{content:'';position:absolute;left:0;top:0;bottom:0;width:5px;border-radius:7px 0 0 7px;background:#10b981}
.kus-wf-nav button[data-state=upcoming]{color:#64748b;background:#f8fafc}
.kus-wf-nav button:disabled{opacity:.5;cursor:not-allowed}
.kus-wf-canvas{overflow:auto;min-height:0;min-width:0;flex:1;padding:18px 22px;scroll-padding:16px}
.kus-wf-stage{min-width:0}
.kus-wf-heading{margin:0 0 4px;font-size:20px;color:#0f172a}
.kus-wf-intro{margin:0 0 16px;color:#64748b;font-size:13px}
.kus-wf-actions{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:8px;margin-bottom:16px}
.kus-wf-action{padding:12px;border:1px solid #cbd5e1;border-radius:10px;background:white;cursor:pointer;display:grid;grid-template-columns:18px 1fr;gap:8px;font-size:13px;min-width:0;align-items:start}
.kus-wf-action:has(input:checked){border-color:#60a5fa;background:#eff6ff}
.kus-wf-action strong{display:block;color:#0f172a}
.kus-wf-action small{display:block;margin-top:3px;color:#64748b;line-height:1.5}
.kus-wf-action em{display:inline-block;font-size:12.5px;font-style:normal;color:#9a3412;margin-top:5px}
.kus-wf-action--more{grid-template-columns:1fr;text-align:left;font-family:inherit;color:#1d4ed8;border-style:dashed}
.kus-wf-action--more[aria-pressed=true]{border-style:solid;border-color:#60a5fa;background:#eff6ff}
.kus-wf-action--more strong{color:#1d4ed8}
.kus-wf-action--more[aria-pressed=true] strong{color:#0f172a}
.kus-wf-advanced{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin:4px 0 16px;padding:10px 14px;border:1px dashed #cbd5e1;border-radius:10px;background:#fff}
.kus-wf-advanced__copy{font-size:13px;color:#475569;min-width:0;flex:1}
.kus-wf-advanced__btn{flex-shrink:0}
.kus-wf-summary{margin:0;background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:4px 16px}
.kus-wf-summary>div{display:grid;grid-template-columns:140px minmax(0,1fr);gap:16px;padding:12px 0;border-bottom:1px solid #eef2f6}
.kus-wf-summary>div:last-child{border:0}
.kus-wf-summary dt{color:#64748b;font-size:13px}
.kus-wf-summary dd{margin:0;white-space:pre-wrap;overflow-wrap:anywhere;color:#0f172a;font-size:14px}
.kus-wf-notice{padding:12px;border:1px solid #bfdbfe;background:#eff6ff;border-radius:10px;margin:14px 0;color:#1e40af;font-size:13px;overflow-wrap:anywhere;white-space:pre-wrap}
.kus-wf-notice[data-write=true]{border-color:#fed7aa;background:#fff7ed;color:#9a3412}
.kus-wf-footer{padding:12px 22px;background:#fff;border-top:1px solid #e2e8f0;flex-shrink:0}
.kus-wf-footer-row{display:flex;align-items:center;gap:12px}
.kus-wf-footer-copy{flex:1;min-width:0;font-size:13px;color:#475569;overflow-wrap:anywhere}
.kus-wf-footer-buttons{display:flex;gap:8px;flex-shrink:0}
.kus-wf-footer-buttons button{min-height:42px;max-width:320px}
.kus-wf-footer .kus-lp__status{margin-top:8px}
.kus-wf-footer .kus-lp__status-text{max-height:44px;overflow:auto}
.kus-wf .kus-lp__result{white-space:pre-wrap;max-height:none;overflow-wrap:anywhere}
.kus-wf .kus-lp__apptable-scroll{overflow:auto}
.kus-wf-jump{border:1px solid #e2e8f0;border-radius:12px;margin-bottom:14px}
@media(max-width:720px){
 .kus-wf.kus-lp{width:calc(100vw - 16px);max-height:calc(100dvh - 16px);top:8px;right:8px}
 .kus-wf .kus-lp__hero{padding:12px 16px}
 .kus-wf .kus-lp__hint{display:none}
 .kus-wf-nav{padding:8px;gap:4px}
 .kus-wf-nav button{padding:9px 3px;font-size:12.5px}
 .kus-wf-canvas{padding:16px}
 .kus-wf .kus-lp__card{padding:12px}
 .kus-wf-actions{grid-template-columns:1fr}
 .kus-wf-summary>div{grid-template-columns:1fr;gap:4px}
 .kus-wf-footer{padding:10px 16px}
 .kus-wf-footer-row{display:block}
 .kus-wf-footer-buttons{display:flex;margin-top:8px}
 .kus-wf-footer-buttons button{flex:1;min-width:0;max-width:none}
}
`;
  function ensureStyles() {
    if (document.getElementById("kus-workflow-style")) return;
    const style = document.createElement("style");
    style.id = "kus-workflow-style";
    style.textContent = CSS2;
    document.head.appendChild(style);
  }
  function foldWorkflowSection(title, ...nodes) {
    const details = makeDetails(title);
    details.body.append(...nodes);
    return details.details;
  }
  function connectionSummary(appId, guestId = "", environment = "本番") {
    return `#${appId || "未入力"}${guestId ? `（ゲスト ${guestId}）` : ""} · ${environment}`;
  }
  function installLiteWorkflow(panel, options) {
    ensureStyles();
    panel.root.classList.add("kus-wf");
    const nav = document.createElement("nav");
    nav.className = "kus-wf-nav";
    nav.setAttribute("role", "tablist");
    nav.setAttribute("aria-label", "操作の手順");
    const canvas = document.createElement("div");
    canvas.className = "kus-wf-canvas";
    const setup = document.createElement("section");
    const review = document.createElement("section");
    const result = document.createElement("section");
    const stages = [setup, review, result];
    const labels = ["1 対象と操作", "2 内容を確認", "3 実行結果"];
    const headings = ["対象と操作を選ぶ", "この内容で実行します", "実行結果を確認"];
    const tabs = labels.map((label, index) => {
      const tab = makeButton(label, "ghost");
      tab.id = `${panel.root.id}-workflow-tab-${index}`;
      tab.setAttribute("role", "tab");
      const stage = stages[index];
      stage.id = `${panel.root.id}-workflow-stage-${index}`;
      stage.className = "kus-wf-stage";
      stage.setAttribute("role", "tabpanel");
      stage.setAttribute("aria-labelledby", tab.id);
      tab.setAttribute("aria-controls", stage.id);
      const heading = document.createElement("h2");
      heading.className = "kus-wf-heading";
      heading.textContent = headings[index];
      stage.appendChild(heading);
      tab.addEventListener("click", () => show(index));
      tab.addEventListener("keydown", (event) => {
        if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
        event.preventDefault();
        const next2 = event.key === "Home" ? 0 : event.key === "End" ? 2 : (index + (event.key === "ArrowRight" ? 1 : 2)) % 3;
        show(next2);
      });
      nav.appendChild(tab);
      canvas.appendChild(stage);
      return tab;
    });
    const intro = document.createElement("p");
    intro.className = "kus-wf-intro";
    intro.textContent = "入力後に対象と条件を確認してから実行できます。";
    setup.appendChild(intro);
    const choices = document.createElement("div");
    choices.className = "kus-wf-actions";
    choices.setAttribute("role", "radiogroup");
    choices.setAttribute("aria-label", "行う操作");
    let selected = options.actions[0];
    const hiddenActions = document.createElement("div");
    hiddenActions.hidden = true;
    const primaryCount = Math.max(1, Math.floor(options.primaryActions ?? 3));
    const hasMore = options.actions.length > primaryCount;
    const moreDialog = hasMore ? makeDialog({ title: "ほかの操作を選ぶ", id: `${panel.root.id}-more-actions` }) : null;
    const moreChoices = document.createElement("div");
    moreChoices.className = "kus-wf-actions";
    moreChoices.setAttribute("role", "radiogroup");
    moreChoices.setAttribute("aria-label", "ほかの操作");
    const moreBtn = document.createElement("button");
    moreBtn.type = "button";
    moreBtn.className = "kus-wf-action kus-wf-action--more";
    moreBtn.setAttribute("aria-haspopup", "dialog");
    moreBtn.setAttribute("aria-pressed", "false");
    const moreTitle = document.createElement("strong");
    const moreCopy = document.createElement("small");
    const moreWrap = document.createElement("span");
    moreWrap.append(moreTitle, moreCopy);
    moreBtn.appendChild(moreWrap);
    function refreshMore() {
      if (!hasMore) return;
      const index = options.actions.indexOf(selected);
      const outside = index >= primaryCount;
      moreBtn.setAttribute("aria-pressed", String(outside));
      moreTitle.textContent = outside ? selected.label : `ほかの操作…（${options.actions.length - primaryCount} 件）`;
      moreCopy.textContent = outside ? `${selected.description} 変更するには押してください。` : options.actions.slice(primaryCount).map((action) => action.label).join(" / ");
    }
    moreBtn.addEventListener("click", () => moreDialog?.open());
    options.actions.forEach((action, index) => {
      const label = document.createElement("label");
      label.className = "kus-wf-action";
      const radio = document.createElement("input");
      radio.type = "radio";
      radio.name = `${panel.root.id}-workflow-action`;
      radio.value = action.id;
      radio.checked = index === 0;
      radio.setAttribute("aria-label", action.label);
      const copy = document.createElement("span");
      const title = document.createElement("strong");
      title.textContent = action.label;
      const description = document.createElement("small");
      description.textContent = action.description;
      copy.append(title, description);
      if (action.writes) {
        const badge = document.createElement("em");
        badge.textContent = "書き込みあり · 実行前に対象を確認";
        copy.appendChild(badge);
      }
      radio.addEventListener("change", () => {
        selected = action;
        reviewedSignature = "";
        action.onSelect?.();
        refresh();
      });
      label.append(radio, copy);
      if (hasMore && index >= primaryCount) {
        moreChoices.appendChild(label);
        radio.addEventListener("change", () => {
          refreshMore();
          moreDialog?.close();
        });
      } else {
        choices.appendChild(label);
        if (hasMore) radio.addEventListener("change", refreshMore);
      }
      hiddenActions.appendChild(action.button);
    });
    if (hasMore && moreDialog) {
      choices.appendChild(moreBtn);
      moreDialog.body.appendChild(moreChoices);
      panel.root.appendChild(moreDialog.dialog);
      refreshMore();
    }
    if (options.actions.length > 1) setup.appendChild(choices);
    setup.append(...options.setup);
    const advancedDialog = options.advanced?.length ? makeDialog({ title: options.advancedLabel || "詳細設定", id: `${panel.root.id}-advanced`, wide: true }) : null;
    if (advancedDialog && options.advanced) {
      advancedDialog.body.append(...options.advanced);
      panel.root.appendChild(advancedDialog.dialog);
      const row = document.createElement("div");
      row.className = "kus-wf-advanced";
      const copy = document.createElement("div");
      copy.className = "kus-wf-advanced__copy";
      copy.textContent = options.advancedCopy || "ふだん使わない設定はポップアップにまとめています。";
      const btn = makeButton(`${options.advancedLabel || "詳細設定"}…`, "sub");
      btn.classList.add("kus-wf-advanced__btn");
      btn.setAttribute("aria-haspopup", "dialog");
      btn.addEventListener("click", () => advancedDialog.open());
      row.append(copy, btn);
      setup.appendChild(row);
    }
    attachCardHelp(setup);
    if (advancedDialog) attachCardHelp(advancedDialog.body);
    const summary = document.createElement("dl");
    summary.className = "kus-wf-summary";
    const notice = document.createElement("div");
    notice.className = "kus-wf-notice";
    review.append(summary, notice);
    const resultNote = document.createElement("div");
    resultNote.className = "kus-wf-notice";
    resultNote.textContent = "まだ実行していません。対象と操作を選んでください。";
    result.append(resultNote, ...options.results || [], panel.result);
    options.results?.forEach((element) => {
      element.hidden = true;
    });
    const footer = document.createElement("footer");
    footer.className = "kus-wf-footer";
    const footerRow = document.createElement("div");
    footerRow.className = "kus-wf-footer-row";
    const footerCopy = document.createElement("div");
    footerCopy.className = "kus-wf-footer-copy";
    footerCopy.setAttribute("aria-live", "polite");
    const buttons = document.createElement("div");
    buttons.className = "kus-wf-footer-buttons";
    const back = makeButton("対象・条件を変更", "sub");
    const next = makeButton("内容を確認する", "primary");
    const execute = makeButton(selected.label, "primary");
    buttons.append(back, next, execute);
    footerRow.append(footerCopy, buttons);
    footer.append(footerRow, panel.status);
    const hint = panel.body.querySelector(".kus-lp__hint");
    panel.body.replaceChildren(...hint ? [hint] : [], nav, canvas, footer, hiddenActions);
    let active2 = 0;
    let busy = false;
    let pending = null;
    let reviewedSignature = "";
    let lastContext = "";
    const signature = () => JSON.stringify([selected.id, selected.summary(), Array.from(panel.root.querySelectorAll(".kus-wf-stage:first-of-type input,.kus-wf-stage:first-of-type select,.kus-wf-stage:first-of-type textarea,dialog input,dialog select,dialog textarea")).map((input) => [input.value, input instanceof HTMLInputElement ? input.checked : null, input instanceof HTMLInputElement && input.files ? Array.from(input.files).map((file) => [file.name, file.size, file.lastModified]) : null])]);
    function show(index) {
      if (busy) return;
      const problem = index === 1 ? selected.validate() : "";
      if (problem) {
        panel.setStatus(problem, "warn");
        return;
      }
      active2 = index;
      if (index === 1) {
        summary.replaceChildren();
        for (const [label, value] of [["操作", selected.label], ...selected.summary()]) {
          const row = document.createElement("div");
          const term = document.createElement("dt");
          const description = document.createElement("dd");
          term.textContent = label;
          description.textContent = value;
          row.append(term, description);
          summary.appendChild(row);
        }
        reviewedSignature = signature();
      }
      stages.forEach((stage, i) => {
        stage.hidden = i !== active2;
        tabs[i].setAttribute("aria-selected", String(i === active2));
        tabs[i].tabIndex = i === active2 ? 0 : -1;
        tabs[i].dataset.state = i === active2 ? "current" : i < active2 ? "done" : "upcoming";
      });
      canvas.scrollTop = 0;
      tabs[index].focus({ preventScroll: true });
      refresh();
    }
    function refresh() {
      const problem = busy ? "" : selected.validate();
      const fresh = !busy && active2 === 1 && reviewedSignature === signature();
      next.hidden = active2 !== 0;
      execute.hidden = active2 !== 1;
      back.hidden = active2 === 0;
      next.disabled = busy || !!problem;
      execute.disabled = busy || !!problem || !fresh;
      execute.textContent = selected.label;
      execute.classList.toggle("kus-lp__btn--danger", !!selected.writes);
      tabs[1].disabled = busy || !!problem;
      footerCopy.textContent = busy ? "処理中です。完了すると結果を表示します。" : problem || (active2 === 0 ? `${selected.label} · 対象と条件を確認してください。` : active2 === 1 ? fresh ? "表示内容を確認し、実行してください。" : "条件が変わりました。対象・条件に戻って確認してください。" : "結果を確認してから、次の操作へ進めます。");
      notice.dataset.write = String(!!selected.writes);
      notice.textContent = selected.description + (selected.writes ? "\n書き込み先と内容を確認してください。続いて、変更内容の最終確認が表示されます。" : "\nアプリ設定やレコードの書き込みは行いません。");
      panel.setPrimaryAction(next);
    }
    back.addEventListener("click", () => show(0));
    next.addEventListener("click", () => show(1));
    function finish() {
      if (!pending) return;
      const status = panel.status.querySelector(".kus-lp__status-text")?.textContent || "";
      const tone = panel.status.dataset.tone || "";
      if ((tone === "info" || tone === "warn" || tone === "neutral") && /キャンセルしました/.test(status)) {
        pending = null;
        refresh();
        return;
      }
      resultNote.textContent = `${lastContext}
${status}`;
      resultNote.dataset.write = String(!!pending.writes);
      const showResults = !options.resultActions || options.resultActions.includes(pending.id);
      options.results?.forEach((element) => {
        element.hidden = !showResults;
      });
      pending = null;
      reviewedSignature = "";
      show(2);
    }
    execute.addEventListener("click", () => {
      if (busy || pending || selected.validate() || reviewedSignature !== signature()) return;
      pending = selected;
      options.beforeRun?.(selected.id);
      panel.setResult("");
      options.results?.forEach((element) => {
        element.hidden = true;
      });
      lastContext = `${selected.label}
${selected.summary().map(([key, value]) => `${key}: ${value}`).join("\n")}`;
      selected.button.click();
      if (!busy) finish();
    });
    const originalBusy = panel.setBusy;
    const disabled = /* @__PURE__ */ new Map();
    panel.setBusy = (value) => {
      busy = value;
      panel.root.setAttribute("aria-busy", String(value));
      canvas.inert = value;
      nav.inert = value;
      if (value) {
        panel.root.querySelectorAll("input,button,select,textarea").forEach((input) => {
          if (input.classList.contains("kus-lp__toggle") || input.classList.contains("kus-lp__cancel")) return;
          disabled.set(input, input.disabled);
          input.disabled = true;
        });
      } else {
        disabled.forEach((wasDisabled, input) => {
          input.disabled = wasDisabled;
        });
        disabled.clear();
        finish();
        refresh();
      }
      originalBusy(value);
    };
    const originalStatus = panel.setStatus;
    panel.setStatus = (message, tone) => {
      originalStatus(message, tone);
      refresh();
    };
    let refreshQueued = false;
    const scheduleRefresh = () => {
      if (refreshQueued) return;
      refreshQueued = true;
      queueMicrotask(() => {
        refreshQueued = false;
        refresh();
      });
    };
    for (const event of ["input", "change", "click"]) {
      setup.addEventListener(event, scheduleRefresh);
      panel.root.addEventListener(event, (e) => {
        if (e.target instanceof Element && e.target.closest("dialog")) scheduleRefresh();
      });
    }
    selected.onSelect?.();
    show(0);
    return { refresh, show };
  }

  // src/entries/field-lite-ui.ts
  init_constants();

  // src/tabs/field-standalone.ts
  init_constants();
  init_utils();
  init_api();
  init_runControl();

  // src/tabs/run-cancel-summary.ts
  init_runControl();
  var CancelReportError = class extends Error {
    constructor(done, total, details = []) {
      super([formatCancelledHeadline(done, total), ...details.filter(Boolean)].join("\n"));
      __publicField(this, "cancelReport", true);
      __publicField(this, "done");
      __publicField(this, "total");
      this.name = "CancelReportError";
      this.done = done;
      this.total = total;
    }
  };
  function formatCancelledHeadline(done, total) {
    const safeTotal = Math.max(0, Math.floor(total));
    const safeDone = Math.min(safeTotal, Math.max(0, Math.floor(done)));
    return `中止しました（${safeDone}/${safeTotal} 件を処理、残り ${safeTotal - safeDone} 件は未実行）`;
  }
  function createCancelReport(done, total, details = []) {
    return new CancelReportError(done, total, details);
  }

  // src/tabs/field-standalone.ts
  function assertNumericIds(appId, guestId, appLabel) {
    if (!/^\d+$/.test(String(appId ?? "").trim())) throw new Error(`${appLabel}アプリIDは半角数字で入力してください`);
    if (String(guestId ?? "").trim() && !/^\d+$/.test(String(guestId).trim())) throw new Error(`${appLabel}ゲストスペースIDは半角数字で入力してください`);
  }
  var hasOwn = (obj, key) => Object.prototype.hasOwnProperty.call(obj ?? {}, key);
  function filterWritable(props) {
    const out = {};
    for (const [k, def] of Object.entries(props || {})) {
      if (!def || typeof def !== "object") continue;
      if (SYSTEM_FIELD_TYPES.has(def.type)) continue;
      const cloned = deepClone(def);
      if (cloned.type === "SUBTABLE" && cloned.fields && typeof cloned.fields === "object") {
        const writableChildren = {};
        for (const [ck, cdef] of Object.entries(cloned.fields)) {
          if (!cdef || typeof cdef !== "object") continue;
          if (SYSTEM_FIELD_TYPES.has(cdef.type)) continue;
          writableChildren[ck] = cdef;
        }
        cloned.fields = writableChildren;
      }
      out[k] = cloned;
    }
    return out;
  }
  function convertLookup(fieldDef, map) {
    const def = deepClone(fieldDef || {});
    if (!Object.keys(map).length) return { def, changed: false };
    let changed = false;
    const walk = (node) => {
      if (!node || typeof node !== "object") return;
      const lookupRel = node.lookup?.relatedApp;
      if (lookupRel?.app != null) {
        const after = hasOwn(map, String(lookupRel.app)) ? map[String(lookupRel.app)] : void 0;
        if (after && String(after) !== String(lookupRel.app)) {
          node.lookup.relatedApp.app = String(after);
          delete node.lookup.relatedApp.code;
          changed = true;
        }
      }
      const refRel = node.referenceTable?.relatedApp;
      if (refRel?.app != null) {
        const after = hasOwn(map, String(refRel.app)) ? map[String(refRel.app)] : void 0;
        if (after && String(after) !== String(refRel.app)) {
          node.referenceTable.relatedApp.app = String(after);
          delete node.referenceTable.relatedApp.code;
          changed = true;
        }
      }
      if (node.type === "SUBTABLE" && node.fields) Object.values(node.fields).forEach(walk);
    };
    walk(def);
    return { def, changed };
  }
  function validateNumericId(value, label, required = false) {
    const trimmed = String(value ?? "").trim();
    if (!trimmed) {
      if (required) throw new Error(`${label}を入力してください`);
      return "";
    }
    if (!/^\d+$/.test(trimmed)) {
      throw new Error(`${label}は半角数字で入力してください: ${trimmed}`);
    }
    return trimmed;
  }
  function parseFieldJsonInput(text) {
    const raw = String(text ?? "").trim();
    if (!raw) throw new Error("フィールドJSONを入力してください");
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      throw new Error(`フィールドJSONを解析できません（「整形」ボタンで位置を確認してください）: ${e?.message || String(e)}`);
    }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error('フィールドJSONは { "properties": { ... } } 形式のオブジェクトで入力してください');
    }
    const props = parsed.properties && typeof parsed.properties === "object" ? parsed.properties : parsed;
    if (!Object.keys(props).length) throw new Error("フィールドJSONに反映対象のフィールドがありません");
    for (const [code, definition] of Object.entries(props)) {
      if (!definition || typeof definition !== "object" || Array.isArray(definition)) {
        throw new Error(`フィールドコード「${code}」の定義がオブジェクトではありません`);
      }
      if (!String(definition.type || "").trim()) {
        throw new Error(`フィールドコード「${code}」の定義に type がありません`);
      }
    }
    return props;
  }
  function parseLookupMapInput(text) {
    const raw = String(text ?? "").trim();
    const out = {};
    if (!raw) return out;
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      throw new Error(`Lookup AppID 変換 JSON を解析できません: ${e?.message || String(e)}`);
    }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error('Lookup AppID 変換 JSON は {"旧AppID":"新AppID"} 形式で入力してください');
    }
    for (const [k, v] of Object.entries(parsed)) {
      const from = String(k).trim();
      const to = String(v ?? "").trim();
      if (from && to) out[from] = to;
    }
    return out;
  }
  function withPartialNotice(error, notice) {
    const wrapped = new Error(`${notice}
${error?.message != null ? String(error.message) : String(error)}`);
    for (const key of ["revisionConflict", "original", "code", "id", "__apiDiag", "stack"]) {
      if (error && error[key] !== void 0) wrapped[key] = error[key];
    }
    return wrapped;
  }
  function findFieldApplyProblem(input) {
    const appId = String(input.targetAppId ?? "").trim();
    if (!appId) return "反映先アプリIDを指定してください。";
    try {
      assertNumericIds(appId, input.targetGuestId, "反映先");
      parseFieldJsonInput(input.fieldJson);
      parseLookupMapInput(input.lookupMapJson);
    } catch (e) {
      return String(e?.message || e);
    }
    return "";
  }
  function planFieldApply(incoming, currentProps, lookupMap, overwrite) {
    const plan = { adds: {}, updates: {}, skippedSystem: [], skippedExisting: [], lookupConverted: [], logs: [] };
    const currentMap = currentProps || {};
    const existingSubtableOwnerByChildCode = /* @__PURE__ */ new Map();
    for (const [tblCode, tblDef] of Object.entries(currentMap)) {
      if (tblDef?.type === "SUBTABLE" && tblDef.fields && typeof tblDef.fields === "object") {
        for (const [childKey, childDef] of Object.entries(tblDef.fields)) {
          existingSubtableOwnerByChildCode.set(childKey, tblCode);
          if (childDef?.code) existingSubtableOwnerByChildCode.set(String(childDef.code), tblCode);
        }
      }
    }
    const seenTopLevelCodes = /* @__PURE__ */ new Map();
    const seenChildOwnerByCode = /* @__PURE__ */ new Map();
    for (const [code, rawDef] of Object.entries(incoming || {})) {
      const writable = filterWritable({ [code]: rawDef });
      if (!writable[code]) {
        plan.skippedSystem.push(code);
        plan.logs.push(`SKIP ${code} (system)`);
        continue;
      }
      const { def, changed } = convertLookup(writable[code], lookupMap);
      if (changed) plan.lookupConverted.push(code);
      if (!def.code) def.code = code;
      const targetCode = String(def.code || code).trim();
      for (const tCode of /* @__PURE__ */ new Set([code, targetCode])) {
        const childOwner = seenChildOwnerByCode.get(tCode);
        if (childOwner) {
          throw new Error(`フィールドコード「${tCode}」が入力JSON内の「${childOwner}」と重複しています`);
        }
        const subOwner = existingSubtableOwnerByChildCode.get(tCode);
        if (subOwner) {
          throw new Error(`フィールドコード「${tCode}」は既存のサブテーブル「${subOwner}」内の子フィールドと重複しています`);
        }
      }
      seenTopLevelCodes.set(code, code);
      seenTopLevelCodes.set(targetCode, code);
      if (def.type === "SUBTABLE" && def.fields && typeof def.fields === "object") {
        for (const [childKey, childDef] of Object.entries(def.fields)) {
          if (!childDef || typeof childDef !== "object") continue;
          if (!childDef.code) childDef.code = childKey;
          const childTarget = String(childDef.code || childKey).trim();
          for (const cCode of /* @__PURE__ */ new Set([childKey, childTarget])) {
            const prevOwner = seenChildOwnerByCode.get(cCode) || seenTopLevelCodes.get(cCode);
            if (prevOwner) {
              throw new Error(`サブテーブル「${code}」の子フィールドコード「${cCode}」が入力JSON内の「${prevOwner}」と重複しています`);
            }
            if (hasOwn(currentMap, cCode) && currentMap[cCode] && cCode !== code && cCode !== targetCode) {
              throw new Error(`サブテーブル「${code}」の子フィールドコード「${cCode}」が既存のトップレベルフィールドと重複しています`);
            }
            const otherSub = existingSubtableOwnerByChildCode.get(cCode);
            if (otherSub && otherSub !== code && otherSub !== targetCode) {
              throw new Error(`サブテーブル「${code}」の子フィールドコード「${cCode}」が別サブテーブル「${otherSub}」内の子フィールドと重複しています`);
            }
          }
          seenChildOwnerByCode.set(childKey, `${code}.${childKey}`);
          seenChildOwnerByCode.set(childTarget, `${code}.${childTarget}`);
        }
      }
      if (hasOwn(currentMap, code) && currentMap[code]) {
        if (overwrite) {
          const curType = String(currentMap[code]?.type || "").trim();
          const nextType = String(def.type || "").trim();
          if (curType && nextType && curType !== nextType) {
            throw new Error(`フィールド「${code}」の type が一致しません（既存: ${curType} / 入力: ${nextType}）。既存フィールドの型変更はできません`);
          }
          if (def.type === "SUBTABLE" && def.fields && currentMap[code]?.fields) {
            for (const [childKey, childDef] of Object.entries(def.fields)) {
              const existingChild = hasOwn(currentMap[code].fields, childKey) ? currentMap[code].fields[childKey] : void 0;
              const curChildType = String(existingChild?.type || "").trim();
              const nextChildType = String(childDef?.type || "").trim();
              if (curChildType && nextChildType && curChildType !== nextChildType) {
                throw new Error(`サブテーブル「${code}」内の子フィールド「${childKey}」の type が一致しません（既存: ${curChildType} / 入力: ${nextChildType}）`);
              }
            }
          }
          plan.updates[code] = def;
          plan.logs.push(`UPDATE ${code}${changed ? " (参照先AppID変換)" : ""}`);
        } else {
          plan.skippedExisting.push(code);
          plan.logs.push(`SKIP ${code} (exists)`);
        }
      } else {
        plan.adds[code] = def;
        plan.logs.push(`ADD ${code}${changed ? " (参照先AppID変換)" : ""}`);
      }
    }
    return plan;
  }
  function listCodes(map, limit = 10) {
    const keys = Object.keys(map);
    const shown = keys.slice(0, limit).map((key) => map[key]?.code && map[key].code !== key ? `${key} → ${map[key].code}` : key);
    return shown.join("、") + (keys.length > limit ? ` ほか${keys.length - limit}件` : "");
  }
  function findFieldCodeConflicts(plan, currentProps) {
    const current = currentProps || {};
    const conflicts = [];
    const finalCount = /* @__PURE__ */ new Map();
    const count = (code) => finalCount.set(code, (finalCount.get(code) || 0) + 1);
    for (const key of Object.keys(current)) count(hasOwn(plan.updates, key) ? String(plan.updates[key]?.code || key) : key);
    for (const [key, def] of Object.entries(plan.adds)) count(String(def?.code || key));
    for (const [key, def] of Object.entries(plan.adds)) {
      const code = String(def?.code || key);
      if (hasOwn(current, code) || (finalCount.get(code) || 0) > 1) conflicts.push(`${key}${code !== key ? ` → ${code}` : ""}`);
    }
    for (const [key, def] of Object.entries(plan.updates)) {
      const code = String(def?.code || key);
      if (code !== key && (finalCount.get(code) || 0) > 1) conflicts.push(`${key} → ${code}`);
    }
    return conflicts;
  }
  function buildFieldApplyConfirmText(targetAppId, targetGuestId, plan) {
    const addCount = Object.keys(plan.adds).length;
    const updateCount = Object.keys(plan.updates).length;
    const skipCount = plan.skippedSystem.length + plan.skippedExisting.length;
    return [
      `反映先 App ${targetAppId}${targetGuestId ? `（ゲストスペース ${targetGuestId}）` : ""} のプレビューへフィールドを反映します。`,
      `追加 ${addCount}件 / 更新 ${updateCount}件 / スキップ ${skipCount}件${plan.lookupConverted.length ? ` / 参照先AppID変換 ${plan.lookupConverted.length}件` : ""}`,
      addCount ? `追加: ${listCodes(plan.adds)}` : "",
      updateCount ? `更新: ${listCodes(plan.updates)}` : "",
      "削除 0件（このツールはフィールドを削除しません）",
      updateCount ? "更新対象は、反映先の既存の定義を反映元の内容で置き換えます。" : "",
      "本番は変わりません（公開は kintone の設定画面で行います）。実行しますか？"
    ].filter(Boolean).join("\n");
  }
  function attachLogsToError(err, logs) {
    const baseMessage = err instanceof Error ? err.message : String(err || "エラーが発生しました");
    const combined = logs.length ? `${baseMessage}
${logs.join("\n")}` : baseMessage;
    const wrapped = new Error(combined);
    if (err && typeof err === "object") {
      Object.assign(wrapped, err);
      wrapped.message = combined;
    }
    return wrapped;
  }
  async function runFieldApplyStandalone(opts, setStatus2) {
    const { targetAppId, targetGuestId, fieldJson, lookupMapJson, overwrite } = opts;
    const tgtApp = validateNumericId(targetAppId, "反映先アプリID", true);
    const tgtGuest = validateNumericId(targetGuestId, "反映先ゲストスペースID", false);
    const incoming = parseFieldJsonInput(fieldJson);
    const lookupMap = parseLookupMapInput(lookupMapJson);
    const prefix = buildApiPrefix(tgtGuest, true);
    setStatus2("反映先のフィールド設定を取得中...");
    const current = await apiGet(prefix, "/app/form/fields.json", { app: tgtApp });
    const plan = planFieldApply(incoming, current.properties || {}, lookupMap, !!overwrite);
    const logs = [...plan.logs];
    const addCount = Object.keys(plan.adds).length;
    const updateCount = Object.keys(plan.updates).length;
    if (!addCount && !updateCount) {
      setStatus2(`追加・更新対象がありません（スキップ ${plan.skippedSystem.length + plan.skippedExisting.length}件）`, true);
      logs.push("反映対象なし");
      return logs;
    }
    const conflicts = findFieldCodeConflicts(plan, current.properties || {});
    if (conflicts.length) {
      throw new Error(`反映後のフィールドコードが既存のフィールドと重複するため、何も反映せずに中止しました: ${conflicts.join("、")}`);
    }
    let revision = pickRevision(current);
    if (!/^\d+$/.test(revision)) {
      throw new Error("反映先のフィールド設定の revision を確認できないため反映を中止しました。最新の設定を取得し直してください");
    }
    if (!opts.skipConfirm && !kusConfirm(buildFieldApplyConfirmText(tgtApp, tgtGuest, plan))) {
      setStatus2("フィールド反映をキャンセルしました");
      logs.push("キャンセル");
      return logs;
    }
    const withRevision = (body) => revision ? { ...body, revision } : body;
    if (addCount) {
      setStatus2(`フィールド追加中... (${addCount}件)`);
      try {
        const res = await apiPost(prefix, "/app/form/fields.json", withRevision({ app: tgtApp, properties: plan.adds }));
        const nextRevision = pickRevision(res);
        if (!/^\d+$/.test(nextRevision)) {
          logs.push(`OK フィールド追加 ${addCount}件 (revision 不明)`);
          throw new Error("フィールド追加は完了しましたが、更新後の revision を確認できないため以降の反映を中止しました。差分を取得し直して状態を確認してください");
        }
        revision = nextRevision;
        logs.push(`OK フィールド追加 ${addCount}件${revision ? ` (revision ${revision})` : ""}`);
      } catch (e) {
        if (isRunCancelledError(e)) {
          logs.push(`未実行（中止） フィールド追加 ${addCount}件${updateCount ? ` / フィールド更新 ${updateCount}件` : ""}`);
          throw createCancelReport(0, addCount + updateCount, logs);
        }
        if (!logs.some((l) => l.startsWith("OK フィールド追加"))) {
          logs.push(`NG フィールド追加 ${addCount}件`);
        }
        throw attachLogsToError(decorateRevisionConflict(e, "フィールド追加"), logs);
      }
    }
    if (updateCount) {
      setStatus2(`フィールド更新中... (${updateCount}件)`);
      try {
        const res = await apiPut(prefix, "/app/form/fields.json", withRevision({ app: tgtApp, properties: plan.updates }));
        const nextRevision = pickRevision(res);
        if (!/^\d+$/.test(nextRevision)) {
          logs.push(`OK フィールド更新 ${updateCount}件 (revision 不明)`);
          throw new Error("フィールド更新は完了しましたが、更新後の revision を確認できません。差分を取得し直して状態を確認してください");
        }
        revision = nextRevision;
        logs.push(`OK フィールド更新 ${updateCount}件${revision ? ` (revision ${revision})` : ""}`);
      } catch (e) {
        if (isRunCancelledError(e)) {
          logs.push(`未実行（中止） フィールド更新 ${updateCount}件${addCount ? "（追加 " + addCount + "件は反映済み）" : ""}`);
          throw createCancelReport(addCount, addCount + updateCount, logs);
        }
        if (!logs.some((l) => l.startsWith("OK フィールド更新"))) {
          logs.push(`NG フィールド更新 ${updateCount}件${addCount ? "（追加 " + addCount + "件は反映済み）" : ""}`);
        }
        let failure = decorateRevisionConflict(e, "フィールド更新");
        if (addCount) failure = withPartialNotice(failure, `フィールド追加 ${addCount}件は反映済みですが、フィールド更新 ${updateCount}件は反映されませんでした。`);
        throw logs.some((l) => l.startsWith("OK ")) ? attachLogsToError(failure, logs) : failure;
      }
    }
    setStatus2(`フィールド反映完了: 追加 ${addCount} / 更新 ${updateCount} / スキップ ${plan.skippedSystem.length + plan.skippedExisting.length}`);
    return logs;
  }
  async function runLoadFieldsStandalone(opts, setStatus2) {
    const { appId, guestId, preview } = opts;
    const id = validateNumericId(appId, "アプリID", true);
    const guest = validateNumericId(guestId, "ゲストスペースID", false);
    const prefix = buildApiPrefix(guest, !!preview);
    setStatus2("フィールド取得中...");
    const res = await apiGet(prefix, "/app/form/fields.json", { app: id });
    setStatus2("フィールド取得完了");
    return res.properties || {};
  }
  var RENAME_EXCLUDED_TYPES = /* @__PURE__ */ new Set([
    "RECORD_NUMBER",
    "CREATOR",
    "CREATED_TIME",
    "MODIFIER",
    "UPDATED_TIME",
    "STATUS",
    "STATUS_ASSIGNEE",
    "CATEGORY"
  ]);
  function planBulkRename(props, prefixText, removeMode, options) {
    const renameMode = typeof options === "string" ? options : options?.renameMode || "put-rename";
    const trimmed = String(prefixText || "").trim();
    const rename = (code) => {
      if (removeMode) return code.startsWith(trimmed) ? code.slice(trimmed.length) : code;
      return code.startsWith(trimmed) ? code : trimmed + code;
    };
    let modifiedCount = 0;
    const newProps = {};
    const renamePairs = [];
    const collisions = [];
    const entries = Object.entries(props || {});
    const finalCodes = /* @__PURE__ */ new Map();
    const countCode = (code) => finalCodes.set(code, (finalCodes.get(code) || 0) + 1);
    for (const [code, field] of entries) {
      if (!field) continue;
      countCode(RENAME_EXCLUDED_TYPES.has(field.type) ? code : rename(code) || code);
      if (!RENAME_EXCLUDED_TYPES.has(field.type) && field.type === "SUBTABLE" && field.fields && typeof field.fields === "object") {
        for (const [childCode, childDef] of Object.entries(field.fields)) {
          if (!childDef) continue;
          countCode(RENAME_EXCLUDED_TYPES.has(childDef.type) ? childCode : rename(childCode) || childCode);
        }
      }
    }
    const checkDuplicate = (from, to, toCode) => {
      if ((finalCodes.get(toCode) || 0) > 1) collisions.push(`${from} → ${to}`);
    };
    for (const [code, field] of entries) {
      if (!field || RENAME_EXCLUDED_TYPES.has(field.type)) continue;
      const newCode = rename(code);
      const cloned = deepClone(field);
      let touched = false;
      if (newCode !== code) {
        if (!newCode) {
          collisions.push(`${code} → (空)`);
          continue;
        }
        checkDuplicate(code, newCode, newCode);
        cloned.code = newCode;
        touched = true;
        renamePairs.push({ from: code, to: newCode });
      }
      if (cloned.type === "SUBTABLE" && cloned.fields && typeof cloned.fields === "object") {
        const children = {};
        for (const [childCode, childDef] of Object.entries(cloned.fields)) {
          if (!childDef || RENAME_EXCLUDED_TYPES.has(childDef.type)) continue;
          const newChild = rename(childCode);
          const childClone = deepClone(childDef);
          if (newChild !== childCode) {
            if (!newChild) {
              collisions.push(`${code}.${childCode} → (空)`);
            } else {
              checkDuplicate(`${code}.${childCode}`, `${newCode}.${newChild}`, newChild);
              childClone.code = newChild;
              touched = true;
              renamePairs.push({ from: `${code}.${childCode}`, to: `${newCode}.${newChild}` });
            }
          }
          const childPropKey = renameMode === "put-rename" ? childCode : newChild || childCode;
          children[childPropKey] = childClone;
        }
        cloned.fields = children;
      }
      if (!touched) continue;
      newProps[renameMode === "put-rename" ? code : newCode] = cloned;
      modifiedCount++;
    }
    return { properties: newProps, modifiedCount, renamePairs, collisions, renameMode };
  }
  async function runBulkRenameFieldStandalone(opts, setStatus2) {
    const { targetAppId, targetGuestId, prefix, removeMode, renameMode } = opts;
    const tgtApp = validateNumericId(targetAppId, "反映先アプリID", true);
    const tgtGuest = validateNumericId(targetGuestId, "反映先ゲストスペースID", false);
    if (!prefix || !String(prefix).trim()) throw new Error("プレフィックス文字列を入力してください");
    const apiPrefix = buildApiPrefix(tgtGuest, true);
    setStatus2("反映先のフィールド設定を取得中...");
    const fieldsResp = await apiGet(apiPrefix, "/app/form/fields.json", { app: tgtApp });
    const result = planBulkRename(fieldsResp.properties || {}, String(prefix), !!removeMode, { renameMode });
    if (result.collisions.length) {
      throw new Error(`リネーム後のフィールドコードが重複または空になります: ${result.collisions.join(", ")}`);
    }
    setStatus2(`プレフィックス${removeMode ? "除去" : "付与"}完了: ${result.modifiedCount}件`);
    return { properties: result.properties, modifiedCount: result.modifiedCount, renamePairs: result.renamePairs, renameMode: result.renameMode };
  }

  // src/entries/field-lite-ui.ts
  init_field();

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
`;
  function ensureStyles2() {
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
    ensureStyles2();
    const { details, body } = makeDetails(opts.title || "アプリを検索（名前・コード・ID）", { open: !!opts.open });
    const keyword = makeInput({ placeholder: "アプリ名 / アプリID / URL", width: "wide", noSubmit: true });
    const guest = makeInput({ placeholder: "ゲストID（任意）", width: "guest", noSubmit: true });
    if (opts.guestEl?.value.trim()) guest.value = opts.guestEl.value.trim();
    const searchBtn = makeButton("検索", "sub", { icon: "🔍" });
    const searchMode = makeSelect([["name", "名前 / ID / URL"], ["code", "アプリコード（完全一致）"]]);
    searchMode.setAttribute("aria-label", "検索方法");
    const space = makeInput({ placeholder: "スペースID（任意）", width: "guest", noSubmit: true, ariaLabel: "検索対象スペースID" });
    body.appendChild(makeRow([searchMode, space], { label: "検索方法" }));
    body.appendChild(makeRow([keyword, guest, searchBtn], { label: "検索語" }));
    body.appendChild(makeNote("閲覧できるアプリを名前（部分一致）またはコード（大文字・小文字を区別する完全一致）で検索します。スペースIDで検索範囲を絞れます。ID / URL の直接指定ではスペースIDの絞り込みは使いません。"));
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
    function invalidate() {
      generation += 1;
      candidates = [];
      nextOffset = 0;
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
      searchBtn.disabled = true;
      moreBtn.disabled = true;
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
    searchBtn.addEventListener("click", () => {
      void runSearch();
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

  // src/entries/field-lite-ui.ts
  init_utils();
  function mountFieldLitePanel() {
    const panel = createLitePanel({
      id: "kus-field-lite",
      title: "フィールド追加",
      subtitle: "フィールド定義 JSON を、反映先のプレビューへ追加・更新します。",
      accent: "field",
      badges: [{ label: "プレビューへ書き込み", tone: "preview" }],
      hint: "反映先のプレビューだけを変更します。本番への公開は kintone の設定画面で行います。"
    });
    const srcApp = makeInput({ placeholder: "アプリID", value: DEFAULT_APP_ID || "", width: "id" });
    const srcGuest = makeInput({ placeholder: "ゲストID (任意)", value: DEFAULT_GUEST_ID, width: "guest" });
    const tgtApp = makeInput({ placeholder: "アプリID", width: "id" });
    const tgtGuest = makeInput({ placeholder: "ゲストID (任意)", width: "guest" });
    const cardApp = makeCard({ title: "アプリ", number: 1 });
    cardApp.body.appendChild(makeRow([srcApp, srcGuest], { label: "反映元" }));
    cardApp.body.appendChild(makeRow([tgtApp, tgtGuest], { label: "反映先" }));
    cardApp.body.appendChild(createAppSearchControl(panel, {
      targets: [
        // 検索した接続先（通常スペースなら空）に合わせる。以前のゲストIDが残ると別の接続先へ書き込もうとするため。
        { label: "反映元", apply: (id, _name, guestId) => {
          srcApp.value = id;
          srcGuest.value = guestId || "";
          resetPickList();
        } },
        { label: "反映先", apply: (id, _name, guestId) => {
          tgtApp.value = id;
          tgtGuest.value = guestId || "";
        } }
      ]
    }));
    panel.body.insertBefore(cardApp.card, panel.status);
    const fieldJson = makeTextarea({ rows: 8, code: true, placeholder: 'フィールド定義 JSON（{ "properties": { ... } } 形式）' });
    const bLoadSrc = makeButton("反映元から読込", "sub");
    const bLoadTgt = makeButton("反映先から読込", "sub");
    const bValidate = makeButton("検証", "sub");
    const bFormat = makeButton("整形", "sub");
    const bImport = makeButton("ファイル読込", "sub");
    const bExport = makeButton("保存", "sub");
    const bClear = makeButton("クリア", "ghost");
    bClear.addEventListener("click", () => {
      fieldJson.value = "";
      fieldJson.dispatchEvent(new Event("input", { bubbles: true }));
    });
    bFormat.addEventListener("click", () => {
      if (!fieldJson.value.trim()) {
        panel.setStatus("整形する JSON がありません", "warn");
        return;
      }
      try {
        const parsed = JSON.parse(fieldJson.value || "{}");
        fieldJson.value = JSON.stringify(parsed, null, 2);
        fieldJson.dispatchEvent(new Event("input", { bubbles: true }));
        panel.setStatus("JSON を整形しました", "ok");
      } catch (e) {
        panel.setStatus(`JSON が壊れています: ${e?.message || String(e)}`, "err");
      }
    });
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = ".json,application/json";
    fileInput.style.display = "none";
    fileInput.addEventListener("change", () => {
      const file = fileInput.files?.[0];
      if (!file) return;
      file.text().then((text) => {
        const parsed = JSON.parse(text);
        fieldJson.value = JSON.stringify(parsed, null, 2);
        fieldJson.dispatchEvent(new Event("input", { bubbles: true }));
        panel.setStatus(`「${file.name}」を読み込みました`, "ok");
      }).catch((e) => {
        panel.setStatus(`JSON 読み込みエラー: ${e?.message || String(e)}`, "err");
      }).finally(() => {
        fileInput.value = "";
      });
    });
    bImport.addEventListener("click", () => fileInput.click());
    bExport.addEventListener("click", () => {
      const text = fieldJson.value.trim();
      if (!text) {
        panel.setStatus("保存する JSON がありません", "warn");
        return;
      }
      try {
        JSON.parse(text);
      } catch (e) {
        panel.setStatus(`JSON が壊れています: ${e?.message || String(e)}`, "err");
        return;
      }
      const appId = tgtApp.value.trim() || srcApp.value.trim();
      downloadText(buildExportFilename("フィールド定義", "json", { appLabel: buildAppFilenameLabel(appId, "") }), text, "application/json");
      panel.setStatus("フィールド JSON を保存しました", "ok");
    });
    const cardJson = makeCard({ title: "フィールド定義 JSON", number: 2 });
    cardJson.actions.style.flexWrap = "wrap";
    cardJson.actions.appendChild(bLoadSrc);
    cardJson.actions.appendChild(bLoadTgt);
    cardJson.actions.appendChild(bValidate);
    cardJson.actions.appendChild(bFormat);
    cardJson.actions.appendChild(bImport);
    cardJson.actions.appendChild(bExport);
    cardJson.actions.appendChild(bClear);
    cardJson.body.appendChild(fileInput);
    cardJson.body.appendChild(fieldJson);
    panel.body.insertBefore(cardJson.card, panel.status);
    bLoadSrc.addEventListener("click", () => liteRun(panel, "反映元のフィールドを取得中…", async () => {
      const props = await runLoadFieldsStandalone(
        { appId: srcApp.value.trim(), guestId: srcGuest.value.trim(), preview: true },
        (m, e) => panel.setStatus(m, e ? "err" : "busy")
      );
      fieldJson.value = JSON.stringify({ properties: props }, null, 2);
      fieldJson.dispatchEvent(new Event("input", { bubbles: true }));
    }, "反映元のフィールド定義を JSON に読み込みました"));
    bLoadTgt.addEventListener("click", () => liteRun(panel, "反映先のフィールドを取得中…", async () => {
      const props = await runLoadFieldsStandalone(
        { appId: tgtApp.value.trim(), guestId: tgtGuest.value.trim(), preview: true },
        (m, e) => panel.setStatus(m, e ? "err" : "busy")
      );
      fieldJson.value = JSON.stringify({ properties: props }, null, 2);
      fieldJson.dispatchEvent(new Event("input", { bubbles: true }));
    }, "反映先のフィールド定義を JSON に読み込みました"));
    const pickDetails = makeCard({ title: "反映元からフィールドを選んでマージ" });
    const bLoadPickList = makeButton("反映元フィールド一覧を取得", "sub");
    pickDetails.body.appendChild(makeRow(bLoadPickList));
    const bInsertPicked = makeButton("選択したフィールドを JSON に挿入（マージ）", "primary");
    const bClosePick = makeButton("候補を閉じる", "ghost");
    const pickList = makePickList({
      ariaLabel: "マージする反映元フィールド",
      filterPlaceholder: "コード・ラベル・タイプで絞り込み",
      emptyText: "反映元にフィールドがありません。",
      footer: (selected, total) => `${total}件中 ${selected}件を選択。挿入すると同じコードの既存定義は候補の内容で置き換えます。`
    });
    pickDetails.body.appendChild(pickList.element);
    const pickActions = makeRow([bInsertPicked, bClosePick]);
    pickActions.hidden = true;
    pickActions.style.marginTop = "8px";
    pickDetails.body.appendChild(pickActions);
    let pickedPropsCache = {};
    function resetPickList() {
      pickedPropsCache = {};
      pickList.clear();
      pickActions.hidden = true;
    }
    srcApp.addEventListener("input", resetPickList);
    srcGuest.addEventListener("input", resetPickList);
    bLoadPickList.addEventListener("click", () => liteRun(panel, "反映元のフィールド一覧を取得中…", async () => {
      const props = await runLoadFieldsStandalone(
        { appId: srcApp.value.trim(), guestId: srcGuest.value.trim(), preview: true },
        (m, e) => panel.setStatus(m, e ? "err" : "busy")
      );
      pickedPropsCache = props || {};
      const entries = Object.entries(pickedPropsCache);
      entries.sort(([a], [b]) => a.localeCompare(b));
      pickList.setItems(entries.map(([code, def]) => ({
        value: code,
        label: `${code}${def?.label ? ` / ${def.label}` : ""}`,
        sub: String(def?.type || "")
      })));
      pickActions.hidden = false;
      panel.setStatus(`${entries.length}件のフィールド候補を表示中。絞り込んでチェックし、「挿入」で JSON にマージします`, entries.length ? "ok" : "warn");
    }));
    bClosePick.addEventListener("click", resetPickList);
    bInsertPicked.addEventListener("click", () => {
      const codes = pickList.selected();
      if (!codes.length) {
        panel.setStatus("挿入するフィールドにチェックを入れてください", "warn");
        return;
      }
      let current = {};
      if (fieldJson.value.trim()) {
        try {
          const parsed = JSON.parse(fieldJson.value);
          current = parsed && typeof parsed === "object" ? parsed.properties ? parsed : { properties: parsed } : { properties: {} };
        } catch (e) {
          panel.setStatus(`既存 JSON が壊れています: ${e?.message || String(e)}`, "err");
          return;
        }
      } else {
        current = { properties: {} };
      }
      const props = current.properties = { ...current.properties || {} };
      let added = 0;
      for (const code of codes) {
        const def = pickedPropsCache[code];
        if (def) {
          props[code] = JSON.parse(JSON.stringify(def));
          added++;
        }
      }
      fieldJson.value = JSON.stringify(current, null, 2);
      fieldJson.dispatchEvent(new Event("input", { bubbles: true }));
      panel.setStatus(`${added}件のフィールドを JSON にマージしました`, "ok");
    });
    panel.body.insertBefore(pickDetails.card, panel.status);
    const optCard = makeCard({ title: "反映オプション・参照先変換" });
    const lookupMap = makeTextarea({ rows: 2, code: true, placeholder: 'ルックアップ参照先のアプリID変換 JSON（任意）: {"旧":"新", ...}' });
    optCard.body.appendChild(makeRow(lookupMap, { label: "ルックアップ", block: true }));
    const ow = makeCheck({ label: "既存フィールドを上書き更新", help: "反映先に同じフィールドコードがあれば、定義を更新します（オフの場合はスキップ）" });
    optCard.body.appendChild(makeRow(ow.label));
    optCard.body.appendChild(makeNote("反映前に、追加・更新・スキップの件数を最終確認します。取得後に反映先へ別の更新が入っていた場合（revision 競合）は上書きせず中止するので、読み込み直してから再実行してください。", "help"));
    panel.body.insertBefore(optCard.card, panel.status);
    bValidate.addEventListener("click", () => {
      try {
        const props = parseFieldJsonInput(fieldJson.value);
        const lmap = parseLookupMapInput(lookupMap.value);
        const summary = summarizeFieldProps(props);
        const issues = collectFieldValidationIssues(props);
        const warnings = collectFieldApplyWarnings(props, {}, lmap);
        const lines = [
          `合計 ${summary.total}件（書込可 ${summary.writable} / システム ${summary.system}${summary.subtable ? ` / サブテーブル ${summary.subtable}` : ""}${summary.lookup ? ` / ルックアップ ${summary.lookup}` : ""}${summary.calc ? ` / 計算 ${summary.calc}` : ""}）`
        ];
        if (issues.length) {
          lines.push(`⚠ 構造上の問題 (${issues.length}件):`, ...issues.map((i) => `  - ${i}`));
        }
        if (warnings.length) {
          lines.push(`確認事項 (${warnings.length}件):`, ...warnings.map((w) => `  - ${w}`));
        }
        panel.setResult(lines.join("\n"));
        panel.setStatus(
          issues.length ? `検証完了: ${issues.length}件の問題を検出しました（下のログを確認）` : `検証OK: 合計 ${summary.total}件 / 書込可 ${summary.writable}件${warnings.length ? `（確認事項 ${warnings.length}件）` : ""}`,
          issues.length ? "warn" : "ok"
        );
      } catch (e) {
        panel.setStatus(e?.message || String(e), "err");
      }
    });
    const bApply = makeButton("反映先プレビューへ反映", "run", { icon: "⤴" });
    panel.body.insertBefore(bApply, panel.status);
    bApply.addEventListener("click", () => liteRun(panel, "反映先プレビューへ反映中…", async () => {
      const logs = await runFieldApplyStandalone(
        {
          targetAppId: tgtApp.value.trim(),
          targetGuestId: tgtGuest.value.trim(),
          fieldJson: fieldJson.value,
          lookupMapJson: lookupMap.value,
          overwrite: ow.checkbox.checked,
          deploy: false
        },
        (m, e) => panel.setStatus(m, e ? "err" : "busy")
      );
      panel.setResult(logs.join("\n"));
    }));
    const renameDetails = makeCard({ title: "プレフィックス一括リネーム（反映先プレビュー）" });
    const renamePrefix = makeInput({ placeholder: "例: dev_", width: "medium" });
    const removeMode = makeCheck({ label: "付与ではなく除去する" });
    const renameModeSelect = makeSelect(
      [
        ["put-rename", "コード変更用（既存フィールドのコードを変更）"],
        ["new-keys", "新規追加用（別コードのフィールドとして追加）"]
      ],
      "put-rename"
    );
    renameModeSelect.setAttribute("aria-label", "リネーム出力形式");
    const bRename = makeButton("リネーム結果を JSON にセット", "sub");
    renameDetails.body.appendChild(makeRow(renamePrefix, { label: "文字列" }));
    renameDetails.body.appendChild(makeRow(removeMode.label));
    renameDetails.body.appendChild(makeRow(renameModeSelect, { label: "出力形式" }));
    renameDetails.body.appendChild(makeRow(bRename));
    const renameNote = makeNote("反映先のフィールドコードを書き換えた JSON を、「フィールド定義 JSON」の入力欄にセットします（反映は別途実行します）。既存フィールドのコードを変えるには「コード変更用」を選びます（「既存フィールドを上書き更新」は自動でオンになります）。", "help");
    renameDetails.body.appendChild(renameNote);
    panel.body.insertBefore(renameDetails.card, panel.status);
    bRename.addEventListener("click", () => liteRun(panel, "リネーム生成中…", async () => {
      const renameMode = renameModeSelect.value || "put-rename";
      const out = await runBulkRenameFieldStandalone(
        {
          targetAppId: tgtApp.value.trim(),
          targetGuestId: tgtGuest.value.trim(),
          prefix: renamePrefix.value,
          removeMode: removeMode.checkbox.checked,
          renameMode
        },
        (m, e) => panel.setStatus(m, e ? "err" : "busy")
      );
      if (!out) return;
      if (renameMode === "put-rename") {
        ow.checkbox.checked = true;
      }
      fieldJson.value = JSON.stringify({ properties: out.properties }, null, 2);
      fieldJson.dispatchEvent(new Event("input", { bubbles: true }));
      const list = out.renamePairs.slice(0, 50).map((p) => `${p.from}  →  ${p.to}`).join("\n");
      panel.setResult(list + (out.renamePairs.length > 50 ? `
... 他 ${out.renamePairs.length - 50} 件` : ""));
    }, "リネーム結果を JSON にセットしました。コードを変更するには「既存フィールドを上書き更新」をオンにして「反映先プレビューへ反映」を実行してください"));
    srcApp.setAttribute("aria-label", "反映元アプリID");
    srcGuest.setAttribute("aria-label", "反映元ゲストスペースID");
    tgtApp.setAttribute("aria-label", "反映先アプリID");
    tgtGuest.setAttribute("aria-label", "反映先ゲストスペースID");
    fieldJson.setAttribute("aria-label", "反映するフィールド定義JSON");
    lookupMap.setAttribute("aria-label", "参照アプリID変換JSON");
    cardJson.body.appendChild(foldWorkflowSection("JSONファイル・整形・クリア", bImport, bExport, bFormat, bClear));
    const fieldProblem = () => {
      const problem = findFieldApplyProblem({ targetAppId: tgtApp.value, targetGuestId: tgtGuest.value, fieldJson: fieldJson.value, lookupMapJson: lookupMap.value });
      if (problem) return problem;
      const sApp = srcApp.value.trim();
      const sGuest = srcGuest.value.trim();
      if (sApp && !/^\d+$/.test(sApp)) return "反映元アプリIDは数値で入力してください。";
      if (sGuest && !/^\d+$/.test(sGuest)) return "反映元ゲストスペースIDは数値で入力してください。";
      return "";
    };
    const fieldSummary = () => {
      let codes = [];
      let detailLabel = "";
      let checkNotes = [];
      try {
        const props = parseFieldJsonInput(fieldJson.value);
        codes = Object.keys(props);
        const sum = summarizeFieldProps(props);
        const parts = [`書込可 ${sum.writable}`, `システム ${sum.system}`];
        if (sum.subtable) parts.push(`サブテーブル ${sum.subtable}`);
        if (sum.lookup) parts.push(`ルックアップ ${sum.lookup}`);
        if (sum.calc) parts.push(`計算 ${sum.calc}`);
        detailLabel = `（${parts.join(" / ")}）`;
        const lmap = parseLookupMapInput(lookupMap.value);
        const issues = collectFieldValidationIssues(props);
        const warnings = collectFieldApplyWarnings(props, {}, lmap);
        checkNotes = [...issues, ...warnings];
      } catch {
        try {
          const data = JSON.parse(fieldJson.value);
          codes = Object.keys(data.properties || data);
        } catch {
        }
      }
      const rows = [
        ["反映先", connectionSummary(tgtApp.value.trim(), tgtGuest.value.trim(), "プレビュー")],
        ["フィールド", `${codes.length} 件${detailLabel} · ${codes.join("、")}`],
        ["既存フィールド", ow.checkbox.checked ? "上書き更新する" : "既存フィールドはスキップ"],
        ["参照先変換", lookupMap.value.trim() || "なし"]
      ];
      if (checkNotes.length) {
        rows.push(["事前検証", checkNotes.join("\n")]);
      }
      rows.push(["本番公開", "しません（公開は kintone の設定画面で行います）"]);
      return rows;
    };
    installLiteWorkflow(panel, {
      setup: [cardApp.card, cardJson.card],
      advanced: [pickDetails.card, optCard.card, renameDetails.card],
      advancedCopy: "フィールドのマージ、上書き更新・参照先変換、一括リネームを使うときはこちら。",
      actions: [{ id: "apply", label: "反映先プレビューへ反映", description: "反映先プレビューへフィールドを追加・更新します（実行前に件数を最終確認します）。", button: bApply, writes: true, validate: fieldProblem, summary: fieldSummary }]
    });
  }

  // src/entries/field-lite-entry.ts
  runOnKintonePage(mountFieldLitePanel);
})();
