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
  var TOOL_ID, EXTERNAL_LIBRARIES, DEFAULT_APP_ID, DIALOG_STATE_KEY, DIFF_SNAPSHOT_STATE_KEY, DIFF_SELECTION_SETS_KEY, DIFF_ONBOARDING_DISMISSED_KEY, SECTION_DEFS, SETTINGS_EXPORT_SCOPE_DEFS, SYSTEM_FIELD_TYPES, DEFAULT_SUBTAB_STATE, GUIDED_TOUR_STEPS;
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
        jsdiff: Object.freeze({
          version: "7.0.0",
          cdnUrl: "https://cdnjs.cloudflare.com/ajax/libs/jsdiff/7.0.0/diff.min.js"
        }),
        diff2html: Object.freeze({
          version: "3.4.4",
          cdnUrl: "https://cdnjs.cloudflare.com/ajax/libs/diff2html/3.4.4/diff2html.min.js",
          cssUrl: "https://cdnjs.cloudflare.com/ajax/libs/diff2html/3.4.4/diff2html.min.css"
        }),
        driver: Object.freeze({
          version: "1.3.1",
          cdnUrl: "https://cdn.jsdelivr.net/npm/driver.js@1.3.1/dist/driver.js.iife.js",
          cssUrl: "https://cdn.jsdelivr.net/npm/driver.js@1.3.1/dist/driver.css"
        })
      });
      DEFAULT_APP_ID = String(kintone.app.getId() || "");
      DIALOG_STATE_KEY = `${TOOL_ID}:dialogState`;
      DIFF_SNAPSHOT_STATE_KEY = `${TOOL_ID}:diffSnapshots`;
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
    }
  });

  // src/state.js
  var state;
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
    }
  });

  // src/utils.js
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
  var init_utils = __esm({
    "src/utils.js"() {
      "use strict";
      init_constants();
    }
  });

  // src/diff/engine.js
  var init_engine = __esm({
    "src/diff/engine.js"() {
      "use strict";
      init_constants();
      init_state();
      init_utils();
    }
  });

  // src/api.js
  function buildApiPrefix(guestId, preview) {
    const g = String(guestId || "").trim();
    if (g) return `/k/guest/${g}/v1${preview ? "/preview" : ""}`;
    return `/k/v1${preview ? "/preview" : ""}`;
  }
  function isPreviewRestPrefix(prefix) {
    return String(prefix || "").includes("/v1/preview");
  }
  function assertAllowsMutatingRestCall(prefix, path, method) {
    const m = String(method || "").toUpperCase();
    if (m === "GET" || m === "HEAD" || m === "OPTIONS") return;
    if (m !== "POST" && m !== "PUT" && m !== "DELETE" && m !== "PATCH") return;
    const rel = String(path || "").replace(/\\/g, "/");
    if (rel.includes(DEPLOY_PATH_SNIPPET)) {
      throw new Error(ERR_NO_DEPLOY_API);
    }
    if (!isPreviewRestPrefix(prefix)) {
      throw new Error(ERR_NO_PROD_WRITE);
    }
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
  var DEPLOY_PATH_SNIPPET, ERR_NO_PROD_WRITE, ERR_NO_DEPLOY_API;
  var init_api = __esm({
    "src/api.js"() {
      "use strict";
      init_constants();
      init_utils();
      init_state();
      DEPLOY_PATH_SNIPPET = "app/deploy.json";
      ERR_NO_PROD_WRITE = "本番APIへの追加・更新・削除は無効です。プレビューAPIへの書き込みのみ可能です。本番への反映はkintone管理画面から手動でデプロイしてください。";
      ERR_NO_DEPLOY_API = "デプロイAPIの実行は無効です。本番への反映はkintone管理画面から手動でデプロイしてください。";
    }
  });

  // src/diff/enrich.js
  var init_enrich = __esm({
    "src/diff/enrich.js"() {
      "use strict";
      init_constants();
      init_state();
      init_utils();
      init_engine();
    }
  });

  // src/diff/export.js
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

  // src/ui/dialog.js
  function setRootElement(el) {
    root = el;
  }
  var root;
  var init_dialog = __esm({
    "src/ui/dialog.js"() {
      "use strict";
      init_constants();
      init_state();
      init_utils();
      root = null;
    }
  });

  // src/entries/field-lite-ui.js
  init_constants();

  // src/ui/components.js
  init_constants();
  init_state();
  init_utils();
  init_filter();
  init_engine();
  init_enrich();

  // src/reflect/nodeModeUi.js
  init_state();

  // src/ui/components.js
  init_dialog();

  // src/oss_integrations.js
  init_utils();

  // src/ui/components.js
  var ui2 = {};
  function setComponentUi(uiRefs) {
    ui2 = uiRefs;
  }
  function setStatus(msg, isError) {
    if (!ui2.status) return;
    ui2.status.textContent = msg;
    ui2.status.style.background = "";
    ui2.status.style.color = "";
    ui2.status.classList.remove("status--neutral", "status--error");
    ui2.status.classList.add(isError ? "status--error" : "status--neutral");
    const bar = ui2.status.closest?.(".status-bar");
    if (bar) bar.classList.toggle("status-bar--error", !!isError);
  }

  // src/entries/field-lite-ui.js
  init_utils();

  // src/tabs/field-standalone.js
  init_constants();
  init_utils();
  init_api();
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
    if (!Object.keys(map).length) return { def, changed: false };
    let changed = false;
    const walk = (node) => {
      if (!node || typeof node !== "object") return;
      const rel = node.lookup?.relatedApp;
      if (rel?.app != null) {
        const after = map[String(rel.app)];
        if (after && String(after) !== String(rel.app)) {
          node.lookup.relatedApp.app = String(after);
          changed = true;
        }
      }
      if (node.type === "SUBTABLE" && node.fields) Object.values(node.fields).forEach(walk);
    };
    walk(def);
    return { def, changed };
  }
  async function runFieldApplyStandalone(opts, setStatus2) {
    const { targetAppId, targetGuestId, fieldJson, lookupMapJson, overwrite } = opts;
    if (!targetAppId) throw new Error("比較先アプリIDを入力してください");
    if (!fieldJson?.trim()) throw new Error("フィールドJSONを入力してください");
    let incoming;
    const parsed = JSON.parse(fieldJson);
    if (parsed?.properties && typeof parsed.properties === "object") incoming = parsed.properties;
    else incoming = parsed;
    const lookupMap = {};
    if (lookupMapJson?.trim()) {
      const lm = JSON.parse(lookupMapJson);
      for (const [k, v] of Object.entries(lm || {})) {
        if (String(k).trim() && String(v).trim()) lookupMap[String(k).trim()] = String(v).trim();
      }
    }
    const prefix = buildApiPrefix(targetGuestId || "", true);
    setStatus2("比較先フィールド取得中...");
    const current = await apiGet(prefix, "/app/form/fields.json", { app: targetAppId });
    const currentMap = current.properties || {};
    const adds = {};
    const updates = {};
    const logs = [];
    for (const [code, rawDef] of Object.entries(incoming || {})) {
      const writable = filterWritable({ [code]: rawDef });
      if (!writable[code]) {
        logs.push(`SKIP ${code} (system)`);
        continue;
      }
      const { def } = convertLookup(writable[code], lookupMap);
      if (!def.code) def.code = code;
      if (currentMap[code]) {
        if (overwrite) {
          updates[code] = def;
          logs.push(`UPDATE ${code}`);
        } else logs.push(`SKIP ${code} (exists)`);
      } else {
        adds[code] = def;
        logs.push(`ADD ${code}`);
      }
    }
    setStatus2("フィールド追加/更新中...");
    if (Object.keys(adds).length) await apiPost(prefix, "/app/form/fields.json", { app: targetAppId, properties: adds });
    if (Object.keys(updates).length) await apiPut(prefix, "/app/form/fields.json", { app: targetAppId, properties: updates });
    setStatus2("フィールド追加処理完了");
    return logs;
  }
  async function runLoadFieldsStandalone(opts, setStatus2) {
    const { appId, guestId, preview } = opts;
    if (!appId) throw new Error("アプリIDを入力してください");
    const prefix = buildApiPrefix(guestId || "", !!preview);
    setStatus2("フィールド取得中...");
    const res = await apiGet(prefix, "/app/form/fields.json", { app: appId });
    setStatus2("フィールド取得完了");
    return res.properties || {};
  }

  // src/entries/liteMount.js
  init_dialog();
  var PANEL_STYLE = "position:fixed;z-index:999999;top:max(16px,2vh);right:max(16px,2vw);width:min(440px,94vw);max-height:min(92vh,880px);overflow:hidden;display:flex;flex-direction:column;background:#fff;border:1px solid #e2e8f0;border-radius:14px;box-shadow:0 12px 40px rgba(15,23,42,.2);font:12px/1.5 system-ui,sans-serif;";
  function mountKusLitePanel(opts) {
    const { id, title, note } = opts;
    const old = document.getElementById(id);
    if (old) old.remove();
    const root2 = document.createElement("div");
    root2.id = id;
    root2.style.cssText = PANEL_STYLE;
    const head = document.createElement("div");
    head.style.cssText = "flex-shrink:0;display:flex;align-items:center;justify-content:space-between;gap:8px;padding:12px 14px;background:linear-gradient(125deg,#1d4ed8,#2563eb);color:#fff";
    const t = document.createElement("div");
    t.textContent = title;
    t.style.cssText = "font-weight:700;font-size:14px";
    const close = document.createElement("button");
    close.type = "button";
    close.textContent = "閉じる";
    close.style.cssText = "padding:5px 10px;font-size:11px;border:1px solid rgba(255,255,255,.5);border-radius:8px;background:rgba(255,255,255,.15);color:#fff;cursor:pointer;font-weight:600";
    close.addEventListener("click", () => {
      root2.remove();
      setRootElement(null);
    });
    head.appendChild(t);
    head.appendChild(close);
    root2.appendChild(head);
    const scroll = document.createElement("div");
    scroll.style.cssText = "padding:12px 14px 14px;overflow-y:auto;flex:1;min-height:0";
    if (note) {
      const n = document.createElement("div");
      n.style.cssText = "color:#64748b;font-size:11px;line-height:1.5;margin-bottom:10px;padding:8px 10px;background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0";
      n.textContent = note;
      scroll.appendChild(n);
    }
    const status = document.createElement("div");
    status.style.cssText = "padding:8px 10px;font-size:11px;background:#f1f5f9;border-radius:8px;margin-bottom:8px;min-height:1.2em;color:#0f172a";
    const bodySlot = document.createElement("div");
    scroll.appendChild(status);
    scroll.appendChild(bodySlot);
    const result = document.createElement("div");
    result.style.cssText = "margin-top:8px;max-height:180px;overflow:auto;font-size:11px;border:1px solid #e2e8f0;border-radius:8px;background:#fafafa;display:none";
    scroll.appendChild(result);
    const busyText = document.createElement("span");
    setComponentUi({ status, result, busyText });
    setRootElement(root2);
    root2.appendChild(scroll);
    document.body.appendChild(root2);
    return { root: root2, status, bodySlot, result };
  }

  // src/entries/field-lite-ui.js
  function row(labelHtml, child) {
    const wrap = document.createElement("div");
    wrap.style.cssText = "display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-bottom:10px";
    const lab = document.createElement("span");
    lab.style.cssText = "font-size:12px;font-weight:600;color:#334155;min-width:6em";
    lab.innerHTML = labelHtml;
    wrap.appendChild(lab);
    wrap.appendChild(child);
    return wrap;
  }
  function mountFieldLitePanel() {
    const { bodySlot } = mountKusLitePanel({
      id: "kus-field-lite",
      title: "フィールド追加",
      note: "フィールド定義JSONを比較先アプリへ追加・更新します。統合ツール.js は不要です。"
    });
    const mkInput = (ph, val) => {
      const inp = document.createElement("input");
      inp.type = "text";
      inp.placeholder = ph;
      if (val) inp.value = val;
      inp.style.cssText = "width:min(120px,40vw);padding:6px 10px;border:1px solid #e2e8f0;border-radius:8px;font-size:12px";
      return inp;
    };
    const srcApp = mkInput("比較元アプリID", DEFAULT_APP_ID || "");
    const srcGuest = mkInput("ゲストID（任意）");
    const tgtApp = mkInput("比較先アプリID");
    const tgtGuest = mkInput("ゲストID（任意）");
    bodySlot.appendChild(row("比較元ID", srcApp));
    bodySlot.appendChild(row("元ゲスト", srcGuest));
    bodySlot.appendChild(row("比較先ID", tgtApp));
    bodySlot.appendChild(row("先ゲスト", tgtGuest));
    const fieldJson = document.createElement("textarea");
    fieldJson.rows = 6;
    fieldJson.placeholder = 'フィールド定義JSON（{ "properties": { ... } } 形式）';
    fieldJson.style.cssText = "width:100%;font-size:11px;font-family:monospace;border:1px solid #e2e8f0;border-radius:8px;padding:8px;resize:vertical;background:#f8fafc;color:#334155;margin-bottom:8px";
    bodySlot.appendChild(fieldJson);
    const lookupMap = document.createElement("textarea");
    lookupMap.rows = 2;
    lookupMap.placeholder = 'Lookup AppID変換JSON（任意）: {"旧AppID":"新AppID",...}';
    lookupMap.style.cssText = "width:100%;font-size:11px;font-family:monospace;border:1px solid #e2e8f0;border-radius:8px;padding:8px;resize:vertical;background:#f8fafc;color:#334155;margin-bottom:8px";
    bodySlot.appendChild(lookupMap);
    const optRow = document.createElement("div");
    optRow.style.cssText = "display:flex;flex-wrap:wrap;gap:12px;margin-bottom:12px";
    const mkOpt = (text) => {
      const label = document.createElement("label");
      label.style.cssText = "font-size:11px;color:#475569;display:inline-flex;align-items:center;gap:4px;cursor:pointer";
      const cb = document.createElement("input");
      cb.type = "checkbox";
      label.appendChild(cb);
      label.appendChild(document.createTextNode(text));
      optRow.appendChild(label);
      return cb;
    };
    const overwriteCb = mkOpt("既存フィールドを上書き");
    bodySlot.appendChild(optRow);
    const deployNote = document.createElement("div");
    deployNote.style.cssText = "font-size:11px;color:#64748b;margin:-4px 0 8px;line-height:1.45";
    deployNote.textContent = "本番デプロイはツールから実行できません。";
    bodySlot.appendChild(deployNote);
    const resultPre = document.createElement("pre");
    resultPre.style.cssText = "margin:0;padding:10px;font-size:11px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;max-height:160px;overflow:auto;white-space:pre-wrap;display:none";
    bodySlot.appendChild(resultPre);
    const btnRow = document.createElement("div");
    btnRow.style.cssText = "display:flex;flex-direction:column;gap:8px;margin-top:4px";
    function mkBtn(text, bg) {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = text;
      b.style.cssText = `padding:10px 14px;font-size:13px;font-weight:700;border:none;border-radius:10px;background:${bg};color:#fff;cursor:pointer`;
      return b;
    }
    const bLoadSrc = mkBtn("比較元フィールドを読込", "linear-gradient(180deg,#64748b,#475569)");
    bLoadSrc.addEventListener("click", async () => {
      try {
        const props = await runLoadFieldsStandalone(
          { appId: srcApp.value.trim(), guestId: srcGuest.value.trim(), preview: true },
          (m, e) => setStatus(m, e)
        );
        fieldJson.value = JSON.stringify({ properties: props }, null, 2);
      } catch (e) {
        setStatus(e.message || String(e), true);
      }
    });
    const bLoadTgt = mkBtn("比較先フィールドを読込", "linear-gradient(180deg,#64748b,#475569)");
    bLoadTgt.addEventListener("click", async () => {
      try {
        const props = await runLoadFieldsStandalone(
          { appId: tgtApp.value.trim(), guestId: tgtGuest.value.trim(), preview: true },
          (m, e) => setStatus(m, e)
        );
        fieldJson.value = JSON.stringify({ properties: props }, null, 2);
      } catch (e) {
        setStatus(e.message || String(e), true);
      }
    });
    const bApply = mkBtn("比較先へフィールド反映", "linear-gradient(180deg,#3b82f6,#2563eb)");
    bApply.addEventListener("click", async () => {
      resultPre.style.display = "block";
      resultPre.textContent = "";
      try {
        const logs = await runFieldApplyStandalone(
          {
            targetAppId: tgtApp.value.trim(),
            targetGuestId: tgtGuest.value.trim(),
            fieldJson: fieldJson.value,
            lookupMapJson: lookupMap.value,
            overwrite: overwriteCb.checked,
            deploy: false
          },
          (m, e) => setStatus(m, e)
        );
        resultPre.textContent = logs.join("\n");
      } catch (e) {
        setStatus(e.message || String(e), true);
      }
    });
    btnRow.appendChild(bLoadSrc);
    btnRow.appendChild(bLoadTgt);
    btnRow.appendChild(bApply);
    bodySlot.appendChild(btnRow);
  }

  // src/entries/field-lite-entry.js
  if (!window.kintone?.api || !window.kintone?.app) {
    alert("kintone画面で実行してください");
  } else {
    mountFieldLitePanel();
  }
})();
