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
  var TOOL_ID, EXTERNAL_LIBRARIES, DEFAULT_APP_ID, DIALOG_STATE_KEY, SECTION_DEFS, META_KEYS, SYSTEM_FIELD_TYPES, DEFAULT_SUBTAB_STATE, TOUR_STEP_CONNECTION, TOUR_STEP_SCOPE, TOUR_STEP_NOISE, TOUR_STEP_RUN_DIFF, TOUR_STEP_REVIEW, TOUR_STEP_CATEGORY_VIEW, TOUR_STEP_PLAN, TOUR_STEP_APPLY, TOUR_STEP_RECORD, GUIDED_TOUR_COURSES, GUIDED_TOUR_STEPS;
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
  function esc(s) {
    return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
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
  async function apiPut(prefix, path, body) {
    assertAllowsMutatingRestCall(prefix, path, "PUT");
    try {
      return await kintone.api(`${prefix}${path}`, "PUT", body);
    } catch (e) {
      throw apiErrorWithContext(e, { method: "PUT", prefix, path, payload: body });
    }
  }
  async function apiPost(prefix, path, body) {
    assertAllowsMutatingRestCall(prefix, path, "POST");
    try {
      return await kintone.api(`${prefix}${path}`, "POST", body);
    } catch (e) {
      throw apiErrorWithContext(e, { method: "POST", prefix, path, payload: body });
    }
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
    if (!fileKey) return { ok: false, reason: "error", detail: "fileKey がありません" };
    const url = `${prefix}/file.json?fileKey=${encodeURIComponent(fileKey)}`;
    const headers = { "X-Requested-With": "XMLHttpRequest" };
    try {
      const resp = await fetch(url, { method: "GET", headers });
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
      return {
        ok: false,
        reason: "error",
        detail: error instanceof Error ? error.message : String(error)
      };
    }
  }
  async function fetchTextFileBodyWithRetry(prefix, fileKey) {
    let result = await fetchTextFileBody(prefix, fileKey);
    if (result.ok === true) return result;
    if (result.reason === "oversize") return result;
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
    const fileText = files.length ? ` [${files.slice(0, 3).map((item) => item.fileName || item.fileKey || "(名称不明)").join(", ")}${files.length > 3 ? ", …" : ""}]` : "";
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
      });
    }
    await runTaskFactoriesWithConcurrency(tasks, CUSTOMIZE_BODY_FETCH_CONCURRENCY);
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
    if (sections.includes("customizeSettings")) {
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
          setAuxiliaryFetchError(cust, "JS/CSSファイル本文", 0, e);
        }
      }
    }
    if (sections.includes("pluginSettings")) {
      const plug = bundle.sections.pluginSettings;
      if (plug && !plug._fetchError) {
        try {
          const prefix = buildApiPrefix(guestId, preview);
          const stats = await fetchPluginConfigs(plug, prefix, app);
          const unavailable = stats.failed + stats.skipped;
          if (unavailable > 0) setAuxiliaryFetchError(plug, "プラグイン設定", unavailable);
        } catch (e) {
          setAuxiliaryFetchError(plug, "プラグイン設定", 0, e);
        }
      }
    }
    return bundle;
  }
  var DEPLOY_PATH_SNIPPET, ERR_NO_PROD_WRITE, ERR_NO_DEPLOY_API, ERR_NO_RECORD_PREVIEW_API, DEFAULT_API_GET_RETRIES, DEFAULT_RETRY_BASE_DELAY_MS, DEFAULT_RETRY_MAX_DELAY_MS, RETRIABLE_STATUS_CODES, RECORD_DATA_MUTATION_PATHS, RECORD_CURSOR_PATH, apiGetMetrics, REVISION_CONFLICT_CODES, CUSTOMIZE_BODY_MAX_BYTES, CUSTOMIZE_BODY_FETCH_CONCURRENCY, TEXT_LIKE_EXT;
  var init_api = __esm({
    "src/api.ts"() {
      "use strict";
      init_constants();
      init_kintone_query();
      init_utils();
      DEPLOY_PATH_SNIPPET = "app/deploy.json";
      ERR_NO_PROD_WRITE = "本番APIへの追加・更新・削除は無効です。プレビューAPIへの書き込みのみ可能です。本番への反映はkintone管理画面から手動でデプロイしてください。";
      ERR_NO_DEPLOY_API = "デプロイAPIの実行は無効です。本番への反映はkintone管理画面から手動でデプロイしてください。";
      ERR_NO_RECORD_PREVIEW_API = "レコードAPIにはプレビュー用の追加・更新・削除エンドポイントがありません。レコード操作は本番REST APIを明示的な確認付きで実行します。";
      DEFAULT_API_GET_RETRIES = 3;
      DEFAULT_RETRY_BASE_DELAY_MS = 500;
      DEFAULT_RETRY_MAX_DELAY_MS = 3e3;
      RETRIABLE_STATUS_CODES = /* @__PURE__ */ new Set([408, 409, 425, 429, 500, 502, 503, 504]);
      RECORD_DATA_MUTATION_PATHS = /* @__PURE__ */ new Set([
        "/record.json",
        "/records.json",
        "/record/status.json",
        "/records/status.json"
      ]);
      RECORD_CURSOR_PATH = "/records/cursor.json";
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

  // src/entries/reflect-lite-ui.ts
  init_constants();

  // src/tabs/reflect-standalone.ts
  init_constants();
  init_utils();
  init_api();

  // src/settingsBundleImport.ts
  init_api();
  function limitImportedBundleToSections(bundle, sections) {
    if (!Array.isArray(sections) || !sections.length) return bundle;
    const sourceSections = bundle?.sections || {};
    const picked = pickBundleSections(bundle, sections);
    sections.forEach((sectionKey) => {
      if (Object.prototype.hasOwnProperty.call(sourceSections, sectionKey)) return;
      picked.sections[sectionKey] = {
        _fetchError: "読み込んだ設定JSONに比較対象セクションが含まれていません"
      };
    });
    return picked;
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
        return ensureBundleShape(item);
      } catch {
        return null;
      }
    }).filter(Boolean);
    if (!candidates.length) throw new Error("設定JSON内にアプリ設定バンドルが見つかりません");
    if (appId) {
      const matched = candidates.find((b) => String(b?.appId || "") === appId);
      if (matched) return limitImportedBundleToSections(matched, options.sections);
      throw new Error(`設定JSON内に App ${appId} のバンドルが見つかりません`);
    }
    return limitImportedBundleToSections(candidates[0], options.sections);
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

  // src/reflect/applyOutcome.ts
  var ERROR_HINT_RULES = [
    {
      pattern: /CB_NO02|権限がありません|Forbidden|アクセスが拒否/i,
      hint: "比較先アプリのアプリ管理権限があるユーザーで実行しているか確認してください。"
    },
    {
      pattern: /GAIA_AP01|アプリ.*(見つかりません|存在しません)|指定したアプリ/,
      hint: "比較先アプリID・ゲストスペースIDが正しいか確認してください。"
    },
    {
      pattern: /ルックアップ|lookup|relatedApp|関連レコード/i,
      hint: "参照先アプリが比較先環境に存在しない可能性があります。「Lookup AppID マッピング」で参照先を変換してください。"
    },
    {
      pattern: /フィールド.*(見つかりません|存在しません)|GAIA_IL26/,
      hint: "比較先に存在しないフィールドを参照しています。先に「フィールド設定」を反映してから、このセクションを再実行してください。"
    },
    {
      pattern: /プロセス管理|GAIA_RE/,
      hint: "プロセス管理の有効/無効や、作業者に指定したユーザー・組織が比較先環境に存在するか確認してください。"
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
  function collectRetrySectionKeys(sections) {
    return (sections || []).filter((s) => s.status === "ng" || s.status === "pending").map((s) => s.sectionKey);
  }
  function summarizeApplyOutcome(sections) {
    const out = { ok: 0, ng: 0, pending: 0, skip: 0 };
    for (const s of sections || []) {
      if (s.status === "ok") out.ok += 1;
      else if (s.status === "ng") out.ng += 1;
      else if (s.status === "pending") out.pending += 1;
      else out.skip += 1;
    }
    return out;
  }

  // src/tabs/reflect-standalone.ts
  function filterWritable(props) {
    const out = {};
    for (const [k, def] of Object.entries(props || {})) {
      if (!def || typeof def !== "object") continue;
      if (SYSTEM_FIELD_TYPES.has(def.type)) continue;
      out[k] = deepClone(def);
    }
    return out;
  }
  function convertLookup(fieldDef, map) {
    const def = deepClone(fieldDef || {});
    if (!Object.keys(map).length) return def;
    const walk = (node) => {
      if (!node || typeof node !== "object") return;
      const rel = node.lookup?.relatedApp;
      if (rel?.app != null) {
        const after = map[String(rel.app)];
        if (after && String(after) !== String(rel.app)) node.lookup.relatedApp.app = String(after);
      }
      if (node.type === "SUBTABLE" && node.fields) Object.values(node.fields).forEach(walk);
    };
    walk(def);
    return def;
  }
  async function applyFieldSection(prefix, app, sourceProps, logs, lookupMap, stopOnError) {
    const current = await apiGet(prefix, "/app/form/fields.json", { app });
    const currentMap = current.properties || {};
    const srcWritable = filterWritable(sourceProps);
    const adds = {};
    const updates = {};
    for (const [code, def] of Object.entries(srcWritable)) {
      const converted = convertLookup(def, lookupMap);
      if (currentMap[code]) {
        updates[code] = converted;
      } else {
        adds[code] = converted;
      }
    }
    let failedSteps = 0;
    let revision = pickRevision(current);
    const withRevision = (body) => revision ? { ...body, revision } : body;
    if (Object.keys(adds).length) {
      try {
        const res = await apiPost(prefix, "/app/form/fields.json", withRevision({ app, properties: adds }));
        revision = pickRevision(res) || revision;
        logs.push(`  OK フィールド追加: ${Object.keys(adds).length}件`);
      } catch (e) {
        failedSteps += 1;
        const reported = decorateRevisionConflict(e, "フィールド追加");
        pushReflectErrorLog(logs, `  NG フィールド追加: ${reported.message}`, reported.message);
        if (stopOnError) throw reported;
      }
    }
    if (Object.keys(updates).length) {
      try {
        await apiPut(prefix, "/app/form/fields.json", withRevision({ app, properties: updates }));
        logs.push(`  OK フィールド更新: ${Object.keys(updates).length}件`);
      } catch (e) {
        failedSteps += 1;
        const reported = decorateRevisionConflict(e, "フィールド更新");
        pushReflectErrorLog(logs, `  NG フィールド更新: ${reported.message}`, reported.message);
        if (stopOnError) throw reported;
      }
    }
    return failedSteps;
  }
  async function applyViewsSection(prefix, app, sourceViews) {
    const current = await apiGet(prefix, "/app/views.json", { app });
    const revision = pickRevision(current);
    try {
      await apiPut(prefix, "/app/views.json", revision ? { app, views: sourceViews.views || sourceViews, revision } : { app, views: sourceViews.views || sourceViews });
    } catch (e) {
      throw decorateRevisionConflict(e, "一覧・グラフ設定の反映");
    }
  }
  async function runApplyPreviewStandalone(opts, setStatus, onProgress) {
    const { sourceAppId, sourceGuestId, sourcePreview, targetAppId, targetGuestId } = opts;
    if (!sourceAppId && !opts.sourceBundle) throw new Error("比較元アプリIDまたは設定JSONを指定してください");
    if (!targetAppId) throw new Error("比較先アプリIDを入力してください");
    const scopes = (opts.scopes || []).filter(Boolean);
    if (!scopes.length) throw new Error("反映するセクションを選択してください");
    const lookupMap = opts.lookupMap || {};
    const stopOnError = !!opts.stopOnError;
    const logs = [];
    setStatus(opts.sourceBundle ? "比較元設定を設定JSONから読み込み中..." : "比較元設定を取得中...");
    const sourceBundle = opts.sourceBundle ? pickSettingsBundle(opts.sourceBundle, { side: "source", appId: String(sourceAppId || "").trim() }) : await fetchBundle({
      appId: sourceAppId,
      guestId: sourceGuestId || "",
      preview: !!sourcePreview,
      sections: scopes,
      onProgress: (p, l) => setStatus(`比較元取得中 ${Math.round(p * 100)}% (${l})`)
    });
    if (opts.doBackup) {
      setStatus("比較先プレビューのバックアップ取得中...");
      const backup = await fetchBundle({
        appId: targetAppId,
        guestId: targetGuestId || "",
        preview: true,
        sections: scopes,
        onProgress: (p, l) => setStatus(`バックアップ取得 ${Math.round(p * 100)}% (${l})`)
      });
      const payload = JSON.stringify({ generatedAt: (/* @__PURE__ */ new Date()).toISOString(), scopes, bundle: backup }, null, 2);
      const blob = new Blob([payload], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = buildExportFilename("反映前バックアップ", "json", { appLabel: buildAppFilenameLabel(targetAppId, "") });
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5e3);
      logs.push("バックアップ保存完了");
    }
    const prefix = buildApiPrefix(targetGuestId || "", true);
    const app = targetAppId;
    logs.push(`比較元: ${opts.sourceBundle ? `設定JSON${sourceAppId ? ` (App ${sourceAppId})` : ""}` : sourceAppId} → 比較先(プレビュー): ${targetAppId}`);
    logs.push(`セクション: ${scopes.length}件`);
    logs.push("");
    let hadError = false;
    const sections = [];
    for (let i = 0; i < scopes.length; i++) {
      const secKey = scopes[i];
      const def = SECTION_DEFS.find((d) => d.key === secKey);
      if (!def || !def.put) {
        logs.push(`SKIP ${def?.label || secKey}`);
        sections.push({ sectionKey: secKey, label: def?.label || secKey, status: "skip", message: "反映非対応セクション" });
        continue;
      }
      const sourceSec = deepClone(sourceBundle.sections?.[secKey]);
      if (!sourceSec || sourceSec._fetchError) {
        logs.push(`SKIP ${def.label}: source未取得`);
        sections.push({ sectionKey: secKey, label: def.label, status: "skip", message: "比較元未取得" });
        onProgress(logs);
        continue;
      }
      setStatus(`反映中 ${i + 1}/${scopes.length}: ${def.label}`);
      try {
        if (secKey === "fieldSettings") {
          const failedSteps = await applyFieldSection(prefix, app, sourceSec.properties || sourceSec, logs, lookupMap, stopOnError);
          if (failedSteps > 0) {
            hadError = true;
            logs.push(`NG ${def.label}: 一部の手順が失敗しました（詳細は上の行）`);
            sections.push({ sectionKey: secKey, label: def.label, status: "ng", message: "一部の手順が失敗" });
          } else {
            logs.push(`OK ${def.label}`);
            sections.push({ sectionKey: secKey, label: def.label, status: "ok" });
          }
        } else if (secKey === "viewSettings") {
          await applyViewsSection(prefix, app, sourceSec);
          logs.push(`OK ${def.label}`);
          sections.push({ sectionKey: secKey, label: def.label, status: "ok" });
        } else {
          const current = await apiGet(prefix, def.endpoint, { app });
          const revision = pickRevision(current);
          const body = { app, ...def.putBuilder(sourceSec), ...revision ? { revision } : {} };
          try {
            await apiPut(prefix, def.endpoint, body);
          } catch (e) {
            throw decorateRevisionConflict(e, `${def.label}の反映`);
          }
          logs.push(`OK ${def.label}`);
          sections.push({ sectionKey: secKey, label: def.label, status: "ok" });
        }
      } catch (e) {
        hadError = true;
        const msg = e.message || String(e);
        pushReflectErrorLog(logs, `NG ${def.label}: ${msg}`, msg);
        sections.push({ sectionKey: secKey, label: def.label, status: "ng", message: msg });
        if (stopOnError) {
          for (let j = i + 1; j < scopes.length; j++) {
            const restKey = scopes[j];
            const restDef = SECTION_DEFS.find((d) => d.key === restKey);
            sections.push({ sectionKey: restKey, label: restDef?.label || restKey, status: "pending", message: "中断のため未実行" });
          }
          logs.push(`中断（未実行 ${scopes.length - i - 1} 件）`);
          break;
        }
      }
      onProgress(logs);
    }
    const ok = sections.filter((s) => s.status === "ok").length;
    const ng = sections.filter((s) => s.status === "ng").length;
    const pending = sections.filter((s) => s.status === "pending").length;
    logs.push("");
    logs.push(`=== 完了: OK ${ok} / NG ${ng}${pending ? ` / 未実行 ${pending}` : ""} ===`);
    onProgress(logs);
    setStatus(hadError ? "反映完了（一部エラーあり）" : "反映完了");
    return { logs, sections };
  }
  async function preflightLookupMapStandalone(lookupMap, opts = {}) {
    const entries = Object.entries(lookupMap || {});
    if (!entries.length) return { ok: true, missing: [] };
    const prefix = buildApiPrefix(opts.targetGuestId || "", true);
    const missing = [];
    for (const [from, to] of entries) {
      const target = String(to || "").trim();
      if (!target || !/^\d+$/.test(target)) {
        missing.push({ from, to: target, reason: "AppID形式が不正" });
        continue;
      }
      try {
        await apiGet(prefix, "/app.json", { id: target });
      } catch (e) {
        missing.push({ from, to: target, reason: `取得失敗: ${e?.message || String(e)}` });
      }
    }
    return { ok: missing.length === 0, missing };
  }
  async function previewReflectStandalone(opts, setStatus) {
    const scopes = (opts.scopes || []).filter(Boolean);
    const lookupMap = opts.lookupMap || {};
    if (!scopes.length) throw new Error("プレビュー対象セクションが空です");
    if (!opts.sourceAppId && !opts.sourceBundle) throw new Error("比較元アプリIDまたは設定JSONを指定してください");
    if (!opts.targetAppId) throw new Error("比較先アプリIDを入力してください");
    setStatus(opts.sourceBundle ? "比較元設定を設定JSONから読み込み中..." : "比較元設定を取得中...");
    const source = opts.sourceBundle ? pickSettingsBundle(opts.sourceBundle, { side: "source", appId: String(opts.sourceAppId || "").trim() }) : await fetchBundle({
      appId: opts.sourceAppId,
      guestId: opts.sourceGuestId || "",
      preview: !!opts.sourcePreview,
      sections: scopes,
      onProgress: (p, l) => setStatus(`比較元取得 ${Math.round(p * 100)}% (${l})`)
    });
    setStatus("比較先プレビューを取得中...");
    const target = await fetchBundle({
      appId: opts.targetAppId,
      guestId: opts.targetGuestId || "",
      preview: true,
      sections: scopes,
      onProgress: (p, l) => setStatus(`比較先取得 ${Math.round(p * 100)}% (${l})`)
    });
    const entries = [];
    for (const secKey of scopes) {
      const def = SECTION_DEFS.find((d) => d.key === secKey);
      const label = def?.label || secKey;
      const srcSec = source.sections?.[secKey];
      const tgtSec = target.sections?.[secKey];
      if (!srcSec || srcSec._fetchError) {
        entries.push({ sectionKey: secKey, label, status: "src-missing", message: `比較元未取得: ${srcSec?._fetchError || "不明"}` });
        continue;
      }
      if (!tgtSec || tgtSec._fetchError) {
        entries.push({ sectionKey: secKey, label, status: "tgt-missing", message: `比較先未取得: ${tgtSec?._fetchError || "不明"}` });
        continue;
      }
      if (secKey === "fieldSettings") {
        const srcPropsRaw = filterWritable(srcSec.properties || srcSec);
        const srcProps = {};
        for (const [code, def2] of Object.entries(srcPropsRaw)) {
          srcProps[code] = convertLookup(def2, lookupMap);
        }
        const tgtProps = filterWritable(tgtSec.properties || tgtSec || {});
        if (stableStringify(srcProps) === stableStringify(tgtProps)) {
          entries.push({ sectionKey: secKey, label, status: "same", message: "差分なし" });
          continue;
        }
        let add = 0;
        let update = 0;
        let tgtOnly = 0;
        for (const code of Object.keys(srcProps)) {
          if (!tgtProps[code]) {
            add += 1;
            continue;
          }
          if (stableStringify(srcProps[code]) !== stableStringify(tgtProps[code])) update += 1;
        }
        for (const code of Object.keys(tgtProps)) {
          if (!srcProps[code]) tgtOnly += 1;
        }
        const detail = `追加 ${add} / 更新 ${update} / 比較先のみ ${tgtOnly}`;
        entries.push({
          sectionKey: secKey,
          label,
          status: "change",
          message: detail,
          fieldStats: { add, update, tgtOnly }
        });
      } else {
        if (stableStringify(srcSec) === stableStringify(tgtSec)) {
          entries.push({ sectionKey: secKey, label, status: "same", message: "差分なし" });
          continue;
        }
        entries.push({ sectionKey: secKey, label, status: "change", message: "差分あり（セクション単位）" });
      }
    }
    return {
      totalSections: entries.length,
      changedSections: entries.filter((e) => e.status === "change").length,
      sameSections: entries.filter((e) => e.status === "same").length,
      errorSections: entries.filter((e) => e.status === "src-missing" || e.status === "tgt-missing" || e.status === "error").length,
      entries
    };
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
      const tone = panel.status.dataset.tone;
      if (okMsg && tone !== "err") {
        panel.setStatus(okMsg, "ok");
      } else if (tone === "busy") {
        const text = panel.status.querySelector(".kus-lp__status-text")?.textContent || "";
        panel.setStatus(text || "完了", "ok");
      }
      return out;
    } catch (e) {
      const message = String(e?.message || e || "不明なエラー");
      const lines = message.split("\n").map((line) => line.trim()).filter(Boolean);
      const [first, ...rest] = lines.length ? lines : [message];
      panel.setStatus(`エラー: ${first}${rest.length ? "（詳細は下のログ）" : ""}`, "err");
      if (rest.length) panel.setResult(lines.join("\n"));
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

  // src/entries/reflect-lite-ui.ts
  var memoryState = {
    presets: []
  };
  var SCOPE_QUICK_PRESETS = [
    { id: "all", label: "すべて", hint: "反映可能なセクションを全選択" },
    {
      id: "formOnly",
      label: "フォームのみ",
      hint: "フィールド設定＋レイアウト＋ビュー",
      scopes: ["fieldSettings", "layoutSettings", "viewSettings"]
    },
    {
      id: "viewsOnly",
      label: "ビュー+グラフ",
      hint: "ビュー設定とグラフ設定のみ",
      scopes: ["viewSettings", "reportSettings"]
    },
    {
      id: "permsOnly",
      label: "権限のみ",
      hint: "アプリ・フィールド・レコード権限",
      scopes: ["appAcl", "fieldAcl", "recordPermissions"]
    },
    {
      id: "notificationsOnly",
      label: "通知のみ",
      hint: "一般・条件・リマインダー通知",
      scopes: ["notifications", "perRecordNotifications", "reminderNotifications"]
    },
    {
      id: "noPerms",
      label: "権限を除外",
      hint: "権限系・通知系を除いた全セクション",
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
#kus-reflect-lite .kus-rl-review{display:flex;flex-direction:column;gap:10px}
#kus-reflect-lite .kus-rl-review-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
#kus-reflect-lite .kus-rl-stat{padding:10px 12px;border:1px solid #e2e8f0;border-radius:10px;background:#fff}
#kus-reflect-lite .kus-rl-stat__label{font-size:10.5px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px}
#kus-reflect-lite .kus-rl-stat__value{font-size:13px;font-weight:700;color:#0f172a;word-break:break-word}
#kus-reflect-lite .kus-rl-stat__meta{margin-top:4px;font-size:11px;line-height:1.5;color:#64748b}
#kus-reflect-lite .kus-rl-pills{display:flex;flex-wrap:wrap;gap:6px}
#kus-reflect-lite .kus-rl-pill{display:inline-flex;align-items:center;gap:4px;padding:3px 8px;border-radius:999px;font-size:11px;font-weight:700;border:1px solid #e2e8f0;background:#fff;color:#334155}
#kus-reflect-lite .kus-rl-pill--change{background:#fff7ed;border-color:#fdba74;color:#9a3412}
#kus-reflect-lite .kus-rl-pill--same{background:#ecfdf5;border-color:#a7f3d0;color:#065f46}
#kus-reflect-lite .kus-rl-pill--error{background:#fef2f2;border-color:#fca5a5;color:#991b1b}
#kus-reflect-lite .kus-rl-pill--stale{background:#eff6ff;border-color:#93c5fd;color:#1d4ed8}
#kus-reflect-lite .kus-rl-next{padding:10px 12px;border-radius:10px;font-size:12px;line-height:1.6;border:1px solid #e2e8f0;background:#fff}
#kus-reflect-lite .kus-rl-next strong{display:block;margin-bottom:2px}
#kus-reflect-lite .kus-rl-next--ok{background:#ecfdf5;border-color:#a7f3d0;color:#065f46}
#kus-reflect-lite .kus-rl-next--info{background:#eff6ff;border-color:#bfdbfe;color:#1e3a8a}
#kus-reflect-lite .kus-rl-next--warn{background:#fffbeb;border-color:#fde68a;color:#92400e}
#kus-reflect-lite .kus-rl-issues{margin:0;padding-left:18px;font-size:12px;line-height:1.6;color:#92400e}
#kus-reflect-lite .kus-rl-issues li+li{margin-top:3px}
#kus-reflect-lite .kus-rl-quiet{font-size:11.5px;color:#64748b}
#kus-reflect-lite .kus-rl-preview-summary{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px}
#kus-reflect-lite .kus-rl-preview-tools{display:flex;flex-direction:column;gap:8px;margin-bottom:10px}
#kus-reflect-lite .kus-rl-preview-tools__actions{display:flex;flex-wrap:wrap;gap:6px}
#kus-reflect-lite .kus-rl-preview-empty{padding:14px 12px;border:1px dashed #cbd5e1;border-radius:10px;background:#f8fafc;font-size:12px;color:#64748b}
#kus-reflect-lite .kus-rl-preview-group{border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;background:#fff;margin-bottom:10px}
#kus-reflect-lite .kus-rl-preview-group__head{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:9px 12px;background:#f8fafc;border-bottom:1px solid #e2e8f0;font-size:11.5px;font-weight:700;color:#334155}
#kus-reflect-lite .kus-rl-preview-list{display:flex;flex-direction:column;gap:8px;padding:10px}
#kus-reflect-lite .kus-rl-preview-row{border:1px solid #e2e8f0;border-radius:10px;padding:10px;background:#fff}
#kus-reflect-lite .kus-rl-preview-row--change{border-color:#fdba74;background:#fffaf0}
#kus-reflect-lite .kus-rl-preview-row--same{border-color:#bbf7d0;background:#f0fdf4}
#kus-reflect-lite .kus-rl-preview-row--error{border-color:#fca5a5;background:#fff5f5}
#kus-reflect-lite .kus-rl-preview-row__head{display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:6px}
#kus-reflect-lite .kus-rl-preview-row__title{font-size:12px;font-weight:700;color:#0f172a}
#kus-reflect-lite .kus-rl-preview-row__detail{font-size:11.5px;line-height:1.6;color:#475569}
#kus-reflect-lite .kus-rl-preview-row__meta{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}
#kus-reflect-lite .kus-rl-preview-row__actions{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}
#kus-reflect-lite .kus-rl-preview-row__state{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}
#kus-reflect-lite .kus-rl-preview-mini{display:inline-flex;align-items:center;padding:2px 7px;border-radius:999px;background:#fff;border:1px solid #e2e8f0;font-size:10.5px;font-weight:700;color:#475569}
#kus-reflect-lite.kus-lp--wide{width:min(760px,96vw)}
#kus-reflect-lite .kus-rl-nav{position:sticky;top:-16px;z-index:8;display:grid;grid-template-columns:repeat(3,1fr);gap:4px;margin:-2px 0 14px;padding:8px;background:rgba(248,250,252,.96);border:1px solid #e2e8f0;border-radius:12px;backdrop-filter:blur(8px)}
#kus-reflect-lite .kus-rl-nav__btn{appearance:none;border:0;border-radius:9px;background:transparent;color:#64748b;padding:8px 7px;cursor:pointer;font:700 11.5px/1.3 inherit;display:flex;align-items:center;justify-content:center;gap:6px}
#kus-reflect-lite .kus-rl-nav__btn:hover{background:#fff;color:#334155}
#kus-reflect-lite .kus-rl-nav__btn[aria-selected="true"]{background:#fff;color:#b91c1c;box-shadow:0 1px 3px rgba(15,23,42,.12)}
#kus-reflect-lite .kus-rl-nav__num{display:inline-flex;width:19px;height:19px;align-items:center;justify-content:center;border-radius:50%;background:#e2e8f0;color:#475569;font-size:10px}
#kus-reflect-lite .kus-rl-nav__btn[aria-selected="true"] .kus-rl-nav__num{background:#fee2e2;color:#b91c1c}
#kus-reflect-lite .kus-rl-stage[hidden]{display:none}
#kus-reflect-lite .kus-rl-stage-head{margin:2px 2px 12px}
#kus-reflect-lite .kus-rl-stage-head h2{margin:0;font-size:15px;color:#0f172a}
#kus-reflect-lite .kus-rl-stage-head p{margin:3px 0 0;font-size:11.5px;color:#64748b}
#kus-reflect-lite .kus-rl-action-dock{position:sticky;bottom:-18px;z-index:9;margin:14px -18px -18px;padding:12px 18px 16px;background:linear-gradient(180deg,rgba(255,255,255,.86),#fff 28%);border-top:1px solid #e2e8f0;box-shadow:0 -10px 22px rgba(15,23,42,.07)}
#kus-reflect-lite .kus-rl-action-dock .kus-lp__status{margin-top:8px}
#kus-reflect-lite .kus-rl-stage .kus-lp__card:last-child{margin-bottom:0}
@media(max-width:640px){
  #kus-reflect-lite .kus-rl-review-grid{grid-template-columns:1fr}
  #kus-reflect-lite .kus-rl-nav__btn{font-size:11px;padding-inline:3px}
}
`;
  function ensureReflectLiteStyles() {
    if (document.getElementById(REFLECT_LITE_STYLE_ID)) return;
    const st = document.createElement("style");
    st.id = REFLECT_LITE_STYLE_ID;
    st.textContent = REFLECT_LITE_CSS;
    document.head.appendChild(st);
  }
  function mountReflectLitePanel() {
    ensureReflectLiteStyles();
    const panel = createLitePanel({
      id: "kus-reflect-lite",
      title: "プレビュー反映",
      subtitle: "比較元アプリの設定を比較先プレビューへ一括反映します。",
      accent: "reflect",
      badges: [{ label: "Lite" }, { label: "比較先プレビューへ" }],
      hint: "<strong>反映先は常にプレビュー</strong>環境です。まず差分プレビューで変更内容を確認し、そのまま反映判断につなげます。",
      wide: true
    });
    let showWorkflowStage = () => {
    };
    const srcApp = makeInput({ placeholder: "比較元アプリID", value: memoryState.sourceAppId || "", width: "id" });
    const srcGuest = makeInput({ placeholder: "ゲストID", value: memoryState.sourceGuestId || "", width: "guest" });
    const tgtApp = makeInput({ placeholder: "比較先アプリID", value: memoryState.targetAppId || DEFAULT_APP_ID || "", width: "id" });
    const tgtGuest = makeInput({ placeholder: "ゲストID", value: memoryState.targetGuestId || "", width: "guest" });
    let sourceBundleFromJson = null;
    let sourceBundleToken = "";
    const srcJsonFile = document.createElement("input");
    srcJsonFile.type = "file";
    srcJsonFile.accept = ".json,application/json";
    srcJsonFile.className = "kus-lp__file";
    const srcJsonClearBtn = makeButton("クリア", "ghost");
    srcJsonClearBtn.style.display = "none";
    const srcJsonNote = document.createElement("div");
    srcJsonNote.className = "kus-lp__small";
    srcJsonNote.style.display = "none";
    const currentSrcBtn = makeButton("現在のアプリを比較元", "sub");
    const copyBtn = makeButton("比較元 → 比較先", "sub");
    const currentBtn = makeButton("現在のアプリを比較先", "sub");
    const swapBtn = makeButton("入れ替え", "sub");
    const cardApp = makeCard({ title: "アプリ", number: 1 });
    cardApp.body.appendChild(makeRow([srcApp, srcGuest], { label: "比較元" }));
    cardApp.body.appendChild(makeRow([srcJsonFile, srcJsonClearBtn], { label: "比較元JSON" }));
    cardApp.body.appendChild(srcJsonNote);
    cardApp.body.appendChild(makeRow([tgtApp, tgtGuest], { label: "比較先" }));
    const quickRow = makeRow([currentSrcBtn, copyBtn, currentBtn, swapBtn]);
    quickRow.style.marginTop = "4px";
    cardApp.body.appendChild(quickRow);
    function refreshSrcJsonNote() {
      if (sourceBundleFromJson) {
        srcJsonNote.textContent = `比較元JSON読み込み済み: App ${sourceBundleFromJson?.appId || "-"}（比較元はこのJSONから取得し、アプリからの取得は行いません）`;
        srcJsonNote.style.display = "block";
        srcJsonClearBtn.style.display = "";
      } else {
        srcJsonNote.style.display = "none";
        srcJsonClearBtn.style.display = "none";
      }
    }
    srcJsonFile.addEventListener("change", () => liteRun(panel, "比較元JSONを読み込み中…", async () => {
      const file = srcJsonFile.files?.[0];
      if (!file) return;
      sourceBundleFromJson = await readSettingsBundleFile(file, { side: "source", appId: srcApp.value.trim() });
      sourceBundleToken = `${file.name}:${file.size}:${file.lastModified}:${Date.now()}`;
      if (!srcApp.value.trim() && sourceBundleFromJson?.appId) srcApp.value = String(sourceBundleFromJson.appId);
      panel.setStatus(`比較元JSONを読み込みました: App ${sourceBundleFromJson?.appId || "-"}`, "ok");
      saveState();
      refreshSrcJsonNote();
      refreshSameConnBanner();
      refreshReviewCard();
    }));
    srcJsonClearBtn.addEventListener("click", () => {
      sourceBundleFromJson = null;
      sourceBundleToken = "";
      srcJsonFile.value = "";
      refreshSrcJsonNote();
      refreshSameConnBanner();
      refreshReviewCard();
      panel.setStatus("比較元JSONをクリアしました（比較元アプリIDから取得します）", "info");
    });
    const sameConnBanner = document.createElement("div");
    sameConnBanner.className = "kus-lp__note--warn";
    sameConnBanner.style.display = "none";
    sameConnBanner.textContent = "⚠ 比較元と比較先が同一接続です（同じアプリID・ゲストID）。同一アプリのプレビューを上書きする状態です。";
    cardApp.body.appendChild(sameConnBanner);
    cardApp.body.appendChild(createAppSearchControl(panel, {
      targets: [
        { label: "比較元", apply: (id, _name, guestId) => {
          srcApp.value = id;
          if (guestId && !srcGuest.value.trim()) srcGuest.value = guestId;
          saveState();
          refreshSameConnBanner();
          refreshReviewCard();
        } },
        { label: "比較先", apply: (id, _name, guestId) => {
          tgtApp.value = id;
          if (guestId && !tgtGuest.value.trim()) tgtGuest.value = guestId;
          saveState();
          refreshSameConnBanner();
          refreshReviewCard();
        } }
      ]
    }));
    panel.body.insertBefore(cardApp.card, panel.status);
    function refreshSameConnBanner() {
      const same = !sourceBundleFromJson && !!srcApp.value.trim() && srcApp.value.trim() === tgtApp.value.trim() && srcGuest.value.trim() === tgtGuest.value.trim();
      sameConnBanner.style.display = same ? "block" : "none";
    }
    currentSrcBtn.addEventListener("click", () => {
      srcApp.value = DEFAULT_APP_ID || "";
      saveState();
      refreshSameConnBanner();
      refreshReviewCard();
      panel.setStatus("現在のアプリIDを比較元にセットしました", "info");
    });
    copyBtn.addEventListener("click", () => {
      tgtApp.value = srcApp.value.trim();
      tgtGuest.value = srcGuest.value.trim();
      saveState();
      refreshSameConnBanner();
      refreshReviewCard();
      panel.setStatus("比較元IDを比較先へコピーしました", "info");
    });
    currentBtn.addEventListener("click", () => {
      tgtApp.value = DEFAULT_APP_ID || "";
      saveState();
      refreshSameConnBanner();
      refreshReviewCard();
      panel.setStatus("現在のアプリIDを比較先にセットしました", "info");
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
      panel.setStatus("比較元と比較先を入れ替えました", "info");
    });
    [srcApp, srcGuest, tgtApp, tgtGuest].forEach((el) => {
      el.addEventListener("input", () => {
        saveState();
        refreshSameConnBanner();
        refreshReviewCard();
      });
    });
    const cardScope = makeCard({ title: "反映するセクション", number: 2 });
    const putSections = SECTION_DEFS.filter((d) => d.put);
    const initialSelected = new Set(
      Array.isArray(memoryState.selectedScopes) && memoryState.selectedScopes.length ? memoryState.selectedScopes : putSections.map((d) => d.key)
    );
    const chips = putSections.map((d) => makeChip({
      label: d.label,
      checked: initialSelected.has(d.key),
      value: d.key
    }));
    const chipBox = document.createElement("div");
    chipBox.className = "kus-lp__chips";
    chips.forEach((c) => chipBox.appendChild(c.label));
    cardScope.body.appendChild(chipBox);
    const scopeCountLabel = document.createElement("div");
    scopeCountLabel.className = "kus-lp__small";
    scopeCountLabel.style.marginTop = "4px";
    cardScope.body.appendChild(scopeCountLabel);
    function collectSelectedScopes() {
      return chips.filter((c) => c.checkbox.checked).map((c) => c.checkbox.value);
    }
    function refreshScopeCount() {
      const sel = collectSelectedScopes().length;
      scopeCountLabel.textContent = `選択中: ${sel} / ${chips.length} セクション`;
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
    presetRow.style.marginTop = "8px";
    for (const preset of SCOPE_QUICK_PRESETS) {
      const btn = makeButton(preset.label, "sub");
      btn.title = preset.hint;
      btn.addEventListener("click", () => {
        applyScopePreset(preset);
        panel.setStatus(`プリセット適用: ${preset.label}（${collectSelectedScopes().length}件）`, "info");
      });
      presetRow.appendChild(btn);
    }
    cardScope.body.appendChild(presetRow);
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
    const cardOpt = makeCard({ title: "実行オプション", number: 3, soft: true });
    const backup = makeCheck({
      label: "比較先プレビューのバックアップを保存",
      checked: memoryState.doBackup !== false,
      help: "反映前に比較先プレビューの設定を JSON で書き出します"
    });
    const srcPreview = makeCheck({
      label: "比較元をプレビューから取得",
      checked: memoryState.sourcePreview !== false,
      help: "OFF にすると比較元の本番（運用中）設定を取得します"
    });
    const stop = makeCheck({
      label: "エラー時に中断する",
      checked: memoryState.stopOnError !== false,
      help: "途中で失敗したらそこで止めます（推奨）"
    });
    const onlyChanged = makeCheck({
      label: "差分ありセクションだけ実行",
      checked: memoryState.onlyChanged !== false,
      help: "最新の差分プレビュー結果を使い、一致セクションは実行対象から自動で外します"
    });
    const excludePreviewErrors = makeCheck({
      label: "取得失敗セクションを自動除外",
      checked: memoryState.excludePreviewErrors !== false,
      help: "差分プレビューで取得失敗したセクションは、実行対象から自動で外します"
    });
    const optGrid = document.createElement("div");
    optGrid.className = "kus-lp__check-grid";
    optGrid.appendChild(backup.label);
    optGrid.appendChild(srcPreview.label);
    optGrid.appendChild(stop.label);
    optGrid.appendChild(onlyChanged.label);
    optGrid.appendChild(excludePreviewErrors.label);
    cardOpt.body.appendChild(optGrid);
    const lookupDetails = makeDetails("Lookup AppID マッピング（任意）");
    const lookupTa = makeTextarea({
      rows: 3,
      code: true,
      placeholder: '{"旧AppID":"新AppID", ...}',
      value: memoryState.lookupMapText || ""
    });
    lookupDetails.body.appendChild(lookupTa);
    const lookupHint = document.createElement("div");
    lookupHint.className = "kus-lp__small";
    lookupHint.style.marginTop = "6px";
    lookupHint.textContent = "フィールドの参照アプリ（ルックアップ）を別 AppID に置換します。差分プレビューにも反映し、実行前に変換先 AppID の存在を確認します。";
    lookupDetails.body.appendChild(lookupHint);
    cardOpt.body.appendChild(lookupDetails.details);
    [backup.checkbox, srcPreview.checkbox, stop.checkbox, onlyChanged.checkbox, excludePreviewErrors.checkbox].forEach((cb) => {
      cb.addEventListener("change", () => {
        saveState();
        refreshReviewCard();
      });
    });
    lookupTa.addEventListener("input", () => {
      saveState();
      refreshReviewCard();
    });
    panel.body.insertBefore(cardOpt.card, panel.status);
    const cardPreset = makeCard({ title: "プリセット（接続+スコープ）", soft: true });
    const presetSelect = document.createElement("select");
    presetSelect.className = "kus-lp__select";
    presetSelect.style.minWidth = "180px";
    const saveBtn = makeButton("現在の設定を保存", "sub");
    const loadBtn = makeButton("読み込み", "sub");
    const delBtn = makeButton("削除", "sub");
    cardPreset.body.appendChild(makeRow([presetSelect, loadBtn, saveBtn, delBtn], { label: "名前" }));
    const presetHint = document.createElement("div");
    presetHint.className = "kus-lp__small";
    presetHint.textContent = "プリセットはこのタブを閉じるまで保持されます（ブラウザに永続保存はしません）。";
    cardPreset.body.appendChild(presetHint);
    panel.body.insertBefore(cardPreset.card, panel.status);
    function refreshPresetSelect() {
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
        opt.textContent = `${p.name} (src#${p.source.appId} → tgt#${p.target.appId})`;
        presetSelect.appendChild(opt);
      }
    }
    refreshPresetSelect();
    saveBtn.addEventListener("click", () => {
      const name = window.prompt("プリセット名を入力してください", "");
      if (!name) return;
      const trimmed = name.trim();
      if (!trimmed) {
        panel.setStatus("プリセット名が空です", "warn");
        return;
      }
      const preset = {
        name: trimmed,
        createdAt: (/* @__PURE__ */ new Date()).toISOString(),
        source: {
          appId: srcApp.value.trim(),
          guestId: srcGuest.value.trim(),
          preview: srcPreview.checkbox.checked
        },
        target: {
          appId: tgtApp.value.trim(),
          guestId: tgtGuest.value.trim()
        },
        scopes: collectSelectedScopes(),
        lookupMapText: lookupTa.value,
        doBackup: backup.checkbox.checked,
        stopOnError: stop.checkbox.checked,
        onlyChanged: onlyChanged.checkbox.checked,
        excludePreviewErrors: excludePreviewErrors.checkbox.checked
      };
      memoryState.presets = (memoryState.presets || []).filter((p) => p.name !== trimmed);
      memoryState.presets.unshift(preset);
      refreshPresetSelect();
      presetSelect.value = trimmed;
      panel.setStatus(`プリセット「${trimmed}」を保存しました`, "ok");
    });
    loadBtn.addEventListener("click", () => {
      const name = presetSelect.value;
      const preset = (memoryState.presets || []).find((p) => p.name === name);
      if (!preset) return;
      srcApp.value = preset.source.appId;
      srcGuest.value = preset.source.guestId;
      tgtApp.value = preset.target.appId;
      tgtGuest.value = preset.target.guestId;
      srcPreview.checkbox.checked = !!preset.source.preview;
      backup.checkbox.checked = !!preset.doBackup;
      stop.checkbox.checked = !!preset.stopOnError;
      onlyChanged.checkbox.checked = preset.onlyChanged !== false;
      excludePreviewErrors.checkbox.checked = preset.excludePreviewErrors !== false;
      lookupTa.value = preset.lookupMapText || "";
      setSelectedScopes(preset.scopes || []);
      refreshSameConnBanner();
      saveState();
      refreshReviewCard();
      panel.setStatus(`プリセット「${name}」を読み込みました`, "ok");
    });
    delBtn.addEventListener("click", () => {
      const name = presetSelect.value;
      if (!name) return;
      if (!window.confirm(`プリセット「${name}」を削除しますか？`)) return;
      memoryState.presets = (memoryState.presets || []).filter((p) => p.name !== name);
      refreshPresetSelect();
      panel.setStatus(`プリセット「${name}」を削除しました`, "info");
    });
    const previewBtn = makeButton("差分プレビューを更新", "primary", { icon: "👁" });
    const changedOnlyBtn = makeButton("差分ありだけ選択", "sub");
    const reviewCard = makeCard({ title: "実行前チェック", number: 4, soft: true });
    reviewCard.actions.style.flexWrap = "wrap";
    reviewCard.actions.appendChild(changedOnlyBtn);
    reviewCard.actions.appendChild(previewBtn);
    const reviewBody = document.createElement("div");
    reviewBody.className = "kus-rl-review";
    reviewCard.body.appendChild(reviewBody);
    panel.body.insertBefore(reviewCard.card, panel.status);
    const previewCard = makeCard({ title: "差分プレビュー結果" });
    previewCard.card.style.display = "none";
    const previewTools = document.createElement("div");
    previewTools.className = "kus-rl-preview-tools";
    const previewSearch = makeInput({ placeholder: "セクション名や詳細で検索", width: "wide" });
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
    previewTools.appendChild(previewSearch);
    previewTools.appendChild(previewActions);
    const previewBody = document.createElement("div");
    previewCard.body.appendChild(previewTools);
    previewCard.body.appendChild(previewBody);
    panel.body.insertBefore(previewCard.card, panel.status);
    function saveState() {
      memoryState = {
        ...memoryState,
        sourceAppId: srcApp.value.trim(),
        sourceGuestId: srcGuest.value.trim(),
        targetAppId: tgtApp.value.trim(),
        targetGuestId: tgtGuest.value.trim(),
        sourcePreview: srcPreview.checkbox.checked,
        stopOnError: stop.checkbox.checked,
        doBackup: backup.checkbox.checked,
        onlyChanged: onlyChanged.checkbox.checked,
        excludePreviewErrors: excludePreviewErrors.checkbox.checked,
        selectedScopes: collectSelectedScopes(),
        lookupMapText: lookupTa.value
      };
    }
    function getPreviewState(scopes = collectSelectedScopes(), lookupState = tryParseLookupMap(lookupTa.value)) {
      const signature = lookupState.ok ? buildPreviewSignature({
        sourceAppId: srcApp.value.trim(),
        sourceGuestId: srcGuest.value.trim(),
        sourcePreview: srcPreview.checkbox.checked,
        sourceBundleToken,
        targetAppId: tgtApp.value.trim(),
        targetGuestId: tgtGuest.value.trim(),
        scopes,
        lookupMap: lookupState.value
      }) : "";
      const preview = memoryState.lastPreview || null;
      const fresh = !!preview && !!signature && preview.signature === signature;
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
      let effective = [...selectedSet];
      let skippedSameScopes = [];
      let skippedErrorScopes = [];
      if (onlyChanged.checkbox.checked) {
        skippedSameScopes = effective.filter((key) => sameSet.has(key));
        skippedErrorScopes = effective.filter((key) => errorSet.has(key));
        effective = effective.filter((key) => changedSet.has(key));
      }
      if (excludePreviewErrors.checkbox.checked) {
        const additionallySkipped = effective.filter((key) => errorSet.has(key));
        skippedErrorScopes = [.../* @__PURE__ */ new Set([...skippedErrorScopes, ...additionallySkipped])];
        effective = effective.filter((key) => !errorSet.has(key));
      }
      return {
        effectiveScopes: effective,
        changedScopes: [...changedSet],
        sameScopes: [...sameSet],
        errorScopes: [...errorSet],
        skippedSameScopes,
        skippedErrorScopes
      };
    }
    function rerenderPreviewCard() {
      const previewResult = memoryState.lastPreview?.result || null;
      if (!previewResult) {
        previewCard.card.style.display = "none";
        [previewKeepShownBtn, previewAddShownBtn, previewRemoveShownBtn, previewRiskyBtn].forEach((btn) => {
          btn.disabled = true;
        });
        return;
      }
      const selectedScopes = collectSelectedScopes();
      const plan = getExecutionPlan(selectedScopes, previewResult);
      const filteredEntries = filterPreviewEntries(previewResult.entries, previewSearch.value.trim().toLowerCase());
      const filteredScopeKeys = uniqueSectionKeys(filteredEntries);
      const currentSelected = new Set(selectedScopes);
      previewKeepShownBtn.disabled = filteredScopeKeys.length === 0;
      previewAddShownBtn.disabled = filteredScopeKeys.every((key) => currentSelected.has(key));
      previewRemoveShownBtn.disabled = filteredScopeKeys.every((key) => !currentSelected.has(key));
      previewRiskyBtn.disabled = !previewResult.entries.some((entry) => RISKY_SCOPE_KEYS.has(entry.sectionKey));
      renderPreviewResult(previewBody, previewResult, {
        selectedScopes,
        plan,
        searchKeyword: previewSearch.value.trim().toLowerCase(),
        onSelectOnly: (sectionKey) => setSelectedScopes([sectionKey]),
        onAdd: (sectionKey) => setSelectedScopes([.../* @__PURE__ */ new Set([...collectSelectedScopes(), sectionKey])]),
        onRemove: (sectionKey) => setSelectedScopes(collectSelectedScopes().filter((key) => key !== sectionKey))
      });
      previewCard.card.style.display = "block";
    }
    async function runPreview(scopes, lookupMap) {
      const signature = buildPreviewSignature({
        sourceAppId: srcApp.value.trim(),
        sourceGuestId: srcGuest.value.trim(),
        sourcePreview: srcPreview.checkbox.checked,
        sourceBundleToken,
        targetAppId: tgtApp.value.trim(),
        targetGuestId: tgtGuest.value.trim(),
        scopes,
        lookupMap
      });
      const result = await previewReflectStandalone(
        {
          sourceAppId: srcApp.value.trim(),
          sourceGuestId: srcGuest.value.trim(),
          sourcePreview: srcPreview.checkbox.checked,
          sourceBundle: sourceBundleFromJson,
          targetAppId: tgtApp.value.trim(),
          targetGuestId: tgtGuest.value.trim(),
          scopes,
          lookupMap
        },
        (m) => panel.setStatus(m, "busy")
      );
      memoryState = {
        ...memoryState,
        lastPreview: {
          signature,
          at: Date.now(),
          result
        }
      };
      rerenderPreviewCard();
      refreshReviewCard();
      showWorkflowStage("review");
      return result;
    }
    function refreshReviewCard() {
      const { scopes, lookupState, preview, fresh } = getPreviewState();
      const lookupError = getLookupError(lookupState);
      const src = srcApp.value.trim();
      const tgt = tgtApp.value.trim();
      const sameConn = !sourceBundleFromJson && !!src && src === tgt && srcGuest.value.trim() === tgtGuest.value.trim();
      const riskyHit = scopes.filter((key) => RISKY_SCOPE_KEYS.has(key));
      const previewResult = preview?.result || null;
      const plan = fresh ? getExecutionPlan(scopes, previewResult) : getExecutionPlan(scopes, null);
      const canRunBase = (!!src || !!sourceBundleFromJson) && !!tgt && scopes.length > 0 && lookupState.ok;
      previewBtn.disabled = !canRunBase;
      changedOnlyBtn.disabled = !(fresh && previewResult && previewResult.changedSections > 0);
      runBtn.disabled = !canRunBase;
      if (fresh && previewResult) {
        if (plan.effectiveScopes.length > 0) {
          setButtonText(runBtn, `プレビュー反映を実行（予定 ${plan.effectiveScopes.length}）`);
        } else if (previewResult.changedSections > 0) {
          setButtonText(runBtn, `プレビュー反映を実行（差分 ${previewResult.changedSections}）`);
        } else {
          setButtonText(runBtn, "プレビュー反映を実行（差分なし）");
        }
      } else {
        setButtonText(runBtn, "プレビュー反映を実行");
      }
      const issues = [];
      if (!src && !sourceBundleFromJson) issues.push("比較元アプリIDまたは比較元JSONが未入力です。");
      if (!tgt) issues.push("比較先アプリIDが未入力です。");
      if (!scopes.length) issues.push("反映対象セクションが未選択です。");
      if (lookupError) issues.push(lookupError);
      if (sameConn) issues.push("比較元と比較先が同一接続です。");
      if (riskyHit.length) issues.push(`影響範囲の広いセクションを含みます: ${riskyHit.map((key) => getSectionLabel(key)).join(", ")}`);
      if (!backup.checkbox.checked) issues.push("バックアップ保存が OFF です。");
      if (!stop.checkbox.checked) issues.push("エラー時中断が OFF です。");
      if (!preview) {
        issues.push("差分プレビューが未取得です。");
      } else if (!fresh) {
        issues.push("入力変更後に差分プレビューが未更新です。実行時に自動更新されます。");
      } else if (previewResult) {
        if (previewResult.errorSections > 0) issues.push(`差分プレビューで取得失敗が ${previewResult.errorSections} 件あります。`);
        if (previewResult.changedSections === 0) issues.push("差分プレビューでは変更対象がありません。通常は反映不要です。");
        if (!plan.effectiveScopes.length) issues.push("現在の実行オプションでは、実行対象セクションが 0 件です。");
      }
      let nextTone = "warn";
      let nextTitle = "次の一手";
      let nextText = "比較元 / 比較先 / セクションを確認してください。";
      if (!src && !sourceBundleFromJson || !tgt) {
        nextText = "比較元（アプリIDまたはJSON）と比較先のアプリIDを埋めてください。比較先は通常、いま開いているアプリです。";
      } else if (!scopes.length) {
        nextText = "反映したいセクションを選んでください。迷う場合は「フォームのみ」から始めるのが安全です。";
      } else if (!lookupState.ok) {
        nextText = lookupError || "Lookup AppID マッピング JSON を修正してください。";
      } else if (!preview) {
        nextTone = "info";
        nextText = "差分プレビューを更新して、どのセクションに差分があるか確認してください。";
      } else if (!fresh) {
        nextTone = "info";
        nextText = "入力変更があります。差分プレビューを更新すると内容を確認できます。実行時も自動で最新化します。";
      } else if (!plan.effectiveScopes.length) {
        nextTone = "info";
        nextText = "現在のオプションでは実行対象がありません。差分ありだけ実行 / 取得失敗除外の設定か、選択セクションを見直してください。";
      } else if (previewResult && previewResult.errorSections > 0) {
        nextText = "取得失敗セクションを確認してから実行してください。必要なら対象セクションを絞って再プレビューします。";
      } else if (previewResult && previewResult.changedSections === 0) {
        nextTone = "info";
        nextText = "差分なしです。反映は通常不要です。必要ならセクション選択か比較元 / 比較先を見直してください。";
      } else {
        nextTone = "ok";
        nextText = "差分プレビューで内容を確認できています。そのままプレビュー反映へ進めます。";
      }
      const selectedLabels = scopes.map((key) => getSectionLabel(key));
      const selectedSummary = selectedLabels.length ? `${selectedLabels.slice(0, 4).join(" / ")}${selectedLabels.length > 4 ? ` ほか ${selectedLabels.length - 4} 件` : ""}` : "未選択";
      const effectiveSummary = plan.effectiveScopes.length ? `${plan.effectiveScopes.slice(0, 4).map((key) => getSectionLabel(key)).join(" / ")}${plan.effectiveScopes.length > 4 ? ` ほか ${plan.effectiveScopes.length - 4} 件` : ""}` : "なし";
      const previewMeta = previewResult ? `${fresh ? "最新" : "前回"}: 差分 ${previewResult.changedSections} / 一致 ${previewResult.sameSections} / 失敗 ${previewResult.errorSections}` : "まだ取得していません";
      const previewPills = [];
      if (previewResult) {
        previewPills.push(`<span class="kus-rl-pill kus-rl-pill--change">差分 ${previewResult.changedSections}</span>`);
        previewPills.push(`<span class="kus-rl-pill kus-rl-pill--same">一致 ${previewResult.sameSections}</span>`);
        if (previewResult.errorSections > 0) previewPills.push(`<span class="kus-rl-pill kus-rl-pill--error">失敗 ${previewResult.errorSections}</span>`);
        if (fresh) previewPills.push(`<span class="kus-rl-pill">実行予定 ${plan.effectiveScopes.length}</span>`);
        if (fresh && plan.skippedSameScopes.length > 0) previewPills.push(`<span class="kus-rl-pill">一致除外 ${plan.skippedSameScopes.length}</span>`);
        if (fresh && plan.skippedErrorScopes.length > 0) previewPills.push(`<span class="kus-rl-pill kus-rl-pill--error">失敗除外 ${plan.skippedErrorScopes.length}</span>`);
        if (!fresh) previewPills.push('<span class="kus-rl-pill kus-rl-pill--stale">古い結果</span>');
      } else {
        previewPills.push('<span class="kus-rl-pill kus-rl-pill--stale">未取得</span>');
      }
      reviewBody.innerHTML = `<div class="kus-rl-review-grid">  <div class="kus-rl-stat"><div class="kus-rl-stat__label">比較元</div><div class="kus-rl-stat__value">${escapeHtml(sourceBundleFromJson ? `設定JSON${src ? ` (App ${src})` : ""}` : formatConnection(src, srcGuest.value.trim(), srcPreview.checkbox.checked ? "preview" : "prod"))}</div><div class="kus-rl-stat__meta">取得元: ${sourceBundleFromJson ? "読み込み済みJSON" : srcPreview.checkbox.checked ? "プレビュー" : "本番"}</div></div>  <div class="kus-rl-stat"><div class="kus-rl-stat__label">比較先</div><div class="kus-rl-stat__value">${escapeHtml(formatConnection(tgt, tgtGuest.value.trim(), "preview"))}</div><div class="kus-rl-stat__meta">反映先は常に比較先プレビューです</div></div>  <div class="kus-rl-stat"><div class="kus-rl-stat__label">反映対象</div><div class="kus-rl-stat__value">${scopes.length ? `${scopes.length} セクション` : "未選択"}</div><div class="kus-rl-stat__meta">${escapeHtml(selectedSummary)}</div></div>  <div class="kus-rl-stat"><div class="kus-rl-stat__label">差分プレビュー</div><div class="kus-rl-stat__value">${preview ? escapeHtml(formatPreviewStamp(preview.at)) : "未取得"}</div><div class="kus-rl-stat__meta">${escapeHtml(previewMeta)}</div></div>  <div class="kus-rl-stat"><div class="kus-rl-stat__label">実行予定</div><div class="kus-rl-stat__value">${fresh ? `${plan.effectiveScopes.length} セクション` : "プレビュー後に確定"}</div><div class="kus-rl-stat__meta">${escapeHtml(fresh ? effectiveSummary : "差分プレビューと実行オプションから自動算出します")}</div></div>  <div class="kus-rl-stat"><div class="kus-rl-stat__label">自動除外</div><div class="kus-rl-stat__value">${fresh ? `${plan.skippedSameScopes.length + plan.skippedErrorScopes.length} 件` : "未計算"}</div><div class="kus-rl-stat__meta">${escapeHtml(fresh ? buildSkipSummary(plan) : "差分なし / 取得失敗セクションをここに表示します")}</div></div></div><div class="kus-rl-pills">${previewPills.join("")}</div><div class="kus-rl-next kus-rl-next--${nextTone}"><strong>${nextTitle}</strong>${escapeHtml(nextText)}</div>` + (issues.length ? `<ul class="kus-rl-issues">${issues.map((line) => `<li>${escapeHtml(line)}</li>`).join("")}</ul>` : '<div class="kus-rl-quiet">この条件では大きな注意点は見つかっていません。</div>');
      rerenderPreviewCard();
    }
    previewSearch.addEventListener("input", () => {
      rerenderPreviewCard();
    });
    previewKeepShownBtn.addEventListener("click", () => {
      const previewResult = memoryState.lastPreview?.result || null;
      if (!previewResult) {
        panel.setStatus("先に差分プレビューを取得してください", "warn");
        return;
      }
      const scopeKeys = uniqueSectionKeys(filterPreviewEntries(previewResult.entries, previewSearch.value.trim().toLowerCase()));
      setSelectedScopes(scopeKeys);
      panel.setStatus(`表示中の ${scopeKeys.length} セクションだけを選択しました`, scopeKeys.length ? "ok" : "info");
    });
    previewAddShownBtn.addEventListener("click", () => {
      const previewResult = memoryState.lastPreview?.result || null;
      if (!previewResult) {
        panel.setStatus("先に差分プレビューを取得してください", "warn");
        return;
      }
      const scopeKeys = uniqueSectionKeys(filterPreviewEntries(previewResult.entries, previewSearch.value.trim().toLowerCase()));
      setSelectedScopes([.../* @__PURE__ */ new Set([...collectSelectedScopes(), ...scopeKeys])]);
      panel.setStatus(`表示中の ${scopeKeys.length} セクションを追加しました`, scopeKeys.length ? "ok" : "info");
    });
    previewRemoveShownBtn.addEventListener("click", () => {
      const previewResult = memoryState.lastPreview?.result || null;
      if (!previewResult) {
        panel.setStatus("先に差分プレビューを取得してください", "warn");
        return;
      }
      const scopeKeys = new Set(uniqueSectionKeys(filterPreviewEntries(previewResult.entries, previewSearch.value.trim().toLowerCase())));
      setSelectedScopes(collectSelectedScopes().filter((key) => !scopeKeys.has(key)));
      panel.setStatus(`表示中の ${scopeKeys.size} セクションを選択から外しました`, scopeKeys.size ? "ok" : "info");
    });
    previewRiskyBtn.addEventListener("click", () => {
      const previewResult = memoryState.lastPreview?.result || null;
      if (!previewResult) {
        panel.setStatus("先に差分プレビューを取得してください", "warn");
        return;
      }
      const riskyScopes = uniqueSectionKeys(previewResult.entries.filter((entry) => RISKY_SCOPE_KEYS.has(entry.sectionKey)));
      setSelectedScopes(riskyScopes);
      panel.setStatus(`高リスク ${riskyScopes.length} セクションだけを選択しました`, riskyScopes.length ? "warn" : "info");
    });
    previewBtn.addEventListener("click", () => {
      const { scopes, lookupState } = getPreviewState();
      const lookupError = getLookupError(lookupState);
      const lookupMap = getLookupValue(lookupState);
      if (!scopes.length) {
        panel.setStatus("対象セクションを選択してください", "warn");
        return;
      }
      if (lookupError) {
        panel.setStatus(lookupError, "warn");
        return;
      }
      return liteRun(panel, "差分プレビューを取得中…", async () => {
        await runPreview(scopes, lookupMap);
      }, `差分プレビュー完了（${scopes.length}セクションを比較）`);
    });
    changedOnlyBtn.addEventListener("click", () => {
      const { preview, fresh } = getPreviewState();
      if (!fresh || !preview?.result) {
        panel.setStatus("先に最新の差分プレビューを取得してください", "warn");
        return;
      }
      const changedScopes = preview.result.entries.filter((entry) => entry.status === "change").map((entry) => entry.sectionKey);
      setSelectedScopes(changedScopes);
      panel.setStatus(`差分あり ${changedScopes.length} セクションだけを選択しました`, changedScopes.length ? "ok" : "info");
    });
    const runBtn = makeButton("プレビュー反映を実行", "run", { icon: "⤴" });
    runBtn.classList.add("kus-lp__btn--danger");
    runBtn.classList.remove("kus-lp__btn--run");
    runBtn.style.cssText = "";
    runBtn.classList.add("kus-lp__btn--danger");
    runBtn.style.width = "100%";
    runBtn.style.padding = "11px 16px";
    runBtn.style.fontSize = "13px";
    runBtn.style.fontWeight = "700";
    panel.body.insertBefore(runBtn, panel.status);
    const logCard = makeCard({ title: "実行ログ", soft: true });
    const logPre = document.createElement("pre");
    logPre.style.cssText = "margin:0;padding:8px 10px;font:11.5px/1.5 ui-monospace,monospace;background:#0f172a;color:#e2e8f0;border-radius:8px;max-height:240px;overflow:auto;white-space:pre-wrap;display:none";
    logCard.body.appendChild(logPre);
    logCard.card.style.display = "none";
    panel.body.insertBefore(logCard.card, panel.status);
    const lastResultCard = makeCard({ title: "直近の実行結果", soft: true });
    const lastResultBody = document.createElement("div");
    lastResultBody.className = "kus-lp__small";
    lastResultCard.body.appendChild(lastResultBody);
    const lastResultActions = document.createElement("div");
    lastResultActions.className = "kus-lp__btn-row";
    lastResultActions.style.marginTop = "8px";
    const retryFailedBtn = makeButton("失敗・未実行だけ選択", "sub");
    retryFailedBtn.title = "失敗または中断で未実行のセクションだけを反映対象に選び直します";
    const openTargetBtn = makeButton("比較先の設定画面を開く", "sub");
    openTargetBtn.title = "比較先アプリの設定画面を新しいタブで開きます（運用環境への反映はそこから実行できます）";
    lastResultActions.appendChild(retryFailedBtn);
    lastResultActions.appendChild(openTargetBtn);
    lastResultCard.body.appendChild(lastResultActions);
    lastResultCard.card.style.display = "none";
    panel.body.insertBefore(lastResultCard.card, panel.status);
    retryFailedBtn.addEventListener("click", () => {
      const retryScopes = memoryState.lastResult?.retryScopes || [];
      if (!retryScopes.length) return;
      setSelectedScopes(retryScopes);
      showWorkflowStage("setup");
      panel.setStatus(`失敗・未実行の ${retryScopes.length} セクションを選択しました。差分プレビューで確認してから再実行してください。`, "info");
      cardScope.card.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    openTargetBtn.addEventListener("click", () => {
      const last = memoryState.lastResult;
      if (!last?.appId) return;
      const base = last.guestId ? `/k/guest/${encodeURIComponent(last.guestId)}` : "/k";
      const url = `${window.location.origin}${base}/admin/app/flow?app=${encodeURIComponent(last.appId)}`;
      window.open(url, "_blank", "noopener");
      panel.setStatus(`比較先アプリ #${last.appId} の設定画面を開きました`, "info");
    });
    function renderLastResult() {
      const last = memoryState.lastResult;
      if (!last) {
        lastResultCard.card.style.display = "none";
        return;
      }
      const stamp = new Date(last.at).toLocaleString();
      const hasIssue = last.ng > 0 || last.pending > 0;
      const tone = hasIssue ? "color:#9a3412" : "color:#065f46";
      const failedSummary = last.failedLabels.length ? `<div>失敗: ${escapeHtml(last.failedLabels.slice(0, 5).join(" / "))}${last.failedLabels.length > 5 ? ` ほか ${last.failedLabels.length - 5} 件` : ""}</div>` : "";
      lastResultBody.innerHTML = `<div style="${tone};font-weight:600">${hasIssue ? "⚠ 一部エラー" : "✓ 全成功"}</div><div>比較先 #${escapeHtml(last.appId || "-")} / OK ${last.ok} / NG ${last.ng}${last.pending ? ` / 未実行 ${last.pending}` : ""}</div>` + failedSummary + `<div>${stamp}</div>` + (hasIssue ? '<div style="margin-top:4px">「失敗・未実行だけ選択」で対象を絞って再実行できます。</div>' : '<div style="margin-top:4px">反映先はプレビューです。運用環境への反映（デプロイ）は比較先の設定画面から実行してください。</div>');
      retryFailedBtn.style.display = last.retryScopes.length ? "" : "none";
      openTargetBtn.style.display = last.appId ? "" : "none";
      lastResultCard.card.style.display = "block";
    }
    renderLastResult();
    runBtn.addEventListener("click", async () => {
      const { scopes, lookupState } = getPreviewState();
      const lookupError = getLookupError(lookupState);
      const lookupMap = getLookupValue(lookupState);
      if (!scopes.length) {
        panel.setStatus("反映するセクションを選択してください", "warn");
        return;
      }
      if (lookupError) {
        panel.setStatus(lookupError, "warn");
        return;
      }
      saveState();
      logCard.card.style.display = "block";
      logPre.style.display = "block";
      logPre.textContent = "";
      const outcome = await liteRun(panel, "プレビュー反映 実行中…", async () => {
        let previewState = getPreviewState(scopes, lookupState);
        let previewResult = previewState.fresh ? previewState.preview?.result || null : null;
        if (!previewResult) {
          previewResult = await runPreview(scopes, lookupMap);
          previewState = getPreviewState(scopes, lookupState);
        }
        const plan = getExecutionPlan(scopes, previewResult);
        if (!plan.effectiveScopes.length) {
          if (!previewResult.changedSections) {
            throw new Error("差分プレビューでは変更対象がありません。反映は実行しません。");
          }
          throw new Error(`現在の実行オプションでは実行対象が 0 件です。${buildSkipSummary(plan)}`);
        }
        if (!confirmReflectRisk(panel, {
          sourceAppId: srcApp.value.trim(),
          sourceGuestId: srcGuest.value.trim(),
          hasSourceBundle: !!sourceBundleFromJson,
          targetAppId: tgtApp.value.trim(),
          targetGuestId: tgtGuest.value.trim(),
          scopes,
          effectiveScopes: plan.effectiveScopes,
          skippedSameScopes: plan.skippedSameScopes,
          skippedErrorScopes: plan.skippedErrorScopes,
          doBackup: backup.checkbox.checked,
          stopOnError: stop.checkbox.checked,
          lookupMapText: lookupTa.value,
          preview: previewState.preview?.result || previewResult || void 0
        })) {
          return { cancelled: true };
        }
        if (Object.keys(lookupMap).length) {
          panel.setStatus("Lookup マッピング先 AppID を確認中…", "busy");
          const pf = await preflightLookupMapStandalone(lookupMap, { targetGuestId: tgtGuest.value.trim() });
          if (!pf.ok) {
            const detail = pf.missing.map((m) => ` - ${m.from} → ${m.to || "(空)"}: ${m.reason}`).join("\n");
            const cont = window.confirm(`Lookup 変換ルールに問題があります:
${detail}

[OK] 続行 / [キャンセル] 中断`);
            if (!cont) throw new Error("Lookup プリフライトで中断しました");
          }
        }
        const applyOutcome = await runApplyPreviewStandalone(
          {
            sourceAppId: srcApp.value.trim(),
            sourceGuestId: srcGuest.value.trim(),
            sourcePreview: srcPreview.checkbox.checked,
            sourceBundle: sourceBundleFromJson,
            targetAppId: tgtApp.value.trim(),
            targetGuestId: tgtGuest.value.trim(),
            scopes: plan.effectiveScopes,
            lookupMap,
            doDeploy: false,
            doBackup: backup.checkbox.checked,
            stopOnError: stop.checkbox.checked
          },
          (m, e) => panel.setStatus(m, e ? "err" : "busy"),
          (logsArr) => {
            logPre.textContent = logsArr.join("\n");
            logPre.scrollTop = logPre.scrollHeight;
          }
        );
        const counts = summarizeApplyOutcome(applyOutcome.sections);
        memoryState.lastResult = {
          ok: counts.ok,
          ng: counts.ng,
          pending: counts.pending,
          at: Date.now(),
          appId: tgtApp.value.trim(),
          guestId: tgtGuest.value.trim(),
          retryScopes: collectRetrySectionKeys(applyOutcome.sections),
          failedLabels: applyOutcome.sections.filter((s) => s.status === "ng").map((s) => s.label)
        };
        renderLastResult();
        showWorkflowStage("result");
        return { cancelled: false, hadError: counts.ng > 0 || counts.pending > 0 };
      });
      if (!outcome) return;
      if (outcome.cancelled) {
        panel.setStatus("反映実行をキャンセルしました", "info");
        return;
      }
      if (outcome.hadError) {
        panel.setStatus("プレビュー反映が一部失敗しました。「直近の実行結果」から失敗・未実行だけ選択して再実行できます。", "warn");
        return;
      }
      panel.setStatus("プレビュー反映が完了しました。運用環境への反映は「比較先の設定画面を開く」からデプロイしてください。", "ok");
    });
    const nav = document.createElement("nav");
    nav.className = "kus-rl-nav";
    nav.setAttribute("aria-label", "プレビュー反映の手順");
    nav.setAttribute("role", "tablist");
    const stageDefs = [
      { id: "setup", number: "1", label: "対象と設定" },
      { id: "review", number: "2", label: "差分を確認" },
      { id: "result", number: "3", label: "実行結果" }
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
      button.innerHTML = `<span class="kus-rl-nav__num">${def.number}</span><span>${def.label}</span>`;
      nav.appendChild(button);
      navButtons[def.id] = button;
      const stage = document.createElement("section");
      stage.className = "kus-rl-stage";
      stage.id = `kus-rl-stage-${def.id}`;
      stage.dataset.stage = def.id;
      stage.setAttribute("role", "tabpanel");
      stage.setAttribute("aria-labelledby", button.id);
      stages[def.id] = stage;
      button.addEventListener("click", () => showWorkflowStage(def.id));
      button.addEventListener("keydown", (event) => {
        if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
        event.preventDefault();
        const current = stageDefs.findIndex((item) => item.id === def.id);
        const direction = event.key === "ArrowRight" ? 1 : -1;
        const next = stageDefs[(current + direction + stageDefs.length) % stageDefs.length];
        showWorkflowStage(next.id);
      });
    }
    stages.setup.innerHTML = '<header class="kus-rl-stage-head"><h2>反映条件を決める</h2><p>接続先、セクション、安全オプションを設定します。</p></header>';
    stages.review.innerHTML = '<header class="kus-rl-stage-head"><h2>差分と実行予定を確認</h2><p>実際に変更されるセクションと注意点を確認します。</p></header>';
    stages.result.innerHTML = '<header class="kus-rl-stage-head"><h2>実行結果と次の操作</h2><p>成功・失敗と、再実行が必要なセクションを確認します。</p></header>';
    [cardApp.card, cardScope.card, cardOpt.card, cardPreset.card].forEach((node) => stages.setup.appendChild(node));
    [reviewCard.card, previewCard.card].forEach((node) => stages.review.appendChild(node));
    [lastResultCard.card, logCard.card].forEach((node) => stages.result.appendChild(node));
    const dock = document.createElement("div");
    dock.className = "kus-rl-action-dock";
    dock.appendChild(runBtn);
    dock.appendChild(panel.status);
    dock.appendChild(panel.result);
    const hint = panel.body.querySelector(".kus-lp__hint");
    hint?.insertAdjacentElement("afterend", nav);
    stageDefs.forEach((def) => panel.body.appendChild(stages[def.id]));
    panel.body.appendChild(dock);
    showWorkflowStage = (active) => {
      stageDefs.forEach((def) => {
        const selected = def.id === active;
        stages[def.id].hidden = !selected;
        navButtons[def.id].setAttribute("aria-selected", String(selected));
        navButtons[def.id].tabIndex = selected ? 0 : -1;
      });
      navButtons[active].focus({ preventScroll: true });
      panel.body.scrollTo({ top: 0, behavior: "smooth" });
    };
    showWorkflowStage(memoryState.lastResult ? "result" : memoryState.lastPreview ? "review" : "setup");
    refreshSameConnBanner();
    refreshReviewCard();
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
  function getSectionLabel(key) {
    return SECTION_DEFS.find((def) => def.key === key)?.label || key;
  }
  function formatConnection(appId, guestId, envLabel) {
    const base = appId ? `#${appId}` : "(未入力)";
    const guest = guestId ? ` / guest:${guestId}` : "";
    return `${base}${guest} / ${envLabel}`;
  }
  function formatPreviewStamp(at) {
    const diffSec = Math.max(0, Math.floor((Date.now() - at) / 1e3));
    if (diffSec < 60) return `たった今 (${new Date(at).toLocaleTimeString()})`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}分前 (${new Date(at).toLocaleTimeString()})`;
    return new Date(at).toLocaleString();
  }
  function buildSkipSummary(plan) {
    const parts = [];
    if (plan.skippedSameScopes.length > 0) parts.push(`一致除外 ${plan.skippedSameScopes.length}件`);
    if (plan.skippedErrorScopes.length > 0) parts.push(`失敗除外 ${plan.skippedErrorScopes.length}件`);
    return parts.length ? parts.join(" / ") : "除外なし";
  }
  function setButtonText(button, text) {
    const spans = button.querySelectorAll("span");
    const label = spans[spans.length - 1];
    if (label) label.textContent = text;
    else button.textContent = text;
  }
  function tryParseLookupMap(text) {
    const t = text.trim();
    if (!t) return { ok: true, value: {} };
    try {
      const parsed = JSON.parse(t);
      const out = {};
      for (const [k, v] of Object.entries(parsed || {})) {
        if (k && v != null) out[String(k).trim()] = String(v).trim();
      }
      return { ok: true, value: out };
    } catch {
      return { ok: false, error: "Lookup マッピング JSON が壊れています。JSON 形式を修正してください。" };
    }
  }
  function getLookupError(result) {
    return "error" in result ? result.error : "";
  }
  function getLookupValue(result) {
    return "value" in result ? result.value : {};
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
      lookupPairs
    });
  }
  function filterPreviewEntries(entries, keyword) {
    if (!keyword) return entries;
    return entries.filter((entry) => {
      const hay = [entry.label, entry.message, entry.sectionKey].filter(Boolean).join("\n").toLowerCase();
      return hay.includes(keyword);
    });
  }
  function uniqueSectionKeys(entries) {
    return [...new Set(entries.map((entry) => entry.sectionKey).filter(Boolean))];
  }
  function renderPreviewResult(host, result, opts = {}) {
    host.innerHTML = "";
    const filteredEntries = filterPreviewEntries(result.entries, String(opts.searchKeyword || "").trim().toLowerCase());
    const selectedSet = new Set(opts.selectedScopes || []);
    const plan = opts.plan || null;
    const effectiveSet = new Set(plan?.effectiveScopes || []);
    const skippedSameSet = new Set(plan?.skippedSameScopes || []);
    const skippedErrorSet = new Set(plan?.skippedErrorScopes || []);
    const summary = document.createElement("div");
    summary.className = "kus-rl-preview-summary";
    summary.innerHTML = `<span class="kus-rl-pill kus-rl-pill--change">差分 ${result.changedSections}</span><span class="kus-rl-pill kus-rl-pill--same">一致 ${result.sameSections}</span>` + (result.errorSections > 0 ? `<span class="kus-rl-pill kus-rl-pill--error">取得失敗 ${result.errorSections}</span>` : "") + `<span class="kus-rl-pill">${result.totalSections} セクション</span>` + (opts.searchKeyword ? `<span class="kus-rl-pill kus-rl-pill--stale">検索一致 ${filteredEntries.length}</span>` : "");
    host.appendChild(summary);
    if (!result.entries.length) {
      const empty = document.createElement("div");
      empty.className = "kus-rl-preview-empty";
      empty.textContent = "対象セクションがありません";
      host.appendChild(empty);
      return;
    }
    if (!filteredEntries.length) {
      const empty = document.createElement("div");
      empty.className = "kus-rl-preview-empty";
      empty.textContent = `検索条件に一致するセクションがありません${opts.searchKeyword ? `: ${opts.searchKeyword}` : ""}`;
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
    for (const group of groups) {
      if (!group.entries.length) continue;
      const wrap = document.createElement("section");
      wrap.className = "kus-rl-preview-group";
      wrap.innerHTML = `<div class="kus-rl-preview-group__head"><span>${escapeHtml(group.title)}</span><span>${group.entries.length} 件</span></div>`;
      const list = document.createElement("div");
      list.className = "kus-rl-preview-list";
      for (const entry of group.entries) {
        const row = document.createElement("div");
        row.className = `kus-rl-preview-row kus-rl-preview-row--${group.tone}`;
        const statusLabel = group.tone === "change" ? "差分あり" : group.tone === "same" ? "一致" : "取得失敗";
        const metaPills = [];
        const statePills = [];
        if (entry.fieldStats) {
          metaPills.push(`<span class="kus-rl-preview-mini">追加 ${entry.fieldStats.add}</span>`);
          metaPills.push(`<span class="kus-rl-preview-mini">更新 ${entry.fieldStats.update}</span>`);
          metaPills.push(`<span class="kus-rl-preview-mini">比較先のみ ${entry.fieldStats.tgtOnly}</span>`);
        }
        if (selectedSet.has(entry.sectionKey)) statePills.push('<span class="kus-rl-preview-mini">選択中</span>');
        else statePills.push('<span class="kus-rl-preview-mini">未選択</span>');
        if (effectiveSet.has(entry.sectionKey)) statePills.push('<span class="kus-rl-preview-mini">実行予定</span>');
        if (skippedSameSet.has(entry.sectionKey)) statePills.push('<span class="kus-rl-preview-mini">一致のため除外</span>');
        if (skippedErrorSet.has(entry.sectionKey)) statePills.push('<span class="kus-rl-preview-mini">取得失敗のため除外</span>');
        if (RISKY_SCOPE_KEYS.has(entry.sectionKey)) statePills.push('<span class="kus-rl-preview-mini">高リスク</span>');
        row.innerHTML = `<div class="kus-rl-preview-row__head">  <div class="kus-rl-preview-row__title">${escapeHtml(entry.label)}</div>  <span class="kus-rl-pill kus-rl-pill--${group.tone}">${statusLabel}</span></div><div class="kus-rl-preview-row__detail">${escapeHtml(entry.message)}</div>` + (statePills.length ? `<div class="kus-rl-preview-row__state">${statePills.join("")}</div>` : "") + (metaPills.length ? `<div class="kus-rl-preview-row__meta">${metaPills.join("")}</div>` : "");
        if (opts.onSelectOnly || opts.onAdd || opts.onRemove) {
          const actions = document.createElement("div");
          actions.className = "kus-rl-preview-row__actions";
          if (opts.onSelectOnly) {
            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = "kus-lp__btn kus-lp__btn--sub";
            btn.textContent = "このセクションだけ";
            btn.addEventListener("click", () => opts.onSelectOnly?.(entry.sectionKey));
            actions.appendChild(btn);
          }
          if (opts.onAdd) {
            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = "kus-lp__btn kus-lp__btn--sub";
            btn.textContent = "追加";
            btn.disabled = selectedSet.has(entry.sectionKey);
            btn.addEventListener("click", () => opts.onAdd?.(entry.sectionKey));
            actions.appendChild(btn);
          }
          if (opts.onRemove) {
            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = "kus-lp__btn kus-lp__btn--ghost";
            btn.textContent = "除外";
            btn.disabled = !selectedSet.has(entry.sectionKey);
            btn.addEventListener("click", () => opts.onRemove?.(entry.sectionKey));
            actions.appendChild(btn);
          }
          row.appendChild(actions);
        }
        list.appendChild(row);
      }
      wrap.appendChild(list);
      host.appendChild(wrap);
    }
  }
  function confirmReflectRisk(panel, ctx) {
    if (!ctx.sourceAppId && !ctx.hasSourceBundle) {
      panel.setStatus("比較元アプリIDを入力するか、比較元JSONを読み込んでください", "warn");
      return false;
    }
    if (!ctx.targetAppId) {
      panel.setStatus("比較先アプリIDを入力してください", "warn");
      return false;
    }
    const issues = [];
    const sameConn = !ctx.hasSourceBundle && ctx.sourceAppId === ctx.targetAppId && ctx.sourceGuestId === ctx.targetGuestId;
    if (sameConn) {
      issues.push("比較元と比較先が同一接続です（同じアプリID・ゲストID）");
    }
    if (ctx.scopes.length >= 10) {
      issues.push(`対象セクション数が多いです（${ctx.scopes.length}件）`);
    }
    if (ctx.effectiveScopes.length >= 10) {
      issues.push(`実行予定セクション数が多いです（${ctx.effectiveScopes.length}件）`);
    }
    const riskyHit = ctx.scopes.filter((s) => RISKY_SCOPE_KEYS.has(s));
    if (riskyHit.length) {
      const labels = riskyHit.map((s) => getSectionLabel(s)).join(", ");
      issues.push(`影響範囲の広いセクションを含みます: ${labels}`);
    }
    if (!ctx.doBackup) {
      issues.push("「バックアップを保存」が OFF です（ロールバック用ファイルが残りません）");
    }
    if (!ctx.stopOnError) {
      issues.push("「エラー時に中断」が OFF です（失敗後も残りの反映を続行します）");
    }
    if (ctx.preview) {
      if (ctx.preview.errorSections > 0) {
        issues.push(`差分プレビューで取得失敗が ${ctx.preview.errorSections} 件あります`);
      }
      if (ctx.preview.changedSections === 0) {
        issues.push("差分プレビューでは変更対象がありません");
      }
    }
    if (ctx.skippedSameScopes.length > 0) {
      issues.push(`一致セクション ${ctx.skippedSameScopes.length} 件は自動で除外されます`);
    }
    if (ctx.skippedErrorScopes.length > 0) {
      issues.push(`取得失敗セクション ${ctx.skippedErrorScopes.length} 件は自動で除外されます`);
    }
    if (!ctx.effectiveScopes.length) {
      issues.push("実行予定セクションが 0 件です");
    }
    const scopeLabels = ctx.scopes.map((s) => getSectionLabel(s)).join(", ");
    const effectiveLabels = ctx.effectiveScopes.map((s) => getSectionLabel(s)).join(", ");
    const changedLabels = ctx.preview ? ctx.preview.entries.filter((entry) => entry.status === "change").map((entry) => entry.label) : [];
    const changedPreview = changedLabels.length ? `${changedLabels.slice(0, 6).join(", ")}${changedLabels.length > 6 ? ` ほか ${changedLabels.length - 6} 件` : ""}` : "なし";
    const highRiskReasons = [];
    if (sameConn) highRiskReasons.push("比較元と比較先が同一接続");
    if (riskyHit.length > 0) highRiskReasons.push(`影響範囲の広いセクションを含む（${riskyHit.map((s) => getSectionLabel(s)).join(", ")}）`);
    if (!ctx.doBackup) highRiskReasons.push("バックアップ保存が OFF");
    if (!ctx.stopOnError) highRiskReasons.push("エラー時中断が OFF");
    if ((ctx.preview?.errorSections || 0) > 0) highRiskReasons.push(`差分プレビューに取得失敗が ${ctx.preview?.errorSections} 件`);
    if (ctx.effectiveScopes.length >= 10) highRiskReasons.push(`実行予定セクションが ${ctx.effectiveScopes.length} 件と多い`);
    const highRisk = highRiskReasons.length > 0;
    const lines = [
      "【最終確認: プレビュー反映】",
      ctx.hasSourceBundle ? `比較元: 設定JSON${ctx.sourceAppId ? ` (App ${ctx.sourceAppId})` : ""}` : `比較元: #${ctx.sourceAppId}${ctx.sourceGuestId ? ` (guest:${ctx.sourceGuestId})` : ""}`,
      `比較先: #${ctx.targetAppId}${ctx.targetGuestId ? ` (guest:${ctx.targetGuestId})` : ""} ※プレビュー`,
      `対象セクション (${ctx.scopes.length}): ${scopeLabels}`,
      `実行予定セクション (${ctx.effectiveScopes.length}): ${effectiveLabels || "なし"}`,
      `オプション: バックアップ=${ctx.doBackup ? "ON" : "OFF"} / エラー時中断=${ctx.stopOnError ? "ON" : "OFF"}${ctx.lookupMapText.trim() ? " / Lookup変換あり" : ""}`,
      ctx.preview ? `差分プレビュー: 差分 ${ctx.preview.changedSections} / 一致 ${ctx.preview.sameSections} / 取得失敗 ${ctx.preview.errorSections}` : "差分プレビュー: 未確認",
      ctx.preview ? `差分ありセクション: ${changedPreview}` : "",
      "",
      issues.length ? `注意点:
  - ${issues.join("\n  - ")}` : "注意点: なし"
    ].filter(Boolean);
    if (!window.confirm(lines.join("\n") + "\n\n本当に実行しますか？")) return false;
    if (highRisk) {
      const typed = window.prompt(
        `高リスク実行のため追加確認します。
理由:
  - ${highRiskReasons.join("\n  - ")}

確認のため比較先アプリID「${ctx.targetAppId}」を入力してください。`,
        ""
      );
      if (typed === null) {
        panel.setStatus("反映実行をキャンセルしました", "info");
        return false;
      }
      if (typed.trim() !== ctx.targetAppId) {
        panel.setStatus("確認入力が一致しないため、中断しました", "warn");
        return false;
      }
    }
    return true;
  }

  // src/entries/reflect-lite-entry.ts
  runOnKintonePage(mountReflectLitePanel);
})();
