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
          sections: /* @__PURE__ */ new Set(["fieldSettings", "processSettings", "layoutSettings", "actionSettings", "appAcl", "fieldAcl", "recordPermissions", "viewSettings", "reportSettings", "customizeSettings", "notifications", "perRecordNotifications", "reminderNotifications", "categories", "pluginSettings", "formSettings"]),
          ignoreKeys: /* @__PURE__ */ new Set(["index", "no", "order"]),
          unorderedArrays: true
        },
        fieldOrder: {
          label: "フィールド/レイアウト順序",
          sections: /* @__PURE__ */ new Set(["fieldSettings", "layoutSettings", "formSettings"]),
          ignoreKeys: /* @__PURE__ */ new Set(["index", "no", "order", "x", "y"]),
          unorderedArrays: true
        },
        processOrder: {
          label: "プロセスの並び順",
          sections: /* @__PURE__ */ new Set(["processSettings"]),
          ignoreKeys: /* @__PURE__ */ new Set(["index", "no", "order"]),
          unorderedArrays: true
        },
        appReferences: {
          label: "アプリID（比較対象・参照先）",
          sections: /* @__PURE__ */ new Set(["appInfo", "fieldSettings", "actionSettings"]),
          ignoreKeys: /* @__PURE__ */ new Set(),
          unorderedArrays: false,
          ignoreAppReferencePaths: true
        },
        auditMeta: {
          label: "監査/リビジョン情報",
          sections: /* @__PURE__ */ new Set(["fieldSettings", "layoutSettings", "viewSettings", "reportSettings", "processSettings", "appSettings", "formSettings", "customizeSettings", "pluginSettings", "actionSettings", "appAcl", "fieldAcl", "recordPermissions", "notifications", "perRecordNotifications", "reminderNotifications", "categories"]),
          ignoreKeys: /* @__PURE__ */ new Set(["id", "revision", "createdAt", "createdat", "creator", "modifiedAt", "modifiedat", "modifier", "updatedAt", "updatedat", "updatedBy", "updatedby"]),
          unorderedArrays: false
        },
        labelsAndText: {
          label: "ラベル/説明文/ヘルプ",
          sections: /* @__PURE__ */ new Set(["fieldSettings", "layoutSettings", "viewSettings", "reportSettings", "processSettings", "appSettings", "formSettings", "actionSettings", "notifications", "perRecordNotifications", "reminderNotifications"]),
          ignoreKeys: /* @__PURE__ */ new Set(["label", "name", "description", "help", "helpText", "tooltip"]),
          unorderedArrays: false
        },
        appearance: {
          label: "見た目/幅/座標",
          sections: /* @__PURE__ */ new Set(["fieldSettings", "layoutSettings", "viewSettings", "formSettings"]),
          ignoreKeys: /* @__PURE__ */ new Set(["width", "height", "minWidth", "maxWidth", "x", "y", "size", "thumbnailSize", "paginationStyle", "pager"]),
          unorderedArrays: false
        },
        fileKeys: {
          label: "添付/JS/CSS fileKey",
          sections: /* @__PURE__ */ new Set(["customizeSettings", "pluginSettings", "appSettings"]),
          ignoreKeys: /* @__PURE__ */ new Set(["fileKey", "filekey", "contentKey", "contentkey", "blobKey", "blobkey"]),
          unorderedArrays: false
        },
        enabledFlags: {
          label: "有効/無効フラグ",
          sections: /* @__PURE__ */ new Set(["processSettings", "pluginSettings", "customizeSettings", "notifications", "perRecordNotifications", "reminderNotifications"]),
          ignoreKeys: /* @__PURE__ */ new Set(["enable", "enabled", "disabled", "active"]),
          unorderedArrays: false
        }
      };
      LINE_DIFF_MAX_CELLS = 9e4;
      CHAR_DIFF_MAX_CELLS = 2e4;
      DEFAULT_IGNORE_KEYS = /* @__PURE__ */ new Set([
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
    let text2 = String(value ?? "");
    if (!text2.includes("&")) return text2;
    for (let i = 0; i < 3; i += 1) {
      const next = text2.replace(/&(#(\d+)|#x([0-9a-f]+)|[a-z][a-z0-9]+);/gi, (match, token, dec, hex) => {
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
      if (next === text2) break;
      text2 = next;
    }
    return text2;
  }
  function stripHtmlToText(value) {
    let text2 = decodeHtmlEntities(value);
    if (!/[<>]/.test(text2)) return text2;
    text2 = text2.replace(/<\s*br\s*\/?\s*>/gi, "\n").replace(/<\s*\/\s*(p|div|li|tr|h[1-6])\s*>/gi, "\n").replace(/<\s*\/?\s*[a-z][^>]*>/gi, "");
    return decodeHtmlEntities(text2).replace(/\n{3,}/g, "\n\n").trim();
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
    const text2 = String(value || "").trim();
    const cleaned = text2.replace(/[\\/:*?"<>|]/g, " ").replace(/\s+/g, " ").trim();
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
  function downloadText(filename, text2, type) {
    triggerDownload(filename, new Blob([text2], { type: type || "text/plain" }));
  }
  function downloadBlob(filename, blob) {
    triggerDownload(filename, blob);
  }
  function readTextFile(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result || ""));
      r.onerror = () => reject(r.error || new Error("ファイル読み込みに失敗しました"));
      r.readAsText(file, "utf-8");
    });
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
    const text2 = String(error?.message || "");
    const matched = text2.match(/\b(?:HTTP(?:\/\d+(?:\.\d+)?)?(?:\s+status(?:\s+code)?)?|status(?:\s+code)?)\s*(?::|=|-)?\s*([45]\d{2})\b/i);
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
  function fnv1aHashString(text2) {
    let h = 2166136261;
    for (let i = 0; i < text2.length; i++) {
      h ^= text2.charCodeAt(i);
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
          if (stats.failed > 0) setAuxiliaryFetchError(plug, "プラグイン設定", stats.failed);
        } catch (e) {
          setAuxiliaryFetchError(plug, "プラグイン設定", 0, e);
        }
      }
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
  var DEFAULT_API_GET_RETRIES, DEFAULT_RETRY_BASE_DELAY_MS, DEFAULT_RETRY_MAX_DELAY_MS, RETRIABLE_STATUS_CODES, apiGetMetrics, CUSTOMIZE_BODY_MAX_BYTES, CUSTOMIZE_BODY_FETCH_CONCURRENCY, TEXT_LIKE_EXT;
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
  function trimIgnoreToken(token) {
    return String(token || "").replace(/[\u200b\u200c\u200d\ufeff]/g, "").replace(/^[\s\u3000]+|[\s\u3000]+$/g, "");
  }
  function encodeExactIgnorePathRule(path) {
    const exactPath = trimIgnoreToken(path);
    return exactPath ? `${EXACT_IGNORE_PATH_PREFIX}${encodeURIComponent(exactPath)}` : "";
  }
  function decodeExactIgnorePathRule(rule) {
    const token = trimIgnoreToken(rule);
    if (!token.toLowerCase().startsWith(EXACT_IGNORE_PATH_PREFIX)) return null;
    try {
      const decoded = trimIgnoreToken(decodeURIComponent(token.slice(EXACT_IGNORE_PATH_PREFIX.length)));
      return decoded || null;
    } catch {
      return null;
    }
  }
  function tokenLooksLikePath(token) {
    return token.includes(".") || token.includes("[") || SECTION_DEFS.some((section) => normalizeIgnoreToken(section.key) === normalizeIgnoreToken(token));
  }
  function tokenHasWildcard(token) {
    return token.includes("*");
  }
  function compileWildcardRegex(token) {
    const escaped = token.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
    return new RegExp(`^${escaped}$`);
  }
  function parseIgnoreRules(text2) {
    const keySet = new Set(DEFAULT_IGNORE_KEYS);
    const pathSet = /* @__PURE__ */ new Set();
    const exactPathSet = /* @__PURE__ */ new Set();
    const keyPatterns = [];
    const pathPatterns = [];
    String(text2 || "").split(/[\n\r,、，;；]+/).map(trimIgnoreToken).filter(Boolean).forEach((rawToken) => {
      const exactPath = decodeExactIgnorePathRule(rawToken);
      if (exactPath) {
        exactPathSet.add(exactPath);
        return;
      }
      const token = normalizeIgnoreToken(rawToken);
      const isPath = tokenLooksLikePath(token);
      const cleaned = token;
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
    return { keySet, pathSet, exactPathSet, keyPatterns, pathPatterns };
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
  function isEntityIdentifierChildPath(path) {
    const normalizedPath = normalizeIgnoreToken(path);
    if (!normalizedPath) return false;
    return /^(?:fieldsettings\.properties|viewsettings\.views|reportsettings\.reports|processsettings\.states|categories\.categories)\.[^.[\]]+$/.test(normalizedPath) || /^fieldsettings\.properties\.[^.[\]]+\.fields\.[^.[\]]+$/.test(normalizedPath);
  }
  function isIgnoredPath(ignoreRules, path) {
    const exactPath = trimIgnoreToken(path);
    if (exactPath && ignoreRules.exactPathSet?.has(exactPath)) return true;
    const normalizedPath = normalizeIgnoreToken(path);
    if (!normalizedPath) return false;
    if (ignoreRules.pathSet.has(normalizedPath)) return true;
    if (matchAnyPattern(ignoreRules.pathPatterns, normalizedPath)) return true;
    if (isEntityIdentifierChildPath(normalizedPath)) return false;
    const leaf = getPathLeafKey(normalizedPath);
    if (!leaf) return false;
    if (ignoreRules.keySet.has(leaf)) return true;
    return matchAnyPattern(ignoreRules.keyPatterns, leaf);
  }
  function isIgnoredObjectProperty(ignoreRules, key, path) {
    if (!isEntityIdentifierChildPath(path) && META_KEYS.has(key)) return true;
    return isIgnoredPath(ignoreRules, path);
  }
  function markDroppedDiffRow(out, row, kind) {
    if (!out) return;
    if (kind === "same") out.__sameDropped = Number(out.__sameDropped || 0) + 1;
    else out.__diffDropped = Number(out.__diffDropped || 0) + 1;
    const sectionKey = String(row?.sectionKey || String(row?.path || "").split(".")[0].split("[")[0] || "");
    if (!sectionKey) return;
    const bySection = out.__droppedBySection || (out.__droppedBySection = {});
    const entry = bySection[sectionKey] || (bySection[sectionKey] = { diff: 0, same: 0 });
    entry[kind] += 1;
  }
  function pushDiffRow(out, row, ignoreRules) {
    if (!row) return false;
    if (isIgnoredPath(ignoreRules, row.path)) return false;
    if (row._displayOnly) {
      out.push(row);
      return true;
    }
    if (row.type === "same") {
      const sameCount = Number(out?.__sameCount || 0);
      if (sameCount >= SAME_ROW_LIMIT) {
        markDroppedDiffRow(out, row, "same");
        return false;
      }
      if (out) out.__sameCount = sameCount + 1;
      out.push(row);
      return true;
    }
    const diffCount = Number(out?.__diffCount || 0);
    if (diffCount >= ARRAY_DIFF_LIMIT) {
      markDroppedDiffRow(out, row, "diff");
      return false;
    }
    if (out) out.__diffCount = diffCount + 1;
    out.push(row);
    return true;
  }
  function getCollectedDiffCount(rows) {
    if (!Array.isArray(rows)) return 0;
    const count = Number(rows.__diffCount);
    if (Number.isFinite(count)) return count;
    return rows.filter((row) => row?.type !== "same" && !row?._displayOnly).length;
  }
  function shouldCollectSameRows(rows) {
    if (!Array.isArray(rows)) return false;
    return !!rows.__includeSame;
  }
  function pushSameDiffRow(out, row, ignoreRules) {
    if (!shouldCollectSameRows(out)) return false;
    return pushDiffRow(out, { ...row, type: "same" }, ignoreRules);
  }
  function normalizeForCompare(v, ignoreRules, path = "") {
    if (Array.isArray(v)) return v.map((x, index) => normalizeForCompare(x, ignoreRules, `${path}[${index}]`));
    if (v && typeof v === "object") {
      const o = {};
      Object.keys(v).sort().forEach((k) => {
        const childPath = path ? `${path}.${k}` : k;
        if (isIgnoredObjectProperty(ignoreRules, k, childPath)) return;
        o[k] = normalizeForCompare(v[k], ignoreRules, childPath);
      });
      return o;
    }
    return v;
  }
  function makeArrayItemSignature(v, ignoreRules, path = "") {
    return JSON.stringify(normalizeForCompare(v, ignoreRules, path));
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
      const itemPath = `${path}[${right.idx}]`;
      const leftSig = makeArrayItemSignature(left.item, ignoreRules, itemPath);
      const rightSig = makeArrayItemSignature(right.item, ignoreRules, itemPath);
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
        } else {
          pushSameDiffRow(out, {
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
      const itemPath = `${path}[${right.idx}]`;
      const leftSig = makeArrayItemSignature(left.item, ignoreRules, itemPath);
      const rightSig = makeArrayItemSignature(right.item, ignoreRules, itemPath);
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
        } else {
          pushSameDiffRow(out, {
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
    const sigA = a.map((x, index) => makeArrayItemSignature(x, ignoreRules, `${path}[${index}]`));
    const sigB = b.map((x, index) => makeArrayItemSignature(x, ignoreRules, `${path}[${index}]`));
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
        pushSameDiffRow(out, { path: `${path}[${j}]`, left: a[from], right: b[j], severity: "low" }, ignoreRules);
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
      const sig = makeArrayItemSignature(row.left, ignoreRules, row.path);
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
      const sig = makeArrayItemSignature(row.right, ignoreRules, row.path);
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
    const sigA = a.map((x, index) => makeArrayItemSignature(x, ignoreRules, `${path}[${index}]`));
    const sigB = b.map((x, index) => makeArrayItemSignature(x, ignoreRules, `${path}[${index}]`));
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
        pushSameDiffRow(out, {
          path: `${path}[${j}]`,
          left: a[i],
          right: b[j],
          severity: "low"
        }, ignoreRules);
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
      pushSameDiffRow(out, { path, left: a, right: b, severity: "low" }, ignoreRules);
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
      if (makeArrayItemSignature(a, ignoreRules, path) === makeArrayItemSignature(b, ignoreRules, path)) {
        pushSameDiffRow(out, { path, left: a, right: b, severity: "low" }, ignoreRules);
        return;
      }
      collectArrayDiffs(a, b, path, out, ignoreRules);
      return;
    }
    if (typeof a === "object") {
      if (makeArrayItemSignature(a, ignoreRules, path) === makeArrayItemSignature(b, ignoreRules, path)) {
        pushSameDiffRow(out, { path, left: a, right: b, severity: "low" }, ignoreRules);
        return;
      }
      const keys = [.../* @__PURE__ */ new Set([...Object.keys(a), ...Object.keys(b)])].sort();
      for (const k of keys) {
        const p = path ? `${path}.${k}` : k;
        if (isIgnoredObjectProperty(ignoreRules, k, p)) continue;
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
    const cleanupRootMetadata = (bundle) => {
      if (bundle && typeof bundle === "object" && "_partial" in bundle) delete bundle._partial;
    };
    cleanupRootMetadata(sClone);
    cleanupRootMetadata(tClone);
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
      if ("_bodyUnavailable" in item) delete item._bodyUnavailable;
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
    const srcStates = sourceProcess.states && typeof sourceProcess.states === "object" && !Array.isArray(sourceProcess.states) ? sourceProcess.states : {};
    const tgtStates = targetProcess.states && typeof targetProcess.states === "object" && !Array.isArray(targetProcess.states) ? targetProcess.states : {};
    const onlyInSrc = Object.keys(srcStates).filter((k) => !Object.prototype.hasOwnProperty.call(tgtStates, k));
    const onlyInTgt = Object.keys(tgtStates).filter((k) => !Object.prototype.hasOwnProperty.call(srcStates, k));
    if (!onlyInSrc.length || !onlyInTgt.length) return out;
    const groupByBodySignature = (names, states) => {
      const grouped = /* @__PURE__ */ new Map();
      names.forEach((name) => {
        const signature = stableStringify(stripStateBodyForRenameMatch(states[name]));
        const bucket = grouped.get(signature) || [];
        bucket.push(name);
        grouped.set(signature, bucket);
      });
      return grouped;
    };
    const sourceBySignature = groupByBodySignature(onlyInSrc, srcStates);
    const targetBySignature = groupByBodySignature(onlyInTgt, tgtStates);
    sourceBySignature.forEach((fromNames, signature) => {
      const toNames = targetBySignature.get(signature) || [];
      if (fromNames.length !== 1 || toNames.length !== 1) return;
      out.set(fromNames[0], toNames[0]);
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
  function pushProcessStateRenameNotices(rows, sectionKey, sectionLabel, stateRenames, ignoreRules) {
    if (!stateRenames || !stateRenames.size) return;
    stateRenames.forEach((to, from) => {
      pushDiffRow(rows, {
        sectionKey,
        section: sectionLabel,
        type: "changed",
        path: `${sectionKey}.states.__rename__`,
        left: { name: from },
        right: { name: to },
        severity: "low",
        _nonActionable: true,
        _stateRenameNotice: true,
        renameCandidate: {
          id: `state-rename:${from}:${to}`,
          fromCode: from,
          toCode: to,
          entityKind: "state",
          sectionKey,
          score: 99,
          matchedBy: "process-state-cascade-suppressed"
        },
        reasonSummary: `ステータス改名：${from} → ${to}（参照を自動補正）`
      }, ignoreRules);
    });
  }
  function computeDiffRows(sourceBundle, targetBundle, sections, ignoreKeysText, options = {}) {
    const ignoreRules = parseIgnoreRules(ignoreKeysText);
    const presetState = options.normalizationPresetState || {};
    const includeSame = !!options.includeSame;
    const rows = [];
    rows.__diffCount = 0;
    rows.__sameCount = 0;
    rows.__diffDropped = 0;
    rows.__sameDropped = 0;
    rows.__includeSame = includeSame;
    const fetchIssues = [];
    const limitHitSectionKeys = [];
    const unscannedSectionKeys = [];
    for (const sec of sections) {
      const label = (SECTION_DEFS.find((x) => x.key === sec) || {}).label || sec;
      const limitHitBefore = getCollectedDiffCount(rows) >= ARRAY_DIFF_LIMIT;
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
        const normalizedTarget = normalizeSectionForCompare(sec, t, presetState);
        if (normalizedTarget === t || hasComparableNormalizedContent(normalizedTarget)) {
          pushDiffRow(rows, { sectionKey: sec, section: label, type: "added", path: sec, left: void 0, right: normalizedTarget }, ignoreRules);
        }
        continue;
      }
      if (s && !t) {
        const normalizedSource = normalizeSectionForCompare(sec, s, presetState);
        if (normalizedSource === s || hasComparableNormalizedContent(normalizedSource)) {
          pushDiffRow(rows, { sectionKey: sec, section: label, type: "removed", path: sec, left: normalizedSource, right: void 0 }, ignoreRules);
        }
        continue;
      }
      if (!s && !t) continue;
      if (limitHitBefore) {
        unscannedSectionKeys.push(sec);
        continue;
      }
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
      if (makeArrayItemSignature(sourceForDiff, ignoreRules, sec) === makeArrayItemSignature(targetForDiff, ignoreRules, sec)) {
        pushSameDiffRow(rows, { sectionKey: sec, section: label, path: sec, left: sourceForDiff, right: targetForDiff, severity: "low" }, ignoreRules);
        if (sec === "processSettings") {
          pushProcessStateRenameNotices(rows, sec, label, stateRenames, ignoreRules);
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
      if (sec === "processSettings") {
        pushProcessStateRenameNotices(rows, sec, label, stateRenames, ignoreRules);
      }
      if (getCollectedDiffCount(rows) >= ARRAY_DIFF_LIMIT) {
        limitHitSectionKeys.push(sec);
      }
    }
    for (const row of rows) {
      if (!row.severity) row.severity = detectRowSeverity(row);
    }
    return {
      rows: rows.map((row, idx) => ({ ...row, _id: `d${idx}` })),
      fetchIssues,
      truncation: buildDiffTruncationInfo(rows, limitHitSectionKeys, unscannedSectionKeys)
    };
  }
  function buildDiffTruncationInfo(rows, limitHitSectionKeys = [], unscannedSectionKeys = []) {
    const droppedDiff = Number(rows?.__diffDropped || 0);
    const droppedSame = Number(rows?.__sameDropped || 0);
    const bySection = rows?.__droppedBySection || {};
    const unscanned = new Set(unscannedSectionKeys);
    const partial = new Set(limitHitSectionKeys);
    const sectionKeys = [.../* @__PURE__ */ new Set([...Object.keys(bySection), ...limitHitSectionKeys, ...unscannedSectionKeys])];
    const sections = sectionKeys.map((sectionKey) => {
      const scanned = !unscanned.has(sectionKey);
      const partiallyScanned = scanned && partial.has(sectionKey);
      const droppedSectionDiff = Number(bySection[sectionKey]?.diff || 0);
      return {
        sectionKey,
        section: (SECTION_DEFS.find((x) => x.key === sectionKey) || {}).label || sectionKey,
        // 既存フィールドは後方互換のため維持する。未走査時の 0 は「省略なし」を意味しない。
        droppedDiff: droppedSectionDiff,
        droppedSame: Number(bySection[sectionKey]?.same || 0),
        scanned,
        partiallyScanned,
        scanStatus: !scanned ? "unscanned" : partiallyScanned ? "partial" : "complete",
        // コレクタは上限到達時点で列挙を止めるため、部分走査セクションの総欠落数も不明。
        // droppedDiff は列挙済みの判明下限として後方互換のため残す。
        omittedDiffCount: scanned && !partiallyScanned ? droppedSectionDiff : null
      };
    });
    const actualDiffIncomplete = droppedDiff > 0 || limitHitSectionKeys.length > 0 || unscannedSectionKeys.length > 0;
    return {
      truncated: droppedDiff > 0 || droppedSame > 0 || limitHitSectionKeys.length > 0 || unscannedSectionKeys.length > 0,
      actualDiffIncomplete,
      diffLimit: ARRAY_DIFF_LIMIT,
      sameLimit: SAME_ROW_LIMIT,
      droppedDiff,
      droppedSame,
      sections
    };
  }
  function hasIncompleteActualDiffTruncation(truncation) {
    if (!truncation || typeof truncation !== "object") return false;
    if (Number(truncation.droppedDiff || 0) > 0) return true;
    const sections = Array.isArray(truncation.sections) ? truncation.sections : [];
    if (sections.some((section) => {
      const status = section?.scanStatus || (section?.scanned === false ? "unscanned" : section?.partiallyScanned ? "partial" : "");
      if (status === "partial" || status === "unscanned") return true;
      const omitted = section?.omittedDiffCount;
      return omitted == null ? Number(section?.droppedDiff || 0) > 0 : Number(omitted) > 0;
    })) return true;
    if (truncation.actualDiffIncomplete === true) return true;
    if (truncation.actualDiffIncomplete === false) return false;
    if (!truncation.truncated) return false;
    const hasExplicitDiffCount = Object.prototype.hasOwnProperty.call(truncation, "droppedDiff");
    const sameOnlyEvidence = hasExplicitDiffCount && Number(truncation.droppedDiff || 0) === 0 && Number(truncation.droppedSame || 0) > 0;
    if (sameOnlyEvidence) {
      const sectionsAreKnownComplete = !sections.length || sections.every((section) => {
        const status = section?.scanStatus || (section?.scanned === true && !section?.partiallyScanned ? "complete" : "");
        const omitted = section?.omittedDiffCount;
        return status === "complete" && (omitted == null || Number(omitted) === 0) && Number(section?.droppedDiff || 0) === 0;
      });
      if (sectionsAreKnownComplete) return false;
    }
    return true;
  }
  function summarizeRows(rows) {
    const s = { total: 0, added: 0, removed: 0, changed: 0, moved: 0, same: 0 };
    for (const r of rows) {
      if (!r || r._displayOnly) continue;
      s.total += 1;
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
    let ignoreAppReferencePaths = false;
    active.forEach((preset) => {
      preset.ignoreKeys?.forEach((key) => ignoreKeys.add(normalizeIgnoreToken(key)));
      if (preset.unorderedArrays) unorderedArrays = true;
      if (preset.ignoreAppReferencePaths) ignoreAppReferencePaths = true;
    });
    return { ignoreKeys, unorderedArrays, ignoreAppReferencePaths };
  }
  function isAppReferenceIdPath(path) {
    const normalizedPath = normalizeIgnoreToken(path);
    if (normalizedPath === "appinfo.appid") return true;
    if (normalizedPath.startsWith("fieldsettings.properties.")) {
      if (/\.(?:lookup|referencetable)\.(?:relatedapp|targetapp|sourceapp)\.(?:app|appid)$/.test(normalizedPath)) return true;
      if (/\.(?:lookup|referencetable)\.(?:relatedappid|targetappid|sourceappid)$/.test(normalizedPath)) return true;
    }
    if (/^actionsettings\.actions(?:\.|\[)/.test(normalizedPath)) {
      if (/\.(?:destapp|targetapp|sourceapp)\.(?:app|appid)$/.test(normalizedPath)) return true;
      if (/\.(?:destappid|targetappid|sourceappid)$/.test(normalizedPath)) return true;
    }
    return false;
  }
  function appendNormalizationPath(parentPath, key) {
    return parentPath ? `${parentPath}.${key}` : String(key);
  }
  function appendNormalizationArrayPath(parentPath, index) {
    return `${parentPath || ""}[${index}]`;
  }
  function hasComparableNormalizedContent(value) {
    if (Array.isArray(value)) return value.length > 0;
    if (value && typeof value === "object") return Object.keys(value).length > 0;
    return value !== void 0;
  }
  function normalizeArrayForSectionCompare(arr, config, path = "") {
    const list = arr.map((item, index) => normalizeSectionValueForCompare(
      item,
      config,
      appendNormalizationArrayPath(path, index)
    ));
    if (!config?.unorderedArrays) return list;
    return list.slice().sort((a, b) => {
      const sa = JSON.stringify(a);
      const sb = JSON.stringify(b);
      if (sa === sb) return 0;
      return sa < sb ? -1 : 1;
    });
  }
  function normalizeSectionValueForCompare(value, config, path = "") {
    if (Array.isArray(value)) return normalizeArrayForSectionCompare(value, config, path);
    if (value && typeof value === "object") {
      const out = {};
      Object.keys(value).sort().forEach((key) => {
        if (META_KEYS.has(key)) return;
        if (config?.ignoreKeys?.has(normalizeIgnoreToken(key))) return;
        const childPath = appendNormalizationPath(path, key);
        if (config?.ignoreAppReferencePaths && isAppReferenceIdPath(childPath)) return;
        out[key] = normalizeSectionValueForCompare(value[key], config, childPath);
      });
      return out;
    }
    return value;
  }
  function normalizeSectionForCompare(sectionKey, value, presetState) {
    const config = getActiveDiffNormalizationConfig(sectionKey, presetState);
    if (!config) return value;
    return normalizeSectionValueForCompare(value, config, sectionKey);
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
          else label = `行 #${idx + 1} (${t || "ROW"})`;
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
        label = options.fallbackLabel ? options.fallbackLabel(item, idx) : `${kindLabel} #${idx + 1}`;
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
  var HIGH_IMPACT_SECTIONS, MEDIUM_IMPACT_SECTIONS, ARRAY_DIFF_LIMIT, SAME_ROW_LIMIT, ARRAY_LCS_MAX_CELLS, ARRAY_KEY_CANDIDATES, LOW_PRIORITY_LEAF_KEYS, ACL_GRANT_FLAG_KEYS, FIELD_ACL_LEVEL_ORDER, EXACT_IGNORE_PATH_PREFIX, COMPOSITE_ARRAY_RULES, SUBTABLE_ROOT_PATH_RE, ENTITY_EXPAND_LIMIT;
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
      EXACT_IGNORE_PATH_PREFIX = "path:";
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
  function getImpactRefLogicalLocator(ref) {
    const path = String(ref?.path || "");
    return path.replace(/((?:^|\.)(?:fields|displayFields|columns))\[\d+\]$/, "$1[]");
  }
  function getImpactRefLogicalKey(ref) {
    return [ref?.sectionKey, ref?.kind, getImpactRefLogicalLocator(ref), ref?.label].join("|");
  }
  function addFieldImpactRef(index, code, ref) {
    const fieldCode = String(code || "").trim();
    if (!fieldCode) return;
    if (!index.has(fieldCode)) index.set(fieldCode, []);
    const bucket = index.get(fieldCode);
    const sig = getImpactRefLogicalKey(ref);
    if (bucket.some((item) => getImpactRefLogicalKey(item) === sig)) return;
    bucket.push(ref);
  }
  function collectExpressionFieldRefs(text2, codeSet) {
    const matches = /* @__PURE__ */ new Set();
    const re = /[A-Za-z_][A-Za-z0-9_]*/g;
    let match;
    while ((match = re.exec(String(text2 || ""))) !== null) {
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
    const text2 = value.trim();
    if (!text2) return;
    if (FIELD_REF_EXACT_KEYS.has(parentKey) && codeSet.has(text2)) {
      addFieldImpactRef(index, text2, {
        sectionKey,
        section: SECTION_DEFS.find((entry) => entry.key === sectionKey)?.label || sectionKey,
        kind: "フィールド参照",
        label: parentKey,
        path
      });
      return;
    }
    if (!FIELD_REF_TOKEN_KEYS.has(parentKey)) return;
    collectExpressionFieldRefs(text2, codeSet).forEach((fieldCode) => {
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
        const label = String(act.name || `遷移 #${idx + 1}`);
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
        const sig = getImpactRefLogicalKey(ref);
        if (seen.has(sig)) return;
        seen.add(sig);
        refs.push(ref);
      });
    });
    stateNames.forEach((name) => {
      (statusImpactIndex?.get(name) || []).forEach((ref) => {
        const sig = getImpactRefLogicalKey(ref);
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
          const label = name || `遷移 #${tokens[2] + 1}`;
          return { entityKind: "action", entityLabel: label, entityCode: name, propLabel };
        }
        return empty;
      }
      case "actionSettings": {
        if (tokens[1] === "actions" && typeof tokens[2] === "number") {
          const name = row?.arrayKey === "name" && row?.arrayKeyValue != null ? String(row.arrayKeyValue) : String(payload && typeof payload === "object" && payload.name || "");
          const label = name || `アクション #${tokens[2] + 1}`;
          return { entityKind: "appAction", entityLabel: label, entityCode: name, propLabel };
        }
        return empty;
      }
      case "appAcl":
      case "recordPermissions": {
        if (tokens[1] === "rights" && typeof tokens[2] === "number") {
          let entityRef = row?.arrayKey === "entity" && row?.arrayKeyValue && typeof row.arrayKeyValue === "object" ? row.arrayKeyValue : null;
          if (!entityRef) entityRef = payload && typeof payload === "object" ? payload.entity : null;
          const label = describeAclEntity(entityRef) || `エントリー #${tokens[2] + 1}`;
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
          const label = fc || `エントリー #${tokens[2] + 1}`;
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
          if (!label) label = `通知 #${tokens[2] + 1}`;
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
          const label = name ? id ? `${name} (${id})` : name : id || `プラグイン #${tokens[2] + 1}`;
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
          let label = `行 #${tokens[2] + 1}`;
          if (t === "GROUP" && obj.code) label = `グループ「${obj.code}」`;
          else if (t === "SUBTABLE" && obj.code) label = `テーブル「${obj.code}」`;
          else if (t === "ROW") label = `行 #${tokens[2] + 1}`;
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
          height: "高さ",
          innerHeight: "入力欄の高さ"
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
  function labelOfProp(key) {
    if (!key) return "";
    return PROP_LABELS[key]?.label || String(key);
  }
  function iconOfProp(key) {
    if (!key) return "";
    return PROP_LABELS[key]?.icon || "";
  }
  function labelOfValue(scope, value) {
    if (value == null) return null;
    const dict = VALUE_LABELS[scope];
    if (!dict) return null;
    return dict[String(value)] || null;
  }
  function labelOfSection(sectionKey) {
    if (!sectionKey) return { label: "-", icon: "" };
    return SECTION_LABELS[sectionKey] || { label: String(sectionKey), icon: "" };
  }
  function labelOfBool(value, propKey) {
    if (propKey && PERMISSION_KEYS.has(propKey)) {
      return value ? "許可" : "不許可";
    }
    if (propKey === "enable" || propKey === "enabled") {
      return value ? "有効" : "無効";
    }
    return value ? "はい" : "いいえ";
  }
  function formatEntityText(entity, options = {}) {
    if (!entity || typeof entity !== "object") return "";
    const type = String(entity.type || "");
    const code = String(entity.code || entity.login || entity.id || "");
    const name = String(entity.name || "");
    const typed = VALUE_LABELS["entity.type"]?.[type] || (type ? `· ${type}` : "·");
    const display = name || code || "(未設定)";
    if (options.compact) return `${typed} ${display}`;
    if (name && code && name !== code) return `${typed} ${name} (${code})`;
    return `${typed} ${display}`;
  }
  var VALUE_LABELS, PROP_LABELS, SECTION_LABELS, PERMISSION_KEYS;
  var init_label_dict = __esm({
    "src/diff/label-dict.ts"() {
      "use strict";
      VALUE_LABELS = {
        // entity.type
        "entity.type": {
          USER: "👤 ユーザー",
          GROUP: "👥 グループ",
          ORGANIZATION: "🏢 部署",
          DEPARTMENT: "🏢 部署",
          DEPT: "🏢 部署",
          CREATOR: "✏️ 作成者",
          FIELD_ENTITY: "🔗 フィールド",
          EVERYONE: "🌐 全員",
          CUSTOM_FIELD: "🔗 ユーザー選択フィールド"
        },
        // field acl level
        accessibility: {
          NONE: "不可",
          READ: "閲覧のみ",
          READ_WRITE: "閲覧+編集"
        },
        // ビュー種別
        "view.type": {
          LIST: "一覧",
          CALENDAR: "カレンダー",
          CUSTOM: "カスタマイズ"
        },
        // グラフ種別
        "chart.type": {
          BAR: "棒グラフ",
          COLUMN: "縦棒グラフ",
          PIE: "円グラフ",
          LINE: "折れ線",
          PIVOT_TABLE: "クロス集計表",
          TABLE: "集計表",
          AREA: "エリアグラフ",
          AREA_STACKED: "積み上げエリア",
          SPLINE: "スプライン",
          SPLINE_AREA: "スプラインエリア",
          BUBBLE: "バブル",
          BAR_STACKED: "積み上げ棒",
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
        }
      };
      PROP_LABELS = {
        // appAcl 操作権限
        appEditable: { label: "アプリ管理", icon: "⚙" },
        recordViewable: { label: "閲覧", icon: "👁" },
        recordAddable: { label: "追加", icon: "➕" },
        recordEditable: { label: "編集", icon: "✏️" },
        recordDeletable: { label: "削除", icon: "🗑" },
        recordImportable: { label: "CSV読込", icon: "📥" },
        recordExportable: { label: "CSV書出", icon: "📤" },
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
        // viewSettings
        fields: { label: "表示項目", icon: "📋" },
        sort: { label: "ソート", icon: "↕" },
        index: { label: "表示順", icon: "🔢" },
        paginationStyle: { label: "ページ送り", icon: "📄" },
        defaultView: { label: "既定ビュー" },
        view: { label: "ビュー" },
        views: { label: "ビュー一覧" },
        // reportSettings
        groups: { label: "分類", icon: "📊" },
        aggregations: { label: "集計", icon: "🧮" },
        chartType: { label: "グラフ種別" },
        chartMode: { label: "モード" },
        reports: { label: "グラフ一覧" },
        periodicReports: { label: "定期レポート" },
        // notifications
        recordAdded: { label: "レコード追加時" },
        recordEdited: { label: "レコード編集時" },
        commentAdded: { label: "コメント追加時" },
        statusChanged: { label: "ステータス変更時" },
        fileImported: { label: "ファイル取込時" },
        recipients: { label: "宛先" },
        targets: { label: "宛先" },
        notifications: { label: "通知ルール" },
        timing: { label: "タイミング" },
        notifyOnUpdate: { label: "更新時に通知" },
        timezone: { label: "タイムゾーン" },
        perRecordNotifications: { label: "レコード条件通知" },
        reminderNotifications: { label: "リマインダー通知" },
        title: { label: "タイトル" },
        body: { label: "本文" },
        // processSettings
        enable: { label: "プロセス有効化" },
        states: { label: "ステータス" },
        actions: { label: "アクション" },
        from: { label: "遷移元" },
        to: { label: "遷移先" },
        assignee: { label: "作業者" },
        type: { label: "種別" },
        settings: { label: "設定" },
        // actionSettings
        app: { label: "対象アプリ" },
        mappings: { label: "フィールド対応" },
        sourceField: { label: "元フィールド" },
        destField: { label: "先フィールド" },
        destApp: { label: "先アプリ" },
        // customizeSettings
        desktop: { label: "デスクトップ" },
        mobile: { label: "モバイル" },
        js: { label: "JS" },
        css: { label: "CSS" },
        file: { label: "ファイル" },
        scope: { label: "配置" },
        url: { label: "URL" },
        // pluginSettings
        plugins: { label: "プラグイン一覧" },
        version: { label: "バージョン" },
        id: { label: "ID" },
        // appSettings / appInfo
        name: { label: "名前" },
        description: { label: "説明" },
        theme: { label: "テーマ" },
        titleField: { label: "タイトルフィールド" },
        icon: { label: "アイコン" },
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
        referenceTable: { label: "関連レコード一覧設定" },
        lookup: { label: "ルックアップ設定" },
        condition: { label: "表示条件（フィールドの一致）" },
        displayFields: { label: "表示するフィールド" },
        relatedApp: { label: "参照するアプリ" },
        relatedField: { label: "参照するアプリのフィールド" },
        relatedKeyField: { label: "コピー元のフィールド" },
        fieldMappings: { label: "ほかのフィールドのコピー" },
        lookupPickerFields: { label: "選択画面に表示するフィールド" },
        size: { label: "一度に表示する最大件数" }
      };
      SECTION_LABELS = {
        appAcl: { label: "アプリ権限", icon: "🔐" },
        fieldAcl: { label: "フィールド権限", icon: "🔐" },
        recordPermissions: { label: "レコード権限", icon: "🔐" },
        notifications: { label: "通知", icon: "🔔" },
        perRecordNotifications: { label: "レコード条件通知", icon: "🔔" },
        reminderNotifications: { label: "リマインダー通知", icon: "🔔" },
        viewSettings: { label: "ビュー設定", icon: "📊" },
        reportSettings: { label: "グラフ設定", icon: "📈" },
        processSettings: { label: "プロセス管理", icon: "🔁" },
        actionSettings: { label: "アクション設定", icon: "⚡" },
        customizeSettings: { label: "JS/CSS設定", icon: "🧪" },
        pluginSettings: { label: "プラグイン", icon: "🧩" },
        appSettings: { label: "アプリ設定", icon: "⚙" },
        appInfo: { label: "アプリ情報", icon: "ℹ️" },
        formSettings: { label: "フォーム設定", icon: "📝" },
        fieldSettings: { label: "フィールド設定", icon: "🔤" },
        layoutSettings: { label: "レイアウト設定", icon: "🧩" },
        categories: { label: "カテゴリ設定", icon: "🗂" }
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

  // src/diff/path-decoder.ts
  function isSemanticSection(sectionKey) {
    return !!sectionKey && SEMANTIC_SECTIONS.has(sectionKey);
  }
  function tokenize(path) {
    if (!path) return [];
    const out = [];
    const re = /([^[.\]]+)|\[(\d+)\]/g;
    let m;
    while ((m = re.exec(String(path))) !== null) {
      if (m[1] != null) out.push(m[1]);
      else out.push(Number(m[2]));
    }
    return out;
  }
  function isIndex(token) {
    return typeof token === "number";
  }
  function valueToText(value, propKey, depth = 0) {
    if (value === void 0) return "（未設定）";
    if (value === null) return "-";
    if (typeof value === "boolean") return labelOfBool(value, propKey);
    if (typeof value === "number") return String(value);
    if (typeof value === "string") {
      if (propKey === "accessibility") {
        return labelOfValue("accessibility", value) || value;
      }
      if (propKey === "type") {
        return labelOfValue("view.type", value) || labelOfValue("chart.type", value) || value;
      }
      if (propKey === "chartType") {
        return labelOfValue("chart.type", value) || value;
      }
      if (propKey === "paginationStyle") {
        return labelOfValue("paginationStyle", value) || value;
      }
      return value;
    }
    if (Array.isArray(value)) {
      if (!value.length) return "（空）";
      if (value[0] && typeof value[0] === "object" && (value[0].entity || value[0].type)) {
        const compact = value.length > 4;
        const items = value.slice(0, 8).map((v) => {
          const ent = v.entity || (v.type ? v : null);
          if (ent) return formatEntityText(ent, { compact });
          return safeStringify(v);
        });
        const more = value.length > items.length ? `, …+${value.length - items.length}` : "";
        return items.join(", ") + more;
      }
      if (value.every((v) => v == null || typeof v !== "object")) {
        return value.map((v) => v == null ? "-" : String(v)).join(", ");
      }
      if (depth >= 1) return `(${value.length} 件)`;
      return value.slice(0, 6).map((v) => valueToText(v, propKey, depth + 1)).join("\n");
    }
    if (typeof value === "object") {
      if (value.entity && typeof value.entity === "object") {
        const base = formatEntityText(value.entity);
        const extras = [];
        if (value.accessibility) {
          const lv = labelOfValue("accessibility", value.accessibility) || value.accessibility;
          extras.push(lv);
        }
        if (typeof value.includeSubs === "boolean") extras.push(value.includeSubs ? "配下含む" : "配下なし");
        return extras.length ? `${base} / ${extras.join(" / ")}` : base;
      }
      if (value.type && typeof value.code !== "undefined" && Object.keys(value).length <= 4) {
        return formatEntityText(value);
      }
      return summarizeObject(value, depth);
    }
    return String(value);
  }
  function summarizeObject(obj, depth) {
    const lines = [];
    let n = 0;
    for (const key of SUMMARY_KEYS_PRIORITY) {
      if (n >= 6) break;
      if (!Object.prototype.hasOwnProperty.call(obj, key)) continue;
      const v = obj[key];
      if (v === null || v === void 0) continue;
      if (typeof v === "object" && depth >= 1) continue;
      lines.push(`${labelOfProp(key)}: ${valueToText(v, key, depth + 1)}`);
      n++;
    }
    const remaining = Object.keys(obj).filter((k) => !SUMMARY_KEYS_PRIORITY.includes(k));
    for (const key of remaining) {
      if (n >= 6) break;
      const v = obj[key];
      if (v === null || v === void 0) continue;
      if (Array.isArray(v)) {
        lines.push(`${labelOfProp(key)}: ${valueToText(v, key, depth + 1)}`);
        n++;
      } else if (typeof v !== "object") {
        lines.push(`${labelOfProp(key)}: ${valueToText(v, key, depth + 1)}`);
        n++;
      }
    }
    if (!lines.length) return safeStringify(obj);
    return lines.join("\n");
  }
  function safeStringify(v) {
    try {
      return JSON.stringify(v);
    } catch {
      return String(v);
    }
  }
  function parsePath(sectionKey, path) {
    const tokens = tokenize(path);
    if (!tokens.length) return {};
    const ctx = {};
    if (sectionKey === "customizeSettings" && tokens.length >= 2) {
      if (typeof tokens[1] === "string") ctx.platform = tokens[1];
      if (typeof tokens[2] === "string") ctx.kind = tokens[2];
    }
    const namedMaps = {
      viewSettings: "views",
      reportSettings: "reports",
      processSettings: "states",
      // processSettings.states.<name> も対象だが actions は配列
      categories: "categories"
    };
    const mapBucket = namedMaps[sectionKey];
    if (mapBucket) {
      for (let i = 1; i < tokens.length; i++) {
        if (tokens[i] === mapBucket && typeof tokens[i + 1] === "string") {
          ctx.namedScope = mapBucket;
          ctx.namedKey = tokens[i + 1];
          break;
        }
      }
    }
    for (let i = 1; i < tokens.length; i++) {
      if (typeof tokens[i] === "string" && isIndex(tokens[i + 1])) {
        ctx.arrayBucketKey = tokens[i];
        ctx.arrayIndex = tokens[i + 1];
        break;
      }
    }
    for (let i = tokens.length - 1; i >= 1; i--) {
      if (typeof tokens[i] === "string") {
        ctx.leafKey = tokens[i];
        break;
      }
    }
    return ctx;
  }
  function extractEntityFromPayload(payload) {
    if (!payload || typeof payload !== "object") return null;
    if (payload.entity && typeof payload.entity === "object") return payload.entity;
    if (payload.type && (payload.code !== void 0 || payload.login !== void 0 || payload.id !== void 0)) {
      const entityTypes = Object.keys(VALUE_LABELS["entity.type"] || {});
      if (entityTypes.includes(String(payload.type))) return payload;
    }
    return null;
  }
  function buildWhereChips(row, ctx) {
    const chips = [];
    if (row.entityLabel) {
      const ek = String(row.entityKind || "");
      const iconMap = {
        aclEntry: "👥",
        recordAclEntry: "👥",
        fieldAclEntry: "🔤",
        notification: "🔔",
        perRecordNotification: "🔔",
        reminderNotification: "⏰",
        view: "📊",
        report: "📈",
        state: "🚦",
        action: "🔁",
        appAction: "⚡",
        plugin: "🧩",
        jsCss: "🧪",
        category: "🗂",
        layoutRow: "🧱"
      };
      chips.push({ icon: iconMap[ek] || "·", label: String(row.entityLabel) });
      if (row.entityCode && row.entityCode !== row.entityLabel) {
        chips.push({ label: String(row.entityCode), muted: true });
      }
      return chips;
    }
    const payload = row.right ?? row.left;
    const entity = extractEntityFromPayload(payload);
    if (entity) {
      chips.push({ label: formatEntityText(entity) });
    }
    if (ctx.namedKey) {
      const scopeIcon = ctx.namedScope === "views" ? "📊" : ctx.namedScope === "reports" ? "📈" : ctx.namedScope === "states" ? "🚦" : ctx.namedScope === "categories" ? "🗂" : "·";
      chips.push({ icon: scopeIcon, label: ctx.namedKey });
    }
    if (ctx.platform || ctx.kind) {
      const platLabel = ctx.platform === "desktop" ? "デスクトップ" : ctx.platform === "mobile" ? "モバイル" : ctx.platform || "";
      const kindLabel = ctx.kind ? String(ctx.kind).toUpperCase() : "";
      const txt = [platLabel, kindLabel].filter(Boolean).join(" / ");
      if (txt) chips.push({ icon: "📁", label: txt });
    }
    if (!chips.length && ctx.arrayBucketKey && typeof ctx.arrayIndex === "number") {
      chips.push({ label: `${labelOfProp(ctx.arrayBucketKey)} #${ctx.arrayIndex + 1}`, muted: true });
    }
    return chips;
  }
  function decodeRow(row) {
    if (!row || !row.sectionKey || !isSemanticSection(row.sectionKey)) return null;
    const sect = labelOfSection(row.sectionKey);
    const ctx = parsePath(row.sectionKey, String(row.path || ""));
    const whereChips = buildWhereChips(row, ctx);
    const leaf = ctx.leafKey && ctx.leafKey !== row.sectionKey && ctx.leafKey !== ctx.arrayBucketKey ? ctx.leafKey : "";
    const propLabel = leaf ? labelOfProp(leaf) : "";
    const propIcon = leaf ? iconOfProp(leaf) : "";
    const propKey = leaf || ctx.arrayBucketKey || "";
    const beforeText = row.type === "added" ? "（なし）" : valueToText(row.left, propKey);
    const afterText = row.type === "removed" ? "（なし）" : valueToText(row.right, propKey);
    const oneLineSummary = buildOneLineSummary(row, propLabel, beforeText, afterText);
    const searchableTokens = [
      sect.label,
      sect.icon,
      ...whereChips.map((c) => c.label),
      propLabel,
      propIcon,
      beforeText,
      afterText,
      oneLineSummary
    ].filter(Boolean);
    return {
      sectionLabel: sect.label,
      sectionIcon: sect.icon || "",
      whereChips,
      propLabel,
      propIcon,
      beforeText,
      afterText,
      oneLineSummary,
      searchableTokens
    };
  }
  function buildOneLineSummary(row, propLabel, beforeText, afterText) {
    const shortLeft = beforeText.length > 30 ? beforeText.slice(0, 30) + "…" : beforeText;
    const shortRight = afterText.length > 30 ? afterText.slice(0, 30) + "…" : afterText;
    if (row.type === "added") return propLabel ? `${propLabel}: 追加（${shortRight}）` : `追加（${shortRight}）`;
    if (row.type === "removed") return propLabel ? `${propLabel}: 削除（${shortLeft}）` : `削除（${shortLeft}）`;
    if (row.type === "same") return propLabel ? `${propLabel}: 同一` : "同一";
    return propLabel ? `${propLabel}: ${shortLeft} → ${shortRight}` : `${shortLeft} → ${shortRight}`;
  }
  var SEMANTIC_SECTIONS, SUMMARY_KEYS_PRIORITY;
  var init_path_decoder = __esm({
    "src/diff/path-decoder.ts"() {
      "use strict";
      init_label_dict();
      SEMANTIC_SECTIONS = /* @__PURE__ */ new Set([
        "appAcl",
        "fieldAcl",
        "recordPermissions",
        "notifications",
        "perRecordNotifications",
        "reminderNotifications",
        "viewSettings",
        "reportSettings",
        "actionSettings",
        "processSettings",
        "customizeSettings",
        "pluginSettings",
        "appSettings",
        "appInfo",
        "formSettings",
        "categories"
      ]);
      SUMMARY_KEYS_PRIORITY = [
        "name",
        "label",
        "title",
        "code",
        "id",
        "type",
        "chartType",
        "from",
        "to",
        "enable",
        "filterCond",
        "accessibility",
        "timing",
        "version",
        "paginationStyle",
        "url"
      ];
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
  function sectionKeyOf(row) {
    const explicit = String(row?.sectionKey || "").trim();
    if (explicit) return explicit;
    return String(row?.path || "").split(/[.\[]/, 1)[0] || "";
  }
  function isSensitiveSameDiffRow(row) {
    return row?.type === "same" && SENSITIVE_DIFF_SECTION_KEYS.has(sectionKeyOf(row));
  }
  var SENSITIVE_DIFF_SECTION_KEYS, SENSITIVE_SAME_VALUE_REDACTION;
  var init_export_safety = __esm({
    "src/diff/export-safety.ts"() {
      "use strict";
      SENSITIVE_DIFF_SECTION_KEYS = /* @__PURE__ */ new Set([
        "customizeSettings",
        "pluginSettings"
      ]);
      SENSITIVE_SAME_VALUE_REDACTION = "（同一の機密値は安全のため省略しました）";
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
  function stripLabelHtmlTags(text2) {
    return stripHtmlToText(text2);
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
  function stripCustomizeItemScratch(value) {
    if (Array.isArray(value)) {
      value.forEach((item) => stripCustomizeItemScratch(item));
      return;
    }
    if (!value || typeof value !== "object") return;
    for (const key of REPORT_CUSTOMIZE_ITEM_SCRATCH_KEYS) delete value[key];
    Object.values(value).forEach((child) => stripCustomizeItemScratch(child));
  }
  function stripPluginItemScratch(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return;
    if (Array.isArray(value.plugins)) {
      value.plugins.forEach((plugin) => {
        if (plugin && typeof plugin === "object" && !Array.isArray(plugin)) delete plugin._config;
      });
      return;
    }
    if (Object.prototype.hasOwnProperty.call(value, "id")) delete value._config;
  }
  function sanitizeReportSectionValue(sectionKey, value) {
    const cloned = deepClone(value);
    if (cloned == null || typeof cloned !== "object") return cloned;
    if (!Array.isArray(cloned)) {
      for (const key of REPORT_SECTION_ROOT_SCRATCH_KEYS) delete cloned[key];
    }
    if (sectionKey === "customizeSettings") stripCustomizeItemScratch(cloned);
    if (sectionKey === "pluginSettings") stripPluginItemScratch(cloned);
    return cloned;
  }
  function sanitizeReportRowValue(row, value) {
    if (isSensitiveSameDiffRow(row)) return SENSITIVE_SAME_VALUE_REDACTION;
    return sanitizeReportSectionValue(String(row?.sectionKey || ""), value);
  }
  function diffTruncationScanStatusOf(section) {
    if (section?.scanStatus === "complete" || section?.scanStatus === "partial" || section?.scanStatus === "unscanned") {
      return section.scanStatus;
    }
    if (section?.scanned === false) return "unscanned";
    if (section?.partiallyScanned === true || section?.omittedDiffCount === null) return "partial";
    return "complete";
  }
  function diffTruncationSectionLabel(section) {
    return String(section?.section || section?.sectionKey || "未分類");
  }
  function knownOmittedDiffCount(section) {
    const raw = section?.omittedDiffCount ?? section?.droppedDiff ?? 0;
    const count = Number(raw);
    return Number.isFinite(count) && count >= 0 ? count : 0;
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
    return mode === "withCompared" ? "比較設定込み（取扱注意）" : "差分行のみ（全設定は未収録）";
  }
  function shouldIncludeComparedContent(mode) {
    return mode === "withCompared";
  }
  function buildCharDiffHtml(leftText, rightText) {
    const segmentGraphemes = (text2) => {
      const normalized = String(text2 ?? "");
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
  function getBundleExportMeta(bundle) {
    return {
      appId: String(bundle?.appId || ""),
      appName: extractAppNameFromBundle(bundle),
      guestId: String(bundle?.guestId || ""),
      preview: !!bundle?.preview,
      revision: resolveBundleRevision(bundle) || "",
      fetchedAt: bundle?.fetchedAt || "",
      sectionCount: Object.keys(bundle?.sections || {}).length
    };
  }
  function selectDiffHtmlRowsForExport(displayRows, maxRows = DIFF_HTML_MAX_EXPORT_ROWS) {
    const sourceRows = Array.isArray(displayRows) ? displayRows : [];
    const limit = Number.isFinite(maxRows) ? Math.max(0, Math.floor(maxRows)) : DIFF_HTML_MAX_EXPORT_ROWS;
    const priority = ["actualDiff", "displayOnly", "same"];
    const buckets = {
      actualDiff: [],
      displayOnly: [],
      same: []
    };
    sourceRows.forEach((row, index) => {
      const category = row?._displayOnly ? "displayOnly" : row?.type === "same" ? "same" : "actualDiff";
      buckets[category].push({ row, index });
    });
    const selected = [];
    const renderedCounts = {
      actualDiff: 0,
      displayOnly: 0,
      same: 0
    };
    priority.forEach((category) => {
      const remaining = limit - selected.length;
      if (remaining <= 0) return;
      const picked = buckets[category].slice(0, remaining);
      selected.push(...picked);
      renderedCounts[category] = picked.length;
    });
    selected.sort((a, b) => a.index - b.index);
    const categorySummary = (category) => ({
      total: buckets[category].length,
      rendered: renderedCounts[category],
      omitted: buckets[category].length - renderedCounts[category]
    });
    const renderedRows = selected.length;
    const omittedRows = sourceRows.length - renderedRows;
    return {
      rows: selected.map((entry) => entry.row),
      summary: {
        policy: "actualDiff > displayOnly > same",
        limit,
        expandedRows: sourceRows.length,
        renderedRows,
        omittedRows,
        truncated: omittedRows > 0,
        categories: {
          actualDiff: categorySummary("actualDiff"),
          displayOnly: categorySummary("displayOnly"),
          same: categorySummary("same")
        }
      }
    };
  }
  function hashDiffHtmlReviewText(text2) {
    let first = 2166136261;
    let second = 2654435769;
    for (let index = 0; index < text2.length; index += 1) {
      const code = text2.charCodeAt(index);
      first = Math.imul((first ^ code) >>> 0, 16777619) >>> 0;
      second = Math.imul((second ^ code ^ index) >>> 0, 2246822507) >>> 0;
      second ^= second >>> 13;
    }
    return first.toString(16).padStart(8, "0") + (second >>> 0).toString(16).padStart(8, "0");
  }
  function diffHtmlReviewRowMaterial(row) {
    const leftDefined = row?.left !== void 0;
    const rightDefined = row?.right !== void 0;
    const arrayKeyValueDefined = row?.arrayKeyValue !== void 0;
    return {
      version: DIFF_HTML_REVIEW_STATE_VERSION,
      sectionKey: String(row?.sectionKey || ""),
      path: String(row?.path || ""),
      type: String(row?.type || ""),
      moved: !!row?.moved,
      arrayKey: String(row?.arrayKey || ""),
      arrayKeyValueDefined,
      arrayKeyValue: arrayKeyValueDefined ? row.arrayKeyValue : null,
      leftDefined,
      left: leftDefined ? row.left : null,
      rightDefined,
      right: rightDefined ? row.right : null
    };
  }
  function prepareDiffHtmlReviewRows(rows) {
    const occurrenceByHash = /* @__PURE__ */ new Map();
    const reviewKeys = [];
    const keyedRows = (rows || []).map((row) => {
      if (!row || row.type === "same" || row._displayOnly) return row;
      const hash = hashDiffHtmlReviewText(stableStringify(diffHtmlReviewRowMaterial(row)));
      const occurrence = (occurrenceByHash.get(hash) || 0) + 1;
      occurrenceByHash.set(hash, occurrence);
      const reviewKey = `review-v${DIFF_HTML_REVIEW_STATE_VERSION}-${hash}-${occurrence}`;
      reviewKeys.push(reviewKey);
      return { ...row, _reviewKey: reviewKey };
    });
    return { rows: keyedRows, reviewKeys };
  }
  function stripDiffHtmlSubjectiveRowMetadata(row) {
    if (!row || typeof row !== "object" || Array.isArray(row)) return row;
    const { severity: _severity, impactSummary: _impactSummary, __childRows, ...rest } = row;
    if (!Array.isArray(__childRows)) return rest;
    return {
      ...rest,
      __childRows: __childRows.map(stripDiffHtmlSubjectiveRowMetadata)
    };
  }
  function buildDiffHtmlReviewFingerprint(context, reviewKeys) {
    const material = stableStringify({
      version: DIFF_HTML_REVIEW_STATE_VERSION,
      source: context.source,
      target: context.target,
      scopes: context.scopes,
      exportMode: context.exportMode,
      exportContentMode: context.exportContentMode,
      incompleteComparison: !!context.incompleteComparison,
      truncated: !!context.truncated,
      rowSelection: context.rowSelection,
      reviewKeys: [...reviewKeys].sort()
    });
    return `report-v${DIFF_HTML_REVIEW_STATE_VERSION}-${hashDiffHtmlReviewText(material)}`;
  }
  function buildDiffHtml(sourceBundle, targetBundle, rows, scopes, ignoreKeys, options = {}) {
    const exportContentMode = options.exportContentMode === "diffOnly" ? "diffOnly" : "withCompared";
    const includesComparedContent = shouldIncludeComparedContent(exportContentMode);
    const withSameSections = (() => {
      const baseRows = Array.isArray(rows) ? rows.filter((row) => includesComparedContent || row?.type !== "same").map((row) => row && typeof row === "object" ? {
        ...row,
        left: sanitizeReportRowValue(row, row.left),
        right: sanitizeReportRowValue(row, row.right),
        ...isSensitiveSameDiffRow(row) ? { sensitiveValueRedacted: true } : {}
      } : row) : [];
      const scopeList = includesComparedContent && Array.isArray(scopes) ? scopes.filter(Boolean) : [];
      if (!scopeList.length || !sourceBundle?.sections || !targetBundle?.sections) return baseRows;
      const issueSectionSet = new Set((Array.isArray(options.fetchIssues) ? options.fetchIssues : []).map((issue) => issue?.sectionKey).filter(Boolean));
      const hasEngineCompletionInfo = Object.prototype.hasOwnProperty.call(options, "truncation");
      const isCompleteExportRange = String(options.exportMode || "all") === "all";
      const truncatedSectionSet = new Set((Array.isArray(options.truncation?.sections) ? options.truncation.sections : []).map((item) => item?.sectionKey).filter(Boolean));
      const rowSectionSet = new Set(baseRows.map((row) => row?.sectionKey).filter(Boolean));
      const presetState = options.normalizationState || {};
      for (const sec of scopeList) {
        if (rowSectionSet.has(sec) || issueSectionSet.has(sec) || truncatedSectionSet.has(sec)) continue;
        if (hasEngineCompletionInfo && !isCompleteExportRange) continue;
        const sourceSec = sourceBundle.sections?.[sec];
        const targetSec = targetBundle.sections?.[sec];
        if (!sourceSec || !targetSec) continue;
        const normalizedSource = normalizeSectionForCompare(sec, sourceSec, presetState);
        const normalizedTarget = normalizeSectionForCompare(sec, targetSec, presetState);
        if (!hasEngineCompletionInfo && stableStringify(normalizedSource) !== stableStringify(normalizedTarget)) continue;
        const sectionLabel = (SECTION_DEFS.find((def) => def.key === sec) || {}).label || sec;
        const sameRow = {
          _id: `same:${sec}`,
          sectionKey: sec,
          section: sectionLabel,
          type: "same",
          path: sec,
          severity: "low"
        };
        baseRows.push({
          ...sameRow,
          left: sanitizeReportRowValue(sameRow, normalizedSource),
          right: sanitizeReportRowValue(sameRow, normalizedTarget),
          ...isSensitiveSameDiffRow(sameRow) ? { sensitiveValueRedacted: true } : {}
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
    const displayRows = expandSubtableRowsForDisplay(expandEntityRowsForDisplay(withSameSections));
    const exportSelection = selectDiffHtmlRowsForExport(displayRows);
    const exportRows = exportSelection.rows;
    const baseReportRows = exportRows.map((row) => {
      const decoded = decodeRow(row);
      if (!decoded) return row;
      const contextLabels = (decoded.whereChips || []).filter((chip) => !chip.muted).map((chip) => String(chip.label || "").trim()).filter(Boolean);
      const title = [...contextLabels, String(decoded.propLabel || "").trim()].filter(Boolean).join(" / ");
      return title ? { ...row, _reportDisplayTitle: title } : row;
    });
    const preparedReviewRows = prepareDiffHtmlReviewRows(baseReportRows);
    const reportRows = includesComparedContent ? preparedReviewRows.rows : preparedReviewRows.rows.map(stripDiffHtmlSubjectiveRowMetadata);
    const sensitiveDiffSections = [...new Set(exportRows.filter((row) => !row?._displayOnly && row?.type !== "same" && ["customizeSettings", "pluginSettings"].includes(String(row?.sectionKey || ""))).map((row) => String(row.sectionKey)))];
    const redactedSensitiveSections = [...new Set(exportRows.filter((row) => isSensitiveSameDiffRow(row)).map((row) => String(row.sectionKey || "")).filter(Boolean))];
    const fetchIssues = Array.isArray(options.fetchIssues) ? options.fetchIssues : [];
    const partialIssues = Array.isArray(options.partialIssues) ? options.partialIssues : [];
    const warning = options.warning || { threshold: 0, exceeded: false, total: withSameSections.length + fetchIssues.length };
    const KUC_REPORT_VERSION = "1.24.0";
    const engineTruncation = options.truncation || null;
    const actualDiffTruncation = hasIncompleteActualDiffTruncation(engineTruncation) ? engineTruncation : null;
    const engineTruncationSections = Array.isArray(actualDiffTruncation?.sections) ? actualDiffTruncation.sections : [];
    const partialTruncationSections = engineTruncationSections.filter((section) => diffTruncationScanStatusOf(section) === "partial");
    const unscannedTruncationSections = engineTruncationSections.filter((section) => diffTruncationScanStatusOf(section) === "unscanned");
    const completeKnownTruncationSections = engineTruncationSections.filter((section) => diffTruncationScanStatusOf(section) === "complete" && knownOmittedDiffCount(section) > 0);
    const partialTruncationLabels = partialTruncationSections.map(diffTruncationSectionLabel);
    const unscannedTruncationLabels = unscannedTruncationSections.map(diffTruncationSectionLabel);
    const completeKnownTruncationLabels = completeKnownTruncationSections.map((section) => `${diffTruncationSectionLabel(section)}（${knownOmittedDiffCount(section)}件）`);
    const truncationRangeSummary = [
      partialTruncationLabels.length ? `部分走査・総件数不明（表示件数は下限）: ${partialTruncationLabels.join("、")}。` : "",
      unscannedTruncationLabels.length ? `未走査・件数不明: ${unscannedTruncationLabels.join("、")}。` : "",
      completeKnownTruncationLabels.length ? `走査完了・未収録件数既知: ${completeKnownTruncationLabels.join("、")}。` : ""
    ].filter(Boolean).join(" ");
    const diffNavRangeNote = !actualDiffTruncation ? "" : partialTruncationLabels.length && unscannedTruncationLabels.length ? "（部分走査・未走査を含む・総件数不明）" : partialTruncationLabels.length ? "（部分走査を含む・総件数不明）" : unscannedTruncationLabels.length ? "（未走査を含む・件数不明）" : "（比較範囲不完全）";
    const incompleteComparisonWarnings = [
      actualDiffTruncation ? `差分検出が上限 ${Number(actualDiffTruncation.diffLimit || 0)} 件で打ち切られています。未検出の差分が存在します。${truncationRangeSummary ? ` ${truncationRangeSummary}` : ""}` : "",
      fetchIssues.length ? `設定取得に ${fetchIssues.length} 件失敗しています。取得失敗セクションは比較できていません。` : "",
      partialIssues.length ? `JS/CSS等の本文取得に ${partialIssues.length} 件の未検証があります。該当項目は本文ではなく fileKey 等で比較されています。` : "",
      exportSelection.summary.truncated ? `HTML収録上限により表示用展開後の行が ${exportSelection.summary.omittedRows} 件省略されています。` : ""
    ].filter(Boolean);
    const visibleStateRenameNoticeCount = withSameSections.filter((row) => row?._stateRenameNotice).length;
    const bundledStateRenameNoticeCount = Array.isArray(scopes) && scopes.includes("processSettings") ? detectProcessStateRenames(
      sourceBundle?.sections?.processSettings,
      targetBundle?.sections?.processSettings
    ).size : 0;
    const stateRenameNoticeCount = Math.max(visibleStateRenameNoticeCount, bundledStateRenameNoticeCount);
    const canBuildReflectJson = includesComparedContent && incompleteComparisonWarnings.length === 0 && stateRenameNoticeCount === 0;
    const reflectJsonBlockedReason = !includesComparedContent ? "差分行のみのレポートには比較設定が収録されていないため、反映JSONは作成できません" : stateRenameNoticeCount > 0 ? "プロセスの状態名変更を含むため、このレポートでは反映JSONを作成できません。プロセス管理はセクション全体を置き換えるAPIのため、状態名変更以外の選択にも改名が混入します。管理画面で手動確認してください" : canBuildReflectJson ? "" : "比較結果が不完全なため、反映JSONは作成できません。取得失敗や本文未検証、差分・HTML収録上限を解消して再比較してください";
    const normalizationState = options.normalizationState || {};
    const sourceExportMeta = getBundleExportMeta(sourceBundle);
    const targetExportMeta = getBundleExportMeta(targetBundle);
    const reportRowSelection = {
      ...exportSelection.summary,
      baseRows: withSameSections.length
    };
    const reviewStateFingerprint = buildDiffHtmlReviewFingerprint({
      source: {
        appId: sourceExportMeta.appId,
        guestId: sourceExportMeta.guestId,
        preview: sourceExportMeta.preview
      },
      target: {
        appId: targetExportMeta.appId,
        guestId: targetExportMeta.guestId,
        preview: targetExportMeta.preview
      },
      scopes: scopes || [],
      exportMode: options.exportMode || "all",
      exportContentMode,
      incompleteComparison: incompleteComparisonWarnings.length > 0,
      truncated: exportSelection.summary.truncated,
      rowSelection: reportRowSelection
    }, preparedReviewRows.reviewKeys);
    const reportMeta = {
      generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
      scopes: scopes || [],
      sectionText,
      ignoreKeys: String(ignoreKeys || ""),
      exportMode: options.exportMode || "all",
      exportLabel: options.exportLabel || "全差分",
      exportContentMode,
      exportContentLabel: options.exportContentLabel || getDiffExportContentLabel(exportContentMode),
      comparedContentIncluded: includesComparedContent,
      normalizationState,
      normalizationLabels: getActiveDiffNormalizationLabels(normalizationState),
      warning,
      source: sourceExportMeta,
      target: targetExportMeta,
      summary,
      fetchIssues,
      partialIssueCount: partialIssues.length,
      partialIssues,
      sensitiveDiffSections,
      redactedSensitiveSections,
      truncation: engineTruncation,
      incompleteComparison: incompleteComparisonWarnings.length > 0,
      comparisonWarnings: incompleteComparisonWarnings,
      reflectJsonAvailable: canBuildReflectJson,
      reflectJsonBlockedReason,
      totalRows: exportSelection.summary.expandedRows,
      renderedRows: exportSelection.summary.renderedRows,
      truncated: exportSelection.summary.truncated,
      rowSelection: reportRowSelection,
      reviewState: {
        kind: DIFF_HTML_REVIEW_STATE_KIND,
        version: DIFF_HTML_REVIEW_STATE_VERSION,
        maxBytes: DIFF_HTML_REVIEW_STATE_MAX_BYTES,
        fingerprint: reviewStateFingerprint,
        actionableRowCount: preparedReviewRows.reviewKeys.length
      }
    };
    const targetGuestId = String(reportMeta.target.guestId || "").trim();
    const targetPreviewApiPrefix = targetGuestId ? `/k/guest/${encodeURIComponent(targetGuestId)}/v1/preview` : "/k/v1/preview";
    const diffTotal = summary.added + summary.removed + summary.changed;
    const objectiveContentChangedCount = Math.max(0, summary.changed - summary.moved);
    const objectiveFactCards = [
      summary.added > 0 ? `<article class="report-fact report-fact--added"><span>比較先のみに存在</span><strong>${summary.added}</strong><small>比較元にはありません</small></article>` : "",
      summary.removed > 0 ? `<article class="report-fact report-fact--removed"><span>比較元のみに存在</span><strong>${summary.removed}</strong><small>比較先にはありません</small></article>` : "",
      objectiveContentChangedCount > 0 ? `<article class="report-fact report-fact--changed"><span>両方に存在・内容が異なる</span><strong>${objectiveContentChangedCount}</strong><small>値または設定が異なります</small></article>` : "",
      summary.moved > 0 ? `<article class="report-fact report-fact--moved"><span>並び順が異なる</span><strong>${summary.moved}</strong><small>内容とは別に集計</small></article>` : "",
      includesComparedContent && summary.same > 0 ? `<article class="report-fact report-fact--same"><span>内容は同じ</span><strong>${summary.same}</strong><small>比較証跡として収録</small></article>` : ""
    ].filter(Boolean);
    const objectiveFactCardsHtml = objectiveFactCards.length ? objectiveFactCards.join("") : '<article class="report-fact report-fact--same report-fact--empty"><span>差分は見つかりませんでした</span><strong>0</strong><small>選択した設定は一致しています</small></article>';
    const formatAppDisplay = (meta) => {
      const id = String(meta?.appId || "-");
      const name = String(meta?.appName || "").trim();
      return name ? `${name}（アプリ ${id}）` : `アプリ ${id}`;
    };
    const sourceAppDisplay = formatAppDisplay(reportMeta.source);
    const targetAppDisplay = formatAppDisplay(reportMeta.target);
    const clientNormalizationPresets = Object.entries(DIFF_NORMALIZATION_PRESETS).map(([key, preset]) => ({
      key,
      label: preset.label,
      sections: [...preset.sections],
      ignoreKeys: [...preset.ignoreKeys].map((k) => String(k).toLowerCase()),
      unorderedArrays: !!preset.unorderedArrays,
      applied: !!normalizationState[key]
    }));
    const advPresetChecksHtml = clientNormalizationPresets.map(
      (preset) => `<label class="chk adv-chk${preset.applied ? " is-baked" : ""}"${preset.applied ? ' title="比較時に適用済みです（該当行はレポートに含まれていません）"' : ""}><input type="checkbox" data-preset-toggle="${esc(preset.key)}"${preset.applied ? " checked disabled" : ""}> ${esc(preset.label)}を無視${preset.applied ? '<span class="adv-baked-tag">適用済</span>' : ""}</label>`
    ).join("");
    const appliedIgnoreTokens = [...new Set(String(reportMeta.ignoreKeys || "").split(/[\n\r,、，;；]+/).map((token) => token.trim()).filter(Boolean))];
    const appliedIgnoreSummary = appliedIgnoreTokens.length ? `比較時の無視キー ${appliedIgnoreTokens.length}件: ${appliedIgnoreTokens.join("、")}` : "比較時の無視キー 0件（なし）";
    const appliedNormalizationSummary = reportMeta.normalizationLabels.length ? `比較時の正規化 ${reportMeta.normalizationLabels.length}件: ${reportMeta.normalizationLabels.join("、")}` : "比較時の正規化 0件（なし）";
    const contentDisclosureHtml = includesComparedContent ? `<div class="report-content-disclosure report-content-disclosure--caution" data-content-disclosure="withCompared" role="note" aria-label="収録内容と反映方向"><strong>取扱注意: 比較設定込み</strong><span>比較設定・フィールド詳細・設定証跡JSONを収録しています。反映JSONは、比較元の設定値で比較先を上書きする方向です。${canBuildReflectJson ? "" : `反映JSONは利用できません。${esc(reflectJsonBlockedReason)}`}</span></div>` : '<div class="report-content-disclosure" data-content-disclosure="diffOnly" role="note" aria-label="収録内容の注意"><strong>差分行のみ（全設定は未収録）</strong><span>全設定スナップショットは収録していませんが、変更された差分行の比較元・比較先の値は収録しています。匿名化・機密情報のマスキング済みではありません。顧客向けExcelにも同じ差分値が収録され、取得不完全時はエラー等の原文も含まれるため、共有前に内容を確認してください。</span></div>';
    const stateRenameSafetyNoticeHtml = !stateRenameNoticeCount ? "" : visibleStateRenameNoticeCount === stateRenameNoticeCount ? `<div class="warn">ℹ プロセスの状態名変更が ${stateRenameNoticeCount} 件あります。変更件数に含めていますが、プロセス管理はセクション全体を置き換えるAPIのため、このレポートでは反映JSON全体を無効にしています。管理画面で手動確認してください。</div>` : `<div class="warn">ℹ 比較設定全体でプロセスの状態名変更を ${stateRenameNoticeCount} 件検出しました。この出力範囲には ${visibleStateRenameNoticeCount} 件を収録しているため、画面の変更件数は出力範囲に含まれる改名だけを数えています。プロセス管理はセクション全体を置き換えるAPIのため、このレポートでは反映JSON全体を無効にしています。管理画面で手動確認してください。</div>`;
    const noticesHtml = [
      includesComparedContent && incompleteComparisonWarnings.length > 0 ? `<div class="warn"><b>⛔ 比較結果が不完全なため、反映JSONの選択・保存・コピーを無効にしています。</b> 比較元/比較先JSONは比較時の証跡として保存できます。</div>` : "",
      warning.threshold ? `<div class="warn">警告しきい値: ${warning.threshold} / 合計 ${warning.total}${warning.exceeded ? " (超過)" : ""}</div>` : "",
      sensitiveDiffSections.length ? `<div class="warn">🔒 このHTMLには ${sensitiveDiffSections.map((key) => esc(sectionLabelMap[key] || key)).join("・")} の差分値（JS/CSS本文やプラグイン設定値を含む場合があります）が収録されています。共有先と保管場所を確認してください。取得時の内部キャッシュは重複収録していません。</div>` : "",
      redactedSensitiveSections.length ? `<div class="warn">🔒 ${redactedSensitiveSections.map((key) => esc(sectionLabelMap[key] || key)).join("・")} の同一行は、機密値を重複収録しないため値を省略しています。</div>` : "",
      stateRenameSafetyNoticeHtml,
      reportMeta.truncated ? `<div class="warn">${reportMeta.rowSelection.categories.actualDiff.omitted ? "⚠ <b>収録上限により実差分も省略されているため、このレポートは不完全です。</b> " : "※ 実差分を優先して収録しました。"}表示用展開後 ${reportMeta.rowSelection.expandedRows} 件のうち ${reportMeta.rowSelection.renderedRows} 件を収録し、${reportMeta.rowSelection.omittedRows} 件を省略しました（省略: 実差分 ${reportMeta.rowSelection.categories.actualDiff.omitted} 件 / 表示専用の補助行 ${reportMeta.rowSelection.categories.displayOnly.omitted} 件 / 同一行 ${reportMeta.rowSelection.categories.same.omitted} 件）。</div>` : "",
      actualDiffTruncation ? `<div class="warn">⚠ 差分件数が上限（${actualDiffTruncation.diffLimit}件）に達したため、超過分は検出されておらずこのレポートに含まれていません。${partialTruncationLabels.length ? `<b>部分走査・総件数不明（表示件数は下限）: ${partialTruncationLabels.map((label) => esc(label)).join("・")}。</b>` : ""}${unscannedTruncationLabels.length ? `<b>未走査・件数不明: ${unscannedTruncationLabels.map((label) => esc(label)).join("・")}。</b>` : ""}${completeKnownTruncationLabels.length ? `<b>走査完了・未収録件数既知: ${completeKnownTruncationLabels.map((label) => esc(label)).join("・")}。</b>` : ""}<b>このレポートは不完全です。</b>無視キーやセクション絞り込みで差分を減らして再比較してください。</div>` : "",
      engineTruncation && !actualDiffTruncation && Number(engineTruncation.droppedSame || 0) > 0 ? `<div class="warn">ℹ 同一証跡は上限 ${Number(engineTruncation.sameLimit || 0)} 件まで収録し、${Number(engineTruncation.droppedSame || 0)} 件を省略しました。実差分の検出結果は完全です。</div>` : "",
      partialIssues.length ? `<div class="warn">⚠ <b>本文未検証 ${partialIssues.length}件</b> — JS/CSS等の本文を取得できなかったため、該当項目は本文ではなく fileKey 等で比較しています。${partialIssues.map((issue) => `<div class="msg">${esc(issue.section || issue.sectionKey || "-")} / ${esc(getIssueSideLabel(issue.side))}: ${esc(issue.message || issue.reason || "本文を取得できませんでした")}</div>`).join("")}</div>` : "",
      fetchIssues.length ? `<details class="issue-box">
          <summary>API取得失敗 ${fetchIssues.length}件</summary>
          <table>
            <thead><tr><th style="width:200px">セクション</th><th style="width:90px">対象</th><th>内容</th></tr></thead>
            <tbody>${fetchIssues.map((issue) => `<tr><td>${esc(issue.section || issue.sectionKey || "-")}</td><td>${esc(getIssueSideLabel(issue.side))}</td><td><div class="msg">${esc(issue.message || "-")}</div></td></tr>`).join("")}</tbody>
          </table>
        </details>` : ""
    ].filter(Boolean).join("");
    const reflectJsonDisabledAttrs = canBuildReflectJson ? "" : ` disabled aria-disabled="true" title="${esc(reflectJsonBlockedReason)}"`;
    const comparedContentModeNote = includesComparedContent ? canBuildReflectJson ? "比較設定込み（取扱注意・反映JSONを利用可能）" : stateRenameNoticeCount > 0 ? "比較設定込み（取扱注意・状態名変更の安全対策により反映JSONは無効）" : "比較設定込み（取扱注意・比較不完全のため反映JSONは無効）" : "差分行のみ（全設定は未収録）";
    const pickSectionsForReport = (bundle) => {
      const out = {};
      if (!includesComparedContent) return out;
      (Array.isArray(scopes) ? scopes : []).forEach((key) => {
        if (bundle?.sections && bundle.sections[key] !== void 0) {
          out[key] = sanitizeReportSectionValue(key, bundle.sections[key]);
        }
      });
      return out;
    };
    const srcSectionsForReport = pickSectionsForReport(sourceBundle);
    const tgtSectionsForReport = pickSectionsForReport(targetBundle);
    const srcFieldProps = (() => {
      const s = srcSectionsForReport.fieldSettings;
      if (!s || typeof s !== "object" || Array.isArray(s)) return {};
      if (s.properties && typeof s.properties === "object" && !Array.isArray(s.properties)) return s.properties;
      return s;
    })();
    const tgtFieldProps = (() => {
      const s = tgtSectionsForReport.fieldSettings;
      if (!s || typeof s !== "object" || Array.isArray(s)) return {};
      if (s.properties && typeof s.properties === "object" && !Array.isArray(s.properties)) return s.properties;
      return s;
    })();
    const srcLayoutRows = includesComparedContent ? sourceBundle?.sections?.layoutSettings?.layout || [] : [];
    const tgtLayoutRows = includesComparedContent ? targetBundle?.sections?.layoutSettings?.layout || [] : [];
    const logicScript = `
(() => {
  const REPORT_ROWS = ${safeJsonForScript(reportRows)};
  const ROW_SEARCH_TEXT_CACHE = new WeakMap();
  const REPORT_SEARCH_DEBOUNCE_MS = 150;
  const SECTION_LABEL_MAP = ${safeJsonForScript(sectionLabelMap)};
  const ENTITY_KIND_LABEL_MAP = ${safeJsonForScript(entityKindLabelMap)};
  const REPORT_META = ${safeJsonForScript(reportMeta)};
  const REVIEW_STATE_KIND = String(REPORT_META.reviewState.kind || '');
  const REVIEW_STATE_VERSION = Number(REPORT_META.reviewState.version || 0);
  const REVIEW_STATE_MAX_BYTES = Number(REPORT_META.reviewState.maxBytes || ${DIFF_HTML_REVIEW_STATE_MAX_BYTES});
  const REVIEW_STATE_FINGERPRINT = String(REPORT_META.reviewState.fingerprint || '');
  const HAS_COMPARED_CONTENT = ${includesComparedContent ? "true" : "false"};
  const CAN_BUILD_REFLECT_JSON = !!REPORT_META.reflectJsonAvailable;
  const REFLECT_JSON_BLOCK_REASON = String(REPORT_META.reflectJsonBlockedReason || '反映JSONを作成できません');
  const DIFF_NAV_RANGE_NOTE = ${safeJsonForScript(diffNavRangeNote)};
  const TARGET_PREVIEW_API_PREFIX = ${safeJsonForScript(targetPreviewApiPrefix)};
  const NORMALIZATION_PRESETS = ${safeJsonForScript(clientNormalizationPresets)};
  const THEME_KEY = '${TOOL_ID}:diffReportTheme';
  const ACTIVE_TAB_KEY = '${TOOL_ID}:diffReportActiveTab';
  const LINE_DIFF_MAX_CELLS = ${LINE_DIFF_MAX_CELLS};
  const CHAR_DIFF_MAX_CELLS = ${CHAR_DIFF_MAX_CELLS};
  const collapsed = new Set();
  let typeFilterValue = 'all';
  let sectionFilterValue = 'all';
  let diffSortValue = 'standard';
  let focusModeEnabled = false;
  let compactDensityEnabled = false;
  let mobileToolbarExpanded = false;
  // 表示視点（both=左右比較 / source=比較元のみ / target=比較先のみ）
  let viewSideValue = 'both';
  // レポート内「詳細オプション」の状態（表示のみの絞り込み。比較のやり直しは行わない）
  const activePresetKeys = new Set();
  let extraIgnoreRules = null;
  const expandedVals = new Set();
  const sameOpen = new Set();
  const KUC_SEMVER = '${KUC_REPORT_VERSION}';
  const FIELD_PROPS_SRC = ${safeJsonForScript(srcFieldProps)};
  const FIELD_PROPS_TGT = ${safeJsonForScript(tgtFieldProps)};
  const SOURCE_SECTIONS = ${safeJsonForScript(srcSectionsForReport)};
  const TARGET_SECTIONS = ${safeJsonForScript(tgtSectionsForReport)};
  const LAYOUT_ROWS_SRC = ${safeJsonForScript(srcLayoutRows)};
  const LAYOUT_ROWS_TGT = ${safeJsonForScript(tgtLayoutRows)};
  const FLAT_FIELD_PROPS_SRC = collectFlatFieldMap(FIELD_PROPS_SRC);
  const FLAT_FIELD_PROPS_TGT = collectFlatFieldMap(FIELD_PROPS_TGT);
  let activeFieldCode = '';
  let detailModalOpen = false;
  let fieldDetailReturnFocus = null;
  const reportMemory = new Map();
  // 確認済みチェック（このレポートを開いている間だけ保持）
  const reviewedKeys = new Set();
  // 反映JSON作成用の選択状態（差分行キー → 行 / フィールドコード）
  const selectedRows = new Map();
  const selectedFieldCodes = new Set();
  // フィールド単位ビューの種別絞り込み
  let fieldStatusFilterValue = 'all';
  // 表示中の行キー → 行データ（コピー・確認チェックの参照用）
  const rowLookup = new Map();
  // j/k キーによる差分ジャンプの現在位置
  let diffFocusIndex = -1;
  let diffFocusKey = '';
  let diffNavigationTargets = [];
  let diffStickyFrame = 0;
  let mobileSidebarReturnFocus = null;
  let mobileSidebarScrollY = 0;
  let reportSearchTimer = 0;
  let reportSearchFrame = 0;
  let searchCompositionActive = false;

  function isRawJsonMode() {
    const el = document.getElementById('rawJson');
    return !!(el && el.checked);
  }

  function showToast(message) {
    let el = document.getElementById('reportToast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'reportToast';
      el.className = 'report-toast';
      el.setAttribute('role', 'status');
      el.setAttribute('aria-live', 'polite');
      el.setAttribute('aria-atomic', 'true');
      const host = document.querySelector('.settings-shell') || document.body;
      host.appendChild(el);
    }
    el.textContent = String(message || '');
    el.classList.add('is-visible');
    clearTimeout(showToast._timer);
    showToast._timer = setTimeout(() => el.classList.remove('is-visible'), 2200);
  }

  function copyTextToClipboard(text, doneMessage) {
    const value = String(text == null ? '' : text);
    const fallback = () => {
      try {
        const ta = document.createElement('textarea');
        ta.value = value;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        ta.remove();
        showToast(doneMessage || 'コピーしました');
      } catch (e) {
        showToast('コピーに失敗しました');
      }
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(value)
        .then(() => showToast(doneMessage || 'コピーしました'))
        .catch(fallback);
    } else {
      fallback();
    }
  }

  function isActionableReviewRow(row) {
    return !!row && row.type !== 'same' && !row._displayOnly;
  }

  function reviewProgressOf(rows) {
    const actionable = (rows || []).filter(isActionableReviewRow);
    const reviewed = actionable.filter((row) => reviewedKeys.has(rowStateKey(row))).length;
    const total = actionable.length;
    const percent = total ? Math.round((reviewed / total) * 100) : 100;
    return { actionable, reviewed, total, pending: Math.max(0, total - reviewed), percent };
  }

  function syncReviewedStat(rows) {
    const progress = reviewProgressOf(rows || getDetailFilteredRows());
    const reviewedEl = document.getElementById('stat-reviewed');
    if (reviewedEl) reviewedEl.textContent = String(progress.reviewed);
    const valueEl = document.getElementById('sidebarReviewProgressValue');
    if (valueEl) valueEl.textContent = progress.reviewed + ' / ' + progress.total + '（' + progress.percent + '%）';
    const barEl = document.getElementById('sidebarReviewProgressBar');
    if (barEl) {
      barEl.setAttribute('aria-valuemax', String(progress.total));
      barEl.setAttribute('aria-valuenow', String(progress.reviewed));
      barEl.setAttribute('aria-valuetext', '確認済み ' + progress.reviewed + '件 / 全 ' + progress.total + '件（' + progress.percent + '%）');
    }
    const fillEl = document.getElementById('sidebarReviewProgressFill');
    if (fillEl) fillEl.style.width = progress.percent + '%';
    return progress;
  }

  function syncSelectedStat() {
    const el = document.getElementById('stat-selected');
    if (el) el.textContent = String(selectedRows.size + selectedFieldCodes.size);
  }

  function preferredScrollBehavior() {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
  }

  function syncDiffStickyOffset() {
    const toolbar = document.querySelector('#main .diff-toolbar');
    const offset = toolbar ? Math.ceil(toolbar.getBoundingClientRect().height + 8) : 0;
    document.documentElement.style.setProperty('--diff-toolbar-offset', offset + 'px');
  }

  function scheduleDiffStickyOffsetSync() {
    if (diffStickyFrame) window.cancelAnimationFrame(diffStickyFrame);
    diffStickyFrame = window.requestAnimationFrame(() => {
      diffStickyFrame = 0;
      syncDiffStickyOffset();
    });
  }

  function syncDiffNavPosition() {
    const currentIndex = diffNavigationTargets.findIndex((target) => target.key === diffFocusKey);
    diffFocusIndex = currentIndex;
    if (currentIndex < 0) diffFocusKey = '';
    const position = document.getElementById('diffNavPosition');
    if (position) {
      position.textContent = '現在位置 ' + (currentIndex >= 0 ? currentIndex + 1 : 0) + ' / ' + diffNavigationTargets.length + DIFF_NAV_RANGE_NOTE;
    }
    const focusPosition = document.getElementById('focusContextPosition');
    if (focusPosition) {
      focusPosition.textContent = (currentIndex >= 0 ? currentIndex + 1 : 0) + ' / ' + diffNavigationTargets.length;
    }
    document.querySelectorAll('[data-diff-nav]').forEach((btn) => {
      const direction = btn.getAttribute('data-diff-nav');
      const atStart = currentIndex === 0 && direction === 'prev';
      const atEnd = currentIndex === diffNavigationTargets.length - 1 && direction === 'next';
      btn.disabled = diffNavigationTargets.length === 0 || atStart || atEnd;
    });
  }

  function focusDiffRow(key, options) {
    const opts = options || {};
    let active = null;
    document.querySelectorAll('#main [data-diff-row-key]').forEach((row) => {
      const isCurrent = row.getAttribute('data-diff-row-key') === key;
      row.classList.toggle('drow--focus', isCurrent);
      row.setAttribute('aria-current', isCurrent ? 'true' : 'false');
      if (isCurrent) active = row;
    });
    if (!active) return false;
    if (opts.focus !== false) {
      try { active.focus({ preventScroll: true }); } catch (e) { active.focus(); }
    }
    if (opts.scroll !== false) {
      active.scrollIntoView({ behavior: preferredScrollBehavior(), block: 'center' });
    }
    return true;
  }

  function moveDiffFocus(delta) {
    if (!diffNavigationTargets.length) {
      diffFocusIndex = -1;
      diffFocusKey = '';
      syncDiffNavPosition();
      return;
    }
    const currentIndex = diffNavigationTargets.findIndex((target) => target.key === diffFocusKey);
    const nextIndex = currentIndex < 0
      ? (delta < 0 ? diffNavigationTargets.length - 1 : 0)
      : Math.min(diffNavigationTargets.length - 1, Math.max(0, currentIndex + delta));
    if (currentIndex >= 0 && nextIndex === currentIndex) {
      showToast(delta < 0 ? '先頭の差分です' : '末尾の差分です');
      syncDiffNavPosition();
      return;
    }
    const target = diffNavigationTargets[nextIndex];
    diffFocusIndex = nextIndex;
    diffFocusKey = target.key;
    const expanded = collapsed.delete(target.sectionKey);
    if (expanded) render();
    syncDiffNavPosition();
    requestAnimationFrame(() => {
      focusDiffRow(target.key);
      syncDiffNavPosition();
    });
  }

  function downloadTextFile(filename, text, mime) {
    const blob = new Blob([text], { type: (mime || 'text/plain') + ';charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function reviewStateAllowedKeys() {
    return new Set(REPORT_ROWS
      .filter((row) => row && row.type !== 'same' && !row._displayOnly && row._reviewKey)
      .map((row) => String(row._reviewKey)));
  }

  function setReviewStateStatus(message, isError) {
    const el = document.getElementById('reviewStateStatus');
    if (el) {
      el.textContent = String(message || '');
      el.classList.toggle('is-error', !!isError);
    }
    if (message) showToast(message);
  }

  function buildReviewStatePayload() {
    const allowedKeys = reviewStateAllowedKeys();
    const savedKeys = [...reviewedKeys]
      .filter((key) => allowedKeys.has(key))
      .sort();
    return {
      kind: REVIEW_STATE_KIND,
      version: REVIEW_STATE_VERSION,
      savedAt: new Date().toISOString(),
      reportFingerprint: REVIEW_STATE_FINGERPRINT,
      report: {
        generatedAt: REPORT_META.generatedAt || '',
        source: {
          appId: REPORT_META.source.appId || '',
          guestId: REPORT_META.source.guestId || '',
          preview: !!REPORT_META.source.preview
        },
        target: {
          appId: REPORT_META.target.appId || '',
          guestId: REPORT_META.target.guestId || '',
          preview: !!REPORT_META.target.preview
        },
        actionableRowCount: allowedKeys.size,
        incompleteComparison: !!REPORT_META.incompleteComparison,
        truncated: !!REPORT_META.truncated
      },
      reviewedKeys: savedKeys
    };
  }

  function saveReviewStateJson() {
    try {
      const payload = buildReviewStatePayload();
      const stamp = String(payload.savedAt || '').replace(/[-:TZ.]/g, '').slice(0, 14) || 'review';
      const sourceId = String(REPORT_META.source.appId || '-');
      const targetId = String(REPORT_META.target.appId || '-');
      downloadTextFile('差分レビュー状態_' + sourceId + '_vs_' + targetId + '_' + stamp + '.json', JSON.stringify(payload, null, 2), 'application/json');
      setReviewStateStatus('レビュー状態JSONを保存しました（確認済み ' + payload.reviewedKeys.length + '件）', false);
    } catch (error) {
      setReviewStateStatus('レビュー状態JSONの保存に失敗しました', true);
    }
  }

  function readReviewStateFile(file) {
    if (file && typeof file.text === 'function') return file.text();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(reader.error || new Error('ファイルを読み込めませんでした'));
      reader.readAsText(file, 'utf-8');
    });
  }

  function isReviewStateObject(value) {
    return !!value && typeof value === 'object' && !Array.isArray(value);
  }

  function validateReviewStatePayload(payload) {
    if (!isReviewStateObject(payload)) throw new Error('レビュー状態JSONの形式が正しくありません');
    if (payload.kind !== REVIEW_STATE_KIND) throw new Error('レビュー状態JSONの種類が正しくありません');
    if (payload.version !== REVIEW_STATE_VERSION) throw new Error('対応していないレビュー状態JSONのバージョンです');
    if (payload.reportFingerprint !== REVIEW_STATE_FINGERPRINT) {
      throw new Error('別の差分レポートのレビュー状態なので読み込めません');
    }
    if (!isReviewStateObject(payload.report)) throw new Error('レビュー状態JSONのレポート情報がありません');
    if (!Array.isArray(payload.reviewedKeys)) throw new Error('レビュー状態JSONの確認済み一覧が正しくありません');

    const allowedKeys = reviewStateAllowedKeys();
    if (Number(payload.report.actionableRowCount) !== allowedKeys.size) {
      throw new Error('レビュー対象件数が現在の差分レポートと一致しません');
    }
    if (payload.reviewedKeys.length > allowedKeys.size) {
      throw new Error('確認済み件数が現在のレビュー対象件数を超えています');
    }

    const nextReviewedKeys = new Set();
    payload.reviewedKeys.forEach((key) => {
      if (typeof key !== 'string' || !key || key.length > 128) {
        throw new Error('レビュー状態JSONに不正な行キーがあります');
      }
      if (!allowedKeys.has(key)) {
        throw new Error('レビュー状態JSONに現在の差分レポートにはない行が含まれています');
      }
      if (nextReviewedKeys.has(key)) {
        throw new Error('レビュー状態JSONに重複した行があります');
      }
      nextReviewedKeys.add(key);
    });
    return nextReviewedKeys;
  }

  async function loadReviewStateJson(file) {
    if (!file) return;
    if (Number(file.size || 0) > REVIEW_STATE_MAX_BYTES) {
      setReviewStateStatus('レビュー状態JSONは2MB以下のファイルを選択してください', true);
      return;
    }
    try {
      const text = await readReviewStateFile(file);
      if (text.length > REVIEW_STATE_MAX_BYTES) {
        throw new Error('レビュー状態JSONは2MB以下のファイルを選択してください');
      }
      let payload;
      try {
        payload = JSON.parse(text);
      } catch (error) {
        throw new Error('レビュー状態JSONを解析できませんでした');
      }
      // ここまで現在状態は変更せず、全項目の検証が完了してから一度に置き換える。
      const nextReviewedKeys = validateReviewStatePayload(payload);
      reviewedKeys.clear();
      nextReviewedKeys.forEach((key) => reviewedKeys.add(key));
      render();
      if (getActiveReportTab() === 'settingsLike') renderSettingsLikeView();
      syncReviewedStat(getDetailFilteredRows());
      setReviewStateStatus('レビュー状態JSONを読み込みました（確認済み ' + nextReviewedKeys.size + '件）', false);
    } catch (error) {
      const message = error && error.message ? error.message : 'レビュー状態JSONの読込に失敗しました';
      setReviewStateStatus(message, true);
    }
  }

  // 現在の絞り込み条件（詳細オプション・検索・種別チップ）で表示される差分行を平坦に返す
  function collectVisibleDiffRowsForExport() {
    const hideSame = !!(document.getElementById('hideSame')).checked;
    const hideReviewed = !!(document.getElementById('hideReviewed') || {}).checked;
    const keyword = String((document.getElementById('search')).value || '').trim().toLowerCase();
    return getDetailFilteredRows().filter((row) => {
      if (hideSame && row.type === 'same') return false;
      if (hideReviewed && row.type !== 'same' && reviewedKeys.has(rowStateKey(row))) return false;
      return rowMatches(row, keyword);
    }).filter(sectionFilterMatches).filter(typeFilterMatches);
  }

  function csvEscape(v) {
    const raw = String(v == null ? '' : v);
    // Excel 等で CSV を開いた際、先頭空白の後に = + - @ が続く値も式として
    // 評価され得るため、文字列として扱われるよう先頭に apostrophe を付ける。
    const s = /^[\\t\\r\\n ]*[=+\\-@]/.test(raw) ? "'" + raw : raw;
    if (/[",\\n\\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  }

  function exportVisibleRowsAsCsv() {
    const rows = collectVisibleDiffRowsForExport();
    if (!rows.length) {
      showToast('出力対象の行がありません');
      return;
    }
    const header = ['セクション', '種別', 'パス', '比較元', '比較先', '確認済み'];
    const lines = [header.map(csvEscape).join(',')];
    rows.forEach((row) => {
      lines.push([
        SECTION_LABEL_MAP[row.sectionKey || ''] || row.section || row.sectionKey || '',
        diffTypeLabel(row.type, row.moved),
        row.path || '',
        safeText(row.left),
        safeText(row.right),
        reviewedKeys.has(rowStateKey(row)) ? '済' : ''
      ].map(csvEscape).join(','));
    });
    const stamp = String(REPORT_META.generatedAt || '').replace(/[-:TZ.]/g, '').slice(0, 14) || 'report';
    downloadTextFile('差分一覧_' + stamp + '.csv', '\\ufeff' + lines.join('\\r\\n'), 'text/csv');
    showToast('CSVを保存しました（' + rows.length + '行）');
  }

  function mdCell(v, maxLen) {
    const limit = maxLen || 200;
    let s = String(v == null ? '' : v);
    if (s.length > limit) s = s.slice(0, limit) + '…';
    return s.replace(/\\|/g, '\\\\|').replace(/\\r?\\n/g, '<br>');
  }

  function copyVisibleRowsAsMarkdown() {
    const rows = collectVisibleDiffRowsForExport();
    if (!rows.length) {
      showToast('出力対象の行がありません');
      return;
    }
    const bySection = new Map();
    rows.forEach((row) => {
      const key = row.sectionKey || row.section || '未分類';
      if (!bySection.has(key)) bySection.set(key, []);
      bySection.get(key).push(row);
    });
    const parts = ['# 設定差分（アプリ ' + (REPORT_META.source.appId || '-') + ' → アプリ ' + (REPORT_META.target.appId || '-') + '）', ''];
    bySection.forEach((list, key) => {
      parts.push('## ' + (SECTION_LABEL_MAP[key] || key) + '（' + list.length + '件）', '');
      parts.push('| 種別 | パス | 比較元 | 比較先 |');
      parts.push('| --- | --- | --- | --- |');
      list.forEach((row) => {
        parts.push('| ' + mdCell(diffTypeLabel(row.type, row.moved), 20)
          + ' | ' + mdCell(row.path || '', 160)
          + ' | ' + mdCell(safeText(row.left), 200)
          + ' | ' + mdCell(safeText(row.right), 200) + ' |');
      });
      parts.push('');
    });
    copyTextToClipboard(parts.join('\\n'), 'Markdownをコピーしました（' + rows.length + '行）');
  }

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

  function rowExistenceLabel(row) {
    if (row && row.type === 'added') return '比較先のみに存在';
    if (row && row.type === 'removed') return '比較元のみに存在';
    return '両方に存在';
  }

  function rowDifferenceLabels(row) {
    if (row && (row.type === 'added' || row.type === 'removed')) return ['片側のみ'];
    if (row && row.type === 'same') return ['内容は同じ'];
    if (row && (row.moved || row.type === 'moved')) return ['並び順が異なる'];
    const labels = [];
    if (row && row.type === 'changed') labels.push('内容が異なる');
    return labels.length ? labels : ['差分あり'];
  }

  function rowDifferenceLabel(row) {
    return rowDifferenceLabels(row).join('・');
  }

  function renderRowFacts(row) {
    const typeClass = row && row.type === 'same'
      ? 'same'
      : row && row.type === 'added'
        ? 'added'
        : row && row.type === 'removed'
          ? 'removed'
          : 'changed';
    return '<span class="fact-chip fact-chip--existence fact-chip--' + typeClass + '" data-row-existence="' + escHtml(rowExistenceLabel(row)) + '">' + escHtml(rowExistenceLabel(row)) + '</span>'
      + rowDifferenceLabels(row).map((label) => '<span class="fact-chip fact-chip--difference fact-chip--' + typeClass + '" data-row-difference="' + escHtml(label) + '">' + escHtml(label) + '</span>').join('');
  }

  function issueSideLabel(side) {
    if (side === 'source') return '比較元';
    if (side === 'target') return '比較先';
    if (side === 'both') return '両方';
    return String(side || '-');
  }

  function rowSearchText(row) {
    if (!row || typeof row !== 'object') return '';
    const cached = ROW_SEARCH_TEXT_CACHE.get(row);
    if (cached !== undefined) return cached;
    const text = [
      row.section || '',
      row.sectionKey || '',
      row.path || '',
      row.reasonSummary || '',
      row.renameCandidate ? (row.renameCandidate.fromCode || '') + ' ' + (row.renameCandidate.toCode || '') : '',
      ...((row.impactRefs || []).map((ref) => (ref.section || ref.sectionKey || '') + ' ' + (ref.kind || '') + ' ' + (ref.label || '') + ' ' + (ref.path || ''))),
      safeText(row.left),
      safeText(row.right)
    ].join('\\n').toLowerCase();
    ROW_SEARCH_TEXT_CACHE.set(row, text);
    return text;
  }

  function rowMatches(row, keyword) {
    if (!keyword) return true;
    return rowSearchText(row).includes(keyword);
  }

  // ---- 詳細オプション（無視キー / 正規化プリセット）による表示絞り込み ----
  // 差分エンジンの isIgnoredPath と同じ判定（キー・パス・ワイルドカード）を
  // レポート内で再現し、出力済みの行を後から非表示にできるようにする。

  function normIgnoreToken(token) {
    return String(token == null ? '' : token)
      .replace(/[\\u200b\\u200c\\u200d\\ufeff]/g, '')
      .replace(/^[\\s\\u3000]+|[\\s\\u3000]+$/g, '')
      .toLowerCase();
  }

  function trimIgnoreToken(token) {
    return String(token == null ? '' : token)
      .replace(/[\\u200b\\u200c\\u200d\\ufeff]/g, '')
      .replace(/^[\\s\\u3000]+|[\\s\\u3000]+$/g, '');
  }

  function decodeExactIgnorePathRule(token) {
    const raw = trimIgnoreToken(token);
    if (raw.slice(0, 5).toLowerCase() !== 'path:') return null;
    try {
      return trimIgnoreToken(decodeURIComponent(raw.slice(5))) || null;
    } catch (e) {
      return null;
    }
  }

  function compileIgnoreWildcard(token) {
    const escaped = token.replace(/[.+?^\${}()|[\\]\\\\]/g, '\\\\$&').replace(/\\*/g, '.*');
    return new RegExp('^' + escaped + '$');
  }

  function parseExtraIgnoreRules(text) {
    const keySet = [];
    const pathSet = [];
    const exactPathSet = [];
    const keyPatterns = [];
    const pathPatterns = [];
    String(text || '')
      .split(/[\\n\\r,\\u3001\\uff0c;\\uff1b]+/)
      .map(trimIgnoreToken)
      .filter(Boolean)
      .forEach((rawToken) => {
        const exactPath = decodeExactIgnorePathRule(rawToken);
        if (exactPath) {
          exactPathSet.push(exactPath);
          return;
        }
        const token = normIgnoreToken(rawToken);
        const isPath = token.indexOf('.') >= 0 || token.indexOf('[') >= 0;
        const cleaned = token;
        if (cleaned.indexOf('*') >= 0) {
          try {
            const re = compileIgnoreWildcard(cleaned);
            if (isPath) pathPatterns.push(re);
            else keyPatterns.push(re);
          } catch (e) { /* 不正なパターンは無視 */ }
          return;
        }
        if (isPath) pathSet.push(cleaned);
        else keySet.push(cleaned);
      });
    if (!keySet.length && !pathSet.length && !exactPathSet.length && !keyPatterns.length && !pathPatterns.length) return null;
    return { keySet, pathSet, exactPathSet, keyPatterns, pathPatterns };
  }

  function ignorePathLeafKey(path) {
    const m = String(path || '').match(/([^[.\\]]+)(?:\\[\\d+\\])?$/);
    return m ? m[1] : '';
  }

  function matchesIgnoreRules(rules, path) {
    if (!rules) return false;
    const exactPath = trimIgnoreToken(path);
    if (exactPath && rules.exactPathSet.indexOf(exactPath) >= 0) return true;
    const normalizedPath = normIgnoreToken(path);
    if (!normalizedPath) return false;
    if (rules.pathSet.indexOf(normalizedPath) >= 0) return true;
    for (const re of rules.pathPatterns) { if (re.test(normalizedPath)) return true; }
    const leaf = ignorePathLeafKey(normalizedPath);
    if (!leaf) return false;
    if (rules.keySet.indexOf(leaf) >= 0) return true;
    for (const re of rules.keyPatterns) { if (re.test(leaf)) return true; }
    return false;
  }

  function pathPropTokens(path) {
    const out = [];
    const re = /([^[.\\]]+)/g;
    let m;
    const s = String(path || '');
    while ((m = re.exec(s)) !== null) {
      if (!/^\\d+$/.test(m[1])) out.push(m[1]);
    }
    return out;
  }

  function presetSuppressesRow(preset, row) {
    if (preset.sections.indexOf(String(row.sectionKey || '')) < 0) return false;
    // 順序無視系プリセット: 純粋な移動行（内容同一・位置のみ変化）を除外
    if (preset.unorderedArrays && row.moved && row.type === 'changed') return true;
    if (preset.ignoreKeys.length) {
      const tokens = pathPropTokens(row.path);
      for (const token of tokens) {
        if (preset.ignoreKeys.indexOf(normIgnoreToken(token)) >= 0) return true;
      }
    }
    return false;
  }

  function passesDetailFilters(row) {
    if (extraIgnoreRules && matchesIgnoreRules(extraIgnoreRules, row.path)) return false;
    if (activePresetKeys.size) {
      for (const preset of NORMALIZATION_PRESETS) {
        if (preset.applied || !activePresetKeys.has(preset.key)) continue;
        if (presetSuppressesRow(preset, row)) return false;
      }
    }
    return true;
  }

  function getDetailFilteredRows() {
    if (!extraIgnoreRules && !activePresetKeys.size) return REPORT_ROWS;
    return REPORT_ROWS.filter(passesDetailFilters);
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

  // 値表示の方針:
  //  - 1行かつ短い値はインラインで「旧 → 新」を1行に表示（カード2ペインを使わない）
  //  - 追加/削除は片側のみをフル幅で表示（空の「（なし）」ペインを作らない）
  //  - 複数行の変更のみ左右ペア（行単位LCS + 文字ハイライト）で表示
  const INLINE_VALUE_MAX = 120;
  const LONG_VALUE_COLLAPSE_CHARS = 1400;
  const LONG_VALUE_COLLAPSE_LINES = 18;

  function isInlineText(text) {
    return text.indexOf('\\n') === -1 && text.length <= INLINE_VALUE_MAX;
  }

  function renderInlineLane(side, tone, content) {
    const isSource = side === 'source';
    const lane = isSource ? 'before' : 'after';
    const english = isSource ? 'BEFORE' : 'AFTER';
    const japanese = isSource ? '比較元' : '比較先';
    return '<span class="val-lane val-lane--' + lane + '">'
      + '<span class="val-lane-label"><b>' + english + '</b><small>' + japanese + '</small></span>'
      + '<span class="vi-val vi-val--' + tone + '">' + content + '</span>'
      + '</span>';
  }

  function renderDuoLaneHeader(side, detail) {
    const isSource = side === 'source';
    return '<span class="duo-lane duo-lane--' + (isSource ? 'before' : 'after') + '">'
      + '<b>' + (isSource ? 'BEFORE' : 'AFTER') + '</b>'
      + '<small>' + escHtml(detail || (isSource ? '比較元' : '比較先')) + '</small>'
      + '</span>';
  }

  function shouldHideUnchangedDiffLines() {
    const el = document.getElementById('hideUnchangedLines');
    return !!(el && el.checked);
  }

  function activeViewSide() {
    return viewSideValue === 'source' || viewSideValue === 'target' ? viewSideValue : '';
  }

  function renderChangedDuo(row, useCharDiff) {
    const side = activeViewSide();
    if (side) return renderChangedSolo(row, useCharDiff, side);
    const leftText = safeText(row.left);
    const rightText = safeText(row.right);
    const ops = buildLineDiffOps(leftText.split('\\n'), rightText.split('\\n'));
    let body = '';
    if (!ops) {
      body = '<div class="duo-row">'
        + '<div class="duo-cell del" data-side-label="比較元"><pre class="blk">' + escHtml(leftText) + '</pre></div>'
        + '<div class="duo-cell add" data-side-label="比較先"><pre class="blk">' + escHtml(rightText) + '</pre></div>'
        + '</div>';
    } else {
      let leftNo = 0;
      let rightNo = 0;
      const hideSameLines = shouldHideUnchangedDiffLines();
      body = ops.map((op) => {
        if (op.type === 'same') {
          leftNo += 1;
          rightNo += 1;
          const l = '<span class="ln">' + leftNo + '</span><span class="lt">' + escHtml(op.left || '') + '</span>';
          if (hideSameLines) return '';
          const r = '<span class="ln">' + rightNo + '</span><span class="lt">' + escHtml(op.right || '') + '</span>';
          return '<div class="duo-row"><div class="duo-cell" data-side-label="比較元">' + l + '</div><div class="duo-cell" data-side-label="比較先">' + r + '</div></div>';
        }
        if (op.type === 'replace') {
          leftNo += 1;
          rightNo += 1;
          const cd = useCharDiff ? buildCharDiff(op.left, op.right) : null;
          const l = '<span class="ln">' + leftNo + '</span><span class="lt">' + (cd ? cd.left : escHtml(op.left || '')) + '</span>';
          const r = '<span class="ln">' + rightNo + '</span><span class="lt">' + (cd ? cd.right : escHtml(op.right || '')) + '</span>';
          return '<div class="duo-row"><div class="duo-cell del" data-side-label="比較元">' + l + '</div><div class="duo-cell add" data-side-label="比較先">' + r + '</div></div>';
        }
        if (op.type === 'del') {
          leftNo += 1;
          const l = '<span class="ln">' + leftNo + '</span><span class="lt">' + escHtml(op.left || '') + '</span>';
          return '<div class="duo-row"><div class="duo-cell del" data-side-label="比較元">' + l + '</div><div class="duo-cell pad"></div></div>';
        }
        rightNo += 1;
        const r = '<span class="ln">' + rightNo + '</span><span class="lt">' + escHtml(op.right || '') + '</span>';
        return '<div class="duo-row"><div class="duo-cell pad"></div><div class="duo-cell add" data-side-label="比較先">' + r + '</div></div>';
      }).join('');
      if (!body && hideSameLines) body = '<div class="duo-empty">変更行はありません</div>';
    }
    return '<div class="duo-wrap">'
      + '<div class="duo-head">' + renderDuoLaneHeader('source', '比較元') + renderDuoLaneHeader('target', '比較先') + '</div>'
      + '<div class="duo scroll">' + body + '</div>'
      + '</div>';
  }

  // 片側視点: 選択したアプリの内容だけを1カラムで表示し、変更箇所のみ色付けする
  function renderChangedSolo(row, useCharDiff, side) {
    const isSrc = side === 'source';
    const ownText = safeText(isSrc ? row.left : row.right);
    const ops = buildLineDiffOps(safeText(row.left).split('\\n'), safeText(row.right).split('\\n'));
    const tone = isSrc ? 'del' : 'add';
    const sideLabel = escHtml(issueSideLabel(side));
    let body = '';
    if (!ops) {
      body = '<div class="duo-row duo-row--solo"><div class="duo-cell ' + tone + '" data-side-label="' + sideLabel + '"><pre class="blk">' + escHtml(ownText) + '</pre></div></div>';
    } else {
      const hideSameLines = shouldHideUnchangedDiffLines();
      let no = 0;
      body = ops.map((op) => {
        if (op.type === 'same') {
          no += 1;
          if (hideSameLines) return '';
          return '<div class="duo-row duo-row--solo"><div class="duo-cell" data-side-label="' + sideLabel + '"><span class="ln">' + no + '</span><span class="lt">' + escHtml((isSrc ? op.left : op.right) || '') + '</span></div></div>';
        }
        if (op.type === 'replace') {
          no += 1;
          const cd = useCharDiff ? buildCharDiff(op.left, op.right) : null;
          const marked = cd ? (isSrc ? cd.left : cd.right) : escHtml((isSrc ? op.left : op.right) || '');
          return '<div class="duo-row duo-row--solo"><div class="duo-cell ' + tone + '" data-side-label="' + sideLabel + '"><span class="ln">' + no + '</span><span class="lt">' + marked + '</span></div></div>';
        }
        if (op.type === 'del') {
          if (!isSrc) return '';
          no += 1;
          return '<div class="duo-row duo-row--solo"><div class="duo-cell del" data-side-label="' + sideLabel + '"><span class="ln">' + no + '</span><span class="lt">' + escHtml(op.left || '') + '</span></div></div>';
        }
        if (isSrc) return '';
        no += 1;
        return '<div class="duo-row duo-row--solo"><div class="duo-cell add" data-side-label="' + sideLabel + '"><span class="ln">' + no + '</span><span class="lt">' + escHtml(op.right || '') + '</span></div></div>';
      }).join('');
      if (!body) body = '<div class="duo-empty">' + escHtml(issueSideLabel(side) + '側に表示できる変更行はありません') + '</div>';
    }
    return '<div class="duo-wrap">'
      + '<div class="duo-head duo-head--solo">' + renderDuoLaneHeader(side, issueSideLabel(side) + 'から見た内容') + '</div>'
      + '<div class="duo scroll">' + body + '</div>'
      + '</div>';
  }

  // 片側視点でのシンプル値表示（同一・追加・削除・インライン変更）
  function renderValueAreaOneSide(row, useCharDiff, side) {
    const isSrc = side === 'source';
    const sideName = issueSideLabel(side);
    const ownText = safeText(isSrc ? row.left : row.right);
    if (row.type === 'same') {
      if (isInlineText(ownText)) {
        return '<div class="val-inline"><span class="vi-val vi-val--same" data-side-label="' + escHtml(sideName) + '">' + escHtml(ownText) + '</span></div>';
      }
      return '<div class="val-single val-single--same"><div class="scroll"><pre class="blk">' + escHtml(ownText) + '</pre></div></div>';
    }
    if (row.type === 'added' || row.type === 'removed') {
      const isAdd = row.type === 'added';
      const existsHere = isAdd ? !isSrc : isSrc;
      if (!existsHere) {
        const reason = isAdd ? '比較先で追加された設定' : '比較元にのみ存在する設定';
        return '<div class="val-inline"><span class="vi-val vi-val--absent">' + escHtml(sideName + 'には存在しません（' + reason + '）') + '</span></div>';
      }
      const text = safeText(isAdd ? row.right : row.left);
      const cls = isAdd ? 'add' : 'del';
      if (isInlineText(text)) {
        return '<div class="val-inline val-inline--lanes">' + renderInlineLane(side, cls, escHtml(text)) + '</div>';
      }
      return '<div class="val-single val-single--' + cls + '">'
        + '<div class="val-single-head">' + escHtml(sideName + (isAdd ? '（追加された設定）' : '（削除された設定）')) + '</div>'
        + '<div class="scroll"><pre class="blk">' + escHtml(text) + '</pre></div>'
        + '</div>';
    }
    const leftText = safeText(row.left);
    const rightText = safeText(row.right);
    if (isInlineText(leftText) && isInlineText(rightText)) {
      const cd = useCharDiff ? buildCharDiff(leftText, rightText) : null;
      const marked = cd ? (isSrc ? cd.left : cd.right) : escHtml(ownText);
      return '<div class="val-inline val-inline--lanes">'
        + renderInlineLane(side, isSrc ? 'del' : 'add', marked)
        + '</div>';
    }
    return renderChangedSolo(row, useCharDiff, side);
  }

  function renderValueArea(row, useCharDiff) {
    const viewSide = activeViewSide();
    if (viewSide) return renderValueAreaOneSide(row, useCharDiff, viewSide);
    const leftText = safeText(row.left);
    const rightText = safeText(row.right);
    if (row.type === 'same') {
      if (isInlineText(leftText)) {
        return '<div class="val-inline"><span class="vi-val vi-val--same">' + escHtml(leftText) + '</span></div>';
      }
      return '<div class="val-single val-single--same"><div class="scroll"><pre class="blk">' + escHtml(leftText) + '</pre></div></div>';
    }
    if (row.type === 'added' || row.type === 'removed') {
      const isAdd = row.type === 'added';
      const text = isAdd ? rightText : leftText;
      const cls = isAdd ? 'add' : 'del';
      if (isInlineText(text)) {
        return '<div class="val-inline val-inline--lanes">' + renderInlineLane(isAdd ? 'target' : 'source', cls, escHtml(text)) + '</div>';
      }
      return '<div class="val-single val-single--' + cls + '">'
        + '<div class="val-single-head">' + (isAdd ? '比較先（追加された設定）' : '比較元（削除された設定）') + '</div>'
        + '<div class="scroll"><pre class="blk">' + escHtml(text) + '</pre></div>'
        + '</div>';
    }
    if (isInlineText(leftText) && isInlineText(rightText)) {
      const cd = useCharDiff ? buildCharDiff(leftText, rightText) : null;
      return '<div class="val-inline val-inline--lanes">'
        + renderInlineLane('source', 'del', cd ? cd.left : escHtml(leftText))
        + '<span class="vi-arrow" aria-hidden="true">→</span>'
        + renderInlineLane('target', 'add', cd ? cd.right : escHtml(rightText))
        + '</div>';
    }
    return renderChangedDuo(row, useCharDiff);
  }

  function wrapLongValueHtml(row, valueHtml) {
    const texts = [safeText(row && row.left), safeText(row && row.right)];
    const maxChars = Math.max(...texts.map((text) => text.length));
    const maxLines = Math.max(...texts.map((text) => text.split('\\n').length));
    if (maxChars <= LONG_VALUE_COLLAPSE_CHARS && maxLines <= LONG_VALUE_COLLAPSE_LINES) return valueHtml;
    return '<details class="long-value">'
      + '<summary><span>長い設定値を表示</span><small>' + maxChars.toLocaleString('ja-JP') + '文字 / ' + maxLines + '行</small></summary>'
      + '<div class="long-value-body">' + valueHtml + '</div>'
      + '</details>';
  }

  function renderRowMeta(row) {
    const tags = [];
    if (row.reasonSummary) tags.push('<span class="meta-tag reason">' + escHtml(row.reasonSummary) + '</span>');
    if (row.renameCandidate) {
      const renameTip = '名称変更候補: ' + String(row.renameCandidate.fromCode || '-') + ' → ' + String(row.renameCandidate.toCode || '-')
        + (row.renameCandidate.matchedBy ? ' / 判定: ' + String(row.renameCandidate.matchedBy) : '');
      tags.push('<span class="meta-tag rename" title="' + escHtml(renameTip) + '">名称変更候補</span>');
    }
    if (!tags.length) return '';
    return '<div class="meta-wrap">' +
      (tags.length ? '<div class="meta-tags">' + tags.join('') + '</div>' : '') +
      '</div>';
  }

  // ---- 「JSONで比較」: フィールド単位に区切った WinMerge 風の左右比較 ----

  function stripInternalFieldKeys(def) {
    if (!def || typeof def !== 'object' || Array.isArray(def)) return def;
    const out = {};
    Object.keys(def).forEach((k) => {
      if (k === '__parentTableCode' || k === '__parentTableLabel') return;
      out[k] = def[k];
    });
    return out;
  }

  function buildFieldJsonGroups(rows) {
    const map = new Map();
    const passthrough = [];
    (rows || []).forEach((row) => {
      const info = extractFieldPathInfo(row.path);
      if (!info || !info.rootCode) {
        passthrough.push(row);
        return;
      }
      if (!map.has(info.rootCode)) map.set(info.rootCode, []);
      map.get(info.rootCode).push(row);
    });
    const groups = [];
    map.forEach((bucket, code) => {
      let src = stripInternalFieldKeys(FIELD_PROPS_SRC[code] || null);
      let tgt = stripInternalFieldKeys(FIELD_PROPS_TGT[code] || null);
      if (!src && !tgt) {
        const rootRow = bucket.find((row) => {
          const info = extractFieldPathInfo(row.path);
          return !!info && (info.isFieldRoot || info.isSubFieldRoot);
        }) || bucket[0];
        src = rootRow.left && typeof rootRow.left === 'object' ? rootRow.left : null;
        tgt = rootRow.right && typeof rootRow.right === 'object' ? rootRow.right : null;
      }
      const status = src && tgt ? 'changed' : (tgt ? 'added' : 'removed');
      const ref = tgt || src || ({});
      groups.push({
        code,
        rows: bucket,
        src,
        tgt,
        status,
        label: String(ref.label || ref.name || code),
        type: String(ref.type || '-'),
        reviewRow: {
          _id: 'field-json:' + code,
          sectionKey: FIELD_SECTION_KEY,
          section: SECTION_LABEL_MAP[FIELD_SECTION_KEY] || 'フィールド設定',
          path: FIELD_SECTION_KEY + '.properties.' + code,
          type: status,
          _displayOnly: !bucket.some((row) => isActionableReviewRow(row)),
          __childRows: bucket
        }
      });
    });
    return { groups, passthrough };
  }

  function renderFieldJsonBlockHtml(group, useCharDiff) {
    const toneCls = group.status === 'added' ? 'added' : group.status === 'removed' ? 'removed' : 'changed';
    const checked = selectedFieldCodes.has(group.code);
    const selectable = CAN_BUILD_REFLECT_JSON && (group.rows || []).some((row) => row && row.type !== 'same' && !row._displayOnly && !row._nonActionable);
    const reviewRow = group.reviewRow;
    const reviewKey = rowStateKey(reviewRow);
    const reviewable = isActionableReviewRow(reviewRow);
    const reviewed = isReviewRowComplete(reviewRow);
    const fieldItemLabel = String(group.label || group.code || 'フィールド');
    rowLookup.set(reviewKey, reviewRow);
    let body;
    if (group.src && group.tgt) {
      body = renderChangedDuo({ left: group.src, right: group.tgt, type: 'changed' }, useCharDiff);
    } else {
      const isAdd = !!group.tgt;
      const viewSide = activeViewSide();
      if (viewSide && ((viewSide === 'source' && !group.src) || (viewSide === 'target' && !group.tgt))) {
        body = '<div class="val-inline"><span class="vi-val vi-val--absent">' + escHtml(issueSideLabel(viewSide) + 'にはこのフィールドは存在しません（' + (isAdd ? '比較先のみに存在' : '比較元のみに存在') + '）') + '</span></div>';
      } else {
        body = '<div class="val-single val-single--' + (isAdd ? 'add' : 'del') + '">'
          + '<div class="val-single-head">' + (isAdd ? '比較先のみに存在するフィールド' : '比較元のみに存在するフィールド') + '</div>'
          + '<div class="scroll"><pre class="blk">' + escHtml(safeText(group.tgt || group.src)) + '</pre></div>'
          + '</div>';
      }
    }
    return '<article class="fj-block fj-block--' + toneCls + (reviewed ? ' drow--reviewed' : '') + '" tabindex="-1" data-diff-row-key="' + escHtml(reviewKey) + '" aria-current="false">'
      + '<div class="fj-head">'
      +   renderRowFacts(reviewRow)
      +   '<span class="fj-title">' + escHtml(group.label) + '</span>'
      +   '<code class="fj-code">' + escHtml(group.code) + '</code>'
      +   '<span class="fj-type">' + escHtml(fieldTypeDisplayLabel(group.type)) + '</span>'
      +   '<span class="fj-spacer"></span>'
      +   (selectable
        ? '<label class="row-select' + (checked ? ' is-on' : '') + '" title="このフィールドを反映JSONの対象にする">'
          + '<input type="checkbox" data-select-field="' + escHtml(group.code) + '" aria-label="' + escHtml(fieldItemLabel + 'を反映JSONの対象に選択') + '"' + (checked ? ' checked' : '') + '> 選択</label>'
        : '<span class="muted" title="' + escHtml(CAN_BUILD_REFLECT_JSON ? '表示専用または同一のため反映対象にできません' : REFLECT_JSON_BLOCK_REASON) + '">'
          + (CAN_BUILD_REFLECT_JSON ? '反映対象外' : '反映利用不可') + '</span>')
      + (reviewable
        ? (!reviewed ? '<button type="button" class="row-review-next" data-review-next="' + escHtml(reviewKey) + '" aria-label="' + escHtml(fieldItemLabel + 'を確認済みにして次へ') + '">確認して次へ</button>' : '')
          + '<label class="row-reviewed' + (reviewed ? ' is-on' : '') + '"><input type="checkbox" data-review-toggle="' + escHtml(reviewKey) + '" aria-label="' + escHtml(fieldItemLabel + 'を確認済みにする') + '"' + (reviewed ? ' checked' : '') + '> 確認済み</label>'
        : '<span class="row-display-only">表示専用</span>')
      + '</div>'
      + '<div class="fj-body">' + body + '</div>'
      + '</article>';
  }

  // ---- 選択差分 → 反映用APIパラメータJSON ----
  // 比較元(source)の設定値を比較先(target)アプリへ反映する方向で組み立てる。
  // form/fields はフィールド単位の部分更新ができるため PUT/POST/DELETE に分解し、
  // それ以外の「全体置き換え型」APIは比較元セクション全体をそのままpayloadにする。

  const INCOMPLETE_COMPARISON_WARNINGS = Array.isArray(REPORT_META.comparisonWarnings)
    ? REPORT_META.comparisonWarnings.map((item) => String(item || '')).filter(Boolean)
    : [];

  function withReflectRequestSafety(request, safety) {
    const opts = safety || ({});
    const warnings = [
      ...INCOMPLETE_COMPARISON_WARNINGS,
      ...(Array.isArray(opts.warnings) ? opts.warnings : [])
    ].filter(Boolean);
    return Object.assign(request, {
      replacesEntireSection: !!opts.replacesEntireSection,
      destructive: !!opts.destructive,
      incompleteComparison: !!REPORT_META.incompleteComparison,
      warnings: warnings
    });
  }

  function wholeSectionReplaceWarning(label, selectedCount) {
    return String(label || 'このセクション') + 'は全体置き換えAPIです。選択した '
      + String(selectedCount || 0) + ' 行だけでなく、選択していない設定も比較元セクション全体の内容で上書きされます。';
  }

  const SECTION_REFLECT_APIS = {
    layoutSettings: { method: 'PUT', api: TARGET_PREVIEW_API_PREFIX + '/app/form/layout.json', build: (sec) => ({ layout: (sec && sec.layout) || sec || [] }) },
    viewSettings: { method: 'PUT', api: TARGET_PREVIEW_API_PREFIX + '/app/views.json', build: (sec) => ({ views: (sec && sec.views) || sec || ({}) }), note: 'このAPIはビュー全体を置き換えます。payloadに含まれないビューは削除されます' },
    reportSettings: { method: 'PUT', api: TARGET_PREVIEW_API_PREFIX + '/app/reports.json', build: (sec) => ({ reports: (sec && sec.reports) || sec || ({}) }), note: 'このAPIはグラフ全体を置き換えます' },
    processSettings: { method: 'PUT', api: TARGET_PREVIEW_API_PREFIX + '/app/status.json', build: (sec) => {
      const p = {};
      if (sec && sec.enable !== undefined) p.enable = sec.enable;
      if (sec && sec.states !== undefined) p.states = sec.states;
      if (sec && sec.actions !== undefined) p.actions = sec.actions;
      return p;
    } },
    actionSettings: { method: 'PUT', api: TARGET_PREVIEW_API_PREFIX + '/app/actions.json', build: (sec) => ({ actions: (sec && sec.actions) || sec || ({}) }) },
    appAcl: { method: 'PUT', api: TARGET_PREVIEW_API_PREFIX + '/app/acl.json', build: (sec) => ({ rights: (sec && sec.rights) || sec || [] }) },
    fieldAcl: { method: 'PUT', api: TARGET_PREVIEW_API_PREFIX + '/field/acl.json', build: (sec) => ({ rights: (sec && sec.rights) || sec || [] }) },
    recordPermissions: { method: 'PUT', api: TARGET_PREVIEW_API_PREFIX + '/record/acl.json', build: (sec) => ({ rights: (sec && sec.rights) || sec || [] }) },
    notifications: { method: 'PUT', api: TARGET_PREVIEW_API_PREFIX + '/app/notifications/general.json', build: (sec) => {
      const p = { notifications: (sec && sec.notifications) || sec || [] };
      if (sec && sec.notifyToCommenter !== undefined) p.notifyToCommenter = sec.notifyToCommenter;
      return p;
    } },
    perRecordNotifications: { method: 'PUT', api: TARGET_PREVIEW_API_PREFIX + '/app/notifications/perRecord.json', build: (sec) => ({ notifications: (sec && sec.notifications) || sec || [] }) },
    reminderNotifications: { method: 'PUT', api: TARGET_PREVIEW_API_PREFIX + '/app/notifications/reminder.json', build: (sec) => {
      const p = { notifications: (sec && sec.notifications) || sec || [] };
      if (sec && sec.timezone) p.timezone = sec.timezone;
      return p;
    } },
    customizeSettings: { method: 'PUT', api: TARGET_PREVIEW_API_PREFIX + '/app/customize.json', build: (sec) => {
      const p = {};
      if (sec && sec.scope) p.scope = sec.scope;
      if (sec && sec.desktop !== undefined) p.desktop = sec.desktop;
      if (sec && sec.mobile !== undefined) p.mobile = sec.mobile;
      return p;
    }, note: 'FILE指定のJS/CSSは比較先環境で fileKey を再アップロードする必要があります' }
  };

  function buildAppSettingsReflectPayload(rows, sec) {
    const payload = {};
    (rows || []).forEach((row) => {
      const rel = relativePathFromRow(row.path, 'appSettings');
      const tokens = tokenizePath(rel == null ? '' : rel);
      const key = typeof tokens[0] === 'string' ? tokens[0] : '';
      if (key && sec && sec[key] !== undefined) payload[key] = sec[key];
    });
    return payload;
  }

  function buildFieldReflectRequests(fieldRows, app, requests) {
    const FIELD_REFLECT_BATCH_LIMIT = 100;
    const codes = new Set();
    (fieldRows || []).forEach((row) => {
      const info = extractFieldPathInfo(row.path);
      if (info && info.rootCode) codes.add(info.rootCode);
    });
    selectedFieldCodes.forEach((code) => {
      if (!fieldCodeHasActualDiff(code)) return;
      // フィールド単位ビューで選んだテーブル内フィールドは親テーブルのコードへ丸める
      const def = FLAT_FIELD_PROPS_SRC[code] || FLAT_FIELD_PROPS_TGT[code];
      codes.add(def && def.__parentTableCode ? def.__parentTableCode : code);
    });
    if (!codes.size) return;
    const updateProps = {};
    const addProps = {};
    const deleteCodes = [];
    codes.forEach((code) => {
      const src = FIELD_PROPS_SRC[code];
      const tgt = FIELD_PROPS_TGT[code];
      if (src && tgt) updateProps[code] = src;
      else if (src) addProps[code] = src;
      else if (tgt) deleteCodes.push(code);
    });
    const label = SECTION_LABEL_MAP[FIELD_SECTION_KEY] || 'フィールド設定';
    const pushPropertyBatches = (properties, method, actionLabel) => {
      const entries = Object.entries(properties || {});
      const totalBatches = Math.ceil(entries.length / FIELD_REFLECT_BATCH_LIMIT);
      for (let offset = 0; offset < entries.length; offset += FIELD_REFLECT_BATCH_LIMIT) {
        const batchEntries = entries.slice(offset, offset + FIELD_REFLECT_BATCH_LIMIT);
        const batchIndex = Math.floor(offset / FIELD_REFLECT_BATCH_LIMIT) + 1;
        requests.push(withReflectRequestSafety(
          {
            section: FIELD_SECTION_KEY,
            sectionLabel: label + '（' + actionLabel + (totalBatches > 1 ? ' ' + batchIndex + '/' + totalBatches : '') + '）',
            method: method,
            api: TARGET_PREVIEW_API_PREFIX + '/app/form/fields.json',
            payload: { app: app, properties: Object.fromEntries(batchEntries) },
            batch: { index: batchIndex, total: totalBatches, limit: FIELD_REFLECT_BATCH_LIMIT }
          },
          { replacesEntireSection: false, destructive: false }
        ));
      }
    };
    pushPropertyBatches(updateProps, 'PUT', '更新');
    pushPropertyBatches(addProps, 'POST', '追加');
    if (deleteCodes.length) {
      const totalBatches = Math.ceil(deleteCodes.length / FIELD_REFLECT_BATCH_LIMIT);
      for (let offset = 0; offset < deleteCodes.length; offset += FIELD_REFLECT_BATCH_LIMIT) {
        const batchIndex = Math.floor(offset / FIELD_REFLECT_BATCH_LIMIT) + 1;
        requests.push(withReflectRequestSafety({
          section: FIELD_SECTION_KEY,
          sectionLabel: label + '（削除候補・手動確認' + (totalBatches > 1 ? ' ' + batchIndex + '/' + totalBatches : '') + '）',
          method: null,
          api: null,
          candidateApi: TARGET_PREVIEW_API_PREFIX + '/app/form/fields.json',
          candidateMethod: 'DELETE',
          payload: { app: app, fields: deleteCodes.slice(offset, offset + FIELD_REFLECT_BATCH_LIMIT) },
          batch: { index: batchIndex, total: totalBatches, limit: FIELD_REFLECT_BATCH_LIMIT },
          requiresExplicitDeleteOptIn: true,
          note: '比較先のみに存在するフィールドです。自動DELETEリクエストは生成していません'
        }, {
          replacesEntireSection: false,
          destructive: true,
          warnings: [
            '比較先のみに存在するフィールドの自動削除は安全のため無効です。内容を確認し、必要な場合だけ管理画面等で手動削除してください。',
            'フィールドを削除すると、そのフィールドに保存されているレコードデータも失われる可能性があります。'
          ]
        }));
      }
    }
  }

  function buildPluginReflectRequests(secRows, srcSec, app, label, selectedPaths, requests) {
    const sourcePlugins = Array.isArray(srcSec && srcSec.plugins)
      ? srcSec.plugins
      : (Array.isArray(srcSec) ? srcSec : []);
    const ids = new Set();
    const manualPaths = [];
    (secRows || []).forEach((row) => {
      if (!row || row.type !== 'removed') {
        manualPaths.push(row && row.path ? row.path : 'pluginSettings');
        return;
      }
      if (String(row.path || '') === 'pluginSettings') {
        sourcePlugins.forEach((plugin) => {
          if (plugin && plugin.id) ids.add(String(plugin.id));
        });
        return;
      }
      const sourcePluginId = row.left && typeof row.left === 'object' && row.left.id
        ? row.left.id
        : (row.arrayKey === 'id' && row.arrayKeyValue != null ? row.arrayKeyValue : '');
      if (sourcePluginId && typeof sourcePluginId !== 'object') ids.add(String(sourcePluginId));
      else manualPaths.push(row.path || 'pluginSettings');
    });
    if (ids.size) {
      requests.push(withReflectRequestSafety(
        {
          section: 'pluginSettings',
          sectionLabel: label + '（比較元のみを追加）',
          method: 'POST',
          api: TARGET_PREVIEW_API_PREFIX + '/app/plugins.json',
          payload: { app: app, ids: [...ids] },
          selectedPaths: selectedPaths
        },
        {
          replacesEntireSection: false,
          destructive: false,
          warnings: ['選択した比較元のみのプラグインだけを追加します。設定値は各プラグイン画面で手動反映してください。']
        }
      ));
    }
    if (manualPaths.length) {
      requests.push(withReflectRequestSafety(
        {
          section: 'pluginSettings',
          sectionLabel: label + '（手動確認）',
          method: null,
          api: null,
          selectedPaths: manualPaths,
          note: '比較先のみのプラグイン削除やプラグイン設定値の変更は自動反映しません'
        },
        {
          replacesEntireSection: false,
          destructive: false,
          warnings: ['プラグインの削除・設定変更は影響を確認し、管理画面で手動反映してください。']
        }
      ));
    }
  }

  function fieldCodeHasActualDiff(code) {
    const expected = String(code || '');
    if (!expected) return false;
    return REPORT_ROWS.some((row) => {
      if (!row || row.sectionKey !== FIELD_SECTION_KEY || row.type === 'same' || row._displayOnly || row._nonActionable) return false;
      const info = extractFieldPathInfo(row.path);
      return !!info && (info.activeCode === expected || info.rootCode === expected);
    });
  }

  function buildReflectJson() {
    if (!CAN_BUILD_REFLECT_JSON) return null;
    if (!selectedRows.size && !selectedFieldCodes.size) return null;
    const app = String(REPORT_META.target.appId || '');
    const bySection = new Map();
    selectedRows.forEach((row) => {
      if (!row || row._displayOnly || row._nonActionable || row.type === 'same') return;
      const key = row.sectionKey || '';
      if (!bySection.has(key)) bySection.set(key, []);
      bySection.get(key).push(row);
    });
    const requests = [];
    buildFieldReflectRequests(bySection.get(FIELD_SECTION_KEY) || [], app, requests);
    bySection.forEach((secRows, secKey) => {
      if (secKey === FIELD_SECTION_KEY) return;
      const label = SECTION_LABEL_MAP[secKey] || secKey;
      const selectedPaths = secRows.map((row) => row.path || '').filter(Boolean);
      const srcSec = SOURCE_SECTIONS[secKey];
      if (secKey === 'appSettings') {
        const payload = buildAppSettingsReflectPayload(secRows, srcSec);
        requests.push(withReflectRequestSafety(
          { section: secKey, sectionLabel: label, method: 'PUT', api: TARGET_PREVIEW_API_PREFIX + '/app/settings.json', payload: Object.assign({ app: app }, payload), selectedPaths: selectedPaths },
          { replacesEntireSection: false, destructive: false }
        ));
        return;
      }
      if (secKey === 'pluginSettings') {
        buildPluginReflectRequests(secRows, srcSec, app, label, selectedPaths, requests);
        return;
      }
      const def = SECTION_REFLECT_APIS[secKey];
      if (!def) {
        requests.push(withReflectRequestSafety(
          { section: secKey, sectionLabel: label, method: null, api: null, note: 'このセクションを直接更新できる公開APIがないため、sourceValue を参考に手動で反映してください', sourceValue: srcSec === undefined ? null : srcSec, selectedPaths: selectedPaths },
          { replacesEntireSection: false, destructive: false, warnings: ['公開APIで自動反映できないため、手動確認が必要です。'] }
        ));
        return;
      }
      const replacesEntireSection = def.replacesEntireSection !== false;
      const requestWarnings = [];
      if (replacesEntireSection) requestWarnings.push(wholeSectionReplaceWarning(label, secRows.length));
      if (def.note) requestWarnings.push(def.note);
      const req = withReflectRequestSafety(
        { section: secKey, sectionLabel: label, method: def.method, api: def.api, payload: Object.assign({ app: app }, def.build(srcSec)), selectedPaths: selectedPaths },
        {
          replacesEntireSection: replacesEntireSection,
          destructive: replacesEntireSection || !!def.destructive,
          warnings: requestWarnings
        }
      );
      if (def.note) req.note = def.note;
      requests.push(req);
    });
    if (!requests.length) return null;
    return {
      generatedAt: new Date().toISOString(),
      description: '選択した差分を比較先アプリへ反映するためのAPIパラメータ（比較元の設定値を使用）',
      source: { appId: REPORT_META.source.appId || '', appName: REPORT_META.source.appName || '' },
      target: { appId: REPORT_META.target.appId || '', appName: REPORT_META.target.appName || '', guestId: REPORT_META.target.guestId || '' },
      incompleteComparison: !!REPORT_META.incompleteComparison,
      warnings: [...INCOMPLETE_COMPARISON_WARNINGS],
      comparisonContext: {
        fetchIssues: REPORT_META.fetchIssues || [],
        partialIssues: REPORT_META.partialIssues || [],
        truncation: REPORT_META.truncation || null,
        rowSelection: REPORT_META.rowSelection || null
      },
      deployNote: 'preview系APIで反映した後、' + TARGET_PREVIEW_API_PREFIX + '/app/deploy.json で運用環境へ反映してください',
      requests: requests
    };
  }

  function exportReflectJson(copyOnly) {
    if (!CAN_BUILD_REFLECT_JSON) {
      showToast(REFLECT_JSON_BLOCK_REASON);
      return;
    }
    const payload = buildReflectJson();
    if (!payload) {
      showToast('反映する差分が選択されていません（行やフィールドの「選択」にチェックしてください）');
      return;
    }
    const text = JSON.stringify(payload, null, 2);
    if (copyOnly) {
      copyTextToClipboard(text, '反映用JSONをコピーしました（' + payload.requests.length + 'リクエスト）');
      return;
    }
    const stamp = String(REPORT_META.generatedAt || '').replace(/[-:TZ.]/g, '').slice(0, 14) || 'report';
    downloadTextFile('反映用パラメータ_' + stamp + '.json', text, 'application/json');
    showToast('反映用JSONを保存しました（' + payload.requests.length + 'リクエスト）');
  }

  // ---- 作成時に利用した比較元/比較先の設定JSON出力 ----

  function exportComparedBundleJson(side) {
    if (!HAS_COMPARED_CONTENT) {
      showToast('差分行のみのレポートには設定本文が収録されていません');
      return;
    }
    const isSource = side === 'source';
    const meta = isSource ? REPORT_META.source : REPORT_META.target;
    const payload = {
      generatedAt: REPORT_META.generatedAt,
      purpose: 'comparisonEvidence',
      evidenceOnly: true,
      evidenceNote: 'このJSONは比較時に利用した取得済み設定の証跡です。反映用APIパラメータではありません。',
      side: side,
      sideLabel: isSource ? '比較元' : '比較先',
      appId: meta.appId || '',
      appName: meta.appName || '',
      scopes: REPORT_META.scopes || [],
      ignoreKeys: REPORT_META.ignoreKeys || '',
      normalizationLabels: REPORT_META.normalizationLabels || [],
      incompleteComparison: !!REPORT_META.incompleteComparison,
      warnings: [...INCOMPLETE_COMPARISON_WARNINGS],
      comparisonContext: {
        fetchIssues: REPORT_META.fetchIssues || [],
        partialIssues: REPORT_META.partialIssues || [],
        truncation: REPORT_META.truncation || null,
        rowSelection: REPORT_META.rowSelection || null
      },
      sections: isSource ? SOURCE_SECTIONS : TARGET_SECTIONS
    };
    const stamp = String(REPORT_META.generatedAt || '').replace(/[-:TZ.]/g, '').slice(0, 14) || 'report';
    downloadTextFile((isSource ? '比較元設定_' : '比較先設定_') + (meta.appId || '-') + '_' + stamp + '.json', JSON.stringify(payload, null, 2), 'application/json');
    showToast((isSource ? '比較元' : '比較先') + 'の設定JSONを保存しました');
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
      const diffKidCount = bucket.filter((row) => row.type !== 'same').length;
      const reasonSummary = diffKidCount
        ? 'フィールド内の設定差分 ' + diffKidCount + '件'
        : 'フィールド単位に集約（設定差分 ' + bucket.length + '件）';
      collapsed.push({
        ...rootRow,
        // ルート行自体は同一でも、配下プロパティに差分があればこの集約行は「変更」として扱う
        type: diffKidCount && rootRow.type === 'same' ? 'changed' : rootRow.type,
        path: rootPath,
        left: rootRow.left,
        right: rootRow.right,
        reasonSummary,
        __childRows: bucket,
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
      else if (row.moved || row.type === 'moved') out.moved += 1;
      else out.changed += 1;
    });
    return out;
  }

  function groupSummaryLabel(rows) {
    const s = summarizeGroupRows(rows);
    const parts = ['差分 ' + s.diffCount];
    if (s.added) parts.push('比較先のみ ' + s.added);
    if (s.removed) parts.push('比較元のみ ' + s.removed);
    if (s.changed) parts.push('内容差 ' + s.changed);
    if (s.moved) parts.push('並び順差 ' + s.moved);
    if (s.same) parts.push('同じ ' + s.same);
    return parts.join(' / ');
  }

  function reportRowTitle(row) {
    const fullPath = String(row?.path || '-');
    const relPath = relativePathLabel(row);
    if (row?.sectionKey === FIELD_SECTION_KEY) {
      const info = extractFieldPathInfo(fullPath);
      if (info) {
        const code = info.activeCode || '';
        const field = getFieldRowPayload(row) || getFieldDefinition(code, 'source') || getFieldDefinition(code, 'target') || ({});
        const fieldLabel = String(field.label || field.name || code || 'フィールド');
        const propTitle = fieldChangePropTitle(info, row);
        return fieldLabel + (propTitle ? ' · ' + propTitle : '');
      }
    }
    if (row?._reportDisplayTitle) return String(row._reportDisplayTitle);
    if (row?.entityLabel || row?.entityKind) {
      const sectionLabel = SECTION_LABEL_MAP[row?.sectionKey || ''] || row?.section || '';
      const kindLabel = ENTITY_KIND_LABEL_MAP[row?.entityKind || ''] || '';
      const parts = [];
      if (sectionLabel) parts.push(sectionLabel);
      if (row?.entityLabel) parts.push((kindLabel ? kindLabel + '「' + row.entityLabel + '」' : row.entityLabel));
      if (row?.entityPropLabel) parts.push(row.entityPropLabel);
      if (parts.length) return parts.join(' / ');
    }
    return relPath || fullPath;
  }

  function renderPathCell(row) {
    const fullPath = String(row?.path || '-');
    const pathMain = reportRowTitle(row);
    let html = '<div class="path-main">' + escHtml(pathMain) + '</div>';
    const technicalRows = [];
    if (row?.sectionKey === FIELD_SECTION_KEY) {
      const info = extractFieldPathInfo(fullPath);
      const code = info?.activeCode || '';
      if (code) technicalRows.push(['フィールドコード', code]);
    }
    if (row?.entityCode) technicalRows.push(['識別コード', String(row.entityCode)]);
    if (fullPath && fullPath !== '-') technicalRows.push(['設定パス', fullPath]);
    if (technicalRows.length) {
      html += '<details class="path-tech"><summary>技術情報</summary><div class="path-tech-body">'
        + technicalRows.map((item) => '<div><span>' + escHtml(item[0]) + '</span><code>' + escHtml(item[1]) + '</code></div>').join('')
        + '</div></details>';
    }
    const relatedRefs = Array.isArray(row?.impactRefs) ? row.impactRefs.filter(Boolean) : [];
    const relatedCount = Math.max(Number(row?.impactCount || 0), relatedRefs.length);
    if (relatedCount) {
      html += '<details class="related-settings"><summary>関連している設定 ' + relatedCount + '件</summary>'
        + (relatedRefs.length
          ? '<ul>' + relatedRefs.map((ref) => {
              const label = ref.label || ref.kind || ref.section || ref.sectionKey || '関連設定';
              const path = ref.path ? ' / ' + ref.path : '';
              return '<li><span>' + escHtml(label) + '</span><code>' + escHtml(path) + '</code></li>';
            }).join('') + '</ul>'
          : '<p>関連件数のみ検出されています。</p>')
        + '</details>';
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

  function jsonEq(a, b) {
    if (a === b) return true;
    try { return JSON.stringify(a) === JSON.stringify(b); } catch (e) { return false; }
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

  // counterpart（比較相手側の fields マップ）を渡すと、相手側に無い行・値が異なる行へ差分色を付ける。
  function renderSubtableFieldsTableHtml(fields, counterpart, side) {
    if (!fields || typeof fields !== 'object') {
      return '<div class="sl-empty">（なし）</div>';
    }
    const entries = Object.values(fields);
    if (!entries.length) return '<div class="sl-empty">（項目なし）</div>';
    const cp = (counterpart && typeof counterpart === 'object' && !Array.isArray(counterpart)) ? counterpart : null;
    const cpByCode = {};
    if (cp) {
      Object.entries(cp).forEach(([key, child]) => {
        const code = String((child && child.code) || key);
        cpByCode[code] = child;
      });
    }
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
      let trCls = '';
      if (cp) {
        const other = cpByCode[code];
        if (!other) trCls = side === 'tgt' ? ' class="kv-add"' : ' class="kv-del"';
        else if (!jsonEq(child, other)) trCls = ' class="kv-chg"';
      }
      return '<tr' + trCls + '>' +
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

  // ---- 関連レコード一覧設定 / ルックアップ設定の日本語表示ヘルパー ----

  function valueScalarText(v) {
    if (v === undefined || v === null || v === '') return '（なし）';
    return String(v);
  }

  function refConditionText(v) {
    if (!v || typeof v !== 'object') return valueScalarText(v);
    return '自アプリ「' + valueScalarText(v.field) + '」 ＝ 参照アプリ「' + valueScalarText(v.relatedField) + '」';
  }

  function refRelatedAppText(v) {
    if (!v || typeof v !== 'object') return valueScalarText(v);
    const parts = ['アプリID: ' + valueScalarText(v.app)];
    if (v.code) parts.push('アプリコード: ' + v.code);
    return parts.join(' / ');
  }

  function sortLabelText(v) {
    const s = String(v == null ? '' : v);
    if (!s) return '（なし）';
    return s.replace(/\\basc\\b/g, '（昇順）').replace(/\\bdesc\\b/g, '（降順）');
  }

  function listLabelText(v) {
    if (Array.isArray(v)) return v.length ? v.join(' / ') : '（なし）';
    return valueScalarText(v);
  }

  function fieldMappingsText(v) {
    if (!Array.isArray(v) || !v.length) return '（なし）';
    return v.map((m, i) => String(i + 1) + '. コピー先「' + valueScalarText(m && m.field) + '」 ← コピー元「' + valueScalarText(m && m.relatedField) + '」').join('\\n');
  }

  function settingValueText(key, value) {
    if (value === undefined) return '';
    if (key === 'condition') return refConditionText(value);
    if (key === 'relatedApp') return refRelatedAppText(value);
    if (key === 'sort') return sortLabelText(value);
    if (key === 'displayFields' || key === 'lookupPickerFields') return listLabelText(value);
    if (key === 'fieldMappings') return fieldMappingsText(value);
    if (value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      return valueScalarText(value);
    }
    let j;
    try { j = JSON.stringify(value); } catch (e) { j = String(value); }
    return localizeJsonEnums(j);
  }

  function textToCellHtml(text) {
    return escHtml(text).replace(/\\n/g, '<br>');
  }

  // 変更されたセルの文字単位ハイライト。複数行はセル全体の色のみで表現する。
  function charMarkedCellHtml(thisText, otherText, side) {
    if (thisText.indexOf('\\n') >= 0 || otherText.indexOf('\\n') >= 0) return textToCellHtml(thisText);
    const cd = side === 'tgt' ? buildCharDiff(otherText, thisText) : buildCharDiff(thisText, otherText);
    if (!cd) return textToCellHtml(thisText);
    return side === 'tgt' ? cd.right : cd.left;
  }

  const REFERENCE_TABLE_KEY_ORDER = ['relatedApp', 'condition', 'displayFields', 'filterCond', 'size', 'sort'];
  const LOOKUP_KEY_ORDER = ['relatedApp', 'relatedKeyField', 'fieldMappings', 'lookupPickerFields', 'filterCond', 'sort'];

  // referenceTable / lookup の設定オブジェクトを日本語ラベル付きキー値表で描画する。
  // counterpart（比較相手側の同設定）を渡すと、異なる行へ差分色と文字単位ハイライトを付ける。
  function renderSettingKvTable(kind, value, counterpart, side) {
    const orderedKeys = kind === 'referenceTable' ? REFERENCE_TABLE_KEY_ORDER : LOOKUP_KEY_ORDER;
    const cp = (counterpart && typeof counterpart === 'object' && !Array.isArray(counterpart)) ? counterpart : null;
    const keys = [];
    orderedKeys.forEach((k) => {
      if ((value && k in value) || (cp && k in cp)) keys.push(k);
    });
    Object.keys(value || ({})).forEach((k) => { if (keys.indexOf(k) < 0) keys.push(k); });
    if (cp) Object.keys(cp).forEach((k) => { if (keys.indexOf(k) < 0) keys.push(k); });
    const rows = keys.map((k) => {
      const hasHere = !!value && (k in value);
      const hasThere = !!cp && (k in cp);
      const thisText = hasHere ? settingValueText(k, value[k]) : '';
      const otherText = hasThere ? settingValueText(k, cp[k]) : '';
      let trCls = '';
      let cellHtml;
      if (!cp) {
        cellHtml = textToCellHtml(thisText);
      } else if (!hasHere) {
        trCls = ' class="kv-ghost"';
        cellHtml = '<span class="sl-empty">（設定なし）</span>';
      } else if (!hasThere) {
        trCls = side === 'tgt' ? ' class="kv-add"' : ' class="kv-del"';
        cellHtml = textToCellHtml(thisText);
      } else if (thisText !== otherText) {
        trCls = side === 'tgt' ? ' class="kv-add"' : ' class="kv-del"';
        cellHtml = charMarkedCellHtml(thisText, otherText, side);
      } else {
        cellHtml = textToCellHtml(thisText);
      }
      return '<tr' + trCls + '><th title="' + escHtml(k) + '">' + escHtml(SETTING_KEY_LABELS[k] || k) + '</th><td>' + cellHtml + '</td></tr>';
    }).join('');
    return '<table class="sl-mini-table">' + rows + '</table>';
  }

  function formatFieldValueBrief(val, opts) {
    const o = (opts && typeof opts === 'object') ? opts : ({});
    const cp = (o.counterpart && typeof o.counterpart === 'object' && !Array.isArray(o.counterpart)) ? o.counterpart : null;
    const side = o.side === 'tgt' ? 'tgt' : 'src';
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
      // 関連レコード一覧設定 / ルックアップ設定: 日本語キー + 差分色付きのキー値表
      if (o.kind === 'referenceTable' || o.kind === 'lookup') {
        return renderSettingKvTable(o.kind, val, cp, side);
      }
      // SUBTABLE 全体: テーブル情報 + 内部フィールドを表形式でレンダリング
      if (val.type === 'SUBTABLE' && val.fields && typeof val.fields === 'object') {
        return renderSubtableFieldCardHtml(val);
      }
      // テーブルの fields マップ: 直接表形式でレンダリング
      if (isSubtableFieldsMap(val)) {
        return renderSubtableFieldsTableHtml(val, cp, side);
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
            cell = renderSubtableFieldsTableHtml(v, cp && isSubtableFieldsMap(cp.fields) ? cp.fields : null, side);
          } else {
            let j;
            try { j = JSON.stringify(v); } catch (e) { j = String(v); }
            cell = escHtml(localizeJsonEnums(j));
          }
          let trCls = '';
          if (cp && !jsonEq(val[k], cp[k])) {
            trCls = side === 'tgt' ? ' class="kv-add"' : ' class="kv-del"';
          }
          return '<tr' + trCls + '><th title="' + escHtml(k) + '">' + escHtml(FIELD_SETTING_LABELS[k] || SETTING_KEY_LABELS[k] || k) + '</th><td>' + cell + '</td></tr>';
        }).join('');
        let ghostRows = '';
        if (cp) {
          Object.keys(cp).forEach((k) => {
            if (keys.indexOf(k) >= 0) return;
            ghostRows += '<tr class="kv-ghost"><th title="' + escHtml(k) + '">' + escHtml(FIELD_SETTING_LABELS[k] || SETTING_KEY_LABELS[k] || k) + '</th><td><span class="sl-empty">（設定なし）</span></td></tr>';
          });
        }
        return '<table class="sl-mini-table">' + rows + ghostRows + '</table>';
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

  // 関連レコード一覧設定 / ルックアップ設定オブジェクト内のキー → 日本語ラベル
  // （kintone のフィールド設定ダイアログの項目名に揃える）
  const SETTING_KEY_LABELS = {
    condition: '表示条件（フィールドの一致）',
    displayFields: '表示するフィールド',
    filterCond: '絞り込み条件',
    relatedApp: '参照するアプリ',
    size: '一度に表示する最大件数',
    sort: 'ソート',
    relatedKeyField: 'コピー元のフィールド',
    fieldMappings: 'ほかのフィールドのコピー',
    lookupPickerFields: '選択画面に表示するフィールド',
    field: '自アプリのフィールド',
    relatedField: '参照するアプリのフィールド',
    app: '参照するアプリID',
    thumbnailSize: 'サムネイルの大きさ'
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
      return renderSubtableFieldsTableHtml(value, options.counterpart, options.side);
    }
    if (options.boolLabel) return value ? 'オン' : 'オフ';
    if (Array.isArray(value) || (value && typeof value === 'object')) {
      return formatFieldValueBrief(value, { kind: options.kind, counterpart: options.counterpart, side: options.side });
    }
    if (value === undefined || value === null || value === '') return '（なし）';
    return escHtml(String(value));
  }

  function renderFieldToggleRow(label, checked, changed) {
    return '<div class="kf-toggle' + (checked ? ' is-on' : '') + (changed ? ' kf-toggle--diff' : '') + '">' +
      '<span class="kf-toggle-box" aria-hidden="true"></span>' +
      '<span class="kf-toggle-label">' + escHtml(label) + '</span>' +
      (changed ? '<span class="kf-diff-chip">差分</span>' : '') +
    '</div>';
  }

  function renderFieldFormRow(label, value, options = {}) {
    const valueCls = 'kf-value'
      + (options.textarea ? ' kf-value--textarea' : '')
      + ((options.html || options.subtableFields) ? ' kf-value--rich' : '');
    return '<section class="kf-row' + (options.full ? ' kf-row--full' : '') + (options.diff ? ' kf-row--diff' : '') + '">' +
      '<div class="kf-label">' + escHtml(label) + (options.required ? ' <span class="kf-required">*</span>' : '') + (options.diff ? ' <span class="kf-diff-chip">差分</span>' : '') + '</div>' +
      '<div class="' + valueCls + '">' + formatFieldSettingValue(value, options) + '</div>' +
    '</section>';
  }

  function renderFieldBlock(title, innerHtml) {
    return '<div class="kf-extra">' +
      '<div class="kf-extra-title">' + escHtml(title) + '</div>' +
      innerHtml +
    '</div>';
  }

  function renderFieldUnitBlock(field, other) {
    return renderFieldBlock(
      '単位記号',
      '<div class="kf-extra-grid">' +
        renderFieldFormRow('記号', field.unit || '', { diff: !!other && !jsonEq(field.unit, other.unit) }) +
        renderFieldFormRow('位置', fieldUnitPositionDisplayLabel(field.unitPosition), { diff: !!other && !jsonEq(field.unitPosition, other.unitPosition) }) +
      '</div>'
    );
  }

  function renderFieldLimitsBlock(field, other) {
    return renderFieldBlock(
      '値の制限（整数で指定）',
      '<div class="kf-extra-grid">' +
        renderFieldFormRow('最小', field.minValue, { diff: !!other && !jsonEq(field.minValue, other.minValue) }) +
        renderFieldFormRow('最大', field.maxValue, { diff: !!other && !jsonEq(field.maxValue, other.maxValue) }) +
      '</div>'
    );
  }

  // other（比較相手側の同フィールド定義）が渡された場合、値が異なる行へ差分フラグを立てる。
  function buildFieldExtraRows(field, other, side) {
    const rows = [];
    const changedKeys = (keys) => !!other && keys.some((k) => !jsonEq(field[k], other[k]));
    const push = (label, value, options = {}, diffKeys) => {
      if (!hasMeaningfulFieldValue(value)) return;
      if (diffKeys && changedKeys(diffKeys)) options = Object.assign({}, options, { diff: true });
      rows.push({ label, value, options });
    };
    push('タイプ', fieldTypeDisplayLabel(field.type), {}, ['type']);
    push('説明', field.description, { textarea: true, maxLen: 600 }, ['description']);
    push('最小文字数', field.minLength, {}, ['minLength']);
    push('最大文字数', field.maxLength, {}, ['maxLength']);
    push('最小値', field.minValue, {}, ['minValue']);
    push('最大値', field.maxValue, {}, ['maxValue']);
    push('プロトコル', field.protocol, {}, ['protocol']);
    if (field.digit !== undefined) push('桁区切りを表示する', field.digit, { boolLabel: true }, ['digit']);
    push('小数点以下の表示桁数', field.displayScale, {}, ['displayScale']);
    push('単位記号', field.unit, {}, ['unit']);
    if (field.unitPosition) push('単位記号の位置', fieldUnitPositionDisplayLabel(field.unitPosition), {}, ['unitPosition']);
    if (field.align) push('並び', fieldAlignDisplayLabel(field.align), {}, ['align']);
    if (field.format) push('表示形式', calcFormatDisplayLabel(field.format), {}, ['format']);
    if (field.hideExpression !== undefined) push('計算式を表示しない', field.hideExpression, { boolLabel: true }, ['hideExpression']);
    if (field.options) push('項目と順番', formatFieldOptionLines(field.options), { textarea: true, maxLen: 600 }, ['options']);
    if (field.entities) push('選択候補', Array.isArray(field.entities) ? field.entities.join(' / ') : field.entities, { textarea: true, maxLen: 600 }, ['entities']);
    if (field.expression) push('計算式', field.expression, { textarea: true, maxLen: 600 }, ['expression']);
    if (field.lookup) push('ルックアップ設定', field.lookup, { textarea: true, maxLen: 600, kind: 'lookup', counterpart: other ? other.lookup : undefined, side }, ['lookup']);
    if (field.referenceTable) push('関連レコード一覧設定', field.referenceTable, { textarea: true, maxLen: 600, kind: 'referenceTable', counterpart: other ? other.referenceTable : undefined, side }, ['referenceTable']);
    if (field.fields) push('テーブル内の項目', field.fields, { subtableFields: true, full: true, counterpart: other ? other.fields : undefined, side }, ['fields']);
    if (field.__parentTableCode) push('テーブル', field.__parentTableLabel || field.__parentTableCode);
    return rows;
  }

  function renderGenericFieldSnapshotBody(field, other, side) {
    const dif = (keys) => !!other && keys.some((k) => !jsonEq(field[k], other[k]));
    const extras = buildFieldExtraRows(field, other, side);
    const toggleRows = [
      renderFieldToggleRow('フィールド名を表示しない', !!field.noLabel, !!other && !!field.noLabel !== !!other.noLabel),
      renderFieldToggleRow('必須項目にする', !!field.required, !!other && !!field.required !== !!other.required)
    ];
    if (field.unique !== undefined) toggleRows.push(renderFieldToggleRow('重複禁止にする', !!field.unique, !!other && !!field.unique !== !!other.unique));
    if (field.defaultNowValue !== undefined) toggleRows.push(renderFieldToggleRow('現在日時を初期値にする', !!field.defaultNowValue, !!other && !!field.defaultNowValue !== !!other.defaultNowValue));
    return renderFieldFormRow('フィールド名', field.label || field.name || '（未設定）', { required: true, diff: dif(['label', 'name']) }) +
      '<div class="kf-toggle-list">' + toggleRows.join('') + '</div>' +
      renderFieldFormRow('初期値', field.defaultNowValue ? '現在日時を使用' : field.defaultValue, { textarea: true, full: true, maxLen: 600, diff: dif(['defaultValue', 'defaultNowValue']) }) +
      renderFieldFormRow('フィールドコード', field.code || '-', { required: true, full: true, diff: dif(['code']) }) +
      (extras.length ? '<div class="kf-extra"><div class="kf-extra-title">その他の設定</div><div class="kf-extra-grid">' + extras.map((item) => renderFieldFormRow(item.label, item.value, item.options)).join('') + '</div></div>' : '');
  }

  function renderRadioFieldSnapshotBody(field, other, side) {
    const dif = (keys) => !!other && keys.some((k) => !jsonEq(field[k], other[k]));
    return renderFieldFormRow('フィールド名', field.label || field.name || '（未設定）', { required: true, diff: dif(['label', 'name']) }) +
      '<div class="kf-toggle-list">' +
        renderFieldToggleRow('フィールド名を表示しない', !!field.noLabel, !!other && !!field.noLabel !== !!other.noLabel) +
      '</div>' +
      renderFieldFormRow('項目と順番', formatFieldOptionLines(field.options), { textarea: true, full: true, maxLen: 1200, diff: dif(['options']) }) +
      renderFieldFormRow('並び', fieldAlignDisplayLabel(field.align), { full: true, diff: dif(['align']) }) +
      renderFieldFormRow('初期値', field.defaultValue, { full: true, diff: dif(['defaultValue']) }) +
      renderFieldFormRow('フィールドコード', field.code || '-', { required: true, full: true, diff: dif(['code']) });
  }

  function renderNumberFieldSnapshotBody(field, other, side) {
    const dif = (keys) => !!other && keys.some((k) => !jsonEq(field[k], other[k]));
    return renderFieldFormRow('フィールド名', field.label || field.name || '（未設定）', { required: true, diff: dif(['label', 'name']) }) +
      '<div class="kf-toggle-list">' +
        renderFieldToggleRow('フィールド名を表示しない', !!field.noLabel, !!other && !!field.noLabel !== !!other.noLabel) +
        renderFieldToggleRow('桁区切りを表示する', !!field.digit, !!other && !!field.digit !== !!other.digit) +
        renderFieldToggleRow('必須項目にする', !!field.required, !!other && !!field.required !== !!other.required) +
        renderFieldToggleRow('値の重複を禁止する', !!field.unique, !!other && !!field.unique !== !!other.unique) +
      '</div>' +
      renderFieldLimitsBlock(field, other) +
      renderFieldFormRow('初期値', field.defaultValue, { full: true, diff: dif(['defaultValue']) }) +
      renderFieldFormRow('小数点以下の表示桁数', field.displayScale, { full: true, diff: dif(['displayScale']) }) +
      renderFieldUnitBlock(field, other) +
      renderFieldFormRow('フィールドコード', field.code || '-', { required: true, full: true, diff: dif(['code']) });
  }

  function renderCalcFieldSnapshotBody(field, other, side) {
    const dif = (keys) => !!other && keys.some((k) => !jsonEq(field[k], other[k]));
    return renderFieldFormRow('フィールド名', field.label || field.name || '（未設定）', { required: true, diff: dif(['label', 'name']) }) +
      '<div class="kf-toggle-list">' +
        renderFieldToggleRow('フィールド名を表示しない', !!field.noLabel, !!other && !!field.noLabel !== !!other.noLabel) +
      '</div>' +
      renderFieldFormRow('計算式', field.expression, { required: true, textarea: true, full: true, maxLen: 1200, diff: dif(['expression']) }) +
      '<div class="kf-toggle-list">' +
        renderFieldToggleRow('計算式を表示しない', !!field.hideExpression, !!other && !!field.hideExpression !== !!other.hideExpression) +
      '</div>' +
      renderFieldFormRow('表示形式', calcFormatDisplayLabel(field.format), { full: true, diff: dif(['format']) }) +
      renderFieldFormRow('小数点以下の表示桁数', field.displayScale, { full: true, diff: dif(['displayScale']) }) +
      renderFieldUnitBlock(field, other) +
      renderFieldFormRow('フィールドコード', field.code || '-', { required: true, full: true, diff: dif(['code']) });
  }

  function renderSubtableFieldSnapshotBody(field, other, side) {
    const dif = (keys) => !!other && keys.some((k) => !jsonEq(field[k], other[k]));
    return renderFieldFormRow('フィールド名', field.label || field.name || '（未設定）', { required: true, diff: dif(['label', 'name']) }) +
      '<div class="kf-toggle-list">' +
        renderFieldToggleRow('フィールド名を表示しない', !!field.noLabel, !!other && !!field.noLabel !== !!other.noLabel) +
      '</div>' +
      renderFieldFormRow('テーブル内の項目', field.fields, { subtableFields: true, full: true, counterpart: other ? other.fields : undefined, side, diff: dif(['fields']) }) +
      renderFieldFormRow('フィールドコード', field.code || '-', { required: true, full: true, diff: dif(['code']) });
  }

  function renderFieldSnapshotCard(sideLabel, field, tone, otherField) {
    if (!field) {
      return '<section class="fd-snapshot fd-snapshot--' + tone + '"><div class="fd-pane-label">' + escHtml(sideLabel) + '</div><div class="fd-empty">この側にはフィールドがありません。</div></section>';
    }
    // フィールド型が異なる場合は行単位の対応が取れないため、型の差分のみ強調する
    const other = otherField && String(otherField.type || '') === String(field.type || '') ? otherField : null;
    const typeChanged = !!otherField && String(otherField.type || '') !== String(field.type || '');
    const typeLabel = fieldTypeDisplayLabel(field.type);
    const bodyHtml =
      field.type === 'RADIO_BUTTON' ? renderRadioFieldSnapshotBody(field, other, tone)
      : field.type === 'NUMBER' ? renderNumberFieldSnapshotBody(field, other, tone)
      : field.type === 'CALC' ? renderCalcFieldSnapshotBody(field, other, tone)
      : field.type === 'SUBTABLE' ? renderSubtableFieldSnapshotBody(field, other, tone)
      : renderGenericFieldSnapshotBody(field, other, tone);
    return '<section class="fd-snapshot fd-snapshot--' + tone + '">' +
      '<div class="kf-modal">' +
        '<div class="kf-modal-head">' +
          '<div class="kf-modal-title"><span class="kf-type-icon" aria-hidden="true"></span><strong>' + escHtml(typeLabel) + ' の設定</strong>' + (typeChanged ? '<span class="kf-diff-chip" title="比較相手とフィールド型が異なります">型が差分</span>' : '') + '</div>' +
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

    getDetailFilteredRows().forEach((row) => {
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


  function renderFieldChangeSummary(entries) {
    if (!entries.length) return '';
    const visible = entries.slice(0, 10);
    const rest = entries.length - visible.length;
    return '<div class="fd-change-summary" aria-label="設定差分の要約">' +
      '<div class="fd-change-summary__title">変更項目</div>' +
      '<div class="fd-change-summary__chips">' +
        visible.map((entry) => {
          const tone = entry.row.type === 'added' ? 'added' : entry.row.type === 'removed' ? 'removed' : entry.row.type === 'same' ? 'same' : 'changed';
          return '<span class="fd-change-chip fd-change-chip--' + tone + '" title="' + escHtml(entry.row.path || '-') + '">' +
            '<b>' + escHtml(diffTypeLabel(entry.row.type, entry.row.moved)) + '</b>' + escHtml(entry.title || relativePathLabel(entry.row)) +
          '</span>';
        }).join('') +
        (rest > 0 ? '<span class="fd-change-chip fd-change-chip--more">ほか ' + rest + ' 件</span>' : '') +
      '</div>' +
    '</div>';
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
          '<div class="fd-sub">フィールドコード: <code>' + escHtml(group.code) + '</code> / 型: ' + escHtml(fieldTypeDisplayLabel(group.type)) + (group.parentTableCode ? ' / テーブル: ' + escHtml(group.parentTableLabel || group.parentTableCode) : '') + '</div>' +
        '</div>' +
        '<span class="fd-status fd-status--' + tone + '">' + escHtml(fieldStatusLabel(group.status)) + '</span>' +
      '</div>' +
      '<div class="fc-chip-row">' + renderFieldSummaryChips(group) + '</div>' +
      renderFieldChangeSummary(entries) +
      '<div class="fd-snapshots">' +
        renderFieldSnapshotCard('比較元', group.sourceField, 'src', group.targetField) +
        renderFieldSnapshotCard('比較先', group.targetField, 'tgt', group.sourceField) +
      '</div>' +
    '</section>';
  }

  function closeFieldDetailModal() {
    const returnFocus = fieldDetailReturnFocus;
    detailModalOpen = false;
    fieldDetailReturnFocus = null;
    const modal = document.getElementById('fieldDetailModal');
    const body = document.getElementById('fieldDetailModalBody');
    if (modal) modal.hidden = true;
    if (body) body.innerHTML = '';
    document.body.classList.remove('has-modal-open');
    if (returnFocus && returnFocus.isConnected && typeof returnFocus.focus === 'function') {
      returnFocus.focus();
    }
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
    sub.textContent = 'フィールドコード: ' + (group.code || '-') + ' / 型: ' + fieldTypeDisplayLabel(group.type) + (group.parentTableCode ? ' / テーブル: ' + (group.parentTableLabel || group.parentTableCode) : '');
    body.innerHTML = renderFieldDetailPanel(activeFieldCode, model, options);
    modal.hidden = false;
    document.body.classList.add('has-modal-open');
    const dialog = modal.querySelector('[role="dialog"]');
    if (dialog && !dialog.contains(document.activeElement)) {
      const firstFocus = dialog.querySelector('[data-modal-close]') || dialog;
      if (typeof firstFocus.focus === 'function') firstFocus.focus();
    }
  }

  function openFieldDetail(code, rerender, trigger) {
    if (!HAS_COMPARED_CONTENT) {
      showToast('差分行のみのレポートにはフィールド設定本文が収録されていません');
      return;
    }
    const safeCode = String(code || '').trim();
    if (!safeCode) return;
    fieldDetailReturnFocus = trigger || document.activeElement;
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
        openFieldDetail(code, rerender, btn);
      });
    });
  }

  function renderSettingsLikeView() {
    const root = document.getElementById('settingsLikeRoot');
    if (!root) return;
    if (!HAS_COMPARED_CONTENT) {
      root.innerHTML = '<div class="no-diff">差分行のみのレポートにはフィールド設定本文が収録されていないため、フィールド単位表示は利用できません。</div>';
      return;
    }
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
      root.innerHTML = '<div class="no-diff">表示対象のフィールドがありません。検索条件か「同一項目を隠す」・詳細オプションを見直してください。</div>';
      return;
    }
    // 差分一覧と同じ「種別」チップでフィールドカードを絞り込む
    const statusCounts = { added: 0, removed: 0, changed: 0, same: 0 };
    groups.forEach((group) => {
      if (group.status === 'added') statusCounts.added += 1;
      else if (group.status === 'removed') statusCounts.removed += 1;
      else if (group.status === 'modified') statusCounts.changed += 1;
      else statusCounts.same += 1;
    });
    const statusChips = [
      { key: 'all', label: '全て', count: groups.length },
      { key: 'added', label: '追加', count: statusCounts.added },
      { key: 'removed', label: '削除', count: statusCounts.removed },
      { key: 'changed', label: '変更', count: statusCounts.changed }
    ];
    if (!hideSame) statusChips.push({ key: 'same', label: '同一', count: statusCounts.same });
    if (fieldStatusFilterValue !== 'all' && !statusChips.some((c) => c.key === fieldStatusFilterValue)) fieldStatusFilterValue = 'all';
    const visibleGroups = groups.filter((group) => {
      if (fieldStatusFilterValue === 'all') return true;
      if (fieldStatusFilterValue === 'same') return group.status === 'unchanged';
      if (fieldStatusFilterValue === 'changed') return group.status === 'modified';
      return group.status === fieldStatusFilterValue;
    });
    const toolbarHtml = '<div class="diff-toolbar" role="toolbar" aria-label="フィールド単位ビューの絞り込み">'
      + '<div class="diff-toolbar-row">'
      + '<span class="diff-toolbar-label">種別</span>'
      + statusChips.map((c) =>
        '<button type="button" class="tchip tchip--' + c.key + (fieldStatusFilterValue === c.key ? ' is-active' : '') + '" data-field-status-chip="' + c.key + '" aria-pressed="' + (fieldStatusFilterValue === c.key ? 'true' : 'false') + '">'
        + c.label + '<b>' + c.count + '</b></button>'
      ).join('')
      + '<span class="diff-toolbar-spacer"></span>'
      + '<span class="diff-toolbar-count">表示 <b>' + visibleGroups.length + '</b> / ' + groups.length + ' 件</span>'
      + '</div>'
      + '</div>';
    ensureActiveFieldCode(visibleGroups, { preserveMissing: detailModalOpen });
    const modelForView = { groupMap: new Map(visibleGroups.map((group) => [group.code, group])) };
    root.innerHTML = '<div class="sl-board">' +
      toolbarHtml +
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
          (visibleGroups.length ? visibleGroups.map((group, idx) => {
            const tone = fieldStatusTone(group.status);
            const isActive = group.code === activeFieldCode;
            const isSelected = selectedFieldCodes.has(group.code);
            const isReflectSelectable = CAN_BUILD_REFLECT_JSON && (group.fieldRows || []).some((row) => row && row.type !== 'same' && !row._displayOnly && !row._nonActionable);
            return '<article class="fc-card fc-card--' + tone + (isActive ? ' is-active' : '') + '" id="field_card_' + idx + '">' +
              '<div class="fc-card-head">' +
                '<span class="fd-status fd-status--' + tone + '">' + escHtml(fieldStatusLabel(group.status)) + '</span>' +
                '<span class="fc-code">' + escHtml(group.code) + '</span>' +
                (isReflectSelectable
                  ? '<label class="row-select' + (isSelected ? ' is-on' : '') + '" title="このフィールドを反映JSONの対象にする">' +
                      '<input type="checkbox" data-select-field="' + escHtml(group.code) + '" aria-label="' + escHtml(String(group.label || group.code) + 'を反映JSONの対象に選択') + '"' + (isSelected ? ' checked' : '') + '> 選択</label>'
                  : '<span class="muted" title="' + escHtml(CAN_BUILD_REFLECT_JSON ? '表示専用・同一・レイアウト参照のみのため反映対象にできません' : REFLECT_JSON_BLOCK_REASON) + '">' +
                      (CAN_BUILD_REFLECT_JSON ? '反映対象外' : '反映利用不可') + '</span>') +
              '</div>' +
              '<div class="fc-title">' + escHtml(group.label) + '</div>' +
              '<div class="fc-sub">' + escHtml(fieldTypeDisplayLabel(group.type)) + (group.parentTableCode ? ' / テーブル: ' + escHtml(group.parentTableLabel || group.parentTableCode) : '') + '</div>' +
              '<div class="fc-chip-row">' + renderFieldSummaryChips(group) + '</div>' +
              '<button type="button" class="btn' + (isActive ? ' primary' : '') + '" data-field-select="' + escHtml(group.code) + '" aria-label="' + escHtml(String(group.label || group.code) + (group.diffCount ? 'の設定差分を開く' : 'の設定を開く')) + '">' + escHtml(group.diffCount ? '設定差分を開く' : '設定を開く') + '</button>' +
            '</article>';
          }).join('') : '<div class="no-diff">この種別に該当するフィールドがありません。</div>') +
        '</div>' +
      '</div>' +
    '</div>';
    root.querySelectorAll('[data-field-status-chip]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const next = btn.getAttribute('data-field-status-chip') || 'all';
        fieldStatusFilterValue = fieldStatusFilterValue === next ? 'all' : next;
        renderSettingsLikeView();
      });
    });
    if (nav) {
      visibleGroups.forEach((group, idx) => {
        const navItem = document.createElement('button');
        navItem.type = 'button';
        navItem.className = 'nav-item' + (group.code === activeFieldCode ? ' active' : '');
        if (group.code === activeFieldCode) navItem.setAttribute('aria-current', 'true');
        navItem.innerHTML = '<span>' + escHtml(group.code) + '</span><span class="badge">' + String(group.diffCount || 0) + '</span>';
        navItem.onclick = () => {
          activeFieldCode = group.code;
          renderSettingsLikeView();
          const el = document.getElementById('field_card_' + idx);
          if (el) el.scrollIntoView({ behavior: preferredScrollBehavior(), block: 'nearest' });
        };
        nav.appendChild(navItem);
      });
    }
    bindFieldSelectionButtons(root, renderSettingsLikeView);
    syncFieldDetailModal(modelForView, { hideSame });
  }

  function getActiveReportTab() {
    const btn = document.querySelector('.settings-tab:not(.passive)[data-report-tab]');
    return btn ? btn.getAttribute('data-report-tab') : 'diff';
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
          const pairSide = activeViewSide();
          pair.className = 'sl-kuc-pair' + (pairSide ? ' sl-kuc-pair--solo' : '');
          if (pairSide !== 'target') {
            const leftTa = new Kuc.TextArea({
              label: '比較元',
              value: formatFieldValuePlain(row.left),
              disabled: true,
              requiredIcon: false
            });
            pair.appendChild(leftTa);
          }
          if (pairSide !== 'source') {
            const rightTa = new Kuc.TextArea({
              label: '比較先',
              value: formatFieldValuePlain(row.right),
              disabled: true,
              requiredIcon: false
            });
            pair.appendChild(rightTa);
          }
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
          const navItem = document.createElement('button');
          navItem.type = 'button';
          navItem.className = 'nav-item';
          navItem.innerHTML = '<span>' + escHtml(navLabel) + '</span><span class="badge">' + g.rows.length + '</span>';
          navItem.onclick = () => {
            const el = document.getElementById('slg_' + idx);
            if (el) el.scrollIntoView({ behavior: preferredScrollBehavior(), block: 'start' });
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
        // referenceTable / lookup のパスなら日本語キー + 差分色付きのキー値表で比較する
        const kvKind = /\\.referenceTable(\\.|$)/.test(row.path || '') ? 'referenceTable'
          : (/\\.lookup(\\.|$)/.test(row.path || '') ? 'lookup' : '');
        const slSide = activeViewSide();
        html += '<div class="sl-pair' + (slSide ? ' sl-pair--solo' : '') + '">';
        if (slSide !== 'target') {
          html += '<div class="sl-pair-col"><div class="sl-pane-h">比較元</div><div class="sl-pane sl-pane--src sl-pane--kv">' + formatFieldValueBrief(row.left, { kind: kvKind, counterpart: row.right, side: 'src' }) + '</div></div>';
        }
        if (slSide !== 'source') {
          html += '<div class="sl-pair-col"><div class="sl-pane-h">比較先</div><div class="sl-pane sl-pane--tgt sl-pane--kv">' + formatFieldValueBrief(row.right, { kind: kvKind, counterpart: row.left, side: 'tgt' }) + '</div></div>';
        }
        html += '</div></article>';
      });
      html += '</div></section>';
      if (nav) {
        const navItem = document.createElement('button');
        navItem.type = 'button';
        navItem.className = 'nav-item';
        navItem.innerHTML = '<span>' + escHtml(navLabel) + '</span><span class="badge">' + g.rows.length + '</span>';
        navItem.onclick = () => {
          const el = document.getElementById('slg_' + idx);
          if (el) el.scrollIntoView({ behavior: preferredScrollBehavior(), block: 'start' });
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
      else if (row.moved || row.type === 'moved') moved += 1;
      else changed += 1;
    }
    document.getElementById('stat-total').textContent = String(rows.length);
    document.getElementById('stat-added').textContent = String(added);
    document.getElementById('stat-removed').textContent = String(removed);
    document.getElementById('stat-changed').textContent = String(changed);
    document.getElementById('stat-moved').textContent = String(moved);
    document.getElementById('stat-same').textContent = String(same);
  }

  function setActiveTab(tabName) {
    const KNOWN_TABS = ['diff', 'settingsLike'];
    const requestedTab = KNOWN_TABS.indexOf(tabName) >= 0 ? tabName : 'diff';
    const nextTab = !HAS_COMPARED_CONTENT && requestedTab === 'settingsLike' ? 'diff' : requestedTab;
    document.querySelectorAll('[data-report-tab]').forEach((btn) => {
      const active = btn.getAttribute('data-report-tab') === nextTab;
      btn.classList.toggle('passive', !active);
      btn.setAttribute('aria-selected', active ? 'true' : 'false');
      btn.setAttribute('tabindex', active ? '0' : '-1');
    });
    document.querySelectorAll('[data-report-pane]').forEach((pane) => {
      pane.hidden = pane.getAttribute('data-report-pane') !== nextTab;
    });
    if (nextTab !== 'settingsLike') closeFieldDetailModal();
    safeStorageSet(ACTIVE_TAB_KEY, nextTab);
    if (nextTab === 'settingsLike') renderSettingsLikeView();
    else render();
  }

  function cancelScheduledReportSearch() {
    if (reportSearchTimer) {
      clearTimeout(reportSearchTimer);
      reportSearchTimer = 0;
    }
    if (reportSearchFrame) {
      window.cancelAnimationFrame(reportSearchFrame);
      reportSearchFrame = 0;
    }
  }

  function setReportRenderBusy(busy) {
    const main = document.getElementById('main');
    if (main) main.setAttribute('aria-busy', busy ? 'true' : 'false');
  }

  function syncReportFilterStatus(viewState) {
    const status = document.getElementById('reportFilterStatus');
    if (!status || !viewState) return;
    const message = '表示 ' + viewState.visibleRows.length + '件、全体 ' + viewState.scopeRows.length
      + '件、未確認 ' + viewState.progress.pending + '件';
    if (status.textContent !== message) status.textContent = message;
  }

  function finishReportRender(viewState) {
    setReportRenderBusy(false);
    syncReportFilterStatus(viewState);
  }

  function applyReportFilterChange() {
    render();
    if (getActiveReportTab() === 'settingsLike') renderSettingsLikeView();
  }

  function onReportFilterChange() {
    cancelScheduledReportSearch();
    applyReportFilterChange();
  }

  function scheduleReportSearchRender() {
    cancelScheduledReportSearch();
    setReportRenderBusy(true);
    reportSearchTimer = window.setTimeout(() => {
      reportSearchTimer = 0;
      reportSearchFrame = window.requestAnimationFrame(() => {
        reportSearchFrame = 0;
        applyReportFilterChange();
      });
    }, REPORT_SEARCH_DEBOUNCE_MS);
  }

  function rowStateKey(row) {
    return String(row._reviewKey || row._id || ((row.sectionKey || '') + '|' + (row.path || '') + '|' + (row.type || '')));
  }

  function typeFilterMatches(row) {
    if (typeFilterValue === 'all') return true;
    if (typeFilterValue === 'moved') return !!row.moved;
    if (typeFilterValue === 'changed') return !row.moved && row.type !== 'moved' && row.type !== 'same' && row.type !== 'added' && row.type !== 'removed';
    return row.type === typeFilterValue;
  }

  function sectionFilterMatches(row) {
    if (sectionFilterValue === 'all') return true;
    return String(row && (row.sectionKey || row.section) || '') === sectionFilterValue;
  }

  function buildReviewQueueHtml(rows) {
    const progress = reviewProgressOf(rows);
    const pending = progress.actionable.filter((row) => !reviewedKeys.has(rowStateKey(row)));
    const samples = pending.slice(0, 3);
    const headline = pending.length
      ? '未確認の差分を上から確認できます'
      : '現在の対象はすべて確認済みです';
    return '<section class="review-queue review-queue--' + (pending.length ? 'pending' : 'clear') + '" aria-labelledby="reviewQueueTitle" tabindex="-1">'
      + '<div class="review-queue-mark" aria-hidden="true">' + (pending.length ? '→' : '✓') + '</div>'
      + '<div class="review-queue-main">'
      +   '<span class="review-queue-kicker">レビュー受信箱</span>'
      +   '<strong id="reviewQueueTitle">' + escHtml(headline) + '</strong>'
      +   '<span class="review-queue-note">未確認 ' + pending.length + '件 / レビュー対象 ' + progress.total + '件。判断による並び替えをせず、レポートの定義順で表示します。</span>'
      +   '<div class="review-progress review-progress--queue">'
      +     '<div class="review-progress-copy"><span>確認済み</span><strong>' + progress.reviewed + ' / ' + progress.total + '（' + progress.percent + '%）</strong></div>'
      +     '<div class="review-progress-track" role="progressbar" aria-label="レビュー進捗" aria-valuemin="0" aria-valuemax="' + progress.total + '" aria-valuenow="' + progress.reviewed + '" aria-valuetext="確認済み ' + progress.reviewed + '件 / 全 ' + progress.total + '件（' + progress.percent + '%）"><span style="width:' + progress.percent + '%"></span></div>'
      +   '</div>'
      +   (samples.length ? '<div class="review-queue-samples" aria-label="次に確認する差分">' + samples.map((row) => '<button type="button" data-review-jump="' + escHtml(rowStateKey(row)) + '">' + escHtml(reportRowTitle(row)) + '</button>').join('') + '</div>' : '')
      + '</div>'
      + '</section>';
  }

  function buildActiveFiltersHtml(keyword, hideSame, hideReviewed) {
    const chips = [];
    const typeLabels = { added: '比較先のみ', removed: '比較元のみ', changed: '内容が異なる', moved: '並び順が異なる', same: '同じ' };
    if (typeFilterValue !== 'all') chips.push(['type', '種別: ' + (typeLabels[typeFilterValue] || typeFilterValue)]);
    if (sectionFilterValue !== 'all') chips.push(['section', 'セクション: ' + (SECTION_LABEL_MAP[sectionFilterValue] || sectionFilterValue)]);
    if (keyword) chips.push(['search', '検索: ' + keyword]);
    if (hideSame) chips.push(['hideSame', '同一を非表示']);
    if (hideReviewed) chips.push(['hideReviewed', '確認済みを非表示']);
    const extraIgnoreInput = document.getElementById('extraIgnoreKeys');
    if (extraIgnoreInput && String(extraIgnoreInput.value || '').trim()) chips.push(['extraIgnore', '追加の無視キー']);
    if (activePresetKeys.size) chips.push(['presets', '追加プリセット ' + activePresetKeys.size + '件']);
    if (!chips.length) {
      return '<div class="active-filters active-filters--empty"><span class="active-filters-label">適用中</span><span>絞り込みなし</span></div>';
    }
    return '<div class="active-filters" aria-label="適用中の絞り込み">'
      + '<span class="active-filters-label">適用中</span>'
      + chips.map((item) => '<button type="button" class="active-filter-chip" data-clear-filter="' + item[0] + '" aria-label="' + escHtml(item[1] + 'を解除') + '">'
        + escHtml(item[1]) + '<span aria-hidden="true">×</span></button>').join('')
      + '<button type="button" class="active-filter-clear" data-clear-filter="all">一覧条件をすべて解除</button>'
      + '</div>';
  }

  function sortRowsForDisplay(rows) {
    if (diffSortValue === 'standard') return rows;
    const typeOrder = { removed: 0, added: 1, changed: 2, same: 3 };
    return rows.slice().sort((a, b) => {
      const d = ((typeOrder[a.type] != null ? typeOrder[a.type] : 9) - (typeOrder[b.type] != null ? typeOrder[b.type] : 9));
      if (d) return d;
      return String(a.path || '').localeCompare(String(b.path || ''));
    });
  }

  function buildToolbarHtml(rows, hideSame, hideReviewed, shownCount, keyword, scopeCount, pendingCount) {
    const s = summarizeGroupRows(rows);
    const chips = [
      { key: 'all', label: 'すべて', count: rows.length },
      { key: 'added', label: '比較先のみ', count: s.added },
      { key: 'removed', label: '比較元のみ', count: s.removed },
      { key: 'changed', label: '内容が異なる', count: s.changed }
    ];
    if (s.moved) chips.push({ key: 'moved', label: '並び順が異なる', count: s.moved });
    if (!hideSame) chips.push({ key: 'same', label: '同じ', count: s.same });
    const sortOptions = [
      ['standard', '標準（定義順）'],
      ['type', '存在状況・差分内容順']
    ];
    const sectionKeys = [...new Set(rows.map((row) => String(row && (row.sectionKey || row.section) || '')).filter(Boolean))];
    const sectionOptions = [['all', 'すべてのセクション']].concat(sectionKeys.map((key) => [key, SECTION_LABEL_MAP[key] || key]));
    const sourceContextLabel = String((REPORT_META.source.appName ? REPORT_META.source.appName + ' · ' : '') + 'App ' + (REPORT_META.source.appId || '-'));
    const targetContextLabel = String((REPORT_META.target.appName ? REPORT_META.target.appName + ' · ' : '') + 'App ' + (REPORT_META.target.appId || '-'));
    return '<div class="diff-toolbar" role="toolbar" aria-label="差分一覧の絞り込みと並び替え">'
      + '<div class="diff-toolbar-heading">'
      +   '<div class="diff-toolbar-title"><strong>差分レビュー</strong><span>絞り込み・移動・表示密度</span></div>'
      +   '<div class="diff-scope-counts" aria-label="差分件数">'
      +     '<span>全体 <b>' + scopeCount + '</b></span>'
      +     '<span>表示中 <b>' + shownCount + '</b></span>'
      +     '<span>未確認 <b>' + pendingCount + '</b></span>'
      +   '</div>'
      +   '<button type="button" class="mobile-toolbar-toggle" data-mobile-toolbar-toggle aria-expanded="' + (mobileToolbarExpanded ? 'true' : 'false') + '" aria-controls="diffToolbarFilters diffToolbarSort">' + (mobileToolbarExpanded ? '条件を閉じる' : '条件を開く') + '</button>'
      + '</div>'
      + '<div class="focus-context" aria-label="集中表示中の比較対象">'
      +   '<span class="focus-context-pair" title="' + escHtml(sourceContextLabel + ' → ' + targetContextLabel) + '"><span class="focus-context-side"><small>BEFORE</small><b>' + escHtml(sourceContextLabel) + '</b></span><i aria-hidden="true">→</i><span class="focus-context-side"><small>AFTER</small><b>' + escHtml(targetContextLabel) + '</b></span></span>'
      +   '<span class="focus-context-stat">現在 <strong id="focusContextPosition">0 / 0</strong></span>'
      +   '<span class="focus-context-stat">未確認 <strong>' + pendingCount + '</strong></span>'
      + '</div>'
      + '<div id="diffToolbarFilters" class="diff-toolbar-row diff-toolbar-row--filters">'
      + '<span class="diff-toolbar-label">種別</span>'
      + chips.map((c) =>
        '<button type="button" class="tchip tchip--' + c.key + (typeFilterValue === c.key ? ' is-active' : '') + '" data-type-chip="' + c.key + '" aria-pressed="' + (typeFilterValue === c.key ? 'true' : 'false') + '">'
        + c.label + '<b>' + c.count + '</b></button>'
      ).join('')
      + '<span class="diff-toolbar-spacer"></span>'
      + '<label class="diff-sort">セクション <select id="diffSectionSel" aria-label="セクションで絞り込み">'
      + sectionOptions.map((o) => '<option value="' + escHtml(o[0]) + '"' + (sectionFilterValue === o[0] ? ' selected' : '') + '>' + escHtml(o[1]) + '</option>').join('')
      + '</select></label>'
      + '</div>'
      + '<div class="diff-toolbar-row diff-toolbar-row--navigation">'
      + '<span class="diff-toolbar-label">確認順</span>'
      + '<button type="button" class="tchip" data-diff-nav="prev" title="前の差分へ移動（k キー）" aria-label="前の差分へ移動">前へ</button>'
      + '<span id="diffNavPosition" class="diff-nav-position" role="status" aria-live="polite" aria-atomic="true">現在位置 0 / 0' + DIFF_NAV_RANGE_NOTE + '</span>'
      + '<button type="button" class="tchip" data-diff-nav="next" title="次の差分へ移動（j キー）" aria-label="次の差分へ移動">次へ</button>'
      + '<span class="diff-toolbar-spacer"></span>'
      + '<label id="diffToolbarSort" class="diff-sort">並び順 <select id="diffSortSel">'
      + sortOptions.map((o) => '<option value="' + o[0] + '"' + (diffSortValue === o[0] ? ' selected' : '') + '>' + o[1] + '</option>').join('')
      + '</select></label>'
      + '<div class="diff-display-modes" aria-label="表示モード">'
      +   '<button type="button" class="tchip" data-density-toggle aria-pressed="' + (compactDensityEnabled ? 'true' : 'false') + '">' + (compactDensityEnabled ? '密度: コンパクト' : '密度: 標準') + '</button>'
      +   '<button type="button" class="tchip" data-focus-mode aria-pressed="' + (focusModeEnabled ? 'true' : 'false') + '">' + (focusModeEnabled ? '集中表示を終了' : '集中表示') + '</button>'
      + '</div>'
      + '</div>'
      + buildActiveFiltersHtml(keyword, hideSame, hideReviewed)
      + '</div>';
  }

  function sectionCountChips(s) {
    const parts = [];
    if (s.added) parts.push('<span class="cnt cnt--add" title="比較先のみ ' + s.added + '件">比較先のみ ' + s.added + '</span>');
    if (s.removed) parts.push('<span class="cnt cnt--del" title="比較元のみ ' + s.removed + '件">比較元のみ ' + s.removed + '</span>');
    if (s.changed) parts.push('<span class="cnt cnt--chg" title="内容が異なる ' + s.changed + '件">内容差 ' + s.changed + '</span>');
    if (s.same) parts.push('<span class="cnt cnt--same" title="内容は同じ ' + s.same + '件">同じ ' + s.same + '</span>');
    if (!parts.length) parts.push('<span class="cnt cnt--same">0件</span>');
    return parts.join('');
  }

  function renderAggChildrenHtml(row, useCharDiff) {
    const kids = (row.__childRows || []).filter((kid) => kid.type !== 'same');
    if (!kids.length) return '';
    return '<div class="agg-list">' + kids.map((kid) => {
      const info = extractFieldPathInfo(kid.path);
      const title = fieldChangePropTitle(info, kid);
      const tc = kid.type === 'added' ? 'added' : kid.type === 'removed' ? 'removed' : 'changed';
      return '<div class="agg-item">'
        + '<div class="agg-item-head">'
        +   '<span class="mini-chip mini-chip--' + tc + '">' + escHtml(diffTypeLabel(kid.type, kid.moved)) + '</span>'
        +   '<span class="agg-prop" title="' + escHtml(kid.path || '-') + '">' + escHtml(title) + '</span>'
        + '</div>'
        + '<div class="agg-val">' + renderValueArea(kid, useCharDiff) + '</div>'
        + '</div>';
    }).join('') + '</div>';
  }

  function renderDiffRowHtml(row, useCharDiff) {
    const typeClass = row.type === 'same' ? 'same' : (row.type === 'added' ? 'added' : (row.type === 'removed' ? 'removed' : 'changed'));
    const key = rowStateKey(row);
    rowLookup.set(key, row);
    const hasDiffKids = !isRawJsonMode() && !!(row.__childRows && row.__childRows.some((kid) => kid.type !== 'same'));
    let valueHtml = '';
    if (hasDiffKids) {
      valueHtml = renderAggChildrenHtml(row, useCharDiff);
    } else if (row.type === 'same' && !isInlineText(safeText(row.left))) {
      // 大きな同一値は折りたたみ、要求時のみ展開してノイズを抑える
      valueHtml = expandedVals.has(key)
        ? renderValueArea(row, useCharDiff) + '<button type="button" class="val-reveal" data-row-toggle="' + escHtml(key) + '">内容を隠す ▴</button>'
        : '<button type="button" class="val-reveal" data-row-toggle="' + escHtml(key) + '">同一の内容を表示 ▾</button>';
    } else {
      valueHtml = renderValueArea(row, useCharDiff);
    }
    if (valueHtml && !hasDiffKids && row.type !== 'same') {
      valueHtml = wrapLongValueHtml(row, valueHtml);
    }
    const reviewed = isReviewRowComplete(row);
    const selected = selectedRows.has(key);
    const focused = key === diffFocusKey;
    const rowItemLabel = reportRowTitle(row);
    const actionsHtml = '<span class="drow-actions">'
      + '<button type="button" class="row-act" data-copy-path="' + escHtml(row.path || '') + '" title="設定パスをコピー" aria-label="' + escHtml(rowItemLabel + 'の設定パスをコピー') + '">パス</button>'
      + '<button type="button" class="row-act" data-copy-row="' + escHtml(key) + '" title="比較元・比較先の値をJSONでコピー" aria-label="' + escHtml(rowItemLabel + 'の比較元・比較先の値をコピー') + '">コピー</button>'
      + (row.type !== 'same'
          ? (CAN_BUILD_REFLECT_JSON && row.type !== 'same' && !row._displayOnly && !row._nonActionable
          ? '<label class="row-select' + (selected ? ' is-on' : '') + '" title="この差分を反映JSONの対象にする">'
            + '<input type="checkbox" data-select-toggle="' + escHtml(key) + '" aria-label="' + escHtml(rowItemLabel + 'を反映JSONの対象に選択') + '"' + (selected ? ' checked' : '') + '> 選択'
            + '</label>'
          : '')
          + (!row._displayOnly && !reviewed
            ? '<button type="button" class="row-review-next" data-review-next="' + escHtml(key) + '" title="確認済みにして次の未確認差分へ移動（Rキー）" aria-label="' + escHtml(rowItemLabel + 'を確認済みにして次へ') + '">確認して次へ</button>'
            : '')
          + (!row._displayOnly
            ? '<label class="row-reviewed' + (reviewed ? ' is-on' : '') + '" title="確認済みにする（サイドバーの「確認済みを隠す」と連動）">'
              + '<input type="checkbox" data-review-toggle="' + escHtml(key) + '" aria-label="' + escHtml(rowItemLabel + 'を確認済みにする') + '"' + (reviewed ? ' checked' : '') + '> 確認済み'
              + '</label>'
            : '<span class="row-display-only" title="取得状況などを示す表示専用行です">表示専用</span>')
        : '')
      + '</span>';
    return '<article class="drow drow--' + typeClass + (reviewed ? ' drow--reviewed' : '') + (focused ? ' drow--focus' : '') + '"'
      + ' tabindex="-1" data-diff-row-key="' + escHtml(key) + '" aria-current="' + (focused ? 'true' : 'false') + '"'
      + ' aria-label="' + escHtml(rowExistenceLabel(row) + '・' + rowDifferenceLabel(row) + ': ' + reportRowTitle(row)) + '">'
      + '<div class="drow-head">'
      +   '<span class="drow-facts">' + renderRowFacts(row) + '</span>'
      +   '<div class="drow-title">' + renderPathCell(row) + '</div>'
      +   actionsHtml
      + '</div>'
      + (valueHtml ? '<div class="drow-val">' + valueHtml + '</div>' : '')
      + '</article>';
  }

  function getReportViewState() {
    const hideSame = !!(document.getElementById('hideSame') || {}).checked;
    const hideReviewed = !!(document.getElementById('hideReviewed') || {}).checked;
    const keywordRaw = String((document.getElementById('search') || {}).value || '').trim();
    const keyword = keywordRaw.toLowerCase();
    const scopeRows = getDetailFilteredRows();
    const filterBaseRows = scopeRows.filter((row) => {
      if (hideSame && row.type === 'same') return false;
      if (hideReviewed && row.type !== 'same' && reviewedKeys.has(rowStateKey(row))) return false;
      return rowMatches(row, keyword);
    });
    const visibleRows = filterBaseRows.filter(sectionFilterMatches).filter(typeFilterMatches);
    return {
      hideSame,
      hideReviewed,
      keywordRaw,
      scopeRows,
      filterBaseRows,
      visibleRows,
      progress: reviewProgressOf(scopeRows)
    };
  }

  function render() {
    cancelScheduledReportSearch();
    setReportRenderBusy(true);
    const viewState = getReportViewState();
    const hideSame = viewState.hideSame;
    const useCharDiff = !!(document.getElementById('charDiff')).checked;
    const filteredAll = viewState.filterBaseRows;
    const filtered = viewState.visibleRows;
    updateStats(filtered);
    syncReviewedStat(viewState.scopeRows);
    if (getActiveReportTab() !== 'diff') {
      finishReportRender(viewState);
      return;
    }

    const nav = document.getElementById('nav');
    const main = document.getElementById('main');
    nav.innerHTML = '';
    rowLookup.clear();

    let html = '<div id="reviewQueueHost">' + buildReviewQueueHtml(viewState.scopeRows) + '</div>'
      + buildToolbarHtml(
        filteredAll,
        hideSame,
        viewState.hideReviewed,
        filtered.length,
        viewState.keywordRaw,
        viewState.scopeRows.length,
        viewState.progress.pending
      );

    if (!filtered.length) {
      diffNavigationTargets = [];
      diffFocusKey = '';
      diffFocusIndex = -1;
      html += '<div class="no-diff"><strong>この条件に該当する行はありません</strong><span>上の適用中フィルターから条件を1つずつ解除するか、「一覧条件をすべて解除」を選んでください。</span><button type="button" class="btn" data-clear-filter="all">一覧条件をすべて解除</button></div>';
      main.innerHTML = html;
      scheduleDiffStickyOffsetSync();
      syncDiffNavPosition();
      finishReportRender(viewState);
      return;
    }

    const groups = groupBySection(filtered);
    const sectionReviewProgress = new Map();
    viewState.scopeRows.filter(isActionableReviewRow).forEach((row) => {
      const sectionKey = row.sectionKey || row.section || '未分類';
      const progress = sectionReviewProgress.get(sectionKey) || { reviewed: 0, total: 0 };
      progress.total += 1;
      if (reviewedKeys.has(rowStateKey(row))) progress.reviewed += 1;
      sectionReviewProgress.set(sectionKey, progress);
    });
    const nextNavigationTargets = [];
    const seenNavigationKeys = new Set();
    groups.forEach((g, idx) => {
      const secId = 'sec_' + idx;
      const collapsedNow = collapsed.has(g.key);
      const displayRows = sortRowsForDisplay(!isRawJsonMode() && g.key === FIELD_SECTION_KEY ? collapseFieldRowsForDiffTable(g.rows) : g.rows);
      const groupSummary = summarizeGroupRows(displayRows);
      const reviewProgress = sectionReviewProgress.get(g.key) || { reviewed: 0, total: 0 };
      const reviewComplete = reviewProgress.total > 0 && reviewProgress.reviewed === reviewProgress.total;
      const reviewProgressHtml = reviewProgress.total
        ? '<span class="sec-review-progress' + (reviewComplete ? ' is-complete' : '') + '" title="このセクションのレビュー進捗">' + (reviewComplete ? '✓ ' : '') + reviewProgress.reviewed + ' / ' + reviewProgress.total + '</span>'
        : '';
      const navItem = document.createElement('button');
      navItem.type = 'button';
      navItem.className = 'nav-item';
      navItem.innerHTML = '<span>' + escHtml(g.label) + '</span><span class="nav-item-meta">' + reviewProgressHtml + '<span class="badge">' + groupSummary.diffCount + '</span></span>';
      navItem.onclick = () => {
        collapsed.delete(g.key);
        render();
        setTimeout(() => {
          const el = document.getElementById(secId);
          if (el) el.scrollIntoView({ behavior: preferredScrollBehavior(), block: 'start' });
        }, 20);
      };
      nav.appendChild(navItem);

      const diffRows = displayRows.filter((row) => row.type !== 'same');
      const sameRows = displayRows.filter((row) => row.type === 'same');
      const fieldJsonParts = isRawJsonMode() && g.key === FIELD_SECTION_KEY ? buildFieldJsonGroups(diffRows) : null;
      const navigationRows = fieldJsonParts
        ? fieldJsonParts.groups.map((group) => group.reviewRow).concat(fieldJsonParts.passthrough)
        : diffRows;
      navigationRows.filter((row) => !row._displayOnly).forEach((row) => {
        const key = rowStateKey(row);
        if (!key || seenNavigationKeys.has(key)) return;
        seenNavigationKeys.add(key);
        nextNavigationTargets.push({ key, sectionKey: g.key });
      });
      html += '<section class="sec" id="' + secId + '">';
      html += '<div class="sec-head" data-sec-toggle="' + escHtml(g.key) + '" role="button" tabindex="0" aria-expanded="' + (collapsedNow ? 'false' : 'true') + '">'
        + '<span class="sec-head-title"><span class="sec-caret">' + (collapsedNow ? '▶' : '▼') + '</span>' + escHtml(g.label) + '</span>'
        + '<span class="sec-counts">' + reviewProgressHtml + sectionCountChips(groupSummary) + '</span>'
        + '</div>';
      if (!collapsedNow && isRawJsonMode() && g.key === FIELD_SECTION_KEY) {
        // JSONで比較: フィールド単位に区切り、設定JSON全体を左右比較する
        const parts = fieldJsonParts;
        html += '<div class="fj-list">';
        html += parts.groups.map((grp) => renderFieldJsonBlockHtml(grp, useCharDiff)).join('');
        html += parts.passthrough.map((row) => renderDiffRowHtml(row, useCharDiff)).join('');
        if (!parts.groups.length && !parts.passthrough.length) {
          html += '<div class="drow-empty">表示対象のフィールドがありません。</div>';
        }
        if (sameRows.length) {
          html += '<div class="fj-same-note">差分のない設定 ' + sameRows.length + '件はJSON比較では表示していません。</div>';
        }
        html += '</div>';
      } else if (!collapsedNow) {
        html += '<div class="drow-list">';
        html += diffRows.map((row) => renderDiffRowHtml(row, useCharDiff)).join('');
        if (sameRows.length && typeFilterValue !== 'same') {
          const openNow = sameOpen.has(g.key);
          html += '<button type="button" class="same-fold" data-same-fold="' + escHtml(g.key) + '" aria-expanded="' + (openNow ? 'true' : 'false') + '">'
            + '<span class="sec-caret">' + (openNow ? '▼' : '▶') + '</span>同一の設定 ' + sameRows.length + '件を' + (openNow ? '隠す' : '表示') + '</button>';
          if (openNow) html += sameRows.map((row) => renderDiffRowHtml(row, useCharDiff)).join('');
        } else if (sameRows.length) {
          html += sameRows.map((row) => renderDiffRowHtml(row, useCharDiff)).join('');
        }
        if (!diffRows.length && !sameRows.length) {
          html += '<div class="drow-empty">表示対象の行がありません。</div>';
        }
        html += '</div>';
      }
      html += '</section>';
    });
    diffNavigationTargets = nextNavigationTargets;
    if (!diffNavigationTargets.some((target) => target.key === diffFocusKey)) {
      const focusFallback = focusModeEnabled
        ? diffNavigationTargets.find((target) => {
          const row = rowLookup.get(target.key);
          return row && rowHasPendingReview(row);
        }) || diffNavigationTargets[0]
        : null;
      diffFocusKey = focusFallback ? focusFallback.key : '';
    }
    main.innerHTML = html;
    scheduleDiffStickyOffsetSync();
    focusDiffRow(diffFocusKey, { focus: false, scroll: false });
    syncDiffNavPosition();
    finishReportRender(viewState);
  }

  function reviewKeysForRow(row) {
    const keys = [];
    const add = (item) => {
      if (!isActionableReviewRow(item)) return;
      const key = rowStateKey(item);
      if (key && keys.indexOf(key) < 0) keys.push(key);
    };
    add(row);
    (row?.__childRows || []).forEach(add);
    return keys;
  }

  function isReviewRowComplete(row) {
    const key = rowStateKey(row);
    if (reviewedKeys.has(key)) return true;
    const childKeys = (row?.__childRows || [])
      .filter(isActionableReviewRow)
      .map((child) => rowStateKey(child));
    return childKeys.length > 0 && childKeys.every((childKey) => reviewedKeys.has(childKey));
  }

  function rowHasPendingReview(row) {
    return !isReviewRowComplete(row);
  }

  function renderedReviewKey(reviewKey) {
    if (diffNavigationTargets.some((target) => target.key === reviewKey)) return reviewKey;
    for (const [key, row] of rowLookup.entries()) {
      if (reviewKeysForRow(row).indexOf(reviewKey) >= 0) return key;
    }
    return '';
  }

  function nextPendingNavigationTarget(key) {
    const currentIndex = Math.max(0, diffNavigationTargets.findIndex((target) => target.key === key));
    const ordered = diffNavigationTargets.slice(currentIndex + 1).concat(diffNavigationTargets.slice(0, currentIndex));
    return ordered.find((target) => {
      const row = rowLookup.get(target.key);
      return row && rowHasPendingReview(row);
    }) || null;
  }

  function focusReviewCompletion(progress) {
    const message = progress.pending
      ? '現在の表示条件のレビューが完了しました。全体では未確認 ' + progress.pending + '件です'
      : 'すべてのレビューが完了しました';
    if (focusModeEnabled) {
      focusModeEnabled = false;
      applyDisplayModeClasses();
    }
    diffFocusKey = '';
    diffFocusIndex = -1;
    focusDiffRow('', { focus: false, scroll: false });
    syncDiffNavPosition();
    showToast(message);
    requestAnimationFrame(() => {
      const queue = document.querySelector('#reviewQueueHost .review-queue');
      if (queue && typeof queue.focus === 'function') {
        try { queue.focus({ preventScroll: true }); } catch (e) { queue.focus(); }
      }
    });
  }

  function reviewAndMoveNext(key) {
    const row = rowLookup.get(key);
    if (!row || !isActionableReviewRow(row)) return;
    const nextTarget = nextPendingNavigationTarget(key);
    reviewKeysForRow(row).forEach((reviewKey) => reviewedKeys.add(reviewKey));
    diffFocusKey = nextTarget ? nextTarget.key : '';
    render();
    const progress = syncReviewedStat(getDetailFilteredRows());
    if (!nextTarget) {
      focusReviewCompletion(progress);
      return;
    }
    requestAnimationFrame(() => {
      if (!focusDiffRow(nextTarget.key)) {
        focusReviewCompletion(progress);
        return;
      }
      syncDiffNavPosition();
      showToast('確認済みにしました。次の未確認差分へ移動しました');
    });
  }

  function applyDisplayModeClasses() {
    document.body.classList.toggle('diff-focus-mode', focusModeEnabled);
    document.body.classList.toggle('diff-density-compact', compactDensityEnabled);
    document.body.classList.toggle('mobile-toolbar-expanded', mobileToolbarExpanded);
    document.querySelectorAll('[data-focus-mode]').forEach((button) => {
      button.setAttribute('aria-pressed', focusModeEnabled ? 'true' : 'false');
      button.textContent = focusModeEnabled ? '集中表示を終了' : '集中表示';
    });
    document.querySelectorAll('[data-density-toggle]').forEach((button) => {
      button.setAttribute('aria-pressed', compactDensityEnabled ? 'true' : 'false');
      button.textContent = compactDensityEnabled ? '密度: コンパクト' : '密度: 標準';
    });
    document.querySelectorAll('[data-mobile-toolbar-toggle]').forEach((button) => {
      button.setAttribute('aria-expanded', mobileToolbarExpanded ? 'true' : 'false');
      button.textContent = mobileToolbarExpanded ? '条件を閉じる' : '条件を開く';
    });
    scheduleDiffStickyOffsetSync();
  }

  function jumpToReviewKey(key) {
    if (!key) return;
    typeFilterValue = 'all';
    sectionFilterValue = 'all';
    const search = document.getElementById('search');
    const hideReviewed = document.getElementById('hideReviewed');
    if (search) search.value = '';
    if (hideReviewed) hideReviewed.checked = false;
    const sourceRow = getDetailFilteredRows().find((row) => rowStateKey(row) === key);
    if (sourceRow) collapsed.delete(sourceRow.sectionKey || sourceRow.section || '未分類');
    diffFocusKey = '';
    render();
    requestAnimationFrame(() => {
      const renderedKey = renderedReviewKey(key);
      if (!renderedKey) {
        showToast('対象の差分を現在の表示で開けませんでした');
        return;
      }
      diffFocusKey = renderedKey;
      focusDiffRow(renderedKey);
      syncDiffNavPosition();
    });
  }

  function jumpToFirstPendingReview() {
    if (getActiveReportTab() !== 'diff') setActiveTab('diff');
    const firstPending = getDetailFilteredRows().find((row) => isActionableReviewRow(row) && rowHasPendingReview(row));
    if (!firstPending) {
      focusReviewCompletion(syncReviewedStat(getDetailFilteredRows()));
      return;
    }
    jumpToReviewKey(rowStateKey(firstPending));
  }

  function handleMainClick(e) {
    const mobileToolbarToggle = e.target.closest('[data-mobile-toolbar-toggle]');
    if (mobileToolbarToggle) {
      mobileToolbarExpanded = !mobileToolbarExpanded;
      applyDisplayModeClasses();
      return;
    }
    const reviewNext = e.target.closest('[data-review-next]');
    if (reviewNext) {
      reviewAndMoveNext(reviewNext.getAttribute('data-review-next') || '');
      return;
    }
    const reviewJump = e.target.closest('[data-review-jump]');
    if (reviewJump) {
      jumpToReviewKey(reviewJump.getAttribute('data-review-jump') || '');
      return;
    }
    const densityToggle = e.target.closest('[data-density-toggle]');
    if (densityToggle) {
      compactDensityEnabled = !compactDensityEnabled;
      applyDisplayModeClasses();
      return;
    }
    const focusModeToggle = e.target.closest('[data-focus-mode]');
    if (focusModeToggle) {
      focusModeEnabled = !focusModeEnabled;
      let focusTarget = null;
      if (focusModeEnabled) {
        focusTarget = diffNavigationTargets.find((target) => target.key === diffFocusKey)
          || diffNavigationTargets.find((target) => {
          const row = rowLookup.get(target.key);
          return row && rowHasPendingReview(row);
        }) || diffNavigationTargets[0] || null;
        if (focusTarget) {
          diffFocusKey = focusTarget.key;
          collapsed.delete(focusTarget.sectionKey);
        }
      }
      applyDisplayModeClasses();
      if (focusModeEnabled && focusTarget) {
        render();
        requestAnimationFrame(() => focusDiffRow(focusTarget.key));
      }
      return;
    }
    const clearFilter = e.target.closest('[data-clear-filter]');
    if (clearFilter) {
      const key = clearFilter.getAttribute('data-clear-filter') || '';
      const clearAll = key === 'all';
      if (clearAll || key === 'type') typeFilterValue = 'all';
      if (clearAll || key === 'section') sectionFilterValue = 'all';
      if (clearAll || key === 'search') document.getElementById('search').value = '';
      if (clearAll || key === 'hideSame') document.getElementById('hideSame').checked = false;
      if (clearAll || key === 'hideReviewed') document.getElementById('hideReviewed').checked = false;
      if (clearAll || key === 'extraIgnore') {
        const input = document.getElementById('extraIgnoreKeys');
        if (input) input.value = '';
        extraIgnoreRules = null;
      }
      if (clearAll || key === 'presets') {
        activePresetKeys.clear();
        document.querySelectorAll('[data-preset-toggle]:not(:disabled)').forEach((cb) => { cb.checked = false; });
      }
      render();
      requestAnimationFrame(() => {
        const focusTarget = key === 'type'
          ? document.querySelector('[data-type-chip="all"]')
          : key === 'section'
            ? document.getElementById('diffSectionSel')
          : document.getElementById('search');
        const visibleTarget = focusTarget && focusTarget.offsetParent !== null
          ? focusTarget
          : document.getElementById('mobileSidebarToggle');
        if (visibleTarget && typeof visibleTarget.focus === 'function') visibleTarget.focus();
      });
      return;
    }
    const chip = e.target.closest('[data-type-chip]');
    if (chip) {
      const next = chip.getAttribute('data-type-chip') || 'all';
      typeFilterValue = typeFilterValue === next ? 'all' : next;
      const focusType = typeFilterValue;
      render();
      requestAnimationFrame(() => {
        const target = document.querySelector('[data-type-chip="' + focusType + '"]');
        if (target && typeof target.focus === 'function') target.focus();
      });
      return;
    }
    const navBtn = e.target.closest('[data-diff-nav]');
    if (navBtn) {
      moveDiffFocus(navBtn.getAttribute('data-diff-nav') === 'prev' ? -1 : 1);
      return;
    }
    const copyPathBtn = e.target.closest('[data-copy-path]');
    if (copyPathBtn) {
      copyTextToClipboard(copyPathBtn.getAttribute('data-copy-path') || '', 'パスをコピーしました');
      return;
    }
    const copyValBtn = e.target.closest('[data-copy-row]');
    if (copyValBtn) {
      const row = rowLookup.get(copyValBtn.getAttribute('data-copy-row') || '');
      if (row) {
        const payload = {
          セクション: SECTION_LABEL_MAP[row.sectionKey || ''] || row.section || row.sectionKey || '',
          種別: diffTypeLabel(row.type, row.moved),
          パス: row.path || '',
          比較元: row.left === undefined ? null : row.left,
          比較先: row.right === undefined ? null : row.right
        };
        let text;
        try { text = JSON.stringify(payload, null, 2); } catch (err) { text = String(row.path || ''); }
        copyTextToClipboard(text, '差分の値をコピーしました');
      }
      return;
    }
    const fold = e.target.closest('[data-same-fold]');
    if (fold) {
      const key = fold.getAttribute('data-same-fold') || '';
      if (sameOpen.has(key)) sameOpen.delete(key);
      else sameOpen.add(key);
      render();
      return;
    }
    const reveal = e.target.closest('[data-row-toggle]');
    if (reveal) {
      const key = reveal.getAttribute('data-row-toggle') || '';
      if (expandedVals.has(key)) expandedVals.delete(key);
      else expandedVals.add(key);
      render();
      return;
    }
    const head = e.target.closest('[data-sec-toggle]');
    if (head) {
      const key = head.getAttribute('data-sec-toggle') || '';
      if (collapsed.has(key)) collapsed.delete(key);
      else collapsed.add(key);
      render();
    }
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

  window.__diffReport = { render, toggleTheme, collapseAll, expandAll, setActiveTab };

  function isMobileSidebarViewport() {
    return !!(window.matchMedia && window.matchMedia('(max-width: 1080px)').matches);
  }

  function isMobileSidebarOpen() {
    const aside = document.querySelector('aside');
    return !!(aside && aside.classList.contains('is-open'));
  }

  function mobileSidebarFocusable() {
    const panel = document.getElementById('sidebarPanels');
    return panel
      ? Array.from(panel.querySelectorAll('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], summary, [tabindex]:not([tabindex="-1"])'))
        .filter((element) => !element.hidden && element.getClientRects().length > 0)
      : [];
  }

  function closeMobileSidebar(restoreFocus) {
    const aside = document.querySelector('aside');
    const panel = document.getElementById('sidebarPanels');
    const backdrop = document.getElementById('sidebarBackdrop');
    const main = document.querySelector('main');
    if (aside) aside.classList.remove('is-open');
    document.body.classList.remove('sidebar-drawer-open');
    if (panel) {
      panel.removeAttribute('role');
      panel.removeAttribute('aria-modal');
      panel.removeAttribute('aria-labelledby');
    }
    if (backdrop) backdrop.hidden = true;
    if (main) main.removeAttribute('inert');
    if (mobileSidebarToggle) {
      mobileSidebarToggle.setAttribute('aria-expanded', 'false');
      mobileSidebarToggle.textContent = '条件・出力';
    }
    if (restoreFocus !== false && mobileSidebarReturnFocus && typeof mobileSidebarReturnFocus.focus === 'function') {
      mobileSidebarReturnFocus.focus();
    }
    window.scrollTo(0, mobileSidebarScrollY);
    mobileSidebarReturnFocus = null;
  }

  function openMobileSidebar() {
    if (!isMobileSidebarViewport()) return;
    const aside = document.querySelector('aside');
    const panel = document.getElementById('sidebarPanels');
    const backdrop = document.getElementById('sidebarBackdrop');
    const main = document.querySelector('main');
    if (!aside || !panel) return;
    mobileSidebarReturnFocus = document.activeElement;
    mobileSidebarScrollY = window.scrollY || 0;
    aside.classList.add('is-open');
    document.body.classList.add('sidebar-drawer-open');
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-labelledby', 'sidebarDrawerTitle');
    if (backdrop) backdrop.hidden = false;
    if (main) main.setAttribute('inert', '');
    if (mobileSidebarToggle) {
      mobileSidebarToggle.setAttribute('aria-expanded', 'true');
      mobileSidebarToggle.textContent = '閉じる';
    }
    requestAnimationFrame(() => {
      const closeButton = document.getElementById('sidebarDrawerClose');
      const first = closeButton || mobileSidebarFocusable()[0] || panel;
      if (first && typeof first.focus === 'function') first.focus();
      window.scrollTo(0, mobileSidebarScrollY);
    });
  }

  window.addEventListener('resize', () => {
    scheduleDiffStickyOffsetSync();
    if (!isMobileSidebarViewport() && isMobileSidebarOpen()) closeMobileSidebar(false);
  });

  const mobileSidebarToggle = document.getElementById('mobileSidebarToggle');
  if (mobileSidebarToggle) {
    mobileSidebarToggle.onclick = () => {
      if (isMobileSidebarOpen()) closeMobileSidebar(true);
      else openMobileSidebar();
    };
  }
  const mobileSidebarClose = document.getElementById('sidebarDrawerClose');
  if (mobileSidebarClose) mobileSidebarClose.onclick = () => closeMobileSidebar(true);
  const mobileSidebarBackdrop = document.getElementById('sidebarBackdrop');
  if (mobileSidebarBackdrop) mobileSidebarBackdrop.onclick = () => closeMobileSidebar(true);

  document.getElementById('hideSame').onchange = onReportFilterChange;
  document.getElementById('charDiff').onchange = onReportFilterChange;
  document.getElementById('hideUnchangedLines').onchange = onReportFilterChange;
  const rawJsonInput = document.getElementById('rawJson');
  if (rawJsonInput) rawJsonInput.onchange = onReportFilterChange;
  document.getElementById('hideReviewed').onchange = onReportFilterChange;
  document.querySelectorAll('input[name="viewSide"]').forEach((radio) => {
    radio.addEventListener('change', () => {
      if (!radio.checked) return;
      viewSideValue = radio.value === 'source' || radio.value === 'target' ? radio.value : 'both';
      onReportFilterChange();
    });
  });
  const searchInput = document.getElementById('search');
  if (searchInput) {
    searchInput.addEventListener('compositionstart', () => {
      searchCompositionActive = true;
      cancelScheduledReportSearch();
      setReportRenderBusy(false);
    });
    searchInput.addEventListener('compositionend', () => {
      searchCompositionActive = false;
      scheduleReportSearchRender();
    });
    searchInput.addEventListener('input', (event) => {
      if (searchCompositionActive || event.isComposing) return;
      scheduleReportSearchRender();
    });
  }
  document.getElementById('themeBtn').onclick = toggleTheme;
  document.getElementById('collapseBtn').onclick = collapseAll;
  document.getElementById('expandBtn').onclick = expandAll;
  document.getElementById('csvBtn').onclick = exportVisibleRowsAsCsv;
  document.getElementById('mdBtn').onclick = copyVisibleRowsAsMarkdown;
  const reviewStateSaveBtn = document.getElementById('reviewStateSaveBtn');
  const reviewStateLoadBtn = document.getElementById('reviewStateLoadBtn');
  const reviewStateFile = document.getElementById('reviewStateFile');
  if (reviewStateSaveBtn) reviewStateSaveBtn.onclick = saveReviewStateJson;
  if (reviewStateLoadBtn && reviewStateFile) {
    reviewStateLoadBtn.onclick = () => reviewStateFile.click();
    reviewStateFile.onchange = async () => {
      const file = reviewStateFile.files && reviewStateFile.files[0];
      reviewStateLoadBtn.disabled = true;
      try {
        await loadReviewStateJson(file);
      } finally {
        // 同じファイルを続けて選択しても change が発火するよう必ずリセットする。
        reviewStateFile.value = '';
        reviewStateLoadBtn.disabled = false;
        reviewStateLoadBtn.focus();
      }
    };
  }
  const reflectJsonBtn = document.getElementById('reflectJsonBtn');
  const reflectJsonCopyBtn = document.getElementById('reflectJsonCopyBtn');
  const srcJsonBtn = document.getElementById('srcJsonBtn');
  const tgtJsonBtn = document.getElementById('tgtJsonBtn');
  const settingsLikeRoot = document.getElementById('settingsLikeRoot');
  if (reflectJsonBtn) reflectJsonBtn.onclick = () => exportReflectJson(false);
  if (reflectJsonCopyBtn) reflectJsonCopyBtn.onclick = () => exportReflectJson(true);
  if (srcJsonBtn) srcJsonBtn.onclick = () => exportComparedBundleJson('source');
  if (tgtJsonBtn) tgtJsonBtn.onclick = () => exportComparedBundleJson('target');
  if (settingsLikeRoot) settingsLikeRoot.addEventListener('change', handleSelectionChange);
  const extraIgnoreInput = document.getElementById('extraIgnoreKeys');
  if (extraIgnoreInput) {
    extraIgnoreInput.addEventListener('input', () => {
      extraIgnoreRules = parseExtraIgnoreRules(extraIgnoreInput.value);
      onReportFilterChange();
    });
  }
  document.querySelectorAll('[data-preset-toggle]').forEach((cb) => {
    cb.addEventListener('change', () => {
      const key = cb.getAttribute('data-preset-toggle') || '';
      if (cb.checked) activePresetKeys.add(key);
      else activePresetKeys.delete(key);
      onReportFilterChange();
    });
  });
  function handleSelectionChange(e) {
    const selectToggle = e.target && e.target.closest ? e.target.closest('[data-select-toggle]') : null;
    if (selectToggle) {
      if (!CAN_BUILD_REFLECT_JSON) {
        selectToggle.checked = false;
        showToast(REFLECT_JSON_BLOCK_REASON);
        return true;
      }
      const key = selectToggle.getAttribute('data-select-toggle') || '';
      const row = rowLookup.get(key);
      if (selectToggle.checked && row) selectedRows.set(key, row);
      else selectedRows.delete(key);
      const label = selectToggle.closest('.row-select');
      if (label) label.classList.toggle('is-on', selectToggle.checked);
      syncSelectedStat();
      return true;
    }
    const selectField = e.target && e.target.closest ? e.target.closest('[data-select-field]') : null;
    if (selectField) {
      if (!CAN_BUILD_REFLECT_JSON) {
        selectField.checked = false;
        showToast(REFLECT_JSON_BLOCK_REASON);
        return true;
      }
      const code = selectField.getAttribute('data-select-field') || '';
      if (selectField.checked && fieldCodeHasActualDiff(code)) selectedFieldCodes.add(code);
      else selectedFieldCodes.delete(code);
      const label = selectField.closest('.row-select');
      if (label) label.classList.toggle('is-on', selectField.checked);
      syncSelectedStat();
      return true;
    }
    return false;
  }

  document.getElementById('main').addEventListener('change', (e) => {
    if (handleSelectionChange(e)) return;
    if (e.target && e.target.id === 'diffSortSel') {
      diffSortValue = e.target.value || 'standard';
      render();
      requestAnimationFrame(() => document.getElementById('diffSortSel')?.focus());
      return;
    }
    if (e.target && e.target.id === 'diffSectionSel') {
      sectionFilterValue = e.target.value || 'all';
      render();
      requestAnimationFrame(() => document.getElementById('diffSectionSel')?.focus());
      return;
    }
    const reviewToggle = e.target && e.target.closest ? e.target.closest('[data-review-toggle]') : null;
    if (reviewToggle) {
      const key = reviewToggle.getAttribute('data-review-toggle') || '';
      const row = rowLookup.get(key);
      const hideReviewed = !!(document.getElementById('hideReviewed') || {}).checked;
      if (reviewToggle.checked && hideReviewed) {
        reviewAndMoveNext(key);
        return;
      }
      const reviewKeys = row ? reviewKeysForRow(row) : [key];
      reviewKeys.forEach((reviewKey) => {
        if (reviewToggle.checked) reviewedKeys.add(reviewKey);
        else reviewedKeys.delete(reviewKey);
      });
      render();
      requestAnimationFrame(() => {
        const nextToggle = Array.from(document.querySelectorAll('[data-review-toggle]'))
          .find((input) => input.getAttribute('data-review-toggle') === key);
        if (nextToggle && typeof nextToggle.focus === 'function') nextToggle.focus();
      });
    }
  });
  document.getElementById('main').addEventListener('click', handleMainClick);
  const startPendingReviewBtn = document.getElementById('startPendingReviewBtn');
  if (startPendingReviewBtn) startPendingReviewBtn.onclick = jumpToFirstPendingReview;
  document.getElementById('main').addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const head = e.target.closest ? e.target.closest('[data-sec-toggle]') : null;
    if (!head) return;
    e.preventDefault();
    handleMainClick({ target: head });
  });
  document.querySelectorAll('[data-report-tab]').forEach((btn) => {
    btn.onclick = () => setActiveTab(btn.getAttribute('data-report-tab'));
    btn.onkeydown = (e) => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
      e.preventDefault();
      const tabs = Array.from(document.querySelectorAll('[data-report-tab]'));
      const current = tabs.indexOf(btn);
      const nextIndex = e.key === 'Home'
        ? 0
        : e.key === 'End'
          ? tabs.length - 1
          : (current + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
      const next = tabs[nextIndex];
      if (!next) return;
      setActiveTab(next.getAttribute('data-report-tab'));
      next.focus();
    };
  });

  document.addEventListener('keydown', (e) => {
    if (isMobileSidebarOpen()) {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeMobileSidebar(true);
        return;
      }
      if (e.key === 'Tab') {
        const panel = document.getElementById('sidebarPanels');
        const focusable = mobileSidebarFocusable();
        if (panel && focusable.length) {
          const first = focusable[0];
          const last = focusable[focusable.length - 1];
          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
          } else if (!panel.contains(document.activeElement)) {
            e.preventDefault();
            first.focus();
          }
        }
        return;
      }
    }
    if (e.key === 'Escape' && detailModalOpen) {
      e.preventDefault();
      closeFieldDetailModal();
      return;
    }
    if (e.key === 'Tab' && detailModalOpen) {
      const modal = document.getElementById('fieldDetailModal');
      const dialog = modal && modal.querySelector('[role="dialog"]');
      const focusable = dialog ? Array.from(dialog.querySelectorAll('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')) : [];
      if (focusable.length) {
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        } else if (!dialog.contains(document.activeElement)) {
          e.preventDefault();
          first.focus();
        }
      }
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
      e.preventDefault();
      if (focusModeEnabled) {
        focusModeEnabled = false;
        applyDisplayModeClasses();
      }
      if (isMobileSidebarViewport()) {
        if (!isMobileSidebarOpen()) openMobileSidebar();
        requestAnimationFrame(() => document.getElementById('search')?.focus());
      } else {
        document.getElementById('search').focus();
      }
      return;
    }
    const shortcutTarget = e.target && e.target.closest ? e.target : null;
    const inInteractiveTarget = !!(shortcutTarget && (
      /^(INPUT|TEXTAREA|SELECT|BUTTON|A|SUMMARY)$/.test(shortcutTarget.tagName || '')
      || shortcutTarget.isContentEditable
      || shortcutTarget.closest('button,a,summary,[contenteditable]:not([contenteditable="false"])')
    ));
    const commonShortcutBlocked = !!(e.isComposing || e.repeat || inInteractiveTarget);
    if (!commonShortcutBlocked && !e.ctrlKey && !e.metaKey && !e.altKey && getActiveReportTab() === 'diff') {
      if (e.key === 'j') { e.preventDefault(); moveDiffFocus(1); return; }
      if (e.key === 'k') { e.preventDefault(); moveDiffFocus(-1); return; }
    }
    const reviewShortcutBlocked = !!(
      commonShortcutBlocked
      || e.ctrlKey
      || e.metaKey
      || e.altKey
    );
    if (!reviewShortcutBlocked && String(e.key || '').toLowerCase() === 'r' && getActiveReportTab() === 'diff') {
      const activeRow = document.activeElement && document.activeElement.closest
        ? document.activeElement.closest('[data-diff-row-key]')
        : null;
      const key = diffFocusKey || activeRow?.getAttribute('data-diff-row-key') || '';
      if (key) {
        e.preventDefault();
        reviewAndMoveNext(key);
      } else {
        showToast('J/Kキーで確認する差分を選択してください');
      }
      return;
    }
    if (e.key === 'Escape') {
      if (e.isComposing || e.repeat) return;
      if (commonShortcutBlocked && e.target !== document.getElementById('search')) return;
      const search = document.getElementById('search');
      if (!search || !String(search.value || '')) return;
      e.preventDefault();
      search.value = '';
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
  setActiveTab(safeStorageGet(ACTIVE_TAB_KEY) || 'diff');
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
      --focus:0 0 0 3px rgba(37,99,235,.35);--diff-toolbar-offset:64px;
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
      overflow-y:auto;backdrop-filter:saturate(1.1) blur(8px);
    }
    .sidebar-panels{display:flex;flex:1;min-height:0;flex-direction:column}
    .sidebar-drawer-head,.sidebar-backdrop{display:none}
    main{flex:1;overflow:auto;padding:28px 32px 40px;min-width:0}
    .sb-head{position:relative;padding:20px 18px 16px;border-bottom:1px solid var(--border);background:linear-gradient(165deg,var(--card) 0%,var(--card-soft) 100%)}
    .sb-head-row{display:flex;align-items:center;justify-content:space-between;gap:12px}
    .mobile-filter-toggle{display:none;border:1px solid var(--accent);border-radius:999px;background:var(--accent-soft);color:var(--accent-strong);padding:7px 11px;font-size:11px;font-weight:800;cursor:pointer}
    .mobile-filter-toggle:focus-visible{outline:none;box-shadow:var(--focus)}
    .sb-kicker{display:inline-flex;align-items:center;gap:6px;padding:5px 11px;border-radius:999px;background:var(--accent-soft);color:var(--accent-strong);font-size:10px;font-weight:800;letter-spacing:.06em;text-transform:uppercase}
    .sb-title{margin-top:12px;font-size:21px;font-weight:800;color:var(--fg);letter-spacing:-.02em}
    .sb-meta{font-size:11px;color:var(--muted);margin-top:10px;line-height:1.75}
    .sb-panel{margin:12px 14px;border:1px solid var(--border);border-radius:16px;background:var(--card);box-shadow:var(--shadow)}
    .sb-stats{padding:14px 16px;font-size:12px;line-height:1.9}
    .sb-stat-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px 14px}
    .sb-stat{display:flex;justify-content:space-between;gap:8px;padding:8px 0;border-bottom:1px dashed var(--border)}
    .sb-stat:nth-last-child(-n+2){border-bottom:none}
    .sb-stat b{font-weight:800;color:var(--fg);font-variant-numeric:tabular-nums}
    .sidebar-review-progress{display:flex;flex-direction:column;gap:7px;margin-bottom:12px;padding-bottom:12px;border-bottom:1px solid var(--border)}
    .sidebar-review-progress--solo{margin-bottom:0;padding-bottom:0;border-bottom:0}
    .review-state-transfer-actions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px;margin-top:14px}
    .review-state-transfer-actions .btn{min-width:0;padding-inline:7px;line-height:1.35}
    .review-state-status{grid-column:1/-1;margin:0;font-size:10px;line-height:1.5;color:var(--muted)}
    .review-state-status.is-error{color:#b91c1c;font-weight:700}
    body.dark .review-state-status.is-error{color:#fca5a5}
    .sb-ctrl{padding:16px}
    .sidebar-count-details>summary{display:flex;align-items:center;min-height:36px;color:var(--accent-strong);font-size:11px;font-weight:800;cursor:pointer;list-style:none}
    .sidebar-count-details>summary::-webkit-details-marker{display:none}
    .sidebar-count-details>summary::before{content:"▸";margin-right:7px;color:var(--muted);font-size:9px}
    .sidebar-count-details[open]>summary::before{transform:rotate(90deg)}
    .sidebar-count-details .sb-stat-grid{margin-top:8px}
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
    button:disabled,.btn:disabled,.tchip:disabled,.row-act:disabled,select:disabled,input:disabled{cursor:not-allowed!important;box-shadow:none!important;filter:saturate(.25);opacity:.58}
    .chk:has(input:disabled),.vs-opt:has(input:disabled),.row-select:has(input:disabled){color:var(--muted)!important;cursor:not-allowed!important;opacity:.62}
    .btn.primary{background:linear-gradient(180deg,#3b82f6,var(--accent));color:#fff;border-color:#1d4ed8;box-shadow:0 2px 8px rgba(37,99,235,.35)}
    .btn.primary:hover{filter:brightness(1.06)}
    body.dark .btn.primary{background:linear-gradient(180deg,#60a5fa,var(--accent));border-color:#2563eb}
    #navWrap{flex:1;min-height:0;display:flex;flex-direction:column;border-top:1px solid var(--border);margin-top:4px;padding-top:8px}
    .nav-label{padding:4px 18px 8px;font-size:10px;font-weight:800;letter-spacing:.05em;color:var(--muted);text-transform:uppercase}
    #nav{flex:1;overflow:auto;padding:0 10px 20px;scrollbar-width:thin;scrollbar-color:var(--border) transparent}
    #nav::-webkit-scrollbar{width:6px}
    #nav::-webkit-scrollbar-thumb{background:var(--border);border-radius:999px}
    .nav-item{display:flex;width:calc(100% - 8px);justify-content:space-between;align-items:center;padding:11px 14px;font:inherit;font-size:12px;text-align:left;cursor:pointer;border-radius:12px;margin:3px 4px;color:var(--fg);background:transparent;border:1px solid transparent;transition:background .15s,border-color .15s,transform .1s}
    .nav-item:hover{background:var(--card);border-color:var(--border);box-shadow:var(--shadow)}
    .nav-item:active{transform:scale(.99)}
    .nav-item:focus-visible{outline:none;box-shadow:var(--focus)}
    .nav-item-meta{display:inline-flex;align-items:center;gap:5px;flex:0 0 auto}
    .badge{display:inline-block;min-width:26px;text-align:center;padding:3px 9px;border-radius:999px;background:var(--accent-soft);color:var(--accent-strong);font-size:10px;font-weight:800;font-variant-numeric:tabular-nums}
    .topbar{
      display:flex;align-items:flex-start;justify-content:space-between;gap:16px;padding:17px 20px 18px;border:1px solid var(--header-border);
      border-radius:20px;background:linear-gradient(135deg,var(--header) 0%,var(--card-soft) 100%);box-shadow:var(--shadow);position:relative;overflow:hidden
    }
    .topbar::before{content:"";position:absolute;left:0;top:0;right:0;height:3px;background:linear-gradient(90deg,var(--accent),#06b6d4,var(--accent-strong))}
    .topbar-main{display:flex;flex:1;flex-direction:column;gap:8px;min-width:0}
    .topbar-eyebrow-row{display:flex;align-items:center;justify-content:space-between;gap:12px;min-width:0}
    .topbar-title{font-size:clamp(1.12rem,2.2vw,1.42rem);font-weight:800;line-height:1.3;letter-spacing:-.02em;color:var(--fg)}
    .topbar-compare{display:grid;grid-template-columns:minmax(0,1fr) auto minmax(0,1fr);align-items:stretch;gap:9px;width:min(860px,100%)}
    .topbar-app-card{display:grid;grid-template-columns:auto auto minmax(0,1fr);align-items:center;gap:7px;padding:8px 11px;border:1px solid var(--border);border-top:3px solid var(--muted);border-radius:11px;background:var(--card);min-width:0}
    .topbar-app-card--source{border-top-color:#475569;background:linear-gradient(180deg,#f8fafc,var(--card))}
    .topbar-app-card--target{border-top-color:#2563eb;background:linear-gradient(180deg,#eff6ff,var(--card))}
    body.dark .topbar-app-card--source{background:linear-gradient(180deg,#1e293b,var(--card))}
    body.dark .topbar-app-card--target{background:linear-gradient(180deg,#172554,var(--card))}
    .topbar-app-eyebrow{font-size:9px;font-weight:900;letter-spacing:.08em;color:var(--fg)}
    .topbar-app-side{font-size:10px;font-weight:800;color:var(--muted);white-space:nowrap}
    .topbar-app-card strong{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px;color:var(--fg)}
    .topbar-arrow{display:grid;place-items:center;color:var(--accent);font-size:18px;font-weight:900;transition:transform .15s}
    .topbar-desc{font-size:11px;color:var(--muted);line-height:1.55;max-width:92ch}
    .topbar-desc b{color:var(--fg)}
    .header-badge{display:inline-flex;align-items:center;gap:6px;flex:0 0 auto;white-space:nowrap;writing-mode:horizontal-tb;border:1px solid var(--border);background:var(--card-soft);border-radius:999px;padding:6px 11px;font-size:10px;font-weight:700;color:var(--muted)}
    .settings-shell{margin-top:14px;border:1px solid var(--border);border-radius:20px;background:var(--card);box-shadow:var(--shadow)}
    .settings-tabs{display:flex;gap:6px;align-items:center;flex-wrap:wrap;padding:10px 14px;border-bottom:1px solid var(--border);background:linear-gradient(180deg,var(--card-soft) 0%,var(--card) 100%);border-radius:20px 20px 0 0}
    .settings-tab{
      padding:8px 16px;border-radius:999px;background:var(--accent-soft);color:var(--accent-strong);font-size:12px;font-weight:800;
      border:1px solid transparent;cursor:pointer;transition:background .15s,border-color .15s,color .15s,transform .1s
    }
    .settings-tab.passive{background:transparent;color:var(--muted);border-color:var(--border);font-weight:700}
    .settings-tab.passive:hover{border-color:var(--accent-soft);color:var(--fg)}
    .settings-tab:focus-visible{outline:none;box-shadow:var(--focus)}
    .settings-tab:active:not(.passive){transform:scale(.98)}
    .tab-pane[hidden]{display:none!important}
    .warn{font-size:11px;color:#b45309;margin-top:10px;padding:10px 12px;border-radius:10px;background:#fffbeb;border:1px solid #fde68a;line-height:1.6}
    body.dark .warn{color:#fbbf24;background:#422006;border-color:#92400e}
    .report-notices{display:flex;flex-direction:column;gap:8px;margin-bottom:10px}
    .report-notices .warn{margin-top:0}
    .issue-box{margin:0;border:1px solid #fdba74;border-radius:16px;background:#fff7ed;padding:12px 18px;box-shadow:0 4px 16px -4px rgba(180,83,9,.15)}
    body.dark .issue-box{background:#1c1410;border-color:#78350f}
    .issue-box>summary{cursor:pointer;font-size:13px;font-weight:800;color:#9a3412;padding:4px 0}
    body.dark .issue-box>summary{color:#fb923c}
    .issue-box table{width:100%;border-collapse:collapse;font-size:11px}
    .issue-box th,.issue-box td{border-bottom:1px solid var(--border);padding:10px 12px;text-align:left;vertical-align:top}
    .issue-box th{font-size:10px;text-transform:uppercase;letter-spacing:.04em;color:var(--muted)}
    .issue-box .msg{white-space:pre-wrap;word-break:break-word;font-family:ui-monospace,SFMono-Regular,Menlo,monospace}
    .content{padding:14px}
    #reviewQueueHost{margin-bottom:10px}
    .review-queue{display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:10px;padding:10px 13px;border:1px solid var(--border);border-radius:14px;background:linear-gradient(135deg,var(--card),var(--card-soft));box-shadow:var(--shadow)}
    .review-queue--alert{border-color:#fca5a5;background:linear-gradient(135deg,#fff7f7,#fff)}
    .review-queue--watch{border-color:#fcd34d;background:linear-gradient(135deg,#fffbeb,#fff)}
    .review-queue--clear{border-color:#86efac;background:linear-gradient(135deg,#f0fdf4,#fff)}
    body.dark .review-queue--alert{background:linear-gradient(135deg,#2b1014,var(--card));border-color:#7f1d1d}
    body.dark .review-queue--watch{background:linear-gradient(135deg,#2a2008,var(--card));border-color:#78350f}
    body.dark .review-queue--clear{background:linear-gradient(135deg,#052e16,var(--card));border-color:#166534}
    .review-queue-mark{display:grid;place-items:center;width:36px;height:36px;border-radius:11px;background:var(--fg);color:var(--card);font-size:19px;font-weight:900}
    .review-queue--alert .review-queue-mark{background:#dc2626;color:#fff}
    .review-queue--watch .review-queue-mark{background:#d97706;color:#fff}
    .review-queue--clear .review-queue-mark{background:#16a34a;color:#fff}
    .review-queue-main{display:flex;flex-direction:column;gap:2px;min-width:0}
    .review-queue-kicker{font-size:9px;font-weight:900;letter-spacing:.09em;color:var(--muted);text-transform:uppercase}
    .review-queue-main>strong{font-size:14px;line-height:1.3;color:var(--fg)}
    .review-queue-note{font-size:11px;color:var(--muted);font-variant-numeric:tabular-nums}
    .review-progress{display:flex;flex-direction:column;gap:4px;min-width:0}
    .review-progress--queue{max-width:430px;margin-top:3px}
    .review-progress-copy{display:flex;align-items:center;justify-content:space-between;gap:10px;font-size:9px;color:var(--muted)}
    .review-progress-copy strong{font-size:10px;color:var(--fg);font-variant-numeric:tabular-nums;white-space:nowrap}
    .review-progress-track{height:6px;border-radius:999px;background:var(--border);overflow:hidden}
    .review-progress-track>span{display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,var(--accent),#06b6d4);transition:width .2s ease}
    .review-progress-note{font-size:8px;line-height:1.45;color:var(--muted)}
    .review-queue-samples{display:flex;gap:4px;flex-wrap:wrap;margin-top:3px}
    .review-queue-samples button{max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding:2px 7px;border:1px solid var(--border);border-radius:999px;background:var(--card);font-size:9px;color:var(--fg);cursor:pointer}
    .review-queue-samples button:hover{border-color:var(--accent)}
    .review-queue-samples button:focus-visible{outline:none;box-shadow:var(--focus)}
    .review-queue-actions{display:flex;flex-direction:column;align-items:stretch;gap:5px}
    .review-queue-action{border:1px solid var(--accent);border-radius:9px;background:var(--accent);color:#fff;padding:8px 11px;font-size:10px;font-weight:800;cursor:pointer;white-space:nowrap}
    .review-queue-action--secondary{background:var(--card);color:var(--accent-strong)}
    .review-queue-action:hover{filter:brightness(1.07)}
    .review-queue-action:focus-visible{outline:none;box-shadow:var(--focus)}
    .diff-toolbar{position:sticky;top:0;z-index:6;display:flex;flex-direction:column;gap:6px;margin-bottom:12px;padding:8px 11px;border:1px solid var(--border);border-top:3px solid var(--accent);border-radius:14px;background:var(--card);background:color-mix(in srgb,var(--card) 95%,transparent);box-shadow:0 8px 24px rgba(15,23,42,.1);backdrop-filter:blur(12px)}
    .diff-toolbar-heading{display:flex;align-items:center;justify-content:space-between;gap:12px;padding-bottom:5px;border-bottom:1px solid var(--border)}
    .diff-toolbar-heading>.diff-toolbar-title{display:flex;flex-direction:column;gap:1px}
    .diff-toolbar-heading strong{font-size:12px;color:var(--fg)}
    .diff-toolbar-heading>.diff-toolbar-title span{font-size:9px;color:var(--muted)}
    .focus-context{display:none;align-items:center;gap:8px;min-width:0;padding:7px 9px;border:1px solid var(--accent);border-radius:10px;background:var(--accent-soft);color:var(--accent-strong)}
    .focus-context-pair{display:flex;align-items:center;gap:7px;min-width:0;flex:1}
    .focus-context-side{display:flex;align-items:center;gap:5px;min-width:0}
    .focus-context-side small{flex:0 0 auto;font-size:8px;font-weight:900;letter-spacing:.06em}
    .focus-context-pair b{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:11px}
    .focus-context-pair i{flex:0 0 auto;font-style:normal;font-weight:900}
    .focus-context-stat{display:inline-flex;align-items:center;gap:4px;flex:0 0 auto;padding:3px 7px;border-radius:999px;background:var(--card);font-size:9px;color:var(--muted);white-space:nowrap}
    .focus-context-stat strong{font-size:10px;color:var(--fg);font-variant-numeric:tabular-nums}
    .diff-scope-counts{display:flex;align-items:center;gap:5px;flex-wrap:wrap;justify-content:flex-end}
    .diff-scope-counts span{display:inline-flex;align-items:center;gap:3px;padding:3px 7px;border:1px solid var(--border);border-radius:999px;background:var(--card-soft);font-size:9px;font-weight:700;color:var(--muted);white-space:nowrap}
    .diff-scope-counts b{font-size:10px;color:var(--fg);font-variant-numeric:tabular-nums}
    .mobile-toolbar-toggle{display:none;border:1px solid var(--accent);border-radius:999px;background:var(--accent-soft);color:var(--accent-strong);padding:5px 9px;font-size:9px;font-weight:800;cursor:pointer}
    .mobile-toolbar-toggle:focus-visible{outline:none;box-shadow:var(--focus)}
    .diff-toolbar-row{display:flex;flex-wrap:wrap;gap:6px;align-items:center}
    .diff-toolbar-row--navigation{padding-top:1px}
    .diff-toolbar-spacer{flex:1}
    .diff-toolbar-label{min-width:44px;font-size:10px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;color:var(--muted);margin-right:2px}
    .diff-sort{display:inline-flex;align-items:center;gap:6px;font-size:10px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;color:var(--muted)}
    .diff-sort select{padding:6px 8px;border:1px solid var(--border);border-radius:8px;background:var(--card-soft);color:var(--fg);font-size:11px;font-weight:600;cursor:pointer}
    .diff-sort select:focus-visible{outline:none;box-shadow:var(--focus)}
    .diff-toolbar-count{font-size:11px;color:var(--muted);font-weight:700;white-space:nowrap}
    .diff-toolbar-count b{color:var(--fg);font-variant-numeric:tabular-nums}
    .diff-nav-position{min-width:96px;text-align:center;font-size:11px;color:var(--muted);font-weight:800;font-variant-numeric:tabular-nums;white-space:nowrap}
    .diff-display-modes{display:inline-flex;align-items:center;gap:5px}
    .tchip{display:inline-flex;align-items:center;gap:7px;padding:6px 12px;border-radius:999px;border:1px solid var(--border);background:var(--card-soft);color:var(--fg);font-size:11px;font-weight:700;cursor:pointer;transition:border-color .15s,background .15s,transform .1s}
    .tchip b{font-size:11px;font-weight:800;font-variant-numeric:tabular-nums;color:var(--muted)}
    .tchip:hover{border-color:var(--muted)}
    .tchip:active{transform:scale(.97)}
    .tchip:focus-visible{outline:none;box-shadow:var(--focus)}
    .tchip:disabled{opacity:.45;cursor:not-allowed;transform:none}
    .tchip--added b{color:var(--pill-add)}
    .tchip--removed b{color:var(--pill-del)}
    .tchip--changed b{color:var(--pill-chg)}
    .tchip--moved b{color:var(--pill-move)}
    .tchip--same b{color:var(--pill-same)}
    .tchip.is-active{border-color:var(--accent);background:var(--accent-soft);color:var(--accent-strong)}
    .tchip.is-active b{color:var(--accent-strong)}
    .active-filters{display:flex;align-items:center;gap:5px;flex-wrap:wrap;padding-top:5px;border-top:1px dashed var(--border);font-size:9px;color:var(--muted)}
    .active-filters-label{font-weight:900;letter-spacing:.05em;text-transform:uppercase}
    .active-filter-chip{display:inline-flex;align-items:center;gap:6px;border:1px solid #93c5fd;border-radius:999px;background:#eff6ff;color:#1d4ed8;padding:4px 8px;font-size:10px;font-weight:800;cursor:pointer}
    .active-filter-chip span{font-size:13px;line-height:1}
    .active-filter-chip:hover{border-color:var(--accent)}
    .active-filter-chip:focus-visible,.active-filter-clear:focus-visible{outline:none;box-shadow:var(--focus)}
    body.dark .active-filter-chip{background:#172554;color:#bfdbfe;border-color:#1d4ed8}
    .active-filter-clear{border:none;background:transparent;color:var(--accent-strong);padding:4px 6px;font-size:10px;font-weight:800;text-decoration:underline;text-underline-offset:2px;cursor:pointer}
    .active-filters--empty{opacity:.78}
    .sec{border:1px solid var(--border);border-radius:16px;background:var(--card);margin-bottom:14px;box-shadow:0 8px 26px -14px rgba(15,23,42,.32);scroll-margin-top:calc(var(--diff-toolbar-offset) + 12px)}
    .sec-head{position:sticky;top:var(--diff-toolbar-offset);z-index:5;display:flex;justify-content:space-between;align-items:center;gap:10px;padding:11px 14px;border-radius:15px 15px 0 0;border-bottom:1px solid var(--border);background:linear-gradient(180deg,var(--card) 0%,var(--card-soft) 100%);font-size:13px;font-weight:850;cursor:pointer;user-select:none;transition:filter .15s,box-shadow .15s}
    .sec-head:hover{filter:brightness(.985)}
    .sec-head:focus-visible{outline:none;box-shadow:var(--focus)}
    body.dark .sec-head:hover{filter:brightness(1.08)}
    .sec-head-title{display:inline-flex;align-items:center;gap:8px;min-width:0}
    .sec-caret{font-size:9px;color:var(--muted);flex-shrink:0}
    .sec-counts{display:inline-flex;gap:6px;flex-wrap:wrap;justify-content:flex-end}
    .sec-review-progress{display:inline-flex;align-items:center;padding:3px 8px;border:1px solid var(--border);border-radius:999px;background:var(--card);color:var(--muted);font-size:9px;font-weight:800;font-variant-numeric:tabular-nums;white-space:nowrap}
    .sec-review-progress.is-complete{border-color:#86efac;background:#ecfdf5;color:#15803d}
    body.dark .sec-review-progress.is-complete{border-color:#166534;background:#052e16;color:#86efac}
    .cnt{display:inline-flex;align-items:center;padding:3px 9px;border-radius:999px;font-size:10px;font-weight:800;font-variant-numeric:tabular-nums;border:1px solid transparent;white-space:nowrap}
    .cnt--add{background:#dcfce7;color:#166534;border-color:#86efac}
    .cnt--del{background:#fee2e2;color:#991b1b;border-color:#fca5a5}
    .cnt--chg{background:#fef3c7;color:#92400e;border-color:#fcd34d}
    .cnt--same{background:var(--card-soft);color:var(--muted);border-color:var(--border)}
    body.dark .cnt--add{background:#14532d;color:#bbf7d0;border-color:#166534}
    body.dark .cnt--del{background:#450a0a;color:#fecaca;border-color:#991b1b}
    body.dark .cnt--chg{background:#78350f;color:#fde68a;border-color:#b45309}
    .drow-list{display:flex;flex-direction:column;border-radius:0 0 15px 15px;overflow:hidden}
    .drow{padding:11px 14px 13px;border-bottom:1px solid var(--border);border-left:5px solid transparent;background:var(--card);scroll-margin-top:calc(var(--diff-toolbar-offset) + 58px);transition:background .15s,box-shadow .15s}
    .drow:last-child{border-bottom:none}
    .drow:hover{background:var(--card-soft)}
    .drow--added{border-left-color:#16a34a}
    .drow--removed{border-left-color:#dc2626}
    .drow--changed{border-left-color:#ca8a04}
    .drow--same{border-left-color:transparent;background:var(--card-soft)}
    .drow--same .path-main{font-weight:600;color:var(--muted)}
    .drow--reviewed{opacity:1;background:linear-gradient(90deg,rgba(22,163,74,.14) 0 9px,var(--card) 9px);box-shadow:inset 0 0 0 1px rgba(22,163,74,.08)}
    .drow--reviewed:hover{background:linear-gradient(90deg,rgba(22,163,74,.18) 0 9px,var(--card-soft) 9px)}
    body.dark .drow--reviewed{background:linear-gradient(90deg,rgba(74,222,128,.18) 0 9px,var(--card) 9px)}
    .drow--focus{position:relative;z-index:1;opacity:1;outline:3px solid var(--accent);outline-offset:-3px;background:var(--accent-soft);box-shadow:inset 7px 0 0 var(--accent)}
    .drow--focus .drow-head::before{content:"現在";display:inline-flex;align-items:center;padding:4px 8px;border-radius:999px;background:var(--accent);color:#fff;font-size:10px;font-weight:800;white-space:nowrap}
    .fj-block.drow--focus .fj-head::before{content:"現在";display:inline-flex;align-items:center;padding:4px 8px;border-radius:999px;background:var(--accent);color:#fff;font-size:10px;font-weight:800;white-space:nowrap}
    .drow:focus-visible{outline:3px solid var(--accent);outline-offset:-3px}
    @supports (content-visibility:auto){
      .drow,.fj-block,.fc-card{content-visibility:auto;contain-intrinsic-size:auto 180px}
      .drow.drow--focus,.drow[aria-current="true"],.drow:focus-within,.fj-block.drow--focus,.fj-block[aria-current="true"],.fj-block:focus-within,.fc-card.is-active,.fc-card:focus-within{content-visibility:visible}
    }
    .drow-head{display:flex;gap:9px;align-items:flex-start}
    .drow-title{flex:1;min-width:0}
    .drow-actions{display:inline-flex;align-items:center;gap:6px;flex-shrink:0}
    .row-act{border:1px solid var(--border);background:var(--card-soft);color:var(--muted);border-radius:8px;padding:3px 9px;font-size:11px;font-weight:700;cursor:pointer;transition:color .15s,border-color .15s}
    .row-act:hover{color:var(--fg);border-color:var(--muted)}
    .row-act:focus-visible{outline:none;box-shadow:var(--focus)}
    .row-review-next{border:1px solid var(--accent);background:var(--accent);color:#fff;border-radius:8px;padding:4px 9px;font-size:11px;font-weight:800;cursor:pointer;white-space:nowrap}
    .row-review-next:hover{filter:brightness(1.06)}
    .row-review-next:focus-visible{outline:none;box-shadow:var(--focus)}
    .row-reviewed{display:inline-flex;align-items:center;gap:5px;padding:3px 9px;border-radius:999px;border:1px solid var(--border);background:var(--card-soft);color:var(--muted);font-size:11px;font-weight:700;cursor:pointer;white-space:nowrap}
    .row-reviewed input{width:12px;height:12px;accent-color:var(--accent);cursor:pointer;margin:0}
    .row-reviewed.is-on{background:#ecfdf5;color:#15803d;border-color:#86efac}
    body.dark .row-reviewed.is-on{background:#052e16;color:#86efac;border-color:#166534}
    .row-display-only{display:inline-flex;align-items:center;padding:3px 9px;border-radius:999px;border:1px dashed var(--border);background:var(--card-soft);color:var(--muted);font-size:11px;font-weight:700;white-space:nowrap}
    .row-select{display:inline-flex;align-items:center;gap:5px;padding:3px 9px;border-radius:999px;border:1px solid var(--border);background:var(--card-soft);color:var(--muted);font-size:11px;font-weight:700;cursor:pointer;white-space:nowrap}
    .row-select input{width:12px;height:12px;accent-color:var(--accent);cursor:pointer;margin:0}
    .row-select.is-on{background:var(--accent-soft);color:var(--accent-strong);border-color:var(--accent)}
    .fj-list{display:flex;flex-direction:column;gap:12px}
    .fj-block{border:1px solid var(--border);border-radius:12px;background:var(--card);overflow:hidden}
    .fj-block.drow--reviewed{background:linear-gradient(90deg,rgba(22,163,74,.16) 0 9px,var(--card) 9px);box-shadow:inset 0 0 0 1px rgba(22,163,74,.1)}
    .fj-block.drow--focus{background:var(--accent-soft);outline:3px solid var(--accent);outline-offset:-3px;box-shadow:inset 7px 0 0 var(--accent)}
    .fj-block--added{border-left:5px solid #16a34a}
    .fj-block--removed{border-left:5px solid #dc2626}
    .fj-block--changed{border-left:5px solid #ca8a04}
    .fj-head{display:flex;flex-wrap:wrap;align-items:center;gap:8px 10px;padding:9px 12px;border-bottom:1px solid var(--border);background:var(--card-soft)}
    .fj-title{font-size:13px;font-weight:800;color:var(--fg)}
    .fj-code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11px;color:var(--muted)}
    .fj-type{display:inline-flex;align-items:center;padding:3px 8px;border-radius:999px;font-size:10px;font-weight:700;border:1px solid var(--border);background:var(--card);color:var(--muted)}
    .fj-spacer{flex:1}
    .fj-body{padding:10px 12px}
    .fj-body .duo{max-height:420px}
    .fj-same-note{padding:8px 12px;font-size:11px;color:var(--muted)}
    .report-toast{display:none;align-items:center;justify-content:center;margin:8px 12px 0;padding:9px 14px;border:1px solid var(--accent);border-radius:10px;background:var(--accent-soft);color:var(--accent-strong);font-size:11px;font-weight:800;line-height:1.45;text-align:center}
    .report-toast.is-visible{display:flex}
    .report-filter-status{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
    .drow-val{margin-top:10px;padding-left:2px}
    .drow-empty{padding:20px;font-size:12px;color:var(--muted);text-align:center}
    .val-inline{display:flex;align-items:center;gap:10px;flex-wrap:wrap;font-size:12px;line-height:1.6}
    .val-inline--lanes{display:grid;grid-template-columns:minmax(0,1fr) auto minmax(0,1fr);align-items:stretch;gap:9px}
    .val-inline--lanes>.val-lane:only-child{grid-column:1/-1}
    .val-lane{display:flex;flex-direction:column;gap:5px;min-width:0;padding:8px;border:1px solid var(--border);border-radius:11px;background:var(--card-soft)}
    .val-lane--before{border-top:3px solid #dc2626}
    .val-lane--after{border-top:3px solid #16a34a}
    .val-lane-label{display:flex;align-items:baseline;gap:7px;padding:0 2px}
    .val-lane-label b{font-size:10px;letter-spacing:.08em;color:var(--fg)}
    .val-lane-label small{font-size:9px;font-weight:700;color:var(--muted)}
    .val-lane .vi-val{display:block;width:100%}
    .vi-val{display:inline-block;max-width:100%;padding:3px 10px;border-radius:8px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11.5px;word-break:break-word;border:1px solid transparent}
    .vi-val--del{background:var(--del);color:var(--del-fg);border-color:rgba(220,38,38,.18)}
    .vi-val--add{background:var(--add);color:var(--add-fg);border-color:rgba(22,163,74,.18)}
    .vi-val--same{background:var(--card-soft);color:var(--muted);border-color:var(--border)}
    .vi-val--absent{background:var(--card-soft);color:var(--muted);border:1px dashed var(--border)}
    .vi-val[data-side-label]::before,.duo-cell[data-side-label]::before{display:none}
    .vi-arrow{color:var(--muted);font-weight:800;flex-shrink:0}
    .val-single{border:1px solid var(--border);border-radius:10px;overflow:hidden;background:var(--card)}
    .val-single-head{padding:6px 11px;border-bottom:1px solid var(--border);background:var(--pad);font-size:10px;font-weight:800;letter-spacing:.04em;color:var(--muted)}
    .val-single--add .blk{background:var(--add);color:var(--add-fg)}
    .val-single--del .blk{background:var(--del);color:var(--del-fg)}
    .val-single--same .blk{color:var(--muted)}
    .val-reveal{display:inline-flex;align-items:center;gap:6px;margin-top:2px;padding:5px 12px;border-radius:999px;border:1px dashed var(--border);background:transparent;color:var(--muted);font-size:11px;font-weight:700;cursor:pointer;transition:border-color .15s,color .15s}
    .val-reveal:hover{border-color:var(--muted);color:var(--fg)}
    .val-reveal:focus-visible{outline:none;box-shadow:var(--focus)}
    .val-single + .val-reveal{margin-top:8px}
    .duo-wrap{border:1px solid var(--border);border-radius:10px;overflow:hidden;background:var(--card)}
    .duo-head{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));border-bottom:1px solid var(--border);background:var(--pad)}
    .duo-head .duo-lane{display:flex;align-items:baseline;gap:8px;padding:8px 12px;border-top:3px solid transparent}
    .duo-head .duo-lane--before{border-top-color:#dc2626}
    .duo-head .duo-lane--after{border-top-color:#16a34a}
    .duo-head .duo-lane b{font-size:10px;letter-spacing:.08em;color:var(--fg)}
    .duo-head .duo-lane small{font-size:9px;font-weight:700;color:var(--muted)}
    .duo-head .duo-lane + .duo-lane{border-left:1px solid var(--border)}
    .duo{max-height:320px}
    .duo-row{display:grid;grid-template-columns:repeat(2,minmax(0,1fr))}
    .duo-cell{display:flex;min-width:0;min-height:1.6em;line-height:1.6;padding:0 8px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11px;white-space:pre-wrap;word-break:break-word}
    .duo-cell + .duo-cell{border-left:1px solid var(--border)}
    .duo-cell.del{background:var(--del);color:var(--del-fg)}
    .duo-cell.add{background:var(--add);color:var(--add-fg)}
    .duo-cell.pad{background:var(--pad);opacity:.7}
    .duo-empty{padding:10px 12px;font-size:11px;color:var(--muted);background:var(--card-soft);text-align:center}
    .duo-head--solo{grid-template-columns:1fr}
    .duo-row--solo{grid-template-columns:1fr}
    .view-side{display:flex;gap:6px;margin:2px 0 10px}
    .view-side .vs-opt{display:flex;align-items:center;gap:5px;font-size:11.5px;color:var(--fg);cursor:pointer;border:1px solid var(--border);border-radius:8px;padding:4px 9px;background:var(--card)}
    .view-side .vs-opt input{margin:0}
    .view-side .vs-opt:has(input:checked){border-color:var(--accent);color:var(--accent-strong);background:var(--accent-soft);font-weight:700}
    .duo-cell .blk{flex:1}
    .lt{flex:1;min-width:0}
    .same-fold{display:flex;align-items:center;gap:8px;width:100%;padding:9px 14px;border:none;border-top:1px dashed var(--border);background:var(--card-soft);color:var(--muted);font-size:11px;font-weight:700;cursor:pointer;text-align:left;transition:color .15s}
    .same-fold:hover{color:var(--fg)}
    .same-fold:focus-visible{outline:none;box-shadow:var(--focus)}
    .long-value{border:1px solid var(--border);border-radius:12px;background:var(--card-soft);overflow:hidden}
    .long-value>summary{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:11px 13px;cursor:pointer;color:var(--fg);font-size:11px;font-weight:800;list-style:none}
    .long-value>summary::-webkit-details-marker{display:none}
    .long-value>summary::before{content:"▸";color:var(--accent);font-size:10px;transition:transform .15s}
    .long-value[open]>summary::before{transform:rotate(90deg)}
    .long-value>summary span{flex:1}
    .long-value>summary small{font-size:9px;font-weight:700;color:var(--muted);font-variant-numeric:tabular-nums}
    .long-value>summary:focus-visible{outline:none;box-shadow:inset var(--focus)}
    .long-value-body{padding:0 10px 10px}
    .agg-list{display:flex;flex-direction:column;gap:8px}
    .agg-item{border:1px solid var(--border);border-radius:10px;padding:8px 11px 10px;background:var(--card-soft)}
    .agg-item-head{display:flex;align-items:center;gap:8px;min-width:0}
    .agg-prop{font-size:12px;font-weight:700;color:var(--fg);min-width:0;word-break:break-word}
    .agg-val{margin-top:6px}
    .agg-val .duo-wrap,.agg-val .val-single{background:var(--card)}
    .mini-chip{display:inline-flex;align-items:center;justify-content:center;padding:2px 8px;border-radius:999px;font-size:10px;font-weight:800;border:1px solid transparent;white-space:nowrap;flex-shrink:0}
    .mini-chip--added{background:#dcfce7;color:#166534;border-color:#86efac}
    .mini-chip--removed{background:#fee2e2;color:#991b1b;border-color:#fca5a5}
    .mini-chip--changed{background:#fef3c7;color:#92400e;border-color:#fcd34d}
    body.dark .mini-chip--added{background:#14532d;color:#bbf7d0;border-color:#166534}
    body.dark .mini-chip--removed{background:#450a0a;color:#fecaca;border-color:#991b1b}
    body.dark .mini-chip--changed{background:#78350f;color:#fde68a;border-color:#b45309}
    .type-chip{display:inline-flex;align-items:center;justify-content:center;min-width:52px;padding:4px 10px;border-radius:999px;font-size:11px;font-weight:800;border:1px solid transparent;white-space:nowrap;flex-shrink:0;margin-top:1px}
    .type-chip--added{background:#dcfce7;color:#166534;border-color:#86efac}
    .type-chip--removed{background:#fee2e2;color:#991b1b;border-color:#fca5a5}
    .type-chip--changed{background:#fef3c7;color:#92400e;border-color:#fcd34d}
    .type-chip--same{background:#ccfbf1;color:#0f766e;border-color:#5eead4}
    body.dark .type-chip--added{background:#14532d;color:#bbf7d0;border-color:#166534}
    body.dark .type-chip--removed{background:#450a0a;color:#fecaca;border-color:#991b1b}
    body.dark .type-chip--changed{background:#78350f;color:#fde68a;border-color:#b45309}
    body.dark .type-chip--same{background:#134e4a;color:#99f6e4;border-color:#0f766e}
    .path{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;word-break:break-all;color:var(--muted);font-size:11px}
    .path-main{font-size:13px;font-weight:800;color:var(--fg);margin-bottom:3px;word-break:break-word;line-height:1.45}
    .path-sub{font-size:10px;line-height:1.45;color:var(--muted);word-break:break-all}
    .path-tech{margin-top:3px;max-width:100%}
    .path-tech>summary{display:inline-flex;align-items:center;gap:5px;color:var(--muted);font-size:9px;font-weight:700;cursor:pointer;list-style:none}
    .path-tech>summary::-webkit-details-marker{display:none}
    .path-tech>summary::before{content:"▸";font-size:8px;transition:transform .15s}
    .path-tech[open]>summary::before{transform:rotate(90deg)}
    .path-tech>summary:focus-visible{outline:none;border-radius:5px;box-shadow:var(--focus)}
    .path-tech-body{display:grid;gap:4px;margin-top:5px;padding:7px 9px;border:1px dashed var(--border);border-radius:8px;background:var(--card-soft)}
    .path-tech-body>div{display:grid;grid-template-columns:auto minmax(0,1fr);gap:7px;align-items:start}
    .path-tech-body span{font-size:9px;color:var(--muted);white-space:nowrap}
    .path-tech-body code{font-size:9px;color:var(--fg);word-break:break-all;font-family:ui-monospace,SFMono-Regular,Menlo,monospace}
    .meta-wrap{margin-top:8px;font-family:"Noto Sans JP","Hiragino Kaku Gothic ProN",Meiryo,sans-serif}
    .meta-tags{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:6px}
    .meta-tag{display:inline-flex;align-items:center;padding:3px 8px;border-radius:999px;border:1px solid var(--border);background:var(--pad);font-size:10px;font-weight:600;color:var(--fg)}
    .meta-tag.reason{background:#fff7ed;color:#9a3412;border-color:#fdba74}
    .meta-tag.rename{background:#ecfdf5;color:#15803d;border-color:#86efac}
    body.dark .meta-tag.reason{background:#431407;color:#fdba74;border-color:#9a3412}
    body.dark .meta-tag.rename{background:#052e16;color:#86efac;border-color:#166534}
    .meta-line{font-size:10px;line-height:1.5;color:var(--muted)}
    .meta-line strong{color:var(--fg)}
    .scroll{max-height:300px;overflow:auto;scrollbar-width:thin;scrollbar-color:var(--border) transparent}
    .scroll::-webkit-scrollbar{width:6px;height:6px}
    .scroll::-webkit-scrollbar-thumb{background:var(--border);border-radius:999px}
    .ln{min-width:34px;display:inline-block;text-align:right;margin-right:8px;padding-right:6px;border-right:1px solid var(--border);font-size:10px;color:var(--muted);user-select:none;flex-shrink:0}
    .blk{margin:0;padding:10px 12px;white-space:pre-wrap;word-break:break-word;font-size:11px;line-height:1.55;font-family:ui-monospace,SFMono-Regular,Menlo,monospace}
    mark.cadd{background:var(--mark-add);color:var(--add-fg);border-radius:3px;padding:0 2px;text-decoration:underline 2px;text-underline-offset:2px}
    mark.cdel{background:var(--mark-del);color:var(--del-fg);border-radius:3px;padding:0 2px;text-decoration:line-through 2px}
    .sb-advanced .adv-summary{cursor:pointer;font-size:11px;font-weight:800;color:var(--fg);list-style:none;display:flex;align-items:center;gap:6px}
    .sb-advanced .adv-summary::-webkit-details-marker{display:none}
    .sb-advanced .adv-summary::before{content:"▸";display:inline-block;font-size:9px;color:var(--muted);transition:transform .15s}
    .sb-advanced details[open] .adv-summary::before{transform:rotate(90deg)}
    .adv-note{margin:10px 0;font-size:10px;line-height:1.6;color:var(--muted)}
    .adv-textarea{width:100%;box-sizing:border-box;padding:9px 11px;border:1px solid var(--border);border-radius:10px;background:var(--card-soft);color:var(--fg);font-size:11px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;resize:vertical;transition:border-color .15s,box-shadow .15s}
    .adv-textarea:focus{outline:none;border-color:var(--accent);box-shadow:var(--focus)}
    .adv-baked{margin:8px 0 0;font-size:10px;line-height:1.6;color:var(--muted);word-break:break-all}
    .adv-checks{display:flex;flex-direction:column;gap:2px;margin-top:12px}
    .sb-ctrl .adv-checks label.chk{margin-bottom:6px;font-size:11px;line-height:1.5;align-items:flex-start}
    .sb-ctrl .adv-checks label.chk input[type="checkbox"]{margin-top:1px;flex-shrink:0}
    .adv-chk.is-baked{opacity:.65}
    .adv-baked-tag{display:inline-block;margin-left:4px;padding:1px 6px;border-radius:999px;background:var(--accent-soft);color:var(--accent-strong);font-size:9px;font-weight:800;white-space:nowrap}
    .no-diff{display:flex;flex-direction:column;align-items:center;gap:9px;text-align:center;font-size:12px;font-weight:500;padding:24px;color:var(--muted);background:linear-gradient(180deg,var(--card-soft),var(--card));border:1px dashed var(--border);border-radius:16px}
    .no-diff strong{font-size:14px;color:#0d9488}
    .no-diff span{max-width:62ch;line-height:1.6}
    body.dark .no-diff{color:#5eead4}
    body.has-modal-open{overflow:hidden}
    .sl-root{padding:16px 18px 28px;background:var(--card-soft);min-height:320px;border-radius:0 0 20px 20px}
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
    .sl-pair--solo{grid-template-columns:1fr}
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
    tr.kv-del>td{background:var(--del);color:var(--del-fg)}
    tr.kv-add>td{background:var(--add);color:var(--add-fg)}
    tr.kv-chg>td{background:#fef3c7;color:#92400e}
    body.dark tr.kv-chg>td{background:#78350f;color:#fde68a}
    tr.kv-del>th,tr.kv-add>th,tr.kv-chg>th{box-shadow:inset 3px 0 0 #ca8a04}
    tr.kv-ghost>td,tr.kv-ghost>th{background:var(--pad);color:var(--muted);font-style:italic}
    .sl-mini-table mark.cdel,.st-fields mark.cdel{background:var(--mark-del);color:var(--del-fg);border-radius:2px;padding:0 1px;text-decoration:line-through 2px}
    .sl-mini-table mark.cadd,.st-fields mark.cadd{background:var(--mark-add);color:var(--add-fg);border-radius:2px;padding:0 1px;text-decoration:underline 2px;text-underline-offset:2px}
    .kf-row--diff .kf-value{border-color:#f59e0b;box-shadow:inset 3px 0 0 #f59e0b,inset 0 1px 2px rgba(15,23,42,.04);background:#fffbeb}
    body.dark .kf-row--diff .kf-value{background:#2a2008;border-color:#b45309}
    .kf-diff-chip{display:inline-block;margin-left:6px;padding:1px 7px;border-radius:999px;background:#fef3c7;color:#92400e;border:1px solid #fcd34d;font-size:9px;font-weight:800;vertical-align:middle;white-space:nowrap}
    body.dark .kf-diff-chip{background:#78350f;color:#fde68a;border-color:#b45309}
    .kf-toggle--diff .kf-toggle-label{background:#fef3c7;color:#92400e;border-radius:6px;padding:1px 6px}
    body.dark .kf-toggle--diff .kf-toggle-label{background:#78350f;color:#fde68a}
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
    .sl-kuc-pair--solo{grid-template-columns:1fr}
    @media (max-width:900px){.sl-kuc-pair{grid-template-columns:1fr}}
    .sl-kuc-pair kuc-textarea-1-24-0{display:block;min-width:0;width:100%}
    .sl-pane--src{background:rgba(37,99,235,.06);border:1px solid rgba(37,99,235,.22)}
    .sl-pane--tgt{background:rgba(22,163,74,.07);border:1px solid rgba(22,163,74,.28)}
    body.dark .sl-pane--src{background:rgba(59,130,246,.08);border-color:rgba(59,130,246,.35)}
    body.dark .sl-pane--tgt{background:rgba(34,197,94,.08);border-color:rgba(34,197,94,.35)}
    body.diff-focus-mode aside,body.diff-focus-mode .topbar,body.diff-focus-mode .settings-tabs{display:none}
    body.diff-focus-mode #reviewQueueHost{display:none}
    body.diff-focus-mode .focus-context{display:flex}
    body.diff-focus-mode .sec:not(:has(.drow--focus)){display:none}
    body.diff-focus-mode .drow:not(.drow--focus),body.diff-focus-mode .fj-block:not(.drow--focus),body.diff-focus-mode .same-fold{display:none}
    body.diff-focus-mode .report-workspace{grid-template-columns:minmax(0,1fr)}
    body.diff-focus-mode .report-workspace>main{grid-column:1/-1}
    body.diff-focus-mode main{padding-top:12px}
    body.diff-focus-mode .settings-shell{margin-top:0}
    body.diff-focus-mode .content{padding-top:10px}
    body.diff-density-compact .review-queue{padding:7px 10px}
    body.diff-density-compact .review-queue-samples{display:none}
    body.diff-density-compact .diff-toolbar{padding:6px 9px;gap:4px}
    body.diff-density-compact .sec-head{padding:8px 11px}
    body.diff-density-compact .drow{padding:8px 11px 9px}
    body.diff-density-compact .drow-val{margin-top:6px}
    body.diff-density-compact .val-lane{padding:5px 7px}
    body.diff-density-compact .path-tech{margin-top:1px}
    @media (max-width:1080px){
      body{display:block}
      body.sidebar-drawer-open{overflow:hidden}
      aside{position:relative;top:auto;height:auto;max-height:none;width:auto;min-width:0;overflow:visible;border-right:none;border-bottom:1px solid var(--border);z-index:20;backdrop-filter:none}
      aside.is-open{z-index:90}
      .sb-head{display:block;padding:9px 12px}
      .sb-head .sb-kicker,.sb-meta{display:none}
      .sb-head-row{display:flex;align-items:center;justify-content:space-between;gap:12px}
      .sb-title{margin:0;font-size:16px;line-height:1.3}
      .mobile-filter-toggle{display:inline-flex;align-items:center;justify-content:center;margin:0;white-space:nowrap}
      .sidebar-panels{display:none;position:fixed;top:0;right:0;bottom:0;z-index:92;width:min(370px,calc(100vw - 24px));max-height:100vh;overflow-y:auto;background:var(--sidebar);border-left:1px solid var(--border);box-shadow:-18px 0 48px rgba(15,23,42,.24);overscroll-behavior:contain}
      aside.is-open .sidebar-panels{display:flex}
      .sidebar-drawer-head{position:sticky;top:0;z-index:2;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 14px;border-bottom:1px solid var(--border);background:var(--card)}
      .sidebar-drawer-head strong{font-size:14px;color:var(--fg)}
      .sidebar-backdrop{padding:0}
      aside.is-open .sidebar-backdrop:not([hidden]){display:block;position:fixed;inset:0;z-index:91;width:100%;height:100%;border:0;border-radius:0;background:rgba(15,23,42,.48);backdrop-filter:blur(3px);cursor:pointer}
      main{padding:14px 14px 26px}
      .diff-toolbar,.sec-head{position:static}
      .sec,.drow{scroll-margin-top:12px}
      .review-queue{grid-template-columns:auto minmax(0,1fr)}
      .review-queue-actions{grid-column:1/-1;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));width:100%}
      .review-queue-action{width:100%}
      .val-inline--lanes{grid-template-columns:1fr}
      .val-inline--lanes .vi-arrow{transform:rotate(90deg);justify-self:center}
      .duo-row{grid-template-columns:1fr}
      .duo-cell + .duo-cell{border-left:none}
      .duo-cell.pad{display:none}
      .duo-head{display:none}
      .duo-cell[data-side-label]{align-items:flex-start;gap:8px;padding-top:5px;padding-bottom:5px}
      .duo-cell[data-side-label]::before,.vi-val[data-side-label]::before{content:attr(data-side-label);display:inline-flex;flex:0 0 auto;align-items:center;padding:1px 6px;border:1px solid currentColor;border-radius:999px;font-family:system-ui,-apple-system,"Segoe UI",sans-serif;font-size:11px;font-weight:800;line-height:1.4;opacity:.78}
      .vi-val[data-side-label]{display:inline-flex;align-items:baseline;gap:7px}
    }
    @media (max-width:560px){
      main{padding:10px 8px 20px}
      .topbar{padding:12px 12px 13px;border-radius:15px}
      .topbar-title{font-size:1.12rem}
      .topbar-eyebrow-row{align-items:center}
      .header-badge{padding:5px 8px;font-size:11px;line-height:1.2;white-space:nowrap;writing-mode:horizontal-tb}
      .topbar-compare{grid-template-columns:1fr;gap:4px}
      .topbar-arrow{height:14px;transform:rotate(90deg)}
      .topbar-app-card{grid-template-columns:auto auto minmax(0,1fr);padding:7px 9px}
      .topbar-app-card strong{overflow:visible;text-overflow:clip;white-space:normal;word-break:break-word}
      .topbar-desc{font-size:10px;line-height:1.45}
      .settings-shell{margin-top:9px;border-radius:15px}
      .settings-tabs{padding:7px 8px;border-radius:15px 15px 0 0}
      .settings-tab{padding:7px 13px}
      .content{padding:8px}
      .report-notices{margin-bottom:8px}
      .warn{padding:8px 9px;font-size:11px}
      .review-queue{padding:8px 9px;gap:7px}
      .review-queue-mark{width:32px;height:32px;border-radius:10px;font-size:17px}
      .review-queue-main>strong{font-size:13px}
      .review-queue-note{font-size:11px}
      .review-progress--queue{max-width:none}
      .review-progress-note,.review-queue-samples{display:none}
      .review-queue-actions{grid-template-columns:repeat(2,minmax(0,1fr))}
      .review-queue-action{padding:8px 6px;white-space:normal;line-height:1.25}
      .diff-toolbar{padding:8px;border-radius:13px}
      .diff-toolbar-heading,.diff-toolbar-row{align-items:stretch}
      .diff-toolbar-heading{flex-direction:column;gap:5px}
      .diff-scope-counts{justify-content:flex-start}
      .mobile-toolbar-toggle{display:inline-flex;align-self:flex-start}
      .diff-toolbar-row--filters{display:none}
      body.mobile-toolbar-expanded .diff-toolbar-row--filters{display:grid;grid-template-columns:repeat(2,minmax(0,1fr))}
      .diff-toolbar-row--navigation{display:grid;grid-template-columns:repeat(2,minmax(0,1fr))}
      .diff-toolbar-label,.diff-toolbar-spacer{display:none}
      .tchip{justify-content:center}
      .diff-sort{grid-column:1/-1;justify-content:space-between}
      .diff-toolbar-row--navigation>#diffToolbarSort{display:none}
      body.mobile-toolbar-expanded .diff-toolbar-row--navigation>#diffToolbarSort{display:inline-flex}
      .diff-sort select{flex:1;min-width:0}
      .diff-display-modes{grid-column:1/-1;display:grid;grid-template-columns:1fr 1fr}
      .diff-nav-position{grid-column:1/-1;grid-row:1;text-align:left}
      .active-filters{align-items:flex-start}
      .active-filters-label{width:100%}
      .active-filters--empty{display:none}
      .focus-context{display:none;grid-template-columns:minmax(0,1fr) auto;gap:5px;padding:6px 7px}
      body.diff-focus-mode .focus-context{display:grid}
      .focus-context-pair{grid-column:1/-1}
      .focus-context-pair b{font-size:10px}
      .sec{border-radius:14px}
      .sec-head{align-items:flex-start;padding:10px;border-radius:13px 13px 0 0}
      .sec-counts{gap:4px}
      .cnt{padding:3px 6px;font-size:9px}
      .drow{padding:10px 9px 12px}
      .report-toast{margin:7px 8px 0;padding:8px 10px;font-size:10px}
      body.sidebar-drawer-open .report-toast{display:none}
      .drow-head{flex-wrap:wrap}
      .drow-title{order:3;flex-basis:100%}
      .drow-actions{width:100%;margin-left:0;flex-wrap:wrap}
      .row-review-next{margin-left:auto}
      .path-tech-body>div{grid-template-columns:1fr}
      .val-lane{padding:7px}
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
    .fd-change-summary{margin:14px 0 16px;border:1px solid var(--border);border-radius:14px;background:var(--card-soft);padding:12px 14px}
    .fd-change-summary__title{font-size:10px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;color:var(--muted);margin-bottom:8px}
    .fd-change-summary__chips{display:flex;flex-wrap:wrap;gap:8px}
    .fd-change-chip{display:inline-flex;align-items:center;gap:6px;max-width:100%;padding:5px 9px;border-radius:999px;border:1px solid var(--border);background:var(--card);font-size:10px;font-weight:700;color:var(--fg)}
    .fd-change-chip b{font-size:9px;letter-spacing:.03em;text-transform:uppercase}
    .fd-change-chip--added{background:#dcfce7;color:#166534;border-color:#86efac}
    .fd-change-chip--removed{background:#fee2e2;color:#991b1b;border-color:#fca5a5}
    .fd-change-chip--changed{background:#fef3c7;color:#92400e;border-color:#fcd34d}
    .fd-change-chip--same,.fd-change-chip--more{background:var(--card);color:var(--muted)}
    body.dark .fd-change-chip--added{background:#14532d;color:#bbf7d0;border-color:#166534}
    body.dark .fd-change-chip--removed{background:#450a0a;color:#fecaca;border-color:#991b1b}
    body.dark .fd-change-chip--changed{background:#78350f;color:#fde68a;border-color:#b45309}
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
    .fd-entry-diff{margin-top:10px}
    .fd-entry-diff .val-inline{font-size:12px}
    .fd-entry-diff .duo{max-height:220px}
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
      .fd-snapshots,.fd-entry-grid,.fd-mini-grid,.kf-extra-grid{grid-template-columns:1fr}
    }

    /* Human-first report shell: direction -> completeness -> facts -> review. */
    body{display:block;min-width:0;background:#f4f6f8;background-image:none}
    body.dark{background:#0b1220;background-image:none}
    .skip-link{position:fixed;left:12px;top:10px;z-index:120;transform:translateY(-160%);padding:10px 14px;border-radius:8px;background:var(--fg);color:var(--card);font-size:12px;font-weight:800;text-decoration:none}
    .skip-link:focus{transform:translateY(0);outline:3px solid var(--accent);outline-offset:2px}
    .report-hero,.report-workspace{width:min(calc(100% - 32px),1440px);margin-inline:auto}
    .report-hero{display:grid;grid-template-columns:minmax(0,1.35fr) minmax(280px,.65fr);align-items:stretch;gap:11px 16px;margin-top:16px;padding:21px 22px;border-radius:20px;background:linear-gradient(145deg,var(--card) 0%,color-mix(in srgb,var(--card) 90%,var(--accent-soft)) 100%);box-shadow:0 22px 56px -38px rgba(15,37,63,.62);overflow:visible}
    .report-hero::before{height:4px;background:var(--accent)}
    .report-hero .topbar-main{grid-column:1/-1;display:grid;grid-template-columns:minmax(260px,.78fr) minmax(480px,1.22fr);grid-template-rows:auto auto 1fr;align-items:start;gap:7px 28px}
    .report-hero .topbar-eyebrow-row,.report-hero .topbar-title,.report-hero .topbar-lead{grid-column:1}
    .report-hero .topbar-compare{grid-column:2;grid-row:1/4;align-self:stretch}
    .report-hero .topbar-title{margin:0;font-size:clamp(1.45rem,3vw,2rem)}
    .topbar-lead{max-width:72ch;margin:0;color:var(--muted);font-size:13px;line-height:1.7}
    .report-hero .topbar-compare{width:100%;max-width:none;gap:12px}
    .report-hero .topbar-app-card{grid-template-columns:1fr;align-content:center;gap:3px;min-height:78px;padding:12px 15px;border-top:1px solid var(--border);border-left:4px solid #475569;background:var(--card-soft)}
    .report-hero .topbar-app-card--source{border-left-color:#475569;background:var(--card-soft)}
    .report-hero .topbar-app-card--target{border-left-color:var(--accent);background:var(--card-soft)}
    body.dark .report-hero .topbar-app-card--source,body.dark .report-hero .topbar-app-card--target{background:var(--card-soft)}
    .report-hero .topbar-app-eyebrow{font-size:12px;letter-spacing:.04em}
    .report-hero .topbar-app-side{font-size:11px}
    .report-hero .topbar-app-card strong{font-size:14px;white-space:normal;overflow:visible;word-break:break-word}
    .report-content-disclosure{grid-column:1/-1;display:grid;grid-template-columns:auto minmax(0,1fr);gap:5px 12px;padding:11px 14px;border:1px solid #d6b456;border-left:4px solid #9a6700;border-radius:12px;background:#fffaf0;color:#5f4300;font-size:12px;line-height:1.6}
    .report-content-disclosure strong{white-space:nowrap;font-size:12px}
    .report-content-disclosure--caution{border-color:#e0a06b;border-left-color:#b45309;background:#fff7ed;color:#7c2d12}
    body.dark .report-content-disclosure{border-color:#8b6824;background:#2a210d;color:#fde68a}
    body.dark .report-content-disclosure--caution{border-color:#9a5a24;background:#2f190d;color:#fed7aa}
    .report-step-label{display:block;margin-bottom:3px;color:var(--muted);font-size:11px;font-weight:850;letter-spacing:.06em;text-transform:uppercase}
    .report-completeness{grid-column:1/-1;display:grid;grid-template-columns:auto minmax(0,1fr);gap:10px 13px;padding:13px 14px;border:1px solid var(--border);border-radius:14px;background:var(--card-soft)}
    .report-completeness--incomplete{border-color:#f0c36a;background:#fffaf0}
    .report-completeness--complete{border-color:#9bc8ac;background:#f4fbf6}
    body.dark .report-completeness--incomplete{border-color:#8b6824;background:#2a210d}
    body.dark .report-completeness--complete{border-color:#245b3c;background:#0d281a}
    .report-completeness-mark{display:grid;place-items:center;width:34px;height:34px;border-radius:50%;background:#334155;color:#fff;font-size:17px;font-weight:900}
    .report-completeness--incomplete .report-completeness-mark{background:#a16207}
    .report-completeness--complete .report-completeness-mark{background:#15803d}
    .report-completeness-copy h2,.report-facts h2{margin:0;color:var(--fg);font-size:16px;line-height:1.45}
    .report-completeness-copy p{margin:4px 0 0;color:var(--muted);font-size:12px;line-height:1.65}
    .report-diagnostics{grid-column:2;min-width:0;border-top:1px solid color-mix(in srgb,var(--border) 80%,transparent);padding-top:9px}
    .report-diagnostics>summary{display:inline-flex;align-items:center;min-height:36px;color:var(--accent-strong);font-size:11px;font-weight:800;cursor:pointer}
    .report-diagnostics>summary:focus-visible,.tool-details-summary:focus-visible,.related-settings>summary:focus-visible{outline:none;box-shadow:var(--focus);border-radius:7px}
    .report-diagnostics .report-notices{margin:8px 0 0}
    .report-review-start{grid-column:1/-1;display:flex;flex-direction:row;align-items:center;justify-content:space-between;gap:16px;padding:13px 16px;border:1px solid color-mix(in srgb,var(--accent) 42%,var(--border));border-radius:16px;background:color-mix(in srgb,var(--accent-soft) 58%,var(--card))}
    .report-review-start span{color:var(--muted);font-size:12px;line-height:1.65}
    .report-review-start button{min-height:46px;padding:10px 16px;border:1px solid var(--accent);border-radius:11px;background:linear-gradient(180deg,#3b82f6,var(--accent));color:#fff;font-size:13px;font-weight:850;cursor:pointer;white-space:normal;box-shadow:0 10px 24px -16px rgba(37,99,235,.9)}
    .report-review-start button:hover{filter:brightness(.96)}
    .report-review-start button:focus-visible{outline:3px solid color-mix(in srgb,var(--accent) 48%,transparent);outline-offset:3px}
    .report-facts{grid-column:1/-1;padding-top:4px}
    .report-facts-head{display:flex;align-items:end;justify-content:space-between;gap:16px;margin-bottom:10px}
    .report-facts-head>p{max-width:52ch;margin:0;color:var(--muted);font-size:11px;line-height:1.6;text-align:right}
    .report-fact-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:8px}
    .report-fact-grid article{position:relative;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:4px 10px;min-width:0;padding:13px 14px 12px;border:1px solid var(--border);border-radius:14px;background:var(--card);overflow:hidden}
    .report-fact-grid article::before{content:"";position:absolute;inset:0 auto 0 0;width:4px;background:#64748b}
    .report-fact--added::before{background:#15803d!important}
    .report-fact--removed::before{background:#b91c1c!important}
    .report-fact--changed::before{background:#b45309!important}
    .report-fact--moved::before{background:#7c3aed!important}
    .report-fact--same::before{background:#64748b!important}
    .report-fact--empty{grid-column:1/-1}
    .report-fact-grid span{align-self:center;color:var(--fg);font-size:12px;font-weight:750;line-height:1.5}
    .report-fact-grid strong{grid-row:1/3;grid-column:2;align-self:center;font-size:24px;font-variant-numeric:tabular-nums}
    .report-fact-grid small{color:var(--muted);font-size:11px;line-height:1.5}
    .report-meta-line{grid-column:1/-1;display:flex;flex-wrap:wrap;gap:6px 14px;padding-top:10px;border-top:1px solid var(--border);color:var(--muted);font-size:11px;line-height:1.5}
    .report-workspace{display:grid;grid-template-columns:minmax(248px,282px) minmax(0,1fr);align-items:start;gap:16px;margin-top:16px;margin-bottom:36px}
    .report-workspace>aside{position:sticky;top:12px;width:auto;min-width:0;height:calc(100vh - 24px);max-height:calc(100vh - 24px);border:1px solid var(--border);border-radius:16px;background:var(--sidebar);overflow:auto;box-shadow:none;backdrop-filter:none}
    .report-workspace>main{min-width:0;padding:0;overflow:visible}
    .report-workspace .settings-shell{margin-top:0;border-radius:16px;box-shadow:0 12px 40px -30px rgba(15,23,42,.45)}
    .report-workspace .settings-tabs{border-radius:16px 16px 0 0}
    .tool-details{padding:0!important}
    .tool-details-summary{display:flex;align-items:center;min-height:46px;padding:12px 16px;color:var(--fg);font-size:11px;font-weight:850;cursor:pointer;list-style:none}
    .tool-details-summary::-webkit-details-marker{display:none}
    .tool-details-summary::before{content:"▸";margin-right:7px;color:var(--muted);font-size:9px}
    .tool-details[open] .tool-details-summary::before{transform:rotate(90deg)}
    .tool-details-body{padding:0 16px 16px;border-top:1px solid var(--border)}
    .tool-details-body>.field-label:first-child{margin-top:14px}
    .drow-list{gap:9px;padding:10px;background:var(--card-soft);overflow:visible}
    .drow{border:1px solid var(--border);border-left:4px solid #94a3b8;border-radius:14px;background:var(--card);box-shadow:0 12px 28px -30px rgba(15,37,63,.62)}
    .drow--added{border-left-color:#0f766e}
    .drow--removed{border-left-color:#475569}
    .drow--changed{border-left-color:#b45309}
    .drow-head{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:9px 12px}
    .drow-facts{display:flex;grid-column:1/-1;gap:6px;flex-wrap:wrap}
    .drow-title{grid-column:1;min-width:0}
    .drow-actions{grid-column:2;align-self:start}
    .fact-chip{display:inline-flex;align-items:center;gap:6px;min-height:26px;padding:3px 8px;border:1px solid var(--border);border-radius:999px;background:var(--card-soft);color:var(--fg);font-size:11px;font-weight:750;line-height:1.35}
    .fact-chip::before{content:"";width:7px;height:7px;border-radius:50%;background:#64748b;flex:0 0 auto}
    .fact-chip--added::before{background:#0f766e}
    .fact-chip--removed::before{background:#475569}
    .fact-chip--changed::before{background:#b45309}
    .fact-chip--same::before{background:#64748b}
    .fact-chip--difference{background:var(--card)}
    .path-main{font-size:14px;line-height:1.55}
    .path-tech>summary,.related-settings>summary{display:inline-flex;align-items:center;min-height:30px;color:var(--muted);font-size:11px;font-weight:750;cursor:pointer}
    .related-settings{margin-top:2px}
    .related-settings>summary::before{content:"▸";margin-right:5px;font-size:8px}
    .related-settings[open]>summary::before{transform:rotate(90deg)}
    .related-settings ul{display:grid;gap:5px;margin:2px 0 0;padding:8px 10px 8px 26px;border:1px dashed var(--border);border-radius:8px;background:var(--card-soft)}
    .related-settings li{font-size:11px;line-height:1.5;color:var(--fg)}
    .related-settings code{display:block;color:var(--muted);font-size:11px;word-break:break-all}
    .related-settings p{margin:2px 0 0;padding:8px 10px;border:1px dashed var(--border);border-radius:8px;color:var(--muted);font-size:11px}
    .review-queue{border-color:var(--border);background:var(--card);box-shadow:none}
    .review-queue--pending .review-queue-mark{background:var(--accent);color:#fff}
    .review-queue--clear .review-queue-mark{background:#15803d;color:#fff}
    .review-queue-note{line-height:1.5}
    .diff-toolbar{border-top-width:1px;box-shadow:0 10px 30px -25px rgba(15,23,42,.65)}
    .tchip{min-height:36px}
    .settings-tab,.btn,.row-act,.row-review-next,.row-reviewed,.row-select{min-height:36px}

    @media (max-width:900px){
      .report-hero{display:flex;flex-direction:column}
      .report-hero .topbar-main{display:flex;flex-direction:column;gap:9px}
      .report-hero .topbar-compare{width:100%;max-width:980px}
      .report-hero .topbar-app-card{grid-template-columns:auto auto minmax(0,1fr);min-height:66px;padding:12px 14px}
      .report-review-start{display:flex;flex-direction:row;align-items:center;justify-content:space-between}
    }
    @media (max-width:1080px){
      .report-hero,.report-workspace{width:min(calc(100% - 24px),1440px)}
      .report-workspace{display:block}
      .report-workspace>aside{position:relative;top:auto;width:auto;height:auto;max-height:none;margin-bottom:12px;overflow:visible}
      .report-workspace>main{padding:0}
      .report-fact-grid{grid-template-columns:repeat(auto-fit,minmax(190px,1fr))}
    }
    @media (max-width:768px){
      .report-hero,.report-workspace{width:calc(100% - 16px)}
      .report-hero{gap:12px;margin-top:8px;padding:15px;border-radius:16px}
      .report-hero .topbar-compare{grid-template-columns:1fr;gap:6px}
      .report-hero .topbar-arrow{height:16px;transform:rotate(90deg)}
      .report-completeness{grid-template-columns:auto minmax(0,1fr);padding:13px}
      .report-content-disclosure{grid-template-columns:1fr}
      .report-content-disclosure strong{white-space:normal}
      .report-diagnostics{grid-column:1/-1}
      .report-facts-head{display:block}
      .report-facts-head>p{margin-top:5px;text-align:left}
      .report-fact-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
      .val-inline--lanes,.duo-row,.fd-entry-grid,.sl-pair{grid-template-columns:1fr}
      .duo-head{display:none}
      .drow-head{grid-template-columns:1fr}
      .drow-facts,.drow-title,.drow-actions{grid-column:1}
      .drow-actions{width:100%;margin-left:0;justify-content:flex-start;flex-wrap:wrap}
      .report-workspace button,.report-workspace input,.report-workspace select,.report-workspace summary{min-height:44px}
      .report-review-start{align-items:stretch;flex-direction:column}
      .report-review-start button{width:100%}
    }
    @media (max-width:480px){
      .report-hero{gap:9px;padding:12px}
      .report-hero .topbar-main{gap:6px}
      .report-hero .topbar-title{font-size:1.5rem}
      .topbar-lead{font-size:12px;line-height:1.55}
      .report-hero .topbar-compare{gap:5px}
      .report-hero .topbar-app-card{min-height:56px;padding:10px 12px}
      .report-hero .topbar-arrow{height:12px}
      .report-content-disclosure{gap:3px;padding:9px 11px;font-size:11px;line-height:1.55}
      .report-completeness{grid-template-columns:auto minmax(0,1fr);gap:9px;padding:11px}
      .report-completeness-copy h2{font-size:15px}
      .report-completeness-copy p{font-size:11px;line-height:1.55}
      .report-review-start{gap:8px;padding:10px 12px}
      .report-fact-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
      .report-fact-grid article{padding:10px 12px}
      .report-fact-grid article:last-child:nth-child(odd){grid-column:1/-1}
      .report-completeness-mark{width:30px;height:30px}
      .topbar-eyebrow-row{align-items:flex-start;flex-direction:column}
      .header-badge{white-space:normal}
      .report-meta-line{display:grid;gap:4px}
      .drow-list{padding:7px}
      .drow{padding:10px 9px}
      .fact-chip{white-space:normal}
      .review-queue{grid-template-columns:1fr}
      .review-queue-actions{grid-column:1}
    }
    @media (forced-colors:active){
      .report-content-disclosure,.report-completeness,.report-review-start,.report-fact-grid article,.drow,.fact-chip{forced-color-adjust:auto;border:1px solid CanvasText}
      .fact-chip::before{border:1px solid CanvasText;background:CanvasText}
      :focus-visible{outline:2px solid Highlight!important;outline-offset:2px;box-shadow:none!important}
    }
    @media print{
      @page{size:A4;margin:12mm}
      :root,body.dark{--bg:#fff;--fg:#0f172a;--card:#fff;--card-soft:#f8fafc;--border:#cbd5e1;--sidebar:#f8fafc;--sidebar-fg:#334155;--accent:#2563eb;--accent-strong:#1d4ed8;--accent-soft:#dbeafe;--muted:#475569;color-scheme:light}
      body.dark .report-content-disclosure{border-color:#d6b456;border-left-color:#9a6700;background:#fffaf0;color:#5f4300}
      body.dark .report-content-disclosure--caution{border-color:#e0a06b;border-left-color:#b45309;background:#fff7ed;color:#7c2d12}
      body.dark .report-completeness--incomplete{border-color:#f0c36a;background:#fffaf0}
      body.dark .report-completeness--complete{border-color:#9bc8ac;background:#f4fbf6}
      aside,.sb-panel .btn,.settings-tabs,.search-hint,.diff-toolbar,.drow-actions,.review-queue-actions,.skip-link,.report-review-start{display:none!important}
      body{display:block;background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}
      .report-hero,.report-workspace{width:100%;margin:0}
      .report-hero{display:block;padding:0 0 14px;border:none;background:#fff}
      .report-hero>*{margin-bottom:10px}
      .report-hero .topbar-main{display:block}
      .report-hero .topbar-compare{margin-top:10px}
      .report-workspace{display:block}
      main{padding:0!important}
      .settings-shell,.sec,.topbar{box-shadow:none}
      .report-diagnostics>summary{display:none}
      .report-diagnostics>.report-notices{display:flex!important}
      .drow-list{gap:6px;padding:6px;background:#fff}
      .sec-head{break-after:avoid}
      .drow,.fj-block,.fc-card,.duo-wrap,.report-fact-grid article{break-inside:avoid}
      details:not([open])>*:not(summary){display:block!important}
      details>summary{break-after:avoid}
      .drow,.fj-block,.fc-card{content-visibility:visible!important;contain-intrinsic-size:none!important}
    }
    @media (prefers-reduced-motion:reduce){
      *,*::before,*::after{scroll-behavior:auto!important;animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important}
    }
  </style>
</head>
<body>
  <a class="skip-link" href="#reportReview">差分レビューへ移動</a>
  <header class="topbar report-hero" data-report-overview aria-labelledby="reportTitle">
    <div class="topbar-main">
      <div class="topbar-eyebrow-row">
        <div class="sb-kicker">kintone 設定差分</div>
        <span class="header-badge">${esc(reportMeta.exportLabel || "全差分")} · ${esc(reportMeta.exportContentLabel)}</span>
      </div>
      <h1 id="reportTitle" class="topbar-title">設定差分レポート</h1>
      <p class="topbar-lead">比較元の設定と比較先の設定を、同じ項目どうしで確認するためのレポートです。</p>
      <div class="topbar-compare" role="group" aria-label="比較方向">
        <section class="topbar-app-card topbar-app-card--source" aria-label="比較元アプリ">
          <span class="topbar-app-eyebrow">比較元</span>
          <span class="topbar-app-side">現在の値</span>
          <strong>${esc(sourceAppDisplay)}</strong>
        </section>
        <span class="topbar-arrow" aria-hidden="true">→</span>
        <section class="topbar-app-card topbar-app-card--target" aria-label="比較先アプリ">
          <span class="topbar-app-eyebrow">比較先</span>
          <span class="topbar-app-side">比較する値</span>
          <strong>${esc(targetAppDisplay)}</strong>
        </section>
      </div>
    </div>

    ${contentDisclosureHtml}

    <section class="report-completeness report-completeness--${reportMeta.incompleteComparison ? "incomplete" : "complete"}" data-comparison-status="${reportMeta.incompleteComparison ? "incomplete" : "complete"}" aria-labelledby="comparisonStatusTitle">
      <span class="report-completeness-mark" aria-hidden="true">${reportMeta.incompleteComparison ? "!" : "✓"}</span>
      <div class="report-completeness-copy">
        <span class="report-step-label">1 · 比較の完全性</span>
        <h2 id="comparisonStatusTitle">${reportMeta.incompleteComparison ? "この結果だけでは、全差分を断定できません" : "比較対象の取得と差分検出は完了しています"}</h2>
        <p>${reportMeta.incompleteComparison ? `${incompleteComparisonWarnings.length}件の未完了要因があります。件数は確認できた範囲の下限として扱ってください。` : "取得失敗・本文未検証・検出上限による打ち切りはありません。"}</p>
      </div>
      ${noticesHtml ? `<details class="report-diagnostics"${reportMeta.incompleteComparison ? " open" : ""}><summary>${reportMeta.incompleteComparison ? "未完了の要因を確認" : "取得範囲と収録内容の詳細"}</summary><div class="report-notices">${noticesHtml}</div></details>` : ""}
    </section>

    ${preparedReviewRows.reviewKeys.length ? `<div class="report-review-start" data-review-start><span>未確認の差分を定義順に確認します。確認状態はレポート内で記録できます。</span><button type="button" id="startPendingReviewBtn">未確認レビューを開始（${preparedReviewRows.reviewKeys.length}件）</button></div>` : ""}

    <section class="report-facts" data-objective-counts aria-labelledby="objectiveCountsTitle">
      <div class="report-facts-head">
        <div>
          <span class="report-step-label">2 · 確認できた客観的な件数</span>
          <h2 id="objectiveCountsTitle">存在状況と差分内容</h2>
        </div>
        <p>判断や優先順位は付けず、比較で確認できた事実だけを表示します。</p>
      </div>
      <div class="report-fact-grid">
        ${objectiveFactCardsHtml}
      </div>
    </section>

    <div class="report-meta-line">
      <span>生成 ${esc(reportMeta.generatedAt)}</span>
      <span>対象 ${esc(sectionText || "-")}</span>
      <span>${esc(comparedContentModeNote)}</span>
      <span data-applied-ignore>${esc(appliedIgnoreSummary)}</span>
      <span data-applied-normalization>${esc(appliedNormalizationSummary)}</span>
    </div>
  </header>

  <div class="report-workspace" data-report-workspace>
  <aside data-report-tools>
    <div class="sb-head">
      <div class="sb-kicker">kintone アプリ設定の比較</div>
      <div class="sb-head-row">
        <div class="sb-title">検索・表示</div>
        <button type="button" id="mobileSidebarToggle" class="mobile-filter-toggle" aria-expanded="false" aria-controls="sidebarPanels">条件・出力</button>
      </div>
      <div class="sb-meta">
        生成日時: ${esc(reportMeta.generatedAt)}<br>
        対象: ${esc(sectionText || "-")}<br>
        出力対象: ${esc(reportMeta.exportLabel || "全差分")}<br>
        内容: ${esc(comparedContentModeNote)}
      </div>
    </div>
    <button type="button" id="sidebarBackdrop" class="sidebar-backdrop" aria-label="絞り込みを閉じる" hidden></button>
    <div id="sidebarPanels" class="sidebar-panels">
    <div class="sidebar-drawer-head">
      <strong id="sidebarDrawerTitle">検索・表示・出力</strong>
      <button type="button" id="sidebarDrawerClose" class="btn">閉じる</button>
    </div>
    <div class="sb-panel sb-stats">
      <div class="sidebar-review-progress sidebar-review-progress--solo">
        <div class="review-progress-copy"><span>レビュー進捗</span><strong id="sidebarReviewProgressValue">0 / ${diffTotal}（0%）</strong></div>
        <div id="sidebarReviewProgressBar" class="review-progress-track" role="progressbar" aria-label="レビュー進捗" aria-valuemin="0" aria-valuemax="${diffTotal}" aria-valuenow="0" aria-valuetext="確認済み 0件 / 全 ${diffTotal}件（0%）"><span id="sidebarReviewProgressFill" style="width:0%"></span></div>
      </div>
    </div>
    <div class="sb-panel sb-ctrl">
      <span class="field-label">項目を検索</span>
      <input type="text" id="search" placeholder="項目名・値・理由で検索" aria-label="差分の検索" autocomplete="off">
      <p class="search-hint"><kbd class="kbd">Ctrl</kbd>+<kbd class="kbd">F</kbd> / <kbd class="kbd">⌘</kbd>+<kbd class="kbd">F</kbd> で検索 · <kbd class="kbd">J</kbd>/<kbd class="kbd">K</kbd> で移動 · <kbd class="kbd">R</kbd> で確認して次へ · <kbd class="kbd">Esc</kbd> でクリア</p>
      <span class="field-label" style="margin-top:14px">表示設定</span>
      <label class="chk"><input type="checkbox" id="hideSame"> 同一項目を隠す</label>
      <label class="chk"><input type="checkbox" id="charDiff" checked> 文字単位ハイライト</label>
      <label class="chk"><input type="checkbox" id="hideUnchangedLines" checked> 複数行差分は変更行だけ表示</label>
      ${includesComparedContent ? '<label class="chk" title="フィールドごとに区切って、設定JSON全体を左右に並べて行単位で比較します（WinMerge風）"><input type="checkbox" id="rawJson"> JSONで比較（フィールド単位）</label>' : ""}
      <label class="chk" title="「確認」チェックを付けた差分行を一覧から隠します"><input type="checkbox" id="hideReviewed"> 確認済みを隠す</label>
      <span class="field-label">表示視点</span>
      <div class="view-side" role="radiogroup" aria-label="差分の表示視点" title="どちらか一方のアプリから見た内容だけを表示します（追加・削除の判定は変わりません）">
        <label class="vs-opt"><input type="radio" name="viewSide" value="both" checked> 両側</label>
        <label class="vs-opt"><input type="radio" name="viewSide" value="source"> 比較元</label>
        <label class="vs-opt"><input type="radio" name="viewSide" value="target"> 比較先</label>
      </div>
      <div class="sb-btns">
        <button type="button" class="btn" id="collapseBtn">全折畳</button>
        <button type="button" class="btn" id="expandBtn">全展開</button>
        <button type="button" class="btn" id="csvBtn" title="表示中の差分行をCSVファイルとして保存">CSV保存</button>
        <button type="button" class="btn" id="mdBtn" title="表示中の差分行をMarkdown表としてクリップボードにコピー">MDコピー</button>
        <button type="button" class="btn" id="themeBtn" style="grid-column:span 2">ダークに切替</button>
      </div>
    </div>
    <div class="sb-panel sb-stats">
      <details class="sidebar-count-details">
        <summary>件数の内訳</summary>
        <div class="sb-stat-grid">
          <div class="sb-stat"><span>表示中</span><b id="stat-total">${summary.total}</b></div>
          <div class="sb-stat"><span>比較先のみ</span><b id="stat-added">${summary.added}</b></div>
          <div class="sb-stat"><span>比較元のみ</span><b id="stat-removed">${summary.removed}</b></div>
          <div class="sb-stat"><span>内容差</span><b id="stat-changed">${objectiveContentChangedCount}</b></div>
          <div class="sb-stat"><span>並び順差</span><b id="stat-moved">${summary.moved}</b></div>
          <div class="sb-stat"><span>同じ</span><b id="stat-same">${summary.same}</b></div>
          <div class="sb-stat"><span>確認済み</span><b id="stat-reviewed">0</b></div>
          <div class="sb-stat"><span>選択中</span><b id="stat-selected">0</b></div>
        </div>
        <div style="margin-top:10px;font-size:11px;color:var(--muted)">取得失敗: <b>${fetchIssues.length}</b></div>
      </details>
    </div>
    ${includesComparedContent ? `<details class="sb-panel sb-ctrl tool-details">
      <summary class="tool-details-summary">出力・反映・比較証跡</summary>
      <div class="tool-details-body">
      <span class="field-label">反映JSON（選択差分 → APIパラメータ）</span>
      <p class="search-hint" style="margin-top:0">${canBuildReflectJson ? "行やフィールドの「選択」にチェックした差分から、比較元の設定値で比較先アプリを上書きするためのAPIパラメータJSONを作成します。" : esc(reflectJsonBlockedReason)}</p>
      <div class="sb-btns">
        <button type="button" class="btn" id="reflectJsonBtn"${reflectJsonDisabledAttrs}>反映JSON保存</button>
        <button type="button" class="btn" id="reflectJsonCopyBtn"${reflectJsonDisabledAttrs}>反映JSONコピー</button>
      </div>
      <span class="field-label" style="margin-top:10px">作成時に利用した設定JSON（比較証跡）</span>
      <div class="sb-btns">
        <button type="button" class="btn" id="srcJsonBtn">比較元JSON</button>
        <button type="button" class="btn" id="tgtJsonBtn">比較先JSON</button>
      </div>
      </div>
    </details>` : ""}
    <div class="sb-panel sb-ctrl sb-advanced">
      <details class="adv">
        <summary class="adv-summary">詳細オプション（表示の絞り込み）</summary>
        <p class="adv-note">出力前と同じ条件をこのレポート上でも選択できます。比較のやり直しは行わず、該当する差分行を表示から除外します。</p>
        <span class="field-label">無視キー（追加）</span>
        <textarea id="extraIgnoreKeys" class="adv-textarea" rows="2" placeholder="無視キー（カンマ区切り）" aria-label="追加の無視キー"></textarea>
        ${reportMeta.ignoreKeys ? `<p class="adv-baked">比較時に適用済みの無視キー: ${esc(reportMeta.ignoreKeys)}</p>` : ""}
        <div class="adv-checks">
          ${advPresetChecksHtml}
        </div>
      </details>
    </div>
    <details class="sb-panel sb-ctrl tool-details review-state-tools">
      <summary class="tool-details-summary">レビュー状態を引き継ぐ</summary>
      <div class="tool-details-body">
        <p class="search-hint">別の端末や担当者へ確認済み状態だけを引き継ぐための補助機能です。</p>
        <div class="review-state-transfer-actions" aria-label="レビュー状態JSONの保存と読込">
          <button type="button" class="btn" id="reviewStateSaveBtn" title="このレポートの確認済み状態をJSONファイルに保存">状態を保存</button>
          <button type="button" class="btn" id="reviewStateLoadBtn" aria-controls="reviewStateFile" title="このレポート用に保存した確認済み状態JSONを読み込んで置き換え">状態を読込</button>
          <input type="file" id="reviewStateFile" accept="application/json,.json" hidden>
          <p id="reviewStateStatus" class="review-state-status" role="status" aria-live="polite">JSONファイルで保存・読込できます（最大2MB）</p>
        </div>
      </div>
    </details>
    <div id="navWrap">
      <div class="nav-label">セクションへジャンプ</div>
      <div id="nav"></div>
    </div>
    </div>
  </aside>
  <main id="reportReview" data-review-workspace tabindex="-1">
    <div class="settings-shell">
      <div class="settings-tabs" role="tablist" aria-label="レポート表示切替">
        <button id="reportTabDiff" type="button" role="tab" class="settings-tab" data-report-tab="diff" aria-selected="true" aria-controls="reportPaneDiff" tabindex="0">差分一覧</button>
        ${includesComparedContent ? '<button id="reportTabSettingsLike" type="button" role="tab" class="settings-tab passive" data-report-tab="settingsLike" aria-selected="false" aria-controls="reportPaneSettingsLike" tabindex="-1">フィールド単位</button>' : ""}
      </div>
      <div id="reportToast" class="report-toast" role="status" aria-live="polite" aria-atomic="true"></div>

      <section id="reportPaneDiff" class="tab-pane" data-report-pane="diff" role="tabpanel" aria-labelledby="reportTabDiff">
        <div class="content">
          <p id="reportFilterStatus" class="report-filter-status" role="status" aria-live="polite" aria-atomic="true">表示 ${summary.total}件、全体 ${reportRows.length}件、未確認 ${preparedReviewRows.reviewKeys.length}件</p>
          <div id="main" aria-busy="false"></div>
        </div>
      </section>

      ${includesComparedContent ? `<section id="reportPaneSettingsLike" class="tab-pane" data-report-pane="settingsLike" role="tabpanel" aria-labelledby="reportTabSettingsLike" hidden>
        <div class="content" style="padding:0">
          <p class="muted" style="margin:0;padding:12px 18px 0;font-size:11px;line-height:1.6"><strong>フィールド単位</strong>で、フィールドごとの設定差分を1つの項目にまとめて確認します。検索と「同一項目を隠す」が連動し、カードのボタンから詳細を表示できます。</p>
          <div id="settingsLikeRoot" class="sl-root"></div>
        </div>
      </section>` : ""}
    </div>

    ${includesComparedContent ? `<div id="fieldDetailModal" class="fd-overlay" hidden>
      <div class="fd-overlay-dialog" role="dialog" aria-modal="true" aria-labelledby="fieldDetailModalTitle" aria-describedby="fieldDetailModalSub" tabindex="-1">
        <div class="fd-overlay-head">
          <div>
            <div class="sb-kicker">フィールドの設定差分</div>
            <div id="fieldDetailModalTitle" class="fd-overlay-title">フィールド詳細</div>
            <div id="fieldDetailModalSub" class="fd-overlay-sub">フィールドコード: - / 型: -</div>
          </div>
          <div class="fd-overlay-actions">
            <span class="fd-overlay-hint">Esc で閉じる</span>
            <button type="button" class="btn" data-modal-close>閉じる</button>
          </div>
        </div>
        <div id="fieldDetailModalBody" class="fd-overlay-body"></div>
      </div>
    </div>` : ""}
  </main>
  </div>
  <script>${logicScript}<\/script>
</body>
</html>`;
  }
  var REPORT_SECTION_ROOT_SCRATCH_KEYS, REPORT_CUSTOMIZE_ITEM_SCRATCH_KEYS, DIFF_HTML_MAX_EXPORT_ROWS, DIFF_HTML_REVIEW_STATE_KIND, DIFF_HTML_REVIEW_STATE_VERSION, DIFF_HTML_REVIEW_STATE_MAX_BYTES;
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
      REPORT_SECTION_ROOT_SCRATCH_KEYS = /* @__PURE__ */ new Set([
        "_partial",
        "_fetchError",
        "_bodyFetchStats",
        "_configFetchStats"
      ]);
      REPORT_CUSTOMIZE_ITEM_SCRATCH_KEYS = /* @__PURE__ */ new Set([
        "_bodyText",
        "_bodyHash",
        "_bodyUnavailable"
      ]);
      DIFF_HTML_MAX_EXPORT_ROWS = 2e3;
      DIFF_HTML_REVIEW_STATE_KIND = "kintone-diff-review-state";
      DIFF_HTML_REVIEW_STATE_VERSION = 1;
      DIFF_HTML_REVIEW_STATE_MAX_BYTES = 2 * 1024 * 1024;
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
  function pickAllSettingsBundles(raw, side) {
    const candidates = unwrapBundleCandidates(raw, side).map((item) => {
      try {
        return ensureBundleShape(item);
      } catch {
        return null;
      }
    }).filter(Boolean);
    if (!candidates.length) throw new Error("設定JSON内にアプリ設定バンドルが見つかりません");
    return candidates;
  }
  async function readSettingsBundleFile(file, options = {}) {
    const text2 = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(String(e.target.result || ""));
      reader.onerror = () => reject(new Error("ファイルの読み取りに失敗しました"));
      reader.readAsText(file);
    });
    return pickSettingsBundle(JSON.parse(text2), options);
  }

  // src/tabs/diff-standalone.ts
  init_engine();
  init_enrich();
  init_utils();
  init_constants();
  function warningInfoForStandalone(rows, fetchIssues, partialIssues = []) {
    const diffCount = countActualDiffRows(rows || []);
    const issueCount = (fetchIssues || []).length;
    const partialIssueCount = partialIssues.length;
    const total = diffCount + issueCount + partialIssueCount;
    return { threshold: 0, diffCount, issueCount, partialIssueCount, total, exceeded: false };
  }
  function collectPartialComparisonIssues(sourceBundle, targetBundle) {
    const issues = [];
    const addSide = (bundle, side) => {
      Object.entries(bundle?.sections || {}).forEach(([sectionKey, section]) => {
        if (section?._fetchError) return;
        const partial = section?._partial;
        if (!partial) return;
        const files = Array.isArray(partial.files) ? partial.files : [];
        const sectionLabel = SECTION_DEFS.find((def) => def.key === sectionKey)?.label || sectionKey;
        issues.push({
          sectionKey,
          section: sectionLabel,
          side,
          message: String(partial.message || "一部データを取得できず、代替情報で比較しました"),
          files: files.map((file) => ({
            fileName: String(file?.fileName || ""),
            fileKey: String(file?.fileKey || ""),
            reason: String(file?.reason || ""),
            detail: String(file?.detail || ""),
            byteSize: Number(file?.byteSize || 0)
          }))
        });
      });
    };
    addSide(sourceBundle, "source");
    addSide(targetBundle, "target");
    return issues;
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
      if (imported) {
        return pickSettingsBundle(imported, {
          side,
          appId: String(params.appId || "").trim(),
          sections: scopes
        });
      }
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
    if (typeof opts.onSourceBundle === "function") {
      opts.onSourceBundle(deepClone(sourceBundle));
    }
    onStatus("比較先を取得中...");
    const targetBundle = deepClone(await resolveSide("target"));
    onStatus("差分計算中...");
    const diffResult = computeDiffRows(sourceBundle, targetBundle, scopes, ignoreKeys, {
      normalizationPresetState,
      includeSame
    });
    const rows = enrichDiffRows(diffResult.rows, sourceBundle, targetBundle);
    const fetchIssues = diffResult.fetchIssues || [];
    const partialIssues = collectPartialComparisonIssues(sourceBundle, targetBundle);
    const s = summarizeRows(rows);
    const warning = warningInfoForStandalone(rows, fetchIssues, partialIssues);
    const truncation = diffResult.truncation?.truncated ? diffResult.truncation : null;
    const actualDiffTruncated = hasIncompleteActualDiffTruncation(truncation);
    const incompleteNotes = [
      actualDiffTruncated ? `差分上限 ${truncation?.diffLimit}件に到達` : "",
      partialIssues.length ? `本文未検証 ${partialIssues.length}件` : ""
    ].filter(Boolean);
    const incompleteNote = incompleteNotes.length ? ` / ⚠ 結果は不完全（${incompleteNotes.join(" / ")}）` : "";
    const droppedSame = Number(truncation?.droppedSame || 0);
    const sameOmissionNote = droppedSame > 0 ? ` / 同一証跡 ${droppedSame}件を上限により省略${actualDiffTruncated ? "" : "（実差分の走査は完了）"}` : "";
    const statusLine = `差分比較完了: 差分 ${countActualDiffRows(rows)}件 / 同一 ${s.same}件 / 取得失敗 ${fetchIssues.length}件 / 一部未検証 ${partialIssues.length}件${warning.exceeded ? ` / 警告 ${warning.total}>=${warning.threshold}` : ""}${incompleteNote}${sameOmissionNote} (追加:${s.added} / 削除:${s.removed} / 変更:${s.changed} / 移動:${s.moved})`;
    onStatus(statusLine);
    return {
      rows,
      fetchIssues,
      partialIssues,
      sourceBundle,
      targetBundle,
      truncation,
      summary: {
        text: statusLine,
        counts: s,
        warning
      }
    };
  }

  // src/entries/diff-lite-ui.ts
  init_constants();

  // src/diff/comparison-profile.ts
  init_constants();
  var DIFF_COMPARISON_PROFILE_KIND = "kintone-diff-comparison-profile";
  var DIFF_COMPARISON_PROFILE_VERSION = 1;
  var DIFF_COMPARISON_PROFILE_LIMITS = Object.freeze({
    jsonLength: 128e3,
    nameLength: 100,
    savedAtLength: 64,
    scopeItems: 64,
    ignoreKeysLength: 2e4,
    ignoreKeyItems: 256,
    ignoreKeyLength: 256,
    normalizationItems: 64
  });
  var DIFF_COMPARISON_PROFILE_DENSITIES = ["compact", "standard", "comfortable"];
  var DIFF_COMPARISON_PROFILE_LAYOUTS = ["split", "stacked"];
  var DiffComparisonProfileError = class extends Error {
    constructor(message) {
      super(message);
      this.name = "DiffComparisonProfileError";
    }
  };
  var VALID_SCOPES = new Set(SECTION_DEFS.map((definition) => definition.key));
  var VALID_NORMALIZATION_PRESETS = new Set(Object.keys(DIFF_NORMALIZATION_PRESETS));
  var VALID_DENSITIES = new Set(DIFF_COMPARISON_PROFILE_DENSITIES);
  var VALID_LAYOUTS = new Set(DIFF_COMPARISON_PROFILE_LAYOUTS);
  var PROTOTYPE_POLLUTION_KEYS = /* @__PURE__ */ new Set(["__proto__", "prototype", "constructor"]);
  var DEFAULT_DISPLAY = Object.freeze({
    charDiff: true,
    showResultList: true,
    density: "standard",
    layout: "split"
  });
  function isRecord(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
  }
  function ownValue(record, key) {
    const descriptor = Object.getOwnPropertyDescriptor(record, key);
    return descriptor && Object.prototype.hasOwnProperty.call(descriptor, "value") ? descriptor.value : void 0;
  }
  function requiredName(value) {
    if (typeof value !== "string") {
      throw new DiffComparisonProfileError("比較条件プロファイル名を入力してください");
    }
    const name = value.trim();
    if (!name) throw new DiffComparisonProfileError("比較条件プロファイル名を入力してください");
    if (name.length > DIFF_COMPARISON_PROFILE_LIMITS.nameLength) {
      throw new DiffComparisonProfileError(`比較条件プロファイル名は${DIFF_COMPARISON_PROFILE_LIMITS.nameLength}文字以内で入力してください`);
    }
    return name;
  }
  function normalizeSavedAt(value) {
    const raw = typeof value === "number" && Number.isFinite(value) ? String(value) : typeof value === "string" ? value.trim() : "";
    if (!raw) return (/* @__PURE__ */ new Date()).toISOString();
    if (raw.length > DIFF_COMPARISON_PROFILE_LIMITS.savedAtLength) {
      throw new DiffComparisonProfileError("保存日時が長すぎます");
    }
    const timestamp = typeof value === "number" ? value : Date.parse(raw);
    if (!Number.isFinite(timestamp)) {
      throw new DiffComparisonProfileError("保存日時の形式が正しくありません");
    }
    try {
      return new Date(timestamp).toISOString();
    } catch {
      throw new DiffComparisonProfileError("保存日時の形式が正しくありません");
    }
  }
  function normalizeScopes(value) {
    const source = Array.isArray(value) ? value : typeof value === "string" ? value.split(/[\s,、，;；]+/) : [];
    if (source.length > DIFF_COMPARISON_PROFILE_LIMITS.scopeItems) {
      throw new DiffComparisonProfileError(`比較対象セクションは${DIFF_COMPARISON_PROFILE_LIMITS.scopeItems}件以内で指定してください`);
    }
    const scopes = [];
    const seen = /* @__PURE__ */ new Set();
    for (const item of source) {
      if (typeof item !== "string") continue;
      const scope = item.trim();
      if (!scope || !VALID_SCOPES.has(scope) || seen.has(scope)) continue;
      seen.add(scope);
      scopes.push(scope);
    }
    if (!scopes.length) {
      throw new DiffComparisonProfileError("比較対象セクションを1つ以上指定してください");
    }
    return scopes;
  }
  function normalizeIgnoreKeys(value) {
    const source = Array.isArray(value) ? value : typeof value === "string" ? value.split(/[\n\r,、，;；]+/) : [];
    if (source.length > DIFF_COMPARISON_PROFILE_LIMITS.ignoreKeyItems) {
      throw new DiffComparisonProfileError(`無視キーは${DIFF_COMPARISON_PROFILE_LIMITS.ignoreKeyItems}件以内で指定してください`);
    }
    const keys = [];
    const seen = /* @__PURE__ */ new Set();
    for (const item of source) {
      if (typeof item !== "string") continue;
      const key = item.trim();
      if (!key || PROTOTYPE_POLLUTION_KEYS.has(key.toLowerCase())) continue;
      if (key.length > DIFF_COMPARISON_PROFILE_LIMITS.ignoreKeyLength) {
        throw new DiffComparisonProfileError(`無視キー1件は${DIFF_COMPARISON_PROFILE_LIMITS.ignoreKeyLength}文字以内で指定してください`);
      }
      const identity = key.toLowerCase().startsWith("path:") ? key : key.toLowerCase();
      if (seen.has(identity)) continue;
      seen.add(identity);
      keys.push(key);
    }
    const normalized = keys.join(", ");
    if (normalized.length > DIFF_COMPARISON_PROFILE_LIMITS.ignoreKeysLength) {
      throw new DiffComparisonProfileError(`無視キー全体は${DIFF_COMPARISON_PROFILE_LIMITS.ignoreKeysLength}文字以内で指定してください`);
    }
    return normalized;
  }
  function normalizePresetState(value) {
    if (!isRecord(value)) return {};
    const keys = Object.keys(value);
    if (keys.length > DIFF_COMPARISON_PROFILE_LIMITS.normalizationItems) {
      throw new DiffComparisonProfileError(`正規化設定は${DIFF_COMPARISON_PROFILE_LIMITS.normalizationItems}件以内で指定してください`);
    }
    const state3 = {};
    for (const key of keys) {
      if (PROTOTYPE_POLLUTION_KEYS.has(key.toLowerCase()) || !VALID_NORMALIZATION_PRESETS.has(key)) continue;
      const enabled = ownValue(value, key);
      if (typeof enabled === "boolean") state3[key] = enabled;
    }
    return state3;
  }
  function normalizeDisplay(value) {
    if (!isRecord(value)) return { ...DEFAULT_DISPLAY };
    const rawDensity = ownValue(value, "density");
    const density = typeof rawDensity === "string" && VALID_DENSITIES.has(rawDensity) ? rawDensity : DEFAULT_DISPLAY.density;
    const rawCharDiff = ownValue(value, "charDiff");
    const rawShowResultList = ownValue(value, "showResultList");
    const rawLayout = ownValue(value, "layout");
    const layout = typeof rawLayout === "string" && VALID_LAYOUTS.has(rawLayout) ? rawLayout : DEFAULT_DISPLAY.layout;
    return {
      charDiff: typeof rawCharDiff === "boolean" ? rawCharDiff : DEFAULT_DISPLAY.charDiff,
      showResultList: typeof rawShowResultList === "boolean" ? rawShowResultList : DEFAULT_DISPLAY.showResultList,
      density,
      layout
    };
  }
  function parseInput(raw) {
    if (typeof raw !== "string") {
      if (!isRecord(raw)) throw new DiffComparisonProfileError("比較条件プロファイルはオブジェクトで指定してください");
      return raw;
    }
    if (raw.length > DIFF_COMPARISON_PROFILE_LIMITS.jsonLength) {
      throw new DiffComparisonProfileError("比較条件プロファイルのJSONが大きすぎます");
    }
    try {
      const parsed = JSON.parse(raw);
      if (!isRecord(parsed)) throw new Error("not-object");
      return parsed;
    } catch {
      throw new DiffComparisonProfileError("比較条件プロファイルのJSON形式が正しくありません");
    }
  }
  function buildDiffComparisonProfile(input) {
    if (!isRecord(input)) {
      throw new DiffComparisonProfileError("比較条件プロファイルはオブジェクトで指定してください");
    }
    return {
      kind: DIFF_COMPARISON_PROFILE_KIND,
      version: DIFF_COMPARISON_PROFILE_VERSION,
      name: requiredName(ownValue(input, "name")),
      savedAt: normalizeSavedAt(ownValue(input, "savedAt")),
      scopes: normalizeScopes(ownValue(input, "scopes")),
      ignoreKeys: normalizeIgnoreKeys(ownValue(input, "ignoreKeys")),
      includeSame: ownValue(input, "includeSame") === true,
      normalizationPresetState: normalizePresetState(ownValue(input, "normalizationPresetState")),
      display: normalizeDisplay(ownValue(input, "display"))
    };
  }
  function parseDiffComparisonProfile(raw) {
    const input = parseInput(raw);
    const kind = ownValue(input, "kind");
    if (kind !== void 0 && kind !== DIFF_COMPARISON_PROFILE_KIND) {
      throw new DiffComparisonProfileError("比較条件プロファイルの種類が正しくありません");
    }
    const version = ownValue(input, "version");
    if (version !== void 0 && Number(version) !== DIFF_COMPARISON_PROFILE_VERSION) {
      throw new DiffComparisonProfileError(`対応していない比較条件プロファイルのバージョンです: ${String(version)}`);
    }
    return buildDiffComparisonProfile(input);
  }
  function serializeDiffComparisonProfile(raw, space = 2) {
    const profile = parseDiffComparisonProfile(raw);
    const indentation = Number.isFinite(space) ? Math.max(0, Math.min(10, Math.trunc(space))) : 2;
    return JSON.stringify(profile, null, indentation);
  }

  // src/entries/diff-lite-ui.ts
  init_export();
  init_engine();

  // src/diff/xlsx-export.ts
  init_constants();
  init_utils();
  init_export();
  init_export_safety();
  init_enrich();
  init_path_decoder();
  init_engine();

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
    return String(s ?? "").replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\uFFFE\uFFFF]/g, "").replace(/_(?=[xX][0-9A-Fa-f]{4}_)/g, "_x005F_").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
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
    n = n.replace(/^'+|'+$/g, "_");
    if (n.length > 31) n = n.slice(0, 31);
    if (!n) n = `Sheet${index + 1}`;
    let candidate = n;
    let i = 2;
    while (used.has(candidate.toLocaleLowerCase("en-US"))) {
      const suffix = `_${i++}`;
      candidate = (n.length + suffix.length > 31 ? n.slice(0, 31 - suffix.length) : n) + suffix;
    }
    used.add(candidate.toLocaleLowerCase("en-US"));
    return candidate;
  }
  var MIN_COL_W = 10;
  var MAX_COL_W = 60;
  var EXCEL_CELL_TEXT_LIMIT = 32767;
  function shortTextHash(text2) {
    let hash = 2166136261;
    for (let i = 0; i < text2.length; i += 1) {
      hash ^= text2.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(16).padStart(8, "0");
  }
  function normalizeExcelCellText(value) {
    const text2 = String(value ?? "");
    if (text2.length <= EXCEL_CELL_TEXT_LIMIT) return text2;
    const suffix = `
…（Excelセル上限32,767文字のため省略・元${text2.length}文字・識別:${shortTextHash(text2)}）`;
    let keep = EXCEL_CELL_TEXT_LIMIT - suffix.length;
    if (keep > 0 && /[\uD800-\uDBFF]/.test(text2.charAt(keep - 1))) keep -= 1;
    return text2.slice(0, Math.max(0, keep)) + suffix;
  }
  var CELL_STYLE_INDEX = {
    normal: 2,
    source: 3,
    sourceDivider: 14,
    sourceGroup: 16,
    target: 4,
    targetGroup: 17,
    warning: 5,
    title: 6,
    sectionHeader: 7,
    kpiGood: 8,
    kpiWarning: 9,
    kpiDanger: 10,
    review: 11,
    info: 12,
    headerDivider: 15,
    hyperlink: 13,
    subtitle: 18,
    kpiChange: 19,
    summaryLabel: 20,
    summaryValue: 21,
    center: 22,
    zebra: 23,
    zebraCenter: 24,
    changeAdded: 25,
    changeRemoved: 26,
    changeChanged: 27,
    changeMoved: 28,
    reviewChoice: 29,
    actionLink: 30,
    category: 31,
    directionArrow: 32,
    metricValueAdded: 33,
    metricValueRemoved: 34,
    metricValueChanged: 35,
    metricValueMoved: 36,
    diffBefore: 37,
    diffAfter: 38,
    diffAbsent: 39
  };
  function normalizedPaneCount(value, max) {
    const n = Math.floor(Number(value));
    return Number.isFinite(n) && n > 0 ? Math.min(n, max) : 0;
  }
  function normalizedPositiveInt(value, fallback, max) {
    const n = Math.floor(Number(value));
    return Number.isFinite(n) && n > 0 ? Math.min(n, max) : fallback;
  }
  function normalizedNonNegativeInt(value, fallback, max) {
    const n = Math.floor(Number(value));
    return Number.isFinite(n) && n >= 0 ? Math.min(n, max) : fallback;
  }
  function normalizedZoomScale(value) {
    if (value == null) return null;
    const n = Math.floor(Number(value));
    return Number.isFinite(n) ? Math.max(10, Math.min(400, n)) : null;
  }
  function buildPaneXml(freezeRows, freezeColumns) {
    if (!freezeRows && !freezeColumns) return "";
    const attrs = [];
    if (freezeColumns) attrs.push(`xSplit="${freezeColumns}"`);
    if (freezeRows) attrs.push(`ySplit="${freezeRows}"`);
    attrs.push(`topLeftCell="${colRef(freezeColumns + 1)}${freezeRows + 1}"`);
    attrs.push(`activePane="${freezeRows && freezeColumns ? "bottomRight" : freezeColumns ? "topRight" : "bottomLeft"}"`);
    attrs.push('state="frozen"');
    return `<pane ${attrs.join(" ")}/>`;
  }
  function isSafeCellRange(value) {
    return /^[A-Z]{1,3}[1-9][0-9]*:[A-Z]{1,3}[1-9][0-9]*$/.test(value);
  }
  function isSafeCellRef(value) {
    const match = /^([A-Z]{1,3})([1-9][0-9]*)$/.exec(value);
    if (!match) return false;
    let column = 0;
    for (const char of match[1]) column = column * 26 + char.charCodeAt(0) - 64;
    const row = Number(match[2]);
    return column >= 1 && column <= 16384 && Number.isSafeInteger(row) && row <= 1048576;
  }
  function normalizedOutline(value) {
    const rawLevel = Math.floor(Number(value?.level));
    const level = Number.isFinite(rawLevel) ? Math.max(0, Math.min(7, rawLevel)) : 0;
    return {
      level,
      hidden: level > 0 && value?.hidden === true,
      collapsed: value?.collapsed === true
    };
  }
  function resolveInternalHyperlinks(sheets, safeSheetNames, links) {
    const resolved = [];
    const seenRefs = /* @__PURE__ */ new Set();
    for (const link of links || []) {
      const ref = String(link?.ref || "").toUpperCase();
      const targetCell = String(link?.targetCell || "A1").toUpperCase();
      if (!isSafeCellRef(ref) || !isSafeCellRef(targetCell) || seenRefs.has(ref)) continue;
      let targetIndex = Number.isInteger(link.targetSheetIndex) ? Number(link.targetSheetIndex) : -1;
      if (targetIndex < 0 || targetIndex >= safeSheetNames.length) {
        const requested = String(link.targetSheet || "");
        targetIndex = sheets.findIndex((sheet) => String(sheet.name || "") === requested);
        if (targetIndex < 0) {
          const folded = requested.toLocaleLowerCase("en-US");
          targetIndex = safeSheetNames.findIndex((name) => name.toLocaleLowerCase("en-US") === folded);
        }
      }
      if (targetIndex < 0 || targetIndex >= safeSheetNames.length) continue;
      seenRefs.add(ref);
      resolved.push({
        ref,
        targetSheet: safeSheetNames[targetIndex],
        targetCell,
        tooltip: link.tooltip == null ? void 0 : String(link.tooltip).slice(0, 255)
      });
    }
    return resolved;
  }
  function estimateColWidth(rows, col) {
    let max = MIN_COL_W;
    const limit = Math.min(rows.length, 500);
    for (let r = 0; r < limit; r++) {
      const v = rows[r] ? rows[r][col] : void 0;
      if (v == null) continue;
      const text2 = String(v);
      let maxLine = 0;
      for (const line of text2.split("\n")) {
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
  function buildSheetXml(sheet, internalHyperlinks) {
    const rows = sheet.rows || [];
    const maxCols = rows.reduce((n, r) => Math.max(n, r ? r.length : 0), 0);
    const headerRow = normalizedPositiveInt(sheet.headerRow, 1, Math.max(1, rows.length));
    const widths = sheet.colWidths && sheet.colWidths.length ? sheet.colWidths : Array.from({ length: maxCols }, (_, i) => estimateColWidth(rows, i));
    const hyperlinkRefs = new Set(internalHyperlinks.map((link) => link.ref));
    const materializeEmptyCellsFromRow = sheet.materializeEmptyCellsFromRow == null ? null : normalizedPositiveInt(sheet.materializeEmptyCellsFromRow, 1, Math.max(1, rows.length));
    const outlines = rows.map((_, index) => normalizedOutline(sheet.rowOutlines?.[index]));
    const maxOutlineLevel = outlines.reduce((max, outline) => Math.max(max, outline.level), 0);
    const hasOutline = maxOutlineLevel > 0 || outlines.some((outline) => outline.collapsed);
    const out = [];
    out.push(XML_HEADER);
    out.push('<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">');
    if (sheet.print || hasOutline) {
      out.push("<sheetPr>");
      if (hasOutline) out.push(`<outlinePr summaryBelow="${sheet.outlineSummaryBelow === false ? 0 : 1}" summaryRight="1"/>`);
      if (sheet.print) out.push('<pageSetUpPr fitToPage="1"/>');
      out.push("</sheetPr>");
    }
    const freezeRows = normalizedPaneCount(sheet.freezeRows == null ? sheet.freezeHeader !== false && rows.length > 0 ? 1 : 0 : sheet.freezeRows, 1048575);
    const freezeColumns = normalizedPaneCount(sheet.freezeColumns, 16383);
    const paneXml = buildPaneXml(freezeRows, freezeColumns);
    const zoomScale = normalizedZoomScale(sheet.zoomScale);
    if (paneXml || sheet.showGridLines === false || zoomScale != null) {
      const gridLines = sheet.showGridLines === false ? ' showGridLines="0"' : "";
      const zoom = zoomScale == null ? "" : ` zoomScale="${zoomScale}" zoomScaleNormal="${zoomScale}"`;
      out.push(`<sheetViews><sheetView workbookViewId="0"${gridLines}${zoom}>`);
      if (paneXml) out.push(paneXml);
      out.push("</sheetView></sheetViews>");
    }
    out.push(`<sheetFormatPr defaultRowHeight="16"${maxOutlineLevel ? ` outlineLevelRow="${maxOutlineLevel}"` : ""}/>`);
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
      const materializeEmptyCells = materializeEmptyCellsFromRow != null && r + 1 >= materializeEmptyCellsFromRow;
      const cellCount = materializeEmptyCells ? maxCols : row.length;
      for (let c = 0; c < cellCount; c++) {
        const v = row[c];
        const explicitCellStyle = sheet.cellStyles?.[r]?.[c];
        const isEmptyCell = v === null || v === void 0 || v === "";
        if (isEmptyCell && !explicitCellStyle && !materializeEmptyCells) continue;
        const ref = `${colRef(c + 1)}${r + 1}`;
        const rowStyle = sheet.rowStyles?.[r] || "normal";
        const styleIndex = explicitCellStyle ? CELL_STYLE_INDEX[explicitCellStyle] : r + 1 === headerRow ? 1 : hyperlinkRefs.has(ref) && rowStyle === "normal" ? CELL_STYLE_INDEX.hyperlink : CELL_STYLE_INDEX[rowStyle];
        const styleAttr = ` s="${styleIndex}"`;
        if (isEmptyCell && (materializeEmptyCells || explicitCellStyle && sheet.styledEmptyCellsAsBlank === true)) {
          cells.push(`<c r="${ref}"${styleAttr}/>`);
        } else if (typeof v === "number" && Number.isFinite(v)) {
          cells.push(`<c r="${ref}"${styleAttr}><v>${v}</v></c>`);
        } else if (typeof v === "boolean") {
          cells.push(`<c r="${ref}"${styleAttr} t="b"><v>${v ? 1 : 0}</v></c>`);
        } else {
          cells.push(`<c r="${ref}"${styleAttr} t="inlineStr"><is><t xml:space="preserve">${escapeXml(normalizeExcelCellText(v))}</t></is></c>`);
        }
      }
      const rowHeight = Number(sheet.rowHeights?.[r]);
      const heightAttr = Number.isFinite(rowHeight) && rowHeight > 0 ? ` ht="${Math.min(409, rowHeight)}" customHeight="1"` : "";
      const outline = outlines[r];
      const outlineAttrs = [
        outline.level ? ` outlineLevel="${outline.level}"` : "",
        outline.hidden ? ' hidden="1"' : "",
        outline.collapsed ? ' collapsed="1"' : ""
      ].join("");
      out.push(`<row r="${r + 1}"${heightAttr}${outlineAttrs}>${cells.join("")}</row>`);
    }
    out.push("</sheetData>");
    if (sheet.autoFilter !== false && rows.length >= headerRow && maxCols > 0) {
      out.push(`<autoFilter ref="A${headerRow}:${colRef(maxCols)}${rows.length}"/>`);
    }
    const merges = (sheet.merges || []).filter(isSafeCellRange);
    if (merges.length) {
      out.push(`<mergeCells count="${merges.length}">`);
      for (const ref of merges) out.push(`<mergeCell ref="${ref}"/>`);
      out.push("</mergeCells>");
    }
    const validations = (sheet.dataValidations || []).filter((validation) => isSafeCellRange(validation.sqref) && validation.values.length > 0 && validation.values.every((value) => !String(value).includes(",")) && validation.values.map(String).join(",").length <= 255);
    if (validations.length) {
      out.push(`<dataValidations count="${validations.length}">`);
      for (const validation of validations) {
        const promptTitle = validation.promptTitle ? ` promptTitle="${escapeXml(validation.promptTitle)}"` : "";
        const prompt = validation.prompt ? ` prompt="${escapeXml(validation.prompt)}"` : "";
        const formula = `&quot;${escapeXml(validation.values.map((value) => String(value).replace(/"/g, '""')).join(","))}&quot;`;
        out.push(`<dataValidation type="list" allowBlank="1" showInputMessage="1" showErrorMessage="1" sqref="${validation.sqref}"${promptTitle}${prompt}><formula1>${formula}</formula1></dataValidation>`);
      }
      out.push("</dataValidations>");
    }
    if (internalHyperlinks.length) {
      out.push("<hyperlinks>");
      for (const hyperlink of internalHyperlinks) {
        const formulaSheetName = hyperlink.targetSheet.replace(/'/g, "''");
        const location = `'${formulaSheetName}'!${hyperlink.targetCell}`;
        const tooltip = hyperlink.tooltip ? ` tooltip="${escapeXml(hyperlink.tooltip)}"` : "";
        out.push(`<hyperlink ref="${hyperlink.ref}" location="${escapeXml(location)}"${tooltip}/>`);
      }
      out.push("</hyperlinks>");
    }
    if (sheet.print) {
      const orientation = sheet.print.orientation === "landscape" ? "landscape" : "portrait";
      const fitToWidth = normalizedNonNegativeInt(sheet.print.fitToWidth, 1, 32767);
      const fitToHeight = normalizedNonNegativeInt(sheet.print.fitToHeight, 0, 32767);
      const horizontalCentered = sheet.print.horizontalCentered === true ? 1 : 0;
      out.push(`<printOptions horizontalCentered="${horizontalCentered}" verticalCentered="0" gridLines="0" headings="0"/>`);
      out.push('<pageMargins left="0.3" right="0.3" top="0.5" bottom="0.5" header="0.2" footer="0.2"/>');
      out.push(`<pageSetup paperSize="9" orientation="${orientation}" fitToWidth="${fitToWidth}" fitToHeight="${fitToHeight}"/>`);
      if (sheet.print.footer) {
        out.push(`<headerFooter><oddFooter>${escapeXml(String(sheet.print.footer).slice(0, 255))}</oddFooter></headerFooter>`);
      }
    }
    out.push("</worksheet>");
    return out.join("");
  }
  function buildWorkbookXml(sheets) {
    const items = sheets.map((s, i) => `<sheet name="${escapeXml(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join("");
    const printTitles = sheets.flatMap((sheet, index) => {
      const repeatRows = sheet.print?.repeatRows;
      const repeatColumns = sheet.print?.repeatColumns;
      if (!repeatRows && !repeatColumns) return [];
      const formulaSheetName = sheet.name.replace(/'/g, "''");
      const ranges = [];
      if (repeatRows) {
        const from = normalizedPositiveInt(repeatRows.from, 1, 1048576);
        const to = Math.max(from, normalizedPositiveInt(repeatRows.to, from, 1048576));
        ranges.push(`'${formulaSheetName}'!$${from}:$${to}`);
      }
      if (repeatColumns) {
        const from = normalizedPositiveInt(repeatColumns.from, 1, 16384);
        const to = Math.max(from, normalizedPositiveInt(repeatColumns.to, from, 16384));
        ranges.push(`'${formulaSheetName}'!$${colRef(from)}:$${colRef(to)}`);
      }
      return [`<definedName name="_xlnm.Print_Titles" localSheetId="${index}">${escapeXml(ranges.join(","))}</definedName>`];
    }).join("");
    const definedNames = printTitles ? `<definedNames>${printTitles}</definedNames>` : "";
    return `${XML_HEADER}<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${items}</sheets>${definedNames}</workbook>`;
  }
  function buildWorkbookRels(sheets) {
    const items = sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join("");
    const styles = `<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>`;
    return `${XML_HEADER}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${items}${styles}</Relationships>`;
  }
  function buildContentTypes(sheets) {
    const overrides = sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("");
    return `${XML_HEADER}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>` + overrides + "</Types>";
  }
  function buildRootRels() {
    return `${XML_HEADER}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`;
  }
  var CUSTOMER_DIFF_STYLES = /* @__PURE__ */ new Set(["diffBefore", "diffAfter", "diffAbsent"]);
  function sheetsUseCustomerDiffStyles(sheets) {
    return sheets.some((sheet) => sheet.rowStyles?.some((style) => CUSTOMER_DIFF_STYLES.has(style)) || sheet.cellStyles?.some((row) => row?.some((style) => !!style && CUSTOMER_DIFF_STYLES.has(style))));
  }
  function buildStylesXml(includeCustomerDiffStyles) {
    return `${XML_HEADER}<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="${includeCustomerDiffStyles ? 18 : 16}"><font><sz val="11"/><name val="Meiryo"/></font><font><b/><sz val="11"/><name val="Meiryo"/><color rgb="FFFFFFFF"/></font><font><b/><sz val="18"/><name val="Meiryo"/><color rgb="FFFFFFFF"/></font><font><b/><sz val="12"/><name val="Meiryo"/><color rgb="FF1E3A5F"/></font><font><b/><sz val="11"/><name val="Meiryo"/><color rgb="FF0F172A"/></font><font><u/><sz val="11"/><name val="Meiryo"/><color rgb="FF0563C1"/></font><font><b/><sz val="16"/><name val="Meiryo"/><color rgb="FF1E3A5F"/></font><font><b/><sz val="11"/><name val="Meiryo"/><color rgb="FF15803D"/></font><font><b/><sz val="11"/><name val="Meiryo"/><color rgb="FFB91C1C"/></font><font><b/><sz val="11"/><name val="Meiryo"/><color rgb="FFB45309"/></font><font><b/><sz val="11"/><name val="Meiryo"/><color rgb="FF7C3AED"/></font><font><b/><sz val="16"/><name val="Meiryo"/><color rgb="FF15803D"/></font><font><b/><sz val="16"/><name val="Meiryo"/><color rgb="FFB91C1C"/></font><font><b/><sz val="16"/><name val="Meiryo"/><color rgb="FFB45309"/></font><font><b/><sz val="16"/><name val="Meiryo"/><color rgb="FF7C3AED"/></font><font><b/><sz val="16"/><name val="Meiryo"/><color rgb="FF2563EB"/></font>` + (includeCustomerDiffStyles ? '<font><sz val="11"/><name val="Meiryo"/><color rgb="FF991B1B"/></font><font><sz val="11"/><name val="Meiryo"/><color rgb="FF166534"/></font>' : "") + `</fonts><fills count="10"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF1E3A5F"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFF1F5F9"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFEFF6FF"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFFEF2F2"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFFFFBEB"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFF8FAFC"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFECFDF5"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFF5F3FF"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="6"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="thin"><color rgb="FFE2E8F0"/></left><right style="thin"><color rgb="FFE2E8F0"/></right><top style="thin"><color rgb="FFE2E8F0"/></top><bottom style="thin"><color rgb="FFE2E8F0"/></bottom><diagonal/></border><border><left style="thin"><color rgb="FFCBD5E1"/></left><right style="thin"><color rgb="FFCBD5E1"/></right><top style="thin"><color rgb="FFCBD5E1"/></top><bottom style="medium"><color rgb="FF94A3B8"/></bottom><diagonal/></border><border><left style="thin"><color rgb="FFE2E8F0"/></left><right style="medium"><color rgb="FF64748B"/></right><top style="thin"><color rgb="FFE2E8F0"/></top><bottom style="thin"><color rgb="FFE2E8F0"/></bottom><diagonal/></border><border><left style="thin"><color rgb="FFCBD5E1"/></left><right style="medium"><color rgb="FF64748B"/></right><top style="thin"><color rgb="FFCBD5E1"/></top><bottom style="medium"><color rgb="FF94A3B8"/></bottom><diagonal/></border><border><left style="thin"><color rgb="FFE2E8F0"/></left><right style="thin"><color rgb="FFE2E8F0"/></right><top style="medium"><color rgb="FF94A3B8"/></top><bottom style="thin"><color rgb="FFE2E8F0"/></bottom><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="${includeCustomerDiffStyles ? 40 : 37}"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="2" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" horizontal="center" wrapText="1"/></xf><xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf><xf numFmtId="0" fontId="0" fillId="3" borderId="1" xfId="0" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf><xf numFmtId="0" fontId="0" fillId="4" borderId="1" xfId="0" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf><xf numFmtId="0" fontId="0" fillId="5" borderId="1" xfId="0" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf><xf numFmtId="0" fontId="2" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment vertical="center" horizontal="left"/></xf><xf numFmtId="0" fontId="3" fillId="3" borderId="2" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="4" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" horizontal="center" wrapText="1"/></xf><xf numFmtId="0" fontId="4" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" horizontal="center" wrapText="1"/></xf><xf numFmtId="0" fontId="4" fillId="5" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" horizontal="center" wrapText="1"/></xf><xf numFmtId="0" fontId="0" fillId="6" borderId="1" xfId="0" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf><xf numFmtId="0" fontId="0" fillId="3" borderId="1" xfId="0" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf><xf numFmtId="0" fontId="5" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf><xf numFmtId="0" fontId="0" fillId="3" borderId="3" xfId="0" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf><xf numFmtId="0" fontId="1" fillId="2" borderId="4" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" horizontal="center" wrapText="1"/></xf><xf numFmtId="0" fontId="4" fillId="3" borderId="3" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" horizontal="center" wrapText="1"/></xf><xf numFmtId="0" fontId="4" fillId="4" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" horizontal="center" wrapText="1"/></xf><xf numFmtId="0" fontId="3" fillId="4" borderId="2" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" horizontal="left" wrapText="1"/></xf><xf numFmtId="0" fontId="6" fillId="4" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" horizontal="center" wrapText="1"/></xf><xf numFmtId="0" fontId="4" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" horizontal="left" wrapText="1"/></xf><xf numFmtId="0" fontId="6" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" horizontal="center" wrapText="1"/></xf><xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment vertical="center" horizontal="center" wrapText="1"/></xf><xf numFmtId="0" fontId="0" fillId="7" borderId="1" xfId="0" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf><xf numFmtId="0" fontId="0" fillId="7" borderId="1" xfId="0" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" horizontal="center" wrapText="1"/></xf><xf numFmtId="0" fontId="7" fillId="8" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" horizontal="center" wrapText="1"/></xf><xf numFmtId="0" fontId="8" fillId="5" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" horizontal="center" wrapText="1"/></xf><xf numFmtId="0" fontId="9" fillId="6" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" horizontal="center" wrapText="1"/></xf><xf numFmtId="0" fontId="10" fillId="9" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" horizontal="center" wrapText="1"/></xf><xf numFmtId="0" fontId="4" fillId="6" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" horizontal="center" wrapText="1"/></xf><xf numFmtId="0" fontId="5" fillId="4" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" horizontal="center" wrapText="1"/></xf><xf numFmtId="0" fontId="4" fillId="7" borderId="5" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf><xf numFmtId="0" fontId="15" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment vertical="center" horizontal="center"/></xf><xf numFmtId="0" fontId="11" fillId="8" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" horizontal="center" wrapText="1"/></xf><xf numFmtId="0" fontId="12" fillId="5" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" horizontal="center" wrapText="1"/></xf><xf numFmtId="0" fontId="13" fillId="6" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" horizontal="center" wrapText="1"/></xf><xf numFmtId="0" fontId="14" fillId="9" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" horizontal="center" wrapText="1"/></xf>` + (includeCustomerDiffStyles ? '<xf numFmtId="0" fontId="16" fillId="5" borderId="3" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf><xf numFmtId="0" fontId="17" fillId="8" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf><xf numFmtId="0" fontId="0" fillId="7" borderId="1" xfId="0" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" horizontal="center" wrapText="1"/></xf>' : "") + '</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>';
  }
  function buildXlsxBlob(sheets) {
    const enc = new TextEncoder();
    const used = /* @__PURE__ */ new Set();
    const safe = sheets.map((s, i) => ({ ...s, name: sanitizeSheetName(s.name, i, used) }));
    const safeSheetNames = safe.map((sheet) => sheet.name);
    const hyperlinksBySheet = safe.map((sheet) => resolveInternalHyperlinks(sheets, safeSheetNames, sheet.internalHyperlinks));
    const entries = [
      { name: "[Content_Types].xml", data: enc.encode(buildContentTypes(safe)) },
      { name: "_rels/.rels", data: enc.encode(buildRootRels()) },
      { name: "xl/workbook.xml", data: enc.encode(buildWorkbookXml(safe)) },
      { name: "xl/_rels/workbook.xml.rels", data: enc.encode(buildWorkbookRels(safe)) },
      { name: "xl/styles.xml", data: enc.encode(buildStylesXml(sheetsUseCustomerDiffStyles(safe))) }
    ];
    safe.forEach((s, i) => {
      entries.push({ name: `xl/worksheets/sheet${i + 1}.xml`, data: enc.encode(buildSheetXml(s, hyperlinksBySheet[i])) });
    });
    return buildStoredZip(entries);
  }

  // src/diff/xlsx-export.ts
  var SECTION_LABEL_BY_KEY2 = new Map(SECTION_DEFS.map((d) => [d.key, d.label]));
  var SECTION_ORDER_BY_KEY = new Map(SECTION_DEFS.map((d, i) => [d.key, i]));
  function truncationScanStatusOf(section) {
    if (section.scanStatus === "complete" || section.scanStatus === "partial" || section.scanStatus === "unscanned") {
      return section.scanStatus;
    }
    if (section.scanned === false) return "unscanned";
    if (section.partiallyScanned === true || section.omittedDiffCount === null) return "partial";
    return "complete";
  }
  function truncationSectionName(section) {
    return sectionLabelOf(section.sectionKey || section.section || "全体");
  }
  var NORMALIZATION_LABELS = {
    viewOrder: "ビュー順序",
    permissionOrder: "権限順序",
    generalArrayOrder: "一般配列順序",
    fieldOrder: "フィールド順序",
    processOrder: "プロセス順序",
    appReferences: "アプリ参照",
    auditMeta: "監査メタ情報",
    labelsAndText: "ラベル・説明文",
    appearance: "表示設定",
    fileKeys: "ファイルキー",
    enabledFlags: "有効フラグ"
  };
  function sectionLabelOf(key) {
    return SECTION_LABEL_BY_KEY2.get(key) || key || "(未分類)";
  }
  function sectionKeyOfRow(row) {
    return String(row.sectionKey || row.section || "(その他)");
  }
  function normalizationLabel(state3) {
    if (!state3 || !Object.keys(state3).length) return "未記録";
    const entries = Object.entries(state3).sort(([a], [b]) => a.localeCompare(b));
    const enabled = entries.filter(([, value]) => !!value).map(([key]) => NORMALIZATION_LABELS[key] || key);
    const disabled = entries.filter(([, value]) => !value).map(([key]) => NORMALIZATION_LABELS[key] || key);
    return `有効: ${enabled.length ? enabled.join("、") : "なし"} / 無効: ${disabled.length ? disabled.join("、") : "なし"}`;
  }
  function groupRowsBySection(rows) {
    const map = /* @__PURE__ */ new Map();
    for (const r of rows) {
      const key = sectionKeyOfRow(r);
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
  var FIELD_SETTING_LABELS = {
    label: "フィールド名",
    name: "フィールド名",
    code: "フィールドコード",
    type: "フィールドタイプ",
    noLabel: "フィールド名を表示しない",
    required: "必須項目にする",
    unique: "重複禁止にする",
    defaultValue: "初期値",
    defaultNowValue: "現在日時を初期値にする",
    description: "説明",
    minLength: "最小文字数",
    maxLength: "最大文字数",
    minValue: "最小値",
    maxValue: "最大値",
    expression: "計算式",
    hideExpression: "計算式を表示しない",
    options: "選択肢",
    protocol: "プロトコル",
    displayScale: "小数点以下の表示桁数",
    digit: "桁区切りを表示する",
    unit: "単位記号",
    unitPosition: "単位記号の位置",
    align: "並び",
    format: "表示形式",
    entities: "選択候補",
    fields: "テーブル内の項目",
    referenceTable: "関連レコード一覧設定",
    lookup: "ルックアップ設定",
    condition: "表示条件（フィールドの一致）",
    displayFields: "表示するフィールド",
    filterCond: "絞り込み条件",
    relatedApp: "参照するアプリ",
    size: "一度に表示する最大件数",
    sort: "ソート",
    relatedKeyField: "コピー元のフィールド",
    fieldMappings: "ほかのフィールドのコピー",
    lookupPickerFields: "選択画面に表示するフィールド",
    field: "自アプリのフィールド",
    relatedField: "参照するアプリのフィールド",
    app: "参照するアプリID",
    thumbnailSize: "サムネイルの大きさ",
    index: "並び順"
  };
  var FIELD_TYPE_LABELS = {
    SINGLE_LINE_TEXT: "文字列（1行）",
    MULTI_LINE_TEXT: "文字列（複数行）",
    RICH_TEXT: "リッチエディター",
    NUMBER: "数値",
    CALC: "計算",
    RADIO_BUTTON: "ラジオボタン",
    CHECK_BOX: "チェックボックス",
    MULTI_SELECT: "複数選択",
    DROP_DOWN: "ドロップダウン",
    DATE: "日付",
    TIME: "時刻",
    DATETIME: "日時",
    LINK: "リンク",
    FILE: "添付ファイル",
    USER_SELECT: "ユーザー選択",
    ORGANIZATION_SELECT: "組織選択",
    GROUP_SELECT: "グループ選択",
    REFERENCE_TABLE: "関連レコード一覧",
    SUBTABLE: "テーブル",
    GROUP: "グループ",
    LABEL: "ラベル",
    SPACER: "スペース",
    RECORD_NUMBER: "レコード番号",
    CREATOR: "作成者",
    CREATED_TIME: "作成日時",
    MODIFIER: "更新者",
    UPDATED_TIME: "更新日時",
    STATUS: "ステータス",
    STATUS_ASSIGNEE: "作業者",
    CATEGORY: "カテゴリー"
  };
  function fieldSettingsProperties(bundle) {
    const section = bundle?.sections?.fieldSettings;
    if (!section || typeof section !== "object" || Array.isArray(section)) return {};
    const properties = section.properties;
    if (properties && typeof properties === "object" && !Array.isArray(properties)) return properties;
    return section;
  }
  function fieldDefinitionAt(bundle, info) {
    const root2 = fieldSettingsProperties(bundle)[info.rootCode];
    if (!root2 || typeof root2 !== "object" || Array.isArray(root2)) return null;
    if (!info.isSubField) return root2;
    const child = root2.fields?.[info.subFieldCode];
    return child && typeof child === "object" && !Array.isArray(child) ? child : null;
  }
  function fieldDefinitionLabel(definition) {
    if (!definition || typeof definition !== "object") return "";
    return String(definition.label || definition.name || "").trim();
  }
  function fieldLabelFromRow(row, info) {
    const preferredPayload = row.type === "removed" ? row.left : row.right;
    const fallbackPayload = row.type === "removed" ? row.right : row.left;
    for (const payload of [preferredPayload, fallbackPayload]) {
      const label = fieldDefinitionLabel(payload);
      if (label) return label;
    }
    if (String(info.leafKey || "") === "label" || String(info.leafKey || "") === "name") {
      for (const value of [preferredPayload, fallbackPayload]) {
        if (typeof value === "string" && value.trim()) return value.trim();
      }
    }
    const match = String(row.label || "").match(/(?:フィールド|項目)[「\"]([^」\"]+)[」\"]/);
    return match ? match[1].trim() : "";
  }
  function fieldDisplayIdentity(row, info, ctx) {
    const sourceDef = fieldDefinitionAt(ctx.sourceBundle, info);
    const targetDef = fieldDefinitionAt(ctx.targetBundle, info);
    const preferredDef = row.type === "removed" ? sourceDef : targetDef;
    const fallbackDef = row.type === "removed" ? targetDef : sourceDef;
    const activeLabel = fieldDefinitionLabel(preferredDef) || fieldDefinitionLabel(fallbackDef) || fieldLabelFromRow(row, info) || info.activeCode;
    const preferredPayload = row.type === "removed" ? row.left : row.right;
    const fallbackPayload = row.type === "removed" ? row.right : row.left;
    const payloadType = (payload) => payload && typeof payload === "object" && !Array.isArray(payload) ? String(payload.type || "") : "";
    const typeCode = String(preferredDef?.type || fallbackDef?.type || payloadType(preferredPayload) || payloadType(fallbackPayload) || "");
    const fieldType = FIELD_TYPE_LABELS[typeCode] || typeCode || "不明";
    if (!info.isSubField) {
      return {
        fieldKey: String(info.rootCode),
        fieldCode: String(info.rootCode),
        fieldName: activeLabel,
        fieldType
      };
    }
    const sourceRoot = fieldSettingsProperties(ctx.sourceBundle)[info.rootCode];
    const targetRoot = fieldSettingsProperties(ctx.targetBundle)[info.rootCode];
    const preferredRoot = row.type === "removed" ? sourceRoot : targetRoot;
    const fallbackRoot = row.type === "removed" ? targetRoot : sourceRoot;
    const rootLabel = fieldDefinitionLabel(preferredRoot) || fieldDefinitionLabel(fallbackRoot) || String(info.rootCode);
    return {
      fieldKey: `${info.rootCode}${info.subFieldCode}`,
      fieldCode: `${info.rootCode} > ${info.subFieldCode}`,
      fieldName: `${rootLabel} > ${activeLabel}`,
      fieldType
    };
  }
  function fieldSettingTokenLabel(token) {
    if (typeof token === "number") return `${token + 1}件目`;
    return FIELD_SETTING_LABELS[token] || token;
  }
  function fieldSettingIdentity(info) {
    const tokens = Array.isArray(info.tailTokens) ? info.tailTokens : [];
    if (!tokens.length) return { settingKey: "(field)", settingLabel: "フィールド全体" };
    const settingKey = tokens.map((token) => String(token)).join(".");
    if (tokens[0] === "options") {
      const option = tokens.length > 1 ? String(tokens[1]) : "";
      const suffix = tokens.length > 2 ? fieldSettingTokenLabel(tokens[2]) : "";
      return {
        settingKey,
        settingLabel: option ? `選択肢「${option}」${suffix ? ` / ${suffix}` : ""}` : "選択肢と並び順"
      };
    }
    if (tokens[0] === "lookup" || tokens[0] === "referenceTable") {
      return {
        settingKey,
        settingLabel: tokens.map(fieldSettingTokenLabel).join(" / ")
      };
    }
    return {
      settingKey,
      settingLabel: tokens.map(fieldSettingTokenLabel).join(" / ")
    };
  }
  function fieldSummaryText(added, removed, changed, settingLabels) {
    const counts = [
      added ? `追加 ${added}件` : "",
      removed ? `削除 ${removed}件` : "",
      changed ? `変更 ${changed}件` : ""
    ].filter(Boolean).join(" / ");
    const visibleSettings = settingLabels.slice(0, 6);
    const more = settingLabels.length > visibleSettings.length ? `、ほか${settingLabels.length - visibleSettings.length}項目` : "";
    return `${counts || "差分なし"}。変更設定: ${visibleSettings.join("、") || "なし"}${more}`;
  }
  function buildDiffXlsxFieldModel(ctx) {
    const details = [];
    for (const [rowIndex, row] of (ctx.rows || []).entries()) {
      if (!row || row._displayOnly || row.type === "same") continue;
      const info = extractFieldPathInfo(String(row.path || ""));
      if (!info) continue;
      const identity = fieldDisplayIdentity(row, info, ctx);
      const setting = fieldSettingIdentity(info);
      details.push({
        rowIndex,
        ...identity,
        ...setting,
        row
      });
    }
    details.sort((a, b) => a.fieldCode.localeCompare(b.fieldCode, "ja") || a.settingKey.localeCompare(b.settingKey, "ja") || String(a.row.type || "").localeCompare(String(b.row.type || ""), "ja") || String(a.row.path || "").localeCompare(String(b.row.path || ""), "ja"));
    const byField = /* @__PURE__ */ new Map();
    for (const detail of details) {
      let summary = byField.get(detail.fieldKey);
      if (!summary) {
        summary = {
          fieldKey: detail.fieldKey,
          fieldCode: detail.fieldCode,
          fieldName: detail.fieldName,
          fieldType: detail.fieldType,
          diffCount: 0,
          added: 0,
          removed: 0,
          changed: 0,
          settingLabels: [],
          summary: ""
        };
        byField.set(detail.fieldKey, summary);
      }
      summary.diffCount += 1;
      if (detail.row.type === "added") summary.added += 1;
      else if (detail.row.type === "removed") summary.removed += 1;
      else summary.changed += 1;
      if (!summary.settingLabels.includes(detail.settingLabel)) summary.settingLabels.push(detail.settingLabel);
      if (detail.fieldName && detail.fieldName !== detail.fieldCode) summary.fieldName = detail.fieldName;
      if (detail.fieldType && detail.fieldType !== "不明") summary.fieldType = detail.fieldType;
    }
    const summaries = [...byField.values()];
    for (const summary of summaries) {
      summary.settingLabels.sort((a, b) => a.localeCompare(b, "ja"));
      summary.summary = fieldSummaryText(summary.added, summary.removed, summary.changed, summary.settingLabels);
    }
    summaries.sort((a, b) => a.fieldCode.localeCompare(b.fieldCode, "ja"));
    return { details, summaries };
  }
  function appLabel(bundle) {
    if (!bundle) return "";
    const name = extractAppNameFromBundle(bundle) || "";
    const id = bundle.appId != null ? String(bundle.appId) : "";
    if (name && id) return `${name} (App ${id})`;
    return name || (id ? `App ${id}` : "");
  }
  function scopeLabel(scopes) {
    const labels = (scopes || []).map((key) => sectionLabelOf(key)).filter(Boolean);
    return labels.length ? labels.join("、") : "未記録";
  }
  function humanDateTime(value) {
    if (value == null || value === "") return "未記録";
    const source = typeof value === "string" && /^\d{11,}$/.test(value.trim()) ? Number(value) : value;
    const date = typeof source === "number" ? new Date(source) : new Date(String(source));
    if (!Number.isFinite(date.getTime())) return String(value);
    return `${new Intl.DateTimeFormat("ja-JP", {
      timeZone: "Asia/Tokyo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23"
    }).format(date)} JST`;
  }
  function xlsxContentLabel(rows) {
    const hasActual = rows.some((row) => !row._displayOnly && row.type !== "same");
    const hasSame = rows.some((row) => !row._displayOnly && row.type === "same");
    const hasReference = rows.some((row) => !!row._displayOnly);
    const parts = [
      hasActual ? "差分行" : "",
      hasSame ? "同一証跡行" : "",
      hasReference ? "参考表示行" : ""
    ].filter(Boolean);
    const content = parts.length === 0 ? "差分行なし" : parts.length === 1 ? `${parts[0]}のみ` : parts.length === 2 ? `${parts[0]}と${parts[1]}` : parts.join("・");
    return `収録した${content}（全設定スナップショットなし）`;
  }
  function filterDescriptionLabel(ctx) {
    if (String(ctx.filterDescription || "").trim()) return String(ctx.filterDescription).trim();
    return ctx.exportMode === "filtered" ? "画面で表示中の結果（詳細条件は未記録）" : "フィルターなし（比較結果の全件）";
  }
  function fieldSettingKind(row) {
    const fieldInfo = extractFieldPathInfo(String(row.path || ""));
    if (!fieldInfo) return null;
    return fieldSettingIdentity(fieldInfo).settingKey === "(field)" ? "field" : "setting";
  }
  function rowTypeLabel(row) {
    if (row._displayOnly) return "参考";
    if (row.moved || row.type === "moved") return "移動";
    const fieldKind = fieldSettingKind(row);
    if (fieldKind === "setting" && row.type === "added") return "設定追加";
    if (fieldKind === "setting" && row.type === "removed") return "設定削除";
    if (fieldKind === "field" && row.type === "added") return "フィールド追加";
    if (fieldKind === "field" && row.type === "removed") return "フィールド削除";
    if (row.type === "added") return "追加";
    if (row.type === "removed") return "削除";
    if (row.type === "changed") return "変更";
    if (row.type === "same") return "同一";
    return String(row.type || "-");
  }
  function rowExistenceLabel(row) {
    if (row._displayOnly) return "—";
    if (row.type === "added") return "比較先のみ";
    if (row.type === "removed") return "比較元のみ";
    return "両方";
  }
  function layoutEntityCaption(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return "";
    const definition = value;
    const label = String(definition.label || definition.name || "").trim();
    const code = String(definition.code || "").trim();
    if (label && code) return `「${label}」（${code}）`;
    if (label) return `「${label}」`;
    return code ? `（${code}）` : "";
  }
  function layoutRowItemLabel(row, sourceBundle, targetBundle) {
    const path = String(row.path || "");
    const match = path.match(/^layoutSettings\.layout\[(\d+)\](?:\.(.+))?$/);
    if (!match) return "";
    const rowIndex = Number(match[1]);
    const preferredBundle = row.type === "removed" ? sourceBundle : targetBundle;
    const fallbackBundle = row.type === "removed" ? targetBundle : sourceBundle;
    const layoutAt = (bundle) => bundle?.sections?.layoutSettings?.layout?.[rowIndex];
    let entity = layoutAt(preferredBundle) || layoutAt(fallbackBundle) || null;
    const rowCaption = layoutEntityCaption(entity);
    const parts = [`レイアウト行 #${rowIndex + 1}${rowCaption ? ` ${rowCaption}` : ""}`];
    for (const fieldMatch of path.matchAll(/\.fields\[(\d+)\]/g)) {
      const fieldIndex = Number(fieldMatch[1]);
      entity = entity && typeof entity === "object" && !Array.isArray(entity) ? entity.fields?.[fieldIndex] : null;
      const fieldCaption = layoutEntityCaption(entity);
      parts.push(`フィールド #${fieldIndex + 1}${fieldCaption ? ` ${fieldCaption}` : ""}`);
    }
    const leaf = path.match(/(?:^|\.)([^.[\]]+)$/)?.[1] || "";
    const propLabels = {
      type: "種別",
      code: "フィールドコード",
      fields: "フィールド",
      elementId: "要素ID",
      label: "ラベル",
      value: "初期値",
      size: "サイズ",
      width: "横幅",
      height: "高さ",
      innerHeight: "内側の高さ"
    };
    if (leaf && leaf !== "layout" && leaf !== "fields") parts.push(propLabels[leaf] || leaf);
    return parts.join(" / ");
  }
  function rowItemLabel(row, sourceBundle, targetBundle) {
    const fieldInfo = extractFieldPathInfo(String(row.path || ""));
    if (fieldInfo) {
      const identity = fieldDisplayIdentity(row, fieldInfo, { rows: [], sourceBundle, targetBundle });
      const setting = fieldSettingIdentity(fieldInfo);
      const field = identity.fieldName && identity.fieldName !== identity.fieldCode ? `${identity.fieldName}（${identity.fieldCode}）` : identity.fieldCode;
      return `${field} / ${setting.settingLabel}`;
    }
    const layoutLabel = layoutRowItemLabel(row, sourceBundle, targetBundle);
    if (layoutLabel) return layoutLabel;
    try {
      const decoded = decodeRow(row);
      if (decoded) {
        const where = decoded.whereChips.map((chip) => chip.label).filter(Boolean).join(" / ");
        const readable = [where, decoded.propLabel].filter(Boolean).join(" / ") || decoded.oneLineSummary;
        if (readable) return readable;
      }
    } catch {
    }
    const explicitLabel = String(row.label || "").trim();
    const technicalPath = String(row.path || "").trim();
    if (explicitLabel && explicitLabel !== technicalPath) return explicitLabel;
    return "項目名を判別できません（技術明細を確認）";
  }
  function rowNote(row) {
    const reasonSummary = row.sectionKey === "layoutSettings" ? String(row.reasonSummary || "").replace(/\binnerheight\b/gi, "入力欄の高さ") : String(row.reasonSummary || "");
    const notes = [
      reasonSummary,
      row._displayOnly ? "表示用の補助情報（差分件数には含めません）" : "",
      row._nonActionable ? "確認専用（自動反映対象外）" : "",
      row.notationOnly ? "表記ゆれのみ" : "",
      row.emptyOnly ? "空値の違いのみ" : ""
    ].filter(Boolean);
    return [...new Set(notes)].join(" / ");
  }
  var XLSX_DIFF_VALUE_PREVIEW_LIMIT = 4e3;
  function shortStableHash(text2) {
    let hash = 2166136261;
    for (let i = 0; i < text2.length; i += 1) {
      hash ^= text2.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(16).toUpperCase().padStart(8, "0");
  }
  function xlsxDiffValuePreview(text2, originalUtf16Length = text2.length) {
    if (text2.length <= XLSX_DIFF_VALUE_PREVIEW_LIMIT) return text2;
    const hash = shortStableHash(text2);
    const prefix = `[一部表示: 元データ ${originalUtf16Length}文字（UTF-16） / 識別:${hash}]
`;
    const suffix = `
…（Excel表示用に省略・元UTF-16長 ${originalUtf16Length}・識別:${hash}）`;
    let keep = XLSX_DIFF_VALUE_PREVIEW_LIMIT - prefix.length - suffix.length;
    if (keep > 0 && /[\uD800-\uDBFF]/.test(text2.charAt(keep - 1))) keep -= 1;
    return prefix + text2.slice(0, Math.max(0, keep)) + suffix;
  }
  function rowValue(row, side) {
    if (isSensitiveSameDiffRow(row)) return SENSITIVE_SAME_VALUE_REDACTION;
    if (side === "source" && (row.left === void 0 || row.type === "added")) return "";
    if (side === "target" && (row.right === void 0 || row.type === "removed")) return "";
    const rawValue = side === "source" ? row.left : row.right;
    const text2 = stringifyRowValueForDiff(rawValue, row.path);
    const originalUtf16Length = typeof rawValue === "string" ? rawValue.length : text2.length;
    return xlsxDiffValuePreview(text2, originalUtf16Length);
  }
  function conciseFieldDefinition(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    const definition = value;
    const type = String(definition.type || "").trim();
    const label = String(definition.label || definition.name || "").trim();
    const code = String(definition.code || "").trim();
    if (!type && !label && !code) return null;
    const parts = [
      type ? `種類: ${FIELD_TYPE_LABELS[type] || type}` : "",
      label ? `表示名: ${label}` : "",
      code ? `コード: ${code}` : "",
      typeof definition.required === "boolean" ? `必須: ${definition.required ? "はい" : "いいえ"}` : "",
      typeof definition.unique === "boolean" ? `重複禁止: ${definition.unique ? "はい" : "いいえ"}` : "",
      definition.options && typeof definition.options === "object" ? `選択肢: ${Object.keys(definition.options).length}件` : "",
      definition.fields && typeof definition.fields === "object" ? `テーブル内フィールド: ${Object.keys(definition.fields).length}件` : "",
      definition.lookup && typeof definition.lookup === "object" ? "ルックアップ: あり" : "",
      definition.referenceTable && typeof definition.referenceTable === "object" ? "関連レコード設定: あり" : "",
      String(definition.expression || "").trim() ? "計算式: あり" : ""
    ].filter(Boolean);
    return parts.join("\n");
  }
  function fieldValueOnlyExistsLabel(_side, _sourceBundle, _targetBundle) {
    return "（存在しません）";
  }
  function humanizeFieldSettingValue(value, settingKey) {
    const leafKey = settingKey.split(".").filter(Boolean).at(-1) || "";
    if (value === void 0) return "（未設定）";
    if (value === null) return "（値なし）";
    if (typeof value === "boolean") {
      const labels = {
        required: ["任意", "必須"],
        unique: ["重複を許可", "重複を禁止"],
        noLabel: ["フィールド名を表示する", "フィールド名を表示しない"],
        hideExpression: ["計算式を表示する", "計算式を表示しない"],
        defaultNowValue: ["現在日時を使わない", "現在日時を使う"]
      };
      return labels[leafKey]?.[value ? 1 : 0] || (value ? "はい" : "いいえ");
    }
    if (typeof value === "string") {
      if (value === "") return "（空欄）";
      if (leafKey === "type") return FIELD_TYPE_LABELS[value] || value;
      return xlsxDiffValuePreview(value, value.length);
    }
    if (typeof value === "number" || typeof value === "bigint") return String(value);
    if (Array.isArray(value)) {
      if (!value.length) return "（空の一覧）";
      if (value.every((item) => item == null || ["string", "number", "boolean"].includes(typeof item))) {
        return value.map((item) => humanizeFieldSettingValue(item, leafKey)).join("、");
      }
      return `${value.length}件の設定（詳細は「フィールド技術明細」）`;
    }
    if (typeof value === "object") {
      const keys = Object.keys(value);
      return `${keys.length}項目の設定（詳細は「フィールド技術明細」）`;
    }
    return String(value);
  }
  function humanizeListScalar(value) {
    if (value === void 0) return "（未設定）";
    if (value === null) return "（値なし）";
    if (typeof value === "boolean") return value ? "はい" : "いいえ";
    if (typeof value === "string") return value === "" ? "（空欄）" : value;
    return String(value);
  }
  function humanizeDecodedListText(value) {
    return value.replace(/(種別:\s*)([A-Z][A-Z0-9_]*)\b/g, (_match, prefix, type) => `${prefix}${FIELD_TYPE_LABELS[type] || type}`);
  }
  function technicalSheetNameForRow(row) {
    const key = String(row.sectionKey || row.section || "");
    return key === "fieldSettings" ? "フィールド技術明細" : sectionLabelOf(key);
  }
  function decodedListValue(row, side) {
    try {
      const decoded = decodeRow(row);
      if (!decoded) return "";
      const candidate = humanizeDecodedListText(
        String(side === "source" ? decoded.beforeText : decoded.afterText).trim()
      );
      if (!candidate || candidate === "-" || candidate === "（なし）" || /[{}\[\]]/.test(candidate)) return "";
      return candidate;
    } catch {
      return "";
    }
  }
  function summarizeListComplexValue(row, side, value) {
    let summary = decodedListValue(row, side);
    if (!summary && Array.isArray(value)) {
      if (!value.length) summary = "空の一覧";
      else if (value.every((item) => item == null || typeof item !== "object")) {
        const preview = value.slice(0, 5).map(humanizeListScalar).join("、");
        summary = `${value.length}件: ${preview}${value.length > 5 ? `、ほか${value.length - 5}件` : ""}`;
      } else {
        summary = `${value.length}件の設定`;
      }
    }
    if (!summary && !Array.isArray(value)) {
      const labels = {
        name: "名称",
        label: "名称",
        title: "名称",
        code: "コード",
        id: "ID",
        type: "種別",
        enabled: "有効",
        enable: "有効"
      };
      const facts = Object.entries(value).filter(([key, item]) => labels[key] && (item == null || typeof item !== "object")).slice(0, 4).map(([key, item]) => {
        const displayValue = key === "type" && typeof item === "string" ? FIELD_TYPE_LABELS[item] || item : humanizeListScalar(item);
        return `${labels[key]}: ${displayValue}`;
      });
      summary = facts.length ? facts.join(" / ") : `${Object.keys(value).length}項目の設定`;
    }
    const text2 = `${summary}
詳細は「${technicalSheetNameForRow(row)}」シートで確認`;
    return xlsxDiffValuePreview(text2, text2.length);
  }
  function humanizeListRowValue(row, side, sourceBundle, targetBundle) {
    if (isSensitiveSameDiffRow(row)) return SENSITIVE_SAME_VALUE_REDACTION;
    const missing = side === "source" ? row.left === void 0 || row.type === "added" : row.right === void 0 || row.type === "removed";
    if (missing) return fieldValueOnlyExistsLabel(side, sourceBundle, targetBundle);
    const value = side === "source" ? row.left : row.right;
    if (value && typeof value === "object") {
      return summarizeListComplexValue(row, side, value);
    }
    if (typeof value === "string") return xlsxDiffValuePreview(humanizeListScalar(value), value.length);
    return humanizeListScalar(value);
  }
  function fieldSettingHumanValue(detail, side, sourceBundle, targetBundle) {
    const row = detail.row;
    const missing = side === "source" ? row.left === void 0 || row.type === "added" : row.right === void 0 || row.type === "removed";
    if (missing) {
      if (detail.settingKey !== "(field)") {
        return "（未設定）";
      }
      return fieldValueOnlyExistsLabel(side, sourceBundle, targetBundle);
    }
    const value = side === "source" ? row.left : row.right;
    if (detail.settingKey === "(field)") {
      const summary = conciseFieldDefinition(value);
      return summary || "要約できない形式です。差分IDから「差分一覧」、または「フィールド技術明細」を確認してください。";
    }
    return humanizeFieldSettingValue(value, detail.settingKey);
  }
  function fieldSettingReviewGuidance(detail) {
    if (detail.settingKey === "(field)" && detail.row.type === "added") {
      return "入力画面・権限・一覧・外部連携での利用有無を確認してください。";
    }
    if (detail.settingKey === "(field)" && detail.row.type === "removed") {
      return "保存済みデータ・一覧・外部連携からの参照有無を確認してください。";
    }
    if (detail.settingKey === "required" || detail.settingKey.endsWith(".required")) {
      return detail.row.right === true ? "既存データの未入力有無と、入力画面・外部連携の入力条件を確認してください。" : "未入力を許可する設定への変更を確認してください。";
    }
    if (detail.settingKey === "options" || detail.settingKey.startsWith("options.")) {
      return "既存値・絞り込み条件・連携で使用している選択肢を確認してください。";
    }
    if (["type", "code"].includes(detail.settingKey) || /\.(?:type|code)$/.test(detail.settingKey)) {
      return "保存済みデータとAPI・外部連携で使用している型・コードを確認してください。";
    }
    if (/^(?:lookup|referenceTable)(?:\.|$)/.test(detail.settingKey)) {
      return "参照先アプリ、キー、コピー項目を確認してください。";
    }
    return "変更前後の設定値と利用箇所を確認してください。";
  }
  function fieldDetailReviewNote(detail) {
    const notes = [rowNote(detail.row), fieldSettingReviewGuidance(detail)].map((note) => note.trim()).filter(Boolean);
    return notes.filter((note, index) => !notes.some((other, otherIndex) => otherIndex < index && other.includes(note))).join(" / ");
  }
  function visualTextWidth(value) {
    let width = 0;
    for (const char of value) {
      if (char === "	") width += 4;
      else width += char.codePointAt(0) <= 255 ? 1 : 2;
    }
    return width;
  }
  function estimatedWrappedLines(value, columnWidth) {
    const capacity = Math.max(8, Math.floor(columnWidth - 2));
    return String(value || "").split(/\r?\n/).reduce((total, line) => total + Math.max(1, Math.ceil(visualTextWidth(line) / capacity)), 0);
  }
  function readableDiffRowHeight(cells, maxHeight = 110) {
    const maxLines = cells.reduce((max, cell) => Math.max(max, estimatedWrappedLines(cell.value, cell.width)), 1);
    return Math.min(maxHeight, 26 + Math.max(0, maxLines - 1) * 14);
  }
  function readableCustomerRowHeight(cells, maxHeight) {
    const maxLines = cells.reduce((max, cell) => Math.max(max, estimatedWrappedLines(cell.value, cell.width)), 1);
    return Math.min(maxHeight, 28 + Math.max(0, maxLines - 1) * 17);
  }
  function summarizeRows2(rows) {
    const counts = {
      actual: 0,
      added: 0,
      removed: 0,
      changed: 0,
      moved: 0,
      same: 0,
      reference: 0
    };
    for (const row of rows) {
      if (row._displayOnly) {
        counts.reference += 1;
        continue;
      }
      if (row.type === "same") {
        counts.same += 1;
        continue;
      }
      counts.actual += 1;
      if (row.type === "added") counts.added += 1;
      else if (row.type === "removed") counts.removed += 1;
      else counts.changed += 1;
      if (row.moved || row.type === "moved") counts.moved += 1;
    }
    return {
      ...counts,
      contentChanged: Math.max(0, counts.changed - counts.moved)
    };
  }
  function issueMessage(issue) {
    if (issue.message) return String(issue.message);
    const details = [issue.sourceError ? `比較元: ${issue.sourceError}` : "", issue.targetError ? `比較先: ${issue.targetError}` : ""].filter(Boolean);
    return details.join(" / ") || "設定を取得できませんでした";
  }
  function partialFileDetails(issue) {
    return (issue.files || []).map((file) => {
      const identity = file.fileName || file.fileKey || "(対象不明)";
      const reason = file.reason || file.detail || "";
      return reason ? `${identity}: ${reason}` : identity;
    }).join("\n");
  }
  function bundleEnvironmentLabel(bundle) {
    if (!bundle) return "未記録";
    return `${bundle?.guestId ? `ゲスト ${bundle.guestId}` : "通常スペース"} / ${bundle?.preview ? "プレビュー" : "運用"}設定`;
  }
  function completenessLabel(fetchIssues, partialIssues, truncation) {
    const reasons = [];
    if (fetchIssues.length) reasons.push(`取得失敗 ${fetchIssues.length}件`);
    if (partialIssues.length) reasons.push(`一部未検証 ${partialIssues.length}件`);
    if (truncation && hasIncompleteActualDiffTruncation(truncation)) {
      const sections = truncation.sections || [];
      const partial = sections.filter((section) => truncationScanStatusOf(section) === "partial").length;
      const unscanned = sections.filter((section) => truncationScanStatusOf(section) === "unscanned").length;
      if (partial) reasons.push(`部分走査 ${partial}セクション`);
      if (unscanned) reasons.push(`未走査 ${unscanned}セクション`);
      if (!partial && !unscanned) reasons.push("件数上限による省略あり");
    }
    if (reasons.length) return `不完全（${reasons.join(" / ")}）`;
    const droppedSame = Number(truncation?.droppedSame || 0);
    return droppedSame > 0 ? `完全（差分走査済み / 同一証跡 ${droppedSame}件を省略）` : "完全（選択範囲を走査済み）";
  }
  function sectionCompletenessLabel(key, ctx) {
    if ((ctx.fetchIssues || []).some((issue) => (issue.sectionKey || issue.section) === key)) return "取得失敗あり";
    const status = (ctx.truncation?.sections || []).find((section) => (section.sectionKey || section.section) === key);
    if (status) {
      const scanStatus = truncationScanStatusOf(status);
      if (scanStatus === "unscanned") return "未走査";
      if (scanStatus === "partial") return "部分走査";
      if (Number(status.omittedDiffCount ?? status.droppedDiff ?? 0) > 0) return "走査済み・一部省略";
    }
    if ((ctx.partialIssues || []).some((issue) => (issue.sectionKey || issue.section) === key)) return "一部未検証";
    return "走査済み";
  }
  function fieldComparisonSummary(ctx, fieldCount, settingDiffCount, unstructuredFieldDiffCount) {
    const fieldSelected = (ctx.scopes || []).includes("fieldSettings") || (ctx.rows || []).some((row) => (row.sectionKey || row.section) === "fieldSettings");
    if (!fieldSelected) return "比較対象外";
    const fieldTruncation = (ctx.truncation?.sections || []).find((section) => (section.sectionKey || section.section) === "fieldSettings");
    const fieldScanStatus = fieldTruncation ? truncationScanStatusOf(fieldTruncation) : null;
    const fieldOmittedDiff = Number(fieldTruncation?.omittedDiffCount ?? fieldTruncation?.droppedDiff ?? 0);
    const legacyUnknownTruncation = hasIncompleteActualDiffTruncation(ctx.truncation) && !(ctx.truncation?.sections || []).length;
    const fieldIncomplete = (ctx.fetchIssues || []).some((issue) => (issue.sectionKey || issue.section) === "fieldSettings") || (ctx.partialIssues || []).some((issue) => (issue.sectionKey || issue.section) === "fieldSettings") || legacyUnknownTruncation || fieldScanStatus === "partial" || fieldScanStatus === "unscanned";
    const known = [
      fieldCount ? `${fieldCount}フィールド / ${settingDiffCount}件の差分明細` : "",
      unstructuredFieldDiffCount ? `構造化できない差分 ${unstructuredFieldDiffCount}件` : ""
    ].filter(Boolean).join("、");
    if (fieldIncomplete) return `未判定${known ? `（確認できた範囲: ${known}）` : "（取得・走査が不完全）"}`;
    if (fieldScanStatus === "complete" && fieldOmittedDiff > 0) {
      return `${known || "確認できた差分 0件"}（走査済み・一部未収録 ${fieldOmittedDiff}件）`;
    }
    if (unstructuredFieldDiffCount) return `${known}。技術明細を確認してください`;
    if (fieldCount) return `${fieldCount}フィールド / ${settingDiffCount}件の差分明細`;
    return ctx.exportMode === "filtered" ? "0件（この出力範囲内）" : "0件（走査済み）";
  }
  function summarySectionKeys(ctx, grouped) {
    const keys = /* @__PURE__ */ new Set();
    const add = (value) => {
      const key = String(value || "").trim();
      if (key) keys.add(key);
    };
    (ctx.scopes || []).forEach(add);
    grouped.forEach((_rows, key) => add(key));
    (ctx.fetchIssues || []).forEach((issue) => add(issue.sectionKey || issue.section));
    (ctx.partialIssues || []).forEach((issue) => add(issue.sectionKey || issue.section));
    (ctx.truncation?.sections || []).forEach((section) => add(section.sectionKey || section.section));
    const known = SECTION_DEFS.map((section) => section.key).filter((key) => keys.has(key));
    const unknown = [...keys].filter((key) => !SECTION_ORDER_BY_KEY.has(key));
    return [...known, ...unknown];
  }
  function sectionCountBreakdown(rows) {
    const counts = summarizeRows2(rows);
    return [
      `追加 ${counts.added}`,
      `削除 ${counts.removed}`,
      `内容変更 ${counts.contentChanged}`,
      `移動 ${counts.moved}`,
      `同一 ${counts.same}`,
      `参考 ${counts.reference}`
    ].join(" / ");
  }
  function sectionSheetName(key) {
    return key === "fieldSettings" ? "フィールド技術明細" : sectionLabelOf(key);
  }
  function buildSheetGuides(ctx, grouped, fieldCount) {
    const hasIssues = !!((ctx.fetchIssues || []).length || (ctx.partialIssues || []).length || hasIncompleteActualDiffTruncation(ctx.truncation));
    const guides = [{
      name: "概要",
      purpose: "比較結果の判定、件数、比較条件、取得状態を確認できます。",
      useWhen: hasIssues ? "最初に確認します。不完全な範囲は「取得・未検証」も確認します。" : fieldCount ? "最初に確認し、フィールドは「フィールド差分要約」、収録された差分は「差分一覧」へ進みます。" : "最初に確認し、収録された差分は「差分一覧」へ進みます。",
      targetCell: "A1"
    }];
    if (hasIssues) {
      guides.push({
        name: "取得・未検証",
        purpose: "取得失敗、一部未検証、件数上限の対象と理由を確認できます。",
        useWhen: "概要の取得状態が「不完全」または結果が「比較不完全」のときに確認します。",
        targetCell: "A3"
      });
    }
    if (fieldCount) {
      guides.push(
        {
          name: "フィールド差分要約",
          purpose: "差分があるフィールドと主な変更を、フィールド単位で確認できます。",
          useWhen: "確認するフィールドを絞り込み、詳細またはレビュー入力へ進むときに使います。",
          targetCell: "C4"
        },
        {
          name: "フィールド差分詳細",
          purpose: "フィールド設定ごとの変更前後と確認事項を確認できます。",
          useWhen: "設定単位の内容を確認し、差分IDからレビュー入力へ進むときに使います。",
          targetCell: "B4"
        }
      );
    }
    guides.push({
      name: "差分一覧",
      purpose: "このブックに収録された差分と変更前後の値を一覧で確認できます。",
      useWhen: "黄色の列に確認状況、対応判断、担当者、コメントを記録するときに使います。",
      targetCell: (ctx.rows || []).length ? "I4" : "A3"
    });
    for (const key of grouped.keys()) {
      const name = sectionSheetName(key);
      const isFieldTechnical = key === "fieldSettings";
      guides.push({
        name,
        purpose: isFieldTechnical ? "フィールド設定の技術パスと原データを確認できます。" : `${sectionLabelOf(key)}の技術パスと原データを確認できます。`,
        useWhen: isFieldTechnical ? "人向けの要約だけでは判断できない場合に、技術的な根拠を確認します。" : "差分一覧だけでは判断できない場合に、技術的な根拠を確認します。",
        targetCell: "A4"
      });
    }
    return guides;
  }
  function sheetGuideBand(purpose, next) {
    return `このシートで分かること：${purpose}
使い方・次に見る場所：${next}`;
  }
  function buildSummarySheet(ctx, grouped, fieldCount, settingDiffCount, unstructuredFieldDiffCount) {
    const rows = ctx.rows || [];
    const fetchIssues = ctx.fetchIssues || [];
    const partialIssues = ctx.partialIssues || [];
    const counts = summarizeRows2(rows);
    const truncation = ctx.truncation || null;
    const actualDiffTruncation = hasIncompleteActualDiffTruncation(truncation) ? truncation : null;
    const incomplete = fetchIssues.length > 0 || partialIssues.length > 0 || !!actualDiffTruncation;
    const verdict = incomplete ? "比較不完全（差分なしとは判断できません）" : counts.actual > 0 ? "差分あり" : "差分なし";
    const completeness = completenessLabel(fetchIssues, partialIssues, truncation);
    const comparisonBanner = `${appLabel(ctx.sourceBundle) || "比較元"}  →  ${appLabel(ctx.targetBundle) || "比較先"}`;
    const sensitiveSections = [...new Set(rows.filter((row) => !row._displayOnly && row.type !== "same" && SENSITIVE_DIFF_SECTION_KEYS.has(String(row.sectionKey || ""))).map((row) => sectionLabelOf(String(row.sectionKey || ""))))];
    const redactedSensitiveSections = [...new Set(rows.filter((row) => isSensitiveSameDiffRow(row)).map((row) => sectionLabelOf(String(row.sectionKey || ""))))];
    const fieldStatus = fieldComparisonSummary(ctx, fieldCount, settingDiffCount, unstructuredFieldDiffCount);
    const fieldStatusIncomplete = fieldStatus.startsWith("未判定") || fieldStatus.includes("一部未収録");
    const sheetGuides = buildSheetGuides(ctx, grouped, fieldCount);
    const fieldLinkTarget = fieldCount ? { sheet: "フィールド差分要約", cell: "C4", label: "フィールド差分を見る" } : unstructuredFieldDiffCount ? { sheet: "フィールド技術明細", cell: "A4", label: "技術明細を見る" } : null;
    const overviewNextPlaces = [
      "最初に確認します。",
      fieldCount ? "フィールドは「フィールド差分要約」へ進みます。" : "",
      rows.length ? "収録された差分とレビュー入力は「差分一覧」へ進みます。" : "差分一覧には見出しのみ出力されています。",
      incomplete ? "不完全な範囲は「取得・未検証」で確認します。" : ""
    ].filter(Boolean).join(" ");
    const overviewRow = {
      guideBand: 4,
      verdict: 5,
      total: 6,
      added: 7,
      removed: 8,
      contentChanged: 9,
      moved: 10,
      same: 11,
      comparisonTitle: 12,
      comparisonApps: 13,
      comparisonEnvironment: 14,
      normalization: 18,
      fieldStatus: 19,
      usage: 20
    };
    const sheetRows = [
      ["kintone 設定差分比較レポート", "", "", ""],
      [comparisonBanner, "", "", ""],
      ["生成日時", humanDateTime(ctx.generatedAt || Date.now()), "比較日時", humanDateTime(ctx.comparedAt)],
      ["比較元取得日時", humanDateTime(ctx.sourceBundle?.fetchedAt), "比較先取得日時", humanDateTime(ctx.targetBundle?.fetchedAt)],
      [sheetGuideBand(
        "この出力範囲の結果、取得状態、収録差分数、比較条件を確認できます。",
        overviewNextPlaces
      ), "", "", ""],
      ["この出力範囲の結果", verdict, "取得状態", completeness],
      ["収録差分数", counts.actual, "取得失敗", fetchIssues.length],
      ["追加（比較先のみ）", counts.added, "一部未検証", partialIssues.length],
      ["削除（比較元のみ）", counts.removed, "件数上限", actualDiffTruncation ? "差分の省略あり" : Number(truncation?.droppedSame || 0) > 0 ? `同一証跡 ${Number(truncation?.droppedSame || 0)}件を省略` : "省略なし"],
      ["内容変更（移動を除く）", counts.contentChanged, "", ""],
      ["移動", counts.moved, "", ""],
      ["同一", counts.same, "", ""],
      ["比較の向き・条件", "", "", ""],
      ["比較元", appLabel(ctx.sourceBundle) || "未記録", "比較先", appLabel(ctx.targetBundle) || "未記録"],
      ["環境", bundleEnvironmentLabel(ctx.sourceBundle), "環境", bundleEnvironmentLabel(ctx.targetBundle)],
      ["比較方向", "比較元 → 比較先", "出力範囲", ctx.exportLabel || (ctx.exportMode === "filtered" ? "表示中（フィルタ適用後）" : "全件")],
      ["比較対象", scopeLabel(ctx.scopes), "収録内容", xlsxContentLabel(rows)],
      ["フィルタ条件", filterDescriptionLabel(ctx), "無視キー", String(ctx.ignoreKeys || "").trim() || "なし"],
      ["正規化設定", normalizationLabel(ctx.normalizationPresetState), "自動判定", "重要度、業務への影響、対応要否は自動判定しません"],
      ["フィールド差分", fieldStatus, "", fieldLinkTarget?.label || ""],
      ["使い方", fieldCount ? "①「フィールド差分要約」で対象を確認　②「フィールド差分詳細」で変更前後を確認　③「差分一覧」で確認状況と対応判断を入力　※パスは技術明細シートにのみ掲載" : "①概要で結果と取得状態を確認　②「差分一覧」で変更前後を確認　③黄色い4列に確認状況・対応判断・担当者・コメントを入力　※パスは技術明細シートにのみ掲載", "", rows.length ? "③ レビュー入力へ" : ""],
      ["", "", "", ""]
    ];
    const guideTitleRow = sheetRows.length;
    sheetRows.push(["シート案内", "", "", ""]);
    const guideHeaderRow = sheetRows.length;
    sheetRows.push(["シート名", "目的", "利用場面", ""]);
    const guideStartRow = sheetRows.length;
    for (const guide of sheetGuides) {
      sheetRows.push([guide.name, guide.purpose, guide.useWhen, ""]);
    }
    const guideEndRow = sheetRows.length;
    sheetRows.push(["", "", "", ""]);
    const sectionTitleRow = sheetRows.length;
    sheetRows.push(["セクション別集計", "", "", ""]);
    const sectionHeaderRow = sheetRows.length;
    sheetRows.push(["セクション", "収録行数", "客観内訳", "走査・取得状態"]);
    for (const key of summarySectionKeys(ctx, grouped)) {
      const list = grouped.get(key) || [];
      sheetRows.push([
        sectionLabelOf(key),
        list.length,
        sectionCountBreakdown(list),
        sectionCompletenessLabel(key, ctx)
      ]);
    }
    const warningRows = [];
    const pushWarning = (label, message) => {
      warningRows.push(sheetRows.length);
      sheetRows.push([label, message, "", ""]);
    };
    if (actualDiffTruncation) {
      const truncationSections = actualDiffTruncation.sections || [];
      const partial = truncationSections.filter((section) => truncationScanStatusOf(section) === "partial");
      const unscanned = truncationSections.filter((section) => truncationScanStatusOf(section) === "unscanned");
      const rangeNotes = [
        partial.length ? `部分走査・総件数不明（表示件数は下限）: ${partial.map(truncationSectionName).join("・")}。` : "",
        unscanned.length ? `未走査・件数不明: ${unscanned.map(truncationSectionName).join("・")}。` : ""
      ].filter(Boolean).join(" ");
      pushWarning("⚠ 件数上限", `差分上限 ${actualDiffTruncation.diffLimit || "-"} 件に到達。未収録の差分があるため、このブックだけで反映判断をしないでください。${rangeNotes ? ` ${rangeNotes}` : ""}`);
    } else if (Number(truncation?.droppedSame || 0) > 0) {
      pushWarning("ℹ 同一証跡の省略", `同一証跡は上限 ${truncation?.sameLimit || "-"} 件まで収録し、${Number(truncation?.droppedSame || 0)} 件を省略しました。実差分の検出結果は完全です。`);
    }
    if (partialIssues.length) {
      pushWarning("⚠ 一部未検証", `${partialIssues.length} 件。JS/CSS等の本文を取得できず、代替情報で比較した項目があります。`);
    }
    if (fetchIssues.length) {
      pushWarning("⚠ 取得失敗", `${fetchIssues.length} 件。該当セクションは比較できていません。`);
    }
    if (sensitiveSections.length) {
      pushWarning("🔒 取扱注意", `${sensitiveSections.join("・")} の差分値が含まれます。共有先と保管場所を確認してください。`);
    }
    if (redactedSensitiveSections.length) {
      pushWarning("🔒 機密値省略", `${redactedSensitiveSections.join("・")} の同一行は、機密値を重複収録しないため値を省略しています。`);
    }
    const rowStyles = sheetRows.map(() => "normal");
    const rowHeights = [32, 24, 0, 0, 44];
    rowHeights[overviewRow.normalization] = readableDiffRowHeight([
      { value: sheetRows[overviewRow.normalization][1], width: 54 },
      { value: sheetRows[overviewRow.normalization][3], width: 54 }
    ], 72);
    for (let rowIndex = guideStartRow; rowIndex < guideEndRow; rowIndex += 1) rowHeights[rowIndex] = 40;
    for (const rowIndex of warningRows) {
      rowHeights[rowIndex] = readableDiffRowHeight([
        { value: sheetRows[rowIndex][0], width: 24 },
        { value: sheetRows[rowIndex][1], width: 120 }
      ], 132);
    }
    const cellStyles = sheetRows.map(() => []);
    cellStyles[0][0] = "title";
    cellStyles[1][0] = "sectionHeader";
    cellStyles[overviewRow.guideBand][0] = "info";
    cellStyles[overviewRow.verdict] = [
      "sectionHeader",
      incomplete ? "kpiDanger" : "kpiGood",
      "sectionHeader",
      incomplete ? "kpiDanger" : "kpiGood"
    ];
    for (const rowIndex of [
      overviewRow.total,
      overviewRow.added,
      overviewRow.removed,
      overviewRow.contentChanged,
      overviewRow.moved,
      overviewRow.same
    ]) {
      cellStyles[rowIndex] = ["info", "kpiGood"];
    }
    cellStyles[overviewRow.total][2] = "info";
    cellStyles[overviewRow.total][3] = fetchIssues.length > 0 ? "kpiDanger" : "kpiGood";
    cellStyles[overviewRow.added][2] = "info";
    cellStyles[overviewRow.added][3] = partialIssues.length > 0 ? "kpiDanger" : "kpiGood";
    cellStyles[overviewRow.removed][2] = "info";
    cellStyles[overviewRow.removed][3] = actualDiffTruncation ? "kpiDanger" : "kpiGood";
    cellStyles[overviewRow.comparisonApps][1] = "source";
    cellStyles[overviewRow.comparisonApps][3] = "target";
    cellStyles[overviewRow.comparisonEnvironment][1] = "source";
    cellStyles[overviewRow.comparisonEnvironment][3] = "target";
    cellStyles[overviewRow.comparisonTitle][0] = "sectionHeader";
    cellStyles[guideTitleRow][0] = "sectionHeader";
    cellStyles[guideHeaderRow] = ["sectionHeader", "sectionHeader", "sectionHeader", "sectionHeader"];
    for (let rowIndex = guideStartRow; rowIndex < guideEndRow; rowIndex += 1) {
      cellStyles[rowIndex][0] = "hyperlink";
    }
    cellStyles[sectionTitleRow][0] = "sectionHeader";
    cellStyles[sectionHeaderRow] = ["sectionHeader", "sectionHeader", "sectionHeader", "sectionHeader"];
    cellStyles[overviewRow.fieldStatus] = ["info", fieldStatusIncomplete ? "kpiDanger" : "kpiGood"];
    if (fieldLinkTarget) cellStyles[overviewRow.fieldStatus][3] = "hyperlink";
    if (rows.length) cellStyles[overviewRow.usage][3] = "hyperlink";
    for (const index of warningRows) cellStyles[index][0] = "warning";
    const merges = [
      "A1:D1",
      "A2:D2",
      `A${overviewRow.guideBand + 1}:D${overviewRow.guideBand + 1}`,
      `A${overviewRow.comparisonTitle + 1}:D${overviewRow.comparisonTitle + 1}`,
      `A${guideTitleRow + 1}:D${guideTitleRow + 1}`,
      `C${guideHeaderRow + 1}:D${guideHeaderRow + 1}`,
      `A${sectionTitleRow + 1}:D${sectionTitleRow + 1}`
    ];
    for (let rowIndex = guideStartRow; rowIndex < guideEndRow; rowIndex += 1) {
      merges.push(`C${rowIndex + 1}:D${rowIndex + 1}`);
    }
    for (const index of warningRows) merges.push(`B${index + 1}:D${index + 1}`);
    return {
      name: "概要",
      autoFilter: false,
      freezeHeader: false,
      colWidths: [24, 54, 22, 54],
      rows: sheetRows,
      rowStyles,
      cellStyles,
      rowHeights,
      merges,
      internalHyperlinks: [
        ...fieldLinkTarget ? [{
          ref: `D${overviewRow.fieldStatus + 1}`,
          targetSheet: fieldLinkTarget.sheet,
          targetCell: fieldLinkTarget.cell,
          tooltip: "差分があるフィールドの一覧へ移動"
        }] : [],
        ...rows.length ? [{
          ref: `D${overviewRow.usage + 1}`,
          targetSheet: "差分一覧",
          targetCell: "I4",
          tooltip: "確認状況・対応判断・担当者・コメントの入力欄へ移動"
        }] : [],
        ...sheetGuides.map((guide, index) => ({
          ref: `A${guideStartRow + index + 1}`,
          targetSheet: guide.name,
          targetCell: guide.targetCell,
          tooltip: `${guide.name}へ移動`
        }))
      ],
      showGridLines: false,
      print: {
        orientation: "portrait",
        fitToWidth: 1,
        fitToHeight: 0,
        repeatRows: { from: 1, to: 2 }
      }
    };
  }
  var REVIEW_PROGRESS_VALUES = ["未確認", "確認中", "確認済み", "対象外"];
  var ACTION_DECISION_VALUES = ["未判断", "要対応", "対応不要", "保留", "対象外"];
  function stableDifferenceId(row, seen) {
    const redactedIdentityValue = isSensitiveSameDiffRow(row) ? "SENSITIVE_SAME_VALUE_REDACTED" : null;
    const leftDigest = shortStableHash(redactedIdentityValue ?? stableStringify(row.left) ?? "undefined");
    const rightDigest = shortStableHash(redactedIdentityValue ?? stableStringify(row.right) ?? "undefined");
    const identity = [
      row.sectionKey || row.section || "",
      row.type || "",
      row.path || "",
      row.label || "",
      row.moved ? "moved" : "",
      leftDigest,
      rightDigest
    ].join("");
    const base = `D-${shortStableHash(identity)}`;
    const occurrence = (seen.get(base) || 0) + 1;
    seen.set(base, occurrence);
    return occurrence === 1 ? base : `${base}-${occurrence}`;
  }
  function buildDifferenceRefs(rows) {
    const refs = [];
    const seenIds = /* @__PURE__ */ new Map();
    rows.forEach((row, index) => refs.push({
      id: stableDifferenceId(row, seenIds),
      rowNumber: index + 4
    }));
    return refs;
  }
  function buildTechnicalRefs(rows) {
    const sectionCounts = /* @__PURE__ */ new Map();
    return rows.map((row) => {
      const key = sectionKeyOfRow(row);
      const indexInSection = sectionCounts.get(key) || 0;
      sectionCounts.set(key, indexInSection + 1);
      return {
        sheetName: sectionSheetName(key),
        rowNumber: indexInSection + 4
      };
    });
  }
  function directionalValueHeader(side, bundle) {
    const direction = side === "source" ? "比較元" : "比較先";
    const label = appLabel(bundle);
    return label ? `${direction}の値
${label}` : `${direction}の値`;
  }
  function buildListSheet(rows, name = "差分一覧", sourceBundle, targetBundle, differenceRefs, technicalRefs, fieldModel) {
    const headers = [
      "セクション",
      "項目",
      "変更種別",
      "存在状況",
      "差分ID",
      directionalValueHeader("source", sourceBundle),
      directionalValueHeader("target", targetBundle),
      "確認事項",
      "確認状況",
      "対応判断",
      "担当者",
      "コメント"
    ];
    const groupHeader = [
      "差分対象",
      "",
      "変更の事実",
      "",
      "",
      "比較元（変更前）",
      "比較先（変更後）",
      "確認事項",
      "レビュー入力（黄色）",
      "",
      "",
      ""
    ];
    const guide = sheetGuideBand(
      "このブックに収録された差分、変更前後の値、確認事項を一覧で確認できます。",
      "黄色の列に確認状況・対応判断・担当者・コメントを入力します。差分IDから技術明細へ移動できます。値先頭の「[一部表示]」は技術明細または元データを確認します。"
    );
    const out = [[guide, "", "", "", "", "", "", "", "", "", "", ""], groupHeader, headers];
    const rowStyles = ["normal", "normal", "normal"];
    const groupCellStyles = [];
    groupCellStyles[0] = "sectionHeader";
    groupCellStyles[2] = "info";
    groupCellStyles[5] = "sourceGroup";
    groupCellStyles[6] = "targetGroup";
    groupCellStyles[7] = "info";
    groupCellStyles[8] = "sectionHeader";
    const cellStyles = [["info"], groupCellStyles, []];
    cellStyles[2][5] = "headerDivider";
    const rowHeights = [44, 24, 42];
    const seenIds = /* @__PURE__ */ new Map();
    const fieldDetailByRowIndex = new Map((fieldModel?.details || []).map((detail) => [detail.rowIndex, detail]));
    for (const [rowIndex, row] of rows.entries()) {
      const fieldDetail = fieldDetailByRowIndex.get(rowIndex);
      const isFieldSettings = (row.sectionKey || row.section) === "fieldSettings";
      const existence = rowExistenceLabel(row);
      const item = rowItemLabel(row, sourceBundle, targetBundle);
      const sourceValue = fieldDetail ? fieldSettingHumanValue(fieldDetail, "source", sourceBundle, targetBundle) : isFieldSettings ? row.type === "added" ? fieldValueOnlyExistsLabel("source", sourceBundle, targetBundle) : humanizeFieldSettingValue(row.left, "") : humanizeListRowValue(row, "source", sourceBundle, targetBundle);
      const targetValue = fieldDetail ? fieldSettingHumanValue(fieldDetail, "target", sourceBundle, targetBundle) : isFieldSettings ? row.type === "removed" ? fieldValueOnlyExistsLabel("target", sourceBundle, targetBundle) : humanizeFieldSettingValue(row.right, "") : humanizeListRowValue(row, "target", sourceBundle, targetBundle);
      const note = fieldDetail ? fieldDetailReviewNote(fieldDetail) : rowNote(row);
      const reviewable = !row._displayOnly && row.type !== "same";
      out.push([
        sectionLabelOf(row.sectionKey || row.section || ""),
        item,
        rowTypeLabel(row),
        existence,
        differenceRefs?.[rowIndex]?.id || stableDifferenceId(row, seenIds),
        sourceValue,
        targetValue,
        note,
        reviewable ? "未確認" : "対象外",
        reviewable ? "未判断" : "対象外",
        "",
        ""
      ]);
      rowStyles.push("normal");
      const styles = [];
      styles[4] = "hyperlink";
      styles[5] = "sourceDivider";
      styles[6] = "target";
      styles[7] = "info";
      if (reviewable) {
        styles[8] = "review";
        styles[9] = "review";
        styles[10] = "review";
        styles[11] = "review";
      } else {
        styles[8] = "info";
        styles[9] = "info";
      }
      cellStyles.push(styles);
      rowHeights.push(readableDiffRowHeight([
        { value: sectionLabelOf(row.sectionKey || row.section || ""), width: 18 },
        { value: existence, width: 18 },
        { value: item, width: 30 },
        { value: sourceValue, width: 42 },
        { value: targetValue, width: 42 },
        { value: note, width: 32 }
      ]));
    }
    const dataValidations = rows.length ? [{
      sqref: `I4:I${rows.length + 3}`,
      values: REVIEW_PROGRESS_VALUES,
      promptTitle: "確認状況",
      prompt: "事実確認の進捗を選択してください"
    }, {
      sqref: `J4:J${rows.length + 3}`,
      values: ACTION_DECISION_VALUES,
      promptTitle: "対応判断",
      prompt: "人が判断した対応方針を選択してください"
    }] : [];
    return {
      name,
      rows: out,
      colWidths: [18, 30, 16, 18, 15, 42, 42, 32, 14, 14, 16, 28],
      rowStyles,
      cellStyles,
      headerRow: 3,
      freezeRows: 3,
      freezeColumns: 5,
      rowHeights,
      merges: ["A1:L1", "A2:B2", "C2:E2", "I2:L2"],
      dataValidations,
      internalHyperlinks: rows.flatMap((_row, index) => {
        const target = technicalRefs?.[index];
        return target ? [{
          ref: `E${index + 4}`,
          targetSheet: target.sheetName,
          targetCell: `A${target.rowNumber}`,
          tooltip: "該当する技術明細へ移動"
        }] : [];
      }),
      showGridLines: false,
      print: {
        orientation: "landscape",
        fitToWidth: 1,
        fitToHeight: 0,
        repeatRows: { from: 2, to: 3 }
      }
    };
  }
  function buildSectionSheet(label, list, sourceBundle, targetBundle, differenceRefs) {
    const headers = [
      "差分ID",
      "変更種別",
      "存在状況",
      "項目",
      "パス",
      directionalValueHeader("source", sourceBundle),
      directionalValueHeader("target", targetBundle),
      "確認事項"
    ];
    const groupHeader = [
      "差分の識別",
      "",
      "",
      "",
      "技術パス",
      "比較元（変更前）",
      "比較先（変更後）",
      "確認事項"
    ];
    const guide = sheetGuideBand(
      `${label}の技術パスと原データを確認できます。`,
      label === "フィールド技術明細" ? "通常の確認は「フィールド差分詳細」、レビュー記録は同じ差分IDの「差分一覧」で行います。長文はセルを選択して数式バーでも確認し、「[一部表示]」または「…省略」がある場合は元データを確認します。" : "通常の確認は「差分一覧」で行い、要約だけでは判断できない場合にこのシートで根拠を確認します。長文はセルを選択して数式バーでも確認し、「[一部表示]」または「…省略」がある場合は元データを確認します。"
    );
    const rows = [[guide, "", "", "", "", "", "", ""], groupHeader, headers];
    const rowStyles = ["normal", "normal", "normal"];
    const groupCellStyles = [];
    groupCellStyles[0] = "sectionHeader";
    groupCellStyles[4] = "info";
    groupCellStyles[5] = "sourceGroup";
    groupCellStyles[6] = "targetGroup";
    groupCellStyles[7] = "info";
    const cellStyles = [["info"], groupCellStyles, []];
    cellStyles[2][5] = "headerDivider";
    const rowHeights = [44, 24, 42];
    const seenIds = /* @__PURE__ */ new Map();
    for (const [rowIndex, row] of list.entries()) {
      const existence = rowExistenceLabel(row);
      const item = rowItemLabel(row, sourceBundle, targetBundle);
      const sourceValue = rowValue(row, "source");
      const targetValue = rowValue(row, "target");
      const note = rowNote(row);
      rows.push([
        differenceRefs?.[rowIndex]?.id || stableDifferenceId(row, seenIds),
        rowTypeLabel(row),
        existence,
        item,
        row.path || "",
        sourceValue,
        targetValue,
        note
      ]);
      rowStyles.push("normal");
      const styles = [differenceRefs?.[rowIndex] ? "hyperlink" : "info"];
      styles[5] = "sourceDivider";
      styles[6] = "target";
      cellStyles.push(styles);
      rowHeights.push(readableDiffRowHeight([
        { value: existence, width: 18 },
        { value: item, width: 30 },
        { value: row.path || "", width: 34 },
        { value: sourceValue, width: 42 },
        { value: targetValue, width: 42 },
        { value: note, width: 32 }
      ], 264));
    }
    return {
      name: label,
      rows,
      colWidths: [15, 16, 18, 30, 34, 42, 42, 32],
      rowStyles,
      cellStyles,
      headerRow: 3,
      freezeRows: 3,
      freezeColumns: 4,
      rowHeights,
      merges: ["A1:H1", "A2:D2"],
      internalHyperlinks: list.flatMap((_row, index) => {
        const target = differenceRefs?.[index];
        return target ? [{
          ref: `A${index + 4}`,
          targetSheet: "差分一覧",
          targetCell: `I${target.rowNumber}`,
          tooltip: "差分一覧の確認状況へ戻る"
        }] : [];
      }),
      showGridLines: false,
      print: {
        orientation: "landscape",
        fitToWidth: 1,
        fitToHeight: 0,
        repeatRows: { from: 2, to: 3 }
      }
    };
  }
  function fieldSummaryRootChangeType(summary, model) {
    const root2 = model.details.find((detail) => detail.fieldKey === summary.fieldKey && detail.settingKey === "(field)");
    return root2?.row.type === "added" || root2?.row.type === "removed" ? root2.row.type : null;
  }
  function fieldSummaryChangeTypeLabel(summary, model) {
    const rootType = fieldSummaryRootChangeType(summary, model);
    if (rootType === "added") return "フィールド追加";
    if (rootType === "removed") return "フィールド削除";
    return "設定変更";
  }
  function fieldSummaryExistenceLabel(summary, model) {
    const rootType = fieldSummaryRootChangeType(summary, model);
    if (rootType === "added") return "比較先のみ";
    if (rootType === "removed") return "比較元のみ";
    return "両方";
  }
  function compactFieldSummaryValue(value) {
    const compact = value.replace(/\r?\n/g, " / ");
    if (compact.length <= 100) return compact;
    let keep = 99;
    if (keep > 0 && /[\uD800-\uDBFF]/.test(compact.charAt(keep - 1))) keep -= 1;
    return `${compact.slice(0, keep)}…`;
  }
  function fieldSummaryMainChanges(summary, model, sourceBundle, targetBundle) {
    const details = model.details.filter((detail) => detail.fieldKey === summary.fieldKey).sort((a, b) => a.settingKey.localeCompare(b.settingKey, "ja") || String(a.row.type || "").localeCompare(String(b.row.type || ""), "ja") || String(a.row.path || "").localeCompare(String(b.row.path || ""), "ja"));
    const visible = details.slice(0, 3).map((detail) => {
      if (detail.settingKey === "(field)" && detail.row.type === "added") {
        return `${detail.settingLabel}: フィールドを追加`;
      }
      if (detail.settingKey === "(field)" && detail.row.type === "removed") {
        return `${detail.settingLabel}: フィールドを削除`;
      }
      const sourceValue = compactFieldSummaryValue(fieldSettingHumanValue(detail, "source", sourceBundle, targetBundle));
      const targetValue = compactFieldSummaryValue(fieldSettingHumanValue(detail, "target", sourceBundle, targetBundle));
      return `${detail.settingLabel}: ${sourceValue} → ${targetValue}`;
    });
    const more = details.length > visible.length ? `
ほか${details.length - visible.length}件` : "";
    return `${visible.join("\n")}${more}`;
  }
  function fieldSummaryReviewGuidance(summary, model) {
    const details = model.details.filter((detail) => detail.fieldKey === summary.fieldKey).sort((a, b) => a.settingKey.localeCompare(b.settingKey, "ja") || String(a.row.type || "").localeCompare(String(b.row.type || ""), "ja") || String(a.row.path || "").localeCompare(String(b.row.path || ""), "ja"));
    const unique = [...new Set(details.map(fieldSettingReviewGuidance))];
    const visible = unique.slice(0, 2);
    const more = unique.length > visible.length ? `
ほか${unique.length - visible.length}件の確認事項` : "";
    return `${visible.join("\n")}${more}`;
  }
  function buildFieldSummarySheet(model, sourceBundle, targetBundle, differenceRefs) {
    const firstDetailRowByField = /* @__PURE__ */ new Map();
    const firstReviewRowByField = /* @__PURE__ */ new Map();
    model.details.forEach((detail, index) => {
      if (!firstDetailRowByField.has(detail.fieldKey)) firstDetailRowByField.set(detail.fieldKey, index + 4);
      if (!firstReviewRowByField.has(detail.fieldKey)) {
        firstReviewRowByField.set(detail.fieldKey, differenceRefs?.[detail.rowIndex]?.rowNumber || 4);
      }
    });
    const groupHeader = [
      "変更の状態",
      "",
      "差分フィールド",
      "",
      "",
      "変更内容",
      "",
      "確認事項",
      "ナビゲーション",
      ""
    ];
    const headers = [
      "変更種別",
      "存在状況",
      "フィールド名",
      "フィールドコード",
      "フィールド種別",
      "差分明細数",
      "主な変更",
      "確認事項",
      "詳細",
      "レビュー"
    ];
    const guide = sheetGuideBand(
      "差分があるフィールドと主な変更を、フィールド単位で確認できます。",
      "「詳細」で設定単位の変更を確認し、「レビュー」から差分一覧の入力欄へ進みます。"
    );
    const rows = [[guide, "", "", "", "", "", "", "", "", ""], groupHeader, headers];
    const rowStyles = ["normal", "normal", "normal"];
    const groupCellStyles = [];
    groupCellStyles[0] = "sectionHeader";
    groupCellStyles[2] = "sectionHeader";
    groupCellStyles[5] = "info";
    groupCellStyles[7] = "info";
    groupCellStyles[8] = "info";
    const cellStyles = [["info"], groupCellStyles, []];
    const rowHeights = [44, 24, 32];
    for (const summary of model.summaries) {
      const changeType = fieldSummaryChangeTypeLabel(summary, model);
      const existence = fieldSummaryExistenceLabel(summary, model);
      const mainChanges = fieldSummaryMainChanges(summary, model, sourceBundle, targetBundle);
      const reviewGuidance = fieldSummaryReviewGuidance(summary, model);
      rows.push([
        changeType,
        existence,
        summary.fieldName,
        summary.fieldCode,
        summary.fieldType,
        summary.diffCount,
        mainChanges,
        reviewGuidance,
        `詳細を見る（${summary.diffCount}件）`,
        "レビュー入力へ"
      ]);
      rowStyles.push("normal");
      const styles = [];
      styles[3] = "info";
      styles[4] = "info";
      styles[5] = "info";
      styles[7] = "info";
      styles[8] = "hyperlink";
      styles[9] = "hyperlink";
      cellStyles.push(styles);
      rowHeights.push(readableDiffRowHeight([
        { value: changeType, width: 18 },
        { value: existence, width: 18 },
        { value: summary.fieldName, width: 28 },
        { value: summary.fieldCode, width: 28 },
        { value: summary.fieldType, width: 18 },
        { value: mainChanges, width: 56 },
        { value: reviewGuidance, width: 42 }
      ]));
    }
    return {
      name: "フィールド差分要約",
      rows,
      colWidths: [18, 18, 28, 28, 18, 12, 56, 42, 20, 18],
      rowStyles,
      cellStyles,
      headerRow: 3,
      freezeRows: 3,
      freezeColumns: 5,
      rowHeights,
      merges: ["A1:J1", "A2:B2", "C2:E2", "F2:G2", "I2:J2"],
      internalHyperlinks: [
        ...model.summaries.map((summary, index) => ({
          ref: `I${index + 4}`,
          targetSheet: "フィールド差分詳細",
          targetCell: `B${firstDetailRowByField.get(summary.fieldKey) || 4}`,
          tooltip: `${summary.fieldName}の詳細差分へ移動`
        })),
        ...model.summaries.map((summary, index) => ({
          ref: `J${index + 4}`,
          targetSheet: "差分一覧",
          targetCell: `I${firstReviewRowByField.get(summary.fieldKey) || 4}`,
          tooltip: `${summary.fieldName}のレビュー入力欄へ移動`
        }))
      ],
      showGridLines: false,
      print: {
        orientation: "landscape",
        fitToWidth: 1,
        fitToHeight: 0,
        repeatRows: { from: 2, to: 3 }
      }
    };
  }
  function buildFieldDetailSheet(model, sourceBundle, targetBundle, differenceRefs) {
    const summaryRowByField = new Map(model.summaries.map((summary, index) => [summary.fieldKey, index + 4]));
    const groupHeader = [
      "差分の識別",
      "差分フィールド",
      "",
      "設定差分",
      "",
      "",
      "比較元（変更前）",
      "比較先（変更後）",
      "確認事項",
      "ナビゲーション"
    ];
    const headers = [
      "差分ID",
      "フィールド名",
      "フィールドコード",
      "設定項目",
      "変更種別",
      "存在状況",
      directionalValueHeader("source", sourceBundle),
      directionalValueHeader("target", targetBundle),
      "確認事項",
      "要約へ"
    ];
    const guide = sheetGuideBand(
      "各フィールドの設定項目ごとに、変更種別・存在状況・変更前後の値を確認できます。",
      "差分IDから「差分一覧」のレビュー入力へ進み、「要約へ」でフィールド単位の一覧へ戻ります。値先頭の「[一部表示]」は技術明細または元データを確認します。"
    );
    const rows = [[guide, "", "", "", "", "", "", "", "", ""], groupHeader, headers];
    const rowStyles = ["normal", "normal", "normal"];
    const groupCellStyles = [];
    groupCellStyles[0] = "info";
    groupCellStyles[1] = "sectionHeader";
    groupCellStyles[3] = "info";
    groupCellStyles[6] = "sourceGroup";
    groupCellStyles[7] = "targetGroup";
    groupCellStyles[8] = "info";
    groupCellStyles[9] = "info";
    const cellStyles = [["info"], groupCellStyles, []];
    cellStyles[2][6] = "headerDivider";
    const rowHeights = [44, 24, 42];
    for (const detail of model.details) {
      const changeType = rowTypeLabel(detail.row);
      const existence = rowExistenceLabel(detail.row);
      const sourceValue = fieldSettingHumanValue(detail, "source", sourceBundle, targetBundle);
      const targetValue = fieldSettingHumanValue(detail, "target", sourceBundle, targetBundle);
      const note = fieldDetailReviewNote(detail);
      const diffRef = differenceRefs?.[detail.rowIndex];
      rows.push([
        diffRef?.id || "",
        detail.fieldName,
        detail.fieldCode,
        detail.settingLabel,
        changeType,
        existence,
        sourceValue,
        targetValue,
        note,
        "要約へ戻る"
      ]);
      rowStyles.push("normal");
      const styles = ["hyperlink"];
      styles[2] = "info";
      styles[8] = "info";
      styles[9] = "hyperlink";
      styles[6] = "sourceDivider";
      styles[7] = "target";
      cellStyles.push(styles);
      rowHeights.push(readableDiffRowHeight([
        { value: detail.fieldName, width: 30 },
        { value: detail.fieldCode, width: 32 },
        { value: detail.settingLabel, width: 34 },
        { value: changeType, width: 18 },
        { value: existence, width: 18 },
        { value: sourceValue, width: 44 },
        { value: targetValue, width: 44 },
        { value: note, width: 40 }
      ], 160));
    }
    return {
      name: "フィールド差分詳細",
      rows,
      colWidths: [15, 30, 32, 34, 18, 18, 44, 44, 40, 16],
      rowStyles,
      cellStyles,
      headerRow: 3,
      freezeRows: 3,
      freezeColumns: 6,
      rowHeights,
      merges: ["A1:J1", "B2:C2", "D2:F2"],
      internalHyperlinks: [
        ...model.details.map((detail, index) => ({
          ref: `A${index + 4}`,
          targetSheet: "差分一覧",
          targetCell: `I${differenceRefs?.[detail.rowIndex]?.rowNumber || 4}`,
          tooltip: `${detail.fieldName}のレビュー入力欄へ移動`
        })),
        ...model.details.map((detail, index) => ({
          ref: `J${index + 4}`,
          targetSheet: "フィールド差分要約",
          targetCell: `C${summaryRowByField.get(detail.fieldKey) || 4}`,
          tooltip: `${detail.fieldName}の要約へ戻る`
        }))
      ],
      showGridLines: false,
      print: {
        orientation: "landscape",
        fitToWidth: 1,
        fitToHeight: 0,
        repeatRows: { from: 2, to: 3 }
      }
    };
  }
  function buildIssuesSheet(ctx) {
    const fetchIssues = ctx.fetchIssues || [];
    const partialIssues = ctx.partialIssues || [];
    const truncation = hasIncompleteActualDiffTruncation(ctx.truncation) ? ctx.truncation : null;
    if (!fetchIssues.length && !partialIssues.length && !truncation) return null;
    const guide = sheetGuideBand(
      "取得失敗、一部未検証、件数上限の対象と理由を確認できます。",
      "概要の取得状態と照らし合わせ、比較できていない範囲を確認してから判断します。"
    );
    const rows = [
      [guide, "", "", "", ""],
      ["区分", "セクション", "対象", "内容", "対象ファイル・補足"]
    ];
    for (const issue of fetchIssues) {
      rows.push(["取得失敗", sectionLabelOf(issue.sectionKey || issue.section || ""), getIssueSideLabel(issue.side || ""), issueMessage(issue), ""]);
    }
    for (const issue of partialIssues) {
      rows.push(["一部未検証", sectionLabelOf(issue.sectionKey || issue.section || ""), getIssueSideLabel(issue.side || ""), String(issue.message || issue.reason || "一部データを取得できず、代替情報で比較しました"), partialFileDetails(issue)]);
    }
    if (truncation) {
      const sections = truncation.sections?.length ? truncation.sections : [{ sectionKey: "", section: "全体", partiallyScanned: true, scanStatus: "partial", omittedDiffCount: null }];
      for (const section of sections) {
        const scanStatus = truncationScanStatusOf(section);
        const knownOmittedDiff = Number(section.omittedDiffCount ?? section.droppedDiff ?? 0);
        const omittedDiff = scanStatus === "unscanned" ? "差分 未走査・件数不明" : scanStatus === "partial" ? "差分 部分走査・総件数不明（表示件数は下限）" : `差分 ${knownOmittedDiff}件（既知）`;
        const omittedSame = scanStatus === "complete" ? `同一 ${Number(section.droppedSame || 0)}件（既知）` : "同一 件数不明";
        const omitted = [omittedDiff, omittedSame].join(" / ");
        const message = scanStatus === "unscanned" ? `差分上限 ${truncation.diffLimit || "-"} 件に到達した後、このセクションは未走査です` : scanStatus === "partial" ? `差分上限 ${truncation.diffLimit || "-"} 件に到達し、このセクションは部分走査です。表示件数は総件数の下限です` : knownOmittedDiff > 0 ? `差分上限 ${truncation.diffLimit || "-"} 件に到達後も、この片側セクションは全体を確認済みです` : `差分上限 ${truncation.diffLimit || "-"} 件に到達しましたが、このセクションの走査は完了しています`;
        rows.push(["件数上限", sectionLabelOf(section.sectionKey || section.section || "全体"), "両方", message, omitted]);
      }
    }
    return {
      name: "取得・未検証",
      rows,
      colWidths: [14, 22, 12, 72, 60],
      rowStyles: rows.map(() => "normal"),
      cellStyles: rows.map((_, index) => index === 0 ? ["info"] : index === 1 ? [] : ["warning"]),
      headerRow: 2,
      freezeRows: 2,
      freezeColumns: 2,
      rowHeights: rows.map((row, index) => {
        if (index === 0) return 44;
        if (index === 1) return 30;
        return readableDiffRowHeight([
          { value: row[0], width: 14 },
          { value: row[1], width: 22 },
          { value: row[2], width: 12 },
          { value: row[3], width: 72 },
          { value: row[4], width: 60 }
        ], 160);
      }),
      merges: ["A1:E1"],
      showGridLines: false,
      print: {
        orientation: "landscape",
        fitToWidth: 1,
        fitToHeight: 0,
        repeatRows: { from: 2, to: 2 }
      }
    };
  }
  function customerSectionLabel(key) {
    const labels = {
      appSettings: "アプリ基本設定",
      appInfo: "アプリ情報",
      formSettings: "フォーム設定",
      pluginSettings: "プラグイン設定",
      customizeSettings: "カスタマイズ設定",
      appAcl: "アプリ権限",
      fieldAcl: "フィールド権限",
      recordPermissions: "レコード権限"
    };
    const known = SECTION_LABEL_BY_KEY2.get(key) || "";
    return labels[key] || known.replace(/\(※\)/g, "").trim() || "その他の設定";
  }
  function customerAppName(bundle, fallback) {
    const name = String(extractAppNameFromBundle(bundle) || "").normalize("NFKC").trim();
    return name || fallback;
  }
  function customerScopeLabel(scopes) {
    const labels = [...new Set((scopes || []).map((key) => customerSectionLabel(key)).filter(Boolean))];
    return labels.length ? labels.join("、") : "比較した設定範囲";
  }
  function customerComparisonExclusionLabel(ctx) {
    const customerLabels = {
      viewOrder: "ビュー順序",
      permissionOrder: "権限順序",
      generalArrayOrder: "一般配列順序",
      fieldOrder: "フィールド順序",
      processOrder: "プロセス順序",
      appReferences: "アプリID（比較対象・参照先）",
      auditMeta: "監査メタ情報",
      labelsAndText: "ラベル・説明文",
      appearance: "表示設定",
      fileKeys: "ファイルキー",
      enabledFlags: "有効フラグ"
    };
    const enabled = Object.entries(ctx.normalizationPresetState || {}).sort(([left], [right]) => left.localeCompare(right)).filter(([, value]) => !!value).map(([key]) => customerLabels[key] || NORMALIZATION_LABELS[key] || key);
    const ignoreKeys = [...new Set(String(ctx.ignoreKeys || "").split(/[\n\r,、，;；]+/).map((key) => key.trim()).filter(Boolean))];
    if (ignoreKeys.length) enabled.push(`個別指定 ${ignoreKeys.length}件`);
    return enabled.length ? enabled.join("、") : "なし";
  }
  function customerChangeType(row) {
    if (row.moved || row.type === "moved") return "要素の移動";
    if (row.type === "added") return "追加";
    if (row.type === "removed") return "削除";
    return "変更";
  }
  function customerPlainText(value, maxLength) {
    const decoded = String(value ?? "").replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">").replace(/&quot;/gi, '"').replace(/&#(?:39|x27);/gi, "'").replace(/&#(\d+);/g, (match, code) => {
      const codePoint = Number(code);
      return Number.isInteger(codePoint) && codePoint >= 0 && codePoint <= 1114111 ? String.fromCodePoint(codePoint) : match;
    }).replace(/[\t\r\n ]+/g, " ").trim();
    if (maxLength == null || decoded.length <= maxLength) return decoded;
    return `${decoded.slice(0, Math.max(0, maxLength - 1))}…`;
  }
  function customerRichText(value, maxLength) {
    const withoutMarkup = customerPlainText(value).replace(/<br\s*\/?>/gi, "\n").replace(/<\/(?:div|p|li|tr|h[1-6])>/gi, "\n").replace(/<[^>]*>/g, "");
    return customerPlainText(withoutMarkup, maxLength);
  }
  function customerGenericSettingLabel(sectionKey, path, decodedLabel) {
    const leaf = path.match(/(?:^|[.\]])([^.[\]]+)$/)?.[1] || "";
    if (sectionKey === "customizeSettings" && (leaf === "_body" || leaf === "body")) {
      return "ファイル内容";
    }
    if (sectionKey === "pluginSettings" && (leaf === "config" || leaf === "_config")) {
      return "プラグイン設定内容";
    }
    if (sectionKey === "actionSettings" && /\.(?:(?:destApp|targetApp|sourceApp)\.(?:app|appId)|destAppId|targetAppId|sourceAppId)$/.test(path)) {
      return "参照先アプリID";
    }
    if (sectionKey === "actionSettings" && /\.mappings(?:\[\d+\])?(?:\.|$)/.test(path)) {
      const mappingIndex = Number(path.match(/\.mappings\[(\d+)\]/)?.[1]);
      return Number.isInteger(mappingIndex) ? `フィールドの対応付け（${mappingIndex + 1}件目）` : "フィールドの対応付け";
    }
    if ((sectionKey === "actionSettings" || sectionKey === "processSettings") && leaf === "filterCond") {
      return "実行条件";
    }
    const labels = {
      fileKey: "ファイル識別情報",
      filterCond: "絞り込み条件",
      sort: "並び順"
    };
    return labels[leaf] || decodedLabel || "設定内容";
  }
  function customerGenericTargetLabel(row, sectionKey, decodedTargets) {
    const entityLabel = customerPlainText(row.entityLabel || "");
    const entityKind = String(row.entityKind || "");
    if (entityLabel) {
      const prefixes = {
        action: "アクション",
        appAction: "アプリアクション",
        plugin: "プラグイン",
        jsCss: "カスタマイズ",
        state: "ステータス",
        report: "グラフ",
        notification: "通知",
        perRecordNotification: "レコード条件通知",
        reminderNotification: "リマインダー通知"
      };
      const prefix = prefixes[entityKind];
      return prefix ? `${prefix}「${entityLabel}」` : entityLabel;
    }
    const arrayKeyValue = row.arrayKeyValue;
    if (arrayKeyValue != null && typeof arrayKeyValue !== "object") {
      const value = customerPlainText(arrayKeyValue);
      if (sectionKey === "pluginSettings") return `プラグイン「${value}」`;
      if (sectionKey === "actionSettings") return `アプリアクション「${value}」`;
      if (sectionKey === "processSettings") return `アクション「${value}」`;
    }
    const normalizedTargets = decodedTargets.map((target) => target.replace(/^デスクトップ\s*\/\s*JS$/i, "デスクトップ JavaScript").replace(/^モバイル\s*\/\s*JS$/i, "モバイル JavaScript").replace(/^デスクトップ\s*\/\s*CSS$/i, "デスクトップ CSS").replace(/^モバイル\s*\/\s*CSS$/i, "モバイル CSS"));
    return normalizedTargets.length ? normalizedTargets.join(" › ") : `${customerSectionLabel(sectionKey)}全体`;
  }
  function customerActionItemParts(row, sourceBundle, targetBundle) {
    const path = String(row.path || "");
    if (sectionKeyOfRow(row) !== "actionSettings" || !/^actionSettings\.actions(?:\.|\[)/.test(path)) {
      return null;
    }
    const actionNames = (bundle) => {
      const actions = bundle?.sections?.actionSettings?.actions;
      if (!actions || typeof actions !== "object" || Array.isArray(actions)) return [];
      return Object.keys(actions).filter((name) => {
        const prefix = `actionSettings.actions.${name}`;
        return path === prefix || path.startsWith(`${prefix}.`) || path.startsWith(`${prefix}[`);
      }).sort((left, right) => right.length - left.length);
    };
    const preferredBundle = row.type === "removed" ? sourceBundle : targetBundle;
    const fallbackBundle = row.type === "removed" ? targetBundle : sourceBundle;
    const entityKind = String(row.entityKind || "");
    const entityLabel = customerPlainText(row.entityLabel || "");
    const keyedActionName = row.arrayKey === "name" ? customerPlainText(row.arrayKeyValue || "") : "";
    const pathActionName = customerPlainText(
      /^actionSettings\.actions\.(.+?)(?=\.(?:mappings|destApp|targetApp|sourceApp|destAppId|targetAppId|sourceAppId|filterCond|name|index)(?:\.|\[|$)|$)/.exec(path)?.[1] || ""
    );
    const actionName = actionNames(preferredBundle)[0] || actionNames(fallbackBundle)[0] || (entityKind === "appAction" ? entityLabel : "") || keyedActionName || pathActionName || "名称不明";
    let settingItem = customerGenericSettingLabel("actionSettings", path, "");
    const actionPrefix = actionName === "名称不明" ? "" : `actionSettings.actions.${actionName}`;
    if (actionPrefix && path === actionPrefix) {
      settingItem = row.type === "added" ? "アクションを追加" : row.type === "removed" ? "アクションを削除" : "アクション全体";
    }
    return {
      target: `アプリアクション「${actionName}」`,
      settingItem
    };
  }
  function customerFieldTargetLabel(row, info, sourceBundle, targetBundle) {
    const identity = fieldDisplayIdentity(row, info, { rows: [], sourceBundle, targetBundle });
    if (info.isSubField) {
      const preferredBundle = row.type === "removed" ? sourceBundle : targetBundle;
      const fallbackBundle = row.type === "removed" ? targetBundle : sourceBundle;
      const preferredRoot = fieldSettingsProperties(preferredBundle)[info.rootCode];
      const fallbackRoot = fieldSettingsProperties(fallbackBundle)[info.rootCode];
      const rootName = customerPlainText(fieldDefinitionLabel(preferredRoot) || fieldDefinitionLabel(fallbackRoot) || info.rootCode);
      const childName = customerPlainText(identity.fieldName.split(" > ").at(-1) || info.subFieldCode);
      const root2 = rootName && rootName !== info.rootCode ? `テーブル「${rootName}」（コード: ${info.rootCode}）` : `テーブル「${info.rootCode}」`;
      const child = childName && childName !== info.subFieldCode ? `フィールド「${childName}」（コード: ${info.subFieldCode}）` : `フィールド「${info.subFieldCode}」`;
      return `${root2} › ${child}`;
    }
    const fieldCode = String(identity.fieldCode || info.rootCode || "").trim();
    const fieldName = customerPlainText(identity.fieldName || fieldCode || "フィールド");
    return fieldName && fieldName !== fieldCode ? `フィールド「${fieldName}」（コード: ${fieldCode}）` : `フィールド「${fieldCode || fieldName || "名称不明"}」`;
  }
  function customerFieldSettingLabel(settingKey, fallback) {
    if (settingKey === "(field)") return "フィールド全体";
    if (settingKey.startsWith("options.")) {
      const tokens = settingKey.split(".");
      const option = customerPlainText(tokens[1] || "名称不明");
      const property = FIELD_SETTING_LABELS[tokens.at(-1) || ""] || fallback.split(" / ").at(-1) || "設定内容";
      return `選択肢「${option}」：${property}`;
    }
    const prefix = settingKey.startsWith("lookup.") ? "ルックアップ" : settingKey.startsWith("referenceTable.") ? "関連レコード" : "";
    const leaf = settingKey.split(".").filter(Boolean).at(-1) || "";
    const exactLabels = {
      "lookup.relatedApp.app": "参照先アプリID",
      "lookup.relatedApp.appId": "参照先アプリID",
      "lookup.relatedAppId": "参照先アプリID",
      "referenceTable.relatedApp.app": "参照先アプリID",
      "referenceTable.relatedApp.appId": "参照先アプリID",
      "referenceTable.relatedAppId": "参照先アプリID",
      "referenceTable.condition.field": "自アプリの照合フィールド",
      "referenceTable.condition.relatedField": "参照先の照合フィールド",
      "referenceTable.sort": "並び順",
      "lookup.relatedKeyField": "コピー元のフィールド",
      "lookup.fieldMappings": "ほかのフィールドのコピー",
      "lookup.lookupPickerFields": "選択画面の表示フィールド"
    };
    let label = exactLabels[settingKey];
    if (!label && /^referenceTable\.displayFields\.\d+$/.test(settingKey)) {
      const index = Number(settingKey.split(".").at(-1));
      label = `表示フィールド（${index + 1}件目）`;
    }
    if (!label && /^lookup\.(?:fieldMappings|lookupPickerFields)\.\d+/.test(settingKey)) {
      const index = Number(settingKey.match(/\.(\d+)/)?.[1] || 0);
      label = `${FIELD_SETTING_LABELS[settingKey.split(".")[1]] || "設定項目"}（${index + 1}件目）`;
    }
    if (!label) label = FIELD_SETTING_LABELS[leaf] || fallback.split(" / ").at(-1) || "設定内容";
    return prefix ? `${prefix}：${label}` : label;
  }
  function customerLayoutItemParts(row, sourceBundle, targetBundle) {
    const path = String(row.path || "");
    const match = /^layoutSettings\.layout\[(\d+)\](.*)$/.exec(path);
    if (!match) return null;
    const rowIndex = Number(match[1]);
    const preferredBundle = row.type === "removed" ? sourceBundle : targetBundle;
    const fallbackBundle = row.type === "removed" ? targetBundle : sourceBundle;
    const preferredPayload = row.type === "removed" ? row.left : row.right;
    const fallbackPayload = row.type === "removed" ? row.right : row.left;
    const payloadEntity = preferredPayload && typeof preferredPayload === "object" && !Array.isArray(preferredPayload) ? preferredPayload : fallbackPayload && typeof fallbackPayload === "object" && !Array.isArray(fallbackPayload) ? fallbackPayload : null;
    const entityRootPath = /(?:^|\.)(?:layout|fields)\[\d+\]$/.test(path);
    const layoutAt = (bundle) => bundle?.sections?.layoutSettings?.layout?.[rowIndex];
    let entity = entityRootPath ? payloadEntity : null;
    if (!entity) entity = layoutAt(preferredBundle) || layoutAt(fallbackBundle) || null;
    const childRoutes = [...match[2].matchAll(/\.(fields|layout)\[(\d+)\]/g)].map((entry) => ({ bucket: entry[1], index: Number(entry[2]) }));
    const fieldIndices = [...path.matchAll(/\.fields\[(\d+)\]/g)].map((entry) => Number(entry[1]));
    for (const route of childRoutes) {
      if (entityRootPath && entity === payloadEntity) break;
      entity = entity && typeof entity === "object" && !Array.isArray(entity) ? entity[route.bucket]?.[route.index] : null;
    }
    if (!entity && payloadEntity) entity = payloadEntity;
    const lastFieldIndex = fieldIndices.at(-1);
    const position = lastFieldIndex == null ? `${rowIndex + 1}行目` : `${rowIndex + 1}行目・${lastFieldIndex + 1}項目目`;
    const definition = entity && typeof entity === "object" && !Array.isArray(entity) ? entity : {};
    const type = String(definition.type || "").toUpperCase();
    const code = String(definition.code || "").trim();
    const entityLabel = customerRichText(definition.label || definition.name || definition.value || "");
    const elementId = String(definition.elementId || "").trim();
    const display = code ? customerFieldCodeLabel(code, preferredBundle) || customerFieldCodeLabel(code, fallbackBundle) || code : "";
    const labelMatch = /^(.*?)（[^（）]+）$/.exec(display);
    const displayName = customerPlainText(entityLabel || labelMatch?.[1] || display || code);
    const codedTarget = (kind) => displayName && displayName !== code ? `${kind}「${displayName}」（コード: ${code}）` : `${kind}「${code || displayName || "名称不明"}」`;
    let target;
    if (type === "GROUP") {
      target = codedTarget("グループ");
    } else if (type === "SUBTABLE") {
      target = codedTarget("テーブル");
    } else if (type === "LABEL") {
      target = `ラベル「${entityLabel || "文字なし"}」（${position}）`;
    } else if (type === "SPACER") {
      target = elementId ? `スペース「${elementId}」（${position}）` : `スペース（${position}）`;
    } else if (code) {
      target = codedTarget("フィールド");
    } else if (entityLabel) {
      target = `ラベル「${entityLabel}」（${position}）`;
    } else {
      target = `レイアウト ${position}`;
    }
    const leaf = path.match(/(?:^|\.)([^.[\]]+)$/)?.[1] || "";
    const propLabels = {
      type: "種類",
      code: "フィールドコード",
      elementId: "要素ID",
      label: "表示文字",
      value: "表示文字",
      size: "表示サイズ",
      width: "横幅",
      height: "高さ",
      innerWidth: "入力欄の横幅",
      innerHeight: "入力欄の高さ"
    };
    let settingItem = propLabels[leaf] || (leaf && leaf !== "layout" && leaf !== "fields" ? leaf : "");
    if (!settingItem) {
      settingItem = lastFieldIndex == null ? row.type === "added" ? "行を追加" : row.type === "removed" ? "行を削除" : "行の設定" : row.type === "added" ? "配置を追加" : row.type === "removed" ? "配置を削除" : "配置の設定";
    }
    return { target, settingItem };
  }
  function customerViewItemParts(row) {
    const path = String(row.path || "");
    const match = /^viewSettings\.views\.(.+?)\.(fields(?:\[(\d+)\])?|filterCond|sort|type|name|pagination|paginationStyle|pager|builtinType|title|html|index)$/.exec(path);
    if (!match) {
      const wholeView = /^viewSettings\.views\.(.+)$/.exec(path);
      if (!wholeView) return null;
      return {
        target: `一覧「${customerPlainText(wholeView[1])}」`,
        settingItem: row.type === "added" ? "一覧を追加" : row.type === "removed" ? "一覧を削除" : "一覧全体"
      };
    }
    const viewName = customerPlainText(match[1]);
    const property = match[2];
    const labels = {
      filterCond: "絞り込み条件",
      sort: "並び順",
      type: "一覧の種類",
      name: "一覧名",
      pagination: "ページ送り",
      paginationStyle: "ページ送りの形式",
      pager: "ページ送り",
      builtinType: "標準一覧の種類",
      title: "見出し",
      html: "カスタマイズ内容",
      index: "一覧の並び順"
    };
    const settingItem = property.startsWith("fields") ? match[3] == null ? "表示項目" : `表示項目（${Number(match[3]) + 1}件目）` : labels[property] || "一覧設定";
    return { target: `一覧「${viewName}」`, settingItem };
  }
  function customerItemParts(row, sourceBundle, targetBundle) {
    const sectionKey = sectionKeyOfRow(row);
    const sectionLabel = customerSectionLabel(sectionKey);
    const path = String(row.path || "").trim();
    if (row._stateRenameNotice) return { target: "プロセス管理", settingItem: "ステータス名" };
    const fieldInfo = extractFieldPathInfo(path);
    if (fieldInfo) {
      const setting = fieldSettingIdentity(fieldInfo);
      return {
        target: customerFieldTargetLabel(row, fieldInfo, sourceBundle, targetBundle),
        settingItem: customerFieldSettingLabel(setting.settingKey, setting.settingLabel)
      };
    }
    const layout = customerLayoutItemParts(row, sourceBundle, targetBundle);
    if (layout) return layout;
    const view = sectionKey === "viewSettings" ? customerViewItemParts(row) : null;
    if (view) return view;
    const action = customerActionItemParts(row, sourceBundle, targetBundle);
    if (action) return action;
    try {
      const decoded = decodeRow(row);
      if (decoded) {
        const targets = [...new Set(decoded.whereChips.map((chip) => customerPlainText(chip.label)).filter(Boolean))];
        const decodedSetting = decoded.propLabel === "絞込条件" ? "絞り込み条件" : decoded.propLabel === "ソート" ? "並び順" : customerPlainText(decoded.propLabel);
        return {
          target: customerGenericTargetLabel(row, sectionKey, targets),
          settingItem: customerGenericSettingLabel(sectionKey, path, decodedSetting)
        };
      }
    } catch {
    }
    const explicit = String(row.label || "").trim();
    if (explicit && explicit !== path) {
      return { target: customerPlainText(explicit), settingItem: "設定内容" };
    }
    return {
      target: "未識別の設定項目",
      settingItem: "設定内容",
      technicalPath: path || sectionKey
    };
  }
  function customerSideIsAbsent(row, side) {
    if (side === "source" && row.type === "added") return true;
    if (side === "target" && row.type === "removed") return true;
    const property = side === "source" ? "left" : "right";
    return !Object.prototype.hasOwnProperty.call(row, property);
  }
  function customerRawValue(row, side) {
    if (customerSideIsAbsent(row, side)) return { state: "不存在", text: "—" };
    const value = side === "source" ? row.left : row.right;
    if (value === void 0) return { state: "未定義（undefined）", text: "undefined" };
    if (value === null) return { state: "null", text: "null" };
    if (typeof value === "string") {
      return {
        state: value.length ? `文字列（${value.length}文字）` : "文字列（空文字）",
        text: JSON.stringify(value)
      };
    }
    if (typeof value === "boolean") return { state: "真偽値", text: value ? "true" : "false" };
    if (typeof value === "number") {
      const serialized = JSON.stringify(value);
      return { state: "数値", text: serialized == null ? String(value) : serialized };
    }
    if (Array.isArray(value)) {
      return { state: `配列（${value.length}件）`, text: stringifyForDiff(value) };
    }
    if (typeof value === "object") {
      return { state: `オブジェクト（${Object.keys(value).length}項目）`, text: stringifyForDiff(value) };
    }
    return { state: typeof value, text: String(value) };
  }
  var CUSTOMER_MAIN_VALUE_LIMIT = 120;
  var CUSTOMER_DETAIL_RAW_MAX_LINES = 22;
  var CUSTOMER_RAW_CHUNK_TEXT_LIMIT = 3e4;
  var CUSTOMER_RAW_CHUNK_LINE_LIMIT = 20;
  var CUSTOMER_RAW_CHUNK_COLUMN_WIDTH = 60;
  function customerRawNeedsContinuation(raw) {
    return raw.text.length > 32767 || estimatedWrappedLines(raw.text, 42) > CUSTOMER_DETAIL_RAW_MAX_LINES;
  }
  function splitCustomerRawText(text2) {
    if (!text2.length) return [""];
    const chunks = [];
    let offset = 0;
    while (offset < text2.length) {
      const capacity = Math.max(8, CUSTOMER_RAW_CHUNK_COLUMN_WIDTH - 2);
      let end = offset;
      let lines = 1;
      let lineWidth = 0;
      while (end < text2.length && end - offset < CUSTOMER_RAW_CHUNK_TEXT_LIMIT) {
        const codePoint = text2.codePointAt(end);
        const charLength = codePoint > 65535 ? 2 : 1;
        const char = text2.slice(end, end + charLength);
        let nextLines = lines;
        let nextWidth = lineWidth;
        if (char === "\n") {
          nextLines += 1;
          nextWidth = 0;
        } else if (char !== "\r") {
          const charWidth = codePoint <= 255 ? 1 : 2;
          if (nextWidth + charWidth > capacity) {
            nextLines += 1;
            nextWidth = charWidth;
          } else {
            nextWidth += charWidth;
          }
        }
        if (nextLines > CUSTOMER_RAW_CHUNK_LINE_LIMIT && end > offset) break;
        lines = nextLines;
        lineWidth = nextWidth;
        end += charLength;
      }
      if (end <= offset) end = Math.min(text2.length, offset + 1);
      chunks.push(text2.slice(offset, end));
      offset = end;
    }
    return chunks;
  }
  function buildCustomerRawContinuations(items) {
    const continuations = [];
    let firstRow = 3;
    for (const item of items) {
      for (const side of ["source", "target"]) {
        const raw = side === "source" ? item.rawBefore : item.rawAfter;
        if (!customerRawNeedsContinuation(raw)) continue;
        const chunks = splitCustomerRawText(raw.text);
        continuations.push({ kind: "difference", item, side, chunks, firstRow });
        firstRow += chunks.length;
      }
    }
    return continuations;
  }
  function compactCustomerMainValue(value) {
    const lines = value.split(/\r?\n/);
    const lineLimited = lines.length > 4 ? `${lines.slice(0, 4).join("\n")}
…` : value;
    if (lineLimited.length <= CUSTOMER_MAIN_VALUE_LIMIT) return lineLimited;
    let keep = CUSTOMER_MAIN_VALUE_LIMIT - 1;
    if (keep > 0 && /[\uD800-\uDBFF]/.test(lineLimited.charAt(keep - 1))) keep -= 1;
    return `${lineLimited.slice(0, Math.max(0, keep))}…`;
  }
  function customerFieldCodeLabel(codeValue, bundle) {
    const code = String(codeValue ?? "").trim();
    if (!code) return code;
    const definition = fieldSettingsProperties(bundle)[code];
    const label = fieldDefinitionLabel(definition);
    return label && label !== code ? `${label}（${code}）` : code;
  }
  function replaceCustomerFieldCodes(value, bundle) {
    const definitions = Object.entries(fieldSettingsProperties(bundle)).map(([code, definition]) => ({ code, label: fieldDefinitionLabel(definition) })).filter(({ code, label }) => !!code && !!label && code !== label).sort((a, b) => b.code.length - a.code.length);
    if (!definitions.length) return value;
    const labels = new Map(definitions.map(({ code, label }) => [code, label]));
    const alternatives = definitions.map(({ code }) => code.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
    const fieldCodePattern = new RegExp(`(^|[^A-Za-z0-9_])(${alternatives})(?=$|[^A-Za-z0-9_])`, "g");
    const replaceUnquoted = (text2) => text2.replace(
      fieldCodePattern,
      (_match, prefix, code) => `${prefix}${labels.get(code)}（${code}）`
    );
    let result = "";
    let unquotedStart = 0;
    let cursor = 0;
    while (cursor < value.length) {
      const quote = value[cursor];
      if (quote !== '"' && quote !== "'") {
        cursor += 1;
        continue;
      }
      result += replaceUnquoted(value.slice(unquotedStart, cursor));
      const quotedStart = cursor;
      cursor += 1;
      while (cursor < value.length) {
        if (value[cursor] === "\\" && cursor + 1 < value.length) {
          cursor += 2;
          continue;
        }
        if (value[cursor] === quote) {
          cursor += 1;
          break;
        }
        cursor += 1;
      }
      result += value.slice(quotedStart, cursor);
      unquotedStart = cursor;
    }
    return result + replaceUnquoted(value.slice(unquotedStart));
  }
  function customerSortValue(value, bundle) {
    return value.split(/\s*,\s*/).map((part) => {
      const match = /^(.*?)\s+(asc|desc)$/i.exec(part.trim());
      if (!match) return replaceCustomerFieldCodes(part, bundle);
      const field = customerFieldCodeLabel(match[1], bundle);
      return `${field}（${match[2].toLowerCase() === "asc" ? "昇順" : "降順"}）`;
    }).join("、");
  }
  function customerTypeLabel(value) {
    const labels = {
      LIST: "一覧",
      CALENDAR: "カレンダー",
      CUSTOM: "カスタマイズ"
    };
    return FIELD_TYPE_LABELS[value] || labels[value] || value;
  }
  function customerComplexValueSummary(row, side, value) {
    const fieldSummary = sectionKeyOfRow(row) === "fieldSettings" ? conciseFieldDefinition(value) : null;
    if (fieldSummary) return fieldSummary;
    const decoded = decodedListValue(row, side);
    if (decoded) return decoded;
    if (Array.isArray(value)) {
      if (!value.length) return "空の一覧";
      if (value.every((item) => item == null || typeof item !== "object")) {
        const preview = value.slice(0, 5).map(humanizeListScalar).join("、");
        return `${value.length}件：${preview}${value.length > 5 ? `、ほか${value.length - 5}件` : ""}`;
      }
      return `${value.length}件の設定`;
    }
    const labels = {
      name: "名称",
      label: "名称",
      title: "名称",
      code: "コード",
      id: "ID",
      url: "URL",
      type: "種類",
      enabled: "有効",
      enable: "有効"
    };
    const facts = Object.entries(value).filter(([key, item]) => labels[key] && (item == null || typeof item !== "object")).slice(0, 5).map(([key, item]) => {
      const displayValue = key === "type" && typeof item === "string" ? customerTypeLabel(item) : humanizeListScalar(item);
      return `${labels[key]}: ${displayValue}`;
    });
    return facts.length ? facts.join("\n") : `${Object.keys(value).length}項目の設定`;
  }
  function customerReadableValue(row, side, sourceBundle, targetBundle) {
    if (customerSideIsAbsent(row, side)) return "（存在しません）";
    const value = side === "source" ? row.left : row.right;
    const bundle = side === "source" ? sourceBundle : targetBundle;
    const path = String(row.path || "");
    if (value === void 0) return "（未定義：undefined）";
    if (value === null) return "（null）";
    if (value === "") {
      return /(?:^|\.)filterCond$/.test(path) ? "（空文字：条件なし）" : "（空文字）";
    }
    let display;
    if (value && typeof value === "object") {
      display = customerComplexValueSummary(row, side, value);
    } else {
      const fieldInfo = extractFieldPathInfo(path);
      const setting = fieldInfo ? fieldSettingIdentity(fieldInfo) : null;
      if (fieldInfo && setting?.settingKey !== "(field)") {
        display = humanizeFieldSettingValue(value, setting?.settingKey || "");
      } else if (typeof value === "boolean") {
        display = value ? "はい" : "いいえ";
      } else {
        display = String(value);
      }
      if (/\.fields\[\d+\]$/.test(path) && typeof value === "string") {
        display = customerFieldCodeLabel(value, bundle);
      } else if (/(?:^|\.)sort$/.test(path) && typeof value === "string") {
        display = customerSortValue(value, bundle);
      } else if (/(?:^|\.)filterCond$/.test(path) && typeof value === "string") {
        display = replaceCustomerFieldCodes(value, bundle);
      } else if (/(?:^|\.)(?:width|height|innerWidth|innerHeight)$/.test(path) && (typeof value === "number" || /^-?\d+(?:\.\d+)?$/.test(String(value)))) {
        display = `${value}px`;
      } else if (/(?:^|\.)type$/.test(path) && typeof value === "string") {
        display = customerTypeLabel(value);
      }
    }
    return compactCustomerMainValue(display);
  }
  function customerReviewNote(row) {
    const key = sectionKeyOfRow(row);
    const fieldInfo = extractFieldPathInfo(String(row.path || ""));
    if (fieldInfo) {
      const identity = fieldDisplayIdentity(row, fieldInfo, { rows: [] });
      const setting = fieldSettingIdentity(fieldInfo);
      return fieldSettingReviewGuidance({
        rowIndex: 0,
        fieldKey: identity.fieldKey,
        fieldCode: identity.fieldCode,
        fieldName: identity.fieldName,
        fieldType: identity.fieldType,
        settingKey: setting.settingKey,
        settingLabel: setting.settingLabel,
        row
      });
    }
    if (row._stateRenameNotice) {
      return "ステータス名の変更が意図したものか確認してください。この行は確認専用で、自動反映の対象外です。";
    }
    const path = String(row.path || "");
    if (/(?:^|\.)filterCond$/.test(path)) {
      if (row.right == null || row.right === "") {
        return "条件がなくなり対象が広がる可能性があります。意図した変更か確認してください。";
      }
      if (row.left == null || row.left === "") {
        return "条件が追加され対象が絞られます。意図した変更か確認してください。";
      }
      return "対象となる条件が変わります。変更前後の対象レコードを確認してください。";
    }
    if (/(?:^|\.)sort$/.test(path)) {
      return "表示順が変わります。利用者が探しやすい順序になっているか確認してください。";
    }
    if (/(?:^|\.)(?:width|height|innerWidth|innerHeight)$/.test(path)) {
      return "画面上の幅・高さが変わります。入力欄や一覧の見え方を確認してください。";
    }
    const guidance = {
      appSettings: "アプリの基本設定が意図した変更か確認してください。",
      appInfo: "アプリ情報が意図した変更か確認してください。",
      layoutSettings: "配置や表示サイズが意図した変更か確認してください。",
      formSettings: "フォーム設定が意図した変更か確認してください。",
      viewSettings: "表示項目・条件・並び順が意図した変更か確認してください。",
      reportSettings: "グラフの項目・条件が意図した変更か確認してください。",
      processSettings: "ステータス・遷移条件が意図した変更か確認してください。",
      actionSettings: "アクション設定が意図した変更か確認してください。",
      categories: "カテゴリ設定が意図した変更か確認してください。"
    };
    const note = guidance[key] || "変更内容が意図したものか確認してください。";
    return row._nonActionable ? `${note} この行は確認専用で、自動反映の対象外です。` : note;
  }
  function buildCustomerDiffItems(ctx) {
    const actualRows = (ctx.rows || []).filter((row) => !row._displayOnly && row.type !== "same");
    const items = [];
    for (const [sectionKey, rows] of groupRowsBySection(actualRows)) {
      const sectionLabel = customerSectionLabel(sectionKey);
      for (const row of rows) {
        const before = customerReadableValue(row, "source", ctx.sourceBundle, ctx.targetBundle);
        const after = customerReadableValue(row, "target", ctx.sourceBundle, ctx.targetBundle);
        const rawBefore = customerRawValue(row, "source");
        const rawAfter = customerRawValue(row, "target");
        const parts = customerItemParts(row, ctx.sourceBundle, ctx.targetBundle);
        const targetDetail = parts.target;
        const settingItemDetail = parts.settingItem;
        items.push({
          index: items.length,
          row,
          sectionKey,
          sectionLabel,
          target: customerPlainText(targetDetail, 80),
          settingItem: customerPlainText(settingItemDetail, 80),
          targetDetail,
          settingItemDetail,
          technicalPath: parts.technicalPath,
          item: `${targetDetail} / ${settingItemDetail}`,
          changeType: customerChangeType(row),
          before,
          after,
          rawBefore,
          rawAfter,
          reviewNote: customerReviewNote(row)
        });
      }
    }
    return items;
  }
  function summarizeCustomerRows(rows) {
    const counts = { actual: 0, added: 0, removed: 0, contentChanged: 0, moved: 0 };
    for (const row of rows) {
      if (!row || row._displayOnly || row.type === "same") continue;
      counts.actual += 1;
      if (row.moved || row.type === "moved") counts.moved += 1;
      else if (row.type === "added") counts.added += 1;
      else if (row.type === "removed") counts.removed += 1;
      else counts.contentChanged += 1;
    }
    return counts;
  }
  function customerSectionBreakdown(rows) {
    const grouped = /* @__PURE__ */ new Map();
    for (const row of rows) {
      if (!row || row._displayOnly || row.type === "same") continue;
      const key = sectionKeyOfRow(row);
      const list = grouped.get(key) || [];
      list.push(row);
      grouped.set(key, list);
    }
    return [...grouped].map(([key, list]) => {
      const counts = summarizeCustomerRows(list);
      return [customerSectionLabel(key), counts.added, counts.removed, counts.contentChanged, counts.moved, counts.actual];
    });
  }
  function customerIncomplete(ctx) {
    return !!((ctx.fetchIssues || []).length || (ctx.partialIssues || []).length || customerHasDiffTruncation(ctx.truncation));
  }
  function customerTruncationSectionIncomplete(section) {
    const status = truncationScanStatusOf(section);
    if (status === "partial" || status === "unscanned" || section.partiallyScanned) return true;
    const omitted = section.omittedDiffCount;
    return omitted == null ? status !== "complete" : Number(omitted) > 0;
  }
  function customerHasDiffTruncation(truncation) {
    return hasIncompleteActualDiffTruncation(truncation);
  }
  function customerDateTime(value) {
    const raw = String(value ?? "").trim();
    const normalized = typeof value === "number" ? value : /^\d{11,}$/.test(raw) ? Number(raw) : raw;
    const date = new Date(normalized);
    return Number.isFinite(date.getTime()) ? humanDateTime(date.toISOString()) : "未記録";
  }
  function buildCustomerSummarySheet(ctx, items) {
    const counts = summarizeCustomerRows(ctx.rows || []);
    const incomplete = customerIncomplete(ctx);
    const droppedSame = Number(ctx.truncation?.droppedSame || 0);
    const filtered = ctx.exportMode === "filtered";
    const verdict = incomplete ? "比較未完了" : filtered ? counts.actual ? "絞り込み後：変更あり" : "絞り込み後：掲載対象なし" : counts.actual ? "変更あり" : "変更なし";
    const completeness = incomplete ? "一部未完了" : droppedSame > 0 ? `正常完了（同一証跡 ${droppedSame}件を省略）` : "正常完了（選択範囲）";
    const sourceName = customerAppName(ctx.sourceBundle, "比較元のアプリ");
    const targetName = customerAppName(ctx.targetBundle, "比較先のアプリ");
    const comparedScopes = ctx.scopes?.length ? ctx.scopes : [...new Set(items.map((item) => item.sectionKey))];
    const rows = [
      ["kintone 設定差分確認レポート", "", "", "", "", ""],
      [`比較元
${sourceName}`, "", "→", `比較先
${targetName}`, "", ""],
      ["比較結果", verdict, "比較処理", completeness, "", "変更一覧を開く"],
      [filtered ? "掲載変更件数" : "変更件数", `${counts.actual}件`, "比較日時", customerDateTime(ctx.comparedAt), "", ""],
      ["追加", `${counts.added}件`, "削除", `${counts.removed}件`, "変更", `${counts.contentChanged}件`],
      ["要素の移動", `${counts.moved}件`, "変更一覧の明細", `${items.length}件`, "同一証跡の省略", droppedSame ? `${droppedSame}件（変更判定への影響なし）` : "0件"],
      ["比較した設定領域", customerScopeLabel(comparedScopes), "", "", "", ""],
      ["掲載範囲", ctx.exportMode === "filtered" ? "上記範囲内の一部" : "上記範囲内の全変更", "絞り込み", ctx.exportMode === "filtered" ? "あり" : "なし", "比較から除外", customerComparisonExclusionLabel(ctx)],
      ["分類別件数", "", "", "", "", ""],
      ["分類", "追加", "削除", "変更", "要素の移動", "合計"],
      ...customerSectionBreakdown(ctx.rows || [])
    ];
    const cellStyles = rows.map(() => []);
    cellStyles[0][0] = "title";
    cellStyles[1][0] = "sourceGroup";
    cellStyles[1][2] = "directionArrow";
    cellStyles[1][3] = "targetGroup";
    cellStyles[2][0] = "summaryLabel";
    cellStyles[2][1] = incomplete ? "kpiWarning" : counts.actual ? "kpiChange" : "kpiGood";
    cellStyles[2][2] = "summaryLabel";
    cellStyles[2][3] = incomplete ? "warning" : "info";
    cellStyles[2][5] = "actionLink";
    cellStyles[3][0] = "summaryLabel";
    cellStyles[3][1] = "summaryValue";
    cellStyles[3][2] = "summaryLabel";
    cellStyles[3][3] = "info";
    cellStyles[4] = [
      "changeAdded",
      "metricValueAdded",
      "changeRemoved",
      "metricValueRemoved",
      "changeChanged",
      "metricValueChanged"
    ];
    cellStyles[5][0] = "changeMoved";
    cellStyles[5][1] = "metricValueMoved";
    cellStyles[5][2] = "summaryLabel";
    cellStyles[5][3] = "info";
    cellStyles[5][4] = "summaryLabel";
    cellStyles[5][5] = "info";
    cellStyles[6][0] = "summaryLabel";
    cellStyles[6][1] = "info";
    cellStyles[7][0] = "summaryLabel";
    cellStyles[7][1] = "info";
    cellStyles[7][2] = "summaryLabel";
    cellStyles[7][3] = "info";
    cellStyles[7][4] = "summaryLabel";
    cellStyles[7][5] = "info";
    cellStyles[8] = Array.from({ length: 6 }, () => "sectionHeader");
    for (let index = 10; index < rows.length; index += 1) {
      const alternate = (index - 10) % 2 === 1;
      cellStyles[index][0] = alternate ? "zebra" : "normal";
      for (let column = 1; column < 6; column += 1) {
        cellStyles[index][column] = alternate ? "zebraCenter" : "center";
      }
    }
    return {
      name: "比較概要",
      rows,
      colWidths: [16, 22, 10, 22, 16, 22],
      rowStyles: rows.map(() => "normal"),
      cellStyles,
      headerRow: 10,
      freezeRows: 2,
      materializeEmptyCellsFromRow: 3,
      rowHeights: rows.map((row, index) => {
        if (index === 0) return 42;
        if (index === 1) return 42;
        if (index === 2 || index === 3) return 34;
        if (index === 4 || index === 5) return 38;
        if (index === 6) return readableDiffRowHeight([{ value: row[1], width: 72 }], 58);
        if (index === 7) return readableDiffRowHeight([
          { value: row[1], width: 22 },
          { value: row[3], width: 22 },
          { value: row[5], width: 22 }
        ], 76);
        if (index === 8) return 30;
        return index === 9 ? 32 : 26;
      }),
      merges: ["A1:F1", "A2:B2", "D2:F2", "B7:F7", "A9:F9"],
      internalHyperlinks: [{
        ref: "F3",
        targetSheet: "変更一覧",
        targetCell: "A1",
        tooltip: "変更一覧へ移動"
      }],
      showGridLines: false,
      zoomScale: 100,
      print: {
        orientation: "landscape",
        fitToWidth: 1,
        fitToHeight: 1,
        horizontalCentered: true,
        footer: "&Lkintone 設定差分確認レポート&Rページ &P / &N"
      }
    };
  }
  function buildCustomerListSheet(ctx, items) {
    const sourceName = customerAppName(ctx.sourceBundle, "比較元");
    const targetName = customerAppName(ctx.targetBundle, "比較先");
    const headers = [
      "No.",
      "変更区分",
      "分類",
      "設定対象",
      "変更項目",
      `変更前
${sourceName}`,
      `変更後
${targetName}`,
      "確認すること"
    ];
    const rows = [headers];
    const rowStyles = ["normal"];
    const cellStyles = [[]];
    const rowHeights = [46];
    const changeStyles = {
      "追加": "changeAdded",
      "削除": "changeRemoved",
      "変更": "changeChanged",
      "要素の移動": "changeMoved"
    };
    const internalHyperlinks = [];
    items.forEach((item, index) => {
      rows.push([
        index + 1,
        item.changeType,
        item.sectionLabel,
        item.target,
        item.settingItem,
        item.before,
        item.after,
        item.reviewNote
      ]);
      rowStyles.push("normal");
      const styles = [];
      const alternate = index % 2 === 1;
      const startsCategory = index === 0 || items[index - 1]?.sectionLabel !== item.sectionLabel;
      styles[0] = "hyperlink";
      styles[1] = changeStyles[item.changeType];
      styles[2] = startsCategory ? "category" : alternate ? "zebra" : "normal";
      styles[3] = alternate ? "zebra" : "normal";
      styles[4] = alternate ? "zebra" : "normal";
      styles[5] = item.changeType === "追加" ? "diffAbsent" : "diffBefore";
      styles[6] = item.changeType === "削除" ? "diffAbsent" : "diffAfter";
      styles[7] = "info";
      cellStyles.push(styles);
      internalHyperlinks.push({
        ref: `A${index + 2}`,
        targetSheet: "設定値詳細",
        targetCell: `A${index + 3}`,
        tooltip: "比較元・比較先の状態・型・原文を確認"
      });
      rowHeights.push(readableCustomerRowHeight([
        { value: item.sectionLabel, width: 14 },
        { value: item.target, width: 24 },
        { value: item.settingItem, width: 22 },
        { value: item.before, width: 22 },
        { value: item.after, width: 22 },
        { value: item.reviewNote, width: 28 }
      ], 220));
    });
    return {
      name: "変更一覧",
      rows,
      colWidths: [7, 10, 14, 24, 22, 22, 22, 28],
      rowStyles,
      cellStyles,
      headerRow: 1,
      freezeRows: 1,
      freezeColumns: 5,
      rowHeights,
      styledEmptyCellsAsBlank: true,
      materializeEmptyCellsFromRow: 1,
      internalHyperlinks,
      showGridLines: false,
      zoomScale: 95,
      print: {
        orientation: "landscape",
        fitToWidth: 1,
        fitToHeight: 0,
        repeatRows: { from: 1, to: 1 },
        repeatColumns: { from: 1, to: 5 },
        footer: "&L変更一覧&Rページ &P / &N"
      }
    };
  }
  function buildCustomerValueDetailSheet(ctx, items, continuations) {
    if (!items.length) return null;
    const sourceName = customerAppName(ctx.sourceBundle, "比較元");
    const targetName = customerAppName(ctx.targetBundle, "比較先");
    const continuationByKey = new Map(continuations.map((continuation) => [
      `${continuation.item.index}:${continuation.side}`,
      continuation
    ]));
    const rows = [
      [
        "全差分の状態・型・原文です。非表示、マスキング、省略は行っていません。",
        "",
        "",
        "",
        "",
        "状態・型で不存在／undefined／null／空文字を区別できます。",
        "",
        "長文セルは「長文原文」へ移動します。並べ替え後はNo.で照合してください。",
        "",
        ""
      ],
      [
        "No.",
        "変更区分",
        "分類",
        "設定対象",
        "変更項目",
        `変更前の状態・型
${sourceName}`,
        `変更前の原文
${sourceName}`,
        `変更後の状態・型
${targetName}`,
        `変更後の原文
${targetName}`,
        "変更一覧へ"
      ]
    ];
    const rowStyles = ["normal", "normal"];
    const cellStyles = [[
      "subtitle",
      void 0,
      void 0,
      void 0,
      void 0,
      "info",
      void 0,
      "warning"
    ], []];
    const rowHeights = [64, 52];
    const internalHyperlinks = [];
    const changeStyles = {
      "追加": "changeAdded",
      "削除": "changeRemoved",
      "変更": "changeChanged",
      "要素の移動": "changeMoved"
    };
    items.forEach((item, index) => {
      const beforeContinuation = continuationByKey.get(`${item.index}:source`);
      const afterContinuation = continuationByKey.get(`${item.index}:target`);
      const beforeText = beforeContinuation ? `長文原文へ（${item.rawBefore.text.length}文字・${beforeContinuation.chunks.length}分割）` : item.rawBefore.text;
      const afterText = afterContinuation ? `長文原文へ（${item.rawAfter.text.length}文字・${afterContinuation.chunks.length}分割）` : item.rawAfter.text;
      const settingItemDetail = item.technicalPath ? `${item.settingItemDetail}
内部パス: ${item.technicalPath}` : item.settingItemDetail;
      rows.push([
        item.index + 1,
        item.changeType,
        item.sectionLabel,
        item.targetDetail,
        settingItemDetail,
        item.rawBefore.state,
        beforeText,
        item.rawAfter.state,
        afterText,
        `変更一覧 No.${item.index + 1}へ`
      ]);
      rowStyles.push("normal");
      const startsCategory = index === 0 || items[index - 1]?.sectionLabel !== item.sectionLabel;
      const styles = [];
      styles[0] = "center";
      styles[1] = changeStyles[item.changeType];
      styles[2] = startsCategory ? "category" : index % 2 === 1 ? "zebra" : "normal";
      styles[3] = index % 2 === 1 ? "zebra" : "normal";
      styles[4] = index % 2 === 1 ? "zebra" : "normal";
      styles[5] = item.changeType === "追加" ? "diffAbsent" : "diffBefore";
      styles[6] = beforeContinuation ? "hyperlink" : item.changeType === "追加" ? "diffAbsent" : "diffBefore";
      styles[7] = item.changeType === "削除" ? "diffAbsent" : "diffAfter";
      styles[8] = afterContinuation ? "hyperlink" : item.changeType === "削除" ? "diffAbsent" : "diffAfter";
      styles[9] = "actionLink";
      cellStyles.push(styles);
      rowHeights.push(readableCustomerRowHeight([
        { value: item.targetDetail, width: 24 },
        { value: settingItemDetail, width: 22 },
        { value: item.rawBefore.state, width: 15 },
        { value: beforeText, width: 42 },
        { value: item.rawAfter.state, width: 15 },
        { value: afterText, width: 42 }
      ], 395));
      if (beforeContinuation) {
        internalHyperlinks.push({
          ref: `G${index + 3}`,
          targetSheet: "長文原文",
          targetCell: `A${beforeContinuation.firstRow}`,
          tooltip: `No.${item.index + 1} 変更前の長文原文へ移動`
        });
      }
      if (afterContinuation) {
        internalHyperlinks.push({
          ref: `I${index + 3}`,
          targetSheet: "長文原文",
          targetCell: `A${afterContinuation.firstRow}`,
          tooltip: `No.${item.index + 1} 変更後の長文原文へ移動`
        });
      }
      internalHyperlinks.push({
        ref: `J${index + 3}`,
        targetSheet: "変更一覧",
        targetCell: `A${item.index + 2}`,
        tooltip: `変更一覧 No.${item.index + 1}へ戻る`
      });
    });
    return {
      name: "設定値詳細",
      rows,
      colWidths: [7, 11, 14, 24, 22, 15, 42, 15, 42, 18],
      rowStyles,
      cellStyles,
      headerRow: 2,
      freezeRows: 2,
      freezeColumns: 5,
      rowHeights,
      materializeEmptyCellsFromRow: 2,
      merges: ["A1:E1", "F1:G1", "H1:J1"],
      internalHyperlinks,
      showGridLines: false,
      zoomScale: 85,
      print: {
        orientation: "landscape",
        fitToWidth: 2,
        fitToHeight: 0,
        repeatRows: { from: 2, to: 2 },
        repeatColumns: { from: 1, to: 5 },
        footer: "&L設定値詳細（型・状態・原文）&Rページ &P / &N"
      }
    };
  }
  function buildCustomerLongRawSheet(continuations) {
    if (!continuations.length) return null;
    const rows = [[
      "長い原文を可視セルへ分割しています。参照・対象・比較側・分割No.順に、区切り文字を追加せず連結すると原文表記を完全に復元できます。",
      "",
      "",
      "",
      "",
      "",
      "すべての行・列は表示状態です。数式、外部リンク、別添ファイルは使用していません。",
      ""
    ], [
      "参照",
      "対象",
      "比較側",
      "状態・型",
      "分割No.",
      "文字位置",
      "原文（順に連結）",
      "参照元へ"
    ]];
    const rowStyles = ["normal", "normal"];
    const cellStyles = [[
      "subtitle",
      void 0,
      void 0,
      void 0,
      void 0,
      void 0,
      "info"
    ], []];
    const rowHeights = [54, 42];
    const internalHyperlinks = [];
    for (const continuation of continuations) {
      const difference = continuation.kind === "difference" ? continuation : void 0;
      const coverage = continuation.kind === "coverage" ? continuation : void 0;
      const raw = difference ? difference.side === "source" ? difference.item.rawBefore : difference.item.rawAfter : coverage.issue.raw;
      const reference = difference ? difference.item.index + 1 : `確認範囲 ${coverage.issue.index + 1}`;
      const target = difference ? difference.item.item : coverage.issue.sectionLabel;
      const side = difference ? difference.side === "source" ? "変更前" : "変更後" : coverage.issue.target;
      const returnLabel = difference ? `設定値詳細 No.${difference.item.index + 1}へ` : `確認できなかった範囲 ${coverage.issue.index + 1}へ`;
      let offset = 0;
      continuation.chunks.forEach((chunk, chunkIndex) => {
        const start = offset + 1;
        offset += chunk.length;
        const end = offset;
        const rowNumber = rows.length + 1;
        rows.push([
          reference,
          target,
          side,
          raw.state,
          `${chunkIndex + 1} / ${continuation.chunks.length}`,
          `${start}–${end} / ${raw.text.length}文字`,
          chunk,
          returnLabel
        ]);
        rowStyles.push("normal");
        const alternate = (rowNumber - 3) % 2 === 1;
        cellStyles.push([
          alternate ? "zebraCenter" : "center",
          alternate ? "zebra" : "normal",
          "center",
          "info",
          "center",
          "info",
          difference ? difference.side === "source" ? "diffBefore" : "diffAfter" : "warning",
          "actionLink"
        ]);
        rowHeights.push(readableCustomerRowHeight([
          { value: target, width: 24 },
          { value: chunk, width: CUSTOMER_RAW_CHUNK_COLUMN_WIDTH }
        ], 395));
        internalHyperlinks.push({
          ref: `H${rowNumber}`,
          targetSheet: difference ? "設定値詳細" : "確認できなかった範囲",
          targetCell: `A${(difference ? difference.item.index : coverage.issue.index) + 3}`,
          tooltip: `${returnLabel}戻る`
        });
      });
    }
    return {
      name: "長文原文",
      rows,
      colWidths: [7, 24, 9, 16, 11, 20, CUSTOMER_RAW_CHUNK_COLUMN_WIDTH, 20],
      rowStyles,
      cellStyles,
      headerRow: 2,
      freezeRows: 2,
      freezeColumns: 4,
      rowHeights,
      materializeEmptyCellsFromRow: 2,
      merges: ["A1:F1", "G1:H1"],
      internalHyperlinks,
      showGridLines: false,
      zoomScale: 80,
      print: {
        orientation: "landscape",
        fitToWidth: 2,
        fitToHeight: 0,
        repeatRows: { from: 2, to: 2 },
        repeatColumns: { from: 1, to: 6 },
        footer: "&L長文原文（分割証跡）&Rページ &P / &N"
      }
    };
  }
  function customerIssueSide(side) {
    if (side === "source") return "比較元";
    if (side === "target") return "比較先";
    if (side === "both") return "比較元・比較先";
    return "対象範囲";
  }
  function buildCustomerCoverageIssueItems(ctx) {
    const items = [];
    const add = (sectionLabel, target, status, explanation, rawValue) => {
      const text2 = stringifyForDiff(rawValue);
      items.push({
        index: items.length,
        sectionLabel,
        target,
        status,
        explanation,
        raw: { state: `取得・打切り情報（${text2.length}文字）`, text: text2 }
      });
    };
    for (const issue of ctx.fetchIssues || []) {
      add(
        customerSectionLabel(String(issue.sectionKey || issue.section || "")),
        customerIssueSide(issue.side),
        "取得できませんでした",
        "この範囲は比較結果に含まれていません。再取得して確認してください。",
        issue
      );
    }
    for (const issue of ctx.partialIssues || []) {
      add(
        customerSectionLabel(String(issue.sectionKey || issue.section || "")),
        customerIssueSide(issue.side),
        "一部のみ確認",
        "取得できた範囲だけを比較しています。必要に応じて再取得してください。",
        issue
      );
    }
    if (customerHasDiffTruncation(ctx.truncation)) {
      const incompleteSections = (ctx.truncation?.sections || []).filter(customerTruncationSectionIncomplete);
      const sections = incompleteSections.length ? incompleteSections : [{ section: "比較対象全体", partiallyScanned: true, scanStatus: "partial" }];
      for (const section of sections) {
        const status = truncationScanStatusOf(section);
        add(
          customerSectionLabel(String(section.sectionKey || section.section || "")),
          "件数上限の対象",
          status === "unscanned" ? "未確認" : status === "partial" ? "一部のみ確認" : "表示を一部省略",
          status === "unscanned" ? "この範囲は確認できていません。条件を分けて再比較してください。" : status === "partial" ? "確認できた件数は全体の一部です。条件を分けて再比較してください。" : "範囲の確認は完了していますが、表示を一部省略しています。",
          {
            truncated: ctx.truncation?.truncated,
            actualDiffIncomplete: ctx.truncation?.actualDiffIncomplete,
            diffLimit: ctx.truncation?.diffLimit,
            sameLimit: ctx.truncation?.sameLimit,
            droppedDiff: ctx.truncation?.droppedDiff,
            droppedSame: ctx.truncation?.droppedSame,
            section
          }
        );
      }
    }
    return items;
  }
  function buildCustomerIssueRawContinuations(items, firstDataRow) {
    const continuations = [];
    let firstRow = firstDataRow;
    for (const issue of items) {
      if (!customerRawNeedsContinuation(issue.raw)) continue;
      const chunks = splitCustomerRawText(issue.raw.text);
      continuations.push({ kind: "coverage", issue, chunks, firstRow });
      firstRow += chunks.length;
    }
    return continuations;
  }
  function buildCustomerIssuesSheet(items, continuations) {
    if (!items.length) return null;
    const continuationByIndex = new Map(continuations.map((continuation) => [
      continuation.issue.index,
      continuation
    ]));
    const rows = [
      ["このシートの範囲は比較結果に含まれていないか、一部だけ確認できています。取得・打切り情報はマスキングせず収録しています。", "", "", "", ""],
      ["分類", "対象", "確認状態", "説明", "取得・打切り情報（原文）"]
    ];
    const internalHyperlinks = [];
    items.forEach((item, index) => {
      const continuation = continuationByIndex.get(item.index);
      rows.push([
        item.sectionLabel,
        item.target,
        item.status,
        item.explanation,
        continuation ? `長文原文へ（${item.raw.text.length}文字・${continuation.chunks.length}分割）` : item.raw.text
      ]);
      if (continuation) {
        internalHyperlinks.push({
          ref: `E${index + 3}`,
          targetSheet: "長文原文",
          targetCell: `A${continuation.firstRow}`,
          tooltip: `確認できなかった範囲 ${index + 1} の長文原文へ移動`
        });
      }
    });
    const cellStyles = rows.map((_, index) => index === 0 ? ["warning"] : index === 1 ? [] : ["warning"]);
    items.forEach((item, index) => {
      if (continuationByIndex.has(item.index)) cellStyles[index + 2][4] = "hyperlink";
    });
    return {
      name: "確認できなかった範囲",
      rows,
      colWidths: [24, 20, 22, 48, 60],
      rowStyles: rows.map(() => "normal"),
      cellStyles,
      headerRow: 2,
      freezeRows: 2,
      freezeColumns: 2,
      materializeEmptyCellsFromRow: 2,
      rowHeights: rows.map((row, index) => index < 2 ? index === 0 ? 36 : 30 : readableDiffRowHeight([
        { value: row[0], width: 24 },
        { value: row[1], width: 20 },
        { value: row[2], width: 22 },
        { value: row[3], width: 48 },
        { value: row[4], width: 60 }
      ], 180)),
      merges: ["A1:E1"],
      internalHyperlinks,
      showGridLines: false,
      print: {
        orientation: "landscape",
        fitToWidth: 1,
        fitToHeight: 0,
        repeatRows: { from: 2, to: 2 }
      }
    };
  }
  function buildCustomerDiffXlsxSheets(ctx) {
    const items = buildCustomerDiffItems(ctx);
    const differenceContinuations = buildCustomerRawContinuations(items);
    const issueItems = buildCustomerCoverageIssueItems(ctx);
    const nextLongRawRow = differenceContinuations.reduce(
      (nextRow, continuation) => Math.max(nextRow, continuation.firstRow + continuation.chunks.length),
      3
    );
    const issueContinuations = buildCustomerIssueRawContinuations(issueItems, nextLongRawRow);
    const allContinuations = [...differenceContinuations, ...issueContinuations];
    const sheets = [buildCustomerSummarySheet(ctx, items)];
    const issues = buildCustomerIssuesSheet(issueItems, issueContinuations);
    if (issues) sheets.push(issues);
    sheets.push(buildCustomerListSheet(ctx, items));
    const valueDetails = buildCustomerValueDetailSheet(ctx, items, differenceContinuations);
    if (valueDetails) sheets.push(valueDetails);
    const longRaw = buildCustomerLongRawSheet(allContinuations);
    if (longRaw) sheets.push(longRaw);
    return sheets;
  }
  function buildDiffXlsxSheets(ctx) {
    if (ctx.audience !== "internal") return buildCustomerDiffXlsxSheets(ctx);
    const rows = ctx.rows || [];
    const grouped = groupRowsBySection(rows);
    const fieldModel = buildDiffXlsxFieldModel(ctx);
    const actionableFieldRows = rows.filter((row) => (row.sectionKey || row.section) === "fieldSettings" && !row._displayOnly && row.type !== "same");
    const unstructuredFieldDiffCount = Math.max(0, actionableFieldRows.length - fieldModel.details.length);
    const differenceRefs = buildDifferenceRefs(rows);
    const technicalRefs = buildTechnicalRefs(rows);
    const differenceRefsBySection = /* @__PURE__ */ new Map();
    rows.forEach((row, index) => {
      const key = sectionKeyOfRow(row);
      const refs = differenceRefsBySection.get(key) || [];
      refs.push(differenceRefs[index]);
      differenceRefsBySection.set(key, refs);
    });
    const sheets = [buildSummarySheet(
      ctx,
      grouped,
      fieldModel.summaries.length,
      fieldModel.details.length,
      unstructuredFieldDiffCount
    )];
    const issuesSheet = buildIssuesSheet(ctx);
    if (issuesSheet) sheets.push(issuesSheet);
    if (fieldModel.details.length) {
      sheets.push(
        buildFieldSummarySheet(fieldModel, ctx.sourceBundle, ctx.targetBundle, differenceRefs),
        buildFieldDetailSheet(fieldModel, ctx.sourceBundle, ctx.targetBundle, differenceRefs)
      );
    }
    sheets.push(buildListSheet(
      rows,
      "差分一覧",
      ctx.sourceBundle,
      ctx.targetBundle,
      differenceRefs,
      technicalRefs,
      fieldModel
    ));
    for (const [key, list] of grouped) {
      sheets.push(buildSectionSheet(
        sectionSheetName(key),
        list,
        ctx.sourceBundle,
        ctx.targetBundle,
        differenceRefsBySection.get(key)
      ));
    }
    return sheets;
  }
  function buildDiffXlsxBlob(ctx) {
    return buildXlsxBlob(buildDiffXlsxSheets(ctx));
  }
  function buildDiffXlsxExport(ctx) {
    const blob = buildDiffXlsxBlob(ctx);
    if (ctx.audience !== "internal") {
      const sourceName = customerAppName(ctx.sourceBundle, "比較元");
      const targetName = customerAppName(ctx.targetBundle, "比較先");
      const pairLabel2 = [sourceName, targetName].filter(Boolean).join("_vs_");
      return {
        filename: buildExportFilename("設定差分確認", "xlsx", { appLabel: pairLabel2 }),
        blob
      };
    }
    const srcName = extractAppNameFromBundle(ctx.sourceBundle);
    const tgtName = extractAppNameFromBundle(ctx.targetBundle);
    const src = buildAppFilenameLabel(ctx.sourceBundle?.appId, srcName);
    const tgt = buildAppFilenameLabel(ctx.targetBundle?.appId, tgtName);
    const pairLabel = src && tgt ? `${src}_vs_${tgt}` : src || tgt || "";
    const filename = ctx.filename || buildExportFilename("差分一覧", "xlsx", { appLabel: pairLabel });
    return { filename, blob };
  }
  function runExportDiffXlsx(ctx) {
    const result = buildDiffXlsxExport(ctx);
    downloadBlob(result.filename, result.blob);
    return result;
  }

  // src/entries/diff-lite-ui.ts
  init_path_decoder();
  init_utils();

  // src/tabs/diff-export-standalone.ts
  init_utils();
  init_engine();
  init_export();
  function warningInfoLite(rows, fetchIssues, partialIssues = []) {
    const diffCount = countActualDiffRows(rows || []);
    const issueCount = (fetchIssues || []).length;
    const partialIssueCount = partialIssues.length;
    const total = diffCount + issueCount + partialIssueCount;
    return { threshold: 0, diffCount, issueCount, partialIssueCount, total, exceeded: false };
  }
  function diffPairLabel(sourceBundle, targetBundle) {
    const src = appLabelFromBundle(sourceBundle);
    const tgt = appLabelFromBundle(targetBundle);
    if (src && tgt) return `${src}_vs_${tgt}`;
    return src || tgt || "";
  }
  function buildDiffHtmlStandaloneExport(ctx) {
    const rows = ctx.rows || [];
    const fetchIssues = ctx.fetchIssues || [];
    const partialIssues = ctx.partialIssues || [];
    const scopes = ctx.scopes || [];
    const exportMode = ctx.exportMode || "all";
    const exportLabel = ctx.exportLabel || (exportMode === "all" ? "全差分" : "表示中（フィルタ適用後）");
    const exportContentMode = ctx.exportContentMode === "withCompared" ? "withCompared" : "diffOnly";
    const exportContentLabel = ctx.exportContentLabel || (exportContentMode === "withCompared" ? "比較設定込み（取扱注意）" : "差分行のみ（全設定は未収録）");
    const html = buildDiffHtml(ctx.sourceBundle, ctx.targetBundle, rows, scopes, ctx.ignoreKeys || "", {
      fetchIssues,
      partialIssues,
      exportMode,
      exportLabel,
      exportContentMode,
      exportContentLabel,
      normalizationState: ctx.normalizationPresetState || {},
      warning: warningInfoLite(rows, fetchIssues, partialIssues),
      truncation: ctx.truncation || null
    });
    const filename = buildExportFilename("差分", "html", { appLabel: diffPairLabel(ctx.sourceBundle, ctx.targetBundle) });
    return { filename, html };
  }
  function runExportDiffHtmlStandalone(ctx) {
    const output = buildDiffHtmlStandaloneExport(ctx);
    downloadText(output.filename, output.html, "text/html");
    return output;
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
    function setResult(text2) {
      if (!text2) {
        result.textContent = "";
        result.classList.add("kus-lp__result--empty");
        return;
      }
      result.textContent = text2;
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
  function makeNote(text2, kind = "plain") {
    const n = document.createElement("div");
    n.className = kind === "warn" ? "kus-lp__note--warn" : "kus-lp__note";
    n.textContent = text2;
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

  // src/diff/batch-comparison.ts
  var DEFAULT_MAX_DIFF_BATCH_PAIRS = 50;
  function text(value) {
    return String(value ?? "").trim();
  }
  function numericIdentifier(value) {
    const normalized = text(value);
    return /^\d+$/.test(normalized) ? normalized.replace(/^0+(?=\d)/, "") : normalized;
  }
  function normalizeEndpoint(input) {
    return {
      appId: numericIdentifier(input?.appId),
      guestId: numericIdentifier(input?.guestId),
      preview: input?.preview === true,
      appName: text(input?.appName)
    };
  }
  function endpointWasTouched(endpoint) {
    return !!(endpoint.appId || endpoint.guestId || endpoint.preview || endpoint.appName);
  }
  function endpointDescription(endpoint) {
    const space = endpoint.guestId ? `ゲスト ${endpoint.guestId}` : "通常スペース";
    return `App ${endpoint.appId || "-"} / ${space} / ${endpoint.preview ? "プレビュー" : "運用"}`;
  }
  function buildDiffBatchEndpointKey(endpoint) {
    return JSON.stringify([
      numericIdentifier(endpoint?.appId),
      numericIdentifier(endpoint?.guestId),
      endpoint?.preview === true
    ]);
  }
  function buildDiffBatchPairKey(pair) {
    return JSON.stringify([
      buildDiffBatchEndpointKey(pair.source),
      buildDiffBatchEndpointKey(pair.target)
    ]);
  }
  function prepareDiffBatchPairs(inputs, options = {}) {
    const maxPairs = Math.max(1, Math.floor(options.maxPairs ?? DEFAULT_MAX_DIFF_BATCH_PAIRS));
    const requireOneToOne = options.requireOneToOne !== false;
    const allowSameEndpoint = options.allowSameEndpoint === true;
    const pairs = [];
    const issues = [];
    const pairRows = /* @__PURE__ */ new Map();
    const sourceRows = /* @__PURE__ */ new Map();
    const targetRows = /* @__PURE__ */ new Map();
    for (let index = 0; index < inputs.length; index += 1) {
      const input = inputs[index] || {};
      const rowNumber = Number.isInteger(input.rowNumber) && Number(input.rowNumber) > 0 ? Number(input.rowNumber) : index + 1;
      const source = normalizeEndpoint(input.source);
      const target = normalizeEndpoint(input.target);
      const sourceTouched = endpointWasTouched(source);
      const targetTouched = endpointWasTouched(target);
      if (!sourceTouched && !targetTouched) continue;
      if (!source.appId || !target.appId) {
        const missing = [!source.appId ? "比較元" : "", !target.appId ? "比較先" : ""].filter(Boolean).join("と");
        issues.push({
          code: "incomplete",
          rowNumber,
          side: !source.appId ? "source" : "target",
          message: `ペア ${rowNumber}: ${missing}のアプリIDを入力してください`
        });
        continue;
      }
      const fieldChecks = [
        { value: source.appId, code: "invalid-source-app", side: "source", label: "比較元アプリID" },
        { value: target.appId, code: "invalid-target-app", side: "target", label: "比較先アプリID" },
        { value: source.guestId, code: "invalid-source-guest", side: "source", label: "比較元ゲストID", optional: true },
        { value: target.guestId, code: "invalid-target-guest", side: "target", label: "比較先ゲストID", optional: true }
      ];
      let invalid = false;
      for (const check of fieldChecks) {
        if (check.optional && !check.value || /^\d+$/.test(check.value)) continue;
        invalid = true;
        issues.push({
          code: check.code,
          rowNumber,
          side: check.side,
          message: `ペア ${rowNumber}: ${check.label}は半角数字で入力してください`
        });
      }
      if (invalid) continue;
      const pair = { source, target, rowNumber };
      const sourceKey = buildDiffBatchEndpointKey(source);
      const targetKey = buildDiffBatchEndpointKey(target);
      const pairKey = buildDiffBatchPairKey(pair);
      if (!allowSameEndpoint && sourceKey === targetKey) {
        issues.push({
          code: "same-endpoint",
          rowNumber,
          side: "pair",
          message: `ペア ${rowNumber}: 比較元と比較先が同じ接続先です（${endpointDescription(source)}）`
        });
        continue;
      }
      const duplicatePairRow = pairRows.get(pairKey);
      if (duplicatePairRow != null) {
        issues.push({
          code: "duplicate-pair",
          rowNumber,
          relatedRowNumber: duplicatePairRow,
          side: "pair",
          message: `ペア ${rowNumber}: ペア ${duplicatePairRow} と同じ組み合わせです`
        });
        continue;
      }
      if (requireOneToOne) {
        const duplicateSourceRow = sourceRows.get(sourceKey);
        if (duplicateSourceRow != null) {
          issues.push({
            code: "duplicate-source",
            rowNumber,
            relatedRowNumber: duplicateSourceRow,
            side: "source",
            message: `ペア ${rowNumber}: 比較元がペア ${duplicateSourceRow} と重複しています。1対多比較は「1対多比較」を使ってください`
          });
          continue;
        }
        const duplicateTargetRow = targetRows.get(targetKey);
        if (duplicateTargetRow != null) {
          issues.push({
            code: "duplicate-target",
            rowNumber,
            relatedRowNumber: duplicateTargetRow,
            side: "target",
            message: `ペア ${rowNumber}: 比較先がペア ${duplicateTargetRow} と重複しています。各アプリを1件ずつ対応付けてください`
          });
          continue;
        }
      }
      pairRows.set(pairKey, rowNumber);
      sourceRows.set(sourceKey, rowNumber);
      targetRows.set(targetKey, rowNumber);
      pairs.push(pair);
    }
    if (pairs.length > maxPairs) {
      const firstOverflow = pairs[maxPairs]?.rowNumber || maxPairs + 1;
      issues.push({
        code: "too-many",
        rowNumber: firstOverflow,
        side: "pair",
        message: `一度に比較できるペアは ${maxPairs} 件までです`
      });
    }
    return { pairs: pairs.slice(0, maxPairs), issues };
  }
  async function runSequentialDiffBatch(pairs, runPair, onProgress) {
    const bundleCache = /* @__PURE__ */ new Map();
    const results = [];
    for (let index = 0; index < pairs.length; index += 1) {
      const pair = pairs[index];
      const sourceKey = buildDiffBatchEndpointKey(pair.source);
      const targetKey = buildDiffBatchEndpointKey(pair.target);
      onProgress?.(pair, index, pairs.length);
      try {
        const value = await runPair(pair, {
          importedSourceBundle: bundleCache.get(sourceKey) ?? null,
          importedTargetBundle: bundleCache.get(targetKey) ?? null,
          onSourceBundle: (bundle) => {
            if (bundle != null) bundleCache.set(sourceKey, bundle);
          }
        });
        if (value?.sourceBundle != null) bundleCache.set(sourceKey, value.sourceBundle);
        if (value?.targetBundle != null) bundleCache.set(targetKey, value.targetBundle);
        results.push({ status: "fulfilled", pair, index, value });
      } catch (error) {
        results.push({ status: "rejected", pair, index, error });
      }
    }
    return results;
  }

  // src/diff/batch-folder-import.ts
  init_utils();
  function normalizedFileName(file) {
    return String(file?.name || "").trim();
  }
  function normalizedRelativePath(file, fileName) {
    return String(file?.relativePath || fileName).trim() || fileName;
  }
  function baseName(path) {
    const pieces = String(path || "").replace(/\\/g, "/").split("/");
    return pieces[pieces.length - 1] || "";
  }
  function directoryName(path) {
    const normalized = String(path || "").replace(/\\/g, "/");
    const separator = normalized.lastIndexOf("/");
    return separator >= 0 ? normalized.slice(0, separator) : "";
  }
  function isInsideDirectory(relativePath, directory) {
    const normalizedPath = String(relativePath || "").replace(/\\/g, "/");
    if (!directory) return true;
    return normalizedPath.startsWith(`${directory}/`);
  }
  function normalizeNumericIdentifier(value) {
    const identifier = String(value ?? "").trim();
    return /^\d+$/.test(identifier) ? identifier.replace(/^0+(?=\d)/, "") : identifier;
  }
  function bundlePosition(fileName, bundleIndex, bundleCount) {
    return bundleCount > 1 ? `${fileName} のバンドル ${bundleIndex}` : fileName;
  }
  function isPlainRecord(value) {
    return !!value && typeof value === "object" && !Array.isArray(value);
  }
  function appNameFromGeneratedFileName(fileName, appId) {
    const stem = baseName(fileName).replace(/\.json$/i, "").replace(/(?:_ゲスト\d+)?_(?:プレビュー|本番)$/u, "");
    const match = stem.match(/^(.*)\(app(\d+)\)$/i);
    if (!match || normalizeNumericIdentifier(match[2]) !== appId) return "";
    return String(match[1] || "").trim();
  }
  function rawBundleCandidates(raw, explicit = false) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      return explicit ? [{ value: raw, explicit: true }] : [];
    }
    if (Object.prototype.hasOwnProperty.call(raw, "source") && Object.prototype.hasOwnProperty.call(raw, "target")) {
      return rawBundleCandidates(raw.source, true);
    }
    if (Object.prototype.hasOwnProperty.call(raw, "bundle")) return rawBundleCandidates(raw.bundle, true);
    if (Array.isArray(raw.apps)) return raw.apps.flatMap((candidate) => rawBundleCandidates(candidate, true));
    if (Array.isArray(raw.bundles)) return raw.bundles.flatMap((candidate) => rawBundleCandidates(candidate, true));
    return [{ value: raw, explicit }];
  }
  function rawBundleIssue(candidate) {
    if (!isPlainRecord(candidate)) {
      return { code: "invalid-bundle", detail: "バンドルはオブジェクトで指定してください" };
    }
    const looksLikeBundle = Object.prototype.hasOwnProperty.call(candidate, "appId") || Object.prototype.hasOwnProperty.call(candidate, "sections") || Object.prototype.hasOwnProperty.call(candidate, "preview");
    if (!looksLikeBundle) return null;
    if (!isPlainRecord(candidate.sections)) {
      return { code: "invalid-bundle", detail: "sectionsはオブジェクトで指定してください" };
    }
    if (!Object.prototype.hasOwnProperty.call(candidate, "preview") || typeof candidate.preview !== "boolean") {
      return { code: "invalid-preview", detail: "previewは true または false で指定してください" };
    }
    return null;
  }
  function manifestShapeIssues(raw) {
    if (!isPlainRecord(raw)) return ["ルートはオブジェクトで指定してください"];
    const details = [];
    if (typeof raw.appCount !== "number" || !Number.isInteger(raw.appCount) || raw.appCount < 0) {
      details.push("appCountは0以上の整数で指定してください");
    }
    if (Object.prototype.hasOwnProperty.call(raw, "preview") && typeof raw.preview !== "boolean") {
      details.push("previewは true または false で指定してください");
    }
    if (Object.prototype.hasOwnProperty.call(raw, "targets")) {
      if (!Array.isArray(raw.targets)) {
        details.push("targetsは配列で指定してください");
      } else {
        if (typeof raw.preview !== "boolean") details.push("targetsがある場合はpreviewも指定してください");
        raw.targets.forEach((target, index) => {
          if (!isPlainRecord(target)) {
            details.push(`targets[${index}]はオブジェクトで指定してください`);
            return;
          }
          const appId = normalizeNumericIdentifier(target.appId);
          const guestId = normalizeNumericIdentifier(target.guestId);
          if (!/^\d+$/.test(appId)) details.push(`targets[${index}].appIdは半角数字で指定してください`);
          if (guestId && !/^\d+$/.test(guestId)) details.push(`targets[${index}].guestIdは空欄または半角数字で指定してください`);
        });
      }
    }
    return details;
  }
  function rawAppName(candidate) {
    if (candidate?.bundle) return rawAppName(candidate.bundle);
    return extractAppNameFromBundle(candidate);
  }
  function normalizedAppName(value) {
    return String(value ?? "").normalize("NFKC").trim().toLowerCase().replace(/\s+/g, " ");
  }
  function autoMatchDiffBatchFolderBundles(sourceBundles, targetBundles) {
    const sources = [...sourceBundles || []];
    const targets = [...targetBundles || []];
    const sourceMatches = /* @__PURE__ */ new Map();
    const usedTargets = /* @__PURE__ */ new Set();
    const sourceNameCounts = /* @__PURE__ */ new Map();
    const targetNameIndexes = /* @__PURE__ */ new Map();
    for (let sourceIndex = 0; sourceIndex < sources.length; sourceIndex += 1) {
      const name = normalizedAppName(sources[sourceIndex].appName);
      if (!name) continue;
      sourceNameCounts.set(name, (sourceNameCounts.get(name) || 0) + 1);
    }
    for (let targetIndex = 0; targetIndex < targets.length; targetIndex += 1) {
      const name = normalizedAppName(targets[targetIndex].appName);
      if (!name) continue;
      const indexes = targetNameIndexes.get(name) || [];
      indexes.push(targetIndex);
      targetNameIndexes.set(name, indexes);
    }
    for (let sourceIndex = 0; sourceIndex < sources.length; sourceIndex += 1) {
      const name = normalizedAppName(sources[sourceIndex].appName);
      const candidateTargets = name ? targetNameIndexes.get(name) : void 0;
      if (!name || sourceNameCounts.get(name) !== 1 || candidateTargets?.length !== 1) continue;
      const targetIndex = candidateTargets[0];
      if (usedTargets.has(targetIndex)) continue;
      sourceMatches.set(sourceIndex, { targetIndex, matchKind: "app-name" });
      usedTargets.add(targetIndex);
    }
    const remainingSourceIndexes = sources.map((_, index) => index).filter((index) => !sourceMatches.has(index));
    const remainingTargetIndexes = targets.map((_, index) => index).filter((index) => !usedTargets.has(index));
    const sourceIdCounts = /* @__PURE__ */ new Map();
    const targetIdIndexes = /* @__PURE__ */ new Map();
    for (const sourceIndex of remainingSourceIndexes) {
      const appId = sources[sourceIndex].appId;
      sourceIdCounts.set(appId, (sourceIdCounts.get(appId) || 0) + 1);
    }
    for (const targetIndex of remainingTargetIndexes) {
      const appId = targets[targetIndex].appId;
      const indexes = targetIdIndexes.get(appId) || [];
      indexes.push(targetIndex);
      targetIdIndexes.set(appId, indexes);
    }
    for (const sourceIndex of remainingSourceIndexes) {
      const appId = sources[sourceIndex].appId;
      const candidateTargets = targetIdIndexes.get(appId);
      if (sourceIdCounts.get(appId) !== 1 || candidateTargets?.length !== 1) continue;
      const targetIndex = candidateTargets[0];
      sourceMatches.set(sourceIndex, { targetIndex, matchKind: "app-id" });
      usedTargets.add(targetIndex);
    }
    const rows = sources.map((source, sourceIndex) => {
      const match = sourceMatches.get(sourceIndex);
      if (!match) return { source, target: null, matchKind: "unpaired" };
      return {
        source,
        target: targets[match.targetIndex],
        matchKind: match.matchKind
      };
    });
    targets.forEach((target, targetIndex) => {
      if (!usedTargets.has(targetIndex)) rows.push({ source: null, target, matchKind: "unpaired" });
    });
    return rows;
  }
  function parseDiffBatchFolderImport(files) {
    const bundles = [];
    const issues = [];
    const endpoints = /* @__PURE__ */ new Map();
    const manifests = [];
    let jsonFileCount = 0;
    let ignoredFileCount = 0;
    let manifestFileCount = 0;
    for (const file of files || []) {
      const fileName = normalizedFileName(file);
      const relativePath = normalizedRelativePath(file, fileName);
      const effectiveName = baseName(relativePath) || fileName;
      if (effectiveName.toLowerCase() === "manifest.json") {
        manifestFileCount += 1;
        try {
          const raw2 = JSON.parse(String(file?.text ?? ""));
          const shapeIssues = manifestShapeIssues(raw2);
          if (!shapeIssues.length) {
            manifests.push({ fileName, relativePath, directory: directoryName(relativePath), raw: raw2 });
          } else {
            issues.push({
              code: "manifest-mismatch",
              fileName,
              relativePath,
              message: `${relativePath}: manifest.json の形式が不正です（${shapeIssues.join("、")}）`
            });
          }
        } catch (error) {
          const detail = error instanceof Error && error.message ? `: ${error.message}` : "";
          issues.push({
            code: "manifest-mismatch",
            fileName,
            relativePath,
            message: `${relativePath}: manifest.json のJSON形式が不正です${detail}`
          });
        }
        continue;
      }
      if (!/\.json$/i.test(effectiveName)) {
        ignoredFileCount += 1;
        continue;
      }
      jsonFileCount += 1;
      let raw;
      try {
        raw = JSON.parse(String(file?.text ?? ""));
      } catch (error) {
        const detail = error instanceof Error && error.message ? `: ${error.message}` : "";
        issues.push({
          code: "invalid-json",
          fileName,
          relativePath,
          message: `${relativePath}: JSONの形式が不正です${detail}`
        });
        continue;
      }
      const picked = [];
      const candidates = rawBundleCandidates(raw);
      const issueCountBeforeCandidates = issues.length;
      for (let candidateIndex = 0; candidateIndex < candidates.length; candidateIndex += 1) {
        const candidateEntry = candidates[candidateIndex];
        const candidate = candidateEntry.value;
        const candidateIssue = rawBundleIssue(candidate);
        if (candidateIssue) {
          issues.push({
            code: candidateIssue.code,
            fileName,
            relativePath,
            bundleIndex: candidateIndex + 1,
            message: `${bundlePosition(fileName || relativePath, candidateIndex + 1, candidates.length)}: ${candidateIssue.detail}`
          });
          continue;
        }
        try {
          const candidateName = rawAppName(candidate);
          const candidateBundles = pickAllSettingsBundles(candidate);
          candidateBundles.forEach((candidateBundle) => {
            picked.push({ bundle: candidateBundle, appName: candidateName });
          });
        } catch {
          if (candidateEntry.explicit || candidates.length > 1) {
            issues.push({
              code: "invalid-bundle",
              fileName,
              relativePath,
              bundleIndex: candidateIndex + 1,
              message: `${bundlePosition(fileName || relativePath, candidateIndex + 1, candidates.length)}: バンドル形式が不正です`
            });
          }
        }
      }
      if (!picked.length) {
        if (issues.length === issueCountBeforeCandidates) {
          issues.push({
            code: "no-bundle",
            fileName,
            relativePath,
            message: `${relativePath}: アプリ設定バンドルが見つかりません`
          });
        }
        continue;
      }
      for (let index = 0; index < picked.length; index += 1) {
        const sourceBundle = picked[index].bundle;
        const bundleIndex = index + 1;
        const appId = normalizeNumericIdentifier(sourceBundle?.appId);
        const guestId = normalizeNumericIdentifier(sourceBundle?.guestId);
        const preview = sourceBundle?.preview === true;
        const position = bundlePosition(fileName || relativePath, bundleIndex, picked.length);
        if (!/^\d+$/.test(appId)) {
          issues.push({
            code: "invalid-app-id",
            fileName,
            relativePath,
            bundleIndex,
            message: `${position}: appIdは半角数字で指定してください`
          });
          continue;
        }
        if (guestId && !/^\d+$/.test(guestId)) {
          issues.push({
            code: "invalid-guest-id",
            fileName,
            relativePath,
            bundleIndex,
            message: `${position}: guestIdは空欄または半角数字で指定してください`
          });
          continue;
        }
        const appName = picked[index].appName || (picked.length === 1 ? appNameFromGeneratedFileName(effectiveName, appId) : "");
        const bundle = {
          ...sourceBundle,
          appId,
          guestId,
          preview,
          ...appName ? { appName } : {}
        };
        const endpointKey = buildDiffBatchEndpointKey({ appId, guestId, preview });
        const imported = {
          bundle,
          appId,
          guestId,
          preview,
          appName: appName || extractAppNameFromBundle(bundle),
          endpointKey,
          fileName,
          relativePath,
          bundleIndex
        };
        const duplicate = endpoints.get(endpointKey);
        if (duplicate) {
          issues.push({
            code: "duplicate-endpoint",
            fileName,
            relativePath,
            bundleIndex,
            endpointKey,
            relatedFileName: duplicate.fileName,
            relatedRelativePath: duplicate.relativePath,
            relatedBundleIndex: duplicate.bundleIndex,
            message: `${position}: App ${appId} / ${guestId ? `Guest ${guestId}` : "通常スペース"} / ${preview ? "プレビュー" : "運用"} が ${bundlePosition(duplicate.fileName || duplicate.relativePath, duplicate.bundleIndex, 2)} と重複しています`
          });
        } else {
          endpoints.set(endpointKey, imported);
        }
        bundles.push(imported);
      }
    }
    for (const manifest of manifests) {
      const directoryBundles = bundles.filter((item) => isInsideDirectory(item.relativePath, manifest.directory));
      const details = [];
      const manifestAppCount = Number(manifest.raw?.appCount);
      if (Number.isInteger(manifestAppCount) && manifestAppCount >= 0 && manifestAppCount !== directoryBundles.length) {
        details.push(`appCount ${manifestAppCount} に対してJSON内のバンドルは ${directoryBundles.length} 件`);
      }
      if (Array.isArray(manifest.raw?.targets)) {
        const manifestPreview = manifest.raw?.preview === true;
        const expectedKeys = manifest.raw.targets.map((target) => buildDiffBatchEndpointKey({
          appId: normalizeNumericIdentifier(target?.appId),
          guestId: normalizeNumericIdentifier(target?.guestId),
          preview: manifestPreview
        })).sort();
        const actualKeys = directoryBundles.map((item) => item.endpointKey).sort();
        if (JSON.stringify(expectedKeys) !== JSON.stringify(actualKeys)) {
          details.push("targets の appId / guestId / preview とバンドル群が一致しません");
        }
      } else if (typeof manifest.raw?.preview === "boolean") {
        const mismatchedPreview = directoryBundles.some((item) => item.preview !== manifest.raw.preview);
        if (mismatchedPreview) details.push(`preview=${String(manifest.raw.preview)} と異なるバンドルがあります`);
      }
      if (details.length) {
        issues.push({
          code: "manifest-mismatch",
          fileName: manifest.fileName,
          relativePath: manifest.relativePath,
          message: `${manifest.relativePath}: manifest.json と同じフォルダの設定JSONが一致しません（${details.join("、")}）`
        });
      }
    }
    return {
      bundles,
      issues,
      jsonFileCount,
      ignoredFileCount,
      manifestFileCount
    };
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
  var FACT_LABEL = {
    added: "比較先にのみ存在",
    removed: "比較元にのみ存在",
    changed: "内容が異なる",
    moved: "並び順が異なる",
    same: "内容が一致"
  };
  var RESULT_PAGE_SIZE = 200;
  var XLSX_EXPORT_COOLDOWN_MS = 400;
  var VALUE_PREVIEW_MAX_LINES = 8;
  var VALUE_PREVIEW_MAX_CHARS = 280;
  var RESULT_CSS_ID2 = "kus-diff-lite-result-styles";
  var RESULT_CSS2 = `
.kus-dl-result{font:13px/1.58 ui-monospace,Menlo,monospace;color:#10253f}
.kus-dl-overview{font-family:-apple-system,"Segoe UI",sans-serif;border:1px solid #d8e0ea;border-radius:16px;background:#fff;margin-bottom:12px;overflow:hidden;box-shadow:0 16px 34px -30px rgba(15,37,63,.48)}
.kus-dl-overview:focus{outline:3px solid #2563eb;outline-offset:2px}
.kus-dl-overview__direction{display:grid;grid-template-columns:minmax(0,1fr) auto minmax(0,1fr);align-items:center;gap:10px;padding:10px 12px;background:#f8fafc;border-bottom:1px solid #e2e8f0}
.kus-dl-side{min-width:0}
.kus-dl-side--target{text-align:right}
.kus-dl-side__role{display:block;color:#64748b;font-size:11px;font-weight:700;letter-spacing:.04em}
.kus-dl-side__name{display:block;color:#0f172a;font-size:12px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.kus-dl-side__env{display:block;color:#64748b;font-size:11px}
.kus-dl-overview__arrow{color:#2563eb;font-size:18px;font-weight:800}
.kus-dl-verdict{padding:10px 12px;border-bottom:1px solid #e2e8f0;background:#eff6ff;color:#1e3a8a}
.kus-dl-verdict--same{background:#f0fdf4;color:#166534}
.kus-dl-verdict--warn{background:#fff7ed;color:#9a3412}
.kus-dl-verdict strong{display:block;font-size:13px;margin-bottom:2px}
.kus-dl-verdict span{font-size:11px;line-height:1.55}
.kus-dl-metrics{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:6px;padding:10px 12px}
.kus-dl-metric{appearance:none;position:relative;overflow:hidden;border:1px solid #d8e0ea;border-radius:12px;background:#fff;color:#334155;padding:10px 8px;text-align:center;font:inherit}
.kus-dl-metric::before{content:"";position:absolute;inset:0 auto 0 0;width:3px;background:#94a3b8}
.kus-dl-metric[data-kus-dl-type-filter="added"]::before{background:#15803d}
.kus-dl-metric[data-kus-dl-type-filter="removed"]::before{background:#b91c1c}
.kus-dl-metric[data-kus-dl-type-filter="changed"]::before{background:#b45309}
.kus-dl-metric[data-kus-dl-type-filter="moved"]::before{background:#7c3aed}
button.kus-dl-metric{cursor:pointer}
button.kus-dl-metric:hover{border-color:#93c5fd;background:#eff6ff}
.kus-dl-metric__num{display:block;color:#10253f;font-size:20px;font-weight:800;font-variant-numeric:tabular-nums;line-height:1.15}
.kus-dl-metric__label{display:block;margin-top:3px;font-size:12px;font-weight:700}
.kus-dl-metric__hint{display:block;color:#64748b;font-size:11px;font-weight:400}
.kus-dl-section-nav{display:flex;flex-wrap:wrap;gap:5px;padding:0 12px 10px}
.kus-dl-section-nav__label{width:100%;color:#64748b;font-size:11px;font-weight:700}
.kus-dl-section-jump{border:1px solid #cbd5e1;border-radius:999px;background:#fff;color:#334155;padding:3px 8px;font:600 11px/1.4 -apple-system,Segoe UI,sans-serif;cursor:pointer}
.kus-dl-section-jump:hover{border-color:#60a5fa;background:#eff6ff;color:#1d4ed8}
.kus-dl-alert{margin:0 12px 10px;padding:8px 10px;border:1px solid #fdba74;border-radius:7px;background:#fff7ed;color:#9a3412;font:600 11px/1.55 -apple-system,Segoe UI,sans-serif}
.kus-dl-legend{padding:0 12px 10px;color:#64748b;font:11px/1.5 -apple-system,Segoe UI,sans-serif}
.kus-dl-result__summary{margin:0 2px 7px;font-family:-apple-system,Segoe UI,sans-serif;font-size:11px;color:#64748b;display:flex;flex-wrap:wrap;gap:6px 12px}
.kus-dl-sticky{position:sticky;top:0;z-index:4;margin:0 0 10px;padding:0 0 4px;background:linear-gradient(180deg,rgba(248,250,252,.995) 86%,rgba(248,250,252,0));backdrop-filter:blur(7px)}
.kus-dl-contextbar{display:grid;grid-template-columns:minmax(0,1fr) auto minmax(0,1fr);align-items:stretch;gap:7px;padding:6px;border:1px solid #cbd5e1;border-radius:10px;background:#e2e8f0;box-shadow:0 2px 10px rgba(15,23,42,.08);font-family:-apple-system,Segoe UI,sans-serif}
.kus-dl-contextlane{min-width:0;padding:6px 9px;border:1px solid #e2e8f0;border-radius:7px;background:#fff;box-shadow:inset 3px 0 0 #64748b}
.kus-dl-contextlane--after{box-shadow:inset 3px 0 0 #2563eb}
.kus-dl-contextlane__role{display:block;margin-bottom:1px;color:#64748b;font-size:11px;font-weight:900;letter-spacing:.08em}
.kus-dl-contextlane--after .kus-dl-contextlane__role{color:#1d4ed8}
.kus-dl-contextlane__name{display:block;overflow:hidden;color:#0f172a;font-size:11px;font-weight:800;line-height:1.35;text-overflow:ellipsis;white-space:nowrap}
.kus-dl-progress{align-self:center;min-width:72px;padding:4px 7px;text-align:center;color:#1e3a8a;font-variant-numeric:tabular-nums}
.kus-dl-progress__numbers{display:flex;align-items:baseline;justify-content:center;gap:3px;line-height:1}
.kus-dl-progress__current{color:#1d4ed8;font-size:18px;font-weight:900}
.kus-dl-progress__total{color:#475569;font-size:11px;font-weight:800}
.kus-dl-progress__label{display:block;margin-top:3px;color:#64748b;font-size:11px;font-weight:800;letter-spacing:.04em}
.kus-dl-result__summary strong{color:#0f172a}
.kus-dl-section{border:1px solid #d8e0ea;border-radius:14px;margin-bottom:12px;overflow:hidden;background:#fff;box-shadow:0 12px 28px -28px rgba(15,37,63,.55)}
.kus-dl-section>summary{padding:11px 13px;background:linear-gradient(180deg,#fff,#f4f7fa);font:700 13px/1.45 -apple-system,"Segoe UI",sans-serif;cursor:pointer;list-style:none;display:flex;align-items:center;gap:7px}
.kus-dl-section>summary::-webkit-details-marker{display:none}
.kus-dl-section>summary::before{content:"▸";display:inline-block;margin-right:6px;color:#64748b;transition:transform .15s}
.kus-dl-section[open]>summary::before{transform:rotate(90deg)}
.kus-dl-section__heading{display:flex;align-items:baseline;gap:7px;min-width:100px}
.kus-dl-section__label{color:#0f172a;font-weight:800}
.kus-dl-section__count{color:#64748b;font-size:11px;font-weight:500}
.kus-dl-section__breakdown{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:4px;margin-left:auto}
.kus-dl-section__stat{padding:1px 6px;border:1px solid #dbe3ee;border-radius:999px;background:#fff;color:#475569;font-size:11px;font-weight:700;white-space:nowrap}
.kus-dl-section__stat--added{border-color:#bbf7d0;color:#166534}
.kus-dl-section__stat--removed{border-color:#fecaca;color:#991b1b}
.kus-dl-section__stat--changed{border-color:#bfdbfe;color:#1d4ed8}
.kus-dl-section__stat--moved{border-color:#fde68a;color:#92400e}
.kus-dl-section__body{display:grid;gap:9px;padding:10px;background:#f4f7fa}
.kus-dl-row{border:1px solid #d8e0ea;border-left:4px solid transparent;border-radius:12px;padding:12px 13px;background:linear-gradient(180deg,#fff,#fbfdff);font-family:-apple-system,"Segoe UI",sans-serif;font-size:13px;box-shadow:0 10px 24px -24px rgba(15,37,63,.58);transition:background-color .12s,border-color .12s,box-shadow .12s}
.kus-dl-row--added{border-left-color:#22c55e}
.kus-dl-row--removed{border-left-color:#ef4444}
.kus-dl-row--changed{border-left-color:#3b82f6}
.kus-dl-row--moved{border-left-color:#f59e0b}
.kus-dl-row--same{border-left-color:#cbd5e1}
.kus-dl-row:focus,.kus-dl-row.is-current{outline:2px solid #2563eb;outline-offset:1px;background:#f8fbff;box-shadow:0 4px 14px rgba(37,99,235,.13)}
.kus-dl-row__head{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:start;margin-bottom:7px}
.kus-dl-row__identity{min-width:0}
.kus-dl-row__headline{display:flex;flex-wrap:wrap;align-items:center;gap:5px 6px}
.kus-dl-row__title{min-width:150px;flex:1;color:#10253f;font-size:15px;font-weight:800;line-height:1.45}
.kus-dl-row__subtitle{margin:4px 0 0;color:#64748b;font-size:12px;line-height:1.55}
.kus-dl-row__context{display:flex;flex-wrap:wrap;align-items:center;gap:4px;margin:0 0 6px;color:#64748b}
.kus-dl-row__chip{display:inline-flex;align-items:center;border-radius:999px;background:#e2e8f0;color:#334155;padding:1px 6px;font-size:11px}
.kus-dl-row__technical{margin:0 0 7px;color:#64748b;font:11px/1.4 -apple-system,Segoe UI,sans-serif}
.kus-dl-row__technical>summary{display:inline-flex;align-items:center;gap:4px;padding:1px 4px;border-radius:4px;cursor:pointer;list-style:none;color:#64748b;font-weight:700}
.kus-dl-row__technical>summary::-webkit-details-marker{display:none}
.kus-dl-row__technical>summary::before{content:'›';font-size:12px;transition:transform .12s}
.kus-dl-row__technical[open]>summary::before{transform:rotate(90deg)}
.kus-dl-row__raw{display:block;margin-top:3px;padding:5px 7px;border:1px dashed #cbd5e1;border-radius:5px;background:#f8fafc;color:#475569;font:11px/1.45 ui-monospace,Menlo,monospace;word-break:break-all}
.kus-dl-row__cols{display:grid;grid-template-columns:1fr 1fr;gap:9px;font-family:ui-monospace,Menlo,monospace;font-size:12px}
.kus-dl-row__mobile-toggle{display:none;width:100%;margin:0 0 7px;align-items:center;justify-content:center;border:1px solid #94a3b8;border-radius:7px;background:#f8fafc;color:#1e3a8a;padding:7px 9px;font:700 11px/1.4 -apple-system,Segoe UI,sans-serif;cursor:pointer}
.kus-dl-value{position:relative;min-width:0}
.kus-dl-pre{box-sizing:border-box;width:100%;margin:0;padding:7px 8px;background:#f8fafc;border-radius:6px;border:1px solid #e2e8f0;white-space:pre-wrap;word-break:break-word;overflow:auto}
.kus-dl-value.is-collapsed .kus-dl-pre{max-height:126px;overflow:hidden}
.kus-dl-value__footer{display:flex;align-items:center;justify-content:space-between;gap:8px;min-height:24px;padding:3px 2px 0;color:#64748b;font:11px/1.3 -apple-system,Segoe UI,sans-serif}
.kus-dl-value__toggle{margin-left:auto;padding:2px 6px;border:1px solid #cbd5e1;border-radius:5px;background:#fff;color:#1d4ed8;font:700 11px/1.35 -apple-system,Segoe UI,sans-serif;cursor:pointer}
.kus-dl-value__toggle:hover{border-color:#60a5fa;background:#eff6ff}
.kus-dl-pre.del{background:#fef2f2;border-color:#fecaca;color:#7f1d1d}
.kus-dl-pre.add{background:#f0fdf4;border-color:#bbf7d0;color:#14532d}
.kus-dl-pre.empty{color:#64748b;font-style:italic}
.kus-dl-badge{display:inline-block;padding:1px 6px;border-radius:4px;font:600 11px/1.4 -apple-system,Segoe UI,sans-serif;letter-spacing:.02em}
.kus-dl-badge--added{background:#dcfce7;color:#166534}
.kus-dl-badge--removed{background:#fee2e2;color:#991b1b}
.kus-dl-badge--changed{background:#dbeafe;color:#1d4ed8}
.kus-dl-badge--moved{background:#fef3c7;color:#92400e}
.kus-dl-badge--same{background:#e2e8f0;color:#475569}
.kus-dl-empty{padding:14px;text-align:center;color:#64748b;font-size:12px;background:#f8fafc;border-radius:8px}
.kus-dl-flag{display:inline-block;padding:1px 6px;border-radius:999px;background:#f5f3ff;color:#5b21b6;border:1px solid #c4b5fd;font:500 11px/1.4 -apple-system,Segoe UI,sans-serif}
.kus-dl-row__action{border:1px solid #cbd5e1;border-radius:6px;background:#fff;color:#475569;padding:3px 7px;font:600 11px/1.4 -apple-system,Segoe UI,sans-serif;cursor:pointer;white-space:nowrap}
.kus-dl-row__action:hover{border-color:#f59e0b;background:#fffbeb;color:#92400e}
.kus-dl-reviewbar{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin:5px 0 0;padding:5px 6px;border:1px solid #bfdbfe;border-radius:8px;background:rgba(239,246,255,.98);font:600 11px/1.4 -apple-system,Segoe UI,sans-serif}
.kus-dl-reviewbar__nav,.kus-dl-reviewbar__tools,.kus-dl-reviewbar__filters{display:flex;flex-wrap:wrap;align-items:center;gap:4px}
.kus-dl-reviewbar__filters{min-width:120px;flex:1}
.kus-dl-filter-empty{padding:2px 5px;color:#64748b;font-weight:600}
.kus-dl-filterchip{display:inline-flex;align-items:center;gap:5px;padding:2px 7px;border:1px solid #93c5fd;border-radius:999px;background:#fff;color:#1e3a8a;font:700 11px/1.35 -apple-system,Segoe UI,sans-serif;cursor:pointer;max-width:180px}
.kus-dl-filterchip>span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.kus-dl-filterchip::after{content:'×';color:#64748b;font-size:11px}
.kus-dl-filterchip:hover{border-color:#2563eb;background:#dbeafe}
.kus-dl-filterchip--all{border-style:dashed;color:#475569}
.kus-dl-navbtn{border:1px solid #93c5fd;border-radius:6px;background:#fff;color:#1d4ed8;padding:3px 7px;font:700 11px/1.4 -apple-system,Segoe UI,sans-serif;cursor:pointer;white-space:nowrap}
.kus-dl-navbtn:disabled{opacity:.45;cursor:not-allowed}
.kus-dl-result--compact .kus-dl-row{padding:6px 7px;font-size:10.5px}
.kus-dl-result--compact .kus-dl-row__context{display:none}
.kus-dl-result--compact .kus-dl-pre{padding:4px 6px;font-size:10px}
.kus-dl-result--compact .kus-dl-value.is-collapsed .kus-dl-pre{max-height:92px}
.kus-dl-result--compact .kus-dl-section__body{padding:3px}
.kus-dl-result--comfortable .kus-dl-row{padding:9px 10px}
.kus-dl-result--comfortable .kus-dl-value.is-collapsed .kus-dl-pre{max-height:164px}
.kus-dl-result--stacked .kus-dl-row__cols{grid-template-columns:1fr}
.kus-dl-result--stacked .kus-dl-pre::before{content:attr(data-side-label);display:block;margin:0 0 5px;color:#64748b;font:700 11px/1.3 -apple-system,Segoe UI,sans-serif;letter-spacing:.04em}
.kus-dl-result mark.diff-char-del{background:#fecaca;color:#7f1d1d;border-radius:2px;padding:0 1px;text-decoration:line-through}
.kus-dl-result mark.diff-char-add{background:#bbf7d0;color:#14532d;border-radius:2px;padding:0 1px}
.kus-dl-target-field{display:flex;flex:1 1 180px;min-width:180px;flex-direction:column}
.kus-dl-target-field .kus-lp__input{width:100%;box-sizing:border-box}
.kus-dl-target-name{min-height:1.35em;margin-top:3px;color:#64748b;font-size:11px;line-height:1.35;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.kus-dl-target-name:not(.kus-dl-target-name--empty)::before{content:'アプリ名: ';color:#334155;font-weight:600}
.kus-dl-more{display:flex;justify-content:center;padding:8px 0 2px}
.kus-dl-multi{width:100%;border-collapse:collapse;font:11px/1.45 -apple-system,Segoe UI,sans-serif}
.kus-dl-table-scroll{box-sizing:border-box;width:100%;max-width:100%;overflow-x:auto;overscroll-behavior-inline:contain;-webkit-overflow-scrolling:touch}
.kus-dl-table-scroll:focus-visible{outline:3px solid #2563eb;outline-offset:2px}
.kus-dl-table-scroll>.kus-dl-multi{min-width:720px}
.kus-dl-table-scroll>.kus-dl-multi--pairs{min-width:880px}
.kus-dl-multi caption{text-align:left;color:#475569;font-weight:700;padding:0 0 6px}
.kus-dl-multi th,.kus-dl-multi td{padding:6px 7px;border-bottom:1px solid #e2e8f0;text-align:right;vertical-align:top}
.kus-dl-multi th:first-child,.kus-dl-multi td:first-child{text-align:left}
.kus-dl-multi thead th{position:sticky;top:0;background:#f8fafc;color:#475569;font-size:11px}
.kus-dl-multi__warn{color:#9a3412;font-weight:700}
.kus-dl-multi__ok{color:#166534;font-weight:700}
.kus-dl-multi--pairs th:nth-child(2),.kus-dl-multi--pairs td:nth-child(2),.kus-dl-multi--pairs th:nth-child(3),.kus-dl-multi--pairs td:nth-child(3),.kus-dl-multi--pairs th:nth-child(5),.kus-dl-multi--pairs td:nth-child(5),.kus-dl-multi--pairs th:nth-child(6),.kus-dl-multi--pairs td:nth-child(6){text-align:left}
.kus-dl-pair-breakdown{display:block;min-width:165px}
.kus-dl-pair-breakdown strong,.kus-dl-pair-breakdown small{display:block}
.kus-dl-pair-breakdown small{margin-top:2px;color:#64748b;white-space:nowrap}
.kus-dl-pair-save{display:flex;gap:4px;justify-content:flex-end}
.kus-dl-pair-save .kus-lp__btn{min-height:36px!important;padding:5px 7px!important;font-size:10.5px}

/* Diff Lite only: human-first review workspace. Shared litePanelTheme is intentionally untouched. */
#kus-diff-lite.kus-lp{width:min(1000px,calc(100vw - 24px));max-height:min(96vh,1040px);top:max(8px,2vh);right:max(8px,1vw);border-radius:18px;background:#f4f7fa;box-shadow:0 28px 80px -32px rgba(15,37,63,.52)}
#kus-diff-lite .kus-lp__hero{position:relative;padding:17px 22px;background:linear-gradient(135deg,#0f2742 0%,#173b63 72%,#24517f 100%)}
#kus-diff-lite .kus-lp__hero::after{content:"";position:absolute;left:0;right:0;bottom:0;height:3px;background:linear-gradient(90deg,#60a5fa,#22d3ee,#818cf8)}
#kus-diff-lite .kus-lp__badge-row{display:none}
#kus-diff-lite .kus-lp__body{padding:18px 20px 22px}
#kus-diff-lite [hidden]{display:none!important}
#kus-diff-lite .kus-lp__hint{margin-bottom:16px;padding:0 2px;border:0;background:transparent;color:#475569}
#kus-diff-lite button,#kus-diff-lite input:not([type="checkbox"]):not([type="file"]),#kus-diff-lite select{min-height:44px}
#kus-diff-lite input[type="file"]{min-height:44px;padding:8px 0;box-sizing:border-box}
#kus-diff-lite .kus-lp__check{min-height:44px}
#kus-diff-lite button:focus-visible,#kus-diff-lite input:focus-visible,#kus-diff-lite select:focus-visible,#kus-diff-lite textarea:focus-visible,#kus-diff-lite summary:focus-visible{outline:3px solid #2563eb;outline-offset:2px}
.kus-dl-workflow{display:grid;gap:16px}
.kus-dl-step{min-width:0;padding:20px;border:1px solid #d8e0ea;border-radius:16px;background:#fff;box-shadow:0 16px 36px -32px rgba(15,37,63,.62)}
.kus-dl-step__header{display:flex;align-items:flex-start;gap:11px;margin:0 0 15px;padding:0 0 13px;border-bottom:1px solid #e2e8f0;font-family:-apple-system,Segoe UI,sans-serif}
.kus-dl-step__number{display:inline-flex;flex:0 0 30px;width:30px;height:30px;align-items:center;justify-content:center;border-radius:10px;background:linear-gradient(145deg,#16395f,#2563eb);color:#fff;font-size:12px;font-weight:800;box-shadow:0 6px 14px -8px rgba(37,99,235,.8)}
.kus-dl-step__header h2{margin:0;color:#10253f;font-size:16px;line-height:1.35}
.kus-dl-step__header p{margin:3px 0 0;color:#64748b;font-size:11.5px;line-height:1.5}
.kus-dl-step__empty{margin:0;padding:18px;border:1px dashed #cbd5e1;border-radius:9px;background:#f8fafc;color:#64748b;text-align:center;font-size:12px}
.kus-dl-step>.kus-lp__card,.kus-dl-disclosure__body>.kus-lp__card{margin:0;border:0;box-shadow:none;background:transparent;padding:0}
.kus-dl-target-card>.kus-lp__card-head,.kus-dl-filter-disclosure .kus-lp__card-head,.kus-dl-output-disclosure .kus-lp__card-head,.kus-dl-step[data-kus-dl-step="review"]>.kus-lp__card>.kus-lp__card-head{display:none}
.kus-dl-mode{display:inline-flex;gap:4px;margin:0 0 12px;padding:3px;border:1px solid #cbd5e1;border-radius:10px;background:#f1f5f9}
.kus-dl-mode .kus-lp__btn{min-width:118px;border-color:transparent;background:transparent;box-shadow:none;color:#475569}
.kus-dl-mode .kus-lp__btn.is-active{background:#fff;border-color:#cbd5e1;color:#10253f;box-shadow:0 1px 2px rgba(15,23,42,.08)}
.kus-dl-pair-editor{display:grid;gap:12px}
.kus-dl-pair-editor__intro{display:flex;flex-wrap:wrap;align-items:flex-start;justify-content:space-between;gap:8px;padding:11px 13px;border:1px solid #bfdbfe;border-radius:10px;background:#eff6ff;color:#1e3a8a;font-family:-apple-system,Segoe UI,sans-serif}
.kus-dl-pair-editor__intro strong{display:block;color:#10253f;font-size:13px}
.kus-dl-pair-editor__intro span{display:block;margin-top:2px;color:#475569;font-size:11px;line-height:1.5}
.kus-dl-pair-count{flex:0 0 auto;padding:3px 8px;border:1px solid #bfdbfe;border-radius:999px;background:#fff;color:#1e3a8a;font-size:11px;font-weight:800;font-variant-numeric:tabular-nums}
.kus-dl-pair-list{display:grid;gap:10px}
.kus-dl-pair-row{position:relative;display:grid;grid-template-columns:34px minmax(0,1fr) 38px minmax(0,1fr) minmax(84px,auto);gap:9px;align-items:stretch;padding:12px;border:1px solid #cbd5e1;border-radius:12px;background:#fff;font-family:-apple-system,Segoe UI,sans-serif;box-shadow:0 12px 28px -28px rgba(15,37,63,.7)}
.kus-dl-pair-row.is-invalid{border-color:#f59e0b;background:#fffbeb;box-shadow:0 0 0 2px rgba(245,158,11,.12)}
.kus-dl-pair-row__number{display:flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:9px;background:#e2e8f0;color:#334155;font-size:12px;font-weight:900;font-variant-numeric:tabular-nums}
.kus-dl-pair-side{min-width:0;padding:10px;border:1px solid #d8e0ea;border-left:4px solid #475569;border-radius:10px;background:#f8fafc}
.kus-dl-pair-side--target{border-left-color:#2563eb;background:#eff6ff}
.kus-dl-pair-side__role{display:block;margin:0 0 7px;color:#475569;font-size:11px;font-weight:850;letter-spacing:.05em}
.kus-dl-pair-side__fields{display:grid;grid-template-columns:minmax(125px,1fr) minmax(82px,.55fr);gap:7px;align-items:start}
.kus-dl-pair-side__fields .kus-dl-target-field{min-width:0}
.kus-dl-pair-side__fields .kus-lp__input{width:100%;box-sizing:border-box}
.kus-dl-pair-field-label{display:block;margin:0 0 4px;color:#475569;font-size:10.5px;font-weight:750;line-height:1.35}
.kus-dl-pair-guest-field{min-width:0}
.kus-dl-pair-side__preview{grid-column:1/-1;min-height:34px!important}
.kus-dl-pair-arrow{display:flex;align-items:center;justify-content:center;color:#2563eb;font-size:20px;font-weight:900}
.kus-dl-pair-actions{display:flex;flex-direction:column;gap:5px;justify-content:center}
.kus-dl-pair-actions .kus-lp__btn{width:100%;min-height:36px!important;padding:6px 8px!important;font-size:11px}
.kus-dl-pair-row__error{grid-column:2/-1;margin:0;padding:7px 9px;border:1px solid #fdba74;border-radius:7px;background:#fff7ed;color:#9a3412;font-size:11px;font-weight:700;line-height:1.5}
.kus-dl-pair-row__match{grid-column:2/-1;margin:0;padding:6px 9px;border:1px solid #bfdbfe;border-radius:7px;background:#eff6ff;color:#1e3a8a;font-size:11px;font-weight:700;line-height:1.5}
.kus-dl-pair-side__file{display:block;margin:8px 0 0;padding:6px 8px;border:1px solid #cbd5e1;border-radius:7px;background:#fff;color:#475569;font-size:10.5px;line-height:1.45;overflow-wrap:anywhere}
.kus-dl-pair-toolbar{display:flex;flex-wrap:wrap;gap:7px;align-items:center}
.kus-dl-pair-folder{display:grid;gap:10px;padding:13px;border:1px solid #93c5fd;border-radius:12px;background:#f8fbff;font-family:-apple-system,Segoe UI,sans-serif}
.kus-dl-pair-folder__head strong{display:block;color:#10253f;font-size:13px}
.kus-dl-pair-folder__head span{display:block;margin-top:3px;color:#475569;font-size:11px;line-height:1.55}
.kus-dl-pair-folder__grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}
.kus-dl-pair-folder__side{min-width:0;padding:10px;border:1px solid #cbd5e1;border-left:4px solid #475569;border-radius:9px;background:#fff}
.kus-dl-pair-folder__side--target{border-left-color:#2563eb;background:#eff6ff}
.kus-dl-pair-folder__side strong{display:block;margin-bottom:7px;color:#334155;font-size:11px}
.kus-dl-pair-folder__actions{display:flex;flex-wrap:wrap;gap:6px}
.kus-dl-pair-folder__summary{margin:7px 0 0;color:#64748b;font-size:10.5px;line-height:1.5;overflow-wrap:anywhere}
.kus-dl-pair-folder__error{margin:0;padding:8px 10px;border:1px solid #fecaca;border-radius:8px;background:#fef2f2;color:#991b1b;font-size:10.5px;font-weight:700;line-height:1.5;overflow-wrap:anywhere}
.kus-dl-pair-folder__mapping{border:1px solid #cbd5e1;border-radius:9px;background:#fff;overflow:hidden}
.kus-dl-pair-folder__mapping-scroll{max-width:100%;overflow-x:auto}
.kus-dl-pair-folder__mapping table{width:100%;min-width:700px;border-collapse:collapse;font-size:10.5px}
.kus-dl-pair-folder__mapping th,.kus-dl-pair-folder__mapping td{padding:7px 8px;border-bottom:1px solid #e2e8f0;text-align:left;vertical-align:middle}
.kus-dl-pair-folder__mapping th{background:#f1f5f9;color:#475569;font-weight:800}
.kus-dl-pair-folder__mapping select{box-sizing:border-box;width:100%;min-height:38px;border:1px solid #94a3b8;border-radius:7px;background:#fff;color:#0f172a}
.kus-dl-pair-folder__app{display:block;color:#10253f;font-weight:800}
.kus-dl-pair-folder__meta{display:block;margin-top:2px;color:#64748b;line-height:1.4;overflow-wrap:anywhere}
.kus-dl-pair-folder__badge{display:inline-flex;padding:3px 6px;border-radius:999px;background:#fee2e2;color:#991b1b;font-size:10px;font-weight:850;white-space:nowrap}
.kus-dl-pair-folder__badge--app-name{background:#dcfce7;color:#166534}
.kus-dl-pair-folder__badge--app-id,.kus-dl-pair-folder__badge--position{background:#fef3c7;color:#92400e}
.kus-dl-pair-folder__badge--manual{background:#dbeafe;color:#1e40af}
.kus-dl-pair-folder__foot{display:grid;grid-template-columns:minmax(0,1fr) auto auto;align-items:center;gap:7px;padding:9px 10px;background:#f8fafc}
.kus-dl-pair-folder__review{min-width:0;color:#475569;font-size:11px;font-weight:700;line-height:1.5}
.kus-dl-pair-folder__unused{margin:0;padding:8px 10px;border-top:1px solid #e2e8f0;color:#9a3412;font-size:10.5px;line-height:1.5}
.kus-dl-pair-bulk{margin:0;border:1px solid #cbd5e1;border-radius:9px;background:#f8fafc}
.kus-dl-pair-bulk>summary{display:flex;align-items:center;min-height:44px;padding:8px 11px;box-sizing:border-box;cursor:pointer;color:#334155;font-size:12px;font-weight:750}
.kus-dl-pair-bulk__body{display:grid;gap:8px;padding:10px;border-top:1px solid #e2e8f0}
.kus-dl-pair-bulk__body textarea{box-sizing:border-box;width:100%}
.kus-dl-pair-editor .kus-as__result{background:#fff}
.kus-dl-direction-grid{display:grid;grid-template-columns:minmax(0,1fr) auto minmax(0,1fr);align-items:stretch;gap:10px}
.kus-dl-app-card{min-width:0;padding:16px;border:1px solid #d8e0ea;border-left:4px solid #475569;border-radius:14px;background:#f8fafc}
.kus-dl-app-card--target{border-color:#d8e0ea;border-left-color:#2563eb;background:#eff6ff}
.kus-dl-app-card__role{margin:0 0 2px;color:#64748b;font-size:11px;font-weight:800;letter-spacing:.09em;text-transform:uppercase}
.kus-dl-app-card h3{margin:0;color:#10253f;font-size:14px}
.kus-dl-app-card__help{margin:3px 0 13px;color:#64748b;font-size:11px}
.kus-dl-app-card .kus-lp__row{align-items:flex-start;margin-bottom:7px}
.kus-dl-app-card .kus-lp__label{width:100%;min-width:0;color:#475569;font-size:11px}
.kus-dl-app-card .kus-lp__input{flex:1;min-width:100px;width:auto;box-sizing:border-box}
.kus-dl-app-card .kus-dl-target-field{min-width:140px}
.kus-dl-swap{align-self:center;justify-self:center;width:88px;padding:8px!important;white-space:normal;line-height:1.3}
.kus-dl-target-list{display:grid;gap:7px;max-height:220px;margin-top:8px;padding-right:2px;overflow-y:auto}
.kus-dl-multi-controls{margin-top:12px!important;padding-top:10px;border-top:1px solid #e2e8f0}
.kus-dl-common-exclusion{margin-top:12px;padding:12px 14px;border:1px solid #bfdbfe;border-left:4px solid #2563eb;border-radius:10px;background:#eff6ff;color:#10253f;font-family:-apple-system,Segoe UI,sans-serif}
.kus-dl-common-exclusion__heading{margin:0 0 3px;font-size:12px;font-weight:850;letter-spacing:.04em}
.kus-dl-common-exclusion__description{margin:0 0 4px;color:#334155;font-size:11.5px;line-height:1.55}
.kus-dl-common-exclusion .kus-lp__check{min-height:40px!important;color:#10253f;font-size:13px;font-weight:750}
.kus-dl-common-exclusion__note{margin:3px 0 0;color:#475569;font-size:11px;line-height:1.55}
.kus-dl-run-row{margin:13px 0 0!important}
.kus-dl-run-row .kus-lp__btn{width:100%}
.kus-dl-step>.kus-lp__status{margin:10px 0 0;min-height:44px;box-sizing:border-box}
.kus-dl-disclosure{margin-top:12px;border:1px solid #cbd5e1;border-radius:10px;background:#fff;overflow:hidden}
.kus-dl-disclosure>summary{display:flex;align-items:center;justify-content:space-between;gap:10px;min-height:44px;box-sizing:border-box;padding:9px 13px;cursor:pointer;list-style:none;color:#10253f;font-weight:750}
.kus-dl-disclosure>summary::-webkit-details-marker{display:none}
.kus-dl-disclosure>summary::after{content:'＋';margin-left:auto;color:#64748b;font-size:16px}
.kus-dl-disclosure[open]>summary::after{content:'−'}
.kus-dl-disclosure>summary small{color:#64748b;font-size:11px;font-weight:500;text-align:right}
.kus-dl-disclosure__body{display:grid;gap:12px;padding:13px;border-top:1px solid #e2e8f0;background:#f8fafc}
.kus-dl-disclosure__body .kus-lp__details{margin-bottom:0;background:#fff}
.kus-dl-overview{border-color:#cbd5e1;border-radius:10px;box-shadow:none}
.kus-dl-overview__direction{background:#fff}
.kus-dl-overview__arrow{color:#16395f}
.kus-dl-verdict{position:relative;padding:12px 14px 12px 18px;border-left:5px solid #2563eb;background:#f8fafc;color:#10253f}
.kus-dl-verdict--same{border-left-color:#64748b;background:#f8fafc;color:#334155}
.kus-dl-verdict--warn{border-left-color:#b45309;background:#fffbeb;color:#78350f}
.kus-dl-verdict__eyebrow{display:block;margin-bottom:2px;color:inherit;font-size:11px!important;font-weight:800;letter-spacing:.08em;text-transform:uppercase}
.kus-dl-alert{position:relative;margin:9px 12px 0;padding:9px 10px 9px 32px;border-color:#d6a85c;background:#fffbeb;color:#713f12;font-weight:550}
.kus-dl-alert::before{content:'!';position:absolute;left:10px;top:9px;display:inline-flex;width:15px;height:15px;align-items:center;justify-content:center;border:1px solid currentColor;border-radius:50%;font-size:9px;font-weight:900}
.kus-dl-alert[role="note"]{border-color:#cbd5e1;background:#f8fafc;color:#475569}
.kus-dl-alert[role="note"]::before{content:'i'}
.kus-dl-metrics{grid-template-columns:repeat(auto-fit,minmax(108px,1fr));gap:6px;margin:10px 12px;padding:0}
.kus-dl-metric{min-width:0!important;min-height:66px!important;border:1px solid #dbe3ec;border-radius:8px;background:#fff}
button.kus-dl-metric:hover{background:#f1f5f9;border-color:#e2e8f0}
.kus-dl-section-jump,.kus-dl-filterchip,.kus-dl-navbtn,.kus-dl-value__toggle,.kus-dl-row__action{min-height:44px!important}
.kus-dl-section__stat,.kus-dl-section__stat--added,.kus-dl-section__stat--removed,.kus-dl-section__stat--changed,.kus-dl-section__stat--moved{border-color:#cbd5e1;background:#fff;color:#475569}
.kus-dl-section__body{background:#f4f7fa}
.kus-dl-section>summary{min-height:44px;box-sizing:border-box}
.kus-dl-row{border-left-color:#64748b;background:#fff;transition:none}
.kus-dl-row--added{border-left-color:#15803d}
.kus-dl-row--removed{border-left-color:#b91c1c}
.kus-dl-row--changed{border-left-color:#b45309}
.kus-dl-row--moved{border-left-color:#7c3aed}
.kus-dl-row--same{border-left-color:#94a3b8}
.kus-dl-badge{display:inline-flex;align-items:center;gap:4px;border:1px solid #cbd5e1;background:#f8fafc;color:#334155;font-weight:750}
.kus-dl-badge--added{border-color:#bbf7d0;background:#ecfdf5;color:#15803d}
.kus-dl-badge--removed{border-color:#fecaca;background:#fef2f2;color:#b91c1c}
.kus-dl-badge--changed{border-color:#fde68a;background:#fffbeb;color:#b45309}
.kus-dl-badge--moved{border-color:#ddd6fe;background:#f5f3ff;color:#7c3aed}
.kus-dl-badge--same{border-color:#cbd5e1;background:#f8fafc;color:#64748b}
.kus-dl-badge--added::before{content:'＋'}
.kus-dl-badge--removed::before{content:'−'}
.kus-dl-badge--changed::before{content:'≠'}
.kus-dl-badge--moved::before{content:'↕'}
.kus-dl-badge--same::before{content:'＝'}
.kus-dl-badge__type{font-weight:850}
.kus-dl-badge__fact{display:inline-flex;align-items:center;color:#475569;font-weight:650}
.kus-dl-badge__fact::before{content:'｜';margin-right:4px;color:#94a3b8}
.kus-dl-flag{border-color:#cbd5e1;background:#f8fafc;color:#475569}
.kus-dl-row__action:hover{border-color:#94a3b8;background:#f1f5f9;color:#10253f}
.kus-dl-pre,.kus-dl-pre.del,.kus-dl-pre.add{border-color:#dbe3ec;background:#f8fafc;color:#1e293b}
.kus-dl-value__label{display:block;margin:0 0 4px;color:#475569;font:800 11px/1.3 -apple-system,Segoe UI,sans-serif;letter-spacing:.06em}
.kus-dl-presence{grid-column:1/-1;display:grid;grid-template-columns:minmax(150px,.38fr) minmax(0,1fr);gap:10px;align-items:start;padding:10px;border:1px dashed #9fb2c8;border-radius:8px;background:#f8fafc}
.kus-dl-presence>p{margin:1px 0;color:#334155;font-family:-apple-system,Segoe UI,sans-serif}
.kus-dl-presence>p strong,.kus-dl-presence>p span{display:block}
.kus-dl-presence>p strong{color:#10253f;font-size:12px}
.kus-dl-presence>p span{margin-top:3px;color:#64748b;font-size:11px}
.kus-dl-row__technical>summary{min-height:44px;box-sizing:border-box}
.kus-dl-row__raw>span{display:block;margin-bottom:2px;color:#64748b;font-family:-apple-system,Segoe UI,sans-serif;font-size:11px;font-weight:700}
.kus-dl-conditions strong,.kus-dl-conditions span{display:block}
.kus-dl-conditions strong{margin-bottom:2px;color:#334155}
.kus-dl-completion-row{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin:8px 0 0!important}
.kus-dl-completion-row .kus-lp__btn{width:100%}
.kus-dl-reviewbar{border-color:#cbd5e1;background:#f8fafc}
.kus-dl-contextbar{border-color:#cbd5e1;background:rgba(226,232,240,.94);box-shadow:0 12px 30px -22px rgba(15,37,63,.72)}
.kus-dl-contextlane,.kus-dl-contextlane--after{box-shadow:none;border-left:4px solid #475569}
.kus-dl-contextlane--after{border-left-color:#2563eb}
.kus-dl-filter-disclosure,.kus-dl-output-disclosure{margin:0 0 12px}
.kus-dl-filter-disclosure .kus-lp__card,.kus-dl-output-disclosure .kus-lp__card{padding:0}
.kus-dl-result mark.diff-char-del{background:#e2e8f0;color:#1e293b;text-decoration:line-through;text-decoration-thickness:2px}
.kus-dl-result mark.diff-char-add{background:#dbeafe;color:#1e3a8a;text-decoration:underline;text-decoration-thickness:2px}
@media(max-width:768px){
  #kus-diff-lite.kus-lp{width:calc(100vw - 12px);max-height:calc(100vh - 12px);top:6px;right:6px;border-radius:10px}
  #kus-diff-lite .kus-lp__hero{padding:13px 14px}
  #kus-diff-lite .kus-lp__body{padding:13px 12px 18px}
  .kus-dl-step{padding:14px 12px}
  .kus-dl-direction-grid{grid-template-columns:1fr}
  .kus-dl-mode{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));width:100%;box-sizing:border-box}
  .kus-dl-mode .kus-lp__btn{min-width:0;padding-inline:7px!important}
  .kus-dl-pair-row{grid-template-columns:30px minmax(0,1fr) 30px minmax(0,1fr);padding:10px;gap:7px}
  .kus-dl-pair-actions{grid-column:2/-1;flex-direction:row;justify-content:flex-end}
  .kus-dl-pair-actions .kus-lp__btn{width:auto}
  .kus-dl-pair-row__error{grid-column:2/-1}
  .kus-dl-swap{width:100%;max-width:none}
  .kus-dl-row__cols{grid-template-columns:1fr}
  .kus-dl-presence{grid-template-columns:1fr}
  .kus-dl-sticky{position:sticky;top:0;z-index:6;margin-inline:-2px;padding:2px 2px 5px;background:linear-gradient(180deg,rgba(244,247,250,.98) 84%,rgba(244,247,250,0));backdrop-filter:blur(10px)}
  .kus-dl-disclosure>summary{align-items:flex-start;flex-wrap:wrap}
  .kus-dl-disclosure>summary small{width:100%;padding-right:28px;text-align:left}
}
@media(max-width:640px){
  .kus-dl-pair-folder__grid{grid-template-columns:1fr}
  .kus-dl-pair-folder__mapping-scroll{overflow-x:visible}
  .kus-dl-pair-folder__mapping table{display:block;min-width:0}
  .kus-dl-pair-folder__mapping thead{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
  .kus-dl-pair-folder__mapping tbody{display:grid;gap:8px;padding:8px}
  .kus-dl-pair-folder__mapping tr{display:grid;border:1px solid #cbd5e1;border-radius:9px;background:#fff;overflow:hidden}
  .kus-dl-pair-folder__mapping td{display:grid;grid-template-columns:88px minmax(0,1fr);gap:8px;align-items:center;padding:8px;border-bottom:1px solid #e2e8f0}
  .kus-dl-pair-folder__mapping td:last-child{border-bottom:0}
  .kus-dl-pair-folder__mapping td::before{content:attr(data-label);color:#64748b;font-size:10px;font-weight:800;line-height:1.35}
  .kus-dl-pair-folder__mapping select{min-width:0}
  .kus-dl-pair-folder__foot{grid-template-columns:1fr}
  .kus-dl-pair-folder__foot .kus-lp__btn{width:100%}
  .kus-dl-pair-row{grid-template-columns:30px minmax(0,1fr);gap:7px}
  .kus-dl-pair-side{grid-column:2}
  .kus-dl-pair-arrow{grid-column:2;min-height:24px;transform:rotate(90deg)}
  .kus-dl-pair-actions{grid-column:2;justify-content:stretch}
  .kus-dl-pair-actions .kus-lp__btn{flex:1}
  .kus-dl-pair-row__error{grid-column:2}
  .kus-dl-pair-side__fields{grid-template-columns:1fr}
  .kus-dl-pair-side__preview{grid-column:1}
  .kus-dl-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}
  .kus-dl-row__mobile-toggle{display:inline-flex;min-height:44px}
  .kus-dl-row__cols{display:none;grid-template-columns:1fr}
  .kus-dl-row__cols.is-expanded{display:grid}
  .kus-dl-contextbar{grid-template-columns:minmax(0,1fr) auto minmax(0,1fr);gap:4px;padding:4px}
  .kus-dl-contextlane{padding:5px 6px}
  .kus-dl-contextlane--before{grid-column:1;grid-row:1}
  .kus-dl-contextlane--after{grid-column:3;grid-row:1}
  .kus-dl-contextlane__role{font-size:9px;letter-spacing:.04em}
  .kus-dl-contextlane__name{font-size:10px}
  .kus-dl-progress{grid-column:2;grid-row:1;min-width:42px;padding:2px 3px}
  .kus-dl-progress__current{font-size:15px}
  .kus-dl-progress__total{font-size:9px}
  .kus-dl-progress__label{margin-top:2px;font-size:9px;letter-spacing:0}
  .kus-dl-reviewbar{display:grid;grid-template-columns:1fr;padding:4px}
  .kus-dl-reviewbar__nav{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));width:100%;gap:5px}
  .kus-dl-reviewbar__nav .kus-dl-navbtn{width:100%;min-width:0}
  .kus-dl-reviewbar__tools,.kus-dl-reviewbar__filters{display:none}
  .kus-dl-section>summary{align-items:flex-start;flex-wrap:wrap}
  .kus-dl-section__breakdown{width:100%;justify-content:flex-start;margin-left:20px}
  .kus-dl-row__head{grid-template-columns:minmax(0,1fr) auto;gap:8px}
  .kus-dl-row__action{justify-self:end;align-self:start}
  .kus-dl-pre::before{content:attr(data-side-label);display:block;margin:0 0 4px;color:#64748b;font:700 11px/1.3 -apple-system,Segoe UI,sans-serif;letter-spacing:.03em}
  .kus-dl-value__label+.kus-dl-pre::before{content:none;display:none}
  .kus-dl-table-scroll>.kus-dl-multi{white-space:nowrap}
}
@media(max-width:420px){
  .kus-dl-mode{display:grid;grid-template-columns:1fr 1fr;width:100%;box-sizing:border-box}
  .kus-dl-mode .kus-lp__btn{min-width:0;padding-inline:6px}
  .kus-dl-overview__direction{grid-template-columns:1fr;gap:5px}
  .kus-dl-side--target{text-align:left}
  .kus-dl-overview__arrow{transform:rotate(90deg);justify-self:start;margin-left:12px}
  .kus-dl-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}
  .kus-dl-step__header{gap:8px}
  .kus-dl-completion-row{grid-template-columns:1fr}
  .kus-dl-row{padding:11px 10px}
  .kus-dl-row__action{padding-inline:8px!important}
}
@media(prefers-reduced-motion:reduce){
  #kus-diff-lite.kus-lp{animation:none}
  #kus-diff-lite *{scroll-behavior:auto!important;transition:none!important}
  .kus-dl-section>summary::before{transition:none}
}
@media(prefers-contrast:more){
  .kus-dl-row,.kus-dl-section,.kus-dl-pre,.kus-dl-reviewbar,.kus-dl-contextbar,.kus-dl-contextlane{border-color:#334155}
  .kus-dl-row__raw,.kus-dl-filter-empty,.kus-dl-pre.empty{color:#1e293b}
}
@media(forced-colors:active){
  .kus-dl-row,.kus-dl-contextlane{forced-color-adjust:auto;border-left-width:5px}
  .kus-dl-filterchip,.kus-dl-value__toggle,.kus-dl-navbtn{border:1px solid ButtonText}
}
`;
  function ensureResultStyles() {
    if (document.getElementById(RESULT_CSS_ID2)) return;
    const st = document.createElement("style");
    st.id = RESULT_CSS_ID2;
    st.textContent = RESULT_CSS2;
    document.head.appendChild(st);
  }
  function normalizeLiteHtmlExportContentMode(mode) {
    return mode === "withCompared" ? "withCompared" : "diffOnly";
  }
  function getLiteHtmlExportContentLabel(mode) {
    return normalizeLiteHtmlExportContentMode(mode) === "withCompared" ? "比較設定込み（取扱注意）" : "差分行のみ（全設定は未収録）";
  }
  function buildLiteDiffHtmlContext(cache, rows, exportMode, exportLabel, exportContentMode = "diffOnly") {
    const safeContentMode = normalizeLiteHtmlExportContentMode(exportContentMode);
    return {
      ...cache,
      rows,
      exportMode,
      exportLabel,
      exportContentMode: safeContentMode,
      exportContentLabel: getLiteHtmlExportContentLabel(safeContentMode)
    };
  }
  function buildLiteDiffXlsxContext(cache, rows, exportMode, exportLabel, filterDescription) {
    return {
      audience: "customer",
      rows,
      fetchIssues: cache.fetchIssues || [],
      partialIssues: cache.partialIssues || [],
      truncation: cache.truncation || null,
      sourceBundle: cache.sourceBundle,
      targetBundle: cache.targetBundle,
      scopes: cache.scopes,
      ignoreKeys: cache.ignoreKeys,
      normalizationPresetState: cache.normalizationPresetState || {},
      comparedAt: cache.comparedAt,
      exportMode,
      exportLabel,
      filterDescription: filterDescription || (exportMode === "filtered" ? "画面で表示中の結果（詳細条件は未記録）" : "フィルターなし（比較結果の全件）"),
      exportContentMode: "diffOnly"
    };
  }
  function buildLiteDiffFilterDescription(input) {
    const exactValue = (value, label) => label && label !== value ? `${label} [${value}]` : value;
    const section = String(input.section || "").trim();
    const type = String(input.type || "").trim();
    const keyword = String(input.keyword || "").trim();
    const parts = [
      section ? `セクション: ${exactValue(section, String(input.sectionLabel || "").trim())}` : "",
      type ? `変更種別: ${exactValue(type, String(input.typeLabel || "").trim())}` : "",
      keyword ? `検索: ${keyword}` : ""
    ].filter(Boolean);
    return parts.length ? `画面の絞り込み: ${parts.join(" / ")}` : "画面で表示中の結果（フィルターなし）";
  }
  var rowSearchCache = /* @__PURE__ */ new WeakMap();
  var SEARCH_VALUE_TEXT_LIMIT = 8e3;
  var SEARCH_NESTED_STRING_LIMIT = 2e3;
  function safeDecodeRow(row) {
    try {
      return decodeRow(row);
    } catch {
      return null;
    }
  }
  function summarizeLiteDiffRows(rows) {
    const counts = { total: rows.length, actual: 0, added: 0, removed: 0, changed: 0, moved: 0, same: 0, displayOnly: 0 };
    for (const row of rows) {
      if (row._displayOnly) {
        counts.displayOnly += 1;
        continue;
      }
      if (row.type === "same") {
        counts.same += 1;
        continue;
      }
      counts.actual += 1;
      if (row.type === "added") counts.added += 1;
      else if (row.type === "removed") counts.removed += 1;
      else {
        counts.changed += 1;
        if (row.moved) counts.moved += 1;
      }
    }
    return counts;
  }
  function contentChangedCount(counts) {
    return Math.max(0, counts.changed - counts.moved);
  }
  function isIncompleteLiteDiff(result) {
    return hasIncompleteActualDiffTruncation(result?.truncation) || (result?.fetchIssues || []).length > 0 || (result?.partialIssues || []).length > 0;
  }
  function rowSearchText(row) {
    const cached = rowSearchCache.get(row);
    if (cached !== void 0) return cached;
    const safe = (v) => {
      try {
        if (v === void 0) return "";
        const text3 = JSON.stringify(v, (_key, value) => typeof value === "string" && value.length > SEARCH_NESTED_STRING_LIMIT ? `${value.slice(0, SEARCH_NESTED_STRING_LIMIT)}…` : value);
        return String(text3 || "").slice(0, SEARCH_VALUE_TEXT_LIMIT);
      } catch {
        return String(v).slice(0, SEARCH_VALUE_TEXT_LIMIT);
      }
    };
    const decoded = safeDecodeRow(row);
    const text2 = [
      row.section || "",
      row.sectionKey || "",
      row.path || "",
      row.label || "",
      row.reasonSummary || "",
      safe(row.left),
      safe(row.right),
      decoded?.oneLineSummary || "",
      ...decoded?.searchableTokens || []
    ].join("\n").toLowerCase();
    rowSearchCache.set(row, text2);
    return text2;
  }
  function buildLiteDiffRowKey(row) {
    const stateRenameIdentity = row._stateRenameNotice ? stableStringify({
      id: row.renameCandidate?.id || "",
      left: row.left,
      right: row.right
    }) : "";
    const seed = [
      row.sectionKey || "",
      row.type || "",
      row.moved ? "moved" : "",
      row.path || "",
      row.arrayKey || "",
      stableStringify(row.arrayKeyValue),
      stateRenameIdentity
    ].join("");
    let hash = 2166136261;
    for (let i = 0; i < seed.length; i++) {
      hash ^= seed.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return `diff-${(hash >>> 0).toString(36)}`;
  }
  function rowMatchesFilters(row, filters) {
    if (filters.section && row.sectionKey !== filters.section) return false;
    if (filters.type) {
      if (filters.type === "moved") {
        if (!row.moved) return false;
      } else if (filters.type === "changed") {
        if (row.type !== "changed" || row.moved) return false;
      } else if (row.type !== filters.type) {
        return false;
      }
    }
    if (filters.keyword && !rowSearchText(row).includes(filters.keyword)) return false;
    return true;
  }
  function summarizeLiteIgnoreRules(text2) {
    const tokens = String(text2 || "").split(/[\n\r,、，;；]+/).map((token) => token.trim()).filter(Boolean);
    const unique = [...new Map(tokens.map((token) => {
      const exactPath = decodeExactIgnorePathRule(token);
      return [exactPath == null ? token.toLowerCase() : `path:${exactPath}`, token];
    })).values()];
    const representedPath = (token) => decodeExactIgnorePathRule(token) ?? token;
    const isPathRule = (token) => {
      if (decodeExactIgnorePathRule(token) != null) return true;
      const normalized = token.toLowerCase();
      return normalized.includes(".") || normalized.includes("[") || SCOPE_OPTS.some(([scope]) => scope.toLowerCase() === normalized);
    };
    return {
      total: unique.length,
      pathRules: unique.filter(isPathRule).length,
      wildcardRules: unique.filter((token) => decodeExactIgnorePathRule(token) == null && token.includes("*")).length,
      positionalRules: unique.filter((token) => /\[\d+\]/.test(representedPath(token))).length,
      contextualRules: unique.filter((token) => isPathRule(token) || decodeExactIgnorePathRule(token) == null && token.includes("*")).length
    };
  }
  function rowDisplayIdentity(row, decoded) {
    const path = String(row.path || "").trim();
    const semanticTitle = String(decoded?.oneLineSummary || decoded?.propLabel || "").trim();
    const reason = String(row.reasonSummary || "").trim();
    const label = String(row.label || "").trim();
    const leaf = path.split(".").filter(Boolean).pop()?.replace(/\[\d+\]$/g, "") || "";
    const leafLabels = {
      label: "表示名",
      name: "名称",
      code: "フィールドコード",
      type: "種類",
      required: "必須設定",
      width: "横幅",
      height: "高さ",
      index: "並び順",
      filterCond: "絞り込み条件",
      assignee: "作業者",
      enabled: "有効／無効",
      entities: "対象ユーザー・組織",
      rights: "権限",
      fields: "配置フィールド"
    };
    const sectionLabel = SECTION_DEFS.find((definition) => definition.key === row.sectionKey)?.label || row.section || "設定";
    const fallbackTitle = label && label !== path ? label : `${sectionLabel}の${leafLabels[leaf] || (leaf ? `「${leaf}」` : "設定項目")}`;
    const title = semanticTitle || reason || fallbackTitle;
    const subtitleCandidates = [
      semanticTitle && reason !== semanticTitle ? reason : "",
      label && label !== path && label !== title ? label : ""
    ].filter(Boolean);
    return { title, subtitle: [...new Set(subtitleCandidates)].join(" · ") };
  }
  function rowColumnsHtml(row, useCharDiff, decoded, rowKey, expandedValueKeys) {
    const leftStr = decoded?.beforeText ?? stringifyRowValueForDiff(row.left, row.path);
    const rightStr = decoded?.afterText ?? stringifyRowValueForDiff(row.right, row.path);
    const pre = (value, className, label, side, rawHtml = false, measuredValue = value) => {
      const valueKey = `${rowKey}:${side}`;
      const lineCount = Math.max(1, measuredValue.split(/\r?\n/).length);
      const isLong = lineCount > VALUE_PREVIEW_MAX_LINES || measuredValue.length > VALUE_PREVIEW_MAX_CHARS;
      const expanded = isLong && expandedValueKeys.has(valueKey);
      const id = `kus-dl-value-${rowKey}-${side}`;
      const visibleLabel = side === "before" ? "比較元" : "比較先";
      const preHtml = `<span class="kus-dl-value__label">${visibleLabel}</span><pre id="${esc(id)}" class="kus-dl-pre ${className}" aria-label="${esc(label)}" data-side-label="${esc(label)}">${rawHtml ? value : esc(value)}</pre>`;
      if (!isLong) return `<div class="kus-dl-value">${preHtml}</div>`;
      const stateClass = expanded ? "is-expanded" : "is-collapsed";
      const actionLabel = expanded ? "プレビューに戻す" : "全文を展開";
      return `<div class="kus-dl-value ${stateClass}" data-kus-dl-value-key="${esc(valueKey)}">${preHtml}<div class="kus-dl-value__footer"><span>${lineCount}行 · ${measuredValue.length}文字</span><button type="button" class="kus-dl-value__toggle" data-kus-dl-value-toggle="${esc(valueKey)}" aria-expanded="${expanded ? "true" : "false"}" aria-controls="${esc(id)}">${actionLabel}</button></div></div>`;
    };
    if (row.type === "added") {
      return {
        left: "",
        right: `<div class="kus-dl-presence" role="group" aria-label="比較先にのみ存在"><p><strong>比較先にのみ存在</strong><span>比較元にはありません</span></p>${pre(rightStr, "add", "比較先の値", "after")}</div>`
      };
    }
    if (row.type === "removed") {
      return {
        left: `<div class="kus-dl-presence" role="group" aria-label="比較元にのみ存在"><p><strong>比較元にのみ存在</strong><span>比較先にはありません</span></p>${pre(leftStr, "del", "比較元の値", "before")}</div>`,
        right: ""
      };
    }
    if (row.type === "same") {
      return { left: pre(leftStr, "empty", "比較元の値", "before"), right: pre("（同一）", "empty", "比較先の値", "after") };
    }
    if (useCharDiff) {
      const charDiff = buildCharDiffHtml(leftStr, rightStr);
      if (charDiff) {
        return { left: pre(charDiff.left, "del", "比較元の値", "before", true, leftStr), right: pre(charDiff.right, "add", "比較先の値", "after", true, rightStr) };
      }
    }
    return { left: pre(leftStr, "del", "比較元の値", "before"), right: pre(rightStr, "add", "比較先の値", "after") };
  }
  function displayBundleSide(bundle, fallbackRole) {
    const appId = String(bundle?.appId || "").trim();
    const appName = extractAppNameFromBundle(bundle);
    const name = appName && appId ? `${appName}（App ${appId}）` : appName || (appId ? `App ${appId}` : fallbackRole);
    const guest = String(bundle?.guestId || "").trim();
    const environment = `${bundle?.preview ? "プレビュー" : "運用"}${guest ? ` / ゲスト ${guest}` : " / 通常スペース"}`;
    return { name, environment };
  }
  function renderLiteDiffOverviewHtml(cache, options = {}) {
    const counts = summarizeLiteDiffRows(cache.rows || []);
    const contentChanged = contentChangedCount(counts);
    const source = displayBundleSide(cache.sourceBundle, "比較元");
    const target = displayBundleSide(cache.targetBundle, "比較先");
    const fetchIssues = cache.fetchIssues || [];
    const partialIssues = cache.partialIssues || [];
    const ignoreRuleSummary = summarizeLiteIgnoreRules(cache.ignoreKeys || "");
    const normalizationLabels = Object.entries(DIFF_NORMALIZATION_PRESETS).filter(([key]) => cache.normalizationPresetState?.[key] === true).map(([, preset]) => preset.label);
    const truncated = !!cache.truncation?.truncated;
    const actualDiffTruncated = hasIncompleteActualDiffTruncation(cache.truncation);
    const incomplete = isIncompleteLiteDiff(cache);
    const hasNoticeOnlyChanges = counts.actual === 0 && counts.displayOnly > 0;
    const verdictClass = incomplete ? "kus-dl-verdict--warn" : counts.actual === 0 && !hasNoticeOnlyChanges ? "kus-dl-verdict--same" : "";
    const verdictTitle = incomplete ? "比較結果は不完全です" : hasNoticeOnlyChanges ? `状態名の変更候補が ${counts.displayOnly} 件見つかりました` : counts.actual === 0 ? "選択した設定に差分はありません" : `差分が ${counts.actual} 件見つかりました`;
    const verdictText = incomplete ? counts.actual ? `取得できた範囲では ${counts.actual} 件の差分があります。警告内容を確認してください。` : "差分なしとは判断できません。取得失敗または件数上限を解消して再比較してください。" : hasNoticeOnlyChanges ? "参照先の連動変更をまとめた表示用通知です。削除・追加としては数えていません。内容を確認してください。" : counts.actual === 0 ? `比較元と比較先は一致しています${counts.same ? `（同一 ${counts.same} 件）` : ""}。` : `追加 ${counts.added} / 削除 ${counts.removed} / 内容変更 ${contentChanged}${counts.moved ? ` / 移動 ${counts.moved}` : ""}`;
    const metric = (type, label, hint, value) => value > 0 ? `<button type="button" class="kus-dl-metric" data-kus-dl-type-filter="${esc(type)}" aria-label="${esc(label)} ${value}件を表示"><span class="kus-dl-metric__num">${value}</span><span class="kus-dl-metric__label">${esc(label)}</span><span class="kus-dl-metric__hint">${esc(hint)}</span></button>` : "";
    const bySection = /* @__PURE__ */ new Map();
    for (const row of cache.rows || []) {
      const key = row.sectionKey || "(その他)";
      if (!bySection.has(key)) bySection.set(key, []);
      bySection.get(key).push(row);
    }
    const orderedKeys = [];
    for (const def of SECTION_DEFS) if (bySection.has(def.key)) orderedKeys.push(def.key);
    for (const key of bySection.keys()) if (!orderedKeys.includes(key)) orderedKeys.push(key);
    const sectionButtons = orderedKeys.map((key) => {
      const sectionCounts = summarizeLiteDiffRows(bySection.get(key) || []);
      const label = SECTION_DEFS.find((def) => def.key === key)?.label || key;
      const countLabel = sectionCounts.actual ? `${sectionCounts.actual}件` : sectionCounts.displayOnly ? `変更候補 ${sectionCounts.displayOnly}件` : `一致 ${sectionCounts.same}件`;
      return `<button type="button" class="kus-dl-section-jump" data-kus-dl-section-filter="${esc(key)}" aria-label="${esc(`${label}で結果を絞り込む（${countLabel}）`)}">${esc(label)} ${esc(countLabel)}</button>`;
    }).join("");
    const alerts = [];
    if (actualDiffTruncated) {
      const truncationSections = cache.truncation?.sections || [];
      const sections = truncationSections.map((item) => item?.section || item?.sectionKey).filter(Boolean);
      const unscanned = truncationSections.filter((item) => item?.scanned === false).map((item) => item?.section || item?.sectionKey).filter(Boolean);
      const partial = truncationSections.filter((item) => item?.scanStatus === "partial" || item?.partiallyScanned === true).map((item) => item?.section || item?.sectionKey).filter(Boolean);
      const sectionText = sections.length ? ` 対象: ${sections.join("、")}` : "";
      const unscannedText = unscanned.length ? ` 後続の ${unscanned.join("、")} は未走査で、未検出件数も不明です。` : "";
      const partialText = partial.length ? ` ${partial.join("、")} は部分走査で、表示件数より多い差分がある可能性があります。` : "";
      alerts.push(`差分上限 ${Number(cache.truncation?.diffLimit || 0).toLocaleString()} 件に到達したため、結果の一部が表示されていません。${partialText}${unscannedText}${sectionText}`);
    } else if (truncated && Number(cache.truncation?.droppedSame || 0) > 0) {
      alerts.push(`同一証跡は上限 ${Number(cache.truncation?.sameLimit || 0).toLocaleString()} 件まで表示し、${Number(cache.truncation?.droppedSame || 0).toLocaleString()} 件を省略しました。実差分の検出結果は完全です。`);
    }
    if (fetchIssues.length) {
      const sections = [...new Set(fetchIssues.map((item) => item?.section || item?.sectionKey).filter(Boolean))];
      const sideLabel = { source: "比較元", target: "比較先", both: "両側" };
      const details = fetchIssues.slice(0, 3).map((item) => {
        const section = item?.section || item?.sectionKey || "不明なセクション";
        const side = sideLabel[String(item?.side || "")] || "取得元不明";
        const message = String(item?.message || item?.sourceError || item?.targetError || "取得できませんでした").replace(/\s+/g, " ").slice(0, 180);
        return `${section}（${side}）: ${message}`;
      });
      const remainder = fetchIssues.length > details.length ? ` / ほか ${fetchIssues.length - details.length} 件` : "";
      alerts.push(`設定の取得に ${fetchIssues.length} 件失敗しました。${sections.length ? ` 対象: ${sections.join("、")}。` : ""} ${details.join(" / ")}${remainder}`);
    }
    if (partialIssues.length) {
      const sideLabel = { source: "比較元", target: "比較先", both: "両側" };
      const details = partialIssues.slice(0, 3).map((item) => {
        const section = item?.section || item?.sectionKey || "不明なセクション";
        const side = sideLabel[String(item?.side || "")] || "取得元不明";
        const files = (item?.files || []).slice(0, 3).map((file) => file?.fileName || file?.fileKey).filter(Boolean);
        return `${section}（${side}）${files.length ? `: ${files.join("、")}` : ""}`;
      });
      const remainder = partialIssues.length > details.length ? ` / ほか ${partialIssues.length - details.length} 件` : "";
      alerts.push(`本文サイズまたは形式の制約により ${partialIssues.length} 件を fileKey で比較しました。本文内容は未検証です。${details.join(" / ")}${remainder}`);
    }
    const announceAttrs = options.announce === false ? "" : ' role="status"';
    const alertAttrs = options.announce === false ? "" : ' role="alert"';
    const completeness = incomplete ? "incomplete" : "complete";
    const alertsHtml = alerts.map((message) => `<div class="kus-dl-alert"${alertAttrs}>${esc(message)}</div>`).join("");
    const ignoreCondition = ignoreRuleSummary.total ? `無視ルール ${ignoreRuleSummary.total}件を適用した後の結果です。ルールに一致した設定差分は一覧に含まれません${ignoreRuleSummary.contextualRules ? `（完全パス/パターン ${ignoreRuleSummary.contextualRules}件）` : ""}。` : "無視ルールは適用していません。";
    const normalizationCondition = normalizationLabels.length ? `正規化 ${normalizationLabels.length}件を適用しています（${normalizationLabels.join("、")}）。` : "正規化は適用していません。";
    return `<section id="kus-dl-overview" class="kus-dl-overview" data-kus-dl-overview tabindex="-1" aria-label="比較結果サマリー"><div class="kus-dl-overview__direction"><div class="kus-dl-side"><span class="kus-dl-side__role">比較元</span><span class="kus-dl-side__name" title="${esc(source.name)}">${esc(source.name)}</span><span class="kus-dl-side__env">${esc(source.environment)}</span></div><span class="kus-dl-overview__arrow" aria-label="から">→</span><div class="kus-dl-side kus-dl-side--target"><span class="kus-dl-side__role">比較先</span><span class="kus-dl-side__name" title="${esc(target.name)}">${esc(target.name)}</span><span class="kus-dl-side__env">${esc(target.environment)}</span></div></div><div class="kus-dl-verdict ${verdictClass}" data-kus-dl-completeness="${completeness}"${announceAttrs}><span class="kus-dl-verdict__eyebrow">${incomplete ? "確認が必要" : "比較完了"}</span><strong>${esc(verdictTitle)}</strong><span>${esc(verdictText)}</span></div>` + alertsHtml + `<div class="kus-dl-metrics"><div class="kus-dl-metric"><span class="kus-dl-metric__num">${counts.actual}</span><span class="kus-dl-metric__label">差分</span><span class="kus-dl-metric__hint">同一を除く</span></div>` + metric("added", "比較先のみ", "追加として検出", counts.added) + metric("removed", "比較元のみ", "削除として検出", counts.removed) + metric("changed", "内容が異なる", "変更として検出", contentChanged) + metric("moved", "並び順", "移動として検出", counts.moved) + "</div>" + (sectionButtons ? `<div class="kus-dl-section-nav"><span class="kus-dl-section-nav__label">セクションで絞り込む</span>${sectionButtons}</div>` : "") + `<div class="kus-dl-alert kus-dl-conditions" role="note"><strong>適用した比較条件</strong><span>${esc(ignoreCondition)} ${esc(normalizationCondition)}</span></div><div class="kus-dl-legend">「比較先のみ」は追加、「比較元のみ」は削除として検出しています。比較方向は上の矢印で確認できます。</div></section>`;
  }
  function renderRowsHtml(rows, useCharDiff, summary, allFilteredRows = rows, options = {}) {
    if (!rows.length) return `<div class="kus-dl-empty">該当する差分はありません${summary ? ` — ${summary}` : ""}</div>`;
    const bySection = /* @__PURE__ */ new Map();
    const allBySection = /* @__PURE__ */ new Map();
    for (const r of rows) {
      const key = r.sectionKey || "(その他)";
      if (!bySection.has(key)) bySection.set(key, []);
      bySection.get(key).push(r);
    }
    for (const r of allFilteredRows) {
      const key = r.sectionKey || "(その他)";
      if (!allBySection.has(key)) allBySection.set(key, []);
      allBySection.get(key).push(r);
    }
    const orderedKeys = [];
    for (const def of SECTION_DEFS) if (bySection.has(def.key)) orderedKeys.push(def.key);
    for (const k of bySection.keys()) if (!orderedKeys.includes(k)) orderedKeys.push(k);
    const expandedValueKeys = options.expandedValueKeys || /* @__PURE__ */ new Set();
    const parts = [];
    parts.push(`<div class="kus-dl-result__summary">${summary}</div>`);
    for (const k of orderedKeys) {
      const list = bySection.get(k);
      const allInSection = allBySection.get(k) || list;
      const label = SECTION_DEFS.find((d) => d.key === k)?.label || k;
      const sectionCounts = summarizeLiteDiffRows(allInSection);
      const sectionContentChanged = contentChangedCount(sectionCounts);
      const breakdown = sectionCounts.actual ? [
        ["added", "追加", sectionCounts.added],
        ["removed", "削除", sectionCounts.removed],
        ["changed", "内容変更", sectionContentChanged],
        ["moved", "移動", sectionCounts.moved]
      ].filter((entry) => Number(entry[2]) > 0).map(([tone, statLabel, value]) => `<span class="kus-dl-section__stat kus-dl-section__stat--${tone}">${statLabel} ${value}</span>`).join("") : `<span class="kus-dl-section__stat">${sectionCounts.same ? `一致 ${sectionCounts.same}` : `変更候補 ${sectionCounts.displayOnly}`}</span>`;
      const countLabel = list.length === allInSection.length ? `${list.length}件` : `${list.length} / ${allInSection.length}件表示`;
      const collapsed = !!options.collapsedSections?.has(k);
      parts.push(`<details class="kus-dl-section" data-kus-dl-section-key="${esc(k)}"${collapsed ? "" : " open"}><summary><span class="kus-dl-section__heading"><span class="kus-dl-section__label">${esc(label)}</span><span class="kus-dl-section__count">${countLabel}</span></span><span class="kus-dl-section__breakdown" aria-label="差分内訳">${breakdown}</span></summary><div class="kus-dl-section__body">`);
      for (const r of list) {
        const decoded = safeDecodeRow(r);
        const rowKey = buildLiteDiffRowKey(r);
        const cols = rowColumnsHtml(r, useCharDiff, decoded, rowKey, expandedValueKeys);
        const identity = rowDisplayIdentity(r, decoded);
        const rowValuesExpanded = !!options.expandedRowKeys?.has(rowKey);
        const rowValuesId = `kus-dl-row-values-${rowKey}`;
        const current = rowKey === options.currentRowKey;
        const typeKey = r.moved ? "moved" : r.type || "same";
        const factLabel = FACT_LABEL[typeKey] || TYPE_LABEL[typeKey] || typeKey;
        const typeLabel = TYPE_LABEL[typeKey] || typeKey;
        const typeBadge = `<span class="kus-dl-badge kus-dl-badge--${esc(typeKey)}" aria-label="変更種別: ${esc(typeLabel)}。状態: ${esc(factLabel)}"><span class="kus-dl-badge__type">${esc(typeLabel)}</span><span class="kus-dl-badge__fact">${esc(factLabel)}</span></span>`;
        const flagHtml = [
          r.notationOnly ? '<span class="kus-dl-flag" title="型・表記だけが異なり、値としては同じです（例: &quot;100&quot; と 100）">表記のみ</span>' : "",
          r.emptyOnly ? '<span class="kus-dl-flag" title="空文字・null・空配列など、空値同士の差です">空値ゆれ</span>' : ""
        ].join("");
        const contextHtml = decoded ? `<div class="kus-dl-row__context">${decoded.whereChips.map((chip) => `<span class="kus-dl-row__chip">${esc(`${chip.icon || ""}${chip.icon ? " " : ""}${chip.label}`)}</span>`).join("")}</div>` : "";
        const technicalHtml = r.path ? `<details class="kus-dl-row__technical" data-kus-dl-technical><summary>技術情報</summary><code class="kus-dl-row__raw"><span>内部パス</span>${esc(r.path)}</code></details>` : "";
        const positionalPath = /\[\d+\]/.test(String(r.path || ""));
        const ignoreAction = r.type !== "same" && r.path ? positionalPath ? '<span class="kus-dl-flag" title="並び替え後に別の対象を指す可能性があるため、自動で無視ルールには追加できません">並び順に依存（自動除外不可）</span>' : `<button type="button" class="kus-dl-row__action" data-kus-dl-ignore-path="${esc(r.path)}" title="この項目だけを次回比較から除外" aria-label="${esc(`${identity.title}を次回の比較から除外（無視ルールへ追加）`)}">次回から除外</button>` : "";
        const rowValuesAction = rowValuesExpanded ? "閉じる" : "確認";
        parts.push(`<article class="kus-dl-row kus-dl-row--${esc(typeKey)}${current ? " is-current" : ""}" data-kus-dl-row-key="${esc(rowKey)}" tabindex="-1"${current ? ' aria-current="true"' : ""} aria-label="${esc(`${typeLabel}・${factLabel}: ${identity.title}`)}"><div class="kus-dl-row__head"><div class="kus-dl-row__identity"><div class="kus-dl-row__headline">${typeBadge}<span class="kus-dl-row__title">${esc(identity.title)}</span>${flagHtml}</div>${identity.subtitle ? `<div class="kus-dl-row__subtitle">${esc(identity.subtitle)}</div>` : ""}</div>${ignoreAction}</div>${contextHtml}${technicalHtml}<button type="button" class="kus-dl-row__mobile-toggle" data-kus-dl-mobile-row-toggle="${esc(rowKey)}" aria-expanded="${rowValuesExpanded ? "true" : "false"}" aria-controls="${esc(rowValuesId)}" aria-label="${esc(`${identity.title}の比較元・比較先の値を${rowValuesAction}`)}">比較元・比較先の値を${rowValuesAction}</button><div id="${esc(rowValuesId)}" class="kus-dl-row__cols${rowValuesExpanded ? " is-expanded" : ""}">${cols.left}${cols.right}</div></article>`);
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
      subtitle: "アプリ設定を1件ずつ、1対多、または複数の1対1ペアで比較し、HTMLと顧客向けExcelで確認",
      accent: "diff",
      badges: [{ label: "Lite" }, { label: "出力対応" }],
      hint: "1対1比較と1対多比較は完了時にレビュー用HTMLを自動保存します。ペア一括比較は結果行から必要なHTMLまたはExcelを保存します。顧客向けExcelには差分値と取得不完全時のエラー等の原文をマスキングせず収録するため、共有前に内容を確認してください。",
      wide: true
    });
    panel.status.setAttribute("role", "status");
    panel.status.setAttribute("aria-live", "polite");
    panel.status.setAttribute("aria-atomic", "true");
    panel.root.classList.add("kus-dl-workspace");
    const srcApp = makeInput({ placeholder: "アプリID", width: "id", ariaLabel: "比較元アプリID" });
    const srcGuest = makeInput({ placeholder: "ゲストID", width: "guest", ariaLabel: "比較元ゲストスペースID" });
    const srcPrev = makeCheck({ label: "プレビューで取得" });
    const tgtApp = makeInput({ placeholder: "アプリID（カンマ区切り可）", width: "medium", ariaLabel: "比較先1アプリID" });
    const tgtGuest = makeInput({ placeholder: "ゲストID", width: "guest", ariaLabel: "比較先1ゲストスペースID" });
    const tgtPrev = makeCheck({ label: "プレビューで取得" });
    srcPrev.checkbox.setAttribute("aria-label", "比較元をプレビュー環境から取得");
    tgtPrev.checkbox.setAttribute("aria-label", "比較先をプレビュー環境から取得");
    let comparisonMode = "single";
    let completionReady = false;
    let applyComparisonMode = (mode) => {
      comparisonMode = mode;
    };
    const cardApp = makeCard({ title: "比較するアプリ", number: 1 });
    cardApp.card.classList.add("kus-dl-target-card");
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
    const srcName = makeTargetName();
    let sourceAppName = "";
    const setSourceName = (appName) => {
      sourceAppName = String(appName || "").trim();
      srcName.textContent = sourceAppName;
      srcName.title = sourceAppName ? `アプリ名: ${sourceAppName}` : "";
      srcName.classList.toggle("kus-dl-target-name--empty", !sourceAppName);
    };
    const sourceRow = makeRow([makeTargetField(srcApp, srcName), srcGuest, srcPrev.label], { label: "アプリID・環境" });
    const tgtName = makeTargetName();
    const firstTargetRow = makeRow([makeTargetField(tgtApp, tgtName), tgtGuest, tgtPrev.label], { label: "アプリID・環境" });
    const modeSwitch = document.createElement("div");
    modeSwitch.className = "kus-dl-mode";
    modeSwitch.setAttribute("role", "group");
    modeSwitch.setAttribute("aria-label", "比較方法");
    const singleModeBtn = makeButton("1対1比較", "sub");
    singleModeBtn.dataset.kusDlMode = "single";
    const multiModeBtn = makeButton("1対多比較", "sub");
    multiModeBtn.dataset.kusDlMode = "multi";
    const pairModeBtn = makeButton("ペア一括比較", "sub");
    pairModeBtn.dataset.kusDlMode = "pairs";
    modeSwitch.append(singleModeBtn, multiModeBtn, pairModeBtn);
    cardApp.body.appendChild(modeSwitch);
    const directionGrid = document.createElement("div");
    directionGrid.className = "kus-dl-direction-grid";
    const sourceCard = document.createElement("section");
    sourceCard.className = "kus-dl-app-card kus-dl-app-card--source";
    sourceCard.setAttribute("aria-labelledby", "kus-dl-source-title");
    sourceCard.innerHTML = '<p class="kus-dl-app-card__role">比較元</p><h3 id="kus-dl-source-title">基準にするアプリ</h3><p class="kus-dl-app-card__help">変更前として扱う設定です</p>';
    sourceCard.appendChild(sourceRow);
    const targetCard = document.createElement("section");
    targetCard.className = "kus-dl-app-card kus-dl-app-card--target";
    targetCard.setAttribute("aria-labelledby", "kus-dl-target-title");
    targetCard.innerHTML = '<p class="kus-dl-app-card__role">比較先</p><h3 id="kus-dl-target-title">確認するアプリ</h3><p class="kus-dl-app-card__help">変更後として扱う設定です</p>';
    targetCard.appendChild(firstTargetRow);
    const swapBtn = makeButton("比較方向を入れ替え", "ghost", { icon: "⇄" });
    swapBtn.classList.add("kus-dl-swap");
    swapBtn.dataset.kusDlSwap = "";
    directionGrid.append(sourceCard, swapBtn, targetCard);
    cardApp.body.appendChild(directionGrid);
    const targetList = document.createElement("div");
    targetList.className = "kus-dl-target-list";
    const targetRows = [{ app: tgtApp, guest: tgtGuest, row: firstTargetRow, name: tgtName, appName: "" }];
    const relabelTargetRows = () => targetRows.forEach((r, idx) => {
      const label = r.row?.querySelector?.(".kus-lp__label");
      if (label) label.textContent = `比較先 ${idx + 1}`;
      r.app.setAttribute("aria-label", `比較先${idx + 1}アプリID`);
      r.guest.setAttribute("aria-label", `比較先${idx + 1}ゲストスペースID`);
    });
    const addTargetRow = (appId = "", guestId = "", appName = "") => {
      const rowNumber = targetRows.length + 1;
      const app = makeInput({ placeholder: "アプリID（カンマ区切り可）", width: "medium", ariaLabel: `比較先${rowNumber}アプリID` });
      const guest = makeInput({ placeholder: "ゲストID", width: "guest", ariaLabel: `比較先${rowNumber}ゲストスペースID` });
      const name = makeTargetName();
      app.value = appId;
      guest.value = guestId;
      const copy = makeButton("行コピー", "sub");
      const remove = makeButton("削除", "ghost");
      const row = makeRow([makeTargetField(app, name), guest, copy, remove], { label: `比較先 ${targetRows.length + 1}` });
      const entry = { app, guest, row, name, appName: "" };
      setTargetName(entry, appName);
      copy.addEventListener("click", async () => {
        const text2 = [`比較先 ${targetRows.indexOf(entry) + 1}`, app.value.trim(), guest.value.trim()].join("	");
        try {
          await navigator.clipboard.writeText(text2);
          panel.setStatus("比較先行をコピーしました", "info");
        } catch {
          panel.setStatus(text2, "info");
        }
      });
      remove.addEventListener("click", () => {
        row.remove();
        const idx = targetRows.indexOf(entry);
        if (idx >= 0) targetRows.splice(idx, 1);
        relabelTargetRows();
        invalidateResultAfterAppSelectionChange();
      });
      app.addEventListener("input", () => {
        if (entry.appName) setTargetName(entry, "");
        invalidateResultAfterAppSelectionChange();
      });
      guest.addEventListener("input", invalidateResultAfterAppSelectionChange);
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
        invalidateResultAfterAppSelectionChange();
        applyComparisonMode("multi");
        panel.setStatus(`比較先を ${tokens.length} 件に分割しました`, "info");
      };
      entry.app.addEventListener("change", distribute);
      entry.app.addEventListener("paste", (ev) => {
        const text2 = ev.clipboardData?.getData("text") || "";
        if (!/[,、\s]/.test(text2)) return;
        ev.preventDefault();
        entry.app.value = [entry.app.value.trim(), text2].filter(Boolean).join(",");
        distribute();
      });
    };
    srcApp.addEventListener("input", () => {
      if (sourceAppName) setSourceName("");
      invalidateResultAfterAppSelectionChange();
    });
    tgtApp.addEventListener("input", () => {
      if (targetRows[0]?.appName) setTargetName(targetRows[0], "");
      invalidateResultAfterAppSelectionChange();
    });
    srcGuest.addEventListener("input", invalidateResultAfterAppSelectionChange);
    tgtGuest.addEventListener("input", invalidateResultAfterAppSelectionChange);
    srcPrev.checkbox.addEventListener("change", invalidateResultAfterAppSelectionChange);
    tgtPrev.checkbox.addEventListener("change", invalidateResultAfterAppSelectionChange);
    attachTargetSplit(targetRows[0]);
    const addTargetBtn = makeButton("比較先行を追加", "sub");
    addTargetBtn.addEventListener("click", () => {
      addTargetRow();
      applyComparisonMode("multi");
      panel.setStatus("比較先行を追加しました", "info");
    });
    const copyFirstBtn = makeButton("比較先1を複製", "sub");
    copyFirstBtn.addEventListener("click", () => {
      addTargetRow(tgtApp.value.trim(), tgtGuest.value.trim(), targetRows[0]?.appName || "");
      applyComparisonMode("multi");
    });
    const multiControls = makeRow([addTargetBtn, copyFirstBtn], { label: "比較先を増やす" });
    multiControls.classList.add("kus-dl-multi-controls");
    targetCard.appendChild(multiControls);
    const singleAppSearch = createAppSearchControl(panel, {
      targets: [
        { label: "比較元", apply: (id, name, guestId) => {
          if (diffRunActive) return { message: "比較を実行中です。完了してからアプリを設定してください", tone: "warn" };
          srcApp.value = id;
          setSourceName(name);
          if (guestId && !srcGuest.value.trim()) srcGuest.value = guestId;
          const invalidated = invalidateResultAfterAppSelectionChange();
          return { message: invalidated ? "比較元を変更したため、前回の結果を無効にしました。再比較してください" : `App ${id} を比較元へ設定しました`, tone: invalidated ? "warn" : "ok" };
        } },
        { label: "比較先", apply: (id, name, guestId) => {
          if (diffRunActive) return { message: "比較を実行中です。完了してからアプリを設定してください", tone: "warn" };
          const empty = targetRows.find((r) => !r.app.value.trim()) || addTargetRow();
          empty.app.value = id;
          setTargetName(empty, name);
          if (guestId && !empty.guest.value.trim()) empty.guest.value = guestId;
          const invalidated = invalidateResultAfterAppSelectionChange();
          return { message: invalidated ? "比較先を変更したため、前回の結果を無効にしました。再比較してください" : `App ${id} を比較先へ設定しました`, tone: invalidated ? "warn" : "ok" };
        } }
      ]
    });
    cardApp.body.appendChild(singleAppSearch);
    targetCard.appendChild(targetList);
    const MAX_PAIR_ROWS = DEFAULT_MAX_DIFF_BATCH_PAIRS;
    const pairEditor = document.createElement("section");
    pairEditor.className = "kus-dl-pair-editor";
    pairEditor.hidden = true;
    pairEditor.setAttribute("aria-labelledby", "kus-dl-pair-editor-title");
    const pairIntro = document.createElement("div");
    pairIntro.className = "kus-dl-pair-editor__intro";
    pairIntro.innerHTML = '<div><strong id="kus-dl-pair-editor-title">複数の1対1ペアを登録</strong><span>各行の比較元と比較先を1組として、登録順に比較します。同じ接続先は比較元・比較先で各1回だけ登録できます。共通の比較元から複数先を比べる場合は「1対多比較」を使います。</span></div>';
    const pairCount = document.createElement("span");
    pairCount.className = "kus-dl-pair-count";
    pairCount.setAttribute("aria-live", "polite");
    pairIntro.appendChild(pairCount);
    const pairList = document.createElement("div");
    pairList.className = "kus-dl-pair-list";
    pairList.dataset.kusDlPairList = "";
    const pairRows = [];
    const makePairEndpoint = (side, rowNumber) => {
      const app = makeInput({ placeholder: "アプリID", width: "medium", ariaLabel: `ペア${rowNumber}${side === "source" ? "比較元" : "比較先"}アプリID` });
      const guest = makeInput({ placeholder: "ゲストID", width: "guest", ariaLabel: `ペア${rowNumber}${side === "source" ? "比較元" : "比較先"}ゲストスペースID` });
      app.inputMode = "numeric";
      guest.inputMode = "numeric";
      const preview = makeCheck({ label: "プレビューで取得" });
      preview.checkbox.setAttribute("aria-label", `ペア${rowNumber}${side === "source" ? "比較元" : "比較先"}をプレビュー環境から取得`);
      preview.label.classList.add("kus-dl-pair-side__preview");
      const name = makeTargetName();
      const folderFile = document.createElement("span");
      folderFile.className = "kus-dl-pair-side__file";
      folderFile.hidden = true;
      const endpointSide = document.createElement("section");
      endpointSide.className = `kus-dl-pair-side kus-dl-pair-side--${side}`;
      const role = document.createElement("span");
      role.className = "kus-dl-pair-side__role";
      role.textContent = side === "source" ? "比較元（変更前）" : "比較先（変更後）";
      const fields = document.createElement("div");
      fields.className = "kus-dl-pair-side__fields";
      const appField = makeTargetField(app, name);
      const appFieldLabel = document.createElement("span");
      appFieldLabel.className = "kus-dl-pair-field-label";
      appFieldLabel.textContent = "App ID";
      appField.prepend(appFieldLabel);
      const guestField = document.createElement("div");
      guestField.className = "kus-dl-pair-guest-field";
      const guestFieldLabel = document.createElement("span");
      guestFieldLabel.className = "kus-dl-pair-field-label";
      guestFieldLabel.textContent = "Guest ID（任意）";
      guestField.append(guestFieldLabel, guest);
      fields.append(appField, guestField, preview.label);
      endpointSide.append(role, fields, folderFile);
      return { app, guest, preview, name, appName: "", side: endpointSide, folderFile, folderBundle: null };
    };
    const setPairEndpointName = (endpoint, appName) => {
      endpoint.appName = String(appName || "").trim();
      endpoint.name.textContent = endpoint.appName;
      endpoint.name.title = endpoint.appName ? `アプリ名: ${endpoint.appName}` : "";
      endpoint.name.classList.toggle("kus-dl-target-name--empty", !endpoint.appName);
    };
    const setPairEndpointFolderBundle = (endpoint, imported, options = {}) => {
      endpoint.folderBundle = imported;
      endpoint.side.classList.toggle("is-folder-imported", !!imported);
      endpoint.app.readOnly = !!imported;
      endpoint.guest.readOnly = !!imported;
      endpoint.preview.checkbox.disabled = !!imported;
      endpoint.folderFile.hidden = !imported;
      endpoint.folderFile.textContent = imported ? `設定JSON: ${imported.relativePath}` : "";
      endpoint.folderFile.title = imported?.relativePath || "";
      if (imported) {
        endpoint.app.value = imported.appId;
        endpoint.guest.value = imported.guestId;
        endpoint.preview.checkbox.checked = imported.preview;
        setPairEndpointName(endpoint, imported.appName);
      } else if (options.clearValues) {
        endpoint.app.value = "";
        endpoint.guest.value = "";
        endpoint.preview.checkbox.checked = false;
        setPairEndpointName(endpoint, "");
      }
    };
    const pairRowIsBlank = (entry) => !(entry.source.app.value.trim() || entry.source.guest.value.trim() || entry.source.preview.checkbox.checked || entry.target.app.value.trim() || entry.target.guest.value.trim() || entry.target.preview.checkbox.checked);
    const clearPairRowValidation = (entry) => {
      entry.row.classList.remove("is-invalid");
      entry.error.hidden = true;
      entry.error.textContent = "";
      [entry.source.app, entry.source.guest, entry.target.app, entry.target.guest].forEach((input) => {
        input.removeAttribute("aria-invalid");
        input.removeAttribute("aria-describedby");
      });
    };
    const clearPairValidation = () => pairRows.forEach(clearPairRowValidation);
    const relabelPairRows = () => {
      pairRows.forEach((entry, index) => {
        const rowNumber = index + 1;
        entry.row.dataset.kusDlPairRow = String(rowNumber);
        entry.number.textContent = String(rowNumber);
        entry.number.setAttribute("aria-label", `ペア ${rowNumber}`);
        entry.source.app.setAttribute("aria-label", `ペア${rowNumber}比較元アプリID`);
        entry.source.guest.setAttribute("aria-label", `ペア${rowNumber}比較元ゲストスペースID`);
        entry.source.preview.checkbox.setAttribute("aria-label", `ペア${rowNumber}比較元をプレビュー環境から取得`);
        entry.target.app.setAttribute("aria-label", `ペア${rowNumber}比較先アプリID`);
        entry.target.guest.setAttribute("aria-label", `ペア${rowNumber}比較先ゲストスペースID`);
        entry.target.preview.checkbox.setAttribute("aria-label", `ペア${rowNumber}比較先をプレビュー環境から取得`);
        entry.error.id = `kus-dl-pair-error-${rowNumber}`;
        entry.duplicate.setAttribute("aria-label", `ペア${rowNumber}を複製`);
        entry.swap.setAttribute("aria-label", `ペア${rowNumber}の比較方向を入れ替え`);
        entry.remove.setAttribute("aria-label", `ペア${rowNumber}を削除`);
        entry.match.id = `kus-dl-pair-match-${rowNumber}`;
        entry.remove.disabled = pairRows.length === 1;
      });
      pairCount.textContent = `${pairRows.length} / ${MAX_PAIR_ROWS} 行`;
    };
    const readPairInputs = () => pairRows.map((entry, index) => ({
      rowNumber: index + 1,
      source: {
        appId: entry.source.app.value,
        guestId: entry.source.guest.value,
        preview: entry.source.preview.checkbox.checked,
        appName: entry.source.appName
      },
      target: {
        appId: entry.target.app.value,
        guestId: entry.target.guest.value,
        preview: entry.target.preview.checkbox.checked,
        appName: entry.target.appName
      }
    }));
    const showPairValidationIssues = (issues) => {
      clearPairValidation();
      const inputsForIssue = (entry, issue) => {
        if (issue.code === "invalid-source-guest") return [entry.source.guest];
        if (issue.code === "invalid-target-guest") return [entry.target.guest];
        if (issue.code === "invalid-source-app" || issue.code === "duplicate-source") return [entry.source.app];
        if (issue.code === "invalid-target-app" || issue.code === "duplicate-target") return [entry.target.app];
        if (issue.code === "incomplete") return issue.side === "target" ? [entry.target.app] : [entry.source.app];
        return [entry.source.app, entry.target.app];
      };
      const byRow = /* @__PURE__ */ new Map();
      issues.forEach((issue) => {
        const list = byRow.get(issue.rowNumber) || [];
        list.push(issue);
        byRow.set(issue.rowNumber, list);
      });
      byRow.forEach((rowIssues, rowNumber) => {
        const entry = pairRows[rowNumber - 1];
        if (!entry) return;
        entry.row.classList.add("is-invalid");
        entry.error.hidden = false;
        entry.error.textContent = rowIssues.map((issue) => issue.message).join(" / ");
        rowIssues.forEach((issue) => {
          inputsForIssue(entry, issue).forEach((input) => {
            input.setAttribute("aria-invalid", "true");
            input.setAttribute("aria-describedby", entry.error.id);
          });
        });
      });
      const first = issues[0];
      const firstRow = first ? pairRows[first.rowNumber - 1] : null;
      const focusTarget = firstRow && first ? inputsForIssue(firstRow, first)[0] : null;
      focusTarget?.focus();
    };
    const addPairRow = (initial = {}, focus = false) => {
      if (pairRows.length >= MAX_PAIR_ROWS) {
        panel.setStatus(`一度に登録できるペアは ${MAX_PAIR_ROWS} 件までです`, "warn");
        return null;
      }
      const rowNumber = pairRows.length + 1;
      const source = makePairEndpoint("source", rowNumber);
      const target = makePairEndpoint("target", rowNumber);
      const row = document.createElement("article");
      row.className = "kus-dl-pair-row";
      const number = document.createElement("span");
      number.className = "kus-dl-pair-row__number";
      const arrow = document.createElement("span");
      arrow.className = "kus-dl-pair-arrow";
      arrow.setAttribute("aria-hidden", "true");
      arrow.textContent = "→";
      const duplicate = makeButton("複製", "sub");
      const swap = makeButton("入替", "ghost");
      const remove = makeButton("削除", "ghost");
      const actions = document.createElement("div");
      actions.className = "kus-dl-pair-actions";
      actions.append(duplicate, swap, remove);
      const error = document.createElement("p");
      error.className = "kus-dl-pair-row__error";
      error.setAttribute("role", "alert");
      error.hidden = true;
      const match = document.createElement("p");
      match.className = "kus-dl-pair-row__match";
      match.hidden = true;
      row.append(number, source.side, arrow, target.side, actions, error, match);
      const entry = { row, number, source, target, error, match, duplicate, swap, remove };
      const applyEndpointInitial = (endpointEntry, value) => {
        endpointEntry.app.value = String(value?.appId || "");
        endpointEntry.guest.value = String(value?.guestId || "");
        endpointEntry.preview.checkbox.checked = value?.preview === true;
        setPairEndpointName(endpointEntry, String(value?.appName || ""));
      };
      applyEndpointInitial(source, initial.source);
      applyEndpointInitial(target, initial.target);
      const onEndpointInput = (endpoint) => {
        if (endpoint.appName) setPairEndpointName(endpoint, "");
        clearPairRowValidation(entry);
        invalidateResultAfterPairConditionChange();
      };
      source.app.addEventListener("input", () => onEndpointInput(source));
      target.app.addEventListener("input", () => onEndpointInput(target));
      [source.guest, target.guest].forEach((input) => input.addEventListener("input", () => {
        clearPairRowValidation(entry);
        invalidateResultAfterPairConditionChange();
      }));
      [source.preview.checkbox, target.preview.checkbox].forEach((checkbox) => checkbox.addEventListener("change", () => {
        clearPairRowValidation(entry);
        invalidateResultAfterPairConditionChange();
      }));
      duplicate.addEventListener("click", () => {
        if (pairFolderModeActive()) {
          panel.setStatus("フォルダ比較中は対応確認表からペアを作り直してください", "warn");
          return;
        }
        const copy = addPairRow({
          source: { appId: source.app.value.trim(), guestId: source.guest.value.trim(), preview: source.preview.checkbox.checked, appName: source.appName },
          target: { appId: target.app.value.trim(), guestId: target.guest.value.trim(), preview: target.preview.checkbox.checked, appName: target.appName }
        }, true);
        if (copy) {
          const invalidated = invalidateResultAfterPairConditionChange();
          if (!invalidated) panel.setStatus(`ペア ${pairRows.indexOf(entry) + 1} を末尾へ複製しました。重複箇所を変更してください`, "info");
        }
      });
      swap.addEventListener("click", () => {
        if (pairFolderModeActive()) {
          panel.setStatus("フォルダ比較中は対応確認表で比較元と比較先を選び直してください", "warn");
          return;
        }
        const sourceValue = { appId: source.app.value, guestId: source.guest.value, preview: source.preview.checkbox.checked, appName: source.appName };
        applyEndpointInitial(source, { appId: target.app.value, guestId: target.guest.value, preview: target.preview.checkbox.checked, appName: target.appName });
        applyEndpointInitial(target, sourceValue);
        clearPairRowValidation(entry);
        const invalidated = invalidateResultAfterPairConditionChange();
        if (!invalidated) panel.setStatus(`ペア ${pairRows.indexOf(entry) + 1} の比較方向を入れ替えました`, "info");
        source.app.focus();
      });
      remove.addEventListener("click", () => {
        if (pairFolderModeActive()) {
          panel.setStatus("フォルダ比較中はペア表から削除できません。対応確認表で対象チェックを外して再反映してください", "warn");
          return;
        }
        const index = pairRows.indexOf(entry);
        if (index < 0 || pairRows.length === 1) return;
        row.remove();
        pairRows.splice(index, 1);
        clearPairValidation();
        relabelPairRows();
        const invalidated = invalidateResultAfterPairConditionChange();
        if (!invalidated) panel.setStatus(`ペア ${index + 1} を削除しました`, "info");
        pairRows[Math.min(index, pairRows.length - 1)]?.source.app.focus();
      });
      pairRows.push(entry);
      pairList.appendChild(row);
      relabelPairRows();
      if (focus) source.app.focus();
      return entry;
    };
    const seedFirstPairFromSingle = () => {
      const first = pairRows[0];
      if (!first || !pairRowIsBlank(first)) return;
      first.source.app.value = srcApp.value.trim();
      first.source.guest.value = srcGuest.value.trim();
      first.source.preview.checkbox.checked = srcPrev.checkbox.checked;
      setPairEndpointName(first.source, sourceAppName);
      first.target.app.value = tgtApp.value.trim().split(/[,、\s]+/)[0] || "";
      first.target.guest.value = tgtGuest.value.trim();
      first.target.preview.checkbox.checked = tgtPrev.checkbox.checked;
      setPairEndpointName(first.target, targetRows[0]?.appName || "");
    };
    addPairRow();
    const addPairBtn = makeButton("ペアを追加", "sub", { icon: "＋" });
    addPairBtn.dataset.kusDlPairAdd = "";
    addPairBtn.addEventListener("click", () => {
      if (pairFolderModeActive()) {
        panel.setStatus("フォルダ比較中は対応確認表からペアを作成してください。手入力へ戻す場合は両フォルダを解除してください", "warn");
        return;
      }
      const entry = addPairRow({}, true);
      if (!entry) return;
      const invalidated = invalidateResultAfterPairConditionChange();
      if (!invalidated) panel.setStatus(`ペア ${pairRows.length} を追加しました`, "info");
    });
    const pairToolbar = document.createElement("div");
    pairToolbar.className = "kus-dl-pair-toolbar";
    const pairClearImportBtn = makeButton("設定JSON読込を解除", "ghost");
    pairClearImportBtn.dataset.kusDlPairClearImport = "";
    pairClearImportBtn.disabled = true;
    pairClearImportBtn.hidden = true;
    pairToolbar.append(addPairBtn, pairClearImportBtn);
    const pairFolderStates = { source: null, target: null };
    const pairFolderLoadGeneration = { source: 0, target: 0 };
    let pairFolderDraftRows = [];
    let pairFolderDraftDirty = false;
    let pairFolderApplied = false;
    let pairFolderIgnoreUnusedTargets = false;
    const pairFolderActiveLoads = { source: 0, target: 0 };
    const pairFolderLoadActive = () => pairFolderActiveLoads.source > 0 || pairFolderActiveLoads.target > 0;
    const pairFolder = document.createElement("section");
    pairFolder.className = "kus-dl-pair-folder";
    pairFolder.setAttribute("aria-labelledby", "kus-dl-pair-folder-title");
    const pairFolderHead = document.createElement("div");
    pairFolderHead.className = "kus-dl-pair-folder__head";
    pairFolderHead.innerHTML = '<strong id="kus-dl-pair-folder-title">設定フォルダからペアを作成</strong><span>設定一括取得ZIPを展開したフォルダなどを、変更前・変更後の両側で選びます。対応を確認して反映すると、現在のペア表を確認済みの組み合わせで置き換えます。比較にはJSONだけを使い、kintone APIへ接続しません。</span>';
    const pairFolderGrid = document.createElement("div");
    pairFolderGrid.className = "kus-dl-pair-folder__grid";
    const makePairFolderSide = (side) => {
      const box = document.createElement("section");
      box.className = `kus-dl-pair-folder__side kus-dl-pair-folder__side--${side}`;
      const title = document.createElement("strong");
      title.id = `kus-dl-pair-folder-${side}-title`;
      title.textContent = side === "source" ? "比較元（変更前）フォルダ" : "比較先（変更後）フォルダ";
      box.setAttribute("aria-labelledby", title.id);
      const actions = document.createElement("div");
      actions.className = "kus-dl-pair-folder__actions";
      const select = makeButton("フォルダを選択", "sub", { icon: "↑" });
      select.dataset.kusDlPairFolderSelect = side;
      select.setAttribute("aria-label", `${side === "source" ? "比較元（変更前）" : "比較先（変更後）"}フォルダを選択`);
      const clear = makeButton("解除", "ghost");
      clear.dataset.kusDlPairFolderClear = side;
      clear.setAttribute("aria-label", `${side === "source" ? "比較元（変更前）" : "比較先（変更後）"}フォルダの読込を解除`);
      clear.disabled = true;
      const summary = document.createElement("p");
      summary.className = "kus-dl-pair-folder__summary";
      summary.dataset.kusDlPairFolderSummary = side;
      summary.setAttribute("aria-live", "polite");
      summary.textContent = "未選択";
      const input = document.createElement("input");
      input.type = "file";
      input.multiple = true;
      input.accept = ".json,application/json";
      input.hidden = true;
      input.setAttribute("webkitdirectory", "");
      input.setAttribute("directory", "");
      input.setAttribute("aria-label", `${side === "source" ? "比較元" : "比較先"}設定フォルダ`);
      input.dataset.kusDlPairFolderInput = side;
      actions.append(select, clear);
      box.append(title, actions, summary, input);
      return { box, select, clear, summary, input };
    };
    const sourceFolderUi = makePairFolderSide("source");
    const targetFolderUi = makePairFolderSide("target");
    pairFolderGrid.append(sourceFolderUi.box, targetFolderUi.box);
    const pairFolderAlert = document.createElement("p");
    pairFolderAlert.className = "kus-dl-pair-folder__error";
    pairFolderAlert.setAttribute("role", "alert");
    pairFolderAlert.hidden = true;
    const pairFolderMapping = document.createElement("section");
    pairFolderMapping.className = "kus-dl-pair-folder__mapping";
    pairFolderMapping.hidden = true;
    pairFolderMapping.setAttribute("aria-label", "フォルダ内アプリの対応確認");
    const pairFolderMappingScroll = document.createElement("div");
    pairFolderMappingScroll.className = "kus-dl-pair-folder__mapping-scroll";
    const pairFolderMappingTable = document.createElement("div");
    pairFolderMappingScroll.appendChild(pairFolderMappingTable);
    const pairFolderUnused = document.createElement("p");
    pairFolderUnused.className = "kus-dl-pair-folder__unused";
    pairFolderUnused.hidden = true;
    const pairFolderFoot = document.createElement("div");
    pairFolderFoot.className = "kus-dl-pair-folder__foot";
    const pairFolderReview = document.createElement("span");
    pairFolderReview.className = "kus-dl-pair-folder__review";
    pairFolderReview.setAttribute("aria-live", "polite");
    const pairFolderOrderBtn = makeButton("未対応をフォルダ順で候補化", "ghost");
    pairFolderOrderBtn.dataset.kusDlPairFolderOrder = "";
    const pairFolderApplyBtn = makeButton("確認済みペアで現在の表を置き換える", "primary");
    pairFolderApplyBtn.dataset.kusDlPairFolderApply = "";
    pairFolderApplyBtn.disabled = true;
    pairFolderFoot.append(pairFolderReview, pairFolderOrderBtn, pairFolderApplyBtn);
    pairFolderMapping.append(pairFolderMappingScroll, pairFolderUnused, pairFolderFoot);
    pairFolder.append(pairFolderHead, pairFolderGrid, pairFolderAlert, pairFolderMapping);
    const pairFolderModeActive = () => !!(pairFolderStates.source || pairFolderStates.target || pairRows.some((entry) => entry.source.folderBundle || entry.target.folderBundle));
    const folderBundleLabel = (item) => {
      const name = item.appName || `App ${item.appId}`;
      const env = `${item.guestId ? `Guest ${item.guestId}` : "通常"} / ${item.preview ? "プレビュー" : "運用"}`;
      return `${name}（App ${item.appId} / ${env}）`;
    };
    const folderBundleOptionLabel = (item) => `${folderBundleLabel(item)} — ${item.relativePath}`;
    const folderMatchLabel = (kind) => {
      if (kind === "app-name") return "アプリ名一致";
      if (kind === "app-id") return "App ID一致・要確認";
      if (kind === "position") return "フォルダ順・要確認";
      if (kind === "manual") return "手動指定";
      return "未対応";
    };
    const pairFolderMatchNeedsConfirmation = (row) => row.matchKind === "app-id" || row.matchKind === "position";
    const updatePairFolderSummaries = () => {
      const update = (side, ui3) => {
        const state3 = pairFolderStates[side];
        const loading = pairFolderActiveLoads[side] > 0;
        const resetsPairTable = pairFolderApplied || pairRows.some((entry) => entry.source.folderBundle || entry.target.folderBundle);
        ui3.box.setAttribute("aria-busy", loading ? "true" : "false");
        ui3.clear.disabled = !state3 || loading;
        ui3.clear.textContent = resetsPairTable ? "解除して表を初期化" : "解除";
        ui3.clear.setAttribute("aria-label", `${side === "source" ? "比較元（変更前）" : "比較先（変更後）"}フォルダの読込を解除${resetsPairTable ? "してペア表を初期化" : ""}`);
        ui3.summary.textContent = loading ? `${state3 ? `${state3.folderName} — ` : ""}新しいフォルダを読み込み中…` : state3 ? `${state3.folderName} — ${state3.result.bundles.length}アプリ / JSON ${state3.result.jsonFileCount}ファイル${state3.result.ignoredFileCount ? ` / JSON以外 ${state3.result.ignoredFileCount}件を除外` : ""}` : "未選択";
      };
      update("source", sourceFolderUi);
      update("target", targetFolderUi);
    };
    const renderPairFolderMapping = () => {
      const sourceState = pairFolderStates.source;
      const targetState = pairFolderStates.target;
      const ready = !!sourceState && !!targetState;
      pairFolderMapping.hidden = !ready;
      if (!ready) {
        pairFolderMappingTable.innerHTML = "";
        pairFolderReview.textContent = "比較元と比較先の両フォルダを選択してください";
        pairFolderApplyBtn.disabled = true;
        return;
      }
      const targets = targetState.result.bundles;
      const activeRows = pairFolderDraftRows.filter((row) => row.included);
      const mappedTargetKeys = activeRows.map((row) => row.targetKey).filter(Boolean);
      const usedTargetKeys = new Set(mappedTargetKeys);
      const targetUseCounts = /* @__PURE__ */ new Map();
      mappedTargetKeys.forEach((key) => targetUseCounts.set(key, (targetUseCounts.get(key) || 0) + 1));
      const duplicateTargetKeys = new Set([...targetUseCounts].filter(([, count]) => count > 1).map(([key]) => key));
      const unmapped = activeRows.filter((row) => !row.targetKey).length;
      const needsConfirmation = activeRows.filter((row) => row.targetKey && pairFolderMatchNeedsConfirmation(row) && !row.confirmed).length;
      const selectedTargetKeys = new Set(activeRows.map((row) => row.targetKey).filter(Boolean));
      const unusedTargets = targets.filter((target) => !selectedTargetKeys.has(target.endpointKey));
      const rowsHtml = pairFolderDraftRows.map((row, index) => {
        const sourceLabel = folderBundleLabel(row.source);
        const options = [
          '<option value="">比較先を選択してください</option>',
          ...targets.map((target) => {
            const selected = target.endpointKey === row.targetKey;
            const usedElsewhere = !selected && usedTargetKeys.has(target.endpointKey);
            return `<option value="${esc(target.endpointKey)}"${selected ? " selected" : ""}${usedElsewhere ? " disabled" : ""}>${esc(folderBundleOptionLabel(target))}</option>`;
          })
        ].join("");
        const duplicateTarget = row.included && !!row.targetKey && duplicateTargetKeys.has(row.targetKey);
        const requiresConfirmation = row.included && !!row.targetKey && pairFolderMatchNeedsConfirmation(row);
        const selectedTarget = targets.find((target) => target.endpointKey === row.targetKey) || null;
        const confirmationLabel = selectedTarget ? `${sourceLabel}から${folderBundleLabel(selectedTarget)}への対応を確認` : `${sourceLabel}の対応を確認`;
        const state3 = !row.included ? "対象外" : !row.targetKey ? "比較先未選択" : duplicateTarget ? "比較先が重複" : requiresConfirmation ? `<label><input type="checkbox" data-kus-dl-folder-confirm="${index}" aria-label="${esc(confirmationLabel)}"${row.confirmed ? " checked" : ""}> 対応を確認</label>` : "確認済み";
        const warning = row.included && (!row.targetKey || duplicateTarget || requiresConfirmation && !row.confirmed);
        return `<tr><td data-label="比較対象"><input type="checkbox" data-kus-dl-folder-include="${index}" aria-label="${esc(`${sourceLabel}を比較対象にする`)}"${row.included ? " checked" : ""}></td><td data-label="比較元（変更前）"><span class="kus-dl-pair-folder__app">${esc(row.source.appName || `App ${row.source.appId}`)}</span><span class="kus-dl-pair-folder__meta">App ${esc(row.source.appId)} / ${esc(row.source.guestId ? `Guest ${row.source.guestId}` : "通常")} / ${row.source.preview ? "プレビュー" : "運用"}<br>${esc(row.source.relativePath)}</span></td><td data-label="対応根拠"><span class="kus-dl-pair-folder__badge kus-dl-pair-folder__badge--${esc(row.matchKind)}">${esc(folderMatchLabel(row.matchKind))}</span></td><td data-label="比較先（変更後）"><select data-kus-dl-folder-target="${index}" aria-label="${esc(`${sourceLabel}の比較先`)}"${row.included ? "" : " disabled"}>${options}</select></td><td data-label="確認状態" class="${warning ? "kus-dl-multi__warn" : ""}">${state3}</td></tr>`;
      }).join("");
      pairFolderMappingTable.innerHTML = `<table><thead><tr><th>対象</th><th>比較元（変更前）</th><th>対応根拠</th><th>比較先（変更後）</th><th>状態</th></tr></thead><tbody>${rowsHtml}</tbody></table>`;
      pairFolderUnused.hidden = !unusedTargets.length;
      pairFolderUnused.innerHTML = unusedTargets.length ? `<label><input type="checkbox" data-kus-dl-folder-ignore-unused${pairFolderIgnoreUnusedTargets ? " checked" : ""}> 未使用の比較先 ${unusedTargets.length}件を今回の比較対象外にする</label><br>${esc(unusedTargets.map(folderBundleLabel).join(" / "))}` : "";
      const unusedNotConfirmed = unusedTargets.length > 0 && !pairFolderIgnoreUnusedTargets;
      const invalid = !activeRows.length || unmapped > 0 || duplicateTargetKeys.size > 0 || needsConfirmation > 0 || activeRows.length > MAX_PAIR_ROWS || unusedNotConfirmed || pairFolderLoadActive();
      pairFolderApplyBtn.disabled = invalid;
      pairFolderOrderBtn.disabled = pairFolderLoadActive() || !unmapped || !unusedTargets.length;
      const problems = [
        unmapped ? `未対応 ${unmapped}件` : "",
        duplicateTargetKeys.size ? `比較先重複 ${duplicateTargetKeys.size}件` : "",
        needsConfirmation ? `要確認 ${needsConfirmation}件` : "",
        unusedNotConfirmed ? `対象外未確認 ${unusedTargets.length}件` : "",
        pairFolderLoadActive() ? "フォルダ読込中" : ""
      ].filter(Boolean);
      pairFolderReview.textContent = `比較対象 ${activeRows.length}件 / 未対応 ${unmapped}件 / 要確認 ${needsConfirmation}件 / 未使用の比較先 ${unusedTargets.length}件${invalid ? ` — ${problems.join(" / ") || "比較対象を選択してください"}` : " — 確認済みペアで現在のペア表を置き換えます"}`;
    };
    const resetPairFolderDraft = () => {
      pairFolderIgnoreUnusedTargets = false;
      const sourceBundles = pairFolderStates.source?.result.bundles || [];
      const targetBundles = pairFolderStates.target?.result.bundles || [];
      if (!sourceBundles.length || !targetBundles.length) {
        pairFolderDraftRows = [];
        renderPairFolderMapping();
        return;
      }
      pairFolderDraftRows = autoMatchDiffBatchFolderBundles(sourceBundles, targetBundles).filter((row) => !!row.source).map((row) => ({
        source: row.source,
        targetKey: row.target?.endpointKey || "",
        included: true,
        confirmed: row.matchKind === "app-name",
        matchKind: row.target ? row.matchKind : "unpaired"
      }));
      pairFolderDraftDirty = true;
      renderPairFolderMapping();
    };
    const clearPairRowsForFolderReset = () => {
      pairRows.forEach((entry) => entry.row.remove());
      pairRows.length = 0;
      addPairRow();
      pairFolderApplied = false;
    };
    const refreshPairFolderControlState = () => {
      const active = pairFolderModeActive();
      const loading = pairFolderLoadActive();
      addPairBtn.disabled = active;
      pairBulkTextarea.disabled = active;
      pairBulkApply.disabled = active;
      runBtn.disabled = loading || diffRunActive || profileIoActive;
      runAllBtn.disabled = loading || diffRunActive || profileIoActive;
      runPairsBtn.disabled = loading || diffRunActive || profileIoActive;
      pairRows.forEach((entry) => {
        entry.duplicate.disabled = active;
        entry.swap.disabled = active;
        entry.remove.disabled = active || pairRows.length === 1;
        entry.duplicate.title = active ? "フォルダ比較中は対応確認表からペアを作り直してください" : "";
        entry.swap.title = active ? "フォルダ比較中は比較元・比較先フォルダを入れ替えてください" : "";
        entry.remove.title = active ? "フォルダ比較中は対応確認表で対象チェックを外して再反映してください" : "";
        [entry.source, entry.target].forEach((endpoint) => {
          endpoint.app.readOnly = active || !!endpoint.folderBundle;
          endpoint.guest.readOnly = active || !!endpoint.folderBundle;
          endpoint.preview.checkbox.disabled = active || !!endpoint.folderBundle;
        });
      });
    };
    const rootFolderName = (files) => {
      const path = String(files[0]?.webkitRelativePath || files[0]?.name || "").replace(/\\/g, "/");
      return path.includes("/") ? path.split("/")[0] : path || "選択フォルダ";
    };
    const loadPairFolder = async (side, input, invalidatedBeforeLoad) => {
      const generation = ++pairFolderLoadGeneration[side];
      const files = Array.from(input.files || []);
      if (!files.length) throw new Error("選択したフォルダにファイルがありません");
      input.value = "";
      const jsonFiles = files.filter((file) => /\.json$/i.test(file.name));
      const totalJsonBytes = jsonFiles.reduce((sum, file) => sum + Number(file.size || 0), 0);
      if (files.length > 2e3 || jsonFiles.length > 500) throw new Error("選択したフォルダのファイル数が多すぎます（全体2,000件、JSON 500件まで）");
      if (totalJsonBytes > 128 * 1024 * 1024) throw new Error("選択したフォルダのJSON合計サイズが128MBを超えています");
      let entries;
      try {
        entries = await Promise.all(files.map(async (file) => ({
          name: file.name,
          relativePath: file.webkitRelativePath || file.name,
          text: /\.json$/i.test(file.name) ? await file.text() : ""
        })));
      } catch (error) {
        if (generation !== pairFolderLoadGeneration[side]) return;
        throw error;
      }
      if (generation !== pairFolderLoadGeneration[side]) return;
      const parsed = parseDiffBatchFolderImport(entries);
      if (parsed.issues.length) {
        const shown = parsed.issues.slice(0, 3).map((issue) => issue.message).join(" / ");
        throw new Error(`${side === "source" ? "比較元" : "比較先"}フォルダを取り込めません: ${shown}${parsed.issues.length > 3 ? `（ほか ${parsed.issues.length - 3}件）` : ""}`);
      }
      if (!parsed.bundles.length) throw new Error("選択したフォルダにアプリ設定JSONがありません");
      if (parsed.bundles.length > MAX_PAIR_ROWS) throw new Error(`1フォルダから取り込めるアプリは ${MAX_PAIR_ROWS}件までです`);
      pairFolderStates[side] = { folderName: rootFolderName(files), result: parsed };
      pairFolderDraftDirty = true;
      updatePairFolderSummaries();
      resetPairFolderDraft();
      refreshPairFolderControlState();
      const invalidated = invalidateResultAfterPairConditionChange() || invalidatedBeforeLoad;
      panel.setStatus(`${side === "source" ? "比較元" : "比較先"}フォルダから ${parsed.bundles.length}アプリを読み込みました。${pairFolderStates.source && pairFolderStates.target ? "対応付けを確認してペア表へ反映してください" : "反対側のフォルダも選択してください"}${invalidated ? "。前回の結果は無効です" : ""}`, invalidated ? "warn" : "ok");
    };
    [["source", sourceFolderUi], ["target", targetFolderUi]].forEach(([side, ui3]) => {
      ui3.select.addEventListener("click", () => {
        if (multiXlsxExportActive) {
          panel.setStatus("Excelの生成が完了してからフォルダを選択してください", "warn");
          return;
        }
        ui3.input.click();
      });
      ui3.input.addEventListener("change", () => {
        if (!ui3.input.files?.length) {
          ui3.input.value = "";
          panel.setStatus("選択したフォルダにファイルがありません", "warn");
          return;
        }
        pairFolderAlert.hidden = true;
        pairFolderAlert.textContent = "";
        const invalidatedBeforeLoad = invalidateResultAfterPairConditionChange();
        pairFolderDraftDirty = true;
        pairFolderApplied = false;
        pairFolderActiveLoads[side] += 1;
        updatePairFolderSummaries();
        renderPairFolderMapping();
        refreshPairFolderControlState();
        void liteRun(panel, `${side === "source" ? "比較元" : "比較先"}フォルダを読み込み中…`, async () => {
          try {
            await loadPairFolder(side, ui3.input, invalidatedBeforeLoad);
          } catch (error) {
            pairFolderAlert.textContent = error instanceof Error ? error.message : String(error);
            pairFolderAlert.hidden = false;
            throw error;
          } finally {
            pairFolderActiveLoads[side] = Math.max(0, pairFolderActiveLoads[side] - 1);
            updatePairFolderSummaries();
            renderPairFolderMapping();
            refreshPairFolderControlState();
          }
        });
      });
      ui3.clear.addEventListener("click", () => {
        const resetAppliedPairs = pairFolderApplied || pairRows.some((entry) => entry.source.folderBundle || entry.target.folderBundle);
        pairFolderLoadGeneration[side] += 1;
        pairFolderStates[side] = null;
        ui3.input.value = "";
        pairFolderAlert.hidden = true;
        pairFolderAlert.textContent = "";
        if (resetAppliedPairs) clearPairRowsForFolderReset();
        pairFolderDraftRows = [];
        pairFolderDraftDirty = !!(pairFolderStates.source || pairFolderStates.target);
        updatePairFolderSummaries();
        resetPairFolderDraft();
        refreshPairFolderControlState();
        const invalidated = invalidateResultAfterPairConditionChange();
        panel.setStatus(`${side === "source" ? "比較元" : "比較先"}フォルダの読込を解除しました${resetAppliedPairs ? "。フォルダ由来のペア表を初期化しました" : ""}${invalidated ? "。前回の結果は無効です" : ""}`, invalidated || resetAppliedPairs ? "warn" : "info");
      });
    });
    const focusPairFolderMappingControl = (selector) => {
      pairFolderMapping.querySelector(selector)?.focus({ preventScroll: true });
    };
    pairFolderMapping.addEventListener("change", (event) => {
      const target = event.target;
      if (!target) return;
      const includeIndex = Number(target.dataset.kusDlFolderInclude);
      if (Number.isInteger(includeIndex) && pairFolderDraftRows[includeIndex] && target instanceof HTMLInputElement) {
        pairFolderDraftRows[includeIndex].included = target.checked;
        pairFolderIgnoreUnusedTargets = false;
        pairFolderDraftDirty = true;
        renderPairFolderMapping();
        focusPairFolderMappingControl(`[data-kus-dl-folder-include="${includeIndex}"]`);
        invalidateResultAfterPairConditionChange();
        return;
      }
      if (target.dataset.kusDlFolderIgnoreUnused != null && target instanceof HTMLInputElement) {
        pairFolderIgnoreUnusedTargets = target.checked;
        pairFolderDraftDirty = true;
        renderPairFolderMapping();
        focusPairFolderMappingControl("[data-kus-dl-folder-ignore-unused]");
        invalidateResultAfterPairConditionChange();
        return;
      }
      const confirmIndex = Number(target.dataset.kusDlFolderConfirm);
      if (Number.isInteger(confirmIndex) && pairFolderDraftRows[confirmIndex] && target instanceof HTMLInputElement) {
        pairFolderDraftRows[confirmIndex].confirmed = target.checked;
        pairFolderDraftDirty = true;
        renderPairFolderMapping();
        focusPairFolderMappingControl(`[data-kus-dl-folder-confirm="${confirmIndex}"]`);
        invalidateResultAfterPairConditionChange();
        return;
      }
      const targetIndex = Number(target.dataset.kusDlFolderTarget);
      if (Number.isInteger(targetIndex) && pairFolderDraftRows[targetIndex] && target instanceof HTMLSelectElement) {
        pairFolderDraftRows[targetIndex].targetKey = target.value;
        pairFolderDraftRows[targetIndex].matchKind = target.value ? "manual" : "unpaired";
        pairFolderDraftRows[targetIndex].confirmed = !!target.value;
        pairFolderIgnoreUnusedTargets = false;
        pairFolderDraftDirty = true;
        renderPairFolderMapping();
        focusPairFolderMappingControl(`[data-kus-dl-folder-target="${targetIndex}"]`);
        invalidateResultAfterPairConditionChange();
      }
    });
    pairFolderOrderBtn.addEventListener("click", () => {
      if (pairFolderLoadActive()) {
        panel.setStatus("フォルダの読込が完了してから候補を作成してください", "warn");
        return;
      }
      const targets = pairFolderStates.target?.result.bundles || [];
      const used = new Set(pairFolderDraftRows.filter((row) => row.included).map((row) => row.targetKey).filter(Boolean));
      const remainingTargets = targets.filter((target) => !used.has(target.endpointKey));
      let targetIndex = 0;
      pairFolderDraftRows.forEach((row) => {
        if (!row.included || row.targetKey || targetIndex >= remainingTargets.length) return;
        row.targetKey = remainingTargets[targetIndex].endpointKey;
        row.matchKind = "position";
        row.confirmed = false;
        targetIndex += 1;
      });
      pairFolderIgnoreUnusedTargets = false;
      pairFolderDraftDirty = true;
      renderPairFolderMapping();
      invalidateResultAfterPairConditionChange();
      panel.setStatus("未対応の組み合わせをフォルダ内の順番で候補化しました。誤対応を防ぐため、左右のアプリ名を確認してから反映してください", "warn");
    });
    pairFolderApplyBtn.addEventListener("click", () => {
      if (pairFolderLoadActive()) {
        panel.setStatus("フォルダの読込が完了してからペア表を置き換えてください", "warn");
        return;
      }
      const targets = pairFolderStates.target?.result.bundles || [];
      const targetByKey = new Map(targets.map((target) => [target.endpointKey, target]));
      const selections = pairFolderDraftRows.filter((row) => row.included).map((row) => ({
        ...row,
        target: targetByKey.get(row.targetKey) || null
      }));
      if (!selections.length || selections.some((row) => !row.target)) {
        panel.setStatus("比較対象のすべての行で比較先を選択してください", "warn");
        return;
      }
      if (selections.some((row) => pairFolderMatchNeedsConfirmation(row) && !row.confirmed)) {
        panel.setStatus("「要確認」の対応を各行で確認してからペア表を置き換えてください", "warn");
        return;
      }
      if (new Set(selections.map((row) => row.targetKey)).size !== selections.length) {
        panel.setStatus("同じ比較先を複数の比較元へ対応付けることはできません", "warn");
        return;
      }
      if (selections.length > MAX_PAIR_ROWS) {
        panel.setStatus(`一度に比較できるペアは ${MAX_PAIR_ROWS}件までです`, "warn");
        return;
      }
      pairRows.forEach((entry) => entry.row.remove());
      pairRows.length = 0;
      selections.forEach((selection) => {
        const entry = addPairRow();
        if (!entry || !selection.target) return;
        setPairEndpointFolderBundle(entry.source, selection.source);
        setPairEndpointFolderBundle(entry.target, selection.target);
        entry.match.hidden = false;
        entry.match.textContent = `フォルダ取込 / ${folderMatchLabel(selection.matchKind)}。比較元・比較先の設定JSONを固定して比較します。`;
      });
      pairFolderApplied = true;
      pairFolderDraftDirty = false;
      clearPairValidation();
      relabelPairRows();
      updatePairFolderSummaries();
      refreshPairFolderControlState();
      const invalidated = invalidateResultAfterPairConditionChange();
      panel.setStatus(`${selections.length}組をペア表へ反映しました。アプリ名・方向を確認して一括比較してください${invalidated ? "。前回の結果は無効です" : ""}`, invalidated ? "warn" : "ok");
    });
    updatePairFolderSummaries();
    const pairBulk = document.createElement("details");
    pairBulk.className = "kus-dl-pair-bulk";
    pairBulk.innerHTML = "<summary>表から複数ペアをまとめて入力</summary>";
    const pairBulkBody = document.createElement("div");
    pairBulkBody.className = "kus-dl-pair-bulk__body";
    const pairBulkTextarea = makeTextarea({ rows: 5, code: true, placeholder: "比較元App ID	比較先App ID\nまたは\n比較元App ID	比較元Guest ID	比較先App ID	比較先Guest ID" });
    pairBulkTextarea.setAttribute("aria-label", "一括登録する比較ペア");
    const pairBulkApply = makeButton("入力したペアを追加", "sub");
    pairBulkBody.append(
      makeNote("Excelなどの2列（比較元App ID・比較先App ID）、または4列（比較元App ID・比較元Guest ID・比較先App ID・比較先Guest ID）を貼り付けます。"),
      pairBulkTextarea,
      pairBulkApply
    );
    pairBulk.appendChild(pairBulkBody);
    pairBulkApply.addEventListener("click", () => {
      if (pairFolderModeActive()) {
        panel.setStatus("フォルダ比較中は表の一括貼り付けを使用できません。両フォルダを解除すると手入力へ戻ります", "warn");
        return;
      }
      const parsed = [];
      const invalidLines = [];
      pairBulkTextarea.value.split(/\r?\n/).forEach((rawLine, index) => {
        if (!rawLine.trim()) return;
        const line = rawLine.replace(/\r$/, "");
        const columns = (line.includes("	") ? line.split("	") : line.split(/[,、]/)).map((value) => value.trim());
        if (columns.length === 2) parsed.push({ source: { appId: columns[0] }, target: { appId: columns[1] } });
        else if (columns.length === 4) parsed.push({ source: { appId: columns[0], guestId: columns[1] }, target: { appId: columns[2], guestId: columns[3] } });
        else invalidLines.push(index + 1);
      });
      if (invalidLines.length) {
        panel.setStatus(`一括入力の ${invalidLines.join(", ")} 行目は2列または4列ではありません`, "warn");
        return;
      }
      if (!parsed.length) {
        panel.setStatus("追加する比較ペアを入力してください", "warn");
        return;
      }
      if (pairRows.filter((entry) => !pairRowIsBlank(entry)).length + parsed.length > MAX_PAIR_ROWS) {
        panel.setStatus(`一度に登録できるペアは ${MAX_PAIR_ROWS} 件までです`, "warn");
        return;
      }
      let added = 0;
      parsed.forEach((value) => {
        const blank = pairRows.find(pairRowIsBlank);
        if (blank) {
          blank.source.app.value = String(value.source.appId || "");
          blank.source.guest.value = String(value.source.guestId || "");
          blank.target.app.value = String(value.target.appId || "");
          blank.target.guest.value = String(value.target.guestId || "");
          added += 1;
          return;
        }
        if (addPairRow(value)) added += 1;
      });
      pairBulkTextarea.value = "";
      pairBulk.open = false;
      clearPairValidation();
      const invalidated = invalidateResultAfterPairConditionChange();
      if (!invalidated) panel.setStatus(`${added} 件の比較ペアを追加しました`, "ok");
    });
    const pairAppSearch = createAppSearchControl(panel, {
      title: "ペアへアプリ名で設定",
      targets: [
        { label: "空いている比較元", apply: (id, name, guestId) => {
          if (diffRunActive) return { message: "比較を実行中です。完了してからアプリを設定してください", tone: "warn" };
          if (pairFolderModeActive()) return { message: "フォルダ比較中は対応確認表からアプリを選択してください", tone: "warn" };
          const entry = pairRows.find((row) => !row.source.app.value.trim()) || addPairRow();
          if (!entry) return { message: `登録上限 ${MAX_PAIR_ROWS} 件に達しています`, tone: "warn" };
          entry.source.app.value = id;
          if (guestId && !entry.source.guest.value.trim()) entry.source.guest.value = guestId;
          setPairEndpointName(entry.source, name);
          clearPairRowValidation(entry);
          const invalidated = invalidateResultAfterPairConditionChange();
          return { message: invalidated ? "比較ペアを変更したため、前回の一括結果を無効にしました。再比較してください" : `App ${id} をペア ${pairRows.indexOf(entry) + 1} の比較元へ設定しました`, tone: invalidated ? "warn" : "ok" };
        } },
        { label: "空いている比較先", apply: (id, name, guestId) => {
          if (diffRunActive) return { message: "比較を実行中です。完了してからアプリを設定してください", tone: "warn" };
          if (pairFolderModeActive()) return { message: "フォルダ比較中は対応確認表からアプリを選択してください", tone: "warn" };
          const entry = pairRows.find((row) => !row.target.app.value.trim()) || addPairRow();
          if (!entry) return { message: `登録上限 ${MAX_PAIR_ROWS} 件に達しています`, tone: "warn" };
          entry.target.app.value = id;
          if (guestId && !entry.target.guest.value.trim()) entry.target.guest.value = guestId;
          setPairEndpointName(entry.target, name);
          clearPairRowValidation(entry);
          const invalidated = invalidateResultAfterPairConditionChange();
          return { message: invalidated ? "比較ペアを変更したため、前回の一括結果を無効にしました。再比較してください" : `App ${id} をペア ${pairRows.indexOf(entry) + 1} の比較先へ設定しました`, tone: invalidated ? "warn" : "ok" };
        } }
      ]
    });
    pairEditor.append(pairIntro, pairFolder, pairList, pairToolbar, pairBulk, pairAppSearch, makeNote("手入力のペアはkintone APIから取得します。フォルダ取込では両側の設定JSONだけを使い、不足分をAPIで補いません。単一比較用の設定JSONを読み込んだまま切り替えた場合は「設定JSON読込を解除」を押してください。"));
    cardApp.body.appendChild(pairEditor);
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
    allBtn.addEventListener("click", () => {
      chips.forEach((c) => {
        c.checkbox.checked = true;
      });
      invalidateResultAfterGeneralConditionChange();
    });
    noneBtn.addEventListener("click", () => {
      chips.forEach((c) => {
        c.checkbox.checked = false;
      });
      invalidateResultAfterGeneralConditionChange();
    });
    panel.body.insertBefore(cardScope.card, panel.status);
    const nAppRefs = makeCheck({
      label: "アプリID（比較対象・参照先）を比較から除外",
      checked: false,
      help: "比較対象のアプリIDと、ルックアップ・関連レコード・アプリアクションの参照先アプリIDだけを除外します"
    });
    nAppRefs.checkbox.dataset.kusDlExcludeAppReferences = "";
    const appReferenceExclusion = document.createElement("section");
    appReferenceExclusion.className = "kus-dl-common-exclusion";
    appReferenceExclusion.setAttribute("aria-labelledby", "kus-dl-common-exclusion-heading");
    const appReferenceExclusionHeading = document.createElement("h3");
    appReferenceExclusionHeading.id = "kus-dl-common-exclusion-heading";
    appReferenceExclusionHeading.className = "kus-dl-common-exclusion__heading";
    appReferenceExclusionHeading.textContent = "よく使う除外";
    const appReferenceExclusionDescription = document.createElement("p");
    appReferenceExclusionDescription.id = "kus-dl-common-exclusion-description";
    appReferenceExclusionDescription.className = "kus-dl-common-exclusion__description";
    appReferenceExclusionDescription.textContent = "比較対象のアプリIDと、ルックアップ・関連レコード・アプリアクションの参照先アプリIDだけを除外します。フィールドコードや対応付けは比較します。";
    const appReferenceExclusionNote = document.createElement("p");
    appReferenceExclusionNote.id = "kus-dl-common-exclusion-note";
    appReferenceExclusionNote.className = "kus-dl-common-exclusion__note";
    appReferenceExclusionNote.textContent = "初期状態はオフです。オン／オフを変更した後は再比較してください。差分件数・画面結果・顧客向けExcelに反映されます。";
    nAppRefs.checkbox.setAttribute("aria-describedby", `${appReferenceExclusionDescription.id} ${appReferenceExclusionNote.id}`);
    appReferenceExclusion.append(
      appReferenceExclusionHeading,
      appReferenceExclusionDescription,
      nAppRefs.label,
      appReferenceExclusionNote
    );
    const cardImport = makeCard({ title: "設定JSON読込（任意）", soft: true });
    cardImport.body.appendChild(makeNote("設定出力で保存した単体JSON、設定一括取得JSON（apps 配列）、差分バンドルJSONを指定できます。指定した側はAPI取得せずJSONを使用します。比較先JSONは単一比較専用です。"));
    const srcFile = document.createElement("input");
    srcFile.type = "file";
    srcFile.accept = ".json,application/json";
    srcFile.className = "kus-lp__file";
    srcFile.setAttribute("aria-label", "比較元設定JSON");
    const tgtFile = document.createElement("input");
    tgtFile.type = "file";
    tgtFile.accept = ".json,application/json";
    tgtFile.className = "kus-lp__file";
    tgtFile.setAttribute("aria-label", "比較先設定JSON");
    const clearImportBtn = makeButton("読込解除", "ghost");
    cardImport.body.appendChild(makeRow(srcFile, { label: "比較元JSON" }));
    cardImport.body.appendChild(makeRow(tgtFile, { label: "比較先JSON" }));
    cardImport.body.appendChild(makeRow(clearImportBtn));
    panel.body.insertBefore(cardImport.card, panel.status);
    const advDetails = makeDetails("高度な比較設定");
    const ignTa = makeTextarea({ rows: 2, code: true, placeholder: "キー / 完全パス / * ワイルドカード（改行・カンマ区切り）" });
    ignTa.setAttribute("aria-label", "比較から除外する無視キーまたは設定パス");
    advDetails.body.appendChild(makeRow(ignTa, { label: "無視キー", block: true }));
    advDetails.body.appendChild(makeNote("キー名だけの指定、fieldSettings.properties.code.label のようなパス、* を使ったパターンに対応します。結果行の「次回から除外」は、記号や大小文字を含めてもその1パスだけに一致する path: 形式で追加します。"));
    advDetails.body.appendChild(makeNote("⚠ 完全パスとワイルドカードは別アプリにもそのまま適用され、該当差分は結果から除外されます。プロファイル読込後と再比較前に内容を確認してください。"));
    const includeSame = makeCheck({ label: "同一行も差分行に含める" });
    const showResultList = makeCheck({ label: "画面に差分明細を表示（200件ずつ）", checked: true, help: "大量差分でも固まりにくいよう、明細は200件ずつ段階表示します" });
    const nView = makeCheck({ label: "ビュー/グラフ/アクション順序を無視", checked: false });
    const nPerm = makeCheck({ label: "権限/通知/カテゴリ順序を無視", checked: false });
    const nAll = makeCheck({ label: "すべての配列順序を無視", checked: false });
    const nField = makeCheck({ label: "フィールド/レイアウト順序を無視", checked: false });
    const nProcess = makeCheck({ label: "プロセスの並び順を無視", checked: false });
    const nAudit = makeCheck({ label: "監査/リビジョン情報を無視", checked: false });
    const nText = makeCheck({ label: "ラベル/説明文/ヘルプを無視", checked: false });
    const nAppearance = makeCheck({ label: "見た目/幅/座標を無視", checked: false });
    const nFileKeys = makeCheck({ label: "添付/JS/CSS fileKeyを無視", checked: false });
    const nEnabled = makeCheck({ label: "有効/無効フラグを無視", checked: false });
    const normalizationControls = {
      viewOrder: nView.checkbox,
      permissionOrder: nPerm.checkbox,
      generalArrayOrder: nAll.checkbox,
      fieldOrder: nField.checkbox,
      processOrder: nProcess.checkbox,
      appReferences: nAppRefs.checkbox,
      auditMeta: nAudit.checkbox,
      labelsAndText: nText.checkbox,
      appearance: nAppearance.checkbox,
      fileKeys: nFileKeys.checkbox,
      enabledFlags: nEnabled.checkbox
    };
    const normGrid = document.createElement("div");
    normGrid.className = "kus-lp__check-grid";
    [
      includeSame.label,
      showResultList.label,
      nView.label,
      nPerm.label,
      nAll.label,
      nField.label,
      nProcess.label,
      nAudit.label,
      nText.label,
      nAppearance.label,
      nFileKeys.label,
      nEnabled.label
    ].forEach((el) => normGrid.appendChild(el));
    advDetails.body.appendChild(normGrid);
    const profileName = makeInput({ placeholder: "例: 権限を除く標準比較", width: "medium", noSubmit: true, ariaLabel: "比較条件プロファイル名" });
    const profileSaveBtn = makeButton("比較条件を保存", "sub", { icon: "↓" });
    const profileLoadBtn = makeButton("比較条件を読込", "sub", { icon: "↑" });
    profileSaveBtn.dataset.kusDlProfile = "save";
    profileLoadBtn.dataset.kusDlProfile = "load";
    const profileFile = document.createElement("input");
    profileFile.type = "file";
    profileFile.accept = ".json,application/json";
    profileFile.hidden = true;
    profileFile.dataset.kusDlProfileFile = "load";
    advDetails.body.appendChild(makeRow(profileName, { label: "比較条件名" }));
    advDetails.body.appendChild(makeRow([profileSaveBtn, profileLoadBtn]));
    advDetails.body.appendChild(makeNote("比較セクション・無視ルール・正規化・表示設定だけをJSONで保存します。アプリID、設定値、認証情報は含みません。"));
    advDetails.body.appendChild(profileFile);
    panel.body.insertBefore(advDetails.details, panel.status);
    const runBtn = makeButton("差分比較を実行", "run", { icon: "→" });
    const runAllBtn = makeButton("複数の比較を実行", "run", { icon: "→" });
    const runPairsBtn = makeButton("登録したペアを一括比較", "run", { icon: "→" });
    runPairsBtn.dataset.kusDlRunPairs = "";
    const runRow = makeRow([runBtn, runAllBtn, runPairsBtn]);
    runRow.classList.add("kus-dl-run-row");
    panel.body.insertBefore(runRow, panel.status);
    const completionReviewBtn = makeButton("結果を確認", "sub", { icon: "↓" });
    const completionXlsxBtn = makeButton("顧客向けExcelを保存（全件）", "primary", { icon: "↓" });
    completionReviewBtn.dataset.kusDlCompletion = "review";
    completionXlsxBtn.dataset.kusDlCompletion = "xlsx";
    completionReviewBtn.setAttribute("aria-controls", "kus-dl-overview");
    const completionRow = makeRow([completionReviewBtn, completionXlsxBtn]);
    completionRow.classList.add("kus-dl-completion-row");
    completionRow.hidden = true;
    const setCompletionActionsVisible = (visible) => {
      completionReady = visible;
      completionRow.hidden = !completionReady || comparisonMode !== "single";
    };
    panel.setPrimaryAction(runBtn);
    applyComparisonMode = (mode) => {
      const changed = comparisonMode !== mode;
      comparisonMode = mode;
      panel.root.dataset.kusDlMode = mode;
      singleModeBtn.setAttribute("aria-pressed", mode === "single" ? "true" : "false");
      multiModeBtn.setAttribute("aria-pressed", mode === "multi" ? "true" : "false");
      pairModeBtn.setAttribute("aria-pressed", mode === "pairs" ? "true" : "false");
      singleModeBtn.classList.toggle("is-active", mode === "single");
      multiModeBtn.classList.toggle("is-active", mode === "multi");
      pairModeBtn.classList.toggle("is-active", mode === "pairs");
      multiControls.hidden = mode !== "multi";
      targetList.hidden = mode !== "multi";
      directionGrid.hidden = mode === "pairs";
      singleAppSearch.hidden = mode === "pairs";
      pairEditor.hidden = mode !== "pairs";
      cardImport.card.hidden = mode === "pairs";
      runBtn.hidden = mode !== "single";
      runAllBtn.hidden = mode !== "multi";
      runPairsBtn.hidden = mode !== "pairs";
      completionRow.hidden = !completionReady || mode !== "single";
      swapBtn.disabled = mode !== "single";
      swapBtn.title = mode !== "single" ? "1対1比較に切り替えると方向を入れ替えられます" : "";
      if (mode === "pairs") seedFirstPairFromSingle();
      panel.setPrimaryAction(mode === "multi" ? runAllBtn : mode === "pairs" ? runPairsBtn : runBtn);
      if (changed) invalidateResultAfterComparisonModeChange();
    };
    singleModeBtn.addEventListener("click", () => applyComparisonMode("single"));
    multiModeBtn.addEventListener("click", () => applyComparisonMode("multi"));
    pairModeBtn.addEventListener("click", () => applyComparisonMode("pairs"));
    applyComparisonMode("single");
    const cardFilter = makeCard({ title: "結果の絞り込み", soft: true });
    cardFilter.card.style.display = "none";
    const filterSection = makeSelect([["", "全セクション"]]);
    filterSection.setAttribute("aria-label", "結果のセクション絞り込み");
    const filterType = makeSelect([
      ["", "全種別"],
      ["added", "追加｜比較先のみ"],
      ["removed", "削除｜比較元のみ"],
      ["changed", "変更｜内容が異なる"],
      ["moved", "移動｜並び順が異なる"],
      ["same", "同一｜内容が一致"]
    ]);
    filterType.setAttribute("aria-label", "結果の種別絞り込み");
    const filterSearch = makeInput({ placeholder: "項目名・値で検索", width: "wide", noSubmit: true, ariaLabel: "差分結果を検索" });
    const filterClear = makeButton("クリア", "ghost");
    cardFilter.body.appendChild(makeRow([filterSection, filterType, filterClear], { label: "フィルタ" }));
    cardFilter.body.appendChild(makeRow(filterSearch, { label: "検索" }));
    const charDiffCb = makeCheck({ label: "文字単位ハイライト", checked: true, help: "変更行で「どこが変わったか」を文字単位で強調表示します" });
    const densitySelect = makeSelect([
      ["compact", "コンパクト"],
      ["standard", "標準"],
      ["comfortable", "ゆったり"]
    ], "standard");
    densitySelect.setAttribute("aria-label", "差分一覧の表示密度");
    const layoutSelect = makeSelect([
      ["split", "左右に比較"],
      ["stacked", "上下に比較（長文向け）"]
    ], "split");
    layoutSelect.setAttribute("aria-label", "差分一覧の比較レイアウト");
    cardFilter.body.appendChild(makeRow([charDiffCb.label, densitySelect, layoutSelect], { label: "表示" }));
    let filterRenderTimer;
    const resetResultPage = () => {
      resultLimit = RESULT_PAGE_SIZE;
    };
    const rerenderFromFilter = () => {
      if (!cache) return;
      resetResultPage();
      currentRowKey = "";
      rerender();
    };
    filterClear.addEventListener("click", () => {
      filterSection.value = "";
      filterType.value = "";
      filterSearch.value = "";
      rerenderFromFilter();
    });
    [filterSection, filterType].forEach((el) => el.addEventListener("change", rerenderFromFilter));
    filterSearch.addEventListener("input", () => {
      if (filterRenderTimer !== void 0) window.clearTimeout(filterRenderTimer);
      filterRenderTimer = window.setTimeout(rerenderFromFilter, 160);
    });
    charDiffCb.checkbox.addEventListener("change", () => {
      if (cache) rerender();
    });
    densitySelect.addEventListener("change", () => {
      if (cache) rerender();
    });
    layoutSelect.addEventListener("change", () => {
      if (cache) rerender();
    });
    showResultList.checkbox.addEventListener("change", () => {
      if (cache) rerender();
    });
    panel.body.insertBefore(cardFilter.card, panel.status);
    const cardResult = makeCard({ title: "結果", soft: true });
    cardResult.card.style.display = "none";
    const resultBox = document.createElement("div");
    resultBox.className = "kus-dl-result";
    resultBox.dataset.kusDlResult = "";
    cardResult.body.appendChild(resultBox);
    panel.body.insertBefore(cardResult.card, panel.status);
    const cardOut = makeCard({ title: "出力", number: 3, soft: true });
    cardOut.body.appendChild(makeNote("レビュー用 HTML は比較実行時に自動保存されます。顧客へ共有する場合は、全件または画面で絞り込んだ範囲を Excel で保存してください。Excel には差分値と取得不完全時のエラー等の原文をマスキングせず収録し、長い原文は可視シートへ分割して全文を保持するため、共有前に内容を確認してください。"));
    cardOut.body.appendChild(makeNote("変更箇所のみの HTML にも比較元・比較先の値が含まれ、匿名化・機密情報のマスキング済みではありません。比較設定を含む社内用 HTML はフィールド詳細や反映 JSON も収録するため、取り扱いに注意してください。"));
    const htmlContentMode = makeSelect([
      ["diffOnly", "レビュー用（変更箇所のみ）"],
      ["withCompared", "社内用（比較設定を含む・取扱注意）"]
    ], "diffOnly");
    htmlContentMode.setAttribute("aria-label", "HTMLに含める内容");
    cardOut.body.appendChild(makeRow(htmlContentMode, { label: "HTML内容" }));
    const expRange = makeSelect([
      ["all", "全件"],
      ["filtered", "表示中（フィルタ適用後）"]
    ], "all");
    expRange.setAttribute("aria-label", "ファイルへ出力する差分の範囲");
    cardOut.body.appendChild(makeRow(expRange, { label: "範囲" }));
    const grid = document.createElement("div");
    grid.className = "kus-lp__btn-grid";
    const bXlsx = makeButton("顧客向け Excel を保存 (.xlsx)", "primary", { icon: "↓" });
    const bHtml = makeButton("レビュー用 HTML を再出力", "sub", { icon: "↓" });
    bXlsx.dataset.kusDlExport = "xlsx";
    bHtml.dataset.kusDlExport = "html";
    grid.appendChild(bXlsx);
    grid.appendChild(bHtml);
    cardOut.body.appendChild(grid);
    let forceFullXlsxExport = false;
    completionReviewBtn.addEventListener("click", () => {
      const overview = resultBox.querySelector("[data-kus-dl-overview]");
      if (!overview) return;
      overview.focus({ preventScroll: true });
      overview.scrollIntoView({ block: "start", behavior: "auto" });
    });
    completionXlsxBtn.addEventListener("click", () => {
      if (bXlsx.disabled) return;
      forceFullXlsxExport = true;
      bXlsx.click();
    });
    panel.body.insertBefore(cardOut.card, cardResult.card);
    const workflow = document.createElement("div");
    workflow.className = "kus-dl-workflow";
    workflow.setAttribute("role", "region");
    workflow.setAttribute("aria-label", "差分比較の手順");
    const makeWorkflowStep = (key, number, title, description) => {
      const section = document.createElement("section");
      section.className = "kus-dl-step";
      section.dataset.kusDlStep = key;
      const headingId = `kus-dl-step-${key}`;
      section.setAttribute("aria-labelledby", headingId);
      section.innerHTML = `<header class="kus-dl-step__header"><span class="kus-dl-step__number" aria-hidden="true">${number}</span><div><h2 id="${headingId}">${title}</h2><p>${description}</p></div></header>`;
      return section;
    };
    const targetStep = makeWorkflowStep("target", "1", "比較対象を決める", "比較元から比較先へ、どの設定が変わったかを確認します。");
    const reviewStep = makeWorkflowStep("review", "2", "結果を確認する", "取得の完全性を確認してから、差分を順にレビューします。");
    const exportStep = makeWorkflowStep("export", "3", "結果を出力する", "顧客向け Excel または社内確認用の HTML を保存できます。");
    const configDetails = document.createElement("details");
    configDetails.className = "kus-dl-disclosure";
    configDetails.innerHTML = "<summary><span>比較範囲と詳細設定</span><small>セクション、JSON読込、無視ルール、比較条件</small></summary>";
    const configBody = document.createElement("div");
    configBody.className = "kus-dl-disclosure__body";
    configBody.append(cardScope.card, cardImport.card, advDetails.details);
    configDetails.appendChild(configBody);
    const filterDetails = document.createElement("details");
    filterDetails.className = "kus-dl-disclosure kus-dl-filter-disclosure";
    filterDetails.open = true;
    filterDetails.style.display = "none";
    filterDetails.innerHTML = "<summary><span>絞り込みと表示</span><small>セクション、種別、検索、表示方法</small></summary>";
    const filterBody = document.createElement("div");
    filterBody.className = "kus-dl-disclosure__body";
    filterBody.appendChild(cardFilter.card);
    filterDetails.appendChild(filterBody);
    const outputDetails = document.createElement("details");
    outputDetails.className = "kus-dl-disclosure kus-dl-output-disclosure";
    outputDetails.innerHTML = "<summary><span>出力設定と保存ボタン</span><small>比較後に利用できます</small></summary>";
    const outputBody = document.createElement("div");
    outputBody.className = "kus-dl-disclosure__body";
    outputBody.appendChild(cardOut.card);
    outputDetails.appendChild(outputBody);
    const reviewEmpty = document.createElement("p");
    reviewEmpty.className = "kus-dl-step__empty";
    reviewEmpty.dataset.kusDlResultEmpty = "";
    reviewEmpty.textContent = "比較を実行すると、ここに完全性と差分の一覧が表示されます。";
    targetStep.append(cardApp.card, appReferenceExclusion, configDetails, runRow, completionRow, panel.status);
    reviewStep.append(reviewEmpty, filterDetails, cardResult.card);
    exportStep.appendChild(outputDetails);
    workflow.append(targetStep, reviewStep, exportStep);
    panel.body.insertBefore(workflow, panel.result);
    const setExportControlsEnabled = (enabled) => {
      expRange.disabled = !enabled;
      bXlsx.disabled = !enabled;
      bHtml.disabled = !enabled;
      completionReviewBtn.disabled = !enabled;
      completionXlsxBtn.disabled = !enabled;
    };
    setExportControlsEnabled(false);
    let cache = null;
    let multiXlsxExports = [];
    let multiXlsxExportActive = false;
    let diffRunActive = false;
    let profileIoActive = false;
    let summaryText = "";
    let resultLimit = RESULT_PAGE_SIZE;
    let currentRowKey = "";
    let announceResultOverview = false;
    const collapsedSections = /* @__PURE__ */ new Set();
    const expandedValueKeys = /* @__PURE__ */ new Set();
    const expandedRowKeys = /* @__PURE__ */ new Set();
    let importedSourceBundle = null;
    let importedTargetBundle = null;
    function invalidateComparisonResult(statusMessage) {
      const hadResult = !!cache || multiXlsxExports.length > 0 || resultBox.childElementCount > 0;
      if (!hadResult) return false;
      cache = null;
      multiXlsxExports = [];
      currentRowKey = "";
      collapsedSections.clear();
      expandedValueKeys.clear();
      expandedRowKeys.clear();
      summaryText = "";
      resetResultPage();
      setCompletionActionsVisible(false);
      setExportControlsEnabled(false);
      resultBox.innerHTML = "";
      cardResult.card.style.display = "none";
      cardFilter.card.style.display = "none";
      filterDetails.style.display = "none";
      reviewEmpty.textContent = "比較条件が変更されました。再比較すると新しい条件の結果を表示します。";
      reviewEmpty.style.display = "";
      panel.setStatus(statusMessage, "warn");
      return true;
    }
    function invalidateResultAfterAppReferenceConditionChange() {
      invalidateComparisonResult("アプリIDの除外条件を変更したため、前回の結果と保存機能を無効にしました。新しい条件で再比較してください");
    }
    function invalidateResultAfterPairConditionChange() {
      return invalidateComparisonResult("比較ペアを変更したため、前回の一括結果と保存機能を無効にしました。新しいペアで再比較してください");
    }
    function invalidateResultAfterComparisonModeChange() {
      return invalidateComparisonResult("比較方法を変更したため、前回の結果と保存機能を無効にしました。選択した方法で再比較してください");
    }
    function invalidateResultAfterGeneralConditionChange() {
      return invalidateComparisonResult("比較範囲または比較条件を変更したため、前回の結果と保存機能を無効にしました。新しい条件で再比較してください");
    }
    function invalidateResultAfterAppSelectionChange() {
      return invalidateComparisonResult("比較するアプリまたは環境を変更したため、前回の結果と保存機能を無効にしました。新しい対象で再比較してください");
    }
    nAppRefs.checkbox.addEventListener("change", invalidateResultAfterAppReferenceConditionChange);
    chipBox.addEventListener("change", invalidateResultAfterGeneralConditionChange);
    ignTa.addEventListener("input", invalidateResultAfterGeneralConditionChange);
    includeSame.checkbox.addEventListener("change", invalidateResultAfterGeneralConditionChange);
    Object.entries(normalizationControls).forEach(([key, checkbox]) => {
      if (key !== "appReferences") checkbox.addEventListener("change", invalidateResultAfterGeneralConditionChange);
    });
    swapBtn.addEventListener("click", () => {
      if (comparisonMode !== "single") {
        panel.setStatus("このボタンでの比較方向の入れ替えは、1対1比較で利用できます", "warn");
        return;
      }
      if (importedSourceBundle || importedTargetBundle) {
        panel.setStatus("設定JSONを読み込んでいる間は方向を入れ替えられません。読込を解除してから実行してください", "warn");
        return;
      }
      const source = {
        appId: srcApp.value,
        guestId: srcGuest.value,
        preview: srcPrev.checkbox.checked,
        appName: sourceAppName
      };
      srcApp.value = tgtApp.value;
      srcGuest.value = tgtGuest.value;
      srcPrev.checkbox.checked = tgtPrev.checkbox.checked;
      setSourceName(targetRows[0]?.appName || "");
      tgtApp.value = source.appId;
      tgtGuest.value = source.guestId;
      tgtPrev.checkbox.checked = source.preview;
      setTargetName(targetRows[0], source.appName);
      const invalidated = invalidateResultAfterAppSelectionChange();
      if (!invalidated) panel.setStatus("比較元と比較先を入れ替えました。矢印の向きを確認して比較してください", "info");
    });
    srcFile.addEventListener("change", () => liteRun(panel, "比較元JSONを読み込み中…", async () => {
      const file = srcFile.files?.[0];
      if (!file) return;
      setCompletionActionsVisible(false);
      importedSourceBundle = await readSettingsBundleFile(file, { side: "source", appId: srcApp.value.trim() });
      if (!srcApp.value.trim() && importedSourceBundle?.appId) srcApp.value = String(importedSourceBundle.appId);
      setSourceName(extractAppNameFromBundle(importedSourceBundle));
      pairClearImportBtn.disabled = false;
      pairClearImportBtn.hidden = false;
      const invalidated = invalidateResultAfterAppSelectionChange();
      panel.setStatus(`比較元JSONを読み込みました: App ${importedSourceBundle?.appId || "-"}${invalidated ? "。結果を更新するため再比較してください" : ""}`, invalidated ? "warn" : "ok");
    }));
    tgtFile.addEventListener("change", () => liteRun(panel, "比較先JSONを読み込み中…", async () => {
      const file = tgtFile.files?.[0];
      if (!file) return;
      setCompletionActionsVisible(false);
      importedTargetBundle = await readSettingsBundleFile(file, { side: "target", appId: tgtApp.value.trim() });
      if (!tgtApp.value.trim() && importedTargetBundle?.appId) tgtApp.value = String(importedTargetBundle.appId);
      setTargetName(targetRows[0], extractAppNameFromBundle(importedTargetBundle));
      pairClearImportBtn.disabled = false;
      pairClearImportBtn.hidden = false;
      const invalidated = invalidateResultAfterAppSelectionChange();
      panel.setStatus(`比較先JSONを読み込みました: App ${importedTargetBundle?.appId || "-"}${invalidated ? "。結果を更新するため再比較してください" : ""}`, invalidated ? "warn" : "ok");
    }));
    const clearImportedBundles = () => {
      importedSourceBundle = null;
      importedTargetBundle = null;
      srcFile.value = "";
      tgtFile.value = "";
      pairClearImportBtn.disabled = true;
      pairClearImportBtn.hidden = true;
      setCompletionActionsVisible(false);
      const invalidated = invalidateResultAfterAppSelectionChange();
      panel.setStatus(invalidated ? "設定JSONの読込を解除し、前回の結果を無効にしました。再比較してください" : "設定JSONの読込を解除しました", invalidated ? "warn" : "info");
    };
    clearImportBtn.addEventListener("click", clearImportedBundles);
    pairClearImportBtn.addEventListener("click", clearImportedBundles);
    function readTargets() {
      const seen = /* @__PURE__ */ new Set();
      return targetRows.map((r) => ({ appId: r.app.value.trim(), guestId: r.guest.value.trim(), preview: tgtPrev.checkbox.checked, appName: r.appName })).filter((t) => t.appId).filter((t) => {
        const key = `${t.appId}::${t.guestId}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    }
    function readForm() {
      return {
        source: { appId: srcApp.value.trim(), guestId: srcGuest.value.trim(), preview: srcPrev.checkbox.checked, appName: sourceAppName },
        target: { appId: tgtApp.value.trim(), guestId: tgtGuest.value.trim(), preview: tgtPrev.checkbox.checked, appName: targetRows[0]?.appName || "" },
        scopes: chips.filter((c) => c.checkbox.checked).map((c) => c.checkbox.value),
        ignoreKeys: ignTa.value,
        includeSame: includeSame.checkbox.checked,
        normalizationPresetState: {
          viewOrder: nView.checkbox.checked,
          permissionOrder: nPerm.checkbox.checked,
          generalArrayOrder: nAll.checkbox.checked,
          fieldOrder: nField.checkbox.checked,
          processOrder: nProcess.checkbox.checked,
          appReferences: nAppRefs.checkbox.checked,
          auditMeta: nAudit.checkbox.checked,
          labelsAndText: nText.checkbox.checked,
          appearance: nAppearance.checkbox.checked,
          fileKeys: nFileKeys.checkbox.checked,
          enabledFlags: nEnabled.checkbox.checked
        }
      };
    }
    profileSaveBtn.addEventListener("click", () => {
      if (diffRunActive || profileIoActive) {
        panel.setStatus("比較または比較条件の読込が完了してから保存してください", "warn");
        return;
      }
      try {
        const form = readForm();
        const profile = buildDiffComparisonProfile({
          name: profileName.value.trim() || "比較条件",
          savedAt: (/* @__PURE__ */ new Date()).toISOString(),
          scopes: form.scopes,
          ignoreKeys: form.ignoreKeys,
          includeSame: form.includeSame,
          normalizationPresetState: form.normalizationPresetState,
          display: {
            charDiff: charDiffCb.checkbox.checked,
            showResultList: showResultList.checkbox.checked,
            density: densitySelect.value,
            layout: layoutSelect.value
          }
        });
        downloadText(`差分比較条件_${nowStamp()}.json`, serializeDiffComparisonProfile(profile), "application/json;charset=utf-8");
        panel.setStatus(`比較条件「${profile.name}」を保存しました（アプリID・設定値は含みません）`, "ok");
      } catch (error) {
        panel.setStatus(`比較条件の保存に失敗しました: ${error?.message || String(error)}`, "err");
      }
    });
    profileLoadBtn.addEventListener("click", () => {
      if (diffRunActive || profileIoActive) {
        panel.setStatus("比較が完了してから比較条件を読み込んでください", "warn");
        return;
      }
      profileFile.click();
    });
    profileFile.addEventListener("change", async () => {
      const file = profileFile.files?.[0];
      if (!file) return;
      if (diffRunActive || profileIoActive) {
        profileFile.value = "";
        panel.setStatus("比較が完了してから比較条件を読み込んでください", "warn");
        return;
      }
      profileIoActive = true;
      profileSaveBtn.disabled = true;
      profileLoadBtn.disabled = true;
      runBtn.disabled = true;
      runAllBtn.disabled = true;
      runPairsBtn.disabled = true;
      try {
        await liteRun(panel, "比較条件を読み込み中…", async () => {
          const profile = parseDiffComparisonProfile(await readTextFile(file));
          const selectedScopes = new Set(profile.scopes);
          chips.forEach((chip) => {
            chip.checkbox.checked = selectedScopes.has(chip.checkbox.value);
          });
          ignTa.value = profile.ignoreKeys;
          includeSame.checkbox.checked = profile.includeSame;
          for (const [key, checkbox] of Object.entries(normalizationControls)) {
            checkbox.checked = profile.normalizationPresetState[key] === true;
          }
          profileName.value = profile.name;
          charDiffCb.checkbox.checked = profile.display.charDiff;
          showResultList.checkbox.checked = profile.display.showResultList;
          densitySelect.value = profile.display.density;
          layoutSelect.value = profile.display.layout;
          cache = null;
          multiXlsxExports = [];
          currentRowKey = "";
          collapsedSections.clear();
          expandedValueKeys.clear();
          expandedRowKeys.clear();
          setCompletionActionsVisible(false);
          summaryText = "";
          resetResultPage();
          setExportControlsEnabled(false);
          resultBox.innerHTML = "";
          cardResult.card.style.display = "none";
          cardFilter.card.style.display = "none";
          filterDetails.style.display = "none";
          reviewEmpty.style.display = "";
          const ruleSummary = summarizeLiteIgnoreRules(profile.ignoreKeys);
          const pathWarning = ruleSummary.positionalRules ? ` 配列番号を含む位置依存ルール ${ruleSummary.positionalRules}件は、並び替え後に別の対象を隠す可能性があります。削除または見直してから再比較してください。` : ruleSummary.contextualRules ? ` 完全パス/パターン ${ruleSummary.contextualRules}件を含むため、再比較前に無視ルールを確認してください。` : "";
          const appReferenceMigrationNote = profile.normalizationPresetState.appReferences ? " 「アプリID（比較対象・参照先）」は現在、安全な参照パスだけを除外します。以前保存した条件でも一般的な app / id キーは除外しません。" : "";
          panel.setStatus(`比較条件「${profile.name}」を読み込みました（対象 ${profile.scopes.length}セクション / 無視 ${ruleSummary.total}件）。アプリと環境は変更していません。結果を更新するため再比較してください。${appReferenceMigrationNote}${pathWarning}`, "warn");
        });
      } finally {
        profileFile.value = "";
        profileIoActive = false;
        profileSaveBtn.disabled = false;
        profileLoadBtn.disabled = false;
        runBtn.disabled = diffRunActive || pairFolderLoadActive();
        runAllBtn.disabled = diffRunActive || pairFolderLoadActive();
        runPairsBtn.disabled = diffRunActive || pairFolderLoadActive();
      }
    });
    function currentFilters() {
      return {
        section: filterSection.value,
        type: filterType.value,
        keyword: filterSearch.value.trim().toLowerCase()
      };
    }
    function filteredRows() {
      if (!cache) return [];
      const f = currentFilters();
      return cache.rows.filter((r) => rowMatchesFilters(r, f));
    }
    function attachKnownAppName(bundle, appName) {
      const name = String(appName || "").trim();
      if (!bundle || !name || extractAppNameFromBundle(bundle)) return;
      if (!bundle.meta || typeof bundle.meta !== "object") bundle.meta = {};
      bundle.meta.appName = name;
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
    function navigableRows(rows = filteredRows()) {
      return rows.filter((row) => row.type !== "same" && !row._displayOnly);
    }
    function activeFilters() {
      const filters = [];
      if (filterSection.value) filters.push({ key: "section", label: filterSection.selectedOptions[0]?.textContent || filterSection.value });
      if (filterType.value) filters.push({ key: "type", label: filterType.selectedOptions[0]?.textContent || filterType.value });
      const keyword = filterSearch.value.trim();
      if (keyword) filters.push({ key: "keyword", label: `検索: ${keyword.length > 28 ? `${keyword.slice(0, 28)}…` : keyword}` });
      return filters;
    }
    function exportFilterDescription(isAll) {
      if (isAll) return "フィルターなし（比較結果の全件）";
      return buildLiteDiffFilterDescription({
        section: filterSection.value,
        sectionLabel: filterSection.selectedOptions[0]?.textContent || "",
        type: filterType.value,
        typeLabel: filterType.selectedOptions[0]?.textContent || "",
        keyword: filterSearch.value.trim()
      });
    }
    function renderActiveFilterChipsHtml() {
      const filters = activeFilters();
      if (!filters.length) return '<span class="kus-dl-filter-empty">フィルタなし · 全差分</span>';
      const chipsHtml = filters.map(
        (filter) => `<button type="button" class="kus-dl-filterchip" data-kus-dl-clear-filter="${filter.key}" aria-label="フィルタ「${esc(filter.label)}」を解除"><span>${esc(filter.label)}</span></button>`
      ).join("");
      const clearAll = filters.length > 1 ? '<button type="button" class="kus-dl-filterchip kus-dl-filterchip--all" data-kus-dl-clear-filter="all" aria-label="すべてのフィルタを解除"><span>すべて解除</span></button>' : "";
      return chipsHtml + clearAll;
    }
    function renderReviewBarHtml(rows, source, target) {
      const queue = navigableRows(rows);
      const currentIndex = currentRowKey ? queue.findIndex((row) => buildLiteDiffRowKey(row) === currentRowKey) : -1;
      const position = currentIndex >= 0 ? currentIndex + 1 : 0;
      const prevDisabled = !queue.length || currentIndex === 0;
      const nextDisabled = !queue.length || currentIndex === queue.length - 1;
      const incomplete = isIncompleteLiteDiff(cache);
      const progressLabel = position ? `${position} / 全${queue.length}件目` : `未選択 / 全${queue.length}件`;
      return `<div class="kus-dl-contextbar" role="group" aria-label="比較方向と確認位置"><div class="kus-dl-contextlane kus-dl-contextlane--before" title="${esc(`${source.name} · ${source.environment}`)}"><span class="kus-dl-contextlane__role">BEFORE · 比較元</span><strong class="kus-dl-contextlane__name">${esc(source.name)}</strong></div><div class="kus-dl-progress kus-dl-reviewbar__count" role="status" aria-live="polite" aria-atomic="true" aria-label="${esc(progressLabel + (incomplete ? "・比較不完全" : ""))}"><span class="kus-dl-progress__numbers"><strong class="kus-dl-progress__current">${position || "—"}</strong><span class="kus-dl-progress__total">/ ${queue.length}</span></span><span class="kus-dl-progress__label">${incomplete ? "比較不完全" : position ? "確認位置" : "未選択"}</span></div><div class="kus-dl-contextlane kus-dl-contextlane--after" title="${esc(`${target.name} · ${target.environment}`)}"><span class="kus-dl-contextlane__role">AFTER · 比較先</span><strong class="kus-dl-contextlane__name">${esc(target.name)}</strong></div></div><nav class="kus-dl-reviewbar" aria-label="差分レビュー操作"><span class="kus-dl-reviewbar__nav"><button type="button" class="kus-dl-navbtn" data-kus-dl-nav="prev" aria-keyshortcuts="K"${prevDisabled ? " disabled" : ""}>↑ 前 (K)</button><button type="button" class="kus-dl-navbtn" data-kus-dl-nav="next" aria-keyshortcuts="J"${nextDisabled ? " disabled" : ""}>次 (J) ↓</button></span><span class="kus-dl-reviewbar__tools"><button type="button" class="kus-dl-navbtn" data-kus-dl-sections="collapse">すべて折りたたむ</button><button type="button" class="kus-dl-navbtn" data-kus-dl-sections="expand">すべて展開</button></span><span class="kus-dl-reviewbar__filters" aria-label="有効なフィルタ">${renderActiveFilterChipsHtml()}</span></nav>`;
    }
    function focusAppliedFilter(key) {
      window.requestAnimationFrame(() => {
        const chip = resultBox.querySelector(`[data-kus-dl-clear-filter="${key}"]`);
        const input = key === "type" ? filterType : filterSection;
        const summary = filterDetails.querySelector("summary");
        const candidates = [chip, input, summary];
        const target = candidates.find((element) => {
          if (!element || element.hidden || element.getClientRects().length === 0) return false;
          const style = window.getComputedStyle(element);
          return style.display !== "none" && style.visibility !== "hidden";
        });
        target?.focus({ preventScroll: true });
      });
    }
    function focusRenderedRow(rowKey) {
      window.requestAnimationFrame(() => {
        const row = resultBox.querySelector(`[data-kus-dl-row-key="${rowKey}"]`);
        if (!row) return;
        row.focus({ preventScroll: true });
        row.scrollIntoView({ block: "center", behavior: "auto" });
      });
    }
    function moveResultFocus(delta) {
      if (!cache) return;
      const rows = filteredRows();
      const queue = navigableRows(rows);
      if (!queue.length) {
        panel.setStatus("現在のフィルタに移動できる差分がありません", "info");
        return;
      }
      const currentIndex = currentRowKey ? queue.findIndex((row) => buildLiteDiffRowKey(row) === currentRowKey) : -1;
      const nextIndex = currentIndex < 0 ? delta < 0 ? queue.length - 1 : 0 : currentIndex + delta;
      if (nextIndex < 0 || nextIndex >= queue.length) {
        panel.setStatus(nextIndex < 0 ? "最初の差分です" : "最後の差分です", "info");
        return;
      }
      const nextRow = queue[nextIndex];
      currentRowKey = buildLiteDiffRowKey(nextRow);
      collapsedSections.delete(nextRow.sectionKey || "(その他)");
      const filteredIndex = rows.indexOf(nextRow);
      if (filteredIndex >= resultLimit) {
        resultLimit = Math.ceil((filteredIndex + 1) / RESULT_PAGE_SIZE) * RESULT_PAGE_SIZE;
      }
      rerender();
      focusRenderedRow(currentRowKey);
    }
    function rerender() {
      if (!cache) {
        resultBox.innerHTML = "";
        cardResult.card.style.display = "none";
        cardFilter.card.style.display = "none";
        filterDetails.style.display = "none";
        reviewEmpty.style.display = "";
        return;
      }
      const overview = renderLiteDiffOverviewHtml(cache, { announce: announceResultOverview });
      announceResultOverview = false;
      cardResult.card.style.display = "block";
      reviewEmpty.style.display = "none";
      if (!showResultList.checkbox.checked) {
        resultBox.innerHTML = overview;
        cardFilter.card.style.display = "none";
        filterDetails.style.display = "none";
        return;
      }
      const rows = filteredRows();
      if (currentRowKey && !navigableRows(rows).some((row) => buildLiteDiffRowKey(row) === currentRowKey)) currentRowKey = "";
      const visibleRows = rows.slice(0, resultLimit);
      const summary = `<strong>${visibleRows.length}</strong> / ${rows.length}件を表示${rows.length !== cache.rows.length ? `（比較結果全体 ${cache.rows.length}件）` : ""}`;
      const source = displayBundleSide(cache.sourceBundle, "比較元");
      const target = displayBundleSide(cache.targetBundle, "比較先");
      const more = rows.length > visibleRows.length ? `<div class="kus-dl-more"><button type="button" class="kus-lp__btn kus-lp__btn--sub" data-kus-dl-more>さらに ${Math.min(RESULT_PAGE_SIZE, rows.length - visibleRows.length)} 件表示（残り ${rows.length - visibleRows.length} 件）</button></div>` : "";
      resultBox.className = `kus-dl-result kus-dl-result--${densitySelect.value} kus-dl-result--${layoutSelect.value}`;
      resultBox.innerHTML = overview + `<div class="kus-dl-sticky">${renderReviewBarHtml(rows, source, target)}</div>` + renderRowsHtml(visibleRows, charDiffCb.checkbox.checked, summary, rows, { collapsedSections, currentRowKey, expandedValueKeys, expandedRowKeys }) + more;
      cardFilter.card.style.display = "block";
      filterDetails.style.display = "";
    }
    resultBox.addEventListener("click", async (event) => {
      const target = event.target;
      const clearFilterButton = target?.closest("[data-kus-dl-clear-filter]");
      if (clearFilterButton) {
        const key = clearFilterButton.dataset.kusDlClearFilter || "";
        if (key === "all" || key === "section") filterSection.value = "";
        if (key === "all" || key === "type") filterType.value = "";
        if (key === "all" || key === "keyword") filterSearch.value = "";
        if (filterRenderTimer !== void 0) {
          window.clearTimeout(filterRenderTimer);
          filterRenderTimer = void 0;
        }
        rerenderFromFilter();
        window.requestAnimationFrame(() => {
          (resultBox.querySelector("[data-kus-dl-clear-filter]") || resultBox.querySelector('[data-kus-dl-nav="next"]'))?.focus();
        });
        return;
      }
      const mobileRowToggle = target?.closest("[data-kus-dl-mobile-row-toggle]");
      if (mobileRowToggle) {
        const rowKey = mobileRowToggle.dataset.kusDlMobileRowToggle || "";
        if (!rowKey) return;
        if (expandedRowKeys.has(rowKey)) expandedRowKeys.delete(rowKey);
        else expandedRowKeys.add(rowKey);
        rerender();
        window.requestAnimationFrame(() => {
          resultBox.querySelector(`[data-kus-dl-mobile-row-toggle="${rowKey}"]`)?.focus({ preventScroll: true });
        });
        return;
      }
      const valueToggle = target?.closest("[data-kus-dl-value-toggle]");
      if (valueToggle) {
        const valueKey = valueToggle.dataset.kusDlValueToggle || "";
        const wrapper = valueToggle.closest(".kus-dl-value");
        if (!valueKey || !wrapper) return;
        const expanded = valueToggle.getAttribute("aria-expanded") !== "true";
        wrapper.classList.toggle("is-expanded", expanded);
        wrapper.classList.toggle("is-collapsed", !expanded);
        valueToggle.setAttribute("aria-expanded", expanded ? "true" : "false");
        valueToggle.textContent = expanded ? "プレビューに戻す" : "全文を展開";
        if (expanded) expandedValueKeys.add(valueKey);
        else expandedValueKeys.delete(valueKey);
        return;
      }
      const navButton = target?.closest("[data-kus-dl-nav]");
      if (navButton) {
        moveResultFocus(navButton.dataset.kusDlNav === "prev" ? -1 : 1);
        return;
      }
      const sectionControl = target?.closest("[data-kus-dl-sections]");
      if (sectionControl) {
        const action = sectionControl.dataset.kusDlSections || "";
        if (sectionControl.dataset.kusDlSections === "collapse") {
          for (const row of filteredRows()) collapsedSections.add(row.sectionKey || "(その他)");
        } else {
          collapsedSections.clear();
        }
        rerender();
        window.requestAnimationFrame(() => {
          resultBox.querySelector(`[data-kus-dl-sections="${action}"]`)?.focus();
        });
        return;
      }
      const ignorePathButton = target?.closest("[data-kus-dl-ignore-path]");
      if (ignorePathButton) {
        const path = String(ignorePathButton.dataset.kusDlIgnorePath || "").trim();
        if (!path) return;
        if (/\[\d+\]/.test(path)) {
          panel.setStatus("配列番号を含むパスは並び替えで別の対象を指すため、自動では無視できません", "warn");
          return;
        }
        const exactRule = encodeExactIgnorePathRule(path);
        if (!exactRule) return;
        const existing = ignTa.value.split(/[\n\r,、，;；]+/).map((token) => token.trim()).filter(Boolean);
        if (!existing.some((token) => decodeExactIgnorePathRule(token) === path || token === path)) {
          ignTa.value = `${ignTa.value.trim()}${ignTa.value.trim() ? "\n" : ""}${exactRule}`;
        }
        configDetails.open = true;
        advDetails.details.open = true;
        panel.setStatus("この項目だけを無視ルールへ追加しました。現在の結果は変えず、次回比較から適用します", "warn");
        return;
      }
      const multiHtmlButton = target?.closest("[data-kus-dl-multi-html]");
      if (multiHtmlButton) {
        if (pairFolderLoadActive()) {
          panel.setStatus("フォルダの読込が完了してから前回結果を保存してください", "warn");
          return;
        }
        const index = Number(multiHtmlButton.dataset.kusDlMultiHtml);
        const item = Number.isInteger(index) ? multiXlsxExports[index] : null;
        if (!item || multiHtmlButton.disabled || multiXlsxExportActive) return;
        multiXlsxExportActive = true;
        multiHtmlButton.disabled = true;
        try {
          const result = runExportDiffHtmlStandalone(buildLiteDiffHtmlContext(
            item.cache,
            item.cache.rows,
            "all",
            "全差分",
            htmlContentMode.value
          ));
          const incomplete = isIncompleteLiteDiff(item.cache);
          panel.setStatus(`${item.label} の差分 HTML のダウンロードを開始しました: ${result.filename}${incomplete ? " — 比較結果は不完全です" : ""}`, incomplete ? "warn" : "ok");
        } catch (e) {
          panel.setStatus(`HTML出力エラー: ${e?.message || String(e)}`, "err");
        } finally {
          multiXlsxExportActive = false;
          multiHtmlButton.disabled = false;
        }
        return;
      }
      const multiXlsxButton = target?.closest("[data-kus-dl-multi-xlsx]");
      if (multiXlsxButton) {
        if (pairFolderLoadActive()) {
          panel.setStatus("フォルダの読込が完了してから前回結果を保存してください", "warn");
          return;
        }
        const index = Number(multiXlsxButton.dataset.kusDlMultiXlsx);
        const item = Number.isInteger(index) ? multiXlsxExports[index] : null;
        if (!item || multiXlsxButton.disabled || multiXlsxExportActive) return;
        const exportStartedAt = Date.now();
        multiXlsxExportActive = true;
        multiXlsxButton.disabled = true;
        try {
          panel.setStatus(`${item.label} の差分一覧 Excel を生成中…`, "busy");
          await new Promise((resolve) => window.requestAnimationFrame(() => resolve()));
          const result = runExportDiffXlsx(buildLiteDiffXlsxContext(
            item.cache,
            item.cache.rows,
            "all",
            "全件",
            "フィルターなし（比較結果の全件）"
          ));
          const incomplete = isIncompleteLiteDiff(item.cache);
          panel.setStatus(`${item.label} の差分一覧 Excel のダウンロードを開始しました: ${result.filename}${incomplete ? " — 比較結果は不完全です" : ""}`, incomplete ? "warn" : "ok");
        } catch (e) {
          panel.setStatus(`Excel出力エラー: ${e?.message || String(e)}`, "err");
        } finally {
          const cooldown = XLSX_EXPORT_COOLDOWN_MS - (Date.now() - exportStartedAt);
          if (cooldown > 0) await new Promise((resolve) => window.setTimeout(resolve, cooldown));
          multiXlsxExportActive = false;
          multiXlsxButton.disabled = false;
        }
        return;
      }
      const typeButton = target?.closest("[data-kus-dl-type-filter]");
      if (typeButton) {
        showResultList.checkbox.checked = true;
        filterType.value = typeButton.dataset.kusDlTypeFilter || "";
        rerenderFromFilter();
        focusAppliedFilter("type");
        return;
      }
      const sectionButton = target?.closest("[data-kus-dl-section-filter]");
      if (sectionButton) {
        showResultList.checkbox.checked = true;
        filterSection.value = sectionButton.dataset.kusDlSectionFilter || "";
        rerenderFromFilter();
        focusAppliedFilter("section");
        return;
      }
      if (target?.closest("[data-kus-dl-more]")) {
        resultLimit += RESULT_PAGE_SIZE;
        rerender();
      }
    });
    resultBox.addEventListener("toggle", (event) => {
      const details = event.target;
      if (!details?.matches?.("[data-kus-dl-section-key]")) return;
      const key = details.dataset.kusDlSectionKey || "";
      if (!key) return;
      if (details.open) collapsedSections.delete(key);
      else collapsedSections.add(key);
    }, true);
    panel.body.addEventListener("keydown", (event) => {
      if (!cache || !showResultList.checkbox.checked || event.altKey || event.ctrlKey || event.metaKey) return;
      const target = event.target;
      if (target?.matches('input, textarea, select, [contenteditable="true"]')) return;
      const key = event.key.toLowerCase();
      if (key !== "j" && key !== "k") return;
      event.preventDefault();
      moveResultFocus(key === "j" ? 1 : -1);
    });
    function exportCtx(forceAll = false) {
      if (!cache) throw new Error("先に差分比較を実行してください");
      const isAll = forceAll || expRange.value === "all";
      const rows = isAll ? cache.rows : filteredRows();
      const htmlContext = buildLiteDiffHtmlContext(
        cache,
        rows,
        isAll ? "all" : "filtered",
        isAll ? "全差分" : "表示中（フィルタ適用後）",
        htmlContentMode.value
      );
      return {
        ...htmlContext,
        filterDescription: exportFilterDescription(isAll)
      };
    }
    let runControlSnapshot = [];
    function lockComparisonControls() {
      runControlSnapshot = [...panel.body.querySelectorAll("button, input, textarea, select")].map((control) => [control, control.disabled]);
      runControlSnapshot.forEach(([control]) => {
        control.disabled = true;
      });
    }
    function unlockComparisonControls() {
      runControlSnapshot.forEach(([control, wasDisabled]) => {
        if (control.isConnected) control.disabled = wasDisabled;
      });
      runControlSnapshot = [];
    }
    async function runDiffTask(busyMessage, task) {
      if (pairFolderLoadActive()) {
        panel.setStatus("フォルダの読込が完了してから比較してください", "warn");
        return;
      }
      if (profileIoActive) {
        panel.setStatus("比較条件の読込が完了してから比較してください", "warn");
        return;
      }
      if (diffRunActive) {
        panel.setStatus("比較を実行中です。完了までお待ちください", "warn");
        return;
      }
      diffRunActive = true;
      lockComparisonControls();
      runBtn.disabled = true;
      runAllBtn.disabled = true;
      runPairsBtn.disabled = true;
      htmlContentMode.disabled = true;
      profileSaveBtn.disabled = true;
      profileLoadBtn.disabled = true;
      setExportControlsEnabled(false);
      try {
        await liteRun(panel, busyMessage, task);
      } finally {
        diffRunActive = false;
        unlockComparisonControls();
        runBtn.disabled = pairFolderLoadActive();
        runAllBtn.disabled = pairFolderLoadActive();
        runPairsBtn.disabled = pairFolderLoadActive();
        htmlContentMode.disabled = false;
        profileSaveBtn.disabled = profileIoActive;
        profileLoadBtn.disabled = profileIoActive;
        setExportControlsEnabled(!!cache);
      }
    }
    runPairsBtn.addEventListener("click", () => {
      if (pairFolderLoadActive()) {
        panel.setStatus("比較元・比較先フォルダの読込が完了してから一括比較してください", "warn");
        return;
      }
      clearPairValidation();
      const folderMode = pairFolderModeActive();
      if (folderMode) {
        if (!pairFolderStates.source || !pairFolderStates.target) {
          panel.setStatus("フォルダ比較では比較元と比較先の両フォルダを選択してください。片側だけをAPIで補うことはありません", "warn");
          (pairFolderStates.source ? targetFolderUi.select : sourceFolderUi.select).focus();
          return;
        }
        if (pairFolderDraftDirty || !pairFolderApplied) {
          panel.setStatus("フォルダ内アプリの対応付けを確認し、「確認済みペアで現在の表を置き換える」を押してください", "warn");
          pairFolderMapping.scrollIntoView({ block: "nearest", behavior: "auto" });
          const activeDraftRows = pairFolderDraftRows.filter((row) => row.included);
          const targetCounts = /* @__PURE__ */ new Map();
          activeDraftRows.forEach((row) => {
            if (row.targetKey) targetCounts.set(row.targetKey, (targetCounts.get(row.targetKey) || 0) + 1);
          });
          const problemIndex = pairFolderDraftRows.findIndex((row) => row.included && (!row.targetKey || (targetCounts.get(row.targetKey) || 0) > 1 || pairFolderMatchNeedsConfirmation(row) && !row.confirmed));
          if (problemIndex >= 0) {
            const problem = pairFolderDraftRows[problemIndex];
            focusPairFolderMappingControl(!problem.targetKey || (targetCounts.get(problem.targetKey) || 0) > 1 ? `[data-kus-dl-folder-target="${problemIndex}"]` : `[data-kus-dl-folder-confirm="${problemIndex}"]`);
          } else {
            const usedTargets = new Set(activeDraftRows.map((row) => row.targetKey).filter(Boolean));
            const hasUnusedTarget = (pairFolderStates.target?.result.bundles || []).some((target) => !usedTargets.has(target.endpointKey));
            if (!activeDraftRows.length) {
              focusPairFolderMappingControl("[data-kus-dl-folder-include]");
            } else if (hasUnusedTarget && !pairFolderIgnoreUnusedTargets) {
              focusPairFolderMappingControl("[data-kus-dl-folder-ignore-unused]");
            } else {
              pairFolderApplyBtn.focus();
            }
          }
          return;
        }
        const incompleteFolderRow = pairRows.find((entry) => !entry.source.folderBundle || !entry.target.folderBundle);
        if (incompleteFolderRow) {
          panel.setStatus("フォルダ比較の全ペアで、比較元と比較先の設定JSONが必要です。APIへの自動切替は行いません", "warn");
          incompleteFolderRow.source.app.focus({ preventScroll: true });
          return;
        }
      }
      const prepared = prepareDiffBatchPairs(readPairInputs(), {
        maxPairs: MAX_PAIR_ROWS,
        requireOneToOne: true,
        allowSameEndpoint: folderMode
      });
      if (prepared.issues.length) {
        showPairValidationIssues(prepared.issues);
        panel.setStatus(`${prepared.issues[0].message}${prepared.issues.length > 1 ? `（ほか ${prepared.issues.length - 1}件）` : ""}`, "warn");
        return;
      }
      if (!prepared.pairs.length) {
        panel.setStatus("比較元と比較先を入力したペアを 1 件以上登録してください", "warn");
        pairRows[0]?.source.app.focus();
        return;
      }
      if (importedSourceBundle || importedTargetBundle) {
        panel.setStatus("設定JSON読込は1対1比較専用です。読込を解除してからペア一括比較を実行してください", "warn");
        return;
      }
      const base = readForm();
      if (!base.scopes.length) {
        panel.setStatus("比較セクションを 1 つ以上選択してください", "warn");
        return;
      }
      const positionalRuleCount = summarizeLiteIgnoreRules(base.ignoreKeys).positionalRules;
      if (positionalRuleCount) {
        panel.setStatus(`配列番号を含む位置依存の無視ルールが ${positionalRuleCount}件あります。並び替えで別の対象を隠すため、削除または安定したパスへ変更してください`, "warn");
        return;
      }
      cache = null;
      multiXlsxExports = [];
      currentRowKey = "";
      collapsedSections.clear();
      expandedValueKeys.clear();
      expandedRowKeys.clear();
      setCompletionActionsVisible(false);
      setExportControlsEnabled(false);
      summaryText = "";
      resetResultPage();
      resultBox.innerHTML = "";
      cardResult.card.style.display = "none";
      cardFilter.card.style.display = "none";
      filterDetails.style.display = "none";
      reviewEmpty.style.display = "";
      runDiffTask("比較ペアを一括比較中…", async () => {
        let activeIndex = 0;
        const results = await runSequentialDiffBatch(
          prepared.pairs,
          async (pair, context) => {
            const position = activeIndex + 1;
            const sourceText = pair.source.appName || `App ${pair.source.appId}`;
            const targetText = pair.target.appName || `App ${pair.target.appId}`;
            const pairEntry = pairRows[pair.rowNumber - 1];
            const folderSourceBundle = folderMode ? pairEntry?.source.folderBundle?.bundle : null;
            const folderTargetBundle = folderMode ? pairEntry?.target.folderBundle?.bundle : null;
            if (folderMode && (!folderSourceBundle || !folderTargetBundle)) {
              throw new Error(`入力ペア ${pair.rowNumber}: フォルダ設定JSONが不足しています`);
            }
            const out = await runDiffStandalone2({
              source: pair.source,
              target: pair.target,
              scopes: base.scopes,
              ignoreKeys: base.ignoreKeys,
              includeSame: base.includeSame,
              normalizationPresetState: base.normalizationPresetState,
              importedSourceBundle: folderMode ? folderSourceBundle : context.importedSourceBundle,
              importedTargetBundle: folderMode ? folderTargetBundle : context.importedTargetBundle,
              onSourceBundle: (bundle) => {
                attachKnownAppName(bundle, pair.source.appName);
                if (!folderMode) context.onSourceBundle(bundle);
              },
              onStatus: (message) => panel.setStatus(`比較 ${position}/${prepared.pairs.length}・入力ペア ${pair.rowNumber}（${sourceText} → ${targetText}）: ${message}`, "busy")
            });
            attachKnownAppName(out.sourceBundle, pair.source.appName);
            attachKnownAppName(out.targetBundle, pair.target.appName);
            return out;
          },
          (pair, index, total) => {
            activeIndex = index;
            panel.setStatus(`比較 ${index + 1}/${total}・入力ペア ${pair.rowNumber}: App ${pair.source.appId} → App ${pair.target.appId}`, "busy");
          }
        );
        const resultRows = [];
        let succeeded = 0;
        let failed = 0;
        let incomplete = 0;
        results.forEach((result) => {
          const sourceEnv = `${result.pair.source.guestId ? `ゲスト ${result.pair.source.guestId}` : "通常スペース"} / ${result.pair.source.preview ? "プレビュー" : "運用"}`;
          const targetEnv = `${result.pair.target.guestId ? `ゲスト ${result.pair.target.guestId}` : "通常スペース"} / ${result.pair.target.preview ? "プレビュー" : "運用"}`;
          if (result.status === "rejected") {
            failed += 1;
            const errorMessage = result.error?.message || String(result.error);
            const sourceLabel2 = result.pair.source.appName ? `${result.pair.source.appName}（App ${result.pair.source.appId}）` : `App ${result.pair.source.appId}`;
            const targetLabel2 = result.pair.target.appName ? `${result.pair.target.appName}（App ${result.pair.target.appId}）` : `App ${result.pair.target.appId}`;
            resultRows.push(`<tr><td>${result.pair.rowNumber}</td><td>${esc(sourceLabel2)}<br><small>${esc(sourceEnv)}</small></td><td>${esc(targetLabel2)}<br><small>${esc(targetEnv)}</small></td><td class="kus-dl-multi__warn">失敗<br><small>${esc(errorMessage)}</small></td><td>—</td><td>—</td><td>—</td></tr>`);
            return;
          }
          succeeded += 1;
          const out = result.value;
          const sourceName = extractAppNameFromBundle(out.sourceBundle) || result.pair.source.appName;
          const targetName = extractAppNameFromBundle(out.targetBundle) || result.pair.target.appName;
          const sourceLabel = sourceName ? `${sourceName}（App ${result.pair.source.appId}）` : `App ${result.pair.source.appId}`;
          const targetLabel = targetName ? `${targetName}（App ${result.pair.target.appId}）` : `App ${result.pair.target.appId}`;
          const counts = summarizeLiteDiffRows(out.rows || []);
          const changed = contentChangedCount(counts);
          const issueCount = (out.fetchIssues || []).length;
          const partialIssueCount = (out.partialIssues || []).length;
          const needsReview = isIncompleteLiteDiff(out);
          const incompleteReasons = [
            issueCount ? `取得失敗 ${issueCount}件` : "",
            partialIssueCount ? `本文未検証 ${partialIssueCount}件` : "",
            hasIncompleteActualDiffTruncation(out.truncation || null) ? `差分上限 ${Number(out.truncation?.diffLimit || 0).toLocaleString()}件に到達` : ""
          ].filter(Boolean);
          if (needsReview) incomplete += 1;
          const comparedAt = (/* @__PURE__ */ new Date()).toISOString();
          const multiExportIndex = multiXlsxExports.push({
            label: `ペア ${result.pair.rowNumber}: ${sourceLabel} → ${targetLabel}`,
            cache: {
              rows: out.rows || [],
              fetchIssues: out.fetchIssues || [],
              partialIssues: out.partialIssues || [],
              sourceBundle: out.sourceBundle,
              targetBundle: out.targetBundle,
              scopes: base.scopes,
              ignoreKeys: base.ignoreKeys,
              normalizationPresetState: base.normalizationPresetState,
              comparedAt,
              truncation: out.truncation || null
            }
          }) - 1;
          const stateLabel = needsReview ? "要確認" : counts.actual ? "完了" : "一致";
          const pairActionLabel = `ペア ${result.pair.rowNumber}・${sourceLabel}から${targetLabel}`;
          resultRows.push(`<tr><td>${result.pair.rowNumber}</td><td>${esc(sourceLabel)}<br><small>${esc(sourceEnv)}</small></td><td>${esc(targetLabel)}<br><small>${esc(targetEnv)}</small></td><td class="${needsReview ? "kus-dl-multi__warn" : "kus-dl-multi__ok"}">${stateLabel}</td><td><span class="kus-dl-pair-breakdown"><strong>差分 ${counts.actual}</strong><small>追加 ${counts.added} / 削除 ${counts.removed} / 内容変更 ${changed} / 移動 ${counts.moved}</small></span></td><td>${incompleteReasons.length ? incompleteReasons.map((reason) => esc(reason)).join("<br>") : "なし"}</td><td><span class="kus-dl-pair-save"><button type="button" class="kus-lp__btn kus-lp__btn--sub" data-kus-dl-multi-html="${multiExportIndex}" aria-label="${esc(`${pairActionLabel}のHTMLを保存`)}">HTML</button><button type="button" class="kus-lp__btn kus-lp__btn--sub" data-kus-dl-multi-xlsx="${multiExportIndex}" aria-label="${esc(`${pairActionLabel}の顧客向けExcelを保存`)}">Excel</button></span></td></tr>`);
        });
        cardResult.card.style.display = "";
        reviewEmpty.style.display = "none";
        resultBox.innerHTML = `<div class="kus-dl-result"><div class="kus-dl-table-scroll" role="region" aria-label="ペア一括比較結果。横にスクロールできます" tabindex="0"><table class="kus-dl-multi kus-dl-multi--pairs"><caption>ペア一括比較の結果（登録順）</caption><thead><tr><th>No.</th><th>比較元<br><small>変更前</small></th><th>比較先<br><small>変更後</small></th><th>状態</th><th>差分内訳</th><th>確認事項<br><small>不完全な理由</small></th><th>保存</th></tr></thead><tbody>${resultRows.join("")}</tbody></table></div></div>`;
        const note = [failed ? `失敗 ${failed}件` : "", incomplete ? `要確認 ${incomplete}件` : ""].filter(Boolean).join(" / ");
        panel.setStatus(`ペア一括比較が完了: 成功 ${succeeded}/${prepared.pairs.length}件${note ? ` / ${note}` : ""}。各行からHTMLまたは顧客向けExcelを保存できます`, failed || incomplete ? "warn" : "ok");
      });
    });
    runAllBtn.addEventListener("click", () => {
      const targets = readTargets();
      if (!targets.length) {
        panel.setStatus("比較先アプリIDを 1 件以上入力してください", "warn");
        return;
      }
      if (importedTargetBundle) {
        panel.setStatus("比較先JSONは単一比較専用です。「差分比較を実行」を使うか、比較先JSONの読込を解除してください", "warn");
        return;
      }
      const base = readForm();
      if (!base.scopes.length) {
        panel.setStatus("比較セクションを 1 つ以上選択してください", "warn");
        return;
      }
      const positionalRuleCount = summarizeLiteIgnoreRules(base.ignoreKeys).positionalRules;
      if (positionalRuleCount) {
        panel.setStatus(`配列番号を含む位置依存の無視ルールが ${positionalRuleCount}件あります。並び替えで別の対象を隠すため、削除または安定したパスへ変更してください`, "warn");
        return;
      }
      cache = null;
      multiXlsxExports = [];
      currentRowKey = "";
      collapsedSections.clear();
      expandedValueKeys.clear();
      expandedRowKeys.clear();
      setCompletionActionsVisible(false);
      setExportControlsEnabled(false);
      summaryText = "";
      resetResultPage();
      resultBox.innerHTML = "";
      cardResult.card.style.display = "none";
      cardFilter.card.style.display = "none";
      filterDetails.style.display = "none";
      reviewEmpty.style.display = "";
      runDiffTask("全比較先を比較中…", async () => {
        const resultRows = [];
        let sharedSourceBundle = importedSourceBundle;
        let exported = 0;
        let failed = 0;
        let exportFailed = 0;
        let incomplete = 0;
        for (let i = 0; i < targets.length; i += 1) {
          const t = targets[i];
          panel.setStatus(`比較中 (${i + 1}/${targets.length}) App:${t.appId}${t.guestId ? ` / Guest:${t.guestId}` : ""}`, "busy");
          try {
            const out = await runDiffStandalone2({
              source: base.source,
              target: t,
              scopes: base.scopes,
              ignoreKeys: base.ignoreKeys,
              includeSame: base.includeSame,
              normalizationPresetState: base.normalizationPresetState,
              importedSourceBundle: sharedSourceBundle,
              onSourceBundle: (bundle) => {
                attachKnownAppName(bundle, base.source.appName);
                sharedSourceBundle = bundle;
              },
              onStatus: (m) => panel.setStatus(m, "busy")
            });
            if (!sharedSourceBundle) sharedSourceBundle = out.sourceBundle;
            attachKnownAppName(out.sourceBundle, base.source.appName);
            attachKnownAppName(out.targetBundle, t.appName);
            const counts = summarizeLiteDiffRows(out.rows || []);
            const contentChanged = contentChangedCount(counts);
            const issueCount = (out.fetchIssues || []).length;
            const partialIssueCount = (out.partialIssues || []).length;
            const needsReview = isIncompleteLiteDiff(out);
            const comparedAt = (/* @__PURE__ */ new Date()).toISOString();
            if (needsReview) incomplete += 1;
            let exportNote = "";
            try {
              runExportDiffHtmlStandalone({
                rows: out.rows,
                fetchIssues: out.fetchIssues || [],
                partialIssues: out.partialIssues || [],
                sourceBundle: out.sourceBundle,
                targetBundle: out.targetBundle,
                scopes: base.scopes,
                ignoreKeys: base.ignoreKeys,
                normalizationPresetState: base.normalizationPresetState,
                truncation: out.truncation || null,
                exportContentMode: normalizeLiteHtmlExportContentMode(htmlContentMode.value),
                exportContentLabel: getLiteHtmlExportContentLabel(htmlContentMode.value)
              });
              exported += 1;
            } catch (e) {
              exportNote = ` / HTML出力失敗: ${e?.message || String(e)}`;
              exportFailed += 1;
            }
            const targetLabel = t.appName ? `${t.appName}（App ${t.appId}）` : `App ${t.appId}`;
            const multiExportIndex = multiXlsxExports.push({
              label: targetLabel,
              cache: {
                rows: out.rows || [],
                fetchIssues: out.fetchIssues || [],
                partialIssues: out.partialIssues || [],
                sourceBundle: out.sourceBundle,
                targetBundle: out.targetBundle,
                scopes: base.scopes,
                ignoreKeys: base.ignoreKeys,
                normalizationPresetState: base.normalizationPresetState,
                comparedAt,
                truncation: out.truncation || null
              }
            }) - 1;
            resultRows.push(`<tr><td>${esc(targetLabel)}<br><small>${esc(t.guestId ? `ゲスト ${t.guestId}` : "通常スペース")} / ${t.preview ? "プレビュー" : "運用"}</small></td><td class="${needsReview || exportNote ? "kus-dl-multi__warn" : "kus-dl-multi__ok"}">${exportNote ? "出力失敗" : needsReview ? "要確認" : "完了"}${esc(exportNote)}</td><td>${counts.actual}</td><td>${counts.added}</td><td>${counts.removed}</td><td>${contentChanged}</td><td>${counts.moved}</td><td>${issueCount}${partialIssueCount ? ` / 未検証 ${partialIssueCount}` : ""}</td><td><button type="button" class="kus-lp__btn kus-lp__btn--sub" data-kus-dl-multi-xlsx="${multiExportIndex}">Excel保存</button></td></tr>`);
          } catch (e) {
            failed += 1;
            const targetLabel = t.appName ? `${t.appName}（App ${t.appId}）` : `App ${t.appId}`;
            resultRows.push(`<tr><td>${esc(targetLabel)}</td><td class="kus-dl-multi__warn">失敗: ${esc(e?.message || String(e))}</td><td colspan="6">—</td><td>—</td></tr>`);
          }
        }
        cardResult.card.style.display = "";
        reviewEmpty.style.display = "none";
        resultBox.innerHTML = `<div class="kus-dl-result"><div class="kus-dl-table-scroll" role="region" aria-label="1対多比較結果。横にスクロールできます" tabindex="0"><table class="kus-dl-multi"><caption>複数比較の結果（比較元は最初の取得結果を再利用）</caption><thead><tr><th>比較先</th><th>取得状態<br><small>件数より先に確認</small></th><th>差分</th><th>追加<br><small>比較先のみ</small></th><th>削除<br><small>比較元のみ</small></th><th>内容変更</th><th>移動</th><th>取得失敗<br><small>一部未検証</small></th><th>Excel</th></tr></thead><tbody>${resultRows.join("")}</tbody></table></div></div>`;
        const tone = failed || exportFailed || incomplete || exported !== targets.length ? "warn" : "ok";
        const note = [failed ? `比較失敗 ${failed}件` : "", exportFailed ? `HTML出力失敗 ${exportFailed}件` : "", incomplete ? `要確認 ${incomplete}件` : ""].filter(Boolean).join(" / ");
        panel.setStatus(`全比較先の比較が完了: HTMLダウンロード ${exported}/${targets.length}件開始（${getLiteHtmlExportContentLabel(htmlContentMode.value)}）${note ? ` / ${note}` : ""}`, tone);
      });
    });
    runBtn.addEventListener("click", () => {
      cache = null;
      multiXlsxExports = [];
      currentRowKey = "";
      collapsedSections.clear();
      expandedValueKeys.clear();
      expandedRowKeys.clear();
      setCompletionActionsVisible(false);
      setExportControlsEnabled(false);
      summaryText = "";
      resetResultPage();
      resultBox.innerHTML = "";
      cardResult.card.style.display = "none";
      cardFilter.card.style.display = "none";
      filterDetails.style.display = "none";
      reviewEmpty.style.display = "";
      const f = readForm();
      if (!f.scopes.length) {
        panel.setStatus("比較セクションを 1 つ以上選択してください", "warn");
        return;
      }
      const positionalRuleCount = summarizeLiteIgnoreRules(f.ignoreKeys).positionalRules;
      if (positionalRuleCount) {
        panel.setStatus(`配列番号を含む位置依存の無視ルールが ${positionalRuleCount}件あります。並び替えで別の対象を隠すため、削除または安定したパスへ変更してください`, "warn");
        return;
      }
      runDiffTask("差分比較を実行中…", async () => {
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
        attachKnownAppName(out.sourceBundle, f.source.appName);
        attachKnownAppName(out.targetBundle, f.target.appName);
        cache = {
          rows: out.rows,
          fetchIssues: out.fetchIssues || [],
          partialIssues: out.partialIssues || [],
          sourceBundle: out.sourceBundle,
          targetBundle: out.targetBundle,
          scopes: f.scopes,
          ignoreKeys: f.ignoreKeys,
          normalizationPresetState: f.normalizationPresetState,
          comparedAt: (/* @__PURE__ */ new Date()).toISOString(),
          truncation: out.truncation || null
        };
        announceResultOverview = true;
        summaryText = out.summary?.text || "完了";
        refreshFilterSectionOptions();
        rerender();
        setCompletionActionsVisible(true);
        try {
          runExportDiffHtmlStandalone(exportCtx(true));
          const incomplete = isIncompleteLiteDiff(out);
          panel.setStatus(`${summaryText} — 差分 HTML レポートのダウンロードを開始しました（${getLiteHtmlExportContentLabel(htmlContentMode.value)}）`, incomplete ? "warn" : "ok");
        } catch (e) {
          panel.setStatus(`${summaryText} — HTML出力に失敗: ${e?.message || String(e)}`, "warn");
        }
      });
    });
    bHtml.addEventListener("click", () => {
      try {
        const ctx = exportCtx();
        if (!ctx.rows.length && cache?.rows.length) {
          panel.setStatus("現在のフィルタに該当する行がありません。範囲を「全件」に戻すか、フィルタを見直してください", "warn");
          return;
        }
        runExportDiffHtmlStandalone(ctx);
        const incomplete = isIncompleteLiteDiff(cache);
        panel.setStatus(`差分 HTML のダウンロードを開始しました（${expRange.value === "all" ? "全件" : "表示中"} / ${getLiteHtmlExportContentLabel(htmlContentMode.value)}）${incomplete ? " — 元の比較結果は不完全です" : ""}`, incomplete ? "warn" : "ok");
      } catch (e) {
        panel.setStatus(`エラー: ${e?.message || String(e)}`, "err");
      }
    });
    let xlsxExportActive = false;
    bXlsx.addEventListener("click", async () => {
      if (xlsxExportActive) return;
      const exportStartedAt = Date.now();
      xlsxExportActive = true;
      setExportControlsEnabled(false);
      try {
        const snapshot = cache;
        if (!snapshot) throw new Error("先に差分比較を実行してください");
        const ctx = exportCtx(forceFullXlsxExport);
        if (!ctx.rows.length && snapshot.rows.length) {
          panel.setStatus("現在のフィルタに該当する行がありません。範囲を「全件」に戻すか、フィルタを見直してください", "warn");
          return;
        }
        panel.setStatus("差分一覧 Excel を生成中…", "busy");
        await new Promise((resolve) => window.requestAnimationFrame(() => resolve()));
        const result = runExportDiffXlsx(buildLiteDiffXlsxContext(
          snapshot,
          ctx.rows,
          ctx.exportMode,
          ctx.exportLabel,
          ctx.filterDescription
        ));
        const incomplete = isIncompleteLiteDiff(snapshot);
        panel.setStatus(`差分一覧 Excel のダウンロードを開始しました（${ctx.exportLabel} / ${ctx.rows.length}件）: ${result.filename}${incomplete ? " — 元の比較結果は不完全です" : ""}`, incomplete ? "warn" : "ok");
      } catch (e) {
        panel.setStatus(`Excel出力エラー: ${e?.message || String(e)}`, "err");
      } finally {
        const cooldown = XLSX_EXPORT_COOLDOWN_MS - (Date.now() - exportStartedAt);
        if (cooldown > 0) await new Promise((resolve) => window.setTimeout(resolve, cooldown));
        xlsxExportActive = false;
        forceFullXlsxExport = false;
        setExportControlsEnabled(!!cache);
      }
    });
  }

  // src/entries/diff-lite-entry.ts
  runOnKintonePage(() => mountDiffLitePanel(runDiffStandalone));
})();
