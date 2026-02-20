// ============================================================
// kintone Field Manager v4 - DevTools Console版
// JSON（API properties形式）入出力 / 全プロパティ対応
// F12 → Console に貼り付けて実行
// ============================================================
(async () => {
  "use strict";

  const prev = document.getElementById("kfm-root");
  if (prev) prev.remove();

  // SDK
  const LIB = "https://js.cybozu.com/kintone-rest-api-client/3.1.3/KintoneRestAPIClient.min.js";
  if (!window.KintoneRestAPIClient) {
    await new Promise((r, j) => { const s = document.createElement("script"); s.src = LIB; s.async = true; s.onload = r; s.onerror = j; document.head.appendChild(s); });
  }
  let Ctor = window.KintoneRestAPIClient;
  if (Ctor && typeof Ctor !== "function" && Ctor.KintoneRestAPIClient) Ctor = Ctor.KintoneRestAPIClient;
  if (typeof Ctor !== "function") throw new Error("SDK not found");

  // ─── 定数 ───
  const TYPES = [
    { v: "SINGLE_LINE_TEXT",  l: "文字列（1行）",   ic: "Aa", hasOpt: false },
    { v: "MULTI_LINE_TEXT",   l: "文字列（複数行）", ic: "¶",  hasOpt: false },
    { v: "RICH_TEXT",         l: "リッチエディタ",   ic: "RT", hasOpt: false },
    { v: "NUMBER",            l: "数値",             ic: "#",  hasOpt: false },
    { v: "CALC",              l: "計算",             ic: "fx", hasOpt: false },
    { v: "CHECK_BOX",         l: "チェックボックス", ic: "☑", hasOpt: true },
    { v: "RADIO_BUTTON",      l: "ラジオボタン",     ic: "◉", hasOpt: true },
    { v: "MULTI_SELECT",      l: "複数選択",         ic: "☰", hasOpt: true },
    { v: "DROP_DOWN",         l: "ドロップダウン",   ic: "▾", hasOpt: true },
    { v: "DATE",              l: "日付",             ic: "📅", hasOpt: false },
    { v: "TIME",              l: "時刻",             ic: "⏰", hasOpt: false },
    { v: "DATETIME",          l: "日時",             ic: "🕐", hasOpt: false },
    { v: "LINK",              l: "リンク",           ic: "🔗", hasOpt: false },
    { v: "FILE",              l: "添付ファイル",     ic: "📎", hasOpt: false },
    { v: "USER_SELECT",       l: "ユーザー選択",     ic: "👤", hasOpt: false },
    { v: "ORGANIZATION_SELECT", l: "組織選択",       ic: "🏢", hasOpt: false },
    { v: "GROUP_SELECT",      l: "グループ選択",     ic: "👥", hasOpt: false },
  ];
  const TYPE_MAP = Object.fromEntries(TYPES.map(t => [t.v, t]));
  const HAS_OPT = new Set(TYPES.filter(t => t.hasOpt).map(t => t.v));
  const HAS_UNIQUE = new Set(["SINGLE_LINE_TEXT","NUMBER","LINK"]);
  const HAS_UNIT = new Set(["NUMBER","CALC"]);

  // ─── State ───
  let uid = 0;
  const autoAppId = typeof kintone !== "undefined" && kintone.app ? kintone.app.getId() : null;
  const ST = {
    fields: [],
    tab: "editor",
    log: [],
    appId: autoAppId ? String(autoAppId) : "",
    baseUrl: location.origin,
    guestSpaceId: "",
    expandedId: null,
  };

  function genCode(label) {
    let c = label.replace(/[^a-zA-Z0-9\u3000-\u9FFF\u30A0-\u30FF\u3040-\u309F]/g, "_");
    c = c.replace(/_+/g, "_").replace(/^_|_$/g, "");
    return c || "field_" + (uid + 1);
  }

  function makeField(p = {}) {
    const type = p.type || "SINGLE_LINE_TEXT";
    const label = p.label || "新規フィールド";
    let opts = [];
    if (p.options) {
      if (Array.isArray(p.options)) opts = p.options;
      else opts = Object.values(p.options).sort((a, b) => Number(a.index) - Number(b.index)).map(o => typeof o === "string" ? o : o.label);
    }
    let dv = p.defaultValue ?? "";
    if (Array.isArray(dv)) dv = dv.join(",");
    return {
      id: ++uid, label, code: p.code || genCode(label), type, codeEdited: !!p.code,
      required: !!p.required, unique: !!p.unique,
      options: opts, defaultValue: String(dv),
      unit: p.unit || "", unitPosition: p.unitPosition || "AFTER",
      expression: p.expression || "",
      protocol: p.protocol || "",
      minValue: p.minValue ?? "", maxValue: p.maxValue ?? "",
      parentId: p.parentId ?? null,
    };
  }

  function addLog(msg, type = "info") {
    ST.log.push({ msg, type, time: new Date().toLocaleTimeString("ja-JP") });
    if (ST.log.length > 120) ST.log.shift();
  }

  // ─── JSON import ───
  function importJSON(jsonText) {
    let obj;
    try { obj = JSON.parse(jsonText); } catch (e) { addLog("❌ JSONパースエラー: " + e.message, "error"); return 0; }
    let props = obj;
    if (obj.properties) props = obj.properties;

    if (Array.isArray(props)) {
      props.forEach(p => {
        if (p.type === "SUBTABLE") {
          const t = makeField({ ...p, type: "SUBTABLE" });
          ST.fields.push(t);
          const ch = p.fields || {};
          (Array.isArray(ch) ? ch : Object.values(ch)).forEach(cf => ST.fields.push(makeField({ ...cf, parentId: t.id })));
        } else ST.fields.push(makeField(p));
      });
      addLog(`✅ ${props.length}件インポート`, "success");
      return props.length;
    }

    let count = 0;
    for (const [code, def] of Object.entries(props)) {
      if (def.type === "SUBTABLE") {
        const t = makeField({ ...def, code: def.code || code, type: "SUBTABLE" });
        ST.fields.push(t);
        for (const [cc, cd] of Object.entries(def.fields || {})) {
          ST.fields.push(makeField({ ...cd, code: cd.code || cc, parentId: t.id }));
          count++;
        }
      } else {
        ST.fields.push(makeField({ ...def, code: def.code || code }));
      }
      count++;
    }
    addLog(`✅ ${count}件インポート`, "success");
    return count;
  }

  // ─── Build API properties ───
  function buildProperties() {
    const properties = {};
    const used = new Set();
    function uq(c) { let u = c, n = 2; while (used.has(u)) u = `${c}_${n++}`; used.add(u); return u; }

    function makeProp(f) {
      const code = uq(f.code);
      const p = { type: f.type, code, label: f.label };
      if (f.required) p.required = true;
      if (f.unique && HAS_UNIQUE.has(f.type)) p.unique = true;

      // Options
      if (HAS_OPT.has(f.type) && f.options.length > 0) {
        const opts = {};
        f.options.forEach((o, i) => { opts[o] = { label: o, index: String(i) }; });
        p.options = opts;
        if (f.defaultValue) {
          if (f.type === "CHECK_BOX" || f.type === "MULTI_SELECT") {
            p.defaultValue = f.defaultValue.split(/[,、]/).map(s => s.trim()).filter(Boolean);
          } else p.defaultValue = f.defaultValue;
        }
      }

      // Number / Calc
      if (HAS_UNIT.has(f.type)) {
        if (f.unit) { p.unit = f.unit; p.unitPosition = f.unitPosition || "AFTER"; }
        if (f.type === "NUMBER") {
          if (f.defaultValue && !HAS_OPT.has(f.type)) p.defaultValue = f.defaultValue;
          if (f.minValue !== "") p.minValue = String(f.minValue);
          if (f.maxValue !== "") p.maxValue = String(f.maxValue);
        }
      }
      if (f.type === "CALC" && f.expression) p.expression = f.expression;
      if (f.type === "LINK" && f.protocol) p.protocol = f.protocol;
      if (f.type === "SINGLE_LINE_TEXT" && f.defaultValue) p.defaultValue = f.defaultValue;
      return { code, prop: p };
    }

    ST.fields.filter(f => f.parentId === null).forEach(f => {
      if (f.type === "SUBTABLE") {
        const tCode = uq(f.code);
        const childFields = {};
        ST.fields.filter(c => c.parentId === f.id).forEach(c => {
          const { code, prop } = makeProp(c);
          childFields[code] = prop;
        });
        properties[tCode] = { type: "SUBTABLE", code: tCode, fields: childFields };
      } else {
        const { code, prop } = makeProp(f);
        properties[code] = prop;
      }
    });
    return properties;
  }

  // ─── DOM ───
  const root = document.createElement("div");
  root.id = "kfm-root";
  document.body.appendChild(root);
  if (!document.getElementById("kfm-fonts")) {
    const lk = document.createElement("link"); lk.id = "kfm-fonts"; lk.rel = "stylesheet";
    lk.href = "https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600&display=swap";
    document.head.appendChild(lk);
  }

  function el(tag, a = {}, ...ch) {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(a)) {
      if (k === "style" && typeof v === "object") Object.assign(e.style, v);
      else if (k.startsWith("on") && typeof v === "function") e.addEventListener(k.slice(2).toLowerCase(), v);
      else if (k === "className") e.className = v;
      else e.setAttribute(k, v);
    }
    for (const c of ch) { if (typeof c === "string") e.append(c); else if (c) e.appendChild(c); }
    return e;
  }
  function render() { root.innerHTML = ""; root.appendChild(buildPanel()); }

  // ─── Styles ───
  const C = {
    btn: (x = {}) => ({ padding: "6px 14px", borderRadius: "7px", border: "none", background: "linear-gradient(135deg,#6366f1,#7c3aed)", color: "#fff", fontSize: "11px", fontWeight: "600", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "4px", ...x }),
    ghost: (x = {}) => ({ padding: "5px 10px", borderRadius: "6px", border: "1px solid #e2e8f0", background: "#fff", color: "#475569", fontSize: "11px", fontWeight: "600", cursor: "pointer", ...x }),
    mini: (x = {}) => ({ width: "22px", height: "22px", borderRadius: "5px", border: "1px solid #e2e8f0", background: "#fff", color: "#64748b", fontSize: "11px", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "0", flexShrink: "0", ...x }),
    inp: (x = {}) => ({ padding: "5px 8px", borderRadius: "5px", border: "1px solid #e2e8f0", fontSize: "12px", color: "#1e293b", outline: "none", background: "#f8fafc", boxSizing: "border-box", ...x }),
    lbl: () => ({ fontSize: "10px", fontWeight: "700", color: "#64748b", letterSpacing: "0.03em" }),
    mono: { fontFamily: "'JetBrains Mono',monospace" },
  };

  // ─── Panel ───
  let pX = 30, pY = 30, dragging = false, dOX, dOY, minimized = false;

  function buildPanel() {
    const w = el("div", { style: {
      position: "fixed", left: pX + "px", top: pY + "px",
      width: minimized ? "260px" : "790px", maxHeight: minimized ? "auto" : "92vh",
      zIndex: "2147483647", fontFamily: "'Noto Sans JP',sans-serif", fontSize: "12px", color: "#1e293b",
      background: "#fff", borderRadius: "14px",
      boxShadow: "0 25px 80px rgba(0,0,0,.25), 0 0 0 1px rgba(0,0,0,.08)",
      display: "flex", flexDirection: "column", overflow: "hidden",
    }});

    // Title
    w.appendChild(el("div", {
      style: { display: "flex", alignItems: "center", gap: "8px", padding: "9px 12px", background: "linear-gradient(135deg,#312e81,#4338ca)", cursor: "move", userSelect: "none" },
      onMousedown: (e) => { dragging = true; dOX = e.clientX - pX; dOY = e.clientY - pY; e.preventDefault(); },
    },
      el("span", { style: { fontSize: "15px" } }, "⚙"),
      el("span", { style: { flex: "1", color: "#fff", fontWeight: "700", fontSize: "12px" } }, "kintone Field Manager v4"),
      el("button", { style: { ...C.mini(), border: "none", background: "rgba(255,255,255,.15)", color: "#fff" }, onClick: () => { minimized = !minimized; render(); } }, minimized ? "□" : "─"),
      el("button", { style: { ...C.mini(), border: "none", background: "rgba(255,255,255,.15)", color: "#f87171" }, onClick: () => root.remove() }, "✕"),
    ));
    if (minimized) return w;

    // Config
    const cfg = el("div", { style: { display: "flex", gap: "6px", padding: "8px 12px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0", alignItems: "end", flexWrap: "wrap" } });
    const mkG = (lbl, val, ph, flex, onI, extra = {}) => {
      const g = el("div", { style: { display: "flex", flexDirection: "column", flex, minWidth: extra.minW || "0" } });
      g.appendChild(el("span", { style: C.lbl() }, lbl));
      g.appendChild(el("input", { style: C.inp({ width: "100%", ...C.mono, ...extra }), value: val, placeholder: ph, onInput: onI }));
      return g;
    };
    cfg.appendChild(mkG("アプリID *", ST.appId, "123", "0 0 80px", (e) => { ST.appId = e.target.value.trim(); }, { fontWeight: "700", fontSize: "14px", minW: "70px" }));
    cfg.appendChild(mkG("ベースURL", ST.baseUrl, "https://xxx.cybozu.com", "2", (e) => { ST.baseUrl = e.target.value.trim(); }, { fontSize: "10px", minW: "120px" }));
    cfg.appendChild(mkG("ゲストスペース", ST.guestSpaceId, "空欄可", "0 0 70px", (e) => { ST.guestSpaceId = e.target.value.trim(); }));
    cfg.appendChild(el("button", { style: C.ghost({ whiteSpace: "nowrap", marginBottom: "1px" }), onClick: () => {
      const d = typeof kintone !== "undefined" && kintone.app ? kintone.app.getId() : null;
      if (d) { ST.appId = String(d); addLog(`App ${d} 検出`); } else addLog("検出失敗", "error");
      const gm = location.pathname.match(/\/k\/guest\/(\d+)\//); if (gm) ST.guestSpaceId = gm[1];
      ST.baseUrl = location.origin; render();
    }}, "🔍"));
    w.appendChild(cfg);

    // Tabs
    const tabs = el("div", { style: { display: "flex", gap: "2px", padding: "5px 10px 0", borderBottom: "1px solid #e2e8f0" } });
    [
      { key: "editor", label: "📝 フィールド" },
      { key: "json", label: "📋 JSON入力" },
      { key: "output", label: "💻 JSON出力" },
      { key: "log", label: "📜 ログ" },
    ].forEach(({ key, label }) => {
      const a = ST.tab === key;
      tabs.appendChild(el("button", {
        style: { padding: "6px 12px", border: "none", borderRadius: "7px 7px 0 0", fontSize: "11px", fontWeight: "600", cursor: "pointer", background: a ? "#fff" : "transparent", color: a ? "#4338ca" : "#94a3b8", borderBottom: a ? "2px solid #4338ca" : "2px solid transparent" },
        onClick: () => { ST.tab = key; render(); },
      }, label));
    });
    w.appendChild(tabs);

    // Content
    const content = el("div", { style: { flex: "1", overflow: "auto", padding: "12px", maxHeight: "calc(92vh - 140px)" } });
    content.appendChild(({ editor: buildEditor, json: buildJSONInput, output: buildOutput, log: buildLog }[ST.tab] || buildEditor)());
    w.appendChild(content);
    return w;
  }

  // ═══════════════════════════════════════
  // Editor Tab
  // ═══════════════════════════════════════
  function buildEditor() {
    const f = el("div");
    const tb = el("div", { style: { display: "flex", flexWrap: "wrap", gap: "5px", marginBottom: "10px", alignItems: "center" } });
    tb.appendChild(el("button", { style: C.btn(), onClick: () => { ST.fields.push(makeField()); render(); } }, "＋ フィールド"));
    tb.appendChild(el("button", { style: C.btn({ background: "linear-gradient(135deg,#0891b2,#06b6d4)" }), onClick: () => { ST.fields.push(makeField({ type: "SUBTABLE", label: "テーブル" })); render(); } }, "＋ テーブル"));
    tb.appendChild(el("div", { style: { flex: "1" } }));
    const total = ST.fields.length;
    const tables = ST.fields.filter(f => f.type === "SUBTABLE").length;
    tb.appendChild(el("span", { style: { fontSize: "11px", color: "#6366f1", fontWeight: "600", background: "#eef2ff", padding: "2px 10px", borderRadius: "20px" } }, `${total}件${tables ? ` (テーブル${tables})` : ""}`));
    if (total) tb.appendChild(el("button", { style: C.ghost({ color: "#ef4444", borderColor: "#fecaca" }), onClick: () => { ST.fields = []; render(); } }, "🗑 全削除"));
    f.appendChild(tb);

    if (!total) {
      f.appendChild(el("div", { style: { textAlign: "center", padding: "28px", color: "#94a3b8" } },
        el("div", { style: { fontSize: "32px", marginBottom: "6px" } }, "📋"),
        el("div", { style: { fontSize: "13px", fontWeight: "600" } }, "JSON入力タブからインポート"),
      ));
      return f;
    }

    ST.fields.filter(x => x.parentId === null).forEach((field, i) => {
      if (field.type === "SUBTABLE") f.appendChild(buildSubtable(field));
      else f.appendChild(buildRow(field, i, null));
    });

    // Deploy
    f.appendChild(el("div", { style: { borderTop: "1px solid #e2e8f0", paddingTop: "12px", marginTop: "12px" } },
      el("button", {
        style: { ...C.btn(), width: "100%", padding: "11px", fontSize: "13px", justifyContent: "center",
          background: ST.appId ? "linear-gradient(135deg,#059669,#10b981)" : "#94a3b8",
          cursor: ST.appId ? "pointer" : "not-allowed" },
        onClick: ST.appId ? deploy : () => alert("アプリIDを入力してください"),
      }, ST.appId ? `🚀 App #${ST.appId} に反映する（${total}件）` : "🚀 アプリIDを入力"),
    ));
    return f;
  }

  // ── Field Row ──
  function buildRow(field, i, parentId) {
    const isExp = ST.expandedId === field.id;
    const tm = TYPE_MAP[field.type] || {};
    const wrap = el("div", { style: { marginBottom: "2px" } });

    const row = el("div", { style: {
      display: "flex", alignItems: "center", gap: "4px", padding: "4px 6px",
      background: isExp ? "#f0f4ff" : "#fff", border: `1px solid ${isExp ? "#a5b4fc" : "#e2e8f0"}`,
      borderRadius: isExp ? "7px 7px 0 0" : "7px",
    }});

    row.appendChild(el("span", { style: { color: "#94a3b8", fontSize: "9px", fontWeight: "600", width: "16px", textAlign: "center", flexShrink: "0" } }, String(i + 1)));
    row.appendChild(el("span", { style: { display: "inline-flex", alignItems: "center", justifyContent: "center", width: "22px", height: "22px", borderRadius: "5px", background: "rgba(99,102,241,.1)", color: "#6366f1", fontSize: "9px", fontWeight: "700", flexShrink: "0" } }, tm.ic || "?"));

    // Badges: required, unique
    if (field.required) row.appendChild(el("span", { style: { fontSize: "7px", color: "#fff", fontWeight: "800", background: "#ef4444", padding: "1px 4px", borderRadius: "3px", flexShrink: "0" } }, "必須"));
    if (field.unique) row.appendChild(el("span", { style: { fontSize: "7px", color: "#fff", fontWeight: "800", background: "#f59e0b", padding: "1px 4px", borderRadius: "3px", flexShrink: "0" } }, "UK"));

    // Label
    row.appendChild(el("input", {
      style: C.inp({ flex: "1.5", minWidth: "0", fontWeight: "600", fontSize: "11px" }),
      value: field.label, placeholder: "ラベル",
      onInput: (e) => { field.label = e.target.value; if (!field.codeEdited) field.code = genCode(e.target.value); },
    }));

    // Code
    row.appendChild(el("input", {
      style: C.inp({ flex: "1", minWidth: "0", ...C.mono, fontSize: "9px", color: field.codeEdited ? "#4338ca" : "#94a3b8" }),
      value: field.code, placeholder: "コード",
      onInput: (e) => { field.code = e.target.value.trim(); field.codeEdited = true; },
    }));

    // Type select
    const typeList = parentId !== null ? TYPES.filter(t => !["RICH_TEXT","CALC","SUBTABLE","FILE"].includes(t.v)) : TYPES;
    const sel = el("select", {
      style: { padding: "2px 3px", borderRadius: "4px", border: "1px solid #e2e8f0", fontSize: "10px", cursor: "pointer", flexShrink: "0", maxWidth: "80px" },
      onChange: (e) => { field.type = e.target.value; render(); },
    });
    typeList.forEach(t => { const o = el("option", { value: t.v }, `${t.ic} ${t.l}`); if (t.v === field.type) o.selected = true; sel.appendChild(o); });
    row.appendChild(sel);

    // Opt count
    if (HAS_OPT.has(field.type) && field.options.length) row.appendChild(el("span", { style: { fontSize: "8px", background: "#dbeafe", color: "#1d4ed8", padding: "1px 5px", borderRadius: "8px", fontWeight: "600", flexShrink: "0" } }, `${field.options.length}択`));
    if (HAS_UNIT.has(field.type) && field.unit) row.appendChild(el("span", { style: { fontSize: "8px", background: "#fef3c7", color: "#92400e", padding: "1px 5px", borderRadius: "8px", fontWeight: "600", flexShrink: "0" } }, field.unit));

    // Buttons
    row.appendChild(el("button", { style: C.mini({ color: isExp ? "#4338ca" : "#94a3b8", background: isExp ? "#e0e7ff" : "#fff" }), onClick: () => { ST.expandedId = isExp ? null : field.id; render(); }, title: "詳細" }, "⚙"));
    row.appendChild(el("button", { style: C.mini(), onClick: () => { moveInList(field.id, -1, parentId); render(); } }, "↑"));
    row.appendChild(el("button", { style: C.mini(), onClick: () => { moveInList(field.id, 1, parentId); render(); } }, "↓"));
    if (parentId) row.appendChild(el("button", { style: C.mini({ color: "#f59e0b", fontSize: "9px" }), onClick: () => { field.parentId = null; render(); } }, "⬆"));
    row.appendChild(el("button", { style: C.mini({ color: "#ef4444" }), onClick: () => { ST.fields = ST.fields.filter(x => x.id !== field.id); render(); } }, "✕"));

    wrap.appendChild(row);
    if (isExp) wrap.appendChild(buildDetail(field));
    return wrap;
  }

  // ── Detail Panel ──
  function buildDetail(f) {
    const d = el("div", { style: { padding: "10px", background: "#f8fafc", border: "1px solid #a5b4fc", borderTop: "none", borderRadius: "0 0 7px 7px", display: "flex", flexDirection: "column", gap: "8px" } });

    // Toggles
    const r1 = el("div", { style: { display: "flex", gap: "14px", alignItems: "center", flexWrap: "wrap" } });
    r1.appendChild(mkToggle("必須", f.required, (v) => { f.required = v; }));
    if (HAS_UNIQUE.has(f.type)) r1.appendChild(mkToggle("重複禁止", f.unique, (v) => { f.unique = v; }));
    d.appendChild(r1);

    // Number / Calc
    if (HAS_UNIT.has(f.type)) {
      const nr = el("div", { style: { display: "flex", gap: "6px", alignItems: "end", flexWrap: "wrap" } });
      nr.appendChild(mkSmall("単位", f.unit, (v) => { f.unit = v; }, "60px", "円/年"));
      const posEl = el("div", { style: { display: "flex", flexDirection: "column" } });
      posEl.appendChild(el("span", { style: C.lbl() }, "位置"));
      const posSel = el("select", { style: { padding: "4px", borderRadius: "4px", border: "1px solid #e2e8f0", fontSize: "10px" }, onChange: (e) => { f.unitPosition = e.target.value; } });
      ["BEFORE","AFTER"].forEach(v => { const o = el("option", { value: v }, v === "BEFORE" ? "前" : "後"); if (f.unitPosition === v) o.selected = true; posSel.appendChild(o); });
      posEl.appendChild(posSel);
      nr.appendChild(posEl);
      if (f.type === "NUMBER") {
        nr.appendChild(mkSmall("最小値", f.minValue, (v) => { f.minValue = v; }, "60px"));
        nr.appendChild(mkSmall("最大値", f.maxValue, (v) => { f.maxValue = v; }, "60px"));
        nr.appendChild(mkSmall("初期値", f.defaultValue, (v) => { f.defaultValue = v; }, "60px"));
      }
      d.appendChild(nr);
    }

    // CALC expression
    if (f.type === "CALC") {
      d.appendChild(mkSmall("計算式", f.expression, (v) => { f.expression = v; }, "100%", "例: フィールドA + フィールドB"));
    }

    // LINK protocol
    if (f.type === "LINK") {
      const lr = el("div", { style: { display: "flex", gap: "6px", alignItems: "center" } });
      lr.appendChild(el("span", { style: C.lbl() }, "プロトコル"));
      const ls = el("select", { style: { padding: "3px 6px", borderRadius: "4px", border: "1px solid #e2e8f0", fontSize: "10px" }, onChange: (e) => { f.protocol = e.target.value; } });
      ["WEB","MAIL","CALL"].forEach(p => { const o = el("option", { value: p }, p); if (f.protocol === p) o.selected = true; ls.appendChild(o); });
      lr.appendChild(ls);
      d.appendChild(lr);
    }

    // Options
    if (HAS_OPT.has(f.type)) {
      d.appendChild(buildOptionsEditor(f));
      d.appendChild(mkSmall("初期値", f.defaultValue, (v) => { f.defaultValue = v; }, "200px", "選択肢の値を入力"));
    }

    // Single line text default
    if (f.type === "SINGLE_LINE_TEXT") {
      d.appendChild(mkSmall("初期値", f.defaultValue, (v) => { f.defaultValue = v; }, "200px"));
    }

    return d;
  }

  function mkToggle(label, value, onChange) {
    const w = el("label", { style: { display: "inline-flex", alignItems: "center", gap: "5px", cursor: "pointer", fontSize: "11px", fontWeight: "600", color: "#475569" } });
    const cb = el("input", { type: "checkbox", style: { cursor: "pointer" }, onChange: (e) => { onChange(e.target.checked); render(); } });
    cb.checked = value; w.appendChild(cb); w.append(label);
    return w;
  }

  function mkSmall(label, value, onChange, width, ph) {
    const g = el("div", { style: { display: "flex", flexDirection: "column" } });
    g.appendChild(el("span", { style: C.lbl() }, label));
    g.appendChild(el("input", { style: C.inp({ width, ...C.mono, fontSize: "11px" }), value: value || "", placeholder: ph || "", onInput: (e) => onChange(e.target.value) }));
    return g;
  }

  function buildOptionsEditor(f) {
    const w = el("div", { style: { display: "flex", flexDirection: "column", gap: "3px" } });
    w.appendChild(el("span", { style: { ...C.lbl(), marginBottom: "1px" } }, `選択肢（${f.options.length}件）`));
    const ta = el("textarea", {
      style: { width: "100%", minHeight: "50px", padding: "6px 8px", border: "1px solid #e2e8f0", borderRadius: "6px", ...C.mono, fontSize: "11px", lineHeight: "1.5", resize: "vertical", outline: "none", background: "#fff", boxSizing: "border-box" },
      value: f.options.join("\n"), placeholder: "1行に1つ or 「/」区切り",
      onBlur: (e) => { const t = e.target.value.trim(); f.options = t.includes("\n") ? t.split("\n").map(s => s.trim()).filter(Boolean) : t.split(/[\/／,、]/).map(s => s.trim()).filter(Boolean); },
    });
    w.appendChild(ta);
    w.appendChild(el("div", { style: { fontSize: "9px", color: "#94a3b8" } }, "改行 or 「/」「,」区切り"));
    return w;
  }

  // ── Subtable ──
  function buildSubtable(t) {
    const block = el("div", { style: { marginBottom: "6px", borderRadius: "10px", border: "2px solid #06b6d4", background: "#f0fdfa", overflow: "hidden" } });
    const hdr = el("div", { style: { display: "flex", alignItems: "center", gap: "5px", padding: "7px 8px", background: "linear-gradient(135deg,#ecfeff,#cffafe)", borderBottom: "1px solid #a5f3fc" } });
    hdr.appendChild(el("span", { style: { display: "inline-flex", alignItems: "center", justifyContent: "center", width: "24px", height: "24px", borderRadius: "6px", background: "#06b6d4", color: "#fff", fontSize: "11px", fontWeight: "700", flexShrink: "0" } }, "⊞"));
    hdr.appendChild(el("input", { style: C.inp({ flex: "1", fontWeight: "700", fontSize: "12px", background: "transparent", border: "1px solid transparent" }), value: t.label, onInput: (e) => { t.label = e.target.value; if (!t.codeEdited) t.code = genCode(e.target.value); } }));
    hdr.appendChild(el("input", { style: C.inp({ width: "110px", ...C.mono, fontSize: "10px", color: t.codeEdited ? "#0e7490" : "#94a3b8", background: "transparent", border: "1px solid transparent" }), value: t.code, onInput: (e) => { t.code = e.target.value.trim(); t.codeEdited = true; } }));
    hdr.appendChild(el("button", { style: C.mini(), onClick: () => { moveInList(t.id, -1, null); render(); } }, "↑"));
    hdr.appendChild(el("button", { style: C.mini(), onClick: () => { moveInList(t.id, 1, null); render(); } }, "↓"));
    hdr.appendChild(el("button", { style: C.mini({ color: "#ef4444" }), onClick: () => { ST.fields = ST.fields.filter(x => x.id !== t.id && x.parentId !== t.id); render(); } }, "✕"));
    block.appendChild(hdr);

    const body = el("div", { style: { padding: "6px 8px 8px" } });
    const ch = ST.fields.filter(c => c.parentId === t.id);
    if (!ch.length) body.appendChild(el("div", { style: { textAlign: "center", padding: "8px", color: "#94a3b8", fontSize: "11px" } }, "カラムを追加"));
    else ch.forEach((c, i) => body.appendChild(buildRow(c, i, t.id)));
    body.appendChild(el("button", { style: C.ghost({ width: "100%", display: "flex", justifyContent: "center", marginTop: "3px", color: "#0891b2", borderColor: "#a5f3fc", borderStyle: "dashed" }), onClick: () => { ST.fields.push(makeField({ parentId: t.id, label: "カラム" })); render(); } }, "＋ カラム追加"));
    block.appendChild(body);
    return block;
  }

  function moveInList(id, dir, parentId) {
    const list = ST.fields.filter(f => f.parentId === parentId);
    const idx = list.findIndex(f => f.id === id); const j = idx + dir;
    if (j < 0 || j >= list.length) return;
    const ai = ST.fields.findIndex(f => f.id === list[idx].id);
    const bi = ST.fields.findIndex(f => f.id === list[j].id);
    [ST.fields[ai], ST.fields[bi]] = [ST.fields[bi], ST.fields[ai]];
  }

  // ═══════════════════════════════════════
  // JSON Input Tab
  // ═══════════════════════════════════════
  function buildJSONInput() {
    const f = el("div");
    f.appendChild(el("div", { style: { fontSize: "13px", fontWeight: "700", marginBottom: "6px" } }, "📋 JSON入力（kintone API properties 形式）"));

    const ta = el("textarea", {
      id: "kfm-json-input",
      style: {
        width: "100%", height: "320px", padding: "10px",
        border: "1px solid #e2e8f0", borderRadius: "8px",
        ...C.mono, fontSize: "11px", lineHeight: "1.4",
        resize: "vertical", outline: "none", background: "#0f172a", color: "#a5b4fc", boxSizing: "border-box",
      },
      placeholder: `{
  "フィールドコード": {
    "type": "DROP_DOWN",
    "code": "フィールドコード",
    "label": "ラベル",
    "required": true,
    "options": {
      "選択肢A": { "label": "選択肢A", "index": "0" },
      "選択肢B": { "label": "選択肢B", "index": "1" }
    }
  }
}`,
    });
    f.appendChild(ta);

    const row = el("div", { style: { display: "flex", gap: "8px", marginTop: "10px", alignItems: "center", flexWrap: "wrap" } });
    row.appendChild(el("button", { style: C.btn(), onClick: () => {
      const text = ta.value.trim(); if (!text) return;
      const count = importJSON(text);
      if (count > 0) { ST.tab = "editor"; render(); } else render();
    }}, "📥 追加インポート"));
    row.appendChild(el("button", { style: C.btn({ background: "linear-gradient(135deg,#dc2626,#ef4444)" }), onClick: () => {
      const text = ta.value.trim(); if (!text) return;
      ST.fields = [];
      const count = importJSON(text);
      if (count > 0) { ST.tab = "editor"; render(); } else render();
    }}, "🔄 全置換インポート"));
    row.appendChild(el("button", { style: C.ghost(), onClick: () => {
      try { JSON.parse(ta.value.trim()); addLog("✅ JSON OK", "success"); } catch (e) { addLog("❌ " + e.message, "error"); } render();
    }}, "✓ 検証"));
    f.appendChild(row);

    // File upload
    f.appendChild(el("hr", { style: { border: "none", borderTop: "1px solid #e2e8f0", margin: "14px 0" } }));
    const fileRow = el("div", { style: { display: "flex", gap: "8px", alignItems: "center" } });
    fileRow.appendChild(el("span", { style: { fontSize: "12px", fontWeight: "600" } }, "📄 JSONファイルから読込:"));
    const fileLabel = el("label", { style: C.ghost({ cursor: "pointer" }) }, "ファイル選択");
    fileLabel.appendChild(el("input", { type: "file", accept: ".json", style: { display: "none" }, onChange: (e) => {
      const file = e.target.files?.[0]; if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => { ta.value = ev.target.result; addLog(`ファイル読込: ${file.name}`); render(); };
      reader.readAsText(file, "UTF-8");
    }}));
    fileRow.appendChild(fileLabel);
    f.appendChild(fileRow);

    // Guide
    f.appendChild(el("hr", { style: { border: "none", borderTop: "1px solid #e2e8f0", margin: "14px 0" } }));
    const g = el("div", { style: { padding: "10px", background: "#fffbeb", borderRadius: "8px", border: "1px solid #fde68a", fontSize: "10px", color: "#92400e", lineHeight: "1.8" } });
    g.appendChild(el("div", { style: { fontWeight: "700", marginBottom: "2px" } }, "💡 対応プロパティ"));
    [
      "type, code, label — 基本情報",
      "required, unique — 必須・重複禁止",
      "options — 選択肢（CHECK_BOX / RADIO_BUTTON / DROP_DOWN / MULTI_SELECT）",
      "defaultValue — 初期値",
      "unit, unitPosition — 単位と位置（NUMBER / CALC）",
      "expression — 計算式（CALC）",
      "protocol — WEB / MAIL / CALL（LINK）",
      "minValue, maxValue — 最小値・最大値（NUMBER）",
      "SUBTABLE — fields プロパティで子フィールドをネスト",
      "FILE — 添付ファイルフィールド",
    ].forEach(t => { g.appendChild(document.createTextNode("• " + t)); g.appendChild(el("br")); });
    f.appendChild(g);

    return f;
  }

  // ═══════════════════════════════════════
  // JSON Output Tab
  // ═══════════════════════════════════════
  function buildOutput() {
    const f = el("div");
    if (!ST.fields.length) { f.appendChild(el("div", { style: { textAlign: "center", padding: "30px", color: "#94a3b8" } }, "フィールドなし")); return f; }

    const properties = buildProperties();
    const json = JSON.stringify(properties, null, 2);

    const hdr = el("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" } });
    hdr.appendChild(el("span", { style: { fontWeight: "700", fontSize: "12px" } }, `💻 properties JSON（${Object.keys(properties).length}件）`));
    const copyBtn = el("button", { style: C.btn(), onClick: () => {
      navigator.clipboard.writeText(json).then(() => { copyBtn.textContent = "✅ 済"; setTimeout(() => { copyBtn.textContent = "📋 JSON"; }, 1500); });
    }}, "📋 JSON");
    hdr.appendChild(copyBtn);
    f.appendChild(hdr);

    f.appendChild(el("pre", { style: {
      background: "#0f172a", color: "#a5b4fc", padding: "12px", borderRadius: "8px",
      fontSize: "10px", lineHeight: "1.4", ...C.mono,
      overflow: "auto", maxHeight: "360px", border: "1px solid #1e293b",
      whiteSpace: "pre-wrap", wordBreak: "break-all",
    }}, json));

    const fullCode = `(async () => {
  const LIB = "https://js.cybozu.com/kintone-rest-api-client/3.1.3/KintoneRestAPIClient.min.js";
  if (!window.KintoneRestAPIClient) await new Promise((r,j)=>{const s=document.createElement("script");s.src=LIB;s.onload=r;s.onerror=j;document.head.appendChild(s);});
  let C = window.KintoneRestAPIClient;
  if (C && typeof C !== "function" && C.KintoneRestAPIClient) C = C.KintoneRestAPIClient;
  const client = new C({baseUrl:"${ST.baseUrl}"${ST.guestSpaceId ? `,guestSpaceId:${ST.guestSpaceId}` : ""}});
  try {
    await client.app.addFormFields({app:${ST.appId || "/* appId */"},properties:${json}});
    console.log("✅ Done!"); alert("完了！");
  } catch(e){console.error("❌",e);if(e.error?.errors)console.error(JSON.stringify(e.error.errors,null,2));alert("エラー");}
})();`;

    f.appendChild(el("div", { style: { marginTop: "10px", display: "flex", gap: "6px", flexWrap: "wrap" } },
      el("button", { style: C.ghost(), onClick: () => { navigator.clipboard.writeText(fullCode).then(() => addLog("実行スクリプトコピー")); render(); } }, "📋 実行スクリプト"),
      el("button", { style: C.ghost(), onClick: () => {
        const body = JSON.stringify({ app: Number(ST.appId) || 0, properties }, null, 2);
        navigator.clipboard.writeText(body).then(() => addLog("リクエストボディコピー")); render();
      }}, "📋 リクエストボディ"),
      el("button", { style: C.ghost(), onClick: () => {
        const blob = new Blob(["\uFEFF" + json], { type: "application/json;charset=utf-8" });
        const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
        a.download = `kintone_properties_app${ST.appId || "export"}.json`; a.click();
        addLog("JSONダウンロード");
      }}, "💾 JSONダウンロード"),
    ));

    // Summary
    const types = {};
    ST.fields.forEach(f => { types[f.type] = (types[f.type] || 0) + 1; });
    const reqCount = ST.fields.filter(f => f.required).length;
    const optCount = ST.fields.filter(f => f.options.length > 0).length;
    const summary = el("div", { style: { marginTop: "12px", padding: "10px", background: "#f0fdf4", borderRadius: "8px", border: "1px solid #bbf7d0", fontSize: "10px", color: "#166534", lineHeight: "1.7" } });
    summary.appendChild(el("div", { style: { fontWeight: "700", marginBottom: "3px" } }, "📊 サマリー"));
    summary.appendChild(document.createTextNode(`全${ST.fields.length}件 | 必須:${reqCount} | 選択肢付:${optCount}`));
    summary.appendChild(el("br"));
    summary.appendChild(document.createTextNode(Object.entries(types).map(([t, c]) => `${t}:${c}`).join(" / ")));
    f.appendChild(summary);

    return f;
  }

  // ═══════════════════════════════════════
  // Log
  // ═══════════════════════════════════════
  function buildLog() {
    const f = el("div");
    if (!ST.log.length) { f.appendChild(el("div", { style: { textAlign: "center", padding: "30px", color: "#94a3b8" } }, "ログなし")); return f; }
    const colors = { info: "#3b82f6", success: "#10b981", error: "#ef4444" };
    [...ST.log].reverse().forEach(entry => {
      f.appendChild(el("div", { style: { display: "flex", gap: "6px", padding: "3px 0", borderBottom: "1px solid #f1f5f9", fontSize: "11px" } },
        el("span", { style: { color: "#94a3b8", ...C.mono, fontSize: "9px", flexShrink: "0" } }, entry.time),
        el("span", { style: { width: "6px", height: "6px", borderRadius: "50%", background: colors[entry.type] || colors.info, marginTop: "4px", flexShrink: "0" } }),
        el("span", { style: { color: "#475569", wordBreak: "break-all" } }, entry.msg),
      ));
    });
    f.appendChild(el("button", { style: C.ghost({ marginTop: "8px" }), onClick: () => { ST.log = []; render(); } }, "🗑 クリア"));
    return f;
  }

  // ═══════════════════════════════════════
  // Deploy
  // ═══════════════════════════════════════
  async function deploy() {
    const app = Number(ST.appId);
    if (!app || !ST.fields.length) return;
    const properties = buildProperties();
    const count = Object.keys(properties).length;
    if (!confirm(`${count}件を App #${app} に追加\n${ST.baseUrl}\n実行しますか？`)) return;

    const gsId = ST.guestSpaceId ? Number(ST.guestSpaceId) : null;
    const c = new Ctor({ baseUrl: ST.baseUrl || location.origin, ...(gsId ? { guestSpaceId: gsId } : {}) });
    addLog(`API送信中... App #${app}（${count}件）`); render();

    try {
      await c.app.addFormFields({ app, properties });
      addLog(`✅ 成功！ ${count}件`, "success");
      alert(`✅ ${count}件追加！リロードしてください。`);
    } catch (error) {
      addLog(`❌ ${error.message || error}`, "error");
      console.error("[KFM]", error);
      if (error.error?.errors) { console.error(JSON.stringify(error.error.errors, null, 2)); addLog(JSON.stringify(error.error.errors), "error"); }
      alert("エラー。ログ確認。");
    }
    render();
  }

  // Drag
  document.addEventListener("mousemove", (e) => {
    if (!dragging) return; pX = e.clientX - dOX; pY = e.clientY - dOY;
    const p = root.firstChild; if (p) { p.style.left = pX + "px"; p.style.top = pY + "px"; }
  });
  document.addEventListener("mouseup", () => { dragging = false; });

  render();
  addLog("Field Manager v4 起動");
  console.log("[KFM] ✅ v4");
})();