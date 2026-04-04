// ==========================================================================
// 統合ツール.js  —  自動生成ファイル（手編集禁止）
// ==========================================================================
// このファイルは tools/統合ツール/ の npm run build (esbuild) で生成されます。
// エントリ: tools/統合ツール/src/index.js
//
// ■ 修正する場合は tools/統合ツール/src/ 配下のソースを編集し、
//   cd tools/統合ツール && npm run build で再生成してください。
// ■ このファイルを直接編集しても次回ビルドで上書きされます。
// ==========================================================================
"use strict";
(() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __esm = (fn, res) => function __init() {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  };
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // src/featureDefs.mjs
  var FEATURE_DEFS, TAB_TO_FEATURE;
  var init_featureDefs = __esm({
    "src/featureDefs.mjs"() {
      "use strict";
      FEATURE_DEFS = [
        { key: "diff", icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/></svg>', label: "差分比較", desc: "設定の差分を確認・比較", tabs: ["diff"] },
        { key: "reflect", icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>', label: "プレビュー反映", desc: "比較元の設定を比較先プレビューへ反映", tabs: ["reflect"] },
        { key: "field", icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>', label: "フィールド追加", desc: "フィールド定義の追加・編集", tabs: ["field"] },
        { key: "jsconfig", icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>', label: "JS/CSS設定", desc: "カスタマイズ設定の取得・反映", tabs: ["jsconfig"] },
        { key: "vis", icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>', label: "可視化・出力", desc: "ER図 / プロセス図 / 設計書 / 設定一括取得", tabs: ["er", "processFlow", "design", "settingsExport"] },
        { key: "data", icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>', label: "データ・保守", desc: "レコード管理 / SQL実行 / APIテスター", tabs: ["recordMgr", "sql", "apiTester"] }
      ];
      TAB_TO_FEATURE = {};
      FEATURE_DEFS.forEach((f) => f.tabs.forEach((t) => {
        TAB_TO_FEATURE[t] = f.key;
      }));
    }
  });

  // src/constants.js
  var TOOL_ID, TOOL_VERSION, EXTERNAL_LIBRARIES, DEFAULT_APP_ID, DIALOG_STATE_KEY, DIFF_SNAPSHOT_STATE_KEY, DIFF_SELECTION_SETS_KEY, DIFF_ONBOARDING_DISMISSED_KEY, DIALOG_MARGIN, DIALOG_MIN_WIDTH, DIALOG_MIN_HEIGHT, DIALOG_DEFAULT_WIDTH, DIALOG_DEFAULT_HEIGHT, DIALOG_LARGE_WIDTH, DIALOG_LARGE_HEIGHT, SECTION_DEFS, SETTINGS_EXPORT_SCOPE_DEFS, TAB_CONNECTION_NEEDS, META_KEYS, SYSTEM_FIELD_TYPES, DEFAULT_SUBTAB_STATE, GUIDED_TOUR_STEPS, DIFF_IMPACT_REF_LIMIT, FIELD_REF_EXACT_KEYS, FIELD_REF_ARRAY_KEYS, FIELD_REF_TOKEN_KEYS, IGNORE_PRESET_KEYS, DIFF_NORMALIZATION_PRESETS, LINE_DIFF_MAX_CELLS, CHAR_DIFF_MAX_CELLS, DEFAULT_IGNORE_KEYS;
  var init_constants = __esm({
    "src/constants.js"() {
      "use strict";
      init_featureDefs();
      TOOL_ID = "kintone-unified-suite-v2";
      TOOL_VERSION = "2.5.0";
      EXTERNAL_LIBRARIES = Object.freeze({
        jszip: Object.freeze({
          version: "3.10.1",
          cdnUrl: "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"
        }),
        alasql: Object.freeze({
          version: "4",
          cdnCandidates: Object.freeze([
            "https://cdn.jsdelivr.net/npm/alasql@4/dist/alasql.min.js",
            "https://unpkg.com/alasql@4/dist/alasql.min.js",
            "https://cdn.jsdelivr.net/npm/alasql@4"
          ])
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
        })
      });
      DEFAULT_APP_ID = String(kintone.app.getId() || "");
      DIALOG_STATE_KEY = `${TOOL_ID}:dialogState`;
      DIFF_SNAPSHOT_STATE_KEY = `${TOOL_ID}:diffSnapshots`;
      DIFF_SELECTION_SETS_KEY = `${TOOL_ID}:diffSelectionSets`;
      DIFF_ONBOARDING_DISMISSED_KEY = `${TOOL_ID}:diffOnboardingDismissed`;
      DIALOG_MARGIN = 16;
      DIALOG_MIN_WIDTH = 560;
      DIALOG_MIN_HEIGHT = 360;
      DIALOG_DEFAULT_WIDTH = 980;
      DIALOG_DEFAULT_HEIGHT = 860;
      DIALOG_LARGE_WIDTH = 1240;
      DIALOG_LARGE_HEIGHT = 940;
      SECTION_DEFS = [
        { key: "appSettings", label: "アプリ設定", endpoint: "/app/settings.json", put: false },
        { key: "fieldSettings", label: "フィールド設定", endpoint: "/app/form/fields.json", put: true, putBuilder: (d) => ({ properties: d.properties || d }) },
        { key: "layoutSettings", label: "レイアウト設定", endpoint: "/app/form/layout.json", put: true, putBuilder: (d) => ({ layout: d.layout || d }) },
        { key: "formSettings", label: "フォーム設定", endpoint: "/form.json", put: false },
        { key: "viewSettings", label: "ビュー設定", endpoint: "/app/views.json", put: true, putBuilder: (d) => ({ views: d.views || d }) },
        { key: "reportSettings", label: "レポート設定", endpoint: "/app/reports.json", put: true, putBuilder: (d) => ({ reports: d.reports || d }) },
        { key: "processSettings", label: "プロセス管理", endpoint: "/app/status.json", put: true, putBuilder: (d) => ({ enable: !!d.enable, states: d.states || {}, actions: d.actions || [] }) },
        { key: "pluginSettings", label: "プラグイン(※)", endpoint: "/app/plugins.json", put: true, putBuilder: (d) => ({ pluginIds: (d.plugins || []).map((p) => p.id) }) },
        { key: "customizeSettings", label: "JS/CSS設定", endpoint: "/app/customize.json", put: true, putBuilder: (d) => ({ desktop: d.desktop || {}, mobile: d.mobile || {} }) },
        { key: "actionSettings", label: "アクション設定", endpoint: "/app/actions.json", put: true, putBuilder: (d) => ({ actions: d.actions || d }) },
        { key: "appAcl", label: "アプリ権限", endpoint: "/app/acl.json", put: true, putBuilder: (d) => ({ rights: d.rights || d }) },
        { key: "fieldAcl", label: "フィールド権限", endpoint: "/field/acl.json", put: true, putBuilder: (d) => ({ rights: d.rights || d }) },
        { key: "recordPermissions", label: "レコード権限", endpoint: "/record/acl.json", put: true, putBuilder: (d) => ({ rights: d.rights || d }) },
        { key: "notifications", label: "通知設定", endpoint: "/app/notifications/general.json", put: true, putBuilder: (d) => ({ notifications: d.notifications || d }) },
        { key: "perRecordNotifications", label: "レコード条件通知", endpoint: "/app/notifications/perRecord.json", put: true, putBuilder: (d) => ({ notifications: d.notifications || d }) },
        { key: "reminderNotifications", label: "リマインダー通知", endpoint: "/app/notifications/reminder.json", put: true, putBuilder: (d) => ({ notifications: d.notifications || d }) },
        { key: "categories", label: "カテゴリ設定", endpoint: "/app/categories.json", put: true, putBuilder: (d) => ({ categories: d.categories || d }) }
      ];
      SETTINGS_EXPORT_SCOPE_DEFS = SECTION_DEFS.filter((s) => s.key !== "customizeSettings");
      TAB_CONNECTION_NEEDS = {
        diff: { appInputs: true, target: true, connectionActions: true },
        reflect: { appInputs: true, target: true, connectionActions: true },
        field: { appInputs: true, target: true, connectionActions: false },
        jsconfig: { appInputs: true, target: true, connectionActions: false },
        design: { appInputs: true, target: true, connectionActions: false },
        recordMgr: { appInputs: true, target: true, connectionActions: false },
        er: { appInputs: true, target: false, connectionActions: false },
        processFlow: { appInputs: true, target: false, connectionActions: false },
        sql: { appInputs: true, target: false, connectionActions: false },
        apiTester: { appInputs: false, target: false, connectionActions: false },
        settingsExport: { appInputs: false, target: false, connectionActions: false }
      };
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
        field: "json",
        jsconfig: "editor",
        recordMgr: "status",
        er: "diagram",
        settingsExport: "export"
      });
      GUIDED_TOUR_STEPS = Object.freeze([
        {
          tab: "diff",
          subTab: "conditions",
          path: "差分比較 > 比較条件",
          selector: "#u_sourceApp",
          title: "1. 比較元 / 比較先を決める",
          body: "共通設定で比較元・比較先のアプリIDとゲストIDを入力します。次のステップのプリセットで、それぞれ本番APIとプレビューAPIのどちらから設定を読むかを決めます。"
        },
        {
          tab: "diff",
          subTab: "conditions",
          path: "差分比較 > 比較条件",
          selector: "#u_diffScopes",
          title: "3. 比較対象セクションを選ぶ",
          body: "差分比較で確認したい設定だけを選びます。まずはフィールド、レイアウト、ビュー、プロセス管理あたりから始めるのが見やすいです。"
        },
        {
          tab: "diff",
          subTab: "conditions",
          path: "差分比較 > 比較条件",
          selector: "#u_ignoreKeyInput",
          title: "4. ノイズ差分を減らす",
          body: "無視キーや正規化プリセットを使うと、順序違い・メタ情報の差分を抑えられます。比較が荒れるときはここを先に調整します。"
        },
        {
          tab: "diff",
          subTab: "conditions",
          path: "差分比較 > 比較条件",
          selector: '[data-act="runDiff"]',
          title: "5. 差分比較を実行する",
          body: "条件が決まったら差分比較を実行します。必要ならこのまま JSON / HTML / Excel / パッチJSON として保存できます。"
        },
        {
          tab: "diff",
          subTab: "view",
          path: "差分比較 > 結果整理",
          selector: "#u_diffSearch",
          title: "6. 結果を絞り込んで確認する",
          body: "比較結果はセクション、種別、重要度、検索で絞り込めます。ここで反映対象を見極めてから次のステップへ進みます。"
        },
        {
          tab: "reflect",
          path: "プレビュー反映",
          selector: "#u_footerPlan",
          title: "7. 反映プランを先に確認する",
          body: "画面下の固定バーから「反映プラン確認」を押し、API リクエスト内容や対象セクションを確認します。要約はメイン欄の「プラン要約」にも表示されます。"
        },
        {
          tab: "reflect",
          path: "プレビュー反映",
          selector: "#u_footerApply",
          title: "8. 比較先プレビューへ反映する",
          body: "固定バーの「比較元 → 比較先(プレビュー) 反映」で書き込みます。本番へのデプロイだけ行う場合は右側の「デプロイのみ」を使います。"
        },
        {
          tab: "design",
          subTab: "export",
          path: "設計書 > 設計書出力",
          selector: '[data-act="exportDesignMd"]',
          title: "9. 最後に記録を残す",
          body: "作業後は設計書や差分レポートを出力して、変更内容を残します。複数アプリをまとめて保存したい場合は「設定一括取得」も使えます。"
        }
      ]);
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
      IGNORE_PRESET_KEYS = {
        fieldOrder: ["index", "no", "order"],
        meta: ["revision", "createdAt", "creator", "modifiedAt", "modifier", "updatedAt", "updatedBy"],
        labelName: ["name", "label"]
      };
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

  // src/utils.js
  var utils_exports = {};
  __export(utils_exports, {
    apiErrorWithContext: () => apiErrorWithContext,
    compactForLog: () => compactForLog,
    deepClone: () => deepClone,
    downloadBlob: () => downloadBlob,
    downloadText: () => downloadText,
    esc: () => esc,
    getDiffTypeDisplayLabel: () => getDiffTypeDisplayLabel,
    getIssueSideLabel: () => getIssueSideLabel,
    getOnOffDisplayLabel: () => getOnOffDisplayLabel,
    getPreviewStateLabel: () => getPreviewStateLabel,
    getSeverityDisplayLabel: () => getSeverityDisplayLabel,
    getThemeDisplayLabel: () => getThemeDisplayLabel,
    normalize: () => normalize,
    nowStamp: () => nowStamp,
    readTextFile: () => readTextFile,
    relativePathFromRow: () => relativePathFromRow,
    safeJsonForScript: () => safeJsonForScript,
    selectedScopeKeys: () => selectedScopeKeys,
    stableStringify: () => stableStringify,
    tokenizePath: () => tokenizePath
  });
  function esc(s) {
    return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
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
    return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}`;
  }
  function getIssueSideLabel(side) {
    if (side === "source") return "比較元";
    if (side === "target") return "比較先";
    if (side === "both") return "両方";
    return String(side || "-");
  }
  function getPreviewStateLabel(preview) {
    return preview ? "プレビュー" : "本番";
  }
  function getOnOffDisplayLabel(value) {
    return value ? "ON" : "OFF";
  }
  function getThemeDisplayLabel(theme) {
    return theme === "dark" ? "ダーク" : "ライト";
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
  function downloadText(filename, text, type) {
    const blob = new Blob([text], { type: type || "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  }
  function downloadBlob(filename, blob) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  }
  function selectedScopeKeys(container) {
    return [...container.querySelectorAll('input[type="checkbox"]:checked')].map((x) => x.value);
  }
  function readTextFile(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result || ""));
      r.onerror = () => reject(r.error || new Error("ファイル読み込みに失敗しました"));
      r.readAsText(file, "utf-8");
    });
  }
  var init_utils = __esm({
    "src/utils.js"() {
      "use strict";
      init_constants();
    }
  });

  // src/state.js
  function loadDialogState() {
    try {
      return JSON.parse(localStorage.getItem(DIALOG_STATE_KEY) || "{}");
    } catch {
      return {};
    }
  }
  function saveDialogState(dialogState) {
    try {
      localStorage.setItem(DIALOG_STATE_KEY, JSON.stringify(dialogState || {}));
    } catch {
    }
  }
  var state, ui;
  var init_state = __esm({
    "src/state.js"() {
      "use strict";
      init_constants();
      state = {
        activeTab: "diff",
        activeSubTabs: { ...DEFAULT_SUBTAB_STATE },
        lastSourceBundle: null,
        lastTargetBundle: null,
        lastDiffRows: [],
        lastFetchIssues: [],
        lastDiffAt: null,
        lastDiffSignature: "",
        lastApplyPlan: null,
        diffViewTheme: "light",
        diffCollapsedSections: /* @__PURE__ */ new Set(),
        diffSectionVisibleCounts: {},
        diffSelectedIds: /* @__PURE__ */ new Set(),
        diffFavoritePaths: /* @__PURE__ */ new Set(),
        diffFavoritesOnly: false,
        diffExcludeSections: null,
        diffSelectionAnchorId: "",
        diffIncludeSame: false,
        diffFilterSection: "",
        diffFilterType: "",
        diffFilterSeverity: "",
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
        patchJsonPanelOpen: false,
        importedPatchPayload: null,
        guidedTourActive: false,
        guidedTourIndex: 0,
        running: false
      };
      ui = {};
    }
  });

  // src/api.js
  function buildApiPrefix(guestId, preview) {
    const g = String(guestId || "").trim();
    if (g) return `/k/guest/${g}/v1${preview ? "/preview" : ""}`;
    return `/k/v1${preview ? "/preview" : ""}`;
  }
  async function apiGet(prefix, path, params, retries = 3) {
    let err;
    for (let i = 0; i < retries; i++) {
      try {
        return await kintone.api(`${prefix}${path}`, "GET", params);
      } catch (e) {
        err = e;
        if (i < retries - 1) await new Promise((r) => setTimeout(r, (i + 1) * 700));
      }
    }
    throw apiErrorWithContext(err, { method: "GET", prefix, path, payload: params });
  }
  async function apiPut(prefix, path, body) {
    try {
      return await kintone.api(`${prefix}${path}`, "PUT", body);
    } catch (e) {
      throw apiErrorWithContext(e, { method: "PUT", prefix, path, payload: body });
    }
  }
  async function apiPost(prefix, path, body) {
    try {
      return await kintone.api(`${prefix}${path}`, "POST", body);
    } catch (e) {
      throw apiErrorWithContext(e, { method: "POST", prefix, path, payload: body });
    }
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
  async function fetchBundle({ appId, guestId, preview, sections, onProgress }) {
    const prefix = buildApiPrefix(guestId, preview);
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
        const res = await apiGet(prefix, def.endpoint, { app });
        const revision = extractSectionRevision(res);
        if (revision) bundle.meta.sectionRevisions[sec] = revision;
        bundle.sections[sec] = normalize(res);
      } catch (e) {
        bundle.sections[sec] = { _fetchError: e.message || String(e) };
      }
      if (onProgress) onProgress((i + 1) / sections.length, def.label);
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
  var init_api = __esm({
    "src/api.js"() {
      "use strict";
      init_constants();
      init_utils();
      init_state();
    }
  });

  // src/diff/engine.js
  function detectRowSeverity(row) {
    const sec = row?.sectionKey || "";
    const path = String(row?.path || "").toLowerCase();
    if (row?.type === "removed") return "high";
    if (HIGH_IMPACT_SECTIONS.has(sec)) return "high";
    if (path.includes("lookup") || path.includes("relatedapp") || path.includes("condition")) return "high";
    if (MEDIUM_IMPACT_SECTIONS.has(sec)) return "medium";
    return "low";
  }
  function isPlainObject(v) {
    return !!v && typeof v === "object" && !Array.isArray(v);
  }
  function getPathLeafKey(path) {
    const m = String(path || "").match(/([^[.\]]+)(?:\[\d+\])?$/);
    return m ? m[1] : "";
  }
  function normalizeIgnoreToken(token) {
    return String(token || "").replace(/[\u200b\u200c\u200d\ufeff]/g, "").replace(/^[\s\u3000]+|[\s\u3000]+$/g, "").toLowerCase();
  }
  function parseIgnoreRules(text) {
    const keySet = new Set(DEFAULT_IGNORE_KEYS);
    const pathSet = /* @__PURE__ */ new Set();
    String(text || "").split(/[\n\r,、，;；\s\u3000]+/).map(normalizeIgnoreToken).filter(Boolean).forEach((token) => {
      if (token.includes(".") || token.includes("[")) pathSet.add(token.replace(/\s+/g, ""));
      else keySet.add(token);
    });
    return { keySet, pathSet };
  }
  function isIgnoredKey(ignoreRules, key) {
    const normalized = normalizeIgnoreToken(key);
    return !!normalized && ignoreRules.keySet.has(normalized);
  }
  function isIgnoredPath(ignoreRules, path) {
    const normalizedPath = normalizeIgnoreToken(path).replace(/\s+/g, "");
    if (!normalizedPath) return false;
    if (ignoreRules.pathSet.has(normalizedPath)) return true;
    const leaf = getPathLeafKey(normalizedPath);
    return !!leaf && ignoreRules.keySet.has(leaf);
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
    let i = 0;
    let j = 0;
    while (i < n || j < m) {
      if (getCollectedDiffCount(out) >= ARRAY_DIFF_LIMIT) return true;
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
    return true;
  }
  function collectArrayDiffs(a, b, path, out, ignoreRules) {
    if (collectArrayDiffsByObjectKey(a, b, path, out, ignoreRules)) return;
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
      pushDiffRow(out, { type: "changed", path, left: a, right: b }, ignoreRules);
      return;
    }
    if (a == null || b == null) {
      pushDiffRow(out, { type: "changed", path, left: a, right: b }, ignoreRules);
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
        if (!Object.prototype.hasOwnProperty.call(b, k)) pushDiffRow(out, { type: "removed", path: p, left: a[k], right: void 0 }, ignoreRules);
        else if (!Object.prototype.hasOwnProperty.call(a, k)) pushDiffRow(out, { type: "added", path: p, left: void 0, right: b[k] }, ignoreRules);
        else collectDeepDiffs(a[k], b[k], p, out, ignoreRules);
        if (getCollectedDiffCount(out) >= ARRAY_DIFF_LIMIT) return;
      }
      return;
    }
    pushDiffRow(out, { type: "changed", path, left: a, right: b }, ignoreRules);
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
      const sourceForDiff = normalizeSectionForCompare(sec, s, presetState);
      const targetForDiff = normalizeSectionForCompare(sec, t, presetState);
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
    return (rows || []).filter((row) => row && row.type !== "same");
  }
  function countActualDiffRows(rows) {
    return getActualDiffRows(rows).length;
  }
  function summarizeFetchIssues(issues) {
    const out = { total: (issues || []).length, source: 0, target: 0, both: 0 };
    for (const issue of issues || []) {
      if (issue.side === "source") out.source += 1;
      else if (issue.side === "target") out.target += 1;
      else out.both += 1;
    }
    return out;
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
  var HIGH_IMPACT_SECTIONS, MEDIUM_IMPACT_SECTIONS, ARRAY_DIFF_LIMIT, SAME_ROW_LIMIT, ARRAY_LCS_MAX_CELLS, ARRAY_KEY_CANDIDATES;
  var init_engine = __esm({
    "src/diff/engine.js"() {
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
    }
  });

  // src/diff/enrich.js
  function relativePathFromRow2(path, secKey) {
    if (!path) return "";
    if (path === secKey) return "";
    if (path.startsWith(`${secKey}.`)) return path.slice(secKey.length + 1);
    if (path.startsWith(`${secKey}[`)) return path.slice(secKey.length);
    return null;
  }
  function tokenizePath2(path) {
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
    const rel = relativePathFromRow2(path, "fieldSettings");
    if (!rel) return null;
    const tokens = tokenizePath2(rel);
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
    if (scoreTokenOverlap(leftCode, rightCode) >= 0.5) {
      score += 1;
      reasons.push("code-similar");
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
        "reminderNotifications"
      ].forEach((sectionKey) => {
        scanSectionForFieldRefs(sectionKey, bundle.sections[sectionKey], codeSet, index, sectionKey, "");
      });
    });
    return index;
  }
  function resolveRowImpactRefs(row, impactIndex) {
    const codes = /* @__PURE__ */ new Set();
    const fieldInfo = extractFieldPathInfo(row.path);
    if (fieldInfo?.activeCode) codes.add(fieldInfo.activeCode);
    if (row.renameCandidate?.fromCode) codes.add(row.renameCandidate.fromCode);
    if (row.renameCandidate?.toCode) codes.add(row.renameCandidate.toCode);
    if (!codes.size) return [];
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
    const order = new Map(SECTION_DEFS.map((entry, idx) => [entry.key, idx]));
    refs.sort((a, b) => {
      const ao = order.has(a.sectionKey) ? order.get(a.sectionKey) : 999;
      const bo = order.has(b.sectionKey) ? order.get(b.sectionKey) : 999;
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
  function buildDiffReasonSummary(row) {
    const sectionKey = row.sectionKey || "";
    const sectionLabel = SECTION_DEFS.find((entry) => entry.key === sectionKey)?.label || sectionKey || "差分";
    const fieldInfo = extractFieldPathInfo(row.path);
    const leafKey = normalizeIgnoreToken2(getPathLeafKey2(row.path));
    if (row.moved) {
      if (sectionKey === "layoutSettings") return "レイアウト順序変更";
      if (sectionKey === "categories") return "カテゴリ順序変更";
      return "順序変更";
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
    if (sectionKey === "layoutSettings") return "レイアウト変更";
    if (sectionKey === "viewSettings") {
      if (String(row.path || "").includes("filterCond")) return "ビュー条件変更";
      if (String(row.path || "").includes(".fields")) return "ビュー列変更";
      if (leafKey === "name") return "ビュー名変更";
      return row.type === "added" ? "ビュー追加" : row.type === "removed" ? "ビュー削除" : "ビュー設定変更";
    }
    if (sectionKey === "reportSettings") {
      if (String(row.path || "").includes("filterCond")) return "レポート条件変更";
      return row.type === "added" ? "レポート追加" : row.type === "removed" ? "レポート削除" : "レポート設定変更";
    }
    if (sectionKey === "processSettings") {
      if (String(row.path || "").includes(".states.")) return row.type === "added" ? "ステータス追加" : row.type === "removed" ? "ステータス削除" : "ステータス設定変更";
      if (String(row.path || "").includes(".actions.")) return row.type === "added" ? "遷移アクション追加" : row.type === "removed" ? "遷移アクション削除" : "遷移アクション変更";
      if (leafKey === "enable") return "プロセス有効/無効変更";
      return "プロセス設定変更";
    }
    if (sectionKey === "actionSettings") return row.type === "added" ? "アクション追加" : row.type === "removed" ? "アクション削除" : "アクション設定変更";
    if (["appAcl", "fieldAcl", "recordPermissions"].includes(sectionKey)) return row.type === "added" ? "権限追加" : row.type === "removed" ? "権限削除" : "権限変更";
    if (["notifications", "perRecordNotifications", "reminderNotifications"].includes(sectionKey)) {
      if (String(row.path || "").includes("condition")) return "通知条件変更";
      return row.type === "added" ? "通知追加" : row.type === "removed" ? "通知削除" : "通知設定変更";
    }
    if (sectionKey === "categories") return row.type === "added" ? "カテゴリ追加" : row.type === "removed" ? "カテゴリ削除" : "カテゴリ設定変更";
    return row.type === "added" ? `${sectionLabel}追加` : row.type === "removed" ? `${sectionLabel}削除` : `${sectionLabel}変更`;
  }
  function enrichDiffRows(rows, sourceBundle, targetBundle) {
    const renameMap = detectFieldRenameCandidates(rows);
    const impactIndex = buildCombinedFieldImpactIndex(sourceBundle, targetBundle);
    return (rows || []).map((row) => {
      const next = { ...row };
      const renameCandidate = renameMap.get(row._id);
      if (renameCandidate) next.renameCandidate = renameCandidate;
      const reason = buildDiffReasonSummary(next);
      if (reason) next.reasonSummary = renameCandidate ? `${reason} / コード変更候補` : reason;
      const impactRefs = resolveRowImpactRefs(next, impactIndex);
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
  var init_enrich = __esm({
    "src/diff/enrich.js"() {
      "use strict";
      init_constants();
      init_state();
      init_utils();
      init_engine();
    }
  });

  // src/ui/dialog.js
  function callScheduleGuidedTourLayout() {
    if (typeof scheduleGuidedTourLayoutFn === "function") scheduleGuidedTourLayoutFn();
  }
  function getRoot() {
    return root;
  }
  function getToolDocument() {
    return root?.ownerDocument || document;
  }
  function getToolWindow() {
    const d = getToolDocument();
    return d.defaultView || window;
  }
  function setUiRefs(uiRefs) {
    ui2 = uiRefs;
  }
  function setRootElement(el) {
    root = el;
  }
  function clampDialogPosition(left, top, width, height) {
    const dialogWidth = Math.max(320, Math.round(Number(width) || root?.offsetWidth || DIALOG_DEFAULT_WIDTH));
    const dialogHeight = Math.max(240, Math.round(Number(height) || root?.offsetHeight || DIALOG_DEFAULT_HEIGHT));
    const tw = getToolWindow();
    const viewportWidth = Math.max(dialogWidth + DIALOG_MARGIN * 2, tw.innerWidth || dialogWidth);
    const viewportHeight = Math.max(dialogHeight + DIALOG_MARGIN * 2, tw.innerHeight || dialogHeight);
    const maxLeft = Math.max(DIALOG_MARGIN, viewportWidth - dialogWidth - DIALOG_MARGIN);
    const maxTop = Math.max(DIALOG_MARGIN, viewportHeight - dialogHeight - DIALOG_MARGIN);
    const fallbackLeft = maxLeft;
    const fallbackTop = DIALOG_MARGIN;
    const nextLeft = Math.min(maxLeft, Math.max(DIALOG_MARGIN, Math.round(Number.isFinite(Number(left)) ? Number(left) : fallbackLeft)));
    const nextTop = Math.min(maxTop, Math.max(DIALOG_MARGIN, Math.round(Number.isFinite(Number(top)) ? Number(top) : fallbackTop)));
    return { left: nextLeft, top: nextTop, maxLeft, maxTop };
  }
  function getDefaultDialogPosition(width, height) {
    const dialogWidth = Math.round(Number(width) || root?.offsetWidth || DIALOG_DEFAULT_WIDTH);
    const dialogHeight = Math.round(Number(height) || root?.offsetHeight || DIALOG_DEFAULT_HEIGHT);
    const tw = getToolWindow();
    return clampDialogPosition((tw.innerWidth || dialogWidth) - dialogWidth - DIALOG_MARGIN, DIALOG_MARGIN, dialogWidth, dialogHeight);
  }
  function getCurrentDialogPosition(width, height) {
    const rect = root.getBoundingClientRect();
    const defaultPos = getDefaultDialogPosition(width || rect.width, height || rect.height);
    const rawLeft = Number.parseFloat(root.style.left);
    const rawTop = Number.parseFloat(root.style.top);
    const left = Number.isFinite(rawLeft) ? rawLeft : rect.left || defaultPos.left;
    const top = Number.isFinite(rawTop) ? rawTop : rect.top || defaultPos.top;
    return clampDialogPosition(left, top, width || rect.width, height || rect.height);
  }
  function getDialogSizeBounds() {
    const tw = getToolWindow();
    const maxWidth = Math.max(360, Math.floor((tw.innerWidth || DIALOG_DEFAULT_WIDTH) - DIALOG_MARGIN * 2));
    const maxHeight = Math.max(320, Math.floor((tw.innerHeight || DIALOG_DEFAULT_HEIGHT) - DIALOG_MARGIN * 2));
    return {
      minWidth: Math.min(DIALOG_MIN_WIDTH, maxWidth),
      minHeight: Math.min(DIALOG_MIN_HEIGHT, maxHeight),
      maxWidth,
      maxHeight
    };
  }
  function clampDialogSize(width, height) {
    const bounds = getDialogSizeBounds();
    const nextWidth = Math.max(bounds.minWidth, Math.min(bounds.maxWidth, Math.round(Number(width) || DIALOG_DEFAULT_WIDTH)));
    const nextHeight = Math.max(bounds.minHeight, Math.min(bounds.maxHeight, Math.round(Number(height) || DIALOG_DEFAULT_HEIGHT)));
    return { ...bounds, width: nextWidth, height: nextHeight };
  }
  function applyDialogSize(width, height, options = {}) {
    const next = clampDialogSize(width, height);
    root.style.width = `${next.width}px`;
    root.style.height = `${next.height}px`;
    const currentPos = getCurrentDialogPosition(next.width, next.height);
    root.style.left = `${currentPos.left}px`;
    root.style.top = `${currentPos.top}px`;
    root.style.right = "auto";
    root.style.bottom = "auto";
    if (options.persist !== false) scheduleDialogSizeSave();
    return next;
  }
  function applyDialogPosition(left, top, options = {}) {
    const rect = root.getBoundingClientRect();
    const next = clampDialogPosition(left, top, rect.width || root.offsetWidth, rect.height || root.offsetHeight);
    root.style.left = `${next.left}px`;
    root.style.top = `${next.top}px`;
    root.style.right = "auto";
    root.style.bottom = "auto";
    if (options.persist !== false) scheduleDialogSizeSave();
    if (state.guidedTourActive) callScheduleGuidedTourLayout();
    return next;
  }
  function applyDialogSizePreset(mode) {
    if (mode === "large") {
      return applyDialogSize(DIALOG_LARGE_WIDTH, DIALOG_LARGE_HEIGHT);
    }
    if (mode === "max") {
      const bounds = getDialogSizeBounds();
      return applyDialogSize(bounds.maxWidth, bounds.maxHeight);
    }
    return applyDialogSize(DIALOG_DEFAULT_WIDTH, DIALOG_DEFAULT_HEIGHT);
  }
  function fitDialogToViewport(options = {}) {
    const rect = root.getBoundingClientRect();
    const size = applyDialogSize(rect.width || DIALOG_DEFAULT_WIDTH, rect.height || DIALOG_DEFAULT_HEIGHT, { persist: false });
    const pos = applyDialogPosition(getCurrentDialogPosition(size.width, size.height).left, getCurrentDialogPosition(size.width, size.height).top, { persist: false });
    if (options.persist !== false) saveCurrentDialogState();
    return { ...size, ...pos };
  }
  function scheduleDialogSizeSave() {
    window.clearTimeout(dialogResizeSaveTimer);
    dialogResizeSaveTimer = window.setTimeout(() => {
      dialogResizeSaveTimer = 0;
      saveCurrentDialogState();
    }, 180);
  }
  function saveCurrentDialogState() {
    if (!root) return;
    const rect = root.getBoundingClientRect();
    const saved = loadDialogState();
    saved.width = Math.round(rect.width || root.offsetWidth);
    saved.height = Math.round(rect.height || root.offsetHeight);
    const rawLeft = Number.parseFloat(root.style.left);
    const rawTop = Number.parseFloat(root.style.top);
    if (Number.isFinite(rawLeft)) saved.left = Math.round(rawLeft);
    if (Number.isFinite(rawTop)) saved.top = Math.round(rawTop);
    saved.activeTab = state.activeTab || "diff";
    saved.activeSubTabs = { ...state.activeSubTabs };
    saveDialogState(saved);
  }
  function initDialogResizeHandling() {
    if (dialogResizeObserver || typeof ResizeObserver !== "function") return;
    dialogResizeObserver = new ResizeObserver(() => {
      scheduleDialogSizeSave();
      callScheduleGuidedTourLayout();
    });
    dialogResizeObserver.observe(root);
  }
  function canStartDialogDrag(target) {
    if (!target || !target.closest("[data-dialog-drag-handle]")) return false;
    return !target.closest("button, input, textarea, select, label, a, [data-no-dialog-drag]");
  }
  function finishDialogDrag(persist = true) {
    if (!dialogDragState) return;
    const doc = getToolDocument();
    doc.removeEventListener("mousemove", dialogDragMoveHandler);
    doc.removeEventListener("mouseup", dialogDragEndHandler);
    dialogDragState = null;
    root.classList.remove("dragging");
    doc.body.style.userSelect = "";
    if (persist) saveCurrentDialogState();
  }
  function onDialogDragMove(e) {
    if (!dialogDragState) return;
    const nextLeft = dialogDragState.left + (e.clientX - dialogDragState.startX);
    const nextTop = dialogDragState.top + (e.clientY - dialogDragState.startY);
    applyDialogPosition(nextLeft, nextTop, { persist: false });
  }
  function onDialogDragEnd() {
    finishDialogDrag(true);
  }
  function onDialogDragStart(e) {
    if (e.button !== 0 || !canStartDialogDrag(e.target)) return;
    const current = getCurrentDialogPosition();
    dialogDragState = {
      startX: e.clientX,
      startY: e.clientY,
      left: current.left,
      top: current.top
    };
    if (!dialogDragMoveHandler) dialogDragMoveHandler = onDialogDragMove;
    if (!dialogDragEndHandler) dialogDragEndHandler = onDialogDragEnd;
    const doc = getToolDocument();
    doc.addEventListener("mousemove", dialogDragMoveHandler);
    doc.addEventListener("mouseup", dialogDragEndHandler);
    root.classList.add("dragging");
    doc.body.style.userSelect = "none";
    e.preventDefault();
  }
  function initDialogDragHandling() {
    ui2.dialogHandle?.addEventListener("mousedown", onDialogDragStart);
  }
  function teardownDialogResizeHandling() {
    if (dialogResizeObserver) {
      dialogResizeObserver.disconnect();
      dialogResizeObserver = null;
    }
    window.clearTimeout(dialogResizeSaveTimer);
    dialogResizeSaveTimer = 0;
    ui2.dialogHandle?.removeEventListener("mousedown", onDialogDragStart);
    finishDialogDrag(false);
  }
  var root, ui2, dialogResizeObserver, dialogResizeSaveTimer, dialogDragState, dialogDragMoveHandler, dialogDragEndHandler, scheduleGuidedTourLayoutFn;
  var init_dialog = __esm({
    "src/ui/dialog.js"() {
      "use strict";
      init_constants();
      init_state();
      init_utils();
      root = null;
      ui2 = {};
      dialogResizeObserver = null;
      dialogResizeSaveTimer = 0;
      dialogDragState = null;
      dialogDragMoveHandler = null;
      dialogDragEndHandler = null;
      scheduleGuidedTourLayoutFn = null;
    }
  });

  // src/diff/popout.js
  var popout_exports = {};
  __export(popout_exports, {
    closeDiffViewerPopout: () => closeDiffViewerPopout,
    openDiffViewerPopout: () => openDiffViewerPopout,
    syncDiffPopoutMirror: () => syncDiffPopoutMirror
  });
  function teardownPopoutListeners(doc) {
    if (!doc) return;
    if (popoutClickHandler) doc.removeEventListener("click", popoutClickHandler, true);
    if (popoutChangeHandler) doc.removeEventListener("change", popoutChangeHandler);
    if (popoutMousedownHandler) doc.removeEventListener("mousedown", popoutMousedownHandler, true);
    popoutClickHandler = null;
    popoutChangeHandler = null;
    popoutMousedownHandler = null;
  }
  function setupPopoutListeners(win) {
    const doc = win.document;
    teardownPopoutListeners(doc);
    popoutChangeHandler = (e) => {
      const diffId = e.target?.dataset?.diffRowId;
      if (!diffId || e.target.type !== "checkbox") return;
      const res = e.target.closest?.("#u_diffPopoutResult");
      if (res?.contains(e.target)) state.diffSelectionAnchorId = diffId;
      if (e.target.checked) state.diffSelectedIds.add(diffId);
      else state.diffSelectedIds.delete(diffId);
      renderResultRows(state.lastDiffRows || []);
      saveCurrentDialogState();
    };
    doc.addEventListener("change", popoutChangeHandler);
    popoutMousedownHandler = (e) => {
      const cb = e.target.closest("input[type=checkbox][data-diff-row-id]");
      if (!cb) return;
      const res = doc.getElementById("u_diffPopoutResult");
      if (!res || !res.contains(cb) || !e.shiftKey || !state.diffSelectionAnchorId) return;
      const boxes = [...res.querySelectorAll("tbody input[type=checkbox][data-diff-row-id]")];
      const ids = boxes.map((el) => el.dataset.diffRowId);
      const i0 = ids.indexOf(state.diffSelectionAnchorId);
      const i1 = ids.indexOf(cb.dataset.diffRowId);
      if (i0 < 0 || i1 < 0) return;
      e.preventDefault();
      const a = Math.min(i0, i1);
      const b = Math.max(i0, i1);
      const anchorEl = boxes.find((el) => el.dataset.diffRowId === state.diffSelectionAnchorId);
      const anchorChecked = anchorEl ? !!anchorEl.checked : true;
      for (let i = a; i <= b; i++) {
        const id = ids[i];
        if (anchorChecked) state.diffSelectedIds.add(id);
        else state.diffSelectedIds.delete(id);
      }
      renderResultRows(state.lastDiffRows || []);
      saveCurrentDialogState();
    };
    doc.addEventListener("mousedown", popoutMousedownHandler, true);
    popoutClickHandler = (e) => {
      const head = e.target.closest?.("[data-diff-sec-toggle]");
      if (head) {
        const key = head.dataset.diffSecToggle;
        if (key) {
          if (state.diffCollapsedSections.has(key)) state.diffCollapsedSections.delete(key);
          else state.diffCollapsedSections.add(key);
          renderResultRows(state.lastDiffRows || []);
          e.preventDefault();
        }
        return;
      }
      const more = e.target.closest?.('[data-act="moreDiffRows"]');
      if (more) {
        const sec = more.dataset.sec;
        if (sec) {
          const cur = state.diffSectionVisibleCounts[sec] || 80;
          state.diffSectionVisibleCounts[sec] = cur + 120;
          renderResultRows(state.lastDiffRows || []);
          e.preventDefault();
        }
      }
    };
    doc.addEventListener("click", popoutClickHandler, true);
  }
  function openDiffViewerPopout() {
    const toolWin = getToolWindow();
    const prev = toolWin.__KUS_DIFF_WIN__;
    if (prev && !prev.closed) {
      try {
        prev.focus();
      } catch (e) {
      }
      syncDiffPopoutMirror();
      return prev;
    }
    const mainRoot = getRoot();
    const styleSrc = mainRoot?.querySelector("style");
    const w = toolWin.open("", WIN_NAME, "width=1440,height=960");
    if (!w) {
      return null;
    }
    w.document.open();
    w.document.write(
      '<!DOCTYPE html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>差分ビュー（拡大）</title></head><body style="margin:0;background:#0f172a;font-family:system-ui,sans-serif"></body></html>'
    );
    w.document.close();
    if (styleSrc) {
      w.document.head.appendChild(styleSrc.cloneNode(true));
    }
    const shell = w.document.createElement("div");
    shell.id = "kintone-unified-suite-v2";
    shell.style.cssText = "position:relative;min-height:100vh;box-sizing:border-box;padding:0;";
    shell.innerHTML = `
    <div class="diff-popout-head" style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 14px;background:linear-gradient(135deg,#0f4c81,#2563eb);color:#fff;font-size:12px">
      <div><strong>差分ビュー（別ウィンドウ）</strong> · メイン画面と選択・折り畳みは同期します</div>
      <button type="button" class="btn sub" id="diffPopoutClose" style="background:rgba(255,255,255,.2);color:#fff;border:0">閉じる</button>
    </div>
    <div class="card result-card" style="margin:0;border-radius:0;border-left:0;border-right:0">
      <div class="result" id="u_diffPopoutResult" style="max-height:none;min-height:calc(100vh - 52px)"></div>
    </div>`;
    w.document.body.appendChild(shell);
    w.document.getElementById("diffPopoutClose")?.addEventListener("click", () => {
      try {
        w.close();
      } catch (e) {
      }
    });
    toolWin.__KUS_DIFF_WIN__ = w;
    setupPopoutListeners(w);
    w.addEventListener("beforeunload", () => {
      teardownPopoutListeners(w.document);
      if (toolWin.__KUS_DIFF_WIN__ === w) toolWin.__KUS_DIFF_WIN__ = null;
    });
    syncDiffPopoutMirror();
    try {
      w.focus();
    } catch (e) {
    }
    return w;
  }
  function syncDiffPopoutMirror() {
    const w = getToolWindow().__KUS_DIFF_WIN__;
    if (!w || w.closed) return;
    const mount = w.document.getElementById("u_diffPopoutResult");
    const root2 = getRoot();
    const src = root2?.querySelector("#u_result");
    if (mount && src) {
      mount.innerHTML = src.innerHTML;
    }
  }
  function closeDiffViewerPopout() {
    const toolWin = getToolWindow();
    const w = toolWin.__KUS_DIFF_WIN__;
    if (w && !w.closed) {
      try {
        w.close();
      } catch (e) {
      }
    }
    toolWin.__KUS_DIFF_WIN__ = null;
  }
  var WIN_NAME, popoutClickHandler, popoutChangeHandler, popoutMousedownHandler;
  var init_popout = __esm({
    "src/diff/popout.js"() {
      "use strict";
      init_state();
      init_dialog();
      init_dialog();
      init_export();
      WIN_NAME = "kintone-diff-viewer-v2";
      popoutClickHandler = null;
      popoutChangeHandler = null;
      popoutMousedownHandler = null;
    }
  });

  // src/diff/export.js
  function stringifyForDiff(value) {
    if (value === void 0) return "（未定義）";
    const out = JSON.stringify(value, null, 2);
    return out == null ? String(value) : out;
  }
  function getDiffExportContentLabel(mode) {
    return mode === "withCompared" ? "差分 + 比較設定" : "差分のみ";
  }
  function shouldIncludeComparedContent(mode) {
    return mode === "withCompared";
  }
  function buildLineDiffOps(leftLines, rightLines) {
    const n = leftLines.length;
    const m = rightLines.length;
    if (n * m > LINE_DIFF_MAX_CELLS) return null;
    const dp = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
    for (let i2 = n - 1; i2 >= 0; i2--) {
      for (let j2 = m - 1; j2 >= 0; j2--) {
        dp[i2][j2] = leftLines[i2] === rightLines[j2] ? dp[i2 + 1][j2 + 1] + 1 : Math.max(dp[i2 + 1][j2], dp[i2][j2 + 1]);
      }
    }
    const ops = [];
    let i = 0;
    let j = 0;
    while (i < n || j < m) {
      if (i < n && j < m && leftLines[i] === rightLines[j]) {
        ops.push({ type: "same", left: leftLines[i], right: rightLines[j] });
        i += 1;
        j += 1;
        continue;
      }
      const down = i < n ? dp[i + 1][j] : -1;
      const right = j < m ? dp[i][j + 1] : -1;
      const diag = i < n && j < m ? dp[i + 1][j + 1] : -1;
      if (i < n && j < m && diag >= down && diag >= right) {
        ops.push({ type: "replace", left: leftLines[i], right: rightLines[j] });
        i += 1;
        j += 1;
        continue;
      }
      if (j < m && (i >= n || right >= down)) {
        ops.push({ type: "add", right: rightLines[j] });
        j += 1;
      } else if (i < n) {
        ops.push({ type: "del", left: leftLines[i] });
        i += 1;
      } else {
        break;
      }
    }
    return ops;
  }
  function buildCharDiffHtml(leftText, rightText) {
    const a = [...String(leftText || "")];
    const b = [...String(rightText || "")];
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
  function renderChangedColumns(row, useCharDiff) {
    const leftText = stringifyForDiff(row.left);
    const rightText = stringifyForDiff(row.right);
    const leftLines = leftText.split("\n");
    const rightLines = rightText.split("\n");
    const ops = buildLineDiffOps(leftLines, rightLines);
    if (!ops) {
      return {
        left: `<pre class="diff-pre del">${esc(leftText)}</pre>`,
        right: `<pre class="diff-pre add">${esc(rightText)}</pre>`
      };
    }
    let leftHtml = "";
    let rightHtml = "";
    let leftNo = 0;
    let rightNo = 0;
    for (const op of ops) {
      if (op.type === "same") {
        leftNo += 1;
        rightNo += 1;
        leftHtml += `<div class="diff-line"><span class="diff-ln">${leftNo}</span>${esc(op.left || "")}</div>`;
        rightHtml += `<div class="diff-line"><span class="diff-ln">${rightNo}</span>${esc(op.right || "")}</div>`;
        continue;
      }
      if (op.type === "replace") {
        leftNo += 1;
        rightNo += 1;
        const charDiff = useCharDiff ? buildCharDiffHtml(op.left, op.right) : null;
        leftHtml += `<div class="diff-line del"><span class="diff-ln">${leftNo}</span>${charDiff ? charDiff.left : esc(op.left || "")}</div>`;
        rightHtml += `<div class="diff-line add"><span class="diff-ln">${rightNo}</span>${charDiff ? charDiff.right : esc(op.right || "")}</div>`;
        continue;
      }
      if (op.type === "del") {
        leftNo += 1;
        leftHtml += `<div class="diff-line del"><span class="diff-ln">${leftNo}</span>${esc(op.left || "")}</div>`;
        rightHtml += '<div class="diff-line pad"><span class="diff-ln"></span></div>';
        continue;
      }
      rightNo += 1;
      leftHtml += '<div class="diff-line pad"><span class="diff-ln"></span></div>';
      rightHtml += `<div class="diff-line add"><span class="diff-ln">${rightNo}</span>${esc(op.right || "")}</div>`;
    }
    return {
      left: `<div class="diff-scroll">${leftHtml}</div>`,
      right: `<div class="diff-scroll">${rightHtml}</div>`
    };
  }
  function renderRowColumns(row, useCharDiff) {
    if (row.type === "same") {
      const text = stringifyForDiff(row.left);
      const preview = text.length > 200 ? text.slice(0, 200) + "..." : text;
      return {
        left: `<pre class="diff-pre" style="color:var(--dv-sub);font-style:italic">${esc(preview)}</pre>`,
        right: '<pre class="diff-pre" style="color:var(--dv-sub);font-style:italic">（同一）</pre>'
      };
    }
    if (row.type === "added") {
      return {
        left: '<pre class="diff-pre empty">（なし）</pre>',
        right: `<pre class="diff-pre add">${esc(stringifyForDiff(row.right))}</pre>`
      };
    }
    if (row.type === "removed") {
      return {
        left: `<pre class="diff-pre del">${esc(stringifyForDiff(row.left))}</pre>`,
        right: '<pre class="diff-pre empty">（なし）</pre>'
      };
    }
    return renderChangedColumns(row, useCharDiff);
  }
  function renderDiffRowMeta(row) {
    const tags = [];
    const lines = [];
    if (row.reasonSummary) {
      tags.push(`<span class="diff-meta-tag reason">${esc(row.reasonSummary)}</span>`);
    }
    if (row.renameCandidate) {
      tags.push(`<span class="diff-meta-tag rename">名称変更候補 ${esc(row.renameCandidate.fromCode || "-")} → ${esc(row.renameCandidate.toCode || "-")}</span>`);
      if (row.renameCandidate.matchedBy) {
        lines.push(`<div class="diff-meta-line"><strong>判定:</strong> ${esc(row.renameCandidate.matchedBy)}</div>`);
      }
    }
    if (row.impactCount) {
      tags.push(`<span class="diff-meta-tag impact">影響 ${row.impactCount}件</span>`);
      const impactText = (row.impactRefs || []).map((ref) => `${ref.section || ref.sectionKey || "-"}:${ref.kind || "-"}${ref.label ? `(${ref.label})` : ""}`).join(" / ");
      lines.push(`<div class="diff-meta-line"><strong>影響:</strong> ${esc(impactText || row.impactSummary || "")}${row.impactCount > (row.impactRefs || []).length ? ` ... +${row.impactCount - (row.impactRefs || []).length}` : ""}</div>`);
    }
    if (!tags.length && !lines.length) return "";
    return `<div class="diff-meta">
      ${tags.length ? `<div class="diff-meta-tags">${tags.join("")}</div>` : ""}
      ${lines.join("")}
    </div>`;
  }
  function diffRowMatchesKeyword(row, keyword) {
    if (!keyword) return true;
    return buildDiffRowSearchText(row).includes(keyword);
  }
  function buildDiffRowSearchText(row) {
    const safe = (v) => {
      try {
        return v === void 0 ? "" : JSON.stringify(v);
      } catch {
        return String(v);
      }
    };
    return [
      row.section || "",
      row.sectionKey || "",
      row.severity || "",
      row.path || "",
      row.reasonSummary || "",
      row.renameCandidate ? `${row.renameCandidate.fromCode || ""} ${row.renameCandidate.toCode || ""}` : "",
      row.impactSummary || "",
      ...(row.impactRefs || []).map((ref) => `${ref.section || ""} ${ref.kind || ""} ${ref.path || ""}`),
      safe(row.left),
      safe(row.right)
    ].join("\n").toLowerCase();
  }
  function collectFieldLabelMapFromProperties(properties, out = /* @__PURE__ */ new Map()) {
    if (!properties || typeof properties !== "object") return out;
    Object.entries(properties).forEach(([code, field]) => {
      if (!field || typeof field !== "object") return;
      const label = String(field.label || field.name || "").trim();
      if (label) {
        if (!out.has(code)) out.set(code, /* @__PURE__ */ new Set());
        out.get(code).add(label);
      }
      if (field.type === "SUBTABLE" && field.fields && typeof field.fields === "object") {
        collectFieldLabelMapFromProperties(field.fields, out);
      }
    });
    return out;
  }
  function buildFieldLabelMapFromBundle(bundle) {
    const props = bundle?.fieldSettings?.properties;
    return collectFieldLabelMapFromProperties(props, /* @__PURE__ */ new Map());
  }
  function resolveDiffRowFieldTerms(row, sourceBundle, targetBundle) {
    const terms = /* @__PURE__ */ new Set();
    const fieldInfo = extractFieldPathInfo(row?.path);
    if (fieldInfo?.activeCode) terms.add(fieldInfo.activeCode);
    if (row?.renameCandidate?.fromCode) terms.add(row.renameCandidate.fromCode);
    if (row?.renameCandidate?.toCode) terms.add(row.renameCandidate.toCode);
    const payload = getFieldRowPayload(row);
    if (payload?.code) terms.add(String(payload.code));
    const sourceMap = buildFieldLabelMapFromBundle(sourceBundle);
    const targetMap = buildFieldLabelMapFromBundle(targetBundle);
    [...terms].forEach((code) => {
      (sourceMap.get(code) || []).forEach((label) => terms.add(label));
      (targetMap.get(code) || []).forEach((label) => terms.add(label));
    });
    return [...terms].filter(Boolean);
  }
  function diffRowMatchesFieldNameKeyword(row, keyword, sourceBundle, targetBundle) {
    if (!keyword) return true;
    const terms = resolveDiffRowFieldTerms(row, sourceBundle, targetBundle).join("\n").toLowerCase();
    if (!terms) return false;
    return terms.includes(keyword);
  }
  function diffIssueMatchesKeyword(issue, keyword) {
    if (!keyword) return true;
    const text = [
      issue.section || "",
      issue.sectionKey || "",
      issue.side || "",
      issue.sourceError || "",
      issue.targetError || "",
      issue.message || ""
    ].join("\n").toLowerCase();
    return text.includes(keyword);
  }
  function diffRowMatchesFilters(row, filters) {
    if (filters.keyword) {
      if (filters.searchByFieldName) {
        if (!diffRowMatchesFieldNameKeyword(row, filters.keyword, filters.sourceBundle, filters.targetBundle)) return false;
      } else if (!diffRowMatchesKeyword(row, filters.keyword)) {
        return false;
      }
    }
    if (filters.section && row.sectionKey !== filters.section) return false;
    if (filters.type === "moved") {
      if (!row.moved) return false;
    } else if (filters.type && row.type !== filters.type) {
      return false;
    }
    if (filters.severity && String(row.severity || "low") !== filters.severity) return false;
    if (filters.favoritesOnly) {
      const p = String(row.path || "").trim();
      if (!state.diffFavoritePaths.has(p)) return false;
    }
    return true;
  }
  function getCurrentDiffFilterState() {
    return {
      keyword: String(ui.diffSearch?.value || "").trim().toLowerCase(),
      section: ui.diffFilterSection?.value || state.diffFilterSection || "",
      type: ui.diffFilterType?.value || state.diffFilterType || "",
      severity: ui.diffFilterSeverity?.value || state.diffFilterSeverity || "",
      searchByFieldName: !!ui.diffSearchFieldName?.checked || !!state.diffSearchFieldName,
      sourceBundle: state.lastSourceBundle,
      targetBundle: state.lastTargetBundle,
      favoritesOnly: !!state.diffFavoritesOnly
    };
  }
  function getFilteredDiffRows(rows) {
    const list = rows || state.lastDiffRows || [];
    const filters = getCurrentDiffFilterState();
    const ex = state.diffExcludeSections;
    return list.filter((row) => {
      if (Array.isArray(ex) && ex.length && ex.includes(row.sectionKey)) return false;
      return diffRowMatchesFilters(row, filters);
    });
  }
  function getFilteredFetchIssues(issues) {
    const list = issues || state.lastFetchIssues || [];
    const filters = getCurrentDiffFilterState();
    return list.filter((issue) => {
      if (filters.section && issue.sectionKey !== filters.section) return false;
      if (filters.keyword && !diffIssueMatchesKeyword(issue, filters.keyword)) return false;
      return true;
    });
  }
  function getSelectedDiffRows(rows) {
    const selected = state.diffSelectedIds || /* @__PURE__ */ new Set();
    return (rows || state.lastDiffRows || []).filter((row) => selected.has(row._id));
  }
  function getRenderedDiffRows(rows) {
    const filtered = getFilteredDiffRows(rows);
    const grouped = groupDiffRowsBySection(filtered);
    const out = [];
    for (const group of grouped) {
      if (state.diffCollapsedSections.has(group.key)) continue;
      const visible = Math.max(40, state.diffSectionVisibleCounts[group.key] || 80);
      out.push(...group.rows.slice(0, visible));
    }
    return out;
  }
  function groupDiffRowsBySection(rows) {
    const labelByKey = new Map(SECTION_DEFS.map((d) => [d.key, d.label]));
    const orderByKey = new Map(SECTION_DEFS.map((d, i) => [d.key, i]));
    const grouped = /* @__PURE__ */ new Map();
    for (const row of rows) {
      const key = row.sectionKey || row.section || "未分類";
      if (!grouped.has(key)) {
        grouped.set(key, {
          key,
          label: labelByKey.get(key) || row.section || key,
          rows: []
        });
      }
      grouped.get(key).rows.push(row);
    }
    return [...grouped.values()].sort((a, b) => {
      const oa = orderByKey.has(a.key) ? orderByKey.get(a.key) : 9999;
      const ob = orderByKey.has(b.key) ? orderByKey.get(b.key) : 9999;
      if (oa !== ob) return oa - ob;
      return String(a.label).localeCompare(String(b.label));
    });
  }
  function parseDiffWarnThreshold() {
    const raw = String(ui.diffWarnThreshold?.value || "").trim();
    if (!raw) return 0;
    const num = Number(raw);
    if (!Number.isFinite(num) || num < 0) return 0;
    return Math.floor(num);
  }
  function buildDiffWarningInfo(rows, issues) {
    const threshold = parseDiffWarnThreshold();
    const diffCount = countActualDiffRows(rows || state.lastDiffRows || []);
    const issueCount = (issues || state.lastFetchIssues || []).length;
    const total = diffCount + issueCount;
    const exceeded = threshold > 0 && total >= threshold;
    return { threshold, diffCount, issueCount, total, exceeded };
  }
  function resolveDiffExportMode() {
    return ui.diffExportMode?.value || state.diffExportMode || "all";
  }
  function resolveDiffExportContentMode() {
    return ui.diffExportContent?.value || state.diffExportContent || "diffOnly";
  }
  function resolveDiffExportRows(mode) {
    const exportMode = mode || resolveDiffExportMode();
    if (exportMode === "selected") {
      const rows = getSelectedDiffRows();
      if (!rows.length) throw new Error("選択差分がありません");
      return { mode: exportMode, label: "選択差分", rows };
    }
    if (exportMode === "visible") {
      const rows = getRenderedDiffRows();
      if (!rows.length) throw new Error("現在表示中の差分がありません");
      return { mode: exportMode, label: "現在表示中", rows };
    }
    return { mode: "all", label: "全差分", rows: state.lastDiffRows || [] };
  }
  function resolveDiffExportComparedScopes(exportInfo, scopes) {
    const fallbackScopes = [...new Set((scopes || []).filter(Boolean))];
    if ((exportInfo?.mode || "all") === "all") return fallbackScopes;
    const rowScopes = [...new Set((exportInfo?.rows || []).map((row) => row.sectionKey).filter(Boolean))];
    if (rowScopes.length) return rowScopes;
    const issueScopes = [...new Set((state.lastFetchIssues || []).map((issue) => issue.sectionKey).filter(Boolean))];
    return issueScopes.length ? issueScopes : fallbackScopes;
  }
  function buildDiffExportComparedBundles(sourceBundle, targetBundle, scopes) {
    const compareScopes = [...new Set((scopes || []).filter(Boolean))];
    return {
      scopes: compareScopes,
      sourceBundle: pickBundleSections(sourceBundle, compareScopes),
      targetBundle: pickBundleSections(targetBundle, compareScopes)
    };
  }
  function bundleToMarkdown(bundle) {
    const lines = [];
    lines.push("# kintone 設計書");
    lines.push("");
    lines.push(`- アプリID: ${bundle.appId}`);
    lines.push(`- ゲストスペースID: ${bundle.guestId || "(通常空間)"}`);
    lines.push(`- プレビュー取得: ${bundle.preview ? "はい" : "いいえ"}`);
    lines.push(`- 取得日時: ${bundle.fetchedAt}`);
    lines.push("");
    for (const def of SECTION_DEFS) {
      const sec = bundle.sections[def.key];
      if (!sec) continue;
      lines.push(`## ${def.label}`);
      lines.push("");
      lines.push("```json");
      lines.push(JSON.stringify(sec, null, 2));
      lines.push("```");
      lines.push("");
    }
    return lines.join("\n");
  }
  function buildPatchPayload(rows, sourceBundle, targetBundle) {
    const grouped = {};
    for (const r of getActualDiffRows(rows)) {
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
    return {
      generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
      source: { appId: sourceBundle?.appId || "", guestId: sourceBundle?.guestId || "", preview: !!sourceBundle?.preview },
      target: { appId: targetBundle?.appId || "", guestId: targetBundle?.guestId || "", preview: !!targetBundle?.preview },
      sections: grouped
    };
  }
  function buildDiffHtml(sourceBundle, targetBundle, rows, scopes, ignoreKeys, options = {}) {
    const summary = summarizeRows(rows || []);
    const sectionText = (scopes || []).map((k) => SECTION_DEFS.find((d) => d.key === k)?.label || k).join(", ");
    const sectionLabelMap = Object.fromEntries(SECTION_DEFS.map((d) => [d.key, d.label]));
    const MAX_EXPORT_ROWS = 2e3;
    const exportRows = (rows || []).slice(0, MAX_EXPORT_ROWS);
    const fetchIssues = Array.isArray(options.fetchIssues) ? options.fetchIssues : [];
    const normalizationLabels = getActiveDiffNormalizationLabels(options.normalizationState || {});
    const warning = options.warning || { threshold: 0, exceeded: false, total: (rows || []).length + fetchIssues.length };
    const exportContentMode = options.exportContentMode || "diffOnly";
    const exportContentLabel = options.exportContentLabel || getDiffExportContentLabel(exportContentMode);
    const compareScopes = Array.isArray(options.compareScopes) ? options.compareScopes : [];
    const compareSourceBundle = options.compareSourceBundle || null;
    const compareTargetBundle = options.compareTargetBundle || null;
    const KUC_REPORT_VERSION = "1.24.0";
    const reportMeta = {
      generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
      ignoreKeys: String(ignoreKeys || ""),
      scopes: scopes || [],
      sectionText,
      exportMode: options.exportMode || "all",
      exportLabel: options.exportLabel || "全差分",
      exportContentMode,
      exportContentLabel,
      normalizationLabels,
      warning,
      source: {
        appId: sourceBundle?.appId || "",
        guestId: sourceBundle?.guestId || "",
        preview: !!sourceBundle?.preview,
        revision: resolveBundleRevision(sourceBundle) || ""
      },
      target: {
        appId: targetBundle?.appId || "",
        guestId: targetBundle?.guestId || "",
        preview: !!targetBundle?.preview,
        revision: resolveBundleRevision(targetBundle) || ""
      },
      summary,
      fetchIssues,
      totalRows: (rows || []).length,
      renderedRows: exportRows.length,
      truncated: (rows || []).length > exportRows.length,
      compareScopes
    };
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
    const logicScript = `
(() => {
  const REPORT_ROWS = ${safeJsonForScript(exportRows)};
  const SECTION_LABEL_MAP = ${safeJsonForScript(sectionLabelMap)};
  const REPORT_META = ${safeJsonForScript(reportMeta)};
  const THEME_KEY = '${TOOL_ID}:diffReportTheme';
  const ACTIVE_TAB_KEY = '${TOOL_ID}:diffReportActiveTab';
  const LINE_DIFF_MAX_CELLS = ${LINE_DIFF_MAX_CELLS};
  const CHAR_DIFF_MAX_CELLS = ${CHAR_DIFF_MAX_CELLS};
  const collapsed = new Set();
  const KUC_SEMVER = '${KUC_REPORT_VERSION}';

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
      const text = safeText(row.left);
      const preview = text.length > 200 ? text.slice(0, 200) + '...' : text;
      return {
        left: '<pre class="blk same">' + escHtml(preview) + '</pre>',
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
    const lines = [];
    if (row.reasonSummary) tags.push('<span class="meta-tag reason">' + escHtml(row.reasonSummary) + '</span>');
    if (row.renameCandidate) {
      tags.push('<span class="meta-tag rename">名称変更候補 ' + escHtml(row.renameCandidate.fromCode || '-') + ' → ' + escHtml(row.renameCandidate.toCode || '-') + '</span>');
      if (row.renameCandidate.matchedBy) {
        lines.push('<div class="meta-line"><strong>判定:</strong> ' + escHtml(row.renameCandidate.matchedBy) + '</div>');
      }
    }
    if (row.impactCount) {
      tags.push('<span class="meta-tag impact">影響 ' + escHtml(String(row.impactCount)) + '件</span>');
      const impactText = (row.impactRefs || []).map((ref) => (ref.section || ref.sectionKey || '-') + ':' + (ref.kind || '-')).join(' / ');
      lines.push('<div class="meta-line"><strong>影響:</strong> ' + escHtml(impactText || row.impactSummary || '') + '</div>');
    }
    if (!tags.length && !lines.length) return '';
    return '<div class="meta-wrap">' +
      (tags.length ? '<div class="meta-tags">' + tags.join('') + '</div>' : '') +
      lines.join('') +
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

  function formatFieldValueBrief(val, maxLen) {
    const n = maxLen == null ? 320 : maxLen;
    if (val === undefined) return '<span class="sl-empty">（なし）</span>';
    if (val === null) return escHtml('null');
    const t = typeof val;
    if (t === 'string' || t === 'number' || t === 'boolean') {
      let s = String(val);
      if (s.length > n) s = s.slice(0, n) + '…';
      return escHtml(s);
    }
    if (Array.isArray(val)) {
      let j;
      try { j = JSON.stringify(val); } catch (e) { j = String(val); }
      if (j.length > n) j = j.slice(0, n) + '…';
      return '<span class="sl-val-mono">' + escHtml(j) + '</span>';
    }
    if (t === 'object') {
      const keys = Object.keys(val);
      if (keys.length && keys.length <= 10) {
        const rows = keys.slice(0, 10).map((k) => {
          const v = val[k];
          let cell;
          if (v === null || v === undefined || typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
            cell = escHtml(v === undefined ? '（未定義）' : JSON.stringify(v));
          } else {
            let j;
            try { j = JSON.stringify(v); } catch (e) { j = String(v); }
            if (j.length > 120) j = j.slice(0, 120) + '…';
            cell = escHtml(j);
          }
          return '<tr><th>' + escHtml(k) + '</th><td>' + cell + '</td></tr>';
        }).join('');
        return '<table class="sl-mini-table">' + rows + '</table>';
      }
    }
    let j;
    try { j = JSON.stringify(val); } catch (e) { j = String(val); }
    if (j.length > n) j = j.slice(0, n) + '…';
    return '<span class="sl-val-mono">' + escHtml(j) + '</span>';
  }

  function getKuc() {
    return window.Kucs && window.Kucs[KUC_SEMVER] ? window.Kucs[KUC_SEMVER] : null;
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

  function fieldChangePropTitle(info, row) {
    if (!info) return row.path || '-';
    if (info.isFieldRoot || info.isSubFieldRoot) return 'フィールド定義（全体）';
    if (!info.tailTokens.length) return row.path || '-';
    return info.tailTokens.map((t) => (typeof t === 'number' ? '[' + t + ']' : String(t))).join('.');
  }

  function summarizeFieldGroupHeader(rows, infoSample) {
    const code = infoSample ? infoSample.activeCode : '';
    let ftype = '';
    let label = '';
    for (let i = 0; i < rows.length; i++) {
      const p = getFieldRowPayload(rows[i]);
      if (p && typeof p === 'object' && !Array.isArray(p) && p.type) {
        ftype = String(p.type || '');
        label = String(p.label != null ? p.label : (p.name != null ? p.name : ''));
        break;
      }
    }
    let sub = code;
    if (ftype) sub += ' · ' + ftype;
    if (label) sub += ' · ' + label;
    return sub;
  }

  function groupFieldSettingsRows(rows) {
    const buckets = new Map();
    const other = [];
    for (const row of rows) {
      if (row.sectionKey !== FIELD_SECTION_KEY) continue;
      const info = extractFieldPathInfo(row.path);
      if (!info) {
        other.push(row);
        continue;
      }
      const k = info.rootPath;
      if (!buckets.has(k)) buckets.set(k, { key: k, info, rows: [] });
      buckets.get(k).rows.push(row);
    }
    const list = [...buckets.values()].sort((a, b) => String(a.key).localeCompare(String(b.key)));
    if (other.length) list.push({ key: FIELD_SECTION_KEY, info: null, rows: other });
    return list;
  }

  function getActiveReportTab() {
    const btn = document.querySelector('.settings-tab:not(.passive)[data-report-tab]');
    return btn ? btn.getAttribute('data-report-tab') : 'summary';
  }

  function renderSettingsLikeView() {
    const root = document.getElementById('settingsLikeRoot');
    if (!root) return;
    const hideSame = !!document.getElementById('hideSame').checked;
    const keyword = String(document.getElementById('search').value || '').trim().toLowerCase();
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
    const nextTab = tabName || 'summary';
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
    try { localStorage.setItem(ACTIVE_TAB_KEY, nextTab); } catch (e) {}
    if (nextTab === 'settingsLike') renderSettingsLikeView();
    else if (nextTab === 'diff') render();
    else {
      const hideSame = !!document.getElementById('hideSame').checked;
      const kw = String(document.getElementById('search').value || '').trim().toLowerCase();
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
    const hideSame = !!document.getElementById('hideSame').checked;
    const useCharDiff = !!document.getElementById('charDiff').checked;
    const keyword = String(document.getElementById('search').value || '').trim().toLowerCase();
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
      const navItem = document.createElement('div');
      navItem.className = 'nav-item';
      navItem.innerHTML = '<span>' + escHtml(g.label) + '</span><span class="badge">' + g.rows.length + '</span>';
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
      head.innerHTML = '<span>' + (collapsedNow ? '▶' : '▼') + ' ' + escHtml(g.label) + '</span><span class="sec-meta">' + g.rows.length + ' 件</span>';
      head.onclick = () => {
        if (collapsed.has(g.key)) collapsed.delete(g.key);
        else collapsed.add(g.key);
        render();
      };
      sec.appendChild(head);

      if (!collapsedNow) {
        const table = document.createElement('table');
        table.className = 'diff-table';
        table.innerHTML = '<thead><tr><th style="width:110px">種別</th><th style="width:260px">パス</th><th>比較元</th><th>比較先</th></tr></thead>';
        const tbody = document.createElement('tbody');
        g.rows.forEach((row) => {
          const tr = document.createElement('tr');
          const typeLabel = diffTypeLabel(row.type, row.moved);
          const cells = renderRowCells(row, useCharDiff);
          const typeClass = row.type === 'same' ? 'same' : (row.type === 'added' ? 'added' : (row.type === 'removed' ? 'removed' : 'changed'));
          tr.innerHTML =
            '<td class="type ' + typeClass + '">' + escHtml(typeLabel) + '</td>' +
            '<td class="path" title="' + escHtml(row.path || '-') + '">' + escHtml(row.path || '-') + renderRowMeta(row) + '</td>' +
            '<td class="cell">' + cells.left + '</td>' +
            '<td class="cell">' + cells.right + '</td>';
          tbody.appendChild(tr);
        });
        table.appendChild(tbody);
        sec.appendChild(table);
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
    localStorage.setItem(THEME_KEY, document.body.classList.contains('dark') ? 'dark' : 'light');
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

  function copyDiffs() {
    const lines = [];
    lines.push('kintone差分レポート');
    lines.push('比較元アプリ: ' + REPORT_META.source.appId + ' / 比較先アプリ: ' + REPORT_META.target.appId);
    lines.push('生成日時: ' + REPORT_META.generatedAt);
    lines.push('');
    const groups = groupBySection(REPORT_ROWS);
    groups.forEach((g) => {
      lines.push('[' + g.label + ']');
      g.rows.forEach((row) => {
        const typeLabel = diffTypeLabel(row.type, row.moved);
        const meta = [
          row.reasonSummary || '',
          row.renameCandidate ? ('名称変更候補 ' + (row.renameCandidate.fromCode || '-') + '→' + (row.renameCandidate.toCode || '-')) : '',
          row.impactCount ? ('影響 ' + row.impactCount + '件') : ''
        ].filter(Boolean).join(' / ');
        lines.push(' - ' + typeLabel + ' : ' + (row.path || '-') + (meta ? ' / ' + meta : ''));
      });
      lines.push('');
    });
    navigator.clipboard.writeText(lines.join('\\n'))
      .then(() => alert('差分をクリップボードへコピーしました'))
      .catch((e) => alert('コピーに失敗しました: ' + (e.message || e)));
  }

  function exportPatch() {
    const patchRows = REPORT_ROWS.filter((row) => row.type !== 'same');
    if (!patchRows.length) {
      alert('出力できる差分がありません');
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
    a.download = 'patch_' + REPORT_META.source.appId + '_vs_' + REPORT_META.target.appId + '.json';
    a.click();
    URL.revokeObjectURL(a.href);
  }

  window.__diffReport = { render, toggleTheme, collapseAll, expandAll, copyDiffs, exportPatch, setActiveTab };

  document.getElementById('hideSame').onchange = onReportFilterChange;
  document.getElementById('charDiff').onchange = onReportFilterChange;
  document.getElementById('search').oninput = onReportFilterChange;
  document.getElementById('themeBtn').onclick = toggleTheme;
  document.getElementById('collapseBtn').onclick = collapseAll;
  document.getElementById('expandBtn').onclick = expandAll;
  document.getElementById('copyBtn').onclick = copyDiffs;
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
      document.getElementById('search').value = '';
      onReportFilterChange();
    }
  });

  if (localStorage.getItem(THEME_KEY) === 'dark') document.body.classList.add('dark');
  syncThemeButtonLabel();
  setActiveTab(localStorage.getItem(ACTIVE_TAB_KEY) || 'summary');
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
  <script src="https://cdn.jsdelivr.net/npm/kintone-ui-component@${KUC_REPORT_VERSION}/umd/kuc.min.js" crossorigin="anonymous"><\/script>
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
    .summary-strip{display:flex;gap:10px;flex-wrap:wrap;padding:18px;border-bottom:1px solid var(--border);background:var(--card)}
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
    .diff-table{width:100%;border-collapse:collapse;table-layout:fixed;font-size:11px}
    .diff-table th,.diff-table td{border-bottom:1px solid var(--border);padding:10px 12px;vertical-align:top;text-align:left}
    .diff-table th{position:sticky;top:0;background:var(--card);z-index:1;font-size:10px;font-weight:800;letter-spacing:.05em;color:var(--muted);text-transform:uppercase}
    .type{font-weight:800}
    .type.added{color:#15803d}
    .type.removed{color:#b91c1c}
    .type.changed{color:#b45309}
    .type.same{color:#0d9488}
    .path{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;word-break:break-all;color:var(--muted);font-size:11px}
    .meta-wrap{margin-top:8px;font-family:"Noto Sans JP","Hiragino Kaku Gothic ProN",Meiryo,sans-serif}
    .meta-tags{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:6px}
    .meta-tag{display:inline-flex;align-items:center;padding:3px 8px;border-radius:999px;border:1px solid var(--border);background:var(--pad);font-size:10px;font-weight:600;color:var(--fg)}
    .meta-tag.reason{background:#fff7ed;color:#9a3412;border-color:#fdba74}
    .meta-tag.rename{background:#ecfdf5;color:#15803d;border-color:#86efac}
    .meta-tag.impact{background:#eff6ff;color:#1d4ed8;border-color:#93c5fd}
    .meta-line{font-size:10px;line-height:1.5;color:var(--muted)}
    .meta-line strong{color:var(--fg)}
    .cell{padding:0;overflow:hidden}
    .scroll{max-height:330px;overflow:auto;scrollbar-width:thin;scrollbar-color:var(--border) transparent}
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
        出力内容: ${esc(reportMeta.exportContentLabel || "差分のみ")}
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
      <input type="text" id="search" placeholder="パス・値・理由で絞り込み" aria-label="差分の検索" autocomplete="off">
      <p class="search-hint"><kbd class="kbd">Ctrl</kbd>+<kbd class="kbd">F</kbd> / <kbd class="kbd">⌘</kbd>+<kbd class="kbd">F</kbd> でフォーカス · <kbd class="kbd">Esc</kbd> でクリア</p>
      <div class="sb-btns">
        <button type="button" class="btn" id="collapseBtn">全折畳</button>
        <button type="button" class="btn" id="expandBtn">全展開</button>
        <button type="button" class="btn" id="themeBtn">ダークに切替</button>
        <button type="button" class="btn" id="copyBtn">差分コピー</button>
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
        <div class="sb-kicker">kintone-like Visual Compare</div>
        <div class="topbar-title">アプリ設定の差分を、設定画面に近い見た目でレビュー</div>
        <div class="topbar-desc">比較元・比較先のメタ情報、差分件数、比較対象セクションを一画面に集約し、各セクションは変更種別ごとのハイライト付きで確認できます。</div>
      </div>
      <div class="header-actions">
        <span class="header-badge">セクション ${esc(String((scopes || []).length || 0))}</span>
        <span class="header-badge">出力 ${esc(reportMeta.exportContentLabel || "差分のみ")}</span>
        <span class="header-badge">警告 ${warning.threshold ? esc(String(warning.total)) : "OFF"}</span>
      </div>
    </div>

    <div class="settings-shell">
      <div class="settings-tabs" role="tablist" aria-label="レポート表示切替">
        <button type="button" role="tab" class="settings-tab" data-report-tab="summary" aria-selected="true">サマリー</button>
        <button type="button" role="tab" class="settings-tab passive" data-report-tab="diff" aria-selected="false">差分一覧</button>
        <button type="button" role="tab" class="settings-tab passive" data-report-tab="settingsLike" aria-selected="false">フィールド比較</button>
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

        <div class="summary-strip">
          <span class="pill pill--total">総件数 <span class="count">${summary.total}</span></span>
          <span class="pill pill--added">追加 <span class="count">${summary.added}</span></span>
          <span class="pill pill--removed">削除 <span class="count">${summary.removed}</span></span>
          <span class="pill pill--changed">変更 <span class="count">${summary.changed}</span></span>
          <span class="pill pill--moved">移動 <span class="count">${summary.moved}</span></span>
          <span class="pill pill--same">同一 <span class="count">${summary.same}</span></span>
          <span class="pill pill--err">取得失敗 <span class="count">${fetchIssues.length}</span></span>
        </div>

        <div class="info-grid">
          <section class="panel">
            <h3>比較条件</h3>
            <div class="detail-list">
              <div class="detail-row"><span class="detail-key">無視キー</span><span>${esc(reportMeta.ignoreKeys || "-")}</span></div>
              <div class="detail-row"><span class="detail-key">出力対象</span><span>${esc(reportMeta.exportLabel || "全差分")}</span></div>
              <div class="detail-row"><span class="detail-key">出力内容</span><span>${esc(reportMeta.exportContentLabel || "差分のみ")}</span></div>
              <div class="detail-row"><span class="detail-key">セクション</span><span>${esc(sectionText || "-")}</span></div>
            </div>
            ${warning.threshold ? `<div class="warn">警告しきい値: ${warning.threshold} / 合計 ${warning.total}${warning.exceeded ? " (超過)" : ""}</div>` : ""}
            ${reportMeta.truncated ? `<div class="warn">※ 出力負荷を抑えるため、先頭 ${reportMeta.renderedRows} 件のみをレポートに含めています（元件数 ${reportMeta.totalRows} 件）。</div>` : ""}
          </section>
          <section class="panel">
            <h3>レビュー補助</h3>
            <div class="detail-list">
              <div class="detail-row"><span class="detail-key">文字差分</span><span>行内ハイライト対応</span></div>
              <div class="detail-row"><span class="detail-key">検索</span><span>パス / 値 / 理由</span></div>
              <div class="detail-row"><span class="detail-key">ナビゲーション</span><span>左ペインからセクション移動</span></div>
              <div class="detail-row"><span class="detail-key">出力</span><span>Patch JSON / コピー</span></div>
            </div>
          </section>
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
          <p class="muted" style="margin:0;padding:12px 18px 0;font-size:11px;line-height:1.6"><strong>フィールド設定</strong>の差分のみ。ライト表示時は <strong>kintone UI Component（KUC ${KUC_REPORT_VERSION}）</strong> の FieldGroup・TextArea で管理画面に近いフォーム表示にします（先頭で jsDelivr から読み込み）。ダークテーマ・オフライン時は従来のカード表示に切り替わります。左の「同一を隠す」「検索」も連動します。</p>
          <div id="settingsLikeRoot" class="sl-root"></div>
        </div>
      </section>

      <section class="tab-pane" data-report-pane="compare" hidden>
        ${compareHtml || '<div class="content"><div class="no-diff">比較対象設定の出力はありません。</div></div>'}
      </section>
    </div>
  </main>
  <script>${logicScript}<\/script>
</body>
</html>`;
  }
  function syncDiffThemeButton() {
    if (!ui.diffThemeBtn) return;
    ui.diffThemeBtn.textContent = `比較テーマ: ${getThemeDisplayLabel(state.diffViewTheme)}`;
  }
  function renderDiffSuggestionChips() {
    if (!ui.diffSuggestedIgnore) return;
    state.diffIgnoreSuggestions = buildIgnoreKeySuggestions(state.lastDiffRows, ui.ignoreKeys.value);
    if (!state.lastDiffRows.length) {
      ui.diffSuggestedIgnore.innerHTML = '<span style="color:#94a3b8;font-size:11px;padding:2px 0">差分比較後に候補を表示します</span>';
      return;
    }
    if (!state.diffIgnoreSuggestions.length) {
      ui.diffSuggestedIgnore.innerHTML = '<span style="color:#94a3b8;font-size:11px;padding:2px 0">候補なし</span>';
      return;
    }
    ui.diffSuggestedIgnore.innerHTML = state.diffIgnoreSuggestions.map(
      (item) => `<button type="button" class="btn sub" data-act="addSuggestedIgnore" data-key="${esc(item.key)}" style="font-size:11px;padding:4px 8px">＋${esc(item.key)} <span style="opacity:.8">(${item.count})</span></button>`
    ).join("");
  }
  function renderDiffFilterOptions() {
    if (!ui.diffFilterSection) return;
    const ex = state.diffExcludeSections;
    let sections = [...new Set([...(state.lastDiffRows || []).map((r) => r.sectionKey), ...(state.lastFetchIssues || []).map((r) => r.sectionKey)].filter(Boolean))];
    if (Array.isArray(ex) && ex.length) {
      sections = sections.filter((k) => !ex.includes(k));
    }
    const current = state.diffFilterSection || ui.diffFilterSection.value || "";
    ui.diffFilterSection.innerHTML = '<option value="">全セクション</option>' + sections.map((secKey) => {
      const label = SECTION_DEFS.find((d) => d.key === secKey)?.label || secKey;
      return `<option value="${esc(secKey)}">${esc(label)}</option>`;
    }).join("");
    ui.diffFilterSection.value = sections.includes(current) ? current : "";
    state.diffFilterSection = ui.diffFilterSection.value;
  }
  function renderDiffSelectionState() {
    if (!ui.diffSelectionState) return;
    const total = (state.lastDiffRows || []).length;
    const selected = getSelectedDiffRows().length;
    const rendered = getRenderedDiffRows().length;
    const issues = (state.lastFetchIssues || []).length;
    const normalization = getActiveDiffNormalizationLabels();
    const exportModeLabelMap = {
      all: "全差分",
      selected: "選択差分",
      visible: "現在表示中"
    };
    if (!total && !issues && !state.lastDiffAt) {
      ui.diffSelectionState.textContent = "差分未実行";
      return;
    }
    ui.diffSelectionState.textContent = `選択 ${selected}/${total}件 / 表示中 ${rendered}件 / API取得失敗 ${issues}件 / 出力対象 ${exportModeLabelMap[resolveDiffExportMode()] || "全差分"} / 出力内容 ${getDiffExportContentLabel(resolveDiffExportContentMode())} / 正規化 ${normalization.join(", ") || "-"}`;
  }
  function renderDiffWarningBox() {
    if (!ui.diffWarnBox) return;
    const warning = buildDiffWarningInfo(state.lastDiffRows, state.lastFetchIssues);
    if (!warning.threshold) {
      ui.diffWarnBox.style.display = "none";
      ui.diffWarnBox.textContent = "";
      return;
    }
    if (!warning.exceeded) {
      ui.diffWarnBox.style.display = "none";
      ui.diffWarnBox.textContent = "";
      return;
    }
    ui.diffWarnBox.style.display = "block";
    ui.diffWarnBox.textContent = `差分 ${warning.diffCount}件 + API取得失敗 ${warning.issueCount}件 = ${warning.total}件 が警告しきい値 ${warning.threshold}件以上です。`;
  }
  function formatDiffPathRich(path) {
    const p = String(path || "-");
    if (p === "-") return esc(p);
    const parts = p.split(".").filter(Boolean);
    if (parts.length <= 2) {
      return `<span class="diff-path-line">${esc(p)}</span>`;
    }
    const head = parts.slice(0, -2).join(".");
    const tail = parts.slice(-2).join(".");
    return `<span class="diff-path-line diff-path-rich" title="${esc(p)}"><span class="diff-path-prefix">${esc(head)}</span><span class="diff-path-sep">…</span><span class="diff-path-tail">${esc(tail)}</span></span>`;
  }
  function buildDiffSummaryBars(summary) {
    const seg = [
      ["diff-bar-added", summary.added],
      ["diff-bar-removed", summary.removed],
      ["diff-bar-changed", summary.changed],
      ["diff-bar-moved", summary.moved]
    ].filter(([, n]) => n > 0);
    if (!seg.length) return "";
    const inner = seg.map(
      ([cls, n]) => `<span class="diff-bar ${cls}" style="flex:${Math.max(1, n)}"></span>`
    ).join("");
    return `<div class="diff-summary-bars" role="presentation" aria-hidden="true">${inner}</div>`;
  }
  function buildDiffSectionNavHtml(rows) {
    const cur = ui.diffFilterSection?.value || state.diffFilterSection || "";
    const baseRows = getFilteredDiffRowsWithoutSectionFilter(rows);
    const grouped = groupDiffRowsBySection(baseRows);
    const sel = state.diffSelectedIds || /* @__PURE__ */ new Set();
    const selectedInBase = baseRows.filter((r) => sel.has(r._id)).length;
    const total = baseRows.length;
    const pills = [
      `<button type="button" class="diff-sec-pill${!cur ? " is-active" : ""}" data-diff-sec-nav="" title="全セクション（セクション以外のフィルタはそのまま）">すべて <span class="diff-sec-pill-n">${total}</span>${selectedInBase ? `<span class="diff-sec-pill-sel">選択${selectedInBase}</span>` : ""}</button>`
    ];
    for (const g of grouped) {
      const nSel = g.rows.filter((r) => sel.has(r._id)).length;
      const active = cur === g.key ? " is-active" : "";
      pills.push(
        `<button type="button" class="diff-sec-pill${active}" data-diff-sec-nav="${esc(g.key)}" title="${esc(g.label)}">${esc(g.label)} <span class="diff-sec-pill-n">${g.rows.length}</span>${nSel ? `<span class="diff-sec-pill-sel">${nSel}</span>` : ""}</button>`
      );
    }
    return `<nav class="diff-sec-nav" aria-label="セクションで絞り込み">${pills.join("")}</nav>`;
  }
  function scheduleDiffPopoutSync() {
    queueMicrotask(() => {
      Promise.resolve().then(() => (init_popout(), popout_exports)).then((m) => {
        try {
          m.syncDiffPopoutMirror();
        } catch (e) {
        }
      }).catch(() => {
      });
    });
  }
  function paintDiffOffViewPlaceholder(rows) {
    if (!ui.result) return;
    const list = rows || state.lastDiffRows || [];
    const n = list.length;
    const m = (state.lastFetchIssues || []).length;
    if (!n && !m) {
      ui.result.innerHTML = `<div class="main-result-placeholder"><p class="main-result-placeholder-title">結果エリア（差分比較）</p><p class="main-result-placeholder-body">ここに出す詳細テーブルは<strong>結果整理</strong>サブタブを開いたときだけ表示します。このサブタブでは比較条件の設定に集中できます。</p></div>`;
      return;
    }
    ui.result.innerHTML = `<div class="main-result-placeholder"><p class="main-result-placeholder-title">差分 ${n} 行を保持中${m ? `（取得失敗 ${m} 件）` : ""}</p><p class="main-result-placeholder-body">一覧・チェック・出力は<strong>結果整理</strong>サブタブで行ってください。</p></div>`;
  }
  function renderResultRows(rows) {
    const summary = summarizeRows(rows);
    const severitySummary = summarizeSeverity(rows);
    const fetchSummary = summarizeFetchIssues(state.lastFetchIssues);
    const renameCount = new Set((rows || []).map((row) => row.renameCandidate?.id).filter(Boolean)).size;
    const impactCount = (rows || []).filter((row) => row.impactCount > 0).length;
    syncDiffThemeButton();
    const useCharDiff = !!ui.charDiff?.checked;
    const filteredRows = getFilteredDiffRows(rows);
    const grouped = groupDiffRowsBySection(filteredRows);
    const filteredSeverity = summarizeSeverity(filteredRows);
    const filteredIssues = getFilteredFetchIssues(state.lastFetchIssues);
    const renderedRows = getRenderedDiffRows(rows);
    const selectedRows = getSelectedDiffRows(rows);
    const rawKeyword = String(ui.diffSearch?.value || "").trim();
    renderDiffSelectionState();
    renderDiffSuggestionChips();
    renderDiffWarningBox();
    if (state.activeTab === "diff" && state.activeSubTabs.diff !== "view") {
      paintDiffOffViewPlaceholder(rows);
      scheduleDiffPopoutSync();
      return;
    }
    const sectionNavHtml = rows.length ? buildDiffSectionNavHtml(rows) : "";
    const summaryHtml = `
      <div class="diff-summary-head" role="region" aria-label="差分サマリー">
        ${buildDiffSummaryBars(summary)}
        <div class="diff-summary">
        <span class="diff-pill">総件数 ${summary.total}</span>
        <span class="diff-pill">追加 ${summary.added}</span>
        <span class="diff-pill">削除 ${summary.removed}</span>
        <span class="diff-pill">変更 ${summary.changed}</span>
        <span class="diff-pill">移動 ${summary.moved}</span>
        ${summary.same ? `<span class="diff-pill">同一 ${summary.same}</span>` : ""}
        <span class="diff-pill">高 ${severitySummary.high}</span>
        <span class="diff-pill">中 ${severitySummary.medium}</span>
        <span class="diff-pill">低 ${severitySummary.low}</span>
        <span class="diff-pill">取得失敗 ${fetchSummary.total}</span>
        <span class="diff-pill">選択 ${selectedRows.length}</span>
        <span class="diff-pill">名称変更候補 ${renameCount}</span>
        <span class="diff-pill">影響情報あり ${impactCount}</span>
        <span class="diff-info">表示 ${renderedRows.length}/${filteredRows.length}/${rows.length}</span>
        ${filteredRows.length !== rows.length ? `<span class="diff-info">絞込重要度 高:${filteredSeverity.high} / 中:${filteredSeverity.medium} / 低:${filteredSeverity.low}</span>` : ""}
        ${rawKeyword ? `<span class="diff-info">検索: ${esc(rawKeyword)}</span>` : ""}
        </div>
        ${sectionNavHtml}
      </div>
    `;
    const issueHtml = filteredIssues.length ? `<section class="diff-issues">
      <div class="diff-issues-head">API取得失敗 ${filteredIssues.length}件</div>
      <table class="diff-issue-table">
        <thead><tr><th style="width:200px">セクション</th><th style="width:100px">対象</th><th>内容</th></tr></thead>
        <tbody>${filteredIssues.map((issue) => `<tr>
          <td>${esc(issue.section || issue.sectionKey || "-")}</td>
          <td>${esc(getIssueSideLabel(issue.side))}</td>
          <td><div class="diff-issue-msg">${esc(issue.message || "-")}</div></td>
        </tr>`).join("")}</tbody>
      </table>
    </section>` : "";
    if (!rows.length && !state.lastFetchIssues.length) {
      ui.result.innerHTML = `<div class="diff-view ${state.diffViewTheme === "dark" ? "dark" : ""}">
        ${summaryHtml}
        <div class="diff-empty">差分はありません。</div>
      </div>`;
      scheduleDiffPopoutSync();
      return;
    }
    if (!filteredRows.length && !filteredIssues.length) {
      ui.result.innerHTML = `<div class="diff-view ${state.diffViewTheme === "dark" ? "dark" : ""}">
        ${summaryHtml}
        <div class="diff-empty">検索条件に一致する差分はありません。</div>
      </div>`;
      scheduleDiffPopoutSync();
      return;
    }
    const sectionHtml = grouped.map((g) => {
      const collapsed = state.diffCollapsedSections.has(g.key);
      const head = `<div class="diff-sec-head" data-diff-sec-toggle="${esc(g.key)}">
        <span>${collapsed ? "▶" : "▼"} ${esc(g.label)}</span>
        <span class="diff-sec-meta">${g.rows.length} 件</span>
      </div>`;
      if (collapsed) return `<section class="diff-sec">${head}</section>`;
      const visible = Math.max(40, state.diffSectionVisibleCounts[g.key] || 80);
      const renderRows = g.rows.slice(0, visible);
      const rowsHtml = renderRows.map((r) => {
        const typeLabel = getDiffTypeDisplayLabel(r.type, { moved: !!r.moved });
        const typeClass = r.type === "same" ? "same" : r.type === "added" ? "added" : r.type === "removed" ? "removed" : "changed";
        const sev = r.severity || "low";
        const sevClass = sev === "high" ? "sev-high" : sev === "medium" ? "sev-medium" : "sev-low";
        const cols = renderRowColumns(r, useCharDiff);
        const selected = state.diffSelectedIds.has(r._id) ? "checked" : "";
        const rowAccent = `diff-row-t-${typeClass}`;
        return `<tr class="${rowAccent}${selected ? " diff-row-selected" : ""}">
          <td><input type="checkbox" data-diff-row-id="${esc(r._id)}" ${selected}></td>
          <td><span class="sev-badge ${sevClass}">${esc(getSeverityDisplayLabel(sev))}</span></td>
          <td class="diff-type ${typeClass}">${esc(typeLabel || "-")}</td>
          <td>
            <div class="diff-tools">
              <button type="button" class="diff-mini-btn" data-copy-val="${esc(r.path || "")}">パス</button>
            </div>
            <div class="diff-path diff-path-cell" title="${esc(r.path || "-")}">${formatDiffPathRich(r.path)}</div>
            ${renderDiffRowMeta(r)}
          </td>
          <td class="diff-cell">${cols.left}</td>
          <td class="diff-cell">${cols.right}</td>
        </tr>`;
      }).join("");
      const remain = g.rows.length - renderRows.length;
      const moreHtml = remain > 0 ? `<div class="diff-more"><button class="btn sub" data-act="moreDiffRows" data-sec="${esc(g.key)}">さらに表示 (${remain}件)</button></div>` : "";
      return `<section class="diff-sec">
        ${head}
        <table class="diff-table">
          <thead><tr><th style="width:56px">選択</th><th style="width:90px">重要度</th><th style="width:120px">種別</th><th style="width:260px">パス</th><th>比較元</th><th>比較先</th></tr></thead>
          <tbody>${rowsHtml}</tbody>
        </table>
        ${moreHtml}
      </section>`;
    }).join("");
    ui.result.innerHTML = `<div class="diff-view ${state.diffViewTheme === "dark" ? "dark" : ""}">
      ${summaryHtml}
      ${issueHtml}
      ${!rows.length ? '<div class="diff-empty">比較差分はありません。API取得失敗のみ検出されています。</div>' : ""}
      ${sectionHtml}
    </div>`;
    scheduleDiffPopoutSync();
  }
  var MAIN_RESULT_IDLE_HTML;
  var init_export = __esm({
    "src/diff/export.js"() {
      init_constants();
      init_utils();
      init_state();
      init_engine();
      init_enrich();
      init_filter();
      init_api();
      MAIN_RESULT_IDLE_HTML = `<div class="main-result-placeholder"><p class="main-result-placeholder-title">結果エリア</p><p class="main-result-placeholder-body">このタブの操作結果やログがここに表示されます。</p></div>`;
    }
  });

  // src/diff/filter.js
  function normalizeDiffFavoritePath(path) {
    return String(path || "").trim();
  }
  function isDiffPathFavorite(path) {
    return state.diffFavoritePaths.has(normalizeDiffFavoritePath(path));
  }
  function getCurrentDiffFilterState2() {
    return {
      keyword: String(ui.diffSearch?.value || "").trim().toLowerCase(),
      section: ui.diffFilterSection?.value || state.diffFilterSection || "",
      type: ui.diffFilterType?.value || state.diffFilterType || "",
      severity: ui.diffFilterSeverity?.value || state.diffFilterSeverity || "",
      searchByFieldName: !!ui.diffSearchFieldName?.checked || !!state.diffSearchFieldName,
      sourceBundle: state.lastSourceBundle,
      targetBundle: state.lastTargetBundle,
      favoritesOnly: !!state.diffFavoritesOnly
    };
  }
  function diffRowMatchesFilters2(row, filters) {
    if (filters.keyword) {
      if (filters.searchByFieldName) {
        if (!diffRowMatchesFieldNameKeyword(row, filters.keyword, filters.sourceBundle, filters.targetBundle)) return false;
      } else if (!diffRowMatchesKeyword(row, filters.keyword)) {
        return false;
      }
    }
    if (filters.section && row.sectionKey !== filters.section) return false;
    if (filters.type === "moved") {
      if (!row.moved) return false;
    } else if (filters.type && row.type !== filters.type) {
      return false;
    }
    if (filters.severity && String(row.severity || "low") !== filters.severity) return false;
    if (filters.favoritesOnly && !isDiffPathFavorite(row.path)) return false;
    return true;
  }
  function getFilteredDiffRows2(rows) {
    const list = rows || state.lastDiffRows || [];
    const filters = getCurrentDiffFilterState2();
    const ex = state.diffExcludeSections;
    return list.filter((row) => {
      if (Array.isArray(ex) && ex.length && ex.includes(row.sectionKey)) return false;
      return diffRowMatchesFilters2(row, filters);
    });
  }
  function getFilteredDiffRowsWithoutSectionFilter(rows) {
    const list = rows || state.lastDiffRows || [];
    const filters = { ...getCurrentDiffFilterState2(), section: "" };
    const ex = state.diffExcludeSections;
    return list.filter((row) => {
      if (Array.isArray(ex) && ex.length && ex.includes(row.sectionKey)) return false;
      return diffRowMatchesFilters2(row, filters);
    });
  }
  function getSelectedDiffRows2(rows) {
    const selected = state.diffSelectedIds || /* @__PURE__ */ new Set();
    return (rows || state.lastDiffRows || []).filter((row) => selected.has(row._id));
  }
  function getRenderedDiffRows2(rows) {
    const filtered = getFilteredDiffRows2(rows);
    const grouped = groupDiffRowsBySection(filtered);
    const out = [];
    for (const group of grouped) {
      if (state.diffCollapsedSections.has(group.key)) continue;
      const visible = Math.max(40, state.diffSectionVisibleCounts[group.key] || 80);
      out.push(...group.rows.slice(0, visible));
    }
    return out;
  }
  function resolveDiffExportMode2() {
    return ui.diffExportMode?.value || state.diffExportMode || "all";
  }
  function resolveDiffExportContentMode2() {
    return ui.diffExportContent?.value || state.diffExportContent || "diffOnly";
  }
  function getDiffExportContentLabel2(mode) {
    return mode === "withCompared" ? "差分 + 比較設定" : "差分のみ";
  }
  function buildIgnoreKeySuggestions(rows, ignoreKeysText) {
    const ignoreRules = parseIgnoreRules(ignoreKeysText);
    const counts = /* @__PURE__ */ new Map();
    for (const row of getActualDiffRows(rows)) {
      if (row.severity !== "low") continue;
      const leaf = normalizeIgnoreToken(getPathLeafKey(row.path));
      if (!leaf || leaf.length < 2) continue;
      if (ignoreRules.keySet.has(leaf) || DEFAULT_IGNORE_KEYS.has(leaf)) continue;
      if (!/^[a-z0-9_]+$/i.test(leaf)) continue;
      if (leaf === normalizeIgnoreToken(row.sectionKey)) continue;
      const cur = counts.get(leaf) || { key: leaf, count: 0, sections: /* @__PURE__ */ new Set() };
      cur.count += 1;
      if (row.sectionKey) cur.sections.add(row.sectionKey);
      counts.set(leaf, cur);
    }
    return [...counts.values()].filter((item) => item.count >= 2).sort((a, b) => b.count - a.count || b.sections.size - a.sections.size || a.key.localeCompare(b.key)).slice(0, 8).map((item) => ({ key: item.key, count: item.count, sectionCount: item.sections.size }));
  }
  var init_filter = __esm({
    "src/diff/filter.js"() {
      "use strict";
      init_constants();
      init_state();
      init_engine();
      init_api();
      init_export();
    }
  });

  // src/reflect/nodeModeUi.js
  function isReflectNodeModeEffective() {
    return !!ui.nodeMode?.checked && !ui.reflectSimpleMode?.checked;
  }
  var init_nodeModeUi = __esm({
    "src/reflect/nodeModeUi.js"() {
      "use strict";
      init_state();
    }
  });

  // src/ui/components.js
  function setComponentUi(uiRefs) {
    ui3 = uiRefs;
  }
  function setComponentDeps(overrides) {
    Object.assign(deps, overrides);
  }
  function setStatus(msg, isError) {
    if (!ui3.status) return;
    ui3.status.textContent = msg;
    ui3.status.style.background = "";
    ui3.status.style.color = "";
    ui3.status.classList.remove("status--neutral", "status--error");
    ui3.status.classList.add(isError ? "status--error" : "status--neutral");
    const bar = ui3.status.closest?.(".status-bar");
    if (bar) bar.classList.toggle("status-bar--error", !!isError);
  }
  function setBusy(isBusy, message) {
    const root2 = ui3.status?.closest(`#${CSS.escape?.("kintone-unified-suite-v2") || "kintone-unified-suite-v2"}`);
    if (message && ui3.busyText) ui3.busyText.textContent = message;
    if (root2) root2.classList.toggle("busy", !!isBusy);
  }
  function switchSubTab(parentKey, subKey, options = {}) {
    if (!parentKey) return;
    const tabs = ui3.subTabs.filter((tab) => tab.dataset.subtabParent === parentKey);
    const panes = ui3.subPanes.filter((pane) => pane.dataset.subpaneParent === parentKey);
    if (!tabs.length || !panes.length) return;
    const fallback = state.activeSubTabs[parentKey] || tabs[0]?.dataset.subtab || "";
    const key = tabs.some((tab) => tab.dataset.subtab === subKey) ? subKey : fallback;
    state.activeSubTabs[parentKey] = key;
    tabs.forEach((tab) => tab.classList.toggle("active", tab.dataset.subtab === key));
    panes.forEach((pane) => pane.classList.toggle("active", pane.dataset.subpane === key));
    if (state.guidedTourActive && deps.scheduleGuidedTourLayout) deps.scheduleGuidedTourLayout();
    if (options.persist !== false) saveCurrentDialogState();
  }
  function switchTab(tabKey, options) {
    const key = ui3.tabs.some((t) => t.dataset.tab === tabKey) ? tabKey : "diff";
    state.activeTab = key;
    ui3.tabs.forEach((t) => t.classList.toggle("active", t.dataset.tab === key));
    ui3.panes.forEach((p) => p.classList.toggle("active", p.dataset.pane === key));
    const root2 = getToolDocument().getElementById("kintone-unified-suite-v2");
    if (root2) {
      const needs = TAB_CONNECTION_NEEDS[key] || {};
      root2.classList.toggle("tab-is-diff-or-reflect", key === "diff" || key === "reflect");
      root2.classList.toggle("tab-needs-app-inputs", !!needs.appInputs);
      root2.classList.toggle("tab-needs-target", !!needs.target);
      root2.classList.toggle("tab-needs-connection-actions", !!needs.connectionActions);
      const lead = root2.querySelector("#u_connectionLead");
      if (lead) {
        if (!needs.appInputs) {
          lead.textContent = "";
        } else if (needs.target) {
          lead.textContent = "比較元・比較先の数値IDと、ゲストスペース利用時はゲストIDを入力します。";
        } else {
          lead.textContent = "対象アプリの数値IDと、ゲストスペース利用時はゲストIDを入力します。";
        }
      }
    }
    if (state.guidedTourActive && deps.scheduleGuidedTourLayout) deps.scheduleGuidedTourLayout();
    if (!options || options.persist !== false) saveCurrentDialogState();
  }
  function diffScopeTooltip(s) {
    let t = `API ${s.endpoint} の設定を比較・取得の対象に含めます。`;
    if (!s.put) t += "（PUT 反映 API はありません。差分確認・エクスポート用途向けです。）";
    if (s.key === "pluginSettings") {
      t += " 試験的機能: 反映先にプラグインが未インストールだとエラーになることがあります。";
    }
    return t;
  }
  function renderScopeChips() {
    ui3.diffScopes.innerHTML = SECTION_DEFS.map(
      (s) => `<label class="chip" title="${esc(diffScopeTooltip(s))}"><input type="checkbox" value="${s.key}" ${s.key === "pluginSettings" ? "" : "checked"}>${s.label}</label>`
    ).join("");
    ui3.applyScopes.innerHTML = SECTION_DEFS.filter((s) => s.put).map(
      (s) => `<label class="chip" title="${esc(diffScopeTooltip(s))}"><input type="checkbox" value="${s.key}" ${s.key === "pluginSettings" ? "" : "checked"}>${s.label}</label>`
    ).join("");
    ui3.settingsExportScopes.innerHTML = SETTINGS_EXPORT_SCOPE_DEFS.map(
      (s) => `<label class="chip" title="${esc(diffScopeTooltip(s))}"><input type="checkbox" value="${s.key}" checked>${s.label}</label>`
    ).join("");
  }
  function setSettingsExportScopeSelection(checked) {
    [...ui3.settingsExportScopes.querySelectorAll('input[type="checkbox"]')].forEach((c) => {
      c.checked = !!checked;
    });
    saveCurrentDialogState();
  }
  function renderIgnoreKeyChips() {
    const tags = getToolDocument().getElementById("u_ignoreKeysTags");
    if (!tags) return;
    const val = ui3.ignoreKeys.value || "";
    const keys = val.split(",").map((k) => k.trim()).filter(Boolean);
    if (keys.length === 0) {
      tags.innerHTML = '<span style="color:#94a3b8;font-size:11px;padding:2px 0">追加の無視キーなし（上のデフォルトキーは常に除外）</span>';
      renderDiffSuggestionChips2();
      return;
    }
    tags.innerHTML = keys.map(
      (k) => `<span class="chip" style="user-select:none">${esc(k)}<button type="button" style="border:none;background:none;cursor:pointer;padding:0 0 0 4px;font-size:12px;color:#64748b;line-height:1" data-act="removeIgnoreKey" data-key="${esc(k)}">×</button></span>`
    ).join("");
    renderDiffSuggestionChips2();
  }
  function renderDiffSuggestionChips2() {
    if (!ui3.diffSuggestedIgnore) return;
    state.diffIgnoreSuggestions = buildIgnoreKeySuggestions(state.lastDiffRows, ui3.ignoreKeys.value);
    if (!state.lastDiffRows.length) {
      ui3.diffSuggestedIgnore.innerHTML = '<span style="color:#94a3b8;font-size:11px;padding:2px 0">差分比較後に候補を表示します</span>';
      return;
    }
    if (!state.diffIgnoreSuggestions.length) {
      ui3.diffSuggestedIgnore.innerHTML = '<span style="color:#94a3b8;font-size:11px;padding:2px 0">候補なし</span>';
      return;
    }
    ui3.diffSuggestedIgnore.innerHTML = state.diffIgnoreSuggestions.map(
      (item) => `<button type="button" class="btn sub" data-act="addSuggestedIgnore" data-key="${esc(item.key)}" style="font-size:11px;padding:4px 8px">＋${esc(item.key)} <span style="opacity:.8">(${item.count})</span></button>`
    ).join("");
  }
  function renderDiffSelectionState2() {
    if (!ui3.diffSelectionState) return;
    const total = (state.lastDiffRows || []).length;
    const selected = getSelectedDiffRows2().length;
    const rendered = getRenderedDiffRows2().length;
    const issues = (state.lastFetchIssues || []).length;
    const normalization = getActiveDiffNormalizationLabels();
    if (!total && !issues && !state.lastDiffAt) {
      ui3.diffSelectionState.textContent = "差分未実行";
      return;
    }
    ui3.diffSelectionState.textContent = `選択 ${selected}/${total}件 / 表示中 ${rendered}件 / API取得失敗 ${issues}件 / 出力対象 ${resolveDiffExportMode2() === "all" ? "全差分" : resolveDiffExportMode2() === "selected" ? "選択差分" : resolveDiffExportMode2() === "visible" ? "現在表示中" : "全差分"} / 出力内容 ${getDiffExportContentLabel2(resolveDiffExportContentMode2())} / 正規化 ${normalization.join(", ") || "-"}`;
  }
  function renderLookupMapRows() {
    const container = getToolDocument().getElementById("u_lookupMapRows");
    if (!container) return;
    let map = {};
    try {
      map = deps.parseLookupMapInput(ui3.lookupMap.value);
    } catch (e) {
      map = {};
    }
    const entries = Object.entries(map);
    if (entries.length === 0) {
      container.innerHTML = '<div class="muted" style="padding:2px 0">変換ルールなし</div>';
      return;
    }
    container.innerHTML = entries.map(
      ([from, to], i) => `<div class="btns" style="margin-top:4px" data-lookup-row="${i}"><span style="align-self:center;font-size:11px;color:#64748b;white-space:nowrap">変換元</span><input type="text" class="lookup-from" value="${esc(from)}" placeholder="変換元 AppID" style="flex:1;min-width:0"><span style="align-self:center;padding:0 4px;color:#64748b">→</span><span style="align-self:center;font-size:11px;color:#64748b;white-space:nowrap">変換先</span><input type="text" class="lookup-to" value="${esc(to)}" placeholder="変換先 AppID" style="flex:1;min-width:0"><button type="button" class="btn sub" data-act="removeLookupMapRow" data-row="${i}" style="padding:4px 8px">×</button></div>`
    ).join("");
  }
  function syncLookupMapFromRows() {
    const container = getToolDocument().getElementById("u_lookupMapRows");
    if (!container) return;
    const rows = container.querySelectorAll("[data-lookup-row]");
    const map = {};
    rows.forEach((row) => {
      const from = (row.querySelector(".lookup-from")?.value || "").trim();
      const to = (row.querySelector(".lookup-to")?.value || "").trim();
      if (from && to) map[from] = to;
    });
    ui3.lookupMap.value = Object.keys(map).length ? JSON.stringify(map) : "";
  }
  function resolveBundleRevision2(bundle) {
    const revisions = bundle?.meta?.sectionRevisions || {};
    for (const key of ["appSettings", "fieldSettings", "layoutSettings", "viewSettings", "processSettings"]) {
      const revision = revisions[key];
      if (revision != null && revision !== "") return String(revision);
    }
    const first = Object.values(revisions).find((value) => value != null && value !== "");
    return first != null ? String(first) : "";
  }
  function renderBundleState() {
    const fmtFetchTime = (v) => {
      if (!v) return "-";
      try {
        return new Date(v).toLocaleString();
      } catch (e) {
        return String(v);
      }
    };
    const describeBundle = (label, bundle, importedName, imported) => {
      if (!bundle) return `${label}: API取得`;
      const previewText = getPreviewStateLabel(bundle.preview);
      const revisionText = resolveBundleRevision2(bundle) || "-";
      const guestText = bundle.guestId ? `ゲスト ${bundle.guestId}` : "通常空間";
      if (imported) {
        return `${label}: 読込済み(${importedName || bundle.appId || "-"}) [${previewText} / rev ${revisionText} / ${guestText}]`;
      }
      return `${label}: API取得済み(アプリ ${bundle.appId || "-"} / ${previewText} / rev ${revisionText} / ${guestText} / ${fmtFetchTime(bundle.fetchedAt)})`;
    };
    const sourceText = describeBundle("比較元", state.importedSourceBundle || state.lastSourceBundle, state.importedSourceName, !!state.importedSourceBundle);
    const targetText = describeBundle("比較先", state.importedTargetBundle || state.lastTargetBundle, state.importedTargetName, !!state.importedTargetBundle);
    ui3.bundleState.textContent = `${sourceText} / ${targetText}`;
    const rangeMode = ui3.nodeMode?.checked && !ui3.reflectSimpleMode?.checked ? `選択ノード(${state.reflectSelectedIds.size})` : ui3.applyDiffOnly?.checked ? "前回差分セクションのみ" : "選択セクション";
    let readMeta = "";
    try {
      const c = deps.commonParams();
      readMeta = `取得API 比較元:${getPreviewStateLabel(c.source.preview)} · 比較先:${getPreviewStateLabel(c.target.preview)}`;
    } catch (e) {
      readMeta = "取得API 比較元:- · 比較先:-";
    }
    ui3.reflectMode.textContent = `${readMeta} · 反映PUT: 比較先プレビュー（常にプレビューAPI） · 範囲: ${rangeMode}`;
    if (ui3.commonDataState) {
      const diffSummary = summarizeRows(state.lastDiffRows || []);
      const diffInfo = state.lastDiffAt ? `差分: ${fmtFetchTime(state.lastDiffAt)} (差分 ${countActualDiffRows(state.lastDiffRows)}件 / 同一 ${diffSummary.same}件 / 取得失敗 ${state.lastFetchIssues.length}件)` : "差分: 未実行";
      ui3.commonDataState.textContent = `${sourceText} / ${targetText} / ${diffInfo}`;
    }
    renderDiffSelectionState2();
    renderReflectAssistPanel();
  }
  function syncReflectSimpleLayout() {
    const layout = getToolDocument().getElementById("u_reflectLayout");
    if (layout && ui3.reflectSimpleMode) {
      layout.classList.toggle("reflect-layout--simple", !!ui3.reflectSimpleMode.checked);
    }
  }
  function renderReflectModeUi() {
    const node = isReflectNodeModeEffective();
    const scopeChecks = [...ui3.applyScopes.querySelectorAll('input[type="checkbox"]')];
    scopeChecks.forEach((c) => {
      c.disabled = node;
    });
    if (ui3.applyDiffOnly) ui3.applyDiffOnly.disabled = node;
    ui3.nodeWarn.style.display = node ? "block" : "none";
    ui3.nodeControls.style.display = node ? "block" : "none";
    if (ui3.reflectNodeWorkbench) ui3.reflectNodeWorkbench.style.display = node ? "flex" : "none";
    ui3.reflectNodeList.style.display = node ? "block" : "none";
    if (ui3.reflectNodeDetail) ui3.reflectNodeDetail.style.display = node ? "flex" : "none";
    if (ui3.nodeFilterBlock) ui3.nodeFilterBlock.style.display = node ? "block" : "none";
    if (ui3.sectionOptionsBlock) ui3.sectionOptionsBlock.style.display = node ? "none" : "block";
    if (ui3.reflectHint) {
      ui3.reflectHint.style.display = node ? "block" : "none";
      ui3.reflectHint.textContent = node ? `ノード反映モード: 差分ノードを選択して部分反映します（選択: ${state.reflectSelectedIds.size}件 / Undo: ${state.reflectUndoStack.length}）` : "";
    }
    if (ui3.modeSectionBtn && ui3.modeNodeBtn) {
      ui3.modeSectionBtn.className = node ? "btn sub reflect-mode-tab" : "btn ok reflect-mode-tab";
      ui3.modeSectionBtn.style.cssText = "padding:5px 10px;font-size:11px";
      ui3.modeNodeBtn.className = node ? "btn ok reflect-mode-tab" : "btn sub reflect-mode-tab";
      ui3.modeNodeBtn.style.cssText = "padding:5px 10px;font-size:11px";
      ui3.modeSectionBtn.setAttribute("aria-selected", node ? "false" : "true");
      ui3.modeNodeBtn.setAttribute("aria-selected", node ? "true" : "false");
    }
    if (ui3.reflectOverview) ui3.reflectOverview.style.display = "block";
    if (ui3.reflectAssist) ui3.reflectAssist.style.display = "block";
    if (ui3.reflectOptionsCard) ui3.reflectOptionsCard.style.display = "block";
    syncReflectSimpleLayout();
    renderReflectAssistPanel();
    renderReflectSidebar();
    renderReflectNodeDetail();
  }
  function getEffectiveReflectScopeInfo() {
    const baseScopes = deps.selectedScopeKeys(ui3.applyScopes);
    if (isReflectNodeModeEffective()) {
      return { baseScopes, effectiveScopes: [...baseScopes], warning: "" };
    }
    try {
      return {
        baseScopes,
        effectiveScopes: deps.resolveApplyScopes(baseScopes),
        warning: ""
      };
    } catch (e) {
      return {
        baseScopes,
        effectiveScopes: [...baseScopes],
        warning: e.message || String(e)
      };
    }
  }
  function getCurrentReflectPlanSignature() {
    const c = deps.commonParams();
    if (isReflectNodeModeEffective()) {
      const rows = deps.getSelectedReflectRows();
      if (!rows.length) return "";
      const nodeSigRows = rows.map((r) => ({ id: r._id, sectionKey: r.sectionKey, mode: deps.reflectRowModeById(r._id), type: r.type, path: r.path })).sort((a, b) => String(a.id).localeCompare(String(b.id)));
      return deps.makeApplyPlanSignature("nodes", {
        targetApp: c.target.appId,
        targetGuest: c.target.guestId,
        sourceApp: c.source.appId,
        sourceGuest: c.source.guestId,
        nodes: nodeSigRows,
        lookupMap: ui3.lookupMap.value.trim()
      });
    }
    const scopeInfo = getEffectiveReflectScopeInfo();
    if (!scopeInfo.baseScopes.length || scopeInfo.warning) return "";
    return deps.makeApplyPlanSignature("section", {
      targetApp: c.target.appId,
      targetGuest: c.target.guestId,
      sourceApp: c.source.appId,
      sourceGuest: c.source.guestId,
      scopes: scopeInfo.effectiveScopes,
      lookupMap: ui3.lookupMap.value.trim()
    });
  }
  function buildReflectAssistHtml() {
    const c = deps.commonParams();
    const isNode = isReflectNodeModeEffective();
    const scopeInfo = getEffectiveReflectScopeInfo();
    const effectiveScopeSet = new Set(scopeInfo.effectiveScopes);
    const diffReady = !!state.lastDiffAt && state.lastDiffSignature === deps.currentDiffSignature();
    const actualDiffRows = getActualDiffRows(state.lastDiffRows || []);
    const selectedNodeRows = deps.getSelectedReflectRows();
    const targetRows = isNode ? selectedNodeRows : actualDiffRows.filter((row) => effectiveScopeSet.has(row.sectionKey));
    const sev = summarizeSeverity(targetRows);
    const planSignature = getCurrentReflectPlanSignature();
    const planReady = !!state.lastApplyPlan && !!planSignature && state.lastApplyPlan.signature === planSignature;
    const planTime = planReady ? new Date(state.lastApplyPlan.createdAt).toLocaleString() : "";
    const backupReady = !!ui3.autoBackupPreview?.checked;
    const stopOnError = !!ui3.stopOnError?.checked;
    const deployAfter = !!ui3.doDeploy?.checked;
    const backupState = ui3.backupStatus && ui3.backupStatus.style.display !== "none" ? String(ui3.backupStatus.textContent || "").trim() : "";
    const targetCountLabel = isNode ? "選択ノード" : "実反映セクション";
    const targetCountValue = isNode ? selectedNodeRows.length : scopeInfo.effectiveScopes.length;
    const safetyLabel = backupReady && stopOnError && !deployAfter ? "推奨設定" : "要確認";
    const warnings = [];
    if (!diffReady) warnings.push("差分比較が未実行、または条件が変わっています。まず差分を確定してください。");
    if (!scopeInfo.baseScopes.length && !isNode) warnings.push("左の一覧から反映セクションを選択してください。");
    if (scopeInfo.warning) warnings.push(scopeInfo.warning);
    if (isNode && !state.reflectRows.length) warnings.push("ノードモードです。まず「差分ノード読込」で候補を表示してください。");
    if (!backupReady) warnings.push("バックアップ自動保存がOFFです。反映前に手動バックアップを推奨します。");
    const steps = [
      {
        no: "Step 1",
        title: isNode ? "差分と反映ノードを確認" : "差分と反映セクションを確認",
        desc: diffReady ? `${countActualDiffRows(state.lastDiffRows)}件の差分を保持中` : "差分比較を最新状態にしてください",
        cls: diffReady ? "done" : "current"
      },
      {
        no: "Step 2",
        title: "反映プラン確認",
        desc: planReady ? `最新プラン確認済み${planTime ? ` (${planTime})` : ""}` : "APIリクエスト内容を確認して安全性を見ます",
        cls: planReady ? "done" : diffReady ? "current" : ""
      },
      {
        no: "Step 3",
        title: "比較先プレビューへ反映",
        desc: backupReady ? "バックアップ保存とあわせて実行できます" : "反映前にバックアップを取ってから進めてください",
        cls: planReady ? "current" : ""
      }
    ];
    const primaryDiffAction = diffReady ? `<button class="btn sub" data-act="goDiffReview">差分結果を確認</button>` : `<button class="btn sub" data-act="runDiff">差分比較を実行</button>`;
    const nodeLoadAction = isNode && !state.reflectRows.length ? '<button class="btn sub" data-act="loadReflectNodes">差分ノード読込</button>' : "";
    const scopeDiffAction = !isNode && actualDiffRows.length ? '<button class="btn sub" data-act="applyScopeDiffOnly">差分のみ選択</button>' : "";
    return `<div class="reflect-assist">
    <div class="reflect-guide">
      <div class="reflect-guide-head">
        <div>
          <div class="reflect-guide-title">${isNode ? "細かい差分を選んでプレビューへ反映します" : "セクション単位で安全にプレビューへ反映します"}</div>
          <div class="reflect-guide-sub">比較先アプリ ${esc(c.target.appId || "-")} / 反映先は常にプレビューです。まず差分を見て、次にプラン確認、その後に反映の順で進めます。</div>
        </div>
        <span class="reflect-guide-badge">${esc(isNode ? "ノード選択モード" : "セクションモード")}</span>
      </div>
      <div class="reflect-step-grid">
        ${steps.map((step) => `<div class="reflect-step-card${step.cls ? ` ${step.cls}` : ""}">
          <div class="reflect-step-no">${esc(step.no)}</div>
          <div class="reflect-step-title">${esc(step.title)}</div>
          <div class="reflect-step-desc">${esc(step.desc)}</div>
        </div>`).join("")}
      </div>
    </div>
    <div class="reflect-summary-grid">
      <div class="reflect-summary-card">
        <div class="reflect-summary-label">対象</div>
        <div class="reflect-summary-value">${targetCountValue}</div>
        <div class="reflect-summary-meta">${esc(targetCountLabel)} / ${isNode ? `候補 ${state.reflectRows.length}件` : `選択 ${scopeInfo.baseScopes.length}件`}</div>
      </div>
      <div class="reflect-summary-card">
        <div class="reflect-summary-label">対象差分</div>
        <div class="reflect-summary-value">${targetRows.length}</div>
        <div class="reflect-summary-meta">高 ${sev.high} / 中 ${sev.medium} / 低 ${sev.low}</div>
      </div>
      <div class="reflect-summary-card">
        <div class="reflect-summary-label">安全設定</div>
        <div class="reflect-summary-value">${esc(safetyLabel)}</div>
        <div class="reflect-summary-meta">バックアップ ${backupReady ? "ON" : "OFF"} / エラー時 ${stopOnError ? "中断" : "継続"} / デプロイ ${deployAfter ? "ON" : "OFF"}</div>
      </div>
      <div class="reflect-summary-card">
        <div class="reflect-summary-label">プラン状態</div>
        <div class="reflect-summary-value">${esc(planReady ? "確認済み" : "未確認")}</div>
        <div class="reflect-summary-meta">${esc(planReady ? `最新確認: ${planTime}` : "まだ反映プラン確認を実行していません")}</div>
      </div>
    </div>
    <div class="reflect-context-actions">
      ${primaryDiffAction}
      ${nodeLoadAction}
      ${scopeDiffAction}
    </div>
    <p class="reflect-action-hint">プラン確認・バックアップ・プレビュー反映・本番デプロイは<strong>画面下の固定バー</strong>から操作します。</p>
    ${warnings.length ? warnings.map((msg) => `<div class="reflect-warning">${esc(msg)}</div>`).join("") : '<div class="reflect-good">現在の条件でそのまま進めます。変更前の確認は「反映プラン確認」で行えます。</div>'}
    ${backupState ? `<div class="reflect-good">${esc(backupState)}</div>` : ""}
  </div>`;
  }
  function renderReflectPlanInline() {
    const el = getToolDocument().getElementById("u_reflectPlanInline");
    if (!el) return;
    const planSig = getCurrentReflectPlanSignature();
    const plan = state.lastApplyPlan;
    const hasPlan = !!(plan && Array.isArray(plan.logs) && plan.logs.length);
    const planReady = hasPlan && !!planSig && plan.signature === planSig;
    const stalePlan = hasPlan && (!!planSig ? plan.signature !== planSig : true);
    if (planReady) {
      const stamp = new Date(plan.createdAt).toLocaleString();
      const logs = plan.logs || [];
      const maxLines = 48;
      const head = logs.slice(0, maxLines).join("\n");
      const more = logs.length > maxLines ? `
… 他 ${logs.length - maxLines} 行（全文は下部の結果エリアを参照）` : "";
      el.innerHTML = `<div class="reflect-plan-inline__head">
      <span class="reflect-plan-inline__title">反映プラン（現在の条件と一致）</span>
      <span class="reflect-plan-inline__meta">予定リクエスト ${plan.totalReq || 0} 件 · ${esc(stamp)}</span>
    </div>
    <pre class="reflect-plan-inline__pre">${esc(head)}${esc(more)}</pre>`;
      return;
    }
    if (stalePlan && hasPlan) {
      el.innerHTML = `<div class="reflect-plan-inline reflect-plan-inline--stale">
      <div class="reflect-plan-inline__head"><span class="reflect-plan-inline__title">プランは現在の条件と一致しません</span></div>
      <p class="reflect-plan-inline__muted">差分・反映セクション・ノード・ルックアップ等が変わった可能性があります。再度「反映プラン確認」を実行してください。</p>
    </div>`;
      return;
    }
    el.innerHTML = `<div class="reflect-plan-inline reflect-plan-inline--empty">
    <div class="reflect-plan-inline__head"><span class="reflect-plan-inline__title">プラン要約</span></div>
    <p class="reflect-plan-inline__muted">「反映プラン確認」を実行すると、ここにログ要約が表示されます。詳細は下部の<strong>結果</strong>エリアにも出力されます。</p>
  </div>`;
  }
  function renderReflectFooterBadges() {
    const el = getToolDocument().getElementById("u_reflectFooterBadges");
    if (!el) return;
    const diffReady = !!state.lastDiffAt && state.lastDiffSignature === deps.currentDiffSignature();
    const planSig = getCurrentReflectPlanSignature();
    const plan = state.lastApplyPlan;
    const planReady = !!(plan && planSig && plan.signature === planSig);
    el.innerHTML = `
    <span class="reflect-footer-badge${diffReady ? " reflect-footer-badge--ok" : " reflect-footer-badge--warn"}">差分 ${diffReady ? "最新" : "要再実行"}</span>
    <span class="reflect-footer-badge${planReady ? " reflect-footer-badge--ok" : " reflect-footer-badge--warn"}">プラン ${planReady ? "確認済み" : "未確認"}</span>`;
  }
  function renderReflectAssistPanel() {
    if (!ui3.reflectAssist) return;
    ui3.reflectAssist.innerHTML = buildReflectAssistHtml();
    renderReflectHowto();
    renderReflectPlanInline();
    renderReflectFooterBadges();
  }
  function renderReflectHowto() {
    if (!ui3.reflectHowto) return;
    const isNode = isReflectNodeModeEffective();
    const diffReady = !!state.lastDiffAt && state.lastDiffSignature === deps.currentDiffSignature();
    const planSig = getCurrentReflectPlanSignature();
    const planReady = !!(state.lastApplyPlan && planSig && state.lastApplyPlan.signature === planSig);
    const selectedNodes = deps.getSelectedReflectRows().length;
    const nodeRows = (state.reflectRows || []).length;
    const modeLabel = isNode ? "ノード選択モード" : "セクションモード";
    const nodeStep = isNode ? `<li style="margin:4px 0">${nodeRows > 0 ? "✅" : "⬜"} <strong>差分ノード読込</strong>（候補 ${nodeRows}件 / 選択 ${selectedNodes}件）</li>` : "";
    const step1 = diffReady ? "✅" : "⬜";
    const step2 = planReady ? "✅" : "⬜";
    const step3 = planReady ? "▶" : "⬜";
    ui3.reflectHowto.innerHTML = `
    <details open style="border:1px solid #dbe3ed;border-radius:10px;background:#fff;padding:8px 10px">
      <summary style="cursor:pointer;font-weight:700;color:#1e293b">使い方ガイド（${esc(modeLabel)}）</summary>
      <div style="margin-top:8px;font-size:12px;color:#334155;line-height:1.7">
        <ol style="margin:0;padding-left:18px">
          <li style="margin:4px 0">${step1} <strong>差分比較</strong>を実行して最新差分を作成</li>
          ${nodeStep}
          <li style="margin:4px 0">${step2} <strong>反映プラン確認</strong>で API 実行内容を確認</li>
          <li style="margin:4px 0">${step3} <strong>比較元 → 比較先(プレビュー) 反映</strong>を実行</li>
        </ol>
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px">
          <button class="btn sub" data-act="runDiff">① 差分比較</button>
          ${isNode ? '<button class="btn sub" data-act="loadReflectNodes">② 差分ノード読込</button>' : ""}
          <button class="btn sub" data-act="previewApplyPlan">③ 反映プラン確認</button>
          <button class="btn ok" data-act="applyPreview">④ プレビュー反映</button>
        </div>
      </div>
    </details>`;
  }
  function getDiffCountsBySection() {
    const counts = {};
    for (const row of getActualDiffRows(state.lastDiffRows || [])) {
      const key = row.sectionKey || "";
      if (!key) continue;
      if (!counts[key]) counts[key] = { total: 0, added: 0, removed: 0, changed: 0 };
      counts[key].total++;
      if (row.type === "added") counts[key].added++;
      else if (row.type === "removed") counts[key].removed++;
      else if (row.type === "changed") counts[key].changed++;
    }
    return counts;
  }
  function renderReflectSidebar() {
    const container = getToolDocument().getElementById("u_reflectSidebarSections");
    if (!container) return;
    const diffCounts = getDiffCountsBySection();
    const selectedScopes = new Set(deps.selectedScopeKeys(ui3.applyScopes));
    const isNode = isReflectNodeModeEffective();
    const activeSec = state.reflectActiveSidebarSection;
    let checkedCount = 0;
    const putSections = SECTION_DEFS.filter((d) => d.put);
    const items = putSections.map((def) => {
      const count = diffCounts[def.key] || null;
      const checked = selectedScopes.has(def.key);
      if (checked) checkedCount++;
      const isActive = activeSec === def.key;
      const badgeText = count ? `${count.total}` : "-";
      const badgeCls = count && count.total > 0 ? "sec-badge has-diff" : "sec-badge";
      const disabledAttr = isNode ? "disabled" : "";
      return `<div class="sidebar-item${isActive ? " active" : ""}" data-sidebar-sec="${def.key}">
      <input type="checkbox" class="sec-check" value="${def.key}" ${checked ? "checked" : ""} ${disabledAttr} data-apply-scope>
      <span class="sec-label">${esc(def.label)}</span>
      <span class="${badgeCls}">${badgeText}</span>
    </div>`;
    }).join("");
    container.innerHTML = items;
    const sidebarCount = getToolDocument().getElementById("u_sidebarCount");
    if (sidebarCount) sidebarCount.textContent = `${checkedCount} / ${putSections.length}`;
    syncApplyScopesFromSidebar();
  }
  function syncApplyScopesFromSidebar() {
    const sidebarChecks = getToolDocument().querySelectorAll("#u_reflectSidebarSections [data-apply-scope]");
    const selected = /* @__PURE__ */ new Set();
    sidebarChecks.forEach((c) => {
      if (c.checked) selected.add(c.value);
    });
    const scopeChecks = [...ui3.applyScopes.querySelectorAll('input[type="checkbox"]')];
    scopeChecks.forEach((c) => {
      c.checked = selected.has(c.value);
    });
  }
  function renderReflectMainPanel() {
    const overview = getToolDocument().getElementById("u_reflectOverview");
    if (!overview) return;
    renderReflectAssistPanel();
    const isNode = isReflectNodeModeEffective();
    overview.style.display = "block";
    const activeSec = state.reflectActiveSidebarSection;
    const diffCounts = getDiffCountsBySection();
    const selectedScopes = new Set(deps.selectedScopeKeys(ui3.applyScopes));
    if (isNode) {
      const rows = deps.getSelectedReflectRows();
      const sev = summarizeSeverity(rows);
      overview.innerHTML = `
      <div class="sec-preview" style="border-color:#bfdbfe;background:#f8fbff">
        <div class="sec-preview-title" style="color:#1d4ed8">ノード反映の現在地</div>
        <div class="sec-diff-summary">
          <span class="sec-diff-pill">候補 ${state.reflectRows.length}件</span>
          <span class="sec-diff-pill">選択 ${rows.length}件</span>
          <span class="sec-diff-pill">比較元 ${rows.filter((r) => deps.reflectRowModeById(r._id) === "src").length}</span>
          <span class="sec-diff-pill">比較先 ${rows.filter((r) => deps.reflectRowModeById(r._id) === "tgt").length}</span>
        </div>
        <div class="muted" style="margin-top:8px">重要度: 高 ${sev.high} / 中 ${sev.medium} / 低 ${sev.low}</div>
      </div>`;
      if (ui3.reflectMainTitle) ui3.reflectMainTitle.textContent = "ノード反映";
      return;
    }
    if (activeSec) {
      const def = SECTION_DEFS.find((d) => d.key === activeSec);
      if (!def) {
        overview.innerHTML = "";
        return;
      }
      const count = diffCounts[activeSec] || { total: 0, added: 0, removed: 0, changed: 0 };
      const rows = getActualDiffRows(state.lastDiffRows || []).filter((r) => r.sectionKey === activeSec);
      const topPaths = rows.slice(0, 12).map((r) => {
        const cls = r.type === "added" ? "#166534" : r.type === "removed" ? "#b91c1c" : "#92400e";
        const typeLabel = r.moved ? `${r.type}(moved)` : r.type || "-";
        return `<tr><td style="color:${cls};font-weight:700;width:80px">${esc(typeLabel)}</td><td style="font-family:monospace;font-size:10px;color:#64748b;word-break:break-all">${esc(r.path || "-")}</td></tr>`;
      }).join("");
      const moreCount = rows.length > 12 ? rows.length - 12 : 0;
      overview.innerHTML = `
      <div class="sec-preview">
        <div class="sec-preview-title">${esc(def.label)}</div>
        <div class="sec-diff-summary">
          <span class="sec-diff-pill">差分 ${count.total}件</span>
          <span class="sec-diff-pill" style="color:#166534">追加 ${count.added}</span>
          <span class="sec-diff-pill" style="color:#b91c1c">削除 ${count.removed}</span>
          <span class="sec-diff-pill" style="color:#92400e">変更 ${count.changed}</span>
        </div>
        ${count.total > 0 ? `<div style="margin-top:10px;max-height:200px;overflow:auto">
          <table><thead><tr><th style="width:80px">種別</th><th>パス</th></tr></thead><tbody>${topPaths}</tbody></table>
          ${moreCount > 0 ? `<div class="muted" style="padding:6px 8px;text-align:center">他 ${moreCount}件...</div>` : ""}
        </div>` : '<div class="muted" style="margin-top:8px">差分なし（または差分比較未実行）</div>'}
      </div>`;
      if (ui3.reflectMainTitle) ui3.reflectMainTitle.textContent = def.label;
    } else {
      const putSections = SECTION_DEFS.filter((d) => d.put);
      const cards = putSections.filter((def) => selectedScopes.has(def.key)).map((def) => {
        const count = diffCounts[def.key] || { total: 0, added: 0, removed: 0, changed: 0 };
        const barTotal = Math.max(count.total, 1);
        return `<div class="sec-overview-card" data-sidebar-nav="${def.key}">
        <div class="soc-label">${esc(def.label)}</div>
        <div class="soc-stats">${count.total > 0 ? `差分 ${count.total}件 (A:${count.added} R:${count.removed} C:${count.changed})` : "差分なし"}</div>
        ${count.total > 0 ? `<div class="soc-bar">
          ${count.added > 0 ? `<div class="fill added" style="width:${count.added / barTotal * 100}%;display:inline-block"></div>` : ""}
          ${count.removed > 0 ? `<div class="fill removed" style="width:${count.removed / barTotal * 100}%;display:inline-block"></div>` : ""}
          ${count.changed > 0 ? `<div class="fill changed" style="width:${count.changed / barTotal * 100}%;display:inline-block"></div>` : ""}
        </div>` : ""}
      </div>`;
      }).join("");
      const totalDiff = Object.values(diffCounts).reduce((s, c) => s + c.total, 0);
      overview.innerHTML = `
      <div class="sec-preview" style="border-color:#c7d2fe;background:#eef2ff">
        <div class="sec-preview-title" style="color:#4338ca">反映概要</div>
        <div class="sec-diff-summary">
          <span class="sec-diff-pill" style="border-color:#c7d2fe">選択セクション ${selectedScopes.size}件</span>
          <span class="sec-diff-pill" style="border-color:#c7d2fe">総差分 ${totalDiff}件</span>
        </div>
      </div>
      ${selectedScopes.size > 0 ? `<div class="sec-overview-grid">${cards}</div>` : '<div class="muted" style="text-align:center;padding:20px">反映セクションを左のサイドバーから選択してください</div>'}`;
      if (ui3.reflectMainTitle) ui3.reflectMainTitle.textContent = "反映概要";
    }
  }
  function renderReflectNodeList() {
    const extractPropertyKeyFromPath = (path) => {
      const text = String(path || "");
      if (!text) return "";
      const m = text.match(/(?:^|\.)(?:properties|fields)\.([^.[\]]+)/);
      if (m?.[1]) return m[1];
      const head = text.split(".")[0] || "";
      return head.includes("[") ? head.split("[")[0] : head;
    };
    const rows = state.reflectRows || [];
    if (!rows.length) {
      const emptyText = state.lastDiffAt ? "反映対象の差分ノードはありません。" : "差分ノード未読込（差分比較後に「差分ノード読込」）";
      ui3.reflectNodeList.innerHTML = `<div style="padding:10px;font-size:12px;color:#64748b">${emptyText}</div>`;
      if (ui3.nodePropertyList) ui3.nodePropertyList.innerHTML = '<div class="muted" style="padding:6px">差分ノード読込後に表示されます</div>';
      if (ui3.nodePropertyChips) ui3.nodePropertyChips.innerHTML = '<span class="muted" style="font-size:10px">未選択（すべて対象）</span>';
      state.reflectActiveNodeId = "";
      renderReflectNodeDetail();
      renderBundleState();
      renderReflectModeUi();
      renderReflectAssistPanel();
      return;
    }
    const keyword = (ui3.nodeSearch?.value || "").toLowerCase();
    const filterSec = ui3.nodeFilterSection?.value || "";
    const filterType = ui3.nodeFilterType?.value || "";
    const filterSev = ui3.nodeFilterSeverity?.value || "";
    const propertyPanel = ui3.nodePropertyPanel;
    const propertyList = ui3.nodePropertyList;
    const propertyChips = ui3.nodePropertyChips;
    const propertyMap = /* @__PURE__ */ new Map();
    rows.forEach((r) => {
      const key = extractPropertyKeyFromPath(r.path);
      if (!key) return;
      propertyMap.set(key, (propertyMap.get(key) || 0) + 1);
    });
    if (!(state.reflectPropertyFilters instanceof Set)) state.reflectPropertyFilters = /* @__PURE__ */ new Set();
    state.reflectPropertyFilters = new Set([...state.reflectPropertyFilters].filter((key) => propertyMap.has(key)));
    if (propertyPanel) propertyPanel.style.display = state.reflectPropertyPanelOpen ? "block" : "none";
    const sortedProps = [...propertyMap.entries()].sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])));
    if (propertyList) {
      propertyList.innerHTML = sortedProps.length ? sortedProps.map(
        ([key, count]) => `<label style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:4px 2px;border-bottom:1px solid #f1f5f9">
          <span style="display:flex;align-items:center;gap:8px;min-width:0">
            <input type="checkbox" data-reflect-prop="${esc(key)}" ${state.reflectPropertyFilters.has(key) ? "checked" : ""}>
            <span style="font-size:11px;color:#0f172a;word-break:break-all">${esc(key)}</span>
          </span>
          <span style="font-size:10px;color:#64748b">${count}件</span>
        </label>`
      ).join("") : '<div class="muted" style="padding:6px">選択可能なプロパティはありません</div>';
    }
    if (propertyChips) {
      const selectedProps = [...state.reflectPropertyFilters];
      propertyChips.innerHTML = selectedProps.length ? selectedProps.map(
        (key) => `<button type="button" class="chip" data-act="removeReflectPropertyFilter" data-prop="${esc(key)}" style="font-size:10px;padding:2px 6px;border:none;cursor:pointer">${esc(key)} ×</button>`
      ).join("") : '<span class="muted" style="font-size:10px">未選択（すべて対象）</span>';
    }
    const filterProps = state.reflectPropertyFilters instanceof Set ? state.reflectPropertyFilters : /* @__PURE__ */ new Set();
    const filtered = rows.filter((r) => {
      if (keyword && !(r.path || "").toLowerCase().includes(keyword) && !(r.section || "").toLowerCase().includes(keyword) && !(r.sectionKey || "").toLowerCase().includes(keyword)) return false;
      if (filterSec && r.sectionKey !== filterSec) return false;
      if (filterType && r.type !== filterType) return false;
      if (filterSev && (r.severity || "low").toUpperCase() !== filterSev) return false;
      if (filterProps.size && !filterProps.has(extractPropertyKeyFromPath(r.path))) return false;
      return true;
    });
    const activeRow = deps.getActiveReflectRow(filtered.map((r) => r._id));
    const selected = state.reflectSelectedIds || /* @__PURE__ */ new Set();
    const selectedCount = rows.filter((r) => selected.has(r._id)).length;
    const selectedRows = rows.filter((r) => selected.has(r._id));
    const srcCount = selectedRows.filter((r) => deps.reflectRowModeById(r._id) === "src").length;
    const tgtCount = selectedRows.length - srcCount;
    const sev = summarizeSeverity(selectedRows);
    const header = `<div style="padding:8px 10px;border-bottom:1px solid #e2e8f0;font-size:11px;background:#f8fafc">候補 ${rows.length}件 / 表示 ${filtered.length}件 / 選択 ${selectedCount}件 / 比較元 ${srcCount} / 比較先 ${tgtCount} / 高:${sev.high} 中:${sev.medium} 低:${sev.low}</div>`;
    if (!filtered.length) {
      ui3.reflectNodeList.innerHTML = `${header}<div style="padding:12px;font-size:12px;color:#64748b">条件に一致するノードがありません。検索または絞り込み条件を見直してください。</div>`;
      renderReflectNodeDetail();
      renderBundleState();
      renderReflectModeUi();
      renderReflectAssistPanel();
      return;
    }
    const body = filtered.slice(0, 1200).map((r) => {
      const cls = r.type === "added" ? "#166534" : r.type === "removed" ? "#b91c1c" : "#92400e";
      const checked = selected.has(r._id) ? "checked" : "";
      const mode = deps.reflectRowModeById(r._id);
      const typeLabel = getDiffTypeDisplayLabel(r.type, { moved: !!r.moved });
      const severity = String(r.severity || "low").toLowerCase();
      const sevBg = severity === "high" ? "#fee2e2" : severity === "medium" ? "#fef3c7" : "#dbeafe";
      const sevColor = severity === "high" ? "#991b1b" : severity === "medium" ? "#92400e" : "#1d4ed8";
      return `<tr class="reflect-node-row${activeRow?._id === r._id ? " active" : ""}" data-node-open="${esc(r._id)}">
      <td><input type="checkbox" data-node-id="${esc(r._id)}" ${checked}></td>
      <td><button type="button" data-node-mode="${esc(r._id)}" style="border:1px solid #cbd5e1;border-radius:6px;padding:2px 6px;font-size:10px;background:${mode === "src" ? "#dbeafe" : "#dcfce7"};color:${mode === "src" ? "#1d4ed8" : "#166534"};font-weight:700;cursor:pointer">${mode === "src" ? "比較元" : "比較先"}</button></td>
      <td><span style="display:inline-block;padding:1px 6px;border-radius:999px;background:${sevBg};color:${sevColor};font-size:10px;font-weight:700">${esc(getSeverityDisplayLabel(severity))}</span></td>
      <td>${esc(r.section || "-")}</td>
      <td style="color:${cls};font-weight:700">${esc(typeLabel)}</td>
      <td title="${esc(r.path || "-")}">${esc(r.path || "-")}</td>
    </tr>`;
    }).join("");
    ui3.reflectNodeList.innerHTML = `${header}<table>
    <thead><tr><th style="width:52px">選択</th><th style="width:66px">反映元</th><th style="width:82px">重要度</th><th>セクション</th><th>種別</th><th>パス</th></tr></thead>
    <tbody>${body}</tbody>
  </table>`;
    renderReflectNodeDetail();
    renderBundleState();
    renderReflectModeUi();
    renderReflectAssistPanel();
  }
  function renderReflectNodeDetail() {
    if (!ui3.reflectNodeDetail) return;
    if (!isReflectNodeModeEffective()) {
      ui3.reflectNodeDetail.innerHTML = "";
      ui3.reflectNodeDetail.style.display = "none";
      return;
    }
    ui3.reflectNodeDetail.style.display = "flex";
    if (ui3.reflectNodeList && !ui3.reflectNodeList.querySelector("[data-node-open]") && (state.reflectRows || []).length) {
      ui3.reflectNodeDetail.innerHTML = '<div class="reflect-node-detail-empty">表示中のノードがありません。左の検索条件や絞り込みを調整してください。</div>';
      return;
    }
    const visibleIds = Array.from(ui3.reflectNodeList?.querySelectorAll("[data-node-open]") || []).map((el) => el.dataset.nodeOpen).filter(Boolean);
    const row = deps.getActiveReflectRow(visibleIds.length ? visibleIds : null);
    if (!row) {
      ui3.reflectNodeDetail.innerHTML = '<div class="reflect-node-detail-empty">選択中または表示中のノードがありません。左の一覧から差分ノードを選ぶと、ここに比較内容と反映値を表示します。</div>';
      return;
    }
    const selected = state.reflectSelectedIds.has(row._id);
    const mode = deps.reflectRowModeById(row._id);
    const severity = String(row.severity || "low").toLowerCase();
    const activeTab = ["diff", "src", "tgt", "apply"].includes(state.reflectDetailTab) ? state.reflectDetailTab : "diff";
    const useCharDiff = !!ui3.charDiff?.checked;
    const tabs = [
      { key: "diff", label: "差分" },
      { key: "src", label: "比較元" },
      { key: "tgt", label: "比較先" },
      { key: "apply", label: "反映値" }
    ];
    let bodyHtml = "";
    if (activeTab === "diff") {
      const cols = deps.renderRowColumns(row, useCharDiff);
      bodyHtml = `<div class="reflect-node-detail-note">差分表示です。反映元を「比較元 / 比較先」で切り替えると、実際に採用される値は「反映値」タブで確認できます。</div>
      <div class="diff-view">
        <div class="reflect-node-compare">
          <div class="reflect-node-card">
            <div class="reflect-node-card-head">比較元</div>
            <div class="reflect-node-card-body">${cols.left}</div>
          </div>
          <div class="reflect-node-card">
            <div class="reflect-node-card-head">比較先</div>
            <div class="reflect-node-card-body">${cols.right}</div>
          </div>
        </div>
      </div>`;
    } else {
      const value = activeTab === "src" ? row.left : activeTab === "tgt" ? row.right : deps.reflectRowDesiredValue(row);
      const title = activeTab === "src" ? "比較元JSON" : activeTab === "tgt" ? "比較先JSON" : `反映値JSON (${mode === "src" ? "比較元" : "比較先"}を採用)`;
      bodyHtml = `<div class="reflect-node-detail-note">${activeTab === "apply" ? `このノードは現在「${mode === "src" ? "比較元" : "比較先"}」を反映元として扱います。` : "JSONをそのまま確認できます。"}</div>
      <div class="reflect-node-card">
        <div class="reflect-node-card-head">${esc(title)}</div>
        <div class="reflect-node-card-body"><pre class="reflect-node-json">${esc(deps.stringifyForDiff(value))}</pre></div>
      </div>`;
    }
    const impactText = (row.impactRefs || []).map((ref) => `${ref.section || ref.sectionKey || "-"} / ${ref.kind || "-"}${ref.label ? ` / ${ref.label}` : ""}`).join("\n");
    ui3.reflectNodeDetail.innerHTML = `<div class="reflect-node-detail-head">
    <div class="reflect-node-detail-eyebrow">Node Workbench</div>
    <div class="reflect-node-detail-title">${esc(row.section || "-")} / ${esc(getDiffTypeDisplayLabel(row.type, { moved: !!row.moved }))}</div>
    <div class="reflect-node-detail-path">${esc(row.path || "-")}</div>
    <div class="reflect-node-badges">
      <span class="reflect-node-badge ${esc(severity)}">${esc(getSeverityDisplayLabel(severity))}重要度</span>
      <span class="reflect-node-badge">${selected ? "選択中" : "未選択"}</span>
      <span class="reflect-node-badge">${mode === "src" ? "比較元を反映" : "比較先を維持"}</span>
    </div>
    <div class="reflect-node-actions">
      <button class="btn ${selected ? "sub" : "ok"}" data-act="toggleActiveReflectNodeSelection">${selected ? "選択解除" : "このノードを選択"}</button>
      <button class="btn ok" data-act="toggleActiveReflectNodeMode">${mode === "src" ? "比較先へ切替" : "比較元へ切替"}</button>
      <button class="btn sub" data-act="focusActiveReflectNodeDiff">差分タブで開く</button>
      <button class="btn sub" data-copy-val="${esc(row.path || "")}">パスコピー</button>
    </div>
  </div>
  <div class="reflect-node-detail-tabs">
    ${tabs.map((tab) => `<button class="reflect-node-tab${tab.key === activeTab ? " active" : ""}" data-node-detail-tab="${tab.key}">${esc(tab.label)}</button>`).join("")}
  </div>
  <div class="reflect-node-detail-body">
    <div class="reflect-node-meta">
      ${row.reasonSummary ? `<div class="reflect-node-meta-item"><strong>差分理由:</strong> ${esc(row.reasonSummary)}</div>` : ""}
      ${row.renameCandidate ? `<div class="reflect-node-meta-item"><strong>名称変更候補:</strong> ${esc(row.renameCandidate.fromCode || "-")} → ${esc(row.renameCandidate.toCode || "-")}${row.renameCandidate.matchedBy ? `<br><strong>判定:</strong> ${esc(row.renameCandidate.matchedBy)}` : ""}</div>` : ""}
      ${row.impactCount ? `<div class="reflect-node-meta-item"><strong>影響:</strong> ${esc(row.impactSummary || `${row.impactCount}件`)}${impactText ? `<br><pre class="reflect-node-json" style="padding:6px 0 0;background:transparent">${esc(impactText)}</pre>` : ""}</div>` : ""}
    </div>
    ${bodyHtml}
  </div>`;
  }
  var ui3, deps;
  var init_components = __esm({
    "src/ui/components.js"() {
      "use strict";
      init_constants();
      init_state();
      init_utils();
      init_filter();
      init_engine();
      init_enrich();
      init_nodeModeUi();
      init_dialog();
      ui3 = {};
      deps = {
        buildDiffWarningInfo: null,
        renderRowColumns: null,
        stringifyForDiff: null,
        selectedScopeKeys: null,
        reflectRowModeById: null,
        reflectRowDesiredValue: null,
        getActiveReflectRow: null,
        resolveApplyScopes: null,
        commonParams: null,
        currentDiffSignature: null,
        parseLookupMapInput: null,
        makeApplyPlanSignature: null,
        getSelectedReflectRows: null,
        switchTab: null,
        scheduleGuidedTourLayout: null,
        stableStringify: null
      };
    }
  });

  // src/tabs/preview-compare.js
  function getPreviewCompareStatusPrefix(ui4) {
    const sp = !!ui4?.sourcePreview?.checked;
    const tp = !!ui4?.targetPreview?.checked;
    if (!sp && tp) return "〔本番 → プレビュー〕";
    if (sp && tp) return "〔プレビュー同士〕";
    if (!sp && !tp) return "〔本番同士〕";
    return "〔プレビュー → 本番〕";
  }
  var init_preview_compare = __esm({
    "src/tabs/preview-compare.js"() {
      "use strict";
    }
  });

  // src/reflect/rowMode.js
  function reflectRowModeById(rowId) {
    return state.reflectNodeModes[rowId] === "tgt" ? "tgt" : "src";
  }
  function reflectRowDesiredValue(row) {
    return reflectRowModeById(row._id) === "tgt" ? row.right : row.left;
  }
  var init_rowMode = __esm({
    "src/reflect/rowMode.js"() {
      "use strict";
      init_state();
    }
  });

  // src/tabs/reflect.js
  var reflect_exports = {};
  __export(reflect_exports, {
    ensureActiveReflectNodeId: () => ensureActiveReflectNodeId,
    getActiveReflectRow: () => getActiveReflectRow,
    getDiffCountsBySection: () => getDiffCountsBySection2,
    getEffectiveReflectScopeInfo: () => getEffectiveReflectScopeInfo2,
    getReflectRowById: () => getReflectRowById,
    getSelectedReflectRows: () => getSelectedReflectRows,
    loadReflectRowsFromLastDiff: () => loadReflectRowsFromLastDiff,
    pushReflectUndo: () => pushReflectUndo,
    redoReflectState: () => redoReflectState,
    reflectRowDesiredValue: () => reflectRowDesiredValue,
    reflectRowModeById: () => reflectRowModeById,
    restoreReflectState: () => restoreReflectState,
    runPrefetchCommonData: () => runPrefetchCommonData,
    runReflectModeAll: () => runReflectModeAll,
    runReflectModeVisible: () => runReflectModeVisible,
    setActiveReflectNode: () => setActiveReflectNode,
    snapshotReflectState: () => snapshotReflectState,
    undoReflectState: () => undoReflectState
  });
  function snapshotReflectState() {
    return {
      selectedIds: [...state.reflectSelectedIds],
      modes: { ...state.reflectNodeModes }
    };
  }
  function restoreReflectState(snapshot) {
    state.reflectSelectedIds = new Set(snapshot?.selectedIds || []);
    state.reflectNodeModes = { ...snapshot?.modes || {} };
  }
  function pushReflectUndo() {
    state.reflectUndoStack.push(snapshotReflectState());
    if (state.reflectUndoStack.length > 50) state.reflectUndoStack.shift();
    state.reflectRedoStack = [];
  }
  function undoReflectState() {
    if (!state.reflectUndoStack.length) return false;
    state.reflectRedoStack.push(snapshotReflectState());
    restoreReflectState(state.reflectUndoStack.pop());
    return true;
  }
  function redoReflectState() {
    if (!state.reflectRedoStack.length) return false;
    state.reflectUndoStack.push(snapshotReflectState());
    restoreReflectState(state.reflectRedoStack.pop());
    return true;
  }
  function getReflectRowById(rowId) {
    return (state.reflectRows || []).find((row) => row && row._id === rowId) || null;
  }
  function ensureActiveReflectNodeId(candidateIds) {
    const rows = state.reflectRows || [];
    if (!rows.length) {
      state.reflectActiveNodeId = "";
      return "";
    }
    const candidateSet = Array.isArray(candidateIds) && candidateIds.length ? new Set(candidateIds) : null;
    const current = getReflectRowById(state.reflectActiveNodeId);
    if (current && (!candidateSet || candidateSet.has(current._id))) return current._id;
    const selectedRow = rows.find((row) => state.reflectSelectedIds.has(row._id) && (!candidateSet || candidateSet.has(row._id)));
    if (selectedRow) {
      state.reflectActiveNodeId = selectedRow._id;
      return selectedRow._id;
    }
    const fallbackRow = rows.find((row) => !candidateSet || candidateSet.has(row._id)) || rows[0];
    state.reflectActiveNodeId = fallbackRow?._id || "";
    return state.reflectActiveNodeId;
  }
  function getActiveReflectRow(candidateIds) {
    const rowId = ensureActiveReflectNodeId(candidateIds);
    return rowId ? getReflectRowById(rowId) : null;
  }
  function setActiveReflectNode(rowId, options = {}) {
    if (!rowId || !getReflectRowById(rowId)) return;
    state.reflectActiveNodeId = rowId;
    if (options.persist !== false) saveCurrentDialogState2();
  }
  function loadReflectRowsFromLastDiff() {
    if (!state.lastDiffRows.length) throw new Error("先に差分比較を実行してください");
    const putKeys = new Set(SECTION_DEFS.filter((d) => d.put).map((d) => d.key));
    const rows = getActualDiffRows(state.lastDiffRows).filter((r) => putKeys.has(r.sectionKey)).map((r, idx) => ({ ...r, _id: `n${idx}` }));
    state.reflectRows = rows;
    state.reflectSelectedIds = new Set(rows.map((r) => r._id));
    state.reflectNodeModes = {};
    rows.forEach((r) => {
      state.reflectNodeModes[r._id] = "src";
    });
    state.reflectUndoStack = [];
    state.reflectRedoStack = [];
    state.reflectPropertyFilters = /* @__PURE__ */ new Set();
    state.reflectActiveNodeId = rows[0]?._id || "";
    if (ui.nodeFilterSection) {
      const sections = [...new Set(rows.map((r) => r.sectionKey).filter(Boolean))];
      ui.nodeFilterSection.innerHTML = '<option value="">全セクション</option>' + sections.map((k) => {
        const label = SECTION_DEFS.find((d) => d.key === k)?.label || k;
        return `<option value="${esc(k)}">${esc(label)}</option>`;
      }).join("");
    }
    renderReflectNodeList();
    renderReflectMainPanel();
    setStatus(`差分ノードを読込: ${rows.length}件`);
  }
  function getSelectedReflectRows() {
    const selected = state.reflectSelectedIds || /* @__PURE__ */ new Set();
    return (state.reflectRows || []).filter((r) => selected.has(r._id));
  }
  function runReflectModeAll(mode) {
    if (!state.reflectRows.length) {
      setStatus("反映ノードが読込されていません");
      return;
    }
    const selected = getSelectedReflectRows();
    if (!selected.length) {
      setStatus("ノードが選択されていません");
      return;
    }
    pushReflectUndo();
    let count = 0;
    for (const r of selected) {
      if (state.reflectNodeModes[r._id] !== mode) {
        state.reflectNodeModes[r._id] = mode;
        count++;
      }
    }
    renderReflectNodeList();
    setStatus(`選択中ノード(${selected.length}件)のうち、${count}件を ${mode === "src" ? "比較元" : "比較先"} に一括変更しました`);
  }
  function runReflectModeVisible(mode) {
    if (!state.reflectRows.length) {
      setStatus("反映ノードが読込されていません");
      return;
    }
    const visibleIds = [...ui.reflectNodeList?.querySelectorAll("[data-node-open]") || []].map((el) => el.dataset.nodeOpen).filter(Boolean);
    if (!visibleIds.length) {
      setStatus("表示中ノードがありません（絞り込み条件を見直してください）");
      return;
    }
    pushReflectUndo();
    let count = 0;
    visibleIds.forEach((id) => {
      if (state.reflectNodeModes[id] !== mode) {
        state.reflectNodeModes[id] = mode;
        count += 1;
      }
    });
    renderReflectNodeList();
    setStatus(`表示中ノード(${visibleIds.length}件)のうち、${count}件を ${mode === "src" ? "比較元" : "比較先"} に変更しました`);
  }
  function getEffectiveReflectScopeInfo2() {
    const baseScopes = selectedScopeKeys(ui.applyScopes);
    if (isReflectNodeModeEffective()) {
      return { baseScopes, effectiveScopes: [...baseScopes], warning: "" };
    }
    try {
      const { resolveApplyScopes: resolveApplyScopes2 } = (init_diff(), __toCommonJS(diff_exports));
      return {
        baseScopes,
        effectiveScopes: resolveApplyScopes2(baseScopes),
        warning: ""
      };
    } catch (e) {
      return {
        baseScopes,
        effectiveScopes: [...baseScopes],
        warning: e.message || String(e)
      };
    }
  }
  function getDiffCountsBySection2() {
    const counts = {};
    for (const row of getActualDiffRows(state.lastDiffRows || [])) {
      const key = row.sectionKey || "";
      if (!key) continue;
      if (!counts[key]) counts[key] = { total: 0, added: 0, removed: 0, changed: 0 };
      counts[key].total++;
      if (row.type === "added") counts[key].added++;
      else if (row.type === "removed") counts[key].removed++;
      else if (row.type === "changed") counts[key].changed++;
    }
    return counts;
  }
  async function runPrefetchCommonData() {
    const c = commonParams();
    if (!c.source.appId) throw new Error("比較元アプリIDを入力してください");
    if (!c.target.appId) throw new Error("比較先アプリIDを入力してください");
    const sections = SECTION_DEFS.map((d) => d.key);
    const modeTag = getPreviewCompareStatusPrefix(ui);
    setStatus(`${modeTag} 共通データ取得: 比較元...`);
    const source = await fetchBundle({
      ...c.source,
      sections,
      onProgress: (p, l) => setStatus(`${modeTag} 共通データ取得 比較元 ${Math.round(p * 100)}% (${l})`)
    });
    setStatus(`${modeTag} 共通データ取得: 比較先...`);
    const target = await fetchBundle({
      ...c.target,
      sections,
      onProgress: (p, l) => setStatus(`${modeTag} 共通データ取得 比較先 ${Math.round(p * 100)}% (${l})`)
    });
    state.lastSourceBundle = source;
    state.lastTargetBundle = target;
    state.lastDiffAt = null;
    state.lastDiffRows = [];
    state.lastFetchIssues = [];
    state.lastDiffSignature = "";
    state.lastApplyPlan = null;
    state.diffSelectedIds = /* @__PURE__ */ new Set();
    state.diffIgnoreSuggestions = [];
    state.reflectRows = [];
    state.reflectSelectedIds = /* @__PURE__ */ new Set();
    state.reflectNodeModes = {};
    state.reflectUndoStack = [];
    state.reflectRedoStack = [];
    state.reflectPropertyFilters = /* @__PURE__ */ new Set();
    state.reflectActiveNodeId = "";
    renderResultRows([]);
    renderDiffFilterOptions();
    renderReflectNodeList();
    renderBundleState();
    renderReflectSidebar();
    renderReflectMainPanel();
    const sourceErr = Object.values(source.sections || {}).filter((x) => x && x._fetchError).length;
    const targetErr = Object.values(target.sections || {}).filter((x) => x && x._fetchError).length;
    setStatus(`共通データ取得完了: 比較元 ${sections.length}セクション(NG ${sourceErr}) / 比較先 ${sections.length}セクション(NG ${targetErr})`);
  }
  var init_reflect = __esm({
    "src/tabs/reflect.js"() {
      "use strict";
      init_constants();
      init_state();
      init_utils();
      init_api();
      init_engine();
      init_enrich();
      init_utils();
      init_components();
      init_export();
      init_diff();
      init_preview_compare();
      init_nodeModeUi();
      init_rowMode();
    }
  });

  // src/tabs/field.js
  function parseFieldInput(text) {
    const obj = JSON.parse(text);
    if (!obj || typeof obj !== "object") throw new Error("JSONはオブジェクト形式で入力してください");
    if (obj.properties && typeof obj.properties === "object") return obj.properties;
    return obj;
  }
  function parseLookupMapInput(text) {
    const raw = String(text || "").trim();
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("Lookup AppID変換はJSONオブジェクトで入力してください");
    }
    const map = {};
    for (const [k, v] of Object.entries(parsed)) {
      const from = String(k).trim();
      const to = String(v).trim();
      if (!from || !to) continue;
      map[from] = to;
    }
    return map;
  }
  function parseAppIdList(text) {
    const tokens = String(text || "").split(/[\s,]+/).map((s) => s.trim()).filter(Boolean);
    const out = [];
    const seen = /* @__PURE__ */ new Set();
    for (const tk of tokens) {
      if (!/^\d+$/.test(tk)) continue;
      if (seen.has(tk)) continue;
      seen.add(tk);
      out.push(tk);
    }
    return out;
  }
  function convertLookupAppIds(fieldDef, map) {
    const def = deepClone(fieldDef || {});
    const lookupMap = map || {};
    if (!Object.keys(lookupMap).length) return { def, changed: false };
    let changed = false;
    const walk = (node) => {
      if (!node || typeof node !== "object") return;
      const relatedApp = node.lookup && node.lookup.relatedApp;
      if (relatedApp && relatedApp.app != null) {
        const before = String(relatedApp.app);
        const after = lookupMap[before];
        if (after && String(after) !== before) {
          node.lookup.relatedApp.app = String(after);
          changed = true;
        }
      }
      if (node.type === "SUBTABLE" && node.fields && typeof node.fields === "object") {
        Object.values(node.fields).forEach(walk);
      }
    };
    walk(def);
    return { def, changed };
  }
  function splitUpsertMap(currentMap, incomingMap, options) {
    const overwrite = !!(options && options.overwrite);
    const renameOnConflict = !!(options && options.renameOnConflict);
    const codeField = options && options.codeField || "code";
    const add = {};
    const update = {};
    const logs = [];
    const used = new Set(Object.keys(currentMap || {}));
    for (const [rawKey, rawDef] of Object.entries(incomingMap || {})) {
      const key = String(rawKey);
      const def = deepClone(rawDef || {});
      if (!def[codeField]) def[codeField] = key;
      if (!used.has(key)) {
        add[key] = def;
        used.add(key);
        logs.push(`ADD ${key}`);
        continue;
      }
      if (overwrite) {
        update[key] = def;
        logs.push(`UPDATE ${key}`);
        continue;
      }
      if (renameOnConflict) {
        let n = 2;
        let next = `${key}_${n}`;
        while (used.has(next)) {
          n += 1;
          next = `${key}_${n}`;
        }
        def[codeField] = next;
        add[next] = def;
        used.add(next);
        logs.push(`RENAME ${key} -> ${next}`);
      } else {
        logs.push(`SKIP ${key} (already exists)`);
      }
    }
    return { add, update, logs };
  }
  function filterWritableFieldProps(props, skipSystem) {
    if (!skipSystem) return deepClone(props || {});
    const out = {};
    for (const [k, def] of Object.entries(props || {})) {
      if (!def || typeof def !== "object") continue;
      if (SYSTEM_FIELD_TYPES.has(def.type)) continue;
      out[k] = deepClone(def);
    }
    return out;
  }
  async function upsertFields(prefix, app, incomingProps, options) {
    const writableIncoming = filterWritableFieldProps(incomingProps, options && options.skipSystem);
    const lookupMap = options && options.lookupMap || {};
    const convertedIncoming = {};
    for (const [code, def] of Object.entries(writableIncoming || {})) {
      const converted = convertLookupAppIds(def, lookupMap);
      convertedIncoming[code] = converted.def;
    }
    const current = await apiGet(prefix, "/app/form/fields.json", { app });
    const split = splitUpsertMap(current.properties || {}, convertedIncoming || {}, {
      overwrite: options && options.overwrite,
      renameOnConflict: options && options.renameOnConflict,
      codeField: "code"
    });
    if (Object.keys(split.add).length) await apiPost(prefix, "/app/form/fields.json", { app, properties: split.add });
    if (Object.keys(split.update).length) await apiPut(prefix, "/app/form/fields.json", { app, properties: split.update });
    return split.logs;
  }
  async function runFieldApply() {
    const c = commonParams();
    if (!c.target.appId) throw new Error("比較先アプリIDを入力してください");
    const input = ui.fieldJson.value.trim();
    if (!input) throw new Error("フィールドJSONを入力してください");
    const incoming = parseFieldInput(input);
    const lookupMap = parseLookupMapInput(ui.lookupMap.value);
    const prefix = buildApiPrefix(c.target.guestId, true);
    const app = c.target.appId;
    setStatus("フィールド追加/更新中...");
    const logs = await upsertFields(prefix, app, incoming, {
      overwrite: ui.overwriteField.checked,
      renameOnConflict: !ui.overwriteField.checked,
      lookupMap
    });
    logs.push("OK フィールド反映");
    if (ui.deployField.checked) {
      setStatus("デプロイ実行中...");
      await apiPost(prefix, "/app/deploy.json", { apps: [{ app, revision: -1 }] });
      logs.push("OK デプロイ実行");
    }
    ui.result.innerHTML = `<pre style="margin:0;padding:10px;font-size:12px;white-space:pre-wrap">${esc(logs.join("\n"))}</pre>`;
    setStatus("フィールド追加処理完了");
  }
  async function runLoadTargetFields() {
    const c = commonParams();
    if (!c.target.appId) throw new Error("比較先アプリIDを入力してください");
    const prefix = buildApiPrefix(c.target.guestId, true);
    setStatus("比較先フィールド取得中...");
    const res = await apiGet(prefix, "/app/form/fields.json", { app: c.target.appId });
    ui.fieldJson.value = JSON.stringify({ properties: res.properties || {} }, null, 2);
    setStatus("比較先フィールドを読み込みました");
  }
  async function runLoadSourceFieldsList() {
    const c = commonParams();
    if (!c.source.appId) throw new Error("比較元アプリIDを入力してください");
    const prefix = buildApiPrefix(c.source.guestId, c.source.preview);
    setStatus("比較元フィールド一覧を取得中...");
    try {
      const res = await apiGet(prefix, "/app/form/fields.json", { app: c.source.appId });
      const props = res.properties || {};
      const writable = filterWritableFieldProps(props, true);
      const fields = Object.values(writable).sort((a, b) => String(a.code).localeCompare(String(b.code)));
      if (!fields.length) {
        setStatus("表示できるフィールドがありません（システムフィールドのみ等）");
        return;
      }
      const rows = fields.map((f) => {
        const titleAttr = typeof f.label === "string" ? esc(f.label) : "";
        const displayLabel = f.label ? `<span style="font-size:10px;color:#64748b;margin-left:4px">${esc(f.label)}</span>` : "";
        return `
        <tr>
          <td style="text-align:center"><input type="checkbox" class="src-field-sel" value="${esc(f.code)}" data-json="${esc(JSON.stringify(f))}"></td>
          <td title="${titleAttr}"><strong>${esc(f.code)}</strong>${displayLabel}</td>
          <td style="font-size:10px">${esc(f.type)}</td>
        </tr>
      `;
      });
      ui.sourceFieldTbody.innerHTML = rows.join("");
      ui.sourceFieldListContainer.style.display = "block";
      ui.sourceFieldCheckAll.checked = false;
      setStatus(`比較元フィールド ${fields.length} 件を取得しました`);
    } catch (e) {
      ui.sourceFieldListContainer.style.display = "none";
      throw e;
    }
  }
  function runInsertSelectedSourceFields() {
    const checks = [...ui.sourceFieldTbody.querySelectorAll(".src-field-sel:checked")];
    if (!checks.length) {
      setStatus("追加するフィールドを選択してください");
      return;
    }
    let currentObj = { properties: {} };
    try {
      const text = ui.fieldJson.value.trim();
      if (text) {
        currentObj = JSON.parse(text);
        if (!currentObj.properties) currentObj = { properties: currentObj };
      }
    } catch (e) {
      if (!window.confirm("現在のJSONテキストが不正です。上書きして良いですか？")) return;
    }
    let mergedCount = 0;
    for (const c of checks) {
      try {
        const def = JSON.parse(c.dataset.json);
        currentObj.properties[def.code] = def;
        mergedCount++;
      } catch (e) {
      }
    }
    ui.fieldJson.value = JSON.stringify(currentObj, null, 2);
    ui.sourceFieldListContainer.style.display = "none";
    setStatus(`${mergedCount} 件のフィールド定義を挿入しました`);
  }
  var init_field = __esm({
    "src/tabs/field.js"() {
      "use strict";
      init_constants();
      init_state();
      init_utils();
      init_api();
      init_components();
      init_diff();
      init_dialog();
      init_enrich();
    }
  });

  // src/reflect/helpers.js
  function diffSectionKeySet() {
    const set = /* @__PURE__ */ new Set();
    for (const row of getActualDiffRows(state.lastDiffRows || [])) {
      let key = row.sectionKey;
      if (!key && row.section) {
        const def = SECTION_DEFS.find((d) => d.label === row.section || d.key === row.section);
        if (def) key = def.key;
      }
      if (key) set.add(key);
    }
    return set;
  }
  async function ensureDiffPreparedForReflect() {
    const sig = currentDiffSignature();
    if (state.lastDiffAt && state.lastDiffSignature === sig) return;
    setStatus("差分が未作成または条件変更のため、自動で差分比較を実行します...");
    await runDiff();
  }
  function resolveApplyScopes(baseScopes) {
    let scopes = [...baseScopes];
    if (!ui.applyDiffOnly.checked) return scopes;
    const diffSet = diffSectionKeySet();
    if (!diffSet.size) throw new Error("「前回差分のあるセクションのみ反映」がONのため先に差分比較が必要です。差分なしで反映する場合はこのチェックをOFFにしてください");
    scopes = scopes.filter((k) => diffSet.has(k));
    if (!scopes.length) throw new Error("選択中の反映セクションに差分がありません");
    return scopes;
  }
  async function getSourceBundleForApply(c, scopes) {
    let sourceBundle = state.lastSourceBundle || state.importedSourceBundle;
    if (!sourceBundle) {
      if (!c.source.appId) throw new Error("比較元アプリIDを入力してください");
      setStatus("比較元設定を取得中...");
      sourceBundle = await fetchBundle({
        ...c.source,
        sections: scopes,
        onProgress: (p, l) => setStatus(`比較元取得中 ${Math.round(p * 100)}% (${l})`)
      });
      state.lastSourceBundle = sourceBundle;
    } else {
      sourceBundle = pickBundleSections(sourceBundle, scopes);
    }
    return sourceBundle;
  }
  function renderProgressLog(logs, options = {}) {
    const { phase, current, total } = options;
    const progressBar = typeof current === "number" && total > 0 ? `<div style="height:6px;background:#e2e8f0;border-radius:3px;margin:8px 10px 0"><div style="width:${Math.round((current + 1) / total * 100)}%;height:100%;background:#3b82f6;border-radius:3px;transition:width .3s"></div></div>` : "";
    const phaseLabel = phase ? `<div style="font-weight:700;padding:8px 10px;border-bottom:1px solid #e2e8f0;font-size:13px">${esc(phase)}</div>` : "";
    const colored = logs.map((line) => {
      if (line.startsWith("OK ")) return `<span style="color:#166534">${esc(line)}</span>`;
      if (line.startsWith("NG ")) return `<span style="color:#b91c1c">${esc(line)}</span>`;
      if (line.startsWith("SKIP ")) return `<span style="color:#92400e">${esc(line)}</span>`;
      if (line.startsWith("START ")) return `<span style="color:#1d4ed8">${esc(line)}</span>`;
      if (line.startsWith("PLAN ")) return `<span style="color:#1d4ed8">${esc(line)}</span>`;
      return esc(line);
    }).join("\n");
    ui.result.innerHTML = `${phaseLabel}${progressBar}<pre style="margin:0;padding:10px;font-size:12px;white-space:pre-wrap">${colored}</pre>`;
    ui.result.scrollTop = ui.result.scrollHeight;
  }
  function appendProgressSummary(logs) {
    const ok = logs.filter((l) => l.startsWith("OK ")).length;
    const ng = logs.filter((l) => l.startsWith("NG ")).length;
    const skip = logs.filter((l) => l.startsWith("SKIP ")).length;
    logs.push("");
    logs.push(`=== 完了: OK ${ok} / NG ${ng} / SKIP ${skip} ===`);
  }
  async function deployAndPoll(prefix, app, logs) {
    logs.push("START デプロイ実行");
    await apiPost(prefix, "/app/deploy.json", { apps: [{ app, revision: -1 }] });
    let last = "PROCESSING";
    for (let i = 0; i < 25; i++) {
      await new Promise((r) => setTimeout(r, 1500));
      try {
        const statusRes = await apiGet(prefix, "/app/deploy.json", { apps: [app] }, 1);
        const st = statusRes?.apps?.[0]?.status || "UNKNOWN";
        last = st;
        logs.push(`  - デプロイ状態: ${st}`);
        if (st === "SUCCESS" || st === "FAIL" || st === "CANCEL") break;
      } catch (e) {
        logs.push(`  - Deploy Status取得失敗: ${e.message || String(e)}`);
      }
    }
    return last;
  }
  var init_helpers = __esm({
    "src/reflect/helpers.js"() {
      "use strict";
      init_constants();
      init_state();
      init_utils();
      init_api();
      init_engine();
      init_components();
      init_diff();
      init_field();
      init_reflect();
      init_components();
    }
  });

  // src/reflect/apply.js
  function convertLookupAppIds2(fieldDef, map) {
    const def = deepClone(fieldDef || {});
    const lookupMap = map || {};
    if (!Object.keys(lookupMap).length) return { def, changed: false };
    let changed = false;
    const walk = (node) => {
      if (!node || typeof node !== "object") return;
      const relatedApp = node.lookup && node.lookup.relatedApp;
      if (relatedApp && relatedApp.app != null) {
        const before = String(relatedApp.app);
        const after = lookupMap[before];
        if (after && String(after) !== before) {
          node.lookup.relatedApp.app = String(after);
          changed = true;
        }
      }
      if (node.type === "SUBTABLE" && node.fields && typeof node.fields === "object") {
        Object.values(node.fields).forEach(walk);
      }
    };
    walk(def);
    return { def, changed };
  }
  function extractReferencedAppIds(sourceBundle, scopes, lookupMap) {
    const refs = [];
    const map = lookupMap || {};
    const scopeSet = new Set(scopes || []);
    const fields = sourceBundle?.sections?.fieldSettings?.properties || {};
    if (scopeSet.has("fieldSettings") || scopeSet.size === 0) {
      const walkFields = (fieldMap, parent) => {
        for (const [code, f] of Object.entries(fieldMap || {})) {
          if (f.lookup && f.lookup.relatedApp && f.lookup.relatedApp.app != null) {
            const appId = String(f.lookup.relatedApp.app);
            const converted = map[appId] ? String(map[appId]) : null;
            refs.push({ fieldCode: parent ? `${parent} > ${code}` : code, refAppId: appId, convertedAppId: converted, section: "フィールド設定", type: "ルックアップ" });
          }
          if (f.referenceTable && f.referenceTable.relatedApp && f.referenceTable.relatedApp.app != null) {
            const appId = String(f.referenceTable.relatedApp.app);
            const converted = map[appId] ? String(map[appId]) : null;
            refs.push({ fieldCode: parent ? `${parent} > ${code}` : code, refAppId: appId, convertedAppId: converted, section: "フィールド設定", type: "関連レコード一覧" });
          }
          if (f.type === "SUBTABLE" && f.fields && typeof f.fields === "object") {
            walkFields(f.fields, code);
          }
        }
      };
      walkFields(fields, null);
    }
    const actions = sourceBundle?.sections?.actionSettings?.actions || {};
    if (scopeSet.has("actionSettings") || scopeSet.size === 0) {
      for (const [name, a] of Object.entries(actions)) {
        if (a.destApp && a.destApp.app) {
          const appId = String(a.destApp.app);
          refs.push({ fieldCode: name, refAppId: appId, convertedAppId: null, section: "アクション設定", type: "アクション" });
        }
      }
    }
    return refs;
  }
  function filterWritableFieldProps2(props, skipSystem) {
    if (!skipSystem) return deepClone(props || {});
    const out = {};
    for (const [k, def] of Object.entries(props || {})) {
      if (!def || typeof def !== "object") continue;
      if (SYSTEM_FIELD_TYPES.has(def.type)) continue;
      out[k] = deepClone(def);
    }
    return out;
  }
  function getByTokens(root2, tokens) {
    let cur = root2;
    for (const tk of tokens) {
      if (typeof tk === "number") {
        if (!Array.isArray(cur) || tk < 0 || tk >= cur.length) return void 0;
        cur = cur[tk];
      } else {
        if (!cur || typeof cur !== "object" || !Object.prototype.hasOwnProperty.call(cur, tk)) return void 0;
        cur = cur[tk];
      }
    }
    return cur;
  }
  function itemKeySignature(v) {
    return `${typeof v}:${String(v)}`;
  }
  function resolveArrayKeyValue(row, desired) {
    const key = row.arrayKey;
    if (!key) return { key: null, value: void 0 };
    if (row.arrayKeyValue !== void 0) return { key, value: row.arrayKeyValue };
    const candidates = [desired, row.left, row.right];
    for (const obj of candidates) {
      if (obj && typeof obj === "object" && Object.prototype.hasOwnProperty.call(obj, key)) {
        return { key, value: obj[key] };
      }
    }
    return { key, value: void 0 };
  }
  function findArrayIndexByKey(arr, key, value) {
    if (!Array.isArray(arr) || !key) return -1;
    const sig = itemKeySignature(value);
    for (let i = 0; i < arr.length; i++) {
      const obj = arr[i];
      if (!obj || typeof obj !== "object") continue;
      if (!Object.prototype.hasOwnProperty.call(obj, key)) continue;
      if (itemKeySignature(obj[key]) === sig) return i;
    }
    return -1;
  }
  function applyArrayRowByKey(sectionObj, row, tokens, desired) {
    if (!row.arrayKey) return null;
    if (!tokens.length) return null;
    const last = tokens[tokens.length - 1];
    if (typeof last !== "number") return null;
    const arr = getByTokens(sectionObj, tokens.slice(0, -1));
    if (!Array.isArray(arr)) return null;
    const mode = reflectRowModeById(row._id);
    const { key, value } = resolveArrayKeyValue(row, desired);
    if (!key || value === void 0) return null;
    const curIndex = findArrayIndexByKey(arr, key, value);
    if (desired === void 0) {
      if (curIndex < 0) return { section: sectionObj, applied: false, op: "delete", reason: "array item not found" };
      arr.splice(curIndex, 1);
      return { section: sectionObj, applied: true, op: "delete" };
    }
    const preferredIndex = row.moved ? mode === "src" && Number.isInteger(row.movedFrom) ? row.movedFrom : Number.isInteger(row.movedTo) ? row.movedTo : last : last;
    const bounded = (n, max) => Math.max(0, Math.min(max, Number.isInteger(n) ? n : max));
    const insertItem = deepClone(desired);
    if (curIndex >= 0) {
      arr.splice(curIndex, 1);
      const ins = bounded(preferredIndex, arr.length);
      arr.splice(ins, 0, insertItem);
    } else {
      const ins = bounded(preferredIndex, arr.length);
      arr.splice(ins, 0, insertItem);
    }
    return { section: sectionObj, applied: true, op: row.moved ? "move" : "set" };
  }
  function setByTokens(root2, tokens, value) {
    if (!tokens.length) return deepClone(value);
    if (root2 == null || typeof root2 !== "object") root2 = {};
    let cur = root2;
    for (let i = 0; i < tokens.length - 1; i++) {
      const tk = tokens[i];
      const next = tokens[i + 1];
      if (typeof tk === "number") {
        if (!Array.isArray(cur)) return root2;
        if (cur[tk] == null || typeof cur[tk] !== "object") cur[tk] = typeof next === "number" ? [] : {};
        cur = cur[tk];
      } else {
        if (cur[tk] == null || typeof cur[tk] !== "object") cur[tk] = typeof next === "number" ? [] : {};
        cur = cur[tk];
      }
    }
    const last = tokens[tokens.length - 1];
    if (typeof last === "number") {
      if (!Array.isArray(cur)) return root2;
      cur[last] = deepClone(value);
    } else {
      cur[last] = deepClone(value);
    }
    return root2;
  }
  function deleteByTokens(root2, tokens) {
    if (!tokens.length) return { root: root2, deleted: false };
    let cur = root2;
    for (let i = 0; i < tokens.length - 1; i++) {
      const tk = tokens[i];
      if (typeof tk === "number") {
        if (!Array.isArray(cur) || cur[tk] == null) return { root: root2, deleted: false };
        cur = cur[tk];
      } else {
        if (!cur || typeof cur !== "object" || !Object.prototype.hasOwnProperty.call(cur, tk)) return { root: root2, deleted: false };
        cur = cur[tk];
      }
    }
    const last = tokens[tokens.length - 1];
    if (typeof last === "number") {
      if (!Array.isArray(cur) || last < 0 || last >= cur.length) return { root: root2, deleted: false };
      cur.splice(last, 1);
      return { root: root2, deleted: true };
    }
    if (!cur || typeof cur !== "object" || !Object.prototype.hasOwnProperty.call(cur, last)) return { root: root2, deleted: false };
    delete cur[last];
    return { root: root2, deleted: true };
  }
  function applyDiffRowToSection(sectionObj, row, secKey) {
    const rel = relativePathFromRow(row.path, secKey);
    if (rel == null) return { section: sectionObj, applied: false, op: "skip", reason: "path mismatch" };
    const desired = reflectRowDesiredValue(row);
    if (desired === void 0) {
      if (!rel) return { section: sectionObj, applied: false, op: "skip", reason: "root delete unsupported" };
      const tokens2 = tokenizePath(rel);
      const keyDel = applyArrayRowByKey(sectionObj, row, tokens2, desired);
      if (keyDel) return keyDel;
      const out = deleteByTokens(sectionObj, tokens2);
      return { section: out.root, applied: out.deleted, op: "delete", reason: out.deleted ? "" : "target path not found" };
    }
    if (!rel) {
      return { section: deepClone(desired), applied: true, op: "set" };
    }
    const tokens = tokenizePath(rel);
    const keySet = applyArrayRowByKey(sectionObj, row, tokens, desired);
    if (keySet) return keySet;
    return { section: setByTokens(sectionObj, tokens, desired), applied: true, op: "set" };
  }
  function compareTokensForDelete(aTokens, bTokens) {
    const n = Math.min(aTokens.length, bTokens.length);
    for (let i = 0; i < n; i++) {
      const a = aTokens[i];
      const b = bTokens[i];
      if (a === b) continue;
      const aNum = typeof a === "number";
      const bNum = typeof b === "number";
      if (aNum && bNum) return b - a;
      if (aNum && !bNum) return -1;
      if (!aNum && bNum) return 1;
      return String(a).localeCompare(String(b));
    }
    return bTokens.length - aTokens.length;
  }
  function sortRowsForPatch(rows, secKey) {
    return [...rows].sort((a, b) => {
      const aDel = reflectRowDesiredValue(a) === void 0;
      const bDel = reflectRowDesiredValue(b) === void 0;
      if (aDel && !bDel) return -1;
      if (!aDel && bDel) return 1;
      const aRel = relativePathFromRow(a.path, secKey) || "";
      const bRel = relativePathFromRow(b.path, secKey) || "";
      const aTokens = tokenizePath(aRel);
      const bTokens = tokenizePath(bRel);
      if (aDel && bDel) return compareTokensForDelete(aTokens, bTokens);
      if (aTokens.length !== bTokens.length) return aTokens.length - bTokens.length;
      return aRel.localeCompare(bRel);
    });
  }
  function extractFieldCodeFromRowPath(row) {
    const rel = relativePathFromRow(row.path, "fieldSettings");
    if (!rel) return null;
    const tokens = tokenizePath(rel);
    if (tokens[0] !== "properties" || typeof tokens[1] !== "string") return null;
    return tokens[1];
  }
  async function executeRequestPlan(prefix, requests, logs, stopOnError) {
    const list = Array.isArray(requests) ? requests : [];
    for (let i = 0; i < list.length; i++) {
      const req = list[i];
      try {
        let _err;
        for (let _r = 0; _r <= 2; _r++) {
          try {
            await kintone.api(`${prefix}${req.path}`, req.method, req.body);
            _err = null;
            break;
          } catch (re) {
            _err = re;
            if (_r < 2) await new Promise((r) => setTimeout(r, 700 * (_r + 1)));
          }
        }
        if (_err) throw apiErrorWithContext(_err, { method: req.method, prefix, path: req.path, payload: req.body });
        if (logs) logs.push(`  - OK ${req.method} ${req.path}${req.note ? ` (${req.note})` : ""}`);
      } catch (e) {
        if (logs) logs.push(`  - NG ${req.method} ${req.path}: ${e.message || String(e)}`);
        if (stopOnError) throw e;
      }
    }
  }
  async function applyFieldSectionDiff(prefix, app, beforeProps, afterProps, logs, lookupMap, sourceModeCodes, stopOnError) {
    const plan = planFieldSectionDiffRequests(app, beforeProps, afterProps, lookupMap, sourceModeCodes);
    appendRequestPlanLogs(logs, plan);
    await executeRequestPlan(prefix, plan.requests, logs, stopOnError);
    if (plan.lookupChanged) logs.push(`  - lookup appId 変換: ${plan.lookupChanged}`);
  }
  async function applyViewsSectionDiff(prefix, app, beforeViews, afterViews, logs, stopOnError) {
    const plan = planViewsSectionDiffRequests(app, beforeViews, afterViews);
    appendRequestPlanLogs(logs, plan);
    await executeRequestPlan(prefix, plan.requests, logs, stopOnError);
    if (plan.deleteSkipCount) logs.push(`  - views delete(skip): ${plan.deleteSkipCount} (互換モード: 削除は行いません)`);
  }
  async function applyReportsSectionDiff(prefix, app, beforeReports, afterReports, logs, stopOnError) {
    const plan = planReportsSectionDiffRequests(app, beforeReports, afterReports);
    appendRequestPlanLogs(logs, plan);
    await executeRequestPlan(prefix, plan.requests, logs, stopOnError);
  }
  async function applyActionsSectionDiff(prefix, app, beforeActions, afterActions, logs, stopOnError) {
    const plan = planActionsSectionDiffRequests(app, beforeActions, afterActions);
    appendRequestPlanLogs(logs, plan);
    await executeRequestPlan(prefix, plan.requests, logs, stopOnError);
    if (plan.deleteSkipCount) logs.push(`  - actions delete(skip): ${plan.deleteSkipCount} (互換モード: 削除は行いません)`);
  }
  async function applySectionsLoop(prefix, app, sourceBundle, scopes, logs, lookupMap, stopOnError, { phaseLabel = "反映", onProgress } = {}) {
    let hadError = false;
    for (let i = 0; i < scopes.length; i++) {
      const secKey = scopes[i];
      const def = SECTION_DEFS.find((x) => x.key === secKey);
      if (!def || !def.put) continue;
      const sourceSec = deepClone(sourceBundle.sections[secKey]);
      if (!sourceSec || sourceSec._fetchError) {
        logs.push(`SKIP ${def.label}: source未取得`);
        if (onProgress) onProgress(i, scopes.length);
        continue;
      }
      setStatus(`${phaseLabel}中 ${i + 1}/${scopes.length}: ${def.label}`);
      if (onProgress) onProgress(i, scopes.length);
      try {
        if (secKey === "fieldSettings") {
          const current = await apiGet(prefix, "/app/form/fields.json", { app });
          const beforeProps = current.properties || {};
          const afterProps = filterWritableFieldProps2(sourceSec.properties || sourceSec, true);
          await applyFieldSectionDiff(prefix, app, beforeProps, afterProps, logs, lookupMap, null, stopOnError);
          logs.push(`OK ${def.label}`);
          continue;
        }
        if (secKey === "viewSettings") {
          const current = await apiGet(prefix, "/app/views.json", { app });
          await applyViewsSectionDiff(prefix, app, current.views || {}, sourceSec.views || sourceSec || {}, logs, stopOnError);
          logs.push(`OK ${def.label}`);
          continue;
        }
        if (secKey === "reportSettings") {
          const current = await apiGet(prefix, "/app/reports.json", { app });
          await applyReportsSectionDiff(prefix, app, current.reports || {}, sourceSec.reports || sourceSec || {}, logs, stopOnError);
          logs.push(`OK ${def.label}`);
          continue;
        }
        if (secKey === "actionSettings") {
          const current = await apiGet(prefix, "/app/actions.json", { app });
          await applyActionsSectionDiff(prefix, app, current.actions || {}, sourceSec.actions || sourceSec || {}, logs, stopOnError);
          logs.push(`OK ${def.label}`);
          continue;
        }
        const reqs = [{ method: "PUT", path: def.endpoint, body: { app, ...def.putBuilder(sourceSec) }, note: `${def.label} put` }];
        appendRequestPlanLogs(logs, { requests: reqs });
        await executeRequestPlan(prefix, reqs, logs, stopOnError);
        logs.push(`OK ${def.label}`);
      } catch (e) {
        hadError = true;
        logs.push(`NG ${def.label}: ${e.message || String(e)}`);
        if (stopOnError) {
          logs.push("中断: エラーが発生したため処理を停止しました");
          break;
        }
      }
    }
    return hadError;
  }
  function resolveBackupScopes(c) {
    if (isReflectNodeModeEffective()) {
      if (!state.reflectRows.length) loadReflectRowsFromLastDiff();
      const rows = getSelectedReflectRows();
      if (!rows.length) throw new Error("バックアップ対象ノードが未選択です");
      const scopes = [...new Set(rows.map((r) => r.sectionKey).filter(Boolean))];
      if (!scopes.length) throw new Error("バックアップ対象セクションを判定できません");
      return scopes;
    }
    const baseScopes = selectedScopeKeys(ui.applyScopes);
    if (!baseScopes.length) throw new Error("反映セクションを選択してください");
    return resolveApplyScopes(baseScopes);
  }
  async function backupTargetPreviewSettings(c, scopes, options = {}) {
    if (!c.target.appId) throw new Error("比較先アプリIDを入力してください");
    const actualScopes = Array.isArray(scopes) && scopes.length ? scopes : resolveBackupScopes(c);
    const target = { ...c.target, preview: true };
    setStatus(`バックアップ取得中... (${actualScopes.length}セクション)`);
    const bundle = await fetchBundle({
      ...target,
      sections: actualScopes,
      onProgress: (p, l) => setStatus(`バックアップ取得中 ${Math.round(p * 100)}% (${l})`)
    });
    const payload = {
      generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
      mode: "target-preview-backup",
      scopes: actualScopes,
      target: {
        appId: target.appId,
        guestId: target.guestId || "",
        preview: true
      },
      bundle
    };
    const filename = `target_preview_backup_app${target.appId}_${nowStamp()}.json`;
    downloadText(filename, JSON.stringify(payload, null, 2), "application/json");
    if (!options?.silentStatus) setStatus(`比較先(プレビュー)バックアップ保存: ${filename}`);
    if (ui.backupStatus) {
      ui.backupStatus.textContent = `✅ バックアップ保存済: ${filename} (${actualScopes.length}セクション, ${(/* @__PURE__ */ new Date()).toLocaleTimeString()})`;
      ui.backupStatus.style.display = "block";
    }
    return { filename, payload };
  }
  async function runApplyPreviewByNodes() {
    await ensureDiffPreparedForReflect();
    const c = commonParams();
    if (!c.target.appId) throw new Error("比較先アプリIDを入力してください");
    if (!state.reflectRows.length) loadReflectRowsFromLastDiff();
    const rows = getSelectedReflectRows();
    if (!rows.length) throw new Error("反映ノードを選択してください");
    const lookupMap = parseLookupMapInput(ui.lookupMap.value);
    const stopOnError = !!ui.stopOnError.checked;
    saveCurrentDialogState2();
    const nodeSigRows = rows.map((r) => ({ id: r._id, sectionKey: r.sectionKey, mode: reflectRowModeById(r._id), type: r.type, path: r.path })).sort((a, b) => String(a.id).localeCompare(String(b.id)));
    const planSignature = makeApplyPlanSignature("nodes", {
      targetApp: c.target.appId,
      targetGuest: c.target.guestId,
      sourceApp: c.source.appId,
      sourceGuest: c.source.guestId,
      nodes: nodeSigRows,
      lookupMap: ui.lookupMap.value.trim()
    });
    const nodeScopes = [...new Set(rows.map((r) => r.sectionKey).filter(Boolean))];
    const appIdRefs = state.lastSourceBundle ? extractReferencedAppIds(state.lastSourceBundle, nodeScopes, lookupMap) : [];
    const approved = await ensureApplyPlanApproved(planSignature, "nodes", runPreviewApplyPlanNodes, { appIdRefs });
    if (!approved) {
      setStatus("反映をキャンセルしました");
      return;
    }
    const prefix = buildApiPrefix(c.target.guestId, true);
    const app = c.target.appId;
    const logs = [];
    let hadError = false;
    const srcModeCount = rows.filter((r) => reflectRowModeById(r._id) === "src").length;
    const tgtModeCount = rows.length - srcModeCount;
    logs.push(`比較先アプリ: ${app}`);
    logs.push(`ノードモード選択数: ${rows.length}`);
    logs.push(`モード内訳: 比較元 ${srcModeCount} / 比較先 ${tgtModeCount}`);
    logs.push(`エラー時動作: ${stopOnError ? "中断" : "継続"}`);
    if (ui.autoBackupPreview?.checked) {
      const backupScopes = [...new Set(rows.map((r) => r.sectionKey).filter(Boolean))];
      const backup = await backupTargetPreviewSettings(c, backupScopes, { silentStatus: true });
      logs.push(`バックアップ保存: ${backup.filename}`);
    }
    logs.push("");
    const bySection = {};
    for (const row of rows) {
      if (!row.sectionKey) continue;
      if (!bySection[row.sectionKey]) bySection[row.sectionKey] = [];
      bySection[row.sectionKey].push(row);
    }
    const sectionKeys = Object.keys(bySection);
    for (let i = 0; i < sectionKeys.length; i++) {
      const secKey = sectionKeys[i];
      const def = SECTION_DEFS.find((d) => d.key === secKey);
      if (!def || !def.put) {
        logs.push(`SKIP ${def?.label || secKey}: PUT非対応`);
        renderProgressLog(logs, { phase: "ノード反映実行中", current: i, total: sectionKeys.length });
        continue;
      }
      setStatus(`ノード反映中 ${i + 1}/${sectionKeys.length}: ${def.label}`);
      renderProgressLog(logs, { phase: "ノード反映実行中", current: i, total: sectionKeys.length });
      try {
        const current = normalize(await apiGet(prefix, def.endpoint, { app }));
        const before = deepClone(current);
        let patched = deepClone(current);
        const rowsInSection = sortRowsForPatch(bySection[secKey], secKey);
        let appliedCount = 0;
        for (const row of rowsInSection) {
          const r = applyDiffRowToSection(patched, row, secKey);
          patched = r.section;
          if (r.applied) appliedCount += 1;
        }
        if (secKey === "fieldSettings") {
          const beforeProps = before.properties || before || {};
          const afterProps = patched.properties || patched || {};
          const sourceModeCodes = new Set(
            rowsInSection.filter((row) => reflectRowModeById(row._id) === "src").map(extractFieldCodeFromRowPath).filter(Boolean)
          );
          await applyFieldSectionDiff(prefix, app, beforeProps, afterProps, logs, lookupMap, sourceModeCodes, stopOnError);
          logs.push(`OK ${def.label}: node ${appliedCount}/${rowsInSection.length}`);
        } else if (secKey === "viewSettings") {
          const beforeViews = before.views || before || {};
          const afterViews = patched.views || patched || {};
          await applyViewsSectionDiff(prefix, app, beforeViews, afterViews, logs, stopOnError);
          logs.push(`OK ${def.label}: node ${appliedCount}/${rowsInSection.length}`);
        } else if (secKey === "reportSettings") {
          const beforeReports = before.reports || before || {};
          const afterReports = patched.reports || patched || {};
          await applyReportsSectionDiff(prefix, app, beforeReports, afterReports, logs, stopOnError);
          logs.push(`OK ${def.label}: node ${appliedCount}/${rowsInSection.length}`);
        } else if (secKey === "actionSettings") {
          const beforeActions = before.actions || before || {};
          const afterActions = patched.actions || patched || {};
          await applyActionsSectionDiff(prefix, app, beforeActions, afterActions, logs, stopOnError);
          logs.push(`OK ${def.label}: node ${appliedCount}/${rowsInSection.length}`);
        } else {
          const reqs = [{ method: "PUT", path: def.endpoint, body: { app, ...def.putBuilder(patched) }, note: `${def.label} put` }];
          appendRequestPlanLogs(logs, { requests: reqs });
          await executeRequestPlan(prefix, reqs, logs, stopOnError);
          logs.push(`OK ${def.label}: node ${appliedCount}/${rowsInSection.length}`);
        }
      } catch (e) {
        hadError = true;
        logs.push(`NG ${def.label}: ${e.message || String(e)}`);
        if (stopOnError) {
          logs.push("中断: エラーが発生したため処理を停止しました");
          break;
        }
      }
    }
    if (ui.doDeploy.checked) {
      if (hadError) {
        logs.push("SKIP デプロイ: 反映エラーがあるため実行しません");
      } else {
        setStatus("デプロイ実行中...");
        try {
          const st = await deployAndPoll(prefix, app, logs);
          logs.push(st === "SUCCESS" ? "OK デプロイ完了" : `NG デプロイ終了ステータス: ${st}`);
        } catch (e) {
          logs.push(`NG デプロイ: ${e.message || String(e)}`);
        }
      }
    }
    appendProgressSummary(logs);
    renderProgressLog(logs, { phase: "ノード反映完了" });
    renderReflectAssistPanel();
    renderReflectMainPanel();
    setStatus("ノード反映処理完了");
  }
  async function runApplyPreview() {
    if (isReflectNodeModeEffective()) return runApplyPreviewByNodes();
    await ensureDiffPreparedForReflect();
    const c = commonParams();
    if (!c.target.appId) throw new Error("比較先アプリIDを入力してください");
    const lookupMap = parseLookupMapInput(ui.lookupMap.value);
    const baseScopes = selectedScopeKeys(ui.applyScopes);
    if (!baseScopes.length) throw new Error("反映セクションを選択してください");
    const scopes = resolveApplyScopes(baseScopes);
    const planSignature = makeApplyPlanSignature("section", {
      targetApp: c.target.appId,
      targetGuest: c.target.guestId,
      sourceApp: c.source.appId,
      sourceGuest: c.source.guestId,
      scopes,
      lookupMap: ui.lookupMap.value.trim()
    });
    const appIdRefs = state.lastSourceBundle ? extractReferencedAppIds(state.lastSourceBundle, scopes, lookupMap) : [];
    const approved = await ensureApplyPlanApproved(planSignature, "section", runPreviewApplyPlan, { appIdRefs });
    if (!approved) {
      setStatus("反映をキャンセルしました");
      return;
    }
    saveCurrentDialogState2();
    const sourceBundle = await getSourceBundleForApply(c, scopes);
    const prefix = buildApiPrefix(c.target.guestId, true);
    const app = c.target.appId;
    const stopOnError = !!ui.stopOnError.checked;
    const logs = [];
    let hadError = false;
    logs.push(`比較先アプリ: ${app}`);
    logs.push(`適用セクション: ${scopes.map((k) => SECTION_DEFS.find((d) => d.key === k)?.label || k).join(", ")}`);
    logs.push(`エラー時動作: ${stopOnError ? "中断" : "継続"}`);
    if (ui.autoBackupPreview?.checked) {
      const backup = await backupTargetPreviewSettings(c, scopes, { silentStatus: true });
      logs.push(`バックアップ保存: ${backup.filename}`);
    }
    logs.push("");
    hadError = await applySectionsLoop(prefix, app, sourceBundle, scopes, logs, lookupMap, stopOnError, {
      phaseLabel: "反映",
      onProgress: (i, total) => renderProgressLog(logs, { phase: "プレビュー反映実行中", current: i, total })
    });
    if (ui.doDeploy.checked) {
      if (hadError) {
        logs.push("SKIP デプロイ: 反映エラーがあるため実行しません");
      } else {
        setStatus("デプロイ実行中...");
        try {
          const st = await deployAndPoll(prefix, app, logs);
          logs.push(st === "SUCCESS" ? "OK デプロイ完了" : `NG デプロイ終了ステータス: ${st}`);
        } catch (e) {
          logs.push(`NG デプロイ: ${e.message || String(e)}`);
        }
      }
    }
    appendProgressSummary(logs);
    renderProgressLog(logs, { phase: "プレビュー反映完了" });
    renderReflectAssistPanel();
    renderReflectMainPanel();
    setStatus("プレビュー反映処理完了");
  }
  async function runBackupTargetPreview() {
    const c = commonParams();
    const scopes = resolveBackupScopes(c);
    await backupTargetPreviewSettings(c, scopes);
    renderReflectAssistPanel();
  }
  async function runDeployOnly() {
    const c = commonParams();
    if (!c.target.appId) throw new Error("比較先アプリIDを入力してください");
    if (!window.confirm(`デプロイのみ実行しますか？
比較先アプリ: ${c.target.appId}`)) {
      setStatus("デプロイをキャンセルしました");
      return;
    }
    const prefix = buildApiPrefix(c.target.guestId, true);
    const app = c.target.appId;
    setStatus("デプロイ実行中...");
    const logs = [];
    const st = await deployAndPoll(prefix, app, logs);
    if (st === "SUCCESS") logs.push("OK デプロイ完了");
    else logs.push(`NG デプロイ終了ステータス: ${st}`);
    ui.result.innerHTML = `<pre style="margin:0;padding:10px;font-size:12px;white-space:pre-wrap">${esc(logs.join("\n"))}</pre>`;
    setStatus(`デプロイ処理完了: ${st === "SUCCESS" ? "SUCCESS" : st}`, st !== "SUCCESS");
  }
  var init_apply = __esm({
    "src/reflect/apply.js"() {
      "use strict";
      init_constants();
      init_utils();
      init_state();
      init_api();
      init_plan();
      init_helpers();
      init_rowMode();
      init_nodeModeUi();
      init_rowMode();
    }
  });

  // src/reflect/plan.js
  var plan_exports = {};
  __export(plan_exports, {
    appendRequestPlanLogs: () => appendRequestPlanLogs,
    ensureApplyPlanApproved: () => ensureApplyPlanApproved,
    makeApplyPlanSignature: () => makeApplyPlanSignature,
    markApplyPlan: () => markApplyPlan,
    planActionsSectionDiffRequests: () => planActionsSectionDiffRequests,
    planFieldSectionDiffRequests: () => planFieldSectionDiffRequests,
    planReportsSectionDiffRequests: () => planReportsSectionDiffRequests,
    planViewsSectionDiffRequests: () => planViewsSectionDiffRequests,
    renderAppIdConfirmSection: () => renderAppIdConfirmSection,
    runPreviewApplyPlan: () => runPreviewApplyPlan,
    runPreviewApplyPlanNodes: () => runPreviewApplyPlanNodes,
    showInlineConfirmation: () => showInlineConfirmation,
    splitMapSectionDiff: () => splitMapSectionDiff,
    splitUpsertMap: () => splitUpsertMap2,
    upsertFields: () => upsertFields2
  });
  function renderAppIdConfirmSection(appIdRefs) {
    if (!appIdRefs || !appIdRefs.length) return '<div style="color:#64748b;font-size:12px;margin-bottom:8px">関連アプリIDなし</div>';
    const rows = appIdRefs.map(
      (r) => `<tr><td style="padding:3px 8px;font-size:11px">${esc(r.fieldCode)}</td><td style="padding:3px 8px;font-size:11px">${esc(r.type)}</td><td style="padding:3px 8px;font-size:11px;font-weight:700">${esc(r.refAppId)}</td><td style="padding:3px 8px;font-size:11px;color:${r.convertedAppId ? "#2563eb" : "#94a3b8"}">${r.convertedAppId ? `→ ${esc(r.convertedAppId)}` : "-"}</td><td style="padding:3px 8px;font-size:11px">${esc(r.section)}</td></tr>`
    ).join("");
    return `<div style="margin-bottom:10px">
    <div style="font-weight:600;font-size:12px;margin-bottom:4px;color:#dc2626">関連アプリID一覧 (${appIdRefs.length}件)</div>
    <div style="max-height:160px;overflow:auto;border:1px solid #e2e8f0;border-radius:6px">
      <table style="width:100%;border-collapse:collapse;font-size:11px">
        <thead><tr style="background:#f1f5f9">
          <th style="padding:4px 8px;text-align:left">フィールド</th>
          <th style="padding:4px 8px;text-align:left">種別</th>
          <th style="padding:4px 8px;text-align:left">参照先アプリID</th>
          <th style="padding:4px 8px;text-align:left">変換後</th>
          <th style="padding:4px 8px;text-align:left">セクション</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  </div>`;
  }
  function splitUpsertMap2(currentMap, incomingMap, options) {
    const overwrite = !!(options && options.overwrite);
    const renameOnConflict = !!(options && options.renameOnConflict);
    const codeField = options && options.codeField || "code";
    const add = {};
    const update = {};
    const logs = [];
    const used = new Set(Object.keys(currentMap || {}));
    for (const [rawKey, rawDef] of Object.entries(incomingMap || {})) {
      const key = String(rawKey);
      const def = deepClone(rawDef || {});
      if (!def[codeField]) def[codeField] = key;
      if (!used.has(key)) {
        add[key] = def;
        used.add(key);
        logs.push(`ADD ${key}`);
        continue;
      }
      if (overwrite) {
        update[key] = def;
        logs.push(`UPDATE ${key}`);
        continue;
      }
      if (renameOnConflict) {
        let n = 2;
        let next = `${key}_${n}`;
        while (used.has(next)) {
          n += 1;
          next = `${key}_${n}`;
        }
        def[codeField] = next;
        add[next] = def;
        used.add(next);
        logs.push(`RENAME ${key} -> ${next}`);
      } else {
        logs.push(`SKIP ${key} (already exists)`);
      }
    }
    return { add, update, logs };
  }
  async function upsertFields2(prefix, app, incomingProps, options) {
    const writableIncoming = filterWritableFieldProps2(incomingProps, options && options.skipSystem);
    const lookupMap = options && options.lookupMap || {};
    const convertedIncoming = {};
    for (const [code, def] of Object.entries(writableIncoming || {})) {
      const converted = convertLookupAppIds2(def, lookupMap);
      convertedIncoming[code] = converted.def;
    }
    const current = await apiGet(prefix, "/app/form/fields.json", { app });
    const split = splitUpsertMap2(current.properties || {}, convertedIncoming || {}, {
      overwrite: options && options.overwrite,
      renameOnConflict: options && options.renameOnConflict,
      codeField: "code"
    });
    if (Object.keys(split.add).length) await apiPost(prefix, "/app/form/fields.json", { app, properties: split.add });
    if (Object.keys(split.update).length) await apiPut(prefix, "/app/form/fields.json", { app, properties: split.update });
    return split.logs;
  }
  function splitMapSectionDiff(beforeMap, afterMap) {
    const before = beforeMap && typeof beforeMap === "object" && !Array.isArray(beforeMap) ? beforeMap : {};
    const after = afterMap && typeof afterMap === "object" && !Array.isArray(afterMap) ? afterMap : {};
    const add = {};
    const update = {};
    const del = [];
    for (const [k, v] of Object.entries(after)) {
      if (!Object.prototype.hasOwnProperty.call(before, k)) {
        add[k] = deepClone(v);
      } else if (stableStringify(before[k]) !== stableStringify(v)) {
        update[k] = deepClone(v);
      }
    }
    for (const k of Object.keys(before)) {
      if (!Object.prototype.hasOwnProperty.call(after, k)) del.push(k);
    }
    return { add, update, del };
  }
  function planFieldSectionDiffRequests(app, beforeProps, afterProps, lookupMap, sourceModeCodes) {
    const beforeMap = filterWritableFieldProps2(beforeProps, true);
    const afterMap = filterWritableFieldProps2(afterProps, true);
    const add = {};
    const update = {};
    const del = [];
    let lookupChanged = 0;
    for (const [code, def] of Object.entries(afterMap || {})) {
      const shouldConvert = !sourceModeCodes || sourceModeCodes.has(code);
      const converted = shouldConvert ? convertLookupAppIds2(def, lookupMap) : { def: deepClone(def), changed: false };
      if (converted.changed) lookupChanged += 1;
      const outDef = converted.def;
      if (!beforeMap || !beforeMap[code]) {
        add[code] = outDef;
      } else if (stableStringify(beforeMap[code]) !== stableStringify(outDef)) {
        update[code] = outDef;
      }
    }
    for (const code of Object.keys(beforeMap || {})) {
      if (!Object.prototype.hasOwnProperty.call(afterMap || {}, code)) del.push(code);
    }
    const requests = [];
    if (Object.keys(add).length) requests.push({ method: "POST", path: "/app/form/fields.json", body: { app, properties: add }, note: `fields add:${Object.keys(add).length}` });
    if (Object.keys(update).length) requests.push({ method: "PUT", path: "/app/form/fields.json", body: { app, properties: update }, note: `fields update:${Object.keys(update).length}` });
    if (del.length) requests.push({ method: "DELETE", path: "/app/form/fields.json", body: { app, fields: del }, note: `fields delete:${del.length}` });
    return { requests, addCount: Object.keys(add).length, updateCount: Object.keys(update).length, deleteCount: del.length, lookupChanged };
  }
  function planViewsSectionDiffRequests(app, beforeViews, afterViews) {
    const split = splitMapSectionDiff(beforeViews, afterViews);
    const up = { ...split.add, ...split.update };
    const requests = [];
    if (Object.keys(up).length) requests.push({ method: "PUT", path: "/app/views.json", body: { app, views: up }, note: `views upsert:${Object.keys(up).length}` });
    return { requests, upsertCount: Object.keys(up).length, deleteSkipCount: split.del.length };
  }
  function planReportsSectionDiffRequests(app, beforeReports, afterReports) {
    const split = splitMapSectionDiff(beforeReports, afterReports);
    const up = { ...split.add, ...split.update };
    const requests = [];
    if (Object.keys(up).length) requests.push({ method: "PUT", path: "/app/reports.json", body: { app, reports: up }, note: `reports upsert:${Object.keys(up).length}` });
    if (split.del.length) requests.push({ method: "DELETE", path: "/app/reports.json", body: { app, reports: split.del }, note: `reports delete:${split.del.length}` });
    return { requests, upsertCount: Object.keys(up).length, deleteCount: split.del.length };
  }
  function planActionsSectionDiffRequests(app, beforeActions, afterActions) {
    const split = splitMapSectionDiff(beforeActions, afterActions);
    const up = { ...split.add, ...split.update };
    const requests = [];
    if (Object.keys(up).length) requests.push({ method: "PUT", path: "/app/actions.json", body: { app, actions: up }, note: `actions upsert:${Object.keys(up).length}` });
    return { requests, upsertCount: Object.keys(up).length, deleteSkipCount: split.del.length };
  }
  function appendRequestPlanLogs(logs, plan) {
    const reqs = plan?.requests || [];
    for (const req of reqs) {
      logs.push(`  - PLAN ${req.method} ${req.path}${req.note ? ` (${req.note})` : ""}`);
    }
  }
  function makeApplyPlanSignature(mode, payload) {
    return stableStringify({
      mode,
      targetApp: payload?.targetApp || "",
      targetGuest: payload?.targetGuest || "",
      sourceApp: payload?.sourceApp || "",
      sourceGuest: payload?.sourceGuest || "",
      scopes: payload?.scopes || [],
      nodes: payload?.nodes || [],
      lookupMap: payload?.lookupMap || ""
    });
  }
  function markApplyPlan(signature, mode, totalReq, lines) {
    state.lastApplyPlan = {
      signature,
      mode,
      totalReq: Number(totalReq || 0),
      createdAt: Date.now(),
      summary: (lines || []).slice(0, 16).join("\n"),
      logs: lines || []
    };
  }
  function showInlineConfirmation(plan, options) {
    const appIdRefs = options && options.appIdRefs || [];
    return new Promise((resolve) => {
      const stamp = new Date(plan.createdAt).toLocaleString();
      const planText = (plan.logs || []).join("\n") || "(プラン詳細なし)";
      const appIdSection = renderAppIdConfirmSection(appIdRefs);
      const previousHtml = ui.result.innerHTML;
      const previousScrollTop = ui.result.scrollTop;
      ui.result.innerHTML = `<div class="plan-confirm-panel">
      <div style="font-weight:700;font-size:13px;margin-bottom:8px">反映プラン確認</div>
      ${appIdSection}
      <div class="plan-summary">${esc(planText)}</div>
      <div class="plan-actions">
        <span class="plan-meta">予定リクエスト: ${plan.totalReq || 0}件 | 作成: ${esc(stamp)}</span>
        <button class="btn sub" id="u_planCancel">キャンセル</button>
        <button class="btn ok" id="u_planExecute">このまま実行</button>
      </div>
    </div>`;
      ui.result.scrollTop = 0;
      const cleanup = () => {
        const execBtn = getToolDocument().getElementById("u_planExecute");
        const cancelBtn = getToolDocument().getElementById("u_planCancel");
        if (execBtn) execBtn.removeEventListener("click", onExec);
        if (cancelBtn) cancelBtn.removeEventListener("click", onCancel);
      };
      const onExec = () => {
        cleanup();
        resolve(true);
      };
      const onCancel = () => {
        cleanup();
        ui.result.innerHTML = previousHtml;
        ui.result.scrollTop = previousScrollTop;
        resolve(false);
      };
      getToolDocument().getElementById("u_planExecute")?.addEventListener("click", onExec);
      getToolDocument().getElementById("u_planCancel")?.addEventListener("click", onCancel);
    });
  }
  async function ensureApplyPlanApproved(signature, mode, planRunner, options) {
    const plan = state.lastApplyPlan;
    const valid = !!plan && plan.signature === signature && plan.mode === mode;
    if (!valid) {
      await planRunner();
    }
    const currentPlan = state.lastApplyPlan;
    if (!currentPlan) return false;
    return showInlineConfirmation(currentPlan, options);
  }
  async function runPreviewApplyPlanNodes() {
    await ensureDiffPreparedForReflect();
    const c = commonParams();
    if (!c.target.appId) throw new Error("比較先アプリIDを入力してください");
    if (!state.reflectRows.length) loadReflectRowsFromLastDiff();
    const rows = getSelectedReflectRows();
    if (!rows.length) throw new Error("反映ノードを選択してください");
    const lookupMap = parseLookupMapInput(ui.lookupMap.value);
    const prefix = buildApiPrefix(c.target.guestId, true);
    const app = c.target.appId;
    const nodeSigRows = rows.map((r) => ({ id: r._id, sectionKey: r.sectionKey, mode: reflectRowModeById(r._id), type: r.type, path: r.path })).sort((a, b) => String(a.id).localeCompare(String(b.id)));
    const planSignature = makeApplyPlanSignature("nodes", {
      targetApp: c.target.appId,
      targetGuest: c.target.guestId,
      sourceApp: c.source.appId,
      sourceGuest: c.source.guestId,
      nodes: nodeSigRows,
      lookupMap: ui.lookupMap.value.trim()
    });
    const sectionMap = {};
    let srcCount = 0;
    let tgtCount = 0;
    for (const r of rows) {
      const key = r.sectionKey;
      if (!key) continue;
      if (!sectionMap[key]) sectionMap[key] = { total: 0, added: 0, removed: 0, changed: 0 };
      sectionMap[key].total += 1;
      if (reflectRowModeById(r._id) === "src") srcCount += 1;
      else tgtCount += 1;
      if (r.type === "added") sectionMap[key].added += 1;
      else if (r.type === "removed") sectionMap[key].removed += 1;
      else sectionMap[key].changed += 1;
    }
    const lines = [];
    lines.push("=== 反映プラン（ノードモード）===");
    lines.push(`比較先アプリ: ${c.target.appId}`);
    lines.push(`選択ノード数: ${rows.length}`);
    lines.push(`モード内訳: 比較元 ${srcCount} / 比較先 ${tgtCount}`);
    lines.push("");
    for (const [k, stat] of Object.entries(sectionMap)) {
      const label = SECTION_DEFS.find((d) => d.key === k)?.label || k;
      lines.push(`${label}: ${stat.total}件 (A:${stat.added} R:${stat.removed} C:${stat.changed})`);
    }
    lines.push("");
    const bySection = {};
    for (const row of rows) {
      if (!row.sectionKey) continue;
      if (!bySection[row.sectionKey]) bySection[row.sectionKey] = [];
      bySection[row.sectionKey].push(row);
    }
    let totalReq = 0;
    const sectionKeys = Object.keys(bySection);
    for (let i = 0; i < sectionKeys.length; i++) {
      const secKey = sectionKeys[i];
      const def = SECTION_DEFS.find((d) => d.key === secKey);
      if (!def || !def.put) continue;
      try {
        setStatus(`ノード反映プラン計算中 ${i + 1}/${sectionKeys.length}: ${def.label}`);
        const current = normalize(await apiGet(prefix, def.endpoint, { app }));
        const before = deepClone(current);
        let patched = deepClone(current);
        const rowsInSection = sortRowsForPatch(bySection[secKey], secKey);
        for (const row of rowsInSection) {
          const r = applyDiffRowToSection(patched, row, secKey);
          patched = r.section;
        }
        let plan;
        if (secKey === "fieldSettings") {
          const sourceModeCodes = new Set(
            rowsInSection.filter((row) => reflectRowModeById(row._id) === "src").map(extractFieldCodeFromRowPath).filter(Boolean)
          );
          plan = planFieldSectionDiffRequests(app, before.properties || before || {}, patched.properties || patched || {}, lookupMap, sourceModeCodes);
        } else if (secKey === "viewSettings") {
          plan = planViewsSectionDiffRequests(app, before.views || before || {}, patched.views || patched || {});
        } else if (secKey === "reportSettings") {
          plan = planReportsSectionDiffRequests(app, before.reports || before || {}, patched.reports || patched || {});
        } else if (secKey === "actionSettings") {
          plan = planActionsSectionDiffRequests(app, before.actions || before || {}, patched.actions || patched || {});
        } else {
          plan = { requests: [{ method: "PUT", path: def.endpoint, body: { app, ...def.putBuilder(patched) }, note: `${def.label} put` }] };
        }
        totalReq += (plan.requests || []).length;
        lines.push(`PLAN ${def.label}: ${plan.requests.length} request(s)`);
        appendRequestPlanLogs(lines, plan);
      } catch (e) {
        lines.push(`PLAN NG ${def?.label || secKey}: ${e.message || String(e)}`);
      }
    }
    lines.push("");
    lines.push(`合計予定リクエスト数: ${totalReq}`);
    lines.push("※ ノードモードは差分パスをもとに比較先プレビューへ反映します。");
    markApplyPlan(planSignature, "nodes", totalReq, lines);
    ui.result.innerHTML = `<pre style="margin:0;padding:10px;font-size:12px;white-space:pre-wrap">${esc(lines.join("\n"))}</pre>`;
    renderReflectAssistPanel();
    renderReflectMainPanel();
    setStatus("ノード反映プラン確認完了");
  }
  async function runPreviewApplyPlan() {
    if (isReflectNodeModeEffective()) return runPreviewApplyPlanNodes();
    await ensureDiffPreparedForReflect();
    const c = commonParams();
    if (!c.target.appId) throw new Error("比較先アプリIDを入力してください");
    const lookupMap = parseLookupMapInput(ui.lookupMap.value);
    const baseScopes = selectedScopeKeys(ui.applyScopes);
    if (!baseScopes.length) throw new Error("反映セクションを選択してください");
    const scopes = resolveApplyScopes(baseScopes);
    saveCurrentDialogState2();
    const planSignature = makeApplyPlanSignature("section", {
      targetApp: c.target.appId,
      targetGuest: c.target.guestId,
      sourceApp: c.source.appId,
      sourceGuest: c.source.guestId,
      scopes,
      lookupMap: ui.lookupMap.value.trim()
    });
    const sourceBundle = await getSourceBundleForApply(c, scopes);
    const prefix = buildApiPrefix(c.target.guestId, true);
    const app = c.target.appId;
    const logs = [];
    logs.push("=== 反映プラン（ドライラン）===");
    logs.push(`比較先アプリ: ${app}`);
    logs.push(`対象セクション: ${scopes.map((k) => SECTION_DEFS.find((d) => d.key === k)?.label || k).join(", ")}`);
    logs.push("");
    let totalReq = 0;
    for (let i = 0; i < scopes.length; i++) {
      const secKey = scopes[i];
      const def = SECTION_DEFS.find((x) => x.key === secKey);
      if (!def || !def.put) {
        logs.push(`SKIP ${def?.label || secKey}: PUT非対応`);
        continue;
      }
      const sourceSec = deepClone(sourceBundle.sections[secKey]);
      if (!sourceSec || sourceSec._fetchError) {
        logs.push(`SKIP ${def.label}: source未取得`);
        continue;
      }
      if (secKey === "fieldSettings") {
        const current = await apiGet(prefix, "/app/form/fields.json", { app });
        const plan2 = planFieldSectionDiffRequests(app, current.properties || {}, sourceSec.properties || sourceSec || {}, lookupMap);
        logs.push(`PLAN ${def.label}: ${plan2.requests.length} request(s)`);
        appendRequestPlanLogs(logs, plan2);
        if (plan2.lookupChanged) logs.push(`  - lookup appId 変換: ${plan2.lookupChanged}`);
        totalReq += plan2.requests.length;
        continue;
      }
      if (secKey === "viewSettings") {
        const current = await apiGet(prefix, "/app/views.json", { app });
        const plan2 = planViewsSectionDiffRequests(app, current.views || {}, sourceSec.views || sourceSec || {});
        logs.push(`PLAN ${def.label}: ${plan2.requests.length} request(s)`);
        appendRequestPlanLogs(logs, plan2);
        if (plan2.deleteSkipCount) logs.push(`  - views delete(skip): ${plan2.deleteSkipCount} (互換モード: 削除は行いません)`);
        totalReq += plan2.requests.length;
        continue;
      }
      if (secKey === "reportSettings") {
        const current = await apiGet(prefix, "/app/reports.json", { app });
        const plan2 = planReportsSectionDiffRequests(app, current.reports || {}, sourceSec.reports || sourceSec || {});
        logs.push(`PLAN ${def.label}: ${plan2.requests.length} request(s)`);
        appendRequestPlanLogs(logs, plan2);
        totalReq += plan2.requests.length;
        continue;
      }
      if (secKey === "actionSettings") {
        const current = await apiGet(prefix, "/app/actions.json", { app });
        const plan2 = planActionsSectionDiffRequests(app, current.actions || {}, sourceSec.actions || sourceSec || {});
        logs.push(`PLAN ${def.label}: ${plan2.requests.length} request(s)`);
        appendRequestPlanLogs(logs, plan2);
        if (plan2.deleteSkipCount) logs.push(`  - actions delete(skip): ${plan2.deleteSkipCount} (互換モード: 削除は行いません)`);
        totalReq += plan2.requests.length;
        continue;
      }
      const plan = { requests: [{ method: "PUT", path: def.endpoint, body: { app, ...def.putBuilder(sourceSec) }, note: `${def.label} put` }] };
      logs.push(`PLAN ${def.label}: ${plan.requests.length} request(s)`);
      appendRequestPlanLogs(logs, plan);
      totalReq += plan.requests.length;
    }
    logs.push("");
    logs.push(`合計予定リクエスト数: ${totalReq}`);
    markApplyPlan(planSignature, "section", totalReq, logs);
    ui.result.innerHTML = `<pre style="margin:0;padding:10px;font-size:12px;white-space:pre-wrap">${esc(logs.join("\n"))}</pre>`;
    renderReflectAssistPanel();
    renderReflectMainPanel();
    setStatus("反映プラン確認完了");
  }
  var init_plan = __esm({
    "src/reflect/plan.js"() {
      "use strict";
      init_constants();
      init_utils();
      init_state();
      init_dialog();
      init_nodeModeUi();
      init_api();
      init_apply();
      init_rowMode();
      init_helpers();
    }
  });

  // src/tabs/diff.js
  var diff_exports = {};
  __export(diff_exports, {
    addIgnoreKeyFromInput: () => addIgnoreKeyFromInput,
    applyIgnorePresetKeysToInput: () => applyIgnorePresetKeysToInput,
    commonParams: () => commonParams,
    copyDiffSummaryToClipboard: () => copyDiffSummaryToClipboard,
    currentDiffSignature: () => currentDiffSignature,
    ensureDiffPreparedForReflect: () => ensureDiffPreparedForReflect2,
    exportBundleJson: () => exportBundleJson,
    exportDiffHtml: () => exportDiffHtml,
    exportDiffJson: () => exportDiffJson,
    exportPatchJson: () => exportPatchJson,
    getIgnorePresetState: () => getIgnorePresetState,
    importBundleFromFile: () => importBundleFromFile,
    parseBundleLikeObject: () => parseBundleLikeObject,
    restoreDialogState: () => restoreDialogState,
    runDiff: () => runDiff,
    runDiffAndPreviewPlan: () => runDiffAndPreviewPlan,
    saveCurrentDialogState: () => saveCurrentDialogState2
  });
  function getIgnorePresetState() {
    return {
      fieldOrder: !!ui.ignorePresetFieldOrder?.checked,
      meta: !!ui.ignorePresetMeta?.checked,
      labelName: !!ui.ignorePresetLabelName?.checked
    };
  }
  function applyIgnorePresetKeysToInput(options = {}) {
    const current = new Set((ui.ignoreKeys.value || "").split(",").map((k) => k.trim()).filter(Boolean));
    const preset = getIgnorePresetState();
    const removeDisabled = !!options.removeDisabled;
    Object.entries(IGNORE_PRESET_KEYS).forEach(([name, keys]) => {
      const enabled = !!preset[name];
      keys.forEach((key) => {
        if (enabled) current.add(key);
        else if (removeDisabled) current.delete(key);
      });
    });
    ui.ignoreKeys.value = [...current].join(", ");
    renderIgnoreKeyChips();
  }
  function addIgnoreKeyFromInput() {
    const input = getToolDocument().getElementById("u_ignoreKeyInput");
    if (!input) return;
    const key = input.value.trim();
    if (!key) return;
    const current = (ui.ignoreKeys.value || "").split(",").map((k) => k.trim()).filter(Boolean);
    if (!current.includes(key)) {
      current.push(key);
      ui.ignoreKeys.value = current.join(", ");
      renderIgnoreKeyChips();
      saveCurrentDialogState2();
    }
    input.value = "";
    input.focus();
  }
  function commonParams() {
    return {
      source: {
        appId: ui.sourceApp.value.trim(),
        guestId: ui.sourceGuest.value.trim(),
        preview: ui.sourcePreview.checked
      },
      target: {
        appId: ui.targetApp.value.trim(),
        guestId: ui.targetGuest.value.trim(),
        preview: ui.targetPreview.checked
      }
    };
  }
  function parseBundleLikeObject(raw, side) {
    let obj = raw;
    if (obj && typeof obj === "object" && obj.source && obj.target) {
      obj = side === "source" ? obj.source : obj.target;
    }
    return ensureBundleShape(obj);
  }
  function currentDiffSignature() {
    const c = commonParams();
    return stableStringify({
      source: c.source,
      target: c.target,
      scopes: selectedScopeKeys(ui.diffScopes),
      ignoreKeys: ui.ignoreKeys.value.trim(),
      includeSame: !!ui.diffIncludeSame?.checked,
      normalization: getDiffNormalizationPresetState(),
      importedSource: !!state.importedSourceBundle,
      importedTarget: !!state.importedTargetBundle
    });
  }
  async function ensureDiffPreparedForReflect2() {
    const sig = currentDiffSignature();
    if (state.lastDiffAt && state.lastDiffSignature === sig) return;
    setStatus("差分が未作成または条件変更のため、自動で差分比較を実行します...");
    await runDiff();
  }
  async function importBundleFromFile(side, file) {
    const text = await readTextFile(file);
    const raw = JSON.parse(text);
    const bundle = parseBundleLikeObject(raw, side);
    if (side === "source") {
      state.importedSourceBundle = bundle;
      state.importedSourceName = file.name || "";
      state.lastSourceBundle = bundle;
    } else {
      state.importedTargetBundle = bundle;
      state.importedTargetName = file.name || "";
      state.lastTargetBundle = bundle;
    }
    state.lastDiffAt = null;
    state.lastDiffRows = [];
    state.lastFetchIssues = [];
    state.lastDiffSignature = "";
    state.lastApplyPlan = null;
    state.diffSelectedIds = /* @__PURE__ */ new Set();
    state.diffIgnoreSuggestions = [];
    state.reflectRows = [];
    state.reflectSelectedIds = /* @__PURE__ */ new Set();
    state.reflectNodeModes = {};
    state.reflectUndoStack = [];
    state.reflectRedoStack = [];
    state.reflectActiveNodeId = "";
    renderResultRows([]);
    renderBundleState();
    renderReflectSidebar();
    renderReflectMainPanel();
  }
  async function resolveBundle(side, params, scopes, onProgress, options) {
    const imported = side === "source" ? state.importedSourceBundle : state.importedTargetBundle;
    if (imported && !options?.skipImported) return imported;
    return fetchBundle({ ...params, sections: scopes, onProgress });
  }
  async function runDiff() {
    const c = commonParams();
    const scopes = selectedScopeKeys(ui.diffScopes);
    if (!scopes.length) throw new Error("比較セクションを選択してください");
    if (!state.importedSourceBundle && !c.source.appId) throw new Error("比較元アプリIDを入力してください");
    if (!state.importedTargetBundle && !c.target.appId) throw new Error("比較先アプリIDを入力してください");
    saveCurrentDialogState2();
    const modeTag = getPreviewCompareStatusPrefix(ui);
    setStatus(`${modeTag} 比較元を取得中...`);
    const source = await resolveBundle("source", c.source, scopes, (p, l) => setStatus(`${modeTag} 比較元を取得中 ${Math.round(p * 100)}% (${l})`));
    setStatus(`${modeTag} 比較先を取得中...`);
    const target = await resolveBundle("target", c.target, scopes, (p, l) => setStatus(`${modeTag} 比較先を取得中 ${Math.round(p * 100)}% (${l})`));
    setStatus("差分計算中...");
    const diffResult = computeDiffRows(source, target, scopes, ui.ignoreKeys.value, {
      normalizationPresetState: getDiffNormalizationPresetState(),
      includeSame: !!ui.diffIncludeSame?.checked
    });
    const rows = enrichDiffRows(diffResult.rows, source, target);
    state.lastSourceBundle = source;
    state.lastTargetBundle = target;
    state.lastDiffRows = rows;
    state.lastFetchIssues = diffResult.fetchIssues || [];
    state.lastDiffAt = (/* @__PURE__ */ new Date()).toISOString();
    state.lastDiffSignature = currentDiffSignature();
    state.lastApplyPlan = null;
    state.diffSectionVisibleCounts = {};
    state.diffSelectedIds = /* @__PURE__ */ new Set();
    state.diffExcludeSections = null;
    state.diffIgnoreSuggestions = buildIgnoreKeySuggestions(rows, ui.ignoreKeys.value);
    renderDiffFilterOptions();
    switchSubTab("diff", "view");
    renderResultRows(rows);
    const { loadReflectRowsFromLastDiff: loadReflectRowsFromLastDiff2 } = await Promise.resolve().then(() => (init_reflect(), reflect_exports));
    if (isReflectNodeModeEffective() || state.reflectRows.length) {
      try {
        loadReflectRowsFromLastDiff2();
      } catch (e) {
        console.warn(e);
      }
    }
    const s = summarizeRows(rows);
    const sev = summarizeSeverity(rows);
    const warning = buildDiffWarningInfo(rows, state.lastFetchIssues);
    renderBundleState();
    renderReflectSidebar();
    renderReflectMainPanel();
    setStatus(`差分比較完了: 差分 ${countActualDiffRows(rows)}件 / 同一 ${s.same}件 / 取得失敗 ${state.lastFetchIssues.length}件${warning.exceeded ? ` / 警告 ${warning.total}>=${warning.threshold}` : ""} (追加:${s.added} / 削除:${s.removed} / 変更:${s.changed} / 移動:${s.moved} / 高:${sev.high} / 中:${sev.medium} / 低:${sev.low})`);
  }
  async function runDiffAndPreviewPlan() {
    await runDiff();
    switchTab("reflect");
    if (ui.result) ui.result.innerHTML = MAIN_RESULT_IDLE_HTML;
    const { runPreviewApplyPlan: runPreviewApplyPlan2 } = await Promise.resolve().then(() => (init_plan(), plan_exports));
    await runPreviewApplyPlan2();
    setStatus("差分比較→反映プラン確認 完了");
  }
  async function copyDiffSummaryToClipboard() {
    if (!state.lastDiffRows.length && !state.lastFetchIssues.length) throw new Error("先に差分比較を実行してください");
    const exportInfo = resolveDiffExportRows();
    const rows = exportInfo.rows || [];
    const groups = groupDiffRowsBySection(rows);
    const lines = [];
    lines.push("kintone差分サマリー");
    lines.push(`出力対象: ${exportInfo.label}`);
    try {
      const c = commonParams();
      lines.push(`プレビュー比較: (比較元GET=${getPreviewStateLabel(c.source.preview)} / 比較先GET=${getPreviewStateLabel(c.target.preview)})`);
    } catch (e) {
      lines.push("プレビュー比較: (取得できませんでした)");
    }
    lines.push(`比較元アプリ: ${state.lastSourceBundle?.appId || "-"}`);
    lines.push(`比較先アプリ: ${state.lastTargetBundle?.appId || "-"}`);
    lines.push(`生成日時: ${(/* @__PURE__ */ new Date()).toISOString()}`);
    lines.push(`取得失敗: ${state.lastFetchIssues.length}`);
    lines.push("");
    groups.forEach((group) => {
      lines.push(`[${group.label}] ${group.rows.length}件`);
      group.rows.forEach((row) => {
        const typeLabel = getDiffTypeDisplayLabel(row.type, { moved: !!row.moved });
        const meta = [
          row.reasonSummary || "",
          row.renameCandidate ? `名称変更候補 ${row.renameCandidate.fromCode || "-"}→${row.renameCandidate.toCode || "-"}` : "",
          row.impactCount ? `影響 ${row.impactCount}件` : ""
        ].filter(Boolean).join(" / ");
        lines.push(` - ${typeLabel} / ${getSeverityDisplayLabel(row.severity || "low")} / ${row.path || "-"}${meta ? ` / ${meta}` : ""}`);
      });
      lines.push("");
    });
    if (state.lastFetchIssues.length) {
      lines.push("[API取得失敗]");
      state.lastFetchIssues.forEach((issue) => {
        lines.push(` - ${issue.section || issue.sectionKey || "-"} / ${getIssueSideLabel(issue.side)} / ${String(issue.message || "-").replace(/\n+/g, " | ")}`);
      });
      lines.push("");
    }
    await navigator.clipboard.writeText(lines.join("\n"));
    setStatus(`差分サマリーをコピーしました (${rows.length}件 / ${exportInfo.label})`);
  }
  async function exportBundleJson() {
    if (!state.lastSourceBundle || !state.lastTargetBundle) throw new Error("先に差分比較を実行してください");
    const payload = {
      generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
      source: state.lastSourceBundle,
      target: state.lastTargetBundle
    };
    downloadText(`bundle_${nowStamp()}.json`, JSON.stringify(payload, null, 2), "application/json");
    setStatus("バンドルJSONを保存しました");
  }
  async function exportDiffJson() {
    if (!state.lastSourceBundle || !state.lastTargetBundle) throw new Error("先に差分比較を実行してください");
    const exportInfo = resolveDiffExportRows();
    const exportContentMode = resolveDiffExportContentMode();
    const compareInfo = shouldIncludeComparedContent(exportContentMode) ? buildDiffExportComparedBundles(
      state.lastSourceBundle,
      state.lastTargetBundle,
      resolveDiffExportComparedScopes(exportInfo, selectedScopeKeys(ui.diffScopes))
    ) : null;
    if (!exportInfo.rows.length && !state.lastFetchIssues.length && !compareInfo?.scopes?.length) {
      throw new Error("出力できる比較結果がありません");
    }
    const payload = {
      generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
      exportMode: exportInfo.mode,
      exportLabel: exportInfo.label,
      exportContentMode,
      exportContentLabel: getDiffExportContentLabel(exportContentMode),
      normalization: getDiffNormalizationPresetState(),
      warning: buildDiffWarningInfo(exportInfo.rows, state.lastFetchIssues),
      source: state.lastSourceBundle,
      target: state.lastTargetBundle,
      diffCount: exportInfo.rows.length,
      fetchIssues: state.lastFetchIssues,
      rows: exportInfo.rows,
      comparedScopes: compareInfo?.scopes || [],
      sourceComparedBundle: compareInfo?.sourceBundle || null,
      targetComparedBundle: compareInfo?.targetBundle || null
    };
    downloadText(`diff_${nowStamp()}.json`, JSON.stringify(payload, null, 2), "application/json");
    setStatus(`差分JSONを保存しました (${exportInfo.label} / ${getDiffExportContentLabel(exportContentMode)})`);
  }
  async function exportDiffHtml() {
    if (!state.lastSourceBundle || !state.lastTargetBundle) throw new Error("先に差分比較を実行してください");
    const exportInfo = resolveDiffExportRows();
    const scopes = selectedScopeKeys(ui.diffScopes);
    const exportContentMode = resolveDiffExportContentMode();
    const compareInfo = shouldIncludeComparedContent(exportContentMode) ? buildDiffExportComparedBundles(
      state.lastSourceBundle,
      state.lastTargetBundle,
      resolveDiffExportComparedScopes(exportInfo, scopes)
    ) : null;
    if (!exportInfo.rows.length && !state.lastFetchIssues.length && !compareInfo?.scopes?.length) {
      throw new Error("出力できる比較結果がありません");
    }
    const html = buildDiffHtml(state.lastSourceBundle, state.lastTargetBundle, exportInfo.rows || [], scopes, ui.ignoreKeys.value, {
      fetchIssues: state.lastFetchIssues,
      exportMode: exportInfo.mode,
      exportLabel: exportInfo.label,
      exportContentMode,
      exportContentLabel: getDiffExportContentLabel(exportContentMode),
      compareScopes: compareInfo?.scopes || [],
      compareSourceBundle: compareInfo?.sourceBundle || null,
      compareTargetBundle: compareInfo?.targetBundle || null,
      normalizationState: getDiffNormalizationPresetState(),
      warning: buildDiffWarningInfo(exportInfo.rows, state.lastFetchIssues)
    });
    downloadText(`diff_${nowStamp()}.html`, html, "text/html");
    setStatus(`差分HTMLを保存しました (${exportInfo.label} / ${getDiffExportContentLabel(exportContentMode)})`);
  }
  async function exportPatchJson() {
    if (!state.lastDiffRows.length) throw new Error("先に差分比較を実行してください");
    const exportInfo = resolveDiffExportRows();
    if (!countActualDiffRows(exportInfo.rows)) throw new Error("出力できる差分がありません");
    const payload = buildPatchPayload(exportInfo.rows, state.lastSourceBundle, state.lastTargetBundle);
    downloadText(`patch_${nowStamp()}.json`, JSON.stringify(payload, null, 2), "application/json");
    setStatus(`パッチJSONを保存しました (${exportInfo.label})`);
  }
  function saveCurrentDialogState2() {
    const root2 = getRoot();
    if (!root2) return;
    const dialogRect = root2.getBoundingClientRect();
    const dialogPos = getCurrentDialogPosition(dialogRect.width || DIALOG_DEFAULT_WIDTH, dialogRect.height || DIALOG_DEFAULT_HEIGHT);
    saveDialogState({
      activeTab: state.activeTab,
      activeSubTabs: { ...state.activeSubTabs },
      dialogWidth: Math.round(dialogRect.width || DIALOG_DEFAULT_WIDTH),
      dialogHeight: Math.round(dialogRect.height || DIALOG_DEFAULT_HEIGHT),
      dialogLeft: dialogPos.left,
      dialogTop: dialogPos.top,
      sourceAppId: ui.sourceApp.value.trim(),
      sourceGuestId: ui.sourceGuest.value.trim(),
      sourcePreview: ui.sourcePreview.checked,
      targetAppId: ui.targetApp.value.trim(),
      targetGuestId: ui.targetGuest.value.trim(),
      targetPreview: ui.targetPreview.checked,
      lookupMap: ui.lookupMap.value.trim(),
      ignoreKeys: ui.ignoreKeys.value.trim(),
      ignorePresetFieldOrder: !!ui.ignorePresetFieldOrder?.checked,
      ignorePresetMeta: !!ui.ignorePresetMeta?.checked,
      ignorePresetLabelName: !!ui.ignorePresetLabelName?.checked,
      diffNormalizeViewOrder: !!ui.diffNormalizeViewOrder?.checked,
      diffNormalizePermissionOrder: !!ui.diffNormalizePermissionOrder?.checked,
      diffSearch: ui.diffSearch.value.trim(),
      diffSearchFieldName: !!ui.diffSearchFieldName?.checked,
      diffFilterSection: ui.diffFilterSection?.value || state.diffFilterSection || "",
      diffFilterType: ui.diffFilterType?.value || "",
      diffIncludeSame: !!ui.diffIncludeSame?.checked,
      diffFilterSeverity: ui.diffFilterSeverity?.value || "",
      diffExportMode: ui.diffExportMode?.value || state.diffExportMode || "all",
      diffExportContent: ui.diffExportContent?.value || state.diffExportContent || "diffOnly",
      diffWarnThreshold: ui.diffWarnThreshold?.value?.trim?.() || "",
      charDiff: ui.charDiff.checked,
      diffTheme: state.diffViewTheme,
      diffScopes: selectedScopeKeys(ui.diffScopes),
      applyScopes: selectedScopeKeys(ui.applyScopes),
      applyDiffOnly: ui.applyDiffOnly.checked,
      autoBackupPreview: ui.autoBackupPreview.checked,
      stopOnError: ui.stopOnError.checked,
      nodeMode: ui.nodeMode.checked,
      reflectSimpleMode: !!ui.reflectSimpleMode?.checked,
      reflectDetailTab: state.reflectDetailTab,
      doDeploy: ui.doDeploy.checked,
      overwriteField: ui.overwriteField.checked,
      deployField: ui.deployField.checked,
      erLayout: ui.erLayout?.value || "dagre",
      erFieldDensity: ui.erFieldDensity?.value || "standard",
      erMaxDepth: ui.erMaxDepth?.value?.trim?.() || "0",
      erExtraApps: ui.erExtraApps?.value?.trim?.() || "",
      erIncludeSubtable: !!ui.erIncludeSubtable?.checked,
      erIncludeReverseLookup: !!ui.erIncludeReverseLookup?.checked,
      settingsExportAppIds: ui.settingsExportAppIds.value.trim(),
      settingsExportSearchKeyword: ui.settingsExportSearchKeyword.value.trim(),
      settingsExportGuest: ui.settingsExportGuest.value.trim(),
      settingsExportPreview: ui.settingsExportPreview.checked,
      settingsExportScopes: selectedScopeKeys(ui.settingsExportScopes)
    });
  }
  function restoreDialogState() {
    const saved = loadDialogState();
    Object.entries(DEFAULT_SUBTAB_STATE).forEach(([parentKey, subKey]) => {
      switchSubTab(parentKey, subKey, { persist: false });
    });
    if (!saved || typeof saved !== "object") {
      const initialPos = getDefaultDialogPosition(DIALOG_DEFAULT_WIDTH, DIALOG_DEFAULT_HEIGHT);
      applyDialogPosition(initialPos.left, initialPos.top, { persist: false });
      return;
    }
    let restoredSize;
    if (saved.dialogWidth != null || saved.dialogHeight != null) {
      restoredSize = applyDialogSize(saved.dialogWidth, saved.dialogHeight, { persist: false });
    } else {
      restoredSize = fitDialogToViewport({ persist: false });
    }
    if (saved.dialogLeft != null || saved.dialogTop != null) {
      applyDialogPosition(saved.dialogLeft, saved.dialogTop, { persist: false });
    } else {
      const defaultPos = getDefaultDialogPosition(restoredSize?.width, restoredSize?.height);
      applyDialogPosition(defaultPos.left, defaultPos.top, { persist: false });
    }
    if (saved.sourceAppId != null) ui.sourceApp.value = String(saved.sourceAppId);
    if (saved.sourceGuestId != null) ui.sourceGuest.value = String(saved.sourceGuestId);
    if (saved.sourcePreview != null) ui.sourcePreview.checked = !!saved.sourcePreview;
    if (saved.targetAppId != null) ui.targetApp.value = String(saved.targetAppId);
    if (saved.targetGuestId != null) ui.targetGuest.value = String(saved.targetGuestId);
    if (saved.targetPreview != null) ui.targetPreview.checked = !!saved.targetPreview;
    if (saved.lookupMap != null) ui.lookupMap.value = String(saved.lookupMap);
    if (saved.ignoreKeys != null) ui.ignoreKeys.value = String(saved.ignoreKeys);
    if (saved.ignorePresetFieldOrder != null && ui.ignorePresetFieldOrder) ui.ignorePresetFieldOrder.checked = !!saved.ignorePresetFieldOrder;
    if (saved.ignorePresetMeta != null && ui.ignorePresetMeta) ui.ignorePresetMeta.checked = !!saved.ignorePresetMeta;
    if (saved.ignorePresetLabelName != null && ui.ignorePresetLabelName) ui.ignorePresetLabelName.checked = !!saved.ignorePresetLabelName;
    if (saved.diffNormalizeViewOrder != null && ui.diffNormalizeViewOrder) ui.diffNormalizeViewOrder.checked = !!saved.diffNormalizeViewOrder;
    if (saved.diffNormalizePermissionOrder != null && ui.diffNormalizePermissionOrder) ui.diffNormalizePermissionOrder.checked = !!saved.diffNormalizePermissionOrder;
    if (saved.diffSearch != null) ui.diffSearch.value = String(saved.diffSearch);
    if (saved.diffSearchFieldName != null && ui.diffSearchFieldName) {
      ui.diffSearchFieldName.checked = !!saved.diffSearchFieldName;
      state.diffSearchFieldName = !!saved.diffSearchFieldName;
    }
    if (saved.diffFilterSection != null) state.diffFilterSection = String(saved.diffFilterSection);
    if (saved.diffFilterType != null && ui.diffFilterType) ui.diffFilterType.value = String(saved.diffFilterType || "");
    if (saved.diffFilterSeverity != null && ui.diffFilterSeverity) ui.diffFilterSeverity.value = String(saved.diffFilterSeverity || "");
    if (saved.diffExportMode != null && ui.diffExportMode) ui.diffExportMode.value = String(saved.diffExportMode || "all");
    state.diffExportMode = ui.diffExportMode?.value || String(saved.diffExportMode || "all");
    if (saved.diffExportContent != null && ui.diffExportContent) ui.diffExportContent.value = String(saved.diffExportContent || "diffOnly");
    state.diffExportContent = ui.diffExportContent?.value || String(saved.diffExportContent || "diffOnly");
    if (saved.diffWarnThreshold != null && ui.diffWarnThreshold) ui.diffWarnThreshold.value = String(saved.diffWarnThreshold || "");
    if (saved.charDiff != null) ui.charDiff.checked = !!saved.charDiff;
    if (saved.diffIncludeSame != null && ui.diffIncludeSame) {
      ui.diffIncludeSame.checked = !!saved.diffIncludeSame;
      state.diffIncludeSame = !!saved.diffIncludeSame;
    }
    if (saved.diffTheme === "dark" || saved.diffTheme === "light") state.diffViewTheme = saved.diffTheme;
    if (saved.applyDiffOnly != null) ui.applyDiffOnly.checked = !!saved.applyDiffOnly;
    if (saved.autoBackupPreview != null) ui.autoBackupPreview.checked = !!saved.autoBackupPreview;
    if (saved.stopOnError != null) ui.stopOnError.checked = !!saved.stopOnError;
    if (saved.nodeMode != null) ui.nodeMode.checked = !!saved.nodeMode;
    if (saved.reflectSimpleMode != null && ui.reflectSimpleMode) ui.reflectSimpleMode.checked = !!saved.reflectSimpleMode;
    if (ui.reflectSimpleMode?.checked) ui.nodeMode.checked = false;
    if (saved.reflectDetailTab != null) state.reflectDetailTab = String(saved.reflectDetailTab || "diff");
    if (saved.doDeploy != null) ui.doDeploy.checked = !!saved.doDeploy;
    if (saved.overwriteField != null) ui.overwriteField.checked = !!saved.overwriteField;
    if (saved.deployField != null) ui.deployField.checked = !!saved.deployField;
    if (saved.erLayout != null && ui.erLayout) ui.erLayout.value = String(saved.erLayout || "dagre");
    if (saved.erFieldDensity != null && ui.erFieldDensity) ui.erFieldDensity.value = String(saved.erFieldDensity || "standard");
    if (saved.erMaxDepth != null && ui.erMaxDepth) ui.erMaxDepth.value = String(saved.erMaxDepth || "0");
    if (saved.erExtraApps != null && ui.erExtraApps) ui.erExtraApps.value = String(saved.erExtraApps || "");
    if (saved.erIncludeSubtable != null && ui.erIncludeSubtable) ui.erIncludeSubtable.checked = !!saved.erIncludeSubtable;
    if (saved.erIncludeReverseLookup != null && ui.erIncludeReverseLookup) ui.erIncludeReverseLookup.checked = !!saved.erIncludeReverseLookup;
    if (saved.settingsExportAppIds != null) ui.settingsExportAppIds.value = String(saved.settingsExportAppIds);
    if (saved.settingsExportSearchKeyword != null) ui.settingsExportSearchKeyword.value = String(saved.settingsExportSearchKeyword);
    if (saved.settingsExportGuest != null) ui.settingsExportGuest.value = String(saved.settingsExportGuest);
    if (saved.settingsExportPreview != null) ui.settingsExportPreview.checked = !!saved.settingsExportPreview;
    const markChecks = (container, selected) => {
      if (!Array.isArray(selected)) return;
      const set = new Set(selected);
      [...container.querySelectorAll('input[type="checkbox"]')].forEach((c) => {
        c.checked = set.has(c.value);
      });
    };
    markChecks(ui.diffScopes, saved.diffScopes);
    markChecks(ui.applyScopes, saved.applyScopes);
    markChecks(ui.settingsExportScopes, saved.settingsExportScopes);
    Object.entries(DEFAULT_SUBTAB_STATE).forEach(([parentKey, defaultKey]) => {
      const nextKey = saved.activeSubTabs && typeof saved.activeSubTabs === "object" ? String(saved.activeSubTabs[parentKey] || defaultKey) : defaultKey;
      switchSubTab(parentKey, nextKey, { persist: false });
    });
    if (saved.activeTab && ui.tabs.some((t) => t.dataset.tab === saved.activeTab)) {
      switchTab(saved.activeTab, { persist: false });
    }
    applyIgnorePresetKeysToInput();
    renderIgnoreKeyChips();
    renderLookupMapRows();
    if (state.activeTab === "diff") {
      renderResultRows(state.lastDiffRows || []);
    }
  }
  var init_diff = __esm({
    "src/tabs/diff.js"() {
      "use strict";
      init_constants();
      init_state();
      init_utils();
      init_api();
      init_engine();
      init_enrich();
      init_filter();
      init_export();
      init_export();
      init_components();
      init_dialog();
      init_preview_compare();
      init_nodeModeUi();
      init_utils();
    }
  });

  // src/tabs/design-xlsx.js
  var design_xlsx_exports = {};
  __export(design_xlsx_exports, {
    runAdvancedDesignExporter: () => runAdvancedDesignExporter
  });
  async function runAdvancedDesignExporter(params = {}) {
    const sourceAppId = Number(params.appId);
    if (!sourceAppId) throw new Error("有効な比較元アプリIDが指定されませんでした。");
    const sourceGuestId = String(params.guestId || "").trim();
    const CONFIG = {
      SHEETLIB_PRIMARY_URL: "https://cdn.jsdelivr.net/npm/xlsx-js-style@1.2.0/dist/xlsx.min.js",
      SHEETLIB_FALLBACK_URL: "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js",
      MAX_RETRIES: 3,
      RETRY_DELAY: 1e3,
      API_CONCURRENCY: 4,
      FONT_NAME: "Meiryo",
      STYLES: {
        ENABLE_BORDER: true,
        ENABLE_HEADER_FILL: true,
        ENABLE_ZEBRA: true,
        ENABLE_AUTOFILTER: true,
        FREEZE_HEADER: true,
        ENABLE_TITLE_STYLING: true,
        ENABLE_CONDITIONAL_FORMAT: true,
        ENABLE_OUTLINE: true
      },
      DEFAULT_COL_WIDTH: 12,
      MAX_COL_WIDTH: 80,
      MIN_COL_WIDTH: 8,
      COLORS: {
        HEADER_BG: "FF4A90E2",
        HEADER_TEXT: "FFFFFFFF",
        TITLE_BG: "FF2E5C8A",
        TITLE_TEXT: "FFFFFFFF",
        ZEBRA_EVEN: "FFF8F9FA",
        ZEBRA_ODD: "FFFFFFFF",
        BORDER: "FF666666",
        SECTION_BG: "FFECF0F1",
        REQUIRED_BG: "FFFFF2CC",
        WARNING_BG: "FFFFC000",
        SUCCESS_BG: "FFC6EFCE",
        DANGER_BG: "FFF8CBAD",
        INFO_BG: "FFD9E1F2",
        SUBTABLE_BG: "FFE8EAF6",
        DEPENDENCY_BG: "FFFCE4EC"
      },
      SANITIZE_LABEL_HTML_IN_LAYOUT: true
    };
    const FIELD_TYPE = {
      "LABEL": "ラベル",
      "HR": "罫線",
      "SPACER": "スペース",
      "GROUP": "グループ",
      "FILE": "添付ファイル",
      "LINK": "リンク",
      "REFERENCE_TABLE": "関連レコード一覧",
      "SINGLE_LINE_TEXT": "文字列(1行)",
      "MULTI_LINE_TEXT": "文字列(複数行)",
      "RICH_TEXT": "リッチエディター",
      "NUMBER": "数値",
      "CALC": "計算",
      "RADIO_BUTTON": "ラジオボタン",
      "CHECK_BOX": "チェックボックス",
      "DROP_DOWN": "ドロップダウン",
      "MULTI_SELECT": "複数選択",
      "DATE": "日付",
      "DATETIME": "日時",
      "TIME": "時刻",
      "USER_SELECT": "ユーザー選択",
      "ORGANIZATION_SELECT": "組織選択",
      "GROUP_SELECT": "グループ選択",
      "LOOKUP": "ルックアップ",
      "SUBTABLE": "テーブル",
      "RECORD_NUMBER": "レコード番号",
      "CREATOR": "作成者",
      "CREATED_TIME": "作成日時",
      "MODIFIER": "更新者",
      "UPDATED_TIME": "更新日時",
      "STATUS": "ステータス",
      "CATEGORY": "カテゴリー",
      "STATUS_ASSIGNEE": "作業者"
    };
    const SYSTEM_FIELDS = /* @__PURE__ */ new Set(["$id", "$revision", "status", "category", "assignee"]);
    class Semaphore {
      constructor(max) {
        this.max = max;
        this.current = 0;
        this.queue = [];
      }
      acquire() {
        return new Promise((resolve) => {
          if (this.current < this.max) {
            this.current++;
            resolve();
          } else this.queue.push(resolve);
        });
      }
      release() {
        this.current--;
        if (this.queue.length > 0) {
          this.current++;
          this.queue.shift()();
        }
      }
      async run(fn) {
        await this.acquire();
        try {
          return await fn();
        } finally {
          this.release();
        }
      }
    }
    const apiSemaphore = new Semaphore(CONFIG.API_CONCURRENCY);
    function getExporterOverlayZIndex() {
      const main = getToolDocument().getElementById(TOOL_ID);
      const raw = main ? Number(window.getComputedStyle(main).zIndex) : NaN;
      const base = Number.isFinite(raw) ? raw : 2147483646;
      return String(Math.min(2147483647, Math.max(2e9, base + 1)));
    }
    const UI = {
      id: "kintone-exporter-overlay",
      totalSteps: 0,
      currentStep: 0,
      failedAPIs: [],
      show(msg, totalSteps = 10) {
        UI.totalSteps = totalSteps;
        UI.currentStep = 0;
        UI.failedAPIs = [];
        const doc = getToolDocument();
        let el = doc.getElementById(UI.id);
        if (!el) {
          el = doc.createElement("div");
          el.id = UI.id;
          Object.assign(el.style, { position: "fixed", top: "0", left: "0", width: "100%", height: "100%", backgroundColor: "rgba(0,0,0,0.7)", zIndex: getExporterOverlayZIndex(), display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", color: "#fff", fontSize: "16px", fontFamily: '"Meiryo", sans-serif' });
          doc.body.appendChild(el);
        }
        el.style.zIndex = getExporterOverlayZIndex();
        el.innerHTML = `<div style="background:rgba(255,255,255,0.1);border-radius:12px;padding:32px 48px;text-align:center;min-width:400px;"><div style="font-size:20px;font-weight:bold;margin-bottom:16px;">📊 kintone 設計書エクスポーター v2.0</div><div id="kex-status" style="margin-bottom:12px;font-size:14px;color:#ccc;">${msg}</div><div style="background:rgba(255,255,255,0.2);border-radius:8px;height:24px;overflow:hidden;margin-bottom:8px;"><div id="kex-progress-bar" style="height:100%;width:0%;background:linear-gradient(90deg,#4A90E2,#7B68EE);border-radius:8px;transition:width 0.3s ease;"></div></div><div id="kex-percent" style="font-size:12px;color:#aaa;">0%</div><div id="kex-errors" style="font-size:11px;color:#f99;margin-top:8px;max-height:60px;overflow-y:auto;"></div></div>`;
      },
      update(msg, step) {
        if (step !== void 0) UI.currentStep = step;
        else UI.currentStep++;
        const pct = Math.min(100, Math.round(UI.currentStep / UI.totalSteps * 100));
        const doc = getToolDocument();
        const statusEl = doc.getElementById("kex-status");
        const barEl = doc.getElementById("kex-progress-bar");
        const pctEl = doc.getElementById("kex-percent");
        if (statusEl) statusEl.textContent = msg;
        if (barEl) barEl.style.width = `${pct}%`;
        if (pctEl) pctEl.textContent = `${pct}%`;
      },
      logError(apiName, error) {
        UI.failedAPIs.push({ name: apiName, error: error?.message || String(error) });
        const errEl = getToolDocument().getElementById("kex-errors");
        if (errEl) errEl.textContent = `⚠ ${UI.failedAPIs.length}件のAPI取得に失敗`;
      },
      hide() {
        const doc = getToolDocument();
        const el = doc.getElementById(UI.id);
        if (el) doc.body.removeChild(el);
      }
    };
    const UtilsX = {
      pad: (n) => n.toString().padStart(2, "0"),
      dt: (d = /* @__PURE__ */ new Date()) => {
        const p = UtilsX.pad;
        return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
      },
      toJST: (isoString) => {
        if (!isoString) return "-";
        try {
          return new Date(isoString).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" });
        } catch {
          return isoString;
        }
      },
      safeGet: (obj, path, def = "") => {
        try {
          if (!obj || typeof obj !== "object") return def;
          const v = path.split(".").reduce((o, k) => o && o[k] !== void 0 ? o[k] : void 0, obj);
          return v === void 0 ? def : v;
        } catch (e) {
          return def;
        }
      },
      ensureArray: (v) => Array.isArray(v) ? v : [],
      safeJoin: (arr, sep = "、") => Array.isArray(arr) ? arr.filter((v) => v !== "" && v != null).join(sep) : "",
      sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
      calculateCellWidth: (text) => {
        if (!text) return CONFIG.MIN_COL_WIDTH;
        const str = String(text);
        let width = 0;
        for (const line of str.split("\n")) {
          let lw = 0;
          for (const ch of line) lw += /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\uFF00-\uFFEF]/.test(ch) ? 2 : 1;
          if (lw > width) width = lw;
        }
        return Math.max(CONFIG.MIN_COL_WIDTH, Math.min(CONFIG.MAX_COL_WIDTH, width + 2));
      },
      colToA1: (n) => {
        let s = "";
        while (n > 0) {
          const m = (n - 1) % 26;
          s = String.fromCharCode(65 + m) + s;
          n = (n - 1) / 26 | 0;
        }
        return s;
      },
      a1: (r, c) => `${UtilsX.colToA1(c)}${r}`,
      escapeRegExp: (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      stripHtml: (html) => String(html || "").replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&"),
      formatBoolean: (val) => val ? "○" : "-",
      formatEntity: (entity) => {
        if (!entity) return "-";
        if (Array.isArray(entity)) return entity.map((e2) => UtilsX.formatEntity(e2)).join("\n");
        const e = entity.entity || entity;
        const t = (e.type || "").toString().toUpperCase();
        const typeMap = { USER: "ユーザー", GROUP: "グループ", ORGANIZATION: "組織", FIELD_ENTITY: "フィールド値", CREATOR: "作成者", MODIFIER: "更新者", LOGIN_USER: "ログインユーザー", ALL: "全員" };
        const typeJP = typeMap[t] || e.type || "不明";
        if (e.name) return `${typeJP}:${e.name}`;
        if (e.code) return `${typeJP}:${e.code}`;
        return typeJP;
      },
      formatEntityDetailed: (entity) => {
        if (!entity) return "-";
        if (Array.isArray(entity)) return entity.map((e2) => UtilsX.formatEntityDetailed(e2)).join("\n");
        const e = entity.entity || entity;
        const t = (e.type || "").toString().toUpperCase();
        const typeMap = { USER: "ユーザー", GROUP: "グループ", ORGANIZATION: "組織", FIELD_ENTITY: "フィールド値", CREATOR: "作成者", MODIFIER: "更新者", LOGIN_USER: "ログインユーザー", ALL: "全員" };
        const typeJP = typeMap[t] || e.type || "不明";
        const parts = [typeJP];
        if (e.name) parts.push(e.name);
        else if (e.code) parts.push(`コード:${e.code}`);
        if (entity.includeSubs) parts.push("(サブ組織含)");
        return parts.join(": ");
      },
      formatSort: (sortStr) => {
        if (!sortStr) return "-";
        return String(sortStr).replace(/\basc\b/gi, "昇順").replace(/\bdesc\b/gi, "降順");
      },
      formatFilterCond: (condStr) => {
        if (!condStr) return "-";
        let r = String(condStr);
        r = r.replace(/\s*,\s*/g, ", ");
        return r;
      },
      formatFieldFormat: (f) => {
        if (!f || typeof f !== "object") return "";
        const parts = [];
        if (f.digit !== void 0) parts.push(`桁区切り: ${f.digit ? "あり" : "なし"}`);
        if (f.displayScale !== void 0) parts.push(`小数点: ${f.displayScale}桁`);
        if (f.unit) parts.push(`単位: ${f.unit}`);
        return parts.join("、");
      },
      formatDefaultValue: (dv) => {
        if (dv == null) return "";
        if (Array.isArray(dv)) {
          if (dv.length > 0 && typeof dv[0] === "object") return dv.map((i) => i.name || i.code || JSON.stringify(i)).join("、");
          return dv.join("、");
        }
        if (typeof dv === "object") {
          if (dv.type === "NUMBER") return String(dv.value || "");
          return dv.name || dv.code || JSON.stringify(dv);
        }
        return String(dv);
      },
      safeJSONStringify: (obj) => {
        try {
          return JSON.stringify(obj, null, 2);
        } catch (e) {
          return String(obj);
        }
      }
    };
    async function loadSheetLib() {
      if (typeof window.XLSX !== "undefined") return { styled: true };
      const loadScriptLocal = (src, timeout = 15e3) => new Promise((resolve, reject) => {
        const doc = getToolDocument();
        const s = doc.createElement("script");
        s.src = src;
        s.async = true;
        let done = false;
        const timer = setTimeout(() => {
          if (!done) {
            done = true;
            reject(new Error(`Timeout: ${src}`));
          }
        }, timeout);
        s.onload = () => {
          if (!done) {
            done = true;
            clearTimeout(timer);
            resolve(true);
          }
        };
        s.onerror = () => {
          if (!done) {
            done = true;
            clearTimeout(timer);
            reject(new Error(`Failed: ${src}`));
          }
        };
        doc.head.appendChild(s);
      });
      try {
        await loadScriptLocal(CONFIG.SHEETLIB_PRIMARY_URL);
        return { styled: true };
      } catch {
        await loadScriptLocal(CONFIG.SHEETLIB_FALLBACK_URL);
        return { styled: false };
      }
    }
    async function retry(fn, max = CONFIG.MAX_RETRIES) {
      for (let i = 0; i < max; i++) {
        try {
          return await fn();
        } catch (e) {
          if (i === max - 1) throw e;
          await UtilsX.sleep(CONFIG.RETRY_DELAY * (i + 1));
        }
      }
    }
    async function fetchJob(name, promiseFn) {
      try {
        return await apiSemaphore.run(() => retry(promiseFn));
      } catch (e) {
        console.warn(`[${name}] Failed:`, e);
        UI.logError(name, e);
        return null;
      }
    }
    function showExportOptionsDialog() {
      return new Promise((resolve) => {
        const overlay = getToolDocument().createElement("div");
        Object.assign(overlay.style, { position: "fixed", top: "0", left: "0", width: "100%", height: "100%", backgroundColor: "rgba(0,0,0,0.6)", zIndex: getExporterOverlayZIndex(), display: "flex", justifyContent: "center", alignItems: "center", fontFamily: '"Meiryo", sans-serif' });
        const sheets = [
          { key: "summary", label: "サマリー", default: true, required: true },
          { key: "fields", label: "項目定義", default: true },
          { key: "layout", label: "フォームレイアウト", default: true },
          { key: "views", label: "一覧", default: true },
          { key: "reports", label: "レポート", default: true },
          { key: "status", label: "プロセス管理", default: true },
          { key: "statusMatrix", label: "遷移マトリクス", default: true },
          { key: "appAcl", label: "アプリ権限", default: true },
          { key: "recordAcl", label: "レコード権限", default: true },
          { key: "fieldAcl", label: "フィールド権限", default: true },
          { key: "customize", label: "JS/CSSカスタマイズ", default: true },
          { key: "actions", label: "アクション", default: true },
          { key: "plugins", label: "プラグイン", default: true },
          { key: "genNotif", label: "通知（一般）", default: true },
          { key: "recNotif", label: "通知（レコード）", default: true },
          { key: "remNotif", label: "通知（リマインダー）", default: true },
          { key: "webhook", label: "Webhook", default: true },
          { key: "adminNotes", label: "管理者メモ", default: true },
          { key: "dependencies", label: "フィールド依存関係", default: true }
        ];
        const checkboxes = sheets.map((s) => `<label style="display:block;margin:3px 0;font-size:13px;cursor:${s.required ? "default" : "pointer"};"><input type="checkbox" value="${s.key}" ${s.default ? "checked" : ""} ${s.required ? "disabled" : ""} style="margin-right:6px;">${s.label}${s.required ? " (必須)" : ""}</label>`).join("");
        overlay.innerHTML = `<div style="background:#fff;border-radius:12px;padding:28px;min-width:360px;max-width:460px;max-height:80vh;overflow-y:auto;box-shadow:0 4px 24px rgba(0,0,0,0.3);"><div style="font-size:18px;font-weight:bold;color:#2E5C8A;margin-bottom:16px;">📊 エクスポート設定</div><div style="font-size:12px;color:#666;margin-bottom:12px;">出力するシートを選択してください</div><div style="display:flex;gap:8px;margin-bottom:12px;"><button id="kex-select-all" style="font-size:11px;padding:4px 10px;border:1px solid #ccc;border-radius:4px;background:#f5f5f5;cursor:pointer;">全選択</button><button id="kex-select-none" style="font-size:11px;padding:4px 10px;border:1px solid #ccc;border-radius:4px;background:#f5f5f5;cursor:pointer;">全解除</button></div><div id="kex-sheet-options" style="max-height:340px;overflow-y:auto;padding:8px;background:#fafafa;border-radius:6px;border:1px solid #eee;">${checkboxes}</div><div style="display:flex;gap:10px;justify-content:flex-end;margin-top:18px;"><button id="kex-cancel" style="padding:8px 20px;border:1px solid #ccc;border-radius:6px;background:#fff;cursor:pointer;font-size:13px;">キャンセル</button><button id="kex-export" style="padding:8px 20px;border:none;border-radius:6px;background:#4A90E2;color:#fff;cursor:pointer;font-size:13px;font-weight:bold;">エクスポート</button></div></div>`;
        getToolDocument().body.appendChild(overlay);
        overlay.querySelector("#kex-select-all").onclick = () => {
          overlay.querySelectorAll('#kex-sheet-options input[type="checkbox"]').forEach((cb) => cb.checked = true);
        };
        overlay.querySelector("#kex-select-none").onclick = () => {
          overlay.querySelectorAll('#kex-sheet-options input[type="checkbox"]:not([disabled])').forEach((cb) => cb.checked = false);
        };
        overlay.querySelector("#kex-cancel").onclick = () => {
          getToolDocument().body.removeChild(overlay);
          resolve(null);
        };
        overlay.querySelector("#kex-export").onclick = () => {
          const selected = /* @__PURE__ */ new Set();
          overlay.querySelectorAll('#kex-sheet-options input[type="checkbox"]:checked').forEach((cb) => selected.add(cb.value));
          getToolDocument().body.removeChild(overlay);
          resolve(selected);
        };
      });
    }
    try {
      const APP_ID = Number(sourceAppId);
      if (!APP_ID) throw new Error("有効な比較元アプリIDが指定されませんでした。");
      const selectedSheets = await showExportOptionsDialog();
      if (!selectedSheets) return false;
      UI.show("ライブラリ読み込み中...", 12);
      const { styled } = await loadSheetLib();
      const api = kintone.api;
      const apiUrl = (path) => {
        let p = String(path || "");
        if (sourceGuestId) {
          p = p.replace("/k/v1/preview/", `/k/guest/${sourceGuestId}/v1/preview/`).replace("/k/v1/", `/k/guest/${sourceGuestId}/v1/`);
        }
        return kintone.api.url(p, true);
      };
      UI.update("基本情報を取得中...");
      const appSettings = await fetchJob("App", () => api(apiUrl("/k/v1/app.json"), "GET", { id: APP_ID }));
      const generalSettings = await fetchJob("Settings", () => api(apiUrl("/k/v1/app/settings.json"), "GET", { app: APP_ID }));
      UI.update("フィールド・レイアウトを取得中...");
      let fieldResp = await fetchJob("FieldsPrev", () => api(apiUrl("/k/v1/preview/app/form/fields.json"), "GET", { app: APP_ID }));
      if (!fieldResp) fieldResp = await fetchJob("FieldsProd", () => api(apiUrl("/k/v1/app/form/fields.json"), "GET", { app: APP_ID }));
      let layout = await fetchJob("LayoutPrev", () => api(apiUrl("/k/v1/preview/app/form/layout.json"), "GET", { app: APP_ID }));
      if (!layout) layout = await fetchJob("LayoutProd", () => api(apiUrl("/k/v1/app/form/layout.json"), "GET", { app: APP_ID }));
      const filterUserFields = (fields2) => {
        const filtered = {};
        for (const [code, field] of Object.entries(fields2)) {
          if (SYSTEM_FIELDS.has(code) || SYSTEM_FIELDS.has(field.code)) continue;
          if (["STATUS", "CATEGORY", "STATUS_ASSIGNEE"].includes(field.type)) continue;
          filtered[code] = field;
        }
        return filtered;
      };
      const fields = filterUserFields(fieldResp?.properties || {});
      UI.update("レコード件数を取得中...");
      let recordCount = null;
      try {
        const countResp = await fetchJob("RecordCount", () => api(apiUrl("/k/v1/records.json"), "GET", { app: APP_ID, query: "limit 1", totalCount: true }));
        recordCount = countResp?.totalCount ?? null;
      } catch (e) {
      }
      UI.update("一覧・権限・通知設定を取得中...");
      const [views, reports, status, appAcl, recordAcl, fieldAcl, customize, actionsResp, pluginsResp, adminNotes, webhooksResp, genNotif, recNotif, remNotif] = await Promise.all([
        fetchJob("Views", () => api(apiUrl("/k/v1/app/views.json"), "GET", { app: APP_ID })),
        fetchJob("Reports", () => api(apiUrl("/k/v1/app/reports.json"), "GET", { app: APP_ID })),
        fetchJob("Status", () => api(apiUrl("/k/v1/app/status.json"), "GET", { app: APP_ID })),
        fetchJob("アプリ権限", () => api(apiUrl("/k/v1/app/acl.json"), "GET", { app: APP_ID })),
        fetchJob("レコード権限", () => api(apiUrl("/k/v1/record/acl.json"), "GET", { app: APP_ID })),
        fetchJob("フィールド権限", () => api(apiUrl("/k/v1/field/acl.json"), "GET", { app: APP_ID })),
        fetchJob("Customize", () => api(apiUrl("/k/v1/app/customize.json"), "GET", { app: APP_ID })),
        fetchJob("Actions", () => api(apiUrl("/k/v1/preview/app/actions.json"), "GET", { app: APP_ID })),
        fetchJob("Plugins", () => api(apiUrl("/k/v1/app/plugins.json"), "GET", { app: APP_ID })),
        fetchJob("AdminNotes", () => api(apiUrl("/k/v1/app/adminNotes.json"), "GET", { app: APP_ID })),
        fetchJob("Webhooks", () => api(apiUrl("/k/v1/app/webhook.json"), "GET", { app: APP_ID })),
        fetchJob("GenNotif", () => api(apiUrl("/k/v1/app/notifications/general.json"), "GET", { app: APP_ID })),
        fetchJob("RecNotif", () => api(apiUrl("/k/v1/app/notifications/perRecord.json"), "GET", { app: APP_ID })),
        fetchJob("RemNotif", () => api(apiUrl("/k/v1/app/notifications/reminder.json"), "GET", { app: APP_ID }))
      ]);
      const actions = UtilsX.safeGet(actionsResp, "actions", {});
      UI.update("関連アプリ名を解決中...");
      const referencedAppIds = /* @__PURE__ */ new Set();
      const scanField = (f) => {
        if (f.lookup?.relatedApp?.app) referencedAppIds.add(f.lookup.relatedApp.app);
        if (f.referenceTable?.relatedApp?.app) referencedAppIds.add(f.referenceTable.relatedApp.app);
      };
      Object.values(fields).forEach((f) => {
        scanField(f);
        if (f.type === "SUBTABLE" && f.fields) Object.values(f.fields).forEach(scanField);
      });
      Object.values(actions).forEach((a) => {
        if (a.destApp?.app) referencedAppIds.add(a.destApp.app);
      });
      const appNames = {};
      const refPromises = [...referencedAppIds].map(
        (id) => fetchJob(`RefApp_${id}`, () => api(apiUrl("/k/v1/app.json"), "GET", { id })).then((info) => {
          appNames[id] = info?.name || `(ID:${id})`;
        })
      );
      await Promise.all(refPromises);
      UI.update("Excelファイルを生成中...", 10);
      const wb = XLSX.utils.book_new();
      const makeSafeSheetName = (raw, existingNames) => {
        let name = String(raw ?? "").trim() || "Sheet";
        name = name.replace(/[:\\/\?\*\[\]]/g, "_").replace(/[\u0000-\u001F]/g, "").replace(/^'+|'+$/g, "");
        if (!name) name = "Sheet";
        if (name.length > 31) name = name.slice(0, 31);
        const existing = existingNames || /* @__PURE__ */ new Set();
        if (!existing.has(name)) return name;
        let i = 2;
        while (true) {
          const suffix = `(${i})`;
          const base = name.length > 31 - suffix.length ? name.slice(0, 31 - suffix.length) : name;
          const candidate = base + suffix;
          if (!existing.has(candidate)) return candidate;
          i++;
        }
      };
      const appendSheet = (name, data) => {
        if (!data || !Array.isArray(data.aoa) || data.aoa.length === 0) return;
        const ws = XLSX.utils.aoa_to_sheet(data.aoa);
        const safeName = makeSafeSheetName(name, new Set(wb.SheetNames));
        XLSX.utils.book_append_sheet(wb, ws, safeName);
      };
      const buildSimpleAOA = (title, headers, rows) => ({
        aoa: [title ? [title] : [], headers, ...rows],
        options: { headerRowIndex: title ? 1 : 0, titleRows: title ? [0] : [] }
      });
      appendSheet("サマリー", buildSimpleAOA("kintone アプリ設計書", ["項目", "値"], [
        ["アプリID", APP_ID],
        ["アプリ名", appSettings?.name || ""],
        ["出力日時", UtilsX.dt()],
        ["フィールド数", Object.keys(fields).length],
        ["ビュー数", Object.keys(views?.views || {}).length]
      ]));
      UI.update("ダウンロード中...", 12);
      const safeAppName = String(appSettings?.name || `App${APP_ID}`).replace(/[\\/:*?"<>|]/g, "_");
      const downloadExcel = (wb2, filename) => {
        const out = XLSX.write(wb2, { bookType: "xlsx", type: "array", cellStyles: true });
        const blob = new Blob([out], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
        const a = getToolDocument().createElement("a");
        const url = URL.createObjectURL(blob);
        a.href = url;
        a.download = filename;
        getToolDocument().body.appendChild(a);
        a.click();
        getToolDocument().body.removeChild(a);
        URL.revokeObjectURL(url);
      };
      downloadExcel(wb, `${safeAppName}_設計書_v2.xlsx`);
      UI.hide();
      const errorMsg = UI.failedAPIs.length > 0 ? `
⚠ ${UI.failedAPIs.length}件のAPI取得に失敗しました` : "";
      alert(`✅ エクスポート完了${errorMsg}`);
      return true;
    } catch (e) {
      UI.hide();
      console.error("kintone設計書エクスポートエラー:", e);
      alert(`❌ エラーが発生しました: ${e.message}`);
      throw e;
    }
  }
  var init_design_xlsx = __esm({
    "src/tabs/design-xlsx.js"() {
      "use strict";
      init_constants();
      init_dialog();
    }
  });

  // src/register-api.js
  init_constants();

  // src/tabs/diff-standalone.js
  init_api();
  init_engine();
  init_enrich();
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
      if (imported) return imported;
      const params = side === "source" ? source : target;
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
    const sourceBundle = await resolveSide("source");
    onStatus("比較先を取得中...");
    const targetBundle = await resolveSide("target");
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

  // src/register-api.js
  if (typeof window !== "undefined") {
    window.__KUS__ = window.__KUS__ || {};
    window.__KUS__.VERSION = TOOL_VERSION;
    window.__KUS__.runDiffStandalone = runDiffStandalone;
  }

  // src/boot.js
  init_constants();
  init_state();
  init_utils();

  // src/ui/styles.css
  var styles_default = `#kintone-unified-suite-v2{position:fixed;top:16px;left:calc(100vw - min(980px,calc(100vw - 32px)) - 16px);z-index:2147483647;width:min(980px,calc(100vw - 32px));height:min(860px,calc(100vh - 32px));min-width:min(560px,calc(100vw - 32px));min-height:min(360px,calc(100vh - 32px));max-width:calc(100vw - 32px);max-height:calc(100vh - 32px);background:#f6f8fb;border:1px solid #d9e2ec;border-radius:14px;box-shadow:0 18px 40px rgba(15,23,42,.28);font-family:"Noto Sans JP","Hiragino Kaku Gothic ProN",Meiryo,sans-serif;color:#1f2937;display:flex;flex-direction:column;overflow:hidden;resize:both;box-sizing:border-box}
#kintone-unified-suite-v2.suite-popout-tab{top:0!important;left:0!important;right:0!important;bottom:0!important;width:100%!important;height:100%!important;min-width:0!important;min-height:0!important;max-width:none!important;max-height:none!important;border-radius:0;resize:none;box-shadow:none;border-width:0 0 1px}
#kintone-unified-suite-v2 .h{padding:12px 16px;background:linear-gradient(135deg,#0f4c81,#2563eb);color:#fff;display:flex;justify-content:space-between;align-items:center;gap:12px;flex-shrink:0;cursor:move;user-select:none}
#kintone-unified-suite-v2 .ht{font-size:15px;font-weight:700}
#kintone-unified-suite-v2 .hs{font-size:11px;opacity:.92}
#kintone-unified-suite-v2 .tool-ver{display:inline-block;margin-top:3px;font-size:10px;opacity:.78;cursor:pointer;text-decoration:underline dotted;text-underline-offset:2px}
#kintone-unified-suite-v2 .tool-ver:hover{opacity:1}
#kintone-unified-suite-v2 .h-actions{display:flex;gap:6px;align-items:center;justify-content:flex-end;flex-wrap:wrap;cursor:default}
#kintone-unified-suite-v2 .x{border:0;background:rgba(255,255,255,.22);color:#fff;border-radius:6px;padding:6px 10px;cursor:pointer}
#kintone-unified-suite-v2 .x.size{padding:6px 8px;font-size:11px}
#kintone-unified-suite-v2.dragging{box-shadow:0 24px 52px rgba(15,23,42,.34)}
#kintone-unified-suite-v2 .body{padding:12px;display:grid;gap:10px;overflow:auto;flex:1;min-height:0}
#kintone-unified-suite-v2 .card{background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:10px}
#kintone-unified-suite-v2 .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:8px}
#kintone-unified-suite-v2 .grid2{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:8px}
#kintone-unified-suite-v2 .inline{display:flex;gap:6px;align-items:center;flex-wrap:wrap}
#kintone-unified-suite-v2 label{font-size:11px;font-weight:700;color:#334155;display:block;margin-bottom:4px}
#kintone-unified-suite-v2 input[type="text"],#kintone-unified-suite-v2 textarea,#kintone-unified-suite-v2 select{width:100%;box-sizing:border-box;padding:7px 8px;border:1px solid #cbd5e1;border-radius:7px;background:#fff;font-size:12px;color:#0f172a}
#kintone-unified-suite-v2 textarea{min-height:84px;resize:vertical;font-family:ui-monospace,SFMono-Regular,Menlo,monospace}
#kintone-unified-suite-v2 .tabs{display:flex;gap:12px;flex-wrap:wrap}
#kintone-unified-suite-v2 .tab{border:1px solid #cbd5e1;background:#fff;border-radius:7px;padding:7px 10px;font-size:12px;font-weight:700;cursor:pointer}
#kintone-unified-suite-v2 .tab.active{background:#2563eb;border-color:#2563eb;color:#fff}
#kintone-unified-suite-v2 .tab-group{display:flex;gap:4px;padding:4px;background:#e2e8f0;border-radius:9px;align-items:center}
#kintone-unified-suite-v2 .tab-group-lbl{font-size:10px;font-weight:700;color:#475569;padding:0 6px;letter-spacing:0.5px}
#kintone-unified-suite-v2 .subtabs{display:flex;gap:6px;flex-wrap:wrap;padding:6px;background:#f1f5f9;border:1px solid #dbe3ed;border-radius:10px;margin:4px 0 12px}
#kintone-unified-suite-v2 .subtab{border:1px solid #cbd5e1;background:#fff;color:#334155;border-radius:999px;padding:6px 12px;font-size:11px;font-weight:700;cursor:pointer}
#kintone-unified-suite-v2 .subtab.active{background:#0f172a;border-color:#0f172a;color:#fff}
#kintone-unified-suite-v2 .subpane{display:none}
#kintone-unified-suite-v2 .subpane.active{display:block}
#kintone-unified-suite-v2 .subpane-note{font-size:11px;color:#64748b;margin:-4px 0 10px}
#kintone-unified-suite-v2 .tour-overlay{position:absolute;inset:0;z-index:120;display:none}
#kintone-unified-suite-v2 .tour-overlay.active{display:block}
#kintone-unified-suite-v2 .tour-backdrop{position:absolute;inset:0;background:rgba(15,23,42,.38);backdrop-filter:blur(3px)}
#kintone-unified-suite-v2 .tour-spotlight{position:absolute;border-radius:16px;border:2px solid rgba(125,211,252,.95);box-shadow:0 0 0 999px rgba(15,23,42,.46),0 0 0 6px rgba(56,189,248,.18),0 20px 50px rgba(15,23,42,.38);background:linear-gradient(135deg,rgba(255,255,255,.18),rgba(255,255,255,.05));pointer-events:none;transition:all .2s ease;animation:kintone-unified-suite-v2-tourPulse 1.8s ease-in-out infinite}
#kintone-unified-suite-v2 .tour-card{position:absolute;width:min(360px,calc(100% - 24px));border-radius:18px;padding:14px 14px 12px;background:rgba(255,255,255,.96);border:1px solid rgba(255,255,255,.65);box-shadow:0 18px 40px rgba(15,23,42,.35);backdrop-filter:blur(12px);color:#0f172a}
#kintone-unified-suite-v2 .tour-step{font-size:10px;font-weight:800;letter-spacing:.08em;color:#0369a1;text-transform:uppercase}
#kintone-unified-suite-v2 .tour-title{margin-top:6px;font-size:16px;font-weight:800;line-height:1.35}
#kintone-unified-suite-v2 .tour-body{margin-top:8px;font-size:12px;line-height:1.7;color:#334155;white-space:pre-wrap}
#kintone-unified-suite-v2 .tour-progress{margin-top:12px;height:6px;background:#dbeafe;border-radius:999px;overflow:hidden}
#kintone-unified-suite-v2 .tour-progress > span{display:block;height:100%;width:0;background:linear-gradient(90deg,#0ea5e9,#2563eb);border-radius:999px;transition:width .2s ease}
#kintone-unified-suite-v2 .tour-actions{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:12px}
#kintone-unified-suite-v2 .tour-actions .tour-nav{display:flex;gap:8px}
#kintone-unified-suite-v2 .tour-close{border:0;background:#e2e8f0;color:#334155;border-radius:999px;width:30px;height:30px;font-size:16px;cursor:pointer}
#kintone-unified-suite-v2 .tour-close:hover{background:#cbd5e1}
@keyframes kintone-unified-suite-v2-tourPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.01)}}

#kintone-unified-suite-v2 .pane{display:none}
#kintone-unified-suite-v2 .pane.active{display:block}
#kintone-unified-suite-v2 .pane.active[data-pane="reflect"]{display:flex;flex-direction:column;min-height:0}
#kintone-unified-suite-v2 .btns{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}
#kintone-unified-suite-v2 .btn{border:0;background:#2563eb;color:#fff;border-radius:8px;padding:8px 12px;font-size:12px;font-weight:700;cursor:pointer}
#kintone-unified-suite-v2 .btn.sub{background:#475569}
#kintone-unified-suite-v2 .btn.warn{background:#b45309}
#kintone-unified-suite-v2 .btn.ok{background:#15803d}
#kintone-unified-suite-v2 .btn.pink{background:#be185d}
#kintone-unified-suite-v2 .btn.dark{background:#1e293b}
#kintone-unified-suite-v2 .plan-confirm-panel{border:2px solid #3b82f6;border-radius:8px;background:#eff6ff;padding:12px;margin-top:8px}
#kintone-unified-suite-v2 .plan-confirm-panel .plan-summary{max-height:300px;overflow:auto;background:#fff;border:1px solid #bfdbfe;border-radius:6px;padding:10px;font-size:12px;white-space:pre-wrap;font-family:monospace}
#kintone-unified-suite-v2 .plan-confirm-panel .plan-actions{display:flex;align-items:center;gap:10px;margin-top:10px;padding-top:10px;border-top:1px solid #bfdbfe}
#kintone-unified-suite-v2 .plan-confirm-panel .plan-meta{font-size:11px;color:#3b82f6;flex:1}
#kintone-unified-suite-v2 .muted{font-size:11px;color:#64748b}
#kintone-unified-suite-v2 .step{font-size:11px;font-weight:700;color:#1e293b;background:#eef2ff;border:1px solid #c7d2fe;border-radius:6px;padding:6px 8px;margin-top:8px}
#kintone-unified-suite-v2 .kv{font-size:11px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:8px 10px;margin-top:8px;line-height:1.7}
#kintone-unified-suite-v2 .warnbox{font-size:11px;background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:8px 10px;margin-top:8px;color:#9a3412}
#kintone-unified-suite-v2 .chips{display:flex;gap:6px;flex-wrap:wrap}
#kintone-unified-suite-v2 .chip{display:inline-flex;align-items:center;gap:4px;padding:4px 7px;border:1px solid #d6dee8;border-radius:999px;font-size:11px;background:#fff}
#kintone-unified-suite-v2 .status-row{display:flex;align-items:stretch;gap:8px;margin-top:8px}
#kintone-unified-suite-v2 .status-row .status{flex:1;min-width:0}
#kintone-unified-suite-v2 .status-row .status-copy-btn{flex-shrink:0;padding:6px 10px;font-size:11px;white-space:nowrap;align-self:center}
#kintone-unified-suite-v2 .status{font-size:12px;padding:8px 10px;border-radius:8px;background:#e2e8f0;color:#0f172a}
#kintone-unified-suite-v2 .result{max-height:420px;overflow:auto;border:1px solid #dbe3ed;border-radius:8px;background:#fff}
#kintone-unified-suite-v2 table{width:100%;border-collapse:collapse;font-size:11px}
#kintone-unified-suite-v2 th,#kintone-unified-suite-v2 td{border-bottom:1px solid #e5eaf0;padding:6px 8px;vertical-align:top;text-align:left}
#kintone-unified-suite-v2 th{position:sticky;top:0;background:#f8fafc;z-index:1}
#kintone-unified-suite-v2 .added{color:#166534}
#kintone-unified-suite-v2 .removed{color:#b91c1c}
#kintone-unified-suite-v2 .changed{color:#92400e}
#kintone-unified-suite-v2 .diff-view{--dv-bg:#f8fafc;--dv-card:#fff;--dv-border:#dbe3ed;--dv-text:#0f172a;--dv-sub:#64748b;--dv-add:#e8f5e9;--dv-add-txt:#166534;--dv-del:#fee2e2;--dv-del-txt:#991b1b;--dv-pad:#f1f5f9;--dv-mark-add:#bbf7d0;--dv-mark-del:#fecaca;background:var(--dv-bg);color:var(--dv-text)}
#kintone-unified-suite-v2 .diff-view.dark{--dv-bg:#0f172a;--dv-card:#111827;--dv-border:#334155;--dv-text:#e2e8f0;--dv-sub:#94a3b8;--dv-add:#083344;--dv-add-txt:#5eead4;--dv-del:#450a0a;--dv-del-txt:#fca5a5;--dv-pad:#1e293b;--dv-mark-add:#134e4a;--dv-mark-del:#7f1d1d}
#kintone-unified-suite-v2 .diff-view .diff-summary{padding:8px 10px;border-bottom:1px solid var(--dv-border);font-size:11px;background:var(--dv-card);display:flex;gap:8px;flex-wrap:wrap}
#kintone-unified-suite-v2 .diff-view .diff-pill{border:1px solid var(--dv-border);border-radius:999px;padding:3px 8px;background:var(--dv-bg);font-weight:700}
#kintone-unified-suite-v2 .diff-view .diff-info{color:var(--dv-sub)}
#kintone-unified-suite-v2 .diff-view .diff-empty{padding:12px;font-size:12px;color:var(--dv-sub)}
#kintone-unified-suite-v2 .diff-view .diff-sec{border-bottom:1px solid var(--dv-border);background:var(--dv-card)}
#kintone-unified-suite-v2 .diff-view .diff-sec-head{display:flex;justify-content:space-between;gap:8px;align-items:center;padding:8px 10px;font-size:12px;font-weight:700;cursor:pointer;background:var(--dv-pad)}
#kintone-unified-suite-v2 .diff-view .diff-sec-head:hover{opacity:.92}
#kintone-unified-suite-v2 .diff-view .diff-sec-meta{font-size:10px;color:var(--dv-sub);font-weight:600}
#kintone-unified-suite-v2 .diff-view .diff-table{width:100%;border-collapse:collapse;font-size:11px;table-layout:fixed}
#kintone-unified-suite-v2 .diff-view .diff-table th,#kintone-unified-suite-v2 .diff-view .diff-table td{border-bottom:1px solid var(--dv-border);padding:6px 8px;vertical-align:top;text-align:left}
#kintone-unified-suite-v2 .diff-view .diff-table th{position:sticky;top:0;background:var(--dv-card);z-index:1}
#kintone-unified-suite-v2 .diff-view .diff-type{font-weight:700}
#kintone-unified-suite-v2 .diff-view .diff-type.same{color:#16a34a}
#kintone-unified-suite-v2 .diff-view .sev-badge{display:inline-block;padding:2px 8px;border-radius:999px;font-size:10px;font-weight:700;letter-spacing:.02em}
#kintone-unified-suite-v2 .diff-view .sev-high{background:#fee2e2;color:#991b1b}
#kintone-unified-suite-v2 .diff-view .sev-medium{background:#fef3c7;color:#92400e}
#kintone-unified-suite-v2 .diff-view .sev-low{background:#dbeafe;color:#1d4ed8}
#kintone-unified-suite-v2 .diff-view .diff-path{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;word-break:break-all;color:var(--dv-sub)}
#kintone-unified-suite-v2 .diff-view .diff-cell{padding:0;overflow:hidden}
#kintone-unified-suite-v2 .diff-view .diff-scroll{max-height:300px;overflow:auto}
#kintone-unified-suite-v2 .diff-view .diff-more{padding:8px 10px;text-align:center;border-top:1px dashed var(--dv-border)}
#kintone-unified-suite-v2 .diff-view .diff-more .btn{padding:5px 10px;font-size:11px}
#kintone-unified-suite-v2 .diff-view .diff-line{display:flex;min-height:1.5em;line-height:1.5;padding:0 6px;white-space:pre-wrap;word-break:break-word}
#kintone-unified-suite-v2 .diff-view .diff-line.add{background:var(--dv-add);color:var(--dv-add-txt)}
#kintone-unified-suite-v2 .diff-view .diff-line.del{background:var(--dv-del);color:var(--dv-del-txt)}
#kintone-unified-suite-v2 .diff-view .diff-line.pad{background:var(--dv-pad);opacity:.7}
#kintone-unified-suite-v2 .diff-view .diff-ln{min-width:34px;display:inline-block;text-align:right;margin-right:8px;padding-right:4px;border-right:1px solid var(--dv-border);font-size:10px;color:var(--dv-sub);user-select:none;flex-shrink:0}
#kintone-unified-suite-v2 .diff-view .diff-pre{margin:0;padding:8px;white-space:pre-wrap;word-break:break-word;font-size:11px}
#kintone-unified-suite-v2 .diff-view .diff-pre.add{background:var(--dv-add);color:var(--dv-add-txt)}
#kintone-unified-suite-v2 .diff-view .diff-pre.del{background:var(--dv-del);color:var(--dv-del-txt)}
#kintone-unified-suite-v2 .diff-view .diff-pre.empty{color:var(--dv-sub);font-style:italic}
#kintone-unified-suite-v2 .diff-view mark.diff-char-add{background:var(--dv-mark-add);color:var(--dv-add-txt);padding:0 1px;border-radius:2px}
#kintone-unified-suite-v2 .diff-view mark.diff-char-del{background:var(--dv-mark-del);color:var(--dv-del-txt);padding:0 1px;border-radius:2px}
#kintone-unified-suite-v2 .diff-view .diff-tools{display:flex;align-items:center;gap:6px}
#kintone-unified-suite-v2 .diff-view .diff-mini-btn{border:1px solid var(--dv-border);background:transparent;color:var(--dv-sub);border-radius:6px;padding:2px 6px;font-size:10px;cursor:pointer}
#kintone-unified-suite-v2 .diff-view .diff-mini-btn.active{background:#fef3c7;color:#92400e;border-color:#f59e0b}
#kintone-unified-suite-v2 .diff-view .diff-mini-btn:hover{opacity:.9}
#kintone-unified-suite-v2 .diff-view .diff-row-selected td{background:rgba(59,130,246,.08)}
#kintone-unified-suite-v2 .diff-view.dark .diff-row-selected td{background:rgba(59,130,246,.15)}
#kintone-unified-suite-v2 .diff-view .diff-meta{margin-top:6px;display:flex;flex-direction:column;gap:4px}
#kintone-unified-suite-v2 .diff-view .diff-meta-line{font-size:10px;line-height:1.45;color:var(--dv-sub)}
#kintone-unified-suite-v2 .diff-view .diff-meta-line strong{color:var(--dv-text)}
#kintone-unified-suite-v2 .diff-view .diff-meta-tags{display:flex;gap:4px;flex-wrap:wrap}
#kintone-unified-suite-v2 .diff-view .diff-meta-tag{display:inline-flex;align-items:center;gap:4px;padding:2px 6px;border-radius:999px;border:1px solid var(--dv-border);background:var(--dv-pad);font-size:10px;color:var(--dv-text)}
#kintone-unified-suite-v2 .diff-view .diff-meta-tag.rename{background:#ecfdf5;color:#166534;border-color:#86efac}
#kintone-unified-suite-v2 .diff-view .diff-meta-tag.impact{background:#eff6ff;color:#1d4ed8;border-color:#93c5fd}
#kintone-unified-suite-v2 .diff-view .diff-meta-tag.reason{background:#fff7ed;color:#9a3412;border-color:#fdba74}
#kintone-unified-suite-v2 .diff-view .diff-issues{border-bottom:1px solid var(--dv-border);background:var(--dv-card)}
#kintone-unified-suite-v2 .diff-view .diff-issues-head{padding:8px 10px;font-size:12px;font-weight:700;background:#fff7ed;color:#9a3412;border-bottom:1px solid var(--dv-border)}
#kintone-unified-suite-v2 .diff-view.dark .diff-issues-head{background:#3b1d0f;color:#fdba74}
#kintone-unified-suite-v2 .diff-view .diff-issue-table{width:100%;border-collapse:collapse;font-size:11px;table-layout:fixed}
#kintone-unified-suite-v2 .diff-view .diff-issue-table th,#kintone-unified-suite-v2 .diff-view .diff-issue-table td{border-bottom:1px solid var(--dv-border);padding:6px 8px;vertical-align:top;text-align:left}
#kintone-unified-suite-v2 .diff-view .diff-issue-table th{background:var(--dv-card)}
#kintone-unified-suite-v2 .diff-view .diff-issue-msg{white-space:pre-wrap;word-break:break-word;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11px}
#kintone-unified-suite-v2 .diff-view .diff-summary-head{border-bottom:1px solid var(--dv-border);background:var(--dv-card)}
#kintone-unified-suite-v2 .diff-view .diff-summary-bars{display:flex;height:6px;border-radius:4px;overflow:hidden;margin:0 10px 0;padding-top:8px;gap:2px}
#kintone-unified-suite-v2 .diff-view .diff-bar{min-width:2px;border-radius:2px}
#kintone-unified-suite-v2 .diff-view .diff-bar-added{background:#22c55e}
#kintone-unified-suite-v2 .diff-view .diff-bar-removed{background:#ef4444}
#kintone-unified-suite-v2 .diff-view .diff-bar-changed{background:#eab308}
#kintone-unified-suite-v2 .diff-view .diff-bar-moved{background:#a855f7}
#kintone-unified-suite-v2 .diff-view .diff-sec-nav{display:flex;flex-wrap:wrap;gap:6px;padding:8px 10px;border-top:1px dashed var(--dv-border);align-items:center;max-height:104px;overflow-y:auto}
#kintone-unified-suite-v2 .diff-view .diff-sec-pill{border:1px solid var(--dv-border);border-radius:999px;padding:4px 10px;font-size:11px;background:var(--dv-pad);color:var(--dv-text);cursor:pointer;font-weight:600}
#kintone-unified-suite-v2 .diff-view .diff-sec-pill:hover{opacity:.92}
#kintone-unified-suite-v2 .diff-view .diff-sec-pill.is-active{background:#dbeafe;border-color:#93c5fd;color:#1e40af}
#kintone-unified-suite-v2 .diff-view.dark .diff-sec-pill.is-active{background:#1e3a5f;border-color:#3b82f6;color:#bfdbfe}
#kintone-unified-suite-v2 .diff-view .diff-sec-pill-n{opacity:.85;font-weight:700}
#kintone-unified-suite-v2 .diff-view .diff-sec-pill-sel{margin-left:4px;font-size:10px;color:var(--dv-sub);font-weight:600}
#kintone-unified-suite-v2 .diff-view-overview{display:grid;grid-template-columns:1.3fr 1fr;gap:10px;margin:8px 0 10px}
#kintone-unified-suite-v2 .diff-view-overview-main,#kintone-unified-suite-v2 .diff-view-overview-side{border:1px solid #dbe3ed;border-radius:10px;background:linear-gradient(180deg,#f8fafc,#fff);padding:10px}
#kintone-unified-suite-v2 .diff-view-overview-title,#kintone-unified-suite-v2 .diff-view-overview-side-title{font-size:11px;font-weight:800;color:#1e293b}
#kintone-unified-suite-v2 .diff-view-overview-state{margin-top:6px}
#kintone-unified-suite-v2 .diff-view-overview-side-body{margin-top:6px;font-size:11px;line-height:1.6;color:#475569}
#kintone-unified-suite-v2 .diff-view.dark .diff-pill{background:#172033}
#kintone-unified-suite-v2 .diff-view.dark .diff-view-overview-main,#kintone-unified-suite-v2 .diff-view.dark .diff-view-overview-side{border-color:var(--dv-border);background:linear-gradient(180deg,#192236,#111827)}
#kintone-unified-suite-v2 .diff-view.dark .diff-view-overview-title,#kintone-unified-suite-v2 .diff-view.dark .diff-view-overview-side-title{color:#dbeafe}
#kintone-unified-suite-v2 .diff-view.dark .diff-view-overview-side-body{color:#94a3b8}
#kintone-unified-suite-v2 .diff-view .diff-path-cell .diff-path-line{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;word-break:break-all}
#kintone-unified-suite-v2 .diff-view .diff-path-prefix{opacity:.75}
#kintone-unified-suite-v2 .diff-view .diff-path-sep{margin:0 2px;opacity:.55}
#kintone-unified-suite-v2 .diff-view .diff-path-tail{font-weight:600}
#kintone-unified-suite-v2 .diff-view .diff-row-t-added{border-left:3px solid #22c55e}
#kintone-unified-suite-v2 .diff-view .diff-row-t-removed{border-left:3px solid #ef4444}
#kintone-unified-suite-v2 .diff-view .diff-row-t-changed{border-left:3px solid #ca8a04}
#kintone-unified-suite-v2 .diff-view .diff-row-t-moved{border-left:3px solid #a855f7}
#kintone-unified-suite-v2 .diff-view .diff-row-t-same{border-left:3px solid #94a3b8}
#kintone-unified-suite-v2 .diff-onboarding{margin:8px 0;padding:10px 12px;border-radius:8px;border:1px solid #c7d2fe;background:linear-gradient(135deg,#eef2ff,#f8fafc)}
#kintone-unified-suite-v2 .diff-onboarding-text{margin:0 0 8px;font-size:12px;line-height:1.55;color:#334155}
#kintone-unified-suite-v2 .diff-ext-toolbar{margin:8px 0 4px;padding:8px 10px;border:1px solid #e2e8f0;border-radius:8px;background:#fafafa}
#kintone-unified-suite-v2 .diff-ext-toolbar-row{margin-bottom:6px}
#kintone-unified-suite-v2 .diff-preset-toolbar{flex-wrap:wrap;gap:6px;margin-top:4px;align-items:center}
#kintone-unified-suite-v2 .diff-preset-label{font-size:11px;color:#64748b;font-weight:700;margin-right:4px}
#kintone-unified-suite-v2 .diff-selection-set-row{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-top:10px}
#kintone-unified-suite-v2 .diff-selection-set-lbl{font-size:11px;color:#64748b;font-weight:700}
#kintone-unified-suite-v2 .diff-selection-set-name{flex:1;min-width:140px;padding:6px 8px;border:1px solid #cbd5e1;border-radius:6px;font-size:12px}
#kintone-unified-suite-v2 .diff-selection-set-select{min-width:140px;padding:6px 8px;border-radius:6px;font-size:12px}
#kintone-unified-suite-v2 .main-result-placeholder{padding:18px 14px;font-size:12px;line-height:1.65;color:#475569;background:linear-gradient(180deg,#f8fafc,#fff);border:1px dashed #cbd5e1;border-radius:10px;margin:2px 0}
#kintone-unified-suite-v2 .main-result-placeholder-title{font-weight:800;color:#0f172a;margin:0 0 8px;font-size:13px;letter-spacing:-0.02em}
#kintone-unified-suite-v2 .main-result-placeholder-body{margin:0}
#kintone-unified-suite-v2 .settings-like{margin:12px;border:1px solid var(--dv-border);border-radius:14px;background:linear-gradient(180deg,var(--dv-card) 0%,var(--dv-bg) 100%);padding:12px}
#kintone-unified-suite-v2 .settings-like-head{display:flex;justify-content:space-between;align-items:flex-start;gap:10px;flex-wrap:wrap;margin-bottom:10px}
#kintone-unified-suite-v2 .settings-like-title{font-size:13px;font-weight:800;color:var(--dv-text)}
#kintone-unified-suite-v2 .settings-like-note{font-size:11px;line-height:1.7;color:var(--dv-sub)}
#kintone-unified-suite-v2 .settings-field-list{display:grid;gap:10px}
#kintone-unified-suite-v2 .settings-field-row{border:1px solid var(--dv-border);border-radius:12px;background:var(--dv-card);padding:12px}
#kintone-unified-suite-v2 .settings-field-row-head{display:flex;justify-content:space-between;align-items:flex-start;gap:10px;flex-wrap:wrap;margin-bottom:10px}
#kintone-unified-suite-v2 .settings-field-name{font-size:13px;font-weight:800;color:var(--dv-text)}
#kintone-unified-suite-v2 .settings-field-code{margin-top:4px;font-size:11px;color:var(--dv-sub);font-family:ui-monospace,SFMono-Regular,Menlo,monospace;word-break:break-all}
#kintone-unified-suite-v2 .settings-chip-row{display:flex;gap:6px;flex-wrap:wrap}
#kintone-unified-suite-v2 .settings-chip{display:inline-flex;align-items:center;gap:4px;padding:3px 8px;border-radius:999px;border:1px solid var(--dv-border);font-size:10px;font-weight:700;background:var(--dv-pad);color:var(--dv-text)}
#kintone-unified-suite-v2 .settings-chip.subtle{font-weight:600;color:var(--dv-sub)}
#kintone-unified-suite-v2 .settings-chip.state-change{background:#fff7ed;border-color:#fdba74;color:#9a3412}
#kintone-unified-suite-v2 .settings-chip.state-source{background:#eff6ff;border-color:#93c5fd;color:#1d4ed8}
#kintone-unified-suite-v2 .settings-chip.state-target{background:#ecfdf5;border-color:#86efac;color:#166534}
#kintone-unified-suite-v2 .settings-chip.state-rename{background:#f5f3ff;border-color:#c4b5fd;color:#6d28d9}
#kintone-unified-suite-v2 .settings-chip.severity-high{background:#fee2e2;border-color:#fecaca;color:#991b1b}
#kintone-unified-suite-v2 .settings-chip.severity-medium{background:#fef3c7;border-color:#fde68a;color:#92400e}
#kintone-unified-suite-v2 .settings-chip.severity-low{background:#dbeafe;border-color:#bfdbfe;color:#1d4ed8}
#kintone-unified-suite-v2 .settings-compare-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
#kintone-unified-suite-v2 .settings-side-card{border:1px solid var(--dv-border);border-radius:12px;background:var(--dv-card);overflow:hidden;min-width:0}
#kintone-unified-suite-v2 .settings-side-head{padding:8px 10px;border-bottom:1px solid var(--dv-border);background:var(--dv-pad);font-size:11px;font-weight:800;color:var(--dv-sub)}
#kintone-unified-suite-v2 .settings-field-card{padding:10px}
#kintone-unified-suite-v2 .settings-field-card-title{font-size:12px;font-weight:700;color:var(--dv-text)}
#kintone-unified-suite-v2 .settings-field-card-code{margin-top:4px;font-size:10px;color:var(--dv-sub);font-family:ui-monospace,SFMono-Regular,Menlo,monospace;word-break:break-all}
#kintone-unified-suite-v2 .settings-field-kuc{margin-top:10px}
#kintone-unified-suite-v2 .kuc-preview-host{display:block;width:100%;max-width:100%;--kuc-text-input-width:100%;--kuc-dropdown-toggle-width:100%}
#kintone-unified-suite-v2 .kuc-preview-host > *{width:100%;max-width:100%}
#kintone-unified-suite-v2 .settings-field-lines{display:grid;gap:6px;margin-top:8px}
#kintone-unified-suite-v2 .settings-field-line{font-size:11px;line-height:1.6;color:var(--dv-sub)}
#kintone-unified-suite-v2 .settings-subfield-wrap{display:flex;gap:6px;flex-wrap:wrap;margin-top:10px}
#kintone-unified-suite-v2 .settings-subfield{display:inline-flex;flex-direction:column;gap:2px;padding:6px 8px;border-radius:10px;border:1px solid var(--dv-border);background:var(--dv-bg);font-size:10px;color:var(--dv-sub)}
#kintone-unified-suite-v2 .settings-subfield strong{font-size:11px;color:var(--dv-text)}
#kintone-unified-suite-v2 .settings-subfield.is-changed{border-color:#60a5fa;background:rgba(59,130,246,.08)}
#kintone-unified-suite-v2 .settings-empty{padding:16px 12px;font-size:11px;color:var(--dv-sub);font-style:italic}
#kintone-unified-suite-v2 .settings-layout-canvas{max-height:480px;overflow:auto;padding:12px 16px;background:#f5f5f5}
#kintone-unified-suite-v2 .diff-view.dark .settings-layout-canvas{background:#1a1a2e}
#kintone-unified-suite-v2 .settings-layout-row{display:flex;flex-wrap:nowrap;gap:0;margin-bottom:0;align-items:stretch;border-bottom:1px solid #e3e7eb;padding:6px 0}
#kintone-unified-suite-v2 .diff-view.dark .settings-layout-row{border-bottom-color:var(--dv-border)}
#kintone-unified-suite-v2 .settings-layout-row:last-child{border-bottom:none}
#kintone-unified-suite-v2 .settings-layout-item,
#kintone-unified-suite-v2 .settings-layout-group,
#kintone-unified-suite-v2 .settings-layout-subtable,
#kintone-unified-suite-v2 .settings-layout-static{border:none;border-radius:0;background:transparent;min-width:0}
#kintone-unified-suite-v2 .settings-layout-item{flex:1 1 0%;padding:8px 12px;min-height:auto}
#kintone-unified-suite-v2 .settings-layout-item.is-changed,
#kintone-unified-suite-v2 .settings-layout-group.is-changed,
#kintone-unified-suite-v2 .settings-layout-subtable.is-changed{background:rgba(59,130,246,.08);box-shadow:inset 3px 0 0 #3b82f6}
#kintone-unified-suite-v2 .settings-layout-item-label{font-size:12px;font-weight:600;color:var(--dv-text);margin-bottom:4px}
#kintone-unified-suite-v2 .settings-layout-item-body{margin-top:4px}
#kintone-unified-suite-v2 .settings-layout-control{display:flex;align-items:center;min-height:32px;border:1px solid #e3e7eb;border-radius:4px;background:#fff;padding:0 8px;font-size:12px;color:#999}
#kintone-unified-suite-v2 .diff-view.dark .settings-layout-control{background:var(--dv-card);border-color:var(--dv-border);color:var(--dv-sub)}
#kintone-unified-suite-v2 .settings-layout-control.textarea{display:grid;gap:4px;padding:6px 8px;min-height:56px}
#kintone-unified-suite-v2 .settings-layout-control.textarea span{display:block;height:5px;border-radius:2px;background:#e3e7eb}
#kintone-unified-suite-v2 .diff-view.dark .settings-layout-control.textarea span{background:var(--dv-border)}
#kintone-unified-suite-v2 .settings-layout-control.textarea span:nth-child(1){width:100%}
#kintone-unified-suite-v2 .settings-layout-control.textarea span:nth-child(2){width:82%}
#kintone-unified-suite-v2 .settings-layout-control.textarea span:nth-child(3){width:64%}
#kintone-unified-suite-v2 .settings-layout-control.number{justify-content:flex-end;font-family:ui-monospace,SFMono-Regular,Menlo,monospace}
#kintone-unified-suite-v2 .settings-layout-control.select::after{content:"";border:4px solid transparent;border-top:5px solid #999;margin-left:auto}
#kintone-unified-suite-v2 .settings-layout-control.file,
#kintone-unified-suite-v2 .settings-layout-control.list{justify-content:center;border-style:dashed}
#kintone-unified-suite-v2 .settings-layout-choice-stack{display:flex;gap:6px;flex-wrap:wrap}
#kintone-unified-suite-v2 .settings-layout-choice{display:inline-flex;align-items:center;gap:5px;padding:4px 8px;border-radius:4px;border:1px solid #e3e7eb;background:#fff;font-size:11px;color:#666}
#kintone-unified-suite-v2 .diff-view.dark .settings-layout-choice{background:var(--dv-card);border-color:var(--dv-border);color:var(--dv-sub)}
#kintone-unified-suite-v2 .settings-layout-choice.checkbox::before,
#kintone-unified-suite-v2 .settings-layout-choice.radio::before{content:"";width:12px;height:12px;border:1.5px solid #ccc;background:transparent;flex:0 0 auto}
#kintone-unified-suite-v2 .settings-layout-choice.checkbox::before{border-radius:2px}
#kintone-unified-suite-v2 .settings-layout-choice.radio::before{border-radius:999px}
#kintone-unified-suite-v2 .settings-layout-choice.active::before{background:#2563eb;border-color:#2563eb}
#kintone-unified-suite-v2 .settings-layout-token-row{display:flex;gap:6px;flex-wrap:wrap}
#kintone-unified-suite-v2 .settings-layout-token{display:inline-flex;align-items:center;padding:4px 8px;border-radius:999px;background:#dbeafe;color:#1d4ed8;font-size:10px;font-weight:700}
#kintone-unified-suite-v2 .settings-layout-item-meta{margin-top:4px;font-size:10px;line-height:1.5;color:#999;word-break:break-all}
#kintone-unified-suite-v2 .diff-view.dark .settings-layout-item-meta{color:var(--dv-sub)}
#kintone-unified-suite-v2 .settings-layout-item-meta span{color:#999}
#kintone-unified-suite-v2 .diff-view.dark .settings-layout-item-meta span{color:var(--dv-sub)}
#kintone-unified-suite-v2 .settings-layout-group{border:1px solid #bcd3eb;border-radius:6px;background:#fff;overflow:hidden;margin:4px 0}
#kintone-unified-suite-v2 .diff-view.dark .settings-layout-group{border-color:var(--dv-border);background:var(--dv-card)}
#kintone-unified-suite-v2 .settings-layout-subtable{border:1px solid #d0d7de;border-radius:6px;background:#fff;overflow:hidden;margin:4px 0}
#kintone-unified-suite-v2 .diff-view.dark .settings-layout-subtable{border-color:var(--dv-border);background:var(--dv-card)}
#kintone-unified-suite-v2 .settings-layout-group-head,
#kintone-unified-suite-v2 .settings-layout-subtable-head{display:flex;justify-content:space-between;gap:8px;align-items:center;padding:7px 10px;border-bottom:1px solid #bcd3eb;background:#e8f0fe;font-size:12px;font-weight:700;color:#1a56db}
#kintone-unified-suite-v2 .diff-view.dark .settings-layout-group-head,
#kintone-unified-suite-v2 .diff-view.dark .settings-layout-subtable-head{background:#1e3a5f;border-bottom-color:var(--dv-border);color:#93c5fd}
#kintone-unified-suite-v2 .settings-layout-group-head span,
#kintone-unified-suite-v2 .settings-layout-subtable-head span{font-size:10px;color:#6b7c93;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-weight:400}
#kintone-unified-suite-v2 .settings-layout-group-body{padding:4px 8px;background:#fafcff}
#kintone-unified-suite-v2 .diff-view.dark .settings-layout-group-body{background:var(--dv-card)}
#kintone-unified-suite-v2 .settings-layout-subtable-cols{display:flex;gap:6px;flex-wrap:wrap;padding:8px 10px;background:#fafcff}
#kintone-unified-suite-v2 .diff-view.dark .settings-layout-subtable-cols{background:var(--dv-card)}
#kintone-unified-suite-v2 .settings-layout-static{padding:8px 12px;display:flex;align-items:flex-start;justify-content:flex-start;font-size:12px;color:var(--dv-sub);min-height:auto;flex:1 1 0%;line-height:1.6}
#kintone-unified-suite-v2 .settings-layout-static.label{font-weight:400;color:var(--dv-text);word-break:break-word}
#kintone-unified-suite-v2 .settings-layout-static.label span,
#kintone-unified-suite-v2 .settings-layout-static.label div,
#kintone-unified-suite-v2 .settings-layout-static.label p{max-width:100%}
#kintone-unified-suite-v2 .settings-layout-static.label *{margin:0;padding:0}
#kintone-unified-suite-v2 .settings-layout-static.hr{padding:6px 0;background:transparent;border:none;align-items:center;justify-content:center}
#kintone-unified-suite-v2 .settings-layout-static.hr span{display:block;width:100%;border-top:1px solid #d0d7de}
#kintone-unified-suite-v2 .diff-view.dark .settings-layout-static.hr span{border-top-color:var(--dv-border)}
#kintone-unified-suite-v2 .settings-layout-static.spacer{color:transparent;min-height:20px}
#kintone-unified-suite-v2 .json-tree-host{margin-top:10px;border:1px solid var(--dv-border);border-radius:12px;background:#fff;padding:12px;overflow:auto}
#kintone-unified-suite-v2 .json-tree-placeholder,#kintone-unified-suite-v2 .json-tree-loading{font-size:11px;line-height:1.7;color:var(--dv-sub)}
#kintone-unified-suite-v2 .json-tree-error{font-size:11px;line-height:1.7;color:#b91c1c;white-space:pre-wrap;word-break:break-word}
#kintone-unified-suite-v2 .json-tree-host .jsondiffpatch-delta{font-size:11px;color:#0f172a}
#kintone-unified-suite-v2 .json-tree-host .jsondiffpatch-delta pre{font-family:ui-monospace,SFMono-Regular,Menlo,monospace}
#kintone-unified-suite-v2 .multi-target-card{border:1px solid #dbe3ed;border-radius:8px;background:#fff;padding:10px}
#kintone-unified-suite-v2 .multi-target-head{display:flex;justify-content:space-between;align-items:center;gap:8px;font-size:11px;color:#475569;margin-bottom:6px}
#kintone-unified-suite-v2 .multi-target-badges{display:flex;gap:6px;flex-wrap:wrap}
#kintone-unified-suite-v2 .multi-target-badge{display:inline-flex;align-items:center;padding:2px 7px;border-radius:999px;font-size:10px;background:#eef2ff;color:#3730a3}
#kintone-unified-suite-v2 .multi-target-note{font-size:11px;color:#64748b;padding:10px}
#kintone-unified-suite-v2 .multi-target-table td{vertical-align:middle}
#kintone-unified-suite-v2.busy .btn,#kintone-unified-suite-v2.busy .tab,#kintone-unified-suite-v2.busy .x{pointer-events:none;opacity:.62}
#kintone-unified-suite-v2 .busy-overlay{position:absolute;inset:0;z-index:40;background:rgba(15,23,42,.2);display:none;align-items:center;justify-content:center}
#kintone-unified-suite-v2.busy .busy-overlay{display:flex}
#kintone-unified-suite-v2 .busy-chip{display:flex;align-items:center;gap:10px;background:#0f172a;color:#fff;border-radius:999px;padding:10px 14px;font-size:12px;font-weight:700;box-shadow:0 8px 22px rgba(15,23,42,.32)}
#kintone-unified-suite-v2 .busy-spinner{width:14px;height:14px;border:2px solid rgba(255,255,255,.35);border-top-color:#fff;border-radius:999px;animation:kintone-unified-suite-v2-spin .8s linear infinite}
@keyframes kintone-unified-suite-v2-spin{to{transform:rotate(360deg)}}
#kintone-unified-suite-v2 .reflect-layout{display:flex;gap:0;height:clamp(360px,62vh,860px);border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;margin-top:10px;background:#fff;resize:vertical;min-height:320px}
#kintone-unified-suite-v2 .reflect-sidebar{width:220px;min-width:220px;background:#f8fafc;border-right:1px solid #e2e8f0;display:flex;flex-direction:column;overflow:hidden}
#kintone-unified-suite-v2 .reflect-sidebar .sidebar-head{padding:10px 12px;border-bottom:1px solid #e2e8f0;font-size:12px;font-weight:700;background:#eef2ff;color:#1e293b;display:flex;flex-direction:column;align-items:stretch;gap:4px}
#kintone-unified-suite-v2 .reflect-sidebar .sidebar-head-row{display:flex;justify-content:space-between;align-items:center;gap:8px}
#kintone-unified-suite-v2 .reflect-sidebar .sidebar-hint{font-size:10px;font-weight:400;color:#64748b;line-height:1.45;margin:0}
#kintone-unified-suite-v2 .reflect-sidebar .sidebar-sections{flex:1;overflow:auto;padding:4px 0}
#kintone-unified-suite-v2 .reflect-sidebar .sidebar-item{display:flex;align-items:center;gap:6px;padding:7px 12px;font-size:11px;cursor:pointer;border-left:3px solid transparent;transition:background .15s,border-color .15s}
#kintone-unified-suite-v2 .reflect-sidebar .sidebar-item:hover{background:#eef2ff}
#kintone-unified-suite-v2 .reflect-sidebar .sidebar-item.active{background:#dbeafe;border-left-color:#2563eb;font-weight:700}
#kintone-unified-suite-v2 .reflect-sidebar .sidebar-item.disabled{opacity:.5;cursor:default}
#kintone-unified-suite-v2 .reflect-sidebar .sidebar-item .sec-check{margin:0;flex-shrink:0}
#kintone-unified-suite-v2 .reflect-sidebar .sidebar-item .sec-label{flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#kintone-unified-suite-v2 .reflect-sidebar .sidebar-item .sec-badge{font-size:9px;padding:2px 6px;border-radius:999px;background:#e2e8f0;color:#475569;flex-shrink:0}
#kintone-unified-suite-v2 .reflect-sidebar .sidebar-item .sec-badge.has-diff{background:#fef3c7;color:#92400e}
#kintone-unified-suite-v2 .reflect-sidebar .sidebar-item .sec-badge.no-put{background:#f1f5f9;color:#94a3b8}
#kintone-unified-suite-v2 .reflect-sidebar .sidebar-item .sec-badge.no-data{background:#f1f5f9;color:#94a3b8;font-style:italic}
#kintone-unified-suite-v2 .reflect-sidebar .sidebar-footer{padding:8px 10px;border-top:1px solid #e2e8f0;display:flex;gap:4px;flex-wrap:wrap}
#kintone-unified-suite-v2 .reflect-sidebar .sidebar-footer .btn{padding:4px 8px;font-size:10px}
#kintone-unified-suite-v2 .reflect-sidebar .sidebar-footer .btn:disabled{opacity:.4;cursor:default;pointer-events:none}
#kintone-unified-suite-v2 .reflect-main{flex:1;display:flex;flex-direction:column;overflow:hidden;min-width:0}
#kintone-unified-suite-v2 .reflect-main .main-header{padding:10px 14px;border-bottom:1px solid #e2e8f0;background:#fff}
#kintone-unified-suite-v2 .reflect-main-header{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap}
#kintone-unified-suite-v2 .reflect-main-header__controls{display:flex;flex-direction:column;align-items:flex-end;gap:8px}
#kintone-unified-suite-v2 .reflect-simple-toggle{margin:0;font-size:11px}
#kintone-unified-suite-v2 .reflect-mode-tabs{display:inline-flex;gap:0;padding:3px;border-radius:10px;background:#e2e8f0;border:1px solid #cbd5e1}
#kintone-unified-suite-v2 .reflect-mode-tabs .reflect-mode-tab{border-radius:8px;margin:0}
#kintone-unified-suite-v2 .reflect-plan-inline{border:1px solid #c7d2fe;border-radius:12px;background:linear-gradient(180deg,#fafbff,#fff);padding:10px 12px;margin-bottom:4px}
#kintone-unified-suite-v2 .reflect-plan-inline__head{display:flex;flex-wrap:wrap;justify-content:space-between;gap:8px;align-items:baseline;margin-bottom:8px}
#kintone-unified-suite-v2 .reflect-plan-inline__title{font-size:12px;font-weight:800;color:#1e3a8a}
#kintone-unified-suite-v2 .reflect-plan-inline__meta{font-size:10px;color:#64748b}
#kintone-unified-suite-v2 .reflect-plan-inline__pre{margin:0;max-height:220px;overflow:auto;padding:10px;border-radius:8px;background:#f8fafc;border:1px solid #e2e8f0;font-size:11px;line-height:1.5;white-space:pre-wrap;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;color:#334155}
#kintone-unified-suite-v2 .reflect-plan-inline__muted{margin:0;font-size:11px;line-height:1.65;color:#64748b}
#kintone-unified-suite-v2 .reflect-plan-inline--stale{border-color:#fdba74;background:linear-gradient(180deg,#fffbeb,#fff)}
#kintone-unified-suite-v2 .reflect-plan-inline--empty{border-style:dashed}
#kintone-unified-suite-v2 .reflect-layout--simple .reflect-mode-tabs #u_modeNodeBtn{display:none!important}
#kintone-unified-suite-v2 .reflect-layout--simple .reflect-footer-advanced-btn{display:none!important}
#kintone-unified-suite-v2 .reflect-main .main-header .main-title{font-size:13px;font-weight:700;color:#0f172a}
#kintone-unified-suite-v2 .reflect-main .main-header .main-meta{font-size:11px;color:#64748b;margin-top:4px}
#kintone-unified-suite-v2 .reflect-main .main-body{flex:1;overflow:auto;padding:14px;display:flex;flex-direction:column;gap:10px;min-height:0}
#kintone-unified-suite-v2 .reflect-main .main-footer{padding:10px 14px;border-top:1px solid #e2e8f0;background:#f8fafc;display:flex;gap:8px;flex-wrap:wrap;align-items:center}
#kintone-unified-suite-v2 .reflect-footer-stack{border-top:1px solid #e2e8f0;background:#fafbfc}
#kintone-unified-suite-v2 .reflect-footer-badges{display:flex;flex-wrap:wrap;gap:6px;align-items:center;padding:8px 14px 0}
#kintone-unified-suite-v2 .reflect-footer-badge{display:inline-flex;align-items:center;padding:3px 10px;border-radius:999px;font-size:10px;font-weight:800;letter-spacing:.02em;border:1px solid #e2e8f0;background:#fff;color:#475569}
#kintone-unified-suite-v2 .reflect-footer-badge--ok{border-color:#86efac;background:#ecfdf5;color:#166534}
#kintone-unified-suite-v2 .reflect-footer-badge--warn{border-color:#fdba74;background:#fff7ed;color:#9a3412}
#kintone-unified-suite-v2 .reflect-footer-options{padding:8px 14px;border-top:1px dashed #e2e8f0;margin-top:4px}
#kintone-unified-suite-v2 .reflect-footer-options__label{font-size:10px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:#64748b;margin-bottom:6px}
#kintone-unified-suite-v2 .reflect-footer-options__chips{display:flex;gap:8px;flex-wrap:wrap}
#kintone-unified-suite-v2 .reflect-opt-deploy{border-color:#fecaca;background:linear-gradient(180deg,#fff,#fff5f5)}
#kintone-unified-suite-v2 .reflect-footer-actions{align-items:flex-start}
#kintone-unified-suite-v2 .reflect-footer-actions__preview,
#kintone-unified-suite-v2 .reflect-footer-actions__prod{display:flex;flex-wrap:wrap;gap:8px;align-items:center;padding:4px 8px;border-radius:10px}
#kintone-unified-suite-v2 .reflect-footer-actions__preview{flex:1;min-width:200px;border:1px solid #bae6fd;background:linear-gradient(180deg,#fff,#f0f9ff)}
#kintone-unified-suite-v2 .reflect-footer-actions__prod{flex:0 0 auto;border:1px solid #fecaca;background:linear-gradient(180deg,#fff,#fff5f5)}
#kintone-unified-suite-v2 .reflect-footer-zone-label{display:block;width:100%;font-size:9px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#0369a1;margin-bottom:2px}
#kintone-unified-suite-v2 .reflect-footer-zone-label--prod{color:#b91c1c}
#kintone-unified-suite-v2 .btn-deploy-foot{background:#fff;color:#991b1b;border:2px solid #dc2626;font-weight:800}
#kintone-unified-suite-v2 .btn-deploy-foot:hover{background:#fef2f2;border-color:#b91c1c}
#kintone-unified-suite-v2 .reflect-main .reflect-footer-actions.main-footer{padding:10px 14px;border-top:1px solid #e2e8f0;background:#f1f5f9}
#kintone-unified-suite-v2 .reflect-main .reflect-footer-actions .btn{padding:7px 12px}
#kintone-unified-suite-v2 .opt-card{border:1px solid #e2e8f0;border-radius:8px;padding:10px 12px;margin-bottom:10px;background:#fff}
#kintone-unified-suite-v2 .opt-card .opt-title{font-size:11px;font-weight:700;color:#334155;margin-bottom:6px;display:flex;align-items:center;gap:6px}
#kintone-unified-suite-v2 .opt-card .opt-title .opt-icon{font-size:14px}
#kintone-unified-suite-v2 .sec-preview{border:1px solid #dbeafe;border-radius:8px;background:#eff6ff;padding:12px;margin-bottom:10px}
#kintone-unified-suite-v2 .sec-preview .sec-preview-title{font-size:12px;font-weight:700;color:#1d4ed8;margin-bottom:6px}
#kintone-unified-suite-v2 .sec-preview .sec-diff-summary{display:flex;gap:6px;flex-wrap:wrap;margin-top:6px}
#kintone-unified-suite-v2 .sec-preview .sec-diff-pill{font-size:10px;padding:2px 8px;border-radius:999px;border:1px solid #bfdbfe;background:#fff}
#kintone-unified-suite-v2 .sec-overview-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:8px;margin-bottom:12px}
#kintone-unified-suite-v2 .sec-overview-card{border:1px solid #e2e8f0;border-radius:8px;padding:10px;background:#fff;cursor:pointer;transition:border-color .15s,box-shadow .15s}
#kintone-unified-suite-v2 .sec-overview-card:hover{border-color:#93c5fd;box-shadow:0 2px 8px rgba(59,130,246,.1)}
#kintone-unified-suite-v2 .sec-overview-card .soc-label{font-size:11px;font-weight:700;color:#1e293b;margin-bottom:4px}
#kintone-unified-suite-v2 .sec-overview-card .soc-stats{font-size:10px;color:#64748b}
#kintone-unified-suite-v2 .sec-overview-card .soc-bar{height:3px;background:#e2e8f0;border-radius:2px;margin-top:6px;overflow:hidden}
#kintone-unified-suite-v2 .sec-overview-card .soc-bar .fill{height:100%;border-radius:2px}
#kintone-unified-suite-v2 .sec-overview-card .soc-bar .fill.added{background:#22c55e}
#kintone-unified-suite-v2 .sec-overview-card .soc-bar .fill.removed{background:#ef4444}
#kintone-unified-suite-v2 .sec-overview-card .soc-bar .fill.changed{background:#f59e0b}
#kintone-unified-suite-v2 .reflect-assist{display:grid;gap:10px;margin-bottom:12px}
#kintone-unified-suite-v2 .reflect-assist.collapsed .reflect-summary-grid,
#kintone-unified-suite-v2 .reflect-assist.collapsed .reflect-plan-strip,
#kintone-unified-suite-v2 .reflect-assist.collapsed .reflect-step-grid{display:none}
#kintone-unified-suite-v2 .reflect-assist-toggle{background:none;border:none;cursor:pointer;font-size:11px;color:#2563eb;padding:2px 6px;border-radius:4px}
#kintone-unified-suite-v2 .reflect-assist-toggle:hover{background:#dbeafe}
#kintone-unified-suite-v2 .reflect-assist-summary-line{font-size:11px;color:#475569;margin-top:4px;display:none}
#kintone-unified-suite-v2 .reflect-assist.collapsed .reflect-assist-summary-line{display:block}
#kintone-unified-suite-v2 .reflect-assist.collapsed .reflect-guide-sub{display:none}
#kintone-unified-suite-v2 .reflect-guide{border:1px solid #c7d2fe;border-radius:12px;background:linear-gradient(135deg,#f8fbff,#eef2ff);padding:12px}
#kintone-unified-suite-v2 .reflect-guide-head{display:flex;justify-content:space-between;gap:10px;align-items:flex-start;flex-wrap:wrap}
#kintone-unified-suite-v2 .reflect-guide-title{font-size:13px;font-weight:800;color:#1e3a8a}
#kintone-unified-suite-v2 .reflect-guide-sub{font-size:11px;line-height:1.7;color:#475569;margin-top:4px}
#kintone-unified-suite-v2 .reflect-guide-badge{display:inline-flex;align-items:center;padding:3px 8px;border-radius:999px;background:#dbeafe;color:#1d4ed8;font-size:10px;font-weight:700}
#kintone-unified-suite-v2 .reflect-step-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:10px}
#kintone-unified-suite-v2 .reflect-step-card{border:1px solid #dbe3ed;border-radius:10px;background:#fff;padding:10px}
#kintone-unified-suite-v2 .reflect-step-card.done{border-color:#86efac;background:#f0fdf4}
#kintone-unified-suite-v2 .reflect-step-card.current{border-color:#93c5fd;background:#eff6ff}
#kintone-unified-suite-v2 .reflect-step-no{font-size:10px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#64748b}
#kintone-unified-suite-v2 .reflect-step-card.done .reflect-step-no{color:#166534}
#kintone-unified-suite-v2 .reflect-step-card.current .reflect-step-no{color:#1d4ed8}
#kintone-unified-suite-v2 .reflect-step-title{font-size:12px;font-weight:700;color:#0f172a;margin-top:4px}
#kintone-unified-suite-v2 .reflect-step-desc{font-size:11px;line-height:1.6;color:#64748b;margin-top:4px}
#kintone-unified-suite-v2 .reflect-summary-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:8px}
#kintone-unified-suite-v2 .reflect-summary-card{border:1px solid #e2e8f0;border-radius:10px;background:#fff;padding:10px}
#kintone-unified-suite-v2 .reflect-summary-label{font-size:10px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#64748b}
#kintone-unified-suite-v2 .reflect-summary-value{font-size:18px;font-weight:800;color:#0f172a;margin-top:4px}
#kintone-unified-suite-v2 .reflect-summary-meta{font-size:11px;line-height:1.7;color:#64748b;margin-top:4px}
#kintone-unified-suite-v2 .reflect-context-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:4px}
#kintone-unified-suite-v2 .reflect-action-hint{font-size:11px;line-height:1.65;color:#64748b;margin:0;padding:8px 10px;border-radius:10px;background:#f8fafc;border:1px solid #e2e8f0}
#kintone-unified-suite-v2 .reflect-action-hint strong{color:#334155}
#kintone-unified-suite-v2 .reflect-section-actions .btn.primary-action{background:#2563eb;color:#fff;border-color:#2563eb;font-weight:700}
#kintone-unified-suite-v2 .reflect-section-actions .btn.primary-action:hover{background:#1d4ed8}
#kintone-unified-suite-v2 .reflect-main .main-footer .footer-status{font-size:11px;color:#64748b;margin-left:auto}
#kintone-unified-suite-v2 .reflect-main .main-footer .btn:disabled{opacity:.4;cursor:default}
#kintone-unified-suite-v2 .reflect-inline-note{font-size:11px;color:#64748b;line-height:1.7}
#kintone-unified-suite-v2 .reflect-inline-list{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}
#kintone-unified-suite-v2 .reflect-plan-strip{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:8px}
#kintone-unified-suite-v2 .reflect-plan-card{border:1px solid #dbe3ed;border-radius:10px;background:#fff;padding:10px}
#kintone-unified-suite-v2 .reflect-plan-pre{margin:8px 0 0;padding:8px 10px;max-height:140px;overflow:auto;border-radius:8px;background:#f8fafc;border:1px solid #e2e8f0;font-size:11px;white-space:pre-wrap;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;color:#334155}
#kintone-unified-suite-v2 .reflect-warning{font-size:11px;background:#fff7ed;border:1px solid #fdba74;border-radius:10px;padding:8px 10px;color:#9a3412}
#kintone-unified-suite-v2 .reflect-good{font-size:11px;background:#ecfdf5;border:1px solid #86efac;border-radius:10px;padding:8px 10px;color:#166534}
#kintone-unified-suite-v2 .reflect-section-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}
#kintone-unified-suite-v2 .reflect-node-workbench{display:flex;gap:12px;align-items:stretch;flex-wrap:wrap;min-height:320px;flex:1;min-width:0}
#kintone-unified-suite-v2 .reflect-node-pane{flex:1 1 460px;min-width:280px;display:flex;min-height:320px;min-width:0}
#kintone-unified-suite-v2 .reflect-node-list-wrap{flex:1;display:flex;min-height:0;min-width:0}
#kintone-unified-suite-v2 .reflect-node-list-wrap .result{flex:1;min-height:0}
#kintone-unified-suite-v2 .reflect-node-detail{flex:1 1 340px;min-width:300px;border:1px solid #dbe3ed;border-radius:10px;background:#fff;display:flex;flex-direction:column;overflow:hidden;min-height:320px}
#kintone-unified-suite-v2 .reflect-node-detail-empty{padding:20px 16px;font-size:12px;line-height:1.8;color:#64748b}
#kintone-unified-suite-v2 .reflect-node-detail-head{padding:12px 14px;border-bottom:1px solid #e2e8f0;background:linear-gradient(135deg,#f8fbff,#eef2ff)}
#kintone-unified-suite-v2 .reflect-node-detail-eyebrow{font-size:10px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#64748b}
#kintone-unified-suite-v2 .reflect-node-detail-title{font-size:13px;font-weight:800;color:#0f172a;margin-top:4px;line-height:1.5}
#kintone-unified-suite-v2 .reflect-node-detail-path{margin-top:6px;font-size:11px;color:#64748b;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;word-break:break-all}
#kintone-unified-suite-v2 .reflect-node-badges{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}
#kintone-unified-suite-v2 .reflect-node-badge{display:inline-flex;align-items:center;gap:4px;padding:3px 8px;border-radius:999px;font-size:10px;font-weight:700;border:1px solid #dbe3ed;background:#fff}
#kintone-unified-suite-v2 .reflect-node-badge.high{background:#fee2e2;border-color:#fecaca;color:#991b1b}
#kintone-unified-suite-v2 .reflect-node-badge.medium{background:#fef3c7;border-color:#fde68a;color:#92400e}
#kintone-unified-suite-v2 .reflect-node-badge.low{background:#dbeafe;border-color:#bfdbfe;color:#1d4ed8}
#kintone-unified-suite-v2 .reflect-node-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}
#kintone-unified-suite-v2 .reflect-node-actions .btn{padding:5px 10px;font-size:11px}
#kintone-unified-suite-v2 .reflect-node-detail-tabs{display:flex;gap:6px;flex-wrap:wrap;padding:10px 12px;border-bottom:1px solid #e2e8f0;background:#fff}
#kintone-unified-suite-v2 .reflect-node-tab{border:1px solid #cbd5e1;background:#fff;color:#334155;border-radius:999px;padding:5px 10px;font-size:11px;font-weight:700;cursor:pointer}
#kintone-unified-suite-v2 .reflect-node-tab.active{background:#0f172a;border-color:#0f172a;color:#fff}
#kintone-unified-suite-v2 .reflect-node-detail-body{flex:1;overflow:auto;padding:12px;min-height:0}
#kintone-unified-suite-v2 .reflect-node-detail-note{font-size:11px;color:#64748b;line-height:1.7;margin-bottom:10px}
#kintone-unified-suite-v2 .reflect-node-compare{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px}
#kintone-unified-suite-v2 .reflect-node-card{border:1px solid #dbe3ed;border-radius:8px;background:#fff;overflow:hidden}
#kintone-unified-suite-v2 .reflect-node-card-head{padding:8px 10px;background:#f8fafc;border-bottom:1px solid #e2e8f0;font-size:11px;font-weight:700;color:#334155}
#kintone-unified-suite-v2 .reflect-node-card-body{max-height:420px;overflow:auto}
#kintone-unified-suite-v2 .reflect-node-json{margin:0;padding:10px;white-space:pre-wrap;word-break:break-word;font-size:11px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;color:#0f172a}
#kintone-unified-suite-v2 .reflect-node-meta{display:grid;gap:8px;margin-bottom:10px}
#kintone-unified-suite-v2 .reflect-node-meta-item{font-size:11px;line-height:1.7;color:#475569;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:8px 10px}
#kintone-unified-suite-v2 .reflect-node-meta-item strong{color:#0f172a}
#kintone-unified-suite-v2 .reflect-node-row{cursor:pointer}
#kintone-unified-suite-v2 .reflect-node-row.active td{background:#eff6ff}
@media (max-width:980px){
  #kintone-unified-suite-v2 .settings-compare-grid{grid-template-columns:1fr}
}
#kintone-unified-suite-v2 .h-title-feature{display:none;align-items:center;gap:10px}
#kintone-unified-suite-v2 .h-back{border:0;background:rgba(255,255,255,.22);color:#fff;border-radius:6px;padding:6px 12px;cursor:pointer;font-size:12px;font-weight:700;white-space:nowrap}
#kintone-unified-suite-v2 .h-back:hover{background:rgba(255,255,255,.35)}
#kintone-unified-suite-v2 .launcher-menu{display:none}
#kintone-unified-suite-v2 .feature-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px}
#kintone-unified-suite-v2 .feature-card{border:1px solid #e2e8f0;border-radius:10px;padding:14px 16px;background:#fff;cursor:pointer;transition:border-color .15s,box-shadow .15s,background .15s}
#kintone-unified-suite-v2 .feature-card:hover{border-color:#93c5fd;box-shadow:0 2px 8px rgba(59,130,246,.12);background:#f8fbff}
#kintone-unified-suite-v2 .feature-card-label{font-size:13px;font-weight:700;color:#0f172a}
#kintone-unified-suite-v2 .feature-card-desc{font-size:11px;color:#64748b;margin-top:4px;line-height:1.5}
#kintone-unified-suite-v2 .feature-conn{font-size:11px;color:#64748b;margin-top:2px}
#kintone-unified-suite-v2.screen-launcher .launcher-menu{display:block}
#kintone-unified-suite-v2.screen-launcher .tab-card{display:none}
#kintone-unified-suite-v2.screen-launcher .status-bar{display:none}
#kintone-unified-suite-v2.screen-launcher .result-card{display:none}
#kintone-unified-suite-v2.screen-launcher .h-title-launcher{display:block}
#kintone-unified-suite-v2.screen-launcher .h-title-feature{display:none}
#kintone-unified-suite-v2.screen-feature .launcher-menu{display:none}
#kintone-unified-suite-v2.screen-feature .common-card{display:block}
#kintone-unified-suite-v2.screen-feature .tab-card{display:block}
#kintone-unified-suite-v2.screen-feature .status-bar{display:block}
#kintone-unified-suite-v2.screen-feature .result-card{display:block}
#kintone-unified-suite-v2.screen-feature .h-title-launcher{display:none}
#kintone-unified-suite-v2.screen-feature .h-title-feature{display:flex}
#kintone-unified-suite-v2.screen-feature .tabs{display:none}
#kintone-unified-suite-v2.screen-feature.feat-vis .tabs{display:flex}
#kintone-unified-suite-v2.screen-feature.feat-vis .tab-group:not([data-group="vis"]){display:none}
#kintone-unified-suite-v2.screen-feature.feat-data .tabs{display:flex}
#kintone-unified-suite-v2.screen-feature.feat-data .tab-group:not([data-group="data"]){display:none}
#kintone-unified-suite-v2.screen-feature.feat-change .tabs{display:flex}
#kintone-unified-suite-v2.screen-feature.feat-change .tab-group:not([data-group="change"]){display:none}

/* ========== UX: 接続パネル（折りたたみ） ========== */
#kintone-unified-suite-v2 .connection-panel{border:1px solid #c7d2fe;background:linear-gradient(180deg,#fff 0%,#f8fafc 100%);box-shadow:0 1px 3px rgba(15,23,42,.06)}
#kintone-unified-suite-v2 .connection-panel > summary{list-style:none;cursor:pointer;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 12px;border-radius:9px;user-select:none}
#kintone-unified-suite-v2 .connection-panel > summary::-webkit-details-marker{display:none}
#kintone-unified-suite-v2 .connection-panel > summary::marker{display:none}
#kintone-unified-suite-v2 .connection-panel:not([open]) > summary{border-bottom:none}
#kintone-unified-suite-v2 .connection-panel[open] > summary{border-bottom:1px solid #e2e8f0;border-radius:9px 9px 0 0;background:#f1f5f9}
#kintone-unified-suite-v2 .cps-main{display:flex;flex-direction:column;gap:2px;min-width:0;text-align:left}
#kintone-unified-suite-v2 .cps-title{font-size:13px;font-weight:800;color:#0f172a}
#kintone-unified-suite-v2 .cps-hint{font-size:11px;color:#64748b;line-height:1.45}
#kintone-unified-suite-v2 .cps-toggle-label{flex-shrink:0;font-size:11px;font-weight:700;color:#2563eb;padding:4px 10px;border-radius:999px;background:#dbeafe}
#kintone-unified-suite-v2 .connection-panel-body{padding:10px 12px 12px}
#kintone-unified-suite-v2 .connection-footnote{margin-top:8px}

/* ========== 接続パネルのタブ別表示制御 ========== */

/* アプリID入力が不要なタブ（apiTester, settingsExport）では接続パネル全体を隠す */
#kintone-unified-suite-v2:not(.tab-needs-app-inputs) .connection-section--app-inputs { display: none !important; }

/* 比較先が不要なタブ（er, processFlow, sql）では比較先入力欄を隠す */
#kintone-unified-suite-v2:not(.tab-needs-target) .conn-target { display: none !important; }

/* 「よく使う操作」等の差分/反映専用UIは該当タブ以外で隠す */
#kintone-unified-suite-v2:not(.tab-needs-connection-actions) .connection-section--actions,
#kintone-unified-suite-v2:not(.tab-is-diff-or-reflect) .diff-fold--lookup,
#kintone-unified-suite-v2:not(.tab-is-diff-or-reflect) .connection-step-banner,
#kintone-unified-suite-v2:not(.tab-is-diff-or-reflect) .connection-step-desc,
#kintone-unified-suite-v2:not(.tab-is-diff-or-reflect) .connection-step-btns,
#kintone-unified-suite-v2:not(.tab-is-diff-or-reflect) #u_commonDataState,
#kintone-unified-suite-v2:not(.tab-is-diff-or-reflect) .connection-footnote {
  display: none !important;
}

/* ランチャー */
#kintone-unified-suite-v2 .launcher-lead{margin:0 0 8px;font-size:12px;font-weight:800;color:#334155;letter-spacing:.02em}
#kintone-unified-suite-v2 .feature-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 18px; margin-top: 16px; }
#kintone-unified-suite-v2 .feature-card {
  position: relative; padding: 20px 20px 48px;
  background: rgba(255, 255, 255, 0.6); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.8); border-radius: 16px;
  box-shadow: 0 4px 20px rgba(15, 23, 42, 0.05);
  transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.25s, border-color 0.2s;
  cursor: pointer; overflow: hidden; text-align: left;
}
#kintone-unified-suite-v2 .feature-card:hover {
  transform: translateY(-4px); border-color: #bfdbfe;
  box-shadow: 0 12px 32px rgba(37, 99, 235, 0.12), inset 0 0 0 1px rgba(255, 255, 255, 0.5);
}
#kintone-unified-suite-v2 .feature-card::before {
  content: ""; position: absolute; inset: 0; background: linear-gradient(135deg, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0) 100%); pointer-events: none;
}
#kintone-unified-suite-v2 .feature-card-icon {
  display: inline-flex; align-items: center; justify-content: center;
  width: 44px; height: 44px; border-radius: 12px;
  background: linear-gradient(135deg, #eff6ff, #dbeafe); color: #2563eb;
  margin-bottom: 14px; border: 1px solid rgba(255,255,255,0.7);
  box-shadow: 0 2px 8px rgba(37,99,235,0.1);
}
#kintone-unified-suite-v2 .feature-card-label { font-size: 14px; font-weight: 800; color: #0f172a; margin-bottom: 6px; }
#kintone-unified-suite-v2 .feature-card-desc { font-size: 12px; color: #64748b; line-height: 1.5; }
#kintone-unified-suite-v2 .feature-card:focus{outline:2px solid #2563eb;outline-offset:2px}
#kintone-unified-suite-v2 .feature-card:focus:not(:focus-visible){outline:none}
#kintone-unified-suite-v2 .feature-card-go{
  position:absolute;right:20px;bottom:16px;font-size:12px;font-weight:800;color:#2563eb;
  display: flex; align-items: center; gap: 4px; opacity: 0.8; transition: 0.2s;
}
#kintone-unified-suite-v2 .feature-card:hover .feature-card-go { opacity: 1; transform: translateX(2px); }
#kintone-unified-suite-v2 .feature-card-go::after { content: "→"; font-size: 14px; }

/* 機能画面: タブバー固定（スクロール時も切替しやすく） */
#kintone-unified-suite-v2.screen-feature .tab-card .tabs{
  position:sticky;top:0;z-index:8;
  background:linear-gradient(180deg,#fff 85%,rgba(255,255,255,.94));
  padding:8px 6px 10px;margin:-2px -6px 10px -6px;
  border-bottom:1px solid #e2e8f0;
  box-shadow:0 4px 12px rgba(15,23,42,.04);
}

/* サブタブも見やすく */
#kintone-unified-suite-v2 .subtabs{margin-top:2px}

/* フォーカス可視化・アクセシビリティ */
#kintone-unified-suite-v2 button:focus-visible,
#kintone-unified-suite-v2 .tab:focus-visible,
#kintone-unified-suite-v2 .subtab:focus-visible,
#kintone-unified-suite-v2 input:focus-visible,
#kintone-unified-suite-v2 select:focus-visible,
#kintone-unified-suite-v2 textarea:focus-visible,
#kintone-unified-suite-v2 summary.diff-fold-summary:focus-visible{outline:2px solid #2563eb;outline-offset:2px;border-radius:6px}

/* インタラクション */
#kintone-unified-suite-v2 .btn{transition:background .15s ease,transform .1s ease,box-shadow .15s ease}
#kintone-unified-suite-v2 .btn:hover{filter:brightness(1.05)}
#kintone-unified-suite-v2 .btn:active{transform:translateY(1px)}
#kintone-unified-suite-v2 .tab{transition:background .15s ease,border-color .15s ease,color .15s ease}
#kintone-unified-suite-v2 .tab:hover:not(.active){background:#f1f5f9;border-color:#94a3b8}

/* 結果テーブル行ホバー */
#kintone-unified-suite-v2 table tbody tr:hover td{background:#f1f5f9}
#kintone-unified-suite-v2 .diff-view .diff-table tbody tr:hover td{background:rgba(59,130,246,.06)}

/* ステータス行をやや目立たせる */
#kintone-unified-suite-v2 .status-bar{position:sticky;bottom:0;z-index:4;background:linear-gradient(180deg,rgba(246,248,251,.2),#f6f8fb 30%);padding-top:6px;margin-top:4px}

/* 差分比較 > 比較条件: 折りたたみ */
#kintone-unified-suite-v2 .diff-fold{
  margin-top:10px;border:1px solid #dbe3ed;border-radius:10px;background:#fff;overflow:hidden;
}
#kintone-unified-suite-v2 .diff-fold:first-of-type{margin-top:6px}
#kintone-unified-suite-v2 .diff-fold > summary.diff-fold-summary{
  display:flex;flex-wrap:wrap;align-items:baseline;gap:6px 12px;padding:10px 12px;cursor:pointer;list-style:none;user-select:none;
  background:linear-gradient(180deg,#f8fafc,#f1f5f9);border-bottom:1px solid transparent;
}
#kintone-unified-suite-v2 .diff-fold[open] > summary.diff-fold-summary{border-bottom-color:#e2e8f0}
#kintone-unified-suite-v2 .diff-fold > summary::-webkit-details-marker{display:none}
#kintone-unified-suite-v2 .diff-fold > summary::before{
  content:"";display:inline-block;width:7px;height:7px;margin-right:4px;border-right:2px solid #64748b;border-bottom:2px solid #64748b;
  transform:rotate(-45deg);transition:transform .18s ease;flex-shrink:0;position:relative;top:-1px;
}
#kintone-unified-suite-v2 .diff-fold[open] > summary::before{transform:rotate(45deg);top:-2px}
#kintone-unified-suite-v2 .diff-fold-title{font-size:12px;font-weight:800;color:#0f172a}
#kintone-unified-suite-v2 .diff-fold-sub{
  font-size:10px;font-weight:600;color:#64748b;flex:1 1 100%;margin-left:20px;line-height:1.45;
}
@media (min-width:560px){
  #kintone-unified-suite-v2 .diff-fold-sub{flex:1 1 auto;margin-left:0;max-width:48ch}
}
#kintone-unified-suite-v2 .diff-fold-body{padding:10px 12px 12px;background:#fff}
#kintone-unified-suite-v2 .diff-scope-chips{
  max-height:min(200px,42vh);overflow-y:auto;padding:4px 2px 2px;margin-top:6px;scrollbar-width:thin;scrollbar-color:#cbd5e1 transparent;
}
#kintone-unified-suite-v2 .diff-scope-chips::-webkit-scrollbar{width:6px}
#kintone-unified-suite-v2 .diff-scope-chips::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:999px}
#kintone-unified-suite-v2 .diff-static-chip-lbl{font-size:11px;color:#94a3b8;margin-right:4px;line-height:22px;align-self:center}
#kintone-unified-suite-v2 .diff-static-chip{background:#f1f5f9!important;color:#64748b!important;user-select:none;cursor:help}

/* 共通カード内の折りたたみ（ルックアップ変換など） */
#kintone-unified-suite-v2 .common-card .diff-fold--lookup{margin-top:12px}

/* プレビュー反映フッター直前の折りたたみ（角を揃える） */
#kintone-unified-suite-v2 .diff-fold--reflect-opt{border-radius:8px 8px 0 0!important}

/* ========== Design refresh: shell, launcher 2-col, typography, controls ========== */
#kintone-unified-suite-v2{
  background:linear-gradient(165deg,#e8ecf4 0%,#f0f2f8 40%,#eef1f7 100%);
  border:1px solid rgba(15,23,42,.1);
  border-radius:18px;
  box-shadow:0 25px 50px -12px rgba(15,23,42,.2),0 0 0 1px rgba(255,255,255,.55) inset;
  font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI","Noto Sans JP","Hiragino Kaku Gothic ProN",Meiryo,sans-serif;
  color:#0f172a;
}
#kintone-unified-suite-v2 .h{
  padding:14px 18px;
  background:linear-gradient(135deg,#0f172a 0%,#1e293b 48%,#0f172a 100%);
  border-bottom:3px solid #0ea5e9;
  box-shadow:0 4px 20px rgba(15,23,42,.35);
  gap:14px;
}
#kintone-unified-suite-v2 .h-brand{
  flex-shrink:0;
  display:flex;
  align-items:center;
}
#kintone-unified-suite-v2 .suite-mark{
  display:block;
  width:36px;
  height:36px;
  border-radius:10px;
  background:linear-gradient(145deg,#38bdf8,#0ea5e9);
  box-shadow:0 2px 8px rgba(14,165,233,.45),inset 0 1px 0 rgba(255,255,255,.35);
  position:relative;
}
#kintone-unified-suite-v2 .suite-mark::after{
  content:"";
  position:absolute;
  inset:8px;
  border-radius:4px;
  border:2px solid rgba(255,255,255,.85);
  opacity:.9;
}
#kintone-unified-suite-v2 .h-title-launcher,
#kintone-unified-suite-v2 .h-title-feature{
  flex:1;
  min-width:0;
}
#kintone-unified-suite-v2 .ht{
  font-size:16px;
  font-weight:800;
  letter-spacing:-0.02em;
  line-height:1.3;
}
#kintone-unified-suite-v2 .hs{
  font-size:12px;
  line-height:1.55;
  opacity:.88;
  margin-top:4px;
  max-width:52ch;
}
#kintone-unified-suite-v2 .x{
  border-radius:8px;
  font-weight:600;
  font-size:12px;
  backdrop-filter:blur(6px);
  transition:background .15s ease,transform .1s ease;
}
#kintone-unified-suite-v2 .x:hover{background:rgba(255,255,255,.32)}
#kintone-unified-suite-v2 .body{
  padding:16px;
  gap:14px;
  scrollbar-width:thin;
  scrollbar-color:rgba(100,116,139,.45) transparent;
}
#kintone-unified-suite-v2 .body::-webkit-scrollbar{width:8px}
#kintone-unified-suite-v2 .body::-webkit-scrollbar-thumb{background:rgba(100,116,139,.35);border-radius:999px}
#kintone-unified-suite-v2.screen-launcher .body{
  display:grid;
  grid-template-columns:minmax(280px,380px) minmax(0,1fr);
  grid-template-rows:auto;
  align-items:start;
  gap:16px 18px;
}
@media (max-width:720px){
  #kintone-unified-suite-v2.screen-launcher .body{
    grid-template-columns:1fr;
  }
}
#kintone-unified-suite-v2.screen-feature .body{
  display:flex;
  flex-direction:column;
}
#kintone-unified-suite-v2 .common-card{
  border:1px solid rgba(15,23,42,.08);
  border-radius:14px;
  padding:14px 16px;
  background:linear-gradient(180deg,#fff 0%,#fafbfc 100%);
  box-shadow:0 1px 3px rgba(15,23,42,.06),0 4px 14px rgba(15,23,42,.04);
}
#kintone-unified-suite-v2.screen-launcher .common-card{
  position:sticky;
  top:0;
  max-height:min(78vh,calc(100vh - 120px));
  overflow:auto;
}
#kintone-unified-suite-v2 .tab-card{
  border:1px solid rgba(15,23,42,.08);
  border-radius:14px;
  padding:14px 16px 16px;
  background:#fff;
  box-shadow:0 1px 3px rgba(15,23,42,.05);
}
#kintone-unified-suite-v2 label{
  font-size:11px;
  font-weight:700;
  color:#475569;
  letter-spacing:.02em;
}
#kintone-unified-suite-v2 input[type="text"],
#kintone-unified-suite-v2 textarea,
#kintone-unified-suite-v2 select{
  border:1px solid #cbd5e1;
  border-radius:9px;
  padding:8px 10px;
  font-size:13px;
  transition:border-color .15s ease,box-shadow .15s ease;
}
#kintone-unified-suite-v2 input[type="text"]:focus,
#kintone-unified-suite-v2 textarea:focus,
#kintone-unified-suite-v2 select:focus{
  border-color:#0ea5e9;
  box-shadow:0 0 0 3px rgba(14,165,233,.2);
  outline:none;
}
#kintone-unified-suite-v2 .tabs{
  gap:10px;
  flex-wrap:wrap;
  align-items:flex-start;
}
#kintone-unified-suite-v2 .tab-group{
  padding:6px;
  background:#f1f5f9;
  border-radius:12px;
  border:1px solid #e2e8f0;
  gap:5px;
}
#kintone-unified-suite-v2 .tab-group-lbl{
  font-size:9px;
  text-transform:uppercase;
  letter-spacing:.08em;
  color:#64748b;
  padding:2px 8px 4px;
}
#kintone-unified-suite-v2 .tab{
  border:1px solid transparent;
  background:#fff;
  border-radius:8px;
  padding:8px 12px;
  font-size:12px;
  font-weight:700;
  color:#475569;
  box-shadow:0 1px 2px rgba(15,23,42,.04);
}
#kintone-unified-suite-v2 .tab.active{
  background:linear-gradient(180deg,#0ea5e9,#0284c7);
  border-color:#0369a1;
  color:#fff;
  box-shadow:0 2px 8px rgba(14,165,233,.35);
}
#kintone-unified-suite-v2 .subtabs{
  margin:10px 0 14px;
  padding:8px;
  background:#f8fafc;
  border:1px solid #e2e8f0;
  border-radius:12px;
  gap:6px;
}
#kintone-unified-suite-v2 .subtab{
  border:1px solid #e2e8f0;
  padding:7px 14px;
  font-size:12px;
}
#kintone-unified-suite-v2 .subtab.active{
  background:#0f172a;
  border-color:#0f172a;
  color:#fff;
}
#kintone-unified-suite-v2 .btn{
  border:none;
  border-radius:9px;
  padding:9px 14px;
  font-size:12px;
  font-weight:700;
  background:linear-gradient(180deg,#0ea5e9,#0284c7);
  box-shadow:0 1px 2px rgba(14,165,233,.25);
}
#kintone-unified-suite-v2 .btn.sub{
  background:linear-gradient(180deg,#f8fafc,#f1f5f9);
  color:#334155;
  border:1px solid #cbd5e1;
  box-shadow:0 1px 2px rgba(15,23,42,.04);
}
#kintone-unified-suite-v2 .btn.sub:hover{filter:none;background:#e2e8f0}
#kintone-unified-suite-v2 .btn.ok{
  background:linear-gradient(180deg,#22c55e,#16a34a);
  box-shadow:0 1px 2px rgba(34,197,94,.3);
}
#kintone-unified-suite-v2 .btn.warn{
  background:linear-gradient(180deg,#f59e0b,#d97706);
  box-shadow:0 1px 2px rgba(245,158,11,.3);
}
#kintone-unified-suite-v2 .btn.dark{
  background:linear-gradient(180deg,#334155,#1e293b);
  box-shadow:0 1px 2px rgba(30,41,59,.25);
}
#kintone-unified-suite-v2 .btn.pink{
  background:linear-gradient(180deg,#ec4899,#db2777);
}
#kintone-unified-suite-v2 .btn.sm{
  padding:5px 10px;
  font-size:11px;
}
#kintone-unified-suite-v2 .chip{
  border-radius:8px;
  border-color:#e2e8f0;
  padding:6px 10px;
  transition:background .12s ease,border-color .12s ease;
}
#kintone-unified-suite-v2 .chip:hover{border-color:#bae6fd;background:#f0f9ff}
#kintone-unified-suite-v2 .step{
  background:linear-gradient(90deg,#eff6ff,#f8fafc);
  border-color:#bfdbfe;
  color:#1e3a8a;
  font-size:12px;
  border-radius:8px;
}
#kintone-unified-suite-v2 .kv{
  border-radius:10px;
  border-color:#e2e8f0;
  background:#f8fafc;
  font-size:12px;
}
#kintone-unified-suite-v2 .status-bar{
  background:linear-gradient(180deg,rgba(255,255,255,.5),#f1f5f9);
  border:1px solid #e2e8f0;
  border-radius:12px;
  padding:10px 12px;
  margin-top:6px;
}
#kintone-unified-suite-v2 .status{
  border-radius:10px;
  font-size:12px;
  background:#e2e8f0;
}
#kintone-unified-suite-v2 .result-card{
  border:1px solid rgba(15,23,42,.08);
  border-radius:14px;
  padding:12px 14px;
  background:#fff;
  box-shadow:0 1px 3px rgba(15,23,42,.05);
}
/* タブ内のサブ結果枠のみ角丸調整（メイン #u_result は下のブロックで指定） */
#kintone-unified-suite-v2 .tab-card .result:not(#u_result){
  border-radius:10px;
}
#kintone-unified-suite-v2 .launcher-menu-head{
  margin-bottom:12px;
  padding-bottom:12px;
  border-bottom:1px solid #e2e8f0;
}
#kintone-unified-suite-v2 .launcher-tagline{
  margin:6px 0 0;
  font-size:11px;
  line-height:1.55;
  color:#64748b;
}
#kintone-unified-suite-v2 .feature-grid{
  grid-template-columns:repeat(auto-fill,minmax(220px,1fr));
  gap:12px;
}
#kintone-unified-suite-v2 .feature-card{
  border-radius:14px;
  padding:16px 18px 40px;
  border:1px solid rgba(15,23,42,.08);
  box-shadow:0 2px 8px rgba(15,23,42,.05);
  position:relative;
  overflow:hidden;
}
#kintone-unified-suite-v2 .feature-card::before{
  content:"";
  position:absolute;
  top:0;
  left:0;
  right:0;
  height:3px;
  background:linear-gradient(90deg,#0ea5e9,#6366f1);
  opacity:.85;
}
#kintone-unified-suite-v2 .feature-card[data-feature="diff"]::before{background:linear-gradient(90deg,#0ea5e9,#06b6d4)}
#kintone-unified-suite-v2 .feature-card[data-feature="reflect"]::before{background:linear-gradient(90deg,#22c55e,#14b8a6)}
#kintone-unified-suite-v2 .feature-card[data-feature="field"]::before{background:linear-gradient(90deg,#a855f7,#6366f1)}
#kintone-unified-suite-v2 .feature-card[data-feature="jsconfig"]::before{background:linear-gradient(90deg,#f59e0b,#eab308)}
#kintone-unified-suite-v2 .feature-card[data-feature="vis"]::before{background:linear-gradient(90deg,#3b82f6,#8b5cf6)}
#kintone-unified-suite-v2 .feature-card[data-feature="data"]::before{background:linear-gradient(90deg,#64748b,#475569)}
#kintone-unified-suite-v2 .feature-card:hover{
  border-color:#7dd3fc;
  box-shadow:0 8px 24px rgba(14,165,233,.12);
  transform:translateY(-1px);
}
#kintone-unified-suite-v2 .feature-card-label{
  font-size:14px;
  font-weight:800;
  letter-spacing:-0.02em;
}
#kintone-unified-suite-v2 .feature-card-desc{
  font-size:12px;
  line-height:1.55;
  margin-top:6px;
}
#kintone-unified-suite-v2 .feature-card-go{
  right:16px;
  bottom:14px;
  padding:4px 10px;
  border-radius:999px;
  background:#eff6ff;
  color:#0369a1;
  font-size:11px;
}
#kintone-unified-suite-v2 .feature-card:hover .feature-card-go{
  background:#0ea5e9;
  color:#fff;
}
#kintone-unified-suite-v2 .diff-fold{
  border-radius:12px;
  border-color:#e2e8f0;
  box-shadow:0 1px 2px rgba(15,23,42,.03);
}
#kintone-unified-suite-v2 .diff-fold > summary.diff-fold-summary{
  background:linear-gradient(180deg,#f8fafc,#f1f5f9);
  padding:12px 14px;
}
#kintone-unified-suite-v2 .diff-fold-title{
  font-size:13px;
}
#kintone-unified-suite-v2 .reflect-layout{
  border-radius:14px;
  border-color:#e2e8f0;
  box-shadow:0 2px 10px rgba(15,23,42,.05);
}
#kintone-unified-suite-v2 .reflect-sidebar{
  background:linear-gradient(180deg,#f8fafc,#f1f5f9);
}
#kintone-unified-suite-v2.screen-feature .tab-card .tabs{
  background:linear-gradient(180deg,#fff 70%,rgba(248,250,252,.97));
  border-bottom:1px solid #e2e8f0;
  border-radius:12px 12px 0 0;
  margin:-6px -6px 12px -6px;
  padding:10px 8px 12px;
}
#kintone-unified-suite-v2 .busy-chip{
  background:linear-gradient(135deg,#1e293b,#0f172a);
  border:1px solid rgba(56,189,248,.35);
}
#kintone-unified-suite-v2 .tour-card{
  border-radius:20px;
  box-shadow:0 24px 48px rgba(15,23,42,.25);
}
#kintone-unified-suite-v2 button:focus-visible,
#kintone-unified-suite-v2 .tab:focus-visible,
#kintone-unified-suite-v2 .subtab:focus-visible,
#kintone-unified-suite-v2 input:focus-visible,
#kintone-unified-suite-v2 select:focus-visible,
#kintone-unified-suite-v2 textarea:focus-visible,
#kintone-unified-suite-v2 summary.diff-fold-summary:focus-visible{
  outline:2px solid #0ea5e9;
  outline-offset:2px;
}


/* ========== UX: 見やすさ・操作しやすさ ========== */
#kintone-unified-suite-v2 .muted{line-height:1.65;color:#64748b}
#kintone-unified-suite-v2 .subpane-note{
  font-size:12px;line-height:1.65;color:#475569;margin:0 0 12px;padding:10px 12px;
  background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;border-left:4px solid #0ea5e9;
}
#kintone-unified-suite-v2 h3.connection-section-title{
  margin:0 0 6px;font-size:13px;font-weight:800;color:#0f172a;letter-spacing:-0.02em;
}
#kintone-unified-suite-v2 .connection-section-lead{
  margin:0 0 12px;font-size:12px;line-height:1.6;color:#64748b;
}
#kintone-unified-suite-v2 .connection-section{
  margin-top:14px;padding-top:14px;border-top:1px solid #e8eef5;
}
#kintone-unified-suite-v2 .connection-section:first-of-type{
  margin-top:0;padding-top:0;border-top:none;
}
#kintone-unified-suite-v2 .connection-grid{gap:10px 12px}
#kintone-unified-suite-v2 .connection-section--actions .connection-quick-btns{margin-top:0}
#kintone-unified-suite-v2 .connection-step-banner{margin-top:14px}
#kintone-unified-suite-v2 .connection-step-desc{margin:8px 0 10px;font-size:12px}
#kintone-unified-suite-v2 .connection-step-btns{margin-top:0;gap:10px}
#kintone-unified-suite-v2 .btn-primary-emphasis{
  background:linear-gradient(180deg,#0284c7,#0369a1)!important;
  box-shadow:0 2px 10px rgba(14,165,233,.35)!important;
  padding:10px 16px!important;
  font-size:13px!important;
}
#kintone-unified-suite-v2 .btn-primary-emphasis:hover{filter:brightness(1.06)}
#kintone-unified-suite-v2 .connection-footnote{margin-top:10px;font-size:11px;line-height:1.6}
#kintone-unified-suite-v2 .h-actions .x{
  min-height:36px;min-width:36px;padding:8px 12px;display:inline-flex;align-items:center;justify-content:center;
}
#kintone-unified-suite-v2 .h-actions .x.size{min-width:44px}
#kintone-unified-suite-v2 .feature-conn{
  font-size:12px;line-height:1.55;color:rgba(255,255,255,.88);margin-top:4px;max-width:56ch;
}
#kintone-unified-suite-v2 .status-bar{
  align-items:stretch;gap:10px;border-left:4px solid #94a3b8;
  transition:border-color .2s ease,box-shadow .2s ease;
}
#kintone-unified-suite-v2 .status-bar--error{border-left-color:#dc2626;box-shadow:0 0 0 1px rgba(220,38,38,.12)}
#kintone-unified-suite-v2 .status{
  flex:1;min-width:0;min-height:44px;display:flex;align-items:center;
  font-size:12px;line-height:1.5;word-break:break-word;padding:10px 12px;
}
#kintone-unified-suite-v2 .status--neutral{
  background:linear-gradient(180deg,#f1f5f9,#e2e8f0);color:#0f172a;border:1px solid #cbd5e1;
}
#kintone-unified-suite-v2 .status--error{
  background:linear-gradient(180deg,#fef2f2,#fee2e2);color:#7f1d1d;border:1px solid #fecaca;
}
#kintone-unified-suite-v2 .status-copy-btn{align-self:center;flex-shrink:0}
#kintone-unified-suite-v2 .result-card{
  display:block;min-height:0;
}
#kintone-unified-suite-v2 .result-card-head{
  display:flex;align-items:flex-start;gap:10px;margin-bottom:10px;padding-bottom:10px;
  border-bottom:1px solid #e2e8f0;
}
#kintone-unified-suite-v2 .result-card-mark{
  width:10px;height:10px;border-radius:3px;margin-top:5px;flex-shrink:0;
  background:linear-gradient(145deg,#0ea5e9,#6366f1);
  box-shadow:0 1px 3px rgba(14,165,233,.4);
}
#kintone-unified-suite-v2 .result-card-title{font-size:14px;font-weight:800;color:#0f172a;letter-spacing:-0.02em}
#kintone-unified-suite-v2 .result-card-sub{font-size:11px;color:#64748b;margin-top:3px;line-height:1.45}
/* メイン結果欄のみ（各タブ内の .result には触れない — 触れるとプレビュー反映・差分一覧が崩れる） */
#kintone-unified-suite-v2 #u_result{
  min-height:100px;padding:12px;font-size:12px;line-height:1.55;
  background:linear-gradient(180deg,#fafbfc,#fff);
  max-height:min(480px,55vh);
  overflow:auto;
}
#kintone-unified-suite-v2 #u_result:empty{
  display:flex;align-items:center;justify-content:center;text-align:center;
  color:#94a3b8;font-size:12px;line-height:1.6;
}
#kintone-unified-suite-v2 #u_result:empty::before{
  content:"まだ結果はありません。差分比較の実行や、各タブの操作後にここに表示されます。";
  max-width:36ch;padding:8px;
}
#kintone-unified-suite-v2.screen-feature .body{gap:14px}
#kintone-unified-suite-v2 .tabs{row-gap:10px}
@media (max-width:640px){
  #kintone-unified-suite-v2 .feature-grid{grid-template-columns:1fr}
}
#kintone-unified-suite-v2 .launcher-lead{
  font-size:15px;font-weight:800;color:#0f172a;letter-spacing:-0.02em;
}
#kintone-unified-suite-v2 .reflect-preview-playground{margin-top:8px}
#kintone-unified-suite-v2 #u_reflectPreviewEditorFold{scroll-margin-top:12px;scroll-margin-bottom:96px}
#kintone-unified-suite-v2 .rpp-toolbar,#kintone-unified-suite-v2 .rpp-filters{display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-bottom:8px}
#kintone-unified-suite-v2 .rpp-filters .btn.is-active{border-color:#0ea5e9;color:#0369a1;background:#e0f2fe}
#kintone-unified-suite-v2 .rpp-filters .btn span{margin-left:4px;font-size:10px;opacity:.8}
#kintone-unified-suite-v2 .rpp-list{display:flex;flex-direction:column;gap:8px}
#kintone-unified-suite-v2 .rpp-card{border:1px solid #d6dee8;border-radius:8px;background:#fff}
#kintone-unified-suite-v2 .rpp-head{display:flex;align-items:center;gap:6px;padding:8px 10px}
#kintone-unified-suite-v2 .rpp-open{border:none;background:none;padding:0 2px;cursor:pointer;color:#64748b}
#kintone-unified-suite-v2 .rpp-badge{display:inline-flex;align-items:center;padding:1px 6px;border-radius:999px;font-size:10px;font-weight:700;color:#fff}
#kintone-unified-suite-v2 .rpp-added{background:#0d9488}
#kintone-unified-suite-v2 .rpp-removed{background:#dc2626}
#kintone-unified-suite-v2 .rpp-modified{background:#d97706}
#kintone-unified-suite-v2 .rpp-unchanged{background:#64748b}
#kintone-unified-suite-v2 .rpp-head strong{font-size:12px;color:#0f172a}
#kintone-unified-suite-v2 .rpp-head code{font-size:10px;color:#64748b;background:#f1f5f9;padding:1px 6px;border-radius:999px}
#kintone-unified-suite-v2 .rpp-spacer{margin-left:auto}
#kintone-unified-suite-v2 .rpp-body{border-top:1px solid #e2e8f0;padding:8px 10px}
#kintone-unified-suite-v2 .rpp-pre{margin:0;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11px;white-space:pre-wrap;line-height:1.5;color:#334155;background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:8px}
#kintone-unified-suite-v2 .rpp-table{width:100%;border-collapse:collapse;font-size:11px}
#kintone-unified-suite-v2 .rpp-table th,#kintone-unified-suite-v2 .rpp-table td{border-bottom:1px solid #e2e8f0;padding:4px 6px;vertical-align:top;text-align:left}
#kintone-unified-suite-v2 .rpp-table th{background:#f8fafc;color:#475569}
#kintone-unified-suite-v2 .rpp-table pre{margin:0;white-space:pre-wrap;font-family:ui-monospace,SFMono-Regular,Menlo,monospace}
#kintone-unified-suite-v2 .rpp-preview-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
#kintone-unified-suite-v2 .rpp-preview-head{font-size:10px;color:#64748b;background:#f1f5f9;border:1px solid #e2e8f0;border-radius:6px 6px 0 0;padding:3px 8px}
#kintone-unified-suite-v2 .rpp-preview-body{font-size:12px;color:#0f172a;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 6px 6px;padding:8px;min-height:36px;background:#fff}
#kintone-unified-suite-v2 .rpp-modal-backdrop{position:fixed;inset:0;background:rgba(2,6,23,.45);display:flex;align-items:center;justify-content:center;z-index:70;padding:16px}
#kintone-unified-suite-v2 .rpp-modal{width:min(680px,96vw);background:#fff;border:1px solid #cbd5e1;border-radius:12px;box-shadow:0 20px 60px rgba(2,6,23,.35);overflow:hidden}
#kintone-unified-suite-v2 .rpp-modal-wide{width:min(980px,96vw)}
#kintone-unified-suite-v2 .rpp-modal-head{padding:12px 14px;font-size:13px;font-weight:800;color:#0f172a;background:#f8fafc;border-bottom:1px solid #e2e8f0}
#kintone-unified-suite-v2 .rpp-modal-body{padding:12px 14px}
#kintone-unified-suite-v2 .rpp-modal-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
#kintone-unified-suite-v2 .rpp-modal-label{font-size:11px;font-weight:700;color:#475569;margin-bottom:4px}
#kintone-unified-suite-v2 .rpp-modal-textarea{width:100%;min-height:220px;max-height:52vh;resize:vertical;border:1px solid #cbd5e1;border-radius:8px;background:#fff;padding:8px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px;box-sizing:border-box}
#kintone-unified-suite-v2 .rpp-modal-error{margin-top:8px;padding:8px 10px;border:1px solid #fecaca;background:#fef2f2;color:#b91c1c;border-radius:8px;font-size:11px}
#kintone-unified-suite-v2 .rpp-modal-error-full{grid-column:1/-1}
#kintone-unified-suite-v2 .rpp-modal-confirm{margin:0;font-size:12px;color:#334155;line-height:1.7}
#kintone-unified-suite-v2 .rpp-modal-actions{padding:10px 14px;border-top:1px solid #e2e8f0;background:#f8fafc;display:flex;justify-content:flex-end;gap:8px}
#kintone-unified-suite-v2 .rpp-field-grid{display:grid;grid-template-columns:1fr;gap:8px}
#kintone-unified-suite-v2 .rpp-field-row{display:grid;grid-template-columns:160px 1fr;align-items:center;gap:10px}
#kintone-unified-suite-v2 .rpp-field-row>span{font-size:11px;font-weight:700;color:#334155}
#kintone-unified-suite-v2 .rpp-field-row input,#kintone-unified-suite-v2 .rpp-field-row select{height:32px;border:1px solid #cbd5e1;border-radius:8px;padding:0 8px;box-sizing:border-box;font-size:12px}
#kintone-unified-suite-v2 .rpp-field-row input[type="checkbox"]{width:18px;height:18px;padding:0}
#kintone-unified-suite-v2 .rpp-modal-textarea-mini{min-height:92px}
#kintone-unified-suite-v2 .rpp-modal-hint{margin-top:8px;font-size:11px;color:#64748b}
`;

  // src/ui/template.js
  init_constants();
  init_utils();
  init_dialog();
  function buildRoot(targetDocument = document, options = {}) {
    const doc = targetDocument || document;
    const root2 = doc.createElement("div");
    root2.id = TOOL_ID;
    root2.className = options.popout ? "screen-launcher suite-popout-tab tab-is-diff-or-reflect tab-needs-app-inputs tab-needs-target tab-needs-connection-actions" : "screen-launcher tab-is-diff-or-reflect tab-needs-app-inputs tab-needs-target tab-needs-connection-actions";
    root2.innerHTML = `<style>${styles_default}</style>
        <div class="h" data-dialog-drag-handle="1">
          <div class="h-brand" aria-hidden="true">
            <span class="suite-mark"></span>
          </div>
          <div class="h-title-launcher">
            <div class="ht">kintone 統合変更ツール</div>
            <div class="hs">通常は<strong>新しいタブ</strong>で開きます（ポップアップ拒否時はこのタブ内）。アプリ画面のタブはそのまま操作できます。接続情報を確認してから右のメニューで作業を開きます。</div>
            <div><span class="tool-ver hs" data-act="copyToolInfo" title="クリックでツール識別情報をクリップボードにコピー（問い合わせ・再現調査用）">ビルド ${TOOL_VERSION}</span></div>
          </div>
          <div class="h-title-feature">
            <button class="h-back" data-act="backToLauncher">← 戻る</button>
            <div>
              <div class="ht" id="u_featureTitle"></div>
              <div class="feature-conn" id="u_featureConn"></div>
            </div>
          </div>
          <div class="h-actions">
            <button class="x size" data-act="startGuidedTour">操作ガイド</button>
            <button class="x size" data-act="dialogSizeDefault">標準</button>
            <button class="x size" data-act="dialogSizeLarge">大</button>
            <button class="x size" data-act="dialogSizeMax">最大</button>
            <button class="x" data-act="close">閉じる</button>
          </div>
        </div>
        <div class="body">
          <div class="card common-card" id="u_connectionPanel">
            <section class="connection-section connection-section--app-inputs" aria-labelledby="conn-app-heading">
              <h3 class="connection-section-title" id="conn-app-heading">アプリとゲスト</h3>
              <p class="connection-section-lead" id="u_connectionLead">比較元・比較先の数値IDと、ゲストスペース利用時はゲストIDを入力します。</p>
              <div class="grid connection-grid">
              <div class="conn-source">
                <label for="u_sourceApp">比較元アプリID</label>
                <input type="text" id="u_sourceApp" value="${esc(DEFAULT_APP_ID)}" autocomplete="off">
              </div>
              <div class="conn-source">
                <label for="u_sourceGuest">比較元 ゲストID</label>
                <input type="text" id="u_sourceGuest" placeholder="空欄で通常スペース" autocomplete="off">
              </div>
              <div class="conn-target">
                <label for="u_targetApp">比較先アプリID</label>
                <input type="text" id="u_targetApp" value="${esc(DEFAULT_APP_ID)}" autocomplete="off">
              </div>
              <div class="conn-target">
                <label for="u_targetGuest">比較先 ゲストID</label>
                <input type="text" id="u_targetGuest" placeholder="空欄で通常スペース" autocomplete="off">
              </div>
            </div>
            </section>
            <input type="checkbox" id="u_sourcePreview" style="display:none">
            <input type="checkbox" id="u_targetPreview" checked style="display:none">
            <section class="connection-section connection-section--actions" aria-labelledby="conn-quick-heading">
              <h3 class="connection-section-title" id="conn-quick-heading">よく使う操作</h3>
              <div class="btns connection-quick-btns">
              <button type="button" class="btn sub" data-act="setSourceCurrent" title="今開いているアプリのIDを比較元にセット">比較元=現在アプリ</button>
              <button type="button" class="btn sub" data-act="copySourceToTarget" title="比較元のID/ゲスト/プレビュー設定を比較先にコピー">比較先←比較元</button>
              <button type="button" class="btn sub" data-act="swapSourceTarget" title="比較元と比較先の接続情報を入れ替え">比較元/比較先入替</button>
            </div>
            </section>
            <details class="diff-fold diff-fold--lookup">
              <summary class="diff-fold-summary">
                <span class="diff-fold-title">ルックアップ参照先アプリID変換（任意）</span>
                <span class="diff-fold-sub">環境間で参照先アプリIDが違うときのみ開いてください</span>
              </summary>
              <div class="diff-fold-body">
              <div class="muted" style="margin-bottom:4px;line-height:1.6">ルックアップフィールドを反映する際、参照先アプリIDを自動変換します。開発→本番など環境間でアプリIDが異なる場合に設定してください。</div>
              <div id="u_lookupMapRows"></div>
              <div class="btns" style="margin-top:4px">
                <button type="button" class="btn sub" data-act="addLookupMapRow" title="変換元AppID → 変換先AppID の行を追加します">+ 変換ルールを追加</button>
              </div>
              <input type="hidden" id="u_lookupMap">
              </div>
            </details>
            <div class="step connection-step-banner">共通データ取得 / クイック実行（全タブ共通）</div>
            <p class="muted connection-step-desc">比較元・比較先の設定を使い、一覧で共有するデータを先に取り込めます。「差分→プラン」は連続実行のショートカットです。</p>
            <div class="btns connection-step-btns">
              <button class="btn sub" data-act="prefetchCommonData">共通データ取得（比較元+比較先）</button>
              <button class="btn btn-primary-emphasis" data-act="runDiffAndPlan">差分比較 → 反映プラン確認</button>
            </div>
            <div class="kv" id="u_commonDataState">共通データ未取得</div>
            <div class="muted connection-footnote">共通設定は全タブで使います。推奨: 差分比較 → 反映プラン確認 → プレビュー反映。</div>
            </div>

          <div class="launcher-menu" id="u_launcherMenu">
            <div class="launcher-menu-head">
              <p class="launcher-lead">作業メニュー</p>
              <p class="launcher-tagline">カードをクリックして開きます。戻るボタンでいつでもこの画面に戻れます。</p>
            </div>
            <div class="feature-grid">
              ${FEATURE_DEFS.map((f) => `<div class="feature-card" data-act="openFeature" data-feature="${f.key}" role="button" tabindex="0">
                <div class="feature-card-icon">${f.icon || ""}</div>
                <div class="feature-card-label">${f.label}</div>
                <div class="feature-card-desc">${f.desc}</div>
                <div class="feature-card-go" aria-hidden="true">開く</div>
              </div>`).join("")}
            </div>
          </div>

          <div class="card tab-card">
            <div class="tabs">
              <div class="tab-group" data-group="change">
                <div class="tab-group-lbl">変更・反映</div>
                <button class="tab active" data-tab="diff">差分比較</button>
                <button class="tab" data-tab="reflect">プレビュー反映</button>
                <button class="tab" data-tab="field">フィールド追加</button>
                <button class="tab" data-tab="jsconfig">JS/CSS設定</button>
              </div>
              
              <div class="tab-group" data-group="vis">
                <div class="tab-group-lbl">可視化・出力</div>
                <button class="tab" data-tab="er">ER図</button>
                <button class="tab" data-tab="processFlow">プロセス図</button>
                <button class="tab" data-tab="design">設計書</button>
                <button class="tab" data-tab="settingsExport">設定一括取得</button>
              </div>
              
              <div class="tab-group" data-group="data">
                <div class="tab-group-lbl">データ・保守</div>
                <button class="tab" data-tab="recordMgr">レコード管理</button>
                <button class="tab" data-tab="sql">SQL実行</button>
                <button class="tab" data-tab="apiTester">APIテスター</button>
              </div>
            </div>

            <div class="pane active" data-pane="diff">
              <div class="subtabs">
                <button class="subtab active" data-subtab-parent="diff" data-subtab="conditions">比較条件</button>
                <button class="subtab" data-subtab-parent="diff" data-subtab="view">結果整理</button>
                <button class="subtab" data-subtab-parent="diff" data-subtab="history">履歴・監視</button>
              </div>
              <div class="subpane active" data-subpane-parent="diff" data-subpane="conditions">
                <div class="subpane-note">上部の<strong>プレビュー比較プリセット</strong>で本番/プレビューAPIの組み合わせを決めてから、セクションと実行操作を進めます。細かいオプションは折りたたみにあります。</div>
              <div class="step">手順1: 比較条件を決めて差分を取得</div>

              <details class="diff-fold diff-fold--scopes" open>
                <summary class="diff-fold-summary">
                  <span class="diff-fold-title">比較対象セクション</span>
                  <span class="diff-fold-sub">API 取得範囲（各チップにマウスを載せると API パスが表示されます）</span>
                </summary>
                <div class="diff-fold-body">
                  <div class="btns" style="margin-top:0">
                    <button type="button" class="btn sub" data-act="diffScopeAll" title="一覧のチェックをすべてオンにします">比較セクション全選択</button>
                    <button type="button" class="btn sub" data-act="diffScopeNone" title="一覧のチェックをすべてオフにします">比較セクション全解除</button>
                  </div>
                  <div class="chips diff-scope-chips" id="u_diffScopes"></div>
                </div>
              </details>

              <details class="diff-fold diff-fold--ignore">
                <summary class="diff-fold-summary">
                  <span class="diff-fold-title">無視キー・プリセット・正規化</span>
                  <span class="diff-fold-sub">ノイズ差分を減らす（初期は閉じた状態）</span>
                </summary>
                <div class="diff-fold-body">
                <div class="muted" style="margin-top:0;line-height:1.6">比較時に値が違っても無視する JSON キー名を指定します。以下のキーは常に自動で除外されます。</div>
                <div class="chips" style="min-height:28px;padding:4px 6px;margin-top:6px">
                  <span class="diff-static-chip-lbl" title="ツール側で常に差分計算から外すメタ系キー">常時除外</span>
                  <span class="chip diff-static-chip" title="常に除外">id</span>
                  <span class="chip diff-static-chip" title="常に除外">appid</span>
                  <span class="chip diff-static-chip" title="常に除外">revision</span>
                  <span class="chip diff-static-chip" title="常に除外">createdat</span>
                  <span class="chip diff-static-chip" title="常に除外">creator</span>
                  <span class="chip diff-static-chip" title="常に除外">modifiedat</span>
                  <span class="chip diff-static-chip" title="常に除外">modifier</span>
                </div>
                <div class="muted" style="margin-top:8px">追加で無視したいキー名（ワンクリックで無視リストへ追加）</div>
                <div class="btns" style="margin-top:4px;flex-wrap:wrap">
                  <button type="button" class="btn sub" data-act="addPresetKey" data-key="code" style="font-size:11px;padding:2px 8px" title="code キーの値差分を無視（フィールドコードなど識別子の揺れ対策）">＋code</button>
                  <button type="button" class="btn sub" data-act="addPresetKey" data-key="index" style="font-size:11px;padding:2px 8px" title="index キーを無視（並び順のみの差分を抑えたいとき）">＋index</button>
                  <button type="button" class="btn sub" data-act="addPresetKey" data-key="enabled" style="font-size:11px;padding:2px 8px" title="enabled（有効/無効）の差分を無視">＋enabled</button>
                  <button type="button" class="btn sub" data-act="addPresetKey" data-key="name" style="font-size:11px;padding:2px 8px" title="name の表記ゆれを無視">＋name</button>
                  <button type="button" class="btn sub" data-act="addPresetKey" data-key="label" style="font-size:11px;padding:2px 8px" title="label（表示名）の差分を無視">＋label</button>
                </div>
                <div class="muted" style="margin-top:8px">よく使う無視プリセット</div>
                <div class="chips" style="margin-top:4px">
                  <label class="chip" title="index / no / order など順序系を無視キーにまとめて追加します"><input type="checkbox" id="u_ignorePresetFieldOrder"> フィールド順序(index/no)無視</label>
                  <label class="chip" title="revision・日時・作成者/更新者などメタ情報を無視します"><input type="checkbox" id="u_ignorePresetMeta"> 日時/更新者/revision無視</label>
                  <label class="chip" title="name と label を無視キーに追加します"><input type="checkbox" id="u_ignorePresetLabelName"> name/label差分を無視</label>
                </div>
                <div class="muted" style="margin-top:8px">セクション別正規化プリセット</div>
                <div class="chips" style="margin-top:4px">
                  <label class="chip" title="ビュー・レポート・アクションの並びをソートしてから比較し、順序差分を抑えます"><input type="checkbox" id="u_diffNormalizeViewOrder"> ビュー/グラフ/アクション順序を正規化</label>
                  <label class="chip" title="権限・通知・カテゴリなどの配列順をソートしてから比較します"><input type="checkbox" id="u_diffNormalizePermissionOrder"> 権限/通知/カテゴリ順序を正規化</label>
                  <label class="chip" title="すべての設定（プロセス管理などを含む）で配列の順序を無視します。順序が変わっただけの不要な差分を抑えます。"><input type="checkbox" id="u_diffNormalizeGeneralArrayOrder"> すべての配列順序を無視 (強力)</label>
                </div>
                <div class="muted" style="margin-top:8px">追加した無視キー（×で削除）</div>
                <input type="hidden" id="u_ignoreKeys">
                <div id="u_ignoreKeysTags" class="chips" style="min-height:32px;border:1px solid #d6dee8;border-radius:6px;padding:4px 6px;background:#fff;margin-top:4px;align-items:center"></div>
                <div class="btns" style="margin-top:4px">
                  <input type="text" id="u_ignoreKeyInput" placeholder="キー名を入力してEnterまたは追加" style="flex:1;min-width:0" title="カンマ区切りで複数指定可能な場合は設定保存形式に従います">
                  <button type="button" class="btn sub" data-act="addIgnoreKey">追加</button>
                </div>
                </div>
              </details>

              <details class="diff-fold diff-fold--run" open>
                <summary class="diff-fold-summary">
                  <span class="diff-fold-title">バンドル読込・差分の実行・保存</span>
                  <span class="diff-fold-sub">オフライン JSON やエクスポート操作</span>
                </summary>
                <div class="diff-fold-body">
              <div class="kv" id="u_bundleState">比較元: API取得 / 比較先: API取得</div>
              <div class="btns">
                <button type="button" class="btn sub" data-act="importSourceBundle">比較元バンドル読込</button>
                <button type="button" class="btn sub" data-act="importTargetBundle">比較先バンドル読込</button>
                <button type="button" class="btn sub" data-act="clearBundle">バンドル読込解除</button>
                <button type="button" class="btn sub" data-act="exportBundleJson">バンドル保存</button>
              </div>
              <div class="btns">
                <button type="button" class="btn" data-act="runDiff">差分比較を実行</button>
                <button type="button" class="btn sub" data-act="copyDiffSummary">差分コピー</button>
                <button type="button" class="btn sub" data-act="exportDiffJson">差分JSON保存</button>
                <button type="button" class="btn sub" data-act="exportDiffHtml">差分HTML保存</button>
                <button type="button" class="btn dark" data-act="exportDiffXlsx">差分Excel保存</button>
                <button type="button" class="btn sub" data-act="exportPatchJson">パッチJSON保存</button>
              </div>
                </div>
              </details>
              </div>
              <div class="subpane" data-subpane-parent="diff" data-subpane="view">
                <div class="subpane-note">取得済みの差分の絞り込みと出力です。まず下の「フィルタ・出力」を開き、必要なら「拡大・クイック・選択セット」を開いてください。</div>
                <div class="diff-view-overview">
                  <div class="diff-view-overview-main">
                    <div class="diff-view-overview-title">現在の比較結果</div>
                    <div class="kv diff-view-overview-state" id="u_diffSelectionState">差分未実行</div>
                  </div>
                  <div class="diff-view-overview-side">
                    <div class="diff-view-overview-side-title">主な操作</div>
                    <div class="diff-view-overview-side-body">フィルタ調整 → 必要行を選択 → JSON/HTML/Excel/パッチを出力。別ウィンドウ表示や選択セット保存もこのサブタブで実行できます。</div>
                  </div>
                </div>
              <details class="diff-fold diff-fold--view-extras">
                <summary class="diff-fold-summary">
                  <span class="diff-fold-title">拡大・クイック・選択セット</span>
                  <span class="diff-fold-sub">別ウィンドウ・一括プリセット・チェック選択の保存（普段は閉じたままでOK）</span>
                </summary>
                <div class="diff-fold-body">
              <div id="u_diffOnboarding" class="diff-onboarding" style="display:none" role="note">
                <div class="diff-onboarding-body">
                  <p class="diff-onboarding-text"><strong>ヒント</strong> 下の結果欄は<strong>このサブタブ</strong>を開いているときだけ差分テーブルを表示します。帯グラフ・セクションピル・別ウィンドウ・Shift+範囲選択が使えます。</p>
                  <button type="button" class="btn sub" data-act="dismissDiffOnboarding">了解して閉じる</button>
                </div>
              </div>
              <div class="diff-ext-toolbar">
                <div class="btns diff-ext-toolbar-row">
                  <button type="button" class="btn sub" data-act="openDiffPopout" title="メイン画面と選択・折り畳みを同期した別ウィンドウで差分一覧を表示">差分を別ウィンドウで開く</button>
                </div>
                <div class="diff-preset-toolbar btns">
                  <span class="diff-preset-label">クイック</span>
                  <button type="button" class="btn sub" data-act="diffUiPreset" data-preset="reset" title="セクション・種別・重要度の絞り込みをクリア">解除</button>
                  <button type="button" class="btn sub" data-act="diffUiPreset" data-preset="severity_high" title="重要度「高」だけ表示">高</button>
                  <button type="button" class="btn sub" data-act="diffUiPreset" data-preset="type_added" title="追加差分だけ">追加</button>
                  <button type="button" class="btn sub" data-act="diffUiPreset" data-preset="type_removed" title="削除差分だけ">削除</button>
                  <button type="button" class="btn sub" data-act="diffUiPreset" data-preset="type_changed" title="変更差分だけ">変更</button>
                  <button type="button" class="btn sub" data-act="diffUiPreset" data-preset="sec_field" title="フィールド設定セクションに絞る">フィールド</button>
                  <button type="button" class="btn sub" data-act="diffUiPreset" data-preset="sec_layout" title="レイアウト設定に絞る">レイアウト</button>
                  <button type="button" class="btn sub" data-act="diffUiPreset" data-preset="sec_view" title="ビュー設定に絞る">ビュー</button>
                  <button type="button" class="btn sub" data-act="diffUiPreset" data-preset="sec_process" title="プロセス管理に絞る">プロセス</button>
                  <button type="button" class="btn sub" data-act="diffUiPreset" data-preset="no_acl" title="アプリ/フィールド/レコード権限のセクションを除外して表示">権限非表示</button>
                </div>
                <div class="diff-selection-set-row">
                  <label class="diff-selection-set-lbl" for="u_diffSelectionSetName">選択セット</label>
                  <input type="text" id="u_diffSelectionSetName" class="diff-selection-set-name" placeholder="例: レビュー用" title="現在のチェック選択を名前付きで保存します">
                  <button type="button" class="btn sub" data-act="saveDiffSelectionSet" title="入力した名前で保存">保存</button>
                  <select id="u_diffSelectionSetSelect" class="diff-selection-set-select" title="保存済みセットを読み込み"><option value="">-- 読込 --</option></select>
                  <button type="button" class="btn sub" data-act="loadDiffSelectionSet" title="選択したセットを復元">読込</button>
                  <button type="button" class="btn sub" data-act="deleteDiffSelectionSet" title="選択したセットを削除">削除</button>
                </div>
              </div>
                </div>
              </details>
              <details class="diff-fold diff-fold--view-filter" open>
                <summary class="diff-fold-summary">
                  <span class="diff-fold-title">フィルタ・出力対象・選択</span>
                  <span class="diff-fold-sub">セクション/種別/重要度の絞り込みとエクスポート範囲</span>
                </summary>
                <div class="diff-fold-body">
              <div class="grid2" style="margin-top:0">
                <div>
                  <label title="比較結果をセクション・種別・重要度で絞り込みます">差分フィルタ</label>
                  <div class="grid" style="grid-template-columns:repeat(3,minmax(0,1fr));margin-top:4px">
                    <select id="u_diffFilterSection" title="表示する差分のセクションを限定">
                      <option value="">全セクション</option>
                    </select>
                    <select id="u_diffFilterType" title="追加/削除/変更など種別で限定">
                      <option value="">全種別</option>
                      <option value="added">追加</option>
                      <option value="removed">削除</option>
                      <option value="changed">変更</option>
                      <option value="moved">移動</option>
                      <option value="same">同一</option>
                    </select>
                    <select id="u_diffFilterSeverity" title="エンリッチされた重要度で限定">
                      <option value="">全重要度</option>
                      <option value="high">高</option>
                      <option value="medium">中</option>
                      <option value="low">低</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label title="ファイル保存やコピー時に含める差分の範囲">出力対象 / 内容 / 選択操作</label>
                  <div class="btns" style="margin-top:0">
                    <select id="u_diffExportMode" style="flex:1;min-width:160px" title="保存・コピーに含める行の範囲">
                      <option value="all">出力対象: 全差分</option>
                      <option value="selected">出力対象: 選択差分</option>
                      <option value="visible">出力対象: 現在表示中</option>
                      <option value="favorites">出力対象: お気に入り</option>
                    </select>
                    <select id="u_diffExportContent" style="flex:1;min-width:180px" title="比較対象の生設定をレポートに含めるか">
                      <option value="diffOnly">出力内容: 差分のみ</option>
                      <option value="withCompared">出力内容: 差分 + 比較設定</option>
                    </select>
                    <button type="button" class="btn sub" data-act="selectVisibleDiffs" title="現在フィルタで見えている行を選択状態にします">表示中を選択</button>
                    <button type="button" class="btn sub" data-act="selectAllDiffs" title="全行を選択">全件選択</button>
                    <button type="button" class="btn sub" data-act="clearDiffSelection" title="選択をすべて外す">選択解除</button>
                    <button type="button" class="btn sub" data-act="toggleDiffFavoritesOnly" id="u_diffFavoritesOnlyBtn" title="お気に入り登録した行だけ表示">お気に入りのみ: OFF</button>
                  </div>
                </div>
              </div>
                </div>
              </details>
              <details class="diff-fold diff-fold--view-display">
                <summary class="diff-fold-summary">
                  <span class="diff-fold-title">検索・比較ビューの見え方</span>
                  <span class="diff-fold-sub">パス検索・ハイライト・テーマ・折り畳み（必要なときだけ開く）</span>
                </summary>
                <div class="diff-fold-body">
              <div class="grid2" style="margin-top:0">
                <div>
                  <label title="パスや値の一部でインライン検索">比較ビュー検索（パス / 値）</label>
                  <input type="text" id="u_diffSearch" placeholder="例: fieldSettings.properties.customer_code" title="Ctrl/Cmd+F でもフォーカスできます（比較条件タブの説明参照）">
                  <div class="btns" style="margin-top:6px">
                    <label class="chip" title="ONにすると、フィールドコード/フィールド名（ラベル）を優先して検索します"><input type="checkbox" id="u_diffSearchFieldName"> フィールド名で確認</label>
                  </div>
                </div>
                <div>
                  <label>比較ビュー表示</label>
                  <div class="btns" style="margin-top:0">
                    <label class="chip" title="変更行内の文字単位で追加削除を着色"><input type="checkbox" id="u_charDiff" checked> 文字単位ハイライト</label>
                    <label class="chip" title="同一種別の行もテーブルに出す"><input type="checkbox" id="u_diffIncludeSame"> 差分なしも表示</label>
                    <button type="button" class="btn sub" data-act="toggleDiffTheme" id="u_diffThemeBtn" title="ライト/ダークの表示テーマ">比較テーマ: ライト</button>
                    <button type="button" class="btn sub" data-act="collapseDiffSections" title="セクション見出しをすべて閉じる">全折畳</button>
                    <button type="button" class="btn sub" data-act="expandDiffSections" title="セクション見出しをすべて開く">全展開</button>
                  </div>
                </div>
              </div>
                </div>
              </details>
              <details class="diff-fold diff-fold--view-extra">
                <summary class="diff-fold-summary">
                  <span class="diff-fold-title">件数警告・無視キー候補・ショートカット</span>
                  <span class="diff-fold-sub">大量差分の注意喚起や候補ボタン（普段は閉じてOK）</span>
                </summary>
                <div class="diff-fold-body">
              <div style="margin-top:0">
                <label title="差分件数+取得失敗が閾値を超えたとき警告">差分件数しきい値警告</label>
                <div class="btns" style="margin-top:4px">
                  <input type="text" id="u_diffWarnThreshold" placeholder="例: 200 / 0でOFF" style="max-width:180px" title="0 または空で警告オフ。超過時は結果整理の上にメッセージが出ます">
                </div>
                <div class="warnbox" id="u_diffWarnBox" style="display:none;margin-top:6px"></div>
              </div>
              <div style="margin-top:8px">
                <label title="直近の差分結果から、よくあるノイズキーを提案します">おすすめ無視キー候補（低影響差分から抽出）</label>
                <div id="u_diffSuggestedIgnore" class="chips" style="min-height:32px;border:1px solid #d6dee8;border-radius:6px;padding:6px;background:#fff;margin-top:4px;align-items:center"></div>
                <div class="muted" style="margin-top:4px;line-height:1.55">ショートカット: Ctrl/Cmd+F 検索, Esc 検索クリア, Ctrl/Cmd+Shift+C 差分コピー, Ctrl/Cmd+A 全件選択（検索欄以外フォーカス時）, Shift+クリックでチェック範囲選択, 矢印キーでチェック間移動</div>
              </div>
                </div>
              </details>
              </div>
              <div class="subpane" data-subpane-parent="diff" data-subpane="history">
                <div class="subpane-note">比較履歴、監視、複数比較先チェックをまとめています。</div>
              <details class="diff-fold diff-fold--snap" open>
                <summary class="diff-fold-summary">
                  <span class="diff-fold-title">比較スナップショット履歴</span>
                  <span class="diff-fold-sub">過去の比較結果の一覧・復元</span>
                </summary>
                <div class="diff-fold-body">
                <div class="btns" style="margin-top:0">
                  <button type="button" class="btn sub" data-act="clearDiffSnapshots" title="保存済みスナップショットをすべて削除">履歴全削除</button>
                </div>
                <div id="u_diffSnapshotList" class="result" style="max-height:220px;margin-top:6px"></div>
                </div>
              </details>
              <details class="diff-fold diff-fold--multi" open>
                <summary class="diff-fold-summary">
                  <span class="diff-fold-title">複数比較先の一括比較</span>
                  <span class="diff-fold-sub">同じ比較元に対し複数アプリを比較</span>
                </summary>
                <div class="diff-fold-body">
                <div class="muted" style="margin-top:0;line-height:1.6">比較元 / 比較セクション / 無視キー / 正規化は現在の差分条件を使います。比較先ゲストID / プレビューは上の比較先設定を共通利用します。</div>
                <textarea id="u_diffMultiTargets" rows="3" placeholder="アプリIDを改行またはカンマ区切りで入力" style="margin-top:6px" title="比較先アプリIDを列挙"></textarea>
                <div class="btns" style="margin-top:4px">
                  <button type="button" class="btn sub" data-act="diffMultiUseCurrentTarget" title="上部の比較先アプリIDを1行追加">現在の比較先を追加</button>
                  <button type="button" class="btn sub" data-act="runMultiTargetDiff" title="各IDに対し順に差分を計算">複数比較先を比較</button>
                </div>
                <div id="u_diffMultiTargetResult" class="result" style="max-height:260px;margin-top:6px"></div>
                </div>
              </details>
              </div>
              <input type="file" id="u_sourceBundleFile" accept=".json" style="display:none">
              <input type="file" id="u_targetBundleFile" accept=".json" style="display:none">
            </div>

            <div class="pane" data-pane="reflect">
              <input type="checkbox" id="u_nodeMode" style="display:none">
              <details class="diff-fold diff-fold--reflect-hint">
                <summary class="diff-fold-summary">
                  <span class="diff-fold-title">プレビュー反映の操作ヒント</span>
                  <span class="diff-fold-sub">初めてのときだけ開いて確認</span>
                </summary>
                <div class="diff-fold-body">
              <div class="muted" style="margin-top:0;line-height:1.65">差分比較が未実行または条件変更時は、反映前に自動で差分比較を実行します。<strong>左の一覧</strong>でチェック＝反映対象、<strong>行クリック</strong>でそのセクションの差分サマリーを表示します（<strong>全体概要</strong>はサイドバー下のボタン）。プラン確認・反映・デプロイは<strong>画面下の固定バー</strong>から行います。</div>
                </div>
              </details>
              <div id="u_applyScopeBlock" style="display:none"><div class="chips diff-scope-chips" id="u_applyScopes"></div></div>
              <div class="reflect-layout" id="u_reflectLayout">
                <div class="reflect-sidebar">
                  <div class="sidebar-head">
                    <div class="sidebar-head-row">
                      <span>反映セクション</span>
                      <span style="font-size:10px;font-weight:400;color:#64748b" id="u_sidebarCount">0 / 0</span>
                    </div>
                    <p class="sidebar-hint">チェックで反映に含める · 行クリックで詳細パネル</p>
                  </div>
                  <div class="sidebar-sections" id="u_reflectSidebarSections"></div>
                  <div class="sidebar-footer">
                    <button type="button" class="btn sub" data-act="reflectSidebarOverview">全体概要</button>
                    <button class="btn sub" data-act="applyScopeAll">全選択</button>
                    <button class="btn sub" data-act="applyScopeNone">全解除</button>
                    <button class="btn sub" data-act="applyScopeDiffOnly" id="u_applyScopeDiffOnlyBtn">差分のみ</button>
                    <button class="btn sub" data-act="applyScopeHighRisk">高重要度</button>
                  </div>
                </div>
                <div class="reflect-main">
                  <div class="main-header reflect-main-header">
                    <div class="reflect-main-header__text">
                      <div class="main-title" id="u_reflectMainTitle">反映概要</div>
                      <div class="main-meta" id="u_reflectMode">比較元: API / 比較先: プレビューAPI</div>
                    </div>
                    <div class="reflect-main-header__controls">
                      <button type="button" class="btn sub" data-act="openReflectPreviewEditor" title="フィールド差分プレビューエディタまでスクロールして展開します">差分プレビューエディタ</button>
                      <label class="reflect-simple-toggle chip" title="ノード選択・JSON差分反映を隠し、セクション反映に集中します">
                        <input type="checkbox" id="u_reflectSimpleMode"> 簡易表示
                      </label>
                      <div class="reflect-mode-tabs" role="tablist" aria-label="反映モード">
                        <button type="button" class="btn ok reflect-mode-tab" id="u_modeSectionBtn" data-act="reflectModeSection" aria-selected="true">セクション</button>
                        <button type="button" class="btn sub reflect-mode-tab" id="u_modeNodeBtn" data-act="reflectModeNode" aria-selected="false">ノード選択</button>
                      </div>
                    </div>
                  </div>
                  <div class="main-body" id="u_reflectMainBody">
                    <div id="u_reflectAssist"></div>
                    <div id="u_reflectHowto" style="margin-bottom:10px"></div>
                    <div class="reflect-plan-inline" id="u_reflectPlanInline" aria-live="polite"></div>
                    <div id="u_reflectOverview"></div>
                    <div id="u_reflectHint" class="kv" style="display:none"></div>
                    <div id="u_sectionOptionsBlock" style="display:none">
                      <label class="chip"><input type="checkbox" id="u_applyDiffOnly"> 前回差分のあるセクションのみ反映</label>
                    </div>
                    <div class="warnbox" id="u_nodeWarn" style="display:none">注: ノードモードは「前回差分」から選択して反映します。まず差分比較を実行してください。</div>
                    <div id="u_nodeControls" style="display:none">
                      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px">
                        <button class="btn sub" data-act="loadReflectNodes" style="padding:4px 8px;font-size:10px">差分ノード読込</button>
                        <button class="btn sub" data-act="selectVisibleReflectNodes" style="padding:4px 8px;font-size:10px">表示中を選択</button>
                        <button class="btn sub" data-act="clearVisibleReflectNodes" style="padding:4px 8px;font-size:10px">表示中解除</button>
                        <button class="btn sub" data-act="selectHighSeverityReflectNodes" style="padding:4px 8px;font-size:10px">高重要度を選択</button>
                        <button class="btn ok" data-act="reflectModeVisibleSrc" style="padding:4px 8px;font-size:10px">表示中を比較元</button>
                        <button class="btn ok" data-act="reflectModeVisibleTgt" style="padding:4px 8px;font-size:10px">表示中を比較先</button>
                        <button class="btn sub" data-act="selectReflectNodesAll" style="padding:4px 8px;font-size:10px">全選択</button>
                        <button class="btn sub" data-act="clearReflectNodes" style="padding:4px 8px;font-size:10px">全解除</button>
                        <button class="btn ok" data-act="reflectModeAllSrc" style="padding:4px 8px;font-size:10px">一括で比較元</button>
                        <button class="btn ok" data-act="reflectModeAllTgt" style="padding:4px 8px;font-size:10px">一括で比較先</button>
                        <button class="btn sub" data-act="reflectUndo" style="padding:4px 8px;font-size:10px">Undo</button>
                        <button class="btn sub" data-act="reflectRedo" style="padding:4px 8px;font-size:10px">Redo</button>
                      </div>
                    </div>
                    <div id="u_nodeFilterBlock" style="display:none;margin-bottom:8px">
                      <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center">
                        <input type="text" id="u_nodeSearch" placeholder="パス / セクション で絞り込み" style="flex:1;min-width:140px;padding:4px 8px;border:1px solid #d6dee8;border-radius:6px;font-size:11px">
                        <select id="u_nodeFilterSection" style="padding:4px 6px;border:1px solid #d6dee8;border-radius:6px;font-size:11px"><option value="">全セクション</option></select>
                        <select id="u_nodeFilterType" style="padding:4px 6px;border:1px solid #d6dee8;border-radius:6px;font-size:11px">
                          <option value="">全種別</option><option value="added">追加</option><option value="removed">削除</option><option value="changed">変更</option>
                        </select>
                        <select id="u_nodeFilterSeverity" style="padding:4px 6px;border:1px solid #d6dee8;border-radius:6px;font-size:11px">
                          <option value="">全重要度</option><option value="HIGH">高</option><option value="MEDIUM">中</option><option value="LOW">低</option>
                        </select>
                        <button class="btn sub" type="button" data-act="toggleReflectPropertyPanel" style="padding:4px 8px;font-size:10px">プロパティ選択</button>
                        <button class="btn sub" data-act="clearReflectNodeFilters" style="padding:4px 8px;font-size:10px">絞り込み解除</button>
                      </div>
                      <div id="u_nodePropertyPanel" style="display:none;margin-top:8px;border:1px solid #d6dee8;border-radius:8px;background:#f8fafc;padding:8px 10px">
                        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:6px">
                          <div style="font-size:11px;font-weight:700;color:#334155">対象プロパティ（kintone設定風チェックリスト）</div>
                          <div style="display:flex;gap:6px">
                            <button class="btn sub" type="button" data-act="selectAllReflectProperties" style="padding:3px 7px;font-size:10px">全選択</button>
                            <button class="btn sub" type="button" data-act="clearReflectProperties" style="padding:3px 7px;font-size:10px">全解除</button>
                          </div>
                        </div>
                        <div id="u_nodePropertyChips" style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:6px"></div>
                        <div id="u_nodePropertyList" style="max-height:160px;overflow:auto;background:#fff;border:1px solid #e2e8f0;border-radius:6px;padding:6px"></div>
                      </div>
                    </div>
                    <div class="reflect-node-workbench" id="u_reflectNodeWorkbench" style="display:none">
                      <div class="reflect-node-pane">
                        <div class="reflect-node-list-wrap">
                          <div class="result" id="u_reflectNodeList" style="max-height:none;border:1px solid #dbe3ed;border-radius:8px;overflow:auto;flex:1"></div>
                        </div>
                      </div>
                      <div class="reflect-node-detail" id="u_reflectNodeDetail"></div>
                    </div>
                    <div id="u_patchJsonPanel" style="display:none">
                      <div class="opt-card" style="margin-top:8px">
                        <div class="opt-title">JSON差分反映</div>
                        <div class="muted" style="margin-bottom:6px">パッチJSONファイルを読み込むか、直接編集して比較先プレビューに反映します。</div>
                        <div class="btns" style="margin-bottom:6px">
                          <button class="btn sub" data-act="patchJsonLoadFile">JSONファイル読込</button>
                          <input type="file" id="u_patchJsonFileInput" accept=".json" style="display:none">
                          <button class="btn sub" data-act="patchJsonClear">クリア</button>
                        </div>
                        <div id="u_patchJsonSummary" style="display:none;margin-bottom:6px;padding:6px 10px;border-radius:6px;font-size:11px;background:#eff6ff;border:1px solid #bfdbfe;color:#1e40af"></div>
                        <textarea id="u_patchJsonEditor" placeholder='パッチJSONをここに貼り付け、またはファイルから読み込み...' style="width:100%;min-height:160px;max-height:320px;font-family:monospace;font-size:11px;resize:vertical;border:1px solid #d1d5db;border-radius:6px;padding:8px;box-sizing:border-box"></textarea>
                        <div class="btns" style="margin-top:6px">
                          <button class="btn ok" data-act="applyPatchJson">この内容で反映</button>
                        </div>
                      </div>
                    </div>
                    <section class="opt-card" id="u_reflectPreviewEditorFold" style="margin-top:8px">
                      <div class="opt-title">フィールド差分プレビューエディタ（試験）</div>
                      <div class="muted" style="margin-top:-2px;margin-bottom:6px">追加/削除/編集/ドラッグ上書きの事前確認UI</div>
                      <div>
                        <div class="muted" style="margin-top:0;line-height:1.6">統合ツール内でフィールド差分のプレビューを操作できる補助エディタです。ドラッグ＆ドロップで別カードへ設定上書き（code/typeは保持）、JSON編集とUndoにも対応します。</div>
                        <div id="u_reflectPreviewPlayground" class="reflect-preview-playground"></div>
                      </div>
                    </section>
                  </div>
                  <div class="reflect-footer-stack">
                    <div class="reflect-footer-badges" id="u_reflectFooterBadges" aria-live="polite"></div>
                    <div class="reflect-footer-options" id="u_reflectOptionsCard">
                      <div class="reflect-footer-options__label">反映オプション</div>
                      <div class="reflect-footer-options__chips">
                        <label class="chip" title="反映直前に比較先プレビューの設定JSONを自動保存します"><input type="checkbox" id="u_autoBackupPreview" checked> バックアップ自動保存</label>
                        <label class="chip" title="APIエラーが出た時点で残りの反映を止めます"><input type="checkbox" id="u_stopOnError" checked> エラー時中断</label>
                        <label class="chip reflect-opt-deploy" title="プレビューへの書き込み後、本番反映用のデプロイAPIを続けて呼びます"><input type="checkbox" id="u_doDeploy"> 反映後デプロイ（本番）</label>
                      </div>
                      <div id="u_backupStatus" style="display:none;margin-top:6px;padding:6px 10px;border-radius:6px;font-size:11px;background:#ecfdf5;border:1px solid #a7f3d0;color:#065f46"></div>
                    </div>
                    <div class="reflect-footer-actions main-footer" id="u_reflectFooter">
                      <div class="reflect-footer-actions__preview">
                        <span class="reflect-footer-zone-label">プレビューAPI</span>
                        <button type="button" class="btn sub" data-act="runDiff" id="u_footerRunDiff" title="差分比較を実行します">差分比較</button>
                        <button type="button" class="btn sub" data-act="previewApplyPlan" id="u_footerPlan" title="比較先プレビューに対するAPIリクエスト内容を結果欄に表示します（実行前の確認）">反映プラン確認</button>
                        <button type="button" class="btn sub" data-act="backupTargetPreview" title="比較先のプレビュー設定をJSONファイルとして保存します">バックアップ</button>
                        <button type="button" class="btn ok" data-act="applyPreview" id="u_footerApply" title="選択セクションを比較先のプレビュー環境へ書き込みます。未確認時はプラン確認が先に開きます">比較元 → 比較先(プレビュー) 反映</button>
                        <button type="button" class="btn sub reflect-footer-advanced-btn" data-act="togglePatchJsonPanel" title="パッチJSONを直接読み込んで反映するパネルを開きます">JSON差分反映</button>
                      </div>
                      <div class="reflect-footer-actions__prod">
                        <span class="reflect-footer-zone-label reflect-footer-zone-label--prod">本番デプロイ</span>
                        <button type="button" class="btn btn-deploy-foot" data-act="deployOnly" title="プレビュー内容を本番にデプロイするAPIのみ実行します">デプロイのみ</button>
                      </div>
                      <span class="footer-status" id="u_reflectFooterStatus"></span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="pane" data-pane="field">
              <div class="subtabs">
                <button class="subtab active" data-subtab-parent="field" data-subtab="json">JSON編集</button>
                <button class="subtab" data-subtab-parent="field" data-subtab="source">比較元から追加</button>
                <button class="subtab" data-subtab-parent="field" data-subtab="bulk">一括整備</button>
              </div>
              <div class="subpane active" data-subpane-parent="field" data-subpane="json">
                <div class="subpane-note">フィールド定義JSONを直接編集して、比較先へ反映します。</div>
              <details class="diff-fold diff-fold--field-json" open>
                <summary class="diff-fold-summary">
                  <span class="diff-fold-title">JSONの編集と反映</span>
                  <span class="diff-fold-sub">properties 形式・上書きオプション</span>
                </summary>
                <div class="diff-fold-body">
              <div style="margin-top:0">
                <label title="kintone の field 定義と同じ properties オブジェクト">追加フィールドJSON（properties形式）</label>
                <textarea id="u_fieldJson" placeholder='{"text_1":{"type":"SINGLE_LINE_TEXT","code":"text_1","label":"テキスト"}}' title="有効なフィールド型・code・label を含むJSON"></textarea>
              </div>
              <div class="grid2" style="margin-top:8px">
                <label class="chip" title="既存の同一 code のフィールドを置き換えます"><input type="checkbox" id="u_overwriteField"> 同一コードは上書き</label>
                <label class="chip" title="フィールド更新APIの後にデプロイを実行します"><input type="checkbox" id="u_deployField"> 更新後にデプロイ</label>
              </div>
              <div class="btns">
                <button type="button" class="btn warn" data-act="applyField" title="比較先プレビューにフィールドを追加・更新します">比較先(プレビュー)へフィールド適用</button>
                <button type="button" class="btn sub" data-act="loadTargetFields" title="現在の比較先アプリの fields.json を読み込み">比較先の現在値を読込</button>
                <button type="button" class="btn sub" data-act="formatFieldJson" style="margin-left:8px">JSON整形</button>
                <button type="button" class="btn sub" data-act="importFieldJson">JSONファイル読込</button>
                <button type="button" class="btn sub" data-act="exportFieldJson">JSON保存</button>
              </div>
                </div>
              </details>
              </div>
              <div class="subpane" data-subpane-parent="field" data-subpane="source">
                <div class="subpane-note">比較元アプリの既存フィールドを選択して JSON に取り込みます。</div>
              <details class="diff-fold diff-fold--field-src" open>
                <summary class="diff-fold-summary">
                  <span class="diff-fold-title">比較元からフィールドを選んでマージ</span>
                  <span class="diff-fold-sub">一覧取得 → チェック → JSON に挿入</span>
                </summary>
                <div class="diff-fold-body">
              <div style="margin-top:0">
                <div class="step" style="font-size:12px;margin-bottom:6px">比較元アプリから選択して追加</div>
                <div class="btns">
                  <button type="button" class="btn sub" data-act="loadSourceFieldsList" title="比較元アプリのフィールド一覧APIを呼び出します">比較元フィールド一覧を取得</button>
                </div>
                <div id="u_sourceFieldListContainer" style="display:none;margin-top:8px">
                  <div style="max-height:220px;overflow:auto;border:1px solid #cbd5e1;background:#fff;border-radius:6px;padding:4px">
                    <table style="border:none;margin:0" id="u_sourceFieldTable">
                      <thead style="position:sticky;top:-4px;background:#f8fafc;z-index:1;box-shadow:0 1px 0 #e2e8f0">
                        <tr>
                          <th style="width:30px;text-align:center"><input type="checkbox" id="u_sourceFieldCheckAll" title="表示中の全行を選択"></th>
                          <th>コード / ラベル</th>
                          <th style="width:120px">タイプ</th>
                        </tr>
                      </thead>
                      <tbody id="u_sourceFieldTbody"></tbody>
                    </table>
                  </div>
                  <div class="btns" style="margin-top:8px">
                    <button type="button" class="btn ok" data-act="insertSelectedSourceFields" title="上の JSON エディタにマージします">選択したフィールドをJSONに挿入（マージ）</button>
                    <button type="button" class="btn sub" data-act="closeSourceFieldsList">閉じる</button>
                  </div>
                </div>
              </div>
                </div>
              </details>
              </div>
              <div class="subpane" data-subpane-parent="field" data-subpane="bulk">
              <details class="diff-fold diff-fold--field-bulk" open>
                <summary class="diff-fold-summary">
                  <span class="diff-fold-title">フィールド一括操作（比較先）</span>
                  <span class="diff-fold-sub">プレフィックス・未使用検出 → 上のJSONへ出力</span>
                </summary>
                <div class="diff-fold-body">
              <div class="step" style="font-size:12px;margin-bottom:6px">フィールド一括操作（比較先アプリ）</div>
              <div class="muted" style="margin-bottom:8px;line-height:1.55">比較先アプリの現在のフィールドを元に一括操作し、上の「追加フィールドJSON」に結果を出力します。</div>
              <div class="grid2" style="margin-bottom:6px">
                <div>
                  <label title="各フィールド code の先頭に付与する文字列">プレフィックス（コード先頭に追加）</label>
                  <input type="text" id="u_fieldPrefix" placeholder="例: bk_" title="空にしないで実行してください（追加モード時）">
                </div>
                <div style="display:flex;align-items:flex-end">
                  <label class="chip" title="指定プレフィックスで始まる code から先頭を削ります"><input type="checkbox" id="u_fieldPrefixRemove"> プレフィックスを削除する</label>
                </div>
              </div>
              <div class="btns">
                <button type="button" class="btn ok" data-act="runBulkFieldRename" title="比較先のフィールド定義を読み、結果をJSON欄に反映">プレフィックス追加/削除を実行</button>
                <button type="button" class="btn sub" data-act="runDetectUnusedFields" title="式・ビュー等から参照されていないフィールドを推定">影響のない（未使用）フィールドを検出</button>
              </div>
              <div id="u_bulkFieldResult" class="result" style="max-height:150px;margin-top:8px;display:none;padding:8px;font-size:11px"></div>
                </div>
              </details>
              </div>

              <input type="file" id="u_fieldJsonFile" accept=".json" style="display:none">
            </div>

            <div class="pane" data-pane="design">
              <div class="subpane active" data-subpane-parent="design" data-subpane="export">
              <div class="subpane-note">比較元アプリの設定を設計書として出力します。</div>
              <details class="diff-fold diff-fold--design-export" open>
                <summary class="diff-fold-summary">
                  <span class="diff-fold-title">設計書出力</span>
                  <span class="diff-fold-sub">Markdown / Excel 形式で出力</span>
                </summary>
                <div class="diff-fold-body">
              <div class="btns" style="margin-top:0">
                <button type="button" class="btn dark" data-act="exportDesignXlsx" title="表形式のExcel設計書を出力します">設計書Excel出力</button>
                <button type="button" class="btn sub" data-act="exportDesignMd" title="ドキュメント向けMarkdownファイル">設計書Markdown出力</button>
                <button type="button" class="btn sub" data-act="copyDesignMd" title="Markdownをクリップボードにコピー">Markdownコピー</button>
              </div>
                </div>
              </details>
              <details class="diff-fold diff-fold--design-diff">
                <summary class="diff-fold-summary">
                  <span class="diff-fold-title">設計書差分レポート</span>
                  <span class="diff-fold-sub">2アプリ間の設計書をMarkdownレベルで比較</span>
                </summary>
                <div class="diff-fold-body">
              <div class="muted" style="margin-top:0;line-height:1.6">比較元・比較先の設計書内容を比較し、差分をMarkdownレポートとして出力します。</div>
              <div class="btns" style="margin-top:8px">
                <button type="button" class="btn ok" data-act="exportDesignDiffMd" title="比較元・比較先の設計書MDを生成して差分をまとめます">設計書差分レポート出力</button>
              </div>
                </div>
              </details>
              </div>
            </div>

            <div class="pane" data-pane="jsconfig">
              <div class="subtabs">
                <button class="subtab active" data-subtab-parent="jsconfig" data-subtab="editor">設定編集</button>
                <button class="subtab" data-subtab-parent="jsconfig" data-subtab="batch">一括ダウンロード</button>
              </div>
              <div class="subpane active" data-subpane-parent="jsconfig" data-subpane="editor">
                <div class="subpane-note">単一アプリの JS/CSS 設定を取得・編集・反映します。</div>
              <details class="diff-fold diff-fold--jsconfig-edit" open>
                <summary class="diff-fold-summary">
                  <span class="diff-fold-title">JS/CSS設定の取得・編集・反映</span>
                  <span class="diff-fold-sub">/app/customize.json</span>
                </summary>
                <div class="diff-fold-body">
              <div class="step" style="margin-top:0">JS/CSS設定の取得・表示・反映</div>
              <div class="muted" style="margin-top:8px;line-height:1.6">比較元アプリIDの JS/CSS カスタマイズ設定（<code>/app/customize.json</code>）を取得・表示します。編集後に比較先(プレビュー)へ反映も可能です。</div>
              <div class="grid2" style="margin-top:8px">
                <label class="chip" title="プレビュー環境のカスタマイズ設定を読みます"><input type="checkbox" id="u_jsconfigPreview"> プレビュー版を取得</label>
                <label class="chip" title="PUT 後にデプロイAPIを続けて呼びます"><input type="checkbox" id="u_jsconfigDeployAfter"> 反映後にデプロイ</label>
              </div>
              <div class="btns">
                <button type="button" class="btn" data-act="fetchJsConfig" title="比較元アプリIDで customize.json を取得">JS/CSS設定を取得</button>
                <button type="button" class="btn sub" data-act="exportJsConfigJson">JSON出力</button>
                <button type="button" class="btn sub" data-act="importJsConfigJson">JSONファイル読込</button>
                <button type="button" class="btn warn" data-act="applyJsConfig" title="下のJSONを比較先プレビューへ">比較先(プレビュー)へ反映</button>
              </div>
              <div style="margin-top:8px">
                <label>JS/CSS設定JSON（編集可能）</label>
                <textarea id="u_jsconfigJson" style="min-height:140px" placeholder='{"desktop":{"js":[...],"css":[...]},"mobile":{"js":[...],"css":[...]}}' title="desktop / mobile の js・css 配列"></textarea>
              </div>
              <div class="result" id="u_jsconfigResult" style="max-height:300px;margin-top:8px"></div>
              <input type="file" id="u_jsconfigFile" accept=".json" style="display:none">
                </div>
              </details>
              </div>
              <div class="subpane" data-subpane-parent="jsconfig" data-subpane="batch">
                <div class="subpane-note">比較先のスペース配下にある複数アプリの JS/CSS をまとめて取得します。</div>
              <details class="diff-fold diff-fold--jsconfig-batch" open>
                <summary class="diff-fold-summary">
                  <span class="diff-fold-title">全アプリ JS/CSS 一括ZIP（比較先）</span>
                  <span class="diff-fold-sub">スペース内アプリを走査</span>
                </summary>
                <div class="diff-fold-body">
              <div class="step" style="margin-top:0">全アプリのJS/CSS一括ダウンロード（比較先）</div>
              <div class="muted" style="margin-top:8px;line-height:1.6">現在アクセスしているスペース（またはゲストスペース）内の全アプリをスキャンし、JS/CSSファイルの添付を一括でZIP化します。</div>
              <div class="btns" style="margin-top:10px">
                <button type="button" class="btn ok" data-act="runBatchJsConfigDownload" title="時間がかかる場合があります">全アプリのJS/CSSを一括ダウンロード（ZIP）</button>
              </div>
                </div>
              </details>
              </div>
            </div>

            <div class="pane" data-pane="recordMgr">
              <div class="subtabs">
                <button class="subtab active" data-subtab-parent="recordMgr" data-subtab="status">ステータス更新</button>
                <button class="subtab" data-subtab-parent="recordMgr" data-subtab="files">添付DL</button>
                <button class="subtab" data-subtab-parent="recordMgr" data-subtab="csv">CSV</button>
                <button class="subtab" data-subtab-parent="recordMgr" data-subtab="copy">アプリ間コピー</button>
              </div>
              <div class="subpane active" data-subpane-parent="recordMgr" data-subpane="status">
                <div class="subpane-note">一覧条件に合うレコードのプロセス管理を一括で進めます。</div>
              <details class="diff-fold diff-fold--rec-status" open>
                <summary class="diff-fold-summary">
                  <span class="diff-fold-title">ステータス一括更新（比較先）</span>
                  <span class="diff-fold-sub">一覧とアクションを指定してプロセス進行</span>
                </summary>
                <div class="diff-fold-body">
              <div class="step" style="margin-top:0">ステータス一括更新（比較先アプリ）</div>
              <div class="muted" style="margin-top:8px;line-height:1.55">一覧条件に合致する全レコードのプロセス管理ステータスを一括で進めます。</div>
              <div class="grid2" style="margin-top:8px">
                <div>
                  <label title="APIで一覧を取得して選ぶか、クエリ文字列を直接指定">対象一覧（一覧ID / クエリ）</label>
                  <div style="display:flex;gap:4px">
                    <input type="text" id="u_batchProcView" placeholder="一覧を選択 (APIから取得)" style="flex:1">
                    <button type="button" class="btn sm" data-act="loadViewsForProc">一覧取得</button>
                  </div>
                  <select id="u_batchProcViewSelect" style="display:none;margin-top:4px"></select>
                </div>
                <div>
                  <label title="プロセス管理で定義したアクション名">アクション名</label>
                  <input type="text" id="u_batchProcAction" placeholder="例: 承認, 差し戻し">
                </div>
                <div>
                  <label title="空欄可">次の処理者 (オプション)</label>
                  <input type="text" id="u_batchProcAssignee" placeholder="ログイン名">
                </div>
              </div>
              <div class="btns" style="margin-top:10px">
                <button type="button" class="btn ok" data-act="runBatchProcess" title="対象レコードすべてにアクションを適用">一括更新を実行</button>
              </div>
                </div>
              </details>
              </div>
              <div class="subpane" data-subpane-parent="recordMgr" data-subpane="files">
                <div class="subpane-note">一覧条件に合う添付ファイルをまとめて ZIP 取得します。</div>
              <details class="diff-fold diff-fold--rec-files" open>
                <summary class="diff-fold-summary">
                  <span class="diff-fold-title">添付ファイル一括ZIP（比較先）</span>
                  <span class="diff-fold-sub">一覧・ファイルフィールド・ZIP名</span>
                </summary>
                <div class="diff-fold-body">
              <div class="step" style="margin-top:0">添付ファイル一括DL（比較先アプリ）</div>
              <div class="muted" style="margin-top:8px;line-height:1.55">一覧条件に合致する全レコードの添付ファイルをZIP形式で一括ダウンロードします。</div>
              <div class="grid2" style="margin-top:8px">
                <div>
                  <label>対象一覧（一覧ID / クエリ）</label>
                  <div style="display:flex;gap:4px">
                    <input type="text" id="u_batchDlView" placeholder="一覧を選択 (APIから取得)" style="flex:1">
                    <button type="button" class="btn sm" data-act="loadViewsForDl">一覧取得</button>
                  </div>
                  <select id="u_batchDlViewSelect" style="display:none;margin-top:4px"></select>
                </div>
                <div>
                  <label title="添付ファイル型フィールドのフィールドコード">ファイルフィールドコード</label>
                  <input type="text" id="u_batchDlFileCode" value="添付ファイル">
                </div>
                <div>
                  <label title="ZIP内のサブフォルダ名に使うフィールド">フォルダ名フィールド</label>
                  <input type="text" id="u_batchDlFolderCode" placeholder="空ならレコード番号">
                </div>
                <div>
                  <label>ZIPファイル名</label>
                  <input type="text" id="u_batchDlZipName" value="download_files.zip">
                </div>
              </div>
              <div class="btns" style="margin-top:10px">
                <button type="button" class="btn ok" data-act="runBatchFileDownload">一括ダウンロードを実行</button>
              </div>
                </div>
              </details>
              </div>
              <div class="subpane" data-subpane-parent="recordMgr" data-subpane="csv">
                <div class="subpane-note">CSV のエクスポートとインポートを同じ場所にまとめています。</div>
              <details class="diff-fold diff-fold--rec-csv-exp" open>
                <summary class="diff-fold-summary">
                  <span class="diff-fold-title">CSVエクスポート（比較先）</span>
                  <span class="diff-fold-sub">一覧条件で全件出力</span>
                </summary>
                <div class="diff-fold-body">
              <div class="step" style="margin-top:0">レコードCSVエクスポート（比較先アプリ）</div>
              <div class="muted" style="margin-top:8px;line-height:1.55">一覧条件に合致する全レコードをCSV形式（UTF-8, BOM付き）でエクスポートします。</div>
              <div class="grid2" style="margin-top:8px">
                <div>
                  <label>対象一覧（一覧ID / クエリ）</label>
                  <div style="display:flex;gap:4px">
                    <input type="text" id="u_csvExportView" placeholder="一覧を選択 (APIから取得)" style="flex:1">
                    <button type="button" class="btn sm" data-act="loadViewsForCsv">一覧取得</button>
                  </div>
                  <select id="u_csvExportViewSelect" style="display:none;margin-top:4px"></select>
                </div>
                <div>
                  <label>CSVファイル名</label>
                  <input type="text" id="u_csvExportName" value="records.csv">
                </div>
              </div>
              <div class="btns" style="margin-top:10px">
                <button type="button" class="btn ok" data-act="runCsvExport">CSVエクスポートを実行</button>
              </div>
                </div>
              </details>
              <details class="diff-fold diff-fold--rec-csv-imp" open>
                <summary class="diff-fold-summary">
                  <span class="diff-fold-title">CSVインポート（比較先）</span>
                  <span class="diff-fold-sub">ヘッダ行にフィールドコード</span>
                </summary>
                <div class="diff-fold-body">
              <div class="step" style="margin-top:0">レコードCSVインポート（比較先アプリ）</div>
              <div class="muted" style="margin-top:8px;line-height:1.55">CSVファイルからレコードを一括登録します。1行目がフィールドコードのヘッダ行である必要があります。</div>
              <div class="grid2" style="margin-top:8px">
                <div style="display:flex;align-items:center">
                  <input type="file" id="u_csvImportFile" accept=".csv" style="display:none" onchange="document.getElementById('u_csvImportFileName').textContent=this.files[0]?this.files[0].name:'未選択'">
                  <button type="button" class="btn sm" onclick="document.getElementById('u_csvImportFile').click()">CSVファイルを選択</button>
                  <span id="u_csvImportFileName" class="muted" style="margin-left:8px;font-size:12px">未選択</span>
                </div>
              </div>
              <div class="btns" style="margin-top:10px">
                <button type="button" class="btn warn" data-act="runCsvImport" title="既存レコードの更新ルールはAPI仕様に従います">CSVから一括登録を実行</button>
              </div>
                </div>
              </details>
              </div>
              <div class="subpane" data-subpane-parent="recordMgr" data-subpane="copy">
                <div class="subpane-note">比較元アプリのレコードを比較先へまとめて複製します。</div>
              <details class="diff-fold diff-fold--rec-copy" open>
                <summary class="diff-fold-summary">
                  <span class="diff-fold-title">アプリ間レコードコピー（比較元→比較先）</span>
                  <span class="diff-fold-sub">型不一致・添付は注意</span>
                </summary>
                <div class="diff-fold-body">
              <div class="step" style="margin-top:0">アプリ間レコード一括コピー（比較元 → 比較先）</div>
              <div class="muted" style="margin-top:8px;line-height:1.6">比較元アプリのレコードを取得し、比較先アプリへそのままコピーします。※フィールドコードや型が一致する項目のみ正常に転送されます。<br>ルックアップ項目やプロセス管理、添付ファイル等は正しくコピーできない場合があります。</div>
              <div class="grid2" style="margin-top:8px">
                <div>
                  <label title="kintone レコード取得APIの query に相当">コピー対象（比較元）のクエリ</label>
                  <input type="text" id="u_recordCopyQuery" placeholder="例: order by $id asc" value="order by $id asc">
                </div>
              </div>
              <div class="btns" style="margin-top:10px">
                <button type="button" class="btn warn" data-act="runRecordCopy" title="大量レコードは時間とAPI制限に注意">比較先へレコードをコピー</button>
              </div>
                </div>
              </details>
              </div>
            </div>

            
            <div class="pane" data-pane="er">
              <div class="subtabs">
                <button class="subtab active" data-subtab-parent="er" data-subtab="diagram">ER図</button>
                <button class="subtab" data-subtab-parent="er" data-subtab="dependency">依存関係</button>
              </div>
              <div class="subpane active" data-subpane-parent="er" data-subpane="diagram">
                <div class="subpane-note">比較元アプリ起点で関連アプリをたどり、ER 図を生成します。</div>
              <details class="diff-fold diff-fold--er-diag" open>
                <summary class="diff-fold-summary">
                  <span class="diff-fold-title">ER図のオプションと生成</span>
                  <span class="diff-fold-sub">レイアウト・深さ・別タブ表示</span>
                </summary>
                <div class="diff-fold-body">
              <div class="step" style="margin-top:0">ER図自動生成（比較元アプリ起点）</div>
              <div class="muted" style="margin-top:8px;line-height:1.55">比較元アプリからルックアップと関連レコードを辿って、関連するアプリのスキーマ（ER図）を自動取得・描画します。</div>
              <div class="grid2" style="margin-top:10px">
                <div>
                  <label title="Cytoscape のレイアウトアルゴリズム">初期レイアウト</label>
                  <select id="u_erLayout" title="グラフの並べ方">
                    <option value="dagre">Dagre（推奨）</option>
                    <option value="breadthfirst">ツリー</option>
                    <option value="cose">フォース</option>
                    <option value="concentric">同心円</option>
                    <option value="grid">グリッド</option>
                    <option value="circle">円形</option>
                  </select>
                </div>
                <div>
                  <label title="フィールド表示の粒度">表示密度</label>
                  <select id="u_erFieldDensity">
                    <option value="compact">簡易</option>
                    <option value="standard" selected>標準</option>
                    <option value="full">詳細</option>
                  </select>
                </div>
                <div>
                  <label title="0 は無制限に近い挙動（実装上の上限あり）">探索深さ</label>
                  <input type="text" id="u_erMaxDepth" value="0" placeholder="0で無制限">
                </div>
                <div>
                  <label title="カンマ区切りで複数指定">追加の起点アプリID（任意）</label>
                  <input type="text" id="u_erExtraApps" value="" placeholder="例: 123, 456, 789">
                </div>
                <div>
                  <label>追加オプション</label>
                  <div class="chips" style="margin-top:4px">
                    <label class="chip" title="サブテーブル内フィールドもERに含めます"><input type="checkbox" id="u_erIncludeSubtable" checked> サブテーブル項目を含める</label>
                    <label class="chip" title="参照先だけでなく、現在アプリを参照しているアプリも探索します（全アプリを走査）"><input type="checkbox" id="u_erIncludeReverseLookup"> 逆引き探索を有効化</label>
                  </div>
                </div>
              </div>
              <div class="btns" style="margin-top:10px">
                <button type="button" class="btn" data-act="generateERDiagram" title="新しいタブでインタラクティブなERを開きます">ER図を生成 (別タブ表示)</button>
                <button type="button" class="btn sub" data-act="exportERDiagramHtml" title="単体HTMLファイルとして保存">ER図HTML保存</button>
              </div>
                </div>
              </details>
              </div>
              <div class="subpane" data-subpane-parent="er" data-subpane="dependency">
                <div class="subpane-note">フィールド参照や依存関係をネットワーク図として可視化します。</div>
              <details class="diff-fold diff-fold--er-dep" open>
                <summary class="diff-fold-summary">
                  <span class="diff-fold-title">フィールド依存関係マップ</span>
                  <span class="diff-fold-sub">式・書式・プロセスなどの参照を可視化</span>
                </summary>
                <div class="diff-fold-body">
              <div class="step" style="margin-top:0">フィールド依存関係マップ（比較元アプリ）</div>
              <div class="muted" style="margin-top:8px;line-height:1.55">計算式や条件付書式、プロセス管理など、フィールド間の参照・依存関係をネットワーク図として可視化します。</div>
              <div class="btns" style="margin-top:10px">
                <button type="button" class="btn" data-act="generateFieldDepMap" title="別タブでネットワーク図を表示">依存関係マップを生成 (別タブ表示)</button>
              </div>
                </div>
              </details>
              </div>
            </div>

            
            <div class="pane" data-pane="sql">
              <details class="diff-fold diff-fold--sql" open>
                <summary class="diff-fold-summary">
                  <span class="diff-fold-title">kintone SQL（比較元ベース）</span>
                  <span class="diff-fold-sub">Alasql でレコードにSQLライクにアクセス</span>
                </summary>
                <div class="diff-fold-body">
              <div class="step" style="margin-top:0">kintone SQL 実行（比較元アプリベース）</div>
              <div class="muted" style="margin-top:8px;line-height:1.55">Alasqlを用いて、Kintone上でSQLライクにデータアクセス・集計を行います。</div>
              <div class="btns" style="margin-top:10px">
                <button type="button" class="btn ok" data-act="launchKintoneSql" title="別UIのSQLエディタを開きます">SQLエディタを開く</button>
              </div>
                </div>
              </details>
            </div>

            <div class="pane" data-pane="apiTester">
              <details class="diff-fold diff-fold--api" open>
                <summary class="diff-fold-summary">
                  <span class="diff-fold-title">kintone API テスター</span>
                  <span class="diff-fold-sub">kintone.api を直接呼び出し</span>
                </summary>
                <div class="diff-fold-body">
              <div class="step" style="margin-top:0">リクエストの組み立てと実行</div>
              <div class="muted" style="margin-top:8px;line-height:1.55">指定したエンドポイントに対して kintone.api を直接実行し、レスポンスを確認します。※ゲストスペースIDを指定すると <code>/k/guest/{id}/v1/...</code> 等が使われます。</div>
              <div style="display:flex;gap:16px;margin-top:8px;">
                <div style="flex:5;min-width:0;">
                  <div class="grid2">
                    <div>
                      <label>メソッド</label>
                      <select id="u_apiTesterMethod" title="HTTP メソッド">
                        <option value="GET" selected>GET</option>
                        <option value="POST">POST</option>
                        <option value="PUT">PUT</option>
                        <option value="DELETE">DELETE</option>
                      </select>
                    </div>
                    <div>
                      <label title="相対パスまたは完全URL">エンドポイント（パス または URL）</label>
                      <input type="text" id="u_apiTesterPath" placeholder="例: /k/v1/record.json または /app/settings">
                    </div>
                  </div>
                  <div style="margin-top:8px">
                    <label title="GET のときは無視されることがあります">リクエストBody (JSONフォーマット)</label>
                    <textarea id="u_apiTesterBody" style="min-height:100px;font-family:monospace" placeholder='{"app": 1, "id": 100}'></textarea>
                  </div>
                  <div class="btns" style="margin-top:10px;display:flex;">
                    <button type="button" class="btn warn" data-act="runApiTester" title="本番データの変更に注意">APIを実行</button>
                    <button type="button" class="btn sub" data-act="clearApiTesterHistory" style="margin-left:auto;">履歴クリア</button>
                  </div>
                  <div class="result" id="u_apiTesterResult" style="max-height:300px;margin-top:8px;overflow:auto">実行結果がここに表示されます</div>
                </div>
                <div style="flex:2;max-width:280px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:10px;display:flex;flex-direction:column;">
                  <div style="font-size:12px;font-weight:800;color:#334155;margin-bottom:8px;">⏱️ 最近の実行履歴</div>
                  <div id="u_apiTesterHistoryList" style="flex:1;overflow-y:auto;display:flex;flex-direction:column;gap:6px;">
                    <div style="color:#94a3b8;font-size:11px;font-style:italic;padding:8px;">履歴はありません</div>
                  </div>
                </div>
              </div>
                </div>
              </details>
            </div>

            <div class="pane" data-pane="processFlow">
              <details class="diff-fold diff-fold--proc-main" open>
                <summary class="diff-fold-summary">
                  <span class="diff-fold-title">プロセス管理フロー図（Mermaid）</span>
                  <span class="diff-fold-sub">比較元アプリの status.json から生成</span>
                </summary>
                <div class="diff-fold-body">
              <div class="step" style="margin-top:0">プロセス管理の可視化（比較元アプリ）</div>
              <div class="muted" style="margin-top:8px;line-height:1.55">比較元アプリのプロセス管理設定からフロー図（Mermaid）を生成し表示します。</div>
              <div class="btns">
                <button type="button" class="btn" data-act="renderProcessFlow" title="下にMermaidソースとプレビューを表示">フロー図を取得・描画</button>
              </div>
              <div class="grid2" style="margin-top:8px">
                <div>
                  <label>Mermaid構文</label>
                  <textarea id="u_mermaidText" style="min-height:200px" readonly title="生成結果（読み取り専用）"></textarea>
                </div>
                <div>
                  <label>フロー図プレビュー</label>
                  <div id="u_mermaidView" style="min-height:200px;border:1px solid #cbd5e1;border-radius:7px;background:#fff;padding:10px;overflow:auto"></div>
                </div>
              </div>
                </div>
              </details>

              <div id="u_simContainer" style="display:none;margin-top:20px">
              <details class="diff-fold diff-fold--proc-sim" open>
                <summary class="diff-fold-summary">
                  <span class="diff-fold-title">フローシミュレーション（動作テスト）</span>
                  <span class="diff-fold-sub">フロー図取得後に利用できます</span>
                </summary>
                <div class="diff-fold-body">
                <div class="muted" style="margin-top:0;line-height:1.55">現在のプロセス管理の設定をもとに、擬似的にステータスを進行させてテストします。（上図にハイライト表示されます）</div>
                <div class="grid2" style="margin-top:8px; align-items:flex-end;">
                  <div>
                    <label>現在ステータス</label>
                    <div id="u_simCurrentStatus" style="padding:5px 12px;background:#e2e8f0;border-radius:4px;font-weight:bold;text-align:center;color:#0f172a;min-height:30px;box-sizing:border-box">未開始</div>
                  </div>
                  <div>
                    <label>アクション実行</label>
                    <div style="display:flex;gap:4px">
                      <select id="u_simActionSelect" style="flex:1" disabled title="利用可能なアクションが入ります"><option value="">-- 開始してください --</option></select>
                      <button type="button" class="btn ok" data-act="simExecuteAction">実行</button>
                      <button type="button" class="btn sub" data-act="simStart">最初から</button>
                    </div>
                  </div>
                </div>
                </div>
              </details>
              </div>
            </div>

            <div class="pane" data-pane="settingsExport">
              <div class="subtabs">
                <button class="subtab active" data-subtab-parent="settingsExport" data-subtab="export">一括取得</button>
                <button class="subtab" data-subtab-parent="settingsExport" data-subtab="template">テンプレート</button>
              </div>
              <div class="subpane active" data-subpane-parent="settingsExport" data-subpane="export">
                <div class="subpane-note">複数アプリの設定をまとめて取得して JSON / ZIP で出力します。セクション一覧は折りたたみ可能です。</div>
              <details class="diff-fold diff-fold--settings-apps" open>
                <summary class="diff-fold-summary">
                  <span class="diff-fold-title">対象アプリ・ゲスト・プレビュー</span>
                  <span class="diff-fold-sub">IDリストの編集とアプリ検索</span>
                </summary>
                <div class="diff-fold-body">
              <div class="muted" style="margin-top:0;line-height:1.6">複数アプリの設定をまとめて取得し、JSONまたはZIPで出力します（JS/CSS設定は「JS/CSS設定」タブで取得）。</div>
              <div class="grid2" style="margin-top:8px">
                <div>
                  <label title="取得するアプリの数値IDを列挙">対象アプリID（カンマ/改行区切り）</label>
                  <textarea id="u_settingsExportAppIds" style="min-height:88px" placeholder="74, 120, 305" title="カンマ・改行・スペース区切りで複数指定"></textarea>
                  <div class="inline" style="margin-top:8px">
                    <input type="text" id="u_settingsExportSearchKeyword" placeholder="アプリ名で検索" style="flex:1" title="スペース内のアプリを名前で検索し結果からIDを選べます">
                    <button type="button" class="btn sub" data-act="settingsExportSearchApps">検索</button>
                  </div>
                  <div class="result" id="u_settingsExportSearchResult" style="max-height:140px;margin-top:6px"></div>
                </div>
                <div>
                  <label title="ゲストスペース利用時は共通のゲストID">ゲストID（任意 / 全アプリ共通）</label>
                  <input type="text" id="u_settingsExportGuest" placeholder="空で通常空間" title="空欄で通常スペース">
                  <label class="chip" style="margin-top:8px" title="プレビュー環境の設定JSONを取得します"><input type="checkbox" id="u_settingsExportPreview"> プレビュー設定を取得</label>
                  <div class="btns" style="margin-top:8px">
                    <button type="button" class="btn sub" data-act="settingsExportUseCurrent" title="今開いているアプリIDをリストに追記">現在のAppを追加</button>
                    <button type="button" class="btn sub" data-act="settingsExportUseSource" title="共通設定の比較元アプリIDを追記">比較元を追加</button>
                    <button type="button" class="btn sub" data-act="settingsExportUseTarget" title="共通設定の比較先アプリIDを追記">比較先を追加</button>
                  </div>
                </div>
              </div>
                </div>
              </details>
              <details class="diff-fold diff-fold--settings-scopes">
                <summary class="diff-fold-summary">
                  <span class="diff-fold-title">取得対象セクション</span>
                  <span class="diff-fold-sub">チェックしたAPI設定だけ取得（初期は閉じるとすっきり）</span>
                </summary>
                <div class="diff-fold-body">
                <div class="btns" style="margin-top:0">
                  <button type="button" class="btn sub" data-act="settingsExportScopeAll" title="全セクションをオン">全選択</button>
                  <button type="button" class="btn sub" data-act="settingsExportScopeNone" title="すべてオフ">全解除</button>
                </div>
                <div class="chips diff-scope-chips" id="u_settingsExportScopes"></div>
                </div>
              </details>
              <div class="btns" style="margin-top:10px">
                <button type="button" class="btn" data-act="runSettingsExportJson" title="1ファイルのJSONにまとめて保存">JSON出力</button>
                <button type="button" class="btn dark" data-act="runSettingsExportZip" title="アプリごとに分割してZIP">ZIP出力</button>
              </div>
              <div class="result" id="u_settingsExportResult" style="max-height:220px;margin-top:8px"></div>
              </div>
              <div class="subpane" data-subpane-parent="settingsExport" data-subpane="template">
                <div class="subpane-note">比較元アプリの設定をローカル保存して再利用します。</div>
              <details class="diff-fold diff-fold--settings-tpl" open>
                <summary class="diff-fold-summary">
                  <span class="diff-fold-title">設定テンプレート（ブラウザ保存）</span>
                  <span class="diff-fold-sub">比較元の全設定を名前付きで保存・復元</span>
                </summary>
                <div class="diff-fold-body">
              <div class="step" style="margin-top:0;font-size:12px;margin-bottom:6px">設定テンプレート管理（保存・再利用）</div>
              <div class="muted" style="margin-bottom:8px;line-height:1.6">現在の比較元アプリの全設定を「テンプレート」としてブラウザに保存します。後で呼び出して「設定ファイル読込」として再利用できます。<br>標準アプリ構成を保存する際に便利です。</div>
              <div class="grid2" style="margin-bottom:6px">
                <div>
                  <label>保存済みデータ一覧</label>
                  <div style="display:flex;gap:4px">
                    <select id="u_templateSelect" style="flex:1" title="localStorage に保存したテンプレート"><option value="">-- 保存済なし --</option></select>
                    <button type="button" class="btn ok" data-act="loadTemplate" title="比較元バンドルとして読み込み">設定復元</button>
                    <button type="button" class="btn sub" data-act="deleteTemplate">削除</button>
                  </div>
                </div>
                <div>
                  <label>新規保存名</label>
                  <div style="display:flex;gap:4px">
                    <input type="text" id="u_templateSaveName" placeholder="例: 顧客管理_標準v1" style="flex:1">
                    <button type="button" class="btn sub" data-act="saveTemplate" title="現在の比較元設定を保存">比較元を保存データに</button>
                  </div>
                </div>
              </div>
                </div>
              </details>
              </div>
            </div>
          </div>

          <div class="status-row status-bar" id="u_statusBar" role="status" aria-live="polite" aria-relevant="text">
            <div class="status status--neutral" id="u_status">待機中</div>
            <button type="button" class="btn sub status-copy-btn" data-act="copyStatusMessage" title="ステータス行の内容をコピー（エラー時はスタックトレース付き）">コピー</button>
          </div>

          <div class="card result-card">
            <div class="result-card-head">
              <span class="result-card-mark" aria-hidden="true"></span>
              <div>
                <div class="result-card-title">結果</div>
                <div class="result-card-sub">開いているタブに応じたログやプレビュー。差分の詳細テーブルは差分比較の「結果整理」サブタブ時のみ表示されます。</div>
              </div>
            </div>
            <div class="result" id="u_result"></div>
          </div>
        </div>
        <div class="busy-overlay" id="u_busyOverlay">
          <div class="busy-chip">
            <span class="busy-spinner"></span>
            <span id="u_busyText">処理中...</span>
          </div>
        </div>
        <div class="tour-overlay" id="u_tourOverlay">
          <div class="tour-backdrop" data-act="tourClose"></div>
          <div class="tour-spotlight" id="u_tourSpotlight" style="display:none"></div>
          <div class="tour-card" id="u_tourCard">
            <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px">
              <div>
                <div class="tour-step" id="u_tourStepLabel">基本フロー 1 / 1</div>
                <div class="tour-title" id="u_tourTitle">操作ガイド</div>
              </div>
              <button class="tour-close" data-act="tourClose" title="閉じる">×</button>
            </div>
            <div class="tour-body" id="u_tourBody"></div>
            <div class="tour-progress"><span id="u_tourProgress"></span></div>
            <div class="tour-actions">
              <div class="muted" id="u_tourHint">対象箇所を順番に案内します</div>
              <div class="tour-nav">
                <button class="btn sub" data-act="tourPrev" id="u_tourPrev">戻る</button>
                <button class="btn ok" data-act="tourNext" id="u_tourNext">次へ</button>
              </div>
            </div>
          </div>
        </div>
      `;
    return root2;
  }
  function copyTextToClipboard(text) {
    const raw = String(text ?? "");
    if (navigator.clipboard?.writeText) {
      return navigator.clipboard.writeText(raw).then(() => true).catch(() => false);
    }
    return new Promise((resolve) => {
      try {
        const doc = getToolDocument();
        const ta = doc.createElement("textarea");
        ta.value = raw;
        ta.style.position = "fixed";
        ta.style.left = "-9999px";
        doc.body.appendChild(ta);
        ta.select();
        const ok = doc.execCommand("copy");
        doc.body.removeChild(ta);
        resolve(ok);
      } catch (e) {
        resolve(false);
      }
    });
  }

  // src/boot.js
  init_dialog();
  init_components();
  init_export();
  init_diff();
  init_field();
  init_rowMode();
  init_apply();
  init_reflect();
  init_helpers();
  init_plan();

  // src/ui/tour.js
  init_constants();
  init_state();
  init_utils();
  init_dialog();
  init_components();
  var guidedTourLayoutRaf = 0;
  function switchSubTab2(parentKey, subKey, options = {}) {
    if (!parentKey) return;
    const tabs = ui.subTabs.filter((tab) => tab.dataset.subtabParent === parentKey);
    const panes = ui.subPanes.filter((pane) => pane.dataset.subpaneParent === parentKey);
    if (!tabs.length || !panes.length) return;
    const fallback = state.activeSubTabs[parentKey] || tabs[0]?.dataset.subtab || "";
    const key = tabs.some((tab) => tab.dataset.subtab === subKey) ? subKey : fallback;
    state.activeSubTabs[parentKey] = key;
    tabs.forEach((tab) => tab.classList.toggle("active", tab.dataset.subtab === key));
    panes.forEach((pane) => pane.classList.toggle("active", pane.dataset.subpane === key));
    if (state.guidedTourActive) scheduleGuidedTourLayout();
    if (options.persist !== false) saveCurrentDialogState();
  }
  function getGuidedTourStep(index) {
    if (!GUIDED_TOUR_STEPS.length) return null;
    const bounded = Math.max(0, Math.min(GUIDED_TOUR_STEPS.length - 1, Number(index) || 0));
    return GUIDED_TOUR_STEPS[bounded] || null;
  }
  function getGuidedTourTarget(step) {
    if (!step?.selector) return null;
    const root2 = getRoot();
    return root2.querySelector(step.selector);
  }
  function scheduleGuidedTourLayout() {
    if (!state.guidedTourActive) return;
    if (guidedTourLayoutRaf) window.cancelAnimationFrame(guidedTourLayoutRaf);
    guidedTourLayoutRaf = window.requestAnimationFrame(() => {
      guidedTourLayoutRaf = 0;
      updateGuidedTourLayout();
    });
  }
  function updateGuidedTourLayout() {
    const root2 = getRoot();
    if (!state.guidedTourActive || !ui.tourOverlay || !ui.tourCard || !ui.tourSpotlight) return;
    const step = getGuidedTourStep(state.guidedTourIndex);
    const target = getGuidedTourTarget(step);
    const rootRect = root2.getBoundingClientRect();
    const overlayWidth = root2.clientWidth || Math.round(rootRect.width || 0);
    const overlayHeight = root2.clientHeight || Math.round(rootRect.height || 0);
    const margin = 12;
    if (!target) {
      ui.tourSpotlight.style.display = "none";
      const cardWidth2 = ui.tourCard.offsetWidth || 340;
      const cardHeight2 = ui.tourCard.offsetHeight || 220;
      ui.tourCard.style.left = `${Math.max(margin, Math.round((overlayWidth - cardWidth2) / 2))}px`;
      ui.tourCard.style.top = `${Math.max(margin, Math.round((overlayHeight - cardHeight2) / 2))}px`;
      return;
    }
    const rect = target.getBoundingClientRect();
    const rel = {
      left: rect.left - rootRect.left,
      top: rect.top - rootRect.top,
      width: rect.width,
      height: rect.height,
      right: rect.right - rootRect.left,
      bottom: rect.bottom - rootRect.top
    };
    const pad = 10;
    const spotLeft = Math.max(8, rel.left - pad);
    const spotTop = Math.max(8, rel.top - pad);
    const spotWidth = Math.max(48, Math.min(overlayWidth - spotLeft - 8, rel.width + pad * 2));
    const spotHeight = Math.max(40, Math.min(overlayHeight - spotTop - 8, rel.height + pad * 2));
    ui.tourSpotlight.style.display = "block";
    ui.tourSpotlight.style.left = `${Math.round(spotLeft)}px`;
    ui.tourSpotlight.style.top = `${Math.round(spotTop)}px`;
    ui.tourSpotlight.style.width = `${Math.round(spotWidth)}px`;
    ui.tourSpotlight.style.height = `${Math.round(spotHeight)}px`;
    const cardWidth = ui.tourCard.offsetWidth || 340;
    const cardHeight = ui.tourCard.offsetHeight || 220;
    let cardLeft = Math.round(Math.min(Math.max(margin, spotLeft), overlayWidth - cardWidth - margin));
    let cardTop = Math.round(spotTop + spotHeight + 16);
    if (cardTop + cardHeight > overlayHeight - margin) {
      cardTop = Math.round(spotTop - cardHeight - 16);
    }
    if (cardTop < margin) {
      cardTop = Math.round(Math.min(overlayHeight - cardHeight - margin, spotTop + 12));
    }
    if (cardTop < margin) cardTop = margin;
    ui.tourCard.style.left = `${cardLeft}px`;
    ui.tourCard.style.top = `${cardTop}px`;
  }
  function renderGuidedTourStep(options = {}) {
    if (!ui.tourOverlay || !ui.tourCard) return;
    const step = getGuidedTourStep(state.guidedTourIndex);
    if (!step) return;
    if (step.tab) switchTab(step.tab, { persist: false });
    if (step.tab && step.subTab) switchSubTab2(step.tab, step.subTab, { persist: false });
    const total = GUIDED_TOUR_STEPS.length;
    ui.tourOverlay.classList.add("active");
    ui.tourStepLabel.textContent = `基本フロー ${state.guidedTourIndex + 1} / ${total}`;
    ui.tourTitle.textContent = step.title || `ステップ ${state.guidedTourIndex + 1}`;
    ui.tourBody.textContent = step.body || "";
    ui.tourHint.textContent = step.path || "対象箇所を順番に案内します";
    ui.tourPrev.disabled = state.guidedTourIndex <= 0;
    ui.tourNext.textContent = state.guidedTourIndex >= total - 1 ? "完了" : "次へ";
    ui.tourProgress.style.width = `${Math.round((state.guidedTourIndex + 1) / total * 100)}%`;
    const target = getGuidedTourTarget(step);
    if (target && typeof target.scrollIntoView === "function" && options.scroll !== false) {
      target.scrollIntoView({ block: "center", inline: "nearest" });
    }
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        scheduleGuidedTourLayout();
        ui.tourNext?.focus();
      });
    });
  }
  function openGuidedTour(index = 0) {
    if (!GUIDED_TOUR_STEPS.length || !ui.tourOverlay) return;
    state.guidedTourActive = true;
    state.guidedTourIndex = Math.max(0, Math.min(GUIDED_TOUR_STEPS.length - 1, Number(index) || 0));
    renderGuidedTourStep();
    setStatus("操作ガイドを開始しました。順番に確認してください。");
  }
  function closeGuidedTour(options = {}) {
    state.guidedTourActive = false;
    if (guidedTourLayoutRaf) {
      window.cancelAnimationFrame(guidedTourLayoutRaf);
      guidedTourLayoutRaf = 0;
    }
    ui.tourOverlay?.classList.remove("active");
    if (ui.tourSpotlight) ui.tourSpotlight.style.display = "none";
    if (options.silent !== true) setStatus("操作ガイドを閉じました。");
  }
  function moveGuidedTour(delta) {
    if (!state.guidedTourActive) return;
    const nextIndex = state.guidedTourIndex + delta;
    if (nextIndex < 0) return;
    if (nextIndex >= GUIDED_TOUR_STEPS.length) {
      closeGuidedTour({ silent: true });
      setStatus("操作ガイドを完了しました。必要なら再度ヘッダーの「操作ガイド」から開けます。");
      return;
    }
    state.guidedTourIndex = nextIndex;
    renderGuidedTourStep();
  }

  // src/handlers.js
  init_constants();
  init_state();
  init_utils();
  init_api();
  init_engine();
  init_filter();
  init_export();

  // src/diff/presets.js
  init_state();
  init_export();
  function syncFilterStateFromUi() {
    state.diffFilterSection = ui.diffFilterSection?.value || "";
    state.diffFilterType = ui.diffFilterType?.value || "";
    state.diffFilterSeverity = ui.diffFilterSeverity?.value || "";
  }
  function applyDiffUiPreset(presetId) {
    if (!ui.diffFilterSection) return;
    const id = String(presetId || "");
    switch (id) {
      case "reset":
        ui.diffFilterSection.value = "";
        ui.diffFilterType.value = "";
        ui.diffFilterSeverity.value = "";
        state.diffExcludeSections = null;
        break;
      case "severity_high":
        ui.diffFilterSeverity.value = "high";
        break;
      case "type_added":
        ui.diffFilterType.value = "added";
        break;
      case "type_removed":
        ui.diffFilterType.value = "removed";
        break;
      case "type_changed":
        ui.diffFilterType.value = "changed";
        break;
      case "sec_field":
        ui.diffFilterSection.value = "fieldSettings";
        state.diffExcludeSections = null;
        break;
      case "sec_layout":
        ui.diffFilterSection.value = "layoutSettings";
        state.diffExcludeSections = null;
        break;
      case "sec_view":
        ui.diffFilterSection.value = "viewSettings";
        state.diffExcludeSections = null;
        break;
      case "sec_process":
        ui.diffFilterSection.value = "processSettings";
        state.diffExcludeSections = null;
        break;
      case "no_acl":
        ui.diffFilterSection.value = "";
        state.diffExcludeSections = ["appAcl", "fieldAcl", "recordPermissions"];
        break;
      default:
        return;
    }
    syncFilterStateFromUi();
    renderDiffFilterOptions();
    renderResultRows(state.lastDiffRows || []);
  }
  function applyDiffSectionNav(sectionKey) {
    if (!ui.diffFilterSection) return;
    ui.diffFilterSection.value = sectionKey || "";
    syncFilterStateFromUi();
    renderResultRows(state.lastDiffRows || []);
  }

  // src/diff/selection-sets.js
  init_constants();
  init_state();
  init_diff();
  init_export();
  var MAX_SETS = 24;
  function loadRaw() {
    try {
      const raw = JSON.parse(localStorage.getItem(DIFF_SELECTION_SETS_KEY) || "[]");
      return Array.isArray(raw) ? raw : [];
    } catch {
      return [];
    }
  }
  function saveRaw(list) {
    try {
      localStorage.setItem(DIFF_SELECTION_SETS_KEY, JSON.stringify(list.slice(0, MAX_SETS)));
    } catch {
    }
  }
  function refreshDiffSelectionSetDropdown() {
    const sel = ui.diffSelectionSetSelect;
    if (!sel) return;
    const sets = loadRaw();
    const cur = sel.value;
    const curSig = currentDiffSignature();
    sel.innerHTML = '<option value="">-- 読込 --</option>' + sets.map((s) => {
      const bad = s.signature && s.signature !== curSig;
      return `<option value="${escapeAttr(s.name)}">${escapeAttr(s.name)}${bad ? " (条件不一致)" : ""}</option>`;
    }).join("");
    if (sets.some((s) => s.name === cur)) sel.value = cur;
  }
  function escapeAttr(s) {
    return String(s || "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
  }
  function saveDiffSelectionSet(name) {
    const n = String(name || "").trim();
    if (!n) throw new Error("セット名を入力してください");
    const sig = currentDiffSignature();
    const ids = [...state.diffSelectedIds || []];
    const list = loadRaw().filter((x) => x.name !== n);
    list.unshift({
      name: n,
      signature: sig,
      ids,
      savedAt: Date.now()
    });
    saveRaw(list);
    refreshDiffSelectionSetDropdown();
    if (ui.diffSelectionSetSelect) ui.diffSelectionSetSelect.value = n;
  }
  function loadDiffSelectionSet(name) {
    const n = String(name || "").trim();
    if (!n) return false;
    const row = loadRaw().find((x) => x.name === n);
    if (!row || !Array.isArray(row.ids)) return false;
    const curSig = currentDiffSignature();
    const mismatch = row.signature && row.signature !== curSig;
    state.diffSelectedIds = new Set(row.ids.filter((id) => (state.lastDiffRows || []).some((r) => r._id === id)));
    renderResultRows(state.lastDiffRows || []);
    return { ok: true, mismatch, restored: state.diffSelectedIds.size, requested: row.ids.length };
  }
  function deleteDiffSelectionSet(name) {
    const n = String(name || "").trim();
    if (!n) return;
    saveRaw(loadRaw().filter((x) => x.name !== n));
    refreshDiffSelectionSetDropdown();
  }

  // src/handlers.js
  init_popout();
  init_components();
  init_dialog();
  init_diff();

  // src/tabs/reflect-preview-playground.js
  init_utils();
  var SAMPLE_BEFORE = {
    "文字列__1行_": { type: "SINGLE_LINE_TEXT", code: "文字列__1行_", label: "会社名", noLabel: false, required: true, unique: false, maxLength: "64", minLength: "", defaultValue: "", expression: "", hideExpression: false },
    "数値": { type: "NUMBER", code: "数値", label: "金額", noLabel: false, required: false, unique: false, maxValue: "", minValue: "", defaultValue: "0", digit: true, unit: "¥", unitPosition: "BEFORE" },
    "ドロップダウン": { type: "DROP_DOWN", code: "ドロップダウン", label: "ステータス", noLabel: false, required: true, defaultValue: "未着手", options: { "未着手": { label: "未着手", index: 0 }, "進行中": { label: "進行中", index: 1 }, "完了": { label: "完了", index: 2 } } },
    "日付": { type: "DATE", code: "日付", label: "登録日", noLabel: false, required: false, unique: false, defaultValue: "", defaultNowValue: true },
    "リッチエディター": { type: "RICH_TEXT", code: "リッチエディター", label: "備考", noLabel: false, required: false, defaultValue: "" }
  };
  var SAMPLE_AFTER = {
    "文字列__1行_": { type: "SINGLE_LINE_TEXT", code: "文字列__1行_", label: "会社名（正式名称）", noLabel: false, required: true, unique: true, maxLength: "128", minLength: "1", defaultValue: "", expression: "", hideExpression: false },
    "数値": { type: "NUMBER", code: "数値", label: "金額", noLabel: false, required: true, unique: false, maxValue: "9999999", minValue: "0", defaultValue: "0", digit: true, unit: "円", unitPosition: "BEFORE" },
    "ドロップダウン": { type: "DROP_DOWN", code: "ドロップダウン", label: "ステータス", noLabel: false, required: true, defaultValue: "未着手", options: { "未着手": { label: "未着手", index: 0 }, "進行中": { label: "進行中", index: 1 }, "レビュー中": { label: "レビュー中", index: 2 }, "完了": { label: "完了", index: 3 } } },
    "日付": { type: "DATE", code: "日付", label: "登録日", noLabel: false, required: true, unique: false, defaultValue: "", defaultNowValue: true },
    "担当者": { type: "USER_SELECT", code: "担当者", label: "担当者", noLabel: false, required: true, defaultValue: [], entities: [] }
  };
  var STATUS_LABELS = { added: "追加", removed: "削除", modified: "変更", unchanged: "変更なし" };
  var FIELD_TYPES = [
    { value: "SINGLE_LINE_TEXT", label: "文字列(1行)" },
    { value: "MULTI_LINE_TEXT", label: "文字列(複数行)" },
    { value: "RICH_TEXT", label: "リッチエディター" },
    { value: "NUMBER", label: "数値" },
    { value: "CHECK_BOX", label: "チェックボックス" },
    { value: "RADIO_BUTTON", label: "ラジオボタン" },
    { value: "DROP_DOWN", label: "ドロップダウン" },
    { value: "MULTI_SELECT", label: "複数選択" },
    { value: "DATE", label: "日付" },
    { value: "TIME", label: "時刻" },
    { value: "DATETIME", label: "日時" },
    { value: "LINK", label: "リンク" },
    { value: "USER_SELECT", label: "ユーザー選択" },
    { value: "FILE", label: "添付ファイル" }
  ];
  var DEFAULT_PROPS = {
    SINGLE_LINE_TEXT: { noLabel: false, required: false, unique: false, maxLength: "", minLength: "", defaultValue: "", expression: "", hideExpression: false },
    MULTI_LINE_TEXT: { noLabel: false, required: false, defaultValue: "" },
    RICH_TEXT: { noLabel: false, required: false, defaultValue: "" },
    NUMBER: { noLabel: false, required: false, unique: false, maxValue: "", minValue: "", defaultValue: "0", digit: true, unit: "", unitPosition: "BEFORE" },
    CHECK_BOX: { noLabel: false, required: false, defaultValue: [], options: {} },
    RADIO_BUTTON: { noLabel: false, required: true, defaultValue: "", options: {} },
    DROP_DOWN: { noLabel: false, required: false, defaultValue: "", options: {} },
    MULTI_SELECT: { noLabel: false, required: false, defaultValue: [], options: {} },
    DATE: { noLabel: false, required: false, unique: false, defaultValue: "", defaultNowValue: false },
    TIME: { noLabel: false, required: false, defaultValue: "" },
    DATETIME: { noLabel: false, required: false, unique: false, defaultValue: "", defaultNowValue: false },
    LINK: { noLabel: false, required: false, unique: false, defaultValue: "", protocol: "WEB" },
    USER_SELECT: { noLabel: false, required: false, defaultValue: [], entities: [] },
    FILE: { noLabel: false, required: false }
  };
  function deepEqual(a, b) {
    if (a === b) return true;
    if (a == null || b == null) return a === b;
    if (typeof a !== typeof b || typeof a !== "object") return false;
    const ka = Object.keys(a);
    const kb = Object.keys(b);
    if (ka.length !== kb.length) return false;
    return ka.every((k) => deepEqual(a[k], b[k]));
  }
  function formatValue(v) {
    if (v === void 0 || v === null) return "—";
    if (typeof v === "boolean") return v ? "はい" : "いいえ";
    if (typeof v === "object") return JSON.stringify(v, null, 2);
    if (v === "") return '""';
    return String(v);
  }
  function computeDiff(before, after) {
    const keys = /* @__PURE__ */ new Set([...Object.keys(before || {}), ...Object.keys(after || {})]);
    const rows = [];
    for (const code of keys) {
      const bf = before?.[code];
      const af = after?.[code];
      if (!bf && af) rows.push({ code, status: "added", before: null, after: af, changes: [] });
      else if (bf && !af) rows.push({ code, status: "removed", before: bf, after: null, changes: [] });
      else {
        const props = /* @__PURE__ */ new Set([...Object.keys(bf || {}), ...Object.keys(af || {})]);
        const changes = [];
        props.forEach((prop) => {
          if (!deepEqual(bf[prop], af[prop])) changes.push({ prop, before: bf[prop], after: af[prop] });
        });
        rows.push({ code, status: changes.length ? "modified" : "unchanged", before: bf, after: af, changes });
      }
    }
    const order = { added: 0, removed: 1, modified: 2, unchanged: 3 };
    rows.sort((a, b) => order[a.status] - order[b.status]);
    return rows;
  }
  function parseLooseValue(text) {
    const t = String(text || "").trim();
    if (t === "") return "";
    if (t === "true") return true;
    if (t === "false") return false;
    if (t[0] === "{" || t[0] === "[") return JSON.parse(t);
    return t;
  }
  function normalizeFieldValue(key, value) {
    if (key === "defaultValue") {
      if (Array.isArray(value)) return value;
      if (typeof value !== "string") return value;
      const list = value.split(",").map((s) => s.trim()).filter(Boolean);
      if (list.length > 1) return list;
      return value;
    }
    if (key === "options") {
      if (typeof value !== "string") return value || {};
      const lines = value.split("\n").map((s) => s.trim()).filter(Boolean);
      const out = {};
      lines.forEach((label, idx) => {
        out[label] = { label, index: idx };
      });
      return out;
    }
    if (Array.isArray(value)) {
      if (!value.length) return [];
      return value;
    }
    return value;
  }
  function collectFieldFromForm(form, fallback) {
    const type = form.querySelector('[data-rpp-field="type"]')?.value || fallback?.type || "SINGLE_LINE_TEXT";
    const code = (form.querySelector('[data-rpp-field="code"]')?.value || fallback?.code || "").trim();
    const label = (form.querySelector('[data-rpp-field="label"]')?.value || fallback?.label || "").trim();
    if (!code || !type || !label) throw new Error("code/type/label は必須です");
    const next = { type, code, label };
    const rows = form.querySelectorAll("[data-rpp-key]");
    rows.forEach((row) => {
      const key = row.getAttribute("data-rpp-key");
      const input = row.querySelector("[data-rpp-input]");
      if (!key || !input) return;
      let value;
      if (input.type === "checkbox") value = !!input.checked;
      else value = parseLooseValue(input.value);
      next[key] = normalizeFieldValue(key, value);
    });
    return next;
  }
  function renderFieldFormRows(draft) {
    const keys = Object.keys(draft).filter((k) => !["type", "code", "label"].includes(k));
    return keys.map((key) => {
      const value = draft[key];
      if (typeof value === "boolean") {
        return `<label class="rpp-field-row" data-rpp-key="${esc(key)}"><span>${esc(key)}</span><input data-rpp-input type="checkbox" ${value ? "checked" : ""}></label>`;
      }
      if (key === "unitPosition") {
        return `<label class="rpp-field-row" data-rpp-key="${esc(key)}"><span>${esc(key)}</span><select data-rpp-input><option value="BEFORE" ${value === "BEFORE" ? "selected" : ""}>BEFORE</option><option value="AFTER" ${value === "AFTER" ? "selected" : ""}>AFTER</option></select></label>`;
      }
      if (key === "options" && value && typeof value === "object") {
        const lines = Object.values(value).sort((a, b) => a.index - b.index).map((o) => o.label).join("\n");
        return `<label class="rpp-field-row" data-rpp-key="${esc(key)}"><span>${esc(key)}（1行1候補）</span><textarea data-rpp-input class="rpp-modal-textarea rpp-modal-textarea-mini">${esc(lines)}</textarea></label>`;
      }
      const text = typeof value === "string" ? value : JSON.stringify(value);
      return `<label class="rpp-field-row" data-rpp-key="${esc(key)}"><span>${esc(key)}</span><input data-rpp-input type="text" value="${esc(text || "")}"></label>`;
    }).join("");
  }
  function initReflectPreviewPlayground(ui4, setStatus2) {
    const root2 = ui4.reflectPreviewPlayground;
    if (!root2) return;
    const st = {
      before: deepClone(SAMPLE_BEFORE),
      after: deepClone(SAMPLE_AFTER),
      filter: "all",
      view: "diff",
      undo: [],
      expanded: /* @__PURE__ */ new Set(),
      dragCode: "",
      modal: null
    };
    const pushUndo = () => {
      st.undo.push({ before: deepClone(st.before), after: deepClone(st.after) });
      if (st.undo.length > 20) st.undo.shift();
    };
    const parseFieldInput2 = (v) => {
      const obj = JSON.parse(v);
      if (!obj || typeof obj !== "object") throw new Error("JSONオブジェクトを入力してください");
      if (!obj.code || !obj.type || !obj.label) throw new Error("code/type/label が必要です");
      return obj;
    };
    const openModal = (modal) => {
      st.modal = modal;
    };
    const closeModal = () => {
      st.modal = null;
    };
    const renderModal = () => {
      if (!st.modal) return "";
      if (st.modal.kind === "fieldJson") {
        return `<div class="rpp-modal-backdrop" data-rpp-modal-act="cancel"><div class="rpp-modal" onclick="event.stopPropagation()"><div class="rpp-modal-head">${esc(st.modal.title)}</div><div class="rpp-modal-body"><textarea class="rpp-modal-textarea" data-rpp-modal-input="fieldJson">${esc(st.modal.text || "")}</textarea>${st.modal.error ? `<div class="rpp-modal-error">${esc(st.modal.error)}</div>` : ""}</div><div class="rpp-modal-actions"><button type="button" class="btn sub" data-rpp-modal-act="cancel">キャンセル</button><button type="button" class="btn ok" data-rpp-modal-act="saveFieldJson">保存</button></div></div></div>`;
      }
      if (st.modal.kind === "pairJson") {
        return `<div class="rpp-modal-backdrop" data-rpp-modal-act="cancel"><div class="rpp-modal rpp-modal-wide" onclick="event.stopPropagation()"><div class="rpp-modal-head">${esc(st.modal.title)}</div><div class="rpp-modal-body rpp-modal-grid"><div><div class="rpp-modal-label">変更前（before）</div><textarea class="rpp-modal-textarea" data-rpp-modal-input="beforeJson">${esc(st.modal.beforeText || "")}</textarea></div><div><div class="rpp-modal-label">変更後（after）</div><textarea class="rpp-modal-textarea" data-rpp-modal-input="afterJson">${esc(st.modal.afterText || "")}</textarea></div>${st.modal.error ? `<div class="rpp-modal-error rpp-modal-error-full">${esc(st.modal.error)}</div>` : ""}</div><div class="rpp-modal-actions"><button type="button" class="btn sub" data-rpp-modal-act="cancel">キャンセル</button><button type="button" class="btn ok" data-rpp-modal-act="savePairJson">適用</button></div></div></div>`;
      }
      if (st.modal.kind === "confirm") {
        return `<div class="rpp-modal-backdrop" data-rpp-modal-act="cancel"><div class="rpp-modal" onclick="event.stopPropagation()"><div class="rpp-modal-head">${esc(st.modal.title)}</div><div class="rpp-modal-body"><p class="rpp-modal-confirm">${esc(st.modal.message)}</p></div><div class="rpp-modal-actions"><button type="button" class="btn sub" data-rpp-modal-act="cancel">キャンセル</button><button type="button" class="btn ok" data-rpp-modal-act="confirmAction">実行</button></div></div></div>`;
      }
      if (st.modal.kind === "fieldForm") {
        return `<div class="rpp-modal-backdrop" data-rpp-modal-act="cancel"><div class="rpp-modal" onclick="event.stopPropagation()"><div class="rpp-modal-head">${esc(st.modal.title)}</div><div class="rpp-modal-body"><div class="rpp-field-grid"><label class="rpp-field-row"><span>type</span>${st.modal.mode === "edit" ? `<input data-rpp-field="type" type="text" value="${esc(st.modal.draft.type)}" readonly>` : `<select data-rpp-field="type">${FIELD_TYPES.map((t) => `<option value="${esc(t.value)}" ${st.modal.draft.type === t.value ? "selected" : ""}>${esc(t.label)}</option>`).join("")}</select>`}</label><label class="rpp-field-row"><span>code</span><input data-rpp-field="code" type="text" value="${esc(st.modal.draft.code || "")}" ${st.modal.mode === "edit" ? "readonly" : ""}></label><label class="rpp-field-row"><span>label</span><input data-rpp-field="label" type="text" value="${esc(st.modal.draft.label || "")}"></label>${renderFieldFormRows(st.modal.draft)}</div><div class="rpp-modal-hint">詳細JSONでの編集が必要な場合は「JSON編集」を利用してください。</div>${st.modal.error ? `<div class="rpp-modal-error">${esc(st.modal.error)}</div>` : ""}</div><div class="rpp-modal-actions"><button type="button" class="btn sub" data-rpp-modal-act="cancel">キャンセル</button><button type="button" class="btn sub" data-rpp-modal-act="switchFieldJson">JSON編集</button><button type="button" class="btn ok" data-rpp-modal-act="saveFieldForm">保存</button></div></div></div>`;
      }
      return "";
    };
    const render = () => {
      const diff = computeDiff(st.before, st.after);
      const rows = st.filter === "all" ? diff : diff.filter((r) => r.status === st.filter);
      const stats = { added: 0, removed: 0, modified: 0, unchanged: 0 };
      diff.forEach((d) => {
        stats[d.status] += 1;
      });
      root2.innerHTML = `
      <div class="rpp-toolbar">
        <button type="button" class="btn sub" data-rpp-act="loadSample">サンプル</button>
        <button type="button" class="btn sub" data-rpp-act="undo" ${st.undo.length ? "" : "disabled"}>↩ 戻す</button>
        <button type="button" class="btn sub" data-rpp-act="add">＋ フィールド追加</button>
        <button type="button" class="btn sub" data-rpp-act="editJson">JSON編集</button>
        <button type="button" class="btn sub" data-rpp-act="export">JSON保存</button>
        <span style="margin-left:auto"></span>
        <button type="button" class="btn ${st.view === "diff" ? "ok" : "sub"}" data-rpp-act="viewDiff">差分</button>
        <button type="button" class="btn ${st.view === "preview" ? "ok" : "sub"}" data-rpp-act="viewPreview">プレビュー</button>
      </div>
      <div class="rpp-filters">
        ${["all", "added", "removed", "modified", "unchanged"].map((k) => `<button type="button" class="btn sub ${st.filter === k ? "is-active" : ""}" data-rpp-act="filter" data-filter="${k}">${k === "all" ? "すべて" : STATUS_LABELS[k]} <span>${k === "all" ? diff.length : stats[k]}</span></button>`).join("")}
      </div>
      <div class="rpp-list">
        ${rows.map((row) => {
        const opened = st.expanded.has(row.code);
        const label = row.after?.label || row.before?.label || row.code;
        const body = st.view === "diff" ? row.status === "modified" ? `<table class="rpp-table"><thead><tr><th>プロパティ</th><th>変更前</th><th>変更後</th></tr></thead><tbody>${row.changes.map((ch) => `<tr><td>${esc(ch.prop)}</td><td><pre>${esc(formatValue(ch.before))}</pre></td><td><pre>${esc(formatValue(ch.after))}</pre></td></tr>`).join("")}</tbody></table>` : `<pre class="rpp-pre">${esc(formatValue(row.after || row.before))}</pre>` : `<div class="rpp-preview-grid"><div><div class="rpp-preview-head">本番</div><div class="rpp-preview-body">${row.before ? esc(row.before.label || row.before.code || "-") : "なし"}</div></div><div><div class="rpp-preview-head">プレビュー</div><div class="rpp-preview-body">${row.after ? esc(row.after.label || row.after.code || "-") : "なし"}</div></div></div>`;
        return `<div class="rpp-card" draggable="true" data-rpp-code="${esc(row.code)}"><div class="rpp-head"><button type="button" class="rpp-open" data-rpp-act="toggle" data-code="${esc(row.code)}">${opened ? "▾" : "▸"}</button><span class="rpp-badge rpp-${row.status}">${STATUS_LABELS[row.status]}</span><strong>${esc(label)}</strong><code>${esc(row.code)}</code><span class="rpp-spacer"></span>${row.after ? `<button type="button" class="btn sub" data-rpp-act="edit" data-code="${esc(row.code)}">編集</button><button type="button" class="btn sub" data-rpp-act="delete" data-code="${esc(row.code)}">削除</button>` : `<button type="button" class="btn sub" data-rpp-act="restore" data-code="${esc(row.code)}">復元</button>`}</div>${opened ? `<div class="rpp-body">${body}</div>` : ""}</div>`;
      }).join("") || '<div class="muted" style="padding:12px">表示対象がありません</div>'}
      </div>
      ${renderModal()}`;
    };
    root2.addEventListener("click", (ev) => {
      const modalAct = ev.target.closest("[data-rpp-modal-act]")?.dataset.rppModalAct;
      if (modalAct) {
        try {
          if (modalAct === "cancel") {
            closeModal();
            render();
            return;
          }
          if (modalAct === "saveFieldJson" && st.modal?.kind === "fieldJson") {
            const raw = root2.querySelector('[data-rpp-modal-input="fieldJson"]')?.value || "";
            const parsed = parseFieldInput2(raw);
            pushUndo();
            if (st.modal.mode === "add") {
              st.after[parsed.code] = parsed;
              setStatus2(`${parsed.code} を追加しました`);
            } else if (st.modal.mode === "edit") {
              const oldCode = st.modal.code || parsed.code;
              st.after[oldCode] = parsed;
              if (oldCode !== parsed.code) {
                st.after[parsed.code] = st.after[oldCode];
                delete st.after[oldCode];
              }
              setStatus2(`${parsed.code} を更新しました`);
            }
            closeModal();
            render();
            return;
          }
          if (modalAct === "switchFieldJson" && st.modal?.kind === "fieldForm") {
            openModal({ kind: "fieldJson", mode: st.modal.mode, code: st.modal.code || st.modal.draft.code, title: `${st.modal.title}（JSON）`, text: JSON.stringify(st.modal.draft, null, 2), error: "" });
            render();
            return;
          }
          if (modalAct === "saveFieldForm" && st.modal?.kind === "fieldForm") {
            const form = root2.querySelector(".rpp-field-grid");
            const parsed = collectFieldFromForm(form, st.modal.draft);
            pushUndo();
            if (st.modal.mode === "add") {
              if (st.after[parsed.code]) throw new Error(`code "${parsed.code}" は既に存在します`);
              st.after[parsed.code] = parsed;
              setStatus2(`${parsed.code} を追加しました`);
            } else if (st.modal.mode === "edit") {
              st.after[parsed.code] = parsed;
              setStatus2(`${parsed.code} を更新しました`);
            }
            closeModal();
            render();
            return;
          }
          if (modalAct === "savePairJson" && st.modal?.kind === "pairJson") {
            const b = root2.querySelector('[data-rpp-modal-input="beforeJson"]')?.value || "";
            const a = root2.querySelector('[data-rpp-modal-input="afterJson"]')?.value || "";
            pushUndo();
            st.before = JSON.parse(b);
            st.after = JSON.parse(a);
            closeModal();
            setStatus2("before/after JSON を更新しました");
            render();
            return;
          }
          if (modalAct === "confirmAction" && st.modal?.kind === "confirm") {
            const payload = st.modal.payload || {};
            if (st.modal.mode === "delete") {
              pushUndo();
              delete st.after[payload.code];
              setStatus2(`${payload.code} を削除しました`);
            } else if (st.modal.mode === "overwrite") {
              const src = st.after[payload.sourceCode] || st.before[payload.sourceCode];
              const tgt = st.after[payload.targetCode];
              if (src && tgt) {
                pushUndo();
                const keep = { code: tgt.code, type: tgt.type };
                Object.keys(tgt).forEach((k) => {
                  if (k !== "code" && k !== "type") delete tgt[k];
                });
                Object.keys(src).forEach((k) => {
                  if (k === "code" || k === "type") return;
                  tgt[k] = deepClone(src[k]);
                });
                tgt.code = keep.code;
                tgt.type = keep.type;
                setStatus2(`${payload.sourceCode} → ${payload.targetCode} の設定上書きを実行しました`);
              }
            }
            closeModal();
            render();
            return;
          }
        } catch (e) {
          if (st.modal && (st.modal.kind === "fieldJson" || st.modal.kind === "pairJson" || st.modal.kind === "fieldForm")) {
            st.modal.error = e.message || String(e);
            render();
            return;
          }
          setStatus2(`プレビュー差分エディタエラー: ${e.message || String(e)}`, true);
          return;
        }
      }
      const btn = ev.target.closest("[data-rpp-act]");
      if (!btn) return;
      const act = btn.dataset.rppAct;
      const code = btn.dataset.code || "";
      try {
        if (act === "loadSample") {
          pushUndo();
          st.before = deepClone(SAMPLE_BEFORE);
          st.after = deepClone(SAMPLE_AFTER);
          setStatus2("サンプルデータを再読込しました");
        } else if (act === "undo") {
          if (!st.undo.length) return;
          const prev = st.undo.pop();
          st.before = prev.before;
          st.after = prev.after;
          setStatus2("元に戻しました");
        } else if (act === "viewDiff") st.view = "diff";
        else if (act === "viewPreview") st.view = "preview";
        else if (act === "filter") st.filter = btn.dataset.filter || "all";
        else if (act === "toggle") {
          if (st.expanded.has(code)) st.expanded.delete(code);
          else st.expanded.add(code);
        } else if (act === "delete") {
          openModal({ kind: "confirm", mode: "delete", title: "フィールド削除の確認", message: `${code} を削除しますか？`, payload: { code } });
        } else if (act === "restore") {
          if (!st.before[code]) return;
          pushUndo();
          st.after[code] = deepClone(st.before[code]);
          setStatus2(`${code} を復元しました`);
        } else if (act === "edit") {
          const cur = st.after[code];
          if (!cur) return;
          openModal({ kind: "fieldForm", mode: "edit", code, title: `${code} の編集`, draft: deepClone(cur), error: "" });
        } else if (act === "add") {
          openModal({ kind: "fieldForm", mode: "add", title: "フィールド追加", draft: { type: "SINGLE_LINE_TEXT", code: `new_field_${Object.keys(st.after).length + 1}`, label: "新規フィールド", ...deepClone(DEFAULT_PROPS.SINGLE_LINE_TEXT) }, error: "" });
        } else if (act === "editJson") {
          openModal({ kind: "pairJson", title: "before / after JSON 編集", beforeText: JSON.stringify(st.before, null, 2), afterText: JSON.stringify(st.after, null, 2), error: "" });
        } else if (act === "export") {
          downloadText("kintone-preview-fields.json", JSON.stringify({ properties: st.after }, null, 2), "application/json");
        }
        render();
      } catch (e) {
        setStatus2(`プレビュー差分エディタエラー: ${e.message || String(e)}`, true);
      }
    });
    root2.addEventListener("dragstart", (ev) => {
      const card = ev.target.closest("[data-rpp-code]");
      if (!card) return;
      st.dragCode = card.dataset.rppCode || "";
      ev.dataTransfer.effectAllowed = "move";
    });
    root2.addEventListener("dragover", (ev) => {
      if (!st.dragCode) return;
      const card = ev.target.closest("[data-rpp-code]");
      if (!card) return;
      ev.preventDefault();
      ev.dataTransfer.dropEffect = "move";
    });
    root2.addEventListener("drop", (ev) => {
      const card = ev.target.closest("[data-rpp-code]");
      if (!card || !st.dragCode) return;
      ev.preventDefault();
      const target = card.dataset.rppCode || "";
      if (!target || target === st.dragCode) return;
      const src = st.after[st.dragCode] || st.before[st.dragCode];
      const tgt = st.after[target];
      if (!src || !tgt) return;
      openModal({ kind: "confirm", mode: "overwrite", title: "設定上書きの確認", message: `${st.dragCode} の設定で ${target} を上書きしますか？`, payload: { sourceCode: st.dragCode, targetCode: target } });
      render();
    });
    root2.addEventListener("change", (ev) => {
      if (st.modal?.kind !== "fieldForm" || st.modal.mode !== "add") return;
      const sel = ev.target.closest('[data-rpp-field="type"]');
      if (!sel) return;
      const type = sel.value || "SINGLE_LINE_TEXT";
      st.modal.draft = { type, code: st.modal.draft.code, label: st.modal.draft.label, ...deepClone(DEFAULT_PROPS[type] || {}) };
      render();
    });
    render();
  }

  // src/handlers.js
  init_reflect();
  init_field();

  // src/tabs/settings-export.js
  init_constants();
  init_state();
  init_utils();
  init_api();
  init_utils();
  init_components();
  init_diff();
  init_field();

  // src/tabs/record.js
  init_constants();
  init_state();
  init_utils();
  init_api();
  init_components();
  init_diff();
  init_dialog();
  function getSideApiPrefix(isSource, preview) {
    const c = commonParams();
    const side = isSource ? c.source : c.target;
    return buildApiPrefix(side.guestId, !!preview);
  }
  async function loadViewsForSelect(selectId, inputId) {
    const tApp = getToolDocument().getElementById("u_targetApp").value.trim();
    if (!tApp) throw new Error("比較先アプリIDを設定してください。");
    const prefix = getSideApiPrefix(false, false);
    const resp = await apiGet(prefix, "/app/views.json", { app: tApp });
    const views = Object.entries(resp.views).map(([name, v]) => ({ name, ...v })).filter((v) => v.type === "LIST").sort((a, b) => Number(a.index) - Number(b.index));
    const sel = getToolDocument().getElementById(selectId);
    if (!sel) return;
    sel.innerHTML = '<option value="">-- 一覧を選択 --</option>';
    for (const v of views) {
      const opt = document.createElement("option");
      opt.value = v.id;
      opt.dataset.q = encodeURIComponent(v.filterCond || "");
      opt.textContent = v.name;
      sel.appendChild(opt);
    }
    sel.style.display = "block";
    sel.onchange = () => {
      const o = sel.options[sel.selectedIndex];
      if (o && o.value) {
        getToolDocument().getElementById(inputId).value = decodeURIComponent(o.dataset.q || "");
      }
    };
    setStatus("比較先アプリの一覧リストを取得しました");
  }
  async function getRecordIdsByQuery(app, query, isSource) {
    const prefix = getSideApiPrefix(isSource, false);
    const ids = [];
    let offset = 0;
    while (true) {
      let q = query ? `${query} ` : "";
      q += `order by $id asc limit 500 offset ${offset}`;
      const resp = await apiGet(prefix, "/records.json", { app, query: q, fields: ["$id"] });
      const records = resp.records || [];
      if (records.length === 0) break;
      records.forEach((r) => ids.push(Number(r.$id.value)));
      if (records.length < 500) break;
      offset += 500;
    }
    return ids;
  }
  async function getFullRecordsByQuery(app, query, isSource) {
    const prefix = getSideApiPrefix(isSource, false);
    let allRecords = [];
    let offset = 0;
    while (true) {
      let q = query ? `${query} ` : "";
      q += `limit 500 offset ${offset}`;
      const resp = await apiGet(prefix, "/records.json", { app, query: q });
      const records = resp.records || [];
      if (records.length === 0) break;
      allRecords = allRecords.concat(records);
      if (records.length < 500) break;
      offset += 500;
    }
    return allRecords;
  }
  var chunkArray = (arr, size) => {
    const out = [];
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out;
  };
  async function runBatchProcess() {
    const tApp = getToolDocument().getElementById("u_targetApp").value.trim();
    if (!tApp) throw new Error("比較先アプリIDを設定してください。");
    const query = getToolDocument().getElementById("u_batchProcView").value;
    const action = getToolDocument().getElementById("u_batchProcAction").value.trim();
    const assignee = getToolDocument().getElementById("u_batchProcAssignee").value.trim() || null;
    if (!action) throw new Error("アクション名を入力してください。");
    setStatus("対象レコードを取得中...");
    const ids = await getRecordIdsByQuery(tApp, query, false);
    if (ids.length === 0) throw new Error("処理対象のレコードが0件です。");
    if (!confirm(`${ids.length}件のレコードにアクション「${action}」を実行します。よろしいですか？`)) return;
    setStatus("ステータス一括更新を開始...");
    const prefix = getSideApiPrefix(false, false);
    const batches = chunkArray(ids, 100);
    let okCount = 0;
    for (let i = 0; i < batches.length; i++) {
      const batchIds = batches[i];
      const body = {
        app: tApp,
        records: batchIds.map((id) => {
          let r = { id, action };
          if (assignee) r.assignee = assignee;
          return r;
        })
      };
      await apiPut(prefix, "/records/status.json", body);
      okCount += batchIds.length;
      setStatus(`進捗: ${okCount}/${ids.length}件 完了...`);
      await new Promise((r) => setTimeout(r, 150));
    }
    setStatus(`ステータス一括更新が完了しました（全${okCount}件）`, false);
  }
  async function loadJSZip() {
    if (typeof globalThis.JSZip !== "undefined") return globalThis.JSZip;
    setStatus("JSZipを動的ロード中...");
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = EXTERNAL_LIBRARIES.jszip.cdnUrl;
      script.onload = () => {
        if (typeof globalThis.JSZip === "undefined") {
          reject(new Error("JSZipのロード後もグローバル変数が見つかりません"));
          return;
        }
        setStatus("JSZipのロード完了");
        resolve(globalThis.JSZip);
      };
      script.onerror = () => {
        reject(new Error("JSZipの読み込みに失敗しました"));
      };
      document.head.appendChild(script);
    });
  }
  async function downloadTargetFile(fileKey) {
    const prefix = getSideApiPrefix(false, false);
    const url = prefix + "/file.json?fileKey=" + encodeURIComponent(fileKey);
    const headers = { "X-Requested-With": "XMLHttpRequest" };
    const resp = await fetch(url, { method: "GET", headers });
    if (resp.status === 403) return null;
    return await resp.blob();
  }
  async function runBatchFileDownload() {
    const tApp = getToolDocument().getElementById("u_targetApp").value.trim();
    if (!tApp) throw new Error("比較先アプリIDを設定してください。");
    const query = getToolDocument().getElementById("u_batchDlView").value;
    const fileCode = getToolDocument().getElementById("u_batchDlFileCode").value.trim();
    const folderCode = getToolDocument().getElementById("u_batchDlFolderCode").value.trim();
    const zipName = getToolDocument().getElementById("u_batchDlZipName").value.trim() || "download.zip";
    if (!fileCode) throw new Error("ファイルフィールドコードを入力してください。");
    setStatus("対象レコードを取得中...");
    const records = await getFullRecordsByQuery(tApp, query, false);
    if (records.length === 0) throw new Error("処理対象のレコードが0件です。");
    const JSZipCtor = await loadJSZip();
    const zip = new JSZipCtor();
    let fileCount = 0;
    for (let i = 0; i < records.length; i++) {
      const rec = records[i];
      setStatus(`ファイルダウンロード中 (レコード ${i + 1}/${records.length})...`);
      const fileList = rec[fileCode]?.value || [];
      if (fileList.length > 0) {
        let folderName = folderCode && rec[folderCode] ? rec[folderCode].value : "";
        if (!folderName) folderName = `Record_${rec.$id.value}`;
        const recordFolder = zip.folder(folderName);
        for (const f of fileList) {
          const blob = await downloadTargetFile(f.fileKey);
          if (blob) {
            recordFolder.file(f.name, blob);
            fileCount++;
          }
        }
      }
    }
    if (fileCount === 0) {
      setStatus("ダウンロード対象が見つかりませんでした。", true);
      return;
    }
    setStatus(`ZIP圧縮中 (計${fileCount}ファイル)...`);
    const zipBlob = await zip.generateAsync({ type: "blob" });
    const a = document.createElement("a");
    const u = URL.createObjectURL(zipBlob);
    a.href = u;
    a.download = zipName;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(u);
    }, 100);
    setStatus(`添付ファイル一括DL完了 (${fileCount}ファイル)`);
  }
  async function getAllAppsInSpace(isSource) {
    const prefix = getSideApiPrefix(isSource, false);
    let allApps = [];
    let offset = 0;
    while (true) {
      const resp = await apiGet(prefix, "/apps.json", { limit: 100, offset });
      const apps = resp.apps || [];
      allApps = allApps.concat(apps);
      if (apps.length < 100) break;
      offset += 100;
      await new Promise((r) => setTimeout(r, 200));
    }
    return allApps;
  }
  async function downloadBlobWithRetry(fileKey, isSource, guestSpaceId) {
    let prefix = getSideApiPrefix(isSource, false);
    if (guestSpaceId) {
      prefix = `/k/guest/${guestSpaceId}/v1`;
    }
    const url = prefix + "/file.json?fileKey=" + encodeURIComponent(fileKey);
    const headers = { "X-Requested-With": "XMLHttpRequest" };
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const resp = await fetch(url, { method: "GET", headers });
        if (resp.status === 403) return null;
        if (!resp.ok) throw new Error("Download failed: " + resp.status);
        return await resp.blob();
      } catch (e) {
        console.warn("File download failed, retrying...", e);
        await new Promise((r) => setTimeout(r, 500));
      }
    }
    return null;
  }
  async function runCsvExport() {
    const tgtAppId = getToolDocument().getElementById("u_targetApp")?.value?.trim();
    if (!tgtAppId) throw new Error("比較先アプリIDが指定されていません");
    const tgtGuestId = getToolDocument().getElementById("u_targetGuest")?.value?.trim();
    const guestPrefix = tgtGuestId ? `/k/guest/${tgtGuestId}/v1` : "/k/v1";
    let condition = getToolDocument().getElementById("u_csvExportViewSelect")?.value || "";
    if (!condition) condition = getToolDocument().getElementById("u_csvExportView")?.value || "";
    const filename = getToolDocument().getElementById("u_csvExportName")?.value?.trim() || "records.csv";
    setBusy(true, "フィールド情報取得中...");
    let fields = null;
    try {
      fields = await apiGet(guestPrefix, "/app/form/fields.json", { app: tgtAppId });
    } catch (e) {
      throw new Error("フィールド情報の取得に失敗: " + e.message);
    }
    const propKeys = Object.keys(fields.properties);
    if (!propKeys.length) throw new Error("出力できるフィールドがありません");
    setBusy(true, "レコード取得中...");
    let allRecords = [];
    let lastRecordId = "0";
    const limit = 500;
    let baseQuery = condition;
    let queryHasOrder = baseQuery.toLowerCase().includes("order by");
    let queryHasLimit = baseQuery.toLowerCase().includes("limit");
    if (queryHasLimit) {
      const resp = await apiGet(guestPrefix, "/records.json", { app: tgtAppId, query: baseQuery });
      allRecords = resp.records || [];
    } else {
      while (true) {
        setBusy(true, `レコード取得中... (${allRecords.length}件取得済)`);
        let loopQuery = "";
        if (baseQuery) {
          loopQuery = `${baseQuery} ${queryHasOrder ? "" : "order by $id asc"} limit ${limit} offset ${allRecords.length}`;
        } else {
          loopQuery = `$id > ${lastRecordId} order by $id asc limit ${limit}`;
        }
        const resp = await apiGet(guestPrefix, "/records.json", { app: tgtAppId, query: loopQuery });
        const batch = resp.records || [];
        allRecords = allRecords.concat(batch);
        if (batch.length < limit) break;
        lastRecordId = batch[batch.length - 1].$id.value;
      }
    }
    if (!allRecords.length) throw new Error("出力するレコードがありません");
    setStatus(`CSV生成中... (${allRecords.length}件)`);
    const escapeCsv = (val) => {
      const s = String(val == null ? "" : val);
      if (s.includes(",") || s.includes('"') || s.includes("\n")) {
        return '"' + s.replace(/"/g, '""') + '"';
      }
      return s;
    };
    const extractValue = (rec, code) => {
      const field = rec[code];
      if (!field) return "";
      if (field.type === "USER_SELECT" || field.type === "ORGANIZATION_SELECT" || field.type === "GROUP_SELECT") {
        return (field.value || []).map((v) => v.code || v.name).join(",");
      }
      if (field.type === "CHECK_BOX" || field.type === "MULTI_SELECT") {
        return (field.value || []).join(",");
      }
      if (field.type === "FILE") {
        return (field.value || []).map((file) => file.name).join(",");
      }
      if (field.type === "SUBTABLE") {
        return (field.value || []).length + "行";
      }
      if (typeof field.value === "object" && field.value !== null) {
        return JSON.stringify(field.value);
      }
      return field.value;
    };
    const lines = [];
    lines.push(propKeys.map(escapeCsv).join(","));
    for (const rec of allRecords) {
      lines.push(propKeys.map((key) => escapeCsv(extractValue(rec, key))).join(","));
    }
    const csvStr = "\uFEFF" + lines.join("\n");
    const blob = new Blob([csvStr], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
    setBusy(false);
    setStatus(`CSVを出力しました (${allRecords.length}件)`);
  }
  async function runCsvImport() {
    const tgtAppId = getToolDocument().getElementById("u_targetApp")?.value?.trim();
    if (!tgtAppId) throw new Error("比較先アプリIDが指定されていません");
    const guestPrefix = getToolDocument().getElementById("u_targetGuest")?.value?.trim() ? `/k/guest/${getToolDocument().getElementById("u_targetGuest").value.trim()}/v1` : "/k/v1";
    const fileInput = getToolDocument().getElementById("u_csvImportFile");
    if (!fileInput.files || !fileInput.files.length) {
      throw new Error("CSVファイルを選択してください");
    }
    const file = fileInput.files[0];
    setBusy(true, "CSVファイルを読み込み中...");
    const text = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (e) => reject(new Error("ファイルの読み取りに失敗しました"));
      reader.readAsText(file);
    });
    if (!text) throw new Error("ファイルが空です");
    setBusy(true, "CSVをパース中...");
    const parseCsv = (csvText) => {
      const rows2 = [];
      let current = [];
      let cell = "";
      let inQuotes = false;
      for (let i = 0; i < csvText.length; i++) {
        const char = csvText[i];
        const nextChar = csvText[i + 1];
        if (inQuotes) {
          if (char === '"') {
            if (nextChar === '"') {
              cell += '"';
              i++;
            } else {
              inQuotes = false;
            }
          } else {
            cell += char;
          }
        } else {
          if (char === '"') {
            inQuotes = true;
          } else if (char === ",") {
            current.push(cell);
            cell = "";
          } else if (char === "\n" || char === "\r") {
            if (char === "\r" && nextChar === "\n") i++;
            current.push(cell);
            rows2.push(current);
            current = [];
            cell = "";
          } else {
            cell += char;
          }
        }
      }
      if (cell !== "" || current.length > 0) {
        current.push(cell);
        rows2.push(current);
      }
      return rows2;
    };
    const rows = parseCsv(text.replace(/^\uFEFF/, ""));
    if (rows.length < 2) throw new Error("ヘッダ行とデータ行が必要です");
    const header = rows[0].map((h) => h.trim());
    if (header.includes("$id")) throw new Error("CSV内にシステムフィールド（$idなど）が含まれています。インポート時は除外してください。");
    const records = [];
    for (let i = 1; i < rows.length; i++) {
      if (rows[i].length === 1 && rows[i][0] === "") continue;
      const rec = {};
      for (let j = 0; j < header.length; j++) {
        if (!header[j]) continue;
        const val = rows[i][j] !== void 0 ? rows[i][j] : "";
        rec[header[j]] = { value: val };
      }
      records.push(rec);
    }
    if (!records.length) throw new Error("登録するデータが見つかりませんでした");
    if (!confirm(`CSVから ${records.length}件 のレコードをインポートしますか？`)) {
      setBusy(false);
      return;
    }
    setBusy(true, `インポート開始... (対象 ${records.length}件)`);
    const batchSize = 100;
    let successCount = 0;
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      setBusy(true, `インポート実行中... (${i + 1} ～ ${i + batch.length} / ${records.length} 件目)`);
      try {
        await apiPost(guestPrefix, "/records.json", { app: tgtAppId, records: batch });
        successCount += batch.length;
      } catch (e) {
        throw new Error(`レコード登録エラー（${i + 1}件目付近）: ${e.message}`);
      }
    }
    setBusy(false);
    alert(`完了: ${successCount}件のレコードを登録しました。`);
    fileInput.value = "";
    getToolDocument().getElementById("u_csvImportFileName").textContent = "未選択";
  }
  async function runRecordCopy() {
    const srcApp = getToolDocument().getElementById("u_sourceApp")?.value?.trim();
    const tgtApp = getToolDocument().getElementById("u_targetApp")?.value?.trim();
    if (!srcApp || !tgtApp) throw new Error("比較元と比較先の両方のアプリIDを指定してください");
    const srcGuestStr = getToolDocument().getElementById("u_sourceGuest")?.value?.trim() || null;
    const tgtGuestStr = getToolDocument().getElementById("u_targetGuest")?.value?.trim() || null;
    const srcGuest = srcGuestStr ? `/k/guest/${srcGuestStr}/v1` : "/k/v1";
    const tgtGuest = tgtGuestStr ? `/k/guest/${tgtGuestStr}/v1` : "/k/v1";
    const query = getToolDocument().getElementById("u_recordCopyQuery")?.value || "";
    if (!confirm(`比較元(${srcApp}) から 比較先(${tgtApp}) へレコードをコピーします。よろしいですか？`)) return;
    setBusy(true, "比較元のレコードを取得中...");
    let totalFetched = 0;
    const records = [];
    while (true) {
      const q = `${query} limit 500 offset ${totalFetched}`;
      const res = await apiGet(srcGuest, "/records.json", { app: srcApp, query: q });
      if (!res.records || res.records.length === 0) break;
      records.push(...res.records);
      totalFetched += res.records.length;
      if (res.records.length < 500) break;
      setStatus(`取得中... (${totalFetched}件)`);
    }
    if (!records.length) {
      alert("コピー対象のレコードが見つかりませんでした");
      setBusy(false);
      return;
    }
    const systemFields = ["$id", "$revision", "作成者", "作成日時", "更新者", "更新日時", "レコード番号", "ステータス", "作業者"];
    const systemTypes = ["RECORD_NUMBER", "CREATOR", "CREATED_TIME", "MODIFIER", "UPDATED_TIME", "STATUS", "STATUS_ASSIGNEE", "CALC"];
    const cleanRecords = records.map((rec) => {
      const clean = {};
      for (const [k, v] of Object.entries(rec)) {
        if (!systemFields.includes(k) && !systemTypes.includes(v.type)) {
          if (v.type === "SUBTABLE") {
            const cleanSub = v.value.map((sRow) => {
              const cleanSRow = {};
              for (const [sk, sv] of Object.entries(sRow.value)) {
                cleanSRow[sk] = { value: sv.value };
              }
              return { value: cleanSRow };
            });
            clean[k] = { value: cleanSub };
          } else {
            clean[k] = { value: v.value };
          }
        }
      }
      return clean;
    });
    if (!confirm(`${records.length}件のレコードを比較先(AppID: ${tgtApp})へ登録します。実行しますか？`)) {
      setBusy(false);
      return;
    }
    setBusy(true, `インポート開始... (対象 ${records.length}件)`);
    const batchSize = 100;
    let successCount = 0;
    for (let i = 0; i < cleanRecords.length; i += batchSize) {
      const batch = cleanRecords.slice(i, i + batchSize);
      setBusy(true, `登録実行中... (${i + 1} ～ ${i + batch.length} / ${cleanRecords.length} 件目)`);
      try {
        await apiPost(tgtGuest, "/records.json", { app: tgtApp, records: batch });
        successCount += batch.length;
      } catch (e) {
        throw new Error(`レコード登録エラー（${i + 1}件目付近）: ${e.message}`);
      }
    }
    setBusy(false);
    alert(`完了: ${successCount}件のレコードを比較先へコピーしました。`);
  }
  var TEMPLATE_STATE_KEY = "kintoneSuperApp_Templates";
  function getTemplates() {
    try {
      return JSON.parse(localStorage.getItem(TEMPLATE_STATE_KEY) || "{}");
    } catch {
      return {};
    }
  }
  function renderTemplateOptions() {
    const sel = getToolDocument().getElementById("u_templateSelect");
    if (!sel) return;
    const tpls = getTemplates();
    const current = sel.value;
    const keys = Object.keys(tpls).sort((a, b) => tpls[b].savedAt - tpls[a].savedAt);
    if (!keys.length) {
      sel.innerHTML = '<option value="">-- 保存済なし --</option>';
      return;
    }
    sel.innerHTML = keys.map((k) => `<option value="${esc(k)}">${esc(k)} (${new Date(tpls[k].savedAt).toLocaleDateString()})</option>`).join("");
    if (tpls[current]) sel.value = current;
  }
  async function saveTemplate() {
    const name = getToolDocument().getElementById("u_templateSaveName")?.value?.trim();
    if (!name) throw new Error("保存するデータ名を入力してください");
    const c = commonParams();
    if (!c.source.appId) throw new Error("テンプレートとして保存する比較元のアプリIDを指定してください");
    const scopes = SECTION_DEFS.map((s) => s.key);
    const bundle = await fetchBundle({ ...c.source, sections: scopes, onProgress: (p, l) => setStatus(`取得中 ${Math.round(p * 100)}% (${l})`) });
    const tpls = getTemplates();
    tpls[name] = { savedAt: Date.now(), bundle };
    try {
      localStorage.setItem(TEMPLATE_STATE_KEY, JSON.stringify(tpls));
    } catch (e) {
      throw new Error("保存に失敗しました。LocalStorageの容量制限(5MB等)に達した可能性があります。不要な履歴を削除してください。");
    }
    renderTemplateOptions();
    getToolDocument().getElementById("u_templateSaveName").value = "";
    alert(`データ「${name}」を保存しました。`);
  }
  function loadTemplate() {
    const name = getToolDocument().getElementById("u_templateSelect")?.value;
    if (!name) return;
    const tpls = getTemplates();
    const tpl = tpls[name];
    if (!tpl || !tpl.bundle) {
      alert("指定されたデータが存在しません");
      return;
    }
    state.importedSourceBundle = tpl.bundle;
    state.importedSourceName = `[テンプレート] ${name}`;
    renderBundleState();
    alert(`テンプレート「${name}」を比較元（ファイル読込扱い）としてセットしました。
必要に応じて差分比較を実行してください。`);
  }
  function deleteTemplate() {
    const name = getToolDocument().getElementById("u_templateSelect")?.value;
    if (!name) return;
    if (!confirm(`テンプレート「${name}」を削除しますか？`)) return;
    const tpls = getTemplates();
    delete tpls[name];
    localStorage.setItem(TEMPLATE_STATE_KEY, JSON.stringify(tpls));
    renderTemplateOptions();
    setStatus(`テンプレート「${name}」を削除しました`);
  }

  // src/tabs/settings-export.js
  function addAppIdToSettingsExport(appId, appName) {
    if (!/^\d+$/.test(String(appId || "").trim())) return;
    const set = new Set(parseAppIdList(ui.settingsExportAppIds.value));
    set.add(String(appId).trim());
    ui.settingsExportAppIds.value = [...set].join(", ");
    saveCurrentDialogState2();
    setStatus(`アプリ ${appId}${appName ? ` (${appName})` : ""} を追加しました`);
  }
  function renderSettingsExportSearchResults(apps) {
    const list = Array.isArray(apps) ? apps : [];
    if (!list.length) {
      ui.settingsExportSearchResult.innerHTML = '<div style="padding:10px;font-size:12px;color:#64748b">検索結果なし</div>';
      return;
    }
    const rows = list.map((app) => `<tr>
    <td>${esc(String(app.appId || ""))}</td>
    <td title="${esc(String(app.name || ""))}">${esc(String(app.name || ""))}</td>
    <td style="text-align:right"><button class="btn sub" style="padding:4px 8px;font-size:10px" data-add-settings-app="${esc(String(app.appId || ""))}" data-add-settings-name="${esc(String(app.name || ""))}">追加</button></td>
  </tr>`).join("");
    ui.settingsExportSearchResult.innerHTML = `<table>
    <thead><tr><th style="width:90px">アプリID</th><th>アプリ名</th><th style="width:70px"></th></tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
  }
  async function runSettingsExportSearchApps() {
    const keyword = ui.settingsExportSearchKeyword.value.trim();
    const guestId = ui.settingsExportGuest.value.trim();
    const prefix = buildApiPrefix(guestId, false);
    const params = { limit: 100 };
    if (keyword) params.name = keyword;
    setStatus("アプリ検索中...");
    const res = await apiGet(prefix, "/apps.json", params);
    const apps = (res.apps || []).map((a) => ({ appId: String(a.appId || ""), name: String(a.name || "") })).filter((a) => /^\d+$/.test(a.appId)).sort((a, b) => Number(a.appId) - Number(b.appId));
    renderSettingsExportSearchResults(apps);
    setStatus(`アプリ検索完了: ${apps.length}件`);
  }
  function renderSettingsExportSummary(rows, scopes) {
    const labels = scopes.map((k) => SECTION_DEFS.find((s) => s.key === k)?.label || k).join(", ");
    const body = rows.map((r) => `<tr>
    <td>${esc(r.appId)}</td>
    <td>${esc(String(r.okCount))}</td>
    <td>${esc(String(r.ngCount))}</td>
    <td>${esc(r.note || "-")}</td>
  </tr>`).join("");
    return `
    <div style="padding:8px 10px;border-bottom:1px solid #e2e8f0;font-size:11px;background:#f8fafc">対象セクション: ${esc(labels || "-")}</div>
    <table>
      <thead><tr><th>アプリID</th><th>取得OK</th><th>取得NG</th><th>メモ</th></tr></thead>
      <tbody>${body || '<tr><td colspan="4">結果なし</td></tr>'}</tbody>
    </table>
  `;
  }
  async function runSettingsExport(mode) {
    const appIds = parseAppIdList(ui.settingsExportAppIds.value);
    if (!appIds.length) throw new Error("対象アプリIDを1件以上入力してください");
    const scopes = selectedScopeKeys(ui.settingsExportScopes);
    if (!scopes.length) throw new Error("取得対象セクションを選択してください");
    const guestId = ui.settingsExportGuest.value.trim();
    const preview = !!ui.settingsExportPreview.checked;
    saveCurrentDialogState2();
    const bundles = [];
    const rows = [];
    for (let i = 0; i < appIds.length; i++) {
      const appId = appIds[i];
      setStatus(`設定取得中 ${i + 1}/${appIds.length}: アプリ ${appId}`);
      const bundle = await fetchBundle({
        appId,
        guestId,
        preview,
        sections: scopes,
        onProgress: (p, l) => setStatus(`設定取得中 ${i + 1}/${appIds.length}: アプリ ${appId} ${Math.round(p * 100)}% (${l})`)
      });
      bundles.push(bundle);
      let okCount = 0;
      let ngCount = 0;
      for (const key of scopes) {
        const sec = bundle.sections[key];
        if (sec && sec._fetchError) ngCount += 1;
        else okCount += 1;
      }
      rows.push({ appId, okCount, ngCount, note: ngCount ? "一部セクション取得失敗あり" : "OK" });
    }
    ui.settingsExportResult.innerHTML = renderSettingsExportSummary(rows, scopes);
    const scopeLabels = scopes.map((k) => SECTION_DEFS.find((s) => s.key === k)?.label || k);
    const payload = {
      generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
      guestId: guestId || "",
      preview,
      scopes,
      scopeLabels,
      apps: bundles
    };
    if (mode === "zip") {
      const JSZipCtor = await loadJSZip();
      const zip = new JSZipCtor();
      zip.file("manifest.json", JSON.stringify({
        generatedAt: payload.generatedAt,
        guestId: payload.guestId,
        preview: payload.preview,
        scopes: payload.scopes,
        appCount: bundles.length
      }, null, 2));
      for (const bundle of bundles) {
        const suffix = `${guestId ? `_guest_${guestId}` : ""}${preview ? "_preview" : "_live"}`;
        const name = `app_${bundle.appId}${suffix}.json`;
        zip.file(name, JSON.stringify(bundle, null, 2));
      }
      const zipBlob = await zip.generateAsync({ type: "blob" });
      downloadBlob(`settings_export_${bundles.length}apps_${nowStamp()}.zip`, zipBlob);
      setStatus(`設定一括取得ZIPを保存しました（${bundles.length} apps）`);
      return;
    }
    downloadText(`settings_export_${bundles.length}apps_${nowStamp()}.json`, JSON.stringify(payload, null, 2), "application/json");
    setStatus(`設定一括取得JSONを保存しました（${bundles.length}アプリ）`);
  }

  // src/handlers.js
  function withGuard(fn, busyText) {
    if (state.running) {
      setStatus("別の処理を実行中です。完了までお待ちください。");
      return;
    }
    state.running = true;
    setBusy(true, busyText || "処理中...");
    return (async () => {
      try {
        await fn();
      } catch (e) {
        console.error(e);
        setStatus(`エラー: ${e.message || String(e)}`, true);
      } finally {
        state.running = false;
        setBusy(false);
      }
    })();
  }
  function setScopeSelection(container, checked) {
    if (!container) return;
    [...container.querySelectorAll('input[type="checkbox"]')].forEach((c) => {
      c.checked = !!checked;
    });
    saveCurrentDialogState2();
  }
  function normalizeDiffFavoritePath2(path) {
    return String(path || "").trim();
  }
  function setupEventHandlers(injected = {}) {
    const root2 = getRoot();
    if (!root2) return;
    function syncDiffOnboardingVisibility() {
      const el = ui.diffOnboarding;
      if (!el) return;
      const dismissed = !!localStorage.getItem(DIFF_ONBOARDING_DISMISSED_KEY);
      const onDiffView = state.activeTab === "diff" && state.activeSubTabs.diff === "view";
      el.style.display = !dismissed && onDiffView ? "block" : "none";
    }
    const {
      runDesignExport: runDesignExport2,
      runDesignCopyMd: runDesignCopyMd2,
      runDesignExportXlsx: runDesignExportXlsx2,
      runDesignDiffMd: runDesignDiffMd2,
      runFieldDependencyMap: runFieldDependencyMap2,
      runFetchJsConfig: runFetchJsConfig2,
      runExportJsConfig: runExportJsConfig2,
      runApplyJsConfig: runApplyJsConfig2,
      runRenderProcessFlow: runRenderProcessFlow2,
      launchKintoneSql: launchKintoneSql2,
      runGenerateERDiagram: runGenerateERDiagram2,
      runExportERDiagramHtml: runExportERDiagramHtml2,
      runBatchProcess: runBatchProcess2,
      runBatchFileDownload: runBatchFileDownload2,
      runBatchJsConfigDownload: runBatchJsConfigDownload2,
      loadViewsForSelect: loadViewsForSelect2,
      runCsvExport: runCsvExport2,
      runCsvImport: runCsvImport2,
      exportDiffXlsx,
      runRecordCopy: runRecordCopy2,
      saveTemplate: saveTemplate2,
      loadTemplate: loadTemplate2,
      deleteTemplate: deleteTemplate2,
      runSimStart: runSimStart2,
      runSimExecuteAction: runSimExecuteAction2,
      runApiTester: runApiTester2,
      runPreviewApplyPlan: runPreviewApplyPlan2,
      runBackupTargetPreview: runBackupTargetPreview2,
      runApplyPreview: runApplyPreview2,
      runDeployOnly: runDeployOnly2,
      runApplyPatchJson,
      importPatchJsonFromFile,
      parsePatchJsonPayload,
      renderPatchJsonSummary,
      renderCustomizeResult: renderCustomizeResult2,
      runBulkFieldRename,
      runDetectUnusedFields,
      renderDiffSnapshotHistory,
      renderDiffFavoritesOnlyButton,
      renderTemplateOptions: renderTemplateOptions2
    } = injected;
    renderScopeChips();
    restoreDialogState();
    fitDialogToViewport({ persist: false });
    initDialogResizeHandling();
    initDialogDragHandling();
    syncDiffThemeButton();
    renderIgnoreKeyChips();
    renderDiffFilterOptions();
    if (typeof renderDiffFavoritesOnlyButton === "function") renderDiffFavoritesOnlyButton();
    renderDiffSelectionState();
    if (typeof renderDiffWarningBox === "function") renderDiffWarningBox();
    if (typeof renderDiffSnapshotHistory === "function") renderDiffSnapshotHistory();
    renderLookupMapRows();
    if (typeof renderTemplateOptions2 === "function") renderTemplateOptions2();
    renderBundleState();
    renderReflectSidebar();
    renderReflectMainPanel();
    renderReflectNodeList();
    initReflectPreviewPlayground(ui, setStatus);
    if (ui.settingsExportSearchResult && !ui.settingsExportSearchResult.innerHTML) {
      ui.settingsExportSearchResult.innerHTML = '<div style="padding:10px;font-size:12px;color:#64748b">検索結果なし</div>';
    }
    if (ui.toolBody) {
      ui.toolBody.addEventListener("scroll", () => {
        if (state.guidedTourActive) scheduleGuidedTourLayout();
      }, { passive: true });
    }
    let guidedTourWindowResizeHandler = null;
    if (!guidedTourWindowResizeHandler) {
      guidedTourWindowResizeHandler = () => {
        fitDialogToViewport({ persist: false });
        if (state.guidedTourActive) scheduleGuidedTourLayout();
      };
      getToolWindow().addEventListener("resize", guidedTourWindowResizeHandler);
    }
    ui.applyDiffOnly.addEventListener("change", () => {
      saveCurrentDialogState2();
      renderBundleState();
      renderReflectModeUi();
    });
    [ui.ignorePresetFieldOrder, ui.ignorePresetMeta, ui.ignorePresetLabelName].forEach((el) => {
      if (!el) return;
      el.addEventListener("change", () => {
        applyIgnorePresetKeysToInput({ removeDisabled: true });
        saveCurrentDialogState2();
      });
    });
    [ui.diffNormalizeViewOrder, ui.diffNormalizePermissionOrder, ui.diffNormalizeGeneralArrayOrder].forEach((el) => {
      if (!el) return;
      el.addEventListener("change", () => {
        saveCurrentDialogState2();
        setStatus("正規化プリセットを更新しました。次回の差分比較に反映されます");
      });
    });
    if (ui.diffWarnThreshold) {
      ui.diffWarnThreshold.addEventListener("change", () => {
        saveCurrentDialogState2();
        if (typeof renderDiffWarningBox === "function") renderDiffWarningBox();
        if (typeof renderDiffSnapshotHistory === "function") renderDiffSnapshotHistory();
      });
    }
    ui.stopOnError.addEventListener("change", saveCurrentDialogState2);
    ui.nodeMode.addEventListener("change", () => {
      saveCurrentDialogState2();
      renderBundleState();
      renderReflectNodeList();
    });
    let nodeSearchTimer = null;
    if (ui.nodeSearch) {
      ui.nodeSearch.addEventListener("input", () => {
        clearTimeout(nodeSearchTimer);
        nodeSearchTimer = setTimeout(() => renderReflectNodeList(), 200);
      });
    }
    if (ui.nodeFilterSection) ui.nodeFilterSection.addEventListener("change", () => renderReflectNodeList());
    if (ui.nodeFilterType) ui.nodeFilterType.addEventListener("change", () => renderReflectNodeList());
    if (ui.nodeFilterSeverity) ui.nodeFilterSeverity.addEventListener("change", () => renderReflectNodeList());
    if (ui.nodePropertyList) {
      ui.nodePropertyList.addEventListener("change", (ev) => {
        const input = ev.target.closest?.("[data-reflect-prop]");
        if (!input) return;
        const key = input.dataset.reflectProp;
        if (!key) return;
        if (!(state.reflectPropertyFilters instanceof Set)) state.reflectPropertyFilters = /* @__PURE__ */ new Set();
        if (input.checked) state.reflectPropertyFilters.add(key);
        else state.reflectPropertyFilters.delete(key);
        renderReflectNodeList();
      });
    }
    [
      ui.ignoreKeys,
      ui.autoBackupPreview,
      ui.overwriteField,
      ui.deployField,
      ui.jsconfigPreview,
      ui.jsconfigDeployAfter,
      ui.erLayout,
      ui.erFieldDensity,
      ui.erMaxDepth,
      ui.erExtraApps,
      ui.erIncludeSubtable,
      ui.erIncludeReverseLookup,
      ui.diffMultiTargets,
      ui.settingsExportAppIds,
      ui.settingsExportSearchKeyword,
      ui.settingsExportGuest,
      ui.settingsExportPreview,
      ui.diffSearchFieldName
    ].forEach((el) => {
      if (!el) return;
      el.addEventListener("change", saveCurrentDialogState2);
    });
    [ui.sourceApp, ui.sourceGuest, ui.targetApp, ui.targetGuest].forEach((el) => {
      if (!el) return;
      el.addEventListener("change", saveCurrentDialogState2);
    });
    if (ui.charDiff) {
      ui.charDiff.addEventListener("change", () => {
        saveCurrentDialogState2();
        if (state.lastDiffRows.length) renderResultRows(state.lastDiffRows);
      });
    }
    if (ui.diffIncludeSame) {
      ui.diffIncludeSame.addEventListener("change", () => {
        state.diffIncludeSame = !!ui.diffIncludeSame.checked;
        saveCurrentDialogState2();
        if (state.lastDiffAt && state.lastSourceBundle && state.lastTargetBundle) {
          withGuard(async () => runDiff(), "差分比較を更新中...");
          return;
        }
        setStatus(`差分なし表示を${state.diffIncludeSame ? "ON" : "OFF"}にしました。次回の差分比較から反映されます`);
      });
    }
    if (ui.diffSearch) {
      ui.diffSearch.addEventListener("input", () => {
        saveCurrentDialogState2();
        if (state.lastDiffRows.length) renderResultRows(state.lastDiffRows);
      });
    }
    if (ui.diffSearchFieldName) {
      ui.diffSearchFieldName.addEventListener("change", () => {
        state.diffSearchFieldName = !!ui.diffSearchFieldName.checked;
        saveCurrentDialogState2();
        if (state.lastDiffRows.length) renderResultRows(state.lastDiffRows);
      });
    }
    if (ui.diffMultiTargets) {
      ui.diffMultiTargets.addEventListener("input", saveCurrentDialogState2);
    }
    [ui.diffFilterSection, ui.diffFilterType, ui.diffFilterSeverity].forEach((el) => {
      if (!el) return;
      el.addEventListener("change", () => {
        state.diffFilterSection = ui.diffFilterSection?.value || "";
        state.diffFilterType = ui.diffFilterType?.value || "";
        state.diffFilterSeverity = ui.diffFilterSeverity?.value || "";
        saveCurrentDialogState2();
        if (state.lastDiffRows.length || state.lastFetchIssues.length) renderResultRows(state.lastDiffRows);
        else renderDiffSelectionState();
      });
    });
    if (ui.diffExportMode) {
      ui.diffExportMode.addEventListener("change", () => {
        state.diffExportMode = ui.diffExportMode.value || "all";
        saveCurrentDialogState2();
        renderDiffSelectionState();
      });
    }
    if (ui.diffExportContent) {
      ui.diffExportContent.addEventListener("change", () => {
        state.diffExportContent = ui.diffExportContent.value || "diffOnly";
        saveCurrentDialogState2();
        renderDiffSelectionState();
      });
    }
    ui.doDeploy.addEventListener("change", saveCurrentDialogState2);
    if (ui.reflectSimpleMode) {
      ui.reflectSimpleMode.addEventListener("change", () => {
        if (ui.reflectSimpleMode.checked) {
          ui.nodeMode.checked = false;
          state.reflectActiveSidebarSection = null;
          if (ui.patchJsonPanel) ui.patchJsonPanel.style.display = "none";
        }
        renderReflectModeUi();
        renderReflectMainPanel();
        renderReflectNodeList();
        saveCurrentDialogState2();
      });
    }
    root2.addEventListener("keydown", (e) => {
      const editable = e.target && (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.tagName === "SELECT" || e.target.isContentEditable);
      if (state.guidedTourActive && !editable) {
        if (e.key === "Escape") {
          e.preventDefault();
          closeGuidedTour();
          return;
        }
        if (e.key === "ArrowRight" || e.key === "Enter") {
          e.preventDefault();
          moveGuidedTour(1);
          return;
        }
        if (e.key === "ArrowLeft") {
          e.preventDefault();
          moveGuidedTour(-1);
          return;
        }
      }
      if (e.target.id === "u_ignoreKeyInput" && e.key === "Enter") {
        e.preventDefault();
        addIgnoreKeyFromInput();
        return;
      }
      const featCard = e.target.closest?.(".feature-card[data-feature]");
      if (featCard && !editable && (e.key === "Enter" || e.key === " ")) {
        e.preventDefault();
        featCard.click();
        return;
      }
      if (state.activeTab !== "diff") return;
      const resKb = getToolDocument().getElementById("u_result");
      const tKb = e.target;
      if (tKb?.matches?.("input[type=checkbox][data-diff-row-id]") && resKb?.contains(tKb) && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
        const boxes = [...resKb.querySelectorAll("tbody input[type=checkbox][data-diff-row-id]")];
        const idx = boxes.indexOf(tKb);
        const next = e.key === "ArrowDown" ? boxes[idx + 1] : boxes[idx - 1];
        if (idx >= 0 && next) {
          e.preventDefault();
          next.focus();
        }
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "f") {
        e.preventDefault();
        ui.diffSearch?.focus();
        ui.diffSearch?.select();
        return;
      }
      if (e.key === "Escape" && getToolDocument().activeElement === ui.diffSearch) {
        e.preventDefault();
        ui.diffSearch.value = "";
        saveCurrentDialogState2();
        renderResultRows(state.lastDiffRows);
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "c") {
        e.preventDefault();
        withGuard(async () => copyDiffSummaryToClipboard());
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "a" && !editable) {
        e.preventDefault();
        state.diffSelectedIds = new Set((state.lastDiffRows || []).map((row) => row._id));
        renderResultRows(state.lastDiffRows);
      }
    });
    root2.addEventListener("input", (e) => {
      if (e.target.closest("#u_lookupMapRows")) {
        syncLookupMapFromRows();
        saveCurrentDialogState2();
        return;
      }
      if (e.target === ui.diffMultiTargets) {
        saveCurrentDialogState2();
      }
    });
    ui.settingsExportSearchKeyword.addEventListener("keydown", (e) => {
      if (e.key !== "Enter") return;
      e.preventDefault();
      withGuard(runSettingsExportSearchApps);
    });
    root2.addEventListener("change", (e) => {
      const diffId = e.target?.dataset?.diffRowId;
      if (diffId) {
        const res = getToolDocument().getElementById("u_result");
        if (res?.contains(e.target)) state.diffSelectionAnchorId = diffId;
        if (e.target.checked) state.diffSelectedIds.add(diffId);
        else state.diffSelectedIds.delete(diffId);
        renderResultRows(state.lastDiffRows);
        saveCurrentDialogState2();
        return;
      }
      const id = e.target?.dataset?.nodeId;
      if (id) {
        pushReflectUndo();
        state.reflectActiveNodeId = id;
        if (e.target.checked) state.reflectSelectedIds.add(id);
        else state.reflectSelectedIds.delete(id);
        renderReflectNodeList();
        return;
      }
      if (e.target?.closest("#u_diffScopes") || e.target?.closest("#u_applyScopes") || e.target?.closest("#u_settingsExportScopes")) {
        saveCurrentDialogState2();
        renderBundleState();
      }
      if (e.target?.closest("[data-apply-scope]")) {
        syncApplyScopesFromSidebar();
        saveCurrentDialogState2();
        renderBundleState();
        renderReflectMainPanel();
        const putSections = SECTION_DEFS.filter((d) => d.put);
        const sidebarCount = getToolDocument().getElementById("u_sidebarCount");
        const checkedCount = [...getToolDocument().querySelectorAll("#u_reflectSidebarSections [data-apply-scope]:checked")].length;
        if (sidebarCount) sidebarCount.textContent = `${checkedCount} / ${putSections.length}`;
      }
    });
    root2.addEventListener("mousedown", (e) => {
      const cb = e.target.closest("input[type=checkbox][data-diff-row-id]");
      if (!cb) return;
      const res = getToolDocument().getElementById("u_result");
      if (!res || !res.contains(cb) || !e.shiftKey || !state.diffSelectionAnchorId) return;
      const boxes = [...res.querySelectorAll("tbody input[type=checkbox][data-diff-row-id]")];
      const ids = boxes.map((el) => el.dataset.diffRowId);
      const i0 = ids.indexOf(state.diffSelectionAnchorId);
      const i1 = ids.indexOf(cb.dataset.diffRowId);
      if (i0 < 0 || i1 < 0) return;
      e.preventDefault();
      const a = Math.min(i0, i1);
      const b = Math.max(i0, i1);
      const anchorEl = boxes.find((el) => el.dataset.diffRowId === state.diffSelectionAnchorId);
      const anchorChecked = anchorEl ? !!anchorEl.checked : true;
      for (let i = a; i <= b; i++) {
        const id = ids[i];
        if (anchorChecked) state.diffSelectedIds.add(id);
        else state.diffSelectedIds.delete(id);
      }
      renderResultRows(state.lastDiffRows || []);
      saveCurrentDialogState2();
    }, true);
    ui.sourceBundleFile.addEventListener("change", () => {
      const f = ui.sourceBundleFile.files && ui.sourceBundleFile.files[0];
      ui.sourceBundleFile.value = "";
      if (!f) return;
      withGuard(async () => {
        await importBundleFromFile("source", f);
        setStatus(`比較元バンドル読込完了: ${f.name}`);
      });
    });
    ui.targetBundleFile.addEventListener("change", () => {
      const f = ui.targetBundleFile.files && ui.targetBundleFile.files[0];
      ui.targetBundleFile.value = "";
      if (!f) return;
      withGuard(async () => {
        await importBundleFromFile("target", f);
        setStatus(`比較先バンドル読込完了: ${f.name}`);
      });
    });
    ui.fieldJsonFile.addEventListener("change", () => {
      const f = ui.fieldJsonFile.files && ui.fieldJsonFile.files[0];
      ui.fieldJsonFile.value = "";
      if (!f) return;
      withGuard(async () => {
        const text = await readTextFile(f);
        const parsed = JSON.parse(text);
        ui.fieldJson.value = JSON.stringify(parsed, null, 2);
        setStatus(`フィールドJSON読込完了: ${f.name}`);
      });
    });
    ui.jsconfigFile.addEventListener("change", () => {
      const f = ui.jsconfigFile.files && ui.jsconfigFile.files[0];
      ui.jsconfigFile.value = "";
      if (!f) return;
      withGuard(async () => {
        const text = await readTextFile(f);
        const parsed = JSON.parse(text);
        ui.jsconfigJson.value = JSON.stringify(parsed, null, 2);
        if (typeof renderCustomizeResult2 === "function") renderCustomizeResult2(parsed);
        setStatus(`JS/CSS設定JSON読込完了: ${f.name}`);
      });
    });
    const patchJsonFileInput = getToolDocument().getElementById("u_patchJsonFileInput");
    if (patchJsonFileInput) {
      patchJsonFileInput.addEventListener("change", () => {
        const f = patchJsonFileInput.files && patchJsonFileInput.files[0];
        patchJsonFileInput.value = "";
        if (!f) return;
        withGuard(async () => {
          if (typeof importPatchJsonFromFile === "function") await importPatchJsonFromFile(f);
        });
      });
    }
    const patchJsonEditor = getToolDocument().getElementById("u_patchJsonEditor");
    if (patchJsonEditor) {
      let patchParseTimer = 0;
      patchJsonEditor.addEventListener("input", () => {
        clearTimeout(patchParseTimer);
        patchParseTimer = setTimeout(() => {
          try {
            const text = patchJsonEditor.value.trim();
            if (!text) {
              if (typeof renderPatchJsonSummary === "function") renderPatchJsonSummary(null);
              return;
            }
            if (typeof parsePatchJsonPayload === "function") {
              const parsed = parsePatchJsonPayload(text);
              state.importedPatchPayload = parsed;
              if (typeof renderPatchJsonSummary === "function") renderPatchJsonSummary(parsed);
            }
          } catch (e) {
            const el = getToolDocument().getElementById("u_patchJsonSummary");
            if (el) {
              el.style.display = "block";
              el.style.background = "#fef2f2";
              el.style.borderColor = "#fca5a5";
              el.style.color = "#991b1b";
              el.textContent = `JSON解析エラー: ${e.message}`;
            }
          }
        }, 400);
      });
    }
    root2.addEventListener("click", (e) => {
      const favBtn = e.target.closest("[data-diff-fav-path]");
      if (favBtn) {
        const path = normalizeDiffFavoritePath2(favBtn.dataset.diffFavPath || "");
        if (!path) return;
        if (state.diffFavoritePaths.has(path)) state.diffFavoritePaths.delete(path);
        else state.diffFavoritePaths.add(path);
        saveCurrentDialogState2();
        renderResultRows(state.lastDiffRows);
        return;
      }
      const secNavBtn = e.target.closest("[data-diff-sec-nav]");
      if (secNavBtn) {
        const key = secNavBtn.getAttribute("data-diff-sec-nav") ?? "";
        applyDiffSectionNav(key);
        saveCurrentDialogState2();
        const label = key ? SECTION_DEFS.find((d) => d.key === key)?.label || key : "全セクション";
        setStatus(key ? `セクションで絞り込み: ${label}` : "セクション絞り込みを解除しました");
        return;
      }
      const sidebarItem = e.target.closest("[data-sidebar-sec]");
      if (sidebarItem && !e.target.closest(".sec-check")) {
        const secKey = sidebarItem.dataset.sidebarSec || "";
        state.reflectActiveSidebarSection = state.reflectActiveSidebarSection === secKey ? null : secKey;
        renderReflectSidebar();
        renderReflectMainPanel();
        return;
      }
      const overviewNav = e.target.closest("[data-sidebar-nav]");
      if (overviewNav) {
        const secKey = overviewNav.dataset.sidebarNav || "";
        if (secKey) {
          state.reflectActiveSidebarSection = secKey;
          renderReflectSidebar();
          renderReflectMainPanel();
        }
        return;
      }
      const secToggle = e.target.closest("[data-diff-sec-toggle]");
      if (secToggle) {
        const secKey = secToggle.dataset.diffSecToggle || "";
        if (secKey) {
          if (state.diffCollapsedSections.has(secKey)) state.diffCollapsedSections.delete(secKey);
          else state.diffCollapsedSections.add(secKey);
          if (state.lastDiffRows.length) renderResultRows(state.lastDiffRows);
        }
        return;
      }
      const moreRowsBtn = e.target.closest('[data-act="moreDiffRows"]');
      if (moreRowsBtn) {
        const secKey = moreRowsBtn.dataset.sec || "";
        if (!secKey) return;
        const current = Number(state.diffSectionVisibleCounts[secKey] || 80);
        state.diffSectionVisibleCounts[secKey] = current + 80;
        if (state.lastDiffRows.length) renderResultRows(state.lastDiffRows);
        return;
      }
      const modeBtn = e.target.closest("[data-node-mode]");
      if (modeBtn) {
        const nodeId = modeBtn.dataset.nodeMode;
        if (nodeId) {
          pushReflectUndo();
          state.reflectActiveNodeId = nodeId;
          state.reflectNodeModes[nodeId] = reflectRowModeById(nodeId) === "src" ? "tgt" : "src";
          renderReflectNodeList();
          setStatus(`ノードモード切替: ${state.reflectNodeModes[nodeId] === "src" ? "比較元" : "比較先"}`);
        }
        return;
      }
      const nodeOpen = e.target.closest("[data-node-open]");
      if (nodeOpen && !e.target.closest("input,button,label,a")) {
        const nodeId = nodeOpen.dataset.nodeOpen || "";
        if (nodeId) {
          setActiveReflectNode(nodeId, { persist: false });
          renderReflectNodeList();
        }
        return;
      }
      const nodeDetailTab = e.target.closest("[data-node-detail-tab]");
      if (nodeDetailTab) {
        state.reflectDetailTab = nodeDetailTab.dataset.nodeDetailTab || "diff";
        saveCurrentDialogState2();
        renderReflectNodeDetail();
        return;
      }
      const copyBtn = e.target.closest("[data-copy-val]");
      if (copyBtn) {
        const val = copyBtn.dataset.copyVal || "";
        try {
          navigator.clipboard.writeText(val);
          const originalText = copyBtn.textContent;
          copyBtn.textContent = "コピー済";
          setTimeout(() => {
            copyBtn.textContent = originalText;
          }, 1500);
        } catch (err) {
          setStatus(`コピー失敗: ${err.message}`, true);
        }
        return;
      }
      const addSuggestedBtn = e.target.closest('[data-act="addSuggestedIgnore"]');
      if (addSuggestedBtn) {
        const key = addSuggestedBtn.dataset.key || "";
        if (!key) return;
        const current = (ui.ignoreKeys.value || "").split(",").map((k) => k.trim()).filter(Boolean);
        if (!current.includes(key)) {
          current.push(key);
          ui.ignoreKeys.value = current.join(", ");
          renderIgnoreKeyChips();
          saveCurrentDialogState2();
          setStatus(`無視キー候補を追加: ${key}`);
        }
        return;
      }
      const addSettingsAppBtn = e.target.closest("[data-add-settings-app]");
      if (addSettingsAppBtn) {
        const appId = addSettingsAppBtn.dataset.addSettingsApp || "";
        const appName = addSettingsAppBtn.dataset.addSettingsName || "";
        addAppIdToSettingsExport(appId, appName);
        return;
      }
      if (e.target.id === "u_sourceFieldCheckAll") {
        const checked = e.target.checked;
        [...ui.sourceFieldTbody.querySelectorAll(".src-field-sel")].forEach((c) => c.checked = checked);
        return;
      }
      const subTab = e.target.closest(".subtab");
      if (subTab) {
        const parent = subTab.dataset.subtabParent || "";
        switchSubTab(parent, subTab.dataset.subtab || "");
        syncDiffOnboardingVisibility();
        if (parent === "diff" && ui.result) renderResultRows(state.lastDiffRows || []);
        return;
      }
      const tab = e.target.closest(".tab");
      if (tab) {
        const prevTab = state.activeTab;
        switchTab(tab.dataset.tab);
        syncDiffOnboardingVisibility();
        if (prevTab === "diff" && state.activeTab !== "diff" && ui.result) {
          ui.result.innerHTML = MAIN_RESULT_IDLE_HTML;
        } else if (state.activeTab === "diff" && ui.result) {
          renderResultRows(state.lastDiffRows || []);
        }
        return;
      }
      const actEl = e.target.closest("[data-act]");
      const act = actEl?.dataset.act;
      if (!act) return;
      if (act === "openFeature") {
        const featureKey = actEl.dataset.feature || "";
        const def = FEATURE_DEFS.find((f) => f.key === featureKey);
        if (!def) return;
        root2.classList.remove("screen-launcher");
        root2.classList.add("screen-feature");
        root2.classList.remove("feat-vis", "feat-data", "feat-change");
        if (featureKey === "vis") root2.classList.add("feat-vis");
        else if (featureKey === "data") root2.classList.add("feat-data");
        else root2.classList.add("feat-change");
        const conn = root2.querySelector("#u_connectionPanel");
        if (conn instanceof HTMLDetailsElement) conn.open = true;
        const prevTab = state.activeTab;
        switchTab(def.tabs[0]);
        if (prevTab === "diff" && state.activeTab !== "diff" && ui.result) {
          ui.result.innerHTML = MAIN_RESULT_IDLE_HTML;
        } else if (state.activeTab === "diff" && ui.result) {
          renderResultRows(state.lastDiffRows || []);
        }
        if (ui.featureTitle) ui.featureTitle.textContent = def.label;
        if (ui.featureConn) ui.featureConn.textContent = def.desc;
        saveCurrentDialogState2();
        setStatus(`${def.label} を開きました`);
        return;
      }
      if (act === "backToLauncher") {
        root2.classList.remove("screen-feature", "feat-vis", "feat-data", "feat-change");
        root2.classList.add("screen-launcher");
        saveCurrentDialogState2();
        setStatus("機能を選んでください");
        return;
      }
      if (act === "close") {
        closeGuidedTour({ silent: true });
        teardownDialogResizeHandling();
        root2.remove();
        return;
      }
      if (act === "startGuidedTour") {
        openGuidedTour(0);
        return;
      }
      if (act === "tourClose") {
        closeGuidedTour();
        return;
      }
      if (act === "tourPrev") {
        moveGuidedTour(-1);
        return;
      }
      if (act === "tourNext") {
        moveGuidedTour(1);
        return;
      }
      if (act === "dialogSizeDefault") {
        const next = applyDialogSizePreset("default");
        saveCurrentDialogState2();
        setStatus(`ダイアログを標準サイズにしました (${next.width} x ${next.height})`);
        return;
      }
      if (act === "dialogSizeLarge") {
        const next = applyDialogSizePreset("large");
        saveCurrentDialogState2();
        setStatus(`ダイアログを大きめサイズにしました (${next.width} x ${next.height})`);
        return;
      }
      if (act === "dialogSizeMax") {
        const next = applyDialogSizePreset("max");
        saveCurrentDialogState2();
        setStatus(`ダイアログを最大サイズにしました (${next.width} x ${next.height})`);
        return;
      }
      if (act === "goDiffReview") {
        switchTab("diff");
        switchSubTab("diff", state.lastDiffRows.length || state.lastFetchIssues.length ? "view" : "conditions");
        if (ui.result) renderResultRows(state.lastDiffRows || []);
        setStatus("差分比較タブへ移動しました");
        return;
      }
      if (act === "openReflectPreviewEditor") {
        const fold = root2.querySelector("#u_reflectPreviewEditorFold");
        fold?.scrollIntoView?.({ behavior: "smooth", block: "start" });
        setStatus("フィールド差分プレビューエディタへ移動しました");
        return;
      }
      if (act === "setSourceCurrent") {
        ui.sourceApp.value = DEFAULT_APP_ID;
        saveCurrentDialogState2();
        setStatus(`比較元アプリIDを現在アプリ(${DEFAULT_APP_ID})に設定しました`);
        return;
      }
      if (act === "copySourceToTarget") {
        ui.targetApp.value = ui.sourceApp.value.trim();
        ui.targetGuest.value = ui.sourceGuest.value.trim();
        ui.targetPreview.checked = !!ui.sourcePreview.checked;
        saveCurrentDialogState2();
        renderBundleState();
        setStatus("比較元設定を比較先へコピーしました");
        return;
      }
      if (act === "swapSourceTarget") {
        const src = { app: ui.sourceApp.value, guest: ui.sourceGuest.value, preview: ui.sourcePreview.checked };
        ui.sourceApp.value = ui.targetApp.value;
        ui.sourceGuest.value = ui.targetGuest.value;
        ui.sourcePreview.checked = ui.targetPreview.checked;
        ui.targetApp.value = src.app;
        ui.targetGuest.value = src.guest;
        ui.targetPreview.checked = src.preview;
        saveCurrentDialogState2();
        renderBundleState();
        setStatus("比較元/比較先設定を入れ替えました");
        return;
      }
      if (act === "settingsExportUseCurrent") {
        const cur = String(kintone.app.getId() || "").trim();
        if (!cur) {
          setStatus("現在のアプリIDを取得できませんでした", true);
          return;
        }
        const set = new Set(parseAppIdList(ui.settingsExportAppIds.value.trim()));
        set.add(cur);
        ui.settingsExportAppIds.value = [...set].join(", ");
        saveCurrentDialogState2();
        setStatus(`現在のApp(${cur})を追加しました`);
        return;
      }
      if (act === "settingsExportUseSource") {
        const srcId = ui.sourceApp.value.trim();
        if (!srcId) {
          setStatus("比較元アプリIDが空です", true);
          return;
        }
        const set = new Set(parseAppIdList(ui.settingsExportAppIds.value));
        set.add(srcId);
        ui.settingsExportAppIds.value = [...set].join(", ");
        ui.settingsExportGuest.value = ui.sourceGuest.value.trim();
        ui.settingsExportPreview.checked = !!ui.sourcePreview.checked;
        saveCurrentDialogState2();
        setStatus(`比較元アプリ(${srcId})を追加しました`);
        return;
      }
      if (act === "settingsExportUseTarget") {
        const tgtId = ui.targetApp.value.trim();
        if (!tgtId) {
          setStatus("比較先アプリIDが空です", true);
          return;
        }
        const set = new Set(parseAppIdList(ui.settingsExportAppIds.value));
        set.add(tgtId);
        ui.settingsExportAppIds.value = [...set].join(", ");
        ui.settingsExportGuest.value = ui.targetGuest.value.trim();
        ui.settingsExportPreview.checked = !!ui.targetPreview.checked;
        saveCurrentDialogState2();
        setStatus(`比較先アプリ(${tgtId})を追加しました`);
        return;
      }
      if (act === "settingsExportScopeAll") {
        setSettingsExportScopeSelection(true);
        setStatus("設定取得セクションを全選択しました");
        return;
      }
      if (act === "settingsExportScopeNone") {
        setSettingsExportScopeSelection(false);
        setStatus("設定取得セクションを全解除しました");
        return;
      }
      if (act === "runSettingsExportJson") return withGuard(async () => runSettingsExport("json"));
      if (act === "runSettingsExportZip") return withGuard(async () => runSettingsExport("zip"));
      if (act === "settingsExportSearchApps") return withGuard(runSettingsExportSearchApps);
      if (act === "prefetchCommonData") return withGuard(runPrefetchCommonData);
      if (act === "runDiffAndPlan") return withGuard(runDiffAndPreviewPlan);
      if (act === "runDiff") return withGuard(runDiff);
      if (act === "copyDiffSummary") return withGuard(async () => copyDiffSummaryToClipboard());
      if (act === "exportDiffJson") return withGuard(exportDiffJson);
      if (act === "exportDiffHtml") return withGuard(exportDiffHtml);
      if (act === "exportPatchJson") return withGuard(exportPatchJson);
      if (act === "exportBundleJson") return withGuard(exportBundleJson);
      if (act === "toggleDiffTheme") {
        state.diffViewTheme = state.diffViewTheme === "dark" ? "light" : "dark";
        syncDiffThemeButton();
        saveCurrentDialogState2();
        if (state.lastDiffRows.length) renderResultRows(state.lastDiffRows);
        setStatus(`比較ビューを${getThemeDisplayLabel(state.diffViewTheme)}テーマに切り替えました`);
        return;
      }
      if (act === "collapseDiffSections") {
        state.diffCollapsedSections = new Set((state.lastDiffRows || []).map((r) => r.sectionKey || r.section || "未分類"));
        if (state.lastDiffRows.length) renderResultRows(state.lastDiffRows);
        setStatus("比較ビューのセクションを全て折り畳みました");
        return;
      }
      if (act === "expandDiffSections") {
        state.diffCollapsedSections = /* @__PURE__ */ new Set();
        if (state.lastDiffRows.length) renderResultRows(state.lastDiffRows);
        setStatus("比較ビューのセクションを全て展開しました");
        return;
      }
      if (act === "diffScopeAll") {
        setScopeSelection(ui.diffScopes, true);
        setStatus("比較セクションを全選択しました");
        return;
      }
      if (act === "diffScopeNone") {
        setScopeSelection(ui.diffScopes, false);
        setStatus("比較セクションを全解除しました");
        return;
      }
      if (act === "selectVisibleDiffs") {
        state.diffSelectedIds = new Set(getRenderedDiffRows2().map((row) => row._id));
        renderResultRows(state.lastDiffRows);
        setStatus(`表示中の差分を選択しました (${state.diffSelectedIds.size}件)`);
        return;
      }
      if (act === "selectAllDiffs") {
        state.diffSelectedIds = new Set((state.lastDiffRows || []).map((row) => row._id));
        renderResultRows(state.lastDiffRows);
        setStatus(`全差分を選択しました (${state.diffSelectedIds.size}件)`);
        return;
      }
      if (act === "clearDiffSelection") {
        state.diffSelectedIds = /* @__PURE__ */ new Set();
        renderResultRows(state.lastDiffRows);
        setStatus("差分選択を解除しました");
        return;
      }
      if (act === "openDiffPopout") {
        const w = openDiffViewerPopout();
        if (!w) setStatus("別ウィンドウを開けませんでした（ポップアップがブロックされている可能性があります）", true);
        else setStatus("差分を別ウィンドウで開きました");
        return;
      }
      if (act === "diffUiPreset") {
        const pid = actEl.dataset.preset || "";
        applyDiffUiPreset(pid);
        saveCurrentDialogState2();
        setStatus("差分表示プリセットを適用しました");
        return;
      }
      if (act === "saveDiffSelectionSet") {
        try {
          saveDiffSelectionSet(ui.diffSelectionSetName?.value);
          setStatus("選択セットを保存しました");
        } catch (err) {
          setStatus(err.message || String(err), true);
        }
        return;
      }
      if (act === "loadDiffSelectionSet") {
        const name = ui.diffSelectionSetSelect?.value || "";
        const r = loadDiffSelectionSet(name);
        if (!r) {
          setStatus("読み込めるセットを選択してください", true);
          return;
        }
        saveCurrentDialogState2();
        setStatus(r.mismatch ? `選択を復元しました（比較条件が異なる可能性あり: ${r.restored}/${r.requested}件）` : `選択を復元しました (${r.restored}件)`);
        return;
      }
      if (act === "deleteDiffSelectionSet") {
        const name = ui.diffSelectionSetSelect?.value || "";
        if (!name) {
          setStatus("削除するセットを選んでください", true);
          return;
        }
        deleteDiffSelectionSet(name);
        setStatus(`選択セットを削除しました: ${name}`);
        return;
      }
      if (act === "dismissDiffOnboarding") {
        try {
          localStorage.setItem(DIFF_ONBOARDING_DISMISSED_KEY, "1");
        } catch (err) {
        }
        syncDiffOnboardingVisibility();
        return;
      }
      if (act === "importSourceBundle") return ui.sourceBundleFile.click();
      if (act === "importTargetBundle") return ui.targetBundleFile.click();
      if (act === "clearBundle") {
        state.importedSourceBundle = null;
        state.importedTargetBundle = null;
        state.importedSourceName = "";
        state.importedTargetName = "";
        state.lastDiffAt = null;
        state.lastDiffRows = [];
        state.lastFetchIssues = [];
        state.lastDiffSignature = "";
        state.lastApplyPlan = null;
        state.diffSelectedIds = /* @__PURE__ */ new Set();
        state.diffIgnoreSuggestions = [];
        state.reflectRows = [];
        state.reflectSelectedIds = /* @__PURE__ */ new Set();
        state.reflectNodeModes = {};
        state.reflectUndoStack = [];
        state.reflectRedoStack = [];
        state.reflectActiveNodeId = "";
        renderResultRows([]);
        renderDiffFilterOptions();
        renderReflectNodeList();
        renderBundleState();
        setStatus("バンドル読込を解除しました");
        return;
      }
      if (act === "addPresetKey") {
        const key = actEl.dataset.key;
        if (!key) return;
        const current = (ui.ignoreKeys.value || "").split(",").map((k) => k.trim()).filter(Boolean);
        if (!current.includes(key)) {
          current.push(key);
          ui.ignoreKeys.value = current.join(", ");
          renderIgnoreKeyChips();
          saveCurrentDialogState2();
        }
        return;
      }
      if (act === "addIgnoreKey") {
        addIgnoreKeyFromInput();
        return;
      }
      if (act === "removeIgnoreKey") {
        const key = actEl.dataset.key;
        if (!key) return;
        const current = (ui.ignoreKeys.value || "").split(",").map((k) => k.trim()).filter(Boolean).filter((k) => k !== key);
        ui.ignoreKeys.value = current.join(", ");
        renderIgnoreKeyChips();
        saveCurrentDialogState2();
        return;
      }
      if (act === "addLookupMapRow") {
        const container = getToolDocument().getElementById("u_lookupMapRows");
        if (!container) return;
        if (container.querySelector(".muted")) container.innerHTML = "";
        const i = container.querySelectorAll("[data-lookup-row]").length;
        const row = getToolDocument().createElement("div");
        row.className = "btns";
        row.style.marginTop = "4px";
        row.dataset.lookupRow = String(i);
        row.innerHTML = `<span style="align-self:center;font-size:11px;color:#64748b;white-space:nowrap">変換元</span><input type="text" class="lookup-from" value="" placeholder="AppID" style="flex:1;min-width:0"><span style="align-self:center;padding:0 4px;color:#64748b">→</span><span style="align-self:center;font-size:11px;color:#64748b;white-space:nowrap">変換先</span><input type="text" class="lookup-to" value="" placeholder="AppID" style="flex:1;min-width:0"><button type="button" class="btn sub" data-act="removeLookupMapRow" data-row="${i}" style="padding:4px 8px">×</button>`;
        container.appendChild(row);
        row.querySelector(".lookup-from").focus();
        return;
      }
      if (act === "removeLookupMapRow") {
        const row = e.target.closest("[data-lookup-row]");
        if (row) {
          row.remove();
          syncLookupMapFromRows();
          renderLookupMapRows();
          saveCurrentDialogState2();
        }
        return;
      }
      if (act === "applyScopeAll") {
        setScopeSelection(ui.applyScopes, true);
        renderReflectSidebar();
        renderReflectMainPanel();
        setStatus("反映セクションを全選択しました");
        return;
      }
      if (act === "applyScopeNone") {
        setScopeSelection(ui.applyScopes, false);
        renderReflectSidebar();
        renderReflectMainPanel();
        setStatus("反映セクションを全解除しました");
        return;
      }
      if (act === "applyScopeDiffOnly") {
        const diffCounts = getDiffCountsBySection2();
        [...ui.applyScopes.querySelectorAll('input[type="checkbox"]')].forEach((c) => {
          const dc = diffCounts[c.value];
          c.checked = !!(dc && dc.total > 0);
        });
        saveCurrentDialogState2();
        renderReflectSidebar();
        renderReflectMainPanel();
        setStatus("差分のあるセクションのみ選択しました");
        return;
      }
      if (act === "reflectModeSection") {
        ui.nodeMode.checked = false;
        state.reflectActiveSidebarSection = null;
        renderReflectModeUi();
        renderReflectMainPanel();
        setStatus("セクション反映モードに切り替えました");
        return;
      }
      if (act === "reflectModeNode") {
        if (ui.reflectSimpleMode?.checked) {
          setStatus("簡易表示中はノード選択に切り替えられません。「簡易表示」をオフにしてください。");
          return;
        }
        ui.nodeMode.checked = true;
        state.reflectActiveSidebarSection = null;
        renderReflectModeUi();
        if (state.lastDiffRows && state.lastDiffRows.length > 0 && !state.reflectRows.length) {
          loadReflectRowsFromLastDiff();
        }
        setStatus("ノード反映モードに切り替えました");
        return;
      }
      if (act === "loadReflectNodes") return withGuard(async () => {
        loadReflectRowsFromLastDiff();
      });
      if (act === "selectReflectNodesAll") {
        pushReflectUndo();
        state.reflectSelectedIds = new Set((state.reflectRows || []).map((r) => r._id));
        renderReflectNodeList();
        setStatus("反映ノードを全選択しました");
        return;
      }
      if (act === "clearReflectNodes") {
        pushReflectUndo();
        state.reflectSelectedIds = /* @__PURE__ */ new Set();
        renderReflectNodeList();
        setStatus("反映ノードを全解除しました");
        return;
      }
      if (act === "reflectUndo") {
        if (!undoReflectState()) {
          setStatus("Undoできる操作がありません");
          return;
        }
        renderReflectNodeList();
        setStatus("ノード操作をUndoしました");
        return;
      }
      if (act === "reflectRedo") {
        if (!redoReflectState()) {
          setStatus("Redoできる操作がありません");
          return;
        }
        renderReflectNodeList();
        setStatus("ノード操作をRedoしました");
        return;
      }
      if (act === "reflectModeAllSrc") return runReflectModeAll("src");
      if (act === "reflectModeAllTgt") return runReflectModeAll("tgt");
      if (act === "reflectModeVisibleSrc") return runReflectModeVisible("src");
      if (act === "reflectModeVisibleTgt") return runReflectModeVisible("tgt");
      if (act === "clearReflectNodeFilters") {
        if (ui.nodeSearch) ui.nodeSearch.value = "";
        if (ui.nodeFilterSection) ui.nodeFilterSection.value = "";
        if (ui.nodeFilterType) ui.nodeFilterType.value = "";
        if (ui.nodeFilterSeverity) ui.nodeFilterSeverity.value = "";
        state.reflectPropertyFilters = /* @__PURE__ */ new Set();
        renderReflectNodeList();
        setStatus("ノード絞り込み条件を解除しました");
        return;
      }
      if (act === "toggleReflectPropertyPanel") {
        state.reflectPropertyPanelOpen = !state.reflectPropertyPanelOpen;
        renderReflectNodeList();
        setStatus(`プロパティ選択を${state.reflectPropertyPanelOpen ? "表示" : "非表示"}にしました`);
        return;
      }
      if (act === "selectAllReflectProperties") {
        const keys = [...state.reflectRows || []].map((row) => {
          const path = String(row.path || "");
          const m = path.match(/(?:^|\.)(?:properties|fields)\.([^.[\]]+)/);
          if (m?.[1]) return m[1];
          const head = path.split(".")[0] || "";
          return head.includes("[") ? head.split("[")[0] : head;
        }).filter(Boolean);
        state.reflectPropertyFilters = new Set(keys);
        renderReflectNodeList();
        setStatus(`プロパティを全選択しました（${state.reflectPropertyFilters.size}件）`);
        return;
      }
      if (act === "clearReflectProperties") {
        state.reflectPropertyFilters = /* @__PURE__ */ new Set();
        renderReflectNodeList();
        setStatus("プロパティ選択を全解除しました");
        return;
      }
      if (act === "removeReflectPropertyFilter") {
        const key = actEl.dataset.prop;
        if (!key) return;
        if (!(state.reflectPropertyFilters instanceof Set)) state.reflectPropertyFilters = /* @__PURE__ */ new Set();
        state.reflectPropertyFilters.delete(key);
        renderReflectNodeList();
        setStatus(`プロパティ選択を解除しました: ${key}`);
        return;
      }
      if (act === "toggleActiveReflectNodeSelection") {
        const row = getActiveReflectRow();
        if (!row) {
          setStatus("操作対象のノードがありません");
          return;
        }
        pushReflectUndo();
        if (state.reflectSelectedIds.has(row._id)) state.reflectSelectedIds.delete(row._id);
        else state.reflectSelectedIds.add(row._id);
        renderReflectNodeList();
        setStatus(`ノード選択を${state.reflectSelectedIds.has(row._id) ? "追加" : "解除"}しました`);
        return;
      }
      if (act === "toggleActiveReflectNodeMode") {
        const row = getActiveReflectRow();
        if (!row) {
          setStatus("操作対象のノードがありません");
          return;
        }
        pushReflectUndo();
        state.reflectNodeModes[row._id] = reflectRowModeById(row._id) === "src" ? "tgt" : "src";
        renderReflectNodeList();
        setStatus(`ノードモード切替: ${state.reflectNodeModes[row._id] === "src" ? "比較元" : "比較先"}`);
        return;
      }
      if (act === "focusActiveReflectNodeDiff") {
        const row = getActiveReflectRow();
        if (!row) {
          setStatus("表示対象のノードがありません");
          return;
        }
        switchTab("diff");
        switchSubTab("diff", "view");
        if (ui.diffFilterSection) ui.diffFilterSection.value = row.sectionKey || "";
        state.diffFilterSection = row.sectionKey || "";
        if (ui.diffSearch) ui.diffSearch.value = row.path || "";
        renderResultRows(state.lastDiffRows);
        setStatus("差分比較タブで該当ノードを表示しました");
        return;
      }
      if (act === "previewApplyPlan" && typeof runPreviewApplyPlan2 === "function") return withGuard(runPreviewApplyPlan2);
      if (act === "backupTargetPreview" && typeof runBackupTargetPreview2 === "function") return withGuard(runBackupTargetPreview2);
      if (act === "applyPreview" && typeof runApplyPreview2 === "function") return withGuard(runApplyPreview2);
      if (act === "deployOnly" && typeof runDeployOnly2 === "function") return withGuard(runDeployOnly2);
      if (act === "togglePatchJsonPanel") {
        if (ui.reflectSimpleMode?.checked) {
          setStatus("簡易表示中はJSON差分反映を使えません。「簡易表示」をオフにしてください。");
          return;
        }
        state.patchJsonPanelOpen = !state.patchJsonPanelOpen;
        const panel = getToolDocument().getElementById("u_patchJsonPanel");
        if (panel) panel.style.display = state.patchJsonPanelOpen ? "block" : "none";
        return;
      }
      if (act === "patchJsonLoadFile") {
        const input = getToolDocument().getElementById("u_patchJsonFileInput");
        if (input) {
          input.value = "";
          input.click();
        }
        return;
      }
      if (act === "patchJsonClear") {
        state.importedPatchPayload = null;
        const editor = getToolDocument().getElementById("u_patchJsonEditor");
        if (editor) editor.value = "";
        if (typeof renderPatchJsonSummary === "function") renderPatchJsonSummary(null);
        setStatus("パッチJSONをクリアしました");
        return;
      }
      if (act === "applyPatchJson" && typeof runApplyPatchJson === "function") return withGuard(runApplyPatchJson);
      if (act === "applyField") return withGuard(runFieldApply);
      if (act === "loadTargetFields") return withGuard(runLoadTargetFields);
      if (act === "formatFieldJson") {
        try {
          const text = ui.fieldJson.value.trim();
          if (!text) throw new Error("フォーマットするJSONがありません");
          const parsed = JSON.parse(text);
          ui.fieldJson.value = JSON.stringify(parsed, null, 2);
          setStatus("フィールドJSONをフォーマットしました");
        } catch (e2) {
          setStatus(`フォーマットエラー: ${e2.message || String(e2)}`, true);
        }
        return;
      }
      if (act === "importFieldJson") return ui.fieldJsonFile.click();
      if (act === "exportFieldJson") {
        return withGuard(async () => {
          const { nowStamp: nowStamp2, downloadText: downloadText2 } = await Promise.resolve().then(() => (init_utils(), utils_exports));
          if (!ui.fieldJson.value.trim()) throw new Error("フィールドJSONが空です");
          const parsed = JSON.parse(ui.fieldJson.value);
          downloadText2(`fields_${nowStamp2()}.json`, JSON.stringify(parsed, null, 2), "application/json");
          setStatus("フィールドJSONを保存しました");
        });
      }
      if (act === "loadSourceFieldsList") return withGuard(runLoadSourceFieldsList);
      if (act === "insertSelectedSourceFields") return runInsertSelectedSourceFields();
      if (act === "closeSourceFieldsList") {
        ui.sourceFieldListContainer.style.display = "none";
        return;
      }
      if (act === "runBulkFieldRename" && typeof runBulkFieldRename === "function") return withGuard(runBulkFieldRename);
      if (act === "runDetectUnusedFields" && typeof runDetectUnusedFields === "function") return withGuard(runDetectUnusedFields);
      if (act === "exportDesignJson" && typeof runDesignExport2 === "function") return withGuard(() => runDesignExport2("json"));
      if (act === "exportDesignMd" && typeof runDesignExport2 === "function") return withGuard(() => runDesignExport2("md"));
      if (act === "copyDesignMd" && typeof runDesignCopyMd2 === "function") return withGuard(runDesignCopyMd2);
      if (act === "exportDesignXlsx" && typeof runDesignExportXlsx2 === "function") return withGuard(runDesignExportXlsx2);
      if (act === "exportDesignDiffMd" && typeof runDesignDiffMd2 === "function") return withGuard(runDesignDiffMd2);
      if (act === "generateFieldDepMap" && typeof runFieldDependencyMap2 === "function") return withGuard(runFieldDependencyMap2);
      if (act === "fetchJsConfig" && typeof runFetchJsConfig2 === "function") return withGuard(runFetchJsConfig2);
      if (act === "exportJsConfigJson" && typeof runExportJsConfig2 === "function") return withGuard(runExportJsConfig2);
      if (act === "importJsConfigJson") return ui.jsconfigFile.click();
      if (act === "applyJsConfig" && typeof runApplyJsConfig2 === "function") return withGuard(runApplyJsConfig2);
      if (act === "renderProcessFlow" && typeof runRenderProcessFlow2 === "function") return withGuard(runRenderProcessFlow2);
      if (act === "launchKintoneSql" && typeof launchKintoneSql2 === "function") return withGuard(launchKintoneSql2);
      if (act === "generateERDiagram" && typeof runGenerateERDiagram2 === "function") return withGuard(runGenerateERDiagram2);
      if (act === "exportERDiagramHtml" && typeof runExportERDiagramHtml2 === "function") return withGuard(runExportERDiagramHtml2);
      if (act === "runBatchProcess" && typeof runBatchProcess2 === "function") return withGuard(runBatchProcess2);
      if (act === "runBatchFileDownload" && typeof runBatchFileDownload2 === "function") return withGuard(runBatchFileDownload2);
      if (act === "runBatchJsConfigDownload" && typeof runBatchJsConfigDownload2 === "function") return withGuard(runBatchJsConfigDownload2);
      if (act === "loadViewsForProc" && typeof loadViewsForSelect2 === "function") return withGuard(async () => loadViewsForSelect2("u_batchProcViewSelect", "u_batchProcView"));
      if (act === "loadViewsForDl" && typeof loadViewsForSelect2 === "function") return withGuard(async () => loadViewsForSelect2("u_batchDlViewSelect", "u_batchDlView"));
      if (act === "loadViewsForCsv" && typeof loadViewsForSelect2 === "function") return withGuard(async () => loadViewsForSelect2("u_csvExportViewSelect", "u_csvExportView"));
      if (act === "runCsvExport" && typeof runCsvExport2 === "function") return withGuard(runCsvExport2);
      if (act === "runCsvImport" && typeof runCsvImport2 === "function") return withGuard(runCsvImport2);
      if (act === "exportDiffXlsx" && typeof exportDiffXlsx === "function") return withGuard(exportDiffXlsx);
      if (act === "runRecordCopy" && typeof runRecordCopy2 === "function") return withGuard(runRecordCopy2);
      if (act === "saveTemplate" && typeof saveTemplate2 === "function") return withGuard(saveTemplate2);
      if (act === "loadTemplate" && typeof loadTemplate2 === "function") return loadTemplate2();
      if (act === "deleteTemplate" && typeof deleteTemplate2 === "function") return deleteTemplate2();
      if (act === "simStart" && typeof runSimStart2 === "function") return withGuard(runSimStart2);
      if (act === "simExecuteAction" && typeof runSimExecuteAction2 === "function") return withGuard(runSimExecuteAction2);
      if (act === "runApiTester" && typeof runApiTester2 === "function") return runApiTester2();
    });
    refreshDiffSelectionSetDropdown();
    syncDiffOnboardingVisibility();
  }

  // src/tabs/design.js
  init_constants();
  init_state();
  init_utils();
  init_api();
  init_components();
  init_diff();
  init_dialog();
  init_engine();
  init_export();
  init_design_xlsx();
  async function runDesignExport(kind) {
    const c = commonParams();
    if (!c.source.appId) throw new Error("比較元アプリIDを入力してください");
    const scopes = SECTION_DEFS.map((s) => s.key);
    setStatus("設計情報を取得中...");
    const bundle = await fetchBundle({ ...c.source, sections: scopes, onProgress: (p, l) => setStatus(`取得中 ${Math.round(p * 100)}% (${l})`) });
    state.lastSourceBundle = bundle;
    if (kind === "json") {
      downloadText(`design_${bundle.appId}_${nowStamp()}.json`, JSON.stringify(bundle, null, 2), "application/json");
    } else {
      downloadText(`design_${bundle.appId}_${nowStamp()}.md`, bundleToMarkdown(bundle), "text/markdown");
    }
    setStatus(`設計書出力完了（App ${bundle.appId}）`);
  }
  async function runDesignCopyMd() {
    const c = commonParams();
    if (!c.source.appId) throw new Error("比較元アプリIDを入力してください");
    const scopes = SECTION_DEFS.map((s) => s.key);
    setStatus("設計情報を取得中...");
    const bundle = await fetchBundle({ ...c.source, sections: scopes, onProgress: (p, l) => setStatus(`取得中 ${Math.round(p * 100)}% (${l})`) });
    state.lastSourceBundle = bundle;
    const md = bundleToMarkdown(bundle);
    try {
      await navigator.clipboard.writeText(md);
      setStatus("設計書Markdownをクリップボードにコピーしました");
    } catch (e) {
      throw new Error(`クリップボードへのコピーに失敗しました: ${e.message}`);
    }
  }
  function simpleLineDiff(oStr, nStr) {
    const oLines = oStr.split("\n");
    const nLines = nStr.split("\n");
    const result = [];
    let i = 0, j = 0;
    while (i < oLines.length || j < nLines.length) {
      if (i < oLines.length && j < nLines.length && oLines[i] === nLines[j]) {
        result.push("  " + oLines[i]);
        i++;
        j++;
      } else {
        let rsI = -1, rsJ = -1;
        for (let k = 1; k < 60; k++) {
          if (i + k < oLines.length && oLines[i + k] === nLines[j]) {
            rsI = i + k;
            rsJ = j;
            break;
          }
          if (j + k < nLines.length && oLines[i] === nLines[j + k]) {
            rsI = i;
            rsJ = j + k;
            break;
          }
        }
        if (rsI !== -1) {
          if (rsI > i) {
            for (let scan = i; scan < rsI; scan++) result.push("- " + oLines[scan]);
            i = rsI;
          } else {
            for (let scan = j; scan < rsJ; scan++) result.push("+ " + nLines[scan]);
            j = rsJ;
          }
        } else {
          if (i < oLines.length) result.push("- " + oLines[i++]);
          if (j < nLines.length) result.push("+ " + nLines[j++]);
        }
      }
    }
    return result.join("\n");
  }
  async function runDesignDiffMd() {
    const c = commonParams();
    if (!c.source.appId || !c.target.appId) throw new Error("比較元と比較先の両方のアプリIDを指定してください。");
    const scopes = SECTION_DEFS.map((s) => s.key);
    setStatus("比較元の設計情報を取得中...");
    const srcBundle = await fetchBundle({ ...c.source, sections: scopes, onProgress: (p, l) => setStatus(`比較元取得中 ${Math.round(p * 100)}% (${l})`) });
    setStatus("比較先の設計情報を取得中...");
    const tgtBundle = await fetchBundle({ ...c.target, sections: scopes, onProgress: (p, l) => setStatus(`比較先取得中 ${Math.round(p * 100)}% (${l})`) });
    setStatus("差分レポート生成中...");
    const srcMd = bundleToMarkdown(srcBundle);
    const tgtMd = bundleToMarkdown(tgtBundle);
    const diffMd = simpleLineDiff(tgtMd, srcMd);
    const finalMd = `# 設計書差分レポート
- 生成日時: ${nowStamp()}
- 比較元App: ${c.source.appId} (追加/更新後)
- 比較先App: ${c.target.appId} (現在の設定)

\`\`\`diff
${diffMd}
\`\`\`
`;
    downloadText(`design_diff_report_${nowStamp()}.md`, finalMd, "text/markdown");
    setStatus("設計書差分レポートを出力しました");
  }
  async function runDesignExportXlsx() {
    const { runAdvancedDesignExporter: runXlsx } = await Promise.resolve().then(() => (init_design_xlsx(), design_xlsx_exports));
    const c = commonParams();
    if (!c.source.appId) throw new Error("比較元アプリIDを入力してください");
    const done = await runXlsx({
      appId: c.source.appId,
      guestId: c.source.guestId
    });
    if (done === false) {
      setStatus("設計書Excel出力をキャンセルしました");
      return;
    }
    setStatus("設計書Excel出力完了");
  }

  // src/tabs/er.js
  init_constants();
  init_state();
  init_utils();
  init_api();
  init_components();
  init_dialog();
  init_diff();
  init_enrich();
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
  function readErDiagramOptions() {
    const startAppId = String(ui.sourceApp?.value || "").trim();
    const layoutName = String(ui.erLayout?.value || ER_DEFAULTS.layoutName).trim() || ER_DEFAULTS.layoutName;
    const fieldDensity = String(ui.erFieldDensity?.value || ER_DEFAULTS.fieldDensity).trim() || ER_DEFAULTS.fieldDensity;
    const maxDepthRaw = String(ui.erMaxDepth?.value || "").trim();
    const maxDepthNum = Number(maxDepthRaw);
    const extraAppIds = String(ui.erExtraApps?.value || "").split(/[\s,，]+/).map((v) => v.trim()).filter((v) => /^\d+$/.test(v));
    const startAppIds = [startAppId, ...extraAppIds].filter((v, i, arr) => /^\d+$/.test(v) && arr.indexOf(v) === i);
    return {
      startAppId,
      startAppIds,
      layoutName,
      fieldDensity: ["compact", "standard", "full"].includes(fieldDensity) ? fieldDensity : ER_DEFAULTS.fieldDensity,
      maxDepth: Number.isFinite(maxDepthNum) && maxDepthNum >= 0 ? Math.floor(maxDepthNum) : ER_DEFAULTS.maxDepth,
      includeSubtableFields: !!ui.erIncludeSubtable?.checked,
      includeReverseLookup: !!ui.erIncludeReverseLookup?.checked,
      maxFields: ER_DEFAULTS.maxFields,
      sleepMs: ER_DEFAULTS.sleepMs,
      source: commonParams().source
    };
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
  var progressUi = /* @__PURE__ */ (() => {
    let el, bar, msg;
    return {
      init() {
        if (el) el.remove();
        el = document.createElement("div");
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
        document.body.appendChild(el);
        bar = el.querySelector("#_eb");
        msg = el.querySelector("#_em");
      },
      update(p, t) {
        if (bar) bar.style.width = p + "%";
        if (msg) msg.textContent = t;
      },
      close() {
        this.update(100, "完了！");
        setTimeout(() => {
          el.style.opacity = "0";
          setTimeout(() => el.remove(), 600);
        }, 2e3);
      },
      error(e) {
        this.update(100, "エラー: " + e);
        if (bar) bar.style.background = "#f44";
      }
    };
  })();
  var sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  var fetchAllApps = async (options) => {
    const prefix = buildApiPrefix(options?.source?.guestId, !!options?.source?.preview);
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
  var getSchema = async (appId, options, cache) => {
    if (cache.has(appId)) return cache.get(appId);
    try {
      const prefix = buildApiPrefix(options?.source?.guestId, !!options?.source?.preview);
      const [fR, aR, actionResp] = await Promise.all([
        apiGet(prefix, "/app/form/fields.json", { app: appId }),
        apiGet(prefix, "/app.json", { id: appId }),
        apiGet(prefix, "/app/actions.json", { app: appId }).catch(() => ({ actions: {} }))
      ]);
      const fields = [], relations = [];
      const walk = (props, parentTable = "", parentTableLabel = "") => {
        for (const [c, f] of Object.entries(props)) {
          if (["GROUP", "SPACER", "HR", "LABEL"].includes(f.type)) continue;
          if (f.type === "SUBTABLE") {
            fields.push({
              code: c,
              label: f.label,
              type: "SUBTABLE",
              sub: true,
              inSubtable: !!parentTable,
              tableCode: parentTable || "",
              tableLabel: parentTableLabel || "",
              path: c,
              displayPath: f.label ? `${f.label} [${c}]` : c
            });
            if (options?.includeSubtableFields) walk(f.fields, c, f.label || c);
            continue;
          }
          const hasLookupSetting = !!(f.lookup && typeof f.lookup === "object");
          const isL = hasLookupSetting;
          const isR = f.type === "REFERENCE_TABLE";
          const isPK = /^(\$id|record_number|レコード番号)$/i.test(c);
          const fieldPath = parentTable ? `${parentTable}.${c}` : c;
          const displayPath = parentTableLabel ? `${parentTableLabel} > ${f.label || c}` : f.label || c;
          fields.push({
            code: c,
            label: f.label || c,
            type: f.type,
            required: !!f.required,
            unique: !!f.unique,
            isPK,
            isLookup: isL,
            isRef: isR,
            inSubtable: !!parentTable,
            tableCode: parentTable || "",
            tableLabel: parentTableLabel || "",
            path: fieldPath,
            displayPath
          });
          if (isL && f.lookup?.relatedApp?.app) relations.push({
            from: c,
            fromPath: fieldPath,
            fromLabel: f.label || c,
            fromDisplay: displayPath,
            fromTableCode: parentTable || "",
            fromTableLabel: parentTableLabel || "",
            toApp: Number(f.lookup.relatedApp.app),
            toField: f.lookup.relatedKeyField,
            kind: "LOOKUP"
          });
          if (isR && f.referenceTable?.relatedApp?.app) relations.push({
            from: c,
            fromPath: fieldPath,
            fromLabel: f.label || c,
            fromDisplay: displayPath,
            fromTableCode: parentTable || "",
            fromTableLabel: parentTableLabel || "",
            toApp: Number(f.referenceTable.relatedApp.app),
            toField: f.referenceTable.condition?.field,
            kind: "REF"
          });
        }
      };
      walk(fR.properties);
      Object.values(actionResp?.actions || {}).forEach((action, index) => {
        const toApp = Number(action?.destApp?.app || 0);
        if (!toApp) return;
        relations.push({
          from: `__ACTION__${index}`,
          fromLabel: action?.name || `アクション${index + 1}`,
          toApp,
          toField: "",
          kind: "ACTION"
        });
      });
      const linkedFieldPaths = new Set(
        relations.filter((rel) => rel.kind === "LOOKUP" || rel.kind === "REF").map((rel) => String(rel.fromPath || rel.from || "").trim()).filter(Boolean)
      );
      const essentialFields = fields.filter((field) => {
        if (field.type === "SUBTABLE") return false;
        if (field.isPK || field.unique) return true;
        return linkedFieldPaths.has(String(field.path || field.code || "").trim());
      });
      const visibleFieldsSource = essentialFields.length ? essentialFields : fields.filter((field) => field.type !== "SUBTABLE").slice(0, 6);
      const visibleFields = visibleFieldsSource.slice(0, options?.maxFields || ER_DEFAULTS.maxFields);
      const r = {
        id: appId,
        name: aR.name,
        spaceId: aR.spaceId || null,
        threadId: aR.threadId || null,
        fields: visibleFields,
        relations,
        ok: true,
        createdAt: aR.createdAt,
        modifiedAt: aR.modifiedAt,
        requiredCount: visibleFields.filter((field) => !!field.required).length,
        lookupCount: relations.filter((rel) => rel.kind === "LOOKUP").length,
        refCount: relations.filter((rel) => rel.kind === "REF").length,
        sourceGuestId: options?.source?.guestId || ""
      };
      cache.set(appId, r);
      return r;
    } catch (e) {
      console.error(`App ${appId}:`, e);
      const r = { id: appId, name: `アプリ ${appId} (取得失敗)`, fields: [], relations: [], ok: false };
      cache.set(appId, r);
      return r;
    }
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
    const seeds = (Array.isArray(startIds) ? startIds : [startIds]).map((v) => Number(v)).filter((v) => Number.isFinite(v) && v > 0);
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
    const data = safeJsonForScript(apps);
    const diagramOptions = safeJsonForScript({
      startAppId: options.startAppId || "",
      startAppIds: Array.isArray(options.startAppIds) ? options.startAppIds : [options.startAppId || ""],
      layoutName: options.layoutName || ER_DEFAULTS.layoutName,
      fieldDensity: options.fieldDensity || ER_DEFAULTS.fieldDensity,
      maxDepth: options.maxDepth || 0,
      includeSubtableFields: !!options.includeSubtableFields,
      includeReverseLookup: !!options.includeReverseLookup,
      sourceGuestId: options.source?.guestId || "",
      sourcePreview: !!options.source?.preview
    });
    return (
      /*html*/
      `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>kintone ER図 v3</title>
<script src="${EXTERNAL_LIBRARIES.cytoscape.cdnUrl}"><\/script>
<script src="${EXTERNAL_LIBRARIES.dagre.cdnUrl}"><\/script>
<script src="${EXTERNAL_LIBRARIES.cytoscapeDagre.cdnUrl}"><\/script>
<style>
@import url('${EXTERNAL_LIBRARIES.googleFontsDmSansMono.cdnUrl}');

*{margin:0;padding:0;box-sizing:border-box;}

:root{
  --bg:#08090d;--surface:#11131a;--surface2:#181c27;--border:#262d3d;
  --text:#d8dee9;--dim:#636e83;--accent:#5eead4;--accent2:#818cf8;
  --lookup:#60a5fa;--ref:#34d399;--pk:#fbbf24;--req:#f87171;
  --radius:10px;
}
[data-theme="light"]{
  --bg:#f0f2f5;--surface:#ffffff;--surface2:#f7f8fa;--border:#d8dce6;
  --text:#1a1c23;--dim:#6b7280;--accent:#0d9488;--accent2:#6366f1;
  --lookup:#2563eb;--ref:#059669;--pk:#d97706;--req:#dc2626;
}

body{font-family:'DM Sans',sans-serif;background:var(--bg);color:var(--text);overflow:hidden;height:100vh;}

/* ── Command Palette ── */
#cmd-overlay{display:none;position:fixed;inset:0;z-index:500;background:rgba(0,0,0,0.55);backdrop-filter:blur(6px);justify-content:center;align-items:flex-start;padding-top:15vh;}
#cmd-overlay.open{display:flex;}
#cmd-box{width:520px;background:var(--surface);border:1px solid var(--border);border-radius:14px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,0.5);}
#cmd-input{width:100%;padding:16px 20px;border:none;background:transparent;color:var(--text);font-size:15px;font-family:inherit;outline:none;border-bottom:1px solid var(--border);}
#cmd-input::placeholder{color:var(--dim);}
#cmd-results{max-height:340px;overflow-y:auto;}
.cmd-item{padding:10px 20px;cursor:pointer;display:flex;align-items:center;gap:10px;font-size:13px;border-bottom:1px solid var(--border);}
.cmd-item:hover,.cmd-item.active{background:var(--surface2);}
.cmd-item .kbd{margin-left:auto;font-size:10px;padding:2px 7px;background:var(--surface2);border:1px solid var(--border);border-radius:4px;font-family:'DM Mono',monospace;color:var(--dim);}

/* ── Top Bar ── */
#topbar{
  position:fixed;top:0;left:0;right:0;z-index:100;
  display:flex;align-items:center;gap:6px;padding:8px 14px;
  background:linear-gradient(180deg,var(--bg) 82%,rgba(8,9,13,0.92));
  flex-wrap:wrap;overflow-x:hidden;white-space:normal;
}
#topbar::-webkit-scrollbar{display:none;}
#topbar h1{font-size:14px;font-weight:700;margin-right:6px;white-space:nowrap;
  background:linear-gradient(135deg,var(--accent),var(--accent2));-webkit-background-clip:text;-webkit-text-fill-color:transparent;}
.tb{padding:5px 12px;border:1px solid var(--border);border-radius:var(--radius);background:var(--surface);color:var(--text);font-size:11px;cursor:pointer;transition:.15s;font-family:inherit;white-space:nowrap;flex:0 0 auto;}
.tb:hover{border-color:var(--accent);color:var(--accent);}
.tb.active{background:var(--accent);color:#000;border-color:var(--accent);font-weight:600;}
.meta-pill{display:inline-flex;align-items:center;gap:4px;padding:4px 10px;border:1px solid var(--border);border-radius:999px;background:var(--surface2);font-size:10px;color:var(--dim);max-width:100%;flex-wrap:wrap;}
.meta-pill b{color:var(--text);font-weight:700;}
#topbar select.tb-select{padding:5px 8px;border:1px solid var(--border);border-radius:var(--radius);background:var(--surface2);color:var(--text);font-size:11px;font-family:inherit;outline:none;flex:0 0 auto;}
#topbar select.tb-select:focus{border-color:var(--accent);}
.sep{width:1px;height:20px;background:var(--border);margin:0 4px;}
#search-box{padding:5px 10px;border:1px solid var(--border);border-radius:var(--radius);background:var(--surface2);color:var(--text);font-size:11px;width:180px;font-family:inherit;outline:none;}
#search-box:focus{border-color:var(--accent);}
#search-box::placeholder{color:var(--dim);}
.spacer{flex:1 1 24px;}


@media (max-width: 1280px){
  #topbar{padding-right:10px;row-gap:8px;}
  #topbar .sep{display:none;}
  #search-box{width:min(220px,100%);flex:1 1 220px;}
}

/* ── Sidebar ── */
#sidebar{
  position:fixed;top:48px;left:0;bottom:0;width:280px;z-index:90;
  background:var(--surface);border-right:1px solid var(--border);
  transform:translateX(-100%);transition:transform .25s;overflow-y:auto;
  padding:14px;font-size:12px;
}
#sidebar.open{transform:translateX(0);}
#sidebar h3{font-size:13px;margin:14px 0 8px;color:var(--accent);font-weight:600;}
#sidebar h3:first-child{margin-top:0;}
.stat-row{display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid var(--border);}
.stat-val{font-weight:600;font-family:'DM Mono',monospace;color:var(--accent2);}
.app-list-item{padding:6px 8px;cursor:pointer;border-radius:6px;margin:2px 0;transition:.1s;}
.app-list-item:hover{background:var(--surface2);}
.app-list-item.highlighted{background:rgba(94,234,212,0.12);border:1px solid var(--accent);}
.filter-chip{display:inline-block;padding:3px 8px;margin:2px;border:1px solid var(--border);border-radius:20px;font-size:10px;cursor:pointer;transition:.1s;}
.filter-chip:hover,.filter-chip.active{background:var(--accent);color:#000;border-color:var(--accent);}

/* ── Detail Panel ── */
#detail{
  position:fixed;top:48px;right:0;width:360px;max-height:calc(100vh - 56px);
  overflow-y:auto;z-index:90;background:var(--surface);border-left:1px solid var(--border);
  padding:20px;display:none;
}
#detail.open{display:block;}
#detail h2{font-size:15px;margin-bottom:4px;color:var(--accent);}
#detail .app-meta{font-size:11px;color:var(--dim);margin-bottom:12px;}
.detail-chip-row{display:flex;gap:6px;flex-wrap:wrap;margin:8px 0 12px;}
.close-btn{position:absolute;top:12px;right:14px;background:none;border:none;color:var(--dim);font-size:16px;cursor:pointer;}
.field-group-title{font-size:11px;font-weight:600;color:var(--dim);margin:12px 0 6px;text-transform:uppercase;letter-spacing:.05em;}
.field-row{display:flex;align-items:center;gap:6px;padding:5px 8px;border-radius:6px;font-size:11px;font-family:'DM Mono',monospace;border-bottom:1px solid var(--border);}
.field-row:hover{background:var(--surface2);}
.field-icon{width:18px;text-align:center;flex-shrink:0;}
.field-name{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.field-type{color:var(--dim);font-size:10px;flex-shrink:0;}
.tag{display:inline-block;padding:1px 5px;border-radius:3px;font-size:9px;font-weight:600;margin-left:4px;}
.tag-pk{background:rgba(251,191,36,0.15);color:var(--pk);}
.tag-fk{background:rgba(96,165,250,0.15);color:var(--lookup);}
.tag-ref{background:rgba(52,211,153,0.15);color:var(--ref);}
.tag-req{background:rgba(248,113,113,0.12);color:var(--req);}
.tag-sub{background:rgba(99,110,131,0.15);color:var(--dim);}

/* ── Path Finder ── */
#pathfinder{
  position:fixed;bottom:16px;left:50%;transform:translateX(-50%);z-index:100;
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
  position:fixed;bottom:16px;right:16px;z-index:100;
  display:flex;gap:14px;padding:8px 14px;
  background:var(--surface);border:1px solid var(--border);
  border-radius:var(--radius);font-size:10px;
}
#legend span{display:flex;align-items:center;gap:4px;}
#legend i{display:inline-block;width:9px;height:9px;border-radius:2px;}
#legend .legend-toggle{cursor:pointer;padding:2px 6px;border:1px solid transparent;border-radius:8px;transition:.12s;}
#legend .legend-toggle:hover{background:var(--surface2);border-color:var(--border);}
#legend .legend-toggle.off{opacity:0.35;text-decoration:line-through;}

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
#modal{background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:24px;width:600px;max-height:80vh;overflow-y:auto;}
#modal h2{margin-bottom:10px;font-size:15px;}
#modal pre{background:var(--bg);padding:12px;border-radius:8px;font-size:11px;overflow-x:auto;white-space:pre-wrap;font-family:'DM Mono',monospace;color:var(--dim);max-height:400px;overflow-y:auto;border:1px solid var(--border);}
#modal .actions{margin-top:12px;display:flex;gap:8px;}
#modal .actions button{padding:7px 14px;border:1px solid var(--border);border-radius:8px;background:var(--surface);color:var(--text);cursor:pointer;font-family:inherit;font-size:12px;}
#modal .actions button.primary{background:var(--accent);color:#000;border-color:var(--accent);font-weight:600;}

/* ── Empty / Banner ── */
#banner{
  position:fixed;top:48px;left:16px;z-index:95;display:flex;gap:8px;flex-wrap:wrap;max-width:min(900px,calc(100vw - 32px));
  pointer-events:none;
}
#banner .meta-pill{pointer-events:auto;box-shadow:0 8px 20px rgba(0,0,0,0.18);}

/* ── Toast ── */
#toast{position:fixed;bottom:60px;left:50%;transform:translateX(-50%) translateY(20px);z-index:600;padding:8px 20px;background:var(--accent);color:#000;border-radius:8px;font-size:12px;font-weight:600;opacity:0;transition:.3s;pointer-events:none;}
#toast.show{opacity:1;transform:translateX(-50%) translateY(0);}

/* scrollbar */
::-webkit-scrollbar{width:5px;}::-webkit-scrollbar-track{background:transparent;}::-webkit-scrollbar-thumb{background:var(--border);border-radius:3px;}
</style>
</head>
<body>

<!-- Command Palette -->
<div id="cmd-overlay" onclick="if(event.target===this)closeCmd()">
  <div id="cmd-box">
    <input id="cmd-input" placeholder="コマンドを入力... (アプリ検索、エクスポート、レイアウト変更...)" oninput="filterCmd(this.value)">
    <div id="cmd-results"></div>
  </div>
</div>

<!-- Top Bar -->
<div id="topbar">
  <h1>⬡ kintone ER図</h1>
  <span class="meta-pill"><b>開始</b> ${esc((Array.isArray(options.startAppIds) ? options.startAppIds : [options.startAppId || ""]).filter(Boolean).join(", "))}</span>
  <span class="meta-pill" id="layout-pill"><b>レイアウト</b> ${esc(formatErLayoutLabel(options.layoutName))}</span>
  <span class="meta-pill"><b>表示密度</b> ${esc(String(options.fieldDensity || ER_DEFAULTS.fieldDensity))}</span>
  <span class="meta-pill"><b>探索深さ</b> ${esc(String(options.maxDepth || 0))}</span>
  <div class="sep"></div>
  <button class="tb" onclick="toggleSidebar()" title="Ctrl+B">📊 統計</button>
  <button class="tb" onclick="togglePathFinder()">🔍 経路探索</button>
  <div class="sep"></div>
  <button class="tb" data-layout-btn="dagre" onclick="setLayout('dagre')">Dagre</button>
  <button class="tb" data-layout-btn="cose" onclick="setLayout('cose')">自動配置</button>
  <button class="tb" data-layout-btn="grid" onclick="setLayout('grid')">グリッド</button>
  <button class="tb" data-layout-btn="circle" onclick="setLayout('circle')">円形</button>
  <button class="tb" data-layout-btn="breadthfirst" onclick="setLayout('breadthfirst')">ツリー</button>
  <button class="tb" data-layout-btn="concentric" onclick="setLayout('concentric')">同心円</button>
  <div class="sep"></div>
  <input id="search-box" placeholder="🔎 アプリ・フィールド検索 (Ctrl+F)" oninput="searchGraph(this.value)">
  <button class="tb active" id="focus-toggle-btn" onclick="toggleFocusMode()">🎯 関連強調 ON</button>
  <select id="focus-depth" class="tb-select" onchange="updateFocusOptions()">
    <option value="1">深さ1</option>
    <option value="2">深さ2</option>
    <option value="3">深さ3</option>
  </select>
  <select id="focus-direction" class="tb-select" onchange="updateFocusOptions()">
    <option value="both">双方向</option>
    <option value="out">出方向</option>
    <option value="in">入方向</option>
  </select>
  <button class="tb" onclick="clearFocus()">強調解除</button>
  <button class="tb active" id="rel-lookup-btn" onclick="toggleRelationKind('LOOKUP')">ルックアップ線</button>
  <button class="tb active" id="rel-ref-btn" onclick="toggleRelationKind('REF')">関連線</button>
  <button class="tb active" id="rel-action-btn" onclick="toggleRelationKind('ACTION')">アクション線</button>
  <button class="tb" onclick="removeSelectedRelations()">🗑 関連削除</button>
  <button class="tb" onclick="restoreRemovedRelations()">↺ 削除復元</button>
  <button class="tb" onclick="removeSelectedApps()">🗑 アプリ削除</button>
  <button class="tb" onclick="restoreRemovedApps()">↺ アプリ復元</button>
  <button class="tb" id="pin-btn" onclick="togglePinFromSelection()">📌 固定</button>
  <button class="tb" onclick="clearPins()">📍 固定解除</button>
  <div class="spacer"></div>
  <button class="tb" onclick="toggleMinimap()">🗺</button>
  <button class="tb" id="theme-btn" onclick="toggleTheme()">🌙</button>
  <button class="tb" onclick="openCmd()" title="Ctrl+K">⌘K</button>
  <div class="sep"></div>
  <button class="tb" onclick="fit()">📐 全体表示</button>
  <button class="tb" onclick="exportPNG()">PNG画像</button>
  <button class="tb" onclick="showMermaid()">Mermaid</button>
  <button class="tb" onclick="showDrawio()">draw.io</button>
  <button class="tb" onclick="showSQL()">SQL</button>
  <button class="tb" onclick="showPlantUML()">PlantUML</button>
  <button class="tb" onclick="showJSON()">JSON</button>
</div>

<div id="banner">
  <span class="meta-pill"><b>アプリ数</b> ${apps.length}</span>
  <span class="meta-pill"><b>ゲスト</b> ${esc(options.source?.guestId ? `ゲスト ${String(options.source.guestId)}` : "通常空間")}</span>
  <span class="meta-pill"><b>モード</b> ${options.source?.preview ? "プレビュー" : "本番"}</span>
  <span class="meta-pill"><b>サブテーブル</b> ${options.includeSubtableFields ? "ON" : "OFF"}</span>
</div>

<!-- Sidebar -->
<div id="sidebar">
  <h3>📊 統計サマリー</h3>
  <div id="stats-summary"></div>
  <h3>🏷 フィールドタイプフィルター</h3>
  <div id="type-filters"></div>
  <h3>📱 アプリ一覧</h3>
  <div id="app-list"></div>
</div>

<!-- Cytoscape -->
<div id="cy"></div>

<!-- Detail Panel -->
<div id="detail">
  <button class="close-btn" onclick="closeDetail()">✕</button>
  <h2 id="detail-title"></h2>
  <div class="app-meta" id="detail-meta"></div>
  <div id="detail-relations"></div>
  <div id="detail-fields"></div>
</div>

<!-- Path Finder -->
<div id="pathfinder">
  <span>経路:</span>
  <select id="pf-from"></select>
  <span>→</span>
  <select id="pf-to"></select>
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
  <span class="legend-toggle" id="legend-lookup-edge" onclick="toggleRelationKind('LOOKUP')"><i style="border:2px solid var(--lookup)"></i>ルックアップ線</span>
  <span class="legend-toggle" id="legend-ref-edge" onclick="toggleRelationKind('REF')"><i style="border:2px dashed var(--ref)"></i>関連線</span>
  <span class="legend-toggle" id="legend-action-edge" onclick="toggleRelationKind('ACTION')"><i style="border:2px dotted #f59e0b"></i>アクション線</span>
</div>

<!-- Minimap -->
<div id="minimap"><canvas id="minimap-canvas"></canvas></div>

<!-- Modal -->
<div id="modal-overlay" onclick="if(event.target===this)closeModal()">
  <div id="modal"><h2 id="modal-title"></h2><pre id="modal-content"></pre>
    <div class="actions">
      <button class="primary" onclick="copyModal()">📋 コピー</button>
      <button onclick="downloadModal()">💾 ダウンロード</button>
      <button onclick="closeModal()">閉じる</button>
    </div>
  </div>
</div>

<div id="toast"></div>

<script>
const APPS = ${data};
const ER_OPTIONS = ${diagramOptions};
const appMap = new Map(APPS.map(a=>[a.id,a]));
if (window.cytoscapeDagre) cytoscape.use(window.cytoscapeDagre);

// ─── Toast ───
function toast(msg){const t=document.getElementById("toast");t.textContent=msg;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),2000);}

// ─── Theme ───
const THEME_KEY = "kintone-erd-theme";
let isDark = localStorage.getItem(THEME_KEY) !== "light";
function readCssVar(name, fallback){
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}
function currentPalette(){
  return {
    text: readCssVar("--text", isDark ? "#d8dee9" : "#1a1c23"),
    dim: readCssVar("--dim", isDark ? "#636e83" : "#6b7280"),
    accent: readCssVar("--accent", isDark ? "#5eead4" : "#0d9488"),
    lookup: readCssVar("--lookup", isDark ? "#60a5fa" : "#2563eb"),
    ref: readCssVar("--ref", isDark ? "#34d399" : "#059669"),
    pk: readCssVar("--pk", isDark ? "#fbbf24" : "#d97706"),
    req: readCssVar("--req", isDark ? "#f87171" : "#dc2626"),
    bg: readCssVar("--bg", isDark ? "#08090d" : "#f0f2f5"),
    surface: readCssVar("--surface", isDark ? "#11131a" : "#ffffff"),
    surface2: readCssVar("--surface2", isDark ? "#181c27" : "#f7f8fa"),
    border: readCssVar("--border", isDark ? "#262d3d" : "#d8dce6")
  };
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
function visibleFieldsForNode(app){
  return (app.fields || []).filter(f=>ER_OPTIONS.includeSubtableFields || !f.inSubtable);
}
function buildFieldDisplayName(field){
  if(!field) return "";
  if(field.inSubtable && field.tableLabel) return field.tableLabel + " > " + (field.label || field.code || "");
  return field.label || field.code || field.path || "";
}
function buildNodeLabel(app){
  const limits = { compact: 8, standard: 14, full: 24 };
  const maxLines = limits[ER_OPTIONS.fieldDensity] || limits.standard;
  const fields = visibleFieldsForNode(app);
  const ordered = fields.slice().sort((a,b)=>{
    const score = (f)=> (f.isPK ? 0 : (f.isLookup ? 1 : (f.isRef ? 2 : (f.required ? 3 : (f.inSubtable ? 5 : 4)))));
    const diff = score(a) - score(b);
    if(diff !== 0) return diff;
    return String(buildFieldDisplayName(a) || a.code || '').localeCompare(String(buildFieldDisplayName(b) || b.code || ''));
  });
  const preview = ordered.slice(0, maxLines).map((f)=>fieldIconForLabel(f) + " " + buildFieldDisplayName(f).trim());
  if(ordered.length > maxLines) preview.push("… +" + (ordered.length - maxLines) + " 件");
  const meta = [
    "ID:" + app.id,
    "項目:" + fields.length,
    "関連:" + app.relations.length,
    "深さ:" + (app.depth || 0)
  ].join(" • ");
  return [app.name, meta, "─────────", ...preview].join("\\n");
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
  if(name === "dagre" && window.cytoscapeDagre){
    return Object.assign(base, { name: "dagre", rankDir: "LR", rankSep: 170, nodeSep: 48, edgeSep: 24, spacingFactor: 1.1 });
  }
  if(name === "grid") return Object.assign(base, { name: "grid", rows: Math.ceil(Math.sqrt(APPS.length || 1)) });
  if(name === "circle") return Object.assign(base, { name: "circle" });
  if(name === "breadthfirst") return Object.assign(base, { name: "breadthfirst", directed: true, spacingFactor: 1.6, circle: false });
  if(name === "concentric") return Object.assign(base, { name: "concentric", concentric: n => (n.data("relCount") || 0) + 1, levelWidth: () => 2 });
  return Object.assign(base, { name: "cose", nodeRepulsion: 900000, idealEdgeLength: 280, gravity: 0.22, numIter: 1400 });
}
function buildCyStyle(palette){
  return [
    {selector:"node",style:{
      "shape":"round-rectangle","label":"data(label)","text-valign":"center","text-halign":"center",
      "text-wrap":"wrap","text-max-width":"250px","font-size":"9.5px","line-height":"1.25",
      "font-family":"'DM Mono',monospace","color":palette.text,"text-outline-color":palette.surface,"text-outline-width":"1px",
      "background-color":palette.surface,"border-width":2,"border-color":palette.border,"padding":"15px","width":"label","height":"label"
    }},
    {selector:"node[?isError]",style:{"border-color":palette.req,"background-color":isDark ? "#220b12" : "#fff1f2"}},
    {selector:"node:selected",style:{"border-color":palette.accent,"border-width":4,"overlay-color":"transparent"}},
    {selector:"node.highlighted",style:{"border-color":palette.pk,"border-width":3,"background-color":isDark ? "#1a1805" : "#fffbeb"}},
    {selector:"node.path-node",style:{"border-color":"#f472b6","border-width":4,"background-color":isDark ? "#1a0a12" : "#fdf2f8"}},
    {selector:"node.focus-root",style:{"border-color":palette.accent,"border-width":4,"background-color":isDark ? "#042525" : "#ecfeff","z-index":999}},
    {selector:"node.focus-neighbor",style:{"border-color":"#67e8f9","border-width":3,"background-color":isDark ? "#061d2a" : "#ecfeff"}},
    {selector:"node.pinned-node",style:{"border-color":palette.pk,"border-width":4,"background-color":isDark ? "#2a1f05" : "#fff7ed"}},
    {selector:"node.isolated-by-filter",style:{"opacity":0.35}},
    {selector:"node.focus-dim",style:{"opacity":0.08}},
    {selector:"node.dimmed",style:{"opacity":0.14}},
    {selector:"node.app-manual-hidden",style:{"display":"none"}},
    {selector:'edge[kind="LOOKUP"]',style:{
      "width":2.5,"line-color":palette.lookup,"target-arrow-color":palette.lookup,"target-arrow-shape":"triangle",
      "source-arrow-shape":"circle","source-arrow-color":palette.lookup,"curve-style":"bezier",
      "label":"data(label)","font-size":"9px","color":palette.lookup,
      "text-outline-color":palette.bg,"text-outline-width":"2px",
      "text-background-color":palette.bg,"text-background-opacity":0.78,"text-background-padding":"3px"
    }},
    {selector:'edge[kind="REF"]',style:{
      "width":2,"line-color":palette.ref,"line-style":"dashed","target-arrow-color":palette.ref,
      "target-arrow-shape":"triangle","source-arrow-shape":"diamond","source-arrow-color":palette.ref,"curve-style":"bezier",
      "label":"data(label)","font-size":"9px","color":palette.ref,
      "text-outline-color":palette.bg,"text-outline-width":"2px",
      "text-background-color":palette.bg,"text-background-opacity":0.78,"text-background-padding":"3px"
    }},
    {selector:'edge[kind="ACTION"]',style:{
      "width":2.2,"line-color":"#f59e0b","line-style":"dotted","target-arrow-color":"#f59e0b",
      "target-arrow-shape":"triangle","source-arrow-shape":"none","curve-style":"bezier",
      "label":"data(label)","font-size":"9px","color":"#f59e0b",
      "text-outline-color":palette.bg,"text-outline-width":"2px",
      "text-background-color":palette.bg,"text-background-opacity":0.78,"text-background-padding":"3px"
    }},
    {selector:"edge.path-edge",style:{"width":4,"line-color":"#f472b6","target-arrow-color":"#f472b6","source-arrow-color":"#f472b6","z-index":999}},
    {selector:"edge.focus-edge",style:{"width":4,"line-color":palette.accent,"target-arrow-color":palette.accent,"source-arrow-color":palette.accent,"z-index":998}},
    {selector:"edge.rel-hidden",style:{"display":"none"}},
    {selector:"edge.rel-manual-hidden",style:{"display":"none"}},
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
  localStorage.setItem(THEME_KEY, isDark ? "dark" : "light");
  toast(isDark?"ダークモード":"ライトモード");
}
applyTheme();

// ─── Cytoscape Init ───
const elements=[];
APPS.forEach(app=>{
  elements.push({data:{
    id:"a"+app.id,
    label:buildNodeLabel(app),
    appId:app.id,
    isError:!app.ok,
    fieldCount:visibleFieldsForNode(app).length,
    relCount:app.relations.length,
    depth:app.depth || 0
  }});
});
let ei=0;
APPS.forEach(app=>{
  app.relations.forEach(r=>{
    if(appMap.has(r.toApp)){
      elements.push({data:{id:"e"+(ei++),source:"a"+app.id,target:"a"+r.toApp,kind:r.kind,label:r.fromDisplay || r.fromLabel || (r.kind==="LOOKUP"?"ルックアップ":(r.kind==="REF"?"関連":"アクション")),fromLabel:r.fromLabel,fromDisplay:r.fromDisplay || r.fromLabel || ""}});
    }
  });
});

const cy=cytoscape({
  container:document.getElementById("cy"),
  elements,
  style: buildCyStyle(currentPalette()),
  layout: buildLayoutOptions(ER_OPTIONS.layoutName || "dagre", true),
  minZoom:0.05,maxZoom:4,wheelSensitivity:0.25,
});

function applyCyTheme(){
  cy.style().fromJson(buildCyStyle(currentPalette())).update();
}
function syncLayoutButtons(name){
  document.querySelectorAll("[data-layout-btn]").forEach((btn)=>{
    btn.classList.toggle("active", btn.dataset.layoutBtn === name);
  });
}

function fit(){cy.fit(undefined,60);}
cy.one("layoutstop",()=>setTimeout(fit,200));
syncLayoutButtons(ER_OPTIONS.layoutName || "dagre");

// ─── Export ───
function exportPNG(){
  const b64 = cy.png({ full: true, scale: 2, bg: currentPalette().bg });
  const a = document.createElement("a");
  a.href = b64;
  a.download = "kintone_erd.png";
  a.click();
}
function exportSVG(){
  // cytoscape-svg plugin is not present, so we fallback to a simple message or a data-uri attempt.
  // Actually, standard cytoscape does not natively support SVG without an extension.
  // We can try to use JSON instead or alert the user.
  alert("SVGエクスポートには追加のプラグイン(cytoscape-svg)が必要です。PNGをご利用ください。");
}

// ─── Layout Switching ───
function setLayout(name){
  ER_OPTIONS.layoutName = name;
  syncLayoutButtons(name);
  const pill = document.getElementById("layout-pill");
  if(pill) pill.innerHTML = "<b>レイアウト</b> " + layoutDisplayName(name);
  cy.layout(buildLayoutOptions(name, false)).run();
  toast("レイアウト: "+name);
}

const relationKindState = { LOOKUP: true, REF: true, ACTION: true };
let focusMode = true;
let focusDepth = 1;
let focusDirection = "both";
let currentFocusNodeId = "";
let lastTappedNodeId = "";
const pinnedNodeIds = new Set();

function syncLegendState(){
  const lookup = document.getElementById("legend-lookup-edge");
  const ref = document.getElementById("legend-ref-edge");
  const action = document.getElementById("legend-action-edge");
  if(lookup) lookup.classList.toggle("off", !relationKindState.LOOKUP);
  if(ref) ref.classList.toggle("off", !relationKindState.REF);
  if(action) action.classList.toggle("off", !relationKindState.ACTION);
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
  cy.elements().addClass("focus-dim");
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

function toggleFocusMode(){
  focusMode = !focusMode;
  const btn = document.getElementById("focus-toggle-btn");
  if(btn){
    btn.classList.toggle("active", focusMode);
    btn.textContent = focusMode ? "🎯 関連強調 ON" : "🎯 関連強調 OFF";
  }
  if(!focusMode) clearFocus(true);
  else if(currentFocusNodeId) applyFocusToNode(cy.getElementById(currentFocusNodeId), true);
  toast(focusMode ? "関連強調 ON" : "関連強調 OFF");
}

function updateFocusOptions(){
  focusDepth = Number(document.getElementById("focus-depth")?.value || 1);
  focusDirection = document.getElementById("focus-direction")?.value || "both";
  if(focusMode && currentFocusNodeId) applyFocusToNode(cy.getElementById(currentFocusNodeId), true);
}


const manuallyRemovedEdgeIds = new Set();
const manuallyRemovedNodeIds = new Set();
const nodeHiddenEdgeIds = new Set();

function removeSelectedRelations(){
  const edges = cy.edges(":selected");
  if(!edges.length){toast("削除対象の関連線を選択してください");return;}
  edges.forEach((e)=>{ manuallyRemovedEdgeIds.add(e.id()); e.addClass("rel-manual-hidden"); });
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

function removeSelectedApps(){
  let nodes = cy.nodes(":selected").not(".app-manual-hidden");
  if(!nodes.length && lastTappedNodeId){
    const n = cy.getElementById(lastTappedNodeId);
    if(n.length && !n.hasClass("app-manual-hidden")) nodes = nodes.union(n);
  }
  if(!nodes.length){toast("削除対象のアプリを選択してください");return;}
  let edgeCount = 0;
  nodes.forEach((node)=>{
    manuallyRemovedNodeIds.add(node.id());
    node.addClass("app-manual-hidden");
    node.connectedEdges().forEach((edge)=>{
      nodeHiddenEdgeIds.add(edge.id());
      if(!edge.hasClass("rel-manual-hidden")) edgeCount += 1;
      edge.addClass("rel-manual-hidden");
    });
  });
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
updateFocusOptions();

// ─── Search & Highlight ───
function searchGraph(q){
  cy.elements().removeClass("highlighted dimmed");
  if(!q.trim()) return;
  const low=q.toLowerCase();
  const matched=cy.nodes().not(".app-manual-hidden").filter(n=>{
    const app=appMap.get(n.data("appId"));
    if(!app) return false;
    if(app.name.toLowerCase().includes(low)) return true;
    return visibleFieldsForNode(app).some(f=>buildFieldDisplayName(f).toLowerCase().includes(low)||(f.code||"").toLowerCase().includes(low)||String(f.path||"").toLowerCase().includes(low));
  });
  if(matched.length){
    matched.addClass("highlighted");
    const visibleEdges = matched.connectedEdges().filter(e=>!e.hasClass("rel-hidden") && !e.hasClass("rel-manual-hidden"));
    cy.elements().not(matched).not(visibleEdges).addClass("dimmed");
  }
}

// ─── Click Detail ───
cy.on("tap","node",e=>{
  lastTappedNodeId = e.target.id();
  const app=appMap.get(e.target.data("appId"));
  if(!app) return;
  const visibleFields = visibleFieldsForNode(app);
  const fieldGroups = detailFieldGroups(app);
  const p=document.getElementById("detail");
  document.getElementById("detail-title").textContent=app.name;
  document.getElementById("detail-meta").innerHTML="ID: "+app.id
    +(app.createdAt?" | 作成: "+new Date(app.createdAt).toLocaleDateString():"")
    +(app.modifiedAt?" | 更新: "+new Date(app.modifiedAt).toLocaleDateString():"");

  // Relations
  let relHtml="";
  if(app.relations.length){
    relHtml='<div class="field-group-title">リレーション</div>';
    app.relations.forEach(r=>{
      const tgt=appMap.get(r.toApp);
      const tName=tgt?tgt.name:"アプリ "+r.toApp;
      const icon=r.kind==="LOOKUP"?"🔗":(r.kind==="REF"?"📋":"⚡");
      const relationLabel = r.fromDisplay || r.fromLabel || r.from || '';
      relHtml+='<div class="field-row" style="cursor:pointer" onclick="focusApp('+r.toApp+')"><span class="field-icon">'+icon+'</span><span class="field-name" title="'+relationLabel+' → '+tName+'">'+relationLabel+' → '+tName+'</span><span class="field-type">'+(r.kind==="ACTION"?"ACTION(アクション)":r.kind)+'</span></div>';
    });
  }
  document.getElementById("detail-relations").innerHTML=relHtml;
  document.getElementById("detail-meta").innerHTML += '<div class="detail-chip-row">'
    + '<span class="meta-pill"><b>項目</b> '+visibleFields.length+'</span>'
    + '<span class="meta-pill"><b>ルックアップ</b> '+fieldGroups.lookup.length+'</span>'
    + '<span class="meta-pill"><b>関連</b> '+fieldGroups.ref.length+'</span>'
    + '<span class="meta-pill"><b>必須</b> '+fieldGroups.required.length+'</span>'
    + '<span class="meta-pill"><b>深さ</b> '+(app.depth || 0)+'</span>'
    + '</div>';

  // Fields grouped
  let fHtml="";
  const renderGroup=(title,fields,tagClass,tagLabel)=>{
    if(!fields.length) return;
    fHtml+='<div class="field-group-title">'+title+" ("+fields.length+")</div>";
    fields.forEach(f=>{
      let icon=fieldIconForLabel(f);
      let tags="";
      if(tagLabel) tags='<span class="tag '+tagClass+'">'+tagLabel+"</span>";
      if(f.required&&tagLabel!=="必須") tags+='<span class="tag tag-req">必須</span>';
      if(f.inSubtable) tags+='<span class="tag tag-sub">表</span>';
      if(f.unique) tags+='<span class="tag tag-pk">重複不可</span>';
      const fieldName = buildFieldDisplayName(f);
      const title = f.path && f.path !== f.code ? fieldName+' ['+f.path+']' : fieldName;
      fHtml+='<div class="field-row" title="'+title+'"><span class="field-icon">'+icon+'</span><span class="field-name">'+fieldName+tags+'</span><span class="field-type">'+f.type+"</span></div>";
    });
  };
  renderGroup("主キー",fieldGroups.pk,"tag-pk","PK");
  renderGroup("ルックアップ (FK)",fieldGroups.lookup,"tag-fk","FK");
  renderGroup("関連レコード",fieldGroups.ref,"tag-ref","REF");
  renderGroup("必須フィールド",fieldGroups.required,"tag-req","必須");
  renderGroup("サブテーブル",fieldGroups.subtable,"tag-sub","Table");
  renderGroup("その他フィールド",fieldGroups.normal,"","");
  document.getElementById("detail-fields").innerHTML=fHtml;

  p.classList.add("open");
  if(focusMode) applyFocusToNode(e.target);
});
cy.on("cxttap","node",e=>{
  const n = e.target;
  const oe = e.originalEvent || {};
  if(oe.altKey || oe.metaKey){
    manuallyRemovedNodeIds.add(n.id());
    n.addClass("app-manual-hidden");
    n.connectedEdges().forEach((edge)=>{ nodeHiddenEdgeIds.add(edge.id()); edge.addClass("rel-manual-hidden"); });
    applyRelationFilter();
    refreshAppList();
    if(focusMode && currentFocusNodeId) applyFocusToNode(cy.getElementById(currentFocusNodeId), true);
    toast("アプリを手動削除");
    return;
  }
  if(pinnedNodeIds.has(n.id())) unpinNode(n);
  else pinNode(n);
});
cy.on("cxttap","edge",e=>{
  const edge = e.target;
  manuallyRemovedEdgeIds.add(edge.id());
  edge.addClass("rel-manual-hidden");
  applyRelationFilter();
  if(focusMode && currentFocusNodeId) applyFocusToNode(cy.getElementById(currentFocusNodeId), true);
  toast("関連線を手動削除");
});
cy.on("tap",e=>{if(e.target===cy){closeDetail();cy.elements().removeClass("highlighted dimmed path-node path-edge");clearFocus(true);}});

function closeDetail(){document.getElementById("detail").classList.remove("open");}

function focusApp(id){
  const n=cy.getElementById("a"+id);
  if(n.length && !n.hasClass("app-manual-hidden")){
    cy.animate({center:{eles:n},zoom:1.5},{ duration:400 });
    n.select();
    if(focusMode) applyFocusToNode(n, true);
  }
}

// ─── Sidebar ───
function toggleSidebar(){document.getElementById("sidebar").classList.toggle("open");}

// Build stats
(function buildSidebar(){
  const totalFields=APPS.reduce((s,a)=>s+visibleFieldsForNode(a).length,0);
  const totalRels=APPS.reduce((s,a)=>s+a.relations.length,0);
  const lookups=APPS.reduce((s,a)=>s+a.relations.filter(r=>r.kind==="LOOKUP").length,0);
  const actions=APPS.reduce((s,a)=>s+a.relations.filter(r=>r.kind==="ACTION").length,0);
  const refs=totalRels-lookups-actions;
  const typeCount={};
  APPS.forEach(a=>visibleFieldsForNode(a).forEach(f=>{typeCount[f.type]=(typeCount[f.type]||0)+1;}));

  let html='<div class="stat-row"><span>アプリ数</span><span class="stat-val">'+APPS.length+'</span></div>';
  html+='<div class="stat-row"><span>総フィールド数</span><span class="stat-val">'+totalFields+'</span></div>';
  html+='<div class="stat-row"><span>ルックアップ数</span><span class="stat-val">'+lookups+'</span></div>';
  html+='<div class="stat-row"><span>関連レコード数</span><span class="stat-val">'+refs+'</span></div>';
  html+='<div class="stat-row"><span>アクション線数</span><span class="stat-val">'+actions+'</span></div>';
  html+='<div class="stat-row"><span>総リレーション</span><span class="stat-val">'+totalRels+'</span></div>';
  html+='<div class="stat-row"><span>エラーアプリ</span><span class="stat-val">'+APPS.filter(a=>!a.ok).length+'</span></div>';
  document.getElementById("stats-summary").innerHTML=html;

  // type filters
  let fHtml="";
  Object.entries(typeCount).sort((a,b)=>b[1]-a[1]).forEach(([t,c])=>{
    fHtml+='<span class="filter-chip" onclick="filterByType(this,\\''+t+'\\')" data-type="'+t+'">'+t+' ('+c+')</span>';
  });
  document.getElementById("type-filters").innerHTML=fHtml;

  refreshAppList();
})();

function refreshAppList(){
  let aHtml="";
  APPS.forEach(a=>{
    const visibleCount = visibleFieldsForNode(a).length;
    const node = cy.getElementById('a'+a.id);
    const hidden = node.length && node.hasClass('app-manual-hidden');
    const hiddenCls = hidden ? ' highlighted' : '';
    const hiddenMeta = hidden ? ' / 非表示' : '';
    aHtml+='<div class="app-list-item'+hiddenCls+'" onclick="focusApp('+a.id+')">'+a.name+' <span style="color:var(--dim);font-size:10px">('+visibleCount+' 項目 / '+a.relations.length+' 関連'+hiddenMeta+')</span></div>';
  });
  document.getElementById("app-list").innerHTML=aHtml;
}

function filterByType(el,type){
  el.classList.toggle("active");
  const active=[...document.querySelectorAll(".filter-chip.active")].map(e=>e.dataset.type);
  cy.elements().removeClass("highlighted dimmed");
  if(!active.length) return;
  const matched=cy.nodes().not(".app-manual-hidden").filter(n=>{
    const app=appMap.get(n.data("appId"));
    return app&&visibleFieldsForNode(app).some(f=>active.includes(f.type));
  });
  matched.addClass("highlighted");
  const visibleEdges = matched.connectedEdges().filter(e=>!e.hasClass("rel-hidden") && !e.hasClass("rel-manual-hidden"));
  cy.elements().not(matched).not(visibleEdges).addClass("dimmed");
}

// ─── Path Finder ───
function togglePathFinder(){
  const pf=document.getElementById("pathfinder");
  pf.classList.toggle("open");
  if(pf.classList.contains("open")){
    const opts=APPS.filter(a=>{ const n = cy.getElementById("a"+a.id); return n.length && !n.hasClass("app-manual-hidden"); }).map(a=>'<option value="a'+a.id+'">'+a.name+"</option>").join("");
    document.getElementById("pf-from").innerHTML=opts;
    document.getElementById("pf-to").innerHTML=opts;
  }
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
  cy.elements().not(path).addClass("dimmed");
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
  {label:"同心円 レイアウト",icon:"◎",action:()=>setLayout("concentric")},
  {label:"統計パネル",icon:"📊",action:toggleSidebar,keys:"Ctrl+B"},
  {label:"経路探索",icon:"🔍",action:togglePathFinder},
  {label:"関連強調 ON/OFF",icon:"🎯",action:toggleFocusMode,keys:"Shift+F"},
  {label:"関連強調解除",icon:"🧹",action:()=>clearFocus()},
  {label:"ルックアップ線 ON/OFF",icon:"🔗",action:()=>toggleRelationKind("LOOKUP")},
  {label:"関連線 ON/OFF",icon:"📋",action:()=>toggleRelationKind("REF")},
  {label:"アクション線 ON/OFF",icon:"⚡",action:()=>toggleRelationKind("ACTION")},
  {label:"選択関連を削除",icon:"🗑",action:removeSelectedRelations},
  {label:"削除関連を復元",icon:"↺",action:restoreRemovedRelations},
  {label:"選択アプリを削除",icon:"🗑📱",action:removeSelectedApps},
  {label:"削除アプリを復元",icon:"↺📱",action:restoreRemovedApps},
  {label:"選択ノード 固定/解除",icon:"📌",action:togglePinFromSelection,keys:"Shift+P"},
  {label:"固定を全解除",icon:"📍",action:clearPins},
  {label:"ミニマップ",icon:"🗺",action:toggleMinimap},
  {label:"テーマ切替",icon:"🌓",action:toggleTheme},
  {label:"PNG エクスポート",icon:"🖼",action:exportPNG},
  {label:"SVG エクスポート",icon:"📄",action:exportSVG},
  {label:"Mermaid エクスポート",icon:"🧜",action:showMermaid},
  {label:"draw.io エクスポート",icon:"📊",action:showDrawio},
  {label:"SQL DDL エクスポート",icon:"🗄",action:showSQL},
  {label:"PlantUML エクスポート",icon:"🌱",action:showPlantUML},
  {label:"JSON スキーマ エクスポート",icon:"{}",action:showJSON},
  {label:"ハイライト解除",icon:"✨",action:()=>{cy.elements().removeClass("highlighted dimmed path-node path-edge");document.getElementById("search-box").value="";clearFocus(true);}},
];

// Add app-focus commands
APPS.forEach(a=>{
  commands.push({label:"アプリ: "+a.name+" (ID:"+a.id+")",icon:"📱",action:()=>focusApp(a.id)});
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
  box.innerHTML=filtered.map((c,i)=>
    '<div class="cmd-item'+(i===0?" active":"")+'" onclick="runCmd('+commands.indexOf(c)+')"><span>'+c.icon+'</span><span>'+c.label+'</span>'+(c.keys?'<span class="kbd">'+c.keys+'</span>':'')+'</div>'
  ).join("");
}

function runCmd(idx){commands[idx].action();closeCmd();}

// ─── Keyboard Shortcuts ───
document.addEventListener("keydown",e=>{
  if(e.key==="k"&&(e.ctrlKey||e.metaKey)){e.preventDefault();openCmd();}
  if(e.key==="b"&&(e.ctrlKey||e.metaKey)){e.preventDefault();toggleSidebar();}
  if(e.key==="f"&&(e.ctrlKey||e.metaKey)){e.preventDefault();document.getElementById("search-box").focus();}
  if(e.key==="F"&&e.shiftKey){e.preventDefault();toggleFocusMode();}
  if(e.key==="P"&&e.shiftKey){e.preventDefault();togglePinFromSelection();}
  if(e.key==="0"&&(e.ctrlKey||e.metaKey)){e.preventDefault();fit();}
  if(e.key==="Escape"){closeCmd();closeDetail();closeModal();clearFocus(true);}
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
  const a=document.createElement("a");
  a.href=cy.png({bg:isDark?"#08090d":"#f0f2f5",full:true,scale:2});
  a.download="kintone_erd.png";a.click();toast("PNG ダウンロード");
}
function exportSVG(){
  if(typeof cy.svg !== "function"){
    toast("SVGエクスポートは未対応のためPNGを出力します");
    exportPNG();
    return;
  }
  const blob=new Blob([cy.svg({full:true,bg:isDark?"#08090d":"#f0f2f5"})],{type:"image/svg+xml"});
  const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="kintone_erd.svg";a.click();toast("SVG ダウンロード");
}

let _md={text:"",filename:""};
function openModal(t,text,fn){_md={text,filename:fn};document.getElementById("modal-title").textContent=t;document.getElementById("modal-content").textContent=text;document.getElementById("modal-overlay").classList.add("open");}
function closeModal(){document.getElementById("modal-overlay").classList.remove("open");}
function copyModal(){navigator.clipboard.writeText(_md.text).then(()=>toast("コピーしました！"));}
function downloadModal(){const b=new Blob([_md.text],{type:"text/plain"});const a=document.createElement("a");a.href=URL.createObjectURL(b);a.download=_md.filename;a.click();toast("ダウンロード: "+_md.filename);}

// safe name helper
const sn=s=>s.replace(/[^a-zA-Z0-9_\\u3000-\\u9FFF\\uF900-\\uFAFF]/g,"_").replace(/^_+|_+$/g,"")||"unnamed";

function showMermaid(){
  let m="erDiagram\\n";
  APPS.forEach(a=>{
    const n=sn(a.name);
    m+="  "+n+" {\\n";
    a.fields.forEach(f=>{
      if(f.type==="SUBTABLE") return;
      let com=""; if(f.isPK) com=" PK"; else if(f.isLookup) com=" FK";
      m+="    "+f.type.replace(/[^a-zA-Z0-9_]/g,"")+" "+sn(f.code)+com+"\\n";
    });
    m+="  }\\n";
  });
  APPS.forEach(a=>{
    a.relations.forEach(r=>{
      const t=appMap.get(r.toApp); if(!t) return;
      m+="  "+sn(a.name)+(r.kind==="LOOKUP"?" }o--|| ":" ||--o{ ")+sn(t.name)+' : "'+r.fromLabel+'"\\n';
    });
  });
  openModal("Mermaid ER図",m,"kintone_erd.mmd");
}

function showDrawio(){
  const esc=s=>s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
  let x='<mxfile host="app.diagrams.net"><diagram name="ER"><mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/>';
  APPS.forEach((a,i)=>{
    const nid="A"+a.id,col=4,px=i%col*600,py=Math.floor(i/col)*400,h=30+a.fields.length*26;
    x+='<mxCell id="'+nid+'" value="'+esc(a.name)+'" style="shape=table;startSize=30;container=1;childLayout=tableLayout;fillColor=#DDA0DD;rounded=1;" vertex="1" parent="1"><mxGeometry x="'+px+'" y="'+py+'" width="280" height="'+h+'" as="geometry"/></mxCell>';
    a.fields.forEach((f,fi)=>{
      let c="#FFF";if(f.isPK)c="#FFD700";else if(f.isLookup)c="#87CEFA";else if(f.isRef)c="#98FB98";else if(f.inSubtable)c="#F5F5F5";else if(f.required)c="#FFF0F5";
      let l=(f.isPK?"🔑 ":f.isLookup?"🔗 ":f.isRef?"📋 ":"")+(f.label||f.code)+" ["+f.code+"]";
      x+='<mxCell id="'+nid+"_F"+fi+'" value="'+esc(l)+'" style="shape=partialRectangle;fillColor='+c+';align=left;spacingLeft=6;strokeColor=#d0d0d0;" vertex="1" parent="'+nid+'"><mxGeometry width="280" height="26" as="geometry"/></mxCell>';
    });
  });
  let ec=0;
  APPS.forEach(a=>a.relations.forEach(r=>{
    if(!appMap.has(r.toApp)) return;
    const st=r.kind==="LOOKUP"?"edgeStyle=orthogonalEdgeStyle;rounded=1;endArrow=classic;startArrow=oval;strokeColor=#0066CC;strokeWidth=2;":"edgeStyle=orthogonalEdgeStyle;rounded=1;endArrow=classic;startArrow=diamond;dashed=1;strokeColor=#2E8B57;strokeWidth=2;";
    x+='<mxCell id="E'+(ec++)+'" value="'+(r.kind==="LOOKUP"?"ルックアップ":"関連")+'" style="'+st+'" edge="1" parent="1" source="A'+a.id+'" target="A'+r.toApp+'"><mxGeometry relative="1" as="geometry"/></mxCell>';
  }));
  x+="</root></mxGraphModel></diagram></mxfile>";
  openModal("draw.io 用XML",x,"kintone_erd.drawio");
}

function showSQL(){
  let sql="-- kintone ER図 → SQL DDL\\n-- 生成日時: "+new Date().toISOString()+"\\n\\n";
  const typeMap={SINGLE_LINE_TEXT:"VARCHAR(256)",MULTI_LINE_TEXT:"TEXT",NUMBER:"DECIMAL(18,4)",CALC:"DECIMAL(18,4)",
    RICH_TEXT:"TEXT",CHECK_BOX:"TEXT",RADIO_BUTTON:"VARCHAR(128)",DROP_DOWN:"VARCHAR(128)",MULTI_SELECT:"TEXT",
    DATE:"DATE",TIME:"TIME",DATETIME:"DATETIME",LINK:"VARCHAR(512)",FILE:"TEXT",
    USER_SELECT:"TEXT",ORGANIZATION_SELECT:"TEXT",GROUP_SELECT:"TEXT",
    RECORD_NUMBER:"INT AUTO_INCREMENT",CREATOR:"VARCHAR(128)",MODIFIER:"VARCHAR(128)",
    CREATED_TIME:"DATETIME",UPDATED_TIME:"DATETIME",STATUS:"VARCHAR(64)",
    STATUS_ASSIGNEE:"TEXT",CATEGORY:"TEXT",LOOKUP:"VARCHAR(256)",REFERENCE_TABLE:"-- ref"};

  APPS.forEach(a=>{
    const tbl=sn(a.name);
    sql+="CREATE TABLE "+tbl+" (\\n";
    const cols=[];
    a.fields.forEach(f=>{
      if(f.type==="SUBTABLE"||f.type==="REFERENCE_TABLE") return;
      const col=sn(f.code);
      const dt=typeMap[f.type]||"TEXT";
      if(dt.startsWith("--")) return;
      let line="  "+col+" "+dt;
      if(f.isPK) line+=" PRIMARY KEY";
      else if(f.required) line+=" NOT NULL";
      cols.push(line);
    });
    sql+=cols.join(",\\n")+"\\n);\\n\\n";
  });

  // Foreign keys
  APPS.forEach(a=>{
    a.relations.filter(r=>r.kind==="LOOKUP"&&appMap.has(r.toApp)).forEach(r=>{
      const t=appMap.get(r.toApp);
      sql+="ALTER TABLE "+sn(a.name)+" ADD CONSTRAINT fk_"+sn(a.name)+"_"+sn(r.from)+" FOREIGN KEY ("+sn(r.from)+") REFERENCES "+sn(t.name)+"("+sn(r.toField)+");\\n";
    });
  });
  openModal("SQL DDL",sql,"kintone_erd.sql");
}

function showPlantUML(){
  let p="@startuml\\n!theme cerulean\\nskinparam linetype ortho\\n\\n";
  APPS.forEach(a=>{
    const n=sn(a.name);
    p+="entity "+n+" {\\n";
    a.fields.forEach(f=>{
      if(f.type==="SUBTABLE"||f.type==="REFERENCE_TABLE") return;
      let prefix="  ";
      if(f.isPK) prefix="  * ";
      else if(f.isLookup) prefix="  # ";
      p+=prefix+sn(f.code)+" : "+f.type+(f.required?" <<required>>":"")+"\\n";
      if(f.isPK) p+="  --\\n";
    });
    p+="}\\n\\n";
  });
  APPS.forEach(a=>{
    a.relations.forEach(r=>{
      const t=appMap.get(r.toApp); if(!t) return;
      if(r.kind==="LOOKUP") p+=sn(a.name)+' }o--|| '+sn(t.name)+' : "'+r.fromLabel+'"\\n';
      else p+=sn(a.name)+' ||--o{ '+sn(t.name)+' : "'+r.fromLabel+'"\\n';
    });
  });
  p+="@enduml";
  openModal("PlantUML",p,"kintone_erd.puml");
}

function showJSON(){
  const schema={
    $schema:"https://json-schema.org/draft/2020-12/schema",
    title:"kintone ERスキーマ",
    generated:new Date().toISOString(),
    apps:APPS.map(a=>({
      id:a.id,name:a.name,
      fields:a.fields.map(f=>({code:f.code,label:f.label,type:f.type,required:f.required||false,isPrimaryKey:f.isPK||false,isLookup:f.isLookup||false,isRelatedRecord:f.isRef||false,inSubtable:f.inSubtable||false})),
      relations:a.relations.map(r=>({fromField:r.from,toApp:r.toApp,toField:r.toField,type:r.kind})),
    })),
  };
  openModal("JSON スキーマ",JSON.stringify(schema,null,2),"kintone_erd_schema.json");
}

// ─── Double-click to isolate ───
cy.on("dbltap","node",e=>{
  const n=e.target;
  const neighborhood=n.closedNeighborhood();
  cy.elements().addClass("dimmed");
  neighborhood.removeClass("dimmed").addClass("highlighted");
  toast("ダブルクリック: 接続アプリのみ表示（背景クリックで解除）");
});

// ─── Hover tooltip ───
let tipEl;
cy.on("mouseover","node",e=>{
  const app=appMap.get(e.target.data("appId"));
  if(!app) return;
  if(!tipEl){tipEl=document.createElement("div");Object.assign(tipEl.style,{position:"fixed",zIndex:"999",background:"var(--surface)",border:"1px solid var(--border)",borderRadius:"8px",padding:"8px 12px",fontSize:"11px",fontFamily:"'DM Mono',monospace",pointerEvents:"none",boxShadow:"0 4px 16px rgba(0,0,0,0.3)",maxWidth:"260px"});document.body.appendChild(tipEl);}
  tipEl.innerHTML="<b>"+app.name+"</b> (ID:"+app.id+")<br>項目: "+visibleFieldsForNode(app).length+" | 関連: "+app.relations.length+" | 深さ: "+(app.depth || 0);
  tipEl.style.display="block";
});
cy.on("mouseout","node",()=>{if(tipEl) tipEl.style.display="none";});
cy.on("mousemove",e=>{if(tipEl&&tipEl.style.display==="block"){tipEl.style.left=(e.originalEvent.clientX+14)+"px";tipEl.style.top=(e.originalEvent.clientY+14)+"px";}});
<\/script>
</body>
</html>`
    );
  };
  async function runGenerateERDiagram() {
    const options = readErDiagramOptions();
    if (!options.startAppIds?.length) throw new Error("比較元アプリID（および追加起点ID）を入力してください");
    const popup = getToolWindow().open("", "_blank");
    if (!popup) throw new Error("別タブを開けませんでした。ポップアップブロックを確認してください");
    popup.document.write('<title>ER図</title><body style="font-family:sans-serif;padding:24px">ER図を生成中...</body>');
    setStatus(`ER図の解析を開始します... 起点 ${options.startAppIds.join(",")} / ${formatErLayoutLabel(options.layoutName)} / ${options.fieldDensity}`);
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
      setStatus(`ER図の生成完了: ${apps.length}アプリを別タブ表示しました`);
      setTimeout(() => URL.revokeObjectURL(url), 60 * 1e3);
    } catch (e) {
      try {
        popup.close();
      } catch (e2) {
      }
      progressUi.error(e.message || String(e));
      throw e;
    }
  }
  async function runExportERDiagramHtml() {
    const options = readErDiagramOptions();
    if (!options.startAppIds?.length) throw new Error("比較元アプリID（および追加起点ID）を入力してください");
    setStatus(`ER図HTMLを生成します... 起点 ${options.startAppIds.join(",")}`);
    progressUi.init();
    progressUi.update(4, `開始: 起点 ${options.startAppIds.join(",")}`);
    try {
      const apps = await crawl(options.startAppIds, options);
      progressUi.update(94, "HTML保存データ生成中...");
      const html = buildHTML(apps, options);
      const guestSuffix = options.source?.guestId ? `_guest${options.source.guestId}` : "";
      const previewSuffix = options.source?.preview ? "_preview" : "_prod";
      downloadText(
        `kintone_erd_app${options.startAppId}${guestSuffix}${previewSuffix}_${nowStamp()}.html`,
        html,
        "text/html"
      );
      progressUi.close();
      setStatus(`ER図HTMLを保存しました (${apps.length}アプリ)`);
    } catch (e) {
      progressUi.error(e.message || String(e));
      throw e;
    }
  }
  async function runFieldDependencyMap() {
    const srcAppId = ui.sourceApp?.value?.trim();
    if (!srcAppId) throw new Error("比較元アプリIDが指定されていません");
    const guestId = ui.sourceGuest?.value?.trim() || null;
    const popup = getToolWindow().open("", "_blank");
    if (!popup) throw new Error("別タブを開けませんでした。ポップアップブロックを確認してください");
    popup.document.write('<title>フィールド依存関係マップ</title><body style="font-family:sans-serif;padding:24px">依存関係マップを生成中...</body>');
    setBusy(true, "比較元アプリの全設定を取得中...");
    const sections = SECTION_DEFS.map((s) => s.key);
    const bundle = await fetchBundle({ appId: srcAppId, guestId, preview: true, sections, onProgress: (p, l) => setStatus(`取得中 ${Math.round(p * 100)}% (${l})`) });
    ensureBundleShape(bundle);
    setBusy(true, "依存関係を解析中...");
    const index = buildCombinedFieldImpactIndex(bundle);
    const refs = index.refs || {};
    const elements = [];
    const nodeSet = /* @__PURE__ */ new Set();
    const addNode = (id, label) => {
      if (!nodeSet.has(id)) {
        elements.push({ data: { id, label } });
        nodeSet.add(id);
      }
    };
    let edgeCount = 0;
    for (const [targetCode, usages] of Object.entries(refs)) {
      addNode(targetCode, targetCode);
      for (const usage of usages) {
        const srcCode = usage.sourceCode || usage.sourceSection;
        const reason = usage.reason || usage.sourceSection;
        addNode(srcCode, srcCode);
        elements.push({
          data: {
            id: `edge_${edgeCount++}`,
            source: srcCode,
            target: targetCode,
            label: reason
          }
        });
      }
    }
    if (elements.length === 0) {
      try {
        popup.close();
      } catch (e) {
      }
      alert("フィールド間の依存関係（計算式等）は見つかりませんでした。");
      setBusy(false);
      return;
    }
    setStatus(`マップ生成準備完了 (ノード=${nodeSet.size}, エッジ=${edgeCount})`);
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>フィールド依存関係マップ - App ${srcAppId}</title>
  <script src="${EXTERNAL_LIBRARIES.cytoscape.altCdnUrl}"><\/script>
  <script src="${EXTERNAL_LIBRARIES.dagre.cdnUrl}"><\/script>
  <script src="${EXTERNAL_LIBRARIES.cytoscapeDagre.altCdnUrl}"><\/script>
  <style>
    body { font-family: sans-serif; margin: 0; padding: 0; display: flex; flex-direction: column; height: 100vh; background: #f8fafc; }
    #header { padding: 12px 20px; background: #fff; border-bottom: 1px solid #cbd5e1; display: flex; align-items: center; justify-content: space-between; }
    h1 { margin: 0; font-size: 16px; color: #1e293b; }
    #cy { flex: 1; position: relative; }
    .btn { padding: 6px 12px; font-size: 13px; background: #0ea5e9; color: #fff; border: none; border-radius: 4px; cursor: pointer; }
    .btn:hover { background: #0284c7; }
  </style>
</head>
<body>
  <div id="header">
    <h1>フィールド依存関係マップ (App: ${srcAppId})</h1>
    <button class="btn" onclick="cy.layout({name:'dagre', rankDir:'LR'}).run()">再レイアウト</button>
  </div>
  <div id="cy"></div>
  <script>
    const elements = ${JSON.stringify(elements)};
    const cy = cytoscape({
      container: document.getElementById('cy'),
      elements: elements,
      style: [
        {
          selector: 'node',
          style: {
            'label': 'data(label)',
            'font-size': '12px',
            'text-valign': 'center',
            'text-halign': 'center',
            'background-color': '#e2e8f0',
            'border-width': 1,
            'border-color': '#94a3b8',
            'color': '#0f172a',
            'padding': '10px',
            'shape': 'round-rectangle',
            'width': 'label',
            'height': 'label'
          }
        },
        {
          selector: 'edge',
          style: {
            'width': 2,
            'line-color': '#94a3b8',
            'target-arrow-color': '#94a3b8',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
            'label': 'data(label)',
            'font-size': '10px',
            'color': '#64748b',
            'text-background-opacity': 1,
            'text-background-color': '#f8fafc',
            'text-background-padding': '2px',
          }
        }
      ],
      layout: {
        name: 'dagre',
        rankDir: 'LR',
        nodeSep: 60,
        rankSep: 100
      }
    });
  <\/script>
</body>
</html>`;
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    popup.location.href = url;
    setTimeout(() => URL.revokeObjectURL(url), 60 * 1e3);
    setBusy(false);
  }

  // src/tabs/jsconfig.js
  init_state();
  init_utils();
  init_api();
  init_components();
  init_dialog();
  init_diff();
  init_helpers();
  function renderCustomizeResult(data) {
    if (!data) {
      ui.jsconfigResult.innerHTML = '<div style="padding:10px;font-size:12px;color:#64748b">データがありません</div>';
      return;
    }
    const categories = [
      { label: "デスクトップ JS", items: data.desktop?.js || [] },
      { label: "デスクトップ CSS", items: data.desktop?.css || [] },
      { label: "モバイル JS", items: data.mobile?.js || [] },
      { label: "モバイル CSS", items: data.mobile?.css || [] }
    ];
    const totalCount = categories.reduce((s, c) => s + c.items.length, 0);
    const header = `<div style="padding:8px 10px;border-bottom:1px solid #e2e8f0;font-size:11px;background:#f8fafc">合計: ${totalCount}件 (Desktop JS:${categories[0].items.length} CSS:${categories[1].items.length} / Mobile JS:${categories[2].items.length} CSS:${categories[3].items.length})</div>`;
    const rows = [];
    for (const cat of categories) {
      if (!cat.items.length) continue;
      for (const item of cat.items) {
        const fileType = item.type || "-";
        const src = item.type === "URL" ? item.url || "-" : item.file?.name || item.file?.fileKey || "(アップロードファイル)";
        rows.push(`<tr>
        <td>${esc(cat.label)}</td>
        <td><span style="display:inline-block;padding:2px 6px;border-radius:4px;font-size:10px;font-weight:700;background:${fileType === "URL" ? "#dbeafe" : "#dcfce7"};color:${fileType === "URL" ? "#1d4ed8" : "#166534"}">${esc(fileType)}</span></td>
        <td style="word-break:break-all">${esc(src)}</td>
      </tr>`);
      }
    }
    if (!rows.length) {
      ui.jsconfigResult.innerHTML = '<div style="padding:10px;font-size:12px;color:#15803d">JS/CSS設定は空です。</div>';
      return;
    }
    ui.jsconfigResult.innerHTML = `${header}<table>
    <thead><tr><th>カテゴリ</th><th>タイプ</th><th>ソース</th></tr></thead>
    <tbody>${rows.join("")}</tbody>
  </table>`;
  }
  async function runFetchJsConfig() {
    const c = commonParams();
    if (!c.source.appId) throw new Error("比較元アプリIDを入力してください");
    const isPreview = !!ui.jsconfigPreview.checked;
    const prefix = buildApiPrefix(c.source.guestId, isPreview);
    setStatus("JS/CSS設定を取得中...");
    const res = await apiGet(prefix, "/app/customize.json", { app: c.source.appId });
    const data = normalize(res);
    ui.jsconfigJson.value = JSON.stringify(data, null, 2);
    renderCustomizeResult(data);
    setStatus(`JS/CSS設定を取得しました（アプリ: ${c.source.appId}${isPreview ? " / プレビュー" : ""}）`);
  }
  async function runExportJsConfig() {
    const text = ui.jsconfigJson.value.trim();
    if (!text) throw new Error("先にJS/CSS設定を取得してください");
    const parsed = JSON.parse(text);
    const c = commonParams();
    const appId = c.source.appId || "unknown";
    downloadText(`customize_${appId}_${nowStamp()}.json`, JSON.stringify(parsed, null, 2), "application/json");
    setStatus("JS/CSS設定JSONを保存しました");
  }
  async function runApplyJsConfig() {
    const c = commonParams();
    if (!c.target.appId) throw new Error("比較先アプリIDを入力してください");
    const text = ui.jsconfigJson.value.trim();
    if (!text) throw new Error("JS/CSS設定JSONを入力してください");
    const parsed = JSON.parse(text);
    if (!parsed || typeof parsed !== "object") throw new Error("JSONはオブジェクト形式で入力してください");
    const body = {
      app: c.target.appId,
      desktop: parsed.desktop || {},
      mobile: parsed.mobile || {}
    };
    if (!window.confirm(`JS/CSS設定を比較先(プレビュー)へ反映しますか？
比較先アプリ: ${c.target.appId}`)) {
      setStatus("JS/CSS設定反映をキャンセルしました");
      return;
    }
    const prefix = buildApiPrefix(c.target.guestId, true);
    setStatus("JS/CSS設定を反映中...");
    await apiPut(prefix, "/app/customize.json", body);
    const logs = [`OK JS/CSS設定反映（アプリ: ${c.target.appId}）`];
    if (ui.jsconfigDeployAfter.checked) {
      setStatus("デプロイ実行中...");
      const st = await deployAndPoll(prefix, c.target.appId, logs);
      logs.push(st === "SUCCESS" ? "OK デプロイ完了" : `NG デプロイ終了ステータス: ${st}`);
    }
    ui.result.innerHTML = `<pre style="margin:0;padding:10px;font-size:12px;white-space:pre-wrap">${esc(logs.join("\n"))}</pre>`;
    setStatus("JS/CSS設定反映完了");
  }
  async function runBatchJsConfigDownload() {
    setStatus("対象スペースの全アプリを取得中...");
    const apps = await getAllAppsInSpace(false);
    if (apps.length === 0) throw new Error("アプリが見つかりませんでした。");
    const seen = /* @__PURE__ */ new Set();
    const uniqueApps = apps.filter((app) => {
      const key = `${app.appId}_${app.spaceId || "null"}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    setStatus(`${uniqueApps.length}個のアプリ設定を解析中...`);
    const JSZipCtor = await loadJSZip();
    const zip = new JSZipCtor();
    let hasFiles = false;
    let failedCount = 0;
    for (let i = 0; i < uniqueApps.length; i++) {
      const app = uniqueApps[i];
      const { appId, name, spaceId } = app;
      const safeName = name.replace(/[\\/:*?"<>|]/g, "_");
      const guestSpaceId = spaceId ? parseInt(spaceId, 10) : null;
      setStatus(`[${i + 1}/${uniqueApps.length}] アプリ "${safeName}" (${appId}) をチェック...`);
      let customize = null;
      try {
        let prefix = getSideApiPrefix(false, false);
        if (guestSpaceId) {
          prefix = `/k/guest/${guestSpaceId}/v1`;
        }
        customize = await apiGet(prefix, "/app/customize.json", { app: appId });
      } catch (e) {
        console.warn(`アプリ ${appId} (${name}) のカスタマイズ取得失敗`);
        failedCount++;
        continue;
      }
      const files = [...customize?.desktop?.js || [], ...customize?.mobile?.js || []];
      const fileTargets = files.filter((f) => f.type === "FILE");
      if (fileTargets.length === 0) continue;
      const folderName = guestSpaceId ? `guest${guestSpaceId}_${appId}_${safeName}` : `${appId}_${safeName}`;
      const appFolder = zip.folder(folderName);
      for (const file of fileTargets) {
        const blob = await downloadBlobWithRetry(file.file.fileKey, false, guestSpaceId);
        if (blob) {
          appFolder.file(file.file.name, blob);
          hasFiles = true;
        }
      }
      await new Promise((r) => setTimeout(r, 100));
    }
    if (!hasFiles) {
      setStatus(`対象ファイルがありません。(403エラー: ${failedCount}件スキップ)`, true);
      return;
    }
    setStatus("ZIPファイル作成中...");
    const zipBlob = await zip.generateAsync({ type: "blob" });
    const doc = getToolDocument();
    const a = doc.createElement("a");
    const u = URL.createObjectURL(zipBlob);
    a.href = u;
    a.download = "customize_scripts.zip";
    doc.body.appendChild(a);
    a.click();
    setTimeout(() => {
      doc.body.removeChild(a);
      URL.revokeObjectURL(u);
    }, 100);
    setStatus(`JS/CSS一括DL完了 (403スキップ: ${failedCount}件)`);
  }

  // src/tabs/process.js
  init_state();
  init_utils();
  init_api();
  init_components();
  init_diff();
  init_dialog();
  var pfSimStates = null;
  var pfSimActions = null;
  var pfSimCurrent = null;
  async function ensureMermaid() {
    if (window.mermaid) return window.mermaid;
    setStatus("Mermaid.js を読み込み中...");
    await loadScript("https://cdn.jsdelivr.net/npm/mermaid@10.6.1/dist/mermaid.min.js");
    if (window.mermaid) {
      window.mermaid.initialize({ startOnLoad: false, theme: "default" });
      return window.mermaid;
    }
    throw new Error("Mermaid.js の読み込みに失敗しました");
  }
  function loadScript(url) {
    return new Promise((resolve, reject) => {
      const doc = getToolDocument();
      const s = doc.createElement("script");
      s.src = url;
      s.async = true;
      s.onload = resolve;
      s.onerror = () => reject(new Error(`スクリプト読み込み失敗: ${url}`));
      doc.head.appendChild(s);
    });
  }
  async function redrawProcessFlow(highlightState) {
    if (!pfSimStates) return;
    let md = "stateDiagram-v2\n";
    const safeStateName = (n) => n.replace(/[*_~\[\]()]/g, "");
    const startStates = new Set(Object.keys(pfSimStates));
    for (const a of pfSimActions) {
      if (a.to) startStates.delete(a.to);
    }
    for (const st of startStates) {
      if (st && pfSimStates[st]) md += `    [*] --> ${safeStateName(st)}
`;
    }
    for (const a of pfSimActions) {
      const from = safeStateName(a.from);
      const to = safeStateName(a.to);
      const actionName = a.name.replace(/[*_~\[\]()"]/g, "");
      md += `    ${from} --> ${to} : ${actionName}
`;
    }
    if (highlightState) {
      md += `
    classDef current fill:#bbf7d0,stroke:#16a34a,stroke-width:2px,color:#0f172a;
`;
      md += `    class ${safeStateName(highlightState)} current;
`;
    }
    ui.mermaidText.value = md;
    try {
      const mermaidObj = await ensureMermaid();
      const { svg } = await mermaidObj.render("mermaid-svg-generated", md);
      ui.mermaidView.innerHTML = svg;
    } catch (e) {
      ui.mermaidView.innerHTML = `<div style="color:#b91c1c">エラー: ${esc(e.message || String(e))}</div>`;
      throw e;
    }
  }
  function updateProcessSimulationUI() {
    const elCurr = getToolDocument().getElementById("u_simCurrentStatus");
    const elSel = getToolDocument().getElementById("u_simActionSelect");
    const container = getToolDocument().getElementById("u_simContainer");
    if (!pfSimStates || Object.keys(pfSimStates).length === 0) {
      if (container) container.style.display = "none";
      return;
    }
    if (container) container.style.display = "block";
    if (!pfSimCurrent) {
      elCurr.textContent = "未開始";
      elCurr.style.background = "#e2e8f0";
      elSel.innerHTML = '<option value="">-- 最初から開始してください --</option>';
      elSel.disabled = true;
      return;
    }
    elCurr.textContent = pfSimCurrent;
    elCurr.style.background = "#bbf7d0";
    elSel.disabled = false;
    const available = pfSimActions.filter((a) => a.from === pfSimCurrent);
    if (available.length === 0) {
      elSel.innerHTML = '<option value="">-- 次のアクションなし（完了） --</option>';
      elSel.disabled = true;
    } else {
      elSel.innerHTML = available.map((a) => `<option value="${esc(a.name)}">${esc(a.name)} (→ ${esc(a.to)})</option>`).join("");
    }
  }
  async function runSimStart() {
    if (!pfSimStates) return;
    const startStates = new Set(Object.keys(pfSimStates));
    for (const a of pfSimActions) if (a.to) startStates.delete(a.to);
    const startSt = [...startStates][0] || Object.keys(pfSimStates)[0];
    if (!startSt) return;
    pfSimCurrent = startSt;
    updateProcessSimulationUI();
    setStatus("シミュレーション開始: " + startSt);
    await redrawProcessFlow(startSt);
  }
  async function runSimExecuteAction() {
    const sel = getToolDocument().getElementById("u_simActionSelect");
    if (sel.disabled) return;
    const actionName = sel.value;
    if (!actionName) return;
    const action = pfSimActions.find((a) => a.from === pfSimCurrent && a.name === actionName);
    if (!action) return;
    pfSimCurrent = action.to;
    updateProcessSimulationUI();
    setStatus(`アクション「${actionName}」実行 → 「${action.to}」`);
    await redrawProcessFlow(action.to);
  }
  async function runRenderProcessFlow() {
    const c = commonParams();
    const app = c.source.appId;
    if (!app) throw new Error("比較元アプリIDを入力してください");
    const prefix = buildApiPrefix(c.source.guestId, false);
    setStatus("プロセス管理を取得中...");
    try {
      const res = await apiGet(prefix, "/app/status.json", { app });
      if (!res.enable) {
        ui.mermaidText.value = "プロセス管理は無効です。";
        ui.mermaidView.innerHTML = '<div style="color:#64748b">プロセス管理は無効です</div>';
        setStatus("プロセス管理は無効です");
        pfSimStates = null;
        pfSimActions = null;
        pfSimCurrent = null;
        updateProcessSimulationUI();
        return;
      }
      pfSimStates = res.states || {};
      pfSimActions = res.actions || [];
      pfSimCurrent = null;
      setStatus("フロー図 生成中...");
      await redrawProcessFlow(null);
      updateProcessSimulationUI();
      setStatus("フロー図 生成完了");
    } catch (e) {
      ui.mermaidView.innerHTML = `<div style="color:#b91c1c">エラー: ${esc(e.message || String(e))}</div>`;
      throw e;
    }
  }

  // src/tabs/sql.js
  init_state();
  init_utils();
  init_api();
  init_components();
  init_constants();
  init_diff();
  init_dialog();
  async function launchKintoneSql(liteOpts) {
    const toolD = liteOpts?.document || getToolDocument();
    const liteAppId = liteOpts?.appId != null ? String(liteOpts.appId).trim() : "";
    let sApp = liteAppId;
    if (!sApp) {
      const sourceAppEl = toolD.getElementById("u_sourceApp");
      if (!sourceAppEl) {
        setStatus("エラー: 比較元アプリID入力欄が見つかりません。画面を再読み込みしてください。", true);
        return;
      }
      sApp = sourceAppEl.value.trim();
      if (!sApp) {
        setStatus("エラー: 比較元アプリIDを設定してください", true);
        return;
      }
    }
    const existing = toolD.getElementById("kintone-sql-runner");
    if (existing) existing.remove();
    if (!window.kintone?.api) {
      setStatus("エラー: kintoneアプリ画面で実行してください", true);
      return;
    }
    const ROOT_ID = "kintone-sql-runner";
    const ALASQL_CDN_CANDIDATES = EXTERNAL_LIBRARIES.alasql.cdnCandidates;
    const STORAGE_KEY = "kintone-sql-runner-history";
    const THEME_KEY = "kintone-sql-runner-theme";
    const PAGE_SIZE = 200;
    const Themes = {
      light: {
        bg: "#fff",
        panelBg: "#fff",
        headBg: "#f5f5f5",
        headBorder: "#ddd",
        editorBg: "#282c34",
        editorColor: "#abb2bf",
        tableBg: "#fff",
        thBg: "#eee",
        tdBorder: "#ddd",
        altRow: "#f9f9f9",
        text: "#333",
        subText: "#666",
        error: "#e74c3c",
        accent: "#3498db",
        accentHover: "#2980b9",
        sidebarBg: "#f8f9fa",
        sidebarBorder: "#e0e0e0",
        overlay: "rgba(0,0,0,0.5)"
      },
      dark: {
        bg: "#1e1e1e",
        panelBg: "#252526",
        headBg: "#2d2d2d",
        headBorder: "#404040",
        editorBg: "#1e1e1e",
        editorColor: "#d4d4d4",
        tableBg: "#252526",
        thBg: "#333",
        tdBorder: "#404040",
        altRow: "#2a2a2a",
        text: "#d4d4d4",
        subText: "#888",
        error: "#f44747",
        accent: "#569cd6",
        accentHover: "#4a8abf",
        sidebarBg: "#2d2d2d",
        sidebarBorder: "#404040",
        overlay: "rgba(0,0,0,0.7)"
      }
    };
    const Utils = {
      el: (tag, attrs = {}, children = []) => {
        const e = toolD.createElement(tag);
        Object.entries(attrs).forEach(([k, v]) => {
          if (k === "style" && typeof v === "object") Object.assign(e.style, v);
          else if (k.startsWith("on") && typeof v === "function") e.addEventListener(k.slice(2).toLowerCase(), v);
          else if (k === "className") e.className = v;
          else if (k === "value") e.value = v;
          else if (k === "textContent") e.textContent = v;
          else if (k === "innerHTML") e.innerHTML = v;
          else if (k === "disabled") e.disabled = v;
          else if (k === "title") e.title = v;
          else e.setAttribute(k, v);
        });
        (Array.isArray(children) ? children : [children]).forEach((c) => {
          if (c != null) e.appendChild(typeof c === "string" ? toolD.createTextNode(c) : c);
        });
        return e;
      },
      css: (t) => `
    #${ROOT_ID} { display:flex; flex-direction:column; width:100%; height:75vh; min-height:500px; padding-top:10px; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; }
    #${ROOT_ID} * { box-sizing:border-box; margin:0; padding:0; }
    #${ROOT_ID} .panel { width:100%; height:100%; background:${t.panelBg}; border-radius:6px; display:flex; flex-direction:column; overflow:hidden; border:1px solid ${t.headBorder}; box-shadow:0 2px 8px rgba(0,0,0,0.05); }
    #${ROOT_ID} .head { padding:8px 12px; background:${t.headBg}; border-bottom:1px solid ${t.headBorder}; display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
    #${ROOT_ID} .head b { color:${t.text}; font-size:14px; white-space:nowrap; }
    #${ROOT_ID} .body { flex:1; display:flex; min-height:0; }
    #${ROOT_ID} .main-area { flex:1; display:flex; flex-direction:column; min-width:0; }
    #${ROOT_ID} .field-panel { border-bottom:1px solid ${t.headBorder}; background:${t.sidebarBg}; }
    #${ROOT_ID} .field-head { padding:8px 10px; font-weight:bold; font-size:12px; color:${t.text}; background:${t.headBg}; border-bottom:1px solid ${t.headBorder}; display:flex; justify-content:space-between; align-items:center; }
    #${ROOT_ID} .field-body { max-height:180px; overflow:auto; }
    #${ROOT_ID} .field-table { width:100%; border-collapse:collapse; table-layout:fixed; font-size:11px; }
    #${ROOT_ID} .field-table th, #${ROOT_ID} .field-table td { border:1px solid ${t.tdBorder}; padding:4px 8px; color:${t.text}; }
    #${ROOT_ID} .field-table th { position:sticky; top:0; z-index:1; background:${t.thBg}; font-size:10px; }
    #${ROOT_ID} .field-table td { white-space:nowrap; overflow:hidden; text-overflow:ellipsis; cursor:pointer; }
    #${ROOT_ID} .field-table tr:hover td { background:${t.accent}22; }
    #${ROOT_ID} .editor-wrap { position:relative; border-bottom:1px solid ${t.headBorder}; }
    #${ROOT_ID} .editor { width:100%; height:160px; padding:12px; background:${t.editorBg}; color:${t.editorColor}; font-family:'Fira Code','Cascadia Code','Consolas',monospace; font-size:13px; resize:vertical; border:none; outline:none; line-height:1.5; tab-size:2; min-height:60px; max-height:50vh; }
    #${ROOT_ID} .toolbar { padding:6px 10px; background:${t.headBg}; border-bottom:1px solid ${t.headBorder}; display:flex; align-items:center; gap:6px; flex-wrap:wrap; }
    #${ROOT_ID} .toolbar select { font-size:11px; padding:3px 6px; border:1px solid ${t.headBorder}; border-radius:4px; background:${t.panelBg}; color:${t.text}; cursor:pointer; }
    #${ROOT_ID} .result-wrap { flex:1; display:flex; flex-direction:column; min-height:0; }
    #${ROOT_ID} .result { flex:1; overflow:auto; position:relative; background:${t.tableBg}; }
    #${ROOT_ID} table { width:100%; border-collapse:collapse; font-size:12px; }
    #${ROOT_ID} th { position:sticky; top:0; background:${t.thBg}; z-index:1; border:1px solid ${t.tdBorder}; padding:6px 8px; text-align:left; color:${t.text}; font-size:11px; white-space:nowrap; cursor:pointer; user-select:none; }
    #${ROOT_ID} th:hover { background:${t.accent}33; }
    #${ROOT_ID} th .sort-arrow { margin-left:4px; font-size:10px; }
    #${ROOT_ID} td { border:1px solid ${t.tdBorder}; padding:5px 8px; white-space:pre-wrap; max-width:350px; color:${t.text}; font-size:12px; }
    #${ROOT_ID} tr:nth-child(even) { background:${t.altRow}; }
    #${ROOT_ID} .row-num { color:${t.subText}; text-align:right; font-size:10px; min-width:35px; background:${t.thBg}; }
    #${ROOT_ID} .pager { padding:6px 10px; background:${t.headBg}; border-top:1px solid ${t.headBorder}; display:flex; align-items:center; gap:8px; font-size:12px; color:${t.text}; }
    #${ROOT_ID} .pager button { font-size:11px; }
    #${ROOT_ID} .btn { padding:5px 10px; border:1px solid ${t.headBorder}; background:${t.panelBg}; border-radius:4px; cursor:pointer; font-size:11px; color:${t.text}; white-space:nowrap; transition:background .15s; }
    #${ROOT_ID} .btn:hover { background:${t.accent}22; }
    #${ROOT_ID} .btn:active { transform:scale(0.97); }
    #${ROOT_ID} .btn.primary { background:${t.accent}; color:#fff; border-color:${t.accentHover}; }
    #${ROOT_ID} .btn.primary:hover { background:${t.accentHover}; }
    #${ROOT_ID} .btn.sm { padding:3px 7px; font-size:10px; }
    #${ROOT_ID} .btn.icon { padding:4px 7px; font-size:14px; line-height:1; }
    #${ROOT_ID} .status { font-size:11px; color:${t.subText}; margin-left:auto; white-space:nowrap; }
    #${ROOT_ID} .error { color:${t.error}; padding:15px; font-family:monospace; font-size:13px; line-height:1.6; }
    #${ROOT_ID} .history-dropdown { position:absolute; top:100%; left:0; right:0; background:${t.panelBg}; border:1px solid ${t.headBorder}; border-radius:0 0 6px 6px; max-height:250px; overflow-y:auto; z-index:10; box-shadow:0 4px 12px rgba(0,0,0,0.2); }
    #${ROOT_ID} .history-item { padding:6px 10px; font-size:11px; font-family:monospace; cursor:pointer; color:${t.text}; border-bottom:1px solid ${t.headBorder}; display:flex; justify-content:space-between; align-items:center; }
    #${ROOT_ID} .history-item:hover { background:${t.accent}22; }
    #${ROOT_ID} .history-time { font-size:10px; color:${t.subText}; font-family:sans-serif; }
    #${ROOT_ID} .app-input { width:70px; font-size:11px; padding:3px 6px; border:1px solid ${t.headBorder}; border-radius:4px; background:${t.panelBg}; color:${t.text}; text-align:center; }
    #${ROOT_ID} [data-tooltip]:hover::after { content:attr(data-tooltip); position:absolute; bottom:110%; left:50%; transform:translateX(-50%); background:#333; color:#fff; padding:3px 8px; border-radius:4px; font-size:10px; white-space:nowrap; z-index:100; pointer-events:none; }
    #${ROOT_ID} [data-tooltip] { position:relative; }
    #${ROOT_ID} .no-result { padding:30px; text-align:center; color:${t.subText}; font-size:14px; }
  `,
      resolveAlaSql: () => {
        const toolWindow = toolD?.defaultView;
        const roots = [
          window.alasql,
          window.AlaSQL,
          globalThis?.alasql,
          globalThis?.AlaSQL,
          toolWindow?.alasql,
          toolWindow?.AlaSQL,
          toolWindow?.globalThis?.alasql,
          toolWindow?.globalThis?.AlaSQL
        ].filter(Boolean);
        const resolveRunner = (candidate) => {
          if (!candidate) return null;
          if (typeof candidate === "function") return candidate;
          if (typeof candidate.default === "function") return candidate.default;
          if (typeof candidate.alasql === "function") return candidate.alasql;
          if (typeof candidate.default?.alasql === "function") return candidate.default.alasql;
          if (typeof candidate.exec === "function") {
            return (query, params) => candidate.exec(query, params);
          }
          if (typeof candidate.default?.exec === "function") {
            return (query, params) => candidate.default.exec(query, params);
          }
          return null;
        };
        for (const root2 of roots) {
          const runner = resolveRunner(root2);
          if (runner) return runner;
        }
        return null;
      },
      waitForAlaSql: (timeoutMs = 1200) => new Promise((resolve) => {
        const start = Date.now();
        const tick = () => {
          const fn = Utils.resolveAlaSql();
          if (fn) return resolve(fn);
          if (Date.now() - start >= timeoutMs) return resolve(null);
          setTimeout(tick, 50);
        };
        tick();
      }),
      loadScript: async (src) => {
        if (Utils.resolveAlaSql()) return;
        await new Promise((resolve, reject) => {
          const s = toolD.createElement("script");
          s.src = src;
          s.async = true;
          s.onload = () => resolve();
          s.onerror = () => reject(new Error(`AlaSQLスクリプトの読み込みに失敗しました: ${src}`));
          toolD.head.appendChild(s);
        });
        const fn = await Utils.waitForAlaSql();
        if (!fn) throw new Error("AlaSQLの読み込み後も実行関数を検出できませんでした。");
      },
      resolveJSZip: () => {
        const toolWindow = toolD?.defaultView;
        const roots = [
          window.JSZip,
          globalThis?.JSZip,
          toolWindow?.JSZip,
          toolWindow?.globalThis?.JSZip
        ].filter(Boolean);
        for (const root2 of roots) {
          if (typeof root2 === "function") return root2;
          if (typeof root2?.default === "function") return root2.default;
        }
        return null;
      },
      loadJSZip: async () => {
        const existing2 = Utils.resolveJSZip();
        if (existing2) return existing2;
        await new Promise((resolve, reject) => {
          const s = toolD.createElement("script");
          s.src = EXTERNAL_LIBRARIES.jszip.cdnUrl;
          s.onload = resolve;
          s.onerror = () => reject(new Error("JSZipの読み込みに失敗しました。"));
          toolD.head.appendChild(s);
        });
        const loaded = Utils.resolveJSZip();
        if (!loaded) {
          throw new Error("JSZipのロード後もグローバル変数が見つかりませんでした。");
        }
        return loaded;
      },
      safeName: (name) => String(name || "").replace(/[\\/:*?"<>|]/g, "_").slice(0, 180) || "unknown",
      downloadCsv: (data, filename) => {
        if (!data?.length) return;
        const keys = Object.keys(data[0]);
        const bom = "\uFEFF";
        const csv = [
          keys.map((k) => `"${k}"`).join(","),
          ...data.map((row) => keys.map((k) => {
            const v = row[k] == null ? "" : String(row[k]);
            return `"${v.replace(/"/g, '""')}"`;
          }).join(","))
        ].join("\r\n");
        const blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        Object.assign(toolD.createElement("a"), { href: url, download: filename }).click();
        setTimeout(() => URL.revokeObjectURL(url), 1e3);
      },
      copyToClipboard: async (data) => {
        if (!data?.length) return false;
        const keys = Object.keys(data[0]);
        const tsv = [keys.join("	"), ...data.map((r) => keys.map((k) => r[k] ?? "").join("	"))].join("\n");
        try {
          if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(tsv);
            return true;
          }
        } catch (e) {
          console.warn("Clipboard API failed, fallback to execCommand", e);
        }
        const ta = toolD.createElement("textarea");
        ta.value = tsv;
        ta.setAttribute("readonly", "");
        ta.style.position = "fixed";
        ta.style.left = "-9999px";
        toolD.body.appendChild(ta);
        ta.select();
        const ok = toolD.execCommand("copy");
        ta.remove();
        return ok;
      },
      hashSql: (sql) => {
        const str = String(sql || "");
        let h = 2166136261;
        for (let i = 0; i < str.length; i++) {
          h ^= str.charCodeAt(i);
          h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24);
        }
        return `sql_${(h >>> 0).toString(16).padStart(8, "0")}`;
      },
      analyzeSqlSafety: (sql) => {
        const raw = String(sql || "");
        const withoutBlockComments = raw.replace(/\/\*[\s\S]*?\*\//g, " ");
        const clean = withoutBlockComments.replace(/--.*$/gm, " ").replace(/\s+/g, " ").trim();
        const up = clean.toUpperCase();
        const issues = [];
        const upd = up.match(/\bUPDATE\b[\s\S]*?(?=;|$)/g) || [];
        upd.forEach((stmt) => {
          if (!/\bWHERE\b/.test(stmt)) issues.push("UPDATEにWHERE句がありません");
        });
        const del = up.match(/\bDELETE\s+FROM\b[\s\S]*?(?=;|$)/g) || [];
        del.forEach((stmt) => {
          if (!/\bWHERE\b/.test(stmt)) issues.push("DELETEにWHERE句がありません");
        });
        return { cleaned: clean, issues, hash: Utils.hashSql(clean) };
      },
      getHistory: () => {
        try {
          return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
        } catch (e) {
          return [];
        }
      },
      addHistory: (sql, meta = {}) => {
        const h = Utils.getHistory().filter((item) => item.sql !== sql);
        h.unshift({ sql, time: Date.now(), hash: meta.hash || "", safety: meta.safety || "" });
        if (h.length > 50) h.length = 50;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(h));
      },
      clearHistory: () => localStorage.removeItem(STORAGE_KEY),
      getTheme: () => localStorage.getItem(THEME_KEY) || "light",
      setTheme: (t) => localStorage.setItem(THEME_KEY, t),
      formatTime: (ts) => {
        const d = new Date(ts);
        return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
      }
    };
    const TEMPLATES = [
      { label: "-- テンプレート選択 --", sql: "" },
      { label: "全件取得 (100件)", sql: "SELECT * FROM ? LIMIT 100" },
      { label: "件数カウント", sql: "SELECT COUNT(*) AS total FROM ?" },
      { label: "グループ集計", sql: "SELECT [フィールド名], COUNT(*) AS cnt\nFROM ?\nGROUP BY [フィールド名]\nORDER BY cnt DESC" },
      { label: "条件フィルタ", sql: "SELECT * FROM ?\nWHERE [フィールド名] = '値'\nLIMIT 100" },
      { label: "重複チェック", sql: "SELECT [フィールド名], COUNT(*) AS cnt\nFROM ?\nGROUP BY [フィールド名]\nHAVING cnt > 1" },
      { label: "NULL検出", sql: "SELECT * FROM ?\nWHERE [フィールド名] IS NULL\n   OR [フィールド名] = ''" },
      { label: "日付範囲", sql: "SELECT * FROM ?\nWHERE [日付フィールド] BETWEEN '2024-01-01' AND '2024-12-31'" },
      { label: "LIKE検索", sql: "SELECT * FROM ?\nWHERE [フィールド名] LIKE '%キーワード%'" },
      { label: "数値集計", sql: "SELECT\n  COUNT(*) AS cnt,\n  SUM(CAST([数値フィールド] AS NUMBER)) AS total,\n  AVG(CAST([数値フィールド] AS NUMBER)) AS avg_val,\n  MIN(CAST([数値フィールド] AS NUMBER)) AS min_val,\n  MAX(CAST([数値フィールド] AS NUMBER)) AS max_val\nFROM ?" },
      { label: "複数アプリJOIN", sql: "-- app2にアプリIDをセットしてLoad\nSELECT a.*, b.*\nFROM ? AS a\nJOIN ?1 AS b ON a.[キー] = b.[キー]\nLIMIT 100" }
    ];
    const Logic = {
      appCaches: {},
      async fetchAllRecords(appId, onProgress) {
        const limit = 500;
        let records = [];
        let offset = 0;
        const src = commonParams().source;
        const prefix = buildApiPrefix(src.guestId, false);
        while (true) {
          const body = { app: appId, query: `limit ${limit} offset ${offset}` };
          const resp = await apiGet(prefix, "/records.json", body);
          records = records.concat(resp.records);
          if (onProgress) onProgress(records.length);
          if (resp.records.length < limit) break;
          offset += limit;
        }
        return records;
      },
      async fetchFields(appId) {
        try {
          const src = commonParams().source;
          const prefix = buildApiPrefix(src.guestId, false);
          const resp = await apiGet(prefix, "/app/form/fields.json", { app: appId });
          return resp.properties || {};
        } catch (e) {
          return {};
        }
      },
      flattenRecords(records, expandSubtables = false) {
        if (!expandSubtables) {
          return records.map((r) => {
            const row = {};
            Object.keys(r).forEach((k) => {
              const v = r[k];
              if (v.type === "SUBTABLE") {
                row[k] = JSON.stringify(v.value.map((sub) => {
                  const sRow = {};
                  Object.keys(sub.value).forEach((sk) => sRow[sk] = sub.value[sk].value);
                  return sRow;
                }));
              } else if (["USER_SELECT", "ORGANIZATION_SELECT", "GROUP_SELECT"].includes(v.type)) {
                row[k] = v.value.map((u) => u.name || u.code).join(", ");
              } else if (v.type === "CREATOR" || v.type === "MODIFIER") {
                row[k] = v.value?.name || v.value?.code || "";
              } else if (v.type === "CHECK_BOX" || v.type === "MULTI_SELECT") {
                row[k] = Array.isArray(v.value) ? v.value.join(", ") : v.value;
              } else if (v.type === "FILE") {
                row[k] = Array.isArray(v.value) ? v.value.map((f) => f.name).join(", ") : "";
              } else {
                row[k] = v.value;
              }
            });
            return row;
          });
        }
        const result = [];
        records.forEach((r) => {
          const base = {};
          let subtableKeys = [];
          Object.keys(r).forEach((k) => {
            const v = r[k];
            if (v.type === "SUBTABLE") {
              subtableKeys.push(k);
            } else if (["USER_SELECT", "ORGANIZATION_SELECT", "GROUP_SELECT"].includes(v.type)) {
              base[k] = v.value.map((u) => u.name || u.code).join(", ");
            } else if (v.type === "CREATOR" || v.type === "MODIFIER") {
              base[k] = v.value?.name || v.value?.code || "";
            } else if (v.type === "CHECK_BOX" || v.type === "MULTI_SELECT") {
              base[k] = Array.isArray(v.value) ? v.value.join(", ") : v.value;
            } else if (v.type === "FILE") {
              base[k] = Array.isArray(v.value) ? v.value.map((f) => f.name).join(", ") : "";
            } else {
              base[k] = v.value;
            }
          });
          if (subtableKeys.length === 0) {
            result.push(base);
          } else {
            const stKey = subtableKeys[0];
            const stRows = r[stKey].value;
            if (stRows.length === 0) {
              result.push({ ...base });
            } else {
              stRows.forEach((sub) => {
                const row = { ...base };
                Object.keys(sub.value).forEach((sk) => {
                  row[`${stKey}.${sk}`] = sub.value[sk].value;
                });
                result.push(row);
              });
            }
          }
        });
        return result;
      },
      async loadApp(appId, expandSubtables, onProgress) {
        const cacheKey = `${appId}_${expandSubtables}`;
        if (this.appCaches[cacheKey]) return this.appCaches[cacheKey];
        const raw = await this.fetchAllRecords(appId, onProgress);
        const fields = await this.fetchFields(appId);
        const flat = this.flattenRecords(raw, expandSubtables);
        this.appCaches[cacheKey] = { raw, flat, fields };
        return this.appCaches[cacheKey];
      },
      clearCache(appId) {
        if (appId) {
          Object.keys(this.appCaches).forEach((k) => {
            if (k.startsWith(appId + "_")) delete this.appCaches[k];
          });
        } else {
          this.appCaches = {};
        }
      },
      async runSql(query, ...datasets) {
        let loaded = false;
        let lastError = null;
        for (const cdn of ALASQL_CDN_CANDIDATES) {
          try {
            await Utils.loadScript(cdn);
            loaded = true;
            break;
          } catch (e) {
            lastError = e;
            console.warn("[KintoneSQL] AlaSQL load failed:", cdn, e);
          }
        }
        if (!loaded) throw lastError || new Error("AlaSQLの読み込みに失敗しました。");
        const alasql = Utils.resolveAlaSql();
        if (!alasql) {
          throw new Error("AlaSQL実行関数が見つかりません。ページ再読み込み後に再実行してください。");
        }
        return alasql(query, datasets);
      }
    };
    const UI = (() => {
      let root2, styleEl, statusEl, resultEl, editorEl, fieldBody, pagerEl;
      let currentTheme = Utils.getTheme();
      let lastResult = null;
      let currentPage = 0;
      let sortCol = null;
      let sortAsc = true;
      let expandSubtables = false;
      let extraAppId = "";
      let isExecuting = false;
      let btnRun = null;
      let currentPrimary = null;
      const setStatus2 = (msg) => {
        if (statusEl) statusEl.textContent = msg;
      };
      const applyTheme = () => {
        if (styleEl) styleEl.textContent = Utils.css(Themes[currentTheme]);
      };
      const renderFields = (fields) => {
        if (!fieldBody) return;
        fieldBody.innerHTML = "";
        const entries = Object.entries(fields || {});
        if (!entries.length) {
          fieldBody.appendChild(Utils.el("div", { style: { padding: "10px", fontSize: "11px", color: Themes[currentTheme].subText } }, "比較元アプリの項目を取得すると一覧を表示します"));
          return;
        }
        const table = Utils.el("table", { className: "field-table" }, [
          Utils.el("thead", {}, Utils.el("tr", {}, [
            Utils.el("th", { textContent: "フィールドコード", style: { width: "38%" } }),
            Utils.el("th", { textContent: "フィールド名", style: { width: "38%" } }),
            Utils.el("th", { textContent: "タイプ", style: { width: "24%" } })
          ])),
          Utils.el("tbody", {}, entries.map(([code, def]) => Utils.el("tr", { onclick: () => insertField(code) }, [
            Utils.el("td", { title: code }, code),
            Utils.el("td", { title: def.label || code }, def.label || code),
            Utils.el("td", { title: def.type || "?" }, def.type || "?")
          ])))
        ]);
        fieldBody.appendChild(table);
      };
      const downloadSqlResultBundle = async () => {
        if (!lastResult?.length || !currentPrimary?.raw?.length || !currentPrimary?.fields) {
          setStatus2("先にSQLを実行して結果を表示してください。");
          return;
        }
        const idKey = Object.prototype.hasOwnProperty.call(lastResult[0], "$id") ? "$id" : null;
        if (!idKey) {
          setStatus2("結果に $id 列がないため、添付ファイルDLを実行できません。");
          return;
        }
        const resultKeys = Object.keys(lastResult[0]);
        const fileFieldCodes = resultKeys.filter((k) => currentPrimary.fields[k]?.type === "FILE");
        if (!fileFieldCodes.length) {
          setStatus2("結果に添付ファイルフィールドが含まれていません。");
          return;
        }
        const src = commonParams().source;
        const prefix = buildApiPrefix(src.guestId, false);
        const rawById = new Map(currentPrimary.raw.map((r) => [String(r.$id?.value || ""), r]));
        const JSZipCtor = await Utils.loadJSZip();
        const zip = new JSZipCtor();
        const manifest = [];
        let fileCount = 0;
        for (let i = 0; i < lastResult.length; i++) {
          const row = lastResult[i];
          const recordId = String(row[idKey] ?? "");
          const raw = rawById.get(recordId);
          if (!recordId || !raw) continue;
          const picked = [];
          for (const code of fileFieldCodes) {
            const files = raw[code]?.value || [];
            for (const f of files) {
              setStatus2(`添付ファイル取得中... ${i + 1}/${lastResult.length}`);
              const resp = await fetch(`${prefix}/file.json?fileKey=${encodeURIComponent(f.fileKey)}`, { method: "GET", headers: { "X-Requested-With": "XMLHttpRequest" } });
              if (!resp.ok) continue;
              const blob2 = await resp.blob();
              const path = `files/record_${recordId}/${Utils.safeName(code)}/${Utils.safeName(f.name)}`;
              zip.file(path, blob2);
              fileCount++;
              picked.push({ fieldCode: code, name: f.name, fileKey: f.fileKey, path });
            }
          }
          manifest.push({ rowIndex: i + 1, recordId, row, attachments: picked });
        }
        if (!manifest.length) {
          setStatus2("対象レコードが見つかりませんでした。");
          return;
        }
        zip.file("records.json", JSON.stringify(manifest, null, 2));
        const blob = await zip.generateAsync({ type: "blob" });
        const a = toolD.createElement("a");
        const u = URL.createObjectURL(blob);
        a.href = u;
        a.download = `sql_result_bundle_${Date.now()}.zip`;
        toolD.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(u), 200);
        setStatus2(`SQL結果と添付ファイルをZIPで出力しました (${manifest.length}件 / ${fileCount}ファイル)。`);
      };
      const insertField = (name) => {
        if (!editorEl) return;
        const start = editorEl.selectionStart;
        const end = editorEl.selectionEnd;
        const text = editorEl.value;
        const insert = `[${name}]`;
        editorEl.value = text.slice(0, start) + insert + text.slice(end);
        editorEl.selectionStart = editorEl.selectionEnd = start + insert.length;
        editorEl.focus();
      };
      const getSortedData = () => {
        if (!lastResult) return [];
        if (sortCol === null) return lastResult;
        return [...lastResult].sort((a, b) => {
          let va = a[sortCol], vb = b[sortCol];
          if (va == null) va = "";
          if (vb == null) vb = "";
          const na = Number(va), nb = Number(vb);
          if (!isNaN(na) && !isNaN(nb)) return sortAsc ? na - nb : nb - na;
          return sortAsc ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
        });
      };
      const renderTable = () => {
        resultEl.innerHTML = "";
        pagerEl.innerHTML = "";
        if (!lastResult?.length) {
          resultEl.appendChild(Utils.el("div", { className: "no-result" }, "結果はありません。"));
          return;
        }
        const sorted = getSortedData();
        const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
        if (currentPage >= totalPages) currentPage = totalPages - 1;
        const pageData = sorted.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);
        const keys = Object.keys(lastResult[0]);
        const thead = Utils.el("thead", {}, Utils.el("tr", {}, [
          Utils.el("th", { className: "row-num", textContent: "#" }),
          ...keys.map((k) => {
            const arrow = sortCol === k ? sortAsc ? " ▲" : " ▼" : "";
            return Utils.el("th", {
              onclick: () => {
                if (sortCol === k) sortAsc = !sortAsc;
                else {
                  sortCol = k;
                  sortAsc = true;
                }
                renderTable();
              }
            }, [
              toolD.createTextNode(k),
              Utils.el("span", { className: "sort-arrow", textContent: arrow })
            ]);
          })
        ]));
        const startIdx = currentPage * PAGE_SIZE;
        const tbody = Utils.el("tbody", {}, pageData.map(
          (row, i) => Utils.el("tr", {}, [
            Utils.el("td", { className: "row-num", textContent: String(startIdx + i + 1) }),
            ...keys.map((k) => Utils.el("td", {}, String(row[k] ?? "")))
          ])
        ));
        resultEl.appendChild(Utils.el("table", {}, [thead, tbody]));
        if (totalPages > 1) {
          const info = Utils.el("span", {}, `${currentPage + 1} / ${totalPages} ページ (${lastResult.length}件)`);
          const btnPrev = Utils.el("button", {
            className: "btn sm",
            disabled: currentPage === 0,
            onclick: () => {
              currentPage--;
              renderTable();
            }
          }, "◀ 前へ");
          const btnNext = Utils.el("button", {
            className: "btn sm",
            disabled: currentPage >= totalPages - 1,
            onclick: () => {
              currentPage++;
              renderTable();
            }
          }, "次へ ▶");
          const btnFirst = Utils.el("button", {
            className: "btn sm",
            disabled: currentPage === 0,
            onclick: () => {
              currentPage = 0;
              renderTable();
            }
          }, "|◀");
          const btnLast = Utils.el("button", {
            className: "btn sm",
            disabled: currentPage >= totalPages - 1,
            onclick: () => {
              currentPage = totalPages - 1;
              renderTable();
            }
          }, "▶|");
          pagerEl.append(btnFirst, btnPrev, info, btnNext, btnLast);
        } else {
          pagerEl.appendChild(Utils.el("span", {}, `${lastResult.length}件`));
        }
      };
      const handleError = (e) => {
        console.error(e);
        resultEl.innerHTML = "";
        const msg = e.message || String(e);
        const detail = e.stack ? `

Stack:
${e.stack.split("\n").slice(0, 3).join("\n")}` : "";
        resultEl.appendChild(Utils.el("div", { className: "error" }, `❌ ${msg}${detail}`));
        setStatus2("エラーが発生しました。");
      };
      const execute = async () => {
        if (isExecuting) {
          setStatus2("SQLを実行中です。完了までお待ちください。");
          return;
        }
        const sql = editorEl.value.trim();
        if (!sql) {
          setStatus2("SQLを入力してください。");
          return;
        }
        const safety = Utils.analyzeSqlSafety(sql);
        if (safety.issues.length) {
          const ok1 = window.confirm(
            `⚠ 危険な更新系SQLの可能性があります。
${safety.issues.map((x, i) => `${i + 1}. ${x}`).join("\n")}

SQL Hash: ${safety.hash}
続行する場合は次の確認に進みます。`
          );
          if (!ok1) {
            setStatus2(`Canceled by safety guard (${safety.hash})`);
            return;
          }
          const typed = window.prompt(`安全確認: SQL Hash を入力してください
${safety.hash}`, "");
          if ((typed || "").trim() !== safety.hash) {
            setStatus2("安全性チェックに失敗したため、クエリを中止しました。");
            return;
          }
        }
        const t0 = performance.now();
        isExecuting = true;
        if (btnRun) btnRun.disabled = true;
        try {
          const appId = (liteAppId || toolD.getElementById("u_sourceApp")?.value || "").trim();
          setStatus2("レコードを取得中...");
          const primary = await Logic.loadApp(appId, expandSubtables, (n) => setStatus2(`アプリ ${appId}: ${n}件取得...`));
          currentPrimary = primary;
          const datasets = [primary.flat];
          if (extraAppId && sql.includes("?1")) {
            setStatus2(`追加アプリ ${extraAppId} を取得中...`);
            const secondary = await Logic.loadApp(Number(extraAppId), expandSubtables, (n) => setStatus2(`アプリ ${extraAppId}: ${n}件取得...`));
            datasets.push(secondary.flat);
          }
          setStatus2("SQL を実行中...");
          await new Promise((r) => setTimeout(r, 10));
          const res = await Logic.runSql(sql, ...datasets);
          const elapsed = ((performance.now() - t0) / 1e3).toFixed(2);
          lastResult = Array.isArray(res) ? res : [{ result: res }];
          currentPage = 0;
          sortCol = null;
          sortAsc = true;
          renderTable();
          setStatus2(`${lastResult.length}件 / ${elapsed}s [${safety.hash}]`);
          renderFields(primary.fields);
          Utils.addHistory(sql, { hash: safety.hash, safety: safety.issues.length ? "double-confirm" : "normal" });
          console.info(`[KintoneSQL] hash=${safety.hash} safety=${safety.issues.length ? "double-confirm" : "normal"}`);
        } catch (e) {
          handleError(e);
        } finally {
          isExecuting = false;
          if (btnRun) btnRun.disabled = false;
        }
      };
      let historyDropdown = null;
      const toggleHistory = (anchor) => {
        if (historyDropdown) {
          historyDropdown.remove();
          historyDropdown = null;
          return;
        }
        const items = Utils.getHistory();
        if (!items.length) return;
        historyDropdown = Utils.el("div", { className: "history-dropdown" });
        items.forEach((item) => {
          const row = Utils.el("div", {
            className: "history-item",
            onclick: () => {
              editorEl.value = item.sql;
              historyDropdown.remove();
              historyDropdown = null;
              editorEl.focus();
            }
          }, [
            Utils.el("span", { textContent: item.sql.replace(/\n/g, " ").slice(0, 80), style: { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: "1" } }),
            Utils.el("span", { className: "history-time", textContent: `${Utils.formatTime(item.time)}${item.hash ? ` • ${item.hash}` : ""}` })
          ]);
          historyDropdown.appendChild(row);
        });
        historyDropdown.appendChild(Utils.el("div", {
          className: "history-item",
          style: { justifyContent: "center", color: Themes[currentTheme].error, fontFamily: "sans-serif" },
          onclick: () => {
            Utils.clearHistory();
            historyDropdown.remove();
            historyDropdown = null;
          }
        }, "🗑 履歴を削除"));
        anchor.style.position = "relative";
        anchor.appendChild(historyDropdown);
      };
      const closeHistory = (e) => {
        if (historyDropdown && !historyDropdown.contains(e.target)) {
          historyDropdown.remove();
          historyDropdown = null;
        }
      };
      const init = () => {
        const old = toolD.getElementById(ROOT_ID);
        if (old) old.remove();
        const oldStyle = toolD.getElementById(ROOT_ID + "-style");
        if (oldStyle) oldStyle.remove();
        styleEl = Utils.el("style", { id: ROOT_ID + "-style" });
        applyTheme();
        editorEl = Utils.el("textarea", {
          className: "editor",
          value: "SELECT * FROM ? LIMIT 100",
          spellcheck: "false",
          placeholder: "SQLを入力...（現在アプリは ?、追加アプリは ?1）"
        });
        editorEl.addEventListener("keydown", (e) => {
          if (e.key === "Tab") {
            e.preventDefault();
            const s = editorEl.selectionStart, end = editorEl.selectionEnd;
            editorEl.value = editorEl.value.slice(0, s) + "  " + editorEl.value.slice(end);
            editorEl.selectionStart = editorEl.selectionEnd = s + 2;
          }
          if (e.ctrlKey && e.key === "Enter") {
            e.preventDefault();
            execute();
          }
          if (e.ctrlKey && e.key === "s") {
            e.preventDefault();
            Utils.addHistory(editorEl.value.trim());
            setStatus2("履歴に保存しました。");
          }
        });
        statusEl = Utils.el("div", { className: "status" }, "待機中");
        resultEl = Utils.el("div", { className: "result" });
        pagerEl = Utils.el("div", { className: "pager" });
        btnRun = Utils.el("button", { className: "btn primary", onclick: execute, title: "Ctrl+Enter" }, "▶ 実行");
        const btnCsv = Utils.el("button", {
          className: "btn",
          onclick: () => {
            if (!lastResult?.length) {
              setStatus2("出力対象データがありません。");
              return;
            }
            Utils.downloadCsv(lastResult, `query_${Date.now()}.csv`);
            setStatus2("CSV を出力しました。");
          },
          title: "CSVとして出力"
        }, "📥 CSV");
        const btnCopy = Utils.el("button", {
          className: "btn",
          onclick: async () => {
            if (await Utils.copyToClipboard(lastResult)) setStatus2("クリップボードへコピーしました。");
            else setStatus2("コピー対象データがありません。");
          },
          title: "TSVとしてコピー"
        }, "📋 コピー");
        const btnBundle = Utils.el("button", {
          className: "btn",
          onclick: downloadSqlResultBundle,
          title: "SQL結果のレコード内容と添付ファイルをZIP出力"
        }, "🗂 結果+添付DL");
        const btnReload = Utils.el("button", {
          className: "btn",
          onclick: () => {
            Logic.clearCache();
            setStatus2("キャッシュをクリアしました。");
          },
          title: "データキャッシュをクリア"
        }, "🔄 再読込");
        const historyWrap = Utils.el("div", { style: { position: "relative", display: "inline-block" } });
        const btnHistory = Utils.el("button", { className: "btn", onclick: () => toggleHistory(historyWrap), title: "クエリ履歴 (Ctrl+S で保存)" }, "📜 履歴");
        historyWrap.appendChild(btnHistory);
        const btnTheme = Utils.el("button", {
          className: "btn icon",
          onclick: () => {
            currentTheme = currentTheme === "light" ? "dark" : "light";
            Utils.setTheme(currentTheme);
            applyTheme();
          },
          title: "テーマ切替"
        }, currentTheme === "light" ? "🌙" : "☀️");
        const btnClose = Utils.el("button", {
          className: "btn",
          onclick: () => {
            root2.remove();
            styleEl.remove();
            toolD.removeEventListener("click", closeHistory);
            const sqlPane2 = toolD.querySelector('.pane[data-pane="sql"]');
            const btnWrap2 = sqlPane2 ? sqlPane2.querySelector(".btns") : null;
            if (btnWrap2) btnWrap2.style.display = "";
          }
        }, "✕ 閉じる");
        const head = Utils.el("div", { className: "head" }, [
          Utils.el("b", {}, "⚡ kintone SQL 実行"),
          btnRun,
          btnCsv,
          btnCopy,
          btnBundle,
          btnReload,
          historyWrap,
          btnTheme,
          statusEl,
          btnClose
        ]);
        const templateSelect = Utils.el("select", {
          onchange: (e) => {
            if (e.target.value) {
              editorEl.value = e.target.value;
              editorEl.focus();
            }
            e.target.selectedIndex = 0;
          }
        });
        TEMPLATES.forEach((t) => templateSelect.appendChild(Utils.el("option", { value: t.sql }, t.label)));
        const subtableCheck = Utils.el("input", {
          type: "checkbox",
          id: ROOT_ID + "-st",
          onchange: (e) => {
            expandSubtables = e.target.checked;
            Logic.clearCache();
            setStatus2(expandSubtables ? "サブテーブル展開: ON" : "サブテーブル展開: OFF");
          }
        });
        const subtableLabel = Utils.el("label", { for: ROOT_ID + "-st", style: { fontSize: "11px", color: Themes[currentTheme].text, cursor: "pointer", userSelect: "none" } }, [
          subtableCheck,
          toolD.createTextNode(" サブテーブル展開")
        ]);
        const appInput = Utils.el("input", {
          className: "app-input",
          type: "number",
          placeholder: "アプリID",
          title: "JOIN 用の追加アプリID (?1)",
          onchange: (e) => {
            extraAppId = e.target.value;
          }
        });
        const appLabel = Utils.el("span", { style: { fontSize: "11px", color: Themes[currentTheme].text } }, "?1 =");
        const toolbar = Utils.el("div", { className: "toolbar" }, [
          templateSelect,
          Utils.el("span", { style: { width: "1px", height: "16px", background: "#ccc", margin: "0 4px" } }),
          subtableLabel,
          Utils.el("span", { style: { width: "1px", height: "16px", background: "#ccc", margin: "0 4px" } }),
          appLabel,
          appInput
        ]);
        fieldBody = Utils.el("div", { className: "field-body" });
        const fieldPanel = Utils.el("div", { className: "field-panel" }, [
          Utils.el("div", { className: "field-head" }, Utils.el("span", {}, "項目一覧（クリックでSQLへ挿入）")),
          fieldBody
        ]);
        renderFields({});
        const editorWrap = Utils.el("div", { className: "editor-wrap" }, editorEl);
        const resultWrap = Utils.el("div", { className: "result-wrap" }, [resultEl, pagerEl]);
        const mainArea = Utils.el("div", { className: "main-area" }, [editorWrap, toolbar, fieldPanel, resultWrap]);
        const body = Utils.el("div", { className: "body" }, [mainArea]);
        const panel = Utils.el("div", { className: "panel" }, [head, body]);
        root2 = Utils.el("div", { id: ROOT_ID }, panel);
        toolD.addEventListener("click", closeHistory);
        toolD.head.appendChild(styleEl);
        const sqlPane = toolD.querySelector('.pane[data-pane="sql"]');
        const btnWrap = sqlPane ? sqlPane.querySelector(".btns") : null;
        if (btnWrap) btnWrap.style.display = "none";
        if (sqlPane) sqlPane.appendChild(root2);
        else toolD.body.appendChild(root2);
        const initialAppId = (liteAppId || toolD.getElementById("u_sourceApp")?.value || "").trim();
        if (initialAppId) {
          Logic.fetchFields(initialAppId).then((fields) => {
            if (fields && Object.keys(fields).length) renderFields(fields);
          }).catch(() => {
          });
        }
        editorEl.focus();
      };
      return { init };
    })();
    UI.init();
  }

  // src/tabs/api-tester.js
  init_utils();
  init_components();
  init_components();
  init_dialog();
  async function runApiTester() {
    const method = getToolDocument().getElementById("u_apiTesterMethod")?.value || "GET";
    const path = getToolDocument().getElementById("u_apiTesterPath")?.value?.trim();
    const bodyStr = getToolDocument().getElementById("u_apiTesterBody")?.value?.trim() || "{}";
    const resEl = getToolDocument().getElementById("u_apiTesterResult");
    if (!resEl) {
      setStatus("APIテスターの結果表示要素が見つかりません。画面を再読み込みしてください。", true);
      return;
    }
    if (!path) {
      alert("エンドポイントを指定してください");
      return;
    }
    let payload = {};
    if (bodyStr) {
      try {
        payload = JSON.parse(bodyStr);
      } catch (e) {
        alert("リクエストBodyのJSON形式が不正です:\n" + e.message);
        return;
      }
    }
    setBusy(true, `API実行中 (${method}) ...`);
    resEl.innerHTML = '<div style="color:#64748b">実行中...</div>';
    try {
      let finalPath = path;
      if (!path.startsWith("http") && !path.startsWith("/k/v1/") && !path.startsWith("/k/guest/")) {
        const g = getToolDocument().getElementById("u_sourceGuest")?.value?.trim();
        const prefix = g ? `/k/guest/${g}/v1` : "/k/v1";
        finalPath = prefix + (path.startsWith("/") ? path : `/${path}`);
      }
      const res = await kintone.api(finalPath, method, payload);
      resEl.innerHTML = `<pre style="margin:0;padding:10px;font-size:12px;white-space:pre-wrap;color:#166534;background:#f0fdf4;border:1px solid #bbf7d0">${esc(JSON.stringify(res, null, 2))}</pre>`;
      setStatus(`API実行成功: ${method} ${finalPath}`);
      saveApiTesterHistory(method, path, bodyStr);
    } catch (e) {
      let errMsg = String(e.message || e);
      if (typeof e === "object" && e !== null) {
        try {
          errMsg = JSON.stringify(e, null, 2);
        } catch (_) {
        }
      }
      resEl.innerHTML = `<pre style="margin:0;padding:10px;font-size:12px;white-space:pre-wrap;color:#991b1b;background:#fee2e2;border:1px solid #fecaca">${esc(errMsg)}</pre>`;
      setStatus(`API実行エラー: ${method} ${path}`, true);
    } finally {
      setBusy(false);
    }
  }
  var API_HISTORY_KEY = "KUS_API_TESTER_HISTORY";
  function saveApiTesterHistory(method, path, bodyStr) {
    try {
      let hist = JSON.parse(localStorage.getItem(API_HISTORY_KEY) || "[]");
      hist = hist.filter((h) => !(h.method === method && h.path === path && h.body === bodyStr));
      hist.unshift({ method, path, body: bodyStr, time: (/* @__PURE__ */ new Date()).toISOString() });
      if (hist.length > 15) hist = hist.slice(0, 15);
      localStorage.setItem(API_HISTORY_KEY, JSON.stringify(hist));
      renderApiTesterHistory();
    } catch (e) {
      console.error("History save failed", e);
    }
  }
  function clearApiTesterHistory() {
    localStorage.removeItem(API_HISTORY_KEY);
    renderApiTesterHistory();
  }
  function renderApiTesterHistory() {
    const listEl = getToolDocument().getElementById("u_apiTesterHistoryList");
    if (!listEl) return;
    try {
      const hist = JSON.parse(localStorage.getItem(API_HISTORY_KEY) || "[]");
      if (!hist.length) {
        listEl.innerHTML = '<div style="color:#94a3b8;font-size:11px;font-style:italic;padding:8px;">履歴はありません</div>';
        return;
      }
      const html = hist.map((h, i) => {
        let bPrev = h.body || "";
        if (bPrev.length > 30) bPrev = bPrev.slice(0, 30) + "...";
        const isGet = h.method === "GET";
        const methodColor = isGet ? "#2563eb" : h.method === "POST" ? "#16a34a" : h.method === "PUT" ? "#d97706" : "#dc2626";
        const methodBg = isGet ? "#dbeafe" : h.method === "POST" ? "#dcfce3" : h.method === "PUT" ? "#fef3c7" : "#fee2e2";
        return `
        <div class="api-history-item" data-idx="${i}" role="button" tabindex="0"
          style="cursor:pointer;background:#fff;border:1px solid #e2e8f0;padding:6px 8px;border-radius:6px;transition:0.15s;display:flex;flex-direction:column;gap:4px;">
          <div style="display:flex;align-items:center;gap:6px;overflow:hidden;">
            <span style="font-size:9px;font-weight:800;background:${methodBg};color:${methodColor};padding:2px 4px;border-radius:4px;">${esc(h.method)}</span>
            <span style="font-size:11px;color:#0f172a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${esc(h.path)}">${esc(h.path)}</span>
          </div>
          ${bPrev && bPrev !== "{}" ? `<div style="font-size:10px;color:#64748b;font-family:monospace;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(bPrev)}</div>` : ""}
        </div>
      `;
      }).join("");
      listEl.innerHTML = html;
      const items = listEl.querySelectorAll(".api-history-item");
      const applyHistoryItem = (item) => {
        const idx = parseInt(item.dataset.idx, 10);
        const data = hist[idx];
        if (!data) return;
        const methodEl = getToolDocument().getElementById("u_apiTesterMethod");
        const pathEl = getToolDocument().getElementById("u_apiTesterPath");
        const bodyEl = getToolDocument().getElementById("u_apiTesterBody");
        if (methodEl) methodEl.value = data.method;
        if (pathEl) pathEl.value = data.path;
        if (bodyEl) bodyEl.value = data.body || "{}";
      };
      items.forEach((item) => {
        item.addEventListener("click", () => {
          applyHistoryItem(item);
        });
        item.addEventListener("keydown", (event) => {
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          applyHistoryItem(item);
        });
        item.addEventListener("focus", () => {
          item.style.outline = "2px solid #2563eb";
        });
        item.addEventListener("blur", () => {
          item.style.outline = "none";
        });
        item.addEventListener("mouseover", () => {
          item.style.borderColor = "#93c5fd";
          item.style.backgroundColor = "#eff6ff";
        });
        item.addEventListener("mouseout", () => {
          item.style.borderColor = "#e2e8f0";
          item.style.backgroundColor = "#fff";
        });
      });
    } catch (e) {
      listEl.innerHTML = '<div style="color:#ef4444;font-size:11px;">履歴読込エラー</div>';
    }
  }

  // src/boot.js
  var TOOL_POPOUT_NAME = "kintone-unified-suite-v2";
  function runKintoneUnifiedSuite(options = {}) {
    if (!window.kintone?.api || !window.kintone?.app) {
      alert("kintone画面で実行してください");
      return;
    }
    const removeToolFromDoc = (doc) => {
      try {
        doc.getElementById(TOOL_ID)?.remove();
      } catch (e) {
      }
    };
    removeToolFromDoc(document);
    const prevWin = window.__KUS_TOOL_WINDOW__;
    if (prevWin && !prevWin.closed) {
      try {
        removeToolFromDoc(prevWin.document);
      } catch (e) {
      }
      try {
        prevWin.close();
      } catch (e) {
      }
    }
    let root2;
    const popWin = window.open("", TOOL_POPOUT_NAME, "width=1260,height=920");
    if (!popWin) {
      alert("別タブを開けませんでした（ポップアップがブロックされている可能性があります）。このタブ内に表示します。");
      root2 = buildRoot(document, { popout: false });
      document.body.appendChild(root2);
    } else {
      window.__KUS_TOOL_WINDOW__ = popWin;
      popWin.document.open();
      popWin.document.write(
        '<!DOCTYPE html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>kintone 統合変更ツール</title></head><body style="margin:0;min-height:100vh;background:#94a3b8;"></body></html>'
      );
      popWin.document.close();
      root2 = buildRoot(popWin.document, { popout: true });
      popWin.document.body.appendChild(root2);
      try {
        popWin.focus();
      } catch (e) {
      }
    }
    setRootElement(root2);
    const $ = (id) => root2.querySelector(id);
    const ui4 = {
      tabs: [...root2.querySelectorAll(".tab")],
      subTabs: [...root2.querySelectorAll(".subtab")],
      panes: [...root2.querySelectorAll(".pane")],
      subPanes: [...root2.querySelectorAll(".subpane")],
      dialogHandle: root2.querySelector("[data-dialog-drag-handle]"),
      toolBody: root2.querySelector(".body"),
      status: $("#u_status"),
      result: $("#u_result"),
      sourceApp: $("#u_sourceApp"),
      sourceGuest: $("#u_sourceGuest"),
      sourcePreview: $("#u_sourcePreview"),
      targetApp: $("#u_targetApp"),
      targetGuest: $("#u_targetGuest"),
      targetPreview: $("#u_targetPreview"),
      lookupMap: $("#u_lookupMap"),
      ignoreKeys: $("#u_ignoreKeys"),
      ignorePresetFieldOrder: $("#u_ignorePresetFieldOrder"),
      ignorePresetMeta: $("#u_ignorePresetMeta"),
      ignorePresetLabelName: $("#u_ignorePresetLabelName"),
      diffNormalizeViewOrder: $("#u_diffNormalizeViewOrder"),
      diffNormalizePermissionOrder: $("#u_diffNormalizePermissionOrder"),
      diffNormalizeGeneralArrayOrder: $("#u_diffNormalizeGeneralArrayOrder"),
      diffSearch: $("#u_diffSearch"),
      diffSearchFieldName: $("#u_diffSearchFieldName"),
      diffFilterSection: $("#u_diffFilterSection"),
      diffFilterType: $("#u_diffFilterType"),
      diffFilterSeverity: $("#u_diffFilterSeverity"),
      diffExportMode: $("#u_diffExportMode"),
      diffExportContent: $("#u_diffExportContent"),
      diffFavoritesOnlyBtn: $("#u_diffFavoritesOnlyBtn"),
      diffSelectionState: $("#u_diffSelectionState"),
      diffOnboarding: $("#u_diffOnboarding"),
      diffSelectionSetName: $("#u_diffSelectionSetName"),
      diffSelectionSetSelect: $("#u_diffSelectionSetSelect"),
      diffWarnThreshold: $("#u_diffWarnThreshold"),
      diffWarnBox: $("#u_diffWarnBox"),
      diffSuggestedIgnore: $("#u_diffSuggestedIgnore"),
      diffSnapshotList: $("#u_diffSnapshotList"),
      diffMultiTargets: $("#u_diffMultiTargets"),
      diffMultiTargetResult: $("#u_diffMultiTargetResult"),
      commonDataState: $("#u_commonDataState"),
      charDiff: $("#u_charDiff"),
      diffIncludeSame: $("#u_diffIncludeSame"),
      diffThemeBtn: $("#u_diffThemeBtn"),
      bundleState: $("#u_bundleState"),
      sourceBundleFile: $("#u_sourceBundleFile"),
      targetBundleFile: $("#u_targetBundleFile"),
      diffScopes: $("#u_diffScopes"),
      applyScopes: $("#u_applyScopes"),
      applyScopeBlock: $("#u_applyScopeBlock"),
      sectionOptionsBlock: $("#u_sectionOptionsBlock"),
      reflectMode: $("#u_reflectMode"),
      reflectHint: $("#u_reflectHint"),
      applyDiffOnly: $("#u_applyDiffOnly"),
      autoBackupPreview: $("#u_autoBackupPreview"),
      backupStatus: $("#u_backupStatus"),
      stopOnError: $("#u_stopOnError"),
      nodeMode: $("#u_nodeMode"),
      reflectSimpleMode: $("#u_reflectSimpleMode"),
      modeSectionBtn: $("#u_modeSectionBtn"),
      modeNodeBtn: $("#u_modeNodeBtn"),
      nodeFilterBlock: $("#u_nodeFilterBlock"),
      nodeSearch: $("#u_nodeSearch"),
      nodeFilterSection: $("#u_nodeFilterSection"),
      nodeFilterType: $("#u_nodeFilterType"),
      nodeFilterSeverity: $("#u_nodeFilterSeverity"),
      nodePropertyPanel: $("#u_nodePropertyPanel"),
      nodePropertyList: $("#u_nodePropertyList"),
      nodePropertyChips: $("#u_nodePropertyChips"),
      nodeWarn: $("#u_nodeWarn"),
      nodeControls: $("#u_nodeControls"),
      reflectNodeWorkbench: $("#u_reflectNodeWorkbench"),
      reflectNodeList: $("#u_reflectNodeList"),
      reflectNodeDetail: $("#u_reflectNodeDetail"),
      reflectPreviewPlayground: $("#u_reflectPreviewPlayground"),
      reflectAssist: $("#u_reflectAssist"),
      reflectHowto: $("#u_reflectHowto"),
      reflectOverview: $("#u_reflectOverview"),
      reflectMainTitle: $("#u_reflectMainTitle"),
      reflectOptionsCard: $("#u_reflectOptionsCard"),
      doDeploy: $("#u_doDeploy"),
      fieldJson: $("#u_fieldJson"),
      overwriteField: $("#u_overwriteField"),
      deployField: $("#u_deployField"),
      fieldJsonFile: $("#u_fieldJsonFile"),
      sourceFieldListContainer: $("#u_sourceFieldListContainer"),
      sourceFieldTbody: $("#u_sourceFieldTbody"),
      sourceFieldCheckAll: $("#u_sourceFieldCheckAll"),
      jsconfigJson: $("#u_jsconfigJson"),
      jsconfigFile: $("#u_jsconfigFile"),
      jsconfigResult: $("#u_jsconfigResult"),
      jsconfigPreview: $("#u_jsconfigPreview"),
      jsconfigDeployAfter: $("#u_jsconfigDeployAfter"),
      settingsExportAppIds: $("#u_settingsExportAppIds"),
      settingsExportSearchKeyword: $("#u_settingsExportSearchKeyword"),
      settingsExportSearchResult: $("#u_settingsExportSearchResult"),
      settingsExportGuest: $("#u_settingsExportGuest"),
      settingsExportPreview: $("#u_settingsExportPreview"),
      settingsExportScopes: $("#u_settingsExportScopes"),
      settingsExportResult: $("#u_settingsExportResult"),
      mermaidText: $("#u_mermaidText"),
      mermaidView: $("#u_mermaidView"),
      erLayout: $("#u_erLayout"),
      erFieldDensity: $("#u_erFieldDensity"),
      erMaxDepth: $("#u_erMaxDepth"),
      erExtraApps: $("#u_erExtraApps"),
      erIncludeSubtable: $("#u_erIncludeSubtable"),
      erIncludeReverseLookup: $("#u_erIncludeReverseLookup"),
      busyOverlay: $("#u_busyOverlay"),
      busyText: $("#u_busyText"),
      tourOverlay: $("#u_tourOverlay"),
      tourSpotlight: $("#u_tourSpotlight"),
      tourCard: $("#u_tourCard"),
      tourStepLabel: $("#u_tourStepLabel"),
      tourTitle: $("#u_tourTitle"),
      tourBody: $("#u_tourBody"),
      tourProgress: $("#u_tourProgress"),
      tourHint: $("#u_tourHint"),
      tourPrev: $("#u_tourPrev"),
      tourNext: $("#u_tourNext"),
      featureTitle: $("#u_featureTitle"),
      featureConn: $("#u_featureConn"),
      launcherMenu: $("#u_launcherMenu"),
      copyTextToClipboard
    };
    Object.assign(ui, ui4);
    setUiRefs(ui4);
    setComponentUi(ui4);
    setComponentDeps({
      buildDiffWarningInfo,
      renderRowColumns,
      stringifyForDiff,
      selectedScopeKeys,
      reflectRowModeById,
      reflectRowDesiredValue,
      getActiveReflectRow,
      resolveApplyScopes,
      commonParams,
      currentDiffSignature,
      parseLookupMapInput,
      makeApplyPlanSignature,
      getSelectedReflectRows,
      switchTab,
      scheduleGuidedTourLayout,
      stableStringify
    });
    setupEventHandlers({
      runDesignExport,
      runDesignCopyMd,
      runDesignExportXlsx,
      runDesignDiffMd,
      runFieldDependencyMap,
      runFetchJsConfig,
      runExportJsConfig,
      runApplyJsConfig,
      runRenderProcessFlow,
      launchKintoneSql,
      runGenerateERDiagram,
      runExportERDiagramHtml,
      runBatchProcess,
      runBatchFileDownload,
      runBatchJsConfigDownload,
      loadViewsForSelect,
      runCsvExport,
      runCsvImport,
      runRecordCopy,
      saveTemplate,
      loadTemplate,
      deleteTemplate,
      runSimStart,
      runSimExecuteAction,
      runApiTester,
      clearApiTesterHistory,
      runPreviewApplyPlan,
      runBackupTargetPreview,
      runApplyPreview,
      runDeployOnly,
      renderCustomizeResult,
      renderTemplateOptions
    });
    renderApiTesterHistory();
    setStatus("待機中");
    if (options.initialTab) {
      switchTab(options.initialTab);
    }
  }

  // src/index.js
  if (typeof window !== "undefined" && window.__KUS_AUTOBOOT__ !== false) {
    runKintoneUnifiedSuite({});
  }
})();
