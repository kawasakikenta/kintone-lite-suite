// ==========================================================================
// 設計書作成.js  —  自動生成ファイル（手編集禁止）
// ==========================================================================
// このファイルは tools/統合ツール/ の npm run build (esbuild) で生成されます。
// ソース: tools/統合ツール/src/entries/design-lite-entry.js
//         tools/統合ツール/src/tabs/design.js  ← 機能の正規実装
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
  var TOOL_ID, EXTERNAL_LIBRARIES, DEFAULT_APP_ID, DIALOG_STATE_KEY, DIFF_SNAPSHOT_STATE_KEY, DIFF_SELECTION_SETS_KEY, DIFF_ONBOARDING_DISMISSED_KEY, SECTION_DEFS, SETTINGS_EXPORT_SCOPE_DEFS, META_KEYS, DEFAULT_SUBTAB_STATE, GUIDED_TOUR_STEPS;
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
      META_KEYS = /* @__PURE__ */ new Set(["revision", "creator", "createdAt", "modifier", "modifiedAt"]);
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
    return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}`;
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
  var init_api = __esm({
    "src/api.js"() {
      "use strict";
      init_constants();
      init_utils();
      init_state();
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
  function getToolDocument() {
    return root?.ownerDocument || document;
  }
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

  // src/entries/design-lite-ui.js
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

  // src/tabs/design-standalone.js
  init_constants();
  init_state();
  init_utils();
  init_api();
  init_export();

  // src/tabs/design-xlsx.js
  init_constants();
  init_dialog();
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

  // src/tabs/design-standalone.js
  async function runDesignExportStandalone(kind, source, setStatus2) {
    const appId = String(source.appId || "").trim();
    if (!appId) throw new Error("アプリIDを入力してください");
    const guestId = String(source.guestId || "").trim();
    const preview = !!source.preview;
    const scopes = SECTION_DEFS.map((s) => s.key);
    setStatus2("設計情報を取得中...");
    const bundle = await fetchBundle({
      appId,
      guestId,
      preview,
      sections: scopes,
      onProgress: (p, l) => setStatus2(`取得中 ${Math.round(p * 100)}% (${l})`)
    });
    state.lastSourceBundle = bundle;
    if (kind === "json") {
      downloadText(`design_${bundle.appId}_${nowStamp()}.json`, JSON.stringify(bundle, null, 2), "application/json");
    } else {
      downloadText(`design_${bundle.appId}_${nowStamp()}.md`, bundleToMarkdown(bundle), "text/markdown");
    }
    setStatus2(`設計書出力完了（App ${bundle.appId}）`);
  }
  async function runDesignCopyMdStandalone(source, setStatus2) {
    const appId = String(source.appId || "").trim();
    if (!appId) throw new Error("アプリIDを入力してください");
    const guestId = String(source.guestId || "").trim();
    const preview = !!source.preview;
    const scopes = SECTION_DEFS.map((s) => s.key);
    setStatus2("設計情報を取得中...");
    const bundle = await fetchBundle({
      appId,
      guestId,
      preview,
      sections: scopes,
      onProgress: (p, l) => setStatus2(`取得中 ${Math.round(p * 100)}% (${l})`)
    });
    state.lastSourceBundle = bundle;
    const md = bundleToMarkdown(bundle);
    try {
      await navigator.clipboard.writeText(md);
      setStatus2("設計書Markdownをクリップボードにコピーしました");
    } catch (e) {
      throw new Error(`クリップボードへのコピーに失敗しました: ${e.message}`);
    }
  }
  async function runDesignExportXlsxStandalone(source, setStatus2) {
    const appId = String(source.appId || "").trim();
    if (!appId) throw new Error("アプリIDを入力してください");
    const guestId = String(source.guestId || "").trim();
    setStatus2("設計書Excel出力を開始...");
    const done = await runAdvancedDesignExporter({ appId, guestId });
    if (done === false) {
      setStatus2("設計書Excel出力をキャンセルしました");
      return;
    }
    setStatus2("設計書Excel出力完了");
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

  // src/entries/design-lite-ui.js
  function row(labelHtml, child) {
    const wrap = document.createElement("div");
    wrap.style.cssText = "display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-bottom:10px";
    const lab = document.createElement("span");
    lab.style.cssText = "font-size:12px;font-weight:600;color:#334155;min-width:5em";
    lab.innerHTML = labelHtml;
    wrap.appendChild(lab);
    wrap.appendChild(child);
    return wrap;
  }
  function mountDesignLitePanel() {
    const { bodySlot } = mountKusLitePanel({
      id: "kus-design-lite",
      title: "設計書",
      note: "アプリ設定を取得し、Markdown または JSON で保存します。統合ツール.js は不要です。"
    });
    const appInp = document.createElement("input");
    appInp.type = "text";
    appInp.placeholder = "アプリID";
    appInp.value = DEFAULT_APP_ID || "";
    appInp.style.cssText = "width:min(120px,40vw);padding:6px 10px;border:1px solid #e2e8f0;border-radius:8px;font-size:12px";
    const guestInp = document.createElement("input");
    guestInp.type = "text";
    guestInp.placeholder = "ゲストID（任意）";
    guestInp.style.cssText = "width:min(120px,40vw);padding:6px 10px;border:1px solid #e2e8f0;border-radius:8px;font-size:12px";
    const prev = document.createElement("label");
    prev.style.cssText = "font-size:12px;color:#475569;display:inline-flex;align-items:center;gap:6px;cursor:pointer";
    const prevCb = document.createElement("input");
    prevCb.type = "checkbox";
    prev.appendChild(prevCb);
    prev.appendChild(document.createTextNode("プレビュー環境"));
    bodySlot.appendChild(row("アプリID", appInp));
    bodySlot.appendChild(row("ゲスト", guestInp));
    bodySlot.appendChild(row("", prev));
    const btnRow = document.createElement("div");
    btnRow.style.cssText = "display:flex;flex-direction:column;gap:8px;margin-top:12px";
    function source() {
      return {
        appId: appInp.value.trim(),
        guestId: guestInp.value.trim(),
        preview: prevCb.checked
      };
    }
    function mkBtn(text) {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = text;
      b.style.cssText = "padding:10px 14px;font-size:13px;font-weight:700;border:none;border-radius:10px;background:linear-gradient(180deg,#3b82f6,#2563eb);color:#fff;cursor:pointer";
      return b;
    }
    const bMd = mkBtn("Markdown を保存");
    bMd.addEventListener("click", async () => {
      try {
        await runDesignExportStandalone("md", source(), (m, e) => setStatus(m, e));
      } catch (e) {
        setStatus(e.message || String(e), true);
      }
    });
    const bJson = mkBtn("JSON を保存");
    bJson.style.background = "linear-gradient(180deg,#64748b,#475569)";
    bJson.addEventListener("click", async () => {
      try {
        await runDesignExportStandalone("json", source(), (m, e) => setStatus(m, e));
      } catch (e) {
        setStatus(e.message || String(e), true);
      }
    });
    const bCopy = mkBtn("Markdown をクリップボードへ");
    bCopy.style.background = "linear-gradient(180deg,#0ea5e9,#0284c7)";
    bCopy.addEventListener("click", async () => {
      try {
        await runDesignCopyMdStandalone(source(), (m, e) => setStatus(m, e));
      } catch (e) {
        setStatus(e.message || String(e), true);
      }
    });
    const bXlsx = mkBtn("Excel (.xlsx) を保存");
    bXlsx.style.background = "linear-gradient(180deg,#16a34a,#15803d)";
    bXlsx.addEventListener("click", async () => {
      try {
        await runDesignExportXlsxStandalone(source(), (m, e) => setStatus(m, e));
      } catch (e) {
        setStatus(e.message || String(e), true);
      }
    });
    btnRow.appendChild(bMd);
    btnRow.appendChild(bJson);
    btnRow.appendChild(bCopy);
    btnRow.appendChild(bXlsx);
    bodySlot.appendChild(btnRow);
  }

  // src/entries/design-lite-entry.js
  if (!window.kintone?.api || !window.kintone?.app) {
    alert("kintone画面で実行してください");
  } else {
    mountDesignLitePanel();
  }
})();
