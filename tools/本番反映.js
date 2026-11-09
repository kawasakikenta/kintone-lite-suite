// ==========================================================================
// 本番反映.js  —  自動生成ファイル（手編集禁止）
// ==========================================================================
// このファイルは tools/統合ツール/ の npm run build (esbuild) で生成されます。
// ソース: tools/統合ツール/src/entries/deploy-lite-entry.js
//         tools/統合ツール/src/tabs/deploy-standalone.js  ← 機能の正規実装
//
// ■ 修正する場合は tools/統合ツール/src/ 配下のソースを編集し、
//   cd tools/統合ツール && npm run build で再生成してください。
// ■ このファイルを直接編集しても次回ビルドで上書きされます。
// ==========================================================================
"use strict";
(() => {
  var __defProp = Object.defineProperty;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

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

  // src/featureDefs.mjs
  var ICONS = Object.freeze({
    diff: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/></svg>',
    reflect: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>',
    deploy: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 16.5c-1.5 1.3-2 5-2 5s3.7-.5 5-2c.7-.8.7-2.1-.1-2.9-.8-.8-2.1-.8-2.9-.1z"/><path d="M12 15l-3-3a22 22 0 0 1 2-3.9A12.9 12.9 0 0 1 22 2c0 2.7-.8 7.5-6 11a22 22 0 0 1-4 2z"/><path d="M9 12H4s.6-3 2-4c1.6-1.1 5 0 5 0"/><path d="M12 15v5s3-.6 4-2c1.1-1.6 0-5 0-5"/></svg>',
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
  var FEATURE_DEFS = [
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
      key: "deploy",
      group: "change",
      groupLabel: "変更・反映",
      icon: ICONS.deploy,
      label: "本番反映",
      desc: "プレビューの未公開の変更を確認し、バックアップを取ってから本番へ反映します。",
      tabs: ["deploy"],
      tab: "deploy",
      priority: "medium",
      riskLevel: "danger",
      recommendedFor: ["プレビュー反映後の公開", "本番への一括反映"],
      usageOrder: 2.5,
      onboardingOrder: 2.5,
      badge: { tone: "caution", label: "要確認", icon: "!" }
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

  // src/constants.ts
  var TOOL_ID = "kintone-unified-suite-v2";
  var EXTERNAL_LIBRARIES = Object.freeze({
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
    })
  });
  function resolveDefaultAppId() {
    try {
      if (typeof kintone !== "undefined" && kintone?.app?.getId) {
        return String(kintone.app.getId() || "");
      }
    } catch (e) {
    }
    return "";
  }
  var DEFAULT_APP_ID = resolveDefaultAppId();
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
  var DEFAULT_GUEST_ID = DEFAULT_APP_ID ? resolveDefaultGuestId() : "";
  var DIALOG_STATE_KEY = `${TOOL_ID}:dialogState`;
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
  var SECTION_DEFS = [
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
  var META_KEYS = /* @__PURE__ */ new Set(["revision", "creator", "createdAt", "modifier", "modifiedAt"]);
  var SYSTEM_FIELD_TYPES = /* @__PURE__ */ new Set([
    "STATUS",
    "STATUS_ASSIGNEE",
    "CREATED_TIME",
    "UPDATED_TIME",
    "CREATOR",
    "MODIFIER",
    "RECORD_NUMBER",
    "CATEGORY"
  ]);
  var DEFAULT_SUBTAB_STATE = Object.freeze({
    diff: "conditions",
    reflect: "settings",
    field: "json",
    jsconfig: "editor",
    recordMgr: "status",
    er: "diagram",
    settingsExport: "export",
    analyze: "dashboard"
  });
  var TOUR_STEP_CONNECTION = {
    tab: "diff",
    diffSubTab: "conditions",
    path: "ヘッダー > 比較条件",
    selector: "#u_sourceApp",
    title: "比較元 / 比較先を決める",
    body: "上部の接続パネルで比較元・比較先のアプリIDとゲストIDを入力します。プレビュー/本番の切替もここで行います。"
  };
  var TOUR_STEP_SCOPE = {
    tab: "diff",
    diffSubTab: "conditions",
    path: "ヘッダー > 比較条件",
    selector: '[data-act="openDiffScopePicker"]',
    title: "比較対象セクションを選ぶ",
    body: "「比較対象を選ぶ」から、差分比較で確認したい設定だけを選びます。まずはフィールド・レイアウト・ビュー・プロセス管理あたりが見やすいです。"
  };
  var TOUR_STEP_NOISE = {
    tab: "diff",
    diffSubTab: "conditions",
    path: "ヘッダー > 比較条件",
    selector: "#u_ignoreKeyInput",
    title: "ノイズ差分を減らす",
    body: "無視キーや正規化プリセットを使うと、順序違い・メタ情報の差分を抑えられます。比較が荒れるときはここを先に調整します。"
  };
  var TOUR_STEP_RUN_DIFF = {
    tab: "diff",
    diffSubTab: "conditions",
    path: "ヘッダー > 比較条件",
    selector: "#u_runDiffPrimary",
    title: "差分比較を実行する",
    body: "条件が決まったら差分比較を実行します。必要ならこのまま JSON / HTML / Excel / パッチJSON として保存できます。"
  };
  var TOUR_STEP_REVIEW = {
    tab: "diff",
    diffSubTab: "conditions",
    path: "ヘッダー > 差分結果の整理",
    selector: "#u_diffSearch",
    title: "結果を絞り込んで確認する",
    body: "差分比較後は「差分結果の整理・出力」から、セクション・種別・検索で絞り込めます。ここで反映対象を見極めます。"
  };
  var TOUR_STEP_CATEGORY_VIEW = {
    tab: "diff",
    diffSubTab: "conditions",
    path: "ヘッダー > 差分結果の整理",
    selector: '[data-act="setDiffViewMode"][data-mode="category"]',
    title: "セクション別ビューで読み取る",
    body: "権限・プロセス・通知などフィールド以外の差分は「🗂 セクション別」表示が見やすいです。カテゴリ別タブ + マトリクスや遷移図で差分が直感的に把握できます（V キーで切替）。"
  };
  var TOUR_STEP_PLAN = {
    tab: "reflect",
    path: "プレビュー反映",
    selector: "#u_footerPlan",
    title: "反映プランを先に確認する",
    body: "画面下の固定バーから「実行前プラン確認」を押し、API リクエスト内容や対象セクションを確認します。"
  };
  var TOUR_STEP_APPLY = {
    tab: "reflect",
    path: "プレビュー反映",
    selector: "#u_footerApply",
    title: "比較先プレビューへ反映する",
    body: "固定バーの「プレビューへ反映」で比較先プレビューへ書き込みます。本番デプロイは kintone 管理画面から手動で実施します。"
  };
  var TOUR_STEP_RECORD = {
    tab: "design",
    subTab: "export",
    path: "設計書 > 設計書出力",
    selector: '[data-act="exportDesignMd"]',
    title: "最後に記録を残す",
    body: "作業後は設計書や差分レポートを出力して、変更内容を記録します。複数アプリをまとめて保存したい場合は「設定一括取得」も使えます。"
  };
  var GUIDED_TOUR_COURSES = Object.freeze({
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
  var GUIDED_TOUR_STEPS = Object.freeze(GUIDED_TOUR_COURSES.full.steps);

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
  var SUMMARY_LIST_LIMIT = 20;
  function summarizeList(lines, limit = SUMMARY_LIST_LIMIT) {
    const items = lines.filter(Boolean);
    if (items.length <= limit) return items.join("\n");
    return [...items.slice(0, limit), `…ほか ${items.length - limit} 件（合計 ${items.length} 件）`].join("\n");
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
  var MAX_API_FIELD_ERRORS = 5;
  function formatApiFieldErrors(errors) {
    if (!errors || typeof errors !== "object") return [];
    const lines = Object.entries(errors).flatMap(([key, value]) => (Array.isArray(value?.messages) ? value.messages : []).map((message) => `${key}: ${String(message)}`));
    const shown = lines.slice(0, MAX_API_FIELD_ERRORS);
    if (lines.length > shown.length) shown.push(`ほか ${lines.length - shown.length} 件`);
    return shown;
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
    const wrapped = new Error([baseMessage, ...formatApiFieldErrors(err?.errors), contextLine].join("\n"));
    wrapped.__apiDiag = true;
    wrapped.original = err;
    if (err?.code) wrapped.code = err.code;
    if (err?.id) wrapped.id = err.id;
    if (err?.stack) wrapped.stack = err.stack;
    return wrapped;
  }
  function withoutApiContextLines(message) {
    return String(message ?? "").split("\n").filter((line) => !/^\s*\[API\]\s/.test(line)).join("\n").trim();
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

  // src/runControl.ts
  var RUN_CANCELLED_MESSAGE = "利用者の操作で中止しました";
  var RunCancelledError = class extends Error {
    constructor(message = RUN_CANCELLED_MESSAGE) {
      super(message);
      __publicField(this, "cancelled", true);
      this.name = "RunCancelledError";
    }
  };
  var nextId = 1;
  var active = null;
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
      const finish2 = (fn) => {
        if (settled) return;
        settled = true;
        if (timer) clearTimeout(timer);
        signal?.removeEventListener("abort", onAbort);
        fn();
      };
      function onAbort() {
        finish2(() => reject(new RunCancelledError()));
      }
      timer = timeoutMs ? setTimeout(() => finish2(() => {
        const error = new Error(opts.timeoutMessage || `応答待ちが ${Math.round(timeoutMs / 1e3)} 秒を超えました（timeout）`);
        error.code = "TIMEOUT";
        reject(error);
      }), timeoutMs) : 0;
      if (signal?.aborted) {
        onAbort();
        return;
      }
      signal?.addEventListener("abort", onAbort, { once: true });
      promise.then((value) => finish2(() => resolve(value)), (error) => finish2(() => reject(error)));
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

  // src/api.ts
  function buildApiPrefix(guestId, preview) {
    const g = String(guestId || "").trim();
    if (g) return `/k/guest/${g}/v1${preview ? "/preview" : ""}`;
    return `/k/v1${preview ? "/preview" : ""}`;
  }
  var DEPLOY_PATH_SNIPPET = "app/deploy.json";
  var ERR_NO_PROD_WRITE = "本番APIへの追加・更新・削除は無効です。プレビューAPIへの書き込みのみ可能です。本番への反映はkintone管理画面から手動でデプロイしてください。";
  var ERR_NO_DEPLOY_API = "デプロイAPIの実行は無効です。本番への反映はkintone管理画面から手動でデプロイしてください。";
  var ERR_NO_RECORD_PREVIEW_API = "レコードAPIにはプレビュー用の追加・更新・削除エンドポイントがありません。レコード操作は本番REST APIを明示的な確認付きで実行します。";
  var DEFAULT_API_GET_RETRIES = 3;
  var DEFAULT_RETRY_BASE_DELAY_MS = 500;
  var DEFAULT_RETRY_MAX_DELAY_MS = 3e3;
  var API_GET_TIMEOUT_MS = 12e4;
  var FILE_TEXT_FETCH_TIMEOUT_MS = 6e4;
  var FILE_DOWNLOAD_TIMEOUT_MS = 12e4;
  var RETRIABLE_STATUS_CODES = /* @__PURE__ */ new Set([408, 409, 425, 429, 500, 502, 503, 504]);
  var RECORD_DATA_MUTATION_PATHS = /* @__PURE__ */ new Set([
    "/record.json",
    "/records.json",
    "/record/status.json",
    "/records/status.json"
  ]);
  var RECORD_CURSOR_PATH = "/records/cursor.json";
  var FILE_UPLOAD_PATH = "/file.json";
  var APP_DEPLOY_PATH = "/app/deploy.json";
  var DEPLOY_APPS_PER_REQUEST = 300;
  var apiGetMetrics = {
    calls: 0,
    retries: 0,
    failures: 0,
    lastLatencyMs: 0,
    lastError: "",
    byPath: {}
  };
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
  function assertAllowsMutatingRestCall(prefix, path, method, options = {}) {
    const m = String(method || "").toUpperCase();
    if (m === "GET" || m === "HEAD" || m === "OPTIONS") return;
    if (m !== "POST" && m !== "PUT" && m !== "DELETE" && m !== "PATCH") return;
    const rel = String(path || "").replace(/\\/g, "/");
    if (rel.includes(DEPLOY_PATH_SNIPPET)) {
      if (options.allowAppDeploy === true && path === APP_DEPLOY_PATH && m === "POST" && isPreviewRestPrefix(prefix)) return;
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
  var REVISION_CONFLICT_CODES = /* @__PURE__ */ new Set(["GAIA_CO02"]);
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
  var APP_ID_PATTERN = /^[1-9]\d*$/;
  function assertDeployGuestId(guestId) {
    const g = String(guestId || "").trim();
    if (g && !APP_ID_PATTERN.test(g)) throw new Error("ゲストスペースIDは正の整数で指定してください。");
  }
  async function requestAppDeploy(guestId, apps, revert) {
    assertDeployGuestId(guestId);
    if (!Array.isArray(apps) || !apps.length) throw new Error("反映するアプリが指定されていません。");
    if (apps.length > DEPLOY_APPS_PER_REQUEST) throw new Error(`一度に依頼できるアプリは ${DEPLOY_APPS_PER_REQUEST} 件までです（${apps.length} 件指定されました）。`);
    const seen = /* @__PURE__ */ new Set();
    const body = [];
    for (const entry of apps) {
      const app = String(entry?.app ?? "").trim();
      if (!APP_ID_PATTERN.test(app)) throw new Error(`アプリIDは正の整数で指定してください（${app || "空"}）。`);
      if (seen.has(app)) throw new Error(`同じアプリが重複して指定されています（App ${app}）。`);
      seen.add(app);
      const row = { app };
      if (entry.revision !== void 0) {
        const revision = String(entry.revision).trim();
        if (!/^\d+$/.test(revision)) throw new Error(`App ${app} のrevisionが数字ではありません。`);
        row.revision = revision;
      }
      body.push(row);
    }
    const prefix = buildApiPrefix(guestId, true);
    assertAllowsMutatingRestCall(prefix, APP_DEPLOY_PATH, "POST", { allowAppDeploy: true });
    throwIfCancelled();
    const payload = revert === true ? { apps: body, revert: true } : { apps: body };
    try {
      noteWrite();
      await kintone.api(`${prefix}${APP_DEPLOY_PATH}`, "POST", payload);
    } catch (e) {
      if (isRunCancelledError(e)) throw e;
      throw decorateRevisionConflict(
        // ログ用の要約（apps が配列の先頭要素をアプリIDとして読むため、IDの配列にする）。
        apiErrorWithContext(e, { method: "POST", prefix, path: APP_DEPLOY_PATH, payload: { apps: body.map((row) => row.app), revisions: body.map((row) => row.revision ?? ""), ...revert === true ? { revert: true } : {} } }),
        revert === true ? "変更の中止" : "本番への反映"
      );
    }
  }
  async function fetchAppDeployStatus(guestId, appIds) {
    assertDeployGuestId(guestId);
    if (!Array.isArray(appIds) || !appIds.length) return [];
    if (appIds.length > DEPLOY_APPS_PER_REQUEST) throw new Error(`一度に確認できるアプリは ${DEPLOY_APPS_PER_REQUEST} 件までです（${appIds.length} 件指定されました）。`);
    const ids = appIds.map((id) => String(id ?? "").trim());
    const invalid = ids.find((id) => !APP_ID_PATTERN.test(id));
    if (invalid !== void 0) throw new Error(`アプリIDは正の整数で指定してください（${invalid || "空"}）。`);
    const res = await apiGet(buildApiPrefix(guestId, true), APP_DEPLOY_PATH, { apps: ids });
    if (!res || !Array.isArray(res.apps)) throw new Error("反映状況の応答形式が不正です（apps がありません）。");
    return res.apps.map((row) => {
      const app = String(row?.app ?? "").trim();
      const status = typeof row?.status === "string" ? row.status : "";
      if (!app || !status) throw new Error("反映状況の応答形式が不正です（app または status がありません）。");
      return { app, status };
    });
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
  var CUSTOMIZE_BODY_MAX_BYTES = 1 * 1024 * 1024;
  var CUSTOMIZE_BODY_FETCH_CONCURRENCY = 6;
  var TEXT_LIKE_EXT = /\.(js|css|mjs|ts|jsx|tsx|json|txt|html|md)$/i;
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
  var FILE_DOWNLOAD_DEFAULT_MAX_BYTES = 20 * 1024 * 1024;
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
  var BUNDLE_FETCH_CONCURRENCY = 3;
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
  var APPS_PAGE_LIMIT = 100;
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

  // src/reflect/customizeFiles.ts
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
  var downloadCustomizeFile = async (guestId, fileKey) => {
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
    const download = opts.download || downloadCustomizeFile;
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
    const download = async (guestId, fileKey) => opts.cached?.get(fileKey) || (opts.download || downloadCustomizeFile)(guestId, fileKey);
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

  // src/deploy/backup.ts
  function customizeFileKeys(bundle) {
    const keys = /* @__PURE__ */ new Set();
    const section = bundle?.sections?.customizeSettings;
    for (const platform of ["desktop", "mobile"]) for (const kind of ["js", "css"]) {
      const list2 = section?.[platform]?.[kind];
      if (!Array.isArray(list2)) continue;
      for (const item of list2) if (item?.type === "FILE" && typeof item.file?.fileKey === "string" && item.file.fileKey) keys.add(item.file.fileKey);
    }
    return keys;
  }
  async function buildDeployBackup(opts) {
    const deploy = opts.mode === "deploy";
    const bundles = [];
    const unavailableFiles = [];
    const lostFiles = [];
    let done = 0;
    for (const target of opts.targets) {
      const source = deploy ? target.productionBundle : target.previewBundle;
      const other = deploy ? target.previewBundle : target.productionBundle;
      if (!source) throw new Error(`App ${target.appId} のバックアップ元の設定がありません。`);
      let bundle = deepClone(source);
      const customizeChanged = target.sections.some((section) => section.sectionKey === "customizeSettings" && section.status === "change");
      if (customizeChanged && bundle.sections?.customizeSettings && typeof bundle.sections.customizeSettings === "object") {
        const embedded = await embedCustomizeFileContents(bundle.sections.customizeSettings, { guestId: target.guestId });
        bundle = { ...bundle, sections: { ...bundle.sections, customizeSettings: embedded.section } };
        const kept = customizeFileKeys(other);
        for (const item of embedded.unavailable) {
          (kept.has(item.fileKey) ? unavailableFiles : lostFiles).push({ appId: target.appId, name: item.name, reason: item.reason });
        }
      }
      bundles.push(bundle);
      done += 1;
      opts.onProgress?.(done, opts.targets.length);
    }
    const scopes = [...new Set(bundles.flatMap((bundle) => Object.keys(bundle.sections || {})))];
    return {
      file: { kind: "kintone-deploy-backup", version: 1, generatedAt: (/* @__PURE__ */ new Date()).toISOString(), mode: opts.mode, environment: deploy ? "production" : "preview", scopes, bundles },
      unavailableFiles,
      lostFiles
    };
  }
  function downloadBackupFile(fileName, json) {
    const blob = new Blob([json], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = fileName;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5e3);
  }

  // src/kintone-enums.ts
  var FIELD_TYPE_JP = {
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
  var ENTITY_TYPE_JP = {
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
  var VIEW_TYPE_JP = {
    LIST: "表形式",
    CALENDAR: "カレンダー形式",
    CUSTOM: "カスタマイズ"
  };
  var VIEW_BUILTIN_TYPE_JP = {
    ASSIGNEE: "作業者ビュー",
    UNDONE: "未完了レコード",
    ACTIVE_BY_USER: "自分が処理すべきレコード",
    RECORDS_OF_USER: "自分が関わるレコード"
  };
  var VIEW_DEVICE_JP = {
    ANY: "PC・モバイル両方",
    DESKTOP: "PC版のみ"
  };
  var CHART_TYPE_JP = {
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
  var CHART_MODE_JP = {
    NORMAL: "通常",
    STACKED: "積み上げ",
    PERCENTAGE: "100%積み上げ"
  };
  var AGGREGATION_TYPE_JP = {
    COUNT: "レコード数",
    SUM: "合計",
    AVG: "平均",
    MAX: "最大値",
    MIN: "最小値"
  };
  var GROUP_PER_JP = {
    YEAR: "年",
    QUARTER: "四半期",
    MONTH: "月",
    WEEK: "週",
    DAY: "日",
    HOUR: "時",
    MINUTE: "分"
  };
  var REPORT_SORT_BY_JP = {
    TOTAL: "集計値",
    GROUP1: "分類1",
    GROUP2: "分類2",
    GROUP3: "分類3"
  };
  var REPORT_SORT_ORDER_JP = {
    ASC: "小さい順",
    DESC: "大きい順"
  };
  var PERIODIC_REPORT_EVERY_JP = {
    YEAR: "毎年",
    QUARTER: "四半期ごと",
    MONTH: "毎月",
    WEEK: "毎週",
    DAY: "毎日",
    HOUR: "毎時"
  };
  var DAY_OF_WEEK_JP = {
    SUNDAY: "日曜日",
    MONDAY: "月曜日",
    TUESDAY: "火曜日",
    WEDNESDAY: "水曜日",
    THURSDAY: "木曜日",
    FRIDAY: "金曜日",
    SATURDAY: "土曜日"
  };
  var PROCESS_ASSIGNEE_TYPE_JP = {
    ONE: "候補から作業者を1人選ぶ",
    ANY: "候補のうち誰か1人が作業する",
    ANYONE: "候補のうち誰か1人が作業する",
    ALL: "候補の全員が作業する"
  };
  var RESOURCE_TYPE_JP = {
    URL: "URL指定",
    FILE: "ファイル指定"
  };
  var CUSTOMIZE_SCOPE_JP = {
    ALL: "全ユーザー",
    ADMIN: "管理者のみ",
    NONE: "無効"
  };
  var ICON_TYPE_JP = {
    PRESET: "プリセット",
    FILE: "アップロードファイル"
  };
  var APP_THEME_JP = {
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
  var TITLE_SELECTION_JP = {
    AUTO: "自動選択",
    MANUAL: "手動指定"
  };
  var ROUNDING_MODE_JP = {
    HALF_EVEN: "四捨五入（偶数丸め）",
    UP: "切り上げ",
    DOWN: "切り捨て"
  };
  var NUMBER_FORMAT_JP = {
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
  var ALIGN_JP = {
    HORIZONTAL: "横並び",
    VERTICAL: "縦並び"
  };
  var UNIT_POSITION_JP = {
    BEFORE: "前につける",
    AFTER: "後につける"
  };
  var LINK_PROTOCOL_JP = {
    WEB: "Webサイトのアドレス",
    CALL: "電話番号",
    MAIL: "メールアドレス"
  };
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

  // src/diff/label-dict.ts
  var VALUE_LABELS = {
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
  var PROP_LABELS = {
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
  var FIELD_SETTING_LABELS = {
    label: "フィールド名",
    name: "フィールド名",
    code: "フィールドコード",
    type: "フィールドの種類",
    noLabel: "フィールド名を表示しない",
    required: "必須項目にする",
    unique: "値の重複を禁止する",
    defaultValue: "初期値",
    defaultNowValue: "レコード登録時の日時を初期値にする",
    description: "説明",
    minLength: "文字数（最小）",
    maxLength: "文字数（最大）",
    minValue: "数値の制限（最小）",
    maxValue: "数値の制限（最大）",
    expression: "計算式",
    hideExpression: "計算式を表示しない",
    options: "選択肢",
    protocol: "入力値の種類",
    displayScale: "小数点以下の表示桁数",
    digit: "桁区切りを表示する",
    unit: "単位記号",
    unitPosition: "単位記号の表示位置",
    align: "選択肢の並び",
    format: "表示形式",
    entities: "選択候補",
    fields: "テーブル内のフィールド",
    referenceTable: "関連レコード一覧設定",
    lookup: "ルックアップ設定",
    condition: "表示するレコードの条件",
    displayFields: "表示するフィールド",
    filterCond: "絞り込み条件",
    relatedApp: "参照するアプリ",
    size: "一度に表示する最大レコード数",
    sort: "ソート",
    relatedKeyField: "コピー元のフィールド",
    fieldMappings: "ほかのフィールドのコピー",
    lookupPickerFields: "コピー元のレコード選択時に表示するフィールド",
    field: "自アプリのフィールド",
    relatedField: "参照するアプリのフィールド",
    app: "参照するアプリID",
    thumbnailSize: "サムネイルの大きさ",
    openGroup: "グループの初期表示",
    enabled: "有効状態",
    index: "並び順"
  };
  function labelOfProp(key) {
    if (!key) return "";
    return PROP_LABELS[key]?.label || FIELD_SETTING_LABELS[key] || String(key);
  }
  var PERMISSION_KEYS = /* @__PURE__ */ new Set([
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

  // src/reflect/sections.ts
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

  // src/reflect/changeSummary.ts
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
  function labelOnly(code, hint, labels) {
    if (typeof hint === "string" && hint) return hint;
    return dictGet(labels, code) || code;
  }
  function fieldName(code, labels, hint) {
    const label = labelOnly(code, hint, labels);
    return label && label !== code ? `${label}（${code}）` : code;
  }
  function entityOf(element) {
    return isObj(element) && isObj(element.entity) ? element.entity : element;
  }
  function entityText(entity, labels) {
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
    if (type === "FIELD_ENTITY" || type === "CUSTOM_FIELD") return `フィールド値「${fieldName(code, labels)}」`;
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
  function elementText(key, element, labels, section) {
    if (!isObj(element)) {
      const text = String(element);
      return key === "fields" && section === "viewSettings" ? fieldName(text, labels) : clip(text);
    }
    if (key === "groups") return `${fieldName(String(element.code ?? ""), labels)}${element.per ? ` ${dictGet(GROUP_PER_JP, String(element.per)) ?? element.per}単位` : ""}`;
    if (key === "aggregations") return `${dictGet(AGGREGATION_TYPE_JP, String(element.type)) ?? element.type ?? ""}${element.code ? ` ${fieldName(String(element.code), labels)}` : ""}`.trim();
    if (key === "sorts") return `${dictGet(REPORT_SORT_BY_JP, String(element.by)) ?? element.by ?? ""} ${dictGet(REPORT_SORT_ORDER_JP, String(element.order)) ?? element.order ?? ""}`.trim();
    if (key === "mappings") {
      const from = element.srcType === "RECORD_URL" ? "レコードのURL" : element.srcField ?? element.sourceField ?? "";
      const to = element.destType === "RECORD_URL" ? "レコードのURL" : element.destField ?? "";
      return `${from} → ${to}`;
    }
    if (key === "fieldMappings") return `${element.field ?? ""} ← ${element.relatedField ?? ""}`;
    if (isObj(element.entity) || element.type && own(element, "code") && !element.name) return entityText(entityOf(element), labels);
    return clip(String(element.name ?? element.code ?? element.id ?? stable(element)));
  }
  function arrayLine(key, label, before, after, labels, section) {
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
    const text = (items) => listText(items.map((element) => elementText(key, element, labels, section)));
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
  function entityListLines(label, beforeList, afterList, labels) {
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
        removed.push(entityText(entityOf(element), labels));
        continue;
      }
      matched.add(peer);
      if (same(element, peer)) continue;
      const keys = /* @__PURE__ */ new Set([...Object.keys(isObj(element) ? element : {}), ...Object.keys(isObj(peer) ? peer : {})]);
      const diffs = [...keys].filter((key) => !["entity", "type", "code", "name"].includes(key) && !same(get(element, key), get(peer, key))).map((key) => `${labelOfProp(key)} ${fmt(get(element, key), key)} → ${fmt(get(peer, key), key)}`);
      if (diffs.length) changed.push(`${label} ${entityText(entityOf(element), labels)}: ${diffs.join("、")}`);
    }
    const added = afterList.filter((element) => !matched.has(element)).map((element) => `${entityText(entityOf(element), labels)}${permissionText(element)}`);
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
  var entitiesSpecial = (labels) => (before, after, label) => entityListLines(label, list(before), list(after), labels);
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
  function fieldItems(before, after, labels, push) {
    const bp = get(before, "properties"), ap = get(after, "properties");
    if (!isObj(bp) || !isObj(ap)) throw new Error("フィールド設定の形式が不正です。");
    const walk = (b, a, parentLabel) => {
      for (const code of [...Object.keys(a), ...Object.keys(b).filter((key) => !own(a, key))]) {
        const bd = get(b, code), ad = get(a, code), definition = ad ?? bd;
        const label = labelOnly(code, get(definition, "label"), labels);
        const withCode = label !== code ? `${label}（${code}）` : code;
        const name = parentLabel ? `${parentLabel} / ${withCode}` : withCode;
        if (bd === void 0 || ad === void 0) {
          push(ad === void 0 ? "削除" : "追加", name, fieldBrief(definition));
          continue;
        }
        const ignore = /* @__PURE__ */ new Set(["fields"]);
        const bc = get(bd, "code"), ac = get(ad, "code");
        if (bc === void 0 || ac === void 0 || bc === ac) ignore.add("code");
        const lines = attrLines(bd, ad, { ignore, over: FIELD_ATTR_LABELS, typeDict: FIELD_TYPE_JP, labels, section: "fieldSettings", special: { options: (x, y, l) => optionLines(x, y, l) } });
        if (lines.length) push("変更", name, lines);
        if (isObj(bd.fields) || isObj(ad.fields)) walk(isObj(bd.fields) ? bd.fields : {}, isObj(ad.fields) ? ad.fields : {}, label);
      }
    };
    walk(bp, ap, null);
  }
  function scanLayout(layout, labels) {
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
          walk(list(node.layout), `グループ「${fieldName(node.code, labels, node.label)}」`);
        } else if (node.type === "SUBTABLE" && typeof node.code === "string") {
          place(node, `${prefix}${i + 1}行目`);
          const table = `テーブル「${fieldName(node.code, labels)}」`;
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
  function layoutItems(before, after, labels, push) {
    const bl = get(before, "layout"), al = get(after, "layout");
    if (!Array.isArray(bl) || !Array.isArray(al)) throw new Error("レイアウトの形式が不正です。");
    const b = scanLayout(bl, labels), a = scanLayout(al, labels);
    let count = 0;
    const emit2 = (kind, name, details) => {
      count += 1;
      push(kind, name, details);
    };
    for (const [code, now] of a.placed) {
      const nameOf = (placed) => fieldName(code, labels, placed.node.type === "GROUP" ? placed.node.label : void 0);
      const prev = b.placed.get(code);
      if (!prev) {
        emit2("追加", nameOf(now), [`配置: ${now.where}`]);
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
      lines.push(...attrLines(prev.node, now.node, { ignore: /* @__PURE__ */ new Set(["code", "type", "size", "layout", "fields", "elementId"]), over: LAYOUT_ATTR_LABELS, labels }));
      if (lines.length) emit2("変更", nameOf(now), lines);
    }
    for (const [code, prev] of b.placed) if (!a.placed.has(code)) emit2("削除", fieldName(code, labels, prev.node.type === "GROUP" ? prev.node.label : void 0), [`配置: ${prev.where} → なし`]);
    const plainLines = { 削除: [], 追加: [], 変更: [] };
    for (const type of /* @__PURE__ */ new Set([...b.plain.keys(), ...a.plain.keys()])) {
      const x = b.plain.get(type) || [], y = a.plain.get(type) || [], name = dictGet(LAYOUT_PLAIN_LABELS, type) ?? type;
      if (x.length !== y.length) {
        plainLines[x.length > y.length ? "削除" : "追加"].push(`${name}: ${x.length}個 → ${y.length}個`);
        continue;
      }
      const texts = (items) => items.map((item) => String(item.label ?? ""));
      if (type === "LABEL" && !same(texts(x), texts(y))) plainLines.変更.push(arrayLine("label", `${name}の内容`, texts(x), texts(y), labels, "layoutSettings"));
      const sizes = (items) => items.map((item) => stable(item.size ?? null));
      if (!same(sizes(x), sizes(y))) plainLines.変更.push(`${name}の大きさを変更`);
    }
    for (const kind of ["削除", "変更", "追加"]) if (plainLines[kind].length) emit2(kind, "ラベル・スペース・罫線", plainLines[kind]);
    if (!count && !same(bl, al)) emit2("変更", "レイアウト", ["行や要素の並びを変更"]);
  }
  function namedItems(sectionKey, before, after, labels, push) {
    const property = sectionKey === "viewSettings" ? "views" : sectionKey === "reportSettings" ? "reports" : "actions";
    const bm = get(before, property), am = get(after, property);
    if (!isObj(bm) || !isObj(am)) throw new Error("設定の形式が不正です。");
    const over = sectionKey === "viewSettings" ? VIEW_ATTR_LABELS : sectionKey === "reportSettings" ? REPORT_ATTR_LABELS : ACTION_ATTR_LABELS;
    const special = {
      index: (x, y, label) => [`${label}: ${ordinal(x)} → ${ordinal(y)}`],
      entities: entitiesSpecial(labels),
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
      const lines = attrLines(bv, av, { ignore, over, typeDict: VIEW_TYPE_JP, labels, section: sectionKey, special });
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
  function processItems(before, after, labels, push) {
    if (!isObj(before) || !isObj(after)) throw new Error("プロセス管理の形式が不正です。");
    if (before.enable !== after.enable) push("変更", "プロセス管理", [`有効化: ${fmt(before.enable, "enable")} → ${fmt(after.enable, "enable")}`]);
    const assignee = (x, y) => {
      const lines = [];
      if (get(x, "type") !== get(y, "type")) lines.push(`作業者の選択方式: ${fmt(get(x, "type"), "type", PROCESS_ASSIGNEE_TYPE_JP)} → ${fmt(get(y, "type"), "type", PROCESS_ASSIGNEE_TYPE_JP)}`);
      return [...lines, ...entityListLines("作業者", list(get(x, "entities")), list(get(y, "entities")), labels)];
    };
    const bs = isObj(before.states) ? before.states : {}, as = isObj(after.states) ? after.states : {};
    const stateBrief = (state3) => {
      const out = ["種類: 状態"];
      const entities = list(get(get(state3, "assignee"), "entities"));
      if (entities.length) out.push(`作業者: ${listText(entities.map((entity) => entityText(entityOf(entity), labels)))}`);
      return out;
    };
    for (const name of [...Object.keys(as), ...Object.keys(bs).filter((key) => !own(as, key))]) {
      const bv = get(bs, name), av = get(as, name);
      if (bv === void 0 || av === void 0) {
        push(av === void 0 ? "削除" : "追加", name, stateBrief(av ?? bv));
        continue;
      }
      const lines = attrLines(bv, av, { ignore: /* @__PURE__ */ new Set(["name"]), over: { index: "表示順", assignee: "作業者" }, labels, section: "processSettings", special: { index: (x, y, label) => [`${label}: ${ordinal(x)} → ${ordinal(y)}`], assignee } });
      if (lines.length) push("変更", name, lines);
    }
    const actionKey = (action) => `${action.name ?? ""}\0${action.from ?? ""}\0${action.to ?? ""}`;
    const actionName = (action) => `${action.name ?? "（名称なし）"}（${action.from ?? "?"} → ${action.to ?? "?"}）`;
    const actionSpecial = { executableUser: (x, y) => entityListLines("実行者", list(get(x, "entities")), list(get(y, "entities")), labels) };
    ruleItems(list(before.actions), list(after.actions), {
      key: actionKey,
      name: actionName,
      sectionName: "アクション",
      orderName: "アクションの並び",
      brief: (action) => ["種類: アクション", ...action.filterCond ? [`条件: ${fmt(action.filterCond)}`] : []],
      diff: (x, y) => attrLines(x, y, { ignore: /* @__PURE__ */ new Set(["name", "from", "to"]), over: PROCESS_ACTION_LABELS, labels, section: "processSettings", special: actionSpecial })
    }, push);
  }
  function aclItems(sectionKey, before, after, labels, push) {
    const br = get(before, "rights"), ar = get(after, "rights");
    if (!Array.isArray(br) || !Array.isArray(ar)) throw new Error("権限の形式が不正です。");
    const special = { entities: entitiesSpecial(labels) };
    if (sectionKey === "appAcl") {
      ruleItems(br, ar, {
        sectionName: "アプリ権限",
        key: (rule) => entityKey(rule),
        name: (rule) => entityText(entityOf(rule), labels),
        brief: (rule) => permissionBrief(rule),
        diff: (x, y) => attrLines(x, y, { ignore: /* @__PURE__ */ new Set(["entity"]), labels, section: sectionKey })
      }, push);
    } else if (sectionKey === "recordPermissions") {
      ruleItems(br, ar, {
        sectionName: "レコード権限",
        key: (rule) => String(rule.filterCond ?? ""),
        name: (rule) => rule.filterCond ? `条件「${clip(String(rule.filterCond), 60)}」` : "条件なし（すべてのレコード）",
        brief: (rule) => rule.entities?.length ? entityListLines("対象", [], list(rule.entities), labels) : ["対象なし"],
        diff: (x, y) => attrLines(x, y, { ignore: /* @__PURE__ */ new Set(["filterCond"]), labels, section: sectionKey, special, over: { entities: "対象" } })
      }, push);
    } else {
      ruleItems(br, ar, {
        sectionName: "フィールド権限",
        key: (rule) => typeof rule.code === "string" && rule.code ? rule.code : null,
        name: (rule) => fieldName(String(rule.code), labels),
        brief: (rule) => rule.entities?.length ? entityListLines("対象", [], list(rule.entities), labels) : ["対象なし"],
        diff: (x, y) => attrLines(x, y, { ignore: /* @__PURE__ */ new Set(["code"]), labels, section: sectionKey, special, over: { entities: "対象" } })
      }, push);
    }
    extraItems(before, after, /* @__PURE__ */ new Set(["rights"]), push);
  }
  function timingText(timing, labels) {
    if (!isObj(timing)) return fmt(timing);
    const parts = [];
    if (timing.code) parts.push(fieldName(String(timing.code), labels));
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
  function notificationItems(sectionKey, before, after, labels, push) {
    const bn = get(before, "notifications"), an = get(after, "notifications");
    if (!Array.isArray(bn) || !Array.isArray(an)) throw new Error("通知の形式が不正です。");
    const targets = entitiesSpecial(labels);
    if (sectionKey === "notifications") {
      ruleItems(bn, an, {
        sectionName: "通知",
        key: (rule) => entityKey(rule),
        name: (rule) => entityText(entityOf(rule), labels),
        brief: (rule) => {
          const on = Object.keys(rule).filter((key) => key !== "entity" && key !== "includeSubs" && rule[key] === true).map((key) => labelOfProp(key));
          return [on.length ? `通知する: ${listText(on)}` : "通知する条件なし"];
        },
        diff: (x, y) => attrLines(x, y, { ignore: /* @__PURE__ */ new Set(["entity"]), labels, section: sectionKey })
      }, push);
    } else {
      const reminder = sectionKey === "reminderNotifications";
      ruleItems(bn, an, {
        sectionName: reminder ? "リマインダー通知" : "レコード条件通知",
        key: (rule) => typeof rule.title === "string" && rule.title ? rule.title : null,
        name: (rule) => String(rule.title),
        brief: (rule) => [
          ...reminder ? [`通知するタイミング: ${timingText(rule.timing, labels)}`] : [],
          ...rule.filterCond ? [`絞り込み条件: ${fmt(rule.filterCond)}`] : [],
          ...list(rule.targets).length ? entityListLines("通知先", [], list(rule.targets), labels) : ["通知先なし"]
        ],
        diff: (x, y) => attrLines(x, y, {
          ignore: /* @__PURE__ */ new Set(["title"]),
          labels,
          section: sectionKey,
          over: { targets: "通知先", filterCond: "絞り込み条件", timing: "通知するタイミング" },
          special: { targets, timing: (p, q, label) => [`${label}: ${timingText(p, labels)} → ${timingText(q, labels)}`] }
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
  function categoryItems(before, after, labels, push) {
    if (!isObj(before) || !isObj(after)) throw new Error("カテゴリーの形式が不正です。");
    if (before.enabled !== after.enabled) push("変更", "カテゴリー機能", [`有効状態: ${fmt(before.enabled, "enabled")} → ${fmt(after.enabled, "enabled")}`]);
    const b = categoryPaths(before.categories), a = categoryPaths(after.categories);
    const strip = (node) => isObj(node) ? Object.fromEntries(Object.entries(node).filter(([key]) => !["children", "subCategories", "categories"].includes(key))) : node;
    for (const [path, node] of a) {
      if (!b.has(path)) {
        push("追加", path, ["カテゴリーを追加"]);
        continue;
      }
      const lines = attrLines(strip(b.get(path)), strip(node), { over: { index: "表示順", name: "名前", label: "名前" }, labels, special: { index: (x, y, label) => [`${label}: ${ordinal(x)} → ${ordinal(y)}`] } });
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
  function appSettingsItems(before, after, labels, push) {
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
          ...kv("フィールド", get(bv, "code"), get(av, "code"), (value) => value ? fieldName(String(value), labels) : "（なし）")
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
        details = attrLines(bv, av, { labels });
      } else details = [`${fmt(bv, key)} → ${fmt(av, key)}`];
      push("変更", name, details.length ? details : [`${fmt(bv, key)} → ${fmt(av, key)}`]);
    }
  }
  function genericItems(before, after, labels, push) {
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
      const lines = arrayish(bv) && arrayish(av) ? [arrayLine(key, name, list(bv), list(av), labels, "")] : isObj(bv) && isObj(av) ? attrLines(bv, av, { labels }) : [`${fmt(bv, key)} → ${fmt(av, key)}`];
      push(bv === void 0 ? "追加" : av === void 0 ? "削除" : "変更", name, lines.length ? lines : ["内容を変更"]);
    }
  }
  var KIND_ORDER = { 削除: 0, 変更: 1, 追加: 2, 保持: 3 };
  function summarizeReflectItems(sectionKey, before, after, context = {}) {
    const labels = context.fieldLabels;
    const run = (build) => {
      const items2 = [];
      const push = (kind, name, details) => {
        const clean2 = details.filter(Boolean);
        items2.push({ kind, name, details: clean2.length > MAX_DETAILS ? [...clean2.slice(0, MAX_DETAILS - 1), `ほか ${clean2.length - (MAX_DETAILS - 1)} 件`] : clean2 });
      };
      build(push);
      return items2;
    };
    const specific = (push) => {
      switch (sectionKey) {
        case "fieldSettings":
          return fieldItems(before, after, labels, push);
        case "layoutSettings":
          return layoutItems(before, after, labels, push);
        case "viewSettings":
        case "reportSettings":
        case "actionSettings":
          return namedItems(sectionKey, before, after, labels, push);
        case "processSettings":
          return processItems(before, after, labels, push);
        case "appAcl":
        case "recordPermissions":
        case "fieldAcl":
          return aclItems(sectionKey, before, after, labels, push);
        case "notifications":
        case "perRecordNotifications":
        case "reminderNotifications":
          return notificationItems(sectionKey, before, after, labels, push);
        case "categories":
          return categoryItems(before, after, labels, push);
        case "pluginSettings":
          return pluginItems(before, after, push);
        case "customizeSettings":
          return customizeItems(before, after, push);
        case "appSettings":
          return appSettingsItems(before, after, labels, push);
        default:
          return genericItems(before, after, labels, push);
      }
    };
    let items;
    try {
      items = run(specific);
    } catch {
      try {
        items = run((push) => genericItems(before, after, labels, push));
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
    const labels = /* @__PURE__ */ Object.create(null);
    const collect = (properties) => {
      if (!isObj(properties)) return;
      for (const [code, definition] of Object.entries(properties)) {
        if (!isObj(definition)) continue;
        if (typeof definition.label === "string" && definition.label) labels[code] = definition.label;
        if (definition.type === "SUBTABLE") collect(definition.fields);
      }
    };
    for (const bundle of bundles) collect(bundle?.sections?.fieldSettings?.properties);
    return labels;
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
    const labels = incomplete.map(reflectSectionLabel);
    throw new Error(`バックアップを完全に取得できなかったため反映を中止しました。対象: ${labels.join("、")}。差分を取得し直してから再実行してください。`);
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

  // src/deploy/sections.ts
  var DEPLOY_COMPARE_SECTION_KEYS = REFLECT_SECTION_KEYS;
  function deploySectionLabel(key) {
    return reflectSectionLabel(key);
  }

  // src/deploy/inspect.ts
  var isObject2 = (value) => !!value && typeof value === "object" && !Array.isArray(value);
  function withoutRevision(section) {
    if (!isObject2(section) || !Object.prototype.hasOwnProperty.call(section, "revision")) return section;
    const { revision: _revision, ...rest } = section;
    return rest;
  }
  function comparableCustomize(section) {
    if (!isObject2(section)) return section;
    const result = { ...section };
    for (const platform of ["desktop", "mobile"]) {
      const platformSection = section[platform];
      if (!isObject2(platformSection)) continue;
      const next = { ...platformSection };
      for (const kind of ["js", "css"]) {
        if (!Array.isArray(platformSection[kind])) continue;
        next[kind] = platformSection[kind].map((item) => item?.type === "FILE" ? { type: "FILE", file: { name: item.file?.name ?? "", contentHash: `size:${item.file?.size ?? ""}` } } : item);
      }
      result[platform] = next;
    }
    return result;
  }
  function comparable(sectionKey, section) {
    const base = withoutRevision(section);
    return sectionKey === "customizeSettings" ? comparableCustomize(base) : base;
  }
  function incompleteReason(side, label, section) {
    if (isCompleteReflectSection(section)) return void 0;
    if (isObject2(section) && section._fetchError) return `${side}の${label}を取得できません（${String(section._fetchError).split("\n")[0]}）。`;
    if (isObject2(section) && section._partial) return `${side}の${label}を完全に取得できません。`;
    return `${side}の${label}を取得できません。`;
  }
  function compareDeploySection(sectionKey, production, preview, fieldLabels = {}) {
    const label = deploySectionLabel(sectionKey);
    const empty = { added: 0, changed: 0, removed: 0 };
    const reasons = [incompleteReason("本番", label, production), incompleteReason("プレビュー", label, preview)].filter((reason) => !!reason);
    if (reasons.length) return { sectionKey, label, status: "error", items: [], counts: { ...empty }, message: reasons.join(" ") };
    const before = comparable(sectionKey, production), after = comparable(sectionKey, preview);
    if (stableReflectStringify(before) === stableReflectStringify(after)) return { sectionKey, label, status: "same", items: [], counts: { ...empty } };
    let items = [];
    try {
      items = summarizeReflectItems(sectionKey, before, after, { fieldLabels });
    } catch {
      items = [];
    }
    if (!items.length) items = [{ kind: "変更", name: label, details: ["設定の内容が異なります"] }];
    const counts = { ...empty };
    for (const item of items) {
      if (item.kind === "追加") counts.added += 1;
      else if (item.kind === "変更") counts.changed += 1;
      else if (item.kind === "削除") counts.removed += 1;
    }
    return { sectionKey, label, status: "change", items, counts };
  }
  var NO_VALUE_FIELD_TYPES = /* @__PURE__ */ new Set(["GROUP", "REFERENCE_TABLE"]);
  function flattenFields(fieldSettings) {
    const out = [];
    const properties = isObject2(fieldSettings) ? fieldSettings.properties : void 0;
    if (!isObject2(properties)) return out;
    for (const [key, definition] of Object.entries(properties)) {
      if (!isObject2(definition)) continue;
      const code = typeof definition.code === "string" && definition.code ? definition.code : key;
      const type = String(definition.type ?? "");
      out.push({ code, label: typeof definition.label === "string" ? definition.label : "", type });
      if (type === "SUBTABLE" && isObject2(definition.fields)) {
        for (const [innerKey, inner] of Object.entries(definition.fields)) {
          if (!isObject2(inner)) continue;
          out.push({ code: typeof inner.code === "string" && inner.code ? inner.code : innerKey, label: typeof inner.label === "string" ? inner.label : "", type: String(inner.type ?? ""), table: code });
        }
      }
    }
    return out;
  }
  function findRemovedFields(productionFieldSettings, previewFieldSettings) {
    const production = flattenFields(productionFieldSettings), preview = flattenFields(previewFieldSettings);
    const previewCodes = new Set(preview.map((field) => field.code));
    const productionCodes = new Set(production.map((field) => field.code));
    const removedTables = new Set(production.filter((field) => !field.table && field.type === "SUBTABLE" && !previewCodes.has(field.code)).map((field) => field.code));
    const removed = production.filter((field) => !SYSTEM_FIELD_TYPES.has(field.type) && !NO_VALUE_FIELD_TYPES.has(field.type) && !previewCodes.has(field.code) && !(field.table && removedTables.has(field.table)));
    const claimed = /* @__PURE__ */ new Set();
    return removed.map((field) => {
      const candidates = preview.filter((item) => !productionCodes.has(item.code) && item.type === field.type && item.label !== "" && item.label === field.label);
      const candidate = candidates.find((item) => !claimed.has(item.code)) ?? candidates[0];
      if (candidate) claimed.add(candidate.code);
      return {
        code: field.code,
        label: field.label || field.code,
        type: field.type,
        ...field.table ? { table: field.table } : {},
        ...candidate ? { possibleRename: candidate.code } : {}
      };
    });
  }
  var ACL_SECTIONS = ["appAcl", "recordPermissions", "fieldAcl"];
  function buildDeployWarnings(opts) {
    const warnings = [];
    const changed = (key) => opts.sections.some((section) => section.sectionKey === key && section.status === "change");
    if (opts.contentSame) {
      warnings.push("比べた項目の内容に違いはなく、設定の更新番号（revision）だけが異なります。プラグインの個別設定や JS/CSS ファイルの中身など、比べていない変更が含まれている可能性があります。");
    }
    if (changed("processSettings") && opts.production.processSettings?.enable === true && opts.preview.processSettings?.enable === false) {
      warnings.push("プロセス管理が有効から無効に変わります。本番でもステータスの管理ができなくなります。");
    }
    if (changed("categories") && opts.production.categories?.enabled === true && opts.preview.categories?.enabled === false) {
      warnings.push("カテゴリー機能が有効から無効に変わります。本番のレコードのカテゴリーが使えなくなります。");
    }
    const acl = ACL_SECTIONS.filter(changed);
    if (acl.length) warnings.push(`アクセス権（${acl.map(deploySectionLabel).join("、")}）が変わります。反映後、利用者が操作できる範囲が変わります。`);
    return warnings;
  }

  // src/deploy/poll.ts
  var DEFAULT_DEPLOY_POLL = { initialMs: 1e3, maxMs: 5e3, timeoutMs: 3e5 };
  var DEPLOY_STATUS_FAILURE_LIMIT = 3;
  var BACKOFF_FACTOR = 1.5;
  var isFinal = (status) => status === "SUCCESS" || status === "FAIL" || status === "CANCEL";
  function resolvePoll(poll) {
    const pick = (value, fallback) => Number.isFinite(value) && Number(value) >= 0 ? Number(value) : fallback;
    const initialMs = pick(poll?.initialMs, DEFAULT_DEPLOY_POLL.initialMs);
    return { initialMs, maxMs: Math.max(initialMs, pick(poll?.maxMs, DEFAULT_DEPLOY_POLL.maxMs)), timeoutMs: pick(poll?.timeoutMs, DEFAULT_DEPLOY_POLL.timeoutMs) };
  }
  async function waitForDeploy(guestId, appIds, pollOptions) {
    const poll = resolvePoll(pollOptions);
    const statuses = /* @__PURE__ */ new Map();
    const startedAt = Date.now();
    let interval = poll.initialMs;
    let failures = 0;
    let lastReason = "";
    for (; ; ) {
      await sleepUnlessCancelled(interval);
      throwIfCancelled();
      try {
        const rows = await fetchAppDeployStatus(guestId, appIds);
        failures = 0;
        for (const row of rows) statuses.set(row.app, row.status);
        if (appIds.every((id) => isFinal(statuses.get(id)))) return { kind: "done", statuses };
      } catch (error) {
        if (isRunCancelledError(error)) throw error;
        failures += 1;
        lastReason = error instanceof Error ? error.message : String(error);
        if (failures >= DEPLOY_STATUS_FAILURE_LIMIT) return { kind: "error", statuses, reason: lastReason };
      }
      if (Date.now() - startedAt >= poll.timeoutMs) return { kind: "timeout", statuses };
      interval = Math.min(poll.maxMs, Math.round(interval * BACKOFF_FACTOR) || poll.maxMs);
    }
  }

  // src/tabs/deploy-standalone.ts
  var DEPLOY_MAX_TARGETS = 1e3;
  var INSPECT_CONCURRENCY = 2;
  var REVISION_CHECK_CONCURRENCY = 3;
  var POSITIVE_INTEGER = /^[1-9]\d*$/;
  var clean = (value) => String(value ?? "").trim();
  function reasonOf(error) {
    const text = withoutApiContextLines(error instanceof Error ? error.message : String(error)).replace(/\s*\n\s*/g, " ").trim();
    return (text || "不明なエラー").slice(0, 300);
  }
  var appTitle = (appId, name) => `App ${appId}${name ? `（${name}）` : ""}`;
  function listApps(titles, limit = 5) {
    return titles.length > limit ? `${titles.slice(0, limit).join("、")}ほか ${titles.length - limit} 件` : titles.join("、");
  }
  async function runPool(items, limit, worker) {
    let next = 0, failed = false, failure;
    await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (!failed && next < items.length) {
        const index = next++;
        try {
          await worker(items[index], index);
        } catch (error) {
          if (!failed) {
            failed = true;
            failure = error;
          }
          return;
        }
      }
    }));
    if (failed) throw failure;
  }
  async function fetchSettingsSnapshot(guestId, appId, preview) {
    const res = await apiGet(buildApiPrefix(guestId, preview), "/app/settings.json", { app: appId });
    const revision = pickRevision(res);
    if (!/^\d+$/.test(revision)) throw new Error("応答に revision がありません");
    return { revision, name: typeof res?.name === "string" ? res.name : "" };
  }
  async function trySnapshot(guestId, appId, preview) {
    try {
      return { snapshot: await fetchSettingsSnapshot(guestId, appId, preview), reason: "" };
    } catch (error) {
      if (isRunCancelledError(error)) throw error;
      return { reason: reasonOf(error) };
    }
  }
  function validateDeployTargets(targets, batchMode) {
    if (!Array.isArray(targets) || !targets.length) return "アプリを入力してください。";
    for (const target of targets) {
      const appId = clean(target?.appId), guestId = clean(target?.guestId);
      if (!appId) return "アプリIDが空の行があります。";
      if (!POSITIVE_INTEGER.test(appId)) return `アプリIDは正の整数で入力してください（${appId}）。`;
      if (guestId && !POSITIVE_INTEGER.test(guestId)) return `ゲストスペースIDは正の整数で入力してください（App ${appId}: ${guestId}）。`;
    }
    if (targets.length > DEPLOY_MAX_TARGETS) return `一度に処理できるのは ${DEPLOY_MAX_TARGETS} アプリまでです（現在 ${targets.length} 件）。対象を分けて実行してください。`;
    const seen = /* @__PURE__ */ new Set(), duplicates = [];
    for (const target of targets) {
      const key = `${clean(target.guestId)}:${clean(target.appId)}`;
      if (seen.has(key)) duplicates.push(appTitle(clean(target.appId)) + (clean(target.guestId) ? `（ゲストスペース ${clean(target.guestId)}）` : ""));
      seen.add(key);
    }
    if (duplicates.length) return `同じアプリが重複しています（${listApps([...new Set(duplicates)])}）。`;
    if (batchMode === "atomic") {
      if (targets.length > DEPLOY_APPS_PER_REQUEST) return `まとめて反映できるのは ${DEPLOY_APPS_PER_REQUEST} アプリまでです（現在 ${targets.length} 件）。1 件ずつ反映に切り替えるか、対象を分けてください。`;
      if (new Set(targets.map((target) => clean(target.guestId))).size > 1) return "まとめて反映できるのは同じスペースのアプリだけです。通常スペースとゲストスペース、または異なるゲストスペースのアプリは、1 件ずつ反映に切り替えるか、分けて実行してください。";
    }
    return "";
  }
  var PROCESSING_MESSAGE = "前回の反映を kintone が処理中です。完了してから確認し直してください。";
  var CHANGED_DURING_FETCH_MESSAGE = "取得中に設定が更新されました。確認し直してください。";
  async function inspectOne(target, sections) {
    const appId = clean(target?.appId), guestId = clean(target?.guestId);
    const result = {
      appId,
      guestId,
      name: clean(target?.name),
      state: "error",
      productionRevision: "",
      previewRevision: "",
      sections: [],
      removedFields: [],
      warnings: [],
      inspectedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    const fail = (error) => ({ ...result, state: "error", error, inspectedAt: (/* @__PURE__ */ new Date()).toISOString() });
    if (!POSITIVE_INTEGER.test(appId) || guestId && !POSITIVE_INTEGER.test(guestId)) return fail("アプリIDまたはゲストスペースIDが正しくありません。正の整数で入力してください。");
    const [production, preview] = await Promise.all([trySnapshot(guestId, appId, false), trySnapshot(guestId, appId, true)]);
    if (!production.snapshot || !preview.snapshot) {
      const side = !production.snapshot ? "本番" : "プレビュー";
      const reason = !production.snapshot ? production.reason : preview.reason;
      return fail(`${side}の設定を取得できません（${reason}）。アプリID・ゲストスペース・アプリ管理の権限を確認してください。`);
    }
    result.name = production.snapshot.name || preview.snapshot.name || result.name;
    result.productionRevision = production.snapshot.revision;
    result.previewRevision = preview.snapshot.revision;
    if (result.productionRevision === result.previewRevision) return { ...result, state: "clean", inspectedAt: (/* @__PURE__ */ new Date()).toISOString() };
    let productionBundle, previewBundle;
    try {
      [productionBundle, previewBundle] = await Promise.all([
        fetchBundle({ appId, guestId, preview: false, sections, rawSettings: true }),
        fetchBundle({ appId, guestId, preview: true, sections, rawSettings: true })
      ]);
    } catch (error) {
      if (isRunCancelledError(error)) throw error;
      return fail(`設定を取得できません（${reasonOf(error)}）。もう一度確認し直してください。`);
    }
    const updated = (revisions, expected) => Object.values(revisions).some((revision) => revision !== expected);
    if (updated(productionBundle.meta.sectionRevisions, result.productionRevision) || updated(previewBundle.meta.sectionRevisions, result.previewRevision)) return fail(CHANGED_DURING_FETCH_MESSAGE);
    const fieldLabels = reflectFieldLabels(previewBundle, productionBundle);
    const diffs = sections.map((key) => compareDeploySection(key, productionBundle.sections[key], previewBundle.sections[key], fieldLabels));
    const failedSections = diffs.filter((diff) => diff.status === "error");
    if (failedSections.length) {
      return { ...fail(`設定の一部を取得できません（${failedSections.map((diff) => diff.label).join("、")}）。もう一度確認し直してください。`), sections: diffs };
    }
    const contentSame = diffs.every((diff) => diff.status === "same");
    return {
      ...result,
      state: "changes",
      contentSame,
      sections: diffs,
      removedFields: findRemovedFields(productionBundle.sections.fieldSettings, previewBundle.sections.fieldSettings),
      warnings: buildDeployWarnings({ sections: diffs, contentSame, production: productionBundle.sections, preview: previewBundle.sections }),
      inspectedAt: (/* @__PURE__ */ new Date()).toISOString(),
      productionBundle,
      previewBundle
    };
  }
  async function markProcessingApps(apps) {
    const groups = /* @__PURE__ */ new Map();
    apps.forEach((app, index) => {
      if (app.state !== "changes") return;
      const list2 = groups.get(app.guestId);
      if (list2) list2.push(index);
      else groups.set(app.guestId, [index]);
    });
    for (const [guestId, indexes] of groups) {
      for (let start = 0; start < indexes.length; start += DEPLOY_APPS_PER_REQUEST) {
        const chunk = indexes.slice(start, start + DEPLOY_APPS_PER_REQUEST);
        throwIfCancelled();
        try {
          const statuses = new Map((await fetchAppDeployStatus(guestId, chunk.map((index) => apps[index].appId))).map((row) => [row.app, row.status]));
          for (const index of chunk) {
            if (statuses.get(apps[index].appId) !== "PROCESSING") continue;
            const { productionBundle: _production, previewBundle: _preview, ...rest } = apps[index];
            apps[index] = { ...rest, state: "processing", contentSame: void 0, sections: [], removedFields: [], warnings: [], error: PROCESSING_MESSAGE };
          }
        } catch (error) {
          if (isRunCancelledError(error)) throw error;
          for (const index of chunk) apps[index].warnings.push(`前回の反映の処理状況を確認できませんでした（${reasonOf(error)}）。処理中でないか、アプリの設定画面で確認してください。`);
        }
      }
    }
  }
  async function inspectDeployTargetsStandalone(opts) {
    const targets = Array.isArray(opts.targets) ? opts.targets : [];
    const sections = opts.sections?.length ? [...new Set(opts.sections)] : [...DEPLOY_COMPARE_SECTION_KEYS];
    const apps = new Array(targets.length);
    let done = 0;
    await runPool(targets, INSPECT_CONCURRENCY, async (target, index) => {
      throwIfCancelled();
      apps[index] = await inspectOne(target, sections);
      done += 1;
      opts.onProgress?.(done, targets.length, appTitle(apps[index].appId, apps[index].name));
    });
    await markProcessingApps(apps);
    const counts = { changes: 0, clean: 0, error: 0, processing: 0 };
    for (const app of apps) counts[app.state] += 1;
    return { apps, inspectedAt: (/* @__PURE__ */ new Date()).toISOString(), counts };
  }
  var PENDING_CANCELLED = "未実行（中止）";
  var PENDING_AFTER_PROBLEM = "前のアプリで問題があったため未実行";
  var PENDING_BLOCKED = "反映を始める前の確認で問題があったため、まだ何も反映していません（未実行）";
  var CANCELLED_AFTER_REQUEST = "反映を依頼しましたが、完了を確認する前に中止しました。kintone 側で処理が続いている可能性があります。アプリの設定画面で状態を確認してください。";
  var TIMEOUT_MESSAGE = "反映の完了を確認できませんでした。kintone 側で処理が続いている可能性があります。アプリの設定画面で確認してください。";
  var PROBLEM_STATUSES = /* @__PURE__ */ new Set(["failed", "conflict", "unknown"]);
  var UNFINISHED_STATUSES = /* @__PURE__ */ new Set(["waiting", "checking", "deploying"]);
  function revisionMismatch(target, current) {
    const parts = [];
    if (current.production !== target.productionRevision) parts.push(`本番（revision ${target.productionRevision} → ${current.production}）`);
    if (current.preview !== target.previewRevision) parts.push(`プレビュー（revision ${target.previewRevision} → ${current.preview}）`);
    return parts.length ? `確認した後に${parts.join("と")}の設定が更新されました。差分を確認し直してください。` : "";
  }
  function classifyRequestError(error) {
    if (isRevisionConflictError(error)) return "conflict";
    const status = resolveHttpStatus(error) || resolveHttpStatus(error?.original);
    if (status >= 500 || status === 0 && (isRetriableApiError(error) || isRetriableApiError(error?.original))) return "unknown";
    return "failed";
  }
  async function runDeployStandalone(opts) {
    const { mode, batchMode } = opts;
    const targets = Array.isArray(opts.targets) ? opts.targets : [];
    const revert = mode === "revert";
    const stopOnError = opts.stopOnError !== false;
    if (!targets.length) throw new Error("反映するアプリがありません。");
    for (const target of targets) {
      if (target.state !== "changes") throw new Error(`App ${target.appId} は反映できる状態ではありません。差分を確認し直してください。`);
      if (!target.productionBundle || !target.previewBundle) throw new Error(`App ${target.appId} の確認結果に設定の取得値がありません。差分を確認し直してください。`);
    }
    const problem = validateDeployTargets(targets.map((target) => ({ appId: target.appId, guestId: target.guestId, name: target.name })), batchMode);
    if (problem) throw new Error(problem);
    const startedAt = (/* @__PURE__ */ new Date()).toISOString();
    const logs = [];
    const log = (message) => {
      logs.push(message);
    };
    const setStatus = (message) => {
      opts.setStatus?.(message);
    };
    const subject = revert ? "変更の中止" : "本番への反映";
    const outcomes = targets.map((target) => ({
      appId: target.appId,
      guestId: target.guestId,
      name: target.name,
      status: "waiting",
      productionRevisionBefore: target.productionRevision,
      previewRevision: target.previewRevision
    }));
    const requested = /* @__PURE__ */ new Set();
    let backup;
    let blocked;
    let cancelled = false;
    const emit2 = (index, status, message) => {
      const outcome = outcomes[index];
      outcome.status = status;
      if (message) outcome.message = message;
      else delete outcome.message;
      opts.onUpdate?.({ appId: outcome.appId, guestId: outcome.guestId, status, ...message ? { message } : {} });
    };
    const titleOf = (index) => appTitle(outcomes[index].appId, outcomes[index].name);
    const readRevisions = async (index) => {
      const { appId, guestId } = outcomes[index];
      const [production, preview] = await Promise.all([trySnapshot(guestId, appId, false), trySnapshot(guestId, appId, true)]);
      if (!production.snapshot) return { reason: `本番の設定を取得できません（${production.reason}）` };
      if (!preview.snapshot) return { reason: `プレビューの設定を取得できません（${preview.reason}）` };
      return { pair: { production: production.snapshot.revision, preview: preview.snapshot.revision }, reason: "" };
    };
    const settleInterrupted = (pendingMessage, requestedMessage) => {
      outcomes.forEach((outcome, index) => {
        if (!UNFINISHED_STATUSES.has(outcome.status)) return;
        if (requested.has(index)) emit2(index, "unknown", requestedMessage);
        else emit2(index, "pending", pendingMessage);
      });
    };
    const block = (reason, conflicts = /* @__PURE__ */ new Map(), pendingReasons = /* @__PURE__ */ new Map()) => {
      blocked = reason;
      log(`中止: ${reason}`);
      outcomes.forEach((_outcome, index) => {
        if (conflicts.has(index)) emit2(index, "conflict", conflicts.get(index));
        else emit2(index, "pending", pendingReasons.get(index) || PENDING_BLOCKED);
      });
    };
    const verify = async (index) => {
      try {
        const after = await readRevisions(index);
        if (!after.pair) {
          log(`${titleOf(index)}: 反映後の確認ができませんでした（${after.reason}）`);
          return;
        }
        outcomes[index].productionRevisionAfter = after.pair.production;
        outcomes[index].verified = after.pair.production === after.pair.preview;
        log(`${titleOf(index)}: 反映後の revision は 本番 ${after.pair.production} / プレビュー ${after.pair.preview}`);
      } catch (error) {
        if (!isRunCancelledError(error)) throw error;
        log(`${titleOf(index)}: 反映後の確認の前に中止されました`);
      }
    };
    const settle = async (index, wait) => {
      const status = wait.statuses.get(outcomes[index].appId);
      if (status === "SUCCESS") {
        await verify(index);
        const verified = outcomes[index].verified;
        const done = revert ? "プレビューの未公開の変更を中止しました。" : "本番へ反映しました。";
        emit2(index, "success", verified === false ? `${done}ただし、反映後の本番とプレビューの設定の更新番号（revision）が一致していません。アプリの設定画面で状態を確認してください。` : verified === void 0 ? `${done}反映後の状態は確認できませんでした。` : done);
      } else if (status === "FAIL") {
        emit2(index, "failed", revert ? "kintone が変更の中止に失敗しました。アプリの設定画面で状態を確認してください。" : "kintone が反映に失敗しました。アプリの設定画面で「アプリを更新」を押すと理由を確認できます。");
      } else if (status === "CANCEL") {
        emit2(index, "cancelled", batchMode === "atomic" ? `ほかのアプリの${revert ? "変更の中止" : "反映"}が失敗したため、kintone が取り消しました。このアプリは${revert ? "変更の中止" : "本番への反映"}が行われていません。` : `kintone が${revert ? "変更の中止" : "反映"}を取り消しました。`);
      } else if (wait.kind === "error") {
        emit2(index, "unknown", `${revert ? "変更の中止" : "反映"}の状況を確認できませんでした（${reasonOf(wait.reason)}）。kintone 側で処理が続いている可能性があります。アプリの設定画面で確認してください。`);
      } else emit2(index, "unknown", TIMEOUT_MESSAGE);
    };
    const rejectRequest = (indexes, error) => {
      if (isRunCancelledError(error)) throw error;
      log(`${subject}の依頼に失敗: ${error instanceof Error ? error.message : String(error)}`);
      const kind = classifyRequestError(error);
      for (const index of indexes) {
        if (kind === "conflict") emit2(index, "conflict", "依頼の時点で、プレビューの設定がすでに更新されていました。差分を確認し直してください。");
        else if (kind === "unknown") emit2(index, "unknown", `${revert ? "変更の中止" : "反映"}の依頼が kintone に届いたか確認できませんでした（${reasonOf(error)}）。二重に実行しないよう、アプリの設定画面で状態を確認してください。`);
        else emit2(index, "failed", `kintone が${revert ? "変更の中止" : "反映"}の依頼を受け付けませんでした（${reasonOf(error)}）。`);
      }
    };
    const request = async (guestId, indexes) => {
      const apps = indexes.map((index) => ({ app: outcomes[index].appId, revision: outcomes[index].previewRevision }));
      log(`[API] POST ${buildApiPrefix(guestId, true)}/app/deploy.json apps=${apps.map((app) => `${app.app}@${app.revision}`).join(",")}${revert ? " revert=true" : ""}`);
      await requestAppDeploy(guestId, apps, revert);
      indexes.forEach((index) => requested.add(index));
    };
    try {
      const indexes = outcomes.map((_outcome, index) => index);
      setStatus("反映の前に、本番とプレビューの最新の状態を確認しています…");
      const checks = new Array(outcomes.length);
      await runPool(indexes, REVISION_CHECK_CONCURRENCY, async (index) => {
        checks[index] = await readRevisions(index);
      });
      const conflicts = /* @__PURE__ */ new Map(), unreadable = /* @__PURE__ */ new Map();
      indexes.forEach((index) => {
        const check = checks[index];
        if (!check.pair) {
          unreadable.set(index, `最新の状態を確認できなかったため未実行です（${check.reason}）`);
          return;
        }
        const mismatch = revisionMismatch(targets[index], check.pair);
        if (mismatch) conflicts.set(index, mismatch);
      });
      if (conflicts.size || unreadable.size) {
        const titles = (map) => listApps([...map.keys()].map(titleOf));
        const reasons = [
          conflicts.size ? `確認した後に設定が更新されたアプリがあります（${titles(conflicts)}）` : "",
          unreadable.size ? `最新の状態を確認できないアプリがあります（${titles(unreadable)}）` : ""
        ].filter(Boolean).join("。");
        block(`${reasons}。何も反映していません。差分を確認し直してください。`, conflicts, unreadable);
        return finish2();
      }
      setStatus("バックアップを作成しています…");
      const built = await buildDeployBackup({ mode, targets, onProgress: (done, total) => setStatus(`バックアップを作成しています…（${done}/${total} アプリ）`) });
      if (built.lostFiles.length) {
        block(`反映で設定から外れる JS/CSS ファイルの本体をバックアップに保存できないため、反映を依頼していません（${listApps(built.lostFiles.map((file) => `${appTitle(file.appId)}「${file.name}」: ${file.reason}`), 3)}）。時間をおいて差分を確認し直すか、対象から外してください。`);
        return finish2();
      }
      for (const file of built.unavailableFiles) log(`警告: ${appTitle(file.appId)} の JS/CSS ファイル「${file.name}」の本体をバックアップに保存できませんでした（${file.reason}）。この反映では設定から外れないため、そのまま残ります`);
      const fileName = buildExportFilename(revert ? "変更中止前バックアップ" : "本番反映前バックアップ", "json", {
        appLabel: targets.length === 1 ? buildAppFilenameLabel(targets[0].appId, targets[0].name) : `${targets.length}アプリ`
      });
      try {
        (opts.saveBackup || downloadBackupFile)(fileName, JSON.stringify(built.file, null, 2));
      } catch (error) {
        block(`バックアップを保存できなかったため、反映を依頼していません（${reasonOf(error)}）。`);
        return finish2();
      }
      backup = { fileName, appCount: targets.length, generatedAt: built.file.generatedAt, environment: built.file.environment, unavailableFiles: built.unavailableFiles, content: built.file };
      log(`バックアップを保存しました（${fileName}、${targets.length} アプリ、${revert ? "中止前のプレビュー" : "反映前の本番"}）`);
      if (batchMode === "atomic") {
        const guestId = outcomes[0].guestId;
        throwIfCancelled();
        indexes.forEach((index) => emit2(index, "deploying", "kintone に依頼しています。"));
        setStatus(`${outcomes.length} アプリをまとめて${revert ? "変更の中止" : "反映"}の依頼をしています…`);
        try {
          await request(guestId, indexes);
        } catch (error) {
          rejectRequest(indexes, error);
          return finish2();
        }
        indexes.forEach((index) => emit2(index, "deploying", "kintone の処理を待っています。"));
        setStatus("kintone の処理を待っています…");
        const wait = await waitForDeploy(guestId, indexes.map((index) => outcomes[index].appId), opts.poll);
        for (const index of indexes) await settle(index, wait);
      } else {
        for (const index of indexes) {
          throwIfCancelled();
          const { guestId, appId } = outcomes[index];
          setStatus(`${titleOf(index)} を${revert ? "変更の中止" : "反映"}しています…（${index + 1}/${outcomes.length}）`);
          emit2(index, "checking", "直前の状態を確認しています。");
          const check = await readRevisions(index);
          const mismatch = check.pair ? revisionMismatch(targets[index], check.pair) : "";
          if (!check.pair) emit2(index, "failed", `直前の確認で設定を取得できなかったため、依頼していません（${check.reason}）。`);
          else if (mismatch) emit2(index, "conflict", mismatch);
          else {
            emit2(index, "deploying", "kintone に依頼しています。");
            let accepted = false;
            try {
              await request(guestId, [index]);
              accepted = true;
            } catch (error) {
              rejectRequest([index], error);
            }
            if (accepted) {
              emit2(index, "deploying", "kintone の処理を待っています。");
              await settle(index, await waitForDeploy(guestId, [appId], opts.poll));
            }
          }
          if (stopOnError && PROBLEM_STATUSES.has(outcomes[index].status)) {
            outcomes.forEach((outcome, rest) => {
              if (rest > index && outcome.status === "waiting") emit2(rest, "pending", PENDING_AFTER_PROBLEM);
            });
            break;
          }
        }
      }
    } catch (error) {
      if (isRunCancelledError(error)) {
        cancelled = true;
        log("利用者の操作で中止しました");
        settleInterrupted(PENDING_CANCELLED, CANCELLED_AFTER_REQUEST);
      } else {
        const detail = error instanceof Error ? error.message : String(error);
        log(`予期しないエラーで中断しました: ${detail}`);
        if (!requested.size && !blocked) blocked = `予期しないエラーで中断したため、反映を依頼していません（${reasonOf(error)}）。`;
        settleInterrupted(`予期しないエラーで中断したため未実行です（${reasonOf(error)}）`, `予期しないエラーで中断しました（${reasonOf(error)}）。kintone 側で処理が続いている可能性があります。アプリの設定画面で状態を確認してください。`);
      }
    }
    return finish2();
    function finish2() {
      return {
        mode,
        batchMode,
        startedAt,
        finishedAt: (/* @__PURE__ */ new Date()).toISOString(),
        apps: outcomes,
        ...backup ? { backup } : {},
        logs,
        ...cancelled ? { cancelled: true } : {},
        ...blocked ? { blocked } : {}
      };
    }
  }

  // src/deploy/display.ts
  var DEPLOY_TARGET_LIMIT = 1e3;
  var DEPLOY_ATOMIC_LIMIT = 300;
  var DEPLOY_RESULT_FULL_LIMIT = 200;
  function deployAppKey(app) {
    return `${String(app.guestId || "").trim()}/${String(app.appId || "").trim()}`;
  }
  function formatDeployApp(app) {
    const guest = String(app.guestId || "").trim();
    const name = String(app.name || "").trim();
    if (name) return `${name}（#${app.appId}${guest ? ` / ゲストスペース ${guest}` : ""}）`;
    return `App ${app.appId}${guest ? `（ゲストスペース ${guest}）` : ""}`;
  }
  function shortDeployApp(app) {
    return `App ${app.appId}`;
  }
  var MODE_TEXT = {
    deploy: {
      label: "本番へ反映（アプリを更新）",
      description: "プレビューの設定を、本番へ公開します。",
      verb: "反映",
      direction: "プレビュー → 本番",
      changesHeading: "変更の要約"
    },
    revert: {
      label: "変更を中止（プレビューを本番に戻す）",
      description: "プレビューの未公開の変更を破棄します。",
      verb: "中止",
      direction: "プレビューの変更を破棄して本番の設定に戻す",
      changesHeading: "破棄される変更"
    }
  };
  function deployModeText(mode) {
    return MODE_TEXT[mode] || MODE_TEXT.deploy;
  }
  function deployRunLabel(mode, count) {
    return mode === "revert" ? `確認した ${count} アプリの変更を中止` : `確認した ${count} アプリを本番へ反映`;
  }
  function describeBatchMode(batchMode) {
    return batchMode === "atomic" ? "まとめて反映（すべて成功したときだけ本番へ反映）" : "1アプリずつ反映";
  }
  function describeStopPolicy(batchMode, stopOnError) {
    if (batchMode === "atomic") return "1件でも失敗するとすべて取り消されます";
    return stopOnError ? "失敗したら残りを実行しない" : "失敗しても残りを続ける";
  }
  function describeDeployOptions(batchMode, stopOnError) {
    const text = batchMode === "atomic" ? `詳細設定: まとめて反映（すべて成功したときだけ。最大 ${DEPLOY_ATOMIC_LIMIT} 件・同じゲストスペース）` : `詳細設定: 1アプリずつ反映 / ${stopOnError ? "失敗したら残りを実行しない" : "失敗しても残りを続ける"}`;
    return { text, warn: batchMode === "atomic" || !stopOnError };
  }
  var INSPECT_STATE_LABEL = {
    changes: "変更あり",
    clean: "未公開の変更なし",
    error: "取得失敗",
    processing: "反映処理中"
  };
  function inspectStateLabel(state3) {
    return INSPECT_STATE_LABEL[state3] || state3;
  }
  var STATE_ORDER = { error: 0, processing: 1, changes: 2, clean: 3 };
  function sortInspectionsForReview(apps) {
    return apps.map((app, index) => ({ app, index })).sort((a, b) => STATE_ORDER[a.app.state] - STATE_ORDER[b.app.state] || a.index - b.index).map((entry) => entry.app);
  }
  function isSelectableInspection(app) {
    return app.state !== "clean";
  }
  function defaultSelectedKeys(apps) {
    return apps.filter(isSelectableInspection).map(deployAppKey);
  }
  function countInspectStates(apps) {
    const counts = { changes: 0, clean: 0, error: 0, processing: 0 };
    for (const app of apps) counts[app.state] += 1;
    return counts;
  }
  function describeInspectSummary(counts) {
    const parts = [`未公開の変更なし ${counts.clean}`];
    if (counts.error) parts.push(`取得失敗 ${counts.error}`);
    if (counts.processing) parts.push(`反映処理中 ${counts.processing}`);
    return `${counts.changes} アプリに未公開の変更があります（${parts.join("、")}）。`;
  }
  function summarizeSelection(apps, selected) {
    const summary = { runnable: 0, error: 0, processing: 0 };
    for (const app of apps) {
      if (!selected.has(deployAppKey(app))) continue;
      if (app.state === "changes") summary.runnable += 1;
      else if (app.state === "error") summary.error += 1;
      else if (app.state === "processing") summary.processing += 1;
    }
    return summary;
  }
  function selectionBlockers(apps, selected, mode) {
    const summary = summarizeSelection(apps, selected);
    const reasons = [];
    if (summary.error) reasons.push(`取得失敗のアプリが ${summary.error} 件選択されています。確認し直すか、対象から外してください。`);
    if (summary.processing) reasons.push(`反映処理中のアプリが ${summary.processing} 件選択されています。kintone の処理が終わってから確認し直すか、対象から外してください。`);
    if (!reasons.length && !summary.runnable) reasons.push(`${mode === "revert" ? "変更を中止" : "反映"}するアプリ（変更あり）を選んでください。`);
    return reasons;
  }
  function aggregateChanges(apps) {
    const totals = { apps: 0, sections: [], added: 0, changed: 0, removed: 0 };
    const bySection = /* @__PURE__ */ new Map();
    for (const app of apps) {
      let any = false;
      for (const section of app.sections || []) {
        if (section.status !== "change") continue;
        any = true;
        let total = bySection.get(section.sectionKey);
        if (!total) {
          total = { sectionKey: section.sectionKey, label: section.label, apps: 0, added: 0, changed: 0, removed: 0 };
          bySection.set(section.sectionKey, total);
          totals.sections.push(total);
        }
        total.apps += 1;
        total.added += section.counts?.added || 0;
        total.changed += section.counts?.changed || 0;
        total.removed += section.counts?.removed || 0;
      }
      if (any) totals.apps += 1;
    }
    for (const total of totals.sections) {
      totals.added += total.added;
      totals.changed += total.changed;
      totals.removed += total.removed;
    }
    return totals;
  }
  function changedSectionLabels(app) {
    return (app.sections || []).filter((section) => section.status === "change").map((section) => section.label);
  }
  function removedSettingCount(app) {
    return (app.sections || []).reduce((sum, section) => sum + (section.status === "change" ? section.counts?.removed || 0 : 0), 0);
  }
  function describeRemovedSettings(totals) {
    const parts = totals.sections.filter((section) => section.removed > 0).map((section) => `${section.label} ${section.removed} 件`);
    if (!parts.length) return "";
    return `${parts.join("、")}（合計 ${totals.removed} 件）`;
  }
  function collectRemovedFields(apps) {
    const out = [];
    for (const app of apps) for (const field of app.removedFields || []) out.push({ app, field });
    return out;
  }
  function describeRemovedField(field) {
    const label = String(field.label || "").trim();
    const base = label && label !== field.code ? `${label}（${field.code}）` : field.code;
    return field.table ? `${base}（テーブル ${field.table} 内）` : base;
  }
  function formatRevisionPair(app) {
    return `本番 ${app.productionRevision || "－"} → プレビュー ${app.previewRevision || "－"}`;
  }
  function confirmRequirement(apps) {
    if (apps.length === 1) {
      return { value: String(apps[0].appId), label: "対象アプリのIDを入力", placeholder: "対象アプリのID" };
    }
    return { value: String(apps.length), label: "対象のアプリ数を入力", placeholder: `${apps.length} と入力` };
  }
  function describeDeployStatus(status, mode = "deploy") {
    switch (status) {
      case "checking":
        return { icon: "…", text: "確認中…", tone: "run" };
      case "deploying":
        return { icon: "…", text: mode === "revert" ? "中止を依頼中…" : "反映中…", tone: "run" };
      case "success":
        return { icon: "✓", text: "成功", tone: "ok" };
      case "failed":
        return { icon: "✕", text: "失敗", tone: "ng" };
      case "cancelled":
        return { icon: "✕", text: "取り消し（ほかのアプリの失敗）", tone: "ng" };
      case "conflict":
        return { icon: "!", text: "確認後に更新", tone: "warn" };
      case "unknown":
        return { icon: "?", text: "完了を確認できない", tone: "warn" };
      case "pending":
        return { icon: "○", text: "未実行", tone: "pending" };
      default:
        return { icon: "○", text: "待機中", tone: "wait" };
    }
  }
  function isProblemStatus(status) {
    return status === "failed" || status === "cancelled" || status === "conflict" || status === "unknown";
  }
  function countOutcomes(apps) {
    const counts = { total: apps.length, success: 0, failed: 0, cancelled: 0, conflict: 0, unknown: 0, pending: 0, active: 0, unverified: 0 };
    for (const app of apps) {
      if (app.status === "success") {
        counts.success += 1;
        if (app.verified === false) counts.unverified += 1;
      } else if (app.status === "failed") counts.failed += 1;
      else if (app.status === "cancelled") counts.cancelled += 1;
      else if (app.status === "conflict") counts.conflict += 1;
      else if (app.status === "unknown") counts.unknown += 1;
      else if (app.status === "pending") counts.pending += 1;
      else counts.active += 1;
    }
    return counts;
  }
  function describeRunProgress(counts) {
    const settled = counts.total - counts.active;
    const parts = [];
    if (counts.success) parts.push(`成功 ${counts.success}`);
    if (counts.failed) parts.push(`失敗 ${counts.failed}`);
    if (counts.cancelled) parts.push(`取り消し ${counts.cancelled}`);
    if (counts.conflict) parts.push(`確認後に更新 ${counts.conflict}`);
    if (counts.unknown) parts.push(`完了を確認できない ${counts.unknown}`);
    if (counts.pending) parts.push(`未実行 ${counts.pending}`);
    return `${settled}/${counts.total} アプリが完了${parts.length ? `（${parts.join("・")}）` : ""}`;
  }
  function describeDeployMessage(message) {
    return String(message || "").split(/\r?\n/).map((line) => line.trim()).filter((line) => line && !/^\[API\]/.test(line)).join("\n");
  }
  function firstLine(message, limit = 120) {
    const line = describeDeployMessage(message).split("\n")[0] || "";
    return line.length > limit ? `${line.slice(0, limit)}…` : line;
  }
  function describeFailureReasons(apps, limit = 2) {
    const problems = apps.filter((app) => app.status === "failed" || app.status === "cancelled" || app.status === "conflict" || app.status === "unknown");
    const failed = problems.filter((app) => app.status === "failed");
    const list2 = failed.length ? failed : problems;
    const shown = list2.slice(0, limit).map((app) => {
      const reason = firstLine(app.message);
      return reason ? `${shortDeployApp(app)}: ${reason}` : shortDeployApp(app);
    });
    const rest = list2.length - shown.length;
    return `${shown.join("、")}${rest > 0 ? `、ほか ${rest} アプリ` : ""}`;
  }
  function describeRunResult(result) {
    const revert = result.mode === "revert";
    const counts = countOutcomes(result.apps);
    if (result.blocked) {
      const head2 = revert ? "中止前の確認で止めました。まだプレビューの変更は破棄していません。" : "反映前の確認で止めました。まだ本番へは反映していません。";
      return { text: `${head2}${result.blocked}`, tone: "warn" };
    }
    const extras = [];
    if (counts.failed) extras.push(`失敗 ${counts.failed} アプリ`);
    if (counts.cancelled) extras.push(`取り消し ${counts.cancelled} アプリ`);
    if (counts.conflict) extras.push(`確認後に更新 ${counts.conflict} アプリ`);
    if (counts.unknown) extras.push(`完了を確認できない ${counts.unknown} アプリ`);
    const done = revert ? "中止" : "反映";
    if (result.cancelled) {
      const text2 = `中止しました（${counts.success}/${counts.total} アプリを${done}${extras.length ? `、${extras.join("、")}` : ""}、残り ${counts.pending} アプリは未実行）。` + (counts.success ? `${done}済みの分は${revert ? "プレビュー" : "本番"}に残っています。` : "") + (counts.unknown ? "依頼済みのアプリは kintone 側で処理が続く場合があります。" : "") + "「失敗・未実行だけ選び直す」から確認し直してください。";
      return { text: text2, tone: "warn" };
    }
    if (counts.success === counts.total && counts.total > 0) {
      if (counts.unverified) {
        return {
          text: `${counts.total} アプリで${done}の依頼が成功しましたが、${counts.unverified} アプリは${done}後の状態（revision）が本番とプレビューで一致しませんでした。アプリの設定画面で確認してください。`,
          tone: "warn"
        };
      }
      return { text: revert ? `${counts.total} アプリのプレビューの変更を中止しました。` : `${counts.total} アプリを本番へ反映しました。`, tone: "ok" };
    }
    const reasons = describeFailureReasons(result.apps);
    if (counts.pending) extras.push(`未実行 ${counts.pending} アプリ`);
    const head = counts.success ? `${counts.total} アプリ中 ${counts.success} アプリ${revert ? "の変更を中止" : "を反映"}しました。` : `${counts.total} アプリ中、${revert ? "変更を中止" : "反映"}できたアプリはありません。`;
    const unknownNote = counts.unknown ? "完了を確認できないアプリは、kintone 側で処理が続く場合があります。" : "";
    const text = `${head}${extras.join("、")}${reasons ? `（${reasons}）` : ""}。${unknownNote}「失敗・未実行だけ選び直す」から確認し直してください。`;
    return { text, tone: counts.success === 0 ? "err" : "warn" };
  }
  function retryableOutcomes(apps) {
    return apps.filter((app) => app.status !== "success");
  }
  function undoGuidance(mode) {
    return mode === "revert" ? "破棄した変更は、結果画面の「バックアップから戻す」で、プレビューに戻せます。" : "本番への反映は取り消せません。戻すときは、結果画面の「バックアップから戻す」で、反映前のバックアップとの差分を確認してから、本番へ反映します。削除したフィールドの値は戻りません。";
  }
  function backupDescription(mode, appCount) {
    return mode === "revert" ? `中止前のプレビューの設定（${appCount} アプリ分）をJSONで保存してから、変更を中止します。` : `反映前の本番設定（${appCount} アプリ分。変更のあるJS/CSSはファイル本体も含む）をJSONで保存してから反映します。`;
  }
  function appSettingsPath(app) {
    const base = app.guestId ? `/k/guest/${encodeURIComponent(app.guestId)}` : "/k";
    return `${base}/admin/app/flow?app=${encodeURIComponent(app.appId)}`;
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
    return withoutApiContextLines(message).replace("（revision 競合）", "（ほかの更新と重なったため。revision 競合）");
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

  // src/reflect/planReport.ts
  function escapeReflectMarkdown(value) {
    return String(value ?? "").replace(/[\r\n]+/g, " ").replace(/([\\`*_[\]<>|~])/g, "\\$1");
  }

  // src/deploy/report.ts
  var KIND_ORDER2 = ["削除", "変更", "追加", "保持"];
  var ITEMS_PER_SECTION_LIMIT = 50;
  function esc2(value) {
    return escapeReflectMarkdown(value);
  }
  function cell(value) {
    return esc2(value) || "－";
  }
  function formatStamp(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? String(value || "") : date.toLocaleString("ja-JP", { hour12: false });
  }
  function appHeading(app) {
    return esc2(formatDeployApp(app));
  }
  function appendAppDetails(lines, app, mode, headingLevel) {
    lines.push(`${headingLevel} ${appHeading(app)}`, "");
    lines.push(`- 状態: ${esc2(inspectStateLabel(app.state))}`);
    lines.push(`- revision: ${esc2(formatRevisionPair(app))}`);
    if (app.error) lines.push(`- 理由: ${esc2(app.error)}`);
    if (app.state === "changes" && app.contentSame) lines.push("- 設定の内容は同じです（revision だけが異なります）");
    for (const warning of app.warnings || []) lines.push(`- 注意: ${esc2(warning)}`);
    if (mode === "deploy") {
      for (const field of app.removedFields || []) {
        lines.push(`- 削除されるフィールド: ${esc2(describeRemovedField(field))}${field.possibleRename ? `（プレビューの『${esc2(field.possibleRename)}』へコードを変えただけなら値は残る可能性があります）` : ""}`);
      }
    }
    lines.push("");
    const heading = deployModeText(mode).changesHeading;
    for (const section of app.sections || []) {
      if (section.status === "error") {
        lines.push(`**${esc2(section.label)}**: 取得失敗${section.message ? `（${esc2(section.message)}）` : ""}`, "");
        continue;
      }
      if (section.status !== "change") continue;
      const counts = section.counts;
      lines.push(`**${esc2(section.label)}**（${heading}: 追加 ${counts.added}・変更 ${counts.changed}・削除 ${counts.removed}）`, "");
      const items = [...section.items || []].sort((a, b) => KIND_ORDER2.indexOf(a.kind) - KIND_ORDER2.indexOf(b.kind));
      for (const item of items.slice(0, ITEMS_PER_SECTION_LIMIT)) {
        lines.push(`- **${item.kind}** ${esc2(item.name)}`);
        for (const detail of item.details || []) lines.push(`  - ${esc2(detail)}`);
      }
      if (items.length > ITEMS_PER_SECTION_LIMIT) lines.push(`- ほか ${items.length - ITEMS_PER_SECTION_LIMIT} 件`);
      if (!items.length) lines.push(`- 変更 ${counts.added + counts.changed + counts.removed} 件（要約を作成できませんでした）`);
      lines.push("");
    }
  }
  function appendHeader(lines, opts) {
    const text = deployModeText(opts.mode);
    lines.push(`- 操作: ${esc2(text.label)}`);
    lines.push(`- 方向: ${esc2(text.direction)}`);
    lines.push(`- 反映の方法: ${esc2(describeBatchMode(opts.batchMode))}（${esc2(describeStopPolicy(opts.batchMode, opts.stopOnError))}）`);
  }
  function buildDeployPlanMarkdown(input) {
    const selected = new Set(input.selectedKeys);
    const targets = input.apps.filter((app) => app.state === "changes" && selected.has(deployAppKey(app)));
    const others = input.apps.filter((app) => !targets.includes(app));
    const text = deployModeText(input.mode);
    const totals = aggregateChanges(targets);
    const lines = [];
    lines.push(`# ${input.mode === "revert" ? "変更の中止" : "本番反映"}の計画`, "");
    lines.push(`- 作成日時: ${esc2(formatStamp(input.generatedAt))}`);
    appendHeader(lines, input);
    lines.push(`- 対象: ${targets.length} アプリ（確認した ${input.apps.length} アプリのうち）`);
    lines.push(`- バックアップ: ${esc2(backupDescription(input.mode, targets.length))}`);
    lines.push(`- 取り消し方: ${esc2(undoGuidance(input.mode))}`);
    lines.push("- この計画は書き込み前の確認結果です。まだ本番へは反映していません。", "");
    lines.push("## 概要", "");
    lines.push(`変更のある項目: 追加 ${totals.added} 件・変更 ${totals.changed} 件・削除 ${totals.removed} 件`);
    const removedText = describeRemovedSettings(totals);
    if (removedText) lines.push("", `削除される設定: ${esc2(removedText)}`);
    lines.push("");
    lines.push("| アプリ | 状態 | 実行 | 変更のある項目 | 削除 | revision（本番 → プレビュー） |");
    lines.push("| --- | --- | --- | --- | ---: | --- |");
    for (const app of input.apps) {
      const run = targets.includes(app) ? "対象" : app.state === "clean" ? "対象外（反映不要）" : selected.has(deployAppKey(app)) ? "対象外（確認が必要）" : "対象外";
      lines.push(`| ${cell(formatDeployApp(app))} | ${cell(inspectStateLabel(app.state))} | ${cell(run)} | ${cell(changedSectionLabels(app).join("、"))} | ${removedSettingCount(app)} | ${cell(`${app.productionRevision || "－"} → ${app.previewRevision || "－"}`)} |`);
    }
    lines.push("");
    if (input.mode === "deploy") {
      const removedFields = collectRemovedFields(targets);
      if (removedFields.length) {
        lines.push("## 削除されるフィールド", "");
        lines.push("本番へ反映すると、これらのフィールドのレコードの値も削除され、元に戻せません。", "");
        for (const { app, field } of removedFields) {
          lines.push(`- ${appHeading(app)}: ${esc2(describeRemovedField(field))}${field.possibleRename ? `（フィールドコードを変えただけなら値は残る可能性があります。プレビューの『${esc2(field.possibleRename)}』）` : ""}`);
        }
        lines.push("");
      }
    }
    lines.push(`## アプリ別の${text.changesHeading}`, "");
    for (const app of targets) appendAppDetails(lines, app, input.mode, "###");
    if (others.length) {
      lines.push("## 対象外のアプリ", "");
      for (const app of others) {
        lines.push(`- ${appHeading(app)}: ${esc2(inspectStateLabel(app.state))}${app.error ? `（${esc2(app.error)}）` : ""}`);
      }
      lines.push("");
    }
    return finish(lines);
  }
  function buildDeployRecordMarkdown(input) {
    const { result } = input;
    const text = deployModeText(result.mode);
    const counts = countOutcomes(result.apps);
    const message = describeRunResult(result);
    const lines = [];
    lines.push(`# ${result.mode === "revert" ? "変更の中止" : "本番反映"}の記録`, "");
    lines.push(`- 開始日時: ${esc2(formatStamp(result.startedAt))}`);
    lines.push(`- 終了日時: ${esc2(formatStamp(result.finishedAt))}`);
    appendHeader(lines, { mode: result.mode, batchMode: result.batchMode, stopOnError: input.stopOnError });
    lines.push(`- 結果: ${esc2(message.text)}`);
    lines.push(`- 件数: 成功 ${counts.success}・失敗 ${counts.failed}・取り消し ${counts.cancelled}・確認後に更新 ${counts.conflict}・完了を確認できない ${counts.unknown}・未実行 ${counts.pending}（対象 ${counts.total} アプリ）`);
    if (result.cancelled) lines.push("- 利用者の操作で中止しました。依頼済みのアプリは kintone 側で処理が続く場合があります。");
    if (result.blocked) lines.push(`- 反映前の確認で止めました: ${esc2(result.blocked)}`);
    if (result.backup) {
      lines.push(`- バックアップ: \`${String(result.backup.fileName).replace(/`/g, "")}\`（${result.backup.appCount} アプリ分・${result.backup.environment === "preview" ? "中止前のプレビューの設定" : "反映前の本番設定"}）`);
      for (const file of result.backup.unavailableFiles || []) {
        lines.push(`  - 本体を保存できなかったファイル: App ${esc2(file.appId)} / ${esc2(file.name)}（${esc2(file.reason)}）`);
      }
    } else {
      lines.push("- バックアップ: 保存していません");
    }
    lines.push(`- 取り消し方: ${esc2(undoGuidance(result.mode))}`, "");
    lines.push("## アプリ別の結果", "");
    lines.push("| アプリ | 結果 | 理由 | 本番の revision（前 → 後） | プレビューの revision | 反映後の確認 |");
    lines.push("| --- | --- | --- | --- | --- | --- |");
    for (const app of result.apps) {
      lines.push(`| ${cell(formatDeployApp(app))} | ${cell(describeDeployStatus(app.status, result.mode).text)} | ${cell(describeDeployMessage(app.message))} | ${cell(`${app.productionRevisionBefore || "－"} → ${app.productionRevisionAfter || "－"}`)} | ${cell(app.previewRevision)} | ${cell(verifiedLabel(app))} |`);
    }
    lines.push("");
    const targets = input.inspections.filter((inspection) => inspection.state === "changes");
    if (result.mode === "deploy") {
      const removedFields = collectRemovedFields(targets.filter((inspection) => {
        const outcome = result.apps.find((app) => deployAppKey(app) === deployAppKey(inspection));
        return !!outcome && outcome.status !== "pending";
      }));
      if (removedFields.length) {
        lines.push("## 削除を依頼したフィールド", "");
        lines.push("反映に成功したアプリでは、これらのフィールドのレコードの値も削除されています。", "");
        for (const { app, field } of removedFields) lines.push(`- ${appHeading(app)}: ${esc2(describeRemovedField(field))}`);
        lines.push("");
      }
    }
    lines.push(`## アプリ別の${text.changesHeading}`, "");
    for (const inspection of targets) appendAppDetails(lines, inspection, result.mode, "###");
    return finish(lines);
  }
  function verifiedLabel(app) {
    if (app.status !== "success") return "－";
    if (app.verified === true) return "一致";
    if (app.verified === false) return "不一致（要確認）";
    return "確認できず";
  }
  function finish(lines) {
    return lines.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd() + "\n";
  }
  function omitBackupContent(backup) {
    const { content: _content, ...rest } = backup;
    return { ...rest, unavailableFiles: [...rest.unavailableFiles || []] };
  }
  function buildDeployResultJson(result) {
    return {
      kind: "kintone-deploy-result",
      version: 1,
      mode: result.mode,
      batchMode: result.batchMode,
      startedAt: result.startedAt,
      finishedAt: result.finishedAt,
      cancelled: !!result.cancelled,
      ...result.blocked ? { blocked: result.blocked } : {},
      summary: countOutcomes(result.apps),
      message: describeRunResult(result).text,
      // バックアップ JSON の本体（content）は結果 JSON に含めない（JS/CSS の本文を含み得る。ファイル名と件数だけ残す）。
      ...result.backup ? { backup: omitBackupContent(result.backup) } : {},
      apps: result.apps.map((app) => ({ ...app })),
      logs: [...result.logs || []]
    };
  }
  function stringifyDeployResultJson(result) {
    return JSON.stringify(buildDeployResultJson(result), null, 2);
  }

  // src/reflect/standalonePlan.ts
  var formatBytes = (bytes) => bytes >= 1048576 ? `${(bytes / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.ceil(bytes / 1024))} KB`;
  var namedSections = { viewSettings: "views", reportSettings: "reports", actionSettings: "actions" };
  var own2 = (object2, key) => Object.prototype.hasOwnProperty.call(object2, key);
  var object = (value) => !!value && typeof value === "object" && !Array.isArray(value);
  var equal = (a, b) => stableReflectStringify(a) === stableReflectStringify(b);
  var valueText = (value) => value === void 0 ? "（なし）" : typeof value === "string" ? value : JSON.stringify(value);
  var diffPathLabels = { properties: "フィールド", layout: "配置", views: "一覧", reports: "グラフ", actions: "アクション", rights: "アクセス権", notifications: "通知", categories: "カテゴリー", label: "表示名", required: "必須", unique: "重複禁止", options: "選択肢", defaultValue: "初期値", type: "種類", index: "表示順", filterCond: "絞り込み", sort: "並び順", enable: "有効", states: "状態", scope: "適用範囲", fields: "フィールド", desktop: "PC", mobile: "モバイル" };
  var nameKeyedContainers = /* @__PURE__ */ new Set(["properties", "fields", "views", "reports", "actions", "states", "categories", "options"]);
  function diffValues(before, after, path, output, keysAreNames = false) {
    if (equal(before, after)) return;
    if (object(before) && object(after)) {
      for (const key of /* @__PURE__ */ new Set([...Object.keys(before), ...Object.keys(after)])) diffValues(own2(before, key) ? before[key] : void 0, own2(after, key) ? after[key] : void 0, [...path, !keysAreNames && own2(diffPathLabels, key) ? diffPathLabels[key] : key], output, !keysAreNames && nameKeyedContainers.has(key));
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
  var FIELD_DEPENDENT_SECTIONS = ["layoutSettings", "viewSettings", "reportSettings", "actionSettings", "appSettings", "fieldAcl", "reminderNotifications", "processSettings"];
  function reflectInspectionScopes(scopes) {
    return [.../* @__PURE__ */ new Set([...scopes, ...scopes.some((key) => FIELD_DEPENDENT_SECTIONS.includes(key)) ? ["fieldSettings"] : []])];
  }
  function reflectSelectionBlockers(entries, scopes, sourceFields, targetFields, sourceSystemFields = [], addableSourceFields = []) {
    const selected = entries.filter((entry) => scopes.includes(entry.sectionKey));
    const available = /* @__PURE__ */ new Set([...targetFields, ...scopes.includes("fieldSettings") && !selected.find((entry) => entry.sectionKey === "fieldSettings")?.blockers.length ? sourceFields : []]);
    const system = new Set(sourceSystemFields);
    const addable = new Set(addableSourceFields);
    const issues = selected.flatMap((entry) => entry.blockers.map((message) => `${entry.label}: ${message}`));
    for (const entry of selected) for (const code of entry.requiredFields || []) {
      if (available.has(code)) continue;
      if (system.has(code)) issues.push(`${entry.label}: 参照するフィールド「${code}」は反映元のシステムフィールド（レコード番号・ステータス・カテゴリーなど）ですが、反映先に同じコードがありません。反映先でフィールドコードを合わせる、またはプロセス管理・カテゴリーを有効にしてから再取得するか、この項目を除外してください。`);
      else if (scopes.includes("fieldSettings") && addable.has(code)) issues.push(`${entry.label}: 参照するフィールド「${code}」が反映先にありません。反映元にあるフィールドなので、フィールド設定で「${code}」の追加も選ぶか、この項目を除外してください。`);
      else issues.push(`${entry.label}: 参照するフィールド「${code}」が反映先にありません。フィールド設定も反映対象に含めるか、この項目を除外してください。`);
    }
    return [...new Set(issues)];
  }
  function reflectRequiredFields(key, after) {
    if (key === "viewSettings") {
      if (!object(after?.views)) return [];
      return [...new Set(Object.values(after.views).flatMap((view) => view?.type === "LIST" ? view.fields || [] : view?.type === "CALENDAR" ? [view.date, view.title].filter(Boolean) : []).filter((code) => !["$id", "$revision"].includes(code)))];
    }
    if (key === "actionSettings") return extractActionRequiredFields(after?.actions);
    if (key === "reportSettings") return extractReportRequiredFields(after?.reports);
    if (key === "fieldAcl") return [...new Set((after?.rights || []).map((right) => String(right?.code || "")).filter((code) => code && !["$id", "$revision"].includes(code)))];
    if (key === "reminderNotifications") return [...new Set((after?.notifications || []).flatMap((item) => [item?.timing?.code, ...(item?.targets || []).filter((target) => target?.entity?.type === "FIELD_ENTITY").map((target) => target.entity.code)]).map((code) => String(code || "")).filter((code) => !!code))];
    if (key === "processSettings") {
      if (!object(after?.states)) return void 0;
      return [...new Set(Object.values(after.states).flatMap((state3) => (state3?.assignee?.entities || []).filter((item) => item?.entity?.type === "FIELD_ENTITY").map((item) => String(item.entity.code || ""))).filter((code) => !!code))];
    }
    if (key === "layoutSettings") {
      const codes = [];
      const walk = (nodes) => {
        for (const node of nodes) {
          if (node.code) codes.push(String(node.code));
          if (Array.isArray(node.fields)) walk(node.fields);
          if (Array.isArray(node.layout)) walk(node.layout);
        }
      };
      walk(Array.isArray(after?.layout) ? after.layout : []);
      return [...new Set(codes)];
    }
    if (key === "appSettings") return after?.titleField?.selectionMode === "MANUAL" && typeof after.titleField.code === "string" && after.titleField.code ? [after.titleField.code] : void 0;
    return void 0;
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
        plan.requiredFields = reflectRequiredFields("appSettings", after);
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
      plan.values = { before: deepClone(before), after: deepClone(after) };
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
      let before, after, comparable3;
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
        if (preserve) for (const name of Object.keys(to).filter((name2) => !own2(from, name2))) plan.changes.push({ kind: "保持", path: `${diffPathLabels[property]} / ${name}`, before: valueText(to[name]), after: "内容を保持（表示順は反映元の後）" });
        plan.requiredFields = reflectRequiredFields(key, after);
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
          if (key === "reminderNotifications" && section === source && section.notifications.length && (typeof section.timezone !== "string" || !section.timezone)) throw new Error("リマインダー通知のタイムゾーンを取得できません。");
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
        if (key === "reminderNotifications" && !after.timezone) after.timezone = before.timezone;
        if (key === "processSettings") {
          const firstState = (states) => object(states) ? String(Object.values(states).sort((a, b) => Number(a?.index) - Number(b?.index))[0]?.name || "") : "";
          const sourceFirst = firstState(source.states), targetFirst = firstState(target.states);
          if (sourceFirst && targetFirst && sourceFirst !== targetFirst) plan.warnings.push(`先頭のステータスが異なります（反映先「${targetFirst}」→ 反映元「${sourceFirst}」）。kintone は先頭のステータスの入れ替えを拒否することがあります。拒否された場合は、反映先の管理画面で先頭のステータスを合わせてから再実行してください。`);
        }
        if (key === "notifications") {
          if (typeof target.notifyToCommenter === "boolean") before.notifyToCommenter = after.notifyToCommenter = target.notifyToCommenter;
          if (typeof source.notifyToCommenter === "boolean") after.notifyToCommenter = source.notifyToCommenter;
        }
        if (key === "customizeSettings") {
          if (source.scope !== void 0) after.scope = source.scope;
          if (target.scope !== void 0) before.scope = target.scope;
          const resolution = options.customizeFiles, names = customizeFileNames(source, target);
          comparable3 = (value) => comparableCustomizePayload(value, resolution, names);
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
        if (key === "fieldAcl" || key === "reminderNotifications" || key === "processSettings") {
          const required = reflectRequiredFields(key, after);
          if (required) plan.requiredFields = required;
        }
        if (key === "layoutSettings") {
          if (!Array.isArray(source.layout) || !Array.isArray(target.layout)) throw new Error("レイアウトの形式が不正です。");
          after.layout = mergeLayout(source.layout, target.layout, plan);
          plan.behavior = "配置を更新（反映先だけのフィールド配置は保持）";
          plan.requiredFields = reflectRequiredFields("layoutSettings", after);
        }
      }
      const shownBefore = comparable3 ? comparable3(before) : before, shownAfter = comparable3 ? comparable3(after) : after;
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
      plan.values = { before: deepClone(before), after: deepClone(after) };
      if (key === "customizeSettings") {
        plan.values.fileNames = { ...customizeFileNames(source, target) };
        plan.values.fileHashes = { ...options.customizeFiles?.hashes || {} };
      }
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

  // src/state.ts
  var state = {
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
  var REFLECT_APPLY_HISTORY_KEY = `${TOOL_ID}:reflectApplyHistory`;
  var WORK_HISTORY_KEY = `${TOOL_ID}:workHistory`;
  var CONNECTION_PRESETS_KEY = `${TOOL_ID}:connectionPresets`;
  function loadReflectApplyHistory() {
    return [];
  }
  function loadWorkHistory() {
    return [];
  }
  function loadConnectionPresets() {
    return [];
  }
  state.reflectApplyHistory = loadReflectApplyHistory();
  state.workHistory = loadWorkHistory();
  state.connectionPresets = loadConnectionPresets();

  // src/ui/dialog.ts
  var root = null;
  function setRootElement(el2) {
    root = el2;
  }

  // src/handlers/diffFocus.ts
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
  function formatReflectDateTime(at) {
    return new Date(at).toLocaleString("ja-JP");
  }

  // src/settingsBundleImport.ts
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

  // src/deploy/sourceRestore.ts
  function isDeployBackupFile(value) {
    return !!value && typeof value === "object" && value.kind === "kintone-deploy-backup" && Array.isArray(value.bundles);
  }
  function restoreGoalFor(environment) {
    return environment === "production" ? "production" : "preview";
  }
  function restorableScopes(bundle, declared) {
    const sections = bundle?.sections || {};
    const limit = Array.isArray(declared) ? new Set(declared.map(String)) : null;
    return REFLECT_SECTION_KEYS.filter((key) => {
      if (limit && !limit.has(key)) return false;
      const section = sections[key];
      return Object.prototype.hasOwnProperty.call(sections, key) && !!section && typeof section === "object" && !section._fetchError;
    });
  }
  var sameApp = (bundle, appId, guestId) => String(bundle.appId || "") === appId && String(bundle.guestId || "") === guestId;
  function prepareSourceRestore(request) {
    let bundles;
    try {
      bundles = pickAllSettingsBundles(request.content, "source", true);
    } catch (error) {
      return { ok: false, message: `バックアップを読み込めません。${error?.message || String(error)}` };
    }
    const appId = String(request.appId || ""), guestId = String(request.guestId || "");
    const bundleIndex = bundles.findIndex((bundle2) => sameApp(bundle2, appId, guestId));
    if (bundleIndex < 0) return { ok: false, message: `バックアップに App ${appId} の設定がありません。` };
    const bundle = bundles[bundleIndex];
    const declared = request.content?.scopes;
    const scopes = restorableScopes(bundle, declared);
    if (!scopes.length) return { ok: false, message: "バックアップに戻せる内容が見つかりません。" };
    return {
      ok: true,
      plan: { bundles, bundleIndex, bundle, scopes, goal: restoreGoalFor(request.environment), targetAppId: appId, targetGuestId: guestId, generatedAt: request.generatedAt, environment: request.environment, declaredScopes: declared }
    };
  }
  function prepareSourceRestoreFromFile(parsed) {
    if (!isDeployBackupFile(parsed)) return { ok: false, message: "本番反映のバックアップファイルではありません。" };
    let bundles;
    try {
      bundles = pickAllSettingsBundles(parsed, "source", true);
    } catch (error) {
      return { ok: false, message: `バックアップを読み込めません。${error?.message || String(error)}` };
    }
    const first = bundles[0];
    if (!first?.appId) return { ok: false, message: "バックアップにアプリの設定がありません。" };
    const environment = parsed.environment === "preview" ? "preview" : "production";
    const scopes = restorableScopes(first, parsed.scopes);
    if (!scopes.length) return { ok: false, message: "バックアップに戻せる内容が見つかりません。" };
    return {
      ok: true,
      plan: { bundles, bundleIndex: 0, bundle: first, scopes, goal: restoreGoalFor(environment), targetAppId: String(first.appId), targetGuestId: String(first.guestId || ""), generatedAt: String(parsed.generatedAt || ""), environment, declaredScopes: parsed.scopes }
    };
  }
  function restoreSelectionFor(plan, index) {
    const bundle = plan.bundles[index];
    if (!bundle) return null;
    return { bundle, scopes: restorableScopes(bundle, plan.declaredScopes), targetAppId: String(bundle.appId || ""), targetGuestId: String(bundle.guestId || "") };
  }
  function restoreSourceLabel(targetName, generatedAt) {
    const stamp = generatedAt && !Number.isNaN(new Date(generatedAt).getTime()) ? formatReflectDateTime(new Date(generatedAt)) : "";
    return `反映前のバックアップ（${[targetName, stamp].filter(Boolean).join("・")}）`;
  }
  var RESTORE_NOTICE_TITLE = "バックアップから戻しています";
  var RESTORE_NOTICE_BODY = "フィールドの削除は行わないため、反映で追加したフィールドは残ります。削除したフィールドの値は戻りません。反映先だけの一覧・グラフ・アクションは保持せず、参照先変換も使いません。";
  function pickSourceRestoreRequest(result, target) {
    const content = result.deploy?.backup?.content;
    const outcome = result.deploy?.apps.find((app) => app.appId === target.appId && (app.guestId || "") === (target.guestId || ""));
    if (content && outcome && (outcome.status === "success" || outcome.status === "unknown")) {
      return { content, appId: target.appId, guestId: target.guestId || "", generatedAt: content.generatedAt, environment: "production" };
    }
    const apply = result.apply.backup;
    if (apply) return { content: apply, appId: target.appId, guestId: target.guestId || "", generatedAt: apply.generatedAt, environment: "preview" };
    return null;
  }
  function pickPublishRestoreOptions(result) {
    const content = result.backup?.content;
    if (!content || !Array.isArray(content.bundles)) return [];
    const environment = content.environment === "preview" ? "preview" : "production";
    const options = [];
    for (const app of result.apps) {
      if (app.status !== "success" && app.status !== "unknown") continue;
      if (!content.bundles.some((bundle) => sameApp(bundle, app.appId, app.guestId || ""))) continue;
      options.push({ appId: app.appId, guestId: app.guestId || "", name: app.name, request: { content, appId: app.appId, guestId: app.guestId || "", generatedAt: content.generatedAt, environment } });
    }
    return options;
  }

  // src/diff/engine.ts
  var ENTITY_PATH_SEGMENT = String.raw`(?:\.[^.[\]]+|\["(?:[^"\\]|\\.)*"\])`;
  var ENTITY_IDENTIFIER_PATH_PATTERNS = [
    new RegExp(`^(?:fieldsettings\\.properties|viewsettings\\.views|reportsettings\\.reports|processsettings\\.states|categories\\.categories|actionsettings\\.actions)${ENTITY_PATH_SEGMENT}$`),
    new RegExp(`^fieldsettings\\.properties${ENTITY_PATH_SEGMENT}\\.fields${ENTITY_PATH_SEGMENT}$`),
    // 選択肢のキーもラベルを識別子とする名前付きマップ。
    new RegExp(`^fieldsettings\\.properties${ENTITY_PATH_SEGMENT}(?:\\.fields${ENTITY_PATH_SEGMENT})?\\.options${ENTITY_PATH_SEGMENT}$`)
  ];

  // src/diff/category-view.ts
  var DIFF_CATEGORIES = [
    { key: "fields", label: "フィールド", hint: "フィールド定義の追加・変更", sections: ["fieldSettings"], icon: "🔤" },
    { key: "layout", label: "レイアウト", hint: "フォーム配置の差分", sections: ["layoutSettings"], icon: "🧩" },
    { key: "views", label: "ビュー・グラフ", hint: "一覧表示とレポート", sections: ["viewSettings", "reportSettings"], icon: "📊" },
    { key: "process", label: "プロセス・アクション", hint: "ステータス遷移とアクション", sections: ["processSettings", "actionSettings"], icon: "🔁" },
    { key: "notify", label: "通知", hint: "通知ルールとリマインダー", sections: ["notifications", "perRecordNotifications", "reminderNotifications"], icon: "🔔" },
    { key: "acl", label: "権限", hint: "アプリ・フィールド・レコード権限", sections: ["appAcl", "fieldAcl", "recordPermissions"], icon: "🔐" },
    { key: "customize", label: "JS/CSS・プラグイン", hint: "カスタマイズと配布資産", sections: ["customizeSettings", "pluginSettings"], icon: "🧪" },
    { key: "app", label: "アプリ設定", hint: "基本情報・フォーム・カテゴリ", sections: ["appSettings", "appInfo", "formSettings", "categories"], icon: "⚙" }
  ];
  var SECTION_TO_CATEGORY = (() => {
    const m = {};
    for (const cat of DIFF_CATEGORIES) for (const sec of cat.sections) m[sec] = cat.key;
    return m;
  })();

  // src/diff/export.ts
  var DIFF_HTML_REVIEW_STATE_MAX_BYTES = 2 * 1024 * 1024;

  // src/diff/filter.ts
  var SECTION_LABEL_BY_KEY = new Map(
    SECTION_DEFS.map((s) => [s.key, s.label])
  );

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
  var STYLE_ID = "kus-lp-theme-styles";
  var ACCENTS = {
    diff: { from: "#1d4ed8", via: "#2563eb", to: "#0ea5e9", chip: "#dbeafe", ring: "rgba(37,99,235,.16)" },
    reflect: { from: "#b91c1c", via: "#dc2626", to: "#f97316", chip: "#fee2e2", ring: "rgba(220,38,38,.18)" },
    deploy: { from: "#4c0519", via: "#881337", to: "#be123c", chip: "#ffe4e6", ring: "rgba(136,19,55,.22)" },
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
  function makeAppTable(opts = {}) {
    const minRows = Math.max(1, opts.minRows ?? 1);
    const wrap = document.createElement("div");
    wrap.className = "kus-lp__apptable";
    const tableScroll = document.createElement("div");
    tableScroll.className = "kus-lp__apptable-scroll";
    const table = document.createElement("table");
    const thead = document.createElement("thead");
    thead.innerHTML = '<tr><th class="kus-lp__apptable-no" scope="col">#</th><th scope="col">アプリID</th><th scope="col">ゲストID</th><th class="kus-lp__apptable-acts-h" scope="col">操作</th></tr>';
    table.appendChild(thead);
    const tbody = document.createElement("tbody");
    table.appendChild(tbody);
    tableScroll.appendChild(table);
    wrap.appendChild(tableScroll);
    const foot = document.createElement("div");
    foot.className = "kus-lp__apptable-foot";
    const addBtn = makeButton("＋ 行を追加", "sub");
    foot.appendChild(addBtn);
    if (opts.currentAppId && /^\d+$/.test(String(opts.currentAppId).trim())) {
      const curBtn = makeButton("現在のアプリ", "sub");
      curBtn.title = "今開いているアプリのIDを空き行に入れます";
      curBtn.addEventListener("click", () => {
        const id = String(opts.currentAppId).trim();
        const guest = String(
          opts.currentGuestId ?? (typeof location !== "undefined" ? extractGuestIdFromInput(location.pathname || "") : "")
        ).trim();
        if (rows.some((r) => r.app.value.trim() === id && r.guest.value.trim() === guest)) return;
        const empty = rows.find((r) => !r.app.value.trim());
        if (empty) {
          empty.app.value = id;
          empty.guest.value = guest;
          setAppName(empty, "");
          empty.app.focus();
        } else {
          insertRow(rows.length, id, guest, true);
        }
        emitChange();
      });
      foot.appendChild(curBtn);
    }
    const count = document.createElement("span");
    count.className = "kus-lp__apptable-count";
    foot.appendChild(count);
    wrap.appendChild(foot);
    const hint = document.createElement("div");
    hint.className = "kus-lp__apptable-hint";
    hint.textContent = "アプリIDは「100, 120, 130」のようにカンマ区切りでまとめて入力・貼り付けすると自動で行に分割されます。アプリURLの貼り付けにも対応しています。";
    wrap.appendChild(hint);
    const rows = [];
    function getApps() {
      const seen = /* @__PURE__ */ new Set();
      const out = [];
      for (const r of rows) {
        const appId = r.app.value.trim();
        if (!appId) continue;
        const guestId = r.guest.value.trim();
        const key = `${appId}::${guestId}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const row = { appId, guestId };
        if (r.appName) row.appName = r.appName;
        out.push(row);
      }
      return out;
    }
    function getAllRows() {
      return rows.map((r) => {
        const row = { appId: r.app.value.trim(), guestId: r.guest.value.trim() };
        if (r.appName) row.appName = r.appName;
        return row;
      });
    }
    function setAppName(entry, appName) {
      entry.appName = String(appName || "").trim();
      entry.name.textContent = entry.appName;
      entry.name.title = entry.appName ? `アプリ名: ${entry.appName}` : "";
      entry.name.classList.toggle("kus-lp__apptable-name--empty", !entry.appName);
    }
    function setRowValues(entry, appId, guestId, appName) {
      entry.app.value = appId;
      entry.guest.value = guestId;
      setAppName(entry, appName);
    }
    function refresh() {
      rows.forEach((r, i) => {
        const no = r.tr.querySelector(".kus-lp__apptable-no");
        if (no) no.textContent = String(i + 1);
        r.copyBtn.disabled = i === 0;
      });
      const n = getApps().length;
      count.textContent = n ? `${n} アプリ` : "未入力";
    }
    function emitChange() {
      refresh();
      opts.onChange?.(getApps());
    }
    function parseAppToken(token, fallbackGuest) {
      const trimmed = token.trim();
      if (!trimmed || /^\d+$/.test(trimmed)) return { appId: trimmed, guestId: fallbackGuest };
      const extractedApp = extractAppIdFromInput(trimmed);
      if (!extractedApp) return { appId: trimmed, guestId: fallbackGuest };
      const extractedGuest = extractGuestIdFromInput(trimmed);
      const guestId = extractedGuest || (/\/k\/\d+(?:[/?#]|$)/i.test(trimmed) ? "" : fallbackGuest);
      return { appId: extractedApp, guestId };
    }
    function distributeAppTokens(entry) {
      const raw = entry.app.value;
      const guestVal = entry.guest.value.trim();
      if (!/[,、\s]/.test(raw)) {
        const parsed = parseAppToken(raw, guestVal);
        if (parsed.appId !== raw || parsed.guestId !== guestVal) {
          entry.app.value = parsed.appId;
          entry.guest.value = parsed.guestId;
          setAppName(entry, "");
          return true;
        }
        return false;
      }
      const tokens = raw.split(/[,、\s]+/).map((t) => t.trim()).filter(Boolean);
      if (tokens.length <= 1) {
        const parsed = parseAppToken(tokens[0] || "", guestVal);
        if (entry.app.value !== parsed.appId || entry.guest.value.trim() !== parsed.guestId) {
          entry.app.value = parsed.appId;
          entry.guest.value = parsed.guestId;
          setAppName(entry, "");
          return true;
        }
        return false;
      }
      const first = parseAppToken(tokens[0], guestVal);
      entry.app.value = first.appId;
      entry.guest.value = first.guestId;
      setAppName(entry, "");
      const start = rows.indexOf(entry);
      let last = entry;
      for (let k = 1; k < tokens.length; k += 1) {
        const next = parseAppToken(tokens[k], guestVal);
        last = insertRow(start + k, next.appId, next.guestId, false);
      }
      try {
        last.app.focus();
      } catch {
      }
      return true;
    }
    function removeRow(entry) {
      if (rows.length <= minRows) {
        entry.app.value = "";
        entry.guest.value = "";
        setAppName(entry, "");
        emitChange();
        return;
      }
      const idx = rows.indexOf(entry);
      if (idx >= 0) rows.splice(idx, 1);
      entry.tr.remove();
      emitChange();
    }
    function insertRow(index, appId = "", guestId = "", focus = false, appName = "") {
      const tr = document.createElement("tr");
      const tdNo = document.createElement("td");
      tdNo.className = "kus-lp__apptable-no";
      const tdApp = document.createElement("td");
      const tdGuest = document.createElement("td");
      const tdAct = document.createElement("td");
      tdAct.className = "kus-lp__apptable-acts";
      const app = makeInput({ placeholder: opts.appPlaceholder || "アプリID（カンマ区切りで複数可）", ariaLabel: "アプリID" });
      const guest = makeInput({ placeholder: opts.guestPlaceholder || "空欄=通常スペース", ariaLabel: "ゲストID" });
      app.value = appId;
      guest.value = guestId;
      const name = document.createElement("div");
      name.className = "kus-lp__apptable-name";
      const copyBtn = makeButton("↑コピー", "sub");
      copyBtn.title = "上の行のアプリID・ゲストIDをこの行へコピー";
      const dupBtn = makeButton("複製", "sub");
      dupBtn.title = "この行を下に複製";
      const delBtn = makeButton("×", "ghost");
      delBtn.title = "この行を削除";
      tdApp.appendChild(app);
      tdApp.appendChild(name);
      tdGuest.appendChild(guest);
      tdAct.appendChild(copyBtn);
      tdAct.appendChild(dupBtn);
      tdAct.appendChild(delBtn);
      tr.appendChild(tdNo);
      tr.appendChild(tdApp);
      tr.appendChild(tdGuest);
      tr.appendChild(tdAct);
      const entry = { tr, app, guest, name, appName: "", copyBtn };
      setAppName(entry, appName);
      copyBtn.addEventListener("click", () => {
        const idx = rows.indexOf(entry);
        if (idx <= 0) return;
        const prev = rows[idx - 1];
        app.value = prev.app.value;
        guest.value = prev.guest.value;
        setAppName(entry, prev.appName);
        app.focus();
        emitChange();
      });
      dupBtn.addEventListener("click", () => {
        const idx = rows.indexOf(entry);
        const ne = insertRow(idx + 1, app.value.trim(), guest.value.trim(), true, entry.appName);
        ne.app.focus();
        emitChange();
      });
      delBtn.addEventListener("click", () => removeRow(entry));
      app.addEventListener("input", () => {
        if (entry.appName) setAppName(entry, "");
        emitChange();
      });
      guest.addEventListener("input", emitChange);
      app.addEventListener("change", () => {
        if (distributeAppTokens(entry)) emitChange();
      });
      app.addEventListener("paste", (ev) => {
        const text = ev.clipboardData?.getData("text") || "";
        const hasUrl = Boolean(extractAppIdFromInput(text.trim())) && !/^\d+$/.test(text.trim());
        if (!/[,、\s]/.test(text) && !hasUrl) return;
        ev.preventDefault();
        const start = app.selectionStart ?? app.value.length;
        const end = app.selectionEnd ?? start;
        const combined = app.value.slice(0, start) + text + app.value.slice(end);
        app.value = combined;
        if (distributeAppTokens(entry)) emitChange();
      });
      const at = Math.min(Math.max(index, 0), rows.length);
      if (at >= rows.length) tbody.appendChild(tr);
      else tbody.insertBefore(tr, rows[at].tr);
      rows.splice(at, 0, entry);
      if (focus) app.focus();
      return entry;
    }
    addBtn.addEventListener("click", () => {
      const e = insertRow(rows.length, "", "", true);
      e.app.focus();
      emitChange();
    });
    function putApp(appId = "", guestId = "", o = {}) {
      const id = String(appId || "").trim();
      if (!id) return { action: "ignored", index: -1 };
      const guest = String(guestId || "").trim();
      const appName = String(o.appName || "").trim();
      const empty = rows.find((r) => !r.app.value.trim());
      const targetGuest = guest;
      const existing = rows.find((r) => r.app.value.trim() === id && r.guest.value.trim() === targetGuest);
      if (existing) {
        if (appName && existing.appName !== appName) {
          setAppName(existing, appName);
          emitChange();
        }
        if (o.focus) existing.app.focus();
        return { action: "existing", index: rows.indexOf(existing) };
      }
      if (empty) {
        setRowValues(empty, id, targetGuest, appName);
        if (o.focus) empty.app.focus();
        emitChange();
        return { action: "filled", index: rows.indexOf(empty) };
      }
      const entry = insertRow(rows.length, id, guest, !!o.focus, appName);
      emitChange();
      return { action: "added", index: rows.indexOf(entry) };
    }
    function putApps(list2) {
      const result = { added: 0, filled: 0, existing: 0, ignored: 0 };
      const keyOf = (appId, guestId) => `${appId}::${guestId}`;
      const existingByKey = /* @__PURE__ */ new Map();
      for (const r of rows) {
        const id = r.app.value.trim();
        const key = keyOf(id, r.guest.value.trim());
        if (id && !existingByKey.has(key)) existingByKey.set(key, r);
      }
      const empties = rows.filter((r) => !r.app.value.trim());
      let changed = false;
      for (const item of Array.isArray(list2) ? list2 : []) {
        const id = String(item?.appId || "").trim();
        if (!id) {
          result.ignored += 1;
          continue;
        }
        const guest = String(item?.guestId || "").trim();
        const appName = String(item?.appName || "").trim();
        const existing = existingByKey.get(keyOf(id, guest));
        if (existing) {
          if (appName && existing.appName !== appName) {
            setAppName(existing, appName);
            changed = true;
          }
          result.existing += 1;
          continue;
        }
        const empty = empties.shift();
        const entry = empty || insertRow(rows.length, id, guest, false, appName);
        if (empty) setRowValues(empty, id, guest, appName);
        existingByKey.set(keyOf(id, guest), entry);
        if (empty) result.filled += 1;
        else result.added += 1;
        changed = true;
      }
      if (changed) emitChange();
      return result;
    }
    function setApps(list2) {
      rows.splice(0).forEach((r) => r.tr.remove());
      tbody.innerHTML = "";
      const src = Array.isArray(list2) && list2.length ? list2 : [{ appId: "", guestId: "" }];
      src.forEach((r) => insertRow(
        rows.length,
        String(r.appId || "").trim(),
        String(r.guestId || "").trim(),
        false,
        String(r.appName || "").trim()
      ));
      while (rows.length < minRows) insertRow(rows.length, "", "");
      emitChange();
    }
    setApps(opts.initial || []);
    return {
      element: wrap,
      getApps,
      getAllRows,
      first: () => {
        const r = rows[0];
        if (!r) return { appId: "", guestId: "" };
        const row = { appId: r.app.value.trim(), guestId: r.guest.value.trim() };
        if (r.appName) row.appName = r.appName;
        return row;
      },
      addRow: (appId = "", guestId = "", o = {}) => {
        insertRow(rows.length, appId, guestId, !!o.focus, String(o.appName || "").trim());
        emitChange();
      },
      putApp,
      putApps,
      setApps,
      clear: () => setApps([]),
      count: () => getApps().length
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

  // src/entries/deployProgressView.ts
  function el(tag, className = "", text = "") {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  }
  function setButtonText(button, text) {
    const span = button.querySelector("span");
    if (span) span.textContent = text;
    else button.textContent = text;
  }
  function firstLines(message, max = 6) {
    return String(message || "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean).slice(0, max).join("\n");
  }
  function createProgressView(host, mode, initial) {
    host.replaceChildren();
    const rows = /* @__PURE__ */ new Map();
    for (const row of initial) rows.set(deployAppKey(row), { ...row });
    const summary = el("div", "kus-dp-progress__summary");
    summary.setAttribute("role", "status");
    summary.setAttribute("aria-live", "polite");
    summary.setAttribute("aria-atomic", "true");
    const omitted = el("div", "kus-dp-progress__omitted");
    const list2 = el("ul", "kus-dp-result-list");
    host.append(summary, omitted, list2);
    let timer = 0;
    let disposed = false;
    function buildItem(row) {
      const display = describeDeployStatus(row.status, mode);
      const item = el("li", `kus-dp-result-item kus-dp-result-item--${display.tone}`);
      item.dataset.deployApp = row.appId;
      item.dataset.deployGuest = row.guestId;
      item.dataset.deployStatus = row.status;
      const head = el("div", "kus-dp-result-item__head");
      const state3 = el("span", `kus-dp-result-state kus-dp-result-state--${display.tone}`);
      const icon = el("span");
      icon.setAttribute("aria-hidden", "true");
      icon.textContent = display.icon;
      state3.append(icon, document.createTextNode(display.text));
      head.append(state3, el("strong", "", formatDeployApp(row)));
      item.appendChild(head);
      const message = describeDeployMessage(row.message).split("\n").slice(0, 8).join("\n");
      if (message) item.appendChild(el("div", "kus-dp-result-item__message", message));
      const outcome = row.outcome;
      if (outcome && outcome.status === "success") {
        const revisions = `本番のrevision: ${outcome.productionRevisionBefore || "－"} → ${outcome.productionRevisionAfter || "－"}（プレビュー ${outcome.previewRevision || "－"}）`;
        const verified = outcome.verified === true ? "反映後の確認: 本番とプレビューが一致" : outcome.verified === false ? "反映後の確認: 本番とプレビューのrevisionが一致しません。アプリの設定画面で確認してください" : "反映後の確認: できませんでした";
        item.appendChild(el("div", `kus-dp-result-item__meta${outcome.verified === false ? " kus-dp-result-item__meta--warn" : ""}`, `${revisions} / ${verified}`));
      }
      return item;
    }
    function render() {
      if (disposed) return;
      timer = 0;
      const all = [...rows.values()];
      const counts = countOutcomes(all);
      summary.textContent = describeRunProgress(counts);
      let visible = all;
      if (all.length > DEPLOY_RESULT_FULL_LIMIT) {
        const problems = all.filter((row) => isProblemStatus(row.status));
        const active2 = all.filter((row) => row.status === "checking" || row.status === "deploying");
        visible = [...problems.slice(0, DEPLOY_RESULT_FULL_LIMIT), ...active2.slice(0, 20)];
      }
      const hidden = all.length - visible.length;
      omitted.textContent = hidden > 0 ? `ほか ${hidden} アプリは一覧に表示していません（内訳は上の件数。全件は「結果JSONを保存」で確認できます）。` : "";
      omitted.hidden = hidden <= 0;
      list2.replaceChildren(...visible.map(buildItem));
    }
    function schedule() {
      if (timer || disposed) return;
      timer = window.setTimeout(render, 80);
    }
    render();
    return {
      update(update) {
        const row = rows.get(deployAppKey(update));
        if (!row) return;
        row.status = update.status;
        if (update.message !== void 0) row.message = update.message;
        schedule();
      },
      setOutcomes(apps) {
        for (const outcome of apps) {
          const key = deployAppKey(outcome);
          const row = rows.get(key) || { appId: outcome.appId, guestId: outcome.guestId, name: outcome.name, status: outcome.status };
          row.name = outcome.name || row.name;
          row.status = outcome.status;
          row.message = outcome.message;
          row.outcome = outcome;
          rows.set(key, row);
        }
        if (timer) {
          window.clearTimeout(timer);
          timer = 0;
        }
        render();
      },
      rows: () => [...rows.values()].map((row) => ({ ...row })),
      counts: () => countOutcomes([...rows.values()]),
      flush() {
        if (timer) window.clearTimeout(timer);
        render();
      },
      dispose() {
        disposed = true;
        if (timer) window.clearTimeout(timer);
      }
    };
  }

  // src/reflect/targetPending.ts
  var comparableResources = (list2) => Array.isArray(list2) ? list2.map((item) => item?.type === "FILE" ? { type: "FILE", name: item.file?.name ?? "", size: String(item.file?.size ?? "") } : item) : list2;
  var comparable2 = (key, section) => {
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
        if (comparable2(key, before) !== comparable2(key, after)) sectionKeys.push(key);
      }
      const customizeNote = opts.scopes.includes("customizeSettings") ? "。JS/CSSのファイルは名前とサイズだけで比べています" : "";
      const message = sectionKeys.length ? `反映先プレビューには未公開の変更があります（${sectionKeys.map(reflectSectionLabel).join("、")}）。公開すると今回の反映と一緒に本番へ反映されます。` : `選択した項目には未公開の変更はありませんが、ほかの設定に未公開の変更がある可能性があります（設定の更新番号 revision が 本番 ${productionRevision} とプレビュー ${previewRevision} で異なります${customizeNote}）。`;
      return { state: "pending", productionRevision, previewRevision, sectionKeys, message };
    } catch (error) {
      if (isRunCancelledError(error)) throw error;
      return unknown(productionRevision, previewRevision, error?.message || String(error));
    }
  }

  // src/reflect/selectionPointer.ts
  var own3 = (target, key) => Object.prototype.hasOwnProperty.call(target, key);
  var isPlainObject = (value) => !!value && typeof value === "object" && !Array.isArray(value);
  function cloneJson(value) {
    return value === void 0 ? value : JSON.parse(JSON.stringify(value));
  }
  function stableJson(value) {
    const sort = (input) => Array.isArray(input) ? input.map(sort) : isPlainObject(input) ? Object.fromEntries(Object.keys(input).sort().map((key) => [key, sort(input[key])])) : input;
    return JSON.stringify(sort(value)) ?? "undefined";
  }
  var sameValue = (a, b) => stableJson(a) === stableJson(b);
  var escapePointerToken = (token) => token.replace(/~/g, "~0").replace(/\//g, "~1");
  var unescapePointerToken = (token) => token.replace(/~1/g, "/").replace(/~0/g, "~");
  function pointerOf(tokens) {
    return tokens.map((token) => `/${escapePointerToken(token)}`).join("");
  }
  function parsePointer(pointer) {
    if (pointer === "") return [];
    if (!pointer.startsWith("/")) throw new Error(`JSON Pointer の形式が不正です: ${pointer}`);
    return pointer.slice(1).split("/").map(unescapePointerToken);
  }
  function setOwn(target, key, value) {
    Object.defineProperty(target, key, { value, enumerable: true, writable: true, configurable: true });
  }
  function getAt(root2, tokens) {
    let current = root2;
    for (const token of tokens) {
      if (!isPlainObject(current) || !own3(current, token)) return void 0;
      current = current[token];
    }
    return current;
  }
  function setAt(root2, tokens, value) {
    if (!tokens.length) throw new Error("ルートは置き換えられません。");
    let current = root2;
    for (const token of tokens.slice(0, -1)) {
      if (!isPlainObject(current[token]) || !own3(current, token)) setOwn(current, token, {});
      current = current[token];
    }
    setOwn(current, tokens[tokens.length - 1], value);
  }
  function deleteAt(root2, tokens) {
    if (!tokens.length) return;
    const parent = getAt(root2, tokens.slice(0, -1));
    if (isPlainObject(parent)) delete parent[tokens[tokens.length - 1]];
  }
  function pointerWithin(pointer, scope) {
    return pointer === scope || pointer.startsWith(`${scope}/`);
  }

  // src/reflect/selectionLabels.ts
  var MAX_TEXT = 80;
  function clipText(text, max = MAX_TEXT) {
    if (text.length <= max) return text;
    const chars = Array.from(text);
    return chars.length <= max ? text : `${chars.slice(0, max - 1).join("")}…`;
  }
  function fieldDisplayName(code, fieldLabels, hint) {
    const label = typeof hint === "string" && hint ? hint : own3(fieldLabels, code) ? fieldLabels[code] : "";
    return label && label !== code ? `${label}（${code}）` : code;
  }
  var VIEW_LABELS = {
    fields: "表示フィールド",
    sort: "並び順",
    filterCond: "絞り込み条件",
    type: "一覧の種類",
    date: "日付フィールド",
    title: "タイトルフィールド",
    html: "HTML",
    pager: "ページ送りの表示",
    device: "表示するデバイス",
    builtinType: "標準一覧の種類",
    index: "表示順",
    name: "名前",
    views: "一覧"
  };
  var REPORT_LABELS = {
    chartType: "グラフの種類",
    chartMode: "モード",
    groups: "分類",
    aggregations: "集計",
    sorts: "並び順",
    filterCond: "絞り込み条件",
    periodicReport: "定期レポート",
    index: "表示順",
    name: "名前",
    reports: "グラフ"
  };
  var ACTION_LABELS = {
    filterCond: "実行条件",
    entities: "実行できる対象",
    destApp: "コピー先アプリ",
    mappings: "フィールド対応",
    index: "表示順",
    name: "名前",
    actions: "アクション"
  };
  var PROCESS_LABELS = {
    enable: "プロセス管理の有効化",
    states: "ステータス",
    actions: "アクション",
    assignee: "作業者",
    index: "表示順",
    name: "名前"
  };
  var CATEGORY_LABELS = {
    enabled: "カテゴリー機能",
    categories: "カテゴリー",
    children: "下の階層のカテゴリー",
    index: "表示順",
    name: "名前"
  };
  var CUSTOMIZE_LABELS = { scope: "適用範囲", desktop: "PC", mobile: "モバイル", js: "JS", css: "CSS" };
  var OTHER_TOP_LABELS = {
    appAcl: { rights: "アプリのアクセス権" },
    fieldAcl: { rights: "フィールドのアクセス権" },
    recordPermissions: { rights: "レコードのアクセス権" },
    notifications: { notifications: "通知" },
    perRecordNotifications: { notifications: "レコード条件通知" },
    reminderNotifications: { notifications: "リマインダー通知" },
    layoutSettings: { layout: "レイアウト" },
    pluginSettings: { plugins: "プラグイン" }
  };
  var SECTION_KEY_LABELS = {
    viewSettings: VIEW_LABELS,
    reportSettings: REPORT_LABELS,
    actionSettings: ACTION_LABELS,
    processSettings: PROCESS_LABELS,
    categories: CATEGORY_LABELS,
    customizeSettings: CUSTOMIZE_LABELS,
    appSettings: APP_SETTINGS_LABELS,
    fieldSettings: FIELD_SETTING_LABELS,
    ...OTHER_TOP_LABELS
  };
  function keyLabel(sectionKey, key) {
    const table = SECTION_KEY_LABELS[sectionKey];
    if (table && own3(table, key)) return table[key];
    return labelOfProp(key);
  }
  var MONTH_OPTIONS = Array.from({ length: 12 }, (_value, index) => [String(index + 1), `${index + 1}月`]);
  var SELECT_BY_KEY = {
    theme: APP_THEME_JP,
    roundingMode: ROUNDING_MODE_JP,
    scope: CUSTOMIZE_SCOPE_JP,
    align: ALIGN_JP,
    unitPosition: UNIT_POSITION_JP,
    protocol: LINK_PROTOCOL_JP,
    format: NUMBER_FORMAT_JP,
    chartType: CHART_TYPE_JP,
    chartMode: CHART_MODE_JP,
    builtinType: VIEW_BUILTIN_TYPE_JP,
    device: VIEW_DEVICE_JP,
    selectionMode: TITLE_SELECTION_JP
  };
  function selectOptionsFor(sectionKey, key, value) {
    let options;
    if (key === "firstMonthOfFiscalYear") options = MONTH_OPTIONS;
    else if (key === "type" && sectionKey === "viewSettings") options = Object.entries(VIEW_TYPE_JP);
    else if (own3(SELECT_BY_KEY, key)) options = Object.entries(SELECT_BY_KEY[key]);
    if (!options) return void 0;
    return typeof value === "string" && options.some(([option]) => option === value) ? options : void 0;
  }
  function enumText(sectionKey, key, value) {
    if (key === "firstMonthOfFiscalYear") return /^\d+$/.test(value) ? `${Number(value)}月` : void 0;
    if (key === "type") {
      const dict3 = sectionKey === "viewSettings" ? VIEW_TYPE_JP : sectionKey === "fieldSettings" ? FIELD_TYPE_JP : void 0;
      return dict3 && own3(dict3, value) ? dict3[value] : void 0;
    }
    const dict2 = own3(SELECT_BY_KEY, key) ? SELECT_BY_KEY[key] : void 0;
    return dict2 && own3(dict2, value) ? dict2[value] : void 0;
  }
  function entityName(entity) {
    if (!isPlainObject(entity)) return String(entity);
    const type = String(entity.type || ""), code = String(entity.code ?? "");
    const typeText = own3(ENTITY_TYPE_JP, type) ? ENTITY_TYPE_JP[type] : type === "DEPARTMENT" ? "組織" : type;
    return code ? `${typeText}「${code}」` : typeText || "対象";
  }
  function elementName(element, key, ctx) {
    if (typeof element === "string") return ctx.sectionKey === "viewSettings" && key === "fields" ? fieldDisplayName(element, ctx.fieldLabels) : element;
    if (!isPlainObject(element)) return String(element);
    if (ctx.sectionKey === "customizeSettings") {
      if (element.type === "URL") return String(element.url ?? "");
      const fileKey = String(element.file?.fileKey ?? "");
      return element.file?.name || (ctx.fileNames && own3(ctx.fileNames, fileKey) ? ctx.fileNames[fileKey] : "") || "アップロードファイル";
    }
    if (isPlainObject(element.entity)) return entityName(element.entity);
    if (ctx.sectionKey === "fieldAcl" && element.code) return fieldDisplayName(String(element.code), ctx.fieldLabels);
    if (ctx.sectionKey === "processSettings" && key === "actions") return `${element.name ?? "（名称なし）"}（${element.from ?? "?"} → ${element.to ?? "?"}）`;
    if (ctx.sectionKey === "recordPermissions" && typeof element.filterCond === "string") return element.filterCond ? `条件「${clipText(element.filterCond, 30)}」` : "条件なし";
    if (key === "groups" || key === "aggregations") return String(element.code ?? element.type ?? JSON.stringify(element));
    if (typeof element.name === "string" && element.name) return element.name;
    if (typeof element.code === "string" && element.code) return element.code;
    if (typeof element.type === "string" && element.type) return element.type;
    return clipText(JSON.stringify(element), 30);
  }
  function layoutText(layout) {
    let fields = 0;
    const walk = (nodes) => {
      for (const node of nodes) {
        if (!isPlainObject(node)) continue;
        if (typeof node.code === "string" && node.code && node.type !== "GROUP" && node.type !== "SUBTABLE") fields += 1;
        if (Array.isArray(node.fields)) walk(node.fields);
        if (Array.isArray(node.layout)) walk(node.layout);
      }
    };
    walk(layout);
    return `${layout.length} 行・フィールド ${fields} 個`;
  }
  function describeValue(key, value, ctx) {
    if (value === void 0 || value === null) return "（なし）";
    if (typeof value === "boolean") return value ? "はい" : "いいえ";
    if (typeof value === "number") return String(value);
    if (typeof value === "string") {
      if (value === "") return "（空）";
      return clipText(enumText(ctx.sectionKey, key, value) ?? value);
    }
    if (Array.isArray(value)) {
      if (!value.length) return "（空）";
      if (ctx.sectionKey === "layoutSettings" && key === "layout") return layoutText(value);
      const names = value.map((element) => elementName(element, key, ctx));
      const joined = names.join("、");
      const objects = value.some(isPlainObject);
      return clipText(objects || value.length > 3 ? `${value.length}件（${joined}）` : joined);
    }
    if (isPlainObject(value)) {
      if (ctx.sectionKey === "appSettings" && key === "titleField") {
        const mode = typeof value.selectionMode === "string" ? enumText(ctx.sectionKey, "selectionMode", value.selectionMode) ?? value.selectionMode : "";
        return value.code ? `${mode}（${fieldDisplayName(String(value.code), ctx.fieldLabels)}）` : String(mode || "（なし）");
      }
      if ((key === "lookup" || key === "referenceTable") && isPlainObject(value.relatedApp)) {
        const keyField = typeof value.relatedKeyField === "string" && value.relatedKeyField ? `（${value.relatedKeyField}）` : "";
        return clipText(`参照するアプリ ${String(value.relatedApp.app ?? "?")}${keyField}`);
      }
      return clipText(JSON.stringify(value));
    }
    return clipText(String(value));
  }
  function describeWholeElement(sectionKey, tokens, value, ctx) {
    if (value === void 0) return "（なし）";
    if (!isPlainObject(value)) return describeValue(tokens[tokens.length - 1] ?? "", value, ctx);
    if (sectionKey === "fieldSettings" && typeof value.type === "string" && !tokens.includes("options")) {
      const type = own3(FIELD_TYPE_JP, value.type) ? FIELD_TYPE_JP[value.type] : value.type;
      const extra = value.type === "SUBTABLE" && isPlainObject(value.fields) ? `（テーブル内フィールド ${Object.keys(value.fields).length}個）` : value.required === true ? "（必須）" : "";
      return `${type}${extra}`;
    }
    if (sectionKey === "viewSettings" && typeof value.type === "string") return own3(VIEW_TYPE_JP, value.type) ? VIEW_TYPE_JP[value.type] : value.type;
    if (sectionKey === "reportSettings" && typeof value.chartType === "string") return own3(CHART_TYPE_JP, value.chartType) ? CHART_TYPE_JP[value.chartType] : value.chartType;
    if (sectionKey === "processSettings" && tokens[0] === "states") return "ステータス";
    if (tokens.includes("options")) return String(tokens[tokens.length - 1]);
    if (sectionKey === "categories") return "カテゴリー";
    return clipText(JSON.stringify(value));
  }

  // src/reflect/selectionModel.ts
  var NAME_CONTAINERS = /* @__PURE__ */ new Set(["properties", "fields", "views", "reports", "actions", "states", "categories", "options", "children"]);
  var ORDERED_CONTAINERS = /* @__PURE__ */ new Set(["views", "reports", "actions", "states", "categories", "options", "children"]);
  var ATOMIC_KEYS = /* @__PURE__ */ new Set(["lookup", "referenceTable", "titleField", "assignee", "periodicReport", "destApp"]);
  var NOT_EDITABLE_KEYS = /* @__PURE__ */ new Set(["code", "type", "index", "id", "name"]);
  var ORDER_SUFFIX = "#order";
  var NOTES = {
    layoutSettings: "レイアウトは全体で選びます（配置は部分的に選べません）。",
    customizeSettings: "JS/CSS は適用範囲と、PC・モバイルの JS・CSS の一覧ごとに選びます（一覧の中のファイルは個別には選べません）。",
    appAcl: "アクセス権は一覧全体で選びます（行ごとには選べません）。",
    fieldAcl: "アクセス権は一覧全体で選びます（行ごとには選べません）。",
    recordPermissions: "アクセス権は一覧全体で選びます（行ごとには選べません）。",
    notifications: "通知は一覧全体で選びます（1 件ごとには選べません）。",
    perRecordNotifications: "通知は一覧全体で選びます（1 件ごとには選べません）。",
    reminderNotifications: "通知は一覧全体で選びます（1 件ごとには選べません）。",
    pluginSettings: "プラグインは 1 つずつ選びます。反映先に無いプラグインだけを追加し、プラグイン固有の設定はコピーしません。"
  };
  function groupLength(sectionKey, tokens) {
    switch (sectionKey) {
      case "fieldSettings":
        if (tokens[0] !== "properties" || tokens.length < 2) return 1;
        return tokens[2] === "fields" && tokens.length >= 4 ? 4 : 2;
      case "viewSettings":
      case "reportSettings":
      case "actionSettings":
        return tokens.length >= 2 ? 2 : 1;
      case "processSettings":
        return tokens[0] === "states" && tokens.length >= 2 ? 2 : 1;
      case "categories": {
        if (tokens[0] !== "categories" || tokens.length < 2) return 1;
        let length = 2;
        while (tokens[length] === "children" && tokens.length >= length + 2) length += 2;
        return length;
      }
      case "customizeSettings":
        return (tokens[0] === "desktop" || tokens[0] === "mobile") && tokens.length >= 2 ? 2 : 1;
      default:
        return 1;
    }
  }
  function groupLabelOf(w, tokens) {
    const { sectionKey } = w;
    const hint = (path) => {
      const fromAfter = getAt(w.after, [...path, "label"]), fromBefore = getAt(w.before, [...path, "label"]);
      return typeof fromAfter === "string" && fromAfter ? fromAfter : typeof fromBefore === "string" ? fromBefore : void 0;
    };
    if (sectionKey === "fieldSettings" && tokens[0] === "properties" && tokens.length >= 2) {
      const table = fieldDisplayName(tokens[1], w.ctx.fieldLabels, hint(tokens.slice(0, 2)));
      if (tokens.length >= 4 && tokens[2] === "fields") return `${table} › ${fieldDisplayName(tokens[3], w.ctx.fieldLabels, hint(tokens.slice(0, 4)))}`;
      return table;
    }
    if (["viewSettings", "reportSettings", "actionSettings"].includes(sectionKey) && tokens.length >= 2) return tokens[1];
    if (sectionKey === "processSettings" && tokens[0] === "states" && tokens.length >= 2) return tokens[1];
    if (sectionKey === "categories" && tokens[0] === "categories" && tokens.length >= 2) return tokens.filter((_token, index) => index % 2 === 1).join(" › ");
    if (sectionKey === "customizeSettings" && (tokens[0] === "desktop" || tokens[0] === "mobile") && tokens.length >= 2) return `${tokens[0] === "desktop" ? "PC" : "モバイル"} の ${tokens[1].toUpperCase()}`;
    return keyLabel(sectionKey, tokens[0] ?? "");
  }
  function locate(w, tokens, kinds) {
    const length = Math.min(groupLength(w.sectionKey, tokens), tokens.length);
    const groupLabel = groupLabelOf(w, tokens.slice(0, length));
    const rest = tokens.slice(length).map((token, index) => kinds[length + index] === "name" ? token : keyLabel(w.sectionKey, token));
    return { groupTokens: tokens.slice(0, length), groupLabel, labelPath: [groupLabel, ...rest] };
  }
  function editorFor(sectionKey, key, value) {
    if (typeof value === "boolean") return { type: "boolean" };
    if (typeof value !== "string") return void 0;
    const options = selectOptionsFor(sectionKey, key, value);
    return options ? { type: "select", options } : { type: "text" };
  }
  function editablesOf(w, pointer, tokens, kinds, afterValue, whole, labelPath) {
    if (afterValue === void 0) return [];
    const editables = [];
    if (whole) {
      if (!isPlainObject(afterValue)) return [];
      const inOptions = tokens.includes("options");
      for (const [key, value] of Object.entries(afterValue)) {
        if (NOT_EDITABLE_KEYS.has(key) || inOptions && key === "label") continue;
        const editor2 = editorFor(w.sectionKey, key, value);
        if (editor2) editables.push({ pointer: `${pointer}/${escapePointerToken(key)}`, label: keyLabel(w.sectionKey, key), value, editor: editor2 });
      }
      return editables;
    }
    const last = tokens[tokens.length - 1];
    if (kinds[kinds.length - 1] !== "key" || ATOMIC_KEYS.has(last)) return [];
    const editor = editorFor(w.sectionKey, last, afterValue);
    if (editor) editables.push({ pointer, label: labelPath[labelPath.length - 1], value: afterValue, editor });
    return editables;
  }
  function emit(w, tokens, kinds, before, after, whole) {
    const pointer = pointerOf(tokens);
    const { groupTokens, groupLabel, labelPath } = locate(w, tokens, kinds);
    const key = tokens[tokens.length - 1];
    const text = (value) => whole ? describeWholeElement(w.sectionKey, tokens, value, w.ctx) : describeValue(key, value, w.ctx);
    w.out.push({
      id: `${w.sectionKey}:${pointer}`,
      sectionKey: w.sectionKey,
      pointer,
      labelPath,
      groupId: `${w.sectionKey}:${pointerOf(groupTokens)}`,
      groupLabel,
      kind: before === void 0 ? "追加" : after === void 0 ? "削除" : "変更",
      before: cloneJson(before),
      after: cloneJson(after),
      beforeText: text(before),
      afterText: text(after),
      whole,
      editables: editablesOf(w, pointer, tokens, kinds, after, whole, labelPath)
    });
  }
  var indexOf = (value) => {
    const number = Number(isPlainObject(value) ? value.index : NaN);
    return Number.isFinite(number) ? number : Number.MAX_SAFE_INTEGER;
  };
  function orderedNames(container) {
    return Object.keys(container).map((name, position) => ({ name, position })).sort((a, b) => indexOf(container[a.name]) - indexOf(container[b.name]) || a.position - b.position).map((item) => item.name);
  }
  function emitOrderChange(w, tokens, before, after) {
    const common = (names, other) => names.filter((name) => own3(other, name));
    const beforeOrder = common(orderedNames(before), after), afterOrder = common(orderedNames(after), before);
    if (afterOrder.length < 2 || sameValue(beforeOrder, afterOrder)) return;
    const kinds = tokens.map(() => "key");
    const { groupTokens, groupLabel, labelPath } = locate(w, tokens, kinds);
    const pointer = `${pointerOf(tokens)}${ORDER_SUFFIX}`;
    const joined = (names) => describeValue("", names.join(" → "), w.ctx);
    w.out.push({
      id: `${w.sectionKey}:${pointer}`,
      sectionKey: w.sectionKey,
      pointer,
      labelPath: [...labelPath, "並び順"],
      groupId: `${w.sectionKey}:${pointerOf(groupTokens)}`,
      groupLabel,
      kind: "変更",
      before: beforeOrder,
      after: afterOrder,
      beforeText: joined(beforeOrder),
      afterText: joined(afterOrder),
      whole: false,
      editables: []
    });
  }
  function emitPluginAdditions(w, tokens, kinds, before, after) {
    const existing = new Set(before.filter((id) => typeof id === "string"));
    const seen = /* @__PURE__ */ new Set();
    for (const id of after) {
      if (typeof id !== "string" || !id || existing.has(id) || seen.has(id)) continue;
      seen.add(id);
      emit(w, [...tokens, id], [...kinds, "name"], void 0, id, true);
    }
  }
  function walkObject(w, before, after, tokens, kinds, containerKey, elementOf) {
    const namesLevel = containerKey !== void 0;
    const keys = [...Object.keys(after), ...Object.keys(before).filter((key) => !own3(after, key))];
    for (const key of keys) {
      const bv = own3(before, key) ? before[key] : void 0, av = own3(after, key) ? after[key] : void 0;
      if (sameValue(bv, av)) continue;
      const childTokens = [...tokens, key];
      if (namesLevel) {
        const childKinds2 = [...kinds, "name"];
        if (bv === void 0 || av === void 0) emit(w, childTokens, childKinds2, bv, av, true);
        else if (isPlainObject(bv) && isPlainObject(av)) walkObject(w, bv, av, childTokens, childKinds2, void 0, containerKey);
        else emit(w, childTokens, childKinds2, bv, av, false);
        continue;
      }
      const childKinds = [...kinds, "key"];
      if (key === "index" && elementOf && ORDERED_CONTAINERS.has(elementOf)) continue;
      if (w.sectionKey === "pluginSettings" && key === "plugins" && (bv === void 0 || Array.isArray(bv)) && Array.isArray(av)) {
        emitPluginAdditions(w, childTokens, childKinds, bv ?? [], av);
        continue;
      }
      if (w.sectionKey === "fieldSettings" && (key === "type" || key === "code") && (elementOf === "properties" || elementOf === "fields")) continue;
      if (NAME_CONTAINERS.has(key) && isPlainObject(bv) && isPlainObject(av)) {
        if (ORDERED_CONTAINERS.has(key)) emitOrderChange(w, childTokens, bv, av);
        walkObject(w, bv, av, childTokens, childKinds, key, void 0);
      } else if (!ATOMIC_KEYS.has(key) && isPlainObject(bv) && isPlainObject(av)) walkObject(w, bv, av, childTokens, childKinds, void 0, void 0);
      else emit(w, childTokens, childKinds, bv, av, false);
    }
  }
  function attachRequires(w) {
    const byPointer = new Map(w.out.map((change) => [change.pointer, change]));
    const require2 = (change, other) => {
      if (!other || other.id === change.id) return;
      change.requires = [.../* @__PURE__ */ new Set([...change.requires || [], other.id])];
    };
    for (const change of w.out) {
      const tokens = parsePointer(change.pointer);
      const last = tokens[tokens.length - 1];
      if (w.sectionKey === "fieldSettings" && last === "defaultValue" && tokens[0] === "properties" && change.after !== void 0) {
        const fieldTokens = tokens.slice(0, -1);
        const values = Array.isArray(change.after) ? change.after : [change.after];
        const beforeOptions = getAt(w.before, [...fieldTokens, "options"]), afterOptions = getAt(w.after, [...fieldTokens, "options"]);
        if (!isPlainObject(afterOptions)) continue;
        for (const value of values) {
          if (typeof value !== "string" || !own3(afterOptions, value) || isPlainObject(beforeOptions) && own3(beforeOptions, value)) continue;
          require2(change, byPointer.get(pointerOf([...fieldTokens, "options", value])) ?? byPointer.get(pointerOf([...fieldTokens, "options"])));
        }
      }
      if (w.sectionKey === "processSettings" && change.pointer === "/actions" && Array.isArray(change.after)) {
        const beforeStates = getAt(w.before, ["states"]), afterStates = getAt(w.after, ["states"]);
        if (!isPlainObject(afterStates)) continue;
        for (const action of change.after) for (const name of [action?.from, action?.to]) {
          if (typeof name !== "string" || !own3(afterStates, name) || isPlainObject(beforeStates) && own3(beforeStates, name)) continue;
          require2(change, byPointer.get(pointerOf(["states", name])));
        }
      }
    }
  }
  function buildSectionSelectionModel(plan, fieldLabels = {}) {
    if (!plan || plan.status !== "change" && plan.status !== "same" || !plan.values) return null;
    const { before, after } = plan.values;
    if (!isPlainObject(before) || !isPlainObject(after)) return null;
    const w = {
      sectionKey: plan.sectionKey,
      before,
      after,
      out: [],
      ctx: { sectionKey: plan.sectionKey, fieldLabels, fileNames: plan.values.fileNames }
    };
    walkObject(w, before, after, [], [], void 0, void 0);
    attachRequires(w);
    return {
      sectionKey: plan.sectionKey,
      label: plan.label,
      before: cloneJson(before),
      after: cloneJson(after),
      changes: w.out,
      jsonEditable: plan.sectionKey !== "customizeSettings" && plan.sectionKey !== "pluginSettings",
      ...NOTES[plan.sectionKey] ? { note: NOTES[plan.sectionKey] } : {}
    };
  }

  // src/reflect/selectionPlan.ts
  var NAMED_PROPERTY = { viewSettings: "views", reportSettings: "reports", actionSettings: "actions" };
  var PLATFORMS2 = ["desktop", "mobile"];
  var KINDS2 = ["js", "css"];
  var UPLOAD_WARNING = /^\d+ 件のファイル（合計 .+）を反映先へアップロードしてから設定します。$/;
  var isNonEmptyString = (value) => typeof value === "string" && value !== "";
  function checkFieldSettings(before, after, fieldLabels) {
    const issues = [];
    const name = (code, parent) => `フィールド「${parent ? `${fieldDisplayName(parent, fieldLabels)} › ` : ""}${fieldDisplayName(code, fieldLabels)}」`;
    const compare = (beforeFields, afterFields, parent) => {
      for (const [code, definition] of Object.entries(afterFields)) {
        if (!isPlainObject(definition) || !isNonEmptyString(definition.type)) {
          issues.push(`${name(code, parent)}の定義に種類（type）がありません。`);
          continue;
        }
        if (definition.code !== void 0 && definition.code !== code) issues.push(`${name(code, parent)}のフィールドコードは変更できません（${code} → ${String(definition.code)}）。`);
        const current = own3(beforeFields, code) ? beforeFields[code] : void 0;
        if (isPlainObject(current) && current.type !== definition.type) issues.push(`${name(code, parent)}の種類は変更できません（${String(current.type)} → ${definition.type}）。`);
        if (definition.type === "SUBTABLE") {
          if (!isPlainObject(definition.fields)) issues.push(`${name(code, parent)}のテーブル内のフィールド定義（fields）がありません。`);
          else compare(isPlainObject(current?.fields) ? current.fields : {}, definition.fields, code);
        }
      }
      for (const code of Object.keys(beforeFields)) {
        if (!own3(afterFields, code)) issues.push(`${name(code, parent)}を削除する設定は反映できません（このツールではフィールドを削除しません）。`);
      }
    };
    if (!isPlainObject(after?.properties)) return ["フィールド設定の properties がありません。"];
    compare(isPlainObject(before?.properties) ? before.properties : {}, after.properties);
    return issues;
  }
  function checkComposedAfter(sectionKey, before, after, fieldLabels = {}) {
    const fail = (message) => [message];
    if (!isPlainObject(after)) return fail("反映後の設定はオブジェクトである必要があります。");
    switch (sectionKey) {
      case "fieldSettings":
        return checkFieldSettings(before, after, fieldLabels);
      case "layoutSettings":
        return Array.isArray(after.layout) && after.layout.every(isPlainObject) ? [] : fail("レイアウトの形式が不正です（layout は行の配列である必要があります）。");
      case "viewSettings":
      case "reportSettings":
      case "actionSettings": {
        const property = NAMED_PROPERTY[sectionKey], container = after[property];
        if (!isPlainObject(container)) return fail(`${property} の設定がありません。`);
        const issues = [];
        for (const [name, value] of Object.entries(container)) {
          if (!isPlainObject(value)) {
            issues.push(`${name}: 設定の形式が不正です。`);
            continue;
          }
          if (sectionKey !== "viewSettings") continue;
          if (!["LIST", "CALENDAR", "CUSTOM"].includes(value.type)) issues.push(`${name}: 一覧の種類を取得できません。`);
          else if (value.type === "LIST" && (!Array.isArray(value.fields) || value.fields.some((code) => typeof code !== "string"))) issues.push(`${name}: 一覧のフィールド定義が不完全です。`);
          else if (value.type === "CUSTOM" && typeof value.html !== "string") issues.push(`${name}: カスタマイズ一覧のHTMLがありません。`);
        }
        return issues;
      }
      case "pluginSettings": {
        if (!Array.isArray(after.plugins) || after.plugins.some((id) => !isNonEmptyString(id))) return fail("プラグイン一覧の形式が不正です。");
        const removed = (Array.isArray(before?.plugins) ? before.plugins : []).filter((id) => !after.plugins.includes(id));
        return removed.length ? fail(`プラグインを外す設定は反映できません（${removed.join("、")}）。`) : [];
      }
      case "customizeSettings": {
        const issues = [];
        if (!["ALL", "ADMIN", "NONE"].includes(after.scope)) issues.push("JS/CSSの適用範囲が不正です。");
        for (const platform of PLATFORMS2) for (const kind of KINDS2) {
          const list2 = after[platform]?.[kind];
          if (!Array.isArray(list2) || list2.some((item) => !item || (item.type === "URL" ? !isNonEmptyString(item.url) : item.type === "FILE" ? !isNonEmptyString(item.file?.fileKey) : true))) issues.push(`${platform}/${kind}: JS/CSS一覧の形式が不正です。`);
        }
        return issues;
      }
      case "appAcl":
      case "fieldAcl":
      case "recordPermissions":
        return Array.isArray(after.rights) ? [] : fail("rights の設定がありません。");
      case "notifications":
      case "perRecordNotifications":
        return Array.isArray(after.notifications) ? [] : fail("notifications の設定がありません。");
      case "reminderNotifications":
        if (!Array.isArray(after.notifications)) return fail("notifications の設定がありません。");
        return after.notifications.length && !isNonEmptyString(after.timezone) ? fail("リマインダー通知のタイムゾーンがありません。") : [];
      case "categories":
        return typeof after.enabled === "boolean" && isPlainObject(after.categories) ? [] : fail("カテゴリーの enabled / categories がありません。");
      case "processSettings":
        return typeof after.enable === "boolean" && (!after.enable || isPlainObject(after.states) && Array.isArray(after.actions)) ? [] : fail("プロセス管理の enable / states / actions の形式が不正です。");
      case "appSettings":
        if (after.titleField !== void 0 && !isPlainObject(after.titleField)) return fail("レコードのタイトルの設定形式が不正です。");
        return after.titleField?.selectionMode === "MANUAL" && !isNonEmptyString(after.titleField.code) ? fail("レコードのタイトルに使うフィールドが指定されていません。") : [];
      default:
        return [];
    }
  }
  function checkComposedAgainstPlan(plan, after, fieldLabels = {}) {
    if (!plan.values) return ["設定値を取得できていないため、選択・修正した内容から書き込み内容を作れません。"];
    const issues = checkComposedAfter(plan.sectionKey, plan.values.before, after, fieldLabels);
    if (issues.length || plan.sectionKey !== "customizeSettings") return issues;
    for (const platform of PLATFORMS2) for (const kind of KINDS2) {
      const list2 = after[platform][kind];
      if (!sameValue(list2, plan.values.after?.[platform]?.[kind]) && !sameValue(list2, plan.values.before?.[platform]?.[kind])) issues.push(`${platform}/${kind}: JS/CSSの一覧は、反映元に合わせるか反映先のままにするかのどちらかだけ選べます（ファイルの内容は直せません）。`);
    }
    return issues;
  }
  function fieldOperations(before, after, endpoint) {
    const beforeProps = before.properties, afterProps = after.properties;
    const adds = /* @__PURE__ */ Object.create(null), updates = /* @__PURE__ */ Object.create(null);
    for (const [code, value] of Object.entries(afterProps)) {
      if (SYSTEM_FIELD_TYPES.has(value?.type)) continue;
      if (!own3(beforeProps, code)) adds[code] = value;
      else if (value.type === "SUBTABLE") {
        const current = beforeProps[code];
        const addedFields = Object.fromEntries(Object.entries(value.fields).filter(([child]) => !own3(current.fields || {}, child)));
        if (Object.keys(addedFields).length) adds[code] = { type: "SUBTABLE", code, fields: addedFields };
        const updatedFields = Object.fromEntries(Object.entries(value.fields).filter(([child, childDef]) => own3(current.fields || {}, child) && !sameValue(childDef, current.fields[child])));
        const { fields: _nextFields, ...nextTable } = value, { fields: _currentFields, ...currentTable } = current;
        if (Object.keys(updatedFields).length || !sameValue(nextTable, currentTable)) updates[code] = { ...nextTable, fields: updatedFields };
      } else if (!sameValue(value, beforeProps[code])) updates[code] = value;
    }
    const operations = [];
    const add = Object.keys(adds).length, update = Object.keys(updates).length;
    if (add) operations.push({ method: "POST", endpoint, body: { properties: adds }, label: "フィールド追加" });
    if (update) operations.push({ method: "PUT", endpoint, body: { properties: updates }, label: "フィールド更新" });
    return { operations, add, update };
  }
  function buildPlanFromComposedAfter(plan, after, fieldLabels = {}) {
    const key = plan.sectionKey;
    const result = {
      sectionKey: key,
      label: plan.label,
      status: "same",
      message: "",
      behavior: plan.behavior,
      changes: [],
      changeCount: 0,
      removalCount: 0,
      warnings: [...plan.warnings],
      blockers: [...plan.blockers],
      operations: [],
      ...plan.fieldStats ? { fieldStats: { ...plan.fieldStats } } : {},
      ...plan.values ? { values: plan.values } : {}
    };
    const fail = (messages) => {
      for (const message of messages) if (!result.blockers.includes(message)) result.blockers.push(message);
      result.status = "error";
      result.message = result.blockers.join("\n");
      return result;
    };
    if (!plan.values) return fail(["設定値を取得できていないため、選択・修正した内容から書き込み内容を作れません。"]);
    const before = plan.values.before;
    const issues = checkComposedAgainstPlan(plan, after, fieldLabels);
    if (issues.length) return fail(issues);
    const def = SECTION_DEFS.find((item) => item.key === key);
    const endpoint = key === "appSettings" ? SECTION_DEFS.find((item) => item.key === "appSettings")?.endpoint || "/app/settings.json" : def?.endpoint;
    if (!endpoint) return fail(["この項目は反映に対応していません。"]);
    const retained = plan.changes.filter((change) => change.kind === "保持").map((change) => ({ ...change }));
    const changes = [...retained];
    const uploads = [];
    let shownBefore = before, shownAfter = after;
    let putAfter = true;
    try {
      if (key === "fieldSettings") {
        const built = fieldOperations(before, after, endpoint);
        result.operations.push(...built.operations);
        result.fieldStats = { add: built.add, update: built.update, tgtOnly: plan.fieldStats?.tgtOnly ?? 0 };
        putAfter = false;
      } else if (key === "pluginSettings") {
        const additions = after.plugins.filter((id) => !before.plugins.includes(id));
        if (additions.length) result.operations.push({ method: "POST", endpoint, body: { ids: additions }, label: "プラグイン追加" });
        putAfter = false;
      } else if (key === "customizeSettings") {
        const defaultAfter = plan.values.after;
        const resolution = { files: {}, hashes: plan.values.fileHashes || {}, blobs: /* @__PURE__ */ new Map(), targetBlobs: /* @__PURE__ */ new Map(), targetUnavailable: [] };
        const names = plan.values.fileNames || {};
        for (const platform of PLATFORMS2) for (const kind of KINDS2) {
          const list2 = after[platform][kind];
          if (sameValue(list2, defaultAfter?.[platform]?.[kind])) uploads.push(...(plan.fileUploads || []).filter((upload) => upload.platform === platform && upload.kind === kind).map((upload) => ({ ...upload })));
        }
        shownBefore = comparableCustomizePayload(before, resolution, names);
        shownAfter = comparableCustomizePayload(after, resolution, names);
        const rest = result.warnings.filter((message) => !UPLOAD_WARNING.test(message));
        result.warnings = uploads.length ? [`${uploads.length} 件のファイル（合計 ${formatBytes(uploads.reduce((sum, upload) => sum + upload.byteSize, 0))}）を反映先へアップロードしてから設定します。`, ...rest] : rest;
      }
      diffValues(shownBefore, shownAfter, [], changes);
      if (key === "layoutSettings") reclassifyLayoutRemovals(changes, shownBefore?.layout, shownAfter?.layout, fieldLabels);
      if (key === "appSettings") {
        for (const change of changes) if (change.kind === "削除") change.kind = "変更";
        for (const change of changes) {
          const [head, ...rest] = change.path.split(" / ");
          change.path = [APP_SETTINGS_LABELS[head] || head, ...rest].join(" / ");
        }
      }
      try {
        result.items = summarizeReflectItems(key, shownBefore, shownAfter, key === "appSettings" ? { fieldLabels } : { fieldLabels, retained: retainedItemNames(key, changes, fieldLabels) });
      } catch {
        result.items = [];
      }
      result.changes = changes;
      result.changeCount = changes.filter((change) => change.kind !== "保持").length;
      result.removalCount = changes.filter((change) => change.kind === "削除").length;
      if (putAfter && result.changeCount) result.operations.push({ method: "PUT", endpoint, body: after, label: key === "appSettings" ? plan.label : def.label, ...uploads.length ? { uploads } : {} });
      if (uploads.length && result.changeCount) result.fileUploads = uploads;
      const required = reflectRequiredFields(key, after);
      if (required !== void 0) result.requiredFields = required;
      if (result.blockers.length) result.status = "error";
      else result.status = result.operations.length ? "change" : "same";
      result.message = result.blockers.length ? result.blockers.join("\n") : result.operations.length ? `変更 ${result.changeCount}件 / 削除 ${result.removalCount}件 / ${result.behavior}` : key === "appSettings" ? "書き込み不要（一致）" : `書き込み不要${changes.some((change) => change.kind === "保持") ? "（反映先だけの設定は保持）" : "（一致）"}`;
    } catch (error) {
      return fail([error?.message || String(error)]);
    }
    return result;
  }

  // src/reflect/selectionCompose.ts
  function defaultSelectionState(model) {
    return { selected: model.changes.map((change) => change.id), overrides: {} };
  }
  function renumberOrdered(root2, ctx) {
    const processContainer = (tokens, container) => {
      const elements = Object.values(container);
      if (!elements.length || !elements.every(isPlainObject)) return;
      const pointer = pointerOf(tokens);
      const beforeContainer = getAt(ctx.model.before, tokens), defaultContainer = getAt(ctx.model.after, tokens);
      let sequence;
      if (ctx.jsonMode) {
        const indexes = elements.map((element) => element.index);
        const duplicated = new Set(indexes.map(String)).size !== indexes.length || indexes.some((index) => index === void 0 || index === null || index === "" || !Number.isFinite(Number(index)));
        const sameNames = isPlainObject(beforeContainer) && sameValue(Object.keys(container).sort(), Object.keys(beforeContainer).sort());
        if (sameNames && !duplicated) return;
        sequence = orderedNames(container);
      } else {
        const touched = ctx.selectedPointers.some((selected) => selected.startsWith(`${pointer}/`) || selected === `${pointer}${ORDER_SUFFIX}`);
        if (!touched) return;
        const orderChange = ctx.model.changes.some((change) => change.pointer === `${pointer}${ORDER_SUFFIX}`);
        const orderSelected = ctx.selectedPointers.includes(`${pointer}${ORDER_SUFFIX}`);
        const beforeNames = isPlainObject(beforeContainer) ? orderedNames(beforeContainer) : [], defaultNames = isPlainObject(defaultContainer) ? orderedNames(defaultContainer) : [];
        const [first, second] = !orderChange || orderSelected ? [defaultNames, beforeNames] : [beforeNames, defaultNames];
        const names = Object.keys(container);
        const seen = /* @__PURE__ */ new Set();
        sequence = [];
        for (const name of [...first, ...second, ...names]) if (own3(container, name) && !seen.has(name)) {
          seen.add(name);
          sequence.push(name);
        }
      }
      sequence.forEach((name, position) => setOwn(container[name], "index", String(position)));
    };
    const visit = (value, tokens, namesLevel) => {
      if (!isPlainObject(value)) return;
      if (namesLevel) {
        for (const [name, element] of Object.entries(value)) visit(element, [...tokens, name], false);
        return;
      }
      for (const [key, child] of Object.entries(value)) {
        if (!NAME_CONTAINERS.has(key) || !isPlainObject(child)) continue;
        const childTokens = [...tokens, key];
        if (ORDERED_CONTAINERS.has(key)) processContainer(childTokens, child);
        visit(child, childTokens, true);
      }
    };
    visit(root2, [], false);
  }
  function composeSectionSelection(model, state3, plan, fieldLabels = {}) {
    const errors = [];
    const changeById = new Map(model.changes.map((change) => [change.id, change]));
    const selectedIds = new Set((state3.selected || []).filter((id) => changeById.has(id)));
    const selected = model.changes.filter((change) => selectedIds.has(change.id));
    let after;
    let editedCount = 0;
    let selectedCount2 = selected.length;
    const jsonMode = state3.json !== void 0;
    if (jsonMode) {
      if (!model.jsonEditable) {
        errors.push(`${model.label}は JSON では直せません。入力欄と選択で直してください。`);
        after = cloneJson(model.before);
      } else if (!isPlainObject(state3.json)) {
        errors.push("JSON はオブジェクトである必要があります（反映後の設定全体を JSON で指定してください）。");
        after = cloneJson(model.before);
      } else after = cloneJson(state3.json);
      const changed = model.changes.filter((change) => !change.pointer.endsWith(ORDER_SUFFIX) && !sameValue(getAt(after, parsePointer(change.pointer)), change.before));
      selectedCount2 = changed.length;
      const diverged = changed.filter((change) => !sameValue(getAt(after, parsePointer(change.pointer)), change.after));
      editedCount = Math.max(1, diverged.length);
    } else {
      after = cloneJson(model.before);
      for (const change of selected) {
        if (change.pointer.endsWith(ORDER_SUFFIX)) continue;
        const tokens = parsePointer(change.pointer);
        if (model.sectionKey === "pluginSettings" && tokens.length === 2 && tokens[0] === "plugins") {
          if (!Array.isArray(after.plugins)) setOwn(after, "plugins", []);
          if (typeof change.after === "string" && !after.plugins.includes(change.after)) after.plugins.push(change.after);
          continue;
        }
        if (change.after === void 0) deleteAt(after, tokens);
        else setAt(after, tokens, cloneJson(change.after));
      }
      for (const [pointer, value] of Object.entries(state3.overrides || {})) {
        if (value === void 0 || typeof pointer !== "string" || !pointer.startsWith("/")) continue;
        if (!selected.some((change) => !change.pointer.endsWith(ORDER_SUFFIX) && pointerWithin(pointer, change.pointer))) continue;
        const tokens = parsePointer(pointer);
        const current = getAt(after, tokens);
        const next = typeof current === "number" && typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value)) ? Number(value) : value;
        if (sameValue(current, next)) continue;
        setAt(after, tokens, cloneJson(next));
        editedCount += 1;
      }
      for (const change of selected) for (const id of change.requires || []) {
        const required = changeById.get(id);
        if (required && !selectedIds.has(id)) errors.push(`「${change.labelPath.join(" › ")}」を反映するには、「${required.labelPath.join(" › ")}」も一緒に選んでください。`);
      }
    }
    renumberOrdered(after, { model, selectedPointers: selected.map((change) => change.pointer), jsonMode });
    for (const issue of checkComposedAgainstPlan(plan, after, fieldLabels)) if (!errors.includes(issue)) errors.push(issue);
    const composedPlan = buildPlanFromComposedAfter(plan, after, fieldLabels);
    if (jsonMode && selectedCount2 === 0 && composedPlan.operations.length) selectedCount2 = 1;
    return { sectionKey: model.sectionKey, label: model.label, after, plan: composedPlan, selectedCount: selectedCount2, totalCount: model.changes.length, editedCount, errors };
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
      targetPending,
      fieldLabels
    };
  }
  function composedFieldCodes(after) {
    const properties = after?.properties;
    if (!properties || typeof properties !== "object") return [];
    return Object.entries(properties).filter(([, definition]) => !SYSTEM_FIELD_TYPES.has(definition?.type)).flatMap(([code, definition]) => [code, ...Object.keys(definition?.type === "SUBTABLE" && definition.fields && typeof definition.fields === "object" ? definition.fields : {})]);
  }
  function addableFieldCodes(plans) {
    const fieldSettings = plans.find((plan) => plan.sectionKey === "fieldSettings");
    return fieldSettings && !fieldSettings.blockers.length && fieldSettings.values ? composedFieldCodes(fieldSettings.values.after) : [];
  }
  function composeReflectSelectionStandalone(preview, states) {
    const fieldLabels = preview.fieldLabels || {};
    const sections = [];
    const plans = [];
    const issues = [];
    for (const entry of preview.entries) {
      const model = entry.status === "change" || entry.status === "same" ? buildSectionSelectionModel(entry, fieldLabels) : null;
      if (!model) {
        if (entry.status === "change" || entry.status === "same") issues.push(`${entry.label}: 設定値を取得できていないため、選択・修正できません。`);
        plans.push(entry);
        continue;
      }
      const state3 = states && Object.prototype.hasOwnProperty.call(states, entry.sectionKey) && states[entry.sectionKey] ? states[entry.sectionKey] : defaultSelectionState(model);
      const composed = composeSectionSelection(model, state3, entry, fieldLabels);
      sections.push(composed);
      plans.push(composed.plan);
      for (const error of composed.errors) issues.push(`${composed.label}: ${error}`);
    }
    const scopes = preview.entries.map((entry) => entry.sectionKey);
    const fieldSettings = sections.find((section) => section.sectionKey === "fieldSettings");
    const sourceFields = fieldSettings ? composedFieldCodes(fieldSettings.after) : [];
    issues.push(...reflectSelectionBlockers(plans, scopes, sourceFields, preview.targetFieldCodes, preview.sourceSystemFieldCodes, addableFieldCodes(preview.entries)));
    return { sections, blockers: [...new Set(issues)] };
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
    const defaultPlans = scopes.map((key) => buildReflectSectionPlan(key, source.sections?.[key], target.sections?.[key], { ...opts, customizeFiles, fieldLabels }));
    const composed = opts.composed;
    const plans = composed ? defaultPlans.map((plan) => Object.prototype.hasOwnProperty.call(composed, plan.sectionKey) ? buildPlanFromComposedAfter(plan, composed[plan.sectionKey], fieldLabels) : plan) : defaultPlans;
    const sourceFields = composed && Object.prototype.hasOwnProperty.call(composed, "fieldSettings") ? composedFieldCodes(composed.fieldSettings) : listReflectFieldCodes(source, true);
    const issues = reflectSelectionBlockers(plans, scopes, sourceFields, listReflectFieldCodes(target), listReflectSystemFieldCodes(source), addableFieldCodes(defaultPlans));
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

  // src/tabs/deploy-source-standalone.ts
  var WRITTEN_NOTE = "反映先プレビューへの書き込みは完了しています。";
  var PUBLISH_GUIDE = "本番反映の「プレビューの変更を公開」で内容を確認して反映できます。";
  var reasonOf2 = (error) => error instanceof Error ? error.message : String(error);
  async function runSourceToProductionStandalone(opts) {
    const setStatus = (message) => {
      try {
        opts.setStatus?.(message);
      } catch {
      }
    };
    let apply;
    try {
      apply = await runApplyPreviewStandalone({
        ...opts.reflect,
        reviewBaseline: opts.reviewBaseline,
        composed: opts.composed,
        doBackup: true,
        stopOnError: true,
        onSectionUpdate: opts.onSectionUpdate
      }, (message) => setStatus(message), () => {
      });
    } catch (error) {
      if (!isRunCancelledError(error)) throw error;
      const empty = { logs: [`${RUN_CANCELLED_MESSAGE}（書き込み前に停止）`], sections: [], finalRevision: "", cancelled: true };
      return { goal: opts.goal, apply: empty, ...opts.goal === "production" ? { deploySkipped: "中止したため、まだ何も書き込んでいません。本番へも反映していません。" } : {} };
    }
    const result = { goal: opts.goal, apply };
    if (opts.goal === "preview") return result;
    const skip = (reason, inspection2) => {
      const base = { ...result, deploySkipped: reason };
      if (inspection2) {
        const { productionBundle: _production2, previewBundle: _preview2, ...rest } = inspection2;
        base.deployInspection = rest;
      }
      return base;
    };
    if (apply.cancelled) return skip("中止したため、本番へは反映していません。反映先プレビューは一部だけ更新されている可能性があります。差分を取得し直して現在の状態を確認してください。");
    const incomplete = apply.sections.filter((section) => section.status === "ng" || section.status === "pending");
    if (incomplete.length) {
      const list2 = incomplete.map((section) => `${section.label}: ${section.status === "ng" ? "失敗" : "未実行"}`).join("、");
      return skip(`反映先プレビューへの書き込みが完了しなかった項目があるため（${list2}）、本番へは反映していません。反映先プレビューは一部だけ更新されている可能性があります。差分を取得し直して現在の状態を確認してください。`);
    }
    const pending = opts.targetPending;
    if (pending?.state !== "clean" && pending?.state !== "own" && !opts.allowPendingChanges) {
      const reason = pending?.state === "pending" ? "反映先には以前からの未公開の変更があるため" : "反映先に以前からの未公開の変更があるか確認できなかったため";
      return skip(`${WRITTEN_NOTE}ただし、${reason}、本番へは反映していません。${PUBLISH_GUIDE}`);
    }
    setStatus("反映先の本番とプレビューを確認しています…");
    let inspection;
    try {
      const inspected = await inspectDeployTargetsStandalone({ targets: [{ appId: opts.reflect.targetAppId, guestId: opts.reflect.targetGuestId || "" }] });
      inspection = inspected.apps[0];
    } catch (error) {
      if (isRunCancelledError(error)) return skip(`${WRITTEN_NOTE}本番の確認中に中止したため、本番へは反映していません。${PUBLISH_GUIDE}`);
      return skip(`${WRITTEN_NOTE}本番とプレビューを確認できなかったため、本番へは反映していません（${reasonOf2(error)}）。${PUBLISH_GUIDE}`);
    }
    if (!inspection) return skip(`${WRITTEN_NOTE}本番とプレビューを確認できなかったため、本番へは反映していません。${PUBLISH_GUIDE}`, void 0);
    if (inspection.state !== "changes") {
      const reason = inspection.state === "clean" ? "反映先の本番とプレビューに差がないため、本番へ反映するものがありません。" : inspection.state === "processing" ? `反映先は kintone が反映を処理中のため、本番へは反映していません（${inspection.error || "処理の完了を待ってから確認し直してください"}）。` : `反映先の本番とプレビューを確認できなかったため、本番へは反映していません（${inspection.error || "原因不明"}）。`;
      return skip(`${WRITTEN_NOTE}${reason}${inspection.state === "clean" ? "" : PUBLISH_GUIDE}`, inspection);
    }
    if (apply.finalRevision && inspection.previewRevision !== apply.finalRevision) {
      return skip(`${WRITTEN_NOTE}ただし、書き込みの後にほかの更新が入ったため、本番へは反映していません（プレビューの revision ${apply.finalRevision} → ${inspection.previewRevision}）。内容を確認してから反映してください。${PUBLISH_GUIDE}`, inspection);
    }
    const expectedProduction = pending?.productionRevision;
    if (expectedProduction && /^\d+$/.test(expectedProduction) && inspection.productionRevision !== expectedProduction) {
      return skip(`${WRITTEN_NOTE}ただし、差分を抽出した後に本番が更新されたため、本番へは反映していません（本番の revision ${expectedProduction} → ${inspection.productionRevision}）。内容を確認してから反映してください。${PUBLISH_GUIDE}`, inspection);
    }
    const { productionBundle: _production, previewBundle: _preview, ...record } = inspection;
    const deploy = await runDeployStandalone({
      mode: "deploy",
      batchMode: "sequential",
      stopOnError: true,
      targets: [inspection],
      onUpdate: opts.onDeployUpdate,
      setStatus: opts.setStatus,
      poll: opts.poll
    });
    return { ...result, deploy, deployInspection: record };
  }

  // src/deploy/sourceDisplay.ts
  var searchCache = /* @__PURE__ */ new WeakMap();
  function changeSearchText(change) {
    let text = searchCache.get(change);
    if (text === void 0) {
      text = [change.groupLabel, ...change.labelPath, change.kind, change.beforeText, change.afterText].join("\n").toLowerCase();
      searchCache.set(change, text);
    }
    return text;
  }
  function isFilterActive(filter) {
    return !!filter.keyword.trim() || filter.kind !== "all";
  }
  function filterChanges(changes, filter) {
    const words = filter.keyword.toLowerCase().split(/\s+/).filter(Boolean);
    if (!words.length && filter.kind === "all") return [...changes];
    return changes.filter((change) => (filter.kind === "all" || change.kind === filter.kind) && (!words.length || words.every((word) => changeSearchText(change).includes(word))));
  }
  function groupChanges(changes) {
    const groups = /* @__PURE__ */ new Map();
    for (const change of changes) {
      let group = groups.get(change.groupId);
      if (!group) {
        group = { groupId: change.groupId, groupLabel: change.groupLabel, changes: [] };
        groups.set(change.groupId, group);
      }
      group.changes.push(change);
    }
    return [...groups.values()];
  }
  function groupCheckState(changes, selected) {
    let count = 0;
    for (const change of changes) if (selected.has(change.id)) count += 1;
    return count === 0 ? "none" : count === changes.length ? "all" : "some";
  }
  function describePath(change) {
    return change.labelPath.length ? change.labelPath.join(" / ") : change.groupLabel;
  }
  function clipText2(text, max = 160) {
    const value = String(text ?? "");
    return value.length > max ? `${value.slice(0, max)}…` : value;
  }
  function buildRequirementIndex(models) {
    const byId = /* @__PURE__ */ new Map();
    const dependents = /* @__PURE__ */ new Map();
    for (const model of models) for (const change of model.changes) byId.set(change.id, change);
    for (const change of byId.values()) {
      for (const required of change.requires || []) {
        if (!byId.has(required)) continue;
        const list2 = dependents.get(required);
        if (list2) list2.push(change.id);
        else dependents.set(required, [change.id]);
      }
    }
    return { byId, dependents };
  }
  function requiredToSelect(ids, index, selected) {
    const seen = new Set(ids);
    const added = [];
    const queue = [...ids];
    while (queue.length) {
      const change = index.byId.get(queue.pop());
      for (const required of change?.requires || []) {
        if (seen.has(required) || !index.byId.has(required)) continue;
        seen.add(required);
        if (!selected.has(required)) added.push(required);
        queue.push(required);
      }
    }
    return added;
  }
  function dependentsToDeselect(ids, index, selected) {
    const seen = new Set(ids);
    const removed = [];
    const queue = [...ids];
    while (queue.length) {
      for (const dependent of index.dependents.get(queue.pop()) || []) {
        if (seen.has(dependent)) continue;
        seen.add(dependent);
        if (selected.has(dependent)) removed.push(dependent);
        queue.push(dependent);
      }
    }
    return removed;
  }
  function describeRequires(change, index) {
    const names = (change.requires || []).map((id) => index.byId.get(id)).filter((item) => !!item).map((item) => describePath(item));
    if (!names.length) return "";
    const shown = names.slice(0, 3).join("、");
    return `選ぶと一緒に選ばれる変更: ${shown}${names.length > 3 ? ` ほか ${names.length - 3} 件` : ""}`;
  }
  function entryTone(entry) {
    return entry.status === "change" || entry.status === "same" ? entry.status : "error";
  }
  function countExtraction(entries, scopes) {
    const counts = { change: 0, same: 0, error: 0, changes: 0 };
    for (const entry of entries) {
      if (scopes && !scopes.includes(entry.sectionKey)) continue;
      counts[entryTone(entry)] += 1;
      if (entry.status === "change") counts.changes += entry.changeCount || 0;
    }
    return counts;
  }
  function describeExtractionSummary(counts) {
    if (!counts.change && !counts.error) return "差分はありません。反映先は反映元と同じ設定です。";
    const parts = [`差分のある項目 ${counts.change}`, `差分なし ${counts.same}`];
    if (counts.error) parts.push(`取得失敗 ${counts.error}`);
    return `${parts.join("・")}（変更 ${counts.changes} 件）。`;
  }
  function collectSelectionBlockers(input) {
    const active2 = new Set(input.activeScopes);
    const failed = [];
    let selectedTotal = 0;
    for (const entry of input.entries) {
      if (!active2.has(entry.sectionKey)) continue;
      const model = input.models[entry.sectionKey];
      if (entryTone(entry) === "error" || !model && entry.status !== "same") {
        const reason = [...entry.blockers || [], entry.message].filter(Boolean)[0] || "設定を取得できませんでした。";
        failed.push({ sectionKey: entry.sectionKey, label: entry.label, message: String(reason).split("\n")[0] });
      }
    }
    const problems = [];
    for (const section of input.composed?.sections || []) {
      if (!active2.has(section.sectionKey)) continue;
      selectedTotal += section.selectedCount;
      for (const error of section.errors || []) problems.push(`${section.label}: ${error}`);
    }
    for (const blocker of input.composed?.blockers || []) problems.push(blocker);
    return { failed, problems: [...new Set(problems)], references: [...new Set(input.composed?.blockers || [])], empty: !!input.composed && selectedTotal === 0 };
  }
  function firstEditEntryBlockerText(result) {
    if (result.failed.length) return firstBlockerText({ ...result, problems: [] });
    if (result.references.length) return result.references[0];
    if (result.empty) return "反映する差分を選んでください。";
    return "";
  }
  function firstBlockerText(result) {
    if (result.failed.length) return `取得失敗の項目（${result.failed.map((item) => item.label).join("、")}）は、反映しない項目から外すか、差分を抽出し直してください。`;
    if (result.problems.length) return result.problems[0];
    if (result.empty) return "反映する差分を選んでください。";
    return "";
  }
  function buildSourceSetupSignature(input) {
    const lookupPairs = Object.keys(input.lookupMap || {}).sort().map((key) => [key, input.lookupMap[key]]);
    return JSON.stringify([input.sourceKind, input.sourceAppId, input.sourceGuestId, input.jsonToken, input.targetAppId, input.targetGuestId, !!input.preserveTargetOnly, lookupPairs]);
  }
  function scopesCoveredBy(current, extracted) {
    return current.length > 0 && current.every((key) => extracted.includes(key));
  }
  function sourceRunLabel(goal) {
    return goal === "production" ? "確認した内容を反映先へ書き込み、本番へ反映" : "確認した内容を反映先プレビューへ反映";
  }
  function describeRoute(sourceLabel, targetLabel, goal) {
    return goal === "production" ? `${sourceLabel} → ${targetLabel}のプレビュー → ${targetLabel}の本番` : `${sourceLabel} → ${targetLabel}のプレビュー（本番へは反映しません）`;
  }
  function sourceBackupDescriptions(goal) {
    const list2 = ["反映前の反映先プレビューの設定をJSONで保存してから、プレビューへ書き込みます。"];
    if (goal === "production") list2.push("本番へ反映する前の本番設定をJSONで保存してから、本番へ反映します（変更のあるJS/CSSはファイル本体も含む）。");
    return list2;
  }
  function sourceUndoGuidance(goal, targetPending) {
    if (goal === "production") return undoGuidance("deploy");
    return describeUndoGuidance(targetPending).text;
  }
  function summarizeItemKinds(items) {
    const counts = {};
    for (const item of items || []) counts[item.kind] = (counts[item.kind] || 0) + 1;
    return REFLECT_ITEM_KIND_ORDER.filter((kind) => kind !== "保持" && counts[kind]).map((kind) => `${kind} ${counts[kind]}`).join("・");
  }
  function collectRemovedSettings(sections) {
    const out = [];
    for (const section of sections) {
      for (const item of section.plan.items || []) {
        if (item.kind !== "削除") continue;
        out.push({ sectionKey: section.sectionKey, sectionLabel: section.label, text: describeRemovedItem(section.label, item), isField: section.sectionKey === "fieldSettings" });
      }
    }
    return out;
  }
  function sectionsToRun(composed, activeScopes) {
    const active2 = new Set(activeScopes);
    return (composed?.sections || []).filter((section) => active2.has(section.sectionKey) && section.selectedCount > 0);
  }
  function composedAfterMap(sections) {
    const map = {};
    for (const section of sections) map[section.sectionKey] = section.after;
    return map;
  }
  function describeSourceResult(input) {
    const counts = summarizeApplyOutcome([...input.sections]);
    const total = counts.ok + counts.ng + counts.stopped + counts.pending + counts.skip;
    const written = counts.ok;
    if (input.cancelled) {
      return {
        text: `中止しました（${written}/${total} 項目を反映先プレビューへ反映${counts.stopped ? `、${counts.stopped} 項目は途中で停止` : ""}${counts.ng ? `、${counts.ng} 項目は失敗` : ""}、残り ${counts.pending} 項目は未実行）。書き込み済みの分は反映先プレビューに残っています。本番へは反映していません。`,
        tone: "warn"
      };
    }
    if (counts.ng || counts.pending || counts.stopped) {
      const failure = input.sections.find((section) => section.status === "ng" && !section.stopped);
      const reason = failure ? `（${failure.label}: ${String(failure.message || "").split("\n")[0].slice(0, 80)}）` : "";
      return {
        text: `${total} 項目中 ${written} 項目を反映先プレビューへ反映しました。失敗 ${counts.ng} 項目${counts.pending ? `、未実行 ${counts.pending} 項目` : ""}${reason}。本番へは反映していません。`,
        tone: written ? "warn" : "err"
      };
    }
    if (input.goal === "preview") {
      return { text: `${written} 項目を反映先プレビューへ反映しました。本番へは反映していません。`, tone: "ok" };
    }
    if (input.deploySkipped) {
      return { text: `${written} 項目を反映先プレビューへ反映しましたが、本番へは反映していません。${input.deploySkipped}`, tone: "warn" };
    }
    if (input.deploy) return { text: `${written} 項目を反映先プレビューへ反映し、${input.deploy.text}`, tone: input.deploy.ok ? "ok" : "warn" };
    return { text: `${written} 項目を反映先プレビューへ反映しました。`, tone: "ok" };
  }
  function describeDeploySkippedFollowUp() {
    return "反映先プレビューには書き込み済みです。理由を解消したあと、パネル上部の「プレビューの変更を公開」から続けて本番へ反映できます。";
  }

  // src/deploy/sourceReport.ts
  var ITEMS_PER_SECTION_LIMIT2 = 50;
  var KIND_ORDER3 = ["削除", "変更", "追加", "保持"];
  var esc3 = (value) => escapeReflectMarkdown(value);
  var cell2 = (value) => esc3(value) || "－";
  function formatStamp2(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? String(value || "") : date.toLocaleString("ja-JP", { hour12: false });
  }
  var ENVIRONMENT_LABEL = { production: "本番", preview: "プレビュー", json: "設定JSON" };
  function deploySummary(result) {
    if (!result.deploy) return void 0;
    const message = describeRunResult(result.deploy);
    return { ok: message.tone === "ok", text: message.text };
  }
  function describeSourceDeployResult(result) {
    return describeSourceResult({
      goal: result.goal,
      sections: result.apply.sections,
      cancelled: result.apply.cancelled,
      deploy: deploySummary(result),
      deploySkipped: result.deploySkipped
    });
  }
  function appLine(app, environment) {
    const parts = [`App ${app.appId || "－"}`, app.guestId ? `ゲストスペース ${app.guestId}` : "通常スペース", environment];
    return `${esc3(app.name || "（名前なし）")}（${parts.map(esc3).join(" / ")}）`;
  }
  function outcomeLabel(section) {
    if (!section) return "未実行";
    if (section.status === "ok") return "成功";
    if (section.status === "skip") return "変更なし";
    if (section.status === "pending") return "未実行";
    return section.stopped ? "途中で停止" : "失敗";
  }
  function buildSourceDeployRecordMarkdown(input) {
    const { result } = input;
    const message = describeSourceDeployResult(result);
    const counts = summarizeApplyOutcome(result.apply.sections);
    const lines = [];
    lines.push("# 反映元アプリから本番への反映の記録", "");
    lines.push(`- 開始日時: ${esc3(formatStamp2(input.startedAt))}`);
    lines.push(`- 終了日時: ${esc3(formatStamp2(input.finishedAt))}`);
    lines.push(`- 反映元: ${appLine(input.source, ENVIRONMENT_LABEL[input.source.environment])}`);
    lines.push(`- 反映先: ${appLine(input.target, input.goal === "production" ? "プレビュー → 本番" : "プレビュー")}`);
    lines.push(`- 目標: ${input.goal === "production" ? "本番まで反映" : "プレビューまで（本番へは反映しない）"}`);
    lines.push(`- 反映先だけの一覧・グラフ・アクション: ${input.preserveTargetOnly ? "保持する" : "削除する"}`);
    const lookupPairs = Object.entries(input.lookupMap || {});
    if (lookupPairs.length) lines.push(`- 参照先変換: ${lookupPairs.map(([from, to]) => `${esc3(from)} → ${esc3(to)}`).join("、")}`);
    if (input.targetPending) {
      const acknowledged = input.targetPending.state === "pending" && input.goal === "production" ? `（${input.allowPendingChanges ? "本番へ一緒に反映されることを了承して実行" : "了承なし"}）` : "";
      lines.push(`- 反映先の未公開の変更: ${esc3(input.targetPending.message)}${acknowledged}`);
    }
    lines.push(`- 結果: ${esc3(message.text)}`);
    lines.push(`- 件数（プレビューへの書き込み）: 成功 ${counts.ok}・失敗 ${counts.ng}・途中で停止 ${counts.stopped}・未実行 ${counts.pending}・変更なし ${counts.skip}`);
    if (result.apply.cancelled) lines.push("- 利用者の操作で中止しました。");
    if (result.apply.backup) lines.push(`- バックアップ（反映前のプレビュー）: ${esc3(formatStamp2(result.apply.backup.generatedAt))} に保存（項目: ${esc3(result.apply.backup.scopes.join("、"))}）`);
    else lines.push("- バックアップ（反映前のプレビュー）: 保存していません");
    if (input.goal === "production") {
      const backup = result.deploy?.backup;
      lines.push(backup ? `- バックアップ（本番へ反映する前の本番）: \`${String(backup.fileName).replace(/`/g, "")}\`（${backup.appCount} アプリ分）` : "- バックアップ（本番へ反映する前の本番）: 保存していません");
      for (const file of backup?.unavailableFiles || []) lines.push(`  - 本体を保存できなかったファイル: App ${esc3(file.appId)} / ${esc3(file.name)}（${esc3(file.reason)}）`);
    }
    lines.push(`- 取り消し方: ${esc3(sourceUndoGuidance(input.goal, input.targetPending))}`, "");
    lines.push("## 項目別の結果", "");
    lines.push("| 項目 | 選んだ変更 | 修正した値 | 結果 | 理由 |");
    lines.push("| --- | --- | --- | --- | --- |");
    for (const section of input.sections) {
      const outcome = result.apply.sections.find((candidate) => candidate.sectionKey === section.sectionKey);
      lines.push(`| ${cell2(section.label)} | ${section.selectedCount}/${section.totalCount} | ${section.editedCount} | ${cell2(outcomeLabel(outcome))} | ${cell2(String(outcome?.message || "").split("\n")[0])} |`);
    }
    lines.push("");
    lines.push("## 本番への反映", "");
    if (result.deploy) {
      lines.push(`- ${esc3(describeRunResult(result.deploy).text)}`);
      for (const app of result.deploy.apps) {
        lines.push(`- ${esc3(formatDeployApp(app))}: ${esc3(describeDeployStatus(app.status, "deploy").text)}${app.message ? `（${esc3(describeDeployMessage(app.message).split("\n")[0])}）` : ""}。本番の revision ${esc3(app.productionRevisionBefore || "－")} → ${esc3(app.productionRevisionAfter || "－")}`);
      }
    } else if (input.goal === "preview") {
      lines.push("- 目標がプレビューまでのため、本番へは反映していません。");
    } else {
      lines.push(`- 本番へは反映していません。${esc3(result.deploySkipped || "")}`);
      lines.push(`- ${esc3(describeDeploySkippedFollowUp())}`);
    }
    lines.push("");
    lines.push("## 項目別の変更の要約", "");
    for (const section of input.sections) {
      const kinds = summarizeItemKinds(section.items);
      lines.push(`### ${esc3(section.label)}（選んだ変更 ${section.selectedCount}/${section.totalCount}${kinds ? `・${kinds}` : ""}）`, "");
      const items = [...section.items].sort((a, b) => KIND_ORDER3.indexOf(a.kind) - KIND_ORDER3.indexOf(b.kind));
      for (const item of items.slice(0, ITEMS_PER_SECTION_LIMIT2)) {
        lines.push(`- **${item.kind}** ${esc3(item.name)}`);
        for (const detail of item.details || []) lines.push(`  - ${esc3(detail)}`);
      }
      if (items.length > ITEMS_PER_SECTION_LIMIT2) lines.push(`- ほか ${items.length - ITEMS_PER_SECTION_LIMIT2} 件`);
      if (!items.length) lines.push("- 変更の要約はありません。");
      lines.push("");
    }
    return `${lines.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd()}
`;
  }
  function buildSourceDeployResultJson(input) {
    const { result } = input;
    return {
      kind: "kintone-source-deploy-result",
      version: 1,
      goal: input.goal,
      startedAt: input.startedAt,
      finishedAt: input.finishedAt,
      source: { ...input.source },
      target: { ...input.target },
      message: describeSourceDeployResult(result).text,
      cancelled: !!result.apply.cancelled,
      selection: input.sections.map(({ sectionKey, label, selectedCount: selectedCount2, totalCount, editedCount }) => ({ sectionKey, label, selectedCount: selectedCount2, totalCount, editedCount })),
      apply: {
        summary: summarizeApplyOutcome(result.apply.sections),
        sections: result.apply.sections.map((section) => ({ ...section })),
        finalRevision: result.apply.finalRevision,
        ...result.apply.backup ? { backup: { generatedAt: result.apply.backup.generatedAt, scopes: [...result.apply.backup.scopes] } } : {},
        logs: [...result.apply.logs || []]
      },
      ...result.deploy ? { deploy: buildDeployResultJson(result.deploy), deploySummary: countOutcomes(result.deploy.apps) } : {},
      ...result.deploySkipped ? { deploySkipped: result.deploySkipped } : {}
    };
  }
  function stringifySourceDeployResultJson(input) {
    return JSON.stringify(buildSourceDeployResultJson(input), null, 2);
  }

  // src/deploy/sourceSession.ts
  var REAL_SOURCE_SESSION_DEPS = {
    buildModel: buildSectionSelectionModel,
    defaultState: defaultSelectionState,
    compose: composeReflectSelectionStandalone
  };
  var sessionSeq = 0;
  function createSourceSession(input, deps = REAL_SOURCE_SESSION_DEPS) {
    const { preview } = input;
    const fieldLabels = preview.fieldLabels || {};
    const models = {};
    const modelErrors = {};
    const states = {};
    const selected = {};
    for (const entry of preview.entries) {
      if (entry.status !== "change") continue;
      try {
        const model = deps.buildModel(entry, fieldLabels);
        if (!model) continue;
        models[entry.sectionKey] = model;
        states[entry.sectionKey] = deps.defaultState(model);
        selected[entry.sectionKey] = new Set(states[entry.sectionKey].selected);
      } catch (error) {
        modelErrors[entry.sectionKey] = String(error?.message || error || "不明なエラー");
      }
    }
    return {
      id: ++sessionSeq,
      signature: input.signature,
      scopes: [...input.opts.scopes],
      opts: input.opts,
      identities: input.identities,
      sourceEnvironment: input.sourceEnvironment,
      preview,
      fieldLabels,
      models,
      modelErrors,
      states,
      selected,
      index: buildRequirementIndex(Object.values(models)),
      composed: null,
      composeError: "",
      extractedAt: Date.now()
    };
  }
  function recomposeSession(session, activeScopes, deps = REAL_SOURCE_SESSION_DEPS) {
    const active2 = new Set(activeScopes);
    const states = {};
    for (const [key, model] of Object.entries(session.models)) {
      if (!active2.has(key)) continue;
      const state3 = session.states[key];
      state3.selected = model.changes.filter((change) => session.selected[key].has(change.id)).map((change) => change.id);
      states[key] = state3;
    }
    try {
      session.composed = deps.compose({ ...session.preview, entries: session.preview.entries.filter((entry) => active2.has(entry.sectionKey)) }, states);
      session.composeError = "";
    } catch (error) {
      session.composed = null;
      session.composeError = String(error?.message || error || "不明なエラー");
    }
  }
  function isChangeSelected(session, change) {
    return !!session.selected[change.sectionKey]?.has(change.id);
  }
  function selectedCount(session, sectionKey) {
    return session.selected[sectionKey]?.size ?? 0;
  }
  function applySelection(session, ids, on) {
    const result = { changed: [], required: [], cascaded: [] };
    const bySection = (id) => session.index.byId.get(id)?.sectionKey || "";
    const flat = /* @__PURE__ */ new Set();
    for (const set of Object.values(session.selected)) for (const id of set) flat.add(id);
    const mutate = (id, value) => {
      const set = session.selected[bySection(id)];
      if (!set) return false;
      if (value === set.has(id)) return false;
      if (value) {
        set.add(id);
        flat.add(id);
      } else {
        set.delete(id);
        flat.delete(id);
      }
      result.changed.push(id);
      return true;
    };
    const targets = ids.filter((id) => session.index.byId.has(id));
    if (on) {
      result.required = requiredToSelect(targets, session.index, flat);
      for (const id of [...targets, ...result.required]) mutate(id, true);
    } else {
      const cascade = dependentsToDeselect(targets, session.index, flat);
      for (const id of [...targets, ...cascade]) mutate(id, false);
      result.cascaded = cascade;
    }
    return result;
  }
  var same2 = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  function setOverride(session, sectionKey, pointer, value, defaultValue) {
    const state3 = session.states[sectionKey];
    if (!state3) return;
    if (same2(value, defaultValue)) delete state3.overrides[pointer];
    else state3.overrides[pointer] = value;
  }
  function clearOverrides(session, sectionKey) {
    const state3 = session.states[sectionKey];
    if (state3) state3.overrides = {};
  }
  function hasOverride(session, sectionKey, pointer) {
    return !!session.states[sectionKey] && Object.prototype.hasOwnProperty.call(session.states[sectionKey].overrides, pointer);
  }
  function setJsonOverride(session, sectionKey, json) {
    const state3 = session.states[sectionKey];
    if (!state3) return;
    if (json === void 0) delete state3.json;
    else state3.json = json;
  }
  function hasJsonOverride(session, sectionKey) {
    return session.states[sectionKey]?.json !== void 0;
  }
  function carryOverSession(next, previous) {
    const summary = { selectionKept: 0, selectionLost: 0, overridesKept: 0, overridesLost: 0, jsonLost: 0 };
    for (const [key, previousSelected] of Object.entries(previous.selected)) {
      const model = next.models[key];
      if (!model) {
        summary.selectionLost += previousSelected.size;
        continue;
      }
      const previousIds = new Set(previous.models[key]?.changes.map((change) => change.id) ?? []);
      const nextIds = new Set(model.changes.map((change) => change.id));
      const selected = /* @__PURE__ */ new Set();
      for (const change of model.changes) {
        if (!previousIds.has(change.id) || previousSelected.has(change.id)) selected.add(change.id);
      }
      for (const id of previousSelected) {
        if (nextIds.has(id)) summary.selectionKept += 1;
        else summary.selectionLost += 1;
      }
      next.selected[key] = selected;
    }
    const flat = /* @__PURE__ */ new Set();
    for (const set of Object.values(next.selected)) for (const id of set) flat.add(id);
    for (const id of requiredToSelect([...flat], next.index, flat)) {
      const sectionKey = next.index.byId.get(id)?.sectionKey || "";
      next.selected[sectionKey]?.add(id);
    }
    for (const [key, previousState] of Object.entries(previous.states)) {
      const model = next.models[key];
      const state3 = next.states[key];
      const overrides = Object.entries(previousState.overrides || {});
      if (!model || !state3) {
        summary.overridesLost += overrides.length;
        if (previousState.json !== void 0) summary.jsonLost += 1;
        continue;
      }
      const pointers = new Set(model.changes.flatMap((change) => change.editables.map((editable) => editable.pointer)));
      for (const [pointer, value] of overrides) {
        if (pointers.has(pointer)) {
          state3.overrides[pointer] = value;
          summary.overridesKept += 1;
        } else summary.overridesLost += 1;
      }
      if (previousState.json !== void 0) summary.jsonLost += 1;
    }
    return summary;
  }
  function describeCarryOver(summary) {
    const kept = [summary.selectionKept ? `選択 ${summary.selectionKept} 件` : "", summary.overridesKept ? `入力欄の修正 ${summary.overridesKept} 件` : ""].filter(Boolean);
    const lost = [summary.selectionLost ? `選択 ${summary.selectionLost} 件` : "", summary.overridesLost ? `入力欄の修正 ${summary.overridesLost} 件` : "", summary.jsonLost ? `JSON での修正 ${summary.jsonLost} 項目` : ""].filter(Boolean);
    const head = kept.length ? `前回の${kept.join("・")}を引き継ぎました。` : "前回の選択と修正はありませんでした。";
    return lost.length ? `${head}引き継げなかったもの: ${lost.join("・")}（更新後の差分に無い、または JSON のため）。選び直してください。` : head;
  }

  // src/reflect/appLookup.ts
  var REFLECT_APP_LOOKUP_FAILURE = "アプリを確認できません。ID・ゲストスペース・閲覧権限を確認してください。";
  var POSITIVE_INTEGER2 = /^[1-9]\d*$/;
  function isLookupableReflectApp(appId, guestId) {
    const id = String(appId || "").trim();
    const guest = String(guestId || "").trim();
    return POSITIVE_INTEGER2.test(id) && (!guest || POSITIVE_INTEGER2.test(guest));
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
    const keyOf = (appId, guestId) => `${String(guestId || "").trim()}|${String(appId || "").trim()}`;
    return {
      peek(appId, guestId) {
        return done.get(keyOf(appId, guestId));
      },
      remember(info, guestId) {
        done.set(keyOf(info.appId, guestId), { ok: true, appId: String(info.appId).trim(), name: info.name, code: info.code });
      },
      get(appId, guestId) {
        const key = keyOf(appId, guestId);
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

  // src/entries/reflectPlanView.ts
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

  // src/entries/deploy-source-edit.ts
  var EDIT_OPEN_LIMIT = 30;
  var EDIT_GROUP_PAGE = 40;
  var same3 = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  function editableText(value) {
    if (value === void 0 || value === null) return "";
    if (typeof value === "string") return value;
    if (typeof value === "object") return JSON.stringify(value);
    return String(value);
  }
  function editableDefaultText(editable) {
    const { value } = editable;
    if (typeof value === "boolean") return value ? "はい" : "いいえ";
    const raw = editableText(value);
    const option = editable.editor.type === "select" ? (editable.editor.options || []).find(([optionValue]) => optionValue === raw) : void 0;
    return (option ? option[1] : raw) || "（空）";
  }
  function jsonValueAt(json, pointer) {
    try {
      return getAt(json, parsePointer(pointer));
    } catch {
      return void 0;
    }
  }
  function coerceEditable(text, like) {
    if (typeof like === "number") {
      const n = Number(text);
      return text.trim() !== "" && Number.isFinite(n) ? n : text;
    }
    if (typeof like === "boolean") return text === "true";
    return text;
  }
  function collectEditables(session, model) {
    const groups = /* @__PURE__ */ new Map();
    for (const change of model.changes) {
      if (!session.selected[model.sectionKey]?.has(change.id) || !change.editables.length) continue;
      let group = groups.get(change.groupId);
      if (!group) {
        group = { label: change.groupLabel, items: [] };
        groups.set(change.groupId, group);
      }
      for (const editable of change.editables) group.items.push({ change, editable });
    }
    return [...groups.values()];
  }
  function createEditView(host) {
    const root2 = el("div", "kus-ds-edit-root");
    const cardsHost = el("div", "kus-ds-cards");
    const blockers = el("div", "kus-ds-blockers");
    blockers.dataset.editBlockers = "true";
    root2.append(cardsHost, blockers);
    const cards = /* @__PURE__ */ new Map();
    let idSeq = 0;
    function currentValue(session, sectionKey, editable) {
      return hasOverride(session, sectionKey, editable.pointer) ? session.states[sectionKey].overrides[editable.pointer] : editable.value;
    }
    function displayValue(session, sectionKey, editable) {
      return hasJsonOverride(session, sectionKey) ? jsonValueAt(session.states[sectionKey].json, editable.pointer) : currentValue(session, sectionKey, editable);
    }
    function buildControl(session, view, sectionKey, change, editable) {
      const id = `kus-ds-edit-${++idSeq}`;
      const row = el("div", "kus-ds-edit");
      row.dataset.editPointer = editable.pointer;
      const label = el("label", "kus-ds-edit__label", `${change.groupLabel} / ${editable.label}`);
      label.htmlFor = id;
      const control = el("div", "kus-ds-edit__control");
      const controls = [];
      let setControl;
      const push = (value, debounce) => host.setOverride(sectionKey, editable.pointer, value, editable.value, debounce);
      if (editable.editor.type === "boolean") {
        const input = document.createElement("input");
        input.type = "checkbox";
        input.id = id;
        const text = el("span", "kus-ds-edit__bool");
        input.addEventListener("change", () => {
          text.textContent = input.checked ? "はい" : "いいえ";
          push(input.checked, false);
          paint();
        });
        setControl = (value) => {
          input.checked = value === true || value === "true";
          text.textContent = input.checked ? "はい" : "いいえ";
        };
        control.append(input, text);
        controls.push(input);
      } else if (editable.editor.type === "select") {
        const options = [...editable.editor.options || []];
        const select = makeSelect(options.map(([value, text]) => [value, text]));
        select.id = id;
        select.classList.add("kus-ds-edit__select");
        select.addEventListener("change", () => {
          push(coerceEditable(select.value, editable.value), false);
          paint();
        });
        setControl = (value) => {
          const text = editableText(value);
          if (![...select.options].some((option) => option.value === text)) {
            const option = document.createElement("option");
            option.value = text;
            option.textContent = text || "（空）";
            select.appendChild(option);
          }
          select.value = text;
        };
        control.appendChild(select);
        controls.push(select);
      } else {
        const input = makeInput({ width: "wide", noSubmit: true });
        input.id = id;
        input.classList.add("kus-ds-edit__input");
        input.addEventListener("input", () => {
          push(coerceEditable(input.value, editable.value), true);
          paint();
        });
        input.addEventListener("change", () => {
          push(coerceEditable(input.value, editable.value), false);
          paint();
        });
        setControl = (value) => {
          input.value = editableText(value);
        };
        control.appendChild(input);
        controls.push(input);
      }
      const reset = makeButton("元に戻す", "ghost");
      reset.dataset.action = "edit-reset";
      reset.setAttribute("aria-label", `${change.groupLabel} / ${editable.label}を既定の値に戻す`);
      reset.addEventListener("click", () => {
        setControl(editable.value);
        push(editable.value, false);
        paint();
      });
      const meta = el("div", "kus-ds-edit__meta");
      const defaultText = editableDefaultText(editable);
      const fallback = el("span", "kus-ds-edit__default", `既定: ${defaultText}`);
      fallback.title = clipText2(defaultText, 2e3);
      meta.append(fallback, reset);
      row.append(label, control, meta);
      const rowView = { section: sectionKey, change, editable, row, reset, controls, setControl, locked: false };
      setControl(displayValue(session, sectionKey, editable));
      const paint = () => paintRow(rowView);
      view.rows.set(`${change.id}|${editable.pointer}`, rowView);
      paintRow(rowView);
      return row;
    }
    function paintRow(row) {
      const session = host.session();
      if (!session) return;
      const locked = hasJsonOverride(session, row.section);
      if (locked || row.locked) row.setControl(displayValue(session, row.section, row.editable));
      row.locked = locked;
      const changed = !same3(displayValue(session, row.section, row.editable), row.editable.value);
      row.row.classList.toggle("kus-ds-edit--changed", changed);
      row.row.dataset.changed = String(changed);
      row.row.dataset.jsonLocked = String(locked);
      row.reset.hidden = !changed || locked;
      for (const control of row.controls) control.disabled = locked;
      row.reset.disabled = locked;
    }
    function appendGroups(view, session) {
      const next = view.groups.slice(view.shown, view.shown + EDIT_GROUP_PAGE);
      const frag = document.createDocumentFragment();
      for (const group of next) {
        const node = el("div", "kus-ds-edit-group");
        node.appendChild(el("div", "kus-ds-edit-group__title", group.label));
        for (const { change, editable } of group.items) node.appendChild(buildControl(session, view, view.sectionKey, change, editable));
        frag.appendChild(node);
      }
      view.body.insertBefore(frag, view.more);
      view.shown += next.length;
      const rest = view.groups.length - view.shown;
      view.more.hidden = rest <= 0;
      if (rest > 0) setButtonText(view.more, `さらに表示（残り ${rest} グループ）`);
    }
    function setOpen(view, open, session) {
      view.opened = open;
      view.body.hidden = !open;
      view.toggle.setAttribute("aria-expanded", String(open));
      const total = view.groups.reduce((sum, group) => sum + group.items.length, 0);
      setButtonText(view.toggle, open ? "入力欄を閉じる" : `入力欄を表示（${total} 件）`);
      view.body.replaceChildren(view.more);
      view.rows.clear();
      view.shown = 0;
      if (open) appendGroups(view, session);
    }
    function buildCard(session, sectionKey) {
      const model = session.models[sectionKey];
      if (!model) return null;
      const card = el("section", "kus-ds-card");
      card.dataset.editSection = sectionKey;
      const head = el("div", "kus-ds-card__head");
      const counts = el("span", "kus-ds-card__count");
      counts.dataset.editCount = sectionKey;
      const tools = el("div", "kus-ds-card__tools");
      const resetAll = makeButton("この項目の修正を元に戻す", "ghost");
      resetAll.dataset.action = "edit-reset-all";
      resetAll.setAttribute("aria-label", `${model.label}の入力欄の修正をすべて元に戻す`);
      resetAll.addEventListener("click", () => {
        host.resetSection(sectionKey);
        render();
      });
      tools.appendChild(resetAll);
      let jsonToggle = null;
      if (model.jsonEditable) {
        jsonToggle = makeButton("JSONで編集", "sub");
        jsonToggle.dataset.action = "json-toggle";
        jsonToggle.setAttribute("aria-label", `${model.label}の送る設定をJSONで編集`);
        jsonToggle.setAttribute("aria-expanded", "false");
        tools.appendChild(jsonToggle);
      }
      head.append(el("strong", "kus-ds-card__title", model.label), counts, tools);
      card.appendChild(head);
      const jsonNote = el("div", "kus-ds-note kus-ds-note--info", "JSONで修正中です。この項目は、選択・入力欄より JSON の内容を優先します。入力欄には JSON の値を表示していて、ここでは直せません。");
      jsonNote.dataset.jsonActive = sectionKey;
      card.appendChild(jsonNote);
      const groups = collectEditables(session, model);
      const total = groups.reduce((sum, group) => sum + group.items.length, 0);
      const toggle = makeButton("", "sub");
      toggle.dataset.action = "toggle";
      toggle.setAttribute("aria-label", `${model.label}の入力欄を表示`);
      const more = makeButton("さらに表示", "sub");
      more.classList.add("kus-dp-more");
      more.dataset.action = "more";
      more.hidden = true;
      const body = el("div", "kus-ds-card__body");
      body.dataset.editBody = sectionKey;
      body.appendChild(more);
      const jsonArea = el("div", "kus-ds-json");
      jsonArea.dataset.jsonArea = sectionKey;
      jsonArea.hidden = true;
      const jsonText = makeTextarea({ rows: 14, code: true });
      jsonText.setAttribute("aria-label", `${model.label}の送る設定（JSON）`);
      jsonText.spellcheck = false;
      const jsonError = el("p", "kus-ds-json__error");
      jsonError.setAttribute("role", "alert");
      jsonError.hidden = true;
      const apply = makeButton("JSONを適用", "primary");
      apply.dataset.action = "json-apply";
      apply.setAttribute("aria-label", `${model.label}のJSONを適用`);
      const cancel = makeButton("JSONでの修正を取り消す", "sub");
      cancel.dataset.action = "json-cancel";
      cancel.setAttribute("aria-label", `${model.label}のJSONでの修正を取り消す`);
      const jsonActions = el("div", "kus-ds-json__actions");
      jsonActions.append(apply, cancel);
      jsonArea.append(el("p", "kus-ds-json__help", "反映先に送る設定（反映後の形）です。直した内容は、選択・入力欄より優先されます。"), jsonText, jsonError, jsonActions);
      const errors = el("ul", "kus-ds-card__problems kus-ds-card__problems--error");
      errors.dataset.editErrors = sectionKey;
      const warnings = el("ul", "kus-ds-card__problems kus-ds-card__problems--warn");
      const planHost = el("div", "kus-ds-plan");
      planHost.dataset.editPlan = sectionKey;
      const view = { sectionKey, card, counts, jsonNote, errors, warnings, planHost, resetAll, jsonArea, jsonText, jsonError, jsonToggle, jsonBaseline: "", body, toggle, more, opened: false, groups, shown: 0, rows: /* @__PURE__ */ new Map() };
      cards.set(sectionKey, view);
      if (total) card.append(toggle, body);
      else card.appendChild(el("div", "kus-ds-card__note", "画面で直せる値はありません。必要なときは「JSONで編集」を使います。"));
      toggle.addEventListener("click", () => {
        const current = host.session();
        if (current) setOpen(view, !view.opened, current);
      });
      more.addEventListener("click", () => {
        const current = host.session();
        if (current) appendGroups(view, current);
      });
      card.append(jsonArea, errors, warnings, planHost);
      if (total) setOpen(view, total <= EDIT_OPEN_LIMIT, session);
      const openJson = (open) => {
        const current = host.session();
        if (!current) return;
        jsonArea.hidden = !open;
        jsonToggle?.setAttribute("aria-expanded", String(open));
        if (jsonToggle) setButtonText(jsonToggle, open ? "JSONの編集を閉じる" : "JSONで編集");
        if (open) {
          const composed = current.composed?.sections.find((section) => section.sectionKey === sectionKey);
          const base = current.states[sectionKey].json !== void 0 ? current.states[sectionKey].json : composed?.after;
          jsonText.value = JSON.stringify(base ?? {}, null, 2);
          view.jsonBaseline = jsonText.value;
          jsonError.hidden = true;
        }
        host.jsonEditsChanged();
      };
      jsonText.addEventListener("input", () => host.jsonEditsChanged());
      jsonToggle?.addEventListener("click", () => openJson(jsonArea.hidden));
      apply.addEventListener("click", () => {
        let parsed;
        try {
          parsed = JSON.parse(jsonText.value);
        } catch (error) {
          jsonError.textContent = `JSONの形式が正しくありません（${firstLines(String(error?.message || error), 1)}）。直してから適用してください。`;
          jsonError.hidden = false;
          return;
        }
        if (parsed === null || typeof parsed !== "object") {
          jsonError.textContent = "JSONはオブジェクトまたは配列で入力してください。";
          jsonError.hidden = false;
          return;
        }
        jsonError.hidden = true;
        view.jsonBaseline = jsonText.value;
        host.applyJson(sectionKey, parsed);
        host.notify(`${model.label}をJSONの内容で修正しました。選択・入力欄より JSON を優先します。`);
      });
      cancel.addEventListener("click", () => {
        jsonError.hidden = true;
        host.applyJson(sectionKey, void 0);
        openJson(false);
        host.notify(`${model.label}のJSONでの修正を取り消しました。選択と入力欄の内容に戻しました。`);
      });
      return card;
    }
    function render() {
      const session = host.session();
      cardsHost.replaceChildren();
      blockers.replaceChildren();
      blockers.hidden = true;
      cards.clear();
      if (!session || !host.isFresh()) {
        cardsHost.appendChild(el("div", "kus-ds-empty", "「対象を選ぶ」で差分を抽出し、反映する変更を選んでください。"));
        return;
      }
      if (!session.composed) {
        cardsHost.appendChild(el("div", "kus-ds-note kus-ds-note--warn", `選んだ内容から反映内容を作れません（${firstLines(session.composeError || "原因を確認できません。", 1)}）。`));
        return;
      }
      const active2 = new Set(host.activeScopes());
      const sections = session.composed.sections.filter((section) => active2.has(section.sectionKey) && section.selectedCount > 0);
      for (const section of sections) {
        const card = buildCard(session, section.sectionKey);
        if (card) cardsHost.appendChild(card);
      }
      if (!cardsHost.children.length) cardsHost.appendChild(el("div", "kus-ds-empty", "反映する変更が選ばれていません。「差分を選ぶ」で選んでください。"));
      refresh();
    }
    function refresh() {
      const session = host.session();
      if (!session || !session.composed) return;
      for (const view of cards.values()) {
        const composed = session.composed.sections.find((section) => section.sectionKey === view.sectionKey);
        if (!composed) continue;
        view.counts.textContent = `選んだ変更 ${composed.selectedCount}/${composed.totalCount}・修正した値 ${composed.editedCount}`;
        const json = hasJsonOverride(session, view.sectionKey);
        view.jsonNote.hidden = !json;
        view.resetAll.disabled = json || !Object.keys(session.states[view.sectionKey].overrides).length;
        view.errors.replaceChildren(...[.../* @__PURE__ */ new Set([...composed.errors, ...composed.plan.blockers])].slice(0, 10).map((line) => el("li", "", line)));
        view.errors.hidden = !view.errors.children.length;
        view.warnings.replaceChildren(...(composed.plan.warnings || []).slice(0, 5).map((line) => el("li", "", line)));
        view.warnings.hidden = !view.warnings.children.length;
        view.planHost.replaceChildren();
        view.planHost.appendChild(el("div", "kus-ds-plan__title", "反映される内容"));
        if (composed.plan.items?.length) appendReflectItems(view.planHost, { label: composed.label, items: composed.plan.items, sectionKey: composed.sectionKey });
        else view.planHost.appendChild(el("div", "kus-ds-card__note", `変更 ${composed.plan.changeCount} 件（要約を作成できませんでした）`));
        for (const row of view.rows.values()) paintRow(row);
      }
      const lines = [.../* @__PURE__ */ new Set([...session.composed.sections.flatMap((section) => host.activeScopes().includes(section.sectionKey) ? section.errors.map((error) => `${section.label}: ${error}`) : []), ...session.composed.blockers])];
      blockers.replaceChildren();
      blockers.hidden = !lines.length;
      if (lines.length) {
        const box = el("div", "kus-ds-note kus-ds-note--warn");
        box.append(el("strong", "", "次へ進む前に解消が必要です"));
        const list2 = el("ul", "kus-ds-card__problems");
        for (const line of lines.slice(0, 20)) list2.appendChild(el("li", "", line));
        box.appendChild(list2);
        blockers.appendChild(box);
      }
    }
    function unappliedJson() {
      const session = host.session();
      if (!session) return [];
      return [...cards.values()].filter((view) => !view.jsonArea.hidden && view.jsonText.value !== view.jsonBaseline).map((view) => session.models[view.sectionKey]?.label || view.sectionKey);
    }
    return { root: root2, render, refresh, unappliedJson };
  }

  // src/entries/deploy-source-select.ts
  var SELECT_OPEN_LIMIT = 30;
  var SELECT_GROUP_PAGE = 40;
  function renderTargetPending(host, pending, emphasis = true) {
    if (!pending) return null;
    const box = el("div");
    box.dataset.targetPending = pending.state;
    const text = el("span", "", pending.message);
    if (pending.state === "pending") {
      box.className = "kus-ds-note kus-ds-note--warn";
      box.append(el("strong", "", "反映先に以前からの未公開の変更があります"), text);
    } else {
      box.className = `kus-ds-note kus-ds-note--${pending.state === "unknown" ? "info" : "ok"}${emphasis ? "" : " kus-ds-note--quiet"}`;
      const title = pending.state === "clean" ? "✓ 未公開の変更なし" : pending.state === "own" ? "✓ 未公開の変更はこのツールの反映分だけ" : "ⓘ 未公開の変更は未確認";
      box.append(el("strong", "", title), text);
    }
    host.appendChild(box);
    return box;
  }
  var KIND_CLASS = { 追加: "add", 変更: "change", 削除: "delete" };
  function createSelectView(host) {
    const root2 = el("div", "kus-ds-select");
    const summaryHost = el("div", "kus-ds-summary");
    const filterBar = el("div", "kus-ds-filter");
    const keywordInput = makeInput({ placeholder: "場所・値で絞り込み（例: 顧客名）", width: "wide", noSubmit: true });
    keywordInput.setAttribute("aria-label", "変更をキーワードで絞り込み");
    keywordInput.dataset.selectFilter = "keyword";
    const kindSelect = makeSelect([["all", "すべての種類"], ["追加", "追加"], ["変更", "変更"], ["削除", "削除"]], "all");
    kindSelect.setAttribute("aria-label", "変更を種類で絞り込み");
    kindSelect.dataset.selectFilter = "kind";
    const filterCount = el("span", "kus-ds-filter__count");
    filterCount.setAttribute("aria-live", "polite");
    filterBar.append(keywordInput, kindSelect, filterCount);
    const cardsHost = el("div", "kus-ds-cards");
    const blockersHost = el("div", "kus-ds-blockers");
    blockersHost.dataset.selectBlockers = "true";
    root2.append(summaryHost, filterBar, cardsHost, blockersHost);
    const cards = /* @__PURE__ */ new Map();
    const filter = () => ({ keyword: keywordInput.value, kind: kindSelect.value });
    function describeSelectionResult(session, result, on) {
      const names = (ids) => {
        const labels = ids.slice(0, 2).map((id) => {
          const change = session.index.byId.get(id);
          return change ? `「${describePath(change)}」` : "";
        }).filter(Boolean);
        return `${labels.join("、")}${ids.length > 2 ? ` ほか ${ids.length - 2} 件` : ""}`;
      };
      if (on && result.required.length) host.notify(`${names(result.required)}は、選んだ変更に必要なため一緒に選びました。`);
      else if (!on && result.cascaded.length) host.notify(`${names(result.cascaded)}は、外した変更を必要とするため一緒に外しました。`);
    }
    function select(ids, on) {
      const session = host.session();
      if (!session) return;
      describeSelectionResult(session, host.changeSelection(ids, on), on);
    }
    function buildRow(view, change, session) {
      const row = el("div", "kus-ds-row");
      row.dataset.changeId = change.id;
      row.dataset.changeKind = change.kind;
      const input = document.createElement("input");
      input.type = "checkbox";
      input.checked = isChangeSelected(session, change);
      input.setAttribute("aria-label", `${describePath(change)}（${change.kind}）を反映する`);
      input.addEventListener("change", () => select([change.id], input.checked));
      const check = el("label", "kus-ds-row__check");
      check.appendChild(input);
      const main = el("div", "kus-ds-row__main");
      const path = el("div", "kus-ds-row__path");
      path.append(el("span", `kus-rl-kind kus-rl-kind--${KIND_CLASS[change.kind] || "change"}`, change.kind), el("span", "kus-ds-row__name", describePath(change)));
      const diff = el("div", "kus-ds-row__diff");
      if (change.whole) {
        const text = change.kind === "削除" ? change.beforeText : change.afterText;
        diff.append(el("span", "kus-ds-row__whole", change.kind === "削除" ? "この要素を削除します" : "この要素を追加します"));
        if (text) diff.append(el("span", "kus-ds-value", clipText2(text)));
        diff.title = clipText2(text, 2e3);
      } else {
        const before = el("span", "kus-ds-value kus-ds-value--before", clipText2(change.beforeText || "（なし）"));
        const after = el("span", "kus-ds-value kus-ds-value--after", clipText2(change.afterText || "（なし）"));
        before.title = clipText2(change.beforeText, 2e3);
        after.title = clipText2(change.afterText, 2e3);
        const arrow = el("span", "kus-ds-arrow", "→");
        arrow.setAttribute("aria-label", "変更後");
        diff.append(before, arrow, after);
      }
      main.append(path, diff);
      const requires = describeRequires(change, session.index);
      if (requires) main.appendChild(el("div", "kus-ds-row__req", requires));
      row.append(check, main);
      view.rows.set(change.id, { change, input });
      return row;
    }
    function buildGroup(view, group, session) {
      const node = el("div", "kus-ds-group");
      node.dataset.groupId = group.groupId;
      const head = el("label", "kus-ds-group__head");
      const input = document.createElement("input");
      input.type = "checkbox";
      input.setAttribute("aria-label", `${group.groupLabel}の変更をまとめて選ぶ`);
      input.dataset.groupCheck = group.groupId;
      input.addEventListener("change", () => select(group.changes.map((change) => change.id), input.checked));
      const count = el("small", "kus-ds-group__count");
      head.append(input, el("strong", "", group.groupLabel), count);
      node.appendChild(head);
      view.groupViews.set(group.groupId, { group, input, count });
      for (const change of group.changes) node.appendChild(buildRow(view, change, session));
      return node;
    }
    function paintGroup(view, session) {
      const state3 = groupCheckState(view.group.changes, session.selected[view.group.changes[0].sectionKey] || /* @__PURE__ */ new Set());
      view.input.checked = state3 === "all";
      view.input.indeterminate = state3 === "some";
      view.input.dataset.checkState = state3;
      const chosen = view.group.changes.filter((change) => isChangeSelected(session, change)).length;
      view.count.textContent = `${chosen}/${view.group.changes.length}`;
    }
    function appendGroups(view, session) {
      const next = view.groups.slice(view.shown, view.shown + SELECT_GROUP_PAGE);
      const frag = document.createDocumentFragment();
      for (const group of next) frag.appendChild(buildGroup(view, group, session));
      view.body.insertBefore(frag, view.more);
      view.shown += next.length;
      for (const group of next) {
        const groupView = view.groupViews.get(group.groupId);
        if (groupView) paintGroup(groupView, session);
      }
      const rest = view.groups.length - view.shown;
      view.more.hidden = rest <= 0;
      if (rest > 0) setButtonText(view.more, `さらに表示（残り ${rest} グループ）`);
    }
    function renderBody(view, session) {
      const model = session.models[view.sectionKey];
      view.filtered = filterChanges(model.changes, filter());
      view.groups = groupChanges(view.filtered);
      view.shown = 0;
      view.rows.clear();
      view.groupViews.clear();
      view.body.replaceChildren(view.more);
      if (!view.filtered.length) view.body.insertBefore(el("div", "kus-ds-empty", "この条件に合う変更はありません。"), view.more);
      appendGroups(view, session);
    }
    function setOpen(view, open, session) {
      view.opened = open;
      view.body.hidden = !open;
      view.toggle.setAttribute("aria-expanded", String(open));
      const model = session.models[view.sectionKey];
      setButtonText(view.toggle, open ? "変更を閉じる" : `変更を表示（${model.changes.length} 件）`);
      if (open) renderBody(view, session);
      else {
        view.body.replaceChildren(view.more);
        view.rows.clear();
        view.groupViews.clear();
      }
    }
    function statusCard(session, key, tone, message) {
      const entry = session.preview.entries.find((candidate) => candidate.sectionKey === key);
      const card = el("section", `kus-ds-card kus-ds-card--${tone}`);
      card.dataset.selectSection = key;
      card.dataset.selectState = tone;
      const head = el("div", "kus-ds-card__head");
      head.append(el("strong", "kus-ds-card__title", entry.label), el("span", `kus-dp-pill kus-dp-pill--${tone === "same" ? "same" : "error"}`, tone === "same" ? "差分なし" : "取得失敗"));
      card.appendChild(head);
      card.appendChild(el("div", tone === "error" ? "kus-ds-card__problem" : "kus-ds-card__note", message));
      if (tone === "error") {
        const drop = makeButton("この項目を反映しない", "sub");
        drop.dataset.action = "drop-scope";
        drop.setAttribute("aria-label", `${entry.label}を反映しない項目から外す`);
        drop.addEventListener("click", () => host.dropScope(key));
        card.appendChild(drop);
      }
      return card;
    }
    function buildCard(session, key) {
      const entry = session.preview.entries.find((candidate) => candidate.sectionKey === key);
      if (session.modelErrors[key]) return statusCard(session, key, "error", `差分の選択を準備できませんでした。${firstLines(session.modelErrors[key], 2)}`);
      const model = session.models[key];
      if (entry.status === "same") return statusCard(session, key, "same", "反映先は反映元と同じ設定です。反映する変更はありません。");
      if (entry.status !== "change" || !model) {
        const reason = [...entry.blockers || [], entry.message].filter(Boolean)[0] || "設定を取得できませんでした。";
        return statusCard(session, key, "error", firstLines(reason, 4));
      }
      const card = el("section", "kus-ds-card");
      card.dataset.selectSection = key;
      card.dataset.selectState = "change";
      const head = el("div", "kus-ds-card__head");
      const count = el("span", "kus-ds-card__count");
      count.dataset.selectCount = key;
      const allBtn = makeButton("すべて選ぶ", "ghost");
      const noneBtn = makeButton("すべて外す", "ghost");
      allBtn.dataset.action = "select-all";
      noneBtn.dataset.action = "select-none";
      allBtn.setAttribute("aria-label", `${model.label}の変更をすべて選ぶ`);
      noneBtn.setAttribute("aria-label", `${model.label}の変更をすべて外す`);
      const tools = el("div", "kus-ds-card__tools");
      tools.append(allBtn, noneBtn);
      head.append(el("strong", "kus-ds-card__title", model.label), count, tools);
      card.appendChild(head);
      if (model.note) card.appendChild(el("div", "kus-ds-card__note", model.note));
      const jsonBadge = el("div", "kus-ds-note kus-ds-note--info", "JSONで修正中です。この項目は、選択・入力欄より JSON の内容を優先します。");
      jsonBadge.dataset.jsonActive = key;
      card.appendChild(jsonBadge);
      const problems = el("ul", "kus-ds-card__problems");
      problems.dataset.cardProblems = key;
      card.appendChild(problems);
      const toggle = makeButton("", "sub");
      toggle.dataset.action = "toggle";
      toggle.setAttribute("aria-label", `${model.label}の変更を表示`);
      const more = makeButton("さらに表示", "sub");
      more.classList.add("kus-dp-more");
      more.dataset.action = "more";
      more.hidden = true;
      const body = el("div", "kus-ds-card__body");
      body.dataset.selectBody = key;
      body.hidden = true;
      const view = { sectionKey: key, card, count, jsonBadge, problems, body, toggle, allBtn, noneBtn, more, opened: false, groups: [], shown: 0, rows: /* @__PURE__ */ new Map(), groupViews: /* @__PURE__ */ new Map(), filtered: model.changes };
      cards.set(key, view);
      toggle.addEventListener("click", () => {
        const current = host.session();
        if (current) setOpen(view, !view.opened, current);
      });
      more.addEventListener("click", () => {
        const current = host.session();
        if (current) appendGroups(view, current);
      });
      const visibleIds = () => filterChanges(model.changes, filter()).map((change) => change.id);
      allBtn.addEventListener("click", () => select(visibleIds(), true));
      noneBtn.addEventListener("click", () => select(visibleIds(), false));
      card.append(toggle, body);
      body.appendChild(more);
      setOpen(view, model.changes.length <= SELECT_OPEN_LIMIT, session);
      return card;
    }
    function renderSummary(session) {
      summaryHost.replaceChildren();
      const counts = countExtraction(session.preview.entries, host.activeScopes());
      const pills = el("div", "kus-dp-pills");
      pills.append(
        el("span", "kus-dp-pill kus-dp-pill--change", `差分のある項目 ${counts.change}`),
        el("span", "kus-dp-pill kus-dp-pill--same", `差分なし ${counts.same}`),
        el("span", "kus-dp-pill kus-dp-pill--error", `取得失敗 ${counts.error}`)
      );
      const info = el("div", "kus-ds-note kus-ds-note--info", describeExtractionSummary(counts));
      info.dataset.extractSummary = "true";
      summaryHost.append(pills, info);
      renderTargetPending(summaryHost, session.preview.targetPending);
    }
    function paintBlockers(session) {
      const result = host.blockers();
      blockersHost.replaceChildren();
      const lines = [
        ...result.failed.map((item) => `${item.label}: 取得失敗（${item.message}）。この項目を反映しない項目から外すか、差分を抽出し直してください。`),
        ...result.problems
      ];
      if (session.composeError) lines.push(`選んだ内容から反映内容を作れません（${firstLines(session.composeError, 1)}）。`);
      if (result.empty && !lines.length) lines.push("反映する差分を選んでください。");
      blockersHost.hidden = !lines.length;
      if (!lines.length) return;
      const box = el("div", "kus-ds-note kus-ds-note--warn");
      box.append(el("strong", "", "次へ進む前に解消が必要です"));
      const list2 = el("ul", "kus-ds-card__problems");
      for (const line of lines.slice(0, 20)) list2.appendChild(el("li", "", line));
      if (lines.length > 20) list2.appendChild(el("li", "", `ほか ${lines.length - 20} 件`));
      box.appendChild(list2);
      blockersHost.appendChild(box);
    }
    function renderCards(session) {
      cards.clear();
      cardsHost.replaceChildren();
      const active2 = new Set(host.activeScopes());
      for (const entry of session.preview.entries) if (active2.has(entry.sectionKey)) cardsHost.appendChild(buildCard(session, entry.sectionKey));
      if (!cardsHost.children.length) cardsHost.appendChild(el("div", "kus-ds-empty", "反映する項目がありません。「対象を選ぶ」で項目を選んでください。"));
      paintFilterCount(session);
    }
    function paintFilterCount(session) {
      const active2 = isFilterActive(filter());
      filterCount.textContent = active2 ? `表示中 ${[...cards.values()].reduce((sum, view) => sum + filterChanges(session.models[view.sectionKey].changes, filter()).length, 0)} 件` : "";
      for (const view of cards.values()) {
        view.allBtn.textContent = active2 ? "表示中をすべて選ぶ" : "すべて選ぶ";
        view.noneBtn.textContent = active2 ? "表示中をすべて外す" : "すべて外す";
      }
    }
    function render() {
      const session = host.session();
      if (!session || !host.isFresh()) {
        summaryHost.replaceChildren(el("div", "kus-ds-empty", "「対象を選ぶ」で差分を抽出してください。"));
        cardsHost.replaceChildren();
        blockersHost.replaceChildren();
        blockersHost.hidden = true;
        filterBar.hidden = true;
        cards.clear();
        return;
      }
      filterBar.hidden = false;
      renderSummary(session);
      renderCards(session);
      paintBlockers(session);
      refresh();
    }
    function refresh() {
      const session = host.session();
      if (!session || !host.isFresh()) return;
      for (const view of cards.values()) {
        const model = session.models[view.sectionKey];
        const chosen = selectedCount(session, view.sectionKey);
        view.count.textContent = `選んだ変更 ${chosen}/${model.changes.length}`;
        view.count.dataset.chosen = String(chosen);
        view.jsonBadge.hidden = !hasJsonOverride(session, view.sectionKey);
        const composed = session.composed?.sections.find((section) => section.sectionKey === view.sectionKey);
        const lines = [.../* @__PURE__ */ new Set([...composed?.errors || [], ...composed?.plan.blockers || [], ...(session.composed?.blockers || []).filter((line) => line.startsWith(`${model.label}:`)).map((line) => line.slice(model.label.length + 1).trim())])];
        view.problems.replaceChildren(...lines.slice(0, 10).map((line) => el("li", "", line)));
        view.problems.hidden = !lines.length;
        for (const row of view.rows.values()) row.input.checked = isChangeSelected(session, row.change);
        for (const group of view.groupViews.values()) paintGroup(group, session);
      }
      paintBlockers(session);
    }
    let keywordTimer = 0;
    keywordInput.addEventListener("input", () => {
      window.clearTimeout(keywordTimer);
      keywordTimer = window.setTimeout(() => rebuildBodies(), 150);
    });
    kindSelect.addEventListener("change", () => rebuildBodies());
    function rebuildBodies() {
      const session = host.session();
      if (!session || !host.isFresh()) return;
      for (const view of cards.values()) if (view.opened) renderBody(view, session);
      paintFilterCount(session);
    }
    return { root: root2, render, refresh };
  }

  // src/entries/deploy-source-style.ts
  var P = "#kus-deploy-lite";
  var STYLE_ID2 = "kus-deploy-source-styles";
  var CSS2 = `
${P} .kus-ds-flowbar{flex-shrink:0;display:flex;flex-wrap:wrap;align-items:center;gap:6px 12px;padding:8px 24px;background:#fff;border-bottom:1px solid #e2e8f0}
${P} .kus-ds-flowbar__label{font-size:12.5px;font-weight:700;color:#64748b}
${P} .kus-ds-flowbar__group{display:flex;flex-wrap:wrap;gap:6px}
${P} .kus-ds-flow{display:inline-flex;align-items:center;gap:6px;padding:7px 12px;border:1px solid #cbd5e1;border-radius:999px;background:#fff;color:#334155;font-size:13px;font-weight:700;cursor:pointer}
${P} .kus-ds-flow:has(input:checked){border-color:#be123c;background:#fff1f2;color:#881337}
${P} .kus-ds-flow:has(input:disabled){opacity:.55;cursor:not-allowed}
${P} .kus-ds-flow:has(input:focus-visible){outline:3px solid #2563eb;outline-offset:2px}
${P} .kus-ds-flow input{margin:0;accent-color:#be123c}
${P} .kus-dp-nav--five{grid-template-columns:repeat(5,minmax(0,1fr))}
${P} .kus-ds-route{display:grid;grid-template-columns:minmax(0,1fr) 40px minmax(0,1fr);align-items:stretch;gap:10px}
${P} .kus-ds-endpoint{padding:13px;border:1px solid #e2e8f0;border-radius:13px;background:#f8fafc;min-width:0}
${P} .kus-ds-endpoint--target{background:#fff7ed;border-color:#fed7aa}
${P} .kus-ds-endpoint__eyebrow{margin-bottom:8px;font-size:12px;font-weight:800;letter-spacing:.08em;color:#64748b}
${P} .kus-ds-endpoint--target .kus-ds-endpoint__eyebrow{color:#c2410c}
${P} .kus-ds-endpoint__note{font-size:12.5px;color:#9a3412;margin-bottom:8px}
${P} .kus-ds-endpoint .kus-lp__select{width:100%;margin-bottom:8px;min-width:0}
${P} .kus-ds-endpoint .kus-lp__input{width:100%;min-width:0;box-sizing:border-box;min-height:40px;font-size:14px}
${P} .kus-ds-endpoint .kus-lp__file{width:100%;min-width:0;box-sizing:border-box;margin:8px 0}
${P} .kus-ds-field{display:flex;flex-direction:column;gap:4px;font-size:12.5px;font-weight:600;margin:8px 0}
${P} .kus-ds-arrow-col{display:flex;align-items:center;justify-content:center;color:#be123c;font-size:22px;font-weight:800}
${P} .kus-ds-app-note{margin:-2px 0 8px;min-height:18px;font-size:13px;line-height:1.5;color:#64748b;overflow-wrap:anywhere}
${P} .kus-ds-app-note--ok{color:#065f46;font-weight:600}
${P} .kus-ds-app-note--warn{color:#b91c1c;font-weight:700}
${P} .kus-ds-scope-groups{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
${P} .kus-ds-scope-group{min-width:0;margin:0;padding:10px;border:1px solid #e2e8f0;border-radius:10px}
${P} .kus-ds-scope-group legend{font-size:12.5px;font-weight:700;color:#475569;padding:0 4px}
${P} .kus-ds-scope-group .kus-lp__chips{display:flex;flex-direction:column;align-items:stretch;margin-bottom:0}
${P} .kus-ds-scope-group .kus-lp__chip{display:flex;align-items:center;gap:6px;border-radius:6px;white-space:normal;min-height:32px}
${P} .kus-ds-chip__badge{margin-left:auto;flex:none;padding:0 6px;border:1px solid #fb923c;border-radius:4px;background:#fff7ed;color:#9a3412;font-size:11.5px;font-weight:800;line-height:16px}
${P} .kus-ds-note{padding:9px 12px;border-radius:10px;font-size:13px;line-height:1.6;border:1px solid #e2e8f0;background:#fff;overflow-wrap:anywhere}
${P} .kus-ds-note strong{display:block;margin-bottom:2px}
${P} .kus-ds-note--info{background:#eff6ff;border-color:#bfdbfe;color:#1e3a8a}
${P} .kus-ds-note--ok{background:#ecfdf5;border-color:#a7f3d0;color:#065f46}
${P} .kus-ds-note--warn{background:#fffbeb;border-color:#fde68a;color:#92400e}
${P} .kus-ds-note--err{background:#fef2f2;border-color:#fecaca;color:#991b1b}
${P} .kus-ds-note--quiet{background:#f8fafc;border-color:#e2e8f0;color:#475569}
${P} .kus-ds-note[hidden]{display:none}
${P} .kus-ds-summary,${P} .kus-ds-cards,${P} .kus-ds-select,${P} .kus-ds-edit-root{display:flex;flex-direction:column;gap:10px;min-width:0}
${P} .kus-ds-filter{display:flex;flex-wrap:wrap;align-items:center;gap:8px;padding:8px 10px;border:1px solid #e2e8f0;border-radius:12px;background:#fff}
${P} .kus-ds-filter .kus-lp__input{flex:1 1 220px;min-width:0}
${P} .kus-ds-filter__count{font-size:12.5px;color:#64748b}
${P} .kus-ds-card{padding:12px 14px;border:1px solid #e2e8f0;border-radius:14px;background:#fff;min-width:0;display:flex;flex-direction:column;gap:8px}
${P} .kus-ds-card--same{background:#f8fafc}
${P} .kus-ds-card--error{border-color:#fca5a5;background:#fff5f5}
${P} .kus-ds-card__head{display:flex;flex-wrap:wrap;align-items:center;gap:6px 12px}
${P} .kus-ds-card__title{font-size:14px;color:#0f172a}
${P} .kus-ds-card__count{font-size:12.5px;font-weight:700;color:#475569}
${P} .kus-ds-card__tools{display:flex;flex-wrap:wrap;gap:6px;margin-left:auto}
${P} .kus-ds-card__note{font-size:13px;color:#64748b;overflow-wrap:anywhere}
${P} .kus-ds-card__problem{font-size:13px;color:#991b1b;white-space:pre-wrap;overflow-wrap:anywhere}
${P} .kus-ds-card__problems{margin:0;padding-left:18px;font-size:13px;line-height:1.6;color:#92400e;overflow-wrap:anywhere}
${P} .kus-ds-card__problems--error{color:#991b1b}
${P} .kus-ds-card__problems[hidden]{display:none}
${P} .kus-ds-card__body{display:flex;flex-direction:column;gap:6px;min-width:0}
${P} .kus-ds-card__body[hidden]{display:none}
${P} .kus-ds-group{border:1px solid #f1f5f9;border-radius:10px;overflow:hidden}
${P} .kus-ds-group__head{display:flex;align-items:center;gap:8px;padding:6px 10px;background:#f8fafc;cursor:pointer;font-size:13px}
${P} .kus-ds-group__head input{margin:0;flex:none}
${P} .kus-ds-group__count{margin-left:auto;color:#64748b;font-variant-numeric:tabular-nums}
${P} .kus-ds-row{display:grid;grid-template-columns:28px minmax(0,1fr);gap:6px;padding:7px 10px;border-top:1px solid #f1f5f9;align-items:start}
${P} .kus-ds-row__check{display:flex;align-items:center;justify-content:center;padding-top:2px}
${P} .kus-ds-row__main{min-width:0;display:flex;flex-direction:column;gap:3px}
${P} .kus-ds-row__path{display:flex;flex-wrap:wrap;align-items:center;gap:6px;font-size:13px;font-weight:700;color:#0f172a;overflow-wrap:anywhere}
${P} .kus-ds-row__name{min-width:0}
${P} .kus-ds-row__diff{display:flex;flex-wrap:wrap;align-items:baseline;gap:4px 8px;font-size:13px;color:#334155;min-width:0}
${P} .kus-ds-row__whole{font-size:12.5px;color:#64748b}
${P} .kus-ds-row__req{font-size:12.5px;color:#1e40af}
${P} .kus-ds-value{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:3;overflow:hidden;max-width:100%;overflow-wrap:anywhere;white-space:pre-wrap;padding:1px 6px;border-radius:5px;background:#f1f5f9}
${P} .kus-ds-value--before{background:#fef2f2;color:#991b1b}
${P} .kus-ds-value--after{background:#f0fdf4;color:#166534}
${P} .kus-ds-arrow{color:#64748b}
${P} .kus-ds-empty{padding:12px;border:1px dashed #cbd5e1;border-radius:10px;background:#f8fafc;font-size:13px;color:#64748b}
${P} .kus-ds-edit-group{border:1px solid #f1f5f9;border-radius:10px;overflow:hidden}
${P} .kus-ds-edit-group__title{padding:6px 10px;background:#f8fafc;font-size:13px;font-weight:700;color:#0f172a;overflow-wrap:anywhere}
${P} .kus-ds-edit{display:grid;grid-template-columns:minmax(120px,.8fr) minmax(0,1.2fr) auto;gap:6px 10px;align-items:center;padding:7px 10px;border-top:1px solid #f1f5f9;border-left:4px solid transparent}
${P} .kus-ds-edit--changed{border-left-color:#d97706;background:#fffbeb}
${P} .kus-ds-edit__label{font-size:13px;font-weight:600;color:#334155;overflow-wrap:anywhere}
${P} .kus-ds-edit__control{display:flex;align-items:center;gap:8px;min-width:0}
${P} .kus-ds-edit__control .kus-lp__input,${P} .kus-ds-edit__control .kus-lp__select{width:100%;min-width:0;box-sizing:border-box}
${P} .kus-ds-edit__meta{display:flex;flex-wrap:wrap;align-items:center;gap:4px 8px;font-size:12.5px;color:#64748b;min-width:0}
${P} .kus-ds-edit__default{overflow-wrap:anywhere}
${P} .kus-ds-json{display:flex;flex-direction:column;gap:8px}
${P} .kus-ds-json[hidden]{display:none}
${P} .kus-ds-json__help{margin:0;font-size:12.5px;color:#64748b}
${P} .kus-ds-json__error{margin:0;font-size:13px;font-weight:700;color:#b91c1c}
${P} .kus-ds-json__actions{display:flex;flex-wrap:wrap;gap:6px}
${P} .kus-ds-json textarea{min-height:200px}
${P} .kus-ds-plan{min-width:0}
${P} .kus-ds-plan__title{font-size:12.5px;font-weight:700;color:#64748b;margin-bottom:2px}
${P} .kus-ds-blockers{margin-top:2px}
${P} .kus-ds-blockers[hidden]{display:none}
${P} .kus-ds-confirm-sections{display:flex;flex-direction:column;gap:8px}
${P} .kus-ds-confirm-section{padding:8px 10px;border:1px solid #e2e8f0;border-radius:10px;background:#fff;min-width:0}
${P} .kus-ds-confirm-section__head{display:flex;flex-wrap:wrap;gap:4px 12px;align-items:baseline;font-size:13px}
${P} .kus-ds-confirm-section__head strong{color:#0f172a}
${P} .kus-ds-confirm-section details{margin-top:4px}
${P} .kus-ds-confirm-section summary{cursor:pointer;font-size:12.5px;font-weight:700;color:#64748b}
${P} .kus-ds-route-line{font-size:14px;font-weight:700;color:#0f172a;overflow-wrap:anywhere}
${P} .kus-ds-result-grid{display:flex;flex-direction:column;gap:12px}
${P} .kus-ds-result-head{font-size:14px;font-weight:700;margin:0 0 8px;overflow-wrap:anywhere}
@media(max-width:900px){
  ${P} .kus-ds-scope-groups{grid-template-columns:1fr}
}
@media(max-width:760px){
  ${P} .kus-ds-route{grid-template-columns:1fr}
  ${P} .kus-ds-arrow-col{height:24px;transform:rotate(90deg)}
  ${P} .kus-ds-edit{grid-template-columns:1fr}
  ${P} .kus-ds-card__tools{margin-left:0}
}
@media(max-width:720px){
  ${P} .kus-ds-flowbar{padding:8px 16px}
  ${P} .kus-ds-flowbar__label{display:none}
  ${P} .kus-ds-flow{flex:1 1 auto;justify-content:center}
  ${P} .kus-dp-nav--five{padding:8px;gap:4px}
  ${P} .kus-dp-nav--five .kus-dp-nav__btn{font-size:11.5px;padding:8px 2px}
}
@media(max-width:420px){
  ${P} .kus-ds-flowbar__group{flex-wrap:nowrap;width:100%}
  ${P} .kus-ds-flow{font-size:12px;padding:6px 8px;gap:4px;white-space:nowrap}
}
@media(max-height:720px){
  ${P} .kus-ds-flowbar{padding:4px 12px}
}
`;
  function ensureSourceStyles() {
    if (document.getElementById(STYLE_ID2)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID2;
    style.textContent = CSS2;
    document.head.appendChild(style);
  }

  // src/entries/deploy-source-ui.ts
  var REPLACING_SCOPE_KEYS = /* @__PURE__ */ new Set(["appAcl", "fieldAcl", "recordPermissions", "notifications", "perRecordNotifications", "reminderNotifications", "processSettings"]);
  var DEFAULT_SCOPES = ["fieldSettings", "layoutSettings", "viewSettings"];
  var STALE_BLOCKER = "反映先が更新されたため、抽出結果は古くなりました。「差分を抽出し直す」を押してください。";
  var memory = { kind: "production", sourceApp: "", sourceGuest: "", targetApp: "", targetGuest: "", scopes: [...DEFAULT_SCOPES], preserve: true, lookupText: "", goal: "production", lastRun: null };
  function createSourceFlow(panel) {
    ensureSourceStyles();
    const runLite = (busyMsg, fn, okMsg) => liteRun(panel, busyMsg, async () => {
      panel.setResult("");
      return fn();
    }, okMsg);
    let busy = false;
    let ready = false;
    let activeStage = "setup";
    let session = null;
    let revision = 0;
    let confirmedToken = "";
    let requiredId = "";
    let pendingRequired = false;
    let progress = null;
    let deployProgress = null;
    let running = false;
    let composeTimer = 0;
    let currentRunGoal = "production";
    let viewsFresh = false;
    let shown = false;
    let showStage = () => {
    };
    let refreshWorkflow = () => {
    };
    let extractionStale = false;
    let staleReason = "";
    let carryNote = "";
    let restore = null;
    let sessionRestoreLabel = "";
    const pageGuest = () => guestIdFromPagePath(window.location?.pathname || "");
    const srcApp = makeInput({ placeholder: "反映元アプリID", value: memory.sourceApp, width: "id" });
    const srcGuest = makeInput({ placeholder: "ゲストID", value: memory.sourceGuest, width: "guest" });
    const defaultsToCurrentApp = !memory.targetApp && !!DEFAULT_APP_ID;
    const tgtApp = makeInput({ placeholder: "反映先アプリID", value: memory.targetApp || DEFAULT_APP_ID || "", width: "id" });
    const tgtGuest = makeInput({ placeholder: "ゲストID", value: defaultsToCurrentApp ? pageGuest() : memory.targetGuest, width: "guest" });
    srcApp.setAttribute("aria-label", "反映元アプリID");
    srcGuest.setAttribute("aria-label", "反映元ゲストスペースID");
    tgtApp.setAttribute("aria-label", "反映先アプリID");
    tgtGuest.setAttribute("aria-label", "反映先ゲストスペースID");
    for (const input of [srcApp, tgtApp]) input.inputMode = "numeric";
    let jsonBundle = null;
    let jsonBundles = [];
    let jsonToken = "";
    let jsonFileName = "";
    const appLookupCache = createReflectAppLookupCache();
    function createAppNote(appInput, guestInput, isActive) {
      const node = el("div", "kus-ds-app-note");
      node.setAttribute("aria-live", "polite");
      let key = "\0";
      let seq = 0;
      let timer;
      let failed = false;
      const paint = (text, tone = "") => {
        node.textContent = text;
        node.classList.toggle("kus-ds-app-note--ok", tone === "ok");
        node.classList.toggle("kus-ds-app-note--warn", tone === "warn");
      };
      const show = (info) => {
        failed = false;
        paint(`✓ ${formatReflectAppName(info)}`, "ok");
        refreshWorkflow();
      };
      function refresh() {
        const appId = appInput.value.trim();
        const guest = guestInput.value.trim();
        const active2 = isActive() && isLookupableReflectApp(appId, guest);
        const nextKey = active2 ? `${guest}|${appId}` : "";
        if (nextKey === key) return;
        key = nextKey;
        seq += 1;
        failed = false;
        window.clearTimeout(timer);
        if (!active2) {
          paint("");
          return;
        }
        const cached = appLookupCache.peek(appId, guest);
        if (cached) {
          show(cached);
          return;
        }
        paint("確認中…");
        const mine = seq;
        timer = window.setTimeout(async () => {
          if (!panel.root.isConnected) return;
          const result = await appLookupCache.get(appId, guest);
          if (mine !== seq || !panel.root.isConnected) return;
          if (result.ok) show(result);
          else {
            failed = true;
            paint("message" in result ? result.message : REFLECT_APP_LOOKUP_FAILURE, "warn");
          }
        }, 350);
      }
      function adopt(info) {
        const appId = appInput.value.trim();
        const guest = guestInput.value.trim();
        if (!isActive() || info.appId !== appId || !isLookupableReflectApp(appId, guest)) return;
        key = `${guest}|${appId}`;
        seq += 1;
        window.clearTimeout(timer);
        show(info);
      }
      const recheck = () => {
        if (!failed) return;
        key = "\0";
        refresh();
      };
      appInput.addEventListener("change", recheck);
      guestInput.addEventListener("change", recheck);
      return { el: node, refresh, adopt, stop() {
        seq += 1;
        window.clearTimeout(timer);
      } };
    }
    const sourceNote = createAppNote(srcApp, srcGuest, () => shown && currentKind() !== "json");
    const targetNote = createAppNote(tgtApp, tgtGuest, () => shown);
    panel.root.addEventListener("kus-lite-dispose", () => {
      sourceNote.stop();
      targetNote.stop();
    }, { once: true });
    const cardApp = makeCard({ title: "反映元と反映先のアプリ", number: 1 });
    const route = el("div", "kus-ds-route");
    const sourceEndpoint = el("section", "kus-ds-endpoint");
    sourceEndpoint.appendChild(el("div", "kus-ds-endpoint__eyebrow", "反映元 · 設定を読み取る"));
    const kindSelect = makeSelect([["production", "アプリの本番設定から取得"], ["preview", "アプリのプレビュー設定から取得"], ["json", "設定JSONから取得"]], memory.kind);
    kindSelect.setAttribute("aria-label", "反映元の取得方法");
    kindSelect.dataset.sourceKind = "true";
    sourceEndpoint.appendChild(kindSelect);
    function labeled(input, caption) {
      const label = el("label", "kus-ds-field");
      label.append(el("span", "", caption), input);
      return label;
    }
    const sourceAppFields = el("div");
    const sourceGuestDetails = makeDetails("ゲストスペースを指定", { open: !!srcGuest.value });
    sourceGuestDetails.body.appendChild(labeled(srcGuest, "ゲストスペースID（任意）"));
    const currentSrcBtn = makeButton("現在のアプリを反映元", "sub");
    sourceAppFields.append(labeled(srcApp, "アプリID"), sourceNote.el, sourceGuestDetails.details, currentSrcBtn);
    const sourceJsonFields = el("div");
    sourceJsonFields.hidden = true;
    const jsonFile = document.createElement("input");
    jsonFile.type = "file";
    jsonFile.accept = ".json,application/json";
    jsonFile.className = "kus-lp__file";
    jsonFile.setAttribute("aria-label", "反映元の設定JSON");
    const jsonAppSelect = makeSelect([]);
    jsonAppSelect.setAttribute("aria-label", "設定JSON内の反映元アプリ");
    jsonAppSelect.hidden = true;
    const jsonClearBtn = makeButton("クリア", "ghost");
    jsonClearBtn.hidden = true;
    const jsonNote = el("div", "kus-lp__small");
    jsonNote.hidden = true;
    sourceJsonFields.append(jsonFile, jsonAppSelect, jsonClearBtn, jsonNote);
    sourceEndpoint.append(sourceAppFields, sourceJsonFields);
    const targetEndpoint = el("section", "kus-ds-endpoint kus-ds-endpoint--target");
    targetEndpoint.appendChild(el("div", "kus-ds-endpoint__eyebrow", "反映先 · 設定を書き込む"));
    const targetNoteText = el("div", "kus-ds-endpoint__note");
    const targetGuestDetails = makeDetails("ゲストスペースを指定", { open: !!tgtGuest.value });
    targetGuestDetails.body.appendChild(labeled(tgtGuest, "ゲストスペースID（任意）"));
    const currentTgtBtn = makeButton("現在のアプリを反映先", "sub");
    targetEndpoint.append(targetNoteText, labeled(tgtApp, "アプリID"), targetNote.el, targetGuestDetails.details, currentTgtBtn);
    const arrow = el("div", "kus-ds-arrow-col", "→");
    arrow.setAttribute("aria-hidden", "true");
    route.append(sourceEndpoint, arrow, targetEndpoint);
    cardApp.body.appendChild(route);
    cardApp.body.appendChild(createAppSearchControl(panel, {
      targets: [
        { label: "反映元", apply: (id, _name, guestId) => {
          if (currentKind() === "json") setKind("production");
          srcApp.value = id;
          srcGuest.value = guestId || "";
          onInputsChanged();
        } },
        { label: "反映先", apply: (id, _name, guestId) => {
          tgtApp.value = id;
          tgtGuest.value = guestId || "";
          onInputsChanged();
        } }
      ]
    }));
    cardApp.body.appendChild(makeNote("反映元の設定を読み取り、反映先のプレビューへ書き込みます。反映先は本番のアプリで、書き込んだあとに本番へ反映します（目標を「プレビューまで」にすると、本番へは反映しません）。", "help"));
    const cardScope = makeCard({ title: "反映する項目", number: 2 });
    const putSections = REFLECT_SECTION_KEYS.map((key) => ({ key, label: reflectSectionLabel(key) }));
    const initialScopes = new Set(memory.scopes);
    const chips = putSections.map((section) => {
      const chip = makeChip({ label: section.label, checked: initialScopes.has(section.key), value: section.key });
      const hint = describeReflectScope(section.key);
      chip.checkbox.setAttribute("aria-label", section.label);
      if (hint) {
        chip.label.title = `${section.label}: ${hint}`;
        const description = el("span", "", `${REPLACING_SCOPE_KEYS.has(section.key) ? "置換型の項目。" : ""}${hint}`);
        description.id = `kus-ds-scope-hint-${section.key}`;
        description.hidden = true;
        chip.label.appendChild(description);
        chip.checkbox.setAttribute("aria-describedby", description.id);
      }
      if (REPLACING_SCOPE_KEYS.has(section.key)) {
        const badge = el("span", "kus-ds-chip__badge", "置換");
        badge.setAttribute("aria-hidden", "true");
        chip.label.appendChild(badge);
      }
      chip.checkbox.addEventListener("change", onScopesChanged);
      return chip;
    });
    const scopeGroups = el("div", "kus-ds-scope-groups");
    for (const group of groupReflectScopes(putSections.map((section) => section.key))) {
      const fieldset = el("fieldset", "kus-ds-scope-group");
      fieldset.appendChild(el("legend", "", group.label));
      const list2 = el("div", "kus-lp__chips");
      for (const key of group.keys) {
        const chip = chips.find((candidate) => candidate.checkbox.value === key);
        if (chip) list2.appendChild(chip.label);
      }
      fieldset.appendChild(list2);
      scopeGroups.appendChild(fieldset);
    }
    const fieldNotice = el("p", "kus-ds-note kus-ds-note--warn", FIELD_SETTINGS_OMITTED_NOTICE);
    fieldNotice.hidden = true;
    cardScope.body.append(scopeGroups, fieldNotice);
    cardScope.body.appendChild(makeNote("標準はフィールド・レイアウト・一覧です。選んだ項目ごとに差分を抽出し、次の画面で設定値 1 つずつ選べます。", "help"));
    const cardGoal = makeCard({ title: "目標", number: 3 });
    function makeChoice(name, value, title, description, checked) {
      const label = el("label", "kus-dp-choice");
      const input = document.createElement("input");
      input.type = "radio";
      input.name = name;
      input.value = value;
      input.checked = checked;
      input.setAttribute("aria-label", title);
      const copy = el("span");
      copy.append(el("strong", "", title), el("small", "", description));
      label.append(input, copy);
      return { label, input };
    }
    const goalName = `${panel.root.id}-source-goal`;
    const goalProduction = makeChoice(goalName, "production", "本番まで反映", "反映先のプレビューへ書き込み、続けて本番へ反映します（アプリを更新）。", memory.goal !== "preview");
    const goalPreview = makeChoice(goalName, "preview", "プレビューまで（本番へは反映しない）", "反映先のプレビューへ書き込むだけです。本番へは反映しません。", memory.goal === "preview");
    const goalGroup = el("div", "kus-dp-choices");
    goalGroup.setAttribute("role", "radiogroup");
    goalGroup.setAttribute("aria-label", "目標");
    goalGroup.append(goalProduction.label, goalPreview.label);
    cardGoal.body.append(goalGroup);
    cardGoal.body.appendChild(makeNote("目標は最終確認でも確認します。「プレビューまで」を選んだ場合も、あとから「プレビューの変更を公開」で本番へ反映できます。", "help"));
    const detail = makeDialog({ title: "詳細設定", id: "kus-ds-detail" });
    const preserve = makeCheck({ label: "反映先だけの一覧・グラフ・アクションを保持する", checked: memory.preserve });
    preserve.checkbox.setAttribute("aria-label", "反映先だけの一覧・グラフ・アクションを保持する");
    const preserveCard = makeCard({ title: "一覧・グラフ・アクションの扱い", soft: true });
    preserveCard.body.append(preserve.label, makeNote("標準はON（保持）です。OFFにすると、反映元にない一覧・グラフ・アクションの削除が差分に出ます。", "help"));
    const lookupTa = makeTextarea({ rows: 4, code: true, placeholder: "1 行ずつ「旧AppID → 新AppID」（例: 10 → 25）", value: memory.lookupText });
    lookupTa.setAttribute("aria-label", "参照先変換（旧AppID → 新AppID）");
    const lookupError = el("p", "kus-ds-json__error");
    lookupError.hidden = true;
    const lookupCard = makeCard({ title: "参照先変換", soft: true });
    lookupCard.body.append(lookupTa, lookupError, makeNote('ルックアップ・関連レコード一覧・アクションのコピー先が参照するアプリIDを、反映先の環境のIDへ読み替えます。JSON形式（{"旧":"新"}）も使えます。', "help"));
    detail.body.append(preserveCard.card, lookupCard.card);
    attachCardHelp(detail.body);
    const detailBtn = makeButton("詳細設定…", "sub");
    detailBtn.setAttribute("aria-haspopup", "dialog");
    detailBtn.addEventListener("click", () => detail.open());
    const detailSummary = el("span", "kus-dp-detail-summary");
    const detailRow = el("div", "kus-dp-detail-row");
    detailRow.append(detailBtn, detailSummary);
    const setupStage = el("div", "kus-dp-setup");
    setupStage.append(cardApp.card, cardScope.card, cardGoal.card, detailRow);
    const currentKind = () => kindSelect.value === "json" ? "json" : kindSelect.value === "preview" ? "preview" : "production";
    const currentGoal = () => goalPreview.input.checked ? "preview" : "production";
    const activeScopes = () => REFLECT_SECTION_KEYS.filter((key) => chips.some((chip) => chip.checkbox.value === key && chip.checkbox.checked));
    const currentLookup = () => parseLookupMapText(lookupTa.value);
    function currentOptions(scopes = activeScopes()) {
      const kind = currentKind();
      return {
        sourceAppId: kind === "json" ? String(jsonBundle?.appId || srcApp.value.trim()) : srcApp.value.trim(),
        sourceGuestId: kind === "json" ? "" : srcGuest.value.trim(),
        sourcePreview: kind === "preview",
        ...kind === "json" ? { sourceBundle: jsonBundle } : {},
        targetAppId: tgtApp.value.trim(),
        targetGuestId: tgtGuest.value.trim(),
        scopes,
        lookupMap: lookupMapValue(currentLookup()),
        preserveTargetOnly: preserve.checkbox.checked
      };
    }
    function currentSignature() {
      const options = currentOptions();
      return buildSourceSetupSignature({
        sourceKind: currentKind(),
        sourceAppId: options.sourceAppId,
        sourceGuestId: options.sourceGuestId || "",
        jsonToken: currentKind() === "json" ? jsonToken : "",
        targetAppId: options.targetAppId,
        targetGuestId: options.targetGuestId || "",
        preserveTargetOnly: !!options.preserveTargetOnly,
        lookupMap: options.lookupMap || {}
      });
    }
    function isFresh() {
      return !!session && session.signature === currentSignature() && scopesCoveredBy(activeScopes(), session.scopes);
    }
    function setupBlocker() {
      const kind = currentKind();
      if (kind === "json" && !jsonBundle) return "反映元の設定JSONを読み込んでください。";
      const lookupMessage = lookupMapError(currentLookup());
      const connection = reflectConnectionError(currentOptions());
      if (connection) return connection;
      if (!activeScopes().length) return "反映する項目を選んでください。";
      if (lookupMessage) return lookupMessage;
      return "";
    }
    function setKind(kind) {
      kindSelect.value = kind;
      syncKindFields();
    }
    function syncKindFields() {
      const kind = currentKind();
      sourceAppFields.hidden = kind === "json";
      sourceJsonFields.hidden = kind !== "json";
      jsonAppSelect.hidden = jsonBundles.length < 2;
      jsonClearBtn.hidden = !jsonBundle;
      jsonNote.hidden = !jsonBundle;
      if (jsonBundle) {
        const appName = extractAppNameFromBundle(jsonBundle);
        jsonNote.textContent = `設定JSONを読み込み済み${jsonFileName ? `（${jsonFileName}）` : ""}: アプリ #${jsonBundle?.appId || "-"}${appName ? ` (${appName})` : ""}。反映元はこのJSONから取得し、アプリからは取得しません。`;
      }
    }
    function describeDetail() {
      const lookup = currentLookup();
      const parts = [preserve.checkbox.checked ? "反映先だけの一覧・グラフ・アクションを保持" : "反映先だけの一覧・グラフ・アクションを削除", lookup.ok ? lookup.count ? `参照先変換 ${lookup.count} 件` : "参照先変換なし" : "参照先変換に誤りあり"];
      return { text: `詳細設定: ${parts.join(" / ")}`, warn: !preserve.checkbox.checked || !lookup.ok };
    }
    function onInputsChanged() {
      const restoreNote = syncRestore();
      const persisted = restore ? restore.before : null;
      memory.kind = persisted ? persisted.kind : currentKind();
      memory.sourceApp = persisted ? persisted.sourceApp : srcApp.value;
      memory.sourceGuest = persisted ? persisted.sourceGuest : srcGuest.value;
      memory.targetApp = tgtApp.value;
      memory.targetGuest = tgtGuest.value;
      memory.scopes = persisted ? [...persisted.scopes] : activeScopes();
      memory.preserve = persisted ? persisted.preserve : preserve.checkbox.checked;
      memory.lookupText = persisted ? persisted.lookupText : lookupTa.value;
      memory.goal = persisted ? persisted.goal : currentGoal();
      if (srcGuest.value) sourceGuestDetails.details.open = true;
      if (tgtGuest.value) targetGuestDetails.details.open = true;
      sourceNote.refresh();
      targetNote.refresh();
      syncKindFields();
      const summary = describeDetail();
      detailSummary.textContent = summary.text;
      detailSummary.classList.toggle("kus-dp-detail-summary--warn", summary.warn);
      const lookupMessage = lookupMapError(currentLookup());
      lookupError.textContent = lookupMessage;
      lookupError.hidden = !lookupMessage;
      fieldNotice.hidden = !shouldWarnMissingFieldSettings(activeScopes()) || !activeScopes().length;
      targetNoteText.textContent = currentGoal() === "production" ? "書き込むのは反映先のプレビュー。続けて本番へ反映します" : "書き込むのは反映先のプレビューだけです";
      bump();
      if (ready && isFresh() !== viewsFresh) renderViews();
      refreshWorkflow();
      if (restoreNote) panel.setStatus(restoreNote, "info");
      return restoreNote;
    }
    function renderViews() {
      viewsFresh = isFresh();
      selectView.render();
      editView.render();
    }
    function onScopesChanged() {
      if (restore && !restoreStillApplies(restore)) {
        onInputsChanged();
        return;
      }
      memory.scopes = restore ? [...restore.before.scopes] : activeScopes();
      fieldNotice.hidden = !shouldWarnMissingFieldSettings(activeScopes()) || !activeScopes().length;
      bump();
      if (session && isFresh()) recompose();
      if (ready) renderViews();
      refreshWorkflow();
    }
    for (const input of [srcApp, srcGuest, tgtApp, tgtGuest]) input.addEventListener("input", onInputsChanged);
    for (const input of [goalProduction.input, goalPreview.input, preserve.checkbox]) input.addEventListener("change", onInputsChanged);
    lookupTa.addEventListener("input", onInputsChanged);
    kindSelect.addEventListener("change", () => {
      onInputsChanged();
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
      onInputsChanged();
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
    currentSrcBtn.addEventListener("click", () => {
      srcApp.value = DEFAULT_APP_ID || "";
      srcGuest.value = DEFAULT_APP_ID ? pageGuest() : srcGuest.value;
      onInputsChanged();
      panel.setStatus("現在のアプリを反映元にセットしました。", "info");
    });
    currentTgtBtn.addEventListener("click", () => {
      tgtApp.value = DEFAULT_APP_ID || "";
      tgtGuest.value = DEFAULT_APP_ID ? pageGuest() : tgtGuest.value;
      onInputsChanged();
      panel.setStatus("現在のアプリを反映先にセットしました。", "info");
    });
    function renderJsonAppSelect() {
      jsonAppSelect.replaceChildren(...jsonBundles.map((bundle, index) => {
        const option = document.createElement("option");
        option.value = String(index);
        const appName = extractAppNameFromBundle(bundle);
        option.textContent = `アプリ #${bundle.appId}${appName ? ` (${appName})` : ""}`;
        return option;
      }));
    }
    jsonFile.addEventListener("change", () => runLite("反映元の設定JSONを読み込み中…", async () => {
      const file = jsonFile.files?.[0];
      if (!file) return;
      jsonFile.value = "";
      const priorBefore = restore ? restore.before : captureRestoreBefore();
      jsonBundle = null;
      jsonBundles = [];
      jsonToken = "";
      jsonFileName = "";
      let parsed;
      try {
        parsed = JSON.parse(await file.text());
      } catch {
        throw new Error("設定JSONの読み込みに失敗しました（JSON形式が不正です）");
      }
      if (isDeployBackupFile(parsed)) {
        const prepared = prepareSourceRestoreFromFile(parsed);
        if (!prepared.ok) throw new Error(prepared.message);
        beginRestore(prepared.plan, file.name, priorBefore);
        panel.setStatus(`本番反映のバックアップを読み込みました（アプリ #${prepared.plan.targetAppId}）。バックアップから戻す設定にしました。「差分を抽出する」で戻す内容を確認してください。まだ書き込んでいません。`, "ok");
        return;
      }
      jsonBundles = pickAllSettingsBundles(parsed, "source", true);
      renderJsonAppSelect();
      jsonBundle = jsonBundles[0];
      jsonToken = `${file.name}:${file.size}:${file.lastModified}:${Date.now()}`;
      jsonFileName = file.name;
      const note = onInputsChanged();
      panel.setStatus(`${note ? `${note} ` : ""}反映元の設定JSONを読み込みました（アプリ #${jsonBundle?.appId || "-"}）。`, "ok");
    }));
    jsonAppSelect.addEventListener("change", () => {
      const index = Number(jsonAppSelect.value);
      jsonBundle = jsonBundles[index];
      if (restore && jsonToken === restore.token) {
        const chosen = restoreSelectionFor(restore.plan, index);
        if (chosen) {
          tgtApp.value = chosen.targetAppId;
          tgtGuest.value = chosen.targetGuestId;
          setScopes(chosen.scopes);
          restore.targetAppId = chosen.targetAppId;
          restore.targetGuestId = chosen.targetGuestId;
          restore.scopes = [...chosen.scopes];
        }
      }
      onInputsChanged();
    });
    jsonClearBtn.addEventListener("click", () => {
      jsonBundle = null;
      jsonBundles = [];
      jsonToken = "";
      jsonFileName = "";
      jsonFile.value = "";
      const note = onInputsChanged();
      panel.setStatus(`${note ? `${note} ` : ""}読み込んだ設定JSONをクリアしました。設定JSONを選び直してください。`, "info");
    });
    function captureRestoreBefore() {
      return {
        kind: currentKind(),
        sourceApp: srcApp.value,
        sourceGuest: srcGuest.value,
        scopes: activeScopes(),
        preserve: preserve.checkbox.checked,
        lookupText: lookupTa.value,
        goal: currentGoal(),
        jsonBundle,
        jsonBundles: [...jsonBundles],
        jsonToken,
        jsonFileName
      };
    }
    function setScopes(keys) {
      const wanted = new Set(keys);
      for (const chip of chips) chip.checkbox.checked = wanted.has(chip.checkbox.value);
    }
    function setGoal(goal) {
      goalProduction.input.checked = goal === "production";
      goalPreview.input.checked = goal === "preview";
    }
    function restoring() {
      return !!restore && jsonToken === restore.token && !!jsonBundle;
    }
    function restoreLabel() {
      return restore ? restoreSourceLabel(extractAppNameFromBundle(jsonBundle) || `App ${restore.targetAppId}`, restore.plan.generatedAt) : "";
    }
    function beginRestore(plan, fileName, before) {
      jsonBundles = plan.bundles;
      renderJsonAppSelect();
      jsonBundle = plan.bundle;
      jsonAppSelect.value = String(plan.bundleIndex);
      jsonToken = `backup:${plan.generatedAt}:${Date.now()}`;
      jsonFileName = fileName;
      jsonFile.value = "";
      kindSelect.value = "json";
      tgtApp.value = plan.targetAppId;
      tgtGuest.value = plan.targetGuestId;
      preserve.checkbox.checked = false;
      lookupTa.value = "";
      setScopes(plan.scopes);
      setGoal(plan.goal);
      restore = { token: jsonToken, plan, targetAppId: plan.targetAppId, targetGuestId: plan.targetGuestId, scopes: [...plan.scopes], goal: plan.goal, before };
      session = null;
      extractionStale = false;
      carryNote = "";
      sessionRestoreLabel = "";
      clearConfirmation();
      onInputsChanged();
      renderViews();
      showStage("setup");
    }
    function startRestore(request) {
      if (busy) return false;
      const prepared = prepareSourceRestore(request);
      if (!prepared.ok) {
        panel.setStatus(prepared.message, "err");
        return false;
      }
      const name = extractAppNameFromBundle(prepared.plan.bundle);
      beginRestore(prepared.plan, restoreSourceLabel(name || `App ${prepared.plan.targetAppId}`, prepared.plan.generatedAt), restore ? restore.before : captureRestoreBefore());
      panel.setStatus(`バックアップから戻す設定にしました（アプリ #${prepared.plan.targetAppId}）。「差分を抽出する」で戻す内容を確認してください。まだ書き込んでいません。`, "info");
      return true;
    }
    function restoreStillApplies(state3) {
      return currentKind() === "json" && jsonToken === state3.token && tgtApp.value.trim() === state3.targetAppId && tgtGuest.value.trim() === state3.targetGuestId && !preserve.checkbox.checked && lookupTa.value.trim() === "" && activeScopes().every((key) => state3.scopes.includes(key));
    }
    function endRestore() {
      const state3 = restore;
      if (!state3) return "";
      restore = null;
      const before = state3.before;
      let reverted = false;
      if (jsonToken === state3.token) {
        jsonBundle = before.jsonBundle;
        jsonBundles = before.jsonBundles;
        jsonToken = before.jsonToken;
        jsonFileName = before.jsonFileName;
        renderJsonAppSelect();
        if (before.jsonBundle) jsonAppSelect.value = String(Math.max(0, before.jsonBundles.indexOf(before.jsonBundle)));
        jsonFile.value = "";
        if (currentKind() === "json") {
          kindSelect.value = before.kind;
          srcApp.value = before.sourceApp;
          srcGuest.value = before.sourceGuest;
        }
        reverted = true;
      }
      if (!preserve.checkbox.checked && before.preserve) {
        preserve.checkbox.checked = true;
        reverted = true;
      }
      if (lookupTa.value.trim() === "" && before.lookupText !== "") {
        lookupTa.value = before.lookupText;
        reverted = true;
      }
      const selected = activeScopes();
      if (selected.length === state3.scopes.length && selected.every((key) => state3.scopes.includes(key)) && !(before.scopes.length === selected.length && before.scopes.every((key) => selected.includes(key)))) {
        setScopes(before.scopes);
        reverted = true;
      }
      if (currentGoal() === state3.goal && state3.goal !== before.goal) {
        setGoal(before.goal);
        reverted = true;
      }
      session = null;
      extractionStale = false;
      sessionRestoreLabel = "";
      clearConfirmation();
      return reverted ? "バックアップから戻す設定を終了しました。反映元・保持・参照先変換・項目・目標のうち、変えていないものを戻す前の値に戻しました。" : "バックアップから戻す設定を終了しました。";
    }
    function syncRestore() {
      if (!restore || restoreStillApplies(restore)) return "";
      return endRestore();
    }
    function recompose() {
      window.clearTimeout(composeTimer);
      composeTimer = 0;
      if (session) recomposeSession(session, activeScopes());
    }
    function flushRecompose() {
      if (composeTimer) recompose();
    }
    function scheduleRecompose() {
      window.clearTimeout(composeTimer);
      composeTimer = window.setTimeout(() => {
        recompose();
        afterComposed();
      }, 200);
    }
    function afterComposed() {
      selectView.refresh();
      editView.refresh();
      refreshWorkflow();
    }
    function bump() {
      revision += 1;
      if (confirmedToken && confirmedToken !== confirmationToken()) clearConfirmation();
    }
    function selectionBlockers2() {
      if (!session || !isFresh()) return { failed: [], problems: [], references: [], empty: false };
      return collectSelectionBlockers({ entries: session.preview.entries, activeScopes: activeScopes(), models: session.models, composed: session.composed });
    }
    function editEntryBlocker() {
      if (!session || !isFresh()) return "";
      if (session.composeError) return `選んだ内容から反映内容を作れません（${firstLines(session.composeError, 1)}）。`;
      return firstEditEntryBlockerText(selectionBlockers2());
    }
    function stageBlocker() {
      if (!session || !isFresh()) return "";
      const unapplied = editView.unappliedJson();
      if (unapplied.length) return `${unapplied.join("、")}のJSONの変更がまだ適用されていません。「JSONを適用」を押すか、「JSONの編集を閉じる」で取り消してください。`;
      if (session.composeError) return `選んだ内容から反映内容を作れません（${firstLines(session.composeError, 1)}）。`;
      return firstBlockerText(selectionBlockers2());
    }
    const selectView = createSelectView({
      session: () => session,
      activeScopes,
      isFresh,
      blockers: selectionBlockers2,
      notify: (message) => panel.setStatus(message, "info"),
      dropScope: (key) => {
        const chip = chips.find((candidate) => candidate.checkbox.value === key);
        if (!chip) return;
        chip.checkbox.checked = false;
        onScopesChanged();
        panel.setStatus(`${reflectSectionLabel(key)}を反映する項目から外しました。`, "info");
      },
      changeSelection: (ids, on) => {
        const result = session ? applySelection(session, ids, on) : { changed: [], required: [], cascaded: [] };
        if (result.changed.length) {
          bump();
          recompose();
          afterComposed();
        }
        return result;
      }
    });
    const editView = createEditView({
      session: () => session,
      activeScopes,
      isFresh,
      notify: (message) => panel.setStatus(message, "info"),
      setOverride: (sectionKey, pointer, value, defaultValue, debounce) => {
        if (!session) return;
        setOverride(session, sectionKey, pointer, value, defaultValue);
        bump();
        if (debounce) {
          scheduleRecompose();
          refreshWorkflow();
        } else {
          recompose();
          afterComposed();
        }
      },
      resetSection: (sectionKey) => {
        if (!session) return;
        clearOverrides(session, sectionKey);
        bump();
        recompose();
        afterComposed();
      },
      applyJson: (sectionKey, json) => {
        if (!session) return;
        setJsonOverride(session, sectionKey, json);
        bump();
        recompose();
        afterComposed();
      },
      jsonEditsChanged: () => refreshWorkflow()
    });
    async function startExtract() {
      if (busy) return;
      const blocker = setupBlocker();
      if (blocker) {
        panel.setStatus(blocker, "warn");
        return;
      }
      const options = currentOptions();
      const signature = currentSignature();
      const kind = currentKind();
      await runLite("差分を抽出中…", async () => {
        panel.setStatus("反映元と反映先のアプリを確認中…", "busy");
        const identities = await resolveReflectAppsStandalone(options);
        if (kind !== "json") sourceNote.adopt({ ok: true, appId: identities.source.appId, name: identities.source.name, code: identities.source.code });
        targetNote.adopt({ ok: true, appId: identities.target.appId, name: identities.target.name, code: identities.target.code });
        const preview = await previewReflectStandalone(options, (message) => panel.setStatus(message, "busy"));
        const previous = extractionStale && session && session.signature === signature ? session : null;
        session = createSourceSession({ signature, opts: options, identities, sourceEnvironment: kind, preview });
        extractionStale = false;
        staleReason = "";
        sessionRestoreLabel = restoring() ? restoreSourceLabel(identities.target.name, restore.plan.generatedAt) : "";
        carryNote = previous ? describeCarryOver(carryOverSession(session, previous)) : "";
        bump();
        clearConfirmation();
        recompose();
        viewsFresh = true;
        showStage("select");
        const counts = countExtraction(preview.entries);
        const summary = describeExtractionSummary(counts);
        const carried = carryNote ? ` ${carryNote}` : "";
        if (counts.error) panel.setStatus(`${summary}取得失敗の項目は、反映しない項目から外すか、抽出し直してください。まだ書き込んでいません。${carried}`, "warn");
        else if (!counts.change) panel.setStatus(`${summary}まだ書き込んでいません。${carried}`, "info");
        else panel.setStatus(`${summary}反映する変更を選んでください。まだ書き込んでいません。${carried}`, "ok");
      });
    }
    const confirmBtn = makeButton("最終確認に進む", "primary");
    const runBtn = makeButton(sourceRunLabel("production"), "danger");
    runBtn.disabled = true;
    const confirmCard = makeCard({ title: "この内容で反映先を変更します" });
    const confirmBody = el("div");
    const ack = makeCheck({ label: "上記の内容を確認しました", checked: false });
    ack.checkbox.setAttribute("aria-label", "上記の内容を確認しました");
    const confirmInput = makeInput({ width: "wide", noSubmit: true });
    confirmInput.autocomplete = "off";
    confirmInput.inputMode = "numeric";
    confirmInput.setAttribute("data-lp-no-submit", "");
    const confirmLabel = el("label", "kus-dp-confirm-label");
    const confirmInputWrap = el("div", "kus-dp-confirm-input");
    confirmInputWrap.append(confirmLabel, confirmInput);
    const confirmStatus = el("p", "kus-dp-quiet");
    confirmStatus.setAttribute("aria-live", "polite");
    let pendingAck = makeCheck({ label: "", checked: false });
    confirmCard.body.append(confirmBody, ack.label, confirmInputWrap, confirmStatus);
    function confirmationToken() {
      return session && isFresh() && !extractionStale ? `${session.id}:${revision}:${currentGoal()}` : "";
    }
    function clearConfirmation() {
      confirmedToken = "";
      ack.checkbox.checked = false;
      pendingAck.checkbox.checked = false;
      confirmInput.value = "";
      confirmStatus.textContent = "内容を確認して、チェックと入力をしてください。";
      runBtn.disabled = true;
    }
    function confirmationReady() {
      return !!confirmedToken && confirmedToken === confirmationToken() && ack.checkbox.checked && !!requiredId && confirmInput.value.trim() === requiredId && (!pendingRequired || pendingAck.checkbox.checked) && !stageBlocker();
    }
    function refreshConfirmState() {
      runBtn.disabled = busy || !confirmationReady();
      const missing = [];
      if (!ack.checkbox.checked) missing.push("確認のチェック");
      if (pendingRequired && !pendingAck.checkbox.checked) missing.push("未公開の変更の了承");
      if (confirmInput.value.trim() !== requiredId) missing.push("反映先アプリIDの入力");
      confirmStatus.textContent = confirmationReady() ? "確認できました。下の実行ボタンで実行できます。" : `${missing.join("と")}が必要です。`;
      refreshWorkflow();
    }
    for (const control of [ack.checkbox, confirmInput]) control.addEventListener("input", refreshConfirmState);
    function fact(key, title, mod = "") {
      const root2 = el("div", `kus-dp-fact${mod ? ` kus-dp-fact--${mod}` : ""}`);
      root2.dataset.confirm = key;
      const dd = el("dd");
      root2.append(el("dt", "", title), dd);
      return { root: root2, dd };
    }
    function sourceLabelText(current) {
      if (sessionRestoreLabel) return sessionRestoreLabel;
      const identity = current.identities.source;
      const where = current.sourceEnvironment === "json" ? "設定JSON" : current.sourceEnvironment === "preview" ? "プレビュー設定" : "本番設定";
      return `${identity.name}（#${identity.appId}・${where}）`;
    }
    function openConfirmation() {
      if (busy || !session || !isFresh() || extractionStale) return;
      flushRecompose();
      if (stageBlocker()) return;
      const run = sectionsToRun(session.composed, activeScopes());
      if (!run.length) return;
      clearConfirmation();
      confirmedToken = confirmationToken();
      const goal = currentGoal();
      const target = session.identities.target;
      confirmCard.card.querySelector(".kus-lp__card-title").textContent = goal === "production" ? "この内容で反映先を変更し、本番へ反映します" : "この内容で反映先のプレビューを変更します";
      confirmBody.replaceChildren();
      const facts = el("dl", "kus-dp-facts");
      const routeFact = fact("route", "経路", "direction");
      routeFact.dd.appendChild(el("div", "kus-ds-route-line", describeRoute(sourceLabelText(session), `${target.name}（#${target.appId}）`, goal)));
      facts.appendChild(routeFact.root);
      const goalFact = fact("goal", "目標");
      goalFact.dd.textContent = goal === "production" ? "本番まで反映（プレビューへ書き込み、続けて本番へ反映します）" : "プレビューまで（本番へは反映しません）";
      facts.appendChild(goalFact.root);
      const sectionsFact = fact("sections", `反映する項目（${run.length} 項目）`);
      const list2 = el("div", "kus-ds-confirm-sections");
      for (const section of run) {
        const box = el("div", "kus-ds-confirm-section");
        box.dataset.confirmSection = section.sectionKey;
        const kinds = summarizeItemKinds(section.plan.items);
        const head = el("div", "kus-ds-confirm-section__head");
        head.append(el("strong", "", section.label), el("span", "", `選んだ変更 ${section.selectedCount}/${section.totalCount}`), el("span", "", `修正した値 ${section.editedCount}`), el("span", "", kinds || `変更 ${section.plan.changeCount} 件`));
        box.appendChild(head);
        if (section.plan.items?.length) {
          const details = document.createElement("details");
          details.appendChild(el("summary", "", "変更の要約を表示"));
          let rendered = false;
          details.addEventListener("toggle", () => {
            if (details.open && !rendered) {
              rendered = true;
              appendReflectItems(details, { label: section.label, items: section.plan.items, sectionKey: section.sectionKey });
            }
          });
          box.appendChild(details);
        }
        list2.appendChild(box);
      }
      sectionsFact.dd.appendChild(list2);
      facts.appendChild(sectionsFact.root);
      const removed = collectRemovedSettings(run);
      const removedFact = fact("removed", "削除される設定", removed.length ? "danger" : "");
      if (removed.length) {
        removedFact.dd.appendChild(el("strong", "", `${removed.length} 件の設定が削除されます。`));
        const ul = el("ul", "kus-dp-issues");
        ul.style.color = "#991b1b";
        for (const item of removed.slice(0, 30)) ul.appendChild(el("li", "", item.text));
        if (removed.length > 30) ul.appendChild(el("li", "", `ほか ${removed.length - 30} 件（全件は記録のMarkdownで確認できます）`));
        removedFact.dd.appendChild(ul);
        const removedFields = removed.filter((item) => item.isField).length;
        if (removedFields && goal === "production") removedFact.dd.appendChild(el("strong", "", `削除されるフィールド（${removedFields} 件）は、本番へ反映すると、レコードの値も削除され、元に戻せません。`));
      } else {
        removedFact.dd.textContent = "削除される設定はありません。";
      }
      facts.appendChild(removedFact.root);
      const pending = session.preview.targetPending;
      const pendingState = pending?.state;
      pendingRequired = goal === "production" && pendingState !== "clean" && pendingState !== "own";
      pendingAck = makeCheck({ label: pendingState === "pending" ? "反映先プレビューの以前からの未公開の変更も、一緒に本番へ反映されることを了承しました" : "未公開の変更があるか確認できないまま、プレビューの内容がすべて本番へ反映されることを了承しました", checked: false });
      pendingAck.checkbox.setAttribute("aria-label", "未公開の変更も一緒に本番へ反映されることを了承する");
      pendingAck.checkbox.addEventListener("input", refreshConfirmState);
      const pendingFact = fact("pending", "反映先の未公開の変更", pendingRequired ? "danger" : "");
      renderTargetPending(pendingFact.dd, pending, false);
      if (pendingRequired) {
        pendingFact.dd.appendChild(el("strong", "", pendingState === "pending" ? "以前からの未公開の変更は、今回の反映と一緒に本番へ反映されます。" : "反映先に以前からの未公開の変更があるか確認できませんでした。本番へ反映すると、プレビューの内容がすべて本番へ反映されます。"));
        pendingFact.dd.appendChild(pendingAck.label);
      } else if (!pending) pendingFact.dd.textContent = "確認していません。";
      facts.appendChild(pendingFact.root);
      const backup = fact("backup", "バックアップ");
      const backupList = el("ul", "kus-dp-issues");
      backupList.style.color = "#334155";
      for (const line of sourceBackupDescriptions(goal)) backupList.appendChild(el("li", "", line));
      backup.dd.appendChild(backupList);
      const undo = fact("undo", "取り消し方", goal === "production" ? "danger" : "");
      undo.dd.textContent = sourceUndoGuidance(goal, pending);
      facts.append(backup.root, undo.root);
      confirmBody.appendChild(facts);
      requiredId = target.appId;
      confirmLabel.textContent = `反映先アプリID（${requiredId} と入力）`;
      confirmInput.placeholder = requiredId;
      confirmInput.setAttribute("aria-label", "確認用の反映先アプリID");
      confirmInput.id = `${panel.root.id}-source-confirm-input`;
      confirmLabel.htmlFor = confirmInput.id;
      setButtonText(runBtn, sourceRunLabel(goal));
      refreshConfirmState();
      showStage("confirm");
      panel.setStatus(`反映先と内容を確認してください。まだ${goal === "production" ? "反映先へは書き込んで" : "反映先のプレビューへは書き込んで"}いません。`, "info");
    }
    confirmBtn.addEventListener("click", openConfirmation);
    const resultCard = makeCard({ title: "実行結果" });
    const resultHead = el("div", "kus-ds-result-head");
    resultHead.setAttribute("aria-live", "polite");
    const resultNotes = el("div", "kus-dp-result-notes");
    const applyCard = makeCard({ title: "反映先プレビューへの書き込み", soft: true });
    const applyHost = el("div");
    applyCard.body.appendChild(applyHost);
    const deployCard = makeCard({ title: "本番への反映", soft: true });
    const deployHost = el("div");
    deployCard.body.appendChild(deployHost);
    const resultTools = el("div", "kus-dp-tools");
    const saveJsonBtn = makeButton("結果JSONを保存", "sub");
    const saveRecordBtn = makeButton("記録をMarkdownで保存", "sub");
    const copyRecordBtn = makeButton("記録をコピー", "sub");
    const restoreBtn = makeButton("バックアップから戻す", "sub");
    restoreBtn.dataset.sourceRestore = "true";
    restoreBtn.title = "保存したバックアップを反映元にして、反映先との差分を確認します（この操作では書き込みません）";
    const openSettingsBtn = makeButton("反映先アプリの設定画面を開く", "sub");
    resultTools.append(saveJsonBtn, saveRecordBtn, copyRecordBtn, restoreBtn, openSettingsBtn);
    const resultGrid = el("div", "kus-ds-result-grid");
    resultGrid.append(resultHead, resultNotes, applyCard.card, deployCard.card, resultTools);
    resultCard.body.appendChild(resultGrid);
    const resultEmpty = el("div", "kus-dp-empty", "まだ実行していません。対象を選び、差分を選んで最終確認をしてから実行してください。");
    function progressRowsFromResult(result) {
      return result.apply.sections.map((section) => ({
        sectionKey: section.sectionKey,
        label: section.label,
        status: section.status,
        ...section.message ? { message: section.message } : {},
        ...section.stopped ? { stopped: true } : {}
      }));
    }
    function renderFinalProgress(last) {
      progress = createApplyProgressView(applyHost, progressRowsFromResult(last.result));
      deployHost.replaceChildren();
      deployProgress?.dispose();
      deployProgress = null;
      deployCard.card.hidden = last.context.goal !== "production";
      if (last.context.goal !== "production") return;
      if (last.result.deploy) {
        deployProgress = createProgressView(deployHost, "deploy", []);
        deployProgress.setOutcomes(last.result.deploy.apps);
      } else {
        const note = el("div", "kus-ds-note kus-ds-note--warn");
        note.dataset.deploySkipped = "true";
        note.append(el("strong", "", "本番へは反映していません"), el("span", "", last.result.deploySkipped || "本番への反映は行われませんでした。"));
        deployHost.appendChild(note);
      }
    }
    function renderResultCard() {
      const last = memory.lastRun;
      const showing = running || !!last;
      resultCard.card.hidden = !showing;
      resultEmpty.hidden = showing;
      if (!showing) return;
      resultNotes.replaceChildren();
      if (running || !last) {
        resultHead.textContent = `${currentRunGoal === "preview" ? "反映先プレビューへの書き込み" : "反映先プレビューへの書き込みと本番への反映"}を実行中です。`;
        resultTools.hidden = true;
        applyCard.card.hidden = false;
        deployCard.card.hidden = currentRunGoal !== "production";
        return;
      }
      resultTools.hidden = false;
      applyCard.card.hidden = false;
      const result = last.result;
      const message = describeSourceDeployResult(result);
      resultHead.textContent = message.text;
      resultHead.dataset.tone = message.tone;
      if (result.deploySkipped && !result.apply.cancelled) {
        const note = el("div", "kus-ds-note kus-ds-note--warn");
        note.dataset.deploySkippedNote = "true";
        note.append(el("strong", "", "本番へは反映していません"), el("span", "", result.deploySkipped), el("span", "", "反映先プレビューには書き込み済みです。「プレビューの変更を公開」から、続けて本番へ反映できます。"));
        resultNotes.appendChild(note);
      }
      const unverified = (result.deploy?.apps || []).filter((app) => app.status === "success" && app.verified === false);
      if (unverified.length) {
        const note = el("div", "kus-dp-warn", `注意: 反映後の状態（revision）が本番とプレビューで一致しませんでした。アプリの設定画面で確認してください。`);
        note.dataset.deployUnverified = String(unverified.length);
        resultNotes.appendChild(note);
      }
      const previewBackup = result.apply.backup;
      const previewNote = el("div", previewBackup ? "kus-dp-info" : "kus-dp-warn", previewBackup ? `バックアップ（反映前のプレビュー）: 保存しました（項目: ${previewBackup.scopes.map(reflectSectionLabel).join("、")}）` : "バックアップ（反映前のプレビュー）: 保存していません。");
      previewNote.dataset.backupPreview = previewBackup ? "saved" : "none";
      resultNotes.appendChild(previewNote);
      if (last.context.goal === "production") {
        const backup = result.deploy?.backup;
        const note = el("div", backup ? "kus-dp-info" : "kus-dp-warn");
        note.dataset.backupProduction = backup ? "saved" : "none";
        note.textContent = backup ? `バックアップ（本番へ反映する前の本番）: ${backup.fileName}（反映前の本番設定）` : "バックアップ（本番へ反映する前の本番）: 保存していません。";
        if (backup?.unavailableFiles?.length) {
          const warn = el("div", "kus-dp-warn");
          warn.append(el("strong", "", `本体を保存できなかったファイル（${backup.unavailableFiles.length} 件）`));
          const ul = el("ul", "kus-dp-issues");
          for (const file of backup.unavailableFiles.slice(0, 20)) ul.appendChild(el("li", "", `App ${file.appId} / ${file.name}（${file.reason}）`));
          warn.appendChild(ul);
          note.appendChild(warn);
        }
        resultNotes.appendChild(note);
      }
      resultNotes.appendChild(el("div", "kus-dp-info", sourceUndoGuidance(last.context.goal, last.context.targetPending)));
      restoreBtn.hidden = !pickSourceRestoreRequest(result, last.context.target);
      restoreBtn.disabled = busy;
    }
    function recordInput(last) {
      return { ...last.context, finishedAt: last.finishedAt, result: last.result };
    }
    function exportName(base, ext, last) {
      return buildExportFilename(base, ext, { appLabel: buildAppFilenameLabel(last.context.target.appId, last.context.target.name) });
    }
    saveJsonBtn.addEventListener("click", () => {
      const last = memory.lastRun;
      if (!last) return;
      downloadText(exportName("反映元から本番反映結果", "json", last), stringifySourceDeployResultJson(recordInput(last)), "application/json;charset=utf-8");
      panel.setStatus("結果JSONを保存しました。", "ok");
    });
    saveRecordBtn.addEventListener("click", () => {
      const last = memory.lastRun;
      if (!last) return;
      downloadText(exportName("反映元から本番反映記録", "md", last), buildSourceDeployRecordMarkdown(recordInput(last)), "text/markdown;charset=utf-8");
      panel.setStatus("記録をMarkdownで保存しました。", "ok");
    });
    copyRecordBtn.addEventListener("click", () => {
      const last = memory.lastRun;
      if (!last) return;
      void copyTextToClipboard(buildSourceDeployRecordMarkdown(recordInput(last))).then((ok) => panel.setStatus(ok ? "記録のMarkdownをコピーしました。" : "コピーできませんでした。「記録をMarkdownで保存」を使ってください。", ok ? "ok" : "warn"));
    });
    openSettingsBtn.addEventListener("click", () => {
      const last = memory.lastRun;
      if (!last) return;
      window.open(`${window.location.origin}${appSettingsPath(last.context.target)}`, "_blank", "noopener");
      panel.setStatus(`アプリ #${last.context.target.appId} の設定画面を開きました。`, "info");
    });
    restoreBtn.addEventListener("click", () => {
      const last = memory.lastRun;
      const request = last ? pickSourceRestoreRequest(last.result, last.context.target) : null;
      if (!last || !request || busy) return;
      startRestore(request);
    });
    async function startRun() {
      if (busy || !confirmationReady() || !session) return;
      flushRecompose();
      const current = session;
      const run = sectionsToRun(current.composed, activeScopes());
      if (!run.length) return;
      const goal = currentGoal();
      const allowPendingChanges = pendingRequired && pendingAck.checkbox.checked;
      const target = current.identities.target;
      const source = current.identities.source;
      const context = {
        goal,
        source: { appId: source.appId, guestId: source.guestId, name: sessionRestoreLabel || source.name, environment: current.sourceEnvironment },
        target: { appId: target.appId, guestId: target.guestId, name: target.name },
        preserveTargetOnly: !!current.opts.preserveTargetOnly,
        lookupMap: { ...current.opts.lookupMap || {} },
        targetPending: current.preview.targetPending,
        allowPendingChanges,
        sections: run.map((section) => ({ sectionKey: section.sectionKey, label: section.label, selectedCount: section.selectedCount, totalCount: section.totalCount, editedCount: section.editedCount, items: section.plan.items || [] })),
        startedAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      const reflect = { ...current.opts, scopes: run.map((section) => section.sectionKey) };
      const composed = composedAfterMap(run);
      const previous = memory.lastRun;
      currentRunGoal = goal;
      clearConfirmation();
      running = true;
      progress = createApplyProgressView(applyHost, createApplyProgressRows(run.map((section) => section.sectionKey), (key) => run.find((section) => section.sectionKey === key)?.label || key));
      deployProgress?.dispose();
      deployProgress = goal === "production" ? createProgressView(deployHost, "deploy", [{ appId: target.appId, guestId: target.guestId, name: target.name, status: "waiting" }]) : null;
      if (!deployProgress) deployHost.replaceChildren();
      memory.lastRun = null;
      let wroteAnything = false;
      showStage("result");
      renderResultCard();
      const finish2 = (result) => {
        const last = { result, context, finishedAt: (/* @__PURE__ */ new Date()).toISOString() };
        memory.lastRun = last;
        session = null;
        extractionStale = false;
        running = false;
        renderFinalProgress(last);
      };
      await runLite(goal === "production" ? "反映先プレビューへ書き込み中…" : "反映先プレビューへ反映中…", async () => {
        let result;
        try {
          result = await runSourceToProductionStandalone({
            reflect,
            reviewBaseline: current.preview.baseline,
            composed,
            goal,
            targetPending: current.preview.targetPending,
            allowPendingChanges,
            onSectionUpdate: (update) => {
              if (update.status === "running" || update.status === "ok" || update.status === "ng") wroteAnything = true;
              progress?.update(update);
            },
            onDeployUpdate: (update) => {
              wroteAnything = true;
              deployProgress?.update(update);
            },
            setStatus: (message2) => panel.setStatus(message2, "busy")
          });
        } catch (error) {
          const reason = String(error?.message || error || "不明なエラー");
          if (!wroteAnything) {
            running = false;
            memory.lastRun = previous;
            if (previous) renderFinalProgress(previous);
            renderResultCard();
            extractionStale = true;
            staleReason = firstLines(reason, 1).replace(/[。.]\s*$/, "");
            clearConfirmation();
            showStage("edit");
            refreshWorkflow();
            throw error;
          }
          const rows = progress?.rows() || [];
          finish2({
            goal,
            apply: {
              logs: [`エラー: ${reason}`],
              finalRevision: "",
              sections: run.map((section) => {
                const row = rows.find((candidate) => candidate.sectionKey === section.sectionKey);
                const status = row?.status === "ok" || row?.status === "skip" || row?.status === "ng" ? row.status : row?.status === "running" ? "ng" : "pending";
                return { sectionKey: section.sectionKey, label: section.label, status, message: status === "ng" ? row?.message || `処理が中断されました。反映先プレビューの状態を確認してください。（${reason}）` : status === "pending" ? "実行前に処理が止まりました。" : row?.message, ...row?.stopped ? { stopped: true } : {} };
              })
            },
            deploySkipped: goal === "production" ? `実行中にエラーが発生したため、本番の状態をアプリの設定画面で確認してください。（${reason}）` : void 0
          });
          renderResultCard();
          throw new Error(`実行中にエラーが発生しました。反映先と本番の状態をアプリの設定画面で確認してください。（${reason}）`);
        }
        finish2(result);
        if (result.apply.logs?.length) panel.setResult(result.apply.logs.join("\n"));
        renderResultCard();
        const message = describeSourceDeployResult(result);
        panel.setStatus(message.text, message.tone);
      });
      running = false;
      renderResultCard();
      refreshWorkflow();
    }
    runBtn.addEventListener("click", () => {
      void startRun();
    });
    const nav = el("nav", "kus-dp-nav kus-dp-nav--five");
    nav.setAttribute("aria-label", "反映元アプリから本番への手順");
    nav.setAttribute("role", "tablist");
    const stageDefs = [
      { id: "setup", number: "1", label: "対象を選ぶ", copy: "反映元・反映先・項目" },
      { id: "select", number: "2", label: "差分を選ぶ", copy: "設定値を 1 つずつ選ぶ" },
      { id: "edit", number: "3", label: "内容を修正", copy: "値を直してから確認" },
      { id: "confirm", number: "4", label: "最終確認", copy: "経路と削除を確かめる" },
      { id: "result", number: "5", label: "結果", copy: "結果を見て次の操作を選ぶ" }
    ];
    const stages = {};
    const navButtons = {};
    for (const def of stageDefs) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "kus-dp-nav__btn";
      button.id = `kus-ds-tab-${def.id}`;
      button.setAttribute("role", "tab");
      button.setAttribute("aria-controls", `kus-ds-stage-${def.id}`);
      button.innerHTML = `<span class="kus-dp-nav__num">${def.number}</span><span>${def.label}<small class="kus-dp-nav__copy">${def.copy}</small></span>`;
      nav.appendChild(button);
      navButtons[def.id] = button;
      const stage = document.createElement("section");
      stage.className = "kus-dp-stage";
      stage.id = `kus-ds-stage-${def.id}`;
      stage.dataset.stage = def.id;
      stage.setAttribute("role", "tabpanel");
      stage.setAttribute("aria-labelledby", button.id);
      stages[def.id] = stage;
      button.addEventListener("click", () => {
        if (def.id === "confirm") openConfirmation();
        else showStage(def.id);
      });
      button.addEventListener("keydown", (event) => {
        if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
        event.preventDefault();
        const count = stageDefs.length;
        const index = stageDefs.findIndex((item) => item.id === def.id);
        const enabledAt = (at) => !navButtons[stageDefs[at].id].disabled;
        let next = -1;
        if (event.key === "Home" || event.key === "End") next = stageDefs.map((_, at) => event.key === "Home" ? at : count - 1 - at).find(enabledAt) ?? -1;
        else {
          const direction = event.key === "ArrowRight" ? 1 : -1;
          for (let step = 1; step < count; step += 1) {
            const at = (index + direction * step + count) % count;
            if (enabledAt(at)) {
              next = at;
              break;
            }
          }
        }
        if (next < 0 || next === index) return;
        if (stageDefs[next].id === "confirm") openConfirmation();
        else showStage(stageDefs[next].id);
      });
    }
    const heads = {
      setup: ["どの設定を、どのアプリへ反映しますか？", "反映元と反映先、反映する項目、目標を選びます。次の画面で差分を抽出します（この時点では書き込みません）。"],
      select: ["反映する差分を選ぶ", "反映元との差分を、設定値 1 つずつ選びます（例: 「必須」だけ反映し、表示名は反映しない）。この画面では書き込みません。"],
      edit: ["反映する内容を修正する", "主な値は入力欄で、残りは「JSONで編集」で直せます。JSONで直した項目は、選択・入力欄より JSON を優先します。直さない場合は、そのまま最終確認へ進めます。"],
      confirm: ["反映先と内容の最終確認", "経路・項目・削除される設定・バックアップ・取り消し方を確認してから実行します。"],
      result: ["実行結果と次の操作", "プレビューへの書き込みと、本番への反映の結果を確認します。"]
    };
    for (const def of stageDefs) {
      const head = el("header", "kus-dp-stage-head");
      head.append(el("h2", "", heads[def.id][0]), el("p", "", heads[def.id][1]));
      stages[def.id].appendChild(head);
    }
    const restoreBanners = [];
    for (const stageId of ["setup", "select", "edit", "confirm"]) {
      const root2 = el("div", "kus-ds-note kus-ds-note--warn kus-ds-restore-notice");
      root2.dataset.restoreNotice = stageId;
      root2.hidden = true;
      const body = el("span");
      root2.append(el("strong", "", RESTORE_NOTICE_TITLE), body);
      stages[stageId].appendChild(root2);
      restoreBanners.push({ root: root2, body });
    }
    const staleBanners = [];
    for (const stageId of ["select", "edit"]) {
      const root2 = el("div", "kus-ds-note kus-ds-note--warn");
      root2.dataset.staleExtraction = stageId;
      root2.setAttribute("role", "alert");
      root2.hidden = true;
      const body = el("span");
      root2.append(el("strong", "", "抽出結果が古くなりました"), body);
      stages[stageId].appendChild(root2);
      staleBanners.push({ root: root2, body });
    }
    const carryBanner = el("div", "kus-ds-note kus-ds-note--info");
    carryBanner.dataset.carryOver = "true";
    carryBanner.setAttribute("aria-live", "polite");
    carryBanner.hidden = true;
    stages.select.appendChild(carryBanner);
    function paintBanners(fresh) {
      const restoreText = restoring() ? `${restoreLabel()}を反映元にしています。${RESTORE_NOTICE_BODY}` : "";
      for (const banner of restoreBanners) {
        banner.root.hidden = !restoreText;
        banner.body.textContent = restoreText;
      }
      const staleText = fresh && extractionStale ? `書き込み前の確認で止めたため、まだ何も書き込んでいません（${staleReason || "反映先が更新されました"}）。「差分を抽出し直す」を押してください。選択と入力欄の修正は、抽出し直した後もできるだけ引き継ぎます。` : "";
      for (const banner of staleBanners) {
        banner.root.hidden = !staleText;
        banner.body.textContent = staleText;
      }
      carryBanner.hidden = !fresh || !carryNote || extractionStale;
      carryBanner.textContent = carryNote;
    }
    stages.setup.appendChild(setupStage);
    stages.select.appendChild(selectView.root);
    stages.edit.appendChild(editView.root);
    stages.confirm.appendChild(confirmCard.card);
    stages.result.append(resultCard.card, resultEmpty);
    const dock = el("div", "kus-dp-action-dock");
    const dockRow = el("div", "kus-dp-dock-row");
    const dockCopy = el("div", "kus-dp-dock-copy");
    dockCopy.setAttribute("aria-live", "polite");
    const dockActions = el("div", "kus-dp-dock-actions");
    const backBtn = makeButton("対象を変更", "sub");
    const extractBtn = makeButton("差分を抽出する", "primary");
    const toEditBtn = makeButton("内容の修正へ", "primary");
    backBtn.addEventListener("click", () => {
      const back = { setup: "setup", select: "setup", edit: "select", confirm: "edit", result: "setup" };
      showStage(back[activeStage]);
    });
    extractBtn.addEventListener("click", () => {
      void startExtract();
    });
    toEditBtn.addEventListener("click", () => {
      flushRecompose();
      if (!session || !isFresh() || extractionStale || editEntryBlocker()) return;
      showStage("edit");
    });
    dockActions.append(backBtn, extractBtn, toEditBtn, confirmBtn, runBtn);
    dockRow.append(dockCopy, dockActions);
    dock.append(dockRow);
    const workspace = el("div", "kus-dp-workspace");
    const canvas = el("main", "kus-dp-canvas");
    workspace.append(nav, canvas);
    for (const def of stageDefs) canvas.appendChild(stages[def.id]);
    workspace.appendChild(detail.dialog);
    [stages.setup, stages.select, stages.edit, stages.confirm, stages.result].forEach((scope) => attachCardHelp(scope));
    const noInputSubmit = document.createElement("button");
    noInputSubmit.disabled = true;
    function selectedTotal() {
      return (session?.composed?.sections || []).filter((section) => activeScopes().includes(section.sectionKey)).reduce((sum, section) => sum + section.selectedCount, 0);
    }
    function dockTitle() {
      if (activeStage === "setup") {
        const kind = currentKind();
        return `反映元 ${restoring() ? "バックアップ" : kind === "json" ? "設定JSON" : `#${srcApp.value.trim() || "－"}`} → 反映先 #${tgtApp.value.trim() || "－"} · ${currentGoal() === "production" ? "本番まで反映" : "プレビューまで"}`;
      }
      if (activeStage === "result") return memory.lastRun ? describeRoute(memory.lastRun.context.source.name, memory.lastRun.context.target.name, memory.lastRun.context.goal) : "実行結果";
      return `選んだ変更 ${selectedTotal()} 件 · ${currentGoal() === "production" ? "本番まで反映" : "プレビューまで"}`;
    }
    refreshWorkflow = () => {
      const fresh = isFresh();
      const stale = fresh && extractionStale;
      const usable = fresh && !stale;
      const blocker = activeStage === "setup" || stale ? setupBlocker() : "";
      const stageProblem = fresh ? stageBlocker() : "";
      backBtn.hidden = activeStage === "setup";
      extractBtn.hidden = !(activeStage === "setup" || stale && (activeStage === "select" || activeStage === "edit"));
      toEditBtn.hidden = activeStage !== "select";
      confirmBtn.hidden = activeStage !== "edit";
      runBtn.hidden = activeStage !== "confirm";
      backBtn.disabled = busy;
      extractBtn.disabled = busy || !!blocker;
      toEditBtn.disabled = busy || !usable || !!editEntryBlocker();
      confirmBtn.disabled = busy || !usable || !!stageProblem;
      setButtonText(backBtn, activeStage === "select" ? "対象を変更" : activeStage === "edit" ? "差分の選択に戻る" : activeStage === "confirm" ? "内容の修正に戻る" : "対象を選び直す");
      setButtonText(extractBtn, stale ? "差分を抽出し直す" : fresh ? "抽出し直す" : "差分を抽出する");
      navButtons.select.disabled = !fresh;
      navButtons.edit.disabled = !fresh || !!editEntryBlocker();
      navButtons.confirm.disabled = !usable || !!stageProblem || busy;
      let message = "";
      if (activeStage === "setup") {
        message = blocker ? `次に進むには：${blocker}` : stale ? STALE_BLOCKER : fresh ? "抽出済みの差分があります。「差分を選ぶ」へ進むか、抽出し直してください。" : "反映元と反映先の差分を抽出します。書き込みは行いません。";
      } else if (activeStage === "select" || activeStage === "edit") {
        message = stale ? `次に進むには：${STALE_BLOCKER}` : !fresh ? "入力が変わりました。「対象を選ぶ」で差分を抽出し直してください。" : (activeStage === "select" ? editEntryBlocker() : stageProblem) ? `次に進むには：${activeStage === "select" ? editEntryBlocker() : stageProblem}` : activeStage === "select" ? `${selectedTotal()} 件の変更を選んでいます。内容を修正するか、そのまま進めます。` : `${selectedTotal()} 件の変更を反映します。最終確認へ進んでください。`;
      } else if (activeStage === "confirm") {
        message = confirmationReady() ? "内容を確認できました。実行すると反映先が変わります。" : pendingRequired ? "確認のチェック、未公開の変更の了承、入力をすると、実行できます。" : "確認のチェックと入力をすると、実行できます。";
      } else {
        message = busy ? "実行中です。終わるまでお待ちください。「中止」で、次の書き込みの前に止められます。" : memory.lastRun ? "結果を確認してください。" : "まだ実行していません。";
      }
      const blocked = activeStage === "setup" && !!blocker || (activeStage === "select" || activeStage === "edit") && fresh && (stale || !!(activeStage === "select" ? editEntryBlocker() : stageProblem));
      dockCopy.replaceChildren(el("strong", "", dockTitle()), el("span", `kus-dp-dock-msg${blocked ? " kus-dp-dock-reason" : ""}`, message));
      paintBanners(fresh);
      panel.result.hidden = activeStage === "confirm";
      panel.setPrimaryAction(activeStage === "setup" ? extractBtn : activeStage === "select" ? toEditBtn : activeStage === "edit" ? confirmBtn : noInputSubmit);
    };
    showStage = (active2) => {
      if (active2 === "confirm" && !confirmedToken) return;
      if ((active2 === "select" || active2 === "edit") && (!session || !isFresh())) return;
      if (activeStage === "confirm" && active2 !== "confirm") clearConfirmation();
      if (active2 === "select") selectView.render();
      if (active2 === "edit") {
        flushRecompose();
        editView.render();
      }
      activeStage = active2;
      for (const def of stageDefs) {
        const selectedStage = def.id === active2;
        stages[def.id].hidden = !selectedStage;
        navButtons[def.id].setAttribute("aria-selected", String(selectedStage));
        navButtons[def.id].tabIndex = selectedStage ? 0 : -1;
      }
      navButtons[active2].focus({ preventScroll: true });
      canvas.scrollTo({ top: 0 });
      renderResultCard();
      refreshWorkflow();
    };
    function setBusy(value) {
      busy = value;
      nav.inert = value;
      for (const def of stageDefs) stages[def.id].inert = value && def.id !== "result";
      if (value) {
        refreshWorkflow();
        renderResultCard();
        return;
      }
      onInputsChangedQuiet();
      renderResultCard();
      refreshConfirmStateIfOpen();
      navButtons[activeStage].focus({ preventScroll: true });
    }
    function onInputsChangedQuiet() {
      const summary = describeDetail();
      detailSummary.textContent = summary.text;
      detailSummary.classList.toggle("kus-dp-detail-summary--warn", summary.warn);
      refreshWorkflow();
    }
    function refreshConfirmStateIfOpen() {
      if (activeStage === "confirm" && confirmedToken) refreshConfirmState();
      else runBtn.disabled = true;
    }
    panel.root.addEventListener("kus-lite-dispose", () => {
      progress = null;
      deployProgress?.dispose();
      window.clearTimeout(composeTimer);
    }, { once: true });
    ready = true;
    clearConfirmation();
    onInputsChanged();
    if (memory.lastRun) {
      currentRunGoal = memory.lastRun.context.goal;
      renderFinalProgress(memory.lastRun);
    }
    renderViews();
    for (const def of stageDefs) stages[def.id].hidden = def.id !== "setup";
    showStage(memory.lastRun ? "result" : "setup");
    return {
      workspace,
      dock,
      deactivate() {
        shown = false;
        sourceNote.refresh();
        targetNote.refresh();
      },
      activate() {
        shown = true;
        dock.append(panel.status, panel.result);
        sourceNote.refresh();
        targetNote.refresh();
        refreshWorkflow();
        const last = memory.lastRun;
        if (last && activeStage === "result") {
          if (last.result.apply.logs?.length) panel.setResult(last.result.apply.logs.join("\n"));
          const message = describeSourceDeployResult(last.result);
          panel.setStatus(message.text, message.tone);
        }
      },
      setBusy,
      startRestore
    };
  }

  // src/entries/deploy-lite-ui.ts
  var memory2 = { flow: "source", targets: [], mode: "deploy", batchMode: "sequential", stopOnError: true, lastRun: null };
  var STYLE_ID3 = "kus-deploy-lite-styles";
  var P2 = "#kus-deploy-lite";
  var CSS3 = `
${P2}.kus-lp--wide{width:min(960px,calc(100vw - 32px));max-height:calc(100dvh - 32px);top:16px;right:16px;border-radius:18px;border-color:#cbd5e1}
${P2} .kus-lp__hero{padding:16px 24px}
${P2} .kus-lp__title{font-size:22px;letter-spacing:-.01em;word-break:keep-all}
${P2} .kus-lp__subtitle{font-size:14px;max-width:560px}
${P2} .kus-lp__body{padding:0;background:#f4f6f8;display:flex;flex-direction:column;overflow:hidden}
${P2} .kus-lp__hint{margin:0;padding:11px 24px;border:0;border-bottom:1px solid #e2e8f0;border-radius:0;background:#fff1f2;color:#9f1239}
${P2} .kus-lp__hint strong{color:#881337}
${P2} .kus-lp__card{border-radius:16px;padding:16px 18px;box-shadow:0 1px 2px rgba(15,23,42,.04)}
${P2} .kus-lp__card-head{border:0;margin:0 0 12px;padding:0}
${P2} .kus-lp__card-title{font-size:13px;text-transform:none;letter-spacing:.01em;color:#172033}
${P2} .kus-lp__card-num{background:#881337;color:#fff}
${P2} [hidden]{display:none!important}
${P2} :is(button,input,select,summary):focus-visible{outline:3px solid #2563eb;outline-offset:3px}
${P2} .kus-dp-workspace{display:flex;flex-direction:column;min-height:0;flex:1}
${P2} .kus-dp-canvas{min-width:0;min-height:0;overflow:auto;padding:20px 24px;scroll-padding:16px}
${P2} .kus-dp-nav{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;padding:10px 24px;background:#fff;border-bottom:1px solid #e2e8f0;flex-shrink:0}
${P2} .kus-dp-nav__btn{appearance:none;width:100%;border:1px solid transparent;border-radius:10px;background:transparent;color:#64748b;padding:10px;cursor:pointer;font-family:inherit;font-size:13px;font-weight:700;display:grid;grid-template-columns:24px 1fr;align-items:center;gap:9px;text-align:left}
${P2} .kus-dp-nav__btn:hover{background:#f1f5f9;color:#172033}
${P2} .kus-dp-nav__btn[aria-selected="true"]{background:#fff1f2;color:#881337;border-color:#fecdd3}
${P2} .kus-dp-nav__btn:disabled{opacity:.45;cursor:not-allowed}
${P2} .kus-dp-nav__num{display:inline-flex;width:19px;height:19px;align-items:center;justify-content:center;border-radius:50%;background:#e2e8f0;color:#475569;font-size:11.5px}
${P2} .kus-dp-nav__btn[aria-selected="true"] .kus-dp-nav__num{background:#ffe4e6;color:#881337}
${P2} .kus-dp-nav__copy{display:block;font-size:11px;font-weight:500;color:#94a3b8;margin-top:2px}
${P2} .kus-dp-nav__btn[aria-selected="true"] .kus-dp-nav__copy{color:#64748b}
${P2} .kus-dp-stage[hidden]{display:none}
${P2} .kus-dp-stage-head{margin:0 2px 16px}
${P2} .kus-dp-stage-head h2{margin:0;font-size:20px;letter-spacing:-.02em;color:#0f172a}
${P2} .kus-dp-stage-head p{margin:4px 0 0;font-size:13px;color:#64748b}
${P2} .kus-dp-stage .kus-lp__card:last-child{margin-bottom:0}
${P2} .kus-dp-setup{display:grid;grid-template-columns:minmax(0,1fr);gap:14px}
${P2} .kus-dp-setup>.kus-lp__card{margin:0}
${P2} .kus-dp-count{font-size:12.5px;font-weight:700;color:#475569}
${P2} .kus-dp-count--over{color:#b91c1c}
${P2} .kus-dp-choices{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:8px}
${P2} .kus-dp-choice{padding:12px;border:1px solid #cbd5e1;border-radius:10px;background:#fff;cursor:pointer;display:grid;grid-template-columns:18px 1fr;gap:8px;font-size:13px;min-width:0;align-items:start}
${P2} .kus-dp-choice:has(input:checked){border-color:#be123c;background:#fff1f2}
${P2} .kus-dp-choice:has(input:disabled){opacity:.55;cursor:not-allowed}
${P2} .kus-dp-choice strong{display:block;color:#0f172a}
${P2} .kus-dp-choice small{display:block;margin-top:3px;color:#64748b;line-height:1.5}
${P2} .kus-dp-detail-row{display:flex;flex-wrap:wrap;align-items:center;gap:8px 12px}
${P2} .kus-dp-detail-summary{flex:1 1 220px;min-width:0;overflow-wrap:anywhere;font-size:13px;line-height:1.5;color:#475569}
${P2} .kus-dp-detail-summary--warn{color:#9a3412;font-weight:700}
${P2} .kus-lp__dialog .kus-lp__card--soft{box-shadow:none}
${P2} .kus-dp-next{padding:10px 12px;border-radius:10px;font-size:13px;line-height:1.6;border:1px solid #e2e8f0;background:#fff;overflow-wrap:anywhere}
${P2} .kus-dp-next--ok{background:#ecfdf5;border-color:#a7f3d0;color:#065f46}
${P2} .kus-dp-next--info{background:#eff6ff;border-color:#bfdbfe;color:#1e3a8a}
${P2} .kus-dp-next--warn{background:#fffbeb;border-color:#fde68a;color:#92400e}
${P2} .kus-dp-next--err{background:#fef2f2;border-color:#fecaca;color:#991b1b}
${P2} .kus-dp-quiet{margin:6px 0 0;font-size:13px;color:#64748b;overflow-wrap:anywhere}
${P2} .kus-dp-pills{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 10px}
${P2} .kus-dp-pill{display:inline-flex;align-items:center;gap:4px;padding:3px 8px;border-radius:999px;font-size:12.5px;font-weight:700;border:1px solid #e2e8f0;background:#fff;color:#334155}
${P2} .kus-dp-pill--change{background:#fff7ed;border-color:#fdba74;color:#9a3412}
${P2} .kus-dp-pill--same{background:#ecfdf5;border-color:#a7f3d0;color:#065f46}
${P2} .kus-dp-pill--error{background:#fef2f2;border-color:#fca5a5;color:#991b1b}
${P2} .kus-dp-pill--processing{background:#eff6ff;border-color:#93c5fd;color:#1d4ed8}
${P2} .kus-dp-tools{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}
${P2} .kus-dp-issues{margin:8px 0 0;padding-left:18px;font-size:13px;line-height:1.6;color:#92400e;overflow-wrap:anywhere}
${P2} .kus-dp-table-wrap{border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;background:#fff}
${P2} .kus-dp-table{width:100%;border-collapse:collapse;font-size:13px}
${P2} .kus-dp-table th{padding:7px 10px;text-align:left;font-size:12.5px;font-weight:700;color:#475569;background:#f8fafc;border-bottom:1px solid #e2e8f0;white-space:nowrap}
${P2} .kus-dp-table td{padding:8px 10px;border-top:1px solid #f1f5f9;vertical-align:top;overflow-wrap:anywhere}
${P2} .kus-dp-table td.kus-dp-c-sel{width:34px}
${P2} .kus-dp-table td.kus-dp-c-app{min-width:150px}
${P2} .kus-dp-table td.kus-dp-c-state,${P2} .kus-dp-table td.kus-dp-c-act{white-space:nowrap}
${P2} .kus-dp-table td.kus-dp-c-rev{min-width:130px}
${P2} .kus-dp-table td.kus-dp-c-act .kus-lp__btn{padding:4px 8px;white-space:nowrap}
${P2} .kus-dp-pill{white-space:nowrap}
${P2} .kus-dp-table tr.kus-dp-row--error td{background:#fff5f5}
${P2} .kus-dp-table tr.kus-dp-row--processing td{background:#eff6ff}
${P2} .kus-dp-table tr.kus-dp-row--clean td{color:#64748b}
${P2} .kus-dp-table tr.kus-dp-detail-tr>td{padding:0 10px 10px;background:#fff}
${P2} .kus-dp-app-name{font-weight:700;color:#0f172a}
${P2} .kus-dp-app-id{display:block;font-size:12px;color:#64748b}
${P2} .kus-dp-app-error{display:block;margin-top:4px;font-size:12.5px;color:#991b1b;white-space:pre-wrap}
${P2} .kus-dp-app-sub{display:block;margin-top:4px;font-size:12.5px;color:#475569}
${P2} .kus-dp-del{font-variant-numeric:tabular-nums}
${P2} .kus-dp-del--has{color:#b91c1c;font-weight:700}
${P2} .kus-dp-more{margin-top:8px}
${P2} .kus-dp-detail{display:flex;flex-direction:column;gap:8px;padding-top:6px}
${P2} .kus-dp-detail h4{margin:4px 0 0;font-size:13px;color:#0f172a}
${P2} .kus-dp-danger{padding:10px 12px;border:1px solid #fca5a5;border-radius:10px;background:#fef2f2;color:#991b1b;font-size:13px;line-height:1.6;overflow-wrap:anywhere}
${P2} .kus-dp-danger strong{display:block;margin-bottom:2px}
${P2} .kus-dp-danger ul{margin:4px 0 0;padding-left:18px}
${P2} .kus-dp-danger small{display:block;color:#7f1d1d}
${P2} .kus-dp-info{padding:8px 12px;border:1px solid #bfdbfe;border-radius:10px;background:#eff6ff;color:#1e3a8a;font-size:13px;line-height:1.55;overflow-wrap:anywhere}
${P2} .kus-dp-warn{padding:8px 12px;border:1px solid #fde68a;border-radius:10px;background:#fffbeb;color:#92400e;font-size:13px;line-height:1.55;overflow-wrap:anywhere}
${P2} .kus-dp-facts{margin:0;display:grid;gap:8px}
${P2} .kus-dp-fact{padding:10px 12px;border:1px solid #e2e8f0;border-radius:10px;background:#fff;overflow-wrap:anywhere}
${P2} .kus-dp-fact dt{margin:0 0 4px;font-size:12.5px;font-weight:700;color:#64748b}
${P2} .kus-dp-fact dd{margin:0;font-size:14px;line-height:1.6;color:#0f172a}
${P2} .kus-dp-fact--direction{border:2px solid #be123c;background:#fff1f2}
${P2} .kus-dp-fact--danger{border-color:#fca5a5;background:#fef2f2}
${P2} .kus-dp-fact--danger dd{color:#991b1b}
${P2} .kus-dp-targets{margin:6px 0 0;white-space:pre-wrap;overflow-wrap:anywhere;font:13px/1.6 inherit;color:#334155}
${P2} .kus-dp-confirm-input{margin-top:12px;display:flex;flex-direction:column;gap:8px}
${P2} .kus-dp-confirm-input label.kus-dp-confirm-label{font-size:13px;font-weight:700;color:#0f172a}
${P2} .kus-dp-confirm-input .kus-lp__input{width:100%;max-width:260px;box-sizing:border-box;min-height:40px;font-size:14px}
${P2} .kus-dp-progress__summary{margin:0 0 6px;font-size:13px;font-weight:700;color:#334155}
${P2} .kus-dp-progress__omitted{margin:0 0 6px;font-size:12.5px;color:#64748b}
${P2} .kus-dp-result-list{list-style:none;margin:6px 0 0;padding:0;display:flex;flex-direction:column;gap:6px}
${P2} .kus-dp-result-item{min-width:0;padding:8px 10px;border:1px solid #e2e8f0;border-radius:10px;background:#fff;overflow-wrap:anywhere}
${P2} .kus-dp-result-item--ok{border-color:#a7f3d0}
${P2} .kus-dp-result-item--ng{border-color:#fca5a5;background:#fff5f5}
${P2} .kus-dp-result-item--warn{border-color:#fcd34d;background:#fffbeb}
${P2} .kus-dp-result-item--pending{border-color:#e2e8f0;background:#f8fafc}
${P2} .kus-dp-result-item--run{border-color:#93c5fd;background:#eff6ff}
${P2} .kus-dp-result-item__head{display:flex;flex-wrap:wrap;align-items:center;gap:4px 8px;font-size:13px}
${P2} .kus-dp-result-state{display:inline-flex;align-items:center;gap:4px;padding:1px 8px;border:1px solid #cbd5e1;border-radius:999px;background:#f8fafc;font-size:12.5px;font-weight:700;color:#475569}
${P2} .kus-dp-result-state--ok{border-color:#a7f3d0;background:#ecfdf5;color:#065f46}
${P2} .kus-dp-result-state--ng{border-color:#fca5a5;background:#fef2f2;color:#991b1b}
${P2} .kus-dp-result-state--warn{border-color:#fcd34d;background:#fffbeb;color:#92400e}
${P2} .kus-dp-result-state--run{border-color:#93c5fd;background:#dbeafe;color:#1e40af}
${P2} .kus-dp-result-item__message{margin-top:6px;font-size:13px;line-height:1.6;color:#334155;white-space:pre-wrap;overflow-wrap:anywhere}
${P2} .kus-dp-result-item__meta{margin-top:4px;font-size:12.5px;color:#64748b}
${P2} .kus-dp-result-item__meta--warn{color:#9a3412;font-weight:700}
${P2} .kus-dp-result-head{font-size:14px;font-weight:700;margin:0 0 8px;overflow-wrap:anywhere}
${P2} .kus-dp-result-notes{display:flex;flex-direction:column;gap:8px;margin:8px 0}
${P2} .kus-dp-empty{padding:14px 12px;border:1px dashed #cbd5e1;border-radius:10px;background:#f8fafc;font-size:13px;color:#64748b}
${P2} .kus-dp-action-dock{flex-shrink:0;padding:12px 24px;background:#fff;border-top:1px solid #e2e8f0}
${P2} .kus-dp-dock-row{display:flex;align-items:center;gap:10px}
${P2} .kus-dp-dock-copy{flex:1;min-width:0;font-size:13px;color:#475569;overflow-wrap:anywhere}
${P2} .kus-dp-dock-copy strong{display:block;color:#0f172a}
${P2} .kus-dp-dock-msg{display:block}
${P2} .kus-dp-dock-reason{color:#9a3412;font-weight:600}
${P2} .kus-dp-dock-actions{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end}
${P2} .kus-dp-dock-actions .kus-lp__btn{min-height:42px}
${P2} .kus-dp-action-dock .kus-lp__result{max-height:80px;overflow:auto}
${P2} .kus-dp-action-dock .kus-lp__status-text{max-height:48px;overflow:auto}
${P2} .kus-dp-action-dock .kus-lp__status{margin-top:8px}
${P2} .kus-rl-items{margin:4px 0;padding:10px 12px;border:1px solid #e2e8f0;border-radius:10px;background:#fff}
${P2} .kus-rl-items__title{display:flex;flex-wrap:wrap;align-items:baseline;gap:2px 10px;margin-bottom:8px;font-size:13px;color:#475569}
${P2} .kus-rl-items__title strong{font-size:13px;color:#0f172a}
${P2} .kus-rl-items__list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:7px}
${P2} .kus-rl-item{display:grid;grid-template-columns:auto minmax(0,1fr);column-gap:8px;row-gap:2px;align-items:baseline;font-size:13px;line-height:1.55;overflow-wrap:anywhere}
${P2} .kus-rl-item__name{min-width:0;font-weight:700;color:#0f172a}
${P2} .kus-rl-item__details{grid-column:2;margin:0;padding-left:16px;font-size:13px;color:#475569}
${P2} .kus-rl-item--keep .kus-rl-item__name{font-weight:600;color:#475569}
${P2} .kus-rl-kind{display:inline-block;min-width:36px;padding:0 6px;border:1px solid #cbd5e1;border-radius:4px;background:#f1f5f9;color:#475569;font-size:12px;font-weight:800;line-height:18px;letter-spacing:.04em;text-align:center}
${P2} .kus-rl-kind--delete{border-color:#fca5a5;background:#fef2f2;color:#991b1b}
${P2} .kus-rl-kind--change{border-color:#fdba74;background:#fff7ed;color:#9a3412}
${P2} .kus-rl-kind--add{border-color:#86efac;background:#f0fdf4;color:#166534}
${P2} .kus-rl-items--quiet{padding:0 12px;border-style:dashed;background:#f8fafc}
${P2} .kus-rl-items--quiet>summary{cursor:pointer;padding:8px 0;font-size:13px;font-weight:700;color:#64748b}
${P2} .kus-rl-items__more{margin-top:8px}
@media(max-width:760px){
  ${P2} .kus-dp-table,${P2} .kus-dp-table tbody{display:block}
  ${P2} .kus-dp-table thead{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
  ${P2} .kus-dp-table tr.kus-dp-row{display:grid;grid-template-columns:28px minmax(0,1fr) auto;gap:4px 8px;padding:10px 12px;border-top:1px solid #e2e8f0}
  ${P2} .kus-dp-table tr.kus-dp-row:first-child{border-top:0}
  ${P2} .kus-dp-table tr.kus-dp-row>td{display:block;padding:0;border:0;min-width:0;background:transparent!important}
  ${P2} .kus-dp-table td.kus-dp-c-sel{grid-column:1;grid-row:1;width:auto}
  ${P2} .kus-dp-table td.kus-dp-c-app,${P2} .kus-dp-table td.kus-dp-c-rev{min-width:0}
  ${P2} .kus-dp-table td.kus-dp-c-app{grid-column:2;grid-row:1}
  ${P2} .kus-dp-table td.kus-dp-c-state{grid-column:3;grid-row:1;justify-self:end}
  ${P2} .kus-dp-table td.kus-dp-c-items,${P2} .kus-dp-table td.kus-dp-c-del,${P2} .kus-dp-table td.kus-dp-c-rev,${P2} .kus-dp-table td.kus-dp-c-act{grid-column:2/-1}
  ${P2} .kus-dp-table td.kus-dp-c-items::before,${P2} .kus-dp-table td.kus-dp-c-del::before,${P2} .kus-dp-table td.kus-dp-c-rev::before{content:attr(data-label) "：";font-size:12px;font-weight:700;color:#64748b}
  ${P2} .kus-dp-table tr.kus-dp-row.kus-dp-row--error{background:#fff5f5}
  ${P2} .kus-dp-table tr.kus-dp-row.kus-dp-row--processing{background:#eff6ff}
  ${P2} .kus-dp-table tr.kus-dp-detail-tr{display:block}
  ${P2} .kus-dp-table tr.kus-dp-detail-tr>td{display:block}
}
@media(max-width:720px){
  ${P2}.kus-lp--wide{width:calc(100vw - 16px);right:8px;top:8px;max-height:calc(100dvh - 16px)}
  ${P2} .kus-lp__hero{padding:12px 16px}
  ${P2} .kus-lp__hint{display:none}
  ${P2} .kus-dp-nav{padding:8px;gap:4px}
  ${P2} .kus-dp-nav__copy,${P2} .kus-dp-nav__num{display:none}
  ${P2} .kus-dp-nav__btn{display:flex;justify-content:center;text-align:center;padding:8px 4px;font-size:12.5px}
  ${P2} .kus-dp-canvas{padding:18px 16px 8px}
  ${P2} .kus-dp-action-dock{padding:12px 16px 15px}
  ${P2} .kus-dp-dock-row{align-items:stretch;flex-direction:column;gap:8px}
  ${P2} .kus-dp-dock-actions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px}
  ${P2} .kus-dp-dock-actions .kus-lp__btn{min-width:0;white-space:normal}
  ${P2} .kus-dp-dock-actions .kus-lp__btn--danger,${P2} .kus-dp-dock-actions .kus-lp__btn--primary{grid-column:1/-1}
  ${P2} .kus-lp__card{padding:12px}
  ${P2} .kus-lp__card-head{flex-wrap:wrap}
  ${P2} .kus-lp__select{min-width:0!important;max-width:100%}
}
@media(max-width:400px){${P2} .kus-lp__elapsed{display:none}}
@media(max-height:720px){
  ${P2} .kus-lp__hero{padding:8px 16px}
  ${P2} .kus-lp__title{font-size:17px}
  ${P2} .kus-lp__subtitle{display:none}
  ${P2} .kus-dp-nav{padding:6px 12px}
  ${P2} .kus-dp-nav__btn{padding:6px 4px}
  ${P2} .kus-dp-nav__copy{display:none}
  ${P2} .kus-dp-canvas{padding:12px 16px 8px}
  ${P2} .kus-dp-stage-head{margin-bottom:10px}
  ${P2} .kus-dp-stage-head h2{font-size:17px}
  ${P2} .kus-dp-stage-head p{display:none}
  ${P2} .kus-dp-action-dock{padding:8px 16px 10px}
  ${P2} .kus-dp-dock-row{gap:6px}
  ${P2} .kus-dp-dock-copy{font-size:12.5px;line-height:1.4}
  ${P2} .kus-dp-dock-copy strong,${P2} .kus-dp-dock-msg{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden}
  ${P2} .kus-dp-dock-actions{gap:4px 6px}
  ${P2} .kus-dp-dock-actions .kus-lp__btn{min-height:36px;padding:6px 10px}
  ${P2} .kus-dp-action-dock .kus-lp__status{margin-top:6px;padding:6px 10px;min-height:0;line-height:1.4}
  ${P2} .kus-dp-action-dock .kus-lp__status-text{max-height:2.9em}
  ${P2} .kus-dp-action-dock .kus-lp__result{max-height:48px}
}
@media(prefers-reduced-motion:reduce){${P2}{animation:none}${P2} *{scroll-behavior:auto!important}}
`;
  function ensureStyles2() {
    if (document.getElementById(STYLE_ID3)) return;
    const st = document.createElement("style");
    st.id = STYLE_ID3;
    st.textContent = CSS3;
    document.head.appendChild(st);
  }
  var FLOW_SUBTITLES = {
    source: "反映元アプリとの差分を選んで、反映先のプレビューへ書き込み、続けて本番へ反映します。",
    publish: "プレビューの未公開の変更を確認してから、本番へ反映します。"
  };
  function renderAppDetail(host, app, mode) {
    host.replaceChildren();
    const body = el("div", "kus-dp-detail");
    const text = deployModeText(mode);
    if (app.contentSame) {
      body.appendChild(el("div", "kus-dp-info", "設定の内容は同じです（revision だけが異なります）。"));
    }
    const removed = app.removedFields || [];
    if (removed.length && mode === "deploy") {
      const box = el("div", "kus-dp-danger");
      box.dataset.deployRemovedFields = String(removed.length);
      box.appendChild(el("strong", "", `削除されるフィールド（${removed.length} 件）`));
      box.appendChild(document.createTextNode("本番へ反映すると、このフィールドのレコードの値も削除され、元に戻せません。"));
      const ul = el("ul");
      for (const field of removed) {
        const li = el("li");
        li.textContent = describeRemovedField(field);
        if (field.possibleRename) {
          const sub = el("small", "", `フィールドコードを変えただけなら値は残る可能性があります（プレビューの『${field.possibleRename}』）`);
          li.appendChild(sub);
        }
        ul.appendChild(li);
      }
      box.appendChild(ul);
      body.appendChild(box);
    } else if (removed.length) {
      body.appendChild(el("div", "kus-dp-info", `プレビューで削除されたフィールド（${removed.length} 件）は、変更を中止すると本番の状態に戻ります。`));
    }
    for (const warning of app.warnings || []) body.appendChild(el("div", "kus-dp-warn", warning));
    const changed = (app.sections || []).filter((section) => section.status === "change");
    for (const section of app.sections || []) {
      if (section.status === "error") {
        body.appendChild(el("div", "kus-dp-warn", `${section.label}: 取得失敗${section.message ? `（${firstLines(section.message, 2)}）` : ""}`));
      }
    }
    for (const section of changed) {
      const block = el("section");
      block.dataset.deploySection = section.sectionKey;
      const counts = section.counts;
      block.appendChild(el("h4", "", `${section.label}（追加 ${counts.added}・変更 ${counts.changed}・削除 ${counts.removed}）`));
      if (section.items?.length) {
        appendReflectItems(block, { label: section.label, items: section.items, sectionKey: section.sectionKey });
        const title = block.querySelector(".kus-rl-items__title strong");
        if (title) title.textContent = text.changesHeading;
      } else {
        block.appendChild(el("div", "kus-dp-quiet", `変更 ${counts.added + counts.changed + counts.removed} 件（要約を作成できませんでした）`));
      }
      body.appendChild(block);
    }
    const same4 = (app.sections || []).filter((section) => section.status === "same").map((section) => section.label);
    if (same4.length) body.appendChild(el("div", "kus-dp-quiet", `変更のない項目: ${same4.join("、")}`));
    if (!changed.length && !removed.length && !(app.warnings || []).length && !app.contentSame) {
      body.appendChild(el("div", "kus-dp-quiet", "変更の要約はありません。"));
    }
    host.appendChild(body);
  }
  function mountDeployLitePanel() {
    const running = document.getElementById("kus-deploy-lite");
    if (running?.getAttribute("aria-busy") === "true") {
      running.setAttribute("tabindex", "-1");
      running.focus({ preventScroll: true });
      return;
    }
    ensureStyles2();
    const panel = createLitePanel({
      id: "kus-deploy-lite",
      title: "本番反映",
      subtitle: FLOW_SUBTITLES[memory2.flow],
      accent: "deploy",
      badges: [{ label: "本番の設定を変更", tone: "production" }],
      hint: "<strong>本番のアプリ設定を変更します。</strong>反映前に差分と削除される設定を確認し、反映前の設定をバックアップしてから実行します。",
      wide: true
    });
    const runLite = (busyMsg, fn, okMsg) => liteRun(panel, busyMsg, async () => {
      panel.setResult("");
      return fn();
    }, okMsg);
    let busy = false;
    let ready = false;
    let activeStage = "setup";
    let inspection = null;
    let selected = /* @__PURE__ */ new Set();
    let confirmedToken = "";
    let progressView = null;
    let reviewShown = 200;
    let runningMode = memory2.mode;
    let showStage = () => {
    };
    let refreshWorkflow = () => {
    };
    const pageGuest = () => guestIdFromPagePath(window.location?.pathname || "");
    const currentMode = () => modeRadios.revert.checked ? "revert" : "deploy";
    const currentBatchMode = () => batchRadios.atomic.checked ? "atomic" : "sequential";
    const currentStopOnError = () => !continueRadio.checked || currentBatchMode() === "atomic";
    const cardApps = makeCard({ title: "対象アプリ", number: 1 });
    const countLabel = el("span", "kus-dp-count");
    cardApps.actions.appendChild(countLabel);
    const appTable = makeAppTable({
      minRows: 1,
      currentAppId: DEFAULT_APP_ID,
      currentGuestId: pageGuest(),
      initial: memory2.targets,
      onChange: () => {
        if (ready) onInputsChanged();
      }
    });
    cardApps.body.appendChild(appTable.element);
    cardApps.body.appendChild(createAppSearchControl(panel, {
      targets: [{
        label: "対象アプリ",
        apply: (id, name, guestId) => {
          const result = appTable.putApp(id, guestId || "", { appName: name });
          return {
            message: `App ${id}${name ? `「${name}」` : ""} を対象アプリに${result.action === "existing" ? "追加済みです" : "追加しました"}（現在 ${appTable.count()} 件）`,
            pickedLabel: result.action === "existing" ? "追加済み" : "対象アプリに追加済み"
          };
        },
        applyAll: (apps, guestId) => {
          const result = appTable.putApps(apps.map((app) => ({ appId: app.appId, guestId, appName: app.appName })));
          const parts = [`新規 ${result.added + result.filled} 件`];
          if (result.existing) parts.push(`追加済み ${result.existing} 件`);
          if (result.ignored) parts.push(`IDなしで無視 ${result.ignored} 件`);
          return {
            message: `候補 ${apps.length} 件を対象アプリに追加しました（${parts.join(" / ")}。表は合計 ${appTable.count()} 件）。`,
            tone: result.ignored ? "warn" : "ok",
            pickedLabel: `${apps.length} 件を追加済み`
          };
        },
        applyAllLabel: (count) => `候補 ${count} 件をすべて対象アプリに追加`
      }]
    }));
    cardApps.body.appendChild(makeNote(`対象アプリは最大 ${DEPLOY_TARGET_LIMIT} 件です。アプリごとにゲストスペースを指定できます。「アプリを検索」の「環境内の全アプリ」から、環境内のアプリをまとめて追加できます。`, "help"));
    const cardOp = makeCard({ title: "操作", number: 2 });
    function makeChoice(name, value, title, description, checked) {
      const label = el("label", "kus-dp-choice");
      const input = document.createElement("input");
      input.type = "radio";
      input.name = name;
      input.value = value;
      input.checked = checked;
      input.setAttribute("aria-label", title);
      const copy = el("span");
      copy.append(el("strong", "", title), el("small", "", description));
      label.append(input, copy);
      return { label, input };
    }
    const opGroup = el("div", "kus-dp-choices");
    opGroup.setAttribute("role", "radiogroup");
    opGroup.setAttribute("aria-label", "操作");
    const modeId = `${panel.root.id}-mode`;
    const deployChoice = makeChoice(modeId, "deploy", deployModeText("deploy").label, deployModeText("deploy").description, memory2.mode !== "revert");
    const revertChoice = makeChoice(modeId, "revert", deployModeText("revert").label, deployModeText("revert").description, memory2.mode === "revert");
    const modeRadios = { deploy: deployChoice.input, revert: revertChoice.input };
    opGroup.append(deployChoice.label, revertChoice.label);
    cardOp.body.appendChild(opGroup);
    cardOp.body.appendChild(makeNote("「本番へ反映」は kintone の「アプリを更新」、「変更を中止」は「変更を中止」と同じ操作です。変更を中止しても本番の設定は変わりません。どちらも、実行前に本番とプレビューの差分を確認します。", "help"));
    const detail = makeDialog({ title: "詳細設定", id: "kus-dp-detail" });
    const cardBatch = makeCard({ title: "反映の方法", soft: true });
    const batchId = `${panel.root.id}-batch`;
    const seqChoice = makeChoice(batchId, "sequential", "1アプリずつ反映（既定）", "1アプリずつ依頼し、完了を確認してから次へ進みます。", memory2.batchMode !== "atomic");
    const atomicChoice = makeChoice(batchId, "atomic", "まとめて反映", `すべて成功したときだけ本番へ反映します。最大 ${DEPLOY_ATOMIC_LIMIT} 件・同じゲストスペース。`, memory2.batchMode === "atomic");
    const batchRadios = { sequential: seqChoice.input, atomic: atomicChoice.input };
    const batchGroup = el("div", "kus-dp-choices");
    batchGroup.setAttribute("role", "radiogroup");
    batchGroup.setAttribute("aria-label", "反映の方法");
    batchGroup.append(seqChoice.label, atomicChoice.label);
    cardBatch.body.append(batchGroup, makeNote("まとめて反映は、1回の依頼にまとめます。kintone は1件でも失敗するとすべて取り消すため、本番が中途半端な状態になりません。", "help"));
    const cardStop = makeCard({ title: "失敗したとき", soft: true });
    const stopId = `${panel.root.id}-stop`;
    const stopChoice = makeChoice(stopId, "stop", "残りを実行しない（既定）", "失敗・確認後の更新・完了を確認できないアプリが出たら、残りは未実行にします。", memory2.stopOnError);
    const continueChoice = makeChoice(stopId, "continue", "残りも続ける", "失敗したアプリがあっても、残りのアプリを続けます。", !memory2.stopOnError);
    const continueRadio = continueChoice.input;
    const stopGroup = el("div", "kus-dp-choices");
    stopGroup.setAttribute("role", "radiogroup");
    stopGroup.setAttribute("aria-label", "失敗したとき");
    stopGroup.append(stopChoice.label, continueChoice.label);
    cardStop.body.append(stopGroup, makeNote("1アプリずつ反映するときだけ選べます。まとめて反映では、1件でも失敗するとすべて取り消されます。", "help"));
    detail.body.append(cardBatch.card, cardStop.card);
    attachCardHelp(detail.body);
    panel.root.appendChild(detail.dialog);
    const detailBtn = makeButton("詳細設定…", "sub");
    detailBtn.setAttribute("aria-haspopup", "dialog");
    detailBtn.addEventListener("click", () => detail.open());
    const detailSummary = el("span", "kus-dp-detail-summary");
    const detailRow = el("div", "kus-dp-detail-row");
    detailRow.append(detailBtn, detailSummary);
    function refreshDetailSummary() {
      const atomic = currentBatchMode() === "atomic";
      stopChoice.input.disabled = atomic;
      continueChoice.input.disabled = atomic;
      const summary = describeDeployOptions(currentBatchMode(), currentStopOnError());
      detailSummary.textContent = summary.text;
      detailSummary.classList.toggle("kus-dp-detail-summary--warn", summary.warn);
    }
    function currentTargets() {
      return appTable.getApps().map((app) => ({ appId: app.appId, guestId: app.guestId, ...app.appName ? { name: app.appName } : {} }));
    }
    function currentSignature() {
      return JSON.stringify([currentMode(), currentBatchMode(), currentStopOnError(), currentTargets().map((app) => [app.guestId, app.appId])]);
    }
    const isFresh = () => !!inspection && inspection.signature === currentSignature();
    function setupBlocker() {
      const targets = currentTargets();
      try {
        const message = validateDeployTargets(targets, currentBatchMode());
        if (message) return message;
      } catch (error) {
        return `対象アプリを確認できません（${String(error?.message || error)}）`;
      }
      if (targets.length > DEPLOY_TARGET_LIMIT) return `対象アプリは最大 ${DEPLOY_TARGET_LIMIT} 件です（現在 ${targets.length} 件）。表から減らしてください。`;
      return "";
    }
    function onInputsChanged() {
      memory2.targets = appTable.getAllRows().map((row) => ({ ...row }));
      memory2.mode = currentMode();
      memory2.batchMode = currentBatchMode();
      memory2.stopOnError = currentStopOnError();
      const count = appTable.count();
      countLabel.textContent = `${count} アプリ（最大 ${DEPLOY_TARGET_LIMIT}）`;
      countLabel.classList.toggle("kus-dp-count--over", count > DEPLOY_TARGET_LIMIT);
      refreshDetailSummary();
      if (confirmedToken && confirmedToken !== confirmationToken()) clearConfirmation();
      if (ready) refreshReview();
      refreshWorkflow();
    }
    for (const input of [modeRadios.deploy, modeRadios.revert, batchRadios.sequential, batchRadios.atomic, stopChoice.input, continueChoice.input]) {
      input.addEventListener("change", onInputsChanged);
    }
    const setupStage = el("div", "kus-dp-setup");
    setupStage.append(cardApps.card, cardOp.card, detailRow);
    const reviewCard = makeCard({ title: "確認の結果" });
    const reviewBody = el("div");
    reviewCard.body.appendChild(reviewBody);
    const pillsEl = el("div", "kus-dp-pills");
    const infoEl = el("div", "kus-dp-next kus-dp-next--info");
    const issuesEl = el("ul", "kus-dp-issues");
    reviewBody.append(pillsEl, infoEl, issuesEl);
    const recheckProblemsBtn = makeButton("取得失敗・処理中だけ確認し直す", "sub");
    const recheckAllBtn = makeButton("確認し直す", "sub");
    const savePlanBtn = makeButton("計画をMarkdownで保存", "sub");
    const copyPlanBtn = makeButton("計画のMarkdownをコピー", "sub");
    const toolsEl = el("div", "kus-dp-tools");
    toolsEl.append(recheckProblemsBtn, recheckAllBtn, savePlanBtn, copyPlanBtn);
    reviewBody.appendChild(toolsEl);
    reviewBody.appendChild(makeNote("変更の要約は、本番を基準にしたときの追加・変更・削除です。「変更を中止」を選んだときは、プレビューで加えた未公開の変更が「破棄される変更」になります。取得失敗や反映処理中のアプリは、確認し直すか対象から外すまで次へ進めません。", "help"));
    const listCard = makeCard({ title: "アプリ別の変更" });
    const selectChangedBtn = makeButton("変更ありをすべて選択", "ghost");
    const clearSelectionBtn = makeButton("選択を解除", "ghost");
    listCard.actions.append(selectChangedBtn, clearSelectionBtn);
    const tableWrap = el("div", "kus-dp-table-wrap");
    const table = el("table", "kus-dp-table");
    table.innerHTML = '<thead><tr><th scope="col">選択</th><th scope="col">アプリ</th><th scope="col">状態</th><th scope="col">変更のある項目</th><th scope="col">削除</th><th scope="col">revision</th><th scope="col">詳細</th></tr></thead>';
    const tbody = el("tbody");
    table.appendChild(tbody);
    tableWrap.appendChild(table);
    const moreRowsBtn = makeButton("さらに表示", "sub");
    moreRowsBtn.classList.add("kus-dp-more");
    const reviewEmpty = el("div", "kus-dp-empty", "対象アプリを選び、未公開の変更を確認してください。");
    listCard.body.append(reviewEmpty, tableWrap, moreRowsBtn);
    function modeForInspection() {
      return currentMode();
    }
    function appendReviewRow(app) {
      const key = deployAppKey(app);
      const mode = modeForInspection();
      const tr = el("tr", `kus-dp-row kus-dp-row--${app.state}`);
      tr.dataset.deployApp = app.appId;
      tr.dataset.deployGuest = app.guestId;
      tr.dataset.deployState = app.state;
      const selectable = isSelectableInspection(app);
      const tdSel = el("td", "kus-dp-c-sel");
      const check = document.createElement("input");
      check.type = "checkbox";
      check.checked = selectable && selected.has(key);
      check.disabled = !selectable;
      check.setAttribute("aria-label", `${formatDeployApp(app)}を対象にする`);
      check.title = selectable ? "" : "未公開の変更がないため、反映は不要です";
      check.addEventListener("change", () => {
        if (check.checked) selected.add(key);
        else selected.delete(key);
        refreshReview();
      });
      tdSel.appendChild(check);
      const tdApp = el("td", "kus-dp-c-app");
      tdApp.appendChild(el("span", "kus-dp-app-name", app.name || `App ${app.appId}`));
      tdApp.appendChild(el("span", "kus-dp-app-id", `#${app.appId}${app.guestId ? ` / ゲストスペース ${app.guestId}` : ""}`));
      if (app.state === "error" || app.state === "processing") {
        if (app.error) tdApp.appendChild(el("span", "kus-dp-app-error", firstLines(app.error, 4)));
        const drop = makeButton("対象から外す", "ghost");
        drop.addEventListener("click", () => removeFromTargets([key]));
        tdApp.appendChild(drop);
      }
      const tdState = el("td", "kus-dp-c-state");
      const pillClass = app.state === "changes" ? "change" : app.state === "clean" ? "same" : app.state;
      tdState.appendChild(el("span", `kus-dp-pill kus-dp-pill--${pillClass}`, inspectStateLabel(app.state)));
      const tdItems = el("td", "kus-dp-c-items");
      tdItems.dataset.label = "変更のある項目";
      const labels = changedSectionLabels(app);
      tdItems.textContent = labels.length ? labels.join("、") : "－";
      if (app.contentSame) tdItems.appendChild(el("span", "kus-dp-app-sub", "設定の内容は同じです（revision だけが異なります）"));
      const tdDel = el("td", "kus-dp-c-del");
      tdDel.dataset.label = "削除";
      const removedCount = removedSettingCount(app);
      const removedFields = mode === "deploy" ? (app.removedFields || []).length : 0;
      tdDel.className = `kus-dp-c-del kus-dp-del${removedCount || removedFields ? " kus-dp-del--has" : ""}`;
      tdDel.textContent = app.state === "changes" ? `${removedCount} 件${removedFields ? ` / フィールド ${removedFields} 件（値も削除）` : ""}` : "－";
      const tdRev = el("td", "kus-dp-c-rev");
      tdRev.dataset.label = "revision";
      tdRev.textContent = app.productionRevision || app.previewRevision ? formatRevisionPair(app) : "－";
      const tdAct = el("td", "kus-dp-c-act");
      tr.append(tdSel, tdApp, tdState, tdItems, tdDel, tdRev, tdAct);
      tbody.appendChild(tr);
      if (app.state === "changes") {
        const toggle = makeButton("詳細を表示", "ghost");
        toggle.setAttribute("aria-expanded", "false");
        const detailTr = el("tr", "kus-dp-detail-tr");
        detailTr.hidden = true;
        const detailTd = el("td");
        detailTd.colSpan = 7;
        detailTr.appendChild(detailTd);
        let rendered = false;
        toggle.addEventListener("click", () => {
          const open = detailTr.hidden;
          detailTr.hidden = !open;
          toggle.setAttribute("aria-expanded", String(open));
          setButtonText(toggle, open ? "詳細を閉じる" : "詳細を表示");
          if (open && !rendered) {
            rendered = true;
            renderAppDetail(detailTd, app, modeForInspection());
          }
        });
        tdAct.appendChild(toggle);
        tbody.appendChild(detailTr);
      }
    }
    function renderReviewTable() {
      tbody.replaceChildren();
      const apps = inspection ? sortInspectionsForReview(inspection.apps) : [];
      for (const app of apps.slice(0, reviewShown)) appendReviewRow(app);
      const rest = apps.length - reviewShown;
      moreRowsBtn.hidden = rest <= 0;
      if (rest > 0) setButtonText(moreRowsBtn, `さらに表示（残り ${rest} アプリ）`);
      tableWrap.hidden = !apps.length;
      reviewEmpty.hidden = !!apps.length;
    }
    moreRowsBtn.addEventListener("click", () => {
      reviewShown += 200;
      renderReviewTable();
    });
    function selectedApps() {
      return inspection ? inspection.apps.filter((app) => app.state === "changes" && selected.has(deployAppKey(app))) : [];
    }
    function refreshReview() {
      const fresh = isFresh();
      const apps = inspection?.apps || [];
      const mode = currentMode();
      pillsEl.replaceChildren();
      toolsEl.hidden = !inspection;
      const counts = countInspectStates(apps);
      if (inspection) {
        pillsEl.append(
          el("span", "kus-dp-pill kus-dp-pill--change", `変更あり ${counts.changes}`),
          el("span", "kus-dp-pill kus-dp-pill--same", `未公開の変更なし ${counts.clean}`),
          el("span", "kus-dp-pill kus-dp-pill--error", `取得失敗 ${counts.error}`),
          el("span", "kus-dp-pill kus-dp-pill--processing", `反映処理中 ${counts.processing}`)
        );
      }
      const blockers = fresh ? selectionBlockers(apps, selected, mode) : [];
      const summary = summarizeSelection(apps, selected);
      let message = "対象を指定して、未公開の変更を確認してください。";
      let tone = "info";
      if (inspection && !fresh) {
        message = "条件が変わりました。未公開の変更を確認し直してください。";
        tone = "warn";
      } else if (inspection) {
        message = describeInspectSummary(counts);
        if (blockers.length) tone = "warn";
        else if (counts.changes === 0) {
          message = "未公開の変更があるアプリはありません。反映は不要です。";
          tone = "info";
        } else {
          message += `選択中 ${summary.runnable} アプリを${mode === "revert" ? "変更の中止" : "本番への反映"}の対象にします。`;
          tone = "ok";
        }
      }
      infoEl.className = `kus-dp-next kus-dp-next--${tone}`;
      infoEl.textContent = message;
      infoEl.hidden = !inspection && activeStage !== "review";
      issuesEl.replaceChildren(...(fresh ? blockers : []).map((text) => el("li", "", text)));
      issuesEl.hidden = !fresh || !blockers.length;
      recheckProblemsBtn.hidden = !fresh || counts.error + counts.processing === 0;
      recheckAllBtn.disabled = busy || !inspection || !!setupBlocker();
      recheckProblemsBtn.disabled = busy;
      savePlanBtn.disabled = busy || !fresh || !inspection;
      copyPlanBtn.disabled = busy || !fresh || !inspection;
      selectChangedBtn.disabled = busy || !fresh;
      clearSelectionBtn.disabled = busy || !fresh;
      confirmBtn.disabled = busy || !fresh || !!blockers.length || !summary.runnable;
      setButtonText(runBtn, deployRunLabel(mode, summary.runnable));
      runBtn.disabled = busy || !confirmationReady();
      refreshWorkflow();
    }
    selectChangedBtn.addEventListener("click", () => {
      if (!inspection) return;
      for (const app of inspection.apps) if (app.state === "changes") selected.add(deployAppKey(app));
      renderReviewTable();
      refreshReview();
    });
    clearSelectionBtn.addEventListener("click", () => {
      selected = /* @__PURE__ */ new Set();
      renderReviewTable();
      refreshReview();
    });
    function removeFromTargets(keys) {
      if (!inspection || busy) return;
      const drop = new Set(keys);
      const remaining = appTable.getApps().filter((app) => !drop.has(deployAppKey(app)));
      ready = false;
      appTable.setApps(remaining);
      ready = true;
      inspection.apps = inspection.apps.filter((app) => !drop.has(deployAppKey(app)));
      for (const key of drop) selected.delete(key);
      inspection.signature = currentSignature();
      onInputsChanged();
      renderReviewTable();
      refreshReview();
      panel.setStatus(`${keys.length} アプリを対象から外しました。`, "info");
    }
    function planMarkdown() {
      return buildDeployPlanMarkdown({
        generatedAt: inspection ? inspection.inspectedAt : (/* @__PURE__ */ new Date()).toISOString(),
        mode: currentMode(),
        batchMode: currentBatchMode(),
        stopOnError: currentStopOnError(),
        apps: inspection?.apps || [],
        selectedKeys: selected
      });
    }
    function exportFilename(base, ext, apps) {
      const appLabel = apps.length === 1 ? buildAppFilenameLabel(apps[0].appId, apps[0].name || "") : "";
      return buildExportFilename(base, ext, { appLabel });
    }
    savePlanBtn.addEventListener("click", () => {
      if (!inspection || !isFresh()) return;
      const mode = currentMode();
      downloadText(exportFilename(mode === "revert" ? "変更の中止計画" : "本番反映計画", "md", selectedApps()), planMarkdown(), "text/markdown;charset=utf-8");
      panel.setStatus("計画をMarkdownで保存しました。", "ok");
    });
    copyPlanBtn.addEventListener("click", () => {
      if (!inspection || !isFresh()) return;
      void copyTextToClipboard(planMarkdown()).then((ok) => panel.setStatus(ok ? "計画のMarkdownをコピーしました。" : "コピーできませんでした。「計画をMarkdownで保存」を使ってください。", ok ? "ok" : "warn"));
    });
    function mergeInspection(result, previous, onlyKeys) {
      const incoming = new Map(result.apps.map((app) => [deployAppKey(app), app]));
      let apps;
      if (onlyKeys && previous) {
        apps = previous.apps.map((app) => incoming.get(deployAppKey(app)) || app);
        for (const key of onlyKeys) {
          selected.delete(key);
          const app = incoming.get(key);
          if (app && isSelectableInspection(app)) selected.add(key);
        }
      } else {
        apps = result.apps;
        selected = new Set(defaultSelectedKeys(apps));
      }
      return apps;
    }
    async function startInspect(onlyProblems = false) {
      if (busy) return;
      const blocker = setupBlocker();
      if (blocker) {
        panel.setStatus(blocker, "warn");
        return;
      }
      const all = currentTargets();
      const problemKeys = onlyProblems && inspection ? new Set(inspection.apps.filter((app) => app.state === "error" || app.state === "processing").map(deployAppKey)) : null;
      const targets = problemKeys ? all.filter((app) => problemKeys.has(deployAppKey(app))) : all;
      if (!targets.length) return;
      const signature = currentSignature();
      const previous = inspection;
      await runLite(onlyProblems ? "取得失敗・処理中のアプリを確認し直し中…" : "未公開の変更を確認中…", async () => {
        const result = await inspectDeployTargetsStandalone({
          targets,
          onProgress: (done, total, label) => panel.setStatus(`未公開の変更を確認中…（${done}/${total} アプリ${label ? ` · ${label}` : ""}）`, "busy")
        });
        const apps = mergeInspection(result, problemKeys ? previous : null, problemKeys);
        inspection = { apps, signature, at: Date.now(), inspectedAt: result.inspectedAt || (/* @__PURE__ */ new Date()).toISOString() };
        reviewShown = 200;
        appTable.putApps(apps.map((app) => ({ appId: app.appId, guestId: app.guestId, appName: app.name })));
        clearConfirmation();
        renderReviewTable();
        refreshReview();
        showStage("review");
        const counts = countInspectStates(apps);
        const mode = currentMode();
        const blockers = selectionBlockers(apps, selected, mode);
        if (counts.error || counts.processing) {
          panel.setStatus(`${describeInspectSummary(counts)}取得失敗・反映処理中のアプリは、確認し直すか対象から外してください。まだ書き込んでいません。`, "warn");
        } else if (!counts.changes) {
          panel.setStatus("未公開の変更があるアプリはありません。反映は不要です。まだ書き込んでいません。", "info");
        } else if (blockers.length) {
          panel.setStatus(`${describeInspectSummary(counts)}${blockers[0]}`, "warn");
        } else {
          panel.setStatus(`${describeInspectSummary(counts)}まだ書き込んでいません。`, "ok");
        }
      });
    }
    recheckAllBtn.addEventListener("click", () => {
      void startInspect(false);
    });
    recheckProblemsBtn.addEventListener("click", () => {
      void startInspect(true);
    });
    const confirmBtn = makeButton("最終確認に進む", "primary");
    const runBtn = makeButton(deployRunLabel("deploy", 0), "danger");
    runBtn.disabled = true;
    const confirmCard = makeCard({ title: "この内容で本番を変更します" });
    const confirmBody = el("div");
    const ack = makeCheck({ label: "上記の内容を確認しました", checked: false });
    ack.checkbox.setAttribute("aria-label", "上記の内容を確認しました");
    const confirmInput = makeInput({ width: "wide", noSubmit: true });
    confirmInput.autocomplete = "off";
    confirmInput.inputMode = "numeric";
    confirmInput.setAttribute("data-lp-no-submit", "");
    const confirmLabel = el("label", "kus-dp-confirm-label");
    const confirmInputWrap = el("div", "kus-dp-confirm-input");
    confirmInputWrap.append(confirmLabel, confirmInput);
    const confirmStatus = el("p", "kus-dp-quiet");
    confirmStatus.setAttribute("aria-live", "polite");
    confirmCard.body.append(confirmBody, ack.label, confirmInputWrap, confirmStatus);
    let requiredInput = "";
    function confirmationToken() {
      return isFresh() && inspection ? JSON.stringify([inspection.signature, inspection.at, [...selected].sort()]) : "";
    }
    function clearConfirmation() {
      confirmedToken = "";
      ack.checkbox.checked = false;
      confirmInput.value = "";
      confirmStatus.textContent = "内容を確認して、チェックと入力をしてください。";
      runBtn.disabled = true;
    }
    function confirmationReady() {
      return !!confirmedToken && confirmedToken === confirmationToken() && ack.checkbox.checked && !!requiredInput && confirmInput.value.trim() === requiredInput && !selectionBlockers(inspection?.apps || [], selected, currentMode()).length;
    }
    function refreshConfirmState() {
      runBtn.disabled = busy || !confirmationReady();
      confirmStatus.textContent = confirmationReady() ? "確認できました。下の実行ボタンで実行できます。" : `確認のチェックと、${confirmRequirement(selectedApps()).label}が必要です。`;
    }
    for (const control of [ack.checkbox, confirmInput]) control.addEventListener("input", refreshConfirmState);
    function fact(key, title, mod = "") {
      const root2 = el("div", `kus-dp-fact${mod ? ` kus-dp-fact--${mod}` : ""}`);
      root2.dataset.confirm = key;
      const dt = el("dt", "", title);
      const dd = el("dd");
      root2.append(dt, dd);
      return { root: root2, dd };
    }
    function openConfirmation() {
      if (busy || confirmBtn.disabled || !inspection) return;
      clearConfirmation();
      confirmedToken = confirmationToken();
      if (!confirmedToken) return;
      const mode = currentMode();
      const text = deployModeText(mode);
      const targets = selectedApps();
      const totals = aggregateChanges(targets);
      confirmCard.card.querySelector(".kus-lp__card-title").textContent = mode === "revert" ? "この内容でプレビューの変更を中止します" : "この内容で本番を変更します";
      confirmBody.replaceChildren();
      const facts = el("dl", "kus-dp-facts");
      const direction = fact("direction", "方向", "direction");
      direction.dd.textContent = text.direction;
      const targetFact = fact("targets", `対象アプリ（${targets.length} アプリ）`);
      targetFact.dd.appendChild(el("div", "kus-dp-targets", summarizeList(targets.map((app) => formatDeployApp(app)))));
      const method = fact("method", "反映の方法");
      method.dd.textContent = `${describeBatchMode(currentBatchMode())}（${describeStopPolicy(currentBatchMode(), currentStopOnError())}）`;
      const removedText = describeRemovedSettings(totals);
      const changes = fact("changes", "削除される設定", removedText ? "danger" : "");
      changes.dd.textContent = removedText ? `${removedText}（${mode === "revert" ? "破棄されるプレビューの設定" : "本番から削除される設定"}）` : `削除される設定はありません（追加 ${totals.added} 件・変更 ${totals.changed} 件）。`;
      facts.append(direction.root, targetFact.root, method.root, changes.root);
      if (mode === "deploy") {
        const removedFields = collectRemovedFields(targets);
        const removed = fact("removed-fields", `削除されるフィールド（${removedFields.length} 件）`, removedFields.length ? "danger" : "");
        if (removedFields.length) {
          removed.dd.appendChild(el("strong", "", "本番へ反映すると、これらのフィールドのレコードの値も削除され、元に戻せません。"));
          const ul = el("ul", "kus-dp-issues");
          ul.style.color = "#991b1b";
          for (const { app, field } of removedFields.slice(0, 30)) {
            const li = el("li");
            li.textContent = `${formatDeployApp(app)}: ${describeRemovedField(field)}${field.possibleRename ? `（フィールドコードを変えただけなら値は残る可能性があります。プレビューの『${field.possibleRename}』）` : ""}`;
            ul.appendChild(li);
          }
          if (removedFields.length > 30) ul.appendChild(el("li", "", `ほか ${removedFields.length - 30} 件（全件は計画のMarkdownで確認できます）`));
          removed.dd.appendChild(ul);
        } else {
          removed.dd.textContent = "削除されるフィールドはありません。";
        }
        facts.appendChild(removed.root);
      }
      const backup = fact("backup", "バックアップ");
      backup.dd.textContent = backupDescription(mode, targets.length);
      const undo = fact("undo", "取り消し方");
      undo.dd.textContent = undoGuidance(mode);
      facts.append(backup.root, undo.root);
      confirmBody.appendChild(facts);
      const requirement = confirmRequirement(targets);
      requiredInput = requirement.value;
      confirmLabel.textContent = `${requirement.label}（${requirement.value} と入力）`;
      confirmInput.placeholder = requirement.placeholder;
      confirmInput.setAttribute("aria-label", targets.length === 1 ? "確認用の対象アプリID" : "確認用の対象アプリ数");
      confirmInput.id = `${panel.root.id}-confirm-input`;
      confirmLabel.htmlFor = confirmInput.id;
      setButtonText(runBtn, deployRunLabel(mode, targets.length));
      refreshConfirmState();
      showStage("confirm");
      panel.setStatus(`対象と変更内容を確認してください。まだ${mode === "revert" ? "プレビューの変更は破棄して" : "本番へは反映して"}いません。`, "info");
    }
    confirmBtn.addEventListener("click", openConfirmation);
    const resultCard = makeCard({ title: "実行結果" });
    const resultHead = el("div", "kus-dp-result-head");
    resultHead.setAttribute("aria-live", "polite");
    const resultPills = el("div", "kus-dp-pills");
    const resultNotes = el("div", "kus-dp-result-notes");
    const progressHost = el("div");
    const resultTools = el("div", "kus-dp-tools");
    const saveJsonBtn = makeButton("結果JSONを保存", "sub");
    const saveRecordBtn = makeButton("記録をMarkdownで保存", "sub");
    const copyRecordBtn = makeButton("記録をコピー", "sub");
    const retryBtn = makeButton("失敗・未実行だけ選び直す", "sub");
    const openSettingsBtn = makeButton("アプリの設定画面を開く", "sub");
    let restoreOptions = [];
    const restoreSelect = makeSelect([]);
    restoreSelect.setAttribute("aria-label", "バックアップから戻すアプリ");
    restoreSelect.dataset.deployRestoreApp = "true";
    restoreSelect.hidden = true;
    const restoreBtn = makeButton("バックアップから戻す", "sub");
    restoreBtn.dataset.deployRestore = "true";
    restoreBtn.title = "保存したバックアップとの差分を確認します（この操作では書き込みません）";
    restoreBtn.hidden = true;
    resultTools.append(saveJsonBtn, saveRecordBtn, copyRecordBtn, retryBtn, restoreSelect, restoreBtn, openSettingsBtn);
    resultCard.body.append(resultHead, resultPills, resultNotes, progressHost, resultTools);
    const resultEmpty = el("div", "kus-dp-empty", "まだ実行していません。対象を選び、変更を確認してから実行してください。");
    function renderResultCard() {
      const last = memory2.lastRun;
      const showing = !!progressView && (busy || !!last);
      resultCard.card.hidden = !showing;
      resultEmpty.hidden = showing;
      if (!showing) return;
      const view = progressView;
      const counts = view.counts();
      resultPills.replaceChildren();
      const pills = [
        ["成功", counts.success, "same"],
        ["失敗", counts.failed, "error"],
        ["取り消し", counts.cancelled, "error"],
        ["確認後に更新", counts.conflict, "change"],
        ["完了を確認できない", counts.unknown, "change"],
        ["未実行", counts.pending, "processing"]
      ];
      for (const [label, count, tone] of pills) if (count) resultPills.appendChild(el("span", `kus-dp-pill kus-dp-pill--${tone}`, `${label} ${count}`));
      resultNotes.replaceChildren();
      if (busy || !last) {
        resultHead.textContent = busy ? `${deployModeText(runningMode).verb === "中止" ? "変更の中止" : "本番への反映"}を実行中です。` : "";
        resultTools.hidden = true;
        return;
      }
      const message = describeRunResult(last.result);
      resultHead.textContent = message.text;
      resultTools.hidden = false;
      const result = last.result;
      const mode = result.mode;
      const unverified = result.apps.filter((app) => app.status === "success" && app.verified === false);
      if (unverified.length) {
        const note = el("div", "kus-dp-warn");
        note.dataset.deployUnverified = String(unverified.length);
        note.textContent = `注意: ${unverified.length} アプリは${mode === "revert" ? "中止" : "反映"}後の状態（revision）が本番とプレビューで一致しませんでした（${unverified.slice(0, 5).map((app) => `App ${app.appId}`).join("、")}${unverified.length > 5 ? ` ほか ${unverified.length - 5} アプリ` : ""}）。アプリの設定画面で確認してください。`;
        resultNotes.appendChild(note);
      }
      const backup = result.backup;
      const backupNote = el("div", backup ? "kus-dp-info" : "kus-dp-warn");
      backupNote.dataset.deployBackup = backup ? "saved" : "none";
      if (backup) {
        backupNote.appendChild(document.createTextNode(`バックアップ: ${backup.fileName}（${backup.appCount} アプリ分・${backup.environment === "preview" ? "中止前のプレビューの設定" : "反映前の本番設定"}）`));
        if (backup.unavailableFiles?.length) {
          const warn = el("div", "kus-dp-warn");
          warn.dataset.deployBackupFiles = String(backup.unavailableFiles.length);
          warn.appendChild(el("strong", "", `本体を保存できなかったファイル（${backup.unavailableFiles.length} 件）`));
          const ul = el("ul", "kus-dp-issues");
          for (const file of backup.unavailableFiles.slice(0, 20)) ul.appendChild(el("li", "", `App ${file.appId} / ${file.name}（${file.reason}）`));
          if (backup.unavailableFiles.length > 20) ul.appendChild(el("li", "", `ほか ${backup.unavailableFiles.length - 20} 件`));
          warn.appendChild(ul);
          backupNote.appendChild(warn);
        }
      } else {
        backupNote.textContent = "バックアップは保存していません。";
      }
      resultNotes.appendChild(backupNote);
      resultNotes.appendChild(el("div", "kus-dp-info", undoGuidance(mode)));
      retryBtn.disabled = busy || !retryableOutcomes(result.apps).length;
      retryBtn.hidden = !retryableOutcomes(result.apps).length;
      const chosen = restoreSelect.value;
      restoreOptions = pickPublishRestoreOptions(result);
      restoreSelect.replaceChildren(...restoreOptions.map((option, index) => {
        const node = document.createElement("option");
        node.value = String(index);
        node.textContent = formatDeployApp(option);
        return node;
      }));
      if (chosen && Number(chosen) < restoreOptions.length) restoreSelect.value = chosen;
      restoreSelect.hidden = restoreOptions.length < 2;
      restoreSelect.disabled = busy;
      restoreBtn.hidden = !restoreOptions.length;
      restoreBtn.disabled = busy;
      openSettingsBtn.hidden = result.apps.length !== 1;
      saveJsonBtn.disabled = busy;
      saveRecordBtn.disabled = busy;
      copyRecordBtn.disabled = busy;
    }
    function recordMarkdown(last) {
      return buildDeployRecordMarkdown({ result: last.result, inspections: last.inspections, stopOnError: last.stopOnError });
    }
    saveJsonBtn.addEventListener("click", () => {
      const last = memory2.lastRun;
      if (!last) return;
      downloadText(exportFilename(last.result.mode === "revert" ? "変更の中止結果" : "本番反映結果", "json", last.result.apps), stringifyDeployResultJson(last.result), "application/json;charset=utf-8");
      panel.setStatus("結果JSONを保存しました。", "ok");
    });
    saveRecordBtn.addEventListener("click", () => {
      const last = memory2.lastRun;
      if (!last) return;
      downloadText(exportFilename(last.result.mode === "revert" ? "変更の中止記録" : "本番反映記録", "md", last.result.apps), recordMarkdown(last), "text/markdown;charset=utf-8");
      panel.setStatus("記録をMarkdownで保存しました。", "ok");
    });
    copyRecordBtn.addEventListener("click", () => {
      const last = memory2.lastRun;
      if (!last) return;
      void copyTextToClipboard(recordMarkdown(last)).then((ok) => panel.setStatus(ok ? "記録のMarkdownをコピーしました。" : "コピーできませんでした。「記録をMarkdownで保存」を使ってください。", ok ? "ok" : "warn"));
    });
    retryBtn.addEventListener("click", () => {
      const last = memory2.lastRun;
      if (!last || busy) return;
      const retry = retryableOutcomes(last.result.apps);
      if (!retry.length) return;
      ready = false;
      appTable.setApps(retry.map((app) => ({ appId: app.appId, guestId: app.guestId, appName: app.name })));
      modeRadios[last.result.mode].checked = true;
      ready = true;
      inspection = null;
      selected = /* @__PURE__ */ new Set();
      clearConfirmation();
      onInputsChanged();
      renderReviewTable();
      refreshReview();
      showStage("setup");
      panel.setStatus(`失敗・未実行の ${retry.length} アプリを対象に選び直しました。未公開の変更を確認し直してください。`, "info");
    });
    restoreBtn.addEventListener("click", () => {
      const option = restoreOptions[Number(restoreSelect.value) || 0];
      if (!option || busy) return;
      const prepared = prepareSourceRestore(option.request);
      if (!prepared.ok) {
        panel.setStatus(prepared.message, "err");
        return;
      }
      switchFlow("source");
      sourceFlow.startRestore(option.request);
    });
    openSettingsBtn.addEventListener("click", () => {
      const last = memory2.lastRun;
      const app = last?.result.apps[0];
      if (!app) return;
      window.open(`${window.location.origin}${appSettingsPath(app)}`, "_blank", "noopener");
      panel.setStatus(`アプリ #${app.appId} の設定画面を開きました。`, "info");
    });
    function stripBundles(app) {
      const { productionBundle: _p, previewBundle: _v, ...rest } = app;
      void _p;
      void _v;
      return rest;
    }
    async function startRun() {
      if (busy || !confirmationReady() || !inspection) return;
      const targets = selectedApps();
      if (!targets.length) return;
      const mode = currentMode();
      const batchMode = currentBatchMode();
      const stopOnError = currentStopOnError();
      runningMode = mode;
      clearConfirmation();
      progressView?.dispose();
      memory2.lastRun = null;
      progressView = createProgressView(progressHost, mode, targets.map((app) => ({ appId: app.appId, guestId: app.guestId, name: app.name, status: "waiting" })));
      const view = progressView;
      showStage("result");
      resultEmpty.hidden = true;
      resultCard.card.hidden = false;
      const finish2 = (result) => {
        memory2.lastRun = { result, inspections: targets.map(stripBundles), stopOnError };
        inspection = null;
        selected = /* @__PURE__ */ new Set();
        view.setOutcomes(result.apps);
      };
      await runLite(mode === "revert" ? "変更を中止中…" : "本番へ反映中…", async () => {
        let result;
        try {
          result = await runDeployStandalone({
            mode,
            batchMode,
            stopOnError,
            targets,
            onUpdate: (update) => view.update(update),
            setStatus: (message2) => panel.setStatus(message2, "busy")
          });
        } catch (error) {
          const reason = String(error?.message || error || "不明なエラー");
          const now = (/* @__PURE__ */ new Date()).toISOString();
          const rows = view.rows();
          finish2({
            mode,
            batchMode,
            startedAt: now,
            finishedAt: now,
            apps: targets.map((app) => {
              const row = rows.find((candidate) => deployAppKey(candidate) === deployAppKey(app));
              const status = !row || row.status === "waiting" ? "pending" : row.status === "success" || row.status === "failed" || row.status === "conflict" || row.status === "cancelled" ? row.status : "unknown";
              return {
                appId: app.appId,
                guestId: app.guestId,
                name: app.name,
                status,
                message: status === "success" || status === "failed" ? row?.message : status === "pending" ? "実行前に処理が止まりました。" : `処理が中断されました。アプリの設定画面で状態を確認してください。（${reason}）`,
                productionRevisionBefore: app.productionRevision,
                previewRevision: app.previewRevision
              };
            }),
            logs: [`エラー: ${reason}`]
          });
          renderResultCard();
          throw new Error(`実行中にエラーが発生しました。本番の状態をアプリの設定画面で確認してください。（${reason}）`);
        }
        finish2(result);
        if (result.logs?.length) panel.setResult(result.logs.join("\n"));
        renderResultCard();
        const message = describeRunResult(result);
        panel.setStatus(message.text, message.tone);
      });
      renderResultCard();
      refreshReview();
    }
    runBtn.addEventListener("click", () => {
      void startRun();
    });
    const nav = el("nav", "kus-dp-nav");
    nav.setAttribute("aria-label", "本番反映の手順");
    nav.setAttribute("role", "tablist");
    const stageDefs = [
      { id: "setup", number: "1", label: "対象を選ぶ", copy: "対象アプリと操作を選ぶ" },
      { id: "review", number: "2", label: "変更を確認", copy: "本番との差分を見て絞る" },
      { id: "confirm", number: "3", label: "最終確認", copy: "対象と削除を確かめる" },
      { id: "result", number: "4", label: "結果", copy: "結果を見て次の操作を選ぶ" }
    ];
    const stages = {};
    const navButtons = {};
    for (const def of stageDefs) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "kus-dp-nav__btn";
      button.id = `kus-dp-tab-${def.id}`;
      button.setAttribute("role", "tab");
      button.setAttribute("aria-controls", `kus-dp-stage-${def.id}`);
      button.innerHTML = `<span class="kus-dp-nav__num">${def.number}</span><span>${def.label}<small class="kus-dp-nav__copy">${def.copy}</small></span>`;
      nav.appendChild(button);
      navButtons[def.id] = button;
      const stage = document.createElement("section");
      stage.className = "kus-dp-stage";
      stage.id = `kus-dp-stage-${def.id}`;
      stage.dataset.stage = def.id;
      stage.setAttribute("role", "tabpanel");
      stage.setAttribute("aria-labelledby", button.id);
      stages[def.id] = stage;
      button.addEventListener("click", () => def.id === "confirm" ? openConfirmation() : showStage(def.id));
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
        else showStage(next.id);
      });
    }
    const heads = {
      setup: ["どのアプリの未公開の変更を扱いますか？", "対象アプリと操作を選びます。次の画面で、本番とプレビューの差分を確認します（この時点では書き込みません）。"],
      review: ["本番との差分を確認して、対象を決める", "未公開の変更があるアプリと、削除される設定を確認します。この画面では書き込みません。"],
      confirm: ["対象と内容の最終確認", "対象・削除される設定・バックアップ・取り消し方を確認してから実行します。"],
      result: ["実行結果と次の操作", "アプリごとの結果を確認します。失敗したアプリは選び直して確認し直せます。"]
    };
    for (const def of stageDefs) {
      const head = el("header", "kus-dp-stage-head");
      head.append(el("h2", "", heads[def.id][0]), el("p", "", heads[def.id][1]));
      stages[def.id].appendChild(head);
    }
    stages.setup.appendChild(setupStage);
    stages.review.append(reviewCard.card, listCard.card);
    stages.confirm.appendChild(confirmCard.card);
    stages.result.append(resultCard.card, resultEmpty);
    const dock = el("div", "kus-dp-action-dock");
    const dockRow = el("div", "kus-dp-dock-row");
    const dockCopy = el("div", "kus-dp-dock-copy");
    dockCopy.setAttribute("aria-live", "polite");
    const dockActions = el("div", "kus-dp-dock-actions");
    const backBtn = makeButton("対象を変更", "sub");
    backBtn.addEventListener("click", () => showStage(activeStage === "confirm" ? "review" : "setup"));
    const nextBtn = makeButton("未公開の変更を確認する", "primary");
    nextBtn.addEventListener("click", () => {
      if (isFresh()) showStage("review");
      else void startInspect(false);
    });
    dockActions.append(backBtn, nextBtn, confirmBtn, runBtn);
    dockRow.append(dockCopy, dockActions);
    dock.append(dockRow, panel.status, panel.result);
    const hint = panel.body.querySelector(".kus-lp__hint");
    const workspace = el("div", "kus-dp-workspace");
    const canvas = el("main", "kus-dp-canvas");
    workspace.appendChild(nav);
    for (const def of stageDefs) canvas.appendChild(stages[def.id]);
    workspace.appendChild(canvas);
    [stages.setup, stages.review, stages.confirm, stages.result].forEach((scope) => attachCardHelp(scope));
    const noInputSubmit = document.createElement("button");
    noInputSubmit.disabled = true;
    function dockTitle() {
      const mode = currentMode();
      const count = appTable.count();
      if (activeStage === "setup") return `${deployModeText(mode).label} · 対象 ${count} アプリ`;
      if (activeStage === "result") return `${deployModeText(runningMode).direction}`;
      const runnable = summarizeSelection(inspection?.apps || [], selected).runnable;
      return `${deployModeText(mode).direction} · 対象 ${runnable} アプリ`;
    }
    refreshWorkflow = () => {
      const fresh = isFresh();
      const mode = currentMode();
      const blocker = activeStage === "setup" ? setupBlocker() : "";
      backBtn.hidden = activeStage === "setup";
      nextBtn.hidden = activeStage !== "setup";
      confirmBtn.hidden = activeStage !== "review";
      runBtn.hidden = activeStage !== "confirm";
      backBtn.disabled = busy;
      nextBtn.disabled = busy || !!blocker;
      setButtonText(backBtn, activeStage === "confirm" ? "変更の確認に戻る" : activeStage === "result" ? "対象を選び直す" : "対象を変更");
      setButtonText(nextBtn, fresh ? "確認済みの結果へ進む" : "未公開の変更を確認する");
      navButtons.review.disabled = !inspection || !fresh;
      navButtons.confirm.disabled = confirmBtn.disabled || !fresh;
      let message = "";
      if (activeStage === "setup") {
        message = blocker ? `次に進むには：${blocker}` : fresh ? "確認済みの結果があります。進むか、確認し直してください。" : `${appTable.count()} アプリの本番とプレビューを比べます。書き込みは行いません。`;
      } else if (activeStage === "review") {
        const blockers = fresh && inspection ? selectionBlockers(inspection.apps, selected, mode) : [];
        message = !fresh ? "条件が変わりました。対象を変更して、未公開の変更を確認し直してください。" : blockers.length ? `次に進むには：${blockers[0]}` : `${summarizeSelection(inspection.apps, selected).runnable} アプリの内容を確認し、最終確認へ進んでください。`;
      } else if (activeStage === "confirm") {
        message = confirmationReady() ? "内容を確認できました。実行すると本番の設定が変わります。" : "確認のチェックと入力をすると、実行できます。";
      } else {
        message = busy ? "実行中です。終わるまでお待ちください。「中止」で、次の依頼の前に止められます。" : memory2.lastRun ? "結果を確認してください。" : "まだ実行していません。";
      }
      const blocked = activeStage === "setup" && !!blocker || activeStage === "review" && fresh && !!inspection && selectionBlockers(inspection.apps, selected, mode).length > 0;
      dockCopy.replaceChildren();
      dockCopy.append(el("strong", "", dockTitle()), el("span", `kus-dp-dock-msg${blocked ? " kus-dp-dock-reason" : ""}`, message));
      if (memory2.flow !== "publish") return;
      panel.result.hidden = activeStage === "confirm";
      panel.setPrimaryAction(activeStage === "setup" ? nextBtn : activeStage === "review" ? confirmBtn : noInputSubmit);
    };
    showStage = (active2) => {
      if (active2 === "confirm" && !confirmedToken) return;
      if (active2 === "review" && !inspection) return;
      if (activeStage === "confirm" && active2 !== "confirm") clearConfirmation();
      activeStage = active2;
      for (const def of stageDefs) {
        const selectedStage = def.id === active2;
        stages[def.id].hidden = !selectedStage;
        navButtons[def.id].setAttribute("aria-selected", String(selectedStage));
        navButtons[def.id].tabIndex = selectedStage ? 0 : -1;
      }
      navButtons[active2].focus({ preventScroll: true });
      canvas.scrollTo({ top: 0 });
      renderResultCard();
      refreshReview();
    };
    const setPanelBusy = panel.setBusy;
    const disabledBefore = /* @__PURE__ */ new Map();
    panel.setBusy = (value) => {
      busy = value;
      panel.root.setAttribute("aria-busy", String(value));
      if (value) refreshWorkflow();
      nav.inert = value;
      for (const def of stageDefs) stages[def.id].inert = value && def.id !== "result";
      if (value) sourceFlow.setBusy(true);
      if (value) {
        panel.root.querySelectorAll("input,button,select,textarea").forEach((control) => {
          if (control.classList.contains("kus-lp__cancel") || control.classList.contains("kus-lp__toggle")) return;
          if (!disabledBefore.has(control)) disabledBefore.set(control, control.disabled);
          control.disabled = true;
        });
        setPanelBusy(value);
        renderResultCard();
        return;
      }
      try {
        disabledBefore.forEach((disabled, control) => {
          control.disabled = disabled;
        });
        disabledBefore.clear();
        sourceFlow.setBusy(false);
        refreshDetailSummary();
        renderResultCard();
        refreshReview();
        if (memory2.flow === "publish") navButtons[activeStage].focus({ preventScroll: true });
      } finally {
        setPanelBusy(value);
      }
    };
    const flowbar = el("div", "kus-ds-flowbar");
    flowbar.appendChild(el("span", "kus-ds-flowbar__label", "操作"));
    const flowGroup = el("div", "kus-ds-flowbar__group");
    flowGroup.setAttribute("role", "radiogroup");
    flowGroup.setAttribute("aria-label", "操作の切り替え");
    const flowInputs = {};
    const flowName = `${panel.root.id}-flow`;
    for (const [id, label] of [["source", "反映元アプリから本番へ"], ["publish", "プレビューの変更を公開"]]) {
      const wrap = el("label", "kus-ds-flow");
      const input = document.createElement("input");
      input.type = "radio";
      input.name = flowName;
      input.value = id;
      input.checked = memory2.flow === id;
      input.setAttribute("aria-label", label);
      input.dataset.flow = id;
      wrap.append(input, document.createTextNode(label));
      flowGroup.appendChild(wrap);
      flowInputs[id] = input;
      input.addEventListener("change", () => {
        if (input.checked) switchFlow(id);
      });
    }
    flowbar.appendChild(flowGroup);
    const subtitleEl = panel.root.querySelector(".kus-lp__subtitle");
    function mountFlow(flow) {
      const next = flow === "source" ? { workspace: sourceFlow.workspace, dock: sourceFlow.dock } : { workspace, dock };
      const other = flow === "source" ? { workspace, dock } : { workspace: sourceFlow.workspace, dock: sourceFlow.dock };
      other.workspace.remove();
      other.dock.remove();
      if (!flowbar.isConnected) {
        if (hint) hint.insertAdjacentElement("afterend", flowbar);
        else panel.body.insertBefore(flowbar, panel.body.firstChild);
      }
      flowbar.insertAdjacentElement("afterend", next.workspace);
      panel.body.appendChild(next.dock);
      if (subtitleEl) subtitleEl.textContent = FLOW_SUBTITLES[flow];
      flowInputs[flow].checked = true;
      next.dock.append(panel.status, panel.result);
      if (flow === "source") sourceFlow.activate();
      else {
        sourceFlow.deactivate();
        refreshWorkflow();
      }
    }
    function switchFlow(flow) {
      if (busy) {
        flowInputs[memory2.flow].checked = true;
        return;
      }
      memory2.flow = flow;
      mountFlow(flow);
      panel.setStatus("", "neutral");
    }
    panel.root.addEventListener("kus-lite-dispose", () => {
      progressView?.dispose();
    }, { once: true });
    const sourceFlow = createSourceFlow(panel);
    ready = true;
    clearConfirmation();
    refreshDetailSummary();
    onInputsChanged();
    renderReviewTable();
    if (memory2.lastRun) {
      runningMode = memory2.lastRun.result.mode;
      progressView = createProgressView(progressHost, memory2.lastRun.result.mode, []);
      progressView.setOutcomes(memory2.lastRun.result.apps);
    }
    showStage(memory2.lastRun ? "result" : "setup");
    mountFlow(memory2.flow);
    if (memory2.flow === "publish" && memory2.lastRun) {
      if (memory2.lastRun.result.logs?.length) panel.setResult(memory2.lastRun.result.logs.join("\n"));
      panel.setStatus(describeRunResult(memory2.lastRun.result).text, describeRunResult(memory2.lastRun.result).tone);
    }
  }

  // src/entries/deploy-lite-entry.ts
  runOnKintonePage(mountDeployLitePanel);
})();
