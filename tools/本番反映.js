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

  // src/tabs/deploy-standalone.ts
  function validateDeployTargets(targets, batchMode) {
    void targets;
    void batchMode;
    throw new Error("validateDeployTargets は未実装です");
  }
  async function inspectDeployTargetsStandalone(opts) {
    void opts;
    throw new Error("inspectDeployTargetsStandalone は未実装です");
  }
  async function runDeployStandalone(opts) {
    void opts;
    throw new Error("runDeployStandalone は未実装です");
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
    const list = failed.length ? failed : problems;
    const shown = list.slice(0, limit).map((app) => {
      const reason = firstLine(app.message);
      return reason ? `${shortDeployApp(app)}: ${reason}` : shortDeployApp(app);
    });
    const rest = list.length - shown.length;
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
    return mode === "revert" ? "破棄した変更は、バックアップJSONをプレビュー反映で読み込むと戻せます。" : "本番への反映は取り消せません。戻すときは、バックアップJSONをプレビュー反映の反映元（設定JSON）に読み込んでプレビューへ戻し、このツールで本番へ反映します。削除したフィールドの値は戻りません。";
  }
  function backupDescription(mode, appCount) {
    return mode === "revert" ? `中止前のプレビューの設定（${appCount} アプリ分）をJSONで保存してから、変更を中止します。` : `反映前の本番設定（${appCount} アプリ分。変更のあるJS/CSSはファイル本体も含む）をJSONで保存してから反映します。`;
  }
  function appSettingsPath(app) {
    const base = app.guestId ? `/k/guest/${encodeURIComponent(app.guestId)}` : "/k";
    return `${base}/admin/app/flow?app=${encodeURIComponent(app.appId)}`;
  }

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

  // src/reflect/planReport.ts
  function escapeReflectMarkdown(value) {
    return String(value ?? "").replace(/[\r\n]+/g, " ").replace(/([\\`*_[\]<>|~])/g, "\\$1");
  }

  // src/deploy/report.ts
  var KIND_ORDER = ["削除", "変更", "追加", "保持"];
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
      const items = [...section.items || []].sort((a, b) => KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind));
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
      ...result.backup ? { backup: result.backup } : {},
      apps: result.apps.map((app) => ({ ...app })),
      logs: [...result.logs || []]
    };
  }
  function stringifyDeployResultJson(result) {
    return JSON.stringify(buildDeployResultJson(result), null, 2);
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

  // src/diff/engine.ts
  var ENTITY_PATH_SEGMENT = String.raw`(?:\.[^.[\]]+|\["(?:[^"\\]|\\.)*"\])`;
  var ENTITY_IDENTIFIER_PATH_PATTERNS = [
    new RegExp(`^(?:fieldsettings\\.properties|viewsettings\\.views|reportsettings\\.reports|processsettings\\.states|categories\\.categories|actionsettings\\.actions)${ENTITY_PATH_SEGMENT}$`),
    new RegExp(`^fieldsettings\\.properties${ENTITY_PATH_SEGMENT}\\.fields${ENTITY_PATH_SEGMENT}$`),
    // 選択肢のキーもラベルを識別子とする名前付きマップ。
    new RegExp(`^fieldsettings\\.properties${ENTITY_PATH_SEGMENT}(?:\\.fields${ENTITY_PATH_SEGMENT})?\\.options${ENTITY_PATH_SEGMENT}$`)
  ];

  // src/kintone-enums.ts
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

  // src/api.ts
  function buildApiPrefix(guestId, preview) {
    const g = String(guestId || "").trim();
    if (g) return `/k/guest/${g}/v1${preview ? "/preview" : ""}`;
    return `/k/v1${preview ? "/preview" : ""}`;
  }
  var DEFAULT_API_GET_RETRIES = 3;
  var DEFAULT_RETRY_BASE_DELAY_MS = 500;
  var DEFAULT_RETRY_MAX_DELAY_MS = 3e3;
  var API_GET_TIMEOUT_MS = 12e4;
  var RETRIABLE_STATUS_CODES = /* @__PURE__ */ new Set([408, 409, 425, 429, 500, 502, 503, 504]);
  var apiGetMetrics = {
    calls: 0,
    retries: 0,
    failures: 0,
    lastLatencyMs: 0,
    lastError: "",
    byPath: {}
  };
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
  var CUSTOMIZE_BODY_MAX_BYTES = 1 * 1024 * 1024;
  var FILE_DOWNLOAD_DEFAULT_MAX_BYTES = 20 * 1024 * 1024;
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
    function putApps(list) {
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
      for (const item of Array.isArray(list) ? list : []) {
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
    function setApps(list) {
      rows.splice(0).forEach((r) => r.tr.remove());
      tbody.innerHTML = "";
      const src = Array.isArray(list) && list.length ? list : [{ appId: "", guestId: "" }];
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

  // src/reflect/sections.ts
  var REFLECT_SECTION_KEYS = (() => {
    const keys = SECTION_DEFS.filter((def) => def.put).map((def) => def.key).filter((key) => key !== "appSettings");
    const anchor = Math.max(keys.indexOf("layoutSettings"), keys.indexOf("fieldSettings"));
    keys.splice(anchor + 1, 0, "appSettings");
    return keys;
  })();

  // src/reflect/changeSummary.ts
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

  // src/reflect/appReference.ts
  function guestIdFromPagePath(pathname) {
    return extractGuestIdFromInput(String(pathname || ""));
  }

  // src/reflect/applyProgress.ts
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
      const list = document.createElement("ul");
      list.className = "kus-rl-item__details";
      for (const detail of details) {
        const li = document.createElement("li");
        li.textContent = detail;
        list.appendChild(li);
      }
      row.appendChild(list);
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
    const list = document.createElement("ul");
    list.className = "kus-rl-items__list";
    let shown = 0;
    const more = document.createElement("button");
    more.type = "button";
    more.className = "kus-lp__btn kus-lp__btn--sub kus-rl-items__more";
    const showNext = (limit) => {
      for (const item of items.slice(shown, shown + limit)) list.appendChild(buildReflectItem(item));
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
    root2.append(list, more);
    more.hidden = onlyKept || shown >= items.length;
    host.appendChild(root2);
  }

  // src/entries/deploy-lite-ui.ts
  var memory = { targets: [], mode: "deploy", batchMode: "sequential", stopOnError: true, lastRun: null };
  var STYLE_ID2 = "kus-deploy-lite-styles";
  var P = "#kus-deploy-lite";
  var CSS2 = `
${P}.kus-lp--wide{width:min(960px,calc(100vw - 32px));max-height:calc(100dvh - 32px);top:16px;right:16px;border-radius:18px;border-color:#cbd5e1}
${P} .kus-lp__hero{padding:16px 24px}
${P} .kus-lp__title{font-size:22px;letter-spacing:-.01em;word-break:keep-all}
${P} .kus-lp__subtitle{font-size:14px;max-width:560px}
${P} .kus-lp__body{padding:0;background:#f4f6f8;display:flex;flex-direction:column;overflow:hidden}
${P} .kus-lp__hint{margin:0;padding:11px 24px;border:0;border-bottom:1px solid #e2e8f0;border-radius:0;background:#fff1f2;color:#9f1239}
${P} .kus-lp__hint strong{color:#881337}
${P} .kus-lp__card{border-radius:16px;padding:16px 18px;box-shadow:0 1px 2px rgba(15,23,42,.04)}
${P} .kus-lp__card-head{border:0;margin:0 0 12px;padding:0}
${P} .kus-lp__card-title{font-size:13px;text-transform:none;letter-spacing:.01em;color:#172033}
${P} .kus-lp__card-num{background:#881337;color:#fff}
${P} [hidden]{display:none!important}
${P} :is(button,input,select,summary):focus-visible{outline:3px solid #2563eb;outline-offset:3px}
${P} .kus-dp-workspace{display:flex;flex-direction:column;min-height:0;flex:1}
${P} .kus-dp-canvas{min-width:0;min-height:0;overflow:auto;padding:20px 24px;scroll-padding:16px}
${P} .kus-dp-nav{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;padding:10px 24px;background:#fff;border-bottom:1px solid #e2e8f0;flex-shrink:0}
${P} .kus-dp-nav__btn{appearance:none;width:100%;border:1px solid transparent;border-radius:10px;background:transparent;color:#64748b;padding:10px;cursor:pointer;font-family:inherit;font-size:13px;font-weight:700;display:grid;grid-template-columns:24px 1fr;align-items:center;gap:9px;text-align:left}
${P} .kus-dp-nav__btn:hover{background:#f1f5f9;color:#172033}
${P} .kus-dp-nav__btn[aria-selected="true"]{background:#fff1f2;color:#881337;border-color:#fecdd3}
${P} .kus-dp-nav__btn:disabled{opacity:.45;cursor:not-allowed}
${P} .kus-dp-nav__num{display:inline-flex;width:19px;height:19px;align-items:center;justify-content:center;border-radius:50%;background:#e2e8f0;color:#475569;font-size:11.5px}
${P} .kus-dp-nav__btn[aria-selected="true"] .kus-dp-nav__num{background:#ffe4e6;color:#881337}
${P} .kus-dp-nav__copy{display:block;font-size:11px;font-weight:500;color:#94a3b8;margin-top:2px}
${P} .kus-dp-nav__btn[aria-selected="true"] .kus-dp-nav__copy{color:#64748b}
${P} .kus-dp-stage[hidden]{display:none}
${P} .kus-dp-stage-head{margin:0 2px 16px}
${P} .kus-dp-stage-head h2{margin:0;font-size:20px;letter-spacing:-.02em;color:#0f172a}
${P} .kus-dp-stage-head p{margin:4px 0 0;font-size:13px;color:#64748b}
${P} .kus-dp-stage .kus-lp__card:last-child{margin-bottom:0}
${P} .kus-dp-setup{display:grid;grid-template-columns:minmax(0,1fr);gap:14px}
${P} .kus-dp-setup>.kus-lp__card{margin:0}
${P} .kus-dp-count{font-size:12.5px;font-weight:700;color:#475569}
${P} .kus-dp-count--over{color:#b91c1c}
${P} .kus-dp-choices{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:8px}
${P} .kus-dp-choice{padding:12px;border:1px solid #cbd5e1;border-radius:10px;background:#fff;cursor:pointer;display:grid;grid-template-columns:18px 1fr;gap:8px;font-size:13px;min-width:0;align-items:start}
${P} .kus-dp-choice:has(input:checked){border-color:#be123c;background:#fff1f2}
${P} .kus-dp-choice:has(input:disabled){opacity:.55;cursor:not-allowed}
${P} .kus-dp-choice strong{display:block;color:#0f172a}
${P} .kus-dp-choice small{display:block;margin-top:3px;color:#64748b;line-height:1.5}
${P} .kus-dp-detail-row{display:flex;flex-wrap:wrap;align-items:center;gap:8px 12px}
${P} .kus-dp-detail-summary{flex:1 1 220px;min-width:0;overflow-wrap:anywhere;font-size:13px;line-height:1.5;color:#475569}
${P} .kus-dp-detail-summary--warn{color:#9a3412;font-weight:700}
${P} .kus-lp__dialog .kus-lp__card--soft{box-shadow:none}
${P} .kus-dp-next{padding:10px 12px;border-radius:10px;font-size:13px;line-height:1.6;border:1px solid #e2e8f0;background:#fff;overflow-wrap:anywhere}
${P} .kus-dp-next--ok{background:#ecfdf5;border-color:#a7f3d0;color:#065f46}
${P} .kus-dp-next--info{background:#eff6ff;border-color:#bfdbfe;color:#1e3a8a}
${P} .kus-dp-next--warn{background:#fffbeb;border-color:#fde68a;color:#92400e}
${P} .kus-dp-next--err{background:#fef2f2;border-color:#fecaca;color:#991b1b}
${P} .kus-dp-quiet{margin:6px 0 0;font-size:13px;color:#64748b;overflow-wrap:anywhere}
${P} .kus-dp-pills{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 10px}
${P} .kus-dp-pill{display:inline-flex;align-items:center;gap:4px;padding:3px 8px;border-radius:999px;font-size:12.5px;font-weight:700;border:1px solid #e2e8f0;background:#fff;color:#334155}
${P} .kus-dp-pill--change{background:#fff7ed;border-color:#fdba74;color:#9a3412}
${P} .kus-dp-pill--same{background:#ecfdf5;border-color:#a7f3d0;color:#065f46}
${P} .kus-dp-pill--error{background:#fef2f2;border-color:#fca5a5;color:#991b1b}
${P} .kus-dp-pill--processing{background:#eff6ff;border-color:#93c5fd;color:#1d4ed8}
${P} .kus-dp-tools{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}
${P} .kus-dp-issues{margin:8px 0 0;padding-left:18px;font-size:13px;line-height:1.6;color:#92400e;overflow-wrap:anywhere}
${P} .kus-dp-table-wrap{border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;background:#fff}
${P} .kus-dp-table{width:100%;border-collapse:collapse;font-size:13px}
${P} .kus-dp-table th{padding:7px 10px;text-align:left;font-size:12.5px;font-weight:700;color:#475569;background:#f8fafc;border-bottom:1px solid #e2e8f0;white-space:nowrap}
${P} .kus-dp-table td{padding:8px 10px;border-top:1px solid #f1f5f9;vertical-align:top;overflow-wrap:anywhere}
${P} .kus-dp-table td.kus-dp-c-sel{width:34px}
${P} .kus-dp-table td.kus-dp-c-app{min-width:150px}
${P} .kus-dp-table td.kus-dp-c-state,${P} .kus-dp-table td.kus-dp-c-act{white-space:nowrap}
${P} .kus-dp-table td.kus-dp-c-rev{min-width:130px}
${P} .kus-dp-table td.kus-dp-c-act .kus-lp__btn{padding:4px 8px;white-space:nowrap}
${P} .kus-dp-pill{white-space:nowrap}
${P} .kus-dp-table tr.kus-dp-row--error td{background:#fff5f5}
${P} .kus-dp-table tr.kus-dp-row--processing td{background:#eff6ff}
${P} .kus-dp-table tr.kus-dp-row--clean td{color:#64748b}
${P} .kus-dp-table tr.kus-dp-detail-tr>td{padding:0 10px 10px;background:#fff}
${P} .kus-dp-app-name{font-weight:700;color:#0f172a}
${P} .kus-dp-app-id{display:block;font-size:12px;color:#64748b}
${P} .kus-dp-app-error{display:block;margin-top:4px;font-size:12.5px;color:#991b1b;white-space:pre-wrap}
${P} .kus-dp-app-sub{display:block;margin-top:4px;font-size:12.5px;color:#475569}
${P} .kus-dp-del{font-variant-numeric:tabular-nums}
${P} .kus-dp-del--has{color:#b91c1c;font-weight:700}
${P} .kus-dp-more{margin-top:8px}
${P} .kus-dp-detail{display:flex;flex-direction:column;gap:8px;padding-top:6px}
${P} .kus-dp-detail h4{margin:4px 0 0;font-size:13px;color:#0f172a}
${P} .kus-dp-danger{padding:10px 12px;border:1px solid #fca5a5;border-radius:10px;background:#fef2f2;color:#991b1b;font-size:13px;line-height:1.6;overflow-wrap:anywhere}
${P} .kus-dp-danger strong{display:block;margin-bottom:2px}
${P} .kus-dp-danger ul{margin:4px 0 0;padding-left:18px}
${P} .kus-dp-danger small{display:block;color:#7f1d1d}
${P} .kus-dp-info{padding:8px 12px;border:1px solid #bfdbfe;border-radius:10px;background:#eff6ff;color:#1e3a8a;font-size:13px;line-height:1.55;overflow-wrap:anywhere}
${P} .kus-dp-warn{padding:8px 12px;border:1px solid #fde68a;border-radius:10px;background:#fffbeb;color:#92400e;font-size:13px;line-height:1.55;overflow-wrap:anywhere}
${P} .kus-dp-facts{margin:0;display:grid;gap:8px}
${P} .kus-dp-fact{padding:10px 12px;border:1px solid #e2e8f0;border-radius:10px;background:#fff;overflow-wrap:anywhere}
${P} .kus-dp-fact dt{margin:0 0 4px;font-size:12.5px;font-weight:700;color:#64748b}
${P} .kus-dp-fact dd{margin:0;font-size:14px;line-height:1.6;color:#0f172a}
${P} .kus-dp-fact--direction{border:2px solid #be123c;background:#fff1f2}
${P} .kus-dp-fact--danger{border-color:#fca5a5;background:#fef2f2}
${P} .kus-dp-fact--danger dd{color:#991b1b}
${P} .kus-dp-targets{margin:6px 0 0;white-space:pre-wrap;overflow-wrap:anywhere;font:13px/1.6 inherit;color:#334155}
${P} .kus-dp-confirm-input{margin-top:12px;display:flex;flex-direction:column;gap:8px}
${P} .kus-dp-confirm-input label.kus-dp-confirm-label{font-size:13px;font-weight:700;color:#0f172a}
${P} .kus-dp-confirm-input .kus-lp__input{width:100%;max-width:260px;box-sizing:border-box;min-height:40px;font-size:14px}
${P} .kus-dp-progress__summary{margin:0 0 6px;font-size:13px;font-weight:700;color:#334155}
${P} .kus-dp-progress__omitted{margin:0 0 6px;font-size:12.5px;color:#64748b}
${P} .kus-dp-result-list{list-style:none;margin:6px 0 0;padding:0;display:flex;flex-direction:column;gap:6px}
${P} .kus-dp-result-item{min-width:0;padding:8px 10px;border:1px solid #e2e8f0;border-radius:10px;background:#fff;overflow-wrap:anywhere}
${P} .kus-dp-result-item--ok{border-color:#a7f3d0}
${P} .kus-dp-result-item--ng{border-color:#fca5a5;background:#fff5f5}
${P} .kus-dp-result-item--warn{border-color:#fcd34d;background:#fffbeb}
${P} .kus-dp-result-item--pending{border-color:#e2e8f0;background:#f8fafc}
${P} .kus-dp-result-item--run{border-color:#93c5fd;background:#eff6ff}
${P} .kus-dp-result-item__head{display:flex;flex-wrap:wrap;align-items:center;gap:4px 8px;font-size:13px}
${P} .kus-dp-result-state{display:inline-flex;align-items:center;gap:4px;padding:1px 8px;border:1px solid #cbd5e1;border-radius:999px;background:#f8fafc;font-size:12.5px;font-weight:700;color:#475569}
${P} .kus-dp-result-state--ok{border-color:#a7f3d0;background:#ecfdf5;color:#065f46}
${P} .kus-dp-result-state--ng{border-color:#fca5a5;background:#fef2f2;color:#991b1b}
${P} .kus-dp-result-state--warn{border-color:#fcd34d;background:#fffbeb;color:#92400e}
${P} .kus-dp-result-state--run{border-color:#93c5fd;background:#dbeafe;color:#1e40af}
${P} .kus-dp-result-item__message{margin-top:6px;font-size:13px;line-height:1.6;color:#334155;white-space:pre-wrap;overflow-wrap:anywhere}
${P} .kus-dp-result-item__meta{margin-top:4px;font-size:12.5px;color:#64748b}
${P} .kus-dp-result-item__meta--warn{color:#9a3412;font-weight:700}
${P} .kus-dp-result-head{font-size:14px;font-weight:700;margin:0 0 8px;overflow-wrap:anywhere}
${P} .kus-dp-result-notes{display:flex;flex-direction:column;gap:8px;margin:8px 0}
${P} .kus-dp-empty{padding:14px 12px;border:1px dashed #cbd5e1;border-radius:10px;background:#f8fafc;font-size:13px;color:#64748b}
${P} .kus-dp-action-dock{flex-shrink:0;padding:12px 24px;background:#fff;border-top:1px solid #e2e8f0}
${P} .kus-dp-dock-row{display:flex;align-items:center;gap:10px}
${P} .kus-dp-dock-copy{flex:1;min-width:0;font-size:13px;color:#475569;overflow-wrap:anywhere}
${P} .kus-dp-dock-copy strong{display:block;color:#0f172a}
${P} .kus-dp-dock-msg{display:block}
${P} .kus-dp-dock-reason{color:#9a3412;font-weight:600}
${P} .kus-dp-dock-actions{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end}
${P} .kus-dp-dock-actions .kus-lp__btn{min-height:42px}
${P} .kus-dp-action-dock .kus-lp__result{max-height:80px;overflow:auto}
${P} .kus-dp-action-dock .kus-lp__status-text{max-height:48px;overflow:auto}
${P} .kus-dp-action-dock .kus-lp__status{margin-top:8px}
${P} .kus-rl-items{margin:4px 0;padding:10px 12px;border:1px solid #e2e8f0;border-radius:10px;background:#fff}
${P} .kus-rl-items__title{display:flex;flex-wrap:wrap;align-items:baseline;gap:2px 10px;margin-bottom:8px;font-size:13px;color:#475569}
${P} .kus-rl-items__title strong{font-size:13px;color:#0f172a}
${P} .kus-rl-items__list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:7px}
${P} .kus-rl-item{display:grid;grid-template-columns:auto minmax(0,1fr);column-gap:8px;row-gap:2px;align-items:baseline;font-size:13px;line-height:1.55;overflow-wrap:anywhere}
${P} .kus-rl-item__name{min-width:0;font-weight:700;color:#0f172a}
${P} .kus-rl-item__details{grid-column:2;margin:0;padding-left:16px;font-size:13px;color:#475569}
${P} .kus-rl-item--keep .kus-rl-item__name{font-weight:600;color:#475569}
${P} .kus-rl-kind{display:inline-block;min-width:36px;padding:0 6px;border:1px solid #cbd5e1;border-radius:4px;background:#f1f5f9;color:#475569;font-size:12px;font-weight:800;line-height:18px;letter-spacing:.04em;text-align:center}
${P} .kus-rl-kind--delete{border-color:#fca5a5;background:#fef2f2;color:#991b1b}
${P} .kus-rl-kind--change{border-color:#fdba74;background:#fff7ed;color:#9a3412}
${P} .kus-rl-kind--add{border-color:#86efac;background:#f0fdf4;color:#166534}
${P} .kus-rl-items--quiet{padding:0 12px;border-style:dashed;background:#f8fafc}
${P} .kus-rl-items--quiet>summary{cursor:pointer;padding:8px 0;font-size:13px;font-weight:700;color:#64748b}
${P} .kus-rl-items__more{margin-top:8px}
@media(max-width:760px){
  ${P} .kus-dp-table,${P} .kus-dp-table tbody{display:block}
  ${P} .kus-dp-table thead{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
  ${P} .kus-dp-table tr.kus-dp-row{display:grid;grid-template-columns:28px minmax(0,1fr) auto;gap:4px 8px;padding:10px 12px;border-top:1px solid #e2e8f0}
  ${P} .kus-dp-table tr.kus-dp-row:first-child{border-top:0}
  ${P} .kus-dp-table tr.kus-dp-row>td{display:block;padding:0;border:0;min-width:0;background:transparent!important}
  ${P} .kus-dp-table td.kus-dp-c-sel{grid-column:1;grid-row:1;width:auto}
  ${P} .kus-dp-table td.kus-dp-c-app,${P} .kus-dp-table td.kus-dp-c-rev{min-width:0}
  ${P} .kus-dp-table td.kus-dp-c-app{grid-column:2;grid-row:1}
  ${P} .kus-dp-table td.kus-dp-c-state{grid-column:3;grid-row:1;justify-self:end}
  ${P} .kus-dp-table td.kus-dp-c-items,${P} .kus-dp-table td.kus-dp-c-del,${P} .kus-dp-table td.kus-dp-c-rev,${P} .kus-dp-table td.kus-dp-c-act{grid-column:2/-1}
  ${P} .kus-dp-table td.kus-dp-c-items::before,${P} .kus-dp-table td.kus-dp-c-del::before,${P} .kus-dp-table td.kus-dp-c-rev::before{content:attr(data-label) "：";font-size:12px;font-weight:700;color:#64748b}
  ${P} .kus-dp-table tr.kus-dp-row.kus-dp-row--error{background:#fff5f5}
  ${P} .kus-dp-table tr.kus-dp-row.kus-dp-row--processing{background:#eff6ff}
  ${P} .kus-dp-table tr.kus-dp-detail-tr{display:block}
  ${P} .kus-dp-table tr.kus-dp-detail-tr>td{display:block}
}
@media(max-width:720px){
  ${P}.kus-lp--wide{width:calc(100vw - 16px);right:8px;top:8px;max-height:calc(100dvh - 16px)}
  ${P} .kus-lp__hero{padding:12px 16px}
  ${P} .kus-lp__hint{display:none}
  ${P} .kus-dp-nav{padding:8px;gap:4px}
  ${P} .kus-dp-nav__copy,${P} .kus-dp-nav__num{display:none}
  ${P} .kus-dp-nav__btn{display:flex;justify-content:center;text-align:center;padding:8px 4px;font-size:12.5px}
  ${P} .kus-dp-canvas{padding:18px 16px 8px}
  ${P} .kus-dp-action-dock{padding:12px 16px 15px}
  ${P} .kus-dp-dock-row{align-items:stretch;flex-direction:column;gap:8px}
  ${P} .kus-dp-dock-actions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px}
  ${P} .kus-dp-dock-actions .kus-lp__btn{min-width:0;white-space:normal}
  ${P} .kus-dp-dock-actions .kus-lp__btn--danger,${P} .kus-dp-dock-actions .kus-lp__btn--primary{grid-column:1/-1}
  ${P} .kus-lp__card{padding:12px}
  ${P} .kus-lp__card-head{flex-wrap:wrap}
  ${P} .kus-lp__select{min-width:0!important;max-width:100%}
}
@media(max-width:400px){${P} .kus-lp__elapsed{display:none}}
@media(max-height:720px){
  ${P} .kus-lp__hero{padding:8px 16px}
  ${P} .kus-lp__title{font-size:17px}
  ${P} .kus-lp__subtitle{display:none}
  ${P} .kus-dp-nav{padding:6px 12px}
  ${P} .kus-dp-nav__btn{padding:6px 4px}
  ${P} .kus-dp-nav__copy{display:none}
  ${P} .kus-dp-canvas{padding:12px 16px 8px}
  ${P} .kus-dp-stage-head{margin-bottom:10px}
  ${P} .kus-dp-stage-head h2{font-size:17px}
  ${P} .kus-dp-stage-head p{display:none}
  ${P} .kus-dp-action-dock{padding:8px 16px 10px}
  ${P} .kus-dp-dock-row{gap:6px}
  ${P} .kus-dp-dock-copy{font-size:12.5px;line-height:1.4}
  ${P} .kus-dp-dock-copy strong,${P} .kus-dp-dock-msg{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden}
  ${P} .kus-dp-dock-actions{gap:4px 6px}
  ${P} .kus-dp-dock-actions .kus-lp__btn{min-height:36px;padding:6px 10px}
  ${P} .kus-dp-action-dock .kus-lp__status{margin-top:6px;padding:6px 10px;min-height:0;line-height:1.4}
  ${P} .kus-dp-action-dock .kus-lp__status-text{max-height:2.9em}
  ${P} .kus-dp-action-dock .kus-lp__result{max-height:48px}
}
@media(prefers-reduced-motion:reduce){${P}{animation:none}${P} *{scroll-behavior:auto!important}}
`;
  function ensureStyles2() {
    if (document.getElementById(STYLE_ID2)) return;
    const st = document.createElement("style");
    st.id = STYLE_ID2;
    st.textContent = CSS2;
    document.head.appendChild(st);
  }
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
    const list = el("ul", "kus-dp-result-list");
    host.append(summary, omitted, list);
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
      list.replaceChildren(...visible.map(buildItem));
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
    const same = (app.sections || []).filter((section) => section.status === "same").map((section) => section.label);
    if (same.length) body.appendChild(el("div", "kus-dp-quiet", `変更のない項目: ${same.join("、")}`));
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
      subtitle: "プレビューの未公開の変更を確認してから、本番へ反映します。",
      accent: "deploy",
      badges: [{ label: "本番の設定を変更", tone: "production" }],
      hint: "<strong>本番のアプリ設定を変更します。</strong>プレビューとの差分と削除される設定を確認し、反映前の本番設定をバックアップしてから実行します。",
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
    let runningMode = memory.mode;
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
      initial: memory.targets,
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
    const deployChoice = makeChoice(modeId, "deploy", deployModeText("deploy").label, deployModeText("deploy").description, memory.mode !== "revert");
    const revertChoice = makeChoice(modeId, "revert", deployModeText("revert").label, deployModeText("revert").description, memory.mode === "revert");
    const modeRadios = { deploy: deployChoice.input, revert: revertChoice.input };
    opGroup.append(deployChoice.label, revertChoice.label);
    cardOp.body.appendChild(opGroup);
    cardOp.body.appendChild(makeNote("「本番へ反映」は kintone の「アプリを更新」、「変更を中止」は「変更を中止」と同じ操作です。変更を中止しても本番の設定は変わりません。どちらも、実行前に本番とプレビューの差分を確認します。", "help"));
    const detail = makeDialog({ title: "詳細設定", id: "kus-dp-detail" });
    const cardBatch = makeCard({ title: "反映の方法", soft: true });
    const batchId = `${panel.root.id}-batch`;
    const seqChoice = makeChoice(batchId, "sequential", "1アプリずつ反映（既定）", "1アプリずつ依頼し、完了を確認してから次へ進みます。", memory.batchMode !== "atomic");
    const atomicChoice = makeChoice(batchId, "atomic", "まとめて反映", `すべて成功したときだけ本番へ反映します。最大 ${DEPLOY_ATOMIC_LIMIT} 件・同じゲストスペース。`, memory.batchMode === "atomic");
    const batchRadios = { sequential: seqChoice.input, atomic: atomicChoice.input };
    const batchGroup = el("div", "kus-dp-choices");
    batchGroup.setAttribute("role", "radiogroup");
    batchGroup.setAttribute("aria-label", "反映の方法");
    batchGroup.append(seqChoice.label, atomicChoice.label);
    cardBatch.body.append(batchGroup, makeNote("まとめて反映は、1回の依頼にまとめます。kintone は1件でも失敗するとすべて取り消すため、本番が中途半端な状態になりません。", "help"));
    const cardStop = makeCard({ title: "失敗したとき", soft: true });
    const stopId = `${panel.root.id}-stop`;
    const stopChoice = makeChoice(stopId, "stop", "残りを実行しない（既定）", "失敗・確認後の更新・完了を確認できないアプリが出たら、残りは未実行にします。", memory.stopOnError);
    const continueChoice = makeChoice(stopId, "continue", "残りも続ける", "失敗したアプリがあっても、残りのアプリを続けます。", !memory.stopOnError);
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
      memory.targets = appTable.getAllRows().map((row) => ({ ...row }));
      memory.mode = currentMode();
      memory.batchMode = currentBatchMode();
      memory.stopOnError = currentStopOnError();
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
      tdDel.textContent = app.state === "changes" ? `${removedCount} 件${removedFields ? `（フィールド ${removedFields} 件）` : ""}` : "－";
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
    resultTools.append(saveJsonBtn, saveRecordBtn, copyRecordBtn, retryBtn, openSettingsBtn);
    resultCard.body.append(resultHead, resultPills, resultNotes, progressHost, resultTools);
    const resultEmpty = el("div", "kus-dp-empty", "まだ実行していません。対象を選び、変更を確認してから実行してください。");
    function renderResultCard() {
      const last = memory.lastRun;
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
      openSettingsBtn.hidden = result.apps.length !== 1;
      saveJsonBtn.disabled = busy;
      saveRecordBtn.disabled = busy;
      copyRecordBtn.disabled = busy;
    }
    function recordMarkdown(last) {
      return buildDeployRecordMarkdown({ result: last.result, inspections: last.inspections, stopOnError: last.stopOnError });
    }
    saveJsonBtn.addEventListener("click", () => {
      const last = memory.lastRun;
      if (!last) return;
      downloadText(exportFilename(last.result.mode === "revert" ? "変更の中止結果" : "本番反映結果", "json", last.result.apps), stringifyDeployResultJson(last.result), "application/json;charset=utf-8");
      panel.setStatus("結果JSONを保存しました。", "ok");
    });
    saveRecordBtn.addEventListener("click", () => {
      const last = memory.lastRun;
      if (!last) return;
      downloadText(exportFilename(last.result.mode === "revert" ? "変更の中止記録" : "本番反映記録", "md", last.result.apps), recordMarkdown(last), "text/markdown;charset=utf-8");
      panel.setStatus("記録をMarkdownで保存しました。", "ok");
    });
    copyRecordBtn.addEventListener("click", () => {
      const last = memory.lastRun;
      if (!last) return;
      void copyTextToClipboard(recordMarkdown(last)).then((ok) => panel.setStatus(ok ? "記録のMarkdownをコピーしました。" : "コピーできませんでした。「記録をMarkdownで保存」を使ってください。", ok ? "ok" : "warn"));
    });
    retryBtn.addEventListener("click", () => {
      const last = memory.lastRun;
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
    openSettingsBtn.addEventListener("click", () => {
      const last = memory.lastRun;
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
      memory.lastRun = null;
      progressView = createProgressView(progressHost, mode, targets.map((app) => ({ appId: app.appId, guestId: app.guestId, name: app.name, status: "waiting" })));
      const view = progressView;
      showStage("result");
      resultEmpty.hidden = true;
      resultCard.card.hidden = false;
      const finish2 = (result) => {
        memory.lastRun = { result, inspections: targets.map(stripBundles), stopOnError };
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
    if (hint) hint.insertAdjacentElement("afterend", workspace);
    else panel.body.insertBefore(workspace, panel.body.firstChild);
    panel.body.appendChild(dock);
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
        message = busy ? "実行中です。終わるまでお待ちください。「中止」で、次の依頼の前に止められます。" : memory.lastRun ? "結果を確認してください。" : "まだ実行していません。";
      }
      const blocked = activeStage === "setup" && !!blocker || activeStage === "review" && fresh && !!inspection && selectionBlockers(inspection.apps, selected, mode).length > 0;
      dockCopy.replaceChildren();
      dockCopy.append(el("strong", "", dockTitle()), el("span", `kus-dp-dock-msg${blocked ? " kus-dp-dock-reason" : ""}`, message));
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
        refreshDetailSummary();
        renderResultCard();
        refreshReview();
        navButtons[activeStage].focus({ preventScroll: true });
      } finally {
        setPanelBusy(value);
      }
    };
    panel.root.addEventListener("kus-lite-dispose", () => {
      progressView?.dispose();
    }, { once: true });
    ready = true;
    clearConfirmation();
    refreshDetailSummary();
    onInputsChanged();
    renderReviewTable();
    if (memory.lastRun) {
      runningMode = memory.lastRun.result.mode;
      progressView = createProgressView(progressHost, memory.lastRun.result.mode, []);
      progressView.setOutcomes(memory.lastRun.result.apps);
      if (memory.lastRun.result.logs?.length) panel.setResult(memory.lastRun.result.logs.join("\n"));
    }
    showStage(memory.lastRun ? "result" : "setup");
    if (memory.lastRun) panel.setStatus(describeRunResult(memory.lastRun.result).text, describeRunResult(memory.lastRun.result).tone);
  }

  // src/entries/deploy-lite-entry.ts
  runOnKintonePage(mountDeployLitePanel);
})();
