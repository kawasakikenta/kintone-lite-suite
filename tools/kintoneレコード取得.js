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
  var TOOL_ID, EXTERNAL_LIBRARIES, DEFAULT_APP_ID, DIALOG_STATE_KEY, DIFF_SNAPSHOT_STATE_KEY, DIFF_SELECTION_SETS_KEY, DIFF_ONBOARDING_DISMISSED_KEY, SECTION_DEFS, SETTINGS_EXPORT_SCOPE_DEFS, DEFAULT_SUBTAB_STATE, GUIDED_TOUR_STEPS;
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

  // src/entries/record-lite-ui.js
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

  // src/tabs/record-standalone.js
  init_constants();
  init_utils();
  init_api();
  async function fetchAllRecords(prefix, app, query, setStatus2) {
    let all = [];
    let offset = 0;
    while (true) {
      setStatus2(`レコード取得中... (${all.length}件取得済)`);
      const q = query ? `${query} order by $id asc limit 500 offset ${offset}` : `$id > 0 order by $id asc limit 500 offset ${offset}`;
      const resp = await apiGet(prefix, "/records.json", { app, query: q });
      const batch = resp.records || [];
      all = all.concat(batch);
      if (batch.length < 500) break;
      offset += 500;
    }
    return all;
  }
  async function fetchRecordIds(prefix, app, query, setStatus2) {
    const ids = [];
    let offset = 0;
    while (true) {
      setStatus2(`対象レコード取得中... (${ids.length}件)`);
      let q = query ? `${query} ` : "";
      q += `order by $id asc limit 500 offset ${offset}`;
      const resp = await apiGet(prefix, "/records.json", { app, query: q, fields: ["$id"] });
      const batch = resp.records || [];
      if (!batch.length) break;
      batch.forEach((r) => ids.push(Number(r.$id.value)));
      if (batch.length < 500) break;
      offset += 500;
    }
    return ids;
  }
  async function runCsvExportStandalone(opts, setStatus2) {
    const { appId, guestId, query, filename } = opts;
    if (!appId) throw new Error("アプリIDを入力してください");
    const prefix = buildApiPrefix(guestId || "", false);
    setStatus2("フィールド情報取得中...");
    const fields = await apiGet(prefix, "/app/form/fields.json", { app: appId });
    const propKeys = Object.keys(fields.properties || {});
    if (!propKeys.length) throw new Error("出力できるフィールドがありません");
    const records = await fetchAllRecords(prefix, appId, query || "", setStatus2);
    if (!records.length) throw new Error("出力するレコードがありません");
    setStatus2(`CSV生成中... (${records.length}件)`);
    const esc2 = (val) => {
      const s = String(val == null ? "" : val);
      return s.includes(",") || s.includes('"') || s.includes("\n") ? '"' + s.replace(/"/g, '""') + '"' : s;
    };
    const extractValue = (rec, code) => {
      const f = rec[code];
      if (!f) return "";
      if (["USER_SELECT", "ORGANIZATION_SELECT", "GROUP_SELECT"].includes(f.type)) return (f.value || []).map((v) => v.code || v.name).join(",");
      if (["CHECK_BOX", "MULTI_SELECT"].includes(f.type)) return (f.value || []).join(",");
      if (f.type === "FILE") return (f.value || []).map((file) => file.name).join(",");
      if (f.type === "SUBTABLE") return (f.value || []).length + "行";
      if (typeof f.value === "object" && f.value !== null) return JSON.stringify(f.value);
      return f.value;
    };
    const lines = [propKeys.map(esc2).join(",")];
    for (const rec of records) lines.push(propKeys.map((k) => esc2(extractValue(rec, k))).join(","));
    const csvStr = "\uFEFF" + lines.join("\n");
    const blob = new Blob([csvStr], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename || "records.csv";
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5e3);
    setStatus2(`CSV出力完了 (${records.length}件)`);
  }
  async function runCsvImportStandalone(opts, setStatus2) {
    const { appId, guestId, file } = opts;
    if (!appId) throw new Error("アプリIDを入力してください");
    if (!file) throw new Error("CSVファイルを選択してください");
    const prefix = buildApiPrefix(guestId || "", false);
    setStatus2("CSVファイルを読み込み中...");
    const text = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = () => reject(new Error("ファイルの読み取りに失敗"));
      reader.readAsText(file);
    });
    const parseCsv = (csv) => {
      const rows2 = [];
      let current = [], cell = "", inQ = false;
      for (let i = 0; i < csv.length; i++) {
        const c = csv[i], n = csv[i + 1];
        if (inQ) {
          if (c === '"') {
            if (n === '"') {
              cell += '"';
              i++;
            } else inQ = false;
          } else cell += c;
        } else {
          if (c === '"') inQ = true;
          else if (c === ",") {
            current.push(cell);
            cell = "";
          } else if (c === "\n" || c === "\r") {
            if (c === "\r" && n === "\n") i++;
            current.push(cell);
            rows2.push(current);
            current = [];
            cell = "";
          } else cell += c;
        }
      }
      if (cell || current.length) {
        current.push(cell);
        rows2.push(current);
      }
      return rows2;
    };
    const rows = parseCsv(text.replace(/^\uFEFF/, ""));
    if (rows.length < 2) throw new Error("ヘッダ行とデータ行が必要です");
    const header = rows[0].map((h) => h.trim());
    const records = [];
    for (let i = 1; i < rows.length; i++) {
      if (rows[i].length === 1 && rows[i][0] === "") continue;
      const rec = {};
      for (let j = 0; j < header.length; j++) {
        if (!header[j] || header[j] === "$id") continue;
        rec[header[j]] = { value: rows[i][j] !== void 0 ? rows[i][j] : "" };
      }
      records.push(rec);
    }
    if (!records.length) throw new Error("登録するデータがありません");
    if (!confirm(`CSVから ${records.length}件 のレコードをインポートしますか？`)) return;
    let ok = 0;
    for (let i = 0; i < records.length; i += 100) {
      const batch = records.slice(i, i + 100);
      setStatus2(`インポート中... (${i + 1}～${i + batch.length} / ${records.length}件)`);
      await apiPost(prefix, "/records.json", { app: appId, records: batch });
      ok += batch.length;
    }
    setStatus2(`インポート完了: ${ok}件`);
  }
  async function runBatchProcessStandalone(opts, setStatus2) {
    const { appId, guestId, query, action, assignee } = opts;
    if (!appId) throw new Error("アプリIDを入力してください");
    if (!action) throw new Error("アクション名を入力してください");
    const prefix = buildApiPrefix(guestId || "", false);
    const ids = await fetchRecordIds(prefix, appId, query || "", setStatus2);
    if (!ids.length) throw new Error("処理対象のレコードが0件です");
    if (!confirm(`${ids.length}件にアクション「${action}」を実行しますか？`)) return;
    let ok = 0;
    for (let i = 0; i < ids.length; i += 100) {
      const batch = ids.slice(i, i + 100);
      const body = { app: appId, records: batch.map((id) => {
        const r = { id, action };
        if (assignee) r.assignee = assignee;
        return r;
      }) };
      await apiPut(prefix, "/records/status.json", body);
      ok += batch.length;
      setStatus2(`ステータス更新中... ${ok}/${ids.length}件`);
    }
    setStatus2(`ステータス一括更新完了 (${ok}件)`);
  }
  async function runRecordCopyStandalone(opts, setStatus2) {
    const { sourceAppId, sourceGuestId, targetAppId, targetGuestId, query } = opts;
    if (!sourceAppId || !targetAppId) throw new Error("比較元と比較先のアプリIDを指定してください");
    const srcPrefix = buildApiPrefix(sourceGuestId || "", false);
    const tgtPrefix = buildApiPrefix(targetGuestId || "", false);
    const records = await fetchAllRecords(srcPrefix, sourceAppId, query || "", setStatus2);
    if (!records.length) {
      setStatus2("コピー対象のレコードがありません");
      return;
    }
    if (!confirm(`${records.length}件を比較先(${targetAppId})へコピーしますか？`)) return;
    const systemTypes = /* @__PURE__ */ new Set(["RECORD_NUMBER", "CREATOR", "CREATED_TIME", "MODIFIER", "UPDATED_TIME", "STATUS", "STATUS_ASSIGNEE", "CALC"]);
    const systemFields = /* @__PURE__ */ new Set(["$id", "$revision", "作成者", "作成日時", "更新者", "更新日時", "レコード番号", "ステータス", "作業者"]);
    const clean = records.map((rec) => {
      const out = {};
      for (const [k, v] of Object.entries(rec)) {
        if (systemFields.has(k) || systemTypes.has(v.type)) continue;
        if (v.type === "SUBTABLE") {
          out[k] = { value: v.value.map((sr) => {
            const c = {};
            for (const [sk, sv] of Object.entries(sr.value)) c[sk] = { value: sv.value };
            return { value: c };
          }) };
        } else {
          out[k] = { value: v.value };
        }
      }
      return out;
    });
    let ok = 0;
    for (let i = 0; i < clean.length; i += 100) {
      const batch = clean.slice(i, i + 100);
      setStatus2(`コピー中... ${i + 1}～${i + batch.length} / ${clean.length}件`);
      await apiPost(tgtPrefix, "/records.json", { app: targetAppId, records: batch });
      ok += batch.length;
    }
    setStatus2(`レコードコピー完了: ${ok}件`);
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

  // src/entries/record-lite-ui.js
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
  function mkSection(title) {
    const sec = document.createElement("details");
    sec.style.cssText = "border:1px solid #e2e8f0;border-radius:8px;padding:10px;margin-bottom:10px;background:#fafafa";
    const sum = document.createElement("summary");
    sum.style.cssText = "font-size:12px;font-weight:700;cursor:pointer;color:#1e293b";
    sum.textContent = title;
    sec.appendChild(sum);
    const body = document.createElement("div");
    body.style.cssText = "margin-top:10px";
    sec.appendChild(body);
    return { sec, body };
  }
  function mountRecordLitePanel() {
    const { bodySlot } = mountKusLitePanel({
      id: "kus-record-lite",
      title: "レコード管理",
      note: "CSVエクスポート/インポート、バッチ処理、レコードコピーを実行します。統合ツール.js は不要です。"
    });
    const mkInput = (ph, val, wide) => {
      const inp = document.createElement("input");
      inp.type = "text";
      inp.placeholder = ph;
      if (val) inp.value = val;
      inp.style.cssText = `width:min(${wide ? "260px" : "120px"},${wide ? "80vw" : "40vw"});padding:6px 10px;border:1px solid #e2e8f0;border-radius:8px;font-size:12px`;
      return inp;
    };
    const tgtApp = mkInput("アプリID", DEFAULT_APP_ID || "");
    const tgtGuest = mkInput("ゲストID（任意）");
    bodySlot.appendChild(row("アプリID", tgtApp));
    bodySlot.appendChild(row("ゲスト", tgtGuest));
    function mkBtn(text, bg) {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = text;
      b.style.cssText = `padding:8px 14px;font-size:12px;font-weight:700;border:none;border-radius:10px;background:${bg};color:#fff;cursor:pointer;margin-top:6px`;
      return b;
    }
    {
      const { sec, body } = mkSection("CSV エクスポート");
      const query = mkInput("絞り込み条件 (任意)", "", true);
      const fname = mkInput("ファイル名", "records.csv");
      body.appendChild(row("条件", query));
      body.appendChild(row("ファイル名", fname));
      const btn = mkBtn("CSV出力", "linear-gradient(180deg,#3b82f6,#2563eb)");
      btn.addEventListener("click", async () => {
        try {
          await runCsvExportStandalone(
            { appId: tgtApp.value.trim(), guestId: tgtGuest.value.trim(), query: query.value.trim(), filename: fname.value.trim() },
            (m, e) => setStatus(m, e)
          );
        } catch (e) {
          setStatus(e.message || String(e), true);
        }
      });
      body.appendChild(btn);
      bodySlot.appendChild(sec);
    }
    {
      const { sec, body } = mkSection("CSV インポート");
      const fileInput = document.createElement("input");
      fileInput.type = "file";
      fileInput.accept = ".csv";
      fileInput.style.cssText = "font-size:12px";
      body.appendChild(row("CSVファイル", fileInput));
      const btn = mkBtn("インポート実行", "linear-gradient(180deg,#16a34a,#15803d)");
      btn.addEventListener("click", async () => {
        try {
          await runCsvImportStandalone(
            { appId: tgtApp.value.trim(), guestId: tgtGuest.value.trim(), file: fileInput.files?.[0] },
            (m, e) => setStatus(m, e)
          );
        } catch (e) {
          setStatus(e.message || String(e), true);
        }
      });
      body.appendChild(btn);
      bodySlot.appendChild(sec);
    }
    {
      const { sec, body } = mkSection("ステータス一括更新");
      const query = mkInput("絞り込み条件 (任意)", "", true);
      const action = mkInput("アクション名");
      const assignee = mkInput("作業者 (任意)");
      body.appendChild(row("条件", query));
      body.appendChild(row("アクション", action));
      body.appendChild(row("作業者", assignee));
      const btn = mkBtn("一括更新", "linear-gradient(180deg,#f97316,#ea580c)");
      btn.addEventListener("click", async () => {
        try {
          await runBatchProcessStandalone(
            { appId: tgtApp.value.trim(), guestId: tgtGuest.value.trim(), query: query.value.trim(), action: action.value.trim(), assignee: assignee.value.trim() || null },
            (m, e) => setStatus(m, e)
          );
        } catch (e) {
          setStatus(e.message || String(e), true);
        }
      });
      body.appendChild(btn);
      bodySlot.appendChild(sec);
    }
    {
      const { sec, body } = mkSection("レコードコピー");
      const srcApp = mkInput("比較元アプリID");
      const srcGuest = mkInput("ゲストID（任意）");
      const query = mkInput("絞り込み条件 (任意)", "", true);
      body.appendChild(row("比較元ID", srcApp));
      body.appendChild(row("元ゲスト", srcGuest));
      body.appendChild(row("条件", query));
      const btn = mkBtn("コピー実行", "linear-gradient(180deg,#7c3aed,#6d28d9)");
      btn.addEventListener("click", async () => {
        try {
          await runRecordCopyStandalone(
            { sourceAppId: srcApp.value.trim(), sourceGuestId: srcGuest.value.trim(), targetAppId: tgtApp.value.trim(), targetGuestId: tgtGuest.value.trim(), query: query.value.trim() },
            (m, e) => setStatus(m, e)
          );
        } catch (e) {
          setStatus(e.message || String(e), true);
        }
      });
      body.appendChild(btn);
      bodySlot.appendChild(sec);
    }
  }

  // src/entries/record-lite-entry.js
  if (!window.kintone?.api || !window.kintone?.app) {
    alert("kintone画面で実行してください");
  } else {
    mountRecordLitePanel();
  }
})();
