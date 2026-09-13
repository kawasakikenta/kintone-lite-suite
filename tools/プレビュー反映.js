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
  function ensureBundleShape(bundle, rawSettings = false) {
    if (!bundle || typeof bundle !== "object") throw new Error("バンドル形式が不正です");
    if (!bundle.sections || typeof bundle.sections !== "object") throw new Error("sections がありません");
    return {
      appId: String(bundle.appId || ""),
      guestId: String(bundle.guestId || ""),
      preview: !!bundle.preview,
      fetchedAt: bundle.fetchedAt || (/* @__PURE__ */ new Date()).toISOString(),
      meta: sanitizeBundleMeta(bundle.meta),
      sections: rawSettings ? deepClone(bundle.sections) : normalize(bundle.sections)
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
        results[index] = { value: rawSettings ? deepClone(res) : normalize(res), revision };
      } catch (e) {
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
          setAuxiliaryFetchError(plug, "プラグイン設定", 0, e);
        }
      }
    }
    return bundle;
  }
  var DEPLOY_PATH_SNIPPET, ERR_NO_PROD_WRITE, ERR_NO_DEPLOY_API, ERR_NO_RECORD_PREVIEW_API, DEFAULT_API_GET_RETRIES, DEFAULT_RETRY_BASE_DELAY_MS, DEFAULT_RETRY_MAX_DELAY_MS, RETRIABLE_STATUS_CODES, RECORD_DATA_MUTATION_PATHS, RECORD_CURSOR_PATH, apiGetMetrics, REVISION_CONFLICT_CODES, CUSTOMIZE_BODY_MAX_BYTES, CUSTOMIZE_BODY_FETCH_CONCURRENCY, TEXT_LIKE_EXT, BUNDLE_FETCH_CONCURRENCY;
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
      BUNDLE_FETCH_CONCURRENCY = 3;
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

  // src/reflect/standalonePreflight.ts
  init_constants();
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
  function captureSections(bundle, scopes) {
    return Object.fromEntries(scopes.map((key) => {
      const section = bundle?.sections?.[key];
      return [key, {
        content: stableReflectStringify(section) ?? "",
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
    const labels2 = incomplete.map((key) => SECTION_DEFS.find((def) => def.key === key)?.label || key);
    throw new Error(`バックアップを完全に取得できなかったため反映を中止しました。対象: ${labels2.join("、")}。差分を取得し直してから再実行してください。`);
  }
  function assertReflectBaselineMatches(baseline, opts, source, target) {
    if (!baseline || baseline.connection !== connectionKey(opts)) {
      throw new Error("確認済みの差分と反映条件が一致しません。差分を取得し直してから再実行してください。");
    }
    const current = captureReflectBaseline({ ...opts, scopes: [.../* @__PURE__ */ new Set([...opts.scopes, ...opts.targetDependencies || []])] }, source, target);
    for (const side of ["source", "target"]) {
      const label = side === "source" ? "比較元" : "比較先プレビュー";
      const revisions = /* @__PURE__ */ new Set();
      const requireRevision = side === "target" || !opts.sourceBundle;
      const checkedScopes = side === "source" ? opts.scopes : [.../* @__PURE__ */ new Set([...opts.scopes, ...opts.targetDependencies || []])];
      for (const key of checkedScopes) {
        const before = baseline[side]?.[key];
        const after = current[side][key];
        const sectionLabel = SECTION_DEFS.find((def) => def.key === key)?.label || key;
        if (!before?.complete || !after.complete) {
          throw new Error(`${label}の${sectionLabel}を完全に確認できないため反映を中止しました。差分を取得し直してください。`);
        }
        if (requireRevision && (!/^\d+$/.test(before.revision) || !/^\d+$/.test(after.revision))) {
          throw new Error(`${label}の${sectionLabel}のrevisionを確認できないため反映を中止しました。差分を取得し直してください。`);
        }
        if (before.content !== after.content || before.revision !== after.revision) {
          throw new Error(`差分確認後に${label}の${sectionLabel}が変更されたため反映を中止しました。差分を取得し直して、変更内容を再確認してください。`);
        }
        if (requireRevision) revisions.add(after.revision);
      }
      if (requireRevision && revisions.size !== 1) {
        throw new Error(`${label}の取得中に設定が更新された可能性があるため反映を中止しました。差分を取得し直してください。`);
      }
    }
    return current.target[opts.scopes[0]].revision;
  }

  // src/reflect/standalonePlan.ts
  init_constants();
  init_utils();
  var namedSections = { viewSettings: "views", reportSettings: "reports", actionSettings: "actions" };
  var own = (object2, key) => Object.prototype.hasOwnProperty.call(object2, key);
  var object = (value) => !!value && typeof value === "object" && !Array.isArray(value);
  var equal = (a, b) => stableReflectStringify(a) === stableReflectStringify(b);
  var valueText = (value) => value === void 0 ? "（なし）" : typeof value === "string" ? value : JSON.stringify(value);
  var labels = { properties: "フィールド", layout: "配置", views: "一覧", reports: "グラフ", actions: "アクション", rights: "アクセス権", notifications: "通知", categories: "カテゴリー", label: "表示名", required: "必須", unique: "重複禁止", options: "選択肢", defaultValue: "初期値", type: "種類", index: "表示順", filterCond: "絞り込み", sort: "並び順", enable: "有効", states: "状態", scope: "適用範囲", fields: "フィールド", desktop: "PC", mobile: "モバイル" };
  function diffValues(before, after, path, output) {
    if (equal(before, after)) return;
    if (object(before) && object(after)) {
      for (const key of /* @__PURE__ */ new Set([...Object.keys(before), ...Object.keys(after)])) diffValues(own(before, key) ? before[key] : void 0, own(after, key) ? after[key] : void 0, [...path, own(labels, key) ? labels[key] : key], output);
    } else if (Array.isArray(before) && Array.isArray(after)) {
      const remaining = [...after];
      for (const [index, value] of before.entries()) {
        const found = remaining.findIndex((item) => equal(item, value));
        if (found >= 0) remaining.splice(found, 1);
        else output.push({ kind: "削除", path: [...path, `${index + 1}件目`].join(" / "), before: valueText(value), after: "（なし）" });
      }
      for (const value of remaining) output.push({ kind: "追加", path: path.join(" / "), before: "（なし）", after: valueText(value) });
      if (!remaining.length && before.length === after.length && before.every((value) => after.some((item) => equal(item, value)))) {
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
      const current = own(target, code) ? target[code] : void 0;
      if (current && current.type !== def.type) {
        plan.blockers.push(`${[...path, code].join(" / ")}: 種類が異なります（${current.type} → ${def.type}）。既存項目の種類はこの反映では変更できません。`);
        continue;
      }
      const next = { code, ...deepClone(current || {}), ...deepClone(def) };
      if (!current && next.label === void 0) next.label = code;
      if (next.code && next.code !== code) plan.blockers.push(`${code}: フィールドコードの変更を含みます。フィールド追加ツールで確認してください。`);
      if (next.lookup?.relatedApp?.app && lookupMap[String(next.lookup.relatedApp.app)]) {
        next.lookup.relatedApp.app = lookupMap[String(next.lookup.relatedApp.app)];
        delete next.lookup.relatedApp.code;
      }
      if (def.type === "SUBTABLE") {
        if (!object(def.fields)) throw new Error(`${code}: テーブル内のフィールド定義がありません。`);
        next.fields = mergeFields(def.fields, current?.fields || {}, lookupMap, [...path, code], plan);
      }
      after[code] = next;
    }
    for (const [code, def] of Object.entries(target)) if (!own(source, code) && !SYSTEM_FIELD_TYPES.has(def?.type)) {
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
    return [.../* @__PURE__ */ new Set([...scopes, ...scopes.some((key) => ["layoutSettings", "viewSettings"].includes(key)) ? ["fieldSettings"] : []])];
  }
  function reflectSelectionBlockers(entries, scopes, sourceFields, targetFields) {
    const selected = entries.filter((entry) => scopes.includes(entry.sectionKey));
    const available = /* @__PURE__ */ new Set([...targetFields, ...scopes.includes("fieldSettings") && !selected.find((entry) => entry.sectionKey === "fieldSettings")?.blockers.length ? sourceFields : []]);
    const issues = selected.flatMap((entry) => entry.blockers.map((message) => `${entry.label}: ${message}`));
    for (const entry of selected) for (const code of entry.requiredFields || []) if (!available.has(code)) issues.push(`${entry.label}: 参照するフィールド「${code}」が反映先にありません。フィールド設定も反映対象に含めるか、この項目を除外してください。`);
    return [...new Set(issues)];
  }
  function buildReflectSectionPlan(key, source, target, options = {}) {
    const def = SECTION_DEFS.find((item) => item.key === key);
    const plan = { sectionKey: key, label: def?.label || key, status: "same", message: "", behavior: "全置換", changes: [], changeCount: 0, removalCount: 0, warnings: [], blockers: [], operations: [] };
    const fail = (side, section) => {
      plan.status = side === "src" ? "src-missing" : "tgt-missing";
      plan.message = `${side === "src" ? "反映元" : "反映先"}を完全に取得できません: ${section?._fetchError || section?._partial?.message || "設定がありません"}`;
      plan.blockers.push(plan.message);
      return plan;
    };
    if (!isCompleteReflectSection(source)) return fail("src", source);
    if (!isCompleteReflectSection(target)) return fail("tgt", target);
    if (!def?.put || !def.putBuilder) {
      plan.status = "error";
      plan.blockers.push("この項目は反映に対応していません。");
      return plan;
    }
    try {
      let before, after;
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
          if (!own(sourceProps, code) || SYSTEM_FIELD_TYPES.has(value?.type)) continue;
          if (!own(targetProps, code)) adds[code] = value;
          else if (value.type === "SUBTABLE") {
            const current = targetProps[code], addedFields = Object.fromEntries(Object.entries(value.fields).filter(([child]) => !own(current.fields || {}, child)));
            if (Object.keys(addedFields).length) adds[code] = { type: "SUBTABLE", code, fields: addedFields };
            const updatedFields = Object.fromEntries(Object.entries(value.fields).filter(([child, childDef]) => own(current.fields || {}, child) && !equal(childDef, current.fields[child])));
            const { fields: _nextFields, ...nextTable } = value, { fields: _currentFields, ...currentTable } = current;
            if (Object.keys(updatedFields).length || !equal(nextTable, currentTable)) updates[code] = { ...nextTable, fields: updatedFields };
          } else if (!equal(value, targetProps[code])) updates[code] = value;
        }
        const fieldCounts = { add: Object.keys(adds).length, update: Object.keys(updates).length, tgtOnly: Object.keys(targetProps).filter((code) => !own(sourceProps, code) && !SYSTEM_FIELD_TYPES.has(targetProps[code]?.type)).length };
        plan.fieldStats = fieldCounts;
        if (fieldCounts.add) plan.operations.push({ method: "POST", endpoint: def.endpoint, body: { properties: adds }, label: "フィールド追加" });
        if (fieldCounts.update) plan.operations.push({ method: "PUT", endpoint: def.endpoint, body: { properties: updates }, label: "フィールド更新" });
        before = { properties: targetProps };
        after = { properties: merged };
      } else if (namedSections[key]) {
        const property = namedSections[key];
        const from = namedPayload(source, property), to = namedPayload(target, property);
        for (const name of Object.keys(from)) if (own(to, name)) from[name] = { ...to[name], ...from[name] };
        const preserve = options.preserveTargetOnly !== false;
        const combined = preserve ? { ...to, ...from } : from;
        const ordered = [...Object.keys(from).sort((a, b) => Number(from[a].index || 0) - Number(from[b].index || 0)), ...preserve ? Object.keys(to).filter((name) => !own(from, name)).sort((a, b) => Number(to[a].index || 0) - Number(to[b].index || 0)) : []];
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
        if (preserve) for (const name of Object.keys(to).filter((name2) => !own(from, name2))) plan.changes.push({ kind: "保持", path: `${labels[property]} / ${name}`, before: valueText(to[name]), after: "内容を保持（表示順は反映元の後）" });
        if (key === "viewSettings") plan.requiredFields = [...new Set(Object.values(combined).flatMap((view) => view.type === "LIST" ? view.fields || [] : view.type === "CALENDAR" ? [view.date, view.title].filter(Boolean) : []).filter((code) => !["$id", "$revision"].includes(code)))];
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
              const list = section[platform]?.[kind];
              if (!Array.isArray(list) || list.some((item) => !item || (item.type === "URL" ? typeof item.url !== "string" || !item.url : item.type === "FILE" ? typeof item.file?.fileKey !== "string" || !item.file.fileKey : true))) throw new Error(`${platform}/${kind}: JS/CSS一覧が不完全です。`);
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
          plan.warnings.push("JSONバックアップにはJS/CSSのファイル本体を含みません。ファイルの取り外しや差し替えを行う場合は、元のファイルも別途保管してください。");
          if (source.scope !== void 0) after.scope = source.scope;
          if (target.scope !== void 0) before.scope = target.scope;
          const currentKeys = new Set(["desktop", "mobile"].flatMap((platform) => ["js", "css"].flatMap((kind) => (target[platform]?.[kind] || []).map((item) => item.file?.fileKey).filter(Boolean))));
          for (const platform of ["desktop", "mobile"]) for (const kind of ["js", "css"]) for (const item of source[platform]?.[kind] || []) {
            if (item.type === "FILE" && !currentKeys.has(item.file?.fileKey)) plan.blockers.push(`${platform}/${kind}: 「${item.file?.name || "アップロードファイル"}」は反映先に存在しません。JS/CSS設定画面でファイルをアップロードしてから比較してください。`);
          }
        }
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
      diffValues(before, after, [], plan.changes);
      plan.changeCount = plan.changes.filter((change) => change.kind !== "保持").length;
      plan.removalCount = plan.changes.filter((change) => change.kind === "削除").length;
      if (key !== "fieldSettings" && key !== "pluginSettings" && plan.changeCount) plan.operations.push({ method: "PUT", endpoint: def.endpoint, body: after, label: def.label });
      if (plan.blockers.length) plan.status = "error";
      else plan.status = plan.operations.length ? "change" : "same";
      plan.message = plan.blockers.length ? plan.blockers.join("\n") : plan.operations.length ? `変更 ${plan.changeCount}件 / 削除 ${plan.removalCount}件 / ${plan.behavior}` : `書き込み不要${plan.changes.some((change) => change.kind === "保持") ? "（反映先だけの設定は保持）" : "（一致）"}`;
    } catch (error) {
      plan.status = "error";
      plan.blockers.push(error.message || String(error));
      plan.message = plan.blockers.join("\n");
    }
    return plan;
  }
  function listReflectFieldCodes(bundle, writableOnly = false) {
    const props = bundle?.sections?.fieldSettings?.properties;
    if (!object(props)) return [];
    return Object.entries(props).filter(([, def]) => !writableOnly || !SYSTEM_FIELD_TYPES.has(def?.type)).flatMap(([code, def]) => [code, ...Object.keys(def?.type === "SUBTABLE" ? def.fields || {} : {})]);
  }

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
        return ensureBundleShape(item, options.rawSettings);
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
  function pickAllSettingsBundles(raw, side, rawSettings = false) {
    const candidates = unwrapBundleCandidates(raw, side).map((item) => {
      try {
        return ensureBundleShape(item, rawSettings);
      } catch {
        return null;
      }
    }).filter(Boolean);
    if (!candidates.length) throw new Error("設定JSON内にアプリ設定バンドルが見つかりません");
    return candidates;
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
    const resolve = async (appId, guestId = "") => {
      const info = await apiGet(buildApiPrefix(guestId, false), "/app.json", { id: appId });
      if (String(info?.appId) !== appId || typeof info?.name !== "string" || !info.name) throw new Error(`App ${appId} の名前とIDを確認できません。入力と閲覧権限を確認してください。`);
      return { appId, guestId, name: info.name, code: String(info.code || "") };
    };
    const target = await resolve(opts.targetAppId, opts.targetGuestId);
    const source = opts.sourceBundle ? { appId: opts.sourceAppId, guestId: "", name: "設定JSON", code: "" } : await resolve(opts.sourceAppId, opts.sourceGuestId);
    return { source, target };
  }
  function orderedScopes(scopes) {
    if (!scopes?.length) throw new Error("反映する項目を選択してください。");
    const supported = SECTION_DEFS.filter((def) => def.put);
    if (scopes.some((key) => !supported.some((def) => def.key === key))) throw new Error("反映に対応していない項目が含まれています。");
    return supported.filter((def) => scopes.includes(def.key)).map((def) => def.key);
  }
  async function getReflectBundles(opts, scopes, setStatus) {
    setStatus(opts.sourceBundle ? "反映元の設定JSONを読み込み中..." : "反映元の設定を取得中...");
    const source = opts.sourceBundle ? pickSettingsBundle(opts.sourceBundle, { side: "source", appId: String(opts.sourceAppId || "").trim(), rawSettings: true }) : await fetchBundle({
      rawSettings: true,
      appId: opts.sourceAppId,
      guestId: opts.sourceGuestId || "",
      preview: !!opts.sourcePreview,
      sections: scopes,
      onProgress: (p, label) => setStatus(`反映元取得 ${Math.round(p * 100)}% (${label})`)
    });
    setStatus("反映先プレビューの設定を確認中...");
    const target = await fetchBundle({
      rawSettings: true,
      appId: opts.targetAppId,
      guestId: opts.targetGuestId || "",
      preview: true,
      sections: reflectInspectionScopes(scopes),
      onProgress: (p, label) => setStatus(`反映先取得 ${Math.round(p * 100)}% (${label})`)
    });
    return { source, target };
  }
  async function previewReflectStandalone(opts, setStatus) {
    const invalid = reflectConnectionError(opts);
    if (invalid) throw new Error(invalid);
    const scopes = orderedScopes(opts.scopes);
    const { source, target } = await getReflectBundles(opts, scopes, setStatus);
    const entries = scopes.map((key) => buildReflectSectionPlan(key, source.sections?.[key], target.sections?.[key], opts));
    const baseline = captureReflectBaseline({ ...opts, scopes: reflectInspectionScopes(scopes) }, source, target);
    for (const entry of entries.filter((entry2) => !entry2.blockers.length)) {
      try {
        assertReflectBaselineMatches(baseline, { ...opts, scopes: [entry.sectionKey], targetDependencies: entry.requiredFields?.length ? ["fieldSettings"] : [] }, source, target);
      } catch (error) {
        entry.status = "error";
        entry.blockers.push(error.message);
        entry.message = error.message;
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
      baseline
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
    const plans = scopes.map((key) => buildReflectSectionPlan(key, source.sections?.[key], target.sections?.[key], opts));
    const issues = reflectSelectionBlockers(plans, scopes, listReflectFieldCodes(source, true), listReflectFieldCodes(target));
    if (issues.length) throw new Error(`反映前の検査で停止しました。まだ書き込んでいません。
${issues.join("\n")}`);
    if (plans.some((plan) => plan.requiredFields?.length)) revision = assertReflectBaselineMatches(opts.reviewBaseline, { ...opts, scopes, targetDependencies: ["fieldSettings"] }, source, target);
    if (Object.keys(opts.lookupMap || {}).length) {
      const lookup = await preflightLookupMapStandalone(opts.lookupMap, { targetGuestId: opts.targetGuestId });
      if (!lookup.ok) throw new Error(`ルックアップ変換先を確認できないため反映を中止しました。
${lookup.missing.map((item) => `${item.from} → ${item.to}: ${item.reason}`).join("\n")}`);
    }
    const logs = [];
    if (opts.doBackup && plans.some((plan) => plan.operations.length)) {
      const blob = new Blob([JSON.stringify({ generatedAt: (/* @__PURE__ */ new Date()).toISOString(), scopes, bundle: target }, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = buildExportFilename("反映前バックアップ", "json", { appLabel: buildAppFilenameLabel(opts.targetAppId, "") });
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5e3);
      logs.push("バックアップ取得完了（保存を開始しました）");
    }
    const prefix = buildApiPrefix(opts.targetGuestId || "", true);
    const write = async (operation) => {
      try {
        const response = await (operation.method === "POST" ? apiPost : apiPut)(prefix, operation.endpoint, { ...operation.body, app: opts.targetAppId, revision });
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
    for (const [index, plan] of plans.entries()) {
      const outcome = { sectionKey: plan.sectionKey, label: plan.label };
      if (!plan.operations.length) {
        sections.push({ ...outcome, status: "skip", message: "変更なし（書き込み不要）" });
        logs.push(`SKIP ${plan.label}: 書き込み不要`);
        onProgress(logs);
        continue;
      }
      setStatus(`反映中 ${index + 1}/${plans.length}: ${plan.label}`);
      try {
        for (const operation of plan.operations) {
          await write(operation);
          logs.push(`  OK ${operation.label}`);
        }
        sections.push({ ...outcome, status: "ok" });
        logs.push(`OK ${plan.label}`);
      } catch (error) {
        const message = error.message || String(error);
        sections.push({ ...outcome, status: "ng", message });
        pushReflectErrorLog(logs, `NG ${plan.label}: ${message}`, message);
        if (opts.stopOnError !== false || error.stopReflection || isRevisionConflictError(error)) {
          for (const pending of plans.slice(index + 1)) sections.push({ sectionKey: pending.sectionKey, label: pending.label, status: "pending", message: "中断のため未実行" });
          logs.push(`中断（未実行 ${plans.length - index - 1} 件）`);
          break;
        }
      }
      onProgress(logs);
    }
    const count = (status) => sections.filter((section) => section.status === status).length;
    logs.push(`=== 完了: OK ${count("ok")} / NG ${count("ng")} / 未実行 ${count("pending")} / 変更なし ${count("skip")} ===`);
    onProgress(logs);
    setStatus(count("ng") ? "反映完了（一部エラーあり）" : "反映完了");
    return { logs, sections };
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
        missing.push({ from, to, reason: `取得失敗: ${error.message || String(error)}` });
      }
    }
    return { ok: !missing.length, missing };
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
  box-sizing:border-box;
  width:min(520px,calc(100vw - max(32px,4vw)));
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
.kus-lp--wide{width:min(640px,calc(100vw - max(32px,4vw)))}

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
      root2.setAttribute("aria-busy", String(busy));
      root2.style.cursor = busy ? "progress" : "";
      root2.dispatchEvent(new Event("kus-lite-busy-change"));
    }
    function close() {
      if (closeBtn.disabled) return;
      const restoreFocus = root2.contains(document.activeElement);
      document.removeEventListener("keydown", onDocKeydown, true);
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
      if (e.key === "Escape" && !closeBtn.disabled && document.body.contains(root2)) {
        e.preventDefault();
        e.stopPropagation();
        close();
      }
    }
    document.addEventListener("keydown", onDocKeydown, true);
    root2.addEventListener("kus-lite-dispose", () => document.removeEventListener("keydown", onDocKeydown, true), { once: true });
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
      if (okMsg && tone !== "err" && tone !== "warn") {
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
.kus-as__meta{margin-top:3px;color:var(--c-text-2);font-size:10.5px;line-height:1.5}
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
    keyword.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.isComposing && e.keyCode !== 229) {
        e.preventDefault();
        void runSearch();
      }
    });
    return details;
  }

  // src/entries/reflectPlanView.ts
  function appendReflectChanges(host, plan) {
    for (const warning of plan.warnings) {
      const note = document.createElement("p");
      note.className = "kus-rl-next kus-rl-next--warn";
      note.textContent = warning;
      host.appendChild(note);
    }
    if (!plan.changes.length) return;
    const details = document.createElement("details");
    details.className = "kus-rl-changes";
    const summary = document.createElement("summary");
    summary.textContent = `${plan.label}の内訳（変更 ${plan.changeCount}件・保持 ${plan.changes.length - plan.changeCount}件）`;
    details.appendChild(summary);
    host.appendChild(details);
    let rendered = 0;
    const list = document.createElement("div");
    details.appendChild(list);
    const more = document.createElement("button");
    more.type = "button";
    more.className = "kus-lp__btn kus-lp__btn--sub";
    more.textContent = "続きを50件表示";
    const append = () => {
      for (const change of plan.changes.slice(rendered, rendered + 50)) {
        const row = document.createElement("div");
        row.className = "kus-rl-change";
        row.dataset.kind = change.kind;
        const title = document.createElement("strong");
        title.textContent = `${change.kind} · ${change.path}`;
        row.appendChild(title);
        const grid = document.createElement("div");
        grid.className = "kus-rl-change__values";
        for (const [label, value] of [["反映先の現在", change.before], ["反映後", change.after]]) {
          const cell = document.createElement("div"), caption = document.createElement("span"), content = document.createElement("pre");
          caption.textContent = label;
          content.textContent = value.length > 1600 ? value.slice(0, 1600) + "\n…（全内容は計画JSONで確認できます）" : value;
          cell.append(caption, content);
          grid.appendChild(cell);
        }
        row.appendChild(grid);
        list.appendChild(row);
      }
      rendered = Math.min(rendered + 50, plan.changes.length);
      more.hidden = rendered >= plan.changes.length;
    };
    more.addEventListener("click", append);
    details.appendChild(more);
    details.addEventListener("toggle", () => {
      if (details.open && !rendered) append();
    });
  }
  function reflectIdentityLabel(identities, side, sourceEnvironment) {
    const app = identities[side];
    return `${app.name}${app.appId ? `（ID: ${app.appId}）` : ""} / ${app.guestId ? `ゲスト ${app.guestId}` : "通常スペース"} / ${side === "target" ? "プレビュー" : sourceEnvironment}`;
  }
  function renderReflectRoute(host, identities, environment) {
    const route = document.createElement("div");
    route.className = "kus-rl-confirm-route";
    for (const side of ["source", "target"]) {
      const block = document.createElement("div"), label = document.createElement("span"), name = document.createElement("strong");
      label.textContent = side === "source" ? "反映元 ↓" : "書き込み先";
      name.textContent = reflectIdentityLabel(identities, side, environment);
      block.append(label, name);
      route.appendChild(block);
    }
    host.appendChild(route);
  }

  // src/entries/reflect-lite-ui.ts
  var memoryState = {
    presets: []
  };
  var SCOPE_QUICK_PRESETS = [
    { id: "all", label: "すべての項目", hint: "反映可能なセクションを全選択" },
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
#kus-reflect-lite.kus-lp--wide{width:min(960px,calc(100vw - 32px));max-height:calc(100dvh - 32px);top:16px;right:16px;border-radius:18px;border-color:#cbd5e1}
#kus-reflect-lite .kus-lp__hero{padding:16px 24px;background:#172033}
#kus-reflect-lite .kus-lp__title{font-size:20px;letter-spacing:-.01em}
#kus-reflect-lite .kus-lp__subtitle{font-size:12.5px;max-width:560px}
#kus-reflect-lite .kus-lp__body{padding:0;background:#f4f6f8;display:flex;flex-direction:column;overflow:hidden}
#kus-reflect-lite .kus-lp__hint{margin:0;padding:11px 24px;border:0;border-bottom:1px solid #e2e8f0;border-radius:0;background:#fff7ed;color:#9a3412}
#kus-reflect-lite .kus-lp__hint strong{color:#7c2d12}
#kus-reflect-lite .kus-lp__card{border-radius:16px;padding:16px 18px;box-shadow:0 1px 2px rgba(15,23,42,.04)}
#kus-reflect-lite .kus-lp__card-head{border:0;margin:0 0 12px;padding:0}
#kus-reflect-lite .kus-lp__card-title{font-size:12px;text-transform:none;letter-spacing:.01em;color:#172033}
#kus-reflect-lite .kus-lp__card-num{background:#172033;color:#fff}
#kus-reflect-lite .kus-rl-workspace{display:flex;flex-direction:column;min-height:0;flex:1}
#kus-reflect-lite .kus-rl-canvas{min-width:0;min-height:0;overflow:auto;padding:20px 24px;scroll-padding:16px}
#kus-reflect-lite .kus-rl-setup-grid{display:grid;grid-template-columns:minmax(0,1fr);gap:14px}
#kus-reflect-lite .kus-rl-setup-grid>.kus-lp__card{margin:0}
#kus-reflect-lite .kus-rl-setup-grid>.kus-rl-card--route,#kus-reflect-lite .kus-rl-setup-grid>.kus-rl-card--preset{grid-column:1/-1}
#kus-reflect-lite .kus-rl-route{display:grid;grid-template-columns:minmax(0,1fr) 48px minmax(0,1fr);align-items:stretch;gap:10px}
#kus-reflect-lite .kus-rl-endpoint{padding:13px;border:1px solid #e2e8f0;border-radius:13px;background:#f8fafc}
#kus-reflect-lite .kus-rl-endpoint--target{background:#fff7ed;border-color:#fed7aa}
#kus-reflect-lite .kus-rl-endpoint__eyebrow{margin-bottom:8px;font-size:10.5px;font-weight:800;letter-spacing:.08em;color:#64748b;text-transform:uppercase}
#kus-reflect-lite .kus-rl-endpoint--target .kus-rl-endpoint__eyebrow{color:#c2410c}
#kus-reflect-lite .kus-rl-endpoint .kus-lp__row{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,.8fr);gap:7px;margin:0}
#kus-reflect-lite .kus-rl-endpoint .kus-lp__input{width:100%;min-width:0;box-sizing:border-box}
#kus-reflect-lite .kus-rl-endpoint .kus-lp__select{width:100%;margin-bottom:8px}
#kus-reflect-lite .kus-rl-endpoint__note{font-size:11px;color:#9a3412;min-height:33px;margin-bottom:8px}
#kus-reflect-lite .kus-rl-field{display:flex;flex-direction:column;gap:4px;font-size:11px;font-weight:600;margin:8px 0}
#kus-reflect-lite .kus-rl-field .kus-lp__input{min-height:40px;font-size:14px}
#kus-reflect-lite .kus-rl-endpoint .kus-lp__file{width:100%;min-width:0;box-sizing:border-box;margin:12px 0}
#kus-reflect-lite .kus-rl-endpoint .kus-lp__check{margin:10px 0}
#kus-reflect-lite .kus-rl-scope-groups{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-top:14px}
#kus-reflect-lite .kus-rl-scope-group{min-width:0;margin:0;padding:10px;border:1px solid #e2e8f0;border-radius:10px}
#kus-reflect-lite .kus-rl-scope-group legend{font-size:11px;font-weight:700;color:#475569;padding:0 4px}
#kus-reflect-lite .kus-rl-scope-group .kus-lp__chips{display:flex;flex-direction:column;align-items:stretch}
#kus-reflect-lite .kus-rl-scope-group .kus-lp__chip{border-radius:6px;white-space:normal;min-height:32px}
#kus-reflect-lite .kus-rl-advanced{border:1px solid #e2e8f0;border-radius:12px;background:#fff;padding:2px 14px}
#kus-reflect-lite .kus-rl-advanced>.kus-lp__details-body{padding:10px 0}
#kus-reflect-lite .kus-rl-advanced .kus-lp__card{box-shadow:none}
#kus-reflect-lite [hidden]{display:none!important}
#kus-reflect-lite :is(button,input,select,summary):focus-visible{outline:3px solid #2563eb;outline-offset:3px}
#kus-reflect-lite .kus-rl-route-arrow{display:flex;align-items:center;justify-content:center;color:#dc2626;font-size:22px;font-weight:800}
#kus-reflect-lite .kus-rl-route-utility{margin-top:10px!important;padding-top:10px;border-top:1px dashed #e2e8f0}
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
#kus-reflect-lite .kus-rl-nav{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;padding:10px 24px;background:#fff;border-bottom:1px solid #e2e8f0;flex-shrink:0}
#kus-reflect-lite .kus-rl-nav__btn{appearance:none;width:100%;border:1px solid transparent;border-radius:10px;background:transparent;color:#64748b;padding:10px;cursor:pointer;font-family:inherit;font-size:12px;font-weight:700;display:grid;grid-template-columns:24px 1fr;align-items:center;gap:9px;text-align:left}
#kus-reflect-lite .kus-rl-nav__btn:hover{background:#f1f5f9;color:#172033}
#kus-reflect-lite .kus-rl-nav__btn[aria-selected="true"]{background:#fff7ed;color:#9a3412;border-color:#fed7aa}
#kus-reflect-lite .kus-rl-nav__num{display:inline-flex;width:19px;height:19px;align-items:center;justify-content:center;border-radius:50%;background:#e2e8f0;color:#475569;font-size:10px}
#kus-reflect-lite .kus-rl-nav__btn[aria-selected="true"] .kus-rl-nav__num{background:#fee2e2;color:#b91c1c}
#kus-reflect-lite .kus-rl-nav__copy{display:block;font-size:9.5px;font-weight:500;color:#94a3b8;margin-top:2px}
#kus-reflect-lite .kus-rl-nav__btn[aria-selected="true"] .kus-rl-nav__copy{color:#64748b}
#kus-reflect-lite .kus-rl-stage[hidden]{display:none}
#kus-reflect-lite .kus-rl-stage-head{margin:0 2px 16px}
#kus-reflect-lite .kus-rl-stage-head h2{margin:0;font-size:19px;letter-spacing:-.02em;color:#0f172a}
#kus-reflect-lite .kus-rl-stage-head p{margin:4px 0 0;font-size:12px;color:#64748b}
#kus-reflect-lite .kus-rl-action-dock{flex-shrink:0;padding:12px 24px;background:#fff;border-top:1px solid #e2e8f0}
#kus-reflect-lite .kus-rl-dock-row{display:flex;align-items:center;gap:10px}
#kus-reflect-lite .kus-rl-dock-copy{flex:1;min-width:0;font-size:12px;color:#475569;overflow-wrap:anywhere}
#kus-reflect-lite .kus-rl-dock-copy strong{display:block;color:#0f172a}
#kus-reflect-lite .kus-rl-dock-actions{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end}
#kus-reflect-lite .kus-rl-dock-actions .kus-lp__btn{min-height:42px}
#kus-reflect-lite .kus-rl-action-dock .kus-lp__result{max-height:80px;overflow:auto}
#kus-reflect-lite .kus-rl-action-dock .kus-lp__status-text{max-height:48px;overflow:auto}
#kus-reflect-lite .kus-rl-action-dock .kus-lp__status{margin-top:8px}
#kus-reflect-lite .kus-rl-stage .kus-lp__card:last-child{margin-bottom:0}
#kus-reflect-lite .kus-rl-confirm-route{display:grid;gap:8px;margin-bottom:12px}
#kus-reflect-lite .kus-rl-confirm-route>div{padding:12px;border-radius:10px;border:1px solid #cbd5e1;background:#f8fafc;overflow-wrap:anywhere}
#kus-reflect-lite .kus-rl-confirm-route>div:last-child{border:2px solid #ea580c;background:#fff7ed}
#kus-reflect-lite .kus-rl-confirm-route span{display:block;font-size:11px;color:#64748b;margin-bottom:4px}
#kus-reflect-lite .kus-rl-changes{margin-top:10px;font-size:12px;min-width:0}
#kus-reflect-lite .kus-rl-changes summary{cursor:pointer;padding:8px 0;font-weight:700}
#kus-reflect-lite .kus-rl-change{border-top:1px solid #cbd5e1;padding:10px 0;overflow-wrap:anywhere}
#kus-reflect-lite .kus-rl-change[data-kind="削除"]>strong{color:#b91c1c}
#kus-reflect-lite .kus-rl-change__values{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:8px}
#kus-reflect-lite .kus-rl-change__values>div{min-width:0;background:#fff;border:1px solid #e2e8f0;border-radius:6px;padding:8px}
#kus-reflect-lite .kus-rl-change__values span{font-size:10px;color:#64748b}
#kus-reflect-lite .kus-rl-change__values pre{margin:4px 0 0;white-space:pre-wrap;overflow-wrap:anywhere;font:11px/1.6 ui-monospace,monospace}
#kus-reflect-lite .kus-rl-nav__btn:disabled{opacity:.45;cursor:not-allowed}
@media(max-width:720px){
  #kus-reflect-lite .kus-rl-change__values{grid-template-columns:1fr}
  #kus-reflect-lite .kus-rl-nav__num{display:none}

  #kus-reflect-lite.kus-lp--wide{width:calc(100vw - 16px);right:8px;top:8px;max-height:calc(100dvh - 16px)}
  #kus-reflect-lite .kus-lp__hero{padding:12px 16px}
  #kus-reflect-lite .kus-lp__hint,#kus-reflect-lite .kus-lp__badge-row{display:none}
  #kus-reflect-lite .kus-rl-nav{padding:8px;gap:4px}
  #kus-reflect-lite .kus-rl-nav::before,#kus-reflect-lite .kus-rl-nav__copy{display:none}
  #kus-reflect-lite .kus-rl-nav__btn{display:flex;justify-content:center;text-align:center;padding:8px 4px;font-size:11px}
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
    ensureReflectLiteStyles();
    const panel = createLitePanel({
      id: "kus-reflect-lite",
      title: "プレビュー反映",
      subtitle: "比較元アプリの設定を比較先プレビューへ一括反映します。",
      accent: "reflect",
      badges: [],
      hint: "<strong>差分を確認してから反映</strong> · 反映先はプレビューです。本番への公開は設定画面で行います。",
      wide: true
    });
    let showWorkflowStage = () => {
    };
    let refreshWorkflow = () => {
    };
    let busy = false;
    let sourceMode = "app";
    const srcApp = makeInput({ placeholder: "比較元アプリID", value: memoryState.sourceAppId || "", width: "id" });
    const srcGuest = makeInput({ placeholder: "ゲストID", value: memoryState.sourceGuestId || "", width: "guest" });
    const tgtApp = makeInput({ placeholder: "比較先アプリID", value: memoryState.targetAppId || DEFAULT_APP_ID || "", width: "id" });
    const tgtGuest = makeInput({ placeholder: "ゲストID", value: memoryState.targetGuestId || "", width: "guest" });
    srcApp.setAttribute("aria-label", "比較元アプリID");
    srcGuest.setAttribute("aria-label", "比較元ゲストスペースID");
    tgtApp.setAttribute("aria-label", "比較先アプリID");
    tgtGuest.setAttribute("aria-label", "比較先ゲストスペースID");
    let sourceBundleFromJson = null;
    let sourceJsonBundles = [];
    let sourceBundleToken = "";
    const srcJsonFile = document.createElement("input");
    srcJsonFile.type = "file";
    srcJsonFile.accept = ".json,application/json";
    srcJsonFile.className = "kus-lp__file";
    const sourceJsonAppSelect = document.createElement("select");
    sourceJsonAppSelect.className = "kus-lp__select";
    sourceJsonAppSelect.setAttribute("aria-label", "設定JSON内の比較元アプリ");
    sourceJsonAppSelect.hidden = true;
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
    cardApp.card.classList.add("kus-rl-card--route");
    const route = document.createElement("div");
    route.className = "kus-rl-route";
    const sourceEndpoint = document.createElement("section");
    sourceEndpoint.className = "kus-rl-endpoint";
    sourceEndpoint.innerHTML = '<div class="kus-rl-endpoint__eyebrow">比較元 · 設定を読み取る</div>';
    const sourceModeSelect = document.createElement("select");
    sourceModeSelect.className = "kus-lp__select";
    sourceModeSelect.setAttribute("aria-label", "比較元の取得方法");
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
    const sourceGuestDetails = makeDetails("ゲストスペースを指定", { open: !!srcGuest.value });
    sourceGuestDetails.body.appendChild(labeledInput(srcGuest, "ゲストスペースID（任意）"));
    sourceAppFields.append(sourceGuestDetails.details, currentSrcBtn);
    sourceEndpoint.appendChild(sourceAppFields);
    const sourceJsonFields = document.createElement("div");
    sourceJsonFields.hidden = true;
    srcJsonFile.setAttribute("aria-label", "比較元の設定JSON");
    sourceJsonFields.append(srcJsonFile, sourceJsonAppSelect, srcJsonClearBtn, srcJsonNote);
    sourceEndpoint.appendChild(sourceJsonFields);
    const routeArrow = document.createElement("div");
    routeArrow.className = "kus-rl-route-arrow";
    routeArrow.setAttribute("aria-hidden", "true");
    routeArrow.textContent = "→";
    const targetEndpoint = document.createElement("section");
    targetEndpoint.className = "kus-rl-endpoint kus-rl-endpoint--target";
    targetEndpoint.innerHTML = '<div class="kus-rl-endpoint__eyebrow">比較先 · プレビューへ反映</div><div class="kus-rl-endpoint__note">本番への公開は設定画面から行います</div>';
    targetEndpoint.appendChild(labeledInput(tgtApp, "アプリID"));
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
        srcJsonNote.textContent = `比較元JSON読み込み済み: App ${sourceBundleFromJson?.appId || "-"}（比較元はこのJSONから取得し、アプリからの取得は行いません）`;
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
    srcJsonFile.addEventListener("change", () => liteRun(panel, "比較元JSONを読み込み中…", async () => {
      const file = srcJsonFile.files?.[0];
      if (!file) return;
      sourceBundleFromJson = null;
      sourceJsonBundles = [];
      sourceBundleToken = "";
      sourceJsonBundles = pickAllSettingsBundles(JSON.parse(await file.text()), "source", true);
      sourceJsonAppSelect.replaceChildren(...sourceJsonBundles.map((bundle, index) => {
        const option = document.createElement("option");
        option.value = String(index);
        option.textContent = `アプリ #${bundle.appId}`;
        return option;
      }));
      sourceBundleFromJson = sourceJsonBundles[0];
      sourceBundleToken = `${file.name}:${file.size}:${file.lastModified}:${Date.now()}`;
      if (sourceBundleFromJson?.appId) srcApp.value = String(sourceBundleFromJson.appId);
      panel.setStatus(`比較元JSONを読み込みました: App ${sourceBundleFromJson?.appId || "-"}`, "ok");
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
      panel.setStatus("比較元JSONをクリアしました。設定JSONを選んでください。", "info");
    });
    const sameConnBanner = document.createElement("div");
    sameConnBanner.className = "kus-lp__note--warn";
    sameConnBanner.style.display = "none";
    sameConnBanner.textContent = "⚠ 比較元と比較先が同一接続です（同じアプリID・ゲストID）。同一アプリのプレビューを上書きする状態です。";
    cardApp.body.appendChild(sameConnBanner);
    cardApp.body.appendChild(createAppSearchControl(panel, {
      targets: [
        { label: "比較元", apply: (id, _name, guestId) => {
          sourceModeSelect.value = "app";
          sourceModeSelect.dispatchEvent(new Event("change"));
          srcApp.value = id;
          srcGuest.value = guestId || "";
          saveState();
          refreshSameConnBanner();
          refreshReviewCard();
        } },
        { label: "比較先", apply: (id, _name, guestId) => {
          tgtApp.value = id;
          tgtGuest.value = guestId || "";
          saveState();
          refreshSameConnBanner();
          refreshReviewCard();
        } }
      ]
    }));
    panel.body.insertBefore(cardApp.card, panel.status);
    function refreshSameConnBanner() {
      if (srcGuest.value) sourceGuestDetails.details.open = true;
      if (tgtGuest.value) targetGuestDetails.details.open = true;
      const same = sourceMode === "app" && !!srcApp.value.trim() && srcApp.value.trim() === tgtApp.value.trim() && srcGuest.value.trim() === tgtGuest.value.trim();
      sameConnBanner.style.display = same ? "block" : "none";
      sameConnBanner.textContent = sourceEnvironment.value === "preview" ? "同じプレビュー同士は反映できません。反映元の取得環境かアプリIDを変更してください。" : "同じアプリの本番設定でプレビューを更新します。未公開の編集への影響を、次の画面で確認してください。";
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
    const cardScope = makeCard({ title: "反映する項目", number: 2, subtitle: "目的に近いセットを選び、必要な項目を調整できます。" });
    const putSections = SECTION_DEFS.filter((d) => d.put);
    const initialSelected = new Set(
      Array.isArray(memoryState.selectedScopes) ? memoryState.selectedScopes : ["fieldSettings", "layoutSettings", "viewSettings"]
    );
    const chips = putSections.map((d) => makeChip({
      label: d.label,
      checked: initialSelected.has(d.key),
      value: d.key
    }));
    const chipBox = document.createElement("div");
    chipBox.className = "kus-lp__chips";
    const scopeGroups = [
      { label: "フォーム・表示", keys: ["fieldSettings", "layoutSettings", "viewSettings", "reportSettings", "categories"] },
      { label: "動作・カスタマイズ", keys: ["processSettings", "actionSettings", "pluginSettings", "customizeSettings"] },
      { label: "権限・通知", keys: ["appAcl", "fieldAcl", "recordPermissions", "notifications", "perRecordNotifications", "reminderNotifications"] }
    ];
    chipBox.className = "kus-rl-scope-groups";
    scopeGroups.forEach((group) => {
      const fieldset = document.createElement("fieldset");
      fieldset.className = "kus-rl-scope-group";
      const legend = document.createElement("legend");
      legend.textContent = group.label;
      fieldset.appendChild(legend);
      const list = document.createElement("div");
      list.className = "kus-lp__chips";
      chips.filter((c) => group.keys.includes(c.checkbox.value)).forEach((c) => list.appendChild(c.label));
      fieldset.appendChild(list);
      chipBox.appendChild(fieldset);
    });
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
    const cardOpt = makeCard({ title: "実行オプション", number: 3, soft: true });
    const sourceEnvironment = document.createElement("select");
    sourceEnvironment.className = "kus-lp__select";
    sourceEnvironment.setAttribute("aria-label", "反映元の取得環境");
    sourceEnvironment.innerHTML = '<option value="production">本番設定（運用中）を取得</option><option value="preview">プレビュー設定（未公開）を取得</option>';
    sourceEnvironment.value = memoryState.sourcePreview ? "preview" : "production";
    sourceAppFields.insertBefore(sourceEnvironment, sourceGuestDetails.details);
    const preserve = makeCheck({ label: "反映先だけの一覧・グラフ・アクションを保持する", checked: memoryState.preserveTargetOnly !== false, help: "標準は保持。OFFにすると反映元にない設定を削除します。フィールドは常に保持します。" });
    cardScope.body.prepend(preserve.label);
    const safetyNote = document.createElement("p");
    safetyNote.className = "kus-rl-quiet";
    safetyNote.textContent = "反映前のバックアップを自動保存します。変更のない項目は送信せず、書き込みエラーが起きたら中断します。";
    cardOpt.body.appendChild(safetyNote);
    const lookupDetails = makeDetails("Lookup AppID マッピング（任意）");
    const lookupTa = makeTextarea({
      rows: 3,
      code: true,
      placeholder: '{"旧AppID":"新AppID", ...}',
      value: memoryState.lookupMapText || ""
    });
    lookupTa.setAttribute("aria-label", "ルックアップの参照アプリID変換");
    lookupDetails.body.appendChild(lookupTa);
    const lookupHint = document.createElement("div");
    lookupHint.className = "kus-lp__small";
    lookupHint.style.marginTop = "6px";
    lookupHint.textContent = "フィールドの参照アプリ（ルックアップ）を別 AppID に置換します。差分プレビューにも反映し、実行前に変換先 AppID の存在を確認します。";
    lookupDetails.body.appendChild(lookupHint);
    cardOpt.body.appendChild(lookupDetails.details);
    [sourceEnvironment, preserve.checkbox].forEach((cb) => {
      cb.addEventListener("change", () => {
        saveState();
        refreshSameConnBanner();
        refreshReviewCard();
      });
    });
    lookupTa.addEventListener("input", () => {
      saveState();
      refreshReviewCard();
    });
    panel.body.insertBefore(cardOpt.card, panel.status);
    const cardPreset = makeCard({ title: "プリセット（接続+スコープ）", soft: true });
    cardPreset.card.classList.add("kus-rl-card--preset");
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
          preview: sourceEnvironment.value === "preview"
        },
        target: {
          appId: tgtApp.value.trim(),
          guestId: tgtGuest.value.trim()
        },
        scopes: collectSelectedScopes(),
        lookupMapText: lookupTa.value,
        preserveTargetOnly: preserve.checkbox.checked
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
      sourceModeSelect.value = "app";
      sourceModeSelect.dispatchEvent(new Event("change"));
      srcApp.value = preset.source.appId;
      srcGuest.value = preset.source.guestId;
      tgtApp.value = preset.target.appId;
      tgtGuest.value = preset.target.guestId;
      sourceEnvironment.value = preset.source.preview ? "preview" : "production";
      preserve.checkbox.checked = preset.preserveTargetOnly !== false;
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
    const previewBtn = makeButton("差分プレビューを更新", "primary");
    const changedOnlyBtn = makeButton("差分ありだけ選択", "sub");
    const reviewCard = makeCard({ title: "反映予定を確認", soft: true });
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
      memoryState = {
        ...memoryState,
        sourceAppId: srcApp.value.trim(),
        sourceGuestId: srcGuest.value.trim(),
        targetAppId: tgtApp.value.trim(),
        targetGuestId: tgtGuest.value.trim(),
        sourcePreview: sourceEnvironment.value === "preview",
        selectedScopes: collectSelectedScopes(),
        lookupMapText: lookupTa.value,
        preserveTargetOnly: preserve.checkbox.checked
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
        lookupMap: getLookupValue(tryParseLookupMap(lookupTa.value)),
        preserveTargetOnly: preserve.checkbox.checked
      };
    }
    function getPreviewState(scopes = collectSelectedScopes(), lookupState = tryParseLookupMap(lookupTa.value)) {
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
      const fresh = !!preview && !!signature && preview.signature === signature && scopes.every((key) => coveredScopes.includes(key)) && (sourceMode !== "json" || !!sourceBundleFromJson);
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
      const { fresh } = getPreviewState();
      const plan = fresh ? getExecutionPlan(selectedScopes, previewResult) : null;
      const filteredEntries = filterPreviewEntries(previewResult.entries, previewSearch.value.trim().toLowerCase(), previewFilter.value);
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
        statusFilter: previewFilter.value,
        fresh,
        onAdd: (sectionKey) => setSelectedScopes([.../* @__PURE__ */ new Set([...collectSelectedScopes(), sectionKey])]),
        onRemove: (sectionKey) => setSelectedScopes(collectSelectedScopes().filter((key) => key !== sectionKey))
      });
      previewCard.card.style.display = "block";
    }
    async function runPreview(scopes, lookupMap) {
      memoryState.lastPreview = null;
      clearConfirmation();
      const options = { ...currentOptions(scopes), lookupMap };
      const signature = buildPreviewSignature({ ...options, sourceBundleToken });
      panel.setStatus("アプリ名と接続先を確認中…", "busy");
      const identities = await resolveReflectAppsStandalone(options);
      const result = await previewReflectStandalone(options, (message) => panel.setStatus(message, "busy"));
      memoryState.lastPreview = { signature, scopes: [...scopes], at: Date.now(), result, identities };
      rerenderPreviewCard();
      refreshReviewCard();
      showWorkflowStage("review");
      return result;
    }
    function selectionIssues(result, scopes) {
      return result ? reflectSelectionBlockers(result.entries, scopes, result.sourceFieldCodes, result.targetFieldCodes) : [];
    }
    function refreshReviewCard() {
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
      setButtonText(runBtn, `確認した ${plan.effectiveScopes.length} 項目をプレビューへ反映`);
      let message = invalid || getLookupError(lookupState) || (!scopes.length ? "反映する項目を選んでください。" : "変更前と変更後を確認し、最終確認に進んでください。");
      if (!preview) message = "対象を指定して差分を取得してください。";
      else if (!fresh) message = "条件が変わりました。差分を再取得してください。";
      else if (blockers.length) message = "確認できない項目が選択されています。問題を解決して再取得するか、対象から外してください。";
      else if (!plan.effectiveScopes.length) message = "書き込みが必要な項目はありません。反映先だけの項目を保持した場合も書き込み不要です。";
      reviewBody.innerHTML = "";
      if (preview?.identities && fresh) renderReflectRoute(reviewBody, preview.identities, sourceMode === "json" ? "設定JSON" : sourceEnvironment.value === "preview" ? "プレビュー" : "本番");
      const info = document.createElement("div");
      info.className = "kus-rl-next " + (blockers.length ? "kus-rl-next--warn" : "kus-rl-next--info");
      info.textContent = message;
      reviewBody.appendChild(info);
      const summary = document.createElement("p");
      summary.className = "kus-rl-quiet";
      summary.textContent = fresh ? `反映予定 ${plan.effectiveScopes.length} 項目 / 変更なし ${plan.sameScopes.length} 項目 / 確認が必要 ${plan.errorScopes.length} 項目 · ${formatPreviewStamp(preview.at)}` : "この段階では書き込みを行いません。";
      reviewBody.appendChild(summary);
      if (blockers.length) {
        const list = document.createElement("ul");
        list.className = "kus-rl-issues";
        for (const message2 of blockers) {
          const item = document.createElement("li");
          item.textContent = message2;
          list.appendChild(item);
        }
        reviewBody.appendChild(list);
      }
      exportPlanBtn.disabled = busy || !fresh;
      rerenderPreviewCard();
      refreshWorkflow();
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
      const scopeKeys = uniqueSectionKeys(filterPreviewEntries(previewResult.entries, previewSearch.value.trim().toLowerCase(), previewFilter.value));
      setSelectedScopes(scopeKeys);
      panel.setStatus(`表示中の ${scopeKeys.length} セクションだけを選択しました`, scopeKeys.length ? "ok" : "info");
    });
    previewAddShownBtn.addEventListener("click", () => {
      const previewResult = memoryState.lastPreview?.result || null;
      if (!previewResult) {
        panel.setStatus("先に差分プレビューを取得してください", "warn");
        return;
      }
      const scopeKeys = uniqueSectionKeys(filterPreviewEntries(previewResult.entries, previewSearch.value.trim().toLowerCase(), previewFilter.value));
      setSelectedScopes([.../* @__PURE__ */ new Set([...collectSelectedScopes(), ...scopeKeys])]);
      panel.setStatus(`表示中の ${scopeKeys.length} セクションを追加しました`, scopeKeys.length ? "ok" : "info");
    });
    previewRemoveShownBtn.addEventListener("click", () => {
      const previewResult = memoryState.lastPreview?.result || null;
      if (!previewResult) {
        panel.setStatus("先に差分プレビューを取得してください", "warn");
        return;
      }
      const scopeKeys = new Set(uniqueSectionKeys(filterPreviewEntries(previewResult.entries, previewSearch.value.trim().toLowerCase(), previewFilter.value)));
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
      if (busy || previewBtn.disabled) return;
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
    const confirmBtn = makeButton("最終確認に進む", "primary");
    const confirmCard = makeCard({ title: "この内容をプレビューへ反映します" });
    const confirmBody = document.createElement("div");
    confirmCard.body.appendChild(confirmBody);
    const acknowledged = makeCheck({ label: "反映先と変更・削除の内容を確認しました", checked: false });
    acknowledged.checkbox.setAttribute("aria-label", "反映内容の確認");
    const targetCheck = makeInput({ placeholder: "反映先アプリIDを入力", width: "wide" });
    targetCheck.setAttribute("aria-label", "確認用の反映先アプリID");
    targetCheck.setAttribute("data-lp-no-submit", "");
    targetCheck.inputMode = "numeric";
    targetCheck.autocomplete = "off";
    const targetCheckRow = makeRow([targetCheck], { label: "反映先IDの再確認" });
    const confirmStatus = document.createElement("p");
    confirmStatus.className = "kus-rl-quiet";
    confirmStatus.setAttribute("aria-live", "polite");
    confirmCard.body.append(acknowledged.label, targetCheckRow, confirmStatus);
    let confirmedToken = "";
    function confirmationToken() {
      const state3 = getPreviewState();
      return state3.fresh ? JSON.stringify([state3.preview.signature, state3.preview.at, [...state3.scopes].sort()]) : "";
    }
    function clearConfirmation() {
      confirmedToken = "";
      acknowledged.checkbox.checked = false;
      targetCheck.value = "";
      confirmStatus.textContent = "反映先と変更内容を確認してチェックを入れてください。";
    }
    function highImpactReasons() {
      const { preview, scopes } = getPreviewState();
      const entries = preview?.result.entries.filter((entry) => scopes.includes(entry.sectionKey) && entry.status === "change") || [];
      const reasons = [];
      const removals = entries.reduce((sum, entry) => sum + entry.removalCount, 0);
      if (removals) reasons.push(`削除・置換される設定が ${removals} 件あります`);
      if (entries.some((entry) => RISKY_SCOPE_KEYS.has(entry.sectionKey))) reasons.push("権限・通知・プロセス管理の変更を含みます");
      if (!sourceBundleFromJson && srcApp.value.trim() === tgtApp.value.trim() && srcGuest.value.trim() === tgtGuest.value.trim()) reasons.push("同じアプリの本番設定でプレビューを更新します");
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
      renderReflectRoute(confirmBody, state3.preview.identities, sourceMode === "json" ? "設定JSON" : sourceEnvironment.value === "preview" ? "プレビュー" : "本番");
      const entries = state3.preview.result.entries.filter((entry) => state3.scopes.includes(entry.sectionKey) && entry.status === "change");
      const summary = document.createElement("p");
      summary.textContent = `反映する項目（${entries.length}）：${entries.map((entry) => entry.label).join("、")}`;
      confirmBody.appendChild(summary);
      const reasons = highImpactReasons();
      targetCheckRow.hidden = !reasons.length;
      if (reasons.length) {
        const note = document.createElement("p");
        note.className = "kus-rl-next kus-rl-next--warn";
        note.textContent = reasons.join("。") + "。反映先IDを入力して確認してください。";
        confirmBody.appendChild(note);
      }
      const removals = entries.flatMap((entry) => entry.changes.filter((change) => change.kind === "削除").map((change) => ({ label: entry.label, change })));
      if (removals.length) {
        const list = document.createElement("ul");
        list.className = "kus-rl-issues";
        for (const { label, change } of removals.slice(0, 30)) {
          const item = document.createElement("li");
          item.textContent = `${label} / ${change.path}：${change.before.slice(0, 180)}${change.before.length > 180 ? "…" : ""}`;
          list.appendChild(item);
        }
        if (removals.length > 30) {
          const item = document.createElement("li");
          item.textContent = `ほか ${removals.length - 30} 件。下の各項目の内訳、または反映計画JSONで全件を確認してください。`;
          list.appendChild(item);
        }
        confirmBody.appendChild(list);
      }
      const policy = document.createElement("p");
      policy.className = "kus-rl-quiet";
      policy.textContent = "反映前の設定JSONを自動保存します。実行直前に設定を再取得し、確認後の変更があれば中止します。途中エラーでは中断します。複数項目の一括取消はできません。本番公開はアプリ設定画面で行います。";
      confirmBody.appendChild(policy);
      for (const entry of entries) appendReflectChanges(confirmBody, entry);
      showWorkflowStage("confirm");
      refreshReviewCard();
    }
    confirmBtn.addEventListener("click", openConfirmation);
    for (const control of [acknowledged.checkbox, targetCheck]) control.addEventListener("input", () => {
      runBtn.disabled = busy || !confirmationReady();
      confirmStatus.textContent = confirmationReady() ? "確認が完了しました。下の反映ボタンから実行できます。" : "確認チェックと、表示されている場合は反映先IDの入力が必要です。";
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
        entries: state3.preview.result.entries.filter((entry) => state3.scopes.includes(entry.sectionKey)),
        baseline: state3.preview.result.baseline
      };
      const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = `プレビュー反映計画_App${tgtApp.value.trim()}.json`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 5e3);
    });
    const runBtn = makeButton("プレビュー反映を実行", "run");
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
      if (busy || runBtn.disabled || activeStage !== "confirm" || !confirmationReady()) return;
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
      const outcome = await liteRun(panel, "プレビュー反映 実行中…", async () => {
        let previewState = getPreviewState(scopes, lookupState);
        let previewResult = previewState.fresh ? previewState.preview?.result || null : null;
        if (!previewResult) {
          panel.setStatus("差分を再取得して、変更内容を確認してください。", "warn");
          return { cancelled: true };
        }
        const plan = getExecutionPlan(scopes, previewResult);
        if (!plan.effectiveScopes.length) {
          if (!previewResult.changedSections) {
            throw new Error("差分プレビューでは変更対象がありません。反映は実行しません。");
          }
          throw new Error(`現在の実行オプションでは実行対象が 0 件です。${buildSkipSummary(plan)}`);
        }
        if (selectionIssues(previewResult, scopes).length) throw new Error("確認できない項目が含まれています。差分確認へ戻ってください。");
        const applyOptions = { ...currentOptions(plan.effectiveScopes), reviewBaseline: previewResult.baseline, doDeploy: false, doBackup: true, stopOnError: true };
        clearConfirmation();
        logCard.card.style.display = "block";
        logPre.style.display = "block";
        logPre.textContent = "";
        showWorkflowStage("result");
        memoryState.lastPreview = null;
        memoryState.lastResult = null;
        renderLastResult();
        const applyOutcome = await runApplyPreviewStandalone(
          applyOptions,
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
          appId: applyOptions.targetAppId,
          guestId: applyOptions.targetGuestId,
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
      { id: "setup", number: "1", label: "対象を選ぶ", copy: "アプリと反映項目" },
      { id: "review", number: "2", label: "差分を確認", copy: "変更前・変更後" },
      { id: "confirm", number: "3", label: "最終確認", copy: "反映先と変更を確定" },
      { id: "result", number: "4", label: "反映結果", copy: "結果と次の操作" }
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
        const current = stageDefs.findIndex((item) => item.id === def.id);
        const direction = event.key === "ArrowRight" ? 1 : -1;
        const next = stageDefs[event.key === "Home" ? 0 : event.key === "End" ? stageDefs.length - 1 : (current + direction + stageDefs.length) % stageDefs.length];
        if (next.id === "confirm") openConfirmation();
        else showWorkflowStage(next.id);
      });
    }
    stages.setup.innerHTML = '<header class="kus-rl-stage-head"><h2>どの設定を、どこへ反映しますか？</h2><p>比較元と比較先を指定し、反映したい項目を選びます。</p></header>';
    stages.review.innerHTML = '<header class="kus-rl-stage-head"><h2>差分と実行予定を確認</h2><p>実際に変更されるセクションと注意点を確認します。</p></header>';
    stages.confirm.innerHTML = '<header class="kus-rl-stage-head"><h2>書き込み先と内容の最終確認</h2><p>この画面で確認した条件だけを実行します。</p></header>';
    stages.confirm.appendChild(confirmCard.card);
    stages.result.innerHTML = '<header class="kus-rl-stage-head"><h2>実行結果と次の操作</h2><p>成功・失敗と、再実行が必要なセクションを確認します。</p></header>';
    const setupGrid = document.createElement("div");
    setupGrid.className = "kus-rl-setup-grid";
    [cardApp.card, cardScope.card].forEach((node) => setupGrid.appendChild(node));
    const advanced = makeDetails("詳細設定 · バックアップ・エラー時の動作・参照先変換");
    advanced.details.classList.add("kus-rl-advanced");
    advanced.body.appendChild(cardOpt.card);
    const presetDetails = makeDetails("よく使う設定を保存・読み込み");
    presetDetails.details.classList.add("kus-rl-advanced");
    presetDetails.body.appendChild(cardPreset.card);
    setupGrid.append(advanced.details, presetDetails.details);
    stages.setup.appendChild(setupGrid);
    [reviewCard.card, previewCard.card].forEach((node) => stages.review.appendChild(node));
    [lastResultCard.card, logCard.card].forEach((node) => stages.result.appendChild(node));
    const resultEmpty = document.createElement("div");
    resultEmpty.className = "kus-rl-preview-empty";
    resultEmpty.textContent = "まだ反映していません。対象を選び、差分を確認してから反映してください。";
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
    let activeStage = "setup";
    const noInputSubmit = document.createElement("button");
    noInputSubmit.disabled = true;
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
      setButtonText(nextBtn, fresh ? "確認した差分へ進む" : "差分を確認する");
      setButtonText(previewBtn, "差分を再取得");
      previewBtn.classList.toggle("kus-lp__btn--primary", !fresh);
      previewBtn.classList.toggle("kus-lp__btn--sub", fresh);
      resultEmpty.hidden = !!memoryState.lastResult || logCard.card.style.display !== "none";
      let message = `${scopes.length} 項目を比較します。書き込みは行いません。`;
      if (activeStage === "review") message = !fresh ? "差分の取得が必要です。" : confirmBtn.disabled ? "確認が必要な項目、または変更の有無を確認してください。" : `${plan?.effectiveScopes.length} 項目の内容を確認し、最終確認へ進んでください。`;
      if (activeStage === "confirm") message = fresh && confirmedToken ? "反映前バックアップを自動保存 / エラー時は中断 / 本番公開は行いません" : "条件が変わりました。差分の取得と最終確認をやり直してください。";
      if (activeStage === "result") message = "結果を確認してください。再実行には差分の再取得が必要です。";
      const sourceLabel = fresh && preview?.identities ? reflectIdentityLabel(preview.identities, "source", sourceMode === "json" ? "JSON" : sourceEnvironment.value === "preview" ? "プレビュー" : "本番") : `反映元 #${srcApp.value.trim() || "未入力"}`;
      const targetLabel = fresh && preview?.identities ? reflectIdentityLabel(preview.identities, "target", "") : `反映先 #${tgtApp.value.trim() || "未入力"} / プレビュー`;
      dockCopy.innerHTML = activeStage === "confirm" && fresh && preview?.identities ? `<strong>書き込み先 #${escapeHtml(preview.identities.target.appId)} · プレビュー</strong>${escapeHtml(confirmedToken ? "内容を確認してから反映してください。" : "条件が変わりました。差分を再取得してください。")}` : `<strong>${escapeHtml(sourceLabel)} → ${escapeHtml(targetLabel)}</strong>${escapeHtml(message)}`;
      panel.result.hidden = activeStage === "confirm";
      const advancedSummary = advanced.details.querySelector("summary");
      if (advancedSummary) advancedSummary.textContent = "詳細設定 · 自動バックアップ / 参照先変換";
      panel.setPrimaryAction(activeStage === "setup" ? nextBtn : activeStage === "review" ? fresh ? confirmBtn : previewBtn : noInputSubmit);
    };
    showWorkflowStage = (active) => {
      if (active === "confirm" && !confirmedToken) return;
      if (activeStage === "confirm" && active !== "confirm") clearConfirmation();
      activeStage = active;
      stageDefs.forEach((def) => {
        const selected = def.id === active;
        stages[def.id].hidden = !selected;
        navButtons[def.id].setAttribute("aria-selected", String(selected));
        navButtons[def.id].tabIndex = selected ? 0 : -1;
      });
      navButtons[active].focus({ preventScroll: true });
      canvas.scrollTo({ top: 0 });
      refreshWorkflow();
    };
    const setPanelBusy = panel.setBusy;
    const disabledBefore = /* @__PURE__ */ new Map();
    panel.setBusy = (value) => {
      busy = value;
      panel.root.setAttribute("aria-busy", String(value));
      workspace.inert = value;
      if (value) {
        panel.root.querySelectorAll("input,button,select,textarea").forEach((control) => {
          disabledBefore.set(control, control.disabled);
          control.disabled = true;
        });
      } else {
        disabledBefore.forEach((disabled, control) => {
          control.disabled = disabled;
        });
        disabledBefore.clear();
        refreshSrcJsonNote();
        refreshPresetSelect();
        refreshReviewCard();
        navButtons[activeStage].focus({ preventScroll: true });
      }
      setPanelBusy(value);
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
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return { ok: false, error: '参照先変換は {"旧AppID":"新AppID"} 形式のJSONを入力してください。' };
      const out = /* @__PURE__ */ Object.create(null);
      for (const [k, v] of Object.entries(parsed || {})) {
        if (!/^[1-9]\d*$/.test(k) || !/^[1-9]\d*$/.test(String(v))) return { ok: false, error: "参照先変換のアプリIDには正の整数を指定してください。" };
        out[k] = String(v);
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
    groups.sort((a, b) => ["error", "change", "same"].indexOf(a.tone) - ["error", "change", "same"].indexOf(b.tone));
    for (const group of groups) {
      if (!group.entries.length) continue;
      const collapsed = group.tone === "same" && opts.statusFilter === "all" && !opts.searchKeyword;
      const wrap = document.createElement(collapsed ? "details" : "section");
      wrap.className = "kus-rl-preview-group";
      const headTag = collapsed ? "summary" : "div";
      wrap.innerHTML = `<${headTag} class="kus-rl-preview-group__head"><span>${escapeHtml(group.title)}${collapsed ? " · 開いて確認" : ""}</span><span>${group.entries.length} 件</span></${headTag}>`;
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
        list.appendChild(row);
      }
      wrap.appendChild(list);
      host.appendChild(wrap);
    }
  }

  // src/entries/reflect-lite-entry.ts
  runOnKintonePage(mountReflectLitePanel);
})();
