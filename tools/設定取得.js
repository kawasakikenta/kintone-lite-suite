(function () {
  // ==========================
  // 設定定義
  // ==========================
  const CATEGORY_ORDER = [
    "基本設定",
    "権限設定",
    "プロセス管理",
    "カスタマイズ",
    "アクション・通知",
    "グラフ・レポート",
  ];

  const ENDPOINT_DEFINITIONS = [
    // 基本設定（デフォルトON）
    { name: "appSettings", label: "アプリ基本情報", endpoint: "/k/v1/app.json", keyType: "id", category: "基本設定", defaultChecked: true },
    { name: "fieldSettings", label: "フィールド設定", endpoint: "/k/v1/app/form/fields.json", keyType: "app", category: "基本設定", defaultChecked: true },
    { name: "layoutSettings", label: "フォームレイアウト", endpoint: "/k/v1/app/form/layout.json", keyType: "app", category: "基本設定", defaultChecked: true },
    { name: "viewSettings", label: "一覧設定", endpoint: "/k/v1/app/views.json", keyType: "app", category: "基本設定", defaultChecked: true },
    { name: "generalSettings", label: "一般設定", endpoint: "/k/v1/app/settings.json", keyType: "app", category: "基本設定", defaultChecked: true },

    // 権限設定（デフォルトOFF）
    { name: "appPermissions", label: "アプリ権限", endpoint: "/k/v1/app/acl.json", keyType: "app", category: "権限設定", defaultChecked: false },
    { name: "recordPermissions", label: "レコード権限", endpoint: "/k/v1/record/acl.json", keyType: "app", category: "権限設定", defaultChecked: false },
    { name: "fieldPermissions", label: "フィールド権限", endpoint: "/k/v1/field/acl.json", keyType: "app", category: "権限設定", defaultChecked: false },

    // プロセス管理（デフォルトOFF）
    { name: "processSettings", label: "プロセス管理", endpoint: "/k/v1/app/status.json", keyType: "app", category: "プロセス管理", defaultChecked: false },

    // カスタマイズ（デフォルトOFF）
    { name: "customizeSettings", label: "JavaScript/CSS", endpoint: "/k/v1/app/customize.json", keyType: "app", category: "カスタマイズ", defaultChecked: false },
    { name: "pluginSettings", label: "プラグイン", endpoint: "/k/v1/app/plugins.json", keyType: "app", category: "カスタマイズ", defaultChecked: false },

    // アクション・通知（デフォルトOFF）
    { name: "actionSettings", label: "アクション", endpoint: "/k/v1/app/actions.json", keyType: "app", category: "アクション・通知", defaultChecked: false },
    { name: "notifications", label: "通知設定", endpoint: "/k/v1/app/notifications/general.json", keyType: "app", category: "アクション・通知", defaultChecked: false },
    { name: "perRecordNotifications", label: "レコード条件通知", endpoint: "/k/v1/app/notifications/perRecord.json", keyType: "app", category: "アクション・通知", defaultChecked: false },
    { name: "reminderNotifications", label: "リマインダー通知", endpoint: "/k/v1/app/notifications/reminder.json", keyType: "app", category: "アクション・通知", defaultChecked: false },

    // グラフ（デフォルトOFF）
    { name: "reportSettings", label: "グラフ設定", endpoint: "/k/v1/app/reports.json", keyType: "app", category: "グラフ・レポート", defaultChecked: false },
  ];

  let __abortFlag = false;
  let __downloadBlobUrl = null;
  let __downloadFilename = null;

  // 複数アプリ管理用
  let __targetApps = []; // { appId, appName, guestSpaceId }

  // ==========================
  // ユーティリティ
  // ==========================
  function normalizeAppId(v) {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? String(n) : "";
  }

  function toPreviewEndpoint(endpoint) {
    if (endpoint.includes("/k/v1/preview/")) return endpoint;
    return endpoint.replace("/k/v1/", "/k/v1/preview/");
  }

  function toGuestEndpoint(endpoint, guestSpaceId) {
    if (!guestSpaceId) return endpoint;
    const id = String(guestSpaceId).trim();
    if (!id) return endpoint;

    if (endpoint.startsWith("/k/v1/preview/")) {
      return endpoint.replace("/k/v1/preview/", `/k/guest/${id}/v1/preview/`);
    }
    if (endpoint.startsWith("/k/v1/")) {
      return endpoint.replace("/k/v1/", `/k/guest/${id}/v1/`);
    }
    return endpoint;
  }

  function buildUrl(endpoint, guestSpaceId) {
    const path = toGuestEndpoint(endpoint, guestSpaceId);
    return location.origin + path;
  }

  function extractErrorDetails(err) {
    const message = (err && (err.message || err.toString())) || "Unknown error";
    const code = err && err.code ? String(err.code) : "";
    const id = err && err.id ? String(err.id) : "";
    const errors = err && err.errors ? err.errors : null;

    let detail = message;
    const extra = [];
    if (code) extra.push(`code=${code}`);
    if (id) extra.push(`id=${id}`);
    if (extra.length) detail += ` (${extra.join(", ")})`;

    if (errors && typeof errors === "object") {
      try {
        const compact = JSON.stringify(errors);
        if (compact && compact !== "{}") detail += ` / errors=${compact.slice(0, 500)}${compact.length > 500 ? "..." : ""}`;
      } catch (_) {}
    }
    return detail;
  }

  function looksLikeInvalidParamError(detail) {
    const s = String(detail || "");
    return /invalid|不正|パラメータ|parameter/i.test(s);
  }

  function safeRevokeObjectUrl(url) {
    setTimeout(() => {
      try { URL.revokeObjectURL(url); } catch (_) {}
    }, 5000);
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  // ==========================
  // アプリ検索 API
  // ==========================
  async function searchApps(keyword, guestSpaceId) {
    // /k/v1/apps.json は name パラメータで部分一致検索可能
    const endpoint = "/k/v1/apps.json";
    const url = buildUrl(endpoint, guestSpaceId);
    const params = {};
    if (keyword) params.name = keyword;
    params.limit = 100;

    try {
      const resp = await kintone.api(url, "GET", params);
      return { success: true, apps: resp.apps || [] };
    } catch (err) {
      return { success: false, error: extractErrorDetails(err), apps: [] };
    }
  }

  // ==========================
  // UI生成
  // ==========================
  function createModal() {
    const existing = document.getElementById("kintone-export-modal");
    if (existing) existing.remove();

    const modal = document.createElement("div");
    modal.id = "kintone-export-modal";
    modal.innerHTML = `
      <style>
        #kintone-export-modal {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.5);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 10000;
          font-family: 'メイリオ', Meiryo, sans-serif;
        }
        .export-modal-content {
          background: white;
          border-radius: 10px;
          width: 620px;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 6px 24px rgba(0,0,0,0.3);
        }
        .export-modal-header {
          background: #3498db;
          color: white;
          padding: 14px 18px;
          font-size: 16px;
          font-weight: bold;
          border-radius: 10px 10px 0 0;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .export-modal-close {
          background: none;
          border: none;
          color: white;
          font-size: 24px;
          cursor: pointer;
          line-height: 1;
        }
        .export-modal-body { padding: 18px; }
        .export-input-group { margin-bottom: 16px; }
        .export-input-group label {
          display: block;
          margin-bottom: 8px;
          font-weight: bold;
          color: #333;
        }
        .export-input-row {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 10px;
        }
        .export-input-row input, .export-input-row select {
          padding: 10px;
          border: 1px solid #ddd;
          border-radius: 6px;
          font-size: 14px;
          min-width: 0;
        }
        .export-row-3 {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 10px;
        }
        .export-btn-current {
          padding: 10px 14px;
          background: #27ae60;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          white-space: nowrap;
        }
        .export-btn-current:hover { background: #219a52; }

        /* --- アプリ検索エリア --- */
        .export-search-area { margin-bottom: 16px; }
        .export-search-row {
          display: grid;
          grid-template-columns: 1fr auto auto;
          gap: 8px;
          margin-bottom: 8px;
        }
        .export-search-row input {
          padding: 10px;
          border: 1px solid #ddd;
          border-radius: 6px;
          font-size: 14px;
          min-width: 0;
        }
        .export-btn-search {
          padding: 10px 14px;
          background: #8e44ad;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          white-space: nowrap;
          font-size: 13px;
        }
        .export-btn-search:hover { background: #7d3c98; }
        .export-btn-search:disabled { background:#bdc3c7; cursor:not-allowed; }
        .export-btn-add-id {
          padding: 10px 14px;
          background: #2980b9;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          white-space: nowrap;
          font-size: 13px;
        }
        .export-btn-add-id:hover { background: #2471a3; }
        .export-search-results {
          max-height: 200px;
          overflow-y: auto;
          border: 1px solid #eee;
          border-radius: 6px;
          display: none;
        }
        .export-search-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 12px;
          border-bottom: 1px solid #f0f0f0;
          font-size: 13px;
          cursor: pointer;
          transition: background 0.15s;
        }
        .export-search-item:last-child { border-bottom: none; }
        .export-search-item:hover { background: #ebf5fb; }
        .export-search-item-id { color: #888; font-size: 12px; min-width: 60px; text-align: right; }
        .export-search-item-name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .export-search-item-add {
          padding: 3px 10px;
          background: #3498db;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
          margin-left: 8px;
          white-space: nowrap;
        }
        .export-search-item-add:hover { background: #2980b9; }
        .export-search-status { font-size: 12px; color: #888; padding: 4px 0; }

        /* --- 選択済みアプリリスト --- */
        .export-app-list-area { margin-bottom: 16px; }
        .export-app-list {
          border: 1px solid #eee;
          border-radius: 6px;
          max-height: 180px;
          overflow-y: auto;
        }
        .export-app-list-empty {
          padding: 16px;
          text-align: center;
          color: #aaa;
          font-size: 13px;
        }
        .export-app-list-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 12px;
          border-bottom: 1px solid #f0f0f0;
          font-size: 13px;
        }
        .export-app-list-item:last-child { border-bottom: none; }
        .export-app-list-info { flex: 1; }
        .export-app-list-id { color: #3498db; font-weight: bold; margin-right: 8px; }
        .export-app-list-name { color: #333; }
        .export-app-list-guest { color: #8e44ad; font-size: 11px; margin-left: 6px; }
        .export-app-list-remove {
          padding: 3px 10px;
          background: #e74c3c;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
          margin-left: 8px;
        }
        .export-app-list-remove:hover { background: #c0392b; }
        .export-app-list-actions {
          display: flex;
          justify-content: flex-end;
          gap: 8px;
          margin-top: 8px;
        }
        .export-app-list-actions button {
          padding: 5px 10px;
          border: 1px solid #e74c3c;
          background: white;
          color: #e74c3c;
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
        }
        .export-app-list-actions button:hover { background: #e74c3c; color: white; }

        .export-category { margin-bottom: 14px; }
        .export-category-title {
          font-weight: bold;
          color: #555;
          margin-bottom: 8px;
          padding-bottom: 4px;
          border-bottom: 1px solid #eee;
        }
        .export-checkbox-group {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }
        .export-checkbox-item { display:flex; align-items:center; gap:6px; font-size: 13px; }
        .export-checkbox-item input { margin:0; }

        .export-select-btns { margin-bottom: 12px; display:flex; gap:10px; flex-wrap: wrap; }
        .export-select-btns button {
          padding: 6px 10px;
          border: 1px solid #3498db;
          background: white;
          color: #3498db;
          border-radius: 6px;
          cursor: pointer;
          font-size: 13px;
        }
        .export-select-btns button:hover { background:#3498db; color:white; }

        .export-modal-footer {
          padding: 14px 18px;
          background: #f8f8f8;
          border-radius: 0 0 10px 10px;
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          position: sticky;
          bottom: 0;
        }
        .export-btn-primary {
          padding: 10px 16px;
          background: #3498db;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          font-weight: bold;
        }
        .export-btn-primary:hover { background: #2980b9; }
        .export-btn-primary:disabled { background:#bdc3c7; cursor:not-allowed; }
        .export-btn-secondary {
          padding: 10px 16px;
          background: white;
          color: #666;
          border: 1px solid #ddd;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
        }
        .export-progress { display:none; margin-top: 14px; }
        .export-progress-bar {
          height: 18px;
          background: #ecf0f1;
          border-radius: 999px;
          overflow: hidden;
          margin-bottom: 8px;
        }
        .export-progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #3498db, #2ecc71);
          width: 0%;
          transition: width 0.25s;
        }
        .export-progress-text { text-align: center; color:#666; font-size: 13px; }

        .export-result {
          display:none;
          margin-top: 14px;
          padding: 14px;
          background: #f8f8f8;
          border-radius: 8px;
          font-size: 13px;
        }
        .export-result-success { color:#27ae60; font-weight:bold; }
        .export-result-error { color:#e74c3c; font-weight:bold; }
        .export-result-warn { color:#f39c12; font-weight:bold; }
        .export-result-item { display:flex; justify-content:space-between; gap:10px; padding: 3px 0; }
        .export-muted { color:#888; }
        .export-download-area {
          display:none;
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px dashed #ddd;
        }
        .export-download-btn {
          width: 100%;
          padding: 10px 14px;
          border-radius: 8px;
          border: none;
          cursor: pointer;
          background: #2ecc71;
          color: white;
          font-weight: bold;
          font-size: 14px;
          margin-bottom: 6px;
        }
        .export-download-btn:hover { background:#27ae60; }
        .export-download-individual {
          display: flex;
          flex-direction: column;
          gap: 4px;
          margin-top: 8px;
        }
        .export-download-individual-btn {
          padding: 7px 12px;
          border-radius: 6px;
          border: 1px solid #2ecc71;
          cursor: pointer;
          background: white;
          color: #27ae60;
          font-size: 13px;
          text-align: left;
        }
        .export-download-individual-btn:hover { background: #2ecc71; color: white; }
        .export-small { font-size: 12px; }

        /* タブ切り替え */
        .export-tabs {
          display: flex;
          border-bottom: 2px solid #3498db;
          margin-bottom: 14px;
        }
        .export-tab {
          padding: 8px 16px;
          cursor: pointer;
          font-size: 13px;
          font-weight: bold;
          color: #888;
          border: none;
          background: none;
          border-bottom: 3px solid transparent;
          margin-bottom: -2px;
          transition: all 0.2s;
        }
        .export-tab:hover { color: #3498db; }
        .export-tab.active {
          color: #3498db;
          border-bottom-color: #3498db;
        }
        .export-tab-content { display: none; }
        .export-tab-content.active { display: block; }
      </style>

      <div class="export-modal-content" role="dialog" aria-modal="true">
        <div class="export-modal-header">
          <span>📦 Kintone アプリ設定エクスポート v4</span>
          <button class="export-modal-close" aria-label="閉じる">&times;</button>
        </div>

        <div class="export-modal-body">

          <!-- ===== アプリ追加方法タブ ===== -->
          <div class="export-input-group">
            <label>エクスポート対象アプリ</label>
            <div class="export-tabs">
              <button class="export-tab active" data-tab="tab-search">🔍 アプリ名で検索</button>
              <button class="export-tab" data-tab="tab-manual">✏️ IDで直接指定</button>
            </div>

            <!-- 検索タブ -->
            <div class="export-tab-content active" id="tab-search">
              <div class="export-search-row">
                <input type="text" id="export-search-keyword" placeholder="アプリ名で検索（部分一致）">
                <input type="number" id="export-search-guest-id" placeholder="ゲストID(任意)" min="1" style="width:120px;">
                <button class="export-btn-search" id="export-search-btn">検索</button>
              </div>
              <div class="export-search-status" id="export-search-status"></div>
              <div class="export-search-results" id="export-search-results"></div>
            </div>

            <!-- ID直接指定タブ -->
            <div class="export-tab-content" id="tab-manual">
              <div class="export-search-row">
                <input type="text" id="export-manual-ids" placeholder="アプリID（カンマ区切りで複数可: 1, 5, 12）">
                <input type="number" id="export-manual-guest-id" placeholder="ゲストID(任意)" min="1" style="width:120px;">
                <button class="export-btn-add-id" id="export-add-manual">追加</button>
              </div>
              <div style="display:flex; gap:8px; margin-top:4px;">
                <button class="export-btn-current" id="export-use-current" style="font-size:13px; padding:6px 12px;">現在のアプリを追加</button>
              </div>
            </div>
          </div>

          <!-- ===== 選択済みアプリ一覧 ===== -->
          <div class="export-app-list-area">
            <label style="font-weight:bold; color:#333; margin-bottom:8px; display:block;">
              選択済みアプリ <span id="export-app-count" style="color:#3498db;">(0件)</span>
            </label>
            <div class="export-app-list" id="export-app-list">
              <div class="export-app-list-empty">アプリが選択されていません。上の検索またはID指定で追加してください。</div>
            </div>
            <div class="export-app-list-actions" id="export-app-list-actions" style="display:none;">
              <button id="export-clear-apps">すべてクリア</button>
            </div>
          </div>

          <!-- ===== 実行オプション ===== -->
          <div class="export-input-group">
            <label>実行オプション</label>
            <div class="export-row-3">
              <select id="export-mode">
                <option value="live">運用（反映後）</option>
                <option value="preview">プレビュー（反映前）</option>
              </select>
              <select id="export-lang">
                <option value="">lang指定なし</option>
                <option value="ja">ja</option>
                <option value="en">en</option>
                <option value="zh">zh</option>
              </select>
              <select id="export-multi-mode">
                <option value="separate">個別JSON（複数ファイル）</option>
                <option value="single">1つのJSONにまとめる</option>
              </select>
            </div>
            <div class="export-small export-muted" style="margin-top:6px;">
              ※プレビュー未対応APIは自動で運用APIにフォールバックします。複数アプリの個別JSONはZIPでまとめてダウンロードできます。
            </div>
          </div>

          <!-- ===== エクスポート項目 ===== -->
          <div class="export-input-group">
            <label>エクスポート項目</label>
            <div class="export-select-btns">
              <button id="export-select-basic">基本のみ</button>
              <button id="export-select-all">すべて選択</button>
              <button id="export-select-none">すべて解除</button>
            </div>
            <div id="export-checkboxes"></div>
          </div>

          <div class="export-progress" id="export-progress">
            <div class="export-progress-bar">
              <div class="export-progress-fill" id="export-progress-fill"></div>
            </div>
            <div class="export-progress-text" id="export-progress-text">準備中...</div>
          </div>

          <div class="export-result" id="export-result"></div>

          <div class="export-download-area" id="export-download-area">
            <div id="export-download-buttons"></div>
          </div>
        </div>

        <div class="export-modal-footer">
          <button class="export-btn-secondary" id="export-cancel">閉じる</button>
          <button class="export-btn-secondary" id="export-abort" style="display:none;">中止</button>
          <button class="export-btn-primary" id="export-start">エクスポート開始</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    return modal;
  }

  function renderCheckboxes() {
    const container = document.getElementById("export-checkboxes");

    const categories = {};
    ENDPOINT_DEFINITIONS.forEach((def) => {
      categories[def.category] = categories[def.category] || [];
      categories[def.category].push(def);
    });

    const orderedCategories = CATEGORY_ORDER.filter((c) => categories[c] && categories[c].length)
      .concat(Object.keys(categories).filter((c) => !CATEGORY_ORDER.includes(c)));

    let html = "";
    for (const category of orderedCategories) {
      const items = categories[category] || [];
      html += `<div class="export-category">
        <div class="export-category-title">${category}</div>
        <div class="export-checkbox-group">`;
      for (const item of items) {
        html += `<label class="export-checkbox-item">
          <input type="checkbox" value="${item.name}" ${item.defaultChecked ? "checked" : ""}>
          ${item.label}
        </label>`;
      }
      html += `</div></div>`;
    }
    container.innerHTML = html;
  }

  function getSelectedItems() {
    const checked = document.querySelectorAll('#export-checkboxes input[type="checkbox"]:checked');
    const names = new Set(Array.from(checked).map((cb) => cb.value));
    return ENDPOINT_DEFINITIONS.filter((def) => names.has(def.name));
  }

  function selectBasicOnly() {
    document.querySelectorAll("#export-checkboxes input").forEach((cb) => {
      const def = ENDPOINT_DEFINITIONS.find((d) => d.name === cb.value);
      cb.checked = !!(def && def.category === "基本設定");
    });
  }

  // ==========================
  // アプリリスト管理
  // ==========================
  function addApp(appId, appName, guestSpaceId) {
    const id = normalizeAppId(appId);
    if (!id) return false;

    // 重複チェック
    if (__targetApps.some((a) => a.appId === id && a.guestSpaceId === (guestSpaceId || ""))) {
      return false;
    }

    __targetApps.push({
      appId: id,
      appName: appName || `App ${id}`,
      guestSpaceId: guestSpaceId || "",
    });

    renderAppList();
    return true;
  }

  function removeApp(index) {
    __targetApps.splice(index, 1);
    renderAppList();
  }

  function clearApps() {
    __targetApps = [];
    renderAppList();
  }

  function renderAppList() {
    const list = document.getElementById("export-app-list");
    const actions = document.getElementById("export-app-list-actions");
    const count = document.getElementById("export-app-count");

    count.textContent = `(${__targetApps.length}件)`;

    if (__targetApps.length === 0) {
      list.innerHTML = `<div class="export-app-list-empty">アプリが選択されていません。上の検索またはID指定で追加してください。</div>`;
      actions.style.display = "none";
      return;
    }

    actions.style.display = "flex";
    let html = "";
    __targetApps.forEach((app, idx) => {
      html += `<div class="export-app-list-item">
        <div class="export-app-list-info">
          <span class="export-app-list-id">#${escapeHtml(app.appId)}</span>
          <span class="export-app-list-name">${escapeHtml(app.appName)}</span>
          ${app.guestSpaceId ? `<span class="export-app-list-guest">(ゲスト:${escapeHtml(app.guestSpaceId)})</span>` : ""}
        </div>
        <button class="export-app-list-remove" data-index="${idx}">削除</button>
      </div>`;
    });
    list.innerHTML = html;

    // 削除ボタンイベント
    list.querySelectorAll(".export-app-list-remove").forEach((btn) => {
      btn.addEventListener("click", () => removeApp(Number(btn.dataset.index)));
    });
  }

  // ==========================
  // API取得（プレビュー/ゲスト/lang フォールバック込み）
  // ==========================
  async function callKintoneApi(fullUrl, params) {
    return await kintone.api(fullUrl, "GET", params);
  }

  async function fetchDataWithFallback({ endpoint, params, guestSpaceId, mode, lang }) {
    const warnings = [];
    const tried = [];

    const wantPreview = mode === "preview";
    const endpointsToTry = [];

    if (wantPreview) endpointsToTry.push(toPreviewEndpoint(endpoint));
    endpointsToTry.push(endpoint);

    const uniqueEndpoints = Array.from(new Set(endpointsToTry));
    const langCandidates = lang ? [{ lang }, null] : [null];

    for (const ep of uniqueEndpoints) {
      for (const langOpt of langCandidates) {
        const finalParams = Object.assign({}, params);
        if (langOpt && langOpt.lang) finalParams.lang = langOpt.lang;

        const finalUrl = buildUrl(ep, guestSpaceId);
        tried.push({ ep, url: finalUrl, withLang: !!(langOpt && langOpt.lang) });

        try {
          const data = await callKintoneApi(finalUrl, finalParams);

          if (wantPreview && ep === endpoint) {
            warnings.push("プレビュー未対応のため運用APIにフォールバックしました");
          }
          if (lang && !(langOpt && langOpt.lang)) {
            warnings.push("lang指定で失敗したため、lang無しで再試行して取得しました");
          }

          return { success: true, data, usedEndpoint: ep, usedUrl: finalUrl, warnings, tried };
        } catch (err) {
          const detail = extractErrorDetails(err);
          if (lang && (langOpt && langOpt.lang) && looksLikeInvalidParamError(detail)) {
            warnings.push("lang指定が原因の可能性があるため、lang無しで再試行します");
            continue;
          }
        }
      }
    }

    return {
      success: false,
      error: "取得に失敗しました（全パターン失敗）",
      tried,
    };
  }

  async function getSettingsForApp(appId, guestSpaceId, selectedItems, options, onProgress) {
    const settings = {};
    const results = { success: [], failed: [], warnings: [] };

    for (let i = 0; i < selectedItems.length; i++) {
      if (__abortFlag) {
        results.warnings.push("ユーザー操作により中止しました");
        break;
      }

      const item = selectedItems[i];
      onProgress(i + 1, selectedItems.length, item.label);

      const baseParams = item.keyType === "id" ? { id: appId } : { app: appId };

      const res = await fetchDataWithFallback({
        endpoint: item.endpoint,
        params: baseParams,
        guestSpaceId: guestSpaceId,
        mode: options.mode,
        lang: options.lang,
      });

      if (res.success) {
        settings[item.name] = res.data;
        results.success.push(item.label);
        if (res.warnings && res.warnings.length) {
          results.warnings.push(`${item.label}: ${res.warnings.join(" / ")}`);
        }
      } else {
        settings[item.name] = { error: res.error, tried: res.tried };
        results.failed.push({ label: item.label, error: res.error, tried: res.tried });
      }
    }

    return { settings, results };
  }

  // ==========================
  // ZIP生成（JSZipなしの簡易実装）
  // ==========================
  // JSZipをCDNから動的にロード
  async function loadJSZip() {
    if (typeof JSZip !== "undefined") return;

    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js";
      script.onload = resolve;
      script.onerror = () => reject(new Error("JSZipの読み込みに失敗しました"));
      document.head.appendChild(script);
    });
  }

  // ==========================
  // ダウンロード
  // ==========================
  function triggerDownload(blobUrl, filename) {
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  function buildFilename(appId, guestSpaceId, mode) {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10);
    const suffix = [
      `app_${appId}`,
      guestSpaceId ? `guest_${guestSpaceId}` : null,
      mode === "preview" ? "preview" : "live",
      dateStr,
    ].filter(Boolean).join("_");
    return `${suffix}.json`;
  }

  // ==========================
  // 結果表示
  // ==========================
  function showMultiResults(allResults) {
    const container = document.getElementById("export-result");
    let html = `<div style="font-weight:bold; font-size:14px; margin-bottom:8px;">エクスポート完了</div>`;

    for (const { appLabel, results } of allResults) {
      html += `<div style="margin-top:10px; padding:8px; background:white; border-radius:6px; border:1px solid #eee;">`;
      html += `<div style="font-weight:bold; margin-bottom:4px;">${escapeHtml(appLabel)}</div>`;

      if (results.success.length) {
        html += `<div class="export-result-success">✅ 成功: ${results.success.length}件</div>`;
      }
      if (results.failed.length) {
        html += `<div class="export-result-error">❌ 失敗: ${results.failed.length}件</div>`;
        results.failed.forEach((item) => {
          html += `<div class="export-result-item">
            <span>${item.label}</span>
            <span class="export-muted" style="max-width:60%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;"
                  title="${(item.error || "").replace(/"/g, "&quot;")}">${item.error}</span>
          </div>`;
        });
      }
      if (results.warnings && results.warnings.length) {
        html += `<div class="export-result-warn">⚠️ 警告: ${results.warnings.length}件</div>`;
        results.warnings.slice(0, 10).forEach((w) => {
          html += `<div class="export-small export-muted">・${w}</div>`;
        });
      }
      html += `</div>`;
    }

    container.innerHTML = html;
    container.style.display = "block";
  }

  // ==========================
  // メイン
  // ==========================
  function main() {
    const modal = createModal();
    renderCheckboxes();

    // タブ切り替え
    modal.querySelectorAll(".export-tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        modal.querySelectorAll(".export-tab").forEach((t) => t.classList.remove("active"));
        modal.querySelectorAll(".export-tab-content").forEach((c) => c.classList.remove("active"));
        tab.classList.add("active");
        document.getElementById(tab.dataset.tab).classList.add("active");
      });
    });

    // overlayクリック / Escで閉じる
    modal.addEventListener("click", (e) => {
      if (e.target === modal) modal.remove();
    });
    const escHandler = (e) => {
      if (e.key === "Escape") modal.remove();
    };
    document.addEventListener("keydown", escHandler);
    const removeModal = () => {
      document.removeEventListener("keydown", escHandler);
      modal.remove();
    };

    // --- 現在のアプリ追加 ---
    const currentAppId = (kintone.app && typeof kintone.app.getId === "function") ? kintone.app.getId() : null;

    document.getElementById("export-use-current").addEventListener("click", () => {
      if (currentAppId) {
        const added = addApp(currentAppId, `(現在のアプリ) #${currentAppId}`, "");
        if (!added) alert("既に追加されています。");
      } else {
        alert("現在のアプリIDを取得できません。\nアプリのレコード一覧または詳細画面で実行してください。");
      }
    });

    // --- アプリ名検索 ---
    const searchBtn = document.getElementById("export-search-btn");
    const searchInput = document.getElementById("export-search-keyword");
    const searchResultsDiv = document.getElementById("export-search-results");
    const searchStatusDiv = document.getElementById("export-search-status");

    async function doSearch() {
      const keyword = searchInput.value.trim();
      const guestId = normalizeAppId(document.getElementById("export-search-guest-id").value);

      searchBtn.disabled = true;
      searchBtn.textContent = "検索中...";
      searchStatusDiv.textContent = "";
      searchResultsDiv.style.display = "none";

      const result = await searchApps(keyword, guestId);

      searchBtn.disabled = false;
      searchBtn.textContent = "検索";

      if (!result.success) {
        searchStatusDiv.textContent = `検索エラー: ${result.error}`;
        return;
      }

      if (result.apps.length === 0) {
        searchStatusDiv.textContent = "該当するアプリが見つかりませんでした。";
        return;
      }

      searchStatusDiv.textContent = `${result.apps.length}件見つかりました`;
      searchResultsDiv.style.display = "block";

      let html = "";
      result.apps.forEach((app) => {
        html += `<div class="export-search-item">
          <span class="export-search-item-id">#${escapeHtml(app.appId)}</span>
          <span class="export-search-item-name" title="${escapeHtml(app.name)}">${escapeHtml(app.name)}</span>
          <button class="export-search-item-add" data-app-id="${escapeHtml(app.appId)}"
                  data-app-name="${escapeHtml(app.name)}"
                  data-guest-id="${escapeHtml(guestId || "")}">追加</button>
        </div>`;
      });
      searchResultsDiv.innerHTML = html;

      // 追加ボタンイベント
      searchResultsDiv.querySelectorAll(".export-search-item-add").forEach((btn) => {
        btn.addEventListener("click", () => {
          const added = addApp(btn.dataset.appId, btn.dataset.appName, btn.dataset.guestId);
          if (added) {
            btn.textContent = "✓";
            btn.disabled = true;
          } else {
            btn.textContent = "追加済";
            btn.disabled = true;
          }
        });
      });
    }

    searchBtn.addEventListener("click", doSearch);
    searchInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") doSearch();
    });

    // --- ID直接指定で追加 ---
    document.getElementById("export-add-manual").addEventListener("click", () => {
      const raw = document.getElementById("export-manual-ids").value;
      const guestId = normalizeAppId(document.getElementById("export-manual-guest-id").value);

      // カンマ・スペース・改行で分割
      const ids = raw.split(/[,\s\n]+/).map((s) => normalizeAppId(s.trim())).filter(Boolean);
      if (ids.length === 0) {
        alert("有効なアプリIDを入力してください");
        return;
      }

      let addedCount = 0;
      ids.forEach((id) => {
        if (addApp(id, `App #${id}`, guestId)) addedCount++;
      });

      document.getElementById("export-manual-ids").value = "";
      if (addedCount === 0) alert("すべて追加済みです。");
    });

    // --- アプリリストクリア ---
    document.getElementById("export-clear-apps").addEventListener("click", clearApps);

    // --- チェックボックス選択 ---
    document.getElementById("export-select-all").addEventListener("click", () => {
      document.querySelectorAll("#export-checkboxes input").forEach((cb) => (cb.checked = true));
    });
    document.getElementById("export-select-none").addEventListener("click", () => {
      document.querySelectorAll("#export-checkboxes input").forEach((cb) => (cb.checked = false));
    });
    document.getElementById("export-select-basic").addEventListener("click", selectBasicOnly);

    document.querySelector(".export-modal-close").addEventListener("click", removeModal);
    document.getElementById("export-cancel").addEventListener("click", removeModal);

    // --- メインの実行 ---
    const startBtn = document.getElementById("export-start");
    const abortBtn = document.getElementById("export-abort");
    const progressDiv = document.getElementById("export-progress");
    const progressFill = document.getElementById("export-progress-fill");
    const progressText = document.getElementById("export-progress-text");
    const resultDiv = document.getElementById("export-result");
    const downloadArea = document.getElementById("export-download-area");

    abortBtn.addEventListener("click", () => {
      __abortFlag = true;
      abortBtn.disabled = true;
      abortBtn.textContent = "中止中...";
    });

    startBtn.addEventListener("click", async () => {
      __abortFlag = false;
      abortBtn.disabled = false;
      abortBtn.textContent = "中止";

      resultDiv.style.display = "none";
      downloadArea.style.display = "none";

      if (__targetApps.length === 0) {
        alert("エクスポートするアプリを追加してください。");
        return;
      }

      const selectedItems = getSelectedItems();
      if (!selectedItems.length) {
        alert("エクスポートする項目を選択してください");
        return;
      }

      const mode = document.getElementById("export-mode").value;
      const lang = document.getElementById("export-lang").value;
      const multiMode = document.getElementById("export-multi-mode").value;

      startBtn.disabled = true;
      startBtn.textContent = "処理中...";
      abortBtn.style.display = "inline-block";
      progressDiv.style.display = "block";
      progressFill.style.width = "0%";
      progressText.textContent = "開始...";

      const totalSteps = __targetApps.length * selectedItems.length;
      let globalStep = 0;

      const allData = []; // { app, filename, settings, results }
      const allResults = [];

      for (let ai = 0; ai < __targetApps.length; ai++) {
        if (__abortFlag) break;

        const app = __targetApps[ai];
        const appLabel = `#${app.appId} ${app.appName}`;

        const { settings, results } = await getSettingsForApp(
          app.appId,
          app.guestSpaceId,
          selectedItems,
          { mode, lang },
          (current, total, label) => {
            globalStep = ai * selectedItems.length + current;
            const percent = Math.round((globalStep / Math.max(totalSteps, 1)) * 100);
            progressFill.style.width = `${percent}%`;
            progressText.textContent = `[${ai + 1}/${__targetApps.length}] ${appLabel} — ${current}/${total} ${label}${__abortFlag ? "（中止要求あり）" : ""}`;
          }
        );

        const today = new Date();
        settings.exportInfo = {
          appId: app.appId,
          appName: app.appName,
          guestSpaceId: app.guestSpaceId,
          mode,
          lang: lang || "",
          exportDate: today.toISOString(),
          exportedItems: selectedItems.map((i) => i.name),
          version: "4.0.0",
        };

        const filename = buildFilename(app.appId, app.guestSpaceId, mode);
        allData.push({ app, filename, settings });
        allResults.push({ appLabel, results });
      }

      // --- 結果表示 ---
      showMultiResults(allResults);

      // --- ダウンロード ---
      const downloadBtnsDiv = document.getElementById("export-download-buttons");
      downloadBtnsDiv.innerHTML = "";
      downloadArea.style.display = "block";

      if (allData.length === 1 || multiMode === "single") {
        // 1つのJSON or まとめモード
        let data, filename;
        if (multiMode === "single" && allData.length > 1) {
          // まとめ
          const merged = {};
          allData.forEach((d) => {
            merged[`app_${d.app.appId}`] = d.settings;
          });
          data = merged;
          const dateStr = new Date().toISOString().slice(0, 10);
          filename = `kintone_export_${allData.length}apps_${dateStr}.json`;
        } else {
          data = allData[0].settings;
          filename = allData[0].filename;
        }

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);

        downloadBtnsDiv.innerHTML = `
          <button class="export-download-btn" id="export-dl-single">⬇️ JSONをダウンロード</button>
          <div class="export-small export-muted" style="margin-top:4px;">ファイル名: ${escapeHtml(filename)}</div>
        `;
        document.getElementById("export-dl-single").onclick = () => {
          triggerDownload(url, filename);
        };
      } else {
        // 複数 → ZIP + 個別ボタン
        let html = "";

        // ZIPダウンロードボタン
        html += `<button class="export-download-btn" id="export-dl-zip">⬇️ ZIPでまとめてダウンロード (${allData.length}ファイル)</button>`;
        html += `<div class="export-small export-muted" style="margin-top:4px;">個別にダウンロードすることもできます:</div>`;
        html += `<div class="export-download-individual">`;

        allData.forEach((d, idx) => {
          html += `<button class="export-download-individual-btn" data-idx="${idx}">📄 ${escapeHtml(d.filename)} (#${escapeHtml(d.app.appId)} ${escapeHtml(d.app.appName)})</button>`;
        });
        html += `</div>`;

        downloadBtnsDiv.innerHTML = html;

        // 個別ボタンイベント
        downloadBtnsDiv.querySelectorAll(".export-download-individual-btn").forEach((btn) => {
          btn.addEventListener("click", () => {
            const d = allData[Number(btn.dataset.idx)];
            const blob = new Blob([JSON.stringify(d.settings, null, 2)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            triggerDownload(url, d.filename);
            safeRevokeObjectUrl(url);
          });
        });

        // ZIPボタンイベント
        document.getElementById("export-dl-zip").addEventListener("click", async () => {
          const zipBtn = document.getElementById("export-dl-zip");
          zipBtn.disabled = true;
          zipBtn.textContent = "ZIP生成中...";

          try {
            await loadJSZip();
            const zip = new JSZip();
            allData.forEach((d) => {
              zip.file(d.filename, JSON.stringify(d.settings, null, 2));
            });
            const blob = await zip.generateAsync({ type: "blob" });
            const dateStr = new Date().toISOString().slice(0, 10);
            const zipFilename = `kintone_export_${allData.length}apps_${dateStr}.zip`;
            const url = URL.createObjectURL(blob);
            triggerDownload(url, zipFilename);
            safeRevokeObjectUrl(url);
          } catch (e) {
            alert("ZIP生成に失敗しました: " + e.message + "\n個別ダウンロードをお使いください。");
          }

          zipBtn.disabled = false;
          zipBtn.textContent = `⬇️ ZIPでまとめてダウンロード (${allData.length}ファイル)`;
        });
      }

      // UI戻し
      startBtn.disabled = false;
      startBtn.textContent = "再度エクスポート";
      abortBtn.style.display = "none";
      progressText.textContent = __abortFlag ? "中止しました" : "完了";
    });
  }

  // 実行
  main();
})();