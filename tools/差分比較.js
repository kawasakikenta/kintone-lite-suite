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
  var TOOL_ID, EXTERNAL_LIBRARIES, DEFAULT_APP_ID, DIALOG_STATE_KEY, DIFF_SELECTION_SETS_KEY, DIFF_ONBOARDING_DISMISSED_KEY, SECTION_DEFS, SETTINGS_EXPORT_SCOPE_DEFS, META_KEYS, DEFAULT_SUBTAB_STATE, GUIDED_TOUR_STEPS, DIFF_IMPACT_REF_LIMIT, FIELD_REF_EXACT_KEYS, FIELD_REF_ARRAY_KEYS, FIELD_REF_TOKEN_KEYS, DIFF_NORMALIZATION_PRESETS, LINE_DIFF_MAX_CELLS, CHAR_DIFF_MAX_CELLS, DEFAULT_IGNORE_KEYS;
  var init_constants = __esm({
    "src/constants.js"() {
      "use strict";
      init_featureDefs();
      TOOL_ID = "kintone-unified-suite-v2";
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
      DEFAULT_APP_ID = String(kintone.app.getId() || "");
      DIALOG_STATE_KEY = `${TOOL_ID}:dialogState`;
      DIFF_SELECTION_SETS_KEY = `${TOOL_ID}:diffSelectionSets`;
      DIFF_ONBOARDING_DISMISSED_KEY = `${TOOL_ID}:diffOnboardingDismissed`;
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
      META_KEYS = /* @__PURE__ */ new Set(["revision", "creator", "createdAt", "modifier", "modifiedAt"]);
      DEFAULT_SUBTAB_STATE = Object.freeze({
        diff: "conditions",
        reflect: "section",
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
          body: "固定バーの「比較元 → 比較先(プレビュー) 反映」でプレビューへ書き込みます。本番へのデプロイはkintone管理画面から手動で行います（ツールからのデプロイAPIは無効です）。"
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
  function downloadText(filename, text, type) {
    const blob = new Blob([text], { type: type || "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  }
  var init_utils = __esm({
    "src/utils.js"() {
      "use strict";
      init_constants();
    }
  });

  // src/state.js
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
        diffIncludeSame: true,
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
  function extractSectionRevision(res) {
    if (!res || typeof res !== "object") return "";
    const candidates = [res.revision, res.appRevision, res.revisionNo, res.app?.revision];
    for (const value of candidates) {
      if (value == null || value === "") continue;
      return String(value);
    }
    return "";
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

  // src/diff/filter.js
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
  function buildDiffExportComparedBundles(sourceBundle, targetBundle, scopes) {
    const compareScopes = [...new Set((scopes || []).filter(Boolean))];
    return {
      scopes: compareScopes,
      sourceBundle: pickBundleSections(sourceBundle, compareScopes),
      targetBundle: pickBundleSections(targetBundle, compareScopes)
    };
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
    const withSameSections = (() => {
      const baseRows = Array.isArray(rows) ? [...rows] : [];
      const scopeList = Array.isArray(scopes) ? scopes.filter(Boolean) : [];
      if (!scopeList.length || !sourceBundle?.sections || !targetBundle?.sections) return baseRows;
      const issueSectionSet = new Set((Array.isArray(options.fetchIssues) ? options.fetchIssues : []).map((issue) => issue?.sectionKey).filter(Boolean));
      const rowSectionSet = new Set(baseRows.map((row) => row?.sectionKey).filter(Boolean));
      const presetState = options.normalizationState || {};
      for (const sec of scopeList) {
        if (rowSectionSet.has(sec) || issueSectionSet.has(sec)) continue;
        const sourceSec = sourceBundle.sections?.[sec];
        const targetSec = targetBundle.sections?.[sec];
        if (!sourceSec || !targetSec) continue;
        const normalizedSource = normalizeSectionForCompare(sec, sourceSec, presetState);
        const normalizedTarget = normalizeSectionForCompare(sec, targetSec, presetState);
        if (JSON.stringify(normalizedSource) !== JSON.stringify(normalizedTarget)) continue;
        const sectionLabel = (SECTION_DEFS.find((def) => def.key === sec) || {}).label || sec;
        baseRows.push({
          _id: `same:${sec}`,
          sectionKey: sec,
          section: sectionLabel,
          type: "same",
          path: sec,
          left: normalizedSource,
          right: normalizedTarget,
          severity: "low"
        });
        rowSectionSet.add(sec);
      }
      return baseRows;
    })();
    const summary = summarizeRows(withSameSections);
    const sectionText = (scopes || []).map((k) => SECTION_DEFS.find((d) => d.key === k)?.label || k).join(", ");
    const sectionLabelMap = Object.fromEntries(SECTION_DEFS.map((d) => [d.key, d.label]));
    const MAX_EXPORT_ROWS = 2e3;
    const exportRows = withSameSections.slice(0, MAX_EXPORT_ROWS);
    const fetchIssues = Array.isArray(options.fetchIssues) ? options.fetchIssues : [];
    const normalizationLabels = getActiveDiffNormalizationLabels(options.normalizationState || {});
    const warning = options.warning || { threshold: 0, exceeded: false, total: withSameSections.length + fetchIssues.length };
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
      totalRows: withSameSections.length,
      renderedRows: exportRows.length,
      truncated: withSameSections.length > exportRows.length,
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
  var init_export = __esm({
    "src/diff/export.js"() {
      init_constants();
      init_utils();
      init_state();
      init_engine();
      init_enrich();
      init_filter();
      init_api();
    }
  });

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

  // src/tabs/diff-export-standalone.js
  init_utils();
  init_engine();
  init_export();
  function shouldIncludeComparedContent2(mode) {
    return mode === "withCompared";
  }
  function comparedScopesForExport(exportInfo, scopes, fetchIssues) {
    const fallback = [...new Set((scopes || []).filter(Boolean))];
    if ((exportInfo?.mode || "all") === "all") return fallback;
    const rowScopes = [...new Set((exportInfo?.rows || []).map((r) => r.sectionKey).filter(Boolean))];
    if (rowScopes.length) return rowScopes;
    const issueScopes = [...new Set((fetchIssues || []).map((i) => i.sectionKey).filter(Boolean))];
    return issueScopes.length ? issueScopes : fallback;
  }
  function warningInfoLite(rows, fetchIssues) {
    const diffCount = countActualDiffRows(rows || []);
    const issueCount = (fetchIssues || []).length;
    const total = diffCount + issueCount;
    return { threshold: 0, diffCount, issueCount, total, exceeded: false };
  }
  function runExportDiffJsonStandalone(ctx) {
    const rows = ctx.rows || [];
    const fetchIssues = ctx.fetchIssues || [];
    const exportInfo = { mode: "all", label: "全差分", rows };
    const exportContentMode = ctx.exportContentMode || "diffOnly";
    const compareInfo = shouldIncludeComparedContent2(exportContentMode) ? buildDiffExportComparedBundles(
      ctx.sourceBundle,
      ctx.targetBundle,
      comparedScopesForExport(exportInfo, ctx.scopes, fetchIssues)
    ) : null;
    if (!rows.length && !fetchIssues.length && !compareInfo?.scopes?.length) {
      throw new Error("出力できる比較結果がありません");
    }
    const payload = {
      generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
      exportMode: exportInfo.mode,
      exportLabel: exportInfo.label,
      exportContentMode,
      exportContentLabel: getDiffExportContentLabel(exportContentMode),
      normalization: ctx.normalizationPresetState || {},
      warning: warningInfoLite(rows, fetchIssues),
      source: ctx.sourceBundle,
      target: ctx.targetBundle,
      diffCount: rows.length,
      fetchIssues,
      rows,
      comparedScopes: compareInfo?.scopes || [],
      sourceComparedBundle: compareInfo?.sourceBundle || null,
      targetComparedBundle: compareInfo?.targetBundle || null
    };
    downloadText(`diff_${nowStamp()}.json`, JSON.stringify(payload, null, 2), "application/json");
  }
  function runExportDiffHtmlStandalone(ctx) {
    const rows = ctx.rows || [];
    const fetchIssues = ctx.fetchIssues || [];
    const scopes = ctx.scopes || [];
    const exportInfo = { mode: "all", label: "全差分", rows };
    const exportContentMode = ctx.exportContentMode || "diffOnly";
    const compareInfo = shouldIncludeComparedContent2(exportContentMode) ? buildDiffExportComparedBundles(
      ctx.sourceBundle,
      ctx.targetBundle,
      comparedScopesForExport(exportInfo, scopes, fetchIssues)
    ) : null;
    if (!rows.length && !fetchIssues.length && !compareInfo?.scopes?.length) {
      throw new Error("出力できる比較結果がありません");
    }
    const html = buildDiffHtml(ctx.sourceBundle, ctx.targetBundle, rows, scopes, ctx.ignoreKeys || "", {
      fetchIssues,
      exportMode: exportInfo.mode,
      exportLabel: exportInfo.label,
      exportContentMode,
      exportContentLabel: getDiffExportContentLabel(exportContentMode),
      compareScopes: compareInfo?.scopes || [],
      compareSourceBundle: compareInfo?.sourceBundle || null,
      compareTargetBundle: compareInfo?.targetBundle || null,
      normalizationState: ctx.normalizationPresetState || {},
      warning: warningInfoLite(rows, fetchIssues)
    });
    downloadText(`diff_${nowStamp()}.html`, html, "text/html");
  }
  function runExportBundleJsonStandalone(sourceBundle, targetBundle) {
    if (!sourceBundle || !targetBundle) throw new Error("先に差分比較を実行してください");
    const payload = {
      generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
      source: sourceBundle,
      target: targetBundle
    };
    downloadText(`bundle_${nowStamp()}.json`, JSON.stringify(payload, null, 2), "application/json");
  }
  function runExportPatchJsonStandalone(rows, sourceBundle, targetBundle) {
    if (!countActualDiffRows(rows || [])) throw new Error("出力できる差分がありません");
    const payload = buildPatchPayload(rows, sourceBundle, targetBundle);
    downloadText(`patch_${nowStamp()}.json`, JSON.stringify(payload, null, 2), "application/json");
  }

  // src/entries/diff-lite-ui.js
  var SCOPE_OPTS = [
    ["fieldSettings", "フィールド", true],
    ["layoutSettings", "レイアウト", true],
    ["viewSettings", "ビュー", true],
    ["reportSettings", "レポート", false],
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
  var STYLE_ID = "kus-diff-lite-styles";
  function ensureDiffLiteStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const s = document.createElement("style");
    s.id = STYLE_ID;
    s.textContent = `
#kus-diff-lite-root.kus-dlite{
  --kus-accent:#2563eb;
  --kus-accent2:#0ea5e9;
  --kus-border:#e2e8f0;
  --kus-muted:#64748b;
  --kus-text:#0f172a;
  position:fixed;z-index:999999;top:max(16px,2vh);right:max(16px,2vw);
  width:min(480px,96vw);max-height:min(92vh,900px);overflow:hidden;
  display:flex;flex-direction:column;
  background:#fff;border-radius:16px;
  border:1px solid var(--kus-border);
  box-shadow:0 4px 6px -1px rgba(15,23,42,.08),0 25px 50px -12px rgba(15,23,42,.28);
  font:13px/1.5 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
  color:var(--kus-text);
}
.kus-dlite__hero{
  flex-shrink:0;
  background:linear-gradient(125deg,#1d4ed8 0%,var(--kus-accent) 42%,var(--kus-accent2) 100%);
  color:#fff;padding:14px 16px 16px;
  display:flex;align-items:flex-start;justify-content:space-between;gap:12px;
}
.kus-dlite__hero-main{min-width:0}
.kus-dlite__title{margin:0;font-size:16px;font-weight:700;letter-spacing:.02em;line-height:1.25}
.kus-dlite__badge{
  display:inline-block;margin-top:8px;font-size:10px;font-weight:600;letter-spacing:.04em;
  text-transform:uppercase;background:rgba(255,255,255,.22);padding:3px 10px;border-radius:999px;
}
.kus-dlite__close{
  flex-shrink:0;border:1px solid rgba(255,255,255,.45);background:rgba(255,255,255,.12);
  color:#fff;border-radius:10px;padding:6px 12px;font-size:12px;font-weight:600;cursor:pointer;
}
.kus-dlite__close:hover{background:rgba(255,255,255,.22)}
.kus-dlite__body{padding:14px 16px 16px;overflow-y:auto;flex:1;min-height:0}
.kus-dlite__info{
  font-size:12px;color:var(--kus-muted);line-height:1.55;margin:0 0 14px;
  padding:10px 12px;background:#f8fafc;border-radius:10px;border:1px solid #e2e8f0;
}
.kus-dlite__card{
  background:#fafbfc;border:1px solid var(--kus-border);border-radius:12px;padding:12px 14px;margin-bottom:12px;
}
.kus-dlite__card-title{
  font-size:11px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:.06em;margin:0 0 10px;
  padding-bottom:6px;border-bottom:1px solid #e2e8f0;
}
.kus-dlite__row{display:flex;flex-wrap:wrap;align-items:center;gap:8px 10px;margin-bottom:8px}
.kus-dlite__row:last-child{margin-bottom:0}
.kus-dlite__label{font-size:12px;font-weight:600;color:#334155;min-width:4.5em}
.kus-dlite__input,.kus-dlite__textarea,.kus-dlite__select{
  border:1px solid var(--kus-border);border-radius:8px;padding:7px 10px;font-size:12px;
  background:#fff;color:var(--kus-text);outline:none;transition:border-color .15s,box-shadow .15s;
}
.kus-dlite__input:focus,.kus-dlite__textarea:focus,.kus-dlite__select:focus{
  border-color:var(--kus-accent);box-shadow:0 0 0 3px rgba(37,99,235,.15);
}
.kus-dlite__input--id{width:min(120px,36vw)}
.kus-dlite__input--guest{width:min(108px,32vw)}
.kus-dlite__check{font-size:12px;color:#475569;display:inline-flex;align-items:center;gap:6px;cursor:pointer;user-select:none}
.kus-dlite__check input{width:14px;height:14px;accent-color:var(--kus-accent)}
.kus-dlite__chips{display:flex;flex-wrap:wrap;gap:6px}
.kus-dlite__chip{
  display:inline-flex;align-items:center;gap:6px;font-size:11px;color:#334155;
  background:#fff;border:1px solid #cbd5e1;border-radius:999px;padding:4px 10px 4px 6px;cursor:pointer;user-select:none;
}
.kus-dlite__chip input{accent-color:var(--kus-accent);width:13px;height:13px}
.kus-dlite__chip:hover{border-color:#94a3b8;background:#f8fafc}
.kus-dlite__textarea{width:100%;box-sizing:border-box;min-height:52px;resize:vertical;font-family:inherit}
.kus-dlite__norms{display:flex;flex-wrap:wrap;gap:10px 14px}
.kus-dlite__btn-run{
  width:100%;margin-top:4px;padding:11px 16px;font-size:13px;font-weight:700;border:none;border-radius:10px;
  background:linear-gradient(180deg,#3b82f6 0%,var(--kus-accent) 100%);color:#fff;cursor:pointer;
  box-shadow:0 2px 4px rgba(37,99,235,.35);transition:filter .15s,transform .05s;
}
.kus-dlite__btn-run:hover{filter:brightness(1.06)}
.kus-dlite__btn-run:active{transform:scale(.99)}
.kus-dlite__export-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
@media(max-width:380px){.kus-dlite__export-grid{grid-template-columns:1fr}}
.kus-dlite__btn-sub{
  padding:8px 10px;font-size:11px;font-weight:600;border:1px solid #cbd5e1;border-radius:10px;
  background:linear-gradient(180deg,#fff,#f1f5f9);color:#334155;cursor:pointer;
}
.kus-dlite__btn-sub:hover{border-color:#94a3b8;background:#fff}
.kus-dlite__status{
  margin-top:12px;padding:10px 12px;border-radius:10px;font-size:12px;line-height:1.45;min-height:2.8em;
  border:1px solid transparent;
}
.kus-dlite__status--neutral{background:#f1f5f9;color:#334155;border-color:#e2e8f0}
.kus-dlite__status--ok{background:#ecfdf5;color:#065f46;border-color:#a7f3d0}
.kus-dlite__status--err{background:#fef2f2;color:#991b1b;border-color:#fecaca}
.kus-dlite__result{
  margin-top:10px;padding:10px 12px;background:#0f172a;color:#e2e8f0;border-radius:10px;
  font:11px/1.45 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
  white-space:pre-wrap;word-break:break-word;max-height:220px;overflow:auto;
  border:1px solid #1e293b;
}
`;
    document.head.appendChild(s);
  }
  function setStatusBar(el, text, tone) {
    el.textContent = text || "";
    el.classList.remove("kus-dlite__status--neutral", "kus-dlite__status--ok", "kus-dlite__status--err");
    el.classList.add(
      tone === "ok" ? "kus-dlite__status--ok" : tone === "err" ? "kus-dlite__status--err" : "kus-dlite__status--neutral"
    );
  }
  function renderPanel() {
    ensureDiffLiteStyles();
    const old = document.getElementById("kus-diff-lite-root");
    if (old) old.remove();
    const root = document.createElement("div");
    root.id = "kus-diff-lite-root";
    root.className = "kus-dlite";
    const hero = document.createElement("div");
    hero.className = "kus-dlite__hero";
    const heroMain = document.createElement("div");
    heroMain.className = "kus-dlite__hero-main";
    const title = document.createElement("h1");
    title.className = "kus-dlite__title";
    title.textContent = "差分比較";
    const badge = document.createElement("div");
    badge.className = "kus-dlite__badge";
    badge.textContent = "軽量版 · 出力対応";
    heroMain.appendChild(title);
    heroMain.appendChild(badge);
    const close = document.createElement("button");
    close.id = "kus-close";
    close.type = "button";
    close.className = "kus-dlite__close";
    close.textContent = "閉じる";
    hero.appendChild(heroMain);
    hero.appendChild(close);
    root.appendChild(hero);
    const body = document.createElement("div");
    body.className = "kus-dlite__body";
    const info = document.createElement("p");
    info.className = "kus-dlite__info";
    info.textContent = "API 取得と差分計算はこのスクリプトに同梱されています（統合ツール.js は不要）。実行後に JSON / HTML / バンドル / パッチを保存できます。";
    body.appendChild(info);
    function card(titleText) {
      const c = document.createElement("div");
      c.className = "kus-dlite__card";
      const tt = document.createElement("div");
      tt.className = "kus-dlite__card-title";
      tt.textContent = titleText;
      c.appendChild(tt);
      return c;
    }
    const cApp = card("アプリと環境");
    const rowSrc = document.createElement("div");
    rowSrc.className = "kus-dlite__row";
    const ls = document.createElement("span");
    ls.className = "kus-dlite__label";
    ls.textContent = "比較元";
    const srcApp = document.createElement("input");
    srcApp.id = "kus-src-app";
    srcApp.type = "text";
    srcApp.placeholder = "アプリID";
    srcApp.className = "kus-dlite__input kus-dlite__input--id";
    const srcGuest = document.createElement("input");
    srcGuest.id = "kus-src-guest";
    srcGuest.type = "text";
    srcGuest.placeholder = "ゲストID";
    srcGuest.className = "kus-dlite__input kus-dlite__input--guest";
    const srcPrv = document.createElement("input");
    srcPrv.id = "kus-src-preview";
    srcPrv.type = "checkbox";
    const srcPrvL = document.createElement("label");
    srcPrvL.className = "kus-dlite__check";
    srcPrvL.appendChild(srcPrv);
    srcPrvL.appendChild(document.createTextNode("プレビューで取得"));
    rowSrc.appendChild(ls);
    rowSrc.appendChild(srcApp);
    rowSrc.appendChild(srcGuest);
    rowSrc.appendChild(srcPrvL);
    cApp.appendChild(rowSrc);
    const rowTgt = document.createElement("div");
    rowTgt.className = "kus-dlite__row";
    const lt = document.createElement("span");
    lt.className = "kus-dlite__label";
    lt.textContent = "比較先";
    const tgtApp = document.createElement("input");
    tgtApp.id = "kus-tgt-app";
    tgtApp.type = "text";
    tgtApp.placeholder = "アプリID";
    tgtApp.className = "kus-dlite__input kus-dlite__input--id";
    const tgtGuest = document.createElement("input");
    tgtGuest.id = "kus-tgt-guest";
    tgtGuest.type = "text";
    tgtGuest.placeholder = "ゲストID";
    tgtGuest.className = "kus-dlite__input kus-dlite__input--guest";
    const tgtPrv = document.createElement("input");
    tgtPrv.id = "kus-tgt-preview";
    tgtPrv.type = "checkbox";
    const tgtPrvL = document.createElement("label");
    tgtPrvL.className = "kus-dlite__check";
    tgtPrvL.appendChild(tgtPrv);
    tgtPrvL.appendChild(document.createTextNode("プレビューで取得"));
    rowTgt.appendChild(lt);
    rowTgt.appendChild(tgtApp);
    rowTgt.appendChild(tgtGuest);
    rowTgt.appendChild(tgtPrvL);
    cApp.appendChild(rowTgt);
    body.appendChild(cApp);
    const cScope = card("比較セクション");
    const scBox = document.createElement("div");
    scBox.className = "kus-dlite__chips";
    for (const kv of SCOPE_OPTS) {
      const lb = document.createElement("label");
      lb.className = "kus-dlite__chip";
      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.className = "kus-scope";
      cb.value = kv[0];
      cb.checked = !!kv[2];
      lb.appendChild(cb);
      lb.appendChild(document.createTextNode(kv[1]));
      scBox.appendChild(lb);
    }
    cScope.appendChild(scBox);
    body.appendChild(cScope);
    const cAdv = card("詳細オプション");
    const ign = document.createElement("textarea");
    ign.id = "kus-ignore";
    ign.rows = 2;
    ign.placeholder = "無視キー（カンマ区切り）";
    ign.className = "kus-dlite__textarea";
    const ignLab = document.createElement("div");
    ignLab.className = "kus-dlite__row";
    ignLab.style.marginBottom = "8px";
    const ignL = document.createElement("span");
    ignL.className = "kus-dlite__label";
    ignL.textContent = "無視キー";
    ignLab.appendChild(ignL);
    cAdv.appendChild(ignLab);
    cAdv.appendChild(ign);
    const inc = document.createElement("input");
    inc.id = "kus-include-same";
    inc.type = "checkbox";
    const incL = document.createElement("label");
    incL.className = "kus-dlite__check";
    incL.style.marginTop = "10px";
    incL.style.display = "inline-flex";
    incL.appendChild(inc);
    incL.appendChild(document.createTextNode("同一行も差分行に含める"));
    cAdv.appendChild(incL);
    const n1 = document.createElement("input");
    n1.id = "kus-norm-view";
    n1.type = "checkbox";
    const n2 = document.createElement("input");
    n2.id = "kus-norm-perm";
    n2.type = "checkbox";
    const n3 = document.createElement("input");
    n3.id = "kus-norm-all";
    n3.type = "checkbox";
    const norm = document.createElement("div");
    norm.className = "kus-dlite__norms";
    norm.style.marginTop = "12px";
    function normLab(el, t) {
      const x = document.createElement("label");
      x.className = "kus-dlite__check";
      x.appendChild(el);
      x.appendChild(document.createTextNode(t));
      return x;
    }
    norm.appendChild(normLab(n1, "ビュー順序を正規化"));
    norm.appendChild(normLab(n2, "権限順序を正規化"));
    norm.appendChild(normLab(n3, "配列順序を無視"));
    cAdv.appendChild(norm);
    body.appendChild(cAdv);
    const run = document.createElement("button");
    run.id = "kus-run";
    run.type = "button";
    run.className = "kus-dlite__btn-run";
    run.textContent = "差分比較を実行";
    body.appendChild(run);
    const cOut = card("ファイル出力");
    const hint = document.createElement("div");
    hint.style.cssText = "font-size:11px;color:#64748b;margin-bottom:10px;line-height:1.45";
    hint.textContent = "比較完了後に利用できます。レポートに生設定を含めるか選べます。";
    cOut.appendChild(hint);
    const expRow = document.createElement("div");
    expRow.className = "kus-dlite__row";
    const expLab = document.createElement("span");
    expLab.className = "kus-dlite__label";
    expLab.textContent = "レポート";
    const expMode = document.createElement("select");
    expMode.className = "kus-dlite__select";
    expMode.style.flex = "1";
    expMode.style.minWidth = "0";
    [["diffOnly", "差分のみ"], ["withCompared", "差分 + 比較セクションの設定"]].forEach(([v, t]) => {
      const o = document.createElement("option");
      o.value = v;
      o.textContent = t;
      expMode.appendChild(o);
    });
    expRow.appendChild(expLab);
    expRow.appendChild(expMode);
    cOut.appendChild(expRow);
    const grid = document.createElement("div");
    grid.className = "kus-dlite__export-grid";
    function mkSubBtn(text) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "kus-dlite__btn-sub";
      b.textContent = text;
      return b;
    }
    const bJson = mkSubBtn("差分 JSON");
    const bHtml = mkSubBtn("差分 HTML");
    const bBundle = mkSubBtn("バンドル JSON");
    const bPatch = mkSubBtn("パッチ JSON");
    grid.appendChild(bJson);
    grid.appendChild(bHtml);
    grid.appendChild(bBundle);
    grid.appendChild(bPatch);
    cOut.appendChild(grid);
    body.appendChild(cOut);
    const st = document.createElement("div");
    st.id = "kus-status";
    st.className = "kus-dlite__status kus-dlite__status--neutral";
    st.textContent = "比較元・比較先のアプリIDを入力して実行してください。";
    body.appendChild(st);
    const res = document.createElement("pre");
    res.id = "kus-result";
    res.className = "kus-dlite__result";
    res.textContent = "";
    body.appendChild(res);
    root.appendChild(body);
    document.body.appendChild(root);
    return { root, bJson, bHtml, bBundle, bPatch, expMode, st, res };
  }
  function readForm(root) {
    const q = (id) => root.querySelector(`#${id}`);
    const scopes = [...root.querySelectorAll("input.kus-scope:checked")].map((x) => x.value);
    return {
      source: {
        appId: q("kus-src-app").value.trim(),
        guestId: q("kus-src-guest").value.trim(),
        preview: q("kus-src-preview").checked
      },
      target: {
        appId: q("kus-tgt-app").value.trim(),
        guestId: q("kus-tgt-guest").value.trim(),
        preview: q("kus-tgt-preview").checked
      },
      scopes,
      ignoreKeys: q("kus-ignore").value,
      includeSame: q("kus-include-same").checked,
      normalizationPresetState: {
        viewOrder: q("kus-norm-view").checked,
        permissionOrder: q("kus-norm-perm").checked,
        generalArrayOrder: q("kus-norm-all").checked
      }
    };
  }
  function printRows(rows, el) {
    const max = 400;
    const lines = [];
    for (let i = 0; i < rows.length && i < max; i++) {
      const r = rows[i];
      lines.push(`${r.sectionKey || ""}	${r.type || ""}	${r.path || ""}	${r.label || ""}`);
    }
    el.textContent = lines.join("\n");
    if (rows.length > max) el.textContent += `
... 他 ${rows.length - max} 件`;
  }
  function mountDiffLitePanel(runDiffStandalone2) {
    const { root, bJson, bHtml, bBundle, bPatch, expMode, st, res } = renderPanel();
    let cache = null;
    function exportCtx() {
      if (!cache) throw new Error("先に差分比較を実行してください");
      return {
        ...cache,
        exportContentMode: expMode.value || "diffOnly"
      };
    }
    root.querySelector("#kus-run").onclick = () => {
      setStatusBar(st, "実行中…", "neutral");
      res.textContent = "";
      cache = null;
      const f = readForm(root);
      runDiffStandalone2({
        source: f.source,
        target: f.target,
        scopes: f.scopes,
        ignoreKeys: f.ignoreKeys,
        includeSame: f.includeSame,
        normalizationPresetState: f.normalizationPresetState,
        onStatus: (m) => {
          setStatusBar(st, m, "neutral");
        }
      }).then((out) => {
        cache = {
          rows: out.rows,
          fetchIssues: out.fetchIssues || [],
          sourceBundle: out.sourceBundle,
          targetBundle: out.targetBundle,
          scopes: f.scopes,
          ignoreKeys: f.ignoreKeys,
          normalizationPresetState: f.normalizationPresetState
        };
        printRows(out.rows, res);
        setStatusBar(
          st,
          `${out.summary?.text || "完了"} — ファイル出力ボタンから保存できます。`,
          "ok"
        );
      }).catch((e) => {
        setStatusBar(st, `エラー: ${e && e.message ? e.message : String(e)}`, "err");
      });
    };
    bJson.onclick = () => {
      try {
        runExportDiffJsonStandalone(exportCtx());
        setStatusBar(st, "差分 JSON をダウンロードしました。", "ok");
      } catch (e) {
        setStatusBar(st, `エラー: ${e.message || String(e)}`, "err");
      }
    };
    bHtml.onclick = () => {
      try {
        runExportDiffHtmlStandalone(exportCtx());
        setStatusBar(st, "差分 HTML をダウンロードしました。", "ok");
      } catch (e) {
        setStatusBar(st, `エラー: ${e.message || String(e)}`, "err");
      }
    };
    bBundle.onclick = () => {
      try {
        if (!cache) throw new Error("先に差分比較を実行してください");
        runExportBundleJsonStandalone(cache.sourceBundle, cache.targetBundle);
        setStatusBar(st, "バンドル JSON をダウンロードしました。", "ok");
      } catch (e) {
        setStatusBar(st, `エラー: ${e.message || String(e)}`, "err");
      }
    };
    bPatch.onclick = () => {
      try {
        if (!cache) throw new Error("先に差分比較を実行してください");
        runExportPatchJsonStandalone(cache.rows, cache.sourceBundle, cache.targetBundle);
        setStatusBar(st, "パッチ JSON をダウンロードしました。", "ok");
      } catch (e) {
        setStatusBar(st, `エラー: ${e.message || String(e)}`, "err");
      }
    };
    root.querySelector("#kus-close").onclick = () => {
      root.remove();
    };
  }

  // src/entries/diff-lite-entry.js
  if (!window.kintone?.api || !window.kintone?.app) {
    alert("kintone画面で実行してください");
  } else {
    mountDiffLitePanel(runDiffStandalone);
  }
})();
