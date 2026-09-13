// ==========================================================================
// kintoneレコード取得.js  —  自動生成ファイル（手編集禁止）
// ==========================================================================
// このファイルは tools/統合ツール/ の npm run build (esbuild) で生成されます。
// ソース: tools/統合ツール/src/entries/record-lite-entry.js
//         tools/統合ツール/src/tabs/record.js  ← 機能の正規実装
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
  var TOOL_ID, EXTERNAL_LIBRARIES, DEFAULT_APP_ID, DIALOG_STATE_KEY, SECTION_DEFS, META_KEYS, DEFAULT_SUBTAB_STATE, TOUR_STEP_CONNECTION, TOUR_STEP_SCOPE, TOUR_STEP_NOISE, TOUR_STEP_RUN_DIFF, TOUR_STEP_REVIEW, TOUR_STEP_CATEGORY_VIEW, TOUR_STEP_PLAN, TOUR_STEP_APPLY, TOUR_STEP_RECORD, GUIDED_TOUR_COURSES, GUIDED_TOUR_STEPS;
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
  function downloadBlob(filename, blob) {
    triggerDownload(filename, blob);
  }
  var init_utils = __esm({
    "src/utils.ts"() {
      "use strict";
      init_constants();
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

  // src/kintone-query.ts
  function querySyntaxText(query) {
    const text = String(query || "");
    let syntax = "";
    let quoted = false;
    for (let index = 0; index < text.length; index++) {
      const char = text[index];
      if (quoted) {
        if (char === "\\" && index + 1 < text.length) index++;
        else if (char === '"') quoted = false;
        syntax += " ";
        continue;
      }
      if (char === '"') {
        quoted = true;
        syntax += " ";
      } else {
        syntax += char;
      }
    }
    return syntax;
  }
  function hasKintoneOrderByClause(query) {
    return /\border\s+by\b/i.test(querySyntaxText(query));
  }
  function hasKintonePagingClause(query) {
    const syntax = querySyntaxText(query);
    return /\blimit\s+\d+/i.test(syntax) || /\boffset\s+\d+/i.test(syntax);
  }
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
  async function apiDelete(prefix, path, body) {
    assertAllowsMutatingRestCall(prefix, path, "DELETE");
    try {
      return await kintone.api(`${prefix}${path}`, "DELETE", body);
    } catch (e) {
      throw apiErrorWithContext(e, { method: "DELETE", prefix, path, payload: body });
    }
  }
  function isRevisionConflictError(error) {
    if (!error) return false;
    const codes = [error?.code, error?.original?.code, error?.original?.error?.code].map((c) => String(c || "").toUpperCase()).filter(Boolean);
    if (codes.some((c) => REVISION_CONFLICT_CODES.has(c))) return true;
    const text = String(error?.message || "");
    return /GAIA_CO02|リビジョン.*(最新|一致|異な)|revision.*(latest|mismatch|conflict)/i.test(text);
  }
  function throwIfPagingClause(query) {
    if (hasKintonePagingClause(query)) {
      throw new Error("クエリ内の limit/offset はページング動作と競合します。limit/offset を取り除いて再実行してください。");
    }
  }
  async function fetchRecordsByQuery(prefix, app, query, options = {}) {
    const base = String(query || "").trim();
    throwIfPagingClause(base);
    const fields = Array.isArray(options.fields) && options.fields.length ? options.fields : void 0;
    const onProgress = typeof options.onProgress === "function" ? options.onProgress : () => {
    };
    const useCursor = hasKintoneOrderByClause(base);
    const limit = 500;
    if (!useCursor) {
      const all2 = [];
      let lastId = 0;
      while (true) {
        const cond = `$id > ${lastId}`;
        const q = base ? `(${base}) and ${cond} order by $id asc limit ${limit}` : `${cond} order by $id asc limit ${limit}`;
        const params = { app, query: q };
        if (fields) params.fields = fields.includes("$id") ? fields : [...fields, "$id"];
        const resp = await apiGet(prefix, "/records.json", params);
        const batch = Array.isArray(resp?.records) ? resp.records : [];
        if (!batch.length) break;
        all2.push(...batch);
        onProgress(all2.length, "keyset");
        const nextId = Number(batch[batch.length - 1]?.$id?.value);
        if (!Number.isFinite(nextId) || nextId <= lastId) {
          throw new Error("レコードIDの取得順が想定と異なるため中断しました（$id を fields に含めてください）");
        }
        lastId = nextId;
        if (batch.length < limit) break;
      }
      return { records: all2, mode: "keyset" };
    }
    const createBody = { app, query: base, size: limit };
    if (fields) createBody.fields = fields;
    const created = await apiPost(prefix, "/records/cursor.json", createBody);
    const cursorId = String(created?.id || "");
    if (!cursorId) throw new Error("cursor の作成に失敗しました（id が返りません）");
    const all = [];
    let finished = false;
    try {
      while (true) {
        const resp = await apiGet(prefix, "/records/cursor.json", { id: cursorId });
        const batch = Array.isArray(resp?.records) ? resp.records : [];
        all.push(...batch);
        onProgress(all.length, "cursor");
        if (!resp?.next) {
          finished = true;
          break;
        }
      }
    } finally {
      if (!finished) {
        try {
          await apiDelete(prefix, "/records/cursor.json", { id: cursorId });
        } catch {
        }
      }
    }
    return { records: all, mode: "cursor" };
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
  var tabSequence = 0;
  function makeTabs(specs, opts = {}) {
    const bar = document.createElement("div");
    bar.className = "kus-lp__tabs";
    bar.setAttribute("role", "tablist");
    const panels = document.createElement("div");
    panels.className = "kus-lp__tab-panels";
    const tabBtns = [];
    const tabPanels = [];
    function activate(id) {
      specs.forEach((spec, i) => {
        const on = spec.id === id;
        tabBtns[i].setAttribute("aria-selected", on ? "true" : "false");
        tabBtns[i].tabIndex = on ? 0 : -1;
        tabPanels[i].hidden = !on;
      });
    }
    specs.forEach((spec) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "kus-lp__tab";
      btn.setAttribute("role", "tab");
      btn.textContent = spec.label;
      btn.dataset.tab = spec.id;
      let tabId;
      do {
        tabId = `kus-lite-tab-${++tabSequence}`;
      } while (document.getElementById(tabId));
      btn.id = tabId;
      btn.setAttribute("aria-controls", `${tabId}-panel`);
      btn.addEventListener("click", () => activate(spec.id));
      btn.addEventListener("keydown", (event) => {
        if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
        event.preventDefault();
        const index = specs.indexOf(spec);
        const next = event.key === "Home" ? 0 : event.key === "End" ? specs.length - 1 : (index + (event.key === "ArrowRight" ? 1 : specs.length - 1)) % specs.length;
        activate(specs[next].id);
        tabBtns[next].focus();
      });
      bar.appendChild(btn);
      tabBtns.push(btn);
      const panel = document.createElement("div");
      panel.className = "kus-lp__tab-panel";
      panel.setAttribute("role", "tabpanel");
      panel.id = `${tabId}-panel`;
      panel.setAttribute("aria-labelledby", tabId);
      panel.hidden = true;
      spec.build(panel);
      panels.appendChild(panel);
      tabPanels.push(panel);
    });
    const initial = specs.find((spec) => spec.id === opts.initial)?.id || specs[0]?.id;
    if (initial) activate(initial);
    return { bar, panels };
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

  // src/entries/liteWorkflow.ts
  var CSS2 = `
.kus-wf.kus-lp{width:min(920px,calc(100vw - 32px));max-height:calc(100dvh - 32px);top:16px;right:16px;border-radius:18px}
.kus-wf .kus-lp__hero{background:#172033;padding:16px 22px}
.kus-wf .kus-lp__badge-row{display:none}
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
.kus-wf-nav button{font-family:inherit;font-size:12px;font-weight:600;line-height:1.4;border:1px solid #e2e8f0;padding:10px;border-radius:9px;background:#fff;color:#475569;cursor:pointer}
.kus-wf-nav button[aria-selected=true],.kus-wf-nav button[aria-current=step]{background:#eff6ff;border-color:#93c5fd;color:#1d4ed8}
.kus-wf-nav button:disabled{opacity:.5;cursor:not-allowed}
.kus-wf-canvas{overflow:auto;min-height:0;min-width:0;flex:1;padding:18px 22px;scroll-padding:16px}
.kus-wf-stage{min-width:0}
.kus-wf-heading{margin:0 0 4px;font-size:19px;color:#0f172a}
.kus-wf-intro{margin:0 0 16px;color:#64748b;font-size:12px}
.kus-wf-actions{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:8px;margin-bottom:16px}
.kus-wf-action{padding:12px;border:1px solid #cbd5e1;border-radius:10px;background:white;cursor:pointer;display:grid;grid-template-columns:18px 1fr;gap:8px;font-size:12px;min-width:0;align-items:start}
.kus-wf-action:has(input:checked){border-color:#60a5fa;background:#eff6ff}
.kus-wf-action strong{display:block;color:#0f172a}
.kus-wf-action small{display:block;margin-top:3px;color:#64748b;line-height:1.5}
.kus-wf-action em{display:inline-block;font-size:10px;font-style:normal;color:#9a3412;margin-top:5px}
.kus-wf-summary{margin:0;background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:4px 16px}
.kus-wf-summary>div{display:grid;grid-template-columns:140px minmax(0,1fr);gap:16px;padding:12px 0;border-bottom:1px solid #eef2f6}
.kus-wf-summary>div:last-child{border:0}
.kus-wf-summary dt{color:#64748b;font-size:12px}
.kus-wf-summary dd{margin:0;white-space:pre-wrap;overflow-wrap:anywhere;color:#0f172a;font-size:13px}
.kus-wf-notice{padding:12px;border:1px solid #bfdbfe;background:#eff6ff;border-radius:10px;margin:14px 0;color:#1e40af;font-size:12px;overflow-wrap:anywhere;white-space:pre-wrap}
.kus-wf-notice[data-write=true]{border-color:#fed7aa;background:#fff7ed;color:#9a3412}
.kus-wf-footer{padding:12px 22px;background:#fff;border-top:1px solid #e2e8f0;flex-shrink:0}
.kus-wf-footer-row{display:flex;align-items:center;gap:12px}
.kus-wf-footer-copy{flex:1;min-width:0;font-size:12px;color:#475569;overflow-wrap:anywhere}
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
 .kus-wf-nav button{padding:9px 3px;font-size:11px}
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
      choices.appendChild(label);
      hiddenActions.appendChild(action.button);
    });
    if (options.actions.length > 1) setup.appendChild(choices);
    setup.append(...options.setup);
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
    let active = 0;
    let busy = false;
    let pending = null;
    let reviewedSignature = "";
    let lastContext = "";
    const signature = () => JSON.stringify([selected.id, selected.summary(), Array.from(setup.querySelectorAll("input,select,textarea")).map((input) => [input.value, input instanceof HTMLInputElement ? input.checked : null, input instanceof HTMLInputElement && input.files ? Array.from(input.files).map((file) => [file.name, file.size, file.lastModified]) : null])]);
    function show(index) {
      if (busy) return;
      const problem = index === 1 ? selected.validate() : "";
      if (problem) {
        panel.setStatus(problem, "warn");
        return;
      }
      active = index;
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
        stage.hidden = i !== active;
        tabs[i].setAttribute("aria-selected", String(i === active));
        tabs[i].tabIndex = i === active ? 0 : -1;
      });
      canvas.scrollTop = 0;
      tabs[index].focus({ preventScroll: true });
      refresh();
    }
    function refresh() {
      const problem = busy ? "" : selected.validate();
      const fresh = !busy && active === 1 && reviewedSignature === signature();
      next.hidden = active !== 0;
      execute.hidden = active !== 1;
      back.hidden = active === 0;
      next.disabled = busy || !!problem;
      execute.disabled = busy || !!problem || !fresh;
      execute.textContent = selected.label;
      execute.classList.toggle("kus-lp__btn--danger", !!selected.writes);
      tabs[1].disabled = busy || !!problem;
      footerCopy.textContent = busy ? "処理中です。完了すると結果を表示します。" : problem || (active === 0 ? `${selected.label} · 対象と条件を確認してください。` : active === 1 ? fresh ? "表示内容を確認し、実行してください。" : "条件が変わりました。対象・条件に戻って確認してください。" : "結果を確認してから、次の操作へ進めます。");
      notice.dataset.write = String(!!selected.writes);
      notice.textContent = selected.description + (selected.writes ? "\n書き込み先と内容を確認してください。続いて、変更内容の最終確認が表示されます。" : "\nアプリ設定やレコードの書き込みは行いません。");
      panel.setPrimaryAction(next);
    }
    back.addEventListener("click", () => show(0));
    next.addEventListener("click", () => show(1));
    function finish() {
      if (!pending) return;
      const status = panel.status.querySelector(".kus-lp__status-text")?.textContent || "";
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
    for (const event of ["input", "change", "click"]) setup.addEventListener(event, scheduleRefresh);
    selected.onSelect?.();
    show(0);
    return { refresh, show };
  }

  // src/entries/record-lite-ui.ts
  init_constants();

  // src/tabs/record-standalone.ts
  init_utils();
  init_api();

  // src/jszipLoader.ts
  init_constants();
  var loadPromise = null;
  var failedScripts = /* @__PURE__ */ new WeakSet();
  var JSZIP_LOAD_TIMEOUT_MS = 3e4;
  function loadJSZipLite() {
    const w = window;
    if (w.JSZip) return Promise.resolve(w.JSZip);
    if (loadPromise) return loadPromise;
    const src = EXTERNAL_LIBRARIES.jszip.cdnUrl || "";
    loadPromise = new Promise((resolve, reject) => {
      const existing = Array.from(document.querySelectorAll(`script[src="${src}"]`)).find((script2) => !failedScripts.has(script2));
      const script = existing || document.createElement("script");
      let settled = false;
      let timer;
      const cleanup = () => {
        if (timer !== void 0) clearTimeout(timer);
        script.removeEventListener("load", settle);
        script.removeEventListener("error", onError);
      };
      const fail = (error) => {
        if (settled) return;
        settled = true;
        cleanup();
        failedScripts.add(script);
        if (!existing) script.remove();
        reject(error);
      };
      const settle = () => {
        if (settled) return;
        const ctor = w.JSZip;
        if (!ctor) {
          fail(new Error("JSZipのロード後もグローバル変数が見つかりません"));
          return;
        }
        settled = true;
        cleanup();
        resolve(ctor);
      };
      const onError = () => fail(new Error(`JSZipの読み込みに失敗しました（${src}）。CSP やネットワーク制限を確認してください`));
      script.addEventListener("load", settle, { once: true });
      script.addEventListener("error", onError, { once: true });
      timer = setTimeout(() => {
        if (w.JSZip) settle();
        else fail(new Error("JSZipの読み込みが30秒以内に完了しませんでした。CSP やネットワーク制限を確認して再試行してください"));
      }, JSZIP_LOAD_TIMEOUT_MS);
      if (!existing) {
        try {
          script.src = src;
          script.async = true;
          document.head.appendChild(script);
        } catch (error) {
          fail(error instanceof Error ? error : new Error(String(error)));
        }
      }
    }).catch((error) => {
      loadPromise = null;
      throw error;
    });
    return loadPromise;
  }

  // src/tabs/record-query.ts
  init_kintone_query();
  var RECORDS_WRITE_CHUNK = 100;
  function csvEscape(val) {
    const s = String(val == null ? "" : val);
    return s.includes(",") || s.includes('"') || s.includes("\n") || s.includes("\r") ? '"' + s.replace(/"/g, '""') + '"' : s;
  }
  function extractRecordCsvValue(rec, code) {
    const f = rec?.[code];
    if (!f) return "";
    const type = String(f.type || "");
    if (type === "USER_SELECT" || type === "ORGANIZATION_SELECT" || type === "GROUP_SELECT") {
      return (Array.isArray(f.value) ? f.value : []).map((v) => v?.code || v?.name || "").join(",");
    }
    if (type === "CHECK_BOX" || type === "MULTI_SELECT") return (Array.isArray(f.value) ? f.value : []).join(",");
    if (type === "FILE") return (Array.isArray(f.value) ? f.value : []).map((file) => file?.name || "").join(",");
    if (type === "SUBTABLE") return `${(Array.isArray(f.value) ? f.value : []).length}行`;
    if (typeof f.value === "object" && f.value !== null) return JSON.stringify(f.value);
    return f.value == null ? "" : String(f.value);
  }
  function buildRecordsCsvText(records, propKeys) {
    const lines = [propKeys.map(csvEscape).join(",")];
    for (const rec of records) lines.push(propKeys.map((k) => csvEscape(extractRecordCsvValue(rec, k))).join(","));
    return "\uFEFF" + lines.join("\n");
  }
  function sanitizeZipSegment(value, fallback = "item") {
    const cleaned = String(value == null ? "" : value).replace(/[\\/:*?"<>|]/g, "_").replace(/[\u0000-\u001f]/g, "").trim();
    return !cleaned || /^\.+$/.test(cleaned) ? fallback : cleaned;
  }
  function uniqueZipName(used, raw, fileKey, idx) {
    const safeName = sanitizeZipSegment(raw || "file.bin", "file.bin");
    const safePrefix = sanitizeZipSegment(String(fileKey || "").slice(0, 12) || String(idx + 1), "file");
    return uniqueZipEntryName(used, `${safePrefix}_${safeName}`);
  }
  function uniqueZipEntryName(used, base) {
    let cand = base;
    let n = 2;
    while (used.has(cand)) {
      const dot = base.lastIndexOf(".");
      cand = dot > 0 ? `${base.slice(0, dot)}_${n}${base.slice(dot)}` : `${base}_${n}`;
      n++;
    }
    used.add(cand);
    return cand;
  }
  function describeBatchWriteFailure(label, failure, error) {
    const reason = error instanceof Error ? error.message : String(error ?? "");
    const remaining = Math.max(0, failure.total - failure.done);
    return [
      `${label}が途中で失敗しました。`,
      `確定済み: ${failure.done}件 / 失敗チャンク: ${failure.from}～${failure.to}件目 / 未処理: ${remaining}件（全${failure.total}件）`,
      reason ? `原因: ${reason}` : ""
    ].filter(Boolean).join("\n");
  }
  async function writeInChunks(items, label, writeChunk, onProgress, chunkSize = RECORDS_WRITE_CHUNK) {
    const size = Math.max(1, Math.floor(chunkSize) || RECORDS_WRITE_CHUNK);
    let done = 0;
    for (let i = 0; i < items.length; i += size) {
      const chunk = items.slice(i, i + size);
      try {
        await writeChunk(chunk, Math.floor(i / size));
      } catch (error) {
        const wrapped = new Error(describeBatchWriteFailure(label, { done, from: i + 1, to: i + chunk.length, total: items.length }, error));
        wrapped.partial = { done, from: i + 1, to: i + chunk.length, total: items.length };
        wrapped.original = error;
        throw wrapped;
      }
      done += chunk.length;
      if (onProgress) onProgress(done, items.length);
    }
    return done;
  }

  // src/tabs/record-csv-export.ts
  var DETAIL_ID_COLUMNS = ["$id", "$rowId", "$rowIndex"];
  function tableFileName(fieldCode, used) {
    let stem = sanitizeZipSegment(fieldCode, "table").normalize("NFC").replace(/[\u007f-\u009f\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069]/g, "").replace(/^\.+|[. ]+$/g, "");
    stem = Array.from(stem).slice(0, 50).join("").replace(/[. ]+$/g, "") || "table";
    if (/^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(stem)) stem = `_${stem}`;
    const canonicalStem = stem.toLowerCase();
    const unique = uniqueZipEntryName(used, `${canonicalStem}.csv`);
    const suffix = unique.slice(canonicalStem.length, -".csv".length);
    return `tables/${stem}${suffix}.csv`;
  }
  function parentRecordId(record, index) {
    const value = record?.$id?.value;
    if (typeof value !== "string" && typeof value !== "number" || !String(value).trim() || typeof value === "number" && !Number.isFinite(value)) {
      throw new Error(`${index + 1}件目のレコードID（$id）がありません。サブテーブル明細を親レコードへ紐付けられないためCSV出力を中止しました。`);
    }
    return String(value);
  }
  function buildRecordCsvExport(records, properties) {
    const parentColumns = Object.keys(properties || {});
    const tableFields = /* @__PURE__ */ new Map();
    for (const code of parentColumns) {
      if (properties[code]?.type === "SUBTABLE") tableFields.set(code, properties[code].fields || {});
    }
    for (const record of records) {
      for (const [code, field] of Object.entries(record || {})) {
        if (field?.type !== "SUBTABLE" || tableFields.has(code)) continue;
        if (Object.prototype.hasOwnProperty.call(properties || {}, code)) {
          throw new Error(`フィールド ${code} の設定と取得レコードの型が一致しません。フィールド情報とレコードを取得し直してください。`);
        }
        tableFields.set(code, {});
        parentColumns.push(code);
      }
    }
    if (!tableFields.size) return { parentCsv: buildRecordsCsvText(records, parentColumns), tables: [], warnings: [] };
    const recordIds = records.map(parentRecordId);
    const warnings = [];
    const tables = [];
    const usedNames = /* @__PURE__ */ new Set();
    for (const [fieldCode, childProperties] of tableFields) {
      const childColumns = new Set(Object.keys(childProperties));
      const detailRecords = [];
      records.forEach((record, recordIndex) => {
        const parentId = recordIds[recordIndex];
        const field = Object.prototype.hasOwnProperty.call(record || {}, fieldCode) ? record[fieldCode] : void 0;
        if (field == null) {
          warnings.push(`レコードID ${parentId}: テーブル ${fieldCode} を取得できませんでした（閲覧権限などを確認してください）。空テーブルとは区別して明細を省略しています。`);
          return;
        }
        if (field.type !== "SUBTABLE" || !Array.isArray(field.value)) {
          throw new Error(`レコードID ${parentId}: テーブル ${fieldCode} の型または行データが不正なためCSV出力を中止しました。`);
        }
        field.value.forEach((row, rowIndex) => {
          if (!row || typeof row.value !== "object" || row.value === null || Array.isArray(row.value)) {
            throw new Error(`レコードID ${parentId}: テーブル ${fieldCode} の${rowIndex + 1}行目の値が不正なためCSV出力を中止しました。`);
          }
          Object.keys(row.value).forEach((code) => childColumns.add(code));
          detailRecords.push({
            ...row.value,
            $id: { value: parentId },
            $rowId: { value: row.id ?? "" },
            $rowIndex: { value: rowIndex + 1 }
          });
        });
      });
      const collision = DETAIL_ID_COLUMNS.find((code) => childColumns.has(code));
      if (collision) {
        throw new Error(`テーブル ${fieldCode} の子フィールド ${collision} が明細の識別列と重複するためCSV出力を中止しました。`);
      }
      tables.push({
        fieldCode,
        fileName: tableFileName(fieldCode, usedNames),
        csvText: buildRecordsCsvText(detailRecords, [...DETAIL_ID_COLUMNS, ...childColumns]),
        rowCount: detailRecords.length
      });
    }
    return {
      parentCsv: buildRecordsCsvText(records, ["$id", ...parentColumns.filter((code) => code !== "$id")]),
      tables,
      warnings
    };
  }

  // src/tabs/record-metadata.ts
  function isObject(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
  }
  function readRecordViews(response) {
    if (!isObject(response?.views)) throw new Error("一覧設定の応答が不正です。再取得してください");
    return Object.entries(response.views).flatMap(([name, view]) => {
      if (!isObject(view) || !["LIST", "CALENDAR", "CUSTOM"].includes(view.type)) return [];
      const filter = String(view.filterCond || "").trim();
      const sort = String(view.sort || "").trim();
      return [{
        id: String(view.id ?? name),
        name: String(view.name || name),
        type: view.type,
        index: Number(view.index) || 0,
        filter,
        sort,
        query: [filter, sort ? `order by ${sort}` : ""].filter(Boolean).join(" ")
      }];
    }).sort((a, b) => a.index - b.index);
  }
  function readAttachmentFields(response) {
    if (!isObject(response?.properties)) throw new Error("フィールド設定の応答が不正です。再取得してください");
    const choices = [];
    for (const [key, field] of Object.entries(response.properties)) {
      if (!isObject(field)) continue;
      const code = String(field.code || key);
      const label = String(field.label || code);
      if (field.type === "FILE") choices.push({ fileFieldCode: code, fileLabel: label, tableFieldCode: "", tableLabel: "" });
      if (field.type !== "SUBTABLE" || !isObject(field.fields)) continue;
      for (const [childKey, child] of Object.entries(field.fields)) {
        if (!isObject(child) || child.type !== "FILE") continue;
        const childCode = String(child.code || childKey);
        choices.push({ fileFieldCode: childCode, fileLabel: String(child.label || childCode), tableFieldCode: code, tableLabel: label });
      }
    }
    return choices;
  }

  // src/tabs/record-csv-import.ts
  var SUPPORTED = /* @__PURE__ */ new Set([
    "SINGLE_LINE_TEXT",
    "MULTI_LINE_TEXT",
    "RICH_TEXT",
    "NUMBER",
    "LINK",
    "RADIO_BUTTON",
    "DROP_DOWN",
    "CHECK_BOX",
    "MULTI_SELECT",
    "DATE",
    "TIME",
    "DATETIME",
    "USER_SELECT",
    "ORGANIZATION_SELECT",
    "GROUP_SELECT"
  ]);
  var enabled = (value) => value === true || value === "true";
  var has = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
  var writable = (field) => SUPPORTED.has(String(field?.type || "")) && !field?.expression;
  function csvImportUnsupportedFields(properties) {
    const targets = new Set(Object.values(properties).flatMap((field) => (field?.lookup?.fieldMappings || []).map((mapping) => String(mapping.field))));
    return new Map(Object.entries(properties).filter(([code, field]) => !writable(field) || targets.has(code)).map(([code, field]) => [code, `${String(field?.type || "不明な種類")}${field?.expression ? "・自動計算" : ""}${targets.has(code) ? "・ルックアップのコピー先" : ""}`]));
  }
  function splitCsvListValue(value) {
    const text = String(value ?? "").trim();
    return text ? text.split(",").map((item) => item.trim()).filter(Boolean) : [];
  }
  function coerceCsvImportValue(rawValue, fieldDef) {
    const type = String(fieldDef?.type || "");
    if (type === "CHECK_BOX" || type === "MULTI_SELECT") return splitCsvListValue(rawValue);
    if (["USER_SELECT", "ORGANIZATION_SELECT", "GROUP_SELECT"].includes(type)) return splitCsvListValue(rawValue).map((code) => ({ code }));
    return type === "NUMBER" ? String(rawValue ?? "").trim() : rawValue;
  }
  function validateCsvImportHeader(header, properties) {
    if (header.includes("$id")) throw new Error("CSV内にシステムフィールド（$idなど）が含まれています。インポート時は除外してください。");
    if (!header.length || header.some((code) => !code)) throw new Error("CSVヘッダに空の列があります。すべての列にフィールドコードを指定してください。");
    const duplicate = header.filter((code, index) => header.indexOf(code) !== index);
    if (duplicate.length) throw new Error(`CSVヘッダが重複しています: ${[...new Set(duplicate)].join(", ")}`);
    const unknown = header.filter((code) => !has(properties, code));
    if (unknown.length) throw new Error(`CSVヘッダに存在しないフィールドコードがあります: ${unknown.join(", ")}`);
    const excluded = csvImportUnsupportedFields(properties);
    const unsupported = header.filter((code) => excluded.has(code)).map((code) => `${code}(${excluded.get(code)})`);
    if (unsupported.length) throw new Error(`CSVインポート非対応のフィールドが含まれています: ${unsupported.join(", ")}`);
  }
  function parseCsvText(csv) {
    const rows = [];
    let current = [];
    let cell = "";
    let quoted = false;
    let closed = false;
    const error = (message) => new Error(`CSV ${rows.length + 1}行目・${current.length + 1}列目: ${message}`);
    const pushCell = () => {
      current.push(cell);
      cell = "";
      closed = false;
    };
    for (let i = 0; i < csv.length; i++) {
      const char = csv[i];
      if (quoted) {
        if (char === '"' && csv[i + 1] === '"') {
          cell += '"';
          i++;
        } else if (char === '"') {
          quoted = false;
          closed = true;
        } else cell += char;
        continue;
      }
      if (char === ",") pushCell();
      else if (char === "\r" || char === "\n") {
        if (char === "\r" && csv[i + 1] === "\n") i++;
        pushCell();
        rows.push(current);
        current = [];
      } else if (char === '"' && !cell && !closed) quoted = true;
      else {
        if (char === '"' || closed) throw error("ダブルクォートの位置が不正です");
        cell += char;
      }
    }
    if (quoted) throw error("ダブルクォートが閉じられていません");
    if (cell || current.length || closed) {
      pushCell();
      rows.push(current);
    }
    return rows;
  }
  function planCsvImport(rows, properties) {
    if (!properties || typeof properties !== "object" || Array.isArray(properties)) throw new Error("フィールド設定の応答が不正です");
    if (rows.length < 2) throw new Error("ヘッダ行とデータ行が必要です");
    const header = rows[0].map((code) => code.trim());
    validateCsvImportHeader(header, properties);
    const columns = header.map((code) => ({ code, label: String(properties[code].label || code), type: String(properties[code].type || "") }));
    const records = [], issues = [], sample = [];
    let issueCount = 0, count = 0;
    const issue = (row, field, message) => {
      issueCount++;
      if (issues.length < 100) issues.push({ row, field, message });
    };
    const mapped = new Set(header.flatMap((code) => (properties[code]?.lookup?.fieldMappings || []).map((mapping) => String(mapping.field))));
    for (const [code, field] of Object.entries(properties)) {
      const defaultValue = field?.defaultValue;
      const hasDefault = enabled(field?.defaultNowValue) || (Array.isArray(defaultValue) ? defaultValue.length > 0 : defaultValue !== void 0 && defaultValue !== null && String(defaultValue) !== "");
      if (enabled(field?.required) && writable(field) && !header.includes(code) && !mapped.has(code) && !hasDefault) {
        issue(1, `${field.label || code}［${code}］`, "必須フィールドの列がなく、初期値もありません");
      }
    }
    const seenValues = /* @__PURE__ */ new Map();
    for (let index = 1; index < rows.length; index++) {
      const values = rows[index], row = index + 1;
      if (values.length === 1 && values[0] === "") continue;
      count++;
      if (sample.length < 5) sample.push({ row, values: values.slice(0, 6).map((value) => value.length > 120 ? value.slice(0, 120) + "…" : value) });
      if (values.length !== header.length) {
        issue(row, "", `列数が一致しません（ヘッダ ${header.length}列 / データ ${values.length}列）`);
        continue;
      }
      const record = /* @__PURE__ */ Object.create(null);
      for (let col = 0; col < header.length; col++) {
        const code = header[col], def = properties[code], value = coerceCsvImportValue(values[col], def);
        const label = `${def.label || code}［${code}］`;
        const empty = Array.isArray(value) ? value.length === 0 : value === "";
        if (enabled(def.required) && empty) issue(row, label, "必須項目が空です");
        if (!empty && def.type === "NUMBER" && !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(String(value))) issue(row, label, "数値の形式が不正です");
        if (["RADIO_BUTTON", "DROP_DOWN", "CHECK_BOX", "MULTI_SELECT"].includes(def.type)) {
          const choices = Array.isArray(value) ? value : empty ? [] : [value];
          for (const choice of choices) if (!has(def.options || {}, String(choice))) issue(row, label, `選択肢にありません: ${choice}`);
        }
        if (enabled(def.unique) && !empty && typeof value === "string") {
          const seen = seenValues.get(code) || /* @__PURE__ */ new Map();
          if (seen.has(value)) issue(row, label, `CSV内で同じ値が重複しています（${seen.get(value)}行目）`);
          else seen.set(value, row);
          seenValues.set(code, seen);
        }
        record[code] = { value };
      }
      records.push(record);
    }
    if (!count) throw new Error("登録するデータがありません");
    return { count, columns, issues, issueCount, sample, records };
  }
  function formatCsvImportReport(report) {
    const lines = [
      `${report.count}件 / ${report.columns.length}フィールド / 検出した問題 ${report.issueCount}件`,
      `列: ${report.columns.map((col) => `${col.label}［${col.code}］`).join(", ")}`
    ];
    for (const issue of report.issues) lines.push(`${issue.row}行目${issue.field ? `・${issue.field}` : ""}: ${issue.message}`);
    if (report.issueCount > report.issues.length) lines.push(`ほか ${report.issueCount - report.issues.length}件（表示は先頭100件）`);
    return lines.join("\n");
  }

  // src/tabs/record-process-metadata.ts
  function describeEntities(entities) {
    if (!Array.isArray(entities)) return [];
    const types = { USER: "ユーザー", GROUP: "グループ", ORGANIZATION: "組織", FIELD_ENTITY: "フィールド", CREATOR: "アプリ作成者", CUSTOM_FIELD: "共通管理項目" };
    return entities.map((item) => {
      const entity = item?.entity || {};
      return `${types[entity.type] || entity.type || "不明"}${entity.code ? `: ${entity.code}` : ""}${item?.includeSubs ? "（下位組織を含む）" : ""}`;
    });
  }
  function readProcessActionChoices(response) {
    if (!Array.isArray(response?.actions)) throw new Error("プロセス管理のアクション情報が不正です。再取得してください。");
    const counts = /* @__PURE__ */ new Map();
    for (const action of response.actions) {
      const key = JSON.stringify([action?.from, action?.name]);
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    return response.actions.map((action) => {
      if (!action || typeof action.name !== "string" || typeof action.from !== "string" || typeof action.to !== "string") throw new Error("プロセス管理のアクション情報が不正です。再取得してください。");
      const assignee = response.states?.[action.to]?.assignee;
      return {
        name: action.name,
        from: action.from,
        to: action.to,
        filterCond: String(action.filterCond || ""),
        type: String(action.type || "PRIMARY"),
        assigneeType: String(assignee?.type || ""),
        assigneeCandidates: describeEntities(assignee?.entities),
        executableUsers: describeEntities(action.executableUser?.entities),
        ambiguous: counts.get(JSON.stringify([action.from, action.name])) > 1
      };
    });
  }
  function describeProcessAction(action) {
    const assignees = { ONE: "候補から1人を選択", ALL: "候補全員", ANY: "候補のうち1人" };
    return [
      `${action.from} → ${action.to}`,
      `実行条件: ${action.filterCond || "条件なし"}`,
      `実行者: ${action.type === "SECONDARY" ? action.executableUsers.join(" / ") || "レコード閲覧可能なユーザー全員" : "現在の作業者（未指定時はレコード閲覧可能なユーザー）"}`,
      `次の作業者: ${assignees[action.assigneeType] || "設定なし"}${action.assigneeCandidates.length ? ` / ${action.assigneeCandidates.join(" / ")}` : " / 候補設定なし"}`,
      action.assigneeType === "ONE" && action.assigneeCandidates.length ? "作業者ログイン名の指定が必要になる場合があります。フィールド・組織等の候補はレコードごとに異なります。" : "",
      action.ambiguous ? "同じ遷移元に同名アクションが複数あります。この名前はREST APIで指定できません。kintone側のアクション名を見直してください。" : ""
    ].filter(Boolean).join("\n");
  }
  function processActionQuery(action, statusFieldCode) {
    if (action.ambiguous) throw new Error("同じ遷移元に同名アクションが複数あるため、REST APIで指定できません。");
    if (!statusFieldCode) throw new Error("ステータスのフィールドコードを取得できません。アクションを再取得してください。");
    return [`${statusFieldCode} in (${JSON.stringify(action.from)})`, action.filterCond ? `(${action.filterCond})` : ""].filter(Boolean).join(" and ");
  }

  // src/tabs/record-standalone.ts
  function parseRecordAppIds(value) {
    const tokens = String(value ?? "").split(/[\s,\u3001\uFF0C]+/).filter(Boolean);
    const invalid = tokens.filter((id) => !/^\d+$/.test(id) || Number(id) <= 0);
    if (invalid.length) throw new Error(`アプリIDは正の数値で入力してください: ${invalid.join(", ")}`);
    return [...new Set(tokens)];
  }
  async function runRecordAppBatchStandalone(appIdsValue, operation, setStatus) {
    const appIds = parseRecordAppIds(appIdsValue);
    if (!appIds.length) throw new Error("対象アプリIDを1件以上入力してください");
    const failures = [];
    const warnings = [];
    for (let i = 0; i < appIds.length; i++) {
      const appId = appIds[i];
      setStatus(`App ${appId}: 実行中 (${i + 1}/${appIds.length})`);
      try {
        const result = await operation(appId, i, appIds.length);
        if (result && result.warning) warnings.push(`App ${appId}: ${result.warning}`);
      } catch (error) {
        failures.push(`App ${appId}: ${error?.message || String(error)}`);
      }
    }
    const warningSummary = warnings.length ? `警告 ${warnings.length}アプリ:
${warnings.join("\n")}` : "";
    if (failures.length) {
      throw new Error(`${appIds.length}件中${failures.length}件が失敗しました
${failures.join("\n")}${warningSummary ? `
${warningSummary}` : ""}`);
    }
    if (warningSummary) {
      setStatus(`${appIds.length}アプリの操作が完了しました
${warningSummary}`, true);
      return;
    }
    setStatus(`${appIds.length}アプリの操作が完了しました`);
  }
  async function downloadFileBlob(prefix, fileKey) {
    if (!fileKey) return { ok: false, reason: "fileKey がありません" };
    const url = prefix + "/file.json?fileKey=" + encodeURIComponent(fileKey);
    const headers = { "X-Requested-With": "XMLHttpRequest" };
    let lastReason = "";
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const resp = await fetch(url, { method: "GET", headers });
        if (resp.status === 403) return { ok: false, reason: "閲覧権限なし (HTTP 403)" };
        if (!resp.ok) {
          lastReason = `HTTP ${resp.status}`;
        } else {
          return { ok: true, blob: await resp.blob() };
        }
      } catch (e) {
        lastReason = e?.message || String(e);
      }
      if (attempt === 0) await new Promise((r) => setTimeout(r, 500));
    }
    return { ok: false, reason: lastReason || "取得失敗" };
  }
  function formatFileFailures(failures) {
    return failures.map((f) => `record ${f.recordId}	${f.fileName || "(名称不明)"}	${f.reason}`).join("\n");
  }
  function describeFetchMode(mode) {
    return mode === "cursor" ? " / cursor API" : "";
  }
  async function fetchAllRecords(prefix, app, query, setStatus) {
    setStatus("レコード取得中...");
    const result = await fetchRecordsByQuery(prefix, app, query || "", {
      onProgress: (n, mode) => setStatus(`レコード取得中... (${n}件取得済${describeFetchMode(mode)})`)
    });
    return result.records;
  }
  async function fetchRecordStatusTargets(prefix, app, query, setStatus) {
    setStatus("対象レコード取得中...");
    const result = await fetchRecordsByQuery(prefix, app, query || "", {
      fields: ["$id", "$revision"],
      onProgress: (n, mode) => setStatus(`対象レコード取得中... (${n}件${describeFetchMode(mode)})`)
    });
    return result.records.map((record) => {
      const id = Number(record?.$id?.value);
      if (!Number.isSafeInteger(id) || id <= 0) {
        throw new Error("対象レコードのIDを確認できないため、ステータス更新を中止しました。対象レコードを取得し直してください。");
      }
      const rawRevision = record?.$revision?.value;
      const revision = typeof rawRevision === "string" || typeof rawRevision === "number" ? String(rawRevision) : "";
      if (!/^\d+$/.test(revision)) {
        throw new Error(`レコード ${id} の revision を確認できないため、ステータス更新を中止しました。対象レコードを取得し直してください。`);
      }
      return { id, revision };
    });
  }
  function csvExportManifest(appId, guestId, recordCount, csv) {
    return {
      schemaVersion: 1,
      appId,
      guestId: guestId || "",
      recordCount,
      parentFile: "records.csv",
      recordIdColumn: csv.tables.length ? "$id" : null,
      tables: csv.tables.map((table) => ({
        fieldCode: table.fieldCode,
        fileName: table.fileName,
        rowCount: table.rowCount,
        parentIdColumn: "$id",
        rowIdColumn: "$rowId",
        rowIndexColumn: "$rowIndex"
      })),
      warnings: csv.warnings,
      notes: [
        "親の records.csv は1レコード1行です。テーブル列は行数を表示します。",
        "明細CSVの $id は親レコードID、$rowId はテーブル行ID、$rowIndex はテーブル内の行番号（1始まり）です。",
        "テーブルごとに独立したCSVです。別のテーブルとの行の組み合わせは作りません。",
        "CSVは閲覧・集計用です。このツールのCSV取込でテーブルを復元することはできません。",
        "添付フィールドはファイル名のみです。実体を保存する場合はバックアップで「添付ファイルも保存」を選択してください。"
      ]
    };
  }
  function addRecordCsvFiles(zip, csv, prefix = "") {
    zip.file(`${prefix}records.csv`, csv.parentCsv);
    for (const table of csv.tables) zip.file(`${prefix}${table.fileName}`, table.csvText);
  }
  function recordExportFilename(filename, extension, fallback) {
    const requested = String(filename || "").trim();
    return requested ? `${requested.replace(/\.(csv|zip)$/i, "")}.${extension}` : fallback;
  }
  async function buildCsvExportForApp(appId, guestId, query, setStatus) {
    if (!appId) throw new Error("アプリIDを入力してください");
    const prefix = buildApiPrefix(guestId || "", false);
    setStatus(`App ${appId}: フィールド情報取得中...`);
    const fields = await apiGet(prefix, "/app/form/fields.json", { app: appId });
    const properties = fields.properties || {};
    if (!Object.keys(properties).length) throw new Error(`App ${appId}: 出力できるフィールドがありません`);
    const records = await fetchAllRecords(prefix, appId, query || "", (message) => setStatus(`App ${appId}: ${message}`));
    if (!records.length) throw new Error(`App ${appId}: 出力するレコードがありません`);
    setStatus(`App ${appId}: CSV生成中... (${records.length}件)`);
    return {
      appId,
      guestId: guestId || "",
      recordCount: records.length,
      csv: buildRecordCsvExport(records, properties)
    };
  }
  async function runCsvExportStandalone(opts, setStatus) {
    const { appId, guestId, query, filename } = opts;
    const result = await buildCsvExportForApp(appId, guestId, query || "", setStatus);
    const appLabel = buildAppFilenameLabel(appId, "");
    if (!result.csv.tables.length) {
      const blob2 = new Blob([result.csv.parentCsv], { type: "text/csv;charset=utf-8;" });
      downloadBlob(recordExportFilename(filename, "csv", buildExportFilename("レコード", "csv", { appLabel })), blob2);
      setStatus(`CSV出力完了 (${result.recordCount}件)`);
      return;
    }
    const JSZipCtor = await loadJSZipLite();
    const zip = new JSZipCtor();
    addRecordCsvFiles(zip, result.csv);
    zip.file("manifest.json", JSON.stringify({
      generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
      query: query || "",
      ...csvExportManifest(result.appId, result.guestId, result.recordCount, result.csv)
    }, null, 2));
    setStatus(`ZIP生成中... (${result.recordCount}件 / テーブル ${result.csv.tables.length}件)`);
    const blob = await zip.generateAsync({ type: "blob" });
    downloadBlob(recordExportFilename(filename, "zip", buildExportFilename("レコード", "zip", { appLabel })), blob);
    const warningNote = result.csv.warnings.length ? `（未取得のテーブル ${result.csv.warnings.length}件、詳細は manifest.json）` : "";
    setStatus(`CSV出力完了: ${result.recordCount}件 / テーブル明細 ${result.csv.tables.length}ファイルをZIPに保存${warningNote}`, result.csv.warnings.length > 0);
  }
  async function runCsvExportBatchStandalone(opts, setStatus) {
    const apps = (opts?.apps || []).filter((a) => a?.appId);
    const query = opts?.query || "";
    const filename = String(opts?.filename || "").trim();
    if (!apps.length) throw new Error("対象アプリを1件以上入力してください");
    if (apps.length === 1) {
      const app = apps[0];
      await runCsvExportStandalone({ appId: app.appId, guestId: app.guestId || "", query, filename }, setStatus);
      return;
    }
    const JSZip = await loadJSZipLite();
    const zip = new JSZip();
    const used = /* @__PURE__ */ new Set();
    let totalRecords = 0;
    let warningCount = 0;
    const successes = [];
    const failures = [];
    for (let i = 0; i < apps.length; i++) {
      const app = apps[i];
      let folder = "";
      setStatus(`CSV出力中... (${i + 1}/${apps.length})`);
      try {
        const result = await buildCsvExportForApp(app.appId, app.guestId || "", query, setStatus);
        const guestSuffix = result.guestId ? `_guest${sanitizeZipSegment(result.guestId)}` : "";
        folder = uniqueZipEntryName(used, `app_${sanitizeZipSegment(result.appId)}${guestSuffix}`);
        addRecordCsvFiles(zip, result.csv, `${folder}/`);
        zip.file(`${folder}/manifest.json`, JSON.stringify({
          generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
          appName: app.appName || "",
          query,
          ...csvExportManifest(result.appId, result.guestId, result.recordCount, result.csv)
        }, null, 2));
        totalRecords += result.recordCount;
        warningCount += result.csv.warnings.length;
        successes.push(`${folder}/: App ${result.appId}${result.guestId ? ` / Guest ${result.guestId}` : ""} / ${result.recordCount}件 / テーブル ${result.csv.tables.length}件${result.csv.warnings.length ? ` / 未取得 ${result.csv.warnings.length}件（フォルダ内manifest.json参照）` : ""}`);
      } catch (error) {
        if (folder) zip.remove(folder);
        failures.push(`App ${app.appId}${app.guestId ? ` / Guest ${app.guestId}` : ""}: ${error?.message || String(error)}`);
      }
    }
    if (failures.length === apps.length) {
      throw new Error(`すべてのアプリで CSV 出力に失敗しました
${failures.join("\n")}`);
    }
    const manifest = [
      "kintone CSV 一括出力マニフェスト",
      `出力日時: ${(/* @__PURE__ */ new Date()).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })}`,
      `対象アプリ数: ${apps.length}（成功 ${successes.length} / 失敗 ${failures.length}）`,
      `総レコード数: ${totalRecords}`,
      `未取得のテーブル: ${warningCount}件`,
      `共通クエリ: ${query || "(なし)"}`,
      "",
      "アプリごとのフォルダに親 records.csv、tables/ 配下の明細CSV、対応関係を記載した manifest.json を格納しています。",
      "明細CSVの $id を同じフォルダの親 records.csv の $id に紐付けてください。",
      "",
      ...successes,
      ...failures.length ? ["", "失敗:", ...failures] : []
    ].join("\n");
    zip.file("manifest.txt", manifest);
    setStatus(`ZIP生成中... (${successes.length}アプリ / ${totalRecords}件)`);
    const blob = await zip.generateAsync({ type: "blob" });
    downloadBlob(recordExportFilename(filename, "zip", buildExportFilename("CSV出力", "zip")), blob);
    const issues = [failures.length ? `失敗 ${failures.length}アプリ` : "", warningCount ? `未取得のテーブル ${warningCount}件` : ""].filter(Boolean);
    const issueNote = issues.length ? `（${issues.join(" / ")}、詳細は manifest.txt）` : "";
    setStatus(`CSV一括出力完了${issueNote}: ${successes.length}アプリ / ${totalRecords}件`, issues.length > 0);
  }
  async function readImportFile(file) {
    if (!file) throw new Error("CSVファイルを選択してください");
    if (typeof file.text === "function") return file.text();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(String(e.target.result || ""));
      reader.onerror = () => reject(new Error("ファイルの読み取りに失敗"));
      reader.readAsText(file);
    });
  }
  async function inspectCsvImportBatch(opts, setStatus) {
    const appIds = parseRecordAppIds(opts.appIdsText || opts.appId);
    if (!appIds.length) throw new Error("対象アプリIDを入力してください");
    setStatus("CSVファイルを読み込み中...");
    const rows = parseCsvText((await readImportFile(opts.file)).replace(/^\uFEFF/, ""));
    const prefix = buildApiPrefix(opts.guestId || "", false);
    const plans = [];
    for (const appId of appIds) {
      setStatus(`App ${appId}: CSVを事前検査中...`);
      try {
        const response = await apiGet(prefix, "/app/form/fields.json", { app: appId });
        const { records: _records, ...report } = planCsvImport(rows, response?.properties);
        plans.push({ appId, properties: response.properties, report });
      } catch (error) {
        plans.push({ appId, properties: {}, error: error?.message || String(error) || "事前検査に失敗しました" });
      }
    }
    return { prefix, rows, plans };
  }
  async function runPreviewCsvImportStandalone(opts, setStatus) {
    const { plans } = await inspectCsvImportBatch(opts, setStatus);
    const result = plans.map(({ appId, report, error }) => ({ appId, report, error }));
    const problems = plans.filter((plan) => plan.error || plan.report.issueCount).length;
    setStatus(problems ? `事前検査: ${problems}アプリに問題があります。まだ書き込んでいません。` : `事前検査完了: ${plans.length}アプリ。まだ書き込んでいません。`, problems > 0);
    return result;
  }
  async function runCsvImportBatchStandalone(opts, setStatus) {
    const { prefix, rows, plans } = await inspectCsvImportBatch(opts, setStatus);
    const problems = plans.filter((plan) => plan.error || plan.report.issueCount);
    if (problems.length) throw new Error(`CSVの事前検査で問題を検出しました。全対象アプリへの書き込みを中止しました。
${problems.map((plan) => `App ${plan.appId}: ${plan.error || formatCsvImportReport(plan.report)}`).join("\n\n")}`);
    const confirmText = [
      `CSVから ${plans.length}アプリの本番レコードへ追加します${opts.guestId ? `（ゲスト ${opts.guestId}）` : ""}。`,
      ...plans.map((plan) => `App ${plan.appId}: ${plan.report.count}件 / ${plan.report.columns.length}フィールド`),
      "追加したレコードは自動では取り消せません。実行しますか？"
    ].join("\n");
    if (!kusConfirm(confirmText)) {
      const warning = "CSV取込をキャンセルしました";
      setStatus(warning, true);
      return { warning };
    }
    await runRecordAppBatchStandalone(plans.map((plan) => plan.appId).join(","), async (appId) => {
      const plan = plans.find((item) => item.appId === appId);
      const { records } = planCsvImport(rows, plan.properties);
      const ok = await writeInChunks(
        records,
        `App ${appId} の CSV取込`,
        (batch) => apiPost(prefix, "/records.json", { app: appId, records: batch }),
        (done, total) => setStatus(`App ${appId}: インポート中... (${done} / ${total}件)`)
      );
      setStatus(`App ${appId}: インポート完了 ${ok}件`);
    }, setStatus);
    setStatus(`CSV取込完了: ${plans.length}アプリ / ${plans.reduce((sum, plan) => sum + plan.report.count, 0)}件`);
  }
  async function runBatchProcessStandalone(opts, setStatus) {
    const { appId, guestId, query, action, assignee } = opts;
    if (!appId) throw new Error("アプリIDを入力してください");
    if (!action) throw new Error("アクション名を入力してください");
    const prefix = buildApiPrefix(guestId || "", false);
    const targets = await fetchRecordStatusTargets(prefix, appId, query || "", setStatus);
    if (!targets.length) throw new Error("処理対象のレコードが0件です");
    const confirmText = [
      `App ${appId}${guestId ? `（ゲスト ${guestId}）` : ""} の ${targets.length}件 にアクション「${action}」を実行します${assignee ? `（作業者: ${assignee}）` : ""}。`,
      `条件: ${query || "(全件)"}`,
      "本番レコードのステータスが変わり、自動では元に戻せません。実行しますか？"
    ].join("\n");
    if (!kusConfirm(confirmText)) {
      setStatus("ステータス一括更新をキャンセルしました");
      return;
    }
    const ok = await writeInChunks(
      targets,
      `App ${appId} のステータス更新`,
      async (batch) => {
        try {
          await apiPut(prefix, "/records/status.json", {
            app: appId,
            records: batch.map(({ id, revision }) => ({ id, revision, action, ...assignee ? { assignee } : {} }))
          });
        } catch (error) {
          if (!isRevisionConflictError(error)) throw error;
          const reported = new Error(
            `App ${appId} の対象レコードは取得後に別の更新が入ったため中止しました（revision 競合）。対象レコードを取得し直し、条件と内容を確認してから再実行してください。
${error?.message || String(error)}`
          );
          Object.assign(reported, { revisionConflict: true, original: error, ...error?.code ? { code: error.code } : {} });
          throw reported;
        }
      },
      (done, total) => setStatus(`ステータス更新中... ${done}/${total}件`)
    );
    setStatus(`ステータス一括更新完了 (${ok}件)`);
  }
  var COPY_SYSTEM_TYPES = /* @__PURE__ */ new Set([
    "RECORD_NUMBER",
    "CREATOR",
    "CREATED_TIME",
    "MODIFIER",
    "UPDATED_TIME",
    "STATUS",
    "STATUS_ASSIGNEE",
    "CALC",
    "CATEGORY",
    "__ID__",
    "__REVISION__",
    "REFERENCE_TABLE",
    "LABEL",
    "HR",
    "SPACER",
    "GROUP"
  ]);
  var COPY_SYSTEM_CODES = /* @__PURE__ */ new Set(["$id", "$revision", "作成者", "作成日時", "更新者", "更新日時", "レコード番号", "ステータス", "作業者"]);
  function buildCopyRecordPayloads(records, targetProps) {
    const dropped = /* @__PURE__ */ new Set();
    const targetKnown = targetProps && typeof targetProps === "object" ? targetProps : null;
    const canWriteTop = (code, field) => {
      if (COPY_SYSTEM_CODES.has(code) || COPY_SYSTEM_TYPES.has(field?.type) || field?.type === "FILE") return false;
      if (targetKnown && !targetKnown[code]) {
        dropped.add(code);
        return false;
      }
      if (targetKnown && targetKnown[code]?.type !== field?.type) {
        dropped.add(`${code}(型不一致)`);
        return false;
      }
      return true;
    };
    const out = records.map((rec) => {
      const payload = {};
      for (const [code, field] of Object.entries(rec || {})) {
        if (!field || typeof field !== "object") continue;
        if (!canWriteTop(code, field)) continue;
        if (field.type === "SUBTABLE") {
          const childDefs = targetKnown ? targetKnown[code]?.fields || {} : null;
          const rows = Array.isArray(field.value) ? field.value : [];
          payload[code] = {
            value: rows.map((row) => {
              const inner = row && typeof row === "object" && row.value && typeof row.value === "object" ? row.value : {};
              const cells = {};
              for (const [childCode, childField] of Object.entries(inner)) {
                if (!childField || typeof childField !== "object") continue;
                if (COPY_SYSTEM_CODES.has(childCode) || COPY_SYSTEM_TYPES.has(childField.type) || childField.type === "FILE") continue;
                if (childDefs && !childDefs[childCode]) {
                  dropped.add(`${code}.${childCode}`);
                  continue;
                }
                cells[childCode] = { value: childField.value };
              }
              return { value: cells };
            })
          };
        } else {
          payload[code] = { value: field.value };
        }
      }
      return payload;
    });
    return { records: out, droppedFields: [...dropped].sort() };
  }
  async function runRecordCopyStandalone(opts, setStatus) {
    const { sourceAppId, sourceGuestId, targetAppId, targetGuestId, query } = opts;
    if (!sourceAppId || !targetAppId) throw new Error("コピー元とコピー先のアプリIDを指定してください");
    const srcPrefix = buildApiPrefix(sourceGuestId || "", false);
    const tgtPrefix = buildApiPrefix(targetGuestId || "", false);
    setStatus(`コピー先 App ${targetAppId} のフィールド定義を確認中...`);
    const targetFields = await apiGet(tgtPrefix, "/app/form/fields.json", { app: targetAppId });
    const targetProps = targetFields?.properties || {};
    const records = await fetchAllRecords(srcPrefix, sourceAppId, query || "", setStatus);
    if (!records.length) {
      setStatus("コピー対象のレコードがありません");
      return;
    }
    const plan = buildCopyRecordPayloads(records, targetProps);
    const droppedNote = plan.droppedFields.length ? `コピー先に無い/型が違うため除外: ${plan.droppedFields.slice(0, 10).join(", ")}${plan.droppedFields.length > 10 ? ` 他${plan.droppedFields.length - 10}件` : ""}` : "";
    const confirmText = [
      `コピー元 App ${sourceAppId} → コピー先 App ${targetAppId}${targetGuestId ? `（ゲスト ${targetGuestId}）` : ""}`,
      `${plan.records.length}件を本番レコードとして新規追加します（既存レコードは変更しません）。`,
      "ファイル・システム項目・計算項目は除外されます。",
      droppedNote,
      "実行しますか？"
    ].filter(Boolean).join("\n");
    if (!kusConfirm(confirmText)) {
      setStatus("レコードコピーをキャンセルしました");
      return;
    }
    const ok = await writeInChunks(
      plan.records,
      `App ${sourceAppId} → ${targetAppId} のレコードコピー`,
      (batch) => apiPost(tgtPrefix, "/records.json", { app: targetAppId, records: batch }),
      (done, total) => setStatus(`コピー中... ${done} / ${total}件`)
    );
    setStatus(`レコードコピー完了: ${ok}件${droppedNote ? `（${droppedNote}）` : ""}`, plan.droppedFields.length > 0);
  }
  async function runAttachmentDownloadStandalone(opts, setStatus) {
    const { appId, guestId, query, fileFieldCode, folderFieldCode, zipName } = opts;
    const tableFieldCode = String(opts.tableFieldCode || "");
    if (!appId) throw new Error("アプリIDを入力してください");
    if (!fileFieldCode) throw new Error("ファイルフィールドコードを入力してください");
    const prefix = buildApiPrefix(guestId || "", false);
    const fields = await runLoadAttachmentFieldsStandalone({ appId, guestId }, setStatus);
    if (!fields.some((field) => field.fileFieldCode === fileFieldCode && field.tableFieldCode === tableFieldCode)) {
      throw new Error(`添付フィールド「${tableFieldCode ? `${tableFieldCode} / ` : ""}${fileFieldCode}」がありません。フィールド名ではなくコードと、テーブルの指定を確認してください`);
    }
    const records = await fetchAllRecords(prefix, appId, query || "", setStatus);
    if (!records.length) throw new Error("対象レコードが0件です");
    const groups = records.flatMap((rec, index) => {
      const recordId = String(rec.$id?.value || index + 1);
      const parent = rec?.[tableFieldCode || fileFieldCode];
      if (!parent || parent.type !== (tableFieldCode ? "SUBTABLE" : "FILE") || !Array.isArray(parent.value)) {
        throw new Error(`レコード ${recordId}: フィールド「${tableFieldCode || fileFieldCode}」を取得できません。閲覧権限を確認してください`);
      }
      const rows = tableFieldCode ? parent.value : [{ value: { [fileFieldCode]: parent } }];
      return rows.map((row, rowIndex) => {
        const field = row.value?.[fileFieldCode];
        if (field?.type !== "FILE" || !Array.isArray(field.value)) {
          throw new Error(`レコード ${recordId} / テーブル行 ${rowIndex + 1}: 添付フィールド「${fileFieldCode}」を取得できません。閲覧権限を確認してください`);
        }
        return { rec, recordId, rowId: tableFieldCode ? String(row.id || rowIndex + 1) : "", files: field.value };
      });
    });
    if (!groups.some((group) => group.files.length)) {
      const warning = "ダウンロード対象の添付がありませんでした";
      setStatus(warning, true);
      return { warning };
    }
    const JSZipCtor = await loadJSZipLite();
    const zip = new JSZipCtor();
    let fileCount = 0;
    const failures = [];
    const manifest = [];
    const usedByFolder = /* @__PURE__ */ new Map();
    for (let i = 0; i < groups.length; i++) {
      const { rec, recordId, rowId, files } = groups[i];
      setStatus(`添付DL中 (${i + 1}/${groups.length}${failures.length ? ` / 失敗 ${failures.length}` : ""})`);
      if (!files.length) continue;
      let folderName = folderFieldCode && rec[folderFieldCode]?.value;
      if (!folderName) folderName = `Record_${recordId}`;
      const folderPath = [
        sanitizeZipSegment(folderName, `Record_${recordId}`),
        ...tableFieldCode ? [...folderName === `Record_${recordId}` ? [] : [`Record_${recordId}`], sanitizeZipSegment(tableFieldCode), `Row_${sanitizeZipSegment(rowId)}`] : []
      ].join("/");
      const folder = zip.folder(folderPath);
      const used = usedByFolder.get(folderPath) || /* @__PURE__ */ new Set();
      usedByFolder.set(folderPath, used);
      for (const f of files) {
        const result = await downloadFileBlob(prefix, f.fileKey);
        const entry = {
          recordId,
          tableFieldCode,
          rowId,
          fileFieldCode,
          name: String(f.name || ""),
          size: String(f.size ?? ""),
          contentType: String(f.contentType || ""),
          path: "",
          error: ""
        };
        if (result.ok === true) {
          const name = uniqueZipName(used, f.name || "file.bin", f.fileKey, fileCount);
          folder.file(name, result.blob);
          entry.path = `${folderPath}/${name}`;
          fileCount++;
        } else {
          entry.error = result.reason;
          failures.push({ recordId, fileName: String(f.name || ""), fileKey: String(f.fileKey || ""), reason: `${rowId ? `テーブル ${tableFieldCode} / 行 ${rowId}: ` : ""}${result.reason}` });
        }
        manifest.push(entry);
      }
    }
    if (!fileCount) {
      if (failures.length) {
        throw new Error(`添付ファイルを1件も取得できませんでした（失敗 ${failures.length}件）
${formatFileFailures(failures.slice(0, 5))}${failures.length > 5 ? "\n…" : ""}`);
      }
      setStatus("ダウンロード対象の添付がありませんでした", true);
      return { warning: "ダウンロード対象の添付がありませんでした" };
    }
    if (failures.length) {
      zip.file("download_errors.txt", `取得できなかった添付ファイル ${failures.length}件
${formatFileFailures(failures)}
`);
    }
    zip.file("manifest.json", JSON.stringify({ appId: String(appId), guestId: String(guestId || ""), query: query || "", files: manifest }, null, 2));
    setStatus(`ZIP生成中 (${fileCount}ファイル)`);
    const zipBlob = await zip.generateAsync({ type: "blob" });
    downloadBlob(zipName || buildExportFilename("添付ファイル", "zip", { appLabel: buildAppFilenameLabel(appId, "") }), zipBlob);
    if (failures.length) {
      const warning = `添付一括DL完了: ${fileCount}ファイル（取得失敗 ${failures.length}件、詳細は download_errors.txt）`;
      setStatus(warning, true);
      return { warning };
    }
    setStatus(`添付一括DL完了: ${fileCount}ファイル`);
  }
  async function runRecordBackupStandalone(opts, setStatus) {
    const { appId, guestId, query, zipName, includeFiles, includeComments, includeAppSettings, appScopes } = opts;
    if (!appId) throw new Error("アプリIDを入力してください");
    const prefix = buildApiPrefix(guestId || "", false);
    setStatus("フィールド情報取得中...");
    const fields = await apiGet(prefix, "/app/form/fields.json", { app: appId });
    const propKeys = Object.keys(fields.properties || {});
    if (!propKeys.length) throw new Error("出力できるフィールドがありません");
    const records = await fetchAllRecords(prefix, appId, query || "", setStatus);
    if (!records.length) throw new Error("対象レコードが0件です");
    const JSZipCtor = await loadJSZipLite();
    const zip = new JSZipCtor();
    const notes = [];
    const csvExport = buildRecordCsvExport(records, fields.properties);
    addRecordCsvFiles(zip, csvExport);
    notes.push(...csvExport.warnings);
    zip.file("records.json", JSON.stringify({ generatedAt: (/* @__PURE__ */ new Date()).toISOString(), appId, recordCount: records.length, records }, null, 2));
    let fileCount = 0;
    const fileFailures = [];
    if (includeFiles) {
      const collected = [];
      for (const rec of records) {
        for (const [code, field] of Object.entries(rec)) {
          if (!field || typeof field !== "object") continue;
          if (field.type === "FILE") {
            (field.value || []).forEach((file, idx) => collected.push({ rec, fieldCode: code, fileIndex: idx, file }));
          } else if (field.type === "SUBTABLE") {
            (field.value || []).forEach((subRow, rowIdx) => {
              for (const [childCode, childField] of Object.entries(subRow.value || {})) {
                if (childField?.type !== "FILE") continue;
                (childField.value || []).forEach((file, idx) => collected.push({ rec, fieldCode: code, childCode, rowIndex: rowIdx, fileIndex: idx, file }));
              }
            });
          }
        }
      }
      if (!collected.length) notes.push("添付ファイルなし");
      const blobCache = /* @__PURE__ */ new Map();
      for (let i = 0; i < collected.length; i++) {
        const ent = collected[i];
        setStatus(`添付ファイル取得中 (${i + 1}/${collected.length}${fileFailures.length ? ` / 失敗 ${fileFailures.length}` : ""})`);
        const recordId = String(ent.rec?.$id?.value || "unknown");
        let result = blobCache.get(ent.file.fileKey);
        if (!result) {
          result = await downloadFileBlob(prefix, ent.file.fileKey);
          blobCache.set(ent.file.fileKey, result);
        }
        if (result.ok === false) {
          fileFailures.push({ recordId, fileName: String(ent.file.name || ""), fileKey: String(ent.file.fileKey || ""), reason: result.reason });
          continue;
        }
        const parts = ["attachments", `record_${sanitizeZipSegment(recordId)}`];
        if (ent.childCode) {
          parts.push(sanitizeZipSegment(ent.fieldCode || "subtable"));
          parts.push(`row_${(ent.rowIndex || 0) + 1}`);
          parts.push(sanitizeZipSegment(ent.childCode));
        } else {
          parts.push(sanitizeZipSegment(ent.fieldCode || "files"));
        }
        const filePrefix = sanitizeZipSegment(String(ent.file.fileKey || "").slice(0, 12) || String(ent.fileIndex + 1));
        parts.push(`${filePrefix}_${sanitizeZipSegment(ent.file.name || "file.bin", "file.bin")}`);
        zip.file(parts.join("/"), result.blob);
        fileCount++;
      }
      if (fileFailures.length) {
        notes.push(`添付ファイル取得失敗 ${fileFailures.length}件（manifest.json の fileFailures 参照）`);
      }
    } else {
      notes.push("添付ファイル未取得");
    }
    let commentCount = 0;
    const commentFailures = [];
    if (includeComments) {
      const out = [];
      for (let i = 0; i < records.length; i++) {
        const rec = records[i];
        const recordId = String(rec?.$id?.value || "").trim();
        if (!recordId) continue;
        setStatus(`コメント取得中 (${i + 1}/${records.length}${commentFailures.length ? ` / 失敗 ${commentFailures.length}` : ""})`);
        try {
          const comments = [];
          let offset = 0;
          const limit = 10;
          while (true) {
            const resp = await apiGet(prefix, "/record/comments.json", { app: appId, record: recordId, order: "asc", offset, limit });
            const batch = resp.comments || [];
            comments.push(...batch);
            if (batch.length < limit) break;
            offset += batch.length;
          }
          if (comments.length) {
            out.push({ recordId, comments });
            commentCount += comments.length;
          }
        } catch (e) {
          commentFailures.push({ recordId, reason: e?.message || String(e) });
        }
      }
      zip.file("comments.json", JSON.stringify({ generatedAt: (/* @__PURE__ */ new Date()).toISOString(), appId, commentCount, failures: commentFailures, records: out }, null, 2));
      if (commentFailures.length) notes.push(`コメント取得失敗 ${commentFailures.length}レコード（manifest.json の commentFailures 参照）`);
    } else {
      notes.push("コメント未取得");
    }
    let appOk = 0;
    let appNg = 0;
    const appNgSections = [];
    if (includeAppSettings && appScopes && appScopes.length) {
      setStatus("アプリ設定取得中...");
      const settings = await fetchBundle({
        appId,
        guestId: guestId || "",
        preview: false,
        sections: appScopes,
        onProgress: (p, l) => setStatus(`アプリ設定取得中 ${Math.round(p * 100)}% (${l})`)
      });
      for (const key of appScopes) {
        const sec = settings.sections[key];
        if (sec && sec._fetchError) {
          appNg++;
          appNgSections.push(key);
        } else appOk++;
      }
      if (appNg) notes.push(`アプリ設定取得失敗 ${appNg}セクション: ${appNgSections.join(", ")}`);
      zip.file(`app_settings/app_${appId}.json`, JSON.stringify({ generatedAt: (/* @__PURE__ */ new Date()).toISOString(), appId, scopes: appScopes, bundle: settings }, null, 2));
    } else if (!includeAppSettings) {
      notes.push("アプリ設定未取得");
    }
    zip.file("manifest.json", JSON.stringify({
      generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
      appId,
      query: query || "",
      recordCount: records.length,
      csvExport: csvExportManifest(appId, guestId || "", records.length, csvExport),
      fileCount,
      fileFailures,
      commentCount,
      commentFailures,
      appSettings: { ok: appOk, ng: appNg, ngSections: appNgSections, scopes: appScopes || [] },
      notes
    }, null, 2));
    setStatus(`ZIP生成中 (${records.length}件 / 添付 ${fileCount} / コメント ${commentCount})`);
    const blob = await zip.generateAsync({ type: "blob" });
    downloadBlob(zipName || buildExportFilename("レコードバックアップ", "zip", { appLabel: buildAppFilenameLabel(appId, "") }), blob);
    const failureCount = fileFailures.length + commentFailures.length + appNg + csvExport.warnings.length;
    const failureNote = failureCount ? `（取得失敗: 添付 ${fileFailures.length} / コメント ${commentFailures.length} / 設定 ${appNg} / テーブル ${csvExport.warnings.length} → manifest.json 参照）` : "";
    const completionMessage = `バックアップ完了: ${records.length}件 / テーブル明細 ${csvExport.tables.length}ファイル / 添付 ${fileCount} / コメント ${commentCount}${failureNote}`;
    setStatus(completionMessage, failureCount > 0);
    return { warning: failureCount > 0 ? completionMessage : void 0 };
  }
  async function runLoadStatusActionsStandalone(opts, setStatus) {
    const { appId, guestId } = opts;
    if (!appId) throw new Error("アプリIDを入力してください");
    const prefix = buildApiPrefix(guestId || "", false);
    setStatus("プロセス管理情報を取得中...");
    const res = await apiGet(prefix, "/app/status.json", { app: appId, lang: "user" });
    if (!res.enable) {
      setStatus("プロセス管理は無効です", true);
      return { enabled: false, states: [], actions: [], statusFieldCode: "" };
    }
    const states = Object.keys(res.states || {}).sort((a, b) => Number(res.states[a].index) - Number(res.states[b].index));
    const actions = readProcessActionChoices(res);
    const fields = await apiGet(prefix, "/app/form/fields.json", { app: appId, lang: "user" });
    const statusField = Object.entries(fields?.properties || {}).find(([, field]) => field?.type === "STATUS");
    const statusFieldCode = statusField ? String(statusField[1].code || statusField[0]) : "";
    setStatus(`プロセス管理: 状態 ${states.length}件 / アクション ${actions.length}件`);
    return { enabled: true, states, actions, statusFieldCode };
  }
  async function runLoadViewsStandalone(opts, setStatus) {
    const { appId, guestId } = opts;
    if (!appId) throw new Error("アプリIDを入力してください");
    const prefix = buildApiPrefix(guestId || "", false);
    setStatus("一覧情報を取得中...");
    const resp = await apiGet(prefix, "/app/views.json", { app: appId, lang: "user" });
    const views = readRecordViews(resp);
    setStatus(`一覧: ${views.length}件`);
    return views;
  }
  async function runLoadAttachmentFieldsStandalone(opts, setStatus) {
    if (!opts.appId) throw new Error("アプリIDを入力してください");
    setStatus("添付フィールド情報を取得中...");
    const response = await apiGet(buildApiPrefix(opts.guestId || "", false), "/app/form/fields.json", { app: opts.appId, lang: "user" });
    const fields = readAttachmentFields(response);
    setStatus(`添付フィールド: ${fields.length}件${fields.length ? "" : "（添付フィールドがありません）"}`);
    return fields;
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
    keyword.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.isComposing && e.keyCode !== 229) {
        e.preventDefault();
        void runSearch();
      }
    });
    return details;
  }

  // src/tabs/record-quality-standalone.ts
  init_api();
  init_utils();

  // src/tabs/record-quality.ts
  var SCALAR = /* @__PURE__ */ new Set(["SINGLE_LINE_TEXT", "MULTI_LINE_TEXT", "LINK", "NUMBER", "DATE", "TIME", "DATETIME", "DROP_DOWN", "RADIO_BUTTON"]);
  var MULTI = /* @__PURE__ */ new Set(["CHECK_BOX", "MULTI_SELECT", "USER_SELECT", "ORGANIZATION_SELECT", "GROUP_SELECT"]);
  var TEXT = /* @__PURE__ */ new Set(["SINGLE_LINE_TEXT", "MULTI_LINE_TEXT", "LINK"]);
  var has2 = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
  function readQualityFields(properties) {
    if (!properties || typeof properties !== "object" || Array.isArray(properties)) throw new Error("フィールド設定の応答が不正です");
    return Object.entries(properties).filter(([, field]) => SCALAR.has(field?.type) || MULTI.has(field?.type)).map(([code, field]) => ({ code, label: String(field.label || code), type: String(field.type) }));
  }
  function selectQualityFields(properties, codes) {
    if (!codes.length || codes.length > 5 || new Set(codes).size !== codes.length) throw new Error("検査するフィールドを1〜5個選んでください");
    const available = new Map(readQualityFields(properties).map((field) => [field.code, field]));
    return codes.map((code) => {
      const field = available.get(code);
      if (!field) throw new Error(`検査に使えないフィールドです: ${code}（存在・種類を確認してください）`);
      return field;
    });
  }
  function numberKey(value) {
    const match = /^([+-]?)(\d*)(?:\.(\d*))?(?:[eE]([+-]?\d+))?$/.exec(value.trim());
    if (!match || !(match[2] || match[3])) return value;
    let digits = (match[2] + (match[3] || "")).replace(/^0+/, "");
    if (!digits) return "0";
    const trailing = digits.length - digits.replace(/0+$/, "").length;
    digits = digits.slice(0, digits.length - trailing);
    return `${match[1] === "-" ? "-" : ""}${digits}e${BigInt(match[4] || "0") - BigInt((match[3] || "").length) + BigInt(trailing)}`;
  }
  function inspectRecordQuality(records, fields, options) {
    const report = { fields, total: records.length, duplicateGroups: 0, duplicateRecords: 0, emptyRecords: 0, unavailableRecords: 0, findings: [] };
    const groups = /* @__PURE__ */ new Map();
    for (const record of records) {
      const recordId = String(record?.$id?.value ?? "");
      if (!/^[1-9]\d*$/.test(recordId)) throw new Error("レコードIDを取得できませんでした。検査をやり直してください");
      const empty = [], unavailable = [], values = [], keys = [];
      for (const field of fields) {
        const cell = record && has2(record, field.code) ? record[field.code] : void 0;
        const multi = MULTI.has(field.type), value = cell?.value;
        if (!cell || cell.type !== field.type || !has2(cell, "value") || value === void 0 || (multi ? !Array.isArray(value) || value.some((item) => ["USER_SELECT", "ORGANIZATION_SELECT", "GROUP_SELECT"].includes(field.type) ? !item || typeof item.code !== "string" : typeof item !== "string") : value !== null && typeof value !== "string")) {
          unavailable.push(field.code);
          values.push("（取得不可）");
          keys.push("");
          continue;
        }
        values.push(multi ? JSON.stringify(value.map((item) => typeof item === "string" ? item : item.code)) : String(value ?? ""));
        let key = multi ? JSON.stringify([...new Set(value.map((item) => typeof item === "string" ? item : item.code))].sort()) : String(value ?? "");
        if (TEXT.has(field.type)) {
          if (options.trimText) key = key.trim();
          if (options.ignoreCase) key = key.toLowerCase();
        }
        if (multi ? !value.length : !key) empty.push(field.code);
        keys.push(field.type === "NUMBER" && key ? numberKey(key) : key);
      }
      if (empty.length) {
        report.emptyRecords++;
        report.findings.push({ recordId, kind: "未入力", group: 0, fields: empty, values });
      }
      if (unavailable.length) {
        report.unavailableRecords++;
        report.findings.push({ recordId, kind: "取得不可", group: 0, fields: unavailable, values });
      }
      if (!empty.length && !unavailable.length) {
        const key = JSON.stringify(keys), group = groups.get(key) || [];
        group.push({ recordId, values });
        groups.set(key, group);
      }
    }
    for (const group of groups.values()) if (group.length > 1) {
      report.duplicateGroups++;
      report.duplicateRecords += group.length;
      for (const item of group) report.findings.push({ ...item, kind: "重複", group: report.duplicateGroups, fields: fields.map((field) => field.code) });
    }
    return report;
  }
  function reportCsv(rows) {
    return "\uFEFF" + rows.map((row) => row.map((value) => {
      const text = String(value ?? "");
      return csvEscape(/^[\s\uFEFF]*[=+\-@]/.test(text) || /^[\t\r\n]/.test(text) ? "'" + text : text);
    }).join(",")).join("\r\n") + "\r\n";
  }
  function qualityRecordPath(appId, guestId, recordId) {
    if (![appId, recordId].every((id) => /^[1-9]\d*$/.test(id)) || guestId && !/^[1-9]\d*$/.test(guestId)) return "";
    return `/k/${guestId ? `guest/${guestId}/` : ""}${appId}/show#record=${recordId}`;
  }
  function qualityReportCsv(results, guestId, origin, options, query) {
    const codes = [...new Set(results.flatMap((result) => result.report?.fields.map((field) => field.code) || []))];
    const rows = [["アプリID", "種別", "レコードID", "レコードURL", "重複グループ", "対象フィールド", "説明", ...codes.map((code) => `値:${code}`)]];
    for (const result of results) {
      const report = result.report;
      rows.push([result.appId, report ? "集計" : "エラー", "", "", "", report?.fields.map((field) => field.code).join(", "), result.error || `検査 ${report.total}件 / 重複 ${report.duplicateGroups}組・${report.duplicateRecords}件 / 未入力 ${report.emptyRecords}件 / 取得不可 ${report.unavailableRecords}件 / 条件: ${query || "全件"} / 前後空白を無視: ${options.trimText} / 大小文字を無視: ${options.ignoreCase}`]);
      if (!report) continue;
      for (const finding of report.findings) {
        const recordPath = qualityRecordPath(result.appId, guestId, finding.recordId);
        rows.push([
          result.appId,
          finding.kind,
          finding.recordId,
          recordPath ? origin + recordPath : "",
          finding.group || "",
          finding.fields.join(", "),
          "",
          ...codes.map((code) => {
            const index = report.fields.findIndex((field) => field.code === code);
            return index < 0 ? "" : finding.values[index];
          })
        ]);
      }
    }
    return reportCsv(rows);
  }

  // src/tabs/record-template.ts
  function buildCsvImportTemplate(properties) {
    if (!properties || typeof properties !== "object" || Array.isArray(properties)) throw new Error("フィールド設定の応答が不正です");
    const codes = [], excluded = [];
    const unsupported = csvImportUnsupportedFields(properties);
    const guide = [["フィールドコード", "フィールド名", "種類", "必須", "重複禁止", "初期値（設定値）", "選択肢（表示順）", "入力方法・制約"]];
    for (const [code, field] of Object.entries(properties)) {
      if (unsupported.has(code)) {
        excluded.push({ code, reason: unsupported.get(code) });
        continue;
      }
      codes.push(code);
      const notes = [];
      if (["USER_SELECT", "ORGANIZATION_SELECT", "GROUP_SELECT"].includes(field.type)) notes.push("表示名ではなくログイン名・組織コード・グループコード。複数はセル内カンマ区切り");
      if (["CHECK_BOX", "MULTI_SELECT"].includes(field.type)) notes.push("選択肢の値をセル内カンマ区切り（カンマを含む選択肢はこの取込機能で指定不可）");
      if (field.type === "DATE") notes.push("YYYY-MM-DD");
      if (field.type === "TIME") notes.push("HH:mm");
      if (field.type === "DATETIME") notes.push("タイムゾーン付き日時（例: 2026-01-01T09:00:00+09:00）");
      if (field.type === "NUMBER") notes.push("桁区切り・単位なしの数値");
      if (field.lookup) notes.push("ルックアップ元のキー値。参照先の権限と値の一致を確認");
      for (const [key, label] of [["minLength", "最小文字数"], ["maxLength", "最大文字数"], ["minValue", "最小値"], ["maxValue", "最大値"]]) {
        if (field[key] !== void 0 && field[key] !== null && field[key] !== "") notes.push(`${label}: ${field[key]}`);
      }
      const defaults = field.defaultNowValue === true || field.defaultNowValue === "true" ? "現在の日付・日時" : JSON.stringify(field.defaultValue ?? "");
      const choices = Object.entries(field.options || {}).sort(([, a], [, b]) => Number(a.index) - Number(b.index)).map(([value]) => value);
      guide.push([code, field.label || code, field.type, field.required === true || field.required === "true" ? "必須" : "", field.unique === true || field.unique === "true" ? "禁止" : "", defaults, JSON.stringify(choices), notes.join(" / ")]);
    }
    if (!codes.length) throw new Error("CSV取込に対応するフィールドがありません");
    return {
      columnCount: codes.length,
      csv: "\uFEFF" + codes.map(csvEscape).join(",") + "\r\n",
      guideCsv: reportCsv(guide),
      excludedCsv: reportCsv([["除外フィールドコード", "理由"], ...excluded.map((item) => [item.code, item.reason])]),
      readme: [
        "1. import.csv の2行目からデータを入力し、UTF-8のCSVとして保存してください。1行目はフィールドコードです。",
        "2. fields.csv で必須・選択肢・初期値・入力形式を確認できます。excluded.csv はこの取込機能の対象外です。",
        "3. 「CSVからレコードを追加」でファイルを選び、「CSVを事前検査」を実行してください。",
        "初期値は説明用です。ひな形にサンプルレコードや初期値は挿入していません。空セルを送っても初期値に置き換わるとは限りません。初期値を使う項目は列を削除するか、値を明示してください。",
        "取込は新規追加です。ファイル・テーブル・計算結果・システム項目・ルックアップのコピー先は含めません。",
        "Excelで編集する場合、先頭ゼロ・長い番号・日付の自動変換に注意し、文字列として読み込んでください。",
        "fields.csv / excluded.csv は閲覧用で、数式と解釈される文字列の先頭にアポストロフィを付けています。import.csv のコードは変更していません。",
        "フィールド設定だけでは実行ユーザーの登録権限やルックアップ先の値は判定できません。取得時点の設定です。"
      ].join("\r\n")
    };
  }

  // src/tabs/record-quality-standalone.ts
  function connection(appIdsText, guestId) {
    const appIds = parseRecordAppIds(appIdsText);
    if (!appIds.length) throw new Error("対象アプリを指定してください");
    if (guestId && !/^[1-9]\d*$/.test(guestId)) throw new Error("ゲストIDは正の数値で入力してください");
    return { appIds, prefix: buildApiPrefix(guestId, false) };
  }
  async function runLoadQualityFieldsStandalone(options) {
    const { appIds, prefix } = connection(options.appIdsText, options.guestId);
    return readQualityFields((await apiGet(prefix, "/app/form/fields.json", { app: appIds[0], lang: "user" })).properties);
  }
  async function runRecordQualityStandalone(options, setStatus) {
    const { appIds, prefix } = connection(options.appIdsText, options.guestId);
    const results = [];
    for (const appId of appIds) {
      setStatus(`App ${appId}: 検査用の設定を取得中…`);
      try {
        const properties = (await apiGet(prefix, "/app/form/fields.json", { app: appId, lang: "user" })).properties;
        const fields = selectQualityFields(properties, options.codes);
        const { records } = await fetchRecordsByQuery(prefix, appId, options.query, { fields: ["$id", ...options.codes], onProgress: (count) => setStatus(`App ${appId}: ${count}件を取得済み…`) });
        results.push({ appId, report: inspectRecordQuality(records, fields, options) });
      } catch (error) {
        results.push({ appId, error: error.message || String(error) });
      }
    }
    return results;
  }
  async function runCsvTemplateStandalone(options, setStatus) {
    const { appIds, prefix } = connection(options.appIdsText, options.guestId);
    const templates = [];
    const failures = [];
    for (const appId of appIds) {
      setStatus(`App ${appId}: CSVひな形を作成中…`);
      try {
        const fields = await apiGet(prefix, "/app/form/fields.json", { app: appId });
        templates.push({ appId, template: buildCsvImportTemplate(fields.properties) });
      } catch (error) {
        failures.push(`App ${appId}: ${error.message || String(error)}`);
      }
    }
    if (!templates.length) throw new Error(`ひな形を作成できませんでした
${failures.join("\n")}`);
    const JSZip = await loadJSZipLite(), zip = new JSZip();
    for (const { appId, template } of templates) {
      const folder = `app_${appId}/`;
      zip.file(folder + "import.csv", template.csv);
      zip.file(folder + "fields.csv", template.guideCsv);
      zip.file(folder + "excluded.csv", template.excludedCsv);
      zip.file(folder + "README.txt", `App ${appId}${options.guestId ? ` / ゲスト ${options.guestId}` : ""}\r
${template.readme}`);
    }
    zip.file("manifest.json", JSON.stringify({ createdAt: (/* @__PURE__ */ new Date()).toISOString(), guestId: options.guestId, templates: templates.map((item) => ({ appId: item.appId, columns: item.template.columnCount })), failures }, null, 2));
    downloadBlob(buildExportFilename("CSV取込ひな形", "zip"), await zip.generateAsync({ type: "blob" }));
    if (failures.length) return { warning: `${templates.length}アプリのひな形を保存 / 失敗 ${failures.length}アプリ
${failures.join("\n")}` };
    setStatus(`${templates.length}アプリのCSVひな形と入力ガイドを保存しました`);
    return {};
  }

  // src/entries/record-quality-ui.ts
  init_utils();
  function buildRecordQualityTab(root2, context) {
    const { panel, tgtApp, tgtGuest, resetMetadata, requiredApps, targetSummary, applyViewQuery } = context;
    const query = makeInput({ placeholder: "空欄で全件。検査対象を一覧から絞り込めます", width: "wide", ariaLabel: "データ検査のクエリ" });
    const useView = makeButton("▼ 一覧から", "sub");
    useView.addEventListener("click", () => applyViewQuery(query));
    root2.appendChild(makeRow([query, useView], { label: "クエリ" }));
    const load = makeButton("検査フィールド読込", "sub");
    const search = makeInput({ placeholder: "フィールド名・コードで絞り込み", width: "wide", ariaLabel: "検査フィールド検索" });
    const fieldBox = document.createElement("div");
    fieldBox.setAttribute("role", "group");
    fieldBox.setAttribute("aria-label", "検査するフィールド");
    fieldBox.style.cssText = "max-height:210px;overflow:auto;display:grid;gap:6px;padding:4px;overflow-wrap:anywhere";
    const note = makeNote("先頭の対象アプリからフィールドを読み込み、1〜5項目を選んでください。");
    const trim = makeCheck({ label: "文字列・リンクの前後の空白を無視", checked: false });
    const ignoreCase = makeCheck({ label: "文字列・リンクの英字の大小を無視", checked: false });
    root2.append(makeRow(load), search, fieldBox, note, makeRow([trim.label, ignoreCase.label]));
    root2.appendChild(makeNote("選んだ項目すべてが一致するレコードを、アプリごとに重複として検出します。空の項目があるレコードは未入力として別集計します。複数選択は順序を無視して比較します。"));
    root2.appendChild(makeNote("テーブル内・添付・計算・システム項目は対象外です。取得できたレコードだけを検査し、取得不可の項目は未入力と区別します。アプリ間の重複は検査しません。"));
    let fields = [], selected = /* @__PURE__ */ new Set(), version = 0, fieldsVersion = 0;
    let results = [];
    const output = document.createElement("div");
    output.setAttribute("aria-label", "データ検査結果");
    output.setAttribute("aria-live", "polite");
    const save = makeButton("検査結果をCSVで保存", "sub");
    save.hidden = true;
    const resetResults = () => {
      version++;
      results = [];
      output.replaceChildren();
      save.hidden = true;
    };
    const refreshNote = () => {
      note.textContent = `選択 ${selected.size}/5項目: ${fields.filter((field) => selected.has(field.code)).map((field) => `${field.label}［${field.code}］`).join("、") || "未選択"}`;
    };
    resetMetadata.push(() => {
      fieldsVersion++;
      fields = [];
      selected.clear();
      fieldBox.replaceChildren();
      resetResults();
      note.textContent = "対象アプリが変わりました。検査フィールドを再取得してください。";
    });
    for (const input of [query, trim.checkbox, ignoreCase.checkbox]) {
      input.addEventListener("input", resetResults);
      input.addEventListener("change", resetResults);
    }
    function renderFields() {
      const filter = search.value.toLowerCase();
      fieldBox.replaceChildren();
      for (const field of fields.filter((field2) => `${field2.label} ${field2.code}`.toLowerCase().includes(filter))) {
        const check = makeCheck({ label: `${field.label}［${field.code}］ / ${field.type}`, checked: selected.has(field.code) });
        check.checkbox.addEventListener("change", () => {
          if (check.checkbox.checked && selected.size >= 5) {
            check.checkbox.checked = false;
            panel.setStatus("フィールドは5項目まで選べます。", "warn");
            return;
          }
          if (check.checkbox.checked) selected.add(field.code);
          else selected.delete(field.code);
          resetResults();
          refreshNote();
        });
        fieldBox.appendChild(check.label);
      }
      if (fields.length && !fieldBox.childElementCount) fieldBox.appendChild(makeNote("一致するフィールドがありません。検索語を変えてください。"));
    }
    search.addEventListener("input", renderFields);
    load.addEventListener("click", () => liteRun(panel, "検査フィールドを取得中…", async () => {
      const current = ++fieldsVersion;
      fields = [];
      selected.clear();
      fieldBox.replaceChildren();
      resetResults();
      refreshNote();
      const loaded = await runLoadQualityFieldsStandalone({ appIdsText: tgtApp.value, guestId: tgtGuest.value.trim() });
      if (current !== fieldsVersion) {
        panel.setStatus("対象が変わりました。再取得してください。", "warn");
        return;
      }
      fields = loaded;
      renderFields();
      note.textContent = `${fields.length}項目を取得しました。1〜5項目を選んでください。`;
      panel.setStatus(note.textContent, fields.length ? "ok" : "warn");
    }));
    const run = makeButton("重複・未入力を検査", "primary");
    run.addEventListener("click", () => liteRun(panel, "レコードを検査中…", async () => {
      resetResults();
      const current = version;
      const guestId = tgtGuest.value.trim(), options = { trimText: trim.checkbox.checked, ignoreCase: ignoreCase.checkbox.checked };
      const queryText = query.value.trim();
      const inspected = await runRecordQualityStandalone({ appIdsText: tgtApp.value, guestId, codes: [...selected], query: queryText, ...options }, (message) => panel.setStatus(message, "busy"));
      if (current !== version) {
        panel.setStatus("対象や条件が変わりました。もう一度検査してください。", "warn");
        return;
      }
      results = inspected;
      let warning = false;
      for (const result of results) {
        const report = result.report;
        if (!report) {
          warning = true;
          output.appendChild(makeNote(`App ${result.appId}: 検査失敗 / ${result.error}`));
          continue;
        }
        warning || (warning = report.unavailableRecords > 0);
        output.appendChild(makeNote(`App ${result.appId}: ${report.total}件を検査 / 重複 ${report.duplicateGroups}組・${report.duplicateRecords}件 / 未入力 ${report.emptyRecords}件 / 取得不可 ${report.unavailableRecords}件`));
        const list = document.createElement("ol");
        list.style.cssText = "max-height:320px;overflow:auto;padding-left:24px;overflow-wrap:anywhere;font-size:12px";
        for (const finding of report.findings.slice(0, 50)) {
          const row = document.createElement("li"), link = document.createElement("a");
          link.textContent = `レコード ${finding.recordId}`;
          const recordPath = qualityRecordPath(result.appId, guestId, finding.recordId);
          if (recordPath) {
            link.href = recordPath;
            link.target = "_blank";
            link.rel = "noopener noreferrer";
          }
          row.append(
            document.createTextNode(`${finding.kind}${finding.group ? ` #${finding.group}` : ""} / `),
            link,
            document.createTextNode(` / ${finding.fields.join(", ")} / ${finding.values.map((value) => value.length > 120 ? value.slice(0, 120) + "…" : value).join(" | ")}`)
          );
          list.appendChild(row);
        }
        if (list.childElementCount) output.appendChild(list);
        if (report.findings.length > 50) output.appendChild(makeNote(`詳細表示は先頭50件です。CSVには全 ${report.findings.length}件を保存します。`));
      }
      save.onclick = () => {
        if (!results.length || current !== version) return;
        downloadBlob(buildExportFilename("データ検査結果", "csv"), new Blob([qualityReportCsv(results, guestId, location.origin, options, queryText)], { type: "text/csv;charset=utf-8" }));
        panel.setStatus("検査結果を保存しました。", warning ? "warn" : "ok");
      };
      save.hidden = false;
      panel.setStatus(`${results.length}アプリの検査が完了しました。${warning ? "取得不可・失敗の詳細を確認してください。" : "結果を確認し、必要に応じてCSVを保存できます。"}`, warning ? "warn" : "ok");
    }));
    root2.appendChild(makeRow(run));
    context.resultHost.append(output, makeRow(save));
    return {
      id: "quality",
      label: "重複・未入力を検査",
      description: "複数項目の重複・未入力を調べ、該当レコードを確認します。",
      button: run,
      validate: () => requiredApps() || (selected.size ? "" : "検査フィールドを読み込んで1〜5項目を選んでください。"),
      summary: () => [targetSummary(), ["条件", query.value.trim() || "全件"], ["検査項目", [...selected].join("、")], ["比較", `前後空白 ${trim.checkbox.checked ? "無視" : "区別"} / 大小文字 ${ignoreCase.checkbox.checked ? "無視" : "区別"}`]]
    };
  }
  function buildCsvTemplateTab(root2, context) {
    const { panel, tgtApp, tgtGuest, requiredApps, targetSummary } = context;
    root2.appendChild(makeNote("対象アプリの設定から、このツールのCSV取込に使えるひな形を作成します。フィールドコードを調べて入力する手間を省けます。"));
    root2.appendChild(makeNote("ZIP内のアプリ別フォルダに import.csv、必須・選択肢・初期値などをまとめた fields.csv、除外項目の excluded.csv、使い方の README.txt を保存します。ひな形にはデータ行を入れません。"));
    root2.appendChild(makeNote("取込に非対応のテーブル・添付・計算項目・ルックアップのコピー先は除外します。設定を取得できなかったアプリは完了メッセージと manifest.json に記録します。"));
    const run = makeButton("CSVひな形をZIPで保存", "primary");
    run.addEventListener("click", () => liteRun(panel, "CSVひな形を作成中…", async () => {
      const result = await runCsvTemplateStandalone({ appIdsText: tgtApp.value, guestId: tgtGuest.value.trim() }, (message) => panel.setStatus(message, "busy"));
      if (result.warning) panel.setStatus(result.warning, "warn");
    }));
    root2.appendChild(makeRow(run));
    return {
      id: "csv-template",
      label: "CSV取込ひな形を作成",
      description: "アプリのフィールドから取込CSVと入力ガイドを作ります。",
      button: run,
      validate: requiredApps,
      summary: () => [targetSummary(), ["保存内容", "CSVひな形・入力ガイド・除外項目・使い方（ZIP）"], ["データ行", "なし（2行目から入力してください）"]]
    };
  }

  // src/entries/record-lite-ui.ts
  function mountRecordLitePanel() {
    const panel = createLitePanel({
      id: "kus-record-lite",
      title: "レコード管理",
      subtitle: "CSV / データ検査 / バッチ更新 / 添付DL / コピー / バックアップ",
      accent: "record",
      badges: [{ label: "Lite" }, { label: "本番データ操作あり" }],
      hint: "<strong>本番データに直接書き込み・更新・コピーします。</strong>バックアップ取得を強く推奨します。",
      wide: true
    });
    const tgtApp = makeInput({ placeholder: "アプリID（カンマ区切りで複数指定）", value: DEFAULT_APP_ID || "", width: "wide", ariaLabel: "対象アプリID" });
    const tgtGuest = makeInput({ placeholder: "ゲストID（任意）", width: "guest" });
    let connectionVersion = 0;
    const resetMetadata = [];
    for (const input of [tgtApp, tgtGuest]) {
      for (const event of ["input", "change"]) input.addEventListener(event, () => {
        connectionVersion++;
        resetMetadata.forEach((reset) => reset());
      });
    }
    function notifyInput(input) {
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    }
    const cardApp = makeCard({ title: "接続情報", number: 1 });
    cardApp.body.appendChild(makeRow([tgtApp, tgtGuest], { label: "対象アプリ" }));
    cardApp.body.appendChild(makeNote("複数アプリは「463,464,469」のようにカンマ、改行、または空白で区切って指定できます。選択した操作を上から順にすべてのアプリへ実行します。"));
    cardApp.body.appendChild(makeNote("クエリに limit / offset は指定できません。order by を付けた場合は cursor API、無い場合はレコード ID 順で全件取得します（10,000 件超も可）。"));
    cardApp.body.appendChild(createAppSearchControl(panel, {
      guestEl: tgtGuest,
      targets: [{ label: "対象アプリ", apply: (id, _name, guestId) => {
        tgtApp.value = id;
        if (guestId && !tgtGuest.value.trim()) tgtGuest.value = guestId;
        notifyInput(tgtApp);
      } }]
    }));
    panel.body.insertBefore(cardApp.card, panel.status);
    const viewSelect = makeSelect([["", "一覧を選択（任意）"]]);
    viewSelect.setAttribute("aria-label", "取得した一覧");
    const loadViewsBtn = makeButton("一覧読込", "sub");
    cardApp.body.appendChild(makeRow([loadViewsBtn, viewSelect], { label: "一覧から条件" }));
    const viewNote = makeNote("先頭の対象アプリから一覧を取得し、各操作の「一覧から」で絞り込みと並び順をクエリに反映します。カレンダーの日付範囲やカスタマイズ画面の独自処理は含みません。");
    cardApp.body.appendChild(viewNote);
    let loadedViews = [];
    resetMetadata.push(() => {
      loadedViews = [];
      viewSelect.replaceChildren(new Option("一覧を選択（任意）", ""));
      viewNote.textContent = "対象アプリが変わりました。「一覧読込」で再取得してください。";
    });
    viewSelect.addEventListener("change", () => {
      const view = loadedViews.find((item) => item.id === viewSelect.value);
      const scopeNote = view?.type === "CALENDAR" ? "（カレンダーの表示月による絞り込みは含みません）" : view?.type === "CUSTOM" ? "（カスタマイズ画面の独自処理は含みません）" : "";
      viewNote.textContent = view ? `${view.name} / 条件: ${view.filter || "全件"} / 並び順: ${view.sort || "レコードID順"}${scopeNote}` : "適用する一覧を選んでください。";
    });
    loadViewsBtn.addEventListener("click", () => liteRun(panel, "一覧情報を取得中…", async () => {
      const version = connectionVersion;
      const [appId] = parseRecordAppIds(tgtApp.value);
      loadedViews = [];
      viewSelect.replaceChildren(new Option("一覧を選択（任意）", ""));
      const views = await runLoadViewsStandalone(
        { appId, guestId: tgtGuest.value.trim() },
        (m, e) => panel.setStatus(m, e ? "err" : "busy")
      );
      if (version !== connectionVersion) {
        panel.setStatus("対象アプリが変わりました。一覧を再取得してください。", "warn");
        return;
      }
      loadedViews = views;
      for (const v of views) {
        const opt = document.createElement("option");
        opt.value = v.id;
        const typeLabel = { LIST: "表", CALENDAR: "カレンダー", CUSTOM: "カスタマイズ" }[v.type] || v.type;
        opt.textContent = `${v.name}（${typeLabel}）`;
        viewSelect.appendChild(opt);
      }
      viewNote.textContent = `App ${appId} から ${views.length}件を取得しました。選択した一覧の絞り込み・並び順をクエリに反映できます。`;
      panel.setStatus(viewNote.textContent, views.length ? "ok" : "warn");
    }));
    function applyViewQuery(target) {
      const view = loadedViews.find((item) => item.id === viewSelect.value);
      if (!view) {
        panel.setStatus("接続情報で一覧を読み込み、適用する一覧を選んでください。", "warn");
        return;
      }
      target.value = view.query;
      notifyInput(target);
      panel.setStatus(`「${view.name}」をクエリに反映しました: ${view.query || "全件"}`, "ok");
    }
    const tabHost = document.createElement("div");
    panel.body.insertBefore(tabHost, panel.status);
    const recordActions = [];
    const requiredApps = () => {
      try {
        return parseRecordAppIds(tgtApp.value).length ? "" : "対象アプリを指定してください。";
      } catch (error) {
        return error.message;
      }
    };
    const targetSummary = () => ["対象アプリ", connectionSummary(tgtApp.value.trim(), tgtGuest.value.trim())];
    const addAction = (action) => {
      action.onSelect = () => {
        tabs.bar.querySelector('[data-tab="' + action.id + '"]')?.click();
        const hint = panel.body.querySelector(".kus-lp__hint");
        if (hint) hint.textContent = action.writes ? "本番データを変更する操作です。実行前に対象と条件を確認してください。" : "読み取り操作です。アプリのレコードは変更しません。";
      };
      recordActions.push(action);
    };
    const qualityResults = document.createElement("div");
    const qualityContext = { panel, tgtApp, tgtGuest, resetMetadata, requiredApps, targetSummary, applyViewQuery, resultHost: qualityResults };
    const tabs = makeTabs([
      {
        id: "csv-export",
        label: "CSV出力",
        build: (root2) => {
          const query = makeInput({ placeholder: '空欄で全件（例: 更新日時 >= "2026-01-01T00:00:00Z"）', width: "wide" });
          const fname = makeInput({ placeholder: "空欄で自動命名（CSV / テーブルあり・複数アプリはZIP）", width: "wide" });
          const useView = makeButton("▼ 一覧から", "sub");
          useView.addEventListener("click", () => applyViewQuery(query));
          root2.appendChild(makeRow([query, useView], { label: "クエリ" }));
          root2.appendChild(makeRow(fname, { label: "ファイル名" }));
          root2.appendChild(makeNote("1アプリはCSVで保存します。テーブルがある場合は親レコードとテーブル明細を別CSVにしてZIPにまとめます。複数アプリはアプリ別フォルダを1つのZIPに保存します。"));
          root2.appendChild(makeNote("テーブル明細は親レコードの $id で紐付けできます。出力は閲覧・集計用で、CSV取込用の互換形式ではありません。添付はファイル名のみです。ファイル本体はバックアップの「添付ファイルも保存」で取得できます。"));
          const run = makeButton("CSVを出力", "primary", { icon: "↓" });
          run.style.width = "100%";
          run.addEventListener("click", () => liteRun(panel, "CSV出力中…", async () => {
            const appIds = parseRecordAppIds(tgtApp.value);
            await runCsvExportBatchStandalone(
              { apps: appIds.map((appId) => ({ appId, guestId: tgtGuest.value.trim() })), query: query.value.trim(), filename: fname.value.trim() },
              (m, e) => panel.setStatus(m, e ? "err" : "busy")
            );
          }));
          addAction({ id: "csv-export", label: "CSVを出力", description: "条件に合うレコードとテーブル明細をCSV / ZIPで保存します。", button: run, validate: requiredApps, summary: () => [targetSummary(), ["条件", query.value.trim() || "全件"], ["保存形式", !requiredApps() && parseRecordAppIds(tgtApp.value).length > 1 ? "ZIP（アプリ別フォルダに親CSV・テーブル明細CSV）" : "CSV（テーブルがある場合は親CSV・明細CSVのZIP）"], ["ファイル名", fname.value.trim() || "自動命名"]] });
          root2.appendChild(makeRow(run));
        }
      },
      {
        id: "csv-import",
        label: "CSV取込",
        build: (root2) => {
          const fileInput = document.createElement("input");
          fileInput.type = "file";
          fileInput.accept = ".csv";
          fileInput.className = "kus-lp__file";
          fileInput.setAttribute("aria-label", "取込CSV");
          root2.appendChild(makeRow(fileInput, { label: "CSV" }));
          root2.appendChild(makeNote("UTF-8 / Excel BOM 対応。ヘッダ行はフィールドコード。ファイル・サブテーブル・ステータスは取込対象外です。100 件単位で追加し、途中で失敗した場合は確定済み件数と未処理件数を表示します。"));
          const preview = makeButton("CSVを事前検査", "sub");
          const previewText = document.createElement("pre");
          previewText.setAttribute("aria-label", "CSV事前検査結果");
          previewText.style.cssText = "white-space:pre-wrap;overflow-wrap:anywhere;max-height:300px;overflow:auto;font-size:12px";
          previewText.hidden = true;
          let csvVersion = 0;
          let previewSummary = "未実施（実行時にも検査します）";
          const clearPreview = () => {
            csvVersion++;
            previewSummary = "対象やCSVが変わりました。再検査できます。";
            previewText.textContent = "";
            previewText.hidden = true;
          };
          resetMetadata.push(clearPreview);
          fileInput.addEventListener("change", clearPreview);
          preview.addEventListener("click", () => liteRun(panel, "CSVを事前検査中…", async () => {
            const version = csvVersion;
            const results = await runPreviewCsvImportStandalone(
              { appIdsText: tgtApp.value, guestId: tgtGuest.value.trim(), file: fileInput.files?.[0] },
              (message, error) => panel.setStatus(message, error ? "warn" : "busy")
            );
            if (version !== csvVersion) {
              panel.setStatus("対象やCSVが変わりました。もう一度事前検査してください。", "warn");
              return;
            }
            const problemApps = results.filter((result) => result.error || result.report?.issueCount).length;
            previewSummary = `${results.length}アプリを検査 / 問題あり ${problemApps}アプリ`;
            previewText.textContent = results.map((result) => `App ${result.appId}
${result.error || formatCsvImportReport(result.report)}${result.report ? "\n先頭5行・6列まで:\n" + result.report.sample.map((sample) => `${sample.row}行目: ${sample.values.map((value) => JSON.stringify(value)).join(" | ")}`).join("\n") : ""}`).join("\n\n");
            previewText.hidden = false;
            panel.setStatus(`${previewSummary}。まだ書き込んでいません。`, problemApps ? "warn" : "ok");
          }));
          root2.appendChild(makeRow(preview));
          root2.appendChild(previewText);
          root2.appendChild(makeNote("全対象アプリで列数・必須項目・選択肢・数値形式・CSV内の同一値重複を確認します。問題があれば最初の書き込み前に止めます。権限や既存データとの重複などは登録時に確認されます。"));
          const run = makeButton("レコードを取込", "primary", { icon: "↑" });
          run.style.width = "100%";
          run.addEventListener("click", () => liteRun(panel, "CSV取込中…", async () => {
            const result = await runCsvImportBatchStandalone(
              { appIdsText: tgtApp.value, guestId: tgtGuest.value.trim(), file: fileInput.files?.[0] },
              (m, e) => panel.setStatus(m, e ? "err" : "busy")
            );
            if (result?.warning) panel.setStatus(result.warning, "warn");
          }));
          addAction({ id: "csv-import", label: "CSVからレコードを追加", description: "CSVのレコードを対象アプリに新規追加します。", button: run, writes: true, validate: () => requiredApps() || (fileInput.files?.length ? "" : "取り込むCSVを選んでください。"), summary: () => [targetSummary(), ["CSV", fileInput.files?.[0]?.name || "未選択"], ["事前検査", previewSummary], ["処理", "全対象を再検査してから各アプリへ新規レコードを追加"]] });
          root2.appendChild(makeRow(run));
        }
      },
      {
        id: "csv-template",
        label: "CSVひな形",
        build: (root2) => addAction(buildCsvTemplateTab(root2, qualityContext))
      },
      {
        id: "quality",
        label: "データ検査",
        build: (root2) => addAction(buildRecordQualityTab(root2, qualityContext))
      },
      {
        id: "status",
        label: "ステータス",
        build: (root2) => {
          const query = makeInput({ placeholder: '条件 (例: status = "新規")', width: "wide" });
          const action = makeInput({ placeholder: "アクション名", width: "medium" });
          const assignee = makeInput({ placeholder: "次の作業者ログイン名（必要な場合）", width: "medium" });
          const actionSelect = makeSelect([["", "--"]]);
          actionSelect.setAttribute("aria-label", "取得したプロセスアクション");
          const loadActions = makeButton("アクション読込", "sub");
          const applyActionQuery = makeButton("選択アクションの対象条件を入力", "sub");
          const actionNote = makeNote("先頭アプリからアクションを取得し、遷移元・実行条件・次の作業者設定を確認できます。");
          actionNote.style.whiteSpace = "pre-wrap";
          let loadedActions = [];
          let statusFieldCode = "";
          let lastAppliedQuery = "";
          let lastAppliedChoice;
          const selectedAction = () => actionSelect.value === "" ? void 0 : loadedActions[Number(actionSelect.value)];
          const staleActionQuery = () => !!lastAppliedChoice && !!selectedAction() && selectedAction() !== lastAppliedChoice && query.value === lastAppliedQuery;
          const clearActions = () => {
            loadedActions = [];
            statusFieldCode = "";
            lastAppliedChoice = void 0;
            lastAppliedQuery = "";
            actionSelect.replaceChildren(new Option("--", ""));
            actionNote.textContent = "アクションを読み込んで選択してください。入力済みの名前とクエリは変更しません。";
          };
          resetMetadata.push(clearActions);
          const useView = makeButton("▼ 一覧から", "sub");
          useView.addEventListener("click", () => applyViewQuery(query));
          root2.appendChild(makeRow([query, useView], { label: "クエリ" }));
          root2.appendChild(makeRow([action, actionSelect, loadActions], { label: "アクション" }));
          action.addEventListener("input", () => {
            actionSelect.value = "";
            actionNote.textContent = "アクション名を手入力しています。対象条件と作業者を確認してください。";
          });
          actionSelect.addEventListener("change", () => {
            const choice = selectedAction();
            if (!choice) return;
            const selected = actionSelect.value;
            action.value = choice.name;
            notifyInput(action);
            actionSelect.value = selected;
            actionNote.textContent = describeProcessAction(choice);
            if (staleActionQuery()) actionNote.textContent += "\nクエリには前のアクションの条件が残っています。「対象条件を入力」で更新するか、クエリを編集してください。";
          });
          applyActionQuery.addEventListener("click", () => {
            try {
              const choice = selectedAction();
              if (!choice) throw new Error("先にアクションを読み込んで選択してください。");
              query.value = processActionQuery(choice, statusFieldCode);
              lastAppliedQuery = query.value;
              lastAppliedChoice = choice;
              actionNote.textContent = describeProcessAction(choice);
              notifyInput(query);
              panel.setStatus("遷移元と実行条件をクエリに入力しました。対象と次の作業者を確認してください。", "ok");
            } catch (error) {
              panel.setStatus(error.message || String(error), "warn");
            }
          });
          loadActions.addEventListener("click", () => liteRun(panel, "プロセス管理を取得中…", async () => {
            const version = connectionVersion;
            clearActions();
            const [appId] = parseRecordAppIds(tgtApp.value);
            const info = await runLoadStatusActionsStandalone(
              { appId, guestId: tgtGuest.value.trim() },
              (m, e) => panel.setStatus(m, e ? "err" : "busy")
            );
            if (version !== connectionVersion) {
              panel.setStatus("対象アプリが変わりました。アクションを再取得してください。", "warn");
              return;
            }
            loadedActions = info.actions;
            statusFieldCode = info.statusFieldCode;
            for (const [index, a] of info.actions.entries()) {
              const opt = new Option(`${a.name} (${a.from} → ${a.to})${a.type === "SECONDARY" ? "・作業者以外も可" : ""}${a.ambiguous ? "・同名重複のため指定不可" : ""}`, String(index));
              opt.disabled = a.ambiguous;
              actionSelect.appendChild(opt);
            }
            const ambiguous = info.actions.filter((a) => a.ambiguous).length;
            actionNote.textContent = !info.enabled ? "プロセス管理は無効です。" : `App ${appId}: ${info.actions.length}アクションを取得しました。${ambiguous ? `同じ遷移元の同名アクション ${ambiguous}件はREST APIで指定できません。` : "アクションを選んで実行条件を確認してください。"}`;
            panel.setStatus(actionNote.textContent, ambiguous || !info.enabled ? "warn" : "ok");
          }));
          root2.appendChild(actionNote);
          root2.appendChild(makeRow(applyActionQuery));
          root2.appendChild(makeNote("「対象条件を入力」は現在のクエリを置き換えます。複数アプリでは同じフィールドコード・状態名を使うことを確認してください。実行権限や作業者候補はkintone側で判定されます。"));
          root2.appendChild(makeRow(assignee, { label: "次の作業者" }));
          root2.appendChild(makeNote("対象 100 件単位でステータス更新します。元に戻せません。"));
          const run = makeButton("ステータスを一括更新", "primary");
          run.style.width = "100%";
          run.classList.add("kus-lp__btn--danger");
          run.addEventListener("click", () => liteRun(panel, "ステータス一括更新中…", async () => {
            await runRecordAppBatchStandalone(tgtApp.value, (appId) => runBatchProcessStandalone(
              { appId, guestId: tgtGuest.value.trim(), query: query.value.trim(), action: action.value.trim(), assignee: assignee.value.trim() || null },
              (m, e) => panel.setStatus(m, e ? "err" : "busy")
            ), (m, e) => panel.setStatus(m, e ? "err" : "busy"));
          }));
          addAction({ id: "status", label: "ステータスを一括更新", description: "指定条件に合うレコードの状態を更新します。", button: run, writes: true, validate: () => requiredApps() || (action.value.trim() ? "" : "実行するアクションを指定してください。") || (staleActionQuery() ? "前のアクションの対象条件が残っています。条件を入力し直すかクエリを編集してください。" : ""), summary: () => [targetSummary(), ["条件", query.value.trim() || "全件"], ["アクション", action.value.trim()], ["選択した遷移", selectedAction() ? `${selectedAction().from} → ${selectedAction().to}` : "手入力"], ["次の作業者", assignee.value.trim() || "指定なし"]] });
          root2.appendChild(makeRow(run));
        }
      },
      {
        id: "attach",
        label: "添付DL",
        build: (root2) => {
          const query = makeInput({ placeholder: "条件 (任意)", width: "wide" });
          const fileCode = makeInput({ placeholder: "例: attached_file", width: "medium" });
          fileCode.setAttribute("aria-label", "添付フィールドコード");
          const tableCode = makeInput({ placeholder: "テーブル内の場合のみ指定", width: "medium", ariaLabel: "添付のテーブルコード" });
          const fileSelect = makeSelect([["", "添付フィールドを選択"]]);
          fileSelect.setAttribute("aria-label", "取得した添付フィールド");
          const loadFields = makeButton("添付フィールド読込", "sub");
          const fieldNote = makeNote("先頭アプリのフィールド名から選べます。複数アプリへ実行するときは、各アプリで同じフィールドコードが使われていることを確認してください。");
          let loadedFields = [];
          const resetFields = () => {
            loadedFields = [];
            fileSelect.replaceChildren(new Option("添付フィールドを選択", ""));
          };
          resetMetadata.push(() => {
            resetFields();
            fieldNote.textContent = "対象アプリが変わりました。フィールドを再取得し、入力済みのコードを確認してください。";
          });
          for (const input of [fileCode, tableCode]) input.addEventListener("input", () => {
            fileSelect.value = "";
          });
          fileSelect.addEventListener("change", () => {
            if (fileSelect.value === "") return;
            const choice = loadedFields[Number(fileSelect.value)];
            if (!choice) return;
            const selected = fileSelect.value;
            fileCode.value = choice.fileFieldCode;
            tableCode.value = choice.tableFieldCode;
            notifyInput(fileCode);
            notifyInput(tableCode);
            fileSelect.value = selected;
          });
          loadFields.addEventListener("click", () => liteRun(panel, "添付フィールドを取得中…", async () => {
            const version = connectionVersion;
            const [appId] = parseRecordAppIds(tgtApp.value);
            resetFields();
            const fields = await runLoadAttachmentFieldsStandalone(
              { appId, guestId: tgtGuest.value.trim() },
              (m, e) => panel.setStatus(m, e ? "err" : "busy")
            );
            if (version !== connectionVersion) {
              panel.setStatus("対象アプリが変わりました。フィールドを再取得してください。", "warn");
              return;
            }
            loadedFields = fields;
            fields.forEach((field, index) => fileSelect.appendChild(new Option(
              `${field.tableFieldCode ? `${field.tableLabel}［${field.tableFieldCode}］ / ` : ""}${field.fileLabel}［${field.fileFieldCode}］`,
              String(index)
            )));
            fieldNote.textContent = `App ${appId}: 添付フィールド ${fields.length}件。${fields.length ? "名前を選ぶとコードが入力されます。" : "添付フィールドがありません。"}`;
            panel.setStatus(fieldNote.textContent, fields.length ? "ok" : "warn");
          }));
          const folderCode = makeInput({ placeholder: "任意（フォルダ名にするフィールド）", width: "medium" });
          const zipName = makeInput({ placeholder: "空欄で自動命名（添付ファイル_アプリ_日時.zip）", width: "wide" });
          const useView = makeButton("▼ 一覧から", "sub");
          useView.addEventListener("click", () => applyViewQuery(query));
          root2.appendChild(makeRow([query, useView], { label: "クエリ" }));
          root2.appendChild(makeRow([loadFields, fileSelect], { label: "名前から選択" }));
          root2.appendChild(fieldNote);
          root2.appendChild(makeRow(fileCode, { label: "ファイル" }));
          root2.appendChild(makeRow(tableCode, { label: "テーブル" }));
          root2.appendChild(makeRow(folderCode, { label: "フォルダ" }));
          root2.appendChild(makeRow(zipName, { label: "ZIP名" }));
          root2.appendChild(makeNote("取得できなかったファイル（閲覧権限なし等）は ZIP 内の download_errors.txt に記録し、完了メッセージに件数を表示します。"));
          root2.appendChild(makeNote("テーブル内の添付はレコード・テーブル行ごとに保存します。manifest.json で元レコード、行ID、ファイル名、サイズ、保存先を確認できます。"));
          const run = makeButton("添付ファイルをZIPで保存", "primary", { icon: "↓" });
          run.style.width = "100%";
          run.addEventListener("click", () => liteRun(panel, "添付ファイル取得中…", async () => {
            await runRecordAppBatchStandalone(tgtApp.value, (appId) => runAttachmentDownloadStandalone(
              {
                appId,
                guestId: tgtGuest.value.trim(),
                query: query.value.trim(),
                fileFieldCode: fileCode.value.trim(),
                tableFieldCode: tableCode.value.trim(),
                folderFieldCode: folderCode.value.trim(),
                zipName: zipName.value.trim()
              },
              (m, e) => panel.setStatus(m, e ? "err" : "busy")
            ), (m, e) => panel.setStatus(m, e ? "err" : "busy"));
          }));
          addAction({ id: "attach", label: "添付ファイルを保存", description: "添付ファイルを取得しZIPにまとめます。", button: run, validate: () => requiredApps() || (fileCode.value.trim() ? "" : "添付ファイルのフィールドコードを指定してください。"), summary: () => [targetSummary(), ["条件", query.value.trim() || "全件"], ["添付フィールド", [tableCode.value.trim(), fileCode.value.trim()].filter(Boolean).join(" / ")], ["ZIP名", zipName.value.trim() || "自動命名"]] });
          root2.appendChild(makeRow(run));
        }
      },
      {
        id: "copy",
        label: "コピー",
        build: (root2) => {
          const srcApp = makeInput({ placeholder: "コピー元アプリID", width: "id" });
          const srcGuest = makeInput({ placeholder: "ゲスト (任意)", width: "guest" });
          const query = makeInput({ placeholder: "条件 (任意)", width: "wide" });
          root2.appendChild(makeRow([srcApp, srcGuest], { label: "コピー元" }));
          root2.appendChild(createAppSearchControl(panel, {
            guestEl: srcGuest,
            targets: [{ label: "コピー元", apply: (id, _name, guestId) => {
              srcApp.value = id;
              if (guestId && !srcGuest.value.trim()) srcGuest.value = guestId;
            } }]
          }));
          root2.appendChild(makeRow(query, { label: "クエリ" }));
          root2.appendChild(makeNote("コピー元の絞り込んだレコードを、対象アプリへ新規レコードとして追加します。ファイル・システム項目・計算項目と、対象アプリに無い（または型が異なる）フィールドは除外し、除外したフィールドコードを実行前に表示します。"));
          const run = makeButton("レコードをコピー実行", "primary");
          run.style.width = "100%";
          run.classList.add("kus-lp__btn--danger");
          run.addEventListener("click", () => liteRun(panel, "レコードコピー中…", async () => {
            await runRecordAppBatchStandalone(tgtApp.value, (targetAppId) => runRecordCopyStandalone(
              {
                sourceAppId: srcApp.value.trim(),
                sourceGuestId: srcGuest.value.trim(),
                targetAppId,
                targetGuestId: tgtGuest.value.trim(),
                query: query.value.trim()
              },
              (m, e) => panel.setStatus(m, e ? "err" : "busy")
            ), (m, e) => panel.setStatus(m, e ? "err" : "busy"));
          }));
          addAction({ id: "copy", label: "レコードをコピー", description: "コピー元のレコードを対象アプリへ新規追加します。", button: run, writes: true, validate: () => requiredApps() || (srcApp.value.trim() ? "" : "コピー元アプリを指定してください。"), summary: () => [["コピー元", connectionSummary(srcApp.value.trim(), srcGuest.value.trim())], ["コピー先", connectionSummary(tgtApp.value.trim(), tgtGuest.value.trim())], ["コピー元の条件", query.value.trim() || "全件"]] });
          root2.appendChild(makeRow(run));
        }
      },
      {
        id: "backup",
        label: "バックアップ",
        build: (root2) => {
          const query = makeInput({ placeholder: "条件 (任意・全件は空)", width: "wide" });
          const zipName = makeInput({ placeholder: "空欄で自動命名（レコードバックアップ_アプリ_日時.zip）", width: "wide" });
          const useView = makeButton("▼ 一覧から", "sub");
          useView.addEventListener("click", () => applyViewQuery(query));
          root2.appendChild(makeRow([query, useView], { label: "クエリ" }));
          root2.appendChild(makeRow(zipName, { label: "ZIP名" }));
          const incFiles = makeCheck({ label: "添付ファイルも保存", checked: true });
          const incComments = makeCheck({ label: "コメントも保存", checked: true });
          const incSettings = makeCheck({ label: "アプリ設定も保存", checked: false });
          const optGrid = document.createElement("div");
          optGrid.className = "kus-lp__check-grid";
          optGrid.appendChild(incFiles.label);
          optGrid.appendChild(incComments.label);
          optGrid.appendChild(incSettings.label);
          root2.appendChild(optGrid);
          const scopeBox = document.createElement("div");
          scopeBox.className = "kus-lp__chips";
          scopeBox.style.display = "none";
          const chips = SECTION_DEFS.map((d) => makeChip({ label: d.label, value: d.key, checked: ["fieldSettings", "layoutSettings", "viewSettings", "processSettings"].includes(d.key) }));
          chips.forEach((c) => scopeBox.appendChild(c.label));
          root2.appendChild(scopeBox);
          incSettings.checkbox.addEventListener("change", () => {
            scopeBox.style.display = incSettings.checkbox.checked ? "flex" : "none";
          });
          root2.appendChild(makeNote("ZIPには親レコードの records.csv / records.json と manifest.json を含みます。テーブルがある場合は tables/ に明細CSVを追加し、親レコードの $id で紐付けできます。添付のファイル本体は「添付ファイルも保存」で取得します。"));
          root2.appendChild(makeNote("CSVは閲覧・集計用で、CSV取込用の互換形式ではありません。取得できなかった添付・コメント・設定は manifest.json に記録し、完了メッセージに件数を表示します。"));
          const run = makeButton("バックアップ ZIP を保存", "primary", { icon: "↓" });
          run.style.width = "100%";
          run.addEventListener("click", () => liteRun(panel, "レコードバックアップ中…", async () => {
            await runRecordAppBatchStandalone(tgtApp.value, (appId) => runRecordBackupStandalone(
              {
                appId,
                guestId: tgtGuest.value.trim(),
                query: query.value.trim(),
                zipName: zipName.value.trim(),
                includeFiles: incFiles.checkbox.checked,
                includeComments: incComments.checkbox.checked,
                includeAppSettings: incSettings.checkbox.checked,
                appScopes: chips.filter((c) => c.checkbox.checked).map((c) => c.checkbox.value)
              },
              (m, e) => panel.setStatus(m, e ? "err" : "busy")
            ), (m, e) => panel.setStatus(m, e ? "err" : "busy"));
          }));
          addAction({ id: "backup", label: "バックアップを保存", description: "レコード・テーブル明細と選択した関連データをZIPで保存します。", button: run, validate: requiredApps, summary: () => [targetSummary(), ["条件", query.value.trim() || "全件"], ["保存内容", ["レコード・テーブル明細", incFiles.checkbox.checked ? "添付ファイル" : "", incComments.checkbox.checked ? "コメント" : "", incSettings.checkbox.checked ? "選択したアプリ設定" : ""].filter(Boolean).join("、")]] });
          root2.appendChild(makeRow(run));
        }
      }
    ]);
    tabHost.appendChild(tabs.bar);
    tabHost.appendChild(tabs.panels);
    tabs.bar.hidden = true;
    tgtGuest.setAttribute("aria-label", "対象のゲストスペースID");
    installLiteWorkflow(panel, { setup: [cardApp.card, tabHost], actions: recordActions, results: [qualityResults], resultActions: ["quality"] });
  }

  // src/entries/record-lite-entry.ts
  runOnKintonePage(mountRecordLitePanel);
})();
